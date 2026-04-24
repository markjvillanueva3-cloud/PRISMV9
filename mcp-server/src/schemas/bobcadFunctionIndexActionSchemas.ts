/**
 * Action schemas for BobCADFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM55
 */

import { z } from "zod";

const INTENT_VALUES = [
  "pocket_2axis",
  "dynamic_rough",
  "finish_3d_surface",
  "five_axis_swarf",
  "lathe_rough",
  "lathe_thread",
  "live_tooling",
  "wedm_profile",
  "wedm_taper",
] as const;

const VISIBILITY_VALUES = ["cosmetic", "visible", "hidden", "trim"] as const;

export const bobcad_index = z.object({}).describe("Full BobCAD-CAM mill/lathe/wedm catalog");
export const bobcad_summary = z.object({}).describe("Summary stats");
export const bobcad_list_ops = z.object({}).describe("List 9 BobCAD ops");
export const bobcad_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one BobCAD op");
export const bobcad_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter by category");
export const bobcad_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters");
export const bobcad_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend op by intent (returns required tier)");
export const bobcad_tier_for_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Required BobCAD purchase tier for an operation");
export const bobcad_dynamic_motion_envelope = z
  .object({})
  .describe("BobCAD Dynamic Motion canonical engagement bounds");
export const bobcad_wedm_lead_strategy = z
  .object({ visibility: z.enum(VISIBILITY_VALUES) })
  .describe("Pick perpendicular vs arc WEDM lead-in by surface visibility");

export const ACTION_BOBCAD_FUNCTION_INDEX_SCHEMAS = {
  bobcad_index,
  bobcad_summary,
  bobcad_list_ops,
  bobcad_get_op,
  bobcad_by_category,
  bobcad_find_param,
  bobcad_recommend,
  bobcad_tier_for_op,
  bobcad_dynamic_motion_envelope,
  bobcad_wedm_lead_strategy,
};
