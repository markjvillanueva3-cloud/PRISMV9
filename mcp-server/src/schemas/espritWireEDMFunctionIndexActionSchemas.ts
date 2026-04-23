/**
 * Action schemas for ESPRITWireEDMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM51
 */

import { z } from "zod";

const INTENT_VALUES = [
  "cut_2axis_simple",
  "cut_4axis_taper",
  "skim_finish",
  "auto_route_multi_cavity",
  "punch_die_pair",
  "technology_select",
  "wire_break_recover",
  "corner_strategy",
] as const;

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;

export const esprit_wedm_index = z.object({}).describe("Full ESPRIT wire-EDM catalog");
export const esprit_wedm_summary = z.object({}).describe("Summary stats");
export const esprit_wedm_list_ops = z.object({}).describe("List 8 wire-EDM ops");
export const esprit_wedm_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one wire-EDM operation");
export const esprit_wedm_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter wire-EDM ops by category");
export const esprit_wedm_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across all wire-EDM ops");
export const esprit_wedm_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend wire-EDM operation for an intent");
export const esprit_wedm_select_skim_schedule = z
  .object({ target_ra_um: z.number().positive().max(10) })
  .describe("Pick skim count by target Ra");
export const esprit_wedm_select_taper_plane = z
  .object({
    thickness_mm: z.number().positive().max(400),
    taper_angle_deg: z.number().min(-30).max(30),
    guide_uv_max_mm: z.number().positive().max(200),
  })
  .describe("Pick taper reference plane (lower / upper / midplane)");
export const esprit_wedm_compute_die_clearance = z
  .object({
    thickness_mm: z.number().positive().max(50),
    material_iso: z.enum(ISO_GROUPS),
    fineblanking: z.boolean().optional(),
  })
  .describe("Compute die clearance % + per-side mm");
export const esprit_wedm_estimate_cycle = z
  .object({
    area_mm2: z.number().positive(),
    thickness_mm: z.number().positive().max(400),
    skim_count: z.number().int().min(0).max(5),
  })
  .describe("Estimate rough + skim cycle time");

export const ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS = {
  esprit_wedm_index,
  esprit_wedm_summary,
  esprit_wedm_list_ops,
  esprit_wedm_get_op,
  esprit_wedm_by_category,
  esprit_wedm_find_param,
  esprit_wedm_recommend,
  esprit_wedm_select_skim_schedule,
  esprit_wedm_select_taper_plane,
  esprit_wedm_compute_die_clearance,
  esprit_wedm_estimate_cycle,
};
