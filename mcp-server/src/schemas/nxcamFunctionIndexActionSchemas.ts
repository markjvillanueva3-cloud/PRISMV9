/**
 * Action schemas for NXCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM42
 */

import { z } from "zod";

export const nxcam_index_manifest = z.object({}).describe("Full NX CAM manifest (3 sections)");
export const nxcam_index_section_list = z.object({}).describe("Sorted section keys");
export const nxcam_index_section_stats = z
  .object({ section_key: z.string().min(1) })
  .describe("Per-section ops/params/categories");
export const nxcam_index_all_ops = z
  .object({})
  .describe("Flat operation list across all NX sections");
export const nxcam_index_find_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Cross-section operation lookup by id");
export const nxcam_index_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .describe("Search parameters across all NX sections");
export const nxcam_index_category_universe = z
  .object({})
  .describe("Every category across every section, deduplicated");
export const nxcam_index_recommend = z
  .object({
    feature: z.string().min(1),
    hint: z.string().optional(),
  })
  .describe("Route a feature to (section, operation_id) across NX CAM");
export const nxcam_index_validate = z
  .object({})
  .describe("Validate manifest totals + duplicate-id detection");

export const ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS = {
  nxcam_index_manifest,
  nxcam_index_section_list,
  nxcam_index_section_stats,
  nxcam_index_all_ops,
  nxcam_index_find_op,
  nxcam_index_find_param,
  nxcam_index_category_universe,
  nxcam_index_recommend,
  nxcam_index_validate,
};
