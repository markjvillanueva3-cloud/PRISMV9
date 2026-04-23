/**
 * Action schemas for HypermillExtendedFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM48
 */

import { z } from "zod";

const SECTION_VALUES = [
  "2d_operations",
  "3d_operations",
  "tool_database",
  "stock_fixture",
  "virtual_machining",
  "automation_center",
  "post_processor",
] as const;

export const hm_ext_index = z.object({}).describe("Full hyperMILL extended (modern flat) catalog manifest");
export const hm_ext_summary = z.object({}).describe("Section/op/parameter summary");
export const hm_ext_list_sections = z.object({}).describe("List 7 modern hyperMILL sections");
export const hm_ext_section_stats = z
  .object({ section_key: z.enum(SECTION_VALUES) })
  .describe("Stats for a specific section");
export const hm_ext_list_ops = z.object({}).describe("Flat list of all 45 ops across 7 sections");
export const hm_ext_find_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Cross-section operation lookup by id");
export const hm_ext_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across all 7 sections");
export const hm_ext_categories = z.object({}).describe("Deduplicated category universe across all sections");
export const hm_ext_recommend = z
  .object({
    feature: z.string().min(1),
    hint: z.string().optional(),
  })
  .describe("Recommend (section, operation_id) for a generic feature/hint");
export const hm_ext_consistency = z.object({}).describe("Manifest vs actual consistency report");

export const ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS = {
  hm_ext_index,
  hm_ext_summary,
  hm_ext_list_sections,
  hm_ext_section_stats,
  hm_ext_list_ops,
  hm_ext_find_op,
  hm_ext_find_param,
  hm_ext_categories,
  hm_ext_recommend,
  hm_ext_consistency,
};
