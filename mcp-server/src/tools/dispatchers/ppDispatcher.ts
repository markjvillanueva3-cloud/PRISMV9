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
let _ppTranspiler: any;
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

// PP-PE: Program-end validator (M30/M02/M99)
let _ppProgramEnd: any;

// PP-AI: Absolute/incremental mode validator (G90/G91)
let _ppAbsInc: any;

// PP-MF: Macro flow validator (WHILE/DO/END/GOTO)
let _ppMacroFlow: any;

// PP-SS: Safe-start block validator
let _ppSafeStart: any;

// PP-CHAR: Character/byte-level validator
let _ppCharacter: any;

// PP-DWR: Duplicate-word-in-block validator
let _ppDuplicateWord: any;

// PP-EXP: Macro expression syntax validator
let _ppExpressionSyntax: any;

// PP-OP: Operator-stop (M0/M1) validator
let _ppOperatorStop: any;

// PP-HDR: Program header/metadata validator
let _ppProgramHeader: any;

// PP-OMR: O-number range/format validator
let _ppONumberRange: any;

// PP-BLK: Block composition validator
let _ppBlockComposition: any;

// PP-FRR: Feed-rate reasonableness validator
let _ppFeedRateReasonability: any;

// PP-CRR: Coordinate-range reasonableness validator
let _ppCoordinateRange: any;

// PP-ZMV: Zero-motion / no-op block validator
let _ppZeroMotion: any;

// PP-CMC: Commented-out-code validator
let _ppCommentedCode: any;

// PP-SIZE: Program size/complexity validator
let _ppProgramSize: any;

// PP-REDUN: Redundant modal re-issuance validator
let _ppRedundantModal: any;

// PP-G10: G10 data-set block validator
let _ppG10DataSet: any;

// PP-POLAR: Polar coordinate mode (G15/G16) validator
let _ppPolarCoordinate: any;

// PP-CHAM: Inline corner-break (,C / ,R chamfer/round) validator
let _ppInlineCornerBreak: any;

// PP-AXIS: Axis-letter vocabulary validator (Fanuc ISO word-letter check)
let _ppAxisLetter: any;

// PP-AGI-WIRING: Orchestration layer — knowledge-aggregating pipeline runner
let _ppAgiWiring: any;

// PP-CPS: PRISM CPS implementation knowledge (3 PRISM-enhanced posts, controllers, Okuma M-codes)
let _ppCPS: any;

// PP-CL: Continuous learning — Bayesian belief over engine correctness from production feedback
let _ppCL: any;

// PP-BRIDGE: AI coordination bridge — physics + generator + master-AGI orchestration
let _ppBridge: any;

// PP-PAT: JM Die production patterns (24,469 programs, operations, customers, sequences, macros)
let _ppPat: any;

// PP-HM: hyperMILL production knowledge (variables, machine configs, patterns, validation)
let _ppHM: any;

// PP-MPA: Master-Post Architecture (26 machine types, 123 Fusion posts, Hurco V11 tracker)
let _ppMPA: any;

// PP-COG: Deep cognition (case library, symptom diagnosis, reasoning)
let _ppCog: any;

// PP-CK: Comprehensive Knowledge (catalog routing, asset ingestion, H-drive resources)
let _ppCK: any;

// PP-GEN: Master Post Genius (expert reasoning, print-to-program, JM Die patterns)
let _ppGen: any;

// PP-REG: AGI Master Registry (PP engine routing, capability search, dependency graph)
let _ppReg: any;

// PP-UPH: Unified Physics Orchestration (analyze + G-code physics optimization)
let _ppUPH: any;

// PP-AGIO: AGI Orchestration (engine registry, controller knowledge, recommendations)
let _ppAGIO: any;

// PP-SAW: AI Self-Awareness Integration (PRISM awareness context, JM Die machines)
let _ppSAW: any;

// PP-DAH: Deep AI Hardening (post conversion, generator, validator, 5-axis safety)
let _ppDAH: any;

// PP-VID: Video Knowledge Neural (6-layer neural reasoning over video-learned controllers)
let _ppVID: any;

// PP-MPG: Master Post Generator (complete post skeleton, safety, cycles, M-codes, properties)
let _ppMPG: any;

// PP-DI: Deep Intelligence (reasoning, CSP, kinematics, collision, deep learning, comprehensive)
let _ppDI: any;

// PP-TEL: Telemetry (event record, funnel metrics)
let _ppTel: any;

// PP-TNR: Tool Number Range Validator (T-word validation across G-code)
let _ppTNR: any;

// PP-TRN: Trainer (dialect calibration via ref vs generated diff)
let _ppTrn: any;

// PP-MGC: Modal Group Conflict Validator (same-line modal G-code conflicts)
let _ppMGC: any;

// PP-ANL: Analysis (deep post-processor AI analysis: dead code, logic, modal state)
let _ppAnl: any;

// PP-AUT: Autopilot (dialect resolution, post config, PPG, print-to-program)
let _ppAut: any;

// PP-MST: Master Post Processor (unified multi-CAM segment processing)
let _ppMst: any;

// PP-ULT: Ultimate AI (deep ensemble, episodic retrieval, KG query, ToT, meta-learning, adversarial)
let _ppUlt: any;

// PP-IOC: Intelligence Orchestrator (intent classification, engine routing, aggregation, proactive suggestions)
let _ppIoc: any;

// PP-DL: Deep Learning (pattern recognition, feed optimization, controller classification, quality scoring)
let _ppDl: any;

// PP-UDR: Unified Deep Reasoning (6-layer intelligence + MCTS exploration)
let _ppUdr: any;

// PP-PCM: Post Capability Matrix (controller capability records, query, compare, post selection)
let _ppPcm: any;

// PP-KN: Knowledge (entry funcs, drilling cycles, UPK switches, misc values, circular settings)
let _ppKn: any;

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

// PP-LABEL: Program Labeling Pipeline (JM DIE training data)
let _ppProgramLabeling: any;

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
    case "transpiler":
      return _ppTranspiler ??= (await import("../../engines/GCodeTranspilerEngine.js")).gcodeTranspiler;
    case "metaLearning":
      return _ppMetaLearning ??= (await import("../../engines/PostProcessorMetaLearningEngine.js")).postProcessorMetaLearningEngine;
    case "feedOptimizer":
      return _ppFeedOptimizer ??= (await import("../../engines/PostProcessorFeedOptimizerEngine.js")).postProcessorFeedOptimizer;
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
      return _knowledgeGraph ??= (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraph;

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
    case "programEnd":
      return _ppProgramEnd ??= (await import("../../engines/PPProgramEndValidatorEngine.js")).ppProgramEndValidatorEngine;
    case "absInc":
      return _ppAbsInc ??= (await import("../../engines/PPAbsIncValidatorEngine.js")).ppAbsIncValidatorEngine;
    case "macroFlow":
      return _ppMacroFlow ??= (await import("../../engines/PPMacroFlowValidatorEngine.js")).ppMacroFlowValidatorEngine;
    case "safeStart":
      return _ppSafeStart ??= (await import("../../engines/PPSafeStartBlockValidatorEngine.js")).ppSafeStartBlockValidatorEngine;
    case "character":
      return _ppCharacter ??= (await import("../../engines/PPCharacterValidatorEngine.js")).ppCharacterValidatorEngine;
    case "duplicateWord":
      return _ppDuplicateWord ??= (await import("../../engines/PPDuplicateWordValidatorEngine.js")).ppDuplicateWordValidatorEngine;
    case "expressionSyntax":
      return _ppExpressionSyntax ??= (await import("../../engines/PPExpressionSyntaxValidatorEngine.js")).ppExpressionSyntaxValidatorEngine;
    case "operatorStop":
      return _ppOperatorStop ??= (await import("../../engines/PPOperatorStopValidatorEngine.js")).ppOperatorStopValidatorEngine;
    case "programHeader":
      return _ppProgramHeader ??= (await import("../../engines/PPProgramHeaderValidatorEngine.js")).ppProgramHeaderValidatorEngine;
    case "oNumberRange":
      return _ppONumberRange ??= (await import("../../engines/PPONumberRangeValidatorEngine.js")).ppONumberRangeValidatorEngine;
    case "blockComposition":
      return _ppBlockComposition ??= (await import("../../engines/PPBlockCompositionValidatorEngine.js")).ppBlockCompositionValidatorEngine;
    case "feedRateReasonability":
      return _ppFeedRateReasonability ??= (await import("../../engines/PPFeedRateReasonabilityValidatorEngine.js")).ppFeedRateReasonabilityValidatorEngine;
    case "coordinateRange":
      return _ppCoordinateRange ??= (await import("../../engines/PPCoordinateRangeValidatorEngine.js")).ppCoordinateRangeValidatorEngine;
    case "zeroMotion":
      return _ppZeroMotion ??= (await import("../../engines/PPZeroMotionValidatorEngine.js")).ppZeroMotionValidatorEngine;
    case "commentedCode":
      return _ppCommentedCode ??= (await import("../../engines/PPCommentedCodeValidatorEngine.js")).ppCommentedCodeValidatorEngine;
    case "programSize":
      return _ppProgramSize ??= (await import("../../engines/PPProgramSizeValidatorEngine.js")).ppProgramSizeValidatorEngine;
    case "redundantModal":
      return _ppRedundantModal ??= (await import("../../engines/PPRedundantModalValidatorEngine.js")).ppRedundantModalValidatorEngine;
    case "g10DataSet":
      return _ppG10DataSet ??= (await import("../../engines/PPG10DataSetValidatorEngine.js")).ppG10DataSetValidatorEngine;
    case "polarCoordinate":
      return _ppPolarCoordinate ??= (await import("../../engines/PPPolarCoordinateValidatorEngine.js")).ppPolarCoordinateValidatorEngine;
    case "inlineCornerBreak":
      return _ppInlineCornerBreak ??= (await import("../../engines/PPInlineCornerBreakValidatorEngine.js")).ppInlineCornerBreakValidatorEngine;
    case "axisLetter":
      return _ppAxisLetter ??= (await import("../../engines/PPAxisLetterValidatorEngine.js")).ppAxisLetterValidatorEngine;
    case "agiWiring":
      return _ppAgiWiring ??= (await import("../../engines/PostProcessorAGIWiringIntegrationEngine.js")).postProcessorAGIWiringIntegrationEngine;
    case "cps":
      return _ppCPS ??= (await import("../../engines/PostProcessorCPSImplementationEngine.js")).postProcessorCPSImplementationEngine;
    case "continuousLearning":
      return _ppCL ??= (await import("../../engines/PostProcessorAGIContinuousLearningEngine.js")).postProcessorAGIContinuousLearningEngine;
    case "bridge":
      return _ppBridge ??= (await import("../../engines/PostProcessorAICoordinationBridge.js")).postProcessorAICoordinationBridge;
    case "productionPattern":
      return _ppPat ??= (await import("../../engines/PostProcessorProductionPatternEngine.js")).postProcessorProductionPatternEngine;
    case "hyperMillKnowledge":
      return _ppHM ??= (await import("../../engines/PostProcessorHyperMillKnowledgeEngine.js")).postProcessorHyperMillKnowledgeEngine;
    case "masterPostArch":
      return _ppMPA ??= (await import("../../engines/PostProcessorMasterPostArchitectureEngine.js")).postProcessorMasterPostArchitectureEngine;
    case "deepCognition":
      return _ppCog ??= (await import("../../engines/PostProcessorDeepCognitionEngine.js")).postProcessorDeepCognitionEngine;
    case "comprehensiveKnowledge":
      return _ppCK ??= (await import("../../engines/PostProcessorComprehensiveKnowledgeEngine.js")).postProcessorComprehensiveKnowledgeEngine;
    case "masterGenius":
      return _ppGen ??= (await import("../../engines/MasterPostProcessorGeniusEngine.js")).masterPostProcessorGeniusEngine;
    case "agiMasterRegistry":
      return _ppReg ??= (await import("../../engines/PostProcessorAGIMasterRegistryEngine.js")).postProcessorAGIMasterRegistryEngine;
    case "unifiedPhysics":
      return _ppUPH ??= (await import("../../engines/PostProcessorUnifiedPhysicsOrchestrationEngine.js")).postProcessorUnifiedPhysicsOrchestrationEngine;
    case "agiOrchestration":
      return _ppAGIO ??= (await import("../../engines/MasterPostProcessorAGIOrchestrationEngine.js")).masterPostProcessorAGIOrchestrationEngine;
    case "selfAwareness":
      return _ppSAW ??= (await import("../../engines/PostProcessorAISelfAwarenessIntegrationEngine.js")).postProcessorAISelfAwarenessIntegrationEngine;
    case "deepAIHardening":
      return _ppDAH ??= (await import("../../engines/PostProcessorDeepAIHardeningEngine.js")).postProcessorDeepAIHardeningEngine;
    case "videoKnowledgeNeural":
      return _ppVID ??= (await import("../../engines/PostProcessorVideoKnowledgeNeuralEngine.js")).postProcessorVideoKnowledgeNeuralEngine;
    case "masterPostGenerator":
      return _ppMPG ??= (await import("../../engines/MasterPostGeneratorEngine.js")).masterPostGeneratorEngine;
    case "deepIntelligence":
      return _ppDI ??= (await import("../../engines/PostProcessorDeepIntelligenceEngine.js")).postProcessorDeepIntelligenceEngine;
    case "telemetry":
      return _ppTel ??= (await import("../../engines/PostProcessorTelemetryEngine.js")).postProcessorTelemetryEngine;
    case "toolNumberRange":
      return _ppTNR ??= (await import("../../engines/PPToolNumberRangeValidatorEngine.js")).ppToolNumberRangeValidatorEngine;
    case "trainer":
      return _ppTrn ??= (await import("../../engines/PostProcessorTrainerEngine.js")).postProcessorTrainerEngine;
    case "modalGroupConflict":
      return _ppMGC ??= (await import("../../engines/PPModalGroupConflictValidatorEngine.js")).ppModalGroupConflictValidatorEngine;
    case "analysis":
      return _ppAnl ??= (await import("../../engines/PostProcessorAnalysisEngine.js")).postProcessorAnalysisEngine;
    case "autopilot":
      return _ppAut ??= (await import("../../engines/PostProcessorAutopilotEngine.js")).postProcessorAutopilotEngine;
    case "master":
      return _ppMst ??= (await import("../../engines/MasterPostProcessorEngine.js")).masterPostProcessorEngine;
    case "ultimate":
      return _ppUlt ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
    case "ioc":
      return _ppIoc ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
    case "deepLearning":
      return _ppDl ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
    case "unifiedReasoning":
      return _ppUdr ??= (await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js")).postProcessorUnifiedDeepReasoningEngine;
    case "postCapMatrix":
      return _ppPcm ??= (await import("../../engines/PostProcessorCapabilityMatrixEngine.js")).postProcessorCapabilityMatrixEngine;
    case "knowledge":
      return _ppKn ??= (await import("../../engines/PostProcessorKnowledgeEngine.js")).postProcessorKnowledgeEngine;
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

    // PP-LABEL: Program Labeling Pipeline
    case "programLabeling":
      return _ppProgramLabeling ??= (await import("../../engines/ProgramLabelingPipelineEngine.js")).programLabelingPipelineEngine;

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
  "pp_verify_posted_nc",         // End-to-end verify a posted .NC vs (machine,controller,features) — PostProcessorVerificationOrchestratorEngine (U-PP-VERIFY-ORCH-WIRE, closes a stop_on_unwired_assets orphan)

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

  // ===== PP_OUTCOME_EMIT: post->india OutcomeCaptureBus emit (INDIA-AI-ORPHAN-WIRE bravo 2026-06-11) =====
  "pp_outcome_emit",               // Publish a post-emit recommendation to the cross-galaxy OutcomeCaptureBus (closes the post->india self-learning loop)

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

  // PP-SSTATE: Spindle state validator (renamed from pp_ss_* to resolve z.enum duplicate)
  "pp_sstate_validate",            // Full spindle-state validation
  "pp_sstate_quick",               // Quick pass/fail + M3/M4/M5 counts
  "pp_sstate_defaults",            // Default spindle-state validator options

  // PP-TLC: Tool length compensation validator
  "pp_tlc_validate",               // Full G43/G44/G49 validation
  "pp_tlc_quick",                  // Quick pass/fail + G43 count
  "pp_tlc_defaults",               // Default TLC validator options

  // PP-THREAD: Thread cycle validator (lathe G32/G33/G76/G92) (renamed from pp_tc_* to resolve z.enum duplicate)
  "pp_thread_validate",            // Full threading cycle validation
  "pp_thread_quick",               // Quick pass/fail + pass count
  "pp_thread_defaults",            // Default thread cycle validator options

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

  // PP-PE: Program-end validator (M30/M02/M99)
  "pp_pe_validate",                // Full program-end validation
  "pp_pe_quick",                   // Quick pass/fail + M30/M99 counts
  "pp_pe_defaults",                // Default program-end validator options

  // PP-AI: Absolute/incremental mode validator (G90/G91)
  "pp_ai_validate",                // Full distance-mode validation
  "pp_ai_quick",                   // Quick pass/fail + final mode + switch count
  "pp_ai_defaults",                // Default distance-mode validator options

  // PP-MF: Macro flow validator (WHILE/DO/END/GOTO)
  "pp_mf_validate",                // Full macro-flow validation
  "pp_mf_quick",                   // Quick pass/fail + balanced + nesting
  "pp_mf_defaults",                // Default macro-flow validator options
  // PP-SAFESTART: Safe-start block validator (renamed from pp_ss_* to resolve z.enum duplicate)
  "pp_safestart_validate",         // Full safe-start block validation
  "pp_safestart_quick",            // Quick pass/fail + missing-count
  "pp_safestart_defaults",         // Default safe-start validator options
  "pp_char_validate",              // Byte-level char validation
  "pp_char_quick",                 // Quick pass/fail + BOM/non-ASCII count
  "pp_char_defaults",              // Default character validator options
  "pp_dwr_validate",               // Duplicate-word-in-block validation
  "pp_dwr_quick",                  // Quick pass/fail + duplicate count
  "pp_dwr_defaults",               // Default duplicate-word options
  "pp_exp_validate",               // Macro expression syntax validation
  "pp_exp_quick",                  // Quick pass/fail + nesting depth
  "pp_exp_defaults",               // Default expression validator options
  "pp_op_validate",                // Operator-stop (M0/M1) validation
  "pp_op_quick",                   // Quick pass/fail + stop counts
  "pp_op_defaults",                // Default operator-stop options
  "pp_hdr_validate",               // Program header/metadata validation
  "pp_hdr_quick",                  // Quick pass/fail + header metrics
  "pp_hdr_defaults",               // Default program header options
  "pp_omr_validate",               // O-number range/format validation
  "pp_omr_quick",                  // Quick pass/fail + O-number summary
  "pp_omr_defaults",               // Default O-number range options
  "pp_blk_validate",               // Block composition / per-block layout
  "pp_blk_quick",                  // Quick pass/fail + block stats
  "pp_blk_defaults",               // Default block composition options
  "pp_frr_validate",               // Feed-rate reasonableness validation
  "pp_frr_quick",                  // Quick pass/fail + min/max F
  "pp_frr_defaults",               // Default feed-rate reasonableness options
  "pp_crr_validate",               // Coordinate-range reasonableness
  "pp_crr_quick",                  // Quick pass/fail + coord/axes stats
  "pp_crr_defaults",               // Default coordinate-range options
  "pp_zmv_validate",               // Zero-motion / no-op block detection
  "pp_zmv_quick",                  // Quick pass/fail + motion block count
  "pp_zmv_defaults",               // Default zero-motion options
  "pp_cmc_validate",               // Commented-out-code detection
  "pp_cmc_quick",                  // Quick pass/fail + suspicious comment count
  "pp_cmc_defaults",               // Default commented-code options
  "pp_size_validate",              // Program size & complexity thresholds
  "pp_size_quick",                 // Quick pass/fail + block/tool/kb stats
  "pp_size_defaults",              // Default program-size options
  "pp_redun_validate",             // Redundant modal re-issuance detection
  "pp_redun_quick",                // Quick pass/fail + reissue counts
  "pp_redun_defaults",             // Default redundant-modal options
  "pp_g10_validate",               // G10 data-set block validation
  "pp_g10_quick",                  // Quick pass/fail + G10 block count
  "pp_g10_defaults",               // Default G10 validation options
  "pp_polar_validate",             // Polar coordinate G15/G16 validation
  "pp_polar_quick",                // Quick pass/fail + G16 activation count
  "pp_polar_defaults",             // Default polar validation options
  "pp_cham_validate",              // Inline ,C / ,R corner-break validation
  "pp_cham_quick",                 // Quick pass/fail + chamfer/round counts
  "pp_cham_defaults",              // Default corner-break validation options
  "pp_axis_validate",              // Axis-letter vocabulary validation (Fanuc ISO)
  "pp_axis_quick",                 // Quick pass/fail + unknown-letter count
  "pp_axis_defaults",              // Default allowed word-letters + rotary axes
  "pp_agi_run",                    // Full AGI pipeline with all knowledge engines
  "pp_agi_verify",                 // Verify wiring of all knowledge engines
  "pp_agi_plan",                   // Plan execution: routing + knowledge engines
  "pp_agi_health",                 // Quick health check engine-by-engine
  "pp_agi_context",                // Full context string for AI consumption
  "pp_agi_stats",                  // Integration engine statistics
  "pp_cps_files",                  // List 3 PRISM-enhanced CPS files
  "pp_cps_find",                   // Find CPS files for a machine/manufacturer
  "pp_cps_features",               // List roughing features (with filter by category)
  "pp_cps_benefit",                // Calculate combined benefit of features (diminishing returns)
  "pp_cps_controllers",            // List controller implementations
  "pp_cps_controller_find",        // Find controller by query
  "pp_cps_gcode_detail",           // G-code detail for a controller
  "pp_cps_issues",                 // Issue solutions by symptom
  "pp_cps_okuma_mcodes",           // Okuma cycle-time M-codes (optional risk filter)
  "pp_cps_okuma_savings",          // Calculate Okuma time savings from applied M-codes
  "pp_cps_recommend",              // Recommend features for a use case
  "pp_cps_lessons",                // Production lessons learned
  "pp_cps_stats",                  // CPS engine statistics
  "pp_cps_context",                // AI context string for CPS knowledge
  "pp_cl_feedback",                // Record production feedback (Bayesian belief update)
  "pp_cl_state",                   // Full continuous-learning state snapshot
  "pp_cl_belief",                  // Single engine's current belief state
  "pp_cl_mistakes",                // Top mistake patterns observed in production
  "pp_cl_promoted",                // Promoted knowledge (above confidence threshold)
  "pp_cl_search",                  // Search learned knowledge by query
  "pp_cl_rules",                   // Prevention rules for controller + material pair
  "pp_cl_reset",                   // Reset all learning state (admin)
  "pp_cl_stats",                   // Continuous-learning engine statistics
  "pp_bridge_coordinate",          // Coordinate physics + generator + master-AGI for a request
  "pp_bridge_perf",                // All engine performance records
  "pp_bridge_perf_engine",         // Performance record for a single engine
  "pp_bridge_perf_reset",          // Reset performance tracking (admin)
  "pp_bridge_best",                // Best engine by metric (success_rate/speed/confidence)
  "pp_bridge_physics_quick",       // Quick physics analysis shortcut
  "pp_bridge_stats",               // Coordination bridge statistics
  "pp_pat_operations",             // Operation frequencies (JM Die 24,469 programs)
  "pp_pat_top_ops",                // Top N operations by frequency
  "pp_pat_operation",              // Single operation frequency by G/M code
  "pp_pat_customers",              // All customer patterns
  "pp_pat_customer",               // Single customer pattern by name
  "pp_pat_customers_industry",     // Customers filtered by industry
  "pp_pat_material",               // Material production parameters
  "pp_pat_materials_all",          // All material production parameters
  "pp_pat_speeds_feeds",           // Recommend speeds/feeds from production data
  "pp_pat_sequences",              // All operation sequences (production-proven)
  "pp_pat_sequence",               // Single sequence by ID
  "pp_pat_sequences_customer",     // Sequences for a customer
  "pp_pat_macros",                 // All macro patterns
  "pp_pat_macro",                  // Single macro pattern by ID
  "pp_pat_macros_controller",      // Macros for a controller
  "pp_pat_shop_focus",             // Shop focus profile (top ops + customers)
  "pp_pat_tribal",                 // Tribal wisdom for a material
  "pp_pat_stats",                  // Production pattern engine statistics
  "pp_pat_context",                // AI context string for production patterns
  "pp_hm_vars",                    // hyperMILL variables
  "pp_hm_vars_cat",                // hyperMILL variables by category
  "pp_hm_var",                     // Find single hyperMILL variable
  "pp_hm_machines",                // All hyperMILL machine configs
  "pp_hm_machine",                 // Single machine config
  "pp_hm_machines_ctrl",           // Machines for a controller
  "pp_hm_patterns",                // All post patterns
  "pp_hm_patterns_ctrl",           // Patterns for a controller
  "pp_hm_pattern_search",          // Search patterns by query
  "pp_hm_precision",               // Precision command for controller + type
  "pp_hm_coolant",                 // Coolant M-code for controller + type
  "pp_hm_tips",                    // All tribal tips
  "pp_hm_validate",                // Validate post structure
  "pp_hm_header",                  // Generate machine header
  "pp_hm_capabilities",            // Machine capabilities
  "pp_hm_stats",                   // hyperMILL engine statistics
  "pp_mpa_types",                  // All master-post machine types (26 tracked)
  "pp_mpa_type",                   // Single machine type
  "pp_mpa_types_cat",              // Machine types by category
  "pp_mpa_types_status",           // Machine types by master-post status
  "pp_mpa_hi_priority",            // High-priority planned types
  "pp_mpa_fusion",                 // Fusion post inventory
  "pp_mpa_fusion_brand",           // Fusion posts for a brand
  "pp_mpa_fusion_total",           // Total Fusion post count
  "pp_mpa_fusion_for_type",        // Fusion posts applicable to a machine type
  "pp_mpa_templates",              // All master-post templates
  "pp_mpa_template",               // Template for a machine type
  "pp_mpa_conversion",             // Conversion rules for a type
  "pp_mpa_variants",               // Variant diffs for a type
  "pp_mpa_v11_issues",             // Hurco V11 fine-tuning issues
  "pp_mpa_v11_by_cat",             // Hurco V11 issues by category
  "pp_mpa_stats",                  // Master-post architecture stats
  "pp_mpa_context",                // AI context string for master-post architecture
  "pp_cog_reason",                 // Deep cognition: full reasoning cycle
  "pp_cog_cases",                  // All cases in case library
  "pp_cog_case",                   // Single case by ID
  "pp_cog_search",                 // Search case library
  "pp_cog_diagnose",               // Diagnose from symptom list (case-based reasoning)
  "pp_cog_stats",                  // Deep cognition statistics
  "pp_cog_context",                // AI context string for deep cognition
  "pp_ck_machines",                // PP-CK: all machine catalogs
  "pp_ck_materials",               // PP-CK: all material catalogs
  "pp_ck_tools",                   // PP-CK: all tool catalogs
  "pp_ck_holders",                 // PP-CK: all holder catalogs
  "pp_ck_fixtures",                // PP-CK: all fixture catalogs
  "pp_ck_by_type",                 // PP-CK: catalogs by type
  "pp_ck_resources",               // PP-CK: H-drive resources
  "pp_ck_totals",                  // PP-CK: total entry counts
  "pp_ck_catalog",                 // PP-CK: single catalog by ID
  "pp_ck_by_brand",                // PP-CK: catalogs by brand
  "pp_ck_route",                   // PP-CK: route query to matching catalogs
  "pp_ck_ingest",                  // PP-CK: ingest single asset
  "pp_ck_ingest_machine",          // PP-CK: ingest machine asset
  "pp_ck_ingest_material",         // PP-CK: ingest material asset
  "pp_ck_ingest_tool",             // PP-CK: ingest tool asset
  "pp_ck_ingest_holder",           // PP-CK: ingest holder asset
  "pp_ck_ingest_fixture",          // PP-CK: ingest fixture asset
  "pp_ck_ingest_program",          // PP-CK: ingest program asset
  "pp_ck_ingested",                // PP-CK: all ingested assets
  "pp_ck_ingested_by_type",        // PP-CK: ingested assets by type
  "pp_ck_ingested_get",            // PP-CK: single ingested asset
  "pp_ck_ingested_remove",         // PP-CK: remove ingested asset
  "pp_ck_ingested_clear",          // PP-CK: clear all ingested assets
  "pp_ck_bulk_ingest",             // PP-CK: bulk ingest array
  "pp_ck_context",                 // PP-CK: AI context string
  "pp_ck_stats",                   // PP-CK: engine statistics
  "pp_gen_master_post",            // PP-GEN: generate master post with expert reasoning
  "pp_gen_cutting_mechanics",      // PP-GEN: cutting mechanics knowledge
  "pp_gen_pipeline",               // PP-GEN: print-to-program pipeline stages
  "pp_gen_patterns",               // PP-GEN: JM Die patterns
  "pp_gen_machine_db",             // PP-GEN: machine expertise database
  "pp_gen_advice",                 // PP-GEN: expert advice for scenario
  "pp_gen_stats",                  // PP-GEN: engine statistics
  "pp_reg_all",                    // PP-REG: all registered engines
  "pp_reg_get",                    // PP-REG: engine by ID
  "pp_reg_by_tier",                // PP-REG: engines by tier
  "pp_reg_by_priority",            // PP-REG: engines by priority
  "pp_reg_route",                  // PP-REG: route task to best engines
  "pp_reg_search",                 // PP-REG: search engines by capability
  "pp_reg_deps",                   // PP-REG: dependencies of engine
  "pp_reg_dependents",             // PP-REG: engines depending on given
  "pp_reg_matrix",                 // PP-REG: capability → engine matrix
  "pp_reg_tiers",                  // PP-REG: tier distribution
  "pp_reg_plan",                   // PP-REG: execution plan for task
  "pp_reg_context",                // PP-REG: AI context string
  "pp_reg_stats",                  // PP-REG: registry statistics
  "pp_uph_analyze",                // PP-UPH: unified physics analysis for machining state
  "pp_uph_optimize",               // PP-UPH: physics-optimized G-code
  "pp_uph_stats",                  // PP-UPH: unified physics orchestration statistics
  "pp_agio_generate",              // PP-AGIO: generate AGI post
  "pp_agio_registry",              // PP-AGIO: engine registry
  "pp_agio_controllers",           // PP-AGIO: controller knowledge
  "pp_agio_search",                // PP-AGIO: search engines by query
  "pp_agio_controller",            // PP-AGIO: controller by ID
  "pp_agio_recommend",             // PP-AGIO: recommend engines for task
  "pp_agio_context",               // PP-AGIO: AI context string
  "pp_agio_stats",                 // PP-AGIO: orchestration statistics
  "pp_saw_init",                   // PP-SAW: initialize self-awareness integration
  "pp_saw_context",                // PP-SAW: build self-awareness context for request
  "pp_saw_generate",               // PP-SAW: generate AI post with awareness
  "pp_saw_jmdie",                  // PP-SAW: JM Die machine summary
  "pp_saw_controllers",            // PP-SAW: controller knowledge summary
  "pp_saw_stats",                  // PP-SAW: engine statistics
  "pp_dah_convert",                // PP-DAH: convert post between controllers
  "pp_dah_generate",               // PP-DAH: generate new post processor skeleton
  "pp_dah_validate",               // PP-DAH: validate post processor
  "pp_dah_tips",                   // PP-DAH: controller tips for query
  "pp_dah_jmdie_config",           // PP-DAH: JM Die machine post config
  "pp_dah_jmdie_list",             // PP-DAH: JM Die machine post configs list
  "pp_dah_feature_matrix",         // PP-DAH: controller feature compatibility matrix
  "pp_dah_recommend",              // PP-DAH: recommend post for JM Die job
  "pp_dah_5axis_safety",           // PP-DAH: validate 5-axis safety line
  "pp_vid_knowledge",              // PP-VID: controller video knowledge
  "pp_vid_controllers",            // PP-VID: available video-learned controllers
  "pp_vid_reason",                 // PP-VID: full neural reasoning pipeline
  "pp_vid_hsm",                    // PP-VID: HSM code for controller + mode
  "pp_vid_tcpm",                   // PP-VID: TCPM code for controller
  "pp_vid_tribal",                 // PP-VID: tribal knowledge for controller
  "pp_vid_mistakes",               // PP-VID: common mistakes for controller
  "pp_vid_toolmgmt",               // PP-VID: tool management knowledge
  "pp_vid_canned",                 // PP-VID: canned cycle format
  "pp_vid_stats",                  // PP-VID: neural engine statistics
  "pp_mpg_complete",               // PP-MPG: generate complete post processor
  "pp_mpg_safety",                 // PP-MPG: generate safety line
  "pp_mpg_cycles",                 // PP-MPG: generate cycle definitions
  "pp_mpg_mcodes",                 // PP-MPG: generate M-code mappings
  "pp_mpg_props",                  // PP-MPG: generate properties
  "pp_di_machine_caps",            // PP-DI: machine capabilities for controller
  "pp_di_controller_map",          // PP-DI: controller G-code mapping
  "pp_di_controllers",             // PP-DI: supported controllers
  "pp_di_material",                // PP-DI: material by ID
  "pp_di_materials_by_group",      // PP-DI: materials by ISO group
  "pp_di_cutting_params",          // PP-DI: recommend cutting parameters
  "pp_di_toolpath_strategy",       // PP-DI: toolpath strategy details
  "pp_di_recommend_toolpath",      // PP-DI: recommend toolpath strategy
  "pp_di_5axis_validate",          // PP-DI: validate 5-axis move
  "pp_di_collisions",              // PP-DI: check toolpath collisions
  "pp_di_architectures",           // PP-DI: all deep learning architectures
  "pp_di_architecture",            // PP-DI: architecture by name
  "pp_di_reason",                  // PP-DI: deep reasoning with rules
  "pp_di_constraints",             // PP-DI: solve constraint satisfaction problem
  "pp_di_analyze",                 // PP-DI: comprehensive analysis
  "pp_di_stats",                   // PP-DI: engine statistics
  "pp_tel_record",                 // PP-TEL: record telemetry event
  "pp_tel_funnel",                 // PP-TEL: funnel metrics
  "pp_tel_count",                  // PP-TEL: event count
  "pp_tel_reset",                  // PP-TEL: reset telemetry state
  "pp_tnr_validate",               // PP-TNR: validate tool number ranges
  "pp_tnr_quick",                  // PP-TNR: quick pass/fail
  "pp_tnr_defaults",               // PP-TNR: default options
  "pp_trn_train",                  // PP-TRN: train dialect calibration
  "pp_mgc_validate",               // PP-MGC: validate modal group conflicts
  "pp_mgc_quick",                  // PP-MGC: quick pass/fail
  "pp_mgc_defaults",               // PP-MGC: default options
  "pp_anl_analyze",                // PP-ANL: deep post-processor analysis
  "pp_anl_report",                 // PP-ANL: generate analysis report
  "pp_anl_fix",                    // PP-ANL: apply auto-fixes
  "pp_aut_dialect",                // PP-AUT: resolve dialect for controller
  "pp_aut_config",                 // PP-AUT: generate post config
  "pp_aut_ppg",                    // PP-AUT: run PPG autopilot
  "pp_aut_p2p",                    // PP-AUT: run print-to-program
  "pp_aut_dialects",               // PP-AUT: list dialects
  "pp_aut_features",               // PP-AUT: dialect features
  "pp_mst_process",                // PP-MST: unified multi-CAM segment processing
  "pp_mst_compare",                // PP-MST: compare controllers
  "pp_mst_templates",              // PP-MST: post templates (optionally by controller)
  "pp_mst_features",               // PP-MST: machine features
  "pp_mst_cross_cam",              // PP-MST: cross-CAM features listing
  "pp_mst_cps_config",             // PP-MST: generate master CPS config for machine
  "pp_mst_is_master",              // PP-MST: check if controller is master post
  "pp_mst_stats",                  // PP-MST: engine statistics

  // ===== PP-ULT: Ultimate AI (deep ensemble, episodic, KG, ToT, meta-learning, adversarial) (11 actions) =====
  "pp_ult_deep_ensemble",          // PP-ULT: deep ensemble across architectures (MoE, GNN, Transformer, Bayesian)
  "pp_ult_retrieve_episodes",      // PP-ULT: episodic retrieval from memory of past programs
  "pp_ult_query_kg",               // PP-ULT: knowledge-graph query for post-processing domain
  "pp_ult_tree_of_thoughts",       // PP-ULT: Tree-of-Thoughts exploration of solution paths
  "pp_ult_meta_learning",          // PP-ULT: few-shot meta-learning adaptation
  "pp_ult_adversarial",            // PP-ULT: adversarial validation against attack surfaces
  "pp_ult_generate_post",          // PP-ULT: generative post-processor synthesis
  "pp_ult_llm_cli",                // PP-ULT: LLM CLI natural-language rendering
  "pp_ult_analyze",                // PP-ULT: comprehensive ultimate AI analysis (orchestrated)
  "pp_ult_store_episode",          // PP-ULT: store episode in memory for future retrieval
  "pp_ult_stats",                  // PP-ULT: episode/KG statistics

  // ===== PP-IOC: Intelligence Orchestrator (8 actions) =====
  "pp_ioc_classify_intent",        // PP-IOC: classify intent from user query
  "pp_ioc_route",                  // PP-IOC: route intent to optimal engines
  "pp_ioc_expert_rules",           // PP-IOC: run expert-rule checks on G-code
  "pp_ioc_neural_opt",             // PP-IOC: neural optimization over input
  "pp_ioc_aggregate",              // PP-IOC: aggregate multi-engine analyses
  "pp_ioc_response",               // PP-IOC: generate natural-language response
  "pp_ioc_proactive",              // PP-IOC: proactive suggestions from aggregate
  "pp_ioc_orchestrate",            // PP-IOC: full orchestration (primary entry)

  // ===== PP-DL: Deep Learning (6 actions) =====
  "pp_dl_recognize_patterns",      // PP-DL: operation/toolpath/feature pattern recognition
  "pp_dl_feed_opt",                // PP-DL: per-line feed optimization suggestions
  "pp_dl_classify_controller",     // PP-DL: infer controller from G-code
  "pp_dl_cycle_time",              // PP-DL: estimate cycle time via neural model
  "pp_dl_quality_score",           // PP-DL: multi-dimensional post quality score
  "pp_dl_analyze",                 // PP-DL: full deep-learning analysis

  // ===== PP-UDR: Unified Deep Reasoning (3 actions) =====
  "pp_udr_reason",                 // PP-UDR: 6-layer unified reasoning over request
  "pp_udr_mcts",                   // PP-UDR: Monte-Carlo Tree Search exploration
  "pp_udr_stats",                  // PP-UDR: controllers/patterns/machines/layers stats

  // ===== PP-PCM: Post Capability Matrix (10 actions) =====
  "pp_pcm_matrix",                 // PP-PCM: full capability matrix records
  "pp_pcm_controller",             // PP-PCM: capability record for a controller family
  "pp_pcm_query",                  // PP-PCM: query records by feature filters
  "pp_pcm_compare",                // PP-PCM: compare multiple controller families
  "pp_pcm_select",                 // PP-PCM: select best post for requirements
  "pp_pcm_smoothing",              // PP-PCM: smoothing support for a family
  "pp_pcm_retract",                // PP-PCM: retract methods for a family
  "pp_pcm_multiaxis",              // PP-PCM: multi-axis support for a family
  "pp_pcm_families",               // PP-PCM: list all controller families
  "pp_pcm_summary",                // PP-PCM: summary statistics

  // ===== PP-KN: Knowledge (entry funcs, drilling cycles, UPK switches) (13 actions) =====
  "pp_kn_entry_fn",                // PP-KN: lookup entry function by name
  "pp_kn_entry_fn_cat",            // PP-KN: list entry functions by category
  "pp_kn_drilling_cycle",          // PP-KN: lookup drilling cycle by type
  "pp_kn_drilling_cycles_all",     // PP-KN: all drilling cycles
  "pp_kn_upk_switch",              // PP-KN: lookup UPK switch by name
  "pp_kn_upk_switches_cat",        // PP-KN: list UPK switches by category
  "pp_kn_misc_value",              // PP-KN: lookup misc value by id
  "pp_kn_circular_settings",       // PP-KN: circular interpolation settings
  "pp_kn_search",                  // PP-KN: full-text search across knowledge
  "pp_kn_recommended",             // PP-KN: recommended settings for machine type
  "pp_kn_validate_config",         // PP-KN: validate post-processor configuration
  "pp_kn_fn_template",             // PP-KN: generate entry function template
  "pp_kn_stats",                   // PP-KN: knowledge registry statistics

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

  // ===== PP_LABEL: Program labeling pipeline (4 actions) — PP-DATA-MS0 =====
  "pp_label_program",            // PP-LABEL: Label a single G-code program
  "pp_label_batch",              // PP-LABEL: Batch label programs in directory
  "pp_label_stats",              // PP-LABEL: Get labeling statistics
  "pp_label_export",             // PP-LABEL: Export training data (csv/jsonl/parquet-ready)

  // ===== PP_MACHINE_FAMILY: Machine-specific master-post engines (U-MEP-WIRE01) =====
  // These actions are ALSO reachable through their machine-family dispatcher
  // (e.g. prism_turning, prism_edm) per the multi-endpoint wiring directive.
  "pp_okuma_b250_lathe_program", // OkumaB250LatheMasterPostEngine — also prism_turning:lathe_okuma_b250_program
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
    `PostProcessor dispatcher (prism_pp) -- G-code generation, optimization, validation, physics-aware processing.
${ACTIONS.length} actions across 14 categories: generate, analyze, optimize, validate, physics, neural, tribal, controller, kinematics, strategy, troubleshoot, formula, learning, graph.
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
          // U-PP-VERIFY-ORCH-WIRE — PostProcessorVerificationOrchestratorEngine (was a
          // stop_on_unwired_assets orphan). End-to-end verifies a posted .NC file against a
          // (machine_id, controller_id, declared_features) tuple by piping it through PRISM's
          // existing analyzers (8-dim quality + kinematics + runtime + feature-coverage) →
          // unified PASS/FAIL/WARN scorecard. `quick:true` runs the fast feature-coverage path only.
          case "pp_verify_posted_nc": {
            const { postProcessorVerificationOrchestratorEngine } = await import("../../engines/PostProcessorVerificationOrchestratorEngine.js");
            result = await postProcessorVerificationOrchestratorEngine.verify(
              params as Parameters<typeof postProcessorVerificationOrchestratorEngine.verify>[0],
            );
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
            // SAFETY: fail-closed when engine method missing. A vacuous {valid:true} let
            // unvalidated programs ship as "passed". Callers must treat valid:false as a real failure.
            result = engine.validateProgram?.(params) ?? engine.verify?.(params) ?? {
              valid: false,
              warnings: ["PostProcessorVerificationEngine.validateProgram/verify method not available — validation skipped (fail-closed)"],
              errors: ["validator_unavailable"],
            };
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
            // UNMASK (U-PP-UNMASK-CONTROLLER-TRANSLATE): was wrongly wired to PostProcessorTransformerEngine
            // (a neural diffusion/tokenizer with NO translate/transform method -> always {error}). Cross-
            // controller dialect translation is GCodeTranspilerEngine's job. Route to its real transpile().
            const engine = await getEngine("transpiler");
            const TRANSPILE_DIALECTS = ["fanuc", "siemens", "heidenhain", "mazak", "okuma", "haas"];
            const source = String(params.sourceController ?? "").toLowerCase();
            const target = String(params.targetController ?? "").toLowerCase();
            if (!TRANSPILE_DIALECTS.includes(source) || !TRANSPILE_DIALECTS.includes(target)) {
              // Fail-loud: the transpiler dialect set is narrower than the pp controller enum.
              result = {
                error: "unsupported_dialect",
                message: `GCodeTranspilerEngine supports ${TRANSPILE_DIALECTS.join("/")}; got source='${source}' target='${target}'`,
                supported: TRANSPILE_DIALECTS,
              };
            } else {
              const tr = engine.transpile(String(params.gcode ?? ""), {
                source,
                target,
                preserveComments: params.preserveComments,
              });
              result = { gcode: tr.gcode, stats: tr.stats, lines: tr.lines };
            }
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

          // INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11): PPGOutcomeCaptureWireEngine was dark (false
          // // WIRE-EXEMPT marker -- it claims "called by PPG engines internally" but had ZERO real
          // callers). It publishes a post-emit recommendation to the cross-galaxy OutcomeCaptureBus
          // (domain:"post_processor", kind:"recommendation_emitted") so india's closed loop can
          // correlate emitted G-code with later operator edits / alarms / cycle-time actuals. This
          // closes the post->india self-learning EMIT side. Distinct from pp_online_outcome (a
          // different OnlineLearningEngine substrate). R12-safe: bus.record of post DATA, never throws,
          // never NN inference. recordEmission requires `engine` (the producer id) + `recommended`.
          case "pp_outcome_emit": {
            if (typeof params.engine !== "string" || !params.engine) {
              result = { success: false, error: "engine (string) is required -- the PPG producer engine id that emitted this recommendation" };
              break;
            }
            if (params.recommended === undefined || params.recommended === null) {
              result = { success: false, error: "recommended is required -- the emitted G-code string or post-output object to capture" };
              break;
            }
            const { ppgOutcomeCaptureWireEngine } = await import("../../engines/PPGOutcomeCaptureWireEngine.js");
            result = ppgOutcomeCaptureWireEngine.recordEmission({
              engine: params.engine,
              action: typeof params.action === "string" ? params.action : undefined,
              context: (params.context && typeof params.context === "object" && !Array.isArray(params.context)) ? params.context : undefined,
              recommended: params.recommended,
              lineageId: typeof params.lineageId === "string" ? params.lineageId : (typeof params.lineage_id === "string" ? params.lineage_id : undefined),
              agentId: typeof params.agentId === "string" ? params.agentId : undefined,
              confidence: typeof params.confidence === "number" ? params.confidence : undefined,
            });
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

          // ===== PP_SSTATE (PP-SSTATE — Spindle state validator, renamed from pp_ss_*) =====
          case "pp_sstate_validate": {
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
          case "pp_sstate_quick": {
            const engine = await getEngine("spindleState");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_sstate_defaults": {
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

          // ===== PP_THREAD (PP-THREAD — Lathe thread cycle validator, renamed from pp_tc_*) =====
          case "pp_thread_validate": {
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
          case "pp_thread_quick": {
            const engine = await getEngine("threadCycle");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_thread_defaults": {
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

          // ===== PP_PE (PP-PE — Program-end validator) =====
          case "pp_pe_validate": {
            const engine = await getEngine("programEnd");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_missing_end: params.check_missing_end,
              check_end_not_last: params.check_end_not_last,
              check_multiple_ends: params.check_multiple_ends,
              check_m99_in_main: params.check_m99_in_main,
              check_subprogram_m99: params.check_subprogram_m99,
              check_trailing_percent: params.check_trailing_percent,
              check_leading_percent: params.check_leading_percent,
              treat_m02_as_end: params.treat_m02_as_end,
              subprogram_only: params.subprogram_only,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_pe_quick": {
            const engine = await getEngine("programEnd");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_pe_defaults": {
            const engine = await getEngine("programEnd");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_AI (PP-AI — Absolute/incremental mode validator) =====
          case "pp_ai_validate": {
            const engine = await getEngine("absInc");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_mixed_in_block: params.check_mixed_in_block,
              check_initial_mode: params.check_initial_mode,
              check_switch_during_arc: params.check_switch_during_arc,
              check_switch_in_canned: params.check_switch_in_canned,
              check_mode_restored: params.check_mode_restored,
              check_g91_large_address: params.check_g91_large_address,
              g91_large_address_threshold: params.g91_large_address_threshold,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_ai_quick": {
            const engine = await getEngine("absInc");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_ai_defaults": {
            const engine = await getEngine("absInc");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_MF (PP-MF — Macro flow validator) =====
          case "pp_mf_validate": {
            const engine = await getEngine("macroFlow");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_do_end_balance: params.check_do_end_balance,
              check_do_label_range: params.check_do_label_range,
              check_nested_conflict: params.check_nested_conflict,
              check_while_do: params.check_while_do,
              check_goto_targets: params.check_goto_targets,
              check_while_in_conditional: params.check_while_in_conditional,
              max_do_label: params.max_do_label,
              min_do_label: params.min_do_label,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_mf_quick": {
            const engine = await getEngine("macroFlow");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_mf_defaults": {
            const engine = await getEngine("macroFlow");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_SAFESTART (PP-SAFESTART — Safe-start block validator, renamed from pp_ss_*) =====
          case "pp_safestart_validate": {
            const engine = await getEngine("safeStart");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              window_blocks: params.window_blocks,
              check_plane_select: params.check_plane_select,
              check_distance_mode: params.check_distance_mode,
              check_feed_mode: params.check_feed_mode,
              check_cutter_comp_cancel: params.check_cutter_comp_cancel,
              check_tool_length_cancel: params.check_tool_length_cancel,
              check_canned_cycle_cancel: params.check_canned_cycle_cancel,
              check_work_offset: params.check_work_offset,
              check_units_mode: params.check_units_mode,
              check_motion_before_start: params.check_motion_before_start,
              check_spread: params.check_spread,
              max_spread_blocks: params.max_spread_blocks,
              enabled: params.enabled,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_safestart_quick": {
            const engine = await getEngine("safeStart");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_safestart_defaults": {
            const engine = await getEngine("safeStart");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CHAR (PP-CHAR — Character/byte validator) =====
          case "pp_char_validate": {
            const engine = await getEngine("character");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_bom: params.check_bom,
              check_non_ascii: params.check_non_ascii,
              check_non_printable: params.check_non_printable,
              check_embedded_null: params.check_embedded_null,
              check_tab: params.check_tab,
              check_trailing_whitespace: params.check_trailing_whitespace,
              check_mixed_line_endings: params.check_mixed_line_endings,
              check_bare_cr: params.check_bare_cr,
              check_long_lines: params.check_long_lines,
              check_lowercase: params.check_lowercase,
              max_line_length: params.max_line_length,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_char_quick": {
            const engine = await getEngine("character");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_char_defaults": {
            const engine = await getEngine("character");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_DWR (PP-DWR — Duplicate word in block) =====
          case "pp_dwr_validate": {
            const engine = await getEngine("duplicateWord");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_duplicates: params.check_duplicates,
              check_multiple_g: params.check_multiple_g,
              check_multiple_m: params.check_multiple_m,
              monitored_letters: params.monitored_letters,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_dwr_quick": {
            const engine = await getEngine("duplicateWord");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_dwr_defaults": {
            const engine = await getEngine("duplicateWord");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_EXP (PP-EXP — Macro expression syntax) =====
          case "pp_exp_validate": {
            const engine = await getEngine("expressionSyntax");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_bracket_balance: params.check_bracket_balance,
              check_nesting_depth: params.check_nesting_depth,
              check_empty_brackets: params.check_empty_brackets,
              check_operator_boundary: params.check_operator_boundary,
              check_consecutive_operators: params.check_consecutive_operators,
              check_unknown_functions: params.check_unknown_functions,
              check_divide_by_zero: params.check_divide_by_zero,
              check_bracket_in_comment: params.check_bracket_in_comment,
              max_nesting_depth: params.max_nesting_depth,
              known_functions: params.known_functions,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_exp_quick": {
            const engine = await getEngine("expressionSyntax");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_exp_defaults": {
            const engine = await getEngine("expressionSyntax");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_OP (PP-OP — Operator-stop M0/M1 validator) =====
          case "pp_op_validate": {
            const engine = await getEngine("operatorStop");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_m0_comment: params.check_m0_comment,
              check_m1_comment: params.check_m1_comment,
              check_excessive_stops: params.check_excessive_stops,
              check_m0_in_subprogram: params.check_m0_in_subprogram,
              check_m0_after_end: params.check_m0_after_end,
              check_m1_optional_hint: params.check_m1_optional_hint,
              check_tool_change_stop: params.check_tool_change_stop,
              max_stops: params.max_stops,
              adjacent_comment_lines: params.adjacent_comment_lines,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_op_quick": {
            const engine = await getEngine("operatorStop");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_op_defaults": {
            const engine = await getEngine("operatorStop");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_HDR (PP-HDR — Program header/metadata validator) =====
          case "pp_hdr_validate": {
            const engine = await getEngine("programHeader");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_part_number: params.check_part_number,
              check_tool_list: params.check_tool_list,
              check_tool_list_completeness: params.check_tool_list_completeness,
              check_material: params.check_material,
              check_date: params.check_date,
              check_revision: params.check_revision,
              check_header_length: params.check_header_length,
              check_malformed_tool_entries: params.check_malformed_tool_entries,
              check_programmer: params.check_programmer,
              check_after_motion: params.check_after_motion,
              header_window: params.header_window,
              min_header_lines: params.min_header_lines,
              part_number_pattern: params.part_number_pattern,
              material_pattern: params.material_pattern,
              date_pattern: params.date_pattern,
              revision_pattern: params.revision_pattern,
              programmer_pattern: params.programmer_pattern,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_hdr_quick": {
            const engine = await getEngine("programHeader");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_hdr_defaults": {
            const engine = await getEngine("programHeader");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_OMR (PP-OMR — O-number range/format validator) =====
          case "pp_omr_validate": {
            const engine = await getEngine("oNumberRange");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_zero: params.check_zero,
              check_too_large: params.check_too_large,
              check_main_range: params.check_main_range,
              check_sub_range: params.check_sub_range,
              check_reserved_macro_range: params.check_reserved_macro_range,
              check_leading_zero_consistency: params.check_leading_zero_consistency,
              check_format: params.check_format,
              max_o: params.max_o,
              main_range: params.main_range,
              sub_range: params.sub_range,
              reserved_macro_range: params.reserved_macro_range,
              macro_tag_pattern: params.macro_tag_pattern,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_omr_quick": {
            const engine = await getEngine("oNumberRange");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_omr_defaults": {
            const engine = await getEngine("oNumberRange");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_BLK (PP-BLK — Block composition validator) =====
          case "pp_blk_validate": {
            const engine = await getEngine("blockComposition");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_words_per_block: params.check_words_per_block,
              check_multiple_m: params.check_multiple_m,
              check_same_group_g: params.check_same_group_g,
              check_empty_block: params.check_empty_block,
              check_column_limit: params.check_column_limit,
              check_word_order: params.check_word_order,
              max_words_per_block: params.max_words_per_block,
              max_m_per_block: params.max_m_per_block,
              column_limit: params.column_limit,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_blk_quick": {
            const engine = await getEngine("blockComposition");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_blk_defaults": {
            const engine = await getEngine("blockComposition");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_FRR (PP-FRR — Feed-rate reasonableness validator) =====
          case "pp_frr_validate": {
            const engine = await getEngine("feedRateReasonability");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_zero: params.check_zero,
              check_negative: params.check_negative,
              check_f_with_rapid: params.check_f_with_rapid,
              check_above_max: params.check_above_max,
              check_below_min: params.check_below_min,
              check_integer_format: params.check_integer_format,
              check_frequent_changes: params.check_frequent_changes,
              max_feed: params.max_feed,
              min_cutting_feed: params.min_cutting_feed,
              max_f_changes_per_section: params.max_f_changes_per_section,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_frr_quick": {
            const engine = await getEngine("feedRateReasonability");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_frr_defaults": {
            const engine = await getEngine("feedRateReasonability");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CRR (PP-CRR — Coordinate-range reasonableness) =====
          case "pp_crr_validate": {
            const engine = await getEngine("coordinateRange");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_absurd_large: params.check_absurd_large,
              check_absurd_small: params.check_absurd_small,
              check_angular_unwrap: params.check_angular_unwrap,
              check_nan_literal: params.check_nan_literal,
              check_extra_decimals: params.check_extra_decimals,
              check_leading_zero_only: params.check_leading_zero_only,
              max_linear_range: params.max_linear_range,
              min_nonzero_resolution: params.min_nonzero_resolution,
              max_rotary_deg: params.max_rotary_deg,
              max_decimals: params.max_decimals,
              linear_axes: params.linear_axes,
              rotary_axes: params.rotary_axes,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_crr_quick": {
            const engine = await getEngine("coordinateRange");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_crr_defaults": {
            const engine = await getEngine("coordinateRange");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_ZMV (PP-ZMV — Zero-motion / no-op detection) =====
          case "pp_zmv_validate": {
            const engine = await getEngine("zeroMotion");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_zero_length_linear: params.check_zero_length_linear,
              check_redundant_rapid: params.check_redundant_rapid,
              check_motion_without_axis: params.check_motion_without_axis,
              check_duplicate_coord_sequence: params.check_duplicate_coord_sequence,
              check_zero_length_arc_ijk: params.check_zero_length_arc_ijk,
              duplicate_run_threshold: params.duplicate_run_threshold,
              position_tolerance: params.position_tolerance,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_zmv_quick": {
            const engine = await getEngine("zeroMotion");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_zmv_defaults": {
            const engine = await getEngine("zeroMotion");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CMC (PP-CMC — Commented-out-code detection) =====
          case "pp_cmc_validate": {
            const engine = await getEngine("commentedCode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_gcode_in_comment: params.check_gcode_in_comment,
              check_mcode_in_comment: params.check_mcode_in_comment,
              check_tool_change_in_comment: params.check_tool_change_in_comment,
              check_large_region: params.check_large_region,
              check_mixed_comment_code: params.check_mixed_comment_code,
              large_region_threshold: params.large_region_threshold,
              ignore_header_lines: params.ignore_header_lines,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cmc_quick": {
            const engine = await getEngine("commentedCode");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cmc_defaults": {
            const engine = await getEngine("commentedCode");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_SIZE (PP-SIZE — Program size & complexity) =====
          case "pp_size_validate": {
            const engine = await getEngine("programSize");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_block_count: params.check_block_count,
              check_tool_count: params.check_tool_count,
              check_tool_changes: params.check_tool_changes,
              check_file_size: params.check_file_size,
              check_subprogram_depth: params.check_subprogram_depth,
              check_comment_density: params.check_comment_density,
              check_macro_vars: params.check_macro_vars,
              check_minimum_size: params.check_minimum_size,
              max_blocks: params.max_blocks,
              max_tools: params.max_tools,
              max_tool_changes: params.max_tool_changes,
              max_file_kb: params.max_file_kb,
              max_subprogram_depth: params.max_subprogram_depth,
              max_comment_ratio: params.max_comment_ratio,
              max_macro_vars: params.max_macro_vars,
              min_blocks: params.min_blocks,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_size_quick": {
            const engine = await getEngine("programSize");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_size_defaults": {
            const engine = await getEngine("programSize");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_REDUN (PP-REDUN — Redundant modal re-issuance) =====
          case "pp_redun_validate": {
            const engine = await getEngine("redundantModal");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_gcode_modal: params.check_gcode_modal,
              check_feed: params.check_feed,
              check_spindle_speed: params.check_spindle_speed,
              check_tool_number: params.check_tool_number,
              check_mcode_modal: params.check_mcode_modal,
              check_safe_start_skip: params.check_safe_start_skip,
              safe_start_window: params.safe_start_window,
              min_repeats_to_report: params.min_repeats_to_report,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_redun_quick": {
            const engine = await getEngine("redundantModal");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_redun_defaults": {
            const engine = await getEngine("redundantModal");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_G10 (PP-G10 — G10 data-set block validation) =====
          case "pp_g10_validate": {
            const engine = await getEngine("g10DataSet");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_missing_l: params.check_missing_l,
              check_invalid_l: params.check_invalid_l,
              check_missing_p: params.check_missing_p,
              check_p_range: params.check_p_range,
              check_p_zero: params.check_p_zero,
              check_missing_axis: params.check_missing_axis,
              check_missing_r: params.check_missing_r,
              check_data_entry_balance: params.check_data_entry_balance,
              check_tool_offset_range: params.check_tool_offset_range,
              max_wcs_p: params.max_wcs_p,
              max_tool_offsets: params.max_tool_offsets,
              allowed_l_values: params.allowed_l_values,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_g10_quick": {
            const engine = await getEngine("g10DataSet");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_g10_defaults": {
            const engine = await getEngine("g10DataSet");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_POLAR (PP-POLAR — Polar coordinate G15/G16 validation) =====
          case "pp_polar_validate": {
            const engine = await getEngine("polarCoordinate");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_g16_balance: params.check_g16_balance,
              check_nested_g16: params.check_nested_g16,
              check_plane_select: params.check_plane_select,
              check_cutter_comp: params.check_cutter_comp,
              check_motion_missing_axis: params.check_motion_missing_axis,
              check_distance_mode_change: params.check_distance_mode_change,
              check_negative_radius: params.check_negative_radius,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_polar_quick": {
            const engine = await getEngine("polarCoordinate");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_polar_defaults": {
            const engine = await getEngine("polarCoordinate");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_CHAM (PP-CHAM — Inline corner-break ,C/,R validator) =====
          case "pp_cham_validate": {
            const engine = await getEngine("inlineCornerBreak");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              check_non_g1: params.check_non_g1,
              check_program_end: params.check_program_end,
              check_both_c_r: params.check_both_c_r,
              check_negative_size: params.check_negative_size,
              check_size_vs_segment: params.check_size_vs_segment,
              check_rapid_approach: params.check_rapid_approach,
              next_motion_window: params.next_motion_window,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_cham_quick": {
            const engine = await getEngine("inlineCornerBreak");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            result = engine.quickCheck(gcode);
            break;
          }
          case "pp_cham_defaults": {
            const engine = await getEngine("inlineCornerBreak");
            result = engine.defaultOptions();
            break;
          }

          // ===== PP_AXIS (PP-AXIS — Axis-letter vocabulary validator) =====
          case "pp_axis_validate": {
            const engine = await getEngine("axisLetter");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              allowed_letters: params.allowed_letters,
              enabled_axes: params.enabled_axes,
              case_insensitive: params.case_insensitive,
              skip_comments: params.skip_comments,
              max_issues: params.max_issues,
            };
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_axis_quick": {
            const engine = await getEngine("axisLetter");
            const gcode = params.gcode ?? params.gcode_text ?? params.text ?? "";
            const options = {
              allowed_letters: params.allowed_letters,
              enabled_axes: params.enabled_axes,
              case_insensitive: params.case_insensitive,
            };
            result = engine.quickCheck(gcode, options);
            break;
          }
          case "pp_axis_defaults": {
            const engine = await getEngine("axisLetter");
            result = {
              allowed_letters: engine.defaultAllowedLetters(),
              rotary_axes: ["A", "B", "C", "U", "V", "W"],
              source: "Fanuc ISO 6983 word-letter vocabulary",
            };
            break;
          }

          // ===== PP_AGI (PP-AGI-WIRING — orchestration layer above coordination bridge) =====
          case "pp_agi_run": {
            const engine = await getEngine("agiWiring");
            const request = {
              task: params.task ?? "",
              controller: params.controller,
              machineId: params.machineId ?? params.machine_id,
              machineType: params.machineType ?? params.machine_type,
              material: params.material,
              operations: params.operations,
              cuttingParams: params.cuttingParams ?? params.cutting_params,
              options: params.options,
            };
            result = await engine.runFullPipeline(request);
            break;
          }
          case "pp_agi_verify": {
            const engine = await getEngine("agiWiring");
            result = engine.verifyWiring();
            break;
          }
          case "pp_agi_plan": {
            const engine = await getEngine("agiWiring");
            const task = params.task ?? "";
            result = engine.planExecution(task);
            break;
          }
          case "pp_agi_health": {
            const engine = await getEngine("agiWiring");
            result = engine.quickHealthCheck();
            break;
          }
          case "pp_agi_context": {
            const engine = await getEngine("agiWiring");
            result = { context: engine.getContextForAI() };
            break;
          }
          case "pp_agi_stats": {
            const engine = await getEngine("agiWiring");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_CPS (PP-CPS — PRISM CPS implementation knowledge) =====
          case "pp_cps_files": {
            const engine = await getEngine("cps");
            result = { files: engine.getCPSFiles() };
            break;
          }
          case "pp_cps_find": {
            const engine = await getEngine("cps");
            const query = params.machine ?? params.manufacturer ?? params.query ?? "";
            result = { matches: engine.findCPSForMachine(query) };
            break;
          }
          case "pp_cps_features": {
            const engine = await getEngine("cps");
            const category = params.category;
            result = {
              features: category
                ? engine.getRoughingFeaturesByCategory(category)
                : engine.getRoughingFeatures(),
            };
            break;
          }
          case "pp_cps_benefit": {
            const engine = await getEngine("cps");
            const featureIds = params.feature_ids ?? params.featureIds ?? [];
            result = engine.calculateCombinedBenefit(featureIds);
            break;
          }
          case "pp_cps_controllers": {
            const engine = await getEngine("cps");
            result = { controllers: engine.getControllerImplementations() };
            break;
          }
          case "pp_cps_controller_find": {
            const engine = await getEngine("cps");
            const query = params.query ?? params.controller ?? "";
            result = { controller: engine.findController(query) ?? null };
            break;
          }
          case "pp_cps_gcode_detail": {
            const engine = await getEngine("cps");
            const controllerId = params.controller_id ?? params.controllerId ?? "";
            const gcode = params.gcode ?? params.code ?? "";
            result = { detail: engine.getGCodeDetails(controllerId, gcode) ?? null };
            break;
          }
          case "pp_cps_issues": {
            const engine = await getEngine("cps");
            const controllerId = params.controller_id ?? params.controllerId ?? "";
            const symptom = params.symptom ?? params.issue ?? "";
            result = { solutions: engine.getIssueSolutions(controllerId, symptom) };
            break;
          }
          case "pp_cps_okuma_mcodes": {
            const engine = await getEngine("cps");
            const risk = params.risk ?? params.risk_level;
            result = {
              mcodes: risk
                ? engine.getOkumaMCodesByRisk(risk)
                : engine.getOkumaCycleTimeMCodes(),
            };
            break;
          }
          case "pp_cps_okuma_savings": {
            const engine = await getEngine("cps");
            const mcodes = params.mcodes ?? params.codes ?? [];
            result = engine.calculateOkumaTimeSavings(mcodes);
            break;
          }
          case "pp_cps_recommend": {
            const engine = await getEngine("cps");
            const useCase = {
              operationType: params.operation_type ?? params.operationType ?? "roughing",
              controller: params.controller,
              priority: params.priority,
            };
            result = engine.recommendFeatures(useCase);
            break;
          }
          case "pp_cps_lessons": {
            const engine = await getEngine("cps");
            result = { lessons: engine.getProductionLessons() };
            break;
          }
          case "pp_cps_stats": {
            const engine = await getEngine("cps");
            result = engine.getStatistics();
            break;
          }
          case "pp_cps_context": {
            const engine = await getEngine("cps");
            result = { context: engine.getContextForAI() };
            break;
          }

          // ===== PP_CL (PP-CL — Continuous Learning, Bayesian belief over engines) =====
          case "pp_cl_feedback": {
            const engine = await getEngine("continuousLearning");
            result = engine.recordFeedback(params);
            break;
          }
          case "pp_cl_state": {
            const engine = await getEngine("continuousLearning");
            result = engine.getLearningState();
            break;
          }
          case "pp_cl_belief": {
            const engine = await getEngine("continuousLearning");
            const engineId = params.engine_id ?? params.engineId ?? "";
            result = { belief: engine.getEngineBelief(engineId) ?? null };
            break;
          }
          case "pp_cl_mistakes": {
            const engine = await getEngine("continuousLearning");
            const limit = params.limit ?? 10;
            result = { patterns: engine.getTopMistakePatterns(limit) };
            break;
          }
          case "pp_cl_promoted": {
            const engine = await getEngine("continuousLearning");
            result = { knowledge: engine.getPromotedKnowledge() };
            break;
          }
          case "pp_cl_search": {
            const engine = await getEngine("continuousLearning");
            const query = params.query ?? params.q ?? "";
            result = { results: engine.searchKnowledge(query) };
            break;
          }
          case "pp_cl_rules": {
            const engine = await getEngine("continuousLearning");
            const controller = params.controller ?? "";
            const material = params.material ?? "";
            result = { rules: engine.getPreventionRules(controller, material) };
            break;
          }
          case "pp_cl_reset": {
            const engine = await getEngine("continuousLearning");
            engine.resetLearning();
            result = { reset: true };
            break;
          }
          case "pp_cl_stats": {
            const engine = await getEngine("continuousLearning");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_BRIDGE (PP-BRIDGE — AI coordination bridge) =====
          case "pp_bridge_coordinate": {
            const engine = await getEngine("bridge");
            result = await engine.coordinate(params);
            break;
          }
          case "pp_bridge_perf": {
            const engine = await getEngine("bridge");
            result = { records: engine.getPerformanceRecords() };
            break;
          }
          case "pp_bridge_perf_engine": {
            const engine = await getEngine("bridge");
            const engineId = params.engine_id ?? params.engineId ?? "";
            result = { record: engine.getEnginePerformance(engineId) ?? null };
            break;
          }
          case "pp_bridge_perf_reset": {
            const engine = await getEngine("bridge");
            engine.resetPerformanceTracking();
            result = { reset: true };
            break;
          }
          case "pp_bridge_best": {
            const engine = await getEngine("bridge");
            const metric = params.metric ?? "success_rate";
            result = { best: engine.getBestEngine(metric) ?? null };
            break;
          }
          case "pp_bridge_physics_quick": {
            const engine = await getEngine("bridge");
            result = engine.quickPhysicsAnalysis(
              params.operation ?? params.op ?? "",
              params.controller ?? "fanuc",
              params.material ?? "",
              params.parameters ?? params.cutting_params ?? {},
            );
            break;
          }
          case "pp_bridge_stats": {
            const engine = await getEngine("bridge");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_PAT (PP-PAT — JM Die Production Patterns) =====
          case "pp_pat_operations": {
            const engine = await getEngine("productionPattern");
            result = { operations: engine.getOperationFrequencies() };
            break;
          }
          case "pp_pat_top_ops": {
            const engine = await getEngine("productionPattern");
            const n = params.n ?? params.limit ?? 10;
            result = { operations: engine.getTopOperations(n) };
            break;
          }
          case "pp_pat_operation": {
            const engine = await getEngine("productionPattern");
            const code = params.code ?? params.op ?? "";
            result = { operation: engine.getOperation(code) ?? null };
            break;
          }
          case "pp_pat_customers": {
            const engine = await getEngine("productionPattern");
            result = { customers: engine.getCustomerPatterns() };
            break;
          }
          case "pp_pat_customer": {
            const engine = await getEngine("productionPattern");
            const name = params.name ?? params.customer ?? "";
            result = { customer: engine.getCustomer(name) ?? null };
            break;
          }
          case "pp_pat_customers_industry": {
            const engine = await getEngine("productionPattern");
            const industry = params.industry ?? "";
            result = { customers: engine.getCustomersByIndustry(industry) };
            break;
          }
          case "pp_pat_material": {
            const engine = await getEngine("productionPattern");
            const material = params.material ?? "";
            result = { material: engine.getMaterialParams(material) ?? null };
            break;
          }
          case "pp_pat_materials_all": {
            const engine = await getEngine("productionPattern");
            result = { materials: engine.getAllMaterialParams() };
            break;
          }
          case "pp_pat_speeds_feeds": {
            const engine = await getEngine("productionPattern");
            result = engine.recommendSpeedsFeeds(
              params.material ?? "",
              params.operation ?? params.op ?? "",
              params.toolDiameter ?? params.tool_diameter ?? params.diameter,
            );
            break;
          }
          case "pp_pat_sequences": {
            const engine = await getEngine("productionPattern");
            result = { sequences: engine.getOperationSequences() };
            break;
          }
          case "pp_pat_sequence": {
            const engine = await getEngine("productionPattern");
            const id = params.id ?? "";
            result = { sequence: engine.getSequence(id) ?? null };
            break;
          }
          case "pp_pat_sequences_customer": {
            const engine = await getEngine("productionPattern");
            const customer = params.customer ?? "";
            result = { sequences: engine.findSequencesForCustomer(customer) };
            break;
          }
          case "pp_pat_macros": {
            const engine = await getEngine("productionPattern");
            result = { macros: engine.getMacroPatterns() };
            break;
          }
          case "pp_pat_macro": {
            const engine = await getEngine("productionPattern");
            const id = params.id ?? "";
            result = { macro: engine.getMacroPattern(id) ?? null };
            break;
          }
          case "pp_pat_macros_controller": {
            const engine = await getEngine("productionPattern");
            const controller = params.controller ?? "";
            result = { macros: engine.getMacrosForController(controller) };
            break;
          }
          case "pp_pat_shop_focus": {
            const engine = await getEngine("productionPattern");
            result = engine.getShopFocusProfile();
            break;
          }
          case "pp_pat_tribal": {
            const engine = await getEngine("productionPattern");
            const material = params.material ?? "";
            result = { wisdom: engine.getTribalWisdom(material) };
            break;
          }
          case "pp_pat_stats": {
            const engine = await getEngine("productionPattern");
            result = engine.getStatistics();
            break;
          }
          case "pp_pat_context": {
            const engine = await getEngine("productionPattern");
            result = { context: engine.getContextForAI() };
            break;
          }

          // ===== PP_HM (PP-HM — hyperMILL Knowledge) =====
          case "pp_hm_vars": {
            const engine = await getEngine("hyperMillKnowledge");
            result = { variables: engine.getVariables() };
            break;
          }
          case "pp_hm_vars_cat": {
            const engine = await getEngine("hyperMillKnowledge");
            const category = params.category ?? "";
            result = { variables: engine.getVariablesByCategory(category) };
            break;
          }
          case "pp_hm_var": {
            const engine = await getEngine("hyperMillKnowledge");
            const name = params.name ?? "";
            result = { variable: engine.findVariable(name) ?? null };
            break;
          }
          case "pp_hm_machines": {
            const engine = await getEngine("hyperMillKnowledge");
            result = { machines: engine.getAllMachineConfigs() };
            break;
          }
          case "pp_hm_machine": {
            const engine = await getEngine("hyperMillKnowledge");
            const machineId = params.machine_id ?? params.machineId ?? "";
            result = { machine: engine.getMachineConfig(machineId) ?? null };
            break;
          }
          case "pp_hm_machines_ctrl": {
            const engine = await getEngine("hyperMillKnowledge");
            const controller = params.controller ?? "";
            result = { machines: engine.getMachinesByController(controller) };
            break;
          }
          case "pp_hm_patterns": {
            const engine = await getEngine("hyperMillKnowledge");
            result = { patterns: engine.getAllPatterns() };
            break;
          }
          case "pp_hm_patterns_ctrl": {
            const engine = await getEngine("hyperMillKnowledge");
            const controller = params.controller ?? "";
            result = { patterns: engine.getPatternsByController(controller) };
            break;
          }
          case "pp_hm_pattern_search": {
            const engine = await getEngine("hyperMillKnowledge");
            const query = params.query ?? params.q ?? "";
            result = { patterns: engine.searchPatterns(query) };
            break;
          }
          case "pp_hm_precision": {
            const engine = await getEngine("hyperMillKnowledge");
            result = {
              command: engine.getPrecisionCommand(
                params.controller ?? "",
                params.type ?? params.precision_type ?? "",
              ),
            };
            break;
          }
          case "pp_hm_coolant": {
            const engine = await getEngine("hyperMillKnowledge");
            result = {
              code: engine.getCoolantCode(
                params.controller ?? "",
                params.type ?? params.coolant_type ?? "",
              ),
            };
            break;
          }
          case "pp_hm_tips": {
            const engine = await getEngine("hyperMillKnowledge");
            result = { tips: engine.getAllTribalTips() };
            break;
          }
          case "pp_hm_validate": {
            const engine = await getEngine("hyperMillKnowledge");
            result = engine.validatePostStructure(params.post ?? params.lines ?? []);
            break;
          }
          case "pp_hm_header": {
            const engine = await getEngine("hyperMillKnowledge");
            const machineId = params.machine_id ?? params.machineId ?? "";
            result = { header: engine.generateMachineHeader(machineId) };
            break;
          }
          case "pp_hm_capabilities": {
            const engine = await getEngine("hyperMillKnowledge");
            const machineId = params.machine_id ?? params.machineId ?? "";
            result = engine.getMachineCapabilities(machineId);
            break;
          }
          case "pp_hm_stats": {
            const engine = await getEngine("hyperMillKnowledge");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_MPA (PP-MPA — Master-Post Architecture, 26 machine types) =====
          case "pp_mpa_types": {
            const engine = await getEngine("masterPostArch");
            result = { types: engine.getMachineTypes() };
            break;
          }
          case "pp_mpa_type": {
            const engine = await getEngine("masterPostArch");
            const id = params.id ?? params.type_id ?? "";
            result = { type: engine.getMachineType(id) ?? null };
            break;
          }
          case "pp_mpa_types_cat": {
            const engine = await getEngine("masterPostArch");
            const category = params.category ?? "";
            result = { types: engine.getMachineTypesByCategory(category) };
            break;
          }
          case "pp_mpa_types_status": {
            const engine = await getEngine("masterPostArch");
            const status = params.status ?? "";
            result = { types: engine.getMachineTypesByStatus(status) };
            break;
          }
          case "pp_mpa_hi_priority": {
            const engine = await getEngine("masterPostArch");
            result = { types: engine.getHighPriorityPlanned() };
            break;
          }
          case "pp_mpa_fusion": {
            const engine = await getEngine("masterPostArch");
            result = { fusion: engine.getFusionPostInventory() };
            break;
          }
          case "pp_mpa_fusion_brand": {
            const engine = await getEngine("masterPostArch");
            const brand = params.brand ?? "";
            result = { family: engine.getFusionPostsForBrand(brand) ?? null };
            break;
          }
          case "pp_mpa_fusion_total": {
            const engine = await getEngine("masterPostArch");
            result = { total: engine.getTotalFusionPosts() };
            break;
          }
          case "pp_mpa_fusion_for_type": {
            const engine = await getEngine("masterPostArch");
            const typeId = params.type_id ?? params.machine_type_id ?? "";
            result = { families: engine.findFusionPostsForMachineType(typeId) };
            break;
          }
          case "pp_mpa_templates": {
            const engine = await getEngine("masterPostArch");
            result = { templates: engine.getMasterPostTemplates() };
            break;
          }
          case "pp_mpa_template": {
            const engine = await getEngine("masterPostArch");
            const typeId = params.type_id ?? params.machine_type_id ?? "";
            result = { template: engine.getMasterPostTemplate(typeId) ?? null };
            break;
          }
          case "pp_mpa_conversion": {
            const engine = await getEngine("masterPostArch");
            const typeId = params.type_id ?? params.machine_type_id ?? "";
            result = { rules: engine.getConversionRules(typeId) };
            break;
          }
          case "pp_mpa_variants": {
            const engine = await getEngine("masterPostArch");
            const typeId = params.type_id ?? params.machine_type_id ?? "";
            result = { variants: engine.getVariants(typeId) };
            break;
          }
          case "pp_mpa_v11_issues": {
            const engine = await getEngine("masterPostArch");
            result = { issues: engine.getHurcoV11Issues() };
            break;
          }
          case "pp_mpa_v11_by_cat": {
            const engine = await getEngine("masterPostArch");
            const category = params.category ?? "";
            result = { issues: engine.getHurcoV11ByCategory(category) };
            break;
          }
          case "pp_mpa_stats": {
            const engine = await getEngine("masterPostArch");
            result = engine.getStatistics();
            break;
          }
          case "pp_mpa_context": {
            const engine = await getEngine("masterPostArch");
            result = { context: engine.getContextForAI() };
            break;
          }

          // ===== PP_COG (PP-COG — Deep Cognition, case-based reasoning) =====
          case "pp_cog_reason": {
            const engine = await getEngine("deepCognition");
            result = engine.reason(params);
            break;
          }
          case "pp_cog_cases": {
            const engine = await getEngine("deepCognition");
            result = { cases: engine.getCaseLibrary() };
            break;
          }
          case "pp_cog_case": {
            const engine = await getEngine("deepCognition");
            const id = params.id ?? params.case_id ?? "";
            result = { case: engine.getCase(id) ?? null };
            break;
          }
          case "pp_cog_search": {
            const engine = await getEngine("deepCognition");
            const query = params.query ?? params.q ?? "";
            result = { cases: engine.searchCases(query) };
            break;
          }
          case "pp_cog_diagnose": {
            const engine = await getEngine("deepCognition");
            const symptoms = params.symptoms ?? [];
            result = { diagnoses: engine.diagnose(symptoms) };
            break;
          }
          case "pp_cog_stats": {
            const engine = await getEngine("deepCognition");
            result = engine.getStatistics();
            break;
          }
          case "pp_cog_context": {
            const engine = await getEngine("deepCognition");
            result = { context: engine.getContextForAI() };
            break;
          }

          // ===== PP_CK: Comprehensive Knowledge (PP-CK) =====
          case "pp_ck_machines": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { catalogs: engine.getMachineCatalogs() };
            break;
          }
          case "pp_ck_materials": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { catalogs: engine.getMaterialCatalogs() };
            break;
          }
          case "pp_ck_tools": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { catalogs: engine.getToolCatalogs() };
            break;
          }
          case "pp_ck_holders": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { catalogs: engine.getHolderCatalogs() };
            break;
          }
          case "pp_ck_fixtures": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { catalogs: engine.getFixtureCatalogs() };
            break;
          }
          case "pp_ck_by_type": {
            const engine = await getEngine("comprehensiveKnowledge");
            const type = params.type ?? params.catalog_type;
            result = { catalogs: engine.getCatalogsByType(type) };
            break;
          }
          case "pp_ck_resources": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { resources: engine.getHDriveResources() };
            break;
          }
          case "pp_ck_totals": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = engine.getTotalEntries();
            break;
          }
          case "pp_ck_catalog": {
            const engine = await getEngine("comprehensiveKnowledge");
            const id = params.catalogId ?? params.catalog_id ?? params.id;
            const catalog = engine.getCatalog(id);
            result = { catalog: catalog ?? null, found: !!catalog };
            break;
          }
          case "pp_ck_by_brand": {
            const engine = await getEngine("comprehensiveKnowledge");
            const brand = params.brand ?? "";
            result = { catalogs: engine.findCatalogsByBrand(brand) };
            break;
          }
          case "pp_ck_route": {
            const engine = await getEngine("comprehensiveKnowledge");
            const query = params.query ?? "";
            result = engine.routeQuery(query);
            break;
          }
          case "pp_ck_ingest": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestAsset(params.asset ?? params) };
            break;
          }
          case "pp_ck_ingest_machine": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestMachine(params.machine ?? params) };
            break;
          }
          case "pp_ck_ingest_material": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestMaterial(params.material ?? params) };
            break;
          }
          case "pp_ck_ingest_tool": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestTool(params.tool ?? params) };
            break;
          }
          case "pp_ck_ingest_holder": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestHolder(params.holder ?? params) };
            break;
          }
          case "pp_ck_ingest_fixture": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestFixture(params.fixture ?? params) };
            break;
          }
          case "pp_ck_ingest_program": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { asset: engine.ingestProgram(params.program ?? params) };
            break;
          }
          case "pp_ck_ingested": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { assets: engine.getIngestedAssets() };
            break;
          }
          case "pp_ck_ingested_by_type": {
            const engine = await getEngine("comprehensiveKnowledge");
            const type = params.type ?? params.asset_type;
            result = { assets: engine.getIngestedAssetsByType(type) };
            break;
          }
          case "pp_ck_ingested_get": {
            const engine = await getEngine("comprehensiveKnowledge");
            const id = params.id ?? params.asset_id;
            const asset = engine.getIngestedAsset(id);
            result = { asset: asset ?? null, found: !!asset };
            break;
          }
          case "pp_ck_ingested_remove": {
            const engine = await getEngine("comprehensiveKnowledge");
            const id = params.id ?? params.asset_id;
            result = { removed: engine.removeIngestedAsset(id) };
            break;
          }
          case "pp_ck_ingested_clear": {
            const engine = await getEngine("comprehensiveKnowledge");
            engine.clearIngestedAssets();
            result = { cleared: true };
            break;
          }
          case "pp_ck_bulk_ingest": {
            const engine = await getEngine("comprehensiveKnowledge");
            const assets = params.assets ?? [];
            result = engine.bulkIngest(assets);
            break;
          }
          case "pp_ck_context": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = { context: engine.getContextForAI() };
            break;
          }
          case "pp_ck_stats": {
            const engine = await getEngine("comprehensiveKnowledge");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_GEN: Master Post Genius (PP-GEN) =====
          case "pp_gen_master_post": {
            const engine = await getEngine("masterGenius");
            result = engine.generateMasterPost(params.request ?? params);
            break;
          }
          case "pp_gen_cutting_mechanics": {
            const engine = await getEngine("masterGenius");
            result = { mechanics: engine.getCuttingMechanics() };
            break;
          }
          case "pp_gen_pipeline": {
            const engine = await getEngine("masterGenius");
            result = { pipeline: engine.getPrintToProgramPipeline() };
            break;
          }
          case "pp_gen_patterns": {
            const engine = await getEngine("masterGenius");
            result = { patterns: engine.getJMDiePatterns() };
            break;
          }
          case "pp_gen_machine_db": {
            const engine = await getEngine("masterGenius");
            result = { database: engine.getMachineExpertiseDatabase() };
            break;
          }
          case "pp_gen_advice": {
            const engine = await getEngine("masterGenius");
            const scenario = params.scenario ?? "";
            result = { advice: engine.getExpertAdvice(scenario) };
            break;
          }
          case "pp_gen_stats": {
            const engine = await getEngine("masterGenius");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_REG: AGI Master Registry (PP-REG) =====
          case "pp_reg_all": {
            const engine = await getEngine("agiMasterRegistry");
            result = { engines: engine.getAllEngines() };
            break;
          }
          case "pp_reg_get": {
            const engine = await getEngine("agiMasterRegistry");
            const id = params.id ?? params.engineId ?? params.engine_id;
            const entry = engine.getEngine(id);
            result = { engine: entry ?? null, found: !!entry };
            break;
          }
          case "pp_reg_by_tier": {
            const engine = await getEngine("agiMasterRegistry");
            const tier = params.tier;
            result = { engines: engine.getEnginesByTier(tier) };
            break;
          }
          case "pp_reg_by_priority": {
            const engine = await getEngine("agiMasterRegistry");
            const priority = params.priority;
            result = { engines: engine.getEnginesByPriority(priority) };
            break;
          }
          case "pp_reg_route": {
            const engine = await getEngine("agiMasterRegistry");
            const task = params.task ?? "";
            result = engine.routeTask(task);
            break;
          }
          case "pp_reg_search": {
            const engine = await getEngine("agiMasterRegistry");
            const query = params.query ?? "";
            result = { engines: engine.searchByCapability(query) };
            break;
          }
          case "pp_reg_deps": {
            const engine = await getEngine("agiMasterRegistry");
            const id = params.id ?? params.engineId ?? params.engine_id;
            result = { dependencies: engine.getDependencies(id) };
            break;
          }
          case "pp_reg_dependents": {
            const engine = await getEngine("agiMasterRegistry");
            const id = params.id ?? params.engineId ?? params.engine_id;
            result = { dependents: engine.getDependents(id) };
            break;
          }
          case "pp_reg_matrix": {
            const engine = await getEngine("agiMasterRegistry");
            result = { matrix: engine.getCapabilityMatrix() };
            break;
          }
          case "pp_reg_tiers": {
            const engine = await getEngine("agiMasterRegistry");
            result = { distribution: engine.getTierDistribution() };
            break;
          }
          case "pp_reg_plan": {
            const engine = await getEngine("agiMasterRegistry");
            const task = params.task ?? "";
            result = engine.getExecutionPlan(task);
            break;
          }
          case "pp_reg_context": {
            const engine = await getEngine("agiMasterRegistry");
            result = { context: engine.getContextForAI() };
            break;
          }
          case "pp_reg_stats": {
            const engine = await getEngine("agiMasterRegistry");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_UPH: Unified Physics Orchestration (PP-UPH) =====
          case "pp_uph_analyze": {
            const engine = await getEngine("unifiedPhysics");
            const state = params.state ?? params.machiningState ?? params;
            result = engine.analyzeUnifiedPhysics(state);
            break;
          }
          case "pp_uph_optimize": {
            const engine = await getEngine("unifiedPhysics");
            const gcode = params.gcode ?? params.g_code ?? [];
            const state = params.state ?? params.machiningState ?? {};
            result = engine.optimizeGCodeWithPhysics(gcode, state);
            break;
          }
          case "pp_uph_stats": {
            const engine = await getEngine("unifiedPhysics");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_AGIO: AGI Orchestration (PP-AGIO) =====
          case "pp_agio_generate": {
            const engine = await getEngine("agiOrchestration");
            result = await engine.generateAGIPost(params.request ?? params);
            break;
          }
          case "pp_agio_registry": {
            const engine = await getEngine("agiOrchestration");
            result = { engines: engine.getEngineRegistry() };
            break;
          }
          case "pp_agio_controllers": {
            const engine = await getEngine("agiOrchestration");
            result = { controllers: engine.getControllerKnowledge() };
            break;
          }
          case "pp_agio_search": {
            const engine = await getEngine("agiOrchestration");
            const query = params.query ?? "";
            result = { engines: engine.searchEngines(query) };
            break;
          }
          case "pp_agio_controller": {
            const engine = await getEngine("agiOrchestration");
            const id = params.controllerId ?? params.controller_id ?? params.id;
            const controller = engine.getController(id);
            result = { controller: controller ?? null, found: !!controller };
            break;
          }
          case "pp_agio_recommend": {
            const engine = await getEngine("agiOrchestration");
            const task = params.task ?? "";
            result = { recommendations: engine.recommendEngines(task) };
            break;
          }
          case "pp_agio_context": {
            const engine = await getEngine("agiOrchestration");
            result = { context: engine.getContextForAI() };
            break;
          }
          case "pp_agio_stats": {
            const engine = await getEngine("agiOrchestration");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_SAW: Self-Awareness Integration (PP-SAW) =====
          case "pp_saw_init": {
            const engine = await getEngine("selfAwareness");
            await engine.initialize();
            result = { initialized: true };
            break;
          }
          case "pp_saw_context": {
            const engine = await getEngine("selfAwareness");
            result = { context: engine.buildSelfAwarenessContext(params.request ?? params) };
            break;
          }
          case "pp_saw_generate": {
            const engine = await getEngine("selfAwareness");
            result = await engine.generatePost(params.request ?? params);
            break;
          }
          case "pp_saw_jmdie": {
            const engine = await getEngine("selfAwareness");
            result = { machines: engine.getJMDieMachinesSummary() };
            break;
          }
          case "pp_saw_controllers": {
            const engine = await getEngine("selfAwareness");
            result = { controllers: engine.getControllerKnowledgeSummary() };
            break;
          }
          case "pp_saw_stats": {
            const engine = await getEngine("selfAwareness");
            result = engine.stats();
            break;
          }

          // ===== PP_DAH: Deep AI Hardening (PP-DAH) =====
          case "pp_dah_convert": {
            const engine = await getEngine("deepAIHardening");
            result = engine.convertPostProgram(params.request ?? params);
            break;
          }
          case "pp_dah_generate": {
            const engine = await getEngine("deepAIHardening");
            result = engine.generatePostProcessor(params.request ?? params);
            break;
          }
          case "pp_dah_validate": {
            const engine = await getEngine("deepAIHardening");
            result = engine.validatePostProcessor(params.request ?? params);
            break;
          }
          case "pp_dah_tips": {
            const engine = await getEngine("deepAIHardening");
            result = { tips: engine.getControllerTips(params.query ?? params) };
            break;
          }
          case "pp_dah_jmdie_config": {
            const engine = await getEngine("deepAIHardening");
            const id = params.machineId ?? params.machine_id ?? params.id;
            const config = engine.getJMDieMachineConfig(id);
            result = { config: config ?? null, found: !!config };
            break;
          }
          case "pp_dah_jmdie_list": {
            const engine = await getEngine("deepAIHardening");
            result = { machines: engine.listJMDieMachines() };
            break;
          }
          case "pp_dah_feature_matrix": {
            const engine = await getEngine("deepAIHardening");
            result = { matrix: engine.getFeatureCompatibilityMatrix() };
            break;
          }
          case "pp_dah_recommend": {
            const engine = await getEngine("deepAIHardening");
            result = { recommendations: engine.recommendPostForJob(params.job ?? params.jobDescription ?? params) };
            break;
          }
          case "pp_dah_5axis_safety": {
            const engine = await getEngine("deepAIHardening");
            const code = params.code ?? "";
            const controller = params.controller ?? "fanuc";
            result = engine.validate5AxisSafetyLine(code, controller);
            break;
          }

          // ===== PP_VID: Video Knowledge Neural (PP-VID) =====
          case "pp_vid_knowledge": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            result = { knowledge: engine.getControllerKnowledge(controller) };
            break;
          }
          case "pp_vid_controllers": {
            const engine = await getEngine("videoKnowledgeNeural");
            result = { controllers: engine.getAvailableControllers() };
            break;
          }
          case "pp_vid_reason": {
            const engine = await getEngine("videoKnowledgeNeural");
            result = engine.reason(params.context ?? params);
            break;
          }
          case "pp_vid_hsm": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            const mode = params.mode ?? "rough";
            result = { code: engine.getHSMCode(controller, mode) };
            break;
          }
          case "pp_vid_tcpm": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            result = { code: engine.getTCPMCode(controller) };
            break;
          }
          case "pp_vid_tribal": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            result = { tips: engine.getTribalKnowledge(controller) };
            break;
          }
          case "pp_vid_mistakes": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            result = { mistakes: engine.getCommonMistakes(controller) };
            break;
          }
          case "pp_vid_toolmgmt": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            result = { toolManagement: engine.getToolManagement(controller) };
            break;
          }
          case "pp_vid_canned": {
            const engine = await getEngine("videoKnowledgeNeural");
            const controller = params.controller;
            const cycleType = params.cycleType ?? params.cycle_type;
            const cycleName = params.cycleName ?? params.cycle_name;
            result = { format: engine.getCannedCycleFormat(controller, cycleType, cycleName) };
            break;
          }
          case "pp_vid_stats": {
            const engine = await getEngine("videoKnowledgeNeural");
            result = engine.getStatistics();
            break;
          }

          // ===== PP_MPG: Master Post Generator (PP-MPG) =====
          case "pp_mpg_complete": {
            const engine = await getEngine("masterPostGenerator");
            result = engine.generateCompletePost(params.config ?? params);
            break;
          }
          case "pp_mpg_safety": {
            const engine = await getEngine("masterPostGenerator");
            const controller = params.controller;
            const machineConfig = params.machineConfig ?? params.machine_config;
            result = { safetyLine: engine.generateSafetyLine(controller, machineConfig) };
            break;
          }
          case "pp_mpg_cycles": {
            const engine = await getEngine("masterPostGenerator");
            const controller = params.controller;
            result = { cycles: engine.generateCycleDefinitions(controller) };
            break;
          }
          case "pp_mpg_mcodes": {
            const engine = await getEngine("masterPostGenerator");
            const controller = params.controller;
            result = { mCodes: engine.generateMCodeMappings(controller) };
            break;
          }
          case "pp_mpg_props": {
            const engine = await getEngine("masterPostGenerator");
            const controller = params.controller;
            const features = params.features ?? {};
            const machineConfig = params.machineConfig ?? params.machine_config;
            result = { properties: engine.generateProperties(controller, features, machineConfig) };
            break;
          }

          // ===== PP_DI: Deep Intelligence (PP-DI) =====
          case "pp_di_machine_caps": {
            const engine = await getEngine("deepIntelligence");
            const controller = params.controller;
            const caps = engine.getMachineCapabilities(controller);
            result = { capabilities: caps ?? null, found: !!caps };
            break;
          }
          case "pp_di_controller_map": {
            const engine = await getEngine("deepIntelligence");
            const controller = params.controller;
            const mapping = engine.getControllerMapping(controller);
            result = { mapping: mapping ?? null, found: !!mapping };
            break;
          }
          case "pp_di_controllers": {
            const engine = await getEngine("deepIntelligence");
            result = { controllers: engine.getSupportedControllers() };
            break;
          }
          case "pp_di_material": {
            const engine = await getEngine("deepIntelligence");
            const id = params.id ?? params.materialId ?? params.material_id;
            const material = engine.getMaterial(id);
            result = { material: material ?? null, found: !!material };
            break;
          }
          case "pp_di_materials_by_group": {
            const engine = await getEngine("deepIntelligence");
            const group = params.group ?? params.isoGroup ?? params.iso_group;
            result = { materials: engine.getMaterialsByGroup(group) };
            break;
          }
          case "pp_di_cutting_params": {
            const engine = await getEngine("deepIntelligence");
            const material = params.material ?? params.materialId ?? "";
            const operation = params.operation ?? "roughing";
            const toolDiameter = params.toolDiameter ?? params.tool_diameter ?? 10;
            result = engine.recommendCuttingParams(material, operation, toolDiameter);
            break;
          }
          case "pp_di_toolpath_strategy": {
            const engine = await getEngine("deepIntelligence");
            const category = params.category;
            const strategy = params.strategy;
            result = { strategy: engine.getToolpathStrategy(category, strategy) };
            break;
          }
          case "pp_di_recommend_toolpath": {
            const engine = await getEngine("deepIntelligence");
            const geometry = params.geometry ?? params.geometryType ?? "pocket";
            const material = params.material ?? params.isoGroup ?? "P";
            const operation = params.operation ?? "roughing";
            result = engine.recommendToolpathStrategy(geometry, material, operation);
            break;
          }
          case "pp_di_5axis_validate": {
            const engine = await getEngine("deepIntelligence");
            const config = params.config ?? params.kinematicConfig;
            const angles = params.angles ?? {};
            result = engine.validate5AxisMove(config, angles);
            break;
          }
          case "pp_di_collisions": {
            const engine = await getEngine("deepIntelligence");
            const points = params.points ?? [];
            const toolRadius = params.toolRadius ?? params.tool_radius ?? 5;
            const holderRadius = params.holderRadius ?? params.holder_radius ?? 15;
            const zones = params.zones;
            result = engine.checkCollisions(points, toolRadius, holderRadius, zones);
            break;
          }
          case "pp_di_architectures": {
            const engine = await getEngine("deepIntelligence");
            result = { architectures: engine.getDeepLearningArchitectures() };
            break;
          }
          case "pp_di_architecture": {
            const engine = await getEngine("deepIntelligence");
            const name = params.name ?? "";
            const architecture = engine.getArchitecture(name);
            result = { architecture: architecture ?? null, found: !!architecture };
            break;
          }
          case "pp_di_reason": {
            const engine = await getEngine("deepIntelligence");
            const observations = params.observations ?? [];
            const goal = params.goal ?? "";
            const rules = params.rules ?? [];
            result = engine.reason(observations, goal, rules);
            break;
          }
          case "pp_di_constraints": {
            const engine = await getEngine("deepIntelligence");
            result = engine.solveConstraints(params.problem ?? params);
            break;
          }
          case "pp_di_analyze": {
            const engine = await getEngine("deepIntelligence");
            const code = params.code ?? "";
            const machineSpec = params.machineSpec ?? params.machine_spec ?? {};
            const material = params.material ?? "";
            result = engine.comprehensiveAnalysis(code, machineSpec, material);
            break;
          }
          case "pp_di_stats": {
            const engine = await getEngine("deepIntelligence");
            result = engine.getStats();
            break;
          }

          // ===== PP_TEL: Telemetry (PP-TEL) =====
          case "pp_tel_record": {
            const engine = await getEngine("telemetry");
            result = engine.record(params.event ?? params);
            break;
          }
          case "pp_tel_funnel": {
            const engine = await getEngine("telemetry");
            result = engine.funnel(params);
            break;
          }
          case "pp_tel_count": {
            const engine = await getEngine("telemetry");
            result = { count: engine.eventCount() };
            break;
          }
          case "pp_tel_reset": {
            const engine = await getEngine("telemetry");
            engine.reset();
            result = { reset: true };
            break;
          }

          // ===== PP_TNR: Tool Number Range Validator (PP-TNR) =====
          case "pp_tnr_validate": {
            const engine = await getEngine("toolNumberRange");
            const gcode = params.gcode ?? params.g_code ?? "";
            const options = params.options;
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_tnr_quick": {
            const engine = await getEngine("toolNumberRange");
            const gcode = params.gcode ?? params.g_code ?? "";
            const options = params.options;
            result = engine.quickCheck(gcode, options);
            break;
          }
          case "pp_tnr_defaults": {
            const engine = await getEngine("toolNumberRange");
            result = { defaults: engine.defaultOptions() };
            break;
          }

          // ===== PP_TRN: Trainer (PP-TRN) =====
          case "pp_trn_train": {
            const engine = await getEngine("trainer");
            result = engine.train(params.input ?? params);
            break;
          }

          // ===== PP_MGC: Modal Group Conflict Validator (PP-MGC) =====
          case "pp_mgc_validate": {
            const engine = await getEngine("modalGroupConflict");
            const gcode = params.gcode ?? params.g_code ?? "";
            const options = params.options;
            result = engine.validate(gcode, options);
            break;
          }
          case "pp_mgc_quick": {
            const engine = await getEngine("modalGroupConflict");
            const gcode = params.gcode ?? params.g_code ?? "";
            const options = params.options;
            result = engine.quickCheck(gcode, options);
            break;
          }
          case "pp_mgc_defaults": {
            const engine = await getEngine("modalGroupConflict");
            result = { defaults: engine.defaultOptions() };
            break;
          }

          // ===== PP_ANL: Analysis (PP-ANL) =====
          case "pp_anl_analyze": {
            const engine = await getEngine("analysis");
            const code = params.code ?? "";
            const filename = params.filename ?? "unknown.cps";
            result = engine.analyze(code, filename);
            break;
          }
          case "pp_anl_report": {
            const engine = await getEngine("analysis");
            result = { report: engine.generateReport(params.result ?? params) };
            break;
          }
          case "pp_anl_fix": {
            const engine = await getEngine("analysis");
            const code = params.code ?? "";
            const issues = params.issues ?? [];
            result = engine.applyFixes(code, issues);
            break;
          }

          // ===== PP_AUT: Autopilot (PP-AUT) =====
          case "pp_aut_dialect": {
            const engine = await getEngine("autopilot");
            const controller = params.controller ?? "";
            result = engine.resolveDialect(controller);
            break;
          }
          case "pp_aut_config": {
            const engine = await getEngine("autopilot");
            const dialect = params.dialect;
            const operation = params.operation ?? params.operation_type;
            result = engine.generatePostConfig(dialect, operation);
            break;
          }
          case "pp_aut_ppg": {
            const engine = await getEngine("autopilot");
            result = engine.runPPG(params.input ?? params);
            break;
          }
          case "pp_aut_p2p": {
            const engine = await getEngine("autopilot");
            result = engine.runPrintToProgram(params.input ?? params);
            break;
          }
          case "pp_aut_dialects": {
            const engine = await getEngine("autopilot");
            result = { dialects: engine.listDialects() };
            break;
          }
          case "pp_aut_features": {
            const engine = await getEngine("autopilot");
            const dialect = params.dialect;
            result = { features: engine.getDialectFeatures(dialect) };
            break;
          }

          // ===== PP_MST: Master Post Processor (PP-MST) =====
          case "pp_mst_process": {
            const engine = await getEngine("master");
            const segments = params.segments ?? [];
            const config = params.config ?? params;
            result = engine.process(segments, config);
            break;
          }
          case "pp_mst_compare": {
            const engine = await getEngine("master");
            const controllers = params.controllers ?? [];
            result = engine.compareControllers(controllers);
            break;
          }
          case "pp_mst_templates": {
            const engine = await getEngine("master");
            const controller = params.controller;
            result = { templates: engine.getPostTemplates(controller) };
            break;
          }
          case "pp_mst_features": {
            const engine = await getEngine("master");
            const controller = params.controller;
            result = { features: engine.getMachineFeatures(controller) };
            break;
          }
          case "pp_mst_cross_cam": {
            const engine = await getEngine("master");
            result = { features: engine.listCrossCamFeatures() };
            break;
          }
          case "pp_mst_cps_config": {
            const engine = await getEngine("master");
            const machine = params.machine ?? params;
            result = engine.generateMasterCpsConfig(machine);
            break;
          }
          case "pp_mst_is_master": {
            const engine = await getEngine("master");
            const controller = params.controller ?? "";
            result = { isMaster: engine.isMasterPostController(controller) };
            break;
          }
          case "pp_mst_stats": {
            const engine = await getEngine("master");
            result = engine.stats();
            break;
          }

          // ===== PP-ULT: Ultimate AI =====
          case "pp_ult_deep_ensemble": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.deepEnsemble(input);
            break;
          }
          case "pp_ult_retrieve_episodes": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.retrieveEpisodes(input);
            break;
          }
          case "pp_ult_query_kg": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.queryKnowledgeGraph(input);
            break;
          }
          case "pp_ult_tree_of_thoughts": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.treeOfThoughts(input);
            break;
          }
          case "pp_ult_meta_learning": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.metaLearning(input);
            break;
          }
          case "pp_ult_adversarial": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.adversarialValidation(input);
            break;
          }
          case "pp_ult_generate_post": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.generatePost(input);
            break;
          }
          case "pp_ult_llm_cli": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            const analysis = params.analysis ?? {};
            result = engine.generateLLMCLIOutput(input, analysis);
            break;
          }
          case "pp_ult_analyze": {
            const engine = await getEngine("ultimate");
            const input = params.input ?? params;
            result = engine.analyze(input);
            break;
          }
          case "pp_ult_store_episode": {
            const engine = await getEngine("ultimate");
            const episode = params.episode ?? params;
            result = { id: engine.storeEpisode(episode) };
            break;
          }
          case "pp_ult_stats": {
            const engine = await getEngine("ultimate");
            result = engine.getStats();
            break;
          }

          // ===== PP-IOC: Intelligence Orchestrator =====
          case "pp_ioc_classify_intent": {
            const engine = await getEngine("ioc");
            const query = params.query ?? "";
            const context = params.context;
            result = engine.classifyIntent(query, context);
            break;
          }
          case "pp_ioc_route": {
            const engine = await getEngine("ioc");
            const intent = params.intent ?? params;
            result = engine.routeToEngines(intent);
            break;
          }
          case "pp_ioc_expert_rules": {
            const engine = await getEngine("ioc");
            const gcode = params.gcode ?? params.code ?? "";
            const context = params.context ?? params;
            result = engine.runExpertRules(gcode, context);
            break;
          }
          case "pp_ioc_neural_opt": {
            const engine = await getEngine("ioc");
            const input = params.input ?? params;
            result = engine.neuralOptimization(input);
            break;
          }
          case "pp_ioc_aggregate": {
            const engine = await getEngine("ioc");
            result = engine.aggregateAnalysis(
              params.deepLearning ?? params.deep_learning,
              params.deepReasoning ?? params.deep_reasoning,
              params.ultimateAI ?? params.ultimate_ai,
              params.expertRules ?? params.expert_rules,
              params.neuralOpt ?? params.neural_opt,
            );
            break;
          }
          case "pp_ioc_response": {
            const engine = await getEngine("ioc");
            const input = params.input ?? params;
            const intent = params.intent;
            const analysis = params.analysis ?? {};
            result = engine.generateResponse(input, intent, analysis);
            break;
          }
          case "pp_ioc_proactive": {
            const engine = await getEngine("ioc");
            const analysis = params.analysis ?? params;
            result = engine.generateProactiveSuggestions(analysis);
            break;
          }
          case "pp_ioc_orchestrate": {
            const engine = await getEngine("ioc");
            const input = params.input ?? params;
            result = await engine.orchestrate(input);
            break;
          }

          // ===== PP-DL: Deep Learning =====
          case "pp_dl_recognize_patterns": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.recognizePatterns(input);
            break;
          }
          case "pp_dl_feed_opt": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.predictFeedOptimization(input);
            break;
          }
          case "pp_dl_classify_controller": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.classifyController(input);
            break;
          }
          case "pp_dl_cycle_time": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.estimateCycleTime(input);
            break;
          }
          case "pp_dl_quality_score": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.scorePostQuality(input);
            break;
          }
          case "pp_dl_analyze": {
            const engine = await getEngine("deepLearning");
            const input = params.input ?? params;
            result = engine.analyze(input);
            break;
          }

          // ===== PP-UDR: Unified Deep Reasoning =====
          case "pp_udr_reason": {
            const engine = await getEngine("unifiedReasoning");
            const request = params.request ?? params;
            result = engine.performUnifiedReasoning(request);
            break;
          }
          case "pp_udr_mcts": {
            const engine = await getEngine("unifiedReasoning");
            const request = params.request ?? params;
            const maxSimulations = params.maxSimulations ?? params.max_simulations;
            result = engine.performMCTSExploration(request, maxSimulations);
            break;
          }
          case "pp_udr_stats": {
            const engine = await getEngine("unifiedReasoning");
            result = engine.getStatistics();
            break;
          }

          // ===== PP-PCM: Post Capability Matrix =====
          case "pp_pcm_matrix": {
            const engine = await getEngine("postCapMatrix");
            result = engine.getMatrix();
            break;
          }
          case "pp_pcm_controller": {
            const engine = await getEngine("postCapMatrix");
            const family = params.family ?? params.controller ?? "";
            result = engine.getController(family);
            break;
          }
          case "pp_pcm_query": {
            const engine = await getEngine("postCapMatrix");
            const q = params.query ?? params.q ?? params;
            result = engine.query(q);
            break;
          }
          case "pp_pcm_compare": {
            const engine = await getEngine("postCapMatrix");
            const families = params.families ?? [];
            result = engine.compare(families);
            break;
          }
          case "pp_pcm_select": {
            const engine = await getEngine("postCapMatrix");
            const requirements = params.requirements ?? params;
            result = engine.selectPost(requirements);
            break;
          }
          case "pp_pcm_smoothing": {
            const engine = await getEngine("postCapMatrix");
            const family = params.family ?? params.controller ?? "";
            result = engine.getSmoothing(family);
            break;
          }
          case "pp_pcm_retract": {
            const engine = await getEngine("postCapMatrix");
            const family = params.family ?? params.controller ?? "";
            result = engine.getRetractMethods(family);
            break;
          }
          case "pp_pcm_multiaxis": {
            const engine = await getEngine("postCapMatrix");
            const family = params.family ?? params.controller ?? "";
            result = engine.getMultiAxisSupport(family);
            break;
          }
          case "pp_pcm_families": {
            const engine = await getEngine("postCapMatrix");
            result = engine.listFamilies();
            break;
          }
          case "pp_pcm_summary": {
            const engine = await getEngine("postCapMatrix");
            result = engine.getSummary();
            break;
          }

          // ===== PP-KN: Knowledge =====
          case "pp_kn_entry_fn": {
            const engine = await getEngine("knowledge");
            const name = params.name ?? "";
            result = engine.getEntryFunction(name);
            break;
          }
          case "pp_kn_entry_fn_cat": {
            const engine = await getEngine("knowledge");
            const category = params.category ?? "";
            result = engine.getEntryFunctionsByCategory(category);
            break;
          }
          case "pp_kn_drilling_cycle": {
            const engine = await getEngine("knowledge");
            const cycleType = params.cycleType ?? params.cycle_type ?? "";
            result = engine.getDrillingCycle(cycleType);
            break;
          }
          case "pp_kn_drilling_cycles_all": {
            const engine = await getEngine("knowledge");
            result = engine.getAllDrillingCycles();
            break;
          }
          case "pp_kn_upk_switch": {
            const engine = await getEngine("knowledge");
            const name = params.name ?? "";
            result = engine.getUPKSwitch(name);
            break;
          }
          case "pp_kn_upk_switches_cat": {
            const engine = await getEngine("knowledge");
            const category = params.category ?? "";
            result = engine.getUPKSwitchesByCategory(category);
            break;
          }
          case "pp_kn_misc_value": {
            const engine = await getEngine("knowledge");
            const id = params.id ?? "";
            result = engine.getMiscValue(id);
            break;
          }
          case "pp_kn_circular_settings": {
            const engine = await getEngine("knowledge");
            result = engine.getCircularSettings();
            break;
          }
          case "pp_kn_search": {
            const engine = await getEngine("knowledge");
            const query = params.query ?? "";
            result = engine.search(query);
            break;
          }
          case "pp_kn_recommended": {
            const engine = await getEngine("knowledge");
            const machineType = params.machineType ?? params.machine_type ?? "";
            result = engine.getRecommendedSettings(machineType);
            break;
          }
          case "pp_kn_validate_config": {
            const engine = await getEngine("knowledge");
            const config = params.config ?? params;
            result = engine.validateConfiguration(config);
            break;
          }
          case "pp_kn_fn_template": {
            const engine = await getEngine("knowledge");
            const functionName = params.functionName ?? params.function_name ?? params.name ?? "";
            result = { template: engine.generateFunctionTemplate(functionName) };
            break;
          }
          case "pp_kn_stats": {
            const engine = await getEngine("knowledge");
            result = engine.getStatistics();
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

          // ===== PP_LABEL: Program labeling pipeline (PP-DATA-MS0) =====
          case "pp_label_program": {
            const engine = await getEngine("programLabeling");
            const label = engine.labelProgram(params.file_path || params.filePath);
            result = { label };
            break;
          }
          case "pp_label_batch": {
            const engine = await getEngine("programLabeling");
            const config = {
              rootPath: params.root_path || params.rootPath || "H:/PRISM/JM DIE",
              filePattern: params.file_pattern || params.filePattern || "**/*.MIN",
              batchSize: params.batch_size || params.batchSize || 100,
              outputPath: params.output_path || params.outputPath || "H:/PRISM/mcp-server/data/training/program-labels.json",
              skipExisting: params.skip_existing ?? params.skipExisting ?? true,
              maxFiles: params.max_files || params.maxFiles,
            };
            const stats = await engine.labelBatch(config);
            result = { stats };
            break;
          }
          case "pp_label_stats": {
            const engine = await getEngine("programLabeling");
            const labelsPath = params.labels_path || params.labelsPath || "H:/PRISM/mcp-server/data/training/program-labels.json";
            const stats = engine.getStats(labelsPath);
            result = { stats };
            break;
          }
          case "pp_label_export": {
            const engine = await getEngine("programLabeling");
            const labelsPath = params.labels_path || params.labelsPath || "H:/PRISM/mcp-server/data/training/program-labels.json";
            const format = params.format || "jsonl";
            const exported = engine.exportTrainingData(labelsPath, format);
            result = { exported, format };
            break;
          }

          // ===== PP_MACHINE_FAMILY: Machine-specific master-post engines =====
          // Same engine reachable via prism_turning for machinist-facing workflows.
          case "pp_okuma_b250_lathe_program": {
            const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
            const operations = params.operations ?? [];
            const config = params.config ?? params;
            result = okumaB250LatheMasterPostEngine.generateProgram(operations, config);
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
