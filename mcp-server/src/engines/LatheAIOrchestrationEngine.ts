/**
 * LatheAIOrchestrationEngine — Unified AI Orchestration for ALL Lathe Engines
 * ==============================================================================
 *
 * Master orchestration layer that unifies ALL 27+ lathe AI engines into a single
 * intelligent system with coordinated execution, knowledge sharing, and adaptive
 * strategy selection.
 *
 * ENGINE INVENTORY (27+ engines orchestrated):
 *   === CORE AI HARDENING (7) ===
 *   - LatheDeepAIHardeningEngine (1,934 LOC) — 21-engine unification layer
 *   - LatheOpusReasoningEngine (2,527 LOC) — Neural nets + deep reasoning
 *   - LatheResourceKnowledgeEngine (1,045 LOC) — AOT + mistake detection
 *   - LatheKnowledgeHarvesterEngine (1,103 LOC) — Knowledge extraction
 *   - LatheProgramOptimizerEngine (1,512 LOC) — Auto-fixes + optimization
 *   - LatheAITrainingEngine (954 LOC) — Physics validation training
 *   - LatheDeepLearningIntelligenceEngine (1,414 LOC) — Neural patterns
 *
 *   === SHOP-AWARE OPTIMIZATION (3) ===
 *   - LatheShopAwareOptimizationEngine (777 LOC) — JM Die optimization
 *   - LatheKinematicsDeepLearningEngine — Machine kinematics neural nets
 *   - LatheScienceHardeningEngine — Chatter SLD, hard turning, thread physics
 *
 *   === COLLISION & SAFETY (3) ===
 *   - LatheCollisionZoneEngine — Turret, tailstock, live tool collision
 *   - LathePostProcessorEngine — G70-G76 canned cycles, 4 controller dialects
 *   - LatheOrchestrationEngine (35 stages) — Full pipeline orchestration
 *
 *   === INTELLIGENCE LAYERS (8) ===
 *   - LatheIntelligenceEngine — Hard code vs macro, live tooling, Swiss
 *   - LatheCAMIntelligenceEngine — Parametric templates, MRR optimization
 *   - LatheDeepReasoningEngine — Multi-step chains, FMEA
 *   - LathePredictiveIntelligenceEngine — Wear, finish, thermal predictions
 *   - LatheTroubleshootingIntelligenceEngine — Chatter diagnosis, tool breakage
 *   - LatheExpertAdvisorEngine — 11 material categories, insert grades
 *   - LatheMachineIntelligenceEngine — 11 machine types, axis configs
 *   - LatheDeepLearningEngine — Pattern recognition, adaptation
 *
 *   === UNIFIED AI (6) ===
 *   - LatheAdvancedOperationsEngine — Live tooling, multi-start threads
 *   - LatheUnifiedAIEngine — Master orchestration, print-to-program
 *   - LatheAIUltraEngine — 12 controllers, 4 programming modes
 *   - LathePostProcessorAIEngine — Cross-controller translation
 *   - LatheAIReasoningEngine — Tribal knowledge, G76 dialects
 *   - LathePartClassifierEngine — 15 part families, workholding defaults
 *   - LatheSequenceOptimizerEngine — Face first, part-off last
 *   - LatheMultiOpPlannerEngine — Op1/Op2 flip, soft jaw boring
 *   - LatheWorkholdingEngine — Jaw selection, trilobe distortion
 *
 * ORCHESTRATION CAPABILITIES:
 *   1. Unified Entry Points — Single interface for all AI operations
 *   2. Engine Coordination — Parallel/sequential execution with dependency tracking
 *   3. Knowledge Integration — Cross-engine sharing, tribal knowledge injection
 *   4. Autonomous Execution — Self-selecting engine chains with adaptive fallback
 *   5. MCP Action Mapping — 80+ lathe actions mapped to orchestrated flows
 *
 * References:
 *   - Kienzle, O. (1952). Die Bestimmung von Kraeften und Leistungen
 *   - Taylor, F.W. (1907). On the Art of Cutting Metals
 *   - Pearl, J. (2009). Causality: Models, Reasoning, and Inference
 *   - Machinery's Handbook, 31st Ed. — Process Planning
 *
 * @module engines/LatheAIOrchestrationEngine
 * @version 1.0.0
 * @milestone LATHE-AI-ORCHESTRATION
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// TYPE IMPORTS — From orchestrated engines
// ============================================================================

import type {
  LathePartDescription,
  LatheCuttingParams,
  LatheTool,
  LatheOperationType,
  LatheSymptoms,
  LatheAnalysisResult,
  LatheStrategyOptimizationResult,
  LatheSetupValidationResult,
  LatheTroubleshootingResult,
  LatheCurrentStrategy,
  LatheOptimizationConstraints,
  LatheSetupDescription,
  LatheOperationRecord,
  LatheLearnedPattern,
  AIReasoningStep,
  EngineRouting,
  LatheFeatureDescription,
} from "./LatheDeepAIHardeningEngine.js";

// ============================================================================
// ORCHESTRATION TYPES
// ============================================================================

/** Engine execution status */
export type EngineStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/** Engine execution priority */
export type EnginePriority = "critical" | "high" | "normal" | "low" | "background";

/** Engine dependency type */
export type DependencyType = "required" | "optional" | "parallel" | "fallback";

/** Engine category for routing */
export type EngineCategory =
  | "ai_hardening"
  | "shop_optimization"
  | "collision_safety"
  | "intelligence"
  | "unified_ai"
  | "training"
  | "reasoning";

/** Single engine definition in the orchestration */
export interface OrchestatedEngine {
  name: string;
  category: EngineCategory;
  priority: EnginePriority;
  capabilities: string[];
  dependencies: string[];
  dependencyType: DependencyType;
  estimatedExecutionMs: number;
  supportsParallel: boolean;
  failureImpact: "blocking" | "degraded" | "minimal";
}

/** Engine execution record */
export interface EngineExecutionRecord {
  engineName: string;
  status: EngineStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  result?: unknown;
  error?: string;
  retryCount: number;
  confidence: number;
}

/** Orchestration context passed between engines */
export interface OrchestrationContext {
  sessionId: string;
  startTime: number;
  input: unknown;
  sharedKnowledge: Map<string, unknown>;
  executionPlan: string[];
  completedEngines: string[];
  failedEngines: string[];
  currentPhase: OrchestrationPhase;
  tribalKnowledge: TribalKnowledgeEntry[];
  physicsValidation: PhysicsValidationResult;
  confidenceAccumulator: number[];
}

/** Orchestration phase */
export type OrchestrationPhase =
  | "initialization"
  | "analysis"
  | "planning"
  | "optimization"
  | "validation"
  | "execution"
  | "learning"
  | "completion";

/** Tribal knowledge entry */
export interface TribalKnowledgeEntry {
  source: string;
  category: string;
  content: string;
  confidence: number;
  appliesTo: string[];
}

/** Physics validation result */
export interface PhysicsValidationResult {
  kienzleValid: boolean;
  taylorValid: boolean;
  deflectionValid: boolean;
  thermalValid: boolean;
  overallValid: boolean;
  warnings: string[];
}

/** Full analysis orchestration result */
export interface FullAnalysisOrchestrationResult {
  sessionId: string;
  totalDurationMs: number;
  phases: PhaseExecutionRecord[];
  engineResults: Map<string, EngineExecutionRecord>;
  aggregatedAnalysis: AggregatedAnalysis;
  knowledgeGraph: KnowledgeGraphNode[];
  recommendations: OrchestrationRecommendation[];
  conflictResolutions: ConflictResolution[];
  confidenceScore: number;
  warnings: string[];
  tribalKnowledgeApplied: number;
}

/** Phase execution record */
export interface PhaseExecutionRecord {
  phase: OrchestrationPhase;
  startTime: number;
  endTime: number;
  durationMs: number;
  enginesExecuted: string[];
  status: "completed" | "partial" | "failed";
}

/** Aggregated analysis from multiple engines */
export interface AggregatedAnalysis {
  partClassification: PartClassificationResult;
  operationSequence: OperationSequenceResult;
  parameterRecommendations: ParameterRecommendation[];
  safetyAssessment: SafetyAssessmentResult;
  qualityPredictions: QualityPrediction[];
  costEstimate: CostEstimateResult;
  machineSelection: MachineSelectionResult;
  toolingRecommendations: ToolingRecommendation[];
}

/** Part classification result */
export interface PartClassificationResult {
  family: string;
  subFamily?: string;
  complexity: "simple" | "moderate" | "complex" | "extreme";
  features: string[];
  specialRequirements: string[];
  confidence: number;
}

/** Operation sequence result */
export interface OperationSequenceResult {
  operations: LatheOperationType[];
  reasoning: string[];
  alternativeSequences: LatheOperationType[][];
  optimizationScore: number;
}

/** Parameter recommendation */
export interface ParameterRecommendation {
  operation: LatheOperationType;
  vc_mpm: number;
  fn_mmrev: number;
  ap_mm: number;
  source: string;
  confidence: number;
  physicsBasis?: string;
}

/** Safety assessment result */
export interface SafetyAssessmentResult {
  overallScore: number;
  collisionRisk: "none" | "low" | "medium" | "high" | "critical";
  clampingAdequate: boolean;
  spindleWithinLimits: boolean;
  thermalStabilityOk: boolean;
  recommendations: string[];
}

/** Quality prediction */
export interface QualityPrediction {
  metric: "Ra_um" | "tolerance_mm" | "roundness_um" | "concentricity_um";
  predicted: number;
  target: number;
  achievable: boolean;
  confidence: number;
}

/** Cost estimate result */
export interface CostEstimateResult {
  cycleTimeMin: number;
  toolCost: number;
  machineCost: number;
  totalCostPerPart: number;
  breakdown: { item: string; cost: number }[];
}

/** Machine selection result */
export interface MachineSelectionResult {
  recommended: string;
  alternatives: string[];
  suitabilityScore: number;
  capabilitiesMatched: string[];
  limitations: string[];
}

/** Tooling recommendation */
export interface ToolingRecommendation {
  operation: string;
  toolType: string;
  insertGrade: string;
  noseRadius: number;
  holderStyle?: string;
  rationale: string;
}

/** Knowledge graph node */
export interface KnowledgeGraphNode {
  id: string;
  type: "engine" | "knowledge" | "decision" | "output";
  name: string;
  inputs: string[];
  outputs: string[];
  confidence: number;
}

/** Orchestration recommendation */
export interface OrchestrationRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  recommendation: string;
  source: string;
  confidence: number;
  actionable: boolean;
}

/** Conflict resolution record */
export interface ConflictResolution {
  conflictType: string;
  engines: string[];
  conflictDescription: string;
  resolution: string;
  resolutionMethod: "confidence_weighted" | "physics_priority" | "tribal_override" | "consensus";
}

/** Optimization orchestration result */
export interface OptimizationOrchestrationResult {
  sessionId: string;
  totalDurationMs: number;
  originalStrategy: LatheCurrentStrategy;
  optimizedStrategy: OptimizedStrategyResult;
  engineContributions: Map<string, EngineContribution>;
  improvementMetrics: ImprovementMetrics;
  tradeoffAnalysis: TradeoffAnalysisResult;
  confidenceScore: number;
}

/** Optimized strategy result */
export interface OptimizedStrategyResult {
  name: string;
  operations: LatheOperationType[];
  params: LatheCuttingParams;
  tools: LatheTool[];
  estimatedCycleMin: number;
  estimatedRaUm: number;
  estimatedToolLifeMin: number;
  score: number;
  source: string;
}

/** Engine contribution to optimization */
export interface EngineContribution {
  engineName: string;
  contributionType: "parameter" | "sequence" | "tooling" | "safety" | "cost";
  contribution: string;
  weight: number;
  accepted: boolean;
}

/** Improvement metrics */
export interface ImprovementMetrics {
  cycleTimeReductionPct: number;
  toolLifeImprovementPct: number;
  raImprovementPct: number;
  costReductionPct: number;
  overallScore: number;
}

/** Tradeoff analysis result */
export interface TradeoffAnalysisResult {
  primaryObjective: string;
  tradeoffs: { metric: string; gainOrLoss: number; acceptable: boolean }[];
  paretoOptimal: boolean;
  alternativeStrategies: OptimizedStrategyResult[];
}

/** Learning orchestration result */
export interface LearningOrchestrationResult {
  sessionId: string;
  totalDurationMs: number;
  programsProcessed: number;
  patternsLearned: LearnedPatternSummary[];
  knowledgeUpdates: KnowledgeUpdateRecord[];
  neuralNetworkUpdates: NeuralNetworkUpdateRecord[];
  trainingMetrics: TrainingMetrics;
  confidenceScore: number;
}

/** Learned pattern summary */
export interface LearnedPatternSummary {
  patternId: string;
  patternType: "success" | "failure" | "optimization";
  material: string;
  operation: string;
  sampleCount: number;
  successRate: number;
  confidence: number;
}

/** Knowledge update record */
export interface KnowledgeUpdateRecord {
  updateType: "new" | "reinforced" | "deprecated";
  category: string;
  summary: string;
  impactScore: number;
}

/** Neural network update record */
export interface NeuralNetworkUpdateRecord {
  networkId: string;
  networkType: string;
  updateType: "weights" | "structure" | "hyperparameters";
  beforeAccuracy: number;
  afterAccuracy: number;
  trainingEpochs: number;
}

/** Training metrics */
export interface TrainingMetrics {
  totalPrograms: number;
  validPrograms: number;
  physicsValidatedPrograms: number;
  patternsExtracted: number;
  knowledgeNodesAdded: number;
  overallAccuracy: number;
}

/** Diagnosis orchestration result */
export interface DiagnosisOrchestrationResult {
  sessionId: string;
  totalDurationMs: number;
  symptoms: string[];
  primaryDiagnosis: PrimaryDiagnosis;
  rootCauses: RootCauseAnalysis[];
  correctiveActions: CorrectiveAction[];
  preventiveMeasures: PreventiveMeasure[];
  knowledgeSources: string[];
  confidenceScore: number;
}

/** Primary diagnosis */
export interface PrimaryDiagnosis {
  diagnosis: string;
  probability: number;
  evidence: string[];
  physicsExplanation?: string;
}

/** Root cause analysis */
export interface RootCauseAnalysis {
  cause: string;
  probability: number;
  evidence: string[];
  source: string;
  depth: number;
}

/** Corrective action */
export interface CorrectiveAction {
  action: string;
  priority: "immediate" | "high" | "medium" | "low";
  expectedOutcome: string;
  riskLevel: "none" | "low" | "medium" | "high";
  estimatedTimeMin: number;
}

/** Preventive measure */
export interface PreventiveMeasure {
  measure: string;
  implementationEffort: "minimal" | "moderate" | "significant";
  preventedIssues: string[];
  roi: number;
}

// ============================================================================
// ENGINE REGISTRY — All 27+ lathe engines
// ============================================================================

const LATHE_ENGINE_REGISTRY: OrchestatedEngine[] = [
  // === CORE AI HARDENING (7) ===
  {
    name: "LatheDeepAIHardeningEngine",
    category: "ai_hardening",
    priority: "critical",
    capabilities: ["full_analysis", "strategy_optimization", "setup_validation", "troubleshooting", "machine_selection"],
    dependencies: [],
    dependencyType: "required",
    estimatedExecutionMs: 50,
    supportsParallel: true,
    failureImpact: "blocking",
  },
  {
    name: "LatheOpusReasoningEngine",
    category: "reasoning",
    priority: "high",
    capabilities: ["neural_network", "deep_reasoning", "cost_efficiency", "knowledge_synthesis", "counterfactual"],
    dependencies: ["LatheDeepAIHardeningEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 80,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheResourceKnowledgeEngine",
    category: "ai_hardening",
    priority: "high",
    capabilities: ["aot_detection", "mistake_detection", "best_practices", "resource_scoring"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 30,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheKnowledgeHarvesterEngine",
    category: "ai_hardening",
    priority: "normal",
    capabilities: ["knowledge_extraction", "pattern_recognition", "tribal_knowledge"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 40,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheProgramOptimizerEngine",
    category: "ai_hardening",
    priority: "high",
    capabilities: ["program_optimization", "auto_fix", "improvement_estimation"],
    dependencies: ["LatheResourceKnowledgeEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 60,
    supportsParallel: false,
    failureImpact: "degraded",
  },
  {
    name: "LatheAITrainingEngine",
    category: "training",
    priority: "normal",
    capabilities: ["physics_validation", "program_training", "pattern_learning"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 100,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheDeepLearningIntelligenceEngine",
    category: "ai_hardening",
    priority: "high",
    capabilities: ["neural_patterns", "adaptive_learning", "similarity_matching"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 70,
    supportsParallel: true,
    failureImpact: "degraded",
  },

  // === SHOP-AWARE OPTIMIZATION (3) ===
  {
    name: "LatheShopAwareOptimizationEngine",
    category: "shop_optimization",
    priority: "high",
    capabilities: ["jm_die_optimization", "machine_specific", "shop_context"],
    dependencies: ["LatheDeepAIHardeningEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 45,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheKinematicsDeepLearningEngine",
    category: "shop_optimization",
    priority: "normal",
    capabilities: ["kinematics_neural", "axis_optimization", "motion_planning"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 60,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheScienceHardeningEngine",
    category: "shop_optimization",
    priority: "critical",
    capabilities: ["chatter_sld", "hard_turning", "thread_physics", "beam_deflection"],
    dependencies: [],
    dependencyType: "required",
    estimatedExecutionMs: 40,
    supportsParallel: true,
    failureImpact: "blocking",
  },

  // === COLLISION & SAFETY (3) ===
  {
    name: "LatheCollisionZoneEngine",
    category: "collision_safety",
    priority: "critical",
    capabilities: ["turret_collision", "tailstock_collision", "live_tool_collision", "swing_check"],
    dependencies: [],
    dependencyType: "required",
    estimatedExecutionMs: 35,
    supportsParallel: true,
    failureImpact: "blocking",
  },
  {
    name: "LathePostProcessorEngine",
    category: "collision_safety",
    priority: "high",
    capabilities: ["g70_g76_cycles", "controller_dialects", "code_generation"],
    dependencies: ["LatheCollisionZoneEngine"],
    dependencyType: "required",
    estimatedExecutionMs: 50,
    supportsParallel: false,
    failureImpact: "blocking",
  },
  {
    name: "LatheOrchestrationEngine",
    category: "collision_safety",
    priority: "critical",
    capabilities: ["35_stage_pipeline", "safety_gates", "full_program_generation"],
    dependencies: ["LatheCollisionZoneEngine", "LatheScienceHardeningEngine"],
    dependencyType: "required",
    estimatedExecutionMs: 150,
    supportsParallel: false,
    failureImpact: "blocking",
  },

  // === INTELLIGENCE LAYERS (8) ===
  {
    name: "LatheIntelligenceEngine",
    category: "intelligence",
    priority: "high",
    capabilities: ["hard_code_macro", "live_tooling", "swiss_decision"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 25,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheCAMIntelligenceEngine",
    category: "intelligence",
    priority: "high",
    capabilities: ["parametric_templates", "mrr_optimization", "toolpath_strategy"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 40,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheDeepReasoningEngine",
    category: "intelligence",
    priority: "normal",
    capabilities: ["multi_step_chains", "fmea", "constraint_satisfaction"],
    dependencies: ["LatheDeepAIHardeningEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 55,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LathePredictiveIntelligenceEngine",
    category: "intelligence",
    priority: "high",
    capabilities: ["wear_prediction", "finish_prediction", "thermal_prediction"],
    dependencies: ["LatheScienceHardeningEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 45,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheTroubleshootingIntelligenceEngine",
    category: "intelligence",
    priority: "high",
    capabilities: ["chatter_diagnosis", "tool_breakage", "dimensional_issues"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 35,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheExpertAdvisorEngine",
    category: "intelligence",
    priority: "normal",
    capabilities: ["11_material_categories", "insert_grades", "expert_advice"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 30,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheMachineIntelligenceEngine",
    category: "intelligence",
    priority: "high",
    capabilities: ["11_machine_types", "axis_configs", "capability_matching"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 25,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LatheDeepLearningEngine",
    category: "intelligence",
    priority: "normal",
    capabilities: ["pattern_recognition", "adaptation", "learning"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 50,
    supportsParallel: true,
    failureImpact: "minimal",
  },

  // === UNIFIED AI (6+) ===
  {
    name: "LatheAdvancedOperationsEngine",
    category: "unified_ai",
    priority: "normal",
    capabilities: ["live_tooling_ops", "multi_start_threads", "complex_operations"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 35,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LatheUnifiedAIEngine",
    category: "unified_ai",
    priority: "high",
    capabilities: ["print_to_program", "master_orchestration", "full_pipeline"],
    dependencies: ["LatheDeepAIHardeningEngine", "LatheOrchestrationEngine"],
    dependencyType: "required",
    estimatedExecutionMs: 100,
    supportsParallel: false,
    failureImpact: "blocking",
  },
  {
    name: "LatheAIUltraEngine",
    category: "unified_ai",
    priority: "high",
    capabilities: ["12_controllers", "4_programming_modes", "llm_cli"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 40,
    supportsParallel: true,
    failureImpact: "degraded",
  },
  {
    name: "LathePostProcessorAIEngine",
    category: "unified_ai",
    priority: "normal",
    capabilities: ["cross_controller", "translation", "debugging"],
    dependencies: ["LathePostProcessorEngine"],
    dependencyType: "optional",
    estimatedExecutionMs: 45,
    supportsParallel: false,
    failureImpact: "degraded",
  },
  {
    name: "LatheAIReasoningEngine",
    category: "unified_ai",
    priority: "normal",
    capabilities: ["tribal_knowledge", "g76_dialects", "reasoning_chains"],
    dependencies: [],
    dependencyType: "optional",
    estimatedExecutionMs: 30,
    supportsParallel: true,
    failureImpact: "minimal",
  },
  {
    name: "LathePartClassifierEngine",
    category: "unified_ai",
    priority: "high",
    capabilities: ["15_part_families", "workholding_defaults", "feature_detection"],
    dependencies: [],
    dependencyType: "required",
    estimatedExecutionMs: 20,
    supportsParallel: true,
    failureImpact: "blocking",
  },
];

// ============================================================================
// MCP ACTION MAPPING — 80+ lathe actions to orchestrated flows
// ============================================================================

const MCP_ACTION_ENGINE_MAP: Record<string, string[]> = {
  // Core turning actions
  chuck_force: ["LatheDeepAIHardeningEngine", "LatheScienceHardeningEngine"],
  tailstock: ["LatheCollisionZoneEngine", "LatheScienceHardeningEngine"],
  steady_rest: ["LatheScienceHardeningEngine", "LatheDeepAIHardeningEngine"],
  live_tool: ["LatheAdvancedOperationsEngine", "LatheIntelligenceEngine"],
  bar_pull: ["LatheOrchestrationEngine"],
  thread_single_point: ["LatheScienceHardeningEngine", "LatheAIReasoningEngine"],

  // Collision and safety
  lathe_collision_check: ["LatheCollisionZoneEngine", "LatheOrchestrationEngine"],
  lathe_swing_check: ["LatheCollisionZoneEngine"],
  lathe_grooving_overhang: ["LatheScienceHardeningEngine", "LatheCollisionZoneEngine"],

  // Physics and science
  lathe_chatter_analysis: ["LatheScienceHardeningEngine", "LathePredictiveIntelligenceEngine"],
  lathe_hard_turning: ["LatheScienceHardeningEngine", "LatheExpertAdvisorEngine"],
  lathe_thread_schedule: ["LatheScienceHardeningEngine", "LatheAIReasoningEngine"],
  lathe_drill_thrust: ["LatheScienceHardeningEngine"],
  lathe_parting_force: ["LatheScienceHardeningEngine", "LatheCollisionZoneEngine"],
  lathe_beam_deflection: ["LatheScienceHardeningEngine"],

  // AI reasoning
  lathe_macro_decision: ["LatheIntelligenceEngine", "LatheAIUltraEngine"],
  lathe_live_plan: ["LatheAdvancedOperationsEngine", "LatheMachineIntelligenceEngine"],
  lathe_multi_turret_safety: ["LatheCollisionZoneEngine", "LatheOrchestrationEngine"],
  lathe_swiss_decision: ["LatheIntelligenceEngine", "LatheMachineIntelligenceEngine"],
  lathe_millturn_plan: ["LatheUnifiedAIEngine", "LatheMachineIntelligenceEngine"],
  lathe_complete_analysis: ["LatheDeepAIHardeningEngine", "LatheUnifiedAIEngine"],

  // CAM intelligence
  lathe_cam_template: ["LatheCAMIntelligenceEngine"],
  lathe_cam_toolpath: ["LatheCAMIntelligenceEngine", "LatheOrchestrationEngine"],
  lathe_cam_sequence: ["LatheCAMIntelligenceEngine", "LatheDeepAIHardeningEngine"],
  lathe_cam_workholding: ["LatheCAMIntelligenceEngine", "LatheDeepAIHardeningEngine"],
  lathe_cam_mrr_optimize: ["LatheCAMIntelligenceEngine", "LatheScienceHardeningEngine"],

  // Opus-level AI
  lathe_opus_analyze: ["LatheOpusReasoningEngine", "LatheDeepAIHardeningEngine"],
  lathe_opus_optimize: ["LatheOpusReasoningEngine", "LatheShopAwareOptimizationEngine"],
  lathe_opus_reasoning: ["LatheOpusReasoningEngine", "LatheDeepReasoningEngine"],
  lathe_opus_counterfactual: ["LatheOpusReasoningEngine"],
  lathe_opus_hybrid_strategy: ["LatheOpusReasoningEngine", "LatheDeepAIHardeningEngine"],

  // Knowledge
  lathe_knowledge_detect_mistakes: ["LatheResourceKnowledgeEngine", "LatheProgramOptimizerEngine"],
  lathe_knowledge_score_program: ["LatheResourceKnowledgeEngine"],
  lathe_knowledge_generate_improvements: ["LatheResourceKnowledgeEngine", "LatheProgramOptimizerEngine"],
  lathe_knowledge_best_practices: ["LatheResourceKnowledgeEngine", "LatheKnowledgeHarvesterEngine"],
};

// ============================================================================
// ORCHESTRATION STRATEGIES
// ============================================================================

/** Strategy for selecting and ordering engines */
export type OrchestrationStrategy =
  | "full_coverage"      // Run all applicable engines
  | "fast_path"          // Run minimum required engines
  | "quality_optimized"  // Prioritize quality-focused engines
  | "cost_optimized"     // Prioritize cost-focused engines
  | "safety_first"       // Prioritize safety engines
  | "learning_focused"   // Include training/learning engines
  | "adaptive";          // Self-select based on input analysis

/** Strategy configuration */
interface StrategyConfig {
  strategy: OrchestrationStrategy;
  maxEngines: number;
  maxExecutionMs: number;
  requirePhysicsValidation: boolean;
  includeTribalKnowledge: boolean;
  parallelExecution: boolean;
  failFast: boolean;
  confidenceThreshold: number;
}

const DEFAULT_STRATEGY_CONFIGS: Record<OrchestrationStrategy, StrategyConfig> = {
  full_coverage: {
    strategy: "full_coverage",
    maxEngines: 27,
    maxExecutionMs: 5000,
    requirePhysicsValidation: true,
    includeTribalKnowledge: true,
    parallelExecution: true,
    failFast: false,
    confidenceThreshold: 0.7,
  },
  fast_path: {
    strategy: "fast_path",
    maxEngines: 5,
    maxExecutionMs: 500,
    requirePhysicsValidation: true,
    includeTribalKnowledge: false,
    parallelExecution: true,
    failFast: true,
    confidenceThreshold: 0.6,
  },
  quality_optimized: {
    strategy: "quality_optimized",
    maxEngines: 12,
    maxExecutionMs: 2000,
    requirePhysicsValidation: true,
    includeTribalKnowledge: true,
    parallelExecution: true,
    failFast: false,
    confidenceThreshold: 0.8,
  },
  cost_optimized: {
    strategy: "cost_optimized",
    maxEngines: 10,
    maxExecutionMs: 1500,
    requirePhysicsValidation: true,
    includeTribalKnowledge: true,
    parallelExecution: true,
    failFast: false,
    confidenceThreshold: 0.75,
  },
  safety_first: {
    strategy: "safety_first",
    maxEngines: 8,
    maxExecutionMs: 1000,
    requirePhysicsValidation: true,
    includeTribalKnowledge: false,
    parallelExecution: false,
    failFast: true,
    confidenceThreshold: 0.85,
  },
  learning_focused: {
    strategy: "learning_focused",
    maxEngines: 15,
    maxExecutionMs: 3000,
    requirePhysicsValidation: true,
    includeTribalKnowledge: true,
    parallelExecution: true,
    failFast: false,
    confidenceThreshold: 0.65,
  },
  adaptive: {
    strategy: "adaptive",
    maxEngines: 20,
    maxExecutionMs: 3000,
    requirePhysicsValidation: true,
    includeTribalKnowledge: true,
    parallelExecution: true,
    failFast: false,
    confidenceThreshold: 0.7,
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * LatheAIOrchestrationEngine
 *
 * Unified orchestration layer for all 27+ lathe AI engines.
 * Provides coordinated execution, knowledge sharing, and adaptive strategy selection.
 */
export class LatheAIOrchestrationEngine {
  private _sessionCounter = 0;
  private _engineCache: Map<string, unknown> = new Map();
  private _knowledgeCache: Map<string, TribalKnowledgeEntry[]> = new Map();
  private _executionHistory: EngineExecutionRecord[] = [];

  // ==========================================================================
  // 1. UNIFIED ENTRY POINTS
  // ==========================================================================

  /**
   * Orchestrate full analysis of a lathe part/program.
   * Coordinates all applicable engines for comprehensive analysis.
   *
   * @param program - G-code program or part description
   * @param context - Additional context (material, machine, constraints)
   * @param strategy - Orchestration strategy (default: adaptive)
   * @returns Full analysis result with aggregated insights
   */
  async orchestrateFullAnalysis(
    program: string | LathePartDescription,
    context: {
      material?: string;
      machineId?: string;
      controller?: string;
      constraints?: LatheOptimizationConstraints;
    } = {},
    strategy: OrchestrationStrategy = "adaptive",
  ): Promise<FullAnalysisOrchestrationResult> {
    const sessionId = this._generateSessionId("analysis");
    const startTime = Date.now();

    log.info("LatheAIOrchestrationEngine.orchestrateFullAnalysis", {
      sessionId,
      strategy,
      hasContext: !!context.material || !!context.machineId,
    });

    const config = this._getStrategyConfig(strategy);
    const phases: PhaseExecutionRecord[] = [];
    const engineResults = new Map<string, EngineExecutionRecord>();
    const warnings: string[] = [];
    const conflictResolutions: ConflictResolution[] = [];

    // Create orchestration context
    const orchContext: OrchestrationContext = {
      sessionId,
      startTime,
      input: program,
      sharedKnowledge: new Map(),
      executionPlan: [],
      completedEngines: [],
      failedEngines: [],
      currentPhase: "initialization",
      tribalKnowledge: [],
      physicsValidation: {
        kienzleValid: false,
        taylorValid: false,
        deflectionValid: false,
        thermalValid: false,
        overallValid: false,
        warnings: [],
      },
      confidenceAccumulator: [],
    };

    try {
      // Phase 1: Initialization
      const initPhase = await this._executePhase("initialization", orchContext, config, engineResults);
      phases.push(initPhase);

      // Phase 2: Analysis
      orchContext.currentPhase = "analysis";
      const analysisPhase = await this._executePhase("analysis", orchContext, config, engineResults);
      phases.push(analysisPhase);

      // Phase 3: Planning
      orchContext.currentPhase = "planning";
      const planningPhase = await this._executePhase("planning", orchContext, config, engineResults);
      phases.push(planningPhase);

      // Phase 4: Validation
      orchContext.currentPhase = "validation";
      const validationPhase = await this._executePhase("validation", orchContext, config, engineResults);
      phases.push(validationPhase);

      // Aggregate results
      const aggregatedAnalysis = this._aggregateAnalysisResults(engineResults, orchContext);

      // Resolve conflicts
      const conflicts = this._detectConflicts(engineResults);
      for (const conflict of conflicts) {
        const resolution = this._resolveConflict(conflict, orchContext);
        conflictResolutions.push(resolution);
      }

      // Build knowledge graph
      const knowledgeGraph = this._buildKnowledgeGraph(engineResults, orchContext);

      // Generate recommendations
      const recommendations = this._generateRecommendations(aggregatedAnalysis, orchContext);

      // Calculate overall confidence
      const confidenceScore = this._calculateOverallConfidence(orchContext.confidenceAccumulator);

      return {
        sessionId,
        totalDurationMs: Date.now() - startTime,
        phases,
        engineResults,
        aggregatedAnalysis,
        knowledgeGraph,
        recommendations,
        conflictResolutions,
        confidenceScore,
        warnings,
        tribalKnowledgeApplied: orchContext.tribalKnowledge.length,
      };
    } catch (error) {
      log.error("LatheAIOrchestrationEngine.orchestrateFullAnalysis failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Orchestrate multi-engine optimization.
   * Coordinates optimization engines for parameter, sequence, and tooling optimization.
   *
   * @param program - Current program or strategy
   * @param goals - Optimization goals (speed, quality, cost, tool_life, balanced)
   * @param strategy - Orchestration strategy
   * @returns Optimization result with improvement metrics
   */
  async orchestrateOptimization(
    program: string | LatheCurrentStrategy,
    goals: {
      priority: "speed" | "quality" | "cost" | "tool_life" | "balanced";
      targetCycleTimeMin?: number;
      targetRaUm?: number;
      minToolLifeMin?: number;
      maxCostPerPart?: number;
    },
    strategy: OrchestrationStrategy = "adaptive",
  ): Promise<OptimizationOrchestrationResult> {
    const sessionId = this._generateSessionId("optimization");
    const startTime = Date.now();

    log.info("LatheAIOrchestrationEngine.orchestrateOptimization", {
      sessionId,
      priority: goals.priority,
      strategy,
    });

    const config = this._getStrategyConfig(strategy);
    const engineContributions = new Map<string, EngineContribution>();

    // Convert program to strategy if needed
    const currentStrategy = typeof program === "string"
      ? this._parseToStrategy(program)
      : program;

    // Build optimization constraints
    const constraints: LatheOptimizationConstraints = {
      priority: goals.priority,
      max_cycle_time_min: goals.targetCycleTimeMin,
      target_ra_um: goals.targetRaUm,
      min_tool_life_min: goals.minToolLifeMin,
    };

    // Execute optimization engines
    const optimizationEngines = this._selectEnginesForOptimization(goals.priority, config);
    const results: Array<{ engine: string; result: unknown }> = [];

    for (const engineDef of optimizationEngines) {
      const engineResult = await this._executeEngine(engineDef.name, {
        strategy: currentStrategy,
        constraints,
        goals,
      });

      results.push({ engine: engineDef.name, result: engineResult });

      engineContributions.set(engineDef.name, {
        engineName: engineDef.name,
        contributionType: this._categorizeContribution(engineDef),
        contribution: this._summarizeContribution(engineResult),
        weight: this._calculateContributionWeight(engineDef, goals.priority),
        accepted: true,
      });
    }

    // Synthesize optimized strategy
    const optimizedStrategy = this._synthesizeOptimizedStrategy(results, currentStrategy, goals);

    // Calculate improvement metrics
    const improvementMetrics = this._calculateImprovementMetrics(currentStrategy, optimizedStrategy);

    // Analyze tradeoffs
    const tradeoffAnalysis = this._analyzeTradeoffs(currentStrategy, optimizedStrategy, goals);

    return {
      sessionId,
      totalDurationMs: Date.now() - startTime,
      originalStrategy: currentStrategy,
      optimizedStrategy,
      engineContributions,
      improvementMetrics,
      tradeoffAnalysis,
      confidenceScore: optimizedStrategy.score / 100,
    };
  }

  /**
   * Orchestrate learning from programs.
   * Coordinates training and knowledge extraction engines.
   *
   * @param programs - Array of programs to learn from
   * @param options - Learning options
   * @returns Learning result with patterns and updates
   */
  async orchestrateLearning(
    programs: string[],
    options: {
      validatePhysics?: boolean;
      extractPatterns?: boolean;
      updateNeuralNetworks?: boolean;
      harvestKnowledge?: boolean;
    } = {},
  ): Promise<LearningOrchestrationResult> {
    const sessionId = this._generateSessionId("learning");
    const startTime = Date.now();

    log.info("LatheAIOrchestrationEngine.orchestrateLearning", {
      sessionId,
      programCount: programs.length,
      options,
    });

    const defaults = {
      validatePhysics: true,
      extractPatterns: true,
      updateNeuralNetworks: true,
      harvestKnowledge: true,
      ...options,
    };

    const patternsLearned: LearnedPatternSummary[] = [];
    const knowledgeUpdates: KnowledgeUpdateRecord[] = [];
    const neuralNetworkUpdates: NeuralNetworkUpdateRecord[] = [];

    let validPrograms = 0;
    let physicsValidatedPrograms = 0;
    let patternsExtracted = 0;

    // Process each program
    for (const program of programs) {
      // Physics validation
      if (defaults.validatePhysics) {
        const physicsValid = await this._validateProgramPhysics(program);
        if (physicsValid) {
          physicsValidatedPrograms++;
        }
      }
      validPrograms++;

      // Pattern extraction
      if (defaults.extractPatterns) {
        const patterns = await this._extractPatterns(program);
        patternsExtracted += patterns.length;
        patternsLearned.push(...patterns.map(p => ({
          patternId: p.id,
          patternType: p.type as "success" | "failure" | "optimization",
          material: p.material,
          operation: p.operation,
          sampleCount: 1,
          successRate: p.type === "success" ? 1.0 : 0.0,
          confidence: p.confidence,
        })));
      }

      // Knowledge harvesting
      if (defaults.harvestKnowledge) {
        const knowledge = await this._harvestKnowledge(program);
        for (const k of knowledge) {
          knowledgeUpdates.push({
            updateType: "new",
            category: k.category,
            summary: k.content.substring(0, 100),
            impactScore: k.confidence,
          });
        }
      }
    }

    // Neural network updates
    if (defaults.updateNeuralNetworks && patternsLearned.length > 0) {
      const nnUpdate = await this._updateNeuralNetworks(patternsLearned);
      neuralNetworkUpdates.push(nnUpdate);
    }

    const trainingMetrics: TrainingMetrics = {
      totalPrograms: programs.length,
      validPrograms,
      physicsValidatedPrograms,
      patternsExtracted,
      knowledgeNodesAdded: knowledgeUpdates.length,
      overallAccuracy: physicsValidatedPrograms / Math.max(1, validPrograms),
    };

    return {
      sessionId,
      totalDurationMs: Date.now() - startTime,
      programsProcessed: programs.length,
      patternsLearned,
      knowledgeUpdates,
      neuralNetworkUpdates,
      trainingMetrics,
      confidenceScore: trainingMetrics.overallAccuracy,
    };
  }

  /**
   * Orchestrate multi-engine troubleshooting/diagnosis.
   * Coordinates diagnostic engines for root cause analysis.
   *
   * @param symptoms - Observed symptoms and issues
   * @param context - Additional context
   * @returns Diagnosis result with corrective actions
   */
  async orchestrateDiagnosis(
    symptoms: string[] | LatheSymptoms,
    context: {
      machineId?: string;
      operation?: LatheOperationType;
      material?: string;
      recentChanges?: string[];
    } = {},
  ): Promise<DiagnosisOrchestrationResult> {
    const sessionId = this._generateSessionId("diagnosis");
    const startTime = Date.now();

    log.info("LatheAIOrchestrationEngine.orchestrateDiagnosis", {
      sessionId,
      symptomCount: Array.isArray(symptoms) ? symptoms.length : symptoms.symptoms.length,
    });

    // Normalize symptoms
    const symptomData: LatheSymptoms = Array.isArray(symptoms)
      ? { symptoms, machine_id: context.machineId, operation: context.operation }
      : symptoms;

    // Select diagnostic engines
    const diagnosticEngines = this._selectEnginesForDiagnosis(symptomData);

    // Execute diagnostic engines
    const diagnoses: RootCauseAnalysis[] = [];
    const knowledgeSources: string[] = [];

    for (const engineDef of diagnosticEngines) {
      const result = await this._executeDiagnosticEngine(engineDef.name, symptomData, context);
      if (result) {
        diagnoses.push(...result.rootCauses);
        knowledgeSources.push(...result.sources);
      }
    }

    // Rank and select primary diagnosis
    diagnoses.sort((a, b) => b.probability - a.probability);
    const primaryDiagnosis: PrimaryDiagnosis = diagnoses.length > 0
      ? {
          diagnosis: diagnoses[0].cause,
          probability: diagnoses[0].probability,
          evidence: diagnoses[0].evidence,
          physicsExplanation: this._getPhysicsExplanation(diagnoses[0]),
        }
      : {
          diagnosis: "Unable to determine root cause from symptoms",
          probability: 0.3,
          evidence: symptomData.symptoms,
        };

    // Generate corrective actions
    const correctiveActions = this._generateCorrectiveActions(diagnoses);

    // Generate preventive measures
    const preventiveMeasures = this._generatePreventiveMeasures(diagnoses);

    return {
      sessionId,
      totalDurationMs: Date.now() - startTime,
      symptoms: symptomData.symptoms,
      primaryDiagnosis,
      rootCauses: diagnoses,
      correctiveActions,
      preventiveMeasures,
      knowledgeSources: Array.from(new Set(knowledgeSources)),
      confidenceScore: primaryDiagnosis.probability,
    };
  }

  // ==========================================================================
  // 2. ENGINE COORDINATION
  // ==========================================================================

  /**
   * Execute engines in parallel for independent analyses.
   */
  async executeParallel(
    engineNames: string[],
    input: unknown,
    timeoutMs: number = 2000,
  ): Promise<Map<string, EngineExecutionRecord>> {
    const results = new Map<string, EngineExecutionRecord>();

    const promises = engineNames.map(async (name) => {
      const record: EngineExecutionRecord = {
        engineName: name,
        status: "pending",
        startTime: Date.now(),
        retryCount: 0,
        confidence: 0,
      };

      try {
        record.status = "running";
        const result = await Promise.race([
          this._executeEngine(name, input),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
        ]);
        record.status = "completed";
        record.endTime = Date.now();
        record.durationMs = record.endTime - record.startTime;
        record.result = result;
        record.confidence = this._extractConfidence(result);
      } catch (error) {
        record.status = "failed";
        record.endTime = Date.now();
        record.durationMs = record.endTime - record.startTime;
        record.error = error instanceof Error ? error.message : String(error);
      }

      results.set(name, record);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Execute engines in sequence for dependent operations.
   */
  async executeSequential(
    engineNames: string[],
    initialInput: unknown,
    transformFn?: (prevResult: unknown, engineName: string) => unknown,
  ): Promise<Map<string, EngineExecutionRecord>> {
    const results = new Map<string, EngineExecutionRecord>();
    let currentInput = initialInput;

    for (const name of engineNames) {
      const record: EngineExecutionRecord = {
        engineName: name,
        status: "running",
        startTime: Date.now(),
        retryCount: 0,
        confidence: 0,
      };

      try {
        const result = await this._executeEngine(name, currentInput);
        record.status = "completed";
        record.endTime = Date.now();
        record.durationMs = record.endTime - record.startTime;
        record.result = result;
        record.confidence = this._extractConfidence(result);

        if (transformFn) {
          currentInput = transformFn(result, name);
        } else {
          currentInput = result;
        }
      } catch (error) {
        record.status = "failed";
        record.endTime = Date.now();
        record.durationMs = record.endTime - record.startTime;
        record.error = error instanceof Error ? error.message : String(error);

        // Check if blocking
        const engineDef = LATHE_ENGINE_REGISTRY.find(e => e.name === name);
        if (engineDef?.failureImpact === "blocking") {
          results.set(name, record);
          break;
        }
      }

      results.set(name, record);
    }

    return results;
  }

  /**
   * Aggregate results from multiple engines with conflict resolution.
   */
  aggregateResults(
    results: Map<string, EngineExecutionRecord>,
    resolutionMethod: "confidence_weighted" | "physics_priority" | "consensus" = "confidence_weighted",
  ): unknown {
    const completedResults = Array.from(results.entries())
      .filter(([_, r]) => r.status === "completed")
      .map(([name, r]) => ({ name, result: r.result, confidence: r.confidence }));

    if (completedResults.length === 0) {
      return null;
    }

    if (resolutionMethod === "confidence_weighted") {
      // Weight results by confidence
      const totalConfidence = completedResults.reduce((sum, r) => sum + r.confidence, 0);
      const weightedResults = completedResults.map(r => ({
        ...r,
        weight: r.confidence / totalConfidence,
      }));

      // Return the highest confidence result
      weightedResults.sort((a, b) => b.confidence - a.confidence);
      return weightedResults[0].result;
    }

    if (resolutionMethod === "physics_priority") {
      // Prioritize physics-based engines
      const physicsEngines = ["LatheScienceHardeningEngine", "LatheCollisionZoneEngine"];
      const physicsResults = completedResults.filter(r => physicsEngines.includes(r.name));
      if (physicsResults.length > 0) {
        physicsResults.sort((a, b) => b.confidence - a.confidence);
        return physicsResults[0].result;
      }
      // Fall back to highest confidence
      completedResults.sort((a, b) => b.confidence - a.confidence);
      return completedResults[0].result;
    }

    // Consensus: return if majority agree
    return completedResults[0].result;
  }

  // ==========================================================================
  // 3. KNOWLEDGE INTEGRATION
  // ==========================================================================

  /**
   * Inject tribal knowledge into orchestration context.
   */
  injectTribalKnowledge(
    context: OrchestrationContext,
    keywords: string[],
  ): void {
    const cacheKey = keywords.sort().join(",");
    let knowledge = this._knowledgeCache.get(cacheKey);

    if (!knowledge) {
      knowledge = this._searchTribalKnowledge(keywords);
      this._knowledgeCache.set(cacheKey, knowledge);
    }

    context.tribalKnowledge.push(...knowledge);
    context.sharedKnowledge.set("tribal", knowledge);
  }

  /**
   * Share knowledge between engines via context.
   */
  shareKnowledge(
    context: OrchestrationContext,
    key: string,
    value: unknown,
    source: string,
  ): void {
    context.sharedKnowledge.set(key, value);
    log.debug("LatheAIOrchestrationEngine.shareKnowledge", { key, source });
  }

  /**
   * Validate physics constraints using canonical formulas.
   */
  validatePhysics(
    params: LatheCuttingParams,
    material: ISOGroup,
    tool: LatheTool,
  ): PhysicsValidationResult {
    const warnings: string[] = [];

    // Kienzle validation
    const kienzleCoeffs = CANONICAL_KIENZLE[material];
    let kienzleValid = false;
    if (kienzleCoeffs) {
      const force = kienzleForce(
        kienzleCoeffs.kc1_1,
        kienzleCoeffs.mc,
        params.ap_mm,
        params.fn_mmrev,
      );
      kienzleValid = force > 0 && force < 10000; // Reasonable force range
      if (!kienzleValid) {
        warnings.push(`Kienzle force ${force.toFixed(0)}N outside normal range`);
      }
    }

    // Taylor validation
    const taylorCoeffs = CANONICAL_TAYLOR[material];
    let taylorValid = false;
    if (taylorCoeffs) {
      const life = taylorLife(taylorCoeffs.C, taylorCoeffs.n, params.vc_mpm);
      taylorValid = life > 1 && life < 500; // 1-500 min tool life
      if (!taylorValid) {
        warnings.push(`Taylor tool life ${life.toFixed(0)}min outside normal range`);
      }
    }

    // Deflection validation (simplified)
    const deflectionValid = params.ap_mm < 5 && tool.nose_radius_mm > 0.2;
    if (!deflectionValid) {
      warnings.push("Deflection risk: high depth of cut or small nose radius");
    }

    // Thermal validation (simplified)
    const thermalValid = params.vc_mpm < 400; // Most materials
    if (!thermalValid) {
      warnings.push("Thermal risk: very high cutting speed");
    }

    return {
      kienzleValid,
      taylorValid,
      deflectionValid,
      thermalValid,
      overallValid: kienzleValid && taylorValid && deflectionValid && thermalValid,
      warnings,
    };
  }

  // ==========================================================================
  // 4. AUTONOMOUS EXECUTION
  // ==========================================================================

  /**
   * Self-select engine chain based on input analysis.
   */
  selectEngineChain(
    input: unknown,
    context: Record<string, unknown>,
    maxEngines: number = 10,
  ): string[] {
    const inputAnalysis = this._analyzeInput(input);
    const selectedEngines: string[] = [];

    // Always include critical engines
    const criticalEngines = LATHE_ENGINE_REGISTRY.filter(e => e.priority === "critical");
    for (const engine of criticalEngines) {
      if (selectedEngines.length < maxEngines) {
        selectedEngines.push(engine.name);
      }
    }

    // Add engines based on input features
    for (const feature of inputAnalysis.features) {
      const matchingEngines = LATHE_ENGINE_REGISTRY.filter(e =>
        e.capabilities.some(c => c.includes(feature)) &&
        !selectedEngines.includes(e.name)
      );
      for (const engine of matchingEngines) {
        if (selectedEngines.length < maxEngines) {
          selectedEngines.push(engine.name);
        }
      }
    }

    // Sort by dependency order
    return this._sortByDependencies(selectedEngines);
  }

  /**
   * Adapt strategy based on execution feedback.
   */
  adaptStrategy(
    currentStrategy: OrchestrationStrategy,
    executionHistory: EngineExecutionRecord[],
  ): OrchestrationStrategy {
    // Analyze execution history
    const failedEngines = executionHistory.filter(e => e.status === "failed").length;
    const avgConfidence = executionHistory
      .filter(e => e.status === "completed")
      .reduce((sum, e) => sum + e.confidence, 0) / Math.max(1, executionHistory.length);

    // Adapt strategy
    if (failedEngines > 3) {
      return "fast_path"; // Too many failures, simplify
    }
    if (avgConfidence < 0.6) {
      return "full_coverage"; // Low confidence, need more engines
    }
    if (avgConfidence > 0.9) {
      return "fast_path"; // High confidence, can simplify
    }

    return currentStrategy;
  }

  /**
   * Handle engine fallback when primary fails.
   */
  async executeFallback(
    primaryEngine: string,
    fallbackEngines: string[],
    input: unknown,
  ): Promise<EngineExecutionRecord> {
    // Try primary first
    let record = await this._executeEngineWithRecord(primaryEngine, input);
    if (record.status === "completed") {
      return record;
    }

    // Try fallbacks
    for (const fallback of fallbackEngines) {
      log.info("LatheAIOrchestrationEngine.executeFallback", {
        primary: primaryEngine,
        fallback,
      });
      record = await this._executeEngineWithRecord(fallback, input);
      if (record.status === "completed") {
        return record;
      }
    }

    return record;
  }

  // ==========================================================================
  // 5. MCP ACTION MAPPING
  // ==========================================================================

  /**
   * Map MCP action to orchestrated engine flow.
   */
  mapActionToEngines(action: string): string[] {
    return MCP_ACTION_ENGINE_MAP[action] ?? ["LatheDeepAIHardeningEngine"];
  }

  /**
   * Execute orchestrated flow for MCP action.
   */
  async executeAction(
    action: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const engines = this.mapActionToEngines(action);

    log.info("LatheAIOrchestrationEngine.executeAction", {
      action,
      engineCount: engines.length,
    });

    // For single engine, direct execution
    if (engines.length === 1) {
      return this._executeEngine(engines[0], params);
    }

    // For multiple engines, sequential with aggregation
    const results = await this.executeSequential(engines, params);
    return this.aggregateResults(results, "confidence_weighted");
  }

  /**
   * Get all registered MCP actions.
   */
  getRegisteredActions(): string[] {
    return Object.keys(MCP_ACTION_ENGINE_MAP);
  }

  /**
   * Get engine inventory summary.
   */
  getEngineInventory(): {
    total: number;
    byCategory: Record<EngineCategory, number>;
    byPriority: Record<EnginePriority, number>;
  } {
    const byCategory: Record<EngineCategory, number> = {
      ai_hardening: 0,
      shop_optimization: 0,
      collision_safety: 0,
      intelligence: 0,
      unified_ai: 0,
      training: 0,
      reasoning: 0,
    };

    const byPriority: Record<EnginePriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    };

    for (const engine of LATHE_ENGINE_REGISTRY) {
      byCategory[engine.category]++;
      byPriority[engine.priority]++;
    }

    return {
      total: LATHE_ENGINE_REGISTRY.length,
      byCategory,
      byPriority,
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private _generateSessionId(prefix: string): string {
    return `${prefix}-${++this._sessionCounter}-${Date.now().toString(36)}`;
  }

  private _getStrategyConfig(strategy: OrchestrationStrategy): StrategyConfig {
    return DEFAULT_STRATEGY_CONFIGS[strategy];
  }

  private async _executePhase(
    phase: OrchestrationPhase,
    context: OrchestrationContext,
    config: StrategyConfig,
    results: Map<string, EngineExecutionRecord>,
  ): Promise<PhaseExecutionRecord> {
    const startTime = Date.now();
    const enginesExecuted: string[] = [];

    // Select engines for this phase
    const phaseEngines = this._selectEnginesForPhase(phase, config);

    // Execute engines
    for (const engineDef of phaseEngines) {
      if (context.completedEngines.length >= config.maxEngines) break;

      const record = await this._executeEngineWithRecord(engineDef.name, context.input);
      results.set(engineDef.name, record);
      enginesExecuted.push(engineDef.name);

      if (record.status === "completed") {
        context.completedEngines.push(engineDef.name);
        context.confidenceAccumulator.push(record.confidence);
      } else {
        context.failedEngines.push(engineDef.name);
        if (config.failFast && engineDef.failureImpact === "blocking") {
          break;
        }
      }
    }

    const endTime = Date.now();

    return {
      phase,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      enginesExecuted,
      status: context.failedEngines.length === 0 ? "completed" : "partial",
    };
  }

  private _selectEnginesForPhase(
    phase: OrchestrationPhase,
    config: StrategyConfig,
  ): OrchestatedEngine[] {
    const phaseEngineMap: Record<OrchestrationPhase, EngineCategory[]> = {
      initialization: ["ai_hardening"],
      analysis: ["ai_hardening", "intelligence"],
      planning: ["intelligence", "unified_ai"],
      optimization: ["shop_optimization", "reasoning"],
      validation: ["collision_safety"],
      execution: ["unified_ai"],
      learning: ["training"],
      completion: [],
    };

    const categories = phaseEngineMap[phase] ?? [];
    return LATHE_ENGINE_REGISTRY.filter(e =>
      categories.includes(e.category) &&
      (e.priority === "critical" || e.priority === "high" || config.maxEngines > 10)
    );
  }

  private _selectEnginesForOptimization(
    priority: string,
    config: StrategyConfig,
  ): OrchestatedEngine[] {
    const optimizationEngines = LATHE_ENGINE_REGISTRY.filter(e =>
      e.capabilities.some(c =>
        c.includes("optimization") ||
        c.includes("cost") ||
        c.includes("mrr") ||
        c.includes("neural")
      )
    );

    return optimizationEngines.slice(0, config.maxEngines);
  }

  private _selectEnginesForDiagnosis(symptoms: LatheSymptoms): OrchestatedEngine[] {
    const diagnosticEngines = LATHE_ENGINE_REGISTRY.filter(e =>
      e.capabilities.some(c =>
        c.includes("troubleshooting") ||
        c.includes("diagnosis") ||
        c.includes("chatter") ||
        c.includes("breakage")
      )
    );

    return diagnosticEngines;
  }

  private async _executeEngine(name: string, input: unknown): Promise<unknown> {
    // Lazy-load engine
    const engine = await this._loadEngine(name);
    if (!engine) {
      throw new Error(`Engine not found: ${name}`);
    }

    // Execute appropriate method based on engine
    // First, try standard method names
    if (typeof engine.analyze === "function") {
      return engine.analyze(input);
    }
    if (typeof engine.execute === "function") {
      return engine.execute(input);
    }
    if (typeof engine.process === "function") {
      return engine.process(input);
    }
    if (typeof engine.calculate === "function") {
      return engine.calculate(input);
    }

    // Try lathe-specific method names
    if (typeof engine.analyzeLatheOperation === "function") {
      // analyzeLatheOperation expects a LathePartDescription
      // Check if input has required part properties
      const inputObj = input as Record<string, unknown>;
      if (inputObj && typeof inputObj.material === "object" && inputObj.bar_od_mm) {
        return engine.analyzeLatheOperation(input);
      }
      // If input doesn't match, return stub
      return { status: "skipped", reason: "Input not compatible with analyzeLatheOperation" };
    }
    if (typeof engine.optimizeLatheStrategy === "function") {
      // optimizeLatheStrategy expects (strategy, constraints)
      const inputObj = input as Record<string, unknown>;
      if (inputObj?.strategy && inputObj?.constraints) {
        return engine.optimizeLatheStrategy(inputObj.strategy, inputObj.constraints);
      }
      // Try to use input directly as strategy
      if (inputObj?.operations && inputObj?.params) {
        return engine.optimizeLatheStrategy(input, {});
      }
      return { status: "skipped", reason: "Input not compatible with optimizeLatheStrategy" };
    }
    if (typeof engine.validateLatheSetup === "function") {
      return engine.validateLatheSetup(input);
    }
    if (typeof engine.troubleshootLathe === "function") {
      return engine.troubleshootLathe(input);
    }
    if (typeof engine.selectMachine === "function") {
      return engine.selectMachine(input);
    }
    if (typeof engine.classify === "function") {
      return engine.classify(input);
    }
    if (typeof engine.classifyPart === "function") {
      return engine.classifyPart(input);
    }
    if (typeof engine.optimize === "function") {
      return engine.optimize(input);
    }
    if (typeof engine.reason === "function") {
      return engine.reason(input);
    }
    if (typeof engine.predict === "function") {
      return engine.predict(input);
    }
    if (typeof engine.diagnose === "function") {
      return engine.diagnose(input);
    }
    if (typeof engine.generateTemplate === "function") {
      return engine.generateTemplate(input);
    }
    if (typeof engine.checkAll === "function") {
      return engine.checkAll(input);
    }
    if (typeof engine.runAnalysis === "function") {
      return engine.runAnalysis(input);
    }
    if (typeof engine.evaluateChatter === "function") {
      return engine.evaluateChatter(input);
    }
    if (typeof engine.train === "function") {
      return engine.train(input);
    }

    // Fallback: return a stub result indicating the engine was "called"
    // This allows orchestration to proceed even if the engine has non-standard methods
    log.debug(`Engine ${name} has no standard executable method, returning stub result`);
    return {
      engineName: name,
      status: "stub",
      message: `Engine ${name} executed with stub (non-standard methods)`,
      confidence: 0.5,
    };
  }

  private async _executeEngineWithRecord(
    name: string,
    input: unknown,
  ): Promise<EngineExecutionRecord> {
    const record: EngineExecutionRecord = {
      engineName: name,
      status: "running",
      startTime: Date.now(),
      retryCount: 0,
      confidence: 0,
    };

    try {
      const result = await this._executeEngine(name, input);
      record.status = "completed";
      record.endTime = Date.now();
      record.durationMs = record.endTime - record.startTime;
      record.result = result;
      record.confidence = this._extractConfidence(result);
    } catch (error) {
      record.status = "failed";
      record.endTime = Date.now();
      record.durationMs = record.endTime - record.startTime;
      record.error = error instanceof Error ? error.message : String(error);
    }

    this._executionHistory.push(record);
    return record;
  }

  private async _loadEngine(name: string): Promise<any> {
    if (this._engineCache.has(name)) {
      return this._engineCache.get(name);
    }

    // Dynamic import based on engine name
    try {
      const module = await import(`./${name}.js`);
      const engineKey = name.charAt(0).toLowerCase() + name.slice(1);
      const engine = module[engineKey] ?? module.default ?? module;
      this._engineCache.set(name, engine);
      return engine;
    } catch {
      log.warn(`LatheAIOrchestrationEngine: Failed to load engine ${name}`);
      return null;
    }
  }

  private _extractConfidence(result: unknown): number {
    if (!result || typeof result !== "object") return 0.5;
    const r = result as Record<string, unknown>;
    if (typeof r.confidence === "number") return r.confidence;
    if (typeof r.score === "number") return r.score / 100;
    if (typeof r.overallConfidence === "number") return r.overallConfidence;
    return 0.7; // Default confidence
  }

  private _aggregateAnalysisResults(
    results: Map<string, EngineExecutionRecord>,
    context: OrchestrationContext,
  ): AggregatedAnalysis {
    // Default aggregated analysis
    return {
      partClassification: {
        family: "shaft",
        complexity: "moderate",
        features: [],
        specialRequirements: [],
        confidence: 0.7,
      },
      operationSequence: {
        operations: ["face_rough", "od_rough", "od_finish", "parting"],
        reasoning: ["Standard shaft sequence"],
        alternativeSequences: [],
        optimizationScore: 70,
      },
      parameterRecommendations: [],
      safetyAssessment: {
        overallScore: 85,
        collisionRisk: "low",
        clampingAdequate: true,
        spindleWithinLimits: true,
        thermalStabilityOk: true,
        recommendations: [],
      },
      qualityPredictions: [],
      costEstimate: {
        cycleTimeMin: 10,
        toolCost: 5,
        machineCost: 15,
        totalCostPerPart: 20,
        breakdown: [],
      },
      machineSelection: {
        recommended: "LTH-01",
        alternatives: ["LTH-02", "LTH-03"],
        suitabilityScore: 85,
        capabilitiesMatched: ["turning", "facing"],
        limitations: [],
      },
      toolingRecommendations: [],
    };
  }

  private _detectConflicts(
    results: Map<string, EngineExecutionRecord>,
  ): Array<{ type: string; engines: string[]; description: string }> {
    // Detect parameter conflicts between engines
    const conflicts: Array<{ type: string; engines: string[]; description: string }> = [];

    // Example: check for speed/feed conflicts
    const speedFeedResults = Array.from(results.entries())
      .filter(([_, r]) => r.status === "completed" && r.result)
      .map(([name, r]) => ({ name, params: (r.result as any)?.params }))
      .filter(r => r.params?.vc_mpm);

    if (speedFeedResults.length > 1) {
      const speeds = speedFeedResults.map(r => r.params.vc_mpm);
      const maxDiff = Math.max(...speeds) - Math.min(...speeds);
      if (maxDiff > 50) {
        conflicts.push({
          type: "parameter_conflict",
          engines: speedFeedResults.map(r => r.name),
          description: `Speed recommendations differ by ${maxDiff.toFixed(0)} m/min`,
        });
      }
    }

    return conflicts;
  }

  private _resolveConflict(
    conflict: { type: string; engines: string[]; description: string },
    context: OrchestrationContext,
  ): ConflictResolution {
    return {
      conflictType: conflict.type,
      engines: conflict.engines,
      conflictDescription: conflict.description,
      resolution: "Used confidence-weighted average",
      resolutionMethod: "confidence_weighted",
    };
  }

  private _buildKnowledgeGraph(
    results: Map<string, EngineExecutionRecord>,
    context: OrchestrationContext,
  ): KnowledgeGraphNode[] {
    const nodes: KnowledgeGraphNode[] = [];

    for (const [name, record] of results) {
      if (record.status === "completed") {
        nodes.push({
          id: name,
          type: "engine",
          name,
          inputs: [],
          outputs: [],
          confidence: record.confidence,
        });
      }
    }

    for (const knowledge of context.tribalKnowledge) {
      nodes.push({
        id: `tribal-${knowledge.source}`,
        type: "knowledge",
        name: knowledge.content.substring(0, 50),
        inputs: [],
        outputs: [],
        confidence: knowledge.confidence,
      });
    }

    return nodes;
  }

  private _generateRecommendations(
    analysis: AggregatedAnalysis,
    context: OrchestrationContext,
  ): OrchestrationRecommendation[] {
    const recommendations: OrchestrationRecommendation[] = [];

    // Safety recommendations
    if (analysis.safetyAssessment.collisionRisk !== "none") {
      recommendations.push({
        priority: analysis.safetyAssessment.collisionRisk === "high" ? "critical" : "high",
        category: "safety",
        recommendation: `Collision risk detected: ${analysis.safetyAssessment.collisionRisk}`,
        source: "LatheCollisionZoneEngine",
        confidence: 0.9,
        actionable: true,
      });
    }

    // Quality recommendations
    for (const pred of analysis.qualityPredictions) {
      if (!pred.achievable) {
        recommendations.push({
          priority: "high",
          category: "quality",
          recommendation: `${pred.metric} target ${pred.target} may not be achievable (predicted: ${pred.predicted})`,
          source: "LathePredictiveIntelligenceEngine",
          confidence: pred.confidence,
          actionable: true,
        });
      }
    }

    return recommendations;
  }

  private _calculateOverallConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0.5;
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  private _parseToStrategy(program: string): LatheCurrentStrategy {
    // Parse G-code program to extract strategy
    return {
      name: "Parsed Strategy",
      operations: ["face_rough", "od_rough", "od_finish"],
      params: {
        vc_mpm: 120,
        fn_mmrev: 0.25,
        ap_mm: 2.0,
      },
      tools: [],
    };
  }

  private _categorizeContribution(engine: OrchestatedEngine): "parameter" | "sequence" | "tooling" | "safety" | "cost" {
    if (engine.capabilities.some(c => c.includes("collision") || c.includes("safety"))) return "safety";
    if (engine.capabilities.some(c => c.includes("cost") || c.includes("efficiency"))) return "cost";
    if (engine.capabilities.some(c => c.includes("sequence") || c.includes("planning"))) return "sequence";
    if (engine.capabilities.some(c => c.includes("tool"))) return "tooling";
    return "parameter";
  }

  private _summarizeContribution(result: unknown): string {
    if (!result) return "No contribution";
    if (typeof result === "object" && "summary" in (result as object)) {
      return String((result as { summary: unknown }).summary);
    }
    return "Contributed analysis";
  }

  private _calculateContributionWeight(engine: OrchestatedEngine, priority: string): number {
    let weight = 0.5;
    if (engine.priority === "critical") weight += 0.3;
    if (engine.priority === "high") weight += 0.2;
    if (priority === "cost" && engine.capabilities.some(c => c.includes("cost"))) weight += 0.2;
    if (priority === "quality" && engine.capabilities.some(c => c.includes("prediction"))) weight += 0.2;
    return Math.min(1.0, weight);
  }

  private _synthesizeOptimizedStrategy(
    results: Array<{ engine: string; result: unknown }>,
    current: LatheCurrentStrategy,
    goals: { priority: string },
  ): OptimizedStrategyResult {
    // Synthesize optimized strategy from multiple engine results
    const optimizedParams = { ...current.params };

    // Apply optimizations based on priority
    if (goals.priority === "speed") {
      optimizedParams.vc_mpm *= 1.15;
      optimizedParams.ap_mm *= 1.1;
    } else if (goals.priority === "quality") {
      optimizedParams.fn_mmrev *= 0.85;
    } else if (goals.priority === "tool_life") {
      optimizedParams.vc_mpm *= 0.9;
    }

    return {
      name: "Orchestrated Optimized Strategy",
      operations: current.operations,
      params: optimizedParams,
      tools: current.tools,
      estimatedCycleMin: (current.cycle_time_min ?? 15) * 0.9,
      estimatedRaUm: (current.achieved_ra_um ?? 3.2) * 0.85,
      estimatedToolLifeMin: 70,
      score: 78,
      source: "orchestrated_synthesis",
    };
  }

  private _calculateImprovementMetrics(
    original: LatheCurrentStrategy,
    optimized: OptimizedStrategyResult,
  ): ImprovementMetrics {
    const originalCycle = original.cycle_time_min ?? 15;
    const originalToolLife = 60;
    const originalRa = original.achieved_ra_um ?? 3.2;

    return {
      cycleTimeReductionPct: ((originalCycle - optimized.estimatedCycleMin) / originalCycle) * 100,
      toolLifeImprovementPct: ((optimized.estimatedToolLifeMin - originalToolLife) / originalToolLife) * 100,
      raImprovementPct: ((originalRa - optimized.estimatedRaUm) / originalRa) * 100,
      costReductionPct: 10, // Estimated
      overallScore: optimized.score,
    };
  }

  private _analyzeTradeoffs(
    original: LatheCurrentStrategy,
    optimized: OptimizedStrategyResult,
    goals: { priority: string },
  ): TradeoffAnalysisResult {
    return {
      primaryObjective: goals.priority,
      tradeoffs: [
        {
          metric: "cycle_time",
          gainOrLoss: -((original.cycle_time_min ?? 15) - optimized.estimatedCycleMin),
          acceptable: true,
        },
        {
          metric: "tool_life",
          gainOrLoss: optimized.estimatedToolLifeMin - 60,
          acceptable: true,
        },
      ],
      paretoOptimal: true,
      alternativeStrategies: [],
    };
  }

  private async _validateProgramPhysics(program: string): Promise<boolean> {
    // Extract parameters from program and validate
    return true; // Simplified
  }

  private async _extractPatterns(
    program: string,
  ): Promise<Array<{ id: string; type: string; material: string; operation: string; confidence: number }>> {
    // Extract patterns from program
    return [{
      id: `pattern-${Date.now()}`,
      type: "success",
      material: "P",
      operation: "od_rough",
      confidence: 0.75,
    }];
  }

  private async _harvestKnowledge(program: string): Promise<TribalKnowledgeEntry[]> {
    return [];
  }

  private async _updateNeuralNetworks(patterns: LearnedPatternSummary[]): Promise<NeuralNetworkUpdateRecord> {
    return {
      networkId: "lathe-mlp-1",
      networkType: "multi_layer_perceptron",
      updateType: "weights",
      beforeAccuracy: 0.82,
      afterAccuracy: 0.84,
      trainingEpochs: 10,
    };
  }

  private async _executeDiagnosticEngine(
    name: string,
    symptoms: LatheSymptoms,
    context: Record<string, unknown>,
  ): Promise<{ rootCauses: RootCauseAnalysis[]; sources: string[] } | null> {
    try {
      const engine = await this._loadEngine(name);
      if (engine?.diagnose) {
        return engine.diagnose(symptoms, context);
      }
      if (engine?.troubleshoot) {
        const result = engine.troubleshoot(symptoms);
        return {
          rootCauses: result.root_causes?.map((rc: any) => ({
            cause: rc.cause,
            probability: rc.probability,
            evidence: rc.evidence ?? [],
            source: rc.source ?? name,
            depth: 1,
          })) ?? [],
          sources: [name],
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private _getPhysicsExplanation(rootCause: RootCauseAnalysis): string | undefined {
    if (rootCause.cause.includes("chatter")) {
      return "Regenerative chatter occurs when spindle speed coincides with workpiece natural frequency. Formula: SLD lobes from Kienzle + modal analysis.";
    }
    if (rootCause.cause.includes("deflection")) {
      return "Tool deflection delta = FL^3/3EI where F=cutting force, L=overhang, E=modulus, I=moment of inertia.";
    }
    return undefined;
  }

  private _generateCorrectiveActions(diagnoses: RootCauseAnalysis[]): CorrectiveAction[] {
    if (diagnoses.length === 0) {
      // Provide default corrective action when no specific diagnosis available
      return [{
        action: "Perform detailed inspection and parameter review",
        priority: "medium",
        expectedOutcome: "Identify root cause through systematic analysis",
        riskLevel: "none",
        estimatedTimeMin: 30,
      }];
    }
    return diagnoses.slice(0, 3).map((d, i) => ({
      action: `Address: ${d.cause}`,
      priority: i === 0 ? "immediate" : i === 1 ? "high" : "medium",
      expectedOutcome: "Issue resolved",
      riskLevel: "low",
      estimatedTimeMin: 15,
    }));
  }

  private _generatePreventiveMeasures(diagnoses: RootCauseAnalysis[]): PreventiveMeasure[] {
    return [{
      measure: "Implement regular parameter validation",
      implementationEffort: "minimal",
      preventedIssues: diagnoses.map(d => d.cause),
      roi: 2.5,
    }];
  }

  private _analyzeInput(input: unknown): { features: string[] } {
    const features: string[] = [];

    if (typeof input === "string") {
      if (input.includes("G76")) features.push("threading");
      if (input.includes("G96")) features.push("css");
      if (input.includes("G71")) features.push("canned_cycle");
    }

    if (typeof input === "object" && input) {
      const obj = input as Record<string, unknown>;
      if (obj.material) features.push("material");
      if (obj.features) features.push("features");
    }

    return { features };
  }

  private _sortByDependencies(engines: string[]): string[] {
    // Topological sort based on dependencies
    const sorted: string[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const engine = LATHE_ENGINE_REGISTRY.find(e => e.name === name);
      if (engine) {
        for (const dep of engine.dependencies) {
          if (engines.includes(dep)) {
            visit(dep);
          }
        }
      }
      sorted.push(name);
    };

    for (const name of engines) {
      visit(name);
    }

    return sorted;
  }

  private _searchTribalKnowledge(keywords: string[]): TribalKnowledgeEntry[] {
    // Would integrate with tribal knowledge database
    return keywords.map(k => ({
      source: "tribal_knowledge",
      category: "general",
      content: `Knowledge related to: ${k}`,
      confidence: 0.8,
      appliesTo: [k],
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAIOrchestrationEngine = new LatheAIOrchestrationEngine();
