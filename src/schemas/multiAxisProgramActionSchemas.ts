/**
 * Multi-Axis Program Action Schemas — Zod v4
 *
 * Schemas for MultiAxisPrintToProgramEngine (2 actions)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const orientationZ = z.object({
  A_deg: z.number(),
  B_deg: z.number(),
  C_deg: z.number(),
  lead_deg: z.number().optional(),
  lag_deg: z.number().optional(),
  tilt_deg: z.number().optional(),
}).passthrough();

const multiAxisFeatureZ = z.object({
  id: z.string(),
  type: z.string(),
  orientation: orientationZ,
  diameter_mm: z.number().optional(),
  depth_mm: z.number(),
  width_mm: z.number().optional(),
  length_mm: z.number().optional(),
  surface_finish_Ra_um: z.number().optional(),
  tolerance_mm: z.number().optional(),
  blade_count: z.number().optional(),
  blade_wrap_deg: z.number().optional(),
  port_diameter_mm: z.number().optional(),
  port_depth_mm: z.number().optional(),
  scallop_height_mm: z.number().optional(),
}).passthrough();

const multiAxisMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const multiAxisInputZ = z.object({
  part_number: z.string().optional(),
  material: multiAxisMaterialZ,
  machine_type: z.enum(["5ax_trunnion", "5ax_swivel_head", "5ax_nutating", "3plus2_rotary", "5ax_gantry"]).optional(),
  controller: z.string().optional(),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  has_rtcp: z.boolean().optional(),
  features: z.array(multiAxisFeatureZ),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "surface_quality"]).optional(),
  tcp_mode: z.boolean().optional(),
}).passthrough();

const multiaxis_print_to_program = multiAxisInputZ;
const multiaxis_process_plan = multiAxisInputZ;

export const ACTION_MULTIAXIS_PROGRAM_SCHEMAS: ActionSchemaMap = {
  multiaxis_print_to_program,
  multiaxis_process_plan,
};
