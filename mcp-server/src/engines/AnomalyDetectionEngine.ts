// @ts-nocheck
/**
 * AnomalyDetectionEngine — CAMX-MS15/U03 (E1152)
 *
 * Detects when actual machining results deviate significantly from predictions
 * using Mahalanobis distance. Stores anomaly history, proposes auto-adjustments
 * to physics constants, and supports multi-dimensional deviation analysis.
 *
 * Distinct from RealTimeAnomalyDetectionEngine (E-series, signal/sensor domain):
 * this engine operates on scalar prediction vs. actual comparisons for:
 *   cycle_time, tool_life, surface_roughness, cutting_force, power
 *
 * Mathematics:
 *   Mahalanobis distance:
 *     d² = (x − μ)ᵀ · Σ⁻¹ · (x − μ)
 *
 *   Where:
 *     x  = deviation vector [act_i / pred_i − 1] for each dimension
 *     μ  = expected deviation vector (initially 0 = perfect prediction)
 *     Σ  = covariance matrix (estimated from history or identity at cold start)
 *
 *   Threshold: chi-squared distribution tail.
 *     For k dimensions, P(d² > threshold) = α
 *     Default α = 0.05 → threshold = chi2_inv(0.95, k)
 *     Approximated via Wilson-Hilferty transform:
 *       chi2_inv(p, k) ≈ k * (1 − 2/(9k) + z_p * sqrt(2/(9k)))³
 *     where z_p = qnorm(p) ≈ 1.645 for p=0.95
 *
 *   Auto-adjustment:
 *     For each anomalous dimension, proposed constant adjustment:
 *       factor = mean(actual_i / predicted_i) over recent window (N=5)
 *     Applied as multiplicative correction to the corresponding constant.
 *
 * References:
 *   - Mahalanobis (1936) — "On the generalised distance in statistics"
 *   - Wilson & Hilferty (1931) — Chi-squared approximation
 *   - ISO 230-1 (2012) — Machine tool testing, baseline deviation
 *
 * @module AnomalyDetectionEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// TYPES
// ============================================================================

/** Predicted values from CAM/physics models */
export interface PredictedValues {
  cycle_time_min?: number;
  tool_life_min?: number;
  surface_roughness_um?: number;
  cutting_force_N?: number;
  power_kW?: number;
}

/** Actual measured values */
export interface ActualValues {
  cycle_time_min?: number;
  tool_life_min?: number;
  surface_roughness_um?: number;
  cutting_force_N?: number;
  power_kW?: number;
}

/** Context attached to a result record */
export interface AnomalyContext {
  job_id?: string;
  machine_id?: string;
  strategy?: string;
  material?: string;
  tool?: string;
  timestamp?: number;
  notes?: string;
}

/** Individual factor contributing to anomaly */
export interface AnomalyFactor {
  dimension: string;
  predicted: number;
  actual: number;
  deviation_ratio: number;
  /** Signed deviation from prediction: (actual - predicted) / predicted */
  relative_error: number;
  /** Per-dimension z-score (deviation / sigma) */
  z_score: number;
}

/** Result of anomaly detection */
export interface AnomalyDetectionResult {
  is_anomaly: boolean;
  /** Mahalanobis distance (d²) */
  distance: number;
  /** Chi-squared threshold at alpha=0.05 */
  threshold: number;
  /** Degrees of freedom = number of evaluated dimensions */
  degrees_of_freedom: number;
  /** Factors sorted by |relative_error| desc */
  factors: AnomalyFactor[];
  /** Overall severity */
  severity: "none" | "mild" | "moderate" | "severe";
  timestamp: number;
}

/** Stored anomaly record */
export interface AnomalyRecord {
  id: string;
  context: AnomalyContext;
  predicted: PredictedValues;
  actual: ActualValues;
  detection: AnomalyDetectionResult;
}

/** Proposed constant adjustments from autoAdjust */
export interface AdjustmentProposal {
  dimension: string;
  current_factor: number;
  proposed_factor: number;
  justification: string;
  confidence: "low" | "medium" | "high";
}

export interface AutoAdjustResult {
  adjusted_constants: AdjustmentProposal[];
  justification: string;
  samples_used: number;
}

/** Filters for getAnomalyHistory */
export interface AnomalyHistoryFilter {
  machine_id?: string;
  strategy?: string;
  material?: string;
  is_anomaly?: boolean;
  since_ms?: number;
  limit?: number;
}

/** Persistence store */
interface PersistenceStore {
  version: number;
  records: AnomalyRecord[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Chi-squared inverse CDF approximation via Wilson-Hilferty (p=0.95) */
function chi2Threshold(k: number): number {
  if (k <= 0) return 0;
  // Wilson-Hilferty: chi2_inv(p, k) ≈ k*(1 - 2/(9k) + z_p*sqrt(2/(9k)))^3
  const z_p = 1.6449; // qnorm(0.95)
  const term = 1 - 2 / (9 * k) + z_p * Math.sqrt(2 / (9 * k));
  return k * Math.pow(term, 3);
}

// ============================================================================
// HELPERS
// ============================================================================

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Extract comparable dimension pairs from predicted/actual */
function extractDimensions(
  predicted: PredictedValues,
  actual: ActualValues,
): Array<{ name: string; pred: number; act: number }> {
  const dims: Array<{ name: string; pred: number; act: number }> = [];
  const keys: Array<keyof PredictedValues> = [
    "cycle_time_min",
    "tool_life_min",
    "surface_roughness_um",
    "cutting_force_N",
    "power_kW",
  ];
  for (const k of keys) {
    const p = predicted[k];
    const a = actual[k];
    if (p != null && a != null && p > 0) {
      dims.push({ name: k, pred: p, act: a });
    }
  }
  return dims;
}

/** Compute per-dimension standard deviations from history */
function estimateSigmas(
  history: AnomalyRecord[],
  dims: string[],
): Record<string, number> {
  const sigmas: Record<string, number> = {};
  for (const dim of dims) {
    const errors: number[] = [];
    for (const rec of history) {
      const p = (rec.predicted as any)[dim];
      const a = (rec.actual as any)[dim];
      if (p != null && a != null && p > 0) {
        errors.push(a / p - 1);
      }
    }
    if (errors.length >= 3) {
      const mean = errors.reduce((s, v) => s + v, 0) / errors.length;
      const variance =
        errors.reduce((s, v) => s + (v - mean) ** 2, 0) / (errors.length - 1);
      sigmas[dim] = Math.sqrt(variance) || 0.1;
    } else {
      // Cold start: assume 20% standard deviation
      sigmas[dim] = 0.2;
    }
  }
  return sigmas;
}

/** Severity tier from d² and threshold */
function severityTier(
  distance: number,
  threshold: number,
): "none" | "mild" | "moderate" | "severe" {
  if (distance <= threshold) return "none";
  const ratio = distance / threshold;
  if (ratio < 2) return "mild";
  if (ratio < 4) return "moderate";
  return "severe";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AnomalyDetectionEngine {
  private records: AnomalyRecord[] = [];
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath =
      persistPath ?? path.join(os.homedir(), ".prism", "anomaly-detection.json");
    this._load();
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Detect whether actual results deviate significantly from predicted.
   * Uses Mahalanobis distance with chi-squared threshold.
   */
  detectAnomaly(
    predicted: PredictedValues,
    actual: ActualValues,
  ): AnomalyDetectionResult {
    const dims = extractDimensions(predicted, actual);
    const k = dims.length;

    if (k === 0) {
      return {
        is_anomaly: false,
        distance: 0,
        threshold: 0,
        degrees_of_freedom: 0,
        factors: [],
        severity: "none",
        timestamp: Date.now(),
      };
    }

    const threshold = chi2Threshold(k);

    // Estimate per-dimension sigmas from history
    const dimNames = dims.map((d) => d.name);
    const sigmas = estimateSigmas(this.records, dimNames);

    // Build deviation (relative error) vector and Mahalanobis d²
    // Using diagonal covariance (independence assumption):
    //   d² = sum_i ((x_i - 0) / sigma_i)²
    //   where x_i = act_i/pred_i - 1  (relative error, expected = 0)
    const factors: AnomalyFactor[] = [];
    let d2 = 0;

    for (const { name, pred, act } of dims) {
      const rel_error = (act - pred) / pred;
      const sigma = sigmas[name] ?? 0.2;
      const z_score = rel_error / sigma;
      d2 += z_score * z_score;

      factors.push({
        dimension: name,
        predicted: pred,
        actual: act,
        deviation_ratio: act / pred,
        relative_error: rel_error,
        z_score,
      });
    }

    // Sort factors by |relative_error| descending
    factors.sort((a, b) => Math.abs(b.relative_error) - Math.abs(a.relative_error));

    const is_anomaly = d2 > threshold;

    return {
      is_anomaly,
      distance: d2,
      threshold,
      degrees_of_freedom: k,
      factors,
      severity: severityTier(d2, threshold),
      timestamp: Date.now(),
    };
  }

  /**
   * Record the prediction/actual pair and run anomaly detection.
   * Persists the record for future sigma estimation and history queries.
   */
  recordAndDetect(
    predicted: PredictedValues,
    actual: ActualValues,
    context: AnomalyContext = {},
  ): AnomalyRecord {
    const detection = this.detectAnomaly(predicted, actual);

    const record: AnomalyRecord = {
      id: uuid(),
      context: {
        ...context,
        timestamp: context.timestamp ?? Date.now(),
      },
      predicted,
      actual,
      detection,
    };

    this.records.push(record);

    // Keep history bounded to 2000 records
    if (this.records.length > 2000) {
      this.records = this.records.slice(this.records.length - 2000);
    }

    this._save();
    return record;
  }

  /**
   * Retrieve past anomaly records with optional filters.
   */
  getAnomalyHistory(filters: AnomalyHistoryFilter = {}): AnomalyRecord[] {
    let results = [...this.records];

    if (filters.machine_id != null) {
      results = results.filter(
        (r) => r.context.machine_id === filters.machine_id,
      );
    }
    if (filters.strategy != null) {
      results = results.filter((r) => r.context.strategy === filters.strategy);
    }
    if (filters.material != null) {
      results = results.filter((r) => r.context.material === filters.material);
    }
    if (filters.is_anomaly != null) {
      results = results.filter(
        (r) => r.detection.is_anomaly === filters.is_anomaly,
      );
    }
    if (filters.since_ms != null) {
      results = results.filter(
        (r) => (r.context.timestamp ?? 0) >= filters.since_ms!,
      );
    }

    // Most recent first
    results.sort((a, b) => (b.context.timestamp ?? 0) - (a.context.timestamp ?? 0));

    if (filters.limit != null && filters.limit > 0) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Propose multiplicative constant adjustments based on anomaly patterns.
   * Uses the most recent window (up to N=5) of anomalies for each dimension.
   */
  autoAdjust(anomaly: AnomalyDetectionResult): AutoAdjustResult {
    if (anomaly.factors.length === 0) {
      return {
        adjusted_constants: [],
        justification: "No factors to adjust — no comparable dimensions.",
        samples_used: 0,
      };
    }

    const WINDOW = 5;
    // Get last WINDOW anomalous records
    const recentAnomalies = this.records
      .filter((r) => r.detection.is_anomaly)
      .slice(-WINDOW);

    const adjustments: AdjustmentProposal[] = [];

    for (const factor of anomaly.factors) {
      const dim = factor.dimension;

      // Collect recent deviation ratios for this dimension
      const ratios: number[] = [factor.deviation_ratio];
      for (const rec of recentAnomalies) {
        const fac = rec.detection.factors.find((f) => f.dimension === dim);
        if (fac) ratios.push(fac.deviation_ratio);
      }

      // Proposed correction factor = mean of actual/predicted ratios
      const mean_ratio = ratios.reduce((s, v) => s + v, 0) / ratios.length;

      // Map dimension to physics constant
      const constantMap: Record<string, string> = {
        cycle_time_min: "cycle_time_constant",
        tool_life_min: "taylor_C_constant",
        surface_roughness_um: "roughness_coefficient",
        cutting_force_N: "specific_cutting_force_kc",
        power_kW: "spindle_efficiency_eta",
      };

      const constantName = constantMap[dim] ?? `${dim}_constant`;
      const confidence =
        ratios.length >= 4 ? "high" : ratios.length >= 2 ? "medium" : "low";

      adjustments.push({
        dimension: dim,
        current_factor: 1.0,
        proposed_factor: mean_ratio,
        justification:
          `Actual/predicted ratio = ${mean_ratio.toFixed(3)} ` +
          `averaged over ${ratios.length} sample(s). ` +
          `Recommend scaling ${constantName} by ${mean_ratio.toFixed(3)}.`,
        confidence,
      });
    }

    const dominantDim = anomaly.factors[0]?.dimension ?? "unknown";
    return {
      adjusted_constants: adjustments,
      justification:
        `Mahalanobis d²=${anomaly.distance.toFixed(2)} exceeded threshold ` +
        `${anomaly.threshold.toFixed(2)} (k=${anomaly.degrees_of_freedom}). ` +
        `Primary deviation in ${dominantDim} ` +
        `(${((anomaly.factors[0]?.relative_error ?? 0) * 100).toFixed(1)}% error). ` +
        `Multiplicative corrections computed from ${recentAnomalies.length + 1} recent samples.`,
      samples_used: recentAnomalies.length + 1,
    };
  }

  /** Clear all stored records */
  clearHistory(): void {
    this.records = [];
    this._save();
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE
  // --------------------------------------------------------------------------

  private _load(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, "utf8");
        const store: PersistenceStore = JSON.parse(raw);
        if (store.version === 1 && Array.isArray(store.records)) {
          this.records = store.records;
        }
      }
    } catch {
      // Silent on load failure
    }
  }

  private _save(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const store: PersistenceStore = {
        version: 1,
        records: this.records,
      };
      fs.writeFileSync(this.persistPath, JSON.stringify(store, null, 2), "utf8");
    } catch {
      // Silent on save failure
    }
  }
}

// Singleton export
export const anomalyDetectionEngine = new AnomalyDetectionEngine();
