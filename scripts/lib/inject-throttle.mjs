// scripts/lib/inject-throttle.mjs
// MEMORY-RECALL-THROTTLE (2026-06-01 slot:golf): per-session same-prompt throttle
// for UserPromptSubmit injectors. memory-index-precheck-inject's doc comment
// promised a "per-session prompt-hash throttle (60s) to avoid context-burn on
// /loop ticks" but main() never implemented it (a doc-vs-code lie, R12). /loop
// re-submits the SAME prompt each tick, so without this the injector re-injects an
// identical top-K block every tick — pure context burn.
//
// Design notes:
//   • PER-SESSION state files (state/inject-throttle/<sid>.json), NOT one shared
//     file — 26 concurrent chats must never lost-update each other (the
//     tribal-embed-index shared-writer race lesson; CLAUDE.md regressions).
//   • FAIL-OPEN: any missing session id / I/O error => NOT throttled (inject). A
//     throttle that fails closed would silently suppress recall — worse than burn.
//   • Pure `decideThrottle` is hermetically testable; all fs is injected.

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export const DEFAULT_THROTTLE_MS = 60_000;
export const DEFAULT_STATE_DIR = "H:/prism/mcp-server/data/state/inject-throttle";
// GC horizon: a per-session file untouched longer than this is dead (the session
// ended / rotated on /compact) and is swept so the dir never grows unbounded — the
// repo's named per-session-file leak class (cf. tmp-orphan-janitor, juliett's 16GB).
export const DEFAULT_PRUNE_MS = 86_400_000;   // 24h

export function promptHash(prompt) {
  return createHash("sha1").update(String(prompt ?? "")).digest("hex").slice(0, 16);
}

// Session ids are uuid-ish; keep only filename-safe chars (defends against path
// traversal if a payload ever carries a hostile session id). null on empty.
export function safeSessionId(sessionId) {
  const s = String(sessionId ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  return s.length ? s.slice(0, 120) : null;
}

// PURE. prev = { hash, ts } | null. Returns { skip, next }.
// skip === true only when the SAME prompt was injected within ttlMs.
export function decideThrottle({ prev, hash, nowMs, ttlMs = DEFAULT_THROTTLE_MS }) {
  const skip = !!(
    prev && prev.hash === hash && Number.isFinite(prev.ts) && (nowMs - prev.ts) < ttlMs
  );
  return { skip, next: { hash, ts: nowMs } };
}

export function statePathFor(sessionId, { stateDir = DEFAULT_STATE_DIR } = {}) {
  const sid = safeSessionId(sessionId);
  return sid ? join(stateDir, `${sid}.json`) : null;
}

export function loadPrev(path, { readImpl = readFileSync, existsImpl = existsSync } = {}) {
  if (!path) return null;
  try {
    if (!existsImpl(path)) return null;
    const j = JSON.parse(readImpl(path, "utf8"));
    return (j && typeof j === "object") ? j : null;
  } catch { return null; }
}

export function savePrev(path, rec, {
  writeImpl = writeFileSync, renameImpl = renameSync, mkdirImpl = mkdirSync,
  existsImpl = existsSync, stateDir = DEFAULT_STATE_DIR,
} = {}) {
  if (!path) return false;
  try {
    if (!existsImpl(stateDir)) mkdirImpl(stateDir, { recursive: true });
    const tmp = `${path}.tmp.${process.pid}`;
    writeImpl(tmp, JSON.stringify(rec), "utf8");
    renameImpl(tmp, path);                 // atomic publish
    return true;
  } catch { return false; }
}

// Opportunistic GC of stale per-session throttle files. Fail-soft; injected fs.
// Called only on the not-throttled (write) path, so its frequency is already
// bounded by the throttle itself — and it keeps the dir small, so each scan is cheap.
export function pruneStaleSessions(stateDir, {
  nowMs, pruneMs = DEFAULT_PRUNE_MS,
  readdirImpl = readdirSync, statImpl = statSync, unlinkImpl = unlinkSync, existsImpl = existsSync,
} = {}) {
  let removed = 0;
  try {
    if (!existsImpl(stateDir)) return 0;
    for (const f of readdirImpl(stateDir)) {
      if (!/\.json$/.test(f) || f.includes(".tmp.")) continue;   // skip in-flight tmp writes
      const p = join(stateDir, f);
      try {
        const st = statImpl(p);
        if (Number.isFinite(st.mtimeMs) && (nowMs - st.mtimeMs) > pruneMs) { unlinkImpl(p); removed++; }
      } catch { /* per-file fail-soft */ }
    }
  } catch { /* dir-level fail-soft */ }
  return removed;
}

// Convenience used by the hook: decide + persist. Returns true => injector SKIPS.
// We re-stamp the timestamp ONLY when we are about to inject (skip === false), so a
// persistent same-prompt loop re-injects at most once per ttl window (the ts anchors
// to the LAST real injection, not to every suppressed tick).
export function shouldThrottleInject({
  sessionId, prompt, nowMs, ttlMs = DEFAULT_THROTTLE_MS, stateDir = DEFAULT_STATE_DIR, fs = {},
}) {
  const path = statePathFor(sessionId, { stateDir });
  if (!path) return false;                 // no session id => fail-open (inject)
  if (!(ttlMs > 0)) return false;          // ttl 0 (knob-disabled) => never throttle
  const hash = promptHash(prompt);
  const prev = loadPrev(path, fs);
  const { skip, next } = decideThrottle({ prev, hash, nowMs, ttlMs });
  if (!skip) {
    savePrev(path, next, { ...fs, stateDir });
    pruneStaleSessions(stateDir, { nowMs, ...fs });   // GC dead sessions; keeps the dir bounded
  }
  return skip;
}
