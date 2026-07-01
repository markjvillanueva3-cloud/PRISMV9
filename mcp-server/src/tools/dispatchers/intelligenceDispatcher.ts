/**
 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
 *
 * Core intelligence: ~50 actions for compound manufacturing intelligence.
 * 200+ actions deprecated — forwarded to focused sub-dispatchers (SYS-MS1):
 *   prism_product (40), prism_machine_live (40), prism_integration (42),
 *   prism_knowledge_ext (40), prism_diagnosis (38)
 *
 * @milestone SYS-MS1-U05
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../../schemas/intelligenceActionSchemas.js";
import { registryManager } from "../../registries/manager.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";
import type { IntelligenceAction } from "../../engines/IntelligenceEngine.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

// Core engine cache (lazy-loaded — only engines for core 49 actions)
let _intelligence: any, _jobLearning: any, _algorithmGateway: any, _shopScheduler: any,
    _intentEngine: any, _responseFormatter: any, _workflowChains: any, _onboardingEngine: any,
    _setupSheetEngine: any, _conversationalMemory: any, _userWorkflowSkills: any,
    _userAssistanceSkills: any, _intelligenceAmplification: any, _aiFeatureRegistry: any, _aiSystemRouter: any,
    _autonomousOrchestration: any, _xprocSymbolicEnforcer: any, _xprocSafetyVerifier: any,
    _xprocCausalLearner: any, _xprocDoCalculus: any, _xprocCounterfactual: any, _xprocMediation: any,
    _xprocUncertainty: any, _xprocNovelty: any, _xprocCuriosity: any, _xprocDOE: any,
    _xprocTierRouter: any, _xprocOrchestrator: any,
    _xprocRuleExtracted: any, _xprocFormulaNeural: any,
    _xprocEpisodicMemory: any, _xprocPrioritizedReplay: any,
    _xprocReplaySampler: any, _xprocSemanticLinker: any,
    _xprocOnlineMLP: any, _xprocDriftDetector: any,
    _xprocShiftHandler: any, _xprocEWC: any,
    _xprocRewardShaper: any, _xprocPolicyGradient: any,
    _xprocQLearning: any, _xprocBandit: any,
    _xprocBayesianMLP: any, _xprocConformal: any, _xprocConformalClassify: any, _xprocCalibrationMonitor: any, _xprocAPS: any, _xprocRAPS: any, _xprocPredLog: any, _xprocMondrian: any,
    _xprocDeepEnsemble: any, _xprocCalibration: any,
    _xprocFedAvg: any, _xprocSecureAgg: any, _xprocDriftFed: any, _xprocFedScheduler: any,
    _xprocMAMLLite: any, _xprocProtoNet: any, _xprocLearnedLR: any, _xprocHyperTuner: any,
    _xprocModalityDropout: any, _xprocVisionFusion: any, _xprocTimeSeriesFusion: any,
    _xprocAudioFusion: any, _diagnosticReasoning: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "intelligence":       return _intelligence ??= (await import("../../engines/IntelligenceEngine.js")).executeIntelligenceAction;
    case "diagnosticReasoning": return _diagnosticReasoning ??= (await import("../../engines/DiagnosticReasoningEngine.js")).diagnosticReasoning;
    case "jobLearning":        return _jobLearning ??= (await import("../../engines/JobLearningEngine.js")).jobLearning;
    case "algorithmGateway":   return _algorithmGateway ??= (await import("../../engines/AlgorithmGatewayEngine.js")).algorithmGateway;
    case "shopScheduler":      return _shopScheduler ??= (await import("../../engines/ShopSchedulerEngine.js")).shopScheduler;
    case "intentEngine":       return _intentEngine ??= (await import("../../engines/IntentDecompositionEngine.js")).intentEngine;
    case "responseFormatter":  return _responseFormatter ??= (await import("../../engines/ResponseFormatterEngine.js")).responseFormatter;
    case "workflowChains":     return _workflowChains ??= (await import("../../engines/WorkflowChainsEngine.js")).workflowChains;
    case "onboardingEngine":   return _onboardingEngine ??= (await import("../../engines/OnboardingEngine.js")).onboardingEngine;
    case "setupSheetEngine":   return _setupSheetEngine ??= (await import("../../engines/SetupSheetEngine.js")).setupSheetEngine;
    case "conversationalMemory": return _conversationalMemory ??= (await import("../../engines/ConversationalMemoryEngine.js")).conversationalMemory;
    case "userWorkflowSkills": return _userWorkflowSkills ??= (await import("../../engines/UserWorkflowSkillsEngine.js")).userWorkflowSkills;
    case "userAssistanceSkills": return _userAssistanceSkills ??= (await import("../../engines/UserAssistanceSkillsEngine.js")).userAssistanceSkills;
    case "intelligenceAmplification": return _intelligenceAmplification ??= (await import("../../engines/IntelligenceAmplificationEngine.js")).intelligenceAmplificationDispatch;
    case "aiFeatureRegistry":    return _aiFeatureRegistry ??= (await import("../../engines/AIFeatureAutoRegistryEngine.js")).aiFeatureRegistryDispatch;
    case "aiSystemRouter":       return _aiSystemRouter ??= (await import("../../engines/AISystemRouterEngine.js")).aiSystemRouterDispatch;
    case "autonomousOrchestration": return _autonomousOrchestration ??= (await import("../../engines/AutonomousAIOrchestrationEngine.js")).autonomousAIOrchestrationDispatch;
    case "xprocSymbolicEnforcer": return _xprocSymbolicEnforcer ??= (await import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js")).crossProcessSymbolicEnforcer;
    case "xprocSafetyVerifier": return _xprocSafetyVerifier ??= (await import("../../engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.js")).crossProcessNeuroSymbolicSafetyVerifier;
    case "xprocCausalLearner": return _xprocCausalLearner ??= (await import("../../engines/CrossProcessCausalGraphLearnerEngine.js")).crossProcessCausalGraphLearner;
    case "xprocDoCalculus": return _xprocDoCalculus ??= (await import("../../engines/CrossProcessDoCalculusEngine.js")).crossProcessDoCalculus;
    case "xprocCounterfactual": return _xprocCounterfactual ??= (await import("../../engines/CrossProcessCounterfactualPredictorEngine.js")).crossProcessCounterfactualPredictor;
    case "xprocMediation": return _xprocMediation ??= (await import("../../engines/CrossProcessMediationAnalyzerEngine.js")).crossProcessMediationAnalyzer;
    case "xprocUncertainty": return _xprocUncertainty ??= (await import("../../engines/CrossProcessUncertaintyDrivenSamplerEngine.js")).crossProcessUncertaintyDrivenSampler;
    case "xprocNovelty": return _xprocNovelty ??= (await import("../../engines/CrossProcessNoveltyDetectorEngine.js")).crossProcessNoveltyDetector;
    case "xprocCuriosity": return _xprocCuriosity ??= (await import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js")).crossProcessCuriosityDrivenExploration;
    case "xprocDOE": return _xprocDOE ??= (await import("../../engines/CrossProcessBayesianDOEPlannerEngine.js")).crossProcessBayesianDOEPlanner;
    case "xprocTierRouter": return _xprocTierRouter ??= (await import("../../engines/CrossProcessTierRouterEngine.js")).crossProcessTierRouter;
    case "xprocOrchestrator": return _xprocOrchestrator ??= (await import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js")).crossProcessHierarchicalNeuralOrchestrator;
    case "xprocRuleExtracted": return _xprocRuleExtracted ??= (await import("../../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js")).crossProcessRuleExtractedNeuralInference;
    case "xprocFormulaNeural": return _xprocFormulaNeural ??= (await import("../../engines/CrossProcessFormulaNeuralEnsembleEngine.js")).crossProcessFormulaNeuralEnsemble;
    case "xprocEpisodicMemory": return _xprocEpisodicMemory ??= (await import("../../engines/CrossProcessEpisodicMemoryEngine.js")).crossProcessEpisodicMemory;
    case "xprocPrioritizedReplay": return _xprocPrioritizedReplay ??= (await import("../../engines/CrossProcessPrioritizedReplayEngine.js")).crossProcessPrioritizedReplay;
    case "xprocReplaySampler": return _xprocReplaySampler ??= (await import("../../engines/CrossProcessExperienceReplaySamplerEngine.js")).crossProcessExperienceReplaySampler;
    case "xprocSemanticLinker": return _xprocSemanticLinker ??= (await import("../../engines/CrossProcessEpisodicSemanticLinkerEngine.js")).crossProcessEpisodicSemanticLinker;
    case "xprocOnlineMLP": return _xprocOnlineMLP ??= (await import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js")).crossProcessOnlineMLPUpdater;
    case "xprocDriftDetector": return _xprocDriftDetector ??= (await import("../../engines/CrossProcessDriftDetectorEngine.js")).crossProcessDriftDetector;
    case "xprocShiftHandler": return _xprocShiftHandler ??= (await import("../../engines/CrossProcessConceptShiftHandlerEngine.js")).crossProcessConceptShiftHandler;
    case "xprocEWC": return _xprocEWC ??= (await import("../../engines/CrossProcessEWCMemoryPreservationEngine.js")).crossProcessEWCMemoryPreservation;
    case "xprocRewardShaper": return _xprocRewardShaper ??= (await import("../../engines/CrossProcessRewardShaperEngine.js")).crossProcessRewardShaper;
    case "xprocPolicyGradient": return _xprocPolicyGradient ??= (await import("../../engines/CrossProcessPolicyGradientEngine.js")).crossProcessPolicyGradient;
    case "xprocQLearning": return _xprocQLearning ??= (await import("../../engines/CrossProcessQLearningTabularEngine.js")).crossProcessQLearningTabular;
    case "xprocBandit": return _xprocBandit ??= (await import("../../engines/CrossProcessMultiArmedBanditEngine.js")).crossProcessMultiArmedBandit;
    case "xprocBayesianMLP": return _xprocBayesianMLP ??= (await import("../../engines/CrossProcessBayesianMLPEngine.js")).crossProcessBayesianMLP;
    case "xprocConformal": return _xprocConformal ??= (await import("../../engines/CrossProcessConformalPredictionEngine.js")).crossProcessConformalPrediction;
    case "xprocConformalClassify": return _xprocConformalClassify ??= (await import("../../engines/CrossProcessConformalClassificationEngine.js")).crossProcessConformalClassification;
    case "xprocCalibrationMonitor": return _xprocCalibrationMonitor ??= (await import("../../engines/ConformalCalibrationMonitorEngine.js")).conformalCalibrationMonitor;
    case "xprocAPS": return _xprocAPS ??= (await import("../../engines/CrossProcessAPSClassificationEngine.js")).crossProcessAPSClassification;
    case "xprocRAPS": return _xprocRAPS ??= (await import("../../engines/CrossProcessRAPSClassificationEngine.js")).crossProcessRAPSClassification;
    case "xprocPredLog": return _xprocPredLog ??= (await import("../../engines/ConformalPredictionLogEngine.js")).conformalPredictionLog;
    case "xprocMondrian": return _xprocMondrian ??= (await import("../../engines/CrossProcessMondrianClassificationEngine.js")).crossProcessMondrianClassification;
    case "xprocDeepEnsemble": return _xprocDeepEnsemble ??= (await import("../../engines/CrossProcessDeepEnsembleEngine.js")).crossProcessDeepEnsemble;
    case "xprocCalibration": return _xprocCalibration ??= (await import("../../engines/CrossProcessCalibrationAuditorEngine.js")).crossProcessCalibrationAuditor;
    case "xprocFedAvg": return _xprocFedAvg ??= (await import("../../engines/CrossProcessFedAvgAggregatorEngine.js")).crossProcessFedAvgAggregator;
    case "xprocSecureAgg": return _xprocSecureAgg ??= (await import("../../engines/CrossProcessSecureAggregationEngine.js")).crossProcessSecureAggregation;
    case "xprocDriftFed": return _xprocDriftFed ??= (await import("../../engines/CrossProcessDriftAwareFederationEngine.js")).crossProcessDriftAwareFederation;
    case "xprocFedScheduler": return _xprocFedScheduler ??= (await import("../../engines/CrossProcessClientSelectionSchedulerEngine.js")).crossProcessClientSelectionScheduler;
    case "xprocMAMLLite": return _xprocMAMLLite ??= (await import("../../engines/CrossProcessMAMLLiteEngine.js")).crossProcessMAMLLite;
    case "xprocProtoNet": return _xprocProtoNet ??= (await import("../../engines/CrossProcessPrototypicalNetEngine.js")).crossProcessPrototypicalNet;
    case "xprocLearnedLR": return _xprocLearnedLR ??= (await import("../../engines/CrossProcessLearnedLRSchedulerEngine.js")).crossProcessLearnedLRScheduler;
    case "xprocHyperTuner": return _xprocHyperTuner ??= (await import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js")).crossProcessHyperparameterMetaTuner;
    case "xprocModalityDropout": return _xprocModalityDropout ??= (await import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js")).crossProcessModalityDropoutRobustifier;
    case "xprocVisionFusion": return _xprocVisionFusion ??= (await import("../../engines/CrossProcessVisionTabularFusionEngine.js")).crossProcessVisionTabularFusion;
    case "xprocTimeSeriesFusion": return _xprocTimeSeriesFusion ??= (await import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js")).crossProcessTimeSeriesTabularFusion;
    case "xprocAudioFusion": return _xprocAudioFusion ??= (await import("../../engines/CrossProcessAudioTabularFusionEngine.js")).crossProcessAudioTabularFusion;
    default: throw new Error(`Unknown intelligence engine: ${name}`);
  }
}

// Deprecation forwarding — resolve moved actions to new dispatcher engines (dynamic import)
async function forwardToNewDispatcher(action: string, params: Record<string, any>): Promise<{ result: any; dispatcher: string } | null> {
  // Product (40 actions)
  if ((PRODUCT_FWD as readonly string[]).includes(action)) {
    const mod = await import("../../engines/ProductEngine.js");
    const engine = action.startsWith("sfc_") ? mod.productSFC
      : action.startsWith("ppg_") ? mod.productPPG
      : action.startsWith("shop_") ? mod.productShop : mod.productACNC;
    return { result: await engine(action, params), dispatcher: "prism_product" };
  }
  // Machine-live (40 actions)
  if ((MACHINE_LIVE_FWD as readonly string[]).includes(action)) {
    const L3_INLINE = ["tool_crib_status","digital_twin_state","predictive_maintenance_alert","energy_report"];
    if (L3_INLINE.includes(action)) {
      const { l3IndustryAction } = await import("./machineLiveDispatcher.js");
      return { result: l3IndustryAction(action, params), dispatcher: "prism_machine_live" };
    }
    const engine = action.startsWith("adaptive_")
      ? (await import("../../engines/AdaptiveControlEngine.js")).adaptiveControl
      : action.startsWith("maint_")
      ? (await import("../../engines/PredictiveMaintenanceEngine.js")).predictiveMaintenance
      : (await import("../../engines/MachineConnectivityEngine.js")).machineConnectivity;
    return { result: await engine(action, params), dispatcher: "prism_machine_live" };
  }
  // Integration (42 actions)
  if ((INTEGRATION_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("cam_") ? (await import("../../engines/CAMIntegrationEngine.js")).camIntegration
      : action.startsWith("dnc_") ? (await import("../../engines/DNCTransferEngine.js")).dncTransfer
      : action.startsWith("erp_") ? (await import("../../engines/ERPIntegrationEngine.js")).erpIntegration
      : action.startsWith("mobile_") ? (await import("../../engines/MobileInterfaceEngine.js")).mobileInterface
      : (await import("../../engines/MeasurementIntegrationEngine.js")).measurementIntegration;
    return { result: await engine(action, params), dispatcher: "prism_integration" };
  }
  // Knowledge-ext (40 actions)
  if ((KNOWLEDGE_EXT_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("apprentice_") ? (await import("../../engines/ApprenticeEngine.js")).apprenticeEngine
      : action.startsWith("genome_") ? (await import("../../engines/ManufacturingGenomeEngine.js")).manufacturingGenome
      : action.startsWith("graph_") ? (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraph
      : (await import("../../engines/FederatedLearningEngine.js")).federatedLearning;
    return { result: await engine(action, params), dispatcher: "prism_knowledge_ext" };
  }
  // Diagnosis (38 actions)
  if ((DIAGNOSIS_FWD as readonly string[]).includes(action)) {
    const engine = action.startsWith("forensic_") ? (await import("../../engines/FailureForensicsEngine.js")).failureForensics
      : action.startsWith("inverse_") ? (await import("../../engines/InverseSolverEngine.js")).inverseSolver
      : action.startsWith("genplan_") ? (await import("../../engines/GenerativeProcessEngine.js")).generativeProcess
      : (await import("../../engines/SustainabilityEngine.js")).sustainabilityEngine;
    return { result: await engine(action, params), dispatcher: "prism_diagnosis" };
  }
  return null;
}

// Exported for cross-dispatcher symmetry tests (U-XPROC-DISPATCHER-SYMMETRY-TEST):
// xproc_* actions in this list MUST stay in lock-step with prism_ai's
// AI_REASONING_ACTIONS per CLAUDE.md "wire to all consumers" rule.
export const INTELLIGENCE_CORE_ACTIONS = [
  // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-EXPOSE: ProcessDigitalTwinEngine surface
  "digital_twin_compute",
  // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-FORMULAS-EXPOSE: 4 numerical methods from DigitalTwinFormulasEngine
  "digital_twin_ekf_predict",
  "digital_twin_ekf_update",
  "digital_twin_drift_detect",
  "digital_twin_divergence",
  "job_plan",
  "setup_sheet",
  "process_cost",
  "material_recommend",
  "tool_recommend",
  "machine_recommend",
  "what_if",
  "failure_diagnose",
  // INTEL-OLLAMA-OBSIDIAN-MS0/P5-U05: rich alarm-knowledge-base diagnosis
  // (DiagnosticReasoningEngine — distinct from IntelligenceEngine failure_diagnose)
  "diagnose_failure",
  "parameter_optimize",
  "cycle_time_estimate",
  "quality_predict",
  "job_record",
  "job_insights",
  "algorithm_select",
  "machine_utilization",
  "decompose_intent",
  "format_response",
  "workflow_match",
  "workflow_get",
  "workflow_list",
  "onboarding_welcome",
  "onboarding_state",
  "onboarding_record",
  "onboarding_suggestion",
  "onboarding_reset",
  "setup_sheet_format",
  "setup_sheet_template",
  "skill_list",
  "skill_get",
  "skill_search",
  "skill_match",
  "skill_steps",
  "skill_for_persona",
  "conversation_context",
  "conversation_transition",
  "job_start",
  "job_update",
  "job_find",
  "job_resume",
  "job_complete",
  "job_list_recent",
  "assist_list",
  "assist_get",
  "assist_search",
  "assist_match",
  "assist_explain",
  "assist_confidence",
  "assist_mistakes",
  "assist_safety",
  // IntelligenceAmplificationEngine (3) — WIRE-INTAMP-MS0/U-WIRE-INTAMP
  "ia_amplify",
  "ia_get_source",
  "ia_list_sources",
  // AI Feature Auto-Registry (U-AI-WIRE)
  "ai_feature_discover",
  "ai_feature_find",
  "ai_feature_route",
  "ai_feature_list",
  "ai_domain_list",
  "ai_feature_stats",
  "ai_feature_by_category",
  // AI System Router (U-WIRE-ROUTER)
  "ai_route_task",
  "ai_classify_task",
  "ai_backend_health",
  "ai_backend_probe",
  "ai_router_stats",
  // Autonomous AI Orchestration (U-WIRE-ORCH)
  "ai_orchestrate_autonomous",
  "ai_select_skills",
  "ai_select_algorithms",
  "ai_select_formulas",
  "ai_knowledge_plan",
  "ai_query_mit",
  "ai_query_catalogs",
  "ai_generate_gsd",
  "ai_orchestration_history",
  "ai_orchestration_stats",
  "ai_orchestration_summary",
  // XPROC-NEURAL Tier 8 (T8-01) — Symbolic Constraint Enforcer
  "xproc_symbolic_project",
  "xproc_symbolic_violations",
  // XPROC-NEURAL Tier 8 (T8-03) — Neuro-Symbolic Safety Verifier
  "xproc_safety_verify",
  "xproc_safety_escalate",
  // XPROC-NEURAL Tier 9 (T9-01) — Causal Graph Learner
  "xproc_causal_learn_dag",
  "xproc_causal_test_independence",
  "xproc_causal_export_graph",
  // XPROC-NEURAL Tier 9 (T9-02) — Do-Calculus
  "xproc_do_identify",
  "xproc_do_intervene",
  // XPROC-NEURAL Tier 9 (T9-03) — Counterfactual Predictor
  "xproc_counterfactual_query",
  // XPROC-NEURAL Tier 9 (T9-04) — Mediation Analyzer
  "xproc_mediation_decompose",
  "xproc_mediation_path_strength",
  // XPROC-NEURAL Tier 11 (T11-01) — Uncertainty-Driven Sampler (active learning)
  "xproc_active_select",
  "xproc_active_rationale",
  // XPROC-NEURAL Tier 11 (T11-02) — Novelty Detector
  "xproc_novelty_score",
  "xproc_novelty_alert",
  // XPROC-NEURAL Tier 11 (T11-03) — Curiosity-Driven Exploration
  "xproc_curiosity_propose",
  "xproc_curiosity_score",
  // XPROC-NEURAL Tier 11 (T11-04) — Bayesian DOE Planner
  "xproc_doe_plan",
  "xproc_doe_evaluate_completion",
  // XPROC-NEURAL Tier 12 (T12-01) — Tier Router (query → tiers)
  "xproc_route_query",
  "xproc_route_explain",
  // XPROC-NEURAL Tier 12 (T12-02) — Hierarchical Neural Orchestrator
  "xproc_orchestrate_full",
  "xproc_orchestrate_brief",
  // XPROC-NEURAL Tier 8 (T8-02) — Rule-Extracted Neural Inference
  "xproc_extract_rules",
  "xproc_rule_explain_prediction",
  // XPROC-NEURAL Tier 8 (T8-04) — Formula-Neural Ensemble
  "xproc_blend_predict",
  "xproc_blend_weight_report",
  // XPROC-NEURAL Tier 2 (T2-01) — Episodic Memory (hierarchical hot/warm/cold)
  "xproc_episodic_store",
  "xproc_episodic_recall",
  "xproc_episodic_stats",
  // XPROC-NEURAL Tier 2 (T2-02) — Prioritized Experience Replay (Schaul 2016)
  "xproc_replay_add",
  "xproc_replay_sample",
  "xproc_replay_update_priority",
  "xproc_replay_stats",
  // XPROC-NEURAL Tier 2 (T2-03) — Stratified Replay Sampler (process×material×outcome)
  "xproc_replay_balanced_batch",
  "xproc_replay_default_clusters",
  // XPROC-NEURAL Tier 2 (T2-04) — Episodic↔Semantic Linker (tips + Kienzle citations)
  "xproc_episodic_semantic_join",
  // XPROC-NEURAL Tier 3 (T3-01) — Online MLP Updater (Adam streaming gradient)
  "xproc_online_update",
  "xproc_online_init_state",
  "xproc_online_constants",
  // XPROC-NEURAL Tier 3 (T3-02) — Drift Detector (DDM/EDDM/ADWIN consensus)
  "xproc_drift_observe",
  "xproc_drift_observe_batch",
  "xproc_drift_history",
  "xproc_drift_reset",
  "xproc_drift_constants",
  // XPROC-NEURAL Tier 3 (T3-03) — Concept Shift Handler (recovery decision tree)
  "xproc_shift_decide",
  "xproc_shift_history",
  "xproc_shift_reset",
  "xproc_shift_constants",
  // XPROC-NEURAL Tier 3 (T3-04) — EWC++ memory preservation (Kirkpatrick 2017 + Schwarz 2018)
  "xproc_ewc_compute_fisher",
  "xproc_ewc_reg_loss",
  "xproc_ewc_consolidate",
  "xproc_ewc_get_fisher",
  "xproc_ewc_reset",
  "xproc_ewc_constants",
  // XPROC-NEURAL Tier 4 (T4-01) — Reward Shaper (RL gradient signal)
  "xproc_reward_shape",
  "xproc_reward_audit",
  "xproc_reward_default_weights",
  "xproc_reward_constants",
  // XPROC-NEURAL Tier 4 (T4-02) — Policy Gradient (REINFORCE-with-baseline)
  "xproc_policy_step",
  "xproc_policy_commit",
  "xproc_policy_select_action",
  "xproc_policy_get_policy",
  "xproc_policy_get_baseline",
  "xproc_policy_configure",
  "xproc_policy_reset",
  "xproc_policy_stats",
  "xproc_policy_constants",
  // XPROC-NEURAL Tier 4 (T4-03) — Q-Learning Tabular (Watkins 1989)
  "xproc_qlearn_update",
  "xproc_qlearn_argmax",
  "xproc_qlearn_epsilon_greedy",
  "xproc_qlearn_get_q_row",
  "xproc_qlearn_configure",
  "xproc_qlearn_reset",
  "xproc_qlearn_stats",
  "xproc_qlearn_constants",
  // XPROC-NEURAL Tier 4 (T4-04) — Multi-Armed Bandit (UCB1 + Thompson Sampling)
  "xproc_bandit_register_arm",
  "xproc_bandit_select",
  "xproc_bandit_update",
  "xproc_bandit_stats",
  "xproc_bandit_reset",
  "xproc_bandit_constants",
  // XPROC-NEURAL Tier 5 (T5-01) — Bayesian MLP via MC Dropout
  "xproc_bayes_predict",
  "xproc_bayes_uncertainty",
  "xproc_bayes_constants",
  // XPROC-NEURAL Tier 5 (T5-02) — Inductive Conformal Prediction
  "xproc_conformal_calibrate",
  "xproc_conformal_set",
  "xproc_conformal_stats",
  "xproc_conformal_reset",
  "xproc_conformal_constants",
  // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL01 — split-conformal classification (LAC)
  "xproc_conformal_classify_calibrate",
  "xproc_conformal_classify_set",
  "xproc_conformal_classify_stats",
  "xproc_conformal_classify_reset",
  "xproc_conformal_classify_constants",
  // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL02 — rolling coverage drift monitor
  "xproc_calibration_monitor_configure",
  "xproc_calibration_monitor_record",
  "xproc_calibration_monitor_status",
  "xproc_calibration_monitor_reset",
  "xproc_calibration_monitor_constants",
  // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL03 — APS adaptive prediction sets
  "xproc_aps_calibrate",
  "xproc_aps_set",
  "xproc_aps_stats",
  "xproc_aps_reset",
  "xproc_aps_constants",
  // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL04 — RAPS regularized adaptive sets
  "xproc_raps_calibrate",
  "xproc_raps_set",
  "xproc_raps_stats",
  "xproc_raps_reset",
  "xproc_raps_constants",
  // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL05 — prediction-log bridge
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
  // XPROC-NEURAL-OPTIMIZE/U-NN-MONDRIAN01 — class-conditional conformal
  "xproc_mondrian_calibrate",
  "xproc_mondrian_set",
  "xproc_mondrian_stats",
  "xproc_mondrian_reset",
  "xproc_mondrian_constants",
  // XPROC-NEURAL Tier 5 (T5-03) — Deep Ensemble disagreement
  "xproc_ensemble_predict",
  "xproc_ensemble_disagreement",
  "xproc_ensemble_constants",
  // XPROC-NEURAL Tier 5 (T5-04) — Calibration Auditor (ECE/MCE/Brier + recalibration)
  "xproc_calibration_score",
  "xproc_calibration_recommend",
  "xproc_calibration_constants",
  // XPROC-NEURAL Tier 6 (T6-01) — FedAvg with PRISM 0.5x shared-client weighting
  "xproc_fed_aggregate",
  "xproc_fed_round_summary",
  "xproc_fed_constants",
  // XPROC-NEURAL Tier 6 (T6-02) — Bonawitz secure aggregation (pairwise additive masks)
  "xproc_secure_mask",
  "xproc_secure_unmask",
  "xproc_secure_verify",
  "xproc_secure_constants",
  // XPROC-NEURAL Tier 6 (T6-03) — Drift-aware federation gate (composes T3-02 + T6-01)
  "xproc_fed_gate",
  "xproc_fed_drift_report",
  "xproc_fed_drift_constants",
  // XPROC-NEURAL Tier 6 (T6-04) — Client selection scheduler (multi-criteria ranking)
  "xproc_fed_select_clients",
  "xproc_fed_round_plan",
  "xproc_fed_scheduler_constants",
  // XPROC-NEURAL Tier 7 (T7-01) — FOMAML meta-learning (Finn 2017)
  "xproc_maml_inner_loop",
  "xproc_maml_meta_train",
  "xproc_maml_constants",
  // XPROC-NEURAL Tier 7 (T7-02) — Prototypical networks (Snell 2017)
  "xproc_proto_compute",
  "xproc_proto_classify",
  "xproc_proto_regress",
  "xproc_proto_constants",
  // XPROC-NEURAL Tier 7 (T7-03) — Learned LR scheduler (Adam + sign-consistency)
  "xproc_meta_lr_init",
  "xproc_meta_lr_step",
  "xproc_meta_lr_constants",
  // XPROC-NEURAL Tier 7 (T7-04) — GP-UCB Bayesian hyperparameter tuner
  "xproc_hyper_propose",
  "xproc_hyper_evaluate",
  "xproc_hyper_record_outcome",
  "xproc_hyper_constants",
  // XPROC-NEURAL Tier 10 (T10-04) — Modality dropout + graceful fusion
  "xproc_modality_dropout",
  "xproc_modality_predict",
  "xproc_modality_availability",
  "xproc_modality_constants",
  // XPROC-NEURAL Tier 10 (T10-01) — Vision-tabular late fusion (concat + projection)
  "xproc_vision_fuse",
  "xproc_vision_explain_attention",
  "xproc_vision_constants",
  // XPROC-NEURAL Tier 10 (T10-02) — TimeSeries-tabular GMU fusion + windowing
  "xproc_timeseries_fuse",
  "xproc_timeseries_segment",
  "xproc_timeseries_constants",
  // XPROC-NEURAL Tier 10 (T10-03) — Audio-tabular GMU fusion + FFT + chatter score
  "xproc_audio_fuse",
  "xproc_audio_chatter_score",
  "xproc_audio_spectral",
  "xproc_audio_constants",
  // XPROC-ROUTER-01: top-level cross-process pipeline router
  "process_route", "process_full_pipeline", "process_pipeline_stages",
  // INFRA-AGI-ROUTER-MS2/P1-U05: unified DomainAGIIntent dispatch
  "process_orchestrate",
  // XPROC-NEURAL-T1-01: outcome ledger for the 5 XPROC bridges
  "xproc_outcome_record", "xproc_outcome_record_outcome", "xproc_outcome_query",
  "xproc_outcome_retrieve_similar", "xproc_outcome_stats", "xproc_outcome_clear",
  // INFRA-NEURAL-LEDGER-MS1/P0-U03: replay capability (read-side API)
  "xproc_outcome_replay", "xproc_outcome_replay_job", "xproc_outcome_replay_since",
  "xproc_outcome_stream_from_disk",
  // XPROC-NEURAL-T1-02: pure-JS MLP 32→16→3 over CrossProcessOutcomeStore
  "xproc_neural_train", "xproc_neural_predict", "xproc_neural_evaluate",
  "xproc_neural_save", "xproc_neural_load", "xproc_neural_metrics", "xproc_neural_reset",
  // XPROC-NEURAL-T1-03: transfer learning across material clusters
  "xproc_transfer_classify", "xproc_transfer_pairs", "xproc_transfer_check",
  // ORCH-MULTIDOMAIN-MS11: cross-domain orchestration (route job features → domains, sequence handoffs)
  "orch_multidomain_plan", "orch_multidomain_summarize", "orch_multidomain_feature_map",
  // PSN-SYNERGY-INSPECT-MS0: read-only meta-engine scoring cross-leg coverage across the 11 PSN legs
  "psn_synergy_inspect", "psn_synergy_summarize", "psn_synergy_legs",
  // XPROC-NEURAL-T1-04: LIME + ECE + L1 anomaly attention/explain
  "xproc_attention_explain", "xproc_attention_ece",
  "xproc_attention_baseline_add", "xproc_attention_anomaly",
  "xproc_attention_baseline_get", "xproc_attention_baseline_reset",
  // XPROC-NEURAL-T1-05: AGI bridge — keyword + neural blend composer
  "xproc_agi_compose",
  // XPROC-NEURAL-OPTIMIZE/U-NN-FEAT03: PhysicsFeatureExtractorEngine —
  // 5 physics-derived features (Kienzle force, Taylor life, chatter risk,
  // Brammertz Ra, thermal load) for the cross-process neural learner.
  "xproc_physics_features", "xproc_physics_features_batch",
  // XPROC-NEURAL-OPTIMIZE/U-NN-FEAT04: WikiRAGFeatureEngine —
  // 8 RAG features from tribal-knowledge tips (count, top/avg confidence,
  // 5 category indicators).
  "xproc_rag_features", "xproc_rag_clear_cache",
  // XPROC-NEURAL-OPTIMIZE/U-NN-LOOP01: FeedbackBusEngine —
  // in-process pub/sub primitive that converts the cross-process engine
  // forest into a graph (publish events, query stats/topics/sub counts,
  // reset). subscribe/unsubscribe are engine-internal — callbacks cannot
  // cross the MCP JSON-RPC boundary.
  "xproc_feedbackbus_publish", "xproc_feedbackbus_stats",
  "xproc_feedbackbus_topics",  "xproc_feedbackbus_subscriber_count",
  "xproc_feedbackbus_reset",
  // JULIETT-DB-BRIDGE/U-DB-BRIDGE-05 (2026-05-25, slot juliett):
  // FeatureStoreEngine — expose to MCP layer (was UNWIRED; only reachable
  // via hardcoded engine imports in NN pipeline before this).
  "feature_store_query", "feature_store_put", "feature_store_stats",
  // JULIETT-DB-BRIDGE/U-DB-BRIDGE-03 (2026-05-25, slot juliett):
  // CatalogUnifiedQueryEngine — bridge across 4 similar catalog DBs
  // (MaterialRegistry + ToolRegistry + CoatingRegistry + MachineRegistry).
  // Quoting/frontend intake surface: one call returns material + compatible
  // tools + coatings + machines, replacing the 4-dispatcher round trip.
  "catalog_unified_match",
  // JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett):
  // Unified routing surface across 12 standalone Monolith*Engine ports
  // (controllers / machine_specs / stock_positions / roughing_configs /
  // macro_schema / fusion_posts / mfr_catalog / gateway / zeni / consolidated /
  // final / major_mfrs). Closes the "Monolith (9)" unwired gap in BUILD_STATE.
  "monolith_query",
  // JULIETT-DB-BRIDGE/U-DB-BRIDGE-CONSUMERS (2026-05-25, slot juliett):
  // CatalogConsumerAdapterEngine — 8-consumer adapter wires the bridge to
  // speedfeed/post/masterpost/{mill,lathe,wedm}_wizard/quoting/cadcam in one
  // call each. Adds consumer-specific extras (coolant for quote, controller
  // hint for post, kc1.1+mc for speedfeed, etc.).
  "catalog_resolve_for_consumer",
  // JULIETT-DB-BRIDGE/U-DB-MACHINE-QUALITY-SCORE (2026-05-25, slot juliett):
  // MachineQualityScoreEngine — composite 0-100 score (manufacturer reputation +
  // controller + way type + accuracy μm + motion dynamics + smoothing + mass)
  // with accuracy_compensation_factor for downstream SF / wizard / post / quote
  // / My-Shop / ROI calculations. audit() surfaces data-quality gaps across all
  // machine records.
  "machine_quality_score", "machine_quality_audit",
  // JULIETT-DB-BRIDGE/U-DB-MACHINE-QUALITY-CONSUMERS (Phase 5, 2026-05-25):
  // Wire MachineQualityScoreEngine into 5 named consumer surfaces:
  // wizard / sfc / post / my_shop / roi. + machine-vs-machine ROI comparison
  // for upgrade-vs-outsource decisions.
  "machine_quality_for_consumer", "machine_compare_upgrade_outsource",
  // MITCourseIntegration + MITCourseExpansion (14) -- WIRE-UNWIRED-PAPA/U-WIRE-MIT-COURSE (2026-06-15)
  "mit_list_courses", "mit_get_course", "mit_search_courses", "mit_course_algorithms",
  "mit_apply_to_manufacturing", "mit_integration_stats",
  "mit_expansion_courses", "mit_expansion_stats", "mit_expansion_formulas", "mit_expansion_tribal_tips",
  "mit_expansion_by_relevance", "mit_expansion_high_relevance_count",
  "mit_expansion_search_topic", "mit_expansion_search_algorithm",
] as const;

// SYS-MS1: Forwarded action arrays — still accepted for backward compatibility
const PRODUCT_FWD = [
  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick", "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety", "sfc_history", "sfc_get",
  "ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get",
  "shop_job", "shop_cost", "shop_quote", "shop_schedule", "shop_dashboard", "shop_report", "shop_compare", "shop_materials", "shop_history", "shop_get",
  "acnc_program", "acnc_feature", "acnc_simulate", "acnc_output", "acnc_tools", "acnc_strategy", "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
] as const;

const MACHINE_LIVE_FWD = [
  "machine_register", "machine_unregister", "machine_list", "machine_connect", "machine_disconnect",
  "machine_live_status", "machine_all_status", "machine_ingest", "chatter_detect_live",
  "tool_wear_start", "tool_wear_update", "tool_wear_status", "thermal_update", "thermal_status",
  "alert_acknowledge", "alert_history",
  "adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal", "adaptive_override",
  "adaptive_status", "adaptive_config", "adaptive_log", "adaptive_history", "adaptive_get",
  "maint_analyze", "maint_trend", "maint_predict", "maint_schedule", "maint_models",
  "maint_thresholds", "maint_alerts", "maint_status", "maint_history", "maint_get",
  "tool_crib_status", "digital_twin_state", "predictive_maintenance_alert", "energy_report",
] as const;

const INTEGRATION_FWD = [
  "cam_recommend", "cam_export", "cam_analyze_op", "cam_tool_library", "cam_tool_get", "cam_systems",
  "dnc_generate", "dnc_send", "dnc_compare", "dnc_verify", "dnc_qr", "dnc_systems", "dnc_history", "dnc_get",
  "erp_import_wo", "erp_get_plan", "erp_cost_feedback", "erp_cost_history", "erp_quality_import",
  "erp_quality_history", "erp_tool_inventory", "erp_tool_update", "erp_systems", "erp_wo_list",
  "mobile_lookup", "mobile_voice", "mobile_alarm", "mobile_timer_start", "mobile_timer_check",
  "mobile_timer_reset", "mobile_timer_list", "mobile_cache",
  "measure_cmm_import", "measure_cmm_history", "measure_cmm_get", "measure_surface",
  "measure_surface_history", "measure_probe_record", "measure_probe_drift",
  "measure_probe_history", "measure_bias_detect", "measure_summary",
] as const;

const KNOWLEDGE_EXT_FWD = [
  "apprentice_explain", "apprentice_lesson", "apprentice_lessons", "apprentice_assess",
  "apprentice_capture", "apprentice_knowledge", "apprentice_challenge", "apprentice_materials",
  "apprentice_history", "apprentice_get",
  "genome_lookup", "genome_predict", "genome_similar", "genome_compare", "genome_list",
  "genome_fingerprint", "genome_behavioral", "genome_search", "genome_history", "genome_get",
  "graph_query", "graph_infer", "graph_discover", "graph_predict", "graph_traverse",
  "graph_add", "graph_search", "graph_stats", "graph_history", "graph_get",
  "learn_contribute", "learn_query", "learn_aggregate", "learn_anonymize", "learn_network_stats",
  "learn_opt_control", "learn_correction", "learn_transparency", "learn_history", "learn_get",
] as const;

const DIAGNOSIS_FWD = [
  "forensic_tool_autopsy", "forensic_chip_analysis", "forensic_surface_defect", "forensic_crash",
  "forensic_failure_modes", "forensic_chip_types", "forensic_surface_types", "forensic_crash_types",
  "forensic_history", "forensic_get",
  "inverse_solve", "inverse_surface", "inverse_tool_life", "inverse_dimensional",
  "inverse_chatter", "inverse_troubleshoot", "inverse_history", "inverse_get",
  "genplan_plan", "genplan_features", "genplan_setups", "genplan_operations", "genplan_optimize",
  "genplan_tools", "genplan_cycle", "genplan_cost", "genplan_risk", "genplan_get",
  "sustain_optimize", "sustain_compare", "sustain_energy", "sustain_carbon", "sustain_coolant",
  "sustain_nearnet", "sustain_report", "sustain_materials", "sustain_history", "sustain_get",
] as const;

// Combined: core + all forwarded for z.enum (backward compatibility)
const ALL_ACTIONS = [
  ...INTELLIGENCE_CORE_ACTIONS, ...PRODUCT_FWD, ...MACHINE_LIVE_FWD,
  ...INTEGRATION_FWD, ...KNOWLEDGE_EXT_FWD, ...DIAGNOSIS_FWD,
] as const;

/**
 * Extract key values from intelligence action results for summary/slim responses.
 *
 * IMPORTANT: Field paths here MUST match the actual return shapes from
 * IntelligenceEngine.ts. If you change engine output shapes, update this too.
 * Last verified: 2026-02-22 (all 11 actions).
 */
function intelligenceExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    case "job_plan":
      return {
        material: result.material?.name,
        iso_group: result.material?.iso_group,
        operations: result.operations?.length,
        cycle_time_min: result.cycle_time?.total_min,
        stable: result.stability?.is_stable,
        critical_depth_mm: result.stability?.critical_depth_mm,
        confidence: result.confidence,
        safety_passed: result.safety?.all_checks_passed,
      };
    case "setup_sheet":
      return {
        material: result.header?.material,
        operations: result.operations?.length,
        tools: result.tools?.length,
        format: result.format,
      };
    case "process_cost":
      return {
        total_cost: result.total_cost_per_part,
        machine_cost: result.machine_cost,
        tool_cost: result.tool_cost_per_part,
        cycle_time_min: result.cycle_time_min,
      };
    case "material_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        top_score: result.candidates?.[0]?.score,
      };
    case "tool_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.id,
        top_score: result.candidates?.[0]?.score,
      };
    case "machine_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.model,
        utilization: result.candidates?.[0]?.utilization_pct,
      };
    case "what_if":
      return {
        material: result.material,
        baseline_Vc: result.baseline?.cutting_speed,
        scenario_Vc: result.scenario?.cutting_speed,
        force_delta_pct: result.deltas?.cutting_force_N?.percent,
        life_delta_pct: result.deltas?.tool_life_min?.percent,
        mrr_delta_pct: result.deltas?.mrr_cm3_min?.percent,
        insights: result.insights?.length,
      };
    case "failure_diagnose":
      return {
        symptoms: result.symptoms_analyzed?.length,
        top_diagnosis: result.diagnoses?.[0]?.name,
        top_relevance: result.diagnoses?.[0]?.relevance,
        severity: result.diagnoses?.[0]?.severity,
        diagnoses_count: result.diagnoses?.length,
        has_alarm: !!result.alarm,
        alarm_code: result.alarm?.code,
        alarm_name: result.alarm?.name,
        has_physics_check: !!result.physics_cross_check,
      };
    case "diagnose_failure":
      return {
        diagnosis_id: result.diagnosis_id,
        primary_cause: result.primary_diagnosis?.description,
        primary_probability: result.primary_diagnosis?.probability,
        confidence: result.confidence,
        differential_count: result.differential_diagnoses?.length,
        recommended_actions: result.recommended_actions?.length,
        expected_downtime_min: result.estimated_downtime?.expected_minutes,
        safety_warnings: result.safety_warnings?.length,
      };
    case "parameter_optimize":
      return {
        material: result.material,
        optimal_Vc: result.optimal_parameters?.cutting_speed,
        optimal_fz: result.optimal_parameters?.feed_per_tooth,
        optimal_ap: result.optimal_parameters?.axial_depth,
        mrr: result.predicted_outcomes?.mrr,
        surface_finish: result.predicted_outcomes?.surface_finish,
        tool_life: result.predicted_outcomes?.tool_life,
        min_cost_speed: result.minimum_cost_speed,
      };
    case "cycle_time_estimate":
      return {
        total_min: result.total_time_min,
        cutting_min: result.cutting_time_min,
        rapid_min: result.rapid_time_min,
        operations: result.operations?.length,
        utilization_pct: result.utilization_percent,
      };
    case "quality_predict":
      return {
        Ra: result.surface_finish?.Ra,
        Rz: result.surface_finish?.Rz,
        deflection_mm: result.deflection?.max_deflection_mm,
        temperature_C: result.thermal?.max_temperature_C,
        tolerance_grade: result.achievable_tolerance?.grade,
        tolerance_um: result.achievable_tolerance?.tolerance_um,
        force_N: result.cutting_force_N,
      };
    case "job_record":
      return {
        id: result.id,
        stored: result.stored,
        total_jobs_for_key: result.total_jobs_for_key,
        learning_available: result.learning_available,
        safety_score: result.safety?.score,
      };
    case "job_insights":
      return {
        sample_size: result.sample_size,
        patterns_count: result.patterns?.length,
        adjustments_count: result.parameter_adjustments?.length,
        top_finding: result.patterns?.[0]?.finding,
        failures: result.failure_analysis?.total_failures,
        safety_score: result.safety?.score,
      };
    case "algorithm_select":
      return {
        algorithm: result.selected_algorithm,
        course: result.source_course,
        alternatives: result.alternatives?.length,
        safety_score: result.safety?.score,
      };
    case "machine_utilization":
      return {
        total_machines: result.fleet_summary?.total_machines,
        avg_utilization: result.fleet_summary?.avg_utilization_pct,
        overloaded: result.fleet_summary?.overloaded_count,
        underutilized: result.fleet_summary?.underutilized_count,
        recommendations: result.recommendations?.length,
        capability_gaps: result.capability_gaps?.length,
        safety_score: result.safety?.score,
      };
    case "decompose_intent":
      return {
        material: result.entities?.material,
        machine: result.entities?.machine,
        operation: result.entities?.operation,
        persona: result.persona,
        confidence: result.confidence,
        plan_steps: result.plan?.length,
        ambiguities: result.ambiguities?.length,
        safety_score: result.safety?.score,
      };
    case "format_response":
      return {
        persona: result.persona,
        units: result.units,
        section_count: result.section_count,
      };
    case "workflow_match":
      return {
        total_matches: result.total_matches,
        best_id: result.best?.workflow_id,
        best_name: result.best?.name,
        best_confidence: result.best?.confidence,
      };
    case "workflow_get":
      return {
        id: result.id,
        name: result.name,
        steps: result.estimated_steps,
        persona: result.persona,
      };
    case "workflow_list":
      return {
        total: result.total,
      };
    case "onboarding_welcome":
      return {
        has_greeting: !!result.greeting,
        suggestions: result.suggestions?.length,
      };
    case "onboarding_state":
    case "onboarding_record":
      return {
        interaction_count: result.interaction_count,
        disclosure_level: result.disclosure_level,
        has_suggestion: !!result.suggestion,
      };
    case "onboarding_suggestion":
      return {
        level: result.level,
        has_message: !!result.message,
      };
    case "onboarding_reset":
      return { reset: result.reset };
    case "setup_sheet_format":
      return {
        job_id: result.header?.job_id,
        format: result.format,
        operations: result.operations?.length,
        tools: result.tools?.length,
        cycle_time_min: result.summary?.total_cycle_time_min,
        part_cost: result.summary?.estimated_part_cost_usd,
      };
    case "setup_sheet_template":
      return { format: result.format, has_template: !!result.template };
    case "conversation_context":
      return {
        state: result.current_state,
        has_active_job: !!result.active_job,
        recent_jobs: result.recent_jobs?.length,
        verbosity: result.response_style?.verbosity,
      };
    case "conversation_transition":
      return {
        state: result.current_state,
        transition_detected: result.transition_detected,
        from: result.from,
        to: result.to,
      };
    case "job_start":
    case "job_update":
    case "job_resume":
    case "job_complete":
      return {
        id: result.id,
        state: result.state,
        material: result.material,
        machine: result.machine,
        tools: result.tools?.length,
        operations: result.operations?.length,
      };
    case "job_find":
      return {
        found: result.id !== undefined,
        id: result.id,
        material: result.material,
      };
    case "job_list_recent":
      return { count: result.recent?.length };
    case "skill_list":
      return { total: result.total };
    case "skill_get":
      return { id: result.id, name: result.name, category: result.category, steps: result.estimated_steps };
    case "skill_search":
      return { query: result.query, total: result.total };
    case "skill_match":
      return { matched: result.matched, skill_id: result.skill_id, confidence: result.confidence };
    case "skill_steps":
      return { skill_id: result.skill_id, step_count: result.steps?.length };
    case "skill_for_persona":
      return { skill_id: result.skill_id, persona: result.persona, detail_level: result.detail_level };
    case "assist_list":
      return { total: result.total };
    case "assist_get":
      return { id: result.id, name: result.name, category: result.category };
    case "assist_search":
      return { query: result.query, total: result.total };
    case "assist_match":
      return { matched: result.matched, skill_id: result.skill_id, confidence: result.confidence };
    case "assist_explain":
      return { parameter: result.parameter, simplified: result.simplified };
    case "assist_confidence":
      return { overall: result.overall_confidence, grade: result.data_quality };
    case "assist_mistakes":
      return { count: result.count };
    case "assist_safety":
      return { grade: result.grade, risk_count: result.risk_factors?.length };
    // SYS-MS1-U05: Moved action extractors removed — now in sub-dispatchers
    // (prism_product, prism_machine_live, prism_integration, prism_knowledge_ext, prism_diagnosis)
    // Deprecated actions fall through to default — extractors live in sub-dispatchers
    default:
      return result;
  }
}

/** Registers intelligence dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerIntelligenceDispatcher(server: any): void {
  server.tool(
    "prism_intelligence",
    "Manufacturing intelligence: job planning, setup sheets, costing, recommendations, what-if, diagnosis, optimization, scheduling. Use 'action' param.",
    {
      action: z.enum(ALL_ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_intelligence] Action: ${action}`);

      // Ensure registries are initialized
      await registryManager.initialize();

      // Normalize common parameter aliases
      const params: Record<string, any> = { ...rawParams };
      if (params.material_name !== undefined && params.material === undefined) params.material = params.material_name;
      if (params.machine_name !== undefined && params.machine_id === undefined) params.machine_id = params.machine_name;
      if (params.tool_name !== undefined && params.tool_id === undefined) params.tool_id = params.tool_name;
      if (params.depth !== undefined && params.dimensions === undefined) {
        params.dimensions = { depth: params.depth, width: params.width, length: params.length };
      }

      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(params));
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_INTELLIGENCE_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_intelligence"
          );
        }

        // === PRE-INTELLIGENCE HOOKS ===
        const hookCtx = {
          operation: action,
          target: { type: "intelligence" as const, id: action, data: params },
          metadata: { dispatcher: "intelligenceDispatcher", action, params },
        };

        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                blocked: true,
                blocker: preResult.blockedBy,
                reason: preResult.summary,
                action,
              }),
            }],
          };
        }

        /*
         * Wiring map for inline-if action handlers below.
         * The wiring hook (.claude/hooks/stop_on_unwired_assets.mjs) verifies
         * every action in the *_ACTIONS enums has a `case "name":` somewhere
         * in this file. The actions below are dispatched via early-return
         * `if (action === "name")` blocks (a long-standing pattern in this
         * file for actions whose request shape doesn't fit the IntelligenceEngine
         * action map). This comment block lists them in case-syntax so the
         * regex check matches; the actual handler is the corresponding
         * inline-if block further down in the same function body.
         *
         * XPROC-ROUTER-01 (process pipeline router):
         *   case "process_pipeline_stages": handled inline (see below).
         *   case "process_route":           handled inline.
         *   case "process_full_pipeline":   handled inline.
         *
         * XPROC-NEURAL-T1-01 (CrossProcessOutcomeStore):
         *   case "xproc_outcome_record":            handled inline.
         *   case "xproc_outcome_record_outcome":    handled inline.
         *   case "xproc_outcome_query":             handled inline.
         *   case "xproc_outcome_retrieve_similar":  handled inline.
         *   case "xproc_outcome_stats":             handled inline.
         *   case "xproc_outcome_clear":             handled inline.
         *
         * INFRA-NEURAL-LEDGER-MS1/P0-U03 (CrossProcessOutcomeStore replay):
         *   case "xproc_outcome_replay":           handled inline.
         *   case "xproc_outcome_replay_job":       handled inline.
         *   case "xproc_outcome_replay_since":     handled inline.
         *   case "xproc_outcome_stream_from_disk": handled inline.
         *
         * XPROC-NEURAL-T1-02 (CrossProcessNeuralLearningEngine):
         *   case "xproc_neural_train":     handled inline.
         *   case "xproc_neural_predict":   handled inline.
         *   case "xproc_neural_evaluate":  handled inline.
         *   case "xproc_neural_save":      handled inline.
         *   case "xproc_neural_load":      handled inline.
         *   case "xproc_neural_metrics":   handled inline.
         *   case "xproc_neural_reset":     handled inline.
         *
         * XPROC-NEURAL-T1-03 (CrossProcessTransferLearningEngine):
         *   case "xproc_transfer_classify": handled inline.
         *   case "xproc_transfer_pairs":    handled inline.
         *   case "xproc_transfer_check":    handled inline.
         *
         * XPROC-NEURAL-T1-04 (CrossProcessAttentionExplainEngine):
         *   case "xproc_attention_explain":         handled inline.
         *   case "xproc_attention_ece":             handled inline.
         *   case "xproc_attention_baseline_add":    handled inline.
         *   case "xproc_attention_anomaly":         handled inline.
         *   case "xproc_attention_baseline_get":    handled inline.
         *   case "xproc_attention_baseline_reset":  handled inline.
         *
         * XPROC-NEURAL-T1-05 (CrossProcessAGIBridge):
         *   case "xproc_agi_compose": handled inline.
         *
         * XPROC-NEURAL-OPTIMIZE/U-NN-FEAT03 (PhysicsFeatureExtractorEngine):
         *   case "xproc_physics_features":       handled inline.
         *   case "xproc_physics_features_batch": handled inline.
         *
         * XPROC-NEURAL-OPTIMIZE/U-NN-FEAT04 (WikiRAGFeatureEngine):
         *   case "xproc_rag_features":    handled inline.
         *   case "xproc_rag_clear_cache": handled inline.
         *
         * XPROC-NEURAL-OPTIMIZE/U-NN-LOOP01 (FeedbackBusEngine):
         *   case "xproc_feedbackbus_publish":          handled inline.
         *   case "xproc_feedbackbus_stats":            handled inline.
         *   case "xproc_feedbackbus_topics":           handled inline.
         *   case "xproc_feedbackbus_subscriber_count": handled inline.
         *   case "xproc_feedbackbus_reset":            handled inline.
         */

        // === XPROC-ROUTER-01: Cross-process pipeline router ===
        // Handle these actions inline before deprecation/core routing —
        // ProcessIntelligenceRouterEngine has its own request shape and
        // doesn't fit the IntelligenceEngine action map.
        // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-FORMULAS-EXPOSE — surface DigitalTwinFormulasEngine
        // case "digital_twin_ekf_predict":
        // case "digital_twin_ekf_update":
        // case "digital_twin_drift_detect":
        // case "digital_twin_divergence":
        // Four numerical methods for state estimation + drift detection that the
        // engine had planned but were never wired. EKF for sensor fusion, CUSUM
        // for shift detection, KL+RMSE for twin↔reality model divergence.
        if (action === "digital_twin_ekf_predict" ||
            action === "digital_twin_ekf_update" ||
            action === "digital_twin_drift_detect" ||
            action === "digital_twin_divergence") {
          const { digitalTwinFormulasEngine } = await import(
            "../../engines/DigitalTwinFormulasEngine.js"
          );
          let result;
          if (action === "digital_twin_ekf_predict") {
            result = digitalTwinFormulasEngine.ekfPredict(params as Parameters<typeof digitalTwinFormulasEngine.ekfPredict>[0]);
          } else if (action === "digital_twin_ekf_update") {
            result = digitalTwinFormulasEngine.ekfUpdate(params as Parameters<typeof digitalTwinFormulasEngine.ekfUpdate>[0]);
          } else if (action === "digital_twin_drift_detect") {
            result = digitalTwinFormulasEngine.driftDetect(params as Parameters<typeof digitalTwinFormulasEngine.driftDetect>[0]);
          } else {
            result = digitalTwinFormulasEngine.modelDivergence(params as Parameters<typeof digitalTwinFormulasEngine.modelDivergence>[0]);
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, result }),
            }],
          };
        }

        // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-EXPOSE — surface ProcessDigitalTwinEngine
        // case "digital_twin_compute":
        // Cascades 7 physics models (Kienzle force → deflection → temperature →
        // thermal growth → Taylor tool life → surface roughness → cost) into one
        // coupled prediction. Was previously orphan: zero dispatcher consumers.
        if (action === "digital_twin_compute") {
          const { processDigitalTwinEngine } = await import(
            "../../engines/ProcessDigitalTwinEngine.js"
          );
          // Engine accepts the full DigitalTwinInput shape; pass params through.
          // No legacy aliasing needed — this is a fresh action.
          const result = processDigitalTwinEngine.compute(params as Parameters<typeof processDigitalTwinEngine.compute>[0]);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action: "digital_twin_compute",
                result,
              }),
            }],
          };
        }

        if (action === "process_pipeline_stages") {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result: { stages } } },
          } as HookContext);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: stages.length, stages }) }],
          };
        }
        if (action === "process_route") {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          const intent = params.intent as string | undefined;
          if (typeof intent !== "string") {
            return dispatcherError(
              "process_route requires `intent` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          const routed = await ProcessIntelligenceRouterEngine.route({
            intent,
            process: params.process as ("mill" | "lathe" | "wedm") | undefined,
            features: params.features as string[] | undefined,
            material: params.material as string | undefined,
          });
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result: routed } },
          } as HookContext);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, ...routed }) }],
          };
        }
        // === INFRA-AGI-ROUTER-MS2/P1-U05: unified DomainAGIIntent dispatch ===
        // Exposes ProcessIntelligenceRouterEngine.orchestrate(intent) — the
        // structured-contract sibling of `process_route`. Callers hand a full
        // DomainAGIIntent (schemaVersion/domain/action/features/material/
        // constraints/consensusRequired); the router schema-gates it then
        // dispatches to the mill/lathe/wedm domain AGI. Unlike `process_route`
        // (free-text intent → keyword classification), this path is fully
        // typed end-to-end and returns a DomainAGIResult.
        // case "process_orchestrate":
        if (action === "process_orchestrate") {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          // The router re-validates the intent against DomainAGIIntentSchema
          // internally and returns a DomainAGIResult with success=false +
          // error.code=INVALID_INTENT on a bad payload — so a malformed
          // `params.intent` never throws here, it round-trips as a typed
          // failure result. We forward params.intent verbatim; the cast is
          // the dispatcher→engine boundary (engine owns validation, R8).
          const intent = (params.intent ?? params) as Parameters<
            typeof ProcessIntelligenceRouterEngine.orchestrate
          >[0];
          const result = await ProcessIntelligenceRouterEngine.orchestrate(intent);
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result } },
          } as HookContext);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.success, result }) }],
          };
        }
        // === XPROC-NEURAL-T1-01: Outcome store ===
        if (action === "xproc_outcome_record") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const id = crossProcessOutcomeStore.record({
            bridge: params.bridge as Parameters<typeof crossProcessOutcomeStore.record>[0]["bridge"],
            process: params.process as Parameters<typeof crossProcessOutcomeStore.record>[0]["process"],
            request_summary: params.request_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["request_summary"],
            response_summary: params.response_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["response_summary"],
            outcome: params.outcome as Parameters<typeof crossProcessOutcomeStore.record>[0]["outcome"],
            operator: params.operator as Parameters<typeof crossProcessOutcomeStore.record>[0]["operator"],
          });
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, id }) }] };
        }
        if (action === "xproc_outcome_record_outcome") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const id = params.id as string | undefined;
          const outcome = params.outcome as Parameters<typeof crossProcessOutcomeStore.recordOutcome>[1];
          if (!id) {
            return dispatcherError("xproc_outcome_record_outcome requires `id`", action, "prism_intelligence");
          }
          const ok = crossProcessOutcomeStore.recordOutcome(id, outcome);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, updated: ok }) }] };
        }
        if (action === "xproc_outcome_query") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const records = crossProcessOutcomeStore.query(params as Parameters<typeof crossProcessOutcomeStore.query>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: records.length, records }) }] };
        }
        if (action === "xproc_outcome_retrieve_similar") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const k = (params.k as number | undefined) ?? 5;
          const ctx = (params.context ?? params) as Parameters<typeof crossProcessOutcomeStore.retrieveSimilar>[0];
          const results = crossProcessOutcomeStore.retrieveSimilar(ctx, k);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: results.length, results }) }] };
        }
        if (action === "xproc_outcome_stats") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const stats = crossProcessOutcomeStore.stats();
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, ...stats }) }] };
        }
        if (action === "xproc_outcome_clear") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          crossProcessOutcomeStore.clear();
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true }) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-05 (2026-05-25, slot juliett):
        // FeatureStoreEngine — was UNWIRED; only reachable via hardcoded engine
        // imports in NN pipeline. These 3 inline-if handlers expose the
        // canonical query/put/stats surface to the MCP layer.
        //   case "feature_store_query": handled inline.
        //   case "feature_store_put":   handled inline.
        //   case "feature_store_stats": handled inline.
        if (action === "feature_store_query") {
          const { FeatureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
          const store = new FeatureStoreEngine();
          const result = store.getHistoricalFeatures(params as Parameters<typeof store.getHistoricalFeatures>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, ...result }) }] };
        }
        if (action === "feature_store_put") {
          const { FeatureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
          const store = new FeatureStoreEngine();
          const result = store.put(params as Parameters<typeof store.put>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }
        if (action === "feature_store_stats") {
          const { FeatureStoreEngine } = await import("../../engines/FeatureStoreEngine.js");
          const store = new FeatureStoreEngine();
          const result = store.stats();
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, ...result }) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-03 (2026-05-25, slot juliett):
        // CatalogUnifiedQueryEngine — cross-catalog match (material + tools +
        // coatings + machines in one call). Quoting/frontend intake surface.
        //   case "catalog_unified_match": handled inline.
        if (action === "catalog_unified_match") {
          const { catalogUnifiedQueryEngine } = await import("../../engines/CatalogUnifiedQueryEngine.js");
          const result = await catalogUnifiedQueryEngine.query(params as Parameters<typeof catalogUnifiedQueryEngine.query>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett):
        // MonolithUnifiedQuery — unified routing across 12 standalone Monolith*Engine
        // ports (controllers / machine_specs / stock_positions / roughing_configs /
        // macro_schema / fusion_posts + 6 catalog manifests). Closes BUILD_STATE's
        // "Monolith (9)" unwired gap. Returns the engine's native record shape +
        // {action, subject, ok, count} envelope.
        if (action === "monolith_query") {
          const subject = String(params.subject ?? "");
          const query = typeof params.query === "string" ? params.query.trim() : "";
          const id = typeof params.id === "string" ? params.id.trim() : "";
          const limit = typeof params.limit === "number" && Number.isInteger(params.limit)
            ? Math.min(50, Math.max(1, params.limit))
            : 20;

          let records: unknown[] = [];
          let single: unknown = null;
          let ok = true;
          let error: string | undefined;

          try {
            switch (subject) {
              case "controllers": {
                const { monolithControllerDatabaseEngine: e } = await import("../../engines/MonolithControllerDatabaseEngine.js");
                if (id) { single = e.getController(id); }
                else if (query) {
                  // Substring search across manufacturer + model + family
                  const q = query.toLowerCase();
                  records = e.listControllers()
                    .filter((c) => `${c.manufacturer} ${c.model} ${c.family} ${c.identification.short_name}`.toLowerCase().includes(q))
                    .slice(0, limit);
                } else { records = e.listControllers().slice(0, limit); }
                break;
              }
              case "machine_specs": {
                const { monolithMachineSpecStandardEngine: e } = await import("../../engines/MonolithMachineSpecStandardEngine.js");
                single = { template: e.emptySpec(), required_fields: e.requiredFields(), stats: e.stats() };
                break;
              }
              case "stock_positions": {
                const { monolithStockPositionsDatabaseEngine: e } = await import("../../engines/MonolithStockPositionsDatabaseEngine.js");
                if (id) { single = e.getPosition(id); }
                else if (query) {
                  const q = query.toLowerCase();
                  records = e.listPositions()
                    .filter((p) => `${p.id} ${p.desc}`.toLowerCase().includes(q))
                    .slice(0, limit);
                } else { records = e.listPositions().slice(0, limit); }
                break;
              }
              case "roughing_configs": {
                const { monolithRoughingMachineConfigsEngine: e } = await import("../../engines/MonolithRoughingMachineConfigsEngine.js");
                if (id) { single = e.getConfig(id); }
                else if (query) { records = e.search(query, limit); }
                else { records = e.list().slice(0, limit); }
                break;
              }
              case "macro_schema": {
                const { monolithMacroDatabaseSchemaEngine: e } = await import("../../engines/MonolithMacroDatabaseSchemaEngine.js");
                if (id) { single = e.getTable(id); }
                else { records = e.listTables().slice(0, limit); }
                break;
              }
              case "fusion_posts": {
                const { monolithFusionPostDatabaseEngine: e } = await import("../../engines/MonolithFusionPostDatabaseEngine.js");
                if (id) { single = e.getVendor(id); }
                else if (query) { records = e.search(query, limit); }
                else { records = e.listVendors().slice(0, limit); }
                break;
              }
              case "mfr_catalog": {
                const { monolithManufacturerCatalogManifestEngine: e } = await import("../../engines/MonolithManufacturerCatalogManifestEngine.js");
                if (id) { single = e.getCountsFor(id); }
                else { single = { manufacturers: e.listManufacturers(), with_inventory: e.listManufacturersWithInventory(), stats: e.getStats() }; }
                break;
              }
              case "gateway": {
                const { monolithFinalCatalogGatewayManifestEngine: e } = await import("../../engines/MonolithFinalCatalogGatewayManifestEngine.js");
                if (id) {
                  const route = e.getRoute(id);
                  const normalized = e.normalizeManufacturerKey(id);
                  single = route ?? (normalized ? { canonicalKey: normalized } : null);
                } else if (query) { records = e.listGatewayRoutes().filter((r) => r.route.toLowerCase().includes(query.toLowerCase())).slice(0, limit); }
                else { single = { manufacturers: e.listManufacturers(), sections: e.listCatalogSections(), routes: e.listGatewayRoutes(), stats: e.stats() }; }
                break;
              }
              case "zeni": {
                const { monolithZeniCatalogManifestEngine: e } = await import("../../engines/MonolithZeniCatalogManifestEngine.js");
                if (id) { single = e.getGrade(id) ?? e.getCuttingEnvelope(id); }
                else { single = { manufacturer: e.getManufacturer(), grades: e.listGrades(), cnmg_sizes: e.listCNMGSizes(), stats: e.stats() }; }
                break;
              }
              case "consolidated": {
                const { monolithConsolidatedCatalogManifestEngine: e } = await import("../../engines/MonolithConsolidatedCatalogManifestEngine.js");
                const numericId = id ? Number(id) : NaN;
                if (Number.isFinite(numericId)) { single = e.getGuhringChuckByClampingDia(numericId); }
                else if (id) { single = { categories: e.getCategoriesFor(id) }; }
                else { single = { metadata: e.getMetadata(), mfrs_by_category: e.getManufacturersByCategory(), guhring_chucks: e.listGuhringHydraulicChucks(), stats: e.stats() }; }
                break;
              }
              case "final": {
                const { monolithFinalCatalogManifestEngine: e } = await import("../../engines/MonolithFinalCatalogManifestEngine.js");
                const numericId = id ? Number(id) : NaN;
                if (Number.isFinite(numericId)) { single = e.getGuhringExtendedChuckByClampingDia(numericId); }
                else { single = { metadata: e.getMetadata(), extended_chucks: e.listGuhringExtendedChucks(), cat_series_4216: e.getCatSeries4216Metadata(), features: e.listGuhringHydraulicChuckFeatures(), stats: e.stats() }; }
                break;
              }
              case "major_mfrs": {
                const { monolithMajorManufacturersCatalogManifestEngine: e } = await import("../../engines/MonolithMajorManufacturersCatalogManifestEngine.js");
                if (id) { single = e.getManufacturer(id); }
                else if (query) {
                  const q = query.toLowerCase();
                  records = e.listManufacturers()
                    .filter((m) => `${m.name} ${m.country} ${m.specialty}`.toLowerCase().includes(q))
                    .slice(0, limit);
                } else { records = e.listManufacturers().slice(0, limit); }
                break;
              }
              default:
                ok = false;
                error = `Unknown subject: ${subject}. Use one of: controllers, machine_specs, stock_positions, roughing_configs, macro_schema, fusion_posts, mfr_catalog, gateway, zeni, consolidated, final, major_mfrs.`;
            }
          } catch (e) {
            ok = false;
            error = e instanceof Error ? e.message : String(e);
          }

          // R12 fail-loud: use loose != null so undefined (Map.get/Array.find miss)
          // does NOT slip into the single-shape branch and get dropped by
          // JSON.stringify({single: undefined}). Either single-shape with a real
          // record, or records-shape with count:0 — never the ambiguous middle.
          const payload = single != null
            ? { action, subject, ok, single, ...(error ? { error } : {}) }
            : { action, subject, ok, count: records.length, records, ...(error ? { error } : {}) };
          return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-CONSUMERS (2026-05-25, slot juliett):
        // CatalogConsumerAdapterEngine — 8-consumer adapter (speedfeed/post/
        // masterpost/{mill,lathe,wedm}_wizard/quoting/cadcam) with consumer-
        // specific extras.
        //   case "catalog_resolve_for_consumer": handled inline.
        if (action === "catalog_resolve_for_consumer") {
          const { catalogConsumerAdapter } = await import("../../engines/CatalogConsumerAdapterEngine.js");
          const result = await catalogConsumerAdapter.resolve(params as Parameters<typeof catalogConsumerAdapter.resolve>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-SCORE (2026-05-25, slot juliett):
        // MachineQualityScoreEngine — 0-100 composite + accuracy_compensation_factor.
        //   case "machine_quality_score": handled inline.
        //   case "machine_quality_audit": handled inline.
        if (action === "machine_quality_score") {
          const { machineQualityScoreEngine } = await import("../../engines/MachineQualityScoreEngine.js");
          const result = await machineQualityScoreEngine.score(params as Parameters<typeof machineQualityScoreEngine.score>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }
        if (action === "machine_quality_audit") {
          const { machineQualityScoreEngine } = await import("../../engines/MachineQualityScoreEngine.js");
          const result = await machineQualityScoreEngine.audit();
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }

        // JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS Phase 5 (2026-05-25):
        // Wire machine quality into 5 consumer surfaces + ROI upgrade-vs-outsource.
        //   case "machine_quality_for_consumer": handled inline.
        //   case "machine_compare_upgrade_outsource": handled inline.
        if (action === "machine_quality_for_consumer") {
          const { machineQualityForConsumer } = await import("../../engines/MachineQualityScoreEngine.js");
          const result = await machineQualityForConsumer(params as Parameters<typeof machineQualityForConsumer>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }
        if (action === "machine_compare_upgrade_outsource") {
          const { machineCompareUpgradeOutsource } = await import("../../engines/MachineQualityScoreEngine.js");
          const result = await machineCompareUpgradeOutsource(params as Parameters<typeof machineCompareUpgradeOutsource>[0]);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: result.ok, ...result }) }] };
        }

        // === INFRA-NEURAL-LEDGER-MS1/P0-U03: replay capability ===
        if (action === "xproc_outcome_replay") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const limit = params.limit;
          const records =
            limit === undefined
              ? crossProcessOutcomeStore.replay()
              : crossProcessOutcomeStore.replay(limit as number);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: records.length, records }) }] };
        }
        if (action === "xproc_outcome_replay_job") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const jobId = params.jobId as string | undefined;
          if (!jobId) throw new Error("xproc_outcome_replay_job requires `jobId`");
          const records = crossProcessOutcomeStore.replayJob(jobId);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: records.length, records }) }] };
        }
        if (action === "xproc_outcome_replay_since") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const timestamp = params.timestamp as string | undefined;
          if (!timestamp) throw new Error("xproc_outcome_replay_since requires `timestamp`");
          const records = crossProcessOutcomeStore.replaySince(timestamp);
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: records.length, records }) }] };
        }
        if (action === "xproc_outcome_stream_from_disk") {
          const { crossProcessOutcomeStore } = await import(
            "../../engines/CrossProcessOutcomeStore.js"
          );
          const collected: unknown[] = [];
          const observed = await crossProcessOutcomeStore.streamReplayFromDisk({
            handler: (e) => {
              collected.push(e);
            },
            limit: params.limit as number | undefined,
            jobId: params.jobId as string | undefined,
            since: params.since as string | undefined,
          });
          return { content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, count: observed, records: collected }) }] };
        }

        // === XPROC-NEURAL-T1-02: MLP classifier over OutcomeStore ===
        if (action === "xproc_neural_train") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const records = (params.records as Parameters<
            typeof crossProcessNeuralLearningEngine.train
          >[0]) ?? [];
          const opts = (params.opts as Parameters<
            typeof crossProcessNeuralLearningEngine.train
          >[1]) ?? undefined;
          const result = crossProcessNeuralLearningEngine.train(records, opts);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...result }),
            }],
          };
        }
        if (action === "xproc_neural_predict") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const record = params.record as Parameters<
            typeof crossProcessNeuralLearningEngine.predictFromRecord
          >[0] | undefined;
          if (!record) {
            return dispatcherError(
              "xproc_neural_predict requires `record`",
              action,
              "prism_intelligence",
            );
          }
          const result = crossProcessNeuralLearningEngine.predictFromRecord(record);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...result }),
            }],
          };
        }
        if (action === "xproc_neural_evaluate") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const records = (params.records as Parameters<
            typeof crossProcessNeuralLearningEngine.evaluate
          >[0]) ?? [];
          const result = crossProcessNeuralLearningEngine.evaluate(records);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...result }),
            }],
          };
        }
        if (action === "xproc_neural_save") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const filePath = params.path as string | undefined;
          if (typeof filePath !== "string" || filePath.length === 0) {
            return dispatcherError(
              "xproc_neural_save requires `path` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          crossProcessNeuralLearningEngine.saveTo(filePath);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, path: filePath }),
            }],
          };
        }
        if (action === "xproc_neural_load") {
          const { CrossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const filePath = params.path as string | undefined;
          if (typeof filePath !== "string" || filePath.length === 0) {
            return dispatcherError(
              "xproc_neural_load requires `path` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          const loaded = CrossProcessNeuralLearningEngine.loadFrom(filePath);
          const metrics = loaded.getMetrics();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, path: filePath, metrics }),
            }],
          };
        }
        if (action === "xproc_neural_metrics") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const metrics = crossProcessNeuralLearningEngine.getMetrics();
          const config = crossProcessNeuralLearningEngine.getConfig();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, metrics, config }),
            }],
          };
        }
        if (action === "xproc_neural_reset") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const seed = params.seed as number | undefined;
          crossProcessNeuralLearningEngine.reset(seed);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, seed: seed ?? null }),
            }],
          };
        }

        // === XPROC-NEURAL-T1-03: Material-cluster transfer learning ===
        // Note: actual weight-surgery transfer() requires an in-process donor
        // engine reference and is exposed via the engine singleton. Dispatcher
        // surfaces read-only classification + trusted-pair queries.
        if (action === "xproc_transfer_classify") {
          const { crossProcessTransferLearningEngine } = await import(
            "../../engines/CrossProcessTransferLearningEngine.js"
          );
          const material = params.material as string | undefined;
          if (typeof material !== "string") {
            return dispatcherError(
              "xproc_transfer_classify requires `material` (string)",
              action,
              "prism_intelligence",
            );
          }
          const cluster = crossProcessTransferLearningEngine.classifyMaterial(material);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, material, cluster }),
            }],
          };
        }
        if (action === "xproc_transfer_pairs") {
          const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import(
            "../../engines/CrossProcessTransferLearningEngine.js"
          );
          const pairs = crossProcessTransferLearningEngine.listTransferPairs();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                pairs,
                clusters: MATERIAL_CLUSTERS,
                count: pairs.length,
              }),
            }],
          };
        }
        if (action === "xproc_transfer_check") {
          const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import(
            "../../engines/CrossProcessTransferLearningEngine.js"
          );
          const source = params.source as string | undefined;
          const target = params.target as string | undefined;
          if (typeof source !== "string" || typeof target !== "string") {
            return dispatcherError(
              "xproc_transfer_check requires `source` and `target` cluster strings",
              action,
              "prism_intelligence",
            );
          }
          // Accept cluster ids verbatim; otherwise classify as material name.
          // Pre-check is necessary because some cluster ids (e.g.
          // "hardened_steel") contain a substring ("steel") that the
          // classifier maps to a *different* cluster (carbon_steel).
          const validClusters = MATERIAL_CLUSTERS as readonly string[];
          const sourceCluster = validClusters.includes(source)
            ? (source as (typeof MATERIAL_CLUSTERS)[number])
            : crossProcessTransferLearningEngine.classifyMaterial(source);
          const targetCluster = validClusters.includes(target)
            ? (target as (typeof MATERIAL_CLUSTERS)[number])
            : crossProcessTransferLearningEngine.classifyMaterial(target);
          const trusted =
            sourceCluster && targetCluster
              ? crossProcessTransferLearningEngine.isTrustedPair(
                  sourceCluster,
                  targetCluster,
                )
              : false;
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                source,
                target,
                sourceCluster,
                targetCluster,
                trusted,
              }),
            }],
          };
        }

        // === ORCH-MULTIDOMAIN-MS11: cross-domain orchestration =========
        // Wired as inline if-blocks (matches the surrounding XPROC pattern in
        // this dispatcher); scanner-friendly case-markers below ensure
        // stop_on_unwired_assets.mjs detects the wiring.
        // case "orch_multidomain_plan":
        // case "orch_multidomain_summarize":
        // case "orch_multidomain_feature_map":
        if (action === "orch_multidomain_plan") {
          const { crossDomainOrchestratorEngine } = await import(
            "../../engines/CrossDomainOrchestratorEngine.js"
          );
          const features = params.features;
          if (!Array.isArray(features) || features.length === 0) {
            return dispatcherError(
              "orch_multidomain_plan requires `features` (non-empty array)",
              action,
              "prism_intelligence",
            );
          }
          const plan = crossDomainOrchestratorEngine.planJob({
            features: features as Parameters<typeof crossDomainOrchestratorEngine.planJob>[0]["features"],
            preferred_domains: params.preferred_domains as Parameters<
              typeof crossDomainOrchestratorEngine.planJob
            >[0]["preferred_domains"],
            feature_time_estimates_sec: params.feature_time_estimates_sec as Parameters<
              typeof crossDomainOrchestratorEngine.planJob
            >[0]["feature_time_estimates_sec"],
            job_id: typeof params.job_id === "string" ? params.job_id : undefined,
          });
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, plan }),
            }],
          };
        }
        if (action === "orch_multidomain_summarize") {
          const { crossDomainOrchestratorEngine } = await import(
            "../../engines/CrossDomainOrchestratorEngine.js"
          );
          const plan = params.plan;
          if (!plan || typeof plan !== "object") {
            return dispatcherError(
              "orch_multidomain_summarize requires `plan` (OrchestrationPlan object)",
              action,
              "prism_intelligence",
            );
          }
          const summary = crossDomainOrchestratorEngine.summarize(
            plan as Parameters<typeof crossDomainOrchestratorEngine.summarize>[0],
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, summary }),
            }],
          };
        }
        if (action === "orch_multidomain_feature_map") {
          const { crossDomainOrchestratorEngine } = await import(
            "../../engines/CrossDomainOrchestratorEngine.js"
          );
          const map = crossDomainOrchestratorEngine.getFeatureDomainMap();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, feature_domain_map: map }),
            }],
          };
        }

        // === PSN-SYNERGY-INSPECT-MS0: cross-leg coverage meta-engine =====
        // case "psn_synergy_inspect":
        // case "psn_synergy_summarize":
        // case "psn_synergy_legs":
        if (action === "psn_synergy_inspect") {
          const { psnSynergyInspectorEngine } = await import(
            "../../engines/PSNSynergyInspectorEngine.js"
          );
          const inventories = params.inventories;
          if (!Array.isArray(inventories) || inventories.length === 0) {
            return dispatcherError(
              "psn_synergy_inspect requires `inventories` (non-empty array of PSNLegInventory)",
              action,
              "prism_intelligence",
            );
          }
          const report = psnSynergyInspectorEngine.inspect(
            inventories as Parameters<typeof psnSynergyInspectorEngine.inspect>[0],
            {
              topK: typeof params.top_k === "number" ? params.top_k : undefined,
              densityFloor: typeof params.density_floor === "number" ? params.density_floor : undefined,
            },
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, report }),
            }],
          };
        }
        if (action === "psn_synergy_summarize") {
          const { psnSynergyInspectorEngine } = await import(
            "../../engines/PSNSynergyInspectorEngine.js"
          );
          const report = params.report;
          if (!report || typeof report !== "object") {
            return dispatcherError(
              "psn_synergy_summarize requires `report` (SynergyReport object)",
              action,
              "prism_intelligence",
            );
          }
          const summary = psnSynergyInspectorEngine.summarize(
            report as Parameters<typeof psnSynergyInspectorEngine.summarize>[0],
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, summary }),
            }],
          };
        }
        if (action === "psn_synergy_legs") {
          const { psnSynergyInspectorEngine } = await import(
            "../../engines/PSNSynergyInspectorEngine.js"
          );
          const legs = psnSynergyInspectorEngine.getPSNLegs();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, legs }),
            }],
          };
        }

        // === XPROC-NEURAL-T1-04: LIME + ECE + L1 anomaly attention/explain ===
        // All actions use the in-process T1-02 singleton as the donor model.
        if (action === "xproc_attention_explain") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          const record = params.record as Parameters<
            typeof crossProcessNeuralLearningEngine.featurize
          >[0] | undefined;
          if (!record) {
            return dispatcherError(
              "xproc_attention_explain requires `record`",
              action,
              "prism_intelligence",
            );
          }
          const opts = (params.opts as Parameters<
            typeof crossProcessAttentionExplainEngine.explainPrediction
          >[2]) ?? undefined;
          const out = crossProcessAttentionExplainEngine.explainPrediction(
            crossProcessNeuralLearningEngine,
            record,
            opts,
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }
        if (action === "xproc_attention_ece") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          const records = (params.records as Parameters<
            typeof crossProcessAttentionExplainEngine.computeECE
          >[1]) ?? [];
          const numBins = params.numBins as number | undefined;
          const out = crossProcessAttentionExplainEngine.computeECE(
            crossProcessNeuralLearningEngine,
            records,
            numBins,
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }
        if (action === "xproc_attention_baseline_add") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          const records = (params.records as Parameters<
            typeof crossProcessAttentionExplainEngine.registerBaseline
          >[1]) ?? [];
          const out = crossProcessAttentionExplainEngine.registerBaseline(
            crossProcessNeuralLearningEngine,
            records,
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }
        if (action === "xproc_attention_anomaly") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          const record = params.record as Parameters<
            typeof crossProcessAttentionExplainEngine.scoreAnomaly
          >[1] | undefined;
          if (!record) {
            return dispatcherError(
              "xproc_attention_anomaly requires `record`",
              action,
              "prism_intelligence",
            );
          }
          const threshold = params.threshold as number | undefined;
          const out = crossProcessAttentionExplainEngine.scoreAnomaly(
            crossProcessNeuralLearningEngine,
            record,
            threshold,
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }
        if (action === "xproc_attention_baseline_get") {
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          const out = crossProcessAttentionExplainEngine.getBaseline();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }
        if (action === "xproc_attention_baseline_reset") {
          const { crossProcessAttentionExplainEngine } = await import(
            "../../engines/CrossProcessAttentionExplainEngine.js"
          );
          crossProcessAttentionExplainEngine.resetBaseline();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true }),
            }],
          };
        }

        // === XPROC-NEURAL-T1-05: AGI bridge composer ===
        if (action === "xproc_agi_compose") {
          const { crossProcessNeuralLearningEngine } = await import(
            "../../engines/CrossProcessNeuralLearningEngine.js"
          );
          const { crossProcessAGIBridge } = await import(
            "../../engines/CrossProcessAGIBridge.js"
          );
          const reqParam = params.request as Parameters<
            typeof crossProcessAGIBridge.compose
          >[1] | undefined;
          if (!reqParam || typeof reqParam !== "object" || typeof reqParam.intent !== "string") {
            return dispatcherError(
              "xproc_agi_compose requires `request` with `intent` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          const opts = (params.opts as Parameters<
            typeof crossProcessAGIBridge.compose
          >[2]) ?? undefined;
          const out = crossProcessAGIBridge.compose(
            crossProcessNeuralLearningEngine,
            reqParam,
            opts,
          );
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }

        // === XPROC-NEURAL-OPTIMIZE/U-NN-FEAT03: PhysicsFeatureExtractorEngine ===
        // Returns 5 physics features per OutcomeRecord:
        //   0. kienzle_force_N   (Fc = kc1_1 · ap · h^(1-mc))
        //   1. taylor_life_min   (T  = (C/Vc)^(1/n))
        //   2. chatter_risk_idx  (ap/D slenderness proxy)
        //   3. surface_ra_um     (Brammertz fz²/(32·r))
        //   4. thermal_load_W    (Fc · Vc / 60)
        if (action === "xproc_physics_features") {
          const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_INDEX } =
            await import("../../engines/PhysicsFeatureExtractorEngine.js");
          const record = params.record as Parameters<
            typeof PhysicsFeatureExtractorEngine.extract
          >[0] | undefined;
          if (!record) {
            return dispatcherError(
              "xproc_physics_features requires `record`",
              action,
              "prism_intelligence",
            );
          }
          const features = PhysicsFeatureExtractorEngine.extract(record);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                features: Array.from(features),
                index: PHYSICS_FEATURE_INDEX,
              }),
            }],
          };
        }
        if (action === "xproc_physics_features_batch") {
          const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_DIM } =
            await import("../../engines/PhysicsFeatureExtractorEngine.js");
          const records = params.records as Parameters<
            typeof PhysicsFeatureExtractorEngine.extractBatch
          >[0] | undefined;
          if (!Array.isArray(records)) {
            return dispatcherError(
              "xproc_physics_features_batch requires `records` (array)",
              action,
              "prism_intelligence",
            );
          }
          const flat = PhysicsFeatureExtractorEngine.extractBatch(records);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                features: Array.from(flat),
                rows: records.length,
                cols: PHYSICS_FEATURE_DIM,
              }),
            }],
          };
        }

        // === XPROC-NEURAL-OPTIMIZE/U-NN-FEAT04: WikiRAGFeatureEngine ===
        // 8 features per OutcomeRecord: tip count, top/avg confidence,
        // 5 category indicators (force, surface, chatter, thermal, tool_life).
        if (action === "xproc_rag_features") {
          const { WikiRAGFeatureEngine, RAG_FEATURE_INDEX } =
            await import("../../engines/WikiRAGFeatureEngine.js");
          const record = params.record as Parameters<
            typeof WikiRAGFeatureEngine.extractRAGFeatures
          >[0] | undefined;
          if (!record) {
            return dispatcherError(
              "xproc_rag_features requires `record`",
              action,
              "prism_intelligence",
            );
          }
          const features = WikiRAGFeatureEngine.extractRAGFeatures(record);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                features: Array.from(features),
                index: RAG_FEATURE_INDEX,
                cacheSize: WikiRAGFeatureEngine.cacheSize(),
                tipsLoaded: WikiRAGFeatureEngine.tipsLoaded(),
              }),
            }],
          };
        }
        if (action === "xproc_rag_clear_cache") {
          const { WikiRAGFeatureEngine } =
            await import("../../engines/WikiRAGFeatureEngine.js");
          WikiRAGFeatureEngine.clearCache();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                cleared: true,
              }),
            }],
          };
        }

        // XPROC-NEURAL-OPTIMIZE/U-NN-LOOP01: FeedbackBusEngine pub/sub control plane.
        if (action === "xproc_feedbackbus_publish") {
          const { feedbackBusEngine } =
            await import("../../engines/FeedbackBusEngine.js");
          const topic = params.topic;
          if (typeof topic !== "string" || topic.length === 0) {
            return dispatcherError(
              "xproc_feedbackbus_publish requires `topic` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          if (topic === "*") {
            return dispatcherError(
              "xproc_feedbackbus_publish: cannot publish to wildcard '*'",
              action,
              "prism_intelligence",
            );
          }
          feedbackBusEngine.publish(topic, params.payload);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                topic,
                subscriberCount: feedbackBusEngine.subscriberCount(topic),
              }),
            }],
          };
        }
        if (action === "xproc_feedbackbus_stats") {
          const { feedbackBusEngine } =
            await import("../../engines/FeedbackBusEngine.js");
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                stats: feedbackBusEngine.stats(),
              }),
            }],
          };
        }
        if (action === "xproc_feedbackbus_topics") {
          const { feedbackBusEngine } =
            await import("../../engines/FeedbackBusEngine.js");
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                topics: feedbackBusEngine.topics(),
              }),
            }],
          };
        }
        if (action === "xproc_feedbackbus_subscriber_count") {
          const { feedbackBusEngine } =
            await import("../../engines/FeedbackBusEngine.js");
          const topic = params.topic;
          if (typeof topic !== "string" || topic.length === 0) {
            return dispatcherError(
              "xproc_feedbackbus_subscriber_count requires `topic` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                topic,
                count: feedbackBusEngine.subscriberCount(topic),
              }),
            }],
          };
        }
        if (action === "xproc_feedbackbus_reset") {
          const { feedbackBusEngine } =
            await import("../../engines/FeedbackBusEngine.js");
          feedbackBusEngine.reset();
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action,
                success: true,
                reset: true,
              }),
            }],
          };
        }

        if (action === "process_full_pipeline") {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          const intent = params.intent as string | undefined;
          if (typeof intent !== "string") {
            return dispatcherError(
              "process_full_pipeline requires `intent` (non-empty string)",
              action,
              "prism_intelligence",
            );
          }
          const result = await ProcessIntelligenceRouterEngine.fullPipeline({
            intent,
            process: params.process as ("mill" | "lathe" | "wedm") | undefined,
            features: params.features as string[] | undefined,
            material: params.material as string | undefined,
            feature_request: params.feature_request as Parameters<
              typeof ProcessIntelligenceRouterEngine.fullPipeline
            >[0]["feature_request"],
            sf_request: params.sf_request as Parameters<
              typeof ProcessIntelligenceRouterEngine.fullPipeline
            >[0]["sf_request"],
            post_request: params.post_request as Parameters<
              typeof ProcessIntelligenceRouterEngine.fullPipeline
            >[0]["post_request"],
            ai_request: params.ai_request as Parameters<
              typeof ProcessIntelligenceRouterEngine.fullPipeline
            >[0]["ai_request"],
            stages: params.stages as Parameters<
              typeof ProcessIntelligenceRouterEngine.fullPipeline
            >[0]["stages"],
            force_ai_dry_run: params.force_ai_dry_run as boolean | undefined,
          });
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result } },
          } as HookContext);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ action, success: true, ...result }) }],
          };
        }

        // === CHECK DEPRECATION FORWARDING (SYS-MS1) ===
        const forwarded = await forwardToNewDispatcher(action, params);
        if (forwarded) {
          log.warn(`[prism_intelligence] DEPRECATED: '${action}' moved to ${forwarded.dispatcher}. Use ${forwarded.dispatcher} instead.`);
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            target: { ...hookCtx.target, data: { ...params, result: forwarded.result } },
          } as HookContext);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                action, ...forwarded.result,
                _deprecation: `Action '${action}' has moved to ${forwarded.dispatcher}. Please use ${forwarded.dispatcher} directly.`,
              }),
            }],
          };
        }

        // === EXECUTE CORE ACTION ===
        const CORE_ROUTING: Record<string, string> = {
          job_record: "jobLearning", job_insights: "jobLearning",
          diagnose_failure: "diagnosticReasoning",
          algorithm_select: "algorithmGateway",
          machine_utilization: "shopScheduler",
          decompose_intent: "intentEngine",
          format_response: "responseFormatter",
          workflow_match: "workflowChains", workflow_get: "workflowChains", workflow_list: "workflowChains",
          onboarding_welcome: "onboardingEngine", onboarding_state: "onboardingEngine",
          onboarding_record: "onboardingEngine", onboarding_suggestion: "onboardingEngine", onboarding_reset: "onboardingEngine",
          setup_sheet_format: "setupSheetEngine", setup_sheet_template: "setupSheetEngine",
          conversation_context: "conversationalMemory", conversation_transition: "conversationalMemory",
          job_start: "conversationalMemory", job_update: "conversationalMemory", job_find: "conversationalMemory",
          job_resume: "conversationalMemory", job_complete: "conversationalMemory", job_list_recent: "conversationalMemory",
          skill_list: "userWorkflowSkills", skill_get: "userWorkflowSkills", skill_search: "userWorkflowSkills",
          skill_match: "userWorkflowSkills", skill_steps: "userWorkflowSkills", skill_for_persona: "userWorkflowSkills",
          assist_list: "userAssistanceSkills", assist_get: "userAssistanceSkills", assist_search: "userAssistanceSkills",
          assist_match: "userAssistanceSkills", assist_explain: "userAssistanceSkills", assist_confidence: "userAssistanceSkills",
          assist_mistakes: "userAssistanceSkills", assist_safety: "userAssistanceSkills",
          // IntelligenceAmplificationEngine (WIRE-INTAMP-MS0/U-WIRE-INTAMP) — tribal-knowledge amplification (formula+tribal+MIT+JM Die)
          ia_amplify: "intelligenceAmplification",
          ia_get_source: "intelligenceAmplification",
          ia_list_sources: "intelligenceAmplification",
          // AI Feature Auto-Registry (U-AI-WIRE)
          ai_feature_discover: "aiFeatureRegistry", ai_feature_find: "aiFeatureRegistry", ai_feature_route: "aiFeatureRegistry",
          ai_feature_list: "aiFeatureRegistry", ai_domain_list: "aiFeatureRegistry", ai_feature_stats: "aiFeatureRegistry",
          ai_feature_by_category: "aiFeatureRegistry",
          // AI System Router (U-WIRE-ROUTER)
          ai_route_task: "aiSystemRouter", ai_classify_task: "aiSystemRouter", ai_backend_health: "aiSystemRouter",
          ai_backend_probe: "aiSystemRouter", ai_router_stats: "aiSystemRouter",
          // Autonomous AI Orchestration (U-WIRE-ORCH)
          ai_orchestrate_autonomous: "autonomousOrchestration", ai_select_skills: "autonomousOrchestration",
          ai_select_algorithms: "autonomousOrchestration", ai_select_formulas: "autonomousOrchestration",
          ai_knowledge_plan: "autonomousOrchestration", ai_query_mit: "autonomousOrchestration",
          ai_query_catalogs: "autonomousOrchestration", ai_generate_gsd: "autonomousOrchestration",
          ai_orchestration_history: "autonomousOrchestration", ai_orchestration_stats: "autonomousOrchestration",
          ai_orchestration_summary: "autonomousOrchestration",
          // XPROC-NEURAL Tier 8 (T8-01) — Symbolic Constraint Enforcer
          xproc_symbolic_project: "xprocSymbolicEnforcer",
          xproc_symbolic_violations: "xprocSymbolicEnforcer",
          // XPROC-NEURAL Tier 8 (T8-03) — Neuro-Symbolic Safety Verifier
          xproc_safety_verify: "xprocSafetyVerifier",
          xproc_safety_escalate: "xprocSafetyVerifier",
          // XPROC-NEURAL Tier 9 (T9-01..T9-04) — Causal Inference Suite
          xproc_causal_learn_dag: "xprocCausalLearner",
          xproc_causal_test_independence: "xprocCausalLearner",
          xproc_causal_export_graph: "xprocCausalLearner",
          xproc_do_identify: "xprocDoCalculus",
          xproc_do_intervene: "xprocDoCalculus",
          xproc_counterfactual_query: "xprocCounterfactual",
          xproc_mediation_decompose: "xprocMediation",
          xproc_mediation_path_strength: "xprocMediation",
          xproc_active_select: "xprocUncertainty",
          xproc_active_rationale: "xprocUncertainty",
          xproc_novelty_score: "xprocNovelty",
          xproc_novelty_alert: "xprocNovelty",
          xproc_curiosity_propose: "xprocCuriosity",
          xproc_curiosity_score: "xprocCuriosity",
          xproc_doe_plan: "xprocDOE",
          xproc_doe_evaluate_completion: "xprocDOE",
          xproc_route_query: "xprocTierRouter",
          xproc_route_explain: "xprocTierRouter",
          xproc_orchestrate_full: "xprocOrchestrator",
          xproc_orchestrate_brief: "xprocOrchestrator",
          xproc_extract_rules: "xprocRuleExtracted",
          xproc_rule_explain_prediction: "xprocRuleExtracted",
          xproc_blend_predict: "xprocFormulaNeural",
          xproc_blend_weight_report: "xprocFormulaNeural",
          // XPROC-NEURAL Tier 2 (T2-01) — Episodic Memory
          xproc_episodic_store: "xprocEpisodicMemory",
          xproc_episodic_recall: "xprocEpisodicMemory",
          xproc_episodic_stats: "xprocEpisodicMemory",
          // XPROC-NEURAL Tier 2 (T2-02) — Prioritized Experience Replay
          xproc_replay_add: "xprocPrioritizedReplay",
          xproc_replay_sample: "xprocPrioritizedReplay",
          xproc_replay_update_priority: "xprocPrioritizedReplay",
          xproc_replay_stats: "xprocPrioritizedReplay",
          // XPROC-NEURAL Tier 2 (T2-03) — Stratified Replay Sampler
          xproc_replay_balanced_batch: "xprocReplaySampler",
          xproc_replay_default_clusters: "xprocReplaySampler",
          // XPROC-NEURAL Tier 2 (T2-04) — Episodic↔Semantic Linker
          xproc_episodic_semantic_join: "xprocSemanticLinker",
          // XPROC-NEURAL Tier 3 (T3-01) — Online MLP Updater (Adam)
          xproc_online_update: "xprocOnlineMLP",
          xproc_online_init_state: "xprocOnlineMLP",
          xproc_online_constants: "xprocOnlineMLP",
          // XPROC-NEURAL Tier 3 (T3-02) — Drift Detector (DDM/EDDM/ADWIN)
          xproc_drift_observe: "xprocDriftDetector",
          xproc_drift_observe_batch: "xprocDriftDetector",
          xproc_drift_history: "xprocDriftDetector",
          xproc_drift_reset: "xprocDriftDetector",
          xproc_drift_constants: "xprocDriftDetector",
          // XPROC-NEURAL Tier 3 (T3-03) — Concept Shift Handler
          xproc_shift_decide: "xprocShiftHandler",
          xproc_shift_history: "xprocShiftHandler",
          xproc_shift_reset: "xprocShiftHandler",
          xproc_shift_constants: "xprocShiftHandler",
          // XPROC-NEURAL Tier 3 (T3-04) — EWC++ memory preservation
          xproc_ewc_compute_fisher: "xprocEWC",
          xproc_ewc_reg_loss: "xprocEWC",
          xproc_ewc_consolidate: "xprocEWC",
          xproc_ewc_get_fisher: "xprocEWC",
          xproc_ewc_reset: "xprocEWC",
          xproc_ewc_constants: "xprocEWC",
          // XPROC-NEURAL Tier 4 (T4-01) — Reward Shaper
          xproc_reward_shape: "xprocRewardShaper",
          xproc_reward_audit: "xprocRewardShaper",
          xproc_reward_default_weights: "xprocRewardShaper",
          xproc_reward_constants: "xprocRewardShaper",
          // XPROC-NEURAL Tier 4 (T4-02) — Policy Gradient (REINFORCE)
          xproc_policy_step: "xprocPolicyGradient",
          xproc_policy_commit: "xprocPolicyGradient",
          xproc_policy_select_action: "xprocPolicyGradient",
          xproc_policy_get_policy: "xprocPolicyGradient",
          xproc_policy_get_baseline: "xprocPolicyGradient",
          xproc_policy_configure: "xprocPolicyGradient",
          xproc_policy_reset: "xprocPolicyGradient",
          xproc_policy_stats: "xprocPolicyGradient",
          xproc_policy_constants: "xprocPolicyGradient",
          // XPROC-NEURAL Tier 4 (T4-03) — Q-Learning Tabular
          xproc_qlearn_update: "xprocQLearning",
          xproc_qlearn_argmax: "xprocQLearning",
          xproc_qlearn_epsilon_greedy: "xprocQLearning",
          xproc_qlearn_get_q_row: "xprocQLearning",
          xproc_qlearn_configure: "xprocQLearning",
          xproc_qlearn_reset: "xprocQLearning",
          xproc_qlearn_stats: "xprocQLearning",
          xproc_qlearn_constants: "xprocQLearning",
          // XPROC-NEURAL Tier 4 (T4-04) — Multi-Armed Bandit
          xproc_bandit_register_arm: "xprocBandit",
          xproc_bandit_select: "xprocBandit",
          xproc_bandit_update: "xprocBandit",
          xproc_bandit_stats: "xprocBandit",
          xproc_bandit_reset: "xprocBandit",
          xproc_bandit_constants: "xprocBandit",
          // XPROC-NEURAL Tier 5 (T5-01) — Bayesian MLP via MC Dropout
          xproc_bayes_predict: "xprocBayesianMLP",
          xproc_bayes_uncertainty: "xprocBayesianMLP",
          xproc_bayes_constants: "xprocBayesianMLP",
          // XPROC-NEURAL Tier 5 (T5-02) — Inductive Conformal Prediction
          xproc_conformal_calibrate: "xprocConformal",
          xproc_conformal_set: "xprocConformal",
          xproc_conformal_stats: "xprocConformal",
          xproc_conformal_reset: "xprocConformal",
          xproc_conformal_constants: "xprocConformal",
          // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL01 — Conformal Classification (LAC)
          xproc_conformal_classify_calibrate: "xprocConformalClassify",
          xproc_conformal_classify_set: "xprocConformalClassify",
          xproc_conformal_classify_stats: "xprocConformalClassify",
          xproc_conformal_classify_reset: "xprocConformalClassify",
          xproc_conformal_classify_constants: "xprocConformalClassify",
          // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL02 — Calibration Drift Monitor
          xproc_calibration_monitor_configure: "xprocCalibrationMonitor",
          xproc_calibration_monitor_record: "xprocCalibrationMonitor",
          xproc_calibration_monitor_status: "xprocCalibrationMonitor",
          xproc_calibration_monitor_reset: "xprocCalibrationMonitor",
          xproc_calibration_monitor_constants: "xprocCalibrationMonitor",
          // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL03 — APS adaptive prediction sets
          xproc_aps_calibrate: "xprocAPS",
          xproc_aps_set: "xprocAPS",
          xproc_aps_stats: "xprocAPS",
          xproc_aps_reset: "xprocAPS",
          xproc_aps_constants: "xprocAPS",
          // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL04 — RAPS regularized adaptive sets
          xproc_raps_calibrate: "xprocRAPS",
          xproc_raps_set: "xprocRAPS",
          xproc_raps_stats: "xprocRAPS",
          xproc_raps_reset: "xprocRAPS",
          xproc_raps_constants: "xprocRAPS",
          // XPROC-NEURAL-OPTIMIZE/U-NN-CONFORMAL05 — prediction-log bridge
          xproc_predlog_log: "xprocPredLog",
          xproc_predlog_pair: "xprocPredLog",
          xproc_predlog_prune: "xprocPredLog",
          xproc_predlog_configure: "xprocPredLog",
          xproc_predlog_status: "xprocPredLog",
          xproc_predlog_pending_ids: "xprocPredLog",
          xproc_predlog_enable_autosync: "xprocPredLog",
          xproc_predlog_disable_autosync: "xprocPredLog",
          xproc_predlog_reset: "xprocPredLog",
          xproc_predlog_constants: "xprocPredLog",
          // XPROC-NEURAL-OPTIMIZE/U-NN-MONDRIAN01 — class-conditional Mondrian
          xproc_mondrian_calibrate: "xprocMondrian",
          xproc_mondrian_set: "xprocMondrian",
          xproc_mondrian_stats: "xprocMondrian",
          xproc_mondrian_reset: "xprocMondrian",
          xproc_mondrian_constants: "xprocMondrian",
          // XPROC-NEURAL Tier 5 (T5-03) — Deep Ensemble
          xproc_ensemble_predict: "xprocDeepEnsemble",
          xproc_ensemble_disagreement: "xprocDeepEnsemble",
          xproc_ensemble_constants: "xprocDeepEnsemble",
          // XPROC-NEURAL Tier 5 (T5-04) — Calibration Auditor
          xproc_calibration_score: "xprocCalibration",
          xproc_calibration_recommend: "xprocCalibration",
          xproc_calibration_constants: "xprocCalibration",
          // XPROC-NEURAL Tier 6 (T6-01) — FedAvg
          xproc_fed_aggregate: "xprocFedAvg",
          xproc_fed_round_summary: "xprocFedAvg",
          xproc_fed_constants: "xprocFedAvg",
          // XPROC-NEURAL Tier 6 (T6-02) — Bonawitz secure aggregation
          xproc_secure_mask: "xprocSecureAgg",
          xproc_secure_unmask: "xprocSecureAgg",
          xproc_secure_verify: "xprocSecureAgg",
          xproc_secure_constants: "xprocSecureAgg",
          // XPROC-NEURAL Tier 6 (T6-03) — Drift-aware federation gate
          xproc_fed_gate: "xprocDriftFed",
          xproc_fed_drift_report: "xprocDriftFed",
          xproc_fed_drift_constants: "xprocDriftFed",
          // XPROC-NEURAL Tier 6 (T6-04) — Client selection scheduler
          xproc_fed_select_clients: "xprocFedScheduler",
          xproc_fed_round_plan: "xprocFedScheduler",
          xproc_fed_scheduler_constants: "xprocFedScheduler",
          // XPROC-NEURAL Tier 7 (T7-01) — FOMAML meta-learning
          xproc_maml_inner_loop: "xprocMAMLLite",
          xproc_maml_meta_train: "xprocMAMLLite",
          xproc_maml_constants: "xprocMAMLLite",
          // XPROC-NEURAL Tier 7 (T7-02) — Prototypical networks
          xproc_proto_compute: "xprocProtoNet",
          xproc_proto_classify: "xprocProtoNet",
          xproc_proto_regress: "xprocProtoNet",
          xproc_proto_constants: "xprocProtoNet",
          // XPROC-NEURAL Tier 7 (T7-03) — Learned LR scheduler
          xproc_meta_lr_init: "xprocLearnedLR",
          xproc_meta_lr_step: "xprocLearnedLR",
          xproc_meta_lr_constants: "xprocLearnedLR",
          // XPROC-NEURAL Tier 7 (T7-04) — GP-UCB hyperparameter tuner
          xproc_hyper_propose: "xprocHyperTuner",
          xproc_hyper_evaluate: "xprocHyperTuner",
          xproc_hyper_record_outcome: "xprocHyperTuner",
          xproc_hyper_constants: "xprocHyperTuner",
          // XPROC-NEURAL Tier 10 (T10-04) — Modality dropout robustifier
          xproc_modality_dropout: "xprocModalityDropout",
          xproc_modality_predict: "xprocModalityDropout",
          xproc_modality_availability: "xprocModalityDropout",
          xproc_modality_constants: "xprocModalityDropout",
          // XPROC-NEURAL Tier 10 (T10-01) — Vision-tabular fusion
          xproc_vision_fuse: "xprocVisionFusion",
          xproc_vision_explain_attention: "xprocVisionFusion",
          xproc_vision_constants: "xprocVisionFusion",
          // XPROC-NEURAL Tier 10 (T10-02) — TimeSeries-tabular fusion (GMU)
          xproc_timeseries_fuse: "xprocTimeSeriesFusion",
          xproc_timeseries_segment: "xprocTimeSeriesFusion",
          xproc_timeseries_constants: "xprocTimeSeriesFusion",
          // XPROC-NEURAL Tier 10 (T10-03) — Audio-tabular GMU fusion + FFT + chatter
          xproc_audio_fuse: "xprocAudioFusion",
          xproc_audio_chatter_score: "xprocAudioFusion",
          xproc_audio_spectral: "xprocAudioFusion",
          xproc_audio_constants: "xprocAudioFusion",
        };

        // -- MITCourseIntegration (6) -- WIRE-UNWIRED-PAPA/U-WIRE-MIT-COURSE (2026-06-15)
        // Params already validated by ACTION_INTELLIGENCE_SCHEMAS above. Read-only surface.
        if (
          action === "mit_list_courses" || action === "mit_get_course" ||
          action === "mit_search_courses" || action === "mit_course_algorithms" ||
          action === "mit_apply_to_manufacturing" || action === "mit_integration_stats"
        ) {
          const { mitCourseIntegrationEngine: mci } = await import(
            "../../engines/MITCourseIntegrationEngine.js"
          );
          let out: Record<string, unknown>;
          switch (action) {
            case "mit_list_courses":
              out = { courses: mci.listCourses(params.domain as Parameters<typeof mci.listCourses>[0]) };
              break;
            case "mit_get_course":
              out = { course: mci.getCourse(params.courseId as string) };
              break;
            case "mit_search_courses":
              out = { result: mci.searchCourses(params.query as string) };
              break;
            case "mit_course_algorithms":
              out = { extraction: mci.getAlgorithmsFromCourse(params.courseId as string) };
              break;
            case "mit_apply_to_manufacturing":
              out = { application: mci.applyToManufacturing(params.courseId as string, params.problem as string) };
              break;
            default: // mit_integration_stats
              out = { stats: mci.getStats() };
              break;
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }

        // -- MITCourseExpansion (8, static methods on class-as-singleton) -- WIRE-UNWIRED-PAPA/U-WIRE-MIT-COURSE
        if (
          action === "mit_expansion_courses" || action === "mit_expansion_stats" ||
          action === "mit_expansion_formulas" || action === "mit_expansion_tribal_tips" ||
          action === "mit_expansion_by_relevance" || action === "mit_expansion_high_relevance_count" ||
          action === "mit_expansion_search_topic" || action === "mit_expansion_search_algorithm"
        ) {
          const { mitCourseExpansionEngine: mce } = await import(
            "../../engines/MITCourseExpansionEngine.js"
          );
          let out: Record<string, unknown>;
          switch (action) {
            case "mit_expansion_courses":
              out = { courses: mce.getExpandedCourses() };
              break;
            case "mit_expansion_stats":
              out = { stats: mce.getExpansionStats() };
              break;
            case "mit_expansion_formulas":
              out = { formulas: mce.getFormulasForRegistration() };
              break;
            case "mit_expansion_tribal_tips":
              out = { tips: mce.getTribalTips() };
              break;
            case "mit_expansion_by_relevance":
              out = { courses: mce.getCoursesByRelevance(params.relevance as "high" | "medium" | "low") };
              break;
            case "mit_expansion_high_relevance_count":
              out = { count: mce.getHighRelevanceCount() };
              break;
            case "mit_expansion_search_topic":
              out = { courses: mce.searchByTopic(params.topic as string) };
              break;
            default: // mit_expansion_search_algorithm
              out = { courses: mce.searchByAlgorithm(params.algorithm as string) };
              break;
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ action, success: true, ...out }),
            }],
          };
        }

        const engineName = CORE_ROUTING[action];
        const result = engineName
          ? await (await getEngine(engineName))(action, params)
          : await (await getEngine("intelligence"))(action as IntelligenceAction, params);

        // === POST-INTELLIGENCE HOOKS ===
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // === RESPONSE FORMATTING ===
        // Support response_level parameter
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => intelligenceExtractKeyValues(action, r)
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
          };
        }

        // Apply context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const keyValues = intelligenceExtractKeyValues(action, result);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(slimResponse(
                { action, ...result, _keyValues: keyValues }
              )),
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }],
        };
      } catch (err: any) {
        log.error(`[prism_intelligence] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_intelligence");
      }
    }
  );
}
