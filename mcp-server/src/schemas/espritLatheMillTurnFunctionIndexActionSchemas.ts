/**
 * Action schemas for ESPRITLatheMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM50
 */

import { z } from "zod";

const INTENT_VALUES = [
  "turn_od_rough",
  "turn_od_finish",
  "groove_or_part",
  "thread_single_point",
  "drill_centerline",
  "millturn_radial_milling",
  "millturn_y_axis_pocket",
  "swiss_part_handoff",
  "channel_sync",
] as const;

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;

export const esprit_lathe_index = z.object({}).describe("Full ESPRIT lathe / mill-turn catalog");
export const esprit_lathe_summary = z.object({}).describe("Summary stats");
export const esprit_lathe_list_ops = z.object({}).describe("List 9 ESPRIT lathe ops");
export const esprit_lathe_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one operation");
export const esprit_lathe_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter by category");
export const esprit_lathe_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters");
export const esprit_lathe_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend operation by intent");
export const esprit_lathe_select_threading = z
  .object({
    pitch_mm: z.number().positive(),
    material_iso: z.enum(ISO_GROUPS),
  })
  .describe("Pick threading infeed mode by pitch + material");
export const esprit_lathe_select_millturn_axis = z
  .object({
    machine_has_y: z.boolean(),
    feature_off_axis: z.boolean(),
  })
  .describe("Pick mill-turn motion mode (Y / polar / C-index)");
export const esprit_lathe_estimate_channel_sync = z
  .object({
    channel_count: z.number().int().min(1).max(8),
    avg_op_seconds: z.number().positive().max(3600),
  })
  .describe("Predict worst-case stall + sync policy");

export const ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS = {
  esprit_lathe_index,
  esprit_lathe_summary,
  esprit_lathe_list_ops,
  esprit_lathe_get_op,
  esprit_lathe_by_category,
  esprit_lathe_find_param,
  esprit_lathe_recommend,
  esprit_lathe_select_threading,
  esprit_lathe_select_millturn_axis,
  esprit_lathe_estimate_channel_sync,
};
