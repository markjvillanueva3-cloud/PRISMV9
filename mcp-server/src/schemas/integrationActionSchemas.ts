/**
 * Integration Dispatcher Action Schemas
 * ======================================
 * Per-action Zod schemas for all 42 prism_integration actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/integrationActionSchemas
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
// CAM Integration (6)
// ============================================================================

const cam_recommend = z.object({
  material: optStr,
  operation: optStr,
  feature: optStr,
  machine: optStr,
  cam_system: optStr,
  response_level: responseLevel,
}).passthrough();

const cam_export = z.object({
  operation_id: optStr,
  target_system: z.string().min(1),
  format: optStr,
  response_level: responseLevel,
}).passthrough();

const cam_analyze_op = z.object({
  operation_id: optStr,
  cam_system: optStr,
  parameters: z.record(z.string(), z.unknown()).optional(),
  response_level: responseLevel,
}).passthrough();

const cam_tool_library = z.object({
  cam_system: optStr,
  tool_type: optStr,
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const cam_tool_get = z.object({
  tool_id: z.string().min(1),
  cam_system: optStr,
}).passthrough();

const cam_systems = z.object({
  filter: optStr,
}).passthrough();

// ============================================================================
// DNC Transfer (8)
// ============================================================================

const dnc_generate = z.object({
  material: optStr,
  operation: optStr,
  machine: optStr,
  controller: optStr,
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const dnc_send = z.object({
  program_number: z.union([z.string(), z.number()]),
  machine: z.string().min(1),
  controller: optStr,
}).passthrough();

const dnc_compare = z.object({
  program_a: z.union([z.string(), z.number()]),
  program_b: z.union([z.string(), z.number()]),
}).passthrough();

const dnc_verify = z.object({
  program_number: z.union([z.string(), z.number()]),
  controller: optStr,
}).passthrough();

const dnc_qr = z.object({
  program_number: z.union([z.string(), z.number()]),
  data: optStr,
}).passthrough();

const dnc_systems = z.object({
  filter: optStr,
}).passthrough();

const dnc_history = z.object({
  machine: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const dnc_get = z.object({
  transfer_id: z.string().min(1),
}).passthrough();

// ============================================================================
// ERP Integration (10)
// ============================================================================

const erp_import_wo = z.object({
  wo_number: z.string().min(1),
  erp_system: optStr,
}).passthrough();

const erp_get_plan = z.object({
  wo_number: z.string().min(1),
}).passthrough();

const erp_cost_feedback = z.object({
  wo_number: z.string().min(1),
  actual_cost: optPosNum,
  actual_time_min: optPosNum,
}).passthrough();

const erp_cost_history = z.object({
  wo_number: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const erp_quality_import = z.object({
  wo_number: z.string().min(1),
  measurements: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const erp_quality_history = z.object({
  wo_number: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const erp_tool_inventory = z.object({
  tool_type: optStr,
  manufacturer: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const erp_tool_update = z.object({
  tool_id: z.string().min(1),
  available: z.boolean(),
  quantity: z.number().int().nonnegative().optional(),
}).passthrough();

const erp_systems = z.object({
  filter: optStr,
}).passthrough();

const erp_wo_list = z.object({
  status: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// Mobile Interface (8)
// ============================================================================

const mobile_lookup = z.object({
  material: optStr,
  operation: optStr,
  tool: optStr,
  machine: optStr,
}).passthrough();

const mobile_voice = z.object({
  utterance: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const mobile_alarm = z.object({
  code: z.union([z.string(), z.number()]),
  controller: optStr,
  machine: optStr,
}).passthrough();

const mobile_timer_start = z.object({
  duration_min: z.number().positive(),
  label: optStr,
  machine: optStr,
}).passthrough();

const mobile_timer_check = z.object({
  timer_id: z.string().min(1),
}).passthrough();

const mobile_timer_reset = z.object({
  timer_id: z.string().min(1),
}).passthrough();

const mobile_timer_list = z.object({
  machine: optStr,
  active_only: optBool,
}).passthrough();

const mobile_cache = z.object({
  operation: z.enum(["get", "clear", "stats"]).optional(),
}).passthrough();

// ============================================================================
// Measurement Integration (10)
// ============================================================================

const measure_cmm_import = z.object({
  report_data: z.record(z.string(), z.unknown()),
  format: z.enum(["dmis", "qdas", "csv", "json"]).optional(),
  machine: optStr,
}).passthrough();

const measure_cmm_history = z.object({
  part_number: optStr,
  machine: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const measure_cmm_get = z.object({
  report_id: z.string().min(1),
}).passthrough();

const measure_surface = z.object({
  measurement_data: z.record(z.string(), z.unknown()),
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const measure_surface_history = z.object({
  part_number: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const measure_probe_record = z.object({
  machine: z.string().min(1),
  feature: z.string().min(1),
  nominal: z.number(),
  actual: z.number(),
  tolerance: optPosNum,
}).passthrough();

const measure_probe_drift = z.object({
  machine: z.string().min(1),
  feature: z.string().min(1),
  window: z.number().int().positive().optional(),
}).passthrough();

const measure_probe_history = z.object({
  machine: optStr,
  feature: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const measure_bias_detect = z.object({
  machine: z.string().min(1),
  features: optStrArr,
}).passthrough();

const measure_summary = z.object({
  machine: optStr,
  part_number: optStr,
}).passthrough();

// ============================================================================
// E2 Shop System (7)
// ============================================================================

const e2_connect = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_import_wo = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  work_order_no: z.string().optional().describe("Work order number to import"),
  wo: z.string().optional().describe("Work order number (alias)"),
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_import_batch = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  status: optStr,
  from_date: optStr,
  to_date: optStr,
  limit: optNum,
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_export_plan = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  work_order_no: z.string().optional().describe("Work order number"),
  wo: z.string().optional().describe("Work order number (alias)"),
  steps: z.array(z.object({
    step_no: z.number(),
    setup_min: optNum,
    run_min_per_part: optNum,
    tools: optStr,
    notes: optStr,
  })).optional(),
  optimized_steps: z.array(z.any()).optional(),
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_sync_inventory = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_get_time_tracking = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  work_order_no: optStr,
  wo: optStr,
  from_date: optStr,
  to_date: optStr,
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

const e2_get_job_status = z.object({
  base_url: z.string().describe("E2 server URL"),
  api_key: z.string().describe("E2 API key"),
  work_order_no: z.string().optional().describe("Work order number"),
  wo: z.string().optional().describe("Work order number (alias)"),
  timeout_ms: optNum,
  company_id: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP — 49 actions
// ============================================================================

export const ACTION_INTEGRATION_SCHEMAS: ActionSchemaMap = {
  // CAM (6)
  cam_recommend,
  cam_export,
  cam_analyze_op,
  cam_tool_library,
  cam_tool_get,
  cam_systems,
  // DNC (8)
  dnc_generate,
  dnc_send,
  dnc_compare,
  dnc_verify,
  dnc_qr,
  dnc_systems,
  dnc_history,
  dnc_get,
  // ERP (10)
  erp_import_wo,
  erp_get_plan,
  erp_cost_feedback,
  erp_cost_history,
  erp_quality_import,
  erp_quality_history,
  erp_tool_inventory,
  erp_tool_update,
  erp_systems,
  erp_wo_list,
  // Mobile (8)
  mobile_lookup,
  mobile_voice,
  mobile_alarm,
  mobile_timer_start,
  mobile_timer_check,
  mobile_timer_reset,
  mobile_timer_list,
  mobile_cache,
  // Measurement (10)
  measure_cmm_import,
  measure_cmm_history,
  measure_cmm_get,
  measure_surface,
  measure_surface_history,
  measure_probe_record,
  measure_probe_drift,
  measure_probe_history,
  measure_bias_detect,
  measure_summary,
  // E2 Shop System (7)
  e2_connect,
  e2_import_wo,
  e2_import_batch,
  e2_export_plan,
  e2_sync_inventory,
  e2_get_time_tracking,
  e2_get_job_status,
};
