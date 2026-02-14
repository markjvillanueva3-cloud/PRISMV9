/**
 * PRISM MCP Server - Engines Index v9
 * Re-exports all calculation and orchestration engines
 * Updated: Session 5.3 - Added KnowledgeQueryEngine
 */

// Manufacturing Calculations (Kienzle, Taylor, Johnson-Cook, etc.)
export {
  manufacturingCalculations,
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams,
  type CuttingConditions,
  type CuttingForceResult,
  type ToolLifeResult,
  type SurfaceFinishResult,
  type MRRResult,
  type SpeedFeedInput,
  type SpeedFeedResult
} from "./ManufacturingCalculations.js";

// Advanced Calculations (Stability, Thermal, Optimization)
export {
  advancedCalculations,
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  STABILITY_CONSTANTS,
  THERMAL_CONSTANTS,
  type ModalParameters,
  type StabilityResult,
  type StabilityLobe,
  type DeflectionResult,
  type ThermalResult,
  type OptimizationResult,
  type CostParameters,
  type OptimizationConstraints,
  type OptimizationWeights
} from "./AdvancedCalculations.js";

// Toolpath & CAM Calculations
export {
  toolpathCalculations,
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateOptimalStepover,
  estimateCycleTime,
  calculateArcFitting,
  CAM_CONSTANTS,
  type EngagementResult,
  type TrochoidalParams,
  type HSMParams,
  type ScallopResult,
  type StepoverResult,
  type CycleTimeResult,
  type ArcFitResult
} from "./ToolpathCalculations.js";

// Agent Executor & Orchestration Engine
export {
  agentExecutor,
  AgentExecutor,
  executeAgent,
  executeAgentsParallel,
  executeAgentPipeline,
  type TaskStatus,
  type TaskPriority,
  type ExecutionMode,
  type TaskDefinition,
  type TaskResult,
  type ExecutionPlan,
  type AgentSession,
  type QueueStats,
  type ExecutionConfig
} from "./AgentExecutor.js";

// Swarm Executor & Multi-Agent Coordination
export {
  swarmExecutor,
  SwarmExecutor,
  executeSwarm,
  executeParallelSwarm,
  executeConsensusSwarm,
  type SwarmPattern,
  type SwarmConfig,
  type SwarmOptions,
  type ReduceFunction,
  type SwarmResult,
  type AgentSwarmResult,
  type ConsensusResult,
  type CompetitionResult,
  type CollaborationResult
} from "./SwarmExecutor.js";

// Event Bus - Pub/Sub Messaging
export {
  eventBus as eventBusEngine,
  EventBus as EventBusEngine,
  emit,
  on,
  once,
  off,
  EventTypes,
  type EventPriority,
  type EventCategory,
  type PrismEvent,
  type EventSubscription,
  type SubscriptionOptions,
  type EventHandler,
  type EventStats,
  type EventHistoryEntry
} from "./EventBus.js";

// Hook Engine & Lifecycle Management
export {
  hookEngine,
  HookEngine,
  eventBus,
  EventBus,
  registerHook,
  executeHooks,
  emitEvent,
  createCognitiveHook,
  type HookPhase,
  type HookPriority,
  type CognitivePattern,
  type HookDefinition,
  type HookHandler,
  type HookFilter,
  type HookContext,
  type HookResult,
  type EventDefinition,
  type HookChainResult,
  type EventBusStats
} from "./HookEngine.js";

// Skill Executor & Knowledge Integration (Session 5.1)
export {
  skillExecutor,
  SkillExecutor,
  type SkillLoadResult,
  type SkillRecommendation,
  type SkillChain,
  type SkillUsageRecord,
  type TaskAnalysis,
  type SkillExecutorConfig
} from "./SkillExecutor.js";

// Script Executor & Automation (Session 5.2)
export {
  scriptExecutor,
  ScriptExecutor,
  type ExecutionParams,
  type ExecutionOptions,
  type ExecutionResult,
  type QueuedExecution,
  type ScriptRecommendation as ScriptExecRecommendation,
  type ExecutorConfig
} from "./ScriptExecutor.js";

// Knowledge Query Engine (Session 5.3)
export {
  knowledgeEngine,
  KnowledgeQueryEngine,
  type RegistryType,
  type UnifiedSearchResult,
  type CrossRegistryQuery,
  type CrossRegistryResult,
  type FormulaQueryResult,
  type KnowledgeRelation,
  type QueryPlan,
  type QueryStep,
  type KnowledgeEngineConfig
} from "./KnowledgeQueryEngine.js";

// Thread Calculation Engine (Session 7.1)
export {
  threadEngine,
  ThreadCalculationEngine,
  type ThreadStandard,
  type ThreadType,
  type ThreadClass,
  type ThreadProfile,
  type ThreadFormData,
  type ThreadLimits,
  type ThreadResult,
  type TappingParams,
  type TappingResult,
  type ThreadMillingResult
} from "./ThreadCalculationEngine.js";

// Collision Detection Engine (Session 7.2)
export {
  collisionEngine,
  CollisionEngine,
  Vector3,
  Matrix4,
  Quaternion,
  AABB,
  OBB,
  Capsule,
  type ToolAssembly,
  type ToolHolder,
  type MachineEnvelope,
  type Fixture,
  type Workpiece,
  type Toolpath,
  type ToolpathMove,
  type CollisionResult,
  type CollisionReport,
  type NearMissResult,
  type CollisionGeometry
} from "./CollisionEngine.js";

// Workholding Validation Engine (Session 7.3)
export {
  workholdingEngine,
  WorkholdingEngine,
  type CuttingForces as WorkholdingCuttingForces,
  type WorkholdingType,
  type SurfaceCondition,
  type WorkholdingDevice,
  type WorkpieceSpec,
  type ClampConfiguration,
  type ClampLocation,
  type SupportLocation,
  type MachiningOperation,
  type VacuumFixtureSpec,
  type MagneticChuckSpec,
  type ClampForceResult,
  type PulloutResult,
  type LiftoffResult,
  type DeflectionResult as WorkholdingDeflectionResult,
  type VacuumValidationResult,
  type WorkholdingValidationResult
} from "./WorkholdingEngine.js";

// Tool Breakage Prediction Engine (Session 7.4)
export {
  toolBreakageEngine,
  ToolBreakageEngine,
  type ToolMaterial,
  type ToolGeometry,
  type ToolMaterialProperties,
  type CuttingConditions as BreakageCuttingConditions,
  type CuttingForces as BreakageCuttingForces,
  type StressResult,
  type DeflectionResult as ToolDeflectionResult,
  type ChipLoadResult,
  type FatigueResult,
  type BreakagePrediction,
  type SafeCuttingLimits
} from "./ToolBreakageEngine.js";

// Spindle Load Protection Engine (Session 7.5)
export {
  spindleProtectionEngine,
  SpindleProtectionEngine,
  type SpindleType,
  type BearingType,
  type CoolingType,
  type SpindleSpec,
  type SpindleState,
  type CuttingRequirements,
  type TorqueCheckResult,
  type PowerCheckResult,
  type SpeedCheckResult,
  type ThermalCheckResult,
  type SpindleEnvelopeResult
} from "./SpindleProtectionEngine.js";

// Coolant Validation Engine (Session 7.6)
export {
  coolantValidationEngine,
  CoolantValidationEngine,
  type CoolantDelivery,
  type CoolantType,
  type CoolantOperation,
  type CoolantSystem,
  type ToolCoolantSpec,
  type OperationParams,
  type FlowValidationResult,
  type PressureValidationResult,
  type ChipEvacuationResult,
  type MQLValidationResult,
  type CoolantValidationResult
} from "./CoolantValidationEngine.js";
