#!/usr/bin/env node
// scripts/lib/exclusive-file-lock.mjs — the canonical ATOMIC cross-process file lock.
// (BRAIN-UPGRADE rank 12, 2026-05-30 slot:alpha.)
//
// ── Why atomic (O_EXCL), not read-decide-write ─────────────────────────────
// Acquire has two paths, NEITHER with a time-of-check-to-time-of-use (TOCTOU)
// window:
//   • fresh acquire — a single atomic `fs.openSync(lockPath, "wx")`; the OS
//     guarantees EXACTLY ONE creator, everyone else gets EEXIST.
//   • stale-steal (crash recovery) — the stale lock is removed by an ATOMIC
//     `fs.renameSync` (NOT a blind unlink-by-path): under simultaneous stealers
//     exactly ONE wins the rename, the losers get ENOENT and fall through to
//     retry. A blind `unlinkSync(lockPath)` here WOULD race — a second stealer
//     could remove a lock that a first stealer already recreated, so both end up
//     inside the critical section (the steal-path TOCTOU; caught in per-file
//     scrutiny 2026-05-30 and fixed via rename). galaxy-synthesis-claim.mjs adopted
//     this rename-steal on its private copy (commit 0fae80e126); slot-task-claim.mjs
//     still carries the blind-unlink form on its recovery path (it is
//     `.claude/`-write-blocked from the alpha worktree → golf-routed migration).
//
// CONTRAST (a real bug this module exists to avoid): `system-graph-write-lock.mjs`
// acquires by `decideAcquire(read lockfile)` THEN `fs.writeFileSync(pid)` — two
// separate syscalls. Under TIGHT contention two processes both read "free", both
// write their pid, both believe they hold it → concurrent critical sections →
// lost update. Confirmed empirically: a 4-writer cross-process oracle over that
// lock produced 3 surviving appends, not 4 (one silently clobbered). That PID
// lock is fine for its low-contention long-hold regen-viz use; it is NOT safe for
// hammering writers. Use THIS module whenever multiple processes may contend.
//
// ── Dedup lineage (R8 — this is the CANONICAL copy) ─────────────────────────
// `.claude/helpers/slot-task-claim.mjs` (PER-SLOT-CLAIM-MS0) and
// `scripts/galaxy-synthesis-claim.mjs` (rank 6) each carry a PRIVATE copy of this
// exact O_EXCL + mtime-stale-steal pattern (their lock primitives are hard-bound
// to their own store path, so they couldn't be imported). This module is the
// generic extraction they SHOULD converge onto (follow-up migration — left in
// place for now to keep this unit scoped; surfaced, not silent, per R7).
//
// ── Hold-duration contract (IMPORTANT) ─────────────────────────────────────
// `staleMs` (default 30s) reclaims a CRASHED holder's lock by file mtime. mtime
// is stamped at acquire and does NOT refresh during the hold, so a LEGITIMATE
// hold longer than `staleMs` would be wrongly stolen. This lock is therefore for
// SHORT critical sections (read → mutate → write — sub-second to a few seconds,
// even for a 200 MB JSON). For a long hold (e.g. across a minutes-long network
// call) either raise `staleMs` well past the worst-case hold, or — better —
// restructure so the slow work happens OUTSIDE the lock and only the short
// read-modify-write is inside it.

import fs from "node:fs";
import path from "node:path";

export const DEFAULTS = Object.freeze({ retries: 50, retryMs: 50, staleMs: 30_000 });

// Real (non-busy-spin) sync sleep via Atomics — no one notifies the buffer, so
// Atomics.wait always times out = an OS sleep. Same primitive as slot-task-claim.
const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));
export function syncSleep(ms) {
  Atomics.wait(SLEEP_BUF, 0, 0, Math.max(0, Math.floor(ms)));
}

/**
 * Acquire an exclusive lock at `lockPath`.
 *   { retries, retryMs }  bounded wait-then-give-up (default 50 × 50ms = 2.5s)
 *   { staleMs }           reclaim a crashed holder whose mtime is older than this
 *   { selfPid }           pid stamped into the lock (default process.pid)
 * @returns {{acquired:boolean, path:string, stolenStale?:boolean}}
 *   acquired=false → a live holder kept it for the whole retry window (defer).
 * Throws only on a genuinely unexpected fs error (NOT EEXIST, which is the
 * normal "held" signal).
 */
export function acquireExclusiveLock(lockPath, opts = {}) {
  const retries = opts.retries ?? DEFAULTS.retries;
  const retryMs = opts.retryMs ?? DEFAULTS.retryMs;
  const staleMs = opts.staleMs ?? DEFAULTS.staleMs;
  const selfPid = opts.selfPid ?? process.pid;
  let stolenStale = false;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const fd = fs.openSync(lockPath, "wx"); // atomic exclusive create; EEXIST if held
      fs.writeSync(fd, JSON.stringify({ pid: selfPid, acquiredAt: new Date().toISOString() }));
      fs.closeSync(fd);
      return { acquired: true, path: lockPath, stolenStale };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const st = fs.statSync(lockPath);
        if (Date.now() - st.mtimeMs > staleMs) {
          // ATOMIC steal: rename (NOT blind unlink-by-path). renameSync is atomic,
          // so under simultaneous stealers exactly ONE wins — the loser's rename
          // throws ENOENT (the stale lock is already gone) and falls through to
          // wait+retry. A blind `unlinkSync(lockPath)` here would race: a second
          // stealer could remove a lock a first stealer already recreated → both
          // acquire (the steal-path double-unlink TOCTOU). We rename to a
          // per-(pid,attempt) sidecar, then delete that sidecar we now own.
          const stealPath = `${lockPath}.steal-${selfPid}-${attempt}`;
          fs.renameSync(lockPath, stealPath); // atomic; ENOENT if already stolen
          try { fs.unlinkSync(stealPath); } catch { /* best-effort — an orphan steal sidecar is harmless */ }
          stolenStale = true;
          continue; // retry the atomic create (a peer may still win openSync → EEXIST → wait)
        }
      } catch { /* statSync miss / lost the rename-steal race (ENOENT) → fall through to wait + retry */ }
      syncSleep(retryMs);
    }
  }
  return { acquired: false, path: lockPath };
}

/**
 * Release the lock — ONLY if we still own it (stamped pid === selfPid). Never
 * unlinks a peer's lock or an unparseable lock (those self-heal via staleMs).
 * Idempotent / fail-soft.
 */
export function releaseExclusiveLock(lockPath, opts = {}) {
  const selfPid = opts.selfPid ?? process.pid;
  let owner = null;
  try {
    owner = JSON.parse(fs.readFileSync(lockPath, "utf8")).pid;
  } catch {
    return; // absent / unreadable / unparseable → nothing safe to remove
  }
  if (owner === selfPid) {
    try { fs.unlinkSync(lockPath); } catch { /* already gone — fine */ }
  }
}

/**
 * Scoped helper: acquire → run `fn()` → release (even if fn throws). Returns
 * `{ ran:false }` WITHOUT calling fn if a live peer holds the lock through the
 * whole retry window. NOTE: `fn` must be SYNCHRONOUS — an async fn would resolve
 * its promise after `finally` already released. For async critical sections call
 * acquire/release directly and `await` between them.
 */
export function withExclusiveLock(lockPath, fn, opts = {}) {
  const lk = acquireExclusiveLock(lockPath, opts);
  if (!lk.acquired) return { ran: false, path: lockPath };
  try {
    return { ran: true, value: fn(), path: lockPath, stolenStale: lk.stolenStale };
  } finally {
    releaseExclusiveLock(lockPath, opts);
  }
}
