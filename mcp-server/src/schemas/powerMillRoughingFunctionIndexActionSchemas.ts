/**
 * Action schemas for PowerMillRoughingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM43
 */

import { z } from "zod";

const INTENT_VALUES = [
  "general_cavity_rough",
  "smooth_offset_fill",
  "profile_only_rough",
  "waterline_pre_finish",
  "high_efficiency_adaptive",
  "deep_cavity_unstable",
  "narrow_pocket_plunge",
  "selective_adaptive_region",
  "raster_lace_fill",
  "rest_clearance_after_big_tool",
  "stock_model_setup",
  "pre_pierce_or_chip_release",
] as const;

export const pm_roughing_index = z.object({}).describe("Full PowerMill roughing catalog");
export const pm_roughing_summary = z.object({}).describe("Summary stats");
export const pm_roughing_list_ops = z.object({}).describe("List 12 PowerMill roughing ops");
export const pm_roughing_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one PowerMill roughing operation");
export const pm_roughing_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter PowerMill roughing operations by category");
export const pm_roughing_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in PowerMill roughing");
export const pm_roughing_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend a PowerMill roughing operation for an intent");
export const pm_roughing_vortex_check = z
  .object({
    radial_engagement_pct: z.number().positive().max(100),
    axial_doc_to_dia_ratio: z.number().positive(),
  })
  .describe("Classify Vortex engagement against canonical envelope (≤12% radial, ≤2.5×D axial)");
export const pm_roughing_rest_worthwhile = z
  .object({
    previous_tool_diameter_mm: z.number().positive(),
    current_tool_diameter_mm: z.number().positive(),
  })
  .describe("Rest machining cascade rule: current diameter must be ≤ 50% of previous");
export const pm_roughing_plunge_validate = z
  .object({
    slot_width_mm: z.number().positive(),
    tool_diameter_mm: z.number().positive(),
    plunge_feed_pct: z.number().positive().max(100),
  })
  .describe("Validate plunge-roughing feasibility (slot fit, plunge feed range)");

export const ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS = {
  pm_roughing_index,
  pm_roughing_summary,
  pm_roughing_list_ops,
  pm_roughing_get_op,
  pm_roughing_by_category,
  pm_roughing_find_param,
  pm_roughing_recommend,
  pm_roughing_vortex_check,
  pm_roughing_rest_worthwhile,
  pm_roughing_plunge_validate,
};
