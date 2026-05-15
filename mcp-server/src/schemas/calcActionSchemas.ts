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

/** Dynamic config object — typed as unknown (safer than any, prevents method access) */
const dynamicRecord = z.record(z.string(), z.unknown());
const optDynamicRecord = z.record(z.string(), z.unknown()).optional();

/** G-code operation step */
const gcodeOp = z.object({
  type: z.string().optional(),
  tool: z.string().optional(),
  x: z.number().optional(), y: z.number().optional(), z: z.number().optional(),
  feed: z.number().optional(), speed: z.number().optional(),
}).passthrough();

/** Campaign operation result row */
const campaignResultRow = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]));

/** Plan operation entry */
const planOperation = z.object({
  type: z.string().optional(),
  operation: z.string().optional(),
  tool_diameter: z.number().optional(),
  depth: z.number().optional(),
  passes: z.number().optional(),
}).passthrough();

/** Algorithm parameter set */
const algorithmParams = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.number())])).optional();

/** Batch calculation entry */
const batchCalcEntry = z.object({
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
}).passthrough();

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
  operations: z.array(gcodeOp).optional(),
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
  profile_points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number().optional() }).passthrough()).optional(),
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
  stack_dimensions: z.array(z.object({ material: z.string().optional(), thickness: z.number().optional() }).passthrough()).optional(),
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
  config: dynamicRecord,
  operation_results: z.array(campaignResultRow),
  list_actions: optBool,
}).passthrough();

const campaign_validate = z.object({
  config: dynamicRecord,
}).passthrough();

const campaign_optimize = z.object({
  config: dynamicRecord,
  target: optDynamicRecord,
}).passthrough();

const campaign_cycle_time = z.object({
  config: dynamicRecord,
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
  chain_config: optDynamicRecord,
  scenario: optDynamicRecord,
  material: optStr,
  machine: optStr,
  constraints: optDynamicRecord,
  response_level: optStr,
  symptoms: z.array(z.string()).optional(),
  alarm_code: optStr,
  machine_state: optDynamicRecord,
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
  params: optDynamicRecord,
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
  machine_max_torque_Nm: optPosNum,
  machine_base_rpm: optPosNum,
  machine_max_rpm: optPosNum,
  cutting_speed_m_min: posNum,
  depth_of_cut_mm: posNum,
  width_of_cut_mm: optPosNum,
  // U-WIRE02: schema-engine alignment — engine accepts feed_mm_rev OR (feed_mm_tooth × flutes)
  feed_mm_rev: optPosNum,
  feed_mm_tooth: optPosNum,
  flutes: z.number().int().positive().optional(),
  tool_diameter_mm: optPosNum,
  workpiece_diameter_mm: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
  kc1_1: optPosNum,
  mc: optNum,
  material_kc1_1: optPosNum,
  material_mc: optNum,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
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

const tool_assembly_deflection = z.object({
  sections: z.array(z.object({
    name: z.string(),
    length_mm: posNum,
    diameter_mm: posNum,
    material: z.enum(["carbide", "hss", "steel", "ceramic", "cermet"]).optional(),
    is_cutting: z.boolean().optional(),
  }).passthrough()).min(1),
  cutting_force_n: posNum,
  force_position: z.enum(["tip", "center", "distributed"]).optional(),
  spindle_rigidity_n_um: optPosNum,
  radial_force_n: optPosNum,
  taper: z.enum(["BT30", "BT40", "CAT40", "CAT50", "HSK-A63", "HSK-A100", "HSK-F63"]).optional(),
}).passthrough();

const thread_strength_fatigue = z.object({
  sub_action: z.enum(["thread_strength", "thread_fatigue", "bolt_preload", "vibration_loosening", "joint_analysis"]).optional(),
  thread_type: optStr,
  major_diameter_mm: optPosNum,
  minor_diameter_mm: optPosNum,
  pitch_mm: optPosNum,
  engagement_length_mm: optPosNum,
  material_ult_shear_mpa: optPosNum,
  stress_amplitude_mpa: optPosNum,
  mean_stress_mpa: optNum,
  endurance_limit_mpa: optPosNum,
  ultimate_strength_mpa: optPosNum,
  kt_thread: optPosNum,
  torque_nm: optPosNum,
  bolt_diameter_mm: optPosNum,
  nut_factor_k: optPosNum,
  bolt_stiffness_n_mm: optPosNum,
  member_stiffness_n_mm: optPosNum,
  external_force_n: optPosNum,
  preload_force_n: optPosNum,
  transverse_force_n: optPosNum,
  friction_coefficient: optPosNum,
  pitch_diameter_mm: optPosNum,
  nut_shear_area_mm2: optPosNum,
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
  algorithm_params: algorithmParams,
}).passthrough();

const algorithm_validate = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: algorithmParams,
}).passthrough();

const algorithm_list = z.object({
  domain: optStr,
  safety_class: optStr,
}).passthrough();

const algorithm_info = z.object({
  algorithm_id: z.string().min(1),
}).passthrough();

const algorithm_batch = z.object({
  calculations: z.array(z.object({ algorithm_id: z.string(), params: dynamicRecord }).passthrough()),
  stop_on_error: optBool,
}).passthrough();

const algorithm_benchmark = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: algorithmParams,
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
  tool_assembly_deflection,
  thread_strength_fatigue,
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
      operations: z.array(planOperation).min(1),
    }).passthrough(),
  }).passthrough(),

  process_plan_estimate_time: z.object({
    plan: z.object({
      operations: z.array(planOperation).min(1),
    }).passthrough(),
    setup_time_min: z.number().min(0).default(20),
  }).passthrough(),

  process_plan_validate: z.object({
    plan: z.object({
      operations: z.array(planOperation).min(1),
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

  // ── Batch 13: Workholding & Fixture ──────────────────────────
  fixture_design_recommend: z.object({
    shape: z.enum(["prismatic", "cylindrical", "irregular"]).optional(),
    length_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    height_mm: z.number().positive().optional(),
    weight_kg: z.number().positive().optional(),
    material_iso_group: z.string().optional(),
    max_force_N: z.number().positive().optional(),
    force_direction: z.string().optional(),
  }).passthrough(),
  fixture_design_validate: z.object({
    shape: z.enum(["prismatic", "cylindrical", "irregular"]).optional(),
    length_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    height_mm: z.number().positive().optional(),
    weight_kg: z.number().positive().optional(),
    material_iso_group: z.string().optional(),
    max_force_N: z.number().positive().optional(),
    force_direction: z.string().optional(),
    fixture_type: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
  }).passthrough(),
  fixture_clamp_force: z.object({
    cutting_force_N: z.number().positive().optional(),
    material_iso_group: z.string().optional(),
    fixture_type: z.string().optional(),
    serrated: z.boolean().optional(),
    num_clamps: z.number().int().positive().optional(),
  }).passthrough(),
  fixture_clamp_contact_stress: z.object({
    jaw_width_mm: z.number().positive().describe("Clamp jaw width [mm]"),
    jaw_height_mm: z.number().positive().describe("Clamp jaw height [mm]"),
    jaw_thickness_mm: z.number().positive().describe("Jaw thickness for plane stress [mm]"),
    clamping_force_N: z.number().positive().describe("Clamping force [N]"),
    E_mpa: z.number().positive().optional().describe("Young's modulus [MPa], default 210000 steel"),
    nu: z.number().min(0).max(0.5).optional().describe("Poisson's ratio, default 0.3"),
    yield_stress_mpa: z.number().positive().optional().describe("Yield stress [MPa], default 250"),
    num_contact_points: z.number().int().positive().optional().describe("Contact points across width, default 2"),
    mesh_density: z.number().int().positive().optional().describe("FEM elements per side, default 3"),
  }).passthrough(),
  fixture_deflection_calc: z.object({
    shape: z.enum(["prismatic", "cylindrical", "irregular"]).optional(),
    length_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    height_mm: z.number().positive().optional(),
    weight_kg: z.number().positive().optional(),
    material_iso_group: z.string().optional(),
    max_force_N: z.number().positive().optional(),
    fixture_type: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
  }).passthrough(),
  soft_jaw_design: z.object({
    workpiece_shape: z.enum(["round", "hex", "square", "rectangular", "irregular"]).optional(),
    workpiece_dimension_mm: z.number().positive().optional(),
    workpiece_height_mm: z.number().positive().optional(),
    workpiece_material: z.string().optional(),
    jaw_material: z.string().optional(),
    num_jaws: z.number().int().optional(),
    chuck_or_vise: z.enum(["chuck", "vise"]).optional(),
    clamping_force_N: z.number().positive().optional(),
    grip_depth_mm: z.number().positive().optional(),
    surface_finish_critical: z.boolean().optional(),
  }).passthrough(),
  magnetic_chuck_calc: z.object({
    chuck_type: z.enum(["permanent", "electropermanent", "electromagnetic"]).optional(),
    chuck_pull_force_N_per_cm2: z.number().positive().optional(),
    workpiece_length_mm: z.number().positive().optional(),
    workpiece_width_mm: z.number().positive().optional(),
    workpiece_thickness_mm: z.number().positive().optional(),
    workpiece_material: z.string().optional(),
    workpiece_weight_N: z.number().positive().optional(),
    contact_area_pct: z.number().min(0).max(100).optional(),
    cutting_force_tangential_N: z.number().min(0).optional(),
    cutting_force_normal_N: z.number().min(0).optional(),
    operation: z.string().optional(),
    surface_roughness_Ra_um: z.number().min(0).optional(),
  }).passthrough(),
  tombstone_layout: z.object({
    tombstone_faces: z.number().int().optional(),
    face_width_mm: z.number().positive().optional(),
    face_height_mm: z.number().positive().optional(),
    part_width_mm: z.number().positive().optional(),
    part_height_mm: z.number().positive().optional(),
    part_depth_mm: z.number().positive().optional(),
    part_weight_kg: z.number().positive().optional(),
    machining_time_per_part_min: z.number().positive().optional(),
    clearance_mm: z.number().min(0).optional(),
    max_table_load_kg: z.number().positive().optional(),
  }).passthrough(),
  workholding_clamp_force: z.object({
    Fc: z.number().min(0).optional(),
    Ff: z.number().min(0).optional(),
    Fp: z.number().min(0).optional(),
    device_type: z.string().optional(),
    surface_condition: z.string().optional(),
    operation_type: z.string().optional(),
    safety_factor: z.number().positive().optional(),
  }).passthrough(),
  workholding_pullout: z.object({
    axial_force_N: z.number().min(0).optional(),
    device_type: z.string().optional(),
    clamp_force_N: z.number().positive().optional(),
    safety_factor: z.number().positive().optional(),
  }).passthrough(),
  workholding_liftoff: z.object({
    Fc: z.number().min(0).optional(),
    Ff: z.number().min(0).optional(),
    Fp: z.number().min(0).optional(),
    device_type: z.string().optional(),
    operation_type: z.string().optional(),
    clamp_force_N: z.number().positive().optional(),
    length_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    height_mm: z.number().positive().optional(),
  }).passthrough(),
  fixture_3dp_evaluate: z.object({
    process: z.enum(["FDM", "SLA", "SLS", "DMLS"]).optional(),
    material: z.string().optional(),
    fixture_volume_cm3: z.number().positive().optional(),
    max_cutting_force_N: z.number().min(0).optional(),
    max_temperature_C: z.number().optional(),
    coolant_exposure: z.boolean().optional(),
    required_accuracy_mm: z.number().positive().optional(),
    batch_size: z.number().int().positive().optional(),
    conventional_cost_USD: z.number().positive().optional(),
    conventional_lead_days: z.number().positive().optional(),
  }).passthrough(),
  weld_prep_calc: z.object({
    joint_type: z.enum(["butt", "corner", "tee", "lap", "edge"]).optional(),
    groove_type: z.string().optional(),
    plate_thickness_mm: z.number().positive().optional(),
    material: z.string().optional(),
    weld_process: z.string().optional(),
    bevel_angle_deg: z.number().optional(),
    root_gap_mm: z.number().optional(),
  }).passthrough(),
  twin_create: z.object({
    machine_id: z.string().optional(),
    machine_name: z.string().optional(),
    model: z.string().optional(),
  }).passthrough(),
  twin_predict: z.object({
    machine_id: z.string().optional(),
  }).passthrough(),
  twin_simulate: z.object({
    machine_id: z.string().optional(),
    scenario: z.string().optional(),
    parameter_change: z.number().optional(),
  }).passthrough(),

  // ── Batch 14: Machining Physics & Probing ────────────────────
  spline_mill_calc: z.object({
    spline_type: z.enum(["involute", "straight_sided", "serration"]).optional(),
    num_teeth: z.number().int().positive().optional(),
    pressure_angle_deg: z.number().optional(),
    major_diameter_mm: z.number().positive().optional(),
    minor_diameter_mm: z.number().positive().optional(),
    face_width_mm: z.number().positive().optional(),
    internal: z.boolean().optional(),
    index_method: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    spindle_rpm: z.number().positive().optional(),
    feed_per_tooth_mm: z.number().positive().optional(),
    num_depth_passes: z.number().int().positive().optional(),
  }).passthrough(),
  spline_mill_validate: z.object({
    spline_type: z.enum(["involute", "straight_sided", "serration"]).optional(),
    num_teeth: z.number().int().positive().optional(),
    major_diameter_mm: z.number().positive().optional(),
    minor_diameter_mm: z.number().positive().optional(),
    fit_class: z.enum(["A", "B", "C"]).optional(),
  }).passthrough(),
  thin_floor_analyze: z.object({
    geometry: z.enum(["floor", "wall", "web", "rib"]).optional(),
    thickness_mm: z.number().positive().optional(),
    unsupported_length_mm: z.number().positive().optional(),
    material_E_GPa: z.number().positive().optional(),
    material_density_kgm3: z.number().positive().optional(),
    material_poisson: z.number().optional(),
    cutting_force_N: z.number().min(0).optional(),
    spindle_rpm: z.number().positive().optional(),
    num_flutes: z.number().int().positive().optional(),
    tool_diameter_mm: z.number().positive().optional(),
  }).passthrough(),
  thin_floor_min_thickness: z.object({
    geometry: z.enum(["floor", "wall", "web", "rib"]).optional(),
    unsupported_length_mm: z.number().positive().optional(),
    material_E_GPa: z.number().positive().optional(),
    material_density_kgm3: z.number().positive().optional(),
    cutting_force_N: z.number().min(0).optional(),
    spindle_rpm: z.number().positive().optional(),
    target_deflection_um: z.number().positive().optional(),
  }).passthrough(),
  regen_chatter_predict: z.object({
    cut_type: z.string().optional(),
    spindle_rpm: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
    num_flutes: z.number().int().positive().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    natural_freq_Hz: z.number().positive().optional(),
    stiffness_N_per_m: z.number().positive().optional(),
    damping_ratio: z.number().positive().optional(),
    specific_cutting_force_N_mm2: z.number().positive().optional(),
  }).passthrough(),
  regen_chatter_lobes: z.object({
    cut_type: z.string().optional(),
    num_flutes: z.number().int().positive().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    natural_freq_Hz: z.number().positive().optional(),
    stiffness_N_per_m: z.number().positive().optional(),
    damping_ratio: z.number().positive().optional(),
    specific_cutting_force_N_mm2: z.number().positive().optional(),
    rpm_min: z.number().positive().optional(),
    rpm_max: z.number().positive().optional(),
  }).passthrough(),
  harmonic_analyze: z.object({
    spindle_rpm: z.number().positive().optional(),
    num_flutes: z.number().int().positive().optional(),
    vibration_spectrum: z.array(z.object({
      freq_Hz: z.number(), amplitude_um: z.number(),
    })).optional(),
    threshold_um: z.number().positive().optional(),
  }).passthrough(),
  thread_mill_calc: z.object({
    thread_form: z.string().optional(),
    nominal_diameter_mm: z.number().positive().optional(),
    pitch_mm: z.number().positive().optional(),
    internal: z.boolean().optional(),
    direction: z.enum(["right_hand", "left_hand"]).optional(),
    thread_depth_mm: z.number().positive().optional(),
    thread_length_mm: z.number().positive().optional(),
    mill_approach: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    num_flutes: z.number().int().positive().optional(),
    spindle_rpm: z.number().positive().optional(),
  }).passthrough(),
  thread_mill_gcode: z.object({
    thread_form: z.string().optional(),
    nominal_diameter_mm: z.number().positive().optional(),
    pitch_mm: z.number().positive().optional(),
    internal: z.boolean().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    controller: z.enum(["fanuc", "siemens", "haas"]).optional(),
  }).passthrough(),
  gcode_opt_analyze: z.object({ gcode: z.string() }).passthrough(),
  gcode_opt_optimize: z.object({ gcode: z.string() }).passthrough(),
  gcode_opt_compare: z.object({
    gcode_a: z.string(), gcode_b: z.string(),
  }).passthrough(),
  probe_routine_generate: z.object({
    id: z.string().optional(),
    callout: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    feature_type: z.string().optional(),
    nominal: optDynamicRecord,
  }).passthrough(),
  probe_gdt_interpret: z.object({
    callout: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    datum_refs: z.array(z.string()).optional(),
  }).passthrough(),
  probe_report: z.object({
    id: z.string().optional(),
    callout: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    feature_type: z.string().optional(),
    measured: z.record(z.string(), z.number()).optional(),
  }).passthrough(),
  thermal_sim_predict: z.object({
    cutting_speed_mmin: z.number().positive().optional(),
    feed_mm: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
    iso_material_group: z.string().optional(),
    tool_material: z.string().optional(),
    coolant: z.string().optional(),
    operation: z.string().optional(),
  }).passthrough(),
  thermal_sim_validate: z.object({
    cutting_speed_mmin: z.number().positive().optional(),
    feed_mm: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
    iso_material_group: z.string().optional(),
    tool_material: z.string().optional(),
    coolant: z.string().optional(),
  }).passthrough(),
  thermal_sim_optimize: z.object({
    cutting_speed_mmin: z.number().positive().optional(),
    feed_mm: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
    iso_material_group: z.string().optional(),
    tool_material: z.string().optional(),
    coolant: z.string().optional(),
  }).passthrough(),

  // ── Batch 15: Specialty Processes ────────────────────────────
  hybrid_laser_calc: z.object({
    process: z.string().optional(),
    laser_power_W: z.number().positive().optional(),
    spot_diameter_mm: z.number().positive().optional(),
    workpiece_material: z.string().optional(),
    preheat_target_C: z.number().optional(),
    cutting_speed_m_per_min: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
  }).passthrough(),
  laser_cut_calc: z.object({
    laser_type: z.enum(["CO2", "fiber"]).optional(),
    power_W: z.number().positive().optional(),
    material: z.string().optional(),
    thickness_mm: z.number().positive().optional(),
    assist_gas: z.enum(["O2", "N2", "air", "argon"]).optional(),
    gas_pressure_bar: z.number().positive().optional(),
    focus_position_mm: z.number().optional(),
    nozzle_diameter_mm: z.number().positive().optional(),
  }).passthrough(),
  laser_mark_calc: z.object({
    laser_source: z.string().optional(),
    power_W: z.number().positive().optional(),
    mark_type: z.string().optional(),
    content_type: z.string().optional(),
    material: z.string().optional(),
    mark_area_mm2: z.number().positive().optional(),
    character_height_mm: z.number().positive().optional(),
    compliance_standard: z.string().optional(),
  }).passthrough(),
  waterjet_taper_calc: z.object({
    material: z.string().optional(),
    thickness_mm: z.number().positive().optional(),
    cutting_speed_mm_per_min: z.number().positive().optional(),
    pump_pressure_MPa: z.number().positive().optional(),
    orifice_diameter_mm: z.number().positive().optional(),
    mixing_tube_diameter_mm: z.number().positive().optional(),
    abrasive_flow_g_per_min: z.number().positive().optional(),
    standoff_mm: z.number().positive().optional(),
    target_quality: z.string().optional(),
    has_tilt_head: z.boolean().optional(),
  }).passthrough(),
  microstructure_analyze: z.object({
    material_class: z.string().optional(),
    grain_size_ASTM: z.number().int().min(1).max(14).optional(),
    hardness_HRC: z.number().min(0).optional(),
    phases: z.array(z.object({
      phase: z.string(), fraction_pct: z.number(),
    })).optional(),
    prior_processing: z.string().optional(),
    inclusion_rating: z.number().optional(),
  }).passthrough(),
  microstructure_recommend: z.object({
    material_class: z.string().optional(),
    grain_size_ASTM: z.number().int().min(1).max(14).optional(),
    hardness_HRC: z.number().min(0).optional(),
    phases: z.array(z.object({
      phase: z.string(), fraction_pct: z.number(),
    })).optional(),
  }).passthrough(),
  energy_analyze: z.object({
    operations: z.array(z.object({
      operation_name: z.string(),
      cutting_time_min: z.number().positive(),
      spindle_rpm: z.number().positive(),
      feed_rate_mmmin: z.number().positive(),
      depth_of_cut_mm: z.number().positive(),
      radial_depth_mm: z.number().positive(),
      tool_diameter_mm: z.number().positive(),
      material_iso_group: z.string(),
      coolant_active: z.boolean(),
    })).optional(),
    machine_power_kW: z.number().positive().optional(),
    electricity_cost_per_kWh: z.number().positive().optional(),
  }).passthrough(),
  energy_optimize: z.object({
    operations: z.array(z.object({
      operation_name: z.string(),
      cutting_time_min: z.number().positive(),
      spindle_rpm: z.number().positive(),
      feed_rate_mmmin: z.number().positive(),
      depth_of_cut_mm: z.number().positive(),
      radial_depth_mm: z.number().positive(),
      tool_diameter_mm: z.number().positive(),
      material_iso_group: z.string(),
      coolant_active: z.boolean(),
    })).optional(),
    machine_power_kW: z.number().positive().optional(),
  }).passthrough(),
  energy_compare: z.object({
    scenarios: z.array(z.object({
      name: z.string(),
      input: z.record(z.string(), z.unknown()),
    })).optional(),
  }).passthrough(),
  // ── ENGINE-WIRE-CALC/U-WIRE-CALC-SCE: SpecificCuttingEnergyEngine ──
  calc_specific_cutting_energy: z.object({
    // Method 1: force + chip geometry
    cutting_force_N: z.number().positive().optional(),
    chip_width_mm: z.number().positive().optional(),
    chip_thickness_mm: z.number().positive().optional(),
    // Method 2: Kienzle coefficients
    kc1_1: z.number().positive().optional(),
    mc: z.number().min(0).max(1).optional(),
    feed_mm: z.number().positive().optional(),
    // Common cutting context
    mrr_cm3_min: z.number().positive().optional(),
    cutting_speed_m_min: z.number().positive().optional(),
    depth_of_cut_mm: z.number().positive().optional(),
    width_of_cut_mm: z.number().positive().optional(),
    // Job context
    volume_to_remove_cm3: z.number().positive().optional(),
    machining_time_min: z.number().positive().optional(),
    machine_standby_power_kW: z.number().nonnegative().optional(),
    spindle_efficiency: z.number().gt(0).max(1).optional(),
    // Energy/sustainability
    electricity_cost_per_kWh: z.number().positive().optional(),
    energy_source: z.enum(["grid_average", "coal", "natural_gas", "nuclear", "renewable"]).optional(),
  }).passthrough(),
  kdtree_nearest: z.object({
    points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })),
    query_x: z.number(),
    query_y: z.number(),
    query_z: z.number(),
    k: z.number().int().positive().optional(),
  }).passthrough(),
  kdtree_radius: z.object({
    points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })),
    center_x: z.number(),
    center_y: z.number(),
    center_z: z.number(),
    radius: z.number().positive(),
  }).passthrough(),
  octree_radius: z.object({
    points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })),
    center_x: z.number(),
    center_y: z.number(),
    center_z: z.number(),
    radius: z.number().positive(),
    max_depth: z.number().int().positive().optional(),
    max_points: z.number().int().positive().optional(),
  }).passthrough(),
  voxelize_mesh: z.object({
    vertices: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })),
    faces: z.array(z.array(z.number().int())),
    resolution: z.number().int().positive().optional(),
  }).passthrough(),
  jacobian_5axis: z.object({
    config: z.enum(["BC", "AC"]),
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
    tool_length: z.number().optional(),
    threshold: z.number().positive().optional(),
  }).passthrough(),
  singularity_detect: z.object({
    config: z.enum(["BC", "AC"]),
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
    tool_length: z.number().optional(),
    threshold: z.number().positive().optional(),
  }).passthrough(),
  config_singularity_check: z.object({
    config: z.enum(["BC", "AC"]),
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
  }).passthrough(),

  // --- Industry Standards Compliance ---
  standards_check_compliance: z.object({
    industry: z.enum(["aerospace", "automotive", "medical", "general"]),
    standards: z.array(z.string()).optional(),
    part: z.object({
      material: z.string(),
      surface_finish_Ra_um: optPosNum,
      tolerances_mm: z.array(z.number().positive()).optional(),
      hardness_HRC: optPosNum,
      process: optStr,
    }).passthrough(),
  }).passthrough(),
  standards_get_requirements: z.object({
    industry: z.enum(["aerospace", "automotive", "medical", "general"]),
    process_type: z.string(),
  }).passthrough(),
  standards_suggest: z.object({
    material: z.string(),
    process: z.string(),
    application: optStr,
  }).passthrough(),

  // --- Testing Protocols ---
  test_protocol_tool_life: z.object({
    tool_type: z.enum(["HSS", "carbide", "ceramic", "CBN", "diamond"]),
    workpiece_material: z.string(),
    cutting_speed_range_mpm: z.tuple([z.number().positive(), z.number().positive()]),
    num_speed_points: z.number().int().positive().optional(),
  }).passthrough(),
  test_protocol_surface: z.object({
    process: z.string(),
    target_Ra_um: z.number().positive(),
    measurement_method: z.enum(["contact", "optical"]),
  }).passthrough(),
  test_protocol_dimensional: z.object({
    nominal_mm: z.number(),
    tolerance_mm: z.number().positive(),
    measurement_uncertainty_mm: z.number().positive(),
  }).passthrough(),

  // --- Certification Tracking ---
  cert_track_material: z.object({
    material: z.string(),
    heat_lot: z.string(),
    mill_cert_data: z.object({
      tensile_MPa: optPosNum,
      yield_MPa: optPosNum,
      elongation_pct: optPosNum,
      hardness: optNum,
    }).passthrough(),
    spec: z.string(),
  }).passthrough(),
  cert_track_tool: z.object({
    tool_id: z.string(),
    manufacturer: z.string(),
    grade: z.string(),
    coating: z.string(),
    batch: z.string(),
    inspection_date: z.string(),
  }).passthrough(),
  cert_track_machine: z.object({
    machine_id: z.string(),
    last_calibration: z.string(),
    calibration_interval_days: z.number().int().positive(),
    measurements: z.array(z.object({
      axis: z.string(),
      error_um: z.number(),
      spec_um: z.number().positive(),
    })).optional(),
  }).passthrough(),
  cert_audit_report: z.object({
    scope: z.enum(["material", "tool", "machine", "all"]),
  }).passthrough(),

  // ── STEP Import (RX-MS0 P3-U02) ──────────────────────────────────────────
  step_import: z.object({
    file_path: z.string().describe("Path to .step or .stp file"),
  }).passthrough(),
  step_analyze: z.object({
    file_path: z.string().describe("Path to .step or .stp file"),
  }).passthrough(),
  step_features: z.object({
    file_path: z.string().describe("Path to .step or .stp file"),
  }).passthrough(),
  step_wall_thickness: z.object({
    file_path: z.string().describe("Path to .step or .stp file"),
    ray_count: z.number().int().positive().optional().describe("Number of rays for thickness sampling (default 500)"),
  }).passthrough(),
  step_brep_summary: z.object({
    file_path: z.string().describe("Path to .step or .stp file"),
  }).passthrough(),

  // ── Physics Fusion (FUSION-3) ──
  physics_fusion: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
    kc1_1: z.number().positive().describe("Specific cutting force at h=1mm [N/mm²]"),
    mc: z.number().min(0).max(1).describe("Kienzle exponent"),
    tool_diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
    flutes: z.number().int().min(1).max(20).describe("Number of flutes"),
    cutting_speed_mpm: z.number().positive().describe("Cutting speed Vc [m/min]"),
    feed_per_tooth_mm: z.number().positive().describe("Feed per tooth fz [mm]"),
    spindle_rpm: z.number().positive().describe("Spindle speed [rev/min]"),
    axial_depth_mm: z.number().positive().describe("Axial depth ap [mm]"),
    radial_depth_mm: z.number().positive().describe("Radial depth ae [mm]"),
    fusion_tier: z.number().int().min(1).max(4).optional().describe("Fusion tier 1-4 (auto if omitted)"),
    tool_material: z.string().optional().describe("Tool material: carbide|hss|cermet|ceramic|cbn|pcd"),
    tool_stickout_mm: z.number().positive().optional().describe("Tool stickout [mm]"),
    corner_radius_mm: z.number().min(0).optional().describe("Corner radius [mm]"),
    tool_coating: z.string().optional().describe("Tool coating: TiAlN|TiN|..."),
    coolant_type: z.string().optional().describe("Coolant: flood|mist|MQL|dry|cryogenic"),
    machine_max_rpm: z.number().positive().optional().describe("Machine max RPM"),
    natural_frequency_hz: z.number().positive().optional().describe("System natural frequency [Hz]"),
    damping_ratio: z.number().min(0).max(1).optional().describe("System damping ratio"),
    system_stiffness_n_um: z.number().positive().optional().describe("System stiffness [N/µm]"),
    material: z.string().optional().describe("Material name for logging"),
  }).passthrough(),

  // ── Stochastic Chatter (StochasticChatterEngine) ──
  stochastic_chatter: z.object({
    material: z.string().optional().describe("Material name for Kc lookup (default: AISI 4140)"),
    speed_range_rpm: z.tuple([z.number().positive(), z.number().positive()]).optional().describe("Spindle speed range [min, max] RPM"),
    speed_points: z.number().int().positive().optional().describe("Speed resolution (number of grid points)"),
    depth_range_mm: z.tuple([z.number().positive(), z.number().positive()]).optional().describe("Depth range [min, max] mm"),
    depth_points: z.number().int().positive().optional().describe("Depth resolution (number of grid points)"),
    flute_count: z.number().int().min(1).optional().describe("Number of flutes"),
    tool_diameter_mm: z.number().positive().optional().describe("Tool diameter [mm]"),
    natural_freq_hz: z.number().positive().optional().describe("Natural frequency [Hz] (mean)"),
    damping_ratio: z.number().min(0).max(1).optional().describe("Damping ratio (mean)"),
    stiffness_nm: z.number().positive().optional().describe("Modal stiffness [N/m] (mean)"),
    modal_mass_kg: z.number().positive().optional().describe("Modal mass [kg]"),
    process_damping_coeff: z.number().min(0).optional().describe("Process damping coefficient (mean)"),
    n_trials: z.number().int().positive().optional().describe("Number of Monte Carlo trials per grid point"),
    contour_levels: z.array(z.number().min(0).max(1)).optional().describe("Probability thresholds for contour extraction"),
  }).passthrough(),

  // ── Stochastic Cutting Force (StochasticCuttingForceEngine) ──
  stochastic_force: z.object({
    material: optStr.describe("Material name/ISO group for Kc lookup (default: AISI 4140)"),
    material_id: optStr.describe("Material ID alias"),
    depth_mm: optPosNum.describe("Axial depth of cut [mm]"),
    axial_depth: optPosNum.describe("Alias for depth_mm"),
    feed_mm: optPosNum.describe("Feed per tooth [mm]"),
    feed_per_tooth: optPosNum.describe("Alias for feed_mm"),
    width_mm: optPosNum.describe("Width/radial depth of cut [mm]"),
    radial_depth: optPosNum.describe("Alias for width_mm"),
    tool_diameter_mm: optPosNum.describe("Tool diameter [mm]"),
    tool_diameter: optPosNum.describe("Alias for tool_diameter_mm"),
    flute_count: z.number().int().min(1).optional().describe("Number of cutting edges"),
    number_of_teeth: z.number().int().min(1).optional().describe("Alias for flute_count"),
    rake_angle_deg: optNum.describe("Rake angle [deg]"),
    edge_radius_um: optPosNum.describe("Edge hone radius [µm]"),
    runout_um: optNum.describe("Tool runout TIR [µm]"),
    n_trials: z.number().int().positive().optional().describe("Monte Carlo sample count"),
    mc_samples: z.number().int().positive().optional().describe("Alias for n_trials"),
    method: z.enum(["mc", "fosm", "both"]).optional().describe("Stochastic method (default: both)"),
    overrides: z.record(z.string(), z.number()).optional().describe("Manual scatter overrides for kc1_1, mc, yield, friction"),
  }).passthrough(),

  // ── Stochastic Deflection (StochasticDeflectionEngine) ──
  stochastic_deflection: z.object({
    cutting_force_N: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).describe("Cutting force [N] — scalar or {mean, cv_pct}"),
    tool_diameter_mm: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Tool diameter [mm] — scalar or uncertain"),
    tool_diameter: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Alias for tool_diameter_mm"),
    overhang_mm: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Tool overhang [mm] — scalar or uncertain"),
    tool_stickout_mm: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Alias for overhang_mm"),
    youngs_modulus_GPa: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Young's modulus [GPa] — scalar or uncertain"),
    youngs_modulus: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Alias for youngs_modulus_GPa"),
    num_flutes: z.number().int().min(1).optional().describe("Number of flutes"),
    flute_count: z.number().int().min(1).optional().describe("Alias for num_flutes"),
    radial_engagement_mm: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Radial engagement [mm] for surface error"),
    runout_um: optNum.describe("Tool runout TIR [µm]"),
    deflection_limit_um: optPosNum.describe("Target deflection limit [µm] (default: 25)"),
    mc_samples: z.number().int().positive().optional().describe("Monte Carlo sample count"),
    n_trials: z.number().int().positive().optional().describe("Alias for mc_samples"),
    confidence_pct: z.number().min(50).max(99.9).optional().describe("Confidence level [%] (default: 95)"),
    coverage_pct: z.number().min(50).max(99.9).optional().describe("Coverage level [%] (default: 99)"),
  }).passthrough(),

  // ── Stochastic Thermal (StochasticThermalEngine) ──
  stochastic_thermal: z.object({
    material: optStr.describe("Material name for thermal property lookup (default: AISI 4140)"),
    material_id: optStr.describe("Material ID alias"),
    cutting_speed_mpm: optPosNum.describe("Cutting speed [m/min]"),
    cutting_speed: optPosNum.describe("Alias for cutting_speed_mpm"),
    feed_mm: optPosNum.describe("Feed per tooth [mm]"),
    feed_per_tooth: optPosNum.describe("Alias for feed_mm"),
    depth_mm: optPosNum.describe("Axial depth of cut [mm]"),
    axial_depth: optPosNum.describe("Alias for depth_mm"),
    width_mm: optPosNum.describe("Width/radial depth of cut [mm]"),
    radial_depth: optPosNum.describe("Alias for width_mm"),
    tool_diameter_mm: optPosNum.describe("Tool diameter [mm]"),
    tool_diameter: optPosNum.describe("Alias for tool_diameter_mm"),
    coolant_type: z.enum(["flood", "mql", "dry", "cryogenic"]).optional().describe("Coolant delivery type (default: flood)"),
    coating: z.enum(["TiAlN", "TiN", "AlCrN", "uncoated", "diamond"]).optional().describe("Tool coating type"),
    coating_max_temp_c: optPosNum.describe("Coating temperature limit [deg C]"),
    n_trials: z.number().int().positive().optional().describe("Monte Carlo sample count"),
    mc_samples: z.number().int().positive().optional().describe("Alias for n_trials"),
    method: z.enum(["mc", "fosm", "both"]).optional().describe("Stochastic method (default: both)"),
  }).passthrough(),

  // ── Stochastic Tool Wear (StochasticToolWearEngine, Weibull) ──
  stochastic_wear: z.object({
    cutting_speed: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Cutting speed [m/min] — scalar or {mean, cv_pct}"),
    feed_rate: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Feed rate [mm/rev] — scalar or uncertain"),
    depth_of_cut: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Depth of cut [mm] — scalar or uncertain"),
    taylor_n: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Taylor exponent n — scalar or uncertain"),
    taylor_C: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Taylor constant C — scalar or uncertain"),
    taylor_a: z.union([z.number(), z.object({ mean: z.number(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Extended Taylor feed exponent"),
    taylor_b: z.union([z.number(), z.object({ mean: z.number(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Extended Taylor depth exponent"),
    coating_thickness_um: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Coating thickness [µm] — uncertain"),
    hardness_HRC: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Workpiece hardness [HRC] — uncertain"),
    contact_temp_C: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Contact temperature [deg C] for Usui model"),
    usui_A: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Usui wear constant A"),
    usui_B: z.union([z.number().positive(), z.object({ mean: z.number().positive(), cv_pct: z.number().min(0) }).passthrough()]).optional().describe("Usui wear constant B"),
    wear_limit_mm: optPosNum.describe("Flank wear limit VB [mm] (default: 0.3)"),
    mc_samples: z.number().int().positive().optional().describe("Monte Carlo sample count"),
    n_trials: z.number().int().positive().optional().describe("Alias for mc_samples"),
    compute_sobol: optBool.describe("Compute Sobol sensitivity indices (slower)"),
    observed_wear_data: z.array(z.object({ time_min: z.number().min(0), wear_mm: z.number().min(0) })).optional().describe("Observed wear data for Bayesian updating"),
  }).passthrough(),

  // ── ENGINE-WIRE-MS0/U-WIRE02: orphan-action backfill ─────────────
  // ── Stochastic Dimensional (StochasticDimensionalEngine.simulate) ──
  stochastic_dimension: z.object({
    nominal_mm: posNum.describe("Nominal dimension [mm]"),
    usl_mm: posNum.describe("Upper spec limit [mm]"),
    lsl_mm: posNum.describe("Lower spec limit [mm]"),
    machine_repeatability_um: optPosNum.describe("Machine positioning repeatability (2σ) [µm]"),
    machine_accuracy_um: optPosNum.describe("Machine positioning accuracy (systematic) [µm]"),
    thermal_coeff_um_per_C: optPosNum.describe("Thermal expansion coefficient α [µm/°C]"),
    ambient_temp_amplitude_C: optPosNum.describe("Sinusoidal ambient temperature amplitude [°C]"),
    thermal_cycle_hours: optPosNum.describe("Thermal cycle period [h]"),
    wear_rate_um_per_part: optPosNum.describe("Progressive wear-driven dimensional shift [µm/part]"),
    tool_change_interval: z.number().int().positive().optional().describe("Parts between tool changes"),
    wear_compensation_interval: z.number().int().positive().optional().describe("Parts between offset updates"),
    cutting_force_N: optPosNum.describe("Cutting force [N] for deflection coupling"),
    force_cv_pct: z.number().min(0).optional().describe("Force coefficient of variation [%]"),
    tool_stiffness_N_per_um: optPosNum.describe("Tool stiffness [N/µm]"),
    fixture_repeatability_um: optPosNum.describe("Fixture repeatability [µm]"),
    spindle_runout_um: optPosNum.describe("Spindle runout TIR [µm]"),
    hardness_cv_pct: z.number().min(0).optional().describe("Hardness coefficient of variation [%]"),
    hardness_force_sensitivity: optPosNum.describe("Force sensitivity to hardness dF/dHRC [N/HRC]"),
    gage_rr_um: optPosNum.describe("Gauge R&R uncertainty [µm]"),
    production_qty: z.number().int().positive().optional().describe("Production run size [parts]"),
    mc_samples_per_part: z.number().int().positive().optional().describe("Monte Carlo samples per part"),
    spc_subgroup_size: z.number().int().positive().optional().describe("SPC subgroup size"),
  }).passthrough(),

  // ── Stochastic Surface Finish (StochasticSurfaceFinishEngine.compute) ──
  stochastic_finish: z.object({
    material: z.string().min(1).describe("Material designation, e.g. 'Ti-6Al-4V', 'AISI 4140'"),
    feed_mm: posNum.describe("Feed per rev (turning) or per tooth (milling) [mm]"),
    tool_nose_radius_mm: posNum.describe("Tool nose radius [mm]"),
    cutting_speed_mpm: posNum.describe("Cutting speed Vc [m/min]"),
    operation: z.enum(["turning", "milling"]).optional().describe("Operation type (default: turning)"),
    tool_diameter_mm: optPosNum.describe("Tool diameter [mm] (milling)"),
    flute_count: z.number().int().positive().optional().describe("Number of flutes (milling)"),
    runout_um: optPosNum.describe("Radial runout [µm] (default 5)"),
    damping_ratio: z.number().min(0).max(1).optional().describe("Damping ratio ζ (default 0.03)"),
    natural_freq_hz: optPosNum.describe("Natural frequency [Hz] (default 800)"),
    depth_mm: optPosNum.describe("Depth of cut [mm]"),
    width_mm: optPosNum.describe("Width of cut [mm]"),
    vb_mm: z.number().min(0).optional().describe("Current flank wear VB [mm] (default 0)"),
    target_ra_um: optPosNum.describe("Target Ra for Cpk calculation [µm]"),
    n_trials: z.number().int().positive().optional().describe("Monte Carlo trials (default 2000)"),
    method: z.enum(["mc", "fosm", "both"]).optional().describe("Propagation method (default 'both')"),
  }).passthrough(),

  // ── Stochastic Tool Life (StochasticToolLifeEngine.compute, Weibull/Wiener/Bayes) ──
  stochastic_tool_life: z.object({
    material: z.string().min(1).describe("Material designation"),
    cutting_speed_mpm: posNum.describe("Cutting speed Vc [m/min]"),
    feed_mm: posNum.describe("Feed [mm/rev or mm/tooth]"),
    depth_mm: posNum.describe("Depth of cut [mm]"),
    tool_material: z.enum(["carbide", "ceramic", "cbn", "hss"]).optional().describe("Tool material (default carbide)"),
    coating: z.enum(["TiAlN", "TiN", "AlCrN", "uncoated", "diamond"]).optional().describe("Tool coating"),
    wear_limit_mm: optPosNum.describe("Flank wear limit VB [mm] (default 0.3)"),
    n_trials: z.number().int().positive().optional().describe("Monte Carlo trials"),
    observed_wear: z.array(z.object({
      time_min: z.number().min(0),
      wear_mm: z.number().min(0),
    }).passthrough()).optional().describe("Observed wear samples for Bayesian update"),
    target_time_min: optPosNum.describe("Target service time for reliability calc [min]"),
    method: z.enum(["weibull", "wiener", "bayesian", "all"]).optional().describe("Stochastic method (default 'all')"),
  }).passthrough(),

  // ── Chip Thinning Compensation (ChipThinningCompensationEngine.calculate) ──
  chip_thinning_compensation: z.object({
    feed_per_tooth_mm: posNum.describe("Programmed feed per tooth fz [mm]"),
    radial_engagement_mm: posNum.describe("Radial engagement ae [mm]"),
    tool_diameter_mm: posNum.describe("Tool diameter D [mm]"),
    axial_depth_mm: optPosNum.describe("Axial depth ap [mm] (informational)"),
    max_compensation_factor: optPosNum.describe("Cap on compensation multiplier (default 2.0)"),
    min_engagement_pct: z.number().min(0).max(100).optional().describe("Minimum engagement % below which compensation is limited (default 5)"),
  }).passthrough(),

  // ── Thermal Compensation Model (ThermalCompensationModelEngine) ──
  thermal_compensation_model: z.object({
    machine_type: z.enum(["vmc", "hmc", "5axis"]).optional().describe("Machine type (default: vmc)"),
    spindle_bore_mm: optPosNum.describe("Spindle bore diameter [mm]"),
    column_height_mm: optPosNum.describe("Column height [mm]"),
    bed_length_mm: optPosNum.describe("Bed length [mm]"),
    spindle_material: z.enum(["steel", "cast_iron"]).optional().describe("Spindle material"),
    has_thermal_compensation: optBool.describe("Machine has built-in thermal compensation"),
    spindle_rpm: optPosNum.describe("Spindle speed [RPM]"),
    spindle_power_kw: optPosNum.describe("Spindle power [kW]"),
    cycle_time_min: optPosNum.describe("Machining cycle time [min]"),
    coolant_temp_c: optNum.describe("Coolant temperature [deg C]"),
    ambient_temp_c: optNum.describe("Ambient shop temperature [deg C]"),
    tolerance_mm: optPosNum.describe("Part tolerance [mm]"),
    critical_axis: z.enum(["X", "Y", "Z"]).optional().describe("Critical dimension axis (default: Z)"),
    feature_position_mm: optPosNum.describe("Feature distance from spindle center [mm]"),
    machine: z.object({
      type: z.enum(["vmc", "hmc", "5axis"]).optional(),
      spindle_bore_mm: optPosNum,
      column_height_mm: optPosNum,
      bed_length_mm: optPosNum,
      spindle_material: z.enum(["steel", "cast_iron"]).optional(),
      has_thermal_compensation: optBool,
    }).optional().describe("Nested machine spec (alternative to flat params)"),
    cutting: z.object({
      spindle_rpm: optPosNum,
      spindle_power_kw: optPosNum,
      cycle_time_min: optPosNum,
      coolant_temp_c: optNum,
      ambient_temp_c: optNum,
    }).optional().describe("Nested cutting spec (alternative to flat params)"),
    part: z.object({
      tolerance_mm: optPosNum,
      critical_axis: z.enum(["X", "Y", "Z"]).optional(),
      feature_position_mm: optPosNum,
    }).optional().describe("Nested part spec (alternative to flat params)"),
  }).passthrough(),

  // ── Force Capability Analyze (single operation, ForceCapabilityEngine) ──
  force_capability_analyze: z.object({
    machine: z.object({
      max_power_kw: z.number().positive().describe("Machine max spindle power [kW]"),
      max_torque_Nm: z.number().positive().describe("Machine max spindle torque [Nm]"),
      max_rpm: z.number().positive().describe("Machine max RPM"),
      max_thrust_N: z.number().positive().optional().describe("Max axis thrust force [N]"),
      spindle_taper: z.string().optional().describe("Spindle taper (e.g. BT40, HSK-A63)"),
      rigidity: z.enum(["low", "medium", "high"]).optional().describe("Machine rigidity class"),
    }).passthrough().describe("Machine capability specification"),
    operation: z.object({
      id: z.string().describe("Operation identifier"),
      type: z.string().describe("Operation type"),
      tool_diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
      flutes: z.number().int().min(1).describe("Number of flutes"),
      depth_mm: z.number().positive().describe("Depth of cut [mm]"),
      width_mm: z.number().positive().optional().describe("Width of cut [mm]"),
      cutting_speed_mpm: z.number().positive().describe("Cutting speed [m/min]"),
      feed_per_tooth_mm: z.number().positive().describe("Feed per tooth [mm]"),
      material_kc1_1: z.number().positive().describe("Specific cutting force kc1.1 [N/mm²]"),
      material_mc: z.number().min(0).max(1).describe("Kienzle exponent mc"),
      tool_stickout_mm: z.number().positive().optional().describe("Tool stickout [mm]"),
      clamp_force_N: z.number().positive().optional().describe("Workholding clamp force [N]"),
      elapsed_cutting_time_min: z.number().min(0).optional().describe("Elapsed cutting time [min]"),
      tool_life_min: z.number().positive().optional().describe("Expected tool life [min]"),
    }).passthrough().describe("Operation force input"),
    elapsed_cutting_time_min: z.number().min(0).optional().describe("Elapsed cutting time for thermal context [min]"),
  }).passthrough(),

  // ── Force Capability Check Sequence (multi-op, ForceCapabilityEngine) ──
  force_capability_check_sequence: z.object({
    machine: z.object({
      max_power_kw: z.number().positive().describe("Machine max spindle power [kW]"),
      max_torque_Nm: z.number().positive().describe("Machine max spindle torque [Nm]"),
      max_rpm: z.number().positive().describe("Machine max RPM"),
      max_thrust_N: z.number().positive().optional().describe("Max axis thrust force [N]"),
      spindle_taper: z.string().optional().describe("Spindle taper"),
      rigidity: z.enum(["low", "medium", "high"]).optional().describe("Machine rigidity class"),
    }).passthrough().describe("Machine capability specification"),
    operations: z.array(z.object({
      id: z.string().describe("Operation identifier"),
      type: z.string().describe("Operation type"),
      tool_diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
      flutes: z.number().int().min(1).describe("Number of flutes"),
      depth_mm: z.number().positive().describe("Depth of cut [mm]"),
      width_mm: z.number().positive().optional().describe("Width of cut [mm]"),
      cutting_speed_mpm: z.number().positive().describe("Cutting speed [m/min]"),
      feed_per_tooth_mm: z.number().positive().describe("Feed per tooth [mm]"),
      material_kc1_1: z.number().positive().describe("Specific cutting force kc1.1 [N/mm²]"),
      material_mc: z.number().min(0).max(1).describe("Kienzle exponent mc"),
      tool_stickout_mm: z.number().positive().optional().describe("Tool stickout [mm]"),
      clamp_force_N: z.number().positive().optional().describe("Workholding clamp force [N]"),
      elapsed_cutting_time_min: z.number().min(0).optional().describe("Elapsed cutting time [min]"),
      tool_life_min: z.number().positive().optional().describe("Expected tool life [min]"),
    }).passthrough()).min(1).describe("Array of operations to check sequentially"),
  }).passthrough(),

  // ── Filter Press (process engineering) ──
  filter_press_calc: z.object({
    slurry_flow_m3_h: z.number().positive().describe("Slurry flow rate [m³/h]"),
    solids_concentration_pct: z.number().min(0).max(100).optional().describe("Solids concentration [%] (default 10)"),
    cake_moisture_target_pct: z.number().min(0).max(100).optional().describe("Target cake moisture [%] (default 30)"),
    filter_type: z.enum(["plate_frame", "membrane", "belt", "rotary_drum"]).optional().describe("Filter press type"),
    operating_pressure_bar: z.number().positive().optional().describe("Operating pressure [bar] (default 7)"),
    plate_size_mm: z.number().positive().optional().describe("Plate size [mm] (auto if omitted)"),
    filtrate_viscosity_cP: z.number().positive().optional().describe("Filtrate viscosity [cP] (default 1)"),
    specific_resistance_m_kg: z.number().positive().optional().describe("Specific cake resistance [m/kg] (default 1e11)"),
  }).passthrough(),

  // ── Inventory-Aware Tool Selection ──
  inventory_tool_select: z.object({
    features: z.array(z.object({
      id: z.string().describe("Feature ID"),
      type: z.enum(["hole", "pocket", "slot", "face", "contour", "thread", "counterbore", "countersink", "chamfer", "drill", "bore", "ream"]).describe("Feature type"),
      diameter_mm: z.number().positive().optional().describe("Feature diameter [mm]"),
      width_mm: z.number().positive().optional().describe("Feature width [mm]"),
      depth_mm: z.number().positive().optional().describe("Feature depth [mm]"),
      length_mm: z.number().positive().optional().describe("Feature length [mm]"),
      tolerance_mm: z.number().positive().optional().describe("Tolerance [mm]"),
      surface_finish_Ra: z.number().positive().optional().describe("Required surface finish Ra [um]"),
      material: z.string().optional().describe("Workpiece material"),
    }).passthrough()).describe("Part features to match tools for"),
    inventory: z.array(z.object({
      id: z.string().describe("Tool ID"),
      type: z.enum(["endmill", "drill", "tap", "reamer", "insert", "boring_bar", "face_mill"]).describe("Tool type"),
      diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
      flutes: z.number().int().min(1).optional().describe("Number of flutes"),
      material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).describe("Tool material"),
      coating: z.string().optional().describe("Coating type"),
      max_depth_mm: z.number().positive().optional().describe("Max depth of cut [mm]"),
      corner_radius_mm: z.number().min(0).optional().describe("Corner radius [mm]"),
      condition: z.enum(["new", "good", "worn", "needs_regrind", "retired"]).describe("Tool condition"),
      magazine_position: z.number().int().positive().optional().describe("Magazine slot number"),
      holder_type: z.string().optional().describe("Holder type"),
      notes: z.string().optional().describe("Additional notes"),
    }).passthrough()).describe("User tool inventory"),
  }).passthrough(),

  tool_roi_analysis: z.object({
    feature: z.object({
      type: z.enum(["hole", "pocket", "slot", "face", "contour", "thread", "bore", "drill", "chamfer"]).describe("Feature type"),
      dimensions: z.object({
        diameter_mm: z.number().positive().optional().describe("Feature diameter [mm]"),
        width_mm: z.number().positive().optional().describe("Feature width [mm]"),
        depth_mm: z.number().positive().optional().describe("Feature depth [mm]"),
        length_mm: z.number().positive().optional().describe("Feature length [mm]"),
      }).passthrough(),
      tolerance_mm: z.number().positive().describe("Required tolerance [mm]"),
      surface_finish_Ra: z.number().positive().optional().describe("Required surface finish Ra [um]"),
    }).passthrough(),
    material: z.object({
      iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
      name: z.string().describe("Material name"),
      kc1_1: z.number().positive().optional().describe("Specific cutting force [N/mm^2]"),
      mc: z.number().positive().optional().describe("Kienzle exponent"),
    }).passthrough(),
    machine: z.object({
      max_rpm: z.number().positive().describe("Maximum spindle speed [rpm]"),
      max_power_kw: z.number().positive().describe("Maximum machine power [kW]"),
      machine_rate_per_hour: z.number().positive().optional().describe("Shop machine rate [USD/hr]"),
    }).passthrough(),
    current_tool: z.object({
      id: z.string().describe("Current tool ID"),
      name: z.string().describe("Current tool label"),
      price: z.number().nonnegative().describe("Current tool replacement price [USD]"),
      condition: z.enum(["new", "good", "worn", "needs_regrind"]).describe("Current tool condition"),
    }).optional(),
    user_inventory: z.array(z.object({
      id: z.string().describe("Inventory tool ID"),
      name: z.string().describe("Inventory tool label"),
      type: z.enum(["endmill", "drill", "tap", "reamer", "insert", "boring_bar", "face_mill"]).describe("Tool type"),
      diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
      flutes: z.number().int().min(1).optional().describe("Number of flutes"),
      material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).describe("Tool substrate"),
      coating: z.string().optional().describe("Coating"),
      max_depth_mm: z.number().positive().optional().describe("Maximum cutting depth [mm]"),
      corner_radius_mm: z.number().min(0).optional().describe("Corner radius [mm]"),
      condition: z.enum(["new", "good", "worn", "needs_regrind", "retired"]).describe("Tool condition"),
      price: z.number().nonnegative().describe("Tool replacement price [USD]"),
    }).passthrough()).optional().describe("Known on-hand tool inventory"),
    optimization_goal: z.enum(["cost", "performance", "balanced"]).default("balanced").describe("Recommendation posture"),
  }).passthrough(),

  // ============================================================================
  // SCIMATH-MS0: Core Linear Algebra & Matrix Methods (12 actions)
  // ============================================================================

  svd_decompose: z.object({
    matrix: z.array(z.array(z.number())).describe("Input matrix (m×n)"),
    rank: z.number().int().positive().optional().describe("Truncated rank k (optional, keeps top k singular values)"),
  }).passthrough(),

  qr_factorize: z.object({
    matrix: z.array(z.array(z.number())).describe("Input matrix (m×n)"),
    pivoting: optBool.describe("Use column pivoting for rank-revealing QR"),
    method: z.enum(["householder", "pivoted"]).optional().describe("QR method (householder default, pivoted for rank-revealing)"),
    thin: optBool.describe("Thin/economy QR (m×n Q instead of m×m)"),
  }).passthrough(),

  cholesky_factor: z.object({
    matrix: z.array(z.array(z.number())).describe("Symmetric positive-definite matrix (n×n)"),
    variant: z.enum(["ll", "ldlt", "incomplete"]).default("ll").describe("Factorization variant: ll (LL^T), ldlt (LDL^T), incomplete"),
  }).passthrough(),

  eigen_solve: z.object({
    matrix: z.array(z.array(z.number())).describe("Input matrix (n×n, symmetric for QR/Lanczos)"),
    method: z.enum(["qr", "power", "lanczos", "generalized"]).default("qr").describe("Eigenvalue algorithm"),
    B: z.array(z.array(z.number())).optional().describe("Mass matrix for generalized eigenvalue problem K*x=λ*B*x"),
    maxIterations: z.number().int().positive().optional().describe("Maximum iterations"),
    tolerance: z.number().positive().optional().describe("Convergence tolerance"),
  }).passthrough(),

  sparse_solve: z.object({
    matrix: z.array(z.array(z.number())).optional().describe("Dense matrix for ordering analysis"),
    csr: z.object({
      values: z.array(z.number()),
      colIndices: z.array(z.number().int()),
      rowPointers: z.array(z.number().int()),
      n: z.number().int().positive(),
    }).optional().describe("CSR sparse matrix"),
  }).passthrough(),

  iterative_solve: z.object({
    A: z.array(z.array(z.number())).optional().describe("Coefficient matrix (n×n)"),
    matrix: z.array(z.array(z.number())).optional().describe("Alias for A"),
    b: z.array(z.number()).describe("Right-hand side vector (n)"),
    method: z.enum(["cg", "bicgstab", "gmres"]).default("cg").describe("Solver method (cg=SPD, bicgstab=nonsymmetric, gmres=general)"),
    tolerance: z.number().positive().optional().describe("Convergence tolerance"),
    maxIterations: z.number().int().positive().optional().describe("Maximum iterations"),
  }).passthrough(),

  matrix_norms: z.object({
    matrix: z.array(z.array(z.number())).describe("Input matrix (m×n)"),
  }).passthrough(),

  matrix_factorize: z.object({
    matrix: z.array(z.array(z.number())).describe("Input matrix"),
    method: z.enum(["lu", "nmf", "exp", "kronecker"]).default("lu").describe("Factorization method"),
    B: z.array(z.array(z.number())).optional().describe("Second matrix for Kronecker product"),
    rank: z.number().int().positive().optional().describe("NMF target rank"),
    maxIterations: z.number().int().positive().optional().describe("NMF max iterations"),
  }).passthrough(),

  tensor_stress_invariants: z.object({
    sigma: z.array(z.array(z.number())).describe("3×3 stress tensor [σxx,σxy,σxz; σyx,σyy,σyz; σzx,σzy,σzz] in MPa"),
  }).passthrough(),

  system_identify: z.object({
    method: z.enum(["rls", "tls", "n4sid"]).default("rls").describe("Identification method"),
    Phi: z.array(z.array(z.number())).optional().describe("Regressor matrix for RLS (n×p)"),
    A: z.array(z.array(z.number())).optional().describe("Coefficient matrix for TLS"),
    y: z.array(z.number()).optional().describe("Output vector"),
    u: z.array(z.number()).optional().describe("Input signal for N4SID"),
    b: z.array(z.number()).optional().describe("RHS vector for TLS"),
    forgettingFactor: z.number().min(0).max(1).optional().describe("RLS forgetting factor (0.95-0.999 typical)"),
    order: z.number().int().positive().optional().describe("State-space model order for N4SID"),
  }).passthrough(),

  robust_regression: z.object({
    X: z.array(z.array(z.number())).describe("Feature matrix (n×p)"),
    y: z.array(z.number()).describe("Response vector (n)"),
    method: z.enum(["ols", "ridge", "lasso", "elastic_net", "huber", "ransac"]).default("ols").describe("Regression method"),
    lambda: z.number().nonnegative().optional().describe("Regularization strength for ridge/lasso/elastic_net"),
    alpha: z.number().min(0).max(1).optional().describe("L1/L2 mixing ratio for elastic_net (0=ridge, 1=lasso)"),
    delta: z.number().positive().optional().describe("Huber threshold"),
    maxTrials: z.number().int().positive().optional().describe("RANSAC max random trials"),
    inlierThreshold: z.number().positive().optional().describe("RANSAC inlier threshold"),
  }).passthrough(),

  random_matrix_noise_floor: z.object({
    eigenvalues: z.array(z.number()).describe("Sample eigenvalues (sorted descending)"),
    p: z.number().int().positive().describe("Number of variables (columns)"),
    n: z.number().int().positive().describe("Number of observations (rows)"),
    alpha: z.number().min(0).max(1).optional().describe("Significance level (default 0.05)"),
  }).passthrough(),
  // ── PHYSICS-WIRE-MS0: 27 actions wiring 11 previously unwired physics engines ──
  clamping_force_calc: z.object({}).passthrough().describe("Clamping force calculation (full)"),
  clamping_force_quick: z.object({}).passthrough().describe("Clamping force quick estimate"),
  cross_phys_upqi: z.object({}).passthrough().describe("Unified process quality index (cross-physics coupling)"),
  cross_phys_tool_life: z.object({}).passthrough().describe("Coupled tool life (thermal+wear+force)"),
  cross_phys_surface: z.object({}).passthrough().describe("Multi-source surface finish prediction"),
  cross_phys_stability: z.object({}).passthrough().describe("Process stability margin (multi-physics)"),
  cross_phys_tool_change: z.object({}).passthrough().describe("Optimal tool change point"),
  cross_phys_thermal_error: z.object({}).passthrough().describe("Thermal/geometric error budget"),
  cross_phys_energy_eff: z.object({}).passthrough().describe("Cutting energy efficiency"),
  cross_phys_dyn_stiffness: z.object({}).passthrough().describe("Dynamic process stiffness"),
  face_driver_analyze: z.object({}).passthrough().describe("Face driver torque analysis"),
  face_driver_penetration: z.object({}).passthrough().describe("Face driver penetration recommendation"),
  mdof_stability: z.object({}).passthrough().describe("MDOF chatter stability (modal analysis)"),
  mdof_stability_eigen: z.object({}).passthrough().describe("MDOF stability via eigenvalue method"),
  mdof_compare_sdof: z.object({}).passthrough().describe("MDOF vs SDOF stability comparison"),
  machine_force_limit_validate: z.object({}).passthrough().describe("Machine force-limit full validation"),
  machine_force_limit_quick: z.object({}).passthrough().describe("Machine force-limit quick check"),
  timoshenko_deflect: z.object({}).passthrough().describe("Timoshenko beam deflection (shear-corrected)"),
  timoshenko_multi_section: z.object({}).passthrough().describe("Timoshenko multi-section deflection"),
  timoshenko_compare: z.object({}).passthrough().describe("Timoshenko vs Euler-Bernoulli comparison"),
  timoshenko_max_ld: z.object({
    diameter_mm: z.number().positive().describe("Tool diameter (mm)"),
    material_E_GPa: z.number().positive().describe("Young's modulus (GPa)"),
    cutting_force_N: z.number().positive().describe("Cutting force (N)"),
    max_deflection_mm: z.number().positive().describe("Maximum allowable deflection (mm)"),
  }).passthrough().describe("Max L/D ratio under deflection limit"),
  goal_stability_observe: z.object({}).passthrough().describe("Record a goal observation (stability verifier)"),
  goal_stability_analyze: z.object({}).passthrough().describe("Analyze goal stability history"),
  session_stability_report: z.object({}).passthrough().describe("Session stability full report (Lyapunov)"),
  session_stability_lyapunov: z.object({}).passthrough().describe("Session Lyapunov analysis"),
  tribal_playbook_validate: z.object({}).passthrough().describe("Validate machining params against tribal playbook"),
  tribal_playbook_ranges: z.object({
    material: z.string().describe("Material name or ISO group"),
  }).passthrough().describe("Get recommended parameter ranges for material"),
  tribal_playbook_guidance: z.object({
    query: z.string().describe("Search query"),
    material: z.string().optional(),
    operation: z.string().optional(),
  }).passthrough().describe("Search tribal playbook guidance"),
  // ── ENGINE-WIRE-MS0/U-WIRE09: 5 leaf physics engines ──
  engagement_dynamics_calc: z.object({
    segment: z.object({
      id: z.string().describe("Segment identifier"),
      points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough()).min(1).describe("Toolpath points (Cartesian, may be zero or negative)"),
      type: z.enum(["linear", "arc", "helix", "rapid"]).describe("Segment type"),
      toolDiameter: posNum.describe("Tool diameter (mm)"),
      depthOfCut: posNum.describe("Axial depth of cut (mm)"),
    }).passthrough().describe("Toolpath segment"),
    feed_per_tooth: optPosNum.describe("Feed per tooth (mm)"),
    flutes: optPosNum.describe("Number of flutes"),
  }).passthrough().describe("Calculate engagement profile for a toolpath segment"),
  engagement_optimize_adapter: z.object({
    decision_point: z.string().describe("Decision point identifier (e.g. p2p.engagement_optimize)"),
    operation_type: z.enum(["milling_rough", "milling_finish", "turning", "drilling"]).describe("Operation type"),
    tool_diameter_mm: posNum.describe("Tool diameter (mm)"),
    stock_depth_mm: posNum.describe("Stock depth to remove axially (mm)"),
    stock_width_mm: optPosNum.describe("Stock width to remove radially (mm)"),
    fz_mm: optPosNum.describe("Feed per tooth / rev (mm)"),
    rpm: optPosNum.describe("Spindle RPM"),
    flute_count: optPosNum.describe("Flute count"),
    kc1_1: optPosNum.describe("Material Kienzle kc1.1 (N/mm²)"),
    mc: optNum.describe("Material mc exponent"),
    machine_torque_limit_nm: optPosNum.describe("Machine torque limit (N·m)"),
    stick_out_mm: optPosNum.describe("Tool stick-out (mm)"),
    youngs_modulus_gpa: optPosNum.describe("Young's modulus (GPa)"),
    ap_critical_chatter_mm: optPosNum.describe("Chatter-lobe critical ap (mm)"),
    objective: z.enum(["speed", "quality", "cost", "balanced", "tool_life"]).optional().describe("Optimization objective"),
  }).passthrough().describe("Physics-backed ae/ap engagement optimization via pipeline orchestrator"),
  cutting_fluid_lifecycle_calc: z.object({
    initial_concentration_pct: posNum.describe("Initial coolant concentration (%)"),
    sump_volume_L: posNum.describe("Sump volume (liters)"),
    coolant_type: z.enum(["semisynthetic", "synthetic", "soluble_oil", "straight_oil"]).describe("Coolant type"),
    target_min_pct: optPosNum.describe("Target minimum concentration (%)"),
    target_max_pct: optPosNum.describe("Target maximum concentration (%)"),
    machine_hours_per_day: optPosNum.describe("Machine duty hours per day"),
    ambient_temp_C: optNum.describe("Ambient temperature (°C)"),
    tramp_oil_rate_mL_hr: optPosNum.describe("Tramp oil ingress rate (mL/hour)"),
    skimmer_present: optBool.describe("Skimmer present?"),
    biocide_applied: optBool.describe("Biocide treatment applied?"),
    water_hardness_ppm: optPosNum.describe("Makeup water hardness (ppm CaCO3)"),
    coolant_cost_per_L: optPosNum.describe("Coolant cost per liter"),
    disposal_cost_per_L: optPosNum.describe("Disposal cost per liter"),
    downtime_cost_per_hr: optPosNum.describe("Downtime cost per hour"),
    sump_change_time_hr: optPosNum.describe("Sump change time (hours)"),
    horizon_days: optPosNum.describe("Simulation horizon (days)"),
  }).passthrough().describe("Simulate coolant lifecycle, health, and optimal replacement interval"),
  chip_formation_predict: z.object({
    cutting_speed_m_min: posNum.describe("Cutting speed (m/min)"),
    feed_mm_rev: posNum.describe("Feed per revolution (mm/rev)"),
    depth_of_cut_mm: posNum.describe("Depth of cut (mm)"),
    rake_angle_deg: z.number().describe("Tool rake angle (degrees, positive or negative)"),
    workpiece_hardness_hrc: optPosNum.describe("Workpiece hardness (HRC)"),
    workpiece_ductility: z.enum(["brittle", "moderate", "ductile", "very_ductile"]).optional().describe("Workpiece ductility"),
    workpiece_elongation_pct: optPosNum.describe("Elongation at break (%)"),
    friction_coefficient: optPosNum.describe("Tool-chip friction coefficient"),
    tool_has_chipbreaker: optBool.describe("Tool has chipbreaker geometry"),
    tool_nose_radius_mm: optPosNum.describe("Tool nose radius (mm)"),
    coolant_active: optBool.describe("Coolant active during cutting"),
  }).passthrough().describe("Predict chip morphology using Merchant's circle and Ernst-Merchant classification"),
  surface_measure_calc: z.object({
    action_type: z.enum(["record", "list", "statistics", "get_standard_specs"]).optional()
      .describe("Sub-action: record a measurement, list by part, get statistics, or get standard specs"),
    partNumber: optStr.describe("Part number (for record/list/statistics)"),
    featureName: optStr.describe("Feature name (for record/list/statistics)"),
    parameter: z.enum(["Ra","Rz","Rq","Rt","Rp","Rv","Rsk","Rku","Rsm","Rpc","Sa","Sz","Sq","Sp","Sv","Ssk","Sku"]).optional()
      .describe("Roughness parameter for statistics query"),
  }).passthrough().describe("Surface roughness measurement recording, retrieval, statistics, and standard specs"),
  // -- ENGINE-WIRE-MS0/U-WIRE10: 5 neural+adaptive engines --
  chatter_neural_classify: z.object({
    frequencyBins: z.array(z.number()).min(1).describe('FRF frequency bins (Hz)'),
    magnitudes: z.array(z.number()).min(1).describe('FRF magnitude values'),
    spindleRpm: posNum.describe('Spindle speed (RPM)'),
    axialDepthMm: posNum.describe('Axial depth of cut (mm)'),
    radialDepthMm: posNum.describe('Radial depth of cut (mm)'),
    feedPerToothMm: posNum.describe('Feed per tooth (mm)'),
    toolDiameterMm: posNum.describe('Tool diameter (mm)'),
    fluteCount: z.number().int().min(1).describe('Number of flutes'),
    overhangMm: posNum.describe('Tool overhang (mm)'),
    materialIsoGroup: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),
    helixAngleDeg: optPosNum.describe('Helix angle (degrees)'),
    kc11Mpa: optPosNum.describe('Kienzle kc1.1 coefficient (MPa)'),
    machineStiffnessNPerUm: optPosNum.describe('Machine stiffness (N/um)'),
    naturalFrequencyHz: optPosNum.describe('Natural frequency (Hz)'),
  }).passthrough().describe('1D-CNN neural classifier for chatter stability: stable/at_risk/chatter'),
  thermal_neural_predict: z.object({
    material_iso_group: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),
    thermal_conductivity_w_mk: optPosNum.describe('Material thermal conductivity (W/mK)'),
    specific_heat_j_kgk: optPosNum.describe('Specific heat capacity (J/kgK)'),
    density_kg_m3: optPosNum.describe('Material density (kg/m3)'),
    tool_material: z.enum(['carbide','ceramic','cbn','pcd','hss']).describe('Tool substrate material'),
    tool_coating: z.enum(['uncoated','TiN','TiAlN','AlTiN','DLC']).optional().describe('Tool coating type'),
    tool_conductivity_w_mk: optPosNum.describe('Tool thermal conductivity (W/mK)'),
    cutting_speed_mpm: posNum.describe('Cutting speed (m/min)'),
    feed_per_tooth_mm: posNum.describe('Feed per tooth (mm)'),
    axial_depth_mm: posNum.describe('Axial depth of cut (mm)'),
    radial_depth_mm: posNum.describe('Radial depth of cut (mm)'),
    cutting_force_n: posNum.describe('Cutting force (N)'),
    coolant_type: z.enum(['dry','flood','mql','cryogenic']).describe('Coolant strategy'),
    coolant_flow_lpm: optPosNum.describe('Coolant flow rate (L/min)'),
    coolant_temp_c: optNum.describe('Coolant temperature (C)'),
    cutting_time_s: optPosNum.describe('Accumulated cutting time (s)'),
  }).passthrough().describe('Physics-LSTM hybrid temperature prediction with coating degradation risk'),
  adaptive_param_space_record: z.object({
    parameters: z.record(z.string(), z.number()).describe('Parameter name to value map'),
    outcome: z.enum(['success','marginal','failure']).describe('Operation outcome'),
    context: z.record(z.string(), z.unknown()).optional().describe('Additional context metadata'),
  }).passthrough().describe('Record operation outcome to expand the adaptive parameter space'),
  adaptive_param_space_query: z.object({
    count: z.number().int().min(1).max(20).optional().describe('Number of exploration targets (default 5)'),
  }).passthrough().describe('Query adaptive parameter space: stats, gaps, exploration targets'),
  adaptive_machining_process: z.object({
    domain: z.enum(['milling','turning','mill_turn']).describe('Machining domain'),
    requestType: z.enum(['pre_analysis','real_time','post_analysis','full_cycle']).describe('Analysis type'),
    material: z.string().min(1).describe('Material name or identifier'),
    materialIso: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),
    machineId: z.string().min(1).describe('Machine identifier'),
    toolId: z.string().min(1).describe('Tool identifier'),
    operationType: z.string().min(1).describe('Operation type'),
    milling: z.object({
      toolDiameter: z.number().positive(),
      flutes: z.number().int().min(1),
      axialDepth: z.number().positive(),
      radialDepth: z.number().positive(),
      feedPerTooth: z.number().positive(),
      cuttingSpeed: z.number().positive(),
      toolpathType: z.enum(['linear','trochoidal','adaptive','hsr']),
    }).optional().describe('Milling-specific parameters'),
    turning: z.object({
      diameter: z.number().positive(),
      depthOfCut: z.number().positive(),
      feedPerRev: z.number().positive(),
      leadAngle: z.number(),
      noseRadius: z.number().positive(),
      cuttingSpeed: z.number().positive(),
      cssEnabled: z.boolean(),
      operationType: z.enum(['od_turning','id_boring','facing','grooving','threading','parting']),
    }).optional().describe('Turning-specific parameters'),
    environment: z.object({
      ambientTemp: z.number(),
      humidity: z.number(),
      machineUptime: z.number(),
    }).optional().describe('Environmental conditions'),
    includeFailureAnalysis: optBool.describe('Include failure mode analysis'),
    includeEnvironmentalAnalysis: optBool.describe('Include environmental sensitivity analysis'),
    includeRecommendations: optBool.describe('Include operation recommendations'),
  }).passthrough().describe('Unified adaptive machining integration: milling/turning pre/real-time/post analysis'),
  adaptive_physics_bridge: z.object({
    feed_mm_rev: posNum.describe('Feed per revolution (mm/rev)'),
    depth_of_cut_mm: posNum.describe('Depth of cut (mm)'),
    cutting_speed_mpm: posNum.describe('Cutting speed (m/min)'),
    material: z.enum(['steel','stainless','aluminum','cast_iron','titanium','superalloy']).describe('Workpiece material'),
    tool_diameter_mm: optPosNum.describe('Tool diameter (mm)'),
    rake_angle_deg: optNum.describe('Tool rake angle (degrees)'),
    insert_nose_radius_mm: optPosNum.describe('Insert nose radius (mm)'),
    chipbreaker_type: z.enum(['none','light','medium','heavy']).optional().describe('Chipbreaker type'),
    coolant: optBool.describe('Coolant active'),
    cutting_power_kw: optPosNum.describe('Current cutting power (kW)'),
    rated_power_kw: optPosNum.describe('Machine rated power (kW)'),
    cutting_time_min: optPosNum.describe('Cutting time (min)'),
  }).passthrough().describe('Integrated adaptive physics bridge: chip+coolant+spindle+wear analysis'),

  // ==========================================================================
  // OBSIDIAN-PRISM-OS-MS0 / U-ORPHAN-RESCUE-QUICK-CALC — 10 actions for
  // QuickCalcEngine (orphan-rescue wire, 2026-05-15). Zero dispatcher overhead
  // path for the 10 most common CNC calcs. Engine has 14 vitest cases in
  // __tests__/quick-calc-engine.test.ts.
  // ==========================================================================
  quick_rpm: z.object({
    surface_speed: posNum.describe('Surface speed — SFM (imperial) or Vc m/min (metric)'),
    diameter: posNum.describe('Tool diameter — inches (imperial) or mm (metric)'),
    metric: optBool.describe('true → diameter is in mm and surface_speed is Vc; default false (imperial)'),
  }).passthrough().describe('RPM from surface speed and diameter (QuickCalcEngine.rpm)'),

  quick_feed_rate: z.object({
    rpm: posNum.describe('Spindle RPM'),
    chip_load: posNum.describe('Chip load per tooth (fz) — inches (imperial) or mm (metric)'),
    flutes: posNum.describe('Number of flutes/teeth'),
    metric: optBool.describe('true → chip_load is mm and result feed_mmmin is the source unit; default false'),
  }).passthrough().describe('Feed rate from RPM, chip load, flutes (QuickCalcEngine.feedRate)'),

  quick_mrr: z.object({
    woc: posNum.describe('Width of cut — inches or mm'),
    doc: posNum.describe('Depth of cut — inches or mm'),
    feed_rate: posNum.describe('Feed rate — IPM (imperial) or mm/min (metric)'),
    metric: optBool.describe('true → all inputs metric; default false (imperial)'),
  }).passthrough().describe('Material removal rate (QuickCalcEngine.mrr)'),

  quick_surface_speed: z.object({
    rpm: posNum.describe('Spindle RPM'),
    diameter: posNum.describe('Tool diameter — inches or mm'),
    metric: optBool.describe('true → diameter is mm and Vc is reported in m/min; default false (SFM)'),
  }).passthrough().describe('Surface speed from RPM and diameter (QuickCalcEngine.surfaceSpeed)'),

  quick_chip_load: z.object({
    feed_rate: posNum.describe('Feed rate — IPM (imperial) or mm/min (metric)'),
    rpm: posNum.describe('Spindle RPM'),
    flutes: posNum.describe('Number of flutes/teeth'),
    metric: optBool.describe('true → feed_rate is mm/min; default false (IPM)'),
  }).passthrough().describe('Back-calculate chip load (QuickCalcEngine.chipLoad)'),

  quick_tap_drill: z.object({
    major_dia: posNum.describe('Thread major diameter (mm)'),
    pitch: posNum.describe('Thread pitch (mm)'),
  }).passthrough().describe('Metric tap drill diameter, D_drill = D_major − pitch (QuickCalcEngine.tapDrill)'),

  quick_cutting_time: z.object({
    distance: posNum.describe('Cut length (units must match feed_rate)'),
    feed_rate: posNum.describe('Feed rate (length / minute)'),
  }).passthrough().describe('Cutting time T = L / F (QuickCalcEngine.cuttingTime)'),

  quick_scallop_height: z.object({
    tool_radius: posNum.describe('Ball-nose tool radius'),
    stepover: posNum.describe('Stepover between adjacent passes'),
  }).passthrough().describe('Scallop height for ball-nose, h = R − √(R² − (step/2)²) (QuickCalcEngine.scallopHeight)'),

  quick_thread_pitch: z.object({
    tpi: posNum.describe('Threads per inch'),
  }).passthrough().describe('Thread pitch from TPI — returns mm + inches (QuickCalcEngine.threadPitch)'),

  quick_cutting_power: z.object({
    mrr_in3min: posNum.describe('Material removal rate (in³/min)'),
    material: z.enum(['aluminum','steel','stainless','titanium','cast_iron','custom']).describe('Workpiece material — sets unit-power factor; "custom" requires custom_factor'),
    custom_factor: optPosNum.describe('Custom unit-power factor (only when material="custom"); default 1.0'),
  }).passthrough().describe('Cutting power HP/kW = MRR × unit-power factor (QuickCalcEngine.cuttingPower)'),

  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SMART-DEFAULTS: SmartDefaultsEngine wire (2026-05-15)
  // Context-aware default RPM/feed/DOC/WOC/coolant from material × tool. SFM baselines
  // (NOT Kienzle/Taylor coefficients — these are reference-table cutting speeds).
  smart_defaults_get: z.object({
    material: z.string().min(1).describe('Material name — 6061/7075/aluminum/1018/4140/steel/stainless/titanium/inconel/brass/etc'),
    tool_diameter: posNum.describe('Tool diameter (inches)'),
    flutes: z.number().int().positive().max(20).optional().describe('Number of flutes (default 3)'),
    tool_material: z.enum(['carbide','hss','ceramic','diamond']).optional().describe('Tool material (default "carbide")'),
    operation: z.enum(['milling','finishing','roughing','slotting']).optional().describe('Operation (default "milling")'),
  }).passthrough().describe('Compute defaults: {rpm, feed_ipm, doc_in, woc_in, coolant}'),

  smart_defaults_sfm: z.object({
    material: z.string().min(1).describe('Material name'),
    tool_material: z.enum(['carbide','hss','ceramic','diamond']).optional().describe('Tool material (default "carbide")'),
  }).passthrough().describe('SFM baseline for material × tool material'),

  smart_defaults_chipload: z.object({
    diameter: posNum.describe('Tool diameter (inches)'),
  }).passthrough().describe('Default carbide chip load by diameter (nearest-neighbor lookup)'),

  smart_defaults_engagement: z.object({
    diameter: posNum.describe('Tool diameter (inches)'),
    material: z.string().min(1).describe('Material name'),
    operation: z.enum(['milling','finishing','roughing','slotting']).optional().describe('Operation (default "milling")'),
  }).passthrough().describe('DOC and WOC defaults as inches (scaled by material hardness + operation)'),

  smart_defaults_coolant: z.object({
    material: z.string().min(1).describe('Material name'),
  }).passthrough().describe('Coolant recommendation (flood/high-pressure flood/air blast/mist or dry)'),

  smart_defaults_materials: z.object({}).passthrough().describe('List all 18 supported material keys'),

  smart_defaults_oneliner: z.object({
    material: z.string().min(1).describe('Material name'),
    diameter: posNum.describe('Tool diameter (inches)'),
    flutes: z.number().int().positive().max(20).optional().describe('Number of flutes (default 3)'),
  }).passthrough().describe('One-line setup summary: "<material> Øx 3fl: RPM=N F=M DOC=A WOC=B coolant"'),
};
