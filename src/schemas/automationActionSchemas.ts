/**
 * Automation Dispatcher Action Schemas
 * ======================================
 * Per-action Zod schemas for all 5 prism_automation actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/automationActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// oee_calc — forwarded to OEECalculatorEngine.calculate()
// ============================================================================

const oee_calc = z.object({
  machine_id: z.string().optional().describe("Machine identifier"),
  planned_production_time_min: z.number().positive().optional().describe("Planned production time in minutes"),
  actual_run_time_min: z.number().nonnegative().optional().describe("Actual run time in minutes"),
  ideal_cycle_time_sec: z.number().positive().optional().describe("Ideal cycle time in seconds"),
  total_parts: z.number().int().nonnegative().optional().describe("Total parts produced"),
  good_parts: z.number().int().nonnegative().optional().describe("Good parts produced"),
  downtime_min: z.number().nonnegative().optional().describe("Total downtime in minutes"),
}).passthrough();

// ============================================================================
// bottleneck — forwarded to BottleneckIdentificationEngine
// ============================================================================

const bottleneck = z.object({
  machines: z.array(z.object({
    id: z.string().optional(),
    utilization_pct: z.number().optional(),
    queue_length: z.number().optional(),
  }).passthrough()).optional().describe("Machines to analyze"),
  threshold_pct: z.number().min(0).max(100).optional().describe("Bottleneck threshold percentage"),
}).passthrough();

// ============================================================================
// digital_thread — forwarded to DigitalThreadEngine.trace()
// ============================================================================

const digital_thread = z.object({
  part_id: z.string().optional().describe("Part identifier to trace"),
  trace_type: z.string().optional().describe("Type of trace (full, material, process)"),
  depth: z.number().int().positive().optional().describe("Trace depth"),
}).passthrough();

// ============================================================================
// work_instructions — forwarded to DigitalWorkInstructionEngine.generate()
// ============================================================================

const work_instructions = z.object({
  operation: z.string().optional().describe("Operation name"),
  machine_id: z.string().optional().describe("Target machine"),
  part_id: z.string().optional().describe("Part identifier"),
  format: z.string().optional().describe("Output format"),
}).passthrough();

// ============================================================================
// shift_handoff — forwarded to ShiftHandoffEngine.generate()
// ============================================================================

const shift_handoff = z.object({
  shift_id: z.string().optional().describe("Current shift identifier"),
  machine_ids: z.array(z.string()).optional().describe("Machines to include in handoff"),
  include_oee: z.boolean().optional().describe("Include OEE data in handoff"),
}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_AUTOMATION_SCHEMAS: ActionSchemaMap = {
  oee_calc,
  bottleneck,
  digital_thread,
  work_instructions,
  shift_handoff,
};
