/**
 * Action schemas for SolidCAM5AxisFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM36
 *
 * Validated by camDispatcher prior to lazy-loading the engine.
 */

import { z } from "zod";

const FEATURE_VALUES = [
  "indexed_face",
  "ruled_wall",
  "freeform_pocket",
  "impeller_blade",
  "blisk_blade",
  "intake_port",
  "exhaust_port",
  "undercut_relief",
  "t_slot",
  "deep_cavity_with_focal_point",
  "fan_cavity_with_guide_curve",
  "between_curves",
] as const;

export const solidcam_5_axis_index = z
  .object({})
  .describe("Return the full SolidCAM 5-axis catalog");

export const solidcam_5_axis_summary = z
  .object({})
  .describe("Return summary stats: counts, categories, training topics");

export const solidcam_5_axis_list_ops = z
  .object({})
  .describe("List all 12 5-axis operations with id, category, parameter count");

export const solidcam_5_axis_get_op = z
  .object({
    operation_id: z
      .string()
      .min(1)
      .describe("Operation id (e.g. '5x_swarf', '5x_multiblade')"),
  })
  .describe("Fetch one operation including all parameter groups");

export const solidcam_5_axis_by_category = z
  .object({
    category: z
      .string()
      .min(1)
      .describe(
        "One of: positional, simultaneous_drive, simultaneous_axis, specialty"
      ),
  })
  .describe("Filter operations by category (case-insensitive)");

export const solidcam_5_axis_find_param = z
  .object({
    parameter_name: z
      .string()
      .min(1)
      .describe("Substring match against parameter names"),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across all 5-axis operations");

export const solidcam_5_axis_recommend = z
  .object({
    feature: z.enum(FEATURE_VALUES).describe("Geometric feature type"),
  })
  .describe("Recommend a 5-axis operation for a feature type");

export const solidcam_5_axis_validate_axis = z
  .object({
    feed_rate_mm_per_min: z
      .number()
      .positive()
      .describe("Programmed linear feed rate (mm/min)"),
    axis_change_deg_per_mm: z
      .number()
      .min(0)
      .describe("Rotary axis delta per linear mm of travel (deg/mm)"),
    machine_max_rotary_deg_per_sec: z
      .number()
      .positive()
      .describe("Machine spec max rotary servo velocity (deg/s)"),
  })
  .describe(
    "Kinematic check: rotary velocity = axis_change_deg_per_mm × feed/60 vs machine limit"
  );

export const solidcam_5_axis_singularity = z
  .object({
    tilt_deg: z
      .number()
      .describe("Tool axis tilt from machine pole (degrees)"),
  })
  .describe("Detect proximity to a 5-axis singularity pole");

export const ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS = {
  solidcam_5_axis_index,
  solidcam_5_axis_summary,
  solidcam_5_axis_list_ops,
  solidcam_5_axis_get_op,
  solidcam_5_axis_by_category,
  solidcam_5_axis_find_param,
  solidcam_5_axis_recommend,
  solidcam_5_axis_validate_axis,
  solidcam_5_axis_singularity,
};
