/**
 * AI Reasoning Action Schemas — prism_ai dispatcher
 * ==================================================
 * Zod schemas for 6 mill-targeted AI reasoning actions.
 *
 * @module schemas/aiReasoningActionSchemas
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import {
  TaskCategory,
  ConfidenceLevel,
} from "./successPatternSchema.js";

/** Supported actions for prism_ai dispatcher */
export const AI_REASONING_ACTIONS = [
  "ai_route_mill_pipeline",
  "ai_mill_agi_reason",
  "ai_mill_awareness_query",
  "ai_mill_scientific_analyze",
  "ai_mill_wisdom_query",
  "ai_mill_adaptive_strategy",
  "pattern_record",
  "pattern_query",
  "pattern_reinforce",
  "pattern_stats",
  "sfc_drift_canary_check",
  "ppg_drift_canary_check",
  "sfc_fewshot_predict",
  "ppg_sfc_closed_loop",
  "iterate_retrieve",
  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
  "ai_explain_decision",
  "ai_extract_classify",
  "ai_physics_optimize",
  "ai_knowledge_query",
  "ai_material_lookup",
  // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
  "ai_milling_deep_reason",
  "ai_wedm_deep_logic",
  "ai_wedm_deep_neural",
  "ai_milling_synthesize",
  "ai_lathe_reason",
  // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
  "ai_milling_agi",
  "ai_milling_twin_simulate",
  "ai_wedm_master",
  "ai_wedm_neural_orchestrate",
  "ai_lathe_train",
  // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
  "ai_wedm_advanced_neural",
  "ai_wedm_agi_orchestrate",
  "ai_wedm_print_to_program",
  "ai_wedm_cam_knowledge",
  "ai_wedm_synthesize_knowledge",
  // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
  "ai_lathe_orchestrate",
  "ai_lathe_active_learn_select",
  "ai_lathe_bayesian_fit_gp",
  "ai_lathe_attention_compute",
  "ai_lathe_adaptive_engagement",
  // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
  "ai_code_gate_pending",
  "ai_self_mod_propose_batch",
  "ai_self_mod_is_approved",
  "ai_intelligence_maximize",
  "ai_hook_rule_match",
  // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines wired
  "creative_solve",       // P5-U01 → PRISMCreativeReasoningEngine.explore
  "causal_analyze",       // P5-U02 → CausalReasoningEngine.{addEdges,traceImpact,rootCauses}
  "counterfactual_predict", // P5-U03 → CounterfactualReasoningEngine.{createCausalGraph,generateCounterfactual}
  "scientific_reason",    // P5-U04 → ScientificReasoningEngine.reason (independent of mill alias)
  // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian belief tracking
  "belief_set",           // U-WIRE20 → set named distribution
  "belief_update",        // U-WIRE20 → Bayesian update via likelihood
  "belief_query",         // U-WIRE20 → get + topK + entropy + probabilityOf
  "belief_list",          // U-WIRE20 → list all beliefs + size
  "belief_delete",        // U-WIRE20 → delete by id
  // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — explicit step-by-step reasoning
  "cot_reason",           // U-WIRE21 → linear/adversarial/iterative reasoning chain
  "cot_reason_tree",      // U-WIRE21 → tree-of-thought beam search
  "cot_explain",          // U-WIRE21 → format a chain into human-readable trace
  "cot_apply_heuristics", // U-WIRE21 → manufacturing-domain heuristics for a context
  // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
  "learning_rank",        // U-WIRE24 → rank LearningCandidate[] by infoGain/cost (Ψ-weighted)
  "learning_summary",     // U-WIRE24 → summarize a ranked list (totals + topTopic)
  // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
  "meta_learning_record",     // U-WIRE25 → record (scenario, strategy, success) outcome
  "meta_learning_recommend",  // U-WIRE25 → best strategy for a scenario (Wilson lower-bound)
  "meta_learning_stats",      // U-WIRE25 → stats for (scenario, strategy) pair
  "meta_learning_list",       // U-WIRE25 → list scenarios or full stats matrix
  // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — cross-session insight broker
  "peer_broadcast",   // U-WIRE26 → broadcast PeerInsight (deduped by content hash)
  "peer_query",       // U-WIRE26 → fetch insights with tag/confidence/exclude filters
  "peer_get",         // U-WIRE26 → get one insight by id
  "peer_size",        // U-WIRE26 → current number of accepted insights
  // ENGINE-WIRE-MS0/U-WIRE27: NeuralIntegrationEngine — neural cortex routing
  "neural_route",       // U-WIRE27 → route NeuralQuery to top engine+action+confidence
  "neural_recommend",   // U-WIRE27 → recommend slash commands for a query string
  "neural_synthesize",  // U-WIRE27 → multi-source synthesis (engines+wisdom+commands)
  "neural_stats",       // U-WIRE27 → learning stats (totalQueries, successRate, topRoutes)
  // ENGINE-WIRE-MS0/U-WIRE28: CNCControllerDeepLearningEngine — controller knowledge
  "controller_select",      // U-WIRE28 → pick best controller family for job requirements
  "controller_translate",   // U-WIRE28 → translate G-code from source dialect to target
  "controller_compare",     // U-WIRE28 → compare two controllers head-to-head
  "controller_macro",       // U-WIRE28 → generate macro skeleton for task + controller
  "controller_debug",       // U-WIRE28 → debug post-processor / G-code error message
  // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
  "bounds_pac_complexity",  // U-WIRE29 → PAC sample complexity m ≥ (1/ε)·(ln|H| + ln(1/δ))
  "bounds_vc",              // U-WIRE29 → VC bound √((d·ln(n/d) + ln(1/δ))/n)
  "bounds_rademacher",      // U-WIRE29 → Rademacher 2·R̂_n + 3·√(ln(2/δ)/(2n))
  "bounds_pac_bayes",       // U-WIRE29 → PAC-Bayes McAllester √((KL+ln(n/δ))/(2(n-1)))
  // ENGINE-WIRE-MS0/U-WIRE30: ProactiveLearningEngine — auto-trigger learning
  "proactive_detect",          // U-WIRE30 → detect learning triggers in a context
  "proactive_classify",        // U-WIRE30 → classify a trigger (priority + reason)
  "proactive_quality_report",  // U-WIRE30 → knowledge-quality monitor report
  "proactive_stats",           // U-WIRE30 → categorization stats
  // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — turn exceptions into knowledge
  "exception_handle",          // U-WIRE31 → capture an unexpected event, return analysis + suggestedActions
  "exception_record_outcome",  // U-WIRE31 → finalize event outcome; success generates tribal tip + envelope proposal
  "exception_pending",         // U-WIRE31 → list captured events not yet recorded
  "exception_stats",           // U-WIRE31 → totalEvents, learnedCount, successRate, tipsGenerated, proposalsGenerated
  // XPROC-AI-01: cross-process AI orchestration (mill+lathe+wedm)
  "cross_process_ai_classify",     // classify intent → process (no engine invocation)
  "cross_process_ai_orchestrate",  // classify + dispatch to mill/lathe/wedm orchestrator (or dry_run preview)
  // INFRA-NEURAL-LEDGER-MS1/U-XPROC-T10-PRISM-AI-WIRE: dual-wire 4 Tier 10 fusion engines into prism_ai
  // Per CLAUDE.md "wire to all consumers" mandate: reasoning engines belong on both prism_intelligence AND prism_ai.
  // T10-01 — CrossProcessVisionTabularFusionEngine (concat + projection)
  "xproc_vision_fuse",
  "xproc_vision_explain_attention",
  "xproc_vision_constants",
  // T10-02 — CrossProcessTimeSeriesTabularFusionEngine (Gated Multimodal Unit + windowing)
  "xproc_timeseries_fuse",
  "xproc_timeseries_segment",
  "xproc_timeseries_constants",
  // T10-03 — CrossProcessAudioTabularFusionEngine (FFT + chatter score + GMU)
  "xproc_audio_fuse",
  "xproc_audio_chatter_score",
  "xproc_audio_spectral",
  "xproc_audio_constants",
  // T10-04 — CrossProcessModalityDropoutRobustifierEngine (graceful missing-modality fusion)
  "xproc_modality_dropout",
  "xproc_modality_predict",
  "xproc_modality_availability",
  "xproc_modality_constants",
  // INFRA-NEURAL-LEDGER-MS1/U-XPROC-T2-T12-PRISM-AI-WIRE: dual-wire remaining 124 xproc_* actions across Tiers 2-9 + 11-12.
  // T8-01/T8-03 Symbolic + NeuroSymbolic Safety
  "xproc_symbolic_project",
  "xproc_symbolic_violations",
  "xproc_safety_verify",
  "xproc_safety_escalate",
  // T9 Causal Inference Suite (4 engines)
  "xproc_causal_learn_dag",
  "xproc_causal_test_independence",
  "xproc_causal_export_graph",
  "xproc_do_identify",
  "xproc_do_intervene",
  "xproc_counterfactual_query",
  "xproc_mediation_decompose",
  "xproc_mediation_path_strength",
  // T11 Active Learning & Curiosity (4 engines)
  "xproc_active_select",
  "xproc_active_rationale",
  "xproc_novelty_score",
  "xproc_novelty_alert",
  "xproc_curiosity_propose",
  "xproc_curiosity_score",
  "xproc_doe_plan",
  "xproc_doe_evaluate_completion",
  // T12 Master Orchestration (2 engines)
  "xproc_route_query",
  "xproc_route_explain",
  "xproc_orchestrate_full",
  "xproc_orchestrate_brief",
  // T8-02/T8-04 Rule Extraction + Formula-Neural Blend
  "xproc_extract_rules",
  "xproc_rule_explain_prediction",
  "xproc_blend_predict",
  "xproc_blend_weight_report",
  // T2 Memory & Replay (4 engines)
  "xproc_episodic_store",
  "xproc_episodic_recall",
  "xproc_episodic_stats",
  "xproc_replay_add",
  "xproc_replay_sample",
  "xproc_replay_update_priority",
  "xproc_replay_stats",
  "xproc_replay_balanced_batch",
  "xproc_replay_default_clusters",
  "xproc_episodic_semantic_join",
  // T3 Online Learning & Drift (4 engines)
  "xproc_online_update",
  "xproc_online_init_state",
  "xproc_online_constants",
  "xproc_drift_observe",
  "xproc_drift_observe_batch",
  "xproc_drift_history",
  "xproc_drift_reset",
  "xproc_drift_constants",
  "xproc_shift_decide",
  "xproc_shift_history",
  "xproc_shift_reset",
  "xproc_shift_constants",
  "xproc_ewc_compute_fisher",
  "xproc_ewc_reg_loss",
  "xproc_ewc_consolidate",
  "xproc_ewc_get_fisher",
  "xproc_ewc_reset",
  "xproc_ewc_constants",
  // T4 Reinforcement Learning (4 engines)
  "xproc_reward_shape",
  "xproc_reward_audit",
  "xproc_reward_default_weights",
  "xproc_reward_constants",
  // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer (gated emit)
  "xproc_neural_consult_speedfeed",
  // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
  "xproc_kg_project_features",
  "xproc_kg_feature_layout",
  // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
  "xproc_tribal_subscribe_outcomes",
  "xproc_tribal_unsubscribe_outcomes",
  "xproc_tribal_outcome_subscription_status",
  "xproc_tribal_outcome_configure",
  "xproc_tribal_outcome_stats",
  "xproc_tribal_outcome_reset",
  // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
  // (xproc_drift_bridge_reset is namespaced to avoid collision with the
  // pre-existing CrossProcessDriftDetectorEngine xproc_drift_reset action.)
  "xproc_drift_subscribe",
  "xproc_drift_unsubscribe",
  "xproc_drift_status",
  "xproc_drift_configure",
  "xproc_drift_stats",
  "xproc_drift_bridge_reset",
  // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
  // (all bridge_* actions namespaced to avoid colliding with the
  // pre-existing xproc_replay_{add,sample,update_priority,stats,
  // balanced_batch,default_clusters} actions on the underlying engines.)
  "xproc_replay_bridge_subscribe",
  "xproc_replay_bridge_unsubscribe",
  "xproc_replay_bridge_status",
  "xproc_replay_bridge_configure",
  "xproc_replay_bridge_stats",
  "xproc_replay_bridge_sample_stratified",
  "xproc_replay_bridge_sample_prioritized",
  "xproc_replay_bridge_reset",
  // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
  // (all bridge_* actions namespaced to avoid colliding with the
  // pre-existing xproc_episodic_{store,recall,stats,semantic_join}
  // actions on CrossProcessEpisodicMemoryEngine.)
  "xproc_episodic_bridge_subscribe",
  "xproc_episodic_bridge_unsubscribe",
  "xproc_episodic_bridge_status",
  "xproc_episodic_bridge_configure",
  "xproc_episodic_bridge_stats",
  "xproc_episodic_bridge_reset",
  // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition (auto-train + all fan-out bridges)
  "xproc_autofire_activate",
  "xproc_autofire_deactivate",
  "xproc_autofire_status",
  // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge (Q-learning + policy-gradient + bandit)
  "xproc_rl_bridge_subscribe",
  "xproc_rl_bridge_unsubscribe",
  "xproc_rl_bridge_status",
  "xproc_rl_bridge_configure",
  "xproc_rl_bridge_stats",
  "xproc_rl_bridge_replay",
  "xproc_rl_bridge_reset",
  // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC consolidation controls on the NN learner
  "xproc_neural_ewc_status",
  "xproc_neural_ewc_clear",
  "xproc_neural_ewc_consolidate",
  // XPROC-NEURAL-CONNECT-MS0/U-CN01 — domain-engine outcome publish adapter
  "xproc_outcome_publish",
  "xproc_outcome_publish_with_actuals",
  "xproc_outcome_publish_failure",
  "xproc_outcome_publish_override",
  "xproc_outcome_update",
  "xproc_outcome_adapter_stats",
  "xproc_outcome_adapter_reset",
  "xproc_policy_step",
  "xproc_policy_commit",
  "xproc_policy_select_action",
  "xproc_policy_get_policy",
  "xproc_policy_get_baseline",
  "xproc_policy_configure",
  "xproc_policy_reset",
  "xproc_policy_stats",
  "xproc_policy_constants",
  "xproc_qlearn_update",
  "xproc_qlearn_argmax",
  "xproc_qlearn_epsilon_greedy",
  "xproc_qlearn_get_q_row",
  "xproc_qlearn_configure",
  "xproc_qlearn_reset",
  "xproc_qlearn_stats",
  "xproc_qlearn_constants",
  "xproc_bandit_register_arm",
  "xproc_bandit_select",
  "xproc_bandit_update",
  "xproc_bandit_stats",
  "xproc_bandit_reset",
  "xproc_bandit_constants",
  // T5 Bayesian / Uncertainty (4 engines)
  "xproc_bayes_predict",
  "xproc_bayes_uncertainty",
  "xproc_bayes_constants",
  "xproc_conformal_calibrate",
  "xproc_conformal_set",
  "xproc_conformal_stats",
  "xproc_conformal_reset",
  "xproc_conformal_constants",
  // U-NN-CONFORMAL01: split-conformal classification (LAC, Sadinle 2019)
  "xproc_conformal_classify_calibrate",
  "xproc_conformal_classify_set",
  "xproc_conformal_classify_stats",
  "xproc_conformal_classify_reset",
  "xproc_conformal_classify_constants",
  // U-NN-CONFORMAL02: rolling coverage drift monitor (Tibshirani 2019, Gibbs 2021)
  "xproc_calibration_monitor_configure",
  "xproc_calibration_monitor_record",
  "xproc_calibration_monitor_status",
  "xproc_calibration_monitor_reset",
  "xproc_calibration_monitor_constants",
  // U-NN-CONFORMAL03: APS adaptive prediction sets (Romano et al 2020)
  "xproc_aps_calibrate",
  "xproc_aps_set",
  "xproc_aps_stats",
  "xproc_aps_reset",
  "xproc_aps_constants",
  // U-NN-CONFORMAL04: RAPS regularized adaptive sets (Angelopoulos et al 2021)
  "xproc_raps_calibrate",
  "xproc_raps_set",
  "xproc_raps_stats",
  "xproc_raps_reset",
  "xproc_raps_constants",
  // U-NN-CONFORMAL05: prediction-log bridge — pairs predictedSet ↔ actualLabel
  "xproc_predlog_log",
  "xproc_predlog_pair",
  "xproc_predlog_prune",
  "xproc_predlog_configure",
  "xproc_predlog_status",
  "xproc_predlog_pending_ids",
  "xproc_predlog_enable_autosync",
  "xproc_predlog_disable_autosync",
  "xproc_predlog_reset",
  "xproc_predlog_constants",
  // U-NN-MONDRIAN01: class-conditional conformal classification (Vovk 2003)
  "xproc_mondrian_calibrate",
  "xproc_mondrian_set",
  "xproc_mondrian_stats",
  "xproc_mondrian_reset",
  "xproc_mondrian_constants",
  "xproc_ensemble_predict",
  "xproc_ensemble_disagreement",
  "xproc_ensemble_constants",
  "xproc_calibration_score",
  "xproc_calibration_recommend",
  "xproc_calibration_constants",
  // T6 Federated Learning (4 engines)
  "xproc_fed_aggregate",
  "xproc_fed_round_summary",
  "xproc_fed_constants",
  "xproc_secure_mask",
  "xproc_secure_unmask",
  "xproc_secure_verify",
  "xproc_secure_constants",
  "xproc_fed_gate",
  "xproc_fed_drift_report",
  "xproc_fed_drift_constants",
  "xproc_fed_select_clients",
  "xproc_fed_round_plan",
  "xproc_fed_scheduler_constants",
  // T7 Meta-Learning (4 engines)
  "xproc_maml_inner_loop",
  "xproc_maml_meta_train",
  "xproc_maml_constants",
  "xproc_proto_compute",
  "xproc_proto_classify",
  "xproc_proto_regress",
  "xproc_proto_constants",
  "xproc_meta_lr_init",
  "xproc_meta_lr_step",
  "xproc_meta_lr_constants",
  "xproc_hyper_propose",
  "xproc_hyper_evaluate",
  "xproc_hyper_record_outcome",
  "xproc_hyper_constants",
  // U-XPROC-TIER1-PRISM-AI-WIRE: Tier 1 baseline (5 engines / 23 actions)
  // Cherry-picked from work/cad-fidx-solidworks (commits 619c4f037..5919b5c4f).
  // T1-01 OutcomeStore (event-sourced ledger)
  "xproc_outcome_record",
  "xproc_outcome_record_outcome",
  "xproc_outcome_query",
  "xproc_outcome_retrieve_similar",
  "xproc_outcome_stats",
  "xproc_outcome_clear",
  // T1-02 NeuralLearning (pure-JS MLP 32→16→3)
  "xproc_neural_train",
  "xproc_neural_predict",
  "xproc_neural_evaluate",
  "xproc_neural_save",
  "xproc_neural_load",
  "xproc_neural_metrics",
  "xproc_neural_reset",
  // T1-03 TransferLearning (material-cluster pairs)
  "xproc_transfer_classify",
  "xproc_transfer_pairs",
  "xproc_transfer_check",
  // T1-04 AttentionExplain (LIME + ECE + L1 anomaly)
  "xproc_attention_explain",
  "xproc_attention_ece",
  "xproc_attention_baseline_add",
  "xproc_attention_anomaly",
  "xproc_attention_baseline_get",
  "xproc_attention_baseline_reset",
  // T1-05 AGIBridge (composer)
  "xproc_agi_compose",
  // U-NN-FEAT03: PhysicsFeatureExtractorEngine — Kienzle/Taylor/chatter/Ra/thermal
  "xproc_physics_features",
  "xproc_physics_features_batch",
  // U-NN-FEAT04: WikiRAGFeatureEngine — tribal-tip RAG features
  "xproc_rag_features",
  "xproc_rag_clear_cache",
  // U-NN-LOOP01: FeedbackBusEngine — in-process pub/sub control plane
  "xproc_feedbackbus_publish",
  "xproc_feedbackbus_stats",
  "xproc_feedbackbus_topics",
  "xproc_feedbackbus_subscriber_count",
  "xproc_feedbackbus_reset",
  // ENGINE-WIRE-AI-MS0/U-WIRE-AI-BATCH1: 12 unwired AI/reasoning engines
  "cognitive_budget_allocate",      // CognitiveBudgetAllocatorEngine.allocate
  "ensemble_register_member",       // EnsembleModelSelectorEngine.registerMember
  "ensemble_predict",               // EnsembleModelSelectorEngine.predict
  "neural_model_register",          // NeuralModelRegistryEngine.registerModel
  "neural_model_list",              // NeuralModelRegistryEngine.listModels
  "reasoning_chain_register",       // ReasoningChainSharingEngine.registerChain
  "reasoning_chain_query",          // ReasoningChainSharingEngine.queryChains
  "reasoning_explain",              // ReasoningExplainerEngine.explain
  "transfer_bridge_register",       // TransferLearningBridgeEngine.register
  "transfer_bridge_find_analogies", // TransferLearningBridgeEngine.findAnalogies
  "memory_pressure_sample",         // MemoryPressureMonitorEngine.sampleNow
  "memory_pressure_trend",          // MemoryPressureMonitorEngine.trend
  // OCTOPUS-NEURAL-MS0/U-OCN01: mid-tier tentacle (Moonshot Kimi-K2 hosted API)
  "moonshot_invoke",                // MoonshotClientEngine.exec
  // OCTOPUS-NEURAL-MS0/U-OCN02: MoA-Layer-2 aggregator over N proposer outputs
  "moa_aggregate",                  // MoaLayer2Engine.aggregate
  // OCTOPUS-NEURAL-MS0/U-OCN03: GraphRouter on scrutiny ledger — learned quorum routing
  "neural_route_decision",          // NeuralRoutingEngine.route
  // OCTOPUS-NEURAL-MS0/U-OCN04: probe-based cost-quality calibration
  "cascade_calibrate",              // CascadeCalibrationEngine.calibrate
] as const;

export type AIReasoningAction = (typeof AI_REASONING_ACTIONS)[number];

/** ISO material group enum */
const ISOGroupEnum = z.enum(["P", "M", "K", "N", "S", "H"]);

/** Tool geometry schema */
const ToolGeometrySchema = z.object({
  diameter_mm: z.number().positive().describe("Tool diameter in mm"),
  flutes: z.number().int().positive().describe("Number of flutes"),
  flute_length_mm: z.number().positive().optional().describe("Flute length"),
  overall_length_mm: z.number().positive().optional().describe("Overall length"),
  corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius"),
  helix_angle_deg: z.number().optional().describe("Helix angle in degrees"),
  coating: z.string().optional().describe("Tool coating"),
});

/** Cutting parameters schema */
const CuttingParamsSchema = z.object({
  rpm: z.number().positive().optional().describe("Spindle speed"),
  feed_mmpm: z.number().positive().optional().describe("Feed rate mm/min"),
  feed_per_tooth: z.number().positive().optional().describe("Feed per tooth mm"),
  doc_mm: z.number().positive().optional().describe("Depth of cut mm"),
  woc_mm: z.number().positive().optional().describe("Width of cut mm"),
  radial_engagement: z.number().min(0).max(1).optional().describe("Radial engagement ratio"),
  axial_engagement: z.number().min(0).max(1).optional().describe("Axial engagement ratio"),
  coolant: z.enum(["flood", "mist", "through_spindle", "air", "none"]).optional(),
});

/** Machine configuration schema */
const MachineConfigSchema = z.object({
  machine_id: z.string().optional().describe("Machine identifier"),
  max_rpm: z.number().positive().optional().describe("Max spindle RPM"),
  max_power_kw: z.number().positive().optional().describe("Max spindle power kW"),
  max_torque_nm: z.number().positive().optional().describe("Max torque Nm"),
  has_4th_axis: z.boolean().optional(),
  has_5th_axis: z.boolean().optional(),
});

/** AGI reasoning modes */
const ReasoningModeEnum = z.enum([
  "chain_of_thought",
  "tree_of_thought",
  "counterfactual",
  "hypothesis_ranking",
  "analogical",
  "temporal",
  "causal",
  "abductive",
  "deductive",
  "inductive",
  "creative",
  "cross_domain",
]);

// ============================================================================
// ACTION SCHEMAS
// ============================================================================

/** Route mill pipeline — Full P2P pipeline orchestration */
const ai_route_mill_pipeline = z.object({
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  params: CuttingParamsSchema.optional().describe("Cutting parameters"),
  machine: MachineConfigSchema.optional().describe("Machine configuration"),
  features: z.array(z.record(z.string(), z.unknown())).optional().describe("CAD features to process"),
  geometry: z.unknown().optional().describe("Part geometry data"),
  include_provenance: z.boolean().optional().describe("Include provenance tracking"),
}).passthrough();

/** AGI reasoning — Multi-mode reasoning for mill optimization */
const ai_mill_agi_reason = z.object({
  intent: z.string().min(1).describe("Reasoning intent or problem statement"),
  reasoning_mode: ReasoningModeEnum.optional().describe("Reasoning mode to use"),
  material: z.string().optional().describe("Material context"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry context"),
  params: CuttingParamsSchema.optional().describe("Current cutting parameters"),
  constraints: z.record(z.string(), z.unknown()).optional().describe("Optimization constraints"),
  include_provenance: z.boolean().optional().describe("Include provenance tracking"),
}).passthrough();

/** Awareness query — Query mill engine capabilities and registry */
const ai_mill_awareness_query = z.object({
  query: z.string().min(1).describe("Capability query string"),
  category: z.enum([
    "orchestrator", "agi", "physics", "kinematics", "lora",
    "neural", "strategy", "validation", "tribal", "all"
  ]).optional().describe("Filter by engine category"),
  include_methods: z.boolean().optional().describe("Include method signatures"),
  top_k: z.number().int().positive().max(50).optional().describe("Max results to return"),
}).passthrough();

/** Scientific analysis — Physics-backed calculations */
const ai_mill_scientific_analyze = z.object({
  analysis_type: z.enum([
    "force", "deflection", "chatter", "thermal", "power", "tool_life", "all"
  ]).optional().describe("Type of scientific analysis"),
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  params: CuttingParamsSchema.optional().describe("Cutting parameters"),
  machine: MachineConfigSchema.optional().describe("Machine limits"),
  include_provenance: z.boolean().optional().describe("Include formula provenance"),
}).passthrough();

/** Wisdom query — Tribal knowledge and machinist experience */
const ai_mill_wisdom_query = z.object({
  query: z.string().min(1).describe("Knowledge query"),
  domain: z.enum([
    "tool_selection", "speed_feed", "workholding", "surface_finish",
    "chatter_mitigation", "chip_control", "coolant", "programming",
    "setup", "inspection", "general"
  ]).optional().describe("Knowledge domain"),
  material: z.string().optional().describe("Material context"),
  operation: z.string().optional().describe("Operation type (roughing, finishing, etc.)"),
  top_k: z.number().int().positive().max(20).optional().describe("Max tips to return"),
}).passthrough();

/** Adaptive strategy — Generate adaptive toolpath strategies */
const ai_mill_adaptive_strategy = z.object({
  operation: z.enum([
    "adaptive_clearing", "trochoidal", "hsm", "prism_forces",
    "plunge_roughing", "rest_machining", "pencil", "flowline"
  ]).describe("Adaptive operation type"),
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  machine: MachineConfigSchema.optional().describe("Machine configuration"),
  feature_type: z.string().optional().describe("Target feature type (pocket, slot, etc.)"),
  stock_to_leave: z.number().nonnegative().optional().describe("Finishing stock mm"),
  include_provenance: z.boolean().optional().describe("Include strategy provenance"),
}).passthrough();

// ============================================================================
// SUCCESS PATTERN BANK SCHEMAS (AI Augmentation Learning Loop)
// ============================================================================

/** Record a success pattern */
const pattern_record = z.object({
  task_category: TaskCategory.describe("Category of task"),
  task_description: z.string().max(500).describe("Brief task description"),
  task_keywords: z.array(z.string()).min(1).max(10).describe("Keywords for similarity search"),
  approach_summary: z.string().max(1000).describe("Summary of successful approach"),
  mcp_actions_used: z.array(z.string()).max(20).optional().describe("MCP actions that contributed"),
  tools_used: z.array(z.string()).max(20).optional().describe("Tools that contributed"),
  engines_invoked: z.array(z.string()).max(20).optional().describe("Engines that were called"),
  confidence: ConfidenceLevel.optional().describe("Confidence level"),
  domain: z.string().max(50).optional().describe("Domain context (mill, lathe, wedm)"),
  constraints: z.array(z.string()).max(10).optional().describe("Constraints that applied"),
  lineage_id: z.string().optional().describe("Links to original session/task"),
  pattern_id: z.string().uuid().optional().describe("Custom pattern ID"),
}).passthrough();

/** Query patterns */
const pattern_query = z.object({
  task_category: TaskCategory.optional().describe("Filter by task category"),
  keywords: z.array(z.string()).max(10).optional().describe("Keywords to match"),
  domain: z.string().max(50).optional().describe("Filter by domain"),
  min_confidence: ConfidenceLevel.optional().describe("Minimum confidence level"),
  min_success_count: z.number().int().min(1).optional().describe("Minimum success count"),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 10)"),
}).passthrough();

/** Reinforce a pattern (record success/failure) */
const pattern_reinforce = z.object({
  pattern_id: z.string().uuid().describe("Pattern ID to reinforce"),
  success: z.boolean().describe("Whether pattern succeeded this time"),
  note: z.string().max(200).optional().describe("Optional note"),
}).passthrough();

/** Get pattern bank statistics */
const pattern_stats = z.object({}).passthrough();

/** Iterative retrieval — progressive context refinement (DISPATCH→EVALUATE→REFINE→LOOP, max 3 cycles) */
const iterate_retrieve = z.object({
  query: z.string().min(1).describe("Natural-language task or search intent"),
  dispatch_target: z.enum([
    "codebase",
    "engines_only",
    "skills_only",
    "knowledge_wiki",
    "dispatchers_only",
  ]).optional().describe("Search scope (default: codebase)"),
  max_cycles: z.number().int().min(1).max(5).optional().describe("Max refinement cycles (default 3)"),
  target_count: z.number().int().min(1).max(50).optional().describe("High-relevance hits needed for early termination (default 3)"),
  min_relevance: z.number().min(0).max(1).optional().describe("Threshold for high_relevance bucket (default 0.7)"),
  initial_keywords: z.array(z.string()).max(20).optional().describe("Seed keywords (in addition to query tokens)"),
  exclude_patterns: z.array(z.string()).max(20).optional().describe("Path substrings to exclude"),
  max_files_per_cycle: z.number().int().min(10).max(500).optional().describe("Cap per cycle (default 100)"),
}).passthrough();

// ─── ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines ──────

/** AI Decision Explanation — narrate why parameters were chosen. */
const ai_explain_decision = z.object({
  operationId: z.string().min(1).describe("Operation ID for traceability"),
  operationType: z.enum([
    "roughing","finishing","drilling","threading","tapping","boring","reaming",
    "facing","turning","grooving","parting","profiling","pocketing","contouring",
    "chamfering","wire_edm","sinker_edm","grinding","general",
  ]).describe("High-level operation classification"),
  operationName: z.string().optional().describe("Human-readable operation name"),
  parameters: z.array(z.object({
    parameter: z.string().min(1),
    chosenValue: z.union([z.number(), z.string()]),
    unit: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    sources: z.array(z.unknown()).optional(),
    alternatives: z.array(z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    displayName: z.string().optional(),
  }).passthrough()).min(1).describe("Parameter decisions to explain"),
  verbosity: z.enum(["brief", "normal", "detailed"]).optional().describe("Explanation depth"),
  includeTribalKnowledge: z.boolean().optional().describe("Include tribal-tip references"),
  targetAudience: z.enum(["operator", "engineer", "manager"]).optional().describe("Tailor wording"),
}).passthrough();

/** AI Extraction Classifier — categorize raw extracted content. */
const ai_extract_classify = z.object({
  content: z.unknown().describe("Raw extracted content (object, string, or array)"),
}).passthrough();

/** AI Physics Optimization — multi-objective parameter search with physics + AI agents. */
const ai_physics_optimize = z.object({
  material: z.object({
    name: z.string().min(1),
    iso_group: z.enum(["P","M","K","N","S","H"]).optional(),
    hardness_hrc: z.number().optional(),
    hardness_hb: z.number().optional(),
    kc1_1: z.number().positive().optional(),
    mc: z.number().optional(),
    thermal_conductivity: z.number().positive().optional(),
    machinability_factor: z.number().positive().optional(),
  }).passthrough().describe("Workpiece material spec"),
  tool: z.object({
    type: z.enum(["endmill","insert","drill","tap","boring_bar","turning_insert"]),
    material: z.enum(["hss","carbide","ceramic","cbn","pcd"]),
    diameter_mm: z.number().positive(),
    flutes: z.number().int().positive().optional(),
    coating: z.string().optional(),
    helix_angle_deg: z.number().optional(),
    corner_radius_mm: z.number().nonnegative().optional(),
    stickout_mm: z.number().positive().optional(),
    edge_radius_mm: z.number().nonnegative().optional(),
  }).passthrough().describe("Tool spec"),
  machine: z.object({
    type: z.enum(["vertical_mill","horizontal_mill","lathe","turn_mill","5axis"]),
    power_kw: z.number().positive(),
    max_rpm: z.number().positive(),
    max_torque_nm: z.number().positive().optional(),
    taper: z.string().optional(),
    rigidity: z.enum(["low","medium","high"]).optional(),
    natural_freq_hz: z.number().positive().optional(),
  }).passthrough().describe("Machine spec"),
  operation: z.object({
    operation: z.enum(["roughing","finishing","semi_finishing","drilling","threading","grooving"]),
    feature: z.string().optional(),
    strategy: z.string().optional(),
    coolant: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
  }).passthrough().describe("Operation context"),
  objectives: z.object({
    maximize_mrr: z.boolean().optional(),
    maximize_tool_life: z.boolean().optional(),
    minimize_cost: z.boolean().optional(),
    minimize_cycle_time: z.boolean().optional(),
    maximize_surface_quality: z.boolean().optional(),
    minimize_deflection: z.boolean().optional(),
    weights: z.object({
      productivity: z.number().min(0),
      tool_cost: z.number().min(0),
      quality: z.number().min(0),
      safety: z.number().min(0),
    }).passthrough().optional(),
  }).passthrough().optional().describe("Optimization weights"),
  constraints: z.object({
    max_force_N: z.number().positive().optional(),
    max_power_kw: z.number().positive().optional(),
    max_deflection_um: z.number().positive().optional(),
    min_tool_life_min: z.number().positive().optional(),
    max_temperature_C: z.number().optional(),
  }).passthrough().optional().describe("Hard constraints"),
  use_swarm: z.boolean().optional().describe("Enable swarm-of-agents reasoning"),
  use_creative_reasoning: z.boolean().optional().describe("Enable cross-disciplinary creative mode"),
  use_uncertainty_quantification: z.boolean().optional().describe("Run Monte Carlo UQ"),
  monte_carlo_samples: z.number().int().positive().optional().describe("MC sample count"),
}).passthrough();

/** AI Deep Knowledge Query — multi-source knowledge fusion. */
const ai_knowledge_query = z.object({
  intent: z.enum([
    "recommend_parameters","validate_physics","find_similar_programs","get_tribal_wisdom",
    "suggest_toolpath","analyze_material","optimize_process","generate_code",
    "debug_issue","learn_from_resource",
  ]).describe("What kind of answer the caller wants"),
  domain: z.string().min(1).describe("Domain hint (e.g. 'milling', 'turning', material name)"),
  context: z.record(z.string(), z.unknown()).describe("Free-form context object"),
  constraints: z.array(z.string()).optional().describe("Optional constraint strings"),
  depth: z.enum(["surface","moderate","deep","exhaustive"]).optional().describe("Reasoning depth"),
}).passthrough();

/** AI Resource Material Lookup — surface learned material parameters from program corpus. */
const ai_material_lookup = z.object({
  material: z.string().min(1).describe("Material designation (e.g. AISI 4140, 6061-T6)"),
}).passthrough();

// ─── ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines ───

/** Milling Deep Reasoning — chain-of-thought reasoning over milling context. */
const ai_milling_deep_reason = z.object({
  query: z.string().min(1).describe("Natural-language reasoning question"),
  context: z.object({
    material: z.string().optional(),
    material_iso: z.enum(["P","M","K","N","S","H"]).optional(),
    hardness_hrc: z.number().optional(),
    operation: z.string().optional(),
    tool_type: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    machine: z.string().optional(),
    controller: z.string().optional(),
    customer: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
    depth_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    is_thin_wall: z.boolean().optional(),
    is_5_axis: z.boolean().optional(),
  }).passthrough().describe("Milling operation context"),
  mode: z.enum(["analytical","comparative","diagnostic","predictive","creative"]).optional().describe("Reasoning mode (default analytical)"),
}).passthrough();

/** Wire EDM Deep Logic — symbolic + rule-based reasoning over WEDM problems. */
const ai_wedm_deep_logic = z.object({
  query: z.string().min(1).describe("Natural-language reasoning question"),
  context: z.record(z.string(), z.unknown()).optional().describe("Free-form context object"),
}).passthrough();

/** Wire EDM Deep Neural Reasoning — neural-net-style multi-hop inference. */
const ai_wedm_deep_neural = z.object({
  question: z.string().min(1).describe("Natural-language WEDM question"),
  context: z.object({
    material: z.string().optional(),
    thickness_mm: z.number().positive().optional(),
    target_ra_um: z.number().positive().optional(),
    machine: z.string().optional(),
    wire_diameter_mm: z.number().positive().optional(),
    constraints: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
  }).passthrough().describe("WEDM context"),
  reasoning_depth: z.enum(["quick","standard","deep","exhaustive"]).optional().describe("Reasoning depth"),
}).passthrough();

/** Milling Deep Knowledge Synthesis — fuse tribal/physics/program sources. */
const ai_milling_synthesize = z.object({
  material: z.string().min(1).describe("Material designation"),
  material_iso: z.string().min(1).describe("ISO material group code (e.g. P, M, K)"),
  hardness_hrc: z.number().optional().describe("Workpiece hardness HRC"),
  operation: z.string().min(1).describe("Operation type"),
  feature_type: z.string().optional().describe("Feature type (pocket, profile, hole, etc.)"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter mm"),
  tool_type: z.string().optional().describe("Tool type"),
  tool_length_mm: z.number().positive().optional().describe("Tool length mm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  surface_finish_ra: z.number().positive().optional().describe("Target Ra"),
  machine: z.string().optional().describe("Machine name"),
  controller: z.string().optional().describe("Controller name"),
  customer: z.string().optional().describe("Customer name"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold"),
  prefer_conservative: z.boolean().optional().describe("Bias toward safer parameters"),
  require_physics_validation: z.boolean().optional().describe("Require physics validation"),
}).passthrough();

/** Lathe AI Reasoning — diagnostic/predictive reasoning over lathe operations. */
const ai_lathe_reason = z.object({
  operation_type: z.string().min(1).describe("Lathe operation type (turning, threading, grooving, parting, boring, etc.)"),
  material_iso: z.enum(["P","M","K","N","S","H"]).describe("ISO material group"),
  material_name: z.string().optional().describe("Material designation"),
  hardness_hrc: z.number().optional().describe("Workpiece hardness HRC"),
  diameter_mm: z.number().positive().optional().describe("Workpiece diameter mm"),
  length_mm: z.number().positive().optional().describe("Cut length mm"),
  depth_mm: z.number().positive().optional().describe("Depth of cut mm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  surface_finish_Ra_um: z.number().positive().optional().describe("Target Ra µm"),
  thread_pitch_mm: z.number().positive().optional().describe("Thread pitch mm"),
  controller: z.string().optional().describe("Controller name"),
  machine_brand: z.string().optional().describe("Machine brand"),
  optimization_target: z.enum(["balanced","max_speed","max_tool_life","min_cost","surface_quality"]).optional().describe("Optimization objective"),
}).passthrough();

// ─── ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines ─────

/** Milling AGI analysis — multi-objective, scientifically-justified parameter optimization. */
const ai_milling_agi = z.object({
  material: z.string().min(1).describe("Material designation"),
  tool_diameter_mm: z.number().positive().describe("Tool diameter mm"),
  tool_flutes: z.number().int().positive().describe("Tool flute count"),
  cutting_speed_m_min: z.number().positive().describe("Cutting speed Vc m/min"),
  feed_per_tooth_mm: z.number().positive().describe("Feed per tooth fz mm"),
  axial_depth_mm: z.number().positive().describe("Axial DOC ap mm"),
  radial_depth_mm: z.number().positive().describe("Radial DOC ae mm"),
  operation: z.string().min(1).describe("Operation type (roughing/finishing/etc.)"),
  coolant_type: z.string().optional().describe("Coolant type"),
  tool_coating: z.string().optional().describe("Tool coating"),
  helix_angle_deg: z.number().optional().describe("Helix angle deg"),
  rake_angle_deg: z.number().optional().describe("Rake angle deg"),
  corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius mm"),
}).passthrough();

/** Milling Digital Twin simulate — forward-simulate process state for N seconds. */
const ai_milling_twin_simulate = z.object({
  duration_s: z.number().positive().describe("Simulation duration in seconds"),
  parameter_changes: z.record(z.string(), z.unknown()).optional().describe("Optional process parameter overrides for this run"),
}).passthrough();

/** WEDM Master AI analyze — top-level Wire EDM AI orchestrator with depth control. */
const ai_wedm_master = z.object({
  domain: z.enum([
    "parameter_selection","pass_strategy","wire_selection","machine_selection",
    "troubleshooting","optimization","quality_prediction","cost_estimation","program_generation",
  ]).describe("Decision domain"),
  depth: z.enum(["quick","standard","deep","exhaustive"]).describe("Reasoning depth"),
  material: z.string().optional().describe("Material designation"),
  thickness_mm: z.number().positive().optional().describe("Material thickness mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra µm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  wire_type: z.string().optional().describe("Wire type"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter mm"),
  customer: z.string().optional().describe("Customer name"),
  part_category: z.string().optional().describe("Part category"),
  question: z.string().optional().describe("Free-form question"),
  program_content: z.string().optional().describe("Program content for analysis"),
  current_params: z.record(z.string(), z.number()).optional().describe("Current parameter values"),
  constraints: z.record(z.string(), z.unknown()).optional().describe("Free-form constraints"),
  include_counterfactuals: z.boolean().optional().describe("Generate counterfactual scenarios"),
}).passthrough();

/** WEDM Neural Orchestrate — multi-strategy WEDM evaluation. */
const ai_wedm_neural_orchestrate = z.object({
  material: z.string().min(1).describe("Material designation"),
  thickness_mm: z.number().positive().describe("Material thickness mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra µm"),
  geometry: z.enum(["straight","complex","taper","corner_heavy"]).optional().describe("Geometry class"),
  priority: z.enum(["speed","quality","cost","balanced"]).optional().describe("Optimization priority"),
  constraints: z.object({
    max_cycle_time_min: z.number().positive().optional(),
    max_wire_consumption_m: z.number().positive().optional(),
    max_passes: z.number().int().positive().optional(),
    min_accuracy_mm: z.number().positive().optional(),
  }).passthrough().optional().describe("Hard constraints"),
  context: z.record(z.string(), z.unknown()).optional().describe("Decision context"),
  observations: z.array(z.string()).optional().describe("Observed signals"),
  symptoms: z.array(z.string()).optional().describe("Reported symptoms"),
}).passthrough();

/** Lathe AI Train — train from a batch of CNC lathe programs. */
const ai_lathe_train = z.object({
  programs: z.array(z.object({
    content: z.string().min(1).describe("Raw program text"),
    filepath: z.string().min(1).describe("Source filepath for traceability"),
  }).passthrough()).min(1).describe("Programs to train from"),
}).passthrough();

/** ENGINE-WIRE-MS0/U-WIRE08: Wire EDM AI Specialist Engines */

/** Advanced Neural — predict optimal WEDM parameters via deep ensemble. */
const ai_wedm_advanced_neural = z.object({
  material: z.string().min(1).describe("Workpiece material (e.g. D2, M2, carbide)"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  target_ra_um: z.number().positive().describe("Target surface roughness Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target dimensional accuracy in mm"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter in mm (default 0.25)"),
  taper_angle_deg: z.number().min(0).optional().describe("Taper angle in degrees"),
  machine: z.string().optional().describe("Machine model (e.g. Mitsubishi FA-S, Makino SP43)"),
}).passthrough();

/** AGI Orchestrate — full AGI reasoning chain for Wire EDM decision. */
const ai_wedm_agi_orchestrate = z.object({
  query: z.string().min(1).describe("Natural-language question or decision to reason about"),
  material: z.string().min(1).describe("Workpiece material"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  wire_diameter_mm: z.number().positive().describe("Wire diameter in mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target accuracy in mm"),
  machine: z.string().optional().describe("Machine model"),
  mode: z.enum(["analytical","creative","adaptive","predictive","counterfactual","causal","ensemble","physics","full_agi"]).optional().describe("AGI reasoning mode"),
  include_counterfactuals: z.boolean().optional().describe("Include counterfactual what-if analysis"),
  include_causal_analysis: z.boolean().optional().describe("Include causal inference step"),
}).passthrough();

/** Print to Program — AI-generate a Wire EDM NC program from part inputs. */
const ai_wedm_print_to_program = z.object({
  material: z.string().min(1).describe("Workpiece material"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target accuracy in mm"),
  wire_type: z.enum(["plain_brass","zinc_coated","gamma_coated","diffusion_annealed","molybdenum"]).optional().describe("Wire type"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter in mm"),
  taper_angle_deg: z.number().min(0).optional().describe("Taper angle in degrees"),
  controller: z.enum(["mitsubishi","makino","sodick","fanuc","agie","charmilles"]).optional().describe("Machine controller"),
  program_number: z.number().int().positive().optional().describe("Program number"),
  part_name: z.string().optional().describe("Part name"),
  customer: z.string().optional().describe("Customer name"),
  reasoning_mode: z.enum(["ensemble","physics","neural","empirical","hybrid"]).optional().describe("AI reasoning mode"),
  enable_counterfactuals: z.boolean().optional().describe("Enable counterfactual analysis"),
  enable_ensemble: z.boolean().optional().describe("Enable multi-model ensemble"),
}).passthrough();

/** CAM Knowledge — search Mastercam Wire EDM knowledge base. */
const ai_wedm_cam_knowledge = z.object({
  query: z.string().min(1).describe("Search query for Wire EDM CAM knowledge"),
  category: z.enum(["toolpath","parameter","workflow","optimization","safety"]).optional().describe("Knowledge category filter"),
}).passthrough();

/** Synthesize Knowledge — fuse all Wire EDM knowledge sources to answer a query. */
const ai_wedm_synthesize_knowledge = z.object({
  question: z.string().min(1).describe("Question to synthesize knowledge for"),
  material: z.string().optional().describe("Workpiece material context"),
  thickness_mm: z.number().positive().optional().describe("Workpiece thickness context in mm"),
  wire_diameter: z.string().optional().describe("Wire diameter context (e.g. '0.25mm')"),
  target_ra_um: z.number().positive().optional().describe("Target Ra context in µm"),
  machine: z.string().optional().describe("Machine context"),
  urgency: z.enum(["low","normal","high","critical"]).optional().describe("Response urgency"),
  confidence_threshold: z.number().min(0).max(1).optional().describe("Minimum confidence threshold (0–1)"),
  max_hypotheses: z.number().int().positive().optional().describe("Maximum hypotheses to evaluate"),
}).passthrough();

/** Map action to schema */

// ─── ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines ─────────────────────
const ai_lathe_orchestrate = z.object({
  program: z.union([
    z.string().min(1).describe("G-code program text"),
    z.object({}).passthrough().describe("Lathe part description object"),
  ]).describe("Program or part-description"),
  context: z.object({
    material: z.string().optional().describe("Workpiece material identifier"),
    machineId: z.string().optional().describe("Machine instance identifier"),
    controller: z.string().optional().describe("CNC controller name"),
    constraints: z.object({}).passthrough().optional().describe("Optimization constraints"),
  }).passthrough().optional().describe("Optional orchestration context"),
  strategy: z.enum([
    "full_coverage",
    "fast_path",
    "quality_optimized",
    "cost_optimized",
    "safety_first",
    "learning_focused",
    "adaptive",
  ]).optional().describe("Orchestration strategy"),
}).passthrough();

const ai_lathe_active_learn_select = z.object({
  labeled_data: z.array(z.object({}).passthrough()).min(1).describe("Labeled data points"),
  pool_data: z.array(z.object({}).passthrough()).optional().describe("Unlabeled candidate pool"),
  n_samples: z.number().int().positive().max(1000).optional().describe("Number of samples to select"),
  query_strategy: z.enum([
    "uncertainty_sampling",
    "margin_sampling",
    "entropy_sampling",
    "query_by_committee",
    "expected_model_change",
    "expected_error_reduction",
    "bald",
    "core_set",
    "batch_bald",
    "hybrid",
  ]).optional().describe("Active-learning query strategy"),
  budget: z.object({}).passthrough().optional().describe("Optional sample budget overrides"),
}).passthrough();

const ai_lathe_bayesian_fit_gp = z.object({
  observations: z.array(z.object({
    x: z.array(z.number()).min(1).describe("Input vector"),
    y: z.number().describe("Observed objective value"),
    timestamp: z.number().optional().describe("Observation timestamp"),
  })).min(2).describe("Bayesian observations (≥2 required for GP fit)"),
  kernel_config: z.object({
    type: z.enum(["RBF", "Matern32", "Matern52", "RationalQuadratic", "Linear", "Periodic"]).describe("Kernel family"),
    length_scales: z.array(z.number().positive()).min(1).optional().describe("Per-dimension ARD length scales (auto-broadcast if missing)"),
    signal_variance: z.number().positive().optional().describe("Kernel output (signal) variance"),
    noise_variance: z.number().nonnegative().optional().describe("Observation noise variance"),
    matern_nu: z.union([z.literal(1.5), z.literal(2.5)]).optional().describe("Matern smoothness ν (1.5 or 2.5)"),
    alpha: z.number().positive().optional().describe("RationalQuadratic α parameter"),
  }).passthrough().describe("GP kernel configuration"),
}).passthrough();

const ai_lathe_attention_compute = z.object({
  tokens: z.array(z.object({
    id: z.number().int().nonnegative().describe("Token id"),
    token: z.string().min(1).describe("Token text"),
    type: z.enum([
      "G_CODE", "M_CODE", "T_CODE", "S_CODE", "F_CODE",
      "X_COORD", "Z_COORD", "I_COORD", "K_COORD",
      "R_CODE", "P_CODE", "Q_CODE", "U_CODE", "W_CODE",
      "N_LINE", "NAT_BLOCK", "COMMENT", "SPECIAL",
      "NUMBER", "UNKNOWN",
    ]).describe("G-code token type (matches engine GCodeTokenType union)"),
    position: z.number().int().nonnegative().describe("Position in sequence"),
    embedding: z.array(z.number()).min(1).describe("Pre-computed embedding"),
    value: z.number().optional().describe("Numeric value if applicable"),
    line_number: z.number().int().nonnegative().optional().describe("Source line number"),
    semantic_role: z.enum([
      "motion_command", "cycle_command", "spindle_control", "feed_control",
      "tool_selection", "positioning", "arc_definition", "dwell",
      "safety_critical", "coolant_control", "program_control",
      "operation_boundary", "work_offset", "compensation", "unknown",
    ]).optional().describe("Manufacturing semantic role (matches engine SemanticRole union)"),
  })).min(2).max(2048).describe("Pre-tokenized G-code with embeddings"),
}).passthrough();

const ai_lathe_adaptive_engagement = z.object({
  operation_type: z.enum(["od_turning", "id_boring", "facing", "grooving", "threading", "parting"]).describe("Turning operation type (matches engine TurningEngagement.operationType)"),
  diameter: z.number().positive().describe("Workpiece diameter (mm)"),
  depth_of_cut: z.number().positive().describe("Depth of cut ap (mm)"),
  feed_per_rev: z.number().positive().describe("Feed per revolution fn (mm/rev)"),
  lead_angle: z.number().positive().max(180).describe("Tool lead angle (deg)"),
  nose_radius: z.number().positive().describe("Insert nose radius rε (mm)"),
  cutting_speed: z.number().positive().describe("Cutting speed Vc (m/min)"),
}).passthrough();


// ─── ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines ──────────
const ai_code_gate_pending = z.object({
  status: z.string().optional().describe("Filter by gate status (e.g. 'pending', 'escalated')"),
  approver: z.string().optional().describe("Filter by approver"),
  request_type: z.string().optional().describe("Filter by request type"),
}).passthrough();

const ai_self_mod_propose_batch = z.object({
  observations: z.array(z.object({
    kind: z.enum(["extract-abstraction","remove-orphan","split-high-fan-in","merge-duplicates","deprecate-low-usage"]).describe("Proposal kind"),
    targets: z.array(z.string().min(1)).min(1).describe("Files or symbols to modify"),
    evidence: z.string().min(1).describe("Why this proposal is justified"),
    confidence: z.number().min(0).max(1).describe("Confidence in [0,1]"),
    estimatedEffortHours: z.number().nonnegative().optional().describe("Estimated effort in hours"),
    psiImpactEstimate: z.number().optional().describe("Estimated impact on system Psi"),
  })).min(1).max(100).describe("Pattern observations to convert into proposals"),
  at: z.string().optional().describe("ISO timestamp override (test reproducibility)"),
}).passthrough();

const ai_self_mod_is_approved = z.object({
  proposal_id: z.string().min(1).describe("Proposal id"),
  proposal_hash: z.string().min(1).describe("Proposal content hash"),
  now_ms: z.number().int().positive().optional().describe("Override 'now' timestamp"),
}).passthrough();

const ai_intelligence_maximize = z.object({
  operation: z.enum(["roughing","finishing","semi_finishing","drilling","boring","reaming","tapping","turning_od","turning_id","facing","grooving","threading","milling_pocket","milling_contour","milling_slot","milling_face","5axis_swarf","5axis_multiaxis","5axis_positioning","grinding","edm_wire","edm_sinker","adaptive","trochoidal","hsm"]).describe("Operation type"),
  material: z.string().min(1).describe("Material identifier"),
  hardness_hrc: z.number().nonnegative().optional().describe("Hardness in HRC"),
  feature: z.string().optional().describe("Feature type"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance (mm)"),
  surface_finish_ra: z.number().positive().optional().describe("Surface finish target Ra (µm)"),
  machine_type: z.string().optional().describe("Machine type"),
  controller: z.string().optional().describe("CNC controller"),
  spindle_max_rpm: z.number().positive().optional().describe("Max spindle RPM"),
  spindle_power_kw: z.number().positive().optional().describe("Spindle power (kW)"),
  tool_type: z.string().optional().describe("Tool type"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter (mm)"),
  tool_material: z.string().optional().describe("Tool material"),
  coating: z.string().optional().describe("Tool coating"),
  flutes: z.number().int().positive().optional().describe("Flute count"),
}).passthrough();

const ai_hook_rule_match = z.object({
  tool: z.string().min(1).describe("Tool name (e.g. 'Bash', 'Write', 'Edit')"),
  params: z.record(z.string(), z.unknown()).describe("Tool parameters object"),
}).passthrough();

export const ACTION_AI_REASONING_SCHEMAS: Record<AIReasoningAction, z.ZodTypeAny> = {
  ai_route_mill_pipeline,
  ai_mill_agi_reason,
  ai_mill_awareness_query,
  ai_mill_scientific_analyze,
  ai_mill_wisdom_query,
  ai_mill_adaptive_strategy,
  pattern_record,
  pattern_query,
  pattern_reinforce,
  pattern_stats,
  iterate_retrieve,
  // U-WIRE04 fix: stub schemas for pre-existing orphan actions (no real schema, accept any params)
  sfc_drift_canary_check: z.object({}).passthrough(),
  ppg_drift_canary_check: z.object({}).passthrough(),
  sfc_fewshot_predict: z.object({}).passthrough(),
  ppg_sfc_closed_loop: z.object({}).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
  ai_explain_decision,
  ai_extract_classify,
  ai_physics_optimize,
  ai_knowledge_query,
  ai_material_lookup,
  // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
  ai_milling_deep_reason,
  ai_wedm_deep_logic,
  ai_wedm_deep_neural,
  ai_milling_synthesize,
  ai_lathe_reason,
  // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
  ai_milling_agi,
  ai_milling_twin_simulate,
  ai_wedm_master,
  ai_wedm_neural_orchestrate,
  ai_lathe_train,
  // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
  ai_wedm_advanced_neural,
  ai_wedm_agi_orchestrate,
  ai_wedm_print_to_program,
  ai_wedm_cam_knowledge,
  ai_wedm_synthesize_knowledge,
  // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
  ai_code_gate_pending,
  ai_self_mod_propose_batch,
  ai_self_mod_is_approved,
  ai_intelligence_maximize,
  ai_hook_rule_match,
  // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
  ai_lathe_orchestrate,
  ai_lathe_active_learn_select,
  ai_lathe_bayesian_fit_gp,
  ai_lathe_attention_compute,
  ai_lathe_adaptive_engagement,
  // INTEL-OLLAMA-OBSIDIAN-MS0/P5: lenient passthrough schemas — engines own
  // their own input typing; the dispatcher just forwards the params object.
  creative_solve: z.object({
    problem: z.unknown().describe("ProblemDefinition object — see PRISMCreativeReasoningEngine"),
    mode: z.enum(["conventional", "exploratory", "hybrid", "innovative", "optimal"]).optional()
      .describe("Creative reasoning mode (default: exploratory)"),
    constraints: z.unknown().optional().describe("Optional constraint set"),
  }).passthrough(),
  causal_analyze: z.object({
    edges: z.array(z.unknown()).describe("CausalEdge array to add to the graph before query"),
    target: z.string().optional().describe("Node id to find root causes of (calls rootCauses)"),
    source: z.string().optional().describe("Node id to trace impact from (calls traceImpact)"),
    maxHops: z.number().int().positive().optional().describe("Max BFS depth (default 3)"),
  }).passthrough(),
  counterfactual_predict: z.object({
    graphSpec: z.object({
      domain: z.string(),
      variables: z.array(z.unknown()),
      relations: z.array(z.unknown()),
    }).describe("CausalGraph specification consumed by createCausalGraph"),
    intervention: z.object({
      variable: z.string(),
      value: z.union([z.number(), z.string(), z.boolean()]),
    }).describe("Variable + counterfactual value for the 'what if' query"),
  }).passthrough(),
  scientific_reason: z.object({
    problem: z.string().describe("Problem statement"),
    inputs: z.record(z.string(), z.unknown()).describe("PhysicalQuantity inputs keyed by name"),
    calculationType: z.string().describe("Calculation/formula identifier"),
  }).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian belief tracking
  belief_set: z.object({
    id: z.string().min(1).describe("Belief id (unique key)"),
    distribution: z.record(z.string(), z.number().nonnegative()).describe(
      "State→probability map. Auto-normalized; need not sum to 1.",
    ),
    description: z.string().optional().describe("Human-readable description of what this belief tracks"),
  }).passthrough(),
  belief_update: z.object({
    id: z.string().min(1).describe("Existing belief id to update"),
    likelihood: z.record(z.string(), z.number().nonnegative()).describe(
      "Likelihood vector P(observation|state). States omitted default to 1.",
    ),
  }).passthrough(),
  belief_query: z.object({
    id: z.string().min(1).describe("Belief id to query"),
    topK: z.number().int().positive().optional().describe("Top-K most likely states (default 3)"),
    state: z.string().optional().describe("Specific state to return probability for"),
    includeEntropy: z.boolean().optional().describe("Include Shannon entropy in bits (default true)"),
  }).passthrough(),
  belief_list: z.object({}).passthrough().describe("No params; lists all beliefs and total count"),
  belief_delete: z.object({
    id: z.string().min(1).describe("Belief id to delete"),
  }).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — step-by-step reasoning
  cot_reason: z.object({
    problem: z.string().min(1).describe("Problem statement"),
    goal: z.string().min(1).describe("What success looks like"),
    context: z.record(z.string(), z.unknown()).optional().describe(
      "Free-form context (material, operation, etc.) — also feeds heuristics",
    ),
    constraints: z.array(z.string()).optional().describe("Hard constraints"),
    known_facts: z.array(z.string()).optional().describe("Known/given facts"),
    strategy: z.enum(["linear", "branching", "iterative", "adversarial", "analogical"])
      .optional().describe("Reasoning strategy (default: linear)"),
    max_steps: z.number().int().positive().optional().describe("Max reasoning steps (default 20)"),
    confidence_threshold: z.number().min(0).max(1).optional()
      .describe("Stop when confidence reaches this (default 0.7)"),
  }).passthrough(),
  cot_reason_tree: z.object({
    problem: z.string().min(1).describe("Problem statement"),
    goal: z.string().min(1).describe("What success looks like"),
    context: z.record(z.string(), z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    known_facts: z.array(z.string()).optional(),
    max_steps: z.number().int().positive().optional(),
    beam_width: z.number().int().positive().optional()
      .describe("Tree-of-thought beam width (default 3)"),
  }).passthrough(),
  cot_explain: z.object({
    chain: z.unknown().describe("ReasoningChain object returned by cot_reason"),
  }).passthrough(),
  cot_apply_heuristics: z.object({
    problem: z.string().optional()
      .describe("Free-form problem statement (used to keyword-match heuristics)"),
    context: z.record(z.string(), z.unknown()).optional()
      .describe("Manufacturing context (material, operation, etc.) for context-specific heuristics"),
  }).passthrough(),
  // U-WIRE24 — ActiveLearningStrategyEngine
  learning_rank: z.object({
    candidates: z.array(z.object({
      id: z.string().min(1).describe("Unique candidate id"),
      topic: z.string().min(1).describe("Human-readable topic label"),
      currentUncertainty: z.number().min(0).max(1).describe("Current uncertainty in [0,1]"),
      expectedReduction: z.number().min(0).max(1).describe("Fraction of uncertainty this target removes, in [0,1]"),
      psiImpact: z.number().finite().optional().describe("Projected Ψ delta in percentage points (optional)"),
      costMinutes: z.number().positive().describe("Estimated cost in minutes (must be > 0)"),
      tags: z.array(z.string()).optional().describe("Optional free-form tags"),
    })).min(1).describe("LearningCandidate[] to rank — must contain at least one entry"),
  }).passthrough(),
  learning_summary: z.object({
    ranked: z.array(z.object({
      id: z.string(),
      topic: z.string(),
      currentUncertainty: z.number(),
      expectedReduction: z.number(),
      costMinutes: z.number(),
      infoGain: z.number(),
      score: z.number(),
      rank: z.number(),
    }).passthrough()).min(0).describe("RankedCandidate[] from prior learning_rank call"),
  }).passthrough(),
  // U-WIRE25 — MetaLearningOptimizerEngine
  meta_learning_record: z.object({
    scenario: z.string().min(1).describe("Content type / problem class label (e.g. 'kienzle_calibration')"),
    strategy: z.string().min(1).describe("Strategy identifier (e.g. 'tribal_lookup', 'pdf_extract')"),
    success: z.boolean().describe("Did the strategy succeed?"),
    durationMs: z.number().nonnegative().finite().optional().describe("Wall-clock duration in ms (optional)"),
  }).passthrough(),
  meta_learning_recommend: z.object({
    scenario: z.string().min(1).describe("Scenario to recommend a strategy for"),
    minAttempts: z.number().int().nonnegative().optional().describe("Minimum attempts required to qualify (default 1)"),
  }).passthrough(),
  meta_learning_stats: z.object({
    scenario: z.string().min(1).describe("Scenario label"),
    strategy: z.string().min(1).describe("Strategy label"),
  }).passthrough(),
  meta_learning_list: z.object({
    mode: z.enum(["scenarios", "all"]).optional().describe("'scenarios' returns scenario names only; 'all' returns full stats matrix (default 'all')"),
  }).passthrough(),
  // U-WIRE26 — PeerLearningCoordinatorEngine
  peer_broadcast: z.object({
    fromSession: z.string().min(1).describe("Originating session id"),
    summary: z.string().min(1).describe("One-line insight summary (used for content-hash dedup)"),
    detail: z.string().optional().describe("Optional longer-form detail"),
    tags: z.array(z.string()).describe("Tags for scoped retrieval (lowercased + deduped on store)"),
    confidence: z.number().min(0).max(1).describe("Confidence in [0,1]"),
    sensitivity: z.enum(["public", "redacted", "private"]).optional()
      .describe("'private' insights are rejected; default 'public'"),
    id: z.string().optional().describe("Override insight id (default auto-generated)"),
    at: z.string().optional().describe("ISO timestamp override (default now)"),
  }).passthrough(),
  peer_query: z.object({
    excludeSessionIds: z.array(z.string()).optional().describe("Skip insights from these sessions"),
    includeAnyTag: z.array(z.string()).optional().describe("Match if insight has ANY of these tags"),
    minConfidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold"),
    limit: z.number().int().nonnegative().optional().describe("Max results (default unlimited)"),
  }).passthrough(),
  peer_get: z.object({
    id: z.string().min(1).describe("Insight id to fetch"),
  }).passthrough(),
  peer_size: z.object({}).passthrough(),
  // U-WIRE27 — NeuralIntegrationEngine
  neural_route: z.object({
    input: z.string().min(1).describe("User query / prompt string"),
    context: z.string().optional().describe("Optional surrounding context"),
    domain: z.string().optional().describe("Optional domain hint (machining, edm, lathe, ...)"),
    urgency: z.enum(["low", "medium", "high", "critical"]).optional().describe("Urgency level"),
  }).passthrough(),
  neural_recommend: z.object({
    query: z.string().min(1).describe("Query to recommend slash commands for"),
  }).passthrough(),
  neural_synthesize: z.object({
    query: z.string().min(1).describe("Query to synthesize across multiple sources"),
  }).passthrough(),
  neural_stats: z.object({}).passthrough(),
  // U-WIRE28 — CNCControllerDeepLearningEngine
  // ControllerFamily values are validated by the engine itself; the schema
  // accepts any string here so new families don't require schema updates.
  controller_select: z.object({
    operation_type: z.string().min(1).describe("Operation kind (e.g. 'roughing', 'finishing', 'thread', 'edm')"),
    axes_needed: z.number().int().positive().describe("Required number of CNC axes (3, 4, 5, ...)"),
    max_rpm_needed: z.number().int().positive().optional().describe("Required spindle RPM (optional)"),
    macro_required: z.boolean().optional().describe("Job needs macro programming (default false)"),
    conversational_preferred: z.boolean().optional().describe("Operator prefers conversational programming"),
    jm_die_only: z.boolean().optional().describe("Restrict to JM Die shop floor machines"),
  }).passthrough(),
  controller_translate: z.object({
    sourceController: z.string().min(1).describe("Source controller family (e.g. 'fanuc_31i', 'okuma_osp')"),
    targetController: z.string().min(1).describe("Target controller family"),
    code: z.string().min(1).describe("G-code body to translate"),
  }).passthrough(),
  controller_compare: z.object({
    a: z.string().min(1).describe("First controller family"),
    b: z.string().min(1).describe("Second controller family"),
  }).passthrough(),
  controller_macro: z.object({
    taskDescription: z.string().min(1).describe("Task to generate macro for (e.g. 'probe corner and set WCS')"),
    controller: z.string().min(1).describe("Controller family"),
  }).passthrough(),
  controller_debug: z.object({
    errorMessage: z.string().min(1).describe("Error / alarm message text"),
    controller: z.string().min(1).describe("Controller family that produced the error"),
  }).passthrough(),
  // U-WIRE29 — StatisticalLearningBoundsEngine
  // All bounds enforce ε,δ ∈ (0,1) STRICTLY (open interval — engine throws
  // at exactly 0 or 1, so the schema mirrors that).
  bounds_pac_complexity: z.object({
    hypothesisClassSize: z.number().min(1).describe("Size of hypothesis class |H| (≥1)"),
    epsilon: z.number().gt(0).lt(1).describe("Desired accuracy ε in (0,1) — open interval"),
    delta: z.number().gt(0).lt(1).describe("Desired confidence δ in (0,1) — open interval"),
  }).passthrough(),
  bounds_vc: z.object({
    vcDim: z.number().nonnegative().describe("VC dimension d (≥0)"),
    n: z.number().int().positive().describe("Sample size n (positive integer)"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  bounds_rademacher: z.object({
    empiricalRademacher: z.number().nonnegative().describe("Empirical Rademacher complexity R̂_n (≥0)"),
    n: z.number().int().positive().describe("Sample size n (positive integer)"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  bounds_pac_bayes: z.object({
    kl: z.number().nonnegative().describe("KL divergence KL(Q||P) (≥0)"),
    n: z.number().int().gt(1).describe("Sample size n (integer > 1; bound divides by 2(n-1))"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  // U-WIRE30 — ProactiveLearningEngine
  // The 'context' object has many optional fields; the engine validates
  // semantically. Schema accepts the documented LearningContext shape but
  // is permissive about extra fields (passthrough).
  proactive_detect: z.object({
    context: z.object({
      material: z.string().optional(),
      operation: z.string().optional(),
      machine: z.string().optional(),
      outcome: z.enum(["success", "failure", "partial"]).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
      knowledge_sources: z.array(z.object({
        source: z.string(),
        recommendation: z.string(),
        confidence: z.number(),
      })).optional(),
      prior_confidence: z.number().optional(),
      outcome_confidence: z.number().optional(),
      is_routine: z.boolean().optional(),
    }).passthrough().describe("LearningContext to scan for trigger conditions"),
  }).passthrough(),
  proactive_classify: z.object({
    trigger: z.object({
      type: z.string().describe("LearningTriggerType label"),
    }).passthrough().describe("LearningTrigger object to classify"),
  }).passthrough(),
  proactive_quality_report: z.object({}).passthrough(),
  proactive_stats: z.object({}).passthrough(),
  // U-WIRE31 — ExceptionLearningEngine
  // handleUnexpected accepts an event sans id/timestamp (engine assigns both).
  // The four `type` values map to engine analysis branches; severity gates the
  // shouldFail return (critical without prior similar success → shouldFail).
  exception_handle: z.object({
    type: z.enum(["parameter_outlier", "outcome_anomaly", "process_deviation", "measurement_spike"])
      .describe("Exception category that selects the analysis template"),
    description: z.string().min(1).describe("Human-readable description of what happened"),
    context: z.record(z.string(), z.unknown())
      .describe("Free-form contextual metadata (machine, op, material, operator, …)"),
    data: z.record(z.string(), z.union([z.number(), z.string()]))
      .describe("Numeric/string measurements; for parameter_outlier include {parameter, value} to enable envelope proposals"),
    severity: z.enum(["info", "warning", "critical"])
      .describe("'critical' triggers shouldFail unless a similar exception has previously succeeded"),
  }).passthrough(),
  exception_record_outcome: z.object({
    eventId: z.string().min(1).describe("Event id returned by exception_handle (e.g. 'EX-7'); unknown id returns null"),
    outcome: z.enum(["success", "failure", "neutral"])
      .describe("'success' generates a tribal tip and (for parameter_outlier with data.value) an envelope proposal"),
  }).passthrough(),
  exception_pending: z.object({}).passthrough(),
  exception_stats: z.object({}).passthrough(),
  // XPROC-AI-01: bridge accepts opaque process-specific request bodies; passthrough.
  cross_process_ai_classify: z.object({}).passthrough(),
  cross_process_ai_orchestrate: z.object({}).passthrough(),
  // U-XPROC-T10-PRISM-AI-WIRE — Tier 10 fusion engines.
  // Each engine performs its own Zod validation inside its static method (Cross-Process*Engine.fuse/segment/...).
  // The dispatcher schema is intentionally a passthrough so we don't duplicate the engine's strict shape checks.
  xproc_vision_fuse: z.object({}).passthrough(),
  xproc_vision_explain_attention: z.object({}).passthrough(),
  xproc_vision_constants: z.object({}).passthrough(),
  xproc_timeseries_fuse: z.object({}).passthrough(),
  xproc_timeseries_segment: z.object({}).passthrough(),
  xproc_timeseries_constants: z.object({}).passthrough(),
  xproc_audio_fuse: z.object({}).passthrough(),
  xproc_audio_chatter_score: z.object({}).passthrough(),
  xproc_audio_spectral: z.object({}).passthrough(),
  xproc_audio_constants: z.object({}).passthrough(),
  xproc_modality_dropout: z.object({}).passthrough(),
  xproc_modality_predict: z.object({}).passthrough(),
  xproc_modality_availability: z.object({}).passthrough(),
  xproc_modality_constants: z.object({}).passthrough(),
  // U-XPROC-T2-T12-PRISM-AI-WIRE — Tiers 2-9 + 11-12 fleet (124 actions across 38 engines).
  // All engines do their own Zod validation in their static methods; dispatcher schemas are passthrough.
  xproc_symbolic_project: z.object({}).passthrough(),
  xproc_symbolic_violations: z.object({}).passthrough(),
  xproc_safety_verify: z.object({}).passthrough(),
  xproc_safety_escalate: z.object({}).passthrough(),
  xproc_causal_learn_dag: z.object({}).passthrough(),
  xproc_causal_test_independence: z.object({}).passthrough(),
  xproc_causal_export_graph: z.object({}).passthrough(),
  xproc_do_identify: z.object({}).passthrough(),
  xproc_do_intervene: z.object({}).passthrough(),
  xproc_counterfactual_query: z.object({}).passthrough(),
  xproc_mediation_decompose: z.object({}).passthrough(),
  xproc_mediation_path_strength: z.object({}).passthrough(),
  xproc_active_select: z.object({}).passthrough(),
  xproc_active_rationale: z.object({}).passthrough(),
  xproc_novelty_score: z.object({}).passthrough(),
  xproc_novelty_alert: z.object({}).passthrough(),
  xproc_curiosity_propose: z.object({}).passthrough(),
  xproc_curiosity_score: z.object({}).passthrough(),
  xproc_doe_plan: z.object({}).passthrough(),
  xproc_doe_evaluate_completion: z.object({}).passthrough(),
  xproc_route_query: z.object({}).passthrough(),
  xproc_route_explain: z.object({}).passthrough(),
  xproc_orchestrate_full: z.object({}).passthrough(),
  xproc_orchestrate_brief: z.object({}).passthrough(),
  xproc_extract_rules: z.object({}).passthrough(),
  xproc_rule_explain_prediction: z.object({}).passthrough(),
  xproc_blend_predict: z.object({}).passthrough(),
  xproc_blend_weight_report: z.object({}).passthrough(),
  xproc_episodic_store: z.object({}).passthrough(),
  xproc_episodic_recall: z.object({}).passthrough(),
  xproc_episodic_stats: z.object({}).passthrough(),
  xproc_replay_add: z.object({}).passthrough(),
  xproc_replay_sample: z.object({}).passthrough(),
  xproc_replay_update_priority: z.object({}).passthrough(),
  xproc_replay_stats: z.object({}).passthrough(),
  xproc_replay_balanced_batch: z.object({}).passthrough(),
  xproc_replay_default_clusters: z.object({}).passthrough(),
  xproc_episodic_semantic_join: z.object({}).passthrough(),
  xproc_online_update: z.object({}).passthrough(),
  xproc_online_init_state: z.object({}).passthrough(),
  xproc_online_constants: z.object({}).passthrough(),
  xproc_drift_observe: z.object({}).passthrough(),
  xproc_drift_observe_batch: z.object({}).passthrough(),
  xproc_drift_history: z.object({}).passthrough(),
  xproc_drift_reset: z.object({}).passthrough(),
  xproc_drift_constants: z.object({}).passthrough(),
  xproc_shift_decide: z.object({}).passthrough(),
  xproc_shift_history: z.object({}).passthrough(),
  xproc_shift_reset: z.object({}).passthrough(),
  xproc_shift_constants: z.object({}).passthrough(),
  xproc_ewc_compute_fisher: z.object({}).passthrough(),
  xproc_ewc_reg_loss: z.object({}).passthrough(),
  xproc_ewc_consolidate: z.object({}).passthrough(),
  xproc_ewc_get_fisher: z.object({}).passthrough(),
  xproc_ewc_reset: z.object({}).passthrough(),
  xproc_ewc_constants: z.object({}).passthrough(),
  xproc_reward_shape: z.object({}).passthrough(),
  xproc_reward_audit: z.object({}).passthrough(),
  xproc_reward_default_weights: z.object({}).passthrough(),
  xproc_reward_constants: z.object({}).passthrough(),
  // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer (gated emit)
  xproc_neural_consult_speedfeed: z.object({
    record: z.record(z.string(), z.unknown()).describe("OutcomeRecord-shape input — featurized by the NN engine"),
    passThreshold: z.number().min(0).max(1).finite().optional().describe("Confidence at/above which the recommendation auto-passes (default 0.7)"),
    reviewThreshold: z.number().min(0).max(1).finite().optional().describe("Confidence at/above which the recommendation enters review band (default 0.4)"),
  }).passthrough().describe(
    "U-CN02: Consult NN before SF emit. Returns {ok, gateDecision: 'pass'|'review'|'block'|'unavailable', confidence, predictedClass, passThreshold, reviewThreshold, reason}. Calibrated confidence (post U-NN-OPT-A temperature scaling) is the operative signal.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
  xproc_kg_project_features: z.object({
    record: z.object({
      process: z.string().optional(),
      request_summary: z.record(z.string(), z.unknown()).optional(),
    }).passthrough().describe("OutcomeRecord-shape input — process + request_summary text fields are joined into the search query"),
    limit: z.number().int().min(1).max(100).optional().describe("Max KG search results to fold into features (default 10)"),
    types: z.array(z.enum([
      "knowledge_atom", "tribal_tip", "reasoning_chain", "graph_node",
      "material", "tool", "machine", "strategy",
    ])).optional().describe("Restrict search to these entity types"),
    minSimilarity: z.number().min(0).max(1).optional().describe("Drop results below this similarity threshold"),
  }).passthrough().describe(
    "U-CN05: Project an OutcomeRecord into a fixed 8-dim feature vector via KG semantic search. Returns {ok, features:number[8], dimension:8, result_count, query, warnings}.",
  ),
  xproc_kg_feature_layout: z.object({}).passthrough().describe(
    "U-CN05: Read the 8-slot feature layout schema (slot index, name, description). Useful for downstream consumers wiring this projector's output into their own feature pipelines.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
  xproc_tribal_subscribe_outcomes: z.object({}).passthrough().describe(
    "U-CN04: Subscribe TribalKnowledge bridge to FeedbackBus 'outcome.recorded'. Idempotent — alreadySubscribed=true on repeat. Successes accumulate per (process, material, operation) bucket and emit candidate tips when threshold crossed; failures signal contradictions.",
  ),
  xproc_tribal_unsubscribe_outcomes: z.object({}).passthrough().describe(
    "U-CN04: Detach the TribalKnowledge outcome subscription. Idempotent.",
  ),
  xproc_tribal_outcome_subscription_status: z.object({}).passthrough().describe(
    "U-CN04: Introspect — is the bridge subscription currently live?",
  ),
  xproc_tribal_outcome_configure: z.object({
    successThreshold: z.number().int().min(1).optional().describe("Successes-per-bucket needed before emitting a candidate tip. Default 5."),
    failureThreshold: z.number().int().min(1).optional().describe("Failures-per-bucket needed before signaling a contradiction. Default 3."),
  }).passthrough().describe(
    "U-CN04: Update bridge thresholds. Returns updated config.",
  ),
  xproc_tribal_outcome_stats: z.object({}).passthrough().describe(
    "U-CN04: Read bridge telemetry — totals, per-bucket counts, emitted tip ids, contradiction timestamps, current config, subscription status.",
  ),
  xproc_tribal_outcome_reset: z.object({}).passthrough().describe(
    "U-CN04: Reset bridge state (test-only — does NOT touch TribalKnowledgeEngine tips).",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
  xproc_drift_subscribe: z.object({}).passthrough().describe(
    "U-CN06: Subscribe drift+calibration bridge to FeedbackBus 'outcome.completed'. Each terminal outcome is fanned out to CrossProcessDriftDetectorEngine (binary-error observe), ConformalCalibrationMonitorEngine (predicted-set vs actual coverage), and CrossProcessConceptShiftHandlerEngine (gated retrain decision). Idempotent.",
  ),
  xproc_drift_unsubscribe: z.object({}).passthrough().describe(
    "U-CN06: Detach the drift/calibration outcome subscription. Idempotent.",
  ),
  xproc_drift_status: z.object({}).passthrough().describe(
    "U-CN06: Introspect — is the bridge subscription currently live?",
  ),
  xproc_drift_configure: z.object({
    errorPolicy: z.enum(["failure_only", "failure_or_override"]).optional().describe("How to derive binary error from outcome.kind. Default failure_only treats only outcome.kind='failure' as a model mistake."),
    minDriftConfidenceForRetrain: z.number().min(0).max(1).optional().describe("Minimum drift confidence to gate the concept-shift handler call. Default 0.5."),
    cooldownMs: z.number().int().nonnegative().optional().describe("Cooldown forwarded to the concept-shift handler to suppress retrain thrash. Default 60000."),
  }).passthrough().describe(
    "U-CN06: Update drift bridge config. Returns the validated effective config.",
  ),
  xproc_drift_stats: z.object({}).passthrough().describe(
    "U-CN06: Read bridge telemetry — totals (events, drift observes, calibration records, retrain decisions), per-engine failure counts, last drift report, last recovery decision, current config.",
  ),
  xproc_drift_bridge_reset: z.object({}).passthrough().describe(
    "U-CN06: Reset bridge state (test-only — does NOT touch downstream drift detector / calibration monitor / concept-shift handler state). Distinct from xproc_drift_reset which resets the underlying CrossProcessDriftDetectorEngine.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
  xproc_replay_bridge_subscribe: z.object({}).passthrough().describe(
    "U-CN07: Subscribe replay+sampler bridge to FeedbackBus 'outcome.completed'. Each terminal outcome is fanned out to CrossProcessPrioritizedReplayEngine (add with derived tdError) AND a module-private ring buffer the bridge maintains for CrossProcessExperienceReplaySamplerEngine.stratifiedBatch(). Idempotent.",
  ),
  xproc_replay_bridge_unsubscribe: z.object({}).passthrough().describe(
    "U-CN07: Detach the replay bridge outcome subscription. Idempotent.",
  ),
  xproc_replay_bridge_status: z.object({}).passthrough().describe(
    "U-CN07: Introspect — is the bridge subscription currently live?",
  ),
  xproc_replay_bridge_configure: z.object({
    errorPolicy: z.enum(["failure_only", "failure_or_override"]).optional().describe("How to derive tdError from outcome.kind. Default failure_only treats only outcome.kind='failure' as a model mistake."),
    ringCapacity: z.number().int().min(1).max(100_000).optional().describe("Maximum episodes held in the bridge's ring buffer (FIFO; oldest overwritten on overflow). Default 1000."),
  }).passthrough().describe(
    "U-CN07: Update replay bridge config. Returns the validated effective config. Shrinking ringCapacity truncates the buffer to the most-recent N episodes.",
  ),
  xproc_replay_bridge_stats: z.object({}).passthrough().describe(
    "U-CN07: Read bridge telemetry — totals (events, prioritized adds, ring adds, skips), per-engine failure counts, ring buffer size, current config.",
  ),
  xproc_replay_bridge_sample_stratified: z.object({
    n: z.number().int().nonnegative().max(100_000).describe("Batch size requested."),
    processWeights: z.record(z.string(), z.number().nonnegative()).optional().describe("Optional per-process target weight override."),
    outcomeWeights: z.record(z.string(), z.number().nonnegative()).optional().describe("Optional per-outcome target weight override."),
    materialClusters: z.record(z.string(), z.array(z.string())).optional().describe("Optional material-cluster override; defaults to ISO P/M/K/N/S clustering."),
    shuffleResult: z.boolean().optional().describe("Shuffle final batch order (default true)."),
  }).passthrough().describe(
    "U-CN07: Sample a stratified batch from the bridge's ring buffer via CrossProcessExperienceReplaySamplerEngine.stratifiedBatch.",
  ),
  xproc_replay_bridge_sample_prioritized: z.object({
    n: z.number().int().min(1).max(100_000).describe("Batch size requested."),
    beta: z.number().min(0).max(1).optional().describe("Importance-sampling correction exponent. Default 0.4."),
  }).passthrough().describe(
    "U-CN07: Sample a priority-weighted batch from the underlying CrossProcessPrioritizedReplayEngine.sample.",
  ),
  xproc_replay_bridge_reset: z.object({}).passthrough().describe(
    "U-CN07: Reset bridge state (test-only — does NOT touch downstream prioritized replay / sampler state). Distinct from xproc_replay_* actions which target the underlying engines.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
  xproc_episodic_bridge_subscribe: z.object({}).passthrough().describe(
    "U-CN08: Subscribe episodic memory bridge to FeedbackBus 'outcome.completed'. Each terminal outcome is stored as an episode in CrossProcessEpisodicMemoryEngine with derived {key, features, outcome}. Idempotent.",
  ),
  xproc_episodic_bridge_unsubscribe: z.object({}).passthrough().describe(
    "U-CN08: Detach the episodic memory bridge outcome subscription. Idempotent.",
  ),
  xproc_episodic_bridge_status: z.object({}).passthrough().describe(
    "U-CN08: Introspect — is the bridge subscription currently live?",
  ),
  xproc_episodic_bridge_configure: z.object({
    defaultDecision: z.enum(["approved", "vetoed", "override", "pending"]).optional().describe("Decision label to use when request_summary lacks an explicit decision. Default 'approved'."),
    maxFeatureCount: z.number().int().min(1).max(1000).optional().describe("Cap on numeric features extracted per event. Default 64."),
  }).passthrough().describe(
    "U-CN08: Update episodic memory bridge config. Returns the validated effective config.",
  ),
  xproc_episodic_bridge_stats: z.object({}).passthrough().describe(
    "U-CN08: Read bridge telemetry — totals (events, stored, skips), per-engine failure counts, current config.",
  ),
  xproc_episodic_bridge_reset: z.object({}).passthrough().describe(
    "U-CN08: Reset bridge state (test-only — does NOT touch downstream CrossProcessEpisodicMemoryEngine state). Distinct from xproc_episodic_* actions which target the underlying engine.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition (auto-train + all four fan-out bridges)
  xproc_autofire_activate: z.object({
    autoTrainThreshold: z.number().int().min(1).max(100_000).optional().describe("OutcomeRecords buffered before each NN retrain pass. Forwarded to CrossProcessNeuralLearningEngine.enableAutoTrain. Default 16."),
    autoTrainEpochs: z.number().int().min(1).max(1000).optional().describe("Epochs per retrain pass. Forwarded to TrainOpts.epochs."),
    autoTrainBatchSize: z.number().int().min(1).max(100_000).optional().describe("Mini-batch size per epoch. Forwarded to TrainOpts.batchSize."),
    autoTrainShuffle: z.boolean().optional().describe("Shuffle the training set each epoch. Forwarded to TrainOpts.shuffle. Default true."),
    autoTrainReplayMixRatio: z.number().min(0).max(100).optional().describe("U-CN10: experience-replay mix ratio — each retrain also pulls up to ceil(buffer*ratio) historical terminal OutcomeRecords from CrossProcessOutcomeStore (stratified by process) and concats them into the batch, so a process burst doesn't catastrophically wipe what the model learned about other processes/materials. 0 disables. Default 0.5."),
    autoTrainReplayMaxRecords: z.number().int().min(0).max(100_000).optional().describe("U-CN10: hard cap on historical records pulled per retrain. Default 256."),
    autoTrainEwcLambda: z.number().min(0).max(1_000_000).optional().describe("U-CN11: EWC penalty strength λ. >0 makes each retrain also consolidate the just-trained samples as an EWC task (diagonal Fisher → running Fisher → new anchor) so subsequent updates carry the penalty λ·F_i·(θ_i−θ*_i). Default 0 (EWC dormant on the boot path — it is the riskiest forgetting mitigation and wants operator tuning). Clamped [0, 1e6]."),
    autoTrainEwcDecay: z.number().min(0).max(1).optional().describe("U-CN11: Schwarz-EMA decay for the running Fisher (F_run ← decay·F_run + (1−decay)·F_task). Default 0.9. Clamped [0,1]."),
  }).strict().describe(
    "U-CN09/CN10/CN12: Ignite the closed-loop learning system — turns on the NN auto-train subscription (CrossProcessNeuralLearningEngine.enableAutoTrain, with experience-replay mixing) plus all five fan-out bridges (CN04 tribal, CN06 drift/calibration, CN07 replay/sampler, CN08 episodic, CN12 RL). Idempotent. Each component is activated independently; one failure never blocks the rest. Returns a per-component breakdown. Also fired at MCP-server boot behind PRISM_XPROC_AUTOFIRE.",
  ),
  xproc_autofire_deactivate: z.object({}).passthrough().describe(
    "U-CN09: Reverse only the switches this engine turned on (auto-train via disableAutoTrain; bridges via unsubscribeFromOutcomes). Components active before activate() are left untouched. Idempotent.",
  ),
  xproc_autofire_status: z.object({}).passthrough().describe(
    "U-CN09/CN12: Per-component live status {active, ownedByAutoFire} for the NN auto-train + five bridges, plus the activated-at timestamp and effective auto-train threshold.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge: outcome.completed → (state, action, reward) → 3 RL kernels
  xproc_rl_bridge_subscribe: z.object({}).passthrough().describe(
    "U-CN12: Subscribe the RL bridge to feedback-bus `outcome.completed`. Each terminal outcome is turned into a (discretised state, speed×feed action index, reward) tuple and fanned to CrossProcessQLearningTabularEngine.update, CrossProcessPolicyGradientEngine.step+commit, and CrossProcessMultiArmedBanditEngine.update. Idempotent.",
  ),
  xproc_rl_bridge_unsubscribe: z.object({}).passthrough().describe(
    "U-CN12: Detach the RL bridge's `outcome.completed` subscription. Idempotent.",
  ),
  xproc_rl_bridge_status: z.object({}).passthrough().describe(
    "U-CN12: Whether the RL bridge currently holds a live `outcome.completed` subscription.",
  ),
  xproc_rl_bridge_configure: z.object({
    applyKindPrior: z.boolean().optional().describe("Add KIND_PRIOR[kind] (success +0.5 / operator_override -0.5 / failure -1.0) on top of the CrossProcessRewardShaperEngine param-quality reward. Default true."),
  }).strict().describe(
    "U-CN12: Update RL-bridge config. Returns the validated effective config or an invalid_input error object.",
  ),
  xproc_rl_bridge_stats: z.object({}).passthrough().describe(
    "U-CN12: Read RL-bridge telemetry — totals (events, processed, skips), per-engine fan-out counts, per-engine failure counts, last extracted (state, action, armId, reward, shaperReward, kindPrior, kind) tuple, and current config.",
  ),
  xproc_rl_bridge_replay: z.object({
    limit: z.number().int().min(1).max(100_000).optional().describe("Most-recent terminal outcomes to re-process from CrossProcessOutcomeStore. Default 200, max 100000."),
    process: z.enum(["mill", "lathe", "wedm"]).optional().describe("Restrict the replay to one process."),
  }).strict().describe(
    "U-CN12: Warm-start the RL kernels by re-running the most recent historical terminal outcomes from CrossProcessOutcomeStore through the same extraction + fan-out path as the live subscription. Returns {scanned, replayed, skipped, fanned}.",
  ),
  xproc_rl_bridge_reset: z.object({}).passthrough().describe(
    "U-CN12: Reset RL-bridge state (counters, last tuple, config) and detach the subscription. Does NOT touch the downstream RL engines' state.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC (Elastic Weight Consolidation) controls on the NN learner
  xproc_neural_ewc_status: z.object({}).passthrough().describe(
    "U-CN11: Read the NN learner's EWC state — {enabled, lambda, decay, anchored, fisherDim, autoTrainLambda} plus the full autoTrainStatus(). EWC anchors old-task weights via a diagonal-Fisher penalty in the retrain (Kirkpatrick et al. 2017).",
  ),
  xproc_neural_ewc_clear: z.object({}).passthrough().describe(
    "U-CN11: Disarm EWC on the NN learner and forget the anchor + running Fisher (also resets the shared CrossProcessEWCMemoryPreservationEngine running-Fisher state). Subsequent retrains carry no EWC penalty until re-consolidated.",
  ),
  xproc_neural_ewc_consolidate: z.object({
    limit: z.number().int().min(1).max(100_000).optional().describe("Most-recent terminal outcomes to pull from CrossProcessOutcomeStore as the EWC task. Default 200, max 100000."),
    process: z.enum(["mill", "lathe", "wedm"]).optional().describe("Restrict the consolidation task to one process."),
    lambda: z.number().min(0).max(1_000_000).optional().describe("EWC penalty strength λ to arm after consolidation (0 = consolidate-and-disarm). Default 1.0. Clamped [0, 1e6]."),
    decay: z.number().min(0).max(1).optional().describe("Schwarz-EMA decay for merging into the running Fisher. Default 0.9. Clamped [0,1]."),
  }).strict().describe(
    "U-CN11: Consolidate recent historical terminal outcomes from CrossProcessOutcomeStore as an EWC task — compute the diagonal Fisher at the current weights, merge it into the running Fisher, snapshot the weights as the new anchor, and arm the penalty with strength λ. Use after the model has been trained on the data you want to protect. Returns {ok, scanned, usable, result}.",
  ),
  // XPROC-NEURAL-CONNECT-MS0/U-CN01 — domain-engine outcome publish adapter (canonical bus entry)
  xproc_outcome_publish: z.object({
    bridge: z.enum(["sf", "post", "feature", "ai", "router"]).describe("XPROC bridge identifier"),
    process: z.enum(["mill", "lathe", "wedm"]).describe("Domain process the outcome originated from"),
    request_summary: z.record(z.string(), z.unknown()).optional().describe("Categorical + numeric request features"),
    response_summary: z.record(z.string(), z.unknown()).optional().describe("Engine output summary + metrics"),
    outcome: z.object({
      kind: z.enum(["success", "failure", "operator_override", "pending"]),
      failure_mode: z.string().optional(),
      actual_metrics: z.record(z.string(), z.number().finite()).optional(),
      notes: z.string().optional(),
    }).passthrough().optional().describe("Outcome block — omit to land as kind=pending"),
    operator: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().describe(
    "U-CN01: Canonical publish path for domain engines. Wraps OutcomeStore.record() (auto-publishes outcome.recorded to FeedbackBus). Returns {ok, id, bridge, process, outcome_kind}.",
  ),
  xproc_outcome_publish_with_actuals: z.object({
    bridge: z.enum(["sf", "post", "feature", "ai", "router"]),
    process: z.enum(["mill", "lathe", "wedm"]),
    outcome_kind: z.enum(["success", "failure", "operator_override", "pending"]),
    request_summary: z.record(z.string(), z.unknown()).optional(),
    response_summary: z.record(z.string(), z.unknown()).optional(),
    actual_metrics: z.record(z.string(), z.number().finite()).optional(),
    failure_mode: z.string().optional(),
    notes: z.string().optional(),
    operator: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().describe(
    "U-CN01: One-call request+response+actuals+outcome publish. Use when domain engine has shop-floor actuals at decision time.",
  ),
  xproc_outcome_publish_failure: z.object({
    bridge: z.enum(["sf", "post", "feature", "ai", "router"]),
    process: z.enum(["mill", "lathe", "wedm"]),
    failure_mode: z.string().min(1).describe("Required non-empty failure mode (e.g. 'tool_breakage', 'chatter', 'deflection_exceeded')"),
    request_summary: z.record(z.string(), z.unknown()).optional(),
    response_summary: z.record(z.string(), z.unknown()).optional(),
    actual_metrics: z.record(z.string(), z.number().finite()).optional(),
    notes: z.string().optional(),
    operator: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().describe(
    "U-CN01: Failure shortcut — kind=failure with required failure_mode. Fail-fast gate on uninformative failures.",
  ),
  xproc_outcome_publish_override: z.object({
    bridge: z.enum(["sf", "post", "feature", "ai", "router"]),
    process: z.enum(["mill", "lathe", "wedm"]),
    override_reason: z.string().min(1).describe("Required non-empty operator override reason — tribal-knowledge tap"),
    request_summary: z.record(z.string(), z.unknown()).optional(),
    response_summary: z.record(z.string(), z.unknown()).optional(),
    actual_metrics: z.record(z.string(), z.number().finite()).optional(),
    operator_id: z.string().optional(),
    operator_skill_level: z.enum(["beginner", "intermediate", "expert"]).optional(),
    notes: z.string().optional(),
  }).passthrough().describe(
    "U-CN01: Operator-override shortcut — kind=operator_override with reason carried into operator block.",
  ),
  xproc_outcome_update: z.object({
    id: z.string().min(1).describe("Existing event id from a prior publish call"),
    kind: z.enum(["success", "failure", "operator_override", "pending"]),
    failure_mode: z.string().optional(),
    actual_metrics: z.record(z.string(), z.number().finite()).optional(),
    notes: z.string().optional(),
  }).passthrough().describe(
    "U-CN01: Pending → terminal transition. Delegates to recordOutcome (fires outcome.completed bus event when kind transitions).",
  ),
  xproc_outcome_adapter_stats: z.object({}).passthrough().describe(
    "U-CN01: Adapter telemetry — totals + by_bridge + by_process + by_outcome_kind + last_published_at.",
  ),
  xproc_outcome_adapter_reset: z.object({}).passthrough().describe(
    "U-CN01: Reset adapter counters. Test-only — does NOT touch the underlying OutcomeStore ledger.",
  ),
  xproc_policy_step: z.object({}).passthrough(),
  xproc_policy_commit: z.object({}).passthrough(),
  xproc_policy_select_action: z.object({}).passthrough(),
  xproc_policy_get_policy: z.object({}).passthrough(),
  xproc_policy_get_baseline: z.object({}).passthrough(),
  xproc_policy_configure: z.object({}).passthrough(),
  xproc_policy_reset: z.object({}).passthrough(),
  xproc_policy_stats: z.object({}).passthrough(),
  xproc_policy_constants: z.object({}).passthrough(),
  xproc_qlearn_update: z.object({}).passthrough(),
  xproc_qlearn_argmax: z.object({}).passthrough(),
  xproc_qlearn_epsilon_greedy: z.object({}).passthrough(),
  xproc_qlearn_get_q_row: z.object({}).passthrough(),
  xproc_qlearn_configure: z.object({}).passthrough(),
  xproc_qlearn_reset: z.object({}).passthrough(),
  xproc_qlearn_stats: z.object({}).passthrough(),
  xproc_qlearn_constants: z.object({}).passthrough(),
  xproc_bandit_register_arm: z.object({}).passthrough(),
  xproc_bandit_select: z.object({}).passthrough(),
  xproc_bandit_update: z.object({}).passthrough(),
  xproc_bandit_stats: z.object({}).passthrough(),
  xproc_bandit_reset: z.object({}).passthrough(),
  xproc_bandit_constants: z.object({}).passthrough(),
  xproc_bayes_predict: z.object({}).passthrough(),
  xproc_bayes_uncertainty: z.object({}).passthrough(),
  xproc_bayes_constants: z.object({}).passthrough(),
  xproc_conformal_calibrate: z.object({}).passthrough(),
  xproc_conformal_set: z.object({}).passthrough(),
  xproc_conformal_stats: z.object({}).passthrough(),
  xproc_conformal_reset: z.object({}).passthrough(),
  xproc_conformal_constants: z.object({}).passthrough(),
  xproc_conformal_classify_calibrate: z.object({
    pairs: z.array(z.object({
      probs: z.array(z.number().min(0).max(1)).min(2),
      label: z.number().int().nonnegative(),
    })).min(1).describe("Calibration (probs, label) pairs from a held-out split"),
    append: z.boolean().optional().describe("Append (default true) vs replace state"),
    numClasses: z.number().int().min(2).optional().describe("Optional explicit class-count lock"),
  }).describe("Ingest LAC calibration pairs and merge sorted nonconformity scores"),
  xproc_conformal_classify_set: z.object({
    probs: z.array(z.number().min(0).max(1)).min(2).describe("Probability simplex from the upstream classifier"),
    alpha: z.number().gt(0).lt(1).optional().describe("Miscoverage rate (default 0.1 → 90% coverage)"),
  }).describe("Return marginal-coverage prediction set {c : probs[c] >= 1 - q_hat}"),
  xproc_conformal_classify_stats: z.object({}).passthrough().describe("Snapshot of calibration set size + score distribution"),
  xproc_conformal_classify_reset: z.object({}).passthrough().describe("Wipe calibration state and unlock numClasses"),
  xproc_conformal_classify_constants: z.object({}).passthrough().describe("Read engine defaults (DEFAULT_ALPHA, MAX_NUM_CLASSES, ...)"),
  xproc_calibration_monitor_configure: z.object({
    windowSize: z.number().int().min(20).optional().describe("Rolling-window size for empirical coverage"),
    alpha: z.number().gt(0).lt(1).optional().describe("Target miscoverage rate (1-α = target coverage)"),
    driftTolerance: z.number().min(0).lt(1).optional().describe("Empirical floor before drift triggers (target − tol)"),
    consecutiveK: z.number().int().min(1).optional().describe("Consecutive below-threshold obs required to flip drift"),
  }).describe("Configure rolling-window drift monitor; resets ring iff windowSize changed"),
  xproc_calibration_monitor_record: z.object({
    predictedSet: z.array(z.number().int().nonnegative()).min(1).describe("Conformal prediction set (class labels)"),
    actualLabel: z.number().int().nonnegative().describe("Observed ground-truth class label"),
  }).describe("Record one observation; updates ring + drift run-length"),
  xproc_calibration_monitor_status: z.object({}).passthrough().describe("Snapshot {total, covered, empiricalCoverage, drifting, consecutiveBelow, ...}"),
  xproc_calibration_monitor_reset: z.object({}).passthrough().describe("Clear ring + counters; preserves config"),
  xproc_calibration_monitor_constants: z.object({}).passthrough().describe("Read defaults + bounds"),
  xproc_aps_calibrate: z.object({
    pairs: z.array(z.object({
      probs: z.array(z.number().min(0).max(1)).min(2),
      label: z.number().int().nonnegative(),
    })).min(1).describe("Calibration (probs, label) pairs from a held-out split"),
    append: z.boolean().optional().describe("Append (default true) vs replace state"),
    numClasses: z.number().int().min(2).optional().describe("Optional explicit class-count lock"),
  }).describe("Ingest APS calibration pairs and merge sorted nonconformity scores"),
  xproc_aps_set: z.object({
    probs: z.array(z.number().min(0).max(1)).min(2).describe("Probability simplex from upstream classifier"),
    alpha: z.number().gt(0).lt(1).optional().describe("Miscoverage rate (default 0.1)"),
  }).describe("Return adaptive prediction set via cumulative-mass walk to q_hat"),
  xproc_aps_stats: z.object({}).passthrough().describe("Snapshot of calibration set + score distribution"),
  xproc_aps_reset: z.object({}).passthrough().describe("Wipe calibration state and unlock numClasses"),
  xproc_aps_constants: z.object({}).passthrough().describe("Read engine defaults"),
  xproc_raps_calibrate: z.object({
    pairs: z.array(z.object({
      probs: z.array(z.number().min(0).max(1)).min(2),
      label: z.number().int().nonnegative(),
    })).min(1).describe("Calibration (probs, label) pairs"),
    append: z.boolean().optional().describe("Append (default true) vs replace state"),
    numClasses: z.number().int().min(2).optional().describe("Class-count lock"),
    lambda: z.number().min(0).optional().describe("Regularization weight λ (default 0.01); λ=0 reduces RAPS to APS"),
    kReg: z.number().int().min(1).optional().describe("Regularization rank k_reg (default 1); penalty fires for ranks > k_reg"),
  }).describe("Ingest RAPS calibration pairs under (λ, k_reg) regularization"),
  xproc_raps_set: z.object({
    probs: z.array(z.number().min(0).max(1)).min(2).describe("Probability simplex"),
    alpha: z.number().gt(0).lt(1).optional().describe("Miscoverage rate (default 0.1)"),
  }).describe("Return RAPS prediction set with rank-bounded growth"),
  xproc_raps_stats: z.object({}).passthrough().describe("Snapshot of calibration set + locked reg config"),
  xproc_raps_reset: z.object({}).passthrough().describe("Wipe state and unlock numClasses + reg"),
  xproc_raps_constants: z.object({}).passthrough().describe("Read engine defaults"),
  xproc_predlog_log: z.object({
    id: z.string().min(1).describe("Stable id (typically the OutcomeRecord id)"),
    predictedSet: z.array(z.number().int().nonnegative()).min(1).describe("Conformal prediction set"),
    replace: z.boolean().optional().describe("Overwrite existing entry (default false)"),
  }).describe("Stash a predictedSet for later pairing with the matching outcome"),
  xproc_predlog_pair: z.object({
    id: z.string().min(1),
    actualLabel: z.number().int().nonnegative().describe("Observed class label"),
    evict: z.boolean().optional().describe("Pop the entry after pairing (default true)"),
  }).describe("Pair logged prediction with actualLabel, push to CalibrationMonitor"),
  xproc_predlog_prune: z.object({
    olderThanMs: z.number().int().min(60_000).optional(),
  }).describe("TTL eviction sweep"),
  xproc_predlog_configure: z.object({
    ttlMs: z.number().int().min(60_000).optional(),
  }).describe("Re-configure the TTL"),
  xproc_predlog_status: z.object({}).passthrough().describe("Snapshot pending count + lifetime counters"),
  xproc_predlog_pending_ids: z.object({}).passthrough().describe("List pending ids (sorted)"),
  xproc_predlog_enable_autosync: z.object({
    evictAfterRecord: z.boolean().optional().describe("Evict entry after the auto-pair (default true)"),
  }).describe("Subscribe to FeedbackBus 'outcome.recorded' and auto-pair by id"),
  xproc_predlog_disable_autosync: z.object({}).passthrough().describe("Unsubscribe the auto-sync handler"),
  xproc_predlog_reset: z.object({}).passthrough().describe("Wipe all state including auto-sync"),
  xproc_predlog_constants: z.object({}).passthrough().describe("Read defaults + bounds + kind→label map"),
  xproc_mondrian_calibrate: z.object({
    pairs: z.array(z.object({
      probs: z.array(z.number().min(0).max(1)).min(2),
      label: z.number().int().nonnegative(),
    })).min(1).describe("Calibration (probs, label) pairs partitioned per-class"),
    append: z.boolean().optional().describe("Append (default true) vs replace state"),
    numClasses: z.number().int().min(2).optional().describe("Class-count lock"),
  }).describe("Ingest LAC scores into per-class buckets for class-conditional coverage"),
  xproc_mondrian_set: z.object({
    probs: z.array(z.number().min(0).max(1)).min(2).describe("Probability simplex"),
    alpha: z.number().gt(0).lt(1).optional().describe("Per-class miscoverage rate (default 0.1)"),
  }).describe("Mondrian prediction set with per-class q̂[c] thresholds; guarantees P(Y∈S|Y=c) ≥ 1−α for every class"),
  xproc_mondrian_stats: z.object({}).passthrough().describe("Per-class bucket sizes + score distribution"),
  xproc_mondrian_reset: z.object({}).passthrough().describe("Wipe all per-class buckets"),
  xproc_mondrian_constants: z.object({}).passthrough().describe("Read engine defaults"),
  xproc_ensemble_predict: z.object({}).passthrough(),
  xproc_ensemble_disagreement: z.object({}).passthrough(),
  xproc_ensemble_constants: z.object({}).passthrough(),
  xproc_calibration_score: z.object({}).passthrough(),
  xproc_calibration_recommend: z.object({}).passthrough(),
  xproc_calibration_constants: z.object({}).passthrough(),
  xproc_fed_aggregate: z.object({}).passthrough(),
  xproc_fed_round_summary: z.object({}).passthrough(),
  xproc_fed_constants: z.object({}).passthrough(),
  xproc_secure_mask: z.object({}).passthrough(),
  xproc_secure_unmask: z.object({}).passthrough(),
  xproc_secure_verify: z.object({}).passthrough(),
  xproc_secure_constants: z.object({}).passthrough(),
  xproc_fed_gate: z.object({}).passthrough(),
  xproc_fed_drift_report: z.object({}).passthrough(),
  xproc_fed_drift_constants: z.object({}).passthrough(),
  xproc_fed_select_clients: z.object({}).passthrough(),
  xproc_fed_round_plan: z.object({}).passthrough(),
  xproc_fed_scheduler_constants: z.object({}).passthrough(),
  xproc_maml_inner_loop: z.object({}).passthrough(),
  xproc_maml_meta_train: z.object({}).passthrough(),
  xproc_maml_constants: z.object({}).passthrough(),
  xproc_proto_compute: z.object({}).passthrough(),
  xproc_proto_classify: z.object({}).passthrough(),
  xproc_proto_regress: z.object({}).passthrough(),
  xproc_proto_constants: z.object({}).passthrough(),
  xproc_meta_lr_init: z.object({}).passthrough(),
  xproc_meta_lr_step: z.object({}).passthrough(),
  xproc_meta_lr_constants: z.object({}).passthrough(),
  xproc_hyper_propose: z.object({}).passthrough(),
  xproc_hyper_evaluate: z.object({}).passthrough(),
  xproc_hyper_record_outcome: z.object({}).passthrough(),
  xproc_hyper_constants: z.object({}).passthrough(),
  // U-XPROC-TIER1-PRISM-AI-WIRE — Tier 1 baseline passthrough schemas (23 actions).
  // Each engine validates its own param shape internally.
  xproc_outcome_record: z.object({}).passthrough(),
  xproc_outcome_record_outcome: z.object({}).passthrough(),
  xproc_outcome_query: z.object({}).passthrough(),
  xproc_outcome_retrieve_similar: z.object({}).passthrough(),
  xproc_outcome_stats: z.object({}).passthrough(),
  xproc_outcome_clear: z.object({}).passthrough(),
  xproc_neural_train: z.object({}).passthrough(),
  xproc_neural_predict: z.object({}).passthrough(),
  xproc_neural_evaluate: z.object({}).passthrough(),
  xproc_neural_save: z.object({}).passthrough(),
  xproc_neural_load: z.object({}).passthrough(),
  xproc_neural_metrics: z.object({}).passthrough(),
  xproc_neural_reset: z.object({}).passthrough(),
  xproc_transfer_classify: z.object({}).passthrough(),
  xproc_transfer_pairs: z.object({}).passthrough(),
  xproc_transfer_check: z.object({}).passthrough(),
  xproc_attention_explain: z.object({}).passthrough(),
  xproc_attention_ece: z.object({}).passthrough(),
  xproc_attention_baseline_add: z.object({}).passthrough(),
  xproc_attention_anomaly: z.object({}).passthrough(),
  xproc_attention_baseline_get: z.object({}).passthrough(),
  xproc_attention_baseline_reset: z.object({}).passthrough(),
  xproc_agi_compose: z.object({}).passthrough(),
  xproc_physics_features: z.object({}).passthrough(),
  xproc_physics_features_batch: z.object({}).passthrough(),
  xproc_rag_features: z.object({}).passthrough(),
  xproc_rag_clear_cache: z.object({}).passthrough(),
  xproc_feedbackbus_publish: z.object({
    topic: z.string().min(1).describe("Concrete event topic (e.g. 'outcome.recorded'); '*' rejected"),
    payload: z.unknown().optional().describe("Free-form event body delivered to subscribers"),
  }),
  xproc_feedbackbus_stats: z.object({}).passthrough().describe("Returns FeedbackBusStats snapshot (totals + per-topic counts)"),
  xproc_feedbackbus_topics: z.object({}).passthrough().describe("Returns list of active topics with at least one subscriber"),
  xproc_feedbackbus_subscriber_count: z.object({
    topic: z.string().min(1).describe("Topic to count active subscribers for (wildcard subs not counted)"),
  }),
  xproc_feedbackbus_reset: z.object({}).passthrough().describe("Clear all subscriptions and reset counters (test/admin hook)"),
  // ENGINE-WIRE-AI-MS0/U-WIRE-AI-BATCH1: 12 newly-wired AI engines
  cognitive_budget_allocate: z.object({
    kind: z.enum(["read", "edit", "create", "refactor", "review", "analysis", "chat"])
      .describe("Work kind"),
    riskLevel: z.enum(["low", "medium", "high", "critical"]).optional().describe("Risk level"),
    touchesCriticalFile: z.boolean().optional().describe("True if work touches a critical file"),
    expectedDependents: z.number().int().nonnegative().optional().describe("Expected dependent count"),
    userUrgent: z.boolean().optional().describe("Urgent — pulls toward shallow"),
    hasPreviousFailure: z.boolean().optional().describe("Repeat attempt — boost depth"),
    tokenEstimate: z.number().int().nonnegative().optional().describe("Pre-estimated token cost"),
  }).passthrough(),
  ensemble_register_member: z.object({
    member: z.unknown().describe("EnsembleMember object — see EnsembleModelSelectorEngine"),
  }).passthrough(),
  ensemble_predict: z.object({
    input: z.record(z.string(), z.number()).describe("Map of memberId → predicted value"),
    domain: z.enum(["force", "thermal", "tool_life", "surface", "chatter"]).optional()
      .describe("Optional ensemble domain"),
  }).passthrough(),
  neural_model_register: z.object({
    checkpoint: z.unknown().describe("ModelCheckpoint object"),
  }).passthrough(),
  neural_model_list: z.object({
    filter: z.unknown().optional().describe("Optional ModelFilter"),
  }).passthrough(),
  reasoning_chain_register: z.object({
    chain: z.unknown().describe("ReasoningChain object — see ReasoningChainSharingEngine"),
    createdBy: z.string().min(1).describe("Originating agent/session id"),
    domain: z.string().optional().describe("Optional manufacturing domain tag"),
    tags: z.array(z.string()).optional().describe("Optional tags for retrieval"),
  }).passthrough(),
  reasoning_chain_query: z.object({
    problem: z.string().optional().describe("Problem fragment to match"),
    minConfidence: z.number().min(0).max(1).optional().describe("Confidence floor"),
    tags: z.array(z.string()).optional().describe("Optional tag filter"),
    limit: z.number().int().positive().optional().describe("Max results"),
  }).passthrough(),
  reasoning_explain: z.object({
    chain: z.unknown().describe("ManufacturingReasoningChain to explain"),
    audience: z.enum(["machinist", "engineer", "manager", "novice"]).optional()
      .describe("Audience reading level (default: machinist)"),
    style: z.enum(["narrative", "bullet", "formal"]).optional().describe("Explanation style"),
  }).passthrough(),
  transfer_bridge_register: z.object({
    problem: z.unknown().describe("SolvedProblem object — see TransferLearningBridgeEngine"),
  }).passthrough(),
  transfer_bridge_find_analogies: z.object({
    query: z.union([z.string(), z.unknown()]).describe(
      "Query string or AnalogyQuery object",
    ),
    limit: z.number().int().positive().optional().describe("Max analogies (default 5)"),
    minScore: z.number().min(0).max(1).optional().describe("Minimum combined score (default 0.05)"),
    crossDomainOnly: z.boolean().optional().describe("Drop same-domain matches"),
  }).passthrough(),
  memory_pressure_sample: z.object({
    nowIso: z.string().optional().describe("Optional ISO timestamp; defaults to now"),
  }).passthrough(),
  memory_pressure_trend: z.object({}).passthrough().describe("No params; returns recent pressure trend"),
  // OCTOPUS-NEURAL-MS0/U-OCN04: probe-based cost-quality calibration
  // NOTE: This action's true input shape has function-typed fields (tier.invoke,
  // probe.score) which can't cross the MCP/JSON boundary. The dispatcher path
  // is reserved for in-process callers (CLI scripts that already hold the
  // engine singleton); over MCP, the schema accepts a pre-calibrated summary
  // payload for inspection-only use.
  cascade_calibrate: z.object({
    summary: z.string().optional().describe("Pre-calibrated summary payload (read-only over MCP)"),
  }).passthrough().describe("Probe-based cost-quality frontier calibration (engine API only over JSON; live invocation must come from an in-process caller with the engine singleton in scope)"),
  // OCTOPUS-NEURAL-MS0/U-OCN03: GraphRouter on scrutiny ledger — learned quorum routing
  neural_route_decision: z.object({
    change_class: z.string().min(1).describe("Coarse change class (e.g. 'engine-edit', 'safety-critical', 'test-only')"),
    file_types: z.array(z.string()).default([]).describe("File-extension or domain tags touched"),
    peer_count: z.number().int().min(0).describe("Active peer chats / agents at decision time"),
    files_count: z.number().int().min(0).optional().describe("Number of files touched (blast-radius proxy)"),
    fingerprint: z.string().optional().describe("Optional task fingerprint for cross-run NN matching"),
  }).passthrough().describe("Recommend a quorum + tentacle set for a scrutiny decision based on the ledger's learned topology (cold-start: hardcoded rules when ledger < 50 entries)"),
  // OCTOPUS-NEURAL-MS0/U-OCN02: MoA-Layer-2 aggregator over N proposer outputs
  moa_aggregate: z.object({
    proposers: z.array(z.object({
      proposer: z.string().min(1),
      ok: z.boolean(),
      verdict: z.enum(["pass", "conditional", "fail"]),
      notes: z.string(),
      confidence: z.number().min(0).max(1).optional(),
      error: z.string().optional(),
    })).min(1).describe("Proposer outputs to aggregate (typical: 3-of-3)"),
    task: z.string().optional().describe("Optional task context fed to senior aggregator"),
    senior_aggregator: z.string().optional().describe("Senior model id (traceability only — engine doesn't pick the model)"),
    max_proposer_chars: z.number().int().min(0).optional().describe("Per-proposer rationale truncation budget; default 2000, 0 unlimited"),
  }).passthrough().describe("MoA Layer-2 aggregation: distill N proposer verdicts into a single calibrated verdict + rationale + dissent + entropy"),
  // OCTOPUS-NEURAL-MS0/U-OCN01: mid-tier tentacle — Moonshot Kimi-K2 HTTP transport
  moonshot_invoke: z.object({
    prompt: z.string().min(1).describe("User prompt to send to Kimi-K2"),
    model: z.string().optional().describe("Override model id (default kimi-k2-0905-preview)"),
    api_key: z.string().optional().describe("Override MOONSHOT_API_KEY env var"),
    temperature: z.number().min(0).max(2).optional().describe("Sampling temperature in [0,2]; default 0.3"),
    max_tokens: z.number().int().positive().optional().describe("Max completion tokens; default 1024"),
    system: z.string().optional().describe("Optional system prompt prepended to the conversation"),
    timeout_ms: z.number().int().positive().optional().describe("Hard request timeout in ms; default 60000"),
    stream: z.boolean().optional().describe("Use SSE streaming for incremental token assembly"),
    retries: z.number().int().min(0).max(5).optional().describe("Retry budget for 429/5xx/network errors; default 2"),
    retry_base_delay_ms: z.number().int().min(0).optional().describe("Test-injection: base backoff delay (ms); default 250"),
  }).passthrough().describe("Invoke Moonshot Kimi-K2 via OpenAI-compat HTTP API"),
};
