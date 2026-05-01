/**
 * Scientific Validation Dispatcher Action Schemas
 * =================================================
 * Per-action Zod schemas for 6 SCI-MS2 validation actions added
 * to the existing prism_validate dispatcher.
 *
 * @module schemas/sciValidationActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// prediction_validate — PredictionValidationEngine.validate
// ============================================================================

const prediction_validate = z.object({
  predicted: z.array(z.number()).optional(),
  actual: z.array(z.number()).optional(),
  model_name: z.string().optional(),
  tolerance: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// calibration_run — CalibrationEngine.calibrate
// ============================================================================

const calibration_run = z.object({
  model: z.string().optional(),
  reference_data: z.array(z.record(z.string(), z.any())).optional(),
  parameters: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// benchmark_run — BenchmarkSuiteEngine.run
// ============================================================================

const benchmark_run = z.object({
  scenario: z.string().optional(),
  category: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// benchmark_list — BenchmarkSuiteEngine.getScenarios
// ============================================================================

const benchmark_list = z.object({
  category: z.string().optional(),
}).passthrough();

// ============================================================================
// uncertainty_quantify — UncertaintyQuantificationEngine.quantify
// ============================================================================

const uncertainty_quantify = z.object({
  parameters: z.array(z.record(z.string(), z.any())).optional(),
  model: z.string().optional(),
  samples: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// improvement_run — ContinuousImprovementEngine.improve
// ============================================================================

const improvement_run = z.object({
  process_data: z.record(z.string(), z.any()).optional(),
  target: z.string().optional(),
  constraints: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const SCI_VALIDATION_ACTION_SCHEMAS: ActionSchemaMap = {
  prediction_validate,
  calibration_run,
  benchmark_run,
  benchmark_list,
  uncertainty_quantify,
  improvement_run,
};
