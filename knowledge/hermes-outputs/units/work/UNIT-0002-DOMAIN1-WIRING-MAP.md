# UNIT-0002 — Domain 1 (Physics & Material Science) → Dispatcher/Engine Wiring Map
_Author: oscar (speed-feed domain expert) · 2026-07-02 · every citation verified this session by Grep against `mcp-server/src/tools/dispatchers/calcDispatcher.ts` (+ `safetyDispatcher.ts`) and the engine tree. Deliverable of UNIT-0002 (verdict knowledge-only, per `work/UNIT-0002-gap.md`)._

## Purpose
The Domain-1 sub-units (UNIT-0003…0008) do NOT need new engines — the physics is already built and wired. This table maps each sub-unit's claimed deliverables to the LIVE `prism_calc` actions + engine files that already cover it, so the autonomous harness does not duplicate-build (the failure mode 0003–0005 gap files each independently flagged). "extend" verdicts target the gaps named in the last column, not a rebuild.

## Map (action names + case/enum line verified in calcDispatcher.ts unless noted)

| Sub-unit | Topic | Live `prism_calc` actions (calcDispatcher.ts) | Backing engine(s) | Real remaining gap |
|---|---|---|---|---|
| **0003** | Material behavior / constitutive | `flow_stress` (case 44, enum 570); `jc_flow_stress` `jc_params` `jc_search` `jc_list` (enum 599, cases 1956/1966) | `JohnsonCookEngine.ts` (60+ alloy DB); dup `JohnsonCookConstitutiveEngine.ts` (divergent constants); `algorithms/JohnsonCookModel.ts` | JC-constant divergence unreconciled (`U-JC-CONSTANT-RECONCILE`); no ISO K/H JC params; DSA unmodeled (owned by 0007) |
| **0004** | Tool wear mechanisms | `wear_prediction` (case 202); `wear_progression` (case 64/8701); `tool_wear_rate` (case 5262, enum 818); `archard_wear` (case 220/8740) | `AdvancedWearPhysicsEngine.ts` (diffusive/abrasive/notch/Takeyama-Murata), `ToolWearProgressionEngine.ts` (Usui), `ArchardAdhesiveWearEngine.ts`, `AdaptiveWearEngine.ts` | already-covered; only a thin unified 4-mechanism integrator missing (UNIT-0009) |
| **0005** | Strain rate / serrated chip | `thick_shear_zone` (case 108/5347, enum 1000); `chip_formation` (case 100, enum 591) | shear-zone strain-rate in `UltimateSpeedFeedEngine.ts`; `ChipFormationPredictionEngine.ts` (12 hits) | wire-only per gap (surface the serrated-chip/strain-rate outputs through a named action) |
| **0006** | Phase transform / BUE | `surface_integrity_predict` (case 210, enum 580); `white-layer-predict` / `white-layer-validate` (graph-confirmed actions); `cutting_phenomena_bue` / `cutting_phenomena_bue_effect` (case 7115, enum 939) | `BUEOnsetThresholdEngine.ts` (31 hits, Trent&Wright+Sandvik), `AdvancedCuttingPhenomenaEngine.ts` (29 hits), white-layer path in `UltimateSpeedFeedEngine.ts` | phase-transform is machining-relevant only (white layer); multi-lever BUE mitigation recommender missing (UNIT-0011) |
| **0007** | Work hardening / DSA | work-hardening: `work_hardening_tendency` grading in `UltimateSpeedFeedEngine.ts` (behavioral, drives warnings) | `UltimateSpeedFeedEngine.ts` | **DSA = genuine BUILD gap: `strain.?aging\|portevin\|dynamic.?strain\|blue.?brittle` = 0 matches fleet-wide (verified 2026-07-02).** Matters for carbon steels 200–400 °C + 300-series SS force/finish anomalies |
| **0008** | Min chip thickness / size effect | `kienzle_size_effect` (case 6225, enum 863); `micro_milling_size_effect_calc` (case 10916, enum 1257); `chip_thinning` (case 1570) / `chip_thinning_compensation` (case 9255) / `chip_thinning_lookup` (case 3084); ploughing force in `wear_force_correction` (line 223) | `AdvancedChipThicknessEngine.ts`, `kienzle_size_effect` path | already-covered; verify h_min/ploughing threshold surfaced as an advisory (the SFC page already emits a chip-thinning advisory below 50% radial engagement — `ProductEngine.ts` ~1133) |

Safety-side Domain-1 wiring (prism_safety): `tool_life_budget` (`safetyDispatcher.ts:117`), `federated_tool_life_blend` (`safetyDispatcher.ts:172`).

## Canonical-constant anchors (never inline — import)
- Kienzle: `CANONICAL_KIENZLE` (`mcp-server/src/physics/constants.ts:40`); Taylor: `CANONICAL_TAYLOR` (`:63`), `CANONICAL_TAYLOR_LIFE_CV` (`:114`), extended-Taylor exponents (`:1252`).

## Net conclusion
Domain-1 is ~5/6 built+wired. The only genuine NEW-CODE gap is **DSA (UNIT-0007)**; everything else is "extend" (thin composition/wire/reconcile) over existing wired engines. Builders MUST run `duplicationGuardEngine.checkBeforeCreating` before any Domain-1 engine — the map above is the pre-answer.
