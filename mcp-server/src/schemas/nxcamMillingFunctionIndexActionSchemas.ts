/**
 * Action schemas for NXCAMMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM39
 */

import { z } from "zod";

const FEATURE_VALUES = [
  "face_top_surface",
  "rectangular_pocket",
  "freeform_cavity",
  "steep_wall_finish",
  "shallow_surface_finish",
  "impeller_blade",
  "ruled_swarf_wall",
  "freeform_streamline",
  "high_efficiency_rough",
  "operator_guided",
  "profile_finish_2d",
  "automatic_feature_machining",
] as const;

export const nxcam_milling_index = z.object({}).describe("Return the full NX CAM milling catalog");
export const nxcam_milling_summary = z.object({}).describe("Return summary stats");
export const nxcam_milling_list_ops = z.object({}).describe("List 13 NX milling operations");
export const nxcam_milling_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one NX milling operation");
export const nxcam_milling_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter by category (case-insensitive)");
export const nxcam_milling_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across NX milling operations");
export const nxcam_milling_recommend = z
  .object({ feature: z.enum(FEATURE_VALUES) })
  .describe("Recommend a NX milling operation for a feature");
export const nxcam_milling_scallop = z
  .object({
    stepover_mm: z.number().positive(),
    tool_diameter_mm: z.number().positive(),
  })
  .describe("Ball-end scallop height h ≈ s²/(8R)");
export const nxcam_milling_adaptive_check = z
  .object({
    radial_engagement_pct: z.number().positive().max(100),
    axial_doc_to_dia_ratio: z.number().positive(),
  })
  .describe("Classify HSM adaptive engagement: safe/caution/critical");

export const ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS = {
  nxcam_milling_index,
  nxcam_milling_summary,
  nxcam_milling_list_ops,
  nxcam_milling_get_op,
  nxcam_milling_by_category,
  nxcam_milling_find_param,
  nxcam_milling_recommend,
  nxcam_milling_scallop,
  nxcam_milling_adaptive_check,
};
