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

// Dev-loop AI engines (lazy)
let _aiRouter: typeof import("../../engines/AISystemRouterEngine.js").aiSystemRouterEngine | null = null;
let _aiAuto: typeof import("../../engines/AIAutoUtilizationEngine.js").aiAutoUtilizationEngine | null = null;
let _aiExtract: typeof import("../../engines/AIExtractionReasonerEngine.js").aiExtractionReasoner | null = null;

async function getAiRouter() {
  if (!_aiRouter) { _aiRouter = (await import("../../engines/AISystemRouterEngine.js")).aiSystemRouterEngine; }
  return _aiRouter;
}
async function getAiAuto() {
  if (!_aiAuto) { _aiAuto = (await import("../../engines/AIAutoUtilizationEngine.js")).aiAutoUtilizationEngine; }
  return _aiAuto;
}
async function getAiExtract() {
  if (!_aiExtract) { _aiExtract = (await import("../../engines/AIExtractionReasonerEngine.js")).aiExtractionReasoner; }
  return _aiExtract;
}

// WIRE-MS0/U-WIRE07 — dev-process reasoning + learning singletons
let _causal: typeof import("../../engines/CausalReasoningEngine.js").causalReasoningEngine | null = null;
let _exception: typeof import("../../engines/ExceptionLearningEngine.js").exceptionLearningEngine | null = null;
let _metalearn: typeof import("../../engines/MetaLearningOptimizerEngine.js").metaLearningOptimizerEngine | null = null;

async function getCausal() {
  if (!_causal) { _causal = (await import("../../engines/CausalReasoningEngine.js")).causalReasoningEngine; }
  return _causal;
}
async function getException() {
  if (!_exception) { _exception = (await import("../../engines/ExceptionLearningEngine.js")).exceptionLearningEngine; }
  return _exception;
}
async function getMetalearn() {
  if (!_metalearn) { _metalearn = (await import("../../engines/MetaLearningOptimizerEngine.js")).metaLearningOptimizerEngine; }
  return _metalearn;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(AI_REASONING_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIReasoningAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against per-action schema map.
  // Note: validateActionParams takes the FULL map, not a single schema —
  // pre-existing dispatcher had this miswired (single schema → passthrough).
  const validation = validateActionParams(action, params, ACTION_AI_REASONING_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(
      validation.errorMessage ?? "Validation failed",
      action,
      "prism_ai",
    );
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
      // Dev-loop AI utilities (added 2026-04-25 per AI engine audit)
      // ─────────────────────────────────────────────────────────────────────
      case "ai_route_task": {
        const router = await getAiRouter();
        result = router.route(String(params.task ?? ""));
        break;
      }
      case "ai_health_report": {
        const router = await getAiRouter();
        if (params.backend) {
          result = router.probe(params.backend as never);
        } else {
          result = { backends: router.healthReport() };
        }
        break;
      }
      case "ai_recommend_capability": {
        const auto = await getAiAuto();
        const ctx = params.experience ? { experienceLevel: String(params.experience) as never } : undefined;
        result = auto.analyze(String(params.input ?? ""), ctx as never);
        break;
      }
      case "ai_classify_content": {
        const reasoner = await getAiExtract();
        result = await reasoner.classifyContent(params.content);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-MS0/U-WIRE07 — dev-process reasoning + learning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_causal_add_edge": {
        const causal = await getCausal();
        result = causal.addEdge({
          from: String(params.from),
          to: String(params.to),
          confidence: Number(params.confidence),
          polarity: params.polarity as "positive" | "negative" | "unknown",
          reason: params.reason as string | undefined,
        });
        break;
      }
      case "ai_causal_trace_impact": {
        const causal = await getCausal();
        result = causal.traceImpact(
          String(params.source),
          (params.maxHops as number | undefined) ?? 3,
        );
        break;
      }
      case "ai_causal_root_causes": {
        const causal = await getCausal();
        result = {
          target: String(params.target),
          maxHops: (params.maxHops as number | undefined) ?? 3,
          rootCauses: causal.rootCauses(
            String(params.target),
            (params.maxHops as number | undefined) ?? 3,
          ),
        };
        break;
      }
      case "ai_exception_handle": {
        const exception = await getException();
        result = exception.handleUnexpected({
          type: params.type as "parameter_outlier" | "outcome_anomaly" | "process_deviation" | "measurement_spike",
          description: String(params.description),
          context: (params.context ?? {}) as Record<string, unknown>,
          data: (params.data ?? {}) as Record<string, number | string>,
          severity: params.severity as "info" | "warning" | "critical",
        });
        break;
      }
      case "ai_exception_record_outcome": {
        const exception = await getException();
        const learned = exception.recordOutcome(
          String(params.eventId),
          params.outcome as "success" | "failure" | "neutral",
        );
        result = learned ?? { error: `eventId not found: ${params.eventId}` };
        break;
      }
      case "ai_exception_stats": {
        const exception = await getException();
        result = exception.getStatistics();
        break;
      }
      case "ai_metalearn_record": {
        const metalearn = await getMetalearn();
        result = metalearn.record({
          scenario: String(params.scenario),
          strategy: String(params.strategy),
          success: Boolean(params.success),
          durationMs: params.durationMs as number | undefined,
        });
        break;
      }
      case "ai_metalearn_recommend": {
        const metalearn = await getMetalearn();
        const rec = metalearn.recommend(
          String(params.scenario),
          (params.minAttempts as number | undefined) ?? 1,
        );
        result = rec ?? { scenario: String(params.scenario), recommendation: null };
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
    const slimmed = slimResponse(result, "L3");

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
