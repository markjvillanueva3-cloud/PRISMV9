/**
 * Action schemas for NXCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM40
 */

import { z } from "zod";

const FEATURE_VALUES = [
  "od_rough",
  "id_rough",
  "face_rough",
  "od_finish",
  "id_finish",
  "face_finish",
  "od_groove",
  "od_thread",
  "id_thread",
  "axial_drill",
  "manual_bore",
  "teach_mode_part",
] as const;

export const nxcam_turning_index = z.object({}).describe("Full NX CAM turning catalog");
export const nxcam_turning_summary = z.object({}).describe("Summary stats");
export const nxcam_turning_list_ops = z.object({}).describe("List 12 NX turning ops");
export const nxcam_turning_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one NX turning operation");
export const nxcam_turning_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter NX turning operations by category");
export const nxcam_turning_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in NX turning");
export const nxcam_turning_recommend = z
  .object({ feature: z.enum(FEATURE_VALUES) })
  .describe("Recommend an NX turning operation for a feature");
export const nxcam_turning_nose_radius = z
  .object({
    feed_per_rev_mm: z.number().positive(),
    target_Ra_um: z.number().positive(),
  })
  .describe("Invert Ra ≈ f²/(8R) to solve for required nose radius");
export const nxcam_turning_taylor = z
  .object({
    V_m_per_min: z.number().positive(),
    n: z.number().gt(0).lt(1),
    C: z.number().positive(),
  })
  .describe("Taylor T = (C/V)^(1/n) tool life in minutes");
export const nxcam_turning_teach_validate = z
  .object({
    point_count: z.number().int().min(0),
    allow_feed_between: z.boolean(),
    allow_rapid_between: z.boolean(),
  })
  .describe("Validate a teach-mode point sequence");

export const ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS = {
  nxcam_turning_index,
  nxcam_turning_summary,
  nxcam_turning_list_ops,
  nxcam_turning_get_op,
  nxcam_turning_by_category,
  nxcam_turning_find_param,
  nxcam_turning_recommend,
  nxcam_turning_nose_radius,
  nxcam_turning_taylor,
  nxcam_turning_teach_validate,
};
