# Quality & Synergy Optimization Roadmap — Design Specification

**Date**: 2026-03-15
**Track**: QS (Quality-Synergy)
**Milestones**: QS-MS0 through QS-MS6 (7 milestones)
**Target**: All pipeline/orchestrator/dispatcher quality scores to 100
**Approach**: Layered Sweep (Wave 1: Foundation, Wave 2: Synergy, Wave 3: Innovation)

---

## Problem Statement

The forge-audit revealed 5 CRITICAL, 11 MAJOR, 18 MINOR findings across PRISM's pipelines, orchestrators, dispatchers, and sequencers. The root cause is **physics fragmentation**: 8+ engines maintain independent copies of Kienzle/Taylor/material constants with divergent values (steel kc1.1 ranges 1800-2000). Pipelines reimplement physics inline instead of delegating to canonical engines. The CNCSimulationPipelineEngine has incorrect formulas. 261 calcDispatcher actions are unreachable. 49 catch blocks silently swallow errors.

## Dependency Chain

```
QS-MS0 (Physics Constants)
  └→ QS-MS1 (Correctness Fixes)
       └→ QS-MS2 (Pipeline Synergy — Simulation + PartGeometry + CAMKernel)
            └→ QS-MS3 (Pipeline Synergy — SFO + ProcessVariability + Assemblers)
                 └→ QS-MS4 (Dispatcher Cleanup)
                      └→ QS-MS5 (Type Safety + Error Observability)
                           └→ QS-MS6 (Cross-Pipeline Innovation)
```

---

## Wave 1: Foundation + Correctness (QS-MS0, QS-MS1)

### QS-MS0: Canonical Physics Constants Module

**Goal**: Single source of truth for all Kienzle/Taylor/material/thermal constants.

**New file**: `src/physics/constants.ts`

Contains:
- `CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }>` — 6 ISO groups (P/M/K/N/S/H) with validated values from Sandvik/Kennametal datasheets
- `CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }>` — Taylor constants per ISO group
- `CANONICAL_MATERIAL_DB: Record<string, MaterialPhysics>` — 13+ materials with all physics props (kc1_1, mc, C, n, k_thermal, sigma_y, density, hardness_HB, vc_base_rough, vc_base_finish)
- `CANONICAL_TOOL_MODULUS: Record<ToolMaterial, number>` — E modulus by tool material (carbide=600GPa, HSS=210GPa, ceramic=380GPa, CBN=680GPa, PCD=850GPa)
- `kienzleForce(kc1_1, mc, ap, fz): number` — canonical implementation
- `taylorLife(C, n, Vc): number` — canonical `T = (C/Vc)^(1/n)`
- `toolDeflection(F, L, d, E?): number` — canonical `delta = F*L^3 / (3*E*I)`
- `boxMullerRNG(seed?): () => number` — seeded PRNG for reproducible MC

**Acceptance**: All 8+ engines import from this module. Zero inline Kienzle/Taylor DBs remain. Build: 0 errors. 15+ tests validating dimensional consistency.

### QS-MS1: Correctness Fixes (CRITICALs + Worst MAJORs)

**P0: CNCSimulationPipelineEngine formula fixes**
- Fix Kienzle: `Fc = kc1_1 * ap * fz^(1-mc)` (not ae-based)
- Fix Taylor: `T = (C/Vc)^(1/n)` (not C/V^n)
- Import from `src/physics/constants.ts`
- Add tool material E modulus lookup
- 5+ regression tests

**P1: calcDispatcher action gap**
- Add 261 missing actions to ACTIONS z.enum array
- Remove 5 duplicate switch cases (ga_optimize, de_optimize, pso_optimize, sa_optimize, pareto_optimize)
- Verify all 1043+ cases are reachable
- 3+ tests

**P2: cadDispatcher action gap**
- Add 24 missing actions (sketch/part/assembly/F360/CadQuery) to ACTIONS z.enum
- 2+ tests

**P3: Inline physics replacement (8 engines)**
- Replace inline KIENZLE_DB/TAYLOR_DB in: PrintToProgramPipeline, PostProcessorPipeline, PartGeometryPipeline, CAMKernelOrchestrator, EndToEndPipeline, MillTurnSwissPipeline, ProcessVariabilityIntegration, CNCSimulationPipeline
- All import from `src/physics/constants.ts`
- Tests: verify identical output with canonical constants

**Target quality scores after QS-MS1**: CNCSimulation 27→75, calcDispatcher 43→85, all others 80+.

---

## Wave 2: Synergy Rewiring (QS-MS2, QS-MS3)

### QS-MS2: Pipeline Synergy — CNCSimulation + PartGeometry + CAMKernel

**Goal**: These 3 self-contained engines become proper orchestrators that delegate to production engines.

**P0: CNCSimulationPipelineEngine → Real Engine Chain**
- Wire the 7 advertised engines: GCodeSafetyAnalyzerEngine, SweptVolumeEngine, ToolAssemblyModelEngine, CollisionDetectionEngine (via AABB), MachineKinematicsEngine
- Replace inline force/thermal/wear with calls to: KienzleForceModelEngine, AdvancedWearPhysicsEngine, ConstitutiveModelEngine (Johnson-Cook thermal)
- Wire collision checking using SweptVolume AABB data
- Fallback to inline (from constants.ts) if engine import fails
- 15+ tests covering each engine delegation

**P1: PartGeometryPipelineEngine → SpeedFeedOrchestrator delegation**
- Replace inline 6-material S/F with SpeedFeedOrchestratorEngine.compute() call
- Replace inline chip thinning with InstantaneousEngagementEngine
- Fallback chain preserved
- 5+ tests

**P2: CAMKernelOrchestratorEngine → SpeedFeedOrchestrator delegation**
- Replace inline Kienzle/Taylor with SFO.compute()
- Replace inline Merchant with ChipMorphologyDiagnosticEngine
- 5+ tests

**Target quality scores after QS-MS2**: CNCSimulation 75→95, PartGeometry 80→95, CAMKernel 80→95.

### QS-MS3: Pipeline Synergy — SFO + ProcessVariability + Assemblers

**P0: SpeedFeedOrchestratorEngine → UltimateSpeedFeedEngine delegation**
- SFO keeps its role as context resolver (8 resolvers) + limit checker + stochastic wrapper
- Core S/F calculation delegates to UltimateSpeedFeedEngine.compute()
- MC simulation delegates to StochasticCuttingForceEngine
- Stability analysis delegates to StochasticChatterEngine
- SFO becomes a true orchestrator, not a reimplementation
- 10+ tests

**P1: ProcessVariabilityIntegrationEngine → VAR-MS0 engines**
- Replace inline Force→Deflection→Dimension→Cpk with:
  - StochasticCuttingForceEngine
  - StochasticDeflectionEngine
  - StochasticDimensionalEngine
  - UncertaintyPropagationPipelineEngine
- Use seeded PRNG from constants.ts for reproducible results
- 5+ tests

**P2: Specialized Assemblers shared material access**
- EDM/Grinding/Turning/Laser/Waterjet assemblers import CANONICAL_MATERIAL_DB
- Shared tool modulus lookup
- No full rewiring (specialized physics stays domain-specific)
- 5+ tests across all 5 assemblers

**Target quality scores after QS-MS3**: SFO 64→95, ProcessVariability 80→95, all assemblers 85+.

---

## Wave 2.5: Infrastructure Cleanup (QS-MS4, QS-MS5)

### QS-MS4: Dispatcher Cleanup

**P0: calcDispatcher optimization**
- Convert 62 eager top-level imports to lazy dynamic imports
- Clean up ValidatedParams = any → proper union type
- Remove 3 leaked non-action strings from ACTIONS array
- Verify all 1043+ cases lazy-load correctly
- 5+ tests

**P1: Cross-dispatcher collision resolution**
- Audit 31 colliding action names
- Namespace or deduplicate: e.g., `calc_energy_analyze` vs `cam_energy_analyze`
- Update ToolRouter with disambiguated routes
- 3+ tests

**P2: mechanicalDesign + fluidThermal z.enum fix**
- Replace z.string() with z.enum(ACTIONS) for compile-time action validation
- 2+ tests

**P3: cadDispatcher hook integration**
- Add pre/post-calculation hooks to cadDispatcher (matching other dispatcher patterns)
- 2+ tests

### QS-MS5: Type Safety + Error Observability

**P0: Remove @ts-nocheck from 2 orchestrators**
- MathIntegrationPipelineEngine: add proper types for sub-engine calls
- PredictionFeedbackOrchestratorEngine: add proper types for sub-engine calls
- Fix all resulting TS errors
- 0 new errors

**P1: PostProcessorPipelineEngine type safety**
- Replace 19 `any`-typed lazy engine fields with proper interfaces
- Use typed `_getEngine<T>()` generic helper
- 10+ type fixes

**P2: Error observability for 49 empty catch blocks**
- Create `src/utils/silentCatch.ts` utility: `silentCatch(fn, context, fallback)` that logs warning + returns fallback
- Replace 49 empty catches across: PostProcessor (14), PredictionFeedback (29), Feasibility (4), EndToEnd (2)
- Warnings feed into pipeline quality scores
- 5+ tests

**P3: GCodeIntelligencePipeline as-any cleanup**
- Replace 12+ `as any` casts with proper types
- 3+ tests

**Target quality scores after QS-MS5**: ALL pipelines/dispatchers 95+.

---

## Wave 3: Cross-Pipeline Innovation (QS-MS6)

### QS-MS6: New Capabilities Unlocked by Shared Physics Backbone

**P0: UnifiedPhysicsVerifierEngine (NEW)**
- Run the same cut through ALL physics paths (SFO, PostProcessor, CNCSimulation, PartGeometry)
- Compare results: force, power, life, Ra, deflection
- Report: max divergence %, which path disagrees, confidence ranking
- Enables: "sanity check" before running a real part — if pipelines agree within 5%, high confidence
- 15+ tests

**P1: CrossPipelineWhatIfEngine (NEW)**
- Single input → fan out to all relevant engines → unified comparison
- "What if I change material from 6061 to Ti6Al4V?" → instant delta across: S/F, forces, cost, cycle time, tool life, feasibility
- Leverages shared constants so deltas are physically consistent
- 10+ tests

**P2: PhysicsAutoCalibrationEngine (NEW)**
- Accept actual cutting data (dynamometer force, measured Ra, actual tool life)
- Bayesian update CANONICAL constants (kc1_1, mc, C, n) per machine+material combo
- Persists calibrated values in `~/.prism/calibration.json`
- Each pipeline automatically uses calibrated values when available
- Integrates with existing AdaptiveCalibrationEngine and SelfLearningCAMEngine
- 15+ tests

**P3: PipelineConsistencyHookEngine (NEW)**
- Hookify rule: after any pipeline runs, automatically verify result against UnifiedPhysicsVerifier
- Warn if force predictions diverge >10% from canonical
- Auto-fire on: print_to_program_full, cnc_simulate, sf_orchestrate, pp_run_full
- 5+ tests

**P4: CLI integration**
- `prism verify --gcode program.nc` — cross-pipeline consistency check
- `prism what-if --material Ti6Al4V --from aluminum_6061` — unified delta
- `prism calibrate --force 850 --material steel --tool-diameter 12` — live calibration
- 3+ commands added to CLI

**Target quality scores after QS-MS6**: ALL 100/100. Plus 4 new engines providing capabilities no competing system offers.

---

## Summary

| Milestone | Wave | Focus | New Engines | Tests | Key Outcome |
|-----------|------|-------|-------------|-------|-------------|
| QS-MS0 | 1 | Physics constants module | 0 (1 module) | 15 | Single source of truth |
| QS-MS1 | 1 | Correctness fixes | 0 | 20 | CRITICALs eliminated |
| QS-MS2 | 2 | Sim+Geo+CAM synergy | 0 | 25 | 3 pipelines properly wired |
| QS-MS3 | 2 | SFO+Var+Assemblers synergy | 0 | 20 | SFO becomes true orchestrator |
| QS-MS4 | 2.5 | Dispatcher cleanup | 0 | 12 | All actions reachable |
| QS-MS5 | 2.5 | Type safety + observability | 0 (1 utility) | 18 | Zero @ts-nocheck, zero silent catches |
| QS-MS6 | 3 | Cross-pipeline innovation | 4 | 48 | Verify/WhatIf/Calibrate/ConsistencyHook |
| **Total** | | | **4 new engines** | **~158** | **All scores 100/100** |

## Quality Score Progression

| Component | Before | After MS1 | After MS3 | After MS5 | After MS6 |
|-----------|--------|-----------|-----------|-----------|-----------|
| CNCSimulationPipeline | 27 | 75 | 95 | 98 | 100 |
| calcDispatcher | 43 | 85 | 85 | 95 | 100 |
| SpeedFeedOrchestrator | 64 | 75 | 95 | 98 | 100 |
| PostProcessorPipeline | 62 | 72 | 85 | 98 | 100 |
| PrintToProgramPipeline | 78 | 85 | 90 | 98 | 100 |
| camDispatcher | 82 | 85 | 88 | 95 | 100 |
| Sequencers | 94 | 94 | 94 | 97 | 100 |
