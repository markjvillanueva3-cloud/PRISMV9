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
  type StressResult,
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

// Memory Consolidation Engine — Background Pattern Distillation
export { memoryConsolidationEngine } from "./MemoryConsolidationEngine.js";
export type { ConsolidatedPattern, ConsolidationReport } from "./MemoryConsolidationEngine.js";

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
} from "./PhysicsPredictionEngine.js";

// Optimization Engine — R7-MS1 Constrained Multi-Objective Optimization
export {
  optimization,
  optimizeParameters,
  optimizeSequence,
  sustainabilityReport,
  ecoOptimize,
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

// Shop Scheduler Engine — R7-MS5 Shop Floor Optimization (canonical: U-CONSOL2)
export {
  shopSchedulerEngine,
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
  type DispatchRule,
  type ScheduleJob as ORScheduleJob,
  type SingleMachineResult,
  type FlowShopJob,
  type FlowShopResult,
  type JobShopJob,
  type JobShopResult,
  type CPMActivity,
  type CPMResult,
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
  type ProbingData, type DriftAnalysis, type CalibrationBias,
} from "./MeasurementIntegrationEngine.js";

// Inverse Problem Solving (R10-Rev2)
export {
  inverseSolver,
  type InverseProblemType, type Severity, type Confidence,
  type InverseProblemInput, type RootCause, type Fix,
  type InverseSolution,
} from "./InverseSolverEngine.js";

// Error Remediation Engine — Learned Failure Pattern → Fix Suggestions
export { errorRemediationEngine } from "./ErrorRemediationEngine.js";
export type { RemediationSuggestion, ParameterAdjustment as RemediationAdjustment } from "./ErrorRemediationEngine.js";

// Failure Forensics (R10-Rev5)
export {
  failureForensics,
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
  type Mat4 as CADMat4,
  type Ray as CADRay,
  type Plane as CADPlane,
  type NURBSCurve,
  type NURBSSurface,
  type BSplineCurve,
  type BezierCurve,
  type BRepVertex,
  type BRepEdge,
  type BRepFace,
  type BRepShell,
  type BRepSolid,
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
  type ToolpathStats,
  type MaterialType as CAMMaterialType,
  type EntryStrategy,
  type ExitStrategy,
  type ToolSpec as CAMToolSpec,
  type ChipThinningResult,
  type EntryParams,
  type HelixEntryParams,
  type GCodeProgram,
  type CollisionCheckResult as CAMCollisionCheckResult,
  type ClearancePlaneConfig,
  type SequencedOperation,
} from "./CAMKernelEngine.js";

// Report Generation (Setup Sheets, Process Plans, Cost Estimates)
export {
  ReportEngine,
  reportEngine,
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
  type CollisionDetail,
  type ClearanceCheck,
  type RapidSafetyCheck,
} from "./CollisionDetectionEngine.js";

// Continuous Collision Detection — P0-CRITICAL (tunneling detection for rapids through thin walls)
export {
  ContinuousCollisionDetectionEngine,
  continuousCollisionDetectionEngine,
  type CCDParams,
  type CCDResult,
  type ToolGeometry as CCDToolGeometry,
  type Obstacle as CCDObstacle,
  type ArcParams as CCDArcParams,
} from "./ContinuousCollisionDetectionEngine.js";

// Stock Model (material removal tracking, buy-to-fly ratio)
export {
  StockModelEngine,
  stockModelEngine,
  type StockType as StockModelType,
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

// Cold Heading Tool Configurator (ELEC-PIPE-MS0 — replaces Excel macro)
export {
  ColdHeadingToolConfiguratorEngine,
  coldHeadingToolConfiguratorEngine,
  type ToolingType,
  type CommonDimensions,
  type MailboxDimensions,
  type TaptiteDimensions,
  type HeadingDieDimensions,
  type ToolingDimensions,
  type ConfiguratorInput,
  type CavityGeometry,
  type AIElectrodeRecommendation,
  type ConfiguratorOutput,
} from "./ColdHeadingToolConfiguratorEngine.js";

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

// Trilobe Electrode Geometry (ELEC-PIPE-MS0 — replaces Excel VBA macro)
export {
  TrilobeElectrodeGeometryEngine,
  trilobeElectrodeGeometryEngine,
  calculateTrilobeProfile,
  calculateLobeRotation,
  interpolateDiameters,
  type TrilobeStage,
  type TrilobeInput,
  type TrilobeGeometry,
  type TrilobeOutput,
  type ProfilePoint2D,
  type Point3D,
  type TrilobeSection,
  type CAMExport,
} from "./TrilobeElectrodeGeometryEngine.js";

// Eccentric Turning (ELEC-PIPE Session 8 — C-axis polar interpolation)
export {
  EccentricTurningEngine,
  eccentricTurningEngine,
  type OkumaDialect,
  type ProfileType,
  type EccentricTurningInput,
  type EccentricTurningOutput,
} from "./EccentricTurningEngine.js";

// Electrode AI Reasoning (ELEC-PIPE-AI-HARDEN)
export {
  ElectrodeAIReasoningEngine,
  electrodeAIReasoningEngine,
  type ElectrodeAIDomain,
  type DeepReasoningChain,
  type ReasoningStep,
  type ElectrodeMaterialRecommendation,
  type SparkGapOptimization,
  type TrilobeAIAnalysis,
  type EccentricCompensation,
  type MultiCAMRecommendation,
} from "./ElectrodeAIReasoningEngine.js";

// Electrode Deep Learning (ELEC-PIPE-DEEP-AI)
export {
  ElectrodeDeepLearningEngine,
  electrodeDeepLearningEngine,
  type WearPrediction,
  type FinishPrediction,
  type ForceVariationPrediction,
  type OptimizedParameters,
  type ChainOfThoughtResult,
  type DeepLearningResult,
} from "./ElectrodeDeepLearningEngine.js";

// Electrode Advanced AI (ELEC-PIPE-ULTRA-AI)
export {
  electrodeAdvancedAIEngine,
  type FeatureImportance,
  type Counterfactual,
  type ExpertOpinion,
  type ConsensusResult,
  type AnomalyResult,
  type ActiveLearningQuery,
  type CausalNode,
  type CausalEffect,
  type EnsemblePrediction,
  type LLMExplanation,
  type AdvancedAnalysisResult,
} from "./ElectrodeAdvancedAIEngine.js";

// Electrode Ultimate AI (ELEC-PIPE-OMEGA-AI)
export {
  electrodeUltimateAIEngine,
  type AttentionOutput,
  type NodeEmbedding,
  type LSTMState,
  type VAELatent,
  type ToTNode,
  type SelfConsistencyResult,
  type CoVeResult,
  type ReflexionResult,
  type ReActTrace,
  type EpisodicMemory,
  type KGTriple,
  type WorkingMemorySlot,
  type DeepEnsemblePrediction,
  type ConformalSet,
  type HierarchicalPlan,
  type ContinualLearningState,
  type CurriculumStage,
  type UltimateAnalysisResult,
} from "./ElectrodeUltimateAIEngine.js";

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
  type ControllerVariant,
  type ControllerMatch,
} from "./HyperMillControllerCatalogEngine.js";

export {
  hyperMillCycleDefaultsEngine,
  HyperMillCycleDefaultsEngine,
  type CycleDefaults,
  type CycleParam,
  FORMULA_VARIABLES,
  FRTYP_MAP,
} from "./HyperMillCycleDefaultsEngine.js";

export {
  hyperMillThreadStandardEngine,
  HyperMillThreadStandardEngine,
  type ThreadEntry,
  type ThreadStandard,
} from "./HyperMillThreadStandardEngine.js";

// ─── HM-REV-MS3: Cycle Parameter Pipeline ───────────────────────────────────
export {
  HyperMillCycleParameterPipeline,
  hyperMillCycleParameterPipeline,
  type CycleRecommendInput,
  type CycleRecommendation,
} from "./HyperMillCycleParameterPipeline.js";

export {
  validateCycleDefaults,
  validateCycleDefaultsBatch,
  type ValidateCycleDefaultsInput,
  type ValidateCycleDefaultsResult,
} from "./HyperMillCycleDefaultsValidation.js";

export {
  HyperMillSkillRegistryMap,
  hyperMillSkillRegistryMap,
  type HyperMillSkillEntry,
  type SkillEffort,
} from "./HyperMillSkillRegistryMap.js";

// ─── HM-REV-MS4: Multi-Axis Physics Pipeline + Blade Roughing + Mold + Hook ─
export {
  HyperMillMultiAxisPhysicsPipeline,
  hyperMillMultiAxisPhysicsPipeline,
  type ImpellerMaterial,
  type ImpellerGeometry,
  type ImpellerPipelineInput,
  type ImpellerPipelineResult,
  type PhysicsPipelineStage,
} from "./HyperMillMultiAxisPhysicsPipeline.js";

export {
  HyperMillBladeRoughingEngine,
  hyperMillBladeRoughingEngine,
  type ChannelType,
  type BladeGeometryType,
  type BladeRoughingInput,
  type BladeRoughingResult,
  type BladeLevel,
  type RestMaterialZone,
} from "./HyperMillBladeRoughingEngine.js";

export {
  HyperMillMoldCycleEngine,
  hyperMillMoldCycleEngine,
  type SpiFinishGrade,
  type MoldFeatureType,
  type MoldCycleInput,
  type MoldCycleResult,
  type CavityRoughingPlan,
  type CoreRoughingPlan,
  type PartingLineSplit,
  type ElectrodeExtractionPlan,
  type SpiFinishRequirement,
} from "./HyperMillMoldCycleEngine.js";

export {
  hypermill5AxisTiltLimitHook,
  hypermill5AxisCollisionGate,
  MACHINE_TILT_PRESETS,
  type TiltLimitParams,
  type TiltLimitResult,
  type CollisionGateInput,
  type CollisionGateResult,
} from "./HyperMill5AxisTiltLimitHook.js";

// ─── HM-REV-MS5: Probing Bridge + Surface Integrity Bridge ──────────────────
export {
  HyperMillProbingBridge,
  hyperMillProbingBridge,
  type ProbeType,
  type ProbeSystem,
  type ProbeInput,
  type MeasurementUncertainty,
  type WCSVerificationResult,
  type ProbingCycleResult,
} from "./HyperMillProbingBridge.js";

export {
  HyperMillSurfaceIntegrityBridge,
  hyperMillSurfaceIntegrityBridge,
  type SurfaceMaterial,
  type SurfaceProcess,
  type SurfaceIntegrityCheckInput,
  type WhiteLayerGateResult,
  type ResidualStressEstimate,
  type SurfaceIntegrityCheckResult,
  type SurfaceIntegrityQualityReport,
} from "./HyperMillSurfaceIntegrityBridge.js";

// ─── HM-REV-MS6: Grinding + EDM + Heat Treatment Routing ────────────────────
export {
  HyperMillGrindingBridge,
  hyperMillGrindingBridge,
  type GrindingType,
  type GrindingTrigger,
  type WheelAbrasive,
  type GrindingRouteInput,
  type GrindingRouteResult,
  type BurnRiskGateResult,
} from "./HyperMillGrindingBridge.js";

export {
  HyperMillEDMBridge,
  hyperMillEDMBridge,
  type EDMRouteType,
  type EDMFeatureGeometry,
  type EDMRouteInput,
  type EDMRouteResult,
} from "./HyperMillEDMBridge.js";

export {
  HyperMillHeatTreatmentRouter,
  hyperMillHeatTreatmentRouter,
  type HeatTreatType,
  type HeatTreatTiming,
  type MaterialHeatTreatProfile,
  type HeatTreatStep,
  type HeatTreatCertLink,
  type HeatTreatmentRouteResult,
  type CertificationChain,
  type CertDocument,
} from "./HyperMillHeatTreatmentRouter.js";

export {
  HyperMillSecondaryOpsSequencer,
  hyperMillSecondaryOpsSequencer,
  type SecondaryOpType,
  type PartApplication,
  type SecondaryOpsInput,
  type SecondaryOpsSequenceResult,
} from "./HyperMillSecondaryOpsSequencer.js";

// ─── HM-REV-MS7: Mill-Turn Bridge (U-HMR40) ────────────────────────────────
export {
  HyperMillMillTurnBridge,
  hyperMillMillTurnBridge,
  type HyperMillTurningChannel,
  type SpindleHandoffInput,
  type SimultaneousOpsInput,
  type BarFeedSequenceInput,
} from "./HyperMillMillTurnBridge.js";

// ─── HM-REV-MS10: Quality Bridges (FAI, SPC, Setup Sheet) ──────────────────
export {
  HyperMillFAIBridge,
  hyperMillFAIBridge,
  type HyperMillFAIInput,
  type BalloonMapping,
  type HyperMillFAIResult,
} from "./HyperMillFAIBridge.js";

export {
  HyperMillSPCBridge,
  hyperMillSPCBridge,
  type ControlChartType,
  AEROSPACE_CPK_TARGET,
  GENERAL_CPK_TARGET,
  type SPCFeaturePlan,
  type SPCControlPlanEntry,
  type HyperMillSPCInput,
  type HyperMillSPCResult,
} from "./HyperMillSPCBridge.js";

export {
  HyperMillSetupSheetBridge,
  hyperMillSetupSheetBridge,
  type HyperMillOperation,
  type HyperMillFixture,
  type HyperMillSetupSheetInput,
  type HyperMillSetupSheetResult,
  type QualityGateResult,
} from "./HyperMillSetupSheetBridge.js";

// ─── HM-REV-MS2/MS11: Material Physics Bridge + PPP Hooks ──────────────────
export {
  HyperMillMaterialPhysicsBridge,
  hyperMillMaterialPhysicsBridge,
  hyperMillMaterialPhysicsGate,
  type MaterialPhysicsResult,
  type MaterialPhysicsGateResult,
} from "./HyperMillMaterialPhysicsBridge.js";

export {
  HyperMillPPPBridgeHooks,
  hyperMillPPPBridgeHooks,
  type HyperMillPPPContext,
  type PPPPreHookResult,
  type BlockValidationFinding,
  type PPPPostHookResult,
} from "./HyperMillPPPBridgeHooks.js";

// ─── CAM Knowledge Portability (cross-CAM → any controller bridge) ─────
export {
  CamKnowledgePortabilityEngine,
  camKnowledgePortabilityEngine,
  type TargetController,
  type CamIntent,
  type CamSource,
  type PortabilityInput,
  type PortabilityResult,
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
  type CostDriver,
} from "./CostEstimationEngine.js";

// ─── MIT 2.830J Process Control Engines (pdf-learn forge-triple) ─────

// Cycle-to-Cycle Feedback Control (Hardt/Siu)
export {
  analyzeCtCControl,
  findOptimalGain,
  analyzeAutocorrelation,
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

// AI Resource Learning (hyperMILL scripts, JM DIE programs, code quality patterns)
export { aiResourceLearningEngine, AIResourceLearningEngine } from "./AIResourceLearningEngine.js";

// AI Capability Maximizer (advanced reasoning, knowledge synthesis, enhancement strategies)
export { aiCapabilityMaximizerEngine, AICapabilityMaximizerEngine } from "./AICapabilityMaximizerEngine.js";

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
export { quotingFormulaEngine, QuotingFormulaEngine } from "./QuotingFormulaEngine.js";
export { purchaseOrderEngine } from "./PurchaseOrderEngine.js";
export { generalLedgerEngine } from "./GeneralLedgerEngine.js";
export { accountingHardeningEngine, AccountingHardeningEngine, type BankReconciliationResult, type WIPValuationResult, type VarianceResult, type CostToCompleteResult, type MultiPeriodResult, type QBSyncResult } from "./AccountingHardeningEngine.js";
export { capacityPlanningEngine } from "./CapacityPlanningEngine.js";
export { qualityManagementEngine } from "./QualityManagementEngine.js";
export { as9100TraceabilityEngine, type TraceabilityRecord, type MaterialTraceability, type TraceabilityOperation, type TraceabilityInspection, type TraceabilityDocument, type CertificateOfConformance, type ChainValidationResult, type AS9100AuditResult } from "./AS9100TraceabilityEngine.js";
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
export { vendorTurningCatalogExtractorEngine, VendorTurningCatalogExtractorEngine, parseISO1832Designation, classifyChipbreaker } from "./VendorTurningCatalogExtractorEngine.js";
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
export { e2ShopConnectorEngine } from "./E2ShopConnectorEngine.js";
export { multiERPConnectorEngine, MultiERPConnectorEngine, type IERPConnector, type ERPSystemType, type UnifiedWorkOrder, type UnifiedToolInventory, type UnifiedExportPlan, type ERPConnectionConfig, type ConnectResult, type ERPCapability } from "./MultiERPConnectorEngine.js";
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
export { tribalKnowledgeActivationEngine, TribalKnowledgeActivationEngine } from "./TribalKnowledgeActivationEngine.js";
export { tribalKnowledgeTrainingEngine, TribalKnowledgeTrainingEngine } from "./TribalKnowledgeTrainingEngine.js";
export { algorithmWiringEngine, AlgorithmWiringEngine, type AlgorithmInfo, type AlgorithmCategory, type WiringTarget, type AlgorithmWiring, type WiringReport } from "./AlgorithmWiringEngine.js";
export { reasoningWiringEngine, ReasoningWiringEngine, type ReasoningEngineInfo, type ReasoningCategory, type ReasoningDomain, type DispatcherWiring, type ReasoningWiring, type ReasoningWiringReport } from "./ReasoningWiringEngine.js";
export { assetWiringSummaryEngine, AssetWiringSummaryEngine, type AssetCategory, type WiringSummary, type UtilizationTrend } from "./AssetWiringSummaryEngine.js";
export { treeOfThoughtEngine, TreeOfThoughtEngine } from "./TreeOfThoughtEngine.js";
export { troubleshootingDecisionTreeEngine, TroubleshootingDecisionTreeEngine } from "./TroubleshootingDecisionTreeEngine.js";
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
  toolEnrichmentEngine, ToolEnrichmentEngine,
  type AuditReport as ToolEnrichAuditReport,
  type EnrichResult as ToolEnrichResult,
  type ValidationReport as ToolEnrichValidationReport,
  type HolderCompatibilityMatrix,
  type EnrichedCuttingData,
} from "./ToolEnrichmentEngine.js";
export {
  machineConfigDatabaseEngine, MachineConfigDatabaseEngine,
  type MachineRoughingConfig, type SmoothingConfig,
} from "./MachineConfigDatabaseEngine.js";
export {
  surfaceFinishDatabaseEngine, SurfaceFinishDatabaseEngine,
  type RaEntry, type ApplicationGuide, type CalloutResult,
} from "./SurfaceFinishDatabaseEngine.js";
export { convexOptimizationEngine } from "./ConvexOptimizationEngine.js";
export { counterfactualReasoningEngine, CounterfactualReasoningEngine } from "./CounterfactualReasoningEngine.js";
export { hypothesisRankerEngine, HypothesisRankerEngine } from "./HypothesisRankerEngine.js";
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

// Timoshenko Deflection — includes shear deformation for boring bars/stubby beams (L/D > 10)
export { timoshenkoDeflectionEngine, TimoshenkoDeflectionEngine } from "./TimoshenkoDeflectionEngine.js";
export type {
  TimoshenkoParams,
  BeamSection,
  MultiSectionParams,
  DeflectionComparison,
  TimoshenkoDeflectionResult,
  MultiSectionDeflectionResult,
} from "./TimoshenkoDeflectionEngine.js";

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

// Performance Budget Engine — latency SLAs, memory limits, offline inference support (P0-CRITICAL)
export {
  performanceBudgetEngine,
  PerformanceBudgetEngine,
  PP_BUDGETS,
  type PerformanceBudget,
  type LatencyBudget,
  type MemoryBudget,
  type OperationMode,
  type ExecutionMetric,
  type BudgetStats,
  type BudgetViolation,
  type WrapResult,
  type NetworkStatus,
  type OfflineConfig,
} from "./PerformanceBudgetEngine.js";

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
export { latheMasterPostRouterEngine } from "./LatheMasterPostRouterEngine.js";
export { latheMasterPostUnifiedOutputEngine } from "./LatheMasterPostUnifiedOutputEngine.js";
export { latheMasterPostSelfAwarenessEngine } from "./LatheMasterPostSelfAwarenessEngine.js";
export { latheMasterPostDeepReasoningEngine } from "./LatheMasterPostDeepReasoningEngine.js";
export { latheMasterPostEnsembleCrossCheckEngine } from "./LatheMasterPostEnsembleCrossCheckEngine.js";
export { latheMasterPostAPIEngine, LATHE_MASTERPOST_ACTIONS } from "./LatheMasterPostAPIEngine.js";
export { latheMasterPostRegressionMatrixEngine } from "./LatheMasterPostRegressionMatrixEngine.js";
export { lathePrintIngestPipelineEngine } from "./LathePrintIngestPipelineEngine.js";
export { latheFeatureRecognitionEngine } from "./LatheFeatureRecognitionEngine.js";
export { latheToolpathPlannerEngine } from "./LatheToolpathPlannerEngine.js";
export { latheProgramGeneratorEngine } from "./LatheProgramGeneratorEngine.js";
export { lathePrintToProgramOrchestratorEngine } from "./LathePrintToProgramOrchestratorEngine.js";
export { latheProgramVerificationEngine } from "./LatheProgramVerificationEngine.js";
export { latheSetupSheetGeneratorEngine } from "./LatheSetupSheetGeneratorEngine.js";
export { lathePrintToProgramDLIntelligenceEngine } from "./LathePrintToProgramDLIntelligenceEngine.js";
export { lathePrintToProgramReasoningEngine } from "./LathePrintToProgramReasoningEngine.js";
export { lathePrintToProgramKnowledgeGraphEngine } from "./LathePrintToProgramKnowledgeGraphEngine.js";
export { lathePrintToProgramRegressionEngine, GOLDEN_BASELINE } from "./LathePrintToProgramRegressionEngine.js";
export { latheAutoQuoteFromPrintEngine } from "./LatheAutoQuoteFromPrintEngine.js";
export { latheActualCostReconciliationEngine } from "./LatheActualCostReconciliationEngine.js";
export { latheJobSchedulingEngine } from "./LatheJobSchedulingEngine.js";
export { latheCustomerOrderLifecycleEngine } from "./LatheCustomerOrderLifecycleEngine.js";
export { lathePurchaseOrderAutomationEngine } from "./LathePurchaseOrderAutomationEngine.js";
export { latheInventoryIntelligenceEngine } from "./LatheInventoryIntelligenceEngine.js";
export { latheCapacityPlanningEngine } from "./LatheCapacityPlanningEngine.js";
export { latheProductionQualityTrackingEngine } from "./LatheProductionQualityTrackingEngine.js";
export { latheDeliveryPerformanceEngine } from "./LatheDeliveryPerformanceEngine.js";
export { latheFinancialReportingEngine } from "./LatheFinancialReportingEngine.js";
export { latheBusinessDashboardEngine } from "./LatheBusinessDashboardEngine.js";
export { latheWorkflowOrchestrationEngine } from "./LatheWorkflowOrchestrationEngine.js";
export { latheSystemIntegrationEngine } from "./LatheSystemIntegrationEngine.js";
export { latheNotificationEngine } from "./LatheNotificationEngine.js";
export { latheProgramSMTEncoderEngine } from "./LatheProgramSMTEncoderEngine.js";
export { latheFormalProofEngine } from "./LatheFormalProofEngine.js";
export {
  masterPostGeneratorEngine,
  MasterPostGeneratorEngine,
  calculateRPM,
  calculateFeedRate,
  calculateTappingFeed,
  calculatePeckDepths,
  calculateRetractDistance,
  type PostGeneratorConfig,
  type MachineConfiguration,
  type CAMSystem,
  type PostFeatures,
  type PostOutputOptions,
  type JMDiePostOptions,
  type PostProcessorCode,
  type PostProperty,
  type TribalTip,
  type PostMetadata,
} from "./MasterPostGeneratorEngine.js";
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
// Archard Adhesive Wear — V = K × W × L / H (Archard 1953)
export { archardAdhesiveWearEngine, ArchardAdhesiveWearEngine, type ArchardWearInput, type ArchardWearResult, type ArchardUsuiComparison, type ToolMaterial, type WorkpieceMaterial, type WearRegime } from "./ArchardAdhesiveWearEngine.js";
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

// Cross-Disciplinary Learning (PP-WIRE-MS1 — Dormant Giants)
export { crossDisciplinaryEngine, CrossDisciplinaryDeepLearningEngine } from "./CrossDisciplinaryDeepLearningEngine.js";
export { crossDisciplinaryFormulaIntegrationEngine, CrossDisciplinaryFormulaIntegrationEngine } from "./CrossDisciplinaryFormulaIntegrationEngine.js";
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
// GrindingProgramAssemblerEngine — removed, file missing
export { quoteToShipOrchestratorEngine, QuoteToShipOrchestratorEngine } from './QuoteToShipOrchestratorEngine.js';

export { cncSimulationPipelineEngine, CNCSimulationPipelineEngine } from './CNCSimulationPipelineEngine.js';

export { simulationReportEngine, SimulationReportEngine } from './SimulationReportEngine.js';
export { physicsAwareSimulationEngine, PhysicsAwareSimulationEngine } from './PhysicsAwareSimulationEngine.js';

export { predictiveSimulationEngine, PredictiveSimulationEngine } from './PredictiveSimulationEngine.js';

export { simulationVisualizationBridgeEngine, SimulationVisualizationBridgeEngine } from './SimulationVisualizationBridgeEngine.js';

export { calibratedSimulationEngine, CalibratedSimulationEngine } from './CalibratedSimulationEngine.js';

// Wired-but-unexported batch (2026-03-14)
export { controllerDialectEngine, ControllerDialectEngineImpl } from './ControllerDialectEngine.js';
export { controllerProgrammingIntelligenceEngine, ControllerProgrammingIntelligenceEngine } from './ControllerProgrammingIntelligenceEngine.js';
export {
  fanucLegacyControllerEngine,
  FanucLegacyControllerEngineImpl,
  type LegacyControllerModel,
  type FanucLegacyProfile,
  type MacroSupport,
  type CannedCycleVariations,
  type ToolLengthCompBehavior,
  type TranslationResult,
  type TranslationWarning,
  type LegacyValidationResult,
} from './FanucLegacyControllerEngine.js';
export { controllerStrategyValidatorEngine } from './ControllerStrategyValidatorEngine.js';
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
export { dfmPipelineEngine } from './DFMPipelineEngine.js';

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
// SamplingWorkflowEngine — MCP Sampling workflow generators for feasibility, CAM strategy, post-processor, print-to-program, self-correcting S/F
export { samplingWorkflowEngine, SamplingWorkflowEngine } from "./SamplingWorkflowEngine.js";

// Academy engines
export { AssessmentEngine } from "./AssessmentEngine.js";
export { LessonRendererEngine } from "./LessonRendererEngine.js";
export { KnowledgeCurriculumBridgeEngine } from "./KnowledgeCurriculumBridgeEngine.js";
export { InstructorDashboardEngine, instructorDashboardEngine } from "./InstructorDashboardEngine.js";


// RealTimeMachineIntelligenceEngine — TECH-MS2: spindle monitor, chatter detect, thermal comp, tool life countdown, time series
export { realTimeMachineIntelligenceEngine, RealTimeMachineIntelligenceEngine } from "./RealTimeMachineIntelligenceEngine.js";

// VisualLabEngine � 3D scene descriptions for PRISM Academy machining visualization
export { VisualLabEngine, visualLabEngine } from "./VisualLabEngine.js";

// CostSavingsTrackerEngine — VAL-MS0: ROI proof, persistent savings log
export { costSavingsTrackerEngine, CostSavingsTrackerEngine } from "./CostSavingsTrackerEngine.js";

// ProgrammerProductivityEngine — Per-user productivity metrics + gamification achievements
export { programmerProductivityEngine, ProgrammerProductivityEngine } from "./ProgrammerProductivityEngine.js";

// WhiteLabelConfigEngine — VAL-MS3: dealer branding, fleet config
export { whiteLabelConfigEngine, WhiteLabelConfigEngine } from "./WhiteLabelConfigEngine.js";

// InstructorDashboardEngine — VAL-MS2: LMS class management, grades, analytics

// CourseBuilderEngine — VAL-MS9: Auto-generate training courses from tribal tips + playbook rules
export { CourseBuilderEngine, courseBuilderEngine } from "./CourseBuilderEngine.js";

// KioskModeEngine — Shop floor touch interface: quick S/F, alarm decode, setup sheet, tool life
export { KioskModeEngine, kioskModeEngine } from "./KioskModeEngine.js";

// CAMPluginSDKEngine — Lightweight API for CAM vendor integration (<50ms)
export { CAMPluginSDKEngine, camPluginSDKEngine } from "./CAMPluginSDKEngine.js";

// SaaSAPIEngine — VAL-MS5: SaaS REST API layer
export { saasAPIEngine, SaaSAPIEngine } from "./SaaSAPIEngine.js";

// ============================================================================
// PIPE-MS2: Print-to-Program Pipeline Engines
// ============================================================================

// MachiningKnowledgeBaseEngine — Canonical reference: 59 Kienzle materials, 19 Taylor combos,
// 35 speed/feed entries, 13 toolpath strategies, tap drills, peck rules, workholding, setup planning
export { machiningKnowledgeBaseEngine, MachiningKnowledgeBaseEngine } from "./MachiningKnowledgeBaseEngine.js";

// TurningPrintToProgramEngine — Lathe: G71/G70/G72/G75/G76, CSS, multi-pass roughing
export { turningPrintToProgramEngine, TurningPrintToProgramEngine } from "./TurningPrintToProgramEngine.js";

// LATHE-PRO-MS-1: Input Pipeline — Photo/CAD to structured turning features
export { turningPrintIntakeEngine, TurningPrintIntakeEngine } from "./TurningPrintIntakeEngine.js";
export { materialCalloutParserEngine, MaterialCalloutParserEngine } from "./MaterialCalloutParserEngine.js";
export { toleranceExtractionEngine, ToleranceExtractionEngine } from "./ToleranceExtractionEngine.js";
export { turningCADImportEngine, TurningCADImportEngine } from "./TurningCADImportEngine.js";
export { stockSelectionEngine, StockSelectionEngine } from "./StockSelectionEngine.js";
export { ambiguityResolutionEngine, AmbiguityResolutionEngine } from "./AmbiguityResolutionEngine.js";
export { turningRevProfileEngine, TurningRevProfileEngine } from "./TurningRevProfileEngine.js";
export { turningFeatureTaxonomyEngine, TurningFeatureTaxonomyEngine } from "./TurningFeatureTaxonomyEngine.js";
export { fitNotationParserEngine, FitNotationParserEngine } from "./FitNotationParserEngine.js";
export { iso2768ApplicatorEngine, ISO2768ApplicatorEngine } from "./ISO2768ApplicatorEngine.js";

// MultiAxisPrintToProgramEngine — 3+2 and 5-axis: G68.2, G43.4 TCP, singularity detection
export { multiAxisPrintToProgramEngine, MultiAxisPrintToProgramEngine } from "./MultiAxisPrintToProgramEngine.js";

// FourthAxisIndexingEngine — MILL-HARD-MS2: 4th axis tombstone/fixture plate, wrap milling
export {
  FourthAxisIndexingEngine,
  fourthAxisIndexingEngine,
  HAAS_TR160,
  HAAS_TR210,
  HAAS_HRT210,
  TOMBSTONE_CONFIGS,
  type FourthAxisInput,
  type RotaryTableSpec,
  type IndexedPosition,
  type PositionalIndexingResult,
  type ContinuousIndexingResult,
  type FourthAxisResult,
} from "./FourthAxisIndexingEngine.js";

// FourthAxisDecisionEngine — MILL-HARD-MS2: AI reasoning for 4th axis strategy selection
export {
  FourthAxisDecisionEngine,
  fourthAxisDecisionEngine,
  type FourthAxisDecisionInput,
  type FourthAxisDecisionResult,
  type PartGeometry,
  type ShopContext,
  type AIReasoningTrace,
  type FourthAxisStrategy,
} from "./FourthAxisDecisionEngine.js";

// FiveAxisDecisionEngine — MILL-HARD-MS3: AI-powered 5-axis simultaneous milling strategy selection
export {
  FiveAxisDecisionEngine,
  fiveAxisDecisionEngine,
  OKUMA_M460V_5AX,
  type FiveAxisStrategy,
  type MachineKinematics,
  type FiveAxisPartFeature,
  type FiveAxisDecisionInput,
  type FiveAxisDecisionResult,
  type FiveAxisReasoningTrace,
} from "./FiveAxisDecisionEngine.js";

// FiveAxisToolpathSynthesisEngine — MILL-HARD-MS4: Master 5-axis toolpath generation with 40+ commercial strategies + 6 novel PRISM algorithms
export {
  FiveAxisToolpathSynthesisEngine,
  fiveAxisToolpathSynthesisEngine,
  FIVE_AXIS_STRATEGY_CATALOG,
  type Vec3,
  type FiveAxisPoint,
  type FiveAxisStrategyEntry,
  type FiveAxisGeometry,
  type FiveAxisFamily,
  type ToolType,
  type MaterialProps,
  type ToolSpec,
  type MachineKinematics5Ax,
  type FiveAxisSynthesisInput,
  type NovelAlgorithmResult,
  type FiveAxisSynthesisResult,
} from "./FiveAxisToolpathSynthesisEngine.js";

// FiveAxisDeepLearningEngine — MILL-HARD-MS5: Deep learning, template auto-generation, AI reasoning
export {
  FiveAxisDeepLearningEngine,
  fiveAxisDeepLearningEngine,
  type TemplateCategory,
  type FeatureSignature,
  type CuttingParameters,
  type MachineSetup,
  type SuccessMetrics,
  type FiveAxisTemplate,
  type TemplateSearchQuery,
  type TemplateMatch,
  type FeatureEmbedding,
  type PartEmbedding,
  type SimilarityResult,
  type DeepReasoningRequest,
  type DeepReasoningResult,
  type LearningOutcome,
} from "./FiveAxisDeepLearningEngine.js";

// FiveAxisCADTemplateEngine — MILL-HARD-MS6: CAD-triggered template auto-generation with parametric variability
export {
  FiveAxisCADTemplateEngine,
  fiveAxisCADTemplateEngine,
  type CADEventType,
  type CADEvent,
  type CADModel,
  type CADFeature,
  type ParameterType,
  type ParametricDimension,
  type ParametricTemplate,
  type ParameterGroup,
  type ParametricConstraint,
  type DerivationRule,
  type VariantConfig,
  type ScaleVariantConfig,
  type MaterialVariantConfig,
  type ToleranceVariantConfig,
  type CustomVariantConfig,
  type TemplateVariant,
  type CADTemplateHook,
  type HookExecutionResult,
} from "./FiveAxisCADTemplateEngine.js";

// FiveAxisOrchestrationEngine — MILL-HARD-MS7: Full-stack 5-axis automation with multi-op sequencing, DSL, post-processor, collision recovery
export {
  FiveAxisOrchestrationEngine,
  fiveAxisOrchestrationEngine,
  type OperationPhase,
  type StockModel,
  type StockSurface,
  type FiveAxisOperation,
  type ToolDefinition,
  type CuttingParams,
  type OperationSequence,
  type DSLTokenType,
  type DSLToken,
  type DSLNodeType,
  type DSLNode,
  type DSLCondition,
  type DSLContext,
  type DSLScript,
  type ControllerType,
  type RTCPDialect,
  type PostProcessorConfig,
  type GCodeOutput,
  type GCodeBlock,
  type CollisionType,
  type CollisionResult,
  type RecoveryStrategy,
  type RecoveryAction,
  type CollisionRecoveryResult,
  type FeedrateFactors,
  type MachineDynamics,
  type AdaptiveFeedrateResult,
  type ScallopResult,
  type RaPrediction,
  type SurfaceQualityAnalysis,
} from "./FiveAxisOrchestrationEngine.js";

// FiveAxisAIUltraIntelligenceEngine — MILL-HARD-MS8: Maximum AI hardening (NL pipeline, predictive tool life, deep learning scorer, explainable AI, RL, LLM troubleshooting)
export {
  FiveAxisAIUltraIntelligenceEngine,
  fiveAxisAIUltraIntelligenceEngine,
  type NLIntent,
  type NLAmbiguity,
  type NLTo5AxisResult,
  type NLReasoning,
  type NLReasoningStep,
  type ToolLifePredictionInput,
  type ToolLifePrediction,
  type ToolLifeTrainingData,
  type ToolpathFeatures,
  type ToolpathQualityScore,
  type ToolpathIssue,
  type ExplainableAIRequest,
  type ExplainableAIResponse,
  type ExplainableStep,
  type ExplainableAlternative,
  type ExplainableFactor,
  type ExplainableEvidence,
  type FiveAxisRLState,
  type FiveAxisRLAction,
  type FiveAxisRLReward,
  type FiveAxisRLEpisode,
  type FiveAxisRLPolicy,
  type TroubleshootingRequest,
  type TroubleshootingDiagnosis,
  type RootCause,
  type CorrectiveAction,
  type SimilarCase,
} from "./FiveAxisAIUltraIntelligenceEngine.js";

// MillingAIUltraIntelligenceEngine — MILL-AI-MS1: Maximum AI hardening for ALL milling (2D, 2.5D, 3D, 3+2, 5-axis)
export {
  MillingAIUltraIntelligenceEngine,
  millingAIUltraIntelligenceEngine,
  type MillingType,
  type MillingGeometry,
  type MillingMaterial,
  type MillingTool,
  type MillingCuttingParams,
  type MillingNLIntent,
  type MillingAmbiguity,
  type NLToMillingResult,
  type MillingReasoning,
  type MillingReasoningStep,
  type MillingOperationPlan,
  type MillingOperation,
  type MillingToolLifeInput,
  type MillingToolLifePrediction,
  type StrategyRecommendation,
  type StrategyAnalysisRequest,
  type ExplainableMillingRequest,
  type ExplainableMillingResponse,
  type PhysicsPrinciple,
  type ExplainableMillingStep,
  type MillingAlternative,
  type MillingFactor,
  type MillingRLState,
  type MillingRLAction,
  type MillingRLEpisode,
  type MillingRLPolicy,
  type LearnedRule,
  type MillingTroubleshootingRequest,
  type MillingTroubleshootingDiagnosis,
  type MillingRootCause,
  type MillingCorrectiveAction,
  type ParameterAdjustment,
  type SimilarMillingCase,
  type MillingToolpathFeatures,
  type MillingToolpathAnalysis,
} from "./MillingAIUltraIntelligenceEngine.js";

// MillingAIIntegrationEngine — MILL-AI-MS2: JM Die Program Archive Integration
// Deep Learning + LLM CLI connected to 24,114 real programs (lathe primary, mill support)
export {
  MillingAIIntegrationEngine,
  millingAIIntegrationEngine,
  type MillingMachineType,
  type ProgramFileType,
  type MaterialCategory,
  type PartCategory,
  type JMDieProgramMetadata,
  type ProgramArchiveStats,
  type ProgramSimilarityMatch,
  type HistoricalParameterLearning,
  type CustomerPatternRecognition,
  type MaterialGeometryCluster,
  type ProgramRecommendation,
  type ReasoningStep,
  type MillingAIQuery,
  type MillingAIResponse,
  type MillingNLQueryParse,
  type MillingNLResponse,
  type ProgramFeatureVector,
  type SimilaritySearchResult,
} from "./MillingAIIntegrationEngine.js";

// CAMDeepLearningEngine — MILL-AI-MS3: Deep Learning + Multi-CAM Knowledge (18 CAM systems)
// Cross-CAM strategy mappings, feature extraction, chain-of-thought reasoning
export {
  CAMDeepLearningEngine,
  camDeepLearningEngine,
  type CAMSystem,
  type StrategyCategory,
  type KnowledgeType,
  type CAMTip,
  type CAMStrategy,
  type CAMParameter,
  type StrategyFeatureVector,
  type SimilarityMatch,
  type CrossCAMMapping,
  type ReasoningChain,
  type ReasoningStep as CAMReasoningStep,
  type StrategyRecommendation,
  type CAMQuery,
  type CAMResponse,
} from "./CAMDeepLearningEngine.js";

// MillingMachineIntelligenceEngine — MILL-AI-MS4: Complete Milling Machine Intelligence
// All machines (232+), all controllers (10), all toolpath types (hardcode, macro, conv, CAM, novel)
// Deep learning feature vectors, chain-of-thought reasoning, video/PDF/web references
export {
  MillingMachineIntelligenceEngine,
  millingMachineIntelligenceEngine,
  type MachineType,
  type MachineManufacturer,
  type ControllerType,
  type MillingMachineProfile,
  type ControllerCapability,
  type ControllerKnowledgeTip,
  type ToolpathType,
  type ToolpathStrategy,
  type ToolpathParameter,
  type MachineFeatureVector,
  type MachineSimilarityMatch,
  type MachineReasoningChain,
  type ReasoningStep as MachineReasoningStep,
  type MachineQuery,
  type MachineResponse,
  type VideoReference,
  type PDFReference,
  type WebReference,
} from "./MillingMachineIntelligenceEngine.js";

// ResourceHarvestingIntelligenceEngine — RESOURCE-HARVEST-MS0: Exhaustive Resource Intelligence
// 998 PDFs, 100 videos, 1,162 CAM/NC, MIT courses, workholding catalogs, controller manuals
// Deep learning + chain-of-thought reasoning for all H:/prism/Resources
export {
  ResourceHarvestingIntelligenceEngine,
  resourceHarvestingIntelligenceEngine,
  type ResourceType,
  type ResourceDomain,
  type ResourceManufacturer,
  type ResourceEntry,
  type ResourceCatalog,
  type ResourceFeatureVector,
  type ResourceSimilarityMatch,
  type ResourceReasoningChain,
  type ResourceReasoningStep,
  type LearningPath,
  type ResourceQuery,
  type ResourceResponse,
} from "./ResourceHarvestingIntelligenceEngine.js";

// HolePatternPipelineEngine — Pattern recognition, TSP optimization, G81-G85 canned cycles
export { holePatternPipelineEngine, HolePatternPipelineEngine } from "./HolePatternPipelineEngine.js";

// ThreadingPipelineEngine — G76/G92 single-point, thread milling, rigid tap G84, multi-start
export { threadingPipelineEngine, ThreadingPipelineEngine } from "./ThreadingPipelineEngine.js";
export { ThreadMethodSelectorEngine, threadMethodSelectorEngine, type ThreadMethodInput, type ThreadMethodResult, type ThreadForm, type ThreadMethod } from './ThreadMethodSelectorEngine.js';

// SecondaryOpsPipelineEngine — Deburring, Renishaw probing, engraving, wash, tool checks
export { secondaryOpsPipelineEngine, SecondaryOpsPipelineEngine } from "./SecondaryOpsPipelineEngine.js";

// CADDrawingKnowledgeEngine — GD&T rules, datum schemes, drawing layouts, DFM checks, fits, macros
export { cadDrawingKnowledgeEngine, CADDrawingKnowledgeEngine } from "./CADDrawingKnowledgeEngine.js";

// AutoPrintToProgramBridgeEngine — Automated file→features→program pipeline
export { autoPrintToProgramBridgeEngine, AutoPrintToProgramBridgeEngine } from "./AutoPrintToProgramBridgeEngine.js";

// StrategyTaxonomyEngine — Canonical 3-tier strategy taxonomy (Category->Family->Variant), 60+ strategies, 20+ CAM systems
export {
  strategyTaxonomyEngine,
  StrategyTaxonomyEngine,
  type StrategyInfo,
  type StrategyCategory,
  type StrategyFamily,
  type CamSystemId,
  type CamEquivalent,
  type TaxonomyStats,
  type StrategySearchQuery,
  type EngagementControl,
} from "./StrategyTaxonomyEngine.js";

// OptimalStrategySelectionEngine (E1087) — CAMX-MS1 U01 Unified strategy selector: physics simulation + algorithm routing + taxonomy + playbook
export {
  optimalStrategySelectionEngine,
  OptimalStrategySelectionEngine,
  type OptimalStrategyInput,
  type OptimalStrategyResult,
  type RankedStrategy,
  type PhysicsResult,
  type ScoreBreakdown,
  type ZoneStrategy,
  type MaterialInput as OSSMaterialInput,
  type ToolInput as OSSToolInput,
  type ConstraintInput as OSSConstraintInput,
  type PreferenceInput as OSSPreferenceInput,
  type OptimizationPriority,
} from "./OptimalStrategySelectionEngine.js";

// PackingSlipEngine — Professional packing slip generation for manufactured parts shipments (E1089)
export {
  packingSlipEngine,
  PackingSlipEngine,
  buildPackingSlip,
  type PackingSlipFormat,
  type PackingSlipLineItem,
  type ShipToAddress,
  type ShipFromAddress,
  type PackingSlipFooter,
  type PackingSlipInput,
  type PackingSlipResult,
} from "./PackingSlipEngine.js";

// MachineStrategyConstraintEngine (E1091) — CAMX-MS2/U02 Validates strategy against machine physical capabilities
export {
  machineStrategyConstraintEngine,
  MachineStrategyConstraintEngine,
  type MachineCapabilities,
  type StrategyRequirements,
  type ConstraintCheck,
  type ValidationResult as MSCValidationResult,
  type RankedMachine,
} from "./MachineStrategyConstraintEngine.js";

// FixtureAwareStrategyEngine (E1101) — CAMX-MS12/U07 Adjust strategy selection based on workholding type
export {
  fixtureAwareStrategyEngine,
  FixtureAwareStrategyEngine,
  type MachiningStrategy,
  type AdjustStrategyInput,
  type AdjustedStrategy,
  type ValidateForFixtureInput,
  type FixtureValidationResult,
  type FeatureForFixture,
  type FixtureRecommendation as FixtureAwareRecommendation,
} from "./FixtureAwareStrategyEngine.js";

// SafetyVetoEngine (E1098) — CAMX-MS14/U02 Hard veto gate: 8 mandatory rules, auto-escalation
export {
  safetyVetoEngine,
  SafetyVetoEngine,
  type VetoRule,
  type VetoParams,
  type MachineConstraints as VetoMachineConstraints,
  type MaterialProps as VetoMaterialProps,
  type ToolProps as VetoToolProps,
  type WorkholdingProps as VetoWorkholdingProps,
  type VetoCheckResult,
  type VetoReport,
  type EscalationResult,
} from "./SafetyVetoEngine.js";

// PipelineSafetyOrchestratorEngine (E1093) — CAMX-MS14/U01 Aggregate safety gate for pipeline decision points
export {
  pipelineSafetyOrchestratorEngine,
  PipelineSafetyOrchestratorEngine,
  type RiskLevel,
  type RiskDimension,
  type WorkholdingInput as PipelineSafetyWorkholdingInput,
  type SafetyAssessment,
  type VetoResult,
  type SafetyReport as PipelineSafetyReport,
} from "./PipelineSafetyOrchestratorEngine.js";

// OmegaSafetyScoreEngine — Scalar safety gate S(x)>=0.70 for G-code output
export {
  OmegaSafetyScoreEngine,
  omegaSafetyScoreEngine,
  type OmegaSafetyResult,
} from "./OmegaSafetyScoreEngine.js";

// MachineEnvelopeGuardEngine — Machine limit enforcement middleware for all pipelines
export {
  MachineEnvelopeGuardEngine,
  machineEnvelopeGuardEngine,
  type MachineEnvelope as GuardMachineEnvelope,
  type GCodeParam,
  type EnvelopeViolation as GuardEnvelopeViolation,
  type EnvelopeCheckResult,
  type BatchCheckResult,
} from "./MachineEnvelopeGuardEngine.js";

// ProductionBatchOptimizationEngine (E1094) — CAMX-MS21 U08 Batch production optimization
export {
  productionBatchOptimizationEngine,
  ProductionBatchOptimizationEngine,
  type BatchTool,
  type PartDimensions,
  type FixtureDimensions,
  type ToleranceSpec,
  type SPCData,
  type MachineParams as BatchMachineParams,
  type MaterialParams as BatchMaterialParams,
  type ToolChangeEvent,
  type ToolChangeSchedule,
  type FixtureLoadingPlan,
  type BarStockPlan,
  type ProbingEvent,
  type ProbingSchedule,
  type CostLineItem as BatchCostLineItem,
  type BatchCostBreakdown,
  type BatchPlan,
} from "./ProductionBatchOptimizationEngine.js";

// PipelineCostModelEngine (E1095) — CAMX-MS13/U01 Total cost model at every pipeline stage
export {
  pipelineCostModelEngine,
  PipelineCostModelEngine,
  DEFAULT_RATES as PipelineCostDefaultRates,
  type MachineType as PipelineCostMachineType,
  type ToolEntry as PipelineCostToolEntry,
  type SecondaryOpEntry as PipelineCostSecondaryOpEntry,
  type PipelineCostInput,
  type CostComparison,
} from "./PipelineCostModelEngine.js";

// StrategySequencingEngine (E1097) — CAMX-MS12 U06 Multi-op sequence optimizer with stock-state evolution
export {
  strategySequencingEngine,
  StrategySequencingEngine,
  type IsoGroup as SeqIsoGroup,
  type OperationRole,
  type AlgoTag,
  type StrategyCandidate,
  type StockDimensions,
  type SequenceConstraints,
  type StockStateSnapshot,
  type SequenceStep,
  type StrategySequence,
  type SequenceEvaluation,
} from "./StrategySequencingEngine.js";

// StrategyBenchmarkEngine (E1096) — CAMX-MS12/U02 Physics+MC strategy benchmarking
export {
  strategyBenchmarkEngine,
  StrategyBenchmarkEngine,
  type BenchmarkStrategy,
  type BenchmarkFeature,
  type BenchmarkMaterial,
  type BenchmarkTool,
  type BenchmarkMachine,
  type WeibullParams,
  type CI95,
  type StrategyBenchmarkResult,
  type RankedBenchmark,
  type MonteCarloDetail,
} from "./StrategyBenchmarkEngine.js";

// StrategyComparisonEngine (E1099) — CAMX-MS12/U03 N-strategy radar chart + explanation
export {
  strategyComparisonEngine,
  StrategyComparisonEngine,
  type DimensionScores,
  type WinnerSummary,
  type ComparisonResult,
  type HeadToHeadResult,
  type RadarChartData,
} from "./StrategyComparisonEngine.js";

// BatchSizeStrategyEngine (E1100) — CAMX-MS12/U08 Batch-size-aware strategy optimizer
export {
  batchSizeStrategyEngine,
  BatchSizeStrategyEngine,
  type BatchTier,
  type BatchFeature,
  type BatchMaterial,
  type BatchMachine,
  type AdjustedParams,
  type BatchStrategyRecommendation,
} from "./BatchSizeStrategyEngine.js";

// ContextualStrategyOverrideEngine (E1111) — CAMX-MS12/U05 Hard-override rules for physical constraint edge cases
export {
  contextualStrategyOverrideEngine,
  ContextualStrategyOverrideEngine,
  type OverrideFeature,
  type OverrideMaterial,
  type OverrideTool,
  type OverrideStrategy,
  type OverrideAdjustment,
  type OverrideResult,
  type MachiningParams as OverrideMachiningParams,
  type OverrideRuleDescription,
} from "./ContextualStrategyOverrideEngine.js";

// MastercamStrategyEngine (E1102) — CAMX-MS3/U01 Dedicated Mastercam strategy recommendation
export {
  mastercamStrategyEngine,
  MastercamStrategyEngineClass as MastercamStrategyEngine,
  type MastercamCategory,
  type MastercamPriority,
  type MastercamFeature,
  type MastercamMaterial,
  type MastercamMachine,
  type MastercamTool,
  type MastercamStrategy,
  type StrategyRating,
  type DynamicMotionInfo,
  type OptiRoughInfo,
  type ProfitTurningInfo,
} from "./MastercamStrategyEngine.js";

// MastercamCodeGeneratorEngine (E1117) — CAMX-MS3/U09 VBScript + C# NetHook code generation
export {
  mastercamCodeGeneratorEngine,
  MastercamCodeGeneratorEngineClass as MastercamCodeGeneratorEngine,
  type ScriptType,
  type TemplateCategory,
  type CuttingParams as MCCuttingParams,
  type StrategyParams as MCStrategyParams,
  type OperationSpec as MCOperationSpec,
  type GenerateCodeParams,
  type ScriptTemplate,
  type CodeGenerationResult,
} from "./MastercamCodeGeneratorEngine.js";

// MastercamSafetyHooksEngine (E1113) — CAMX-MS3/U02 Mastercam-specific safety validations
export {
  mastercamSafetyHooksEngine,
  MastercamSafetyHooksEngine,
  type SafetySeverity,
  type SafetyFinding,
  type SafetyValidationResult,
  type BatchValidationResult,
  type SafetyRuleDescription,
  type SafetyOperation,
  type SafetyTool,
  type SafetyMaterial,
  type SafetyMachine,
  type SafetyStrategy,
} from "./MastercamSafetyHooksEngine.js";

// MastercamToolExportEngine (E1123) — CAMX-MS10/U01 Tool catalog export to .mcam-tools format
export {
  mastercamToolExportEngine,
  MastercamToolExportEngineClass as MastercamToolExportEngine,
  type McamToolType,
  type McamToolMaterial,
  type McamHolderType,
  type McamExportFormat,
  type McamExportFilter,
  type McamCuttingData,
  type McamHolder,
  type McamTool,
  type McamLibrary,
  type McamExportResult,
} from "./MastercamToolExportEngine.js";

// HyperMillToolExportEngine (E1127) — CAMX-MS9/U03 Tool catalog export to hyperMILL .hmt SQLite format
export {
  hyperMillToolExportEngine,
  HyperMillToolExportEngineClass as HyperMillToolExportEngine,
  type HMGeometryClass,
  type HMExportOptions,
  type HMToolRow,
  type HMNCToolRow,
  type HMDepotRow,
  type HMMaterialRow,
  type HMToolExportResult,
  type HMExportFilter,
} from "./HyperMillToolExportEngine.js";

// BOX Data Engines — FusionCPSParser, OkumaParametricProgram, OkumaLegacyController, PostProcessorCapabilityMatrix, ManufacturerCatalogIndex
export { fusionCPSParserEngine } from "./FusionCPSParserEngine.js";
export { okumaParametricProgramEngine } from "./OkumaParametricProgramEngine.js";
export { okumaLegacyControllerEngine, type OkumaControllerModel, type OkumaMachineType, type NurbsSupportLevel, type OkumaLegacyProfile, type GCodeTranslation, type CompatibilityAnalysis, type CompatibilityIssue, type LegacyProgramAnalysis, type LegacyFeatureUsage } from "./OkumaLegacyControllerEngine.js";
export { postProcessorCapabilityMatrixEngine } from "./PostProcessorCapabilityMatrixEngine.js";
export {
  manufacturerCatalogIndexEngine,
  type WorkholdingCatalogEntry,
  type MachineModelEntry,
  type RawToolingEntry,
  type CatalogFilter,
  type ManufacturerSearchResult,
  type GapReport,
  type CatalogSummary,
  type IngestionPriorityEntry,
} from "./ManufacturerCatalogIndexEngine.js";

// NXCAMCodeGeneratorEngine (E1119) — CAMX-MS5/U06 NXOpen script generation
export {
  nxCAMCodeGeneratorEngine,
  NXCAMCodeGeneratorEngine,
  type NXOpenLanguage,
  type NXOperationType,
  type NXTemplateCategory,
  type NXOperation,
  type NXTool,
  type NXCodeGenParams,
  type NXGeneratedScript,
  type NXTemplate,
  type NXMKERecipe,
} from "./NXCAMCodeGeneratorEngine.js";

// NXCAMStrategyEngine (E1104) — CAMX-MS5/U01 Siemens NX CAM strategy recommendation
export {
  nxCAMStrategyEngine,
  NXCAMStrategyEngine,
  type NXStrategyCategory,
  type NXFeatureType,
  type NXMaterialGroup,
  type NXMachineType,
  type NXPriority,
  type NXRecommendInput,
  type NXStrategyRecommendation,
  type NXStrategyParameters,
  type NXIPWCapability,
  type NXFBMMapping,
} from "./NXCAMStrategyEngine.js";

// CAMX-MS4 U03 — SolidCAMiMachiningEngine (E1103)
export {
  solidCAMiMachiningEngine,
  type SolidCAMiMachiningEngine,
  type iMachiningFeature,
  type iMachiningMaterial,
  type iMachiningTool,
  type iMachiningMachine,
  type iMachiningResult,
  type WizardParameters,
  type SpiralPath,
  type SpiralPoint,
  type AdjustedToolpath,
  type EngagementSegment,
  type MoatZone,
  type MoatResult,
  type FeedProfile,
  type FeedProfilePoint,
} from "./SolidCAMiMachiningEngine.js";
export { machineLearningStrategyRankerEngine, MachineLearningStrategyRankerEngine } from "./MachineLearningStrategyRankerEngine.js";

// SolidCAMStrategyEngine (E1106) — CAMX-MS3/U02 Dedicated SolidCAM strategy recommendation
export {
  solidCAMStrategyEngine,
  SolidCAMStrategyEngineClass as SolidCAMStrategyEngine,
  type SolidCAMCategory,
  type SolidCAMPriority,
  type SolidCAMFeature,
  type SolidCAMMaterial,
  type SolidCAMMachine,
  type SolidCAMTool,
  type SolidCAMStrategy,
  type SolidCAMStrategyRating,
  type SolidCAMStrategyRecommendation,
  type IMachiningInfo,
  type HSSInfo,
} from "./SolidCAMStrategyEngine.js";

// BatchCAMStrategyEngines2 (E1110) — 4 CAM strategy engines in one file
export {
  workNCStrategyEngine,
  WorkNCStrategyEngine,
  topSolidStrategyEngine,
  TopSolidStrategyEngine,
  bobCADStrategyEngine,
  BobCADStrategyEngine,
  cimatronStrategyEngine,
  CimatronStrategyEngine,
} from "./BatchCAMStrategyEngines2.js";

// BatchCAMStrategyEngines (E1109) — 6 CAM strategy engines in one file
export {
  tebisStrategyEngine,
  TebisStrategyEngine,
  edgecamStrategyEngine,
  EdgecamStrategyEngine,
  espritStrategyEngine,
  ESPRITStrategyEngine,
  gibbsCAMStrategyEngine,
  GibbsCAMStrategyEngine,
  camWorksStrategyEngine,
  CAMWorksStrategyEngine,
  sprutCAMStrategyEngine,
  SprutCAMStrategyEngine,
  type CAMStrategy as BatchCAMStrategy,
  type MaterialGroup as BatchMaterialGroup,
  type Priority as BatchPriority,
} from "./BatchCAMStrategyEngines.js";

// CATIAStrategyEngine (E1108) — CATIA V5/3DEXPERIENCE CAM strategy recommendation
export {
  catiaStrategyEngine,
  CATIAStrategyEngineClass as CATIAStrategyEngine,
  type CATIAWorkbench,
  type CATIACategory,
  type CATIAPriority,
  type CATIAFeature,
  type CATIAMaterial,
  type CATIAMachine,
  type CATIATool,
  type CATIAStrategy,
  type CATIAStrategyRating,
  type CATIAStrategyRecommendation,
  type KBMInfo,
  type MfgProgramInfo,
} from "./CATIAStrategyEngine.js";

// BOX Data Ingestion Engines — Wave 1+2+3
export { alarmDiagnosticsEngine } from "./AlarmDiagnosticsEngine.js";
export { shopToolLibraryEngine } from "./ShopToolLibraryEngine.js";
// manufacturerCatalogIndexEngine already exported above in BOX Data Engines block
export { rawToolingNormalizerEngine } from "./RawToolingNormalizerEngine.js";

// CAMX-MS12 U01 — FeatureStrategyKnowledgeBaseEngine (E1112)
export {
  featureStrategyKnowledgeBaseEngine,
  FeatureStrategyKnowledgeBaseEngine,
  type MachineAxes as KBMachineAxes,
  type SpecialCondition as KBSpecialCondition,
  type RuleSource as KBRuleSource,
  type StrategyParameters as KBStrategyParameters,
  type RuleConditions as KBRuleConditions,
  type StrategyRule as KBStrategyRule,
  type QueryConditions as KBQueryConditions,
} from "./FeatureStrategyKnowledgeBaseEngine.js";


// E1116 — BatchCAMMaterialBridgeEngines (4 material bridge singletons)
export {
  mastercamMaterialBridgeEngine,
  solidCAMMaterialBridgeEngine,
  nxCAMMaterialBridgeEngine,
  powerMillMaterialBridgeEngine,
  type ISOGroup,
  type MaterialBridgeResult,
} from "./BatchCAMMaterialBridgeEngines.js";

// E1201 — CimatronCAMBridgeEngine (CAMX-MS15/U01) — Cimatron CAM data bridge
export {
  cimatronCAMBridgeEngine,
  CimatronCAMBridgeEngine,
  type CimatronProject,
  type CimatronOperation,
  type CimatronOperationType,
  type CimatronCuttingParams,
  type CimatronTool,
  type CimatronToolType,
  type CimatronElectrode,
  type CimatronMoldDie,
  type CimatronNCProgram,
  type CimatronStock,
  type CimatronWCS,
  type CimatronSimulation,
  type CimatronExtractionResult,
  type CimatronAnalysisResult,
  type CimatronFinding,
  type CimatronRecommendation,
} from "./CimatronCAMBridgeEngine.js";

// E1122 — CATIACodeGeneratorEngine (CAMX-MS6/U07)
export {
  catiaCodeGeneratorEngine,
  CATIACodeGeneratorEngine,
  type CATIAScriptType,
  type CATIAOpType,
  type CATIAOperation,
  type CATIAVBAParams,
  type CATIAEKLRule,
  type CATIAEKLTemplateRef,
  type CATIACodeResult,
  type CATIATemplate,
} from "./CATIACodeGeneratorEngine.js";

// E1121 — PowerMillCodeGeneratorEngine (CAMX-MS6/U03)
export {
  powerMillCodeGeneratorEngine,
  PowerMillCodeGeneratorEngine,
  type PMOperationType,
  type PMTemplateCategory,
  type PMOperation,
  type PMTool,
  type PMGenerateParams,
  type PMGenerateResult,
  type PMTemplate,
  type PMPostConfigResult,
} from "./PowerMillCodeGeneratorEngine.js";

// E1118 — SolidCAMCodeGeneratorEngine (CAMX-MS4/U09)
export {
  solidCAMCodeGeneratorEngine,
  SolidCAMCodeGeneratorEngine,
  type SCOperationType,
  type SCTemplateCategory,
  type SCOperation,
  type SCTool,
  type SCGenerateParams,
  type SCGenerateResult,
  type SCTemplate,
  type SCGPPConfigResult,
} from "./SolidCAMCodeGeneratorEngine.js";

// E1126 — ToolSyncOrchestratorEngine (CAMX-MS10/U05)
export {
  toolSyncOrchestratorEngine,
  ToolSyncOrchestratorEngine,
  type SupportedSystem,
  type ToolRecord,
  type SyncResult,
  type DriftReport,
  type ConflictEntry,
  type ConflictResolutionResult,
  type ConflictResolution,
  type SystemSyncStatus,
} from "./ToolSyncOrchestratorEngine.js";

// E1128 — CuttingDataExportEngine (CAMX-MS10/U06) — Kienzle/Taylor cutting data export
export {
  cuttingDataExportEngine,
  CuttingDataExportEngineClass as CuttingDataExportEngine,
  type CuttingTool,
  type MaterialRecord as CuttingMaterialRecord,
  type ComputedCuttingData,
  type ExportResult as CuttingDataExportResult,
  type ExportAllResult as CuttingDataExportAllResult,
} from "./CuttingDataExportEngine.js";

// E1125 — CAMAddInFrameworkEngine (CAMX-MS11/U01)
export {
  camAddInFrameworkEngine,
  CAMAddInFrameworkEngine,
  type CamSystem,
  type Language,
  type GeneratedFile,
  type AddInResult,
  type HTTPClientResult,
  type UIPanelResult,
  type ToolSyncResult,
  type PostIntegrationResult,
} from "./CAMAddInFrameworkEngine.js";

// E1129 — STEPNCEngines (CAMX-MS20 U01+U02) — STEP-NC ISO 14649 / AP238 parser + generator
export {
  stepNCParserEngine,
  stepNCGeneratorEngine,
  STEPNCParserEngine,
  STEPNCGeneratorEngine,
  type STEPNCModel,
  type STEPNCWorkingstep,
  type STEPNCWorkplan,
  type STEPNCFeature,
  type STEPNCTool,
  type STEPNCTechnology,
  type STEPNCParseResult,
  type PRISMFeature as STEPNCPRISMFeature,
  type PRISMTool as STEPNCPRISMTool,
} from "./STEPNCEngines.js";

// E1130 — VericutBridgeEngine (CAMX-MS20/U05) — CGTech VERICUT simulation bridge
export {
  vericutBridgeEngine,
  VericutBridgeEngine,
  type VericutTool,
  type VericutStock,
  type VericutFixture,
  type VericutWCS,
  type VericutExportPackage,
  type VericutProjectFile,
  type OptiPathBlock,
  type OptimizedProgram,
  type MaterialRemovalVerification,
  type CollisionAnalysis,
  type ForceBlock,
  type ForceComparison,
  type PrismMachine,
  type PrismProgram,
  type PrismStock,
  type PrismFixture,
  type PrismToolRecord as VericutToolRecord,
  type PrismWCS,
} from "./VericutBridgeEngine.js";

// E1132 — NCSIMULBridgeEngine (CAMX-MS20/U06) — Hexagon NCSIMUL simulation bridge
export {
  ncsimulBridgeEngine,
  NCSIMULBridgeEngine,
  type NCSIMULTool,
  type NCSIMULStock,
  type NCSIMULFixture,
  type NCSIMULWorkCS,
  type NCSIMULExportPackage,
  type NCSIMULProjectFile,
  type NCSIMULCollisionEvent,
  type NCSIMULCollisionSeverity,
  type NCSIMULMaterialRemoval,
  type SimulationAnalysis,
  type NCSIMULMachine,
  type NCSIMULProgram,
  type NCSIMULStockInput,
  type NCSIMULFixtureInput,
  type NCSIMULToolInput,
  type NCSIMULWCSInput,
  type RawSimulationResults,
} from "./NCSIMULBridgeEngine.js";

// E1134 — ShopNetworkEngine (CAMX-MS21/U02)
export {
  shopNetworkEngine,
  type ShopMachine,
  type ShopProfile,
  type ShopSearchCriteria,
  type ShopMatch,
  type JobBroadcast,
  type JobResponse,
  type Certification,
  type ShiftSchedule,
} from "./ShopNetworkEngine.js";


// E1133 — ISO13399ToolDataEngine (CAMX-MS20/U03) — ISO 13399 GTC tool data import/export
export {
  iso13399ToolDataEngine,
  ISO13399ToolDataEngine,
  type CuttingDataPerMaterial,
  type ISO13399ImportResult,
  type ISO13399ExportResult,
  type ISO13399ExportOptions,
  type ISO13399ValidationResult,
  type PRISMToolType,
} from "./ISO13399ToolDataEngine.js";

// E1135 — QIFIntegrationEngine (CAMX-MS20/U04) — ANSI/DMSC QIF 3.0 measurement data interchange
export {
  qifIntegrationEngine,
  QIFIntegrationEngine,
  type CharacteristicType,
  type MeasurementMethod,
  type CharacteristicNominal,
  type CharacteristicActual,
  type MeasurementPlan,
  type InspectionResults,
  type QIFValidationResult,
  type ToleranceInput as QIFToleranceInput,
  type MeasurementRecord as QIFMeasurementRecord,
} from "./QIFIntegrationEngine.js";

// E1136 — TCODashboardEngine (CAMX-MS13/U06)
export {
  tcoDashboardEngine,
  TCODashboardEngine,
  type TCOJobInput,
  type TCODashboardData,
  type CostComponent,
  type CostComparisonResult,
  type ParetoData,
  type CostDriverAnalysisResult,
  type SavingsOpportunity,
  type SavingsOpportunitiesResult,
  type MachineUtilizationCostResult,
  type CostHistoryRecord,
  type HistoricalTrendResult,
} from "./TCODashboardEngine.js";

// E1137 — ToolChangeOptimizationEngine (CAMX-MS13/U02)
export {
  toolChangeOptimizationEngine,
  ToolChangeOptimizationEngine,
  type ToolChangeOperation,
  type MagazineTool,
  type ToolChangeResult,
  type OptimizedStep,
  type MagazineLayout,
  type MagazineAssignment,
  type SisterPlacement,
  type ToolSharingResult,
  type ToolSharingGroup,
} from "./ToolChangeOptimizationEngine.js";

// E1138 — SafetyEscalationEngine (CAMX-MS14/U03)
export {
  safetyEscalationEngine,
  SafetyEscalationEngine,
  type VetoRuleType,
  type EscalationVetoReport,
  type EscalationParams,
  type EscalationMachineLimits,
  type EscalationAction,
  type EscalationIteration,
} from "./SafetyEscalationEngine.js";

// E1139 — CollisionPreventionEngine (CAMX-MS14/U04)
export {
  collisionPreventionEngine,
  CollisionPreventionEngine,
  type ToolpathBlock,
  type PreventionToolAssembly,
  type PreventionCollisionEvent,
  type CollisionZone as PreventionCollisionZone,
  type PreventionCollisionReport,
} from "./CollisionPreventionEngine.js";

// E1140 — FleetLearningStrategyEngine (CAMX-MS15/U04)
export {
  fleetLearningStrategyEngine,
  FleetLearningStrategyEngine,
  type FleetIsoGroup,
  type FleetOutcome,
  type ShopPerformanceRecord,
  type ShopData,
  type TransferContext,
  type FleetPerformanceStats,
  type ShopEstimate,
  type TransferLearningResult,
  type TransferAdjustment,
  type FleetInsightsResult,
} from "./FleetLearningStrategyEngine.js";

// E1141 — BatchCAMControllerEngines (4 controller catalog singletons)
export {
  mastercamControllerCatalogEngine,
  solidCAMControllerCatalogEngine,
  nxCAMControllerCatalogEngine,
  powerMillControllerCatalogEngine,
  type ControllerProfile as BatchCAMControllerProfile,
  type ControllerLookupResult,
  type PostMappingResult,
  type GPPMappingResult,
  type MTBMappingResult,
} from "./BatchCAMControllerEngines.js";

// E1142 — BatchCAMOperationCatalogEngines (4 operation catalog singletons)
export {
  mastercamOperationCatalogEngine,
  solidCAMOperationCatalogEngine,
  nxCAMOperationCatalogEngine,
  powerMillOperationCatalogEngine,
  type CATOperation,
  type OperationCategory,
} from "./BatchCAMOperationCatalogEngines.js";

// E1143 — BatchCAMToolBridgeEngines (4 tool library bridge singletons)
export {
  mastercamToolBridgeEngine,
  solidCAMToolBridgeEngine,
  nxCAMToolBridgeEngine,
  hyperMillToolBridgeEngine,
  type ToolMappingEntry,
} from "./BatchCAMToolBridgeEngines.js";

// E1144 — BatchCAMAPIBridgeEngines (4 HTTP API bridge singletons)
export {
  mastercamNETBridgeEngine,
  solidCAMSolidWorksBridgeEngine,
  nxOpenBridgeEngine,
  hyperMillACBridgeEngine,
  type BridgeConnectionResult,
  type BridgeActionResult,
} from "./BatchCAMAPIBridgeEngines.js";

// E1145 — BatchCAMAddInGenerators (6 per-CAM add-in generator singletons)
export {
  MastercamAddInGenerator,
  SolidCAMAddInGenerator,
  NXCAMAddInGenerator,
  HyperMillACAddInGenerator,
  PowerMillAddInGenerator,
  CATIAAddInGenerator,
  mastercamAddInGenerator,
  solidCAMAddInGenerator,
  nxCAMAddInGenerator,
  hyperMillACAddInGenerator,
  powerMillAddInGenerator,
  catiaAddInGenerator,
  type AddInGeneratorOptions,
} from "./BatchCAMAddInGenerators.js";

// E1146 — StrategyEvolutionEngine (CAMX-MS15/U05)
export {
  strategyEvolutionEngine,
  StrategyEvolutionEngine,
  type EvolutionIsoGroup,
  type ParameterBounds,
  type EvolutionMaterial,
  type EvolutionTool,
  type EvolutionMachine,
  type EvolutionFeature,
  type Individual,
  type EvolutionResult,
  type EvolutionRun,
} from "./StrategyEvolutionEngine.js";

// E1147 — PredictionCalibrationEngine (CAMX-MS15/U06)
export {
  predictionCalibrationEngine,
  PredictionCalibrationEngine,
  type CalibrationMeasurement as PCECalibrationMeasurement,
  type BayesianPosterior as PCEBayesianPosterior,
  type CalibrationFactors,
  type CalibrationHistoryEntry,
  type CalibrationResult as PCECalibrationResult,
} from "./PredictionCalibrationEngine.js";

// E1148 — WorkholdingVerificationEngine (CAMX-MS14/U06)
export {
  workholdingVerificationEngine,
  WorkholdingVerificationEngine,
  type VerifyCuttingForces,
  type WorkholdingConfig,
  type VerifyPartGeometry,
  type OperationVerification,
  type VerificationReport,
} from "./WorkholdingVerificationEngine.js";

// E1149 — ToolBreakagePredictionEngine (CAMX-MS14/U05)
export {
  toolBreakagePredictionEngine,
  ToolBreakagePredictionEngine,
  type BreakageTool,
  type BreakageForces,
  type EngagementEntry,
  type CumulativeDamageState,
} from "./ToolBreakagePredictionEngine.js";

// E1150 — CamxEnergyOptimizationEngine (CAMX-MS13/U04)
export {
  camxEnergyOptimizationEngine,
  CamxEnergyOptimizationEngine,
  type CamxEnergyBlock,
  type CamxMachinePowerProfile,
  type CamxEnergyBreakdown,
  type CamxEnergySaving,
  type CamxEnergyOptimizationResult,
} from "./CamxEnergyOptimizationEngine.js";

// E1151 — StrategyRankingUpdateEngine (CAMX-MS15/U02)
export {
  strategyRankingUpdateEngine,
  StrategyRankingUpdateEngine,
  type StrategyOutcome,
  type StrategySufficientStats,
  type StrategyRankEntry,
  type StrategyConfidence,
} from "./StrategyRankingUpdateEngine.js";

// E1152 — AnomalyDetectionEngine (CAMX-MS15/U03)
export {
  anomalyDetectionEngine,
  AnomalyDetectionEngine,
  type PredictedValues,
  type ActualValues,
  type AnomalyContext,
  type AnomalyFactor,
  type AnomalyDetectionResult,
  type AnomalyRecord,
  type AutoAdjustResult,
  type AnomalyHistoryFilter,
} from "./AnomalyDetectionEngine.js";

// E1154 — CoolantCostOptimizationEngine (CAMX-MS13/U03)
export {
  coolantCostOptimizationEngine,
  CoolantCostOptimizationEngine,
  type CoolantStrategy as CoolantCostStrategy,
  type CoolantMachineConfig,
  type CoolantCostBreakdown,
  type CoolantComparison,
  type CoolantConstraints,
  type LifecycleCostResult,
} from "./CoolantCostOptimizationEngine.js";

// E1155 — SetupCostOptimizationEngine (CAMX-MS13/U05)
export {
  setupCostOptimizationEngine,
  SetupCostOptimizationEngine,
  type SetupComplexity,
  type SetupDefinition,
  type SetupOptimizationInput,
  type SetupCostBreakdown,
  type SetupOptimizationResult,
  type SetupTimeEstimate,
  type DatumChainResult,
  type SetupReductionSuggestion,
} from "./SetupCostOptimizationEngine.js";

// E1156 — EnergyOptimizationIntegrationEngine (CAMX-MS13/U04)
export {
  energyOptimizationIntegrationEngine,
  EnergyOptimizationIntegrationEngine,
  GRID_EMISSION_FACTORS,
  type GridMix,
  type EnergyProgram,
  type EnergyMachineRef,
  type EnergyCostAddition,
  type CarbonFootprintResult,
  type EnergySavingSuggestion,
  type EnergySavingsReport,
} from "./EnergyOptimizationIntegrationEngine.js";

// U-ARCH3: Pipeline ↔ Registry bridge — shared resolution for all 9 pipelines
export {
  pipelineRegistryBridge,
  resolveMaterial,
  resolveMachine,
  resolveTool,
  type ResolvedMaterialContext,
  type ResolvedMachineContext,
  type ResolvedToolContext,
} from "./PipelineRegistryBridge.js";
export { fileStorageEngine } from "./FileStorageEngine.js";
export { partsLibraryEngine } from "./PartsLibraryEngine.js";
export { instantQuoteEngine } from "./InstantQuoteEngine.js";
export { quoteRevisionEngine } from "./QuoteRevisionEngine.js";
export { approvalWorkflowEngine } from "./ApprovalWorkflowEngine.js";
export { aiGeneratedCodeApprovalGateEngine } from "./AIGeneratedCodeApprovalGateEngine.js";
export { recordTimelineEngine } from "./RecordTimelineEngine.js";
export { jobTravelerEngine } from "./JobTravelerEngine.js";
export { machineDispatchEngine } from "./MachineDispatchEngine.js";
export { machineHandbookRegistry, MachineHandbookRegistry, MachineHandbookSchema } from "./MachineHandbookRegistryEngine.js";
export { handbookExtractionEngine, detectSections, parseSpecTable, extractHandbook, ExtractionInputSchema } from "./HandbookExtractionEngine.js";
export { handbookAcquisitionPipelineEngine, acquireHandbook, batchAcquire, HandbookIntakeSchema, BatchAcquisitionSchema } from "./HandbookAcquisitionPipelineEngine.js";
export { alarmIntelligenceEngine, AlarmLookupEnhancedSchema, AlarmIndexQuerySchema, AlarmSearchSchema } from "./AlarmIntelligenceEngine.js";
export { machineCapabilityIntelligenceEngine, CapabilityLookupSchema, CapabilityQuerySchema, ReconciliationSchema, CapabilityStatsSchema } from "./MachineCapabilityIntelligenceEngine.js";
export { handbookMaintenanceIntelligenceEngine, MaintenanceCostConfigSchema } from "./HandbookMaintenanceIntelligenceEngine.js";
export { deskPayloadEngine } from "./DeskPayloadEngine.js";
export { globalSearchEngine } from "./GlobalSearchEngine.js";
export { milestoneTrackingEngine } from "./MilestoneTrackingEngine.js";
export { customerPortalEngine } from "./CustomerPortalEngine.js";
export { presetLibraryEngine } from "./PresetLibraryEngine.js";
export { learningProgressionEngine } from "./LearningProgressionEngine.js";
export { qualityScoreEngine, QualityScoreEngine, type QualityReport, type EngineQualityScore, type QualityDimensions } from "./QualityScoreEngine.js";
export { formulaValidationEngine, FormulaValidationEngine, type ValidationReport, type FormulaResult, type TestPoint } from "./FormulaValidationEngine.js";
export { selfImprovementPatternEngine, SelfImprovementPatternEngine, type SelfImprovementReport, type ImprovementPattern } from "./SelfImprovementPatternEngine.js";
export { autoFixPipelineEngine, AutoFixPipelineEngine, type AutoFixReport, type FixCandidate } from "./AutoFixPipelineEngine.js";
export { qualityDashboardEngine, QualityDashboardEngine, type DashboardSnapshot, type DomainMetrics, type AlertEntry } from "./QualityDashboardEngine.js";
export { autoSchemaGeneratorEngine, AutoSchemaGeneratorEngine, type SchemaGapReport, type GeneratedSchema, type SchemaGenerationResult } from "./AutoSchemaGeneratorEngine.js";
export { autoTestGeneratorEngine, AutoTestGeneratorEngine, type TestGapReport, type GeneratedTest, type TestGenerationResult } from "./AutoTestGeneratorEngine.js";
export { routeSyncValidatorEngine, RouteSyncValidatorEngine, type RouteSyncReport, type RouteEndpoint, type ClientFunction } from "./RouteSyncValidatorEngine.js";
export { gapDetectionEngine, type Gap, type DimensionSummary, type GapReport as GapDetectionReport, type GapSeverity } from "./GapDetectionEngine.js";
export { autoForgeEngine, type ForgeInput, type ForgeResult, type ForgeArtifact, type MethodSpec } from "./AutoForgeEngine.js";
export { resourceCensusEngine, type ResourceEntry, type CensusReport, type LocationSummary, type ResourceType, type ResourceDomain } from "./ResourceCensusEngine.js";
export { pdfProcessingPipelineEngine, type PDFRecord, type KnowledgeObject, type ExtractionBatch, type PipelineStatus, type PDFCategory, type ExtractionStatus } from "./PDFProcessingPipelineEngine.js";
export { machineDataHardeningEngine, type MachineAuditEntry, type AuditReport, type HardenResult, type HardenField, type ValidationIssue, type ValidationReport as MachineValidationReport, type ModelIngestResult } from "./MachineDataHardeningEngine.js";
export { AutoProgramOrchestratorEngine, autoProgramOrchestratorEngine, STAGE_ORDER, type AutoProgramInput, type AutoProgramResult, type AutoProgramStage, type StageResult, type ToolRecommendation } from "./AutoProgramOrchestratorEngine.js";

// ============================================================================
// SCIMATH-MS0: Core Linear Algebra & Matrix Methods (12 engines, 355 tests)
// ============================================================================

// Matrix Decompositions (SVD, QR, Cholesky)
export { SVDEngine, svdEngine, type SVDResult, type SVDOptions, type PseudoInverseResult } from "./SVDEngine.js";
export { QRDecompositionEngine, qrDecompositionEngine, type QRResult, type QRPivotResult, type QROptions } from "./QRDecompositionEngine.js";
export { CholeskyEngine, choleskyEngine, type CholeskyResult, type LDLTResult } from "./CholeskyEngine.js";

// Eigenvalue & Iterative Solvers
export { EigensolverEngine, eigensolverEngine, type EigenPair, type EigenResult as EigensolverResult, type GeneralizedEigenResult, type EigenOptions } from "./EigensolverEngine.js";
export { IterativeSolverEngine, iterativeSolverEngine, jacobiPreconditioner, ssorPreconditioner, type MatVecFn, type PreconditionerFn, type IterativeSolveResult, type IterativeSolverOptions } from "./IterativeSolverEngine.js";

// Matrix Factorization, Sparse, & Norms
export { MatrixFactorizationEngine, matrixFactorizationEngine, type CSRMatrix, type CSCMatrix, type COOMatrix, type NMFResult, type LUResult, type NMFOptions } from "./MatrixFactorizationEngine.js";
export { SparseMatrixEngine, sparseMatrixEngine, type OrderingResult } from "./SparseMatrixEngine.js";
export { MatrixNormEngine, matrixNormEngine, type NormReport, type ConditionResult, type StabilityDiagnostics } from "./MatrixNormEngine.js";

// Tensor Algebra & Statistical Methods
export { TensorAlgebraEngine, tensorAlgebraEngine, type Voigt6, type TensorInvariants, type PrincipalStresses } from "./TensorAlgebraEngine.js";
export { SystemIdentificationEngine, systemIdentificationEngine, type RLSState, type RLSOptions, type TLSResult, type StateSpaceModel, type N4SIDOptions } from "./SystemIdentificationEngine.js";
export { RobustRegressionEngine, robustRegressionEngine, type RegressionResult, type RegularizedOptions, type HuberOptions, type RANSACOptions, type RANSACResult } from "./RobustRegressionEngine.js";
export { RandomMatrixEngine, randomMatrixEngine, type MPDistribution, type SignalDetectionResult, type SpikedCovarianceResult } from "./RandomMatrixEngine.js";
export { toolROIEngine, ToolROIEngine } from "./ToolROIEngine.js";

// --- Business / Quote / Cost / Scheduling (2 engines) ---
export { EDMCostDocumentationEngine, edmCostDocumentationEngine, type MachineTimeInput, type MachineTimeCost, type WireInput, type WireCost, type ConsumablesInput, type ConsumablesCost, type PostProcessInput, type PostProcessCost, type CostEstimate, type StartHole, type TechTableEntry, type TechTableRef, type CutProfile, type CutSequenceDoc, type InspectionFeature, type InspectionPlan, type SetupSheetInput, type TechTableInput, type CutSequenceInput, type InspectionPlanInput, type FullPackageInput, type EDMDocumentationPackage, type PostProcessOp } from './EDMCostDocumentationEngine.js';
export { EDMDrawingInterpretationEngine, edmDrawingInterpretationEngine, type EDMDrawingInput, type ClassifiedFeature, type ProcessRecommendation, type PassRequirement, type MaterialCallout, type ThicknessAnalysis, type EDMDrawingResult } from './EDMDrawingInterpretationEngine.js';

// --- CAM / Toolpath / Post-Processor (22 engines) ---
export { CAMKernelValidationEngine, camKernelValidationEngine, type DFMFeature, type DFMIssue, type DFMReport, type ProbePoint, type ProbeRoutineResult, type IntegrationTestCase, type IntegrationTestResult, type ValidationResult } from './CAMKernelValidationEngine.js';
export { CrossCAMPostEngine, crossCAMPostEngine, type CamNeutralInput, type NormalizedToolpath, type ToolChange, type BoundingBox, type CamSpecificEnhancement, type CamInsight, type SubprogramAnalysis, type SubprogramResult, type MultiChannelInput, type ChannelOperation, type MultiChannelProgram, type MillTurnPhysicsInput, type MillTurnPhysicsResult, type AutomationConfig, type AutomationResult } from './CrossCAMPostEngine.js';
export { DEFAULT_CONVERGENCE, BASE_CONVERGENCE_CONFIG, createFusionState, buildConvergenceConfig, type PhysicsPluginDescriptor, type PluginContext, type PluginOutput, type PhysicsPlugin, type FusionState, type SkippedPlugin, type ConvergenceConfig, type ConvergenceIteration, type LoopConvergenceReport, type FusionDetail, type PluginExecutionDetail, type JacobianSnapshot, type FusionUncertainty, type UncertaintyEstimate, type FusionTier, type PluginLevel, type ConvergenceStatus } from './PhysicsFusionOrchestrator.types.js';
export { EDMPostProcessGCodeEngine, edmPostProcessGCodeEngine, type PostProcessStep, type PostProcessPlan, type EDMGCodeInput, type EDMContourPoint, type EDMProfile, type EDMPass, type EDMGCodeResult, type WireEDMController } from './EDMPostProcessGCodeEngine.js';
export { FusionToolExportEngine, fusionToolExportEngine, type FusionTool, type FusionToolLibrary, type FusionExportRequest } from './FusionToolExportEngine.js';
export { LineByLineAdaptiveEngine, lineByLineAdaptiveEngine, type LineByLineInput, type OptimizedLine, type LineByLineResult } from './LineByLineAdaptiveEngine.js';
export { PHCurveToolpathEngine, phCurveToolpathEngine, type Vec2D, type PHSegment, type PHSpline, type ConstantFeedResult, type FeedAccuracyResult, type LinearComparisonResult } from './PHCurveToolpathEngine.js';
export { PhysicsFusionConvergenceEngine, physicsFusionConvergenceEngine, type ConvergenceInput, type ConvergenceResult } from './PhysicsFusionConvergenceEngine.js';
export { PhysicsFusionOrchestratorEngine, physicsFusionOrchestratorEngine, type FusionOrchestratorInput, type BlockEngagement, type FusionOrchestratorResult } from './PhysicsFusionOrchestratorEngine.js';
export { PostProcessorAnalyzerEngine, postProcessorAnalyzerEngine, type PostProcessorInfo, type PostProperty, type PostAnalysisSummary } from './PostProcessorAnalyzerEngine.js';
export { PowerMillStrategyEngine, powerMillStrategyEngine, type PMRecommendInput, type PMStrategyRecommendation, type PMStrategyParameters, type PMVortexDetails, type PMSteepShallowDetails, type PMStrategyCategory, type PMFeatureType, type PMMaterialGroup, type PMMachineType, type PMPriority } from './PowerMillStrategyEngine.js';
export { ToolpathIntegrationEngine, toolpathIntegrationEngine, type CutSegment, type CorrectionFactors, type ToleranceVerificationResult, type AdaptiveSmoothingResult, type CutReorderResult, type HoleReorderResult, type CorrectionResult } from './ToolpathIntegrationEngine.js';
export { VoronoiMedialAxisPocketEngine, voronoiMedialAxisPocketEngine, type MedialAxisPoint, type MedialAxisBranch, type MedialAxis, type VoronoiVertex, type VoronoiEdge, type VoronoiDiagram, type ToolpathPoint2D, type OffsetToolpath, type PocketInput, type PocketLayer, type PocketToolpath, type EngagementProfile, type SpiralComparison } from './VoronoiMedialAxisPocketEngine.js';
export { camKernelExtensionEngine, type CKEPoint2D, type CKETurningFeature, type CKEProfileSegment, type CKETurningProfile, type CKEPart2D, type CKESheetDims, type CKEPlacement, type CKENestingResult, type CKEGeomEntity, type CKEParsedGeometry, type CKEMachiningFeature, type CKEFeatureList, type CKEInterpretedCommand, type CKESFChange, type CKEGCodeDiff } from './CAMKernelExtensionEngine.js';
export { edmMultiPassStrategyEngine, type MultiPassInput, type MultiPassPlan, type PassDetail, type DistortionPlan } from './EDMMultiPassStrategyEngine.js';
export { edmPostProcessorExtension, type EDMOperation, type EDMPostInput, type EDMPostOutput, type EDMPostController, type EDMPostProcessType, type WireCutPhase, type SinkerBurnPhase } from './EDMPostProcessorExtension.js';
export { edmToolpathStrategyEngine, type ToolpathInput, type ProfileDefinition, type ToolpathResult, type ClassifiedProfile, type ApproachDeparture, type CornerStrategy, type TabPlacement, type TaperData } from './EDMToolpathStrategyEngine.js';
export { nxCAMSafetyEngine, powerMillSafetyEngine, catiaSafetyEngine, type CAMSafetyOperation, type CAMSafetyTool, type CAMSafetyMaterial, type CAMSafetyMachine } from './BatchCAMSafetyEngines.js';
export { postProcessorTelemetryEngine, type PPGTelemetryEvent, type PPGFunnelMetrics, type PPGFunnelStep } from './PostProcessorTelemetryEngine.js';
export { solidCAMSafetyHooksEngine, type SolidCAMOperation } from './SolidCAMSafetyHooksEngine.js';
export { strategyPerformanceTrackerEngine, type PredictedMetrics, type ActualMetrics, type MetricDeltas, type StrategyExecution, type MetricAccuracy, type PredictionAccuracy, type TopPerformer, type TrackerStats, type StrategyPerfData, type IsoGroup, type ExecutionOutcome } from './StrategyPerformanceTrackerEngine.js';
export { type ProgramComparison } from './CAMUtilityEngines.js';

// --- Coolant / Fluid (1 engines) ---
export { coolantControlConfigEngine, type CoolantMCode, type CoolantSequenceTemplate, type CoolantControlConfig, type CoolantControlConfigInput, type CoolantMode } from './CoolantControlConfigEngine.js';

// --- EDM / Laser / Waterjet / Grinding / Non-Traditional (7 engines) ---
export { BurnishingPolishingEngine, burnishingPolishingEngine, type BurnishingInput, type BurnishingResult, type LappingInput, type LappingResult, type PolishingInput, type PolishingStep, type PolishingResult, type BurnishingProcess, type PolishingMethod } from './BurnishingPolishingEngine.js';
export { EDMMonitorSurfaceIntegrityEngine, edmMonitorSurfaceIntegrityEngine, type GapStats, type ProcessMonitorInput, type GapVoltageResult, type SpeedTrackerResult, type AbnormalDischargeResult, type AdaptiveAdjustResult, type ThermalDriftResult, type ProcessMonitorResult, type RecastLayerResult, type HAZResult, type MicrocrackResult, type SpecLimits, type SpecComplianceResult, type AdaptiveAction, type MicrocrackDensity } from './EDMMonitorSurfaceIntegrityEngine.js';
export { EDMStartHoleSetupEngine, edmStartHoleSetupEngine, type ProfileGeometry, type StartHolePlan, type TankSpec, type SetupPlan, type ThreadingSequencePlan, type ThreadingSequenceEntry, type StartHoleDrillingParams, type FullEDMSetupPlan, type StartHoleMethod, type FixtureType, type DatumMethod, type ThreadingDirection, type MaterialCategory } from './EDMStartHoleSetupEngine.js';
export { GrindingWheelDressingOptimizationEngine, grindingWheelDressingOptimizationEngine, type WheelLifeInput, type WheelLifeResult, type DressingIntervalInput, type DressingIntervalResult, type DressingToolInput, type DressingToolResult, type CreepFeedInput, type CreepFeedResult, type WheelBondType, type DressingApplication } from './GrindingWheelDressingOptimizationEngine.js';
export { WEDMPrintToProgramEngine, wedmPrintToProgramEngine, type WEDMProgramInput, type WEDMProgramResult } from './WEDMPrintToProgramEngine.js';
export { edmFeasibilityEngine, type FeasibilityInput, type FeasibilityResult, type GeometryFeasibility, type ToleranceAchievability, type StartHoleAccess, type TaperFeasibility, type TimeEstimate } from './EDMFeasibilityEngine.js';
export { laserWaterjetPostExtension, type SheetOperation, type SheetPostInput, type SheetPostOutput, type SheetPostController, type SheetProcessType, type AssistGas, type QualityLevel, type PierceStrategy, type WaterjetPierceStrategy } from './LaserWaterjetPostExtension.js';

// --- Integration / Bridge (6 engines) ---
export { IGESImportEngine, igesImportEngine, type IGESPoint, type IGESGlobal, type IGESSummary, type IGESGeometryResult, type IGESSummaryResult } from './IGESImportEngine.js';
export { MTConnectAdapterEngine, type MTConnectConfig, type MTConnectDevice, type MTConnectAxis, type MTConnectComponent, type MTConnectDataItem, type MTConnectSnapshot, type MTConnectValue, type MTConnectAlarm, type MTConnectToolAsset, type SpindleLoadResult, type MachineStatusResult } from './MTConnectAdapterEngine.js';
export { MqttBridgeEngine, type MqttConfig, type AlertConfig, type AlertEvent, type TopicStats, type VibrationData, type TemperatureData } from './MqttBridgeEngine.js';
export { RealtimeEventBridge, realtimeEventBridge, type SSEClient } from './RealtimeEventBridge.js';
export { UniversalToolExportEngine, universalToolExportEngine, type PRISMTool, type ISO13399Options, type ExportISO13399Result, type ExportSTEPNCResult, type ExportMTConnectResult, type ExportCSVResult, type ExportResult } from './UniversalToolExportEngine.js';
export { rapidRepositionOptEngine, type AxisKinematics, type RapidMove, type RapidOptimization, type RetractOptimization, type AirCutDetection, type FeaturePoint, type FeatureSequenceResult, type ToolChangePositionResult, type RotaryOptResult, type NonCuttingBudget, type MagazineOptimization, type RapidOptInput } from './RapidRepositionOptEngine.js';

// --- Learning / Knowledge / Training (3 engines) ---
export { FleetDeploymentLearningEngine, fleetDeploymentLearningEngine, type FleetMachine, type UpdatePlan, type ShopStandard, type FeedbackEntry, type PredictionRecord } from './FleetDeploymentLearningEngine.js';
export { knowledgeDeduplicationEngine, type DeduplicationResult, type DeduplicationConfig } from './KnowledgeDeduplicationEngine.js';
export { knowledgePhysicsValidatorEngine, type PhysicsValidationResult, type PhysicsCheck, type FormulaLink, type ExtractedMachiningParams } from './KnowledgePhysicsValidatorEngine.js';
export { knowledgeLineageEngine, KnowledgeLineageEngine, type LineageNode, type LineageEdge, type VersionRecord, type ConflictRecord, type LineageGraph } from './KnowledgeLineageEngine.js';

// --- Machine / Setup / Spindle (7 engines) ---
export { EDMMaterialMachineWireEngine, edmMaterialMachineWireEngine, type EDMMaterialProperties, type WireSpec, type EDMMachineSpec, type MaterialAssessmentInput, type MachineSelectionInput, type MachineSelectionResult, type WireSelectionInput, type WireSelectionResult, type WireDiameterOptResult, type WireTensionResult, type WireCostResult, type ControllerCapabilityResult, type FullSelectionInput, type FullSelectionResult, type MachinabilityClass, type HeatTreatState, type ControllerBrand } from './EDMMaterialMachineWireEngine.js';
export { MachineModelAcquisitionEngine, machineModelAcquisitionEngine, type MachineModelTarget, type ModelSource, type AcquisitionPlan, type AcquisitionResult } from './MachineModelAcquisitionEngine.js';
export { MachineOptionRegistryEngine, CONTROLLER_BRAND_MAP, machineOptionRegistryEngine, type MachineOptions, type ModelFamilyOptions, type ManufacturerOptionProfile, type OptionImpact, type OptionConflict, type OptionValidationResult, type OptionPreset, type OptionAvailability, type BooleanOptionKey, type OptionKey } from './MachineOptionRegistryEngine.js';
export { WorkholdingSurfaceInferenceEngine, workholdingSurfaceInferenceEngine, type PartSurface, type MachiningOp, type SurfaceInferenceInput, type ViableSurface, type ScoredMethod, type DeadEnd, type RecommendedSetup, type SurfaceInferenceResult, type SurvivalTrackingResult, type SurfaceStatus, type SurfaceType, type WorkholdingMethod, type DatumLabel, type FaceOrientation } from './WorkholdingSurfaceInferenceEngine.js';
export { machineFingerprintEngine, type MachineFingerprintInput, type RecommendedPostConfig, type ResolutionMethod } from './MachineFingerprintEngine.js';
export { machineModelDownloaderEngine, type SearchResult, type DownloadPlan, type PlaywrightStep } from './MachineModelDownloaderEngine.js';
export { machinePostCrossRefEngine, type MachinePostMatch, type CoverageGap, type CoverageMatrix, type EnrichedMachineProfile, type CrossRefInput, type CrossRefResult } from './MachinePostCrossRefEngine.js';

// --- Material / Stock (4 engines) ---
export { CompositesMachiningPhysicsEngine, compositesMachiningPhysicsEngine, type DelaminationInput, type DelaminationResult, type FiberPulloutInput, type FiberPulloutResult, type CompositeOptimizeInput, type CompositeOptimizeResult, type FiberType } from './CompositesMachiningPhysicsEngine.js';
export { EDMBiMaterialCompensationEngine, edmBiMaterialCompensationEngine, type MaterialZone, type ZoneParams, type TransitionRamp, type ZoneUVCompensation, type UVTransition, type BiMaterialUVResult, type BiMaterialResult } from './EDMBiMaterialCompensationEngine.js';
export { SuperalloyMachiningEngine, superalloyMachiningEngine, type SuperalloyAnalyzeInput, type SuperalloyAnalyzeResult, type CraterWearInput, type CraterWearResult, type ProcessWindowInput, type ProcessWindowResult, type SuperalloyType } from './SuperalloyMachiningEngine.js';
export { materialCertTraceabilityEngine, type ChemistryAnalysis, type MechanicalProperties, type MaterialCert, type StockAssignment, type ProgramLink, type InspectionRecord, type DimensionMeasurement, type ShipmentRecord, type ShipmentPart, type ForwardTraceResult, type BackwardTraceResult, type ChainValidation, type ChainCheck, type CertPackage, type AuditReportResult, type AuditFinding } from './MaterialCertTraceabilityEngine.js';

// --- Mechanical Design (3 engines) ---
export { PipelineArchitectureEngine, pipelineArchitectureEngine, type ProcessFeature, type VoxelGrid, type SchedulableOperation, type ScheduleConstraint, type ScheduleEntry, type ToleranceSource } from './PipelineArchitectureEngine.js';
export { PipelineDecisionOrchestratorEngine, pipelineDecisionOrchestratorEngine, type ScoringAxes, type DecisionContext, type DecisionCandidate, type DecisionConstraints, type DecisionInput, type AlternativeRecord, type DecisionOutput, type DecisionCategory, type DecisionObjective } from './PipelineDecisionOrchestratorEngine.js';
export { PipelineOptimizationEngine, pipelineOptimizationEngine, type PipelineStageDefinition, type StageExecutionResult, type PipelineMetrics, type StageMetrics, type PipelineExecutionOptions, type PipelineWrapper, type DeadLetterEntry, type ResourceAllocation } from './PipelineOptimizationEngine.js';
export { contentIngestionPipelineEngine, type IngestionInput, type IngestionItem, type IngestionResult, type BatchIngestionInput, type IngestionStats, type AutoLinkResult, type EnhancedSearchOptions, type EnhancedSearchItem, type EnhancedSearchResult } from './ContentIngestionPipelineEngine.js';

// --- General / Infrastructure / Other (73 engines) ---
export { AuthEngineV7, type TokenPayload, type TierLimits, type Plan, type Role } from './AuthEngineV7.js';
export { BlueprintVisionOCREngine, blueprintVisionOCREngine, type BlueprintVisionInput, type ExtractedProfile, type BlueprintVisionResult, type ImageSource } from './BlueprintVisionOCREngine.js';
export { BoxProgramCensusEngine, boxProgramCensusEngine, type CensusEntry, type CensusSummary, type CensusScanOptions, type FileCategory } from './BoxProgramCensusEngine.js';
export { CadFileIndexEngine, cadFileIndexEngine, type CadFileEntry, type CadIndexSummary, type CadFileType } from './CadFileIndexEngine.js';
export { CapacityMonteCarloEngine, capacityMonteCarloEngine, type CapacitySimInput, type CapacitySimResult } from './CapacityMonteCarloEngine.js';
export { ClothoidBlendingEngine, type Point2D, type Point3D, type ClothoidSegment, type BlendResult, type ClothoidBlendInput } from './ClothoidBlendingEngine.js';
export { ContactMechanicsSurfaceEngine, type MaterialProps, type HertzContactResult, type SubSurfaceStressResult, type PlasticZoneResult, type WhiteLayerResult, type ResidualStressResult, type FullIntegrityResult } from './ContactMechanicsSurfaceEngine.js';
export { CurriculumEngine, type Course, type Module, type LessonContent, type Quiz, type Question, type QuestionOption, type DecisionNode, type StudentProgress, type CourseProgress, type QuizScore, type ReviewItem, type ContentType, type QuestionType } from './CurriculumEngine.js';
export { DXFGeometryParserEngine, dxfGeometryParserEngine, type LineSegment, type ArcSegment, type WireEDMContour, type GeometryIssue, type GeometryParseResult, type GeometrySegment } from './DXFGeometryParserEngine.js';
export { FinishTargetAdvisorEngine, finishTargetAdvisorEngine, type FinishTargetInput, type FinishTargetResult, type FinishOperation, type CoolantStrategy as FinishCoolantStrategy } from './FinishTargetAdvisorEngine.js';
export { HaasParserEngine, haasParserEngine, type HaasProgram, type HaasToolSection, type HaasOperation, type HaasMacroVariable, type HaasSubCall, type HaasSafetyInfo } from './HaasParserEngine.js';
export { HoningProcessEngine, honingProcessEngine, type HoningDesignInput, type HoningDesignResult, type StoneSelectionInput, type StoneSelectionResult, type PlateauHoningInput, type PlateauHoningStageParams, type PlateauHoningResult, type StoneType } from './HoningProcessEngine.js';
export { HurcoParserEngine, hurcoParserEngine, type HurcoProgram, type HurcoPartSetup, type HurcoToolSection, type HurcoOperation, type HurcoSafetyInfo } from './HurcoParserEngine.js';
export { InMemoryShopRepository, type ShopRepository } from './ShopRepositoryPort.js';
export { JobDeskAggregatorEngine, jobDeskAggregatorEngine, type TravelerStepRecord, type WorkflowTimelineEntry, type ApprovalSummary, type ShortageRecord, type JobAttachmentRecord, type JobDeskRecord, type TravelerStepStatus, type WorkflowTone, type ApprovalStatus } from './JobDeskAggregatorEngine.js';
export { JobProfitabilityWaterfallEngine, jobProfitabilityWaterfallEngine, type JobAmountInput, type WaterfallStep, type JobAnalysisResult, type JobComparisonInput, type JobComparisonResult, type SensitivityScenario } from './JobProfitabilityWaterfallEngine.js';
export { MagnesiumMachiningEngine, magnesiumMachiningEngine, type MgFireRiskInput, type MgFireRiskResult, type MgSafePracticeInput, type MgSafePracticeResult, type MagnesiumAlloy, type MgCoolantType } from './MagnesiumMachiningEngine.js';
export { ManufacturingIntegrationEngine, manufacturingIntegrationEngine, type OperationSpec, type MaterialSpec, type ClampPosition, type TrochoidalLayer, type GDTFeature, type DistortionResult, type CompensatedCoordinates, type FixtureLayoutResult, type CollisionCheckResult, type VariableDepthTrochoidalResult, type GDTFeatureResult, type GDTUncertaintyResult } from './ManufacturingIntegrationEngine.js';
export { MotionControllerInjectionEngine, motionControllerInjectionEngine, type MotionInjectionInput, type Injection, type MotionInjectionResult, type ControllerCodeMap, type ControllerType, type MachineClass, type OperationType, type ChatterRisk } from './MotionControllerInjectionEngine.js';
export { OperatingSystemCoordinationEngine, operatingSystemCoordinationEngine, type HotJobRecord, type MessageChannelSummary, type MessageThreadSummary, type MessageEntry, type LinkedRecord, type MessagesWorkspace } from './OperatingSystemCoordinationEngine.js';
export { OperatingSystemHotJobsEngine, operatingSystemHotJobsEngine } from './OperatingSystemHotJobsEngine.js';
export { OperatingSystemJobPacketEngine, operatingSystemJobPacketEngine, type PacketDepartment, type PacketOperation, type JobTrackingPacket, type JobIntakeDraft, type PacketDepartmentStatus } from './OperatingSystemJobPacketEngine.js';
export { OperatingSystemMessagesEngine, operatingSystemMessagesEngine } from './OperatingSystemMessagesEngine.js';
export { OperationSequenceMinerEngine, operationSequenceMinerEngine, type SequencePattern, type SequenceDeviation, type SequenceTemplate, type SequenceMineResult } from './OperationSequenceMinerEngine.js';
export { OptimizationFormulasEngine, optimizationFormulasEngine, type ConstrainedOptimizeInput, type ConstrainedOptimizeResult, type ParetoFrontInput, type ParetoFrontResult, type ConvergenceMetricsInput, type ConvergenceMetricsResult, type SensitivityAnalysisInput, type SensitivityAnalysisResult, type RobustDesignInput, type RobustDesignResult } from './OptimizationFormulasEngine.js';
export { OptimizationTierEngine, optimizationTierEngine, type TierConfig, type UserIntent, type ToolSelection, type StrategyIndicator, type RetractHeight, type LinkingMove, type ProposedChange, type ChangeExplanation, type ChangeImpact, type DiffPreview, type ApprovalDecision, type FusionPluginManifest, type FusionApiEndpoint, type PhysicsContext, type OptimizationTier, type StrategyType, type ChangeCategory } from './OptimizationTierEngine.js';
export { PDFBlueprintDimensionExtractorEngine, pdfBlueprintDimensionExtractorEngine, type GDTCallout, type SurfaceFinish, type ThreadCallout, type PartInfo, type DimensionExtractionResult, type CompletenessResult } from './PDFBlueprintDimensionExtractorEngine.js';
export { PhysicsPluginRegistry, physicsPluginRegistry, type FeedbackEdge } from './PhysicsPluginRegistry.js';
export { PostAMFinishingPlanEngine, postAMFinishingPlanEngine, type AMFeature, type FinishingOperation, type FinishingPlanInput, type SupportRemoval, type StressRelief, type FinishingPlanResult, type MachinabilityInput, type MachinabilityResult, type AMProcess } from './PostAMFinishingPlanEngine.js';
export { PostOutputGenerationEngine, postOutputGenerationEngine, type OperationInfo, type OutputGenerationInput, type ProgramAnalytics, type ProbeRoutine, type OutputGenerationResult } from './PostOutputGenerationEngine.js';
export { PostPhysicsFoundationEngine, postPhysicsFoundationEngine, type PhysicsFoundationInput, type OperationPhysicsInput, type PhysicsFoundationResult, type OperationPhysicsResult } from './PostPhysicsFoundationEngine.js';
export { ProgramDatabaseEngine, programDatabaseEngine, type ProgramRecord, type ProgramToolRecord, type ProgramQuery, type DatabaseStats } from './ProgramDatabaseEngine.js';
export { ProgramReleaseCatalogEngine, programReleaseCatalogEngine, type PartClass, type MachineProfile, type ToolholderProfile, type ToolingPackage, type FixtureProfile, type StockProfile, type CadSourceProfile, type ProgramReleaseCatalog, type ProgramReleaseMachineSearchInput, type ProgramReleaseMachineSearchResult, type ChecklistItem, type DfmFinding, type GdtFocus, type SourceComparison, type OperationRecord, type SetupSheetSection, type QuoteLine, type SummaryMetric, type ProgramReleaseInput, type ProgramReleaseWorkspace, type ProgramReleaseMachineFacetOption, type ProgramReleaseMachineSearchFacets } from './ProgramReleaseCatalogEngine.js';
export { RokuRokuParserEngine, rokuRokuParserEngine, type RokuRokuProgram, type RokuRokuToolSection, type RokuRokuOperation, type HighSpeedConfig, type RokuRokuSafetyInfo } from './RokuRokuParserEngine.js';
export { STLToVoxelGridEngine, stlToVoxelGridEngine, type STLPoint, type STLTriangle, type STLBoundingBox, type VoxelGridResult, type STLAnalysisResult } from './STLToVoxelGridEngine.js';
export { SchedulingPhysicsEngine, schedulingPhysicsEngine, type QueueTheoryInput, type QueueTheoryResult, type BatchEconomicsInput, type BatchEconomicsResult, type CapacityAnalysisInput, type CapacityAnalysisResult, type ScheduleMetricsInput, type ScheduleMetricsResult, type DynamicPriorityInput, type DynamicPriorityResult } from './SchedulingPhysicsEngine.js';
export { SchedulingStudyAggregatorEngine, schedulingStudyAggregatorEngine, type StudyException, type PlannerAction, type MachineBlock, type MachineLane, type ScheduleReleaseCheck, type ScheduleRelease, type SchedulingStudyRecord, type SchedulingStudyInputs, type JohnsonsResult, type CpmResult, type StudyTone, type ExceptionSeverity } from './SchedulingStudyAggregatorEngine.js';
export { ScrapRootCauseEngine, scrapRootCauseEngine, type Measurement, type ProcessData, type ScrapEventInput, type ProbableCause, type PhysicsAnalysis, type ScrapAnalysisResult, type ScrapTrendResult, type DefectType, type PatternType } from './ScrapRootCauseEngine.js';
export { SetupSheetLibraryEngine, setupSheetLibraryEngine, type WorkholdingSpec, type DatumSpec, type ToolEntry, type SetupInput, type SetupRecord, type SaveResult, type FindInput, type FindResult, type SuggestInput, type SuggestResult } from './SetupSheetLibraryEngine.js';
export { ShellBootstrapEngine, shellBootstrapEngine, type DeskCounts, type NavItem, type NavGroup, type HomeModule, type AccessCard, type ShiftPriority, type AttentionItem, type HandoffNote, type RestrictedSurface, type PinnedEntity, type ShellBootstrapResult, type EmployeeProfileSummary, type EmployeeShellBootstrapResult } from './ShellBootstrapEngine.js';
export { ShopFloorCheckInEngine, shopFloorCheckInEngine, type TrackedTask, type DepartmentCheckIn, type DepartmentCheckInResult, type JobRegistrationResult, type JobTrackingPayload, type EmployeeRef } from './ShopFloorCheckInEngine.js';
export { ShopStateEngine, shopStateEngine } from './ShopStateEngine.js';
export { StandardDimensionLookupEngine, standardDimensionLookupEngine, type ISO1832Result, type TapDimensionResult, type EndMillDimensionResult, type StandardDimensionLookupResult, type ApplyResult } from './StandardDimensionLookupEngine.js';
export { StripeBillingEngine, type PlanPrice, type PostProcessorPrice, type CheckoutResult, type WebhookResult, type PostPurchaseType } from './StripeBillingEngine.js';
export { advancedPostPhysicsEngine, type AdvancedPhysicsInput, type AdvancedPhysicsResult, type CoupledResult } from './AdvancedPostPhysicsEngine.js';
export { booleanKernelEngine, type BooleanKernelInput, type BooleanKernelResult, type BooleanKernelOperation } from './BooleanKernelEngine.js';
export { computeDiff, runBackplot, checkConsistency, runRegressionMatrix, runABComparison, runFullValidation, postValidationSuiteEngine, type ValidationInput, type DiffResult, type BackplotResult, type ConsistencyResult, type ConsistencyCheck, type RegressionMatrixResult, type RegressionEntry } from './PostValidationSuiteEngine.js';
export { contentAutoTaggerEngine, type TagResult, type MaterialTag, type OperationTag, type MachineTag, type ToolTag, type ControllerTag, type ParameterTag } from './ContentAutoTaggerEngine.js';
export { controllerFeatureMatrixEngine, type FeatureSupportDetail, type ControllerFeatureSet, type FamilySummary, type ControllerComparison, type FeatureSupportResult } from './ControllerFeatureMatrixEngine.js';
export { cpsDialectMapperEngine, type CpsDialectMapping } from './CpsDialectMapperEngine.js';
export { cpsPostParserEngine, type CpsCapabilities, type CpsTolerances, type CpsCircularLimits, type CpsMetadata, type CpsProperty, type CpsFormatDef, type CpsWcsDefinition, type CpsCycleSupport, type CpsFullProfile, type CpsParseInput, type CpsParseResult } from './CpsPostParserEngine.js';
export { firmwareFeatureMatrixEngine, type FirmwareFeature, type FirmwareFeatureResult } from './FirmwareFeatureMatrixEngine.js';
export { autoWiringEngine, type EngineAnalysis, type MethodInfo, type ParamInfo, type WiringGap, type WiringArtifact, type WiringPlan } from './AutoWiringEngine.js';
export { hyperMillCodeGeneratorEngine, type HMOperation, type HMTool, type HMGenerateParams, type HMGenerateResult, type HMTemplate, type HMNCConfigResult, type HMOperationType, type HMTemplateCategory } from './HyperMillCodeGeneratorEngine.js';
export { makeVsBuyDecisionEngine, type DecisionWeights, type MakeVsBuyJobInput, type OperationResult, type MakeVsBuyJobResult, type VendorEstimate, type BreakevenResult, type ProcessType, type ComplexityLevel, type MakeVsBuyRecommendation } from './MakeVsBuyDecisionEngine.js';
export { minimumJerkTrajectoryEngine, type Waypoint, type MotionConstraints, type SegmentCoeffs, type TrajectorySegment, type TrajectoryPlan, type MotionState, type JerkProfile, type TrajectoryComparison } from './MinimumJerkTrajectoryEngine.js';
export { motionCompensationEngine, type ServoParams, type RotaryLimits, type MachineMotionParams, type ControllerCapabilities, type MotionBlock, type ServoCompensationResult, type RotaryAxisResult, type CompatibilityResult, type StageConfig, type StageFilterResult } from './MotionCompensationEngine.js';
export { okumaOSPParserEngine, type OkumaProgram, type OkumaToolSection, type OkumaOperation, type OkumaVariable, type OkumaSafetyInfo, type SpeedFeedExtraction, type OkumaOpType } from './OkumaOSPParserEngine.js';
export { okumaGosigerTranscriptMinerEngine, type SrtSegment, type TranscriptTribalTip, type TranscriptTipCategory, type VideoMetadata, type TranscriptMiningResult, type MiningRunResult } from './OkumaGosigerTranscriptMinerEngine.js';
export { fusionLathePostDeltaRegistryEngine, type LathePostEntry, type LathePostRegistry, type RegistrationResult, type LathePostCapability, type ControllerFamily as LatheControllerFamily, type MachineType as LatheMachineType } from './FusionLathePostDeltaRegistryEngine.js';
export { optimizationReportEngine, type OptimizationReportInput, type ToolReport, type ReportSummary, type OptimizationReport } from './OptimizationReportEngine.js';
export { persistenceService, type PersistedTool, type PersistedMachine } from './UserToolLibraryPersistence.js';
export { postDownloadEngine } from './PostDownloadEngine.js';
export { postLibraryCatalogEngine, type CatalogSearchQuery, type CompatibilityScore, type CatalogSearchResult, type CatalogInput, type PostSource, type MachineType } from './PostLibraryCatalogEngine.js';
export { postLibraryConfiguratorEngine, type PostCatalogEntry, type PostConfiguration, type PostVersion, type PostExportResult, type BrowseInput, type BrowseOutput, type ConfigureInput, type ConfigureOutput, type OptimizationDelta, type ExportPostInput, type SampleOperation, type SaveVersionInput, type SaveVersionOutput, type ListVersionsInput, type ListVersionsOutput, type PostVersionSummary, type DiffVersionsInput, type DiffVersionsOutput, type DiffEntry, type RollbackInput, type RollbackOutput } from './PostLibraryConfiguratorEngine.js';
export { postPropertyTaxonomyEngine, type CanonicalProperty, type ControllerDialect, type PropertyTaxonomy, type PurchaseOption, type RawPropertyEntry, type PropertyClassification, type DialectMappingResult } from './PostPropertyTaxonomyEngine.js';
export { postValidationHardeningEngine, type ValidationFlag, type ValidationSummary, type ValidationSeverity } from './PostValidationHardeningEngine.js';
export { postValidationReportEngine, type ReportInput, type DimensionVerdict, type ReportFormat } from './PostValidationReportEngine.js';
export { postVersioningEngine, type VersionDiff, type VersionHistoryResult, type VersioningInput } from './PostVersioningEngine.js';
export { proveOutModeEngine, type ProveOutConfig, type ProveOutBlock, type ProveOutResult, type ProveOutInput } from './ProveOutModeEngine.js';
export { proveOutPromotionEngine, type PromotionInput, type PromotionDiffLine, type PromotionResult } from './ProveOutPromotionEngine.js';
export { airCutDetectionEngine, type AirCutInput, type AirCutBlock, type AirCutResult } from './AirCutDetectionEngine.js';
export { shopConfigurationEngine, type ShopRates } from './ShopConfigurationEngine.js';
export { socialMediaParserEngine, type SocialMediaPost, type ParsedSocialPost, type ExtractedTip, type BatchParseResult, type SocialPlatform } from './SocialMediaParserEngine.js';
export { subprogramStructureEngine, type GCodeBlock, type DetectedPattern, type SubprogramExtractionResult, type SubprogramStructureInput, type SubprogramDialect } from './SubprogramStructureEngine.js';
export { systemVariabilityIndexEngine, type SubsystemSVI, type PipelineSVI, type SVIWatchArea, type SVIDriftStatus, type SVIAutoWatchStatus, type SVIAutoWatchOptions, type SVIReport } from './SystemVariabilityIndexEngine.js';
export { type EngineResult, type EngineCapability, type EngineInfo, type IEngine } from './IEngine.js';
export { unifiedProbingDialectEngine, type UnifiedProbeInput, type UnifiedProbeOutput, type ProbeRegisterMap, type ProbeAvailabilityResult, type ProbeSystemType } from './UnifiedProbingDialectEngine.js';
export { urlContentExtractorEngine, type URLDetectionResult, type URLExtractionResult, type URLContentType } from './URLContentExtractorEngine.js';

// --- Physics / Force / Thermal / Deflection (8 engines) ---
export { BarStockVibrationEngine, type BarStockProps, type VibrationAnalysis, type SupportSuggestion, type ChatterCheckResult } from './BarStockVibrationEngine.js';
export { InverseThermalCompensationEngine, type ThermalSource, type MachineModel, type ThermalField, type ThermalFieldPoint, type CompensationResult, type SensorUpdate, type WarmUpProfile } from './InverseThermalCompensationEngine.js';
export { MultiBodyVibrationEngine, type ComponentProps, type SystemComponent, type SystemModel, type FRFPoint, type SystemFRF, type CoupledMode } from './MultiBodyVibrationEngine.js';
export { SpeedFeedMinerEngine, speedFeedMinerEngine, type SpeedFeedSample, type SpeedFeedStats, type SpeedFeedOutlier, type SpeedFeedMineResult, type SpeedFeedCalibrationEntry } from './SpeedFeedMinerEngine.js';
export { StochasticToolpathRoutingEngine, stochasticToolpathRoutingEngine, type PocketGeometry, type PerturbationRanges, type ToolpathVariant, type MaterialParams, type ToolParams, type ObjectiveValues, type EvaluatedVariant, type ParetoFront, type ParameterSensitivity, type SelectionResult } from './StochasticToolpathRoutingEngine.js';
export { ThermalFieldToolpathEngine, thermalFieldToolpathEngine, type ThermalGrid, type ThermalMaterial, type CoolZone, type ToolpathPass, type ThermalSimResult, type RoutedToolpath, type FieldVsTGARComparison } from './ThermalFieldToolpathEngine.js';
export { edmCuttingParamFlushEngine, type CuttingParamInput, type CuttingParamResult, type FlushingInput, type FlushingPlan, type WireBreakPrediction, type TechnologyTableMapping, type EnergyCalculation, type FullOptimizeResult, type PassType, type FlushingMode } from './EDMCuttingParamFlushEngine.js';
export { wearPatternRefinishEngine, type WearMeasurement, type WearProfile, type ErrorProfile, type CompensatingPass, type LifeExtensionEstimate, type WearUniformityAssessment, type WearPatternAction } from './WearPatternRefinishEngine.js';

// --- Quality / Inspection / SPC (2 engines) ---
export { EDMQualityOrchestratorEngine, edmQualityOrchestratorEngine, type QualityVerificationInput, type SpecComplianceLimits, type FeatureSpecCompliance, type FirstArticleReport, type QualityGateOverride, type AuditLogEntry, type PipelineResult, type JobHistory, type LearningUpdate, type CMMProbePoint, type ProfileErrorAnalysis, type PipelineStage, type MetricSnapshot, type DriftResult, type JobIntent } from './EDMQualityOrchestratorEngine.js';
export { FirstArticleInspectionPipelineEngine, firstArticleInspectionPipelineEngine, evaluateCharacteristic, dispositionRecommendation, type MeasurementInput, type FAIInput, type CharacteristicResult, type DispositionDetail, type FAIResult, type Form1, type Form2Material, type Form2, type Form3Row, type Form3, type FAIForms, type CharacteristicDesignator, type InspectionMethod, type DispositionVerdict, type FAIStatus } from './FirstArticleInspectionPipelineEngine.js';

// --- Safety / Compliance (2 engines) ---
export { LegalComplianceOperatingEngine, legalComplianceOperatingEngine, type NDA, type ExportClassification, type DeniedPartyCheckResult, type RetentionPolicy, type RetentionRecord, type AuditEntry, type SafetyIncident, type SafetyInspection } from './LegalComplianceOperatingEngine.js';
export { postVerificationSafetyEngine, type VerificationInput, type VerificationResult, type SafetyIssue, type PlaybookViolation, type TribalTip, type SurfaceFinishPrediction } from './PostVerificationSafetyEngine.js';

// --- Tool / Insert / Holder (5 engines) ---
export { CeramicsMachiningEngine, ceramicsMachiningEngine, type GrindabilityInput, type GrindabilityResult, type MicroFractureInput, type MicroFractureResult, type ProcessRecommendInput, type ProcessRecommendResult, type CeramicMaterial, type WheelType } from './CeramicsMachiningEngine.js';
export { CoatingSelectionEngine, coatingSelectionEngine, type CoatingSelectionInput, type CoatingAlternative, type CoatingSelectionResult, type CoatingOperationType, type SpeedRange, type ToolSubstrate, type CoatingName } from './CoatingSelectionEngine.js';
export { EDMWireSlugCornerTaperEngine, edmWireSlugCornerTaperEngine, type ThreadingStep, type ThreadingSequence, type BreakRecoveryPlan, type BreakRecord, type SlugPlan, type TabDefinition, type TabCutSequence, type GuideStatus, type AutoThreadAssessment, type WireManagementPlan, type CornerCompensation, type TaperSegment, type TaperSolution, type TaperAccuracyResult, type VariableTaperProfile, type WireManagementInput, type CornerDefinition, type SlugManagementInput, type CornerCompensationInput, type TaperInput, type TaperAccuracyInput, type FullPlanInput, type ThreadingMethod, type SlugManagementMethod, type GuideType } from './EDMWireSlugCornerTaperEngine.js';
export { ToolPatternMinerEngine, toolPatternMinerEngine, type ToolStationPattern, type InsertPattern, type TurretTemplate, type ToolMineResult } from './ToolPatternMinerEngine.js';
export { ToolSubstitutionRiskEngine, toolSubstitutionRiskEngine, type ToolSpec, type OperationContext, type SubstitutionInput, type RiskFactors, type ParameterAdjustments, type SubstitutionResult } from './ToolSubstitutionRiskEngine.js';

// --- Turning / Lathe (3 engines) ---
export { latheCollisionZoneEngine, type LatheTurretConfig, type LatheWorkpieceConfig, type LatheMachineConfig, type LatheToolStation, type CollisionCheckInput, type CollisionCheck, type GroovingOverhangResult, type MinChipThicknessResult, type BoringReachResult, type G71TypeResult, type ProfilePoint } from './LatheCollisionZoneEngine.js';
export { latheScienceHardeningEngine, type TurningChatterInput, type ChatterResult, type HardTurningInput, type HardTurningResult, type ThreadPassScheduleInput, type ThreadPassScheduleResult, type DrillThrustInput, type DrillThrustResult, type BeamDeflectionInput, type ChipBreakingResult, type PeckScheduleResult, type BoreDwellResult } from './LatheScienceHardeningEngine.js';
export { swissTypeCollisionEngine, SWISS_MACHINE_PRESETS, type SwissMachineType, type SwissComponent, type Vector3, type AABB, type CollisionPair, type SwissCollisionScenario, type SwissCollisionZone, type GangStation, type GangSlideConfig, type BAxisConfig, type GuideBushingConfig, type SubSpindleConfig, type SwissMachineConfig, type SwissMachineState, type SwissCollisionResult, type SwissCollisionCheck, type GangInterferenceResult, type BAxisSwingResult, type BushingThermalResult, type PickoffApproachResult, type PartTransferResult, type EjectorClearanceResult, type BarRunoutResult, type LiveToolSpinUpResult } from './SwissTypeCollisionEngine.js';

// --- HM-REV-MS8: Data Extraction Pipeline (E1157–E1161) ---
export { HyperMillDataExtractionPipeline, hyperMillDataExtractionPipeline, HM_GEOMETRY_CLASSES, type GeometryClass, type PrismToolRecord as HMPrismToolRecord, type CuttingTechRecord, type ExtractionResult, type SQLiteExtractorOptions, type SQLiteRow } from './HyperMillDataExtractionPipeline.js';
export { HyperMillMacroDBEngine, hyperMillMacroDBEngine, type MacroType, type MacroParameter, type MaterialOverride, type MacroDefinition, type FormulaRegistryEntry, type IMToolRecord, type MacroExtractionResult, type IMToolExtractionResult } from './HyperMillMacroDBEngine.js';
export { HyperMillACStandardToolDBEngine, hyperMillACStandardToolDBEngine, type ACHolderAssembly, type ACMaterialCompatibility, type ACStandardToolRecord, type ACExtractionResult } from './HyperMillACStandardToolDBEngine.js';
export { HyperMillMetricCfgExtractorEngine, hyperMillMetricCfgExtractorEngine, type CfgParamType, type CfgParam, type CycleSection, type MachineSection, type ControllerProfile as HMControllerProfile, type MetricCfgExtractionResult } from './HyperMillMetricCfgExtractorEngine.js';
export { HyperMillDataExtractionOrchestrator, hyperMillDataExtractionOrchestrator, DEFAULT_HM_PATHS, type HyperMillPaths, type DBStatus, type PerDatabaseStatus, type OrchestratorResult } from './HyperMillDataExtractionOrchestrator.js';

// --- HM-REV-MS0: HyperCAD-S CAD Automation + Mock Layer (E1160–E1164) ---
export { HyperCADSAutomationEngine, hyperCADSAutomationEngine, type CADFileFormat, type CoordinateSystemSetup, type CADSImportParams, type CADSHealParams, type CADSAnalyzeParams, type CADSAutomateParams, type CADSScriptResult } from './HyperCADSAutomationEngine.js';
export { PrintToHyperCADSBridge, printToHyperCADSBridge, type BridgeInput as HyperCADSBridgeInput, type BridgeOutput as HyperCADSBridgeOutput } from './PrintToHyperCADSBridge.js';
export { HyperCADSStockModelEngine, hyperCADSStockModelEngine, DEFAULT_STOCK_ALLOWANCE_MM, registerHyperCADSHooks, type StockMode, type BoundingBoxStockParams, type OffsetSolidStockParams, type CylinderStockParams, type StockModelParams, type StockModelResult } from './HyperCADSStockModelEngine.js';
export { FeatureToStrategyBridgeEngine, featureToStrategyBridgeEngine, type RecognizedFeatureType, type RecognizedFeature as HyperCADSRecognizedFeature, type FeatureStrategyRecommendation, type BridgeInput as FeatureBridgeInput, type BridgeOutput as FeatureBridgeOutput } from './FeatureToStrategyBridgeEngine.js';
export { HyperCADSMockLayer, hyperCADSMockLayer, type MockImportResponse, type MockFeature, type MockHealResponse, type MockAnalyzeResponse, type MockStockModelResponse } from './HyperCADSMockLayer.js';

// --- BOX-MS6: Fusion 360 Cloud Extraction ---
export { FusionCloudConnectorEngine, fusionCloudConnectorEngine, type ConnectionStatus, type FusionCloudConfig } from './FusionCloudConnectorEngine.js';
export { FusionProjectCrawlerEngine, fusionProjectCrawlerEngine, type DesignSummary, type ProjectTree, type FolderNode } from './FusionProjectCrawlerEngine.js';
export { FusionCAMExtractorEngine, fusionCAMExtractorEngine, type CAMSetupExtract, type CAMOperationExtract, type CAMToolExtract, type CAMExtractionResult, type BatchCAMExtractionResult } from './FusionCAMExtractorEngine.js';
export { FusionToolLibraryExtractorEngine, fusionToolLibraryExtractorEngine, type FusionToolLibrary as FusionExtractedToolLibrary, type FusionToolEntry, type PRISMToolMapping, type ToolLibraryExtractionResult } from './FusionToolLibraryExtractorEngine.js';
export { FusionSetupDocumentEngine, fusionSetupDocumentEngine, type SetupDocument, type SetupSheet as FusionSetupSheet, type OperationRow, type ToolListEntry as FusionToolListEntry } from './FusionSetupDocumentEngine.js';

// --- BOX-MS8: Wire EDM Program Parsing + Mill Pattern Mining ---
export { WireEDMProgramParserEngine, wireEDMProgramParserEngine, type WireEDMDialect, type WireEDMProgram, type WireEDMPass, type WireEDMMove, type WireSettings, type TaperInfo, type FlushingInfo, type WireEDMSafetyInfo } from './WireEDMProgramParserEngine.js';
export { MillPatternMinerEngine, millPatternMinerEngine, type MillPattern, type PocketStrategy, type PlungeStrategy, type ChipLoadSample, type HSMProfile, type CannedCycleUsage, type CoolantPattern, type MillMineResult } from './MillPatternMinerEngine.js';
export { WEDMProgramNeuralAnalysisEngine, wedmProgramNeuralAnalysisEngine, type WEDMParams, type ProgramAnalysis, type OrderValidation, type OrderViolation, type MCodeValidation, type ParameterAnalysis, type PhysicsComparison, type ParameterIssue, type Optimization, type AntiPattern, type RiskAssessment, type RiskFactor, type Improvement, type PatternMatch, type ReasoningStep, type OptimizationResult, type ParameterChange } from './WEDMProgramNeuralAnalysisEngine.js';
export { WEDMBatchProgramAnalyzerEngine, wedmBatchProgramAnalyzerEngine, type WEDMProgramAnalysis, type WEDMBatchStatistics, type WEDMCustomerProfile, type WEDMBatchAnalysisResult, type WEDMTrainingDataSample } from './WEDMBatchProgramAnalyzerEngine.js';

// --- BOX-MS7: Calculator Page — Program Upload + Tool Callout + Auto S/F ---
export { ProgramUploadAnalyzerEngine, programUploadAnalyzerEngine, type DetectedDialect, type UploadAnalysisResult, type AnalyzedTool, type AnalyzedOperation, type SpeedFeedEntry, type CycleStructure, type ProgramHints } from './ProgramUploadAnalyzerEngine.js';
export { ToolCalloutCardEngine, toolCalloutCardEngine, type ToolCalloutCard, type ToolCalloutInput, type ToolCalloutResult } from './ToolCalloutCardEngine.js';
export { ProgramMemoryEngine, programMemoryEngine, type ToolAssignment, type ProgramRecord as MemoryProgramRecord, type ToolDefault, type MemoryStats } from './ProgramMemoryEngine.js';

// --- HM-KC-MS0: Intelligent Macro DB extractors (E1168) ---
export { IMToolDbExtractor, IMMacroDbExtractor, imToolDbExtractor, imMacroDbExtractor, type IMToolMaterial, type IMToolCuttingMaterial, type IMToolFormula, type IMToolTableInfo, type IMToolDbResult, type IMMacroTableInfo, type IMMacroType, type IMMacroEntry, type IMJobEntry, type IMMacroDbResult } from './HyperMillIMDbExtractor.js';

// --- ACP: Automation Control Plane (7 engines, 22 dispatcher actions) ---
export { AutomationChainEngine, automationChainEngine } from './AutomationChainEngine.js';
export { BuildGuardChainEngine, buildGuardChainEngine } from './BuildGuardChainEngine.js';
export { ChainFailureRecoveryEngine, chainFailureRecoveryEngine } from './ChainFailureRecoveryEngine.js';
export { ContextChainEngine, contextChainEngine } from './ContextChainEngine.js';
export { SpeedFeedAutopilotEngine, speedFeedAutopilotEngine } from './SpeedFeedAutopilotEngine.js';
export { speedFeedDeepLearningEngine, type SpeedPrediction, type FeedPrediction, type ToolLifePrediction, type SurfaceFinishPrediction, type PowerPrediction, type ChainOfThoughtResult, type BayesianOptResult, type SpeedFeedAnalysisResult } from './SpeedFeedDeepLearningEngine.js';
export { speedFeedAdvancedAIEngine, type FeatureImportance, type CounterfactualResult, type ExpertOpinion, type ConsensusResult, type CausalNode, type CausalEdge, type CausalInferenceResult, type HierarchicalPlan, type SelfConsistencyResult, type VerificationResult, type ReActResult, type ReflexionResult } from './SpeedFeedAdvancedAIEngine.js';
export { speedFeedUltimateAIEngine, type DeepEnsembleResult, type EnsembleMember, type Episode, type EpisodicRetrievalResult, type KGNode, type KGEdge, type KGQueryResult, type WorkingMemoryState, type ToTNode, type TreeOfThoughtsResult, type MetaLearningResult, type ActiveLearningSuggestion, type LLMTrace, type AdversarialResult, type MultiModalFusionResult, type UltimateAnalysisResult } from './SpeedFeedUltimateAIEngine.js';
export { PostProcessorAutopilotEngine, postProcessorAutopilotEngine } from './PostProcessorAutopilotEngine.js';
export { QuoteAutopilotEngine, quoteAutopilotEngine } from './QuoteAutopilotEngine.js';

// --- PP-AI: Post Processor AI (4 engines, 29 dispatcher actions) ---
export { postProcessorDeepLearningEngine, PostProcessorDeepLearningEngine, type PatternRecognitionResult, type FeedOptimizationResult, type ControllerClassificationResult, type CycleTimeEstimationResult, type PostQualityScoreResult, type DeepLearningAnalysis, type DeepLearningInput } from './PostProcessorDeepLearningEngine.js';
export { postProcessorDeepReasoningEngine, PostProcessorDeepReasoningEngine, type ChainOfThoughtResult as PPChainOfThoughtResult, type CausalInferenceResult as PPCausalInferenceResult, type CrossCAMSynthesisResult, type ControllerOptimizationResult, type PhysicsReasoningResult, type SelfConsistencyResult as PPSelfConsistencyResult, type DeepReasoningAnalysis, type DeepReasoningInput } from './PostProcessorDeepReasoningEngine.js';
export { postProcessorUltimateAIEngine, PostProcessorUltimateAIEngine, type DeepEnsembleResult as PPDeepEnsembleResult, type EpisodicMemoryResult, type KnowledgeGraphResult, type TreeOfThoughtsResult as PPTreeOfThoughtsResult, type MetaLearningResult as PPMetaLearningResult, type AdversarialValidationResult, type GenerativePostResult, type LLMCLIOutput, type UltimateAIAnalysis, type UltimateAIInput } from './PostProcessorUltimateAIEngine.js';
export { postProcessorIntelligenceOrchestrator, PostProcessorIntelligenceOrchestratorEngine, type OrchestratorInput, type OrchestratorResponse } from './PostProcessorIntelligenceOrchestratorEngine.js';
export { postProcessorKnowledgeEngine, PostProcessorKnowledgeEngine, ENTRY_FUNCTIONS, DRILLING_CYCLES, UPK_SWITCHES, MISC_VALUES, CIRCULAR_SETTINGS, type EntryFunction, type DrillingCycleType, type UPKSwitch, type MiscValue, type CircularSetting } from './PostProcessorKnowledgeEngine.js';
export { postProcessorAnalysisEngine, analyzePostProcessor, generateAnalysisReport, applyAutoFixes, type PostIssue, type PostIssueCategory, type AnalysisResult } from './PostProcessorAnalysisEngine.js';

// --- PP-UNWIRED: Previously unwired PostProcessor engines (25 engines, ~25,000 LOC) ---
export { postProcessorTrainerEngine, PostProcessorTrainerEngine, type StructuralElement, type DialectDiff, type DialectPatch, type PostTrainerInput, type PostTrainerResult } from './PostProcessorTrainerEngine.js';
export { postProcessorDeepAIHardeningEngine, PostProcessorDeepAIHardeningEngine, type PostConversionRequest, type PostConversionResult, type PostGeneratorRequest, type PostGeneratorResult, type PostValidationRequest, type PostValidationResult, type ControllerTipQuery, type ControllerTip, type JMDieMachinePostConfig } from './PostProcessorDeepAIHardeningEngine.js';
export { postProcessorNeuralNetworkEngine, PostProcessorNeuralNetworkEngine, type ActivationFunction as NNActivationFunction, type LayerType, type NeuralLayer, type NetworkArchitecture, type TrainingSample, type PredictionResult, type GCodePattern, type SafetySequence as NNSafetySequence, type GCodeState, type HMMObservation, type HMMResult, type ControllerPrior, type BayesianResult, type EntropyResult, type MutualInfoResult, type FrequentItemset, type AssociationRule, type SequenceNode, type OptimizedSequence } from './PostProcessorNeuralNetworkEngine.js';
export { postProcessorDeepIntelligenceEngine, PostProcessorDeepIntelligenceEngine, type MachineCategory, type LatheConfig, type MillConfig, type WireEDMConfig, type AccuracyClass, type RigidityClass, type MachineSpec, type AxisSpec, type SpindleSpec, type TaperType, type TurretSpec, type ToolChangerSpec, type WorkEnvelope as DIWorkEnvelope, type CoolantSystem, type MachineOption, type ControllerCapabilities, type ControllerGCodeMapping, type InsertShape, type InsertClearance, type InsertTolerance, type InsertSpec, type InsertMaterial, type InsertCoating, type HolderType, type ToolAssembly, type ToolLifeModel, type MaterialSpec, type CoolantType, type ToolpathCategory, type RoughingStrategy, type FinishingStrategy, type FiveAxisStrategy, type TurningStrategy, type ToolpathSpec, type ToolpathParameters, type ToolpathConstraints, type ToolpathOptimization, type KinematicConfig, type KinematicModel, type SingularityZone, type AxisLimits, type CollisionZoneType, type CollisionZone, type CollisionGeometry, type CollisionCheckResult, type NNLayerType, type DeepLearningArchitecture, type DeepLearningLayer, type LossFunction, type ReasoningStep as DIReasoningStep, type CausalNode as DICausalNode, type CSPProblem, type CSPVariable, type CSPConstraint, type CSPObjective, type UncertaintyEstimate } from './PostProcessorDeepIntelligenceEngine.js';
export { postProcessorAISelfAwarenessIntegrationEngine, PostProcessorAISelfAwarenessIntegrationEngine, type PostProcessorSelfAwarenessContext, type AICapabilitySummary, type TribalKnowledgeEntry as PPTribalKnowledgeEntry, type PlaybookRuleEntry as PPPlaybookRuleEntry, type JMDieMachineProfile, type ControllerKnowledgeSet, type CannedCycleDefinition, type HSMModeDefinition, type ProbingCycleDefinition, type SafetySequence as PPSafetySequence, type FormulaReference, type ReasoningStep as PPReasoningStep, type AIPostGeneratorRequest, type AIGeneratedPostResult } from './PostProcessorAISelfAwarenessIntegrationEngine.js';
export { postProcessorUnifiedDeepReasoningEngine, type UnifiedReasoningRequest, type UnifiedReasoningResult } from './PostProcessorUnifiedDeepReasoningEngine.js';
export { postProcessorCognitiveEngine, type CognitiveGenerationRequest, type CognitiveGenerationResult } from './PostProcessorCognitiveEngine.js';
export { postProcessorMetaLearningEngine, type MetaLearningResult as PPMetaLearningResultFull } from './PostProcessorMetaLearningEngine.js';
export { postProcessorVideoKnowledgeNeuralEngine, VIDEO_LEARNED_KNOWLEDGE, type VideoLearnedController, type ControllerVideoKnowledge, type ToolManagementKnowledge, type HSMSmoothingKnowledge, type TCPMKnowledge, type CannedCycleKnowledge, type NeuralReasoningResult } from './PostProcessorVideoKnowledgeNeuralEngine.js';
export { postProcessorTransformerEngine, TRANSFORMER_CONFIG, GCODE_VOCABULARY, scaledDotProductAttention, getPositionalEncoding, bidirectionalLSTM, graphAttention, GCodeDiffusionModel, type TransformerConfig, type GCodeToken, type GCodeTokenType, type ToolpathNode, type TransformerGenerationResult, type AttentionOutput } from './PostProcessorTransformerEngine.js';
export { postProcessorKnowledgeGraphEngine, RTCP_CONFIGURATIONS, type EntityType, type RelationshipType, type KGEntity, type KGRelationship, type KnowledgeGraph, type RTCPConfiguration, type RLState, type RLAction, type PolicyNetwork } from './PostProcessorKnowledgeGraphEngine.js';
export { postProcessorUnifiedPhysicsOrchestrationEngine } from './PostProcessorUnifiedPhysicsOrchestrationEngine.js';
export { postProcessorPhysicsAwareGeneratorEngine } from './PostProcessorPhysicsAwareGeneratorEngine.js';
export { postProcessorAICoordinationBridge } from './PostProcessorAICoordinationBridge.js';
export { postProcessorAGIContinuousLearningEngine } from './PostProcessorAGIContinuousLearningEngine.js';
export { postProcessorHyperMillKnowledgeEngine } from './PostProcessorHyperMillKnowledgeEngine.js';
export { postProcessorComprehensiveKnowledgeEngine } from './PostProcessorComprehensiveKnowledgeEngine.js';
export { postProcessorMachineKinematicsEngine } from './PostProcessorMachineKinematicsEngine.js';
export { postProcessorCPSImplementationEngine } from './PostProcessorCPSImplementationEngine.js';
export { postProcessorProductionPatternEngine } from './PostProcessorProductionPatternEngine.js';
export { postProcessorMasterPostArchitectureEngine } from './PostProcessorMasterPostArchitectureEngine.js';
export { postProcessorTribalKnowledgeIntegrationEngine } from './PostProcessorTribalKnowledgeIntegrationEngine.js';
export { postProcessorAGIMasterRegistryEngine } from './PostProcessorAGIMasterRegistryEngine.js';
export { postProcessorAGIWiringIntegrationEngine } from './PostProcessorAGIWiringIntegrationEngine.js';
export { postProcessorDeepCognitionEngine } from './PostProcessorDeepCognitionEngine.js';
export { controllerKnowledgeEngine, getControllerProfile, getAvailableControllers, compareControllers, CONTROLLER_PROFILES, type ControllerFamily, type ControllerProfile, type ControllerFeatures, type GCodeDialect, type CycleDefinition, type MCodeMapping, type ControllerComparison } from './ControllerKnowledgeEngine.js';

// --- MXU: Max Utilization (10 engines, 35 dispatcher actions) ---
export { UtilizationContractEngine, utilizationContractEngine } from './UtilizationContractEngine.js';
export { CapabilityCensusEngine, capabilityCensusEngine } from './CapabilityCensusEngine.js';
export { CodingCopilotEngine, codingCopilotEngine } from './CodingCopilotEngine.js';
export { TokenEconomyEngine, tokenEconomyEngine } from './TokenEconomyEngine.js';
export { PersistentMemoryEngine, persistentMemoryEngine } from './PersistentMemoryEngine.js';
export { CapabilityPathEngine, capabilityPathEngine } from './CapabilityPathEngine.js';
export { WorkflowOrchestrationEngine, workflowOrchestrationEngine } from './WorkflowOrchestrationEngine.js';
export { ProductPillarEngine, productPillarEngine } from './ProductPillarEngine.js';
export { DiscoverabilityEngine, discoverabilityEngine } from './DiscoverabilityEngine.js';
export { CapabilityEffectivenessEngine, capabilityEffectivenessEngine } from './CapabilityEffectivenessEngine.js';

// --- INFRA: Infrastructure Modernization (6 engines) ---
export { EmbeddingPipelineEngine, embeddingPipelineEngine } from './EmbeddingPipelineEngine.js';
export { DurableJobQueueEngine, durableJobQueueEngine } from './DurableJobQueueEngine.js';
// EventBusEngine already exported above (line ~107)
export { ModelRegistryEngine, modelRegistryEngine } from './ModelRegistryEngine.js';
export { NeuralModelRegistryEngine, neuralModelRegistryEngine, type ModelCheckpoint, type ModelArchitecture, type WeightDtype, type DeploymentStatus, type WeightLayer, type TrainingMetadata, type ModelFilter, type GCodeModelTag, type NeuralModelRegistryOptions } from './NeuralModelRegistryEngine.js';
export { NeuralWeightPersistenceEngine, neuralWeightPersistenceEngine, type WeightFileHeader, type WeightLayer as PersistenceWeightLayer, type WeightFile, type LoadedWeights, type WeightFileInfo, type WeightDtype as PersistenceWeightDtype } from './NeuralWeightPersistenceEngine.js';
export { PluginManifestEngine, pluginManifestEngine } from './PluginManifestEngine.js';
export { DeadLetterQueueEngineImpl, deadLetterQueueEngine, type DeadLetterEntry as DLQEntry, type FailureReason, type FailureSeverity, type RetryPolicy, type DLQStats } from './DeadLetterQueueEngine.js';

// --- PDF-EXT: PDF Extraction Pipeline (5 engines, 9 dispatcher actions) ---
export { PDFSourceRegistryEngine, pdfSourceRegistryEngine, type PDFSource, type PDFSourceCategory, type ExtractedTable } from './PDFSourceRegistryEngine.js';
export { PDFTableExtractionEngine, pdfTableExtractionEngine, type TableExtractionOptions, type TableDetectionResult, type TableType } from './PDFTableExtractionEngine.js';
export { PDFFormulaExtractionEngine, pdfFormulaExtractionEngine, type ExtractedFormula, type FormulaVariable, type FormulaCategory } from './PDFFormulaExtractionEngine.js';
export { PDFMaterialPropertyExtractionEngine, pdfMaterialPropertyExtractionEngine, type ExtractedMaterialProperty, type MaterialProperties, type ISOGroup as PDFISOGroup } from './PDFMaterialPropertyExtractionEngine.js';
export { PDFHandbookBatchProcessorEngine, pdfHandbookBatchProcessorEngine, type BatchProcessingResult, type SourceProcessingResult, type BatchProgress } from './PDFHandbookBatchProcessorEngine.js';
export { ResourceExtractionStateEngine, resourceExtractionStateEngine, type ResourceEntry as ExtractionResourceEntry, type ResourceCategory, type ExtractionStatus as ResourceExtractionStatus, type ExtractionResult as ResourceExtractionResult, type ExtractionStats } from './ResourceExtractionStateEngine.js';
export { CatalogExtractionEngine, catalogExtractionEngine, type CatalogTool, type ToolType, type ToolGeometry as CatalogToolGeometry, type CuttingDataSet, type DataSource, type MergeResult } from './CatalogExtractionEngine.js';
export { MITCourseRegistryEngine, mitCourseRegistryEngine, type AlgorithmMapping, type CourseMetadata, type CourseResources, type CourseEntry, type AlgorithmRegistry, type CourseIndex, type PRISMCourseCatalog, type EngineAlgorithmMap } from './MITCourseRegistryEngine.js';
export { LectureNoteExtractionEngine, lectureNoteExtractionEngine, type ExtractedFormula as LectureFormula, type FormulaVariable as LectureFormulaVariable, type FormulaCategory as LectureFormulaCategory, type ProblemSolutionPair, type LectureMetadata, type ExtractionSummary } from './LectureNoteExtractionEngine.js';
export { KnowledgeIngestionOrchestratorEngine, knowledgeIngestionOrchestratorEngine, type ResourceCategory as IngestionResourceCategory, type DiscoveredResource, type ExtractionResult as IngestionExtractionResult, type IngestionPipelineResult, type WiringTarget } from './KnowledgeIngestionOrchestratorEngine.js';

// --- KAR-MS5: PUOA Core (5 engines) ---
export {
  PRISMUnifiedOrchestratorEngine,
  prismUnifiedOrchestratorEngine,
  AUTHORITY_RANK,
  type ExecutionTier,
  type AuthoritySource as PUOAAuthoritySource,
  type PUOAInput,
  type PUOAConstraints,
  type DomainResult,
  type ChainStep as PUOAChainStep,
  type PUOAResult,
  type TierRoutingResult,
} from './PRISMUnifiedOrchestratorEngine.js';

// IntentClassifierEngine — removed, file missing
// export {
//   IntentClassifierEngine,
//   intentClassifierEngine,
//   type IntentClassification,
//   type IntentCategory,
//   type OrchestratorRecommendation,
//   type ExtractedEntity,
// } from './IntentClassifierEngine.js';

export {
  DomainOrchestratorPluginRegistry,
  domainOrchestratorPluginRegistry,
  type OrchestratorCategory,
  type OrchestratorPlugin,
  type OrchestratorCapability,
  type PluginQueryResult,
  type PluginQuery,
  type OrchestratorStats,
} from './DomainOrchestratorPluginRegistry.js';

export {
  ChainExecutorEngine,
  chainExecutorEngine,
  type ChainType,
  type StepStatus,
  type ChainStep as ExecutorChainStep,
  type ChainDefinition,
  type ChainCheckpoint,
  type ChainExecutionResult,
  type ChainMetrics,
  type StepExecutor,
  type ExecutionContext,
} from './ChainExecutorEngine.js';

// AuthorityRankingEngine — removed, file missing
// export {
//   AuthorityRankingEngine,
//   authorityRankingEngine,
//   DEFAULT_AUTHORITY_RANKS,
//   type AuthoritySource,
//   type ExtendedAuthoritySource,
//   type AuthorityConfig,
//   type AuthorityClaim,
//   type AuthorityResolution,
//   type ConflictReport,
//   type BulkResolutionResult,
// } from './AuthorityRankingEngine.js';

// Multi-Agent AI Interface — AI-INTEG-MS0
export {
  MultiAgentAIInterfaceEngine,
  multiAgentAIInterfaceEngine,
  type ExecuteResult,
  type SessionRegistration,
  type TokenAllocation,
  type ActivitySnapshot,
  type ConflictDetectionResult,
} from './MultiAgentAIInterfaceEngine.js';

// Reasoning Chain Sharing — AI-INTEG-MS1
export {
  ReasoningChainSharingEngine,
  reasoningChainSharingEngine,
  type SharedReasoningChain,
  type ChainShareEvent,
  type ChainValidation,
  type ChainQuery,
  type ChainSharingStats,
  type TribalExtractionResult,
} from './ReasoningChainSharingEngine.js';

// Opus Capability Engine — AI-INTEG-MS2
export {
  OpusCapabilityEngine,
  opusCapabilityEngine,
  type ModelTier,
  type CapabilityCategory,
  type ComplexityFactors,
  type OpusRequest,
  type OpusConstraints,
  type OpusResponse,
  type OpusAlternative,
  type ComplexityAssessment,
  type PhysicsValidationStep,
  type PhysicsValidationResult,
  type NLTranslationResult,
  type OpusCapabilityStats,
} from './OpusCapabilityEngine.js';

// Knowledge Graph Neural Bridge — AI-INTEG-MS3
export {
  KnowledgeGraphNeuralBridgeEngine,
  knowledgeGraphNeuralBridgeEngine,
  type IndexableEntityType,
  type IndexedEntity,
  type SemanticQuery,
  type SemanticResult,
  type GraphContext,
  type KnowledgeGap,
  type InferredRelation,
  type GraphAugmentedStep,
  type NeuralBridgeStats,
} from './KnowledgeGraphNeuralBridgeEngine.js';

// Agent Specialization Profiles — AI-INTEG-MS5
export {
  AgentSpecializationProfileEngine,
  agentSpecializationProfileEngine,
  type AgentFamily,
  type ProfileModelTier,
  type KnowledgeDomain,
  type AgentCapability,
  type CoordinationPattern as ProfileCoordinationPattern,
  type CapabilityDefinition,
  type AgentProfile,
  type ProfilePerformance,
  type TaskRequirements,
  type ProfileMatch,
  type TeamComposition,
  type TeamMember,
  type ProfileStats,
} from './AgentSpecializationProfileEngine.js';

// Multi-Agent Coordinator — Internal agent coordination
export {
  MultiAgentCoordinatorEngine,
  multiAgentCoordinatorEngine,
  type AgentType,
  type AgentStatus,
  type CoordinationPattern,
  type AgentDefinition,
  type AgentInstance,
  type AgentTask,
  type AgentResult,
  type CoordinationRequest,
  type CoordinationResult,
  type AgentConflict as InternalAgentConflict,
  type ConflictResolution,
  type MultiAgentReasoning,
} from './MultiAgentCoordinatorEngine.js';

// LLM-INTEL-6: Lathe Intelligence Engine — AI reasoning for lathe operations
export {
  LatheIntelligenceEngine,
  latheIntelligenceEngine,
  type LatheOperationType,
  type LatheMachineConfig as LatheIntelMachineConfig,
  type LathePartProfile,
  type MacroRecommendation,
  type LiveToolingRecommendation,
  type MultiTurretSafetyAnalysis,
  type SwissTypeDecision,
  type MillTurnPlan,
} from './LatheIntelligenceEngine.js';

// LLM-INTEL-7: Lathe CAM Intelligence Engine — AI-powered CAD/CAM for lathe
export {
  LatheCAMIntelligenceEngine,
  latheCAMIntelligenceEngine,
  type LatheToolpathType,
  type LatheCADFeature,
  type LathePartGeometry,
  type LatheCADFeatureInstance,
  type LatheMachineConfig,
  type AvailableTool,
  type ToolpathRecommendation,
  type ParametricTemplateRecommendation,
  type OperationSequenceRecommendation,
  type WorkholdingRecommendation,
  type MRRCostOptimization,
  type LatheCAMAnalysis,
} from './LatheCAMIntelligenceEngine.js';

// LLM-INTEL-8: Lathe Deep Reasoning Engine — Multi-step deep reasoning for lathe
export {
  LatheDeepReasoningEngine,
  latheDeepReasoningEngine,
  type ISOGroup,
  type ReasoningStep,
  type ReasoningChain,
  type LathePartDefinition,
  type LatheFeature,
  type LatheFeatureType,
  type LatheMachineCapability,
  type ProcessPlan,
  type SetupPlan,
  type OperationPlan,
  type RiskFactor,
  type QualityPrediction,
  type SetupOptimizationResult,
  type ChatterPrediction,
  type DeflectionPrediction,
  type FailureModeAnalysis,
} from './LatheDeepReasoningEngine.js';

// LLM-INTEL-9: Lathe Predictive Intelligence Engine — Numerical predictions with confidence intervals
export {
  LathePredictiveIntelligenceEngine,
  lathePredictiveIntelligenceEngine,
  type Prediction,
  type CuttingConditions as PredictiveCuttingConditions,
  type ToolState,
  type ToolWearPrediction,
  type SurfaceFinishPrediction,
  type ThermalGrowthPrediction,
  type CycleTimePrediction,
  type QualityPrediction as PredictiveQualityPrediction,
  type AnomalyDetection,
  type CalibrationData,
} from './LathePredictiveIntelligenceEngine.js';

// LLM-INTEL-10: Lathe Troubleshooting Intelligence Engine — Practical problem-solving for machinists
export {
  LatheTroubleshootingIntelligenceEngine,
  latheTroubleshootingIntelligenceEngine,
  type ToolSetup,
  type WorkpieceSetup,
  type CuttingParameters as TroubleshootingCuttingParams,
  type ToolOverhangAnalysis,
  type ToolOverhangRecommendation,
  type ParameterAdjustment,
  type WorkpieceOverhangAnalysis,
  type SupportRequirement,
  type ChatterDiagnosis,
  type ChatterCause,
  type SpeedRecommendation,
  type MachiningErrorDiagnosis,
  type ErrorCause,
  type CorrectiveAction,
  type ToolBreakageRisk,
  type RiskFactor,
  type ParameterLimit,
  type SetupValidation,
  type SetupIssue,
  type ChecklistItem,
} from './LatheTroubleshootingIntelligenceEngine.js';

// LLM-INTEL-11: Lathe Expert Advisor Engine — Expert-level machinist guidance
export {
  LatheExpertAdvisorEngine,
  latheExpertAdvisorEngine,
  type MaterialCategory,
  type LatheOperation,
  type DifficultGeometry,
  type MaterialStrategy,
  type InsertRecommendation,
  type GeometryAdvice,
  type ParameterGuideline,
  type ToolingSelection,
  type ToolRecommendation,
  type OperationExpertise,
  type ParameterSweetSpot,
  type Pitfall,
  type TroubleshootingItem,
  type ProcessOptimization,
  type OptimizationOpportunity,
  type ParameterRecommendation,
  type CycleTimeImprovement,
} from './LatheExpertAdvisorEngine.js';

// LLM-INTEL-12: Machine-specific intelligence for all lathe types
export {
  LatheMachineIntelligenceEngine,
  latheMachineIntelligenceEngine,
  type LatheMachineType,
  type AxisConfiguration,
  type MachineCapabilityProfile,
  type PartRequirements,
  type MachineSelectionResult,
  type MachineRecommendation,
  type CapabilityMatch,
  type WorkholdingStrategy,
  type ToolingConfiguration,
  type ToolPosition,
  type MachineComparison,
  type ComparisonCriterion,
} from './LatheMachineIntelligenceEngine.js';

// LLM-INTEL-13: Adaptive learning and pattern recognition
export {
  LatheDeepLearningEngine,
  latheDeepLearningEngine,
  type HistoricalJob,
  type PatternMatch,
  type LearningFeedback,
  type AdaptedParameters,
  type AdaptationFactor,
  type SynthesizedKnowledge,
  type AnomalyResult,
  type TrendAnalysis,
  type ConfidentRecommendation,
} from './LatheDeepLearningEngine.js';

// LLM-INTEL-14: Advanced lathe operations
export {
  LatheAdvancedOperationsEngine,
  latheAdvancedOperationsEngine,
  type LiveToolingOperation,
  type ThreadForm,
  type GrooveType,
  type LiveToolingParams,
  type LiveToolingResult,
  type PolygonTurningParams,
  type PolygonTurningResult,
  type AdvancedThreadParams,
  type AdvancedThreadResult,
  type GroovingParams,
  type GroovingResult,
  type EccentricParams,
  type EccentricResult,
  type ContourParams,
  type ContourResult,
} from './LatheAdvancedOperationsEngine.js';

// LLM-INTEL-15: Unified lathe AI orchestration
export {
  LatheUnifiedAIEngine,
  latheUnifiedAIEngine,
  type LathePartDefinition,
  type LatheFeature,
  type ToleranceSpec,
  type SurfaceFinishSpec,
  type LatheProcessPlan,
  type SetupPlan,
  type OperationPlan,
  type ToolRecommendation,
  type CuttingParameters,
  type SetupSheet,
  type RealTimeSignal,
  type AdaptiveControlAction,
  type CollisionCheckResult,
} from './LatheUnifiedAIEngine.js';

// Swiss-Type Intelligence Engine
export {
  SwissTypeIntelligenceEngine,
  swissTypeIntelligenceEngine,
  type SwissMachineConfig,
  type SwissPartDefinition,
  type SwissPartFeature,
  type GuideBushingAnalysis,
  type GangToolLayout,
  type GangToolPosition,
  type SpindleSyncPlan,
  type BarFeedStrategy,
  type BackworkingPlan,
  type SwissProcessPlan,
} from './SwissTypeIntelligenceEngine.js';

// Multi-Turret Synchronization Engine
export {
  MultiTurretSyncEngine,
  multiTurretSyncEngine,
  type MultiTurretConfig,
  type TurretSpec,
  type MultiTurretPart,
  type TurretOperation,
  type SimultaneousCutPlan,
  type CutPair,
  type CollisionAnalysis,
  type SyncCodePlan,
  type BalancedCutAnalysis,
  type CycleOptimization,
} from './MultiTurretSyncEngine.js';

// Multi-Spindle Automatic Engine
export {
  MultiSpindleAutomaticEngine,
  multiSpindleAutomaticEngine,
  type MultiSpindleMachineConfig,
  type MultiSpindlePart,
  type SpindleOperation,
  type StationAssignment,
  type StationConfig,
  type CycleBalanceAnalysis,
  type ToolingDecision,
  type IndexOptimization,
  type ProductionAnalysis,
} from './MultiSpindleAutomaticEngine.js';

// Complete Machining Engine (WFL-style mill-turn)
export {
  CompleteMachiningEngine,
  completeMachiningEngine,
  type CompleteMachiningConfig,
  type ComplexPart,
  type PartFeature,
  type SingleSetupPlan,
  type SetupOperation,
  type WorkholdingPlan,
  type BAxisInterpolation,
  type DeepHolePlan,
  type GearCuttingPlan,
} from './CompleteMachiningEngine.js';

// Automated Resource Harvesting Pipeline — RESOURCE-HARVEST-MS1: Full Automation
export {
  AutomatedResourceHarvestingPipeline,
  automatedResourceHarvestingPipeline,
  type HarvestStatus,
  type HarvestJob,
  type HarvestProgress,
  type HarvestResult,
  type HarvestReport,
  type ScanResult,
} from './AutomatedResourceHarvestingPipeline.js';

// ManufacturerCatalogAIEngine — RESOURCE-AI: Deep catalog knowledge
export {
  ManufacturerCatalogAIEngine,
  manufacturerCatalogAI,
  type CatalogManufacturer,
  type HolderCategory,
  type WorkholdingCategory,
  type CuttingToolCategory,
} from './ManufacturerCatalogAIEngine.js';

// MITCourseDeepLearningEngine — RESOURCE-AI: Academic foundations
export {
  MITCourseDeepLearningEngine,
  mitCourseDeepLearning,
} from './MITCourseDeepLearningEngine.js';

// MITCourseIntegrationEngine — PP-AGI: 216+ MIT OCW course integration
export {
  MITCourseIntegrationEngine,
  mitCourseIntegrationEngine,
  type PPDomain,
  type CourseTier,
  type IntegrationStatus,
  type MITCourse,
  type AlgorithmEntry,
  type CourseDetails,
  type CourseSearchResult,
  type AlgorithmExtraction,
  type ManufacturingApplication,
  type CourseRecommendation,
  type IntegrationStats,
} from './MITCourseIntegrationEngine.js';

// VideoELearningAIEngine — RESOURCE-AI: Video-based learning
export {
  VideoELearningAIEngine,
  videoELearningAI,
} from './VideoELearningAIEngine.js';

// CNCControllerDeepLearningEngine — RESOURCE-AI: Controller intelligence
export {
  CNCControllerDeepLearningEngine,
  cncControllerDeepLearning,
  type ControllerFamily,
  type ControllerProfile,
  type GCodeTranslation,
  type ControllerRecommendation,
  type MacroPattern,
  type RecoveryProcedure,
} from './CNCControllerDeepLearningEngine.js';

// CodeGenerationIntegrityEngine — AI code quality assurance
export {
  CodeGenerationIntegrityEngine,
  codeGenerationIntegrityEngine,
  type ValidationInput,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type CodeMetrics,
  type CorruptionType,
  type FileType,
} from './CodeGenerationIntegrityEngine.js';

// HardenedAgentCapabilitiesEngine — Physics-grounded AI validation
export {
  HardenedAgentCapabilitiesEngine,
  hardenedAgentCapabilities,
  type PhysicsGrounding,
  type CrossVerification,
  type Discrepancy,
  type Correction,
  type TribalGate,
} from './HardenedAgentCapabilitiesEngine.js';

// AIIntelligenceMaximizerEngine — Full PRISM knowledge utilization
export {
  AIIntelligenceMaximizerEngine,
  aiIntelligenceMaximizer,
  type MaximizerInput,
  type MaximizedRecommendation,
  type OperationType,
  type FeatureType,
  type MachineType,
} from './AIIntelligenceMaximizerEngine.js';

// Mill AI Deep Learning Suite — MILL-AI-COMPLETE
export {
  MillDeepLearningEngine,
  millDeepLearningEngine,
} from './MillDeepLearningEngine.js';

export {
  MillNeuralNetworkEngine,
  millNeuralNetworkEngine,
} from './MillNeuralNetworkEngine.js';

export {
  MillProgramOptimizerEngine,
  millProgramOptimizerEngine,
} from './MillProgramOptimizerEngine.js';

export {
  MillTribalIntegrationEngine,
  millTribalIntegrationEngine,
} from './MillTribalIntegrationEngine.js';

// Mill Comprehensive Neural Network — 256-dimensional encoding
export {
  MillComprehensiveNeuralEngine,
  millComprehensiveNeuralEngine,
  MATERIAL_ENCODING,
  TOOL_TYPE_ENCODING,
  HOLDER_ENCODING,
  MACHINE_ENCODING,
  CONTROLLER_ENCODING,
  KINEMATICS_ENCODING,
  TOOLPATH_ENCODING,
  BUILD_QUALITY_ENCODING,
  SPINDLE_ENCODING,
  SAFETY_ENCODING,
  EQUIPMENT_ENCODING,
  type ComprehensivePrediction,
  type ComprehensiveTrainingSample,
  type AnomalyReport,
} from './MillComprehensiveNeuralEngine.js';

// Mill Kinematics & Collision Avoidance — MILL-KINEMATICS-MS0
export {
  MillKinematicsCollisionEngine,
  millKinematicsCollisionEngine,
  type Vec3,
  type Matrix4x4,
  type ToolOrientation,
  type KinematicType,
  type WorkEnvelope,
  type MachineKinematicSpec,
  type CollisionObject,
  type CollisionResult,
  type SafetyZone,
  type SafeMotionCommand,
} from './MillKinematicsCollisionEngine.js';

// --- AI-MAX: Full System AGI Capability Maximization ---
export {
  JMDieProgramAnalyzerEngine,
  jmDieProgramAnalyzerEngine,
  type ProgramAnalysis,
  type OperationBlock,
  type ToolCall,
  type SpeedFeedEntry as JMDieSpeedFeedEntry,
  type CycleUsage,
  type PatternMatch,
  type MaterialPatterns,
  type CustomerProfile,
  type ProgramCorpusStats,
} from './JMDieProgramAnalyzerEngine.js';

export {
  PatternDatabaseEngine,
  patternDatabaseEngine,
  type UnifiedPattern,
  type SearchResult,
  type SearchOptions,
  type PatternStats,
} from './PatternDatabaseEngine.js';

// --- Neural Determinism Testing Framework (P0-CRITICAL) ---
export {
  NeuralDeterminismTestingEngine,
  neuralDeterminismTestingEngine,
  SeededPRNG,
  type NeuralTestConfig,
  type NeuralTestResult,
  type DistributionStats,
  type GoldenBaseline,
  type BaselineRegistry,
  type DriftReport,
  type AnomalyReport,
  type Anomaly,
  type TestRunContext,
} from './NeuralDeterminismTestingEngine.js';

// --- Unified PP-AGI Orchestration Engine (PP-AGI-UNIFIED) ---
export {
  UnifiedPPAGIOrchestrationEngine,
  unifiedPPAGIOrchestrationEngine,
  OrchestrationEventTypes,
  type PPOperationType,
  type QualityLevel,
  type EngineExecutionStatus,
  type PPInput,
  type OrchestrationConstraints,
  type OrchestrationContext,
  type OrchestrationRequest,
  type EngineExecutionResult,
  type DAGNode,
  type OrchestrationResult,
  type OrchestrationMetrics,
  type EngineDependencyMap,
  type OrchestrationStats,
} from './UnifiedPPAGIOrchestrationEngine.js';


// --- Tebis CAM Bridge Engine (E1202) ---
export {
  TebisCAMBridgeEngine,
  tebisCAMBridgeEngine,
  type TebisProject,
  type TebisNCJob,
  type TebisOperation,
  type TebisOperationType,
  type TebisTool,
  type TebisToolType,
  type TebisTemplate,
  type TebisTemplateCategory,
  type TebisTemplateOperation,
  type TebisTemplateParameter,
  type TebisMatchingCondition,
  type TebisCuttingParams,
  type TebisStrategyParams,
  type TebisCoordinateSystem,
  type TebisStock,
  type TebisMachine,
  type TebisSetup,
  type TebisCollisionReport,
  type TebisCollisionDetail,
  type TebisToolpathStats,
  type TebisNCParseResult,
  type TebisNCOperation,
  type TebisNCTool,
  type TebisXMLImportResult,
  type PRISMCAMProject,
  type PRISMOperation,
  type PRISMTool,
  type PRISMSetup,
  type TebisExtractionResult,
} from './TebisCAMBridgeEngine.js';

// --- SprutCAM Bridge Engine (E1180) ---
export {
  SprutCAMBridgeEngine,
  sprutCAMBridgeEngine,
  type SprutCAMProject,
  type SprutOperation,
  type SprutOperationType,
  type SprutOperationParams,
  type SprutTool,
  type SprutToolType,
  type SprutRobotConfig,
  type SprutMillTurnConfig,
  type SprutWireEdmConfig,
  type SprutMachineDefinition,
  type SprutStock,
  type SprutFixture,
  type SprutToolpathStats,
  type SprutSimulationResult,
  type SprutNCResult,
  type SprutConnectionResult,
  type SprutActionResult,
} from './SprutCAMBridgeEngine.js';

// --- Milling Physics Kernel Engine (FACADE) ---
export {
  millingPhysicsKernelEngine,
  MillingPhysicsKernelEngine,
} from './MillingPhysicsKernelEngine.js';

// --- Formula Wiring Engine ---
export {
  FormulaWiringEngine,
  formulaWiringEngine,
  type FormulaWiring,
  type WiringReport,
  type FormulaExecutionTrace,
  type FormulaValidationResult,
  type FormulaSearchResult,
} from './FormulaWiringEngine.js';

// --- LATHE-AWARE-HARDEN MS8: Lathe Master Orchestrator Facade ---
export {
  latheMasterOrchestratorFacadeEngine,
  type LatheOrchRequestType,
  type LatheOrchRequest,
  type LatheOrchResponse,
  type LatheAwarenessSnapshot,
} from './LatheMasterOrchestratorFacadeEngine.js';

// --- LATHE-AWARE-HARDEN MS9: Programming Style Selector (E107) ---
export {
  latheProgrammingStyleSelectorEngine,
  styleSelectionInputSchema,
  type ProgrammingStyle,
  type ConversationalType,
  type PartComplexity as StyleSelectorPartComplexity,
  type OperatorSkill,
  type TimeConstraint,
  type MachineAvailability,
  type StyleSelectionInput,
  type StyleScore,
  type CostEstimate as StyleSelectorCostEstimate,
  type StyleRecommendation,
  type StyleCostComparison,
} from './LatheProgrammingStyleSelectorEngine.js';

// --- LATHE-AWARE-HARDEN MS10: Program Catalog Index & Retrieval (E108) ---
export {
  latheProgramCatalogEngine,
  type CamSystem,
  type ProgramCatalogEntry,
  type PartSpec,
  type SimilarityMatch,
  type ProgrammingHistory,
  type StyleDistribution,
  type ScanOptions,
} from './LatheProgramCatalogEngine.js';

// --- LATHE-AWARE-HARDEN MS11: Programming Cost Model (E109) ---
export {
  latheProgrammingCostEngine,
  type ProgrammingCostOptions,
  type ProgrammingCostResult,
  type CompareInput,
  type CompareResult,
  type BreakEvenPoint,
  type BreakEvenAnalysis,
} from './LatheProgrammingCostEngine.js';

// --- LATHE-AWARE-HARDEN MS12: Part Family Planning (E110) ---
export {
  lathePartFamilyPlanningEngine,
  type CustomerIndustry,
  type InvestmentLevel,
  type FamilyPartSpec,
  type FamilyPlanningResult,
  type MacroROIResult,
} from './LathePartFamilyPlanningEngine.js';

// --- LATHE-PRO gap-fill engines ---
export {
  expandingMandrelEngine,
  type MandrelSpec,
  type PartSpec as MandrelPartSpec,
  type MandrelAnalysisInput,
  type MandrelAnalysisResult,
} from './ExpandingMandrelEngine.js';

export {
  faceDriverTorqueEngine,
  type FaceDriverSpec,
  type PartMaterialSpec,
  type TorqueAnalysisResult,
} from './FaceDriverTorqueEngine.js';

export {
  syncCodeVerificationEngine,
  type SyncDialect,
  type ChannelProgram,
  type SyncPoint,
  type SyncIssue,
  type VerificationResult as SyncVerificationResult,
} from './SyncCodeVerificationEngine.js';

export {
  trilobeDeformationEngine,
  type TrilobeInput,
  type TrilobeResult,
} from './TrilobeDeformationEngine.js';

export {
  turningRulesGeneratorEngine,
  type RuleKind,
  type MachiningRule,
  type RuleGenerationContext,
  type RuleSet,
} from './TurningRulesGeneratorEngine.js';

export {
  stockFeedCycleEngine,
  type StockSpec,
  type PartFeedSpec,
  type FeedCycleState,
  type StockEvent,
  type StockEventKind,
  type FeedValidation,
} from './StockFeedCycleEngine.js';


// --- AI-AWARE-HARDEN U-AWR31: Formula Orchestrator ---
export {
  formulaOrchestrator,
  FormulaOrchestrator,
  type FormulaMetadata,
  type ValidationResult,
  type CoverageReport,
  type FormulaEngineMapping,
} from './FormulaOrchestrator.js';
