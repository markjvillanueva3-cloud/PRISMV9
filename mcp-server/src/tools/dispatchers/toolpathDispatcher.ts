import { z } from "zod";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import {
  toolpath_strategy_select,
  toolpath_params_calculate,
  toolpath_strategy_search,
  toolpath_strategy_list,
  toolpath_strategy_info,
  toolpath_stats,
  toolpath_material_strategies,
  toolpath_prism_novel
} from "../toolpathTools";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { toolpathGenerationEngine } from "../../engines/ToolpathGenerationEngine.js";
import { log } from "../../utils/Logger.js";

const CALC_ACTIONS = new Set(["params_calculate", "strategy_select", "generate"]);

export function registerToolpathDispatcher(server: any): void {
  server.tool(
    "prism_toolpath",
    "Toolpath strategy engine: strategy selection for features, parameter calculation, strategy search/list/info, statistics, material-specific strategies, PRISM novel strategies. Actions: strategy_select, params_calculate, strategy_search, strategy_list, strategy_info, stats, material_strategies, prism_novel",
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
        "generate"
      ]),
      params: z.record(z.any()).optional()
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

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
            result = await toolpath_strategy_select(params as any);
            break;

          case "params_calculate":
            result = await toolpath_params_calculate(params as any);
            break;

          case "strategy_search":
            result = await toolpath_strategy_search(params as any);
            break;

          case "strategy_list":
            result = await toolpath_strategy_list(params as any);
            break;

          case "strategy_info":
            result = await toolpath_strategy_info(params as any);
            break;

          case "stats":
            result = await toolpath_stats();
            break;

          case "material_strategies":
            result = await toolpath_material_strategies(params as any);
            break;

          case "prism_novel":
            result = await toolpath_prism_novel(params);
            break;

          case "generate": {
            // M-015: Expose ToolpathGenerationEngine.generate() via dispatcher
            const dims = {
              width_mm: params.width_mm, length_mm: params.length_mm,
              depth_mm: params.depth_mm, diameter_mm: params.diameter_mm,
            };
            result = toolpathGenerationEngine.generate(
              params.feature_type || "pocket_rectangular",
              dims,
              {
                strategy: params.strategy || "adaptive_clearing",
                tool_diameter_mm: params.tool_diameter_mm || 10,
                stepover_pct: params.stepover_pct || 40,
                stepdown_mm: params.stepdown_mm || 2,
                feed_rate_mmmin: params.feed_rate_mmmin || 1000,
                plunge_rate_mmmin: params.plunge_rate_mmmin || 300,
                spindle_rpm: params.spindle_rpm || 8000,
                cut_direction: params.cut_direction || "climb",
                coolant: params.coolant || "flood",
                retract_height_mm: params.retract_height_mm || 5,
                stock_to_leave_mm: params.stock_to_leave_mm,
                entry_strategy: params.entry_strategy || "ramp",
              }
            );
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