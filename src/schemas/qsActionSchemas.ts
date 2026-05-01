/**
 * QS-MS6 Action Schemas — Quality & Science Verification
 * =======================================================
 * 10 actions across 4 engines:
 *   PhysicsVerificationEngine: physics_verify
 *   WhatIfAnalysisEngine: what_if_analyze
 *   PhysicsCalibrationEngine: calibrate_physics, get_calibrated_constants, calibration_status, calibration_reset
 *   ConsistencyCheckEngine: consistency_check, consistency_history, consistency_summary, consistency_clear
 *
 * @module schemas/qsActionSchemas
 * @version 1.0.0
 * @milestone QS-MS6
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();

// ============================================================================
// PHYSICS VERIFICATION (1 action)
// ============================================================================

/** physics_verify — Cross-check cutting parameters against physics models */
const physics_verify = z.object({
  material: z.string(),
  tool_diameter_mm: z.number(),
  flutes: z.number().int().positive().optional().default(4),
  operation: optStr,
  cut_type: optStr,
  ap_mm: optNum,
  ae_mm: optNum,
  spindle_rpm: optNum,
  feed_rate_mmmin: optNum,
}).passthrough();

// ============================================================================
// WHAT-IF ANALYSIS (1 action)
// ============================================================================

/** Shared shape for base/change parameter objects */
const whatIfParams = z.object({
  material: optStr,
  tool_diameter_mm: optNum,
  flutes: optNum,
  operation: optStr,
  cut_type: optStr,
  ap_mm: optNum,
  ae_mm: optNum,
  machine: optStr,
  coolant: optStr,
}).passthrough();

/** what_if_analyze — Compare baseline vs changed parameters */
const what_if_analyze = z.object({
  base: whatIfParams.optional(),
  change: whatIfParams.optional(),
  analyses: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// PHYSICS CALIBRATION (4 actions)
// ============================================================================

/** calibrate_physics — Submit measured data to calibrate physics constants */
const calibrate_physics = z.object({
  material: z.string(),
  tool_diameter_mm: z.number(),
  flutes: optNum,
  ap_mm: optNum,
  ae_mm: optNum,
  fz_mm: optNum,
  cutting_speed_mpm: optNum,
  spindle_rpm: optNum,
  measured_force_N: optNum,
  measured_Ra_um: optNum,
  measured_tool_life_min: optNum,
  measured_power_kW: optNum,
  machine_id: optStr,
  tool_material: optStr,
  coolant: optStr,
}).passthrough();

/** get_calibrated_constants — Retrieve calibrated physics constants for a material */
const get_calibrated_constants = z.object({
  material: z.string(),
  machine_id: optStr,
}).passthrough();

/** calibration_status — Check calibration state and confidence */
const calibration_status = z.object({
  material: optStr,
  machine_id: optStr,
}).passthrough();

/** calibration_reset — Reset calibration data */
const calibration_reset = z.object({
  material: optStr,
  machine_id: optStr,
  confirm: z.boolean(),
}).passthrough();

// ============================================================================
// CONSISTENCY CHECK (4 actions)
// ============================================================================

/** consistency_check — Validate pipeline result consistency */
const consistency_check = z.object({
  pipeline_name: z.string(),
  result: z.record(z.string(), z.number()),
  material: optStr,
  tool_diameter_mm: optNum,
  flutes: optNum,
  ap_mm: optNum,
  ae_mm: optNum,
}).passthrough();

/** consistency_history — Retrieve consistency check history */
const consistency_history = z.object({}).passthrough();

/** consistency_summary — Get aggregated consistency summary */
const consistency_summary = z.object({}).passthrough();

/** consistency_clear — Clear consistency check history */
const consistency_clear = z.object({
  confirm: z.boolean(),
}).passthrough();

// ============================================================================
// EXPORT: qsActionSchemas
// ============================================================================

export const qsActionSchemas: ActionSchemaMap = {
  // Physics Verification
  physics_verify,
  // What-If Analysis
  what_if_analyze,
  // Physics Calibration
  calibrate_physics,
  get_calibrated_constants,
  calibration_status,
  calibration_reset,
  // Consistency Check
  consistency_check,
  consistency_history,
  consistency_summary,
  consistency_clear,
};
