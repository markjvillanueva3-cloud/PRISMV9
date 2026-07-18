#!/usr/bin/env node
/**
 * autostart-coalesce.mjs — cross-hook autostart coalescing lock.
 *
 * OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18 / Finding F3.
 *
 * Problem (R12 honest, observed live this session): three autostart hooks
 * (`ollama-autostart.mjs`, `nim-autostart.mjs`, `local-compute-intent.mjs`)
 * each maintain their own per-hook cooldown. When all three match the
 * same intent on the same prompt, all three emit "Auto-started PRISM local
 * compute" within milliseconds. The autostart wrapper itself has launch-
 * already-in-progress detection (we observed "locked: launch-already-in-progress"
 * messages), but the OUTBOUND advisory injections are emitted by each hook
 * independently — context burn.
 *
 * Solution: a shared stamp-file-backed lock the autostart hooks can call
 * at entry. Per-(scope, host) keyed; idempotent; fail-open.
 *
 * Pure-core + injected-IO so unit tests can verify without filesystem.
 *
 * Usage from a hook:
 *
 *   import { shouldAttemptAutostart } from "../helpers/autostart-coalesce.mjs";
 *   if (!shouldAttemptAutostart("ollama").attempt) {
 *     emit({ continue: true });  // peer already injected the autostart line
 *     return;
 *   }
 *
 * Knobs:
 *   PRISM_AUTOSTART_COALESCE_DISABLE=1  - bypass; every hook attempts (legacy)
 *   PRISM_AUTOSTART_COALESCE_WINDOW_MS  - cooldown window (default 30000)
 *   PRISM_AUTOSTART_COALESCE_STAMP_PATH - override stamp file path
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";

const DEFAULT_WINDOW_MS = 30_000; // 30s — one /compact's typical horizon
const DEFAULT_STAMP_PATH = "H:/prism/state/shared/.autostart-coalesce-stamps.json";

// ─── pure helpers (exported for tests) ──────────────────────────────────

/** Decide whether a fresh autostart attempt is warranted given the current
 *  stamp record and now(). Pure. */
export function decideAttempt({ stamps, scope, host, now, windowMs }) {
  if (process.env.PRISM_AUTOSTART_COALESCE_DISABLE === "1") {
    return { attempt: true, reason: "disabled-via-env" };
  }
  // windowMs===0 is honored as "immediate timeout" (always attempt).
  // Negative / NaN / undefined falls back to DEFAULT_WINDOW_MS.
  const window = Number.isFinite(windowMs) && windowMs >= 0 ? windowMs : DEFAULT_WINDOW_MS;
  const key = `${scope}@${host}`;
  const rec = stamps?.[key];
  if (!rec || typeof rec.ts !== "number" || !Number.isFinite(rec.ts)) {
    return { attempt: true, reason: "no-prior-stamp" };
  }
  const age = now - rec.ts;
  if (age < 0 || age > window) {
    return { attempt: true, reason: `stamp-stale (age ${age}ms > window ${window}ms)` };
  }
  return {
    attempt: false,
    reason: `peer-attempted-${age}ms-ago`,
    peerHook: rec.hook || null,
    peerAgeMs: age,
  };
}

/** Stamp a successful autostart attempt. Returns the new stamps map. Pure. */
export function recordAttempt({ stamps, scope, host, hookName, now }) {
  const out = { ...(stamps || {}) };
  out[`${scope}@${host}`] = { ts: now, hook: hookName || null };
  return out;
}

// ─── I/O wrappers ───────────────────────────────────────────────────────

function stampPath() {
  return process.env.PRISM_AUTOSTART_COALESCE_STAMP_PATH || DEFAULT_STAMP_PATH;
}

function readStamps() {
  try {
    const raw = readFileSync(stampPath(), "utf8");
    const j = JSON.parse(raw);
    return (j && typeof j === "object") ? j : {};
  } catch {
    return {};
  }
}

function writeStamps(stamps) {
  try {
    const p = stampPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(stamps, null, 2));
    return true;
  } catch {
    return false;
  }
}

// ─── public API ─────────────────────────────────────────────────────────

/** Top-level: should THIS autostart hook attempt the launch right now? */
export function shouldAttemptAutostart(scope, opts = {}) {
  const host = opts.host || hostname();
  const now = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const windowMs = Number.isFinite(Number(process.env.PRISM_AUTOSTART_COALESCE_WINDOW_MS))
    ? Number(process.env.PRISM_AUTOSTART_COALESCE_WINDOW_MS)
    : DEFAULT_WINDOW_MS;
  const stamps = readStamps();
  const decision = decideAttempt({ stamps, scope, host, now, windowMs });
  if (decision.attempt) {
    // Record the attempt BEFORE returning, so subsequent peers within the
    // window see this hook's stamp and short-circuit.
    const hookName = opts.hookName || "unknown-autostart-hook";
    writeStamps(recordAttempt({ stamps, scope, host, hookName, now }));
  }
  return decision;
}

// ─── direct-invoke smoke (for ops/debug, not normal use) ─────────────────

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("autostart-coalesce.mjs");
if (invokedDirectly) {
  const scope = process.argv[2] || "ollama";
  const decision = shouldAttemptAutostart(scope, { hookName: "cli-smoke" });
  process.stdout.write(JSON.stringify({ scope, decision }, null, 2) + "\n");
}
