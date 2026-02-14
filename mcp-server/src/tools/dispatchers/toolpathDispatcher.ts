import { z } from "zod";
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
import { log } from "../../utils/Logger.js";

const CALC_ACTIONS = new Set(["params_calculate", "strategy_select"]);

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
        "prism_novel"
      ]),
      params: z.record(z.any()).optional()
    },
    async ({ action, params = {} }: { action: string; params?: Record<string, any> }) => {
      let result: any;
      const isCalc = CALC_ACTIONS.has(action);
      
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
          result = await toolpath_strategy_select(params);
          break;

        case "params_calculate":
          result = await toolpath_params_calculate(params);
          break;

        case "strategy_search":
          result = await toolpath_strategy_search(params);
          break;

        case "strategy_list":
          result = await toolpath_strategy_list(params);
          break;

        case "strategy_info":
          result = await toolpath_strategy_info(params);
          break;

        case "stats":
          result = await toolpath_stats();
          break;

        case "material_strategies":
          result = await toolpath_material_strategies(params);
          break;

        case "prism_novel":
          result = await toolpath_prism_novel(params);
          break;

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
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    }
  );
}