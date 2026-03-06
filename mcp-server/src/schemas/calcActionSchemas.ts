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
// ADVANCED CHIP THICKNESS (5 actions)
// ============================================================================

const chip_thickness_analyze = z.object({
  feed_per_tooth: optPosNum,
  fz: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  axial_depth: optPosNum,
  ap: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  number_of_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  entering_angle_deg: optPosNum,
  lead_angle: optPosNum,
  helix_angle_deg: optPosNum,
  edge_radius_mm: optPosNum,
  max_allowed_chip: optPosNum,
}).passthrough();

const ball_nose_chip = z.object({
  feed_per_tooth: optPosNum,
  fz: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  axial_depth: optPosNum,
  ap: optPosNum,
  ball_radius: optPosNum,
  tool_diameter: optPosNum,
}).passthrough();

const round_insert_chip = z.object({
  feed_per_tooth: optPosNum,
  fz: optPosNum,
  axial_depth: optPosNum,
  ap: optPosNum,
  insert_diameter: posNum,
}).passthrough();

const trochoidal_feed_adjust = z.object({
  base_feed: posNum,
  instantaneous_width: posNum,
  max_width: posNum,
}).passthrough();

const chip_thinning_lookup = z.object({
  radial_depth: optPosNum,
  ae: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
}).passthrough();

// ============================================================================
// ENGAGEMENT GEOMETRY (8 actions)
// ============================================================================

const corner_engagement_analyze = z.object({
  corner_angle_deg: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  corner_radius: optNum,
}).passthrough();

const corner_feed_adjust = z.object({
  corner_angle_deg: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  nominal_feed: posNum,
  corner_radius: optNum,
}).passthrough();

const curved_boundary_engagement = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  workpiece_radius: optPosNum,
  boundary_curvature: optPosNum,
}).passthrough();

const trochoidal_engagement_profile = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  trochoidal_radius: posNum,
  stepover: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  steps: z.number().int().positive().optional(),
}).passthrough();

const island_approach = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  island_radius: posNum,
  distance_to_island: posNum,
  radial_depth: optPosNum,
  ae: optPosNum,
}).passthrough();

const moat_calculate = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  island_radius: posNum,
  target_engagement_deg: optPosNum,
}).passthrough();

const engagement_validate = z.object({
  engagement_angle_deg: posNum,
}).passthrough();

const optimal_stepover = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  target_engagement_deg: optPosNum,
  prioritize_mrr: optBool,
  prioritize_tool_life: optBool,
}).passthrough();

// ============================================================================
// FEED RATE OPTIMIZATION (3 actions)
// ============================================================================

const feed_optimize = z.object({
  feed_per_tooth: optPosNum,
  fz: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  number_of_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  spindle_rpm: optPosNum,
  rpm: optPosNum,
  radial_depth: optPosNum,
  ae: optPosNum,
  axial_depth: optPosNum,
  ap: optPosNum,
  material: optStr,
  operation: z.enum(["roughing", "finishing", "semi_finishing"]).optional(),
  spindle_power_kw: optPosNum,
  specific_cutting_force: optPosNum,
  kc1_1: optPosNum,
  max_acceleration: optPosNum,
  target_chip_thickness: optPosNum,
}).passthrough();

const corner_feed = z.object({
  straight_feed: optPosNum,
  feed_rate: optPosNum,
  arc_radius: z.number().positive(),
  tool_diameter: optPosNum,
  Dc: optPosNum,
  is_internal: optBool,
}).passthrough();

const constant_chip_load = z.object({
  target_chip_mm: optPosNum,
  target_chip: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  number_of_flutes: z.number().int().positive().optional(),
  number_of_teeth: z.number().int().positive().optional(),
  spindle_rpm: optPosNum,
  rpm: optPosNum,
  engagement_profile: z.array(z.object({ position: z.number(), engagement_deg: z.number() })).optional(),
}).passthrough();

// ============================================================================
// ENTRY/EXIT STRATEGY (3 actions)
// ============================================================================

const entry_strategy = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  pocket_width: optPosNum,
  pocket_depth: optPosNum,
  depth: optPosNum,
  material: optStr,
  center_cutting: optBool,
  has_pre_drill: optBool,
  pre_drill_diameter: optPosNum,
  max_helix_angle_deg: optPosNum,
  max_ramp_angle_deg: optPosNum,
}).passthrough();

const exit_strategy = z.object({
  tool_diameter: optPosNum,
  Dc: optPosNum,
  operation: z.enum(["roughing", "finishing", "semi_finishing"]).optional(),
}).passthrough();

const validate_entry = z.object({
  method: z.enum(["helix", "ramp", "arc", "plunge", "interpolated", "pre_drill"]),
  tool_diameter: optPosNum,
  Dc: optPosNum,
  pocket_width: z.number().positive(),
  material: optStr,
}).passthrough();

// ============================================================================
// Z-LEVEL OPTIMIZATION (2 actions)
// ============================================================================

const z_level_optimize = z.object({
  total_depth: optPosNum,
  depth: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  tool_flute_length: optPosNum,
  flute_length: optPosNum,
  material: optStr,
  operation: z.enum(["roughing", "finishing", "semi_finishing"]).optional(),
  stock_to_leave: optNum,
  stability_limited_ap: optPosNum,
  even_levels: optBool,
}).passthrough();

const rest_machining_levels = z.object({
  previous_tool_diameter: optPosNum,
  prev_Dc: optPosNum,
  current_tool_diameter: optPosNum,
  tool_diameter: optPosNum,
  Dc: optPosNum,
  total_depth: optPosNum,
  depth: optPosNum,
  corner_radius_prev: optNum,
  material: optStr,
}).passthrough();

// ============================================================================
// TOOLPATH LINKING (2 actions)
// ============================================================================

const toolpath_link_optimize = z.object({
  segments: z.array(z.object({
    id: z.string(),
    start: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    end: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    z_level: z.number(),
    length: z.number(),
  })).optional(),
  clearance_height: optNum,
  retract_height: optNum,
  stay_down_max_distance: optPosNum,
  rapid_feed: optPosNum,
  cutting_feed: optPosNum,
  allow_stay_down: optBool,
  link_method: z.enum(["nearest", "optimized", "sequential"]).optional(),
}).passthrough();

const toolpath_link_time = z.object({
  segments: z.array(z.object({
    id: z.string(),
    start: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    end: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    z_level: z.number(),
    length: z.number(),
  })).optional(),
  clearance_height: optNum,
  retract_height: optNum,
  rapid_feed: optPosNum,
  cutting_feed: optPosNum,
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

  // Advanced chip thickness
  chip_thickness_analyze,
  ball_nose_chip,
  round_insert_chip,
  trochoidal_feed_adjust,
  chip_thinning_lookup,

  // Engagement geometry
  corner_engagement_analyze,
  corner_feed_adjust,
  curved_boundary_engagement,
  trochoidal_engagement_profile,
  island_approach,
  moat_calculate,
  engagement_validate,
  optimal_stepover,

  // Feed rate optimization
  feed_optimize,
  corner_feed,
  constant_chip_load,

  // Entry/exit strategy
  entry_strategy,
  exit_strategy,
  validate_entry,

  // Z-level optimization
  z_level_optimize,
  rest_machining_levels,

  // Toolpath linking
  toolpath_link_optimize,
  toolpath_link_time,

  // ── Machine Selection ──
  machine_recommend: z.object({
    operation: z.string(),
    envelope_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    material_iso_group: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    batch_size: z.number().int().positive().optional(),
  }).passthrough(),

  machine_compare: z.object({
    machine_ids: z.array(z.string()).min(2),
  }).passthrough(),

  machine_validate: z.object({
    machine_id: z.string(),
    operation: z.string(),
  }).passthrough(),

  // ── Tool Selection ──
  tool_select_recommend: z.object({
    operation: z.string(),
    material_iso_group: z.string(),
    feature: z.string().optional(),
    diameter_mm: z.number().positive().optional(),
  }).passthrough(),

  tool_select_compare: z.object({
    tool_ids: z.array(z.string()).min(2),
  }).passthrough(),

  tool_select_alternatives: z.object({
    tool_id: z.string(),
  }).passthrough(),

  // ── Tool Crib ──
  tool_crib_checkout: z.object({
    tool_id: z.string(),
    operator_id: z.string(),
    machine_id: z.string(),
    job_id: z.string(),
  }).passthrough(),

  tool_crib_checkin: z.object({
    tool_id: z.string(),
    operator_id: z.string(),
    usage_min: z.number().min(0),
    condition: z.enum(["good", "worn", "damaged", "broken"]).default("good"),
  }).passthrough(),

  tool_crib_inventory: z.object({}).passthrough(),

  tool_crib_reorder: z.object({}).passthrough(),

  // ── Toolholder Dynamics ──
  toolholder_frf: z.object({
    holder_type: z.enum(["collet", "shrink_fit", "hydraulic", "milling_chuck", "side_lock", "press_fit"]),
    taper: z.enum(["BT30", "BT40", "BT50", "HSK-A63", "HSK-A100", "CAT40", "CAT50"]),
    gauge_length_mm: z.number().positive(),
    tool_diameter_mm: z.number().positive(),
    tool_stickout_mm: z.number().positive(),
  }).passthrough(),

  toolholder_compare: z.object({
    holder_a: z.object({
      holder_type: z.string(),
      taper: z.string(),
      gauge_length_mm: z.number().positive(),
      tool_diameter_mm: z.number().positive(),
      tool_stickout_mm: z.number().positive(),
    }).passthrough(),
    holder_b: z.object({
      holder_type: z.string(),
      taper: z.string(),
      gauge_length_mm: z.number().positive(),
      tool_diameter_mm: z.number().positive(),
      tool_stickout_mm: z.number().positive(),
    }).passthrough(),
  }).passthrough(),

  // ── Machinability Rating ──
  machinability_rate: z.object({
    material: z.string(),
    hardness_HRC: z.number().optional(),
    tensile_MPa: z.number().optional(),
    condition: z.string().optional(),
  }).passthrough(),

  machinability_compare: z.object({
    materials: z.array(z.object({ material: z.string() }).passthrough()).min(2),
  }).passthrough(),

  // ── Material Equivalence ──
  material_equivalent: z.object({
    designation: z.string(),
    from_standard: z.enum(["AISI", "DIN", "EN", "JIS", "BS", "UNS", "GOST", "ISO"]),
    to_standard: z.enum(["AISI", "DIN", "EN", "JIS", "BS", "UNS", "GOST", "ISO"]).optional(),
  }).passthrough(),

  material_equiv_compare: z.object({
    material_a: z.string(),
    material_b: z.string(),
  }).passthrough(),

  // ── Material Selection ──
  material_select_recommend: z.object({
    application: z.string(),
    min_tensile_MPa: z.number().positive().optional(),
    max_cost_relative: z.number().positive().optional(),
    corrosion_resistance: z.boolean().optional(),
  }).passthrough(),

  material_select_compare: z.object({
    material_ids: z.array(z.string()).min(2),
  }).passthrough(),

  material_machinability: z.object({
    material_id: z.string(),
  }).passthrough(),

  // ── Tensile to Machinability ──
  tensile_to_machinability: z.object({
    tensile_strength_MPa: z.number().positive(),
    yield_strength_MPa: z.number().positive().optional(),
    elongation_pct: z.number().min(0).optional(),
    hardness_HRC: z.number().optional(),
    material_group: z.string().optional(),
  }).passthrough(),

  // ── Heat Treatment Response ──
  heat_treat_predict: z.object({
    process: z.enum(["anneal", "normalize", "harden_quench", "temper", "carburize", "nitride", "induction", "case_harden"]),
    material: z.string(),
    carbon_pct: z.number().min(0).max(3),
    austenitize_temp_C: z.number().positive(),
    hold_time_min: z.number().positive(),
    quench_medium: z.enum(["water", "oil", "polymer", "air", "salt_bath", "gas"]).default("oil"),
    temper_temp_C: z.number().min(0).optional(),
    section_thickness_mm: z.number().positive(),
  }).passthrough(),

  heat_treat_temper_curve: z.object({
    carbon_pct: z.number().min(0).max(3).default(0.4),
    start_HRC: z.number().min(20).max(70).default(60),
  }).passthrough(),

  heat_treat_recommend: z.object({
    material: z.string(),
    target_hardness_HRC: z.number().min(10).max(70).default(50),
    section_mm: z.number().positive().default(25),
  }).passthrough(),

  // ── Passivation ──
  passivation_calc: z.object({
    method: z.enum(["nitric_acid", "citric_acid", "electropolish"]),
    family: z.enum(["austenitic", "ferritic", "martensitic", "duplex", "PH"]),
    alloy: z.string(),
    surface_condition: z.enum(["machined", "ground", "welded", "as_received"]),
    contamination_level: z.enum(["light", "moderate", "heavy"]),
    part_surface_area_cm2: z.number().positive(),
    tank_volume_liters: z.number().positive(),
  }).passthrough(),

  // ── Plating Allowance ──
  plating_allowance: z.object({
    process: z.enum(["hard_chrome", "electroless_nickel", "zinc", "cadmium", "tin", "silver", "gold", "copper"]),
    target_thickness_um: z.number().positive(),
    dimension_type: z.enum(["od", "id", "flat", "thread"]),
    nominal_dimension_mm: z.number().positive(),
    tolerance_mm: z.number().positive(),
    substrate: z.string().optional(),
  }).passthrough(),

  plating_tolerance: z.object({
    process: z.enum(["hard_chrome", "electroless_nickel", "zinc", "cadmium", "tin", "silver", "gold", "copper"]),
    target_thickness_um: z.number().positive(),
    dimension_type: z.enum(["od", "id", "flat", "thread"]),
    nominal_dimension_mm: z.number().positive(),
    tolerance_mm: z.number().positive(),
  }).passthrough(),

  plating_recommend: z.object({
    substrate: z.string(),
    application: z.enum(["wear", "corrosion", "cosmetic", "electrical"]),
  }).passthrough(),

  // ── Shot Peening ──
  shot_peen_calc: z.object({
    material: z.string(),
    target_intensity: z.number().positive(),
    almen_strip: z.enum(["N", "A", "C"]),
    shot_media: z.enum(["steel_shot", "steel_cut_wire", "ceramic", "glass_bead", "conditioned_cut_wire"]),
    shot_size_mm: z.number().positive(),
    coverage_pct: z.number().min(100).max(600).default(200),
    surface_area_cm2: z.number().positive().optional(),
  }).passthrough(),

  // ── Recast Layer ──
  recast_layer_predict: z.object({
    process: z.enum(["wire_edm", "sinker_edm", "laser_cut", "laser_drill", "micro_edm"]),
    material: z.string(),
    discharge_energy_mJ: z.number().positive().optional(),
    current_A: z.number().positive().optional(),
    pulse_on_us: z.number().positive().optional(),
    pulse_off_us: z.number().positive().optional(),
  }).passthrough(),

  recast_layer_validate: z.object({
    process: z.enum(["wire_edm", "sinker_edm", "laser_cut", "laser_drill", "micro_edm"]),
    material: z.string(),
    discharge_energy_mJ: z.number().positive().optional(),
    current_A: z.number().positive().optional(),
    pulse_on_us: z.number().positive().optional(),
  }).passthrough(),

  // ── White Layer Detection ──
  white_layer_predict: z.object({
    material: z.string(),
    hardness_HRC: z.number().min(10).max(70),
    cutting_speed_m_per_min: z.number().positive(),
    feed_mm_per_rev: z.number().positive(),
    depth_of_cut_mm: z.number().positive(),
    tool_wear_VB_mm: z.number().min(0).optional(),
    coolant: z.boolean().default(true),
  }).passthrough(),

  white_layer_validate: z.object({
    material: z.string(),
    hardness_HRC: z.number().min(10).max(70),
    cutting_speed_m_per_min: z.number().positive(),
    feed_mm_per_rev: z.number().positive(),
    depth_of_cut_mm: z.number().positive(),
    tool_wear_VB_mm: z.number().min(0).optional(),
  }).passthrough(),

  // ── Masking Calculator ──
  masking_calc: z.object({
    process: z.enum(["plating", "anodize", "paint_coat", "heat_treat", "shot_peen", "passivation"]),
    features: z.array(z.object({
      id: z.string(),
      type: z.string(),
      area_cm2: z.number().positive().optional(),
      method: z.enum(["tape", "paint", "plug", "cap", "fixture", "wax"]).optional(),
    })).min(1),
  }).passthrough(),

  // ── Process Plan ──
  process_plan_generate: z.object({
    part_name: z.string(),
    material: z.string(),
    features: z.array(z.object({
      id: z.string(),
      category: z.enum(["hole", "pocket", "slot", "face", "profile", "thread", "chamfer", "bore", "groove", "freeform"]),
      dimensions: z.record(z.string(), z.number()).optional(),
    })).min(1),
    tolerance_class: z.string().optional(),
    batch_size: z.number().int().positive().optional(),
  }).passthrough(),

  process_plan_optimize: z.object({
    plan: z.object({
      operations: z.array(z.any()).min(1),
    }).passthrough(),
  }).passthrough(),

  process_plan_estimate_time: z.object({
    plan: z.object({
      operations: z.array(z.any()).min(1),
    }).passthrough(),
    setup_time_min: z.number().min(0).default(20),
  }).passthrough(),

  process_plan_validate: z.object({
    plan: z.object({
      operations: z.array(z.any()).min(1),
    }).passthrough(),
  }).passthrough(),

  // ── Thread Calculation ──
  thread_parse: z.object({
    designation: z.string().min(1),
  }).passthrough(),

  thread_tap_drill: z.object({
    designation: z.string().min(1),
    engagement_pct: z.number().min(10).max(100).default(75),
  }).passthrough(),

  thread_mill_params: z.object({
    designation: z.string().min(1),
    tool_diameter: z.number().positive().default(6),
    material: z.string().default("steel"),
    single_point: z.boolean().default(true),
  }).passthrough(),

  thread_stripping: z.object({
    designation: z.string().min(1),
    engagement_length: z.number().positive().default(10),
    tensile_strength_MPa: z.number().positive().default(400),
  }).passthrough(),

  // ── Tool Breakage Prediction ──
  tool_breakage_predict: z.object({
    tool: z.object({
      diameter: z.number().positive(),
      shankDiameter: z.number().positive(),
      fluteLength: z.number().positive(),
      overallLength: z.number().positive(),
      stickout: z.number().positive(),
      numberOfFlutes: z.number().int().positive(),
      helixAngle: z.number().optional(),
      coreRatio: z.number().min(0.3).max(0.9).optional(),
    }),
    forces: z.object({
      Fc: z.number(), Ff: z.number(), Fp: z.number(),
      torque: z.number().optional(),
    }),
    conditions: z.object({
      cuttingSpeed: z.number().positive(),
      feedPerTooth: z.number().positive(),
      axialDepth: z.number().positive(),
      radialDepth: z.number().positive(),
      spindleSpeed: z.number().positive(),
    }),
    material: z.enum(["HSS", "COBALT_HSS", "CARBIDE", "CARBIDE_COATED", "CERMET", "CERAMIC", "CBN", "PCD"]).default("CARBIDE"),
    options: z.object({
      workpieceMaterial: z.enum(["STEEL", "STAINLESS", "ALUMINUM", "CAST_IRON", "SUPERALLOY"]).optional(),
      operationType: z.enum(["ROUGHING", "SEMI_FINISH", "FINISHING", "PRECISION"]).optional(),
      isInterrupted: z.boolean().optional(),
      cyclesAccumulated: z.number().optional(),
    }).optional(),
  }).passthrough(),

  tool_stress_analyze: z.object({
    tool: z.object({
      diameter: z.number().positive(),
      shankDiameter: z.number().positive(),
      fluteLength: z.number().positive(),
      overallLength: z.number().positive(),
      stickout: z.number().positive(),
      numberOfFlutes: z.number().int().positive(),
    }),
    forces: z.object({
      Fc: z.number(), Ff: z.number(), Fp: z.number(),
      torque: z.number().optional(),
    }),
    material: z.enum(["HSS", "COBALT_HSS", "CARBIDE", "CARBIDE_COATED", "CERMET", "CERAMIC", "CBN", "PCD"]).default("CARBIDE"),
    is_interrupted: z.boolean().default(false),
  }).passthrough(),

  tool_safe_limits: z.object({
    tool: z.object({
      diameter: z.number().positive(),
      shankDiameter: z.number().positive(),
      fluteLength: z.number().positive(),
      overallLength: z.number().positive(),
      stickout: z.number().positive(),
      numberOfFlutes: z.number().int().positive(),
    }),
    material: z.enum(["HSS", "COBALT_HSS", "CARBIDE", "CARBIDE_COATED", "CERMET", "CERAMIC", "CBN", "PCD"]).default("CARBIDE"),
    workpiece_material: z.enum(["STEEL", "STAINLESS", "ALUMINUM", "CAST_IRON", "SUPERALLOY"]).default("STEEL"),
  }).passthrough(),

  // ── Spindle Protection ──
  spindle_torque_check: z.object({
    spindle: z.object({
      type: z.enum(["BELT_DRIVE", "GEAR_DRIVE", "DIRECT_DRIVE", "INTEGRAL_MOTOR", "HIGH_SPEED_ELECTRIC"]),
      bearingType: z.enum(["ANGULAR_CONTACT", "ROLLER", "HYBRID_CERAMIC", "AIR_BEARING", "MAGNETIC"]),
      coolingType: z.enum(["AIR_COOLED", "OIL_MIST", "OIL_JET", "WATER_COOLED", "CHILLER"]),
      ratedPower: z.number().positive(),
      peakPower: z.number().positive(),
      ratedTorque: z.number().positive(),
      peakTorque: z.number().positive(),
      minSpeed: z.number().min(0),
      maxSpeed: z.number().positive(),
      ratedSpeed: z.number().positive(),
      cornerSpeed: z.number().positive(),
      maxTemperature: z.number().positive(),
      warningTemperature: z.number().positive(),
      maxRadialLoad: z.number().positive(),
      maxAxialLoad: z.number().positive(),
    }).passthrough(),
    requirements: z.object({
      requiredTorque: z.number().positive(),
      requiredPower: z.number().positive(),
      targetSpeed: z.number().positive(),
      operationType: z.enum(["ROUGHING", "FINISHING", "DRILLING", "TAPPING", "HIGH_SPEED"]),
    }).passthrough(),
    state: z.object({
      currentSpeed: z.number(), currentTorque: z.number(),
      currentPower: z.number(), loadPercent: z.number(),
      temperature: z.number(), runTime: z.number(),
      commandedSpeed: z.number(),
    }).passthrough().optional(),
  }).passthrough(),

  spindle_power_check: z.object({
    spindle: z.object({
      type: z.enum(["BELT_DRIVE", "GEAR_DRIVE", "DIRECT_DRIVE", "INTEGRAL_MOTOR", "HIGH_SPEED_ELECTRIC"]),
      ratedPower: z.number().positive(),
      peakPower: z.number().positive(),
      ratedTorque: z.number().positive(),
      peakTorque: z.number().positive(),
      maxSpeed: z.number().positive(),
      ratedSpeed: z.number().positive(),
      cornerSpeed: z.number().positive(),
    }).passthrough(),
    requirements: z.object({
      requiredTorque: z.number().positive(),
      requiredPower: z.number().positive(),
      targetSpeed: z.number().positive(),
      operationType: z.enum(["ROUGHING", "FINISHING", "DRILLING", "TAPPING", "HIGH_SPEED"]),
    }).passthrough(),
    state: z.object({
      currentSpeed: z.number(), currentTorque: z.number(),
      currentPower: z.number(), loadPercent: z.number(),
      temperature: z.number(), runTime: z.number(),
      commandedSpeed: z.number(),
    }).passthrough().optional(),
  }).passthrough(),

  spindle_safe_envelope: z.object({
    spindle: z.object({
      type: z.enum(["BELT_DRIVE", "GEAR_DRIVE", "DIRECT_DRIVE", "INTEGRAL_MOTOR", "HIGH_SPEED_ELECTRIC"]),
      ratedPower: z.number().positive(),
      peakPower: z.number().positive(),
      ratedTorque: z.number().positive(),
      peakTorque: z.number().positive(),
      maxSpeed: z.number().positive(),
      ratedSpeed: z.number().positive(),
      cornerSpeed: z.number().positive(),
      maxTemperature: z.number().positive(),
      warningTemperature: z.number().positive(),
      maxRadialLoad: z.number().positive(),
      maxAxialLoad: z.number().positive(),
    }).passthrough(),
    requirements: z.object({
      requiredTorque: z.number().positive(),
      requiredPower: z.number().positive(),
      targetSpeed: z.number().positive(),
      operationType: z.enum(["ROUGHING", "FINISHING", "DRILLING", "TAPPING", "HIGH_SPEED"]),
    }).passthrough(),
    state: z.object({
      currentSpeed: z.number(), currentTorque: z.number(),
      currentPower: z.number(), loadPercent: z.number(),
      temperature: z.number(), runTime: z.number(),
      commandedSpeed: z.number(),
    }).passthrough().optional(),
  }).passthrough(),

  // ── Coolant Validation ──
  coolant_validate: z.object({
    system: z.object({
      delivery: z.enum(["FLOOD", "THROUGH_SPINDLE", "THROUGH_TOOL", "MQL", "AIR_BLAST", "CRYOGENIC", "DRY"]),
      coolantType: z.enum(["WATER_SOLUBLE", "SEMI_SYNTHETIC", "FULL_SYNTHETIC", "STRAIGHT_OIL", "MQL_OIL", "COMPRESSED_AIR", "LIQUID_NITROGEN", "LIQUID_CO2"]),
      flowRate: z.number().positive(),
      pressure: z.number().positive(),
    }).passthrough(),
    operation_params: z.object({
      operation: z.enum(["MILLING_GENERAL", "MILLING_HSM", "DRILLING_SHALLOW", "DRILLING_DEEP", "DRILLING_GUNDRILLING", "TAPPING", "REAMING", "BORING", "TURNING", "GRINDING"]),
      toolDiameter: z.number().positive(),
      cuttingSpeed: z.number().positive(),
      feedRate: z.number().positive(),
    }).passthrough(),
    tool_spec: z.object({
      hasThroughCoolant: z.boolean(),
      coolantHoleDiameter: z.number().positive().optional(),
      numberOfHoles: z.number().int().positive().optional(),
      minPressure: z.number().positive().optional(),
    }).optional(),
  }).passthrough(),

  coolant_flow_check: z.object({
    system: z.object({
      delivery: z.enum(["FLOOD", "THROUGH_SPINDLE", "THROUGH_TOOL", "MQL", "AIR_BLAST", "CRYOGENIC", "DRY"]),
      coolantType: z.enum(["WATER_SOLUBLE", "SEMI_SYNTHETIC", "FULL_SYNTHETIC", "STRAIGHT_OIL", "MQL_OIL", "COMPRESSED_AIR", "LIQUID_NITROGEN", "LIQUID_CO2"]),
      flowRate: z.number().positive(),
      pressure: z.number().positive(),
    }).passthrough(),
    operation_params: z.object({
      operation: z.enum(["MILLING_GENERAL", "MILLING_HSM", "DRILLING_SHALLOW", "DRILLING_DEEP", "DRILLING_GUNDRILLING", "TAPPING", "REAMING", "BORING", "TURNING", "GRINDING"]),
      toolDiameter: z.number().positive(),
      cuttingSpeed: z.number().positive(),
      feedRate: z.number().positive(),
    }).passthrough(),
  }).passthrough(),

  coolant_chip_evacuation: z.object({
    system: z.object({
      delivery: z.enum(["FLOOD", "THROUGH_SPINDLE", "THROUGH_TOOL", "MQL", "AIR_BLAST", "CRYOGENIC", "DRY"]),
      coolantType: z.enum(["WATER_SOLUBLE", "SEMI_SYNTHETIC", "FULL_SYNTHETIC", "STRAIGHT_OIL", "MQL_OIL", "COMPRESSED_AIR", "LIQUID_NITROGEN", "LIQUID_CO2"]),
      flowRate: z.number().positive(),
      pressure: z.number().positive(),
    }).passthrough(),
    operation_params: z.object({
      operation: z.enum(["MILLING_GENERAL", "MILLING_HSM", "DRILLING_SHALLOW", "DRILLING_DEEP", "DRILLING_GUNDRILLING", "TAPPING", "REAMING", "BORING", "TURNING", "GRINDING"]),
      toolDiameter: z.number().positive(),
      cuttingSpeed: z.number().positive(),
      feedRate: z.number().positive(),
      holeDepth: z.number().positive().optional(),
    }).passthrough(),
  }).passthrough(),

  // ── Gear Hobbing ──
  hobbing_calc: z.object({
    num_teeth: z.number().int().positive(),
    module_mm: z.number().positive(),
    pressure_angle_deg: z.number().positive().default(20),
    helix_angle_deg: z.number().min(0).default(0),
    face_width_mm: z.number().positive(),
    hob_diameter_mm: z.number().positive(),
    hob_num_starts: z.number().int().min(1).max(3).default(1),
    hob_num_gashes: z.number().int().positive(),
    hobbing_method: z.enum(["conventional", "climb", "diagonal"]).default("climb"),
    axial_feed_mm_per_rev: z.number().positive(),
    hob_rpm: z.number().positive(),
    num_cuts: z.number().int().min(1).max(3).default(1),
    stock_allowance_mm: z.number().positive().optional(),
  }).passthrough(),

  hobbing_shift: z.object({
    num_teeth: z.number().int().positive(),
    module_mm: z.number().positive(),
    pressure_angle_deg: z.number().positive().default(20),
    helix_angle_deg: z.number().min(0).default(0),
    face_width_mm: z.number().positive(),
    hob_diameter_mm: z.number().positive(),
    hob_num_starts: z.number().int().min(1).max(3).default(1),
    hob_num_gashes: z.number().int().positive(),
    hobbing_method: z.enum(["conventional", "climb", "diagonal"]).default("climb"),
    axial_feed_mm_per_rev: z.number().positive(),
    hob_rpm: z.number().positive(),
    num_cuts: z.number().int().min(1).max(3).default(1),
    parts_per_shift: z.number().int().positive().default(100),
  }).passthrough(),

  // ── Cryogenic Treatment ──
  cryo_predict: z.object({
    material_type: z.enum(["HSS", "carbide", "tool_steel", "bearing_steel", "stainless"]),
    carbon_pct: z.number().min(0).max(5),
    retained_austenite_pct: z.number().min(0).max(100),
    prior_hardness_HRC: z.number().min(10).max(75),
    cryo_level: z.enum(["shallow", "deep", "ultra_deep"]),
    soak_time_hr: z.number().positive(),
    material_grade: z.string().optional(),
    cobalt_pct: z.number().optional(),
    ramp_rate_C_per_min: z.number().optional(),
    post_temper_temp_C: z.number().optional(),
  }).passthrough(),

  cryo_recommend: z.object({
    material_type: z.enum(["HSS", "carbide", "tool_steel", "bearing_steel", "stainless"]),
    retained_austenite_pct: z.number().min(0).max(100).default(10),
  }).passthrough(),

  cryo_roi: z.object({
    material_type: z.enum(["HSS", "carbide", "tool_steel", "bearing_steel", "stainless"]),
    carbon_pct: z.number().min(0).max(5),
    retained_austenite_pct: z.number().min(0).max(100),
    prior_hardness_HRC: z.number().min(10).max(75),
    cryo_level: z.enum(["shallow", "deep", "ultra_deep"]),
    soak_time_hr: z.number().positive(),
    tool_cost_usd: z.number().positive().default(50),
    tools_per_year: z.number().int().positive().default(100),
  }).passthrough(),

  // ── Hardness Conversion (ASTM E140) ──
  hardness_convert: z.object({
    value: z.number().positive(),
    from_scale: z.enum(["HRC", "HRB", "HBW", "HV", "HK", "HRA"]),
    to_scale: z.enum(["HRC", "HRB", "HBW", "HV", "HK", "HRA"]),
  }).passthrough(),

  hardness_batch: z.object({
    values: z.array(z.number().positive()),
    from_scale: z.enum(["HRC", "HRB", "HBW", "HV", "HK", "HRA"]),
    to_scale: z.enum(["HRC", "HRB", "HBW", "HV", "HK", "HRA"]),
  }).passthrough(),

  // ── Bend Allowance (Sheet Metal) ──
  bend_allowance_calc: z.object({
    material: z.string(),
    thickness_mm: z.number().positive(),
    bend_angle_deg: z.number().positive(),
    inside_radius_mm: z.number().positive(),
    bend_method: z.enum(["air_bend", "bottom_bend", "coining", "folding", "roll_bend"]),
    k_factor: z.number().min(0).max(1).optional(),
    die_opening_mm: z.number().positive().optional(),
    tensile_strength_MPa: z.number().positive().optional(),
    yield_strength_MPa: z.number().positive().optional(),
  }).passthrough(),

  // ── Anodize Allowance ──
  anodize_allowance: z.object({
    anodize_type: z.enum(["type_I_chromic", "type_II_sulfuric", "type_IIB_thin", "type_III_hard"]),
    target_thickness_um: z.number().positive(),
    alloy: z.string(),
    dimension_type: z.enum(["od", "id", "flat"]),
    nominal_dimension_mm: z.number().positive(),
    tolerance_mm: z.number().positive(),
    is_dyed: z.boolean().default(false),
    seal_type: z.enum(["hot_water", "nickel_acetate", "dichromate", "none"]).default("hot_water"),
  }).passthrough(),

  // ── Clamping Simulation (SAFETY CRITICAL) ──
  clamp_simulate: z.object({
    clamp_points: z.array(z.object({
      id: z.string(),
      type: z.enum(["vise_jaw", "toe_clamp", "strap_clamp", "magnetic", "vacuum", "collet", "chuck_jaw"]),
      position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      force_direction: z.object({ fx: z.number(), fy: z.number(), fz: z.number() }),
      max_force_N: z.number().positive(),
      contact_area_mm2: z.number().positive(),
      friction_coefficient: z.number().min(0).max(1),
    })).min(1),
    cutting_forces: z.object({
      fx_N: z.number(), fy_N: z.number(), fz_N: z.number(),
      torque_Nm: z.number(), max_resultant_N: z.number().positive(),
    }),
    part_mass_kg: z.number().positive(),
    part_material: z.string(),
    part_dimensions: z.object({ width_mm: z.number().positive(), height_mm: z.number().positive(), depth_mm: z.number().positive() }),
  }).passthrough(),

  clamp_validate: z.object({
    clamp_points: z.array(z.object({
      id: z.string(),
      type: z.enum(["vise_jaw", "toe_clamp", "strap_clamp", "magnetic", "vacuum", "collet", "chuck_jaw"]),
      position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      force_direction: z.object({ fx: z.number(), fy: z.number(), fz: z.number() }),
      max_force_N: z.number().positive(),
      contact_area_mm2: z.number().positive(),
      friction_coefficient: z.number().min(0).max(1),
    })).min(1),
    cutting_forces: z.object({
      fx_N: z.number(), fy_N: z.number(), fz_N: z.number(),
      torque_Nm: z.number(), max_resultant_N: z.number().positive(),
    }),
    part_mass_kg: z.number().positive(),
    part_material: z.string(),
    part_dimensions: z.object({ width_mm: z.number().positive(), height_mm: z.number().positive(), depth_mm: z.number().positive() }),
  }).passthrough(),

  clamp_optimize: z.object({
    clamp_points: z.array(z.object({
      id: z.string(),
      type: z.enum(["vise_jaw", "toe_clamp", "strap_clamp", "magnetic", "vacuum", "collet", "chuck_jaw"]),
      position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      force_direction: z.object({ fx: z.number(), fy: z.number(), fz: z.number() }),
      max_force_N: z.number().positive(),
      contact_area_mm2: z.number().positive(),
      friction_coefficient: z.number().min(0).max(1),
    })).min(1),
    cutting_forces: z.object({
      fx_N: z.number(), fy_N: z.number(), fz_N: z.number(),
      torque_Nm: z.number(), max_resultant_N: z.number().positive(),
    }),
    part_mass_kg: z.number().positive(),
    part_material: z.string(),
    part_dimensions: z.object({ width_mm: z.number().positive(), height_mm: z.number().positive(), depth_mm: z.number().positive() }),
  }).passthrough(),

  // ── Damping Optimization ──
  damping_optimize: z.object({
    target_freq_Hz: z.number().positive(),
    structure_mass_kg: z.number().positive(),
    structure_stiffness_N_per_m: z.number().positive(),
    structure_damping_ratio: z.number().min(0).max(1),
    available_mass_ratio: z.number().min(0).max(0.5).optional(),
    space_constraint_mm: z.number().positive().optional(),
    strategies: z.array(z.enum([
      "tuned_mass_damper", "viscoelastic_damper", "impact_damper",
      "mr_fluid", "constrained_layer", "variable_speed",
      "variable_pitch", "process_damping", "none"
    ])).optional(),
  }).passthrough(),

  // ── Cost Estimation ──
  cost_estimate: z.object({
    material_name: z.string(),
    material_iso_group: z.string(),
    stock_volume_cm3: z.number().positive(),
    part_volume_cm3: z.number().positive(),
    machine_rate_per_hour: z.number().positive(),
    cycle_time_min: z.number().positive(),
    setup_time_min: z.number().min(0),
    num_tools: z.number().int().positive(),
    batch_size: z.number().int().positive(),
    labor_rate_per_hour: z.number().positive().optional(),
    overhead_pct: z.number().min(0).max(200).optional(),
  }).passthrough(),

  cost_compare_materials: z.object({
    materials: z.array(z.object({ name: z.string(), iso_group: z.string() })).min(2),
    stock_volume_cm3: z.number().positive(),
    part_volume_cm3: z.number().positive(),
    machine_rate_per_hour: z.number().positive(),
    cycle_time_min: z.number().positive(),
    setup_time_min: z.number().min(0),
    num_tools: z.number().int().positive(),
    batch_size: z.number().int().positive(),
  }).passthrough(),
};
