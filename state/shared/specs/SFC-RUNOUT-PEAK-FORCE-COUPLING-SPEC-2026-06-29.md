# SFC Runout Peak-Force Coupling -- design spec (U-OSC-SFC-RUNOUT-PEAK-FORCE)

**Author:** oscar (slot:oscar) * 2026-06-29 * de-risk spec for the next verified SFC physics gap.
**Status: DESIGN -- physics-reviewer-gated build, do in a clean context.** Sibling of the shipped
flank-wear pattern (`SFC-FLANK-WEAR-FORCE-COUPLING-SPEC-2026-06-29.md` -> `15c74d20f4`): spec -> clean-context
build -> additive non-regressing outputs + flip-only warnings -> physics-reviewer + 3-of-3.

## 1. The gap (verified in code 2026-06-29) -- it is a WIRE-EXISTING gap, NOT missing physics
`UltimateSpeedFeedEngine` computes cutting force from the AVERAGE chip load (Kienzle `Fc = Kc*ap*hex`,
hex from the nominal fz). With tool/holder/spindle RUNOUT (TIR), one flute bites deeper -- the
heavily-loaded flute's chip is `fz + TIR_mm` while the light flute barely cuts (`MachiningPlaybookEngine`
L3259: "at 20,000 RPM with 10um runout, one flute cuts 10um deeper... takes the entire chip load... wears
5x faster"). So the INSTANTANEOUS PEAK force on the loaded flute exceeds the average force the SFC reports.
That peak drives the real deflection / spindle-power-spike / workholding margin -- but the SFC core never
applies it. **`UltimateSpeedFeedEngine` has ZERO runout coupling to its force/deflection path** (grep
verified; the only TIR touch is a `holder_tir`/`tool_tir` helper ~L1733 -- AUDIT what it does first).

**The peak-chip / chip-load-variation model ALREADY EXISTS** -- `ToolRunoutEngine.calculate()`:
- input `RunoutInput { total_tir_um, tool_diameter_mm, num_flutes, feed_per_tooth_mm, holder_type?, spindle_runout_um? }`
- output `RunoutResult { max_chip_load, min_chip_load, chip_load_variation, tool_life_factor, ra_degradation_factor, dimensional_error, runout_budget{spindle,holder,tool,total}, holder_recommendation, warnings }`
- core physics (`ToolRunoutEngine.ts:92`): `maxChip = fz + tirMm`, `minChip = max(fz - tirMm, 0)`,
  `chip_load_variation% = (maxChip-minChip)/fz*100`. The PEAK chip is `max_chip_load` = `fz + TIR_mm`.
It is consumed today only by `MachiningIntelligenceOrchestratorEngine` (`:729 toolRunoutEngine.calculate`,
`:779 runout_chip_load_variation`) -- NOT by the SFC core. **The gap is wiring `ToolRunoutEngine`'s peak
chip into the SFC core force/deflection safety assessment. Do NOT rebuild the runout model.**
Sibling runout engines (do NOT duplicate, pick the right one): `ToolRunoutEngine` (chip-load variation +
peak -- THIS one), `RunoutCompensationEngine`, `RunoutEffectEngine`, `SpindleRunoutEngine`,
`Mill/LatheCoaxialityRunoutValidatorEngine`. `ToolRunoutEngine` is the chip-load/peak producer.

## 2. The model (REUSE ToolRunoutEngine -- do not re-derive)
Peak chip load `h_peak = fz + TIR_mm` (`ToolRunoutEngine.max_chip_load`). The peak Kienzle force scales
with the peak chip via the Kienzle exponent: `Fc_peak / Fc_avg = (h_peak / hex)^(1-mc)` (specific cutting
force rises less-than-linearly with chip thickness; mc per ISO group from `constants.ts`). Conservative
simplification acceptable for an advisory: peak force factor `kappa = h_peak / hex >= 1` (linear upper
bound on the Kienzle scaling -- always >= the true `(h_peak/hex)^(1-mc)` since `1-mc < 1`, so it is the
SAFE/over-protective direction). DECIDE in the build which to use; the Kienzle-exact form is preferred,
the linear `kappa` is the conservative fallback. `TIR=0` (no runout) => `h_peak = hex` => `kappa = 1`
(clean limit, byte-identical).

## 3. Design decision -- ADDITIVE peak-force consequence + flip-only warnings (mirror the shipped Step-2)
Same proven shape as flank-wear Step-2:
- Compute `Fc_peak = Fc * kappa` (+ peak deflection = deflection * kappa, peak power = power * kappa, peak
  torque = torque * kappa -- peak force is linear into all, same as the worn-force multiplier).
- Emit ADDITIVE outputs `forces.cutting_force_peak_runout_N` + `power.required_power_peak_kw` +
  `forces.deflection_peak_um` (names TBD; align with the worn-* naming).
- A warning fires ONLY on a FLIP (a gate that PASSES at the average force but FAILS at the runout peak):
  power(>90% available) / deflection(>50um) / torque(>90% limit) / workholding(SF<1.5 in NineAxis).
- The HEADLINE verdicts stay on the AVERAGE force (non-regression: the 401-gauntlet asserts average-force
  values). Conservative: `kappa >= 1`, so the peak consequence is never less than the average.

**COMPOSES with flank-wear Step-2:** the true worst-case late-life force is `Fc * kappa_runout * m_wear`
(peak flute AND worn). Consider a combined `cutting_force_worst_case_N = Fc * kappa * m` output so the
operator sees the real envelope. KEEP each factor's own output too (separable diagnosis).

## 4. Input plumbing (the one real unknown to resolve in the build)
`UltimateSpeedFeedInput` has no clean runout field today. The build must (a) AUDIT the `holder_tir`/
`tool_tir` helper at `UltimateSpeedFeedEngine.ts:~1733` (it may already plumb TIR -- reuse it), and
(b) add/resolve a `runout_tir_um` (or `holder_runout_mm`) input + `holder_type`, feeding
`ToolRunoutEngine.calculate({ total_tir_um, tool_diameter_mm: Dc, num_flutes: flutes, feed_per_tooth_mm: fz, holder_type })`.
Absent runout input => `kappa=1` => no change (back-compat). NOTE the existing `sfc-nine-axis-runout-no-
double-count.test.ts` already exercises a `holder_runout_mm` -> tool-life derate path; ensure the new
peak-FORCE path does NOT double-count with that tool-LIFE derate (they are orthogonal: life vs force) --
mirror the audit-consumers-when-moving-logic discipline (`feedback_audit_consumers_when_moving_logic_into_engine`).

## 5. Non-regression strategy (MANDATORY)
- Headline force/power/deflection/torque stay at the AVERAGE chip load -> 401-gauntlet byte-identical
  (it passes no runout input -> `kappa=1`).
- Peak outputs are ADDITIVE + the warning fires only on a flip -> confirm no gauntlet test asserts an
  exact warnings array (the flank-wear build confirmed the gauntlet does NOT).
- `TIR=0` => `kappa=1` => `Fc_peak = Fc` exactly.

## 6. Blast radius (audit before shipping)
- `UltimateSpeedFeedEngine` force/deflection/power/torque outputs (additive peak fields).
- `SpeedFeedNineAxisOrchestratorEngine.checkWorkholding` (cross-engine: a peak-force worn-clamp sibling
  note, like the flank-wear one shipped in `15c74d20f4`).
- DO NOT touch `MachiningIntelligenceOrchestratorEngine`'s existing `ToolRunoutEngine` consumption.

## 7. Test plan (R9, mirror the flank-wear consequences suite)
- Non-regression: no runout input -> headline forces byte-identical; `kappa=1`.
- Sensitivity: `Fc_peak(TIR=10um) > Fc`; monotone in TIR; matches `(h_peak/hex)^(1-mc)` (or linear) to a
  reference value; higher flutes / lower fz raise the variation.
- Flip: a near-limit deflection/power cut that PASSES at average force FLIPS to a warning at the runout
  peak; self-calibrate the machine/clamp limit from the engine's own average output (proven pattern).
- Variability: >=3 ISO groups (P/K/S spanning mc).
- Adversarial: TIR NaN/negative/huge -> clamp/fallback to kappa=1, no crash; drilling guard.
- Cross-consumer: round-trip through NineAxis for the peak-force workholding note.

## 8. Gates
- **physics-reviewer MANDATORY** (force-model change). 401-gauntlet green (non-regression). Per-file 2-arm
  + 3-of-3 at stop. Hermes/Grok advisory cross-review optional (free, out-of-context).

## 9. Explicitly DEFERRED: the "-> stability lobe" coupling
The runout peak-force ALSO shifts the chatter stability boundary (peak force drives regeneration). That
coupling needs `ChatterStabilityLobeEngine` -- which has a KNOWN 0-LOBES REGRESSION (foxtrot landmine,
[[reference_chatter_engine_regression_2026_05_24]]). FIX that regression FIRST in a separate unit; this
spec scopes the force/deflection/power/workholding slice ONLY (chatter-independent). Do not couple a peak
force into a stability engine that returns 0 lobes.

## 10. Why a spec now, build later
Safety-bearing force-model coupling feeding the deflection/power/workholding gates -- per the proven
flank-wear discipline, the design is spec'd here so the build runs in a clean context without rushing a
safety-relevant force model in a deep one. Backlog: [[reference_oscar_sfc_physics_gap_backlog_grok_2026_06_29]].
Shipped sibling: [[reference_oscar_sfc_flank_wear_step2_2026_06_29]] (the pattern to mirror exactly).
Remaining SFC physics gaps after this: workpiece thermal-expansion -> tolerance; BUE effective-rake force.
