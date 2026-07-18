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
// AUTO SPEED & FEED (3 actions)
// ============================================================================

const toolDefinition = z.object({
  tool_number: z.number().int().positive(),
  diameter_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  type: z.enum(["endmill", "ballnose", "bull_nose", "face_mill", "drill", "tap", "reamer", "chamfer"]).optional(),
  material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional(),
  coating: optStr,
  flute_length_mm: optNum,
  corner_radius_mm: optNum,
  max_rpm: optNum,
  stickout_mm: optNum,
  helix_angle_deg: optNum,
}).passthrough();

const autoSpeedFeedBase = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  hardness_hb: optNum,
  tools: z.array(toolDefinition).min(1),
  axial_depth_mm: optNum,
  radial_depth_mm: optNum,
  cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
  strategy: z.enum(["conventional", "adaptive", "trochoidal", "hsm", "hpc", "slot"]).optional(),
  coolant: z.enum(["flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic"]).optional(),
  machine_power_kw: optNum,
  machine_max_rpm: optNum,
  machine_max_torque_nm: optNum,
  machine_rigidity: z.enum(["low", "medium", "high"]).optional(),
  optimize_for: z.enum(["tool_life", "productivity", "surface_finish", "balanced"]).optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const auto_speed_feed_optimize = autoSpeedFeedBase.extend({
  annotate: optBool,
  preserve_rapids: optBool,
  force_explicit_sf: optBool,
}).passthrough();

const auto_speed_feed_analyze = autoSpeedFeedBase;

const auto_speed_feed_batch = z.object({
  material: z.string().min(1),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  tools: z.array(z.object({
    tool_number: z.number().int().positive(),
    diameter_mm: z.number().positive(),
    flutes: z.number().int().positive(),
    type: optStr,
    material: optStr,
    operation: optStr,
    axial_depth_mm: optNum,
    radial_depth_mm: optNum,
  }).passthrough()).min(1),
  machine_power_kw: optNum,
  machine_max_rpm: optNum,
  optimize_for: z.enum(["tool_life", "productivity", "surface_finish", "balanced"]).optional(),
}).passthrough();

// ============================================================================
// G-CODE INTELLIGENCE PIPELINE (1 action)
// ============================================================================

const toolDefSimple = z.object({
  tool_number: z.number().int().positive(),
  diameter_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  type: optStr,
  material: optStr,
  coating: optStr,
  max_rpm: optNum,
}).passthrough();

const gcode_intelligence_pipeline = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  hardness_hb: optNum,
  tools: z.array(toolDefSimple).optional(),
  controller: controllerEnum,
  machine_power_kw: optNum,
  machine_max_rpm: optNum,
  axial_depth_mm: optNum,
  radial_depth_mm: optNum,
  cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
  coolant_type: z.enum(["flood", "mist", "air", "none"]).optional(),
  workpiece_dimensions: z.object({
    x: z.number().positive(), y: z.number().positive(), z: z.number().positive(),
  }).passthrough().optional(),
  stages: z.object({
    safety: optBool, speed_feed: optBool, thermal: optBool,
    energy: optBool, cycle_time: optBool, setup_sheet: optBool,
  }).passthrough().optional(),
  optimize_for: z.enum(["tool_life", "productivity", "surface_finish", "balanced"]).optional(),
  part_number: optStr,
  operation_name: optStr,
}).passthrough();

// ============================================================================
// MACHINE MATCHER (2 actions)
// ============================================================================

const machine_match = z.object({
  gcode: z.string().min(1),
  part_dimensions: z.object({
    x: z.number().positive(), y: z.number().positive(), z: z.number().positive(),
  }).passthrough().optional(),
  required_axes: z.number().int().min(3).max(5).optional(),
  controller_preference: optStr,
  min_atc_capacity: z.number().int().positive().optional(),
  needs_pallet_changer: optBool,
  material: optStr,
  max_hourly_rate: optNum,
  production_qty: z.number().int().positive().optional(),
  priority: z.enum(["speed", "precision", "cost", "balanced"]).optional(),
}).passthrough();

const machine_quick_match = z.object({
  gcode: z.string().min(1),
  material: optStr,
}).passthrough();

// ============================================================================
// TOOL WEAR COMPENSATION (2 actions)
// ============================================================================

const wearToolDef = z.object({
  tool_number: z.number().int().positive(),
  diameter_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  tool_material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional(),
  coating: optStr,
  expected_tool_life_min: optNum,
}).passthrough();

const wear_compensate = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  tools: z.array(wearToolDef).min(1),
  wear_model: z.enum(["taylor", "linear", "exponential"]).optional(),
  target_vb_mm: optNum,
  compensation_strategy: z.enum(["feed_reduction", "speed_reduction", "both"]).optional(),
  max_feed_reduction_pct: optNum,
  max_speed_reduction_pct: optNum,
  annotate: optBool,
  zones: z.number().int().min(2).max(20).optional(),
}).passthrough();

const wear_analyze = z.object({
  gcode: z.string().min(1),
  material: z.string().min(1),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  tools: z.array(wearToolDef).min(1),
}).passthrough();

// ============================================================================
// MANUFACTURING STATISTICS (8 actions)
// ============================================================================

const stats_process_capability = z.object({
  measurements: z.array(z.number()).min(2),
  usl: z.number(),
  lsl: z.number(),
  target: optNum,
  subgroup_size: z.number().int().positive().optional(),
}).passthrough();

const stats_spc_chart = z.object({
  subgroups: z.array(z.array(z.number()).min(1)).min(3),
  chart_type: z.enum(["xbar_r", "xbar_s", "individuals", "cusum", "ewma"]).optional(),
  target_mean: optNum,
  lambda: optNum,
  k_cusum: optNum,
  h_cusum: optNum,
}).passthrough();

const stats_weibull = z.object({
  failure_times: z.array(z.number().positive()).min(3),
  censored: z.array(z.boolean()).optional(),
  confidence_level: optNum,
}).passthrough();

const stats_monte_carlo_tolerance = z.object({
  dimensions: z.array(z.object({
    nominal: z.number(),
    tolerance_plus: z.number(),
    tolerance_minus: z.number(),
    distribution: z.enum(["normal", "uniform", "triangular"]).optional(),
  }).passthrough()).min(1),
  assembly_function: z.enum(["sum", "difference", "rss"]).optional(),
  iterations: z.number().int().positive().optional(),
  target_cpk: optNum,
}).passthrough();

const stats_anova = z.object({
  groups: z.array(z.array(z.number()).min(2)).min(2),
  factor_names: z.array(z.string()).optional(),
  alpha: optNum,
}).passthrough();

const stats_regression = z.object({
  x: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
  y: z.array(z.number()).min(3),
  type: z.enum(["linear", "polynomial", "power"]).optional(),
  degree: z.number().int().min(1).max(5).optional(),
}).passthrough();

const stats_oee = z.object({
  planned_production_time_min: z.number().positive(),
  actual_run_time_min: z.number().positive(),
  ideal_cycle_time_min: z.number().positive(),
  total_parts: z.number().int().nonnegative(),
  good_parts: z.number().int().nonnegative(),
}).passthrough();

const stats_gage_rr = z.object({
  measurements: z.array(z.array(z.array(z.number()))),
  tolerance: optNum,
}).passthrough();

// ============================================================================
// ADVANCED CUTTING MATH (8 actions)
// ============================================================================

const math_chip_mechanics = z.object({
  rake_angle_deg: z.number(),
  friction_angle_deg: optNum,
  feed_mm: z.number().positive(),
  width_mm: z.number().positive(),
  shear_strength_mpa: optNum,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
}).passthrough();

const math_thermal_models = z.object({
  cutting_speed_mmin: z.number().positive(),
  feed_mm: z.number().positive(),
  depth_mm: z.number().positive(),
  material_conductivity_wpmk: optNum,
  material_density_kgpm3: optNum,
  material_specific_heat_jpkgk: optNum,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
}).passthrough();

const math_wear_models = z.object({
  cutting_speed_mmin: z.number().positive(),
  feed_mm: z.number().positive(),
  depth_mm: z.number().positive(),
  time_min: z.number().positive(),
  interface_temp_c: optNum,
  normal_stress_mpa: optNum,
  tool_hardness_hv: optNum,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
}).passthrough();

const math_surface_integrity = z.object({
  feed_mm: z.number().positive(),
  nose_radius_mm: z.number().positive(),
  cutting_speed_mmin: z.number().positive(),
  depth_mm: z.number().positive(),
  edge_radius_mm: optNum,
  material_hardness_hrc: optNum,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
}).passthrough();

const math_timoshenko_deflection = z.object({
  segments: z.array(z.object({
    length_mm: z.number().positive(),
    diameter_mm: z.number().positive(),
    material_e_gpa: optNum,
    material_g_gpa: optNum,
  }).passthrough()).min(1),
  force_n: z.number().positive(),
  force_position_mm: optNum,
}).passthrough();

const math_taguchi = z.object({
  factors: z.array(z.object({
    name: z.string(),
    levels: z.array(z.number()).min(2),
  }).passthrough()).min(2),
  responses: z.array(z.number()).optional(),
}).passthrough();

const math_topsis = z.object({
  alternatives: z.array(z.array(z.number())).min(2),
  weights: z.array(z.number()).min(1),
  beneficial: z.array(z.boolean()).min(1),
  alternative_names: z.array(z.string()).optional(),
}).passthrough();

const math_desirability = z.object({
  responses: z.array(z.object({
    value: z.number(),
    target: z.number(),
    lower: z.number(),
    upper: z.number(),
    weight: optNum,
    goal: z.enum(["minimize", "maximize", "target"]),
  }).passthrough()).min(1),
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

  // Auto speed & feed
  auto_speed_feed_optimize,
  auto_speed_feed_analyze,
  auto_speed_feed_batch,

  // Intelligence pipeline
  gcode_intelligence_pipeline,

  // Machine matcher
  machine_match,
  machine_quick_match,

  // Tool wear compensation
  wear_compensate,
  wear_analyze,

  // Manufacturing statistics
  stats_process_capability,
  stats_spc_chart,
  stats_weibull,
  stats_monte_carlo_tolerance,
  stats_anova,
  stats_regression,
  stats_oee,
  stats_gage_rr,

  // Advanced cutting math
  math_chip_mechanics,
  math_thermal_models,
  math_wear_models,
  math_surface_integrity,
  math_timoshenko_deflection,
  math_taguchi,
  math_topsis,
  math_desirability,
};
