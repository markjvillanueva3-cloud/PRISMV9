# PRISM Perfection Roadmap — PERFECT-MS0..MS14

**Generated:** 2026-04-17 from FORGE_AUDIT_REPORT_2026-04-17.md
**Authority:** Complements PRISM-UNIFIED-ROADMAP-v2.md (does not supersede).
**Intent:** Close the quality gaps surfaced by the audit. Ordered by **safety impact × dependency cascade** — earlier phases unblock later ones.

> Git coordination (branching / commit-broker) is **intentionally excluded** — owned by a separate chat.

---

## PHASE PRIORITY LADDER

| Phase | Title | Units | Safety Weight | Blocks |
|---|---|---|---|---|
| **PERFECT-MS0** | Physics Constants Consolidation | 6 | 🔴 CRITICAL | MS1, MS3, MS8 |
| **PERFECT-MS1** | Safety Engine Test Coverage Blitz | 8 | 🔴 CRITICAL | — |
| **PERFECT-MS2** | Dispatcher Wiring & Validation Gate | 5 | 🟡 HIGH | MS11 |
| **PERFECT-MS3** | Physics Division-by-Zero Guard Pass | 4 | 🔴 CRITICAL | — |
| **PERFECT-MS4** | Type Safety Reclamation (@ts-nocheck + `as any`) | 6 | 🟡 HIGH | — |
| **PERFECT-MS5** | Atomic Writes Everywhere | 3 | 🟡 HIGH | — |
| **PERFECT-MS6** | RCE Surface & JSON Parse Hardening | 4 | 🔴 CRITICAL | — |
| **PERFECT-MS7** | Stub Engine Triage | 5 | 🔴 CRITICAL | — |
| **PERFECT-MS8** | Drift-Proof Hook-Mirror Pattern | 4 | 🟡 HIGH | — |
| **PERFECT-MS9** | State Schema Versioning Backfill | 3 | 🟢 MEDIUM | — |
| **PERFECT-MS10** | God-File Decomposition | 4 | 🟢 MEDIUM | — |
| **PERFECT-MS11** | Orchestration Lock Manager Wiring | 3 | 🟡 HIGH | — |
| **PERFECT-MS12** | Roadmap & Directive Cleanup | 3 | 🟢 MEDIUM | — |
| **PERFECT-MS13** | Test Coverage Push to 50% | 8 | 🟡 HIGH | — |
| **PERFECT-MS14** | ML Reproducibility (seeded RNG) | 3 | 🟢 MEDIUM | — |

**Total: 69 units across 15 phases.** Estimated ~120–160 person-hours with agent parallelization.

---

## PERFECT-MS0 — Physics Constants Consolidation 🔴

**Problem:** ~23 engines inline `kc1_1`/`taylor_C`/`E_GPa` tables; **9 use `KC11: P=2100` while canonical `constants.ts` has 1800** (17% divergence). Same material in two engines returns different forces.

**Exit gate:** Zero inline `kc1_1:` / `taylor_C:` / `taylor_n:` / `E_GPa:` literals outside `src/physics/constants.ts`. Lint rule enforcing this in place.

| Unit | Task | Files |
|---|---|---|
| U-PF-00-01 | Expand `src/physics/constants.ts` `MATERIALS` table to cover the union of all inlined rows (audit extracted 60 files worth of duplicates) | constants.ts |
| U-PF-00-02 | Sweep & replace top 5 offenders | `AdaptivePipelineGeneratorEngine.ts:188-203`, `BatchCAMMaterialBridgeEngines.ts:483-660`, `BenchmarkReportGeneratorEngine.ts:141-150`, `CAMPluginSDKEngine.ts:19-24`, `CAMKernelOrchestratorEngine.ts:361+` |
| U-PF-00-03 | Sweep & replace next 10 offenders | `DeepHoleDrillingPhysicsEngine`, `BarStockVibrationEngine`, `ConstraintSatisfactionEngine`, `DOETaguchEngine`, `MonteCarloProcessEngine`, `MultiObjectiveParetoEngine`, `ProcessDigitalTwinEngine`, `StochasticRoutingEngine`, `StochasticToolLifeEngine`, `RunoutEffectEngine` |
| U-PF-00-04 | Sweep & replace remaining ~13 offenders | `NovelToolpathEngine`, `NCSIMULBridgeEngine`, `PredictiveSimulationEngine`, `HyperMillPPPBridgeHooks`, `JobLearningEngine`, `CamxEnergyOptimizationEngine:303`, `MillingUnifiedScienceOrchestration`, `SpeedFeedAutopilot`, `MaterialCalloutParser`, `HyperMillMacroDB`, `HyperMillMaterialPhysicsBridge`, plus remaining elastic-modulus inliners |
| U-PF-00-05 | Fix `KienzleForceModelEngine.ts:260-269` itself — should import its own canonical table, not duplicate | KienzleForceModelEngine.ts |
| U-PF-00-06 | Add ESLint rule banning literal `kc1_1:` / `taylor_C:` / `taylor_n:` / `E_GPa:` / `kc\s*=\s*\d+` outside `src/physics/constants.ts`; wire to pre-commit hook | `.eslintrc` + hook |

---

## PERFECT-MS1 — Safety Engine Test Coverage Blitz 🔴

**Problem:** 59 of 68 safety-keyword-named engines (87%) have no test. Six collision engines have zero tests. The safety veto logic is untested.

**Exit gate:** 100% of safety-named engines have a companion test with ≥10 cases including edge cases (zero, negative, extreme, NaN).

| Unit | Task | Engines |
|---|---|---|
| U-PF-01-01 | Tests for force engines (7) | `KienzleForceModelEngine`, `CuttingForceEngine`, `TurningForceEngine`, `StochasticCuttingForceEngine`, `DrillBreakthroughForceEngine`, `ChuckJawForceEngine`, `TailstockForceEngine` |
| U-PF-01-02 | Tests for workholding/deflection (7) | `WorkholdingForceEngine`, `PartDeflectionEngine`, `ToolAssemblyDeflectionEngine`, `ToolDeflectionPredictionEngine`, `BoringBarDeflectionEngine`, `WorkpieceDeflectionCompensationEngine`, `StochasticDeflectionEngine` |
| U-PF-01-03 | Tests for chatter/stability (4) | `ChatterStabilityLobeEngine`, `ChatterPredictionEngine`, `RegenerativeChatterPredictor`, `StochasticChatterEngine` |
| U-PF-01-04 | Tests for collision (6) | `CollisionDetectionEngine`, `CollisionPreventionEngine`, `CollisionHazardDetectorEngine`, `ContinuousCollisionDetectionEngine`, `MillKinematicsCollisionEngine`, `LatheCollisionZoneEngine` |
| U-PF-01-05 | Tests for thermal (9) | `ThermalWearCouplingEngine`, `ThermalExpansionEngine`, `ThermalFatigueEngine`, `ThermalFieldToolpathEngine`, `ThermalGrowthCompensationEngine`, `ThermalCompensationModelEngine`, `InverseThermalCompensationEngine`, `LAMThermalSofteningEngine`, `CuttingThermalEngine` |
| U-PF-01-06 | Tests for safety orchestration (4) | `SafetyVetoEngine`, `SafetyEscalationEngine`, `SafetyPatternMinerEngine`, `SafetyGateForOptimizationEngine` |
| U-PF-01-07 | Tests for WEDM safety (4) | `WEDMSafetyEnvelopeEngine`, `AGISafetyContainmentEngine`, `WEDMFailsafeEngine`, `WEDMHeadClearanceEngine` |
| U-PF-01-08 | Tests for G-code safety analyzer (THE gap) | `GCodeSafetyAnalyzerEngine` — needs cases for every `return null` branch in its 1,997 LOC |

---

## PERFECT-MS2 — Dispatcher Wiring & Validation Gate 🟡

**Problem:** 5 orphan + 8 unreachable actions in `aiReasoningDispatcher`; symmetric 19+19 drift in `ppDispatcher`; 41 dispatchers lack `default:` case; only 3/87 validate params.

**Exit gate:** Every dispatcher (a) has `z.enum` matching its switch cases, (b) has a `default:` that returns structured error, (c) passes params through `validateActionParams`.

| Unit | Task |
|---|---|
| U-PF-02-01 | Fix `aiReasoningDispatcher.ts` — wire 5 orphan actions (mill_harvest_tribal, mill_agi_analyze/quick/optimal/awareness) + delete 8 unreachable `mill_prod_*` / `mill_agi_orch_*` cases |
| U-PF-02-02 | Reconcile `ppDispatcher` 19+19 drift — determine which side is canonical, prune the other |
| U-PF-02-03 | Add `default:` to 41 dispatchers (script-driven mechanical sweep) |
| U-PF-02-04 | Roll out `validateActionParams` pattern (copy from `gsdDispatcher`) to 84 dispatchers; generate `src/schemas/<name>ActionSchemas.ts` for each |
| U-PF-02-05 | Wiring completeness integration test — parse every dispatcher, assert `z.enum == switch cases` |

---

## PERFECT-MS3 — Physics Division-by-Zero Guard Pass 🔴

**Problem:** 37 physics engines, 595 candidate division sites, only a fraction guarded. `KienzleForceModelEngine.ts:428, 495, 669, 705` confirmed unguarded (sin κ=0, flutes=0, empty filter result).

**Exit gate:** Every division in `src/engines/**/*Physics*.ts` + known force/thermal/deflection engines either (a) has preceding `if (denom === 0 || !isFinite(denom)) return errorResult(...)` or (b) uses `safeDivide(num, denom, fallback)` helper.

| Unit | Task |
|---|---|
| U-PF-03-01 | Create `src/utils/safeMath.ts` with `safeDivide(num, denom, fallback, tag)` + `safeSqrt`, `safeLog` variants — pure, logged, typed |
| U-PF-03-02 | Guard pass on 12 force/stability engines (Kienzle, Chatter, StabilityLobe, CuttingForce, TurningForce, StochasticCuttingForce, etc.) |
| U-PF-03-03 | Guard pass on 12 thermal/deflection engines |
| U-PF-03-04 | Guard pass on 13 stochastic/simulation engines (Monte Carlo, ProcessDigitalTwin, ReceptanceCoupling) + `KalmanFilter.ts:218`, `SurfaceFinishPredictor.ts:213` |

---

## PERFECT-MS4 — Type Safety Reclamation 🟡

**Problem:** 40 engines start with `@ts-nocheck`; 658 `as any` + 287 `as unknown as T` casts.

**Exit gate:** `@ts-nocheck` count = 0; top-5 `as any` offenders reduced by 50%.

| Unit | Task |
|---|---|
| U-PF-04-01 | Remove `@ts-nocheck` from 5 safety-relevant files (`PredictionFeedbackOrchestratorEngine`, `AdaptiveCalibrationEngine`, `AnomalyDetectionEngine`, `PhysicsMLHybridEngine`, `CrossPhysicsCouplingEngine`); repair resulting type errors |
| U-PF-04-02 | Remove `@ts-nocheck` from remaining 35 files (triaged by risk) |
| U-PF-04-03 | Reduce `QuoteToShipOrchestratorEngine` from 97 `as any` → <30 (typed stage I/O) |
| U-PF-04-04 | Reduce `PredictionFeedbackOrchestratorEngine` from 28 → <10 |
| U-PF-04-05 | Reduce `PostProcessorPipelineEngine` + `GCodeIntelligencePipelineEngine` casts (16 + 11 → <5 each) |
| U-PF-04-06 | Add CI check: fail build if `@ts-nocheck` introduced in new file |

---

## PERFECT-MS5 — Atomic Writes Everywhere 🟡

**Problem:** 43 engine sites + 14 `.mjs` hooks do `writeFileSync` directly. Torn writes under concurrency.

**Exit gate:** Zero `writeFileSync(path, data)` on state JSON outside `utils/atomicWrite.ts`.

| Unit | Task |
|---|---|
| U-PF-05-01 | Replace 43 engine writeFileSync sites with `atomicWriteJson` — starting with `SystemVariabilityIndexEngine` (SVI coupling file), `AnomalyDetectionEngine`, `FeedbackPersistenceEngine`, `QualityScoreEngine`, `MachineLearningStrategyRankerEngine`, `StrategyRankingUpdateEngine`, `QualityDashboardEngine` |
| U-PF-05-02 | Create `.claude/helpers/atomic-write.mjs` (Node-side counterpart) + replace 14 .mjs hook sites |
| U-PF-05-03 | Add CI check: fail on `fs.writeFileSync` in engine / hook paths unless whitelisted |

---

## PERFECT-MS6 — RCE Surface & JSON Parse Hardening 🔴

**Problem:** `new Function()` in `NLHookEngine.ts` bypassable via Unicode escapes; 250 bare `JSON.parse` across 143 files.

**Exit gate:** Zero `new Function()` / `eval()` in `src/engines/`; all `JSON.parse` wrapped in `safeJsonParse(raw, schema, fallback)`.

| Unit | Task |
|---|---|
| U-PF-06-01 | Replace `NLHookEngine.ts:76,927,938` `new Function()` with restricted AST interpreter (or forbid user code, returning explicit refusal) |
| U-PF-06-02 | Create `src/utils/safeJsonParse.ts` — Zod-schema-gated, typed fallback |
| U-PF-06-03 | Sweep worst 8 offenders: `MemoryGraphEngine`, `DuplicationGuardEngine`, `SystemVariabilityIndexEngine`, `KnowledgeGraphEngine`, `SelfImprovementPatternEngine`, `MITCourseRegistryEngine`, `FDA21CFRPart11Engine`, `TribalKnowledgeEngine` |
| U-PF-06-04 | Sweep remaining 135 files (mechanical replacement script) + CI lint rule |

---

## PERFECT-MS7 — Stub Engine Triage 🔴

**Problem:** 36 stub markers across 7 files. `LatheOrchestrationEngine` has 25 stubs including safety/collision/FAI. `ThreadTurningEngine` ships "not implemented" as G-code comment. `EndToEndPipelineEngine` ships `S0 M03`. `CodingCopilotEngine` is a stub-generator (propagates debt by construction).

**Exit gate:** Zero `throw new Error("Not implemented")` in runtime paths; zero placeholder text in G-code emit paths; `LatheOrchestrationEngine` either fully wired or deregistered.

| Unit | Task |
|---|---|
| U-PF-07-01 | Wire `LatheOrchestrationEngine` — stubs at :571, :585, :597, :604, :610, :617, :623, :917-996 (25 sites) — OR mark deprecated and remove from dispatcher |
| U-PF-07-02 | Fix `ThreadTurningEngine.ts:542` — emit proper thread-turning G-code cycle (G33 / G76 per controller) |
| U-PF-07-03 | Fix `EndToEndPipelineEngine.ts:552` S0 M03 placeholder — compute actual spindle RPM from calc engines before emitting |
| U-PF-07-04 | Audit `CodingCopilotEngine.ts:399` generator — template should emit typed signatures with `throw` markers that CI picks up, OR require upstream spec before generating |
| U-PF-07-05 | Clean remaining stubs: `SolidEditingEngine`, `FixtureCadIngesterEngine`, `HyperMillMaterialPhysicsBridge:127` (invalid P default), `HyperMillThreadStandardEngine:142` (empty DB) |

---

## PERFECT-MS8 — Drift-Proof Hook-Mirror Pattern 🟡

**Problem:** `wedm-physics-constants-gate.mjs:73-82` hard-codes numeric physics constants. If `constants.ts` updates, hook detection silently goes stale. CPP-MS5 proved the engine↔hook parity pattern works — extend it.

**Exit gate:** Every `.mjs` hook that mirrors engine logic has a parity integration test; critical numeric tables loaded dynamically from a generated JSON manifest.

| Unit | Task |
|---|---|
| U-PF-08-01 | Generate `data/state/PHYSICS_CONSTANTS_MANIFEST.json` from `src/physics/constants.ts` at build time; rewrite `wedm-physics-constants-gate.mjs` to load the manifest |
| U-PF-08-02 | Add parity integration tests for `ai-duplication-guard.mjs` ↔ `DuplicationGuardEngine` (replay same query through both, assert same match) |
| U-PF-08-03 | Add parity integration tests for `always-build-guard.mjs` ↔ gap-scan logic |
| U-PF-08-04 | Document the `.mjs ↔ TS engine` anti-drift pattern in CLAUDE.md (promote CPP-MS5 U-CPP37 pattern to convention) |

---

## PERFECT-MS9 — State Schema Versioning Backfill 🟢

**Problem:** 20 of 69 state files lack `schemaVersion`. The missing set includes `BASELINE_INVENTORY.json`, `HEALTH_CHECK_REPORT.json`, `schema-baseline.json` — authoritative files that cannot be migrated.

**Exit gate:** Every JSON in `data/state/` has `schemaVersion: <n>` top-level field.

| Unit | Task |
|---|---|
| U-PF-09-01 | Add `schemaVersion: 1` to 20 identified files; write Zod schema for each in `src/schemas/state/` |
| U-PF-09-02 | Create `src/migrations/stateSchemaBackfill.ts` — idempotent runner |
| U-PF-09-03 | SessionStart hook: scan `data/state/*.json` and log warnings for unversioned files |

---

## PERFECT-MS10 — God-File Decomposition 🟢

**Problem:** `calcDispatcher` 8,888 LOC, `camDispatcher` 7,877, `aiReasoningDispatcher` 5,606, `ppDispatcher` 4,382. Load time > 500ms for calcDispatcher alone.

**Exit gate:** No dispatcher > 2,000 LOC. Each uses category subdispatchers (e.g., `calcCuttingDispatcher`, `calcThermalDispatcher`) that the outer dispatcher federates.

| Unit | Task |
|---|---|
| U-PF-10-01 | Split `calcDispatcher` by domain (cutting / thermal / surface / stability / deflection) |
| U-PF-10-02 | Split `camDispatcher` by CAM system |
| U-PF-10-03 | Split `aiReasoningDispatcher` by reasoning mode |
| U-PF-10-04 | Split `QuoteToShipOrchestratorEngine` (5,450 LOC) into stage-owned engines (already partially done, finish the job) |

---

## PERFECT-MS11 — Orchestration Lock Manager Wiring 🟡

**Problem:** CLAUDE.md §46–51 mandates `DistributedLockManager` for orchestration dispatchers; zero dispatchers import it.

**Exit gate:** `prism_orchestrate`, `prism_autonomous`, `prism_autopilot_d` wrap shared-state operations in `withLock()`.

| Unit | Task |
|---|---|
| U-PF-11-01 | Wire `DistributedLockManager` into `autonomousDispatcher`, `autoPilotDispatcher`, orchestrate paths |
| U-PF-11-02 | Concurrency integration test (2+ parallel dispatcher calls racing same resource → lock serializes them) |
| U-PF-11-03 | Lock-timeout telemetry: log contention events, surface in `PIPELINE_METRICS.json` |

---

## PERFECT-MS12 — Roadmap & Directive Cleanup 🟢

**Problem:** `ULTIMATE-PRISM-ROADMAP-v25.md` coexists with v2; 100 session plans clutter archive; `CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` corrupted.

**Exit gate:** Single authoritative roadmap; corrupted directive fixed; obsolete plans moved to `plans-archive/pre-2026/`.

| Unit | Task |
|---|---|
| U-PF-12-01 | Inspect & repair `state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` (confirmed corrupt per roadmap agent) |
| U-PF-12-02 | Move `ULTIMATE-PRISM-ROADMAP-v25.md` → `plans-archive/superseded/` with a redirect stub pointing to v2 |
| U-PF-12-03 | Triage `plans-archive/claude-plans/` (100 files) — move any still-referenced into `plans-archive/active/`, rest to `plans-archive/pre-2026/` |

---

## PERFECT-MS13 — Test Coverage Push to 50% 🟡

**Problem:** 21.5% coverage (461/2,145 engines with companion tests). Target a firm 50% floor.

**Exit gate:** ≥1,073 engines with companion tests; test count ≥2,500; coverage gate in CI.

| Unit | Task |
|---|---|
| U-PF-13-01 | Generate stubs for 300 top-ranked untested engines (via `AutoTestGeneratorEngine` with Sandvik/ISO citation, but with the fix from U-PF-07-04 preventing stub-emission) |
| U-PF-13-02..08 | Fill in each 100-test batch, split by category (physics, CAM, lathe, WEDM, orch, biz, utility) |

---

## PERFECT-MS14 — ML Reproducibility 🟢

**Problem:** 548 `Math.random()` sites; ML engine weights re-initialized on every import.

**Exit gate:** Every non-test `Math.random()` call routed through seeded PRNG (`seedrandom` or equivalent); reproducibility integration test passes twice with identical inputs.

| Unit | Task |
|---|---|
| U-PF-14-01 | Add `src/utils/seededRng.ts` with xoshiro256** or mulberry32 + seeded factory |
| U-PF-14-02 | Sweep 25 worst offenders: `SpeedFeedDeepLearningEngine` (25), `LatheReinforcementLearningEngine` (23), `ElectrodeDeepLearningEngine` (17), `CrossDisciplinaryDeepLearningEngine` (14), `SpeedFeedUltimateAIEngine` (13), `GeneticAlgorithmEngine` (13), `DifferentialEvolutionEngine` (12), `LatheTransformerEngine` (10), etc. |
| U-PF-14-03 | Determinism integration test — run ML engine twice with same seed, assert bit-identical output |

---

## EXECUTION STRATEGY

1. **Start with MS0** (physics constants) — it unblocks MS1 (safety tests can assert against canonical values), MS3 (guards can trust shared epsilon), MS8 (hook manifests derive from constants).
2. **MS1 + MS3 in parallel** once MS0 lands — both are physics/safety and can run without conflict.
3. **MS2 and MS6** in parallel — dispatcher surface + parse hardening are independent.
4. **MS4, MS5, MS7** are per-file sweeps — suitable for multi-agent parallelization.
5. **MS8–MS14** are hygiene / architectural — lower priority, scheduled after safety-critical phases land.

## CLAIM PROTOCOL

Before starting any PERFECT-MS# milestone, register in `ACTIVE_WORK_REGISTRY.json` via orchestration claim. Respect the AGENT_BOUNDARY_DIRECTIVE — frontend (APP, APPW, FMERGE, WEB, UI) remains Codex-owned. Most PERFECT phases are backend and in-lane for Claude.
