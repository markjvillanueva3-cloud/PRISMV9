/**
 * Calc Dispatcher Action Schemas
 * ===============================
 * Per-action Zod schemas for all 56 prism_calc actions.
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
  operations: z.array(z.record(z.any())).optional(),
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
  profile_points: z.array(z.record(z.any())).optional(),
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
  stack_dimensions: z.array(z.record(z.any())).optional(),
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
  config: z.record(z.any()),
  operation_results: z.array(z.array(z.any())),
  list_actions: optBool,
}).passthrough();

const campaign_validate = z.object({
  config: z.record(z.any()),
}).passthrough();

const campaign_optimize = z.object({
  config: z.record(z.any()),
  target: z.record(z.any()).optional(),
}).passthrough();

const campaign_cycle_time = z.object({
  config: z.record(z.any()),
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
  chain_config: z.record(z.any()).optional(),
  scenario: z.record(z.any()).optional(),
  material: optStr,
  machine: optStr,
  constraints: z.record(z.any()).optional(),
  response_level: optStr,
  symptoms: z.array(z.string()).optional(),
  alarm_code: optStr,
  machine_state: z.record(z.any()).optional(),
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
  params: z.record(z.any()).optional(),
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
  algorithm_params: z.record(z.any()).optional(),
}).passthrough();

const algorithm_validate = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: z.record(z.any()).optional(),
}).passthrough();

const algorithm_list = z.object({
  domain: optStr,
  safety_class: optStr,
}).passthrough();

const algorithm_info = z.object({
  algorithm_id: z.string().min(1),
}).passthrough();

const algorithm_batch = z.object({
  calculations: z.array(z.record(z.any())),
  stop_on_error: optBool,
}).passthrough();

const algorithm_benchmark = z.object({
  algorithm_id: z.string().min(1),
  algorithm_params: z.record(z.any()).optional(),
}).passthrough();

// ============================================================================
// EXPORT: ACTION_CALC_SCHEMAS
// ============================================================================

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
