/**
 * Hole Pattern Action Schemas — Zod v4
 *
 * Schemas for HolePatternPipelineEngine (3 actions)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const holeSpecZ = z.object({
  id: z.string(),
  type: z.enum(["through", "blind", "counterbore", "countersink", "stepped", "reamed", "tapped", "interpolated", "pilot", "spotface"]),
  x_mm: z.number(),
  y_mm: z.number(),
  diameter_mm: z.number(),
  depth_mm: z.number(),
  counterbore_diameter_mm: z.number().optional(),
  counterbore_depth_mm: z.number().optional(),
  countersink_diameter_mm: z.number().optional(),
  countersink_angle_deg: z.number().optional(),
  ream_diameter_mm: z.number().optional(),
  ream_tolerance_mm: z.number().optional(),
  tap_pitch_mm: z.number().optional(),
  tap_class: z.string().optional(),
  surface_finish_Ra_um: z.number().optional(),
  tolerance_mm: z.number().optional(),
  through_material_thickness_mm: z.number().optional(),
}).passthrough();

const holeMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const holePatternInputZ = z.object({
  part_number: z.string().optional(),
  material: holeMaterialZ,
  holes: z.array(holeSpecZ),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  work_offset: z.string().optional(),
  retract_height_mm: z.number().optional(),
  auto_detect_patterns: z.boolean().optional(),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "min_cost"]).optional(),
}).passthrough();

const hole_pattern_program = holePatternInputZ;
const hole_pattern_detect = holePatternInputZ;
const hole_pattern_optimize = holePatternInputZ;

export const ACTION_HOLE_PATTERN_SCHEMAS: ActionSchemaMap = {
  hole_pattern_program,
  hole_pattern_detect,
  hole_pattern_optimize,
};
