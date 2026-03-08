/**
 * Post-Processor Extension Action Schemas
 * ========================================
 * Per-action Zod schemas for 21 new post-processor innovation actions.
 *
 * Engines: ProbeRoutineEngine, CycleTimeEstimatorEngine, GCodeSafetyAnalyzerEngine,
 *   ToolpathThermalEngine, GCodeEnergyOptimizerEngine, MultiAxisKinematicEngine,
 *   SetupSheetFromGCodeEngine
 *
 * @module schemas/postProcessorExtActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();
const controllerEnum = z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"]).optional();

// ============================================================================
// PROBE ROUTINES (4 actions)
// ============================================================================

const point3d = z.object({
  x: z.number(), y: z.number(), z: z.number(),
}).passthrough();

const probeFeature = z.object({
  type: z.enum(["corner", "bore", "boss", "edge", "web", "surface", "groove", "angle"]),
  position: point3d.optional(),
  diameter: optNum,
  depth: optNum,
  nominal: optNum,
  tolerance_plus: optNum,
  tolerance_minus: optNum,
}).passthrough();

const probe_wcs_setup = z.object({
  controller: controllerEnum,
  probe_tool_number: z.number().int().positive().optional(),
  features: z.array(probeFeature).min(1),
  work_offset: optStr,
  approach_distance: optNum,
  feed_rate: optNum,
}).passthrough();

const probe_inspection = z.object({
  controller: controllerEnum,
  features: z.array(probeFeature).min(1),
  action_on_fail: z.enum(["alarm", "compensate", "skip"]).optional(),
  spc_output: optBool,
  measure_every_n_parts: z.number().int().positive().optional(),
}).passthrough();

const probe_tool_measure = z.object({
  controller: controllerEnum,
  tool_numbers: z.array(z.number().int().positive()).min(1),
  method: z.enum(["probe", "laser", "contact"]).optional(),
  measure_radius: optBool,
  spindle_orient: optBool,
}).passthrough();

const probe_first_article = z.object({
  controller: controllerEnum,
  features: z.array(probeFeature).min(1),
  datum_features: z.array(z.string()).optional(),
  report_format: z.enum(["AS9102", "PPAP", "custom"]).optional(),
}).passthrough();

// ============================================================================
// CYCLE TIME ESTIMATION (3 actions)
// ============================================================================

const machineProfile = z.object({
  rapid_rate_xy: optNum,
  rapid_rate_z: optNum,
  max_acceleration: optNum,
  max_jerk: optNum,
  servo_settling_time: optNum,
  look_ahead_blocks: optNum,
  block_processing_time: optNum,
  tool_change_time: optNum,
  spindle_accel_time: optNum,
  pallet_change_time: optNum,
  rotary_rapid_rate: optNum,
}).passthrough();

const cycle_time_estimate = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
  machine_profile: machineProfile.optional(),
  include_breakdown: optBool,
}).passthrough();

const cycle_time_compare = z.object({
  gcode: z.string().min(1),
  machines: z.array(z.object({
    name: z.string(),
    controller: controllerEnum,
    profile: machineProfile.optional(),
  }).passthrough()).min(2),
}).passthrough();

const cycle_time_bottlenecks = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
  machine_profile: machineProfile.optional(),
  top_n: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// G-CODE SAFETY ANALYSIS (2 actions)
// ============================================================================

const toolData = z.object({
  tool_num: z.number().int().positive(),
  diameter: optNum,
  max_rpm: optNum,
  type: z.enum(["endmill", "drill", "tap", "facemill", "ballnose", "chamfer", "probe", "reamer"]).optional(),
}).passthrough();

const gcode_safety_analyze = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
  tool_data: z.array(toolData).optional(),
  machine_envelope: z.object({
    xMin: z.number(), xMax: z.number(),
    yMin: z.number(), yMax: z.number(),
    zMin: z.number(), zMax: z.number(),
  }).passthrough().optional(),
  strictness: z.enum(["standard", "strict", "aerospace"]).optional(),
}).passthrough();

const gcode_safety_fix = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
  fix_level: z.enum(["safe_only", "moderate", "aggressive"]).optional(),
}).passthrough();

// ============================================================================
// THERMAL ANALYSIS (3 actions)
// ============================================================================

const workpieceDims = z.object({
  x: z.number().positive(),
  y: z.number().positive(),
  z: z.number().positive(),
}).passthrough();

const thermal_analyze = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  tool_diameter: z.number().positive(),
  workpiece_dimensions: workpieceDims,
  coolant_type: z.enum(["flood", "mist", "air", "none"]).optional(),
  ambient_temp: optNum,
}).passthrough();

const thermal_distortion = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  workpiece_dimensions: workpieceDims,
  critical_dimensions: z.array(z.object({
    axis: z.enum(["x", "y", "z"]),
    nominal: z.number(),
    tolerance: z.number().positive(),
  }).passthrough()).min(1),
  coolant_type: z.enum(["flood", "mist", "air", "none"]).optional(),
}).passthrough();

const thermal_optimize = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  critical_features: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// ENERGY OPTIMIZATION (2 actions)
// ============================================================================

const energy_analyze = z.object({
  gcode: z.string().min(1),
  machine_power_kw: optNum,
  spindle_efficiency: optNum,
  coolant_pump_kw: optNum,
  electricity_rate: optNum,
}).passthrough();

const energy_optimize = z.object({
  gcode: z.string().min(1),
  machine_power_kw: optNum,
  strategies: z.array(z.enum([
    "minimize_rapids", "spindle_idle_off", "batch_tool_changes",
    "coolant_management", "reduce_speed_changes",
  ])).optional(),
}).passthrough();

// ============================================================================
// MULTI-AXIS KINEMATICS (4 actions)
// ============================================================================

const kinematicConfig = z.object({
  type: z.enum(["table-table", "head-head", "head-table", "nutating-head"]),
  primary_rotary: z.enum(["A", "B", "C"]),
  secondary_rotary: z.enum(["A", "B", "C"]),
  pivot_point: point3d.optional(),
  rotary_limits: z.object({
    primary_min: z.number(), primary_max: z.number(),
    secondary_min: z.number(), secondary_max: z.number(),
  }).passthrough().optional(),
  continuous_rotary: z.array(z.boolean()).optional(),
}).passthrough();

const kinematic_singularity = z.object({
  gcode: z.string().min(1),
  kinematics: kinematicConfig,
  tolerance_deg: optNum,
}).passthrough();

const kinematic_transform = z.object({
  gcode: z.string().min(1),
  from_kinematics: kinematicConfig,
  to_kinematics: kinematicConfig,
}).passthrough();

const kinematic_optimize = z.object({
  gcode: z.string().min(1),
  kinematics: kinematicConfig,
}).passthrough();

const kinematic_reachability = z.object({
  gcode: z.string().min(1),
  kinematics: kinematicConfig,
}).passthrough();

// ============================================================================
// SETUP SHEET GENERATION (3 actions)
// ============================================================================

const setup_sheet_generate = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
  part_number: optStr,
  operation_name: optStr,
  include_tool_list: optBool,
  include_offsets: optBool,
  include_safety: optBool,
}).passthrough();

const setup_sheet_tools = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
}).passthrough();

const setup_sheet_operations = z.object({
  gcode: z.string().min(1),
  controller: controllerEnum,
}).passthrough();

// ============================================================================
// EXPORT
// ============================================================================

export const ACTION_POST_PROCESSOR_EXT_SCHEMAS: ActionSchemaMap = {
  // Probe routines
  probe_wcs_setup,
  probe_inspection,
  probe_tool_measure,
  probe_first_article,

  // Cycle time
  cycle_time_estimate,
  cycle_time_compare,
  cycle_time_bottlenecks,

  // Safety
  gcode_safety_analyze,
  gcode_safety_fix,

  // Thermal
  thermal_analyze,
  thermal_distortion,
  thermal_optimize,

  // Energy
  energy_analyze,
  energy_optimize,

  // Kinematics
  kinematic_singularity,
  kinematic_transform,
  kinematic_optimize,
  kinematic_reachability,

  // Setup sheet
  setup_sheet_generate,
  setup_sheet_tools,
  setup_sheet_operations,
};
