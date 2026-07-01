# HERMES-C1-EXEC/U-NEXT-WAVE-ASSIGNMENTS — [MAIN-FORCE] [HERMES-C1-EXEC]/U-NEXT-WAVE-ASSIGNMENTS (slot:bravo): the executable-wave bridge -- ZuluWaveSchedulerEngine.nextWaveAssignments(req, completedIds) returns the next wave as dispatchable SLOT ASSIGNMENTS (not just ids), the missing piece that makes wave_2+ EXECUTABLE (plan() only ever assigned wave-1 leaves). Extracted shared assignSubtasksToSlots policy (DRY, behavior-preserving -- 27 planner tests green). Wired sessionDispatcher next_wave_execute + wave_exec_render. 71/71 tests (12 new: multi-wave progression, done, overflow-not-dropped, unrouted, domain-match, cycle-stall, throw, incremental==allWaves). No new tsc. The pure planning core the autonomous runtime driver loops on (the agent-SPAWNING loop is governance-gated per soul, separate).

**Commit:** `1182b1c97838` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:26:49-05:00
**Tags:** hermes-c1-exec, u-next-wave-assignments, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-C1-EXEC]/U-NEXT-WAVE-ASSIGNMENTS (slot:bravo): the executable-wave bridge -- ZuluWaveSchedulerEngine.nextWaveAssignments(req, completedIds) returns the next wave as dispatchable SLOT ASSIGNMENTS (not just ids), the missing piece that makes wave_2+ EXECUTABLE (plan() only ever assigned wave-1 leaves). Extracted shared assignSubtasksToSlots policy (DRY, behavior-preserving -- 27 planner tests green). Wired sessionDispatcher next_wave_execute + wave_exec_render. 71/71 tests (12 new: multi-wave progression, done, overflow-not-dropped, unrouted, domain-match, cycle-stall, throw, incremental==allWaves). No new tsc. The pure planning core the autonomous runtime driver loops on (the agent-SPAWNING loop is governance-gated per soul, separate).

## Body
```
[MAIN-FORCE] [HERMES-C1-EXEC]/U-NEXT-WAVE-ASSIGNMENTS (slot:bravo): the executable-wave bridge -- ZuluWaveSchedulerEngine.nextWaveAssignments(req, completedIds) returns the next wave as dispatchable SLOT ASSIGNMENTS (not just ids), the missing piece that makes wave_2+ EXECUTABLE (plan() only ever assigned wave-1 leaves). Extracted shared assignSubtasksToSlots policy (DRY, behavior-preserving -- 27 planner tests green). Wired sessionDispatcher next_wave_execute + wave_exec_render. 71/71 tests (12 new: multi-wave progression, done, overflow-not-dropped, unrouted, domain-match, cycle-stall, throw, incremental==allWaves). No new tsc. The pure planning core the autonomous runtime driver loops on (the agent-SPAWNING loop is governance-gated per soul, separate).
```

## Files touched (5)
- mcp-server/src/__tests__/ZuluWaveSchedulerEngine.test.ts    | 127 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts |  96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------------------------------
- mcp-server/src/engines/ZuluWaveSchedulerEngine.ts           |  80 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts       |  16 +++++++++++++++
- 4 files changed, 283 insertions(+), 36 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1182b1c97838`
- Milestone envelope: `mcp-server/data/milestones/HERMES-C1-EXEC.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._