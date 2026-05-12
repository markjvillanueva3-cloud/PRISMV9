/**
 * prism_ai — AI Reasoning Dispatcher
 * ====================================
 * Routes AI reasoning requests through MillMasterOrchestratorFacadeEngine.
 *
 * Actions (6):
 *   ai_route_mill_pipeline     — Full P2P pipeline orchestration
 *   ai_mill_agi_reason         — Multi-mode AGI reasoning
 *   ai_mill_awareness_query    — Query mill engine capabilities
 *   ai_mill_scientific_analyze — Physics-backed calculations
 *   ai_mill_wisdom_query       — Tribal knowledge queries
 *   ai_mill_adaptive_strategy  — Adaptive toolpath strategies
 *
 * @module tools/dispatchers/aiReasoningDispatcher
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../../schemas/aiReasoningActionSchemas.js";

// Lazy-loaded engine singletons
let _millFacade: typeof import("../../engines/MillMasterOrchestratorFacadeEngine.js").millMasterOrchestratorFacadeEngine | null = null;
let _millAwareness: typeof import("../../engines/MillAISelfAwarenessIntegrationEngine.js").millAISelfAwarenessIntegrationEngine | null = null;

// ============================================================================
// U-XPROC-T2-T12-PRISM-AI-WIRE — unified xproc routing
// All 138 xproc_* actions across 38 engines (Tiers 2-12) flow through this
// helper. Per CLAUDE.md "wire to all consumers" rule: reasoning engines belong
// on both prism_intelligence and prism_ai. The flat XPROC_ROUTES map mirrors
// the CORE_ROUTING table in intelligenceDispatcher.ts so both surfaces stay
// in lock-step. Lazy-imports cache by engine key.
// ============================================================================

type XprocEngineLoader = () => Promise<(action: string, params: Record<string, unknown>) => unknown>;

const XPROC_ROUTES: Record<string, XprocEngineLoader> = {
  // Tier 8 — Neuro-symbolic
  xproc_symbolic_project: () => import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js").then(m => m.crossProcessSymbolicEnforcer),
  xproc_symbolic_violations: () => import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js").then(m => m.crossProcessSymbolicEnforcer),
  xproc_safety_verify: () => import("../../engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.js").then(m => m.crossProcessNeuroSymbolicSafetyVerifier),
  xproc_safety_escalate: () => import("../../engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.js").then(m => m.crossProcessNeuroSymbolicSafetyVerifier),
  xproc_extract_rules: () => import("../../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js").then(m => m.crossProcessRuleExtractedNeuralInference),
  xproc_rule_explain_prediction: () => import("../../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js").then(m => m.crossProcessRuleExtractedNeuralInference),
  xproc_blend_predict: () => import("../../engines/CrossProcessFormulaNeuralEnsembleEngine.js").then(m => m.crossProcessFormulaNeuralEnsemble),
  xproc_blend_weight_report: () => import("../../engines/CrossProcessFormulaNeuralEnsembleEngine.js").then(m => m.crossProcessFormulaNeuralEnsemble),
  // Tier 9 — Causal inference
  xproc_causal_learn_dag: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_causal_test_independence: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_causal_export_graph: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_do_identify: () => import("../../engines/CrossProcessDoCalculusEngine.js").then(m => m.crossProcessDoCalculus),
  xproc_do_intervene: () => import("../../engines/CrossProcessDoCalculusEngine.js").then(m => m.crossProcessDoCalculus),
  xproc_counterfactual_query: () => import("../../engines/CrossProcessCounterfactualPredictorEngine.js").then(m => m.crossProcessCounterfactualPredictor),
  xproc_mediation_decompose: () => import("../../engines/CrossProcessMediationAnalyzerEngine.js").then(m => m.crossProcessMediationAnalyzer),
  xproc_mediation_path_strength: () => import("../../engines/CrossProcessMediationAnalyzerEngine.js").then(m => m.crossProcessMediationAnalyzer),
  // Tier 11 — Active learning & curiosity
  xproc_active_select: () => import("../../engines/CrossProcessUncertaintyDrivenSamplerEngine.js").then(m => m.crossProcessUncertaintyDrivenSampler),
  xproc_active_rationale: () => import("../../engines/CrossProcessUncertaintyDrivenSamplerEngine.js").then(m => m.crossProcessUncertaintyDrivenSampler),
  xproc_novelty_score: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
  xproc_novelty_alert: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
  xproc_curiosity_propose: () => import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js").then(m => m.crossProcessCuriosityDrivenExploration),
  xproc_curiosity_score: () => import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js").then(m => m.crossProcessCuriosityDrivenExploration),
  xproc_doe_plan: () => import("../../engines/CrossProcessBayesianDOEPlannerEngine.js").then(m => m.crossProcessBayesianDOEPlanner),
  xproc_doe_evaluate_completion: () => import("../../engines/CrossProcessBayesianDOEPlannerEngine.js").then(m => m.crossProcessBayesianDOEPlanner),
  // Tier 12 — Master orchestration
  xproc_route_query: () => import("../../engines/CrossProcessTierRouterEngine.js").then(m => m.crossProcessTierRouter),
  xproc_route_explain: () => import("../../engines/CrossProcessTierRouterEngine.js").then(m => m.crossProcessTierRouter),
  xproc_orchestrate_full: () => import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js").then(m => m.crossProcessHierarchicalNeuralOrchestrator),
  xproc_orchestrate_brief: () => import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js").then(m => m.crossProcessHierarchicalNeuralOrchestrator),
  // Tier 2 — Memory & replay
  xproc_episodic_store: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_episodic_recall: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_episodic_stats: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_replay_add: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_sample: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_update_priority: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_stats: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_balanced_batch: () => import("../../engines/CrossProcessExperienceReplaySamplerEngine.js").then(m => m.crossProcessExperienceReplaySampler),
  xproc_replay_default_clusters: () => import("../../engines/CrossProcessExperienceReplaySamplerEngine.js").then(m => m.crossProcessExperienceReplaySampler),
  xproc_episodic_semantic_join: () => import("../../engines/CrossProcessEpisodicSemanticLinkerEngine.js").then(m => m.crossProcessEpisodicSemanticLinker),
  // Tier 3 — Online learning & drift
  xproc_online_update: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_online_init_state: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_online_constants: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_drift_observe: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_observe_batch: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_history: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_reset: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_constants: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_shift_decide: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_history: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_reset: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_constants: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_ewc_compute_fisher: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_reg_loss: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_consolidate: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_get_fisher: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_reset: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_constants: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  // Tier 4 — Reinforcement learning
  xproc_reward_shape: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_audit: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_default_weights: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_constants: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
  xproc_kg_project_features: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
  xproc_kg_feature_layout: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
  xproc_tribal_subscribe_outcomes: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_unsubscribe_outcomes: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_subscription_status: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_configure: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_stats: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_reset: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
  xproc_drift_subscribe: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_unsubscribe: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_status: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_configure: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_stats: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_bridge_reset: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
  xproc_replay_bridge_subscribe: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_unsubscribe: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_status: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_configure: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_stats: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_sample_stratified: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_sample_prioritized: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_reset: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
  xproc_episodic_bridge_subscribe: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_unsubscribe: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_status: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_configure: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_stats: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_reset: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition: one idempotent call
  // turns on the NN auto-train subscription (CrossProcessNeuralLearningEngine.enableAutoTrain)
  // + all five fan-out bridges (CN04 tribal, CN06 drift/calibration, CN07 replay, CN08 episodic, CN12 RL).
  // Also invoked at MCP-server boot (index.ts) behind PRISM_XPROC_AUTOFIRE.
  xproc_autofire_activate: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  xproc_autofire_deactivate: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  xproc_autofire_status: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge: outcome.completed → (state, action,
  // reward via CrossProcessRewardShaperEngine) → QLearningTabular + PolicyGradient + MultiArmedBandit.
  xproc_rl_bridge_subscribe: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_unsubscribe: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_status: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_configure: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_stats: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_replay: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_reset: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC consolidation controls on the NN learner
  // (the auto-train EWC λ is set via xproc_autofire_activate({autoTrainEwcLambda}); these are
  // the manual status / clear / consolidate-from-store controls).
  xproc_neural_ewc_status: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  xproc_neural_ewc_clear: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  xproc_neural_ewc_consolidate: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN01 — domain-engine outcome publish adapter
  xproc_outcome_publish: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_with_actuals: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_failure: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_override: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_update: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_adapter_stats: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_adapter_reset: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_policy_step: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_commit: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_select_action: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_get_policy: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_get_baseline: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_configure: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_reset: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_stats: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_constants: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_qlearn_update: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_argmax: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_epsilon_greedy: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_get_q_row: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_configure: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_reset: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_stats: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_constants: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_bandit_register_arm: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_select: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_update: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_stats: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_reset: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_constants: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  // Tier 5 — Bayesian / uncertainty
  xproc_bayes_predict: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_bayes_uncertainty: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_bayes_constants: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_conformal_calibrate: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_set: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_stats: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_reset: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_constants: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  // U-NN-CONFORMAL01: split-conformal classification (LAC, Sadinle 2019).
  // Sibling to the regression engine — sets over discrete classes instead
  // of intervals. Wraps the cross-process NN's softmax output with
  // marginal-coverage-guaranteed prediction sets.
  xproc_conformal_classify_calibrate: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_set: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_stats: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_reset: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_constants: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  // U-NN-CONFORMAL02: rolling empirical-coverage monitor + drift detector.
  // Closes the loop on the LAC classifier — detects when production
  // distribution drift breaks the marginal-coverage assumption.
  xproc_calibration_monitor_configure: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_record: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_status: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_reset: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_constants: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  // U-NN-CONFORMAL03: APS adaptive prediction sets (Romano et al. 2020).
  // Same coverage guarantee as LAC, smaller average set on hetero data.
  xproc_aps_calibrate: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_set: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_stats: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_reset: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_constants: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  // U-NN-CONFORMAL04: RAPS regularized adaptive prediction sets
  // (Angelopoulos et al 2021). λ=0 ⇒ APS; λ>0 caps set growth past k_reg.
  xproc_raps_calibrate: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_set: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_stats: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_reset: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_constants: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  // U-NN-CONFORMAL05: prediction-log bridge — pairs predictedSet at log
  // time with actualLabel at outcome time, feeds CalibrationMonitor.
  // Closes the predictor ↔ monitor loop end-to-end.
  xproc_predlog_log: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_pair: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_prune: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_configure: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_status: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_pending_ids: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_enable_autosync: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_disable_autosync: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_reset: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_constants: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  // U-NN-MONDRIAN01: class-conditional conformal classification (Vovk 2003).
  // Per-class buckets give P(Y∈S|Y=c) ≥ 1−α for every c, not just marginal.
  xproc_mondrian_calibrate: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_set: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_stats: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_reset: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_constants: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_ensemble_predict: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_ensemble_disagreement: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_ensemble_constants: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_calibration_score: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  xproc_calibration_recommend: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  xproc_calibration_constants: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  // Tier 6 — Federated
  xproc_fed_aggregate: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_fed_round_summary: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_fed_constants: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_secure_mask: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_unmask: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_verify: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_constants: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_fed_gate: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_drift_report: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_drift_constants: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_select_clients: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  xproc_fed_round_plan: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  xproc_fed_scheduler_constants: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  // Tier 7 — Meta-learning
  xproc_maml_inner_loop: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_maml_meta_train: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_maml_constants: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_proto_compute: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_classify: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_regress: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_constants: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_meta_lr_init: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_meta_lr_step: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_meta_lr_constants: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_hyper_propose: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_evaluate: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_record_outcome: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_constants: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  // Tier 10 — Multimodal fusion (already wired by U-XPROC-T10-PRISM-AI-WIRE; included here so all xproc_* flow through one helper)
  xproc_vision_fuse: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_vision_explain_attention: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_vision_constants: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_timeseries_fuse: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_timeseries_segment: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_timeseries_constants: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_audio_fuse: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_chatter_score: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_spectral: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_constants: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_modality_dropout: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_predict: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_availability: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_constants: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
};

const _xprocCache = new Map<string, (action: string, params: Record<string, unknown>) => unknown>();

// ============================================================================
// U-XPROC-TIER1-PRISM-AI-WIRE — Tier 1 baseline (5 engines, 23 actions)
// Mirrors intelligenceDispatcher's inline xproc_outcome_*/neural_*/transfer_*/
// attention_*/agi_compose handlers. These engines export singletons (not action
// wrappers), so they need per-action dispatch. Returns raw result objects;
// the outer prism_ai dispatcher wraps in {success, data}.
// ============================================================================

type XprocTier1Handler = (params: Record<string, unknown>) => Promise<unknown>;

const XPROC_TIER1_HANDLERS: Record<string, XprocTier1Handler> = {
  // T1-01 OutcomeStore
  xproc_outcome_record: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const id = crossProcessOutcomeStore.record({
      bridge: params.bridge as Parameters<typeof crossProcessOutcomeStore.record>[0]["bridge"],
      process: params.process as Parameters<typeof crossProcessOutcomeStore.record>[0]["process"],
      request_summary: params.request_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["request_summary"],
      response_summary: params.response_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["response_summary"],
      outcome: params.outcome as Parameters<typeof crossProcessOutcomeStore.record>[0]["outcome"],
      operator: params.operator as Parameters<typeof crossProcessOutcomeStore.record>[0]["operator"],
    });
    return { id };
  },
  xproc_outcome_record_outcome: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const id = params.id as string | undefined;
    if (!id) throw new Error("xproc_outcome_record_outcome requires `id`");
    const outcome = params.outcome as Parameters<typeof crossProcessOutcomeStore.recordOutcome>[1];
    return { updated: crossProcessOutcomeStore.recordOutcome(id, outcome) };
  },
  xproc_outcome_query: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const records = crossProcessOutcomeStore.query(params as Parameters<typeof crossProcessOutcomeStore.query>[0]);
    return { count: records.length, records };
  },
  xproc_outcome_retrieve_similar: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const k = (params.k as number | undefined) ?? 5;
    const ctx = (params.context ?? params) as Parameters<typeof crossProcessOutcomeStore.retrieveSimilar>[0];
    const results = crossProcessOutcomeStore.retrieveSimilar(ctx, k);
    return { count: results.length, results };
  },
  xproc_outcome_stats: async () => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    return crossProcessOutcomeStore.stats();
  },
  xproc_outcome_clear: async () => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    crossProcessOutcomeStore.clear();
    return { cleared: true };
  },
  // T1-02 NeuralLearning
  xproc_neural_train: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const records = (params.records as Parameters<typeof crossProcessNeuralLearningEngine.train>[0]) ?? [];
    const opts = params.opts as Parameters<typeof crossProcessNeuralLearningEngine.train>[1] | undefined;
    return crossProcessNeuralLearningEngine.train(records, opts);
  },
  xproc_neural_predict: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const record = params.record as Parameters<typeof crossProcessNeuralLearningEngine.predictFromRecord>[0] | undefined;
    if (!record) throw new Error("xproc_neural_predict requires `record`");
    return crossProcessNeuralLearningEngine.predictFromRecord(record);
  },
  // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer (gated emit)
  xproc_neural_consult_speedfeed: async (params) => {
    const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
    return speedFeedOrchestratorEngine.consultNeuralPredictor(params);
  },
  xproc_neural_evaluate: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const records = (params.records as Parameters<typeof crossProcessNeuralLearningEngine.evaluate>[0]) ?? [];
    return crossProcessNeuralLearningEngine.evaluate(records);
  },
  xproc_neural_save: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const filePath = params.path as string | undefined;
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("xproc_neural_save requires `path` (non-empty string)");
    }
    crossProcessNeuralLearningEngine.saveTo(filePath);
    return { path: filePath };
  },
  xproc_neural_load: async (params) => {
    const { CrossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const filePath = params.path as string | undefined;
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("xproc_neural_load requires `path` (non-empty string)");
    }
    const loaded = CrossProcessNeuralLearningEngine.loadFrom(filePath);
    return { path: filePath, metrics: loaded.getMetrics() };
  },
  xproc_neural_metrics: async () => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    return {
      metrics: crossProcessNeuralLearningEngine.getMetrics(),
      config: crossProcessNeuralLearningEngine.getConfig(),
    };
  },
  xproc_neural_reset: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const seed = params.seed as number | undefined;
    crossProcessNeuralLearningEngine.reset(seed);
    return { seed: seed ?? null };
  },
  // T1-03 TransferLearning
  xproc_transfer_classify: async (params) => {
    const { crossProcessTransferLearningEngine } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const material = params.material as string | undefined;
    if (typeof material !== "string") throw new Error("xproc_transfer_classify requires `material` (string)");
    return { material, cluster: crossProcessTransferLearningEngine.classifyMaterial(material) };
  },
  xproc_transfer_pairs: async () => {
    const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const pairs = crossProcessTransferLearningEngine.listTransferPairs();
    return { pairs, clusters: MATERIAL_CLUSTERS, count: pairs.length };
  },
  xproc_transfer_check: async (params) => {
    const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const source = params.source as string | undefined;
    const target = params.target as string | undefined;
    if (typeof source !== "string" || typeof target !== "string") {
      throw new Error("xproc_transfer_check requires `source` and `target` cluster strings");
    }
    const validClusters = MATERIAL_CLUSTERS as readonly string[];
    const sourceCluster = validClusters.includes(source)
      ? (source as (typeof MATERIAL_CLUSTERS)[number])
      : crossProcessTransferLearningEngine.classifyMaterial(source);
    const targetCluster = validClusters.includes(target)
      ? (target as (typeof MATERIAL_CLUSTERS)[number])
      : crossProcessTransferLearningEngine.classifyMaterial(target);
    const trusted = sourceCluster && targetCluster
      ? crossProcessTransferLearningEngine.isTrustedPair(sourceCluster, targetCluster)
      : false;
    return { source, target, sourceCluster, targetCluster, trusted };
  },
  // T1-04 AttentionExplain (uses T1-02 singleton as donor model)
  xproc_attention_explain: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const record = params.record as Parameters<typeof crossProcessNeuralLearningEngine.featurize>[0] | undefined;
    if (!record) throw new Error("xproc_attention_explain requires `record`");
    const opts = params.opts as Parameters<typeof crossProcessAttentionExplainEngine.explainPrediction>[2] | undefined;
    return crossProcessAttentionExplainEngine.explainPrediction(crossProcessNeuralLearningEngine, record, opts);
  },
  xproc_attention_ece: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const records = (params.records as Parameters<typeof crossProcessAttentionExplainEngine.computeECE>[1]) ?? [];
    const numBins = params.numBins as number | undefined;
    return crossProcessAttentionExplainEngine.computeECE(crossProcessNeuralLearningEngine, records, numBins);
  },
  xproc_attention_baseline_add: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const records = (params.records as Parameters<typeof crossProcessAttentionExplainEngine.registerBaseline>[1]) ?? [];
    return crossProcessAttentionExplainEngine.registerBaseline(crossProcessNeuralLearningEngine, records);
  },
  xproc_attention_anomaly: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const record = params.record as Parameters<typeof crossProcessAttentionExplainEngine.scoreAnomaly>[1] | undefined;
    if (!record) throw new Error("xproc_attention_anomaly requires `record`");
    const threshold = params.threshold as number | undefined;
    return crossProcessAttentionExplainEngine.scoreAnomaly(crossProcessNeuralLearningEngine, record, threshold);
  },
  xproc_attention_baseline_get: async () => {
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    return crossProcessAttentionExplainEngine.getBaseline();
  },
  xproc_attention_baseline_reset: async () => {
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    crossProcessAttentionExplainEngine.resetBaseline();
    return { reset: true };
  },
  // T1-05 AGIBridge composer
  xproc_agi_compose: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAGIBridge } = await import("../../engines/CrossProcessAGIBridge.js");
    const reqParam = params.request as Parameters<typeof crossProcessAGIBridge.compose>[1] | undefined;
    if (!reqParam || typeof reqParam !== "object" || typeof reqParam.intent !== "string") {
      throw new Error("xproc_agi_compose requires `request` with `intent` (non-empty string)");
    }
    const opts = params.opts as Parameters<typeof crossProcessAGIBridge.compose>[2] | undefined;
    return crossProcessAGIBridge.compose(crossProcessNeuralLearningEngine, reqParam, opts);
  },
  // U-NN-FEAT03: PhysicsFeatureExtractorEngine — 5 physics-derived features
  xproc_physics_features: async (params) => {
    const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_INDEX } =
      await import("../../engines/PhysicsFeatureExtractorEngine.js");
    const record = params.record as Parameters<typeof PhysicsFeatureExtractorEngine.extract>[0] | undefined;
    if (!record) throw new Error("xproc_physics_features requires `record`");
    const features = PhysicsFeatureExtractorEngine.extract(record);
    return { features: Array.from(features), index: PHYSICS_FEATURE_INDEX };
  },
  xproc_physics_features_batch: async (params) => {
    const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_DIM } =
      await import("../../engines/PhysicsFeatureExtractorEngine.js");
    const records = params.records as Parameters<typeof PhysicsFeatureExtractorEngine.extractBatch>[0] | undefined;
    if (!Array.isArray(records)) throw new Error("xproc_physics_features_batch requires `records` (array)");
    const flat = PhysicsFeatureExtractorEngine.extractBatch(records);
    return { features: Array.from(flat), rows: records.length, cols: PHYSICS_FEATURE_DIM };
  },
  // U-NN-FEAT04: WikiRAGFeatureEngine — 8 RAG features from tribal knowledge
  xproc_rag_features: async (params) => {
    const { WikiRAGFeatureEngine, RAG_FEATURE_INDEX } =
      await import("../../engines/WikiRAGFeatureEngine.js");
    const record = params.record as Parameters<typeof WikiRAGFeatureEngine.extractRAGFeatures>[0] | undefined;
    if (!record) throw new Error("xproc_rag_features requires `record`");
    const features = WikiRAGFeatureEngine.extractRAGFeatures(record);
    return {
      features: Array.from(features),
      index: RAG_FEATURE_INDEX,
      cacheSize: WikiRAGFeatureEngine.cacheSize(),
      tipsLoaded: WikiRAGFeatureEngine.tipsLoaded(),
    };
  },
  xproc_rag_clear_cache: async () => {
    const { WikiRAGFeatureEngine } = await import("../../engines/WikiRAGFeatureEngine.js");
    WikiRAGFeatureEngine.clearCache();
    return { cleared: true };
  },
  // U-NN-LOOP01: FeedbackBusEngine — in-process pub/sub control plane.
  // subscribe/unsubscribe stay engine-internal (callbacks can't cross MCP).
  xproc_feedbackbus_publish: async (params) => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    const topic = params.topic;
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("xproc_feedbackbus_publish requires `topic` (non-empty string)");
    }
    if (topic === "*") {
      throw new Error("xproc_feedbackbus_publish: cannot publish to wildcard '*'");
    }
    feedbackBusEngine.publish(topic, params.payload);
    return { topic, subscriberCount: feedbackBusEngine.subscriberCount(topic) };
  },
  xproc_feedbackbus_stats: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    return { stats: feedbackBusEngine.stats() };
  },
  xproc_feedbackbus_topics: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    return { topics: feedbackBusEngine.topics() };
  },
  xproc_feedbackbus_subscriber_count: async (params) => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    const topic = params.topic;
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("xproc_feedbackbus_subscriber_count requires `topic` (non-empty string)");
    }
    return { topic, count: feedbackBusEngine.subscriberCount(topic) };
  },
  xproc_feedbackbus_reset: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    feedbackBusEngine.reset();
    return { reset: true };
  },
};

async function routeXprocAction(action: string, params: Record<string, unknown>): Promise<unknown> {
  // Tier 1: per-action handler (singleton-based engines, no uniform wrapper).
  const tier1 = XPROC_TIER1_HANDLERS[action];
  if (tier1) return tier1(params);

  // Tier 2-12: uniform wrapper-function engines, lazy-loaded + cached.
  let wrapper = _xprocCache.get(action);
  if (!wrapper) {
    const loader = XPROC_ROUTES[action];
    if (!loader) {
      throw new Error(`xproc routing has no entry for action '${action}' (prism_ai)`);
    }
    wrapper = await loader();
    _xprocCache.set(action, wrapper);
  }
  return wrapper(action, params);
}

async function getMillFacade() {
  if (!_millFacade) {
    const mod = await import("../../engines/MillMasterOrchestratorFacadeEngine.js");
    _millFacade = mod.millMasterOrchestratorFacadeEngine;
  }
  return _millFacade;
}

async function getMillAwareness() {
  if (!_millAwareness) {
    const mod = await import("../../engines/MillAISelfAwarenessIntegrationEngine.js");
    _millAwareness = mod.millAISelfAwarenessIntegrationEngine;
  }
  return _millAwareness;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(AI_REASONING_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIReasoningAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
  // validateActionParams indexes the map by action; passing a single Zod object made it always pass).
  const validation = validateActionParams(action, params, ACTION_AI_REASONING_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
  }

  try {
    let result: unknown;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // ai_route_mill_pipeline — Full P2P pipeline
      // ─────────────────────────────────────────────────────────────────────
      case "ai_route_mill_pipeline": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "print_to_program",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          features: params.features as Record<string, unknown>[] | undefined,
          geometry: params.geometry,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_agi_reason — AGI reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_agi_reason": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "agi",
          intent: params.intent as string,
          reasoning_mode: params.reasoning_mode as string | undefined,
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_awareness_query — Query capabilities
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_awareness_query": {
        const awareness = await getMillAwareness();
        const query = params.query as string;
        const category = params.category as string | undefined;
        const topK = (params.top_k as number | undefined) ?? 10;

        // Find matching engines
        const matches = awareness.findEngines(query);

        // Filter by category if specified
        const filtered = category && category !== "all"
          ? matches.filter(m => m.category === category)
          : matches;

        // Limit results
        const limited = filtered.slice(0, topK);

        result = {
          query,
          category: category ?? "all",
          matches: limited,
          total_found: filtered.length,
          registry_stats: awareness.getStats(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_scientific_analyze — Physics analysis
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_scientific_analyze": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "scientific",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          analysis_type: params.analysis_type ?? "all",
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_wisdom_query — Tribal knowledge
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_wisdom_query": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "wisdom",
          query: params.query as string,
          domain: params.domain as string | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          query: params.query,
          domain: params.domain ?? "general",
          material: params.material,
          operation: params.operation,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_adaptive_strategy — Adaptive toolpath
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_adaptive_strategy": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "adaptive",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          operation: params.operation,
          feature_type: params.feature_type,
          stock_to_leave: params.stock_to_leave,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_record — Record a success pattern
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_record": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.record({
          task_category: params.task_category as string,
          task_description: params.task_description as string,
          task_keywords: params.task_keywords as string[],
          approach_summary: params.approach_summary as string,
          mcp_actions_used: params.mcp_actions_used as string[] | undefined,
          tools_used: params.tools_used as string[] | undefined,
          engines_invoked: params.engines_invoked as string[] | undefined,
          confidence: params.confidence as "high" | "medium" | "low" | undefined,
          domain: params.domain as string | undefined,
          constraints: params.constraints as string[] | undefined,
          lineage_id: params.lineage_id as string | undefined,
          pattern_id: params.pattern_id as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_query — Query patterns
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_query": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.query({
          task_category: params.task_category as string | undefined,
          keywords: params.keywords as string[] | undefined,
          domain: params.domain as string | undefined,
          min_confidence: params.min_confidence as "high" | "medium" | "low" | undefined,
          min_success_count: params.min_success_count as number | undefined,
          limit: params.limit as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_reinforce — Reinforce a pattern (success/failure)
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_reinforce": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.reinforce({
          pattern_id: params.pattern_id as string,
          success: params.success as boolean,
          note: params.note as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_stats — Get pattern bank statistics
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_stats": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.stats();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_drift_canary_check — SFC drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_drift_canary_check": {
        const { sfcDriftCanaryEngine } = await import("../../engines/SFCDriftCanaryEngine.js");
        result = sfcDriftCanaryEngine.checkDrift(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_drift_canary_check — PPG drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_drift_canary_check": {
        const { ppgDriftCanaryEngine } = await import("../../engines/PPGDriftCanaryEngine.js");
        result = ppgDriftCanaryEngine.checkDrift(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_fewshot_predict — Few-shot material prediction
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_fewshot_predict": {
        const { sfcFewShotNewMaterialEngine } = await import("../../engines/SFCFewShotNewMaterialEngine.js");
        result = await sfcFewShotNewMaterialEngine.predictForNewMaterial(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_sfc_closed_loop — E2E closed-loop orchestration
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_sfc_closed_loop": {
        const { ppgSFCClosedLoopOrchestratorEngine } = await import("../../engines/PPGSFCClosedLoopOrchestratorEngine.js");
        result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // iterate_retrieve — progressive context refinement (DISPATCH→EVALUATE→REFINE→LOOP)
      // ──────────────────────────────────────────────────────────────────────
      case "iterate_retrieve": {
        const { iterativeRetrievalEngine } = await import("../../engines/IterativeRetrievalEngine.js");
        result = iterativeRetrievalEngine.retrieve({
          query: params.query as string,
          dispatch_target: params.dispatch_target as any,
          max_cycles: params.max_cycles as number | undefined,
          target_count: params.target_count as number | undefined,
          min_relevance: params.min_relevance as number | undefined,
          initial_keywords: params.initial_keywords as string[] | undefined,
          exclude_patterns: params.exclude_patterns as string[] | undefined,
          max_files_per_cycle: params.max_files_per_cycle as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_explain_decision": {
        const { aiDecisionExplanationEngine } = await import("../../engines/AIDecisionExplanationEngine.js");
        result = aiDecisionExplanationEngine.explainDecision(
          params as unknown as Parameters<typeof aiDecisionExplanationEngine.explainDecision>[0],
        );
        break;
      }
      case "ai_extract_classify": {
        const { aiExtractionReasoner } = await import("../../engines/AIExtractionReasonerEngine.js");
        result = await aiExtractionReasoner.classifyContent(params.content);
        break;
      }
      case "ai_physics_optimize": {
        const { aiPhysicsOptimizationEngine } = await import("../../engines/AIPhysicsOptimizationEngine.js");
        result = await aiPhysicsOptimizationEngine.optimize(
          params as unknown as Parameters<typeof aiPhysicsOptimizationEngine.optimize>[0],
        );
        break;
      }
      case "ai_knowledge_query": {
        const { aiDeepKnowledgeIntegration } = await import("../../engines/AIDeepKnowledgeIntegrationEngine.js");
        result = await aiDeepKnowledgeIntegration.query(
          params as unknown as Parameters<typeof aiDeepKnowledgeIntegration.query>[0],
        );
        break;
      }
      case "ai_material_lookup": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getMaterialParameters(params.material as string);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_deep_reason": {
        const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
        const p = params as { query: string; context: Record<string, unknown>; mode?: "analytical"|"comparative"|"diagnostic"|"predictive"|"creative" };
        result = millingDeepReasoningEngine.reason(
          p.query,
          p.context as unknown as Parameters<typeof millingDeepReasoningEngine.reason>[1],
          p.mode,
        );
        break;
      }
      case "ai_wedm_deep_logic": {
        const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
        const p = params as { query: string; context?: Record<string, unknown> };
        result = wireEDMDeepLogicEngine.reason(p.query, p.context);
        break;
      }
      case "ai_wedm_deep_neural": {
        const { wireEDMDeepNeuralReasoningEngine } = await import("../../engines/WireEDMDeepNeuralReasoningEngine.js");
        result = await wireEDMDeepNeuralReasoningEngine.reason(
          params as unknown as Parameters<typeof wireEDMDeepNeuralReasoningEngine.reason>[0],
        );
        break;
      }
      case "ai_milling_synthesize": {
        const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
        result = await millingDeepKnowledgeSynthesisEngine.synthesize(
          params as unknown as Parameters<typeof millingDeepKnowledgeSynthesisEngine.synthesize>[0],
        );
        break;
      }
      case "ai_lathe_reason": {
        const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
        result = await latheAIReasoningEngine.reason(
          params as unknown as Parameters<typeof latheAIReasoningEngine.reason>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_agi": {
        const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
        result = millingAGIOrchestrationEngine.analyzeWithAGI(
          params as unknown as Parameters<typeof millingAGIOrchestrationEngine.analyzeWithAGI>[0],
        );
        break;
      }
      case "ai_milling_twin_simulate": {
        const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
        const p = params as { duration_s: number; parameter_changes?: Record<string, unknown> };
        result = millingDigitalTwinEngine.simulate(
          p.duration_s,
          p.parameter_changes as unknown as Parameters<typeof millingDigitalTwinEngine.simulate>[1],
        );
        break;
      }
      case "ai_wedm_master": {
        const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
        result = await wireEDMMasterAIEngine.analyze(
          params as unknown as Parameters<typeof wireEDMMasterAIEngine.analyze>[0],
        );
        break;
      }
      case "ai_wedm_neural_orchestrate": {
        const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
        result = wireEDMNeuralOrchestrationEngine.orchestrate(
          params as unknown as Parameters<typeof wireEDMNeuralOrchestrationEngine.orchestrate>[0],
        );
        break;
      }
      case "ai_lathe_train": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        const p = params as { programs: Array<{ content: string; filepath: string }> };
        result = latheAITrainingEngine.trainFromPrograms(p.programs);
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
      case "ai_wedm_advanced_neural": {
        const { wireEDMAdvancedNeuralEngine } = await import("../../engines/WireEDMAdvancedNeuralEngine.js");
        const p = params as {
          material: string;
          thickness_mm: number;
          target_ra_um: number;
          target_accuracy_mm?: number;
          wire_diameter_mm?: number;
          taper_angle_deg?: number;
          machine?: string;
        };
        // Normalize flat params into WEDMFeatureVector
        const KNOWN_MATERIALS = ["D2","M2","A2","S7","H13","carbide","Ti6Al4V","Inconel_718","AL6061"];
        const matIdx = KNOWN_MATERIALS.findIndex(m => p.material.toLowerCase().includes(m.toLowerCase()));
        const matEmbedding = KNOWN_MATERIALS.map((_, i) => i === matIdx ? 1 : 0);
        const KNOWN_MACHINES = ["mitsubishi","makino","sodick","fanuc","agie","charmilles"];
        const machLower = (p.machine ?? "").toLowerCase();
        const machIdx = KNOWN_MACHINES.findIndex(m => machLower.includes(m));
        const machEmbedding = KNOWN_MACHINES.map((_, i) => i === machIdx ? 1 : 0);
        const featureVector = {
          material_embedding: matEmbedding,
          thickness_normalized: Math.min(p.thickness_mm / 150, 1),
          taper_angle_normalized: Math.min((p.taper_angle_deg ?? 0) / 30, 1),
          corner_count_normalized: 0.5,
          path_length_normalized: 0.5,
          machine_embedding: machEmbedding,
          wire_diameter_normalized: Math.min((p.wire_diameter_mm ?? 0.25) / 0.35, 1),
          target_ra_normalized: Math.min(p.target_ra_um / 10, 1),
          target_accuracy_normalized: Math.min((p.target_accuracy_mm ?? 0.005) / 0.1, 1),
        };
        result = wireEDMAdvancedNeuralEngine.predictParameters(featureVector);
        break;
      }
      case "ai_wedm_agi_orchestrate": {
        const { wireEDMAGIOrchestrator } = await import("../../engines/WireEDMAGIOrchestrator.js");
        const p = params as {
          query: string;
          material: string;
          thickness_mm: number;
          wire_diameter_mm: number;
          target_ra_um?: number;
          target_accuracy_mm?: number;
          machine?: string;
          mode?: string;
          include_counterfactuals?: boolean;
          include_causal_analysis?: boolean;
        };
        // Normalize flat params into AGIRequest shape
        const agiRequest = {
          query: p.query,
          context: {
            material: p.material,
            thickness_mm: p.thickness_mm,
            wire_diameter_mm: p.wire_diameter_mm,
            machine: p.machine,
            target_ra_um: p.target_ra_um,
            target_accuracy_mm: p.target_accuracy_mm,
          },
          mode: p.mode as Parameters<typeof wireEDMAGIOrchestrator.process>[0]["mode"],
          include_counterfactuals: p.include_counterfactuals,
          include_causal_analysis: p.include_causal_analysis,
        };
        result = wireEDMAGIOrchestrator.process(agiRequest);
        break;
      }
      case "ai_wedm_print_to_program": {
        const { wireEDMAIPrintToProgramEngine } = await import("../../engines/WireEDMAIPrintToProgramEngine.js");
        const p = params as unknown as Parameters<typeof wireEDMAIPrintToProgramEngine.generate>[0];
        result = await wireEDMAIPrintToProgramEngine.generate(p);
        break;
      }
      case "ai_wedm_cam_knowledge": {
        const { wireEDMCAMKnowledgeEngine } = await import("../../engines/WireEDMCAMKnowledgeEngine.js");
        const p = params as { query: string; category?: "toolpath" | "parameter" | "workflow" | "optimization" | "safety" };
        result = wireEDMCAMKnowledgeEngine.searchKnowledge(p.query, p.category);
        break;
      }
      case "ai_wedm_synthesize_knowledge": {
        const { wireEDMKnowledgeSynthesisEngine } = await import("../../engines/WireEDMKnowledgeSynthesisEngine.js");
        const { question, material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, confidence_threshold, max_hypotheses, ...rest } = params as {
          question: string;
          material?: string;
          thickness_mm?: number;
          wire_diameter?: string;
          target_ra_um?: number;
          machine?: string;
          urgency?: "low" | "normal" | "high" | "critical";
          confidence_threshold?: number;
          max_hypotheses?: number;
          [key: string]: unknown;
        };
        result = await wireEDMKnowledgeSynthesisEngine.synthesize({
          question,
          context: { material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, ...rest },
          confidence_threshold,
          max_hypotheses,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
      case "ai_lathe_orchestrate": {
        const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
        const p = params as {
          program: string | Record<string, unknown>;
          context?: { material?: string; machineId?: string; controller?: string; constraints?: Record<string, unknown> };
          strategy?: "full_coverage" | "fast_path" | "quality_optimized" | "cost_optimized" | "safety_first" | "learning_focused" | "adaptive";
        };
        result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
          p.program as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[0],
          (p.context ?? {}) as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[1],
          p.strategy as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[2],
        );
        break;
      }
      case "ai_lathe_active_learn_select": {
        const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
        const p = params as {
          labeled_data: unknown[];
          pool_data?: unknown[];
          n_samples?: number;
          query_strategy?: string;
          budget?: Record<string, unknown>;
        };
        latheActiveLearningEngine.initialize(
          p.labeled_data as Parameters<typeof latheActiveLearningEngine.initialize>[0],
          p.pool_data as Parameters<typeof latheActiveLearningEngine.initialize>[1],
          p.budget as Parameters<typeof latheActiveLearningEngine.initialize>[2],
        );
        result = latheActiveLearningEngine.selectSamples(
          p.pool_data as Parameters<typeof latheActiveLearningEngine.selectSamples>[0],
          p.n_samples,
          p.query_strategy as Parameters<typeof latheActiveLearningEngine.selectSamples>[2],
        );
        break;
      }
      case "ai_lathe_bayesian_fit_gp": {
        const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
        const p = params as {
          observations: Array<{ x: number[]; y: number; timestamp?: number }>;
          kernel_config: { type: string; length_scales?: number[]; signal_variance?: number; noise_variance?: number; matern_nu?: 1.5 | 2.5; alpha?: number };
        };
        const obs = p.observations.map(o => ({ x: o.x, y: o.y, timestamp: o.timestamp ?? Date.now() }));
        // Engine requires length_scales[]; broadcast a unit length-scale per input dimension if caller omitted it.
        const dim = obs[0]?.x.length ?? 1;
        const kernelConfig = {
          ...p.kernel_config,
          length_scales: p.kernel_config.length_scales ?? Array.from({ length: dim }, () => 1.0),
        };
        result = latheBayesianOptimizationEngine.fitGP(
          obs as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[0],
          kernelConfig as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[1],
        );
        break;
      }
      case "ai_lathe_attention_compute": {
        const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
        const p = params as {
          tokens: Array<{ id: number; token: string; type: string; position: number; embedding: number[]; value?: number; line_number?: number; semantic_role?: string }>;
        };
        result = latheAttentionMechanismEngine.computeManufacturingAttention(
          p.tokens as Parameters<typeof latheAttentionMechanismEngine.computeManufacturingAttention>[0],
        );
        break;
      }
      case "ai_lathe_adaptive_engagement": {
        const { latheAdaptiveMachiningEngine } = await import("../../engines/LatheAdaptiveMachiningEngine.js");
        const p = params as {
          operation_type: string;
          diameter: number;
          depth_of_cut: number;
          feed_per_rev: number;
          lead_angle: number;
          nose_radius: number;
          cutting_speed: number;
        };
        result = latheAdaptiveMachiningEngine.calculateTurningEngagement({
          operationType: p.operation_type as Parameters<typeof latheAdaptiveMachiningEngine.calculateTurningEngagement>[0]["operationType"],
          diameter: p.diameter,
          depthOfCut: p.depth_of_cut,
          feedPerRev: p.feed_per_rev,
          leadAngle: p.lead_angle,
          noseRadius: p.nose_radius,
          cuttingSpeed: p.cutting_speed,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
      case "ai_code_gate_pending": {
        const { aiGeneratedCodeApprovalGateEngine } = await import("../../engines/AIGeneratedCodeApprovalGateEngine.js");
        const p = params as { status?: string; approver?: string; request_type?: string };
        result = aiGeneratedCodeApprovalGateEngine.getPending(p as Parameters<typeof aiGeneratedCodeApprovalGateEngine.getPending>[0]);
        break;
      }
      case "ai_self_mod_propose_batch": {
        const { selfModificationProposalEngine } = await import("../../engines/SelfModificationProposalEngine.js");
        const p = params as { observations: Array<Record<string, unknown>>; at?: string };
        // Zod has already validated each observation matches the PatternObservation shape.
        result = selfModificationProposalEngine.proposeBatch(
          p.observations as unknown as Parameters<typeof selfModificationProposalEngine.proposeBatch>[0],
          p.at,
        );
        break;
      }
      case "ai_self_mod_is_approved": {
        const { selfModificationApprovalEngine } = await import("../../engines/SelfModificationApprovalEngine.js");
        const p = params as { proposal_id: string; proposal_hash: string; now_ms?: number };
        result = { approved: selfModificationApprovalEngine.isApproved(p.proposal_id, p.proposal_hash, p.now_ms) };
        break;
      }
      case "ai_intelligence_maximize": {
        const { aiIntelligenceMaximizer } = await import("../../engines/AIIntelligenceMaximizerEngine.js");
        // Zod-validated MaximizerInput; cast through unknown for structural-overlap satisfaction.
        result = await aiIntelligenceMaximizer.maximize(
          params as unknown as Parameters<typeof aiIntelligenceMaximizer.maximize>[0],
        );
        break;
      }
      case "ai_hook_rule_match": {
        const { hookRuleMatcherEngine } = await import("../../engines/HookRuleMatcherEngine.js");
        const p = params as { tool: string; params: Record<string, unknown> };
        result = hookRuleMatcherEngine.match(p.tool, p.params);
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines
      // ───────────────────────────────────────────────────────────────────────
      case "creative_solve": {
        const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
        const p = params as {
          problem: Parameters<typeof prismCreativeReasoningEngine.explore>[0];
          mode?: Parameters<typeof prismCreativeReasoningEngine.explore>[1];
        };
        result = prismCreativeReasoningEngine.explore(p.problem, p.mode);
        break;
      }
      case "causal_analyze": {
        const { CausalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        type CausalEdge = Parameters<InstanceType<typeof CausalReasoningEngine>["addEdges"]>[0][number];
        const p = params as {
          edges: ReadonlyArray<CausalEdge>;
          target?: string;
          source?: string;
          maxHops?: number;
        };
        const engine: InstanceType<typeof CausalReasoningEngine> = new CausalReasoningEngine();
        if (p.edges) engine.addEdges(p.edges);
        const out: Record<string, unknown> = {
          nodeCount: engine.nodeCount(),
          edgeCount: engine.edgeCount(),
        };
        if (p.target) out.rootCauses = engine.rootCauses(p.target, p.maxHops ?? 3);
        if (p.source) out.impact = engine.traceImpact(p.source, p.maxHops ?? 3);
        result = out;
        break;
      }
      case "counterfactual_predict": {
        const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
        type GraphVariables = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[0];
        type GraphDomain = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[1];
        const p = params as {
          // Schema declares graphSpec as { domain, variables, relations } wrapper — unpack
          // for the engine which takes (variables[], domain) directly.
          graphSpec: { domain?: GraphDomain; variables: GraphVariables; relations?: unknown[] };
          intervention: { variable: string; value: number | string | boolean };
        };
        const graph = counterfactualReasoningEngine.createCausalGraph(
          p.graphSpec.variables,
          p.graphSpec.domain ?? "machining",
        );
        const counterfactual = counterfactualReasoningEngine.generateCounterfactual(
          graph.id,
          p.intervention.variable,
          p.intervention.value,
        );
        result = { graphId: graph.id, counterfactual };
        break;
      }
      case "scientific_reason": {
        const { ScientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
        type ScientificEngineInstance = InstanceType<typeof ScientificReasoningEngine>;
        type ReasonInputs = Parameters<ScientificEngineInstance["reason"]>[1];
        const p = params as {
          problem: string;
          inputs: ReasonInputs;
          calculationType: string;
        };
        const engine: ScientificEngineInstance = new ScientificReasoningEngine();
        result = engine.reason(p.problem, p.inputs, p.calculationType);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian beliefs
      // ─────────────────────────────────────────────────────────────────────
      case "belief_set": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          distribution: Record<string, number>;
          description?: string;
        };
        const entry = beliefStateReasoningEngine.set(p.id, p.distribution, p.description);
        result = {
          id: entry.id,
          description: entry.description,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_update": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string; likelihood: Record<string, number> };
        const entry = beliefStateReasoningEngine.update(p.id, p.likelihood);
        result = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_query": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          topK?: number;
          state?: string;
          includeEntropy?: boolean;
        };
        const entry = beliefStateReasoningEngine.get(p.id);
        if (!entry) {
          return dispatcherError(`Unknown belief id: ${p.id}`, action, "prism_ai");
        }
        const out: Record<string, unknown> = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
          topK: beliefStateReasoningEngine.topK(p.id, p.topK ?? 3),
        };
        if (p.includeEntropy !== false) {
          out.entropy_bits = beliefStateReasoningEngine.entropy(p.id);
        }
        if (typeof p.state === "string" && p.state.length > 0) {
          out.probability_of_state = beliefStateReasoningEngine.probabilityOf(p.id, p.state);
        }
        result = out;
        break;
      }
      case "belief_list": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const all = beliefStateReasoningEngine.list();
        result = {
          count: beliefStateReasoningEngine.size(),
          beliefs: all.map(e => ({
            id: e.id,
            description: e.description,
            stateCount: Object.keys(e.distribution).length,
            updatedAt: e.updatedAt,
          })),
        };
        break;
      }
      case "belief_delete": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string };
        const removed = beliefStateReasoningEngine.delete(p.id);
        result = { ok: removed, id: p.id };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — step-by-step reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "cot_reason": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reason>[0];
        const p = params as unknown as ReasoningProblemArg;
        const chain = ChainOfThoughtEngine.reason(p);
        result = {
          chain_id: chain.chain_id,
          step_count: chain.steps.length,
          current_confidence: chain.current_confidence,
          dead_end_count: chain.dead_ends.length,
          final_answer: chain.final_answer ?? null,
          meta: chain.meta,
          steps: chain.steps.map(s => ({
            step_id: s.step_id,
            type: s.type,
            content: s.content,
            confidence: s.confidence,
            premises: s.premises,
          })),
        };
        break;
      }
      case "cot_reason_tree": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reasonTree>[0];
        const p = params as unknown as ReasoningProblemArg & { beam_width?: number };
        const beamWidth = typeof p.beam_width === "number" ? p.beam_width : 3;
        const tree = ChainOfThoughtEngine.reasonTree(p, beamWidth);
        result = {
          tree_id: tree.tree_id,
          best_path: tree.best_path,
          beam_width: tree.beam_width,
          explored_nodes: tree.explored_nodes,
          final_answer: tree.final_answer ?? null,
        };
        break;
      }
      case "cot_explain": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ChainArg = Parameters<typeof ChainOfThoughtEngine.explainChain>[0];
        const p = params as { chain: ChainArg };
        if (!p.chain || typeof p.chain !== "object") {
          return dispatcherError("Missing required 'chain' parameter (ReasoningChain object)", action, "prism_ai");
        }
        const explanation = ChainOfThoughtEngine.explainChain(p.chain);
        result = { explanation };
        break;
      }
      case "cot_apply_heuristics": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        const p = params as { problem?: string; context?: Record<string, unknown> };
        const problem = typeof p.problem === "string" ? p.problem : "";
        const ctx = (p.context && typeof p.context === "object") ? p.context : {};
        const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(problem, ctx);
        result = {
          problem,
          context: ctx,
          heuristics,
          count: heuristics.length,
        };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
      // ─────────────────────────────────────────────────────────────────────
      case "learning_rank": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type RankArg = Parameters<typeof activeLearningStrategyEngine.rank>[0];
        const p = params as { candidates: RankArg };
        const ranked = activeLearningStrategyEngine.rank(p.candidates);
        result = {
          count: ranked.length,
          totalInfoGain: ranked.reduce((a, r) => a + r.infoGain, 0),
          topRank: ranked[0] ?? null,
          ranked,
        };
        break;
      }
      case "learning_summary": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type SummaryArg = Parameters<typeof activeLearningStrategyEngine.summary>[0];
        const p = params as { ranked: SummaryArg };
        const summary = activeLearningStrategyEngine.summary(p.ranked);
        result = summary;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
      // The singleton holds the (scenario, strategy) → stats ledger across
      // calls; that's the whole point of this engine, so we MUST use the
      // singleton (a fresh class instance per call would have empty state).
      // ─────────────────────────────────────────────────────────────────────
      case "meta_learning_record": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        type OutcomeArg = Parameters<typeof metaLearningOptimizerEngine.record>[0];
        const p = params as unknown as OutcomeArg;
        const stats = metaLearningOptimizerEngine.record(p);
        result = { recorded: true, stats };
        break;
      }
      case "meta_learning_recommend": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; minAttempts?: number };
        const recommendation = metaLearningOptimizerEngine.recommend(
          p.scenario,
          typeof p.minAttempts === "number" ? p.minAttempts : 1,
        );
        result = { recommendation };
        break;
      }
      case "meta_learning_stats": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; strategy: string };
        const stats = metaLearningOptimizerEngine.statsFor(p.scenario, p.strategy);
        result = { stats };
        break;
      }
      case "meta_learning_list": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { mode?: "scenarios" | "all" };
        const mode = p.mode ?? "all";
        if (mode === "scenarios") {
          const scenarios = metaLearningOptimizerEngine.listScenarios();
          result = { mode, scenarios, count: scenarios.length };
        } else {
          const all = metaLearningOptimizerEngine.listAll();
          result = { mode, stats: all, count: all.length, size: metaLearningOptimizerEngine.size() };
        }
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — broker for
      // cross-session insight sharing. Singleton-only (state lives across calls).
      // ─────────────────────────────────────────────────────────────────────
      case "peer_broadcast": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type BroadcastArg = Parameters<typeof peerLearningCoordinatorEngine.broadcast>[0];
        const p = params as unknown as BroadcastArg;
        const ingestion = peerLearningCoordinatorEngine.broadcast(p);
        result = ingestion;
        break;
      }
      case "peer_query": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type QueryArg = Parameters<typeof peerLearningCoordinatorEngine.query>[0];
        const p = params as QueryArg;
        const insights = peerLearningCoordinatorEngine.query(p);
        result = { insights, count: insights.length };
        break;
      }
      case "peer_get": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        const p = params as { id: string };
        const insight = peerLearningCoordinatorEngine.get(p.id);
        result = { insight };
        break;
      }
      case "peer_size": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        result = { size: peerLearningCoordinatorEngine.size() };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE27: NeuralIntegrationEngine — neural cortex routing
      // Singleton holds learningHistory across calls (capped at 100).
      // ─────────────────────────────────────────────────────────────────────
      case "neural_route": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        type QueryArg = Parameters<typeof neuralIntegrationEngine.route>[0];
        const p = params as unknown as QueryArg;
        const route = neuralIntegrationEngine.route(p);
        result = route;
        break;
      }
      case "neural_recommend": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const recommendations = neuralIntegrationEngine.recommendCommands(p.query);
        result = { recommendations, count: recommendations.length };
        break;
      }
      case "neural_synthesize": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const synthesis = neuralIntegrationEngine.synthesize(p.query);
        result = synthesis;
        break;
      }
      case "neural_stats": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const stats = neuralIntegrationEngine.getLearningStats();
        result = stats;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE28: CNCControllerDeepLearningEngine — controller
      // knowledge: selection, dialect translation, comparison, macro gen,
      // post-debug. Pure (no I/O) — singleton OK but per-call is also fine.
      // ─────────────────────────────────────────────────────────────────────
      case "controller_select": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type ReqArg = Parameters<typeof cncControllerDeepLearning.selectControllerForJob>[0];
        const p = params as unknown as ReqArg;
        const recommendation = cncControllerDeepLearning.selectControllerForJob(p);
        result = recommendation;
        break;
      }
      case "controller_translate": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type SrcArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[0];
        type TgtArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[1];
        const p = params as { sourceController: SrcArg; targetController: TgtArg; code: string };
        const translation = cncControllerDeepLearning.translateGCode(
          p.sourceController,
          p.targetController,
          p.code,
        );
        result = translation;
        break;
      }
      case "controller_compare": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.compareControllers>[0];
        const p = params as { a: CtrlArg; b: CtrlArg };
        const comparison = cncControllerDeepLearning.compareControllers(p.a, p.b);
        result = comparison;
        break;
      }
      case "controller_macro": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.generateMacro>[1];
        const p = params as { taskDescription: string; controller: CtrlArg };
        const macro = cncControllerDeepLearning.generateMacro(p.taskDescription, p.controller);
        result = macro;
        break;
      }
      case "controller_debug": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.debugPostIssue>[1];
        const p = params as { errorMessage: string; controller: CtrlArg };
        const debug = cncControllerDeepLearning.debugPostIssue(p.errorMessage, p.controller);
        result = debug;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
      // Pure math; no state. Per-call `new` is fine (the singleton export
      // exists for callers that want a stable identity, not for state).
      // ─────────────────────────────────────────────────────────────────────
      case "bounds_pac_complexity": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacSampleComplexity>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacSampleComplexity(p);
        break;
      }
      case "bounds_vc": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.vcBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.vcBound(p);
        break;
      }
      case "bounds_rademacher": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.rademacherBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.rademacherBound(p);
        break;
      }
      case "bounds_pac_bayes": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacBayesBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacBayesBound(p);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE30: ProactiveLearningEngine — auto-trigger
      // detection + knowledge-quality monitoring. Singleton (uses event bus).
      // ─────────────────────────────────────────────────────────────────────
      case "proactive_detect": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.detectLearningTriggers>[0];
        const p = params as { context: Arg };
        const triggers = proactiveLearningEngine.detectLearningTriggers(p.context);
        result = { triggers, count: triggers.length };
        break;
      }
      case "proactive_classify": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.classifyTrigger>[0];
        const p = params as { trigger: Arg };
        const classification = proactiveLearningEngine.classifyTrigger(p.trigger);
        result = classification;
        break;
      }
      case "proactive_quality_report": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const report = proactiveLearningEngine.monitorKnowledgeQuality();
        result = report;
        break;
      }
      case "proactive_stats": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const stats = proactiveLearningEngine.getCategorizationStats();
        result = stats;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — capture, analyze,
      // and learn from unexpected events instead of failing. Singleton-only
      // (the class is not exported as a value — only the instance + types).
      // The lifecycle is: handle → record_outcome (writes), pending/stats
      // (reads). recordOutcome on a 'success' outcome additionally synthesizes
      // a tribal tip, and for parameter_outlier with data.value an envelope
      // proposal at value × 1.10.
      // ─────────────────────────────────────────────────────────────────────
      case "exception_handle": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        type Arg = Parameters<typeof exceptionLearningEngine.handleUnexpected>[0];
        // Schema-validated upstream; cast to the engine's omit shape.
        const response = exceptionLearningEngine.handleUnexpected(params as Arg);
        result = response;
        break;
      }
      case "exception_record_outcome": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const p = params as { eventId: string; outcome: "success" | "failure" | "neutral" };
        const learned = exceptionLearningEngine.recordOutcome(p.eventId, p.outcome);
        // Engine returns null when eventId is unknown; surface explicitly so
        // the dispatcher result discriminates 'unknown event' from 'recorded'.
        result = learned === null
          ? { learned: null, recorded: false, reason: `Unknown eventId: ${p.eventId}` }
          : { learned, recorded: true };
        break;
      }
      case "exception_pending": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const pending = exceptionLearningEngine.getPendingExceptions();
        result = { events: pending, count: pending.length };
        break;
      }
      case "exception_stats": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        result = exceptionLearningEngine.getStatistics();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // U-XPROC-T2-T12-PRISM-AI-WIRE — XPROC-NEURAL fleet (Tiers 2-12, 38 engines, 138 actions)
      // All xproc_* actions flow through the unified routeXprocAction helper above.
      // CORE_ROUTING table mirrors intelligenceDispatcher.ts so both surfaces stay in lock-step.
      // Engines validate their own params via internal Zod schemas; the wrapper functions
      // dispatch by action name with no extra normalization.
      // ─────────────────────────────────────────────────────────────────────
      case "xproc_symbolic_project":
      case "xproc_symbolic_violations":
      case "xproc_safety_verify":
      case "xproc_safety_escalate":
      case "xproc_extract_rules":
      case "xproc_rule_explain_prediction":
      case "xproc_blend_predict":
      case "xproc_blend_weight_report":
      case "xproc_causal_learn_dag":
      case "xproc_causal_test_independence":
      case "xproc_causal_export_graph":
      case "xproc_do_identify":
      case "xproc_do_intervene":
      case "xproc_counterfactual_query":
      case "xproc_mediation_decompose":
      case "xproc_mediation_path_strength":
      case "xproc_active_select":
      case "xproc_active_rationale":
      case "xproc_novelty_score":
      case "xproc_novelty_alert":
      case "xproc_curiosity_propose":
      case "xproc_curiosity_score":
      case "xproc_doe_plan":
      case "xproc_doe_evaluate_completion":
      case "xproc_route_query":
      case "xproc_route_explain":
      case "xproc_orchestrate_full":
      case "xproc_orchestrate_brief":
      case "xproc_episodic_store":
      case "xproc_episodic_recall":
      case "xproc_episodic_stats":
      case "xproc_replay_add":
      case "xproc_replay_sample":
      case "xproc_replay_update_priority":
      case "xproc_replay_stats":
      case "xproc_replay_balanced_batch":
      case "xproc_replay_default_clusters":
      case "xproc_episodic_semantic_join":
      case "xproc_online_update":
      case "xproc_online_init_state":
      case "xproc_online_constants":
      case "xproc_drift_observe":
      case "xproc_drift_observe_batch":
      case "xproc_drift_history":
      case "xproc_drift_reset":
      case "xproc_drift_constants":
      case "xproc_shift_decide":
      case "xproc_shift_history":
      case "xproc_shift_reset":
      case "xproc_shift_constants":
      case "xproc_ewc_compute_fisher":
      case "xproc_ewc_reg_loss":
      case "xproc_ewc_consolidate":
      case "xproc_ewc_get_fisher":
      case "xproc_ewc_reset":
      case "xproc_ewc_constants":
      case "xproc_reward_shape":
      case "xproc_reward_audit":
      case "xproc_reward_default_weights":
      case "xproc_reward_constants":
      // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer
      case "xproc_neural_consult_speedfeed":
      // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
      case "xproc_kg_project_features":
      case "xproc_kg_feature_layout":
      // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
      case "xproc_tribal_subscribe_outcomes":
      case "xproc_tribal_unsubscribe_outcomes":
      case "xproc_tribal_outcome_subscription_status":
      case "xproc_tribal_outcome_configure":
      case "xproc_tribal_outcome_stats":
      case "xproc_tribal_outcome_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
      // (xproc_drift_bridge_reset is namespaced to avoid collision with the
      // pre-existing CrossProcessDriftDetectorEngine xproc_drift_reset action.)
      case "xproc_drift_subscribe":
      case "xproc_drift_unsubscribe":
      case "xproc_drift_status":
      case "xproc_drift_configure":
      case "xproc_drift_stats":
      case "xproc_drift_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
      // (all bridge_* actions namespaced to avoid colliding with the pre-existing
      // xproc_replay_{add,sample,update_priority,stats,balanced_batch,
      // default_clusters} actions on the underlying engines.)
      case "xproc_replay_bridge_subscribe":
      case "xproc_replay_bridge_unsubscribe":
      case "xproc_replay_bridge_status":
      case "xproc_replay_bridge_configure":
      case "xproc_replay_bridge_stats":
      case "xproc_replay_bridge_sample_stratified":
      case "xproc_replay_bridge_sample_prioritized":
      case "xproc_replay_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
      // (all bridge_* actions namespaced to avoid colliding with the pre-existing
      // xproc_episodic_{store,recall,stats,semantic_join} actions on
      // CrossProcessEpisodicMemoryEngine.)
      case "xproc_episodic_bridge_subscribe":
      case "xproc_episodic_bridge_unsubscribe":
      case "xproc_episodic_bridge_status":
      case "xproc_episodic_bridge_configure":
      case "xproc_episodic_bridge_stats":
      case "xproc_episodic_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition (auto-train + all fan-out bridges)
      case "xproc_autofire_activate":
      case "xproc_autofire_deactivate":
      case "xproc_autofire_status":
      // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge (Q-learning + policy-gradient + bandit)
      case "xproc_rl_bridge_subscribe":
      case "xproc_rl_bridge_unsubscribe":
      case "xproc_rl_bridge_status":
      case "xproc_rl_bridge_configure":
      case "xproc_rl_bridge_stats":
      case "xproc_rl_bridge_replay":
      case "xproc_rl_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC consolidation controls
      case "xproc_neural_ewc_status":
      case "xproc_neural_ewc_clear":
      case "xproc_neural_ewc_consolidate":
      // XPROC-NEURAL-CONNECT-MS0/U-CN01 — outcome publish adapter
      case "xproc_outcome_publish":
      case "xproc_outcome_publish_with_actuals":
      case "xproc_outcome_publish_failure":
      case "xproc_outcome_publish_override":
      case "xproc_outcome_update":
      case "xproc_outcome_adapter_stats":
      case "xproc_outcome_adapter_reset":
      case "xproc_policy_step":
      case "xproc_policy_commit":
      case "xproc_policy_select_action":
      case "xproc_policy_get_policy":
      case "xproc_policy_get_baseline":
      case "xproc_policy_configure":
      case "xproc_policy_reset":
      case "xproc_policy_stats":
      case "xproc_policy_constants":
      case "xproc_qlearn_update":
      case "xproc_qlearn_argmax":
      case "xproc_qlearn_epsilon_greedy":
      case "xproc_qlearn_get_q_row":
      case "xproc_qlearn_configure":
      case "xproc_qlearn_reset":
      case "xproc_qlearn_stats":
      case "xproc_qlearn_constants":
      case "xproc_bandit_register_arm":
      case "xproc_bandit_select":
      case "xproc_bandit_update":
      case "xproc_bandit_stats":
      case "xproc_bandit_reset":
      case "xproc_bandit_constants":
      case "xproc_bayes_predict":
      case "xproc_bayes_uncertainty":
      case "xproc_bayes_constants":
      case "xproc_conformal_calibrate":
      case "xproc_conformal_set":
      case "xproc_conformal_stats":
      case "xproc_conformal_reset":
      case "xproc_conformal_constants":
      case "xproc_conformal_classify_calibrate":
      case "xproc_conformal_classify_set":
      case "xproc_conformal_classify_stats":
      case "xproc_conformal_classify_reset":
      case "xproc_conformal_classify_constants":
      case "xproc_calibration_monitor_configure":
      case "xproc_calibration_monitor_record":
      case "xproc_calibration_monitor_status":
      case "xproc_calibration_monitor_reset":
      case "xproc_calibration_monitor_constants":
      case "xproc_aps_calibrate":
      case "xproc_aps_set":
      case "xproc_aps_stats":
      case "xproc_aps_reset":
      case "xproc_aps_constants":
      case "xproc_raps_calibrate":
      case "xproc_raps_set":
      case "xproc_raps_stats":
      case "xproc_raps_reset":
      case "xproc_raps_constants":
      case "xproc_predlog_log":
      case "xproc_predlog_pair":
      case "xproc_predlog_prune":
      case "xproc_predlog_configure":
      case "xproc_predlog_status":
      case "xproc_predlog_pending_ids":
      case "xproc_predlog_enable_autosync":
      case "xproc_predlog_disable_autosync":
      case "xproc_predlog_reset":
      case "xproc_predlog_constants":
      case "xproc_mondrian_calibrate":
      case "xproc_mondrian_set":
      case "xproc_mondrian_stats":
      case "xproc_mondrian_reset":
      case "xproc_mondrian_constants":
      case "xproc_ensemble_predict":
      case "xproc_ensemble_disagreement":
      case "xproc_ensemble_constants":
      case "xproc_calibration_score":
      case "xproc_calibration_recommend":
      case "xproc_calibration_constants":
      case "xproc_fed_aggregate":
      case "xproc_fed_round_summary":
      case "xproc_fed_constants":
      case "xproc_secure_mask":
      case "xproc_secure_unmask":
      case "xproc_secure_verify":
      case "xproc_secure_constants":
      case "xproc_fed_gate":
      case "xproc_fed_drift_report":
      case "xproc_fed_drift_constants":
      case "xproc_fed_select_clients":
      case "xproc_fed_round_plan":
      case "xproc_fed_scheduler_constants":
      case "xproc_maml_inner_loop":
      case "xproc_maml_meta_train":
      case "xproc_maml_constants":
      case "xproc_proto_compute":
      case "xproc_proto_classify":
      case "xproc_proto_regress":
      case "xproc_proto_constants":
      case "xproc_meta_lr_init":
      case "xproc_meta_lr_step":
      case "xproc_meta_lr_constants":
      case "xproc_hyper_propose":
      case "xproc_hyper_evaluate":
      case "xproc_hyper_record_outcome":
      case "xproc_hyper_constants":
      case "xproc_vision_fuse":
      case "xproc_vision_explain_attention":
      case "xproc_vision_constants":
      case "xproc_timeseries_fuse":
      case "xproc_timeseries_segment":
      case "xproc_timeseries_constants":
      case "xproc_audio_fuse":
      case "xproc_audio_chatter_score":
      case "xproc_audio_spectral":
      case "xproc_audio_constants":
      case "xproc_modality_dropout":
      case "xproc_modality_predict":
      case "xproc_modality_availability":
      case "xproc_modality_constants":
      // U-XPROC-TIER1-PRISM-AI-WIRE — 23 Tier 1 actions (5 baseline engines)
      case "xproc_outcome_record":
      case "xproc_outcome_record_outcome":
      case "xproc_outcome_query":
      case "xproc_outcome_retrieve_similar":
      case "xproc_outcome_stats":
      case "xproc_outcome_clear":
      case "xproc_neural_train":
      case "xproc_neural_predict":
      case "xproc_neural_evaluate":
      case "xproc_neural_save":
      case "xproc_neural_load":
      case "xproc_neural_metrics":
      case "xproc_neural_reset":
      case "xproc_transfer_classify":
      case "xproc_transfer_pairs":
      case "xproc_transfer_check":
      case "xproc_attention_explain":
      case "xproc_attention_ece":
      case "xproc_attention_baseline_add":
      case "xproc_attention_anomaly":
      case "xproc_attention_baseline_get":
      case "xproc_attention_baseline_reset":
      case "xproc_agi_compose":
      case "xproc_physics_features":
      case "xproc_physics_features_batch":
      case "xproc_rag_features":
      case "xproc_rag_clear_cache":
      case "xproc_feedbackbus_publish":
      case "xproc_feedbackbus_stats":
      case "xproc_feedbackbus_topics":
      case "xproc_feedbackbus_subscriber_count":
      case "xproc_feedbackbus_reset": {
        result = await routeXprocAction(action, params);
        break;
      }

      // ── XPROC-AI-01: Cross-Process AI Bridge (separate from xproc_* fleet) ──
      case "cross_process_ai_classify": {
        const { CrossProcessAIBridge } = await import(
          "../../engines/CrossProcessAIBridge.js"
        );
        const intent = params.intent as string | undefined;
        if (typeof intent !== "string") {
          return dispatcherError(
            "cross_process_ai_classify requires `intent` (non-empty string)",
            action,
            "prism_ai",
          );
        }
        const context = {
          process: params.process as ("mill" | "lathe" | "wedm") | undefined,
          features: params.features as string[] | undefined,
          material: params.material as string | undefined,
        };
        result = CrossProcessAIBridge.classify(intent, context);
        break;
      }
      case "cross_process_ai_orchestrate": {
        const { CrossProcessAIBridge } = await import(
          "../../engines/CrossProcessAIBridge.js"
        );
        const intent = params.intent as string | undefined;
        if (typeof intent !== "string") {
          return dispatcherError(
            "cross_process_ai_orchestrate requires `intent` (non-empty string)",
            action,
            "prism_ai",
          );
        }
        result = await CrossProcessAIBridge.orchestrate({
          intent,
          process: params.process as ("mill" | "lathe" | "wedm") | undefined,
          features: params.features as string[] | undefined,
          material: params.material as string | undefined,
          mill_request: params.mill_request as Record<string, unknown> | undefined,
          lathe_request: params.lathe_request as Record<string, unknown> | undefined,
          wedm_request: params.wedm_request as Record<string, unknown> | undefined,
          dry_run: params.dry_run as boolean | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-AI-MS0/U-WIRE-AI-BATCH1: 12 unwired AI engines
      // ─────────────────────────────────────────────────────────────────────
      case "cognitive_budget_allocate": {
        const { cognitiveBudgetAllocatorEngine } = await import("../../engines/CognitiveBudgetAllocatorEngine.js");
        result = cognitiveBudgetAllocatorEngine.allocate(
          params as unknown as Parameters<typeof cognitiveBudgetAllocatorEngine.allocate>[0],
        );
        break;
      }
      case "ensemble_register_member": {
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        const p = params as { member: Parameters<typeof ensembleModelSelectorEngine.registerMember>[0] };
        ensembleModelSelectorEngine.registerMember(p.member);
        result = { registered: true, total_members: ensembleModelSelectorEngine.getAllPerformances().length };
        break;
      }
      case "ensemble_predict": {
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        const p = params as { input: Record<string, number>; domain?: "force" | "thermal" | "tool_life" | "surface" | "chatter" };
        const memberMap = new Map<string, number>(Object.entries(p.input ?? {}));
        result = ensembleModelSelectorEngine.predict(memberMap, p.domain);
        break;
      }
      case "neural_model_register": {
        const { neuralModelRegistryEngine } = await import("../../engines/NeuralModelRegistryEngine.js");
        const p = params as { checkpoint: Parameters<typeof neuralModelRegistryEngine.registerModel>[0] };
        result = await neuralModelRegistryEngine.registerModel(p.checkpoint);
        break;
      }
      case "neural_model_list": {
        const { neuralModelRegistryEngine } = await import("../../engines/NeuralModelRegistryEngine.js");
        const p = params as { filter?: Parameters<typeof neuralModelRegistryEngine.listModels>[0] };
        result = neuralModelRegistryEngine.listModels(p.filter);
        break;
      }
      case "reasoning_chain_register": {
        const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
        const p = params as { chain: Parameters<typeof reasoningChainSharingEngine.registerChain>[0]; createdBy: string; domain?: string; tags?: string[] };
        result = reasoningChainSharingEngine.registerChain(p.chain, p.createdBy, p.domain, p.tags);
        break;
      }
      case "reasoning_chain_query": {
        const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
        result = reasoningChainSharingEngine.queryChains(
          params as unknown as Parameters<typeof reasoningChainSharingEngine.queryChains>[0],
        );
        break;
      }
      case "reasoning_explain": {
        const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
        result = reasoningExplainerEngine.explain(
          params as unknown as Parameters<typeof reasoningExplainerEngine.explain>[0],
        );
        break;
      }
      case "transfer_bridge_register": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        const p = params as { problem: Parameters<typeof transferLearningBridgeEngine.register>[0] };
        transferLearningBridgeEngine.register(p.problem);
        result = { registered: true, total: transferLearningBridgeEngine.size() };
        break;
      }
      case "transfer_bridge_find_analogies": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        const p = params as { query: string | Record<string, unknown>; limit?: number; minScore?: number; crossDomainOnly?: boolean };
        result = transferLearningBridgeEngine.findAnalogies(
          p.query as never,
          { limit: p.limit, minScore: p.minScore, crossDomainOnly: p.crossDomainOnly },
        );
        break;
      }
      case "memory_pressure_sample": {
        const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
        const p = params as { nowIso?: string };
        result = memoryPressureMonitorEngine.sampleNow(p.nowIso);
        break;
      }
      case "memory_pressure_trend": {
        const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
        result = memoryPressureMonitorEngine.trend();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN01: moonshot_invoke — mid-tier Kimi-K2 tentacle
      // ─────────────────────────────────────────────────────────────────────
      case "moonshot_invoke": {
        const { moonshotClientEngine } = await import("../../engines/MoonshotClientEngine.js");
        result = await moonshotClientEngine.exec({
          prompt: params.prompt as string,
          model: params.model as string | undefined,
          apiKey: params.api_key as string | undefined,
          temperature: params.temperature as number | undefined,
          maxTokens: params.max_tokens as number | undefined,
          system: params.system as string | undefined,
          timeoutMs: params.timeout_ms as number | undefined,
          stream: params.stream as boolean | undefined,
          retries: params.retries as number | undefined,
          retryBaseDelayMs: params.retry_base_delay_ms as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN04: cascade_calibrate — read-only over MCP
      // The live invocation path requires function-typed inputs (tier.invoke,
      // probe.score) which can't cross JSON; over MCP this action returns an
      // explicit ok:false error so naive callers DO NOT silently believe their
      // calibration ran. In-process callers (scripts, other engines) must
      // import cascadeCalibrationEngine directly.
      // (Reviewer P2#3: previously returned ok:true with an instructional
      // message, which is the worst kind of silent skip.)
      // ─────────────────────────────────────────────────────────────────────
      case "cascade_calibrate": {
        result = {
          ok: false,
          error: "cascade_calibrate cannot run over MCP: tier.invoke and probe.score are function-typed inputs that don't survive JSON serialization. The calibration did NOT run.",
          in_process_api: "import { cascadeCalibrationEngine } from 'mcp-server/src/engines/CascadeCalibrationEngine.js'; await cascadeCalibrationEngine.calibrate({ tiers, probes, ... })",
          cli: "scripts/cascade-calibrate.mjs (writes state/shared/cascade-thresholds.json) — to be added in a downstream unit",
          summary: params.summary ?? null,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN03: neural_route_decision — learned routing
      // k-NN over the scrutiny ledger; cold-start fires hardcoded rules when
      // the ledger has < 50 entries.
      // ─────────────────────────────────────────────────────────────────────
      case "neural_route_decision": {
        const { neuralRoutingEngine } = await import("../../engines/NeuralRoutingEngine.js");
        result = neuralRoutingEngine.route({
          changeClass: params.change_class as string,
          fileTypes: (params.file_types as string[] | undefined) ?? [],
          peerCount: params.peer_count as number,
          filesCount: params.files_count as number | undefined,
          fingerprint: params.fingerprint as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN02: moa_aggregate — MoA Layer-2 aggregator
      // Distills N proposer outputs (typically 3-of-3 scrutiny verdicts) into a
      // single calibrated verdict + rationale + dissent + entropy.
      // No live aggregatorCall is wired by default — invocation through the
      // dispatcher falls back to majority_vote. Programmatic callers can pass
      // an aggregatorCall via the engine API for senior-model distillation.
      // ─────────────────────────────────────────────────────────────────────
      case "moa_aggregate": {
        const { moaLayer2Engine } = await import("../../engines/MoaLayer2Engine.js");
        result = await moaLayer2Engine.aggregate({
          proposers: params.proposers as Parameters<typeof moaLayer2Engine.aggregate>[0]["proposers"],
          task: params.task as string | undefined,
          seniorAggregator: params.senior_aggregator as string | undefined,
          maxProposerChars: params.max_proposer_chars as number | undefined,
        });
        break;
      }

      default: {
        const _exhaustive: never = action;
        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
      }
    }

    const duration = Date.now() - startTime;
    log.info(`[prism_ai] ${action} completed in ${duration}ms`);

    // Slim response
    const slimmed = slimResponse(result);

    return { success: true, data: slimmed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`[prism_ai] ${action} failed: ${message}`);
    return dispatcherError(message, action, "prism_ai");
  }
}

/** MCP tool handler entry point */
export async function aiReasoningDispatcher(
  args: { action: AIReasoningAction; params?: Record<string, unknown> }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(args.action, args.params ?? {});
}

/** Export action list for registration */
export { AI_REASONING_ACTIONS };

/** Register dispatcher with MCP server */
export function registerAIReasoningDispatcher(server: { tool: Function }): void {
  server.tool(
    aiReasoningDispatcherDef.name,
    aiReasoningDispatcherDef.description,
    aiReasoningDispatcherDef.inputSchema.shape,
    async ({ action, params = {} }: { action: AIReasoningAction; params?: Record<string, unknown> }) => {
      const result = await executeAIReasoningAction(action, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
