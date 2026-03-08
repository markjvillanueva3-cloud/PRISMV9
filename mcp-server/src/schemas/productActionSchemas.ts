/**
 * Product Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for all 40 prism_product actions.
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
  // PPG (10)
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
