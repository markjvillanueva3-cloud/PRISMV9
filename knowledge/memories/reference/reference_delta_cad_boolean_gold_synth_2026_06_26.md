---
name: reference_delta_cad_boolean_gold_synth_2026_06_26
description: cad_boolean dispatcher action wired (compose GeometryEngine.boolean + BooleanKernelEngine) + gold-trainset gen-spec synthesizer; delta /goal tick
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.539Z
aliases: reference_delta_cad_boolean_gold_synth_2026_06_26
---


Delta CAD-completion /goal tick (slot:delta, 2026-06-26, 3 commits). Two assets shipped:

**1. cad_boolean dispatcher action (U-CAD-BOOLEAN-WIRE d5..f / U-CAD-BOOLEAN-TYPEFIX):** WIRED (not
rebuilt -- operator directive) the boolean cad-dispatcher action by COMPOSING existing engines.
`CADBooleanEngine` (mcp-server/src/engines/) is a thin composer: DELEGATES the result-volume estimate to
`GeometryEngine.boolean` (pure volume-arithmetic, ROUNDED: union=round(A+0.95B), subtract=round(max(0,A-B)),
intersect=round(0.5*min)) + emits the CadQuery op (.union/.cut/.intersect); the cadDispatcher `cad_boolean`
case pairs it with the REAL CSG kernel `BooleanKernelEngine` (cadquery-bridge, async) when live solid IDs
are supplied -- degrades gracefully (BooleanKernelEngine returns {success:false,errors} if the bridge is
absent, never throws). `uses_real_kernel` flags the path. 13/13 reference-value tests through apply();
2-arm scrutiny PASS (arm-A P1: declare real_kernel?:BooleanKernelResult via TYPE-ONLY import -> fixed).
NOTE: sketch-subtractive was ALREADY wired (cad_feature_subtract) -- only boolean was the gap.

**2. gold-trainset gen-spec synthesizer (U-CAD-GEN-GOLD-SYNTH):** `scripts/cad-gen-worklist-from-gold.mjs`
refeeds the DRAINED cad-gen worklist from the OCR gold trainset (594 JM prints). HONESTY (R12): gold
records carry only dimension VALUES (diameter/linear mm), NOT geometry -- so emit a spec ONLY when a
record's dim signature maps to a clear archetype (turned bushing w/ wall>=5%OD, cylinder, plate) using
the REAL gold dims; SKIP ambiguous dim-soups (348/594). Tightened guards reject degenerate near-zero-wall
bushings + OCR-junk >300mm dims. 246/594 classifiable; appended 50 -> worklist 108->158. 10/10 tests.
The reaper-immune 'PRISM CAD Gen Loop' scheduled task (state=Ready, 30m, cursor-resumable) drains them --
the correct mechanism, NOT a reaper-doomed session bg process (per the 721f695758 lesson + R14).

**LESSON (reused this tick):** "wire/compose existing, don't rebuild" -- when the operator says wire a
dispatcher action over existing engines, build a thin composer that DELEGATES (no duplicate math), and
flag which sub-engine owns which output. Reconcile: 6/20 CAD-completion units shipped, T1/T2/T3 still
PENDING (the deep ones gated on U-MERGE-SLOT-DELTA). Sibling: [[reference_delta_cad_gen_false_fail_learning_signal_2026_06_26]].
