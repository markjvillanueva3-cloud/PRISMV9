import { z } from "zod";
import { handleThreadTool } from "../threadTools.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { log } from "../../utils/Logger.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_THREAD_SCHEMAS } from "../../schemas/threadActionSchemas.js";
import type { HookPhase as ExecutorHookPhase } from "../../engines/HookExecutor.js";

// Actions that perform calculations (vs lookups)
const CALC_ACTIONS = new Set([
  "calculate_tap_drill", "calculate_thread_mill_params", "calculate_thread_depth",
  "calculate_engagement_percent", "calculate_pitch_diameter", "calculate_minor_major_diameter",
  "calculate_thread_cutting_params", "calculate_thread_stripping",
  "thread_mill_helical_kinematics", "thread_mill_cutting_forces",
  "thread_mill_quality_predict", "thread_mill_multipass_strategy",
  "thread_mill_cycle_time", "thread_mill_recommend_tool",
  "thread_mill_lookup_standard", "thread_mill_chip_thinning"
]);
const CODE_ACTIONS = new Set(["generate_thread_gcode"]);

/** Registers thread dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
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
        "generate_thread_gcode",
        "calculate_thread_stripping",
        "thread_mill_helical_kinematics",
        "thread_mill_cutting_forces",
        "thread_mill_quality_predict",
        "thread_mill_multipass_strategy",
        "thread_mill_cycle_time",
        "thread_mill_recommend_tool",
        "thread_mill_lookup_standard",
        "thread_mill_chip_thinning"
      ]),
      params: z.record(z.string(), z.any()).optional()
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_THREAD_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_thread"
          );
        }

        const isCalc = CALC_ACTIONS.has(action);
        const isCode = CODE_ACTIONS.has(action);
        const hookCtx = {
          operation: action,
          target: { type: (isCode ? "code" : "calculation") as "code" | "calculation", id: action, data: params },
          metadata: { dispatcher: "threadDispatcher", action, params }
        };
        
        // Fire pre-hooks for calculations and code generation (blocking)
        if (isCalc || isCode) {
          const phase = isCode ? "pre-code-generate" : "pre-calculation";
          const preResult = await hookExecutor.execute(phase as ExecutorHookPhase, hookCtx);
          if (preResult.blocked) {
            return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
          }
        }
        
        // ThreadMillingPhysicsEngine actions (static methods)
        const THREAD_MILL_ACTIONS: Record<string, string> = {
          thread_mill_helical_kinematics: "computeHelicalKinematics",
          thread_mill_cutting_forces: "computeCuttingForces",
          thread_mill_quality_predict: "predictThreadQuality",
          thread_mill_multipass_strategy: "computeMultiPassStrategy",
          thread_mill_cycle_time: "computeCycleTime",
          thread_mill_recommend_tool: "recommendTool",
          thread_mill_lookup_standard: "lookupThreadStandard",
          thread_mill_chip_thinning: "computeChipThinning",
        };
        if (THREAD_MILL_ACTIONS[action]) {
          const { ThreadMillingPhysicsEngine } = await import("../../engines/ThreadMillingPhysicsEngine.js");
          const method = THREAD_MILL_ACTIONS[action];
          const tmResult = (ThreadMillingPhysicsEngine as any)[method](params);
          return { content: [{ type: "text", text: JSON.stringify(tmResult) }] };
        }

        const result = await handleThreadTool(action, params);
        
        // Fire post-hooks (non-blocking)
        if (isCalc || isCode) {
          const phase = isCode ? "post-code-generate" : "post-calculation";
          try { await hookExecutor.execute(phase as ExecutorHookPhase, { ...hookCtx, metadata: { ...hookCtx.metadata, result } }); }
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
              params: rawParams
            }, null, 2)
          }]
        };
      }
    }
  );
}