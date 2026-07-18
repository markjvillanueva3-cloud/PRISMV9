# PRISM-PART-TYPE-STACK/U-PILOT-4LAYER-WIRE-CLOSEOUT — [MAIN] [PRISM-PART-TYPE-STACK]/U-PILOT-4LAYER-WIRE-CLOSEOUT (slot:india iter17): close foxtrot iter19 half-ship — add 5 calcDispatcher case handlers for the PART-TYPE-STACK actions whose z.enum was declared in 5e53fe8cb0 but missed the dispatch block. Wires part_type_recognize→partTypeRecognizerEngine.recognize, adapt_mill_prismatic→millPrismaticAdapterEngine.adapt, adapt_lathe_shaft→latheShaftAdapterEngine.adapt, adapt_wire_edm_punch_die→wireEDMPunchDieAdapterEngine.adapt, part_variability_assert→partVariabilityRegressionHarnessEngine.assert. All 5 engines + test files exist; this is the missing wiring leg. Closes stop_on_unwired_assets regression gate blocking iter16 PSN-synergize commit.

**Commit:** `a5d7c15a8f4b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T02:30:28-05:00
**Tags:** prism-part-type-stack, u-pilot-4layer-wire-closeout, auto-distilled

## Subject
[MAIN] [PRISM-PART-TYPE-STACK]/U-PILOT-4LAYER-WIRE-CLOSEOUT (slot:india iter17): close foxtrot iter19 half-ship — add 5 calcDispatcher case handlers for the PART-TYPE-STACK actions whose z.enum was declared in 5e53fe8cb0 but missed the dispatch block. Wires part_type_recognize→partTypeRecognizerEngine.recognize, adapt_mill_prismatic→millPrismaticAdapterEngine.adapt, adapt_lathe_shaft→latheShaftAdapterEngine.adapt, adapt_wire_edm_punch_die→wireEDMPunchDieAdapterEngine.adapt, part_variability_assert→partVariabilityRegressionHarnessEngine.assert. All 5 engines + test files exist; this is the missing wiring leg. Closes stop_on_unwired_assets regression gate blocking iter16 PSN-synergize commit.

## Body
```
[MAIN] [PRISM-PART-TYPE-STACK]/U-PILOT-4LAYER-WIRE-CLOSEOUT (slot:india iter17): close foxtrot iter19 half-ship — add 5 calcDispatcher case handlers for the PART-TYPE-STACK actions whose z.enum was declared in 5e53fe8cb0 but missed the dispatch block. Wires part_type_recognize→partTypeRecognizerEngine.recognize, adapt_mill_prismatic→millPrismaticAdapterEngine.adapt, adapt_lathe_shaft→latheShaftAdapterEngine.adapt, adapt_wire_edm_punch_die→wireEDMPunchDieAdapterEngine.adapt, part_variability_assert→partVariabilityRegressionHarnessEngine.assert. All 5 engines + test files exist; this is the missing wiring leg. Closes stop_on_unwired_assets regression gate blocking iter16 PSN-synergize commit.
```

## Files touched (4)
- .claude/hooks/psn-leg-state-inject.mjs             | 202 +++++++++++++++++++++
- .claude/hooks/psn-leg-state-inject.test.mjs        | 168 +++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts |  28 +++
- 3 files changed, 398 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a5d7c15a8f4b`
- Milestone envelope: `mcp-server/data/milestones/PRISM-PART-TYPE-STACK.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._