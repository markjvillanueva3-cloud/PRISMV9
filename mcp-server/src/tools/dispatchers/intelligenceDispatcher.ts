/**
 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
 *
 * Routes 11 compound intelligence actions to IntelligenceEngine.
 * These actions compose calibrated physics engines + registry lookups
 * into high-level answers to manufacturing questions.
 *
 * Actions:
 *   job_plan, setup_sheet, process_cost, material_recommend,
 *   tool_recommend, machine_recommend, what_if, failure_diagnose,
 *   parameter_optimize, cycle_time_estimate, quality_predict
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { executeIntelligenceAction, INTELLIGENCE_ACTIONS, type IntelligenceAction } from "../../engines/IntelligenceEngine.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

const ACTIONS = [
  "job_plan",
  "setup_sheet",
  "process_cost",
  "material_recommend",
  "tool_recommend",
  "machine_recommend",
  "what_if",
  "failure_diagnose",
  "parameter_optimize",
  "cycle_time_estimate",
  "quality_predict",
] as const;

/**
 * Extract key values from intelligence action results for summary responses.
 */
function intelligenceExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    case "job_plan":
      return {
        material: result.material?.name,
        iso_group: result.material?.iso_group,
        operations: result.operations?.length,
        cycle_time_min: result.cycle_time?.total_min,
        confidence: result.confidence,
        safety_passed: result.safety?.all_checks_passed,
      };
    case "setup_sheet":
      return {
        material: result.material,
        operations: result.operations_count,
        tools: result.tool_count,
        format: result.format,
      };
    case "process_cost":
      return {
        total_cost: result.total_cost_per_part,
        machine_cost: result.machine_cost,
        tool_cost: result.tool_cost_per_part,
        cycle_time_min: result.cycle_time_min,
      };
    case "material_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        top_score: result.candidates?.[0]?.score,
      };
    case "tool_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        top_score: result.candidates?.[0]?.score,
      };
    case "machine_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        utilization: result.candidates?.[0]?.utilization_pct,
      };
    case "what_if":
      return {
        baseline_metric: result.baseline,
        changed_metric: result.changed,
        delta_pct: result.delta_pct,
      };
    case "failure_diagnose":
      return {
        root_cause: result.root_cause,
        confidence: result.confidence,
        fix_count: result.fixes?.length,
      };
    case "parameter_optimize":
      return {
        objective: result.objective,
        optimal_Vc: result.optimal?.cutting_speed,
        optimal_fz: result.optimal?.feed_per_tooth,
        improvement_pct: result.improvement_pct,
      };
    case "cycle_time_estimate":
      return {
        cutting_min: result.cutting_time,
        total_min: result.total_time,
        operations: result.operation_count,
      };
    case "quality_predict":
      return {
        predicted_Ra: result.Ra,
        predicted_Rz: result.Rz,
        tolerance_met: result.tolerance_met,
      };
    default:
      return result;
  }
}

export function registerIntelligenceDispatcher(server: any): void {
  server.tool(
    "prism_intelligence",
    "Compound intelligence actions for manufacturing: job planning, setup sheets, process costing, material/tool/machine recommendations, what-if analysis, failure diagnosis, parameter optimization, cycle time estimation, quality prediction. Actions: job_plan, setup_sheet, process_cost, material_recommend, tool_recommend, machine_recommend, what_if, failure_diagnose, parameter_optimize, cycle_time_estimate, quality_predict",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_intelligence] Action: ${action}`);

      // Ensure registries are initialized
      await registryManager.initialize();

      // Normalize common parameter aliases
      const params: Record<string, any> = { ...rawParams };
      if (params.material_name !== undefined && params.material === undefined) params.material = params.material_name;
      if (params.machine_name !== undefined && params.machine_id === undefined) params.machine_id = params.machine_name;
      if (params.tool_name !== undefined && params.tool_id === undefined) params.tool_id = params.tool_name;
      if (params.depth !== undefined && params.dimensions === undefined) {
        params.dimensions = { depth: params.depth, width: params.width, length: params.length };
      }

      try {
        // === PRE-INTELLIGENCE HOOKS ===
        const hookCtx = {
          operation: action,
          target: { type: "intelligence" as const, id: action, data: params },
          metadata: { dispatcher: "intelligenceDispatcher", action, params },
        };

        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                blocked: true,
                blocker: preResult.blockedBy,
                reason: preResult.summary,
                action,
              }),
            }],
          };
        }

        // === EXECUTE INTELLIGENCE ACTION ===
        const result = await executeIntelligenceAction(action as IntelligenceAction, params);

        // === POST-INTELLIGENCE HOOKS ===
        const postCtx = {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        };
        await hookExecutor.execute("post-calculation", postCtx);

        // === RESPONSE FORMATTING ===
        // Support response_level parameter
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => intelligenceExtractKeyValues(action, r)
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
          };
        }

        // Apply context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const slimLevel = getSlimLevel(pressure);
          const keyValues = intelligenceExtractKeyValues(action, result);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(slimResponse(
                { action, ...result },
                slimLevel,
                keyValues
              )),
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }],
        };
      } catch (err: any) {
        log.error(`[prism_intelligence] ${action} failed: ${err.message}`);

        // Return structured error (not a throw — keep MCP protocol clean)
        const isStub = err.message?.includes("not yet implemented");
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: true,
              action,
              message: err.message,
              stub: isStub,
              hint: isStub
                ? `Action "${action}" is scheduled for R3-MS0 implementation`
                : undefined,
            }),
          }],
        };
      }
    }
  );
}
