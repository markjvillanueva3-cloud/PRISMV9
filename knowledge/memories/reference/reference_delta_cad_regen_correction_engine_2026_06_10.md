---
name: reference-delta-cad-regen-correction-engine-2026-06-10
description: "CADRegenCorrectionEngine SHIPPED (slot:delta, 2026-06-10) -- the Stage-6 CORRECT->CONVERGE controller that was THE one gap in the closed-loop CAD replication methodology. Pure deterministic controller (R5, no kernel calls): reads a compare() ComparisonResult delta vector + CorrectionParam[] -> emits corrected params + a verdict (converged|iterate|plateau|max-iterations|no-correctable-params). Methods proportional/secant/coordinate-descent/auto; trust-region + hard min/max clamp; plateau patience. runClosedLoop() closes GENERATE->COMPARE->CORRECT with an INJECTED evaluate() (Fusion-backed generate+compare) -- in-process only (a fn cannot cross MCP JSON), so the MCP surface (cad_regen_correct/apply_template/params_from_template/stats on cadDispatcher) exposes only the pure steps. applyToTemplate() writes corrections back into opTemplate via opIndex+argKey. 27 tests, 0 tsc errors, 2-of-2 scrutiny. The closed loop now RUNS end-to-end -- goal #2 (complete closed-loop training) substrate is complete."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.542Z
aliases: reference_delta_cad_regen_correction_engine_2026_06_10
---


# CADRegenCorrectionEngine -- Stage-6 CORRECT->CONVERGE shipped (2026-06-10, slot:delta)

The closed-loop replication methodology ([[reference_delta_closed_loop_replication_methodology_2026_06_10]]) was ~85% built with ONE real gap: nothing read a `compare()` delta and re-drove GENERATE. That gap is now closed.

## What shipped
- `mcp-server/src/engines/CADRegenCorrectionEngine.ts` -- pure deterministic controller. `correct(ComparisonResult + CorrectionParam[]) -> corrected params + verdict`. `runClosedLoop({initialParams, evaluate, config, onIteration})` closes the full loop with an INJECTED `evaluate` (the live Fusion generate+compare). `applyToTemplate(opTemplate, corrections, lineage)` writes corrected values back via `opIndex+argKey`. `paramsFromTemplate(template, metric->params map)` builds lineage-carrying params from a reverse template.
- Wired `cad_regen_correct` / `cad_regen_apply_template` / `cad_regen_params_from_template` / `cad_regen_stats` into `cadDispatcher.ts` + Zod schemas in `cadActionSchemas.ts`.
- `mcp-server/src/__tests__/engines/CADRegenCorrectionEngine.test.ts` -- 27 tests, all green; 0 tsc errors workspace-wide.

## KEY ARCHITECTURE DECISION (reusable pattern)
`runClosedLoop` is **in-process only** -- its injected `evaluate()` function cannot cross the MCP JSON boundary, so the MCP/dispatcher surface exposes ONLY the pure stateless steps (`correct`, `applyToTemplate`, `paramsFromTemplate`, `stats`). The loop orchestration lives in the live driver. This is the correct R5 split: the deterministic transform is wired + testable; the orchestration injects the kernel-backed reader. Mirrors the proven "pure-core + injected-readers" pattern -- the engine is fully unit-testable end-to-end with a mock evaluator that actually converges (5 such E2E tests).

## BUG CAUGHT BY PER-FILE SCRUTINY (R12 -- arm-A FAIL)
The 2-arm per-file gate caught a real off-by-one: `runClosedLoop` PRE-incremented the `stagnant` (consecutive-non-progress) counter before calling `correct()`, and `correct()` incremented it AGAIN -> PLATEAU tripped one iteration early (effective `plateauPatience - 1`), abandoning still-converging replications prematurely. The plateau E2E test only asserted `iterations < 5`, which MASKED it. Fix: the loop passes the PRIOR stagnant count and advances the counter AFTER `correct()` (which owns the current-iteration +1); test now PINS `iterations === 3` (baseline iter + exactly 2 measured non-progress iters for patience 2). Arm-B (PASS) flagged the missing Zod schemas (fail-open validation) -> added 4. Lesson: a soft `<N` assertion on a convergence-loop iteration count hides off-by-one state-machine bugs -- pin the exact count.

## Honest status vs the /goal
Goal #2 ("complete all closed loop training") substrate is COMPLETE -- the loop runs end-to-end (INGEST->PARAMETERIZE->GENERATE->COMPARE->CORRECT->CONVERGE), proven by deterministic-evaluator E2E convergence (27 tests).

## LIVE run executed against the real blisk.stp (2026-06-10, same session)
Drove `runClosedLoop` with a REAL Fusion-backed `evaluate()` (live `127.0.0.1:18361`: /new doc -> /execute build a parametric body -> exportManager STEP -> `cadGeometryComparisonEngine.compare` vs `H:/PRISM/resources/CAD FILES/blisk.stp`). RESULT: the **engine mechanics work LIVE end-to-end** -- it generated real Fusion geometry each iteration, exported (INCH STEP -- exercised the U-CAD-COMPARE-UNIT-NORMALIZE fix on live data), compared via the real comparator, computed **secant** corrections, applied them, re-generated, and terminated HONESTLY (`no-correctable-params` when the radius param hit its bound; Volume/Topology/Feature correctly flagged uncorrectable = the proprietary-surface ceiling). CLEAN LIVE NUMERIC CONVERGENCE then ACHIEVED (2nd driver, same session): driving the in-kernel bounding box (bypassing the STEP export/extract path), `runClosedLoop` converged the Bounding Box metric to **0.000%** in **3 iterations** against the real `blisk.stp` envelope -- radius 400mm (33.71%) -> proportional 570.43mm (5.47%) -> secant 603.45mm (0.00%) -> status=converged, final radius 603.450mm == exact analytic target refX/2. The FIRST driver's failure was NOT the engine: the in-kernel geometry was correct all along (800x800x310 at R=400); the bad read came from the STEP export/extract/unit path + a `setSymmetricExtent` half-vs-full (passed hCm with isFullLength=True -> correct 310mm Z). LESSON: for the convergence variable, measure the IN-KERNEL bbox; the export/extract/unit path is a separate (already-fixed via U-CAD-COMPARE-UNIT-NORMALIZE) concern -- conflating them produced a degenerate read. NET: live closed-loop numeric convergence PROVEN exact (0.000%) on the real turbine blisk envelope, complementing the headless exact convergence [[reference_delta_blisk_closed_loop_converged_2026_06_10]]. Honest scope: converges the parametrically-correctable ENVELOPE (bbox) to 0%; the 48-blade NURBS airfoil topology remains the proprietary-surface ceiling (Jaccard ~0.795), reported as `no-correctable-params`, never claimed byte-100%.

See [[reference_delta_closed_loop_replication_methodology_2026_06_10]] · [[reference_delta_live_fusion_nurbs_emit_proven_2026_06_10]] · [[reference_delta_cad_compare_unit_normalize_2026_06_10]].
