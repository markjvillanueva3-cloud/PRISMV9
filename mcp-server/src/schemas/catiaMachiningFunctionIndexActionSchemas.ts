/**
 * Action schemas for CATIAMachiningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM47
 */

import { z } from "zod";

const INTENT_VALUES = [
  "pocket_2_5d",
  "profile_2d",
  "face_top_surface",
  "drill_holes",
  "tap_holes",
  "sweep_3axis_surface",
  "contour_3axis_surface",
  "isoparametric_uv_finish",
  "sweep_5axis_surface",
  "contour_5axis_surface",
  "delmia_full_simulation",
  "delmia_quick_clash",
] as const;

export const catia_mach_index = z.object({}).describe("Full CATIA machining catalog");
export const catia_mach_summary = z.object({}).describe("Summary stats");
export const catia_mach_list_ops = z.object({}).describe("List 12 CATIA machining ops");
export const catia_mach_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one CATIA machining operation");
export const catia_mach_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter CATIA machining operations by category");
export const catia_mach_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in CATIA machining catalog");
export const catia_mach_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend a CATIA machining operation for an intent");
export const catia_mach_classify_tolerance = z
  .object({ IT_grade: z.number().int().min(1).max(18) })
  .describe("Map ISO 286 IT grade to CATIA workbench (prismatic / surface / advanced)");
export const catia_mach_select_plan = z
  .object({ complexity_score: z.number().min(0).max(10) })
  .describe("Select CATIA workbench from a 0-10 complexity score");
export const catia_mach_delmia_coverage = z
  .object({
    toolpath_length_mm: z.number().positive(),
    sample_step_mm: z.number().positive(),
  })
  .describe("Estimate DELMIA simulation sample-point count and memory");

export const ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS = {
  catia_mach_index,
  catia_mach_summary,
  catia_mach_list_ops,
  catia_mach_get_op,
  catia_mach_by_category,
  catia_mach_find_param,
  catia_mach_recommend,
  catia_mach_classify_tolerance,
  catia_mach_select_plan,
  catia_mach_delmia_coverage,
};
