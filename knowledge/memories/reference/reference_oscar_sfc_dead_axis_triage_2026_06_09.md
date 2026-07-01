---
name: reference_oscar_sfc_dead_axis_triage_2026_06_09
description: "SFC dead-axis triage (15-agent adversarial workflow) classified the 7 inert axes; FIX-2 (controller_features) SHIPPED; remaining fixes + a CRITICAL coolant-ceiling correction to the workflow's flawed FIX-0 spec"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.700Z
aliases: reference_oscar_sfc_dead_axis_triage_2026_06_09
---


# SFC dead-axis triage + FIX-2 shipped (U-OSC-DEAD-AXIS-TRIAGE / U-OSC-CONTROLLER-FEATURES, slot:oscar, 2026-06-09)

The all-axis sweep ([[reference_oscar_sfc_all_axis_sweep_2026_06_09]]) found axes inert on the
headline. A 15-agent adversarial Workflow (7 source-tracers + 7 physics-reviewers + 1 synthesis)
classified each of the (then 7) inert axes against the live orchestrator source. After the
tool-life enhancement credited holder_runout/axial_depth, 6-7 remained; here is the verified verdict.

## Classifications (physics-reviewer-verified, file:line cited in the workflow output)
- **controller_features** -- WIRING_GAP (P1, FIX_SAFE=yes). `controller_smoothing_factor` (HSM/AICC/
  smoothing/EPC/look-ahead, capped 1.8) reached the headline ONLY in aggressive_rush; prism_optimized
  + cost_batch dropped it. **SHIPPED FIX-2** (commit a2ec922ca2): apply to feed (mrr derives, once) in
  prism_optimized; fz/vc/rpm canonical. controller_features INERT->LIVE 57.4%; 3-of-3 PASS incl
  physics-reviewer. cost_batch keeps the drop by-design.
- **spindle_thru** (through_spindle_coolant) -- WIRING_GAP (P1). Inert for milling (only a drilling-
  gated advisory card). Fix = fold TSC into coolant_effectiveness, MRR-only. **NEEDS the clamp below.**
- **tool_holder_type** -- WIRING_GAP partial (P1). Per-type TIR default IS wired (HOLDER_RUNOUT_TIR_UM
  shrink_fit=3..mill_chuck=15um) but the 0-80% runout LIFE reduction is dropped from headline life AND
  4 downstream consumers (cost/part, three-zone wear, MonteCarlo, headline). Fix = single-source derate
  of `toolLife` itself (UltimateSpeedFeedEngine `toolLife = Math.min(taylor.T_min, wearLifeCap,
  thermalLifeCap)`) covering ALL 5 consumers -- NOT the tracer's headline-only patch (creates
  incoherence). Verify runout-block ordering vs the cost-per-part site (may need reorder).
- **radial_pct** -- OPTIMIZER_INTERNALIZED (feed/mrr, by-design: prism_optimized picks ae from
  alternatives.balanced) + WIRING_GAP (tool_life ae-inert in ALL 3 modes, P1). Deferred unit: a duty-
  cycle (pi/phi_s) correction on wear/thermal CAPS only -- REQUIRES a `Math.min((pi/phi_s), CEIL~2-3)`
  clamp (diverges as ae->0). Separate physics-reviewer pass.
- **target_ra** -- CAP_NOT_BINDING (P2, NOT a bug). The finish-Ra cap is correctly wired into all 3
  modes + binds when target Ra is finer than category fz; it just no-ops across the 0.4-3.2um sweep at
  typical nose radii. Fix = WIDEN THE SWEEP (finer Ra + aggressive strategy + corner_radius_mm), not
  code. Do NOT add target_ra->vc (cusp Ra is feed-direction, speed-independent -- physically wrong).
- **machine_accuracy** -- BY_DESIGN_INERT (P3). Positioning accuracy = geometric error-budget,
  orthogonal to chip-formation; MUST NOT move speed/feed. Document only.
- **controller_brand** -- BY_DESIGN_INERT (P3). Capability is per-option-license not per-vendor;
  correctly keyed on feature flags. Document only.

## CRITICAL CORRECTION to the workflow's FIX-0 (caught by reading the real source -- R12/oscar-soul)
The synthesis recommended `COOLANT_EFFECTIVENESS_MAX = 1.08`. **THAT IS WRONG and would REGRESS.**
The actual `COOLANT_EFFECTIVENESS` table (SpeedFeedNineAxisOrchestratorEngine.ts:396-404) already
contains `cryogenic: 1.40` and `through_tool: 1.25`. Clamping to 1.08 would crush those legitimate
values. The clamp ceiling MUST be >= 1.40 (e.g. 1.45) to bound future stacking WITHOUT regressing the
base table. The workflow agents reasoned from stale line numbers + the "penalties are <1.0" assumption
and never saw the base table. LESSON: always read the real source before implementing a workflow's
proposed constant -- the 15-agent physics review still missed this because none re-read the table.

Also for **FIX-1 (TSC)**: a `through_tool` coolant TYPE (1.25) already implies thru-tool delivery, so
adding a TSC spindle-flag bonus on top of `through_tool` type would DOUBLE-COUNT. FIX-1 must gate the
bonus (only when type != through_tool, or treat TSC as enabling through_tool). Needs a product/physics
decision -- not a clean blind implement.

## Status / next units (dependency order)
1. DONE: FIX-2 controller_features (a2ec922ca2).
2. FIX-0+FIX-1: coolant clamp (ceiling >=1.40 NOT 1.08) + TSC wiring (resolve through_tool double-count). Physics-reviewer.
3. FIX-3: single-source holder-type/runout toolLife derate across 5 consumers. Physics-reviewer + ordering check.
4. radial_pct duty-cycle tool-life correction (deferred, needs the (pi/phi_s) clamp). Physics-reviewer.
5. target_ra: widen the all-axis sweep to exercise the bind path (test-coverage, not code).
6. Document machine_accuracy + controller_brand as by-design in the sweep + a brief note.
Plus the independent U-OSC-FZ-FORCE-VALIDATE ([[reference_oscar_sfc_per_vendor_compare_2026_06_09]]).

Related: [[reference_oscar_sfc_all_axis_sweep_2026_06_09]] · [[reference_oscar_sfc_per_vendor_compare_2026_06_09]].
