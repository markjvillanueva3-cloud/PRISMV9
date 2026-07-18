/**
 * PredictionCalibrationEngine — CAMX-MS15/U06 (E1147)
 *
 * Continuously calibrate Kienzle kc1.1 and Taylor C/n constants from
 * actual measurement data. Per-machine, per-material calibration using
 * Bayesian updating to refine physics model predictions.
 *
 * Bayesian update model:
 *   Prior:     theta ~ N(mu_prior, sigma_prior^2)
 *   Likelihood: x | theta ~ N(theta, sigma_obs^2)
 *   Posterior:  theta | x ~ N(mu_post, sigma_post^2)
 *
 *   mu_post    = (mu_prior / sigma_prior^2 + x / sigma_obs^2) /
 *                (1/sigma_prior^2 + 1/sigma_obs^2)
 *   sigma_post = 1 / sqrt(1/sigma_prior^2 + 1/sigma_obs^2)
 *
 * Calibration factors stored per (material_key, machine_id):
 *   - kc1_1 ratio: actual_force / predicted_force
 *   - taylor_C ratio: actual_tool_life / predicted_tool_life
 *   - taylor_n adjustment: fitted from accumulated data
 *
 * References:
 *   - Kienzle (1952): Specific cutting force model
 *   - Taylor (1907): Tool life equation
 *   - Gelman et al. "BDA3" Ch.2: Bayesian inference basics
 *   - StrategyEvolutionEngine (E1146) — uses calibrated constants
 *
 * @module PredictionCalibrationEngine
 * @shortcode E1147
 * @dispatcher camDispatcher
 * @actions prediction_calibrate, prediction_get_factors, prediction_calibration_history
 * @milestone CAMX-MS15/U06
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default prior standard deviation for kc1.1 ratio (20% uncertainty) */
const DEFAULT_KC_PRIOR_STD = 0.20;

/** Default prior standard deviation for Taylor C ratio (25% uncertainty) */
const DEFAULT_TAYLOR_C_PRIOR_STD = 0.25;

/** Default prior standard deviation for Taylor n adjustment (15% uncertainty) */
const DEFAULT_TAYLOR_N_PRIOR_STD = 0.15;

/** Default observation noise for force measurements (10% of signal) */
const DEFAULT_FORCE_OBS_STD = 0.10;

/** Default observation noise for tool life measurements (20% of signal) */
const DEFAULT_LIFE_OBS_STD = 0.20;

/** Maximum calibration history entries per key */
const MAX_HISTORY_PER_KEY = 200;

/** Minimum observations before calibration is considered reliable */
const MIN_RELIABLE_OBSERVATIONS = 5;

/** Outlier rejection threshold (Z-score) */
const OUTLIER_Z_THRESHOLD = 3.0;

/** Maximum allowed calibration factor (safety clamp) */
const MAX_CALIBRATION_FACTOR = 2.5;

/** Minimum allowed calibration factor (safety clamp) */
const MIN_CALIBRATION_FACTOR = 0.4;

// ============================================================================
// TYPES
// ============================================================================

/** A single calibration measurement */
export interface CalibrationMeasurement {
  /** Predicted value (from physics model) */
  predicted: number;
  /** Actual measured value */
  actual: number;
  /** Measurement type */
  type: "force" | "tool_life" | "power" | "surface_roughness";
  /** Material key (e.g., "P_1045_200HB") */
  material_key: string;
  /** Machine identifier */
  machine_id: string;
  /** Cutting speed used [m/min] */
  Vc?: number;
  /** Feed per tooth used [mm/tooth] */
  fz?: number;
  /** Depth of cut used [mm] */
  ap?: number;
  /** Timestamp ISO-8601 */
  timestamp?: string;
  /** Confidence in measurement [0-1] */
  confidence?: number;
}

/** Bayesian posterior state for a single parameter */
export interface BayesianPosterior {
  /** Posterior mean */
  mean: number;
  /** Posterior standard deviation */
  std: number;
  /** Number of observations incorporated */
  n_observations: number;
  /** 95% credible interval lower bound */
  ci_lower: number;
  /** 95% credible interval upper bound */
  ci_upper: number;
}

/** Calibration factors for a material+machine combo */
export interface CalibrationFactors {
  /** Material key */
  material_key: string;
  /** Machine ID */
  machine_id: string;
  /** kc1.1 correction factor (multiply nominal kc1.1 by this) */
  kc1_1: BayesianPosterior;
  /** Taylor C correction factor */
  taylor_C: BayesianPosterior;
  /** Taylor n correction factor */
  taylor_n: BayesianPosterior;
  /** Whether calibration is considered reliable */
  reliable: boolean;
  /** Last updated ISO-8601 */
  last_updated: string;
}

/** Calibration history entry */
export interface CalibrationHistoryEntry {
  /** Timestamp */
  timestamp: string;
  /** Measurement type */
  type: string;
  /** Predicted value */
  predicted: number;
  /** Actual value */
  actual: number;
  /** Ratio actual/predicted */
  ratio: number;
  /** Was it an outlier? */
  outlier: boolean;
  /** Post-update posterior mean */
  posterior_mean: number;
  /** Post-update posterior std */
  posterior_std: number;
}

/** Calibration result */
export interface CalibrationResult {
  /** Updated calibration factors */
  factors: CalibrationFactors;
  /** Whether measurement was accepted (not outlier) */
  accepted: boolean;
  /** If rejected, reason */
  rejection_reason?: string;
  /** Ratio actual/predicted */
  ratio: number;
  /** Z-score of this observation */
  z_score: number;
  /** Improvement in prediction accuracy */
  accuracy_improvement_pct: number;
}

// ============================================================================
// ENGINE
// ============================================================================

/** Internal state for a single parameter's Bayesian tracking */
interface ParamState {
  mean: number;
  std: number;
  n: number;
}

export class PredictionCalibrationEngine {
  /** Map: "material_key::machine_id" -> { kc1_1, taylor_C, taylor_n } */
  private calibrations = new Map<string, { kc1_1: ParamState; taylor_C: ParamState; taylor_n: ParamState }>();

  /** Calibration history per key */
  private history = new Map<string, CalibrationHistoryEntry[]>();

  /**
   * Incorporate a new measurement and update calibration factors.
   */
  calibrate(measurement: CalibrationMeasurement): CalibrationResult {
    const key = `${measurement.material_key}::${measurement.machine_id}`;
    const ts = measurement.timestamp ?? new Date().toISOString();

    log.info(`[PredictionCalibration] Calibrating ${measurement.type} for ${key}: predicted=${measurement.predicted}, actual=${measurement.actual}`);

    // Initialize if new
    if (!this.calibrations.has(key)) {
      this.calibrations.set(key, {
        kc1_1: { mean: 1.0, std: DEFAULT_KC_PRIOR_STD, n: 0 },
        taylor_C: { mean: 1.0, std: DEFAULT_TAYLOR_C_PRIOR_STD, n: 0 },
        taylor_n: { mean: 1.0, std: DEFAULT_TAYLOR_N_PRIOR_STD, n: 0 },
      });
    }
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }

    const cal = this.calibrations.get(key)!;
    const hist = this.history.get(key)!;

    // Compute ratio
    const ratio = measurement.predicted !== 0
      ? measurement.actual / measurement.predicted
      : 1.0;

    // Determine which parameter to update based on measurement type
    let paramState: ParamState;
    let obsStd: number;

    switch (measurement.type) {
      case "force":
      case "power":
        paramState = cal.kc1_1;
        obsStd = DEFAULT_FORCE_OBS_STD;
        break;
      case "tool_life":
        paramState = cal.taylor_C;
        obsStd = DEFAULT_LIFE_OBS_STD;
        break;
      case "surface_roughness":
        // Surface roughness is less directly tied to single param, use taylor_n
        paramState = cal.taylor_n;
        obsStd = DEFAULT_LIFE_OBS_STD;
        break;
      default:
        paramState = cal.kc1_1;
        obsStd = DEFAULT_FORCE_OBS_STD;
    }

    // Adjust observation noise by confidence
    const confidence = measurement.confidence ?? 0.8;
    const adjustedObsStd = obsStd / Math.max(confidence, 0.1);

    // Outlier check (Z-score against current posterior)
    const zScore = Math.abs(ratio - paramState.mean) / Math.max(paramState.std, 0.001);
    const isOutlier = zScore > OUTLIER_Z_THRESHOLD;

    const oldMean = paramState.mean;

    if (!isOutlier) {
      // Bayesian update
      const priorPrec = 1 / (paramState.std * paramState.std);
      const obsPrec = 1 / (adjustedObsStd * adjustedObsStd);
      const postPrec = priorPrec + obsPrec;

      paramState.mean = (paramState.mean * priorPrec + ratio * obsPrec) / postPrec;
      paramState.std = 1 / Math.sqrt(postPrec);
      paramState.n += 1;

      // Clamp calibration factor to safety range
      paramState.mean = Math.max(MIN_CALIBRATION_FACTOR, Math.min(MAX_CALIBRATION_FACTOR, paramState.mean));
    }

    // Record history
    const entry: CalibrationHistoryEntry = {
      timestamp: ts,
      type: measurement.type,
      predicted: measurement.predicted,
      actual: measurement.actual,
      ratio: Math.round(ratio * 10000) / 10000,
      outlier: isOutlier,
      posterior_mean: Math.round(paramState.mean * 10000) / 10000,
      posterior_std: Math.round(paramState.std * 10000) / 10000,
    };
    hist.push(entry);
    if (hist.length > MAX_HISTORY_PER_KEY) {
      hist.splice(0, hist.length - MAX_HISTORY_PER_KEY);
    }

    // Compute accuracy improvement
    const oldError = Math.abs(oldMean - ratio);
    const newError = Math.abs(paramState.mean - ratio);
    const improvement = oldError > 0 ? ((oldError - newError) / oldError) * 100 : 0;

    const factors = this.buildFactors(key, cal);

    return {
      factors,
      accepted: !isOutlier,
      rejection_reason: isOutlier ? `Outlier: Z-score ${zScore.toFixed(2)} exceeds threshold ${OUTLIER_Z_THRESHOLD}` : undefined,
      ratio: Math.round(ratio * 10000) / 10000,
      z_score: Math.round(zScore * 100) / 100,
      accuracy_improvement_pct: Math.round(improvement * 100) / 100,
    };
  }

  /**
   * Get current calibration factors for a material+machine combination.
   */
  getCalibrationFactors(material_key: string, machine_id: string): CalibrationFactors | null {
    const key = `${material_key}::${machine_id}`;
    const cal = this.calibrations.get(key);
    if (!cal) return null;
    return this.buildFactors(key, cal);
  }

  /**
   * Get calibration history for a material+machine combination.
   */
  getCalibrationHistory(material_key?: string, machine_id?: string): CalibrationHistoryEntry[] | Record<string, CalibrationHistoryEntry[]> {
    if (material_key && machine_id) {
      const key = `${material_key}::${machine_id}`;
      return this.history.get(key) ?? [];
    }

    // Return all histories
    const result: Record<string, CalibrationHistoryEntry[]> = {};
    for (const [k, v] of this.history) {
      result[k] = v;
    }
    return result;
  }

  /**
   * Reset calibration for a material+machine combination (or all).
   */
  resetCalibration(material_key?: string, machine_id?: string): { reset_count: number } {
    if (material_key && machine_id) {
      const key = `${material_key}::${machine_id}`;
      const existed = this.calibrations.delete(key);
      this.history.delete(key);
      log.info(`[PredictionCalibration] Reset calibration for ${key}`);
      return { reset_count: existed ? 1 : 0 };
    }

    const count = this.calibrations.size;
    this.calibrations.clear();
    this.history.clear();
    log.info(`[PredictionCalibration] Reset all ${count} calibrations`);
    return { reset_count: count };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Build CalibrationFactors from internal state */
  private buildFactors(
    key: string,
    cal: { kc1_1: ParamState; taylor_C: ParamState; taylor_n: ParamState },
  ): CalibrationFactors {
    const [material_key, machine_id] = key.split("::");
    const Z95 = 1.96;

    const toPosterior = (s: ParamState): BayesianPosterior => ({
      mean: Math.round(s.mean * 10000) / 10000,
      std: Math.round(s.std * 10000) / 10000,
      n_observations: s.n,
      ci_lower: Math.round((s.mean - Z95 * s.std) * 10000) / 10000,
      ci_upper: Math.round((s.mean + Z95 * s.std) * 10000) / 10000,
    });

    const totalObs = cal.kc1_1.n + cal.taylor_C.n + cal.taylor_n.n;

    return {
      material_key,
      machine_id,
      kc1_1: toPosterior(cal.kc1_1),
      taylor_C: toPosterior(cal.taylor_C),
      taylor_n: toPosterior(cal.taylor_n),
      reliable: totalObs >= MIN_RELIABLE_OBSERVATIONS,
      last_updated: new Date().toISOString(),
    };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const predictionCalibrationEngine = new PredictionCalibrationEngine();
