/**
 * PRISM MCP Server - Engines Index v13
 * Re-exports 150 active calculation, orchestration, and infrastructure engines
 * Updated: 2026-03-03 audit — 218 total .ts files, 150 exported, 68 unwired on disk
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
  type ThreadType,
  type ThreadSpec,
  type TapDrillResult,
  type ThreadMillResult,
  type StrippingResult,
  type GaugeResult
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

// ============================================================================
// R1-AUDIT-T1: Previously missing barrel exports (19 engines)
// ============================================================================

// Batch Processor (class not exported — singleton only)
export { batchProcessor } from "./BatchProcessor.js";

// Certificate Engine — F4 Formal Verification
export { certificateEngine, CertificateEngine } from "./CertificateEngine.js";

// Compliance Engine — F8 Regulatory Templates
export { complianceEngine, ComplianceEngine } from "./ComplianceEngine.js";

// Computation Cache (class not exported — singleton only)
export { computationCache } from "./ComputationCache.js";

// Diff Engine (class not exported — singleton only)
export { diffEngine } from "./DiffEngine.js";

// Hook Executor — executes registered hooks
export {
  hookExecutor,
  HookExecutor,
  type HookContext as HookExecutorContext,
  type HookResult as HookExecutorResult,
} from "./HookExecutor.js";

// Manus ATCS Bridge — functional module (no class)
export {
  delegateUnits,
  pollResults,
  getDelegationStatus,
  getActiveDelegations,
  clearCompletedDelegations,
  getBridgeStatus,
} from "./ManusATCSBridge.js";

// Memory Graph Engine — F2 Cross-Session Memory
export { memoryGraphEngine, MemoryGraphEngine } from "./MemoryGraphEngine.js";

// Multi-Tenant Engine — F5 Tenant Isolation
export { multiTenantEngine, MultiTenantEngine } from "./MultiTenantEngine.js";

// NL Hook Engine — F6 Natural Language Hook Authoring
export { nlHookEngine, NLHookEngine } from "./NLHookEngine.js";

// PFP Engine — F1 Predictive Failure Prevention
export { pfpEngine, PFPEngine } from "./PFPEngine.js";

// Predictive Failure Engine (legacy PFP variant — aliased to avoid name collision)
export {
  PredictiveFailureEngine,
  pfpEngine as predictiveFailureEngineInstance,
} from "./PredictiveFailureEngine.js";

// Protocol Bridge Engine — F7 Multi-protocol Gateway
export { protocolBridgeEngine, ProtocolBridgeEngine } from "./ProtocolBridgeEngine.js";

// Response Template Engine (no singleton export — class + functions)
export {
  ResponseTemplateEngine,
  autoResponseTemplate,
  getResponseTemplateStats,
} from "./ResponseTemplateEngine.js";

// Session Lifecycle Engine — session quality tracking (functions, no singleton)
export {
  SessionLifecycleEngine,
  recordSessionToolCall,
  recordSessionHook,
  recordSessionSkillInjection,
  recordSessionTemplateMatch,
  recordSessionPressure,
  recordSessionCheckpoint,
  recordSessionCompactionRecovery,
  recordSessionError,
  getSessionQualityScore,
  writeSessionIncrementalPrep,
  getSessionMetrics,
} from "./SessionLifecycleEngine.js";

// Skill Auto Loader — phase-based skill loading (functions, no class)
export {
  autoLoadForTask,
  getLoadedExcerptsBlock,
  clearSkillCache,
} from "./SkillAutoLoader.js";

// Skill Bundle Engine — bundle type definition only
export { type SkillBundle, getAllBundles, getBundle, getBundlesForAction, getBundlesForDomain, listBundles } from "./SkillBundleEngine.js";

// Task Agent Classifier — task routing (functions, no class)
export {
  classifyTask,
  quickClassify,
} from "./TaskAgentClassifier.js";

// Telemetry Engine — F3 Dispatcher Telemetry
export { telemetryEngine, TelemetryEngine } from "./TelemetryEngine.js";

// Intelligence Engine — R3 Compound Actions (11 intelligence actions) + AI/ML Source Catalog
export {
  intelligenceEngine,
  executeIntelligenceAction,
  INTELLIGENCE_ACTIONS,
  INTELLIGENCE_SOURCE_FILE_CATALOG,
  getSourceFileCatalog,
  catalogSourceFiles,
  type IntelligenceAction,
  type IntelligenceSourceEntry,
  type JobPlanInput,
  type JobPlanResult,
  type JobPlanOperation,
  type FeatureType as IntelligenceFeatureType,
} from "./IntelligenceEngine.js";

// Tolerance Engine — R3-P2 ISO 286 Tolerance Analysis
export {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  calculateCpk,
  findAchievableGrade,
  type ITGradeResult,
  type FitAnalysisResult,
  type FitLimit,
  type StackDimension,
  type StackUpResult,
  type CpkResult,
} from "./ToleranceEngine.js";

// G-Code Template Engine — R3-P2 Parametric G-Code Generation
export {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
  SUPPORTED_CONTROLLERS,
  SUPPORTED_OPERATIONS,
  type ControllerFamily,
  type GCodeOperation,
  type GCodeParams,
  type GCodeResult,
} from "./GCodeTemplateEngine.js";

// Decision Tree Engine — R3-P2 Manufacturing Decision Logic (6 trees)
export {
  decide,
  selectToolType,
  selectInsertGrade,
  selectCoolantStrategy,
  selectWorkholding,
  selectStrategy,
  selectApproachRetract,
  listDecisionTrees,
  normalizeISOGroup,
  DECISION_TREES,
  type DecisionResult,
  type ToolTypeDecision,
  type InsertGradeDecision,
  type CoolantDecision,
  type WorkholdingDecision,
  type StrategyDecision,
  type ApproachRetractDecision,
} from "./DecisionTreeEngine.js";

// Report Renderer — R3-P2 Manufacturing Report Templates (7 report types)
export {
  renderReport,
  listReportTypes,
  REPORT_TYPES,
  type ReportType,
  type ReportResult,
} from "./ReportRenderer.js";

// Campaign Engine — R3-MS3 Batch Machining Campaign Orchestrator
export {
  createCampaign,
  validateCampaign as validateCampaignConfig,
  optimizeCampaign,
  estimateCycleTime as estimateCampaignCycleTime,
  listCampaignActions,
  CAMPAIGN_ACTIONS,
  type CampaignMaterial,
  type CampaignOperation,
  type CampaignConfig,
  type OperationResult as CampaignOperationResult,
  type CumulativeSafety,
  type MaterialCampaignResult,
  type CampaignResult,
  type OptimizationTarget,
  type OptimizedCampaign,
  type CycleTimeEstimate as CampaignCycleTimeEstimate,
} from "./CampaignEngine.js";

// Inference Chain Engine — R3-MS4.5-T2 Server-Side Multi-Step Reasoning
export {
  runInferenceChain,
  analyzeAndRecommend,
  deepDiagnose,
  listChainTypes,
  CHAIN_ACTIONS,
  type InferenceChainConfig,
  type InferenceChainResult,
  type ChainStep,
  type ChainStepType,
  type StepResult,
  type AnalysisResult,
  type DiagnosisResult,
} from "./InferenceChainEngine.js";

// Physics Prediction Engine — R7-MS0 Surface Integrity, Chatter, Thermal, Coupled Models
export {
  physicsPrediction,
  predictSurfaceIntegrity,
  predictChatter,
  predictThermalCompensation,
  unifiedMachiningModel,
  couplingSensitivity,
  type SurfaceIntegrityInput,
  type SurfaceIntegrityResult,
  type ChatterInput,
  type ChatterResult as PhysicsChatterResult,
  type ThermalCompInput,
  type ThermalCompResult,
  type UnifiedMachiningInput,
  type UnifiedMachiningResult,
  type SensitivityInput,
  type SensitivityResult,
  type OperationType as PhysicsOperationType,
  type ToolMaterial as PhysicsToolMaterial,
  type CoolantType as PhysicsCoolantType,
} from "./PhysicsPredictionEngine.js";

// Optimization Engine — R7-MS1 Constrained Multi-Objective Optimization
export {
  optimization,
  optimizeParameters,
  optimizeSequence,
  sustainabilityReport,
  ecoOptimize,
  type FeatureType as OptFeatureType,
  type ObjectiveType,
  type SequenceObjective,
  type OptimizeInput,
  type OptimizeResult,
  type SequenceInput,
  type SequenceResult,
  type SustainabilityInput,
  type SustainabilityResult as OptSustainabilityResult,
  type EcoOptimizeInput,
  type EcoOptimizeResult,
} from "./OptimizationEngine.js";

// Workholding Intelligence Engine — R7-MS2 Fixture Selection & Clamping Analysis
export {
  workholdingIntelligence,
  fixtureRecommend,
  type PartShape,
  type FixtureType as IntelFixtureType,
  type FixtureInput,
  type FixtureResult,
} from "./WorkholdingIntelligenceEngine.js";

// Job Learning Engine — R7-MS3 Adaptive Manufacturing Intelligence
export {
  jobLearning,
  jobRecord,
  jobInsights,
  clearJobStore,
  getJobStoreSize,
  type ToolFailureMode,
  type JobRecordInput,

  type JobRecordResult,
  type JobInsightsInput,
  type JobInsightsResult,
  type Pattern as LearningPattern,
  type ParameterAdjustment,
} from "./JobLearningEngine.js";

// Algorithm Gateway Engine — R7-MS4 MIT/Stanford Course Integration
export {
  algorithmGateway,
  algorithmSelect,
  type ProblemType,
  type DomainType,
  type AlgorithmSelectInput,
  type AlgorithmSelectResult,
  type FFTInput,
  type FFTResult,
  type BayesianInput,
  type BayesianResult,
  type GradientDescentInput,
  type GradientDescentResult,
  type InterpolationInput,
  type InterpolationResult,
  type MonteCarloInput,
  type MonteCarloResult,
  type TopoSortInput,
  type TopoSortResult,
  type KalmanInput,
  type KalmanResult,
  type EigenInput,
  type EigenResult,
  type PIDInput,
  type PIDResult,
} from "./AlgorithmGatewayEngine.js";

// Algorithm Engine — L1-P2-MS1: Typed Algorithm<I,O> management (50 algorithms)
export {
  AlgorithmEngine,
  algorithmEngine,
  type AlgorithmCalculateInput,
  type AlgorithmCalculateResult,
  type AlgorithmValidateResult,
  type AlgorithmListResult,
  type AlgorithmBatchInput,
  type AlgorithmBatchResult,
  type AlgorithmBenchmarkResult,
} from "./AlgorithmEngine.js";

// Shop Scheduler Engine — R7-MS5 Shop Floor Optimization
export {
  shopScheduler,
  shopSchedule,
  machineUtilization,
  type OperationInput,
  type JobInput,
  type MachineInput,
  type OptimizeFor,
  type ShopScheduleInput,
  type ShopScheduleResult,
  type Assignment,
  type MachineSchedule,
  type ScheduleMetrics,
  type MachineUtilizationInput,
  type MachineUtilizationResult,
} from "./ShopSchedulerEngine.js";

// Intent Decomposition Engine — R8-MS0 Natural Language → Execution Plan
export {
  intentEngine,
  decomposeIntent,
  type ExtractedEntities,
  type ExecutionStep,
  type Persona,
  type IntentDecomposition,
} from "./IntentDecompositionEngine.js";

// Response Formatter Engine — R8-MS1 Persona-Adaptive Formatting
export {
  responseFormatter,
  formatForPersona,
  detectPersona as detectResponsePersona,
  detectUnits,
  type Persona as ResponsePersona,
  type UnitSystem as FormatterUnitSystem,
  type FormatOptions,
  type FormattedResponse,
  type FormattedSection,
} from "./ResponseFormatterEngine.js";

// Workflow Chains Engine — R8-MS2 Pre-Built Manufacturing Workflows
export {
  workflowChains,
  matchWorkflows,
  findBestWorkflow,
  getWorkflow,
  listWorkflows,
  getAllWorkflows,
  type WorkflowId,
  type WorkflowPersona,
  type WorkflowStep,
  type WorkflowDefinition,
  type WorkflowMatch,
  type WorkflowListItem,
} from "./WorkflowChainsEngine.js";

// Onboarding Engine — R8-MS3 Progressive Disclosure & Welcome Flow
export {
  onboardingEngine,
  generateWelcome,
  getDisclosureSuggestion,
  recordInteraction,
  getOnboardingState,
  resetSession,
  getCommonMaterials,
  type DisclosureLevel,
  type UserProfile,
  type OnboardingState,
  type WelcomeMessage,
  type DisclosureSuggestion,
} from "./OnboardingEngine.js";

// Setup Sheet Generation (R8-MS4)
export {
  setupSheetEngine,
  buildSetupSheet,
  type SetupSheetFormat,
  type SetupSheetHeader,
  type SetupSheetOperation,
  type SetupSheetTool,
  type SetupSheetSummary,
  type SetupSheet,
} from "./SetupSheetEngine.js";

// Conversational Memory & Context (R8-MS5)
export {
  conversationalMemory,
  detectTransition,
  transitionState,
  startJob,
  updateJob,
  findJob,
  resumeJob,
  getActiveJob,
  getConversationContext,
  getRecentJobs,
  completeJob,
  resetConversation,
  type ConversationState,
  type JobContext,
  type ConversationContext,
  type ResponseStyle,
} from "./ConversationalMemoryEngine.js";

// User Workflow Skills (R8-MS6)
export {
  userWorkflowSkills,
  getAllSkills,
  getSkillById,
  searchSkills,
  matchSkill,
  getSkillsByCategory,
  getSkillSteps,
  getSkillForPersona,
  type WorkflowSkill,
  type SkillStep,
  type PersonaAdaptation,
} from "./UserWorkflowSkillsEngine.js";

// User Assistance Skills (R8-MS7)
export {
  userAssistanceSkills, getAllAssistanceSkills, getAssistanceSkillById,
  searchAssistanceSkills, matchAssistanceSkill,
  explainPhysics, assessConfidence, getCommonMistakes, generateSafetyReport,
  type AssistanceSkill, type PhysicsExplanation, type ConfidenceReport,
  type AlternativeOption, type SafetyReport, type CommonMistake,
} from "./UserAssistanceSkillsEngine.js";

// Machine Connectivity (R9-MS0)
export {
  machineConnectivity, registerMachine, unregisterMachine, listMachines, getMachine,
  connectMachine, disconnectMachine, ingestLiveData, getLiveStatus, getAllMachineStatuses,
  detectChatter, startToolWearMonitor, updateToolWear, getToolWear,
  updateThermalState, getThermalState, acknowledgeAlert, getAlertHistory,
  type MachineState, type ProtocolType, type AlertSeverity, type AlertType,
  type MachineConfig, type MachinePosition, type MachineLiveData,
  type MachineAlert, type MachineLiveStatus, type ChatterResult as MachineChatterResult,
  type ToolWearStatus, type ThermalDriftStatus,
} from "./MachineConnectivityEngine.js";

// CAM Integration (R9-MS1)
export {
  camIntegration, searchToolLibrary, getToolFromLibrary, getAllTools,
  type CAMSystem, type OperationType as CAMOperationType, type UnitSystem as CAMUnitSystem,
  type CAMOperation, type CAMRecommendation, type CAMParameterExport,
  type ToolLibraryEntry,
} from "./CAMIntegrationEngine.js";

// DNC Transfer (R9-MS2)
export {
  dncTransfer, generateParameterBlock, executeDNCTransfer, generateQRData,
  getTransferHistory, getTransferById,
  type DNCSystem, type TransferAction, type TransferStatus, type ControllerType as DNCControllerType,
  type GCodeParameterBlock, type DNCTransferRequest, type DNCTransferResult,
  type ParameterMismatch, type QRCodeData,
} from "./DNCTransferEngine.js";

// Mobile Interface (R9-MS3)
export {
  mobileInterface, quickLookup, processVoiceQuery, decodeAlarm,
  startToolTimer, checkToolTimer, resetToolTimer, listToolTimers,
  generateOfflineCache,
  type DisplaySize, type StatusColor, type TimerState,
  type QuickLookupResult, type MobileDisplay, type VoiceQueryResult,
  type AlarmQuickDecode, type ToolLifeTimer, type OfflineCacheBundle, type CacheEntry as MobileCacheEntry,
} from "./MobileInterfaceEngine.js";

// ERP Integration (R9-MS4)
export {
  erpIntegration, importWorkOrder, recordCostFeedback, importQualityData,
  type ERPSystem, type WorkOrderStatus, type CostCategory,
  type WorkOrder, type RoutingStep, type PRISMPlan, type PRISMRoutingStep,
  type CostBreakdown, type CostFeedback, type CostVariance,
  type ToolInventoryItem, type QualityRecord, type QualityMeasurement,
} from "./ERPIntegrationEngine.js";

// Measurement & Inspection Integration (R9-MS5)
export {
  measurementIntegration, importCMMData, compareSurfaceFinish,
  recordProbeData, analyzeDrift, detectCalibrationBias,
  type MeasurementSource, type DriftDirection,
  type DimensionalMeasurement, type CMMReport, type CMMSummary,
  type SurfaceFinishResult as MeasureSurfaceFinishResult,
  type ProbingData, type DriftAnalysis, type CalibrationBias,
} from "./MeasurementIntegrationEngine.js";

// Inverse Problem Solving (R10-Rev2)
export {
  inverseSolver,
  type InverseProblemType, type Severity, type Confidence,
  type InverseProblemInput, type RootCause, type Fix,
  type InverseSolution,
} from "./InverseSolverEngine.js";

// Failure Forensics (R10-Rev5)
export {
  failureForensics,
  type ToolFailureMode as ForensicToolFailureMode, type ChipType, type SurfaceDefect, type CrashType,
  type ForensicDiagnosis, type CorrAction,
} from "./FailureForensicsEngine.js";

// Machinist's Apprentice (R10-Rev7)
export {
  apprenticeEngine,
  type SkillLevel, type LessonTrack,
  type Lesson, type SkillAssessment, type KnowledgeEntry,
  type ExplainResult, type ExplainFactor, type ChallengeExercise,
} from "./ApprenticeEngine.js";

// Manufacturing Genome (R10-Rev1)
export {
  manufacturingGenome,
  type HeatTreatment, type ChipFormation,
  type Composition, type MechanicalFingerprint, type ThermalFingerprint,
  type MachinabilityFingerprint, type SurfaceIntegrityResponse, type BehavioralPattern,
  type GenomeRecord, type GenomePrediction, type SimilarityResult,
} from "./ManufacturingGenomeEngine.js";

// Predictive Maintenance (R10-Rev6)
export {
  predictiveMaintenance,
  type MaintenanceCategory, type SeverityLevel,
  type DataPoint, type TrendResult, type PredictionResult as MaintenancePredictionResult,
  type MaintenanceAlert, type MaintenanceModel,
} from "./PredictiveMaintenanceEngine.js";

// Sustainability Optimization (R10-Rev8)
export {
  sustainabilityEngine,
  type OptimizationMode, type CoolantStrategy, type StockType,
  type EnergyBreakdown, type CarbonBreakdown, type SustainabilityResult as GreenSustainabilityResult,
  type OperationMetrics, type SavingsMetrics, type NearNetShapeResult,
  type StockOption, type CoolantAnalysis,
} from "./SustainabilityEngine.js";

// Generative Process Planning (R10-Rev3)
export {
  generativeProcess,
  type FeatureType as ProcessFeatureType, type AccessDirection, type OperationPhase, type ToolType,
  type FeatureInput, type RecognizedFeature, type Setup, type PlannedOperation,
  type ToolSelection as ProcessToolSelection, type CuttingParams,
  type ProcessPlan, type CostBreakdown as ProcessCostBreakdown, type RiskSummary,
} from "./GenerativeProcessEngine.js";

// Manufacturing Knowledge Graph (R10-Rev10)
export {
  knowledgeGraph,
  type NodeType, type EdgeType, type GraphNode, type GraphEdge,
  type QueryResult as GraphQueryResult, type InferenceResult as GraphInferenceResult,
  type DiscoveryResult as GraphDiscoveryResult, type PredictionResult as GraphPredictionResult,
} from "./KnowledgeGraphEngine.js";

export {
  federatedLearning,
  type FedMaterialClass, type FedMachineClass, type FedToolClass,
  type FedOperationClass, type FedStrategyName,
  type CorrectionFactor, type Contribution, type AnonymizationReport,
  type NetworkStats, type OptControl, type TransparencyEntry,
} from "./FederatedLearningEngine.js";

export {
  adaptiveControl,
  type ControllerType as AdaptiveControllerType, type AdaptiveMode, type OverrideChannel, type AlertLevel,
  type SensorReading, type OverrideCommand, type AdaptiveState,
  type ChiploadResult, type ChatterResult as AdaptiveChatterResult, type WearResult, type ThermalResult as AdaptiveThermalResult,
  type AdaptiveConfig,
} from "./AdaptiveControlEngine.js";

// Product Engines — R11 Product Packaging
export {
  productSFC,
  productPPG,
  productShop,
  productACNC,
  type ProductTier, type SFCAction, type PPGAction, type ShopAction, type ACNCAction,
  type ProductAction, type SFCInput, type SFCResult, type SFCCompareResult, type SFCOptimizeResult,
} from "./ProductEngine.js";

// Roadmap Executor — Parallel Execution Protocol Engine
export {
  roadmapExecutor,
  RoadmapExecutorEngine,
  buildDependencyDAG,
  getReadyUnits,
  getReadyUnitsInPhase,
  getReadyUnitsGlobal,
  planPhaseExecution,
  planRoadmapExecution,
  createInitialPosition,
  getCompletedIds,
  advancePosition,
  checkPhaseGate as checkRoadmapPhaseGate,
  summarizePlan,
  getNextBatch,
  validateBatch,
  type DAGNode,
  type DependencyDAG,
  type ExecutionBatch,
  type PhaseExecutionPlan,
  type RoadmapExecutionPlan,
  type BatchResult,
  type GateResult,
  type GateCheck,
} from "./RoadmapExecutor.js";

// ──────────────────────────────────────────────────────────────
// L2-P0-MS1 — 8 Monolith Engine Ports
// ──────────────────────────────────────────────────────────────

// CAD File Import / Export
export {
  FileIOEngine,
  fileIOEngine,
  type CADFormat,
  type STEPEntityCategory,
  type STEPEntity,
  type STEPHeader,
  type STEPParseResult,
  type IGESEntityType,
  type IGESEntity,
  type IGESParseResult,
  type STLParseResult,
  type DXFEntityType,
  type DXFEntity,
  type DXFLayer,
  type DXFParseResult,
  type ParseResult as FileIOParseResult,
  type Vec3 as FileIOVec3,
  type Triangle as FileIOTriangle,
  type BoundingBox as FileIOBoundingBox,
} from "./FileIOEngine.js";

// G-code Simulation & Collision Detection
export {
  SimulationEngine,
  simulationEngine,
  type SimulationMode,
  type MoveType,
  type ToolDefinition as SimToolDefinition,
  type MachineDefinition as SimMachineDefinition,
  type StockDefinition,
  type SimulatedMove,
  type CollisionEvent as SimCollisionEvent,
  type SimulationResult,
  type Vec3 as SimVec3,
} from "./SimulationEngine.js";

// 3D Visualization Data Pipeline
export {
  VisualizationEngine,
  visualizationEngine,
  type ViewPreset,
  type ColorMode,
  type RenderMode,
  type CameraConfig,
  type MeshData,
  type ToolpathLineData,
  type SceneNode,
  type SceneGraph,
  type HeatmapConfig,
  type Vec3 as VizVec3,
  type Vec4 as VizVec4,
  type Color as VizColor,
} from "./VisualizationEngine.js";

// Manufacturing AI / ML Intelligence
export {
  AIMLEngine,
  aimlEngine,
  type ModelType as AIModelType,
  type ModelStatus as AIModelStatus,
  type ManufacturingDomain,
  type ModelMetadata,
  type PredictionInput,
  type PredictionResult as AIPredictionResult,
  type TrainingInput,
  type TrainingResult,
  type ClusterInput,
  type ClusterResult,
  type IntentResult,
  type AnomalyResult,
} from "./AIMLEngine.js";

// Computational Geometry & B-Rep Kernel
export {
  CADKernelEngine,
  cadKernelEngine,
  type Vec2 as CADVec2,
  type Vec3 as CADVec3,
  type Vec4 as CADVec4,
  type Mat4 as CADMat4,
  type Quaternion as CADQuaternion,
  type Ray as CADRay,
  type Plane as CADPlane,
  type AABB as CADAABB,
  type NURBSCurve,
  type NURBSSurface,
  type BSplineCurve,
  type BezierCurve,
  type BRepVertex,
  type BRepEdge,
  type BRepFace,
  type BRepShell,
  type BRepSolid,
  type Triangle as CADTriangle,
  type Mesh as CADMesh,
  type CSGOperation,
  type CSGResult,
  type ConvexHullResult,
  type VoronoiResult,
} from "./CADKernelEngine.js";

// CadQuery Bridge (Python ↔ TypeScript IPC)
export {
  CadBridge,
  getCadBridge,
  type CadGeometryRequest,
  type CadGeometryResult,
  type CadValidationResult,
  type CadExportResult,
  type CadAnalysisResult,
} from "./CadBridge.js";

// CAM Toolpath Generation & G-code (SAFETY CRITICAL)
export {
  CAMKernelEngine,
  camKernelEngine,
  type ToolpathMoveType,
  type ToolpathMove as CAMToolpathMove,
  type ToolpathStats,
  type Toolpath as CAMToolpath,
  type OperationType as CAMKernelOpType,
  type MaterialType as CAMMaterialType,
  type EntryStrategy,
  type ExitStrategy,
  type ControllerType as CAMControllerType,
  type ToolSpec as CAMToolSpec,
  type ChipThinningResult,
  type EngagementResult as CAMEngagementResult,
  type EntryParams,
  type HelixEntryParams,
  type GCodeParams as CAMGCodeParams,
  type GCodeProgram,
  type CollisionCheckResult as CAMCollisionCheckResult,
  type Vec2 as CAMVec2,
  type Vec3 as CAMVec3,
  type ClearancePlaneConfig,
  type SequencedOperation,
  type SequenceResult as CAMSequenceResult,
} from "./CAMKernelEngine.js";

// Report Generation (Setup Sheets, Process Plans, Cost Estimates)
export {
  ReportEngine,
  reportEngine,
  type ReportType as ReportEngineType,
  type ReportMeta,
  type SetupSheetData,
  type ProcessPlanData,
  type CostEstimateData,
  type ToolListData,
  type InspectionPlanData,
  type AlarmReportData,
  type SpeedFeedCardData,
  type ReportData,
} from "./ReportEngine.js";

// Settings, Units & Presets
export {
  SettingsEngine,
  settingsEngine,
  type UnitSystem as SettingsUnitSystem,
  type AngleUnit,
  type PressureUnit,
  type TemperatureUnit,
  type UnitPreferences,
  type MachineDefaults,
  type CalculationPreset,
  type SafetySettings,
  type UserSettings,
} from "./SettingsEngine.js";

// ──────────────────────────────────────────────────────────────
// L2-P1-MS1 — 20 Manufacturing Intelligence Engines
// ──────────────────────────────────────────────────────────────

// Job Scheduling
export {
  SchedulingEngine,
  schedulingEngine,
  type Job as ScheduleJob,
  type MachineSlot,
  type ScheduleResult,
  type JobAssignment,
  type CapacityReport,
  type ScheduleStrategy,
} from "./SchedulingEngine.js";

// Quality Prediction (statistical process control)
export {
  QualityPredictionEngine,
  qualityPredictionEngine,
  type QualityInput,
  type QualityPrediction,
  type QualityFactor,
  type CpkResult as QualityCpkResult,
  type SurfaceRoughnessResult,
  type QualityRiskAssessment,
} from "./QualityPredictionEngine.js";

// --- Existing engines counted in L2-P1-MS1 ---
// PredictiveMaintenanceEngine (already exported above in original barrel)
// SetupSheetEngine (already exported above in original barrel)

// ============================================================================
// L2-P2-MS1: 16 CAD/CAM Engines
// ============================================================================

// Geometry Operations (high-level geometry: boolean, offset, fillet, analysis)
export {
  GeometryEngine,
  geometryEngine,
  type GeomPrimitiveType,
  type GeomPoint,
  type GeomPrimitive,
  type GeomTransform,
  type BoundingBox3D,
  type DistanceResult as GeomDistanceResult,
  type OffsetResult,
  type FilletResult,
  type GeomAnalysis,
  type BooleanOp,
  type BooleanResult,
} from "./GeometryEngine.js";

// Mesh Manipulation (generate, simplify, subdivide, analyze, repair)
export {
  MeshEngine,
  meshEngine,
  type MeshVertex,
  type MeshTriangle,
  type MeshData as MeshEngineData,
  type MeshQuality,
  type SimplifyResult,
  type SubdivideResult,
  type RepairResult,
  type MeshFormat,
} from "./MeshEngine.js";

// Feature Recognition (identify machining features from geometry)
export {
  FeatureRecognitionEngine,
  featureRecognitionEngine,
  type FeatureType,
  type RecognizedFeature as FRRecognizedFeature,
  type FeatureDimensions,
  type FeatureClassification,
  type FeatureGroup,
  type FeatureRecognitionResult,
} from "./FeatureRecognitionEngine.js";

// Toolpath Generation (feature→strategy→moves)
export {
  ToolpathGenerationEngine,
  toolpathGenerationEngine,
  type ToolpathStrategy,
  type CutDirection,
  type ToolpathParams,
  type ToolpathSegment,
  type GeneratedToolpath,
  type ToolpathOptimization,
  type ToolpathSimulation,
} from "./ToolpathGenerationEngine.js";

// Post-Processor (multi-controller G-code generation)
export {
  PostProcessorEngine,
  postProcessorEngine,
  type PostController,
  type PostConfig,
  type PostInput,
  type PostMove,
  type PostResult,
  type PostValidation,
} from "./PostProcessorEngine.js";

// Collision Detection — SAFETY CRITICAL (AABB broad + swept volume)
export {
  CollisionDetectionEngine,
  collisionDetectionEngine,
  type CollisionBody,
  type CollisionMove,
  type CollisionSeverity,
  type CollisionResult as CollisionDetectionResult,
  type CollisionDetail,
  type ClearanceCheck,
  type RapidSafetyCheck,
} from "./CollisionDetectionEngine.js";

// Stock Model (material removal tracking, buy-to-fly ratio)
export {
  StockModelEngine,
  stockModelEngine,
  type StockType as StockModelType,
  type StockDefinition as StockModelDefinition,
  type MaterialRemoval,
  type StockState,
  type StockAnalysis,
  type StockComparison,
} from "./StockModelEngine.js";

// Tool Assembly (holder + tool, stickout, runout, reach)
export {
  ToolAssemblyEngine,
  toolAssemblyEngine,
  type HolderType,
  type HolderSpec,
  type ToolSpec as AssemblyToolSpec,
  type ToolAssembly as ToolAssemblyDef,
  type AssemblyValidation,
  type ReachAnalysis,
} from "./ToolAssemblyEngine.js";

// Work Coordinate System (WCS setup, datum alignment, multi-part)
export {
  WorkCoordinateEngine,
  workCoordinateEngine,
  type WCSCode,
  type WCSOffset,
  type DatumPoint,
  type WCSSetup,
  type CoordTransform,
  type MultiPartSetup,
  type WCSValidation,
} from "./WorkCoordinateEngine.js";

// Dimensional Analysis — SAFETY CRITICAL (error budget, Cpk prediction)
export {
  DimensionalAnalysisEngine,
  dimensionalAnalysisEngine,
  type DimensionInput,
  type DimensionPrediction,
  type ErrorBudget,
  type DimensionValidation,
  type ToleranceBudget,
} from "./DimensionalAnalysisEngine.js";

// Tolerance Stack-up (worst-case, RSS, optimization)
export {
  ToleranceStackEngine,
  toleranceStackEngine,
  type StackMethod,
  type StackDimension as ToleranceStackDimension,
  type StackResult,
  type StackContributor,
  type StackOptimization,
} from "./ToleranceStackEngine.js";

// G-Code Optimization (analysis, rapid reduction, redundancy removal)
export {
  GCodeOptimizationEngine,
  gcodeOptimizationEngine,
  type GCodeLine,
  type GCodeAnalysis,
  type OptimizationResult as GCodeOptResult,
  type GCodeComparison,
} from "./GCodeOptimizationEngine.js";

// ============================================================================
// L2-P3-MS1: 16 Infrastructure Engines (#174-#189)
// ============================================================================

// Auth (SECURITY CRITICAL — JWT, RBAC, MFA)
export {
  AuthEngine,
  authEngine,
  type AuthUser,
  type AuthToken,
  type AuthSession,
  type AuthRole,
  type RoleDefinition,
  type AuthResult,
  type PermissionCheck,
} from "./AuthEngine.js";

// Tenant (multi-tenant isolation, quotas)
export {
  TenantEngine,
  tenantEngine,
  type Tenant,
  type TenantPlan,
  type TenantStatus,
  type TenantSettings,
  type TenantQuota,
  type TenantUsage,
  type TenantCreateInput,
} from "./TenantEngine.js";

// Export (PDF, CSV, Excel, DXF, STEP, G-code rendering)
export {
  ExportEngine,
  exportEngine,
  type ExportFormat,
  type ExportStatus as ExportJobStatus,
  type ExportJob,
  type ExportOptions,
  type ExportTemplate,
  type ExportStats,
} from "./ExportEngine.js";

// ============================================================================
// L2-P4-MS1: 52 PASS2 Specialty Engines (#190-#241)
// ============================================================================

// --- Batch 1: Surface Integrity & Metallurgy (6 engines) ---

// --- Batch 2: Vibration & Dynamics (5 engines) ---

// --- Batch 3: Thread & Gear Manufacturing (4 engines) ---

// Single-Point Threading (SAFETY CRITICAL)
export {
  SinglePointThreadEngine,
  singlePointThreadEngine,
  type InfeedMethod,
  type SPTInput,
  type SPTPass,
  type SPTPassPlan,
  type SPTValidation,
} from "./SinglePointThreadEngine.js";

// --- Batch 4: Sheet Metal & Fabrication (3 engines) ---

// --- Batch 5: Multi-Axis & Complex Kinematics (5 engines) ---

// RTCP Compensation (SAFETY CRITICAL)
export {
  RTCP_CompensationEngine,
  rtcpCompensationEngine,
  type KinematicType,
  type RTCPInput,
  type RTCPResult,
} from "./RTCP_CompensationEngine.js";

// Singularity Avoidance (SAFETY CRITICAL)
export {
  SingularityAvoidanceEngine,
  singularityAvoidanceEngine,
  type SingularityMap,
  type SingularityInput,
  type SingularityPoint,
  type SingularityResult,
} from "./SingularityAvoidanceEngine.js";

// Tilt Angle Optimization
export {
  TiltAngleOptimizationEngine,
  tiltAngleOptimizationEngine,
  type TiltAngleInput,
  type TiltAngleResult,
} from "./TiltAngleOptimizationEngine.js";

// Work Envelope Validator (SAFETY CRITICAL)
export {
  WorkEnvelopeValidatorEngine,
  workEnvelopeValidatorEngine,
  type AxisLimits,
  type EnvelopeInput,
  type EnvelopeViolation,
  type EnvelopeResult,
} from "./WorkEnvelopeValidatorEngine.js";

// Inverse Kinematics Solver
export {
  InverseKinematicsSolverEngine,
  inverseKinematicsSolverEngine,
  type IKInput,
  type IKSolution,
  type IKResult,
} from "./InverseKinematicsSolverEngine.js";

// --- Batch 6: Turning-Specific (5 engines) ---

// Chuck Jaw Force (SAFETY CRITICAL)
export {
  ChuckJawForceEngine,
  chuckJawForceEngine,
  type ChuckType as ChuckJawChuckType,
  type ChuckForceInput,
  type ChuckForceResult,
} from "./ChuckJawForceEngine.js";

// Tailstock Force (SAFETY CRITICAL)
export {
  TailstockForceEngine,
  tailstockForceEngine,
  type CenterType,
  type TailstockInput,
  type TailstockResult,
} from "./TailstockForceEngine.js";

// Bar Puller Timing
export {
  BarPullerTimingEngine,
  barPullerTimingEngine,
  type BarPullerInput,
  type BarPullerResult,
} from "./BarPullerTimingEngine.js";

// Live Tooling
export {
  LiveToolingEngine,
  liveToolingEngine,
  type LiveToolOp,
  type LiveToolInput,
  type LiveToolResult,
} from "./LiveToolingEngine.js";

// Steady Rest Placement
export {
  SteadyRestPlacementEngine,
  steadyRestPlacementEngine,
  type SteadyRestInput,
  type SteadyRestResult,
} from "./SteadyRestPlacementEngine.js";

// --- Batch 7: EDM-Specific (4 engines) ---

// Electrode Design
export {
  ElectrodeDesignEngine,
  electrodeDesignEngine,
  type ElectrodeMaterial,
  type ElectrodeDesignInput,
  type ElectrodeDesignResult,
} from "./ElectrodeDesignEngine.js";

// Wire EDM Settings
export {
  WireEDMSettingsEngine,
  wireEDMSettingsEngine,
  type WireType,
  type WireEDMInput,
  type WireEDMResult,
} from "./WireEDMSettingsEngine.js";

// EDM Surface Integrity (SAFETY CRITICAL)
export {
  EDMSurfaceIntegrityEngine,
  edmSurfaceIntegrityEngine,
  type EDMType,
  type EDMSurfaceInput,
  type EDMSurfaceResult,
} from "./EDMSurfaceIntegrityEngine.js";

// Micro EDM
export {
  MicroEDMEngine,
  microEDMEngine,
  type MicroEDMProcess,
  type MicroEDMInput,
  type MicroEDMResult,
} from "./MicroEDMEngine.js";

// --- Batch 8: Laser & Waterjet (3 engines) ---

// --- Batch 9: Automation & Industry 4.0 (5 engines) ---

// Digital Thread
export {
  DigitalThreadEngine,
  digitalThreadEngine,
  type ThreadNode,
  type ThreadLink,
  type DigitalThreadInput,
  type DigitalThreadResult,
} from "./DigitalThreadEngine.js";

// OEE Calculator
export {
  OEECalculatorEngine,
  oeeCalculatorEngine,
  type OEEInput,
  type OEEResult,
} from "./OEECalculatorEngine.js";

// Bottleneck Identification
export {
  BottleneckIdentificationEngine,
  bottleneckIdentificationEngine,
  type WorkCenter,
  type BottleneckInput,
  type BottleneckResult,
} from "./BottleneckIdentificationEngine.js";

// Digital Work Instruction
export {
  DigitalWorkInstructionEngine,
  digitalWorkInstructionEngine,
  type WorkInstructionStep,
  type WorkInstructionInput,
  type WorkInstructionResult,
} from "./DigitalWorkInstructionEngine.js";

// Shift Handoff
export {
  ShiftHandoffEngine,
  shiftHandoffEngine,
  type ShiftHandoffInput,
  type ShiftHandoffResult,
} from "./ShiftHandoffEngine.js";

// --- Batch 10: Coating & Surface Treatment (4 engines) ---

// --- Batch 11: Material Testing Interface (3 engines) ---

// --- Batch 12: Jig & Fixture Specific (5 engines) ---

// Modular Fixture Layout (3-2-1 principle)
export {
  ModularFixtureLayoutEngine,
  modularFixtureLayoutEngine,
  type GridSystem,
  type ModularFixtureInput,
  type LocatorPoint,
  type ClampPoint as FixtureClampPoint,
  type ModularFixtureResult,
} from "./ModularFixtureLayoutEngine.js";

// Previously unindexed but actively used engines
export {
  ContextBudgetEngine,
  type BudgetAllocation,
  type BudgetReport,
  type UsageRecord,
} from "./ContextBudgetEngine.js";

export {
  getAllCatalogs,
  searchCatalog,
  getEngineCatalog,
  getCatalogStats,
  type CatalogEntry,
} from "./SourceCatalogAggregator.js";

export {
  executeSwarmGroups,
  type TaskGroup,
  type GroupResult,
  type SwarmGroupResult,
} from "./SwarmGroupExecutor.js";

// ─── New Engines: FORGE-ENGINES (2026-03-01) ───────────────────────

export {
  toolWearProgressionEngine,
  ToolWearProgressionEngine,
  type WearProgressionInput,
  type WearProgressionResult,
  type WearStage,
  type ToolGrade,
} from "./ToolWearProgressionEngine.js";

export {
  grindingForceEngine,
  GrindingForceEngine,
  type GrindingForceInput,
  type GrindingForceResult,
  type GrindingMode,
} from "./GrindingForceEngine.js";

export {
  drillBreakthroughForceEngine,
  DrillBreakthroughForceEngine,
  type DrillBreakthroughInput,
  type DrillBreakthroughResult,
  type ExitSupport,
  type BurrRisk,
} from "./DrillBreakthroughForceEngine.js";

export {
  grindingSurfaceFinishEngine,
  GrindingSurfaceFinishEngine,
  type GrindingSurfaceFinishInput,
  type GrindingSurfaceFinishResult,
} from "./GrindingSurfaceFinishEngine.js";

export {
  drillCycleOptimizationEngine,
  DrillCycleOptimizationEngine,
  type DrillCycleInput,
  type DrillCycleResult,
  type DrillCycleType,
  type MaterialChipBehavior,
} from "./DrillCycleOptimizationEngine.js";

export {
  toolCoatingSelectionEngine,
  ToolCoatingSelectionEngine,
  type ToolCoatingInput,
  type ToolCoatingResult,
  type CoatingType,
  type MaterialClass,
} from "./ToolCoatingSelectionEngine.js";

export {
  toolGeometrySelectionEngine,
  ToolGeometrySelectionEngine,
  type ToolGeometryInput,
  type ToolGeometryResult,
  type EndMillMaterial,
  type MillingOperation,
} from "./ToolGeometrySelectionEngine.js";

export {
  insertGradeSelectionEngine,
  InsertGradeSelectionEngine,
  type InsertGradeInput,
  type InsertGradeResult,
  type WorkpieceMaterial,
  type TurningOp,
  type InsertShape,
} from "./InsertGradeSelectionEngine.js";

export {
  coolantStrategyEngine,
  CoolantStrategyEngine,
  type CoolantStrategyInput,
  type CoolantStrategyResult,
  type CoolantMaterial,
  type CoolantOperation as CoolantStrategyOperation,
  type CoolantMethod,
} from "./CoolantStrategyEngine.js";

// Wire existing RegenerativeChatterPredictor (was on-disk but unexported)
export {
  regenerativeChatterPredictor,
  RegenerativeChatterPredictor,
} from "./RegenerativeChatterPredictor.js";

// ─── New Engines: FORGE-ENGINES Round 2 (2026-03-01) ────────────

export {
  thermalGrowthCompensationEngine,
  ThermalGrowthCompensationEngine,
  type ThermalGrowthInput,
  type ThermalGrowthResult,
  type SpindleBearingType,
} from "./ThermalGrowthCompensationEngine.js";

export {
  boreFinishingEngine,
  BoreFinishingEngine,
  type BoreFinishingInput,
  type BoreFinishingResult,
  type HoningStoneGrit,
} from "./BoreFinishingEngine.js";

export {
  finishingPassOptimizationEngine,
  FinishingPassOptimizationEngine,
  type FinishingPassInput,
  type FinishingPassResult,
} from "./FinishingPassOptimizationEngine.js";

// ─── New Engines: FORGE-ENGINES Round 3 (2026-03-01) ────────────

export {
  turningForceEngine,
  TurningForceEngine,
  type TurningForceInput,
  type TurningForceResult,
  type TurningOperation,
} from "./TurningForceEngine.js";

export {
  tappingTorqueEngine,
  TappingTorqueEngine,
  type TappingTorqueInput,
  type TappingTorqueResult,
  type TapType,
  type HoleType,
} from "./TappingTorqueEngine.js";

export {
  cuttingPowerBudgetEngine,
  CuttingPowerBudgetEngine,
  type PowerBudgetInput,
  type PowerBudgetResult,
} from "./CuttingPowerBudgetEngine.js";

export {
  toolDeflectionPredictionEngine,
  ToolDeflectionPredictionEngine,
  type ToolDeflectionInput,
  type ToolDeflectionResult as BeamDeflectionResult,
  type ToolMaterialType,
} from "./ToolDeflectionPredictionEngine.js";

export {
  chipFormationPredictionEngine,
  ChipFormationPredictionEngine,
  type ChipFormationInput,
  type ChipFormationResult,
  type ChipType as ChipMorphologyType,
} from "./ChipFormationPredictionEngine.js";

export {
  specificCuttingEnergyEngine,
  SpecificCuttingEnergyEngine,
  type SpecificCuttingEnergyInput,
  type SpecificCuttingEnergyResult,
} from "./SpecificCuttingEnergyEngine.js";

// hyperMILL CAM Strategy & Safety (from pdf-learn forge-triple)
export {
  hyperMillStrategyEngine,
  HyperMillStrategyEngine,
  type GeometryType,
  type OperationGoal,
  type StrategyInput,
  type StrategyRecommendation,
  type StrategyEngineStats,
} from "./HyperMillStrategyEngine.js";

export {
  validateClearancePlane,
  validateNegativeAllowance,
  validateGeometryCheckEnabled,
  validateMeasurementSystem,
  validateTurningHPM,
  validateRestMaterialToolChange,
} from "./HyperMillSafetyHooks.js";

// hyperMILL Multi-Axis & Material Map (from HYPERMILL v33 installation)
export {
  hyperMillMultiAxisEngine,
  HyperMillMultiAxisEngine,
  type MultiAxisGeometry,
  type MultiAxisGoal,
  type MultiAxisInput,
  type MultiAxisRecommendation,
  type HyperMillDefaults,
  HYPERMILL_DEFAULTS,
  HYPERMILL_TURNING_DEFAULTS,
  HYPERMILL_IMPELLER_DEFAULTS,
  HYPERMILL_BLADE_DEFAULTS,
  HYPERMILL_5X_DRILLING_DEFAULTS,
} from "./HyperMillMultiAxisEngine.js";

export {
  hyperMillMaterialMapEngine,
  HyperMillMaterialMapEngine,
  type HyperMillMaterialGroup,
  type HyperMillSubgroup,
  type HyperMillQuality,
  type CutterMaterial,
  type MaterialMapResult,
  CUTTER_MATERIALS,
} from "./HyperMillMaterialMapEngine.js";

export {
  hyperMillCycleCatalogEngine,
  HyperMillCycleCatalogEngine,
  type CycleCategory,
  type HyperMillCycle,
} from "./HyperMillCycleCatalogEngine.js";

export {
  hyperMillControllerCatalogEngine,
  HyperMillControllerCatalogEngine,
  type ControllerFamily as HyperMillControllerFamily,
  type ControllerVariant,
  type ControllerMatch,
} from "./HyperMillControllerCatalogEngine.js";

export {
  hyperMillCycleDefaultsEngine,
  HyperMillCycleDefaultsEngine,
  type CycleDefaults,
  type CycleParam,
  type CycleCategory as HyperMillCycleCategory,
  FORMULA_VARIABLES,
  FRTYP_MAP,
} from "./HyperMillCycleDefaultsEngine.js";

export {
  hyperMillThreadStandardEngine,
  HyperMillThreadStandardEngine,
  type ThreadEntry,
  type ThreadStandard,
} from "./HyperMillThreadStandardEngine.js";

// ─── CAM Knowledge Portability (cross-CAM → any controller bridge) ─────
export {
  CamKnowledgePortabilityEngine,
  camKnowledgePortabilityEngine,
  type TargetController,
  type CamIntent,
  type CamSource,
  type PortabilityInput,
  type PortabilityResult,
  type StrategyRecommendation as PortabilityStrategyRecommendation,
  type ResolvedParameters,
  type MaterialContext,
  type ToolContext,
  type MachineContext,
} from "./CamKnowledgePortabilityEngine.js";

// ─── Multi-CAM Strategy Engine (Fusion/Mastercam/ESPRIT/NX/GibbsCAM/SurfCAM) ─
export {
  MultiCamStrategyEngine,
  multiCamStrategyEngine,
  type MultiCamSource,
  type CamGeometryType,
  type CamOperationGoal,
  type CamStrategyInput,
  type CamStrategyResult,
  type MultiCamStats,
} from "./MultiCamStrategyEngine.js";

// ─── Unwired Engine Batch (forge-learn wiring) ─────

// Gear Hobbing
export {
  GearHobbingEngine,
  gearHobbingEngine,
  type GearHobbingInput,
  type GearHobbingResult,
  type HobbingMethod,
} from "./GearHobbingEngine.js";

// Cryogenic Treatment
export {
  CryogenicTreatmentEngine,
  cryogenicTreatmentEngine,
  type CryoTreatmentInput,
  type CryoTreatmentResult,
  type CryoLevel,
} from "./CryogenicTreatmentEngine.js";

// Hardness Conversion (ASTM E140)
export {
  HardnessConversionEngine,
  hardnessConversionEngine,
  type HardnessConvertInput,
  type HardnessConvertResult,
  type HardnessScale,
} from "./HardnessConversionEngine.js";

// Bend Allowance (Sheet Metal)
export {
  BendAllowanceEngine,
  bendAllowanceEngine,
  type BendAllowanceInput,
  type BendAllowanceResult,
  type BendMethod,
} from "./BendAllowanceEngine.js";

// Anodize Allowance
export {
  AnodizeAllowanceEngine,
  anodizeAllowanceEngine,
  type AnodizeAllowanceInput,
  type AnodizeAllowanceResult,
  type AnodizeType,
} from "./AnodizeAllowanceEngine.js";

// Clamping Simulation (SAFETY CRITICAL)
export {
  ClampingSimEngine,
  clampingSimEngine,
  type ClampSimInput,
  type ClampPoint,
  type CuttingForceProfile,
} from "./ClampingSimEngine.js";

// Damping Optimization
export {
  DampingOptimizationEngine,
  dampingOptimizationEngine,
  type DampingInput,
  type DampingResult,
  type DampingStrategy,
} from "./DampingOptimizationEngine.js";

// Cost Estimation
export {
  CostEstimationEngine,
  costEstimationEngine,
  type CostInput,
  type CostBreakdown as EstimationCostBreakdown,
  type CostDriver,
} from "./CostEstimationEngine.js";

// ─── MIT 2.830J Process Control Engines (pdf-learn forge-triple) ─────

// Cycle-to-Cycle Feedback Control (Hardt/Siu)
export {
  analyzeCtCControl,
  findOptimalGain,
  analyzeAutocorrelation,
  type ControllerType as CtCControllerType,
  type DisturbanceType,
  type CtCProcessInput,
  type CtCResult,
  type CtCOptimalGainResult,
  type AutocorrelationResult,
} from "./CycleToControlEngine.js";

// Advanced SPC Charts: EWMA, CUSUM, Moving Average, Xbar-S
export {
  computeEWMA,
  computeCUSUM,
  computeMovingAverage,
  computeXbarS,
  type ChartType,
  type EWMAInput,
  type CUSUMInput,
  type MovingAverageInput,
  type XbarSInput,
  type ChartPoint,
  type SPCChartResult,
} from "./SPCChartingEngine.js";

// Design of Experiments: Factorial, Fractional Factorial, ANOVA
export {
  analyzeFactorial,
  generateFullFactorial,
  generateFractionalFactorial,
  type FactorDef,
  type ExperimentRun,
  type DOEInput,
  type EffectEstimate,
  type ANOVATable,
  type DOEResult,
  type DesignMatrix,
  type FractionalDesignResult,
} from "./DOEAnalysisEngine.js";

// ─── CNC Batch 1: DfM Rules Engine (pdf-learn forge-triple) ─────────

// Design for Manufacturability rules, face mill selection, deep hole technique
export {
  checkDfMRules,
  selectFaceMillGeometry,
  selectDeepHoleTechnique,
  estimateMachineCost,
  type DfMCheckInput,
  type DfMFeature,
  type DfMViolation,
  type DfMCheckResult,
  type FaceMillSelectionInput,
  type FaceMillRecommendation,
  type DeepHoleInput,
  type DeepHoleTechnique,
  type MachineCostEstimate,
} from "./DfMRulesEngine.js";

// Part-Off Force Calculation (Forge R3)
export {
  partOffForceEngine,
  PartOffForceEngine,
  type PartOffInput,
  type PartOffResult,
} from "./PartOffForceEngine.js";

// Roughness Scale Conversion (Forge R3)
export {
  roughnessConversionEngine,
  RoughnessConversionEngine,
  type RoughnessScale,
  type RoughnessConversionInput,
  type RoughnessConversionResult,
} from "./RoughnessConversionEngine.js";

// Peck Drilling Optimization (Forge R3)
export {
  peckDrillingOptimizationEngine,
  PeckDrillingOptimizationEngine,
  type DrillType,
  type PeckStrategy,
  type PeckDrillingInput,
  type PeckDrillingResult,
} from "./PeckDrillingOptimizationEngine.js";

// Advanced Chip Thickness (SolidCAM-derived empirical + analytical)
export {
  advancedChipThicknessEngine,
  AdvancedChipThicknessEngine,
  type ChipAnalysisInput,
  type ChipAnalysisResult,
  type BallNoseChipResult,
  type RoundInsertChipResult,
  type TrochoidalFeedResult,
} from "./AdvancedChipThicknessEngine.js";

// Engagement Geometry (corner spikes, curved boundary, trochoidal profiles)
export {
  engagementGeometryEngine,
  EngagementGeometryEngine,
  type CornerClassification,
  type EngagementSpikeResult,
  type CornerFeedResult,
  type CurvedBoundaryResult,
  type TrochoidalProfileResult,
  type IslandApproachResult,
  type MoatSpec,
  type EngagementValidation,
  type OptimalStepoverResult,
} from "./EngagementGeometryEngine.js";

// Feed Rate Optimization (engagement-aware, corner, constant chip load)
export {
  feedRateOptimizationEngine,
  FeedRateOptimizationEngine,
  type FeedOptimizationInput,
  type FeedOptimizationResult,
  type CornerFeedInput,
  type CornerFeedResult as FeedCornerResult,
  type FeedProfileResult,
  type ConstantChipLoadInput,
  type ConstantChipLoadResult,
} from "./FeedRateOptimizationEngine.js";

// Entry/Exit Strategy (helix, ramp, arc, plunge selection)
export {
  entryExitStrategyEngine,
  EntryExitStrategyEngine,
  type EntryMethod,
  type EntryStrategyInput,
  type EntryStrategyResult,
  type ExitStrategyResult,
} from "./EntryExitStrategyEngine.js";

// Z-Level Optimization (step-down, level transitions, rest machining)
export {
  zLevelOptimizationEngine,
  ZLevelOptimizationEngine,
  type ZLevelInput,
  type ZLevelResult,
  type RestMachiningInput,
  type RestMachiningResult,
  type LevelTransitionResult,
} from "./ZLevelOptimizationEngine.js";

// Toolpath Linking (path ordering, stay-down, rapid optimization)
export {
  toolpathLinkingEngine,
  ToolpathLinkingEngine,
  type PathSegment,
  type LinkingConfig,
  type LinkingResult,
} from "./ToolpathLinkingEngine.js";

// ─── Blueprint OCR & Print Reading Engines (forge-triple) ────────────
export {
  blueprintOCREngine,
  type DimensionType,
  type GDTSymbol,
  type ExtractedDimension,
  type ExtractedGDT,
  type TitleBlockData,
  type ExtractedNote,
  type BlueprintAnalysis,
} from "./BlueprintOCREngine.js";

export {
  printReadingEngine,
  type SetupSheetFromPrint,
  type InspectionPlanFromPrint,
  type RevisionComparison,
  type DxfDimensionResult,
} from "./PrintReadingEngine.js";

// ERP Engines — Employee, TimeClock, Payroll, Invoicing, ToolUsage, ActualCost
export { employeeEngine, EmployeeEngine } from "./EmployeeEngine.js";
export { timeClockEngine, TimeClockEngine } from "./TimeClockEngine.js";
export { payrollEngine, PayrollEngine } from "./PayrollEngine.js";
export { invoicingEngine, InvoicingEngine } from "./InvoicingEngine.js";
export { toolUsageEngine, ToolUsageEngine } from "./ToolUsageEngine.js";
export { actualCostEngine, ActualCostEngine } from "./ActualCostEngine.js";

// Quality Formulas (Gage R&R, sampling, capability, conformance)
export { qualityFormulasEngine, QualityFormulasEngine } from "./QualityFormulasEngine.js";

// AI/ML Formulas (feature importance, model selection, anomaly, reinforcement)
export { aimlFormulasEngine, AIMLFormulasEngine } from "./AIMLFormulasEngine.js";

// Fixture Dynamics (vacuum hold, chuck speed, adaptive clamping, 3-2-1)
export { fixtureDynamicsEngine, FixtureDynamicsEngine } from "./FixtureDynamicsEngine.js";

// Digital Twin Formulas (EKF predict/update, CUSUM drift, model divergence)
export { digitalTwinFormulasEngine, DigitalTwinFormulasEngine } from "./DigitalTwinFormulasEngine.js";

// Metrology Budget (expanded uncertainty, thermal compensation, conformance probability, guard band)
export { metrologyBudgetEngine, MetrologyBudgetEngine } from "./MetrologyBudgetEngine.js";

// Sustainability Formulas (carbon footprint, specific energy, coolant lifecycle, material utilization)
export { sustainabilityFormulasEngine, SustainabilityFormulasEngine } from "./SustainabilityFormulasEngine.js";
export { quoteEstimatorEngine, QuoteEstimatorEngine } from "./QuoteEstimatorEngine.js";
export { secondaryOpsEngine, SecondaryOpsEngine } from "./SecondaryOpsEngine.js";
export { quoteAnalyticsEngine, QuoteAnalyticsEngine } from "./QuoteAnalyticsEngine.js";
export { purchaseOrderEngine } from "./PurchaseOrderEngine.js";
export { generalLedgerEngine } from "./GeneralLedgerEngine.js";
export { capacityPlanningEngine } from "./CapacityPlanningEngine.js";
export { qualityManagementEngine } from "./QualityManagementEngine.js";
export { hrComplianceEngine } from "./HRComplianceEngine.js";
export { customerManagementEngine } from "./CustomerManagementEngine.js";
export { integrationAdapterEngine } from "./IntegrationAdapterEngine.js";
export { machineRateDatabaseEngine, MachineRateDatabaseEngine } from "./MachineRateDatabaseEngine.js";
export { blueprintToQuoteBridgeEngine, BlueprintToQuoteBridgeEngine } from "./BlueprintToQuoteBridgeEngine.js";
export { sheetMetalQuoteEngine, SheetMetalQuoteEngine } from "./SheetMetalQuoteEngine.js";
export { additiveQuoteEngine, AdditiveQuoteEngine } from "./AdditiveQuoteEngine.js";
export { injectionMoldQuoteEngine, InjectionMoldQuoteEngine } from "./InjectionMoldQuoteEngine.js";
export { stockSizeOptimizerEngine, StockSizeOptimizerEngine } from "./StockSizeOptimizerEngine.js";
export { marketMaterialPricingEngine, MarketMaterialPricingEngine } from "./MarketMaterialPricingEngine.js";
export { castingQuoteEngine, CastingQuoteEngine } from "./CastingQuoteEngine.js";
export { weldFabricationQuoteEngine, WeldFabricationQuoteEngine } from "./WeldFabricationQuoteEngine.js";
export { multiProcessQuoteEngine, MultiProcessQuoteEngine } from "./MultiProcessQuoteEngine.js";
// Batch 31-34: 132 previously unexported engines
// CK-MS5 — 5-Axis Toolpath Integration
export { fiveAxisToolpathIntegrationEngine, FiveAxisToolpathIntegrationEngine } from "./FiveAxisToolpathIntegrationEngine.js";

export { acoSequencerEngine } from "./AcoSequencerEngine.js";
export { adaptiveClearingEngine } from "./AdaptiveClearingEngine.js";
export { antColonyOptimizationEngine } from "./AntColonyOptimizationEngine.js";
export { adaptiveTessellationEngine } from "./AdaptiveTessellationEngine.js";
export { advancedPostProcessorEngine, AdvancedPostProcessorEngine } from "./AdvancedPostProcessorEngine.js";
export { auditEngine, AuditEngine } from "./AuditEngine.js";
export { bSplineEngine } from "./BSplineEngine.js";
export { backplotEngine } from "./BackplotEngine.js";
export { batchOptimizationEngine, BatchOptimizationEngine } from "./BatchOptimizationEngine.js";
export { bayesianOptimizationEngine } from "./BayesianOptimizationEngine.js";
export { bayesianToolLifeEngine } from "./BayesianToolLifeEngine.js";
export { bvhEngine } from "./BVHEngine.js";
export { cacheEngine, CacheEngine } from "./CacheEngine.js";
export { chatterPredictionEngine } from "./ChatterPredictionEngine.js";
export { clusteringEngine } from "./ClusteringEngine.js";
export { configEngine, ConfigEngine } from "./ConfigEngine.js";
export { constructionGeometryEngine } from "./ConstructionGeometryEngine.js";
export { curvatureAnalysisEngine } from "./CurvatureAnalysisEngine.js";
export { cuttingDataLookupEngine, CuttingDataLookupEngine } from "./CuttingDataLookupEngine.js";
export { cuttingMechanicsEngine } from "./CuttingMechanicsEngine.js";
export { cuttingThermalEngine } from "./CuttingThermalEngine.js";
export { differentialEvolutionEngine } from "./DifferentialEvolutionEngine.js";
export { digitalTwinEngine, DigitalTwinEngine } from "./DigitalTwinEngine.js";
export { energyOptimizationEngine, EnergyOptimizationEngine } from "./EnergyOptimizationEngine.js";
export { toolCatalogEngine, ToolCatalogEngine } from "./ToolCatalogEngine.js";
export { unitConversionEngine, UnitConversionEngine } from "./UnitConversionEngine.js";
export { machineProfileEngine, MachineProfileEngine } from "./MachineProfileEngine.js";
export { eventEngine, EventEngine } from "./EventEngine.js";
export { featureInteractionEngine } from "./FeatureInteractionEngine.js";
export { feedOptimizationEngine } from "./FeedOptimizationEngine.js";
export { filletingEngine } from "./FilletingEngine.js";
export { financialAnalysisEngine } from "./FinancialAnalysisEngine.js";
export { fixtureDesignEngine, FixtureDesignEngine } from "./FixtureDesignEngine.js";
export { gcodeValidationEngine } from "./GCodeValidationEngine.js";
export { gcodeTranspiler } from "./GCodeTranspilerEngine.js";
export { geneticAlgorithmEngine } from "./GeneticAlgorithmEngine.js";
export { geometryAlgorithmsEngine } from "./GeometryAlgorithmsEngine.js";
export { graphAlgorithmsEngine } from "./GraphAlgorithmsEngine.js";
export { harmonicAnalysisEngine, HarmonicAnalysisEngine } from "./HarmonicAnalysisEngine.js";
export { healthEngine, HealthEngine } from "./HealthEngine.js";
export { heatTransferEngine } from "./HeatTransferEngine.js";
export { heatTreatmentResponseEngine, HeatTreatmentResponseEngine } from "./HeatTreatmentResponseEngine.js";
export { hybridLaserMachineEngine, HybridLaserMachineEngine } from "./HybridLaserMachineEngine.js";
export { interiorPointEngine } from "./InteriorPointEngine.js";
export { inventoryOptimizationEngine } from "./InventoryOptimizationEngine.js";
export { isosurfaceEngine } from "./IsosurfaceEngine.js";
export { jobCostingEngine } from "./JobCostingEngine.js";
export { JOB_STATUS, jobLifecycleEngine } from "./JobLifecycleEngine.js";
export { jobShopSchedulingEngine } from "./JobShopSchedulingEngine.js";
export { johnsonCookEngine } from "./JohnsonCookEngine.js";
export { kinematicsEngine } from "./KinematicsEngine.js";
export { laserCutInterfaceEngine, LaserCutInterfaceEngine } from "./LaserCutInterfaceEngine.js";
export { laserCuttingEngine } from "./LaserCuttingEngine.js";
export { laserMarkingEngine, LaserMarkingEngine } from "./LaserMarkingEngine.js";
export { lathePostProcessorEngine, LathePostProcessorEngine } from "./LathePostProcessorEngine.js";
export { leanSixSigmaEngine } from "./LeanSixSigmaEngine.js";
export { learningPathEngine, LearningPathEngine } from "./LearningPathEngine.js";
export { linearProgrammingEngine } from "./LinearProgrammingEngine.js";
export { loggingEngine, LoggingEngine } from "./LoggingEngine.js";
export { machinabilityRatingEngine, MachinabilityRatingEngine } from "./MachinabilityRatingEngine.js";
export { machineSelectionEngine, MachineSelectionEngine } from "./MachineSelectionEngine.js";
export { magneticChuckEngine, MagneticChuckEngine } from "./MagneticChuckEngine.js";
export { maskingCalculatorEngine, MaskingCalculatorEngine } from "./MaskingCalculatorEngine.js";
export { isStale } from "./MasterIndexGenerator.js";
export { materialEquivalenceEngine, MaterialEquivalenceEngine } from "./MaterialEquivalenceEngine.js";
export { materialInterpolationEngine } from "./MaterialInterpolationEngine.js";
export { materialSelectionEngine, MaterialSelectionEngine } from "./MaterialSelectionEngine.js";
export { meshDecimationEngine } from "./MeshDecimationEngine.js";
export { metricsEngine, MetricsEngine } from "./MetricsEngine.js";
export { microstructureEffectEngine, MicrostructureEffectEngine } from "./MicrostructureEffectEngine.js";
export { migrationEngine, MigrationEngine } from "./MigrationEngine.js";
export { monteCarloEngine } from "./MonteCarloEngine.js";
export { multiObjectiveEngine } from "./MultiObjectiveEngine.js";
export { multiaxisToolpathEngine } from "./MultiaxisToolpathEngine.js";
export { nurbsEngine } from "./NURBSEngine.js";
export { nestingEngine, NestingEngine } from "./NestingEngine.js";
export { notificationEngine, NotificationEngine } from "./NotificationEngine.js";
export { numericalMethodsEngine } from "./NumericalMethodsEngine.js";
export { offsetSurfaceEngine } from "./OffsetSurfaceEngine.js";
export { orderManagerEngine } from "./OrderManagerEngine.js";
export { parametricSurfaceEngine } from "./ParametricSurfaceEngine.js";
export { parametricPartLibraryEngine } from "./ParametricPartLibraryEngine.js";
export { particleSwarmOptimizationEngine } from "./ParticleSwarmOptimizationEngine.js";
export { passivationEngine, PassivationEngine } from "./PassivationEngine.js";
export { platingAllowanceEngine, PlatingAllowanceEngine } from "./PlatingAllowanceEngine.js";
export { pluginEngine, PluginEngine } from "./PluginEngine.js";
export { probeRoutineEngine, ProbeRoutineEngine } from "./ProbeRoutineEngine.js";
export { probingCycleEngine, ProbingCycleEngine } from "./ProbingCycleEngine.js";
export { processPlanEngine, ProcessPlanEngine } from "./ProcessPlanEngine.js";
export { postProcessorFeedOptimizer } from "./PostProcessorFeedOptimizerEngine.js";
export { purchasingDirectoryEngine } from "./PurchasingDirectoryEngine.js";
export { qLearningEngine } from "./QLearningEngine.js";
export { queueEngine, QueueEngine } from "./QueueEngine.js";
export { quoteEngine, QuoteEngine } from "./QuoteEngine.js";
export { quotingEngine } from "./QuotingEngine.js";
export { rlPostProcessorEngine } from "./RLPostProcessorEngine.js";
export { rateLimitEngine, RateLimitEngine } from "./RateLimitEngine.js";
export { recastLayerEngine, RecastLayerEngine } from "./RecastLayerEngine.js";
export { reportingEngine } from "./ReportingEngine.js";
export { rigidBodyDynamicsEngine } from "./RigidBodyDynamicsEngine.js";
export { shotPeeningEngine, ShotPeeningEngine } from "./ShotPeeningEngine.js";
export { silhouetteEngine } from "./SilhouetteEngine.js";
export { simulatedAnnealingEngine } from "./SimulatedAnnealingEngine.js";
export { sinkerEDMCalculatorEngine } from "./SinkerEDMCalculatorEngine.js";
export { sketchConstraintEngine } from "./SketchConstraintEngine.js";
export { sketchEngine, SketchEngine } from "./SketchEngine.js";
export { sqpEngine } from "./SQPEngine.js";
export { softJawProfileEngine, SoftJawProfileEngine } from "./SoftJawProfileEngine.js";
export { solidEditingEngine } from "./SolidEditingEngine.js";
export { spindleHarmonicsQualityEngine, SpindleHarmonicsQualityEngine } from "./SpindleHarmonicsQualityEngine.js";
export { splineMillingEngine, SplineMillingEngine } from "./SplineMillingEngine.js";
export { stabilityRPMRewriter } from "./StabilityRPMRewriterEngine.js";
export { subprogramEngine, SubprogramEngine } from "./SubprogramEngine.js";
export { surfaceIntersectionEngine } from "./SurfaceIntersectionEngine.js";
export { surfaceReconstructionEngine } from "./SurfaceReconstructionEngine.js";
export { swarmAlgorithmsEngine } from "./SwarmAlgorithmsEngine.js";
export { swarmNeuralHybridEngine } from "./SwarmNeuralHybridEngine.js";
export { tensileToMachinabilityEngine, TensileToMachinabilityEngine } from "./TensileToMachinabilityEngine.js";
export { thermalExpansionEngine } from "./ThermalExpansionEngine.js";
export { thermalModelingEngine } from "./ThermalModelingEngine.js";
export { thermalSimEngine, ThermalSimEngine } from "./ThermalSimEngine.js";
export { thinFloorVibrationEngine, ThinFloorVibrationEngine } from "./ThinFloorVibrationEngine.js";
export { threadMillingEngine, ThreadMillingEngine } from "./ThreadMillingEngine.js";
export { threeDPrintedFixtureEngine, ThreeDPrintedFixtureEngine } from "./ThreeDPrintedFixtureEngine.js";
export { timeSeriesEngine } from "./TimeSeriesEngine.js";
export { tombstoneLayoutEngine, TombstoneLayoutEngine } from "./TombstoneLayoutEngine.js";
export { toolCribEngine, ToolCribEngine } from "./ToolCribEngine.js";
export { toolSelectionEngine, ToolSelectionEngine } from "./ToolSelectionEngine.js";
export { toolholderDynamicsEngine, ToolholderDynamicsEngine } from "./ToolholderDynamicsEngine.js";
export { toolpathSimulationEngine, ToolpathSimulationEngine } from "./ToolpathSimulationEngine.js";
export { trustRegionEngine } from "./TrustRegionEngine.js";
export { topologyEngine } from "./TopologyEngine.js";
export { CORE_CATEGORIES, tribalKnowledgeEngine, TribalKnowledgeEngine } from "./TribalKnowledgeEngine.js";
export { troubleshootingEngine, TroubleshootingEngine } from "./TroubleshootingEngine.js";
export { troubleshootingAssistantEngine, TroubleshootingAssistantEngine } from "./TroubleshootingAssistantEngine.js";
export { vibrationAnalysisEngine } from "./VibrationAnalysisEngine.js";
export { voronoiEngine } from "./VoronoiEngine.js";
export { voxelStockEngine } from "./VoxelStockEngine.js";
export { voxelStockIntegrationEngine } from "./VoxelStockIntegrationEngine.js";
export { novelToolpathEngine, computeNovelToolpath, listNovelAlgorithms, NOVEL_ALGORITHM_INFO, type NovelToolpathResult, type NovelAlgorithm } from "./NovelToolpathEngine.js";
export { novelToolpathSimulatorEngine } from "./NovelToolpathSimulatorEngine.js";
export { collisionIntegrationEngine } from "./CollisionIntegrationEngine.js";
export { surfaceFinishPredictorEngine, SurfaceFinishPredictorEngine } from "./SurfaceFinishPredictorEngine.js";
export { cycleTimeAccuracyEngine, CycleTimeAccuracyEngine } from "./CycleTimeAccuracyEngine.js";
export { restMachiningEngine, RestMachiningEngine } from "./RestMachiningEngine.js";
export { operationSequencerEngine, OperationSequencerEngine } from "./OperationSequencerEngine.js";
export { transitionPathEngine, TransitionPathEngine } from "./TransitionPathEngine.js";
export { adaptiveRefinementEngine, AdaptiveRefinementEngine } from "./AdaptiveRefinementEngine.js";
export { multiSetupPlannerEngine, MultiSetupPlannerEngine } from "./MultiSetupPlannerEngine.js";
export { multiSetupFeasibilityChainEngine, MultiSetupFeasibilityChainEngine } from "./MultiSetupFeasibilityChainEngine.js";
export { extendedNovelToolpathEngine, computeExtendedAlgorithm, EXTENDED_ALGORITHM_INFO, type ExtendedAlgorithm } from "./NovelToolpathAlgorithmsExt.js";
export { crossCamNovelEngine, computeCrossCamNovel, CROSS_CAM_NOVEL_INFO, type CrossCamNovelAlgorithm } from "./CrossCamNovelAlgorithms.js";
export { waterjetCuttingEngine } from "./WaterjetCuttingEngine.js";
export { WaterjetProgramAssemblerEngine, waterjetProgramAssemblerEngine } from "./WaterjetProgramAssemblerEngine.js";
export { toolpathSmoothingEngine, ToolpathSmoothingEngine } from "./ToolpathSmoothingEngine.js";
export { chipMorphologyDiagnosticEngine, ChipMorphologyDiagnosticEngine } from "./ChipMorphologyDiagnosticEngine.js";
export { cuttingFluidLifecycleEngine, CuttingFluidLifecycleEngine } from "./CuttingFluidLifecycleEngine.js";
export { machineToolErrorBudgetEngine, MachineToolErrorBudgetEngine } from "./MachineToolErrorBudgetEngine.js";
export { processCapabilityPredictionEngine, ProcessCapabilityPredictionEngine } from "./ProcessCapabilityPredictionEngine.js";
export { waterjetTaperEngine, WaterjetTaperEngine } from "./WaterjetTaperEngine.js";
export { wearForceCompensationEngine, WearForceCompensationEngine } from "./WearForceCompensationEngine.js";
export { webhookEngine, WebhookEngine } from "./WebhookEngine.js";
export { weldPrepEngine, WeldPrepEngine } from "./WeldPrepEngine.js";
export { whiteLayerDetectionEngine, WhiteLayerDetectionEngine } from "./WhiteLayerDetectionEngine.js";
export { xaiEngine } from "./XAIEngine.js";

// Data Asset Merge — Monolith Database Engines
export {
  toolHolderDatabaseEngine, ToolHolderDatabaseEngine,
  type ToolHolderSpec,
} from "./ToolHolderDatabaseEngine.js";
export {
  machineConfigDatabaseEngine, MachineConfigDatabaseEngine,
  type MachineRoughingConfig, type SmoothingConfig,
} from "./MachineConfigDatabaseEngine.js";
export {
  surfaceFinishDatabaseEngine, SurfaceFinishDatabaseEngine,
  type RaEntry, type ApplicationGuide, type CalloutResult,
} from "./SurfaceFinishDatabaseEngine.js";
export { convexOptimizationEngine } from "./ConvexOptimizationEngine.js";
export { numericalIntegrationEngine } from "./NumericalIntegrationEngine.js";
export { differentialEquationEngine } from "./DifferentialEquationEngine.js";
export { finiteElementEngine } from "./FiniteElementEngine.js";
export { waveletEngine } from "./WaveletEngine.js";
export { markovChainEngine } from "./MarkovChainEngine.js";
export { fuzzyLogicEngine } from "./FuzzyLogicEngine.js";
export { dynamicProgrammingEngine } from "./DynamicProgrammingEngine.js";
export { robustStatisticsEngine } from "./RobustStatisticsEngine.js";
export { gameTheoryEngine } from "./GameTheoryEngine.js";
export { survivalAnalysisEngine } from "./SurvivalAnalysisEngine.js";
export { queueingTheoryEngine } from "./QueueingTheoryEngine.js";
export { webSocketEngine, WebSocketEngine } from "./WebSocketEngine.js";
export { llmEngine, LLMEngine } from "./LLMEngine.js";
export { alarmEscalationEngine, AlarmEscalationEngine } from "./AlarmEscalationEngine.js";
export { dataValidationEngine, DataValidationEngine } from "./DataValidationEngine.js";
export { reamingEngine, ReamingEngine } from "./ReamingEngine.js";
export { broachingEngine, BroachingEngine } from "./BroachingEngine.js";
export { honingEngine, HoningEngine } from "./HoningEngine.js";
export { toolBalancingEngine, ToolBalancingEngine } from "./ToolBalancingEngine.js";
export { helicalInterpolationEngine, HelicalInterpolationEngine } from "./HelicalInterpolationEngine.js";
export { centerDrillEngine, CenterDrillEngine } from "./CenterDrillEngine.js";
export { deburringEngine, DeburringEngine } from "./DeburringEngine.js";
export { chamferMillingEngine, ChamferMillingEngine } from "./ChamferMillingEngine.js";
export { counterboreSinkEngine, CounterboreSinkEngine } from "./CounterboreSinkEngine.js";
export { keyseatCutterEngine, KeyseatCutterEngine } from "./KeyseatCutterEngine.js";
export { circularInterpolationEngine, CircularInterpolationEngine } from "./CircularInterpolationEngine.js";
export { trochoidalMillingEngine, TrochoidalMillingEngine } from "./TrochoidalMillingEngine.js";
export { plungeMillingEngine, PlungeMillingEngine } from "./PlungeMillingEngine.js";
export { threadTurningEngine, ThreadTurningEngine } from "./ThreadTurningEngine.js";
export { boringBarEngine, BoringBarEngine } from "./BoringBarEngine.js";
export { gunDrillingEngine, GunDrillingEngine } from "./GunDrillingEngine.js";
export { grindingWheelEngine, GrindingWheelEngine } from "./GrindingWheelEngine.js";
export { edmEngine, EDMEngine } from "./EDMEngine.js";
export { EDMProgramAssemblerEngine } from "./EDMProgramAssemblerEngine.js";
export { workholdingForceEngine, WorkholdingForceEngine } from "./WorkholdingForceEngine.js";
export { spindlePowerCheckEngine, SpindlePowerCheckEngine } from "./SpindlePowerCheckEngine.js";
export { partingGroovingEngine, PartingGroovingEngine } from "./PartingGroovingEngine.js";
export { facingEngine, FacingEngine } from "./FacingEngine.js";
export { knurlingEngine, KnurlingEngine } from "./KnurlingEngine.js";
export { ballEndMillEngine, BallEndMillEngine } from "./BallEndMillEngine.js";
export { highFeedMillingEngine, HighFeedMillingEngine } from "./HighFeedMillingEngine.js";
export { rampingEngine, RampingEngine } from "./RampingEngine.js";
export { microMachiningEngine, MicroMachiningEngine } from "./MicroMachiningEngine.js";
export { spindleSpeedVariationEngine, SpindleSpeedVariationEngine } from "./SpindleSpeedVariationEngine.js";
export { coolantPressureEngine, CoolantPressureEngine } from "./CoolantPressureEngine.js";
export { tapDrillEngine, TapDrillEngine } from "./TapDrillEngine.js";
export { powerSkivingEngine, PowerSkivingEngine } from "./PowerSkivingEngine.js";
export { waterjetEngine, WaterjetEngine } from "./WaterjetEngine.js";
export { springPassEngine, SpringPassEngine } from "./SpringPassEngine.js";
export { toolPathStepoverEngine, ToolPathStepoverEngine } from "./ToolPathStepoverEngine.js";
export { surfaceGrindingEngine, SurfaceGrindingEngine } from "./SurfaceGrindingEngine.js";
export { stockAllowanceEngine, StockAllowanceEngine } from "./StockAllowanceEngine.js";
export { toolRunoutEngine, ToolRunoutEngine } from "./ToolRunoutEngine.js";
export { cuttingFluidSelectionEngine, CuttingFluidSelectionEngine } from "./CuttingFluidSelectionEngine.js";

// Optimization Engines — numerical optimization primitives
export { gradientOptimizationEngine } from "./GradientOptimizationEngine.js";
export { localSearchEngine } from "./LocalSearchEngine.js";

// Signal Processing — FFT, filtering, spectral analysis
export { signalProcessingEngine } from "./SignalProcessingEngine.js";

// Spatial Indexing — KD-Tree, Octree for 3D queries
export { kdTree, octree } from "./SpatialIndexEngine.js";

// Spectral Graph — mesh analysis via spectral graph theory
export { spectralGraphEngine } from "./SpectralGraphEngine.js";

// Session Delta — cross-session change tracking
export { sessionDeltaEngine, SessionDeltaEngine } from "./SessionDeltaEngine.js";

// System Snapshot — ultra-compact system snapshots for token savings
export { systemSnapshotEngine, SystemSnapshotEngine } from "./SystemSnapshotEngine.js";

// Context Preloader — token-efficient session bootstrap
export { contextPreloaderEngine, ContextPreloaderEngine } from "./ContextPreloaderEngine.js";

// Compact Formatter — token-efficient output formatting
export { compactFormatterEngine, CompactFormatterEngine } from "./CompactFormatterEngine.js";

// Batch Query — multi-action dispatcher batching
export { batchQueryEngine, BatchQueryEngine } from "./BatchQueryEngine.js";

// Response Cache — TTL-based result caching with LRU eviction
export { responseCacheEngine, ResponseCacheEngine } from "./ResponseCacheEngine.js";

// Quick Calc — instant manufacturing calculations (no dispatcher overhead)
export { quickCalcEngine, QuickCalcEngine } from "./QuickCalcEngine.js";

// Dispatcher Map — complete dispatcher action catalog with search
export { dispatcherMapEngine, DispatcherMapEngine } from "./DispatcherMapEngine.js";

// Tool Router — intent-based routing for token efficiency
export { toolRouterEngine, ToolRouterEngine } from "./ToolRouterEngine.js";

// Output Budget — token budget enforcement for tool outputs
export { outputBudgetEngine, OutputBudgetEngine } from "./OutputBudgetEngine.js";

// Context Digest — ultra-compact file/directory structural summaries
export { contextDigestEngine, ContextDigestEngine } from "./ContextDigestEngine.js";

// Action Schema Cache — cached action parameter schemas
export { actionSchemaCacheEngine, ActionSchemaCacheEngine } from "./ActionSchemaCacheEngine.js";

// Session Replay — context reconstruction from git history
export { sessionReplayEngine, SessionReplayEngine } from "./SessionReplayEngine.js";

// Prompt Template — pre-built parameterized templates
export { promptTemplateEngine, PromptTemplateEngine } from "./PromptTemplateEngine.js";

// Frequent Path — access frequency tracking for predictive optimization
export { frequentPathEngine, FrequentPathEngine } from "./FrequentPathEngine.js";

// Cost Estimator — quick manufacturing cost estimation
export { costEstimatorEngine, CostEstimatorEngine } from "./CostEstimatorEngine.js";

// Diff Token Estimator — estimates token cost of code changes
export { diffTokenEstimatorEngine, DiffTokenEstimatorEngine } from "./DiffTokenEstimatorEngine.js";

// Engine Registry — lightweight engine capability registry
export { engineRegistryEngine, EngineRegistryEngine } from "./EngineRegistryEngine.js";

// Smart Defaults — context-aware default parameter selection
export { smartDefaultsEngine, SmartDefaultsEngine } from "./SmartDefaultsEngine.js";

// Error Context — minimal diagnostic context for errors
export { errorContextEngine, ErrorContextEngine } from "./ErrorContextEngine.js";

// Import Cost — import chain analysis for bundle optimization
export { importCostEngine, ImportCostEngine } from "./ImportCostEngine.js";

// G-Code Snippet — common G-code snippet library
export { gCodeSnippetEngine, GCodeSnippetEngine } from "./GCodeSnippetEngine.js";

// Conversation Budget — conversation-level token budget management
export { conversationBudgetEngine, ConversationBudgetEngine } from "./ConversationBudgetEngine.js";

// Tool Call Batch — tool call batching advisor for parallel opportunities
export { toolCallBatchEngine, ToolCallBatchEngine } from "./ToolCallBatchEngine.js";

// Stop Condition — tool call stop/skip decision engine
export { stopConditionEngine, StopConditionEngine } from "./StopConditionEngine.js";

// Hook Efficiency — hook token savings tracker and ROI metrics
export { hookEfficiencyEngine, HookEfficiencyEngine } from "./HookEfficiencyEngine.js";

// Context Snapshot — minimal session state snapshots for handoffs
export { contextSnapshotEngine, ContextSnapshotEngine } from "./ContextSnapshotEngine.js";

// Read Optimizer — optimal file reading strategy advisor
export { readOptimizerEngine, ReadOptimizerEngine } from "./ReadOptimizerEngine.js";

// Call Chain — tool call chain analysis and anti-pattern detection
export { callChainEngine, CallChainEngine } from "./CallChainEngine.js";

// Token Accounting — centralized token cost accounting and efficiency scoring
export { tokenAccountingEngine, TokenAccountingEngine } from "./TokenAccountingEngine.js";

// Session Budget Advisor — unified session budget advisory
export { sessionBudgetAdvisorEngine, SessionBudgetAdvisorEngine } from "./SessionBudgetAdvisorEngine.js";

// Helical Milling — helical interpolation bore milling parameters
export { helicalMillingEngine, HelicalMillingEngine } from "./HelicalMillingEngine.js";

// Tool Cost Predictor — pre-execution token cost prediction
export { toolCostPredictorEngine, ToolCostPredictorEngine } from "./ToolCostPredictorEngine.js";

// Output Truncator — smart output truncation preserving structure
export { outputTruncatorEngine, OutputTruncatorEngine } from "./OutputTruncatorEngine.js";

// Peck Drilling — deep hole peck drilling parameter calculator
export { peckDrillingEngine, PeckDrillingEngine } from "./PeckDrillingEngine.js";

// Chamfer — chamfer machining parameter calculator
export { chamferEngine, ChamferEngine } from "./ChamferEngine.js";

// Spot Drilling — spot/center drill parameter calculator
export { spotDrillingEngine, SpotDrillingEngine } from "./SpotDrillingEngine.js";

// Keyway — keyway/keyseat machining calculator (DIN 6885)
export { keywayEngine, KeywayEngine } from "./KeywayEngine.js";

// Countersink — countersink depth and parameter calculator
export { countersinkEngine, CountersinkEngine } from "./CountersinkEngine.js";

// Slotting — slot milling parameter calculator
export { slottingEngine, SlottingEngine } from "./SlottingEngine.js";

// Profiling — 2D/3D profile milling with wall deflection
export { profilingEngine, ProfilingEngine } from "./ProfilingEngine.js";

// Counterboring — counterbore dimensions for SHCS fasteners
export { counterboringEngine, CounterboringEngine } from "./CounterboringEngine.js";

// Taper Turning — taper angle, compound rest, tailstock offset
export { taperTurningEngine, TaperTurningEngine } from "./TaperTurningEngine.js";

// Boring Bar Deflection — deflection, L/D limits, bar selection
export { boringBarDeflectionEngine, BoringBarDeflectionEngine } from "./BoringBarDeflectionEngine.js";

// Circular Pocket — circular pocket milling strategy and cycle time
export { circularPocketEngine, CircularPocketEngine } from "./CircularPocketEngine.js";

// Press Fit — interference fit, press force, thermal assembly
export { pressFitEngine, PressFitEngine } from "./PressFitEngine.js";

// Surface Roughness — Ra/Rz prediction from cutting parameters
export { surfaceRoughnessEngine, SurfaceRoughnessEngine } from "./SurfaceRoughnessEngine.js";

// Centerless Grinding — centerless grinding setup parameters
export { centerlessGrindingEngine, CenterlessGrindingEngine } from "./CenterlessGrindingEngine.js";

// Tool Overhang — tool stickout optimization and deflection
export { toolOverhangEngine, ToolOverhangEngine } from "./ToolOverhangEngine.js";

// Cutting Force — Kienzle cutting force estimation (Fc, Fp, Ff)
export { cuttingForceEngine, CuttingForceEngine } from "./CuttingForceEngine.js";

// Chip Load — chip load optimization with thinning compensation
export { chipLoadEngine, ChipLoadEngine } from "./ChipLoadEngine.js";

// Parallelism — parallelism/flatness tolerance measurement
export { parallelismEngine, ParallelismEngine } from "./ParallelismEngine.js";

// Runout Compensation — TIR measurement and compensation strategy
export { runoutCompensationEngine, RunoutCompensationEngine } from "./RunoutCompensationEngine.js";

// Cutting Temperature — tool/chip interface temperature prediction
export { cuttingTemperatureEngine, CuttingTemperatureEngine } from "./CuttingTemperatureEngine.js";

// Tool Wear Rate — Taylor tool life and wear prediction
export { toolWearRateEngine, ToolWearRateEngine } from "./ToolWearRateEngine.js";

// Axis Compensation — thermal/backlash/pitch error compensation
export { axisCompensationEngine, AxisCompensationEngine } from "./AxisCompensationEngine.js";

// Cycle Time — complete cycle time breakdown
export { cycleTimeEngine, CycleTimeEngine } from "./CycleTimeEngine.js";

// Repetition Detector — detects repeated content in tool outputs
export { repetitionDetectorEngine, RepetitionDetectorEngine } from "./RepetitionDetectorEngine.js";

// Context Window Pressure — models context pressure and predicts compaction
export { contextWindowPressureEngine, ContextWindowPressureEngine } from "./ContextWindowPressureEngine.js";

// Tool Redirect — suggests more efficient tool alternatives
export { toolRedirectEngine, ToolRedirectEngine } from "./ToolRedirectEngine.js";

// Diff Minimizer — minimizes edit diffs for token efficiency
export { diffMinimizerEngine, DiffMinimizerEngine } from "./DiffMinimizerEngine.js";

// File Access Pattern — tracks access patterns to predict needs
export { fileAccessPatternEngine, FileAccessPatternEngine } from "./FileAccessPatternEngine.js";

// Compact Planner — plans optimal content preservation during compaction
export { compactPlannerEngine, CompactPlannerEngine } from "./CompactPlannerEngine.js";

// Session Event Log — tracks session events for compact replay
export { sessionEventLogEngine, SessionEventLogEngine } from "./SessionEventLogEngine.js";

// Prompt Compression — compresses prompts for sub-agents
export { promptCompressionEngine, PromptCompressionEngine } from "./PromptCompressionEngine.js";

// Parallel Call Planner — plans parallel tool call batches
export { parallelCallPlannerEngine, ParallelCallPlannerEngine } from "./ParallelCallPlannerEngine.js";

// Incremental Read — tracks file read coverage for incremental reads
export { incrementalReadEngine, IncrementalReadEngine } from "./IncrementalReadEngine.js";

// Tool Call Histogram — visualizes tool usage distribution
export { toolCallHistogramEngine, ToolCallHistogramEngine } from "./ToolCallHistogramEngine.js";

// Waste Detector — detects token waste patterns in real-time
export { wasteDetectorEngine, WasteDetectorEngine } from "./WasteDetectorEngine.js";

// Hook Rule Matcher — matches tool calls against hookify rules
export { hookRuleMatcherEngine, HookRuleMatcherEngine } from "./HookRuleMatcherEngine.js";

// Schema Compact — compacts JSON schemas for token efficiency
export { schemaCompactEngine, SchemaCompactEngine } from "./SchemaCompactEngine.js";

// Token Budget Allocator — allocates token budget across task phases
export { tokenBudgetAllocatorEngine, TokenBudgetAllocatorEngine } from "./TokenBudgetAllocatorEngine.js";

// Tool Output Summarizer — summarizes verbose tool outputs
export { toolOutputSummarizerEngine, ToolOutputSummarizerEngine } from "./ToolOutputSummarizerEngine.js";

// Cost Aware Router — routes queries to cheapest satisfying tool
export { costAwareRouterEngine, CostAwareRouterEngine } from "./CostAwareRouterEngine.js";

// Conversation Trimmer — identifies trimmable conversation segments
export { conversationTrimmerEngine, ConversationTrimmerEngine } from "./ConversationTrimmerEngine.js";

// Context Inventory — inventories what's currently in context
export { contextInventoryEngine, ContextInventoryEngine } from "./ContextInventoryEngine.js";

// Spindle Bearing Load — L10 life, DN value, preload, lubrication
export { spindleBearingLoadEngine, SpindleBearingLoadEngine } from "./SpindleBearingLoadEngine.js";

// Bar Feeder — parts per bar, remnant, production rate, whip limits
export { barFeederEngine, BarFeederEngine } from "./BarFeederEngine.js";

// Chip Breaking — chip form prediction, chipbreaker selection, bird's nest risk
export { chipBreakingEngine, ChipBreakingEngine } from "./ChipBreakingEngine.js";

// Work Envelope — travel verification, reach check, utilization
export { workEnvelopeEngine, WorkEnvelopeEngine } from "./WorkEnvelopeEngine.js";

// Spindle Torque Curve — torque/power regions, base speed, margins
export { spindleTorqueCurveEngine, SpindleTorqueCurveEngine, SPINDLE_PROFILES } from "./SpindleTorqueCurveEngine.js";
export { ThinWallMachiningEngine } from "./ThinWallMachiningEngine.js";
export type { TorquePowerInput, TorquePowerResult, CutFeasibilityInput, CutFeasibilityResult, MaxMRRInput, MaxMRRResult, PlotCurveInput, PlotCurveResult, RecommendRPMInput, RecommendRPMResult } from "./SpindleTorqueCurveEngine.js";

// Fixture Plate — grid layout, clamping force, plate deflection
export { fixturePlateEngine, FixturePlateEngine } from "./FixturePlateEngine.js";

// Coolant Flow — flow rate, nozzle velocity, chip evacuation, concentration
export { coolantFlowEngine, CoolantFlowEngine } from "./CoolantFlowEngine.js";

// Tool Presetting — length/diameter offsets, thermal correction, uncertainty
export { toolPresettingEngine, ToolPresettingEngine } from "./ToolPresettingEngine.js";

// Vibration Dampening — L/D limits, tuned mass, stiffness improvement
export { vibrationDampeningEngine, VibrationDampeningEngine } from "./VibrationDampeningEngine.js";

// Chip Conveyor — chip volume, conveyor sizing, bin fill time, scrap value
export { chipConveyorEngine, ChipConveyorEngine } from "./ChipConveyorEngine.js";

// Part Deflection — thin wall/floor deflection, spring passes, allowable force
export { partDeflectionEngine, PartDeflectionEngine } from "./PartDeflectionEngine.js";

// Tool Call Deduplicator — detects exact and near-duplicate tool calls
export { toolCallDeduplicatorEngine, ToolCallDeduplicatorEngine } from "./ToolCallDeduplicatorEngine.js";

// Machine Warmup — spindle/axis warmup schedule, thermal stability, first-part risk
export { machineWarmupEngine, MachineWarmupEngine } from "./MachineWarmupEngine.js";

// Gauging — R&R analysis, go/no-go sizing, gauge selection, SPC sample size
export { gaugingEngine, GaugingEngine } from "./GaugingEngine.js";

// Tool Cost Per Part — tooling economics, regrind breakeven, annual budget
export { toolCostPerPartEngine, ToolCostPerPartEngine } from "./ToolCostPerPartEngine.js";

// Spindle Load Monitor — alarm thresholds, breakage detection, wear trend
export { spindleLoadMonitorEngine, SpindleLoadMonitorEngine } from "./SpindleLoadMonitorEngine.js";

// Ball Screw Selection — shaft sizing, critical speed, buckling, L10 life
export { ballScrewSelectionEngine, BallScrewSelectionEngine } from "./BallScrewSelectionEngine.js";

// CNC Maintenance — PM schedules, lube intervals, risk scoring, cost
export { cncMaintenanceEngine, CNCMaintenanceEngine } from "./CNCMaintenanceEngine.js";

// Setup Reduction — SMED analysis, internal/external split, ROI
export { setupReductionEngine, SetupReductionEngine } from "./SetupReductionEngine.js";

// Linear Guide — rail sizing, L10 life, preload, friction
export { linearGuideEngine, LinearGuideEngine } from "./LinearGuideEngine.js";

// Tool Call Batch Optimizer — parallelization and redundancy detection
export { toolCallBatchOptimizerEngine, ToolCallBatchOptimizerEngine } from "./ToolCallBatchOptimizerEngine.js";

// Spindle Runout — TIR stack-up, finish degradation, tool life impact
export { spindleRunoutEngine, SpindleRunoutEngine } from "./SpindleRunoutEngine.js";

// Machine Leveling — tilt limits, foundation sizing, vibration isolation
export { machineLevelingEngine, MachineLevelingEngine } from "./MachineLevelingEngine.js";

// Tolerance Stack-Up Engine — worst-case & RSS stack-up analysis
export { toleranceStackUpEngine, ToleranceStackUpEngine } from "./ToleranceStackUpEngine.js";

// Shaft Alignment Engine — laser/dial alignment corrections, thermal growth
export { shaftAlignmentEngine, ShaftAlignmentEngine } from "./ShaftAlignmentEngine.js";

// Keyway Stress Engine — key shear/bearing stress, ANSI B17.1 sizing
export { keywayStressEngine, KeywayStressEngine } from "./KeywayStressEngine.js";

// Bash Command Classifier — classifies bash commands, suggests token-efficient alternatives
export { bashCommandClassifierEngine, BashCommandClassifierEngine } from "./BashCommandClassifierEngine.js";

// Context Integrity — guards against quality degradation from token optimization
export { contextIntegrityEngine, ContextIntegrityEngine } from "./ContextIntegrityEngine.js";

// Belt Drive Engine � V-belt & timing belt selection, tension, life
export { beltDriveEngine, BeltDriveEngine } from "./BeltDriveEngine.js";

// Spring Calc Engine � helical compression spring rate, stress, fatigue
export { springCalcEngine, SpringCalcEngine } from "./SpringCalcEngine.js";

// Weld Strength Engine � fillet/butt weld stress, AWS D1.1 allowables
export { weldStrengthEngine, WeldStrengthEngine } from "./WeldStrengthEngine.js";

// Output Budget Enforcer — per-tool output token budgets with truncation
export { outputBudgetEnforcerEngine, OutputBudgetEnforcerEngine } from "./OutputBudgetEnforcerEngine.js";

// Gear Train Engine � spur/helical gear pair, Lewis bending, AGMA contact stress
export { gearTrainEngine, GearTrainEngine } from "./GearTrainEngine.js";

// Hydraulic Cylinder Engine � force, flow, buckling, cycle time
export { hydraulicCylinderEngine, HydraulicCylinderEngine } from "./HydraulicCylinderEngine.js";

// Pneumatic Cylinder Engine � air cylinder sizing, consumption, cushioning
export { pneumaticCylinderEngine, PneumaticCylinderEngine } from "./PneumaticCylinderEngine.js";

// Session Token Ledger — real-time token cost accounting per tool call
export { sessionTokenLedgerEngine, SessionTokenLedgerEngine } from "./SessionTokenLedgerEngine.js";

// Smart Prefetch — predicts needed files from imports and co-access patterns
export { smartPrefetchEngine, SmartPrefetchEngine } from "./SmartPrefetchEngine.js";

// Bolt Torque Engine � torque-tension, clamp load, VDI 2230
export { boltTorqueEngine, BoltTorqueEngine } from "./BoltTorqueEngine.js";

// Tool Axis Optimization Engine — 5-axis orientation optimization [CAMK-MS0/U05]
export { toolAxisOptimizationEngine, type ToolAxisInput, type ToolAxisResult, type OptimizedAxis } from "./ToolAxisOptimizationEngine.js";

// Stepover Optimization Engine — curvature-adaptive stepover [CAMK-MS0/U04]
export { stepoverOptimizationEngine, type StepoverInput } from "./StepoverOptimizationEngine.js";

// Cutter Contact Engine — analytical CC point computation [CAMK-MS0/U03]
export { cutterContactEngine, type CCPoint, type CCResult, type CCInput } from "./CutterContactEngine.js";

// Algorithm Selector Engine — auto-select best novel algorithm per zone [CAMK-MS0/U02]
export { algorithmSelectorEngine, type NovelAlgorithmId, type AlgorithmSelectionInput, type AlgorithmSelectionResult, type AlgorithmRecommendation } from "./AlgorithmSelectorEngine.js";

// Feature To Zone Engine — geometric feature → machining zone mapper [CAMK-MS0/U01]
export { featureToZoneEngine, type FeatureInput as ZoneFeatureInput, type MachiningZone, type FeatureToZoneResult } from "./FeatureToZoneEngine.js";

// Fatigue Life Engine � S-N curve, Goodman/Gerber, Miner damage
export { fatigueLifeEngine, FatigueLifeEngine } from "./FatigueLifeEngine.js";

// Heat Treatment Engine � hardening, tempering, carburizing, annealing
export { heatTreatmentEngine, HeatTreatmentEngine } from "./HeatTreatmentEngine.js";

// Tool Call Pipeline — declarative tool call chains with dry-run costing
export { toolCallPipelineEngine, ToolCallPipelineEngine } from "./ToolCallPipelineEngine.js";

// Compaction Strategy — intelligent keep/compress/drop decisions for context
export { compactionStrategyEngine, CompactionStrategyEngine } from "./CompactionStrategyEngine.js";

// Cam Profile Engine � disc cam mechanism, pressure angle, contact stress
export { camProfileEngine, CamProfileEngine } from "./CamProfileEngine.js";

// Surface Treatment Engine � anodize, plate, nitride, shot peen
export { surfaceTreatmentEngine, SurfaceTreatmentEngine } from "./SurfaceTreatmentEngine.js";

// Electric Motor Engine � motor sizing, efficiency, VFD, energy cost
export { electricMotorEngine, ElectricMotorEngine } from "./ElectricMotorEngine.js";

// Tool Output Fingerprinter — detects recurring duplicate outputs via hashing
export { toolOutputFingerprinterEngine, ToolOutputFingerprinterEngine } from "./ToolOutputFingerprinterEngine.js";

// Context Window Map — live inventory of context consumers with stale detection
export { contextWindowMapEngine, ContextWindowMapEngine } from "./ContextWindowMapEngine.js";

// Tool Call Throttle — rate-limits tool calls with burst detection and cooldowns
export { toolCallThrottleEngine, ToolCallThrottleEngine } from "./ToolCallThrottleEngine.js";

// Edit Planner — minimizes edit context for token savings, batch planning
export { editPlannerEngine, EditPlannerEngine } from "./EditPlannerEngine.js";

// Bearing Selection Engine � ISO 281 L10 life, ndm, lubrication
export { bearingSelectionEngine, BearingSelectionEngine } from "./BearingSelectionEngine.js";

// Shrink Fit Engine � interference fit, Lame pressure, assembly temp
export { shrinkFitEngine, ShrinkFitEngine } from "./ShrinkFitEngine.js";

// Spline Stress Engine � involute spline shear/bearing, fretting risk
export { splineStressEngine, SplineStressEngine } from "./SplineStressEngine.js";

// Tool Selection Advisor — intent-based tool recommendation for cheapest option
export { toolSelectionAdvisorEngine, ToolSelectionAdvisorEngine } from "./ToolSelectionAdvisorEngine.js";

// Grep Optimizer — optimizes Grep params for minimal token cost
export { grepOptimizerEngine, GrepOptimizerEngine } from "./GrepOptimizerEngine.js";

// Crane Load Engine � sling tension, wire rope SF, dynamic factors
export { craneLoadEngine, CraneLoadEngine } from "./CraneLoadEngine.js";

// Conveyor Design Engine � belt conveyor capacity, power, tension
export { conveyorDesignEngine, ConveyorDesignEngine } from "./ConveyorDesignEngine.js";

// Piping Pressure Engine � Darcy-Weisbach, Reynolds, minor losses
export { pipingPressureEngine, PipingPressureEngine } from "./PipingPressureEngine.js";

// EDM Parameter Engine � wire/sinker EDM pulse settings, MRR, wear
export { edmParameterEngine, EDMParameterEngine } from "./EDMParameterEngine.js";

// Plasma Arc Engine � plasma cutting current, speed, gas, cost
export { plasmaArcEngine, PlasmaArcEngine } from "./PlasmaArcEngine.js";

// Electrochemical Engine � ECM/ECD Faraday MRR, current density
export { electrochemicalEngine, ElectrochemicalEngine } from "./ElectrochemicalEngine.js";

// Batch 36 � Flywheel, Clutch/Brake, Coupling
export { FlywheelEnergyEngine, flywheelEnergyEngine } from './FlywheelEnergyEngine.js';
export { ClutchBrakeEngine, clutchBrakeEngine } from './ClutchBrakeEngine.js';
export { CouplingSelectionEngine, couplingSelectionEngine } from './CouplingSelectionEngine.js';

// Batch 37 � Corrosion, Creep, Fracture
export { CorrosionRateEngine, corrosionRateEngine } from './CorrosionRateEngine.js';
export { CreepLifeEngine, creepLifeEngine } from './CreepLifeEngine.js';
export { FractureToughnessEngine, fractureToughnessEngine } from './FractureToughnessEngine.js';

// Batch 38 � DynamicBalance, NoiseLevel, SealSelection
export { DynamicBalanceEngine, dynamicBalanceEngine } from './DynamicBalanceEngine.js';
export { NoiseLevelEngine, noiseLevelEngine } from './NoiseLevelEngine.js';
export { SealSelectionEngine, sealSelectionEngine } from './SealSelectionEngine.js';

// Batch 39 � ChainDrive, LinearMotion, ValveSizing
export { ChainDriveEngine, chainDriveEngine } from './ChainDriveEngine.js';
export { LinearMotionEngine, linearMotionEngine } from './LinearMotionEngine.js';
export { ValveSizingEngine, valveSizingEngine } from './ValveSizingEngine.js';

// Batch 40 � HeatExchanger, PumpSelection, FanSelection
export { HeatExchangerEngine, heatExchangerEngine } from './HeatExchangerEngine.js';
export { PumpSelectionEngine, pumpSelectionEngine } from './PumpSelectionEngine.js';
export { FanSelectionEngine, fanSelectionEngine } from './FanSelectionEngine.js';

// Batch 41 � WeldDistortion, BroachDesign, PressBrake
export { WeldDistortionEngine, weldDistortionEngine } from './WeldDistortionEngine.js';
export { BroachDesignEngine, broachDesignEngine } from './BroachDesignEngine.js';
export { PressBrakeEngine, pressBrakeEngine } from './PressBrakeEngine.js';

// Batch 42 � RollingContact, ElectroPlating, CastingDefect
export { RollingContactEngine, rollingContactEngine } from './RollingContactEngine.js';
export { ElectroplatingEngine, electroplatingEngine } from './ElectroPlatingEngine.js';
export { CastingDefectEngine, castingDefectEngine } from './CastingDefectEngine.js';

// Batch 43 � TorsionBar, ColumnBuckling, FlatPattern
export { TorsionBarEngine, torsionBarEngine } from './TorsionBarEngine.js';
export { ColumnBucklingEngine, columnBucklingEngine } from './ColumnBucklingEngine.js';
export { FlatPatternEngine, flatPatternEngine } from './FlatPatternEngine.js';

export { masterPostProcessorEngine, MasterPostProcessorEngine } from "./MasterPostProcessorEngine.js";
export { ultimateSpeedFeedEngine, UltimateSpeedFeedEngine } from "./UltimateSpeedFeedEngine.js";
export { postProcessorGeneratorEngine, PostProcessorGeneratorEngine } from "./PostProcessorGeneratorEngine.js";

// Batch 44 � ThreadGage, SurfaceIntegrity, MachineVibration
export { ThreadGageEngine, threadGageEngine } from './ThreadGageEngine.js';
export { SurfaceIntegrityEngine, surfaceIntegrityEngine } from './SurfaceIntegrityEngine.js';
export { MachineVibrationEngine, machineVibrationEngine } from './MachineVibrationEngine.js';
export { GasketDesignEngine, gasketDesignEngine } from "./GasketDesignEngine.js";
export { RivetJointEngine, rivetJointEngine } from "./RivetJointEngine.js";
export { AdhesiveBondEngine, adhesiveBondEngine } from "./AdhesiveBondEngine.js";
export { WireRopeEngine, wireRopeEngine } from "./WireRopeEngine.js";
export { CamDesignEngine, camDesignEngine } from "./CamDesignEngine.js";
export { LeafSpringEngine, leafSpringEngine } from "./LeafSpringEngine.js";
export { SplineJointEngine, splineJointEngine } from "./SplineJointEngine.js";
export { KeywayDesignEngine, keywayDesignEngine } from "./KeywayDesignEngine.js";
export { ConveyorBeltEngine, conveyorBeltEngine } from "./ConveyorBeltEngine.js";
export { DiskBrakeEngine, diskBrakeEngine } from "./DiskBrakeEngine.js";
export { CriticalSpeedEngine, criticalSpeedEngine } from "./CriticalSpeedEngine.js";
export { WormGearEngine, wormGearEngine } from "./WormGearEngine.js";
export { PipeStressEngine, pipeStressEngine } from "./PipeStressEngine.js";
export { ThermalFatigueEngine, thermalFatigueEngine } from "./ThermalFatigueEngine.js";
export { ScrewJackEngine, screwJackEngine } from "./ScrewJackEngine.js";
export { VibrationIsolationEngine, vibrationIsolationEngine } from "./VibrationIsolationEngine.js";
export { BallMillEngine, ballMillEngine } from "./BallMillEngine.js";
export { FluidCouplingEngine, fluidCouplingEngine } from "./FluidCouplingEngine.js";
export { CrossCamRecommenderEngine, crossCamRecommenderEngine } from "./CrossCamRecommenderEngine.js";
export { ConstraintSatisfactionEngine, constraintSatisfactionEngine } from "./ConstraintSatisfactionEngine.js";
export { PostSelectionEngine, postSelectionEngine } from "./PostSelectionEngine.js";
export { ToolpathSegmentOptimizerEngine, toolpathSegmentOptimizerEngine } from "./ToolpathSegmentOptimizerEngine.js";
export { ToolAssemblyDeflectionEngine, toolAssemblyDeflectionEngine } from "./ToolAssemblyDeflectionEngine.js";
export { AdaptiveEngagementEngine, adaptiveEngagementEngine } from "./AdaptiveEngagementEngine.js";
export { HybridPostMergeEngine, hybridPostMergeEngine } from "./HybridPostMergeEngine.js";
export { ThermalCompensationModelEngine, thermalCompensationModelEngine } from "./ThermalCompensationModelEngine.js";
export { SPCProcessCapabilityEngine, spcProcessCapabilityEngine } from "./SPCProcessCapabilityEngine.js";
export { MultiObjectiveParetoEngine, multiObjectiveParetoEngine } from "./MultiObjectiveParetoEngine.js";
export { ChatterStabilityLobeEngine, chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";
export { SurfaceLocationErrorEngine, surfaceLocationErrorEngine } from "./SurfaceLocationErrorEngine.js";
export { ReceptanceCouplingEngine, receptanceCouplingEngine } from "./ReceptanceCouplingEngine.js";
export { SurfaceIntegrityPredictorEngine, surfaceIntegrityPredictorEngine } from "./SurfaceIntegrityPredictorEngine.js";
export { MachiningEnergyModelEngine, machiningEnergyModelEngine } from "./MachiningEnergyModelEngine.js";
export { MonteCarloProcessEngine, monteCarloProcessEngine } from "./MonteCarloProcessEngine.js";
export { DOETaguchEngine, doeTaguchEngine } from "./DOETaguchEngine.js";
export { FixtureClampingEngine, fixtureClampingEngine } from "./FixtureClampingEngine.js";
export { SpringbackPredictionEngine, springbackPredictionEngine } from "./SpringbackPredictionEngine.js";
export { GDTStackupEngine, gdtStackupEngine } from "./GDTStackupEngine.js";
export { RunoutEffectEngine, runoutEffectEngine } from "./RunoutEffectEngine.js";
export { ProcessDigitalTwinEngine, processDigitalTwinEngine } from "./ProcessDigitalTwinEngine.js";
export { ProcessRobustnessEngine, processRobustnessEngine } from "./ProcessRobustnessEngine.js";
export { KalmanFilterEngine, kalmanFilterEngine } from "./KalmanFilterEngine.js";
export { AMSAAReliabilityGrowthEngine, amsaaReliabilityGrowthEngine } from "./AMSAAReliabilityGrowthEngine.js";
export { ChanceConstrainedOptimizationEngine, chanceConstrainedOptimizationEngine } from "./ChanceConstrainedOptimizationEngine.js";
export { AcousticEmissionMonitoringEngine, acousticEmissionMonitoringEngine } from "./AcousticEmissionMonitoringEngine.js";

export { sheetMetalNestingEngine, SheetMetalNestingEngine } from "./SheetMetalNestingEngine.js";
export { hydraulicPressEngine, HydraulicPressEngine } from "./HydraulicPressEngine.js";
export { centrifugalPumpEngine, CentrifugalPumpEngine } from "./CentrifugalPumpEngine.js";
export { turbineBladeEngine, TurbineBladeEngine } from "./TurbineBladeEngine.js";
export { compressorDesignEngine, CompressorDesignEngine } from "./CompressorDesignEngine.js";
export { airDuctEngine, AirDuctEngine } from "./AirDuctEngine.js";
export { planetaryGearEngine, PlanetaryGearEngine } from "./PlanetaryGearEngine.js";
export { clutchDesignEngine, ClutchDesignEngine } from "./ClutchDesignEngine.js";
export { extrusionForceEngine, ExtrusionForceEngine } from "./ExtrusionForceEngine.js";
export { stampingDieEngine, StampingDieEngine } from "./StampingDieEngine.js";
export { wireDrawingEngine, WireDrawingEngine } from "./WireDrawingEngine.js";
export { rollingMillEngine, RollingMillEngine } from "./RollingMillEngine.js";
export { crankshaftDesignEngine, CrankshaftDesignEngine } from "./CrankshaftDesignEngine.js";
export { pistonDesignEngine, PistonDesignEngine } from "./PistonDesignEngine.js";
export { connectingRodEngine, ConnectingRodEngine } from "./ConnectingRodEngine.js";
export { tubeFormingEngine, TubeFormingEngine } from "./TubeFormingEngine.js";
export { flyingShearEngine, FlyingShearEngine } from "./FlyingShearEngine.js";
export { thermalExpansionJointEngine, ThermalExpansionJointEngine } from "./ThermalExpansionJointEngine.js";
export { coolingTowerEngine, CoolingTowerEngine } from "./CoolingTowerEngine.js";
export { steamTurbineEngine, SteamTurbineEngine } from "./SteamTurbineEngine.js";
export { valveDesignEngine, ValveDesignEngine } from "./ValveDesignEngine.js";
export { pipeSizingEngine, PipeSizingEngine } from "./PipeSizingEngine.js";
export { flangeBoltEngine, FlangeBoltEngine } from "./FlangeBoltEngine.js";
export { tankDesignEngine, TankDesignEngine } from "./TankDesignEngine.js";
export { CycloneSeparatorEngine, cycloneSeparatorEngine } from "./CycloneSeparatorEngine.js";
export { ScrewConveyorEngine, screwConveyorEngine } from "./ScrewConveyorEngine.js";
export { BucketElevatorEngine, bucketElevatorEngine } from "./BucketElevatorEngine.js";
export { DamperDesignEngine, damperDesignEngine } from "./DamperDesignEngine.js";
export { FilterPressEngine, filterPressEngine } from "./FilterPressEngine.js";
export { MixerAgitatorEngine, mixerAgitatorEngine } from "./MixerAgitatorEngine.js";
export { BoilerTubeEngine, boilerTubeEngine } from "./BoilerTubeEngine.js";
export { TransformerEngine, transformerEngine } from "./TransformerEngine.js";
export { InductionHeatingEngine, inductionHeatingEngine } from "./InductionHeatingEngine.js";
export { EvaporatorDesignEngine, evaporatorDesignEngine } from "./EvaporatorDesignEngine.js";
export { CondenserDesignEngine, condenserDesignEngine } from "./CondenserDesignEngine.js";
export { DistillationColumnEngine, distillationColumnEngine } from "./DistillationColumnEngine.js";
export { FluidizedBedEngine, fluidizedBedEngine } from "./FluidizedBedEngine.js";
export { RotaryKilnEngine, rotaryKilnEngine } from "./RotaryKilnEngine.js";
export { CentrifugeEngine, centrifugeEngine } from "./CentrifugeEngine.js";
export { InjectionMoldingEngine, injectionMoldingEngine } from "./InjectionMoldingEngine.js";
export { BlowMoldingEngine, blowMoldingEngine } from "./BlowMoldingEngine.js";
export { ThermoformingEngine, thermoformingEngine } from "./ThermoformingEngine.js";
export { SpringDesignEngine, springDesignEngine } from "./SpringDesignEngine.js";
export { FlywheelEngine, flywheelEngine } from "./FlywheelEngine.js";
export { VibrationIsolatorEngine, vibrationIsolatorEngine } from "./VibrationIsolatorEngine.js";
export { GearPumpEngine, gearPumpEngine } from "./GearPumpEngine.js";
export { VacuumPumpEngine, vacuumPumpEngine } from "./VacuumPumpEngine.js";
export { AirCompressorEngine, airCompressorEngine } from "./AirCompressorEngine.js";
export { HertzContactEngine, hertzContactEngine } from "./HertzContactEngine.js";
export { JournalBearingEngine, journalBearingEngine } from "./JournalBearingEngine.js";
export { BallScrewEngine, ballScrewEngine } from "./BallScrewEngine.js";
export { ReliabilityWeibullEngine, reliabilityWeibullEngine } from "./ReliabilityWeibullEngine.js";
export { StatisticalProcessEngine, statisticalProcessEngine } from "./StatisticalProcessEngine.js";
export { InventoryEOQEngine, inventoryEOQEngine } from "./InventoryEOQEngine.js";
export { LinearRegressionEngine, linearRegressionEngine } from "./LinearRegressionEngine.js";
export { PIDControllerEngine, pidControllerEngine } from "./PIDControllerEngine.js";
export { FourierAnalysisEngine, fourierAnalysisEngine } from "./FourierAnalysisEngine.js";
export { BevelGearEngine, bevelGearEngine } from "./BevelGearEngine.js";
export { HarmonicDriveEngine, harmonicDriveEngine } from "./HarmonicDriveEngine.js";
export { CouplingEngine, couplingEngine } from "./CouplingEngine.js";
export { VenturiEngine, venturiEngine } from "./VenturiEngine.js";
export { OrificeFlowMeterEngine, orificeFlowMeterEngine } from "./OrificeFlowMeterEngine.js";
export { WaterHammerEngine, waterHammerEngine } from "./WaterHammerEngine.js";

export { WeldingEngine, weldingEngine } from './WeldingEngine.js';
export { ScrollCompressorEngine, scrollCompressorEngine } from './ScrollCompressorEngine.js';
export { CoriolisFlowMeterEngine, coriolisFlowMeterEngine } from './CoriolisFlowMeterEngine.js';

export { DrumBrakeEngine, drumBrakeEngine } from './DrumBrakeEngine.js';
export { ShockAbsorberEngine, shockAbsorberEngine } from './ShockAbsorberEngine.js';
export { UltrasonicFlowMeterEngine, ultrasonicFlowMeterEngine } from './UltrasonicFlowMeterEngine.js';

export { BoltedJointEngine, boltedJointEngine } from './BoltedJointEngine.js';
export { AdhesiveBondingEngine, adhesiveBondingEngine } from './AdhesiveBondingEngine.js';
export { CathodicProtectionEngine, cathodicProtectionEngine } from './CathodicProtectionEngine.js';

export { RackPinionEngine, rackPinionEngine } from './RackPinionEngine.js';
export { LeadScrewEngine, leadScrewEngine } from './LeadScrewEngine.js';
export { PropellerEngine, propellerEngine } from './PropellerEngine.js';

export { NozzleEngine, nozzleEngine } from './NozzleEngine.js';
export { EjectorEngine, ejectorEngine } from './EjectorEngine.js';
export { DiffuserEngine, diffuserEngine } from './DiffuserEngine.js';

export { BayesianInferenceEngine, bayesianInferenceEngine } from './BayesianInferenceEngine.js';
export { WaveletAnalysisEngine, waveletAnalysisEngine } from './WaveletAnalysisEngine.js';
export { TimeSeriesARIMAEngine, timeSeriesARIMAEngine } from './TimeSeriesARIMAEngine.js';

export { ExponentialSmoothingEngine, exponentialSmoothingEngine } from './ExponentialSmoothingEngine.js';
export { PrincipalComponentEngine, principalComponentEngine } from './PrincipalComponentEngine.js';
export { ClusterAnalysisEngine, clusterAnalysisEngine } from './ClusterAnalysisEngine.js';

export { TOPSISEngine, topsisEngine } from './TOPSISEngine.js';
export { AHPEngine, ahpEngine } from './AHPEngine.js';
export { ProjectSchedulingEngine, projectSchedulingEngine } from './ProjectSchedulingEngine.js';

export { NetworkFlowEngine, networkFlowEngine } from './NetworkFlowEngine.js';
export { OptimizationSimplexEngine, optimizationSimplexEngine } from './OptimizationSimplexEngine.js';
export { ThermocoupleEngine, thermocoupleEngine } from './ThermocoupleEngine.js';
export { RTDEngine, rtdEngine } from './RTDEngine.js';
export { CoatingThicknessEngine, coatingThicknessEngine } from './CoatingThicknessEngine.js';
export { TribologyEngine, tribologyEngine } from './TribologyEngine.js';
export { RollingBearingEngine, rollingBearingEngine } from './RollingBearingEngine.js';
export { ScrewCompressorEngine, screwCompressorEngine } from './ScrewCompressorEngine.js';
export { ReciprocatingCompressorEngine, reciprocatingCompressorEngine } from './ReciprocatingCompressorEngine.js';
export { CapacitorBankEngine, capacitorBankEngine } from './CapacitorBankEngine.js';
export { ImpellerEngine, impellerEngine } from './ImpellerEngine.js';
export { HydraulicMotorEngine, hydraulicMotorEngine } from './HydraulicMotorEngine.js';
export { BlowerEngine, blowerEngine } from './BlowerEngine.js';
export { VanePumpEngine, vanePumpEngine } from './VanePumpEngine.js';
export { DiaphragmPumpEngine, diaphragmPumpEngine } from './DiaphragmPumpEngine.js';
export { HypoidGearEngine, hypoidGearEngine } from './HypoidGearEngine.js';
export { CycloidDriveEngine, cycloidDriveEngine } from './CycloidDriveEngine.js';
export { HeatExchangerPlateEngine, heatExchangerPlateEngine } from './HeatExchangerPlateEngine.js';
export { BrazingSolderingEngine, brazingSolderingEngine } from './BrazingSolderingEngine.js';
export { RivetedJointEngine, rivetedJointEngine } from './RivetedJointEngine.js';
export { UltrasonicWeldingEngine, ultrasonicWeldingEngine } from './UltrasonicWeldingEngine.js';

// CAMK-MS1: Novel Algorithm → G-Code Pipeline
export { segmentInterpolatorEngine } from "./SegmentInterpolatorEngine.js";
export { novelPostProcessorBridgeEngine } from "./NovelPostProcessorBridgeEngine.js";
export { programStructureEngine } from "./ProgramStructureEngine.js";
export { gCodeVerificationEngine } from "./GCodeVerificationEngine.js";
export { endToEndPipelineEngine } from "./EndToEndPipelineEngine.js";
export { EDMWireEngine, edmWireEngine } from './EDMWireEngine.js';
export { AnodizingProcessEngine, anodizingProcessEngine } from './AnodizingProcessEngine.js';
export { AccumulatorEngine, accumulatorEngine } from './AccumulatorEngine.js';

// Machining Playbook — experiential knowledge (sequencing, anti-patterns, best practices)
export { machiningPlaybookEngine, MachiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
export { TransportationProblemEngine, transportationProblemEngine } from './TransportationProblemEngine.js';
export { AssignmentProblemEngine, assignmentProblemEngine } from './AssignmentProblemEngine.js';
export { MarkovDecisionEngine, markovDecisionEngine } from './MarkovDecisionEngine.js';
export { PowderCompactionEngine, powderCompactionEngine } from './PowderCompactionEngine.js';
export { SinteringProcessEngine, sinteringProcessEngine } from './SinteringProcessEngine.js';
export { SprayDryerEngine, sprayDryerEngine } from './SprayDryerEngine.js';

export { calenderingEngine, CalenderingEngine } from "./CalenderingEngine.js";
export { filamentWindingEngine, FilamentWindingEngine } from "./FilamentWindingEngine.js";
export { resinTransferEngine, ResinTransferEngine } from "./ResinTransferEngine.js";

// SCI-MS0: Sensor Integration & Real-Time Data Framework
export { sensorDataSchemaEngine } from "./SensorDataSchemaEngine.js";
export { sensorSimulatorEngine } from "./SensorSimulatorEngine.js";
export { sensorFusionEngine } from "./SensorFusionEngine.js";
export { realTimeAnomalyDetectionEngine } from "./RealTimeAnomalyDetectionEngine.js";

// Physics Auto-Calibration Engine — Bayesian calibration of physics constants from real cutting data [QS-MS6 P2]
export { physicsAutoCalibrationEngine, PhysicsAutoCalibrationEngine, type CalibrationMeasurement, type CalibrationResult, type CalibrationPrediction, type CalibrationState, type MaterialCalibrationState, type BayesianPosterior } from "./PhysicsAutoCalibrationEngine.js";

export { magneticBearingEngine, MagneticBearingEngine } from "./MagneticBearingEngine.js";
export { flotationCellEngine, FlotationCellEngine } from "./FlotationCellEngine.js";
export { crystallizationEngine, CrystallizationEngine } from "./CrystallizationEngine.js";

export { membraneFiltrationEngine, MembraneFiltrationEngine } from "./MembraneFiltrationEngine.js";
export { absorptionChillerEngine, AbsorptionChillerEngine } from "./AbsorptionChillerEngine.js";
export { furnaceHeatingEngine, FurnaceHeatingEngine } from "./FurnaceHeatingEngine.js";

export { quenchingProcessEngine, QuenchingProcessEngine } from "./QuenchingProcessEngine.js";
export { carburizingEngine, CarburizingEngine } from "./CarburizingEngine.js";
export { nitridingProcessEngine, NitridingProcessEngine } from "./NitridingProcessEngine.js";

export { pultrusionProcessEngine, PultrusionProcessEngine } from "./PultrusionProcessEngine.js";
export { autoclaveProcessEngine, AutoclaveProcessEngine } from "./AutoclaveProcessEngine.js";
export { peristalticPumpEngine, PeristalticPumpEngine } from "./PeristalticPumpEngine.js";

export { progressiveCavityPumpEngine, ProgressiveCavityPumpEngine } from "./ProgressiveCavityPumpEngine.js";
export { axialPistonPumpEngine, AxialPistonPumpEngine } from "./AxialPistonPumpEngine.js";
export { thickenerEngine, ThickenerEngine } from "./ThickenerEngine.js";

export { balancingMachineEngine, BalancingMachineEngine } from "./BalancingMachineEngine.js";
export { rocketNozzleEngine, RocketNozzleEngine } from "./RocketNozzleEngine.js";
export { thermoelectricEngine, ThermoelectricEngine } from "./ThermoelectricEngine.js";

export { electrospinningEngine, ElectrospinningEngine } from "./ElectrospinningEngine.js";
export { freezeDryingEngine, FreezeDryingEngine } from "./FreezeDryingEngine.js";
export { plasmaCuttingEngine, PlasmaCuttingEngine } from "./PlasmaCuttingEngine.js";

export { LaserWeldingEngine, laserWeldingEngine } from "./LaserWeldingEngine.js";
export { FrictionStirWeldingEngine, frictionStirWeldingEngine } from "./FrictionStirWeldingEngine.js";
export { EBWeldingEngine, ebWeldingEngine } from "./EBWeldingEngine.js";

export { VacuumCastingEngine, vacuumCastingEngine } from "./VacuumCastingEngine.js";
export { CentrifugalCastingEngine, centrifugalCastingEngine } from "./CentrifugalCastingEngine.js";
export { ThinFilmDepositionEngine, thinFilmDepositionEngine } from "./ThinFilmDepositionEngine.js";

export { ChemicalVaporDepositionEngine, chemicalVaporDepositionEngine } from "./ChemicalVaporDepositionEngine.js";
export { IonImplantationEngine, ionImplantationEngine } from "./IonImplantationEngine.js";
export { SputteringProcessEngine, sputteringProcessEngine } from "./SputteringProcessEngine.js";

export { EvaporatorProcessEngine, evaporatorProcessEngine } from "./EvaporatorProcessEngine.js";
export { SprayDryingEngine, sprayDryingEngine } from "./SprayDryingEngine.js";
export { GranulationProcessEngine, granulationProcessEngine } from "./GranulationProcessEngine.js";

export { RotationalMoldingEngine, rotationalMoldingEngine } from "./RotationalMoldingEngine.js";
export { ScrewExtrusionEngine, screwExtrusionEngine } from "./ScrewExtrusionEngine.js";
export { CompressionMoldingEngine, compressionMoldingEngine } from "./CompressionMoldingEngine.js";

export { VibratoryFeederEngine, vibratoryFeederEngine } from "./VibratoryFeederEngine.js";
export { PneumaticConveyingEngine, pneumaticConveyingEngine } from "./PneumaticConveyingEngine.js";
export { ElectrostaticPrecipitatorEngine, electrostaticPrecipitatorEngine } from "./ElectrostaticPrecipitatorEngine.js";

export { ResistanceWeldingEngine, resistanceWeldingEngine } from "./ResistanceWeldingEngine.js";
export { SolderingProcessEngine, solderingProcessEngine } from "./SolderingProcessEngine.js";
export { BrazingProcessEngine, brazingProcessEngine } from "./BrazingProcessEngine.js";

export { ThermalSprayEngine, thermalSprayEngine } from "./ThermalSprayEngine.js";
export { PhotochemicalEtchingEngine, photochemicalEtchingEngine } from "./PhotochemicalEtchingEngine.js";

// SCI-MS1 — Adaptive Control
export { AdaptiveFeedControlEngine, adaptiveFeedControlEngine } from "./AdaptiveFeedControlEngine.js";
export { AdaptiveSpindleControlEngine, adaptiveSpindleControlEngine } from "./AdaptiveSpindleControlEngine.js";
export { BayesianAdaptiveEngine, bayesianAdaptiveEngine } from "./BayesianAdaptiveEngine.js";
export { ToolLifeAdaptiveEngine, toolLifeAdaptiveEngine } from "./ToolLifeAdaptiveEngine.js";
export { DigitalTwinSyncEngine, digitalTwinSyncEngine } from "./DigitalTwinSyncEngine.js";

// SCI-MS2 — Validation Framework
export { PredictionValidationEngine, predictionValidationEngine } from "./PredictionValidationEngine.js";
export { BenchmarkSuiteEngine, benchmarkSuiteEngine } from "./BenchmarkSuiteEngine.js";
export { UncertaintyQuantificationEngine, uncertaintyQuantificationEngine } from "./UncertaintyQuantificationEngine.js";
export { ContinuousImprovementEngine, continuousImprovementEngine } from "./ContinuousImprovementEngine.js";

// SCI-MS3 — Advanced Scientific Domains
export { StochasticProcessEngine, stochasticProcessEngine } from "./StochasticProcessEngine.js";
export { InformationTheoryEngine, informationTheoryEngine } from "./InformationTheoryEngine.js";
export { OptimalControlEngine, optimalControlEngine } from "./OptimalControlEngine.js";
export { GraphTheoryEngine, graphTheoryEngine } from "./GraphTheoryEngine.js";
export { FuzzyNeuralHybridEngine, fuzzyNeuralHybridEngine } from "./FuzzyNeuralHybridEngine.js";

export { CodeSystemIndexEngine, codeSystemIndexEngine } from "./CodeSystemIndexEngine.js";

// ── Missing Barrel Exports (29 engines) ──

// Exhaustive Science (singleton-only exports)
export { advancedCuttingPhysicsEngine } from "./AdvancedCuttingPhysicsEngine.js";
export { advancedCuttingMathEngine } from "./AdvancedCuttingMathEngine.js";
export { advancedWearPhysicsEngine } from "./AdvancedWearPhysicsEngine.js";
export { AdvancedMathematicalMethodsEngine } from "./AdvancedMathematicalMethodsEngine.js";
export { MetaheuristicOptimizationEngine } from "./MetaheuristicOptimizationEngine.js";
export { StatisticalMLEngine } from "./StatisticalMLEngine.js";
export { MathIntegrationPipelineEngine } from "./MathIntegrationPipelineEngine.js";
export { TimeSeriesForecastEngine } from "./TimeSeriesForecastEngine.js";
export { EnsembleMLEngine } from "./EnsembleMLEngine.js";
export { CrossPhysicsCouplingEngine } from "./CrossPhysicsCouplingEngine.js";
export { AdaptiveCalibrationEngine } from "./AdaptiveCalibrationEngine.js";
export { DimensionlessNumbersEngine } from "./DimensionlessNumbersEngine.js";
export { ProcessSynthesisEngine } from "./ProcessSynthesisEngine.js";
export { MachineLearningFeedbackEngine } from "./MachineLearningFeedbackEngine.js";
export { FeedbackPersistenceEngine } from "./FeedbackPersistenceEngine.js";
export { PredictionFeedbackOrchestratorEngine } from "./PredictionFeedbackOrchestratorEngine.js";
export { StratifiedCalibrationEngine } from "./StratifiedCalibrationEngine.js";
export { constitutiveModelEngine } from "./ConstitutiveModelEngine.js";
export { coolantDynamicsEngine } from "./CoolantDynamicsEngine.js";
export { coolantOptimizationPhysicsEngine, CoolantOptimizationPhysicsEngine } from "./CoolantOptimizationPhysicsEngine.js";
export { reliabilityEngineeringEngine } from "./ReliabilityEngineeringEngine.js";
export { statisticalProcessMonitoringEngine } from "./StatisticalProcessMonitoringEngine.js";
export { sustainabilityLCAEngine } from "./SustainabilityLCAEngine.js";
export { machineGeometricAccuracyEngine } from "./MachineGeometricAccuracyEngine.js";

// Post-Processor / G-Code
export { GCodeSafetyAnalyzerEngine } from "./GCodeSafetyAnalyzerEngine.js";
export { CycleTimeEstimatorEngine, cycleTimeEstimatorEngine } from "./CycleTimeEstimatorEngine.js";
export { SetupSheetFromGCodeEngine, setupSheetFromGCodeEngine } from "./SetupSheetFromGCodeEngine.js";
export { GCodeEnergyOptimizerEngine, gcodeEnergyOptimizerEngine } from "./GCodeEnergyOptimizerEngine.js";
export { ProbeRoutineGeneratorEngine, probeRoutineGeneratorEngine } from "./ProbeRoutineGeneratorEngine.js";

// Auto Speed/Feed + Math/Stats
export { autoSpeedFeedEngine } from "./AutoSpeedFeedEngine.js";
export { manufacturingKnowledgeGraphEngine } from "./ManufacturingKnowledgeGraphEngine.js";
export { manufacturingStatisticsEngine } from "./ManufacturingStatisticsEngine.js";
export { toolWearCompensationEngine } from "./ToolWearCompensationEngine.js";
export { machineMatcherEngine } from "./MachineMatcherEngine.js";

// CAM / Toolpath
export { ToolpathThermalEngine, toolpathThermalEngine } from "./ToolpathThermalEngine.js";
export { MultiAxisKinematicEngine, multiAxisKinematicEngine } from "./MultiAxisKinematicEngine.js";
export { MultiCamStrategyEngineExt, multiCamStrategyEngineExt } from "./MultiCamStrategyEngineExt.js";

// CNC Programming
export { cncProgramAssemblerEngine } from "./CNCProgramAssemblerEngine.js";
export { motionDynamicsProfileEngine } from "./MotionDynamicsProfileEngine.js";
export { engagementAdaptiveFeedEngine } from "./EngagementAdaptiveFeedEngine.js";
export { gcodeIntelligencePipeline } from "./GCodeIntelligencePipelineEngine.js";

// Calibration
export { CalibrationEngine, calibrationEngine } from "./CalibrationEngine.js";

// Misc
export { BurrFormationEngine, burrFormationEngine } from "./BurrFormationEngine.js";
export { videoLearningEngine } from "./VideoLearningEngine.js";

export { toolMagazineOptimizationEngine, ToolMagazineOptimizationEngine } from './ToolMagazineOptimizationEngine.js';
export { vibrationAssistedMachiningEngine, VibrationAssistedMachiningEngine } from './VibrationAssistedMachiningEngine.js';
export { ergonomicWorkstationEngine, ErgonomicWorkstationEngine } from './ErgonomicWorkstationEngine.js';

// VAR-MS0: Stochastic Physics Extensions
export { stochasticCuttingForceEngine } from "./StochasticCuttingForceEngine.js";
export { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
export { stochasticThermalEngine } from "./StochasticThermalEngine.js";
export { stochasticSurfaceFinishEngine } from "./StochasticSurfaceFinishEngine.js";
export { stochasticChatterEngine } from "./StochasticChatterEngine.js";
export { uncertaintyPropagationPipelineEngine } from "./UncertaintyPropagationPipelineEngine.js";

export { fileSystemNavigatorEngine, FileSystemNavigatorEngine } from './FileSystemNavigatorEngine.js';

// Phase 5 Forge: 5 Novel Physics Engines
export { additiveManufacturingPhysicsEngine, AdditiveManufacturingPhysicsEngine } from './AdditiveManufacturingPhysicsEngine.js';
export { reliabilityBlockDiagramEngine, ReliabilityBlockDiagramEngine } from './ReliabilityBlockDiagramEngine.js';
export { cryogenicCuttingEngine, CryogenicCuttingEngine } from './CryogenicCuttingEngine.js';
export { machiningAcousticsEngine, MachiningAcousticsEngine } from './MachiningAcousticsEngine.js';
export { laserAblationPhysicsEngine, LaserAblationPhysicsEngine } from './LaserAblationPhysicsEngine.js';

// Phase 5 Forge C: Gap-Closing Engines
export { assemblyOptimizationEngine, AssemblyOptimizationEngine } from './AssemblyOptimizationEngine.js';
export { energyHarvestingEngine, EnergyHarvestingEngine } from './EnergyHarvestingEngine.js';
export { transferLearningEngine, TransferLearningEngine } from './TransferLearningEngine.js';
export { cmmPathPlanningEngine, CMMPathPlanningEngine } from './CMMPathPlanningEngine.js';
export { lamThermalSofteningEngine, LAMThermalSofteningEngine } from './LAMThermalSofteningEngine.js';

export { sweptVolumeEngine, SweptVolumeEngine } from './SweptVolumeEngine.js';
export { toolAssemblyModelEngine, ToolAssemblyModelEngine } from './ToolAssemblyModelEngine.js';

// USF-MS0: Speed/Feed Orchestrator + Tool Library + Geometry Pipeline
export { speedFeedOrchestratorEngine, SpeedFeedOrchestratorEngine } from './SpeedFeedOrchestratorEngine.js';
export { crossPipelineWhatIfEngine, CrossPipelineWhatIfEngine } from './CrossPipelineWhatIfEngine.js';
export { userToolLibraryEngine, UserToolLibraryEngine } from './UserToolLibraryEngine.js';
export { partGeometryPipelineEngine, PartGeometryPipelineEngine } from './PartGeometryPipelineEngine.js';

// Lathe: Turning Program Assembler (print → G-code pipeline)
export { turningProgramAssemblerEngine } from './TurningProgramAssemblerEngine.js';
export { GrindingProgramAssemblerEngine } from './GrindingProgramAssemblerEngine.js';

export { cncSimulationPipelineEngine, CNCSimulationPipelineEngine } from './CNCSimulationPipelineEngine.js';

export { simulationReportEngine, SimulationReportEngine } from './SimulationReportEngine.js';
export { physicsAwareSimulationEngine, PhysicsAwareSimulationEngine } from './PhysicsAwareSimulationEngine.js';

export { predictiveSimulationEngine, PredictiveSimulationEngine } from './PredictiveSimulationEngine.js';

export { simulationVisualizationBridgeEngine, SimulationVisualizationBridgeEngine } from './SimulationVisualizationBridgeEngine.js';

export { calibratedSimulationEngine, CalibratedSimulationEngine } from './CalibratedSimulationEngine.js';

// Wired-but-unexported batch (2026-03-14)
export { controllerDialectEngine, ControllerDialectEngineImpl } from './ControllerDialectEngine.js';
export { environmentalVariationEngine, EnvironmentalVariationEngine } from './EnvironmentalVariationEngine.js';

// Batch 3 — missing dispatcher-wired engines
export { processVariabilityIntegrationEngine, ProcessVariabilityIntegrationEngine } from './ProcessVariabilityIntegrationEngine.js';
export { stochasticDeflectionEngine, StochasticDeflectionEngine } from './StochasticDeflectionEngine.js';
export { stochasticDimensionalEngine, StochasticDimensionalEngine } from './StochasticDimensionalEngine.js';
export { stochasticEDMEngine, StochasticEDMEngine } from './StochasticEDMEngine.js';
export { stochasticGrindingEngine, StochasticGrindingEngine } from './StochasticGrindingEngine.js';
export { stochasticToolWearEngine, StochasticToolWearEngine } from './StochasticToolWearEngine.js';
export { stochasticWrapperEngine } from './StochasticWrapperEngine.js';
export { surfaceFinishEngine, SurfaceFinishEngine } from './SurfaceFinishEngine.js';
export { thermalWearCouplingEngine, ThermalWearCouplingEngine } from './ThermalWearCouplingEngine.js';

// Batch 4 — dispatcher-wired engines missing from index (2026-03-14)
export { fiveAxisPostEngine, FiveAxisPostEngineImpl } from './FiveAxisPostEngine.js';
export { kienzleForceModelEngine, KienzleForceModelEngine } from './KienzleForceModelEngine.js';
export { getKinematicModel, checkCollision, getKinematicCoverage, type FiveAxisTopology, type TransformationMatrix, type CollisionZone, type KinematicModel } from './MachineKinematicsEngine.js';
export { materialBatchVariabilityEngine, MaterialBatchVariabilityEngine } from './MaterialBatchVariabilityEngine.js';
export { minerCumulativeDamageEngine } from './MinerCumulativeDamageEngine.js';
export { morrisScreeningEngine } from './MorrisScreeningEngine.js';
export { multipleRegressionEngine } from './MultipleRegressionEngine.js';
export { nelsonSPCRulesEngine } from './NelsonSPCRulesEngine.js';
export { postProcessorPipelineEngine, PostProcessorPipelineEngineImpl } from './PostProcessorPipelineEngine.js';
export { postProcessorVerificationEngine, PostProcessorVerificationEngineImpl } from './PostProcessorVerificationEngine.js';

// Batch 5 — orphaned engines wired to dispatchers (2026-03-14)
export { ThreadMillingPhysicsEngine } from './ThreadMillingPhysicsEngine.js';
export { deepHoleDrillingPhysicsEngine, DeepHoleDrillingPhysicsEngine } from './DeepHoleDrillingPhysicsEngine.js';
export { cadOperationTaxonomyEngine, CADOperationTaxonomyEngine } from './CADOperationTaxonomyEngine.js';
export { cadQueryCodeGeneratorEngine, CadQueryCodeGeneratorEngine } from './CadQueryCodeGeneratorEngine.js';
export { fusion360CodeGeneratorEngine, Fusion360CodeGeneratorEngine } from './Fusion360CodeGeneratorEngine.js';
export { fusion360LiveBridgeEngine, Fusion360LiveBridgeEngine } from './Fusion360LiveBridgeEngine.js';
export { fusionToolSyncEngine, FusionToolSyncEngine } from './FusionToolSyncEngine.js';
export { metrologyUncertaintyEngine, MetrologyUncertaintyEngine } from './MetrologyUncertaintyEngine.js';
export { integratedVerificationEngine, IntegratedVerificationEngine } from './IntegratedVerificationEngine.js';

// Batch 6 — fluidThermalDispatcher wiring (2026-03-14)

// Batch 7 — Video/VAR pipeline + infrastructure exports (2026-03-14)
export { videoActionExtractorEngine, VideoActionExtractorEngine } from './VideoActionExtractorEngine.js';
export { videoReplayOrchestratorEngine, VideoReplayOrchestratorEngine } from './VideoReplayOrchestratorEngine.js';
export { videoReplayPipelineEngine, VideoReplayPipelineEngine } from './VideoReplayPipelineEngine.js';
export { visionActionAnalyzerEngine, VisionActionAnalyzerEngine } from './VisionActionAnalyzerEngine.js';
export { interactiveLearningSessionEngine, InteractiveLearningSessionEngine } from './InteractiveLearningSessionEngine.js';
export { executionVerificationEngine, ExecutionVerificationEngine } from './ExecutionVerificationEngine.js';
export { playwrightAutomationEngine, PlaywrightAutomationEngine } from './PlaywrightAutomationEngine.js';

// Batch 8 — Orphan CAM engines wired to camDispatcher (2026-03-14)
export { instantaneousEngagementEngine } from './InstantaneousEngagementEngine.js';
export { multiCAMPostEngine } from './MultiCAMPostEngine.js';
export { productionToolpathEngine, ProductionToolpathEngine } from './ProductionToolpathEngine.js';
export { postProcessorAPIEngine } from './PostProcessorAPIEngine.js';
export { scalableCAMOrchestratorEngine, ScalableCAMOrchestratorEngine } from './ScalableCAMOrchestratorEngine.js';
export { unifiedCAMPipelineEngine, UnifiedCAMPipelineEngine } from './UnifiedCAMPipelineEngine.js';
export { smartToolSelectorEngine, SmartToolSelectorEngine } from './SmartToolSelectorEngine.js';
export { adaptiveToolpathRouterEngine, AdaptiveToolpathRouterEngine } from './AdaptiveToolpathRouterEngine.js';
export { cumulativeStockChainEngine, CumulativeStockChainEngine } from './CumulativeStockChainEngine.js';
export { featureClusteringEngine, FeatureClusteringEngine } from './FeatureClusteringEngine.js';
export { productionPackageEngine, ProductionPackageEngine } from './ProductionPackageEngine.js';

// Batch 8 — Science/Stats orphaned engine wiring (2026-03-14)
export { advancedCuttingPhenomenaEngine } from './AdvancedCuttingPhenomenaEngine.js';
export { advancedCuttingPhysicsExtEngine } from './AdvancedCuttingPhysicsExtEngine.js';
export { advancedMLStatisticsEngine } from './AdvancedMLStatisticsEngine.js';
export { advancedRegressionEngine } from './AdvancedRegressionEngine.js';
export { advancedStatisticalLearningEngine } from './AdvancedStatisticalLearningEngine.js';
export { advancedUncertaintyEngine } from './AdvancedUncertaintyEngine.js';
export { advancedUncertaintyMethodsEngine } from './AdvancedUncertaintyMethodsEngine.js';
export { coffinMansonFatigueEngine } from './CoffinMansonFatigueEngine.js';
export { CompositeMachiningPhysicsEngine } from './CompositeMachiningPhysicsEngine.js';
export { dimensionalAnalysisCrossValidationEngine } from './DimensionalAnalysisCrossValidationEngine.js';
export { empiricalCorrelationEngine } from './EmpiricalCorrelationEngine.js';
export { fundamentalPhysicsCompletionEngine } from './FundamentalPhysicsCompletionEngine.js';
export { kdeGradientBoostEngine } from './KDEGradientBoostEngine.js';
export { permutationTestEngine } from './PermutationTestEngine.js';
export { processFingerprintEngine } from './ProcessFingerprintEngine.js';
export { reliabilityOptimizationEngine } from './ReliabilityOptimizationEngine.js';
export { residualStressPredictionEngine } from './ResidualStressPredictionEngine.js';
export { signalProcessingToolkitEngine } from './SignalProcessingToolkitEngine.js';
export { timeSeriesCompletionEngine } from './TimeSeriesCompletionEngine.js';
export { varianceReductionEngine } from './VarianceReductionEngine.js';

// Batch 9 � final unexported engines (2026-03-14)
export { assemblyEngine } from './AssemblyEngine.js';
export { multiProcessCAMBridgeEngine, MultiProcessCAMBridgeEngine } from './MultiProcessCAMBridgeEngine.js';

// CK-MS6 — Mill-Turn & Swiss Pipeline
export { millTurnSwissPipelineEngine, MillTurnSwissPipelineEngine } from './MillTurnSwissPipelineEngine.js';
export { selfLearningCAMEngine, SelfLearningCAMEngine } from './SelfLearningCAMEngine.js';
export { turningProfileEngine, TurningProfileEngine } from './TurningProfileEngine.js';
export { sheetNestingEngine, SheetNestingEngine } from './SheetNestingEngine.js';
export { dxfParserEngine, DXFParserEngine } from './DXFParserEngine.js';

// CK-MS11 — Stochastic Routing, Probing Programs, DFM Feedback
export { stochasticRoutingEngine, StochasticRoutingEngine } from './StochasticRoutingEngine.js';
export { probingProgramEngine, ProbingProgramEngine } from './ProbingProgramEngine.js';
export { dfmFeedbackEngine, DFMFeedbackEngine } from './DFMFeedbackEngine.js';

// MF Track — Machining Feasibility Intelligence
export { workpieceStateEngine, WorkpieceStateEngine } from './WorkpieceStateEngine.js';
export { accessibilityAnalysisEngine, AccessibilityAnalysisEngine } from './AccessibilityAnalysisEngine.js';
export { workholdingViabilityEngine, WorkholdingViabilityEngine } from './WorkholdingViabilityEngine.js';
export { workholdingRetrofitAdvisorEngine, WorkholdingRetrofitAdvisorEngine } from './WorkholdingRetrofitAdvisorEngine.js';
export { rigidityDegradationEngine, RigidityDegradationEngine } from './RigidityDegradationEngine.js';


// Laser Program Assembler
export { LaserProgramAssemblerEngine } from './LaserProgramAssemblerEngine.js';

// Resource Optimization — hyperMILL database extraction (2026-03-14)
export { HyperMillMaterialBridgeEngine } from './HyperMillMaterialBridgeEngine.js';
export { ISO286ExtendedEngine } from './ISO286ExtendedEngine.js';
export { MultiProcessCAMRouterEngine } from "./MultiProcessCAMRouterEngine.js";

// CK-MS7 — CAM Kernel Orchestrator (cam_generate, cam_turn, cam_simulate)
export { camKernelOrchestratorEngine, CAMKernelOrchestratorEngine } from './CAMKernelOrchestratorEngine.js';

// PIPE-MS0 — Print-to-Program Pipeline (print_to_program_full, print_to_program_plan, print_to_program_validate)
export { printToProgramPipelineEngine, PrintToProgramPipelineEngine } from "./PrintToProgramPipelineEngine.js";

// ── CK Track — CAM Kernel (CK-MS0 through CK-MS8) ──────────────
// CK-MS4: Advanced Milling Strategies
export { AdvancedMillingStrategiesEngine, advancedMillingStrategiesEngine } from "./AdvancedMillingStrategiesEngine.js";
// CK-MS5: 5-Axis Integration
export { FiveAxisCAMIntegrationEngine, fiveAxisCAMIntegrationEngine } from "./FiveAxisCAMIntegrationEngine.js";
// CK-MS6: Mill-Turn & Swiss
export { MillTurnCAMEngine, millTurnCAMEngine } from "./MillTurnCAMEngine.js";
// CK-MS7: Dispatcher Bridge
export { dispatchCAMAction, listCAMActions, camKernelDispatcherBridge } from "./CAMKernelDispatcherBridge.js";
// Intelligent Sequencing (33-rule production ordering)
export { IntelligentSequencingEngine, intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
// MF-MS3: Setup Transition + Predictive Failure + Force Capability
export { SetupTransitionEngine, setupTransitionEngine } from "./SetupTransitionEngine.js";
// MF track — remaining unexported engines
export { feasibilityAnalysisEngine, FeasibilityAnalysisEngine } from "./FeasibilityAnalysisEngine.js";
export { feasibilityOrchestratorEngine } from "./FeasibilityOrchestratorEngine.js";
export { forceCapabilityEngine, ForceCapabilityEngine } from "./ForceCapabilityEngine.js";
export { inventoryAwareToolSelectorEngine, InventoryAwareToolSelectorEngine } from "./InventoryAwareToolSelectorEngine.js";
export { printToGeometryEngine, PrintToGeometryEngine } from "./PrintToGeometryEngine.js";
export { roiAdvisorEngine, ROIAdvisorEngine } from "./ROIAdvisorEngine.js";
export { sequenceFeasibilityEngine, SequenceFeasibilityEngine } from "./SequenceFeasibilityEngine.js";

// PhysicsMLHybridEngine — 20 HYBRID formulas (coupled physics, ML-physics, optimization, online learning, system-level)
export { physicsMLHybridEngine, PhysicsMLHybridEngine } from "./PhysicsMLHybridEngine.js";

// CK-MS12 — NLP CAM Parser, Program Compare, Result Cache, Batch CAM
export {
  NLPCAMParserEngine, nlpCAMParserEngine,
  type ParsedCAMRequest,
} from "./NLPCAMParserEngine.js";
export {
  ProgramCompareEngine, programCompareEngine,
  type DiffLine, type DiffLineType, type ToolEntry as CompareToolEntry,
  type PhysicsComparison, type PhysicsSnapshot, type CycleTimeComparison,
  type ToolUsageComparison, type SafetyDiff, type FullComparison,
} from "./ProgramCompareEngine.js";
export {
  CAMResultCacheEngine, camResultCacheEngine,
  type CacheEntry, type CacheStats, type CacheOptions,
} from "./CAMResultCacheEngine.js";
export {
  BatchCAMEngine, batchCAMEngine,
  type BatchPart, type PartFeature, type SharedConfig, type BatchOptions,
  type PartResult, type ToolUsed, type BatchSummary,
} from "./BatchCAMEngine.js";

// ThreadStrengthFatigueEngine — Thread shear/pullout, Goodman fatigue, bolt preload, Junker loosening, joint analysis
export { threadStrengthFatigueEngine, ThreadStrengthFatigueEngine } from "./ThreadStrengthFatigueEngine.js";

// UnifiedPhysicsVerifierEngine — Cross-pipeline consistency checker (QS-MS6)
export { unifiedPhysicsVerifierEngine, UnifiedPhysicsVerifierEngine } from "./UnifiedPhysicsVerifierEngine.js";

// PipelineConsistencyHookEngine — Post-pipeline canonical divergence hook (QS-MS6 P3)
export { pipelineConsistencyHookEngine, PipelineConsistencyHookEngine, type ConsistencyCheckInput, type ConsistencyCheckResult, type MetricComparison } from "./PipelineConsistencyHookEngine.js";

// ToolInventoryOrchestratorEngine — Inventory-aware tool intelligence
export { toolInventoryOrchestratorEngine, ToolInventoryOrchestratorEngine } from "./ToolInventoryOrchestratorEngine.js";

// OperatorDashboardOrchestratorEngine — Unified real-time shop floor monitoring dashboard
export { operatorDashboardOrchestratorEngine, OperatorDashboardOrchestratorEngine } from "./OperatorDashboardOrchestratorEngine.js";

// Part Family Economics — EOQ, tool rotation, ABC cost drivers, batch purchasing
export { partFamilyEconomicsEngine, PartFamilyEconomicsEngine } from "./PartFamilyEconomicsEngine.js";

// DesignToFloorPipelineEngine — Closed-loop manufacturing pipeline (Design->Simulate->Execute->Measure->Calibrate->Improve)
export { designToFloorPipelineEngine, DesignToFloorPipelineEngine } from "./DesignToFloorPipelineEngine.js";

// DimensionImputationEngine — Statistical dimension imputation for cutting tools (OLS/KNN)
export { dimensionImputationEngine, DimensionImputationEngine, type ImputationModel, type ImputationResult, type DimensionStats, type DimensionOutlier } from "./DimensionImputationEngine.js";

// IndustryStandardsComplianceEngine — ISO 2768/1302/AS9100/ISO 13485/IATF 16949/DIN 65151/ISO 14644
export { industryStandardsComplianceEngine, IndustryStandardsComplianceEngine } from "./IndustryStandardsComplianceEngine.js";

// TestingProtocolEngine — ISO 3685 tool life / ISO 4287-4288 surface / ISO 14253-1 dimensional
export { testingProtocolEngine, TestingProtocolEngine } from "./TestingProtocolEngine.js";

// CertificationTrackingEngine — Material cert / tool cert / machine calibration / audit reports
export { certificationTrackingEngine, CertificationTrackingEngine } from "./CertificationTrackingEngine.js";

// HobbyCNCProfileEngine — Hobby/desktop CNC machine database (GRBL/LinuxCNC/Mach3/4/PathPilot/Marlin/FluidNC)
export { hobbyCNCProfileEngine, HobbyCNCProfileEngine } from "./HobbyCNCProfileEngine.js";

// CobotMachiningEngine — Collaborative robot machining safety (ISO 10218/15066) & task planning
export { cobotMachiningEngine, CobotMachiningEngine } from "./CobotMachiningEngine.js";

// Non-Traditional Machining: USM, ECM, AJM
export { ultrasonicMachiningPhysicsEngine, UltrasonicMachiningPhysicsEngine } from './UltrasonicMachiningPhysicsEngine.js';
export { electrochemicalMachiningEngine, ElectrochemicalMachiningEngine } from './ElectrochemicalMachiningEngine.js';
export { abrasiveJetMachiningEngine, AbrasiveJetMachiningEngine } from './AbrasiveJetMachiningEngine.js';

// ShiftScheduleOptimizerEngine — Greedy job-to-machine scheduling with Gantt, load balancing, what-if
export { shiftScheduleOptimizerEngine, type ScheduleResult as ShiftScheduleResult, type ScheduleInput as ShiftScheduleInput, type LoadBalanceInput, type LoadBalanceResult, type WhatIfInput, type WhatIfResult } from "./ShiftScheduleOptimizerEngine.js";

// GrafanaBridgeEngine — Bidirectional Grafana/Prometheus integration for shop floor monitoring
export { grafanaBridgeEngine, GrafanaBridgeEngine, type GrafanaConfig, type MetricSample, type PushMetricsInput, type PushMetricsResult, type PrometheusQueryInput, type PrometheusRangeQueryInput, type PrometheusQueryResult, type DashboardPanel, type CreateDashboardInput, type CreateDashboardResult, type AlertRule, type ConfigureAlertsInput, type ConfigureAlertsResult, type SimulationMetricsInput, type SPCMetricsInput, type ToolLifeMetricsInput, type ExportMetricsResult } from "./GrafanaBridgeEngine.js";

// BottleneckAnalysisEngine — Theory of Constraints, Drum-Buffer-Rope, sensitivity analysis
export { bottleneckAnalysisEngine, type ResourceInput, type BottleneckResult as BottleneckAnalysisResult, type DBRInput, type DBRResult, type SensitivityInput as BottleneckSensitivityInput, type SensitivityResult as BottleneckSensitivityResult } from "./BottleneckAnalysisEngine.js";

// PredictiveMaintenanceOrchestratorEngine — Multi-signal health scoring (ISO 10816), maintenance planning, failure history
export { predictiveMaintenanceOrchestratorEngine, type HealthInput, type HealthResult, type MaintenancePlanInput, type MaintenancePlanResult, type FailureHistoryInput, type FailureHistoryResult } from "./PredictiveMaintenanceOrchestratorEngine.js";

// StochasticCompositesEngine — MC delamination risk + Sobol sensitivity for composite machining
export { stochasticCompositesEngine, StochasticCompositesEngine } from "./StochasticCompositesEngine.js";

// StochasticGrindingDressingEngine — Wheel life MC + dressing interval optimization under uncertainty
export { stochasticGrindingDressingEngine, StochasticGrindingDressingEngine } from "./StochasticGrindingDressingEngine.js";

// StepImportEngine — STEP/AP203/AP214 import via occt-import-js WASM (RX-MS0 P3-U02)
export { stepImportEngine, StepImportEngine } from "./StepImportEngine.js";

// AdvancedReportRendererEngine — Tool life forecast, capability study, stability map, cost sensitivity, cycle time variance, scrap reports
export { advancedReportRendererEngine, AdvancedReportRendererEngine } from "./AdvancedReportRendererEngine.js";

// ChartDataGeneratorEngine — Pareto, waterfall, control, stability lobe, histogram chart data
export { chartDataGeneratorEngine, ChartDataGeneratorEngine } from "./ChartDataGeneratorEngine.js";

// CrossCatalogValidationEngine — ENRICH-MS4: Cross-manufacturer tool data quality validation (stats, outliers, duplicates)
export { crossCatalogValidationEngine, CrossCatalogValidationEngine } from "./CrossCatalogValidationEngine.js";

// OpcUaConnectorEngine — Live CNC machine connectivity via OPC-UA (node-opcua wrapper)
export { opcUaConnectorEngine, OpcUaConnectorEngine } from "./OpcUaConnectorEngine.js";

// DiamondTurningEngine — SPDT ultra-precision optics: surface finish, micro-cutting forces, tool wear, machine config
export { diamondTurningEngine, DiamondTurningEngine } from "./DiamondTurningEngine.js";

// LaserInterferometerCompensationEngine — Edlen wavelength compensation, axis comp tables, measurement planning, deadpath
export { laserInterferometerCompensationEngine, LaserInterferometerCompensationEngine } from "./LaserInterferometerCompensationEngine.js";

// ProvenPartRecipeEngine — Proven manufacturing recipe storage (FAI-passed parts), ~/.prism/proven-recipes/ persistence
export { provenPartRecipeEngine, ProvenPartRecipeEngine } from "./ProvenPartRecipeEngine.js";

// PartSimilarityEngine � Multi-dimensional part similarity scoring with weighted normalized distance
export { partSimilarityEngine, PartSimilarityEngine } from "./PartSimilarityEngine.js";

// AdaptivePipelineGeneratorEngine — Adapts proven recipes to new parts with Kienzle/Taylor physics scaling
export { adaptivePipelineGeneratorEngine, AdaptivePipelineGeneratorEngine } from "./AdaptivePipelineGeneratorEngine.js";

// ProvenPipelineOrchestratorEngine — Master orchestrator: proveOut, findSimilar, generatePipeline, compare, recordOutcome, dashboard
export { provenPipelineOrchestratorEngine, ProvenPipelineOrchestratorEngine } from "./ProvenPipelineOrchestratorEngine.js";

// BenchmarkReportGeneratorEngine — Benchmark report generation (5-layer: synthetic, math, cross-engine, machine, industry)
export { benchmarkReportGeneratorEngine, BenchmarkReportGeneratorEngine } from "./BenchmarkReportGeneratorEngine.js";

// RealTimeMachineIntelligenceEngine — TECH-MS2: spindle monitor, chatter detect, thermal comp, tool life countdown, time series
export { realTimeMachineIntelligenceEngine, RealTimeMachineIntelligenceEngine } from "./RealTimeMachineIntelligenceEngine.js";

// VisualLabEngine � 3D scene descriptions for PRISM Academy machining visualization
export { VisualLabEngine, visualLabEngine } from "./VisualLabEngine.js";
