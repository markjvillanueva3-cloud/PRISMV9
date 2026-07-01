/**
 * prism_cam_function — CAM Function Index Dispatcher
 * =============================================================================
 *
 * Dedicated dispatcher for the 8 CAM-function intelligence engines built under
 * U-CAM71..U-CAM78. Carved out of the 17K-line camDispatcher monolith so the
 * function-index surface (route/validate/recommend/optimize/translate/reason/
 * tribal/feature) has its own focused entry point with its own schemas and
 * tests.
 *
 * Action names are prefixed `cam_func_*` to satisfy the cross-dispatcher
 * uniqueness rule (rules/dispatchers.md) — the equivalent unprefixed actions
 * still exist in `camDispatcher.ts` for backward compatibility. New callers
 * should prefer this dispatcher; old callers continue to work unchanged.
 *
 * 8 actions — wired engines:
 *   - cam_func_route                → CAMFunctionRouterEngine        (U-CAM71)
 *   - cam_func_validate             → CAMParameterValidatorEngine    (U-CAM72)
 *   - cam_func_strategy_recommend   → CAMStrategyRecommenderEngine   (U-CAM73)
 *   - cam_func_param_optimize       → CAMParameterOptimizerEngine    (U-CAM74)
 *   - cam_func_translate            → CAMCrossSystemTranslatorEngine (U-CAM75)
 *   - cam_func_agi_reason           → CAMAGIReasoningEngine          (U-CAM76)
 *   - cam_func_tribal_lookup        → CAMTribalKnowledgeEngine       (U-CAM77)
 *   - cam_func_feature_recognize   → CAMFeatureLearningEngine        (U-CAM78)
 *
 * Authored 2026-05-06 — CAM-EXHAUST-MS0 U-CAM79.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CAM_FUNCTION_ACTION_SCHEMAS } from "../../schemas/camFunctionActionSchemas.js";

const ACTIONS = [
  "cam_func_route",
  "cam_func_validate",
  "cam_func_strategy_recommend",
  "cam_func_param_optimize",
  "cam_func_translate",
  "cam_func_agi_reason",
  "cam_func_tribal_lookup",
  "cam_func_feature_recognize",
] as const;

export type CAMFunctionAction = typeof ACTIONS[number];

/**
 * Pure routing entry point — returns the engine result without MCP wrapping.
 * Exposed so tests (and other internal callers) can invoke the dispatcher
 * surface without going through the MCP server harness.
 */
export async function dispatchCamFunction(
  action: CAMFunctionAction,
  rawParams: Record<string, unknown> = {},
): Promise<unknown> {
  // H1-MS2 param normalization (snake_case → camelCase) — match camDispatcher
  let params: Record<string, unknown> = rawParams;
  try {
    const { normalizeParams } = await import("../../utils/paramNormalizer.js");
    params = normalizeParams(rawParams) as Record<string, unknown>;
  } catch {
    /* normalizer not available — proceed with raw params */
  }

  // Zod schema validation
  const validation = validateActionParams(action, params, CAM_FUNCTION_ACTION_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(
      `Invalid params for '${action}': ${validation.errorMessage}`,
      action,
      "prism_cam_function",
    );
  }

  switch (action) {
    case "cam_func_route": {
      const { camFunctionRouterEngine } = await import("../../engines/CAMFunctionRouterEngine.js");
      return camFunctionRouterEngine.route({
        intent: String(params.intent ?? ""),
        target_cam: params.target_cam !== undefined ? String(params.target_cam) : undefined,
      });
    }
    case "cam_func_validate": {
      const { camParameterValidatorEngine } = await import("../../engines/CAMParameterValidatorEngine.js");
      return camParameterValidatorEngine.validate({
        target_cam: String(params.target_cam ?? ""),
        parameters: (params.parameters as Record<string, unknown>) ?? {},
        operation: params.operation !== undefined ? String(params.operation) : undefined,
      });
    }
    case "cam_func_strategy_recommend": {
      const { camStrategyRecommenderEngine } = await import("../../engines/CAMStrategyRecommenderEngine.js");
      // Closed-loop consume: feed the recommender the learned empirical strategy
      // effectiveness (win-rates persisted across restarts by SelfLearningCAMEngine,
      // U-CAM-LEARN-PERSIST). Opt-out via use_learned:false. Fail-soft -- a learner
      // error must never block a recommendation.
      let empirical_ranking:
        | Array<{ strategy: string; winRate: number; confidence: "low" | "medium" | "high"; observations: number }>
        | undefined;
      if (params.use_learned !== false) {
        try {
          const { selfLearningCAMEngine } = await import("../../engines/SelfLearningCAMEngine.js");
          const ranking = selfLearningCAMEngine.strategyRanking({
            materialGroup:
              params.material_group !== undefined
                ? (String(params.material_group) as "P" | "M" | "K" | "N" | "S" | "H")
                : undefined,
            geometryClass: params.geometry_class !== undefined ? String(params.geometry_class) : undefined,
            minObservations: 1,
          });
          empirical_ranking = (ranking?.rankings ?? []).map((r) => ({
            strategy: r.strategy,
            winRate: r.winRate.rate,
            confidence: r.confidence,
            observations: r.observations,
          }));
        } catch (err) {
          // Fail-soft: a learner error must never block a recommendation -- but do
          // NOT swallow it silently; a permanently-cold loop must be detectable (R12).
          empirical_ranking = undefined;
          console.warn(`[cam_func_strategy_recommend] learned re-rank unavailable (loop ran cold): ${String(err)}`);
        }
      }
      return camStrategyRecommenderEngine.recommend({
        target_cam: String(params.target_cam ?? ""),
        part_hint: params.part_hint !== undefined ? String(params.part_hint) : undefined,
        material: params.material !== undefined ? String(params.material) : undefined,
        max_alternatives:
          params.max_alternatives !== undefined ? Number(params.max_alternatives) : undefined,
        empirical_ranking,
      });
    }
    case "cam_func_param_optimize": {
      const { camParameterOptimizerEngine } = await import("../../engines/CAMParameterOptimizerEngine.js");
      return camParameterOptimizerEngine.optimize({
        target_cam: String(params.target_cam ?? ""),
        objective: params.objective as
          | "cycle_time"
          | "surface_finish"
          | "tool_life"
          | "balanced",
        current: (params.current as Record<string, number>) ?? {},
        max_step_pct:
          params.max_step_pct !== undefined ? Number(params.max_step_pct) : undefined,
      });
    }
    case "cam_func_translate": {
      const { camCrossSystemTranslatorEngine } = await import("../../engines/CAMCrossSystemTranslatorEngine.js");
      return camCrossSystemTranslatorEngine.translate({
        source_cam: String(params.source_cam ?? ""),
        target_cam: String(params.target_cam ?? ""),
        source_operation: String(params.source_operation ?? ""),
        source_parameters: (params.source_parameters as Record<string, unknown>) ?? {},
      });
    }
    case "cam_func_agi_reason": {
      const { camAGIReasoningEngine } = await import("../../engines/CAMAGIReasoningEngine.js");
      return camAGIReasoningEngine.reason({
        target_cam: String(params.target_cam ?? ""),
        decision_context: String(params.decision_context ?? ""),
        options: Array.isArray(params.options) ? (params.options as string[]) : [],
      });
    }
    case "cam_func_tribal_lookup": {
      const { camTribalKnowledgeEngine } = await import("../../engines/CAMTribalKnowledgeEngine.js");
      return camTribalKnowledgeEngine.lookup({
        target_cam: String(params.target_cam ?? ""),
        query: String(params.query ?? ""),
        max_tips:
          params.max_tips !== undefined ? Number(params.max_tips) : undefined,
      });
    }
    case "cam_func_feature_recognize": {
      const { camFeatureLearningEngine } = await import("../../engines/CAMFeatureLearningEngine.js");
      return camFeatureLearningEngine.recognize({
        target_cam: String(params.target_cam ?? ""),
        part_geometry_hint:
          params.part_geometry_hint !== undefined
            ? String(params.part_geometry_hint)
            : undefined,
      });
    }
    default: {
      // Exhaustiveness — TypeScript ensures every action is handled above.
      const _never: never = action;
      return { error: `Unknown action: ${String(_never)}` };
    }
  }
}

/**
 * Register the prism_cam_function MCP tool.
 *
 * @param server - MCP server instance
 * @returns void
 */
export function registerCamFunctionDispatcher(server: any): void {
  server.tool(
    "prism_cam_function",
    `CAM Function Index dispatcher — routes natural-language intent to CAM operations,
validates parameters against per-CAM catalog, recommends strategies, optimizes
parameters per objective, translates between CAM systems, applies AGI reasoning,
serves curated tribal knowledge, and recognizes features. Each action is backed
by its own engine (U-CAM71..U-CAM78) and the catalog drift telemetry is included
in every response so dashboards stay honest.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: CAMFunctionAction;
      params?: Record<string, any>;
    }) => {
      log.info(`[prism_cam_function] Action: ${action}`);
      let result: unknown;
      try {
        result = await dispatchCamFunction(action, rawParams);
      } catch (error) {
        return dispatcherError(error, action, "prism_cam_function");
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(slimResponse(result)) },
        ],
      };
    },
  );
}
