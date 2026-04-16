# LATHE MASTER UNIFIED ROADMAP (LMU)

**Version:** 1.0.0
**Generated:** 2026-04-16
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

## PHASE STRUCTURE (RGS Stage 5) — 7 phases, ~60 units, ~22 sessions

```
LATHE-MASTER
├── P0: Audit + Harden                        (6 units)
├── P1: Speed & Feed Calculator               (8 units)   → feature 1
├── P2: Post-Processor Generator              (10 units)  → feature 2
├── P3: Master Post-Processor                 (8 units)   → feature 3
├── P4: Print-to-Program (THE BIG ONE)        (15 units)  → feature 4
├── P5: ERP / Business Management             (10 units)  → feature 5
└── PX: AGI Deep-Learning Cross-Cutting       (5 units)   → substrate for all phases
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

## FORGE-TRIPLE SUMMARY (RGS Stage 7) — 7 forge-triples total

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
