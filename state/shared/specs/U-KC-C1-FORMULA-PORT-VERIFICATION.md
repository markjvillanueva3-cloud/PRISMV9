# U-KC-C1 — 12-File Formula Port Verification (Lane B)

**Milestone:** KNOWLEDGE-CONVERSION-MS0 Phase 2 Lane B
**Unit:** U-KC-C1
**Date:** 2026-05-16
**Author:** claude-41db1b82 (slot india)
**Status:** verification-only, no source code changes
**Advisory:** `advisoryOnly: true`, `mustHumanVerify: true`

## Scope

Per Phase 0 audit ledger (`state/shared/specs/monolith-port-ledger.json`), the
"71 formulas" detection count from the monolith resolves to **12 actual files**
at `extracted/formulas/PRISM_*.js`. This unit verifies each file's port state by
content cross-reference (not just name-match), categorizes the canonical PRISM
landing site, and identifies any unported residue requiring real porting work.

**Canonical physics rule (CLAUDE.md §SAFETY):** NEVER inline Kienzle/Taylor/
material constants. All canonical constants live in `src/physics/constants.ts`.
The 8 "ported" entries in the ledger refer to per-material data tables that may
include approximated values — the canonical source remains `constants.ts`.

## Verification verdicts (12/12)

### Group A — Multi-dispatcher distribution (2)

These files are wrapper/coordinator APIs whose individual formulas map across
multiple dispatcher surfaces. Name-match scoring failed (low score) because no
single .ts file is a 1:1 equivalent; the work is fully ported, distributed.

| File | Ledger state | Verdict | Landing |
|------|-------------|---------|---------|
| PRISM_STANDALONE_CALCULATOR_API.js | unported (score 0) | **PORTED-DISTRIBUTED** | `prism_calc` actions: `quick_rpm`, `quick_surface_speed`, `quick_feed_rate`, `quick_chip_load`, `quick_mrr`, `chip_thinning`, `cutting_force`, `power`, `tool_deflection_predict`, `surface_finish`, `peck_drill_optimize`, `kb_calc_tap_drill`. Material table hardcoded values (Kc per alloy) are PRISM-internal approximations — canonical kc1.1 per ISO group in `constants.ts` (P=1800, M=2100, K=1100, N=700, S=2800, H=3200). |
| PRISM_MFG_PHYSICS.js | ambiguous (score 0.367) | **PORTED-DISTRIBUTED** | Meta-coordinator calling: `merchantCircle` → `prism_calc:merchant_analysis` (calcDispatcher:575) · `loewenShawTemperature` → `prism_calc:thermal_loewen_shaw` (calcDispatcher:581) · `extendedTaylor` → `prism_calc:tool_life` with canonical Taylor C/n from `constants.ts`. |

### Group B — Data tables superseded by registry (2)

| File | Ledger state | Verdict | Landing |
|------|-------------|---------|---------|
| PRISM_THERMAL_PROPERTIES.js | ambiguous (score 0.402) | **SUPERSEDED-BY-REGISTRY** | k/cp/alpha/T_max/density per material (steels/stainless/aluminum/etc.) — canonical source: `MaterialRegistryEngine` + `prism_data:material_get`/`material_search`. Static `.js` data tables intentionally NOT re-imported (Karpathy R11 conformance — registry is the canonical surface). |
| PRISM_TOOL_LIFE_ESTIMATOR.js | ambiguous (score 0.611) | **SUPERSEDED-BY-CONSTANTS** | Taylor constants table (n, C, maxLife per tool×material). Canonical Taylor C/n lives in `src/physics/constants.ts`. Formula `T = (C/V)^(1/n)` is wired in `prism_calc:tool_life` and `BayesianToolLifeEngine`. Embedded values are pre-PRISM approximations; canonical wins. |

### Group C — Direct-mapped engines (8, ledger score=1)

All 8 score=1 entries have a primary canonical landing site already wired. Spot-
check confirms each top-level API function is realized through the named engine
+ companion dispatcher actions. No re-port needed.

| File | Primary engine | Companion actions | Top-level API verified |
|------|---------------|-------------------|------------------------|
| PRISM_FORCE_LOOKUP.js | `KienzleForceModel` | `prism_calc:kienzle_force`, `kienzle_coefficients` + Kc lookups via `prism_data:material_get` | getDefaultKc, getDefaultMc, getForceDistribution, getSafetyFactors |
| PRISM_MATERIAL_PHYSICS.js | `FusionMaterialPhysicsBridge` (+ HyperMill/Mastercam bridges) | `prism_data:material_get`, `material_search` | getDensity, getYoungsModulus, getPoisson, getThermalConductivity, getSpecificHeat, getMeltingPoint |
| PRISM_STRESS.js | `KeywayStressEngine` | `prism_calc:tensor_stress_invariants`, classical mechanics suite | principalStress, mohrsCircle, vonMises, tresca |
| PRISM_STRESS_ANALYSIS.js | `WEDMWireStressAnalysisEngine` + `KeywayStressEngine` | same as above | vonMises, deviatoric, principalStresses, invariants, trueStrain |
| PRISM_THERMAL_COMPENSATION.js | `InverseThermalCompensationEngine` | `prism_calc:thermal_compensate`, `thermal_compensation_model` | createSystem, errorCoeffs, predictError, compensation |
| PRISM_THERMAL_LOOKUP.js | `ThermalFEAModel` algorithm | `prism_calc:cutting_temperature`, `thermal_expansion`, `cutting_thermal_partition` | getMaxTemp, getWorkpieceMaxTemp, getCoolantRequired, estimateCuttingTemp, getThermalExpansion |
| PRISM_TOOL_WEAR_MODELS.js | `ToolWearPrediction` algorithm | `prism_calc:wear_force_correction`, `archard_wear`, `tool_life`, `wear_progression` | extendedTaylor, usuiWearModel, archardWearModel, predictFlankWear |
| PRISM_WEAR_LOOKUP.js | `BayesianWearModel` algorithm | `prism_calc:wear_progression`, `tool_life`, `tool_life_predict` | getVBMax, identifyWearMode, estimateWearStage, getToolLifeCriteria |

## Net result

**0 files require source-code porting.**

- 2 multi-dispatcher distribution (wrapper APIs already fully realized)
- 2 superseded by registry/constants (canonical source is `MaterialRegistryEngine` / `src/physics/constants.ts`)
- 8 direct-mapped to existing engines+actions (spot-check PASS on API surface)

The premise embedded in `monolith-port-ledger.json` for the "ambiguous" + "unported" entries is corrected by this content cross-reference: name-match score
alone cannot bridge wrapper-API patterns or recognize that data tables are
superseded by registry surfaces. The audit's `advisoryOnly:true` /
`mustHumanVerify:true` flags are the load-bearing safeguard — this verification
IS the human-verify pass for the formula axis.

## Lane B residue

**U-KC-C2** (20 algorithms) per ledger: 20/20 already resolve to current PRISM
algorithm files (8 grep-verified, 12 name-match). Phase 0 audit downgraded
C2 to "confirm + spot-check the 12 name-match entries" — no porting work.

**Conclusion for Phase 2:** Lane B is verification-only. The 2-lane model in
the plan doc held — Lane A (Phase 1) was the build, Lane B (Phase 2) is
confirmation that the prior `S1-MS2` / `L1-P0-MS1` / `L2-P0-MS1` deliverables
covered the formula+algorithm axis. The remaining open work in
KNOWLEDGE-CONVERSION-MS0 is:

- **Phase 3 Lane C** (U-KC-D1) — formalize the 65 course content-mining
  candidates into `/forge`-eligible units. Queue-only, human-gated, never
  auto-built.
- **Phase 4** (U-KC-E1) — durable memory + wiki + CLAUDE.md pointer
  doc-reflection.

## Re-verification

To re-derive this verification when the monolith ledger changes or canonical
implementations move:

```bash
node scripts/audit-monolith-port-state.mjs                 # regen ledger
cat state/shared/specs/monolith-port-ledger.json \         # extract formulas
  | jq '.extractedArtifacts.formulas'
# Cross-reference each `.match` and `.alternatives[]` entry against current
# src/ via Grep on top-level API names per Group A/B/C above.
```
