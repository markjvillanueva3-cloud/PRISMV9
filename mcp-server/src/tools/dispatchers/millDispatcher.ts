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
// MILL-WIRE-MS0/Batch1: swiss + LoRA dataset/cadence
let _swiss: any, _loraDataset: any, _loraCadence: any;
// MILL-WIRE-MS0/Batch2: mill-turn LoRA + CAM
let _mtLoraDataset: any, _mtLoraCadence: any, _mtCam: any;

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

    // MILL-WIRE-MS0/Batch1: Swiss pipeline + LoRA dataset/cadence
    case "swiss":
      return _swiss ??= (await import("../../engines/MillTurnSwissPipelineEngine.js")).millTurnSwissPipelineEngine;
    case "lora_dataset":
      return _loraDataset ??= (await import("../../engines/MillingLoRADatasetBuilderEngine.js")).millingLoRADatasetBuilderEngine;
    case "lora_cadence":
      return _loraCadence ??= (await import("../../engines/MillingLoRACadenceEngine.js")).millingLoRACadenceEngine;

    // MILL-WIRE-MS0/Batch2: mill-turn LoRA + CAM
    case "mt_lora_dataset":
      return _mtLoraDataset ??= (await import("../../engines/MillTurnLoRADatasetBuilderEngine.js")).millTurnLoRADatasetBuilderEngine;
    case "mt_lora_cadence":
      return _mtLoraCadence ??= (await import("../../engines/MillTurnLoRACadenceEngine.js")).millTurnLoRACadenceEngine;
    case "mt_cam":
      return _mtCam ??= (await import("../../engines/MillTurnCAMEngine.js")).millTurnCAMEngine;

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

  // MILL-WIRE-MS0/Batch1: Swiss pipeline + LoRA dataset/cadence (3 engines)
  "mill_swiss_calculate",
  "mill_lora_dataset_build",
  "mill_lora_cadence_check",

  // MILL-WIRE-MS0/Batch2: mill-turn LoRA + CAM (3 engines)
  "mill_turn_lora_dataset_build",
  "mill_turn_lora_cadence_check",
  "mill_turn_cam_generate",
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
          // MILL-WIRE-MS0/Batch1: Swiss pipeline + LoRA dataset/cadence
          // ============================================================
          case "mill_swiss_calculate": {
            result = await callOrThrow(await getEngine("swiss"), ["calculate"], params, "MillTurnSwissPipelineEngine");
            break;
          }
          case "mill_lora_dataset_build": {
            const engine = await getEngine("lora_dataset");
            const jobs = Array.isArray(params.jobs) ? params.jobs : [];
            result = engine.buildDataset(jobs, params.split);
            break;
          }
          case "mill_lora_cadence_check": {
            const engine = await getEngine("lora_cadence");
            result = engine.shouldTriggerRun();
            break;
          }

          // ============================================================
          // MILL-WIRE-MS0/Batch2: mill-turn LoRA + CAM
          // ============================================================
          case "mill_turn_lora_dataset_build": {
            const engine = await getEngine("mt_lora_dataset");
            const jobs = Array.isArray(params.jobs) ? params.jobs : [];
            result = engine.buildDataset(jobs, params.split);
            break;
          }
          case "mill_turn_lora_cadence_check": {
            const engine = await getEngine("mt_lora_cadence");
            result = engine.shouldTriggerRun();
            break;
          }
          case "mill_turn_cam_generate": {
            const engine = await getEngine("mt_cam");
            const operations = Array.isArray(params.operations) ? params.operations : [];
            const config = (params.config && typeof params.config === "object")
              ? params.config
              : { material_iso_group: "P", machine_type: "mill_turn" };
            result = engine.generate(operations, config);
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
