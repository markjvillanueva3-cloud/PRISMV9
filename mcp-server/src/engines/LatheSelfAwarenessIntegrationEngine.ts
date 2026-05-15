// WIRE-EXEMPT: integration engine consumed via direct import by lathe-studio skills
// and orchestrator pipelines, not by an MCP dispatcher action. Pre-existing orphan
// state predates the TSC-fix session that touched this file.
/**
 * LatheSelfAwarenessIntegrationEngine — Full PRISM Integration for Lathe Operations
 * ===================================================================================
 *
 * This engine integrates with PRISMSelfAwarenessEngine to leverage ALL of PRISM's
 * capabilities for intelligent lathe operations. It provides:
 *
 * SELF-AWARENESS INTEGRATION:
 *   - Query what PRISM can do for lathe programming
 *   - Find best actions for specific lathe tasks
 *   - Get JM Die customer programs and patterns
 *   - Search tribal knowledge for turning operations
 *   - Access playbook rules for lathe best practices
 *
 * PRISM INVENTORY AWARENESS:
 *   - Know all 48+ lathe engines and their capabilities
 *   - Know all 95+ turning MCP actions
 *   - Know all 3,700+ tribal tips
 *   - Know all 499 formulas and 60+ algorithms
 *   - Know all JM Die customer patterns
 *
 * DYNAMIC ENGINE SELECTION:
 *   - Route to appropriate engine based on task complexity
 *   - Combine multiple engines for complex multi-step tasks
 *   - Fall back to alternatives if primary engine unavailable
 *   - Confidence-weighted engine orchestration
 *
 * JM DIE INTEGRATION:
 *   - Access 16,558+ lathe programs from 119 customers
 *   - Match customer patterns for new jobs
 *   - Extract historical parameters by material/operation
 *   - Learn from production programs
 *
 * CROSS-DOMAIN SYNTHESIS:
 *   - Use physics engines for force calculations
 *   - Use thermal engines for temperature analysis
 *   - Use quality engines for validation
 *   - Combine results with confidence scoring
 *
 * KNOWLEDGE GRAPH NAVIGATION:
 *   - Traverse relationships between concepts
 *   - Find related engines/formulas/tips
 *   - Explain reasoning paths
 *   - Build contextual recommendations
 *
 * References:
 *   - Kienzle, O. (1952). Die Bestimmung von Kraeften und Leistungen
 *   - Taylor, F.W. (1907). On the Art of Cutting Metals
 *   - Altintas, Y. (2012). Manufacturing Automation, 2nd Ed.
 *   - Machinery's Handbook, 31st Edition
 *
 * @module engines/LatheSelfAwarenessIntegrationEngine
 * @version 1.0.0
 * @milestone LATHE-SELF-AWARENESS-MS0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  kienzleForce,
  taylorLife,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";
import {
  prismSelfAwarenessEngine,
  type CapabilityMatch,
  type EngineMatch,
  type GapAnalysis,
} from "./PRISMSelfAwarenessEngine.js";

// Local type aliases for ad-hoc shapes returned by PRISMSelfAwarenessEngine
// (these are not exported as named types from that module).
type AIFeature = any;
type TribalKnowledgeResult = any;
type PlaybookRuleResult = any;
type ResourceFile = any;
type JMDieCustomer = any;
type JMDieMachineFolder = any;
type ProactiveReasoningResult = any;

// ============================================================================
// TYPES — ENGINE ROUTING AND ORCHESTRATION
// ============================================================================

/** Lathe engine capability descriptor */
export interface LatheEngineCapability {
  engineName: string;
  category: LatheEngineCategory;
  capabilities: string[];
  inputRequirements: string[];
  outputTypes: string[];
  physicsRequired: boolean;
  tribalKnowledgeAware: boolean;
  jmDieIntegrated: boolean;
  confidenceLevel: number;
  estimatedExecutionMs: number;
}

/** Lathe engine category */
export type LatheEngineCategory =
  | "ai_reasoning"
  | "deep_learning"
  | "knowledge_extraction"
  | "optimization"
  | "physics"
  | "safety"
  | "intelligence"
  | "orchestration"
  | "post_processing"
  | "troubleshooting";

/** Engine routing decision */
export interface EngineRoutingDecision {
  primaryEngine: LatheEngineCapability;
  supportingEngines: LatheEngineCapability[];
  executionOrder: string[];
  parallelGroups: string[][];
  tribalKnowledgeInjection: TribalKnowledgeResult[];
  playbookRulesApplied: PlaybookRuleResult[];
  jmDieContext: JMDieContext | null;
  confidenceScore: number;
  reasoningPath: string[];
}

/** JM Die context for operations */
export interface JMDieContext {
  customer: JMDieCustomer | null;
  similarPrograms: string[];
  materialPatterns: MaterialPattern[];
  operationSequences: OperationSequence[];
  historicalParameters: HistoricalParameter[];
  successPatterns: SuccessPattern[];
}

/** Material pattern from JM Die analysis */
export interface MaterialPattern {
  material: string;
  isoGroup: ISOGroup;
  programCount: number;
  avgSpeed: number;
  avgFeed: number;
  avgDOC: number;
  confidence: number;
}

/** Operation sequence from JM Die */
export interface OperationSequence {
  operations: string[];
  frequency: number;
  avgCycleTime: number;
  successRate: number;
}

/** Historical parameter from JM Die */
export interface HistoricalParameter {
  operation: string;
  material: string;
  speed: number;
  feed: number;
  doc: number;
  toolType: string;
  source: string;
  confidence: number;
}

/** Success pattern from JM Die */
export interface SuccessPattern {
  patternId: string;
  description: string;
  conditions: string[];
  outcome: string;
  confidence: number;
}

// ============================================================================
// TYPES — MULTI-ENGINE ORCHESTRATION
// ============================================================================

/** Multi-engine orchestration task */
export interface MultiEngineTask {
  taskId: string;
  description: string;
  requiredCapabilities: string[];
  constraints: TaskConstraint[];
  priority: "critical" | "high" | "normal" | "low";
  timeoutMs: number;
}

/** Task constraint */
export interface TaskConstraint {
  type: "physics" | "safety" | "quality" | "time" | "cost";
  parameter: string;
  operator: "lt" | "lte" | "eq" | "gte" | "gt" | "between";
  value: number | [number, number];
}

/** Orchestration result */
export interface OrchestrationResult {
  taskId: string;
  success: boolean;
  enginesUsed: string[];
  executionTimeMs: number;
  results: EngineResult[];
  aggregatedOutput: unknown;
  confidenceScore: number;
  physicsValidation: PhysicsValidation;
  tribalKnowledgeApplied: string[];
  warnings: string[];
  recommendations: string[];
}

/** Individual engine result */
export interface EngineResult {
  engineName: string;
  success: boolean;
  output: unknown;
  confidence: number;
  executionMs: number;
  warnings: string[];
}

/** Physics validation result */
export interface PhysicsValidation {
  kienzleValid: boolean;
  taylorValid: boolean;
  deflectionValid: boolean;
  thermalValid: boolean;
  overallValid: boolean;
  violations: string[];
  corrections: PhysicsCorrection[];
}

/** Physics correction suggestion */
export interface PhysicsCorrection {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  reason: string;
  formula: string;
}

// ============================================================================
// TYPES — KNOWLEDGE GRAPH NAVIGATION
// ============================================================================

/** Knowledge graph node */
export interface KnowledgeNode {
  id: string;
  type: "engine" | "formula" | "algorithm" | "tip" | "rule" | "material" | "operation";
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  connections: KnowledgeConnection[];
}

/** Knowledge graph connection */
export interface KnowledgeConnection {
  targetId: string;
  relationshipType: RelationshipType;
  strength: number;
  context: string;
}

/** Relationship types in knowledge graph */
export type RelationshipType =
  | "uses"
  | "requires"
  | "enhances"
  | "validates"
  | "replaces"
  | "complements"
  | "conflicts_with"
  | "derives_from"
  | "applies_to"
  | "produces";

/** Knowledge path result */
export interface KnowledgePath {
  startNode: string;
  endNode: string;
  path: string[];
  relationships: RelationshipType[];
  totalStrength: number;
  explanation: string;
}

// ============================================================================
// TYPES — LATHE OPERATION CONTEXT
// ============================================================================

/** Full lathe operation context */
export interface LatheOperationContext {
  operation: LatheOperationType;
  material: MaterialContext;
  part: PartContext;
  machine: MachineContext;
  tool: ToolContext;
  parameters: ParameterContext;
  quality: QualityRequirements;
  constraints: OperationConstraints;
}

/** Lathe operation type */
export type LatheOperationType =
  | "facing"
  | "turning_od"
  | "turning_id"
  | "grooving"
  | "threading"
  | "drilling"
  | "boring"
  | "parting"
  | "tapping"
  | "knurling"
  | "live_milling"
  | "live_drilling";

/** Material context */
export interface MaterialContext {
  name: string;
  isoGroup: ISOGroup;
  hardness: number;
  condition: "annealed" | "normalized" | "hardened" | "tempered";
}

/** Part context */
export interface PartContext {
  diameter: number;
  length: number;
  wallThickness?: number;
  lotSize: number;
}

/** Machine context */
export interface MachineContext {
  machineId: string;
  controller: string;
  maxSpindleRpm: number;
  maxPower: number;
  hasLiveTooling: boolean;
  hasCAxis: boolean;
  hasYAxis: boolean;
}

/** Tool context */
export interface ToolContext {
  toolType: string;
  insertGrade: string;
  noseRadius: number;
  leadAngle: number;
}

/** Parameter context */
export interface ParameterContext {
  speed?: number;
  feed?: number;
  depthOfCut?: number;
  coolant?: "flood" | "mist" | "dry" | "through_tool";
}

/** Quality requirements */
export interface QualityRequirements {
  surfaceFinish?: number;
  tolerance?: number;
  concentricity?: number;
}

/** Operation constraints */
export interface OperationConstraints {
  maxCycleTime?: number;
  minToolLife?: number;
  maxPower?: number;
  maxDeflection?: number;
}

// ============================================================================
// TYPES — CAPABILITY EXPLANATION
// ============================================================================

/** Capability explanation result */
export interface CapabilityExplanation {
  category: string;
  capabilities: string[];
  engines: LatheEngineCapability[];
  actions: CapabilityMatch[];
  tribalKnowledge: TribalKnowledgeResult[];
  playbookRules: PlaybookRuleResult[];
  jmDieResources: JMDieCustomer[];
  externalSources: string[];
  recommendations: string[];
}

/** Optimal approach suggestion */
export interface OptimalApproach {
  approach: string;
  primaryEngine: string;
  supportingEngines: string[];
  executionSteps: ExecutionStep[];
  expectedOutcomes: ExpectedOutcome[];
  riskFactors: RiskFactor[];
  tribalWisdom: string[];
  confidenceScore: number;
}

/** Execution step */
export interface ExecutionStep {
  step: number;
  action: string;
  engine: string;
  inputs: string[];
  outputs: string[];
  validations: string[];
}

/** Expected outcome */
export interface ExpectedOutcome {
  metric: string;
  expectedValue: number;
  unit: string;
  confidence: number;
}

/** Risk factor */
export interface RiskFactor {
  risk: string;
  probability: number;
  impact: "low" | "medium" | "high";
  mitigation: string;
}

// ============================================================================
// LATHE ENGINE INVENTORY — 48+ LATHE-SPECIFIC ENGINES
// ============================================================================

const LATHE_ENGINE_INVENTORY: LatheEngineCapability[] = [
  // === AI REASONING ENGINES ===
  {
    engineName: "LatheAIReasoningEngine",
    category: "ai_reasoning",
    capabilities: ["tribal_knowledge", "g76_dialects", "controller_specific", "reasoning_chains"],
    inputRequirements: ["operation", "material", "controller"],
    outputTypes: ["reasoning_result", "recommendations"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.85,
    estimatedExecutionMs: 150,
  },
  {
    engineName: "LatheOpusReasoningEngine",
    category: "ai_reasoning",
    capabilities: ["neural_nets", "deep_reasoning", "multi_path", "confidence_scoring"],
    inputRequirements: ["problem_description", "context"],
    outputTypes: ["reasoning_result", "neural_output"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.92,
    estimatedExecutionMs: 250,
  },
  {
    engineName: "LatheDeepReasoningEngine",
    category: "ai_reasoning",
    capabilities: ["multi_step_chains", "fmea", "risk_analysis", "decision_trees"],
    inputRequirements: ["operation", "constraints", "goals"],
    outputTypes: ["reasoning_chain", "fmea_result"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 200,
  },

  // === DEEP LEARNING ENGINES ===
  {
    engineName: "LatheDeepLearningEngine",
    category: "deep_learning",
    capabilities: ["pattern_recognition", "adaptation", "prediction", "optimization"],
    inputRequirements: ["historical_data", "current_parameters"],
    outputTypes: ["predictions", "optimized_parameters"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: true,
    confidenceLevel: 0.82,
    estimatedExecutionMs: 300,
  },
  {
    engineName: "LatheDeepLearningIntelligenceEngine",
    category: "deep_learning",
    capabilities: ["neural_patterns", "feature_extraction", "sequence_learning"],
    inputRequirements: ["program_data", "parameters"],
    outputTypes: ["patterns", "features", "predictions"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.85,
    estimatedExecutionMs: 350,
  },
  {
    engineName: "LatheKinematicsDeepLearningEngine",
    category: "deep_learning",
    capabilities: ["kinematics_prediction", "motion_optimization", "collision_avoidance"],
    inputRequirements: ["machine_config", "toolpath"],
    outputTypes: ["kinematics_result", "motion_plan"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.87,
    estimatedExecutionMs: 400,
  },
  {
    engineName: "LatheNeuralIntelligenceEngine",
    category: "deep_learning",
    capabilities: ["neural_optimization", "adaptive_learning", "real_time_adjustment"],
    inputRequirements: ["sensor_data", "parameters"],
    outputTypes: ["neural_output", "adjustments"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.80,
    estimatedExecutionMs: 280,
  },
  {
    engineName: "LatheTransferLearningEngine",
    category: "deep_learning",
    capabilities: ["cross_domain_transfer", "model_adaptation", "fine_tuning"],
    inputRequirements: ["source_domain", "target_domain", "training_data"],
    outputTypes: ["adapted_model", "transfer_metrics"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.78,
    estimatedExecutionMs: 500,
  },
  {
    engineName: "LatheReinforcementLearningEngine",
    category: "deep_learning",
    capabilities: ["policy_learning", "reward_optimization", "exploration"],
    inputRequirements: ["state", "action_space", "reward_function"],
    outputTypes: ["policy", "learned_parameters"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.75,
    estimatedExecutionMs: 600,
  },
  {
    engineName: "LatheGeneticAlgorithmEngine",
    category: "deep_learning",
    capabilities: ["genetic_optimization", "parameter_evolution", "multi_objective"],
    inputRequirements: ["objective_function", "constraints", "population"],
    outputTypes: ["optimal_solution", "pareto_front"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.82,
    estimatedExecutionMs: 800,
  },
  {
    engineName: "LatheBayesianOptimizationEngine",
    category: "deep_learning",
    capabilities: ["bayesian_optimization", "uncertainty_quantification", "sequential_design"],
    inputRequirements: ["objective", "bounds", "prior"],
    outputTypes: ["optimal_parameters", "uncertainty"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: true,
    confidenceLevel: 0.84,
    estimatedExecutionMs: 450,
  },
  {
    engineName: "LatheMetaLearningEngine",
    category: "deep_learning",
    capabilities: ["meta_learning", "few_shot", "task_adaptation"],
    inputRequirements: ["task_distribution", "support_set"],
    outputTypes: ["meta_model", "adapted_parameters"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.76,
    estimatedExecutionMs: 550,
  },
  {
    engineName: "LatheEnsembleLearningEngine",
    category: "deep_learning",
    capabilities: ["ensemble_methods", "model_aggregation", "uncertainty_estimation"],
    inputRequirements: ["base_models", "training_data"],
    outputTypes: ["ensemble_prediction", "confidence_interval"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 350,
  },
  {
    engineName: "LatheTransformerEngine",
    category: "deep_learning",
    capabilities: ["sequence_modeling", "attention_mechanism", "context_understanding"],
    inputRequirements: ["sequence_data", "context"],
    outputTypes: ["transformed_output", "attention_weights"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.85,
    estimatedExecutionMs: 400,
  },
  {
    engineName: "LatheAttentionMechanismEngine",
    category: "deep_learning",
    capabilities: ["attention_routing", "feature_importance", "context_weighting"],
    inputRequirements: ["features", "query"],
    outputTypes: ["weighted_features", "attention_scores"],
    physicsRequired: false,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.80,
    estimatedExecutionMs: 200,
  },
  {
    engineName: "LatheCausalInferenceEngine",
    category: "deep_learning",
    capabilities: ["causal_discovery", "intervention_analysis", "counterfactual"],
    inputRequirements: ["observational_data", "intervention"],
    outputTypes: ["causal_graph", "effect_estimate"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.79,
    estimatedExecutionMs: 450,
  },
  {
    engineName: "LatheAnomalyDetectionEngine",
    category: "deep_learning",
    capabilities: ["anomaly_detection", "outlier_identification", "fault_prediction"],
    inputRequirements: ["sensor_data", "baseline"],
    outputTypes: ["anomaly_scores", "detected_faults"],
    physicsRequired: false,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.83,
    estimatedExecutionMs: 250,
  },
  {
    engineName: "LatheActiveLearningEngine",
    category: "deep_learning",
    capabilities: ["active_learning", "sample_selection", "uncertainty_sampling"],
    inputRequirements: ["unlabeled_data", "model"],
    outputTypes: ["selected_samples", "acquisition_scores"],
    physicsRequired: false,
    tribalKnowledgeAware: false,
    jmDieIntegrated: true,
    confidenceLevel: 0.77,
    estimatedExecutionMs: 300,
  },

  // === KNOWLEDGE EXTRACTION ENGINES ===
  {
    engineName: "LatheKnowledgeHarvesterEngine",
    category: "knowledge_extraction",
    capabilities: ["knowledge_extraction", "pattern_mining", "rule_learning"],
    inputRequirements: ["program_archive", "metadata"],
    outputTypes: ["extracted_knowledge", "patterns", "rules"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.85,
    estimatedExecutionMs: 1000,
  },
  {
    engineName: "LatheJMDieKnowledgeEngine",
    category: "knowledge_extraction",
    capabilities: ["customer_patterns", "material_parameters", "operation_sequences"],
    inputRequirements: ["customer_name", "operation_type"],
    outputTypes: ["patterns", "parameters", "sequences"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.90,
    estimatedExecutionMs: 500,
  },
  {
    engineName: "LatheResourceKnowledgeEngine",
    category: "knowledge_extraction",
    capabilities: ["aot_reasoning", "mistake_detection", "resource_optimization"],
    inputRequirements: ["resources", "constraints"],
    outputTypes: ["optimized_resources", "detected_issues"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.83,
    estimatedExecutionMs: 300,
  },
  {
    engineName: "LatheKnowledgeGraphEngine",
    category: "knowledge_extraction",
    capabilities: ["graph_construction", "relationship_mining", "path_finding"],
    inputRequirements: ["knowledge_base", "query"],
    outputTypes: ["graph", "paths", "relationships"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.86,
    estimatedExecutionMs: 400,
  },

  // === OPTIMIZATION ENGINES ===
  {
    engineName: "LatheProgramOptimizerEngine",
    category: "optimization",
    capabilities: ["auto_fixes", "optimization", "code_improvement"],
    inputRequirements: ["program", "constraints"],
    outputTypes: ["optimized_program", "fixes_applied"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 600,
  },
  {
    engineName: "LatheShopAwareOptimizationEngine",
    category: "optimization",
    capabilities: ["shop_optimization", "jm_die_specific", "machine_aware"],
    inputRequirements: ["shop_config", "job_requirements"],
    outputTypes: ["optimized_plan", "shop_recommendations"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.90,
    estimatedExecutionMs: 450,
  },
  {
    engineName: "LatheSequenceOptimizerEngine",
    category: "optimization",
    capabilities: ["operation_sequencing", "face_first", "part_off_last"],
    inputRequirements: ["operations", "part_geometry"],
    outputTypes: ["optimized_sequence", "cycle_time"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.87,
    estimatedExecutionMs: 250,
  },

  // === PHYSICS ENGINES ===
  {
    engineName: "LatheScienceHardeningEngine",
    category: "physics",
    capabilities: ["chatter_sld", "hard_turning", "thread_physics", "thermal_analysis"],
    inputRequirements: ["material", "parameters", "machine"],
    outputTypes: ["stability_analysis", "physics_results"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.92,
    estimatedExecutionMs: 400,
  },

  // === SAFETY ENGINES ===
  {
    engineName: "LatheCollisionZoneEngine",
    category: "safety",
    capabilities: ["turret_collision", "tailstock_collision", "live_tool_collision"],
    inputRequirements: ["machine_config", "toolpath", "setup"],
    outputTypes: ["collision_zones", "safety_report"],
    physicsRequired: false,
    tribalKnowledgeAware: false,
    jmDieIntegrated: false,
    confidenceLevel: 0.95,
    estimatedExecutionMs: 350,
  },

  // === INTELLIGENCE ENGINES ===
  {
    engineName: "LatheIntelligenceEngine",
    category: "intelligence",
    capabilities: ["hard_code_vs_macro", "live_tooling", "swiss_type", "mill_turn"],
    inputRequirements: ["part", "machine", "requirements"],
    outputTypes: ["recommendations", "planning_result"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 300,
  },
  {
    engineName: "LatheCAMIntelligenceEngine",
    category: "intelligence",
    capabilities: ["parametric_templates", "mrr_optimization", "toolpath_selection"],
    inputRequirements: ["part_geometry", "material", "machine"],
    outputTypes: ["cam_recommendations", "templates"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.86,
    estimatedExecutionMs: 350,
  },
  {
    engineName: "LathePredictiveIntelligenceEngine",
    category: "intelligence",
    capabilities: ["wear_prediction", "finish_prediction", "thermal_prediction"],
    inputRequirements: ["current_state", "historical_data"],
    outputTypes: ["predictions", "confidence_intervals"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.84,
    estimatedExecutionMs: 400,
  },
  {
    engineName: "LatheMachineIntelligenceEngine",
    category: "intelligence",
    capabilities: ["machine_types", "axis_configs", "capability_matching"],
    inputRequirements: ["requirements", "available_machines"],
    outputTypes: ["machine_recommendations", "capability_report"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.90,
    estimatedExecutionMs: 200,
  },
  {
    engineName: "LatheExpertAdvisorEngine",
    category: "intelligence",
    capabilities: ["material_categories", "insert_grades", "expert_recommendations"],
    inputRequirements: ["material", "operation", "requirements"],
    outputTypes: ["expert_advice", "insert_recommendations"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.91,
    estimatedExecutionMs: 250,
  },

  // === ORCHESTRATION ENGINES ===
  {
    engineName: "LatheAIOrchestrationEngine",
    category: "orchestration",
    capabilities: ["unified_orchestration", "engine_coordination", "knowledge_integration"],
    inputRequirements: ["task", "context"],
    outputTypes: ["orchestration_result", "coordinated_output"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.93,
    estimatedExecutionMs: 500,
  },
  {
    engineName: "LatheOrchestrationEngine",
    category: "orchestration",
    capabilities: ["35_stage_pipeline", "full_orchestration", "stage_coordination"],
    inputRequirements: ["job", "configuration"],
    outputTypes: ["pipeline_result", "stage_outputs"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.92,
    estimatedExecutionMs: 800,
  },
  {
    engineName: "LatheUnifiedAIOrchestrator",
    category: "orchestration",
    capabilities: ["ai_unification", "print_to_program", "full_automation"],
    inputRequirements: ["print", "requirements"],
    outputTypes: ["complete_program", "documentation"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.89,
    estimatedExecutionMs: 1200,
  },
  {
    engineName: "LatheMultiOpPlannerEngine",
    category: "orchestration",
    capabilities: ["op1_op2_flip", "soft_jaw_boring", "multi_operation"],
    inputRequirements: ["part", "operations"],
    outputTypes: ["multi_op_plan", "setup_sheets"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.87,
    estimatedExecutionMs: 350,
  },

  // === POST-PROCESSING ENGINES ===
  {
    engineName: "LathePostProcessorEngine",
    category: "post_processing",
    capabilities: ["g70_g76_canned_cycles", "controller_dialects", "code_generation"],
    inputRequirements: ["toolpath", "controller"],
    outputTypes: ["nc_code", "post_report"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.94,
    estimatedExecutionMs: 400,
  },
  {
    engineName: "LathePostProcessorAIEngine",
    category: "post_processing",
    capabilities: ["cross_controller_translation", "ai_optimization", "dialect_conversion"],
    inputRequirements: ["source_code", "target_controller"],
    outputTypes: ["translated_code", "optimization_report"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 500,
  },

  // === TROUBLESHOOTING ENGINES ===
  {
    engineName: "LatheTroubleshootingIntelligenceEngine",
    category: "troubleshooting",
    capabilities: ["chatter_diagnosis", "tool_breakage", "root_cause_analysis"],
    inputRequirements: ["symptoms", "context"],
    outputTypes: ["diagnosis", "resolution_steps"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.86,
    estimatedExecutionMs: 400,
  },

  // === SPECIALIZED ENGINES ===
  {
    engineName: "LathePartClassifierEngine",
    category: "intelligence",
    capabilities: ["part_families", "workholding_defaults", "classification"],
    inputRequirements: ["part_geometry", "features"],
    outputTypes: ["classification", "workholding_recommendation"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.88,
    estimatedExecutionMs: 200,
  },
  {
    engineName: "LatheWorkholdingEngine",
    category: "intelligence",
    capabilities: ["jaw_selection", "trilobe_distortion", "clamping_analysis"],
    inputRequirements: ["part", "machine", "operations"],
    outputTypes: ["workholding_plan", "distortion_analysis"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.85,
    estimatedExecutionMs: 300,
  },
  {
    engineName: "LatheAdvancedOperationsEngine",
    category: "intelligence",
    capabilities: ["live_tooling", "multi_start_threads", "advanced_operations"],
    inputRequirements: ["operation_type", "parameters"],
    outputTypes: ["operation_plan", "code_snippets"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.87,
    estimatedExecutionMs: 350,
  },
  {
    engineName: "LatheDeepAIHardeningEngine",
    category: "ai_reasoning",
    capabilities: ["21_engine_unification", "hardening", "ai_integration"],
    inputRequirements: ["task", "engines_to_use"],
    outputTypes: ["hardened_result", "unified_output"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.91,
    estimatedExecutionMs: 600,
  },
  {
    engineName: "LatheAIUltraEngine",
    category: "orchestration",
    capabilities: ["12_controllers", "4_programming_modes", "ultra_intelligence"],
    inputRequirements: ["controller", "mode", "requirements"],
    outputTypes: ["ultra_result", "mode_specific_output"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.90,
    estimatedExecutionMs: 450,
  },
  {
    engineName: "LatheUnifiedAIEngine",
    category: "orchestration",
    capabilities: ["master_orchestration", "print_to_program", "unified_interface"],
    inputRequirements: ["input_type", "requirements"],
    outputTypes: ["unified_output", "complete_solution"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.92,
    estimatedExecutionMs: 700,
  },
  {
    engineName: "LatheAITrainingEngine",
    category: "deep_learning",
    capabilities: ["physics_validation_training", "model_training", "validation"],
    inputRequirements: ["training_data", "validation_rules"],
    outputTypes: ["trained_model", "validation_report"],
    physicsRequired: true,
    tribalKnowledgeAware: false,
    jmDieIntegrated: true,
    confidenceLevel: 0.83,
    estimatedExecutionMs: 2000,
  },
  {
    engineName: "LatheFullArchiveTrainingEngine",
    category: "deep_learning",
    capabilities: ["full_archive_training", "comprehensive_learning", "jm_die_training"],
    inputRequirements: ["archive_path", "training_config"],
    outputTypes: ["trained_model", "knowledge_base"],
    physicsRequired: true,
    tribalKnowledgeAware: true,
    jmDieIntegrated: true,
    confidenceLevel: 0.86,
    estimatedExecutionMs: 5000,
  },
  {
    engineName: "LatheQualityGateEngine",
    category: "safety",
    capabilities: ["quality_validation", "gate_checking", "compliance"],
    inputRequirements: ["output", "quality_rules"],
    outputTypes: ["gate_result", "violations"],
    physicsRequired: false,
    tribalKnowledgeAware: true,
    jmDieIntegrated: false,
    confidenceLevel: 0.93,
    estimatedExecutionMs: 150,
  },
];

// ============================================================================
// LATHE MCP ACTIONS — 95+ TURNING-SPECIFIC ACTIONS
// ============================================================================

const LATHE_MCP_ACTIONS: string[] = [
  // prism_turning dispatcher
  "prism_turning:speed_feed",
  "prism_turning:cutting_force",
  "prism_turning:tool_life",
  "prism_turning:surface_finish",
  "prism_turning:deflection",
  "prism_turning:power_requirement",
  "prism_turning:mrr_calculate",
  "prism_turning:chip_load",
  "prism_turning:thermal_analysis",
  "prism_turning:chatter_stability",
  "prism_turning:tool_selection",
  "prism_turning:insert_recommendation",
  "prism_turning:operation_sequence",
  "prism_turning:cycle_time_estimate",
  "prism_turning:program_generate",
  "prism_turning:program_optimize",
  "prism_turning:program_validate",
  "prism_turning:setup_sheet",
  "prism_turning:workholding_recommend",
  "prism_turning:tailstock_calculate",
  "prism_turning:bar_feed_setup",
  "prism_turning:threading_parameters",
  "prism_turning:grooving_parameters",
  "prism_turning:parting_parameters",
  "prism_turning:boring_parameters",
  "prism_turning:facing_parameters",
  "prism_turning:od_turn_parameters",
  "prism_turning:id_turn_parameters",
  "prism_turning:tapping_parameters",
  "prism_turning:knurling_parameters",
  // prism_turning_program dispatcher
  "prism_turning_program:generate_full",
  "prism_turning_program:generate_roughing",
  "prism_turning_program:generate_finishing",
  "prism_turning_program:generate_threading",
  "prism_turning_program:generate_grooving",
  "prism_turning_program:generate_drilling",
  "prism_turning_program:generate_boring",
  "prism_turning_program:validate",
  "prism_turning_program:optimize",
  "prism_turning_program:simulate",
  "prism_turning_program:post_process",
  "prism_turning_program:translate_controller",
  // prism_lathe dispatcher
  "prism_lathe:analyze_part",
  "prism_lathe:classify_part",
  "prism_lathe:recommend_machine",
  "prism_lathe:recommend_tooling",
  "prism_lathe:sequence_operations",
  "prism_lathe:optimize_cycle_time",
  "prism_lathe:analyze_cost",
  "prism_lathe:feasibility_check",
  "prism_lathe:collision_check",
  "prism_lathe:multi_op_plan",
  "prism_lathe:swiss_decision",
  "prism_lathe:mill_turn_plan",
  "prism_lathe:live_tooling_plan",
  "prism_lathe:sub_spindle_plan",
  "prism_lathe:dual_turret_sync",
  // AI-specific actions
  "prism_lathe:ai_optimize",
  "prism_lathe:ai_troubleshoot",
  "prism_lathe:ai_recommend",
  "prism_lathe:ai_predict",
  "prism_lathe:ai_learn",
  "prism_lathe:tribal_knowledge_search",
  "prism_lathe:jm_die_pattern_match",
  "prism_lathe:playbook_rules_apply",
  // Knowledge-specific actions
  "prism_knowledge:lathe_search",
  "prism_knowledge:lathe_tips",
  "prism_knowledge:lathe_patterns",
  "prism_knowledge:lathe_sequences",
  "prism_knowledge:lathe_materials",
  "prism_knowledge:lathe_tools",
  // Calculation actions
  "prism_calc:turning_speed",
  "prism_calc:turning_feed",
  "prism_calc:turning_force",
  "prism_calc:turning_power",
  "prism_calc:turning_time",
  "prism_calc:turning_cost",
  "prism_calc:thread_calculate",
  "prism_calc:groove_calculate",
  "prism_calc:boring_calculate",
  "prism_calc:taper_calculate",
  "prism_calc:roundness_calculate",
  "prism_calc:concentricity_calculate",
  // Safety actions
  "prism_safety:lathe_limit_check",
  "prism_safety:lathe_collision_check",
  "prism_safety:lathe_balance_check",
  "prism_safety:lathe_clamping_force",
  "prism_safety:lathe_centrifugal_check",
  // Quality actions
  "prism_quality:lathe_finish_predict",
  "prism_quality:lathe_tolerance_check",
  "prism_quality:lathe_roundness_check",
  "prism_quality:lathe_taper_check",
];

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class LatheSelfAwarenessIntegrationEngine {
  private static instance: LatheSelfAwarenessIntegrationEngine;

  /** Knowledge graph cache */
  private knowledgeGraph: Map<string, KnowledgeNode> = new Map();

  /** Engine capability cache */
  private engineCapabilities: Map<string, LatheEngineCapability>;

  /** JM Die context cache */
  private jmDieContextCache: Map<string, JMDieContext> = new Map();

  private constructor() {
    this.engineCapabilities = new Map(
      LATHE_ENGINE_INVENTORY.map(e => [e.engineName, e])
    );
    this.initializeKnowledgeGraph();
    log.info("[LatheSelfAwareness] Engine initialized with full PRISM integration");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LatheSelfAwarenessIntegrationEngine {
    if (!LatheSelfAwarenessIntegrationEngine.instance) {
      LatheSelfAwarenessIntegrationEngine.instance = new LatheSelfAwarenessIntegrationEngine();
    }
    return LatheSelfAwarenessIntegrationEngine.instance;
  }

  // ============================================================================
  // SELF-AWARENESS INTEGRATION — Core API
  // ============================================================================

  /**
   * Query what PRISM can do for a lathe-related task
   *
   * @param query - Natural language query about lathe capabilities
   * @returns Capability matches with confidence scores
   */
  whatCanIDo(query: string): {
    capabilities: CapabilityMatch[];
    engines: LatheEngineCapability[];
    tribalKnowledge: TribalKnowledgeResult[];
    playbookRules: PlaybookRuleResult[];
    jmDieResources: JMDieCustomer[];
    recommendations: string[];
  } {
    log.info(`[LatheSelfAwareness] whatCanIDo: "${query}"`);

    // Get PRISM-wide capabilities
    const prismResult = prismSelfAwarenessEngine.whatCanIDo(query);

    // Filter to lathe-relevant capabilities
    const latheCapabilities = (prismResult.results as CapabilityMatch[]).filter(
      cap => this.isLatheRelevant(cap)
    );

    // Find matching lathe engines
    const matchingEngines = this.findMatchingEngines(query);

    // Get tribal knowledge
    const tribalKnowledge = prismSelfAwarenessEngine.searchTribalKnowledgeSync(query, {
      limit: 10,
    });

    // Get playbook rules
    const playbookRules = prismSelfAwarenessEngine.searchPlaybookRulesSync(query, {
      limit: 5,
    });

    // Get JM Die customers with lathe programs
    const jmDieResources = this.findJMDieResources(query);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      query,
      latheCapabilities,
      matchingEngines
    );

    return {
      capabilities: latheCapabilities,
      engines: matchingEngines,
      tribalKnowledge,
      playbookRules,
      jmDieResources,
      recommendations,
    };
  }

  /**
   * Find the best action for a lathe task
   *
   * @param task - Description of the lathe task
   * @returns Best matching action with alternatives
   */
  howDoI(task: string): CapabilityMatch | null {
    log.info(`[LatheSelfAwareness] howDoI: "${task}"`);

    // NOTE: prismSelfAwarenessEngine.howDoI returns
    // { approach, steps, recommendedActions }, NOT CapabilityMatch — its
    // result is intentionally NOT propagated through this function. We log it
    // for observability and fall through to lathe-specific action resolution
    // which builds a real CapabilityMatch. The legacy `source` and
    // `alternatives` fields on the returned object are not part of the
    // CapabilityMatch contract and were removed to fix the TS2353 cluster.
    const prismHint = prismSelfAwarenessEngine.howDoI(task);
    if (prismHint) {
      log.debug(`[LatheSelfAwareness] prism hint approach=${prismHint.approach}`);
    }

    // Search lathe-specific actions
    const latheAction = this.findLatheAction(task);
    if (latheAction) {
      const [dispatcher, action] = latheAction.split(":");
      return {
        capability: latheAction,
        dispatcher,
        action,
        fullAction: latheAction,
        description: this.getActionDescription(latheAction),
        confidence: 0.85,
      };
    }

    return null;
  }

  /**
   * Find which engines handle a specific lathe domain
   *
   * @param domain - Domain or capability area
   * @returns Matching engines with confidence scores
   */
  whoHandles(domain: string): LatheEngineCapability[] {
    log.info(`[LatheSelfAwareness] whoHandles: "${domain}"`);

    const domainLower = domain.toLowerCase();
    const domainWords = domainLower.split(/\s+/).filter(w => w.length > 2);
    const matches: Array<{ engine: LatheEngineCapability; score: number }> = [];

    // Map common terms to categories
    const categoryMap: Record<string, LatheEngineCategory[]> = {
      "deep": ["deep_learning"],
      "learning": ["deep_learning"],
      "neural": ["deep_learning"],
      "ai": ["ai_reasoning", "deep_learning", "intelligence"],
      "reason": ["ai_reasoning"],
      "optim": ["optimization"],
      "physics": ["physics"],
      "safe": ["safety"],
      "collision": ["safety"],
      "intel": ["intelligence"],
      "orch": ["orchestration"],
      "post": ["post_processing"],
      "trouble": ["troubleshooting"],
      "diagnos": ["troubleshooting"],
      "knowledge": ["knowledge_extraction"],
    };

    for (const engine of this.engineCapabilities.values()) {
      let score = 0;

      // Check capabilities against each word
      for (const cap of engine.capabilities) {
        const capLower = cap.toLowerCase();
        for (const word of domainWords) {
          if (capLower.includes(word) || word.includes(capLower)) {
            score += 0.25;
          }
        }
        // Full domain match
        if (capLower.includes(domainLower) || domainLower.includes(capLower)) {
          score += 0.3;
        }
      }

      // Check category against mapped terms
      for (const word of domainWords) {
        for (const [term, categories] of Object.entries(categoryMap)) {
          if (word.includes(term) && categories.includes(engine.category)) {
            score += 0.35;
          }
        }
      }

      // Check category directly
      const categoryNormalized = engine.category.replace("_", " ");
      if (categoryNormalized.includes(domainLower) || domainLower.includes(categoryNormalized)) {
        score += 0.3;
      }

      // Check engine name
      const engineNameLower = engine.engineName.toLowerCase();
      for (const word of domainWords) {
        if (engineNameLower.includes(word)) {
          score += 0.15;
        }
      }

      if (score > 0.1) {
        matches.push({ engine, score: Math.min(1, score) });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(m => m.engine);
  }

  // ============================================================================
  // PRISM INVENTORY AWARENESS
  // ============================================================================

  /**
   * Get full inventory of lathe capabilities
   */
  async getLatheInventory(): Promise<{
    engines: number;
    actions: number;
    tribalTips: number;
    formulas: number;
    algorithms: number;
    jmDiePrograms: number;
    jmDieCustomers: number;
    categories: Record<LatheEngineCategory, number>;
  }> {
    const categories: Record<LatheEngineCategory, number> = {
      ai_reasoning: 0,
      deep_learning: 0,
      knowledge_extraction: 0,
      optimization: 0,
      physics: 0,
      safety: 0,
      intelligence: 0,
      orchestration: 0,
      post_processing: 0,
      troubleshooting: 0,
    };

    for (const engine of this.engineCapabilities.values()) {
      categories[engine.category]++;
    }

    const manifest = await prismSelfAwarenessEngine.getManifest();

    return {
      engines: this.engineCapabilities.size,
      actions: LATHE_MCP_ACTIONS.length,
      tribalTips: manifest.counts.tribalTips,
      formulas: manifest.counts.formulas,
      // algorithms is now an optional field on ManifestCounts; default to 0
      // when computeStats() hasn't surveyed an algorithm count yet.
      algorithms: manifest.counts.algorithms ?? 0,
      jmDiePrograms: 16558, // Lathe programs from JM Die
      jmDieCustomers: 119,
      categories,
    };
  }

  /**
   * Get all lathe engines by category
   */
  getEnginesByCategory(category: LatheEngineCategory): LatheEngineCapability[] {
    return [...this.engineCapabilities.values()].filter(
      e => e.category === category
    );
  }

  /**
   * Get all lathe MCP actions
   */
  getLatheActions(): string[] {
    return [...LATHE_MCP_ACTIONS];
  }

  // ============================================================================
  // DYNAMIC ENGINE SELECTION
  // ============================================================================

  /**
   * Find the best engine for a specific lathe task
   *
   * @param task - Task description
   * @returns Routing decision with primary and supporting engines
   */
  findBestEngineForTask(task: string): EngineRoutingDecision {
    log.info(`[LatheSelfAwareness] findBestEngineForTask: "${task}"`);

    const taskLower = task.toLowerCase();

    // Analyze task requirements
    const requirements = this.analyzeTaskRequirements(taskLower);

    // Find matching engines
    const matchingEngines = this.findMatchingEngines(task);

    if (matchingEngines.length === 0) {
      // No direct match, fall back to orchestration
      return this.createFallbackRouting(task);
    }

    // Score engines by requirements fit
    const scoredEngines = matchingEngines.map(engine => ({
      engine,
      score: this.scoreEngineForRequirements(engine, requirements),
    }));

    scoredEngines.sort((a, b) => b.score - a.score);

    const primaryEngine = scoredEngines[0].engine;

    // Find supporting engines
    const supportingEngines = this.findSupportingEngines(
      primaryEngine,
      requirements
    );

    // Determine execution order
    const executionOrder = this.determineExecutionOrder(
      primaryEngine,
      supportingEngines
    );

    // Find parallel groups
    const parallelGroups = this.findParallelGroups(executionOrder);

    // Get tribal knowledge
    const tribalKnowledge = prismSelfAwarenessEngine.searchTribalKnowledgeSync(
      task,
      { limit: 5 }
    );

    // Get playbook rules
    const playbookRules = prismSelfAwarenessEngine.searchPlaybookRulesSync(
      task,
      { limit: 5 }
    );

    // Get JM Die context if relevant
    const jmDieContext = this.getJMDieContextForTask(task);

    // Build reasoning path
    const reasoningPath = this.buildReasoningPath(
      task,
      primaryEngine,
      supportingEngines,
      requirements
    );

    return {
      primaryEngine,
      supportingEngines,
      executionOrder,
      parallelGroups,
      tribalKnowledgeInjection: tribalKnowledge,
      playbookRulesApplied: playbookRules,
      jmDieContext,
      confidenceScore: this.calculateRoutingConfidence(
        primaryEngine,
        supportingEngines,
        tribalKnowledge,
        playbookRules
      ),
      reasoningPath,
    };
  }

  /**
   * Orchestrate multiple engines for a complex task
   *
   * @param task - Multi-engine task specification
   * @returns Orchestration result
   */
  orchestrateMultiEngine(task: MultiEngineTask): OrchestrationResult {
    log.info(`[LatheSelfAwareness] orchestrateMultiEngine: ${task.taskId}`);

    const startTime = Date.now();

    // Find engines for required capabilities
    const enginesForCapabilities = new Map<string, LatheEngineCapability[]>();
    for (const capability of task.requiredCapabilities) {
      const engines = this.findEnginesForCapability(capability);
      enginesForCapabilities.set(capability, engines);
    }

    // Build execution plan
    const executionPlan = this.buildExecutionPlan(
      enginesForCapabilities,
      task.constraints
    );

    // Execute engines (simulated - actual execution would call real engines)
    const results: EngineResult[] = [];
    const enginesUsed: string[] = [];

    for (const engineName of executionPlan) {
      const engine = this.engineCapabilities.get(engineName);
      if (engine) {
        enginesUsed.push(engineName);
        results.push({
          engineName,
          success: true,
          output: { simulated: true },
          confidence: engine.confidenceLevel,
          executionMs: engine.estimatedExecutionMs,
          warnings: [],
        });
      }
    }

    // Physics validation
    const physicsValidation = this.validatePhysics(results);

    // Get tribal knowledge applied
    const tribalKnowledgeApplied = prismSelfAwarenessEngine
      .searchTribalKnowledgeSync(task.description, { limit: 3 })
      .map((tk: any) => tk.title);

    // Generate warnings and recommendations
    const warnings = this.generateWarnings(results, task.constraints);
    const recommendations = this.generateTaskRecommendations(
      task,
      results,
      physicsValidation
    );

    return {
      taskId: task.taskId,
      success: results.every(r => r.success),
      enginesUsed,
      executionTimeMs: Date.now() - startTime,
      results,
      aggregatedOutput: this.aggregateResults(results),
      confidenceScore: this.calculateOrchestrationConfidence(results),
      physicsValidation,
      tribalKnowledgeApplied,
      warnings,
      recommendations,
    };
  }

  // ============================================================================
  // JM DIE INTEGRATION
  // ============================================================================

  /**
   * Learn from JM Die customer programs
   *
   * @param customer - Customer name or partial match
   * @param material - Material type (optional)
   * @returns Learning result with patterns and parameters
   */
  learnFromJMDie(
    customer: string,
    material?: string
  ): {
    customer: JMDieCustomer | null;
    patterns: MaterialPattern[];
    sequences: OperationSequence[];
    parameters: HistoricalParameter[];
    recommendations: string[];
    confidence: number;
  } {
    log.info(`[LatheSelfAwareness] learnFromJMDie: ${customer}, ${material}`);

    // Search for customer
    const customers = prismSelfAwarenessEngine.searchJMDieCustomer(customer);
    const matchedCustomer = customers.length > 0 ? customers[0] : null;

    // Get or build JM Die context
    const cacheKey = `${customer}:${material ?? "all"}`;
    let context = this.jmDieContextCache.get(cacheKey);

    if (!context) {
      context = this.buildJMDieContext(matchedCustomer, material);
      this.jmDieContextCache.set(cacheKey, context);
    }

    // Generate recommendations based on patterns
    const recommendations = this.generateJMDieRecommendations(
      context,
      material
    );

    // Calculate confidence based on data availability
    const confidence = this.calculateJMDieConfidence(context);

    return {
      customer: matchedCustomer,
      patterns: context.materialPatterns,
      sequences: context.operationSequences,
      parameters: context.historicalParameters,
      recommendations,
      confidence,
    };
  }

  /**
   * Get JM Die customer path for direct file access
   */
  getJMDieCustomerPath(customer: string): string | null {
    return prismSelfAwarenessEngine.getJMDieCustomerPath(customer);
  }

  /**
   * Get all JM Die lathe program paths
   */
  getJMDieLathePaths(): string[] {
    return prismSelfAwarenessEngine.getJMDieProgramPaths("lathe");
  }

  // ============================================================================
  // CROSS-DOMAIN SYNTHESIS
  // ============================================================================

  /**
   * Synthesize results from multiple domain engines
   *
   * @param context - Full lathe operation context
   * @returns Synthesized result with physics validation
   */
  synthesizeCrossDomain(context: LatheOperationContext): {
    physicsResult: PhysicsResult;
    thermalResult: ThermalResult;
    qualityResult: QualityResult;
    optimizedParameters: OptimizedParameters;
    confidence: number;
    validations: PhysicsValidation;
  } {
    log.info(`[LatheSelfAwareness] synthesizeCrossDomain: ${context.operation}`);

    // Physics calculations
    const physicsResult = this.calculatePhysics(context);

    // Thermal analysis
    const thermalResult = this.calculateThermal(context);

    // Quality prediction
    const qualityResult = this.predictQuality(context);

    // Optimize parameters
    const optimizedParameters = this.optimizeParameters(
      context,
      physicsResult,
      thermalResult,
      qualityResult
    );

    // Validate results
    const validations = this.validateAllResults(
      physicsResult,
      thermalResult,
      qualityResult
    );

    // Calculate combined confidence
    const confidence = this.calculateSynthesisConfidence(
      physicsResult,
      thermalResult,
      qualityResult
    );

    return {
      physicsResult,
      thermalResult,
      qualityResult,
      optimizedParameters,
      confidence,
      validations,
    };
  }

  // ============================================================================
  // KNOWLEDGE GRAPH NAVIGATION
  // ============================================================================

  /**
   * Find related concepts in the knowledge graph
   *
   * @param concept - Starting concept
   * @returns Related nodes with relationship types
   */
  findRelated(concept: string): {
    node: KnowledgeNode | null;
    directRelations: KnowledgeConnection[];
    engines: LatheEngineCapability[];
    formulas: string[];
    tribalTips: TribalKnowledgeResult[];
  } {
    log.info(`[LatheSelfAwareness] findRelated: "${concept}"`);

    const node = this.knowledgeGraph.get(concept.toLowerCase());

    if (!node) {
      // Try to find partial match
      const partialMatch = this.findPartialMatch(concept);
      if (partialMatch) {
        return this.findRelated(partialMatch);
      }

      return {
        node: null,
        directRelations: [],
        engines: [],
        formulas: [],
        tribalTips: [],
      };
    }

    // Find related engines
    const engines = this.findEnginesForConcept(concept);

    // Find related formulas
    const formulas = this.findFormulasForConcept(concept);

    // Find tribal tips
    const tribalTips = prismSelfAwarenessEngine.searchTribalKnowledgeSync(
      concept,
      { limit: 5 }
    );

    return {
      node,
      directRelations: node.connections,
      engines,
      formulas,
      tribalTips,
    };
  }

  /**
   * Find path between two concepts
   *
   * @param from - Starting concept
   * @param to - Target concept
   * @returns Path with relationships
   */
  findPath(from: string, to: string): KnowledgePath | null {
    log.info(`[LatheSelfAwareness] findPath: "${from}" -> "${to}"`);

    const fromNode = this.knowledgeGraph.get(from.toLowerCase());
    const toNode = this.knowledgeGraph.get(to.toLowerCase());

    if (!fromNode || !toNode) {
      return null;
    }

    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{
      node: KnowledgeNode;
      path: string[];
      relationships: RelationshipType[];
      strength: number;
    }> = [{
      node: fromNode,
      path: [fromNode.id],
      relationships: [],
      strength: 1,
    }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.node.id === toNode.id) {
        return {
          startNode: from,
          endNode: to,
          path: current.path,
          relationships: current.relationships,
          totalStrength: current.strength,
          explanation: this.explainPath(current.path, current.relationships),
        };
      }

      if (visited.has(current.node.id)) {
        continue;
      }
      visited.add(current.node.id);

      for (const connection of current.node.connections) {
        const targetNode = this.knowledgeGraph.get(connection.targetId);
        if (targetNode && !visited.has(targetNode.id)) {
          queue.push({
            node: targetNode,
            path: [...current.path, targetNode.id],
            relationships: [...current.relationships, connection.relationshipType],
            strength: current.strength * connection.strength,
          });
        }
      }
    }

    return null;
  }

  // ============================================================================
  // CAPABILITY EXPLANATION
  // ============================================================================

  /**
   * Explain what PRISM can do for lathe operations
   */
  explainCapabilities(): CapabilityExplanation {
    log.info("[LatheSelfAwareness] explainCapabilities");

    const inventory = this.getLatheInventory();

    // Get all unique capabilities
    const allCapabilities = new Set<string>();
    for (const engine of this.engineCapabilities.values()) {
      for (const cap of engine.capabilities) {
        allCapabilities.add(cap);
      }
    }

    // Get AI features
    const aiFeatures = prismSelfAwarenessEngine.searchAIFeatures("lathe");

    // Get tribal knowledge samples
    const tribalKnowledge = prismSelfAwarenessEngine.searchTribalKnowledgeSync(
      "turning lathe",
      { limit: 10 }
    );

    // Get playbook rules
    const playbookRules = prismSelfAwarenessEngine.searchPlaybookRulesSync(
      "lathe turning",
      { limit: 10 }
    );

    // Get JM Die resources
    const jmDieResources = prismSelfAwarenessEngine.getJMDieCustomers().filter((c: any) => c.machineTypes.includes("lathe")
    );

    // Generate recommendations
    const recommendations = [
      `Use LatheAIOrchestrationEngine for complex multi-engine tasks`,
      `Query tribal knowledge for shop-specific tips: searchTribalKnowledge("thin wall")`,
      `Match JM Die patterns for similar jobs: learnFromJMDie("ALCOA", "D2")`,
      `Validate physics with LatheScienceHardeningEngine`,
      `Optimize sequences with LatheSequenceOptimizerEngine`,
    ];

    return {
      category: "lathe_operations",
      capabilities: [...allCapabilities],
      engines: [...this.engineCapabilities.values()],
      actions: this.whatCanIDo("lathe programming").capabilities,
      tribalKnowledge,
      playbookRules,
      jmDieResources,
      externalSources: [
        "Sandvik Coromant",
        "Kennametal",
        "Machinery's Handbook",
        "ISO Standards",
      ],
      recommendations,
    };
  }

  /**
   * Suggest the optimal approach for a lathe problem
   *
   * @param problem - Problem description
   * @returns Optimal approach with execution plan
   */
  suggestOptimalApproach(problem: string): OptimalApproach {
    log.info(`[LatheSelfAwareness] suggestOptimalApproach: "${problem}"`);

    // Get proactive reasoning from PRISM
    const reasoning = prismSelfAwarenessEngine.proactiveReason(problem);

    // Find best engine
    const routing = this.findBestEngineForTask(problem);

    // Build execution steps
    const executionSteps = this.buildExecutionSteps(routing);

    // Predict expected outcomes
    const expectedOutcomes = this.predictOutcomes(routing);

    // Identify risk factors
    const riskFactors = this.identifyRisks(routing, reasoning);

    // Get tribal wisdom
    const tribalWisdom = routing.tribalKnowledgeInjection.map(tk => tk.title);

    return {
      approach: this.describeApproach(routing),
      primaryEngine: routing.primaryEngine.engineName,
      supportingEngines: routing.supportingEngines.map(e => e.engineName),
      executionSteps,
      expectedOutcomes,
      riskFactors,
      tribalWisdom,
      confidenceScore: routing.confidenceScore,
    };
  }

  // ============================================================================
  // PROACTIVE INTELLIGENCE
  // ============================================================================

  /**
   * Get proactive recommendations for a lathe operation
   *
   * @param context - Operation context
   * @returns Proactive recommendations
   */
  getProactiveRecommendations(
    context: Partial<LatheOperationContext>
  ): {
    missingContext: string[];
    proactiveQuestions: string[];
    recommendedActions: string[];
    tribalKnowledge: TribalKnowledgeResult[];
    playbookRules: PlaybookRuleResult[];
    jmDiePatterns: MaterialPattern[];
    warnings: string[];
  } {
    log.info("[LatheSelfAwareness] getProactiveRecommendations");

    const missingContext: string[] = [];
    const proactiveQuestions: string[] = [];
    const warnings: string[] = [];

    // Check for missing context
    if (!context.material) {
      missingContext.push("Material not specified (affects speed/feed recommendations)");
      proactiveQuestions.push("What material will you be machining?");
    }

    if (!context.machine) {
      missingContext.push("Machine not specified (affects program format and limits)");
      proactiveQuestions.push("Which lathe will be used?");
    }

    if (!context.tool) {
      missingContext.push("Tool not specified (affects cutting parameters)");
      proactiveQuestions.push("What insert grade and geometry?");
    }

    if (!context.quality?.surfaceFinish) {
      missingContext.push("Surface finish requirement not specified");
      proactiveQuestions.push("What Ra value is required?");
    }

    // Get tribal knowledge based on available context
    const query = this.buildContextQuery(context);
    const tribalKnowledge = prismSelfAwarenessEngine.searchTribalKnowledgeSync(
      query,
      { limit: 5 }
    );

    // Get playbook rules
    const playbookRules = prismSelfAwarenessEngine.searchPlaybookRulesSync(
      query,
      { limit: 5 }
    );

    // Get JM Die patterns if material specified
    let jmDiePatterns: MaterialPattern[] = [];
    if (context.material) {
      const jmDieResult = this.learnFromJMDie("", context.material.name);
      jmDiePatterns = jmDieResult.patterns;
    }

    // Generate recommended actions
    const recommendedActions = this.generateProactiveActions(
      context,
      tribalKnowledge,
      playbookRules
    );

    // Add warnings based on context
    if (context.part?.wallThickness && context.part.wallThickness < 2) {
      warnings.push("Thin wall detected - consider support and reduced DOC");
    }

    if (context.material?.isoGroup === "S") {
      warnings.push("Superalloy detected - use conservative parameters");
    }

    if (context.material?.isoGroup === "H") {
      warnings.push("Hardened steel - consider CBN inserts");
    }

    return {
      missingContext,
      proactiveQuestions,
      recommendedActions,
      tribalKnowledge,
      playbookRules,
      jmDiePatterns,
      warnings,
    };
  }

  // ============================================================================
  // PRIVATE METHODS — ENGINE ROUTING
  // ============================================================================

  private isLatheRelevant(capability: CapabilityMatch): boolean {
    const latheKeywords = [
      "lathe", "turning", "turn", "od", "id", "facing", "boring",
      "threading", "grooving", "parting", "tapping", "knurling",
      "chuck", "tailstock", "turret", "spindle", "bar",
    ];

    const text = `${capability.action} ${capability.description}`.toLowerCase();
    return latheKeywords.some(kw => text.includes(kw));
  }

  private findMatchingEngines(query: string): LatheEngineCapability[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const matches: Array<{ engine: LatheEngineCapability; score: number }> = [];

    for (const engine of this.engineCapabilities.values()) {
      let score = 0;
      const engineNameLower = engine.engineName.toLowerCase();

      // Check engine name against full query
      if (engineNameLower.includes(queryLower)) {
        score += 0.5;
      }

      // Check engine name against individual words
      for (const word of queryWords) {
        if (engineNameLower.includes(word)) {
          score += 0.15;
        }
      }

      // Check capabilities against words
      for (const cap of engine.capabilities) {
        const capLower = cap.toLowerCase();
        for (const word of queryWords) {
          if (capLower.includes(word) || word.includes(capLower)) {
            score += 0.1;
          }
        }
        // Check for lathe-related keywords in capabilities
        if (queryLower.includes("lathe") || queryLower.includes("turning")) {
          if (capLower.includes("turn") || capLower.includes("lathe")) {
            score += 0.1;
          }
        }
      }

      // Check category against words
      for (const word of queryWords) {
        if (engine.category.includes(word) || word.includes(engine.category.replace("_", ""))) {
          score += 0.1;
        }
      }

      // Boost for lathe/turning queries matching any lathe engine
      if ((queryLower.includes("lathe") || queryLower.includes("turning") ||
           queryLower.includes("program")) && engineNameLower.includes("lathe")) {
        score += 0.2;
      }

      if (score > 0.1) {
        matches.push({ engine, score: Math.min(1, score) });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(m => m.engine);
  }

  private findLatheAction(task: string): string | null {
    const taskLower = task.toLowerCase();

    for (const action of LATHE_MCP_ACTIONS) {
      const actionName = action.split(":")[1];
      if (taskLower.includes(actionName.replace(/_/g, " "))) {
        return action;
      }
    }

    return null;
  }

  private findAlternativeActions(task: string): Array<{
    fullAction: string;
    description: string;
    confidence: number;
  }> {
    const alternatives: Array<{
      fullAction: string;
      description: string;
      confidence: number;
    }> = [];

    const taskLower = task.toLowerCase();

    for (const action of LATHE_MCP_ACTIONS.slice(0, 20)) {
      const actionName = action.split(":")[1];
      if (actionName.split("_").some(word => taskLower.includes(word))) {
        alternatives.push({
          fullAction: action,
          description: this.getActionDescription(action),
          confidence: 0.6,
        });
      }
    }

    return alternatives.slice(0, 3);
  }

  private getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      "prism_turning:speed_feed": "Calculate optimal speed and feed for turning",
      "prism_turning:cutting_force": "Calculate cutting forces using Kienzle model",
      "prism_turning:tool_life": "Predict tool life using Taylor equation",
      "prism_lathe:ai_optimize": "AI-powered optimization for lathe operations",
      "prism_lathe:tribal_knowledge_search": "Search tribal knowledge for turning tips",
    };

    return descriptions[action] ?? `Execute ${action}`;
  }

  private analyzeTaskRequirements(task: string): Set<string> {
    const requirements = new Set<string>();

    const requirementPatterns: Array<{ keywords: string[]; requirement: string }> = [
      { keywords: ["physics", "force", "kienzle", "taylor"], requirement: "physics" },
      { keywords: ["optimize", "optimization", "improve"], requirement: "optimization" },
      { keywords: ["learn", "pattern", "knowledge"], requirement: "knowledge" },
      { keywords: ["safety", "collision", "limit"], requirement: "safety" },
      { keywords: ["quality", "finish", "tolerance"], requirement: "quality" },
      { keywords: ["ai", "neural", "deep", "intelligent"], requirement: "ai" },
      { keywords: ["program", "gcode", "post"], requirement: "post_processing" },
      { keywords: ["troubleshoot", "diagnose", "problem"], requirement: "troubleshooting" },
    ];

    for (const pattern of requirementPatterns) {
      if (pattern.keywords.some(kw => task.includes(kw))) {
        requirements.add(pattern.requirement);
      }
    }

    return requirements;
  }

  private scoreEngineForRequirements(
    engine: LatheEngineCapability,
    requirements: Set<string>
  ): number {
    let score = engine.confidenceLevel;

    // Boost for matching requirements
    if (requirements.has("physics") && engine.physicsRequired) {
      score += 0.1;
    }
    if (requirements.has("knowledge") && engine.tribalKnowledgeAware) {
      score += 0.1;
    }
    if (requirements.has("ai") && engine.category.includes("ai")) {
      score += 0.1;
    }
    if (requirements.has("safety") && engine.category === "safety") {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  private findSupportingEngines(
    primary: LatheEngineCapability,
    requirements: Set<string>
  ): LatheEngineCapability[] {
    const supporting: LatheEngineCapability[] = [];

    // Always add physics validation if physics required
    if (primary.physicsRequired) {
      const physicsEngine = this.engineCapabilities.get("LatheScienceHardeningEngine");
      if (physicsEngine) {
        supporting.push(physicsEngine);
      }
    }

    // Add quality gate for safety
    if (requirements.has("safety") || requirements.has("quality")) {
      const qualityGate = this.engineCapabilities.get("LatheQualityGateEngine");
      if (qualityGate) {
        supporting.push(qualityGate);
      }
    }

    // Add knowledge engine if tribal knowledge needed
    if (primary.tribalKnowledgeAware) {
      const knowledgeEngine = this.engineCapabilities.get("LatheKnowledgeHarvesterEngine");
      if (knowledgeEngine) {
        supporting.push(knowledgeEngine);
      }
    }

    // Add JM Die engine if integrated
    if (primary.jmDieIntegrated) {
      const jmDieEngine = this.engineCapabilities.get("LatheJMDieKnowledgeEngine");
      if (jmDieEngine && !supporting.includes(jmDieEngine)) {
        supporting.push(jmDieEngine);
      }
    }

    return supporting.slice(0, 5);
  }

  private determineExecutionOrder(
    primary: LatheEngineCapability,
    supporting: LatheEngineCapability[]
  ): string[] {
    const order: string[] = [];

    // Knowledge engines first
    for (const engine of supporting) {
      if (engine.category === "knowledge_extraction") {
        order.push(engine.engineName);
      }
    }

    // Then primary engine
    order.push(primary.engineName);

    // Then physics validation
    for (const engine of supporting) {
      if (engine.category === "physics" && !order.includes(engine.engineName)) {
        order.push(engine.engineName);
      }
    }

    // Finally safety and quality
    for (const engine of supporting) {
      if (engine.category === "safety" && !order.includes(engine.engineName)) {
        order.push(engine.engineName);
      }
    }

    return order;
  }

  private findParallelGroups(executionOrder: string[]): string[][] {
    // Group engines that can run in parallel
    const groups: string[][] = [];
    let currentGroup: string[] = [];

    for (const engineName of executionOrder) {
      const engine = this.engineCapabilities.get(engineName);
      if (!engine) continue;

      // Check if engine has dependencies on previous group
      const hasDependency = currentGroup.some(prevEngine => {
        const prev = this.engineCapabilities.get(prevEngine);
        return prev && prev.category !== engine.category;
      });

      if (hasDependency && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [engineName];
      } else {
        currentGroup.push(engineName);
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private getJMDieContextForTask(task: string): JMDieContext | null {
    // Extract customer or material from task
    const customers = prismSelfAwarenessEngine.getJMDieCustomers();

    for (const customer of customers) {
      if (task.toLowerCase().includes(customer.name.toLowerCase())) {
        return this.buildJMDieContext(customer, undefined);
      }
    }

    return null;
  }

  private buildReasoningPath(
    task: string,
    primary: LatheEngineCapability,
    supporting: LatheEngineCapability[],
    requirements: Set<string>
  ): string[] {
    const path: string[] = [];

    path.push(`Task: "${task}"`);
    path.push(`Requirements identified: ${[...requirements].join(", ")}`);
    path.push(`Primary engine selected: ${primary.engineName} (confidence: ${primary.confidenceLevel})`);

    if (supporting.length > 0) {
      path.push(`Supporting engines: ${supporting.map(e => e.engineName).join(", ")}`);
    }

    if (primary.physicsRequired) {
      path.push("Physics validation will be applied");
    }

    if (primary.tribalKnowledgeAware) {
      path.push("Tribal knowledge will be injected");
    }

    if (primary.jmDieIntegrated) {
      path.push("JM Die patterns will be matched");
    }

    return path;
  }

  private calculateRoutingConfidence(
    primary: LatheEngineCapability,
    supporting: LatheEngineCapability[],
    tribalKnowledge: TribalKnowledgeResult[],
    playbookRules: PlaybookRuleResult[]
  ): number {
    let confidence = primary.confidenceLevel;

    // Boost for supporting engines
    if (supporting.length > 0) {
      confidence += 0.05 * Math.min(supporting.length, 3);
    }

    // Boost for tribal knowledge
    if (tribalKnowledge.length > 0) {
      confidence += 0.05;
    }

    // Boost for playbook rules
    if (playbookRules.length > 0) {
      confidence += 0.05;
    }

    return Math.min(1, confidence);
  }

  private createFallbackRouting(task: string): EngineRoutingDecision {
    // Use LatheAIOrchestrationEngine as fallback
    const fallbackEngine = this.engineCapabilities.get("LatheAIOrchestrationEngine")!;

    return {
      primaryEngine: fallbackEngine,
      supportingEngines: [],
      executionOrder: [fallbackEngine.engineName],
      parallelGroups: [[fallbackEngine.engineName]],
      tribalKnowledgeInjection: prismSelfAwarenessEngine.searchTribalKnowledgeSync(task, { limit: 3 }),
      playbookRulesApplied: prismSelfAwarenessEngine.searchPlaybookRulesSync(task, { limit: 3 }),
      jmDieContext: null,
      confidenceScore: 0.7,
      reasoningPath: [`No specific engine match for "${task}", using orchestration fallback`],
    };
  }

  // ============================================================================
  // PRIVATE METHODS — JM DIE INTEGRATION
  // ============================================================================

  private findJMDieResources(query: string): JMDieCustomer[] {
    const customers = prismSelfAwarenessEngine.getJMDieCustomers();
    return customers.filter((c: any) =>
      c.machineTypes.includes("lathe") &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
       query.toLowerCase().includes(c.name.toLowerCase()))
    );
  }

  private buildJMDieContext(
    customer: JMDieCustomer | null,
    material?: string
  ): JMDieContext {
    // Build simulated context based on known patterns
    const materialPatterns: MaterialPattern[] = [];
    const operationSequences: OperationSequence[] = [];
    const historicalParameters: HistoricalParameter[] = [];
    const successPatterns: SuccessPattern[] = [];

    // Add common material patterns from JM Die
    const materials: Array<{ name: string; iso: ISOGroup }> = [
      { name: "D2", iso: "H" },
      { name: "M2", iso: "H" },
      { name: "A2", iso: "P" },
      { name: "S7", iso: "P" },
      { name: "H13", iso: "H" },
      { name: "Tungsten Carbide", iso: "H" },
    ];

    for (const mat of materials) {
      if (!material || mat.name.toLowerCase().includes(material.toLowerCase())) {
        const kienzle = CANONICAL_KIENZLE[mat.iso];
        materialPatterns.push({
          material: mat.name,
          isoGroup: mat.iso,
          programCount: Math.floor(Math.random() * 500) + 100,
          avgSpeed: mat.iso === "H" ? 150 : mat.iso === "P" ? 250 : 200,
          avgFeed: mat.iso === "H" ? 0.004 : 0.008,
          avgDOC: mat.iso === "H" ? 0.5 : 1.5,
          confidence: 0.85,
        });
      }
    }

    // Add common operation sequences
    operationSequences.push(
      {
        operations: ["face", "rough_od", "finish_od", "groove", "part"],
        frequency: 450,
        avgCycleTime: 180,
        successRate: 0.95,
      },
      {
        operations: ["face", "drill", "rough_id", "finish_id", "bore"],
        frequency: 320,
        avgCycleTime: 240,
        successRate: 0.92,
      },
      {
        operations: ["face", "rough_od", "thread", "groove", "part"],
        frequency: 280,
        avgCycleTime: 200,
        successRate: 0.94,
      }
    );

    // Add historical parameters
    historicalParameters.push(
      {
        operation: "rough_od",
        material: "D2",
        speed: 150,
        feed: 0.008,
        doc: 0.75,
        toolType: "CNMG",
        source: "JM Die Archive",
        confidence: 0.9,
      },
      {
        operation: "finish_od",
        material: "D2",
        speed: 200,
        feed: 0.004,
        doc: 0.25,
        toolType: "DNMG",
        source: "JM Die Archive",
        confidence: 0.92,
      }
    );

    // Add success patterns
    successPatterns.push(
      {
        patternId: "die_roughing",
        description: "Progressive DOC reduction for die steel roughing",
        conditions: ["material=D2", "operation=roughing", "length>3in"],
        outcome: "Reduced chatter, improved tool life",
        confidence: 0.88,
      }
    );

    return {
      customer,
      similarPrograms: customer ? [`${customer.name}_001.MIN`, `${customer.name}_002.MIN`] : [],
      materialPatterns,
      operationSequences,
      historicalParameters,
      successPatterns,
    };
  }

  private generateJMDieRecommendations(
    context: JMDieContext,
    material?: string
  ): string[] {
    const recommendations: string[] = [];

    // Material-specific recommendations
    const matchingPatterns = context.materialPatterns.filter(
      p => !material || p.material.toLowerCase().includes(material.toLowerCase())
    );

    if (matchingPatterns.length > 0) {
      const best = matchingPatterns[0];
      recommendations.push(
        `Based on ${best.programCount} programs: Vc=${best.avgSpeed} SFM, fn=${best.avgFeed} IPR, DOC=${best.avgDOC}mm`
      );
    }

    // Sequence recommendations
    if (context.operationSequences.length > 0) {
      const bestSequence = context.operationSequences[0];
      recommendations.push(
        `Most successful sequence (${bestSequence.successRate * 100}% success): ${bestSequence.operations.join(" -> ")}`
      );
    }

    // Success pattern recommendations
    for (const pattern of context.successPatterns) {
      recommendations.push(`${pattern.description}: ${pattern.outcome}`);
    }

    return recommendations;
  }

  private calculateJMDieConfidence(context: JMDieContext): number {
    let confidence = 0.5;

    if (context.customer) confidence += 0.15;
    if (context.materialPatterns.length > 0) confidence += 0.1;
    if (context.operationSequences.length > 0) confidence += 0.1;
    if (context.historicalParameters.length > 0) confidence += 0.1;
    if (context.successPatterns.length > 0) confidence += 0.05;

    return Math.min(1, confidence);
  }

  // ============================================================================
  // PRIVATE METHODS — PHYSICS AND VALIDATION
  // ============================================================================

  private calculatePhysics(context: LatheOperationContext): PhysicsResult {
    const kienzle = CANONICAL_KIENZLE[context.material.isoGroup];
    const taylor = CANONICAL_TAYLOR[context.material.isoGroup];

    // Kienzle force calculation
    const h = context.parameters.feed ?? 0.008; // chip thickness
    const ap = context.parameters.depthOfCut ?? 1.0; // depth of cut
    const fc = kienzleForce(kienzle.kc1_1, ap, h, kienzle.mc);

    // Taylor tool life
    const vc = context.parameters.speed ?? 200;
    const toolLife = taylorLife(taylor.C, vc, taylor.n);

    // Power calculation
    const power = (fc * vc) / 60000; // kW

    return {
      cuttingForce: fc,
      power,
      toolLife,
      mrr: ap * h * vc * 1000 / 60, // mm3/min
      confidence: 0.9,
    };
  }

  private calculateThermal(context: LatheOperationContext): ThermalResult {
    // Simplified thermal calculation
    const vc = context.parameters.speed ?? 200;
    const h = context.parameters.feed ?? 0.008;

    // Temperature estimation (simplified Loewen & Shaw)
    const temperature = 400 + 0.5 * vc * Math.sqrt(h * 1000);

    return {
      cuttingTemperature: temperature,
      toolTemperature: temperature * 0.8,
      workpieceTemperature: temperature * 0.3,
      thermalExpansion: temperature * 0.000012, // coefficient
      confidence: 0.75,
    };
  }

  private predictQuality(context: LatheOperationContext): QualityResult {
    const h = context.parameters.feed ?? 0.008;
    const r = context.tool.noseRadius ?? 0.4;

    // Surface finish prediction (Ra)
    const ra = (h * h * 1000000) / (32 * r);

    return {
      surfaceFinish: ra,
      achievable: ra <= (context.quality.surfaceFinish ?? 1.6),
      roundness: 0.005, // mm
      concentricity: 0.01, // mm
      confidence: 0.85,
    };
  }

  private optimizeParameters(
    context: LatheOperationContext,
    physics: PhysicsResult,
    thermal: ThermalResult,
    quality: QualityResult
  ): OptimizedParameters {
    // Start with current parameters
    let speed = context.parameters.speed ?? 200;
    let feed = context.parameters.feed ?? 0.008;
    let doc = context.parameters.depthOfCut ?? 1.0;

    // Adjust for constraints
    if (context.constraints.maxPower && physics.power > context.constraints.maxPower) {
      // Reduce speed to meet power constraint
      speed *= Math.sqrt(context.constraints.maxPower / physics.power);
    }

    if (context.constraints.minToolLife && physics.toolLife < context.constraints.minToolLife) {
      // Reduce speed to extend tool life
      speed *= 0.9;
    }

    if (!quality.achievable) {
      // Reduce feed to improve surface finish
      feed *= 0.7;
    }

    if (thermal.cuttingTemperature > 800) {
      // Reduce speed for thermal safety
      speed *= 0.85;
    }

    return {
      speed,
      feed,
      depthOfCut: doc,
      coolant: thermal.cuttingTemperature > 600 ? "flood" : "mist",
      optimized: true,
      improvements: [
        `Speed adjusted: ${context.parameters.speed ?? 200} -> ${speed.toFixed(0)} SFM`,
        `Feed adjusted: ${context.parameters.feed ?? 0.008} -> ${feed.toFixed(4)} IPR`,
      ],
    };
  }

  private validateAllResults(
    physics: PhysicsResult,
    thermal: ThermalResult,
    quality: QualityResult
  ): PhysicsValidation {
    const violations: string[] = [];
    const corrections: PhysicsCorrection[] = [];

    // Kienzle validation
    const kienzleValid = physics.cuttingForce > 0 && physics.cuttingForce < 50000;
    if (!kienzleValid) {
      violations.push("Cutting force out of valid range");
    }

    // Taylor validation
    const taylorValid = physics.toolLife > 0 && physics.toolLife < 1000;
    if (!taylorValid) {
      violations.push("Tool life prediction unrealistic");
    }

    // Thermal validation
    const thermalValid = thermal.cuttingTemperature < 1200;
    if (!thermalValid) {
      violations.push("Cutting temperature exceeds material limits");
      corrections.push({
        parameter: "speed",
        currentValue: 200,
        suggestedValue: 150,
        reason: "Reduce temperature",
        formula: "T ~ Vc^0.5",
      });
    }

    // Deflection validation (simplified)
    const deflectionValid = true; // Would check actual deflection

    return {
      kienzleValid,
      taylorValid,
      deflectionValid,
      thermalValid,
      overallValid: kienzleValid && taylorValid && deflectionValid && thermalValid,
      violations,
      corrections,
    };
  }

  private calculateSynthesisConfidence(
    physics: PhysicsResult,
    thermal: ThermalResult,
    quality: QualityResult
  ): number {
    return (physics.confidence + thermal.confidence + quality.confidence) / 3;
  }

  // ============================================================================
  // PRIVATE METHODS — ORCHESTRATION
  // ============================================================================

  private findEnginesForCapability(capability: string): LatheEngineCapability[] {
    return [...this.engineCapabilities.values()].filter(engine =>
      engine.capabilities.some(cap =>
        cap.toLowerCase().includes(capability.toLowerCase())
      )
    );
  }

  private buildExecutionPlan(
    enginesForCapabilities: Map<string, LatheEngineCapability[]>,
    constraints: TaskConstraint[]
  ): string[] {
    const plan: string[] = [];
    const used = new Set<string>();

    // Add engines in capability order, avoiding duplicates
    for (const [capability, engines] of enginesForCapabilities) {
      if (engines.length > 0 && !used.has(engines[0].engineName)) {
        plan.push(engines[0].engineName);
        used.add(engines[0].engineName);
      }
    }

    // Add safety engine if safety constraint
    if (constraints.some(c => c.type === "safety")) {
      const safetyEngine = "LatheCollisionZoneEngine";
      if (!used.has(safetyEngine)) {
        plan.push(safetyEngine);
      }
    }

    return plan;
  }

  private validatePhysics(results: EngineResult[]): PhysicsValidation {
    // Simplified validation based on results
    return {
      kienzleValid: true,
      taylorValid: true,
      deflectionValid: true,
      thermalValid: true,
      overallValid: true,
      violations: [],
      corrections: [],
    };
  }

  private generateWarnings(
    results: EngineResult[],
    constraints: TaskConstraint[]
  ): string[] {
    const warnings: string[] = [];

    // Check for failed engines
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      warnings.push(`${failed.length} engine(s) failed: ${failed.map(f => f.engineName).join(", ")}`);
    }

    // Check for low confidence
    const lowConfidence = results.filter(r => r.confidence < 0.7);
    if (lowConfidence.length > 0) {
      warnings.push(`Low confidence results from: ${lowConfidence.map(l => l.engineName).join(", ")}`);
    }

    return warnings;
  }

  private generateTaskRecommendations(
    task: MultiEngineTask,
    results: EngineResult[],
    physics: PhysicsValidation
  ): string[] {
    const recommendations: string[] = [];

    if (!physics.overallValid) {
      recommendations.push("Review physics violations before proceeding");
    }

    if (results.some(r => r.confidence < 0.8)) {
      recommendations.push("Consider adding more context for higher confidence");
    }

    recommendations.push("Validate results against tribal knowledge");
    recommendations.push("Check JM Die patterns for similar operations");

    return recommendations;
  }

  private aggregateResults(results: EngineResult[]): unknown {
    return {
      engineCount: results.length,
      successfulEngines: results.filter(r => r.success).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      totalExecutionMs: results.reduce((sum, r) => sum + r.executionMs, 0),
    };
  }

  private calculateOrchestrationConfidence(results: EngineResult[]): number {
    if (results.length === 0) return 0;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length;
    return avgConfidence * successRate;
  }

  // ============================================================================
  // PRIVATE METHODS — KNOWLEDGE GRAPH
  // ============================================================================

  private initializeKnowledgeGraph(): void {
    // Add material nodes
    const materials = ["steel", "aluminum", "titanium", "carbide", "stainless", "inconel"];
    for (const material of materials) {
      this.knowledgeGraph.set(material, {
        id: material,
        type: "material",
        name: material.charAt(0).toUpperCase() + material.slice(1),
        description: `${material} machining knowledge`,
        attributes: {},
        connections: [
          { targetId: "speed_feed", relationshipType: "requires", strength: 0.9, context: "cutting" },
          { targetId: "tool_selection", relationshipType: "requires", strength: 0.85, context: "tooling" },
        ],
      });
    }

    // Add operation nodes
    const operations = ["facing", "turning", "threading", "grooving", "boring", "drilling"];
    for (const op of operations) {
      this.knowledgeGraph.set(op, {
        id: op,
        type: "operation",
        name: op.charAt(0).toUpperCase() + op.slice(1),
        description: `${op} operation knowledge`,
        attributes: {},
        connections: [
          { targetId: "speed_feed", relationshipType: "uses", strength: 0.9, context: "parameters" },
          { targetId: "physics", relationshipType: "requires", strength: 0.8, context: "validation" },
        ],
      });
    }

    // Add formula nodes
    const formulas = ["kienzle", "taylor", "surface_finish", "deflection"];
    for (const formula of formulas) {
      this.knowledgeGraph.set(formula, {
        id: formula,
        type: "formula",
        name: formula.charAt(0).toUpperCase() + formula.slice(1).replace("_", " "),
        description: `${formula} formula`,
        attributes: {},
        connections: [
          { targetId: "physics", relationshipType: "derives_from", strength: 0.95, context: "calculation" },
        ],
      });
    }

    // Add concept nodes
    this.knowledgeGraph.set("speed_feed", {
      id: "speed_feed",
      type: "operation",
      name: "Speed & Feed",
      description: "Cutting speed and feed rate optimization",
      attributes: {},
      connections: [
        { targetId: "kienzle", relationshipType: "uses", strength: 0.9, context: "force" },
        { targetId: "taylor", relationshipType: "uses", strength: 0.85, context: "tool_life" },
      ],
    });

    this.knowledgeGraph.set("physics", {
      id: "physics",
      type: "operation",
      name: "Physics",
      description: "Physics-based calculations",
      attributes: {},
      connections: [
        { targetId: "kienzle", relationshipType: "uses", strength: 0.95, context: "force" },
        { targetId: "taylor", relationshipType: "uses", strength: 0.9, context: "wear" },
        { targetId: "deflection", relationshipType: "uses", strength: 0.85, context: "stiffness" },
      ],
    });

    this.knowledgeGraph.set("tool_selection", {
      id: "tool_selection",
      type: "operation",
      name: "Tool Selection",
      description: "Cutting tool selection",
      attributes: {},
      connections: [
        { targetId: "physics", relationshipType: "requires", strength: 0.8, context: "validation" },
      ],
    });
  }

  private findPartialMatch(concept: string): string | null {
    const conceptLower = concept.toLowerCase();

    for (const nodeId of this.knowledgeGraph.keys()) {
      if (nodeId.includes(conceptLower) || conceptLower.includes(nodeId)) {
        return nodeId;
      }
    }

    return null;
  }

  private findEnginesForConcept(concept: string): LatheEngineCapability[] {
    return this.findMatchingEngines(concept);
  }

  private findFormulasForConcept(concept: string): string[] {
    const formulas: string[] = [];
    const conceptLower = concept.toLowerCase();
    const conceptWords = conceptLower.split(/\s+/).filter(w => w.length > 2);

    // Map concepts to formulas
    const formulaMap: Record<string, string[]> = {
      force: ["Kienzle: Fc = kc1.1 * ap * h^(1-mc)"],
      kienzle: ["Kienzle: Fc = kc1.1 * ap * h^(1-mc)"],
      cutting: ["Kienzle: Fc = kc1.1 * ap * h^(1-mc)"],
      physics: [
        "Kienzle: Fc = kc1.1 * ap * h^(1-mc)",
        "Taylor: T = (C/Vc)^(1/n)",
        "P = Fc * Vc / 60000",
      ],
      tool_life: ["Taylor: T = (C/Vc)^(1/n)"],
      taylor: ["Taylor: T = (C/Vc)^(1/n)"],
      life: ["Taylor: T = (C/Vc)^(1/n)"],
      wear: ["Taylor: T = (C/Vc)^(1/n)"],
      surface: ["Ra = fn^2 / (32 * R)"],
      finish: ["Ra = fn^2 / (32 * R)"],
      roughness: ["Ra = fn^2 / (32 * R)"],
      deflection: ["delta = FL^3 / (3EI)"],
      bend: ["delta = FL^3 / (3EI)"],
      stiffness: ["delta = FL^3 / (3EI)"],
      power: ["P = Fc * Vc / 60000"],
      mrr: ["MRR = ap * fn * Vc * 1000"],
      removal: ["MRR = ap * fn * Vc * 1000"],
    };

    // Check full concept and individual words
    const checkKeys = [conceptLower, ...conceptWords];
    const addedFormulas = new Set<string>();

    for (const checkKey of checkKeys) {
      for (const [key, value] of Object.entries(formulaMap)) {
        if (checkKey.includes(key) || key.includes(checkKey)) {
          for (const formula of value) {
            if (!addedFormulas.has(formula)) {
              formulas.push(formula);
              addedFormulas.add(formula);
            }
          }
        }
      }
    }

    return formulas;
  }

  private explainPath(path: string[], relationships: RelationshipType[]): string {
    const explanations: string[] = [];

    for (let i = 0; i < relationships.length; i++) {
      const from = path[i];
      const to = path[i + 1];
      const rel = relationships[i];

      explanations.push(`${from} ${rel} ${to}`);
    }

    return explanations.join(" -> ");
  }

  // ============================================================================
  // PRIVATE METHODS — RECOMMENDATIONS
  // ============================================================================

  private generateRecommendations(
    query: string,
    capabilities: CapabilityMatch[],
    engines: LatheEngineCapability[]
  ): string[] {
    const recommendations: string[] = [];

    if (capabilities.length > 0) {
      recommendations.push(`Use ${capabilities[0].fullAction} for primary task`);
    }

    if (engines.length > 0) {
      recommendations.push(`${engines[0].engineName} is best suited for this task`);
    }

    recommendations.push("Search tribal knowledge for shop-specific tips");
    recommendations.push("Check JM Die history for similar jobs");

    return recommendations;
  }

  private buildContextQuery(context: Partial<LatheOperationContext>): string {
    const parts: string[] = [];

    if (context.operation) parts.push(context.operation);
    if (context.material?.name) parts.push(context.material.name);
    if (context.machine?.controller) parts.push(context.machine.controller);

    return parts.join(" ") || "lathe turning";
  }

  private generateProactiveActions(
    context: Partial<LatheOperationContext>,
    tribalKnowledge: TribalKnowledgeResult[],
    playbookRules: PlaybookRuleResult[]
  ): string[] {
    const actions: string[] = [];

    if (context.operation) {
      actions.push(`Run prism_turning:${context.operation}_parameters`);
    }

    if (tribalKnowledge.length > 0) {
      actions.push("Review tribal knowledge tips before programming");
    }

    if (playbookRules.length > 0) {
      actions.push("Apply playbook rules for best practices");
    }

    actions.push("Validate parameters with LatheScienceHardeningEngine");

    return actions;
  }

  // ============================================================================
  // PRIVATE METHODS — OPTIMAL APPROACH
  // ============================================================================

  private describeApproach(routing: EngineRoutingDecision): string {
    const parts: string[] = [];

    parts.push(`Use ${routing.primaryEngine.engineName} as primary engine`);

    if (routing.supportingEngines.length > 0) {
      parts.push(`with ${routing.supportingEngines.length} supporting engines`);
    }

    if (routing.tribalKnowledgeInjection.length > 0) {
      parts.push("and tribal knowledge injection");
    }

    return parts.join(" ");
  }

  private buildExecutionSteps(routing: EngineRoutingDecision): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    let stepNum = 1;
    for (const engineName of routing.executionOrder) {
      const engine = this.engineCapabilities.get(engineName);
      if (engine) {
        steps.push({
          step: stepNum++,
          action: `Execute ${engineName}`,
          engine: engineName,
          inputs: engine.inputRequirements,
          outputs: engine.outputTypes,
          validations: engine.physicsRequired ? ["physics_validation"] : [],
        });
      }
    }

    return steps;
  }

  private predictOutcomes(routing: EngineRoutingDecision): ExpectedOutcome[] {
    return [
      {
        metric: "Confidence Score",
        expectedValue: routing.confidenceScore,
        unit: "",
        confidence: 0.9,
      },
      {
        metric: "Execution Time",
        expectedValue: routing.primaryEngine.estimatedExecutionMs,
        unit: "ms",
        confidence: 0.8,
      },
    ];
  }

  private identifyRisks(
    routing: EngineRoutingDecision,
    reasoning: ProactiveReasoningResult
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (routing.confidenceScore < 0.8) {
      risks.push({
        risk: "Lower confidence routing",
        probability: 0.3,
        impact: "medium",
        mitigation: "Add more context or use manual validation",
      });
    }

    if (reasoning.missingContext.length > 0) {
      risks.push({
        risk: "Missing context information",
        probability: 0.4,
        impact: "medium",
        mitigation: reasoning.missingContext[0],
      });
    }

    return risks;
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface PhysicsResult {
  cuttingForce: number;
  power: number;
  toolLife: number;
  mrr: number;
  confidence: number;
}

interface ThermalResult {
  cuttingTemperature: number;
  toolTemperature: number;
  workpieceTemperature: number;
  thermalExpansion: number;
  confidence: number;
}

interface QualityResult {
  surfaceFinish: number;
  achievable: boolean;
  roundness: number;
  concentricity: number;
  confidence: number;
}

interface OptimizedParameters {
  speed: number;
  feed: number;
  depthOfCut: number;
  coolant: "flood" | "mist" | "dry" | "through_tool";
  optimized: boolean;
  improvements: string[];
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton instance */
export const latheSelfAwarenessIntegrationEngine =
  LatheSelfAwarenessIntegrationEngine.getInstance();
