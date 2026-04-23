/**
 * Action schemas for PowerMillFinishingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM44
 */

import { z } from "zod";

const INTENT_VALUES = [
  "mixed_steep_shallow",
  "adaptive_waterline",
  "steep_wall_waterline",
  "rest_after_waterline",
  "uniform_cusp_3d_offset",
  "rest_after_3d_offset",
  "fast_flat_finish",
  "round_pocket_finish",
  "round_boss_continuous",
  "user_directed_path",
  "internal_corner_cleanup",
  "multi_pass_corner_residue",
] as const;

export const pm_finishing_index = z.object({}).describe("Full PowerMill finishing catalog");
export const pm_finishing_summary = z.object({}).describe("Summary stats");
export const pm_finishing_list_ops = z.object({}).describe("List 12 PowerMill finishing ops");
export const pm_finishing_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one PowerMill finishing operation");
export const pm_finishing_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter PowerMill finishing operations by category");
export const pm_finishing_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in PowerMill finishing");
export const pm_finishing_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend a PowerMill finishing operation for an intent");
export const pm_finishing_classify_steep_shallow = z
  .object({
    surface_angle_deg: z.number().min(0).max(90),
    threshold_deg: z.number().min(1).lt(90),
    overlap_deg: z.number().min(0).max(20).optional(),
  })
  .describe("Classify a surface angle as steep / transition / shallow around a threshold");
export const pm_finishing_stepover_for_cusp = z
  .object({
    target_cusp_mm: z.number().positive(),
    tool_diameter_mm: z.number().positive(),
  })
  .describe("INVERT cusp ≈ s²/(8R) to solve for stepover that achieves a target cusp height");
export const pm_finishing_pencil_feasibility = z
  .object({
    internal_corner_radius_mm: z.number().positive(),
    tool_radius_mm: z.number().positive(),
  })
  .describe("Check whether a tool radius fits the smallest internal corner radius for pencil trace");

export const ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS = {
  pm_finishing_index,
  pm_finishing_summary,
  pm_finishing_list_ops,
  pm_finishing_get_op,
  pm_finishing_by_category,
  pm_finishing_find_param,
  pm_finishing_recommend,
  pm_finishing_classify_steep_shallow,
  pm_finishing_stepover_for_cusp,
  pm_finishing_pencil_feasibility,
};
