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
