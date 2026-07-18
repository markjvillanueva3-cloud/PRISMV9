---
name: reference_oscar_sfc_runout_life_derate_2026_06_09
description: "FIX-3 (U-OSC-RUNOUT-LIFE-DERATE): UltimateSpeedFeedEngine WARNED 'TIR reduces tool life ~X%' but headline tool_life + cost reported the UN-derated life. Single-source multiplicative derate + ordering-trap fix."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.712Z
aliases: reference_oscar_sfc_runout_life_derate_2026_06_09
---


**Bug class: an advisory field moved while the load-bearing number did not (a self-contradicting result).**

`UltimateSpeedFeedEngine.calculate()` computed `runout.life_reduction_pct` (0-80%, from RSS TIR
over fz) and pushed a WARNING "TIR ...um reduces tool life by ~40%" -- but the headline
`tool_life.life_minutes` AND `tool_life.cost_per_part` reported the UN-derated life. Only the
advisory `runout_impact.*` fields reflected runout. The operator-facing number contradicted the
operator-facing warning.

**The ordering trap (why a naive patch fails):** the original runout block lived at STEP 14N
(~line 2515), AFTER `costPerPart` was already computed (~line 2415) from the un-derated `toolLife`
(~line 2395). So "derate toolLife after the runout block" would have left cost/part on the
un-derated life -- only the headline would move. The reviewers (B+C in the per-file gate) flag
this class of half-fix.

**Fix (commit a8f72823cb):** compute `runout` BEFORE `toolLife`, fold ONE multiplicative factor
`runoutLifeFactor = runout ? 1 - life_reduction_pct/100 : 1` into the governing
`Math.min(taylor.T_min, wearLifeCap, thermalLifeCap) * runoutLifeFactor`. Now all 5 tool-life
consumers see one self-consistent life: cost/part, three-zone wear, Monte-Carlo CV, headline
life_minutes. The STEP-14N block was reduced to `if (runout) { warnings...; formulas... }` (report
only). Properties proven:
- Conservative (factor in [0.2, 1.0]; 80% reduction cap floors the factor at 0.2 -> life always > 0).
- NOT double-counted: `predictFlankWear` and Taylor `T_min` take no TIR arg, so multiplying their
  min by the runout factor is additive.
- Gated behind TIR inputs -> NO-OP (factor 1) for the common no-runout call (backward-compatible).
- `fz`/`z` are stable between the new early call site and the old report site (z@2046 never
  reassigned; fz finalized by 2168) -- so moving `runoutImpact(fz,z)` up does not change its inputs.

**Test:** `ultimate-speed-feed-runout-life-derate.test.ts` (6, R9, FAIL on revert): derate lowers
headline life; ratio == 1 - life_reduction_pct/100 (warning == number); cost/part strictly rises
(the ordering-fix proof, via cutting_time_per_part_min:1 so floor(life) reflects the integer life);
bounded-positive at extreme TIR; no-TIR determinism. 0 regressions across the 4 affected suites
(3 pre-existing failures unrelated: kc1_1 S=2800 stale test expects 3000, rpm unit 'rev/min' vs
'RPM', cryogenic thermal-risk).

NOTE: this is the UltimateSpeedFeedEngine consistency fix. The NineAxisOrchestrator already credited
holder_runout->tool_life (sweep saw it LIVE). Still-open SFC axis gaps: radial_pct duty-cycle
tool-life correction (needs (pi/phi_s) clamp); verify tool_holder.type enum (shrink-fit/ER/hydraulic)
is not inert in the orchestrator.

Related: [[reference_oscar_sfc_dead_axis_triage_2026_06_09]] (FIX-1/FIX-2 siblings) ·
[[feedback_run_full_affected_suite_before_green]] · the R12 fail-loud doctrine.
