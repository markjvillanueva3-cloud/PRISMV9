/**
 * Action schemas for SolidCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37
 */

import { z } from "zod";

const FEATURE_VALUES = [
  "od_cylinder_rough",
  "od_taper_rough",
  "id_bore_rough",
  "face_stock_rough",
  "od_finish",
  "id_finish",
  "face_finish",
  "od_groove",
  "face_groove",
  "part_off",
  "od_thread",
  "id_thread",
  "axial_hole_on_center",
  "near_net_forging",
] as const;

export const solidcam_turning_index = z.object({}).describe("Return the full SolidCAM turning catalog");
export const solidcam_turning_summary = z.object({}).describe("Return summary stats: counts, categories, training");
export const solidcam_turning_list_ops = z.object({}).describe("List 13 turning operations with id/category/count");
export const solidcam_turning_get_op = z
  .object({
    operation_id: z.string().min(1).describe("Operation id (e.g. 'turn_thread_external')"),
  })
  .describe("Fetch one turning operation including parameter groups");
export const solidcam_turning_by_category = z
  .object({
    category: z.string().min(1).describe("One of: roughing, finishing, grooving_parting, threading, drilling, specialty"),
  })
  .describe("Filter turning operations by category (case-insensitive)");
export const solidcam_turning_find_param = z
  .object({
    parameter_name: z.string().min(1).describe("Substring match against parameter names"),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters across all turning operations");
export const solidcam_turning_recommend = z
  .object({
    feature: z.enum(FEATURE_VALUES).describe("Turning feature/intent"),
  })
  .describe("Recommend a turning operation for a given feature");
export const solidcam_turning_css = z
  .object({
    diameter_mm: z.number().positive().describe("Workpiece diameter (mm)"),
    css_m_per_min: z.number().positive().describe("Programmed surface speed vc (m/min)"),
    max_rpm: z.number().positive().describe("Spindle max RPM clamp"),
  })
  .describe("Compute CSS RPM = (vc*1000)/(π*D), clamped to max_rpm");
export const solidcam_turning_boring_bar = z
  .object({
    overhang_mm: z.number().positive().describe("Boring bar overhang from holder face (mm)"),
    bar_diameter_mm: z.number().positive().describe("Boring bar diameter (mm)"),
  })
  .describe("Classify boring bar L/D ratio and recommend DOC reduction");
export const solidcam_turning_thread_passes = z
  .object({
    depth_of_thread_mm: z.number().positive().describe("Total thread depth from major to minor diameter (mm)"),
    first_pass_doc_mm: z.number().positive().describe("First pass depth-of-cut (mm)"),
    min_doc_mm: z.number().positive().describe("Minimum DOC floor (mm)"),
    spring_passes: z.number().int().min(0).max(10).optional(),
  })
  .describe("Generate constant-chip-area thread pass schedule (Sandvik formula)");

export const ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS = {
  solidcam_turning_index,
  solidcam_turning_summary,
  solidcam_turning_list_ops,
  solidcam_turning_get_op,
  solidcam_turning_by_category,
  solidcam_turning_find_param,
  solidcam_turning_recommend,
  solidcam_turning_css,
  solidcam_turning_boring_bar,
  solidcam_turning_thread_passes,
};
