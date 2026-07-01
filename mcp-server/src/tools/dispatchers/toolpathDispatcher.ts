import { z } from "zod";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_TOOLPATH_SCHEMAS } from "../../schemas/toolpathActionSchemas.js";
import {
  toolpath_strategy_select,
  toolpath_params_calculate,
  toolpath_strategy_search,
  toolpath_strategy_list,
  toolpath_strategy_info,
  toolpath_stats,
  toolpath_material_strategies,
  toolpath_prism_novel
} from "../toolpathTools.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

/** Engine params are validated by Zod but engine functions have narrow signatures — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedParams = any;
import { toolpathGenerationEngine } from "../../engines/ToolpathGenerationEngine.js";
import { novelToolpathEngine } from "../../engines/NovelToolpathEngine.js";
import { extendedNovelToolpathEngine } from "../../engines/NovelToolpathAlgorithmsExt.js";
import { crossCamNovelEngine } from "../../engines/CrossCamNovelAlgorithms.js";
import { featureToZoneEngine } from "../../engines/FeatureToZoneEngine.js";
import { algorithmSelectorEngine } from "../../engines/AlgorithmSelectorEngine.js";
import { log } from "../../utils/Logger.js";

const CALC_ACTIONS = new Set(["params_calculate", "strategy_select", "generate"]);

/** Registers toolpath dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerToolpathDispatcher(server: any): void {
  server.tool(
    "prism_toolpath",
    "Toolpath strategy engine: strategy selection, parameter calculation, search/list/info, statistics, material strategies, PRISM novel strategies, novel physics-backed algorithms (TGAR/HRAF/MTHZD/CFSF/PTDC/VCER), extended scientific algorithms (MEGM/RSMP/WHAP/BOPA/MCTP/SFCR/KALP/PTAP/PARETO/CFCM/WBRL/DPLS), cross-CAM synergy algorithms (AMEF/VCMR/SNWF/EAPR/HBCF/MACS). Actions: strategy_select, params_calculate, strategy_search, strategy_list, strategy_info, stats, material_strategies, prism_novel, generate, novel_compute, novel_list, extended_compute, extended_list, crosscam_compute, crosscam_list, feature_to_zone, algorithm_select, tool_axis_optimize, segment_interpolate, novel_post_process, program_assemble, gcode_verify, novel_generate_program, simulate (Kienzle force/Jaeger temp/deflection/Brammertz roughness along path), collision_check (tool assembly collision detection), surface_finish_predict (Brammertz/scallop/waviness along path), cycle_time_estimate (accel/corner/overhead-aware timing)",
    {
      action: z.enum([
        "strategy_select",
        "params_calculate", 
        "strategy_search",
        "strategy_list",
        "strategy_info",
        "stats",
        "material_strategies",
        "prism_novel",
        "generate",
        "novel_compute",
        "novel_list",
        "extended_compute",
        "extended_list",
        "crosscam_compute",
        "crosscam_list",
        "feature_to_zone",
        "algorithm_select",
        "tool_axis_optimize",
        "segment_interpolate",
        "novel_post_process",
        "program_assemble",
        "gcode_verify",
        "novel_generate_program",
        "simulate",
        "stock_simulate",
        "collision_check",
        "surface_finish_predict",
        "cycle_time_estimate",
        "rest_machining",
        "operation_sequence",
        "transition_path",
        "adaptive_refine",
        "multi_setup_plan",
        "toolpath_smooth"
      ]),
      params: z.record(z.string(), z.any()).optional()
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_TOOLPATH_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_toolpath"
        );
      }

      let result: any;
      const isCalc = CALC_ACTIONS.has(action);

      try {
        // Pre-calculation hooks for strategy/param calculations
        if (isCalc) {
          const hookCtx = {
            operation: action,
            target: { type: "calculation" as const, id: action, data: params },
            metadata: { dispatcher: "toolpathDispatcher", action, params }
          };
          const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
          if (preResult.blocked) {
            return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
          }
        }

        switch (action) {
          case "strategy_select":
            result = await toolpath_strategy_select(params as ValidatedParams);
            break;

          case "params_calculate":
            result = await toolpath_params_calculate(params as ValidatedParams);
            break;

          case "strategy_search":
            result = await toolpath_strategy_search(params as ValidatedParams);
            break;

          case "strategy_list":
            result = await toolpath_strategy_list(params as ValidatedParams);
            break;

          case "strategy_info":
            result = await toolpath_strategy_info(params as ValidatedParams);
            break;

          case "stats":
            result = await toolpath_stats();
            break;

          case "material_strategies":
            result = await toolpath_material_strategies(params as ValidatedParams);
            break;

          case "prism_novel":
            result = await toolpath_prism_novel(params);
            break;

          case "novel_compute": {
            const algorithm = params.algorithm;
            if (!algorithm) throw new Error("algorithm is required (TGAR|HRAF|MTHZD|CFSF|PTDC|VCER)");
            result = novelToolpathEngine.compute({ algorithm, params: params as any });
            break;
          }

          case "novel_list":
            result = {
              algorithms: novelToolpathEngine.listAlgorithms(),
              materials: novelToolpathEngine.getAvailableMaterials(),
              count: 6
            };
            break;

          case "extended_compute": {
            const extAlgo = params.algorithm;
            if (!extAlgo) throw new Error("algorithm is required (MEGM|RSMP|WHAP|BOPA|MCTP|SFCR|KALP|PTAP|PARETO|CFCM|WBRL|DPLS)");
            result = extendedNovelToolpathEngine.compute(extAlgo, params as any);
            break;
          }

          case "extended_list":
            result = {
              algorithms: extendedNovelToolpathEngine.listAlgorithms(),
              materials: extendedNovelToolpathEngine.getAvailableMaterials(),
              count: 12
            };
            break;

          case "crosscam_compute": {
            const ccAlgo = params.algorithm;
            if (!ccAlgo) throw new Error("algorithm is required (AMEF|VCMR|SNWF|EAPR|HBCF|MACS)");
            result = crossCamNovelEngine.compute(ccAlgo, params as any);
            break;
          }

          case "crosscam_list":
            result = {
              algorithms: crossCamNovelEngine.listAlgorithms(),
              materials: crossCamNovelEngine.getAvailableMaterials(),
              count: 6
            };
            break;

          case "generate": {
            // M-015: Expose ToolpathGenerationEngine.generate() via dispatcher
            const dims = {
              width_mm: params.width_mm, length_mm: params.length_mm,
              depth_mm: params.depth_mm, diameter_mm: params.diameter_mm,
            };
            result = toolpathGenerationEngine.generate(
              params.feature_type ?? "pocket_rectangular",
              dims,
              {
                strategy: params.strategy ?? "adaptive_clearing",
                tool_diameter_mm: params.tool_diameter_mm ?? 10,
                stepover_pct: params.stepover_pct ?? 40,
                stepdown_mm: params.stepdown_mm ?? 2,
                feed_rate_mmmin: params.feed_rate_mmmin ?? 1000,
                plunge_rate_mmmin: params.plunge_rate_mmmin ?? 300,
                spindle_rpm: params.spindle_rpm ?? 8000,
                cut_direction: params.cut_direction ?? "climb",
                coolant: params.coolant ?? "flood",
                retract_height_mm: params.retract_height_mm ?? 5,
                stock_to_leave_mm: params.stock_to_leave_mm,
                entry_strategy: params.entry_strategy ?? "ramp",
              }
            );
            break;
          }

          case "algorithm_select": {
            const zone_type = params.zone_type;
            if (!zone_type) throw new Error("zone_type is required");
            if (!params.material) throw new Error("material is required");
            result = algorithmSelectorEngine.select({
              zone_type,
              material: params.material,
              machine: params.machine,
              priority: params.priority,
              depth_ratio: params.depth_ratio,
              wall_thickness_mm: params.wall_thickness_mm,
              target_ra_um: params.target_ra_um,
            });
            break;
          }

          case "tool_axis_optimize": {
            const { toolAxisOptimizationEngine } = await import("../../engines/ToolAxisOptimizationEngine.js");
            result = toolAxisOptimizationEngine.optimize(params as ValidatedParams);
            break;
          }

          case "feature_to_zone": {
            const features = params.features;
            if (!features || !Array.length) throw new Error("features array is required");
            const ftzResult = featureToZoneEngine.decompose(features);
            const fmt = params.output_format ?? "unified";
            if (fmt === "mthzd") {
              result = { ...ftzResult, zones: featureToZoneEngine.toMTHZDZones(ftzResult.zones) };
            } else if (fmt === "macs") {
              result = { ...ftzResult, zones: featureToZoneEngine.toMACSZones(ftzResult.zones) };
            } else {
              result = ftzResult;
            }
            break;
          }

          // ── CAMK-MS1: Novel Algorithm → G-Code pipeline ──
          case "segment_interpolate": {
            const { segmentInterpolatorEngine } = await import("../../engines/SegmentInterpolatorEngine.js");
            result = segmentInterpolatorEngine.interpolate(params as ValidatedParams);
            break;
          }

          case "novel_post_process": {
            const { novelPostProcessorBridgeEngine } = await import("../../engines/NovelPostProcessorBridgeEngine.js");
            result = novelPostProcessorBridgeEngine.postProcess(params as ValidatedParams);
            break;
          }

          case "program_assemble": {
            const { programStructureEngine } = await import("../../engines/ProgramStructureEngine.js");
            result = programStructureEngine.assemble(params as ValidatedParams);
            break;
          }

          case "gcode_verify": {
            const { gCodeVerificationEngine } = await import("../../engines/GCodeVerificationEngine.js");
            result = gCodeVerificationEngine.verify(params as ValidatedParams);
            break;
          }

          case "novel_generate_program": {
            const { endToEndPipelineEngine } = await import("../../engines/EndToEndPipelineEngine.js");
            result = endToEndPipelineEngine.generate(params as ValidatedParams);
            break;
          }

          case "simulate": {
            const { novelToolpathSimulatorEngine } = await import("../../engines/NovelToolpathSimulatorEngine.js");
            result = novelToolpathSimulatorEngine.simulate(params as ValidatedParams);
            break;
          }

          case "stock_simulate": {
            const { voxelStockIntegrationEngine } = await import("../../engines/VoxelStockIntegrationEngine.js");
            result = voxelStockIntegrationEngine.simulate(params as ValidatedParams);
            break;
          }

          case "collision_check": {
            const { collisionIntegrationEngine } = await import("../../engines/CollisionIntegrationEngine.js");
            result = collisionIntegrationEngine.check(params as ValidatedParams);
            break;
          }

          case "surface_finish_predict": {
            const { surfaceFinishPredictorEngine } = await import("../../engines/SurfaceFinishPredictorEngine.js");
            result = surfaceFinishPredictorEngine.predict(params as ValidatedParams);
            break;
          }

          case "cycle_time_estimate": {
            const { cycleTimeAccuracyEngine } = await import("../../engines/CycleTimeAccuracyEngine.js");
            result = cycleTimeAccuracyEngine.estimate(params as ValidatedParams);
            break;
          }

          case "rest_machining": {
            const { restMachiningEngine } = await import("../../engines/RestMachiningEngine.js");
            result = restMachiningEngine.analyze(params as ValidatedParams);
            break;
          }

          case "operation_sequence": {
            const { operationSequencerEngine } = await import("../../engines/OperationSequencerEngine.js");
            result = operationSequencerEngine.sequence(params as ValidatedParams);
            break;
          }

          case "transition_path": {
            const { transitionPathEngine } = await import("../../engines/TransitionPathEngine.js");
            result = transitionPathEngine.plan(params as ValidatedParams);
            break;
          }

          case "adaptive_refine": {
            const { adaptiveRefinementEngine } = await import("../../engines/AdaptiveRefinementEngine.js");
            result = adaptiveRefinementEngine.refine(params as ValidatedParams);
            break;
          }

          case "multi_setup_plan": {
            const { multiSetupPlannerEngine } = await import("../../engines/MultiSetupPlannerEngine.js");
            result = multiSetupPlannerEngine.plan(params as ValidatedParams);
            break;
          }

          case "toolpath_smooth": {
            const { toolpathSmoothingEngine } = await import("../../engines/ToolpathSmoothingEngine.js");
            result = toolpathSmoothingEngine.smooth(params as ValidatedParams);
            break;
          }

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        // Post-calculation hooks (non-blocking)
        if (isCalc) {
          try {
            await hookExecutor.execute("post-calculation", {
              operation: action,
              target: { type: "calculation" as const, id: action, data: params },
              metadata: { dispatcher: "toolpathDispatcher", action, result }
            });
          } catch (e) { log.warn(`[toolpathDispatcher] Post-calc hook error: ${e}`); }
        }

        return {
          content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }]
        };
      } catch (err: any) {
        return dispatcherError(err, action, "prism_toolpath");
      }
    }
  );
}