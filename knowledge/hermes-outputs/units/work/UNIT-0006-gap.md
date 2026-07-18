# UNIT-0006 -- Phase Transformations and Built-Up Edge Chemistry -- GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) - 2026-07-02 - evidence-cited per R12; citations Grep-verified against calcDispatcher.ts + mlDispatcher.ts this session._

## Existing coverage
Both halves of this unit are substantially built + wired:

- **Phase-transformation (machining-relevant: white layer + phase-transform residual stress)**:
  - `white_layer_predict`, `white_layer_validate` -- dedicated prism_calc actions (`calcDispatcher.ts:635`).
  - `residual_stress_phase_transform` (`calcDispatcher.ts:958`), plus `residual_stress_combined` / `residual_stress_hertzian` / `residual_stress_process_param` (`:957-958`).
  - `surface_integrity_predict` returns `white_layer_risk` + `residual_stress_mpa` (`:210-211`); `surface_integrity_full` returns `white_layer` + `stress_type/mpa` + `quality_grade` (`:303-304`).
  - Hard-turning white-layer + hardness-increase: `:502` (final_Ra + hardness_increase_HRC + residual_MPa + depth_of_effect).
  - Cryogenic surface integrity: `cryo_surface_integrity` (`:376`).
- **Built-Up Edge**:
  - Onset prediction fully built: `BUEOnsetThresholdEngine.ts` (per-ISO BUE risk bands, Trent&Wright+Sandvik cited, actionable `recommended_min_vc_m_per_min`), wired `mlDispatcher.ts:316-322` (`bue_onset_check`), tested.
  - `cutting_phenomena_bue` / `cutting_phenomena_bue_effect` (`calcDispatcher.ts:7115`), `bue_risk` in chip-formation output (`:101`), coating-level BUE gating in `CoatingVcModifier.ts`.

## Real gaps
1. **BUE CHEMISTRY specifically** (the unit's exact title). What exists is BUE *mechanics/onset* (speed-band thresholds). A CHEMISTRY model -- workpiece-tool adhesion affinity, solubility/diffusion couple driving the adhesion, coolant-chemistry effect on BUE -- is NOT modeled (grep of BUE hits returns onset/risk/gating, no adhesion-thermodynamics). Genuine but narrow gap; onset thresholds already give the actionable output (raise Vc).
2. **Multi-lever BUE MITIGATION recommender** -- owned by UNIT-0011 (deconflict, R7); do not build here.
3. **Full metallurgical phase-field** (austenite->martensite kinetics under the thermal cycle) is beyond the machining-relevant white-layer risk already surfaced; likely out of scope for an SFC/surface-integrity product (would need FEA thermal history). Declare as out-of-scope, not a gap.

## Verdict
**extend** (already-covered on the actionable surface; the BUE-chemistry depth is the only real extend)

## Recommended next action
Do NOT build a phase-transformation or BUE engine -- white-layer/residual-stress-phase-transform + BUE-onset are all wired. If the BUE-chemistry gap is prioritized, add a thin adhesion-affinity advisory (workpiece-tool solubility couple -> BUE propensity modifier) that FEEDS BUEOnsetThresholdEngine's band, with uncertainty; otherwise mark UNIT-0006 as covered-by-existing and route the mitigation half to UNIT-0011. Re-base the "measured white-layer depth <X" criterion on cross-tool/invariant checks (chip-thinning advisory + surface-integrity grade consistency) since no metallurgical cross-section dataset exists in-repo (R12).

## ROI
**4/10** -- ~90% wired; only the narrow BUE-chemistry adhesion model is genuinely new, and its actionable payoff is already delivered by the onset thresholds.
