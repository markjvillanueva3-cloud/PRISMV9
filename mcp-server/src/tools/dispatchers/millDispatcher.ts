/**
 * prism_mill — Mill-Specific Dispatcher
 * MILL-MASTER/P1-U01-MILL-DISP, P1-U04-SA-INTEG
 *
 * First-class MCP surface for milling operations. Consolidates mill actions
 * previously scattered across camDispatcher, fiveAxisDispatcher, multiAxisDispatcher.
 *
 * Routes through MillMasterOrchestratorFacadeEngine as primary entry (P1-U02).
 *
 * 49 actions covering: print_to_program, strategy, toolpath, physics, AGI,
 * self-awareness, pattern mining, digital twin, validation, optimization.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MILL_ACTION_SCHEMAS } from "../../schemas/millActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

/**
 * NO-FAKE-CODE: call engine method or throw a structured "not wired" error.
 * Replaces the banned `engine.method?.(params) ?? { fabricated data }` pattern.
 * Try each candidate method in order; the FIRST one that exists is called.
 */
async function callOrThrow(
  engine: any,
  methodCandidates: readonly string[],
  params: any,
  engineName: string,
): Promise<any> {
  for (const method of methodCandidates) {
    if (typeof engine?.[method] === "function") {
      return await engine[method](params);
    }
  }
  throw new Error(
    `[NOT_WIRED] ${engineName} does not expose any of: ${methodCandidates.join(", ")}`,
  );
}

// Lazy-loaded engine cache
let _facade: any, _strategy: any, _optimizer: any, _collision: any;
let _physics: any, _thermal: any, _pattern: any, _twin: any;
let _deeplearn: any, _neural: any, _wisdom: any, _adaptive: any;
let _toolpath: any, _toolsel: any, _program: any, _validate: any;
let _agi: any, _selfaware: any, _scientific: any, _kinematics: any;
// P1-U09-L2-AGG: L2 aggregator orchestrators
let _aiLearn: any, _millTurn: any, _fiveAxisAgg: any, _multiAxisAgg: any;
// Unwired engine additions
let _tribal: any, _e2e: any, _traceLedger: any, _inferenceOrch: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    // Core orchestration
    case "facade":
      return _facade ??= (await import("../../engines/MillMasterOrchestratorFacadeEngine.js")).millMasterOrchestratorFacadeEngine;
    case "strategy":
      return _strategy ??= (await import("../../engines/MillStrategyNeuralEngine.js")).millStrategyNeuralEngine;
    case "optimizer":
      return _optimizer ??= (await import("../../engines/MillProgramOptimizerEngine.js")).millProgramOptimizerEngine;
    case "collision":
      return _collision ??= (await import("../../engines/MillKinematicsCollisionEngine.js")).millKinematicsCollisionEngine;

    // Physics & thermal
    case "physics":
      return _physics ??= (await import("../../engines/MillingForceEngine.js")).millingForceEngine;
    case "thermal":
      return _thermal ??= (await import("../../engines/ThermalWearCouplingEngine.js")).thermalWearCouplingEngine;
    case "scientific":
      return _scientific ??= (await import("../../engines/MillScientificPipelineEngine.js")).millScientificPipelineEngine;

    // AI/ML
    case "deeplearn":
      return _deeplearn ??= (await import("../../engines/MillDeepLearningEngine.js")).millDeepLearningEngine;
    case "neural":
      return _neural ??= (await import("../../engines/MillStrategyNeuralEngine.js")).millStrategyNeuralEngine;
    case "pattern":
      return _pattern ??= (await import("../../engines/MillPatternMinerEngine.js")).millPatternMinerEngine;
    case "twin":
      return _twin ??= (await import("../../engines/DigitalTwinSyncEngine.js")).digitalTwinSyncEngine;

    // AGI orchestration
    case "agi":
      return _agi ??= (await import("../../engines/MillingAGIMasterEngine.js")).millingAGIMasterEngine;
    case "selfaware":
      return _selfaware ??= (await import("../../engines/MillAISelfAwarenessIntegrationEngine.js")).millAISelfAwarenessIntegrationEngine;

    // Toolpath & tools
    case "toolpath":
      return _toolpath ??= (await import("../../engines/ToolpathStrategyEngine.js")).toolpathStrategyEngine;
    case "toolsel":
      return _toolsel ??= (await import("../../engines/ToolSelectionRecommenderEngine.js")).toolSelectionRecommenderEngine;
    case "kinematics":
      return _kinematics ??= (await import("../../engines/MillKinematicsCollisionEngine.js")).millKinematicsCollisionEngine;

    // Validation & program
    case "validate":
      return _validate ??= (await import("../../engines/MillProgramAnalyzerEngine.js")).millProgramAnalyzerEngine;
    case "program":
      return _program ??= (await import("../../engines/MillPrintToProgramEngine.js")).millPrintToProgramEngine;

    // Adaptive
    case "adaptive":
      return _adaptive ??= (await import("../../engines/AdaptiveToolpathRouterEngine.js")).adaptiveToolpathRouterEngine;
    case "wisdom":
      return _wisdom ??= (await import("../../engines/TribalKnowledgeAdvisorEngine.js")).tribalKnowledgeAdvisorEngine;

    // P1-U09-L2-AGG: L2 aggregator orchestrators
    case "ai_learn":
      return _aiLearn ??= (await import("../../engines/MillingAILearningOrchestratorEngine.js")).millingAILearningOrchestratorEngine;
    case "mill_turn":
      return _millTurn ??= (await import("../../engines/MillTurnOrchestrationEngine.js")).millTurnOrchestrationEngine;
    case "five_axis_agg":
      return _fiveAxisAgg ??= (await import("../../engines/FiveAxisAggregatorEngine.js")).fiveAxisAggregatorEngine;
    case "multi_axis_agg":
      return _multiAxisAgg ??= (await import("../../engines/MultiAxisAggregatorEngine.js")).multiAxisAggregatorEngine;

    // Unwired engine additions
    case "tribal":
      return _tribal ??= (await import("../../engines/MillTribalKnowledgeEngine.js")).millTribalKnowledgeEngine;
    case "e2e":
      return _e2e ??= (await import("../../engines/MillingEndToEndOrchestrationEngine.js")).millingEndToEndOrchestrationEngine;
    case "trace_ledger":
      return _traceLedger ??= (await import("../../engines/MillingReasoningTraceLedgerEngine.js")).millingReasoningTraceLedgerEngine;
    case "inference_orch":
      return _inferenceOrch ??= (await import("../../engines/MillingInferenceOrchestratorEngine.js")).millingInferenceOrchestratorEngine;

    default:
      throw new Error(`Unknown mill engine: ${name}`);
  }
}

export const MILL_ACTIONS = [
  // Print-to-Program pipeline
  "mill_print_to_program",
  "mill_feature_recognize",
  "mill_process_plan",
  "mill_generate_gcode",
  "mill_validate_program",

  // Strategy selection
  "mill_strategy_select",
  "mill_strategy_recommend",
  "mill_strategy_compare",
  "mill_strategy_optimize",

  // Toolpath operations
  "mill_toolpath_generate",
  "mill_toolpath_simulate",
  "mill_toolpath_optimize",
  "mill_toolpath_rest",
  "mill_toolpath_adaptive",
  "mill_toolpath_hsm",
  "mill_toolpath_trochoidal",

  // Physics & validation
  "mill_force_calculate",
  "mill_deflection_check",
  "mill_chatter_predict",
  "mill_thermal_analyze",
  "mill_power_verify",

  // Collision & kinematics
  "mill_collision_check",
  "mill_collision_zones",
  "mill_kinematics_verify",
  "mill_work_envelope",

  // Tool selection
  "mill_tool_recommend",
  "mill_tool_assembly",
  "mill_tool_holder_match",

  // AI/AGI features
  "mill_agi_orchestrate",
  "mill_neural_recommend",
  "mill_deeplearn_predict",
  "mill_pattern_mine",
  "mill_wisdom_query",

  // Self-awareness & capability discovery
  "mill_selfaware_registry",
  "mill_selfaware_recommend",
  "mill_selfaware_find",
  "mill_selfaware_stats",

  // Digital twin
  "mill_twin_sync",
  "mill_twin_predict",
  "mill_twin_calibrate",

  // Scientific pipeline
  "mill_scientific_analyze",
  "mill_scientific_optimize",
  "mill_uncertainty_quantify",

  // Quick helpers
  "mill_quick_speed_feed",
  "mill_quick_cycle_time",
  "mill_quick_cost_estimate",

  // Validation & quality
  "mill_validate_setup",
  "mill_validate_safety",
  "mill_spc_analyze",

  // P1-U09-L2-AGG: L2 aggregator routing
  "mill_ai_orchestrate",
  "mill_turn_orchestrate",
  "mill_5axis_orchestrate",
  "mill_multiaxis_orchestrate",

  // Tribal knowledge (MillTribalKnowledgeEngine)
  "mill_tribal_query",
  "mill_tribal_get",
  "mill_tribal_add",
  "mill_tribal_stats",

  // End-to-end orchestration (MillingEndToEndOrchestrationEngine)
  "mill_e2e_workflow",

  // Reasoning trace ledger (MillingReasoningTraceLedgerEngine)
  "mill_trace_record",
  "mill_trace_query",

  // Inference orchestration (MillingInferenceOrchestratorEngine)
  "mill_inference_run",

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH1: 6 unwired mill engines
  "mill_helical_calc",                 // HelicalMillingEngine.calculate
  "mill_high_feed_calc",               // HighFeedMillingEngine.calculate
  "mill_program_parse",                // MillProgramLearningEngine.parseProgram
  "mill_resource_query",               // MillResourceAwarenessEngine.query
  "mill_strategy_list",                // MillingStrategyLibraryEngine.getAllStrategies
  "mill_strategy_for_feature",         // MillingStrategyLibraryEngine.getStrategiesForFeature

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 neural/AI mill engines
  "mill_neural_cognitive_process",     // MillingNeuralCognitiveEngine.quickProcess
  "mill_critical_analyze",             // MillingCriticalThinkingEngine.quickAnalyze
  "mill_meta_learn_record",            // MillingMetaLearningEngine.learnFromExperience
  "mill_meta_learn_self_assess",       // MillingMetaLearningEngine.selfAssess
  "mill_ai_parse_nl_query",            // MillingAIIntegrationEngine.parseNaturalLanguageQuery
  "mill_ai_archive_stats",             // MillingAIIntegrationEngine.getArchiveStats
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines
  "mill_physics_force",                // MillingPhysicsKernelEngine.calculateMillingForces
  "mill_physics_tool_life",            // MillingPhysicsKernelEngine.calculateToolLife
  "mill_program_pattern_analyze",      // MillingProgramPatternEngine.analyzeProgram
  "mill_rl_select_action",             // MillingReinforcementLearningEngine.selectAction
  "mill_head_recommend",               // MillingHeadIntelligenceEngine.recommendMillingHead
  "mill_machine_intel_get",            // MillingMachineIntelligenceEngine.getMachine
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines
  "mill_deep_reason",                  // MillingDeepReasoningEngine.quickReason
  "mill_deep_integrate",               // MillingDeepIntegrationEngine.quickIntegrate
  "mill_knowledge_search",             // MillingDeepKnowledgeSynthesisEngine.searchKnowledge
  "mill_knowledge_stats",              // MillingDeepKnowledgeSynthesisEngine.getSourceStats
  "mill_ai_unified_recommend",         // MillingAIUnificationEngine.quickRecommend
  "mill_milling_twin_sync",            // MillingDigitalTwinEngine.sync
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines
  "mill_agi_quick_analyze",            // MillingAGIOrchestrationEngine.quickAnalyze
  "mill_knowledge_orch_recommend",     // MillingKnowledgeOrchestratorEngine.quickRecommend
  "mill_troubleshoot",                 // MillingDeepAIHardeningEngine.troubleshootMillingIssue
  "mill_lora_cadence_state",           // MillingLoRACadenceEngine.getState
  "mill_online_record_step",           // MillingOnlineLearningTrackerEngine.recordStep
  "mill_online_detect_drift",          // MillingOnlineLearningTrackerEngine.detectDrift

  // MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine — 4 actions
  "mill_part_classify",                 // MillPartClassifierEngine.classify
  "mill_part_classify_batch",           // MillPartClassifierEngine.classifyBatch
  "mill_part_family_profile",           // MillPartClassifierEngine.getFamilyProfile
  "mill_part_families_list",            // MillPartClassifierEngine.listFamilies
] as const;

export const MILL_DISPATCHER_ACTION_COUNT = MILL_ACTIONS.length;

export function registerMillDispatcher(server: any): void {
  server.tool(
    "prism_mill",
    `Mill-specific dispatcher — strategy, toolpath, physics, AGI, print-to-program pipeline.
Actions: ${MILL_ACTIONS.join(", ")}.`,
    { action: z.enum(MILL_ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof MILL_ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_mill] Action: ${action}`);
      let result: any;
      try {
        // Normalize params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, MILL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_mill"
          );
        }

        // Pre-calculation safety hooks
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "millDispatcher", action, params }
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

        switch (action) {
          // ============================================================
          // PRINT-TO-PROGRAM PIPELINE
          // ============================================================
          case "mill_print_to_program": {
            result = await callOrThrow(await getEngine("program"), ["process", "generate"], params, "MillPrintToProgramEngine");
            break;
          }
          case "mill_feature_recognize": {
            result = await callOrThrow(await getEngine("facade"), ["recognizeFeatures"], params, "MillMasterOrchestratorFacadeEngine");
            break;
          }
          case "mill_process_plan": {
            result = await callOrThrow(await getEngine("facade"), ["planProcess"], params, "MillMasterOrchestratorFacadeEngine");
            break;
          }
          case "mill_generate_gcode": {
            result = await callOrThrow(await getEngine("program"), ["generateGcode"], params, "MillPrintToProgramEngine");
            break;
          }
          case "mill_validate_program": {
            result = await callOrThrow(await getEngine("validate"), ["analyze", "validate"], params, "MillProgramAnalyzerEngine");
            break;
          }

          // ============================================================
          // STRATEGY SELECTION
          // ============================================================
          case "mill_strategy_select": {
            result = await callOrThrow(await getEngine("strategy"), ["selectStrategy", "recommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_recommend": {
            result = await callOrThrow(await getEngine("neural"), ["recommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_compare": {
            result = await callOrThrow(await getEngine("strategy"), ["compare"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_optimize": {
            result = await callOrThrow(await getEngine("optimizer"), ["optimizeStrategy"], params, "MillProgramOptimizerEngine");
            break;
          }

          // ============================================================
          // TOOLPATH OPERATIONS
          // ============================================================
          case "mill_toolpath_generate": {
            result = await callOrThrow(await getEngine("toolpath"), ["generate"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_simulate": {
            result = await callOrThrow(await getEngine("collision"), ["simulate"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_toolpath_optimize": {
            result = await callOrThrow(await getEngine("optimizer"), ["optimizeToolpath"], params, "MillProgramOptimizerEngine");
            break;
          }
          case "mill_toolpath_rest": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateRest"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_adaptive": {
            result = await callOrThrow(await getEngine("adaptive"), ["generateAdaptive"], params, "AdaptiveToolpathRouterEngine");
            break;
          }
          case "mill_toolpath_hsm": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateHSM"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_trochoidal": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateTrochoidal"], params, "ToolpathStrategyEngine");
            break;
          }

          // ============================================================
          // PHYSICS & VALIDATION
          // ============================================================
          case "mill_force_calculate": {
            result = await callOrThrow(await getEngine("physics"), ["calculate"], params, "MillingForceEngine");
            break;
          }
          case "mill_deflection_check": {
            result = await callOrThrow(await getEngine("physics"), ["checkDeflection"], params, "MillingForceEngine");
            break;
          }
          case "mill_chatter_predict": {
            result = await callOrThrow(await getEngine("physics"), ["predictChatter"], params, "MillingForceEngine");
            break;
          }
          case "mill_thermal_analyze": {
            result = await callOrThrow(await getEngine("thermal"), ["analyze"], params, "ThermalWearCouplingEngine");
            break;
          }
          case "mill_power_verify": {
            result = await callOrThrow(await getEngine("physics"), ["verifyPower"], params, "MillingForceEngine");
            break;
          }

          // ============================================================
          // COLLISION & KINEMATICS
          // ============================================================
          case "mill_collision_check": {
            result = await callOrThrow(await getEngine("collision"), ["checkCollision", "check"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_collision_zones": {
            result = await callOrThrow(await getEngine("collision"), ["getZones"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_kinematics_verify": {
            result = await callOrThrow(await getEngine("kinematics"), ["verifyKinematics"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_work_envelope": {
            result = await callOrThrow(await getEngine("kinematics"), ["checkEnvelope"], params, "MillKinematicsCollisionEngine");
            break;
          }

          // ============================================================
          // TOOL SELECTION
          // ============================================================
          case "mill_tool_recommend": {
            result = await callOrThrow(await getEngine("toolsel"), ["recommend"], params, "ToolSelectionRecommenderEngine");
            break;
          }
          case "mill_tool_assembly": {
            result = await callOrThrow(await getEngine("toolsel"), ["assemblyCheck"], params, "ToolSelectionRecommenderEngine");
            break;
          }
          case "mill_tool_holder_match": {
            result = await callOrThrow(await getEngine("toolsel"), ["matchHolder"], params, "ToolSelectionRecommenderEngine");
            break;
          }

          // ============================================================
          // AI/AGI FEATURES
          // ============================================================
          case "mill_agi_orchestrate": {
            result = await callOrThrow(await getEngine("agi"), ["orchestrate", "reason"], params, "MillingAGIMasterEngine");
            break;
          }
          case "mill_neural_recommend": {
            result = await callOrThrow(await getEngine("neural"), ["neuralRecommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_deeplearn_predict": {
            result = await callOrThrow(await getEngine("deeplearn"), ["predict"], params, "MillDeepLearningEngine");
            break;
          }
          case "mill_pattern_mine": {
            result = await callOrThrow(await getEngine("pattern"), ["mine"], params, "MillPatternMinerEngine");
            break;
          }
          case "mill_wisdom_query": {
            result = await callOrThrow(await getEngine("wisdom"), ["query"], params, "TribalKnowledgeAdvisorEngine");
            break;
          }

          // ============================================================
          // SELF-AWARENESS & CAPABILITY DISCOVERY
          // ============================================================
          case "mill_selfaware_registry": {
            const engine = await getEngine("selfaware");
            result = { registry: engine.getRegistry(), stats: engine.getStats() };
            break;
          }
          case "mill_selfaware_recommend": {
            const engine = await getEngine("selfaware");
            const task = params.task ?? params.query ?? "";
            result = { recommendations: engine.recommendFeatures(task) };
            break;
          }
          case "mill_selfaware_find": {
            const engine = await getEngine("selfaware");
            const query = params.query ?? params.task ?? "";
            result = { matches: engine.findEngines(query) };
            break;
          }
          case "mill_selfaware_stats": {
            const engine = await getEngine("selfaware");
            result = engine.getStats();
            break;
          }

          // ============================================================
          // DIGITAL TWIN
          // ============================================================
          case "mill_twin_sync": {
            result = await callOrThrow(await getEngine("twin"), ["sync"], params, "DigitalTwinSyncEngine");
            break;
          }
          case "mill_twin_predict": {
            result = await callOrThrow(await getEngine("twin"), ["predict"], params, "DigitalTwinSyncEngine");
            break;
          }
          case "mill_twin_calibrate": {
            result = await callOrThrow(await getEngine("twin"), ["calibrate"], params, "DigitalTwinSyncEngine");
            break;
          }

          // ============================================================
          // SCIENTIFIC PIPELINE
          // ============================================================
          case "mill_scientific_analyze": {
            result = await callOrThrow(await getEngine("scientific"), ["analyze"], params, "MillScientificPipelineEngine");
            break;
          }
          case "mill_scientific_optimize": {
            result = await callOrThrow(await getEngine("scientific"), ["optimize"], params, "MillScientificPipelineEngine");
            break;
          }
          case "mill_uncertainty_quantify": {
            result = await callOrThrow(await getEngine("scientific"), ["quantifyUncertainty"], params, "MillScientificPipelineEngine");
            break;
          }

          // ============================================================
          // QUICK HELPERS
          // ============================================================
          case "mill_quick_speed_feed": {
            result = await callOrThrow(await getEngine("physics"), ["quickSpeedFeed"], params, "MillingForceEngine");
            break;
          }
          case "mill_quick_cycle_time": {
            result = await callOrThrow(await getEngine("optimizer"), ["estimateCycleTime"], params, "MillProgramOptimizerEngine");
            break;
          }
          case "mill_quick_cost_estimate": {
            result = await callOrThrow(await getEngine("optimizer"), ["estimateCost"], params, "MillProgramOptimizerEngine");
            break;
          }

          // ============================================================
          // VALIDATION & QUALITY
          // ============================================================
          case "mill_validate_setup": {
            result = await callOrThrow(await getEngine("validate"), ["validateSetup"], params, "MillProgramAnalyzerEngine");
            break;
          }
          case "mill_validate_safety": {
            result = await callOrThrow(await getEngine("collision"), ["validateSafety"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_spc_analyze": {
            result = await callOrThrow(await getEngine("validate"), ["analyzeSPC"], params, "MillProgramAnalyzerEngine");
            break;
          }

          // ============================================================
          // P1-U09-L2-AGG: L2 AGGREGATOR ROUTING
          // ============================================================
          case "mill_ai_orchestrate": {
            const engine = await getEngine("ai_learn");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_turn_orchestrate": {
            const engine = await getEngine("mill_turn");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_5axis_orchestrate": {
            const engine = await getEngine("five_axis_agg");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_multiaxis_orchestrate": {
            const engine = await getEngine("multi_axis_agg");
            result = await engine.orchestrate(params);
            break;
          }

          // ============================================================
          // TRIBAL KNOWLEDGE (MillTribalKnowledgeEngine)
          // ============================================================
          case "mill_tribal_query": {
            const engine = await getEngine("tribal");
            result = engine.query(params);
            break;
          }
          case "mill_tribal_get": {
            const engine = await getEngine("tribal");
            result = engine.get(params.id);
            break;
          }
          case "mill_tribal_add": {
            const engine = await getEngine("tribal");
            engine.add(params);
            result = { success: true, id: params.id };
            break;
          }
          case "mill_tribal_stats": {
            const engine = await getEngine("tribal");
            result = engine.getStats();
            break;
          }

          // ============================================================
          // END-TO-END ORCHESTRATION (MillingEndToEndOrchestrationEngine)
          // ============================================================
          case "mill_e2e_workflow": {
            const engine = await getEngine("e2e");
            result = await engine.executeWorkflow(params);
            break;
          }

          // ============================================================
          // REASONING TRACE LEDGER (MillingReasoningTraceLedgerEngine)
          // ============================================================
          case "mill_trace_record": {
            const engine = await getEngine("trace_ledger");
            result = await engine.recordTrace(params);
            break;
          }
          case "mill_trace_query": {
            const engine = await getEngine("trace_ledger");
            result = engine.queryRecent(params.count ?? 20, params.filter);
            break;
          }

          // ============================================================
          // INFERENCE ORCHESTRATION (MillingInferenceOrchestratorEngine)
          // ============================================================
          case "mill_inference_run": {
            const engine = await getEngine("inference_orch");
            result = await engine.infer(params);
            break;
          }

          // ============================================================
          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH1: 6 unwired mill engines
          // ============================================================
          case "mill_helical_calc": {
            const { helicalMillingEngine } = await import("../../engines/HelicalMillingEngine.js");
            result = helicalMillingEngine.calculate(params as Parameters<typeof helicalMillingEngine.calculate>[0]);
            break;
          }
          case "mill_high_feed_calc": {
            const { highFeedMillingEngine } = await import("../../engines/HighFeedMillingEngine.js");
            result = highFeedMillingEngine.calculate(params as Parameters<typeof highFeedMillingEngine.calculate>[0]);
            break;
          }
          case "mill_program_parse": {
            const { millProgramLearningEngine } = await import("../../engines/MillProgramLearningEngine.js");
            const p = params as { content: string; source: Parameters<typeof millProgramLearningEngine.parseProgram>[1] };
            if (typeof p.content !== "string") throw new Error("mill_program_parse requires 'content' (G-code string)");
            if (!p.source) throw new Error("mill_program_parse requires 'source' (MillSource)");
            result = millProgramLearningEngine.parseProgram(p.content, p.source);
            break;
          }
          case "mill_resource_query": {
            const { millResourceAwarenessEngine } = await import("../../engines/MillResourceAwarenessEngine.js");
            result = millResourceAwarenessEngine.query(params as Parameters<typeof millResourceAwarenessEngine.query>[0]);
            break;
          }
          case "mill_strategy_list": {
            const { millingStrategyLibraryEngine } = await import("../../engines/MillingStrategyLibraryEngine.js");
            result = { strategies: millingStrategyLibraryEngine.getAllStrategies() };
            break;
          }
          case "mill_strategy_for_feature": {
            const { millingStrategyLibraryEngine } = await import("../../engines/MillingStrategyLibraryEngine.js");
            const featureType = (params as { featureType: string }).featureType;
            if (typeof featureType !== "string") throw new Error("mill_strategy_for_feature requires 'featureType'");
            result = {
              featureType,
              strategies: millingStrategyLibraryEngine.getStrategiesForFeature(
                featureType as Parameters<typeof millingStrategyLibraryEngine.getStrategiesForFeature>[0],
              ),
            };
            break;
          }

          // ============================================================
          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 neural/AI mill engines
          // ============================================================
          case "mill_neural_cognitive_process": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            result = millingNeuralCognitiveEngine.quickProcess(
              params as Parameters<typeof millingNeuralCognitiveEngine.quickProcess>[0],
            );
            break;
          }
          case "mill_critical_analyze": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            result = millingCriticalThinkingEngine.quickAnalyze(
              params as Parameters<typeof millingCriticalThinkingEngine.quickAnalyze>[0],
            );
            break;
          }
          case "mill_meta_learn_record": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            result = millingMetaLearningEngine.learnFromExperience(
              params as Parameters<typeof millingMetaLearningEngine.learnFromExperience>[0],
            );
            break;
          }
          case "mill_meta_learn_self_assess": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            result = millingMetaLearningEngine.selfAssess();
            break;
          }
          case "mill_ai_parse_nl_query": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            const q = (params as { query: string }).query;
            if (typeof q !== "string" || q.length === 0) throw new Error("mill_ai_parse_nl_query requires 'query'");
            result = millingAIIntegrationEngine.parseNaturalLanguageQuery(q);
            break;
          }
          case "mill_ai_archive_stats": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            result = millingAIIntegrationEngine.getArchiveStats();
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines
          case "mill_physics_force": {
            const { millingPhysicsKernelEngine } = await import("../../engines/MillingPhysicsKernelEngine.js");
            result = millingPhysicsKernelEngine.calculateMillingForces(params as Parameters<typeof millingPhysicsKernelEngine.calculateMillingForces>[0]);
            break;
          }
          case "mill_physics_tool_life": {
            const { millingPhysicsKernelEngine } = await import("../../engines/MillingPhysicsKernelEngine.js");
            result = millingPhysicsKernelEngine.calculateToolLife(params as Parameters<typeof millingPhysicsKernelEngine.calculateToolLife>[0]);
            break;
          }
          case "mill_program_pattern_analyze": {
            const { millingProgramPatternEngine } = await import("../../engines/MillingProgramPatternEngine.js");
            const p = params as { ncCode: string; sourcePath?: string };
            if (typeof p.ncCode !== "string" || p.ncCode.length === 0) throw new Error("mill_program_pattern_analyze requires 'ncCode'");
            result = millingProgramPatternEngine.analyzeProgram(p.ncCode, p.sourcePath);
            break;
          }
          case "mill_rl_select_action": {
            const { millingReinforcementLearningEngine } = await import("../../engines/MillingReinforcementLearningEngine.js");
            const p = params as { state: Parameters<typeof millingReinforcementLearningEngine.selectAction>[0]; explore?: boolean };
            if (!p.state || typeof p.state !== "object") throw new Error("mill_rl_select_action requires 'state' object");
            result = millingReinforcementLearningEngine.selectAction(p.state, p.explore);
            break;
          }
          case "mill_head_recommend": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            const p = params as { operations: Parameters<typeof millingHeadIntelligenceEngine.recommendMillingHead>[0]; constraints: Parameters<typeof millingHeadIntelligenceEngine.recommendMillingHead>[1] };
            if (!Array.isArray(p.operations) || p.operations.length === 0) throw new Error("mill_head_recommend requires non-empty 'operations'");
            if (!p.constraints || typeof p.constraints !== "object") throw new Error("mill_head_recommend requires 'constraints'");
            result = millingHeadIntelligenceEngine.recommendMillingHead(p.operations, p.constraints);
            break;
          }
          case "mill_machine_intel_get": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            const id = (params as { id: string }).id;
            if (typeof id !== "string" || id.length === 0) throw new Error("mill_machine_intel_get requires 'id'");
            result = millingMachineIntelligenceEngine.getMachine(id) ?? null;
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines
          case "mill_deep_reason": {
            const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
            const p = params as { query: string; context: Parameters<typeof millingDeepReasoningEngine.quickReason>[1] };
            if (typeof p.query !== "string" || p.query.length === 0) throw new Error("mill_deep_reason requires 'query'");
            if (!p.context || typeof p.context !== "object") throw new Error("mill_deep_reason requires 'context'");
            result = millingDeepReasoningEngine.quickReason(p.query, p.context);
            break;
          }
          case "mill_deep_integrate": {
            const { millingDeepIntegrationEngine } = await import("../../engines/MillingDeepIntegrationEngine.js");
            const ctx = (params as { context: Parameters<typeof millingDeepIntegrationEngine.quickIntegrate>[0] }).context
                      ?? (params as Parameters<typeof millingDeepIntegrationEngine.quickIntegrate>[0]);
            if (!ctx || typeof ctx !== "object") throw new Error("mill_deep_integrate requires 'context'");
            result = millingDeepIntegrationEngine.quickIntegrate(ctx);
            break;
          }
          case "mill_knowledge_search": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            const q = (params as { query: string }).query;
            if (typeof q !== "string" || q.length === 0) throw new Error("mill_knowledge_search requires 'query'");
            result = millingDeepKnowledgeSynthesisEngine.searchKnowledge(q);
            break;
          }
          case "mill_knowledge_stats": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            result = millingDeepKnowledgeSynthesisEngine.getSourceStats();
            break;
          }
          case "mill_ai_unified_recommend": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            const req = (params as { request: Parameters<typeof millingAIUnificationEngine.quickRecommend>[0] }).request
                      ?? (params as Parameters<typeof millingAIUnificationEngine.quickRecommend>[0]);
            if (!req || typeof req !== "object") throw new Error("mill_ai_unified_recommend requires 'request'");
            result = millingAIUnificationEngine.quickRecommend(req);
            break;
          }
          case "mill_milling_twin_sync": {
            const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
            const state = (params as { machineState: Parameters<typeof millingDigitalTwinEngine.sync>[0] }).machineState
                        ?? (params as Parameters<typeof millingDigitalTwinEngine.sync>[0]);
            if (!state || typeof state !== "object") throw new Error("mill_milling_twin_sync requires 'machineState'");
            result = millingDigitalTwinEngine.sync(state);
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines
          case "mill_agi_quick_analyze": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const p = params as {
              material: string;
              tool_diameter_mm: number;
              cutting_speed_m_min: number;
              feed_per_tooth_mm: number;
              axial_depth_mm: number;
            };
            if (typeof p.material !== "string" || p.material.length === 0) throw new Error("mill_agi_quick_analyze requires 'material'");
            if (!(p.tool_diameter_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'tool_diameter_mm'");
            if (!(p.cutting_speed_m_min > 0)) throw new Error("mill_agi_quick_analyze requires positive 'cutting_speed_m_min'");
            if (!(p.feed_per_tooth_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'feed_per_tooth_mm'");
            if (!(p.axial_depth_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'axial_depth_mm'");
            result = millingAGIOrchestrationEngine.quickAnalyze(
              p.material,
              p.tool_diameter_mm,
              p.cutting_speed_m_min,
              p.feed_per_tooth_mm,
              p.axial_depth_mm,
            );
            break;
          }
          case "mill_knowledge_orch_recommend": {
            const { millingKnowledgeOrchestratorEngine } = await import("../../engines/MillingKnowledgeOrchestratorEngine.js");
            const req = params as Parameters<typeof millingKnowledgeOrchestratorEngine.quickRecommend>[0];
            if (!req || typeof req !== "object") throw new Error("mill_knowledge_orch_recommend requires request object");
            result = millingKnowledgeOrchestratorEngine.quickRecommend(req);
            break;
          }
          case "mill_troubleshoot": {
            const { millingDeepAIHardeningEngine } = await import("../../engines/MillingDeepAIHardeningEngine.js");
            const p = params as Parameters<typeof millingDeepAIHardeningEngine.troubleshootMillingIssue>[0];
            if (!p || !Array.isArray((p as { symptoms?: unknown }).symptoms) || (p as { symptoms: unknown[] }).symptoms.length === 0) {
              throw new Error("mill_troubleshoot requires non-empty 'symptoms' array");
            }
            result = millingDeepAIHardeningEngine.troubleshootMillingIssue(p);
            break;
          }
          case "mill_lora_cadence_state": {
            const { millingLoRACadenceEngine } = await import("../../engines/MillingLoRACadenceEngine.js");
            result = millingLoRACadenceEngine.getState();
            break;
          }
          case "mill_online_record_step": {
            const { millingOnlineLearningTrackerEngine } = await import("../../engines/MillingOnlineLearningTrackerEngine.js");
            const p = params as Parameters<typeof millingOnlineLearningTrackerEngine.recordStep>[0];
            if (!p || typeof p !== "object") throw new Error("mill_online_record_step requires step object");
            if (!((p as { learning_rate?: number }).learning_rate! > 0)) throw new Error("mill_online_record_step requires positive 'learning_rate'");
            result = millingOnlineLearningTrackerEngine.recordStep(p);
            break;
          }
          case "mill_online_detect_drift": {
            const { millingOnlineLearningTrackerEngine } = await import("../../engines/MillingOnlineLearningTrackerEngine.js");
            const err = (params as { error: number }).error;
            if (typeof err !== "number" || !Number.isFinite(err)) throw new Error("mill_online_detect_drift requires numeric 'error'");
            result = millingOnlineLearningTrackerEngine.detectDrift(err);
            break;
          }

          // ============================================================
          // MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine
          // ============================================================
          // VALIDATION FLOW: Zod safeParse in ACTION_DATA_SCHEMAS (upstream
          // via validateActionParams) → engine.classify() (FAIL-LOUD defense
          // in depth for bypass-the-schema callers). Engine is pure-transform
          // — no fs, no state, deterministic.
          //
          // CONSUMER CONTRACT: slimResponse strips null/undefined fields.
          // Result envelope is `{ success: true, data: { ...result } }` via
          // the standard millDispatcher post-hook → JSON.stringify path.
          case "mill_part_classify": {
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            result = millPartClassifierEngine.classify(
              params as Parameters<typeof millPartClassifierEngine.classify>[0],
            );
            break;
          }
          case "mill_part_classify_batch": {
            // Zod upstream (mill_part_classify_batch schema in millActionSchemas.ts)
            // already rejects missing/non-array `parts`. No defensive guard here.
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            const p = params as { parts: Parameters<typeof millPartClassifierEngine.classify>[0][] };
            result = millPartClassifierEngine.classifyBatch(p.parts);
            break;
          }
          case "mill_part_family_profile": {
            // Zod upstream (mill_part_family_profile schema) already rejects
            // missing/wrong-type `family` via MillPartFamilySchema enum.
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            const p = params as { family: Parameters<typeof millPartClassifierEngine.getFamilyProfile>[0] };
            result = millPartClassifierEngine.getFamilyProfile(p.family);
            break;
          }
          case "mill_part_families_list": {
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            result = millPartClassifierEngine.listFamilies();
            break;
          }

          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_mill");
        }

        result = await Promise.resolve(result);

        // Post-calculation hooks
        const postCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: result },
          metadata: { dispatcher: "millDispatcher", action, result }
        };
        await hookExecutor.execute("post-calculation", postCtx);

        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };

      } catch (error: any) {
        log.error(`[prism_mill] Error in ${action}: ${error.message}`);
        return dispatcherError(error.message, action, "prism_mill");
      }
    }
  );
}
