# OSCAR-SFC-9AXIS-MS0/U-OSC-HOLDER-RUNOUT-DEDUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-HOLDER-RUNOUT-DEDUP (slot:oscar): fix runout life double-count introduced by U-OSC-RUNOUT-LIFE-DERATE

**Commit:** `73b97ef25fca` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:26:54-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-holder-runout-dedup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-HOLDER-RUNOUT-DEDUP (slot:oscar): fix runout life double-count introduced by U-OSC-RUNOUT-LIFE-DERATE

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-HOLDER-RUNOUT-DEDUP (slot:oscar): fix runout life double-count introduced by U-OSC-RUNOUT-LIFE-DERATE

REGRESSION from a8f72823cb (same session): SpeedFeedNineAxisOrchestratorEngine had a
compensating workaround (U-OSC-HOLDER-RUNOUT-LIFE) that read sfc.runout_impact.life_reduction_pct
and did `life *= keep` -- because the core engine USED to only warn, not derate. Once
U-OSC-RUNOUT-LIFE-DERATE made UltimateSpeedFeedEngine fold the derate into tool_life.life_minutes,
the orchestrator's `life` (= sfc.tool_life.life_minutes, already derated) got derated AGAIN ->
tool_life_min collapsed to raw * keep^2 (proven: engineFactor 0.884 single vs orchFactor 0.795 ~
0.884^2). The cost fallback path (line 1103, when sfc returns no cost) double-counted too; the
primary cost path (sfcCostPerPart) was already single-derated.

FIX: remove the orchestrator's obsolete `life *= keep` -- the engine now owns the single runout
model (R8: do NOT fork a second model). Keep the operator advisory warning (reworded: the derate
is already folded in by the SFC engine). tool_holder.type stays LIVE because translateToUltimate()
maps type -> HOLDER_RUNOUT_TIR_UM -> holder_runout_mm -> the engine derate.

Test (TDD, red->green): sfc-nine-axis-runout-no-double-count.test.ts -- (1) tool_holder.type moves
tool_life_min (er_collet 12um < hsk_a63 3um life: axis LIVE); (2) orchestrator runout factor matches
the engine's SINGLE-derate factor, NOT its square (the double-count guard, FAILED pre-fix at 0.795
vs 0.884). Orchestrator's own 59-test suite + 4 ultimate suites: 0 new regressions (3 pre-existing
failures unchanged: kc1_1 S=2800 stale test, rev/min label, cryogenic thermal-risk).

LESSON: when a fix moves a physics derate INTO an engine, audit every consumer for a compensating
workaround that now double-counts. FIX-3's isolated-engine scrutiny could not see this consumer.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-nine-axis-runout-no-double-count.test.ts | 69 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts         | 31 ++++++++++++++-----------------
- 2 files changed, 83 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- LESSON: when a fix moves a physics derate INTO an engine, audit every consumer for a compensating

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73b97ef25fca`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._