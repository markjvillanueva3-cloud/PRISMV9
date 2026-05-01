/**
 * prism_proven_pipeline — Proven Pipeline Dispatcher
 *
 * 22 actions across 4 engines:
 *   ProvenPartRecipeEngine (9): proven_recipe_create/get/update/delete/list/search/tag/export/import
 *   PartSimilarityEngine (4): similarity_compare/find_nearest/batch/set_weights
 *   AdaptivePipelineGeneratorEngine (3): pipeline_adapt/adapt_step/preview
 *   ProvenPipelineOrchestratorEngine (6): proven_prove_out/find_similar/generate_pipeline/compare/record_outcome/dashboard
 *
 * @milestone PROVEN-MS0
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_PROVEN_PIPELINE_SCHEMAS } from "../../schemas/provenPipelineActionSchemas.js";

// Lazy engine cache
let _recipe: any;
let _similarity: any;
let _adaptive: any;
let _orchestrator: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "recipe":
      return _recipe ??= (
        await import("../../engines/ProvenPartRecipeEngine.js")
      ).provenPartRecipeEngine;
    case "similarity":
      return _similarity ??= (
        await import("../../engines/PartSimilarityEngine.js")
      ).partSimilarityEngine;
    case "adaptive":
      return _adaptive ??= (
        await import("../../engines/AdaptivePipelineGeneratorEngine.js")
      ).adaptivePipelineGeneratorEngine;
    case "orchestrator":
      return _orchestrator ??= (
        await import("../../engines/ProvenPipelineOrchestratorEngine.js")
      ).provenPipelineOrchestratorEngine;
    default:
      throw new Error(`Unknown proven pipeline engine: ${name}`);
  }
}

const ACTIONS = [
  // ProvenPartRecipeEngine
  "proven_recipe_create", "proven_recipe_get", "proven_recipe_update",
  "proven_recipe_delete", "proven_recipe_list", "proven_recipe_search",
  "proven_recipe_tag", "proven_recipe_export", "proven_recipe_import",
  // PartSimilarityEngine
  "similarity_compare", "similarity_find_nearest", "similarity_batch",
  "similarity_set_weights",
  // AdaptivePipelineGeneratorEngine
  "pipeline_adapt", "pipeline_adapt_step", "pipeline_preview",
  // ProvenPipelineOrchestratorEngine
  "proven_prove_out", "proven_find_similar", "proven_generate_pipeline",
  "proven_compare", "proven_record_outcome", "proven_dashboard",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers proven pipeline dispatcher.
 * @param server - MCP server instance
 */
export function registerProvenPipelineDispatcher(server: any): void {
  server.tool(
    "prism_proven_pipeline",
    `Proven Pipeline dispatcher — proven part recipes, similarity matching, adaptive pipeline generation.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_proven_pipeline] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_PROVEN_PIPELINE_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_proven_pipeline"
        );
      }

      try {
        switch (action) {
          // ================================================================
          // ProvenPartRecipeEngine (9)
          // ================================================================
          case "proven_recipe_create": {
            const eng = await getEngine("recipe");
            const result = eng.create({
              part_name: params.part_name,
              material: params.material,
              iso_group: params.iso_group ?? "P",
              hardness_hb: params.hardness_hb,
              dimensions: params.dimensions,
              features: params.features ?? [],
              tolerances: params.tolerances ?? [],
              surface_finish_ra: params.surface_finish_ra,
              operations: params.operations,
              steps: params.steps,
              cycle_time_min: params.cycle_time_min,
              notes: params.notes,
              tags: params.tags ?? [],
            });
            return dispatcherResult(result);
          }
          case "proven_recipe_get": {
            const eng = await getEngine("recipe");
            const result = eng.get(params.recipe_id);
            return result ? dispatcherResult(result) : dispatcherError("Recipe not found", action, "prism_proven_pipeline");
          }
          case "proven_recipe_update": {
            const eng = await getEngine("recipe");
            const result = eng.update(params.recipe_id, params.updates);
            return result ? dispatcherResult(result) : dispatcherError("Recipe not found", action, "prism_proven_pipeline");
          }
          case "proven_recipe_delete": {
            const eng = await getEngine("recipe");
            const deleted = eng.delete(params.recipe_id);
            return dispatcherResult({ deleted, recipe_id: params.recipe_id });
          }
          case "proven_recipe_list": {
            const eng = await getEngine("recipe");
            const all = eng.list();
            const offset = params.offset ?? 0;
            const limit = params.limit ?? 50;
            return dispatcherResult({ total: all.length, recipes: all.slice(offset, offset + limit) });
          }
          case "proven_recipe_search": {
            const eng = await getEngine("recipe");
            const results = eng.search(params);
            return dispatcherResult({ count: results.length, results });
          }
          case "proven_recipe_tag": {
            const eng = await getEngine("recipe");
            const result = eng.tag(params.recipe_id, params.action, params.tags);
            return result ? dispatcherResult(result) : dispatcherError("Recipe not found", action, "prism_proven_pipeline");
          }
          case "proven_recipe_export": {
            const eng = await getEngine("recipe");
            const data = eng.export();
            return dispatcherResult({ count: data.length, recipes: data });
          }
          case "proven_recipe_import": {
            const eng = await getEngine("recipe");
            const result = eng.import(params.recipes);
            return dispatcherResult(result);
          }

          // ================================================================
          // PartSimilarityEngine (4)
          // ================================================================
          case "similarity_compare": {
            const eng = await getEngine("similarity");
            const result = eng.compare(params.spec_a, params.spec_b, params.custom_weights);
            return dispatcherResult(result);
          }
          case "similarity_find_nearest": {
            const eng = await getEngine("similarity");
            const result = eng.findNearest(params.target, params.candidates, params.top_n, params.custom_weights);
            return dispatcherResult(result);
          }
          case "similarity_batch": {
            const eng = await getEngine("similarity");
            const result = eng.batch(params.specs, params.custom_weights);
            return dispatcherResult(result);
          }
          case "similarity_set_weights": {
            const eng = await getEngine("similarity");
            const result = eng.setWeights(params.weights);
            return dispatcherResult(result);
          }

          // ================================================================
          // AdaptivePipelineGeneratorEngine (3)
          // ================================================================
          case "pipeline_adapt": {
            const eng = await getEngine("adaptive");
            let sourceRecipe = params.source_recipe;
            if (!sourceRecipe && params.source_recipe_id) {
              const recipeEng = await getEngine("recipe");
              sourceRecipe = recipeEng.get(params.source_recipe_id);
              if (!sourceRecipe) return dispatcherError("Source recipe not found", action, "prism_proven_pipeline");
            }
            const result = eng.adapt({
              source_recipe: sourceRecipe,
              target_spec: params.target_spec,
              similarity_score: params.similarity_score ?? 0.8,
              aggressiveness: params.aggressiveness,
            });
            return dispatcherResult(result);
          }
          case "pipeline_adapt_step": {
            const eng = await getEngine("adaptive");
            const result = eng.adaptStep({
              step: params.step,
              step_index: 0,
              forceRatio: 1.0,
              hardnessAdj: params.source_hardness_hb && params.target_hardness_hb
                ? params.source_hardness_hb / params.target_hardness_hb
                : 1.0,
              dimScale: 1.0,
              aggressiveness: params.aggressiveness ?? 0.5,
              tgtIso: params.target_iso_group,
              warnings: [],
            });
            return dispatcherResult(result);
          }
          case "pipeline_preview": {
            const eng = await getEngine("adaptive");
            const result = eng.preview(params);
            return dispatcherResult(result);
          }

          // ================================================================
          // ProvenPipelineOrchestratorEngine (6)
          // ================================================================
          case "proven_prove_out": {
            const eng = await getEngine("orchestrator");
            const result = eng.proveOut(params);
            return dispatcherResult(result);
          }
          case "proven_find_similar": {
            const eng = await getEngine("orchestrator");
            const result = eng.findSimilar(params);
            return dispatcherResult(result);
          }
          case "proven_generate_pipeline": {
            const eng = await getEngine("orchestrator");
            const result = eng.generatePipeline(params);
            return dispatcherResult(result);
          }
          case "proven_compare": {
            const eng = await getEngine("orchestrator");
            const result = eng.compare(params);
            return dispatcherResult(result);
          }
          case "proven_record_outcome": {
            const eng = await getEngine("orchestrator");
            const result = eng.recordOutcome(params);
            return dispatcherResult(result);
          }
          case "proven_dashboard": {
            const eng = await getEngine("orchestrator");
            const result = eng.dashboard();
            return dispatcherResult(result);
          }

          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_proven_pipeline");
        }
      } catch (err: any) {
        log.error(`[prism_proven_pipeline] ERROR action=${action}: ${err.message}`);
        return dispatcherError(err.message ?? "Internal error", action, "prism_proven_pipeline");
      }
    }
  );
}
