/**
 * Action schemas for ESPRITFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM53
 */

import { z } from "zod";

const SECTION_VALUES = [
  "milling",
  "lathe_millturn",
  "wire_edm",
  "knowledge_based_machining",
] as const;

export const esprit_index = z.object({}).describe("Full ESPRIT unified manifest");
export const esprit_summary = z.object({}).describe("ESPRIT totals summary");
export const esprit_list_sections = z.object({}).describe("List 4 ESPRIT sections");
export const esprit_section_stats = z
  .object({ section_key: z.enum(SECTION_VALUES) })
  .describe("Stats for one ESPRIT section");
export const esprit_list_ops = z.object({}).describe("Flat list of all 32 ESPRIT ops");
export const esprit_find_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Cross-section operation lookup");
export const esprit_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Cross-section parameter search");
export const esprit_categories = z.object({}).describe("Deduplicated category universe");
export const esprit_recommend = z
  .object({
    feature: z.string().min(1),
    hint: z.string().optional(),
  })
  .describe("Route feature to (section, operation_id)");
export const esprit_consistency = z.object({}).describe("Manifest vs actual consistency + duplicate detection");

export const ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS = {
  esprit_index,
  esprit_summary,
  esprit_list_sections,
  esprit_section_stats,
  esprit_list_ops,
  esprit_find_op,
  esprit_find_param,
  esprit_categories,
  esprit_recommend,
  esprit_consistency,
};
