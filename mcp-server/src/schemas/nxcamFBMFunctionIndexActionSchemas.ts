/**
 * Action schemas for NXCAMFBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM41
 */

import { z } from "zod";

const INTENT_VALUES = [
  "auto_recognize",
  "hole_only_recognize",
  "pocket_only_recognize",
  "manual_feature",
  "paint_faces",
  "edit_mke_rule",
  "mke_library",
  "auto_3d_machining",
  "hole_making",
  "template_library",
  "feature_group_batch",
  "cad_sync",
] as const;

const ToolSchema = z.object({
  tool_id: z.string().min(1),
  tool_diameter_mm: z.number().positive(),
});

const MKERuleSchema = z.object({
  rule_id: z.string().min(1),
  priority: z.number().int().min(1),
  feature_type: z.string().min(1),
  material_filter: z.string().nullable().optional(),
  min_depth_mm: z.number().optional(),
  max_depth_mm: z.number().optional(),
  min_diameter_mm: z.number().optional(),
  max_diameter_mm: z.number().optional(),
  applied_template: z.string().min(1),
  enabled: z.boolean().optional(),
});

export const nxcam_fbm_index = z.object({}).describe("Full NX CAM FBM catalog");
export const nxcam_fbm_summary = z.object({}).describe("Summary stats");
export const nxcam_fbm_list_ops = z.object({}).describe("List 12 NX FBM ops");
export const nxcam_fbm_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one NX FBM operation");
export const nxcam_fbm_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter NX FBM operations by category");
export const nxcam_fbm_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in NX FBM");
export const nxcam_fbm_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend an NX FBM operation for an intent");
export const nxcam_fbm_classify_pocket_depth = z
  .object({
    depth_mm: z.number().positive(),
    width_mm: z.number().positive(),
  })
  .describe("Classify pocket by depth-to-width ratio: shallow/normal/deep/extreme");
export const nxcam_fbm_smallest_fit_tool = z
  .object({
    feature_min_radius_mm: z.number().positive(),
    tools: z.array(ToolSchema).min(1),
  })
  .describe("AUTO_3D smallest-fit tool selection rule");
export const nxcam_fbm_match_rule = z
  .object({
    feature_type: z.string().min(1),
    material: z.string().min(1),
    rules: z.array(MKERuleSchema),
    depth_mm: z.number().optional(),
    diameter_mm: z.number().optional(),
  })
  .describe("Match a Machining Knowledge Editor rule");
export const nxcam_fbm_group_efficiency = z
  .object({
    feature_count: z.number().int().min(0),
    tool_count: z.number().int().min(1),
  })
  .describe("Classify feature-group batching economics");

export const ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS = {
  nxcam_fbm_index,
  nxcam_fbm_summary,
  nxcam_fbm_list_ops,
  nxcam_fbm_get_op,
  nxcam_fbm_by_category,
  nxcam_fbm_find_param,
  nxcam_fbm_recommend,
  nxcam_fbm_classify_pocket_depth,
  nxcam_fbm_smallest_fit_tool,
  nxcam_fbm_match_rule,
  nxcam_fbm_group_efficiency,
};
