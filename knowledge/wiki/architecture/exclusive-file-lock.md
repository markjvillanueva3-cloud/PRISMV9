---
title: exclusive-file-lock — canonical atomic cross-process file lock (+ the TOCTOU lesson)
type: architecture
status: shipped
shipped: 2026-05-30
slot: alpha
tags: [concurrency, lock, atomic, o-excl, toctou, tribal, brain-upgrade, dedup-canonical]
---

# `scripts/lib/exclusive-file-lock.mjs` — the canonical atomic cross-process lock

Shipped 2026-05-30 (slot alpha) as the lock half of BRAIN-UPGRADE **rank 12** (tribal-index writer
lock). It is the **dedup-canonical** atomic file lock for PRISM scripts.

## What

`acquireExclusiveLock(lockPath, {retries, retryMs, staleMs, selfPid})` /
`releaseExclusiveLock` / `withExclusiveLock(lockPath, fn, opts)`. Acquire is a single atomic
`fs.openSync(lockPath, "wx")` — the OS guarantees exactly one creator; everyone else gets `EEXIST`.
Bounded wait-then-defer (default 50 × 50 ms = 2.5 s), mtime stale-steal (default 30 s reclaims a
crashed holder), release-only-own (never unlinks a peer's or an unparseable lock — those self-heal
via `staleMs`).

## Why it exists — the TOCTOU lesson (load-bearing)

Rank 12 first tried to reuse the existing `scripts/lib/system-graph-write-lock.mjs` (a
path-parameterized PID lock). A **real cross-process oracle test caught it failing**: 4 concurrent
writers hammering the lock, each doing read → sleep → append → write, produced **3 surviving appends,
not 4** — a silent lost update *despite the lock*.

Root cause: that lock's acquire is **read-decide-then-`writeFileSync`** — two separate syscalls with
a time-of-check-to-time-of-use gap. Under tight contention, two processes both read the lock as
"free", both write their pid, both believe they hold it → concurrent critical sections → lost update.
It is safe for its original low-contention, long-hold use (regen-viz vs system-viz-add-node) but is
**NOT safe for contending writers**. (This is a genuine latent bug in `system-graph-write-lock.mjs`
— flagged for the system-viz/sierra owner; out of scope for rank 12.)

The fix is **atomicity**: `O_EXCL` (`"wx"`) makes acquire a single atomic op — no TOCTOU, ever. This
is the same pattern `galaxy-synthesis-claim.mjs` (rank 6) and `.claude/helpers/slot-task-claim.mjs`
(PER-SLOT-CLAIM-MS0) already use privately; `exclusive-file-lock.mjs` is the generic extraction they
should converge onto (a documented follow-up migration — surfaced, not silent, per R7).

**Sibling steal-path hardening (`0fae80e126`, 2026-05-30):** the per-file scrutiny of this primitive
revealed the SAME blind-unlink steal-path TOCTOU on `galaxy-synthesis-claim.mjs`'s private
`acquireLock` — two concurrent stealers of one stale lock could both `unlinkSync(lockPath)` (one
removing a lock the other already recreated) and both acquire. Ported to the atomic rename-steal
(rename to a per-`(pid,attempt)` sidecar → single rename winner → loser ENOENTs → retry), +1
hermetic regression test (43/43, 2-reviewer PASS). `.claude/helpers/slot-task-claim.mjs` carries the
identical blind-unlink form but is `.claude/`-write-blocked from the alpha worktree → **golf-routed**
follow-up.

**Two lock styles now coexist in PRISM, by design:**
| Lock | acquire | safe under contention? | use for |
|---|---|---|---|
| `system-graph-write-lock.mjs` | read-decide-write (PID) | NO (TOCTOU) | low-contention long holds (regen-viz) |
| `exclusive-file-lock.mjs` | O_EXCL atomic create | YES | any contending writers |

## Hold-duration contract

`staleMs` reclaims a crashed holder by file **mtime**, which is stamped at acquire and does NOT
refresh during the hold. So a legitimate hold longer than `staleMs` would be wrongly stolen → this
lock is for **SHORT critical sections** (read → mutate → write, even on a 200 MB JSON: sub-second to
seconds). For slow work (a minutes-long network/Ollama call), keep it OUTSIDE the lock and only the
RMW inside — or raise `staleMs` past the worst-case hold.

## Consumer: `tribal-index-lock.mjs`

The first consumer is the tribal-index adapter (`scripts/lib/tribal-index-lock.mjs`): `.lock` path +
a decoupled call-time knob `PRISM_TRIBAL_INDEX_LOCK_OFF` + `withTribalIndexLock`. It guards the
~200 MB `state/shared/tribal-embed-index.json` against the 5-writer lost-update race (see
[[reference_alpha_tribal_index_race_2026_05_30]] + `state/shared/specs/TRIBAL-INDEX-WRITER-LOCK-PLAN-2026-05-30.md`).
The embedder WIRING is a deferred Ollama-gated follow-up; the lock + adapter (17/17 tests, incl. a
5-writer cross-process oracle that PASSES) are the validated foundation.

## Tests

- `scripts/lib/exclusive-file-lock.test.mjs` — 8 (acquire/defer/release-only-own/stale-steal/
  withExclusiveLock + a 5-writer cross-process oracle proving serialization; fails loud on spawn
  failure, R12).
- `scripts/lib/tribal-index-lock.test.mjs` — 9 hermetic adapter tests (path, decoupled OFF knob,
  delegation, defer-when-held).

Memory: [[reference_alpha_tribal_index_race_2026_05_30]]. Sibling lock: [[galaxy-synthesis-claim-ledger]].
