# OBSIDIAN-HERMES-CONTEXT-ACCEL/U-LEARN-REVIVE01-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-LEARN-REVIVE01-FIX (slot:papa): scrutiny reviewer-C blocker — side-channel write must not mislabel a real revival as exit-2

**Commit:** `0c2250f12f9e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T10:56:50-05:00
**Tags:** obsidian-hermes-context-accel, u-learn-revive01-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-LEARN-REVIVE01-FIX (slot:papa): scrutiny reviewer-C blocker — side-channel write must not mislabel a real revival as exit-2

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-LEARN-REVIVE01-FIX (slot:papa): scrutiny reviewer-C blocker — side-channel write must not mislabel a real revival as exit-2

3-of-3 scrutiny arm C caught: appendTelemetry/appendChatBus guarded only mkdirSync, not appendFileSync. They run AFTER a revival is finalized 'revived'; an appendFileSync EACCES/ENOSPC threw out of runOnce -> CLI mapped any throw to exit(2) 'measurement failure' -> a revival that physically succeeded was reported as a total failure, and the telemetry row the SessionStart hook reads was never written (self-heal silently dropped). R12 inversion: the exit code lied about the outcome.

Fix: both appends are now FULLY best-effort (mkdir+rotate+append in one try/catch, swallow-with-stderr-warn, never throw, return bool). Worst case = a lost telemetry row, never a lied-about exit code. +regression test injecting a throwing appendFileSync on a path where the revival succeeds, asserting outcome stays revived/exit-0 (fails if the guard is removed). 19/19 actuator tests green.

Follow-up to 1a5c7f8 (base actuator). Companion wiki [[side-channel-write-must-not-alter-exit-code]].
```

## Files touched (3)
- scripts/obsidian-learning-revival.mjs      | 48 +++++++++++++++++++++++++++++++++++++++---------
- scripts/obsidian-learning-revival.test.mjs | 24 ++++++++++++++++++++++++
- 2 files changed, 63 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0c2250f12f9e`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-HERMES-CONTEXT-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._