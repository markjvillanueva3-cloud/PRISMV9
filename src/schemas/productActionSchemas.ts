/**
 * Product Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for all 53 prism_product actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/productActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();
const optStrArr = z.array(z.string()).optional();
const responseLevel = z.enum(["minimal", "summary", "full"]).optional();

// ============================================================================
// SFC — Surface Finish Calculator (10)
// ============================================================================

const sfc_calculate = z.object({
  material: z.string().min(1),
  operation: optStr,
  tool_diameter: optPosNum,
  feed_per_tooth: optPosNum,
  cutting_speed: optPosNum,
  axial_depth: optPosNum,
  radial_depth: optPosNum,
  nose_radius: optPosNum,
  number_of_teeth: z.number().int().positive().optional(),
  response_level: responseLevel,
}).passthrough();

const sfc_compare = z.object({
  material: z.string().min(1),
  approaches: z.array(z.record(z.string(), z.unknown())).optional(),
  operation: optStr,
}).passthrough();

const sfc_optimize = z.object({
  material: z.string().min(1),
  objective: z.enum(["roughness", "mrr", "cost", "tool_life"]).optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const sfc_quick = z.object({
  material: z.string().min(1),
  operation: optStr,
}).passthrough();

const sfc_materials = z.object({
  filter: optStr,
  iso_group: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const sfc_tools = z.object({
  tool_type: optStr,
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const sfc_formulas = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const sfc_safety = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  material: optStr,
}).passthrough();

const sfc_history = z.object({
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const sfc_get = z.object({
  product_id: optStr,
}).passthrough();

// ============================================================================
// PPG — Post Processor Generator (10)
// ============================================================================

const ppg_validate = z.object({
  gcode: z.string().min(1),
  controller: optStr,
}).passthrough();

const ppg_translate = z.object({
  gcode: z.string().min(1),
  source_controller: z.string().min(1),
  target_controller: z.string().min(1),
}).passthrough();

const ppg_templates = z.object({
  controller: optStr,
  operation: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const ppg_generate = z.object({
  controller: z.string().min(1),
  operation: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const ppg_controllers = z.object({
  filter: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const ppg_compare = z.object({
  operation: z.string().min(1),
  controllers: z.array(z.string()).optional(),
}).passthrough();

const ppg_syntax = z.object({
  controller: z.string().min(1),
}).passthrough();

const ppg_batch = z.object({
  gcode: z.string().min(1),
  source_controller: z.string().min(1),
  target_controllers: z.array(z.string().min(1)),
}).passthrough();

const ppg_history = z.object({
  controller: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const ppg_get = z.object({
  product_id: optStr,
}).passthrough();

const ppg_feature_select = z.object({
  controller: optStr,
  machine: z.record(z.string(), z.unknown()).optional(),
  material_iso_group: optStr,
  iso_group: optStr,
  operation_type: optStr,
  cam_source: optStr,
  complexity: optStr,
  tolerance_mm: optPosNum,
  tool_count: z.number().int().positive().optional(),
  production_volume: optStr,
}).passthrough();

const ppg_prove_out = z.object({
  gcode: z.string().min(1).describe("G-code program to convert to prove-out mode"),
  machine: z.record(z.string(), z.unknown()).optional().describe("Machine context"),
  material: z.record(z.string(), z.unknown()).optional().describe("Material context"),
  config: z.record(z.string(), z.unknown()).optional().describe("Prove-out configuration"),
}).passthrough();

const ppg_validate_limits = z.object({
  gcode: z.string().min(1).describe("G-code program to validate"),
  machine: z.record(z.string(), z.unknown()).optional().describe("Machine envelope"),
  check_envelope_only: optBool,
  skip_info: optBool,
}).passthrough();

const ppg_validation_report = z.object({
  gcode: z.string().min(1).describe("G-code program to validate"),
  machine: z.record(z.string(), z.unknown()).optional(),
  format: z.enum(["text", "json", "html"]).optional(),
  include_recommendations: optBool,
  program_name: optStr,
}).passthrough();

const ppg_library_search = z.object({
  query: optStr.describe("Search query for post library"),
  machine: optStr,
}).passthrough();

const ppg_library_detail = z.object({
  post_id: z.string().min(1).describe("Post ID to retrieve details"),
  machine: optStr,
}).passthrough();

const ppg_version_store = z.object({
  version: z.record(z.string(), z.unknown()).describe("Version data to store"),
}).passthrough();

const ppg_version_diff = z.object({
  hash_a: z.string().min(1).describe("First version hash"),
  hash_b: z.string().min(1).describe("Second version hash"),
  machine_id: optStr,
}).passthrough();

const ppg_benchmark_report = z.object({
  gcode: z.string().min(1).describe("G-code program to benchmark"),
  machine: z.record(z.string(), z.unknown()).optional(),
  material: z.record(z.string(), z.unknown()).optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  controller: optStr,
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const ppg_optimization_report = z.object({
  gcode: z.string().min(1).describe("G-code program to optimize and report on"),
  machine: z.record(z.string(), z.unknown()).optional(),
  material: z.record(z.string(), z.unknown()).optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  controller: optStr,
  aggressiveness: z.number().min(0).max(1).optional(),
  tolerance_mm: optPosNum,
  surface_finish_Ra: optPosNum,
  format: z.enum(["markdown", "json", "html"]).optional(),
  program_name: optStr,
}).passthrough();

const ppg_setup_sheet_auto = z.object({
  gcode: z.string().min(1).describe("G-code program to extract setup sheet from"),
  controller: optStr.describe("Controller type (fanuc, siemens, haas, etc.)"),
  part_number: optStr.describe("Part number for the setup sheet header"),
  operation_name: optStr.describe("Operation name (e.g., OP10, Roughing)"),
  machine_name: optStr.describe("Machine name for the setup sheet header"),
  machine: z.record(z.string(), z.unknown()).optional().describe("Machine context object"),
  include_tool_list: optBool.describe("Include tool list in setup sheet"),
  include_offsets: optBool.describe("Include work offsets in setup sheet"),
  include_safety: optBool.describe("Include safety notes in setup sheet"),
  operator: optStr.describe("Operator name for the setup sheet"),
}).passthrough();

const ppg_cycle_time = z.object({
  gcode: z.string().min(1).describe("G-code program to estimate cycle time for"),
  controller: optStr.describe("Controller type (fanuc, haas, siemens, etc.)"),
  machine_profile: optStr.describe("Built-in machine profile name (e.g., haas_vf2)"),
  kinematics_override: z.record(z.string(), z.unknown()).optional().describe("Override default kinematics"),
  include_breakdown: optBool.describe("Include per-tool time breakdown"),
  path_tolerance: optPosNum.describe("Path tolerance in mm for corner decel calculation"),
  model_look_ahead: optBool.describe("Model look-ahead buffer effects"),
}).passthrough();

const ppg_cycle_time_compare = z.object({
  gcode: z.string().min(1).describe("G-code program to compare across machines"),
  machines: z.array(z.object({
    name: z.string().min(1).describe("Machine name"),
    controller: optStr.describe("Controller type"),
    machine_profile: optStr.describe("Built-in machine profile name"),
    kinematics_override: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).min(2).describe("List of machines to compare (minimum 2)"),
}).passthrough();

// ============================================================================
// Shop Manager (10)
// ============================================================================

const shop_job = z.object({
  material: z.string().min(1),
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  machine: optStr,
}).passthrough();

const shop_cost = z.object({
  material: z.string().min(1),
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  batch_size: z.number().int().positive().optional(),
  machine_rate: optPosNum,
}).passthrough();

const shop_quote = z.object({
  material: z.string().min(1),
  quantity: z.number().int().positive(),
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  markup_pct: optNum,
}).passthrough();

const shop_schedule = z.object({
  jobs: z.array(z.record(z.string(), z.unknown())),
  machines: optStrArr,
  priority: z.enum(["makespan", "utilization", "due_date"]).optional(),
}).passthrough();

const shop_dashboard = z.object({
  machine_ids: optStrArr,
  time_range: optStr,
}).passthrough();

const shop_report = z.object({
  job_id: optStr,
  report_type: z.enum(["cost", "quality", "sustainability", "full"]).optional(),
}).passthrough();

const shop_compare = z.object({
  scenarios: z.array(z.record(z.string(), z.unknown())),
}).passthrough();

const shop_materials = z.object({
  filter: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const shop_history = z.object({
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const shop_get = z.object({
  product_id: optStr,
}).passthrough();

// ============================================================================
// ACNC — Adaptive CNC (10)
// ============================================================================

const acnc_program = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  machine: optStr,
  controller: optStr,
}).passthrough();

const acnc_feature = z.object({
  feature: z.string().min(1),
  material: optStr,
  dimensions: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const acnc_simulate = z.object({
  program_id: optStr,
  gcode: optStr,
  machine: optStr,
}).passthrough();

const acnc_output = z.object({
  program_id: optStr,
  controller: z.string().min(1),
  format: optStr,
}).passthrough();

const acnc_tools = z.object({
  material: optStr,
  feature: optStr,
  operation: optStr,
}).passthrough();

const acnc_strategy = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  objectives: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const acnc_validate = z.object({
  program_id: optStr,
  gcode: optStr,
  controller: optStr,
}).passthrough();

const acnc_batch = z.object({
  programs: z.array(z.record(z.string(), z.unknown())),
}).passthrough();

const acnc_history = z.object({
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const acnc_get = z.object({
  product_id: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP — 40 actions
// ============================================================================

export const ACTION_PRODUCT_SCHEMAS: ActionSchemaMap = {
  // SFC (10)
  sfc_calculate,
  sfc_compare,
  sfc_optimize,
  sfc_quick,
  sfc_materials,
  sfc_tools,
  sfc_formulas,
  sfc_safety,
  sfc_history,
  sfc_get,
  // PPG (23)
  ppg_validate,
  ppg_translate,
  ppg_templates,
  ppg_generate,
  ppg_controllers,
  ppg_compare,
  ppg_syntax,
  ppg_batch,
  ppg_history,
  ppg_get,
  ppg_feature_select,
  ppg_prove_out,
  ppg_validate_limits,
  ppg_validation_report,
  ppg_library_search,
  ppg_library_detail,
  ppg_version_store,
  ppg_version_diff,
  ppg_benchmark_report,
  ppg_optimization_report,
  ppg_setup_sheet_auto,
  ppg_cycle_time,
  ppg_cycle_time_compare,
  // Shop Manager (10)
  shop_job,
  shop_cost,
  shop_quote,
  shop_schedule,
  shop_dashboard,
  shop_report,
  shop_compare,
  shop_materials,
  shop_history,
  shop_get,
  // ACNC (10)
  acnc_program,
  acnc_feature,
  acnc_simulate,
  acnc_output,
  acnc_tools,
  acnc_strategy,
  acnc_validate,
  acnc_batch,
  acnc_history,
  acnc_get,
};
