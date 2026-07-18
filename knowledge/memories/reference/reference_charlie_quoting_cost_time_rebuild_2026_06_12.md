---
name: reference_charlie_quoting_cost_time_rebuild_2026_06_12
description: "Charlie quoting cost/time engine rebuild — 5 units shipped (time-bugs, canned cycles, gcode->quote wire, rate-wire) + closed-loop re-run validation (2026-06-12)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.511Z
aliases: reference_charlie_quoting_cost_time_rebuild_2026_06_12
---


# Quoting cost/time engine rebuild + closed-loop re-run (2026-06-12, slot:charlie)

Operator: "check the engines/algorithms/formulas... an engine to calculate times solely off G+M code and the machine... systems variable to each shop... build and complete all tasks /yolo-mode, re run full closed loop training with new build and data." Audit: `state/shared/specs/QUOTING-COST-TIME-AUDIT-2026-06-12.md` (4-arm ultracode). Headline: don't build a G-code time engine — `CycleTimeEstimatorEngine` (1325 lines, S-curve) already IS one; the work is HARDEN + WIRE + FEED-REAL-DATA.

## Shipped (6/9 tasks, each 2-reviewer per-file PASS, all on cad-fusion-live-ms0)
1. **U-QP-CYCLETIME-JM-PROFILES** (`2e13862762`) — 3 JM machine profiles (hurco_vm30i/vmx24, okuma_m460v) + "hurco" ControllerType into `CycleTimeEstimatorEngine.MACHINE_PROFILES`. 5 tests.
2. **U-QP-TIME-BUGS** (`5cc301d9a5`) — fixed 2 bugs (G7): `CycleTimeAccuracyEngine.accelTimePenalty` erroneous /1000 (~25-31x accel underestimate); `GCodeTimeEstimatorEngine` G02/G03 charged the CHORD not true arc length (LIVE in print-to-quote PipelineSummary). Added IJK plane-aware (G17/18/19) + helical + R-form arc length w/ Math.max(chord,...) clamp. 12 fail-on-revert tests.
3. **U-QP-CANNED-CYCLES** (`2476092fe5`) — G73+G81-G89 drilling/boring/tapping in `CycleTimeEstimatorEngine.parseGCode` via `emitCannedDrill` (rapid XY -> rapid to R -> FEED to depth w/ peck overhead -> dwell -> retract; tap/bore-feed-out retract at feed). G74/G76 excluded (lathe-polysemous). 9 tests.
4. **U-QP-GCODE-TIME-WIRE** (`4dee4b13bb`) — THE KEYSTONE. `prism_quoting:gcode_cycle_time` action + InstantQuoteEngine `gcode_program` input -> cycle-time priority gcode_precise > MRR > parametric. Unblocks the 134K JM CNC programs as a deterministic TIME-data source. 9 tests incl. enum-gate + E2E.
5. **U-QP-RATE-WIRE** (`51110d8c66`) — QuoteEstimatorEngine inline rates ($85/$55/$75) -> ShopConfigurationEngine via dependency injection + machine-type->shop-type taxonomy bridge (cnc_mill_3axis->VMC etc.). InstantQuote now quotes JM VMC-01 $80 (real) not $85. Inline table = documented fallback for non-shop machines. 6 tests, soul-compliant (no hardcoded $/hr).
9. **RE-RUN validation** — `quoting-pipeline-verify` 434/434 PASS; train-cycle dry-run MAPE 71.1% / 47,905 records (synthetic_revenue_dominant, unchanged); OODA on 10 real DocuStrata pairs PRE MAPE=45.17% bias=-39.65% ROLLED_BACK (CoV-unsafe tiny sample, correct). Closeout: `state/shared/closeout/QUOTING-CLOSED-LOOP-JM-CORPUS-2026-06-12T18-49-03*.json`.

## The honest data-axis insight (answers "train from other sources?")
The 10-pair DocuStrata OODA loop measures PRICE accuracy (capped at 10 pairs; hotel actuals=0 — data-ceiling-bound, see [[reference_charlie_closed_loop_test_2026_06_12]]). Its prediction path (FMV/DocuStrata priors) does NOT traverse the new gcode/rate code, so its numbers are UNCHANGED (expected). The new capability serves a DIFFERENT axis: TIME accuracy via the 134,485 lathe + 533 mill CNC programs through the now-hardened+wired CycleTimeEstimatorEngine. That breaks the pair ceiling for the TIME half of cost = rate x time.

## SHIPPED #5 (commit `492197ab37`) — U-QP-DOCUSTRATA-MATERIAL (units-correct rebuild)
The naive "DocuStrata $/lb -> MarketMaterialPricing" framing was UNITS-WRONG: `DocuStrataMaterialPriorEngine.getMaterialSpendBracket` returns per-JOB USD, not $/kg. The units-correct source is the **VendorCostIndexEngine $/in3 AP-ledger basis** (density-free, block-form, 10 tool-steel grades). InstantQuoteEngine "Step 3d" computes `override = usd_per_in3 x stockVolIn3` (stock_dims/16387.064), gated on **confidence==="high"** to exclude the **D2 outlier ($251/in3, block_n=2, ~40x)** + all low-n/none grades. QuoteEstimateInput gains `material_cost_per_part_override` (raw=override x qty, scrap_pct=0). 8 tests, 2-reviewer PASS (P1 D2-outlier FIXED via confidence gate). FOLLOW-UP for **juliett**: D2/M2/52100 AP-ledger re-normalization (low-n).

## SHIPPED #6 (commit `ba9631271f`) — U-QP-ADAPTIVE-PERSIST (G5)
`AdaptiveShopRateEngine` now persists posteriors + outcome ledger to schema-versioned JSON (`state/shared/quoting/adaptive-shop-rate-state.json`), lazy-load + auto-persist on mutation, atomic (tmp+rename), fail-soft both ways. InstantQuoteEngine reads `getPrior(machine.id).mu` when `n_observations>0`. **HONEST: the read is DORMANT** — it keys on ShopConfig ids (`VMC-01`) but `adaptShopRate` bootstraps from MachineRateDatabase ids (`vmc_tier2`); activation needs id-namespace reconciliation (**hotel follow-up**). Existing hotel test made hermetic (auto-persist write). 29 tests, 2-reviewer PASS (P1s fixed: persist-failure test + tmp-orphan cleanup).

## #8 SCOPE CORRECTED (R8/R12 finding — NOT a clean cleanup)
**U-QP-DEPRECATED-UNWIRE** is mis-framed by the audit. Reading the consumers revealed `emp_calc_cost_quick` (CostEstimatorEngine, shopDispatcher:1435) is **LIVE-consumed** by the employee-portal frontend (`web/src/api/employeePortal.ts:77`, contract `{ok, estimate:{perPart,total,breakdown}}`) + `shopDispatcher.empPortal-integration.test.ts:99`. `emp_calc_cost_breakdown` (CostEstimationEngine, :1428) appears orphan (no mcp-server consumer found). So "unwire" = a real **migration** (route `emp_calc_cost_quick` -> QuoteEstimator/JobCostingEngine preserving the `{perPart,total,breakdown}` shape + update the frontend api + the integration test), NOT a deletion. Per [[feedback_never_delete_only_disable]] the engines stay on disk. **Deferred** (not rushed at exhausted budget — would risk breaking the employee portal). Next iteration: (1) confirm `emp_calc_cost_breakdown` orphan-status incl. frontend, route to JobCostingEngine; (2) migrate `emp_calc_cost_quick` to the real engine with shape-preservation + coordinate the frontend + test. 8/9 units shipped; #8 is the honest open item.

## Side finding (NOT charlie): [[reference_erp_taylorc_nullaccess_2026_06_12]] — pre-existing ERPIntegrationEngine taylor_C null-access, for hotel.
