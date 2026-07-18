/**
 * L2 Engine Dispatcher Action Schemas
 * =====================================
 * Per-action Zod schemas for all prism_l2 actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/l2EngineActionSchemas
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

// ============================================================================
// AI/ML ENGINE (5)
// ============================================================================

const aiml_predict = z.object({
  model_id: optStr,
  features: z.record(z.string(), z.unknown()).optional(),
  input: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const aiml_classify = z.object({
  query: optStr,
  text: optStr,
}).passthrough();

const aiml_anomaly = z.object({
  features: z.record(z.string(), z.unknown()).optional(),
  model_id: z.string().optional(),
}).passthrough();

const aiml_cluster = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  k: z.number().int().optional(),
}).passthrough();

const aiml_models = z.object({
  domain: optStr,
}).passthrough();

// ============================================================================
// CAD KERNEL ENGINE (4)
// ============================================================================

const cad_geometry = z.object({
  operation: optStr,
  op: optStr,
  points: z.array(z.record(z.string(), z.number())).optional(),
  point: z.record(z.string(), z.number()).optional(),
  polygon: z.array(z.record(z.string(), z.number())).optional(),
  a: z.record(z.string(), z.unknown()).optional(),
  b: z.record(z.string(), z.unknown()).optional(),
  ray: z.record(z.string(), z.unknown()).optional(),
  aabb: z.record(z.string(), z.unknown()).optional(),
  triangle: z.record(z.string(), z.unknown()).optional(),
  line_start: z.record(z.string(), z.number()).optional(),
  line_end: z.record(z.string(), z.number()).optional(),
  plane_normal: z.record(z.string(), z.number()).optional(),
  plane_d: optNum,
}).passthrough();

const cad_mesh = z.object({
  operation: optStr,
  op: optStr,
  width: optNum,
  height: optNum,
  depth: optNum,
  radius: optNum,
  segments: z.number().int().optional(),
  mesh: z.record(z.string(), z.unknown()).optional(),
  a: z.record(z.string(), z.number()).optional(),
  b: z.record(z.string(), z.number()).optional(),
  c: z.record(z.string(), z.number()).optional(),
}).passthrough();

const cad_curve = z.object({
  operation: optStr,
  op: optStr,
  curve: z.record(z.string(), z.unknown()).optional(),
  t: optNum,
  samples: z.number().int().optional(),
}).passthrough();

const cad_capabilities = z.object({}).passthrough();

// ============================================================================
// CAM KERNEL ENGINE (5)
// ============================================================================

const cam_toolpath = z.object({
  operation: optStr,
  type: optStr,
  tool: z.record(z.string(), z.unknown()).optional(),
  material: optStr,
  feature_width: optNum,
  depth: optNum,
}).passthrough();

const cam_gcode = z.object({
  program: z.record(z.string(), z.unknown()).optional(),
  moves: z.array(z.record(z.string(), z.unknown())).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const cam_collision = z.object({
  tool: z.record(z.string(), z.unknown()).optional(),
  holder: z.record(z.string(), z.unknown()).optional(),
  stock: z.record(z.string(), z.unknown()).optional(),
  moves: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const cam_chip_thinning = z.object({
  programmed_chipload: z.number().optional(),
  radial_depth: z.number().optional(),
  tool_diameter: z.number().optional(),
}).passthrough();

const cam_capabilities = z.object({}).passthrough();

// ============================================================================
// FILE I/O ENGINE (3)
// ============================================================================

const file_parse = z.object({
  content: z.string().optional(),
  format: optStr,
}).passthrough();

const file_generate = z.object({
  format: optStr,
  name: optStr,
  triangles: z.array(z.record(z.string(), z.unknown())).optional(),
  entities: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const file_formats = z.object({}).passthrough();

// ============================================================================
// SIMULATION ENGINE (4)
// ============================================================================

const sim_gcode = z.object({
  gcode: optStr,
  lines: z.array(z.string()).optional(),
}).passthrough();

const sim_cycle_time = z.object({
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  rapid_rate: optNum,
  feed_rate: optNum,
}).passthrough();

const sim_verify = z.object({
  toolpath: z.record(z.string(), z.unknown()).optional(),
  stock: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const sim_capabilities = z.object({}).passthrough();

// ============================================================================
// VISUALIZATION ENGINE (4)
// ============================================================================

const viz_scene = z.object({
  objects: z.array(z.record(z.string(), z.unknown())).optional(),
  camera: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const viz_toolpath = z.object({
  moves: z.array(z.record(z.string(), z.unknown())).optional(),
  color_mode: z.string().optional(),
}).passthrough();

const viz_heatmap = z.object({
  type: optStr,
  min: optNum,
  max: optNum,
  unit: optStr,
}).passthrough();

const viz_presets = z.object({}).passthrough();

// ============================================================================
// REPORT ENGINE (7)
// ============================================================================

const report_setup_sheet = z.object({
  job_id: optStr,
  part_number: optStr,
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const report_cost = z.object({
  material_cost: optNum,
  labor_cost: optNum,
  overhead_cost: optNum,
}).passthrough();

const report_tool_list = z.object({
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const report_speed_feed = z.object({
  material: optStr,
  tool_type: optStr,
  tool_diameter: optNum,
}).passthrough();

const report_alarm = z.object({
  alarm_code: optStr,
  controller: optStr,
}).passthrough();

const report_inspection = z.object({
  part_number: optStr,
  characteristics: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const report_templates = z.object({}).passthrough();

// ============================================================================
// SETTINGS ENGINE (6)
// ============================================================================

const settings_get = z.object({
  user_id: optStr,
}).passthrough();

const settings_update = z.object({
  user_id: optStr,
  settings: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const settings_convert = z.object({
  results: z.record(z.string(), z.unknown()).optional(),
  from_system: optStr,
  user_id: optStr,
  value: optNum,
  from: optStr,
  to: optStr,
  category: optStr,
}).passthrough();

const settings_presets = z.object({
  user_id: optStr,
}).passthrough();

const settings_safety = z.object({
  check: z.record(z.string(), z.unknown()).optional(),
  user_id: optStr,
}).passthrough();

const settings_apply_preset = z.object({
  preset_id: optStr,
  base_params: z.record(z.string(), z.unknown()).optional(),
  user_id: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_L2_ENGINE_SCHEMAS: ActionSchemaMap = {
  // AI/ML
  aiml_predict,
  aiml_classify,
  aiml_anomaly,
  aiml_cluster,
  aiml_models,
  // CAD Kernel
  cad_geometry,
  cad_mesh,
  cad_curve,
  cad_capabilities,
  // CAM Kernel
  cam_toolpath,
  cam_gcode,
  cam_collision,
  cam_chip_thinning,
  cam_capabilities,
  // File I/O
  file_parse,
  file_generate,
  file_formats,
  // Simulation
  sim_gcode,
  sim_cycle_time,
  sim_verify,
  sim_capabilities,
  // Visualization
  viz_scene,
  viz_toolpath,
  viz_heatmap,
  viz_presets,
  // Reports
  report_setup_sheet,
  report_cost,
  report_tool_list,
  report_speed_feed,
  report_alarm,
  report_inspection,
  report_templates,
  // Settings
  settings_get,
  settings_update,
  settings_convert,
  settings_presets,
  settings_safety,
  settings_apply_preset,
};
