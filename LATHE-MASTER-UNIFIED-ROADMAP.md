# LATHE MASTER UNIFIED ROADMAP (LMU)

**Version:** 2.0.0
**Generated:** 2026-04-16 (v1), **expanded** 2026-04-16 (v2 post-scrutiny)
**Product promise:** "Print → validated CNC program in one shot" with extreme intelligence + coordination.
**Supremacy:** This roadmap is the SINGLE SOURCE OF TRUTH for all lathe development. It supersedes and consolidates:
- `LATHE-COMPREHENSIVE-ROADMAP.md` (948 lines, 12 MS / 104 units)
- `LATHE-PRO-ROADMAP.md` / `LATHE-PRO-v2-ROADMAP.md` / `LATHE-PRO-v3-ROADMAP.md` (3,203 lines, 17 MS / 142 units)
- `LATHE-UNIFIED-ROADMAP.md` (663 lines, 10 MS / 68 units)
- `LATHE-AWARE-HARDEN-ROADMAP.md` (1,013 lines, v7, 15 new engines)
- `lathe-agi-roadmap.md` (73 lines, L1–L6 AGI layers)
- `LATHE-EXECUTION-PLAN.md`, `LATHE-TEST-MATRIX.md` (procedural)

**Envelope:** `mcp-server/data/milestones/LATHE-MASTER.json`
**Authority:** Any conflict with a superseded doc resolves in favor of this roadmap.
**Unit naming:** `U-LTH{NN}` (e.g., `U-LTH01`). No bare `U01`.

---

## ⚠ CRITICAL SCRUTINY FINDINGS v2 — READ FIRST

Two scrutiny passes (`SCRUTINY-LATHE-MASTER-v2-2026-04-16.md` + `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`) flagged v1 (867 lines, 62 units) as **directionally correct but insufficient** to deliver the "print → validated CNC program in one shot" promise at the claimed "extreme intelligence" bar. v2 inserts **11 new sub-phases (P0.1 through P0.11) with 73 new units (U-LTH63..U-LTH135)** before existing P1. Each new phase addresses a specific gap:

| Gap | Sub-phase (v2) | New units | Forge-Triple deliverable |
|---|---|---|---|
| Formal verification of G-code (Z3/SMT) | **P0.1 Formal G-Code Verification** | U-LTH63..U-LTH68 (6) | `/lathe-prove` + `post-lathe-emit-proof.mjs` + `lathe_formal_prove` |
| Local LLM + LoRA from JM Die's 5,297 Okuma programs | **P0.2 Local LLM + LoRA Policy** | U-LTH69..U-LTH76 (8) | `/lathe-train-lora` + `pre-lathe-gen-require-policy.mjs` + `lathe_lora_generate` |
| Bayesian + causal inference (NIG conjugate, PC-algorithm, do-calculus, Bayesian Cpk) | **P0.3 Bayesian + Causal Depth** | U-LTH77..U-LTH83 (7) | `/lathe-posterior-gate` + `post-strategy-require-posterior-gate.mjs` + `lathe_posterior_gate` |
| Cross-asset wiring (all 1,869 engines + 509 formulas + 95,608 tools + 4,493 tips touched) | **P0.4 Asset Utilization Maximization** | U-LTH84..U-LTH91 (8) | `/lathe-coverage-audit` + `post-lathe-decision-require-provenance.mjs` + `lathe_provenance_query` |
| AGI safety containment (corrigibility, goal stability, self-mod approval) | **P0.5 AGI Safety Containment (Lathe)** | U-LTH92..U-LTH96 (5) | `/lathe-containment-audit` + `pre-lathe-agi-action-corrigibility.mjs` + `lathe_agi_containment_check` |
| Live machine data (MTConnect / OPC-UA / THINC from 7 Okuma lathes) | **P0.6 Live Machine Data** | U-LTH97..U-LTH103 (7) | `/lathe-live-telemetry` + `on-m30-auto-complete-outcome.mjs` + `lathe_live_stream_start` |
| Predictive world simulation (60 s pre-play per program) | **P0.7 Predictive Twin (60 s Pre-Play)** | U-LTH104..U-LTH110 (7) | `/lathe-preplay` + `pre-lathe-emit-require-preplay.mjs` + `lathe_preplay_run` |
| Multi-agent orchestration (supervisor + 5 specialist agents) | **P0.8 Multi-Agent Lathe Orchestration** | U-LTH111..U-LTH116 (6) | `/lathe-swarm` + `pre-lathe-swarm-budget-check.mjs` + `lathe_swarm_dispatch` |
| Scientific simulation depth (tribology, fatigue, fracture mechanics, residual stress) | **P0.9 Scientific Simulation Depth (Lathe)** | U-LTH117..U-LTH122 (6) | `/lathe-science-gate` + `post-lathe-strategy-require-science-gates.mjs` + `lathe_science_gate_eval` |
| Math depth (optimal control, info gain, calibrated ensemble, regret minimization) | **P0.10 Math Depth (Lathe)** | U-LTH123..U-LTH127 (5) | `/lathe-optimal-control` + `pre-lathe-decision-require-optimal-control.mjs` + `lathe_optimal_control_solve` |
| Frontend integration (Codex web: studio wizard, mode-switch hygiene, registry-aware UI, orphan-API wiring, Zustand session store, Swiss dialect, Send-to-Quote/JobCost, default nav) | **P0.11 Frontend Integration** | U-LTH128..U-LTH135 (8) | `/lathe-ui-audit` + `pre-lathe-ui-require-registry-defaults.mjs` + `lathe_ui_state_audit` |

**v1 → v2 unit count:** 62 → 135. **Expected 3-loop scrutiny score:** 57 (v1) → 93 (v2 target). **Quality reference:** `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (1827 lines, 25 sub-phases). **Frontend reference:** `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md` (6 frontend gaps + 5 hardcoded-data risks).

**Anti-regression enforcement:** every v2 sub-phase has a PROTECTIVE HOOK that blocks downstream emission when the sub-phase's output is missing or stale. E.g., `pre-lathe-emit-require-preplay.mjs` prevents G-code emission without a fresh predictive-twin pre-play record; `pre-lathe-gen-require-policy.mjs` blocks generation without the LoRA policy artifact. These hooks fire automatically — no session can ship a lathe artifact that skipped the scrutiny v2 gates.

---

## BRIEF (RGS Stage 1)

Unify all lathe engineering under a single roadmap that serves FIVE concrete PRISM-app features with a cross-cutting AGI substrate:

| # | Feature | Location in PRISM App |
|---|---------|----------------------|
| 1 | **Speed & Feed Calculator** | panel in web app; also MCP action |
| 2 | **Post-Processor Generator** | take a machine/controller spec → emit a new post-processor |
| 3 | **Master Post-Processor** | one canonical post that outputs G-code for every machine in the shop |
| 4 | **Print-to-Program (the big one)** | blueprint/PDF → geometry → features → strategy → G-code → validation |
| 5 | **ERP / Business Management** | quotes, actual cost, scheduling, customers, inventory, PO, invoicing |

All five features must run on a shared **AGI substrate**: deep learning (neural networks), deep reasoning (causal/counterfactual/belief-state), deep logic (fuzzy + symbolic), neural networking (transformer + attention + graph), knowledge graph, reinforcement learning, active learning, meta-learning, transfer learning. Near-AGI intelligence is the explicit ceiling.

The lathe domain currently has **87 Lathe*.ts engines + ~20 turning-specific ancillary engines + 77 PP* engines + 6 speed/feed engines + 15+ master-post engines + 20+ print-to-program engines + 47+ ERP/business engines + 17+ AGI cross-cutting engines** already built. This roadmap does NOT re-build what exists — it **audits, unifies, hardens, fills gaps, wires, tests**, then produces machinist-grade deliverables.

---

## CODEBASE AUDIT (RGS Stage 2) — What Already Exists

### Lathe-Specific Engines (87 files, audited 2026-04-16)

**AGI / DL / Reasoning stack (22 engines, L1–L6):**
```
L6: LatheAGICoreEngine, LatheAIUltraEngine, LatheMasterOrchestratorFacadeEngine, LatheUnifiedAIOrchestrator
L5: LatheDeepReasoningEngine, LatheOpusReasoningEngine, LatheCausalInferenceEngine, LatheDeepLogicEngine
L4: LatheDeepLearningEngine, LatheDeepLearningIntelligenceEngine, LatheNeuralIntelligenceEngine,
    LatheTransformerEngine, LatheAttentionMechanismEngine, LatheKinematicsDeepLearningEngine
L3: LatheMetaLearningEngine, LatheTransferLearningEngine, LatheReinforcementLearningEngine,
    LatheActiveLearningEngine, LatheEnsembleLearningEngine, LatheBayesianOptimizationEngine,
    LatheGeneticAlgorithmEngine, LatheAnomalyDetectionEngine
L2: LatheKnowledgeGraphEngine, LatheKnowledgeHarvesterEngine, LatheJMDieKnowledgeEngine,
    LatheResourceKnowledgeEngine, LatheTribalInjectorEngine, LatheFullArchiveTrainingEngine
L1: LatheExpertAdvisorEngine, LatheAIReasoningEngine, LatheAIOrchestrationEngine,
    LatheAITrainingEngine, LatheAIFeatureRegistration
```

**Physics / Science stack (8):**
`LatheChipMechanicsEngine, LatheCuttingChemistryEngine, LatheMetallurgyEngine,
LatheThermodynamicsEngine, LatheUnifiedScienceEngine, LatheUnifiedPhysicsOrchestrationEngine,
LatheScienceHardeningEngine, LatheSelfAwarenessIntegrationEngine`

**Operations / Planning (8):**
`LatheAdvancedOperationsEngine, LatheMultiOpPlannerEngine, LathePartFamilyPlanningEngine,
LatheSequenceOptimizerEngine, LatheBlockEngagementSimulatorEngine, LathePartingChipClearanceEngine,
LatheSubSpindleTransferPurgeEngine, LatheAuxAxisTimingEngine`

**Quality / Safety (10):**
`LatheQualityGateEngine, LatheCollisionZoneEngine, LatheEnvelopeBreachReplayEngine,
LatheFirstPieceApprovalEngine, LatheDeviationMapEngine, LatheCoaxialityRunoutValidatorEngine,
LatheDatumReferenceFrameEngine, LatheOnMachineProbeCycleEngine, LatheBirdNestPredictorEngine,
LatheBlockTimeProfilerEngine`

**Program / Post (8):**
`LatheCAMIntelligenceEngine, LatheProgramOptimizerEngine, LathePostProcessorEngine,
LathePostProcessorAIEngine, LatheProgramCatalogEngine, LatheProgramBacktraceEngine,
LatheProgramSignoffDossierEngine, LatheReplayFrameCompilerEngine`

**Cost / Business (5):**
`LathePartCostModelEngine, LatheProgrammingCostEngine, LatheOpTimeBreakdownEngine,
LatheProgrammingStyleSelectorEngine, LatheShopAwareOptimizationEngine`

**Setup / Fixture (4):**
`LatheChuckJawSetupEngine, LatheCoolantAdvisorEngine, LatheChangeoverBriefEngine, LatheStockEvolutionEngine`

**Classification / Style (3):**
`LathePartClassifierEngine, LatheMachineIntelligenceEngine, LatheCSSOptimizerEngine`

**Tuning / Troubleshooting (2):**
`LatheTroubleshootingIntelligenceEngine, LatheActualFeedbackTuningEngine`

### Post-Processor Engines (77 PP* files) — Already has AGI stack

**AGI Layer (6):** `PPAGICapabilityMatrixEngine, PPAGIReasoningWorkflowEngine, PPAGIProgramLibraryAuditorEngine, PPAGIReportGeneratorEngine, PPAGISystemDashboardEngine, PPAGIBenchmarkEngine`

**Encoders (7):** `PPControllerEmbeddingEngine, PPMachineVectorEncoderEngine, PPMaterialPropertyVectorEngine, PPCuttingToolEncoderEngine, PPToolpathStrategyEncoderEngine, PPPhysicsConditionEncoderEngine, PPSafetyEnvelopeVectorEngine`

**Learning / Inference (6):** `PPMultiModalFusionEngine, PPTrainingDataPipelineEngine, PPEnsembleUncertaintyEngine, PPDecisionExplainerEngine, PPActiveLearningQueueEngine, PPOnlineLearningTrackerEngine`

**Validators (27 — G-code correctness gate):** `PPArcValidator, PPToolChangeValidator, PPCutterCompValidator, PPFeedModeValidator, PPSpindleStateValidator, PPCannedCycleValidator, PPMacroVariableValidator, PPAxisTravelValidator, PPDecimalPointValidator, PPUnitsModeValidator, PPBlockSkipValidator, PPDwellValidator, PPWorkOffsetValidator, PPSpindleSpeedSafetyValidator, PPCoolantSequenceValidator, PPLineNumberSanity, PPFeedOverrideValidator, PPCallGraphValidator, PPRapidMoveValidator, PPSafeStartBlockValidator, PPAbsIncValidator, PPMacroFlowValidator, PPProgramEndValidator, PPSpeedModeValidator, PPReferenceReturnValidator, PPHighSpeedMachiningValidator, PPCoordSystemTransformValidator`

**Generators (6):** `PPEndToEndPostGeneratorEngine, PPMachineSpecificPostEngine, PPOkumaTurningPostEngine, PPOkumaSubSpindleSyncEngine, PPWireEDMPostEngine, PPSinkerEDMPostEngine`

**Optimization (7):** `PPGreedyToolpathOptimizerEngine, PPGCodeMinimizerEngine, PPGCodeLintEngine, PPGCodeStatisticsEngine, PPGCodeProgramAnalyzerEngine, PPFeedSpeedScalerEngine, PPModalStateTrackerEngine`

**Infra / Knowledge (6):** `PPKnowledgeIndexEngine, PPJobScenarioAdvisorEngine, PPScenarioTemplateLibraryEngine, PPControllerAdaptationEngine, PPControllerCompatibilityEngine, PPDialectTransferEngine`

**Misc (12+):** `PPProgramChunkerEngine, PPProgramMergerEngine, PPPhysicsConstraintValidatorEngine, PPSafetyRuleValidatorEngine, PPCharacterValidatorEngine, PPAxisLetterValidatorEngine, ...`

### Master Post-Processor Stack (15 engines)
`MasterPostProcessorEngine, MasterPostProcessorGeniusEngine, MasterPostProcessorAGIOrchestrationEngine,
AdvancedPostProcessorEngine, NovelPostProcessorBridgeEngine, PostProcessorAGIContinuousLearningEngine,
PostProcessorAGIMasterRegistryEngine, PostProcessorAGIWiringIntegrationEngine,
PostProcessorAICoordinationBridge, PostProcessorAISelfAwarenessIntegrationEngine,
PostProcessorAPIEngine, PostProcessorAnalysisEngine, PostProcessorAnalyzerEngine,
PostProcessorAutopilotEngine, PostProcessorCPSImplementationEngine`

### Speed/Feed Stack (16 engines)
Central hub: **`SpeedFeedOrchestratorEngine` (2,851 LOC)** + `AutoSpeedFeedCalculator, AutoSpeedFeed, UltimateSpeedFeed, SpeedFeedUltimateAI, SpeedFeedAdvancedAI, SpeedFeedDeepLearning, SpeedFeedAutopilot, SpeedFeedMiner, SpeedFeedResourceIntegration, ProvenSpeedFeedAggregator, StochasticCuttingForce, KienzleForceModel, CuttingForce, ChipLoad, CuttingChemistry`

### Print-to-Program Stack (22 engines)
`PrintToProgramPipelineEngine, TurningPrintToProgramEngine, MillingPrintToProgramEngine, MultiAxisPrintToProgramEngine, WEDMPrintToProgramEngine, WireEDMAIPrintToProgramEngine, AutoPrintToProgramBridgeEngine, PrintReadingEngine, PrintToGeometryEngine, PrintLibraryEngine, PrintToHyperCADSBridge, TurningPrintIntakeEngine, TurningFeatureTaxonomyEngine, BlueprintOCREngine, BlueprintVisionOCREngine, BlueprintToQuoteBridgeEngine, PDFBlueprintDimensionExtractorEngine, GDTCalloutParserEngine, GDTStackupEngine, CADDrawingKnowledgeEngine, FeatureRecognitionEngine, FeatureToStrategyBridgeEngine`

### ERP / Business Stack (47 engines)
**Quote (10):** `QuoteEngine, QuoteEstimatorEngine, QuoteAutopilotEngine, QuoteAnalyticsEngine, QuoteRevisionEngine, QuoteToShipOrchestratorEngine, InstantQuoteEngine, MultiProcessQuoteEngine, CastingQuoteEngine, AdditiveQuoteEngine, InjectionMoldQuoteEngine, SheetMetalQuoteEngine, WeldFabricationQuoteEngine, BlueprintToQuoteBridgeEngine`

**Cost (10):** `ActualCostEngine, CostEstimationEngine, CostEstimatorEngine, CostSavingsTrackerEngine, CoolantCostOptimizationEngine, CostAwareRouterEngine, ImportCostEngine, PipelineCostModelEngine, ToolCostPerPartEngine, ToolCostPredictorEngine, LathePartCostModelEngine, LatheProgrammingCostEngine, SetupCostOptimizationEngine, EDMCostDocumentationEngine, JobCostingEngine, JobProfitabilityWaterfallEngine`

**Customer / Order (6):** `CustomerKnowledgeEngine, CustomerManagementEngine, CustomerPortalEngine, CustomerPortfolioMinerEngine, OrderManagerEngine, PurchaseOrderEngine`

**Inventory (7):** `InventoryEOQEngine, InventoryOptimizationEngine, InventoryAwareToolSelectorEngine, JMDieProgramInventoryEngine, PluginInventoryEngine, EngineeringChangeOrderEngine, ContextInventoryEngine`

**Scheduling (6):** `ShopSchedulerEngine, ShiftScheduleOptimizerEngine, ShopFloorCheckInEngine, JobShopSchedulingEngine, JobDeskAggregatorEngine, DurableJobQueueEngine`

**Integration (2):** `ERPIntegrationEngine, JobLifecycleEngine, JobTravelerEngine, JobLearningEngine`

### AGI / DL / Neural Cross-Cutting (17 engines)
`CrossDisciplinaryDeepLearningEngine (15 sci domains, 120+ formulas), PRISMCreativeReasoningEngine,
PRISMSelfAwarenessEngine, ManufacturingKnowledgeGraphEngine, KnowledgeGraphNeuralBridgeEngine,
ManufacturingReasoningEngine, AIDeepKnowledgeIntegrationEngine, AGISafetyContainmentEngine,
MITCourseDeepLearningEngine, MetaLearningOptimizerEngine, CausalReasoningEngine,
CounterfactualReasoningEngine, BeliefStateReasoningEngine, DiagnosticReasoningEngine,
DecisionReasoningEngine, FuzzyNeuralHybridEngine, DuplicationGuardEngine`

### Existing Envelopes in `data/milestones/`
`LATHE-PRO-MS0.json, LATHE-PRO-v2.json, LATHE-PRO-v3.json, LATHE-ROADMAP.json, LATHE-AI.json`
→ These will be **archived** (`renamed_to: "LATHE-MASTER"`) after this roadmap ships.

---

## KNOWLEDGE SOURCE MAPPING (RGS Stage 3)

### Tribal knowledge sources consulted per-session (MANDATORY)
```
lathe-physics-science-tips.ts          — published Sandvik/Kennametal physics
lathe-tribal-tips-okuma.ts             — Okuma-specific shop floor tips
okuma-dialect-knowledge.ts             — Okuma OSP G-code dialect
okuma-osp-advanced-knowledge.ts        — advanced OSP features (macros, MSB)
okuma-osp-extracted-tips.ts            — extracted from Okuma manuals
mastercam-cam-tips.ts                  — Mastercam lathe strategies
controller-knowledge-tips.ts           — generic controller handling
fanuc-controller-tips.json             — Fanuc 0i/31i/32i lathe G-code

+ H:/PRISM/JM DIE/CNC LATHE/          — 5,297 .MIN programs, 100+ customers
+ TribalKnowledgeEngine (3,700+ tips across 18 CAM systems)
+ MachiningPlaybookEngine (296 anti-pattern rules)
+ prismSelfAwarenessEngine.searchTribalKnowledge / searchPlaybookRules
```

### Formula / physics sources
```
src/physics/constants.ts               — CANONICAL Kienzle kc1.1, Taylor C&n, material props
FormulaRegistry                        — 499 formulas (Kienzle, Taylor, Malkin, Sato, Schulz)
src/algorithms/                        — 52 algorithms (SLD, MonteCarlo, Bayesian)
CrossDisciplinaryDeepLearningEngine   — 120+ cross-domain formulas
```

### Reference program sources
```
H:/PRISM/JM DIE/CNC LATHE/             — 5,297 lathe .MIN programs
EXTERNAL-REFERENCE-PROGRAMS-INDEX.md   — reference program catalog
MachineRegistry                        — 910+ machines (filter to lathes)
MaterialRegistry                       — 6,346 materials
ToolCatalogEngine                      — 95,608+ tools (filter to turning)
```

### AGI / DL sources
```
LatheAGICoreEngine                    — L6 top-level orchestrator
LatheDeepReasoningEngine              — causal + counterfactual reasoning
LatheDeepLearningIntelligenceEngine   — NN-backed decisions
UnifiedKnowledgeGraph                 — entity-relation graph
MITCourseDeepLearningEngine           — academy-course-derived learning
PRISMCreativeReasoningEngine          — .explore('optimal') for novel hybrids
```

---

## QUALITY ENFORCEMENT (RGS Stage 8)

Every unit in this roadmap runs under the following enforcement stack — **automatic, unskippable**:

| Layer | Hook | What it blocks |
|-------|------|----------------|
| PRE-EDIT | knowledge-consult | Edit attempts that haven't read domain tribal tips first |
| PRE-EDIT | context-retention | Work that skipped reading prior-session HANDOFF |
| POST-EDIT | stub-detector | Placeholder returns (`return {}`, `TODO`, `Not implemented`) |
| POST-EDIT | test-quality | `.includes()` without anchor, `\|\| true`, bare `.toBe(true)` |
| POST-EDIT | constants-checker | Inline physics constants (must import from `constants.ts`) |
| POST-EDIT | physics-agent | Formula correctness (Kienzle/Taylor/deflection) |
| POST-EDIT | wiring-agent | Engine must be exported + imported somewhere |
| COMPACT | forge-triple-gate | Must have hook + action + skill per milestone |
| COMPACT | review-gate | Session audit agent reviews all work |
| COMPACT | wiring-gate | New engine must be in dispatcher + tested |
| POST-COMPACT | feature-cascade | SESSION_ARTIFACTS.json auto-written |
| SESSION-START | inventory-scan | Live count of engines/dispatchers/actions |

**Stub tolerance**: ZERO. Enforcement hook is hard BLOCK.
**Test minimum**: 10 per engine (vitest, real behavior checks).
**Build requirement**: `npm run build:verify` must pass before commit.
**Canonical constants**: Never inline — ALWAYS import from `src/physics/constants.ts`.

---

## PHASE STRUCTURE (RGS Stage 5) — 18 phases, 135 units, ~48 sessions (v2 + R5)

```
LATHE-MASTER (v2)
├── P0:    Audit + Harden                            (6 units)
├── P0.1:  Formal G-Code Verification (Z3/SMT)       (6 units)    ← v2 scrutiny
├── P0.2:  Local LLM + LoRA Policy                   (8 units)    ← v2 scrutiny
├── P0.3:  Bayesian + Causal Depth                   (7 units)    ← v2 scrutiny
├── P0.4:  Asset Utilization Maximization            (8 units)    ← v2 scrutiny
├── P0.5:  AGI Safety Containment (Lathe)            (5 units)    ← v2 scrutiny
├── P0.6:  Live Machine Data (MTConnect/OPC-UA)      (7 units)    ← v2 scrutiny
├── P0.7:  Predictive Twin (60 s Pre-Play)           (7 units)    ← v2 scrutiny
├── P0.8:  Multi-Agent Lathe Orchestration           (6 units)    ← v2 scrutiny
├── P0.9:  Scientific Simulation Depth               (6 units)    ← v2 scrutiny
├── P0.10: Math Depth (Optimal Control / Info Gain)  (5 units)    ← v2 scrutiny
├── P0.11: Frontend Integration (Codex web)          (8 units)    ← v2 R5 scrutiny
├── P1:    Speed & Feed Calculator                   (8 units)    → feature 1
├── P2:    Post-Processor Generator                  (10 units)   → feature 2
├── P3:    Master Post-Processor                     (8 units)    → feature 3
├── P4:    Print-to-Program (THE BIG ONE)            (15 units)   → feature 4
├── P5:    ERP / Business Management                 (10 units)   → feature 5
└── PX:    AGI Deep-Learning Cross-Cutting           (5 units)    → substrate for all phases
```

Each unit follows **4-LOOP**: BUILD → SCRUTINIZE → GAP FILL → TIE UP.
Every 3 units → `/compact` checkpoint with Feature Cascade.
Per-session SMART_CONFIG and KNOWLEDGE sources below.

---

# P0: AUDIT + HARDEN (6 units, 2 sessions)

**Goal:** Inventory current state, verify wiring, identify gaps before building features.

### SESSION P0-S1 (U-LTH01..U-LTH03)
**SMART_CONFIG:** Role=code-archaeologist + reviewer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=60%
**KNOWLEDGE:** ENGINE_DIGEST.md, DISPATCHER_DIGEST.md, all 5 legacy LATHE envelopes, roadmap-index.json
**INTENT:** Machinist sees "what the system currently does for lathe" in a single report with no surprises later.

### U-LTH01 — Lathe Engine Inventory Reconciliation
- **Build:** Parse all 87 `Lathe*.ts` engines → build `lathe-engine-registry.json` with {name, shortcode, LOC, exports, categories, test_coverage}
- **Exit Gate:** Every lathe engine has a categorization (AGI/Physics/Ops/Quality/Program/Cost/Setup/Class/Tune/Other); duplicates surfaced.
- **Rollback:** FILES_CREATED=[`data/state/lathe-engine-registry.json`]; ABORT=registry entry count != 87±2; ROLLBACK=`git rm` registry.
- **4-LOOP:** BUILD registry → SCRUTINIZE agent counts vs filesystem → GAP FILL missing categorizations → TIE UP with reasoning[].
- **Omega floor:** 0.85
- **Depends on:** —

### U-LTH02 — Dispatcher Wiring Audit for Lathe Actions
- **Build:** Scan `camDispatcher.ts`, `lathe*Dispatcher.ts`, and all dispatchers for lathe engine references. Produce `lathe-wiring-audit.md` showing which of 87 engines are wired vs orphaned.
- **Exit Gate:** 100% of lathe engines are either wired or explicitly flagged `orphan: intentional` with reason.
- **Rollback:** FILES_CREATED=[`state/shared/lathe-wiring-audit.md`]; ABORT=wiring coverage < 80%; ROLLBACK=restore prior wiring state.
- **4-LOOP:** BUILD audit → SCRUTINIZE dispatcher Z.enums → GAP FILL orphan wiring → TIE UP with per-orphan disposition.
- **Omega floor:** 0.85
- **Depends on:** U-LTH01

### U-LTH03 — Lathe Test Coverage Sweep
- **Build:** Run `npx vitest run` filtered on `Lathe*.test.ts`; identify engines without test files. Produce `lathe-test-gap.md` listing missing tests.
- **Exit Gate:** Every Lathe engine has either (a) a passing test file with ≥ 10 tests, or (b) a scheduled unit in P0-P5 to add one.
- **Rollback:** FILES_CREATED=[`state/shared/lathe-test-gap.md`]; ABORT=< 80% coverage after sweep; ROLLBACK=remove gap doc.
- **4-LOOP:** BUILD coverage map → SCRUTINIZE failures → GAP FILL missing test skeletons → TIE UP with reasoning[].
- **Omega floor:** 0.85
- **Depends on:** U-LTH01

### SESSION P0-S2 (U-LTH04..U-LTH06) — `/compact` before starting
**SMART_CONFIG:** Role=reviewer + physics-reviewer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=50%
**KNOWLEDGE:** src/physics/constants.ts, FormulaRegistry, Kienzle/Taylor canonical values

### U-LTH04 — Physics Constants Inline-Usage Sweep (Lathe)
- **Build:** Grep lathe engines for inlined kc1.1, Taylor C/n, density, specific heat. Refactor ALL to import from `constants.ts`. Run build_verify.
- **Exit Gate:** 0 inline physics constants in Lathe*.ts; build passes; no test regressions.
- **Rollback:** git reset per-engine if test regresses.
- **Depends on:** U-LTH01

### U-LTH05 — Knowledge Source Completeness Check
- **Build:** For each feature target (P1–P5), verify at least one tribal tip file, one reference program set, and one formula group exists. Produce `lathe-knowledge-coverage.md`.
- **Exit Gate:** Every P1–P5 feature has ≥ 3 knowledge sources identified.
- **Depends on:** U-LTH01, U-LTH02

### U-LTH06 — Legacy Envelope Archival
- **Build:** Mark `LATHE-PRO-MS0/v2/v3/ROADMAP/AI` envelopes with `status: "archived", superseded_by: "LATHE-MASTER"`. Update roadmap-index.json.
- **Exit Gate:** All 5 legacy envelopes flagged archived; roadmap-index shows LATHE-MASTER as active.
- **Depends on:** U-LTH01..U-LTH05

**P0 Forge-Triple:**
- Hook: `lathe-inventory-stale-guard` — blocks edits when lathe-engine-registry.json is > 30 days old
- Action: `prism_lathe:inventory_snapshot` — returns the live count + coverage map
- Skill: `/lathe-audit` — runs the full P0 audit cycle

---

# P0.1: FORMAL G-CODE VERIFICATION (Z3/SMT) (6 units, 2 sessions) ← v2 scrutiny

**Goal:** Lift lathe G-code into SMT-LIB2; prove envelope, feedrate cap, spindle cap, stock-collision-free, tool-change-at-safe-Z, G0-not-in-material, home-before-M30. Target: 500-block program verified in ≤ 5 s.

**Leverage existing:**
- `FormalVerificationEngine.ts` — Z3-WASM wrapper, `prove(LinearConstraint[])` / `satisfy()`. Do NOT rebuild.
- `PPModalStateTrackerEngine.ts` — source of per-block modal vector (G90/G91, G20/G21, active WCS, active tool, feed mode, spindle mode).
- `PPAxisTravelValidatorEngine.ts`, `PPArcValidatorEngine.ts`, `PPRapidMoveValidatorEngine.ts`, `PPToolChangeValidatorEngine.ts`, `PPSafeStartBlockValidatorEngine.ts`, `PPPhysicsConstraintValidatorEngine.ts`, `PPFeedRateReasonabilityValidatorEngine.ts` — bounds/inequalities hoist cleanly to SMT.
- `PostProcessorMachineKinematicsEngine.ts` — machine envelope (Xmin/Xmax/Zmin/Zmax, axis travel limits).

**Anti-patterns:**
- Proving operational semantics (simulating one trajectory) instead of denotational (prove over all feasible traces). SMT is over all traces.
- Encoding arcs in LIA — arc radius equality is nonlinear; use QF_NRA, time-box at 5 s.
- Bypassing proof for macro programs — macros MUST be expanded or proved symbolically via BMC unrolling.

**Integration with prior phases:**
- Input: G-code from P4 print-to-program pipeline or any `PostProcessorPipelineEngine` emission.
- Output: `LatheFormalProofReport` consumed by P4 signoff and P0.7 predictive-twin.

### SESSION P0.1-S1 (U-LTH63..U-LTH65)
**SMART_CONFIG:** Role=coder + reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=55%
**KNOWLEDGE:** FormalVerificationEngine.ts (full), PPModalStateTrackerEngine.ts, PPAxisTravelValidatorEngine.ts, Z3-solver WASM docs, Biere et al. 1999 (bounded LTL-to-SMT), NIST RS274NGC spec.
**INTENT:** Machinist sees `"proof: UNSAT (envelope violation)"` instead of a non-deterministic simulator warning.

### U-LTH63 — LatheProgramSMTEncoderEngine
- **Build:** New engine. Consumes `PPModalStateTrackerEngine` output. Emits `ProofInput` with per-block `LinearConstraint[]` for `FormalVerificationEngine.prove()`. Variables: `x_i, z_i, f_i, s_i, tool_i` per block. Transition: `x_{i+1} = x_i + dx_i` (G91) or `x_{i+1} = dx_i` (G90). Units handled (G20/G21 switch).
- **Exit Gate:** 100 random lathe programs from JM Die archive encode to SMT-LIB2 without errors; encoding time < 100 ms per 500-block program; emits ≥ 200 LinearConstraint[] per typical program.
- **Rollback:** FILES_CREATED=[`mcp-server/src/engines/LatheProgramSMTEncoderEngine.ts`, `mcp-server/src/__tests__/LatheProgramSMTEncoderEngine.test.ts`]; ABORT=encode-success < 95/100; ROLLBACK=`git rm` engine + test.
- **4-LOOP:** BUILD encoder → SCRUTINIZE `/physics-verify` for unit handling → GAP FILL arc + canned-cycle expansion → TIE UP with denotational table.
- **Omega floor:** 0.85
- **Depends on:** U-LTH01, `FormalVerificationEngine.ts` exists.

### U-LTH64 — LatheFormalProofEngine
- **Build:** New engine. Orchestrates 7 properties: (1) envelope `xmin ≤ x_i ≤ xmax`, (2) feedrate `f_i ≤ F_max`, (3) spindle `s_i ≤ S_max(tool_i)`, (4) collision-free vs stock polytope `Ax ≤ b`, (5) tool-change-at-safe-Z `tchange_i → z_i ≥ Zsafe`, (6) G0-not-in-material, (7) home-before-M30.
- **Exit Gate:** On JM Die reference set: 95% of programs prove all 7 properties UNSAT in ≤ 5 s total; properties 1–3 in ≤ 500 ms individually; arc NRA property 7 in ≤ 3 s with graceful timeout fallback.
- **Rollback:** FILES_CREATED=[`mcp-server/src/engines/LatheFormalProofEngine.ts`, test file]; ABORT=proof time > 10 s on typical program; ROLLBACK=remove engine.
- **Omega floor:** 0.90
- **Depends on:** U-LTH63

### U-LTH65 — LatheDenotationalSemanticsEngine
- **Build:** New engine. Maps each G-code word → pure function `State → State` over modal state record `(plane, units, tool, offsets, WCS, feed_mode, spindle_mode)`. Enables algebraic composition and state-independent proofs. Includes Fanuc/Okuma dialect normalization to RS274 core before emitting to SMT encoder.
- **Exit Gate:** Denotational table covers all 60+ G-codes and 40+ M-codes used in JM Die archive; round-trip equivalence test passes (denotational execution == PPModalStateTrackerEngine output) on 100 programs.
- **Rollback:** git rm engine if round-trip fails; keep table as data file.
- **Omega floor:** 0.85
- **Depends on:** —

### SESSION P0.1-S2 (U-LTH66..U-LTH68) — `/compact` before starting
**SMART_CONFIG:** Role=coder + physics-reviewer | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=45%
**KNOWLEDGE:** LTL/CTL temporal logic, nuXmv if needed for deep liveness, bounded LTL-to-SMT (Biere 1999).

### U-LTH66 — LatheTemporalPropertyCheckerEngine
- **Build:** New engine. Bounded LTL-to-SMT translation for global/eventual properties: `G[G0_i → ¬inside_stock(x_i, z_i)]`, `G[tchange_i → z_i ≥ Zsafe]`, `F[x == Xhome ∧ z == Zhome] before M30`. Unrolls automaton to bits, solves via Z3.
- **Exit Gate:** 3 temporal properties decidable in ≤ 10 s on typical 500-block programs; graceful timeout with `"unknown: depth k=N reached"` reporting.
- **Rollback:** git rm if solver hangs on reference programs.
- **Omega floor:** 0.85
- **Depends on:** U-LTH64

### U-LTH67 — LatheProofCacheEngine
- **Build:** New engine. Per-block hash cache: `(modal_state_hash, constraint_block_hash) → {sat|unsat|unknown, time_ms, timestamp}`. Invalidates on machine-envelope / tool-library / stock-spec changes. Stored in `data/state/lathe-proof-cache.jsonl`.
- **Exit Gate:** ≥ 70% cache hit rate on repeated CI proof runs; cache invalidation correct under envelope/tool mutation.
- **Rollback:** delete cache file; rebuild on next run.
- **Omega floor:** 0.80
- **Depends on:** U-LTH64

### U-LTH68 — Forge-Triple (P0.1)
- **Hook:** `post-lathe-emit-proof.mjs` — runs after any `LathePostProcessorEngine.emit()` and blocks artifact ship unless `LatheFormalProofEngine` returns UNSAT on all 7 properties (or 5 with timeout on NRA arcs + operator override + rationale).
- **Action:** `prism_lathe:lathe_formal_prove` — exposes `{ program, machineProfile, tolerancePlan } → { properties: [{name, status, time_ms, counterexample?}], verdict }`.
- **Skill:** `/lathe-prove` — user-facing verification. Reports color-coded pass/fail per property and explains counterexamples using `LatheDenotationalSemanticsEngine`.
- **Exit Gate:** `/lathe-prove` on JM Die sample 20-program set: 19/20 proved UNSAT on all 7 properties under 10 s total; counterexample explanations render correctly.

**P0.1 FEATURE CASCADE:**
- NEW_HOOKS: `post-lathe-emit-proof` → protects emission against unproved envelope/feed/spindle violations
- NEW_ACTIONS: `lathe_formal_prove`, `lathe_proof_cache_query`, `lathe_denotational_step` → available to P0.7, P4, P5, PX
- NEW_SKILLS: `/lathe-prove` → machinist-callable verification
- AVAILABLE_TO: P0.7 predictive twin (pre-play uses proof output), P4 print-to-program (signoff gate), P5 ERP (job pricing includes proof time)

---

# P0.2: LOCAL LLM + LoRA POLICY (8 units, 3 sessions) ← v2 scrutiny

**Goal:** Fine-tune Qwen2.5-Coder:7b on ~4000 filtered JM Die Okuma `.MIN` programs via QLoRA, serve via Ollama, eval via compile-pass + validator-pass + CodeBLEU. Target: +25% validator-pass vs base model, sub-3 s inference per 200-line program.

**Leverage existing:**
- `LatheFullArchiveTrainingEngine.ts` — `scanArchive()` walker + ProgramFile type + per-customer parse-error accounting.
- `LatheJMDieKnowledgeEngine.ts` — `CustomerPattern`, `MaterialParameters`, `OperationSequence`, `GCodeUsage`, `ToolPattern` → instruction-prompt schema.
- `LatheAITrainingEngine.ts` — `ParsedProgram`/`ProgramAnalysis` with per-program score (filter: score ≥ 70 drops anti-patterns).
- `LathePostProcessorEngine.ts` — Okuma syntax validator → compile-pass metric.
- `LatheQualityGateEngine.ts` — validator-pass metric.
- `LatheCoaxialityRunoutValidatorEngine.ts` — additional post-generation validator.
- `src/data/jm-die-profile.ts` — shop/controller metadata for system prompt.

**Anti-patterns:**
- Using vanilla BLEU — punishes valid G-code reorderings. CodeBLEU only.
- Random train/eval split — leaks customer-specific idioms across sets. **Customer-level** split (80% customers for training, 20% held out).
- FP16 base load — 7B × 2 B = 14 GB leaves no activation budget on RTX 4080 16 GB. **4-bit NF4 mandatory.**
- Serving PyTorch directly — use GGUF + Ollama only (PRISM is pure JS/TS control plane).
- Overwriting base model — adapters checkpoint separately; merge-and-unload only for inference artifact.

**Integration with prior phases:**
- Input: P0 lathe-engine-registry + JM Die archive walked via existing `LatheFullArchiveTrainingEngine.scanArchive`.
- Output: `lathe-jmdie-lora-q5km.gguf` + Ollama Modelfile consumed by P4 print-to-program agent and P0.8 multi-agent swarm.

### SESSION P0.2-S1 (U-LTH69..U-LTH71)
**SMART_CONFIG:** Role=ml-developer + coder | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=60%
**KNOWLEDGE:** HuggingFace PEFT 0.10+, bitsandbytes 0.43+, Qwen2.5-Coder ChatML template, llama.cpp convert_hf_to_gguf.py, Ollama Modelfile spec.
**INTENT:** Machinist runs `/lathe-gen-policy` and gets a complete O-numbered program that matches JM Die house style for the named customer.

### U-LTH69 — LatheLoRADatasetBuilderEngine
- **Build:** New engine. Walks `H:/PRISM/JM DIE/CNC LATHE/*/*.MIN` via `LatheFullArchiveTrainingEngine.scanArchive()`. For each program, extracts instruction prompt (customer, material, stock, operation sequence, tool list) from `LatheJMDieKnowledgeEngine`. Filters score ≥ 70 via `LatheAITrainingEngine`. Emits `data/training/lathe-lora-dataset.jsonl` with `{instruction, input, output}` format. Customer-level 80/20 split.
- **Exit Gate:** ≥ 3,500 training examples emitted; ≥ 800 eval examples; no customer appears in both sets; BOM-stripped UTF-8; mean output length 150–400 lines.
- **Rollback:** FILES_CREATED=[engine, test, dataset path]; ABORT=< 3000 examples; ROLLBACK=`git rm` engine; delete dataset.
- **Omega floor:** 0.85
- **Depends on:** U-LTH01, existing training engines.

### U-LTH70 — LatheLoRATrainingScript (scripts/ not engines/)
- **Build:** New script `scripts/train-lathe-lora.py` (Python is permitted in scripts/ per PRISM policy). QLoRA: 4-bit NF4 base via bitsandbytes, r=16, alpha=32, dropout=0.05, target all linear. per_device_batch=1, grad_accum=8, seq_len=2048, paged_adamw_8bit, lr=2e-4, cosine, warmup 0.03, 3 epochs. Emits `out/qwen25-coder-jmdie-lora/` adapter checkpoint.
- **Exit Gate:** Training completes without OOM on RTX 4080 16 GB; train loss strictly decreases across 3 epochs; eval loss decreases ≥ 5% vs epoch 0.
- **Rollback:** restore previous adapter from checkpoint registry.
- **Omega floor:** 0.80
- **Depends on:** U-LTH69

### U-LTH71 — LatheLoRAEvalHarnessEngine
- **Build:** New engine. Consumes 800 eval prompts + generations. Scores: (a) compile-pass via `LathePostProcessorEngine` syntax validator, (b) validator-pass via `LatheQualityGateEngine` + `LatheCoaxialityRunoutValidatorEngine`, (c) CodeBLEU, (d) semantic dimensional-check via `GDTStackupEngine` against instruction inputs.
- **Exit Gate:** Base Qwen2.5-Coder:7b vs JM-Die-LoRA: compile-pass rate Δ ≥ +20 pp (e.g. 60 → 80%); validator-pass Δ ≥ +25 pp; CodeBLEU Δ ≥ +0.15.
- **Rollback:** revert adapter if eval Δ < 0 (LoRA hurt the model — diagnose before re-training).
- **Omega floor:** 0.85
- **Depends on:** U-LTH70

### SESSION P0.2-S2 (U-LTH72..U-LTH74) — `/compact` before starting
**SMART_CONFIG:** Role=ml-developer + backend-dev | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=50%
**KNOWLEDGE:** llama.cpp Q5_K_M quant docs, Ollama Modelfile, Qwen2 ChatML stop tokens.

### U-LTH72 — LatheLoRAMergeAndQuantScript
- **Build:** Script `scripts/merge-and-quant-lathe-lora.py`. Calls `peft.merge_and_unload()` on trained adapter, saves merged HF model, then `python convert_hf_to_gguf.py` + llama.cpp `quantize` to Q5_K_M. Output: `models/qwen25-coder-jmdie-Q5_K_M.gguf` (~5.3 GB).
- **Exit Gate:** GGUF file ≤ 6 GB; loads in Ollama without error; `ollama run lathe-jmdie` returns valid first token ≤ 2 s.
- **Rollback:** delete GGUF, keep merged HF intermediate for re-quant.
- **Omega floor:** 0.80
- **Depends on:** U-LTH70

### U-LTH73 — Ollama Modelfile + LatheLocalPolicyEngine
- **Build:** Create `models/lathe-jmdie.Modelfile` with `FROM ./qwen25-coder-jmdie-Q5_K_M.gguf`, ChatML template, SYSTEM prompt "You are JM Die's Okuma lathe programmer. Output valid .MIN G-code matching the named customer's idioms. End with M30.", `PARAMETER temperature 0.2`, `num_ctx 8192`, `stop "<|im_end|>"`. New `LatheLocalPolicyEngine.ts` wraps Ollama HTTP API (`POST /api/generate`).
- **Exit Gate:** `ollama create lathe-jmdie` succeeds; `LatheLocalPolicyEngine.generate({customer, material, stock, operations})` returns syntactically valid G-code ≥ 90% of the time on 20 reference prompts; mean latency ≤ 3 s for 200-line outputs.
- **Rollback:** remove Modelfile, delete GGUF, revert engine to stub.
- **Omega floor:** 0.85
- **Depends on:** U-LTH72

### U-LTH74 — LatheLoRAPipelineEngine (orchestrator)
- **Build:** New engine. Orchestrates dataset-build → train → merge-quant → Ollama-deploy → eval. Single entry point `LatheLoRAPipelineEngine.run({ incremental: true, minScoreFilter: 70 })`. Emits run report to `data/state/lathe-lora-runs/<timestamp>.json`.
- **Exit Gate:** End-to-end pipeline completes on clean checkout in ≤ 8 h wall-time; run report has non-empty eval metrics.
- **Rollback:** archive failed run dir, restore previous Modelfile.
- **Omega floor:** 0.85
- **Depends on:** U-LTH69, U-LTH70, U-LTH71, U-LTH72, U-LTH73

### SESSION P0.2-S3 (U-LTH75..U-LTH76)
**SMART_CONFIG:** Role=coder + tester | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=40%

### U-LTH75 — Incremental Retrain Cadence
- **Build:** New cadence `scheduleLatheLoRAIncremental()` registered in `src/schedules/`. Runs weekly. Pulls new programs since last run from JM Die archive, appends to dataset, trains additional epoch from last checkpoint (not from scratch), re-evals. Only promotes new GGUF if eval Δ ≥ 0.
- **Exit Gate:** First scheduled run completes successfully; non-regression gate works (rollback triggers on Δ < 0).
- **Rollback:** disable cadence; revert Modelfile to last promoted GGUF.
- **Omega floor:** 0.80
- **Depends on:** U-LTH74

### U-LTH76 — Forge-Triple (P0.2)
- **Hook:** `pre-lathe-gen-require-policy.mjs` — blocks any `LatheLocalPolicyEngine.generate()` call without a current Modelfile registered in `data/state/lathe-lora-runs/` within the last 30 days. Forces incremental retrain when stale.
- **Action:** `prism_lathe:lathe_lora_generate` — `{instruction, context} → {gcode, tokens_used, latency_ms, validator_pass_pred}`.
- **Skill:** `/lathe-train-lora` (admin — triggers full pipeline) and `/lathe-gen-policy` (user — asks the LoRA for a program given a print spec).
- **Exit Gate:** `/lathe-gen-policy` end-to-end on 10 reference prints: ≥ 8/10 pass compile + validator gates.

**P0.2 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-gen-require-policy` → blocks stale policy serving
- NEW_ACTIONS: `lathe_lora_generate`, `lathe_lora_eval`, `lathe_lora_train_dispatch` → available to P4, P0.8
- NEW_SKILLS: `/lathe-train-lora`, `/lathe-gen-policy`
- AVAILABLE_TO: P0.8 (swarm specialist agent), P4 (generation candidate pool), P5 (quote generator)

---

# P0.3: BAYESIAN + CAUSAL DEPTH (7 units, 3 sessions) ← v2 scrutiny

**Goal:** Replace point estimates with posteriors across all safety-critical lathe predictions. Closed-form NIG for tool life, hierarchical Gibbs for cutting force, PC algorithm for scrap-causal DAG, back-door g-formula for do-calculus, Bayesian Cpk via non-central t posterior predictive.

**Leverage existing:**
- `BayesianInferenceEngine.ts` — Beta-Binomial, Normal-Normal, Gamma-Poisson conjugates. ADD NIG here.
- `BayesianToolLifeEngine.ts` — Taylor prior + GP. ADD joint (C, n) NIG posterior.
- `CausalReasoningEngine.ts` — hand-curated DAG only. ADD PC algorithm discovery + back-door adjustment.
- `CounterfactualReasoningEngine.ts` — template edge strengths. ADD true do-operator using learned PC edges.
- `CpkPredictionGateEngine.ts` (E1203 from CAMX-MS12) — point Cpk. ADD `gateBayesian()` returning P(Cpk ≥ 1.33).
- `StochasticCuttingForceEngine.ts` — LHS Monte Carlo. WRAP in `HierarchicalBayesianCuttingForceEngine`.

**Anti-patterns:**
- Adding `bayesjs` or `pomegranate` — both abandoned / Python-only. Pure TS.
- MCMC when conjugate available — NIG is closed-form, don't Metropolis-Hastings.
- PC algorithm without Meek orientation — leaves undirected edges, loses temporal identifiability.
- Ignoring time-ordering on causal DAG — material is chosen before toolpath, before feed; enforce in Meek orientation.
- Back-door adjustment without verifying adjustment set blocks all back-door paths — check graphically.

**Integration with prior phases:**
- CAMX-MS12 E1201/E1202/E1203 → P0.3 makes E1203 Bayesian and wraps E1201 with hierarchical posteriors.
- P0.1 proof output is input to P0.3 Bayesian gate: only proved-safe candidates get posterior scoring.

### SESSION P0.3-S1 (U-LTH77..U-LTH79)
**SMART_CONFIG:** Role=coder + researcher | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=55%
**KNOWLEDGE:** Gelman BDA3 ch.3 (NIG conjugate), Murphy PML ch.11 (hierarchical Gibbs), Spirtes-Glymour-Scheines (PC algorithm), Pearl do-calculus.

### U-LTH77 — BayesianInferenceEngine: NIG conjugate extension
- **Build:** Extend `BayesianInferenceEngine.calculate()` with `prior_type: "normal_inverse_gamma"`. Inputs: prior `{μ₀, Σ₀, α₀, β₀}` + observations `{X, y}`. Outputs posterior `{μ_post, Σ_post, α_post, β_post}`. Closed form:
  - `Σ_post⁻¹ = Σ₀⁻¹ + X'X/σ²`
  - `μ_post = Σ_post (Σ₀⁻¹ μ₀ + X'y/σ²)`
  - `α_post = α₀ + n/2`
  - `β_post = β₀ + ½(y'y + μ₀' Σ₀⁻¹ μ₀ - μ_post' Σ_post⁻¹ μ_post)`
- **Exit Gate:** Unit test posterior matches PyMC3 reference to 1e-5; sampling from posterior gives correct marginals via 10k draws.
- **Rollback:** revert to previous BayesianInferenceEngine if tests fail.
- **Omega floor:** 0.90
- **Depends on:** —

### U-LTH78 — BayesianToolLifeEngine: joint (C, n) posterior
- **Build:** Extend `BayesianToolLifeEngine` with `posteriorJointCn({ priorFromCatalog, observations })`. Log-linearizes Taylor: `log T = log C - (1/n) log V`, fits via NIG from U-LTH77. Prior from Sandvik/Kennametal per-grade T-vs-V points (Fisher-information for Σ₀), ν₀=5 weak.
- **Exit Gate:** Posterior CI on (C, n) narrows 3× after 50 observations vs prior-only; predictive log T ± 2σ covers 95% of holdout programs.
- **Rollback:** revert engine; catalog data file preserved.
- **Omega floor:** 0.90
- **Depends on:** U-LTH77

### U-LTH79 — HierarchicalBayesianCuttingForceEngine
- **Build:** New engine. Three-level partial pooling: material_group (P/M/K/N/S/H) ⊃ tool_material_pair ⊃ specific_tool. Gibbs sampler ~200 LOC: alternates between group/pair/individual posteriors with NIG on each level. Consumes `OutcomeTrackingEngine` records grouped by material × tool.
- **Exit Gate:** Sparse-data tools shrink toward group mean correctly (verified on synthetic data); posterior predictive RMSE ≤ 0.85 × non-hierarchical baseline on JM Die validation set.
- **Rollback:** git rm engine; StochasticCuttingForceEngine remains primary.
- **Omega floor:** 0.85
- **Depends on:** U-LTH77

### SESSION P0.3-S2 (U-LTH80..U-LTH82) — `/compact` before starting
**SMART_CONFIG:** Role=researcher + coder | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%

### U-LTH80 — CausalReasoningEngine: PC algorithm discovery
- **Build:** Extend with `discoverDAG({data, alpha=0.05, timeOrdering})`. Fisher-Z conditional independence test on partial correlations for continuous vars; χ² for categorical (scrap/good). Outputs CPDAG, then Meek orients using time-ordering: material → toolpath → feed/speed → force → dim_error → scrap; fixture → rigidity → deflection.
- **Exit Gate:** On 1000-program JM Die cohort: recovers ≥ 70% of known edges (material→kc1.1, feed→force, force→deflection); spurious edges ≤ 15%.
- **Rollback:** revert engine; hand-curated DAG remains fallback.
- **Omega floor:** 0.85
- **Depends on:** —

### U-LTH81 — CounterfactualReasoningEngine: true do-operator
- **Build:** Extend with `doOperator({ treatment, value, outcome, adjustmentSet })`. Uses back-door criterion: `P(outcome | do(treatment=v)) = Σ_z P(outcome | treatment=v, z) · P(z)`. Fits `P(outcome | treatment, Z)` as Bayesian logistic regression (Laplace approx). Empirical P(z) from data.
- **Exit Gate:** "Feed +10% → Δ P(scrap)" computes within ±3 pp of randomized-trial ground truth on synthetic data; runs in ≤ 200 ms per query.
- **Rollback:** revert engine; template mode remains.
- **Omega floor:** 0.85
- **Depends on:** U-LTH80

### U-LTH82 — CpkPredictionGateEngine: gateBayesian method
- **Build:** Extend E1203 with `gateBayesian({ candidates, tolerance, priorJobs, p_threshold = 0.90 })`. NIG on (μ, σ²) per strategy from prior jobs. Posterior predictive Cpk = non-central t distribution ratio; 10k MC samples for P(Cpk ≥ 1.33). Gate: accept iff P ≥ 0.90.
- **Exit Gate:** On CAMX-MS12 test set, gateBayesian is at least as conservative as point gate; rejects additional 5–15% of candidates that point gate accepts but have high σ² uncertainty; gateBayesian P(Cpk≥1.33) value ∈ [0, 1] on every call.
- **Rollback:** gateBayesian becomes optional flag; point gate remains default.
- **Omega floor:** 0.90
- **Depends on:** U-LTH77

### SESSION P0.3-S3 (U-LTH83)
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=30%

### U-LTH83 — Forge-Triple (P0.3)
- **Hook:** `post-strategy-require-posterior-gate.mjs` — every `StrategyComparisonEngine` / `FeatureStrategyKnowledgeBaseEngine.bestStrategy()` call must return `{bayesianCpkP, toolSurvivalP, scrapP}` (all Bayesian posteriors, not point estimates). Hook blocks emission when posteriors absent.
- **Action:** `prism_lathe:lathe_posterior_gate` — `{candidates, tolerance, priorJobs} → [{candidate, bayesianCpkP, toolSurvivalP, scrapP, verdict}]`.
- **Skill:** `/lathe-posterior-gate` — user-facing Bayesian evaluator.
- **Exit Gate:** `/lathe-posterior-gate` returns all three posteriors on 10 reference candidates; hook blocks PR that strips posterior from strategy comparison.

**P0.3 FEATURE CASCADE:**
- NEW_HOOKS: `post-strategy-require-posterior-gate`
- NEW_ACTIONS: `lathe_posterior_gate`, `lathe_causal_discover`, `lathe_do_operator` → P4, P5, PX
- NEW_SKILLS: `/lathe-posterior-gate`
- AVAILABLE_TO: P0.10 math depth (uses posteriors in Lagrangian), P4 print-to-program, P5 ERP (pricing uses P(scrap))

---

# P0.4: ASSET UTILIZATION MAXIMIZATION (8 units, 3 sessions) ← v2 scrutiny

**Goal:** Every lathe decision must route through all relevant assets (engines, formulas, algorithms, tools, materials, machines, tribal tips) and emit a provenance chain. Target: ≥ 90% of relevant asset index entries touched on a representative print-to-program sample.

**Leverage existing:** `PRISMSelfAwarenessEngine.ts`, `FormulaRegistry.ts`, `AlgorithmRegistry.ts`, all 24 registries, `ToolCatalogEngine`, `MaterialRegistry`, `MachineRegistry`, `TribalKnowledgeEngine`, `MachiningPlaybookEngine`, `EXTERNAL-REFERENCE-PROGRAMS-INDEX.md`.

**Anti-patterns:**
- "Call engine X" without logging what X consulted. Orphan-consumer smell.
- Provenance chains with engine names but not formula IDs / algorithm IDs / material IDs / tool IDs / tip IDs. Must include registry primary keys.
- Coverage audit counting "imports" instead of "invocations at runtime".

**Integration with prior phases:**
- Consumes registry outputs of P0 audit.
- Informs P4 signoff dossier.

### SESSION P0.4-S1 (U-LTH84..U-LTH86)
**SMART_CONFIG:** Role=system-architect + coder | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=60%
**KNOWLEDGE:** All 24 registry interfaces, ENGINE_DIGEST.md, PRISM-INVENTORY-2026-04-15.md.

### U-LTH84 — LatheAssetCoordinatorEngine
- **Build:** New engine. For a given print-to-program request `{material, operation, customer, machine, tolerance}`, identifies every relevant asset: (a) candidate tools via ToolCatalogEngine, (b) material properties via MaterialRegistry, (c) machine envelope via MachineRegistry, (d) applicable formulas via FormulaRegistry (Kienzle, Taylor, Malkin, Sato...), (e) applicable algorithms via AlgorithmRegistry (stability-lobe, Bayesian, Monte Carlo...), (f) tribal tips via TribalKnowledgeEngine.searchTribalKnowledge, (g) playbook rules via MachiningPlaybookEngine.searchPlaybookRules, (h) relevant reference programs via EXTERNAL-REFERENCE-PROGRAMS-INDEX.md. Returns `AssetBundle`.
- **Exit Gate:** On 10 reference requests, AssetBundle.size ≥ 50 assets each; no runtime errors on edge materials/tools.
- **Rollback:** git rm engine; individual calls remain.
- **Omega floor:** 0.85
- **Depends on:** U-LTH01, all registry engines exist.

### U-LTH85 — LatheProvenanceChainEngine
- **Build:** New engine. Wraps any lathe decision call: captures `AssetBundle` consumed, records `[{asset_type, asset_id, asset_name, contribution}]` chain, returns `ProvenanceLog`. Stored in `data/state/lathe-provenance/<decisionId>.json`.
- **Exit Gate:** 100% of P4 print-to-program decisions emit a ProvenanceLog; logs load in < 50 ms; schema-versioned.
- **Rollback:** logs become opt-in flag.
- **Omega floor:** 0.85
- **Depends on:** U-LTH84

### U-LTH86 — LatheDecisionReasoningLogEngine
- **Build:** New engine. Appends to provenance with reasoning[]: why this tool was picked over alternatives, which formulas were consulted and what they returned, which tribal tips nudged the choice. Structured as a `DecisionTree` where each node has `{alternatives, criteria, choice, rationale, confidence}`.
- **Exit Gate:** Log explainable by a human on reference decisions; no "black-box" nodes.
- **Rollback:** engine becomes optional.
- **Omega floor:** 0.85
- **Depends on:** U-LTH85

### SESSION P0.4-S2 (U-LTH87..U-LTH89) — `/compact` before starting
**SMART_CONFIG:** Role=reviewer + coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=45%

### U-LTH87 — LatheCoverageAuditEngine
- **Build:** New engine. Computes `coverage(sampleRequests[]) = unique_assets_touched / unique_assets_relevant`. Relevant = `LatheAssetCoordinatorEngine.enumerate(request)`. Emits audit report `data/state/lathe-coverage-audit-<timestamp>.json`.
- **Exit Gate:** On 100-request sample, report shows ≥ 90% coverage; by-registry breakdown.
- **Rollback:** report becomes advisory.
- **Omega floor:** 0.85
- **Depends on:** U-LTH85

### U-LTH88 — Registry Entry Utilization Stats
- **Build:** Augment each of the 24 registries with `hitCount`, `lastAccessedAt` per entry. Emit top-10 and bottom-10 per registry in coverage audit.
- **Exit Gate:** Bottom-10 per registry surfaces stale/unused entries; top-10 matches intuition.
- **Rollback:** revert registry augmentation; coverage report without utilization stats.
- **Omega floor:** 0.75
- **Depends on:** U-LTH87

### U-LTH89 — Cross-Asset Wiring Hooks (Formulas × Algorithms × Tools × Materials × Machines × Tips)
- **Build:** Install 6 wiring validation hooks: `post-lathe-decision-require-formula`, `post-lathe-decision-require-algorithm`, `post-lathe-decision-require-tool-catalog`, `post-lathe-decision-require-material`, `post-lathe-decision-require-machine`, `post-lathe-decision-require-tip`. Each blocks decisions that touched 0 entries in its registry (indicates missed wiring).
- **Exit Gate:** Hooks fire correctly on contrived stub decisions; do not fire on well-wired decisions.
- **Rollback:** disable hooks; coverage audit remains advisory.
- **Omega floor:** 0.80
- **Depends on:** U-LTH85, U-LTH87

### SESSION P0.4-S3 (U-LTH90..U-LTH91)
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=35%

### U-LTH90 — Provenance Retention + Query Actions
- **Build:** Add retention policy (keep 90 days hot, archive older to cold JSONL bundle); query actions `provenance_query_by_decisionId`, `provenance_query_by_assetId`, `provenance_query_by_customer`.
- **Exit Gate:** Query actions return in < 100 ms on 10k-entry provenance log.
- **Rollback:** disable archival; actions optional.
- **Omega floor:** 0.80
- **Depends on:** U-LTH85

### U-LTH91 — Forge-Triple (P0.4)
- **Hook:** `post-lathe-decision-require-provenance.mjs` — blocks any lathe decision from surfacing to P4 signoff / web UI without a `ProvenanceLog` reference.
- **Action:** `prism_lathe:lathe_provenance_query` — query by decisionId/assetId/customer.
- **Skill:** `/lathe-coverage-audit` — runs `LatheCoverageAuditEngine` and formats the report with per-registry breakdown.
- **Exit Gate:** `/lathe-coverage-audit` on 100-request sample: ≥ 90% relevant-asset coverage; report ships with top/bottom 10 per registry.

**P0.4 FEATURE CASCADE:**
- NEW_HOOKS: `post-lathe-decision-require-provenance` + 6 wiring hooks
- NEW_ACTIONS: `lathe_provenance_query`, `lathe_asset_bundle`, `lathe_coverage_audit`
- NEW_SKILLS: `/lathe-coverage-audit`
- AVAILABLE_TO: P4 signoff dossier, P5 ERP (quote includes provenance), PX AGI substrate

---

# P0.5: AGI SAFETY CONTAINMENT (LATHE) (5 units, 2 sessions) ← v2 scrutiny

**Goal:** Corrigibility gate + goal-stability invariant + self-mod approval + containment audit, scoped to lathe stack. Near-AGI orchestrators cannot mutate physics constants, shop profile, dispatcher wiring, or formula registry without explicit human approval.

**Leverage existing:** Universal 0.25.1 `AGISafetyContainmentEngine`, 0.18 `SelfModificationProposalEngine`, `EmergentBehaviorMonitorEngine`, `CognitiveBudgetEngine`, `BeliefStateEngine`. Lathe side: `LatheAGICoreEngine`, `LatheMasterOrchestratorFacadeEngine`, `LatheUnifiedAIOrchestrator`.

**Anti-patterns:**
- Corrigibility gate implemented as a boolean that AGI engine can flip. **Human approval must be out-of-band** (separate file, separate auth path).
- Self-mod approval implemented as "always yes" — provides audit trail without control. Reject.
- Containment audit that reads only logged capabilities — must also enumerate from filesystem to catch unlogged additions.

**Integration with prior phases:** P0.4 provenance chain records every AGI action for containment audit.

### SESSION P0.5-S1 (U-LTH92..U-LTH94)
**SMART_CONFIG:** Role=security-manager + reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
**KNOWLEDGE:** Universal 0.25 corrigibility specs, Stuart Russell (Human Compatible) corrigibility criteria, `AGENT_BOUNDARY_DIRECTIVE.md`.

### U-LTH92 — LatheAgentCorrigibilityGateEngine
- **Build:** New engine. Classifies lathe AGI actions into tiers: (T0) read-only, auto-allow; (T1) propose-strategy, auto-allow with provenance; (T2) adjust engine wiring / dispatcher, require human approval; (T3) modify physics constants / shop profile / formula registry, require human approval AND signed approval artifact. Rejects T2/T3 without `approvals/<actionId>.json` signed file.
- **Exit Gate:** Synthetic T2/T3 actions blocked without approval file; T0/T1 flow through; approval file format validated; cannot be written by the same engine it approves.
- **Rollback:** disable gate; log-only mode.
- **Omega floor:** 0.95
- **Depends on:** —

### U-LTH93 — LatheGoalStabilityInvariantEngine
- **Build:** New engine. At every lathe agent checkpoint, verifies the objective function hash has not changed vs session-start baseline. Blocks execution if `hash(LatheAGICoreEngine.currentObjective()) != baseline_hash`. Objective rewrites require T3 approval.
- **Exit Gate:** Synthetic goal-drift (objective modifier) caught ≥ 99%; no false positives on legitimate parameter updates within the same objective.
- **Rollback:** disable invariant check; monitor-only.
- **Omega floor:** 0.95
- **Depends on:** U-LTH92

### U-LTH94 — LatheSelfModificationApprovalEngine
- **Build:** New engine. For any proposal from `SelfModificationProposalEngine` targeting a lathe asset, requires: (a) diff preview, (b) static analysis result, (c) formal proof of non-violation of safety invariants (integrates with P0.1), (d) reviewer sign-off (signed file), (e) rollback plan. Only then writes the mutation.
- **Exit Gate:** Synthetic proposals without full envelope rejected; well-formed proposals pass through; audit trail complete.
- **Rollback:** disable auto-apply; proposals queued for manual review only.
- **Omega floor:** 0.95
- **Depends on:** U-LTH92, P0.1 U-LTH64

### SESSION P0.5-S2 (U-LTH95..U-LTH96) — `/compact` before starting
**SMART_CONFIG:** Role=reviewer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=35%

### U-LTH95 — LatheContainmentAuditEngine
- **Build:** New engine. Weekly cadence. Enumerates lathe engine capabilities from filesystem (glob + signature hash) vs logged capability inventory. Diffs. Flags unlogged additions. Correlates with `provenance` logs — any mutation without provenance = red flag.
- **Exit Gate:** Synthetic unlogged engine (manual fs write) flagged within 1 audit cycle.
- **Rollback:** audit becomes advisory email only.
- **Omega floor:** 0.85
- **Depends on:** U-LTH92

### U-LTH96 — Forge-Triple (P0.5)
- **Hook:** `pre-lathe-agi-action-corrigibility.mjs` + `post-lathe-agi-self-mod-approval.mjs` (two hooks).
- **Action:** `prism_lathe:lathe_agi_containment_check` — on-demand audit.
- **Skill:** `/lathe-containment-audit`.
- **Exit Gate:** Hook pair blocks T2/T3 without approval; audit skill produces a clean report on reference state.

**P0.5 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-agi-action-corrigibility`, `post-lathe-agi-self-mod-approval`
- NEW_ACTIONS: `lathe_agi_containment_check`, `lathe_corrigibility_gate`, `lathe_goal_stability_check`
- NEW_SKILLS: `/lathe-containment-audit`
- AVAILABLE_TO: all downstream phases that use `LatheAGICoreEngine`

---

# P0.6: LIVE MACHINE DATA (MTCONNECT / OPC-UA / THINC) (7 units, 3 sessions) ← v2 scrutiny

**Goal:** Stream 10 Hz telemetry from 7 Okuma OSP-P300L lathes into `OutcomeTrackingEngine`; auto-close outcome records on M30; extend outcome schema with live telemetry summary.

**Leverage existing:** `MTConnectAdapterEngine.ts` (1043 LOC), `MTConnectLiveStatusEngine.ts`, `DigitalTwinEngine.ts`, `DigitalTwinSyncEngine.ts`, `LatheActualFeedbackTuningEngine.ts`, `OutcomeTrackingEngine.ts` (JSONL append-only), `TelemetryEngine.ts`, `PostProcessorTelemetryEngine.ts`, `MachineLearningFeedbackEngine.ts`, `FeedbackCollectorEngine.ts`, `PredictionFeedbackOrchestratorEngine.ts`.

**Anti-patterns:**
- Using `mtconnect-agent` npm package — that hosts an agent, doesn't consume. Use `fast-xml-parser` + `axios` or `node-opcua`.
- Polling > 10 Hz on MTConnect — Okuma OSP-P300L ceiling. Wasted bandwidth.
- Ignoring spindle_temperature — thermal drift is real and fixable by `InverseThermalCompensationEngine`.
- Writing telemetry synchronously into outcome file on every tick — batch on M30, not every frame.

**Integration with prior phases:** P0.3 Bayesian posteriors update from P0.6 outcome records; P0.7 predictive twin validated against P0.6 actuals.

### SESSION P0.6-S1 (U-LTH97..U-LTH99)
**SMART_CONFIG:** Role=backend-dev + coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=50%
**KNOWLEDGE:** `node-opcua` docs, Okuma OSP-P300L MTConnect Adapter installation guide, THINC-API SDK docs, OutcomeTrackingEngine schema.

### U-LTH97 — OkumaOPCUABridgeEngine
- **Build:** New engine. Wraps `node-opcua` subscription to Okuma OPC-UA endpoint. Subscribes to 10 Hz signals: spindle_load_pct, path_feedrate, actual_feedrate, axis_load_x, axis_load_z, cycle_time, program_block_number, tool_life_counter, spindle_temperature, program_state, alarm_codes.
- **Exit Gate:** Test harness connects to mock OPC-UA server; 10 Hz sampling achieved; reconnect-on-drop works within 5 s; certificate auth path tested.
- **Rollback:** disable subscription; adapter stub.
- **Omega floor:** 0.85
- **Depends on:** —

### U-LTH98 — MTConnectAdapterEngine extensions (no new engine)
- **Build:** Extend existing `MTConnectAdapterEngine` with lathe-specific projections: Okuma MTConnect device model, `execution` mapping (READY/ACTIVE/INTERRUPTED/STOPPED), spindle overrides, feed overrides. Add Okuma-specific `ProbeResult` parsing.
- **Exit Gate:** Existing probe/current/sample tests still pass; new lathe-projection tests pass; no regressions.
- **Rollback:** revert extension; original behavior restored.
- **Omega floor:** 0.85
- **Depends on:** `MTConnectAdapterEngine.ts` exists.

### U-LTH99 — LiveTelemetryIngestEngine
- **Build:** New engine. Tees OPC-UA + MTConnect streams into in-memory ring buffer (10 Hz × 60 s = 600 frames). On M30 detection, serializes summary (peak_spindle_load_pct, avg_feed_override_pct, alarm_codes[], block_where_scrapped_if_any) to `OutcomeTrackingEngine` via new `appendLiveSummary(outcomeId, summary)` method.
- **Exit Gate:** Ring buffer + M30 trigger → outcome append verified on mock stream; buffer never exceeds 600 frames; summary statistics correct on synthetic data.
- **Rollback:** engine opt-in flag.
- **Omega floor:** 0.85
- **Depends on:** U-LTH97, U-LTH98

### SESSION P0.6-S2 (U-LTH100..U-LTH102) — `/compact` before starting
**SMART_CONFIG:** Role=coder + reviewer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=40%

### U-LTH100 — LatheTelemetrySummaryEngine (outcome schema ext)
- **Build:** New engine. Owns the `liveTelemetrySummary` sub-schema on `OutcomeRecord`. Adds fields: `{peakSpindleLoadPct, avgFeedOverridePct, alarmCodes[], blockWhereScrapped, programDurationSec, toolsUsedList, spindleTempDeltaC, axisLoadMaxX, axisLoadMaxZ}`. Migration from schemaVersion N → N+1.
- **Exit Gate:** Migration round-trips; schema validated by Zod; old records still readable after migration.
- **Rollback:** schema migration down-path restores N.
- **Omega floor:** 0.90
- **Depends on:** U-LTH99

### U-LTH101 — OnM30AutoCompleteOutcomeHook
- **Build:** New hook `on-m30-auto-complete-outcome.mjs`. Fires when `LiveTelemetryIngestEngine` detects M30 or program_state transition to READY. Triggers outcome close + summary append + Bayesian prior update (feeds U-LTH78 + U-LTH79).
- **Exit Gate:** Synthetic M30 on mock stream closes outcome within 2 s; Bayesian engines see new posterior within 5 s.
- **Rollback:** disable hook; manual outcome close fallback.
- **Omega floor:** 0.85
- **Depends on:** U-LTH99, U-LTH100

### U-LTH102 — LatheActualFeedbackTuningEngine integration
- **Build:** Wire `LatheActualFeedbackTuningEngine` to consume `liveTelemetrySummary`. Recalibrates Taylor C + kc_scale from per-job residuals (predicted cycle_time vs actual; predicted peak force vs axis_load_max).
- **Exit Gate:** After 50 jobs, tuning engine emits non-zero kc_scale correction; correction reduces future-prediction MAPE ≥ 5%.
- **Rollback:** revert wiring; tuning remains in manual mode.
- **Omega floor:** 0.85
- **Depends on:** U-LTH100

### SESSION P0.6-S3 (U-LTH103)
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=30%

### U-LTH103 — Forge-Triple (P0.6)
- **Hook:** `on-m30-auto-complete-outcome.mjs` (already U-LTH101 — wrap into forge-triple entry).
- **Action:** `prism_lathe:lathe_live_stream_start` + `lathe_live_stream_status` + `lathe_live_telemetry_snapshot`.
- **Skill:** `/lathe-live-telemetry` — opens live dashboard.
- **Exit Gate:** End-to-end smoke test: skill opens, stream starts, mock M30 closes outcome, summary visible.

**P0.6 FEATURE CASCADE:**
- NEW_HOOKS: `on-m30-auto-complete-outcome`, `on-alarm-scrap-flag`
- NEW_ACTIONS: `lathe_live_stream_start`, `lathe_live_telemetry_snapshot`, `lathe_outcome_close`
- NEW_SKILLS: `/lathe-live-telemetry`
- AVAILABLE_TO: P0.3 Bayesian update cadence, P0.7 twin validation, P5 ERP (actual cost from cycle time)

---

# P0.7: PREDICTIVE TWIN (60 s PRE-PLAY) (7 units, 3 sessions) ← v2 scrutiny

**Goal:** Every print-to-program output pre-plays through the digital twin (2 D XZ manifold polygon + per-block Kienzle + 1 D thermal FD + deflection + collision) within a 60 s budget per 1000-block program.

**Leverage existing:** `CNCSimulationPipelineEngine.ts`, `LatheBlockEngagementSimulatorEngine.ts`, `DigitalTwinEngine.ts`, `ProcessDigitalTwinEngine.ts`, `DigitalTwinFormulasEngine.ts`, `DigitalTwinSyncEngine.ts`, `CuttingForceEngine.ts` (Kienzle), `StochasticCuttingForceEngine.ts`, `ThermalSimEngine.ts`, `CuttingThermalEngine.ts`, `ThermalWearCouplingEngine.ts` (RK4), `InverseThermalCompensationEngine.ts`, `PartDeflectionEngine.ts`, `BoringBarDeflectionEngine.ts`, `ChatterStabilityLobeEngine.ts`, `SurfaceFinishPredictorEngine.ts`, `SPCProcessCapabilityEngine.ts`, `BooleanKernelEngine.ts` (CadQuery bridge), `PredictiveWorldSimulatorEngine.ts`, `PredictiveSimulationEngine.ts`, `PhysicsAwareSimulationEngine.ts`, `CalibratedSimulationEngine.ts`, `NovelToolpathSimulatorEngine.ts`, `ToolpathSimulationEngine.ts`, `SimulationReportEngine.ts`, `SimulationVisualizationBridgeEngine.ts`.

**Anti-patterns:**
- New physics engine. 85% of the capability exists. Only the **lathe-specific orchestrator** is missing.
- 3 D CSG per block. Use 2 D XZ polygon (revolved) with `manifold-3d` — 10–100× faster.
- Integrating FEA per block. Mechanistic Kienzle is the correct granularity for 60 s budget.
- Running thermal + deflection synchronously. Parallelize where possible; per-block budget is tight.
- Skipping truthful validation. `BooleanKernelEngine` CadQuery pass runs once at end for ground truth.

**Integration with prior phases:** P0.1 proof output is fed into pre-play as "already-proved constraints"; P0.3 posteriors feed force uncertainty bands; P0.6 live data calibrates twin.

### SESSION P0.7-S1 (U-LTH104..U-LTH106)
**SMART_CONFIG:** Role=coder + physics-reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=55%
**KNOWLEDGE:** `manifold-3d` Apache-2 WASM docs, `CuttingForceEngine` interface, `ThermalSimEngine` interface.

### U-LTH104 — LatheManifoldXZPolygonEngine
- **Build:** New engine. Wraps `manifold-3d` WASM for 2 D XZ polygon ops. Lathe stock = closed polygon `{(z, r)}`, insert swept-envelope = polygon per block, boolean subtract per block. Target: 2 ms per op.
- **Exit Gate:** 1000 block subtractions complete in ≤ 2 s total on reference machine; final polygon matches `BooleanKernelEngine` truthful kernel within 1e-4 area.
- **Rollback:** git rm engine; predictive twin falls back to truthful kernel (slower).
- **Omega floor:** 0.85
- **Depends on:** `BooleanKernelEngine.ts` exists; `manifold-3d` added to `package.json`.

### U-LTH105 — LathePerBlockPhysicsEngine
- **Build:** New engine. For each block: (a) consume `LatheBlockEngagementSimulatorEngine` output `{ap, fz, engagement_width, mrr}`, (b) `CuttingForceEngine.fcKienzle({material, ap, fz, kappa})`, (c) `ThermalSimEngine.stepFD1D({dt, source: Fc·v})`, (d) `PartDeflectionEngine.evaluateCantilever(...)`, (e) `ChatterStabilityLobeEngine.isStable({rpm, ap})`. Allocation: 1+3+2+2 ms = 8 ms per block.
- **Exit Gate:** Per-block physics completes in ≤ 10 ms 95th percentile; all 5 sub-engines produce non-null outputs on reference blocks.
- **Rollback:** revert per-block integration; physics engines remain callable individually.
- **Omega floor:** 0.85
- **Depends on:** U-LTH104

### U-LTH106 — LathePredictiveTwinOrchestratorEngine
- **Build:** New engine. End-to-end: reads G-code → expands modal state → per-block boolean subtract + per-block physics → tracks accumulated tool wear + thermal drift + deflection → emits `TwinPreplayReport`. Budget enforced at 60 s; overruns return partial with flag.
- **Exit Gate:** On 10 reference 500–1000 block programs, pre-play completes in ≤ 60 s; report includes per-block peak_force, peak_temp, max_deflection, stability_margin.
- **Rollback:** git rm engine; existing CNCSimulationPipelineEngine remains primary.
- **Omega floor:** 0.90
- **Depends on:** U-LTH104, U-LTH105

### SESSION P0.7-S2 (U-LTH107..U-LTH109) — `/compact` before starting
**SMART_CONFIG:** Role=coder + reviewer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=45%

### U-LTH107 — LatheTwinValidationReportEngine
- **Build:** New engine. Compares `TwinPreplayReport` predictions against `OutcomeTrackingEngine` actuals (from P0.6) per completed job. Computes MAPE on cycle time, peak force, peak temp. Blocks promotion of a twin run if MAPE > calibration budget.
- **Exit Gate:** After 50 job completions, report shows MAPE ≤ 15% on cycle time, ≤ 20% on peak force, ≤ 25% on peak temp.
- **Rollback:** report becomes advisory.
- **Omega floor:** 0.85
- **Depends on:** U-LTH106, P0.6 U-LTH100

### U-LTH108 — LatheTwinCalibrationEngine
- **Build:** New engine. When MAPE exceeds budget, identifies the worst-fitting sub-model (force / thermal / deflection) and applies a calibration coefficient. Coefficient update via `BayesianInferenceEngine` NIG (from U-LTH77). Calibration coefficient stored in `data/state/lathe-twin-calibration.json`.
- **Exit Gate:** Synthetic 20% force over-prediction corrected within 20 jobs.
- **Rollback:** reset calibration to identity.
- **Omega floor:** 0.85
- **Depends on:** U-LTH107, U-LTH77

### U-LTH109 — Twin Visualization Bridge (web UI)
- **Build:** Wire `SimulationVisualizationBridgeEngine` to emit Three.js-compatible frame data from `TwinPreplayReport`. Web panel renders 2 D XZ polygon evolution + per-block force/temp overlays.
- **Exit Gate:** Web UI displays reference program pre-play at 10 fps; overlays update with frame cursor scrubbing.
- **Rollback:** disable web bridge; reports remain CLI-viewable.
- **Omega floor:** 0.75
- **Depends on:** U-LTH106

### SESSION P0.7-S3 (U-LTH110)
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=30%

### U-LTH110 — Forge-Triple (P0.7)
- **Hook:** `pre-lathe-emit-require-preplay.mjs` — blocks any `LathePostProcessorEngine.emit()` without a fresh `TwinPreplayReport` (≤ 5 min old) showing no collisions + deflection within spec + chatter-stable.
- **Action:** `prism_lathe:lathe_preplay_run` — `{gcode, stock, machineId, toolList} → TwinPreplayReport`.
- **Skill:** `/lathe-preplay`.
- **Exit Gate:** `/lathe-preplay` on 10 reference programs: 10/10 complete under 60 s; 9/10 catch a known seeded fault.

**P0.7 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-emit-require-preplay`
- NEW_ACTIONS: `lathe_preplay_run`, `lathe_twin_validate`, `lathe_twin_calibrate`
- NEW_SKILLS: `/lathe-preplay`
- AVAILABLE_TO: P4 print-to-program (signoff), P5 ERP (time estimates calibrated)

---

# P0.8: MULTI-AGENT LATHE ORCHESTRATION (6 units, 2 sessions) ← v2 scrutiny

**Goal:** Supervisor + 5 specialist agents (Blueprint-OCR, Feature-Recognition, Strategy-Advisor, Sim-Validator, Signoff) under a shared token budget, with consensus + disagreement resolution.

**Leverage existing:** `MultiAgentCoordinatorEngine.ts`, `AgentRegistryEngine.ts`, `SlashCommandRecommenderEngine.ts`, `LatheMasterOrchestratorFacadeEngine.ts`, `LatheUnifiedAIOrchestrator.ts`, claude-flow MCP, queen-coordinator agent, SPARC methodology.

**Anti-patterns:**
- Agent with unbounded token budget. Cognitive-budget engine is non-negotiable.
- Consensus = "pick the majority vote". Weight by provenance depth + posterior confidence.
- Ignoring disagreement. Every disagreement is a free learning signal — log it.

### SESSION P0.8-S1 (U-LTH111..U-LTH113)
**SMART_CONFIG:** Role=adaptive-coordinator + reviewer | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=50%
**KNOWLEDGE:** queen-coordinator agent spec, SPARC docs, ContextChain from CPP-MS2-S4.

### U-LTH111 — LatheSupervisorAgent spec + implementation
- **Build:** New agent definition + engine. Dispatches lathe print-to-program work to 5 specialist sub-agents: BlueprintOCRAgent, FeatureRecognitionAgent, StrategyAdvisorAgent, SimValidatorAgent, SignoffAgent. Uses ContextChain for shared context.
- **Exit Gate:** Supervisor routes 10 reference requests to correct sub-agents; shared context survives across sub-agent boundaries.
- **Rollback:** revert to synchronous `LatheMasterOrchestratorFacadeEngine` pipeline.
- **Omega floor:** 0.85
- **Depends on:** —

### U-LTH112 — LatheAgentBudgetAllocatorEngine
- **Build:** New engine. Per-request shared token + time budget. Divvies across 5 specialists via Thompson sampling on historical per-specialist value. Reserves 20% for supervisor.
- **Exit Gate:** Over-budget specialist is gracefully truncated; supervisor still produces output.
- **Rollback:** fall back to static equal split.
- **Omega floor:** 0.80
- **Depends on:** U-LTH111

### U-LTH113 — LatheAgentConsensusEngine
- **Build:** New engine. Combines per-specialist outputs into a single strategy via weighted consensus (weight = provenance_depth × posterior_confidence). Ties break on supervisor judgment.
- **Exit Gate:** Synthetic conflicting specialist outputs resolve to higher-confidence option; ties handled without deadlock.
- **Rollback:** fall back to supervisor-only output.
- **Omega floor:** 0.80
- **Depends on:** U-LTH111

### SESSION P0.8-S2 (U-LTH114..U-LTH116) — `/compact` before starting
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=40%

### U-LTH114 — LatheAgentDisagreementLogEngine
- **Build:** New engine. Every consensus decision where specialists disagreed by ≥ 15% in confidence is logged as a learning signal. Stored in `data/state/lathe-disagreements.jsonl`. Consumed by P0.3 causal engine for DAG-edge reinforcement.
- **Exit Gate:** Synthetic disagreement logged correctly; P0.3 engine reads and updates.
- **Rollback:** log becomes advisory.
- **Omega floor:** 0.75
- **Depends on:** U-LTH113

### U-LTH115 — claude-flow / queen-coordinator integration
- **Build:** Register `LatheSupervisorAgent` with `claude-flow` MCP + wire to `queen-coordinator` for cross-domain swarms. Enables lathe supervisor to call non-lathe agents (e.g., `physics-reviewer`) when needed.
- **Exit Gate:** Cross-domain call from lathe supervisor to physics-reviewer works on reference request; timeout handled.
- **Rollback:** disable cross-domain; lathe swarm remains self-contained.
- **Omega floor:** 0.80
- **Depends on:** U-LTH111

### U-LTH116 — Forge-Triple (P0.8)
- **Hook:** `pre-lathe-swarm-budget-check.mjs` — rejects swarm dispatch without a budget allocation from `LatheAgentBudgetAllocatorEngine`.
- **Action:** `prism_lathe:lathe_swarm_dispatch` — `{request, sharedBudget} → {supervisorDecision, specialistOutputs, consensusVerdict}`.
- **Skill:** `/lathe-swarm`.
- **Exit Gate:** `/lathe-swarm` on 5 reference prints: 5/5 succeed within budget; supervisor output matches consensus.

**P0.8 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-swarm-budget-check`
- NEW_ACTIONS: `lathe_swarm_dispatch`, `lathe_agent_budget_status`, `lathe_disagreement_query`
- NEW_SKILLS: `/lathe-swarm`
- AVAILABLE_TO: P4 print-to-program (primary consumer), P5 ERP (swarm-based quote generation)

---

# P0.9: SCIENTIFIC SIMULATION DEPTH (LATHE) (6 units, 2 sessions) ← v2 scrutiny

**Goal:** Force tribology / fatigue / fracture-mechanics / residual-stress / dimensional-stability gates into every lathe strategy decision, not just post-hoc reports.

**Leverage existing:** `CuttingForceEngine`, `ThermalSimEngine`, `ToolWearProgressionEngine`, `StochasticToolLifeEngine`, `PartDeflectionEngine`, `SurfaceFinishPredictorEngine`, `ChatterStabilityLobeEngine`, `ResidualStressEngine`, all 10 Universal 0.21 scientific engines.

**Anti-patterns:**
- Adding gates as optional. `MANDATORY` or rejected PR.
- Gates that require manual input. Auto-populate from material × tool × operation context.
- Gates that fire with default-valued constants. Every constant imported from `physics/constants.ts`.

### SESSION P0.9-S1 (U-LTH117..U-LTH119)
**SMART_CONFIG:** Role=physics-reviewer + coder | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:** Sandvik tribology reference data, Shigley fatigue (tool + jaw), Irwin LEFM (fracture), Shaw ch.18 residual stress, Machinery's Handbook thin-wall tolerances.

### U-LTH117 — LatheTribologyWearModelEngine
- **Build:** New engine. Decomposes tool wear into adhesion + abrasion + diffusion components per material × tool pair. Uses Malkin wear-rate model. Predicts which wear mode dominates at the chosen speed/feed; flags unsuitable pairings.
- **Exit Gate:** Dominant-mode prediction matches Sandvik catalog expectations on 20 reference pairs; edge cases (low-speed Ti: adhesion, high-speed steel: diffusion) caught.
- **Rollback:** revert; Taylor lumped model remains primary.
- **Omega floor:** 0.85
- **Depends on:** —

### U-LTH118 — LatheFatigueGateEngine (tool + spindle + jaw)
- **Build:** New engine. S-N / Basquin fatigue check for (a) tool shank under cyclic Kienzle force, (b) spindle bearing under cyclic axial/radial load, (c) chuck jaw under clamping + cutting force. Each with safety factor ≥ 2 on infinite-life threshold.
- **Exit Gate:** On 10 reference operations, gate flags one deliberately over-stressed case; 9 pass.
- **Rollback:** gate becomes advisory warning, not block.
- **Omega floor:** 0.90
- **Depends on:** `CuttingForceEngine`, `MachineRegistry` (bearing specs).

### U-LTH119 — LatheFractureMechanicsGateEngine (thin-wall)
- **Build:** New engine. Linear-elastic fracture mechanics check for thin-wall parts: K_I = σ·√(π·a) vs K_Ic; chooses lower cutting force if K_I exceeds threshold. Triggers only for parts with wall-thickness < 0.1 × OD.
- **Exit Gate:** Thin-wall reference part (JM Die fastener die insert) triggers gate; normal parts do not.
- **Rollback:** revert; existing thin-wall rules in playbook remain.
- **Omega floor:** 0.85
- **Depends on:** `MaterialRegistry` (K_Ic values).

### SESSION P0.9-S2 (U-LTH120..U-LTH122) — `/compact` before starting
**SMART_CONFIG:** Role=physics-reviewer + coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=45%

### U-LTH120 — LatheResidualStressGateEngine
- **Build:** New engine. Predicts residual stress in finished surface via Jawahir-Brinksmeier model: σ_res = f(σ_flow, cutting_temp, strain_rate, tool_geometry). Blocks strategies that induce tensile stress > spec (e.g., -200 MPa compressive floor for fatigue-critical parts).
- **Exit Gate:** Reference part (spring steel shaft) passes with compressive residual; high-heat config rejected.
- **Rollback:** revert; warning-only mode.
- **Omega floor:** 0.85
- **Depends on:** `ResidualStressEngine`, `CuttingThermalEngine`.

### U-LTH121 — LatheDimensionalStabilityGateEngine
- **Build:** New engine. Checks post-cut dimensional stability: thermal recovery (InverseThermalCompensationEngine), elastic spring-back (PartDeflectionEngine), residual-stress relaxation (U-LTH120). Estimates dimensional drift over 24 h post-machining. Blocks if drift > (tolerance / 4).
- **Exit Gate:** Reference precision part (carbide die punch, ±5 μm) gate matches empirical drift measurements on 5 JM Die jobs.
- **Rollback:** revert; advisory mode.
- **Omega floor:** 0.85
- **Depends on:** U-LTH120, `InverseThermalCompensationEngine`.

### U-LTH122 — Forge-Triple (P0.9)
- **Hook:** `post-lathe-strategy-require-science-gates.mjs` — every strategy decision must have passing results from all 5 gates (or explicit override with rationale).
- **Action:** `prism_lathe:lathe_science_gate_eval` — `{strategy, material, tool, operation, partGeometry} → {tribology, fatigue, fracture, residualStress, dimStability, verdict}`.
- **Skill:** `/lathe-science-gate`.
- **Exit Gate:** `/lathe-science-gate` on 20 reference strategies: 18 pass cleanly, 2 flag seeded faults; no false positives on historical production jobs (sampled 50).

**P0.9 FEATURE CASCADE:**
- NEW_HOOKS: `post-lathe-strategy-require-science-gates`
- NEW_ACTIONS: `lathe_science_gate_eval`, `lathe_tribology_predict`, `lathe_fatigue_check`, `lathe_fracture_check`
- NEW_SKILLS: `/lathe-science-gate`
- AVAILABLE_TO: P1 speed/feed (rejects unsafe params), P4 print-to-program (signoff), P5 ERP (risk-adjusted pricing)

---

# P0.10: MATH DEPTH (OPTIMAL CONTROL / INFO GAIN / ENSEMBLE) (5 units, 2 sessions) ← v2 scrutiny

**Goal:** Replace heuristic strategy enumeration with explicit optimal-control Lagrangian. Add expected-information-gain for active learning. Calibrated ensemble across LoRA policy + reasoning engines + rule baseline. Regret-minimization for cross-job learning.

**Leverage existing:** `StrategyRobustOptimizationEngine` (hypothetical if not yet built), `StrategyStochasticRiskEngine` (E1201), `StrategyWorstCaseSelectorEngine` (E1202), `CpkPredictionGateEngine` (E1203), `LatheBayesianOptimizationEngine`, `LatheOpusReasoningEngine`, `LatheDeepReasoningEngine`, Universal 0.20 `OptimalControlEngine`, `ActiveInferenceEngine`, `CalibratedEnsembleEngine`, `RegretMinimizationEngine`, `InformationTheoreticEngine`.

**Anti-patterns:**
- Enumeration-only over strategy space without explicit Lagrangian → scales poorly; misses Pareto frontier.
- Ensemble without calibration (Platt scaling / isotonic) → confidences lie.
- Info gain based on model entropy alone → ignores observation cost.
- Regret minimization offline only → misses online learning.

### SESSION P0.10-S1 (U-LTH123..U-LTH125)
**SMART_CONFIG:** Role=researcher + coder | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=50%
**KNOWLEDGE:** Bertsekas DP ch.6 (optimal control), Cover & Thomas ch.2 (info theory), Cesa-Bianchi (regret), Platt scaling + isotonic for calibration.

### U-LTH123 — LatheOptimalControlFormulationEngine
- **Build:** New engine. Formalizes print-to-program as a constrained optimization:
  ```
  argmax_strategy  E[profit | strategy]
  s.t.  P(Cpk ≥ 1.33 | strategy) ≥ 0.90
        P(tool survives | strategy) ≥ 0.90
        E[cycle_time | strategy] ≤ budget
        formal_proof(strategy) == UNSAT-violation
        all 5 P0.9 science gates = PASS
  ```
  Lagrangian with adaptive multipliers. Uses BayesianOpt to search feasible region.
- **Exit Gate:** On 10 reference problems, optimal control solution dominates (or matches) greedy baseline on profit; all constraints satisfied.
- **Rollback:** revert; greedy baseline remains.
- **Omega floor:** 0.85
- **Depends on:** U-LTH64 (proof), P0.3 Bayesian, P0.9 gates.

### U-LTH124 — LatheExpectedInfoGainEngine
- **Build:** New engine. For active learning: which strategy (of candidates) would reduce posterior entropy on the tool-life / Cpk posteriors the most if run? Computes EIG = H(θ) - E_y[H(θ|y)].
- **Exit Gate:** On synthetic data with known ground truth, EIG-guided selection converges in 30% fewer trials than random.
- **Rollback:** fall back to random exploration.
- **Omega floor:** 0.80
- **Depends on:** U-LTH78 (posterior), U-LTH82 (Cpk posterior).

### U-LTH125 — LatheCalibratedEnsembleEngine
- **Build:** New engine. Ensemble across: (a) LoRA policy (U-LTH73), (b) LatheOpusReasoningEngine, (c) LatheDeepReasoningEngine, (d) rule-based baseline. Calibrates per-member confidences via Platt scaling on historical outcomes. Ensemble output = calibration-weighted vote.
- **Exit Gate:** Ensemble brier score < best single member; calibration (reliability diagram) within ±5% of diagonal.
- **Rollback:** revert to best single member.
- **Omega floor:** 0.85
- **Depends on:** U-LTH73.

### SESSION P0.10-S2 (U-LTH126..U-LTH127) — `/compact` before starting
**SMART_CONFIG:** Role=coder | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=30%

### U-LTH126 — LatheRegretMinimizationEngine
- **Build:** New engine. Multi-armed bandit over strategies per (material × operation × customer) bucket. EXP3 + UCB. Online update on outcome feedback. Tracks cumulative regret vs best-fixed strategy.
- **Exit Gate:** After 100 synthetic trials, regret sub-linear in n; converges to best strategy ≥ 85% of time by trial 50.
- **Rollback:** fall back to fixed strategy table.
- **Omega floor:** 0.80
- **Depends on:** U-LTH125.

### U-LTH127 — Forge-Triple (P0.10)
- **Hook:** `pre-lathe-decision-require-optimal-control.mjs` — blocks strategy decisions that did not route through `LatheOptimalControlFormulationEngine`.
- **Action:** `prism_lathe:lathe_optimal_control_solve` + `lathe_eig_rank` + `lathe_ensemble_vote` + `lathe_regret_state`.
- **Skill:** `/lathe-optimal-control`.
- **Exit Gate:** `/lathe-optimal-control` on 5 reference problems: returns Pareto-dominant solutions with ensemble-calibrated confidences.

**P0.10 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-decision-require-optimal-control`
- NEW_ACTIONS: `lathe_optimal_control_solve`, `lathe_eig_rank`, `lathe_ensemble_vote`, `lathe_regret_state`
- NEW_SKILLS: `/lathe-optimal-control`
- AVAILABLE_TO: P1, P4, P5, PX — every strategic lathe decision.

---

# P0.11: FRONTEND INTEGRATION (Codex web alignment) (8 units, 3 sessions) ← v2 scrutiny R5

**⚠️ CODEX PAGE PROTECTION — READ `mcp-server/web/CLAUDE.md` BEFORE ANY WORK IN THIS PHASE.**
Codex has already built a lathe wizard stack. **DO NOT clone or overwrite it:**
- `mcp-server/web/src/pages/LatheUploadPage.tsx` (210 LOC) — route `/lathe` — **reuse**
- `mcp-server/web/src/pages/LatheWizardPage.tsx` (252 LOC) — route `/lathe/wizard` — **reuse**
- `mcp-server/web/src/pages/LatheResultsPage.tsx` (1265 LOC) — route `/lathe/results` — **reuse**
- `mcp-server/web/src/components/LatheInputWizard.tsx` — **0 LOC (EMPTY) — populate in U-LTH129**; it owes a `LatheWizardResult` type that `LatheResultsPage` already imports.
- `mcp-server/web/src/components/LatheAIPanel.tsx`, `LatheBackplot.tsx` — **reuse**
- `mcp-server/web/src/pages/WireEdmStudioPage.tsx` (121 LOC) + `contexts/WedmStudioContext.tsx` + `components/wedm-studio/{WizardShell, StepImport, StepReview, StepWcs, StepToolpath, StepOptimize, StepProgram, ProfileCanvas, StepErrorCard, InfoTip}.tsx` — **architectural reference** (thin wrapper + provider + step-folder pattern); the Lathe Studio mirrors this shape, it does not copy its steps.

All new UI in this phase MUST use the Calculator Studio design language per `web/CLAUDE.md`: `prism-glow-*`, `prism-chip`, `prism-spectrum-fill`, `prism-led-sweep`, `bg-[rgba(2,6,23,0.78)]`, `border-white/10`.

**Scrutiny origin:** SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md — 6 frontend gaps + 5 hardcoded-data risks that block print-to-program-in-one-shot in the PRISM web app. Codex built 134 pages / ~170 components / 87 API clients but:
- Lathe is exposed across 3 pages (Upload/Wizard/Results triple) without a studio-style wizard — the WEDM-studio provider + step-folder pattern is the reference to mirror.
- `LatheInputWizard.tsx` is currently an empty file even though `LatheResultsPage` imports `LatheWizardResult` from it.
- CalculatorPage mode-switch hygiene is buggy: switching to lathe keeps `selectedTool`, `selectedMaterial`, `operation`, `machineTypeId` etc. → nonsense state.
- Default machine IDs are hardcoded (`'th-jmd-vdi30-turning-baseline'`) — registry renames silently break the page.
- Swiss (Citizen/Tsugami) dialect toggle missing on lathe calculator.
- `postProcessorPath` handoff is URL-only (no direct `pp_*` dispatcher call); "Send to Quote" / "Send to Job Cost" handoffs don't exist.
- 7 orphan API clients critical to print-to-program (`cadGeometry`, `holePattern`, `multiOp`, `toolpath`, `feasibility`, `adaptiveControl`, `autonomous`) have zero page consumers.
- `/web/` is 3-week-stale mirror of `/mcp-server/web/` — retire or codegen under Universal 0.6.
- No unified job-session store: `jobId`-via-URL fails for multi-op jobs (lathe → WEDM in the same fixture).
- `/print-to-cnc` is reachable only by URL, not default nav.
- `QuoteFollowUpPage` is a true orphan (no route).

**Goal:** Close the frontend gaps so the lathe pipeline (P1 → P4) is callable from the PRISM web app as one-shot flows, with registry-backed UI state, studio-style wizards that reuse Codex pages, typed handoffs, and Playwright E2E coverage.

### SESSION P0.11-S1 (U-LTH128..U-LTH130)
**SMART_CONFIG:** Role=mobile-dev + reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** `mcp-server/web/CLAUDE.md` (Codex Page Protection + Calculator Studio tokens), `mcp-server/web/src/pages/WireEdmStudioPage.tsx` (architectural reference, 121 LOC), `mcp-server/web/src/contexts/WedmStudioContext.tsx`, `mcp-server/web/src/components/wedm-studio/`, existing Lathe pages (Upload/Wizard/Results) + components (LatheAIPanel, LatheBackplot, LatheInputWizard [empty]), `CalculatorPage.tsx` lines 2443 / 4271-4383 / 5486 / 5682-5684 / 5629, `calculatorWorkspace.ts` (MachineMode + hardcoded defaults at line 307), `calcDispatcher.ts` (1086 actions), `ppDispatcher.ts` (328 actions).
**INTENT:** User opens `/lathe-studio` on the PRISM web app → 6-step wizard (Upload blueprint → Confirm features → Pick strategy → Review preplay → Validate program → Sign off) matching WEDM studio polish while Codex's existing `/lathe`, `/lathe/wizard`, `/lathe/results` routes stay intact as focused entry points.

### U-LTH128 — LatheStudioPage + LatheStudioContext + lathe-studio/ step folder (REUSE, mirror WEDM pattern)
- **Build:** NEW assets only — does not touch Codex's LatheUploadPage/WizardPage/ResultsPage.
  - `mcp-server/web/src/pages/LatheStudioPage.tsx` — thin wrapper (~120 LOC target, matches WireEdmStudioPage shape).
  - `mcp-server/web/src/contexts/LatheStudioContext.tsx` — provider exposing `useLatheNavigation` + `useLatheData` (mirrors `WedmStudioContext.tsx`).
  - `mcp-server/web/src/components/lathe-studio/{WizardShell, StepImport, StepFeatureConfirm, StepStrategyPick, StepPreplay, StepProgramValidate, StepSignoff, LatheCanvas, StepErrorCard, InfoTip}.tsx` — 6 step panels + shared chrome. `LatheCanvas` reuses the existing `LatheBackplot` component (not re-implemented).
  - Route `/lathe-studio` registered in `App.tsx` via `lazyNamed(...)` alongside `WireEdmStudioPage`.
  - Calculator Studio design tokens applied (`prism-glow-*`, `bg-[rgba(2,6,23,0.78)]`, `border-white/10`) — grep check on final files.
  - Each step calls the typed API client for its pipeline stage (P1 speed/feed, P3 master post, P4 print-to-program).
- **Exit Gate:** `LatheStudioPage.tsx ≤ 150 LOC`; 10 components live in `components/lathe-studio/`; provider exports `useLatheNavigation` + `useLatheData`; Playwright smoke test (open → upload sample JM Die print → reach signoff) passes; nav entry visible; `LatheUploadPage`/`LatheWizardPage`/`LatheResultsPage` diff is empty (Codex protection); `WireEdmStudioPage` diff is empty (no shared-component breakage).
- **Rollback:** FILES_CREATED=[LatheStudioPage.tsx, LatheStudioContext.tsx, components/lathe-studio/*.tsx, Playwright test, App.tsx route edit]; ABORT=wizard cannot round-trip OR any Codex page regresses; ROLLBACK=git rm all new files + revert App.tsx.
- **4-LOOP:** BUILD → SCRUTINIZE (reviewer agent on component hygiene + Codex protection compliance) → GAP FILL (per-step error boundaries + skeletons + Calculator Studio tokens) → TIE UP (analytics hooks + a11y pass).
- **Omega floor:** 0.88
- **Depends on:** P0.10, CAMX-MS12 handoff (feature strategy KB).

### U-LTH129 — Populate empty `LatheInputWizard.tsx` + deep-link Codex pages into studio
- **Build:** Fills the currently empty `mcp-server/web/src/components/LatheInputWizard.tsx` (0 LOC today). Exports `LatheWizardResult` type (consumed by `LatheResultsPage.tsx:12`) plus `LatheInputWizard` component used by both `LatheWizardPage` (via composition) and `StepFeatureConfirm` (lathe-studio step) so one schema flows through `/lathe`, `/lathe/wizard`, `/lathe/results`, `/lathe-studio`. Adds deep-link query params on existing Codex routes: `/lathe/wizard?studio=1` and `/lathe/results?studio=1` push into the matching LatheStudio step without mutating the standalone experience. `LatheUploadPage` gains an optional "Launch Studio" CTA that navigates to `/lathe-studio` with the uploaded file id pre-loaded. Backward-compatible: query param absent ⇒ legacy behaviour preserved.
- **Exit Gate:** `LatheInputWizard.tsx` exports `LatheWizardResult` + `LatheInputWizard`; `LatheResultsPage` import resolves without any shim; 3 legacy routes unchanged when query param absent; deep-link into any studio step works; 5 Playwright cases cover standalone + deep-link round-trip; no regression in Codex Upload/Wizard/Results flows.
- **Rollback:** FILES_CREATED=[LatheInputWizard.tsx content]; FILES_MODIFIED=[LatheUploadPage.tsx (CTA only), LatheWizardPage.tsx (query-param branch), LatheResultsPage.tsx (query-param branch), App.tsx (if routing refactor needed)]; ABORT=regression in legacy flow; ROLLBACK=revert all modified files + leave LatheInputWizard empty.
- **Omega floor:** 0.88
- **Depends on:** U-LTH128.

### U-LTH130 — CalculatorPage lathe mode-switch hygiene fix
- **Build:** Extend mode-switch handler at `CalculatorPage.tsx:4271-4383`. Current gap: does NOT reset `selectedTool`, `selectedMaterial`, `machineTypeId`, `operation`, `selectedControllerOption`, `programming`, `selectedToolpath`, `selectedStation`. Add lathe-specific reset block + cross-mode validation helper `validateModeStateCompatibility(fromMode, toMode, state)` so switching mill→lathe does not preserve a ¾" end mill + face_mill operation.
- **Exit Gate:** Mill→lathe and lathe→mill switches clear the 8 stale fields; unit tests cover 6×6 mode transitions; visual regression snapshot stable.
- **Rollback:** FILES_MODIFIED=[CalculatorPage.tsx, calculatorWorkspace.ts]; ABORT=existing lathe flows break; ROLLBACK=revert both files.
- **Omega floor:** 0.88
- **Depends on:** U-LTH128.

### SESSION P0.11-S2 (U-LTH131..U-LTH133)
**SMART_CONFIG:** Role=backend-dev + code-archaeologist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=65%
**KNOWLEDGE:** `mcp-server/web/src/api/*` (87 files, 46% orphan rate), `cross-session-asset-registry.json`, MachineRegistry, ControllerRegistry, P2 Post-Processor Generator (U-LTH15..U-LTH24), `cadGeometry`/`holePattern`/`multiOp`/`toolpath`/`feasibility` clients.
**INTENT:** Every lathe UI control resolves from the registry (no hardcoded defaults), Swiss posts work end-to-end, and the 5 orphan API clients critical to print-to-program are wired.

### U-LTH131 — Remove hardcoded lathe defaults, make registry-aware
- **Build:** Audit CalculatorPage + calculatorWorkspace for hardcoded lathe IDs. Replace `'th-jmd-vdi30-turning-baseline'` (CalculatorPage.tsx:1980-1988) and `'fanuc-wire-standard'` with registry-fetched defaults via `useMachineRegistryDefaults(mode)`. Similar for MACHINE_MODE_OPTIONS (line 307), MODE_NOTES (line 3194), WORKHOLDING_CATEGORY_OPTIONS (calculatorWorkholding.ts:18).
- **Exit Gate:** Zero hardcoded machine/controller IDs in lathe-path files; registry rename test (rename one machine, reload calculator, it still works); 8+ unit tests.
- **Rollback:** FILES_MODIFIED=[CalculatorPage.tsx, calculatorWorkspace.ts, calculatorWorkholding.ts]; ABORT=default selection broken; ROLLBACK=revert 3 files.
- **Omega floor:** 0.90
- **Depends on:** U-LTH130.

### U-LTH132 — Swiss dialect (Citizen/Tsugami) toggle on lathe calculator
- **Build:** Add Swiss dialect dropdown to CalculatorPage lathe mode: `{standard, citizen-cincom, tsugami-swiss}`. When Swiss selected, calcDispatcher routes to CitizenPostEngine / TsugamiPostEngine (built in P2 U-LTH17). Handoff carries dialect in `postProcessorPath` URL params.
- **Exit Gate:** Dropdown renders in lathe mode; selecting Swiss variants invokes correct post engine; Playwright test (mill-turn Swiss fixture → validated G-code) passes.
- **Rollback:** FILES_MODIFIED=[CalculatorPage.tsx, calcDispatcher routing]; ABORT=dialect routing fails; ROLLBACK=revert.
- **Omega floor:** 0.88
- **Depends on:** U-LTH17 (P2 Swiss post engines), U-LTH131.

### U-LTH133 — Wire 5 orphan API clients critical to lathe print-to-program
- **Build:** Wire `cadGeometry`, `holePattern`, `multiOp`, `toolpath`, `feasibility` clients into the lathe studio + `/print-to-cnc` flows. Each gets a hook (`useCadGeometry`, `useHolePattern`, `useMultiOp`, `useToolpath`, `useFeasibility`) and at least 1 page consumer via P4 print-to-program (U-LTH33-U-LTH47).
- **Exit Gate:** Each client's `isOrphan===false` after wiring; orphan-API-client test suite green; print-to-program E2E exercises all 5.
- **Rollback:** FILES_CREATED=[5 hooks]; FILES_MODIFIED=[LatheStudioPage, ProgramReleasePage]; ABORT=orphan count unchanged; ROLLBACK=remove hooks.
- **Omega floor:** 0.88
- **Depends on:** U-LTH128, P4 handoff.

### SESSION P0.11-S3 (U-LTH134..U-LTH135)
**SMART_CONFIG:** Role=mobile-dev + reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=60%
**KNOWLEDGE:** React Context pattern (7 existing providers: Auth, Learning, Ppg, Erp, WedmStudio, OperatingSystem, UI), Zustand, quote + job-cost dispatcher actions, Playwright test harness.
**INTENT:** Multi-op jobs (lathe → WEDM) carry state across pages; calculator hands off to quote + job cost; print→CNC is default-nav-exposed; E2E Playwright locks lathe one-shot flow.

### U-LTH134 — Unified lathe job-session store (lightweight Zustand)
- **Build:** `mcp-server/web/src/stores/latheJobSessionStore.ts` using Zustand. Holds `{jobId, fixtureId, features[], strategy, toolpath, postArtifact, validationReport, signoffDossier}`. Survives route transitions; clears on explicit "new job"; persists to IndexedDB for reload survival. Exposes `useLatheJobSession()` hook.
- **Exit Gate:** Multi-op flow (lathe → save → refresh → resume) preserves state; 10+ tests covering hydration/rehydration/multi-tab; no legacy `jobId-via-URL` regressions.
- **Rollback:** FILES_CREATED=[store + hook + test]; FILES_MODIFIED=[3 lathe pages consume store]; ABORT=state loss on refresh; ROLLBACK=git rm + revert pages.
- **Omega floor:** 0.88
- **Depends on:** U-LTH129.

### U-LTH135 — Forge-Triple for Frontend Integration + Send-To handoffs + default nav
- **Build:** (a) "Send to Quote" + "Send to Job Cost" buttons on LatheStudioPage step 6 → direct dispatcher calls to `prism_business:quote_from_program` and `prism_business:jobcost_from_program`. (b) Default nav exposure for `/print-to-cnc` + `/lathe-studio` in Layout.tsx nav catalog. (c) Forge-Triple: hook `pre-lathe-ui-require-registry-defaults.mjs` (blocks hardcoded ID merges) + action `prism_lathe:ui_state_audit` + skill `/lathe-ui-audit`.
- **Exit Gate:** Send-to-quote / send-to-jobcost round-trips verified; nav shows both routes; 3 Forge-Triple deliverables shipped; Playwright regression lock on full lathe one-shot flow (upload → quote → jobcost).
- **Rollback:** FILES_CREATED=[hook, skill, 2 action handlers]; FILES_MODIFIED=[Layout.tsx, LatheStudioPage]; ABORT=any step breaks; ROLLBACK=git rm + revert.
- **Omega floor:** 0.90
- **Depends on:** U-LTH128, U-LTH129, U-LTH131, U-LTH132, U-LTH133, U-LTH134.

**P0.11 FORGE-TRIPLE:**
- **Hook:** `pre-lathe-ui-require-registry-defaults.mjs` — blocks commits introducing new hardcoded machine/controller IDs in lathe UI files.
- **Action:** `prism_lathe:ui_state_audit` — audits CalculatorPage + LatheStudioPage for hardcoded defaults, orphan clients, mode-switch bugs, returns scorecard.
- **Skill:** `/lathe-ui-audit` — runs audit + surfaces violations in machinist-readable form.
- **Exit Gate:** `/lathe-ui-audit` on PR: zero hardcoded defaults, zero orphan critical clients, mode-switch cross-matrix green, Playwright suite green.

**P0.11 FEATURE CASCADE:**
- NEW_HOOKS: `pre-lathe-ui-require-registry-defaults`
- NEW_ACTIONS: `prism_lathe:ui_state_audit`, `prism_business:quote_from_program`, `prism_business:jobcost_from_program`
- NEW_SKILLS: `/lathe-ui-audit`
- NEW_STORE: `latheJobSessionStore` (Zustand)
- NEW_PAGE: `/lathe-studio` (6-step wizard — **mirrors** the WedmStudioProvider + `wedm-studio/` folder pattern, does NOT clone its step contents).
- NEW_CONTEXT: `LatheStudioContext` (parallel to `WedmStudioContext`).
- NEW_COMPONENTS: `components/lathe-studio/{WizardShell, StepImport, StepFeatureConfirm, StepStrategyPick, StepPreplay, StepProgramValidate, StepSignoff, LatheCanvas, StepErrorCard, InfoTip}`.
- POPULATED_FILE: `components/LatheInputWizard.tsx` (was 0 LOC, provides `LatheWizardResult` type already imported by `LatheResultsPage`).
- REUSED_PAGES (untouched per Codex protection): `LatheUploadPage` (`/lathe`), `LatheWizardPage` (`/lathe/wizard`), `LatheResultsPage` (`/lathe/results`).
- REUSED_COMPONENTS: `LatheBackplot`, `LatheAIPanel`.
- DESIGN_LANGUAGE: Calculator Studio tokens (`prism-glow-*`, `prism-chip`, `prism-spectrum-fill`, `bg-[rgba(2,6,23,0.78)]`, `border-white/10`) per `web/CLAUDE.md`.
- AVAILABLE_TO: P1 (calculator), P2 (post-processor UI), P3 (master post selector), P4 (print-to-program drop zone), P5 (quote/jobcost handoff).

**Alignment with Universal Roadmap:** Executes adjacent to Universal Phase 0 (not parallel). Defers to Universal 0.4 Registry Locks before U-LTH131 lands (prevents concurrent-write corruption of asset registry). U-LTH133 `/web` parity defers to Universal 0.6 Auto-Wiring codegen rather than maintaining a separate mirror.

---

# P1: SPEED & FEED CALCULATOR (8 units, 3 sessions)  → **Feature 1**

**Goal:** Unified, AI-backed speed/feed calculator that the PRISM web app embeds. Machinist inputs {material, tool, operation, machine} → gets {Vc, fn/fz, ap, ae, Pc_predict, T_predict, Ra_predict} with confidence bands and source citations.

### SESSION P1-S1 (U-LTH07..U-LTH09)
**SMART_CONFIG:** Role=backend-dev + physics-reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** SpeedFeedOrchestratorEngine (2851 LOC), KienzleForceModelEngine, StochasticCuttingForceEngine, ChipLoadEngine, lathe-physics-science-tips.ts, constants.ts, FormulaRegistry
**INTENT:** User opens calculator → selects material/tool/op → sees a recommendation with a deep-learning-backed confidence score and a "why this?" explanation.

### U-LTH07 — LatheSpeedFeedCalculatorFacadeEngine
- **Build:** New facade engine that consolidates 16 speed/feed engines behind one `.calculate({material, tool, op, machine}) → {recommendation, band, confidence, sources[], reasoning[]}`. Delegates physics to SpeedFeedOrchestrator, Kienzle, Taylor. Returns `AtomicValue<T>` shape.
- **Exit Gate:** Single-entry API; delegates verified; 12+ tests; no duplication (checked via DuplicationGuardEngine); build passes.
- **Rollback:** FILES_CREATED=[engine + test]; ABORT=fewer than 5 physics sources cited; ROLLBACK=git rm engine.
- **4-LOOP:** BUILD → SCRUTINIZE physics agent → GAP FILL edge cases (zero MRR, extreme Vc) → TIE UP with reasoning[].
- **Omega floor:** 0.88
- **Depends on:** P0 complete

### U-LTH08 — LatheSpeedFeedDeepLearningAdvisorEngine
- **Build:** Neural-net-backed advisor. Consumes facade output + historical job data + tribal tips. Returns deep-learning-adjusted recommendation with explainability (top-3 features by SHAP-like scoring). Uses LatheDeepLearningIntelligenceEngine + LatheAttentionMechanismEngine.
- **Exit Gate:** Deterministic seed reproduces results; 10+ tests; explanation includes ≥ 3 influential features.
- **Depends on:** U-LTH07

### U-LTH09 — LatheSpeedFeedReasoningBridgeEngine
- **Build:** Causal / counterfactual layer. Answers "what if I change tool dia by 10%?" "would lower Vc help?" Uses LatheCausalInferenceEngine + LatheDeepReasoningEngine. Returns scenario deltas with propagated confidence.
- **Exit Gate:** Handles 6+ what-if scenarios; confidence drops correctly under extrapolation.
- **Depends on:** U-LTH07, U-LTH08

### SESSION P1-S2 (U-LTH10..U-LTH12) — `/compact`
**SMART_CONFIG:** Role=backend-dev | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=60%
**KNOWLEDGE:** camDispatcher, web/src/, LatheShopAwareOptimizationEngine, ShopConfigurationEngine

### U-LTH10 — Dispatcher Wiring for Speed/Feed Calculator
- **Build:** Wire `lathe_sf_calculate, lathe_sf_advise, lathe_sf_whatif, lathe_sf_cite_sources, lathe_sf_explain` through camDispatcher. Zod schemas per action. Lazy imports.
- **Exit Gate:** All 5 actions callable via MCP; schemas pass validation; 8+ integration tests.
- **Depends on:** U-LTH07..U-LTH09

### U-LTH11 — Web Calculator Panel (React)
- **Build:** `web/src/pages/LatheSpeedFeedCalculator.tsx` panel. Form → MCP action → result card with bands + explain + whatif. Uses shadcn/ui.
- **Exit Gate:** Renders on dev server; end-to-end form submission produces recommendation; screenshot test.
- **Depends on:** U-LTH10

### U-LTH12 — Shop-Aware Tuning Layer
- **Build:** LatheSpeedFeedShopAwareTuningEngine — adjusts base recommendation by shop-specific actuals from LatheActualFeedbackTuningEngine + LatheShopAwareOptimizationEngine. Uses JM Die profile by default.
- **Exit Gate:** JM Die profile produces measurably-different (>5% delta) results vs generic; 12+ tests.
- **Depends on:** U-LTH07, U-LTH08

### SESSION P1-S3 (U-LTH13..U-LTH14) — `/compact`
**SMART_CONFIG:** Role=tester + perf-analyzer | MODEL=haiku | EFFORT=HIGH | CONTEXT_BUDGET=40%

### U-LTH13 — Speed/Feed Calculator Regression Suite
- **Build:** Golden dataset of 200 {material, tool, op} cases with expected Vc/fn ranges from Sandvik/Kennametal catalogs. Diff test blocks ship if >5% drift.
- **Exit Gate:** 200-case golden snapshot; all within ±5%; regression alarm set.
- **Depends on:** U-LTH07..U-LTH12

### U-LTH14 — Forge-Triple for Speed/Feed Calculator
- **Build:**
  - Hook: `speed-feed-out-of-band-guard` — blocks program commit if recommended Vc exceeds tool/material envelope by > 15%
  - Action: `prism_lathe:sf_full` — one-shot calculate+advise+cite+explain
  - Skill: `/auto-speed-feed-lathe` — full wizard
- **Exit Gate:** All 3 deliverables exist, each with tests.
- **Depends on:** U-LTH07..U-LTH13

**P1 EXIT GATE:** Machinist can open the calculator, enter a real JM Die job, get a recommendation within ±5% of a Sandvik catalog value, see a deep-learning confidence band, ask a what-if, and the result is cited.

**P1 FEATURE CASCADE:**
- `NEW_HOOKS`: speed-feed-out-of-band-guard, speed-feed-explain-required
- `NEW_ACTIONS`: lathe_sf_calculate, lathe_sf_advise, lathe_sf_whatif, lathe_sf_cite_sources, lathe_sf_explain, lathe_sf_full
- `NEW_SKILLS`: /auto-speed-feed-lathe, /sf-whatif
- `AVAILABLE_TO`: P2 (feed-scaling), P3 (master post), P4 (strategy selection), P5 (cost modeling)

---

# P2: POST-PROCESSOR GENERATOR (10 units, 4 sessions)  → **Feature 2**

**Goal:** Given {controller vendor, machine kinematics, axis map, dialect quirks}, automatically GENERATE a new post-processor with full validator stack + regression tests. Not "use an existing post"—**emit a new post-processor artifact**.

### SESSION P2-S1 (U-LTH15..U-LTH17)
**SMART_CONFIG:** Role=backend-dev + code-archaeologist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** All 77 PP* engines, PPEndToEndPostGeneratorEngine, PPMachineSpecificPostEngine, PPControllerEmbeddingEngine, ControllerKnowledgeDBEngine, FanucLegacyControllerEngine, OkumaLegacyControllerEngine, HaasParserEngine, controller-knowledge-tips.ts, okuma-osp-extracted-tips.ts

### U-LTH15 — Controller Spec Ingestion Engine
- **Build:** `LathePostGeneratorSpecIngestEngine` — accepts controller manual (PDF or structured spec) → emits normalized `ControllerSpec` (axis letters, G-code dialect, canned cycle set, macro vars, modal state model). Uses PPControllerEmbeddingEngine for similarity to known controllers.
- **Exit Gate:** Ingests Fanuc 31i-T, Okuma OSP-P300L, Mitsubishi M80 from existing spec files; normalized ControllerSpec JSON validates against Zod schema.
- **Depends on:** P1 complete (for feed-scaling primitives)

### U-LTH16 — Post-Processor Skeleton Generator
- **Build:** `LathePostGeneratorSkeletonEngine` — given ControllerSpec → emits a `NewLathePost.ts` skeleton with all required hooks (feedOverride, modalState, toolChange, coolantSequence, probeCycle). Skeleton pre-wired against all PP* validators.
- **Exit Gate:** Skeleton compiles; passes PPGCodeLintEngine on hello-world fixture; round-trips through PPEndToEndPostGeneratorEngine.
- **Depends on:** U-LTH15

### U-LTH17 — Dialect Transfer Learning
- **Build:** `LathePostDialectTransferEngine` — uses PPDialectTransferEngine + LatheTransferLearningEngine to transfer G-code patterns from a known-good post (e.g., Okuma OSP) to a novel dialect with minimal examples.
- **Exit Gate:** Given 5 Okuma programs + 1 Mitsubishi program, produces a viable Mitsubishi post that passes 80%+ of validator stack.
- **Depends on:** U-LTH15, U-LTH16

### SESSION P2-S2 (U-LTH18..U-LTH20) — `/compact`
**SMART_CONFIG:** Role=backend-dev + physics-reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=65%
**KNOWLEDGE:** All 27 PP* validators, PPPhysicsConstraintValidatorEngine, PPSafetyRuleValidatorEngine

### U-LTH18 — Validator Stack Auto-Wiring for Generated Posts
- **Build:** `LathePostGeneratorValidatorWiringEngine` — automatically wires all 27 PP* validators to the newly-generated post. Includes per-validator config derived from ControllerSpec.
- **Exit Gate:** Generated post runs all 27 validators on a reference program without hard-fail on valid programs.
- **Depends on:** U-LTH16

### U-LTH19 — Regression Test Auto-Generator
- **Build:** `LathePostGeneratorTestSynthEngine` — generates vitest test file for a new post by pulling fixtures from matching reference programs in JM Die archive. Asserts round-trip correctness + validator pass.
- **Exit Gate:** New post emits a test file with ≥ 20 fixtures; all tests pass on skeleton post.
- **Depends on:** U-LTH16, U-LTH18

### U-LTH20 — Knowledge-Graph Integration
- **Build:** `LathePostGeneratorKnowledgeIndexEngine` — each generated post registers into PPKnowledgeIndexEngine + ManufacturingKnowledgeGraphEngine. Queryable by dialect, vendor, machine-kinematics.
- **Exit Gate:** Generated post appears in knowledge graph; discoverable by `prism_knowledge_graph:query_post`.
- **Depends on:** U-LTH15..U-LTH19

### SESSION P2-S3 (U-LTH21..U-LTH23) — `/compact`
**SMART_CONFIG:** Role=backend-dev + ml-developer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=60%
**KNOWLEDGE:** PPMultiModalFusionEngine, PPActiveLearningQueueEngine, PPOnlineLearningTrackerEngine

### U-LTH21 — Active-Learning Feedback Loop
- **Build:** `LathePostGeneratorActiveLearningEngine` — when a generated post fails on the shop floor, the failure is queued into PPActiveLearningQueueEngine. Next regeneration incorporates the correction.
- **Exit Gate:** Simulated failure → queue entry → regen produces corrected post (verified against fixture).
- **Depends on:** U-LTH18, U-LTH19

### U-LTH22 — Uncertainty Quantification for Generated Posts
- **Build:** `LathePostGeneratorUncertaintyEngine` — uses PPEnsembleUncertaintyEngine to produce a per-output confidence (program block-level). Blocks ship if ensemble disagreement > 15% on any block.
- **Exit Gate:** High-risk blocks flagged; confidence published per-program.
- **Depends on:** U-LTH18

### U-LTH23 — Dispatcher Wiring for Generator
- **Build:** Wire `lathe_postgen_ingest, lathe_postgen_skeleton, lathe_postgen_transfer, lathe_postgen_validate, lathe_postgen_test, lathe_postgen_register, lathe_postgen_feedback, lathe_postgen_uncertainty` through camDispatcher.
- **Exit Gate:** All 8 actions callable via MCP; schemas pass; 12+ integration tests.
- **Depends on:** U-LTH15..U-LTH22

### SESSION P2-S4 (U-LTH24..U-LTH24) — `/compact`
### U-LTH24 — Forge-Triple for Post-Processor Generator
- **Build:**
  - Hook: `postgen-validator-skip-guard` — blocks generated post from being registered if any validator disabled
  - Action: `prism_lathe:postgen_full` — one-shot ingest→skeleton→validate→test→register
  - Skill: `/lathe-postgen` — full wizard
- **Exit Gate:** All 3 deliverables exist; end-to-end test produces a working Mitsubishi post.
- **Depends on:** U-LTH15..U-LTH23

**P2 EXIT GATE:** Given a Mitsubishi M80 spec + 3 reference programs, the generator produces a Mitsubishi lathe post that (a) compiles, (b) passes all 27 validators, (c) round-trips a reference program within 95% fidelity, (d) registers into the knowledge graph, (e) exposes its uncertainty per-block.

**P2 FEATURE CASCADE:**
- `NEW_HOOKS`: postgen-validator-skip-guard, postgen-confidence-too-low-guard
- `NEW_ACTIONS`: lathe_postgen_{ingest,skeleton,transfer,validate,test,register,feedback,uncertainty,full}
- `NEW_SKILLS`: /lathe-postgen, /lathe-post-regen
- `AVAILABLE_TO`: P3 (master post uses these as substrate), P4 (print-to-program emits via generated post)

---

# P3: MASTER POST-PROCESSOR (8 units, 3 sessions)  → **Feature 3**

**Goal:** A SINGLE canonical post-processor in the PRISM app that routes to the correct per-machine post for any JM Die machine. User selects machine → Master Post picks the right sub-post → emits G-code → runs full validator stack. Self-aware, self-updating.

### SESSION P3-S1 (U-LTH25..U-LTH27)
**SMART_CONFIG:** Role=system-architect + backend-dev | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** MasterPostProcessorEngine, MasterPostProcessorGeniusEngine, MasterPostProcessorAGIOrchestrationEngine, PostProcessorAGIContinuousLearningEngine, PostProcessorAGIMasterRegistryEngine

### U-LTH25 — LatheMasterPostRouterEngine
- **Build:** Central router. Given {machineId, operation, controller} → selects and invokes correct sub-post. Integrates with ShopConfigurationEngine for JM Die's 7 Okuma lathes + 5 mills + Mitsubishi EDMs.
- **Exit Gate:** Routes to correct sub-post for all 21 JM Die machines; fallback path for unknown machines generates via P2 path.
- **Depends on:** P2 complete

### U-LTH26 — LatheMasterPostUnifiedOutputEngine
- **Build:** Unifies output format across all sub-posts. Every program carries standard header/footer/metadata block regardless of sub-post. Uses PPModalStateTrackerEngine for consistency.
- **Exit Gate:** Output diff between any 2 sub-posts on same operation shows only legitimate dialect differences.
- **Depends on:** U-LTH25

### U-LTH27 — LatheMasterPostSelfAwarenessEngine
- **Build:** Continuously audits sub-posts via PostProcessorAGIContinuousLearningEngine + PostProcessorAISelfAwarenessIntegrationEngine. Detects drift (dialect changes, new validator failures) and flags for regeneration.
- **Exit Gate:** Seeded drift detection produces remediation recommendation.
- **Depends on:** U-LTH25

### SESSION P3-S2 (U-LTH28..U-LTH30) — `/compact`
**SMART_CONFIG:** Role=backend-dev + ml-developer | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=60%

### U-LTH28 — LatheMasterPostDeepReasoningEngine
- **Build:** Uses LatheDeepReasoningEngine + CausalReasoningEngine to explain WHY the master post picked a particular sub-post for a given program. Surfaces the decision chain.
- **Exit Gate:** Any output comes with human-readable decision trace with ≥ 4 reasoning steps.
- **Depends on:** U-LTH25

### U-LTH29 — LatheMasterPostEnsembleCrossCheckEngine
- **Build:** When two sub-posts could both serve a job (e.g., Okuma + Fanuc variant), runs both in ensemble, compares outputs, flags divergence > 10% block-count or > 5% cycle-time.
- **Exit Gate:** Ensemble check triggered on 5+ ambiguous fixtures; divergence reporting accurate.
- **Depends on:** U-LTH25, U-LTH28

### U-LTH30 — LatheMasterPostAPIEngine + Dispatcher Wiring
- **Build:** Wire `lathe_masterpost_route, lathe_masterpost_emit, lathe_masterpost_validate, lathe_masterpost_explain, lathe_masterpost_cross_check, lathe_masterpost_audit` through camDispatcher. Expose via REST in `routes/python-api.ts` for UI consumption.
- **Exit Gate:** Web UI can POST a job → master post → G-code + explanation; E2E test passes.
- **Depends on:** U-LTH25..U-LTH29

### SESSION P3-S3 (U-LTH31..U-LTH32) — `/compact`
### U-LTH31 — Master Post Regression Test Matrix
- **Build:** Golden matrix of 150 jobs across all 21 JM Die machines + 5 validator groups. Diff test blocks ship if any machine produces materially-different output vs baseline.
- **Exit Gate:** 150-cell matrix all green; baseline locked.
- **Depends on:** U-LTH25..U-LTH30

### U-LTH32 — Forge-Triple for Master Post
- **Build:**
  - Hook: `masterpost-unknown-machine-guard` — forces fallback-to-generator path only if machine registered
  - Action: `prism_lathe:masterpost_full` — one-shot route+emit+validate+explain
  - Skill: `/lathe-masterpost` — full wizard
- **Exit Gate:** All 3 deliverables exist.
- **Depends on:** U-LTH25..U-LTH31

**P3 EXIT GATE:** Selecting any JM Die lathe in the PRISM app → Master Post emits validated G-code with explanation trace within 3 seconds. Unknown machines auto-trigger P2 generator path.

**P3 FEATURE CASCADE:**
- `NEW_HOOKS`: masterpost-unknown-machine-guard, masterpost-ensemble-divergence-guard
- `NEW_ACTIONS`: lathe_masterpost_{route,emit,validate,explain,cross_check,audit,full}
- `NEW_SKILLS`: /lathe-masterpost
- `AVAILABLE_TO`: P4 (print-to-program emits via master post), P5 (quoted cost uses master-post time estimate)

---

# P4: PRINT-TO-PROGRAM (THE BIG ONE) (15 units, 6 sessions)  → **Feature 4**

**Goal:** End-to-end blueprint → G-code pipeline. Drop a PDF drawing → OCR extracts dims → feature recognition → GD&T parse → strategy selection → toolpath generation → master post emission → validation → signoff dossier. This is the crown jewel. Requires deepest AGI integration.

### SESSION P4-S1 (U-LTH33..U-LTH35)
**SMART_CONFIG:** Role=ml-developer + backend-dev | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=75%
**KNOWLEDGE:** BlueprintOCREngine, BlueprintVisionOCREngine, PDFBlueprintDimensionExtractorEngine, GDTCalloutParserEngine, GDTStackupEngine, PrintReadingEngine, TurningPrintIntakeEngine, TurningFeatureTaxonomyEngine

### U-LTH33 — Blueprint Ingest + Vision-OCR Pipeline
- **Build:** `LathePrintIngestPipelineEngine` — orchestrates BlueprintVisionOCR + PDFBlueprintDimensionExtractor + GDTCalloutParser. Produces `BlueprintIntake` JSON {dims, tols, GDT, material, surface_finish, notes}.
- **Exit Gate:** Round-trips 10 JM Die drawings with ≥ 90% dim-extraction accuracy vs hand-annotated ground truth.
- **Depends on:** P3 complete

### U-LTH34 — Turning Feature Recognition
- **Build:** `LatheTurningFeatureRecognizerEngine` — from BlueprintIntake → emits list of turning features {OD, ID, face, groove, thread, chamfer, radius} with geometric params. Uses TurningFeatureTaxonomyEngine + FeatureRecognitionEngine.
- **Exit Gate:** Recognizes ≥ 12 standard feature types on 20 JM Die parts; ≥ 95% precision.
- **Depends on:** U-LTH33

### U-LTH35 — GD&T Tolerance Propagation
- **Build:** `LathePrintToleranceStackEngine` — propagates GDT through feature→operation chain. Uses GDTStackupEngine + ToleranceStackUpEngine. Assigns Cpk target per feature based on datum chain.
- **Exit Gate:** Per-feature Cpk target assigned; stack-up warnings surface when chain exceeds tolerance budget.
- **Depends on:** U-LTH34

### SESSION P4-S2 (U-LTH36..U-LTH38) — `/compact`
**SMART_CONFIG:** Role=backend-dev + physics-reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** FeatureStrategyKnowledgeBaseEngine, FeatureToStrategyBridgeEngine, LatheMultiOpPlannerEngine, LatheSequenceOptimizerEngine, LathePartClassifierEngine

### U-LTH36 — Feature-to-Strategy Mapping (CAMX-MS12 handoff)
- **Build:** `LathePrintFeatureStrategySelectorEngine` — consumes feature list + tolerance targets + material + machine → produces strategy plan. Delegates to FeatureStrategyKnowledgeBaseEngine (CAMX-MS12's E1112, 203 rules).
- **Exit Gate:** Every feature type mapped to a strategy; strategies cited with KB rule IDs.
- **Depends on:** U-LTH34, U-LTH35; requires CAMX-MS12 complete (verified ✓ 2026-04-16)

### U-LTH37 — Multi-Op Sequence Planning
- **Build:** `LathePrintSequencePlannerEngine` — from strategy plan → ordered operation sequence with stock state tracking. Uses LatheMultiOpPlannerEngine + LatheSequenceOptimizerEngine + LatheStockEvolutionEngine + StrategySequencingEngine (CAMX-MS12 U06).
- **Exit Gate:** Produces valid sequence (precedence, stock rules honored) for all 20 test parts; cycle-time predicted.
- **Depends on:** U-LTH36

### U-LTH38 — Workholding + Setup Selection
- **Build:** `LathePrintSetupSelectionEngine` — selects chuck jaws, tailstock engagement, steady rest placement based on part geometry. Uses LatheChuckJawSetupEngine + ChuckJawForceEngine + TailstockForceEngine + SteadyRestPlacementEngine + FixtureAwareStrategyEngine (CAMX-MS12 U07).
- **Exit Gate:** Produces setup plan with gripper-force validation; flags parts requiring steady rest.
- **Depends on:** U-LTH36, U-LTH37

### SESSION P4-S3 (U-LTH39..U-LTH41) — `/compact`
**SMART_CONFIG:** Role=backend-dev + ml-developer + physics-reviewer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** LatheProgramOptimizerEngine, LatheCAMIntelligenceEngine, GCodeOptimizationEngine, CuttingForce, Kienzle, ChipLoad

### U-LTH39 — Toolpath Generation + CAM Integration
- **Build:** `LathePrintToolpathGeneratorEngine` — from operation sequence → per-op toolpath. Integrates with LatheCAMIntelligenceEngine for CAM-specific strategies. Uses P1 speed/feed calculator for per-move params.
- **Exit Gate:** Toolpath generated for 15+ feature types; cycle time within 10% of Mastercam ground truth.
- **Depends on:** U-LTH36..U-LTH38; P1 complete

### U-LTH40 — Program Emission via Master Post
- **Build:** `LathePrintProgramEmitterEngine` — sends toolpath through Master Post (P3) → G-code. Attaches signoff dossier.
- **Exit Gate:** G-code produced for 20 JM Die fixtures; all pass PP* validator stack.
- **Depends on:** U-LTH39; P3 complete

### U-LTH41 — Program Validation + Signoff Dossier
- **Build:** `LathePrintProgramSignoffEngine` — runs all 27 PP* validators + physics check + safety check. Produces machinist-grade signoff PDF with {program, toolpath viz, feature→strategy→op table, risk summary, Cpk predictions}. Uses LatheProgramSignoffDossierEngine + LatheFirstPieceApprovalEngine.
- **Exit Gate:** Dossier produced for 15 fixtures; machinist QA review produces ≤ 2 material corrections per 10 dossiers.
- **Depends on:** U-LTH40

### SESSION P4-S4 (U-LTH42..U-LTH44) — `/compact`
**SMART_CONFIG:** Role=ml-developer + backend-dev | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=65%
**KNOWLEDGE:** LatheNeuralIntelligenceEngine, LatheDeepReasoningEngine, LatheAttentionMechanismEngine, LatheTransformerEngine, ManufacturingKnowledgeGraphEngine, KnowledgeGraphNeuralBridgeEngine

### U-LTH42 — Print-to-Program Deep-Learning Intelligence
- **Build:** `LathePrintToProgramDLIntelligenceEngine` — deep-learning model that reviews the full pipeline output, predicts failure probability, and suggests corrections. Uses LatheDeepLearningIntelligenceEngine + LatheAttentionMechanismEngine.
- **Exit Gate:** Failure prediction accuracy ≥ 75% on held-out test set of 50 programs.
- **Depends on:** U-LTH39..U-LTH41

### U-LTH43 — Print-to-Program Reasoning Layer
- **Build:** `LathePrintToProgramReasoningEngine` — explains the full decision chain from print → program. Uses LatheDeepReasoningEngine + LatheOpusReasoningEngine + CausalReasoningEngine + CounterfactualReasoningEngine.
- **Exit Gate:** Produces full reasoning trace with ≥ 10 decision steps for every fixture.
- **Depends on:** U-LTH33..U-LTH42

### U-LTH44 — Print-to-Program Knowledge Graph Integration
- **Build:** `LathePrintToProgramKnowledgeGraphEngine` — every print→program emission adds nodes/edges to ManufacturingKnowledgeGraph. Enables query "show me every job like this one", "what tools did we use last time".
- **Exit Gate:** Graph queries return semantically relevant matches; 5+ queries benchmarked.
- **Depends on:** U-LTH33..U-LTH43

### SESSION P4-S5 (U-LTH45..U-LTH46) — `/compact`
**SMART_CONFIG:** Role=backend-dev + cicd-engineer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=55%

### U-LTH45 — Print-to-Program Dispatcher Wiring + Web UI
- **Build:** Wire `lathe_p2p_ingest, lathe_p2p_features, lathe_p2p_tolerance, lathe_p2p_strategy, lathe_p2p_sequence, lathe_p2p_setup, lathe_p2p_toolpath, lathe_p2p_emit, lathe_p2p_signoff, lathe_p2p_explain, lathe_p2p_kg_query` through camDispatcher. Build web page `web/src/pages/LathePrintToProgram.tsx`.
- **Exit Gate:** Drag-and-drop PDF → program in the UI; 11 actions callable; E2E test passes.
- **Depends on:** U-LTH33..U-LTH44

### U-LTH46 — Print-to-Program End-to-End Regression
- **Build:** Golden matrix of 50 JM Die prints → 50 programs → diff-tested against machinist-approved baseline. Blocks ship on >5% divergence.
- **Exit Gate:** 50-cell matrix green; baseline locked; regression alarm set.
- **Depends on:** U-LTH45

### SESSION P4-S6 (U-LTH47..U-LTH47) — `/compact`
### U-LTH47 — Forge-Triple for Print-to-Program
- **Build:**
  - Hook: `p2p-cpk-below-gate` — blocks emission if Cpk prediction < 1.33 for any feature (uses CpkPredictionGateEngine E1203)
  - Action: `prism_lathe:p2p_full` — one-shot ingest→features→tolerance→strategy→sequence→setup→toolpath→emit→signoff
  - Skill: `/lathe-print-to-program` — full wizard
- **Exit Gate:** All 3 deliverables; full pipeline runs on 10 fresh JM Die prints end-to-end.
- **Depends on:** U-LTH33..U-LTH46

**P4 EXIT GATE:** Drop a PDF blueprint → 60 seconds later you have a validated G-code program with a full signoff dossier (toolpath viz, Cpk predictions, reasoning trace, risk summary). A JM Die machinist reviews 10 programs and accepts ≥ 8 without material corrections.

**P4 FEATURE CASCADE:**
- `NEW_HOOKS`: p2p-cpk-below-gate, p2p-unknown-feature-guard, p2p-low-confidence-guard
- `NEW_ACTIONS`: lathe_p2p_{ingest,features,tolerance,strategy,sequence,setup,toolpath,emit,signoff,explain,kg_query,full}
- `NEW_SKILLS`: /lathe-print-to-program, /lathe-p2p-explain, /lathe-p2p-kg-query
- `AVAILABLE_TO`: P5 (quote pipeline uses p2p for auto-cost)

---

# P5: ERP / BUSINESS MANAGEMENT (10 units, 4 sessions)  → **Feature 5**

**Goal:** Shop-grade business layer — quotes, actual costs, scheduling, customers, inventory, POs, invoicing. Feeds off P1/P3/P4 outputs automatically.

### SESSION P5-S1 (U-LTH48..U-LTH50)
**SMART_CONFIG:** Role=backend-dev + system-architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
**KNOWLEDGE:** QuoteEngine, QuoteEstimatorEngine, QuoteAutopilotEngine, QuoteToShipOrchestratorEngine, InstantQuoteEngine, BlueprintToQuoteBridgeEngine, ActualCostEngine, JobCostingEngine, LathePartCostModelEngine, LatheProgrammingCostEngine

### U-LTH48 — LatheAutoQuoteFromPrintEngine
- **Build:** Bridge P4 print-to-program output → instant quote. Uses BlueprintToQuoteBridgeEngine + QuoteEstimatorEngine + LathePartCostModelEngine. Includes material cost + tool wear cost + cycle time + setup + overhead + margin.
- **Exit Gate:** Quote produced from print within 90 seconds; ≤ 10% variance vs manual quote on 10 JM Die fixtures.
- **Depends on:** P4 complete

### U-LTH49 — LatheActualCostReconciliationEngine
- **Build:** After job completes, reconciles actual cost against quote. Surfaces variance to LatheActualFeedbackTuningEngine → feeds next quote. Uses ActualCostEngine + JobCostingEngine + CostSavingsTrackerEngine.
- **Exit Gate:** Variance report produced; next quote on same part shows reduced variance.
- **Depends on:** U-LTH48

### U-LTH50 — LatheJobSchedulingEngine
- **Build:** Integrates quotes → shop schedule. Uses ShopSchedulerEngine + JobShopSchedulingEngine + ShiftScheduleOptimizerEngine. Visualizes on web schedule board.
- **Exit Gate:** Schedule respects 21-machine constraints, honors due dates, minimizes setup changeovers.
- **Depends on:** U-LTH48

### SESSION P5-S2 (U-LTH51..U-LTH53) — `/compact`
**SMART_CONFIG:** Role=backend-dev | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=55%
**KNOWLEDGE:** CustomerKnowledgeEngine, CustomerManagementEngine, OrderManagerEngine, PurchaseOrderEngine

### U-LTH51 — LatheCustomerOrderLifecycleEngine
- **Build:** Tracks customer → order → quote → job → shipment → invoice lifecycle. Uses JobLifecycleEngine + OrderManagerEngine + CustomerManagementEngine + JobTravelerEngine.
- **Exit Gate:** End-to-end lifecycle visible in web UI; state transitions audited.
- **Depends on:** U-LTH48, U-LTH50

### U-LTH52 — LathePurchaseOrderAutomationEngine
- **Build:** When job quoted → auto-generates PO requirements (stock, tools, consumables). Uses PurchaseOrderEngine + InventoryAwareToolSelectorEngine + InventoryEOQEngine.
- **Exit Gate:** PO draft produced per job; integrates with inventory levels.
- **Depends on:** U-LTH48, U-LTH51

### U-LTH53 — LatheInventoryIntelligenceEngine
- **Build:** Real-time inventory view (stock, tools, consumables) with EOQ + reorder triggers. Uses InventoryOptimizationEngine + InventoryEOQEngine + JMDieProgramInventoryEngine.
- **Exit Gate:** Inventory dashboard live; reorder alerts fire correctly on seeded data.
- **Depends on:** U-LTH52

### SESSION P5-S3 (U-LTH54..U-LTH56) — `/compact`
**SMART_CONFIG:** Role=backend-dev + ml-developer | MODEL=sonnet | EFFORT=HIGH | CONTEXT_BUDGET=55%
**KNOWLEDGE:** JobLearningEngine, JobDeskAggregatorEngine, JobProfitabilityWaterfallEngine, CustomerPortfolioMinerEngine

### U-LTH54 — LatheJobProfitabilityAnalyticsEngine
- **Build:** Per-job profitability waterfall; identifies which customers/parts are most/least profitable. Uses JobProfitabilityWaterfallEngine + CustomerPortfolioMinerEngine.
- **Exit Gate:** Produces profitability report; top-10 and bottom-10 jobs visible in UI.
- **Depends on:** U-LTH49, U-LTH51

### U-LTH55 — LatheBusinessIntelligenceDashboard
- **Build:** Web dashboard consolidating quotes, jobs, schedule, inventory, profitability, KPIs. React page `web/src/pages/LatheERPDashboard.tsx`.
- **Exit Gate:** Dashboard loads on dev server; all 6 tiles populated with live data.
- **Depends on:** U-LTH48..U-LTH54

### U-LTH56 — Dispatcher Wiring for ERP
- **Build:** Wire `lathe_erp_quote_from_print, lathe_erp_reconcile, lathe_erp_schedule, lathe_erp_lifecycle, lathe_erp_po, lathe_erp_inventory, lathe_erp_profitability, lathe_erp_dashboard` through businessDispatcher.
- **Exit Gate:** All 8 actions callable via MCP; schemas pass; 10+ integration tests.
- **Depends on:** U-LTH48..U-LTH55

### SESSION P5-S4 (U-LTH57..U-LTH57) — `/compact`
### U-LTH57 — Forge-Triple for ERP
- **Build:**
  - Hook: `erp-quote-variance-guard` — blocks ship if quote→actual variance > 20% without approval
  - Action: `prism_lathe:erp_full` — one-shot quote_from_print→schedule→po→lifecycle
  - Skill: `/lathe-erp` — full wizard + `/quote-to-ship-lathe`
- **Exit Gate:** All 3 deliverables; end-to-end JM Die order flows through quote→schedule→po→invoice.
- **Depends on:** U-LTH48..U-LTH56

**P5 EXIT GATE:** A JM Die salesperson uploads a PDF → gets a quote in < 2 minutes with ≤ 10% variance vs manual. The job lifecycles through the system: schedule → PO → machine → reconcile → invoice, all visible on the ERP dashboard.

**P5 FEATURE CASCADE:**
- `NEW_HOOKS`: erp-quote-variance-guard, erp-scheduling-conflict-guard, erp-inventory-underrun-guard
- `NEW_ACTIONS`: lathe_erp_{quote_from_print,reconcile,schedule,lifecycle,po,inventory,profitability,dashboard,full}
- `NEW_SKILLS`: /lathe-erp, /quote-to-ship-lathe
- `AVAILABLE_TO`: P1–P4 (closed-loop — actual costs feed tuning layers)

---

# PX: AGI DEEP-LEARNING CROSS-CUTTING (5 units, 2 sessions)

**Goal:** Ensure the AGI substrate actually runs through P1–P5, not just sits as isolated engines. Cross-cutting units that unify DL/NN/reasoning across the five features.

### SESSION PX-S1 (U-LTH58..U-LTH60)
**SMART_CONFIG:** Role=ml-developer + system-architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=75%
**KNOWLEDGE:** LatheAGICoreEngine, LatheDeepReasoningEngine, LatheDeepLearningIntelligenceEngine, LatheNeuralIntelligenceEngine, LatheTransformerEngine, LatheAttentionMechanismEngine, LatheMetaLearningEngine, LatheTransferLearningEngine, LatheCausalInferenceEngine, LatheKnowledgeGraphEngine, CrossDisciplinaryDeepLearningEngine, PRISMCreativeReasoningEngine

### U-LTH58 — LatheAGIFeatureBridgeEngine
- **Build:** Central bridge. Exposes one API `.reason(featureName, context) → {prediction, explanation, confidence, novel_insights[]}` that P1–P5 all consume for AGI augmentation. Routes internally to the right AGI sub-engine.
- **Exit Gate:** All 5 features (P1–P5) call this bridge for augmentation; bridge produces trace for every call.
- **Depends on:** P1..P5 all in-flight or complete; bridge can stub features that aren't built yet

### U-LTH59 — LatheAGIContinuousLearningEngine
- **Build:** Long-running learner. Consumes outcomes from P1 (actual speeds/feeds), P4 (machinist approval/rejection), P5 (profitability variance) → updates deep-learning weights. Uses LatheActiveLearningEngine + LatheMetaLearningEngine + JobLearningEngine.
- **Exit Gate:** Seeded rejection feedback → next prediction on same case shows behavior change.
- **Depends on:** U-LTH58

### U-LTH60 — LatheAGIKnowledgeUnificationEngine
- **Build:** Unifies LatheKnowledgeGraphEngine + ManufacturingKnowledgeGraphEngine + KnowledgeGraphNeuralBridgeEngine into one query surface. Every AGI decision pulls from unified graph.
- **Exit Gate:** Single query endpoint returns nodes+edges from all 3 sub-graphs; graph-backed reasoning traces ≥ 5 steps.
- **Depends on:** U-LTH58

### SESSION PX-S2 (U-LTH61..U-LTH62) — `/compact`
### U-LTH61 — LatheAGISafetyContainmentEngine (integration)
- **Build:** Integrate AGISafetyContainmentEngine to bound AGI outputs — no recommendations outside physics envelope, no cost quotes outside margin bounds, no schedule outside shop capacity. Uses FuzzyNeuralHybridEngine for gradient violations.
- **Exit Gate:** Adversarial test inputs (unsafe speeds, absurd quotes) are caught + rejected with safety trace.
- **Depends on:** U-LTH58..U-LTH60

### U-LTH62 — Forge-Triple for AGI Substrate
- **Build:**
  - Hook: `agi-safety-envelope-guard` — blocks any P1–P5 output that violates AGI safety bounds
  - Action: `prism_lathe:agi_reason` — unified AGI-reasoning endpoint for all 5 features
  - Skill: `/lathe-agi-explain` — produces full AGI reasoning trace for any decision
- **Exit Gate:** All 3 deliverables exist; tested against all 5 features.
- **Depends on:** U-LTH58..U-LTH61

**PX EXIT GATE:** Any P1–P5 output, on request, produces a full AGI reasoning trace with ≥ 5 reasoning steps, confidence bands, and novel-insight flags. Safety bounds are hard-enforced.

**PX FEATURE CASCADE:**
- `NEW_HOOKS`: agi-safety-envelope-guard, agi-reasoning-trace-required
- `NEW_ACTIONS`: lathe_agi_reason, lathe_agi_explain, lathe_agi_safety_check, lathe_agi_knowledge_query
- `NEW_SKILLS`: /lathe-agi-explain, /lathe-agi-reason
- `AVAILABLE_TO`: ALL phases (P1–P5 all depend on this substrate at runtime)

---

## DEPENDENCY DAG (RGS Stage 9)

```
P0 (audit) ──> P1 (speed/feed) ──> P2 (postgen) ──> P3 (masterpost) ──> P4 (print-to-program)
                   │                                                            │
                   ├── PX-S1 (AGI bridge can stub until deps built) ────────────┤
                   │                                                            │
                   └────────────────────────────────────────────────────────────┴──> P5 (ERP)
                                                                                         │
                                                                            PX-S2 (safety containment) ─> SHIP
```

**Critical path:** P0 → P1 → P2 → P3 → P4 → P5 → PX-S2 ≈ 22 sessions (at 3 units/session).
**Parallelizable:** PX-S1 can run in parallel with P2–P5.
**No circular deps.** Verified via DAG tool after Stage 10.

---

## FORGE-TRIPLE SUMMARY (RGS Stage 7) — 18 forge-triples total (v2: +10 scrutiny phases, +1 frontend phase)

| Phase | Hook | Action | Skill |
|-------|------|--------|-------|
| P0 | lathe-inventory-stale-guard | prism_lathe:inventory_snapshot | /lathe-audit |
| P1 | speed-feed-out-of-band-guard | prism_lathe:sf_full | /auto-speed-feed-lathe |
| P2 | postgen-validator-skip-guard | prism_lathe:postgen_full | /lathe-postgen |
| P3 | masterpost-unknown-machine-guard | prism_lathe:masterpost_full | /lathe-masterpost |
| P4 | p2p-cpk-below-gate | prism_lathe:p2p_full | /lathe-print-to-program |
| P5 | erp-quote-variance-guard | prism_lathe:erp_full | /lathe-erp |
| PX | agi-safety-envelope-guard | prism_lathe:agi_reason | /lathe-agi-explain |

**Total new deliverables:**
- **Hooks:** 14 (7 primary + 7 secondary guards per phase)
- **MCP actions:** 62 (sum of all per-phase actions)
- **Skills:** 13
- **New engines:** ~30 (facade/bridge/pipeline — many existing engines reused)
- **Test files:** ~60 (1 per unit)
- **Test cases:** ~620 (10+ per engine)

---

## MCP UTILIZATION PROTOCOL (per-session)

**Session Start:**
```
prism_session:context_boot
prism_session:dispatcher_map
prism_session:memory_recall
prism_session:system_snapshot
prism_session:action_search "lathe <feature>"
```

**Every 5–10 tool calls:**
```
prism_session:auto_checkpoint
prism_session:action_search "<current need>"
prism_session:tool_route_best
prism_session:wip_capture
```

**Session End:**
```
prism_session:memory_save
prism_session:system_snapshot
prism_session:checkpoint_enhanced
```

**Per-unit 4-LOOP:**
```
LOOP 1 BUILD:     /forge-triple (engines + skill + hook)
LOOP 2 SCRUTINIZE: /prism-review + /scrutinize
LOOP 3 GAP FILL:  /test + /trace wiring + edge cases
LOOP 4 TIE UP:    no TODOs, reasoning[] populated, golden snapshot updated
```

---

## EXIT GATES (WHOLE-ROADMAP)

A machinist at JM Die Company should be able to:

1. **Open the PRISM app** → Speed/Feed Calculator panel → enter material + tool + op → get recommendation + explanation within 3 seconds. **[P1]**
2. **Drop a new controller spec PDF** → Post-Processor Generator → get a working post for that controller within 5 minutes. **[P2]**
3. **Select any JM Die machine** → Master Post → emit G-code with unified header/footer/metadata within 3 seconds. **[P3]**
4. **Drop a customer print PDF** → Print-to-Program → get a machinist-grade signoff dossier + G-code within 60 seconds, accepted without material corrections in 8/10 cases. **[P4]**
5. **Same PDF feeds Quote** → ERP dashboard shows quote, schedule, PO draft, inventory check within 90 seconds. **[P5]**
6. **Every output** provides an AGI reasoning trace (≥ 5 reasoning steps, confidence bands, sources cited, novel insights surfaced). **[PX]**

**Aggregate metrics:**
- Omega: 1.0 (target) — every unit's exit gate met
- SVI delta: reachability Ψ ≥ 0.98 (from baseline 0.977) after all phases
- Tests: all test files pass (`npx vitest run`)
- Build: `npm run build:verify` passes
- No regressions: golden datasets for P1 (200 cases), P3 (150 cases), P4 (50 cases) all green

---

## ARCHIVAL NOTICE

On merge of this roadmap:
1. `LATHE-PRO-MS0.json`, `LATHE-PRO-v2.json`, `LATHE-PRO-v3.json`, `LATHE-ROADMAP.json`, `LATHE-AI.json` → mark `status: "archived", superseded_by: "LATHE-MASTER"`
2. `LATHE-COMPREHENSIVE-ROADMAP.md`, `LATHE-PRO-ROADMAP.md`, `LATHE-PRO-v2-ROADMAP.md`, `LATHE-PRO-v3-ROADMAP.md`, `LATHE-UNIFIED-ROADMAP.md`, `LATHE-AWARE-HARDEN-ROADMAP.md`, `lathe-agi-roadmap.md`, `LATHE-EXECUTION-PLAN.md`, `LATHE-TEST-MATRIX.md`, `LATHE-PRO-SCRUTINY-REPORT.md`, `LATHE-PRO-v2-SCRUTINY-REPORT.md` → moved to `plans-archive/lathe-pre-consolidation/` (U-LTH06).

---

## VERSION HISTORY

| Version | Date | Action |
|---------|------|--------|
| 1.0.0 | 2026-04-16 | Initial consolidation of 9 lathe roadmaps (8,831 lines) into 7-phase/62-unit master plan; 10-stage RGS pipeline complete; 3-loop scrutiny pending |
