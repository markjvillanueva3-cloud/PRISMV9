#!/usr/bin/env node
// tier: T4
/**
 * auto-fix-blackwell-doctrine-inject.mjs
 * --------------------------------------
 * FLEET-WIDE standing-doctrine injector (operator directive 2026-06-09, slot
 * india): "automatically make adjustments and enhancements as you come across
 * issues, remember that we upgraded pc specs -- make this auto enforced fleet
 * wide."
 *
 * Two behaviors every chat must apply on every task:
 *   1. AUTO-FIX INLINE -- when you hit a bug / stale test / broken wiring /
 *      suboptimality DURING any task, fix it then-and-there (don't defer, don't
 *      merely report). Net-benefit + safe -> auto-build. [[feedback_auto_fix_and_blackwell_fleet_enforced]]
 *   2. BUILD FOR BLACKWELL -- target the upgraded box (RTX PRO 6000 Blackwell
 *      96GB, 9950X3D 32T, 136GB RAM, NVMe). The gap is UTILIZATION, not capacity.
 *      [[feedback_build_for_blackwell_hardware]]
 *
 * Fleet-wide enforcement = a UserPromptSubmit hook fires for EVERY slot. To stay
 * low-noise it is SESSION-GATED: injected once per session (same rate-limit
 * pattern as mcp-route-suggest's doctrine gate), so it anchors the directive in
 * context without re-burning tokens every turn.
 *
 * Pure gate functions (buildDoctrineMessage / shouldInject / recordSeen) are
 * exported + reference-tested. The impure shell reads stdin + the sentinel +
 * emits hookSpecificOutput.additionalContext. Fail-soft: any error -> { continue:true }.
 *
 * Knob: PRISM_AUTOFIX_DOCTRINE_DISABLE=1 (off) - PRISM_AUTOFIX_DOCTRINE_FILE (test seam).
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import { dirname, join as _pathJoin } from "path";
import _fs from "node:fs";
import _os from "node:os";

// Fire at most once per session. 24h window ~= per-session for any realistic
// session length (mirrors mcp-route-suggest's _DOCTRINE_RATE_WINDOW_MS rationale).
const _WINDOW_MS = 24 * 60 * 60 * 1000;
// Env-overridable so a test isolates its sentinel per-process (the shared default
// is written by every fleet slot; a strict-gating test must not share it).
const _SENTINEL_FILE = process.env.PRISM_AUTOFIX_DOCTRINE_FILE ||
  _pathJoin(_os.tmpdir(), "prism-hook-state", "autofix-blackwell-doctrine-seen.json");

/** The standing-doctrine block injected into the session context. Pure. */
export function buildDoctrineMessage() {
  return [
    "## Standing doctrine (operator 2026-06-09, FLEET-WIDE auto-enforced)",
    "- **AUTO-FIX INLINE**: when you hit a bug / stale test / broken wiring / suboptimality DURING any task, FIX it then-and-there -- do not defer, do not merely report. Net-benefit + safe (incl. multi-chat: peer-claimed surface -> patch-sibling) -> auto-build. [[feedback_auto_fix_and_blackwell_fleet_enforced]] + [[feedback_net_benefit_auto_build]].",
    "- **BUILD FOR BLACKWELL**: target the upgraded box -- RTX PRO 6000 Blackwell 96GB + 9950X3D 32T + 136GB RAM + NVMe. Generous heaps (never fight a low default -- e.g. node `--max-old-space-size`), GPU-resident models, high concurrency. The gap is UTILIZATION, not capacity. [[feedback_build_for_blackwell_hardware]].",
  ].join("\n");
}

/** Load the seen-sentinel state (best-effort; missing/corrupt -> {}). */
export function loadSeen(file = _SENTINEL_FILE, readImpl = _fs.readFileSync) {
  try { return JSON.parse(readImpl(file, "utf8")); }
  catch { return {}; }
}

/**
 * Gate: inject only when this session has NOT been served within the window.
 * Pure. A missing/non-numeric stamp -> inject. now/windowMs injectable for tests.
 */
export function shouldInject(state, sessionId, now = Date.now(), windowMs = _WINDOW_MS) {
  if (!sessionId) return false; // no session id -> cannot gate -> stay silent (avoid every-turn spam)
  const s = state && typeof state === "object" ? state : {};
  const last = s[sessionId];
  if (typeof last !== "number") return true;
  return (now - last) >= windowMs;
}

/** Record this session as served, trimming entries older than 2 windows. Pure-ish (returns new state). */
export function recordSeen(state, sessionId, now = Date.now(), windowMs = _WINDOW_MS) {
  const s = state && typeof state === "object" ? { ...state } : {};
  s[sessionId] = now;
  const cutoff = now - 2 * windowMs;
  for (const [k, t] of Object.entries(s)) {
    if (typeof t !== "number" || t < cutoff) delete s[k];
  }
  return s;
}

function _saveSeen(state, file = _SENTINEL_FILE) {
  try {
    const dir = dirname(file);
    if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
    // Atomic per-PID temp + rename so a concurrent fleet write never yields a
    // torn read (lost-update of a peer key is bounded + harmless for a dedup).
    const tmp = `${file}.tmp-${process.pid}`;
    _fs.writeFileSync(tmp, JSON.stringify(state));
    _fs.renameSync(tmp, file);
  } catch { /* best-effort */ }
}

function readStdin() {
  return new Promise((resolve) => {
    let buffer = "";
    process.stdin.on("data", (chunk) => { buffer += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buffer || "{}")); }
      catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

async function main() {
  if (process.env.PRISM_AUTOFIX_DOCTRINE_DISABLE === "1") { process.stdout.write(JSON.stringify({ continue: true })); return; }
  if (_hp_shouldSkip("auto-fix-blackwell-doctrine-inject")) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const sessionId = (input.session_id || input.sessionId || "").toString().slice(0, 36);

  const state = loadSeen();
  if (!shouldInject(state, sessionId)) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  _saveSeen(recordSeen(state, sessionId));

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: buildDoctrineMessage(),
    },
  }));
}

// Guard main() so the module is importable by tests without firing stdin-read +
// stdout-write side-effects (a stray {"continue":true} corrupts the TAP stream).
if (process.argv[1] && process.argv[1].endsWith("auto-fix-blackwell-doctrine-inject.mjs")) {
  main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
}
