/**
 * PRISM MCP Server - Engines Index v11
 * Re-exports all 36 calculation, orchestration, and infrastructure engines
 * Updated: R1-AUDIT-T1 — Added 19 missing barrel exports
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
  type AlarmQuickDecode, type ToolLifeTimer, type OfflineCacheBundle, type CacheEntry,
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

// Tool Selection (composes ToolRegistry)
export {
  ToolSelectionEngine,
  toolSelectionEngine,
  type ToolRequirements,
  type ToolRecommendation,
  type ToolComparisonResult,
  type ToolValidationResult as ToolSelValidation,
} from "./ToolSelectionEngine.js";

// Material Selection (composes MaterialRegistry)
export {
  MaterialSelectionEngine,
  materialSelectionEngine,
  type MaterialRequirements,
  type MaterialCandidate,
  type MaterialProperties,
  type MachinabilityReport,
  type MaterialComparisonResult,
} from "./MaterialSelectionEngine.js";

// Machine Selection (composes MachineRegistry)
export {
  MachineSelectionEngine,
  machineSelectionEngine,
  type MachineRequirements,
  type MachineCandidate,
  type MachineComparisonResult as MachineSelComparison,
  type MachineValidationResult as MachineSelValidation,
} from "./MachineSelectionEngine.js";

// Fixture Design (SAFETY CRITICAL — clamping force)
export {
  FixtureDesignEngine,
  fixtureDesignEngine,
  type PartGeometry,
  type CuttingLoads,
  type FixtureType,
  type FixtureRecommendation,
  type ClampForceResult as FixtureClampForceResult,
  type DeflectionResult as FixtureDeflectionResult,
  type FixtureValidationResult,
} from "./FixtureDesignEngine.js";

// Process Planning (composes GenPlanEngine + registries)
export {
  ProcessPlanEngine,
  processPlanEngine,
  type FeatureCategory,
  type PartFeature,
  type ProcessPlanInput,
  type ProcessOperation,
  type ProcessPlan as ProcessPlanResult,
  type PlanOptimization,
  type TimeEstimate as PlanTimeEstimate,
} from "./ProcessPlanEngine.js";

// Cost Estimation
export {
  CostEstimationEngine,
  costEstimationEngine,
  type CostInput,
  type CostBreakdown as CostEstBreakdown,
  type CostDriver,
  type MaterialCostComparison,
} from "./CostEstimationEngine.js";

// Quoting
export {
  QuoteEngine,
  quoteEngine,
  type QuoteInput,
  type Quote,
  type QuoteLineItem,
  type QuantityBreak,
  type MarginAnalysis,
} from "./QuoteEngine.js";

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

// Troubleshooting (fault diagnosis)
export {
  TroubleshootingEngine,
  troubleshootingEngine,
  type Symptom,
  type DiagnosisInput,
  type Diagnosis,
  type RankedCause,
  type CorrectiveAction,
  type RootCauseAnalysis,
} from "./TroubleshootingEngine.js";

// Tribal Knowledge (shop-floor wisdom)
export {
  TribalKnowledgeEngine,
  tribalKnowledgeEngine,
  type KnowledgeTip,
  type KnowledgeCategory,
  type KnowledgeSearchInput,
  type KnowledgeSuggestion,
  type KnowledgeStats,
} from "./TribalKnowledgeEngine.js";

// Learning Paths (operator training)
export {
  LearningPathEngine,
  learningPathEngine,
  type SkillLevel as LearningSkillLevel,
  type OperatorRole,
  type SkillAssessment as LearningSkillAssessment,
  type LearningModule,
  type LearningPlan,
  type ProgressReport,
} from "./LearningPathEngine.js";

// Digital Twin (machine state & prediction)
export {
  DigitalTwinEngine,
  digitalTwinEngine,
  type MachineTwin,
  type MachineState as TwinMachineState,
  type MachineHealth,
  type HealthAlert,
  type MachinePerformance,
  type TwinPrediction,
  type SimulationResult as TwinSimResult,
} from "./DigitalTwinEngine.js";

// Energy Optimization (sustainability)
export {
  EnergyOptimizationEngine,
  energyOptimizationEngine,
  type EnergyInput,
  type EnergyOperation,
  type EnergyAnalysis,
  type EnergyOptimization,
  type EnergyChange,
} from "./EnergyOptimizationEngine.js";

// Batch Optimization (campaign sequencing)
export {
  BatchOptimizationEngine,
  batchOptimizationEngine,
  type BatchJob,
  type BatchGroup,
  type BatchSequence,
  type SetupMatrix,
  type BatchCapacity,
} from "./BatchOptimizationEngine.js";

// Nesting (2D part layout optimization)
export {
  NestingEngine,
  nestingEngine,
  type NestPart,
  type StockSheet,
  type NestPlacement,
  type NestResult,
  type NestAnalysis,
} from "./NestingEngine.js";

// Probe Routine Generation (GD&T → probe paths)
export {
  ProbeRoutineEngine,
  probeRoutineEngine,
  type GDTCallout,
  type GDTSpec,
  type ProbeMove,
  type ProbeRoutine,
  type GDTInterpretation,
  type ProbeReport,
} from "./ProbeRoutineEngine.js";

// Tool Crib Management (inventory, check-in/out)
export {
  ToolCribEngine,
  toolCribEngine,
  type ToolCribItem,
  type CheckoutRecord,
  type ToolCribCheckout,
  type ToolCribCheckin,
  type InventoryReport,
  type ReorderRecommendation,
} from "./ToolCribEngine.js";

// --- Existing engines counted in L2-P1-MS1 ---
// PredictiveMaintenanceEngine (already exported above in original barrel)
// SetupSheetEngine (already exported above in original barrel)
