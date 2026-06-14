/**
 * MillLoRAEnsembleCombinerEngine — Ensemble Prediction Combiner (Mill parity)
 * ============================================================================
 *
 * Combines numeric predictions from multiple MillLoRA adapters, with
 * MILL-CANONICAL axis_mode + feature_signature scoping so a 5-axis
 * prediction is never blended with a 3-axis face-mill prediction.
 *
 * Mill parity for LatheLoRAEnsembleCombinerEngine (LATHE-LORA-MS0 U-LLR42)
 * with MILL-CANONICAL extensions:
 *
 *   - Per-prediction axis_mode tag — combiner filters predictions to a
 *     single axis_mode by default (cross-axis blend rejected unless
 *     allow_cross_axis is explicitly opted-in)
 *   - Per-prediction feature_signature tag (prismatic / pocket_2_5d /
 *     mold_3d / thin_wall / other) — same family as iter88 embedding cache
 *   - Mill-canonical combination methods on top of 6 lathe-shared:
 *       chatter_robust — Tukey-trimmed mean + 3σ outlier reject + boost
 *                        members with low chatter_breach_history
 *       tcpm_safe       — drop members with tcpm_solver_failure_history
 *                         above the configured threshold before averaging
 *
 * @module engines/MillLoRAEnsembleCombinerEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-ENSEMBLE-COMBINER (iter92)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillCombinationMethod =
  // Lathe-shared (6)
  | "mean"
  | "weighted_mean"
  | "median"
  | "trimmed_mean"
  | "geometric_mean"
  | "harmonic_mean"
  // MILL-CANONICAL (2)
  | "chatter_robust"
  | "tcpm_safe";

export const MILL_CANONICAL_COMBINATION_METHODS: MillCombinationMethod[] = [
  "chatter_robust",
  "tcpm_safe",
];

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

/** Feature signature — matches iter88 MillLoRAEmbeddingCacheEngine. */
export type MillFeatureSignature = "prismatic" | "pocket_2_5d" | "mold_3d" | "thin_wall" | "other";

export interface MillNumericPrediction {
  model_id: string;
  value: number;
  confidence: number;
  unit?: string;
  /** MILL-CANONICAL: which axis mode this model was trained on. */
  axis_mode?: MillAxisMode;
  /** MILL-CANONICAL: feature-signature this model is good at. */
  feature_signature?: MillFeatureSignature;
  /** MILL-CANONICAL: prior chatter breach rate (0..1) for this model. */
  chatter_breach_history?: number;
  /** MILL-CANONICAL: prior TCPM solver failure rate (0..1) for this model. */
  tcpm_solver_failure_history?: number;
}

export interface MillCombinationResult {
  id: string;
  method: MillCombinationMethod;
  combined_value: number;
  standard_deviation: number;
  min_value: number;
  max_value: number;
  range: number;
  inputs: MillNumericPrediction[];
  outliers_removed: number;
  confidence: number;
  created_at: number;
  /** MILL-CANONICAL: count of members dropped for axis_mode mismatch. */
  axis_mismatches_dropped: number;
  /** MILL-CANONICAL: count of members dropped for tcpm fault history. */
  tcpm_unsafe_dropped: number;
}

export interface MillCombinerConfig {
  default_method: MillCombinationMethod;
  trim_percent: number;
  outlier_z_threshold: number;
  min_inputs: number;
  max_inputs: number;
  /** MILL-CANONICAL: tcpm history above this is dropped under tcpm_safe. */
  tcpm_fault_history_threshold: number;
  /** MILL-CANONICAL: chatter_robust max-allowed breach history weight floor. */
  chatter_robust_weight_floor: number;
}

const DEFAULT_CONFIG: MillCombinerConfig = {
  default_method: "weighted_mean",
  trim_percent: 0.1,
  outlier_z_threshold: 2.5,
  min_inputs: 2,
  max_inputs: 20,
  tcpm_fault_history_threshold: 0.05,
  chatter_robust_weight_floor: 0.1,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAEnsembleCombinerEngine {
  private config: MillCombinerConfig = { ...DEFAULT_CONFIG };
  private history: MillCombinationResult[] = [];

  setConfig(config: Partial<MillCombinerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillCombinerConfig {
    return { ...this.config };
  }

  mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

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

  median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  trimmedMean(values: number[], trimPercent: number): number {
    if (values.length < 3) return this.mean(values);
    const sorted = [...values].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * trimPercent);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return this.mean(trimmed);
  }

  geometricMean(values: number[]): number {
    if (values.length === 0) return 0;
    for (const v of values) if (v <= 0) return 0;
    const logSum = values.reduce((s, v) => s + Math.log(v), 0);
    return Math.exp(logSum / values.length);
  }

  harmonicMean(values: number[]): number {
    if (values.length === 0) return 0;
    for (const v of values) if (v <= 0) return 0;
    const reciprocalSum = values.reduce((s, v) => s + 1 / v, 0);
    return values.length / reciprocalSum;
  }

  standardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    const m = this.mean(values);
    const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  removeOutliers(values: number[]): { filtered: number[]; removedCount: number } {
    if (values.length < 4) return { filtered: values, removedCount: 0 };
    const m = this.mean(values);
    const sd = this.standardDeviation(values);
    if (sd === 0) return { filtered: values, removedCount: 0 };
    const filtered = values.filter((v) => Math.abs(v - m) / sd <= this.config.outlier_z_threshold);
    return { filtered, removedCount: values.length - filtered.length };
  }

  /**
   * MILL-CANONICAL: filter predictions to a single axis_mode.
   * If require_axis is supplied, only predictions tagged with that
   * axis_mode (or "shared") are kept. Returns the kept set + the
   * count dropped.
   */
  private filterByAxisMode(
    predictions: MillNumericPrediction[],
    require_axis: MillAxisMode | undefined,
    allow_cross_axis: boolean,
  ): { kept: MillNumericPrediction[]; dropped: number } {
    if (!require_axis || allow_cross_axis) return { kept: predictions, dropped: 0 };
    const kept = predictions.filter(
      (p) => !p.axis_mode || p.axis_mode === require_axis || p.axis_mode === "shared",
    );
    return { kept, dropped: predictions.length - kept.length };
  }

  /**
   * MILL-CANONICAL: drop members whose tcpm_solver_failure_history is
   * above the configured threshold. Used by the tcpm_safe method.
   */
  private filterTcpmSafe(predictions: MillNumericPrediction[]): { kept: MillNumericPrediction[]; dropped: number } {
    const thr = this.config.tcpm_fault_history_threshold;
    const kept = predictions.filter(
      (p) => typeof p.tcpm_solver_failure_history !== "number" || p.tcpm_solver_failure_history <= thr,
    );
    return { kept, dropped: predictions.length - kept.length };
  }

  /**
   * MILL-CANONICAL: derive chatter-robust weights — start from each
   * member's confidence, multiply by (1 - chatter_breach_history) so
   * historically-chatter-prone models contribute less. Weights floor
   * at chatter_robust_weight_floor to keep the ensemble non-degenerate.
   */
  private chatterRobustWeights(predictions: MillNumericPrediction[]): number[] {
    const floor = this.config.chatter_robust_weight_floor;
    return predictions.map((p) => {
      const breach = typeof p.chatter_breach_history === "number" ? Math.max(0, Math.min(1, p.chatter_breach_history)) : 0;
      const w = p.confidence * (1 - breach);
      return Math.max(floor, w);
    });
  }

  /**
   * Combine predictions. MILL-CANONICAL opts:
   *   - require_axis: only blend predictions matching this axis_mode (or "shared")
   *   - allow_cross_axis: opt-in cross-axis blend (default false)
   */
  combine(
    predictions: MillNumericPrediction[],
    opts?: {
      method?: MillCombinationMethod;
      require_axis?: MillAxisMode;
      allow_cross_axis?: boolean;
    },
  ): MillCombinationResult {
    const allow_cross_axis = opts?.allow_cross_axis ?? false;
    const { kept: axisKept, dropped: axisDropped } = this.filterByAxisMode(
      predictions,
      opts?.require_axis,
      allow_cross_axis,
    );

    if (axisKept.length < this.config.min_inputs) {
      throw new Error(`Min inputs not met after axis filter: ${axisKept.length} < ${this.config.min_inputs}`);
    }
    if (axisKept.length > this.config.max_inputs) {
      throw new Error(`Max inputs exceeded: ${axisKept.length} > ${this.config.max_inputs}`);
    }

    const m = opts?.method ?? this.config.default_method;

    let working = axisKept;
    let tcpmDropped = 0;
    if (m === "tcpm_safe") {
      const filt = this.filterTcpmSafe(working);
      working = filt.kept;
      tcpmDropped = filt.dropped;
      if (working.length < this.config.min_inputs) {
        throw new Error(`Min inputs not met after tcpm_safe filter: ${working.length} < ${this.config.min_inputs}`);
      }
    }

    const values = working.map((p) => p.value);
    const confidences = working.map((p) => p.confidence);

    const shouldRemoveOutliers = m === "mean" || m === "trimmed_mean" || m === "median" || m === "chatter_robust";
    const { filtered, removedCount } = shouldRemoveOutliers
      ? this.removeOutliers(values)
      : { filtered: values, removedCount: 0 };

    let combined: number;
    switch (m) {
      case "mean":
        combined = this.mean(filtered);
        break;
      case "weighted_mean":
        combined = this.weightedMean(values, confidences);
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
      case "chatter_robust": {
        // Trim, then weight by chatter-aware weights against the SURVIVING values
        const sortedPairs = working
          .map((p, i) => ({ p, i, v: values[i] }))
          .sort((a, b) => a.v - b.v);
        const trim = Math.floor(sortedPairs.length * this.config.trim_percent);
        const survivors = sortedPairs.slice(trim, sortedPairs.length - trim).map((s) => s.p);
        const w = this.chatterRobustWeights(survivors);
        combined = this.weightedMean(survivors.map((p) => p.value), w);
        break;
      }
      case "tcpm_safe":
        combined = this.weightedMean(values, confidences);
        break;
      default:
        combined = this.mean(values);
    }

    const sd = this.standardDeviation(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avgConf = working.reduce((s, p) => s + p.confidence, 0) / working.length;

    const result: MillCombinationResult = {
      id: `combine-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      method: m,
      combined_value: combined,
      standard_deviation: sd,
      min_value: min,
      max_value: max,
      range: max - min,
      inputs: working,
      outliers_removed: removedCount,
      confidence: avgConf,
      created_at: Date.now(),
      axis_mismatches_dropped: axisDropped,
      tcpm_unsafe_dropped: tcpmDropped,
    };

    this.history.push(result);
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
    return result;
  }

  getHistory(limit?: number): MillCombinationResult[] {
    const list = [...this.history];
    return typeof limit === "number" ? list.slice(-limit) : list;
  }

  getStats(): {
    total_combinations: number;
    avg_std_deviation: number;
    avg_range: number;
    avg_confidence: number;
    method_distribution: Record<string, number>;
    total_axis_mismatches_dropped: number;
    total_tcpm_unsafe_dropped: number;
  } {
    const total = this.history.length;
    if (total === 0) {
      return {
        total_combinations: 0,
        avg_std_deviation: 0,
        avg_range: 0,
        avg_confidence: 0,
        method_distribution: {},
        total_axis_mismatches_dropped: 0,
        total_tcpm_unsafe_dropped: 0,
      };
    }
    const avgSd = this.history.reduce((s, h) => s + h.standard_deviation, 0) / total;
    const avgRange = this.history.reduce((s, h) => s + h.range, 0) / total;
    const avgConf = this.history.reduce((s, h) => s + h.confidence, 0) / total;
    const methodDist: Record<string, number> = {};
    let axisDropped = 0;
    let tcpmDropped = 0;
    for (const h of this.history) {
      methodDist[h.method] = (methodDist[h.method] ?? 0) + 1;
      axisDropped += h.axis_mismatches_dropped;
      tcpmDropped += h.tcpm_unsafe_dropped;
    }
    return {
      total_combinations: total,
      avg_std_deviation: avgSd,
      avg_range: avgRange,
      avg_confidence: avgConf,
      method_distribution: methodDist,
      total_axis_mismatches_dropped: axisDropped,
      total_tcpm_unsafe_dropped: tcpmDropped,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Ensemble Combiner Summary",
      "===================================",
      `Total Combinations: ${stats.total_combinations}`,
      `Avg Std Dev: ${stats.avg_std_deviation.toFixed(3)}`,
      `Avg Range: ${stats.avg_range.toFixed(3)}`,
      `Avg Confidence: ${stats.avg_confidence.toFixed(3)}`,
      `Axis Mismatches Dropped: ${stats.total_axis_mismatches_dropped}`,
      `TCPM Unsafe Dropped: ${stats.total_tcpm_unsafe_dropped}`,
    ].join("\n");
  }

  clear(): void {
    this.history = [];
  }

  reset(): void {
    this.history = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAEnsembleCombinerEngine = new MillLoRAEnsembleCombinerEngine();
export { MillLoRAEnsembleCombinerEngine };
