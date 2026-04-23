/**
 * Action schemas for PowerMill5AxisRobotFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM45
 */

import { z } from "zod";

const INTENT_VALUES = [
  "ruled_swarf_wall",
  "impeller_blade_full_chain",
  "intake_exhaust_port",
  "axis_overlay_on_3axis",
  "project_2d_pattern_to_3d",
  "indexed_3plus2_undercut",
  "engrave_along_curve",
  "wireframe_only_swarf",
  "robot_cell_setup",
  "robot_pre_flight_validation",
  "robot_composite_trim",
  "robot_vendor_post",
] as const;

export const pm_5axisrobot_index = z.object({}).describe("Full PowerMill 5-axis & robot catalog");
export const pm_5axisrobot_summary = z.object({}).describe("Summary stats");
export const pm_5axisrobot_list_ops = z.object({}).describe("List 12 PowerMill 5-axis/robot ops");
export const pm_5axisrobot_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one PowerMill 5-axis/robot operation");
export const pm_5axisrobot_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter operations by category");
export const pm_5axisrobot_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters in PowerMill 5-axis/robot catalog");
export const pm_5axisrobot_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend a PowerMill 5-axis/robot operation for an intent");
export const pm_5axisrobot_classify_kinematic = z
  .object({
    rotary_on_head: z.number().int().min(0).max(3),
    rotary_on_table: z.number().int().min(0).max(3),
    robot_articulated: z.boolean().optional(),
  })
  .describe("Classify a 5-axis machine as head_head / table_table / mixed / robot_articulated");
export const pm_5axisrobot_singularity_check = z
  .object({
    primary_rotary_deg: z.number(),
    threshold_deg: z.number().positive().max(30).optional(),
  })
  .describe("Check singularity risk based on primary rotary axis proximity to pole (0°)");
export const pm_5axisrobot_robot_reach = z
  .object({
    target_distance_mm: z.number().min(0),
    upper_arm_mm: z.number().positive(),
    forearm_mm: z.number().positive(),
    wrist_offset_mm: z.number().min(0).optional(),
  })
  .describe("Validate target point is inside robot 2-link reach annulus");

export const ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS = {
  pm_5axisrobot_index,
  pm_5axisrobot_summary,
  pm_5axisrobot_list_ops,
  pm_5axisrobot_get_op,
  pm_5axisrobot_by_category,
  pm_5axisrobot_find_param,
  pm_5axisrobot_recommend,
  pm_5axisrobot_classify_kinematic,
  pm_5axisrobot_singularity_check,
  pm_5axisrobot_robot_reach,
};
