# UNIT-0009 -- unified_wear_rate: DESIGN CORRECTION + turnkey build recipe
_Author: oscar (slot claude-0f2af1d8) - 2026-07-02. Read-verified against AdvancedWearPhysicsEngine.ts. Corrects the gap's "unified 4-mechanism integrator" premise and scopes the ONLY real extension (reviewer-gated). Prevents a duplicate-build (the gap already warned against a new ToolWearPredictionEngine) and an apples-oranges physics error._

## Finding 1 -- the unified FLANK-wear rate ALREADY EXISTS
`AdvancedWearPhysicsEngine.combinedWearMechanisms` (`:569-622`, Takeyama-Murata) IS the additive
flank-wear-rate model: `dVB/dt = C1 + C2*exp(-Ea/(R*T))`, returning a VB profile with
`mechanical_mm` + `thermal_mm` attribution + dominant-mechanism + crossover time. The four
"mechanisms" the gap wants map onto its two physically-grouped terms:
- **mechanical** term (C1, rate-independent) = adhesive (Archard/Usui) + abrasive (Rabinowicz).
- **thermal** term (C2*exp(-Ea/RT), Arrhenius) = diffusive + chemical/oxidation.
So a 4-way sum is really a 4-term REFINEMENT of an existing 2-term flank model, not a new integrator.

## Finding 2 -- crater + notch are DISTINCT wear MODES, NOT summable into flank VB (physics)
`fickCraterWear` (`:256`) returns CRATER depth (rake-face, Fick diffusion); `notchWear` (`:296`)
returns NOTCH wear (DOC-line). These are DIFFERENT wear LOCATIONS/units than flank VB. Summing
flank_VB + crater_depth + notch_width into one "wear rate" is an apples-oranges units error (the
exact units-first hazard). The correct product reports flank VB rate AND crater/notch as separate
co-occurring modes -- not one scalar sum.

## Finding 3 -- the ONLY real extension is cutting-state -> wear-CONSTANTS (reviewer-gated)
`combinedWearMechanisms` takes wear-rate CONSTANTS (C1, C2, Ea) as INPUT; it does not derive them
from the cutting state. The genuine value-add of a `unified_wear_rate` action is estimating those
constants from (Fc, cutting-zone T, material hardness/diffusivity) so a caller supplies conditions,
not constants. That estimation IS wear physics needing sourced coefficients + a physics-reviewer
(force/wear-formula surface, oscar refuse-list). ROI is low (gap 4/10) and validation is data-blocked
(no measured JM wear-vs-time dataset; the only corpus is synthetic Taylor-generated -> circular).

## Turnkey build recipe (reviewer-gated; execute when prioritized)
1. Pure `unifiedWearRate(input)` in a NEW composition module (NOT a new wear-physics engine ->
   duplicationGuard would block; compose the existing methods):
   - Estimate mechanical constant C1 from Fc + sliding + tool hardness (Archard: C1 ~ K*Fc/H) and
     the diffusion constant C2 + Ea from the material (source per ISO group; cite).
   - Call `advancedWearPhysicsEngine.combinedWearMechanisms({mechanical_constant:C1, diffusion_constant:C2, activation_energy_kJ:Ea, temperature_C, time_max_min, dt_min})`.
   - Return: total_dVBdt (mm/min) + per-mechanism attribution {adhesive+abrasive share = mechanical,
     diffusive+chemical share = thermal} + RSS uncertainty from the constant CVs + SEPARATELY the
     crater rate (fickCraterWear) and notch rate (notchWear) as distinct modes (NOT summed).
2. Physics-reviewer: validate the C1/C2/Ea estimation from cutting state + the mechanical/thermal
   attribution mapping (do NOT ship the force-derived wear constants without sign-off).
3. Wire `unified_wear_rate` to prism_calc; reference-value tests (rate rises with T through the
   Arrhenius term; mechanical share dominates at low T, thermal at high T -- the crossover the
   engine already computes) + >=10 cases + a round-trip.
4. Declare measured-wear validation as an operator data dependency (R12) -- not faked.

## Recommendation
Do NOT build a new 4-mechanism wear engine (duplicate) NOR a scalar 4-way sum (apples-oranges).
Build the thin cutting-state->constants estimator over combinedWearMechanisms per the recipe,
physics-reviewer-gated, when the low ROI justifies it. Until then the flank-wear rate is available
via combinedWearMechanisms and crater/notch via their dedicated methods.
