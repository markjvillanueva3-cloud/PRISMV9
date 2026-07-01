// scripts/lib/session-once-gate.mjs
// -----------------------------------
// Reusable per-session "fire-once" sentinel for STATIC / advice-invariant
// advisory nudges that would otherwise re-inject the same text on every fire
// (the 26-chat fleet × every matching tool call = thousands of byte-identical
// injections for ~0 incremental value).
//
// Extracted (R7/R15 "build it once") from the inline _BACKEND_AUDIT_SESSION_KEY /
// _DOCTRINE_SESSION_KEY pattern in .claude/hooks/mcp-route-suggest.mjs so the
// fleet has ONE canonical session-once gate instead of N drifting clones. First
// consumer: the node-no-rtk-wrap nudge in pre-tool-savings-multi.mjs (2293 fires
// → ~1/session). The mcp-route-suggest inline copies should migrate here (noted
// follow-up — not rewired in the same unit to avoid re-scrutinizing a shipped gate).
//
// Key scheme: `${sessionId}:${key}` so multiple distinct nudges (different keys)
// gate INDEPENDENTLY within one session, and a fresh session re-fires. A 24h
// window (≈ per-session, since sessions rarely outlive a day) bounds the store.
//
// fs-backed + FAIL-SOFT by design: any read/write error degrades to "not seen"
// (the nudge fires — prior behavior), never throws. An ABSENT sessionId also
// degrades to "not seen" (the gate only engages when the hook payload carries
// a session_id, which PreToolUse does).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h ≈ one session

function loadSeen(rateFile) {
  try { return JSON.parse(readFileSync(rateFile, "utf8")); }
  catch { return {}; }
}

function saveSeen(rateFile, state) {
  try {
    const dir = dirname(rateFile);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(rateFile, JSON.stringify(state));
  } catch { /* best-effort — a failed write just means the nudge may re-fire */ }
}

/**
 * True iff (sessionId, key) was marked within the last `windowMs`. Empty
 * sessionId/key → false (gate disengaged → caller's nudge fires as before).
 */
export function seenThisSession(rateFile, sessionId, key, windowMs = DEFAULT_WINDOW_MS) {
  if (!sessionId || !key) return false;
  const state = loadSeen(rateFile);
  const last = state[`${sessionId}:${key}`];
  return typeof last === "number" && (Date.now() - last) < windowMs;
}

/**
 * Record (sessionId, key) as seen now, and prune entries older than 2×window so
 * the store can't grow unbounded across many sessions. No-op on empty inputs.
 */
export function markSeenThisSession(rateFile, sessionId, key, windowMs = DEFAULT_WINDOW_MS) {
  if (!sessionId || !key) return;
  const state = loadSeen(rateFile);
  state[`${sessionId}:${key}`] = Date.now();
  const cutoff = Date.now() - 2 * windowMs;
  for (const [k, t] of Object.entries(state)) {
    if (typeof t !== "number" || t < cutoff) delete state[k];
  }
  saveSeen(rateFile, state);
}
