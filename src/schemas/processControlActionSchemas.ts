/**
 * Process Control Dispatcher Action Schemas
 * ==========================================
 * Per-action Zod schemas for all 6 prism_process_control actions.
 * CTC (Cycle-to-Control), SPC (EWMA/CUSUM), DOE (factorial analysis).
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/processControlActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const dataArray = z.array(z.number()).min(3);

// ============================================================================
// ctc_analyze — CycleToControlEngine.analyzeCtCControl
// ============================================================================

const ctc_analyze = z.object({
  process_gain_Kp: posNum,
  controller_gain_Kc: posNum,
  controller_type: z.enum(["EWMA", "double_EWMA", "PID"]).optional(),
  target_value: optNum,
  process_noise_sigma: optPosNum,
  correlation_coefficient: z.number().min(-1).max(1).optional(),
  num_cycles: z.number().int().min(1).optional(),
}).passthrough();

// ============================================================================
// ctc_optimal_gain — CycleToControlEngine.findOptimalGain
// ============================================================================

const ctc_optimal_gain = z.object({
  process_gain_Kp: posNum,
  controller_type: z.enum(["EWMA", "double_EWMA", "PID"]).optional(),
  correlation_coefficient: z.number().min(-1).max(1).optional(),
}).passthrough();

// ============================================================================
// ctc_autocorrelation — CycleToControlEngine.analyzeAutocorrelation
// ============================================================================

const ctc_autocorrelation = z.object({
  data: dataArray.optional(),
  measurements: dataArray.optional(),
  maxLag: z.number().int().min(1).max(100).optional(),
  max_lag: z.number().int().min(1).max(100).optional(),
}).passthrough();

// ============================================================================
// spc_ewma — SPCChartingEngine.computeEWMA
// ============================================================================

const spc_ewma = z.object({
  data: dataArray,
  lambda: z.number().min(0.01).max(1),
  subgroup_size: z.number().int().min(1).optional(),
  L: z.number().min(1).max(5).optional(),
  target_mean: optNum,
  target_sigma: optPosNum,
}).passthrough();

// ============================================================================
// spc_cusum — SPCChartingEngine.computeCUSUM
// ============================================================================

const spc_cusum = z.object({
  data: dataArray,
  target_mean: optNum,
  target_sigma: optPosNum,
  subgroup_size: z.number().int().min(1).optional(),
  k_sigma: z.number().min(0.1).max(5).optional(),
  h_sigma: z.number().min(1).max(20).optional(),
}).passthrough();

// ============================================================================
// doe_analyze — DOEAnalysisEngine
// ============================================================================

const doe_analyze = z.object({
  factors: z.array(z.object({ name: z.string().optional(), levels: z.array(z.union([z.string(), z.number()])).optional() }).passthrough()).min(1).optional(),
  factor_names: z.array(z.string()).min(1).optional(),
  runs: z.array(z.object({ levels: z.array(z.number()), response: z.number(), replicate: z.number().optional() }).passthrough()).optional(),
  fractional: z.boolean().optional(),
  alpha: z.number().min(0.001).max(0.5).optional(),
  include_interactions: z.boolean().optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const PROCESS_CONTROL_ACTION_SCHEMAS: ActionSchemaMap = {
  ctc_analyze,
  ctc_optimal_gain,
  ctc_autocorrelation,
  spc_ewma,
  spc_cusum,
  doe_analyze,
};
