/**
 * prism_unwired_bridge — Bridge dispatcher for cross-cutting unwired engines.
 *
 * WIRE-UNWIRED-BRIDGE-MS0/U-VICTOR-UNWIRED-BRIDGE (slot:victor, 2026-05-26).
 *
 * This is the "bridge engines that can be utilized together" surface called
 * out by the operator's wire-unwired /goal directive. Rather than scatter 10
 * unrelated engines across 10 massive existing dispatchers (camDispatcher is
 * 1.1MB, devDispatcher is 570K, sessionDispatcher is 214K — high-contention
 * peer-claimed real-estate), this dedicated mini-dispatcher absorbs analytics
 * + asset-discovery + cognitive-router primitives into one focused surface.
 *
 * 10 actions across 4 sub-domains:
 *   asset_recommend         AssetRecommendationEngine.recommend
 *   asset_synergy_top       AssetSynergyDetectorEngine.topSynergies
 *   asset_unused_surface    UnusedAssetSurfacerEngine.surface
 *   timeseries_arima        TimeSeriesForecastEngine.arima
 *   hypothesis_create_set   HypothesisRankerEngine.createHypothesisSet
 *   golden_baseline_init    GoldenBaselineManagerEngine.initialize
 *   fisher_entropy          FisherInformationEngine.entropy
 *   fisher_kl_divergence    FisherInformationEngine.klDivergence
 *   complexity_classify     ComplexityAwareRouterEngine.classify
 *   predictive_world_simulate PredictiveWorldSimulatorEngine.simulate
 *
 * Per H:/.claude/rules/dispatchers.md every action has lazy import + engine
 * dispatch. Per schemas.md every action has a matching Zod schema entry.
 *
 * Author: slot:victor (claude-2423b113) — 2026-05-26.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import type { ActionSchemaMap } from "../../schemas/actionSchemaTypes.js";

const ACTIONS = [
  "asset_recommend",
  "asset_synergy_top",
  "asset_unused_surface",
  "timeseries_arima",
  "hypothesis_create_set",
  "golden_baseline_init",
  "fisher_entropy",
  "fisher_kl_divergence",
  "complexity_classify",
  "predictive_world_simulate",
] as const;

export type UnwiredBridgeAction = typeof ACTIONS[number];

const SCHEMAS: ActionSchemaMap = {
  asset_recommend: z.object({}).passthrough()
    .describe("AssetRecommendationEngine.recommend — query the registry for top-K assets matching the supplied criteria. Pass RecommendationQuery shape."),
  asset_synergy_top: z.object({
    limit: z.number().int().positive().optional().describe("Max synergies to return (default 10)"),
    minCoOccurrence: z.number().int().positive().optional().describe("Min co-occurrence count (default 2)"),
  }).passthrough()
    .describe("AssetSynergyDetectorEngine.topSynergies — top asset pairs by co-occurrence."),
  asset_unused_surface: z.object({
    records: z.array(z.unknown()).optional().describe("AssetInvocationRecord[] to analyze"),
    nowMs: z.number().int().nonnegative().optional(),
  }).passthrough()
    .describe("UnusedAssetSurfacerEngine.surface — surface unused assets per surfacer config."),
  timeseries_arima: z.object({}).passthrough()
    .describe("TimeSeriesForecastEngine.arima — ARIMA forecast on the supplied series. Pass ARIMAInput shape."),
  hypothesis_create_set: z.object({
    problem: z.string().min(1).describe("Problem statement to seed the hypothesis set"),
  }).passthrough()
    .describe("HypothesisRankerEngine.createHypothesisSet — create a ranked hypothesis set for a problem."),
  golden_baseline_init: z.object({}).passthrough()
    .describe("GoldenBaselineManagerEngine.initialize — idempotent setup of the golden-baseline store."),
  fisher_entropy: z.object({
    dist: z.array(z.number().nonnegative()).min(1).describe("Probability distribution"),
  }).passthrough()
    .describe("FisherInformationEngine.entropy — Shannon entropy of the distribution."),
  fisher_kl_divergence: z.object({
    p: z.array(z.number().nonnegative()).min(1),
    q: z.array(z.number().nonnegative()).min(1),
  }).passthrough()
    .describe("FisherInformationEngine.klDivergence — KL(p || q). Both arrays must have the same length."),
  complexity_classify: z.object({}).passthrough()
    .describe("ComplexityAwareRouterEngine.classify — classify a problem by its features into a routing decision."),
  predictive_world_simulate: z.object({}).passthrough()
    .describe("PredictiveWorldSimulatorEngine.simulate — simulate effect of a ChangeDescriptor on the PRISM world model."),
};

/** Registers prism_unwired_bridge dispatcher. */
export function registerUnwiredBridgeDispatcher(server: any): void {
  server.tool(
    "prism_unwired_bridge",
    `prism_unwired_bridge — bridge for 10 cross-cutting unwired engines: asset discovery (recommend/synergy/unused), analytics (ARIMA/hypothesis/golden-baseline), information theory (entropy/KL-divergence), complexity routing, predictive-world simulation. Actions: ${ACTIONS.join(", ")}.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: UnwiredBridgeAction; params?: Record<string, any> }) => {
      log.info(`[prism_unwired_bridge] Action: ${action}`);
      let result: any;
      try {
        let params: Record<string, any> = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams) as Record<string, any>;
        } catch { /* ok */ }

        const v = validateActionParams(action, params, SCHEMAS);
        if (!v.valid) {
          return dispatcherError(`Invalid params for '${action}': ${v.errorMessage}`, action, "prism_unwired_bridge");
        }

        switch (action) {
          case "asset_recommend": {
            const { assetRecommendationEngine } = await import("../../engines/AssetRecommendationEngine.js");
            result = { success: true, data: assetRecommendationEngine.recommend(params as any) };
            break;
          }
          case "asset_synergy_top": {
            const { assetSynergyDetectorEngine } = await import("../../engines/AssetSynergyDetectorEngine.js");
            const p = params as any;
            result = { success: true, data: assetSynergyDetectorEngine.topSynergies(p?.limit, p?.minCoOccurrence) };
            break;
          }
          case "asset_unused_surface": {
            const { unusedAssetSurfacerEngine } = await import("../../engines/UnusedAssetSurfacerEngine.js");
            const p = params as any;
            const records = Array.isArray(p?.records) ? p.records : [];
            result = { success: true, data: unusedAssetSurfacerEngine.surface(records, p?.nowMs) };
            break;
          }
          case "timeseries_arima": {
            const { TimeSeriesForecastEngine } = await import("../../engines/TimeSeriesForecastEngine.js");
            const engine = new TimeSeriesForecastEngine();
            result = { success: true, data: engine.arima(params as any) };
            break;
          }
          case "hypothesis_create_set": {
            const { hypothesisRankerEngine } = await import("../../engines/HypothesisRankerEngine.js");
            const p = params as any;
            result = { success: true, data: hypothesisRankerEngine.createHypothesisSet(String(p?.problem ?? "")) };
            break;
          }
          case "golden_baseline_init": {
            const { goldenBaselineManagerEngine } = await import("../../engines/GoldenBaselineManagerEngine.js");
            goldenBaselineManagerEngine.initialize();
            result = { success: true, data: { initialized: true } };
            break;
          }
          case "fisher_entropy": {
            const { fisherInformationEngine } = await import("../../engines/FisherInformationEngine.js");
            const p = params as any;
            result = { success: true, data: { entropy: fisherInformationEngine.entropy(p?.dist) } };
            break;
          }
          case "fisher_kl_divergence": {
            const { fisherInformationEngine } = await import("../../engines/FisherInformationEngine.js");
            const p = params as any;
            result = { success: true, data: { kl: fisherInformationEngine.klDivergence(p?.p, p?.q) } };
            break;
          }
          case "complexity_classify": {
            const { complexityAwareRouterEngine } = await import("../../engines/ComplexityAwareRouterEngine.js");
            result = { success: true, data: complexityAwareRouterEngine.classify(params as any) };
            break;
          }
          case "predictive_world_simulate": {
            const { predictiveWorldSimulatorEngine } = await import("../../engines/PredictiveWorldSimulatorEngine.js");
            result = { success: true, data: predictiveWorldSimulatorEngine.simulate(params as any) };
            break;
          }
          default: {
            const _exhaustive: never = action;
            return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_unwired_bridge");
          }
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_unwired_bridge");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    },
  );
  log.info("Registered: prism_unwired_bridge dispatcher (10 actions, 10 engines wired)");
}
