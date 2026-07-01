/**
 * CNC Programming Action Schemas — Zod v4
 *
 * Schemas for:
 *   - CNCProgramAssemblerEngine (3 actions: program_assemble, program_batch_sf, program_cycle_time)
 *   - MotionDynamicsProfileEngine (7 actions: motion_*)
 *   - EngagementAdaptiveFeedEngine (7 actions: engage_*)
 *
 * Total: 17 new actions
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// Shared sub-schemas
// ============================================================================

const isoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]).optional();
const controllerZ = z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"]);
const cutTypeZ = z.enum(["roughing", "semi_finishing", "finishing"]).optional();
const strategyZ = z.enum(["conventional", "adaptive", "trochoidal", "hsm", "hpc", "slot"]).optional();
const coolantZ = z.enum(["flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic"]).optional();
const toolMaterialZ = z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional();
const toolTypeZ = z.enum(["endmill", "ballnose", "bull_nose", "face_mill", "drill", "tap", "reamer", "chamfer"]).optional();
const optimizeForZ = z.enum(["tool_life", "productivity", "surface_finish", "balanced"]).optional();

const programOperationZ = z.object({
  operation: z.string(),
  tool_number: z.number(),
  tool_diameter_mm: z.number(),
  flutes: z.number(),
  tool_type: toolTypeZ,
  tool_material: toolMaterialZ,
  coating: z.string().optional(),
  x_start: z.number().optional(),
  y_start: z.number().optional(),
  z_top: z.number().optional(),
  z_depth: z.number().optional(),
  z_safe: z.number().optional(),
  width_mm: z.number().optional(),
  length_mm: z.number().optional(),
  radius_mm: z.number().optional(),
  axial_depth_mm: z.number().optional(),
  radial_depth_mm: z.number().optional(),
  cut_type: cutTypeZ,
  strategy: strategyZ,
  coolant: coolantZ,
  override_rpm: z.number().optional(),
  override_feed_mmmin: z.number().optional(),
}).passthrough();

const machineConstraintsPartial = {
  machine_power_kw: z.number().optional(),
  machine_max_rpm: z.number().optional(),
  machine_max_torque_nm: z.number().optional(),
  machine_rigidity: z.enum(["low", "medium", "high"]).optional(),
};

const toolpathSegmentZ = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  commanded_feed_mmmin: z.number().optional(),
  type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]).optional(),
  i: z.number().optional(),
  j: z.number().optional(),
  r: z.number().optional(),
}).passthrough();

const machineKinematicsZ = z.object({
  max_feed_mmmin: z.number(),
  max_accel_mm_s2: z.number(),
  max_jerk_mm_s3: z.number().optional(),
  axis_max_vel: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  axis_max_accel: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  look_ahead_blocks: z.number().optional(),
  corner_tolerance_mm: z.number().optional(),
  servo_loop_ms: z.number().optional(),
}).passthrough();

// ============================================================================
// CNCProgramAssemblerEngine actions (3)
// ============================================================================

const program_assemble = z.object({
  program_number: z.number().optional(),
  material: z.string(),
  iso_group: isoGroupZ,
  hardness_hb: z.number().optional(),
  controller: controllerZ,
  operations: z.array(programOperationZ),
  ...machineConstraintsPartial,
  optimize_for: optimizeForZ,
  aggressiveness: z.number().min(0).max(1).optional(),
  annotate: z.boolean().optional(),
  work_offset: z.string().optional(),
}).passthrough();

const program_batch_sf = z.object({
  material: z.string(),
  iso_group: isoGroupZ,
  hardness_hb: z.number().optional(),
  operations: z.array(z.object({
    tool_diameter_mm: z.number(),
    flutes: z.number(),
    operation: z.string(),
    cut_type: z.string().optional(),
    axial_depth_mm: z.number().optional(),
    radial_depth_mm: z.number().optional(),
    tool_material: z.string().optional(),
  }).passthrough()),
  ...machineConstraintsPartial,
  optimize_for: optimizeForZ,
}).passthrough();

const program_cycle_time = z.object({
  material: z.string(),
  iso_group: isoGroupZ,
  hardness_hb: z.number().optional(),
  controller: controllerZ,
  operations: z.array(programOperationZ),
  ...machineConstraintsPartial,
  optimize_for: optimizeForZ,
}).passthrough();

// ============================================================================
// MotionDynamicsProfileEngine actions (7)
// ============================================================================

const motion_trapezoidal = z.object({
  distance_mm: z.number(),
  v_commanded_mmmin: z.number(),
  v_entry_mmmin: z.number().optional(),
  v_exit_mmmin: z.number().optional(),
  max_accel_mm_s2: z.number(),
}).passthrough();

const motion_scurve = z.object({
  distance_mm: z.number(),
  v_commanded_mmmin: z.number(),
  v_entry_mmmin: z.number().optional(),
  v_exit_mmmin: z.number().optional(),
  max_accel_mm_s2: z.number(),
  max_jerk_mm_s3: z.number(),
}).passthrough();

const motion_corner_velocity = z.object({
  v1_direction: z.object({ dx: z.number(), dy: z.number(), dz: z.number().optional() }),
  v2_direction: z.object({ dx: z.number(), dy: z.number(), dz: z.number().optional() }),
  max_accel_mm_s2: z.number(),
  corner_tolerance_mm: z.number().optional(),
}).passthrough();

const motion_look_ahead = z.object({
  segments: z.array(toolpathSegmentZ),
  kinematics: machineKinematicsZ,
}).passthrough();

const motion_axis_decompose = z.object({
  feed_mmmin: z.number(),
  direction: z.object({ dx: z.number(), dy: z.number(), dz: z.number().optional() }),
  axis_limits: z.object({
    x_max_mmmin: z.number(),
    y_max_mmmin: z.number(),
    z_max_mmmin: z.number().optional(),
    x_max_accel: z.number().optional(),
    y_max_accel: z.number().optional(),
    z_max_accel: z.number().optional(),
  }).passthrough(),
}).passthrough();

const motion_feed_effectiveness = z.object({
  segments: z.array(toolpathSegmentZ),
  kinematics: machineKinematicsZ,
}).passthrough();

const motion_optimize_feed = z.object({
  segments: z.array(toolpathSegmentZ),
  kinematics: machineKinematicsZ,
}).passthrough();

// ============================================================================
// EngagementAdaptiveFeedEngine actions (7)
// ============================================================================

const engage_adapt_feed = z.object({
  tool_diameter_mm: z.number(),
  flutes: z.number(),
  nominal_feed_mmmin: z.number(),
  nominal_rpm: z.number(),
  nominal_radial_depth_mm: z.number(),
  axial_depth_mm: z.number(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  kc1_1: z.number().optional(),
  mc: z.number().optional(),
  mode: z.enum(["constant_chip_load", "constant_force", "constant_mrr", "thermal_balance"]),
  max_feed_multiplier: z.number().optional(),
  min_feed_multiplier: z.number().optional(),
  ramp_distance_mm: z.number().optional(),
  segments: z.array(z.object({
    x: z.number(),
    y: z.number(),
    radial_depth_mm: z.number().optional(),
    engagement_deg: z.number().optional(),
    type: z.enum(["linear", "arc_cw", "arc_ccw"]).optional(),
    i: z.number().optional(),
    j: z.number().optional(),
    r: z.number().optional(),
  }).passthrough()),
}).passthrough();

const engage_calc_engagement = z.object({
  tool_diameter_mm: z.number(),
  radial_depth_mm: z.number(),
  move_type: z.enum(["linear", "arc_cw", "arc_ccw"]).optional(),
}).passthrough();

const engage_chip_thinning = z.object({
  engagement_deg: z.number(),
  tool_diameter_mm: z.number(),
  radial_depth_mm: z.number(),
  model: z.enum(["simplified", "martellotti", "exact"]).optional(),
}).passthrough();

const engage_constant_force = z.object({
  nominal_fz_mm: z.number(),
  nominal_engagement_deg: z.number(),
  new_engagement_deg: z.number(),
  kc1_1: z.number().optional(),
  mc: z.number().optional(),
}).passthrough();

const engage_constant_mrr = z.object({
  nominal_fz_mm: z.number(),
  nominal_ae_mm: z.number(),
  new_ae_mm: z.number(),
}).passthrough();

const engage_thermal_balance = z.object({
  nominal_fz_mm: z.number(),
  nominal_ae_mm: z.number(),
  new_ae_mm: z.number(),
  cutting_speed_mmin: z.number(),
  axial_depth_mm: z.number(),
  kc1_1: z.number().optional(),
}).passthrough();

const engage_ramp_transition = z.object({
  feed_before_mmmin: z.number(),
  feed_after_mmmin: z.number(),
  ramp_distance_mm: z.number(),
  num_points: z.number().optional(),
}).passthrough();

// ============================================================================
// Merged export
// ============================================================================

export const ACTION_CNC_PROGRAMMING_SCHEMAS: ActionSchemaMap = {
  // CNCProgramAssemblerEngine
  program_assemble,
  program_batch_sf,
  program_cycle_time,
  // MotionDynamicsProfileEngine
  motion_trapezoidal,
  motion_scurve,
  motion_corner_velocity,
  motion_look_ahead,
  motion_axis_decompose,
  motion_feed_effectiveness,
  motion_optimize_feed,
  // EngagementAdaptiveFeedEngine
  engage_adapt_feed,
  engage_calc_engagement,
  engage_chip_thinning,
  engage_constant_force,
  engage_constant_mrr,
  engage_thermal_balance,
  engage_ramp_transition,
};
