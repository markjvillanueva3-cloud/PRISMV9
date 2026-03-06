/**
 * Calc Dispatcher Action Schemas
 * ===============================
 * Per-action Zod schemas for all 77 prism_calc actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design decisions:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - Material can come via material_id OR material — both optional (fallback to defaults)
 * - Aliases (ap→axial_depth, vc→cutting_speed) are resolved by normalizeParams before validation
 *
 * @module schemas/calcActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U01
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();
const materialRef = z.string().min(1).optional();

// Common cutting condition fields (post-alias-resolution names)
const cuttingBase = {
  cutting_speed: optPosNum,
  feed_per_tooth: optPosNum,
  axial_depth: optPosNum,
  radial_depth: optPosNum,
  tool_diameter: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
  rake_angle: optNum,
  material_id: materialRef,
  material: materialRef,
  material_group: optStr,
};

// ============================================================================
// CORE CALCULATIONS (12 actions)
// ============================================================================

const cutting_force = z.object({
  ...cuttingBase,
  kc1_1: optPosNum,
  mc: optNum,
}).passthrough();

const tool_life = z.object({
  cutting_speed: posNum,
  taylor_C: optPosNum,
  taylor_n: optPosNum,
  material_id: materialRef,
  material: materialRef,
  material_group: optStr,
  tool_material: optStr,
  feed: optPosNum,
  depth: optPosNum,
  depth_of_cut: optPosNum,
}).passthrough();

const speed_feed = z.object({
  material_id: materialRef,
  material: materialRef,
  material_hardness: optPosNum,
  tool_material: optStr,
  operation: optStr,
  tool_diameter: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
}).passthrough();

const flow_stress = z.object({
  strain: posNum,
  strain_rate: posNum,
  temperature: posNum,
  A: posNum,
  B: posNum,
  n: posNum,
  C: posNum,
  m: posNum,
  T_melt: posNum,
  T_ref: optNum,
}).passthrough();

const surface_finish = z.object({
  feed: posNum,
  nose_radius: posNum,
  is_milling: optBool,
  radial_depth: optPosNum,
  tool_diameter: optPosNum,
  operation: optStr,
}).passthrough();

const mrr = z.object({
  cutting_speed: posNum,
  feed_per_tooth: posNum,
  axial_depth: posNum,
  radial_depth: posNum,
  tool_diameter: posNum,
  number_of_teeth: z.number().int().positive(),
  volume_to_remove: posNum,
}).passthrough();

const power = z.object({
  cutting_force: posNum,
  cutting_speed: posNum,
  tool_diameter: posNum,
  efficiency: optPosNum,
}).passthrough();

const chip_load = z.object({
  feed_rate: posNum,
  spindle_speed: posNum,
  number_of_teeth: z.number().int().positive(),
  radial_depth: posNum,
  tool_diameter: posNum,
}).passthrough();

const torque = z.object({
  cutting_force: posNum,
  tool_diameter: optPosNum,
  workpiece_diameter: optPosNum,
  operation: optStr,
}).passthrough();

const stability = z.object({
  natural_frequency: posNum,
  damping_ratio: posNum,
  stiffness: posNum,
  specific_force: posNum,
  number_of_teeth: z.number().int().positive(),
  current_depth: posNum,
  current_speed: posNum,
}).passthrough();

const deflection = z.object({
  cutting_force: posNum,
  tool_diameter: posNum,
  overhang_length: posNum,
  youngs_modulus: optPosNum,
  runout: optPosNum,
}).passthrough();

const thermal = z.object({
  cutting_speed: posNum,
  feed: posNum,
  depth: posNum,
  specific_force: posNum,
  thermal_conductivity: optPosNum,
  workpiece_length: optPosNum,
}).passthrough();

// ============================================================================
// DRILLING (1 action)
// ============================================================================

const drilling_force = z.object({
  drill_diameter: optPosNum,
  tool_diameter: optPosNum,
  feed_per_rev: posNum,
  cutting_speed: posNum,
  point_angle_deg: optNum,
  chisel_edge_factor: optNum,
  kc1_1: optPosNum,
  mc: optNum,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

// ============================================================================
// OPTIMIZATION (4 actions)
// ============================================================================

const cost_optimize = z.object({
  taylor_C: posNum,
  taylor_n: posNum,
  machine_rate: posNum,
  tool_cost: posNum,
  tool_change_time: posNum,
  volume_to_remove: optPosNum,
  mrr_at_ref: optPosNum,
}).passthrough();

const multi_optimize = z.object({
  max_power: posNum,
  max_force: posNum,
  min_tool_life: posNum,
  max_surface_finish: posNum,
  material_kc: posNum,
  taylor_C: posNum,
  taylor_n: posNum,
  tool_diameter: posNum,
  number_of_teeth: z.number().int().positive(),
  weight_productivity: optNum,
  weight_cost: optNum,
  weight_quality: optNum,
  weight_tool_life: optNum,
}).passthrough();

const productivity = z.object({
  cutting_speed: posNum,
  feed_per_tooth: posNum,
  axial_depth: posNum,
  radial_depth: posNum,
  tool_diameter: posNum,
  number_of_teeth: z.number().int().positive(),
  taylor_C: posNum,
  taylor_n: posNum,
  tool_cost: posNum,
  machine_rate: posNum,
}).passthrough();

const engagement = z.object({
  tool_diameter: posNum,
  radial_depth: posNum,
  feed_per_tooth: posNum,
  cutting_speed: posNum,
  is_climb: optBool,
}).passthrough();

// ============================================================================
// MACHINING STRATEGY (9 actions)
// ============================================================================

const trochoidal = z.object({
  tool_diameter: posNum,
  slot_width: posNum,
  axial_depth: posNum,
  cutting_speed: posNum,
  feed_per_tooth: posNum,
  number_of_teeth: z.number().int().positive(),
}).passthrough();

const hsm = z.object({
  tool_diameter: posNum,
  programmed_feedrate: posNum,
  machine_max_accel: optPosNum,
  tolerance: optPosNum,
}).passthrough();

const scallop = z.object({
  tool_radius: posNum,
  stepover: posNum,
  surface_width: posNum,
  feed_rate: posNum,
  is_ball_nose: optBool,
}).passthrough();

const stepover = z.object({
  tool_diameter: posNum,
  tool_corner_radius: z.number().min(0),
  target_scallop: optPosNum,
  operation: optStr,
}).passthrough();

const cycle_time = z.object({
  cutting_distance: posNum,
  cutting_feedrate: posNum,
  rapid_distance: optPosNum,
  number_of_tools: z.number().int().positive().optional(),
  tool_change_time: optPosNum,
  rapid_rate: optPosNum,
}).passthrough();

const arc_fit = z.object({
  chord_tolerance: posNum,
  arc_radius: posNum,
  feedrate: posNum,
  block_time: optPosNum,
}).passthrough();

const chip_thinning = z.object({
  tool_diameter: posNum,
  radial_depth: posNum,
  feed_per_tooth: posNum,
  number_of_teeth: z.number().int().positive().optional(),
  cutting_speed: optPosNum,
}).passthrough();

const multi_pass = z.object({
  total_stock: optPosNum,
  stock: optPosNum,
  tool_diameter: optPosNum,
  kc1_1: optPosNum,
  machine_power_kw: optPosNum,
  max_power: optPosNum,
  cutting_speed_rough: optPosNum,
  cutting_speed_finish: optPosNum,
  fz_rough: optPosNum,
  fz_finish: optPosNum,
  target_Ra: optPosNum,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

const coolant_strategy = z.object({
  iso_group: optStr,
  operation: optStr,
  cutting_speed: optPosNum,
  coolant_through: optBool,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

// ============================================================================
// G-CODE (2 actions)
// ============================================================================

const gcode_snippet = z.object({
  controller: optStr,
  operation: optStr,
  rpm: optPosNum,
  cutting_speed: optPosNum,
  tool_diameter: optPosNum,
  feed_rate: optPosNum,
  vf: optPosNum,
  tool_number: z.number().int().positive().optional(),
  axial_depth: optPosNum,
  x_start: optNum,
  y_start: optNum,
  z_safe: optNum,
  z_depth: optNum,
  coolant: optStr,
}).passthrough();

const gcode_generate = z.object({
  operations: z.array(z.record(z.string(), z.any())).optional(),
  controller: optStr,
  list_controllers: optBool,
  list_operations: optBool,
  operation: optStr,
  rpm: optPosNum,
  cutting_speed: optPosNum,
  tool_diameter: optPosNum,
  feed_rate: optPosNum,
  vf: optPosNum,
  tool_number: z.number().int().positive().optional(),
  z_safe: optNum,
  z_depth: optNum,
  coolant: optStr,
  x_start: optNum,
  y_start: optNum,
  x_end: optNum,
  y_end: optNum,
  peck_depth: optPosNum,
  pitch: optPosNum,
  thread_diameter: optPosNum,
  thread_pitch: optPosNum,
  thread_depth: optPosNum,
  thread_direction: optStr,
  pocket_diameter: optPosNum,
  pocket_depth: optPosNum,
  stepover_percent: optPosNum,
  profile_points: z.array(z.record(z.string(), z.any())).optional(),
  comp_side: optStr,
  approach_type: optStr,
  program_number: z.number().int().optional(),
  program_name: optStr,
  sub_program_number: z.number().int().optional(),
  sub_repeats: z.number().int().positive().optional(),
  work_offset: optStr,
  dwell: optPosNum,
  orient_angle: optNum,
  shift_amount: optNum,
}).passthrough();

// ============================================================================
// ANALYSIS (2 actions)
// ============================================================================

const tolerance_analysis = z.object({
  analysis_type: optStr,
  stack_dimensions: z.array(z.record(z.string(), z.any())).optional(),
  nominal_mm: optNum,
  tolerance_mm: optPosNum,
  process_sigma_mm: optPosNum,
  it_grade: z.number().int().min(1).max(18).optional(),
}).passthrough();

const fit_analysis = z.object({
  nominal_mm: posNum,
  fit_class: z.string().min(1),
}).passthrough();

// ============================================================================
// CAMPAIGN (4 actions)
// ============================================================================

const campaign_create = z.object({
  config: z.record(z.string(), z.any()),
  operation_results: z.array(z.array(z.any())),
  list_actions: optBool,
}).passthrough();

const campaign_validate = z.object({
  config: z.record(z.string(), z.any()),
}).passthrough();

const campaign_optimize = z.object({
  config: z.record(z.string(), z.any()),
  target: z.record(z.string(), z.any()).optional(),
}).passthrough();

const campaign_cycle_time = z.object({
  config: z.record(z.string(), z.any()),
}).passthrough();

// ============================================================================
// ADVANCED (8 actions)
// ============================================================================

const decision_tree = z.object({
  tree: optStr,
  list_trees: optBool,
}).passthrough();

const render_report = z.object({
  report_type: optStr,
  type: optStr,
  list_types: optBool,
}).passthrough();

const inference_chain = z.object({
  mode: optStr,
  chain_config: z.record(z.string(), z.any()).optional(),
  scenario: z.record(z.string(), z.any()).optional(),
  material: optStr,
  machine: optStr,
  constraints: z.record(z.string(), z.any()).optional(),
  response_level: optStr,
  symptoms: z.array(z.string()).optional(),
  alarm_code: optStr,
  machine_state: z.record(z.string(), z.any()).optional(),
  operation: optStr,
}).passthrough();

const wear_prediction = z.object({
  cutting_speed: posNum,
  cutting_time_min: posNum,
  feed_per_tooth: optPosNum,
  depth_of_cut: optPosNum,
  axial_depth: optPosNum,
  taylor_C: optPosNum,
  taylor_n: optPosNum,
  iso_group: optStr,
  material_id: materialRef,
  material: materialRef,
  material_group: optStr,
  tool_material: optStr,
  threshold_mm: optPosNum,
}).passthrough();

const process_cost_calc = z.object({
  machine_rate_per_hr: posNum,
  tool_cost: posNum,
  tool_diameter: optPosNum,
  total_stock: optPosNum,
  setup_time_min: optPosNum,
  batch_size: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  machine_power_kw: optPosNum,
  kc1_1: optPosNum,
  mc: optNum,
  taylor_C: optPosNum,
  taylor_n: optPosNum,
  cutting_speed_rough: optPosNum,
  cutting_speed_finish: optPosNum,
  fz_rough: optPosNum,
  fz_finish: optPosNum,
  target_Ra: optPosNum,
  material_id: materialRef,
  material: materialRef,
  cutting_length: optPosNum,
}).passthrough();

const uncertainty_chain = z.object({
  tool_diameter: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
  cutting_speed: optPosNum,
  feed_per_tooth: optPosNum,
  axial_depth: optPosNum,
  depth_of_cut: optPosNum,
  machine_rate_per_hr: optPosNum,
  tool_cost: optPosNum,
  cutting_length: optPosNum,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

const controller_optimize = z.object({
  controller: z.string().min(1),
  operation: optStr,
  params: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// SPECIALIZED ENGINES (11 actions)
// ============================================================================

const toolGradeEnum = z.enum(["HSS", "COBALT_HSS", "CARBIDE", "CARBIDE_COATED", "CERMET", "CERAMIC", "CBN", "PCD"]);

const wear_progression = z.object({
  cutting_speed_m_min: posNum,
  feed_mm_rev: posNum,
  depth_of_cut_mm: posNum,
  tool_grade: toolGradeEnum,
  workpiece_hardness_hrc: z.number().min(0).max(72),
  cutting_time_min: z.number().min(0).optional(),
  current_vb_mm: z.number().min(0).optional(),
  vb_limit_mm: optPosNum,
  cutting_temperature_C: optPosNum,
  taylor_C: optPosNum,
  taylor_n: optPosNum,
}).passthrough();

const drill_breakthrough = z.object({
  drill_diameter_mm: posNum,
  point_angle_deg: z.number().min(60).max(180),
  feed_mm_rev: posNum,
  spindle_rpm: posNum,
  workpiece_thickness_mm: posNum,
  exit_support: z.enum(["SUPPORTED", "UNSUPPORTED", "PARTIAL"]).optional(),
  material_tensile_MPa: optPosNum,
  peck_depth_mm: optPosNum,
}).passthrough();

const thermal_growth = z.object({
  spindle_speed_rpm: posNum,
  cutting_time_min: posNum,
  ambient_temp_C: optNum,
  spindle_bearing_type: z.enum(["ANGULAR_CONTACT", "ROLLER", "HYBRID_CERAMIC", "AIR"]).optional(),
  tool_overhang_mm: optPosNum,
  machine_class: z.enum(["VMC", "HMC", "LATHE", "GRINDER", "SWISS"]).optional(),
  coolant_temp_C: optNum,
  thermal_symmetry: optBool,
}).passthrough();

const bore_finishing = z.object({
  bore_diameter_mm: posNum,
  bore_length_mm: posNum,
  target_Ra_um: posNum,
  stone_grit: z.enum(["J150", "J220", "J280", "J400", "J500", "J600", "J800", "K10", "K20", "K30"]).optional(),
  honing_pressure_bar: optPosNum,
  stroke_speed_m_min: optPosNum,
  rotation_rpm: optPosNum,
  stock_removal_mm: optPosNum,
  coolant: z.enum(["HONING_OIL", "WATER_SOLUBLE", "MINERAL_OIL", "SYNTHETIC"]).optional(),
}).passthrough();

const finishing_pass = z.object({
  tool_diameter_mm: posNum,
  tool_overhang_mm: posNum,
  tool_nose_radius_mm: posNum,
  feed_mm_rev: posNum,
  target_Ra_um: posNum,
  tool_type: z.enum(["CARBIDE_INSERT", "CERMET", "CBN", "PCD", "SOLID_CARBIDE", "HSS"]).optional(),
  cutting_speed_m_min: optPosNum,
  depth_of_cut_mm: optPosNum,
  workpiece_hardness_HRC: optNum,
}).passthrough();

const turning_force = z.object({
  cutting_speed_m_min: posNum,
  feed_mm_rev: posNum,
  depth_of_cut_mm: posNum,
  lead_angle_deg: optNum,
  iso_group: optStr,
  material_kc1_1: optPosNum,
  material_mc: optNum,
  nose_radius_mm: optPosNum,
  rake_angle_deg: optNum,
}).passthrough();

const tapping_torque = z.object({
  thread_major_diameter_mm: posNum,
  pitch_mm: posNum,
  tap_type: z.enum(["CUT", "FORM", "SPIRAL_FLUTE", "SPIRAL_POINT", "THREAD_MILL"]).optional(),
  hole_type: z.enum(["THROUGH", "BLIND"]).optional(),
  thread_depth_mm: optPosNum,
  material_tensile_MPa: optPosNum,
  percent_thread: z.number().min(50).max(100).optional(),
  cutting_speed_m_min: optPosNum,
  coolant_type: optStr,
}).passthrough();

const power_budget = z.object({
  machine_power_kW: posNum,
  cutting_speed_m_min: posNum,
  depth_of_cut_mm: posNum,
  feed_mm_rev: posNum,
  tool_diameter_mm: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
  kc1_1: optPosNum,
  mc: optNum,
  efficiency: z.number().min(0).max(1).optional(),
  material_id: materialRef,
  material: materialRef,
}).passthrough();

const tool_deflection_predict = z.object({
  tool_diameter_mm: posNum,
  tool_overhang_mm: posNum,
  cutting_force_N: posNum,
  force_direction: z.enum(["RADIAL", "AXIAL", "TANGENTIAL", "COMBINED"]).optional(),
  tool_material: z.enum(["CARBIDE", "HSS", "CARBIDE_COATED", "CERMET"]).optional(),
  holder_stiffness_N_per_mm: optPosNum,
  collet_type: optStr,
}).passthrough();

const chip_formation = z.object({
  cutting_speed_m_min: posNum,
  feed_mm_rev: posNum,
  depth_of_cut_mm: posNum,
  rake_angle_deg: optNum,
  workpiece_ductility: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  nose_radius_mm: optPosNum,
  chip_breaker: optBool,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

const specific_cutting_energy = z.object({
  cutting_force_N: posNum,
  chip_width_mm: posNum,
  chip_thickness_mm: posNum,
  kc1_1: optPosNum,
  mc: optNum,
  feed_mm: optPosNum,
  rake_angle_deg: optNum,
  material_id: materialRef,
  material: materialRef,
}).passthrough();

// ============================================================================
// MONTE CARLO (4 actions)
// ============================================================================

const monte_carlo_simulate = z.object({
  model: optStr,
  samples: z.number().int().min(100).max(1_000_000).optional(),
  distribution: z.enum(["normal", "uniform", "triangular", "lognormal"]).optional(),
  mean: optNum,
  std_dev: optPosNum,
  min: optNum,
  max: optNum,
}).passthrough();

const monte_carlo_tool_life = z.object({
  cutting_speed: optPosNum,
  feedrate: optPosNum,
  depth_of_cut: optPosNum,
  taylor_C: optPosNum,
  taylor_n: optPosNum,
  samples: z.number().int().min(100).max(1_000_000).optional(),
  C_cv: z.number().min(0).max(1).optional(),
  n_cv: z.number().min(0).max(1).optional(),
  v_cv: z.number().min(0).max(1).optional(),
  tool_quality_cv: z.number().min(0).max(1).optional(),
}).passthrough();

const monte_carlo_tolerance = z.object({
  dimensions: z.array(z.object({
    name: z.string().min(1),
    nominal: z.number(),
    tolerance: posNum,
    distribution: z.enum(["normal", "uniform", "triangular"]).optional(),
  })).min(1),
  target_tolerance: optPosNum,
  samples: z.number().int().min(100).max(1_000_000).optional(),
}).passthrough();

const monte_carlo_histogram = z.object({
  samples: z.array(z.number()).min(2),
  bin_count: z.number().int().min(2).max(1000).optional(),
}).passthrough();

// ============================================================================
// SPINDLE HARMONICS + WEAR COMPENSATION (6 actions)
// ============================================================================

const spindle_harmonic_analysis = z.object({
  spindle_rpm: posNum,
  num_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  natural_frequencies_Hz: z.array(posNum).min(1).optional(),
  damping_ratios: z.array(z.number().min(0).max(1)).optional(),
  max_harmonic_order: z.number().int().min(1).max(20).optional(),
  bandwidth_pct: z.number().min(1).max(50).optional(),
}).passthrough();

const spindle_optimal_rpm = z.object({
  num_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  natural_frequencies_Hz: z.array(posNum).min(1).optional(),
  damping_ratios: z.array(z.number().min(0).max(1)).optional(),
  rpm_min: posNum.optional(),
  rpm_max: posNum.optional(),
  rpm_step: posNum.optional(),
}).passthrough();

const spindle_quality_map = z.object({
  num_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  natural_frequencies_Hz: z.array(posNum).min(1).optional(),
  rpm_min: posNum.optional(),
  rpm_max: posNum.optional(),
  rpm_step: posNum.optional(),
}).passthrough();

const archard_wear = z.object({
  cutting_speed_m_min: optPosNum,
  cutting_speed: optPosNum,
  feed_mm_rev: optPosNum,
  feed: optPosNum,
  depth_of_cut_mm: optPosNum,
  workpiece_hardness_HV: posNum,
  tool_hardness_HV: posNum,
  normal_stress_MPa: optPosNum,
  workpiece_type: z.enum([
    "cast_iron", "composite", "hardened_steel",
    "ceramic_insert", "cbn_insert", "pcd_insert", "general",
  ]).optional(),
  cutting_time_min: z.number().min(0).optional(),
}).passthrough();

const wear_force_correction = z.object({
  fresh_force_N: optPosNum,
  cutting_force_N: optPosNum,
  flank_wear_vb_mm: z.number().min(0).optional(),
  vb_mm: z.number().min(0).optional(),
  tool_material: z.enum(["carbide", "hss", "ceramic", "cbn", "pcd"]).optional(),
  rake_angle_deg: optNum,
  rake_angle: optNum,
}).passthrough();

const thermal_deflection_calc = z.object({
  cutting_force_N: optPosNum,
  force: optPosNum,
  tool_diameter_mm: optPosNum,
  tool_diameter: optPosNum,
  tool_overhang_mm: optPosNum,
  overhang: optPosNum,
  tool_material: z.enum(["carbide", "hss", "ceramic", "cermet", "cbn", "pcd"]).optional(),
  cutting_temperature_C: optPosNum,
  temperature: optPosNum,
  ambient_temperature_C: optNum,
  num_flutes: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// PHYSICS PREDICTION (5 actions — delegated, minimal params)
// ============================================================================

const physicsPrediction = z.object({}).passthrough();

// ============================================================================
// OPTIMIZATION DELEGATED (4 actions — delegated, minimal params)
// ============================================================================

const optimizationDelegated = z.object({}).passthrough();

// ============================================================================
// WORKHOLDING (1 action — delegated)
// ============================================================================

const fixture_recommend = z.object({}).passthrough();

// ============================================================================
// ALGORITHM ENGINE (6 actions)
// ============================================================================

const algorithm_calculate = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: z.record(z.string(), z.any()).optional(),
}).passthrough();

const algorithm_validate = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: z.record(z.string(), z.any()).optional(),
}).passthrough();

const algorithm_list = z.object({
  domain: optStr,
  safety_class: optStr,
}).passthrough();

const algorithm_info = z.object({
  algorithm_id: z.string().min(1),
}).passthrough();

const algorithm_batch = z.object({
  calculations: z.array(z.record(z.string(), z.any())),
  stop_on_error: optBool,
}).passthrough();

const algorithm_benchmark = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// EXPORT: ACTION_CALC_SCHEMAS
// ============================================================================

/** A C T I O N_ C A L C_ S C H E M A S constant.
 */
export const ACTION_CALC_SCHEMAS: ActionSchemaMap = {
  // Core calculations
  cutting_force,
  tool_life,
  speed_feed,
  flow_stress,
  surface_finish,
  mrr,
  power,
  chip_load,
  torque,
  stability,
  deflection,
  thermal,

  // Drilling
  drilling_force,

  // Optimization
  cost_optimize,
  multi_optimize,
  productivity,
  engagement,

  // Machining strategy
  trochoidal,
  hsm,
  scallop,
  stepover,
  cycle_time,
  arc_fit,
  chip_thinning,
  multi_pass,
  coolant_strategy,

  // G-code
  gcode_snippet,
  gcode_generate,

  // Analysis
  tolerance_analysis,
  fit_analysis,

  // Campaign
  campaign_create,
  campaign_validate,
  campaign_optimize,
  campaign_cycle_time,

  // Advanced
  decision_tree,
  render_report,
  inference_chain,
  wear_prediction,
  process_cost_calc,
  uncertainty_chain,
  controller_optimize,

  // Specialized engines
  wear_progression,
  drill_breakthrough,
  thermal_growth,
  bore_finishing,
  finishing_pass,
  turning_force,
  tapping_torque,
  power_budget,
  tool_deflection_predict,
  chip_formation,
  specific_cutting_energy,

  // Spindle harmonics + wear compensation
  spindle_harmonic_analysis,
  spindle_optimal_rpm,
  spindle_quality_map,
  archard_wear,
  wear_force_correction,
  thermal_deflection: thermal_deflection_calc,

  // Monte Carlo
  monte_carlo_simulate,
  monte_carlo_tool_life,
  monte_carlo_tolerance,
  monte_carlo_histogram,

  // Physics prediction (delegated — passthrough)
  surface_integrity_predict: physicsPrediction,
  chatter_predict: physicsPrediction,
  thermal_compensate: physicsPrediction,
  unified_machining_model: physicsPrediction,
  coupling_sensitivity: physicsPrediction,

  // Optimization delegated (passthrough)
  optimize_parameters: optimizationDelegated,
  optimize_sequence: optimizationDelegated,
  sustainability_report: optimizationDelegated,
  eco_optimize: optimizationDelegated,

  // Workholding (delegated — passthrough)
  fixture_recommend,

  // Algorithm engine
  algorithm_calculate,
  algorithm_validate,
  algorithm_list,
  algorithm_info,
  algorithm_batch,
  algorithm_benchmark,
};
