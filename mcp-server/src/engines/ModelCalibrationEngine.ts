/**
 * PRISM Manufacturing Intelligence - Model Calibration Engine
 * R17-MS3: Bayesian Parameter Updating from Measurement Feedback
 *
 * Updates physics model coefficients using Bayesian inference from actual
 * measurement data. Supports conjugate normal-normal updates for Kienzle,
 * Taylor, thermal, and surface finish model parameters.
 *
 * Architecture:
 *   PriorStore:    In-memory store of parameter priors (mean, variance)
 *   BayesUpdater:  Conjugate normal-normal Bayesian updates
 *   Validator:     Ensures updated parameters remain physically plausible
 *
 * Actions:
 *   cal_update   — Update a model parameter with new measurement evidence
 *   cal_status   — Show current calibration state for all tracked parameters
 *   cal_reset    — Reset a parameter to its original prior
 *   cal_validate — Cross-validate calibrated parameters against holdout data
 *
 * @version 1.0.0  R17-MS3
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface ParameterPrior {
  name: string;
  model: string;           // "kienzle", "taylor", "thermal", "surface_finish", "force"
  description: string;
  prior_mean: number;
  prior_variance: number;
  posterior_mean: number;
  posterior_variance: number;
  n_updates: number;
  last_updated: number;
  physical_bounds: { min: number; max: number };
  history: Array<{ mean: number; variance: number; evidence: number; timestamp: number }>;
}

interface CalibrationUpdate {
  parameter: string;
  observed_value: number;
  measurement_variance?: number;
  material?: string;
  operation?: string;
}

interface CalibrationResult {
  parameter: string;
  prior: { mean: number; variance: number };
  posterior: { mean: number; variance: number };
  shift: number;           // Posterior mean - prior mean
  shift_pct: number;
  confidence_improvement: number;  // Variance reduction ratio
  n_updates: number;
  within_bounds: boolean;
  safety: { score: number; flags: string[] };
}

// ============================================================================
// DEFAULT PARAMETER PRIORS
// ============================================================================

const DEFAULT_PRIORS: Record<string, Omit<ParameterPrior, "posterior_mean" | "posterior_variance" | "n_updates" | "last_updated" | "history">> = {
  // Kienzle model parameters
  kc1_1_steel: {
    name: "kc1_1_steel",
    model: "kienzle",
    description: "Specific cutting force for steel at h=1mm, b=1mm",
    prior_mean: 1780,
    prior_variance: 40000,    // σ = 200 N/mm²
    physical_bounds: { min: 800, max: 3500 },
  },
  kc1_1_aluminum: {
    name: "kc1_1_aluminum",
    model: "kienzle",
    description: "Specific cutting force for aluminum at h=1mm, b=1mm",
    prior_mean: 700,
    prior_variance: 10000,
    physical_bounds: { min: 300, max: 1200 },
  },
  kc1_1_titanium: {
    name: "kc1_1_titanium",
    model: "kienzle",
    description: "Specific cutting force for titanium at h=1mm, b=1mm",
    prior_mean: 1400,
    prior_variance: 30000,
    physical_bounds: { min: 800, max: 2500 },
  },
  mc_steel: {
    name: "mc_steel",
    model: "kienzle",
    description: "Kienzle exponent for steel",
    prior_mean: 0.25,
    prior_variance: 0.004,
    physical_bounds: { min: 0.10, max: 0.45 },
  },
  mc_aluminum: {
    name: "mc_aluminum",
    model: "kienzle",
    description: "Kienzle exponent for aluminum",
    prior_mean: 0.23,
    prior_variance: 0.003,
    physical_bounds: { min: 0.08, max: 0.40 },
  },

  // Taylor tool life parameters
  taylor_C_carbide: {
    name: "taylor_C_carbide",
    model: "taylor",
    description: "Taylor constant C for carbide tools",
    prior_mean: 350,
    prior_variance: 5000,
    physical_bounds: { min: 100, max: 800 },
  },
  taylor_n_carbide: {
    name: "taylor_n_carbide",
    model: "taylor",
    description: "Taylor exponent n for carbide tools",
    prior_mean: 0.25,
    prior_variance: 0.003,
    physical_bounds: { min: 0.10, max: 0.50 },
  },

  // Thermal model parameters
  thermal_partition_ratio: {
    name: "thermal_partition_ratio",
    model: "thermal",
    description: "Heat partition ratio to tool (Loewen-Shaw)",
    prior_mean: 0.12,
    prior_variance: 0.002,
    physical_bounds: { min: 0.02, max: 0.40 },
  },
  thermal_conductivity_correction: {
    name: "thermal_conductivity_correction",
    model: "thermal",
    description: "Workpiece thermal conductivity correction factor",
    prior_mean: 1.0,
    prior_variance: 0.04,
    physical_bounds: { min: 0.5, max: 2.0 },
  },

  // Surface finish model
  ra_correction_factor: {
    name: "ra_correction_factor",
    model: "surface_finish",
    description: "Ra model multiplicative correction",
    prior_mean: 1.0,
    prior_variance: 0.04,
    physical_bounds: { min: 0.5, max: 2.0 },
  },
  rz_correction_factor: {
    name: "rz_correction_factor",
    model: "surface_finish",
    description: "Rz model multiplicative correction",
    prior_mean: 1.0,
    prior_variance: 0.04,
    physical_bounds: { min: 0.5, max: 2.0 },
  },

  // Force model correction
  force_correction_factor: {
    name: "force_correction_factor",
    model: "force",
    description: "Cutting force model multiplicative correction",
    prior_mean: 1.0,
    prior_variance: 0.04,
    physical_bounds: { min: 0.6, max: 1.8 },
  },
};

// ============================================================================
// IN-MEMORY CALIBRATION STORE
// ============================================================================

const calibrationStore: Map<string, ParameterPrior> = new Map();

function getOrCreateParameter(name: string): ParameterPrior {
  if (calibrationStore.has(name)) {
    return calibrationStore.get(name)!;
  }

  const template = DEFAULT_PRIORS[name];
  if (template) {
    const param: ParameterPrior = {
      ...template,
      posterior_mean: template.prior_mean,
      posterior_variance: template.prior_variance,
      n_updates: 0,
      last_updated: 0,
      history: [],
    };
    calibrationStore.set(name, param);
    return param;
  }

  // Create generic parameter
  const param: ParameterPrior = {
    name,
    model: "custom",
    description: `Custom calibration parameter: ${name}`,
    prior_mean: Number(1.0),
    prior_variance: 0.1,
    posterior_mean: 1.0,
    posterior_variance: 0.1,
    n_updates: 0,
    last_updated: 0,
    physical_bounds: { min: 0, max: Infinity },
    history: [],
  };
  calibrationStore.set(name, param);
  return param;
}

// ============================================================================
// BAYESIAN UPDATE (conjugate normal-normal)
// ============================================================================

/**
 * Conjugate normal-normal Bayesian update:
 *   Prior: θ ~ N(μ₀, σ₀²)
 *   Likelihood: x | θ ~ N(θ, σ_obs²)
 *   Posterior: θ | x ~ N(μ₁, σ₁²)
 *   where:
 *     σ₁² = 1 / (1/σ₀² + 1/σ_obs²)
 *     μ₁  = σ₁² · (μ₀/σ₀² + x/σ_obs²)
 */
function bayesUpdate(
  priorMean: number,
  priorVar: number,
  observedValue: number,
  obsVar: number,
): { posteriorMean: number; posteriorVar: number } {
  const priorPrecision = 1 / priorVar;
  const obsPrecision = 1 / obsVar;
  const posteriorPrecision = priorPrecision + obsPrecision;
  const posteriorVar = 1 / posteriorPrecision;
  const posteriorMean = posteriorVar * (priorMean * priorPrecision + observedValue * obsPrecision);
  return { posteriorMean, posteriorVar };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function calibrationUpdate(params: Record<string, unknown>): CalibrationResult {
  const paramName = String(params.parameter ?? params.name ?? "");
  const observedValue = Number(params.observed_value ?? params.value);
  const obsVariance = Number(params.measurement_variance ?? params.variance ?? 0.01);

  if (!paramName) throw new Error("Parameter name required");
  if (isNaN(observedValue)) throw new Error("Valid observed_value required");
  if (obsVariance <= 0) throw new Error("measurement_variance must be positive");

  const param = getOrCreateParameter(paramName);

  // Store prior state
  const priorMean = param.posterior_mean;
  const priorVar = param.posterior_variance;

  // Bayesian update
  const { posteriorMean, posteriorVar } = bayesUpdate(priorMean, priorVar, observedValue, obsVariance);

  // Clamp to physical bounds
  const clampedMean = Math.max(param.physical_bounds.min,
    Math.min(param.physical_bounds.max, posteriorMean));
  const withinBounds = clampedMean === posteriorMean;

  // Update store
  param.posterior_mean = clampedMean;
  param.posterior_variance = posteriorVar;
  param.n_updates++;
  param.last_updated = Date.now();
  param.history.push({
    mean: round4(clampedMean),
    variance: round6(posteriorVar),
    evidence: observedValue,
    timestamp: Date.now(),
  });

  // Keep history bounded
  if (param.history.length > 100) param.history.shift();

  const shift = clampedMean - priorMean;
  const shiftPct = priorMean !== 0 ? (shift / Math.abs(priorMean)) * 100 : 0;
  const varianceReduction = 1 - posteriorVar / priorVar;

  const flags: string[] = [];
  if (!withinBounds) flags.push("CLAMPED_TO_BOUNDS");
  if (Math.abs(shiftPct) > 20) flags.push("LARGE_SHIFT");
  if (varianceReduction < 0) flags.push("VARIANCE_INCREASED"); // Shouldn't happen in conjugate

  return {
    parameter: paramName,
    prior: { mean: round4(priorMean), variance: round6(priorVar) },
    posterior: { mean: round4(clampedMean), variance: round6(posteriorVar) },
    shift: round4(shift),
    shift_pct: round4(shiftPct),
    confidence_improvement: round4(varianceReduction * 100),
    n_updates: param.n_updates,
    within_bounds: withinBounds,
    safety: {
      score: flags.length === 0 ? 1.0 : 0.8,
      flags,
    },
  };
}

function calibrationStatus(params: Record<string, unknown>): unknown {
  const model = params.model ? String(params.model) : undefined;
  const paramName = params.parameter ? String(params.parameter) : undefined;

  // If specific parameter requested
  if (paramName) {
    const param = calibrationStore.get(paramName);
    if (!param) {
      // Check if it exists in defaults
      const template = DEFAULT_PRIORS[paramName];
      if (template) {
        return {
          parameter: paramName,
          model: template.model,
          status: "uncalibrated",
          prior_mean: template.prior_mean,
          prior_variance: template.prior_variance,
          physical_bounds: template.physical_bounds,
        };
      }
      return { parameter: paramName, status: "unknown" };
    }
    return formatParameterStatus(param);
  }

  // List all — either calibrated or filtered by model
  const results: Record<string, unknown>[] = [];

  // Include calibrated parameters
  for (const [, param] of calibrationStore) {
    if (model && param.model !== model) continue;
    results.push(formatParameterStatus(param));
  }

  // Include uncalibrated defaults if no model filter or model matches
  for (const [name, template] of Object.entries(DEFAULT_PRIORS)) {
    if (calibrationStore.has(name)) continue;
    if (model && template.model !== model) continue;
    results.push({
      parameter: name,
      model: template.model,
      status: "uncalibrated",
      prior_mean: template.prior_mean,
      description: template.description,
    });
  }

  return {
    total_parameters: Object.keys(DEFAULT_PRIORS).length,
    calibrated: calibrationStore.size,
    total_updates: [...calibrationStore.values()].reduce((s, p) => s + p.n_updates, 0),
    parameters: results,
    filter: { model },
  };
}

function calibrationReset(params: Record<string, unknown>): unknown {
  const paramName = params.parameter ? String(params.parameter) : undefined;

  if (paramName) {
    const existed = calibrationStore.delete(paramName);
    return {
      parameter: paramName,
      reset: existed,
      message: existed ? `Parameter '${paramName}' reset to prior` : `Parameter '${paramName}' was not calibrated`,
    };
  }

  // Reset all
  const count = calibrationStore.size;
  calibrationStore.clear();
  return {
    reset_all: true,
    parameters_reset: count,
    message: `All ${count} calibrated parameters reset to priors`,
  };
}

function calibrationValidate(params: Record<string, unknown>): unknown {
  const paramName = String(params.parameter ?? "");
  const testData = (params.test_data as Array<{ predicted: number; actual: number }>) ?? [];

  if (testData.length === 0) {
    return { error: "test_data required: array of {predicted, actual} pairs" };
  }

  const param = calibrationStore.get(paramName);
  if (!param) {
    return {
      parameter: paramName,
      calibrated: false,
      message: "Parameter not calibrated — cannot validate",
    };
  }

  // Apply correction factor to predictions
  const correctionFactor = param.posterior_mean / param.prior_mean;

  // Compute errors before and after calibration
  let maeBeforeSum = 0, maeAfterSum = 0;
  let rmseBeforeSum = 0, rmseAfterSum = 0;
  const details: unknown[] = [];

  for (const { predicted, actual } of testData) {
    const corrected = predicted * correctionFactor;
    const errorBefore = Math.abs(actual - predicted);
    const errorAfter = Math.abs(actual - corrected);

    maeBeforeSum += errorBefore;
    maeAfterSum += errorAfter;
    rmseBeforeSum += errorBefore ** 2;
    rmseAfterSum += errorAfter ** 2;

    details.push({
      predicted,
      corrected: round4(corrected),
      actual,
      error_before: round4(errorBefore),
      error_after: round4(errorAfter),
      improved: errorAfter < errorBefore,
    });
  }

  const n = testData.length;
  const maeBefore = maeBeforeSum / n;
  const maeAfter = maeAfterSum / n;
  const rmseBefore = Math.sqrt(rmseBeforeSum / n);
  const rmseAfter = Math.sqrt(rmseAfterSum / n);
  const improvement = maeBefore > 0 ? ((maeBefore - maeAfter) / maeBefore) * 100 : 0;

  return {
    parameter: paramName,
    correction_factor: round4(correctionFactor),
    n_test_points: n,
    before_calibration: {
      mae: round4(maeBefore),
      rmse: round4(rmseBefore),
    },
    after_calibration: {
      mae: round4(maeAfter),
      rmse: round4(rmseAfter),
    },
    improvement_pct: round4(improvement),
    effective: improvement > 0,
    details: details.slice(0, 20), // First 20 for brevity
    safety: {
      score: improvement > 0 ? 1.0 : 0.7,
      flags: improvement <= 0 ? ["CALIBRATION_NOT_IMPROVING"] : [],
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatParameterStatus(param: ParameterPrior): Record<string, unknown> {
  const driftFromPrior = param.posterior_mean - param.prior_mean;
  const driftPct = param.prior_mean !== 0 ? (driftFromPrior / Math.abs(param.prior_mean)) * 100 : 0;
  const varianceReduction = 1 - param.posterior_variance / param.prior_variance;

  return {
    parameter: param.name,
    model: param.model,
    description: param.description,
    status: param.n_updates > 0 ? "calibrated" : "uncalibrated",
    prior: { mean: param.prior_mean, variance: round6(param.prior_variance) },
    posterior: { mean: round4(param.posterior_mean), variance: round6(param.posterior_variance) },
    drift_from_prior: round4(driftFromPrior),
    drift_pct: round4(driftPct),
    confidence_gain_pct: round4(varianceReduction * 100),
    n_updates: param.n_updates,
    last_updated: param.last_updated > 0 ? new Date(param.last_updated).toISOString() : null,
    physical_bounds: param.physical_bounds,
    recent_history: param.history.slice(-5),
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function round6(v: number): number {
  return Math.round(v * 1000000) / 1000000;
}

// ============================================================================
// PUBLIC DISPATCHER
// ============================================================================

export function executeModelCalibrationAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  log.info(`[ModelCalibrationEngine] action=${action}`);

  switch (action) {
    case "cal_update":
      return calibrationUpdate(params);
    case "cal_status":
      return calibrationStatus(params);
    case "cal_reset":
      return calibrationReset(params);
    case "cal_validate":
      return calibrationValidate(params);
    default:
      throw new Error(`ModelCalibrationEngine: unknown action '${action}'`);
  }
}
