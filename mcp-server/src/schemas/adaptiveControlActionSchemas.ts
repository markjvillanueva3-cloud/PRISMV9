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
  observations: z.array(z.record(z.string(), z.unknown())).optional(),
  prior: z.record(z.string(), z.unknown()).optional(),
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
  machine_state: z.record(z.string(), z.unknown()).optional(),
  sensor_data: z.record(z.string(), z.unknown()).optional(),
  algorithm_context: z.string().optional(),
}).passthrough();

// ============================================================================
// digital_twin_query — DigitalTwinSyncEngine.queryForAlgorithm
// ============================================================================

const digital_twin_query = z.object({
  state: z.record(z.string(), z.unknown()).optional(),
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
// adaptive_chatter_analyze — AdaptiveChatterEngine.analyze (ENGINE-WIRE-MS0)
// ============================================================================

const adaptive_chatter_analyze = z.object({
  spindleSpeed: z.number().describe("Spindle speed RPM"),
  feedRate: z.number().describe("Feed rate mm/min"),
  depthOfCut: z.number().describe("Depth of cut mm"),
  toolDiameter: z.number().describe("Tool diameter mm"),
  toolStickout: z.number().describe("Tool stickout mm"),
  fluteCount: z.number().int().describe("Number of flutes"),
  vibrationAmplitude: z.number().describe("Measured vibration amplitude um"),
  vibrationFrequency: z.number().describe("Measured vibration frequency Hz"),
  toothPassFrequency: z.number().optional(),
  naturalFrequency: z.number().optional(),
  dampingRatio: z.number().optional(),
}).passthrough();

// ============================================================================
// adaptive_chipload_analyze — AdaptiveChiploadEngine.analyze
// ============================================================================

const adaptive_chipload_analyze = z.object({
  currentFeedRate: z.number().describe("Current feed rate mm/min"),
  currentSpindleSpeed: z.number().describe("Current spindle speed RPM"),
  toolDiameter: z.number().describe("Tool diameter mm"),
  fluteCount: z.number().int().describe("Number of flutes"),
  targetChipload: z.number().describe("Target chipload mm/tooth"),
  minChipload: z.number().describe("Minimum chipload mm/tooth"),
  maxChipload: z.number().describe("Maximum chipload mm/tooth"),
  materialHardness: z.number().optional(),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]).optional(),
}).passthrough();

// ============================================================================
// adaptive_override_calc — AdaptiveOverrideEngine.calculate
// ============================================================================

const adaptive_override_calc = z.object({
  baseSpindleSpeed: z.number().describe("Base spindle speed RPM"),
  baseFeedRate: z.number().describe("Base feed rate mm/min"),
  currentOverrideFeed: z.number().optional().describe("Current feed override percent"),
  currentOverrideSpeed: z.number().optional().describe("Current speed override percent"),
  chiploadRecommendation: z.record(z.string(), z.number()).optional(),
  chatterRecommendation: z.record(z.string(), z.number()).optional(),
  wearRecommendation: z.record(z.string(), z.number()).optional(),
  thermalRecommendation: z.record(z.string(), z.number()).optional(),
  operatorOverride: z.number().optional(),
  mode: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  maxFeedOverride: z.number().optional(),
  minFeedOverride: z.number().optional(),
  maxSpeedOverride: z.number().optional(),
  minSpeedOverride: z.number().optional(),
}).passthrough();

// ============================================================================
// adaptive_thermal_analyze — AdaptiveThermalEngine.analyze
// ============================================================================

const adaptive_thermal_analyze = z.object({
  cuttingSpeed: z.number().describe("Cutting speed m/min"),
  feedRate: z.number().describe("Feed rate mm/min"),
  depthOfCut: z.number().describe("Depth of cut mm"),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  workMaterial: z.enum(["aluminum", "steel", "stainless", "titanium", "inconel", "hardened"]),
  coolantType: z.enum(["none", "flood", "mist", "through_tool", "cryogenic"]),
  ambientTemp: z.number().optional(),
  measuredToolTemp: z.number().optional(),
  measuredWorkTemp: z.number().optional(),
  spindleTemp: z.number().optional(),
  machineRuntime: z.number().optional(),
}).passthrough();

// ============================================================================
// adaptive_wear_analyze — AdaptiveWearEngine.analyze
// ============================================================================

const adaptive_wear_analyze = z.object({
  cuttingTime: z.number().describe("Total cutting time min"),
  cuttingSpeed: z.number().describe("Cutting speed m/min"),
  feedRate: z.number().describe("Feed rate mm/min"),
  depthOfCut: z.number().describe("Depth of cut mm"),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  workMaterial: z.enum(["aluminum", "steel", "stainless", "titanium", "inconel", "hardened"]),
  currentPower: z.number().optional(),
  baselinePower: z.number().optional(),
  currentForce: z.number().optional(),
  baselineForce: z.number().optional(),
  surfaceFinish: z.number().optional(),
  baselineSurfaceFinish: z.number().optional(),
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
  // ENGINE-WIRE-MS0/U-WIRE01
  adaptive_chatter_analyze,
  adaptive_chipload_analyze,
  adaptive_override_calc,
  adaptive_thermal_analyze,
  adaptive_wear_analyze,
};
