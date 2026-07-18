# DISPATCHER-DUPCASE/U-SESSION-WORKFLOW-ADVANCE-UNSHADOW — [MAIN-FORCE] [DISPATCHER-DUPCASE]/U-SESSION-WORKFLOW-ADVANCE-UNSHADOW (slot:alpha): rename dead durable workflow_advance -> workflow_durable_advance (un-shadow U-HAGI01 DurableWorkflowEngine.advance; clears dup-case + dup-enum) + 6-test dispatcher round-trip

**Commit:** `cf7737f5f2b1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:37:02-05:00
**Tags:** dispatcher-dupcase, u-session-workflow-advance-unshadow, auto-distilled

## Subject
[MAIN-FORCE] [DISPATCHER-DUPCASE]/U-SESSION-WORKFLOW-ADVANCE-UNSHADOW (slot:alpha): rename dead durable workflow_advance -> workflow_durable_advance (un-shadow U-HAGI01 DurableWorkflowEngine.advance; clears dup-case + dup-enum) + 6-test dispatcher round-trip

## Body
```
[MAIN-FORCE] [DISPATCHER-DUPCASE]/U-SESSION-WORKFLOW-ADVANCE-UNSHADOW (slot:alpha): rename dead durable workflow_advance -> workflow_durable_advance (un-shadow U-HAGI01 DurableWorkflowEngine.advance; clears dup-case + dup-enum) + 6-test dispatcher round-trip
```

## Files touched (3)
- mcp-server/src/__tests__/sessionWorkflowAdvanceRouting.test.ts | 134 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts          |   9 ++--
- 2 files changed, 140 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cf7737f5f2b1`
- Milestone envelope: `mcp-server/data/milestones/DISPATCHER-DUPCASE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._