# SFC Thermal-Expansion -> Tolerance Coupling -- design spec (U-OSC-SFC-THERMAL-EXPANSION-TOLERANCE)

**Author:** oscar (slot:oscar) * 2026-06-29 * de-risk spec for the next SFC physics gap.
**Status: DESIGN -- physics-reviewer-gated build, do in a clean context.** Unlike the shipped flank-wear
+ runout units (WIRE-EXISTING), this one needs NEW canonical CTE constants + a NEW thermal-growth model,
so it is heavier -- spec first, build clean. Sibling pattern: the additive-advisory shape of
`SFC-FLANK-WEAR-FORCE-COUPLING-SPEC` / `SFC-RUNOUT-PEAK-FORCE-COUPLING-SPEC` (shipped 15c74d20f4 / 524e86edb9).

## 1. The gap (verified 2026-06-29 with the reliable Grep tool -- the rtk/rg fallback was unreliable)
The SFC computes the cutting-zone interface temperature (`temp_C`) but NEVER translates the WORKPIECE
bulk temperature rise into thermal DIMENSIONAL growth, nor flags when that growth consumes the feature
TOLERANCE band. Verified absences:
- `UltimateSpeedFeedEngine` / `SpeedFeedNineAxisOrchestratorEngine`: 0 thermal-expansion -> tolerance/
  dimension coupling.
- `src/physics/constants.ts`: 0 CTE / coefficient-of-thermal-expansion constant (it HAS thermal
  conductivity + specific heat, but NOT the expansion coefficient).
- Thermal-expansion KNOWLEDGE is scattered across science-orchestration / deep-learning engines (15 files
  mention it) but there is NO clean thermal-growth -> tolerance model the SFC consumes.
This is NEW physics (a CTE constant + a delta-L model), NOT a wiring gap.

## 2. The model
A part machined hot is cut to its HOT dimension; on cooling to the 20C metrology reference it SHRINKS by
the thermal growth, so the finished feature ends up undersize (for an external dimension) by:
```
delta_L = alpha * L * delta_T          [mm]
```
- `alpha` = material CTE [1/K] (NEW canonical constant -- see Sec 3).
- `L` = the feature characteristic length / diameter [mm] (the dimension under tolerance).
- `delta_T` = workpiece BULK temperature rise above ambient during the cut [K] (see Sec 4 -- the key
  modeling decision; NOT the cutting-zone `temp_C`).
For a feature tolerance band `T_band`, the thermal growth consumes a fraction `delta_L / T_band` of it.
ADVISORY: flag when `delta_L` consumes more than ~25% of the band (warn) or exceeds it (critical) -- the
operator must let the part thermally stabilize before final measurement, or compensate the target dim.

## 3. Canonical CTE constants (NEW -- add to constants.ts, cited; NEVER inline -- soul refuse)
Add `CANONICAL_CTE` per ISO group (and per-grade overrides where they diverge), units 1/K, cited
ASM Handbook Vol.1 / Machinery's Handbook (linear CTE near 20-100C):
| ISO | material class | alpha [1e-6 / K] |
|-----|----------------|------------------|
| P | carbon/alloy steel | ~11.7 |
| M | austenitic stainless | ~16.0 (ferritic ~10.5 -- grade-dependent, flag) |
| K | gray cast iron | ~10.5 |
| N | aluminum | ~23.0 (brass ~19, copper ~17 -- grade override) |
| S | titanium (Ti-6Al-4V) | ~8.6 ; nickel superalloy (Inconel 718) ~13.0 |
| H | hardened tool steel | ~11.5 |
Source each cell inline. The N + M + S rows are the most grade-sensitive (Al vs brass vs Cu; austenitic
vs ferritic; Ti vs Ni) -- prefer a per-grade lookup keyed to the existing material/grade resolution, ISO
fallback. Mirror the `CANONICAL_KIENZLE` / `CANONICAL_TAYLOR` shape + the per-grade override convention.

## 4. delta_T -- the workpiece BULK temperature rise (the key modeling decision)
The SFC's `temp_C` is the CUTTING-ZONE INTERFACE temperature (hundreds of C) -- NOT the bulk part temp.
Most cutting heat goes to the CHIP; only a fraction reaches the workpiece bulk. Two candidate models for
the build to choose (physics-reviewer-gated):
- **(a) Heat-partition fraction** (preferred): `delta_T_bulk = R_w * Q / (m_part * cp)` where `R_w` is the
  workpiece heat-partition fraction (Boothroyd/Shaw: ~10-20% for typical steel; LOWER for high-conductivity
  Al that sheds heat, HIGHER for low-conductivity Ti/stainless that retain it), `Q` the cutting power *
  time, `m_part` the part mass, `cp` the specific heat (already in constants). Needs a part-mass / volume
  input.
- **(b) Conservative proxy**: `delta_T_bulk = k_bulk * (temp_C - ambient)` with a small cited `k_bulk`
  (~0.05-0.15). Cruder but needs no new mass input; defensible as a conservative ADVISORY upper bound.
DECIDE in the build; (b) is the lower-risk first cut for an advisory. The material's thermal conductivity
(already in constants) gates which direction (Al low retention, Ti/stainless high) -- reuse it.

## 5. Input plumbing
- `feature_tolerance_mm` -- AUDIT first: the orchestrator's `optimize-for-factor.test.ts` BASE already
  passes `feature_tolerance_mm: 0.05`, so the SFC input MAY already accept it (verify the field is plumbed
  vs accepted-but-unused before adding).
- Feature characteristic length `L`: reuse `workpiece_diameter_mm` (turning) or add a `feature_length_mm`
  (milling); absent -> skip the advisory (no false flag).
- Absent tolerance OR length -> advisory inactive (back-compat / non-regression).

## 6. Advisory design (mirror the shipped additive pattern)
- Additive output `forces`/`thermal`.`thermal_growth_um` (= `delta_L * 1000`) + `thermal_tolerance_consumed_pct`.
- Warning fires ONLY when `feature_tolerance_mm` present AND `delta_L` consumes > 25% of the band (warn) /
  exceeds it (critical): "Thermal growth ~Xum consumes ~Y% of the Zum tolerance -- let the part stabilize
  to 20C before final measurement, or offset the target dimension."
- Headline outputs unchanged; advisory-only. Non-regression: inactive without tolerance+length inputs.

## 7. Non-regression + tests (R9)
- No tolerance/length input -> no thermal-growth output, no warning -> gauntlet byte-identical.
- Sensitivity: `delta_L` monotone in alpha, L, delta_T; Al (high alpha) > steel > Ti at the same L/delta_T.
- Flip: a tight band where `delta_L` exceeds 25% -> warning; a loose band -> no warning (self-calibrate the
  band from the computed `delta_L`).
- Variability: >= 3 ISO groups (N/P/S spanning alpha 8.6-23).
- Adversarial: tolerance/length NaN/negative/zero -> skip, no crash; delta_T <= 0 -> no growth.

## 8. Gates
- **physics-reviewer MANDATORY** -- it adds canonical CTE constants (verify each value vs ASM/Machinery's
  Handbook) AND a new delta_T model. 401-gauntlet green (non-regression). Per-file 2-arm + 3-of-3 at stop.

## 9. Why a spec now, build later
NEW canonical constants + a NEW bulk-temp model is heavier than the wire-existing force units; rushing new
CTE values + a heat-partition model in a deep context near a session boundary is the rushed-safety risk the
soul guards against. The design (CTE table + the delta_T model choice + the advisory shape) is fixed here so
the build is mechanical in a clean context. Backlog: [[reference_oscar_sfc_physics_gap_backlog_grok_2026_06_29]].
Sibling shipped arc: [[sfc-force-safety-envelope]]. Remaining after this: BUE effective-rake force; runout ->
stability-lobe (blocked on ChatterStabilityLobeEngine 0-lobes regression).
