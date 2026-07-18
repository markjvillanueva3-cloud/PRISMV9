---
name: reference_brain_lock_reclaim_2026_06_09
description: "Fail-loud violation fixed (R3-C1, ultracode round-2 wp9xijq9b top finding): a 32-NUL-byte corrupt .brain-refresh.lock dead-locked ALL 5 brain-refresh pipelines (BM25/dense/AMP2/wiki-tribal/viz) for 27h+ — acquireLockAt's catch{return false} on an unparseable lock ('conservative, never run blind') treated corruption as a reason to NOT run. Dense recall sidecar frozen at count 11402/builtAt-Jun8 while BM25 advanced to today (1946-memo lag, growing per-session). Fix: corrupt lock = not a live holder -> reclaim via the SAME race-safe rename-aside path as stale/dead-PID, fail-loud. P2 hardening: distinguish EMPTY (0-byte = peer mid-creation in the openSync->writeSync window -> DEFER) from non-empty-garbage (reclaim). 59/59, 3-of-3 PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brain_lock_reclaim_2026_06_09
---


# brain-refresh corrupt-lock reclaim (2026-06-09, slot:alpha)

Commits `U-OBS-BRAIN-LOCK-RECLAIM` + `-P2`. The top finding of ultracode discovery
round-2 (`wp9xijq9b`), shipped same-fire. A correctness/retention fix, not an
efficiency tune.

## The freeze (a silent fail-loud violation)
`scripts/brain-refresh.mjs` is the detached Stop-hook driver for all 5
memory/wiki/tribal refresh pipelines ([[reference_post_ship_brain-refresh-ms0-u-brain-refresh-stop-wire]]).
Its `acquireLockAt` had `catch { return false }` when `JSON.parse(readFileSync(lock))`
threw -- so a 32-NUL-byte corrupt `.brain-refresh.lock` (an external crash/kill
mid-write, mtime Jun-8) made EVERY brain-refresh run give up ("conservative, never
run blind"). Result: the dense semantic-recall sidecar froze at count 11402 /
builtAt 2026-06-08T16:54:19Z while the BM25 sidecar advanced to today -- a 1946-memo
lag that GREW each session. Dense recall (a PSN leg) was silently dead fleet-wide for
27h+. Nothing surfaced it until the ultracode discovery measured the two sidecars'
builtAt gap.

## The fix
A corrupt lock is BY DEFINITION not a live holder (a real holder writes valid
{pid,ts} JSON). Route it into the SAME race-safe rename-aside reclaim path already
used for stale/dead-PID holders (preserves single-writer: only one racer wins the
rename, loser defers), fail-LOUD to stderr. Removed the live 32-NUL lock for
immediate unblock (next Stop-hook brain-refresh `--resume` re-embeds incrementally).

## P2 hardening (scrutiny B+C, closed same-fire)
The naive reclaim could, in the microsecond window between a peer's
`openSync(lock,"wx")` (creates an empty entry) and its `writeSync(JSON)`, read 0
bytes -> treat the peer's just-created lock as corrupt -> reclaim it -> break
single-writer. Fix: distinguish EMPTY (0-byte = live peer mid-creation -> DEFER, the
old-safe behavior) from non-empty-unparseable (genuine corruption -> reclaim). A
single small `writeSync` makes a partial NON-empty body unreachable, so
empty-vs-non-empty is the EXACT safe boundary; the 32-NUL fix is preserved (non-empty).

## LESSONS
1. A `catch { return false }` on a LOCK read is a silent-total-freeze trap: it
   converts "I can't read the lock" into "never run," which on a corrupt lock means
   forever. A corrupt/unreadable lock is NOT a live holder -- reclaim it (fail-loud),
   don't defer to it. (Sibling class to the tribal-index fail-OPEN clobber + the
   wiki-leafidx silent-no-op -- silent degradation on a corrupt state file.)
2. A test that asserts the BUGGY behavior (here: "garbage lock -> false") locks the
   bug in. Rewriting it to corrected intent (-> reclaim) with a STRONGER postcondition
   (our pid now holds a valid lock) is R9-correct, not a weakened assertion -- prove
   it by running the new test against the pre-fix engine (must go RED).
3. When hardening a lock-reclaim, the open->write empty-read window is the subtle
   race: distinguish "empty (mid-creation, live)" from "non-empty-garbage (corrupt)".
