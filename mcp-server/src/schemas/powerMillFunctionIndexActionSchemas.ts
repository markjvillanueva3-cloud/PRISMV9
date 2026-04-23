/**
 * Action schemas for PowerMillFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM46
 */

import { z } from "zod";

export const pm_index_manifest = z.object({}).describe("Full PowerMill manifest (3 sections)");
export const pm_index_section_list = z.object({}).describe("Sorted section keys");
export const pm_index_section_stats = z
  .object({ section_key: z.string().min(1) })
  .describe("Per-section ops/params/categories");
export const pm_index_all_ops = z
  .object({})
  .describe("Flat operation list across all PowerMill sections");
export const pm_index_find_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Cross-section operation lookup by id");
export const pm_index_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .describe("Search parameters across all PowerMill sections");
export const pm_index_category_universe = z
  .object({})
  .describe("Every category across every section, deduplicated");
export const pm_index_recommend = z
  .object({
    feature: z.string().min(1),
    hint: z.string().optional(),
  })
  .describe("Route a feature to (section, operation_id) across PowerMill");
export const pm_index_validate = z
  .object({})
  .describe("Validate manifest totals + duplicate-id detection");

export const ACTION_PM_FUNCTION_INDEX_SCHEMAS = {
  pm_index_manifest,
  pm_index_section_list,
  pm_index_section_stats,
  pm_index_all_ops,
  pm_index_find_op,
  pm_index_find_param,
  pm_index_category_universe,
  pm_index_recommend,
  pm_index_validate,
};
