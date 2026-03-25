/**
 * Turning Program Action Schemas — Zod v4
 *
 * Schemas for TurningPrintToProgramEngine (2 actions)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const turningFeatureZ = z.object({
  id: z.string(),
  type: z.string(),
  od_mm: z.number().optional(),
  id_mm: z.number().optional(),
  length_mm: z.number(),
  depth_mm: z.number().optional(),
  width_mm: z.number().optional(),
  taper_angle_deg: z.number().optional(),
  thread_pitch_mm: z.number().optional(),
  thread_class: z.string().optional(),
  thread_starts: z.number().optional(),
  tolerance_mm: z.number().optional(),
  surface_finish_Ra_um: z.number().optional(),
  groove_width_mm: z.number().optional(),
  groove_depth_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
  position_z_mm: z.number().optional(),
}).passthrough();

const turningMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const turningInputZ = z.object({
  part_number: z.string().optional(),
  material: turningMaterialZ,
  bar_stock_od_mm: z.number(),
  finished_od_mm: z.number().optional(),
  part_length_mm: z.number(),
  chuck_type: z.enum(["3_jaw", "collet", "4_jaw", "face_plate"]).optional(),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  features: z.array(turningFeatureZ),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "min_cost", "surface_quality"]).optional(),
  tailstock: z.boolean().optional(),
  sub_spindle: z.boolean().optional(),
}).passthrough();

// Both actions take the same input shape
const turning_print_to_program = turningInputZ;
const turning_process_plan = turningInputZ;

export const ACTION_TURNING_PROGRAM_SCHEMAS: ActionSchemaMap = {
  turning_print_to_program,
  turning_process_plan,
};
