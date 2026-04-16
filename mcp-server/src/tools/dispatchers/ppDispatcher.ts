/**
 * prism_pp — PostProcessor-Specific Dispatcher
 *
 * 95 actions for post processor operations across 17 categories:
 *   - pp_generate (G-code generation)
 *   - pp_analyze (analysis)
 *   - pp_optimize (optimization)
 *   - pp_validate (safety validation)
 *   - pp_physics (physics-aware)
 *   - pp_neural (neural network)
 *   - pp_tribal (tribal knowledge)
 *   - pp_tribal_active (activated tribal knowledge) — PP-TRIBAL-ACTIVATION
 *   - pp_controller (controller-specific)
 *   - pp_kinematics (machine kinematics)
 *   - pp_strategy (feature strategy KB) — PP-WIRE-MS1
 *   - pp_troubleshoot (root cause diagnosis) — PP-WIRE-MS1
 *   - pp_formula (cross-disciplinary formulas) — PP-WIRE-MS1
 *   - pp_learning (MIT courses + algorithms) — PP-WIRE-MS1
 *   - pp_graph (manufacturing knowledge graph) — PP-WIRE-MS1
 *   - pp_embedding (controller embeddings & transfer) — PP-AGI-MS0
 *   - pp_wiring (asset wiring dashboard) — PP-WIRE-MS5-7
 *
 * Engine dependencies: PostProcessorEngine, PostProcessorPipelineEngine,
 *   PostProcessorAnalyzerEngine, PostProcessorNeuralNetworkEngine,
 *   PostProcessorPhysicsAwareGeneratorEngine, PostProcessorTribalKnowledgeIntegrationEngine,
 *   PostProcessorMachineKinematicsEngine, PostProcessorVerificationEngine,
 *   PostProcessorDeepReasoningEngine, PostProcessorKnowledgeGraphEngine,
 *   FeatureStrategyKnowledgeBaseEngine, TroubleshootingAssistantEngine,
 *   CrossDisciplinaryFormulaIntegrationEngine, CrossDisciplinaryDeepLearningEngine,
 *   ManufacturingKnowledgeGraphEngine, TribalKnowledgeActivationEngine
 *
 * @module dispatchers/ppDispatcher
 * @milestone PP-DISPATCHER, PP-WIRE-MS1, PP-TRIBAL-ACTIVATION
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { PP_ACTION_SCHEMAS } from "../../schemas/ppActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// ============================================================================
// LAZY ENGINE LOADING
// ============================================================================

let _ppEngine: any;
let _ppPipeline: any;
let _ppAnalyzer: any;
let _ppNeural: any;
let _ppPhysics: any;
let _ppTribal: any;
let _ppKinematics: any;
let _ppVerification: any;
let _ppDeepReasoning: any;
let _ppKnowledgeGraph: any;
let _ppCognition: any;
let _ppTransformer: any;
let _ppMetaLearning: any;
let _ppFeedOptimizer: any;
let _ppGenerator: any;
let _ppAPI: any;

// Dormant Giants (PP-WIRE-MS1)
let _featureStrategy: any;
let _troubleshoot: any;
let _crossFormula: any;
let _crossDeepLearning: any;
let _mfgKnowledgeGraph: any;
let _knowledgeGraph: any;

// Tribal Knowledge Activation (PP-TRIBAL-ACTIVATION)
let _tribalActivation: any;

// Asset Wiring Engines (PP-WIRE-MS5-7)
let _algorithmWiring: any;
let _reasoningWiring: any;
let _assetWiringSummary: any;

// PP-AGI-MS0: Controller Embeddings & Transfer
let _ppControllerEmbedding: any;
let _ppDialectTransfer: any;

// PP-AGI-MS1: Machine Vector Encoder
let _ppMachineVectorEncoder: any;

// PP-AGI-MS3: Material Property Vector
let _ppMaterialVector: any;

// PP-AGI-MS2: Cutting Tool Encoder
let _ppToolEncoder: any;

// PP-DL-MS0: Training Data Pipeline
let _ppTrainingPipeline: any;

// PP-DL-MS6: Active Learning Queue
let _ppActiveLearning: any;

// PP-DL-MS7: Online Learning Tracker
let _ppOnlineLearning: any;

// PP-DL-MS8: Ensemble & Uncertainty
let _ppEnsembleUncertainty: any;

// PP-DL-MS9: Decision Explainer
let _ppDecisionExplainer: any;

// PP-AGI-ADVISOR: Unified Job Advisor
let _ppJobAdvisor: any;

// PP-AGI-TEMPLATES: Scenario Template Library
let _ppTemplateLibrary: any;

// PP-AGI-ANALYZER: G-code Program Analyzer
let _ppProgramAnalyzer: any;

// PP-AGI-DASHBOARD: Unified System Metrics
let _ppAGIDashboard: any;

// PP-AGI-KNOWLEDGE: Unified Knowledge Index
let _ppKnowledgeIndex: any;

// PP-AGI-BENCHMARK: Quality benchmarks
let _ppBenchmark: any;

// PP-AGI-WORKFLOW: Multi-step reasoning orchestrator
let _ppWorkflow: any;

// PP-AGI-AUDITOR: Program Library Auditor
let _ppLibraryAuditor: any;

// PP-DL-MS1: Controller Adaptation
let _ppControllerAdaptation: any;

// PP-DL-MS3: Physics Constraint Validator
let _ppPhysicsValidator: any;

// PP-DL-MS4: Safety Rule Validator
let _ppSafetyRuleValidator: any;

// PP-DL-MS5: Greedy Toolpath Optimizer
let _ppGreedyOptimizer: any;

// PP-MACH: Machine-Specific Post Config
let _ppMachinePost: any;

// PP-E2E: End-to-End Post Generator
let _ppE2EGenerator: any;

// PP-CAP: Capability Matrix
let _ppCapMatrix: any;

// PP-TURNING: Okuma Turning Post
let _ppOkumaTurning: any;

// PP-WEDM: Wire EDM Post
let _ppWireEDM: any;

// PP-SEDM: Sinker EDM Post
let _ppSinkerEDM: any;

// PP-SSP: Okuma Sub-Spindle Sync Post
let _ppOkumaSubSpindle: any;

// PP-LINT: G-code syntactic linter
let _ppGCodeLint: any;

// PP-CHUNK: Program chunker for DNC drip-feed
let _ppProgramChunker: any;

// PP-MERGE: Program merger (inverse of chunker)
let _ppProgramMerger: any;

// PP-STATS: Descriptive G-code statistics
let _ppGCodeStatistics: any;

// PP-SCALE: Feed/speed scaler for G-code
let _ppFeedSpeedScaler: any;

// PP-COMPAT: Controller compatibility checker for G-code
let _ppControllerCompat: any;

// PP-MODAL: Modal state tracker for G-code programs
let _ppModalTracker: any;

// PP-ARC: Arc validator for G-code (G2/G3 geometry sanity)
let _ppArcValidator: any;

// PP-TC: Tool change safety validator
let _ppToolChangeValidator: any;

// PP-MIN: G-code minimizer (strip redundant tokens)
let _ppGCodeMinimizer: any;

// PP-WO: Work offset (G54-G59) usage validator
let _ppWorkOffsetValidator: any;

// PP-SS: Spindle speed safety validator (ramps, flips, dwell)
let _ppSpindleSpeedSafety: any;

// PP-CO: Coolant sequence (M7/M8/M9) validator
let _ppCoolantSequence: any;

// PP-CC: Canned cycle (G81-G89) validator
let _ppCannedCycle: any;

// PP-CD: Cutter compensation (G40/G41/G42) validator
let _ppCutterComp: any;

// PP-LN: Line number sanity (N-word + framing) validator
let _ppLineNumberSanity: any;

// PP-UM: Units mode (G20/G21) validator
let _ppUnitsMode: any;

// PP-FO: Feed override (F-word sequencing) validator
let _ppFeedOverride: any;

// PP-CG: Call graph (M98/M99/O-number) validator
let _ppCallGraph: any;

// PP-DW: G4 dwell command validator
let _ppDwell: any;

// PP-RM: Rapid-move (G0) validator
let _ppRapidMove: any;

// PP-MV: Macro variable (#n) validator
let _ppMacroVariable: any;

// PP-AT: Axis travel (envelope) validator
let _ppAxisTravel: any;

// PP-DP: Decimal-point validator
let _ppDecimalPoint: any;

// PP-BS: Block-skip and stop-code validator
let _ppBlockSkip: any;

// PP-SS: Spindle state validator
let _ppSpindleState: any;

// PP-TLC: Tool length compensation validator
let _ppToolLengthComp: any;

// PP-TC: Thread cycle validator (lathe)
let _ppThreadCycle: any;

// PP-CST: Coordinate system transform validator (G68/G51/mirror)
let _ppCoordTransform: any;

// PP-PC: Probe cycle validator (Renishaw G65 P981x)
let _ppProbeCycle: any;

// PP-HSM: High-speed machining / lookahead validator (G05.1 Q1)
let _ppHSM: any;

// PP-PSEL: Plane selection validator (G17/G18/G19)
let _ppPlaneSelect: any;

// PP-RP: Reference return validator (G28/G30/G53)
let _ppRefReturn: any;

// PP-FM: Feed-mode validator (G93/G94/G95)
let _ppFeedMode: any;

// PP-SM: Speed-mode validator (G96/G97)
let _ppSpeedMode: any;

// PP-AGI-REPORT: Markdown Report Generator
let _ppReportGenerator: any;

// PP-AGI-MS4: Physics Condition Encoder
let _ppPhysicsEncoder: any;

// PP-AGI-MS5: Safety Envelope Vector
let _ppSafetyEnvelope: any;

// PP-AGI-MS6: Toolpath Strategy Encoder
let _ppToolpathEncoder: any;

// PP-AGI-MS7: Multi-Modal Fusion
let _ppFusion: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "pp":
      return _ppEngine ??= (await import("../../engines/PostProcessorEngine.js")).postProcessorEngine;
    case "pipeline":
      return _ppPipeline ??= (await import("../../engines/PostProcessorPipelineEngine.js")).postProcessorPipelineEngine;
    case "analyzer":
      if (!_ppAnalyzer) {
        const mod = await import("../../engines/PostProcessorAnalyzerEngine.js");
        _ppAnalyzer = new mod.PostProcessorAnalyzerEngine();
      }
      return _ppAnalyzer;
    case "neural":
      return _ppNeural ??= (await import("../../engines/PostProcessorNeuralNetworkEngine.js")).postProcessorNeuralNetworkEngine;
    case "physics":
      return _ppPhysics ??= (await import("../../engines/PostProcessorPhysicsAwareGeneratorEngine.js")).postProcessorPhysicsAwareGeneratorEngine;
    case "tribal":
      return _ppTribal ??= (await import("../../engines/PostProcessorTribalKnowledgeIntegrationEngine.js")).postProcessorTribalKnowledgeIntegrationEngine;
    case "kinematics":
      return _ppKinematics ??= (await import("../../engines/PostProcessorMachineKinematicsEngine.js")).postProcessorMachineKinematicsEngine;
    case "verification":
      return _ppVerification ??= (await import("../../engines/PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
    case "deepReasoning":
      return _ppDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
    case "ppKnowledgeGraph":
      return _ppKnowledgeGraph ??= (await import("../../engines/PostProcessorKnowledgeGraphEngine.js")).postProcessorKnowledgeGraphEngine;
    case "cognition":
      return _ppCognition ??= (await import("../../engines/PostProcessorCognitiveEngine.js")).postProcessorCognitiveEngine;
    case "transformer":
      return _ppTransformer ??= (await import("../../engines/PostProcessorTransformerEngine.js")).postProcessorTransformerEngine;
    case "metaLearning":
      return _ppMetaLearning ??= (await import("../../engines/PostProcessorMetaLearningEngine.js")).postProcessorMetaLearningEngine;
    case "feedOptimizer":
      return _ppFeedOptimizer ??= (await import("../../engines/PostProcessorFeedOptimizerEngine.js")).postProcessorFeedOptimizerEngine;
    case "generator":
      return _ppGenerator ??= (await import("../../engines/PostProcessorGeneratorEngine.js")).postProcessorGeneratorEngine;
    case "api":
      return _ppAPI ??= (await import("../../engines/PostProcessorAPIEngine.js")).postProcessorAPIEngine;

    // Dormant Giants (PP-WIRE-MS1)
    case "featureStrategy":
      return _featureStrategy ??= (await import("../../engines/FeatureStrategyKnowledgeBaseEngine.js")).featureStrategyKnowledgeBaseEngine;
    case "troubleshoot":
      return _troubleshoot ??= (await import("../../engines/TroubleshootingAssistantEngine.js")).troubleshootingAssistantEngine;
    case "crossFormula":
      return _crossFormula ??= (await import("../../engines/CrossDisciplinaryFormulaIntegrationEngine.js")).crossDisciplinaryFormulaIntegrationEngine;
    case "crossDeepLearning":
      return _crossDeepLearning ??= (await import("../../engines/CrossDisciplinaryDeepLearningEngine.js")).crossDisciplinaryEngine;
    case "mfgKnowledgeGraph":
      return _mfgKnowledgeGraph ??= (await import("../../engines/ManufacturingKnowledgeGraphEngine.js")).manufacturingKnowledgeGraphEngine;
    case "knowledgeGraph":
      return _knowledgeGraph ??= (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraphEngine;

    // Tribal Knowledge Activation (PP-TRIBAL-ACTIVATION)
    case "tribalActivation":
      return _tribalActivation ??= (await import("../../engines/TribalKnowledgeActivationEngine.js")).tribalKnowledgeActivationEngine;

    // Asset Wiring Engines (PP-WIRE-MS5-7)
    case "algorithmWiring":
      return _algorithmWiring ??= (await import("../../engines/AlgorithmWiringEngine.js")).algorithmWiringEngine;
    case "reasoningWiring":
      return _reasoningWiring ??= (await import("../../engines/ReasoningWiringEngine.js")).reasoningWiringEngine;
    case "assetWiringSummary":
      return _assetWiringSummary ??= (await import("../../engines/AssetWiringSummaryEngine.js")).assetWiringSummaryEngine;

    // PP-AGI-MS0: Controller Embeddings & Transfer
    case "controllerEmbedding":
      return _ppControllerEmbedding ??= (await import("../../engines/PPControllerEmbeddingEngine.js")).ppControllerEmbeddingEngine;
    case "dialectTransfer":
      return _ppDialectTransfer ??= (await import("../../engines/PPDialectTransferEngine.js")).ppDialectTransferEngine;

    // PP-AGI-MS1: Machine Vector Encoder
    case "machineVectorEncoder":
      return _ppMachineVectorEncoder ??= (await import("../../engines/PPMachineVectorEncoderEngine.js")).ppMachineVectorEncoderEngine;

    // PP-AGI-MS3: Material Property Vector
    case "materialVector":
      return _ppMaterialVector ??= (await import("../../engines/PPMaterialPropertyVectorEngine.js")).ppMaterialPropertyVectorEngine;

    // PP-AGI-MS2: Cutting Tool Encoder
    case "toolEncoder":
      return _ppToolEncoder ??= (await import("../../engines/PPCuttingToolEncoderEngine.js")).ppCuttingToolEncoderEngine;
    case "trainingPipeline":
      return _ppTrainingPipeline ??= (await import("../../engines/PPTrainingDataPipelineEngine.js")).ppTrainingDataPipelineEngine;
    case "activeLearning":
      return _ppActiveLearning ??= (await import("../../engines/PPActiveLearningQueueEngine.js")).ppActiveLearningQueueEngine;
    case "onlineLearning":
      return _ppOnlineLearning ??= (await import("../../engines/PPOnlineLearningTrackerEngine.js")).ppOnlineLearningTrackerEngine;
    case "ensembleUncertainty":
      return _ppEnsembleUncertainty ??= (await import("../../engines/PPEnsembleUncertaintyEngine.js")).ppEnsembleUncertaintyEngine;
    case "decisionExplainer":
      return _ppDecisionExplainer ??= (await import("../../engines/PPDecisionExplainerEngine.js")).ppDecisionExplainerEngine;
    case "jobAdvisor":
      return _ppJobAdvisor ??= (await import("../../engines/PPJobScenarioAdvisorEngine.js")).ppJobScenarioAdvisorEngine;
    case "templateLibrary":
      return _ppTemplateLibrary ??= (await import("../../engines/PPScenarioTemplateLibraryEngine.js")).ppScenarioTemplateLibraryEngine;
    case "programAnalyzer":
      return _ppProgramAnalyzer ??= (await import("../../engines/PPGCodeProgramAnalyzerEngine.js")).ppGCodeProgramAnalyzerEngine;
    case "agiDashboard":
      return _ppAGIDashboard ??= (await import("../../engines/PPAGISystemDashboardEngine.js")).ppAGISystemDashboardEngine;
    case "knowledgeIndex":
      return _ppKnowledgeIndex ??= (await import("../../engines/PPKnowledgeIndexEngine.js")).ppKnowledgeIndexEngine;
    case "benchmark":
      return _ppBenchmark ??= (await import("../../engines/PPAGIBenchmarkEngine.js")).ppAGIBenchmarkEngine;
    case "workflow":
      return _ppWorkflow ??= (await import("../../engines/PPAGIReasoningWorkflowEngine.js")).ppAGIReasoningWorkflowEngine;
    case "libraryAuditor":
      return _ppLibraryAuditor ??= (await import("../../engines/PPAGIProgramLibraryAuditorEngine.js")).ppAGIProgramLibraryAuditorEngine;
    case "controllerAdaptation":
      return _ppControllerAdaptation ??= (await import("../../engines/PPControllerAdaptationEngine.js")).ppControllerAdaptationEngine;
    case "greedyOptimizer":
      return _ppGreedyOptimizer ??= (await import("../../engines/PPGreedyToolpathOptimizerEngine.js")).ppGreedyToolpathOptimizerEngine;
    case "machinePost":
      return _ppMachinePost ??= (await import("../../engines/PPMachineSpecificPostEngine.js")).ppMachineSpecificPostEngine;
    case "e2eGenerator":
      return _ppE2EGenerator ??= (await import("../../engines/PPEndToEndPostGeneratorEngine.js")).ppEndToEndPostGeneratorEngine;
    case "capMatrix":
      return _ppCapMatrix ??= (await import("../../engines/PPAGICapabilityMatrixEngine.js")).ppAGICapabilityMatrixEngine;
    case "okumaTurning":
      return _ppOkumaTurning ??= (await import("../../engines/PPOkumaTurningPostEngine.js")).ppOkumaTurningPostEngine;
    case "wireEDM":
      return _ppWireEDM ??= (await import("../../engines/PPWireEDMPostEngine.js")).ppWireEDMPostEngine;
    case "sinkerEDM":
      return _ppSinkerEDM ??= (await import("../../engines/PPSinkerEDMPostEngine.js")).ppSinkerEDMPostEngine;
    case "okumaSubSpindle":
      return _ppOkumaSubSpindle ??= (await import("../../engines/PPOkumaSubSpindleSyncEngine.js")).ppOkumaSubSpindleSyncEngine;
    case "gcodeLint":
      return _ppGCodeLint ??= (await import("../../engines/PPGCodeLintEngine.js")).ppGCodeLintEngine;
    case "programChunker":
      return _ppProgramChunker ??= (await import("../../engines/PPProgramChunkerEngine.js")).ppProgramChunkerEngine;
    case "programMerger":
      return _ppProgramMerger ??= (await import("../../engines/PPProgramMergerEngine.js")).ppProgramMergerEngine;
    case "gcodeStatistics":
      return _ppGCodeStatistics ??= (await import("../../engines/PPGCodeStatisticsEngine.js")).ppGCodeStatisticsEngine;
    case "feedSpeedScaler":
      return _ppFeedSpeedScaler ??= (await import("../../engines/PPFeedSpeedScalerEngine.js")).ppFeedSpeedScalerEngine;
    case "controllerCompat":
      return _ppControllerCompat ??= (await import("../../engines/PPControllerCompatibilityEngine.js")).ppControllerCompatibilityEngine;
    case "modalTracker":
      return _ppModalTracker ??= (await import("../../engines/PPModalStateTrackerEngine.js")).ppModalStateTrackerEngine;
    case "arcValidator":
      return _ppArcValidator ??= (await import("../../engines/PPArcValidatorEngine.js")).ppArcValidatorEngine;
    case "toolChangeValidator":
      return _ppToolChangeValidator ??= (await import("../../engines/PPToolChangeValidatorEngine.js")).ppToolChangeValidatorEngine;
    case "gcodeMinimizer":
      return _ppGCodeMinimizer ??= (await import("../../engines/PPGCodeMinimizerEngine.js")).ppGCodeMinimizerEngine;
    case "workOffsetValidator":
      return _ppWorkOffsetValidator ??= (await import("../../engines/PPWorkOffsetValidatorEngine.js")).ppWorkOffsetValidatorEngine;
    case "spindleSpeedSafety":
      return _ppSpindleSpeedSafety ??= (await import("../../engines/PPSpindleSpeedSafetyEngine.js")).ppSpindleSpeedSafetyEngine;
    case "coolantSequence":
      return _ppCoolantSequence ??= (await import("../../engines/PPCoolantSequenceValidatorEngine.js")).ppCoolantSequenceValidatorEngine;
    case "cannedCycle":
      return _ppCannedCycle ??= (await import("../../engines/PPCannedCycleValidatorEngine.js")).ppCannedCycleValidatorEngine;
    case "cutterComp":
      return _ppCutterComp ??= (await import("../../engines/PPCutterCompValidatorEngine.js")).ppCutterCompValidatorEngine;
    case "lineNumberSanity":
      return _ppLineNumberSanity ??= (await import("../../engines/PPLineNumberSanityEngine.js")).ppLineNumberSanityEngine;
    case "unitsMode":
      return _ppUnitsMode ??= (await import("../../engines/PPUnitsModeValidatorEngine.js")).ppUnitsModeValidatorEngine;
    case "feedOverride":
      return _ppFeedOverride ??= (await import("../../engines/PPFeedOverrideValidatorEngine.js")).ppFeedOverrideValidatorEngine;
    case "callGraph":
      return _ppCallGraph ??= (await import("../../engines/PPCallGraphValidatorEngine.js")).ppCallGraphValidatorEngine;
    case "dwell":
      return _ppDwell ??= (await import("../../engines/PPDwellValidatorEngine.js")).ppDwellValidatorEngine;
    case "rapidMove":
      return _ppRapidMove ??= (await import("../../engines/PPRapidMoveValidatorEngine.js")).ppRapidMoveValidatorEngine;
    case "macroVariable":
      return _ppMacroVariable ??= (await import("../../engines/PPMacroVariableValidatorEngine.js")).ppMacroVariableValidatorEngine;
    case "axisTravel":
      return _ppAxisTravel ??= (await import("../../engines/PPAxisTravelValidatorEngine.js")).ppAxisTravelValidatorEngine;
    case "decimalPoint":
      return _ppDecimalPoint ??= (await import("../../engines/PPDecimalPointValidatorEngine.js")).ppDecimalPointValidatorEngine;
    case "blockSkip":
      return _ppBlockSkip ??= (await import("../../engines/PPBlockSkipValidatorEngine.js")).ppBlockSkipValidatorEngine;
    case "spindleState":
      return _ppSpindleState ??= (await import("../../engines/PPSpindleStateValidatorEngine.js")).ppSpindleStateValidatorEngine;
    case "toolLengthComp":
      return _ppToolLengthComp ??= (await import("../../engines/PPToolLengthCompValidatorEngine.js")).ppToolLengthCompValidatorEngine;
    case "threadCycle":
      return _ppThreadCycle ??= (await import("../../engines/PPThreadCycleValidatorEngine.js")).ppThreadCycleValidatorEngine;
    case "coordTransform":
      return _ppCoordTransform ??= (await import("../../engines/PPCoordSystemTransformValidatorEngine.js")).ppCoordSystemTransformValidatorEngine;
    case "probeCycle":
      return _ppProbeCycle ??= (await import("../../engines/PPProbeCycleValidatorEngine.js")).ppProbeCycleValidatorEngine;
    case "highSpeedMachining":
      return _ppHSM ??= (await import("../../engines/PPHighSpeedMachiningValidatorEngine.js")).ppHighSpeedMachiningValidatorEngine;
    case "planeSelect":
      return _ppPlaneSelect ??= (await import("../../engines/PPPlaneSelectValidatorEngine.js")).ppPlaneSelectValidatorEngine;
    case "referenceReturn":
      return _ppRefReturn ??= (await import("../../engines/PPReferenceReturnValidatorEngine.js")).ppReferenceReturnValidatorEngine;
    case "feedMode":
      return _ppFeedMode ??= (await import("../../engines/PPFeedModeValidatorEngine.js")).ppFeedModeValidatorEngine;
    case "speedMode":
      return _ppSpeedMode ??= (await import("../../engines/PPSpeedModeValidatorEngine.js")).ppSpeedModeValidatorEngine;
    case "physicsValidator":
      return _ppPhysicsValidator ??= (await import("../../engines/PPPhysicsConstraintValidatorEngine.js")).ppPhysicsConstraintValidatorEngine;
    case "safetyRuleValidator":
      return _ppSafetyRuleValidator ??= (await import("../../engines/PPSafetyRuleValidatorEngine.js")).ppSafetyRuleValidatorEngine;
    case "reportGenerator":
      return _ppReportGenerator ??= (await import("../../engines/PPAGIReportGeneratorEngine.js")).ppAGIReportGeneratorEngine;
    case "physicsEncoder":
      return _ppPhysicsEncoder ??= (await import("../../engines/PPPhysicsConditionEncoderEngine.js")).ppPhysicsConditionEncoderEngine;
    case "safetyEnvelope":
      return _ppSafetyEnvelope ??= (await import("../../engines/PPSafetyEnvelopeVectorEngine.js")).ppSafetyEnvelopeVectorEngine;
    case "toolpathEncoder":
      return _ppToolpathEncoder ??= (await import("../../engines/PPToolpathStrategyEncoderEngine.js")).ppToolpathStrategyEncoderEngine;

    // PP-AGI-MS7: Multi-Modal Fusion
    case "multiModalFusion":
      return _ppFusion ??= (await import("../../engines/PPMultiModalFusionEngine.js")).ppMultiModalFusionEngine;

    default:
      throw new Error(`Unknown PP engine: ${name}`);
  }
}

// ============================================================================
// ACTIONS (80 actions across 15 categories)
// ============================================================================

const ACTIONS = [
  // ===== PP_GENERATE: G-code generation (6 actions) =====
  "pp_generate_gcode",           // Generate G-code from toolpath
  "pp_generate_header",          // Generate program header
  "pp_generate_safe_start",      // Generate safe start block
  "pp_generate_tool_change",     // Generate tool change sequence
  "pp_generate_canned_cycle",    // Generate canned cycles (drilling, tapping, etc.)
  "pp_generate_subroutine",      // Generate subroutine calls

  // ===== PP_ANALYZE: Analysis (6 actions) =====
  "pp_analyze_cps",              // Analyze .cps post processor file
  "pp_analyze_gcode",            // Analyze G-code structure
  "pp_analyze_safety",           // Analyze safety compliance
  "pp_analyze_optimization",     // Analyze optimization opportunities
  "pp_analyze_controller_fit",   // Analyze controller compatibility
  "pp_analyze_complexity",       // Analyze program complexity

  // ===== PP_OPTIMIZE: Optimization (6 actions) =====
  "pp_optimize_feed",            // Optimize feed rates
  "pp_optimize_motion",          // Optimize motion paths
  "pp_optimize_cycle_time",      // Optimize for cycle time
  "pp_optimize_tool_life",       // Optimize for tool life
  "pp_optimize_surface_finish",  // Optimize for surface finish
  "pp_optimize_energy",          // Optimize for energy efficiency

  // ===== PP_VALIDATE: Safety validation (6 actions) =====
  "pp_validate_program",         // Validate complete program
  "pp_validate_limits",          // Validate machine limits
  "pp_validate_collisions",      // Validate collision-free
  "pp_validate_forces",          // Validate cutting forces safe
  "pp_validate_thermal",         // Validate thermal safety
  "pp_validate_syntax",          // Validate G-code syntax

  // ===== PP_PHYSICS: Physics-aware (6 actions) =====
  "pp_physics_forces",           // Calculate cutting forces
  "pp_physics_thermal",          // Calculate thermal effects
  "pp_physics_deflection",       // Calculate tool deflection
  "pp_physics_stability",        // Calculate chatter stability
  "pp_physics_surface",          // Calculate surface finish
  "pp_physics_wear",             // Calculate tool wear

  // ===== PP_NEURAL: Neural network (5 actions) =====
  "pp_neural_predict",           // Neural prediction of outcomes
  "pp_neural_classify",          // Classify controller/operation
  "pp_neural_optimize",          // Neural-guided optimization
  "pp_neural_anomaly",           // Detect anomalies in G-code
  "pp_neural_learn",             // Learn from new patterns

  // ===== PP_TRIBAL: Tribal knowledge (5 actions) =====
  "pp_tribal_query",             // Query tribal knowledge
  "pp_tribal_apply",             // Apply tribal tips to program
  "pp_tribal_suggest",           // Suggest relevant tips
  "pp_tribal_validate",          // Validate against tribal rules
  "pp_tribal_contribute",        // Contribute new tribal knowledge

  // ===== PP_TRIBAL_ACTIVE: Activated tribal knowledge (5 actions) — PP-TRIBAL-ACTIVATION =====
  "pp_tribal_active_context",    // Activate tips for decision context
  "pp_tribal_active_operation",  // Get tips for specific operation
  "pp_tribal_active_material",   // Get material-specific tips
  "pp_tribal_active_controller", // Get controller quirk tips
  "pp_tribal_active_integrate",  // Integrate tips into PP decision

  // ===== PP_CONTROLLER: Controller-specific (5 actions) =====
  "pp_controller_capabilities",  // Get controller capabilities
  "pp_controller_translate",     // Translate between controllers
  "pp_controller_optimize",      // Controller-specific optimization
  "pp_controller_validate",      // Controller-specific validation
  "pp_controller_recommend",     // Recommend controller settings

  // ===== PP_KINEMATICS: Machine kinematics (5 actions) =====
  "pp_kinematics_analyze",       // Analyze machine kinematics
  "pp_kinematics_transform",     // Transform coordinates (RTCP/TCPM)
  "pp_kinematics_limits",        // Check kinematic limits
  "pp_kinematics_singularity",   // Detect singularities
  "pp_kinematics_optimize",      // Optimize for kinematics

  // ===== PP_STRATEGY: Feature strategy knowledge (PP-WIRE-MS1) (5 actions) =====
  "pp_strategy_query",           // Query optimal strategy for feature+material+machine
  "pp_strategy_best",            // Get single best strategy recommendation
  "pp_strategy_list",            // List all rules for a feature type
  "pp_strategy_add",             // Add custom strategy rule
  "pp_strategy_stats",           // Get strategy KB statistics

  // ===== PP_TROUBLESHOOT: Root cause diagnosis (PP-WIRE-MS1) (4 actions) =====
  "pp_troubleshoot_start",       // Start interactive diagnosis session
  "pp_troubleshoot_answer",      // Answer diagnostic question
  "pp_troubleshoot_quick",       // Quick diagnosis from symptoms
  "pp_troubleshoot_common",      // Get common problems for domain

  // ===== PP_CROSS_FORMULA: 15-domain formulas (PP-WIRE-MS1) (5 actions) =====
  "pp_formula_apply",            // Apply cross-disciplinary formula
  "pp_formula_find",             // Find relevant formulas for problem
  "pp_formula_explain",          // Get formula explanation
  "pp_formula_list",             // List formulas by domain
  "pp_formula_stats",            // Get formula registry statistics

  // ===== PP_CROSS_LEARNING: MIT courses + algorithms (PP-WIRE-MS1) (6 actions) =====
  "pp_learning_reason",          // Deep cross-domain reasoning
  "pp_learning_execute_formula", // Execute specific formula
  "pp_learning_execute_algo",    // Execute specific algorithm
  "pp_learning_search",          // Search formulas and algorithms
  "pp_learning_patterns",        // Get learning patterns
  "pp_learning_summary",         // Get cross-disciplinary summary

  // ===== PP_MFG_GRAPH: Manufacturing knowledge graph (PP-WIRE-MS1) (5 actions) =====
  "pp_graph_query",              // Natural language graph query
  "pp_graph_recommend",          // Get recommendations from graph
  "pp_graph_gaps",               // Detect knowledge gaps
  "pp_graph_tribal",             // Graph-based tribal traversal
  "pp_graph_link",               // Link tribal tip to graph node

  // ===== PP_EMBEDDING: Controller embeddings & transfer (6 actions) — PP-AGI-MS0 =====
  "pp_embedding_embed",            // Embed a controller to 48-dim vector
  "pp_embedding_embed_all",        // Embed all 27 known controllers
  "pp_embedding_compare",          // Compare two controllers (similarity + divergence)
  "pp_embedding_nearest",          // Find k-nearest controllers
  "pp_embedding_cluster",          // Cluster all controllers by behavior
  "pp_embedding_transfer",         // Transfer G-code patterns to unknown controller

  // ===== PP_MACHINE_VECTOR: Machine kinematic embeddings (4 actions) — PP-AGI-MS1 =====
  "pp_machine_embed",              // Embed a machine to 40-dim vector
  "pp_machine_embed_all",          // Embed all representative machines
  "pp_machine_compare",            // Compare two machines (similarity + gaps)
  "pp_machine_nearest",            // Find k-nearest machines

  // ===== PP_MATERIAL_VECTOR: Material property embeddings (4 actions) — PP-AGI-MS3 =====
  "pp_material_embed",             // Embed a material to 32-dim vector
  "pp_material_embed_all",         // Embed all materials in database
  "pp_material_compare",           // Compare two materials (substitution safety)
  "pp_material_nearest",           // Find k-nearest materials

  // ===== PP_TOOL_VECTOR: Cutting tool embeddings (3 actions) — PP-AGI-MS2 =====
  "pp_tool_embed",                 // Embed a tool spec to 36-dim vector
  "pp_tool_compare",               // Compare two tool specs
  "pp_tool_nearest",               // Find nearest tools from reference library

  // ===== PP_TRAINING: Training data pipeline (3 actions) — PP-DL-MS0 =====
  "pp_training_process",           // Process a G-code program into training record
  "pp_training_batch",             // Process multiple programs
  "pp_training_stats",             // Get pipeline statistics

  // ===== PP_ACTIVE_LEARNING: Review queue (6 actions) — PP-DL-MS6 =====
  "pp_active_evaluate",            // Evaluate scenario and queue if uncertain
  "pp_active_next",                // Get next scenario for expert review
  "pp_active_label",               // Record expert label for a scenario
  "pp_active_reject",              // Reject queued scenario
  "pp_active_stats",               // Queue statistics
  "pp_active_labeled",             // Get all labeled scenarios

  // ===== PP_ONLINE_LEARNING: Production feedback tracker (5 actions) — PP-DL-MS7 =====
  "pp_online_record",              // Record a prediction
  "pp_online_outcome",             // Record actual outcome (feedback)
  "pp_online_metrics",             // Get domain metrics
  "pp_online_stats",               // Full stats with drift alerts
  "pp_online_export",              // Export labeled data for retraining

  // ===== PP_UNCERTAINTY: Ensemble uncertainty (3 actions) — PP-DL-MS8 =====
  "pp_uncertainty_estimate",       // Estimate scenario uncertainty with risk analysis
  "pp_uncertainty_monte_carlo",    // Monte Carlo dropout for prediction variance
  "pp_uncertainty_calibrate",      // Calibrate raw similarity to probability

  // ===== PP_EXPLAIN: Decision explainer (3 actions) — PP-DL-MS9 =====
  "pp_explain_scenario",           // Full explanation with factors, counterfactuals, analogies
  "pp_explain_controller_choice",  // Why chose one controller over another
  "pp_explain_material_sub",       // Explain material substitution safety

  // ===== PP_ADVISOR: Unified job advisor (2 actions) — PP-AGI-ADVISOR =====
  "pp_advisor_advise",             // Get comprehensive job advice using all PP-AGI engines
  "pp_advisor_outcome",            // Record actual job outcome for feedback loop

  // ===== PP_TEMPLATES: Scenario template library (6 actions) — PP-AGI-TEMPLATES =====
  "pp_templates_search",           // Full-text search across templates
  "pp_templates_find_similar",     // Find templates similar to a scenario
  "pp_templates_by_industry",      // Filter by industry
  "pp_templates_by_tag",           // Filter by tag
  "pp_templates_top_proven",       // Get top proven templates by success rate
  "pp_templates_stats",            // Library statistics

  // ===== PP_ANALYZER: G-code program analyzer (3 actions) — PP-AGI-ANALYZER =====
  "pp_analyzer_analyze",           // Full analysis of a G-code program
  "pp_analyzer_batch",             // Batch analyze multiple programs
  "pp_analyzer_compare",           // Compare two programs and list differences

  // ===== PP_DASHBOARD: System metrics (3 actions) — PP-AGI-DASHBOARD =====
  "pp_dashboard_full",             // Full PP-AGI system dashboard
  "pp_dashboard_health",           // Per-engine health check
  "pp_dashboard_summary",          // Concise text summary

  // ===== PP_KNOWLEDGE: Unified knowledge index (5 actions) — PP-AGI-KNOWLEDGE =====
  "pp_knowledge_search",           // Keyword search across all domains
  "pp_knowledge_search_domain",    // Restricted to one domain
  "pp_knowledge_cross_domain",     // Cross-domain search
  "pp_knowledge_coverage",         // Coverage report for a domain
  "pp_knowledge_full_coverage",    // Coverage across all domains

  // ===== PP_BENCHMARK: Quality benchmarks (3 actions) — PP-AGI-BENCHMARK =====
  "pp_benchmark_run_all",          // Run all benchmark cases
  "pp_benchmark_category",         // Run benchmarks for a category
  "pp_benchmark_quick",            // Quick CI-style smoke test

  // ===== PP_WORKFLOW: Multi-step reasoning (2 actions) — PP-AGI-WORKFLOW =====
  "pp_workflow_run",               // Run a named workflow with typed input
  "pp_workflow_list",              // List all available workflow types

  // ===== PP_AUDITOR: Program library auditor (3 actions) — PP-AGI-AUDITOR =====
  "pp_auditor_audit",              // Full audit of a program library
  "pp_auditor_quick_scan",         // Fast partial audit (no clustering/outliers)
  "pp_auditor_find_similar",       // Find programs similar to a reference

  // ===== PP_WEDM: Wire EDM post (2 actions) — PP-WEDM =====
  "pp_wedm_generate",             // Generate wire EDM program
  "pp_wedm_standard_4pass",       // Standard 4-pass strategy (rough + 3 skim)

  // ===== PP_SEDM: Sinker EDM post (3 actions) — PP-SEDM =====
  "pp_sedm_generate",             // Generate sinker EDM program
  "pp_sedm_standard_3stage",      // Standard 3-stage burn (rough + semi + finish)
  "pp_sedm_defaults",             // Get stage defaults / orbit codes

  // ===== PP_SSP: Okuma sub-spindle sync post (3 actions) — PP-SSP =====
  "pp_ssp_generate",              // Generate twin-spindle program
  "pp_ssp_simple_transfer",       // Simple main→sub transfer program
  "pp_ssp_list_operations",       // List supported operation types

  // ===== PP_LINT: G-code syntactic/modal linter (4 actions) — PP-LINT =====
  "pp_lint_check",                // Full lint report with issues + summary
  "pp_lint_quick_check",          // Fast pass/fail + critical count
  "pp_lint_report",               // Human-readable report string
  "pp_lint_list_rules",           // List all detected rule IDs

  // ===== PP_CHUNK: Program chunker for DNC drip-feed (3 actions) — PP-CHUNK =====
  "pp_chunk_program",             // Split G-code program into chunks with modal restore
  "pp_chunk_list_strategies",     // List available chunking strategies
  "pp_chunk_defaults",            // Get default options for a given strategy

  // ===== PP_MERGE: Program merger — inverse of chunker (3 actions) — PP-MERGE =====
  "pp_merge_chunks",              // Reassemble chunks into a single program
  "pp_merge_validate",            // Validate a merged program is structurally sound
  "pp_merge_defaults",            // Default merge options

  // ===== PP_STATS: Descriptive G-code statistics (2 actions) — PP-STATS =====
  "pp_stats_analyze",             // Full descriptive statistics for a G-code program
  "pp_stats_similarity",          // Histogram cosine similarity between 2 programs

  // ===== PP_SCALE: Feed/speed scaler (5 actions) — PP-SCALE =====
  "pp_scale_apply",               // Apply full scaling options (feed, speed, clamp, range)
  "pp_scale_feed",                // Convenience: scale only feeds by factor
  "pp_scale_speed",               // Convenience: scale only spindle speeds by factor
  "pp_scale_clamp_feed",          // Convenience: clamp feeds to max_feed
  "pp_scale_defaults",            // Default scaler options

  // ===== PP_COMPAT: Controller compatibility checker (4 actions) — PP-COMPAT =====
  "pp_compat_check",               // Full compatibility check against target controller
  "pp_compat_quick",               // Quick pass/fail compatibility result
  "pp_compat_rank",                // Rank multiple controllers by compatibility
  "pp_compat_list_controllers",    // List all supported controller targets

  // ===== PP_MODAL: Modal state tracker (4 actions) — PP-MODAL =====
  "pp_modal_track",                // Full per-line modal state timeline
  "pp_modal_state_at_line",        // Modal state at a specific line
  "pp_modal_transitions",          // All transitions in a specific modal group
  "pp_modal_active",               // Active value of a modal group at a line

  // ===== PP_ARC: Arc validator G2/G3 (3 actions) — PP-ARC =====
  "pp_arc_validate",               // Full arc validation with per-issue details
  "pp_arc_quick",                  // Quick pass/fail arc check
  "pp_arc_defaults",               // Default arc validator options

  // ===== PP_TC: Tool-change safety validator (3 actions) — PP-TC =====
  "pp_tc_validate",                // Full tool-change safety check
  "pp_tc_quick",                   // Quick pass/fail + tool-change count
  "pp_tc_defaults",                // Default TC validator options

  // ===== PP_MIN: G-code minimizer (4 actions) — PP-MIN =====
  "pp_min_apply",                  // Minimize with custom options
  "pp_min_aggressive",             // Aggressive minimize (strip comments + N-words)
  "pp_min_conservative",           // Conservative minimize (keep comments + N-words)
  "pp_min_defaults",               // Default minimizer options

  // ===== PP_WO: Work offset (G54-G59) usage validator (3 actions) — PP-WO =====
  "pp_wo_validate",                // Full work-offset usage validation
  "pp_wo_quick",                   // Quick pass/fail + distinct offsets used
  "pp_wo_defaults",                // Default work-offset validator options

  // ===== PP_SS: Spindle speed safety validator (3 actions) — PP-SS =====
  "pp_ss_validate",                // Full spindle safety validation
  "pp_ss_quick",                   // Quick pass/fail + peak RPM
  "pp_ss_defaults",                // Default spindle safety validator options

  // ===== PP_CO: Coolant sequence validator (3 actions) — PP-CO =====
  "pp_co_validate",                // Full coolant M7/M8/M9 sequence validation
  "pp_co_quick",                   // Quick pass/fail + final coolant state
  "pp_co_defaults",                // Default coolant sequence validator options

  // ===== PP_CC: Canned cycle (G81-G89) validator (3 actions) — PP-CC =====
  "pp_cc_validate",                // Full canned cycle validation
  "pp_cc_quick",                   // Quick pass/fail + distinct cycles seen
  "pp_cc_defaults",                // Default canned cycle validator options

  // ===== PP_CD: Cutter compensation (G40/G41/G42) validator (3 actions) — PP-CD =====
  "pp_cd_validate",                // Full cutter compensation validation
  "pp_cd_quick",                   // Quick pass/fail + final comp mode
  "pp_cd_defaults",                // Default cutter comp validator options

  // ===== PP_LN: Line number & framing validator (3 actions) — PP-LN =====
  "pp_ln_validate",                // Full N-word + framing validation
  "pp_ln_quick",                   // Quick pass/fail + program end check
  "pp_ln_defaults",                // Default line number validator options

  // ===== PP_UM: Units mode (G20/G21) validator (3 actions) — PP-UM =====
  "pp_um_validate",                // Full units mode validation
  "pp_um_quick",                   // Quick pass/fail + initial units
  "pp_um_defaults",                // Default units mode validator options

  // PP-FO: Feed override (F-word sequencing) validator
  "pp_fo_validate",                // Full feed-override validation
  "pp_fo_quick",                   // Quick pass/fail + first feed
  "pp_fo_defaults",                // Default feed override validator options

  // PP-CG: Call graph (M98/M99/O-number) validator
  "pp_cg_validate",                // Full call-graph validation
  "pp_cg_quick",                   // Quick pass/fail + program count
  "pp_cg_defaults",                // Default call graph validator options

  // PP-DW: G4 dwell command validator
  "pp_dw_validate",                // Full dwell validation
  "pp_dw_quick",                   // Quick pass/fail + dwell count
  "pp_dw_defaults",                // Default dwell validator options

  // PP-RM: Rapid-move (G0) validator
  "pp_rm_validate",                // Full rapid-move validation
  "pp_rm_quick",                   // Quick pass/fail + rapid count
  "pp_rm_defaults",                // Default rapid-move validator options

  // PP-MV: Macro variable (#n) validator
  "pp_mv_validate",                // Full macro variable validation
  "pp_mv_quick",                   // Quick pass/fail + var count
  "pp_mv_defaults",                // Default macro variable validator options

  // PP-AT: Axis travel (envelope) validator
  "pp_at_validate",                // Full axis travel validation
  "pp_at_quick",                   // Quick pass/fail + motion lines
  "pp_at_defaults",                // Default axis travel validator options

  // PP-DP: Decimal-point validator
  "pp_dp_validate",                // Full decimal-point validation
  "pp_dp_quick",                   // Quick pass/fail + dim missing
  "pp_dp_defaults",                // Default decimal-point validator options

  // PP-BS: Block-skip and stop-code validator
  "pp_bs_validate",                // Full block-skip/stop validation
  "pp_bs_quick",                   // Quick pass/fail + slash/stop counts
  "pp_bs_defaults",                // Default block-skip validator options

  // PP-SS: Spindle state validator
  "pp_ss_validate",                // Full spindle-state validation
  "pp_ss_quick",                   // Quick pass/fail + M3/M4/M5 counts
  "pp_ss_defaults",                // Default spindle-state validator options

  // PP-TLC: Tool length compensation validator
  "pp_tlc_validate",               // Full G43/G44/G49 validation
  "pp_tlc_quick",                  // Quick pass/fail + G43 count
  "pp_tlc_defaults",               // Default TLC validator options

  // PP-TC: Thread cycle validator (lathe G32/G33/G76/G92)
  "pp_tc_validate",                // Full threading cycle validation
  "pp_tc_quick",                   // Quick pass/fail + pass count
  "pp_tc_defaults",                // Default thread cycle validator options

  // PP-CST: Coordinate system transform validator (G68/G51/mirror)
  "pp_cst_validate",               // Full transform validation
  "pp_cst_quick",                  // Quick pass/fail + active-at-end flags
  "pp_cst_defaults",               // Default transform validator options

  // PP-PC: Probe cycle validator (Renishaw G65 P981x)
  "pp_pc_validate",                // Full probe cycle validation
  "pp_pc_quick",                   // Quick pass/fail + measurement count
  "pp_pc_defaults",                // Default probe validator options

  // PP-HSM: High-speed machining / lookahead validator (G05.1 Q1)
  "pp_hsm_validate",               // Full HSM/lookahead validation
  "pp_hsm_quick",                  // Quick pass/fail + surfacing block count
  "pp_hsm_defaults",               // Default HSM validator options

  // PP-PSEL: Plane selection validator (G17/G18/G19)
  "pp_psel_validate",              // Full plane-selection validation
  "pp_psel_quick",                 // Quick pass/fail + arc count + final plane
  "pp_psel_defaults",              // Default plane-select validator options

  // PP-RP: Reference return validator (G28/G30/G53)
  "pp_rp_validate",                // Full reference-return validation
  "pp_rp_quick",                   // Quick pass/fail + safe-Z pattern count
  "pp_rp_defaults",                // Default reference-return validator options

  // PP-FM: Feed-mode validator (G93/G94/G95)
  "pp_fm_validate",                // Full feed-mode validation
  "pp_fm_quick",                   // Quick pass/fail + final mode + cut-block count
  "pp_fm_defaults",                // Default feed-mode validator options

  // PP-SM: Speed-mode validator (G96/G97)
  "pp_sm_validate",                // Full spindle speed-mode validation
  "pp_sm_quick",                   // Quick pass/fail + final mode + max-RPM
  "pp_sm_defaults",                // Default speed-mode validator options

  // ===== PP_TURNING: Okuma turning post (2 actions) — PP-TURNING =====
  "pp_turning_generate",           // Generate complete Okuma turning program
  "pp_turning_simple_od_rough",    // Quick OD roughing program

  // ===== PP_CAPABILITY: Capability matrix (3 actions) — PP-CAP =====
  "pp_capability_matrix",          // Full capability matrix for all JM Die machines
  "pp_capability_assess",          // Assess a single machine
  "pp_capability_ranked",          // Machines ranked by readiness

  // ===== PP_E2E: End-to-end G-code generator (2 actions) — PP-E2E =====
  "pp_e2e_generate",               // Generate complete G-code program from job spec
  "pp_e2e_generate_simple",        // Quick single-operation program

  // ===== PP_MACHINE_POST: Machine-specific post configs (4 actions) — PP-MACH =====
  "pp_machine_post_generate",      // Generate post config for a JM Die machine
  "pp_machine_post_generate_all",  // Generate configs for all machines
  "pp_machine_post_list",          // List JM Die machine inventory
  "pp_machine_post_validate_job",  // Validate cutting conditions for a machine

  // ===== PP_ADAPT: Controller parameter adaptation (2 actions) — PP-DL-MS1 =====
  "pp_adapt_parameters",           // Adapt parameters for a specific controller
  "pp_adapt_list_profiles",        // List controllers with adaptation profiles

  // ===== PP_OPTIMIZE_GREEDY: Greedy toolpath optimizer (2 actions) — PP-DL-MS5 =====
  "pp_optimize_greedy",            // Full greedy optimization
  "pp_optimize_greedy_quick",      // Quick 10-iteration optimization

  // ===== PP_PHYSICS_VALIDATE: Physics constraint validator (2 actions) — PP-DL-MS3 =====
  "pp_physics_validate",           // Full physics validation of cutting conditions
  "pp_physics_is_safe",            // Quick pass/fail safety check

  // ===== PP_SAFETY_RULES: Safety rule validator (4 actions) — PP-DL-MS4 =====
  "pp_safety_rules_validate",      // Validate G-code against all safety rules
  "pp_safety_rules_is_safe",       // Quick pass/fail
  "pp_safety_rules_list",          // List all rules
  "pp_safety_rules_toggle",        // Enable/disable a rule

  // ===== PP_REPORT: Markdown report generator (6 actions) — PP-AGI-REPORT =====
  "pp_report_job_advice",          // Markdown report from JobAdvice
  "pp_report_program_analysis",    // Markdown report from ProgramAnalysisReport
  "pp_report_library_audit",       // Markdown report from LibraryAuditResult
  "pp_report_dashboard",           // Markdown report from SystemDashboard
  "pp_report_workflow",            // Markdown report from WorkflowResult
  "pp_report_executive",           // 1-paragraph executive summary

  // ===== PP_PHYSICS_VECTOR: Physics condition embeddings (2 actions) — PP-AGI-MS4 =====
  "pp_physics_embed",              // Embed cutting physics to 24-dim vector
  "pp_physics_compare",            // Compare two physics conditions

  // ===== PP_SAFETY_VECTOR: Safety envelope embeddings (2 actions) — PP-AGI-MS5 =====
  "pp_safety_envelope_embed",      // Embed safety envelope to 20-dim vector
  "pp_safety_envelope_compare",    // Compare two safety envelopes

  // ===== PP_TOOLPATH_VECTOR: Toolpath strategy embeddings (3 actions) — PP-AGI-MS6 =====
  "pp_toolpath_embed",             // Embed a toolpath strategy to 28-dim vector
  "pp_toolpath_compare",           // Compare two strategies
  "pp_toolpath_recommend",         // Recommend strategies from reference library

  // ===== PP_FUSION: Multi-modal fusion (3 actions) — PP-AGI-MS7 =====
  "pp_fusion_fuse",                // Fuse controller+machine+material to 120-dim
  "pp_fusion_search",              // Search similar known scenarios
  "pp_fusion_analyze_gaps",        // Analyze cross-modal gaps and mismatches

  // ===== PP_WIRING: Asset wiring (9 actions) — PP-WIRE-MS5-7 =====
  "pp_wiring_algorithms",        // List algorithms with wiring status
  "pp_wiring_algorithms_orphans", // List orphaned algorithms
  "pp_wiring_algorithms_consumers", // Get consumers for an algorithm
  "pp_wiring_reasoning",         // List reasoning engines with wiring status
  "pp_wiring_reasoning_orphans", // List orphaned reasoning engines
  "pp_wiring_reasoning_recommend", // Recommend reasoning engines for a task
  "pp_wiring_summary",           // Get unified wiring summary
  "pp_wiring_trends",            // Get utilization trends
  "pp_wiring_priority",          // Get prioritized orphan list
] as const;

// ============================================================================
// DISPATCHER REGISTRATION
// ============================================================================

/**
 * Registers the PostProcessor dispatcher with the MCP server.
 * @param server - MCP server instance
 */
export function registerPPDispatcher(server: any): void {
  server.tool(
    "prism_pp",
    `PostProcessor dispatcher — G-code generation, optimization, validation, physics-aware processing.
75 actions across 14 categories: generate, analyze, optimize, validate, physics, neural, tribal, controller, kinematics, strategy, troubleshoot, formula, learning, graph.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_pp] Action: ${action}`);
      let result: any;
      try {
        // Normalize snake_case -> camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, PP_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_pp"
          );
        }

        // PRE-CALCULATION HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "ppDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        // ===== PP_GENERATE actions =====
        switch (action) {
          case "pp_generate_gcode": {
            const engine = await getEngine("pp");
            result = engine.process?.(params) ?? engine.generate?.(params) ?? { error: "PostProcessorEngine method not found" };
            break;
          }
          case "pp_generate_header": {
            const engine = await getEngine("generator");
            result = engine.generateHeader?.(params) ?? { header: generateDefaultHeader(params) };
            break;
          }
          case "pp_generate_safe_start": {
            const engine = await getEngine("generator");
            result = engine.generateSafeStart?.(params) ?? { safeStart: generateDefaultSafeStart(params) };
            break;
          }
          case "pp_generate_tool_change": {
            const engine = await getEngine("generator");
            result = engine.generateToolChange?.(params) ?? { toolChange: generateDefaultToolChange(params) };
            break;
          }
          case "pp_generate_canned_cycle": {
            const engine = await getEngine("generator");
            result = engine.generateCannedCycle?.(params) ?? { cycle: generateDefaultCannedCycle(params) };
            break;
          }
          case "pp_generate_subroutine": {
            const engine = await getEngine("generator");
            result = engine.generateSubroutine?.(params) ?? { subroutine: generateDefaultSubroutine(params) };
            break;
          }

          // ===== PP_ANALYZE actions =====
          case "pp_analyze_cps": {
            const engine = await getEngine("analyzer");
            result = engine.analyzeFile?.(params.filePath) ?? engine.analyzeCpsContent?.(params.content) ?? { error: "analyzeFile method not found" };
            break;
          }
          case "pp_analyze_gcode": {
            const engine = await getEngine("pipeline");
            result = engine.analyzeGcode?.(params.gcode) ?? engine.parse?.(params.gcode) ?? analyzeGcodeBasic(params.gcode);
            break;
          }
          case "pp_analyze_safety": {
            const engine = await getEngine("verification");
            result = engine.analyzeSafety?.(params) ?? engine.validate?.(params) ?? { error: "analyzeSafety method not found" };
            break;
          }
          case "pp_analyze_optimization": {
            const engine = await getEngine("pipeline");
            result = engine.analyzeOptimizations?.(params.gcode) ?? { opportunities: [] };
            break;
          }
          case "pp_analyze_controller_fit": {
            const engine = await getEngine("neural");
            result = engine.classifyController?.(params) ?? engine.analyzeControllerFit?.(params) ?? { fit: "unknown" };
            break;
          }
          case "pp_analyze_complexity": {
            const engine = await getEngine("cognition");
            result = engine.analyzeComplexity?.(params) ?? analyzeComplexityBasic(params.gcode);
            break;
          }

          // ===== PP_OPTIMIZE actions =====
          case "pp_optimize_feed": {
            const engine = await getEngine("feedOptimizer");
            result = engine.optimize?.(params) ?? engine.optimizeFeed?.(params) ?? { error: "optimize method not found" };
            break;
          }
          case "pp_optimize_motion": {
            const engine = await getEngine("pipeline");
            result = engine.optimizeMotion?.(params) ?? await engine.process?.({ ...params, optimizationTarget: "motion" }) ?? { error: "optimizeMotion not found" };
            break;
          }
          case "pp_optimize_cycle_time": {
            const engine = await getEngine("pipeline");
            result = await engine.process?.({ ...params, optimizationTarget: "cycleTime" }) ?? { error: "process not found" };
            break;
          }
          case "pp_optimize_tool_life": {
            const engine = await getEngine("physics");
            result = engine.optimizeForToolLife?.(params) ?? await engine.generate?.({ ...params, objective: "tool_life" }) ?? { error: "optimizeForToolLife not found" };
            break;
          }
          case "pp_optimize_surface_finish": {
            const engine = await getEngine("physics");
            result = engine.optimizeForSurface?.(params) ?? await engine.generate?.({ ...params, objective: "surface_finish" }) ?? { error: "optimizeForSurface not found" };
            break;
          }
          case "pp_optimize_energy": {
            const engine = await getEngine("pipeline");
            result = await engine.process?.({ ...params, optimizationTarget: "energy" }) ?? { error: "process not found" };
            break;
          }

          // ===== PP_VALIDATE actions =====
          case "pp_validate_program": {
            const engine = await getEngine("verification");
            result = engine.validateProgram?.(params) ?? engine.verify?.(params) ?? { valid: true, warnings: [] };
            break;
          }
          case "pp_validate_limits": {
            const engine = await getEngine("kinematics");
            result = engine.validateLimits?.(params) ?? engine.checkLimits?.(params) ?? { withinLimits: true };
            break;
          }
          case "pp_validate_collisions": {
            const engine = await getEngine("verification");
            result = engine.validateCollisions?.(params) ?? { collisionFree: true };
            break;
          }
          case "pp_validate_forces": {
            const engine = await getEngine("physics");
            result = engine.validateForces?.(params) ?? { safe: true };
            break;
          }
          case "pp_validate_thermal": {
            const engine = await getEngine("physics");
            result = engine.validateThermal?.(params) ?? { safe: true };
            break;
          }
          case "pp_validate_syntax": {
            const engine = await getEngine("verification");
            result = engine.validateSyntax?.(params) ?? validateSyntaxBasic(params.gcode, params.controller);
            break;
          }

          // ===== PP_PHYSICS actions =====
          case "pp_physics_forces": {
            const engine = await getEngine("physics");
            result = engine.calculateForces?.(params) ?? engine.analyzeForces?.(params) ?? { error: "calculateForces not found" };
            break;
          }
          case "pp_physics_thermal": {
            const engine = await getEngine("physics");
            result = engine.calculateThermal?.(params) ?? engine.analyzeThermal?.(params) ?? { error: "calculateThermal not found" };
            break;
          }
          case "pp_physics_deflection": {
            const engine = await getEngine("physics");
            result = engine.calculateDeflection?.(params) ?? { error: "calculateDeflection not found" };
            break;
          }
          case "pp_physics_stability": {
            const engine = await getEngine("physics");
            result = engine.calculateStability?.(params) ?? engine.analyzeChatter?.(params) ?? { error: "calculateStability not found" };
            break;
          }
          case "pp_physics_surface": {
            const engine = await getEngine("physics");
            result = engine.calculateSurface?.(params) ?? engine.predictRa?.(params) ?? { error: "calculateSurface not found" };
            break;
          }
          case "pp_physics_wear": {
            const engine = await getEngine("physics");
            result = engine.calculateWear?.(params) ?? engine.predictToolLife?.(params) ?? { error: "calculateWear not found" };
            break;
          }

          // ===== PP_NEURAL actions =====
          case "pp_neural_predict": {
            const engine = await getEngine("neural");
            result = engine.predict?.(params) ?? engine.inference?.(params) ?? { error: "predict not found" };
            break;
          }
          case "pp_neural_classify": {
            const engine = await getEngine("neural");
            result = engine.classify?.(params) ?? engine.classifyController?.(params) ?? { error: "classify not found" };
            break;
          }
          case "pp_neural_optimize": {
            const engine = await getEngine("neural");
            result = engine.neuralOptimize?.(params) ?? engine.optimize?.(params) ?? { error: "neuralOptimize not found" };
            break;
          }
          case "pp_neural_anomaly": {
            const engine = await getEngine("neural");
            result = engine.detectAnomalies?.(params) ?? engine.anomalyDetection?.(params) ?? { anomalies: [] };
            break;
          }
          case "pp_neural_learn": {
            const engine = await getEngine("neural");
            result = engine.learn?.(params) ?? engine.train?.(params) ?? { learned: true };
            break;
          }

          // ===== PP_TRIBAL actions =====
          case "pp_tribal_query": {
            const engine = await getEngine("tribal");
            result = engine.query?.(params) ?? engine.searchTips?.(params) ?? { tips: [] };
            break;
          }
          case "pp_tribal_apply": {
            const engine = await getEngine("tribal");
            result = engine.applyTips?.(params) ?? engine.apply?.(params) ?? { applied: true };
            break;
          }
          case "pp_tribal_suggest": {
            const engine = await getEngine("tribal");
            result = engine.suggestTips?.(params) ?? engine.getRelevantTips?.(params) ?? { suggestions: [] };
            break;
          }
          case "pp_tribal_validate": {
            const engine = await getEngine("tribal");
            result = engine.validateAgainstTribal?.(params) ?? engine.validate?.(params) ?? { valid: true };
            break;
          }
          case "pp_tribal_contribute": {
            const engine = await getEngine("tribal");
            result = engine.contributeTip?.(params) ?? engine.addTip?.(params) ?? { contributed: true };
            break;
          }

          // ===== PP_TRIBAL_ACTIVE actions (PP-TRIBAL-ACTIVATION) =====
          case "pp_tribal_active_context": {
            const engine = await getEngine("tribalActivation");
            result = engine.activateTipsForContext(params.context ?? params);
            break;
          }
          case "pp_tribal_active_operation": {
            const engine = await getEngine("tribalActivation");
            result = engine.getTipsByOperation(params.operation, params.limit ?? 10);
            break;
          }
          case "pp_tribal_active_material": {
            const engine = await getEngine("tribalActivation");
            result = engine.getTipsByMaterial(params.material, params.limit ?? 10);
            break;
          }
          case "pp_tribal_active_controller": {
            const engine = await getEngine("tribalActivation");
            result = engine.getTipsByController(params.controller, params.limit ?? 10);
            break;
          }
          case "pp_tribal_active_integrate": {
            const engine = await getEngine("tribalActivation");
            result = engine.integrateWithPPDecision(params);
            break;
          }

          // ===== PP_CONTROLLER actions =====
          case "pp_controller_capabilities": {
            const engine = await getEngine("api");
            result = engine.getControllerCapabilities?.(params.controller) ?? engine.getCapabilities?.(params) ?? getDefaultCapabilities(params.controller);
            break;
          }
          case "pp_controller_translate": {
            const engine = await getEngine("transformer");
            result = engine.translate?.(params) ?? engine.transform?.(params) ?? { error: "translate not found" };
            break;
          }
          case "pp_controller_optimize": {
            const engine = await getEngine("api");
            result = engine.optimizeForController?.(params) ?? { optimized: params.gcode };
            break;
          }
          case "pp_controller_validate": {
            const engine = await getEngine("verification");
            result = engine.validateForController?.(params) ?? { valid: true };
            break;
          }
          case "pp_controller_recommend": {
            const engine = await getEngine("knowledgeGraph");
            result = engine.recommendSettings?.(params) ?? engine.query?.(params) ?? { recommendations: [] };
            break;
          }

          // ===== PP_KINEMATICS actions =====
          case "pp_kinematics_analyze": {
            const engine = await getEngine("kinematics");
            result = engine.analyze?.(params) ?? engine.analyzeKinematics?.(params) ?? { error: "analyze not found" };
            break;
          }
          case "pp_kinematics_transform": {
            const engine = await getEngine("kinematics");
            result = engine.transform?.(params) ?? engine.applyRTCP?.(params) ?? { error: "transform not found" };
            break;
          }
          case "pp_kinematics_limits": {
            const engine = await getEngine("kinematics");
            result = engine.checkLimits?.(params) ?? engine.validateLimits?.(params) ?? { withinLimits: true };
            break;
          }
          case "pp_kinematics_singularity": {
            const engine = await getEngine("kinematics");
            result = engine.detectSingularities?.(params) ?? engine.checkSingularity?.(params) ?? { singularities: [] };
            break;
          }
          case "pp_kinematics_optimize": {
            const engine = await getEngine("kinematics");
            result = engine.optimizeKinematics?.(params) ?? engine.optimize?.(params) ?? { error: "optimizeKinematics not found" };
            break;
          }

          // ===== PP_STRATEGY actions (FeatureStrategyKnowledgeBaseEngine) =====
          case "pp_strategy_query": {
            const engine = await getEngine("featureStrategy");
            result = engine.query?.(params) ?? { rules: [] };
            break;
          }
          case "pp_strategy_best": {
            const engine = await getEngine("featureStrategy");
            result = engine.getBestStrategy?.(
              params.feature_type,
              params.iso_group,
              params.machine_axes,
              params.operation
            ) ?? { error: "getBestStrategy not found" };
            break;
          }
          case "pp_strategy_list": {
            const engine = await getEngine("featureStrategy");
            result = engine.listRules?.(params.feature_type) ?? { rules: [] };
            break;
          }
          case "pp_strategy_add": {
            const engine = await getEngine("featureStrategy");
            engine.addRule?.(params.rule);
            result = { added: true };
            break;
          }
          case "pp_strategy_stats": {
            const engine = await getEngine("featureStrategy");
            result = engine.getStats?.() ?? engine.getRuleCount?.() ?? { error: "getStats not found" };
            break;
          }

          // ===== PP_TROUBLESHOOT actions (TroubleshootingAssistantEngine) =====
          case "pp_troubleshoot_start": {
            const engine = await getEngine("troubleshoot");
            result = engine.startDiagnosis?.({ domain: params.domain, symptoms: params.symptoms }) ?? { error: "startDiagnosis not found" };
            break;
          }
          case "pp_troubleshoot_answer": {
            const engine = await getEngine("troubleshoot");
            result = engine.answerQuestion?.({ session_id: params.session_id, answer: params.answer }) ?? { error: "answerQuestion not found" };
            break;
          }
          case "pp_troubleshoot_quick": {
            const engine = await getEngine("troubleshoot");
            result = engine.quickDiagnose?.({ domain: params.domain, symptoms: params.symptoms }) ?? { error: "quickDiagnose not found" };
            break;
          }
          case "pp_troubleshoot_common": {
            const engine = await getEngine("troubleshoot");
            result = engine.getCommonProblems?.({ domain: params.domain }) ?? { error: "getCommonProblems not found" };
            break;
          }

          // ===== PP_FORMULA actions (CrossDisciplinaryFormulaIntegrationEngine) =====
          case "pp_formula_apply": {
            const engine = await getEngine("crossFormula");
            result = engine.applyFormula?.(params.formulaName, params.inputs) ?? { error: "applyFormula not found" };
            break;
          }
          case "pp_formula_find": {
            const engine = await getEngine("crossFormula");
            result = engine.findRelevantFormulas?.(params.domain, params.keywords) ?? { formulas: [] };
            break;
          }
          case "pp_formula_explain": {
            const engine = await getEngine("crossFormula");
            result = engine.generateFormulaExplanation?.(params.formulaName) ?? { error: "formula not found" };
            break;
          }
          case "pp_formula_list": {
            const engine = await getEngine("crossFormula");
            result = engine.listFormulaNames?.(params.domain) ?? { formulas: [] };
            break;
          }
          case "pp_formula_stats": {
            const engine = await getEngine("crossFormula");
            result = engine.getStats?.() ?? { error: "getStats not found" };
            break;
          }

          // ===== PP_LEARNING actions (CrossDisciplinaryDeepLearningEngine) =====
          case "pp_learning_reason": {
            const engine = await getEngine("crossDeepLearning");
            result = engine.deepReason?.(params.query) ?? { error: "deepReason not found" };
            break;
          }
          case "pp_learning_execute_formula": {
            const engine = await getEngine("crossDeepLearning");
            result = engine.executeFormula?.(params.id, ...(params.args || [])) ?? { error: "executeFormula not found" };
            break;
          }
          case "pp_learning_execute_algo": {
            const engine = await getEngine("crossDeepLearning");
            result = engine.executeAlgorithm?.(params.id, params.config) ?? { error: "executeAlgorithm not found" };
            break;
          }
          case "pp_learning_search": {
            const engine = await getEngine("crossDeepLearning");
            result = engine.search?.(params.query) ?? { formulas: [], algorithms: [] };
            break;
          }
          case "pp_learning_patterns": {
            const engine = await getEngine("crossDeepLearning");
            result = engine.getLearningPatterns?.() ?? { patterns: [] };
            break;
          }
          case "pp_learning_summary": {
            const engine = await getEngine("crossDeepLearning");
            result = { summary: engine.getSummary?.() ?? "Cross-disciplinary learning engine" };
            break;
          }

          // ===== PP_GRAPH actions (ManufacturingKnowledgeGraphEngine) =====
          case "pp_graph_query": {
            const engine = await getEngine("mfgKnowledgeGraph");
            result = engine.calculate?.("query", params) ?? engine.tribalTraverse?.(params) ?? { error: "query not found" };
            break;
          }
          case "pp_graph_recommend": {
            const engine = await getEngine("mfgKnowledgeGraph");
            result = engine.contextRecommend?.(params.material, params.operation, params.machine) ?? { recommendations: [] };
            break;
          }
          case "pp_graph_gaps": {
            const engine = await getEngine("mfgKnowledgeGraph");
            result = engine.detectKnowledgeGaps?.(params.minTips, params.maxGaps) ?? { gaps: [] };
            break;
          }
          case "pp_graph_tribal": {
            const engine = await getEngine("mfgKnowledgeGraph");
            result = engine.tribalGraph?.(params) ?? { graph: {} };
            break;
          }
          case "pp_graph_link": {
            const engine = await getEngine("mfgKnowledgeGraph");
            engine.linkTip?.(params.tipId, params.nodeId, params.relationship, params.weight);
            result = { linked: true };
            break;
          }

          // ===== PP_EMBEDDING: Controller embeddings & transfer (PP-AGI-MS0) =====
          case "pp_embedding_embed": {
            const engine = await getEngine("controllerEmbedding");
            result = engine.embed(params.controllerId ?? params.controller_id ?? "generic_fanuc");
            break;
          }
          case "pp_embedding_embed_all": {
            const engine = await getEngine("controllerEmbedding");
            result = { embeddings: engine.embedAll() };
            break;
          }
          case "pp_embedding_compare": {
            const engine = await getEngine("controllerEmbedding");
            result = engine.compare(params.controllerA ?? params.controller_a, params.controllerB ?? params.controller_b);
            break;
          }
          case "pp_embedding_nearest": {
            const engine = await getEngine("controllerEmbedding");
            result = engine.findNearest(params.controllerId ?? params.controller_id, params.k ?? 5);
            break;
          }
          case "pp_embedding_cluster": {
            const engine = await getEngine("controllerEmbedding");
            result = engine.cluster(params.k ?? 4);
            break;
          }
          case "pp_embedding_transfer": {
            const engine = await getEngine("dialectTransfer");
            result = engine.transfer(params.spec ?? params);
            break;
          }

          // ===== PP_MACHINE_VECTOR: Machine kinematic embeddings (PP-AGI-MS1) =====
          case "pp_machine_embed": {
            const engine = await getEngine("machineVectorEncoder");
            result = engine.embed(params.machineId ?? params.machine_id);
            break;
          }
          case "pp_machine_embed_all": {
            const engine = await getEngine("machineVectorEncoder");
            result = { embeddings: engine.embedAll() };
            break;
          }
          case "pp_machine_compare": {
            const engine = await getEngine("machineVectorEncoder");
            result = engine.compare(params.machineA ?? params.machine_a, params.machineB ?? params.machine_b);
            break;
          }
          case "pp_machine_nearest": {
            const engine = await getEngine("machineVectorEncoder");
            result = engine.findNearest(params.machineId ?? params.machine_id, params.k ?? 5);
            break;
          }

          // ===== PP_TOOL_VECTOR: Cutting tool embeddings (PP-AGI-MS2) =====
          case "pp_tool_embed": {
            const engine = await getEngine("toolEncoder");
            result = engine.embed(params.spec ?? params);
            break;
          }
          case "pp_tool_compare": {
            const engine = await getEngine("toolEncoder");
            result = engine.compare(params.toolA ?? params.tool_a, params.toolB ?? params.tool_b);
            break;
          }
          case "pp_tool_nearest": {
            const engine = await getEngine("toolEncoder");
            result = engine.findNearest(params.spec ?? params, params.k ?? 5);
            break;
          }

          // ===== PP_TRAINING (PP-DL-MS0) =====
          case "pp_training_process": {
            const engine = await getEngine("trainingPipeline");
            result = engine.processProgram(params.gcode, params.sourceFile ?? params.source_file);
            break;
          }
          case "pp_training_batch": {
            const engine = await getEngine("trainingPipeline");
            result = { records: engine.processBatch(params.programs ?? []) };
            break;
          }
          case "pp_training_stats": {
            const engine = await getEngine("trainingPipeline");
            result = engine.getStats();
            break;
          }

          // ===== PP_ACTIVE_LEARNING (PP-DL-MS6) =====
          case "pp_active_evaluate": {
            const engine = await getEngine("activeLearning");
            result = engine.evaluate({
              controller_id: params.controllerId ?? params.controller_id,
              machine_id: params.machineId ?? params.machine_id,
              material_id: params.materialId ?? params.material_id,
            }, {
              min_uncertainty: params.minUncertainty ?? params.min_uncertainty,
              max_queue_size: params.maxQueueSize ?? params.max_queue_size,
              strategy: params.strategy,
            });
            break;
          }
          case "pp_active_next": {
            const engine = await getEngine("activeLearning");
            result = engine.getNext() ?? { queued: false };
            break;
          }
          case "pp_active_label": {
            const engine = await getEngine("activeLearning");
            result = {
              success: engine.label(params.id, {
                ground_truth: params.groundTruth ?? params.ground_truth ?? {},
                confidence: params.confidence ?? 1.0,
                expert_id: params.expertId ?? params.expert_id,
              }),
            };
            break;
          }
          case "pp_active_reject": {
            const engine = await getEngine("activeLearning");
            result = { success: engine.reject(params.id, params.reason) };
            break;
          }
          case "pp_active_stats": {
            const engine = await getEngine("activeLearning");
            result = engine.getStats();
            break;
          }
          case "pp_active_labeled": {
            const engine = await getEngine("activeLearning");
            result = { labeled: engine.getLabeled() };
            break;
          }

          // ===== PP_ONLINE_LEARNING (PP-DL-MS7) =====
          case "pp_online_record": {
            const engine = await getEngine("onlineLearning");
            const id = engine.recordPrediction(
              params.domain,
              params.prediction,
              params.confidence ?? 0.5,
              params.context,
            );
            result = { id };
            break;
          }
          case "pp_online_outcome": {
            const engine = await getEngine("onlineLearning");
            result = {
              success: engine.recordOutcome(
                params.id,
                params.actualOutcome ?? params.actual_outcome,
                params.errorMagnitude ?? params.error_magnitude,
                params.notes,
              ),
            };
            break;
          }
          case "pp_online_metrics": {
            const engine = await getEngine("onlineLearning");
            result = engine.getDomainMetrics(params.domain);
            break;
          }
          case "pp_online_stats": {
            const engine = await getEngine("onlineLearning");
            result = engine.getStats();
            break;
          }
          case "pp_online_export": {
            const engine = await getEngine("onlineLearning");
            result = { records: engine.exportLabeledData() };
            break;
          }

          // ===== PP_UNCERTAINTY (PP-DL-MS8) =====
          case "pp_uncertainty_estimate": {
            const engine = await getEngine("ensembleUncertainty");
            result = engine.estimateUncertainty({
              controller_id: params.controllerId ?? params.controller_id,
              machine_id: params.machineId ?? params.machine_id,
              material_id: params.materialId ?? params.material_id,
            });
            break;
          }
          case "pp_uncertainty_monte_carlo": {
            const engine = await getEngine("ensembleUncertainty");
            result = engine.monteCarloDropout({
              controller_id: params.controllerId ?? params.controller_id,
              machine_id: params.machineId ?? params.machine_id,
              material_id: params.materialId ?? params.material_id,
            }, params.samples ?? 20);
            break;
          }
          case "pp_uncertainty_calibrate": {
            const engine = await getEngine("ensembleUncertainty");
            result = {
              calibrated: engine.calibrate(
                params.rawSimilarity ?? params.raw_similarity ?? 0,
                params.threshold ?? 0.7,
                params.steepness ?? 10,
              ),
            };
            break;
          }

          // ===== PP_EXPLAIN (PP-DL-MS9) =====
          case "pp_explain_scenario": {
            const engine = await getEngine("decisionExplainer");
            result = engine.explain({
              controller_id: params.controllerId ?? params.controller_id,
              machine_id: params.machineId ?? params.machine_id,
              material_id: params.materialId ?? params.material_id,
            });
            break;
          }
          case "pp_explain_controller_choice": {
            const engine = await getEngine("decisionExplainer");
            result = {
              explanation: engine.explainControllerChoice(
                params.chosen,
                params.alternative,
              ),
            };
            break;
          }
          case "pp_explain_material_sub": {
            const engine = await getEngine("decisionExplainer");
            result = {
              explanation: engine.explainMaterialSubstitution(
                params.original,
                params.substitute,
              ),
            };
            break;
          }

          // ===== PP_ADVISOR (PP-AGI-ADVISOR) =====
          case "pp_advisor_advise": {
            const engine = await getEngine("jobAdvisor");
            result = engine.advise({
              controller_id: params.controllerId ?? params.controller_id,
              machine_id: params.machineId ?? params.machine_id,
              material_id: params.materialId ?? params.material_id,
              tool: params.tool,
              toolpath: params.toolpath,
              physics: params.physics,
              safety: params.safety,
              partial_controller: params.partialController ?? params.partial_controller,
            });
            break;
          }
          case "pp_advisor_outcome": {
            const engine = await getEngine("jobAdvisor");
            result = {
              success: engine.recordOutcome(
                params.trackerId ?? params.tracker_id,
                params.actualResult ?? params.actual_result,
                params.errorMagnitude ?? params.error_magnitude,
                params.notes,
              ),
            };
            break;
          }

          // ===== PP_TEMPLATES (PP-AGI-TEMPLATES) =====
          case "pp_templates_search": {
            const engine = await getEngine("templateLibrary");
            result = { results: engine.search(params.query ?? "", params.limit ?? 10) };
            break;
          }
          case "pp_templates_find_similar": {
            const engine = await getEngine("templateLibrary");
            result = {
              results: engine.findSimilar({
                controller_id: params.controllerId ?? params.controller_id,
                machine_id: params.machineId ?? params.machine_id,
                material_id: params.materialId ?? params.material_id,
              }, params.limit ?? 5),
            };
            break;
          }
          case "pp_templates_by_industry": {
            const engine = await getEngine("templateLibrary");
            result = { templates: engine.getByIndustry(params.industry) };
            break;
          }
          case "pp_templates_by_tag": {
            const engine = await getEngine("templateLibrary");
            result = { templates: engine.getByTag(params.tag) };
            break;
          }
          case "pp_templates_top_proven": {
            const engine = await getEngine("templateLibrary");
            result = { templates: engine.getTopProven(params.limit ?? 5) };
            break;
          }
          case "pp_templates_stats": {
            const engine = await getEngine("templateLibrary");
            result = engine.getStats();
            break;
          }

          // ===== PP_ANALYZER (PP-AGI-ANALYZER) =====
          case "pp_analyzer_analyze": {
            const engine = await getEngine("programAnalyzer");
            result = engine.analyze(params.gcode, params.sourceFile ?? params.source_file);
            break;
          }
          case "pp_analyzer_batch": {
            const engine = await getEngine("programAnalyzer");
            result = { reports: engine.analyzeBatch(params.programs ?? []) };
            break;
          }
          case "pp_analyzer_compare": {
            const engine = await getEngine("programAnalyzer");
            result = engine.compare(params.gcodeA ?? params.gcode_a, params.gcodeB ?? params.gcode_b);
            break;
          }

          // ===== PP_DASHBOARD (PP-AGI-DASHBOARD) =====
          case "pp_dashboard_full": {
            const engine = await getEngine("agiDashboard");
            result = engine.getDashboard();
            break;
          }
          case "pp_dashboard_health": {
            const engine = await getEngine("agiDashboard");
            result = { checks: engine.healthCheck() };
            break;
          }
          case "pp_dashboard_summary": {
            const engine = await getEngine("agiDashboard");
            result = { summary: engine.summary() };
            break;
          }

          // ===== PP_KNOWLEDGE (PP-AGI-KNOWLEDGE) =====
          case "pp_knowledge_search": {
            const engine = await getEngine("knowledgeIndex");
            result = engine.search(params.query ?? "", params.limit ?? 20);
            break;
          }
          case "pp_knowledge_search_domain": {
            const engine = await getEngine("knowledgeIndex");
            result = engine.searchInDomain(params.query ?? "", params.domain, params.limit ?? 20);
            break;
          }
          case "pp_knowledge_cross_domain": {
            const engine = await getEngine("knowledgeIndex");
            result = engine.crossDomainSearch(params.query ?? "", params.limit ?? 5);
            break;
          }
          case "pp_knowledge_coverage": {
            const engine = await getEngine("knowledgeIndex");
            result = engine.coverage(params.domain);
            break;
          }
          case "pp_knowledge_full_coverage": {
            const engine = await getEngine("knowledgeIndex");
            result = { reports: engine.fullCoverage() };
            break;
          }

          // ===== PP_BENCHMARK (PP-AGI-BENCHMARK) =====
          case "pp_benchmark_run_all": {
            const engine = await getEngine("benchmark");
            result = engine.runAll();
            break;
          }
          case "pp_benchmark_category": {
            const engine = await getEngine("benchmark");
            result = engine.runCategory(params.category);
            break;
          }
          case "pp_benchmark_quick": {
            const engine = await getEngine("benchmark");
            result = engine.quickCheck();
            break;
          }

          // ===== PP_WORKFLOW (PP-AGI-WORKFLOW) =====
          case "pp_workflow_run": {
            const engine = await getEngine("workflow");
            result = engine.run(params.type, params.input);
            break;
          }
          case "pp_workflow_list": {
            const engine = await getEngine("workflow");
            result = { workflows: engine.listWorkflows() };
            break;
          }

          // ===== PP_AUDITOR (PP-AGI-AUDITOR) =====
          case "pp_auditor_audit": {
            const engine = await getEngine("libraryAuditor");
            result = engine.audit(params.programs ?? []);
            break;
          }
          case "pp_auditor_quick_scan": {
            const engine = await getEngine("libraryAuditor");
            result = engine.quickScan(params.programs ?? []);
            break;
          }
          case "pp_auditor_find_similar": {
            const engine = await getEngine("libraryAuditor");
            result = {
              matches: engine.findSimilar(
                params.referenceGcode ?? params.reference_gcode,
                params.library ?? [],
                params.limit ?? 5,
              ),
            };
            break;
          }

          // ===== PP_WEDM (PP-WEDM) =====
          case "pp_wedm_generate": {
            const engine = await getEngine("wireEDM");
            result = engine.generate(params);
            break;
          }
          case "pp_wedm_standard_4pass": {
            const engine = await getEngine("wireEDM");
            result = engine.generateStandard4Pass(
              params.thickness ?? params.thickness_mm ?? 25,
              params.material ?? "D2",
              params.wireDia ?? params.wire_dia ?? 0.25,
            );
            break;
          }

          // ===== PP_SEDM (PP-SEDM) =====
          case "pp_sedm_generate": {
            const engine = await getEngine("sinkerEDM");
            result = engine.generate(params);
            break;
          }
          case "pp_sedm_standard_3stage": {
            const engine = await getEngine("sinkerEDM");
            result = engine.generateStandard3Stage(
              params.cavityDepth ?? params.cavity_depth ?? params.cavity_depth_mm ?? 20,
              params.material ?? "H13",
              params.machineModel ?? params.machine_model ?? "EA12V",
            );
            break;
          }
          case "pp_sedm_defaults": {
            const engine = await getEngine("sinkerEDM");
            result = {
              stages: engine.listStages(),
              orbit_patterns: engine.listOrbitPatterns(),
              stage_defaults: engine.listStages().map((s: any) => ({
                stage: s,
                defaults: engine.getStageDefaults(s),
                epack: engine.getEpackNumber(s),
              })),
            };
            break;
          }

          // ===== PP_SSP (PP-SSP — Okuma Sub-Spindle Sync) =====
          case "pp_ssp_generate": {
            const engine = await getEngine("okumaSubSpindle");
            result = engine.generate(params);
            break;
          }
          case "pp_ssp_simple_transfer": {
            const engine = await getEngine("okumaSubSpindle");
            result = engine.generateSimpleTransfer(
              params.barDiameterMm ?? params.bar_diameter_mm ?? params.barDia ?? 25,
              params.partLengthMm ?? params.part_length_mm ?? params.length ?? 60,
              params.material ?? "D2",
            );
            break;
          }
          case "pp_ssp_list_operations": {
            const engine = await getEngine("okumaSubSpindle");
            result = {
              operations: engine.listOperations(),
              machine_models: engine.listMachineModels(),
            };
            break;
          }

          // ===== PP_LINT (PP-LINT — G-code syntactic linter) =====
          case "pp_lint_check": {
            const engine = await getEngine("gcodeLint");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.lint(gcode, { strict: params.strict, controller: params.controller });
            break;
          }
          case "pp_lint_quick_check": {
            const engine = await getEngine("gcodeLint");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.check(gcode);
            break;
          }
          case "pp_lint_report": {
            const engine = await getEngine("gcodeLint");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const linted = engine.lint(gcode);
            result = { report: engine.report(linted), summary: linted.summary };
            break;
          }
          case "pp_lint_list_rules": {
            const engine = await getEngine("gcodeLint");
            result = { rules: engine.listRules() };
            break;
          }

          // ===== PP_CHUNK (PP-CHUNK — program chunker) =====
          case "pp_chunk_program": {
            const engine = await getEngine("programChunker");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              strategy: params.strategy,
              max_lines_per_chunk: params.max_lines_per_chunk ?? params.maxLines,
              max_bytes_per_chunk: params.max_bytes_per_chunk ?? params.maxBytes,
              safe_block: params.safe_block ?? params.safeBlock,
              preserve_headers: params.preserve_headers ?? params.preserveHeaders,
              chunk_comment: params.chunk_comment ?? params.chunkComment,
            };
            result = engine.chunk(gcode, options);
            break;
          }
          case "pp_chunk_list_strategies": {
            const engine = await getEngine("programChunker");
            result = { strategies: engine.listStrategies() };
            break;
          }
          case "pp_chunk_defaults": {
            const engine = await getEngine("programChunker");
            const strategy = params.strategy ?? "by_lines";
            result = engine.defaultOptions(strategy);
            break;
          }

          // ===== PP_MERGE (PP-MERGE — program merger) =====
          case "pp_merge_chunks": {
            const engine = await getEngine("programMerger");
            const chunks = params.chunks ?? [];
            const options = {
              strip_modal_restore: params.strip_modal_restore ?? params.stripModalRestore,
              strip_chunk_markers: params.strip_chunk_markers ?? params.stripChunkMarkers,
              strip_duplicate_headers: params.strip_duplicate_headers ?? params.stripDuplicateHeaders,
              chunk_separator_blank: params.chunk_separator_blank ?? params.chunkSeparatorBlank,
              emit_merge_comment: params.emit_merge_comment ?? params.emitMergeComment,
            };
            result = engine.merge(chunks, options);
            break;
          }
          case "pp_merge_validate": {
            const engine = await getEngine("programMerger");
            const text = params.text ?? params.gcode ?? "";
            result = engine.validate(text);
            break;
          }
          case "pp_merge_defaults": {
            const engine = await getEngine("programMerger");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_STATS (PP-STATS — descriptive statistics) =====
          case "pp_stats_analyze": {
            const engine = await getEngine("gcodeStatistics");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.analyze(gcode);
            break;
          }
          case "pp_stats_similarity": {
            const engine = await getEngine("gcodeStatistics");
            const a = params.gcode_a ?? params.a ?? "";
            const b = params.gcode_b ?? params.b ?? "";
            const statsA = engine.analyze(a);
            const statsB = engine.analyze(b);
            result = {
              similarity: engine.similarity(statsA, statsB),
              a_metrics: { lines: statsA.total_lines, tools: statsA.unique_tool_count },
              b_metrics: { lines: statsB.total_lines, tools: statsB.unique_tool_count },
            };
            break;
          }

          // ===== PP_SCALE (PP-SCALE — feed/speed scaler) =====
          case "pp_scale_apply": {
            const engine = await getEngine("feedSpeedScaler");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              feed_factor: params.feed_factor ?? params.feedFactor,
              speed_factor: params.speed_factor ?? params.speedFactor,
              max_feed: params.max_feed ?? params.maxFeed,
              max_speed: params.max_speed ?? params.maxSpeed,
              min_feed: params.min_feed ?? params.minFeed,
              min_speed: params.min_speed ?? params.minSpeed,
              feed_range_min: params.feed_range_min ?? params.rangeMin,
              feed_range_max: params.feed_range_max ?? params.rangeMax,
              skip_rapid_feeds: params.skip_rapid_feeds ?? params.skipRapids,
              round_decimals: params.round_decimals ?? params.decimals,
            };
            result = engine.scale(gcode, options);
            break;
          }
          case "pp_scale_feed": {
            const engine = await getEngine("feedSpeedScaler");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const factor = params.factor ?? params.feed_factor ?? 1;
            result = engine.scaleFeed(gcode, factor);
            break;
          }
          case "pp_scale_speed": {
            const engine = await getEngine("feedSpeedScaler");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const factor = params.factor ?? params.speed_factor ?? 1;
            result = engine.scaleSpeed(gcode, factor);
            break;
          }
          case "pp_scale_clamp_feed": {
            const engine = await getEngine("feedSpeedScaler");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const maxFeed = params.max_feed ?? params.maxFeed ?? 10000;
            result = engine.clampFeedTo(gcode, maxFeed);
            break;
          }
          case "pp_scale_defaults": {
            const engine = await getEngine("feedSpeedScaler");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_COMPAT (PP-COMPAT — controller compatibility) =====
          case "pp_compat_check": {
            const engine = await getEngine("controllerCompat");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const target = params.target ?? params.controller ?? "fanuc";
            result = engine.check(gcode, target);
            break;
          }
          case "pp_compat_quick": {
            const engine = await getEngine("controllerCompat");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const target = params.target ?? params.controller ?? "fanuc";
            result = engine.quickCheck(gcode, target);
            break;
          }
          case "pp_compat_rank": {
            const engine = await getEngine("controllerCompat");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const targets = params.targets ?? params.controllers;
            result = engine.rankControllers(gcode, targets);
            break;
          }
          case "pp_compat_list_controllers": {
            const engine = await getEngine("controllerCompat");
            result = engine.listControllers();
            break;
          }

          // ===== PP_MODAL (PP-MODAL — modal state tracker) =====
          case "pp_modal_track": {
            const engine = await getEngine("modalTracker");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const initial = params.initial ?? params.initial_state;
            result = engine.track(gcode, initial);
            break;
          }
          case "pp_modal_state_at_line": {
            const engine = await getEngine("modalTracker");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const line = params.line ?? params.line_number ?? 1;
            const full = engine.track(gcode);
            result = engine.getStateAtLine(full, line);
            break;
          }
          case "pp_modal_transitions": {
            const engine = await getEngine("modalTracker");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const group = params.group ?? "motion";
            const full = engine.track(gcode);
            result = engine.getTransitions(full, group);
            break;
          }
          case "pp_modal_active": {
            const engine = await getEngine("modalTracker");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const group = params.group ?? "motion";
            const line = params.line ?? params.line_number ?? 1;
            const full = engine.track(gcode);
            result = engine.getActiveModal(full, group, line);
            break;
          }

          // ===== PP_ARC (PP-ARC — arc validator) =====
          case "pp_arc_validate": {
            const engine = await getEngine("arcValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              radius_tolerance_mm: params.radius_tolerance_mm ?? params.tolerance,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_arc_quick": {
            const engine = await getEngine("arcValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_arc_defaults": {
            const engine = await getEngine("arcValidator");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_TC (PP-TC — tool change validator) =====
          case "pp_tc_validate": {
            const engine = await getEngine("toolChangeValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              safe_z_mm: params.safe_z_mm ?? params.safeZ,
              require_coolant_off: params.require_coolant_off,
              require_spindle_off: params.require_spindle_off,
              require_cutter_comp_off: params.require_cutter_comp_off,
              require_explicit_retract: params.require_explicit_retract,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_tc_quick": {
            const engine = await getEngine("toolChangeValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_tc_defaults": {
            const engine = await getEngine("toolChangeValidator");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_MIN (PP-MIN — G-code minimizer) =====
          case "pp_min_apply": {
            const engine = await getEngine("gcodeMinimizer");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              strip_redundant_modal: params.strip_redundant_modal,
              strip_redundant_fs: params.strip_redundant_fs,
              strip_block_numbers: params.strip_block_numbers,
              strip_comments: params.strip_comments,
              collapse_whitespace: params.collapse_whitespace,
              preserve_program_header: params.preserve_program_header,
            };
            result = engine.minimize(gcode, options);
            break;
          }
          case "pp_min_aggressive": {
            const engine = await getEngine("gcodeMinimizer");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.minimizeAggressive(gcode);
            break;
          }
          case "pp_min_conservative": {
            const engine = await getEngine("gcodeMinimizer");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.minimizeConservative(gcode);
            break;
          }
          case "pp_min_defaults": {
            const engine = await getEngine("gcodeMinimizer");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_WO (PP-WO — Work offset G54-G59 validator) =====
          case "pp_wo_validate": {
            const engine = await getEngine("workOffsetValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              safe_z_mm: params.safe_z_mm,
              require_initial_offset: params.require_initial_offset,
              allow_mid_op_switch_with_m_code: params.allow_mid_op_switch_with_m_code,
              extended_offset_max_p: params.extended_offset_max_p,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_wo_quick": {
            const engine = await getEngine("workOffsetValidator");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_wo_defaults": {
            const engine = await getEngine("workOffsetValidator");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_SS (PP-SS — Spindle speed safety validator) =====
          case "pp_ss_validate": {
            const engine = await getEngine("spindleSpeedSafety");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              max_rpm_step_ratio: params.max_rpm_step_ratio,
              require_dwell_after_start: params.require_dwell_after_start,
              min_dwell_seconds: params.min_dwell_seconds,
              allow_s_without_spindle: params.allow_s_without_spindle,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_ss_quick": {
            const engine = await getEngine("spindleSpeedSafety");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_ss_defaults": {
            const engine = await getEngine("spindleSpeedSafety");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CO (PP-CO — Coolant sequence validator) =====
          case "pp_co_validate": {
            const engine = await getEngine("coolantSequence");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              required_coolant: params.required_coolant,
              warn_stale_across_m6: params.warn_stale_across_m6,
              warn_redundant: params.warn_redundant,
              require_final_m9: params.require_final_m9,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_co_quick": {
            const engine = await getEngine("coolantSequence");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_co_defaults": {
            const engine = await getEngine("coolantSequence");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CC (PP-CC — Canned cycle validator) =====
          case "pp_cc_validate": {
            const engine = await getEngine("cannedCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              require_rigid_tap: params.require_rigid_tap,
              warn_peck_exceeds_depth: params.warn_peck_exceeds_depth,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cc_quick": {
            const engine = await getEngine("cannedCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cc_defaults": {
            const engine = await getEngine("cannedCycle");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CD (PP-CD — Cutter compensation validator) =====
          case "pp_cd_validate": {
            const engine = await getEngine("cutterComp");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              safe_z_mm: params.safe_z_mm,
              require_linear_activation: params.require_linear_activation,
              warn_missing_final_g40: params.warn_missing_final_g40,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cd_quick": {
            const engine = await getEngine("cutterComp");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cd_defaults": {
            const engine = await getEngine("cutterComp");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_LN (PP-LN — Line number & framing validator) =====
          case "pp_ln_validate": {
            const engine = await getEngine("lineNumberSanity");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              require_percent: params.require_percent,
              require_o_number: params.require_o_number,
              require_program_end_m_code: params.require_program_end_m_code,
              max_n_gap: params.max_n_gap,
              warn_large_n_gap: params.warn_large_n_gap,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_ln_quick": {
            const engine = await getEngine("lineNumberSanity");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_ln_defaults": {
            const engine = await getEngine("lineNumberSanity");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_UM (PP-UM — Units mode validator) =====
          case "pp_um_validate": {
            const engine = await getEngine("unitsMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_plausibility: params.check_plausibility,
              check_feed_scale: params.check_feed_scale,
              inch_coord_max_plausible: params.inch_coord_max_plausible,
              mm_coord_min_plausible: params.mm_coord_min_plausible,
              inch_feed_max_plausible: params.inch_feed_max_plausible,
              mm_feed_min_plausible: params.mm_feed_min_plausible,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_um_quick": {
            const engine = await getEngine("unitsMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_um_defaults": {
            const engine = await getEngine("unitsMode");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_FO (PP-FO — Feed override validator) =====
          case "pp_fo_validate": {
            const engine = await getEngine("feedOverride");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              excessive_feed_jump_ratio: params.excessive_feed_jump_ratio,
              tool_change_feed_window: params.tool_change_feed_window,
              flag_rapid_with_feed: params.flag_rapid_with_feed,
              flag_excessive_jump: params.flag_excessive_jump,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_fo_quick": {
            const engine = await getEngine("feedOverride");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_fo_defaults": {
            const engine = await getEngine("feedOverride");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CG (PP-CG — Call graph validator) =====
          case "pp_cg_validate": {
            const engine = await getEngine("callGraph");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              max_nesting_depth: params.max_nesting_depth,
              max_repeat_count: params.max_repeat_count,
              check_forward_reference: params.check_forward_reference,
              check_nesting_depth: params.check_nesting_depth,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cg_quick": {
            const engine = await getEngine("callGraph");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cg_defaults": {
            const engine = await getEngine("callGraph");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_DW (PP-DW — Dwell validator) =====
          case "pp_dw_validate": {
            const engine = await getEngine("dwell");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              p_unit_mode: params.p_unit_mode,
              max_dwell_sec: params.max_dwell_sec,
              min_dwell_sec: params.min_dwell_sec,
              check_excessive: params.check_excessive,
              check_too_short: params.check_too_short,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_dw_quick": {
            const engine = await getEngine("dwell");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_dw_defaults": {
            const engine = await getEngine("dwell");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_RM (PP-RM — Rapid-move validator) =====
          case "pp_rm_validate": {
            const engine = await getEngine("rapidMove");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              clearance_z: params.clearance_z,
              check_below_clearance: params.check_below_clearance,
              check_xyz_combined: params.check_xyz_combined,
              check_rapid_with_feed: params.check_rapid_with_feed,
              check_first_motion: params.check_first_motion,
              check_rapid_spindle_off: params.check_rapid_spindle_off,
              check_missing_tool_length: params.check_missing_tool_length,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_rm_quick": {
            const engine = await getEngine("rapidMove");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_rm_defaults": {
            const engine = await getEngine("rapidMove");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_MV (PP-MV — Macro variable validator) =====
          case "pp_mv_validate": {
            const engine = await getEngine("macroVariable");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_undefined: params.check_undefined,
              check_divide_by_zero: params.check_divide_by_zero,
              check_reserved_writes: params.check_reserved_writes,
              check_balanced_control: params.check_balanced_control,
              check_goto_targets: params.check_goto_targets,
              reserved_ranges: params.reserved_ranges,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_mv_quick": {
            const engine = await getEngine("macroVariable");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_mv_defaults": {
            const engine = await getEngine("macroVariable");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_AT (PP-AT — Axis travel envelope validator) =====
          case "pp_at_validate": {
            const engine = await getEngine("axisTravel");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              envelope: params.envelope,
              offsets: params.offsets,
              default_offset: params.default_offset,
              margin: params.margin,
              check_margin: params.check_margin,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_at_quick": {
            const engine = await getEngine("axisTravel");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode, { envelope: params.envelope, offsets: params.offsets });
            break;
          }
          case "pp_at_defaults": {
            const engine = await getEngine("axisTravel");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_DP (PP-DP — Decimal-point validator) =====
          case "pp_dp_validate": {
            const engine = await getEngine("decimalPoint");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_dimensions: params.check_dimensions,
              check_feed: params.check_feed,
              check_spindle: params.check_spindle,
              check_dwell: params.check_dwell,
              dimension_letters: params.dimension_letters,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_dp_quick": {
            const engine = await getEngine("decimalPoint");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_dp_defaults": {
            const engine = await getEngine("decimalPoint");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_BS (PP-BS — Block-skip and stop-code validator) =====
          case "pp_bs_validate": {
            const engine = await getEngine("blockSkip");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_slash_without_switch: params.check_slash_without_switch,
              check_multi_level: params.check_multi_level,
              check_m0_in_sub: params.check_m0_in_sub,
              check_m1_info: params.check_m1_info,
              check_slash_at_start: params.check_slash_at_start,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_bs_quick": {
            const engine = await getEngine("blockSkip");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_bs_defaults": {
            const engine = await getEngine("blockSkip");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_SS (PP-SS — Spindle state validator) =====
          case "pp_ss_validate": {
            const engine = await getEngine("spindleState");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_cut_off: params.check_cut_off,
              check_spindle_on_without_s: params.check_spindle_on_without_s,
              check_reversal: params.check_reversal,
              check_tool_change: params.check_tool_change,
              check_end_without_stop: params.check_end_without_stop,
              check_missing_initial: params.check_missing_initial,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_ss_quick": {
            const engine = await getEngine("spindleState");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_ss_defaults": {
            const engine = await getEngine("spindleState");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_TLC (PP-TLC — Tool length comp validator) =====
          case "pp_tlc_validate": {
            const engine = await getEngine("toolLengthComp");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_missing_h: params.check_missing_h,
              check_h_t_mismatch: params.check_h_t_mismatch,
              check_motion_without_tlc: params.check_motion_without_tlc,
              check_g49_plunge: params.check_g49_plunge,
              check_tool_change_g43: params.check_tool_change_g43,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_tlc_quick": {
            const engine = await getEngine("toolLengthComp");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_tlc_defaults": {
            const engine = await getEngine("toolLengthComp");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_TC (PP-TC — Lathe thread cycle validator) =====
          case "pp_tc_validate": {
            const engine = await getEngine("threadCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_feed_per_rev: params.check_feed_per_rev,
              check_pitch_f: params.check_pitch_f,
              check_g76_params: params.check_g76_params,
              check_retract_before: params.check_retract_before,
              check_css_off: params.check_css_off,
              check_pitch_consistency: params.check_pitch_consistency,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_tc_quick": {
            const engine = await getEngine("threadCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_tc_defaults": {
            const engine = await getEngine("threadCycle");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CST (PP-CST — Coordinate system transform validator) =====
          case "pp_cst_validate": {
            const engine = await getEngine("coordTransform");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_g68_cancel: params.check_g68_cancel,
              check_g51_cancel: params.check_g51_cancel,
              check_mirror_cancel: params.check_mirror_cancel,
              check_nested_g68: params.check_nested_g68,
              check_rotation_in_comp: params.check_rotation_in_comp,
              check_scaling_threading: params.check_scaling_threading,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cst_quick": {
            const engine = await getEngine("coordTransform");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cst_defaults": {
            const engine = await getEngine("coordTransform");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_PC (PP-PC — Probe cycle validator) =====
          case "pp_pc_validate": {
            const engine = await getEngine("probeCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              max_probe_feed: params.max_probe_feed,
              require_protected_move: params.require_protected_move,
              check_spindle_off: params.check_spindle_off,
              check_tlc_active: params.check_tlc_active,
              check_feed_limit: params.check_feed_limit,
              check_required_args: params.check_required_args,
              check_cutter_comp_off: params.check_cutter_comp_off,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_pc_quick": {
            const engine = await getEngine("probeCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_pc_defaults": {
            const engine = await getEngine("probeCycle");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_HSM (PP-HSM — High-speed machining / lookahead validator) =====
          case "pp_hsm_validate": {
            const engine = await getEngine("highSpeedMachining");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_surfacing_without_hsm: params.check_surfacing_without_hsm,
              check_hsm_threading: params.check_hsm_threading,
              check_hsm_rigid_tap: params.check_hsm_rigid_tap,
              check_hsm_probing: params.check_hsm_probing,
              check_g61_surfacing: params.check_g61_surfacing,
              check_cancel_at_end: params.check_cancel_at_end,
              surfacing_threshold: params.surfacing_threshold,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_hsm_quick": {
            const engine = await getEngine("highSpeedMachining");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_hsm_defaults": {
            const engine = await getEngine("highSpeedMachining");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_PSEL (PP-PSEL — Plane selection validator) =====
          case "pp_psel_validate": {
            const engine = await getEngine("planeSelect");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_arc_without_plane: params.check_arc_without_plane,
              check_plane_change_during_arc: params.check_plane_change_during_arc,
              check_plane_change_with_comp: params.check_plane_change_with_comp,
              check_drill_plane_mismatch: params.check_drill_plane_mismatch,
              check_arc_wrong_ijk: params.check_arc_wrong_ijk,
              check_plane_restored: params.check_plane_restored,
              default_plane_assumption: params.default_plane_assumption,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_psel_quick": {
            const engine = await getEngine("planeSelect");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_psel_defaults": {
            const engine = await getEngine("planeSelect");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_RP (PP-RP — Reference return validator) =====
          case "pp_rp_validate": {
            const engine = await getEngine("referenceReturn");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_cutter_comp: params.check_cutter_comp,
              check_safe_z: params.check_safe_z,
              check_absolute_nonzero: params.check_absolute_nonzero,
              check_g30_p_range: params.check_g30_p_range,
              check_g53_motion: params.check_g53_motion,
              check_g53_unreferenced: params.check_g53_unreferenced,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_rp_quick": {
            const engine = await getEngine("referenceReturn");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_rp_defaults": {
            const engine = await getEngine("referenceReturn");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_FM (PP-FM — Feed-mode validator) =====
          case "pp_fm_validate": {
            const engine = await getEngine("feedMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_mixed_in_block: params.check_mixed_in_block,
              check_g95_spindle_off: params.check_g95_spindle_off,
              check_cutting_without_feed: params.check_cutting_without_feed,
              check_g93_needs_f: params.check_g93_needs_f,
              check_g93_unrealistic: params.check_g93_unrealistic,
              check_mode_restored: params.check_mode_restored,
              max_g93_f: params.max_g93_f,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_fm_quick": {
            const engine = await getEngine("feedMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_fm_defaults": {
            const engine = await getEngine("feedMode");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_SM (PP-SM — Spindle speed-mode validator) =====
          case "pp_sm_validate": {
            const engine = await getEngine("speedMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_css_needs_s: params.check_css_needs_s,
              check_css_needs_max_rpm: params.check_css_needs_max_rpm,
              check_css_near_center: params.check_css_near_center,
              check_rpm_needs_s: params.check_rpm_needs_s,
              check_negative_s: params.check_negative_s,
              check_mixed_in_block: params.check_mixed_in_block,
              min_diameter: params.min_diameter,
              coordinate_mode: params.coordinate_mode,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_sm_quick": {
            const engine = await getEngine("speedMode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_sm_defaults": {
            const engine = await getEngine("speedMode");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_TURNING (PP-TURNING) =====
          case "pp_turning_generate": {
            const engine = await getEngine("okumaTurning");
            result = engine.generate(params);
            break;
          }
          case "pp_turning_simple_od_rough": {
            const engine = await getEngine("okumaTurning");
            result = engine.generateSimpleODRough(
              params.barDia ?? params.bar_dia ?? 50,
              params.finishDia ?? params.finish_dia ?? 30,
              params.length ?? 40,
              params.sfm ?? 200,
              params.feedIPR ?? params.feed_ipr ?? 0.012,
              params.doc ?? 2,
            );
            break;
          }

          // ===== PP_CAPABILITY (PP-CAP) =====
          case "pp_capability_matrix": {
            const engine = await getEngine("capMatrix");
            result = engine.generateMatrix();
            break;
          }
          case "pp_capability_assess": {
            const engine = await getEngine("capMatrix");
            result = engine.assessMachine(params.machineId ?? params.machine_id);
            break;
          }
          case "pp_capability_ranked": {
            const engine = await getEngine("capMatrix");
            result = { ranked: engine.getRankedMachines() };
            break;
          }

          // ===== PP_E2E (PP-E2E) =====
          case "pp_e2e_generate": {
            const engine = await getEngine("e2eGenerator");
            result = engine.generate(params);
            break;
          }
          case "pp_e2e_generate_simple": {
            const engine = await getEngine("e2eGenerator");
            result = engine.generateSimple(
              params.machineId ?? params.machine_id,
              params.toolNum ?? params.tool_num ?? 1,
              params.toolDia ?? params.tool_dia ?? 10,
              params.operation ?? "roughing",
              params.speed ?? 5000,
              params.feed ?? 500,
              params.doc ?? 2,
            );
            break;
          }

          // ===== PP_MACHINE_POST (PP-MACH) =====
          case "pp_machine_post_generate": {
            const engine = await getEngine("machinePost");
            result = engine.generateConfig(params.machineId ?? params.machine_id);
            break;
          }
          case "pp_machine_post_generate_all": {
            const engine = await getEngine("machinePost");
            result = { configs: engine.generateAllConfigs() };
            break;
          }
          case "pp_machine_post_list": {
            const engine = await getEngine("machinePost");
            result = { machines: engine.listMachines() };
            break;
          }
          case "pp_machine_post_validate_job": {
            const engine = await getEngine("machinePost");
            result = engine.validateForJob(
              params.machineId ?? params.machine_id,
              params.conditions ?? params,
            );
            break;
          }

          // ===== PP_ADAPT (PP-DL-MS1) =====
          case "pp_adapt_parameters": {
            const engine = await getEngine("controllerAdaptation");
            result = engine.adapt(params);
            break;
          }
          case "pp_adapt_list_profiles": {
            const engine = await getEngine("controllerAdaptation");
            result = { profiles: engine.listProfiles() };
            break;
          }

          // ===== PP_OPTIMIZE_GREEDY (PP-DL-MS5) =====
          case "pp_optimize_greedy": {
            const engine = await getEngine("greedyOptimizer");
            result = engine.optimize(params, params.maxIter ?? params.max_iter ?? 30);
            break;
          }
          case "pp_optimize_greedy_quick": {
            const engine = await getEngine("greedyOptimizer");
            result = engine.quickOptimize(params);
            break;
          }

          // ===== PP_PHYSICS_VALIDATE (PP-DL-MS3) =====
          case "pp_physics_validate": {
            const engine = await getEngine("physicsValidator");
            result = engine.validate(params.condition ?? params);
            break;
          }
          case "pp_physics_is_safe": {
            const engine = await getEngine("physicsValidator");
            result = { safe: engine.isSafe(params.condition ?? params) };
            break;
          }

          // ===== PP_SAFETY_RULES (PP-DL-MS4) =====
          case "pp_safety_rules_validate": {
            const engine = await getEngine("safetyRuleValidator");
            result = engine.validate(params.context ?? params);
            break;
          }
          case "pp_safety_rules_is_safe": {
            const engine = await getEngine("safetyRuleValidator");
            result = { safe: engine.isSafe(params.context ?? params) };
            break;
          }
          case "pp_safety_rules_list": {
            const engine = await getEngine("safetyRuleValidator");
            result = { rules: engine.listRules() };
            break;
          }
          case "pp_safety_rules_toggle": {
            const engine = await getEngine("safetyRuleValidator");
            result = { success: engine.setRuleEnabled(params.ruleId ?? params.rule_id, params.enabled) };
            break;
          }

          // ===== PP_REPORT (PP-AGI-REPORT) =====
          case "pp_report_job_advice": {
            const engine = await getEngine("reportGenerator");
            result = { markdown: engine.jobAdviceReport(params.advice) };
            break;
          }
          case "pp_report_program_analysis": {
            const engine = await getEngine("reportGenerator");
            result = { markdown: engine.programAnalysisReport(params.report) };
            break;
          }
          case "pp_report_library_audit": {
            const engine = await getEngine("reportGenerator");
            result = { markdown: engine.libraryAuditReport(params.audit) };
            break;
          }
          case "pp_report_dashboard": {
            const engine = await getEngine("reportGenerator");
            result = { markdown: engine.dashboardReport(params.dashboard) };
            break;
          }
          case "pp_report_workflow": {
            const engine = await getEngine("reportGenerator");
            result = { markdown: engine.workflowReport(params.workflow) };
            break;
          }
          case "pp_report_executive": {
            const engine = await getEngine("reportGenerator");
            result = { summary: engine.executiveSummary(params.advice) };
            break;
          }

          // ===== PP_PHYSICS_VECTOR (PP-AGI-MS4) =====
          case "pp_physics_embed": {
            const engine = await getEngine("physicsEncoder");
            result = engine.embed(params.condition ?? params);
            break;
          }
          case "pp_physics_compare": {
            const engine = await getEngine("physicsEncoder");
            result = engine.compare(params.conditionA ?? params.condition_a, params.conditionB ?? params.condition_b);
            break;
          }

          // ===== PP_SAFETY_VECTOR (PP-AGI-MS5) =====
          case "pp_safety_envelope_embed": {
            const engine = await getEngine("safetyEnvelope");
            result = engine.embed(params.spec ?? params);
            break;
          }
          case "pp_safety_envelope_compare": {
            const engine = await getEngine("safetyEnvelope");
            result = engine.compare(params.specA ?? params.spec_a, params.specB ?? params.spec_b);
            break;
          }

          // ===== PP_TOOLPATH_VECTOR: Toolpath strategy embeddings (PP-AGI-MS6) =====
          case "pp_toolpath_embed": {
            const engine = await getEngine("toolpathEncoder");
            result = engine.embed(params.spec ?? params);
            break;
          }
          case "pp_toolpath_compare": {
            const engine = await getEngine("toolpathEncoder");
            result = engine.compare(params.strategyA ?? params.strategy_a, params.strategyB ?? params.strategy_b);
            break;
          }
          case "pp_toolpath_recommend": {
            const engine = await getEngine("toolpathEncoder");
            result = engine.recommend(params.spec ?? params, params.k ?? 5);
            break;
          }

          // ===== PP_FUSION: Multi-modal fusion (PP-AGI-MS7) =====
          case "pp_fusion_fuse": {
            const engine = await getEngine("multiModalFusion");
            result = engine.fuse({ controller_id: params.controllerId ?? params.controller_id, machine_id: params.machineId ?? params.machine_id, material_id: params.materialId ?? params.material_id });
            break;
          }
          case "pp_fusion_search": {
            const engine = await getEngine("multiModalFusion");
            result = engine.searchSimilar({ controller_id: params.controllerId ?? params.controller_id, machine_id: params.machineId ?? params.machine_id, material_id: params.materialId ?? params.material_id }, params.k ?? 5);
            break;
          }
          case "pp_fusion_analyze_gaps": {
            const engine = await getEngine("multiModalFusion");
            result = engine.analyzeGaps({ controller_id: params.controllerId ?? params.controller_id, machine_id: params.machineId ?? params.machine_id, material_id: params.materialId ?? params.material_id });
            break;
          }

          // ===== PP_MATERIAL_VECTOR: Material property embeddings (PP-AGI-MS3) =====
          case "pp_material_embed": {
            const engine = await getEngine("materialVector");
            result = engine.embed(params.materialId ?? params.material_id ?? params.material);
            break;
          }
          case "pp_material_embed_all": {
            const engine = await getEngine("materialVector");
            result = { embeddings: engine.embedAll() };
            break;
          }
          case "pp_material_compare": {
            const engine = await getEngine("materialVector");
            result = engine.compare(params.materialA ?? params.material_a, params.materialB ?? params.material_b);
            break;
          }
          case "pp_material_nearest": {
            const engine = await getEngine("materialVector");
            result = engine.findNearest(params.materialId ?? params.material_id ?? params.material, params.k ?? 5);
            break;
          }

          // ===== PP_WIRING: Asset wiring (PP-WIRE-MS5-7) =====
          case "pp_wiring_algorithms": {
            const engine = await getEngine("algorithmWiring");
            result = {
              algorithms: engine.listAlgorithms(params.category),
              stats: engine.getStats(),
            };
            break;
          }
          case "pp_wiring_algorithms_orphans": {
            const engine = await getEngine("algorithmWiring");
            result = { orphans: engine.listOrphanedAlgorithms() };
            break;
          }
          case "pp_wiring_algorithms_consumers": {
            const engine = await getEngine("algorithmWiring");
            result = { consumers: engine.getConsumers(params.algorithmName) };
            break;
          }
          case "pp_wiring_reasoning": {
            const engine = await getEngine("reasoningWiring");
            result = {
              engines: engine.listEngines(params.category, params.domain),
              stats: engine.getStats(),
            };
            break;
          }
          case "pp_wiring_reasoning_orphans": {
            const engine = await getEngine("reasoningWiring");
            result = { orphans: engine.listOrphanedEngines() };
            break;
          }
          case "pp_wiring_reasoning_recommend": {
            const engine = await getEngine("reasoningWiring");
            result = { recommendations: engine.recommendEngines(params.task) };
            break;
          }
          case "pp_wiring_summary": {
            const engine = await getEngine("assetWiringSummary");
            result = engine.getSummary();
            break;
          }
          case "pp_wiring_trends": {
            const engine = await getEngine("assetWiringSummary");
            result = { trends: engine.getUtilizationTrends() };
            break;
          }
          case "pp_wiring_priority": {
            const engine = await getEngine("assetWiringSummary");
            result = { priorities: engine.getOrphanPriorityList(params.limit || 10) };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }

        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_pp] Post-calculation hook error: ${postErr}`);
        }

      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_pp");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}

// ============================================================================
// FALLBACK HELPER FUNCTIONS
// ============================================================================

function generateDefaultHeader(params: any): string {
  const { programNumber = 1, programName = "PRISM", controller = "fanuc" } = params;
  const lines = [
    controller === "heidenhain" ? `BEGIN PGM ${programName} MM` : `%`,
    controller === "heidenhain" ? "" : `O${String(programNumber).padStart(4, "0")} (${programName})`,
    `(GENERATED BY PRISM POST PROCESSOR)`,
    `(DATE: ${new Date().toISOString().split("T")[0]})`,
  ].filter(Boolean);
  return lines.join("\n");
}

function generateDefaultSafeStart(params: any): string {
  const { controller = "fanuc" } = params;
  if (controller === "heidenhain") {
    return "BLK FORM 0.1 Z X+0 Y+0 Z-50\nBLK FORM 0.2 X+100 Y+100 Z+0";
  }
  return "G17 G40 G49 G80 G90\nG28 G91 Z0\nG28 X0 Y0\nG90";
}

function generateDefaultToolChange(params: any): string {
  const { toolNumber = 1, rpm = 1000, coolant = "flood", controller = "fanuc" } = params;
  const coolantCode = coolant === "flood" ? "M08" : coolant === "mist" ? "M07" : "M09";
  if (controller === "heidenhain") {
    return `TOOL CALL ${toolNumber} Z S${rpm}\n${coolantCode}`;
  }
  return `T${toolNumber} M06\nG43 H${toolNumber}\nS${rpm} M03\n${coolantCode}`;
}

function generateDefaultCannedCycle(params: any): string {
  const { cycleType = "drill", depth = 10, retract = 2, feed = 100, controller = "fanuc" } = params;
  const cycleMap: Record<string, string> = {
    drill: "G81", peck: "G83", tap: "G84", bore: "G85", ream: "G85"
  };
  const code = cycleMap[cycleType] || "G81";
  return `${code} Z-${depth} R${retract} F${feed}`;
}

function generateDefaultSubroutine(params: any): string {
  const { subroutineNumber = 1000, controller = "fanuc" } = params;
  if (controller === "heidenhain") {
    return `CALL LBL ${subroutineNumber}`;
  }
  return `M98 P${subroutineNumber}`;
}

function analyzeGcodeBasic(gcode: string): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const gcodes = new Set<string>();
  const mcodes = new Set<string>();
  let toolChanges = 0;

  for (const line of lines) {
    const gmatch = line.match(/G\d+\.?\d*/gi);
    if (gmatch) gmatch.forEach(g => gcodes.add(g.toUpperCase()));
    const mmatch = line.match(/M\d+/gi);
    if (mmatch) mmatch.forEach(m => mcodes.add(m.toUpperCase()));
    if (/M0?6\b/i.test(line) || /T\d+/i.test(line)) toolChanges++;
  }

  return {
    lineCount: lines.length,
    gcodes: Array.from(gcodes),
    mcodes: Array.from(mcodes),
    toolChanges,
    hasArcs: gcodes.has("G02") || gcodes.has("G03"),
    hasCannedCycles: Array.from(gcodes).some(g => /G7\d|G8\d/i.test(g)),
  };
}

function analyzeComplexityBasic(gcode: string): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const motionCount = lines.filter(l => /G0[0123]\s/i.test(l)).length;
  const arcCount = lines.filter(l => /G0[23]\s/i.test(l)).length;
  const toolChanges = lines.filter(l => /M0?6\b/i.test(l) || /\bT\d+\b/i.test(l)).length;

  return {
    totalLines: lines.length,
    motionBlocks: motionCount,
    arcBlocks: arcCount,
    toolChanges,
    complexityScore: Math.round((motionCount + arcCount * 2 + toolChanges * 5) / Math.max(lines.length, 1) * 100) / 100,
    rating: motionCount > 500 ? "high" : motionCount > 100 ? "medium" : "low",
  };
}

function validateSyntaxBasic(gcode: string, controller: string = "fanuc"): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("(") || line.startsWith(";") || line === "%") continue;

    // Check for unclosed parentheses
    const openParen = (line.match(/\(/g) || []).length;
    const closeParen = (line.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push(`Line ${i + 1}: Unbalanced parentheses`);
    }

    // Check for invalid G-codes (basic)
    const gcodes = line.match(/G\d+\.?\d*/gi) || [];
    for (const g of gcodes) {
      const num = parseFloat(g.substring(1));
      if (num > 99 && controller !== "siemens" && controller !== "heidenhain") {
        warnings.push(`Line ${i + 1}: G-code ${g} may not be supported on ${controller}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lineCount: lines.length,
  };
}

function getDefaultCapabilities(controller: string): any {
  const capabilities: Record<string, any> = {
    fanuc: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43.4", hsm: "G05.1 Q1", nurbs: "G06.2", maxLineLength: 256
    },
    haas: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G234/G235", hsm: "G187", nurbs: false, maxLineLength: 256
    },
    siemens: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "TRAORI", hsm: "SOFT", nurbs: "BSPLINE", maxLineLength: 512
    },
    heidenhain: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "M128", hsm: "M120", nurbs: false, maxLineLength: 512
    },
    mazak: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43.4", hsm: "G05.1", nurbs: false, maxLineLength: 256
    },
    okuma: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43 T", hsm: "G08", nurbs: false, maxLineLength: 256
    },
  };
  return capabilities[controller] || capabilities.fanuc;
}
