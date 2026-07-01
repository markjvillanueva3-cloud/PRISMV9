# PRISM AI Hierarchy Inventory — §0.5

**Generated:** 2026-05-02 (work order H:/last.md §0.5)
**Method:** Source-code reading (engines + dispatchers); feedback_loop_wired verified by grepping for `recordOutcome|onActuals|consumeActuals|measuredOutcome|updateFromFeedback` plus actual subscription patterns. **Honesty over polish** — many AGI orchestrators self-claim "closed-loop" in JSDoc but have zero feedback subscription in code.

---

## Tier Summary

| Tier | Description | Count |
|------|-------------|-------|
| TIER-1 | Master Orchestrator (Claude — desktop/CLI) | 1 (external) |
| TIER-2 | Full-System AI Coordinator | 4 candidates (overlapping; no single canonical) |
| TIER-3 | Domain Specialist AIs | 19 distinct domain AI nodes |
| **Total** | **AI engines on disk** | **~360+** (incl. 80+ LoRA support, 24 deep-reasoning, 28 neural) |

---

## TIER-1 — Master Orchestrator

```yaml
- ai_id: claude_master
  tier: 1
  capabilities:
    deep_learning: true   # external (Anthropic)
    deep_reasoning: true
    machine_learning: true
  domain: cross
  engines_implementing: []   # no on-disk engine — Claude is external
  dispatchers_used:
    - ALL 90+ prism_* dispatchers
  upstream: []   # apex
  downstream:
    - tier2_coordinator (none canonical — see Tier-2 ambiguity below)
    - tier3_specialists (direct invocation pattern today)
  invocation_pattern: human-driven CLI / MCP tool calls
  training_status: production (model: claude-opus-4-7[1m])
  training_data_location: external
  training_data_freshness: 2026-01 (cutoff)
  feedback_loop_wired: partial   # via PRISMSelfAwarenessEngine.recommendAIFeatures + tribal_capture skills, NOT a structured actuals→model loop
  feedback_signals_consumed: [tribal_tips, decision_log, scrutiny_ledger]
  last_invocation_timestamp: live
  wired_status: production
```

---

## TIER-2 — Full-System AI Coordinator (CANDIDATES — no single canonical)

> **CRITICAL FINDING:** No engine clearly named "FullSystemAICoordinator" exists. Four engines overlap this role with different framings. The handoff protocol (output #3) MUST resolve which is canonical.

### 2a. PRISMUnifiedOrchestratorEngine
```yaml
- ai_id: prism_unified_orchestrator
  tier: 2
  capabilities:
    deep_learning: false
    deep_reasoning: partial   # routes to MultiPathReasoning
    machine_learning: false
  domain: cross
  engines_implementing: [PRISMUnifiedOrchestratorEngine]
  dispatchers_used: [prism_orchestrate, prism_autonomous]
  upstream: [claude_master]
  downstream: [tier3_specialists]
  invocation_pattern: master / autonomous
  training_status: untrained
  feedback_loop_wired: false
  feedback_signals_consumed: []
  wired_status: beta
```

### 2b. AISystemRouterEngine
```yaml
- ai_id: ai_system_router
  tier: 2
  capabilities:
    deep_learning: false
    deep_reasoning: false
    machine_learning: partial   # routing decisions cached
  domain: cross
  engines_implementing: [AISystemRouterEngine]
  dispatchers_used: [prism_intelligence (ai_route_task)]
  upstream: [claude_master]
  downstream: [ollama, claude, prism_calc, prism_safety]
  invocation_pattern: route
  training_status: baseline
  training_data_location: data/state/ollama-offload-stats.json
  feedback_loop_wired: partial   # consumes routing-decision telemetry
  feedback_signals_consumed: [route_decision, task_classification, tokens_saved]
  wired_status: production
```

### 2c. MetaAIOrchestrationEngine
```yaml
- ai_id: meta_ai_orchestration
  tier: 2
  capabilities:
    deep_learning: false
    deep_reasoning: true   # synthesizes specialist outputs
    machine_learning: false
  domain: cross
  engines_implementing: [MetaAIOrchestrationEngine, AutonomousAIOrchestrationEngine]
  dispatchers_used: [prism_intelligence (ai_orchestrate_autonomous)]
  upstream: [claude_master]
  downstream: [tier3_specialists]
  invocation_pattern: agi
  training_status: untrained
  feedback_loop_wired: false
  feedback_signals_consumed: []
  wired_status: beta
```

### 2d. AIIntelligenceMaximizerEngine
```yaml
- ai_id: ai_intelligence_maximizer
  tier: 2
  capabilities:
    deep_learning: false
    deep_reasoning: partial
    machine_learning: false
  domain: cross
  engines_implementing: [AIIntelligenceMaximizerEngine, AICapabilityMaximizerEngine]
  dispatchers_used: [prism_ai (ai_intelligence_maximize)]
  upstream: [claude_master]
  downstream: [tier3_specialists]
  training_status: untrained
  feedback_loop_wired: false
  wired_status: stub
```

---

## TIER-3 — Domain Specialist AIs

### 3.1 SFC AI (Speed-Feed Calculator AI) — STRONGEST FEEDBACK LOOP
```yaml
- ai_id: sfc_ai
  tier: 3
  capabilities:
    deep_learning: true   # SFCFewShotNewMaterialEngine
    deep_reasoning: true   # SFCMultiHypothesisRankerEngine
    machine_learning: true   # PPGSFCClosedLoopOrchestratorEngine
  domain: sfc
  engines_implementing:
    - SFCCalculateEngine
    - SFCCompareEngine
    - SFCOptimizeEngine
    - SFCDriftCanaryEngine
    - SFCFewShotNewMaterialEngine
    - SFCInferenceGateWireEngine
    - SFCMultiHypothesisRankerEngine
    - SFCOutcomeCaptureWireEngine          # ← FEEDBACK CAPTURE
    - SFCProvenanceWireEngine
    - SFCRAGWarmStartEngine
    - PPGSFCClosedLoopOrchestratorEngine   # ← CLOSED LOOP
    - AutoSpeedFeedEngine
    - AutoSpeedFeedCalculatorEngine
    - SpeedFeedOrchestratorEngine          # 2,851 LOC central hub
    - SpeedFeedDeepLearningEngine
    - SpeedFeedAdvancedAIEngine
    - SpeedFeedUltimateAIEngine
    - MachineAwareSpeedFeedEngine
    - ProvenSpeedFeedAggregatorEngine
  dispatchers_used:
    - prism_calc (sfc_calculate, sfc_feed_for_target, sfc_orchestrate, sfc_quick, sfc_resolve_*, sfc_stochastic, sfc_compare, sfc_optimize)
    - prism_ai (sfc_drift_canary_check, sfc_fewshot_predict, ppg_sfc_closed_loop)
    - prism_product (sfc_calculate, sfc_compare, sfc_optimize, sfc_quick, sfc_history, …)
  upstream: [tier1_claude, tier2_unified_orchestrator]
  downstream: [post_ai (PPG bridge), mill_ai, lathe_ai, wedm_ai]
  invocation_pattern: synthesize
  training_status: lora_tuned   # PPGSFCClosedLoop has cadence
  training_data_location: data/state/ (no .safetensors found — JSON checkpoints)
  training_data_freshness: live (drift canary)
  feedback_loop_wired: true
  feedback_signals_consumed:
    - actual_cycle_time
    - measured_surface_finish (Ra)
    - tool_life_actual
    - chatter_event
    - scrap_event
    - drift_canary_signal
  wired_status: production
```

### 3.2 Post AI (Post-Processor AI)
```yaml
- ai_id: post_ai
  tier: 3
  capabilities:
    deep_learning: true   # PostProcessorDeepLearningEngine, pp-transformer model
    deep_reasoning: true   # PostProcessorDeepReasoningEngine, PostProcessorUnifiedDeepReasoningEngine
    machine_learning: true   # PostProcessorAGIContinuousLearningEngine
  domain: post
  engines_implementing:
    - MasterPostProcessorAGIOrchestrationEngine
    - MasterPostProcessorUnifiedAGIEngine
    - UnifiedPPAGIOrchestrationEngine
    - PPAGIBenchmarkEngine
    - PPAGICapabilityMatrixEngine
    - PPAGIProgramLibraryAuditorEngine
    - PPAGIReasoningWorkflowEngine
    - PPAGIReportGeneratorEngine
    - PPAGISystemDashboardEngine
    - PPValidatorAGIWiringEngine
    - PostProcessorAGIContinuousLearningEngine
    - PostProcessorAGIMasterRegistryEngine
    - PostProcessorAGIWiringIntegrationEngine
    - PostProcessorDeepLearningEngine
    - PostProcessorDeepReasoningEngine
    - PostProcessorUnifiedDeepReasoningEngine
    - PostProcessorNeuralNetworkEngine
    - PostProcessorVideoKnowledgeNeuralEngine
    - PostProcessorAICoordinationBridge
    - PostProcessorAISelfAwarenessIntegrationEngine
    - PostProcessorDeepAIHardeningEngine
    - PostProcessorUltimateAIEngine
    - PostProcessorIntelligenceOrchestratorEngine
  dispatchers_used: [prism_cam (post_*), prism_calc (post_* batch)]
  upstream: [tier2_unified_orchestrator, sfc_ai]
  downstream: [mill_ai, lathe_ai, machine_dialects]
  invocation_pattern: agi / synthesize
  training_status: lora_tuned   # pp-transformer 2.10.0 with binary weights
  training_data_location: mcp-server/data/models/pp-transformer/2.10.0/
  training_data_freshness: 2026-04-15 (checkpoint trainedAt)
  feedback_loop_wired: false   # CRITICAL — MasterPostProcessorAGIOrchestrationEngine has 0 grep hits for recordOutcome/onActuals/measuredOutcome
  feedback_signals_consumed: []   # JSDoc claims continuous learning; code doesn't subscribe
  wired_status: beta   # downgraded from claimed "production" — feedback_loop_wired=false
```

### 3.3 Mill AI (Milling AI)
```yaml
- ai_id: mill_ai
  tier: 3
  capabilities:
    deep_learning: true   # MillDeepLearningEngine, MillingDigitalTwinEngine
    deep_reasoning: true   # MillingDeepReasoningEngine
    machine_learning: true   # MillingAILearningOrchestratorEngine
  domain: mill
  engines_implementing:
    - MillMasterOrchestratorFacadeEngine   # 7-route facade
    - MillingAGIMasterEngine
    - MillingAGIOrchestrationEngine
    - MillingDeepReasoningEngine
    - MillingDigitalTwinEngine
    - MillingNeuralCognitiveEngine
    - MillingReasoningDefaultEngine
    - MillingReasoningTraceLedgerEngine
    - MillingAIIntegrationEngine
    - MillingAILearningOrchestratorEngine
    - MillingAIUltraIntelligenceEngine
    - MillingAIUnificationEngine
    - MillingDeepAIHardeningEngine
    - MillingInferenceOrchestratorEngine
    - MillingKnowledgeOrchestratorEngine
    - MillingUltimateAIEngine
    - MillDeepLearningEngine
    - MillComprehensiveNeuralEngine
    - MillNeuralNetworkEngine
    - MillStrategyNeuralEngine
    - MillAISelfAwarenessIntegrationEngine
    - MillingLoRACadenceEngine
    - MillingLoRADatasetBuilderEngine
  dispatchers_used: [prism_mill (60+ actions), prism_ai (ai_mill_*)]
  upstream: [tier1_claude, tier2_unified_orchestrator]
  downstream: [post_ai, sfc_ai, cam_ai]
  invocation_pattern: agi / master / twin_simulate
  training_status: baseline   # LoRA cadence engine present, no .safetensors found
  training_data_location: (none — LoRA cadence stub)
  training_data_freshness: unknown
  feedback_loop_wired: false   # MillMasterOrchestratorFacadeEngine and MillingAGIMasterEngine BOTH have 0 grep hits for recordOutcome/onActuals/measured
  feedback_signals_consumed: []
  wired_status: beta   # rich engine inventory, no feedback subscription
```

### 3.4 Lathe AI (Turning AI) — LARGEST AI INVENTORY
```yaml
- ai_id: lathe_ai
  tier: 3
  capabilities:
    deep_learning: true   # LatheDeepLearningEngine, LatheKinematicsDeepLearningEngine
    deep_reasoning: true   # LatheDeepReasoningEngine, LatheOpusReasoningEngine
    machine_learning: true   # 38+ LatheLoRA* engines
  domain: lathe
  engines_implementing:
    - LatheMasterOrchestratorFacadeEngine
    - LatheAGIContinuousLearningEngine
    - LatheAGIFeatureBridgeEngine
    - LatheAGIKnowledgeUnificationEngine
    - LatheAGISafetyContainmentEngine
    - LatheAIOrchestrationEngine
    - LatheAIReasoningEngine
    - LatheAITrainingEngine
    - LatheAIUltraEngine
    - LatheAIFeatureRegistration
    - LatheUnifiedAIEngine
    - LatheUnifiedAIOrchestrator
    - LatheDeepAIHardeningEngine
    - LatheDeepLearningEngine
    - LatheDeepLearningIntelligenceEngine
    - LatheDeepReasoningEngine
    - LatheKinematicsDeepLearningEngine
    - LatheOpusReasoningEngine
    - LatheNeuralIntelligenceEngine
    - LatheSpeedFeedDeepLearningAdvisorEngine
    - LatheSpeedFeedReasoningBridgeEngine
    - LatheMasterPostDeepReasoningEngine
    - LathePrintToProgramReasoningEngine
    - LatheLoRAMasterOrchestratorEngine
    - LatheLoRANeuralBridgeEngine
    - LatheLoRANeuralOrchestratorEngine
    - LatheLoRACadenceEngine
    - LatheLoRACadenceOrchestratorEngine
    - LatheLoRAEnsembleOrchestratorEngine
    - LatheLoRAEnsembleVoterEngine
    - LatheLoRAEnsembleCombinerEngine
    - LatheLoRAReasoningChainInferenceEngine
    - LatheLoRAReasoningEvaluatorEngine
    - LatheLoRAAdaptiveRefinementEngine
    - LatheLoRAAttentionAnalyzerEngine
    - LatheLoRABenchmarkSuiteEngine
    - LatheLoRAContinualLearningEngine
    - LatheLoRACronJobEngine
    - LatheLoRADatasetBuilderEngine
    - LatheLoRADatasetValidatorEngine
    - LatheLoRADeploymentEngine
    - LatheLoRADriftDetectorEngine
    - LatheLoRAEmbeddingCacheEngine
    - LatheLoRAExampleGeneratorEngine
    - LatheLoRAExperimentTrackerEngine
    - LatheLoRAHealthMonitorEngine
    - LatheLoRAHyperparameterOptimizerEngine
    - LatheLoRAInferenceGatewayEngine
    - LatheLoRAKnowledgeCuratorEngine
    - LatheLoRAKnowledgeGraphEngine
    - LatheLoRAMergeStrategyEngine
    - LatheLoRAModelOptimizerEngine
    - LatheLoRAModelRegistryEngine
    - LatheLoRAModelSelectorEngine
    - LatheLoRAMonitoringEngine
    - LatheLoRAOllamaDeployerEngine
    - LatheLoRAPhysicsAugmentedInferenceEngine
    - LatheLoRAPhysicsEvaluatorEngine
    - LatheLoRAPipelineCoordinatorEngine
    - LatheLoRAPipelineEngine
    - LatheLoRAProgramMinerEngine
    - LatheLoRAProgramParserEngine
  dispatchers_used: [prism_turning, prism_business (lathe_*)]
  upstream: [tier1_claude, tier2_unified_orchestrator]
  downstream: [post_ai (lathe_postgen), sfc_ai]
  invocation_pattern: agi / master / lora_predict
  training_status: lora_tuned   # full LoRA pipeline scaffolding
  training_data_location: (no .safetensors found — only registry/cadence engines)
  training_data_freshness: unknown — LatheLoRADriftDetectorEngine present, no recent training event
  feedback_loop_wired: false   # LatheMasterOrchestratorFacadeEngine and LatheLoRAMasterOrchestratorEngine BOTH have 0 grep hits for recordOutcome/onActuals/measured
  feedback_signals_consumed: []   # massive LoRA scaffolding, NO actual feedback subscription detected
  wired_status: beta   # ingestion heavily populated; loop broken — exactly the suspect pattern
```

### 3.5 Wire EDM AI
```yaml
- ai_id: wedm_ai
  tier: 3
  capabilities:
    deep_learning: true   # WireEDMDeepNeuralReasoningEngine, WireEDMAdvancedNeuralEngine
    deep_reasoning: true   # WireEDMDeepReasoningEngine
    machine_learning: true   # WEDMNeuralTrainingEngine, WEDMNeuralFormulaFusionEngine
  domain: wedm
  engines_implementing:
    - WireEDMAGIOrchestrator
    - WireEDMMasterAIEngine
    - WireEDMAIPrintToProgramEngine
    - WireEDMResearchAIEngine
    - WireEDMDeepAIHardeningEngine
    - WireEDMDeepReasoningEngine
    - WireEDMDeepNeuralReasoningEngine
    - WireEDMAdvancedNeuralEngine
    - WireEDMNeuralOrchestrationEngine
    - WEDMNeuralFormulaFusionEngine
    - WEDMNeuralTrainingEngine
    - WEDMProgramNeuralAnalysisEngine
    - WEDMCalculatorAIEngine
  dispatchers_used: [prism_edm (90+ wedm_* actions), prism_intelligence (wedm_*)]
  upstream: [tier1_claude]
  downstream: [post_ai]
  invocation_pattern: agi / synthesize / neural_orchestrate
  training_status: lora_tuned   # neural training engine present
  training_data_location: data/state/WEDM_*.json|jsonl (11 state files)
  training_data_freshness: 2026-04-22 (per CLAUDE.md WEDM block)
  feedback_loop_wired: partial   # WireEDMAGIOrchestrator: 11 grep hits for feedback (only orchestrator with non-zero)
  feedback_signals_consumed:
    - wire_break_event
    - cut_actual_time
    - surface_actual (Ra/Rz)
    - taper_deviation
    - operator_feedback (wedm_feedback skill)
  last_invocation_timestamp: tracked via WEDM_*.jsonl
  wired_status: production
```

### 3.6 CAD AI
```yaml
- ai_id: cad_ai
  tier: 3
  capabilities:
    deep_learning: true   # NeuralCADGenerationEngine
    deep_reasoning: true   # CADReasoningChainEngine
    machine_learning: partial   # cad_param_predictor.json
  domain: cad
  engines_implementing:
    - CADAIStateMachineEngine
    - CADReasoningChainEngine
    - NeuralCADGenerationEngine
    - CADEmbeddingIndexOrchestratorEngine
    - CADRegressionTestOrchestratorEngine
    - CADTrainingCorpusOrchestratorEngine
    - CADTrainingPipelineOrchestratorEngine
  dispatchers_used: [prism_cad (cad_taxonomy_*, cad_corpus_*, cad_training_*, cad_pipeline_*)]
  upstream: [tier1_claude]
  downstream: [cam_ai]
  invocation_pattern: synthesize / twin_simulate
  training_status: baseline   # cad_param_predictor.json exists, no .safetensors
  training_data_location: mcp-server/data/models/cad_param_predictor.json
  training_data_freshness: unknown (no trainedAt scanned)
  feedback_loop_wired: false   # corpus + regression scaffolding, no actuals subscription confirmed
  feedback_signals_consumed: []
  wired_status: beta
```

### 3.7 CAM AI
```yaml
- ai_id: cam_ai
  tier: 3
  capabilities:
    deep_learning: true   # CAMDeepLearningEngine
    deep_reasoning: true   # CAMAGIReasoningEngine
    machine_learning: true   # CAMLoRAEngine, CAMLoRAAdapterTrainerEngine
  domain: cam
  engines_implementing:
    - CAMAGIMasterOrchestratorEngine
    - CAMAGIReasoningEngine
    - CAMDeepLearningEngine
    - CAMLoRAEngine
    - CAMLoRAAdapterTrainerEngine
    - CAMAIActionLinkerEngine
    - CAMKernelOrchestratorEngine
    - CAMInHostNightlyOrchestratorEngine
    - CAMPostInvokeOrchestratorEngine
    - ScalableCAMOrchestratorEngine
  dispatchers_used: [prism_cam (1000+ actions), prism_ai (cam_*)]
  upstream: [tier1_claude, mill_ai, lathe_ai, cad_ai]
  downstream: [post_ai, sfc_ai]
  invocation_pattern: agi / master
  training_status: lora_tuned   # CAMLoRAAdapterTrainerEngine present
  training_data_location: (no .safetensors found)
  training_data_freshness: unknown
  feedback_loop_wired: false   # CAMAGIMasterOrchestratorEngine: 0 grep hits for recordOutcome/onActuals/feedback
  feedback_signals_consumed: []
  wired_status: beta
```

---

## TIER-3 — Additional Domain Specialists (per-CAM, per-vendor)

### 3.8–3.19 Vendor / Sub-domain AI nodes
| ai_id | engines_implementing | training_status | feedback_loop_wired | wired_status |
|-------|---------------------|-----------------|---------------------|--------------|
| five_axis_ai | FiveAxisAIUltraIntelligenceEngine, FiveAxisDeepLearningEngine, FiveAxisLoRACadenceEngine, FiveAxisLoRADatasetBuilderEngine | baseline | false | beta |
| electrode_ai | ElectrodeAIReasoningEngine, ElectrodeAdvancedAIEngine, ElectrodeUltimateAIEngine, ElectrodeDeepLearningEngine | baseline | unknown | beta |
| fusion360_ai | Fusion360AIOrchestrationEngine, FusionAIOrchestrationEngine, FusionDeepLearningEngine, HyperMillFAIBridge | baseline | false | beta |
| hypermill_ai | HyperMillAIOrchestrationEngine, HyperMillDeepLearningEngine, HyperMillDataExtractionOrchestrator | baseline | false | beta |
| mastercam_ai | MastercamAIOrchestrationEngine, MastercamDeepLearningEngine, MastercamFAIBridge | baseline | false | beta |
| solidcam_ai | SolidCAMAIOrchestrationEngine | untrained | false | beta |
| nx_cam_ai | NXCAMAIOrchestrationEngine | untrained | false | beta |
| inventor_cam_ai | InventorCAMAIOrchestrationEngine | untrained | false | beta |
| powermill_ai | PowerMillAIOrchestrationEngine | untrained | false | beta |
| catia_ai | CATIAMachiningAIOrchestrationEngine, CATIAIntegrationTestSuiteEngine | untrained | false | beta |
| cnc_controller_ai | CNCControllerDeepLearningEngine | baseline | unknown | beta |
| video_learn_ai | VideoELearningAIEngine, PostProcessorVideoKnowledgeNeuralEngine | baseline | unknown | beta |
| grinding_ai | GrindingLoRACadenceEngine, GrindingLoRADatasetBuilderEngine | untrained | false | planned |
| laser_ai | LaserLoRACadenceEngine, LaserLoRADatasetBuilderEngine | untrained | false | planned |
| mill_turn_ai | MillTurnLoRACadenceEngine, MillTurnLoRADatasetBuilderEngine | untrained | false | planned |
| tool_db_ai | ToolDatabaseDeepLearningEngine | baseline | false | beta |
| virtual_machining_ai | VirtualMachiningDeepLearningEngine | baseline | false | beta |
| force_neural_ai | ForceNeuralPredictorEngine | baseline | false | beta |
| chatter_neural_ai | ChatterNeuralClassifierEngine, ThermalNeuralPredictorEngine | baseline | partial | beta |

---

## Aggregate Counts (the honest version)

| Metric | Count |
|--------|-------|
| AI nodes total (tier 1+2+3) | **24** (1 + 4 + 19) |
| Underlying engines wired into AI nodes | ~360+ |
| LoRA support engines | 80 |
| Deep learning engines | 24 |
| Deep reasoning engines | 11 |
| Neural engines (broad) | 28 |
| Digital twin engines | 5 |
| AGI orchestrators | 26 (CAMAGI, MillingAGI×2, LatheAGI×4, MasterPostAGI×2, PPAGI×6, PostAGI×3, WireEDMAGI, etc.) |

### Wired-status breakdown (by AI node, not engine)
| Status | Count | Nodes |
|--------|-------|-------|
| production | 3 | claude_master, sfc_ai, wedm_ai (partial loop) — also ai_system_router |
| beta | 16 | post_ai, mill_ai, lathe_ai, cad_ai, cam_ai, all vendor AIs |
| stub | 1 | ai_intelligence_maximizer |
| planned | 4 | grinding, laser, mill_turn LoRA scaffolding |

### feedback_loop_wired breakdown
| Value | Count | Notes |
|-------|-------|-------|
| true | 1 | sfc_ai (PPGSFCClosedLoop + SFCOutcomeCapture wired) |
| partial | 3 | claude_master, ai_system_router, wedm_ai |
| false | 16 | post_ai, mill_ai, lathe_ai, cam_ai, cad_ai, vendor AIs |
| unknown | 4 | electrode, video_learn, cnc_controller, chatter_neural |

---

## TOP-3 WIRING CONCERNS

1. **Lathe AI massive scaffold, zero feedback subscription.** 38+ LatheLoRA* engines including DriftDetector, ContinualLearning, Cadence, EnsembleVoter — and `LatheMasterOrchestratorFacadeEngine` + `LatheLoRAMasterOrchestratorEngine` BOTH have ZERO grep hits for `recordOutcome|onActuals|feedback|measured`. This is the textbook silent-rot pattern: "ingestion is heavily populated but bridges/loops may be broken." Confirmed broken.

2. **No canonical Tier-2 Coordinator.** Four overlapping engines (PRISMUnifiedOrchestrator, AISystemRouter, MetaAIOrchestration, AIIntelligenceMaximizer) all partly own the role. Claude has no single handoff target; each tier-3 specialist is invoked directly by Claude. Handoff protocol (output #3) MUST resolve.

3. **Post AI claims continuous learning, doesn't subscribe.** `PostProcessorAGIContinuousLearningEngine` exists. `MasterPostProcessorAGIOrchestrationEngine` JSDoc says "closed-loop optimization feedback." Code: zero subscription. The pp-transformer model trained 2026-04-15 (17 days stale). No re-training trigger from production usage detected.
