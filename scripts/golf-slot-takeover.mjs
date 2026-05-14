#!/usr/bin/env node
/**
 * golf-slot-takeover.mjs — CLEANUP-MS0 / U-CLEANUP-SLOT-TAKEOVER
 *
 * Force-releases the `golf` hygiene slot in `state/shared/chat-slots.json`
 * when its prior claimant's PID is provably dead on this host. A new golf
 * chat invokes this BEFORE attempting to claim the slot so the standard
 * claim path does not refuse with "slot taken" against a corpse.
 *
 * Safety properties:
 *   - Only the `golf` slot is ever touched. Work slots (alpha..foxtrot)
 *     are governed by their own 10-min heartbeat-TTL reclaim path.
 *   - Cross-host claims are NEVER released. If chat-slots.json shows the
 *     golf slot held by a chat on a DIFFERENT host, that's a different
 *     machine running its own golf — out of this script's scope.
 *   - PID liveness check uses `process.kill(pid, 0)` which is read-only
 *     (signal 0 = "is this pid receivable") and never delivers a real
 *     signal. EPERM is treated as "alive" (PID exists, we just lack
 *     permission); ESRCH is "dead".
 *   - Same-PID reclaim (this process IS the prior claimant) is a no-op —
 *     no spurious release, just a clean exit.
 *
 * Failure modes covered:
 *   - state file missing → no-op, success
 *   - state file malformed → no-op, success (chat-slots.mjs writer will
 *     repair on next claim)
 *   - golf slot already empty → no-op
 *   - PID lookup throws → conservative: assume alive (don't release)
 *
 * CLI:
 *   node scripts/golf-slot-takeover.mjs
 *     [--state <path>]   default: H:/prism/state/shared/chat-slots.json
 *     [--dry-run]        compute decision but do not write
 *     [--json]           emit JSON instead of text summary
 *
 * Exit codes:
 *   0 — success (regardless of whether a release happened)
 *   1 — write failed (state file unwritable)
 *   2 — bad args
 *
 * @see U-CLEANUP-SLOT-TAKEOVER (envelope was not_started)
 * @see .claude/helpers/chat-slots.mjs (the 7-slot fleet manager)
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";

const DEFAULT_STATE = "H:/prism/state/shared/chat-slots.json";
const GOLF_SLOT = "golf";
const SCHEMA_VERSION = 1;

export function parseArgs(argv) {
  const out = { state: DEFAULT_STATE, dryRun: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--state" && argv[i + 1]) out.state = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

/**
 * Returns true iff the given PID is provably dead on this host (ESRCH from
 * `process.kill(pid, 0)`). Returns false for live PIDs and for any other
 * error (EPERM, EINVAL) — better to leave a possibly-alive claim alone
 * than to wrongly evict a real chat.
 *
 * @param {number} pid
 * @param {{killFn?: function}} [opts]   killFn defaults to process.kill
 * @returns {boolean}
 */
export function isPidDead(pid, opts = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return true; // bad input → treat as dead
  const killFn = opts.killFn || ((p, sig) => process.kill(p, sig));
  try {
    killFn(pid, 0);
    return false; // signalable → alive
  } catch (e) {
    return e && (e.code === "ESRCH"); // dead PID
  }
}

/**
 * Evaluate whether the golf slot SHOULD be force-released. Returns a
 * decision object the caller can act on (or just log, in dry-run mode).
 *
 * @param {object} stateJson           Parsed chat-slots.json
 * @param {string} currentHost         os.hostname()
 * @param {function(number): boolean} isPidDeadFn
 * @returns {{ shouldRelease: boolean, reason: string, prior?: object }}
 */
export function evaluateGolfClaim(stateJson, currentHost, isPidDeadFn) {
  const slots = stateJson?.slots || {};
  const golf = slots[GOLF_SLOT];
  if (!golf || typeof golf !== "object") {
    return { shouldRelease: false, reason: "golf-slot-empty" };
  }
  if (typeof golf.host === "string" && golf.host !== currentHost) {
    return { shouldRelease: false, reason: "cross-host-claim-skipped", prior: { ...golf } };
  }
  // Same-host: check the PID.
  const pid = Number(golf.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    return { shouldRelease: true, reason: "missing-or-bad-pid", prior: { ...golf } };
  }
  if (pid === process.pid) {
    return { shouldRelease: false, reason: "same-process-noop", prior: { ...golf } };
  }
  if (isPidDeadFn(pid)) {
    return { shouldRelease: true, reason: "pid-dead", prior: { ...golf } };
  }
  return { shouldRelease: false, reason: "pid-alive", prior: { ...golf } };
}

/**
 * Produce a new slots state with golf cleared. Caller decides whether to
 * persist. The returned object is a SHALLOW CLONE of input — original
 * state object is not mutated, satisfying functional-purity expectations
 * of the test seam.
 *
 * @param {object} stateJson
 * @returns {object}
 */
export function clearGolfClaim(stateJson) {
  const next = { ...(stateJson || {}) };
  next.slots = { ...(stateJson?.slots || {}) };
  delete next.slots[GOLF_SLOT];
  next.lastUpdated = new Date().toISOString();
  return next;
}

/**
 * Atomic JSON write — tmp + rename. Returns a result object; never throws.
 *
 * @param {string} path
 * @param {object} data
 * @returns {{ ok: boolean, error: string|null }}
 */
function atomicWriteJson(path, data) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
    renameSync(tmp, path);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: `${e.code || ""} ${e.message || ""}`.trim() };
  }
}

/**
 * Orchestrate the full takeover decision + write.
 *
 * @param {ReturnType<typeof parseArgs>} opts
 * @param {object} [hooks]
 * @param {function} [hooks.readJsonFn]   (path) => parsed object | null
 * @param {function} [hooks.writeJsonFn]  (path, obj) => { ok, error }
 * @param {function} [hooks.isPidDeadFn]  (pid) => boolean
 * @param {string}   [hooks.host]         override os.hostname()
 * @returns {object} structured result
 */
export function takeover(opts, hooks = {}) {
  const host = hooks.host || hostname();
  const isPidDeadFn = hooks.isPidDeadFn || ((pid) => isPidDead(pid));
  const readJsonFn = hooks.readJsonFn || defaultReadJson;
  const writeJsonFn = hooks.writeJsonFn || atomicWriteJson;

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    released: false,
    reason: "",
    statePath: opts.state,
    host,
    dryRun: !!opts.dryRun,
    error: null,
    prior: null,
  };

  const state = readJsonFn(opts.state);
  if (state === null) {
    result.reason = "state-missing-or-malformed";
    return result;
  }

  const decision = evaluateGolfClaim(state, host, isPidDeadFn);
  result.reason = decision.reason;
  if (decision.prior) result.prior = decision.prior;

  if (!decision.shouldRelease) return result;

  if (opts.dryRun) {
    result.released = true;
    result.reason += "-dry-run";
    return result;
  }

  const next = clearGolfClaim(state);
  const write = writeJsonFn(opts.state, next);
  if (!write.ok) {
    result.ok = false;
    result.error = write.error;
    return result;
  }
  result.released = true;
  return result;
}

function defaultReadJson(path) {
  if (!existsSync(path)) return null;
  let raw;
  try { raw = readFileSync(path, "utf-8"); }
  catch { return null; }
  try { return JSON.parse(raw); }
  catch { return null; }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const r = takeover(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  } else {
    const verdict = r.released ? "released" : "kept";
    const tail = r.error ? ` (error: ${r.error})` : "";
    process.stdout.write(
      `golf-slot-takeover ${r.ok ? "OK" : "FAIL"}  ${verdict}  reason=${r.reason}${tail}\n`,
    );
  }
  process.exit(r.ok ? 0 : 1);
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("golf-slot-takeover.mjs")) main();
