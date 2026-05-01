/**
 * CK Pipeline Action Schemas — Zod v4
 *
 * Schemas for CK-MS7 dispatcher wiring (7 engines, 36 actions):
 *   - EDMProgramAssemblerEngine        (5 actions: edm_*)
 *   - GrindingProgramAssemblerEngine   (5 actions: grind_*)
 *   - LaserProgramAssemblerEngine      (5 actions: laser_*)
 *   - WaterjetProgramAssemblerEngine   (5 actions: waterjet_*)
 *   - MultiProcessCAMRouterEngine      (6 actions: multi_process_*)
 *   - MillTurnSwissPipelineEngine      (5 actions: mill_turn_*)
 *   - SelfLearningCAMEngine            (5 actions: self_learn_*)
 *
 * Total: 36 new actions
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// Shared sub-schemas
// ============================================================================

const isoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]).optional();
const controllerZ = z.enum(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma", "mitsubishi", "generic"]).optional();
const coolantZ = z.enum(["flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic", "dielectric"]).optional();
const materialZ = z.string().optional();
const uncertaintyParamsZ = z.object({
  num_samples: z.number().int().positive().optional(),
  confidence_level: z.number().min(0).max(1).optional(),
  seed: z.number().optional(),
}).passthrough().optional();
const xyPointZ = z.object({
  x: z.number(),
  y: z.number(),
}).passthrough();
const edmContourPointZ = z.object({
  x_mm: z.number(),
  y_mm: z.number(),
  arc_radius_mm: z.number().positive().optional(),
  arc_dir: z.enum(["CW", "CCW"]).optional(),
}).passthrough();
const laserGeometryZ = z.object({
  points: z.array(xyPointZ).min(2),
  arcs: z.array(z.object({
    start_idx: z.number().int().min(0),
    radius: z.number().positive(),
    ccw: z.boolean(),
  }).passthrough()).optional(),
  closed: z.boolean(),
  lead_in_mm: z.number().nonnegative().optional(),
  lead_out_mm: z.number().nonnegative().optional(),
}).passthrough();

// ============================================================================
// EDMProgramAssemblerEngine actions (5)
// ============================================================================

const edm_wire_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  contour: z.array(edmContourPointZ).min(2),
  wire_diameter_mm: z.number().positive().optional(),
  wire_material: z.enum(["brass", "zinc_coated", "molybdenum", "copper", "tungsten"]).optional(),
  dielectric: z.enum(["deionized_water", "oil"]).optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  taper_angle_deg: z.number().optional(),
  corner_radius_mm: z.number().optional(),
  num_passes: z.number().int().positive().optional(),
  controller: controllerZ,
  power_level: z.enum(["low", "medium", "high"]).optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const edm_sinker_program = z.object({
  material: z.string(),
  electrode_material: z.enum(["graphite", "copper", "copper_tungsten", "brass"]).optional(),
  cavity_depth_mm: z.number().positive(),
  cavity_width_mm: z.number().positive().optional(),
  cavity_length_mm: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  orbital_motion: z.boolean().optional(),
  roughing_current_a: z.number().positive().optional(),
  finishing_current_a: z.number().positive().optional(),
  num_electrodes: z.number().int().positive().optional(),
  dielectric: z.enum(["oil", "deionized_water"]).optional(),
  controller: controllerZ,
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const edm_micro_program = z.object({
  material: z.string(),
  feature_size_um: z.number().positive(),
  electrode_diameter_um: z.number().positive().optional(),
  depth_um: z.number().positive().optional(),
  pulse_duration_ns: z.number().positive().optional(),
  peak_current_a: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const edm_cycle_time = z.object({
  edm_type: z.enum(["wire", "sinker", "micro"]),
  material: z.string(),
  volume_mm3: z.number().positive().optional(),
  area_mm2: z.number().positive().optional(),
  depth_mm: z.number().positive().optional(),
  mrr_mm3_min: z.number().positive().optional(),
  roughing_passes: z.number().int().positive().optional(),
  finishing_passes: z.number().int().positive().optional(),
  setup_time_min: z.number().optional(),
  iso_group: isoGroupZ,
}).passthrough();

const edm_uncertainty = z.object({
  edm_type: z.enum(["wire", "sinker", "micro"]).optional(),
  material: z.string().optional(),
  thickness_mm: z.number().positive().optional(),
  uncertainty: uncertaintyParamsZ,
}).passthrough();

// ============================================================================
// GrindingProgramAssemblerEngine actions (5)
// ============================================================================

const grind_surface_program = z.object({
  material: z.string(),
  hardness_hrc: z.number().optional(),
  wheel_spec: z.string().optional(),
  wheel_diameter_mm: z.number().positive().optional(),
  wheel_width_mm: z.number().positive().optional(),
  work_length_mm: z.number().positive(),
  work_width_mm: z.number().positive(),
  stock_allowance_mm: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  table_speed_m_min: z.number().positive().optional(),
  crossfeed_mm_pass: z.number().positive().optional(),
  downfeed_mm_pass: z.number().positive().optional(),
  coolant: coolantZ,
  controller: controllerZ,
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const grind_cylindrical_program = z.object({
  material: z.string(),
  hardness_hrc: z.number().optional(),
  part_diameter_mm: z.number().positive(),
  part_length_mm: z.number().positive(),
  stock_allowance_mm: z.number().positive().optional(),
  wheel_spec: z.string().optional(),
  wheel_diameter_mm: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  work_speed_m_min: z.number().positive().optional(),
  infeed_mm_rev: z.number().positive().optional(),
  traverse_feed_mm_rev: z.number().positive().optional(),
  grinding_mode: z.enum(["plunge", "traverse", "angular"]).optional(),
  coolant: coolantZ,
  controller: controllerZ,
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const grind_centerless_program = z.object({
  material: z.string(),
  part_diameter_mm: z.number().positive(),
  part_length_mm: z.number().positive(),
  stock_allowance_mm: z.number().positive().optional(),
  wheel_spec: z.string().optional(),
  regulating_wheel_diameter_mm: z.number().positive().optional(),
  regulating_wheel_angle_deg: z.number().optional(),
  work_speed_m_min: z.number().positive().optional(),
  infeed_rate_mm_min: z.number().positive().optional(),
  centerless_mode: z.enum(["through_feed", "in_feed", "end_feed"]).optional(),
  coolant: coolantZ,
  controller: controllerZ,
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
}).passthrough();

const grind_creepfeed_program = z.object({
  material: z.string(),
  hardness_hrc: z.number().optional(),
  profile_depth_mm: z.number().positive(),
  profile_width_mm: z.number().positive(),
  wheel_spec: z.string().optional(),
  wheel_diameter_mm: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  table_speed_m_min: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  coolant: coolantZ,
  controller: controllerZ,
  iso_group: isoGroupZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const grind_uncertainty = z.object({
  grind_type: z.enum(["surface", "cylindrical", "centerless", "creepfeed"]).optional(),
  material: z.string().optional(),
  uncertainty: uncertaintyParamsZ,
}).passthrough();

// ============================================================================
// LaserProgramAssemblerEngine actions (5)
// ============================================================================

const laser_cut_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  geometry: laserGeometryZ,
  laser_type: z.enum(["co2", "fiber", "nd_yag", "diode", "excimer"]).optional(),
  laser_power_w: z.number().positive().optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  assist_gas: z.enum(["oxygen", "nitrogen", "air", "argon"]),
  gas_pressure_bar: z.number().positive(),
  kerf_width_mm: z.number().positive().optional(),
  roughness_target_ra_um: z.number().positive().optional(),
  pierce_time_s: z.number().positive().optional(),
  focus_offset_mm: z.number().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const laser_mark_program = z.object({
  material: z.string(),
  mark_type: z.enum(["engraving", "annealing", "ablation", "foaming", "carbonization"]).optional(),
  mark_depth_um: z.number().positive().optional(),
  laser_power_w: z.number().positive().optional(),
  scan_speed_mm_s: z.number().positive().optional(),
  pulse_frequency_khz: z.number().positive().optional(),
  line_spacing_um: z.number().positive().optional(),
  area_mm2: z.number().positive().optional(),
  text: z.string().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
}).passthrough();

const laser_weld_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  joint_type: z.enum(["butt", "lap", "t_joint", "corner", "fillet"]).optional(),
  laser_power_w: z.number().positive().optional(),
  welding_speed_mm_min: z.number().positive().optional(),
  shielding_gas: z.enum(["argon", "helium", "nitrogen", "co2_mix"]).optional(),
  gas_flow_l_min: z.number().positive().optional(),
  focal_position_mm: z.number().optional(),
  seam_width_mm: z.number().positive().optional(),
  penetration_depth_mm: z.number().positive().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const laser_drill_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  hole_diameter_mm: z.number().positive().optional(),
  drill_mode: z.enum(["percussion", "trepanning", "helical", "single_pulse"]).optional(),
  laser_power_w: z.number().positive().optional(),
  pulse_duration_ms: z.number().positive().optional(),
  num_pulses: z.number().int().positive().optional(),
  assist_gas: z.enum(["oxygen", "nitrogen", "air"]).optional(),
  taper_angle_deg: z.number().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
}).passthrough();

const laser_uncertainty = z.object({
  laser_process: z.enum(["cut", "mark", "weld", "drill"]).optional(),
  material: z.string().optional(),
  uncertainty: uncertaintyParamsZ,
}).passthrough();

// ============================================================================
// WaterjetProgramAssemblerEngine actions (5)
// ============================================================================

const waterjet_abrasive_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  cut_path: z.array(xyPointZ).min(2),
  abrasive: z.enum(["garnet_80", "garnet_120", "garnet_220", "aluminum_oxide"]).optional(),
  abrasive_flow_rate_g_min: z.number().positive().optional(),
  water_pressure_mpa: z.number().positive().optional(),
  orifice_diameter_mm: z.number().positive().optional(),
  focusing_tube_diameter_mm: z.number().positive().optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  kerf_width_mm: z.number().positive().optional(),
  quality_level: z.enum(["Q1", "Q2", "Q3", "Q4", "Q5"]).optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
  part_name: z.string().optional(),
}).passthrough();

const waterjet_pure_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  cut_path: z.array(xyPointZ).min(2),
  water_pressure_mpa: z.number().positive().optional(),
  orifice_diameter_mm: z.number().positive().optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  kerf_width_mm: z.number().positive().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
}).passthrough();

const waterjet_taper_program = z.object({
  material: z.string(),
  thickness_mm: z.number().positive(),
  cut_path: z.array(xyPointZ).min(2),
  taper_angle_deg: z.number(),
  compensation_mode: z.enum(["dynamic", "fixed_offset", "none"]).optional(),
  abrasive_flow_rate_g_min: z.number().positive().optional(),
  water_pressure_mpa: z.number().positive().optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
}).passthrough();

const waterjet_depth_program = z.object({
  material: z.string(),
  target_depth_mm: z.number().positive(),
  total_thickness_mm: z.number().positive().optional(),
  abrasive_flow_rate_g_min: z.number().positive().optional(),
  water_pressure_mpa: z.number().positive().optional(),
  cutting_speed_mm_min: z.number().positive().optional(),
  num_passes: z.number().int().positive().optional(),
  iso_group: isoGroupZ,
  controller: controllerZ,
  program_number: z.number().optional(),
}).passthrough();

const waterjet_uncertainty = z.object({
  wj_process: z.enum(["abrasive", "pure", "taper", "depth"]).optional(),
  material: z.string().optional(),
  uncertainty: uncertaintyParamsZ,
}).passthrough();

// ============================================================================
// MultiProcessCAMRouterEngine actions (6)
// ============================================================================

const featureZ = z.object({
  feature_type: z.string(),
  geometry: z.record(z.string(), z.any()).optional(),
  material: z.string().optional(),
  tolerance_mm: z.number().optional(),
  roughness_ra_um: z.number().optional(),
  hardness_hrc: z.number().optional(),
}).passthrough();

const routeZ = z.object({
  part_id: z.string().optional(),
  processes: z.array(z.record(z.string(), z.any())).optional(),
  total_cost: z.number().optional(),
  total_time_min: z.number().optional(),
}).passthrough();

const multi_process_route = z.object({
  part_id: z.string().optional(),
  material: z.string(),
  features: z.array(featureZ),
  batch_size: z.number().int().positive().optional(),
  available_processes: z.array(z.string()).optional(),
  optimize_for: z.enum(["cost", "time", "quality", "balanced"]).optional(),
  constraints: z.record(z.string(), z.any()).optional(),
}).passthrough();

const multi_process_analyze = z.object({
  features: z.array(featureZ),
  material: z.string().optional(),
  batch_size: z.number().int().positive().optional(),
}).passthrough();

const multi_process_sequence = z.object({
  analyses: z.array(z.record(z.string(), z.any())),
  constraints: z.record(z.string(), z.any()).optional(),
  optimize_for: z.enum(["cost", "time", "quality", "balanced"]).optional(),
}).passthrough();

const multi_process_cost = z.object({
  route: routeZ,
  batch_size: z.number().int().positive().optional(),
  overhead_rate: z.number().optional(),
  material_cost_per_kg: z.number().optional(),
}).passthrough();

const multi_process_alternatives = z.object({
  feature: featureZ,
  material: z.string().optional(),
  max_alternatives: z.number().int().positive().optional(),
}).passthrough();

const multi_process_consolidate = z.object({
  route: routeZ,
  consolidation_goal: z.enum(["minimize_setups", "minimize_cost", "minimize_time"]).optional(),
}).passthrough();

// ============================================================================
// MillTurnSwissPipelineEngine actions (5)
// ============================================================================

const mill_turn_live_tooling = z.object({
  operation: z.enum([
    "cross_drill", "face_mill", "c_axis_contour", "y_axis_mill",
    "cross_tap", "keyway_mill", "off_center_drill", "polygon_turn"
  ]),
  tool_diameter_mm: z.number().positive(),
  depth_of_cut_mm: z.number().positive(),
  workpiece_diameter_mm: z.number().positive(),
  spindle_speed_rpm: z.number().positive().optional(),
  cutting_speed_m_min: z.number().positive().optional(),
  feed_mm_rev: z.number().positive().optional(),
  feed_mm_tooth: z.number().positive().optional(),
  num_flutes: z.number().int().positive().optional(),
  width_of_cut_mm: z.number().positive().optional(),
  offset_from_centerline_mm: z.number().optional(),
  iso_group: isoGroupZ,
  coolant: coolantZ,
}).passthrough();

const mill_turn_sub_spindle = z.object({
  part_diameter_mm: z.number().positive(),
  part_length_mm: z.number().positive(),
  transfer_mode: z.enum(["synchronized", "stop_transfer", "speed_match"]).optional(),
  main_spindle_rpm: z.number().positive().optional(),
  sub_spindle_rpm: z.number().positive().optional(),
  sync_tolerance_rpm: z.number().positive().optional(),
  grip_force_n: z.number().positive().optional(),
  part_material: materialZ,
  controller_style: z.enum(["fanuc_wait_m", "siemens_waitm", "mazak_smooth", "index_cline", "citizen_cincom", "generic"]).optional(),
  cutoff_tool_width_mm: z.number().positive().optional(),
}).passthrough();

const mill_turn_multi_channel = z.object({
  channels: z.array(z.object({
    channel_id: z.number().int(),
    operations: z.array(z.record(z.string(), z.any())),
  })),
  sync_code_style: z.enum(["fanuc_wait_m", "siemens_waitm", "mazak_smooth", "index_cline", "citizen_cincom", "generic"]).optional(),
  cycle_time_target_s: z.number().positive().optional(),
  collision_check: z.boolean().optional(),
}).passthrough();

const mill_turn_bar_feeder = z.object({
  bar_diameter_mm: z.number().positive(),
  bar_length_mm: z.number().positive(),
  part_length_mm: z.number().positive(),
  cutoff_width_mm: z.number().positive().optional(),
  facing_stock_mm: z.number().positive().optional(),
  bar_shape: z.enum(["round", "hex", "square"]).optional(),
  material: materialZ,
  density_kg_m3: z.number().positive().optional(),
  collet_bore_mm: z.number().positive().optional(),
  remnant_min_length_mm: z.number().positive().optional(),
  feed_advance_time_s: z.number().positive().optional(),
}).passthrough();

const mill_turn_swiss = z.object({
  machine_config: z.enum([
    "citizen_cincom", "star_sr", "tsugami_b_axis",
    "tornos_deco", "citizen_miyano", "generic_swiss"
  ]).optional(),
  bar_diameter_mm: z.number().positive(),
  part_length_mm: z.number().positive(),
  guide_bushing: z.boolean().optional(),
  overhang_mm: z.number().positive().optional(),
  material: materialZ,
  iso_group: isoGroupZ,
  operations: z.array(z.record(z.string(), z.any())).optional(),
  b_axis_available: z.boolean().optional(),
  gang_slide: z.boolean().optional(),
  back_working_spindle: z.boolean().optional(),
}).passthrough();

// ============================================================================
// SelfLearningCAMEngine actions (5)
// ============================================================================

const cuttingParamsZ = z.object({
  speed_mpm: z.number().positive(),
  feed_mmtooth: z.number().positive(),
  axial_depth_mm: z.number().positive(),
  radial_depth_mm: z.number().positive(),
  tool_diameter_mm: z.number().positive(),
});

const self_learn_record = z.object({
  observations: z.array(z.object({
    jobId: z.string(),
    machineId: z.string(),
    materialGroup: z.enum(["P", "M", "K", "N", "S", "H"]),
    materialName: z.string().optional(),
    strategy: z.string().optional(),
    geometryClass: z.string().optional(),
    cuttingParams: cuttingParamsZ,
    actuals: z.object({
      force_N: z.number().optional(),
      surface_finish_Ra_um: z.number().optional(),
      tool_life_min: z.number().optional(),
      cycle_time_min: z.number().optional(),
      dimension_error_um: z.number().optional(),
      vibration_g: z.number().optional(),
      temperature_C: z.number().optional(),
      power_kW: z.number().optional(),
    }),
    predicted: z.object({
      force_N: z.number().optional(),
      surface_finish_Ra_um: z.number().optional(),
      tool_life_min: z.number().optional(),
      cycle_time_min: z.number().optional(),
      dimension_error_um: z.number().optional(),
      power_kW: z.number().optional(),
    }).optional(),
    timestamp: z.number().optional(),
  })),
}).passthrough();

const self_learn_twin_sync = z.object({
  machineId: z.string(),
  timestamp: z.number().optional(),
  measurements: z.object({
    actual_speed_mpm: z.number().optional(),
    actual_feed_mmtooth: z.number().optional(),
    actual_force_N: z.number().optional(),
    actual_power_kW: z.number().optional(),
    actual_vibration_g: z.number().optional(),
    actual_temperature_C: z.number().optional(),
  }),
  kalman_Q: z.number().optional(),
  kalman_R: z.number().optional(),
}).passthrough();

const self_learn_rank_strategy = z.object({
  materialGroup: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  geometryClass: z.string().optional(),
  min_observations: z.number().int().positive().optional(),
  top_n: z.number().int().positive().optional(),
}).passthrough();

const self_learn_anomaly = z.object({
  machineId: z.string().optional(),
  materialGroup: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  mahalanobis_threshold: z.number().positive().optional(),
  recalibrate: z.boolean().optional(),
}).passthrough();

const self_learn_fleet = z.object({
  machines: z.array(z.object({
    machineId: z.string(),
    observations: z.array(z.record(z.string(), z.any())).optional(),
  })).optional(),
  shrinkage_weight: z.number().min(0).max(1).optional(),
  materialGroup: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
}).passthrough();

// ============================================================================
// Export
// ============================================================================

export const ACTION_CK_PIPELINE_SCHEMAS: ActionSchemaMap = {
  // EDM
  edm_wire_program,
  edm_sinker_program,
  edm_micro_program,
  edm_cycle_time,
  edm_uncertainty,
  // Grinding
  grind_surface_program,
  grind_cylindrical_program,
  grind_centerless_program,
  grind_creepfeed_program,
  grind_uncertainty,
  // Laser
  laser_cut_program,
  laser_mark_program,
  laser_weld_program,
  laser_drill_program,
  laser_uncertainty,
  // Waterjet
  waterjet_abrasive_program,
  waterjet_pure_program,
  waterjet_taper_program,
  waterjet_depth_program,
  waterjet_uncertainty,
  // Multi-process
  multi_process_route,
  multi_process_analyze,
  multi_process_sequence,
  multi_process_cost,
  multi_process_alternatives,
  multi_process_consolidate,
  // Mill-turn / Swiss
  mill_turn_live_tooling,
  mill_turn_sub_spindle,
  mill_turn_multi_channel,
  mill_turn_bar_feeder,
  mill_turn_swiss,
  // Self-learning
  self_learn_record,
  self_learn_twin_sync,
  self_learn_rank_strategy,
  self_learn_anomaly,
  self_learn_fleet,
};
