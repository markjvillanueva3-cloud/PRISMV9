/**
 * LatheLoRAEnsembleCombinerEngine — LATHE-LORA-MS0 U-LLR42
 * =========================================================
 *
 * Combines numeric predictions from multiple LoRA adapters.
 * Supports averaging, weighted blends, and outlier-robust methods.
 *
 * Features:
 *   - Simple/weighted average
 *   - Median, trimmed mean
 *   - Geometric/harmonic mean
 *   - Outlier-robust combination
 *
 * @module engines/LatheLoRAEnsembleCombinerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Combination method */
export type CombinationMethod =
  | "mean"
  | "weighted_mean"
  | "median"
  | "trimmed_mean"
  | "geometric_mean"
  | "harmonic_mean";

/** Numeric prediction from a model */
export interface NumericPrediction {
  model_id: string;
  value: number;
  confidence: number;
  unit?: string;
}

/** Combination result */
export interface CombinationResult {
  id: string;
  method: CombinationMethod;
  combined_value: number;
  standard_deviation: number;
  min_value: number;
  max_value: number;
  range: number;
  inputs: NumericPrediction[];
  outliers_removed: number;
  confidence: number;
  created_at: number;
}

/** Combiner configuration */
export interface CombinerConfig {
  default_method: CombinationMethod;
  trim_percent: number;
  outlier_z_threshold: number;
  min_inputs: number;
  max_inputs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CombinerConfig = {
  default_method: "weighted_mean",
  trim_percent: 0.1, // Trim 10% from each end
  outlier_z_threshold: 2.5,
  min_inputs: 2,
  max_inputs: 20,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAEnsembleCombinerEngine {
  private config: CombinerConfig = DEFAULT_CONFIG;
  private history: CombinationResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<CombinerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CombinerConfig {
    return { ...this.config };
  }

  /**
   * Simple arithmetic mean
   */
  mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  /**
   * Weighted mean (weights sum to 1)
   */
  weightedMean(values: number[], weights: number[]): number {
    if (values.length !== weights.length) throw new Error("Length mismatch");
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight === 0) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i] * (weights[i] / totalWeight);
    }
    return sum;
  }

  /**
   * Median
   */
  median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Trimmed mean
   */
  trimmedMean(values: number[], trimPercent: number): number {
    if (values.length < 3) return this.mean(values);
    const sorted = [...values].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * trimPercent);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return this.mean(trimmed);
  }

  /**
   * Geometric mean
   */
  geometricMean(values: number[]): number {
    if (values.length === 0) return 0;
    for (const v of values) {
      if (v <= 0) return 0; // geometric mean undefined for non-positive
    }
    const logSum = values.reduce((s, v) => s + Math.log(v), 0);
    return Math.exp(logSum / values.length);
  }

  /**
   * Harmonic mean
   */
  harmonicMean(values: number[]): number {
    if (values.length === 0) return 0;
    for (const v of values) {
      if (v <= 0) return 0;
    }
    const reciprocalSum = values.reduce((s, v) => s + 1 / v, 0);
    return values.length / reciprocalSum;
  }

  /**
   * Standard deviation
   */
  standardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    const m = this.mean(values);
    const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Remove outliers using z-score
   */
  removeOutliers(values: number[]): { filtered: number[]; removedCount: number } {
    if (values.length < 4) return { filtered: values, removedCount: 0 };
    const m = this.mean(values);
    const sd = this.standardDeviation(values);
    if (sd === 0) return { filtered: values, removedCount: 0 };
    const filtered = values.filter(v => Math.abs(v - m) / sd <= this.config.outlier_z_threshold);
    return { filtered, removedCount: values.length - filtered.length };
  }

  /**
   * Combine predictions
   */
  combine(predictions: NumericPrediction[], method?: CombinationMethod): CombinationResult {
    if (predictions.length < this.config.min_inputs) {
      throw new Error(`Min inputs not met: ${predictions.length} < ${this.config.min_inputs}`);
    }
    if (predictions.length > this.config.max_inputs) {
      throw new Error(`Max inputs exceeded: ${predictions.length} > ${this.config.max_inputs}`);
    }

    const m = method || this.config.default_method;
    const values = predictions.map(p => p.value);
    const weights = predictions.map(p => p.confidence);

    // Remove outliers first for robust methods
    const shouldRemoveOutliers = m === "mean" || m === "trimmed_mean" || m === "median";
    const { filtered, removedCount } = shouldRemoveOutliers
      ? this.removeOutliers(values)
      : { filtered: values, removedCount: 0 };

    let combined: number;
    switch (m) {
      case "mean":
        combined = this.mean(filtered);
        break;
      case "weighted_mean":
        combined = this.weightedMean(values, weights);
        break;
      case "median":
        combined = this.median(filtered);
        break;
      case "trimmed_mean":
        combined = this.trimmedMean(filtered, this.config.trim_percent);
        break;
      case "geometric_mean":
        combined = this.geometricMean(values);
        break;
      case "harmonic_mean":
        combined = this.harmonicMean(values);
        break;
      default:
        combined = this.mean(values);
    }

    const sd = this.standardDeviation(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avgConf = predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length;

    const result: CombinationResult = {
      id: `combine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method: m,
      combined_value: combined,
      standard_deviation: sd,
      min_value: min,
      max_value: max,
      range: max - min,
      inputs: predictions,
      outliers_removed: removedCount,
      confidence: avgConf,
      created_at: Date.now(),
    };

    this.history.push(result);

    // Trim
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }

    return result;
  }

  /**
   * Get history
   */
  getHistory(limit?: number): CombinationResult[] {
    const list = [...this.history];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Get stats
   */
  getStats(): {
    total_combinations: number;
    avg_std_deviation: number;
    avg_range: number;
    avg_confidence: number;
    method_distribution: Record<string, number>;
  } {
    const total = this.history.length;
    if (total === 0) {
      return {
        total_combinations: 0,
        avg_std_deviation: 0,
        avg_range: 0,
        avg_confidence: 0,
        method_distribution: {},
      };
    }

    const avgSd = this.history.reduce((s, h) => s + h.standard_deviation, 0) / total;
    const avgRange = this.history.reduce((s, h) => s + h.range, 0) / total;
    const avgConf = this.history.reduce((s, h) => s + h.confidence, 0) / total;

    const methodDist: Record<string, number> = {};
    for (const h of this.history) {
      methodDist[h.method] = (methodDist[h.method] || 0) + 1;
    }

    return {
      total_combinations: total,
      avg_std_deviation: avgSd,
      avg_range: avgRange,
      avg_confidence: avgConf,
      method_distribution: methodDist,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Ensemble Combiner Summary",
      "=========================",
      `Total Combinations: ${stats.total_combinations}`,
      `Avg Std Dev: ${stats.avg_std_deviation.toFixed(3)}`,
      `Avg Range: ${stats.avg_range.toFixed(3)}`,
      `Avg Confidence: ${stats.avg_confidence.toFixed(3)}`,
    ].join("\n");
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.history = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAEnsembleCombinerEngine = new LatheLoRAEnsembleCombinerEngine();
