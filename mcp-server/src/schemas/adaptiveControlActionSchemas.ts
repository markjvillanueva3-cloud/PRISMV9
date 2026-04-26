/**
 * Adaptive Control Dispatcher Action Schemas
 * ============================================
 * Per-action Zod schemas for all 12 prism_adaptive_control actions.
 * SCI-MS1: Adaptive feed/spindle control, Bayesian calibration,
 * tool life prediction, digital twin sync.
 *
 * @module schemas/adaptiveControlActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// adaptive_feed — AdaptiveFeedControlEngine.adapt
// ============================================================================

const adaptive_feed = z.object({
  current_feed: z.number().positive().optional(),
  target_force: z.number().positive().optional(),
  measured_force: z.number().optional(),
  gains: z.record(z.string(), z.number()).optional(),
}).passthrough();

// ============================================================================
// adaptive_feed_tune — AdaptiveFeedControlEngine.tuneGains
// ============================================================================

const adaptive_feed_tune = z.object({
  process_data: z.array(z.number()).optional(),
  target_force: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// adaptive_spindle — AdaptiveSpindleControlEngine.adapt
// ============================================================================

const adaptive_spindle = z.object({
  current_rpm: z.number().positive().optional(),
  target_power: z.number().positive().optional(),
  measured_power: z.number().optional(),
}).passthrough();

// ============================================================================
// adaptive_spindle_stability — AdaptiveSpindleControlEngine.stabilityLimit
// ============================================================================

const adaptive_spindle_stability = z.object({
  rpm: z.number().positive().optional(),
  natural_freq: z.number().positive().optional(),
  damping: z.number().optional(),
  Kc: z.number().optional(),
  stiffness: z.number().positive().optional(),
  flutes: z.number().int().min(1).optional(),
}).passthrough();

// ============================================================================
// adaptive_spindle_chatter — AdaptiveSpindleControlEngine.detectChatter
// ============================================================================

const adaptive_spindle_chatter = z.object({
  signal: z.array(z.number()).optional(),
  sample_rate: z.number().positive().optional(),
  rpm: z.number().positive().optional(),
  flutes: z.number().int().min(1).optional(),
}).passthrough();

// ============================================================================
// bayesian_calibrate — BayesianAdaptiveEngine.calibrate
// ============================================================================

const bayesian_calibrate = z.object({
  observations: z.array(z.record(z.string(), z.any())).optional(),
  prior: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ============================================================================
// bayesian_predict_force — BayesianAdaptiveEngine.predictForce
// ============================================================================

const bayesian_predict_force = z.object({
  kc11: z.number().positive().optional(),
  mc: z.number().optional(),
  h_mm: z.number().positive().optional(),
  b_mm: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// tool_life_predict — ToolLifeAdaptiveEngine.predict
// ============================================================================

const tool_life_predict = z.object({
  failure_times: z.array(z.number()).optional(),
  censored: z.array(z.boolean()).optional(),
  cost_replacement: z.number().positive().optional(),
  cost_failure: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// tool_life_weibull — ToolLifeAdaptiveEngine.weibullMLE
// ============================================================================

const tool_life_weibull = z.object({
  times: z.array(z.number().positive()).min(2),
  censored: z.array(z.boolean()).optional(),
}).passthrough();

// ============================================================================
// tool_life_replacement — ToolLifeAdaptiveEngine.optimalReplacement
// ============================================================================

const tool_life_replacement = z.object({
  beta: z.number().positive(),
  eta: z.number().positive(),
  C_r: z.number().positive(),
  C_f: z.number().positive(),
}).passthrough();

// ============================================================================
// digital_twin_sync — DigitalTwinSyncEngine.sync
// ============================================================================

const digital_twin_sync = z.object({
  machine_state: z.record(z.string(), z.any()).optional(),
  sensor_data: z.record(z.string(), z.any()).optional(),
  algorithm_context: z.string().optional(),
}).passthrough();

// ============================================================================
// digital_twin_query — DigitalTwinSyncEngine.queryForAlgorithm
// ============================================================================

const digital_twin_query = z.object({
  state: z.record(z.string(), z.any()).optional(),
  algorithm: z.string(),
}).passthrough();


// ============================================================================
// calibration_kienzle — AdaptiveCalibrationEngine.bayesianKienzleUpdate
// ============================================================================

const calibration_kienzle = z.object({
  kc11Prior: z.number().positive().describe("Prior estimate for kc1.1"),
  kc11PriorStdDev: z.number().positive().describe("Prior standard deviation for kc1.1"),
  mcPrior: z.number().describe("Prior estimate for mc exponent"),
  mcPriorStdDev: z.number().positive().describe("Prior standard deviation for mc"),
  measurements: z.array(z.object({
    force_N: z.number().describe("Measured cutting force in Newtons"),
    chipThickness_mm: z.number().positive().describe("Uncut chip thickness"),
    chipWidth_mm: z.number().positive().describe("Chip width"),
  })).describe("Force measurements"),
  measurementStdDev: z.number().positive().describe("Measurement noise standard deviation"),
}).passthrough();

// ============================================================================
// calibration_taylor — AdaptiveCalibrationEngine.taylorCoefficientTracker
// ============================================================================

const calibration_taylor = z.object({
  priorC: z.number().positive().describe("Prior Taylor C coefficient"),
  priorN: z.number().positive().describe("Prior Taylor n exponent"),
  observations: z.array(z.object({
    speed_mpm: z.number().positive().describe("Cutting speed m/min"),
    toolLife_min: z.number().positive().describe("Observed tool life minutes"),
  })).describe("Tool life observations"),
  processNoise: z.number().positive().optional().describe("Process noise"),
  measurementNoise: z.number().positive().optional().describe("Measurement noise"),
}).passthrough();

// ============================================================================
// calibration_surface_bias — AdaptiveCalibrationEngine.surfaceFinishBiasCorrector
// ============================================================================

const calibration_surface_bias = z.object({
  predictions: z.array(z.number()).describe("Predicted Ra values"),
  actuals: z.array(z.number()).describe("Actual measured Ra values"),
  nBootstrap: z.number().int().positive().optional().describe("Bootstrap iterations"),
}).passthrough();

// ============================================================================
// calibration_drift — AdaptiveCalibrationEngine.processDriftCompensator
// ============================================================================

const calibration_drift = z.object({
  target: z.number().describe("Target process value"),
  observations: z.array(z.number()).describe("Process observations over time"),
  threshold: z.number().positive().optional().describe("CUSUM threshold"),
}).passthrough();

// ============================================================================
// calibration_thermal — AdaptiveCalibrationEngine.thermalModelCalibrator
// ============================================================================

const calibration_thermal = z.object({
  times: z.array(z.number()).describe("Time points in seconds"),
  temperatures: z.array(z.number()).describe("Temperature measurements"),
  ambientTemp: z.number().optional().describe("Ambient temperature"),
  learningRate: z.number().positive().optional().describe("Gradient descent learning rate"),
  maxIterations: z.number().int().positive().optional().describe("Max iterations"),
}).passthrough();

// ============================================================================
// calibration_model_select — AdaptiveCalibrationEngine.modelSelector
// ============================================================================

const calibration_model_select = z.object({
  xData: z.array(z.number()).describe("Independent variable data"),
  yData: z.array(z.number()).describe("Dependent variable data"),
  candidates: z.array(z.string()).optional().describe("Model names to compare"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ADAPTIVE_CONTROL_ACTION_SCHEMAS: ActionSchemaMap = {
  adaptive_feed,
  adaptive_feed_tune,
  adaptive_spindle,
  adaptive_spindle_stability,
  adaptive_spindle_chatter,
  bayesian_calibrate,
  bayesian_predict_force,
  tool_life_predict,
  tool_life_weibull,
  tool_life_replacement,
  digital_twin_sync,
  digital_twin_query,
  calibration_kienzle,
  calibration_taylor,
  calibration_surface_bias,
  calibration_drift,
  calibration_thermal,
  calibration_model_select,
};
