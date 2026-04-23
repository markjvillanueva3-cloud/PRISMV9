/**
 * Action schemas for SolidCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM38
 *
 * Unified cross-section index over all SolidCAM catalogs.
 */

import { z } from "zod";

export const solidcam_index_manifest = z.object({}).describe("Return the unified SolidCAM manifest (all section pointers + totals)");

export const solidcam_index_sections = z.object({}).describe("List all SolidCAM section keys");

export const solidcam_index_section_stats = z
  .object({
    section_key: z.string().min(1).describe("Section key (e.g. 'turning', 'millturn', '5-axis', '3d-hss-hsr', '2.5d_operations', 'imachining')"),
  })
  .describe("Get manifest stats for a single section");

export const solidcam_index_all_ops = z.object({}).describe("Return flat list of every operation across every section");

export const solidcam_index_find_op = z
  .object({
    operation_id: z.string().min(1).describe("Exact operation_id to locate across all sections"),
  })
  .describe("Find an operation across the entire SolidCAM index");

export const solidcam_index_find_param = z
  .object({
    parameter_name: z.string().min(1).describe("Substring match against parameter names"),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .describe("Search parameter names across every section + every operation");

export const solidcam_index_categories = z.object({}).describe("Return the deduplicated category universe across all sections");

export const solidcam_index_recommend = z
  .object({
    feature: z.string().min(1).describe("Feature/intent (e.g. 'od_thread', 'impeller', 'sub_spindle', 'undercut')"),
    hint: z.string().optional().describe("Optional disambiguation hint (e.g. 'imachining', 'swiss')"),
  })
  .describe("Route a feature/intent to (section_key, operation_id) across the unified index");

export const solidcam_index_validate = z.object({}).describe("Validate manifest totals vs actual sums + detect cross-section duplicate operation IDs");

export const ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS = {
  solidcam_index_manifest,
  solidcam_index_sections,
  solidcam_index_section_stats,
  solidcam_index_all_ops,
  solidcam_index_find_op,
  solidcam_index_find_param,
  solidcam_index_categories,
  solidcam_index_recommend,
  solidcam_index_validate,
};
