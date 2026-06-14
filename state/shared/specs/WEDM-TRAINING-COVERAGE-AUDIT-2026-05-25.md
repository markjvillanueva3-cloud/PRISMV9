# WEDM Training Coverage Audit — Cross-Domain Parity + Unwired Engine Inventory

**Date:** 2026-05-25
**Slot:** mike (claude-eb71a012) — flagged for hand-off to charlie (wire-EDM canonical owner per JULIETT-12CHAT)
**Loop:** /loop iter 3-4 (mike-wedm-training-pipeline)
**Status:** advisory · mustHumanVerify · no auto-action

---

## §0 — Executive summary

User work order: *"assess training corpus relative to all other self-training/self-improving loops from other domains currently being worked on. ensure the training for wire is sufficient. also ensure all viable nodes, engines and algorithms and wikis and tribal knowledge are hooked up to the wire edm ai system and the wire edm wizard."*

Findings:

1. **Cross-domain parity gap** — Lathe + Mill + Quoting have a **5-piece training stack** (ContinuousLearning + LoRA Adapter + LoRA Dataset Builder + LoRA Training Script + reward/reason/safety eval). WEDM has **3 of 5** wired — missing **LoRA Dataset Builder** (0-byte stub file on disk!) and **LoRA Training Script** equivalents. Reward/reason/safety eval tests exist for lathe (`U-WIRE-LATHE-LORA-REWARD-SHAPE`, `-REASON-EVAL`, `-SAFETY-EVAL`) but not WEDM.
2. **Engine inventory** — **164 WEDM+WireEDM engines** on disk (vs 103 in stale WEDM_DIGEST regenerated 2026-04-17). edmDispatcher wires ~60 of them. ~100 engines remain unwired or wired-but-utilization=0 in /system-viz.
3. **`WEDMLoRADatasetBuilderEngine.ts` is 0 BYTES** — concrete proof-of-gap. Empty stub file blocks `wedm_lora` r=4 training run (U-TRAIN-13 from REVENUE-ROADMAP-v7.6).
4. **The full "Wire EDM AI" tier engines are all orphan** — WireEDMMasterAIEngine (51KB), WireEDMAGIOrchestrator (58KB), WireEDMDeepAIHardeningEngine (63KB), WireEDMUnifiedScienceEngine (30KB), WireEDMKnowledgeSynthesisEngine (49KB), WireEDMDeepReasoningEngine (33KB), WireEDMNeuralOrchestrationEngine (31KB), WireEDMPredictiveIntelligenceEngine (33KB), WireEDMResearchAIEngine (30KB), WireEDMCAMKnowledgeEngine (35KB), WireEDMSelfAwarenessIntegrationEngine (22KB) — none referenced in edmDispatcher.ts. Total: **~600 KB of WireEDM "AI tier" engine code is orphaned** from the dispatcher.
5. **Wire wizard frontend pages** — U-REV-WEDM-01..07 from REVENUE-ROADMAP-v7.6 (WireEdmStudioPage, WireEdmProgramPage, WireEdmCostPage, WireEdmMultipassPage, WireEdmTroubleshootPage, WireEdmControllerSelectPage, WireEdmReportPage) are still pending.

---

## §1 — Cross-domain self-training loop parity

Inventory of `*ContinuousLearning*`, `*LearningLoop*`, `*Lora*`, `*TrainingScript*`, `*DatasetBuilder*` engines per domain.

| Domain | ContinuousLearning | LearningLoop | LoRA Adapter | LoRA Dataset Builder | LoRA Training Script | Reward Eval | Reason Eval | Safety Eval | Sufficient? |
|---|---|---|---|---|---|---|---|---|---|
| **Lathe** | `LatheAGIContinuousLearningEngine` ✓ | (via AGI) | `LatheLoRAAdapterEngine` ✓ | `LatheLoRADatasetBuilderEngine` ✓ | `LatheLoRATrainingScript` ✓ (wired in camDispatcher, U-FOXTROT-LATHELORA `8b2a89f5f8`) | `U-WIRE-LATHE-LORA-REWARD-SHAPE` ✓ | `U-WIRE-LATHE-LORA-REASON-EVAL` ✓ | `U-WIRE-LATHE-LORA-SAFETY-EVAL` ✓ | **YES — gold standard** |
| **Mill** | `MillAGIContinuousLearningEngine` ✓ | — | (assume MillLoRAAdapter) | `MillingLoRADatasetBuilderEngine` ✓ (wired test `MillingLoRADatasetBuilderWiring.test.ts`) | — | — | — | — | **Partial** — has dataset builder, missing training-script + evals |
| **CAM** | — | (umbrella via CAM dispatchers) | — | — | `camDispatcher.lathe-lora-script-wire` (cross-domain) | — | — | — | **Cross-domain only** |
| **Quoting** | — | `QuotingTrainingLoopEngine` ✓ + `QuotingCalibrationEngine` ✓ + `QuotingDeepReasoningBridgeEngine` ✓ + `DocustrataHistoricalPricingTrainerEngine` ✓ | — | — | — | — | (via DeepReasoning) | — | **Sufficient** — different shape (pricing-driven, not LoRA) |
| **PSN umbrella** | — | `PSNSelfImprovingLoopEngine` ✓ | — | — | — | — | — | — | — |
| **Post-processor** | `PostProcessorAGIContinuousLearningEngine` ✓ | — | — | — | — | — | — | — | **Partial** — has continuous-learn only |
| **CAD** | (via PRISM CAD Dispatcher 564 actions) | (no engine, but `cad-fidelity-normalized` close-loop in delta /loop iter15) | — | — | — | — | — | — | **Cross-domain via CAD-PIPELINE-WIRE-MS0** |
| **WEDM** | `WEDMContinuousLearningEngine` ✓ (NOT WIRED in edmDispatcher) | `WEDMLearningLoopEngine` ✓ (NOT WIRED in edmDispatcher) | `WEDMLoRAAdapterEngine` ✓ (wired as `loraAdapter`) | **`WEDMLoRADatasetBuilderEngine.ts` is 0 BYTES** — empty stub | **MISSING** | — | — | — | **NO — biggest gap in fleet** |

### §1.1 Verdict
WEDM has **the most engines of any domain (164)** but the **weakest training loop wiring**. The corpus building substrate is incomplete (0-byte dataset builder + no training script + no eval suite). This is the user's "sufficient?" question answered: **insufficient relative to lathe**.

---

## §2 — WEDM engine ↔ dispatcher coverage matrix

Method: ls of `WEDM*.ts` + `WireEDM*.ts` (164 engines) cross-referenced against `case "X": return _X ??=` lines in `edmDispatcher.ts` (~60 wired engines).

### §2.1 — WIRED engines (✓ in edmDispatcher, ~50)

`WEDMLoRAAdapter, WEDMEWCMemory, WEDMOnlineLearning, WEDMTransferLearning, WEDMFewShotMaterial, WEDMTribalTipLearner, WEDMTribalRuntime, WEDMGraphAttention, WEDMLatticeGraph, WEDMMLParameterOptimizer, WEDMFeatureImportance, WEDMThermalField, WEDMSparkErosionModel, WEDMGapVoltageControl, WEDMMRRPhysics, WEDMWireStressAnalysis, WEDMWireTensionOptimizer, WEDMWeibullWireLife, WEDMWireHeating, WEDMKerfWidth, WEDMWireDeflection, WEDMThinWireDerate, WEDMPrintToProgram, AutoPrintToProgramBridge, WEDMJobOutcome, WEDMRaPredictor, WEDMWireBreakPredictor, WEDMRecastDepthPredictor, WEDMNeighborQuery, WEDMAutonomySubstrateGate, WEDMRecastLayerML, WEDMHeatAffectedZone, WEDMPostDialectRouter, EDMSurfaceIntegrity, MicroEDM, SinkerEDMCalculator, EDMDrawingInterpretation, EDMFeasibility, EDMMaterialMachineWire, EDMStartHoleSetup, EDMToolpathStrategy, EDMMultiPassStrategy, EDMCuttingParamFlush, EDMWireSlugCornerTaper, EDMMonitorSurfaceIntegrity, EDMPostProcessGCode, EDMCostDocumentation, EDMQualityOrchestrator, EDMBiMaterialCompensation, WireEDMSettings`.

### §2.2 — ORPHAN engines (✗ not in edmDispatcher)

**P0 — Wire EDM "AI tier" master engines (zero dispatcher actions, ~600 KB of code):**
- `WireEDMMasterAIEngine` (51 KB)
- `WireEDMAGIOrchestrator` (58 KB)
- `WireEDMDeepAIHardeningEngine` (63 KB)
- `WireEDMDeepNeuralReasoningEngine` (31 KB)
- `WireEDMDeepReasoningEngine` (33 KB)
- `WireEDMDeepLogicEngine` (29 KB)
- `WireEDMUnifiedScienceEngine` (30 KB)
- `WireEDMKnowledgeSynthesisEngine` (49 KB)
- `WireEDMNeuralOrchestrationEngine` (31 KB)
- `WireEDMPredictiveIntelligenceEngine` (33 KB)
- `WireEDMResearchAIEngine` (30 KB)
- `WireEDMAdvancedNeuralEngine` (35 KB)
- `WireEDMSelfAwarenessIntegrationEngine` (22 KB)
- `WireEDMCAMKnowledgeEngine` (35 KB)
- `WireEDMMachineTechDataEngine` (30 KB)
- `WireEDMAIPrintToProgramEngine` (38 KB)
- `WireEDMProgramParserEngine` (25 KB)

**P0 — Learning loop engines (the user's actual goal):**
- `WEDMContinuousLearningEngine` (15 KB) — orphan
- `WEDMLearningLoopEngine` (9 KB) — orphan
- `WEDMNeuralTrainingEngine` (**85 KB** — biggest WEDM engine!) — orphan
- `WEDMRLControllerEngine` (14 KB) — orphan
- `WEDMRewardShapingEngine` (11 KB) — orphan
- `WEDMRolloutSimulatorEngine` (10 KB) — orphan
- `WEDMRLPolicyPersistence` (5 KB) — orphan
- `WEDMPrototypicalNetworkEngine` (14 KB) — orphan
- `WEDMKnowledgeDistillationEngine` (11 KB) — orphan
- `WEDMNeuralFormulaFusionEngine` (8 KB) — orphan
- `WEDMFewShotEngine` (18 KB) — orphan (note: `WEDMFewShotMaterialEngine` IS wired — distinct engines, both exist)
- `WEDMLoRACadenceEngine` (2 KB) — orphan
- `WEDMLoRADatasetBuilderEngine` (**0 BYTES** — empty stub, blocks training run)

**P0 — Big orchestrators (the wizard backbone):**
- `WEDMCompleteOrchestrationEngine` (59 KB) — orphan
- `WEDMProgramOptimizerEngine` (41 KB) — orphan
- `WEDMProgramNeuralAnalysisEngine` (62 KB) — orphan
- `WEDMBatchProgramAnalyzerEngine` (39 KB) — orphan
- `WEDMStrategyLibraryEngine` (42 KB) — orphan
- `WEDMCalculatorAIEngine` (22 KB) — orphan
- `WEDMPartFamilyMatcherEngine` (23 KB) — orphan
- `WEDMPartFamilyTemplateExtractorEngine` (29 KB) — orphan (shipped by TRAINING-LEARNING-MS0 — confirm wiring)
- `WEDMSelfAwarenessEngine` (16 KB) — orphan

**P1 — Specialty guards (safety) NOT in dispatcher:**
- `WEDMCurrentDensityGuardEngine` — orphan (SAFETY-CRITICAL — Ω≥0.95 required)
- `WEDMPulseLimitEngine` — orphan (SAFETY-CRITICAL)
- `WEDMPowerDensityGuardEngine` — orphan (SAFETY-CRITICAL)
- `WEDMFlushAdequacyGateEngine` — orphan
- `WEDMProgramSafetyGateEngine` — orphan
- `WEDMProgramVerificationEngine` — orphan
- `WEDMTier6GeomGateEngine` — orphan
- `WEDMThermalReleaseGateEngine` — orphan
- `WEDMUnitTagGateEngine` — orphan
- `WEDMPreFlightCheckEngine` — orphan

**P1 — Tribal + reasoning:**
- `WEDMReasoningExplainEngine` — orphan
- `WEDMReasoningBridgeEngine` — orphan
- `WEDMReasoningTraceLedgerEngine` — orphan
- `WEDMCitationCheckEngine` — orphan
- `WEDMDeviationToTipEngine` — orphan
- `WEDMAnalogicalReasoningEngine` — orphan
- `WEDMHierarchicalPlannerEngine` — orphan
- `WEDMFaultDiagnosisEngine` — orphan
- `WEDMWhatIfSimulatorEngine` — orphan
- `WEDMProcessCausalityEngine` — orphan
- `WEDMTradeoffElicitationEngine` — orphan

**P1 — Calibration + feedback:**
- `WEDMCalibrationReportEngine` — orphan
- `WEDMFeedbackCalibrationEngine` — orphan
- `WEDMFeedbackIngestionEngine` — orphan
- `WEDMDriftDetectionEngine` — orphan
- `WEDMDegradationModelEngine` — orphan
- `WEDMModelUpdateEngine` — orphan
- `WEDMOffsetSPCEngine` — orphan
- `WEDMBenchmarkToleranceEngine` — orphan

**P2 — Business + scheduling:**
- `WEDMInvoiceLineEngine`, `WEDMJobCostEngine`, `WEDMJobCreatorEngine`, `WEDMOverageApprovalEngine`, `WEDMSchedulingEngine`, `WEDMMaintenanceSchedulerEngine`, `WEDMCreditCostEngine`, `WEDMQuoteBridgeEngine`, `WEDMWirePremiumROIEngine`, `WEDMWireBreakRiskCostEngine`, `WEDMWireSpoolConsumptionEngine` — all orphan

**P2 — Niche + specialty:**
- `WEDMAccessibilityEngine`, `WEDMActiveQueryEngine`, `WEDMAdaptivePassEngine`, `WEDMArchiveBackfillEngine`, `WEDMAutonomyAuditEngine`, `WEDMAwarenessAdoptionEngine`, `WEDMBlackboardEngine`, `WEDMControllerDialectVerifierEngine`, `WEDMCornerPhysicsEngine`, `WEDMDXFClosureValidatorEngine`, `WEDMDielectricCorrectionEngine`, `WEDMDielectricFlushAdjustEngine`, `WEDMDwgImportEngine`, `WEDMExceptionHandlerEngine`, `WEDMFailsafeEngine`, `WEDMFixtureInterferenceEngine`, `WEDMHeadClearanceEngine`, `WEDMHumanHandoffEngine`, `WEDMJobPatternLearnerEngine`, `WEDMKalmanFusionEngine`, `WEDMMachineStateEngine`, `WEDMMaterialCharacterizationEngine`, `WEDMMaterialSparkDatabaseEngine`, `WEDMMultiAgentDispatchEngine`, `WEDMMultiProfileBatchEngine`, `WEDMParetoCacheEngine`, `WEDMParetoFrontierSearchEngine`, `WEDMPartRecognitionEngine`, `WEDMPostAgieEngine`, `WEDMPostFanucEngine`, `WEDMPostMakinoEngine`, `WEDMPostMitsubishiEngine`, `WEDMPostSodickEngine`, `WEDMProductionReadinessEngine`, `WEDMProgramComparisonEngine`, `WEDMProgressTrackerEngine`, `WEDMRULEngine`, `WEDMRecipeAdaptationEngine`, `WEDMSafetyEnvelopeEngine`, `WEDMSequencingEngine`, `WEDMSetupSheetEngine`, `WEDMSlugTabRetentionEngine`, `WEDMStartPointOptimizationEngine`, `WEDMTabStrategyEngine`, `WEDMTaperErrorBudgetEngine`, `WEDMVirtualMachineEngine`, `WEDMWirePathCollisionEngine`, `WEDMWireThreadingMinEngine`, `WireEDMPunchDieAdapterEngine`

**Total orphans: ~100 engines** (per-priority count: P0 ~30, P1 ~30, P2 ~40).

### §2.3 — Note: wired-but-utilization-0
`prism_session:master_index_query` reports `utilization:0` for all 20+ WEDM engines surfaced in §0 because they have no `prism_session:action_resolution_index` hits — i.e., even wired engines may not be reached from the wizard frontend or other consumers. **The wizard frontend is the missing consumer**.

---

## §3 — Wiki + tribal coverage

| Asset class | Count | Wired into WEDM AI / wizard? |
|---|---|---|
| WEDM tribal tips | 46 (per WEDM_DIGEST) | YES via `WEDMTribalRuntimeEngine` + `WEDMTribalTipLearnerEngine` (both wired) + `tribal-by-domain-inject` Tier-2 UserPromptSubmit hook (slot:foxtrot domain filter `tribal\|machining-knowhow\|...`) |
| WEDM playbooks | 8 (per WEDM_DIGEST: drawing-to-program, wire-break-diagnosis, new-material-learning, batch-optimization, quality-gate-review, parameter-tuning, jm-die-customer, continuous-learning) | YES — but per-playbook wiring not verified end-to-end into wizard frontend |
| WEDM wiki entries (knowledge/wiki/{lessons,code-tribal,architecture}/) | Unverified — needs `rtk find knowledge/wiki/ -name "*wedm*"` count | Partial |
| WEDM published formulas | 14 (per WEDM_DIGEST: Klocke Ra, DiBitonto crater, Kunieda energy, Toenshoff cascade, Carslaw&Jaeger recast, Sato speed, Puertas&Luis Ra, wire deflection, +6 more) | Stored in `src/physics/constants.ts` per CLAUDE.md doctrine, but no per-formula dispatcher action audit done |
| WEDM controller dialects | 5 (Mitsubishi, Sodick, Makino, Agie, Fanuc) | `WEDMPostMitsubishiEngine`, `WEDMPostSodickEngine`, `WEDMPostMakinoEngine`, `WEDMPostAgieEngine`, `WEDMPostFanucEngine` — **all 5 controller post engines are ORPHAN** (only `wedmPostDialectRouter` is wired). The hard-coded per-controller programs the user requested **DO exist on disk** but are not callable from the wizard. |
| MIT-OCW WEDM courses | 5 (per WEDM_DIGEST.WEDM_MIT_OCW_INTEGRATION.json) | YES — `WEDM_MIT_OCW_INTEGRATION.json` + `WEDM_MIT_TIPS.json` state files persist |

**Tribal/wiki sufficiency:** The substrate is there (3,919-tip corpus + 46 WEDM-specific tips + tribal-by-domain-inject auto-firing + 5 MIT-OCW courses). The injection is wired. The gap is **the wizard frontend doesn't consume them yet** — there's no UI surface that says "for this print, here are the top 3 tribal tips + the matching playbook."

---

## §4 — Concrete remediation plan (replaces my prior draft WEDM-TRAINING-WIZARD-MS0)

Revised milestone scope after R8 audit, now with KEEP/SKIP/REVISE per unit:

| Unit | Verdict | Notes |
|---|---|---|
| U-WTW01 (WEDMTrainingCorpusEngine) | **SKIP** | TRAINING-LEARNING-MS0/U4 already ships WEDM corpus scanner. Verify wiring + re-use. |
| U-WTW02 (Program-Print pair extractor) | **SKIP** | Same — TRAINING-LEARNING-MS0 delivery |
| U-WTW03 (CAD path match) | **SKIP** | `CADArchiveJoinAugmenterEngine` already exists |
| U-WTW04 (dispatcher actions for corpus) | **REVISE** | Wire existing engines into edmDispatcher — additive |
| U-WTW05 (PartFamilyTemplate) | **SKIP** | `WEDMPartFamilyTemplateExtractorEngine` already on disk (29 KB) — TRAINING-LEARNING-MS0 delivery. Wire it. |
| U-WTW06 (JM-Die template catalog gen) | **KEEP** | The CLI that runs the existing engine across JM Die archive. Not built. |
| U-WTW07 (template-query dispatcher) | **REVISE** | Add `wedm_template_query` / `wedm_template_recommend` to edmDispatcher — additive |
| U-WTW08 (FeatureProgramCatalog) | **KEEP** | 5 controllers × N feature types. Per-controller engines exist but unwired and lack a feature-catalog wrapper. |
| U-WTW09 (tribal injection node generator) | **KEEP** | Auto-emit per-process tribal pages — net new |
| U-WTW10 (dispatcher actions for catalog) | **KEEP** | Wire the new feature catalog |
| U-WTW11 (PersistentLearningLoop orchestrator) | **REVISE — split** | Orchestrator engine exists fragmented (WEDMContinuousLearning + LearningLoop + RLController etc — all orphan). Wire them into edmDispatcher FIRST (new sub-unit U-WTW11a), then build a single thin orchestrator U-WTW11b |
| U-WTW12 (first wedm_lora r=4 run) | **BLOCKED by NEW unit** | **Cannot run** — WEDMLoRADatasetBuilderEngine is 0 BYTES. New prerequisite unit: **U-WTW00-BUILD-LORA-DATASET-BUILDER**. Then run lora training script (also missing — clone from `LatheLoRATrainingScript`). |
| U-WTW13 (wire wizard frontend pages) | **KEEP** | 7 pages from U-REV-WEDM-01..07 |
| U-WTW14 (end-to-end wizard pipeline) | **KEEP** | Final integration unit |

### §4.1 — New units to ADD (not in original draft)

| Unit | Title |
|---|---|
| **U-WTW00** | Build WEDMLoRADatasetBuilderEngine (0-byte stub → real engine, mirror LatheLoRADatasetBuilder) |
| **U-WTW00a** | Build WEDMLoRATrainingScript (mirror LatheLoRATrainingScript) |
| **U-WTW00b** | Reward/reason/safety eval tests for WEDM LoRA (mirror U-WIRE-LATHE-LORA-* triad) |
| **U-WTW-WIRE-AI-TIER** | Wire the 13 WireEDM*-prefixed "AI tier" engines into edmDispatcher (Master, AGI, DeepAI, DeepNeural, DeepReasoning, DeepLogic, UnifiedScience, KnowledgeSynthesis, NeuralOrchestration, PredictiveIntelligence, Research, Advanced, SelfAwareness, CAMKnowledge, MachineTechData, AIPrintToProgram, ProgramParser) |
| **U-WTW-WIRE-LEARN-LOOP** | Wire the 13 learning-loop engines into edmDispatcher (ContinuousLearning, LearningLoop, NeuralTraining, RLController, RewardShaping, RolloutSimulator, RLPolicyPersistence, PrototypicalNetwork, KnowledgeDistillation, NeuralFormulaFusion, FewShot, LoRACadence, LoRADatasetBuilder) |
| **U-WTW-WIRE-SAFETY** | Wire 10 orphan safety/guard engines (CurrentDensity, Pulse, PowerDensity, FlushAdequacy, ProgramSafety, Verification, Tier6Geom, ThermalRelease, UnitTag, PreFlight) — all SAFETY-CRITICAL Ω≥0.95 |
| **U-WTW-WIRE-REASONING** | Wire 11 orphan reasoning/tribal engines (ReasoningExplain, ReasoningBridge, ReasoningTraceLedger, CitationCheck, DeviationToTip, AnalogicalReasoning, HierarchicalPlanner, FaultDiagnosis, WhatIfSimulator, ProcessCausality, TradeoffElicitation) |
| **U-WTW-WIRE-CALIB** | Wire 8 orphan calibration/feedback engines (CalibrationReport, FeedbackCalibration, FeedbackIngestion, DriftDetection, DegradationModel, ModelUpdate, OffsetSPC, BenchmarkTolerance) |
| **U-WTW-WIRE-CONTROLLERS** | Wire 5 controller post engines (PostMitsubishi, PostSodick, PostMakino, PostAgie, PostFanuc) — currently only the router is wired |
| **U-WTW-WIRE-ORCHESTRATORS** | Wire 7 big orchestrators (CompleteOrchestration, ProgramOptimizer, ProgramNeuralAnalysis, BatchProgramAnalyzer, StrategyLibrary, CalculatorAI, SelfAwareness) |

### §4.2 — Final revised milestone shape

**WEDM-TRAINING-WIZARD-MS0** (revised after audit):
- Phase 0 — **LoRA gap closure** (U-WTW00, U-WTW00a, U-WTW00b): 3 units
- Phase 1 — **Wire-the-orphans** (U-WTW-WIRE-AI-TIER, -LEARN-LOOP, -SAFETY, -REASONING, -CALIB, -CONTROLLERS, -ORCHESTRATORS): 7 units (purely additive to edmDispatcher — no new engines, only dispatcher cases + tests)
- Phase 2 — **Templates + catalogs** (U-WTW06, U-WTW07, U-WTW08, U-WTW09, U-WTW10): 5 units
- Phase 3 — **Learning loop orchestrator** (U-WTW11a, U-WTW11b, U-WTW12): 3 units
- Phase 4 — **Wire wizard frontend** (U-WTW13, U-WTW14): 2 units

**Total: 20 units** (up from draft 14, but with proper dedup against existing substrate).

---

## §5 — Recommendations (action items)

1. **Hand off to charlie (canonical wire-EDM slot per JULIETT-12CHAT).** Mike's soul is misc-cleanup; mike picked this up because the user explicitly typed `/checkin-mike` but the unit "graduates beyond misc" the moment build starts (per slot-soul refuse-list). Use `/handoff-mike` → `/checkin-charlie /loop <continue WEDM-TRAINING-WIZARD-MS0>`.
2. **Edit `WEDM-TRAINING-WIZARD-MS0.json` envelope** (currently `status:draft_pending_dedup`) to apply the §4 unit revisions.
3. **Start with U-WTW00** (build the 0-byte `WEDMLoRADatasetBuilderEngine.ts`) — this is the highest-leverage single unit because it unblocks U-WTW12 and gives WEDM training parity with lathe.
4. **Phase 1 (wire-the-orphans) is the fastest leverage** — 7 units, no new engines, ~50 lazy-load cases + ~50 action cases + ~50 tests. This single phase brings utilization from ~50 wired to ~150 wired engines (3× increase) and surfaces them in `/system-viz` + master-index.
5. **Run `/system-viz` after each wiring batch** to confirm `utilization>0` for the formerly-orphan engines.
6. **Re-run WEDM_DIGEST regeneration** (`npx ts-node scripts/wedm_generate_digest.ts`) after Phase 1 — current digest (2026-04-17) shows 103 engines vs 164 on disk, 6+ weeks stale.

---

## §6 — Cross-references

- CLAUDE.md §`/checkin-<nato> /loop` (the contract that brought us here)
- CLAUDE.md §SCRUTINY GATE (3-of-3 PASS required at close-out)
- CLAUDE.md §PER-FILE SCRUTINY GATE (2 parallel reviewers per file in multi-file builds)
- CLAUDE.md §WEDM AGI Status (live digest pointer)
- `state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md` (canonical sister-milestone spec)
- `mcp-server/data/milestones/WEDM-TRAINING-WIZARD-MS0.json` (this milestone, draft)
- `mcp-server/data/milestones/WEDM-NEXT-MS0.json` (8 pending P3-P5 units — distinct scope)
- `knowledge/wiki/reference/jm-die-profile.md` (test-shop ground truth)
- `[[feedback_ai_training_first_before_revenue]]` (doctrine: train before revenue)
- `[[reference_wedm_wizard_proof_and_architecture_2026_05_22]]` (recent WEDM wizard architecture memo)
- `[[feedback_high_roi_backend_first_slot_queue]]` (P0 wire-the-orphans before frontend)
