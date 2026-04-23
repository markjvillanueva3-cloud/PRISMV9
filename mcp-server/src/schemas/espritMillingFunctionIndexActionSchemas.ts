/**
 * Action schemas for ESPRITMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM49
 */

import { z } from "zod";

const INTENT_VALUES = [
  "pocket_2_5d_standard",
  "profile_contour",
  "face_top_surface",
  "profitmilling_adaptive",
  "rough_3d_cavity",
  "finish_3d_mixed",
  "five_axis_swarf_ruled",
  "drill_holes_canned",
] as const;

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;

export const esprit_mill_index = z.object({}).describe("Full ESPRIT milling catalog");
export const esprit_mill_summary = z.object({}).describe("Summary stats for ESPRIT milling");
export const esprit_mill_list_ops = z.object({}).describe("List 8 ESPRIT milling ops");
export const esprit_mill_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one ESPRIT milling operation");
export const esprit_mill_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter ESPRIT milling ops by category");
export const esprit_mill_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameter names across all ESPRIT milling ops");
export const esprit_mill_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend ESPRIT milling op for an intent");
export const esprit_mill_classify_doc = z
  .object({
    material_iso: z.enum(ISO_GROUPS),
    hardness_hb: z.number().min(0).max(900),
  })
  .describe("Pick rough strategy by material + hardness (HB)");
export const esprit_mill_profitmilling_envelope = z
  .object({})
  .describe("Canonical ProfitMilling engagement bounds");
export const esprit_mill_select_drill = z
  .object({
    L_over_D: z.number().positive(),
    blind: z.boolean().optional(),
    tap: z.boolean().optional(),
  })
  .describe("Select G-code drilling cycle from L/D + blind/tap flags");

export const ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS = {
  esprit_mill_index,
  esprit_mill_summary,
  esprit_mill_list_ops,
  esprit_mill_get_op,
  esprit_mill_by_category,
  esprit_mill_find_param,
  esprit_mill_recommend,
  esprit_mill_classify_doc,
  esprit_mill_profitmilling_envelope,
  esprit_mill_select_drill,
};
