/**
 * Action schemas for ESPRITKBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM52
 */

import { z } from "zod";

const INTENT_VALUES = [
  "auto_recognize_features",
  "apply_template_to_features",
  "save_template_from_chain",
  "macro_chain_recipe",
  "probe_inspection",
  "track_stock_model",
  "optimize_tool_list",
] as const;

export const esprit_kbm_index = z.object({}).describe("Full ESPRIT KBM catalog");
export const esprit_kbm_summary = z.object({}).describe("Summary stats");
export const esprit_kbm_list_ops = z.object({}).describe("List 7 KBM ops");
export const esprit_kbm_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one KBM operation");
export const esprit_kbm_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter KBM ops by category");
export const esprit_kbm_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters");
export const esprit_kbm_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend KBM operation");
export const esprit_kbm_select_scan_depth = z
  .object({ part_complexity_score: z.number().min(0).max(10) })
  .describe("Pick scan depth from complexity score");
export const esprit_kbm_probe_tolerance_for_it = z
  .object({ it_grade: z.number().int().min(5).max(16) })
  .describe("Map ISO 286 IT grade to probe tolerances");
export const esprit_kbm_estimate_consolidation = z
  .object({
    tool_count: z.number().int().min(1).max(500),
    diameter_tolerance_pct: z.number().min(0).max(10),
    max_consolidation_per_tool: z.number().int().min(1).max(10),
  })
  .describe("Estimate magazine reduction from tool consolidation");

export const ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS = {
  esprit_kbm_index,
  esprit_kbm_summary,
  esprit_kbm_list_ops,
  esprit_kbm_get_op,
  esprit_kbm_by_category,
  esprit_kbm_find_param,
  esprit_kbm_recommend,
  esprit_kbm_select_scan_depth,
  esprit_kbm_probe_tolerance_for_it,
  esprit_kbm_estimate_consolidation,
};
