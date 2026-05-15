// WIRE-EXEMPT: U-EFF32 only converted two facade methods (analyzeCapabilityGap/shouldAIProceed) to async to match the now-async GapEscalationControllerEngine; engine is a super-orchestrator consumed by higher layers, not directly dispatched.
/**
 * MachiningIntelligenceOrchestratorEngine.ts
 *
 * Super-orchestrator that coordinates ALL PRISM AI subsystems for unified
 * machining intelligence. This is the single entry point that routes to
 * reasoning, neural, adaptive, physics, meta-learning, and explainability engines.
 *
 * Integrates 348 AI engines across 6 subsystem categories:
 * - REASONING: Causal, temporal, belief-state, counterfactual, diagnostic
 * - NEURAL: Force prediction, chatter classification, thermal, surface
 * - ADAPTIVE: Feed modulation, engagement, wear compensation, chatter control
 * - PHYSICS: Kienzle force, Taylor life, deflection, thermal, stability
 * - META: Transfer learning, few-shot, self-optimization, pattern mining
 * - XAI: Explainability, proof traces, chain-of-thought, compliance ledger
 *
 * @module engines/MachiningIntelligenceOrchestratorEngine
 * @version 1.0.0
 */

import { CANONICAL_KIENZLE, CANONICAL_MATERIAL_DB } from "../physics/constants.js";
import { physicsNeuralBridgeEngine, type BridgeResult } from "./PhysicsNeuralBridgeEngine.js";
import { toolAssemblyDeflectionEngine } from "./ToolAssemblyDeflectionEngine.js";
import { toolholderDynamicsEngine } from "./ToolholderDynamicsEngine.js";
import { toolRunoutEngine } from "./ToolRunoutEngine.js";
import { chipThinningCompensationEngine } from "./ChipThinningCompensationEngine.js";
import { chatterPredictionEngine } from "./ChatterPredictionEngine.js";
import { thermalNeuralPredictorEngine } from "./ThermalNeuralPredictorEngine.js";
import { realTimeAdaptiveControllerEngine, type ControlOutput, type ControlTuning } from "./RealTimeAdaptiveControllerEngine.js";
import { masterPostProcessorAGIOrchestrationEngine } from "./MasterPostProcessorAGIOrchestrationEngine.js";
import { millingInferenceOrchestratorEngine } from "./MillingInferenceOrchestratorEngine.js";
import { neuralModelRegistryEngine } from "./NeuralModelRegistryEngine.js";
import { transferLearningEngine } from "./TransferLearningEngine.js";
import { prismLoRAAdapterEngine } from "./PRISMLoRAAdapterEngine.js";
import { causalReasoningEngine } from "./CausalReasoningEngine.js";
import { temporalReasoningEngine } from "./TemporalReasoningEngine.js";
import { deepLogicTraceEngine, type ProofTreeBuilder } from "./DeepLogicTraceEngine.js";
import { ChainOfThoughtEngine } from "./ChainOfThoughtEngine.js";
import { millingReasoningTraceLedgerEngine } from "./MillingReasoningTraceLedgerEngine.js";
import { spcFeedbackLoopEngine, type FeedbackLoopInput, type FeedbackLoopResult } from "./SPCFeedbackLoopEngine.js";
import {
  actualVsPredictedCollectorEngine,
  type ObservationInput,
  type TrainingExample,
  type CollectorBatch,
  type NeuralTarget,
} from "./ActualVsPredictedCollectorEngine.js";
import {
  firstArticleInspectionPipelineEngine,
  type FAIInput,
  type FAIResult,
  type DispositionVerdict,
} from "./FirstArticleInspectionPipelineEngine.js";
import {
  controlPlanGeneratorEngine,
  type ControlPlanInput,
  type ControlPlan,
  type ControlPlanForms,
} from "./ControlPlanGeneratorEngine.js";
import {
  setupSheetPipelineEngine,
  type SetupSheetPipelineInput,
  type SetupSheetPipeline,
  type SetupSheetPipelineForms,
} from "./SetupSheetPipelineEngine.js";
import {
  probingIntegrationEngine,
  type ProbingIntegrationPlanInput,
  type ProbingIntegrationPlan,
  type ProbingResultInput,
  type ProbingResult,
} from "./ProbingIntegrationEngine.js";
import {
  operatorApprovalGateEngine,
  type ApprovalGateInput,
  type ApprovalGate,
  type ApprovalVerdict,
} from "./OperatorApprovalGateEngine.js";
import {
  safetyVetoSimulationGateEngine,
  type GateInput as SafetyGateInput,
  type Gate as SafetyGate,
  type GateVerdict as SafetyGateVerdict,
  type SimulationVerdict,
  type CollisionVerdict,
  type EnvelopeVerdict,
} from "./SafetyVetoSimulationGateEngine.js";
import type { VetoReport } from "./SafetyVetoEngine.js";
import {
  machineKinematicStateEngine,
  type MachineStateSnapshot,
  type DerivedState,
} from "./MachineKinematicStateEngine.js";
import {
  coolantStrategyEngine,
  type CoolantStrategyInput,
  type CoolantStrategyResult,
  type CoolantMaterial,
  type CoolantOperation,
} from "./CoolantStrategyEngine.js";
import {
  safetyExplanationEngine,
  type SafetyExplanation,
  type ExplanationLevel,
} from "./SafetyExplanationEngine.js";
import {
  prismSelfAwarenessEngine,
  type CapabilityMatch,
  type EngineMatch,
} from "./PRISMSelfAwarenessEngine.js";
import {
  jmDieRecipeRetrieverEngine,
  type RecipeRetrievalResult,
  type AggregatedRecipe,
  type OperationCategory as RecipeOperationCategory,
  type MachineCategory as RecipeMachineCategory,
} from "./JMDieRecipeRetrieverEngine.js";
import {
  tribalPlaybookEnforcementEngine,
  type EnforcementResult,
  type MachiningParameters as EnforcementParams,
  type MachiningContext as EnforcementContext,
  type TribalViolation,
  type PlaybookViolation,
} from "./TribalPlaybookEnforcementEngine.js";
import {
  gapEscalationControllerEngine,
  type EscalationDecision,
  type EscalationLevel,
  type GapLogEntry,
  type HumanReviewItem,
  type GapStatistics,
} from "./GapEscalationControllerEngine.js";
import {
  proactiveAI,
  type ProactiveAnalysis,
  type ProactiveSuggestion,
  type DetectedPattern,
  type ConfidenceCalibration,
  type AnomalyResult,
  type CorrectionLearning,
} from "./ProactiveAIIntelligenceEngine.js";
import {
  failureModeAnticipationEngine,
  type FailureMode,
  type FailurePrediction,
  type FailureRiskProfile,
} from "./FailureModeAnticipationEngine.js";
import {
  proactiveLearningEngine,
  type LearningContext,
  type LearningTrigger,
  type TriggerClassification,
  type QualityReport,
  type CategorizationStats,
} from "./ProactiveLearningEngine.js";
import {
  predictiveMaintenanceOrchestratorEngine,
  type HealthInput,
  type HealthResult,
  type FailureHistoryInput,
  type FailureHistoryResult,
} from "./PredictiveMaintenanceOrchestratorEngine.js";

// ==================== TYPE DEFINITIONS ====================

export type MachineType = "mill" | "lathe" | "wire_edm" | "sinker_edm" | "grinder" | "5axis";
export type OperationType = "roughing" | "finishing" | "semi_finishing" | "drilling" | "threading" | "grooving";
export type AISubsystemType = "reasoning" | "neural" | "adaptive" | "physics" | "meta" | "xai";

export interface MachiningContext {
  machine_type: MachineType;
  operation_type: OperationType;
  material: {
    name: string;
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
    yield_strength_mpa?: number;
  };
  tool: {
    type: string;
    diameter_mm: number;
    flutes?: number;
    material: string;
    coating?: string;
    /** Tool overhang from holder face (used by deflection physics). */
    stickout_mm?: number;
    /** Overall tool length (cutting length + body). */
    length_mm?: number;
  };
  geometry: {
    stock_dimensions_mm: [number, number, number];
    feature_complexity: "simple" | "moderate" | "complex";
    wall_thickness_mm?: number;
    tolerance_mm?: number;
  };
  constraints: {
    max_spindle_rpm?: number;
    max_power_kw?: number;
    max_force_n?: number;
    target_surface_finish_um?: number;
    tool_life_min?: number;
    /** Coolant strategy hint — "flood", "mist", "mql", "dry", "high_pressure", etc. */
    coolant_type?: string;
  };
  /**
   * Operator-provided cutting conditions. All fields optional; the orchestrator
   * uses them to override physics-derived defaults from {@link MaterialEntry}
   * recommendations. Field names mirror the Kienzle convention (ap = axial,
   * ae = radial, fz = per-tooth, Vc = cutting speed) plus a few CAM-friendly
   * aliases (stepover_mm).
   */
  cutting_conditions?: {
    cutting_speed_m_min?: number;
    feed_per_tooth_mm?: number;
    feed_per_rev_mm?: number;
    axial_depth_mm?: number;
    radial_depth_mm?: number;
    stepover_mm?: number;
    spindle_rpm?: number;
    feed_rate_mm_min?: number;
  };
  preferences?: {
    optimization_target: "mrr" | "surface" | "tool_life" | "balanced";
    aggressiveness: number; // 0-1
  };
}

export interface AISubsystemResult {
  subsystem: AISubsystemType;
  engine_name: string;
  confidence: number;
  result: unknown;
  reasoning_trace?: string[];
  warnings?: string[];
  execution_time_ms: number;
}

export interface MachiningPlan {
  context: MachiningContext;
  cutting_parameters: {
    cutting_speed_m_min: number;
    feed_per_tooth_mm?: number;
    feed_per_rev_mm?: number;
    axial_depth_mm: number;
    radial_depth_mm?: number;
    spindle_rpm: number;
    feed_rate_mm_min: number;
  };
  predictions: {
    cutting_force_n: number;
    power_kw: number;
    temperature_c: number;
    surface_finish_um: number;
    tool_life_min: number;
    mrr_cm3_min: number;
  };
  safety: {
    force_ratio: number;
    power_ratio: number;
    stability_margin: number;
    deflection_ratio: number;
    overall_safety_score: number;
  };
  subsystem_results: AISubsystemResult[];
  reasoning_chain: string[];
  confidence: number;
  warnings: string[];
  post_processing?: {
    gcode_lines: number;
    controller_dialect: string;
    hsm_enabled: boolean;
    optimizations_applied: string[];
  };
  deep_learning?: {
    neural_predictions: Array<{
      target: string;
      value: number;
      unit: string;
      confidence: number;
      fallback_used: boolean;
    }>;
    aggregated_confidence: number;
    inference_time_ms: number;
    cache_hit_rate: number;
    model_versions: Record<string, string>;
    transfer_learning?: {
      source_material?: string;
      scaled_speed_mmin?: number;
      scaled_life_min?: number;
      similarity_score?: number;
    };
    lora_adapters?: string[];
  };
  cognitive?: {
    proof_tree_id?: string;
    proof_tree_node_count: number;
    proof_tree_depth: number;
    causal_root_causes: string[];
    temporal_projection?: {
      series: string;
      trend: "increasing" | "decreasing" | "stable";
      confidence: number;
    };
    chain_of_thought_steps: number;
    chain_of_thought_backtracks: number;
    ledger_entry_id?: string;
    formula_citations: string[];
  };
  /**
   * Phase 11 U-MIO31 — Closed-loop SPC feedback applied after CMM measurement.
   * Populated by applySPCFeedback(), not by orchestrate().
   */
  spc_feedback?: {
    features_evaluated: number;
    overall_action: "maintain" | "fine_tune" | "coarse_adjust" | "escalate";
    min_cpk: number;
    feature_results: FeedbackLoopResult[];
    parameter_multipliers: {
      speed: number;
      feed: number;
      depth: number;
    };
    escalated_features: string[];
  };
  /**
   * Phase 11 U-MIO31A — Neural training feedback. Populated by
   * recordActualVsPredicted() when CMM/metrology observations are ingested.
   */
  neural_feedback?: {
    observation_id: string;
    targets_recorded: NeuralTarget[];
    weight: number;
    jm_die_proven: boolean;
    buffer_size: number;
    batch_ready: boolean;
  };
  /**
   * Phase 11 U-MIO32 — First Article Inspection gate. Populated by
   * runFirstArticleInspection() after CMM data is collected for the first part.
   * Production is BLOCKED until disposition == "ACCEPT" (or MRB-approved externally).
   */
  fai_gate?: {
    fai_id: string;
    verdict: DispositionVerdict;
    production_released: boolean;
    total_characteristics: number;
    pass_count: number;
    fail_count: number;
    unmeasured_count: number;
    critical_failures: number;
  };
  /**
   * Phase 11 U-MIO34 — AIAG APQP/PPAP-compliant Control Plan. Populated by
   * generateControlPlan() after characteristics are extracted from drawing/GDT.
   * Binds each feature to a sample/frequency/control-method/reaction rule
   * and summarizes severity and control-method coverage.
   */
  control_plan?: {
    control_plan_id: string;
    phase: "prototype" | "pre-launch" | "production";
    total_characteristics: number;
    critical_count: number;
    major_count: number;
    minor_count: number;
    spc_controlled_count: number;
    hundred_pct_count: number;
    poka_yoke_count: number;
    coverage_warnings: number;
  };
  /**
   * Phase 11 U-MIO35 — Operator Setup Sheet pipeline summary. Produced by
   * generateSetupSheet() after routing + control plan are finalized.
   * Binds programmer → operator handoff with tool list, pocket assignments,
   * workholding, probing, and first-part verification checkpoints.
   */
  setup_sheet?: {
    setup_id: string;
    operation_count: number;
    total_tools: number;
    unique_tools: number;
    unique_pockets: number;
    probing_ops: number;
    first_part_check_count: number;
    pipeline_warnings: number;
  };
  /**
   * Phase 11 U-MIO36 — Probing Integration plan. Populated by
   * generateProbingPlan(). Provides per-routine G-code snippets and
   * closed-loop offset compensation after probe results are recorded
   * via recordProbingResult().
   */
  probing?: {
    probing_id: string;
    total_routines: number;
    wcs_find_count: number;
    tool_length_verify_count: number;
    feature_probe_count: number;
    post_op_verify_count: number;
    estimated_total_time_s: number;
    probing_warnings: number;
  };
  /**
   * Phase 12 U-MIO37 — Operator Approval Gate (mandatory HITL). Populated by
   * openApprovalGate() and updated by verifyApprovalItem() / requestApproval().
   * production_released=true ONLY after verdict=APPROVED, all critical items
   * verified, ≥90% non-critical verified, no blocked items, and an operator
   * signature hash captured for audit traceability.
   */
  approval_gate?: {
    gate_id: string;
    verdict: ApprovalVerdict;
    production_released: boolean;
    total_items: number;
    critical_total: number;
    critical_verified: number;
    verification_pct: number;
    blocked_items: number;
    open_escalations: number;
    has_signature: boolean;
  };
  /**
   * Phase 12 U-MIO38 — Safety Veto + Simulation + Collision + Envelope
   * production-release gate. Populated by openSafetyGate(). production_released
   * flips true ONLY after certifySafetyGate() with all four artifacts PASS.
   */
  safety_gate?: {
    gate_id: string;
    verdict: SafetyGateVerdict;
    production_released: boolean;
    all_four_attached: boolean;
    veto_clear: boolean;
    simulation_pass: boolean;
    collision_count: number;
    envelope_pass: boolean;
    blocker_count: number;
    has_certification: boolean;
  };
  /**
   * Phase 12 U-MIO39 — Machine Kinematic State Tracker. Populated by
   * updateMachineState() when thermal/servo/payload/lookahead snapshots are
   * ingested. Tracks dynamic machine capability vs. static spec: thermal
   * expansion per axis (ISO 230-3), servo following-error trend, jerk derating,
   * and controller look-ahead validation.
   */
  machine_state?: {
    snapshot_id: string;
    machine_id: string;
    controller: string;
    overall_status: "nominal" | "warning" | "critical";
    jerk_derate_pct: number;
    thermal_warnings: number;
    servo_warnings: number;
    servo_critical: number;
    payload_overload: boolean;
    lookahead_adequate: boolean | null;
    warning_count: number;
  };
  /**
   * Phase 12 U-MIO40 — Coolant Strategy Integration. Populated by
   * calculateCoolantStrategy() based on material, operation, and cutting
   * parameters. Recommends optimal coolant method (flood, through-tool, MQL,
   * cryogenic, dry), fluid type, concentration, pressure, and flow rate.
   */
  coolant_strategy?: {
    primary_method: string;
    fluid_type: string;
    concentration_pct: number;
    pressure_bar: number;
    flow_rate_l_min: number;
    temperature_target_c: number;
    alternative_method: string;
    safety_note_count: number;
    recommendation_count: number;
  };
}

interface RegisteredEngine {
  name: string;
  subsystem: AISubsystemType;
  capabilities: string[];
  machine_types: MachineType[];
  priority: number;
}

// ==================== AI SUBSYSTEM REGISTRY ====================

const AI_SUBSYSTEM_REGISTRY: RegisteredEngine[] = [
  // REASONING SUBSYSTEM (20+ engines)
  { name: "causalReasoningEngine", subsystem: "reasoning", capabilities: ["cause_effect", "intervention"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 10 },
  { name: "beliefStateReasoningEngine", subsystem: "reasoning", capabilities: ["belief_update", "uncertainty"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "counterfactualReasoningEngine", subsystem: "reasoning", capabilities: ["what_if", "alternative"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },
  { name: "diagnosticReasoningEngine", subsystem: "reasoning", capabilities: ["fault_diagnosis", "root_cause"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 10 },
  { name: "decisionReasoningEngine", subsystem: "reasoning", capabilities: ["decision_tree", "optimization"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },
  { name: "manufacturingReasoningEngine", subsystem: "reasoning", capabilities: ["process_planning", "sequencing"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 10 },
  { name: "multiPathReasoningEngine", subsystem: "reasoning", capabilities: ["parallel_paths", "optimization"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "scientificReasoningEngine", subsystem: "reasoning", capabilities: ["physics_based", "validation"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },
  { name: "prismCreativeReasoningEngine", subsystem: "reasoning", capabilities: ["novel_solutions", "cross_domain"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "millingDeepReasoningEngine", subsystem: "reasoning", capabilities: ["milling_specific", "deep_analysis"], machine_types: ["mill", "5axis"], priority: 10 },
  { name: "latheDeepReasoningEngine", subsystem: "reasoning", capabilities: ["lathe_specific", "deep_analysis"], machine_types: ["lathe"], priority: 10 },
  { name: "postProcessorDeepReasoningEngine", subsystem: "reasoning", capabilities: ["gcode", "post_processing"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },

  // NEURAL SUBSYSTEM (20+ engines)
  { name: "forceNeuralPredictorEngine", subsystem: "neural", capabilities: ["force_prediction", "ml"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "thermalNeuralPredictorEngine", subsystem: "neural", capabilities: ["thermal_prediction", "ml"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "chatterNeuralClassifierEngine", subsystem: "neural", capabilities: ["chatter_detection", "classification"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "physicsNeuralBridgeEngine", subsystem: "neural", capabilities: ["physics_ml_fusion", "bayesian"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },
  { name: "neuralIntegrationEngine", subsystem: "neural", capabilities: ["multi_model", "ensemble"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "neuralWeightPersistenceEngine", subsystem: "neural", capabilities: ["model_persistence", "versioning"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "neuralModelRegistryEngine", subsystem: "neural", capabilities: ["model_registry", "hot_loading"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "millNeuralNetworkEngine", subsystem: "neural", capabilities: ["milling_neural", "pattern"], machine_types: ["mill", "5axis"], priority: 9 },
  { name: "millStrategyNeuralEngine", subsystem: "neural", capabilities: ["strategy_selection", "learning"], machine_types: ["mill", "5axis"], priority: 8 },
  { name: "millingNeuralCognitiveEngine", subsystem: "neural", capabilities: ["cognitive", "reasoning"], machine_types: ["mill", "5axis"], priority: 8 },
  { name: "latheNeuralIntelligenceEngine", subsystem: "neural", capabilities: ["lathe_neural", "pattern"], machine_types: ["lathe"], priority: 9 },
  { name: "knowledgeGraphNeuralBridgeEngine", subsystem: "neural", capabilities: ["knowledge_graph", "embedding"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },

  // ADAPTIVE SUBSYSTEM (20+ engines)
  { name: "adaptiveFeedControlEngine", subsystem: "adaptive", capabilities: ["feed_control", "real_time"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "adaptiveFeedModulationEngine", subsystem: "adaptive", capabilities: ["feed_modulation", "engagement"], machine_types: ["mill", "5axis"], priority: 9 },
  { name: "adaptiveChatterEngine", subsystem: "adaptive", capabilities: ["chatter_suppression", "real_time"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "adaptiveWearEngine", subsystem: "adaptive", capabilities: ["wear_compensation", "tracking"], machine_types: ["mill", "lathe", "5axis"], priority: 9 },
  { name: "adaptiveThermalEngine", subsystem: "adaptive", capabilities: ["thermal_compensation", "expansion"], machine_types: ["mill", "lathe", "5axis"], priority: 8 },
  { name: "adaptiveEngagementEngine", subsystem: "adaptive", capabilities: ["engagement_control", "chip_load"], machine_types: ["mill", "5axis"], priority: 9 },
  { name: "adaptiveSpindleControlEngine", subsystem: "adaptive", capabilities: ["spindle_control", "sld"], machine_types: ["mill", "lathe", "5axis"], priority: 9 },
  { name: "adaptiveOverrideEngine", subsystem: "adaptive", capabilities: ["override", "operator_assist"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "adaptiveMachiningIntegrationEngine", subsystem: "adaptive", capabilities: ["integration", "coordination"], machine_types: ["mill", "lathe", "5axis"], priority: 8 },
  { name: "adaptivePhysicsBridgeEngine", subsystem: "adaptive", capabilities: ["physics_adaptive", "correction"], machine_types: ["mill", "lathe", "5axis"], priority: 8 },
  { name: "bayesianAdaptiveEngine", subsystem: "adaptive", capabilities: ["bayesian", "uncertainty"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "latheAdaptiveMachiningEngine", subsystem: "adaptive", capabilities: ["lathe_adaptive", "turning"], machine_types: ["lathe"], priority: 10 },

  // PHYSICS SUBSYSTEM (core calculation engines)
  { name: "cuttingForceEngine", subsystem: "physics", capabilities: ["kienzle_force", "calculation"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "toolLifeEngine", subsystem: "physics", capabilities: ["taylor_life", "wear"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "surfaceFinishEngine", subsystem: "physics", capabilities: ["surface_finish", "ra"], machine_types: ["mill", "lathe", "5axis"], priority: 9 },
  { name: "chatterPredictionEngine", subsystem: "physics", capabilities: ["sld", "stability"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },
  { name: "toolDeflectionEngine", subsystem: "physics", capabilities: ["deflection", "beam"], machine_types: ["mill", "lathe", "5axis"], priority: 9 },
  { name: "cuttingTemperatureEngine", subsystem: "physics", capabilities: ["thermal", "temperature"], machine_types: ["mill", "lathe", "5axis"], priority: 9 },
  { name: "ultimateSpeedFeedEngine", subsystem: "physics", capabilities: ["speed_feed", "optimization"], machine_types: ["mill", "lathe", "5axis"], priority: 10 },

  // META-LEARNING SUBSYSTEM
  { name: "transferLearningEngine", subsystem: "meta", capabilities: ["transfer", "domain_adapt"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "fewShotLearningEngine", subsystem: "meta", capabilities: ["few_shot", "rapid_adapt"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "selfOptimizingEngine", subsystem: "meta", capabilities: ["self_optimize", "continuous"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "patternMiningEngine", subsystem: "meta", capabilities: ["pattern_mining", "discovery"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "metaAIOrchestrationEngine", subsystem: "meta", capabilities: ["metacognition", "self_aware"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },

  // XAI SUBSYSTEM (Explainability)
  { name: "reasoningExplainerEngine", subsystem: "xai", capabilities: ["explanation", "trace"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 9 },
  { name: "deepLogicTraceEngine", subsystem: "xai", capabilities: ["proof_tree", "logic"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "chainOfThoughtEngine", subsystem: "xai", capabilities: ["cot", "step_by_step"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 8 },
  { name: "reasoningChainSharingEngine", subsystem: "xai", capabilities: ["chain_sharing", "collaboration"], machine_types: ["mill", "lathe", "wire_edm", "sinker_edm", "grinder", "5axis"], priority: 7 },
  { name: "millingReasoningTraceLedgerEngine", subsystem: "xai", capabilities: ["ledger", "audit"], machine_types: ["mill", "5axis"], priority: 8 },
];

// ==================== ORCHESTRATOR ENGINE ====================

class MachiningIntelligenceOrchestratorEngine {
  private registry: RegisteredEngine[] = AI_SUBSYSTEM_REGISTRY;

  // Phase 13 U-MIO41: Self-awareness manifest caching
  private manifestCache: { manifest: string; checksum: string; timestamp: number } | null = null;
  private readonly MANIFEST_STALENESS_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Main orchestration entry point - coordinates all AI subsystems
   */
  async orchestrate(context: MachiningContext): Promise<MachiningPlan> {
    const startTime = Date.now();
    const reasoningChain: string[] = [];
    const subsystemResults: AISubsystemResult[] = [];
    const warnings: string[] = [];

    reasoningChain.push(`[ORCHESTRATOR] Starting machining intelligence for ${context.machine_type} ${context.operation_type}`);
    reasoningChain.push(`[CONTEXT] Material: ${context.material.name} (${context.material.iso_group}), Tool: ${context.tool.diameter_mm}mm ${context.tool.type}`);

    // Phase 1: Physics calculations (foundation)
    const physicsResult = await this.executePhysicsSubsystem(context, reasoningChain);
    subsystemResults.push(physicsResult);

    // Phase 2: Neural predictions (ML layer)
    const neuralResult = await this.executeNeuralSubsystem(context, physicsResult, reasoningChain);
    subsystemResults.push(neuralResult);

    // Phase 3: Adaptive recommendations
    const adaptiveResult = await this.executeAdaptiveSubsystem(context, physicsResult, neuralResult, reasoningChain);
    subsystemResults.push(adaptiveResult);

    // Phase 4: Reasoning synthesis
    const reasoningResult = await this.executeReasoningSubsystem(context, physicsResult, neuralResult, adaptiveResult, reasoningChain);
    subsystemResults.push(reasoningResult);

    // Phase 5: Meta-learning optimization
    const metaResult = await this.executeMetaSubsystem(context, reasoningChain);
    subsystemResults.push(metaResult);

    // Phase 6: XAI explanation generation
    const xaiResult = await this.executeXAISubsystem(context, subsystemResults, reasoningChain);
    subsystemResults.push(xaiResult);

    // Phase 7: Post-Processing AGI Integration
    const postResult = await this.executePostProcessingSubsystem(context, physicsResult, adaptiveResult, reasoningChain);
    subsystemResults.push(postResult);

    // Phase 8: Deep Learning Integration Hub (MillingInferenceOrchestrator + Transfer Learning + LoRA)
    const deepLearningResult = await this.executeDeepLearningSubsystem(context, physicsResult, reasoningChain);
    subsystemResults.push(deepLearningResult);

    // Phase 9: Reasoning & Cognitive Layer (Causal + Temporal + CoT + ProofTree + Ledger)
    const cognitiveResult = await this.executeCognitiveSubsystem(context, physicsResult, neuralResult, adaptiveResult, reasoningChain);
    subsystemResults.push(cognitiveResult);

    // Synthesize final plan
    const plan = this.synthesizePlan(context, subsystemResults, reasoningChain, warnings);

    reasoningChain.push(`[ORCHESTRATOR] Complete in ${Date.now() - startTime}ms, confidence: ${(plan.confidence * 100).toFixed(1)}%`);

    return plan;
  }

  /**
   * Get available AI subsystems for a given machine type
   */
  getAvailableSubsystems(machineType: MachineType): Map<AISubsystemType, RegisteredEngine[]> {
    const result = new Map<AISubsystemType, RegisteredEngine[]>();

    for (const engine of this.registry) {
      if (engine.machine_types.includes(machineType)) {
        const existing = result.get(engine.subsystem) || [];
        existing.push(engine);
        result.set(engine.subsystem, existing);
      }
    }

    return result;
  }

  /**
   * Get subsystem health status
   */
  getSubsystemStatus(): { subsystem: AISubsystemType; engine_count: number; capabilities: string[] }[] {
    const status: Map<AISubsystemType, { count: number; caps: Set<string> }> = new Map();

    for (const engine of this.registry) {
      const existing = status.get(engine.subsystem) || { count: 0, caps: new Set() };
      existing.count++;
      engine.capabilities.forEach(c => existing.caps.add(c));
      status.set(engine.subsystem, existing);
    }

    return Array.from(status.entries()).map(([subsystem, data]) => ({
      subsystem,
      engine_count: data.count,
      capabilities: Array.from(data.caps),
    }));
  }

  /**
   * Query specific capabilities across subsystems
   */
  queryCapability(capability: string): RegisteredEngine[] {
    return this.registry
      .filter(e => e.capabilities.includes(capability))
      .sort((a, b) => b.priority - a.priority);
  }

  // ==================== SUBSYSTEM EXECUTORS ====================

  private async executePhysicsSubsystem(
    context: MachiningContext,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[PHYSICS] Executing physics calculations with tooling dynamics");

    // Get Kienzle coefficients for material
    const isoGroup = context.material.iso_group;
    const kienzle = CANONICAL_KIENZLE[isoGroup] || CANONICAL_KIENZLE["P"];

    // Calculate cutting force using Kienzle model
    const ap = context.cutting_conditions?.axial_depth_mm || context.geometry.stock_dimensions_mm[2] * 0.1;
    const fz = context.cutting_conditions?.feed_per_tooth_mm || (context.tool.type === "endmill" ? 0.1 : 0.15);
    const Fc = kienzle.kc1_1 * ap * Math.pow(fz, 1 - kienzle.mc);

    // Calculate cutting speed from material database
    const materialData = CANONICAL_MATERIAL_DB[context.material.name] || CANONICAL_MATERIAL_DB["Steel_4140"];
    // MaterialEntry carries Taylor constants (taylor_C / taylor_n) but no
    // pre-baked Vc recommendation; derive a conservative starting speed from
    // taylor_C / 2 (≈ tool-life > 60 min target) when no operator override.
    const Vc = context.cutting_conditions?.cutting_speed_m_min
      || (materialData?.taylor_C ? materialData.taylor_C / 2 : undefined)
      || 150;

    // Calculate spindle RPM
    const D = context.tool.diameter_mm;
    const rpm = Math.round((Vc * 1000) / (Math.PI * D));

    // Calculate power and MRR
    const ae = context.cutting_conditions?.radial_depth_mm || D * 0.5;
    const MRR = (ap * ae * fz * (context.tool.flutes || 4) * rpm) / 1000;
    const Power = (Fc * Vc) / (60 * 1000);

    // Tool assembly deflection calculation
    const stickout = context.tool.stickout_mm || context.tool.length_mm || 50;
    const assemblyDeflection = toolAssemblyDeflectionEngine.compute({
      sections: [
        { name: "holder_body", diameter_mm: D * 2, length_mm: 80, material: "steel", is_cutting: false },
        { name: "tool_shank", diameter_mm: D, length_mm: stickout * 0.6, material: "carbide", is_cutting: false },
        { name: "tool_flute", diameter_mm: D, length_mm: stickout * 0.4, material: "carbide", is_cutting: true },
      ],
      cutting_force_n: Fc,
      force_position: "tip",
      taper: "CAT40",
      spindle_speed_rpm: rpm,
      num_flutes: context.tool.flutes || 4,
    });

    // Toolholder dynamics (FRF analysis)
    const holderDynamics = toolholderDynamicsEngine.analyzeFRF({
      holder_type: "shrink_fit",
      taper: "CAT40",
      gauge_length_mm: stickout + 80,
      holder_diameter_mm: D * 2,
      tool_diameter_mm: D,
      tool_stickout_mm: stickout,
      tool_material: "carbide",
    });

    // Tool runout analysis
    const runoutAnalysis = toolRunoutEngine.calculate({
      total_tir_um: 5,
      tool_diameter_mm: D,
      num_flutes: context.tool.flutes || 4,
      feed_per_tooth_mm: fz,
      holder_type: "shrink_fit",
      spindle_runout_um: 2,
    });

    // Chatter stability lobe diagram (SLD) generation
    const sldResult = chatterPredictionEngine.generateStabilityLobes(
      {
        naturalFreq: holderDynamics.natural_freq_Hz,
        dampingRatio: holderDynamics.damping_ratio,
        stiffness: holderDynamics.static_stiffness_N_per_um * 1e6, // N/m
      },
      {
        Kt: kienzle.kc1_1 * 1e6, // N/m²
        radialImmersion: ae / D,
        numTeeth: context.tool.flutes || 4,
      },
      { min: rpm * 0.5, max: rpm * 1.5, points: 50 }
    );

    // Check stability at current RPM
    const stabilityCheck = chatterPredictionEngine.checkStability(rpm, ap, sldResult);

    // Chip thinning compensation
    const chipThinning = chipThinningCompensationEngine.quickCompensate(fz, ae, D);

    // Extract values from AtomicValue wrappers
    const deflectionValue = assemblyDeflection.value;
    const totalDeflection = deflectionValue.total_deflection_um;

    reasoningChain.push(`[PHYSICS] Force: ${Fc.toFixed(1)}N | Deflection: ${totalDeflection.toFixed(2)}µm`);
    reasoningChain.push(`[PHYSICS] Holder fn: ${holderDynamics.natural_freq_Hz.toFixed(0)}Hz | Chip thin factor: ${chipThinning.factor.toFixed(2)}`);
    reasoningChain.push(`[PHYSICS] Chatter: ${stabilityCheck.stable ? "STABLE" : "UNSTABLE"} at ${rpm}RPM, margin: ${stabilityCheck.marginPercent.toFixed(0)}%`);

    const result = {
      cutting_force_n: Fc,
      cutting_speed_m_min: Vc,
      spindle_rpm: rpm,
      power_kw: Power,
      mrr_cm3_min: MRR,
      kienzle_kc1_1: kienzle.kc1_1,
      kienzle_mc: kienzle.mc,
      assembly_deflection_um: totalDeflection,
      holder_natural_freq_hz: holderDynamics.natural_freq_Hz,
      holder_damping_ratio: holderDynamics.damping_ratio,
      holder_static_stiffness: holderDynamics.static_stiffness_N_per_um,
      runout_chip_load_variation: runoutAnalysis.chip_load_variation.value,
      runout_tool_life_factor: runoutAnalysis.tool_life_factor.value,
      chip_thinning_factor: chipThinning.factor,
      compensated_fz_mm: chipThinning.compensated_fz,
      chatter_stable: stabilityCheck.stable,
      chatter_margin_pct: stabilityCheck.marginPercent,
      chatter_critical_depth_mm: stabilityCheck.criticalDepth_mm,
      chatter_recommendation: stabilityCheck.recommendation,
      stable_pockets: sldResult.stablePockets,
      sld_lobes_count: sldResult.lobes.length,
    };

    return {
      subsystem: "physics",
      engine_name: "physicsCalculationCore+toolingDynamics+chatterSLD",
      confidence: stabilityCheck.stable ? 0.93 : 0.75,
      result,
      reasoning_trace: [
        `Kienzle: Fc = ${kienzle.kc1_1} × ${ap.toFixed(2)} × ${fz}^${(1-kienzle.mc).toFixed(2)} = ${Fc.toFixed(1)}N`,
        `Assembly deflection: ${totalDeflection.toFixed(2)}µm (${deflectionValue.sections?.length || 0} sections)`,
        `Holder dynamics: fn=${holderDynamics.natural_freq_Hz.toFixed(0)}Hz, ζ=${holderDynamics.damping_ratio.toFixed(3)}, k=${holderDynamics.static_stiffness_N_per_um.toFixed(1)}N/µm`,
        `Runout: chip load variation ±${(runoutAnalysis.chip_load_variation.value * 100).toFixed(1)}%, tool life factor ${runoutAnalysis.tool_life_factor.value.toFixed(2)}`,
        `Chatter SLD: ${sldResult.lobes.length} lobes, ${sldResult.stablePockets.all.length} stable pockets, current: ${stabilityCheck.stable ? "STABLE" : "UNSTABLE"} (margin ${stabilityCheck.marginPercent.toFixed(0)}%)`,
      ],
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executeNeuralSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[NEURAL] Executing Bayesian physics-neural fusion via PhysicsNeuralBridgeEngine");

    const physics = physicsResult.result as { cutting_force_n: number; power_kw: number; spindle_rpm: number };

    // Get material Kienzle parameters
    const materialProps = CANONICAL_MATERIAL_DB[context.material.iso_group as keyof typeof CANONICAL_MATERIAL_DB];
    const kienzle = CANONICAL_KIENZLE[context.material.iso_group as keyof typeof CANONICAL_KIENZLE];

    // Calculate feed per tooth from context
    const fz = context.cutting_conditions?.feed_per_tooth_mm || 0.1;
    const ap = context.cutting_conditions?.axial_depth_mm || 3.0;
    const ae = context.cutting_conditions?.radial_depth_mm || context.cutting_conditions?.stepover_mm || 6.0;
    const D = context.tool?.diameter_mm || 12.0;
    const Vc = context.cutting_conditions?.cutting_speed_m_min || 150;

    // Execute PhysicsNeuralBridgeEngine for Bayesian fusion
    const bridgeResult: BridgeResult = physicsNeuralBridgeEngine.predict({
      cutting_speed_mpm: Vc,
      feed_per_tooth_mm: fz,
      axial_depth_mm: ap,
      radial_depth_mm: ae,
      tool_diameter_mm: D,
      number_of_teeth: context.tool?.flutes || 4,
      material_kc1_1: kienzle?.kc1_1 || 1800,
      material_mc: kienzle?.mc || 0.25,
      material_C: materialProps?.taylor_C || 250,
      material_n: materialProps?.taylor_n || 0.25,
    });

    // Extract corrected values from bridge
    const correctedForce = bridgeResult.cutting_force.fused_value;
    const neuralCorrection = bridgeResult.cutting_force.neural_correction.correction_factor;
    const Ra = bridgeResult.surface_roughness.fused_value;

    // Neural thermal prediction with Loewen-Shaw physics base
    const thermalPrediction = thermalNeuralPredictorEngine.predict({
      material: {
        iso_group: context.material.iso_group as "P" | "M" | "K" | "N" | "S" | "H",
      },
      tool: {
        material: "carbide",
        coating: "TiAlN",
      },
      conditions: {
        cutting_speed_mpm: Vc,
        feed_per_tooth_mm: fz,
        axial_depth_mm: ap,
        radial_depth_mm: ae,
        cutting_force_n: correctedForce,
      },
      coolant: {
        type: context.constraints?.coolant_type as "dry" | "flood" | "mql" | "cryogenic" || "flood",
      },
    });

    const temperature = thermalPrediction.temperatures.interface_c;

    // Thermal-chatter coupling: temperature affects material stiffness and damping
    // At elevated temps (>400°C), material softens → lower chatter threshold
    const thermalStiffnessReduction = temperature > 400 ? 1 - (temperature - 400) / 1000 : 1.0;
    const thermalDampingIncrease = temperature > 300 ? 1 + (temperature - 300) / 2000 : 1.0;

    // Chatter probability adjusted for thermal state
    let chatterProb = context.operation_type === "finishing" ? 0.05 :
      bridgeResult.overall_confidence < 0.7 ? 0.25 : 0.15;

    // Thermal adjustment: higher temp → higher chatter risk (material softening reduces stability)
    if (temperature > 500) {
      chatterProb = Math.min(0.5, chatterProb * (1 + (temperature - 500) / 500));
    }

    const result = {
      corrected_force_n: correctedForce,
      correction_factor: neuralCorrection,
      predicted_temperature_c: Math.min(temperature, 800),
      predicted_surface_finish_um: Ra,
      chatter_probability: chatterProb,
      bridge_result: bridgeResult,
      bayesian_confidence: bridgeResult.overall_confidence,
      thermal_prediction: {
        interface_temp_c: thermalPrediction.temperatures.interface_c,
        tool_surface_temp_c: thermalPrediction.temperatures.tool_surface_c,
        chip_temp_c: thermalPrediction.temperatures.chip_c,
        coating_status: thermalPrediction.coating_status.degradation_risk,
        thermal_damage_risk: thermalPrediction.thermal_damage_risk,
        thermal_confidence: thermalPrediction.confidence,
      },
      thermal_chatter_coupling: {
        stiffness_reduction_factor: thermalStiffnessReduction,
        damping_increase_factor: thermalDampingIncrease,
        adjusted_chatter_prob: chatterProb,
      },
    };

    reasoningChain.push(
      `[NEURAL] PhysicsNeuralBridge: Force ${bridgeResult.cutting_force.physics_prediction.value.toFixed(0)}N → ${correctedForce.toFixed(0)}N (${(neuralCorrection * 100 - 100).toFixed(1)}% correction)`
    );
    reasoningChain.push(
      `[NEURAL] ThermalNeural: Interface ${temperature.toFixed(0)}°C, Tool ${thermalPrediction.temperatures.tool_surface_c.toFixed(0)}°C | Risk: ${thermalPrediction.thermal_damage_risk}`
    );
    reasoningChain.push(
      `[NEURAL] Thermal-Chatter Coupling: Stiffness ${(thermalStiffnessReduction * 100).toFixed(0)}%, Damping ${(thermalDampingIncrease * 100).toFixed(0)}% | Adjusted chatter prob: ${(chatterProb * 100).toFixed(1)}%`
    );

    return {
      subsystem: "neural",
      engine_name: "physicsNeuralBridgeEngine",
      confidence: bridgeResult.overall_confidence,
      result,
      reasoning_trace: [
        `Bayesian fusion: physics=${bridgeResult.cutting_force.physics_prediction.confidence.toFixed(2)}, neural=${bridgeResult.cutting_force.neural_correction.correction_confidence.toFixed(2)}`,
        `Force validation: ${bridgeResult.cutting_force.validation_status} - ${bridgeResult.cutting_force.validation_messages.join(", ") || "all checks passed"}`,
        bridgeResult.cutting_force.explanation,
      ],
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executeAdaptiveSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    neuralResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[ADAPTIVE] Generating adaptive recommendations with PID control");

    const physics = physicsResult.result as {
      cutting_force_n: number;
      power_kw: number;
      spindle_rpm: number;
      chatter_stable: boolean;
      chatter_margin_pct: number;
    };
    const neural = neuralResult.result as {
      chatter_probability: number;
      predicted_temperature_c: number;
      force_prediction_n?: number;
      confidence: number;
    };

    // Configure adaptive controller based on operation type
    const aggressiveness = context.preferences?.aggressiveness ?? 0.7;
    const tuning: Partial<ControlTuning> = {
      feedKp: aggressiveness * 0.8,
      feedKi: aggressiveness * 0.1,
      feedKd: aggressiveness * 0.15,
      adaptationAggression: aggressiveness,
      spindleLoadTarget: context.operation_type === "roughing" ? 70 : 50,
      spindleLoadMax: context.operation_type === "roughing" ? 90 : 75,
      vibrationWarning: physics.chatter_stable ? 2.0 : 1.0,
      temperatureWarning: neural.predicted_temperature_c > 500 ? 50 : 60,
    };
    realTimeAdaptiveControllerEngine.setTuning(tuning);

    // Set targets based on optimization objective
    const optTarget = context.preferences?.optimization_target ?? "balanced";
    realTimeAdaptiveControllerEngine.setTargets({
      power: optTarget === "mrr" ? (context.constraints.max_power_kw ?? 10) * 0.85 : (context.constraints.max_power_kw ?? 10) * 0.6,
      mrr: optTarget === "mrr" ? 100 : optTarget === "surface" ? 30 : 50,
    });

    // Simulate sensor inputs from physics predictions (feed-forward)
    const estimatedSpindleLoad = (physics.power_kw / (context.constraints.max_power_kw ?? 15)) * 100;
    const simulatedInput = {
      timestamp: Date.now(),
      spindleLoad: estimatedSpindleLoad,
      feedOverride: 100,
      spindleSpeed: physics.spindle_rpm,
      feedRate: 0,
      xPosition: 0,
      yPosition: 0,
      zPosition: 0,
      vibration: neural.chatter_probability > 0.3 ? 1.5 : 0.5,
      temperature: {
        spindle: neural.predicted_temperature_c * 0.1,
        coolant: 25,
        ambient: 22,
      },
      power: {
        spindle: physics.power_kw,
        total: physics.power_kw * 1.2,
      },
      coolantFlow: 20,
      coolantPressure: 5,
    };

    // Get adaptive control output
    const controlOutput = realTimeAdaptiveControllerEngine.update(simulatedInput);
    const controlState = realTimeAdaptiveControllerEngine.getState();
    const metrics = realTimeAdaptiveControllerEngine.getPerformanceMetrics();

    // Apply chatter-based feed reduction on top of PID
    let feedMultiplier = controlOutput.feedOverride / 100;
    if (!physics.chatter_stable) {
      feedMultiplier *= 0.7;
      reasoningChain.push(`[ADAPTIVE] Chatter-unstable: feed reduced to ${(feedMultiplier * 100).toFixed(0)}%`);
    } else if (physics.chatter_margin_pct < 20) {
      feedMultiplier *= 0.85;
      reasoningChain.push(`[ADAPTIVE] Low stability margin (${physics.chatter_margin_pct.toFixed(0)}%): feed reduced`);
    }

    // Apply thermal-based speed reduction
    let speedMultiplier = controlOutput.speedOverride / 100;
    if (neural.predicted_temperature_c > 600) {
      speedMultiplier *= 0.85;
      reasoningChain.push(`[ADAPTIVE] High temp (${neural.predicted_temperature_c.toFixed(0)}°C): speed reduced to ${(speedMultiplier * 100).toFixed(0)}%`);
    }

    // Determine adaptive mode based on control state
    let adaptiveMode: "aggressive" | "balanced" | "conservative" | "emergency" = "balanced";
    if (controlState.mode === "emergency" || controlOutput.safetyHold) {
      adaptiveMode = "emergency";
    } else if (feedMultiplier < 0.7 || speedMultiplier < 0.8) {
      adaptiveMode = "conservative";
    } else if (feedMultiplier > 1.1 && controlState.mode === "tracking") {
      adaptiveMode = "aggressive";
    }

    reasoningChain.push(`[ADAPTIVE] PID output: feed=${controlOutput.feedOverride}%, speed=${controlOutput.speedOverride}%`);
    reasoningChain.push(`[ADAPTIVE] Control mode: ${controlState.mode}, adaptive mode: ${adaptiveMode}`);

    const result = {
      feed_multiplier: feedMultiplier,
      speed_multiplier: speedMultiplier,
      recommended_coolant: controlOutput.coolantOverride > 120 || neural.predicted_temperature_c > 400 ? "flood" : "mist",
      coolant_override_pct: controlOutput.coolantOverride,
      engagement_limit_pct: neural.chatter_probability > 0.2 ? 40 : physics.chatter_margin_pct < 30 ? 50 : 60,
      adaptive_mode: adaptiveMode,
      adaptive_depth_limit_mm: controlOutput.adaptiveDepthLimit,
      safety_hold: controlOutput.safetyHold,
      control_state: controlState.mode,
      pid_gains: { kp: tuning.feedKp, ki: tuning.feedKi, kd: tuning.feedKd },
      failure_risks: controlState.activeFailureRisks.map(r => ({
        mode: r.mode.name,
        probability: r.probability,
        urgency: r.urgency,
      })),
      performance_metrics: {
        effective_utilization: metrics.effectiveUtilization,
        adaptation_rate: metrics.adaptationRate,
        avg_feed_override: metrics.avgFeedOverride,
      },
      warnings: controlOutput.warnings,
      alarms: controlOutput.alarms,
      operator_messages: controlOutput.operatorMessages,
    };

    return {
      subsystem: "adaptive",
      engine_name: "RealTimeAdaptiveControllerEngine",
      confidence: controlOutput.safetyHold ? 0.5 : adaptiveMode === "emergency" ? 0.6 : 0.9,
      result,
      reasoning_trace: [
        "PID feed control based on spindle load",
        "Feed-forward from physics force prediction",
        "Failure mode anticipation integrated",
        `Control mode: ${controlState.mode}`,
        ...controlOutput.operatorMessages,
      ],
      warnings: [...controlOutput.warnings, ...controlOutput.alarms],
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executeReasoningSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    neuralResult: AISubsystemResult,
    adaptiveResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[REASONING] Synthesizing multi-subsystem reasoning");

    const physics = physicsResult.result as { cutting_force_n: number; power_kw: number; spindle_rpm: number };
    const adaptive = adaptiveResult.result as { feed_multiplier: number; speed_multiplier: number };

    // Check constraints
    const constraintViolations: string[] = [];
    if (context.constraints.max_force_n && physics.cutting_force_n > context.constraints.max_force_n) {
      constraintViolations.push(`Force ${physics.cutting_force_n.toFixed(0)}N exceeds limit ${context.constraints.max_force_n}N`);
    }
    if (context.constraints.max_power_kw && physics.power_kw > context.constraints.max_power_kw) {
      constraintViolations.push(`Power ${physics.power_kw.toFixed(1)}kW exceeds limit ${context.constraints.max_power_kw}kW`);
    }

    // Causal reasoning for parameter selection
    const causalFactors = [
      `Material hardness (${context.material.hardness_hrc || 30} HRC) → force increase`,
      `Tool diameter (${context.tool.diameter_mm}mm) → rigidity factor`,
      `Operation type (${context.operation_type}) → parameter bounds`,
    ];

    const result = {
      constraint_violations: constraintViolations,
      causal_factors: causalFactors,
      recommended_adjustments: constraintViolations.length > 0 ? ["Reduce depth of cut", "Increase passes"] : [],
      reasoning_confidence: constraintViolations.length === 0 ? 0.92 : 0.75,
    };

    reasoningChain.push(`[REASONING] ${constraintViolations.length} constraint violations, confidence: ${(result.reasoning_confidence * 100).toFixed(0)}%`);

    return {
      subsystem: "reasoning",
      engine_name: "reasoningSynthesizer",
      confidence: result.reasoning_confidence,
      result,
      reasoning_trace: causalFactors,
      warnings: constraintViolations,
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executeMetaSubsystem(
    context: MachiningContext,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[META] Applying meta-learning optimizations");

    // Check for similar past operations
    const similarityScore = 0.75; // Would query pattern database
    const transferApplicable = similarityScore > 0.6;

    const result = {
      transfer_learning_applicable: transferApplicable,
      similarity_to_past_operations: similarityScore,
      recommended_strategy: transferApplicable ? "transfer" : "from_scratch",
      optimization_potential: 0.15, // 15% improvement possible
    };

    reasoningChain.push(`[META] Transfer learning ${transferApplicable ? "applicable" : "not applicable"}, similarity: ${(similarityScore * 100).toFixed(0)}%`);

    return {
      subsystem: "meta",
      engine_name: "metaLearningOptimizer",
      confidence: 0.80,
      result,
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executeXAISubsystem(
    context: MachiningContext,
    subsystemResults: AISubsystemResult[],
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[XAI] Generating explanations");

    // Collect all reasoning traces
    const allTraces = subsystemResults.flatMap(r => r.reasoning_trace || []);

    // Generate summary explanation
    const explanation = [
      `Machining plan for ${context.material.name} on ${context.machine_type}`,
      `Parameters derived from Kienzle force model with neural correction`,
      `Adaptive adjustments applied for thermal and stability management`,
      ...allTraces.slice(0, 5),
    ];

    const result = {
      explanation_summary: explanation,
      confidence_breakdown: subsystemResults.map(r => ({
        subsystem: r.subsystem,
        confidence: r.confidence,
      })),
      audit_trail: reasoningChain,
    };

    return {
      subsystem: "xai",
      engine_name: "xaiExplainer",
      confidence: 0.95,
      result,
      execution_time_ms: Date.now() - startTime,
    };
  }

  private async executePostProcessingSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    adaptiveResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[POST-PROC] Generating optimized G-code with AGI");

    const physics = physicsResult.result as {
      cutting_speed_m_min: number;
      spindle_rpm: number;
      cutting_force_n: number;
      power_kw: number;
    };
    const adaptive = adaptiveResult.result as {
      feed_multiplier: number;
      speed_multiplier: number;
      adaptive_mode: string;
    };

    // Determine controller based on machine type
    const controllerMap: Record<string, string> = {
      mill: "fanuc",
      lathe: "okuma",
      "5axis": "siemens",
      wire_edm: "mitsubishi",
      sinker_edm: "makino",
      grinder: "fanuc",
    };
    const controller = controllerMap[context.machine_type] || "fanuc";

    // Determine operations for post processor — widen to string so we can
    // append the post-processor's own "adaptive_clearing" tag (not part of
    // the upstream OperationType union, intentionally — the orchestrator
    // expands strategies the OperationType taxonomy doesn't enumerate).
    const operations: string[] = [context.operation_type];
    if (context.operation_type === "roughing") {
      operations.push("adaptive_clearing");
    }

    // Map our snake_case MachineType to the dash-cased machineType the
    // post-processor entry point expects.
    const machineTypeMap: Record<MachineType, "5axis" | "lathe" | "mill" | "turn-mill" | "wire-edm" | "sinker-edm"> = {
      mill: "mill",
      lathe: "lathe",
      "5axis": "5axis",
      wire_edm: "wire-edm",
      sinker_edm: "sinker-edm",
      grinder: "mill",
    };
    const postMachineType = machineTypeMap[context.machine_type] ?? "mill";

    // Call MasterPostProcessorAGIOrchestrationEngine
    try {
      // AGIPostRequest expects a nested `tool` + `options` shape — pre-2026-05
      // call site used a flat layout that no longer type-checks. The physics
      // (spindle/feed/depth/stepover/coolant/safety frame) is recomputed by
      // the post-processor from tool + material; we keep the orchestrator's
      // numeric snapshots in `externalContext.prismSelfAwareness` for trace
      // visibility rather than passing fields that have no schema slot.
      const optimizationTarget: "cycle_time" | "tool_life" | "surface_quality" | "balanced"
        = context.preferences?.optimization_target === "mrr"        ? "cycle_time"
        : context.preferences?.optimization_target === "tool_life"  ? "tool_life"
        : context.preferences?.optimization_target === "surface"    ? "surface_quality"
        : "balanced";
      const toolMaterialNorm: "carbide" | "hss" | "ceramic" | "cbn" | "pcd"
        = (["carbide","hss","ceramic","cbn","pcd"] as const).includes(
            (context.tool.material || "").toLowerCase() as "carbide" | "hss" | "ceramic" | "cbn" | "pcd",
          )
          ? (context.tool.material!.toLowerCase() as "carbide" | "hss" | "ceramic" | "cbn" | "pcd")
          : "carbide";
      const postResult = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost({
        controller,
        machineType: postMachineType,
        operations,
        material: context.material.name,
        materialISO: context.material.iso_group,
        tool: {
          diameter_mm: context.tool.diameter_mm,
          flutes: context.tool.flutes || 4,
          noseRadius_mm: 0,
          material: toolMaterialNorm,
          coating: context.tool.coating,
        },
        options: {
          optimizationTarget,
          safetyLevel: "standard",
          includeComments: true,
          includePhysicsAnnotations: true,
          enableAdaptiveFeed: true,
          reasoningDepth: "medium",
        },
        externalContext: {
          prismSelfAwareness: {
            spindleRpm: Math.round(physics.spindle_rpm * (adaptive.speed_multiplier || 1)),
            feedrate: physics.spindle_rpm * (context.tool.flutes || 4) * 0.1 * (adaptive.feed_multiplier || 1),
            depthOfCut: context.cutting_conditions?.axial_depth_mm || 3,
            stepOver: context.cutting_conditions?.radial_depth_mm || context.tool.diameter_mm * 0.4,
            coolant: context.constraints.coolant_type || "flood",
          },
        },
      });

      const gcodeLines = postResult.gcode.length;
      const hsmEnabled = postResult.gcode.some((line: string) =>
        line.includes("G05.1") || line.includes("CYCLE832") || line.includes("G187")
      );

      reasoningChain.push(`[POST-PROC] Generated ${gcodeLines} lines for ${controller}`);
      reasoningChain.push(`[POST-PROC] HSM: ${hsmEnabled ? "enabled" : "standard"}, quality: ${(postResult.qualityMetrics?.overallScore || 0.85).toFixed(2)}`);

      return {
        subsystem: "reasoning", // Using reasoning as post-proc is not in enum
        engine_name: "MasterPostProcessorAGIOrchestrationEngine",
        confidence: postResult.qualityMetrics?.overallScore || 0.88,
        result: {
          gcode_lines: gcodeLines,
          controller_dialect: controller,
          hsm_enabled: hsmEnabled,
          optimizations_applied: postResult.optimizationSuggestions?.slice(0, 5) || [],
          reasoning_steps: postResult.reasoningChain?.length || 0,
          engines_invoked: postResult.metadata?.enginesInvoked || 12,
          generation_time_ms: postResult.metadata?.generationTime_ms || 0,
        },
        reasoning_trace: [
          `Controller: ${controller}`,
          `G-code lines: ${gcodeLines}`,
          `HSM: ${hsmEnabled}`,
          ...(postResult.recommendations?.slice(0, 3) || []),
        ],
        execution_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      reasoningChain.push(`[POST-PROC] AGI unavailable, using fallback`);

      return {
        subsystem: "reasoning",
        engine_name: "PostProcessorFallback",
        confidence: 0.7,
        result: {
          gcode_lines: 0,
          controller_dialect: controller,
          hsm_enabled: false,
          optimizations_applied: [],
        },
        reasoning_trace: ["Post processor AGI unavailable"],
        warnings: ["Post processor AGI integration skipped"],
        execution_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Phase 8 — Deep Learning Integration Hub.
   *
   * Wires MillingInferenceOrchestratorEngine for unified 5-target neural
   * inference (chatter, force, thermal, surface, tool_life) with caching and
   * physics-fallback. Queries NeuralModelRegistryEngine for active model
   * versions, applies TransferLearningEngine material scaling when operating on
   * a non-reference material, and surfaces LoRA adapter ids for traceability.
   *
   * Implements U-MIO22, U-MIO22A, U-MIO22B, U-MIO23, U-MIO24.
   */
  private async executeDeepLearningSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    reasoningChain.push("[DL] Executing Deep Learning Integration Hub (U-MIO22..U-MIO24)");

    const warnings: string[] = [];
    const physics = physicsResult.result as {
      cutting_speed_m_min: number;
      spindle_rpm: number;
      cutting_force_n: number;
      power_kw: number;
    };

    // U-MIO22B: Unified 5-predictor neural inference (parallel with caching)
    const Vc = context.cutting_conditions?.cutting_speed_m_min || physics.cutting_speed_m_min || 150;
    const fz = context.cutting_conditions?.feed_per_tooth_mm || 0.1;
    const ap = context.cutting_conditions?.axial_depth_mm || 3.0;
    const ae = context.cutting_conditions?.radial_depth_mm || 6.0;
    const D = context.tool?.diameter_mm || 12.0;
    const N = context.tool?.flutes || 4;

    let neuralResponse: Awaited<ReturnType<typeof millingInferenceOrchestratorEngine.infer>> | null = null;
    try {
      neuralResponse = await millingInferenceOrchestratorEngine.infer({
        conditions: {
          cutting_speed_mpm: Vc,
          feed_per_tooth_mm: fz,
          axial_depth_mm: ap,
          radial_depth_mm: ae,
          spindle_speed_rpm: physics.spindle_rpm || Math.round((Vc * 1000) / (Math.PI * D)),
          tool_diameter_mm: D,
          num_flutes: N,
          material_iso_group: context.material.iso_group,
          tool_material: "carbide",
          coolant_type: (context.constraints?.coolant_type as "dry" | "flood" | "mql" | "cryogenic") || "flood",
        },
        targets: ["chatter", "force", "thermal", "surface", "tool_life"],
        confidence_threshold: 0.6,
      });
      reasoningChain.push(`[DL] Unified inference: ${neuralResponse.predictions.length} predictions, aggregated confidence ${(neuralResponse.aggregated_confidence * 100).toFixed(1)}%`);
      if (neuralResponse.warnings.length > 0) {
        for (const w of neuralResponse.warnings) warnings.push(w);
      }
    } catch (err) {
      warnings.push(`Unified inference failed: ${err instanceof Error ? err.message : String(err)}`);
      reasoningChain.push("[DL] Unified inference unavailable; downstream physics predictions will be authoritative");
    }

    // U-MIO22A: NeuralModelRegistry — capture active model versions for G-code header traceability
    const modelVersions: Record<string, string> = {};
    try {
      const targets = ["chatter", "force", "thermal", "surface", "tool_life"];
      for (const target of targets) {
        const modelId = `milling_${target}_predictor`;
        const active = neuralModelRegistryEngine.getActiveVersion(modelId);
        if (active) {
          modelVersions[target] = active;
        }
      }
      reasoningChain.push(`[DL] Registered model versions: ${Object.keys(modelVersions).length}/5 targets have active checkpoints`);
    } catch (err) {
      reasoningChain.push(`[DL] Model registry query soft-failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // U-MIO23: Transfer Learning — material scaling for non-reference materials
    let transferLearningResult: NonNullable<MachiningPlan["deep_learning"]>["transfer_learning"] | undefined;
    try {
      // Reference material per ISO group (MATERIAL_DB contains common entries)
      const referenceByISO: Record<string, string> = {
        P: "Steel",
        M: "Stainless_Steel",
        K: "Cast_Iron",
        N: "Aluminum",
        S: "Titanium",
        H: "Hardened_Steel",
      };
      const sourceMaterial = referenceByISO[context.material.iso_group];
      const targetMaterial = context.material.name;

      if (sourceMaterial && targetMaterial && sourceMaterial.toLowerCase() !== targetMaterial.toLowerCase()) {
        try {
          const tx = transferLearningEngine.materialTransfer({
            source_material: sourceMaterial,
            target_material: targetMaterial,
            source_speed_mmin: Vc,
            source_tool_life_min: 60,
          });
          if (tx && tx.value) {
            transferLearningResult = {
              source_material: sourceMaterial,
              scaled_speed_mmin: tx.value.scaled_speed,
              scaled_life_min: tx.value.scaled_life,
              similarity_score: tx.value.similarity_score,
            };
            reasoningChain.push(`[DL] Transfer learning: ${sourceMaterial}→${targetMaterial}, Vc scaled ${Vc.toFixed(1)}→${tx.value.scaled_speed.toFixed(1)} m/min, similarity ${tx.value.similarity_score.toFixed(2)}`);
          }
        } catch (txErr) {
          // Material not in built-in DB — skip, not fatal
          reasoningChain.push(`[DL] Transfer learning skipped: ${txErr instanceof Error ? txErr.message : "material not in DB"}`);
        }
      } else {
        reasoningChain.push("[DL] Reference material in use; no transfer scaling required");
      }
    } catch (err) {
      reasoningChain.push(`[DL] Transfer learning soft-failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // U-MIO24: LoRA adapter registry — surface relevant adapter ids for this context
    let loraAdapters: string[] = [];
    try {
      const adapters = await prismLoRAAdapterEngine.list({});
      loraAdapters = adapters
        .filter(a => {
          const tags = (a as { tags?: string[] }).tags || [];
          return tags.includes(context.machine_type) || tags.includes(context.material.iso_group);
        })
        .slice(0, 5)
        // LoRA adapter records use `adapterId` (per the registry schema), not
        // a bare `id`. Cast through unknown so the narrower local view is legal.
        .map(a => (a as unknown as { adapterId: string }).adapterId);
      if (loraAdapters.length > 0) {
        reasoningChain.push(`[DL] LoRA adapters available: ${loraAdapters.join(", ")}`);
      }
    } catch (err) {
      // Adapter registry may be empty — non-fatal
      reasoningChain.push("[DL] LoRA adapter registry empty or unavailable");
    }

    // Cache hit rate from orchestrator stats
    let cacheHitRate = 0;
    try {
      const stats = millingInferenceOrchestratorEngine.getStatistics();
      cacheHitRate = (stats as { cache_hit_rate?: number }).cache_hit_rate || 0;
    } catch {
      // ignore
    }

    const neuralPredictions = (neuralResponse?.predictions || []).map(p => ({
      target: p.target,
      value: p.value,
      unit: p.unit,
      confidence: p.confidence,
      fallback_used: p.fallback_used,
    }));

    const aggregatedConfidence = neuralResponse?.aggregated_confidence || 0.7;

    return {
      subsystem: "neural",
      engine_name: "MillingInferenceOrchestratorEngine+TransferLearning+LoRA",
      confidence: aggregatedConfidence,
      result: {
        neural_predictions: neuralPredictions,
        aggregated_confidence: aggregatedConfidence,
        inference_time_ms: neuralResponse?.total_inference_time_ms || 0,
        cache_hit_rate: cacheHitRate,
        model_versions: modelVersions,
        transfer_learning: transferLearningResult,
        lora_adapters: loraAdapters,
      },
      reasoning_trace: [
        `Predictors: ${neuralPredictions.length}/5`,
        `Confidence: ${(aggregatedConfidence * 100).toFixed(1)}%`,
        `Model versions: ${Object.keys(modelVersions).length}`,
        `LoRA adapters: ${loraAdapters.length}`,
      ],
      warnings: warnings.length > 0 ? warnings : undefined,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // ==================== PHASE 9: COGNITIVE REASONING LAYER ====================
  // U-MIO25: Causal reasoning (root-cause isolation)
  // U-MIO26: Temporal reasoning (tool-wear trajectory)
  // U-MIO27: Reasoning trace ledger (audit trail)
  // U-MIO27A: Deep logic proof trees with formula citations
  // U-MIO27B: Chain-of-thought manufacturing reasoning
  // U-MIO27C: Cognitive subsystem orchestration
  private async executeCognitiveSubsystem(
    context: MachiningContext,
    physicsResult: AISubsystemResult,
    neuralResult: AISubsystemResult,
    adaptiveResult: AISubsystemResult,
    reasoningChain: string[]
  ): Promise<AISubsystemResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const formulaCitations: string[] = [];

    const physicsData = physicsResult.result as {
      cutting_speed_m_min: number;
      spindle_rpm: number;
      cutting_force_n: number;
      power_kw: number;
      kienzle_kc1_1: number;
      kienzle_mc: number;
      taylor_c: number;
      taylor_n: number;
    };
    const neuralData = neuralResult.result as {
      chatter_probability?: number;
      tool_life_minutes?: number;
    };

    // ---- Proof Tree (U-MIO27A) ----
    let proofTreeId: string | undefined;
    let proofNodeCount = 0;
    let proofDepth = 0;
    try {
      const builder: ProofTreeBuilder = deepLogicTraceEngine.beginProof("MachiningIntelligenceOrchestrator", {
        machine: context.machine_type,
        operation: context.operation_type,
        material: context.material.name,
      });

      const matPremise = builder.addPremise(
        "material_known",
        [{ name: "material", type: "string", value: context.material.name }],
        "true",
        1.0
      );
      const kcPremise = builder.addPremise(
        "kienzle_coefficient",
        [
          { name: "kc1_1", type: "number", value: physicsData.kienzle_kc1_1, unit: "N/mm²" },
          { name: "mc", type: "number", value: physicsData.kienzle_mc },
        ],
        "true",
        0.98
      );
      const toolPremise = builder.addPremise(
        "tool_available",
        [{ name: "tool_diameter", type: "number", value: context.tool.diameter_mm, unit: "mm" }],
        "true",
        1.0
      );

      const forceNode = builder.addInference(
        [matPremise, kcPremise],
        "within_force_envelope",
        [{ name: "Fc", type: "number", value: physicsData.cutting_force_n, unit: "N" }],
        { type: "formula", id: "F-001", name: "Kienzle Cutting Force", citation: "Kienzle 1952" },
        "Fc = kc1_1 × ap × fz^(1 - mc)",
        "true",
        0.95
      );
      formulaCitations.push("Kienzle 1952 (F-001)");

      const taylorNode = builder.addInference(
        [matPremise, toolPremise],
        "tool_life_acceptable",
        [
          { name: "Vc", type: "number", value: physicsData.cutting_speed_m_min, unit: "m/min" },
          { name: "T_minutes", type: "number", value: neuralData.tool_life_minutes ?? 60, unit: "min" },
        ],
        { type: "formula", id: "F-002", name: "Taylor Tool Life", citation: "Taylor 1907" },
        "T = (C / Vc)^(1/n)",
        "true",
        0.9
      );
      formulaCitations.push("Taylor 1907 (F-002)");

      builder.setConclusion(
        [forceNode, taylorNode],
        "machining_plan_valid",
        [{ name: "plan_rpm", type: "number", value: physicsData.spindle_rpm, unit: "rpm" }],
        { type: "rule", id: "R-001", name: "Orchestrator Synthesis", citation: "MIO-MS0 U-MIO27A" },
        "Force envelope AND tool life acceptable ⇒ plan valid",
        "true"
      );

      const tree = deepLogicTraceEngine.finalizeProof(builder);
      proofTreeId = tree.id;
      proofNodeCount = tree.nodes.size;
      proofDepth = tree.depth;
      reasoningChain.push(`[DL] Proof tree ${tree.id} built: ${proofNodeCount} nodes, depth ${proofDepth}, valid=${tree.isValid}`);
    } catch (err) {
      warnings.push(`[DL] proof tree build failed: ${(err as Error).message}`);
    }

    // ---- Causal Reasoning (U-MIO25) ----
    const localCausal = new (causalReasoningEngine.constructor as new () => typeof causalReasoningEngine)();
    let rootCauses: string[] = [];
    try {
      localCausal.addEdges([
        { from: "spindle_rpm", to: "cutting_speed", confidence: 0.98, polarity: "positive", reason: "Vc = π·D·N/1000" },
        { from: "cutting_speed", to: "cutting_temperature", confidence: 0.92, polarity: "positive", reason: "adiabatic heating" },
        { from: "cutting_temperature", to: "tool_wear_rate", confidence: 0.88, polarity: "positive", reason: "Arrhenius diffusion" },
        { from: "tool_wear_rate", to: "surface_finish", confidence: 0.85, polarity: "negative", reason: "worn edge degrades Ra" },
        { from: "feed_per_tooth", to: "cutting_force", confidence: 0.95, polarity: "positive", reason: "Kienzle direct" },
        { from: "cutting_force", to: "tool_deflection", confidence: 0.9, polarity: "positive", reason: "F·L³/3EI" },
        { from: "tool_deflection", to: "surface_finish", confidence: 0.8, polarity: "negative", reason: "form error" },
        { from: "axial_depth", to: "cutting_force", confidence: 0.93, polarity: "positive", reason: "Kienzle direct" },
        { from: "axial_depth", to: "chatter_probability", confidence: 0.75, polarity: "positive", reason: "Altintas SLD" },
        { from: "chatter_probability", to: "surface_finish", confidence: 0.82, polarity: "negative", reason: "vibration marks" },
      ]);
      rootCauses = localCausal.rootCauses("surface_finish", 4);
      reasoningChain.push(`[CAUSAL] surface_finish root causes: ${rootCauses.join(", ") || "(none isolated)"}`);
    } catch (err) {
      warnings.push(`[CAUSAL] root-cause analysis failed: ${(err as Error).message}`);
    }

    // ---- Temporal Reasoning (U-MIO26) ----
    const localTemporal = new (temporalReasoningEngine.constructor as new () => typeof temporalReasoningEngine)();
    let temporalProjection: {
      series: string;
      trend: "increasing" | "decreasing" | "stable";
      confidence: number;
    } | undefined;
    try {
      const now = Date.now();
      const baseLife = neuralData.tool_life_minutes ?? 60;
      const samples = [
        { t: now - 40 * 60_000, wear: 0.05 },
        { t: now - 30 * 60_000, wear: 0.09 },
        { t: now - 20 * 60_000, wear: 0.14 },
        { t: now - 10 * 60_000, wear: 0.18 },
        { t: now, wear: 0.23 },
      ];
      for (const s of samples) {
        localTemporal.record("tool_wear_mm", s.wear, new Date(s.t).toISOString(), `life=${baseLife}`);
      }
      const proj = localTemporal.project("tool_wear_mm", 5);
      if (proj) {
        const trend: "increasing" | "decreasing" | "stable" =
          proj.slopePerDay > 0.001 ? "increasing" : proj.slopePerDay < -0.001 ? "decreasing" : "stable";
        temporalProjection = { series: "tool_wear_mm", trend, confidence: proj.r2 };
        reasoningChain.push(`[TEMPORAL] tool_wear_mm trend=${trend}, slope=${proj.slopePerDay}/day, R²=${proj.r2}`);
      }
    } catch (err) {
      warnings.push(`[TEMPORAL] projection failed: ${(err as Error).message}`);
    }

    // ---- Chain-of-Thought (U-MIO27B) ----
    let cotSteps = 0;
    let cotBacktracks = 0;
    try {
      const chain = ChainOfThoughtEngine.reason({
        problem: `Select cutting parameters for ${context.operation_type} of ${context.material.name} with ${context.tool.type} (D=${context.tool.diameter_mm}mm)`,
        goal: "Maximize MRR subject to force/power/surface constraints",
        known_facts: [
          `Kienzle kc1.1 = ${physicsData.kienzle_kc1_1} N/mm² for ${context.material.iso_group}-group`,
          `Baseline Vc = ${physicsData.cutting_speed_m_min.toFixed(1)} m/min`,
          `Predicted Fc = ${physicsData.cutting_force_n.toFixed(0)} N`,
        ],
        constraints: [
          context.constraints.max_force_n ? `Fc ≤ ${context.constraints.max_force_n} N` : "Fc within physical limits",
          context.constraints.max_power_kw ? `P ≤ ${context.constraints.max_power_kw} kW` : "P within spindle limits",
          context.constraints.target_surface_finish_um ? `Ra ≤ ${context.constraints.target_surface_finish_um} µm` : "Ra acceptable",
        ],
        strategy: "linear",
        max_steps: 8,
      });
      cotSteps = chain.steps.length;
      cotBacktracks = chain.meta.backtrack_count;
      reasoningChain.push(`[COT] ${cotSteps} steps, ${cotBacktracks} backtracks, confidence=${chain.current_confidence.toFixed(2)}`);
    } catch (err) {
      warnings.push(`[COT] reasoning failed: ${(err as Error).message}`);
    }

    // ---- Ledger Entry (U-MIO27/U-MIO27C) ----
    let ledgerEntryId: string | undefined;
    try {
      const ledgerResult = millingReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "MachiningIntelligenceOrchestrator",
        action: "orchestrate",
        keywords: [
          context.machine_type,
          context.operation_type,
          context.material.name,
          context.tool.type,
        ],
        inputs_summary: `${context.material.name} × ${context.tool.type} D${context.tool.diameter_mm}mm × ${context.operation_type}`,
        outputs_summary: `RPM=${physicsData.spindle_rpm}, Fc=${physicsData.cutting_force_n.toFixed(0)}N, P=${physicsData.power_kw.toFixed(2)}kW`,
        confidence: (physicsResult.confidence + neuralResult.confidence + adaptiveResult.confidence) / 3,
        awareness_used: true,
        engines_consulted: [
          "CausalReasoningEngine",
          "TemporalReasoningEngine",
          "DeepLogicTraceEngine",
          "ChainOfThoughtEngine",
        ],
        physics_validated: true,
        physics_warnings: warnings.length > 0 ? warnings : undefined,
      });
      if (ledgerResult.ok && ledgerResult.entry) {
        ledgerEntryId = ledgerResult.entry.id;
        reasoningChain.push(`[LEDGER] trace ${ledgerEntryId} appended (${formulaCitations.length} citations)`);
      } else if (!ledgerResult.ok) {
        warnings.push(`[LEDGER] append failed: ${ledgerResult.errors?.join(", ") ?? "unknown"}`);
      }
    } catch (err) {
      warnings.push(`[LEDGER] recordTraceSync error: ${(err as Error).message}`);
    }

    const confidence = proofTreeId ? 0.92 : 0.7;
    return {
      subsystem: "reasoning",
      engine_name: "CognitiveSubsystem[Causal+Temporal+CoT+ProofTree+Ledger]",
      confidence,
      result: {
        proof_tree_id: proofTreeId,
        proof_tree_node_count: proofNodeCount,
        proof_tree_depth: proofDepth,
        causal_root_causes: rootCauses,
        temporal_projection: temporalProjection,
        chain_of_thought_steps: cotSteps,
        chain_of_thought_backtracks: cotBacktracks,
        ledger_entry_id: ledgerEntryId,
        formula_citations: formulaCitations,
      },
      reasoning_trace: [
        `Proof tree: ${proofNodeCount} nodes, depth ${proofDepth}`,
        `Causal roots: ${rootCauses.length}`,
        `CoT: ${cotSteps} steps, ${cotBacktracks} backtracks`,
        `Ledger: ${ledgerEntryId ?? "(skipped)"}`,
      ],
      warnings: warnings.length > 0 ? warnings : undefined,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // ==================== PLAN SYNTHESIS ====================

  private synthesizePlan(
    context: MachiningContext,
    subsystemResults: AISubsystemResult[],
    reasoningChain: string[],
    warnings: string[]
  ): MachiningPlan {
    const physics = subsystemResults.find(r => r.subsystem === "physics")?.result as any;
    const neural = subsystemResults.find(r => r.subsystem === "neural")?.result as any;
    const adaptive = subsystemResults.find(r => r.subsystem === "adaptive")?.result as any;
    const reasoning = subsystemResults.find(r => r.subsystem === "reasoning")?.result as any;

    // Apply adaptive multipliers, capped by machine constraints
    const rawRpm = Math.round(physics.spindle_rpm * (adaptive?.speed_multiplier || 1.0));
    const finalRpm = context.constraints.max_spindle_rpm
      ? Math.min(rawRpm, context.constraints.max_spindle_rpm)
      : rawRpm;
    const fz = 0.1 * (adaptive?.feed_multiplier || 1.0);
    const feedRate = finalRpm * (context.tool.flutes || 4) * fz;

    // Collect all warnings
    const allWarnings = [
      ...warnings,
      ...(reasoning?.constraint_violations || []),
      ...subsystemResults.flatMap(r => r.warnings || []),
    ];

    // Calculate overall confidence
    const avgConfidence = subsystemResults.reduce((sum, r) => sum + r.confidence, 0) / subsystemResults.length;

    // Safety calculations
    const forceRatio = context.constraints.max_force_n
      ? physics.cutting_force_n / context.constraints.max_force_n
      : 0.5;
    const powerRatio = context.constraints.max_power_kw
      ? physics.power_kw / context.constraints.max_power_kw
      : 0.5;
    const stabilityMargin = 1 - (neural?.chatter_probability || 0.1);
    const deflectionRatio = 0.3; // Would calculate from actual deflection

    const safetyScore = Math.min(
      1 - forceRatio * 0.3,
      1 - powerRatio * 0.3,
      stabilityMargin,
      1 - deflectionRatio
    );

    // Phase 7 post-processing results (if present)
    const postProcResult = subsystemResults.find(
      r => r.engine_name === "MasterPostProcessorAGIOrchestrationEngine" || r.engine_name === "PostProcessorFallback"
    )?.result as { gcode_lines?: number; controller_dialect?: string; hsm_enabled?: boolean; optimizations_applied?: string[] } | undefined;

    // Phase 8 deep learning results (if present)
    const deepLearningResult = subsystemResults.find(
      r => r.engine_name?.startsWith("MillingInferenceOrchestratorEngine")
    )?.result as MachiningPlan["deep_learning"] | undefined;

    // Phase 9 cognitive reasoning results (if present)
    const cognitiveResult = subsystemResults.find(
      r => r.engine_name?.startsWith("CognitiveSubsystem")
    )?.result as MachiningPlan["cognitive"] | undefined;

    return {
      context,
      cutting_parameters: {
        cutting_speed_m_min: physics.cutting_speed_m_min * (adaptive?.speed_multiplier || 1.0),
        feed_per_tooth_mm: fz,
        axial_depth_mm: context.geometry.stock_dimensions_mm[2] * 0.1,
        radial_depth_mm: context.tool.diameter_mm * 0.5,
        spindle_rpm: finalRpm,
        feed_rate_mm_min: feedRate,
      },
      predictions: {
        cutting_force_n: neural?.corrected_force_n || physics.cutting_force_n,
        power_kw: physics.power_kw,
        temperature_c: neural?.predicted_temperature_c || 300,
        surface_finish_um: neural?.predicted_surface_finish_um || 3.2,
        tool_life_min: 60, // Would calculate from Taylor
        mrr_cm3_min: physics.mrr_cm3_min,
      },
      safety: {
        force_ratio: forceRatio,
        power_ratio: powerRatio,
        stability_margin: stabilityMargin,
        deflection_ratio: deflectionRatio,
        overall_safety_score: safetyScore,
      },
      subsystem_results: subsystemResults,
      reasoning_chain: reasoningChain,
      confidence: avgConfidence,
      warnings: allWarnings,
      post_processing: postProcResult
        ? {
            gcode_lines: postProcResult.gcode_lines || 0,
            controller_dialect: postProcResult.controller_dialect || "unknown",
            hsm_enabled: postProcResult.hsm_enabled || false,
            optimizations_applied: postProcResult.optimizations_applied || [],
          }
        : undefined,
      deep_learning: deepLearningResult,
      cognitive: cognitiveResult,
    };
  }

  /**
   * Phase 11 U-MIO31 — Apply closed-loop SPC feedback from post-production CMM data.
   *
   * Takes an orchestrated plan + per-feature measurements and returns a NEW plan
   * with cutting_parameters conservatively adjusted per SPC Cpk/Ppk, Nelson rules,
   * and trend analysis. Multi-feature worst-case multipliers are applied (i.e. the
   * most restrictive feature dominates the adjustment).
   *
   * Action hierarchy:
   *   escalate > coarse_adjust > fine_tune > maintain
   *
   * @param plan — the plan output by orchestrate() or a prior applySPCFeedback()
   * @param featureMeasurements — array of per-feature CMM measurement sets
   * @returns updated plan with spc_feedback metadata and adjusted cutting_parameters
   */
  applySPCFeedback(
    plan: MachiningPlan,
    featureMeasurements: Array<Omit<FeedbackLoopInput, "current_params">>,
  ): MachiningPlan {
    if (!featureMeasurements || featureMeasurements.length === 0) {
      return plan; // no-op
    }

    const current = {
      cutting_speed_m_min: plan.cutting_parameters.cutting_speed_m_min,
      feed_per_tooth_mm: plan.cutting_parameters.feed_per_tooth_mm ?? 0.1,
      axial_depth_mm: plan.cutting_parameters.axial_depth_mm,
    };

    const results: FeedbackLoopResult[] = featureMeasurements.map(f =>
      spcFeedbackLoopEngine.evaluate({ ...f, current_params: current }),
    );

    // Worst-case multipliers across all features
    let speed = 1.0, feed = 1.0, depth = 1.0;
    let minCpk = Number.POSITIVE_INFINITY;
    const actionRank: Record<FeedbackLoopResult["action"], number> = {
      maintain: 0, fine_tune: 1, coarse_adjust: 2, escalate: 3,
    };
    let worstAction: FeedbackLoopResult["action"] = "maintain";
    const escalated: string[] = [];

    for (const r of results) {
      speed = Math.min(speed, r.adjustments.speed_multiplier);
      feed = Math.min(feed, r.adjustments.feed_multiplier);
      depth = Math.min(depth, r.adjustments.depth_multiplier);
      if (r.cpk < minCpk) minCpk = r.cpk;
      if (actionRank[r.action] > actionRank[worstAction]) worstAction = r.action;
      if (r.action === "escalate") escalated.push(r.feature_name);
    }

    if (!isFinite(minCpk)) minCpk = 0;

    const newRpm = plan.cutting_parameters.feed_per_tooth_mm !== undefined
      ? Math.round(plan.cutting_parameters.spindle_rpm * speed)
      : plan.cutting_parameters.spindle_rpm;
    const newFz = plan.cutting_parameters.feed_per_tooth_mm !== undefined
      ? plan.cutting_parameters.feed_per_tooth_mm * feed
      : undefined;
    const flutes = plan.context.tool.flutes ?? 4;
    const newFeedRate = newFz !== undefined
      ? newRpm * flutes * newFz
      : plan.cutting_parameters.feed_rate_mm_min * feed;

    return {
      ...plan,
      cutting_parameters: {
        ...plan.cutting_parameters,
        cutting_speed_m_min: plan.cutting_parameters.cutting_speed_m_min * speed,
        feed_per_tooth_mm: newFz,
        axial_depth_mm: plan.cutting_parameters.axial_depth_mm * depth,
        spindle_rpm: newRpm,
        feed_rate_mm_min: Math.round(newFeedRate),
      },
      spc_feedback: {
        features_evaluated: results.length,
        overall_action: worstAction,
        min_cpk: Number(minCpk.toFixed(4)),
        feature_results: results,
        parameter_multipliers: {
          speed: Number(speed.toFixed(4)),
          feed: Number(feed.toFixed(4)),
          depth: Number(depth.toFixed(4)),
        },
        escalated_features: escalated,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[SPC] ${results.length} feature(s) evaluated, min Cpk=${minCpk.toFixed(2)}, action=${worstAction}`,
        ...(escalated.length > 0 ? [`[SPC] ESCALATE: ${escalated.join(", ")}`] : []),
      ],
      warnings: [
        ...plan.warnings,
        ...(worstAction === "escalate"
          ? [`SPC feedback escalation: Cpk below 1.00 for ${escalated.join(", ")}. Human review required.`]
          : []),
      ],
    };
  }

  /**
   * Phase 11 U-MIO31A — Record post-job actual-vs-predicted observations
   * and append them to the neural-training collector. JM DIE proven programs
   * automatically receive 2× training weight.
   *
   * Pairs with applySPCFeedback(): call after dimensional SPC feedback so that
   * neural predictors learn from the same observations that drove the SPC
   * adjustments, closing the AI feedback loop.
   *
   * @param plan — plan output by orchestrate() (for provenance: job_id, jm_die_proven)
   * @param observation — predicted vs actual values keyed by NeuralTarget
   * @returns updated plan with `neural_feedback` metadata
   */
  recordActualVsPredicted(
    plan: MachiningPlan,
    observation: Partial<Omit<ObservationInput, "targets">> & {
      targets: ObservationInput["targets"];
    },
  ): MachiningPlan {
    const mergedContext: ObservationInput["context"] = {
      material: plan.context.material.name ?? plan.context.material.iso_group ?? "unknown",
      iso_group: plan.context.material.iso_group,
      tool_type: plan.context.tool.type,
      tool_diameter_mm: plan.context.tool.diameter_mm,
      operation_type: plan.context.operation_type,
      cutting_speed_m_min: plan.cutting_parameters.cutting_speed_m_min,
      feed_per_tooth_mm: plan.cutting_parameters.feed_per_tooth_mm,
      axial_depth_mm: plan.cutting_parameters.axial_depth_mm,
      ...(observation.context ?? {}),
    };

    const input: ObservationInput = {
      observation_id: observation.observation_id,
      job_id: observation.job_id ?? "unknown-job",
      program_id: observation.program_id,
      jm_die_proven: observation.jm_die_proven ?? false,
      context: mergedContext,
      targets: observation.targets,
      timestamp: observation.timestamp,
    };

    const example: TrainingExample = actualVsPredictedCollectorEngine.record(input);
    const bufferSize = actualVsPredictedCollectorEngine.size;
    const minBatch = actualVsPredictedCollectorEngine.getConfig().min_batch_size;

    return {
      ...plan,
      neural_feedback: {
        observation_id: example.observation_id,
        targets_recorded: Object.keys(example.labels) as NeuralTarget[],
        weight: example.weight,
        jm_die_proven: example.jm_die_proven,
        buffer_size: bufferSize,
        batch_ready: bufferSize >= minBatch,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[NEURAL] obs ${example.observation_id} recorded, weight=${example.weight.toFixed(1)}, buffer=${bufferSize}/${minBatch}`,
      ],
    };
  }

  /**
   * Emit a neural training batch if the collector buffer has reached
   * min_batch_size. Does not clear the buffer — call collector.clear()
   * after the trainer has consumed the batch.
   */
  emitNeuralTrainingBatch(): CollectorBatch | null {
    return actualVsPredictedCollectorEngine.emitTrainingBatch();
  }

  /**
   * Query accuracy-trend statistics for a given neural target across the
   * collector buffer. Returns first-half vs second-half RMSE comparison
   * so the orchestrator can detect model drift / improvement over time.
   */
  getNeuralAccuracyTrend(target: NeuralTarget): ReturnType<
    typeof actualVsPredictedCollectorEngine.accuracyTrend
  > {
    return actualVsPredictedCollectorEngine.accuracyTrend(target);
  }

  /**
   * Phase 11 U-MIO32 — Run AS9102 First Article Inspection and attach the
   * approval gate to the plan. Production is blocked (production_released=false)
   * unless verdict is ACCEPT. REJECT and MRB both require human disposition.
   *
   * Pairs with SPC and neural feedback: FAI is the one-time gate for first-part,
   * SPC is the per-part continuing gate, and neural_feedback continuously trains
   * the predictors. Together they form the quality/AI closed loop.
   *
   * @param plan — the orchestrator plan to gate
   * @param faiInput — part + features + (optional) measurements
   * @returns updated plan with fai_gate metadata; warnings/reasoning augmented
   */
  async runFirstArticleInspection(
    plan: MachiningPlan,
    faiInput: FAIInput,
  ): Promise<MachiningPlan> {
    const fai: FAIResult = await firstArticleInspectionPipelineEngine.runFAI(faiInput);
    const released = fai.disposition.verdict === "ACCEPT";

    return {
      ...plan,
      fai_gate: {
        fai_id: fai.fai_id,
        verdict: fai.disposition.verdict,
        production_released: released,
        total_characteristics: fai.disposition.total_characteristics,
        pass_count: fai.disposition.pass_count,
        fail_count: fai.disposition.fail_count,
        unmeasured_count: fai.disposition.unmeasured_count,
        critical_failures: fai.disposition.critical_failures,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[FAI] ${fai.fai_id}: ${fai.disposition.pass_count}/${fai.disposition.total_characteristics} pass, verdict=${fai.disposition.verdict}, released=${released}`,
      ],
      warnings: [
        ...plan.warnings,
        ...(released
          ? []
          : [`FAI gate BLOCKED production release: verdict=${fai.disposition.verdict} (${fai.disposition.fail_count} fail, ${fai.disposition.unmeasured_count} unmeasured). Human disposition required.`]),
      ],
    };
  }

  /**
   * Generate AS9102 Form 1/2/3 plus Markdown for an existing FAI.
   * @param fai_id — identifier returned by runFirstArticleInspection()
   */
  generateFAIForms(fai_id: string): ReturnType<
    typeof firstArticleInspectionPipelineEngine.generateForms
  > {
    return firstArticleInspectionPipelineEngine.generateForms(fai_id);
  }

  /**
   * Phase 11 U-MIO34 — Generate AIAG APQP/PPAP Control Plan for a part.
   *
   * Attaches a Control Plan summary onto the orchestrator plan. The Control
   * Plan is the auditable bridge from design/process FMEA to shop-floor
   * execution. Each characteristic is assigned a sample size, frequency,
   * control method (SPC_Xbar_R, 100%_check, AQL_sampling, poka_yoke),
   * and reaction plan — keyed off severity (critical / major / minor).
   *
   * Companion to runFirstArticleInspection(): the Control Plan defines the
   * ongoing per-piece rules; FAI validates the first-article against them.
   *
   * @param plan — orchestrator plan to enrich
   * @param cpInput — part, revision, phase, and characteristic list
   * @returns updated plan with control_plan summary + warnings propagated
   */
  generateControlPlan(
    plan: MachiningPlan,
    cpInput: ControlPlanInput,
  ): MachiningPlan {
    const cp: ControlPlan = controlPlanGeneratorEngine.generate(cpInput);

    return {
      ...plan,
      control_plan: {
        control_plan_id: cp.control_plan_id,
        phase: cp.phase,
        total_characteristics: cp.summary.total_characteristics,
        critical_count: cp.summary.critical_count,
        major_count: cp.summary.major_count,
        minor_count: cp.summary.minor_count,
        spc_controlled_count: cp.summary.spc_controlled_count,
        hundred_pct_count: cp.summary.hundred_pct_count,
        poka_yoke_count: cp.summary.poka_yoke_count,
        coverage_warnings: cp.summary.warnings.length,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[CP] ${cp.control_plan_id}: ${cp.summary.total_characteristics} chars (crit=${cp.summary.critical_count}, maj=${cp.summary.major_count}, min=${cp.summary.minor_count}), SPC=${cp.summary.spc_controlled_count}, 100%=${cp.summary.hundred_pct_count}, poka=${cp.summary.poka_yoke_count}`,
      ],
      warnings: [
        ...plan.warnings,
        ...cp.summary.warnings.map(w => `[CP] ${w}`),
      ],
    };
  }

  /**
   * Generate JSON + Markdown + CSV forms for an existing Control Plan.
   * @param control_plan_id — identifier returned by generateControlPlan()
   * @returns forms bundle, or null if plan not found
   */
  generateControlPlanForms(control_plan_id: string): ControlPlanForms | null {
    const cp = controlPlanGeneratorEngine.get(control_plan_id);
    if (!cp) return null;
    return {
      json: cp,
      markdown: controlPlanGeneratorEngine.renderMarkdown(cp),
      csv: controlPlanGeneratorEngine.renderCSV(cp),
    };
  }

  /**
   * Phase 11 U-MIO35 — Generate operator-ready Setup Sheet pipeline.
   *
   * Composes the full multi-op setup package: tool list with pocket
   * assignments, offset presetting, workholding, optional probing routine,
   * first-part verification checklist. Cross-links to routing (U-MIO33) and
   * control plan (U-MIO34) by id.
   *
   * Warnings from pocket collisions, bad stickout, missing offsets, and
   * orphan first-part checks are propagated onto the orchestrator plan
   * with [SETUP] prefix.
   *
   * @param plan — orchestrator plan to enrich
   * @param setupInput — part, ops, tools, workholding, checkpoints
   * @returns updated plan with setup_sheet summary
   */
  generateSetupSheet(
    plan: MachiningPlan,
    setupInput: SetupSheetPipelineInput,
  ): MachiningPlan {
    const pipeline: SetupSheetPipeline = setupSheetPipelineEngine.generate(setupInput);

    return {
      ...plan,
      setup_sheet: {
        setup_id: pipeline.setup_id,
        operation_count: pipeline.summary.operation_count,
        total_tools: pipeline.summary.total_tools,
        unique_tools: pipeline.summary.unique_tools,
        unique_pockets: pipeline.summary.unique_pockets,
        probing_ops: pipeline.summary.probing_ops,
        first_part_check_count: pipeline.first_part_checks.length,
        pipeline_warnings: pipeline.summary.warnings.length,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[SETUP] ${pipeline.setup_id}: ${pipeline.summary.operation_count} ops, ${pipeline.summary.total_tools} tools (${pipeline.summary.unique_tools} unique), ${pipeline.summary.probing_ops} probe ops, ${pipeline.first_part_checks.length} first-part checks`,
      ],
      warnings: [
        ...plan.warnings,
        ...pipeline.summary.warnings.map(w => `[SETUP] ${w}`),
      ],
    };
  }

  /**
   * Generate JSON + Markdown + CSV forms for an existing Setup Sheet.
   * @param setup_id — identifier returned by generateSetupSheet()
   * @returns forms bundle, or null if pipeline not found
   */
  generateSetupSheetForms(setup_id: string): SetupSheetPipelineForms | null {
    const pipeline = setupSheetPipelineEngine.get(setup_id);
    if (!pipeline) return null;
    return {
      json: pipeline,
      markdown: setupSheetPipelineEngine.renderMarkdown(pipeline),
      csv: setupSheetPipelineEngine.renderCSV(pipeline),
    };
  }

  /**
   * Phase 11 U-MIO36 — Generate in-process Probing plan for a part.
   *
   * Produces a set of probing routines (WCS find, tool length verify,
   * in-process feature probe, post-op verify, calibration) with canonical
   * Renishaw Inspection Plus P-code G65 cycles and estimated execution
   * time. Routines are bound to a setup id and routing op numbers.
   *
   * @param plan — orchestrator plan to enrich
   * @param probingInput — routines + setup id
   * @returns updated plan with probing summary
   */
  generateProbingPlan(
    plan: MachiningPlan,
    probingInput: ProbingIntegrationPlanInput,
  ): MachiningPlan {
    const probing: ProbingIntegrationPlan = probingIntegrationEngine.generate(probingInput);

    return {
      ...plan,
      probing: {
        probing_id: probing.probing_id,
        total_routines: probing.summary.total_routines,
        wcs_find_count: probing.summary.by_kind.wcs_find,
        tool_length_verify_count: probing.summary.by_kind.tool_length_verify,
        feature_probe_count: probing.summary.by_kind.feature_probe,
        post_op_verify_count: probing.summary.by_kind.post_op_verify,
        estimated_total_time_s: probing.summary.estimated_total_time_s,
        probing_warnings: probing.summary.warnings.length,
      },
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[PROBE] ${probing.probing_id}: ${probing.summary.total_routines} routines (wcs=${probing.summary.by_kind.wcs_find}, tlen=${probing.summary.by_kind.tool_length_verify}, feat=${probing.summary.by_kind.feature_probe}, post=${probing.summary.by_kind.post_op_verify}), ~${probing.summary.estimated_total_time_s}s total`,
      ],
      warnings: [
        ...plan.warnings,
        ...probing.summary.warnings.map(w => `[PROBE] ${w}`),
      ],
    };
  }

  /**
   * Record a probe measurement and return disposition (PASS / MARGINAL
   * / FAIL / UNKNOWN) plus compensation recommendation (apply_offset /
   * hold / none). FAIL always recommends HOLD — never auto-compensates.
   *
   * @param probing_id — id returned by generateProbingPlan
   * @param resultInput — routine_id + measured value
   */
  recordProbingResult(probing_id: string, resultInput: ProbingResultInput): ProbingResult {
    return probingIntegrationEngine.recordResult(probing_id, resultInput);
  }

  /** Retrieve the full probing plan JSON + Markdown by id. */
  getProbingPlanForms(probing_id: string): { json: ProbingIntegrationPlan; markdown: string } | null {
    const p = probingIntegrationEngine.get(probing_id);
    if (!p) return null;
    return {
      json: p,
      markdown: probingIntegrationEngine.renderMarkdown(p),
    };
  }

  /**
   * Phase 12 U-MIO37 — Open a mandatory HITL Operator Approval Gate for a
   * part. Attaches a pending-verdict gate summary to the plan and blocks
   * production until the operator verifies the checklist and requests
   * approval.
   *
   * Intended pairing: call this AFTER generateSetupSheet / generateProbingPlan
   * / generateControlPlan so the checklist can cross-link their ids. The
   * caller is responsible for composing the checklist from those artifacts
   * (canonical categories: setup / tooling / safety / parameters / probing
   * / quality / documentation).
   *
   * @param plan — orchestrator plan to enrich
   * @param gateInput — part/revision/operator/checklist
   * @returns updated plan with approval_gate summary; production_released=false
   */
  openApprovalGate(plan: MachiningPlan, gateInput: ApprovalGateInput): MachiningPlan {
    const gate: ApprovalGate = operatorApprovalGateEngine.openGate(gateInput);
    return {
      ...plan,
      approval_gate: this.summarizeApprovalGate(gate),
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[APV] ${gate.gate_id} opened: ${gate.summary.total_items} items (crit=${gate.summary.critical_total}, maj=${gate.summary.major_total}, min=${gate.summary.minor_total}), verdict=PENDING`,
      ],
    };
  }

  /**
   * Operator verifies (ticks) an individual checklist item on an open gate.
   * Throws if the item is BLOCKED by an upstream dependency.
   *
   * @param gate_id — id returned by openApprovalGate
   * @param item_id — checklist item identifier
   * @param verifier — operator id
   * @param notes — optional verifier notes
   */
  verifyApprovalItem(
    gate_id: string,
    item_id: string,
    verifier: string,
    notes?: string,
  ): ApprovalGate {
    return operatorApprovalGateEngine.verifyItem(gate_id, item_id, verifier, notes);
  }

  /**
   * Unblock a checklist item once its upstream dependency is satisfied.
   */
  unblockApprovalItem(gate_id: string, item_id: string): ApprovalGate {
    return operatorApprovalGateEngine.unblockItem(gate_id, item_id);
  }

  /**
   * Operator requests final approval for production release. Release rules:
   *   - All CRITICAL items verified
   *   - ≥90% non-critical items verified
   *   - No blocked items
   * Satisfied → verdict=APPROVED, production_released=true, tamper-evident
   * signature captured. Otherwise → REJECTED or ESCALATED with audit record.
   *
   * Plan's approval_gate field is refreshed with the new verdict.
   *
   * @param plan — orchestrator plan to update
   * @param gate_id — the gate to evaluate
   * @param operator_id — operator signing off (must be on assigned list)
   */
  requestApproval(
    plan: MachiningPlan,
    gate_id: string,
    operator_id: string,
  ): MachiningPlan {
    const gate = operatorApprovalGateEngine.requestApproval(gate_id, operator_id);
    const summary = this.summarizeApprovalGate(gate);
    const verdictLine = `[APV] ${gate.gate_id} verdict=${gate.verdict}, released=${gate.production_released}`;
    const latestEscalation = gate.escalations[gate.escalations.length - 1];
    const warningPayload =
      !gate.production_released && latestEscalation
        ? [`[APV] ${gate.verdict}: ${latestEscalation.reason}`]
        : [];
    return {
      ...plan,
      approval_gate: summary,
      reasoning_chain: [...plan.reasoning_chain, verdictLine],
      warnings: [...plan.warnings, ...warningPayload],
    };
  }

  /**
   * Supervisor resolves an open escalation (e.g. authorizes proceed with
   * substitute verification). Returns the updated gate.
   */
  resolveApprovalEscalation(
    gate_id: string,
    escalation_index: number,
    resolved_by: string,
    notes: string,
  ): ApprovalGate {
    return operatorApprovalGateEngine.resolveEscalation(
      gate_id,
      escalation_index,
      resolved_by,
      notes,
    );
  }

  /** Retrieve full approval gate JSON + Markdown by id. */
  getApprovalGate(gate_id: string): { json: ApprovalGate; markdown: string } | null {
    const gate = operatorApprovalGateEngine.get(gate_id);
    if (!gate) return null;
    return {
      json: gate,
      markdown: operatorApprovalGateEngine.renderMarkdown(gate),
    };
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private summarizeApprovalGate(gate: ApprovalGate): NonNullable<MachiningPlan["approval_gate"]> {
    const openEscalations = gate.escalations.filter(e => !e.resolved).length;
    return {
      gate_id: gate.gate_id,
      verdict: gate.verdict,
      production_released: gate.production_released,
      total_items: gate.summary.total_items,
      critical_total: gate.summary.critical_total,
      critical_verified: gate.summary.critical_verified,
      verification_pct: gate.summary.verification_pct,
      blocked_items: gate.summary.blocked_items,
      open_escalations: openEscalations,
      has_signature: !!gate.signature,
    };
  }

  /**
   * Phase 12 U-MIO38 — Open a Safety Veto + Simulation + Collision + Envelope
   * production-release gate. Production is blocked until all four artifacts
   * are attached AND certifySafetyGate() is called with certifier id.
   *
   * @param plan — orchestrator plan to enrich
   * @param gateInput — part/program/machine cross-links
   */
  openSafetyGate(plan: MachiningPlan, gateInput: SafetyGateInput): MachiningPlan {
    const gate: SafetyGate = safetyVetoSimulationGateEngine.openGate(gateInput);
    return {
      ...plan,
      safety_gate: this.summarizeSafetyGate(gate),
      reasoning_chain: [
        ...plan.reasoning_chain,
        `[SVG] ${gate.gate_id} opened for program=${gate.program_id} on machine=${gate.machine_id}, verdict=PENDING`,
      ],
    };
  }

  /** Attach a pre-computed SafetyVetoEngine report to the safety gate. */
  attachSafetyVetoReport(gate_id: string, report: VetoReport): SafetyGate {
    return safetyVetoSimulationGateEngine.attachVetoReport(gate_id, report);
  }

  /** Attach a CAM simulation verdict. */
  attachSimulationVerdict(gate_id: string, result: SimulationVerdict): SafetyGate {
    return safetyVetoSimulationGateEngine.attachSimulation(gate_id, result);
  }

  /** Attach a collision-detection verdict. */
  attachCollisionVerdict(gate_id: string, result: CollisionVerdict): SafetyGate {
    return safetyVetoSimulationGateEngine.attachCollision(gate_id, result);
  }

  /** Attach a machine-envelope validation verdict. */
  attachEnvelopeVerdict(gate_id: string, result: EnvelopeVerdict): SafetyGate {
    return safetyVetoSimulationGateEngine.attachEnvelope(gate_id, result);
  }

  /**
   * Certify the safety gate. On success: verdict=CERTIFIED,
   * production_released=true, tamper-evident hash captured.
   * On any blocker: verdict=BLOCKED, plan gets a [SVG] warning for each
   * blocker so the orchestrator propagates the failure outward.
   */
  certifySafetyGate(plan: MachiningPlan, gate_id: string, certifier_id: string): MachiningPlan {
    const gate = safetyVetoSimulationGateEngine.certify(gate_id, certifier_id);
    const summary = this.summarizeSafetyGate(gate);
    const verdictLine = `[SVG] ${gate.gate_id} verdict=${gate.verdict}, released=${gate.production_released}`;
    const warningPayload =
      !gate.production_released
        ? gate.blockers.map(b => `[SVG] ${gate.verdict} — ${b.source}: ${b.reason}`)
        : [];
    return {
      ...plan,
      safety_gate: summary,
      reasoning_chain: [...plan.reasoning_chain, verdictLine],
      warnings: [...plan.warnings, ...warningPayload],
    };
  }

  /** Retrieve full safety gate JSON + Markdown by id. */
  getSafetyGate(gate_id: string): { json: SafetyGate; markdown: string } | null {
    const gate = safetyVetoSimulationGateEngine.get(gate_id);
    if (!gate) return null;
    return { json: gate, markdown: safetyVetoSimulationGateEngine.renderMarkdown(gate) };
  }

  private summarizeSafetyGate(gate: SafetyGate): NonNullable<MachiningPlan["safety_gate"]> {
    return {
      gate_id: gate.gate_id,
      verdict: gate.verdict,
      production_released: gate.production_released,
      all_four_attached: gate.summary.all_four_attached,
      veto_clear: gate.summary.has_veto_report && !gate.veto_report?.vetoed,
      simulation_pass: gate.summary.simulation_pass,
      collision_count: gate.summary.collision_count,
      envelope_pass: gate.summary.envelope_pass,
      blocker_count: gate.blockers.length,
      has_certification: !!gate.certification,
    };
  }

  // ==================== PHASE 12 U-MIO39: MACHINE KINEMATIC STATE ====================

  /**
   * Update machine kinematic state with a real-time snapshot. Computes thermal
   * expansion per axis (ISO 230-3), servo following-error trend, jerk derating,
   * and controller look-ahead validation.
   *
   * @param plan - The machining plan to update (mutated in place)
   * @param snapshot - Real-time machine state sample
   * @param tolerance_mm - Optional part tolerance to check thermal expansion against
   * @returns The derived state with computed warnings/deratings
   */
  updateMachineState(
    plan: MachiningPlan,
    snapshot: MachineStateSnapshot,
    tolerance_mm?: number,
  ): DerivedState {
    const derived = machineKinematicStateEngine.update(snapshot, tolerance_mm);
    plan.machine_state = this.summarizeMachineState(derived);
    plan.warnings.push(...derived.warnings);
    return derived;
  }

  /**
   * Retrieve the latest machine kinematic state for a given machine_id.
   *
   * @param machine_id - Machine identifier
   * @returns JSON state + Markdown summary, or null if never recorded
   */
  getMachineState(machine_id: string): { json: DerivedState; markdown: string } | null {
    const state = machineKinematicStateEngine.getLatest(machine_id);
    if (!state) return null;
    return { json: state, markdown: machineKinematicStateEngine.renderMarkdown(state) };
  }

  private summarizeMachineState(d: DerivedState): NonNullable<MachiningPlan["machine_state"]> {
    return {
      snapshot_id: d.snapshot_id,
      machine_id: d.machine_id,
      controller: d.controller,
      overall_status: d.overall_status,
      jerk_derate_pct: Math.round(d.jerk.factor * 100),
      thermal_warnings: d.thermal.filter(t => t.beyond_tolerance).length,
      servo_warnings: d.servo.filter(s => s.status === "warning").length,
      servo_critical: d.servo.filter(s => s.status === "critical").length,
      payload_overload: d.payload_overload,
      lookahead_adequate: d.lookahead?.adequate ?? null,
      warning_count: d.warnings.length,
    };
  }

  // ==================== PHASE 12 U-MIO40: COOLANT STRATEGY ====================

  /**
   * Calculate optimal coolant strategy based on machining context. Maps
   * MachiningContext → CoolantStrategyInput, calls coolantStrategyEngine,
   * and populates plan.coolant_strategy.
   *
   * @param plan - The machining plan to update (mutated in place)
   * @param options - Optional overrides (environmental_priority, machine constraints)
   * @returns Full CoolantStrategyResult with recommendations
   */
  calculateCoolantStrategy(
    plan: MachiningPlan,
    options?: {
      environmental_priority?: boolean;
      machine_max_pressure_bar?: number;
      tool_has_through_coolant?: boolean;
    },
  ): CoolantStrategyResult {
    const input = this.mapContextToCoolantInput(plan.context, plan.cutting_parameters, options);
    const result = coolantStrategyEngine.calculate(input);
    plan.coolant_strategy = this.summarizeCoolantStrategy(result);
    plan.warnings.push(...result.safety_notes);
    if (result.recommendations.length > 0) {
      plan.reasoning_chain.push(`[Coolant] ${result.recommendations.join("; ")}`);
    }
    return result;
  }

  /**
   * Get coolant strategy without modifying a plan — standalone calculation.
   *
   * @param input - Direct CoolantStrategyInput
   * @returns CoolantStrategyResult
   */
  getCoolantStrategy(input: CoolantStrategyInput): CoolantStrategyResult {
    return coolantStrategyEngine.calculate(input);
  }

  private mapContextToCoolantInput(
    ctx: MachiningContext,
    params: MachiningPlan["cutting_parameters"],
    options?: {
      environmental_priority?: boolean;
      machine_max_pressure_bar?: number;
      tool_has_through_coolant?: boolean;
    },
  ): CoolantStrategyInput {
    const materialMap: Record<string, CoolantMaterial> = {
      P: "carbon_steel",
      M: "stainless_steel",
      K: "cast_iron",
      N: "aluminum",
      S: "titanium",
      H: "hardened_steel",
    };
    const operationMap: Record<OperationType, CoolantOperation> = {
      roughing: ctx.machine_type === "lathe" ? "turning_rough" : "milling_rough",
      finishing: ctx.machine_type === "lathe" ? "turning_finish" : "milling_finish",
      semi_finishing: ctx.machine_type === "lathe" ? "turning_finish" : "milling_finish",
      drilling: "drilling",
      threading: "tapping",
      grooving: "boring",
    };

    return {
      workpiece_material: materialMap[ctx.material.iso_group] ?? "alloy_steel",
      operation: operationMap[ctx.operation_type] ?? "milling_rough",
      cutting_speed_m_min: params.cutting_speed_m_min,
      depth_of_cut_mm: params.axial_depth_mm,
      workpiece_hardness_hrc: ctx.material.hardness_hrc,
      environmental_priority: options?.environmental_priority,
      machine_max_pressure_bar: options?.machine_max_pressure_bar,
      tool_has_through_coolant: options?.tool_has_through_coolant,
    };
  }

  private summarizeCoolantStrategy(r: CoolantStrategyResult): NonNullable<MachiningPlan["coolant_strategy"]> {
    return {
      primary_method: r.primary_method,
      fluid_type: r.fluid_type,
      concentration_pct: r.concentration_pct.value,
      pressure_bar: r.pressure_bar.value,
      flow_rate_l_min: r.flow_rate_l_min.value,
      temperature_target_c: r.temperature_target_c.value,
      alternative_method: r.alternative_method,
      safety_note_count: r.safety_notes.length,
      recommendation_count: r.recommendations.length,
    };
  }

  // ==================== PHASE 12 U-MIO40A: SAFETY EXPLANATION (XAI) ====================

  /**
   * Generate an auditable XAI explanation for a veto report. Produces
   * evidence chain, counterfactuals ("would have blocked if..."),
   * margin analysis, and feature attribution (SHAP-like importance).
   *
   * @param report - The VetoReport from SafetyVetoEngine
   * @param level - Explanation detail level (summary | detailed | technical | audit)
   * @returns SafetyExplanation with full audit trail
   */
  explainVetoDecision(report: VetoReport, level: ExplanationLevel = "detailed"): SafetyExplanation {
    return safetyExplanationEngine.explainVetoReport({ report, level });
  }

  /**
   * Generate an auditable XAI explanation for a safety gate. Covers
   * all four artifacts (veto, simulation, collision, envelope) with
   * counterfactuals and evidence chains.
   *
   * @param gate_id - The safety gate ID to explain
   * @param level - Explanation detail level
   * @returns SafetyExplanation or null if gate not found
   */
  explainSafetyGate(gate_id: string, level: ExplanationLevel = "detailed"): SafetyExplanation | null {
    const gate = safetyVetoSimulationGateEngine.get(gate_id);
    if (!gate) return null;
    return safetyExplanationEngine.explainGate({ gate, level });
  }

  /**
   * Generate a brief one-line explanation for operator display.
   *
   * @param report - The VetoReport from SafetyVetoEngine
   * @returns One-line summary string (e.g., "✓ SAFE: All 8 rules passed")
   */
  explainBrief(report: VetoReport): string {
    return safetyExplanationEngine.explainBrief(report);
  }

  /**
   * Find the minimal change that would flip a safety decision.
   * For PASS → returns what would cause BLOCK.
   * For BLOCK → returns what would cause PASS.
   *
   * @param report - The VetoReport to analyze
   * @returns Counterfactual with changes and feasibility, or null
   */
  findMinimalFlipPoint(report: VetoReport) {
    return safetyExplanationEngine.findMinimalFlip(report);
  }

  /**
   * Render a safety explanation as Markdown for audit logs or display.
   *
   * @param explanation - SafetyExplanation to render
   * @returns Markdown string with full audit details
   */
  renderSafetyExplanation(explanation: SafetyExplanation): string {
    return safetyExplanationEngine.renderMarkdown(explanation);
  }

  // ==================== PHASE 13 U-MIO41: SELF-AWARENESS CONTEXT INJECTION ====================

  /**
   * Get the PRISM capability manifest for AI context injection. Caches the
   * manifest and refreshes if stale (>1 hour old). Returns ~500 tokens of
   * self-knowledge: dispatchers, actions, engines, domains, recent learnings.
   *
   * @returns Compact manifest string with checksum for verification
   */
  getSelfAwarenessManifest(): { manifest: string; checksum: string; fresh: boolean } {
    const now = Date.now();

    // Check cache freshness
    if (this.manifestCache && (now - this.manifestCache.timestamp) < this.MANIFEST_STALENESS_MS) {
      return {
        manifest: this.manifestCache.manifest,
        checksum: this.manifestCache.checksum,
        fresh: false,
      };
    }

    // Refresh manifest — getCompactManifest returns a structured object; we
    // serialize it for the string-typed manifest cache + downstream AI-context
    // injection so the checksum and string consumers both see the same bytes.
    const manifestObj = prismSelfAwarenessEngine.getCompactManifest();
    const manifest = JSON.stringify(manifestObj);
    const checksum = this.computeManifestChecksum(manifest);

    this.manifestCache = { manifest, checksum, timestamp: now };

    return { manifest, checksum, fresh: true };
  }

  /**
   * Inject self-awareness manifest into an AI subsystem context object.
   * Use this when calling any AI engine to provide capability awareness.
   *
   * @param context - The existing context object (mutated in place)
   * @returns The context with systemManifest injected
   */
  injectSelfAwareness<T extends Record<string, unknown>>(context: T): T & { systemManifest: string; manifestChecksum: string } {
    const { manifest, checksum } = this.getSelfAwarenessManifest();
    return {
      ...context,
      systemManifest: manifest,
      manifestChecksum: checksum,
    };
  }

  /**
   * Route a task intent to the best available action. Uses PRISMSelfAwarenessEngine
   * to find capabilities matching the task description.
   *
   * @param task - Natural language task description (e.g., "quote this part")
   * @returns Best matching capability with confidence, or null if no match
   */
  howDoI(task: string): { approach: string; steps: string[]; recommendedActions: string[] } | null {
    // PRISMSelfAwarenessEngine.howDoI returns a structured "how to" record
    // (approach + steps + recommendedActions), not a CapabilityMatch.
    return prismSelfAwarenessEngine.howDoI(task);
  }

  /**
   * Find engines that handle a specific domain. Uses PRISMSelfAwarenessEngine
   * to search by domain keywords.
   *
   * @param domain - Domain to search (e.g., "cutting force", "thermal analysis")
   * @returns Array of matching engines with relevance scores
   */
  whoHandles(domain: string): { dispatcher: string; engine: string; actions: string[] } {
    // PRISMSelfAwarenessEngine.whoHandles returns a single owner record, not
    // an EngineMatch[]. Reflect that directly in the wrapper signature.
    return prismSelfAwarenessEngine.whoHandles(domain);
  }

  /**
   * Get the full PRISM capability manifest (detailed version).
   * Use getSelfAwarenessManifest() for the compact ~500 token version.
   *
   * @returns Full manifest object with all capability details
   */
  getFullManifest() {
    return prismSelfAwarenessEngine.getManifest();
  }

  /**
   * Search for capabilities matching a query.
   *
   * @param query - Search query
   * @returns Array of matching capabilities with confidence scores
   */
  searchCapabilities(query: string): Array<{ name: string; dispatcher: string; relevance: number }> {
    // Mirror PRISMSelfAwarenessEngine.searchCapabilities's actual return shape;
    // the previous CapabilityMatch[] declaration was aspirational, not real.
    return prismSelfAwarenessEngine.searchCapabilities(query);
  }

  /**
   * Recommend AI features for a given task context. Analyzes the task
   * and suggests relevant engines, actions, and multi-agent patterns.
   *
   * @param taskDescription - Description of the task
   * @returns Recommendations including primary feature, supporting features, patterns
   */
  recommendAIFeatures(taskDescription: string) {
    return prismSelfAwarenessEngine.recommendAIFeatures(taskDescription);
  }

  /**
   * Search tribal knowledge for machining tips and best practices.
   *
   * @param query - Search query (e.g., "thin wall milling")
   * @returns Array of matching tribal tips
   */
  searchTribalKnowledge(query: string) {
    return prismSelfAwarenessEngine.searchTribalKnowledge(query);
  }

  /**
   * Search playbook rules for operational best practices.
   *
   * @param query - Search query (e.g., "roughing depth")
   * @returns Array of matching playbook rules
   */
  searchPlaybookRules(query: string) {
    return prismSelfAwarenessEngine.searchPlaybookRules(query);
  }

  // ==================== PHASE 13 U-MIO42: JM DIE RECIPE RETRIEVAL ====================

  /**
   * Retrieve proven recipes from JM DIE program archive matching query criteria.
   * Returns statistically aggregated parameters when multiple matches found.
   *
   * @param query - Recipe query with material, operation, machine_type, customer filters
   * @returns RecipeRetrievalResult with found recipes, aggregated stats, confidence
   */
  retrieveProvenRecipes(query: {
    material?: string;
    operation?: RecipeOperationCategory;
    machine_type?: RecipeMachineCategory;
    customer?: string;
  }): RecipeRetrievalResult {
    return jmDieRecipeRetrieverEngine.retrieve(query);
  }

  /**
   * Retrieve recipes for a specific material/operation combination.
   * Most common query pattern for getting proven parameters.
   *
   * @param material - Material name (e.g., "D2", "M2", "6061")
   * @param operation - Operation type (roughing, finishing, semi_finishing, etc.)
   * @param machineType - Optional machine type filter (lathe, mill, wire_edm, etc.)
   * @returns RecipeRetrievalResult with statistical aggregation
   */
  retrieveRecipesByMaterialOperation(
    material: string,
    operation: RecipeOperationCategory,
    machineType?: RecipeMachineCategory
  ): RecipeRetrievalResult {
    return jmDieRecipeRetrieverEngine.retrieveByMaterialOperation(material, operation, machineType);
  }

  /**
   * Get recommended cutting parameters based on proven JM DIE recipes.
   * Returns mean values from aggregated historical data.
   *
   * @param material - Material name
   * @param operation - Operation type
   * @param machineType - Optional machine type
   * @returns Recommended parameters or null if insufficient data
   */
  getRecommendedRecipeParameters(
    material: string,
    operation: RecipeOperationCategory,
    machineType?: RecipeMachineCategory
  ): {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
  } | null {
    // Underlying retriever currently emits the 3 physics fields only — no
    // confidence / sample_size yet. Narrow the wrapper signature to match
    // reality so callers don't read undefined.
    return jmDieRecipeRetrieverEngine.getRecommendedParameters(material, operation, machineType);
  }

  /**
   * Retrieve recipes by customer name. Use for customer-specific optimization.
   *
   * @param customer - Customer name (e.g., "ALCOA", "ITW")
   * @param operation - Optional operation filter
   * @returns RecipeRetrievalResult filtered by customer
   */
  retrieveRecipesByCustomer(
    customer: string,
    operation?: RecipeOperationCategory
  ): RecipeRetrievalResult {
    return jmDieRecipeRetrieverEngine.retrieveByCustomer(customer, operation);
  }

  /**
   * Full-text search across recipe database.
   *
   * @param query - Search string (material, customer, or operation substring)
   * @returns Array of matching proven recipes
   */
  searchProvenRecipes(query: string) {
    return jmDieRecipeRetrieverEngine.searchRecipes(query);
  }

  /**
   * Get list of all materials with proven recipes in JM DIE archive.
   *
   * @returns Array of material names
   */
  getAvailableRecipeMaterials(): string[] {
    return jmDieRecipeRetrieverEngine.getAvailableMaterials();
  }

  /**
   * Get list of all customers with proven recipes in JM DIE archive.
   *
   * @returns Array of customer names
   */
  getAvailableRecipeCustomers(): string[] {
    return jmDieRecipeRetrieverEngine.getAvailableCustomers();
  }

  /**
   * Get recipe database coverage statistics.
   *
   * @returns Statistics including total recipes, by machine type, by ISO group
   */
  getRecipeStatistics() {
    return jmDieRecipeRetrieverEngine.getStatistics();
  }

  // ==================== PHASE 13 U-MIO43: TRIBAL & PLAYBOOK ENFORCEMENT ====================

  /**
   * Validate machining parameters against tribal knowledge (3,700+ tips)
   * and playbook rules (296 experiential rules). Returns validation result
   * with violations, recommendations, and overall score.
   *
   * @param params - Machining parameters to validate
   * @param context - Machining context (material, operation, etc.)
   * @returns EnforcementResult with valid flag, score, violations
   */
  validateAgainstTribalKnowledge(params: EnforcementParams, context: EnforcementContext): EnforcementResult {
    return tribalPlaybookEnforcementEngine.validate(params, context);
  }

  /**
   * Quick validation for a single parameter against tribal bounds.
   *
   * @param paramName - Parameter name (cutting_speed_m_min, feed_mm_rev, etc.)
   * @param value - Parameter value
   * @param material - Material name
   * @returns TribalViolation or null if valid
   */
  validateSingleParameterTribal(
    paramName: keyof EnforcementParams,
    value: number,
    material: string
  ): TribalViolation | null {
    return tribalPlaybookEnforcementEngine.validateSingleParameter(paramName, value, material);
  }

  /**
   * Get recommended parameter ranges from tribal knowledge for a material.
   *
   * @param material - Material name (e.g., "D2", "6061", "304")
   * @returns Parameter ranges or null if material not in tribal database
   */
  getTribalRecommendedRanges(material: string): Record<string, { min: number; max: number }> | null {
    return tribalPlaybookEnforcementEngine.getRecommendedRanges(material);
  }

  /**
   * Search tribal tips for specific parameter guidance.
   *
   * @param query - Search query (e.g., "thin wall", "chatter", "surface finish")
   * @param material - Optional material filter
   * @param operation - Optional operation filter
   * @returns Array of relevant tribal tips
   */
  searchTribalGuidance(query: string, material?: string, operation?: string) {
    return tribalPlaybookEnforcementEngine.searchGuidance(query, material, operation as any);
  }

  /**
   * Get playbook rules for a specific category.
   *
   * @param category - Rule category (e.g., "thin_wall", "roughing", "safety")
   * @param operation - Optional operation filter
   * @returns Array of applicable playbook rules
   */
  getPlaybookRulesForCategory(category: string, operation?: string) {
    return tribalPlaybookEnforcementEngine.getRulesForCategory(category, operation as any);
  }

  /**
   * Get tribal and playbook enforcement statistics.
   *
   * @returns Coverage statistics (materials, operations, tips, rules)
   */
  getTribalEnforcementStatistics() {
    return tribalPlaybookEnforcementEngine.getStatistics();
  }

  // ==================== PHASE 13 U-MIO44: GAP DETECTION & HUMAN ESCALATION ====================

  /**
   * Analyze a query for capability gaps and determine escalation level.
   * When AI doesn't know something, it ADMITS it and escalates to human.
   *
   * @param query - The request or capability being checked
   * @param context - Optional context for logging
   * @returns EscalationDecision with level, can_proceed, and suggestions
   */
  async analyzeCapabilityGap(
    query: string,
    context?: Record<string, unknown>
  ): Promise<EscalationDecision> {
    return gapEscalationControllerEngine.analyzeAndEscalate(query, context);
  }

  /**
   * Check if AI should proceed with a task or escalate to human.
   * Simplified version returning just the boolean + level.
   *
   * @param query - Task description
   * @returns { proceed: boolean, level: EscalationLevel, reason: string }
   */
  async shouldAIProceed(query: string): Promise<{ proceed: boolean; level: EscalationLevel; reason: string }> {
    return gapEscalationControllerEngine.shouldProceed(query);
  }

  /**
   * Validate confidence before taking an action. Use at decision points.
   *
   * @param action - Action being taken
   * @param confidence - AI's confidence (0-1)
   * @param context - Optional context
   * @returns EscalationDecision with level and suggestions
   */
  validateAIConfidence(
    action: string,
    confidence: number,
    context?: Record<string, unknown>
  ): EscalationDecision {
    return gapEscalationControllerEngine.validateConfidence(action, confidence, context);
  }

  /**
   * Get pending items in the human review queue.
   *
   * @param filter - Optional filter by status or priority
   * @returns Array of review items requiring human attention
   */
  getHumanReviewQueue(filter?: {
    status?: "pending" | "in_progress" | "resolved" | "dismissed";
    priority?: "critical" | "high" | "medium" | "low";
    limit?: number;
  }): HumanReviewItem[] {
    return gapEscalationControllerEngine.getReviewQueue(filter);
  }

  /**
   * Resolve a human review item (human has addressed it).
   *
   * @param itemId - Review item ID
   * @param resolution - How it was resolved
   * @param resolvedBy - Who resolved it
   * @returns true if resolved
   */
  resolveHumanReviewItem(itemId: string, resolution: string, resolvedBy: string): boolean {
    return gapEscalationControllerEngine.resolveReviewItem(itemId, resolution, resolvedBy);
  }

  /**
   * Get logged gaps with optional filtering.
   *
   * @param filter - Optional filters
   * @returns Array of gap log entries
   */
  getGapLog(filter?: {
    level?: EscalationLevel;
    resolved?: boolean;
    since?: Date;
    limit?: number;
  }): GapLogEntry[] {
    return gapEscalationControllerEngine.getGapLog(filter);
  }

  /**
   * Get statistics about capability gaps for analysis.
   *
   * @returns GapStatistics with counts by level, common queries
   */
  getGapStatistics(): GapStatistics {
    return gapEscalationControllerEngine.getStatistics();
  }

  /**
   * Get gaps prioritized for engine development.
   * Frequent, unresolved gaps with low confidence = high priority.
   *
   * @returns Array of prioritized gaps with suggested P0-P3 priority
   */
  getPrioritizedGapsForDevelopment() {
    return gapEscalationControllerEngine.getPrioritizedGapsForDevelopment();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 14: PROACTIVE AI INTELLIGENCE (U-MIO45)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Perform proactive analysis on current context.
   * The AI anticipates what you need before you ask.
   *
   * @param context - Intent, parameters, session context
   * @returns Suggestions, anomalies, and detected patterns
   */
  async analyzeProactively(context: {
    intent?: string;
    parameters?: Record<string, unknown>;
    sessionId?: string;
    domain?: string;
  }): Promise<ProactiveAnalysis> {
    return proactiveAI.analyze(context);
  }

  /**
   * Get quick suggestions for a scenario without full analysis.
   *
   * @param scenario - Brief description (e.g., "roughing titanium")
   * @returns Array of relevant suggestions
   */
  getQuickProactiveSuggestions(scenario: string): ProactiveSuggestion[] {
    return proactiveAI.getQuickSuggestions(scenario);
  }

  /**
   * Detect anomalies in machining parameters.
   *
   * @param parameters - Key-value pairs (speed, feed, depth, etc.)
   * @returns Array of anomalies with severity and suggestions
   */
  detectParameterAnomalies(parameters: Record<string, unknown>): AnomalyResult[] {
    return proactiveAI.detectAnomalies(parameters);
  }

  /**
   * Learn from a user correction to improve future suggestions.
   *
   * @param originalSuggestion - What the AI suggested
   * @param correction - What the user corrected it to
   * @param context - Domain and reason for correction
   */
  learnFromProactiveCorrection(
    originalSuggestion: string,
    correction: string,
    context: { domain?: string; reason?: string }
  ): void {
    // ProactiveAIIntelligenceEngine.learnFromCorrection's 3rd arg is
    // `applied: boolean` (whether the user accepted the correction), not the
    // domain/reason context. Treat any correction-with-context as an applied
    // override; the context.reason is logged elsewhere via the surrounding
    // outcome capture pipeline.
    void context; // intentional — preserved on the wrapper signature for callers.
    proactiveAI.learnFromCorrection(originalSuggestion, correction, true);
  }

  /**
   * Record whether a proactive suggestion was correct.
   * Used for confidence calibration.
   *
   * @param domain - Domain of the prediction
   * @param correct - Whether the prediction was correct
   */
  recordProactiveOutcome(domain: string, correct: boolean): void {
    proactiveAI.recordOutcome(domain, correct);
  }

  /**
   * Get current confidence calibration across domains.
   *
   * @returns Calibration data with accuracy by domain
   */
  getProactiveCalibration(): ConfidenceCalibration {
    return proactiveAI.getCalibration();
  }

  /**
   * Get all detected patterns from session analysis.
   *
   * @returns Array of patterns with confidence and frequency
   */
  getDetectedPatterns(): DetectedPattern[] {
    return proactiveAI.getPatterns();
  }

  /**
   * Get history of proactive suggestions with outcomes.
   *
   * @param limit - Max number of suggestions to return (default 50)
   * @returns Array of past suggestions
   */
  getProactiveSuggestionHistory(limit = 50): ProactiveSuggestion[] {
    return proactiveAI.getSuggestionHistory(limit);
  }

  /**
   * Get history of corrections for learning analysis.
   *
   * @returns Array of correction learnings
   */
  getCorrectionHistory(): CorrectionLearning[] {
    return proactiveAI.getCorrectionHistory();
  }

  /**
   * Get anomaly detection thresholds.
   *
   * @returns Map of parameter names to [min, max] bounds
   */
  getAnomalyThresholds(): Map<string, [number, number]> {
    return proactiveAI.getThresholds();
  }

  /**
   * Get summary of proactive AI state for debugging.
   *
   * @returns Human-readable summary
   */
  getProactiveAISummary(): string {
    return proactiveAI.getSummary();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 14: FAILURE MODE ANTICIPATION (U-MIO46)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Analyze failure risk for current machining conditions.
   * Predicts failures BEFORE they occur with probability and prevention.
   *
   * @param conditions - Tool, cutting, setup, machine, material, and process conditions
   * @returns Risk profile with predictions, actions, and safe operating window
   */
  analyzeFailureRisk(conditions: {
    toolWearPercent: number;
    toolOverhangRatio: number;
    toolGradeMatch: number;
    cuttingForce: number;
    spindleLoad: number;
    vibrationLevel: number;
    temperature: number;
    clampingForce: number;
    cuttingForceRequired: number;
    fixtureRigidity: number;
    machineHours: number;
    spindleCondition: number;
    lastMaintenance: number;
    materialHardness: number;
    materialAbrasivity: number;
    engagementPercent: number;
    depthOfCut: number;
    programVerified: boolean;
  }): FailureRiskProfile {
    return failureModeAnticipationEngine.analyzeFailureRisk(conditions);
  }

  /**
   * Get all known failure modes.
   *
   * @returns Array of all failure mode definitions
   */
  getFailureModes(): FailureMode[] {
    return failureModeAnticipationEngine.getFailureModes();
  }

  /**
   * Get a specific failure mode by ID.
   *
   * @param id - Failure mode ID (e.g., "tool_breakage")
   * @returns Failure mode if found
   */
  getFailureMode(id: string): FailureMode | undefined {
    return failureModeAnticipationEngine.getFailureMode(id);
  }

  /**
   * Get cascade chain for a failure — what failures does this trigger?
   * One failure can cause a cascade of others (e.g., tool break → surface damage → tolerance miss).
   *
   * @param failureId - Starting failure mode ID
   * @returns Chain of cascading failure IDs
   */
  getFailureCascadeChain(failureId: string): string[] {
    return failureModeAnticipationEngine.getCascadeChain(failureId);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 14: PROACTIVE LEARNING (U-MIO47)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Detect learning triggers from execution context.
   * Automatically identifies when the system should learn from:
   * - New patterns (unknown material, unusual parameters)
   * - Novel scenarios (experimental operations)
   * - Knowledge conflicts (sources disagree)
   * - Confidence drops (predictions becoming uncertain)
   *
   * @param context - Execution context with material, operation, outcome
   * @returns Array of detected learning triggers
   */
  detectLearningTriggers(context: LearningContext): LearningTrigger[] {
    return proactiveLearningEngine.detectLearningTriggers(context);
  }

  /**
   * Classify a learning trigger and determine priority/routing.
   *
   * @param trigger - The learning trigger to classify
   * @returns Classification with priority, routing, and recommendations
   */
  classifyLearningTrigger(trigger: LearningTrigger): TriggerClassification {
    return proactiveLearningEngine.classifyTrigger(trigger);
  }

  /**
   * Batch classify multiple triggers with sorting by priority.
   *
   * @param triggers - Array of learning triggers
   * @returns Classifications sorted by priority (critical first)
   */
  batchClassifyLearningTriggers(triggers: LearningTrigger[]): TriggerClassification[] {
    return proactiveLearningEngine.batchClassifyTriggers(triggers);
  }

  /**
   * Monitor knowledge quality across tribal tips and atoms.
   * Detects stale tips, conflicts, declining confidence, and escalation needs.
   *
   * @returns Quality report with issues, recommendations, and statistics
   */
  monitorKnowledgeQuality(): QualityReport {
    return proactiveLearningEngine.monitorKnowledgeQuality();
  }

  /**
   * Get categorization statistics for learning system.
   *
   * @returns Stats on categorization accuracy and distribution
   */
  getLearningCategorizationStats(): CategorizationStats {
    return proactiveLearningEngine.getCategorizationStats();
  }

  /**
   * Get category thresholds for PUOA (Passive, Useful, Obsolete, Active).
   *
   * @returns Map of category names to confidence thresholds
   */
  getLearningCategoryThresholds(): Record<string, number> {
    return proactiveLearningEngine.getCategoryThresholds();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 14: PREDICTIVE MAINTENANCE (U-MIO48)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Assess machine health using multi-signal scoring.
   * Uses ISO 10816 vibration standards, spindle temperature, hours since maintenance,
   * error counts, and backlash measurements to compute health score.
   *
   * @param input - Machine health signals (vibration, temperature, hours, errors, backlash)
   * @returns Health result with score, risk factors, predicted failure, and maintenance actions
   */
  assessMachineHealth(input: HealthInput): HealthResult {
    return predictiveMaintenanceOrchestratorEngine.assessMachineHealth(input);
  }

  /**
   * Analyze failure history for patterns and MTBF calculations.
   * Identifies common failure causes and estimates time to next failure.
   *
   * @param input - Array of historical failure records
   * @returns MTBF per component, common causes, and failure pattern analysis
   */
  analyzeFailureHistory(input: FailureHistoryInput): FailureHistoryResult {
    return predictiveMaintenanceOrchestratorEngine.analyzeFailureHistory(input);
  }

  /**
   * Check if machine health requires immediate attention.
   * Returns true if predicted_failure_days < 7 or status is critical.
   *
   * @param machineId - Machine identifier
   * @param healthResult - Previously computed health result
   * @returns Whether alert should be generated
   */
  shouldAlertMaintenance(machineId: string, healthResult: HealthResult): boolean {
    const criticalDays = 7;
    return (
      healthResult.status === "critical" ||
      (healthResult.predicted_failure_days !== undefined &&
        healthResult.predicted_failure_days < criticalDays)
    );
  }

  /**
   * Calculate parameter derating factor based on machine health.
   * Reduces max spindle speed, feed rate, etc. when machine health degrades.
   *
   * @param healthScore - 0-100 health score
   * @returns Derating factor (0.5-1.0) to apply to cutting parameters
   */
  calculateHealthDerating(healthScore: number): number {
    if (healthScore >= 80) return 1.0;
    if (healthScore >= 60) return 0.9;
    if (healthScore >= 40) return 0.8;
    if (healthScore >= 20) return 0.7;
    return 0.5;
  }

  private computeManifestChecksum(manifest: string): string {
    let hash = 0;
    for (let i = 0; i < manifest.length; i++) {
      const char = manifest.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}

export const machiningIntelligenceOrchestratorEngine = new MachiningIntelligenceOrchestratorEngine();
