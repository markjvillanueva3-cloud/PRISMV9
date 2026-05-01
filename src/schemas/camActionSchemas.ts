/**
 * CAM Dispatcher Action Schemas
 * ===============================
 * Per-action Zod schemas for all prism_cam actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/camActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();
const vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
const optVec3 = vec3.optional();

// ============================================================================
// TOOLPATH (3)
// ============================================================================

const toolpath_generate = z.object({
  strategy: optStr,
  tool_diameter: optNum,
  stepover: optNum,
  depth_of_cut: optNum,
  material: optStr,
}).passthrough();

const toolpath_simulate = z.object({
  moves: z.array(z.record(z.string(), z.unknown())).optional(),
  feed_rate_mmmin: optNum,
  rapid_rate_mmmin: optNum,
  tool_diameter: optNum,
  stock_bounds: z.record(z.string(), z.unknown()).optional(),
  fixture_bounds: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const toolpath_optimize = z.object({
  toolpath: z.record(z.string(), z.unknown()).optional(),
  strategy: optStr,
}).passthrough();

// ============================================================================
// POST PROCESSING (1)
// ============================================================================

const post_process = z.object({
  controller: optStr,
  gcode: optStr,
  program: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// COLLISION (1)
// ============================================================================

const collision_check_full = z.object({
  bodies: z.array(z.record(z.string(), z.unknown())).optional(),
  moves: z.array(z.record(z.string(), z.unknown())).optional(),
  safety_margin_mm: z.number().optional(),
}).passthrough();

// ============================================================================
// STOCK MODEL (1)
// ============================================================================

const stock_update = z.object({
  create: optBool,
  analyze: optBool,
  stock: z.record(z.string(), z.unknown()).optional(),
  stock_id: optStr,
  part_volume_mm3: optNum,
  material: optStr,
  cost_per_kg: optNum,
  operation_id: optStr,
  operation_type: optStr,
  volume_removed_mm3: optNum,
  tool_used: optStr,
  time_sec: optNum,
}).passthrough();

// ============================================================================
// TOOL ASSEMBLY (1)
// ============================================================================

const tool_assembly = z.object({
  tool: z.record(z.string(), z.unknown()).optional(),
  holder: z.record(z.string(), z.unknown()).optional(),
  gauge_length: optNum,
}).passthrough();

// ============================================================================
// FIXTURE (1)
// ============================================================================

const fixture_setup = z.object({
  workpiece: z.record(z.string(), z.unknown()).optional(),
  machine: optStr,
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

// ============================================================================
// NESTING (1)
// ============================================================================

const nesting_optimize = z.object({
  compare_stock: optBool,
  parts: z.array(z.record(z.string(), z.unknown())).optional(),
  stocks: z.array(z.record(z.string(), z.unknown())).optional(),
  stock: z.record(z.string(), z.unknown()).optional(),
  kerf_mm: optNum,
}).passthrough();

// ============================================================================
// CLEARANCE PLANE (1)
// ============================================================================

const clearance_plane = z.object({
  stockTopZ: optNum,
  fixtureTopZ: optNum,
  workpieceTopZ: optNum,
  marginMm: optNum,
}).passthrough();

// ============================================================================
// SEQUENCE & LINKING (2)
// ============================================================================

const sequence_operations = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const linking_move = z.object({
  fromPos: optVec3,
  toPos: optVec3,
  config: z.object({
    globalClearanceZ: optNum,
    linkingMode: optStr,
    minClearanceMm: optNum,
  }).passthrough().optional(),
}).passthrough();

// ============================================================================
// HYPERMILL STRATEGY (1)
// ============================================================================

const cam_strategy_recommend = z.object({
  geometry: optStr,
  material: optStr,
  goal: optStr,
  tool_type: optStr,
  axis_count: z.number().int().optional(),
}).passthrough();

// ============================================================================
// HYPERMILL SAFETY (1)
// ============================================================================

const cam_safety_validate = z.object({
  clearance_plane: z.record(z.string(), z.unknown()).optional(),
  allowance: optNum,
  geometry_check: optBool,
  measurement_system: optStr,
  insert_type: optStr,
  rest_material: optBool,
}).passthrough();

// ============================================================================
// HYPERMILL MULTI-AXIS (1)
// ============================================================================

const cam_multiaxis_recommend = z.object({
  list: optBool,
  defaults: optBool,
  domain: optStr,
  geometry: optStr,
  goal: optStr,
}).passthrough();

// ============================================================================
// HYPERMILL MATERIAL MAP (1)
// ============================================================================

const cam_material_map = z.object({
  quality_id: optStr,
  search: optStr,
  iso_group: optStr,
  list_groups: optBool,
  list_cutters: optBool,
}).passthrough();

// ============================================================================
// HYPERMILL CYCLE CATALOG (1)
// ============================================================================

const cam_cycle_catalog = z.object({
  search: optStr,
  category: optStr,
  code: optStr,
  stats: optBool,
}).passthrough();

// ============================================================================
// LATHE POST PROCESSOR (1)
// ============================================================================

const lathe_post_process = z.object({
  input: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// PROBING (1)
// ============================================================================

const probe_generate = z.object({
  type: optStr,
  controller: optStr,
  probe_tool_number: z.number().int().optional(),
  feed_rate: optNum,
  retract_distance: optNum,
  overtravel: optNum,
  work_offset_to_set: optStr,
  print_result: optBool,
  config: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// SUBPROGRAM (2)
// ============================================================================

const subprogram_call = z.object({
  program_number: z.number().int().optional(),
  repeat_count: z.number().int().optional(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  controller: optStr,
}).passthrough();

const subprogram_pattern = z.object({
  subprogram_number: z.number().int().optional(),
  positions: z.array(z.record(z.string(), z.unknown())).optional(),
  return_to_zero: optBool,
  controller: optStr,
}).passthrough();

// ============================================================================
// HYPERMILL CYCLE DEFAULTS (1)
// ============================================================================

const cam_cycle_defaults = z.object({
  code: optStr,
  resolve: optBool,
  tool_diameter: optNum,
  tool_radius: optNum,
  tool_corner_radius: optNum,
  machine_tolerance: optNum,
  job_feed: optNum,
  search: optStr,
  category: optStr,
  formulas: optBool,
  stats: optBool,
}).passthrough();

// ============================================================================
// HYPERMILL THREAD LOOKUP (1)
// ============================================================================

const cam_thread_lookup = z.object({
  search: optStr,
  size: optNum,
  pitch: optNum,
  tap_drill: optStr,
  minor_dia: optStr,
  standard: optStr,
  stats: optBool,
}).passthrough();

// ============================================================================
// HYPERMILL CONTROLLER CATALOG (1)
// ============================================================================

const cam_controller_catalog = z.object({
  search: optStr,
  family: optStr,
  axis_count: z.number().int().optional(),
  capability: optStr,
  dialect: optStr,
  stats: optBool,
}).passthrough();

// ============================================================================
// ADVANCED POST ENHANCE (1)
// ============================================================================

const advanced_post_enhance = z.object({
  controller: z.string().optional(),
  gcode: z.string().optional(),
  adaptive_clearing: optBool,
  hsm: optBool,
  tool_management: optBool,
  in_process_measure: optBool,
  feed_optimization: optBool,
  multi_axis: optBool,
}).passthrough();

// ============================================================================
// CAM TRANSLATE / PORTABILITY (3)
// ============================================================================

const cam_translate = z.object({
  list_intents: optBool,
  list_controllers: optBool,
  controller_features: optStr,
  stats: optBool,
  intent: optStr,
  material: z.record(z.string(), z.unknown()).optional(),
  material_name: optStr,
  tool: z.record(z.string(), z.unknown()).optional(),
  tool_diameter: optNum,
  machine: z.record(z.string(), z.unknown()).optional(),
  controller: optStr,
  axis_count: z.number().int().optional(),
  tolerance: optNum,
  allowance: optNum,
  depth: optNum,
  width: optNum,
  source_cam: optStr,
  enhance: optBool,
}).passthrough();

const cam_compare_controllers = z.object({
  intent: optStr,
  material: z.record(z.string(), z.unknown()).optional(),
  material_name: optStr,
  tool: z.record(z.string(), z.unknown()).optional(),
  tool_diameter: optNum,
  tolerance: optNum,
  axis_count: z.number().int().optional(),
  source_cam: optStr,
}).passthrough();

const cam_material_recommend = z.object({
  material: z.record(z.string(), z.unknown()).optional(),
  material_name: optStr,
  iso_group: optStr,
  hardness_hrc: optNum,
}).passthrough();

// ============================================================================
// MULTI-CAM STRATEGY (4)
// ============================================================================

const cam_multicam_recommend = z.object({
  cam_system: optStr,
  camSystem: optStr,
  geometry_type: optStr,
  geometryType: optStr,
  operation_goal: optStr,
  operationGoal: optStr,
  material_group: optStr,
  materialGroup: optStr,
  tool_diameter_mm: optNum,
  toolDiameterMm: optNum,
  wall_angle_deg: optNum,
  wallAngleDeg: optNum,
  has_previous_roughing: optBool,
  hasPreviousRoughing: optBool,
  axis_count: z.number().int().optional(),
  axisCount: z.number().int().optional(),
}).passthrough();

const cam_multicam_list = z.object({
  cam_system: optStr,
  camSystem: optStr,
}).passthrough();

const cam_multicam_compare = z.object({
  geometry_type: optStr,
  geometryType: optStr,
  operation_goal: optStr,
  operationGoal: optStr,
}).passthrough();

const cam_multicam_flagship = z.object({
  cam_system: optStr,
  camSystem: optStr,
}).passthrough();

// ============================================================================
// POST FEED OPTIMIZER (2)
// ============================================================================

const feedOptParams = z.object({
  gcode: z.string().optional(),
  tool_diameter_mm: optNum,
  toolDiameter_mm: optNum,
  tool_flutes: z.number().int().optional(),
  toolFlutes: z.number().int().optional(),
  radial_depth_mm: optNum,
  radialDepth_mm: optNum,
  axial_depth_mm: optNum,
  axialDepth_mm: optNum,
  material: optStr,
  spindle_rpm: optNum,
  spindleRPM: optNum,
  nominal_feed_mmmin: optNum,
  nominalFeed_mmmin: optNum,
  corner_slowdown_factor: optNum,
  plunge_rate_factor: optNum,
  arc_min_radius_mm: optNum,
  max_feed_increase: optNum,
  enable_chip_thinning: optBool,
  enable_corner_decel: optBool,
  enable_arc_limiting: optBool,
  enable_plunge_limiting: optBool,
  enable_stability_check: optBool,
  stability_max_doc_mm: optNum,
}).passthrough();

const post_feed_optimize = feedOptParams;
const post_feed_analyze = feedOptParams;

// ============================================================================
// G-CODE TRANSPILER (3)
// ============================================================================

const gcode_transpile = z.object({
  gcode: z.string().optional(),
  source: optStr,
  source_dialect: optStr,
  target: optStr,
  target_dialect: optStr,
  preserve_comments: optBool,
  add_translation_notes: optBool,
  safe_start_block: optBool,
  convert_cycles: optBool,
  convert_work_offsets: optBool,
}).passthrough();

const gcode_transpile_dialects = z.object({}).passthrough();

const gcode_transpile_cycles = z.object({}).passthrough();

// ============================================================================
// STABILITY RPM REWRITER (2)
// ============================================================================

const stabilityRpmParams = z.object({
  gcode: z.string().optional(),
  lobes: z.array(z.record(z.string(), z.unknown())).optional(),
  sld_lobes: z.array(z.record(z.string(), z.unknown())).optional(),
  tool_flutes: z.number().int().optional(),
  toolFlutes: z.number().int().optional(),
  current_doc_mm: optNum,
  axial_depth_mm: optNum,
  rpm_search_range: z.array(z.number()).optional(),
  prefer_higher_rpm: optBool,
  min_rpm: optNum,
  max_rpm: optNum,
  feed_per_tooth_mm: optNum,
}).passthrough();

const stability_rpm_rewrite = stabilityRpmParams;
const stability_rpm_analyze = stabilityRpmParams;

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_CAM_SCHEMAS: ActionSchemaMap = {
  // Toolpath
  toolpath_generate,
  toolpath_simulate,
  toolpath_optimize,
  // Post Processing
  post_process,
  // Collision
  collision_check_full,
  // Stock Model
  stock_update,
  // Tool Assembly
  tool_assembly,
  // Fixture
  fixture_setup,
  // Nesting
  nesting_optimize,
  // Clearance Plane
  clearance_plane,
  // Sequence & Linking
  sequence_operations,
  linking_move,
  // HyperMILL Strategy
  cam_strategy_recommend,
  // HyperMILL Safety
  cam_safety_validate,
  // HyperMILL Multi-Axis
  cam_multiaxis_recommend,
  // HyperMILL Material Map
  cam_material_map,
  // HyperMILL Cycle Catalog
  cam_cycle_catalog,
  // Lathe Post Processor
  lathe_post_process,
  // Probing
  probe_generate,
  // Subprogram
  subprogram_call,
  subprogram_pattern,
  // HyperMILL Cycle Defaults
  cam_cycle_defaults,
  // HyperMILL Thread Lookup
  cam_thread_lookup,
  // HyperMILL Controller Catalog
  cam_controller_catalog,
  // Advanced Post Enhance
  advanced_post_enhance,
  // CAM Translate / Portability
  cam_translate,
  cam_compare_controllers,
  cam_material_recommend,
  // Multi-CAM Strategy
  cam_multicam_recommend,
  cam_multicam_list,
  cam_multicam_compare,
  cam_multicam_flagship,
  // Post Feed Optimizer
  post_feed_optimize,
  post_feed_analyze,
  // G-Code Transpiler
  gcode_transpile,
  gcode_transpile_dialects,
  gcode_transpile_cycles,
  // Stability RPM Rewriter
  stability_rpm_rewrite,
  stability_rpm_analyze,
};
