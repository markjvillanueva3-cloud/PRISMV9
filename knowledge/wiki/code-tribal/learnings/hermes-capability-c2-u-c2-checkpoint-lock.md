# HERMES-CAPABILITY-C2/U-C2-CHECKPOINT-LOCK — [MAIN-FORCE] [HERMES-CAPABILITY-C2]/U-C2-CHECKPOINT-LOCK (slot:bravo): close the lost-update gap that wave_loop_step (C2's first producer) just made reachable -- a cross-process lockfile on the continuity store RMW

**Commit:** `b7272a140a23` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:30:03-05:00
**Tags:** hermes-capability-c2, u-c2-checkpoint-lock, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CAPABILITY-C2]/U-C2-CHECKPOINT-LOCK (slot:bravo): close the lost-update gap that wave_loop_step (C2's first producer) just made reachable -- a cross-process lockfile on the continuity store RMW

## Body
```
[MAIN-FORCE] [HERMES-CAPABILITY-C2]/U-C2-CHECKPOINT-LOCK (slot:bravo): close the lost-update gap that wave_loop_step (C2's first producer) just made reachable -- a cross-process lockfile on the continuity store RMW

Reviewer-C (3-of-3 scrutiny of U-C2-PRODUCER-WAVE-LOOP, f4c075a252) surfaced a real P2:
ZuluTaskContinuityEngine.checkpoint/clear did a non-atomic read-modify-write of the WHOLE
records map with NO lock -- so two slots checkpointing DIFFERENT unit ids could lost-update
each other (A reads {X}, B reads {X}, A writes {X,A}, B writes {X,B} -> A dropped). This was
latent while the store had no producer; wave_loop_step is the first producer, so the multi-slot
race is now reachable. The atomic tmp+rename prevented torn files but NOT lost updates. The
header docstring even claimed it "mirrors slot-task-claim.mjs discipline" (which IS lockfile-
guarded) -- a doc/impl mismatch (R12). This unit makes that claim TRUE.

Fix: a sync O_EXCL lockfile (`<store>.lock`) around BOTH writers' critical sections, with a
stale/dead-PID reaper:
- acquireStoreLock(): openSync(lockPath,"wx") retry loop (50 * 20ms ~= 1s budget). On EEXIST,
  reap iff the holder is stale-by-age (>30s), a dead SAME-HOST pid (process.kill(pid,0)), or
  unreadable -- else sleep+retry. A FOREIGN-host lock is reaped only by ts-age (never kill a
  live remote holder). Exhaustion THROWS ZuluStoreLockTimeoutError.
- checkpoint converts a lock timeout to ok:false (it has an error channel; the hot wave loop
  retries next tick); clear lets it THROW (boolean has no error channel -- fail-loud, same as
  its read-only throw). Read-only + atomic-write throws propagate unchanged.
- Readers (resume/list) stay LOCK-FREE: the atomic rename guarantees a complete store, never torn.
- Lock budget is ctor-injectable (__forTests lockCfg) so the held-lock tests time out in ms.

Tests: ZuluTaskContinuityEngine 33 (+7 lock: no-leftover-lock, stale-by-age reap, dead-PID
reap, held-live-lock -> ok:false + prior record UNCHANGED, clear-under-held-lock THROWS,
foreign-host-lock RESPECTED, RMW preserves other units' records). 100/100 across continuity +
wave_loop_step e2e + ZuluWaveSchedulerEngine (producer e2e still green through the singleton).
tsc clean on both changed files.

Known residual (P3, documented): release unlinks by path, so a holder that stalls LONGER than
the 30s stale threshold could have its lock reaped by a peer mid-op -- pathological given the
sub-ms critical section; a fd-fingerprint check would close it fully.
```

## Files touched (3)
- mcp-server/src/__tests__/ZuluTaskContinuityEngine.test.ts |  89 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ZuluTaskContinuityEngine.ts        | 206 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------------------
- 2 files changed, 256 insertions(+), 39 deletions(-)

## Lessons surfaced in commit body
- till green through the singleton).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b7272a140a23`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-C2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._