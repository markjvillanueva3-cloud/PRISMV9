/**
 * Turning Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for all 7 prism_turning actions.
 * SAFETY CRITICAL — chuck/tailstock forces affect workpiece ejection risk.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/turningActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

// ============================================================================
// chuck_force — ChuckJawForceEngine
// ============================================================================

const chuck_force = z.object({
  chuck_type: z.enum(["3_jaw_scroll", "3_jaw_power", "4_jaw_independent", "6_jaw", "collet"]).optional(),
  jaw_type: z.enum(["hard", "soft", "pie", "special"]).optional(),
  num_jaws: z.number().int().min(2).max(8).optional(),
  workpiece_mass_kg: posNum,
  workpiece_od_mm: posNum,
  workpiece_length_mm: posNum,
  gripping_diameter_mm: posNum,
  gripping_length_mm: posNum,
  spindle_rpm: posNum,
  max_spindle_rpm: posNum,
  cutting_force_tangential_N: posNum,
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_force_axial_N: z.number().nonnegative(),
  friction_coefficient: z.number().min(0.05).max(1.0).optional(),
  jaw_stroke_mm: optPosNum,
}).passthrough();

// ============================================================================
// tailstock — TailstockForceEngine
// ============================================================================

const tailstock = z.object({
  center_type: z.enum(["live", "dead", "half_center", "pipe_center"]).optional(),
  center_point_angle_deg: z.number().min(30).max(120).optional(),
  workpiece_mass_kg: posNum,
  workpiece_length_mm: posNum,
  workpiece_diameter_mm: posNum,
  chuck_to_tailstock_mm: posNum,
  spindle_rpm: posNum,
  cutting_force_axial_N: z.number().nonnegative(),
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_position_from_chuck_mm: posNum,
  center_hole_diameter_mm: posNum,
  material_thermal_expansion: optNum,
}).passthrough();

// ============================================================================
// steady_rest — SteadyRestPlacementEngine
// ============================================================================

const steady_rest = z.object({
  workpiece_length_mm: posNum,
  workpiece_diameter_mm: posNum,
  workpiece_mass_kg: posNum,
  material_E_GPa: posNum,
  chuck_to_tailstock_mm: posNum,
  cutting_force_radial_N: z.number().nonnegative(),
  cutting_position_mm: posNum,
  spindle_rpm: posNum,
  length_to_diameter_ratio: posNum,
  max_deflection_um: posNum,
  steady_rest_type: z.enum(["fixed", "traveling", "follow", "hydraulic"]).optional(),
}).passthrough();

// ============================================================================
// live_tool — LiveToolingEngine
// ============================================================================

const live_tool = z.object({
  operation: z.enum(["cross_drill", "axial_drill", "cross_mill", "axial_mill", "polygon_turn", "keyway", "flat_mill"]).optional(),
  tool_diameter_mm: posNum,
  num_flutes: z.number().int().min(1).max(20).optional(),
  live_tool_rpm: posNum,
  workpiece_diameter_mm: posNum,
  depth_of_cut_mm: posNum,
  width_of_cut_mm: optPosNum,
  feed_per_tooth_mm: posNum,
  c_axis_interpolation: z.boolean().optional(),
  y_axis_available: z.boolean().optional(),
  max_live_tool_rpm: posNum,
  live_tool_power_kW: posNum,
}).passthrough();

// ============================================================================
// bar_pull — BarPullerTimingEngine
// ============================================================================

const bar_pull = z.object({
  bar_diameter_mm: posNum,
  bar_length_mm: posNum,
  part_length_mm: posNum,
  cutoff_width_mm: posNum,
  facing_allowance_mm: z.number().nonnegative().optional(),
  bar_feeder_type: z.enum(["magazine", "hydrodynamic", "servo", "short_bar"]).optional(),
  collet_open_time_sec: optPosNum,
  collet_close_time_sec: optPosNum,
  bar_pull_speed_mm_per_sec: optPosNum,
  bar_pull_retract_speed_mm_per_sec: optPosNum,
  sub_spindle_available: z.boolean().optional(),
  remnant_min_mm: optPosNum,
}).passthrough();

// ============================================================================
// thread_single_point — SinglePointThreadEngine
// ============================================================================

const thread_single_point = z.object({
  thread_form: z.enum(["UN", "metric", "ACME", "trapezoidal", "buttress"]).optional(),
  pitch_mm: posNum,
  major_diameter_mm: posNum,
  internal: z.boolean().optional(),
  infeed_method: z.enum(["radial", "flank", "modified_flank", "alternating_flank", "constant_area"]).optional(),
  total_depth_mm: posNum,
  spindle_rpm: posNum,
  num_passes: z.number().int().min(1).max(50).optional(),
  spring_passes: z.number().int().min(0).max(5).optional(),
  lead_in_mm: optPosNum,
  lead_out_mm: optPosNum,
  thread_length_mm: posNum,
  material_tensile_MPa: posNum,
}).passthrough();

// ============================================================================
// part_off_force — PartOffForceEngine
// ============================================================================

const part_off_force = z.object({
  bar_diameter_mm: posNum,
  bore_diameter_mm: z.number().nonnegative().optional(),
  blade_width_mm: z.number().min(0.5).max(12),
  feed_per_rev_mm: z.number().min(0.01).max(0.5),
  cutting_speed_m_min: posNum,
  material: z.string().min(1).optional(),
  material_hardness_HRC: z.number().min(0).max(72).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const TURNING_ACTION_SCHEMAS: ActionSchemaMap = {
  chuck_force,
  tailstock,
  steady_rest,
  live_tool,
  bar_pull,
  thread_single_point,
  part_off_force,
};
