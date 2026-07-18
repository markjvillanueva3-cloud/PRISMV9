# CAD-COMPLETE-MS0/U-CADC-LP01 — [MAIN] [CAD-COMPLETE-MS0]/U-CADC-LP01 (slot:delta): fix durable channel — 3 enum-mismatch ok:false rejections (3-of-3 scrutiny P0)

**Commit:** `a6bc393f375c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T18:20:30-05:00
**Tags:** cad-complete-ms0, u-cadc-lp01, auto-distilled

## Subject
[MAIN] [CAD-COMPLETE-MS0]/U-CADC-LP01 (slot:delta): fix durable channel — 3 enum-mismatch ok:false rejections (3-of-3 scrutiny P0)

## Body
```
[MAIN] [CAD-COMPLETE-MS0]/U-CADC-LP01 (slot:delta): fix durable channel — 3 enum-mismatch ok:false rejections (3-of-3 scrutiny P0)

3-of-3 scrutiny arm C found U-CADC-LP01's durable channel was dead in production. CADExecutionOutcomeBusEngine.publish() forwards every outcome to outcomeCaptureBusEngine.record(), which OutcomeEventSchema.safeParse() rejected — 3 literal values in the LP01 record() call are not in the actual schema enums, so record() returned ok:false for every event. The sibling mocked test never caught it (stub record() returns ok:true unconditionally).

Bugs (arm C spotted only the first): (1) kind 'cad_execution_outcome' absent from OutcomeKind — added as a base kind, not v1.1.0-gated. (2) source 'engine' not in OutcomeSource {operator,controller,cmm,sensor,system,import,erp,simulation,other} — fixed to 'system'. (3) severity 'warning' not in OutcomeSeverity {info,low,medium,high,critical} — failure branch fixed to 'medium'.

Root cause: R8 (call written against an assumed contract) + R9 (mocked test verified the mock, not the contract); RecordOutcomeInput source/severity are loosely typed so only runtime safeParse enforced the enums. New CADExecutionOutcomeBusEngine.durable.test.ts (3 tests, no mocks) uses the real OutcomeCaptureBusEngine + real OutcomeKind enum as a regression guard. Tests: 25/25 engine + 39/39 outcomeEventSchema.v11 PASS.
```

## Files touched (4)
- .../CADExecutionOutcomeBusEngine.durable.test.ts   | 107 +++++++++++++++++++++
- .../src/engines/CADExecutionOutcomeBusEngine.ts    |  10 +-
- mcp-server/src/schemas/outcomeEventSchema.ts       |   6 ++
- 3 files changed, 121 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a6bc393f375c`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._