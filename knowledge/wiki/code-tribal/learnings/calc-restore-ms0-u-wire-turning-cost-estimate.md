# CALC-RESTORE-MS0/U-WIRE-TURNING-COST-ESTIMATE — [MAIN-FORCE] [CALC-RESTORE-MS0]/U-WIRE-TURNING-COST-ESTIMATE (slot:india): wire turning_cost_estimate into prism_turning + land orphaned test

**Commit:** `d55f785b77fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:46:08-05:00
**Tags:** calc-restore-ms0, u-wire-turning-cost-estimate, auto-distilled

## Subject
[MAIN-FORCE] [CALC-RESTORE-MS0]/U-WIRE-TURNING-COST-ESTIMATE (slot:india): wire turning_cost_estimate into prism_turning + land orphaned test

## Body
```
[MAIN-FORCE] [CALC-RESTORE-MS0]/U-WIRE-TURNING-COST-ESTIMATE (slot:india): wire turning_cost_estimate into prism_turning + land orphaned test

5th orphaned-wire closure. CALC-RESTORE-MS0 Phase 1A test (turningCostEstimate.dispatcher.test.ts,
22 cases) was UNTRACKED -- written but the dispatcher impl never landed (22/22 failed).

WIRE: prism_turning:turning_cost_estimate adapts turning geometry/time params to a
JobCostingEngine.JobSpec and returns its 10-category CostBreakdown. The adaptation (R8 --
derived from the engine's actual cost model, not assumed):
- UNITS-FIRST: JobSpec.material dims are MM + density kg/m3 (engine converts to in3/lb internally);
  pricePerLb = material_price_per_kg / 2.20462 (lb/kg); cycle_time_sec / 60 -> minutes.
- Round bar modelled as the prism whose square cross-section equals the cylinder area
  (side = OD*sqrt(pi/4)) -> material cost tracks true cylinder volume AND stays exactly
  proportional to OD^2. kerfAllowance:0 keeps the OD^2 proportionality exact.
- toolChanges:0 keeps machining.cost exactly proportional to cycle time (the engine's per-part
  tool-change minutes would otherwise skew the cycle-time ratio).
- secondary_ops_cost_usd -> finishingOperations[{costPerPart}] -> finishing = qty * cpp (exact +$/batch).
- CostBreakdown omits batch_size -> echoed back; and perPart re-derived at full precision off the
  engine's authoritative total (the engine's round2(total/qty) drifts perPart*qty from total at
  large batch) so the documented invariant total === perPart * batch_size holds at ANY batch.
- + strict schema: 3 required positive fields (bar_od_mm / part_length_mm / cycle_time_sec),
  optionals fall back to defaults; non-positive/missing -> rejected (failure-mode tests).

Verified every invariant: material ~OD^2 / ~density / ~price, machining ~cycle & ~rate,
setup-amortized perPart, secondary->finishing +$400, spanning materials/batches, defaults path,
adversarial 5000mm-bar bounded+finite. 22/22 vitest green, tsc --noEmit clean.
Closes the meatiest item in [[reference_orphaned_dispatcher_wire_backlog_2026_06_22]].
```

## Files touched (4)
- mcp-server/src/__tests__/turningCostEstimate.dispatcher.test.ts | 237 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts                  |  15 +++
- mcp-server/src/tools/dispatchers/turningDispatcher.ts           |  53 +++++++++++
- 3 files changed, 305 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d55f785b77fd`
- Milestone envelope: `mcp-server/data/milestones/CALC-RESTORE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._