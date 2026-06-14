#!/usr/bin/env node
// scripts/lib/tribal-index-lock.mjs — cross-process write lock for the tribal
// embedding index `state/shared/tribal-embed-index.json` (BRAIN-UPGRADE rank 12,
// 2026-05-30 slot:alpha).
//
// ── Why ──────────────────────────────────────────────────────────────────
// `tribal-embed-index.json` (~200 MB: 768-d nomic vectors × ~14.7K entries) is
// the corpus the automatic tribal-knowledge injection pipeline ranks over
// (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs`). FIVE writers each do an
// UNGUARDED read-modify-write of it: embed-{cited-tips,engines,knowledge-store,
// wiki}-into-tribal-index.mjs + retag-tribal-backend-dev.mjs. `atomicWriteJSON`
// (tmp+rename) makes a single write atomic but does NOT serialize a cross-process
// RMW → classic lost-update (P1 read → P2 read → P1 write+A → P2 write+B drops A).
// The 200 MB write window makes the race wide. embed-wiki's author flagged it
// directly (lines 267-273): "if either is ever scheduled, a shared lock (or
// append-only index) is required." This is that shared lock.
//
// ── Design (R8 — compose the CANONICAL atomic lock) ─────────────────────────
// A thin tribal-domain adapter over `./exclusive-file-lock.mjs` — the generic
// ATOMIC O_EXCL lock. We deliberately do NOT build on `system-graph-write-lock.mjs`:
// its read-decide-then-write acquire has a TOCTOU race that loses updates under
// tight contention (proven by exclusive-file-lock.test.mjs's cross-process
// oracle — 4 hammering writers over that lock → only 3 survived). The embedders
// CAN contend (loop-invoked / scheduled), so atomicity is required. We add only:
//   1. a TRIBAL-SPECIFIC lock file (`<index>.lock`) — independent of any other lock;
//   2. a DECOUPLED knob `PRISM_TRIBAL_INDEX_LOCK_OFF`, read at CALL time.
//
// ── Wiring contract (for the deferred embedder integration) ─────────────────
// Use the SHORT-critical-section pattern (the slow Ollama embed stays OUTSIDE
// the lock; only the read-modify-write is inside it) so the default 30 s
// stale-steal never wrongly reclaims a live holder:
//   const entries = await embedAll(files);            // SLOW, no lock held
//   const r = withTribalIndexLock(INDEX_PATH, () => { // SHORT, synchronous
//     const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); // RE-READ inside the lock
//     mergeById(idx, entries);                        // existing by-id splice
//     atomicWriteJSON(INDEX_PATH, idx);
//   });
//   if (!r.ran) { console.error("[x] tribal-index held by a peer — skip; re-run"); return EXIT_TRIBAL_INDEX_LOCK_SKIP; }
// The RE-READ inside the lock is essential — the index may have changed during
// the (minutes-long) embed.

import {
  acquireExclusiveLock,
  releaseExclusiveLock,
  withExclusiveLock,
} from "./exclusive-file-lock.mjs";

/** Benign concurrent-skip exit code: a peer holds the lock; index UNTOUCHED, retry-later. */
export const EXIT_TRIBAL_INDEX_LOCK_SKIP = 4;

/** Tribal disable knob, read at CALL time. Decoupled from any other lock's knob. */
export function tribalIndexLockOff() {
  return process.env.PRISM_TRIBAL_INDEX_LOCK_OFF === "1";
}

/** Lock file for a given index path — `<index>.lock` (beside it). */
export function tribalLockPath(indexPath) {
  return String(indexPath) + ".lock";
}

/**
 * Acquire the tribal-index lock.
 * @returns {{acquired:boolean, path:string, disabled?:boolean, stolenStale?:boolean}}
 *   acquired=false → a live peer held it through the retry window (defer + re-run).
 */
export function acquireTribalIndexLock(indexPath, opts = {}) {
  const path = tribalLockPath(indexPath);
  if (tribalIndexLockOff()) return { acquired: true, path, disabled: true };
  return acquireExclusiveLock(path, opts);
}

/** Release the tribal-index lock — only if we still own it. */
export function releaseTribalIndexLock(indexPath, opts = {}) {
  if (tribalIndexLockOff()) return;
  releaseExclusiveLock(tribalLockPath(indexPath), opts);
}

/**
 * Scoped helper: acquire → run synchronous `fn()` → release. Returns
 * `{ ran:false }` without calling fn when a live peer holds the lock. When the
 * lock is OFF, runs fn unconditionally (`{ ran:true, disabled:true }`).
 */
export function withTribalIndexLock(indexPath, fn, opts = {}) {
  if (tribalIndexLockOff()) return { ran: true, value: fn(), disabled: true };
  return withExclusiveLock(tribalLockPath(indexPath), fn, opts);
}
