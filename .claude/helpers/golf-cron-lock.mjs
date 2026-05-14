#!/usr/bin/env node
/**
 * golf-cron-lock.mjs — CLEANUP-MS0 / U-CLEANUP-E2
 *
 * Per-cron lockfile helper for the golf-slot cron registry. Prevents a
 * registered hygiene prompt from re-firing while a prior fire is still in
 * flight (e.g. the previous /wiki-lint hasn't finished when the next cron
 * tick happens to land).
 *
 * Lock model
 * ──────────
 *   - One lockfile per cron id at <repo>/state/shared/.cron-locks/<id>.lock.
 *   - Lock body is JSON: { pid, startedAt, expectedDurationMs, schemaVersion }.
 *     pid lets us detect "lock holder is dead → safe to steal".
 *     startedAt + expectedDurationMs let us age-out a lock whose holder may
 *     still be alive but has run far past the registered expected duration
 *     (the prompt got stuck) — see STALE_GRACE_MULT.
 *   - Acquire is atomic via `fs.openSync(path, "wx")` (O_EXCL on POSIX,
 *     CREATE_NEW on Windows). Two concurrent golf bootstraps trying to lock
 *     the same id only one wins.
 *
 * Lock lifecycle
 * ──────────────
 *   acquire(id, expectedDurationMs)
 *     → { ok: true,  release() }            // successful new lock
 *     → { ok: true,  release(), stolenFromPid }  // stole a stale/dead lock
 *     → { ok: false, heldBy: { pid, ageMs, expectedDurationMs } }  // still live
 *
 *   release() removes the lockfile. Safe to call even after a steal —
 *   only removes the file if its body still matches the lock we wrote.
 *   (Belt-and-suspenders against another process stealing our lock while
 *   we were still working: we never unlink someone else's lock.)
 *
 * Why no `flock`/lockfile-utils dependency: PRISM's fleet runs across
 * Windows + WSL + native Linux hosts on different filesystems. `O_EXCL`
 * is the one primitive that works identically everywhere, and the
 * SQLite-backed CoordinationStoreEngine already covers any case that
 * needs true distributed locking — these cron locks are intentionally
 * per-host, intra-process best-effort.
 *
 * Failure modes covered
 * ─────────────────────
 *   - Lock dir missing → created on first acquire (idempotent mkdir).
 *   - Lockfile exists, holder PID dead → stolen.
 *   - Lockfile exists, holder PID live but startedAt + STALE_GRACE_MULT *
 *     expectedDurationMs < now → stolen (holder is wedged).
 *   - Lockfile is corrupt JSON → quarantined to .lock.corrupt-<ISO>, fresh
 *     lock taken. We never silently delete unparseable state.
 *   - Concurrent acquire race (two callers, same id, same instant) →
 *     O_EXCL gives one ok, the other gets EEXIST and re-reads to decide.
 *   - release() after the lock was stolen → safe no-op (PID/startedAt
 *     mismatch detected, file left alone).
 *
 * Test seam
 * ─────────
 *   Every I/O + clock + PID-liveness call is injectable via the `hooks`
 *   param, so the test suite can exercise all branches without a real
 *   filesystem or real subprocess.
 *
 * @see state/shared/golf-cron-registry.json   — the registry these locks gate
 * @see .claude/commands/golf-bootstrap.md     — the skill that acquires them
 * @see U-CLEANUP-E2
 */

import {
  existsSync, mkdirSync, openSync, writeSync, closeSync, readFileSync,
  unlinkSync, renameSync, readdirSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Repo root (matches handoff-staleness.mjs / golf-state-snapshot.mjs) ──

function deriveRepoRoot() {
  try { return resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); }
  catch { return "H:/prism"; }
}
const REPO = process.env.PRISM_REPO_ROOT || deriveRepoRoot();
const DEFAULT_LOCK_DIR = join(REPO, "state", "shared", ".cron-locks");

const SCHEMA_VERSION = 1;

/** A live lock is considered "wedged" after expectedDurationMs * this multiplier. */
export const STALE_GRACE_MULT = 4;

// ─── pid liveness (default) ──────────────────────────────────────────────

/**
 * Is the given OS process still alive? `process.kill(pid, 0)` sends no signal
 * but throws on ESRCH (no such process) and EPERM (process exists but is owned
 * by another user — still "alive" for our purposes). EINVAL on some platforms
 * for pid 0/1 is treated alive too.
 * @param {number} pid
 * @returns {boolean}
 */
export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) {
    if (e && e.code === "EPERM") return true;
    if (e && e.code === "EINVAL") return true;
    return false;
  }
}

// ─── pure helpers ────────────────────────────────────────────────────────

function lockPath(lockDir, id) { return join(lockDir, `${id}.lock`); }

/** Read a lockfile and return its parsed body, or `{ corrupt: true }` if the
 *  bytes do not parse as JSON. Returns null when the file is absent. */
export function readLockSafe(p, hooks = {}) {
  const exists = hooks.existsSyncFn || existsSync;
  const read = hooks.readFileSyncFn || readFileSync;
  if (!exists(p)) return null;
  let raw;
  try { raw = read(p, "utf-8"); }
  catch { return null; }
  try { return JSON.parse(raw); }
  catch { return { corrupt: true, raw }; }
}

/**
 * Decide whether an existing lock should be stolen. Pure — caller drives the
 * filesystem.
 *
 *   - corrupt JSON          → steal (quarantine first)
 *   - bad shape             → steal (treat as corrupt)
 *   - holder PID dead       → steal
 *   - startedAt + STALE_GRACE_MULT * expectedDurationMs < now → steal (wedged)
 *   - otherwise             → keep (live + within grace)
 *
 * @returns {{ steal: boolean, reason: string, holder?: object }}
 */
export function evaluateLock(body, now, isAliveFn) {
  if (body == null) return { steal: false, reason: "no-lock" };
  if (body.corrupt) return { steal: true, reason: "corrupt-json" };
  const pid = Number(body.pid);
  const startedMs = Date.parse(body.startedAt);
  const expected = Number(body.expectedDurationMs);
  if (!Number.isInteger(pid) || !Number.isFinite(startedMs) || !Number.isFinite(expected)) {
    return { steal: true, reason: "bad-shape", holder: body };
  }
  if (!isAliveFn(pid)) {
    return { steal: true, reason: "holder-dead", holder: { pid, startedAt: body.startedAt, expectedDurationMs: expected } };
  }
  const ageMs = now - startedMs;
  if (ageMs > expected * STALE_GRACE_MULT) {
    return { steal: true, reason: "holder-wedged", holder: { pid, ageMs, expectedDurationMs: expected } };
  }
  return { steal: false, reason: "live", holder: { pid, ageMs, expectedDurationMs: expected } };
}

// ─── core ────────────────────────────────────────────────────────────────

/**
 * Try to acquire the lock for `id` with the given `expectedDurationMs`. See
 * the file header for the full state diagram.
 *
 * @param {string} id
 * @param {number} expectedDurationMs
 * @param {object} [opts]
 * @param {string} [opts.lockDir]      override default lock dir (tests)
 * @param {number} [opts.pid]          override process.pid (tests)
 * @param {number} [opts.now]          override Date.now() (tests)
 * @param {object} [opts.hooks]        I/O seam injection (tests)
 * @returns {{ ok: true, release: ()=>boolean, stolenFromPid?: number, quarantined?: string }
 *          | { ok: false, heldBy: object, reason: string }}
 */
export function acquire(id, expectedDurationMs, opts = {}) {
  if (typeof id !== "string" || !id || !/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return { ok: false, heldBy: null, reason: "bad-id" };
  }
  if (!Number.isFinite(expectedDurationMs) || expectedDurationMs <= 0) {
    return { ok: false, heldBy: null, reason: "bad-duration" };
  }
  const hooks = opts.hooks || {};
  const lockDir = opts.lockDir || DEFAULT_LOCK_DIR;
  const pid = Number.isInteger(opts.pid) ? opts.pid : process.pid;
  const nowMs = Number.isFinite(opts.now) ? opts.now : Date.now();
  const isAliveFn = hooks.isPidAliveFn || isPidAlive;

  const mkdirFn = hooks.mkdirSyncFn || mkdirSync;
  const openFn = hooks.openSyncFn || openSync;
  const writeFn = hooks.writeSyncFn || writeSync;
  const closeFn = hooks.closeSyncFn || closeSync;
  const renameFn = hooks.renameSyncFn || renameSync;

  try { mkdirFn(lockDir, { recursive: true }); }
  catch (e) { return { ok: false, heldBy: null, reason: `mkdir-failed: ${e.code || e.message}` }; }

  const lp = lockPath(lockDir, id);
  const body = {
    schemaVersion: SCHEMA_VERSION,
    pid,
    startedAt: new Date(nowMs).toISOString(),
    expectedDurationMs,
    id,
  };
  const bodyBytes = JSON.stringify(body, null, 2);

  // Attempt the atomic create-exclusive open. On EEXIST we re-evaluate.
  const tryOpen = () => {
    let fd;
    try { fd = openFn(lp, "wx"); }
    catch (e) {
      if (e && e.code === "EEXIST") return { taken: true };
      return { taken: false, err: e };
    }
    try { writeFn(fd, bodyBytes); } finally { closeFn(fd); }
    return { taken: false, owned: true };
  };

  let opened = tryOpen();
  if (opened.err) return { ok: false, heldBy: null, reason: `open-failed: ${opened.err.code || opened.err.message}` };
  if (opened.owned) return { ok: true, release: makeReleaseFn(lp, body, hooks) };

  // Existing lock — read + decide.
  const existing = readLockSafe(lp, hooks);
  const decision = evaluateLock(existing, nowMs, isAliveFn);

  if (!decision.steal) {
    return { ok: false, heldBy: decision.holder || existing, reason: decision.reason };
  }

  // Steal. Quarantine if corrupt — never silently destroy parseable state we
  // didn't write. dead/wedged locks are unlinked outright (their body IS our
  // body shape, just abandoned by the holder).
  let quarantined;
  try {
    if (decision.reason === "corrupt-json" || decision.reason === "bad-shape") {
      quarantined = `${lp}.corrupt-${new Date(nowMs).toISOString().replace(/[:.]/g, "-")}`;
      renameFn(lp, quarantined);
    } else {
      (hooks.unlinkSyncFn || unlinkSync)(lp);
    }
  } catch (e) {
    return { ok: false, heldBy: existing, reason: `steal-cleanup-failed: ${e.code || e.message}` };
  }

  // Re-open exclusive — if a third party slipped in between unlink and open we
  // surface "stolen-but-retaken" rather than crashing.
  opened = tryOpen();
  if (opened.taken) {
    return { ok: false, heldBy: readLockSafe(lp, hooks), reason: "raced-after-steal" };
  }
  if (opened.err) return { ok: false, heldBy: null, reason: `open-after-steal-failed: ${opened.err.code || opened.err.message}` };

  return {
    ok: true,
    release: makeReleaseFn(lp, body, hooks),
    stolenFromPid: existing && !existing.corrupt ? Number(existing.pid) : null,
    stolenReason: decision.reason,
    quarantined,
  };
}

/**
 * Build a release function that only unlinks the lockfile if its current
 * contents still match the lock we wrote (pid + startedAt). Prevents us from
 * removing a lock that a peer legitimately stole from us mid-flight.
 */
function makeReleaseFn(lp, ownedBody, hooks) {
  return function release() {
    const existsFn = hooks.existsSyncFn || existsSync;
    const readFn = hooks.readFileSyncFn || readFileSync;
    const unlinkFn = hooks.unlinkSyncFn || unlinkSync;
    if (!existsFn(lp)) return false;
    let cur;
    try { cur = JSON.parse(readFn(lp, "utf-8")); }
    catch { return false; }
    if (cur.pid !== ownedBody.pid || cur.startedAt !== ownedBody.startedAt) return false;
    try { unlinkFn(lp); return true; }
    catch { return false; }
  };
}

/**
 * Read-only inspector: returns one entry per existing lockfile in `lockDir`,
 * each annotated with the same evaluateLock decision the acquirer would make.
 * Powers the /peer-audit skill's "what's golf currently working on?" panel.
 * @returns {{ id: string, path: string, body: object|null, evaluation: object }[]}
 */
export function listLocks(opts = {}) {
  const hooks = opts.hooks || {};
  const lockDir = opts.lockDir || DEFAULT_LOCK_DIR;
  const nowMs = Number.isFinite(opts.now) ? opts.now : Date.now();
  const isAliveFn = hooks.isPidAliveFn || isPidAlive;
  const existsFn = hooks.existsSyncFn || existsSync;
  const readdirFn = hooks.readdirSyncFn || readdirSync;

  if (!existsFn(lockDir)) return [];
  let names;
  try { names = readdirFn(lockDir); }
  catch { return []; }

  const out = [];
  for (const name of names) {
    if (!name.endsWith(".lock")) continue;
    const p = lockPath(lockDir, name.slice(0, -5));
    const body = readLockSafe(p, hooks);
    const evaluation = evaluateLock(body, nowMs, isAliveFn);
    out.push({ id: name.slice(0, -5), path: p, body, evaluation });
  }
  return out;
}

// ─── CLI (status / unlock subcommands) ───────────────────────────────────

function printHelp() {
  process.stdout.write([
    "golf-cron-lock.mjs — per-cron lockfile helper (U-CLEANUP-E2)",
    "",
    "Library use:",
    "  import { acquire, listLocks } from './golf-cron-lock.mjs'",
    "",
    "CLI:",
    "  node .claude/helpers/golf-cron-lock.mjs status [--json]",
    "       List every existing .cron-locks/*.lock with held-by + age + verdict.",
    "  node .claude/helpers/golf-cron-lock.mjs unlock <id> [--force]",
    "       Release a stale/dead lock (refuses to remove a live one unless --force).",
    "",
  ].join("\n"));
}

function cliStatus(asJson, opts = {}) {
  const locks = listLocks(opts);
  if (asJson) { process.stdout.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, locks }) + "\n"); return 0; }
  if (locks.length === 0) { process.stdout.write("golf-cron-lock: 0 locks held\n"); return 0; }
  process.stdout.write(`golf-cron-lock: ${locks.length} lock(s)\n`);
  for (const l of locks) {
    const v = l.evaluation;
    const tag = v.steal ? `STALE (${v.reason})` : v.reason;
    const holder = l.body && !l.body.corrupt
      ? `pid ${l.body.pid} since ${l.body.startedAt} (expected ${l.body.expectedDurationMs}ms)`
      : "<corrupt body>";
    process.stdout.write(`  ${l.id}: ${holder} — ${tag}\n`);
  }
  return 0;
}

function cliUnlock(id, force, opts = {}) {
  if (!id) { process.stderr.write("golf-cron-lock unlock: missing <id>\n"); return 2; }
  const lockDir = opts.lockDir || DEFAULT_LOCK_DIR;
  const lp = lockPath(lockDir, id);
  if (!existsSync(lp)) { process.stdout.write(`golf-cron-lock: no lock for '${id}'\n`); return 0; }
  const body = readLockSafe(lp);
  const decision = evaluateLock(body, Date.now(), isPidAlive);
  if (!decision.steal && !force) {
    process.stderr.write(`golf-cron-lock: '${id}' is held live (${decision.reason}); pass --force to remove anyway\n`);
    return 1;
  }
  try { unlinkSync(lp); process.stdout.write(`golf-cron-lock: removed '${id}'\n`); return 0; }
  catch (e) { process.stderr.write(`golf-cron-lock: unlink failed: ${e.code || e.message}\n`); return 1; }
}

export function run(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") { printHelp(); return 0; }
  const cmd = argv[0];
  const rest = argv.slice(1);
  if (cmd === "status") return cliStatus(rest.includes("--json"));
  if (cmd === "unlock") {
    const id = rest.find((a) => !a.startsWith("--"));
    return cliUnlock(id, rest.includes("--force"));
  }
  process.stderr.write(`golf-cron-lock: unknown command '${cmd}'\n`);
  return 2;
}

// Entry guard — exact-path equality so vitest imports never exec the CLI.
const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  try { process.exit(run()); }
  catch (err) {
    process.stderr.write(`golf-cron-lock: fatal: ${(err && err.message) || err}\n`);
    process.exit(1);
  }
}

export { SCHEMA_VERSION, DEFAULT_LOCK_DIR };
