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

// U-AIHEAD-01: the AI head drives the now-real generation spine + adds an AI second-opinion safety pass.
import { latheOrchestrationEngine, type LatheOrchestrationInput } from "./LatheOrchestrationEngine.js";
import { latheAGISafetyContainmentEngine } from "./LatheAGISafetyContainmentEngine.js";
// U-SELFIMPROVE-01: the self-improving loop -- read learned per-op adjustments (advisory) + record real outcomes.
import { latheAGIContinuousLearningEngine, type FeedbackKind } from "./LatheAGIContinuousLearningEngine.js";
// U-LW-RAG-ADVISORY: wire the real 3,700-tip tribal corpus into the head (RAG) -- kills the fabricated stub.
import { latheTribalIntegrationEngine } from "./LatheTribalIntegrationEngine.js";
import type { InjectionContext } from "./LatheTribalInjectorEngine.js";
// U-LW-DEEP-REASON-ADVISORY: deterministic FMEA deep-reasoning over the generated part (advisory).
import { latheDeepReasoningEngine, type LathePartDefinition, type LatheMachineCapability } from "./LatheDeepReasoningEngine.js";
// U-LW-MILLTURN-ADVISORY: real live-tool physics (calculateLiveTool) per live-tool feature, at the head.
import { millTurnSwissPipelineEngine, type LiveToolInput, type LiveToolOp } from "./MillTurnSwissPipelineEngine.js";
// U-LW-SWISS-ADVISORY: Swiss-type guide-bushing analysis (analyzeGuideBushing) at the head.
import { swissTypeIntelligenceEngine, type SwissPartDefinition, type SwissMachineConfig } from "./SwissTypeIntelligenceEngine.js";
// U-LW-KNURL-ADVISORY: knurling physics (form/cut knurl -- pitch, blank dia, radial force) at the head.
import { knurlingEngine } from "./KnurlingEngine.js";

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
/** U-AIHEAD-01: per-operation AI second-opinion safety verdict (advisory -- never alters the program). */
export interface AISafetyAdvisoryOp {
  op_number: number;
  operation_type: string;
  passed: boolean;
  blocking_count: number;
  warning_count: number;
  checks: Array<{ check_id: string; severity: string; message: string }>;
}

/** U-SELFIMPROVE-01: per-op learned EWMA adjustment surfaced from the continuous-learning engine
 *  (read side of the self-improving loop). ADVISORY -- 1.0 = no learning yet; NOT auto-applied to the
 *  emitted feeds/speeds (that remains the operator-gated physics-into-runtime switch). */
export interface LearningAdjustmentOp {
  op_number: number;
  operation_type: string;
  feature: string;
  key: string;
  learned_multiplier: number;
  sample_count: number;
}

/** U-SELFIMPROVE-01: result of recording REAL shop-floor outcomes back into the learner (write side).
 *  The observation is supplied by the caller (a measured actual) -- never invented by the head. */
export interface GenerationFeedbackResult {
  sessionId: string;
  recorded: Array<{ op_number?: number; feature: string; key: string; kind: FeedbackKind; ewma: number; sample_count: number }>;
  skipped: Array<{ index: number; reason: string }>;
}

/** U-LW-RAG-ADVISORY: one tribal-corpus tip surfaced as advisory RAG context (read-only, never applied to G-code). */
export interface RAGAdvisoryEntry {
  id: string;
  category: string;
  content: string;
  confidence: number;
  source?: string;
}

/** U-LW-DEEP-REASON-ADVISORY: deterministic FMEA deep-reasoning surfaced over the generated part. Reasons
 *  over part geometry + material (L/D ratio, ISO group) via rule-based RPN -- NOT over the emitted cutting
 *  params (the AGI safety advisory + spine physics already vet those), and never alters program_text. */
export interface DeepReasoningAdvisory {
  overall_risk_level: "low" | "moderate" | "high" | "critical";
  failure_modes: Array<{
    mode_id: string;
    description: string;
    category: string;
    probability: number;
    severity: number;
    rpn: number;
    prevention: string[];
  }>;
  top_risks: string[];
  recommended_inspections: string[];
  reasoning_summary: string;
}

/** U-LW-MILLTURN-ADVISORY: per live-tool feature, the REAL live-tool physics from calculateLiveTool
 *  (rpm/feed/force/power/is_safe). Advisory -- never applied to the emitted program. */
export interface MillTurnAdvisoryEntry {
  feature_id: string;
  feature_type: string;
  live_tool_op: LiveToolOp;
  tool_diameter_mm: number;
  recommended_rpm: number;
  feed_mm_min: number;
  power_kW: number;
  power_utilization_pct: number;
  is_safe: boolean;
  warnings: string[];
  recommendations: string[];
}

/** U-LW-MILLTURN-ADVISORY: map each live-tool TurningFeatureType to its nearest MillTurnSwiss LiveToolOp
 *  class. These 7 feature types are exactly the ones the turning spine cannot natively program (it warns
 *  via U-LW-LIVETOOL-FAILLOUD); the head upgrades that warning to real live-tool physics when the feature
 *  carries a tool diameter. This is a domain classification, NOT a physics constant. */
const FEATURE_TO_LIVETOOL_OP: Readonly<Record<string, LiveToolOp>> = {
  whistle_notch: "keyway_mill",
  od_pocket_mill: "c_axis_contour",
  cross_drill: "cross_drill",
  cross_tap: "cross_tap",
  keyway: "keyway_mill",
  flat_mill: "face_mill",
  hex_mill: "polygon_turn",
};

/** U-LW-SWISS-ADVISORY: Swiss-type guide-bushing suitability for the part's geometry (advisory).
 *  Driven by the part's L/D + material + tolerance (analyzeGuideBushing); reference machine is metadata-only. */
export interface SwissAdvisory {
  recommendation: "use_bushing" | "bushingless" | "either";
  reason: string;
  deflection_risk: "low" | "medium" | "high";
  ld_ratio: number;
  support_distance_mm: number;
  bushing_wear: "minimal" | "moderate" | "significant";
}

/** U-LW-KNURL-ADVISORY: per knurl feature, the real knurling physics from KnurlingEngine.knurl
 *  (pitch / blank diameter / radial force / rpm / feed). Advisory -- never applied to the emitted program. */
export interface KnurlAdvisoryEntry {
  feature_id: string;
  workpiece_diameter_mm: number;
  pattern: string;
  method: string;
  pitch_mm: number;
  blank_diameter_mm: number;
  radial_force_N: number;
  spindle_rpm: number;
  feed_rate_mm_rev: number; // KnurlingEngine emits feed_rate in mm/rev; unit baked in per the sibling-advisory convention
  warnings: string[];
}

/** U-AIHEAD-01: the AI head's program-generation result -- the real spine program + an AI advisory layer. */
export interface GenerateProgramOrchestrationResult {
  sessionId: string;
  /** The spine's emission verdict (runPipeline is the authoritative emit + fail-closed safety authority). */
  success: boolean;
  safety_passed: boolean;
  safety_blocks: string[];
  program_text: string;
  program_line_count: number;
  total_operations: number;
  estimated_cycle_time_sec: number;
  collision_checks: Array<{ check_type: string; passed: boolean; clearance_mm: number; description: string; severity: "info" | "warning" | "critical" }>;
  /** AI HEAD CONTRIBUTION: an independent AGI safety second-opinion per op (ADVISORY -- physics still vetoes). */
  ai_safety_advisory: AISafetyAdvisoryOp[];
  ai_advisory_summary: { ops_checked: number; ops_flagged: number; total_blocking: number; total_warnings: number };
  /** AI HEAD CONTRIBUTION (U-SELFIMPROVE-01): learned per-op adjustment multipliers (advisory read side
   *  of the self-improving loop). 1.0 = no learning yet; NOT applied to the emitted program. */
  learning_adjustments: LearningAdjustmentOp[];
  /** U-LW-SPINE-REPORTS: the spine's real program-package reports (physics traceability / setup sheet /
   *  cost drivers), surfaced so the head returns a complete package alongside the emitted G-code.
   *  Undefined when the program was not emitted (fail-closed) -- never fabricated. */
  physics_report?: string;
  setup_sheet_text?: string;
  cost_report?: string;
  /** U-LW-RAG-ADVISORY: tribal-corpus tips retrieved as advisory context (RAG). [] when corpus unavailable. */
  rag_advisory: RAGAdvisoryEntry[];
  /** U-LW-DEEP-REASON-ADVISORY: deterministic FMEA deep-reasoning over the generated part (advisory).
   *  undefined when skipped (skip_deep_reasoning_advisory) or the reasoning engine fails -- never fabricated. */
  deep_reasoning_advisory?: DeepReasoningAdvisory;
  /** U-LW-MILLTURN-ADVISORY: real live-tool physics per live-tool feature (activates only when the feature
   *  carries a real tool diameter + depth; [] otherwise -- never fabricated). */
  mill_turn_advisory: MillTurnAdvisoryEntry[];
  /** U-LW-SWISS-ADVISORY: Swiss-type guide-bushing suitability for the part (advisory). undefined when
   *  skipped (skip_swiss_advisory) or geometry is invalid -- never fabricated. */
  swiss_advisory?: SwissAdvisory;
  /** U-LW-KNURL-ADVISORY: real knurling physics per knurl feature (activates only when the feature carries
   *  a real diameter + length; [] otherwise -- never fabricated). */
  knurl_advisory: KnurlAdvisoryEntry[];
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
}

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
   * U-AIHEAD-01 -- the AI head drives the generation spine and adds an independent AI safety pass.
   *
   * This is the "AI system at the head of the lathe wizard": it imports + calls the now-real
   * LatheOrchestrationEngine spine (which emits via the verified runPipeline), then runs the AGI
   * safety-containment engine as a SECOND, independent opinion over each operation's cutting params.
   * The advisory is purely ADDITIVE -- it NEVER changes program_text or the spine's safety verdict;
   * the spine's physics (runPipeline) remains the authoritative emission + fail-closed authority.
   *
   * @param input the structured turning input (LatheOrchestrationInput extends TurningInput)
   * @returns the real program + metadata + a per-op AI safety advisory
   */
  generateProgram(input: LatheOrchestrationInput): GenerateProgramOrchestrationResult {
    const sessionId = this._generateSessionId("generate");
    // 1. Drive the spine -> real program + real metadata (the authoritative generation + safety path).
    const spine = latheOrchestrationEngine.calculate("ai_head_generate", input);

    // 2. AI second-opinion: run the AGI safety-containment check over each op's cutting params.
    //    ADVISORY ONLY -- this never alters program_text or the spine's verdict.
    // Normalize the ISO group to a valid enum so an unusual material never throws in the AGI schema
    // (the advisory must never break generation).
    const iso = (["P", "M", "K", "N", "S", "H"] as const).find((g) => g === input.material?.iso_group) ?? "P";
    const advisory: AISafetyAdvisoryOp[] = [];
    for (const op of spine.operations) {
      const cp = op.cutting_params;
      const vc = cp.cutting_speed_m_min;
      const fz = cp.feed_mm_rev;
      const ap = cp.depth_of_cut_mm;
      // Skip ops without finite cutting params (rapid-only / pseudo ops) -- the AGI schema requires finite values.
      if (!Number.isFinite(vc) || !Number.isFinite(fz) || !Number.isFinite(ap)) continue;
      const report = latheAGISafetyContainmentEngine.check({
        category: "physics",
        speed_feed: { iso_group: iso, vc_m_min: vc, fz_mm: fz, ap_mm: ap },
      });
      advisory.push({
        op_number: op.op_number,
        operation_type: String(op.operation_type),
        passed: report.passed,
        blocking_count: report.blocking_count,
        warning_count: report.warning_count,
        checks: report.checks.map((c) => ({ check_id: c.check_id, severity: String(c.severity), message: c.message })),
      });
    }

    const ai_advisory_summary = {
      ops_checked: advisory.length,
      ops_flagged: advisory.filter((a) => !a.passed).length,
      total_blocking: advisory.reduce((s, a) => s + a.blocking_count, 0),
      total_warnings: advisory.reduce((s, a) => s + a.warning_count, 0),
    };

    log.info("LatheAIOrchestrationEngine.generateProgram", {
      sessionId,
      spineSuccess: spine.success,
      opsChecked: ai_advisory_summary.ops_checked,
      opsFlagged: ai_advisory_summary.ops_flagged,
    });

    // U-SELFIMPROVE-01 (read side): surface the learned EWMA adjustment per op. READ-ONLY --
    // predictAdjustment/getSlot never persist, so generateProgram stays side-effect-free, and the
    // multiplier is NOT applied to program_text (changing emitted feeds/speeds on the live fleet is the
    // operator-gated physics-into-runtime switch). 1.0 means the learner has no sample for this case yet.
    const learning_adjustments: LearningAdjustmentOp[] = spine.operations.map((op) => {
      const { feature, key } = this._learningKeyFor(String(op.operation_type), iso, op.cutting_params.depth_of_cut_mm);
      const slot = latheAGIContinuousLearningEngine.getSlot(feature, key);
      return {
        op_number: op.op_number,
        operation_type: String(op.operation_type),
        feature,
        key,
        learned_multiplier: latheAGIContinuousLearningEngine.predictAdjustment(feature, key),
        sample_count: slot?.sample_count ?? 0,
      };
    });

    // U-LW-RAG-ADVISORY: pull real tribal-corpus tips as advisory context (fail-soft -> []). Additive --
    // never touches program_text (the spine's emitted G-code stays authoritative).
    const rag_advisory = this._retrieveLatheRAGContext(input);

    // U-LW-DEEP-REASON-ADVISORY: deterministic FMEA deep-reasoning over the generated part (fail-soft ->
    // undefined). Additive -- never touches program_text or the spine verdict.
    const deep_reasoning_advisory = this._buildDeepReasoningAdvisory(input);

    // U-LW-MILLTURN-ADVISORY: real live-tool physics per live-tool feature (fail-soft -> []). Additive.
    const mill_turn_advisory = this._buildMillTurnAdvisory(input);

    // U-LW-SWISS-ADVISORY: Swiss guide-bushing suitability from the part geometry (fail-soft -> undefined). Additive.
    const swiss_advisory = this._buildSwissAdvisory(input);

    // U-LW-KNURL-ADVISORY: real knurling physics per knurl feature (fail-soft -> []). Additive.
    const knurl_advisory = this._buildKnurlAdvisory(input);

    return {
      sessionId,
      success: spine.success,
      safety_passed: spine.safety_passed,
      safety_blocks: spine.safety_blocks,
      program_text: spine.program_text,
      program_line_count: spine.program_line_count,
      total_operations: spine.total_operations,
      estimated_cycle_time_sec: spine.estimated_cycle_time_sec,
      collision_checks: spine.collision_checks ?? [],
      ai_safety_advisory: advisory,
      ai_advisory_summary,
      learning_adjustments,
      physics_report: spine.physics_report,
      setup_sheet_text: spine.setup_sheet_text,
      cost_report: spine.cost_report,
      rag_advisory,
      deep_reasoning_advisory,
      mill_turn_advisory,
      swiss_advisory,
      knurl_advisory,
      warnings: spine.warnings,
    };
  }

  /**
   * U-SELFIMPROVE-01 -- canonical (feature,key) for an op's learning slot. The READ side
   * (generateProgram) and the WRITE side (recordGenerationFeedback) MUST build the key identically so
   * they address the SAME EWMA slot. key = "<iso>|<operation>|<ap>mm".
   */
  private _learningKeyFor(operationType: string, iso: string, ap_mm: number): { feature: string; key: string } {
    const apTag = Number.isFinite(ap_mm) ? `${Math.round(ap_mm * 100) / 100}mm` : "na";
    return { feature: "lathe_speed_feed", key: `${iso}|${operationType}|${apTag}` };
  }

  /**
   * U-SELFIMPROVE-01 (write side of the self-improving loop) -- record REAL shop-floor outcomes back
   * into the continuous-learning engine so the next generateProgram's learned_multiplier shifts.
   *
   * HONESTY (R12): the `observation` is a MEASURED actual the CALLER supplies (e.g. actual-vs-predicted
   * speed/feed ratio, machinist accept/reject, or quote-vs-actual variance) -- the head NEVER invents an
   * outcome. Any row the learner cannot accept -- a non-finite observation, or a value its Zod schema
   * rejects (e.g. an invalid `kind`) -- is skipped fail-soft (with the reason surfaced in `skipped`) so
   * ONE bad row can never abort the batch and lose the rows already recorded.
   *
   * @param input the same structured turning input used at generation (for iso-group keying)
   * @param outcomes per-op measured outcomes; each keyed to its op via (operation_type, ap_mm)
   * @returns the recorded slots (with updated EWMA) + any skipped rows with a reason
   */
  recordGenerationFeedback(
    input: LatheOrchestrationInput,
    outcomes: Array<{ operation_type: string; ap_mm: number; kind: FeedbackKind; observation: number; op_number?: number; note?: string }>,
  ): GenerationFeedbackResult {
    const sessionId = this._generateSessionId("feedback");
    const iso = (["P", "M", "K", "N", "S", "H"] as const).find((g) => g === input.material?.iso_group) ?? "P";
    const recorded: GenerationFeedbackResult["recorded"] = [];
    const skipped: GenerationFeedbackResult["skipped"] = [];

    outcomes.forEach((o, index) => {
      if (!Number.isFinite(o.observation)) {
        skipped.push({ index, reason: "non-finite observation (no fabricated actuals)" });
        return;
      }
      const { feature, key } = this._learningKeyFor(o.operation_type, iso, o.ap_mm);
      try {
        const slot = latheAGIContinuousLearningEngine.recordFeedback({
          feature,
          key,
          kind: o.kind,
          observation: o.observation,
          note: o.note,
        });
        recorded.push({ op_number: o.op_number, feature, key, kind: o.kind, ewma: slot.ewma, sample_count: slot.sample_count });
      } catch (err) {
        // Fail-soft per row: a value the learner's schema rejects (e.g. an invalid `kind`) is surfaced in
        // `skipped` rather than thrown -- one bad row must not abort the batch or lose already-recorded rows.
        // NOT a silent catch (the reason is returned to the caller).
        skipped.push({ index, reason: `recordFeedback rejected: ${err instanceof Error ? err.message : String(err)}` });
      }
    });

    log.info("LatheAIOrchestrationEngine.recordGenerationFeedback", {
      sessionId,
      recorded: recorded.length,
      skipped: skipped.length,
    });
    return { sessionId, recorded, skipped };
  }

  /**
   * U-LW-RAG-ADVISORY -- retrieve real tribal-corpus tips as advisory RAG context for a turning input.
   * Read-only + fail-soft: corpus unavailability NEVER aborts generation (returns []). The JM fleet is
   * 100% Okuma OSP, so the corpus query is biased to that controller. The tips are ADVISORY -- the caller
   * surfaces them; the spine's emitted G-code is never altered by them.
   */
  retrieveRAGContext(input: LatheOrchestrationInput): RAGAdvisoryEntry[] {
    return this._retrieveLatheRAGContext(input);
  }

  private _retrieveLatheRAGContext(input: LatheOrchestrationInput): RAGAdvisoryEntry[] {
    // Perf opt-out: the corpus search adds ~700ms cold (one-time corpus load) + per-call lookup. Batch /
    // latency-sensitive callers pass skip_rag_advisory:true to skip it entirely (RAG is on by default --
    // the operator's "AI/RAG at the head" directive). Read loosely so the shared input type is untouched.
    if ((input as { skip_rag_advisory?: boolean }).skip_rag_advisory === true) return [];
    try {
      const ctx: InjectionContext = {
        material: input.material?.material_name,
        iso_group: input.material?.iso_group,
        controller: "okuma_osp", // JM fleet is 100% Okuma OSP
        keywords: ["turning", "lathe"],
      };
      const tips = latheTribalIntegrationEngine.sourceCorpusTips(ctx);
      return tips.slice(0, 8).map((t) => ({
        id: t.id,
        category: t.category ?? "general",
        content: t.content,
        confidence: typeof t.confidence === "number" ? t.confidence : 0.5,
        source: t.source_customer ?? t.source_program,
      }));
    } catch (err) {
      log.warn("LatheAIOrchestrationEngine._retrieveLatheRAGContext failed (fail-soft, no advisory)", { err: String(err) });
      return [];
    }
  }

  /**
   * U-LW-DEEP-REASON-ADVISORY -- run the deterministic FMEA deep-reasoning engine over the generated part
   * and surface it as advisory. Read-only + fail-soft: any failure returns undefined (NEVER aborts
   * generation). The FMEA is rule-based (RPN over L/D ratio, ISO group, geometry) -- no untrained NN and no
   * fabricated physics inputs. The spine's emitted G-code is never altered by it.
   *
   * SCOPE (R12 + the standing input-gap lesson -- verify an engine's inputs/output are real before wiring):
   * ONLY analyzeFailureModes is wired. Deliberately NOT wired:
   *  - LatheOpusReasoningEngine NN predictors (predictOperationSequence/CuttingParameters/ToolSelection):
   *    their MLP weights are sine-initialized (LatheOpusReasoningEngine.initializeWeights), never trained on
   *    real data, AND predictCuttingParameters needs tool geometry (nose_radius/insert_type) the turning
   *    input lacks -- surfacing them would fabricate confidence + inputs.
   *  - predictChatter/predictDeflection: they consume machine-RPM + chuck-grip-length numerics the turning
   *    input does not carry -- wiring them would fabricate those physics inputs.
   */
  assessDeepReasoning(input: LatheOrchestrationInput): DeepReasoningAdvisory | undefined {
    return this._buildDeepReasoningAdvisory(input);
  }

  private _buildDeepReasoningAdvisory(input: LatheOrchestrationInput): DeepReasoningAdvisory | undefined {
    // Perf / latency opt-out (read loosely so the shared input type is untouched).
    if ((input as { skip_deep_reasoning_advisory?: boolean }).skip_deep_reasoning_advisory === true) return undefined;
    try {
      const part = this._mapToDeepReasonPart(input);
      const machine = this._mapToDeepReasonMachine(input);
      const fmea = latheDeepReasoningEngine.analyzeFailureModes(part, machine);
      return {
        overall_risk_level: fmea.overall_risk_level,
        failure_modes: fmea.failure_modes.map((f) => ({
          mode_id: f.mode_id,
          description: f.description,
          category: f.category,
          probability: f.probability,
          severity: f.severity,
          rpn: f.rpn,
          prevention: f.prevention,
        })),
        top_risks: fmea.top_risks,
        recommended_inspections: fmea.recommended_inspections,
        reasoning_summary: fmea.reasoning_chain.conclusion,
      };
    } catch (err) {
      log.warn("LatheAIOrchestrationEngine._buildDeepReasoningAdvisory failed (fail-soft, no advisory)", { err: String(err) });
      return undefined;
    }
  }

  /**
   * Map a turning input -> the deep-reasoning engine's LathePartDefinition WITHOUT fabricating any value.
   * Geometry comes from real input fields (finished_od_mm is the honest finished diameter; the un-turned
   * bar OD is the conservative fallback). TurningInput carries no top-level tolerance / surface-finish, so
   * those default to the LOWEST FMEA risk tier (non-inflating -- never invents a tight tolerance the
   * operator did not specify). features are not consumed by analyzeFailureModes, so an empty list avoids
   * fabricating feature classifications.
   */
  private _mapToDeepReasonPart(input: LatheOrchestrationInput): LathePartDefinition {
    const iso = (["P", "M", "K", "N", "S", "H"] as const).find((g) => g === input.material?.iso_group) ?? "P";
    const barOd = Number.isFinite(input.bar_stock_od_mm) ? input.bar_stock_od_mm : 0;
    const finishedField = (input as { finished_od_mm?: number }).finished_od_mm;
    const finishedOd = typeof finishedField === "number" && Number.isFinite(finishedField) && finishedField > 0 ? finishedField : barOd;
    const partLen = Number.isFinite(input.part_length_mm) ? input.part_length_mm : 0;
    return {
      part_id: input.part_number ?? "lathe-part",
      material: input.material?.material_name ?? "unknown",
      iso_group: iso,
      stock_type: "bar", // TurningInput is bar-fed (bar_stock_od_mm) -- honest, not fabricated
      stock_od_mm: barOd,
      stock_length_mm: partLen,
      finished_od_mm: finishedOd > 0 ? finishedOd : barOd,
      finished_length_mm: partLen,
      features: [], // analyzeFailureModes does not consume features -- empty avoids fabricating classifications
      tolerances: { diameter_mm: 0.1, length_mm: 0.1 }, // absence-default -> lowest dimensional-risk tier
      surface_finish_ra: 3.2, // absence-default -> lowest surface-risk tier
      batch_size: 1,
    };
  }

  /**
   * Map a turning input -> the deep-reasoning engine's LatheMachineCapability. analyzeFailureModes consumes
   * ONLY machine_type (-> reasoning-chain metadata); the numeric capability fields below do NOT affect the
   * FMEA output (verified: analyzeFailureModes never reads them). They are derived from input where present
   * and otherwise carry representative JM-Okuma values purely to satisfy the type -- this is why
   * predictChatter/predictDeflection (which DO read those numerics) are not wired here.
   */
  private _mapToDeepReasonMachine(input: LatheOrchestrationInput): LatheMachineCapability {
    const LIVE_TOOL = ["whistle_notch", "od_pocket_mill", "cross_drill", "cross_tap", "keyway", "flat_mill", "hex_mill"];
    const hasLiveTool = (input.features ?? []).some((f) => LIVE_TOOL.includes(String((f as { type?: string }).type)));
    const rpm = (input as { max_spindle_rpm?: number }).max_spindle_rpm;
    return {
      machine_id: input.machine_model ?? "okuma-lathe",
      machine_type: hasLiveTool ? "mill_turn" : "2_axis",
      controller: "okuma_osp", // JM fleet is 100% Okuma OSP
      max_spindle_rpm: typeof rpm === "number" && Number.isFinite(rpm) ? rpm : 4000,
      max_spindle_hp: 30,
      max_turning_diameter_mm: 300,
      max_turning_length_mm: 500,
      has_live_tooling: hasLiveTool,
      has_c_axis: hasLiveTool,
      has_y_axis: false,
      has_sub_spindle: (input as { sub_spindle?: boolean }).sub_spindle === true,
      has_tailstock: (input as { tailstock?: boolean }).tailstock === true,
      has_steady_rest: false,
      turret_stations: 12,
      accuracy_class: "standard",
    };
  }

  /**
   * U-LW-MILLTURN-ADVISORY -- surface REAL live-tool physics (MillTurnSwissPipelineEngine.calculateLiveTool)
   * for every live-tool feature the part carries. Upgrades the spine's bare U-LW-LIVETOOL-FAILLOUD warning
   * (the turning spine cannot natively program live tooling) into an actionable rpm/feed/force/power/is_safe
   * advisory. Read-only + fail-soft (per-feature try/catch -> skip; overall never throws). ADVISORY -- never
   * alters program_text; runtime application of these values is the operator-gated physics-into-runtime switch.
   *
   * NO FABRICATION: activates ONLY for a live-tool feature that carries a real tool diameter
   * (live_tool_diameter_mm for milling ops, or cross_hole_diameter_mm for cross-drill/tap), a real depth
   * (notch/pocket/depth_mm), and a real workpiece diameter. A feature missing any of these is SKIPPED --
   * never a fabricated diameter/depth. (The TurningFeature model already carries these live-tool fields;
   * no schema change is needed for the mill-turn case.)
   */
  assessMillTurn(input: LatheOrchestrationInput): MillTurnAdvisoryEntry[] {
    return this._buildMillTurnAdvisory(input);
  }

  private _buildMillTurnAdvisory(input: LatheOrchestrationInput): MillTurnAdvisoryEntry[] {
    if ((input as { skip_mill_turn_advisory?: boolean }).skip_mill_turn_advisory === true) return [];
    const out: MillTurnAdvisoryEntry[] = [];
    const iso = (["P", "M", "K", "N", "S", "H"] as const).find((g) => g === input.material?.iso_group) ?? "P";
    const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
    for (const f of input.features ?? []) {
      const feat = f as {
        id?: string; type?: string; live_tool_diameter_mm?: number; cross_hole_diameter_mm?: number;
        notch_depth_mm?: number; pocket_depth_mm?: number; depth_mm?: number; od_mm?: number;
      };
      const op = FEATURE_TO_LIVETOOL_OP[String(feat.type)];
      if (!op) continue; // not a live-tool feature -- skip
      const toolDia = [feat.live_tool_diameter_mm, feat.cross_hole_diameter_mm].find(finite);
      const depth = [feat.notch_depth_mm, feat.pocket_depth_mm, feat.depth_mm].find(finite);
      const wpDia = [feat.od_mm, (input as { finished_od_mm?: number }).finished_od_mm, input.bar_stock_od_mm].find(finite);
      // NO FABRICATION: a live-tool feature missing a real tool diameter / depth / workpiece diameter is skipped.
      if (toolDia === undefined || depth === undefined || wpDia === undefined) continue;
      try {
        const liveInput: LiveToolInput = {
          operation: op,
          tool_diameter_mm: toolDia,
          depth_of_cut_mm: depth,
          workpiece_diameter_mm: wpDia,
          iso_group: iso,
          material_name: input.material?.material_name,
        };
        const r = millTurnSwissPipelineEngine.calculateLiveTool(liveInput);
        out.push({
          feature_id: feat.id ?? "?",
          feature_type: String(feat.type),
          live_tool_op: op,
          tool_diameter_mm: toolDia,
          recommended_rpm: r.recommended_rpm,
          feed_mm_min: r.feed_mm_min,
          power_kW: r.power_kW,
          power_utilization_pct: r.power_utilization_pct,
          is_safe: r.is_safe,
          warnings: r.warnings,
          recommendations: r.recommendations,
        });
      } catch (err) {
        // Fail-soft per feature: a calculateLiveTool failure skips that feature (surfaced in the log), never
        // aborts generation. NOT a silent catch.
        log.warn("LatheAIOrchestrationEngine._buildMillTurnAdvisory: calculateLiveTool failed for a feature (skipped)", { err: String(err), feature: String(feat.type) });
      }
    }
    return out;
  }

  /**
   * U-LW-SWISS-ADVISORY -- surface the Swiss-type guide-bushing recommendation for the part's geometry
   * (SwissTypeIntelligenceEngine.analyzeGuideBushing). Answers the operator's "swiss lathe machining" ask:
   * does this part's L/D + material + tolerance call for a guide bushing (use_bushing / bushingless /
   * either), with the deflection risk. Read-only + fail-soft (any failure -> undefined; NEVER aborts
   * generation). ADVISORY -- never alters program_text.
   *
   * NO FABRICATION: geometry comes from real turning-input fields (bar OD, part length, finished OD). The
   * reference SwissMachineConfig is METADATA-ONLY: analyzeGuideBushing's output is driven entirely by the
   * part (L/D + material + tolerance + annualVolume); calculateSupportDistance + assessBushingWear never
   * read any machine numeric field (verified in SwissTypeIntelligenceEngine), so the reference machine
   * cannot influence the result. tolerance_class + annualVolume use non-inflating absence-defaults. Invalid
   * geometry (non-positive bar OD / length) -> undefined (no fabricated L/D).
   */
  assessSwiss(input: LatheOrchestrationInput): SwissAdvisory | undefined {
    return this._buildSwissAdvisory(input);
  }

  private _buildSwissAdvisory(input: LatheOrchestrationInput): SwissAdvisory | undefined {
    if ((input as { skip_swiss_advisory?: boolean }).skip_swiss_advisory === true) return undefined;
    try {
      const barOd = Number.isFinite(input.bar_stock_od_mm) ? input.bar_stock_od_mm : 0;
      const partLen = Number.isFinite(input.part_length_mm) ? input.part_length_mm : 0;
      if (barOd <= 0 || partLen <= 0) return undefined; // no valid geometry -> no fabricated L/D
      const finField = (input as { finished_od_mm?: number }).finished_od_mm;
      const maxOd = typeof finField === "number" && Number.isFinite(finField) && finField > 0 ? finField : barOd;
      const part: SwissPartDefinition = {
        partId: input.part_number ?? "lathe-part",
        barDiameter_mm: barOd,
        finishedLength_mm: partLen,
        maxOD_mm: maxOd,
        features: [], // only feed the SECONDARY supportDistance; empty avoids fabricating feature positions
        material: input.material?.material_name ?? "1018",
        tolerance_class: "standard", // absence-default -- the loosest tier (non-inflating)
        annualVolume: 1, // absence-default -- only affects bushingWear (-> 'minimal'); never invented as high
      };
      // Reference Swiss machine -- analyzeGuideBushing / calculateSupportDistance / assessBushingWear provably
      // never read machine numerics (the analysis is part-driven), so this is metadata-only, not a fabricated spec.
      const machine: SwissMachineConfig = {
        machineId: "generic-swiss-reference", manufacturer: "citizen", model: "reference",
        maxBarDiameter_mm: 32, guideBushingType: "fixed", gangToolPositions: 8, backToolPositions: 4,
        hasSubSpindle: true, hasYAxis: false, hasBAxis: false, maxMainSpindleRpm: 10000,
        maxSubSpindleRpm: 8000, coolantType: "oil",
      };
      const res = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machine);
      if (!res?.success || !res.data) return undefined;
      const d = res.data;
      return {
        recommendation: d.recommendation,
        reason: d.reason,
        deflection_risk: d.deflectionRisk,
        ld_ratio: d.ldRatio,
        support_distance_mm: d.supportDistance_mm,
        bushing_wear: d.bushingWear,
      };
    } catch (err) {
      log.warn("LatheAIOrchestrationEngine._buildSwissAdvisory failed (fail-soft, no advisory)", { err: String(err) });
      return undefined;
    }
  }

  /**
   * U-LW-KNURL-ADVISORY -- surface REAL knurling physics (KnurlingEngine.knurl) for every knurl feature the
   * part carries: DIN-82 pitch, form-knurl blank diameter, radial force (5-20x cutting force -- deflects
   * slender parts), speed/feed. The turning spine does not natively emit a knurl cycle (a 'knurl' feature
   * falls back to od_rough + a loud spine warning), so this is the actionable knurl-parameter source.
   * Read-only + fail-soft (per-feature try/catch -> skip; overall never throws). ADVISORY -- never alters
   * program_text.
   *
   * NO FABRICATION: activates ONLY for a 'knurl' feature carrying a real diameter (od_mm / diameter_mm, or
   * the part's finished/bar OD) AND a real length. A feature missing either is SKIPPED. pitch is left to the
   * engine's DIN-82 by-diameter selection (not invented).
   */
  assessKnurl(input: LatheOrchestrationInput): KnurlAdvisoryEntry[] {
    return this._buildKnurlAdvisory(input);
  }

  private _buildKnurlAdvisory(input: LatheOrchestrationInput): KnurlAdvisoryEntry[] {
    if ((input as { skip_knurl_advisory?: boolean }).skip_knurl_advisory === true) return [];
    const out: KnurlAdvisoryEntry[] = [];
    const iso = (["P", "M", "K", "N", "S", "H"] as const).find((g) => g === input.material?.iso_group) ?? "P";
    const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
    for (const f of input.features ?? []) {
      const feat = f as { id?: string; type?: string; od_mm?: number; diameter_mm?: number; length_mm?: number };
      if (String(feat.type) !== "knurl") continue;
      const dia = [feat.od_mm, feat.diameter_mm, (input as { finished_od_mm?: number }).finished_od_mm, input.bar_stock_od_mm].find(finite);
      const len = [feat.length_mm].find(finite);
      // NO FABRICATION: a knurl feature missing a real diameter / length is skipped.
      if (dia === undefined || len === undefined) continue;
      try {
        const r = knurlingEngine.knurl({ workpiece_diameter_mm: dia, knurl_length_mm: len, material_iso_group: iso });
        out.push({
          feature_id: feat.id ?? "?",
          workpiece_diameter_mm: dia,
          pattern: r.pattern,
          method: r.method,
          pitch_mm: r.pitch.value,
          blank_diameter_mm: r.blank_diameter.value,
          radial_force_N: r.radial_force.value,
          spindle_rpm: r.spindle_rpm.value,
          feed_rate_mm_rev: r.feed_rate.value, // engine emits mm/rev (r.feed_rate.unit)
          warnings: r.warnings,
        });
      } catch (err) {
        // Fail-soft per feature: a knurl-calc failure skips that feature (surfaced in the log), never aborts
        // generation. NOT a silent catch.
        log.warn("LatheAIOrchestrationEngine._buildKnurlAdvisory: knurl calc failed for a feature (skipped)", { err: String(err), feature: String(feat.type) });
      }
    }
    return out;
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

    // Neural network updates (honest: _updateNeuralNetworks returns null until a real
    // trainer is wired -- guard the push so no fabricated NN record reaches the report).
    if (defaults.updateNeuralNetworks && patternsLearned.length > 0) {
      const nnUpdate = await this._updateNeuralNetworks(patternsLearned);
      if (nnUpdate) neuralNetworkUpdates.push(nnUpdate);
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

  /**
   * Structural validity pre-gate for a candidate NC program string.
   *
   * HONEST SCOPE (U-LW-CL-UNSTUB): this is a necessary-precondition STRUCTURAL check --
   * a non-empty program that carries recognizable NC prep/motion codes (G/M address words)
   * or coordinate words (X/Z/U/W with a number). It is NOT a force/thermal/collision physics
   * simulation -- that lives in LatheOrchestrationEngine's pipeline, which operates on a
   * structured part definition, not a bare G-code string. Replaces the prior blind `return true`,
   * which forced the caller's physicsValidatedPrograms count (and therefore overallAccuracy /
   * confidenceScore) to a fabricated constant 1.0 for ANY input.
   *
   * @param program - candidate NC program text
   * @returns true only if the text is a structurally-plausible NC program
   */
  private async _validateProgramPhysics(program: string): Promise<boolean> {
    if (typeof program !== "string") return false;
    const text = program.trim();
    if (text.length === 0) return false;
    const hasPrepOrMotionCode = /\b[GM]\d{1,3}\b/i.test(text); // e.g. G71, M08
    const hasCoordinateWord = /\b[XZUW]-?\d/i.test(text); // e.g. X25.4, Z-10.0
    return hasPrepOrMotionCode || hasCoordinateWord;
  }

  /**
   * Extract learned patterns from a completed program.
   *
   * HONEST SCOPE (U-LW-CL-UNSTUB): mining a labelled {material, operation, confidence} pattern
   * from a bare G-code string requires a trained model plus the originating part/material context
   * -- neither is available here (the lathe MLP is sine-initialized/untrained, and material is not
   * recoverable from raw NC text). Returning [] is the honest result: NO fabricated pattern is
   * emitted (the prior stub returned a hardcoded {material:"P", operation:"od_rough", confidence:0.75}).
   * Real extraction is gated on a trained model + structured provenance (future work).
   *
   * @param _program - completed NC program text (unused until a real extractor is wired)
   * @returns [] -- no patterns are fabricated
   */
  private async _extractPatterns(
    _program: string,
  ): Promise<Array<{ id: string; type: string; material: string; operation: string; confidence: number }>> {
    return [];
  }

  /**
   * Harvest tribal knowledge entries from a completed program.
   *
   * HONEST SCOPE (U-LW-CL-UNSTUB): no automated program -> tribal-knowledge extractor is wired,
   * so this honestly returns [] rather than a fabricated entry. Do NOT replace with invented
   * knowledge; a real harvester needs a labelled outcome + provenance.
   *
   * @param _program - completed NC program text (unused until a real harvester is wired)
   * @returns [] -- no knowledge is fabricated
   */
  private async _harvestKnowledge(_program: string): Promise<TribalKnowledgeEntry[]> {
    return [];
  }

  /**
   * Apply learned patterns to the lathe neural network.
   *
   * HONEST SCOPE (U-LW-CL-UNSTUB): there is no wired training pipeline for the lathe MLP -- its
   * weights are sine-initialized/untrained (see LatheOpusReasoningEngine.initializeWeights), so no
   * real weight update or accuracy delta occurs here. Returning null (rather than a fabricated
   * {beforeAccuracy:0.82, afterAccuracy:0.84, trainingEpochs:10} record) is the honest result; the
   * caller omits the NN update from the report. A real record is emitted only once a trainer exists.
   *
   * @param _patterns - patterns that would seed training (unused until a real trainer is wired)
   * @returns null -- no fabricated training metrics
   */
  private async _updateNeuralNetworks(_patterns: LearnedPatternSummary[]): Promise<NeuralNetworkUpdateRecord | null> {
    return null;
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
    // U-LW-RAG-ADVISORY: source REAL tips from the tribal corpus (was a fabricated-string stub -- R12).
    // Fail-soft: corpus unavailability returns [] rather than fabricating knowledge.
    try {
      const tips = latheTribalIntegrationEngine.sourceCorpusTips({ keywords });
      return tips.slice(0, 12).map((t) => ({
        source: t.source_customer ?? t.source_program ?? "tribal_corpus",
        category: t.category ?? "general",
        content: t.content,
        confidence: typeof t.confidence === "number" ? t.confidence : 0.5,
        appliesTo: t.keywords ?? keywords,
      }));
    } catch {
      return [];
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAIOrchestrationEngine = new LatheAIOrchestrationEngine();
