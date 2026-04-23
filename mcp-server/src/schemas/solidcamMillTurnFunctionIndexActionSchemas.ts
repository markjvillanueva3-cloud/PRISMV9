/**
 * Action schemas for SolidCAMMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37
 */

import { z } from "zod";

const FEATURE_VALUES = [
  "polar_face_pocket",
  "cross_drilled_hole",
  "off_center_keyway",
  "bolt_circle_face",
  "polar_slot_arc",
  "second_op_on_back",
  "long_shaft_balanced",
  "main_sub_parallel",
  "swiss_long_part",
  "synced_thread_pickup",
  "bar_feed_cycle",
] as const;

export const solidcam_millturn_index = z.object({}).describe("Return the full SolidCAM mill-turn catalog");
export const solidcam_millturn_summary = z.object({}).describe("Return summary stats: counts, categories, training");
export const solidcam_millturn_list_ops = z.object({}).describe("List 12 mill-turn operations");
export const solidcam_millturn_get_op = z
  .object({
    operation_id: z.string().min(1).describe("Operation id (e.g. 'mt_balanced_turning')"),
  })
  .describe("Fetch one mill-turn operation including parameter groups");
export const solidcam_millturn_by_category = z
  .object({
    category: z.string().min(1).describe("One of: live_tooling, c_axis, y_axis, sub_spindle, multi_channel, swiss_type, specialty"),
  })
  .describe("Filter mill-turn operations by category (case-insensitive)");
export const solidcam_millturn_find_param = z
  .object({
    parameter_name: z.string().min(1).describe("Substring match against parameter names"),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across all mill-turn operations");
export const solidcam_millturn_recommend = z
  .object({
    feature: z.enum(FEATURE_VALUES).describe("Mill-turn feature/intent"),
  })
  .describe("Recommend a mill-turn operation for a given feature");
export const solidcam_millturn_sync_check = z
  .object({
    rpm_main: z.number().min(0).describe("Main spindle RPM"),
    rpm_sub: z.number().min(0).describe("Sub-spindle RPM"),
    tolerance_rpm: z.number().min(0).describe("Allowed Δ RPM for safe engagement"),
  })
  .describe("Validate sub-spindle synchronization for safe pickup/handoff");
export const solidcam_millturn_polar_feed = z
  .object({
    linear_feed_mm_per_min: z.number().positive().describe("Programmed linear feedrate (mm/min)"),
    radius_mm: z.number().min(0).describe("Current radius from polar center (mm)"),
    min_radius_mm: z.number().positive().describe("Min radius below which feed is clamped"),
  })
  .describe("Polar feedrate clamp near center to prevent angular velocity runaway");
export const solidcam_millturn_wait_barriers = z
  .object({
    main_count: z.number().int().min(0).describe("Wait barrier code count on main channel"),
    sub_count: z.number().int().min(0).describe("Wait barrier code count on sub channel"),
  })
  .describe("Detect deadlock risk from unbalanced wait barrier counts");

export const ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS = {
  solidcam_millturn_index,
  solidcam_millturn_summary,
  solidcam_millturn_list_ops,
  solidcam_millturn_get_op,
  solidcam_millturn_by_category,
  solidcam_millturn_find_param,
  solidcam_millturn_recommend,
  solidcam_millturn_sync_check,
  solidcam_millturn_polar_feed,
  solidcam_millturn_wait_barriers,
};
