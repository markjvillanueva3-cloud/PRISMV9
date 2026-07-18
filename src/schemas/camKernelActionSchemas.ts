/**
 * CAM Kernel Action Schemas — Zod v4
 *
 * Schemas for CK-MS9 production hardening of 13 cam kernel actions:
 *   cam_unified_generate, cam_complex_generate, cam_production_toolpath,
 *   cam_multi_process, cam_mill_turn, cam_5axis_convert,
 *   cam_advanced_strategy, cam_smart_tool, cam_verify,
 *   cam_chatter_rpm, cam_cost_feature,
 *   cam_intelligent_sequence, cam_list_actions
 *
 * @module schemas/camKernelActionSchemas
 * @version 1.0.0
 * @milestone CK-MS9
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// Shared sub-schemas
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();

const vec3Z = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const optVec3Z = vec3Z.optional();

const featureZ = z.object({
  type: z.string(),
  operation: z.enum(["roughing", "finishing", "drilling", "rest", "facing"]).optional(),
  dimensions: z.object({
    length_mm: optNum,
    width_mm: optNum,
    depth_mm: optNum,
    diameter_mm: optNum,
  }).passthrough().optional(),
  tolerance_mm: optNum,
  surface_finish_Ra: optNum,
  wall_thickness_mm: optNum,
  corner_radius_mm: optNum,
  notes: optStr,
}).passthrough();

const toolObjectZ = z.object({
  tool_number: z.number().int().optional(),
  diameter_mm: z.number().positive().optional(),
  flutes: z.number().int().positive().optional(),
  type: z.string().optional(),
  material: z.string().optional(),
}).passthrough();

// ============================================================================
// 1. cam_unified_generate
// ============================================================================

const cam_unified_generate = z.object({
  features: z.array(featureZ),
  material: z.string(),
  machine: optStr,
  machine_name: optStr,
  controller: optStr,
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  material_hardness_hrc: optNum,
  stock_dims: z.object({
    length_mm: z.number(),
    width_mm: z.number(),
    height_mm: z.number(),
  }).optional(),
  options: z.object({
    aggressiveness: z.number().min(0).max(1).optional(),
    coolant: optStr,
    optimize_for: z.enum(["tool_life", "speed", "cost", "surface_finish", "balanced"]).optional(),
    program_number: z.number().int().optional(),
    programmer_name: optStr,
    machine_rate_per_hour: optNum,
  }).passthrough().optional(),
  // CK-MS9: post-processing integration flags
  post_process: optBool,
  optimize_sf: optBool,
  production_mode: optBool,
}).passthrough();

// ============================================================================
// 2. cam_complex_generate
// ============================================================================

const cam_complex_generate = z.object({
  features: z.array(featureZ).min(1),
  material: z.string(),
  machine: z.string(),
  machine_name: optStr,
  multi_setup: z.boolean().optional().default(false),
  controller: optStr,
  batch_size: z.number().int().positive().optional(),
  available_processes: z.array(z.string()).optional(),
  optimize_for: z.enum(["cost", "time", "quality", "balanced"]).optional(),
  // CK-MS9: post-processing integration flags
  post_process: optBool,
  optimize_sf: optBool,
}).passthrough();

// ============================================================================
// 3. cam_production_toolpath
// ============================================================================

const cam_production_toolpath = z.object({
  boundary: z.array(vec3Z),
  config: z.object({
    tool_diameter_mm: z.number().positive().optional(),
    depth_mm: z.number().positive().optional(),
    stepover_pct: z.number().min(0).max(100).optional(),
    stepdown_mm: z.number().positive().optional(),
    finishing_passes: z.number().int().min(0).optional(),
    lead_in_radius_mm: z.number().min(0).optional(),
    spindle_rpm: z.number().positive().optional(),
    feed_mm_min: z.number().positive().optional(),
    climb_milling: z.boolean().optional(),
    coolant: optStr,
    aggressiveness: z.number().min(0).max(1).optional(),
  }).passthrough().optional(),
  program_number: z.string().optional(),
  controller: optStr,
}).passthrough();

// ============================================================================
// 4. cam_multi_process
// ============================================================================

const cam_multi_process = z.object({
  features: z.array(featureZ),
  material: z.string(),
  machine: z.string(),
  available_processes: z.array(z.string()).optional(),
  optimize_for: z.enum(["cost", "time", "quality", "balanced"]).optional(),
}).passthrough();

// ============================================================================
// 5. cam_mill_turn
// ============================================================================

const millTurnOperationZ = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const cam_mill_turn = z.object({
  operations: z.array(millTurnOperationZ),
  config: z.object({
    machine_config: optStr,
    bar_diameter_mm: optNum,
    part_length_mm: optNum,
    controller: optStr,
    guide_bushing: optBool,
    sub_spindle: optBool,
    b_axis_available: optBool,
    gang_slide: optBool,
  }).passthrough().optional(),
}).passthrough();

// ============================================================================
// 6. cam_5axis_convert
// ============================================================================

const segmentZ = z.object({
  start: vec3Z,
  end: vec3Z,
  normal: vec3Z.optional(),
  feed_mm_min: optNum,
  spindle_rpm: optNum,
}).passthrough();

const cam_5axis_convert = z.object({
  segments: z.array(segmentZ),
  config: z.object({
    lead_angle_deg: optNum,
    lean_angle_deg: optNum,
    tilt_deg: optNum,
    controller: optStr,
    machine_kinematics: optStr,
    singularity_avoidance: optBool,
    rtcp: optBool,
    max_angular_velocity_deg_s: optNum,
  }).passthrough().optional(),
}).passthrough();

// ============================================================================
// 7. cam_advanced_strategy
// ============================================================================

const cam_advanced_strategy = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("flowline"),
    start_curve: z.array(vec3Z).optional(),
    end_curve: z.array(vec3Z).optional(),
    config: z.object({
      tool_diameter_mm: optNum,
      stepover_mm: optNum,
      tolerance_mm: optNum,
    }).passthrough().optional(),
    num_passes: z.number().int().positive().optional(),
  }).passthrough(),
  z.object({
    strategy: z.literal("geodesic"),
    surface_points: z.array(vec3Z).optional(),
    config: z.object({
      tool_diameter_mm: optNum,
      stepover_mm: optNum,
    }).passthrough().optional(),
    direction: optStr,
  }).passthrough(),
  z.object({
    strategy: z.literal("constant_scallop"),
    surface_points: z.array(vec3Z).optional(),
    config: z.object({
      tool_diameter_mm: optNum,
    }).passthrough().optional(),
    target_scallop_mm: z.number().positive().optional(),
  }).passthrough(),
  z.object({
    strategy: z.literal("swarf"),
    top_curve: z.array(vec3Z).optional(),
    bottom_curve: z.array(vec3Z).optional(),
    config: z.object({
      tool_diameter_mm: optNum,
    }).passthrough().optional(),
    num_passes: z.number().int().positive().optional(),
  }).passthrough(),
  z.object({
    strategy: z.literal("thread_mill"),
    center: vec3Z.optional(),
    config: z.object({
      thread_diameter_mm: optNum,
      pitch_mm: optNum,
      depth_mm: optNum,
      hand: z.enum(["right", "left"]).optional(),
      tool_diameter_mm: optNum,
    }).passthrough().optional(),
  }).passthrough(),
  z.object({
    strategy: z.literal("chamfer"),
    edges: z.array(z.object({
      start: vec3Z,
      end: vec3Z,
    })).optional(),
    config: z.object({
      chamfer_width_mm: optNum,
      chamfer_angle_deg: optNum,
      tool_diameter_mm: optNum,
    }).passthrough().optional(),
  }).passthrough(),
]);

// ============================================================================
// 8. cam_smart_tool
// ============================================================================

const cam_smart_tool = z.object({
  feature_type: z.string(),
  material: z.string(),
  diameter_range_mm: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  depth_mm: optNum,
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  material_hardness_hrc: optNum,
  tolerance_mm: optNum,
  surface_finish_Ra: optNum,
  machine_name: optStr,
  max_rpm: optNum,
  operation_type: optStr,
  top_n: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// 9. cam_verify
// ============================================================================

const cam_verify = z.object({
  gcode: optStr,
  segments: z.array(z.object({
    start: vec3Z,
    end: vec3Z,
  }).passthrough()).optional(),
  machine: optStr,
  tool: toolObjectZ.optional(),
  check_collision: optBool,
  check_physics: optBool,
  check_safety: optBool,
  check_cpk: optBool,
  tolerance_mm: optNum,
}).passthrough();

// ============================================================================
// 10. cam_chatter_rpm
// ============================================================================

const cam_chatter_rpm = z.object({
  rpm_range: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  rpm_min: optNum,
  rpm_max: optNum,
  tooth_count: z.number().int().positive().optional(),
  tool_flutes: z.number().int().positive().optional(),
  natural_freqs: z.array(z.number().positive()).optional(),
  natural_frequencies_hz: z.array(z.number().positive()).optional(),
  axial_depth_mm: optNum,
  radial_depth_mm: optNum,
  material: optStr,
  num_samples: z.number().int().positive().optional(),
  p_chatter_max: z.number().min(0).max(1).optional(),
}).passthrough();

// ============================================================================
// 11. cam_cost_feature
// ============================================================================

const cam_cost_feature = z.object({
  segments: z.array(z.object({
    start: vec3Z,
    end: vec3Z,
    feed_mm_min: optNum,
    move_type: optStr,
  }).passthrough()).optional(),
  config: z.object({
    hourly_rate: z.number().positive().optional(),
    tool_cost: z.number().min(0).optional(),
    machine_rate_per_hour: z.number().positive().optional(),
    material_cost_per_kg: z.number().min(0).optional(),
    overhead_rate: z.number().min(0).optional(),
    batch_size: z.number().int().positive().optional(),
  }).passthrough().optional(),
}).passthrough();

// ============================================================================
// 12. cam_intelligent_sequence
// ============================================================================

const operationZ = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  operation: z.string().optional(),
  tool_number: z.number().int().optional(),
  feature_type: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  priority: z.number().optional(),
  setup: z.number().int().optional(),
}).passthrough();

const cam_intelligent_sequence = z.object({
  operations: z.array(operationZ),
  optimize_for: z.enum(["tool_changes", "setup_changes", "cycle_time", "balanced"]).optional(),
  group_by_tool: optBool,
  respect_dependencies: optBool,
}).passthrough();

// ============================================================================
// 13. cam_list_actions
// ============================================================================

const cam_list_actions = z.object({}).passthrough();

// ============================================================================
// Export
// ============================================================================

export const ACTION_CAM_KERNEL_SCHEMAS: ActionSchemaMap = {
  cam_unified_generate,
  cam_complex_generate,
  cam_production_toolpath,
  cam_multi_process,
  cam_mill_turn,
  cam_5axis_convert,
  cam_advanced_strategy,
  cam_smart_tool,
  cam_verify,
  cam_chatter_rpm,
  cam_cost_feature,
  cam_intelligent_sequence,
  cam_list_actions,
};
