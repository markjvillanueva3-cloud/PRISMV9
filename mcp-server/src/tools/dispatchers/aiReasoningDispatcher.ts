/**
 * prism_ai — AI Reasoning Dispatcher
 * ====================================
 * Routes AI reasoning requests through MillMasterOrchestratorFacadeEngine.
 *
 * Actions (6):
 *   ai_route_mill_pipeline     — Full P2P pipeline orchestration
 *   ai_mill_agi_reason         — Multi-mode AGI reasoning
 *   ai_mill_awareness_query    — Query mill engine capabilities
 *   ai_mill_scientific_analyze — Physics-backed calculations
 *   ai_mill_wisdom_query       — Tribal knowledge queries
 *   ai_mill_adaptive_strategy  — Adaptive toolpath strategies
 *
 * @module tools/dispatchers/aiReasoningDispatcher
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../../schemas/aiReasoningActionSchemas.js";

// Lazy-loaded engine singletons
let _millFacade: typeof import("../../engines/MillMasterOrchestratorFacadeEngine.js").millMasterOrchestratorFacadeEngine | null = null;
let _millAwareness: typeof import("../../engines/MillAISelfAwarenessIntegrationEngine.js").millAISelfAwarenessIntegrationEngine | null = null;

async function getMillFacade() {
  if (!_millFacade) {
    const mod = await import("../../engines/MillMasterOrchestratorFacadeEngine.js");
    _millFacade = mod.millMasterOrchestratorFacadeEngine;
  }
  return _millFacade;
}

async function getMillAwareness() {
  if (!_millAwareness) {
    const mod = await import("../../engines/MillAISelfAwarenessIntegrationEngine.js");
    _millAwareness = mod.millAISelfAwarenessIntegrationEngine;
  }
  return _millAwareness;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(AI_REASONING_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIReasoningAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against schema
  const schema = ACTION_AI_REASONING_SCHEMAS[action];
  const validation = validateActionParams(action, params, schema);
  if (!validation.valid) {
    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
  }

  try {
    let result: unknown;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // ai_route_mill_pipeline — Full P2P pipeline
      // ─────────────────────────────────────────────────────────────────────
      case "ai_route_mill_pipeline": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "print_to_program",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          features: params.features as Record<string, unknown>[] | undefined,
          geometry: params.geometry,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_agi_reason — AGI reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_agi_reason": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "agi",
          intent: params.intent as string,
          reasoning_mode: params.reasoning_mode as string | undefined,
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_awareness_query — Query capabilities
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_awareness_query": {
        const awareness = await getMillAwareness();
        const query = params.query as string;
        const category = params.category as string | undefined;
        const topK = (params.top_k as number | undefined) ?? 10;

        // Find matching engines
        const matches = awareness.findEngines(query);

        // Filter by category if specified
        const filtered = category && category !== "all"
          ? matches.filter(m => m.category === category)
          : matches;

        // Limit results
        const limited = filtered.slice(0, topK);

        result = {
          query,
          category: category ?? "all",
          matches: limited,
          total_found: filtered.length,
          registry_stats: awareness.getStats(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_scientific_analyze — Physics analysis
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_scientific_analyze": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "scientific",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          analysis_type: params.analysis_type ?? "all",
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_wisdom_query — Tribal knowledge
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_wisdom_query": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "wisdom",
          query: params.query as string,
          domain: params.domain as string | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          query: params.query,
          domain: params.domain ?? "general",
          material: params.material,
          operation: params.operation,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_adaptive_strategy — Adaptive toolpath
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_adaptive_strategy": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "adaptive",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          tool: params.tool as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          operation: params.operation,
          feature_type: params.feature_type,
          stock_to_leave: params.stock_to_leave,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_record — Record a success pattern
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_record": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.record({
          task_category: params.task_category as string,
          task_description: params.task_description as string,
          task_keywords: params.task_keywords as string[],
          approach_summary: params.approach_summary as string,
          mcp_actions_used: params.mcp_actions_used as string[] | undefined,
          tools_used: params.tools_used as string[] | undefined,
          engines_invoked: params.engines_invoked as string[] | undefined,
          confidence: params.confidence as "high" | "medium" | "low" | undefined,
          domain: params.domain as string | undefined,
          constraints: params.constraints as string[] | undefined,
          lineage_id: params.lineage_id as string | undefined,
          pattern_id: params.pattern_id as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_query — Query patterns
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_query": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.query({
          task_category: params.task_category as string | undefined,
          keywords: params.keywords as string[] | undefined,
          domain: params.domain as string | undefined,
          min_confidence: params.min_confidence as "high" | "medium" | "low" | undefined,
          min_success_count: params.min_success_count as number | undefined,
          limit: params.limit as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_reinforce — Reinforce a pattern (success/failure)
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_reinforce": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.reinforce({
          pattern_id: params.pattern_id as string,
          success: params.success as boolean,
          note: params.note as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_stats — Get pattern bank statistics
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_stats": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.stats();
        break;
      }

      default: {
        const _exhaustive: never = action;
        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
      }
    }

    const duration = Date.now() - startTime;
    log.info(`[prism_ai] ${action} completed in ${duration}ms`);

    // Slim response
    const slimmed = slimResponse(result);

    return { success: true, data: slimmed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`[prism_ai] ${action} failed: ${message}`);
    return dispatcherError(message, action, "prism_ai");
  }
}

/** MCP tool handler entry point */
export async function aiReasoningDispatcher(
  args: { action: AIReasoningAction; params?: Record<string, unknown> }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(args.action, args.params ?? {});
}

/** Export action list for registration */
export { AI_REASONING_ACTIONS };

/** Register dispatcher with MCP server */
export function registerAIReasoningDispatcher(server: { tool: Function }): void {
  server.tool(
    aiReasoningDispatcherDef.name,
    aiReasoningDispatcherDef.description,
    aiReasoningDispatcherDef.inputSchema.shape,
    async ({ action, params = {} }: { action: AIReasoningAction; params?: Record<string, unknown> }) => {
      const result = await executeAIReasoningAction(action, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
