/**
 * Proven Pipeline Action Schemas — Zod v4
 *
 * Schemas for:
 *   - ProvenPartRecipeEngine (9 actions: proven_recipe_*)
 *   - PartSimilarityEngine (4 actions: similarity_*)
 *   - AdaptivePipelineGeneratorEngine (3 actions: pipeline_*)
 *   - ProvenPipelineOrchestratorEngine (6 actions: proven_*)
 *
 * Total: 22 actions
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// Shared sub-schemas
// ============================================================================

const dimensionsZ = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
}).optional();

const toleranceZ = z.object({
  dimension: z.string(),
  value_mm: z.number(),
});

const recipeStepZ = z.object({
  operation: z.string(),
  tool_diameter_mm: z.number(),
  tool_type: z.string(),
  rpm: z.number(),
  feed_mmmin: z.number(),
  axial_depth_mm: z.number(),
  radial_depth_mm: z.number(),
  coolant: z.string(),
}).passthrough();

const partSpecZ = z.object({
  material: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  hardness_hb: z.number().optional(),
  dimensions: dimensionsZ,
  features: z.array(z.string()).optional(),
  tolerances: z.array(toleranceZ).optional(),
  surface_finish_ra: z.number().optional(),
  operations: z.array(z.string()).optional(),
  machine_type: z.string().optional(),
  batch_size: z.number().optional(),
}).passthrough();

const adaptedStepZ = z.object({
  step_index: z.number(),
  operation: z.string(),
  tool_diameter_mm: z.number(),
  tool_type: z.string(),
  rpm: z.number(),
  feed_mmmin: z.number(),
  axial_depth_mm: z.number(),
  radial_depth_mm: z.number(),
  coolant: z.string(),
  adaptation_notes: z.array(z.string()),
}).passthrough();

// ============================================================================
// ProvenPartRecipeEngine actions (9)
// ============================================================================

const proven_recipe_create = z.object({
  part_name: z.string(),
  material: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  hardness_hb: z.number().optional(),
  dimensions: dimensionsZ,
  features: z.array(z.string()).optional(),
  tolerances: z.array(toleranceZ).optional(),
  surface_finish_ra: z.number().optional(),
  operations: z.array(z.string()),
  steps: z.array(recipeStepZ),
  cycle_time_min: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

const proven_recipe_get = z.object({
  recipe_id: z.string(),
}).passthrough();

const proven_recipe_update = z.object({
  recipe_id: z.string(),
  updates: z.object({
    part_name: z.string().optional(),
    material: z.string().optional(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    hardness_hb: z.number().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    steps: z.array(recipeStepZ).optional(),
  }).passthrough(),
}).passthrough();

const proven_recipe_delete = z.object({
  recipe_id: z.string(),
}).passthrough();

const proven_recipe_list = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
}).passthrough();

const proven_recipe_search = z.object({
  material: z.string().optional(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  operations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  min_hardness_hb: z.number().optional(),
  max_hardness_hb: z.number().optional(),
  part_name_contains: z.string().optional(),
  feature_contains: z.string().optional(),
}).passthrough();

const proven_recipe_tag = z.object({
  recipe_id: z.string(),
  action: z.enum(["add", "remove"]),
  tags: z.array(z.string()),
}).passthrough();

const proven_recipe_export = z.object({
  format: z.enum(["json"]).optional(),
}).passthrough();

const proven_recipe_import = z.object({
  recipes: z.array(z.object({
    id: z.string(),
    part_name: z.string(),
    material: z.string(),
    iso_group: z.string(),
    features: z.array(z.string()),
    tolerances: z.array(toleranceZ),
    operations: z.array(z.string()),
    steps: z.array(recipeStepZ),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  }).passthrough()),
}).passthrough();

// ============================================================================
// PartSimilarityEngine actions (4)
// ============================================================================

const similarity_compare = z.object({
  spec_a: partSpecZ,
  spec_b: partSpecZ,
  custom_weights: z.record(z.string(), z.number()).optional(),
}).passthrough();

const similarity_find_nearest = z.object({
  target: partSpecZ,
  candidates: z.array(z.object({
    id: z.string(),
    spec: partSpecZ,
  }).passthrough()),
  top_n: z.number().optional(),
  custom_weights: z.record(z.string(), z.number()).optional(),
}).passthrough();

const similarity_batch = z.object({
  specs: z.array(z.object({
    id: z.string(),
    spec: partSpecZ,
  }).passthrough()),
  custom_weights: z.record(z.string(), z.number()).optional(),
}).passthrough();

const similarity_set_weights = z.object({
  weights: z.record(z.string(), z.number()),
}).passthrough();

// ============================================================================
// AdaptivePipelineGeneratorEngine actions (3)
// ============================================================================

const pipeline_adapt = z.object({
  source_recipe_id: z.string().optional(),
  source_recipe: z.any().optional(),
  target_spec: partSpecZ,
  similarity_score: z.number().optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const pipeline_adapt_step = z.object({
  step: recipeStepZ,
  source_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  target_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  source_hardness_hb: z.number().optional(),
  target_hardness_hb: z.number().optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const pipeline_preview = z.object({
  source_iso_group: z.string(),
  target_iso_group: z.string(),
  source_hardness_hb: z.number().optional(),
  target_hardness_hb: z.number().optional(),
  sample_rpm: z.number(),
  sample_feed_mmmin: z.number(),
}).passthrough();

// ============================================================================
// ProvenPipelineOrchestratorEngine actions (6)
// ============================================================================

const proven_prove_out = z.object({
  part_name: z.string(),
  spec: partSpecZ,
  steps: z.array(recipeStepZ),
  cycle_time_min: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

const proven_find_similar = z.object({
  spec: partSpecZ,
  top_n: z.number().optional(),
  min_score: z.number().optional(),
  custom_weights: z.record(z.string(), z.number()).optional(),
}).passthrough();

const proven_generate_pipeline = z.object({
  spec: partSpecZ,
  recipe_id: z.string().optional(),
  custom_weights: z.record(z.string(), z.number()).optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const proven_compare = z.object({
  recipe_id: z.string(),
  adapted_steps: z.array(adaptedStepZ),
}).passthrough();

const proven_record_outcome = z.object({
  recipe_id: z.string(),
  success: z.boolean(),
  actual_cycle_time_min: z.number().optional(),
  dimension_accuracy_pct: z.number().optional(),
  surface_finish_actual_ra: z.number().optional(),
  notes: z.string().optional(),
}).passthrough();

const proven_dashboard = z.object({
  include_top_n: z.number().optional(),
}).passthrough();

// ============================================================================
// Merged export
// ============================================================================

export const ACTION_PROVEN_PIPELINE_SCHEMAS: ActionSchemaMap = {
  // ProvenPartRecipeEngine
  proven_recipe_create,
  proven_recipe_get,
  proven_recipe_update,
  proven_recipe_delete,
  proven_recipe_list,
  proven_recipe_search,
  proven_recipe_tag,
  proven_recipe_export,
  proven_recipe_import,
  // PartSimilarityEngine
  similarity_compare,
  similarity_find_nearest,
  similarity_batch,
  similarity_set_weights,
  // AdaptivePipelineGeneratorEngine
  pipeline_adapt,
  pipeline_adapt_step,
  pipeline_preview,
  // ProvenPipelineOrchestratorEngine
  proven_prove_out,
  proven_find_similar,
  proven_generate_pipeline,
  proven_compare,
  proven_record_outcome,
  proven_dashboard,
};
