# AUDIT-AI-WIRING — AI hierarchy wiring status

**Generated:** 2026-05-02
**Source:** engine manifest + dispatcher action grep + LoRA artifact directory presence
**Note:** AI-HIERARCHY-INVENTORY.md (parallel agent) not yet present at audit time; this file uses direct evidence.

## AI hierarchy wiring matrix

| AI tier | Engine exists | Dispatcher invokable | Training data | LoRA artifact | Feedback loop | Cross-AI coord | wired_status |
|---|---|---|---|---|---|---|---|
| **SFC AI** | NO dedicated `SFCAIEngine` class found. Functional surface: SpeedFeedOrchestratorEngine, AutoSpeedFeedEngine, UltimateSpeedFeedEngine, SpeedFeedAutopilotEngine | dev.sf_autopilot_run, dev.sf_autopilot_resolve_material, dev.sf_autopilot_resolve_tool, calc.sf_orchestrate, calc.sf_quick, calc.sf_compare, calc.sf_optimize, calc.sf_resolve_*, intelligence.sfc_calculate, intelligence.sfc_optimize | not surfaced — depends on JM Die actuals | NONE found in engine list (no `SfcLoRA*` engine) | dev.feedback_loop_record, intelligence.sfc_calculate (closed-loop hooks) | LatheUnifiedAIOrchestrator + ScalableCAMOrchestratorEngine | **beta** | DOWNGRADED — orchestrators + autopilot exist; no dedicated AI engine class; no LoRA artifact |
| **Post AI** | NO dedicated `PostAIEngine` class. Functional surface: PostProcessorAutopilotEngine, AdvancedPostProcessorEngine, PostProcessorPipelineEngine, MasterPostRouterEngine | pp.pp_run_full, pp.pp_run_partial, cam.master_post_process, cam.master_post_hurco_v11, cam.master_post_okuma_b250, cam.master_post_okuma_osp, cam.master_post_mitsubishi_mv1200r, cam.lathe_master_post_route | depends on shop NC corpus | PPGDriftCanaryEngine implies LoRA-style adaptation; no `PostLoRA*` engine surfaced | dev.pp_autopilot_run, ppg_rl_feedback (RL feedback exists) | MasterPostRouterEngine | **beta** | autopilot present, RL feedback action wired, LoRA artifact unverified |
| **Mill AI** | YES — MillingAGIMasterEngine, MillingAGIOrchestrationEngine, MillMasterOrchestratorFacadeEngine, MillAISelfAwarenessIntegrationEngine, HyperMillAIOrchestrationEngine | mill.mill_agi_orchestrate, mill.mill_neural_recommend, mill.mill_deeplearn_predict, mill.mill_pattern_mine, mill.mill_wisdom_query, mill.mill_selfaware_*, ai.ai_milling_deep_reason, ai.ai_milling_synthesize, ai.ai_milling_agi, ai.ai_milling_twin_simulate | partial via `MillingPatternMine` actions | milling_lora_predict, milling_lora_train, milling_lora_optimize | mill.mill_inference_run, mill.mill_trace_record, mill.mill_trace_query | LatheUnifiedAIOrchestrator (cross-AI) | **production** | full hierarchy: AGI engine + LoRA actions + tracing |
| **Lathe AI** | YES — LatheUnifiedAIOrchestrator, LatheAGIContinuousLearningEngine, LatheAGIFeatureBridgeEngine, LatheAGIKnowledgeUnificationEngine, LatheAGISafetyContainmentEngine, LathePrintToProgramDLIntelligenceEngine, LathePrintToProgramKnowledgeGraphEngine, LathePrintToProgramReasoningEngine, LatheKinematicsDeepLearningEngine | business.lathe_agi_reason, business.lathe_agi_kg_*, business.lathe_agi_safety_check, business.lathe_agi_feedback, business.lathe_agi_adjustment, ai.ai_lathe_*, cam.lathe_p2p_dl_predict, cam.lathe_p2p_dl_rank_alternatives, cam.lathe_p2p_dl_batch | partial — LatheAGIContinuousLearningEngine implies online | lathe_lora_*, lathe_postgen_uncertainty (LoRA + uncertainty surfaced) | business.lathe_agi_feedback, lathe_p2p_signoff_*, LatheLoRADriftDetectorEngine | LatheUnifiedAIOrchestrator (master) | **production** | most-mature AI tier in PRISM; 18 lathe-AI engines |
| **WEDM AI** | YES — WireEDMAGIOrchestrator | edm.wedm_run_pipeline, edm.wedm_advanced_analysis, edm.wedm_ml_optimize_init/observe/status, edm.wedm_lora_create, edm.wedm_lora_set_scale, edm.wedm_lora_forward, edm.wedm_predict_ra_v2, edm.wedm_train_ra_adapter, edm.wedm_predict_break, edm.wedm_predict_recast, edm.wedm_train_recast_adapter, edm.wedm_gnn_init/attend/train, edm.wedm_tribal_runtime_*, edm.wedm_autonomy_gate_status | wedm_record_job, wedm_job_history_stats, JM Die WEDM corpus partial | wedm_lora_*, wedm_recast_ml_*, WEDMNeuralFormulaFusionEngine | wedm_feedback_loop, WEDMTribalTipLearnerEngine | WEDMReasoningBridgeEngine, WEDMMultiAgentDispatchEngine | **production** | most actions of any AI tier — 30+ ML/LoRA/GNN actions |
| **CAD AI** | YES — CADAIStateMachineEngine, NeuralCADGenerationEngine, BlueprintToCADGenerationEngine, TextToCADGenerationEngine | cad.blueprint_to_3d_model, cad.blueprint_to_cadquery_script, cad.cad_corpus_orchestrate, cad.cad_index_*, cad.cad_pipeline_run, cad.cad_training_start, cad.cad_training_status | cad.cad_corpus_scan, cad.cad_training_corpus_stats | cad.cad_lora_* (not directly surfaced; cad_pipeline_run implies pipeline) | cad.cad_regen_test, cad.cad_regen_compare, cad.cad_trial_* (trial pattern learning) | (no dedicated cross-CAD orchestrator) | **beta** | training + pipeline actions exist; cross-AI integration weak |
| **CAM AI** | YES — CAMAIActionLinkerEngine, ScalableCAMOrchestratorEngine, MastercamAIOrchestrationEngine, NXCAMAIOrchestrationEngine, InventorCAMAIOrchestrationEngine, HyperMillAIOrchestrationEngine, CATIAMachiningAIOrchestrationEngine, Fusion360AIOrchestrationEngine, SolidCAMAIOrchestrationEngine | cam.cam_unified_generate, cam.cam_complex_generate, cam.cam_agi_reason, cam.cam_neural_recommend, cam.cam_deeplearn_predict, cam.cam_pattern_mine, cam.cam_ml_train_baseline, cam.cam_ml_predict_baseline, cam.cam_ml_train_lora, cam.cam_ml_predict_lora, cam.cam_lora_*, cam.cam_ml_drift_run | partial via cam_ml_split_customer_disjoint, cam_ml_feature_extract_one/batch | cam_lora_predict, cam_lora_apply_delta, cam_lora_validate, cam_lora_check_health, cam_lora_list, cam_lora_select, cam_lora_ensemble, cam_lora_standardize | cam_enrich_capture_baseline, cam_enrich_validate, CAMMLDriftMonitorEngine | ScalableCAMOrchestratorEngine | **production** | strongest LoRA action surface in PRISM (8+ LoRA verbs) |
| **System Coordinator** | LatheUnifiedAIOrchestrator (lathe-rooted), MillMasterOrchestratorFacadeEngine (mill-rooted), ScalableCAMOrchestratorEngine (CAM-rooted), AIRouterEngine, MultiAgentCoordinatorEngine | intelligence.ai_orchestrate_autonomous, intelligence.ai_route_task, intelligence.ai_classify_task, intelligence.ai_backend_health, intelligence.ai_backend_probe, intelligence.ai_router_stats, ai.ai_route_mill_pipeline, ai.ai_intelligence_maximize | n/a (orchestration layer) | n/a | dev.ai_orchestration_history, dev.ai_orchestration_stats, dev.ai_orchestration_summary | self-referential | **beta** | DOWNGRADED — multiple orchestrators exist but no single canonical "PRISM System Coordinator" engine; routing is fragmented across mill/lathe/CAM/AI |

---

## Cross-AI coordination surface

**Existing:**
- `LatheUnifiedAIOrchestrator` — coordinates lathe AGI engines
- `ScalableCAMOrchestratorEngine` — coordinates CAM AI orchestrators
- `WEDMReasoningBridgeEngine` + `WEDMMultiAgentDispatchEngine` — WEDM internal
- `AIRouterEngine` (intelligence.ai_route_task)
- `MultiAgentCoordinatorEngine` (orchestrate.swarm_*)
- `CrossDisciplinaryDeepLearningEngine` (referenced in CLAUDE.md as creative reasoning entry point)

**Missing (per vision):**
- Top-level "PRISM System Coordinator" that bridges Mill ↔ Lathe ↔ WEDM ↔ CAD ↔ CAM ↔ Post ↔ SFC AIs
- LoRA artifact registry visible in inventory (no `cam.cam_lora_list` snapshot in inventory baseline)
- Cross-AI feedback ledger (each tier has its own; no unified ledger)

---

## LoRA artifact wiring (per AI tier)

| Tier | LoRA action | Artifact dir (assumed) | Verified? |
|---|---|---|---|
| Mill AI | milling_lora_predict, milling_lora_train, milling_lora_optimize | `mcp-server/data/lora/milling/` | UNVERIFIED |
| Lathe AI | lathe_lora_*, MillTurnLoRACadenceEngine, MillTurnLoRADatasetBuilderEngine | `mcp-server/data/lora/lathe/` | UNVERIFIED |
| WEDM AI | wedm_lora_create, wedm_lora_set_scale, wedm_lora_forward | `mcp-server/data/state/WEDM_*.json` (LoRA state) | partial |
| CAM AI | cam_lora_predict / apply_delta / validate / check_health / list / select / ensemble / standardize | `mcp-server/data/lora/cam/` | UNVERIFIED |
| CAD AI | cad_pipeline_run + cad_trial_* | (no LoRA action surfaced) | NO LoRA |
| Sinker EDM | SinkerEDMLoRACadenceEngine, SinkerEDMLoRADatasetBuilderEngine | `mcp-server/data/lora/sinker_edm/` | UNVERIFIED |
| Laser | LaserLoRACadenceEngine (laser_lora_config, laser_lora_state, laser_lora_record) | `mcp-server/data/lora/laser/` | UNVERIFIED |
| Waterjet | WaterjetLoRACadenceEngine, WaterjetLoRADatasetBuilderEngine | `mcp-server/data/lora/waterjet/` | UNVERIFIED |
| Mill-turn | MillTurnLoRACadenceEngine, MillTurnLoRADatasetBuilderEngine | shared with lathe | UNVERIFIED |
| Grinding | GrindingLoRACadenceEngine + grinding_lora_cadence_config/state/record/dataset_build/dataset_schema | `mcp-server/data/lora/grinding/` | UNVERIFIED |

**LoRA reality:** action surface is broad (10+ tiers); artifact persistence + drift coordination wired (`LoRADriftCoordinatorEngine`). Not verified in this audit whether `data/lora/*/` directories contain trained weights.

---

## Honest summary

Mark's vision specifies 8 AI tiers. PRISM has:
- **2 production-grade tiers**: Mill AI, Lathe AI (deepest), WEDM AI, CAM AI (4 actually production)
- **2 beta tiers**: SFC AI, Post AI, CAD AI (3 actually beta)
- **1 fragmented**: System Coordinator (multiple partial orchestrators, no canonical top-level)

The vision claim that all 8 tiers are wired E2E is **overstated**. SFC AI and Post AI lack dedicated AI-class engines (relying on autopilots + orchestrators); System Coordinator is split across 3+ engines without a unified router. CAD AI lacks a LoRA action surface despite training actions being present.

Total AI engines named in manifest: 30+ across the 8 tiers (count: Mill 8, Lathe 18, WEDM 1 main + 60+ supporting WEDM engines, CAD 1 + 4 generators, CAM 6 orchestrators).
