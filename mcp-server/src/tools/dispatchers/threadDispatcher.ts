import { z } from "zod";
import { handleThreadTool } from "../threadTools.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { log } from "../../utils/Logger.js";

// Actions that perform calculations (vs lookups)
const CALC_ACTIONS = new Set([
  "calculate_tap_drill", "calculate_thread_mill_params", "calculate_thread_depth",
  "calculate_engagement_percent", "calculate_pitch_diameter", "calculate_minor_major_diameter",
  "calculate_thread_cutting_params"
]);
const CODE_ACTIONS = new Set(["generate_thread_gcode"]);

export function registerThreadDispatcher(server: any): void {
  server.tool(
    "prism_thread",
    "Threading calculations: tap drill, thread milling, depth, engagement, specs, Go/No-Go gauges, diameters, insert selection, cutting params, fit class, G-code.",
    {
      action: z.enum([
        "calculate_tap_drill",
        "calculate_thread_mill_params", 
        "calculate_thread_depth",
        "calculate_engagement_percent",
        "get_thread_specifications",
        "get_go_nogo_gauges",
        "calculate_pitch_diameter",
        "calculate_minor_major_diameter",
        "select_thread_insert",
        "calculate_thread_cutting_params",
        "validate_thread_fit_class",
        "generate_thread_gcode"
      ]),
      params: z.record(z.any()).optional()
    },
    async ({ action, params: rawParams = {} }) => {
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        const isCalc = CALC_ACTIONS.has(action);
        const isCode = CODE_ACTIONS.has(action);
        const hookCtx = {
          operation: action,
          target: { type: (isCode ? "code" : "calculation") as any, id: action, data: params },
          metadata: { dispatcher: "threadDispatcher", action, params }
        };
        
        // Fire pre-hooks for calculations and code generation (blocking)
        if (isCalc || isCode) {
          const phase = isCode ? "pre-code-generate" : "pre-calculation";
          const preResult = await hookExecutor.execute(phase as any, hookCtx);
          if (preResult.blocked) {
            return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
          }
        }
        
        const result = await handleThreadTool(action, params);
        
        // Fire post-hooks (non-blocking)
        if (isCalc || isCode) {
          const phase = isCode ? "post-code-generate" : "post-calculation";
          try { await hookExecutor.execute(phase as any, { ...hookCtx, metadata: { ...hookCtx.metadata, result } }); }
          catch (e) { log.warn(`[threadDispatcher] Post-hook error: ${e}`); }
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text", 
            text: JSON.stringify({
              error: "Thread calculation failed",
              details: error instanceof Error ? error.message : "Unknown error",
              action,
              params
            }, null, 2)
          }]
        };
      }
    }
  );
}