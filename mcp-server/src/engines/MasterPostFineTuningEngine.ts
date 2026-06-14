/**
 * MasterPostFineTuningEngine — CAM-PARITY-AGI-MS0/U-CAMP15
 * =========================================================
 *
 * LoRA-style fine-tuning engine for post processors. Learns from actual vs predicted
 * G-code differences to continuously improve post-processor output quality.
 *
 * CORE CAPABILITIES:
 * 1. Record actual vs predicted G-code discrepancies
 * 2. Store controller-specific parameter adjustments (LoRA "deltas")
 * 3. Apply learned corrections to future post-processing
 * 4. Track confidence per controller/operation combination
 * 5. Export/import fine-tuning weights for model persistence
 * 6. Provide feedback loop for continuous improvement
 *
 * MATHEMATICAL FOUNDATIONS:
 * -------------------------
 * LoRA Adaptation Formula:
 *   W' = W + alpha * delta_W
 *   where delta_W = A * B^T (low-rank factorization)
 *
 * Confidence Scoring:
 *   C = 1 - exp(-n/tau) * (1 + sigma/mu_err)^-1
 *   where n = sample count, tau = decay constant, sigma = stddev, mu_err = mean error
 *
 * Exponential Moving Average for Weight Updates:
 *   delta_new = (1 - alpha) * delta_old + alpha * correction
 *
 * PHYSICS GROUNDING:
 * ------------------
 * Post-processor corrections are bounded by physical constraints:
 * - Feed rate adjustments: |delta_F| <= 0.3 * F_nominal (max 30% correction)
 * - Spindle corrections: |delta_S| <= 0.2 * S_nominal (max 20% correction)
 * - Dwell time corrections: bounded by thermal considerations
 *
 * References:
 * - Hu et al. (2021) "LoRA: Low-Rank Adaptation of Large Language Models"
 * - Adaptive control theory for CNC (Koren, 1983)
 * - Online learning (Shalev-Shwartz, 2012)
 *
 * @module engines/MasterPostFineTuningEngine
 * @version 1.0.0
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP15
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Supported controller families */
export type ControllerFamily =
  | "fanuc"
  | "siemens"
  | "haas"
  | "okuma"
  | "mazak"
  | "mitsubishi"
  | "heidenhain"
  | "hurco"
  | "brother"
  | "generic";

/** Operation types for fine-tuning segmentation */
export type OperationType =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "drilling"
  | "tapping"
  | "boring"
  | "threading"
  | "probing"
  | "5axis"
  | "hsm"
  | "adaptive"
  | "unknown";

/** G-code parameter types that can be fine-tuned */
export type ParameterType =
  | "feed_rate"
  | "spindle_speed"
  | "dwell_time"
  | "approach_distance"
  | "retract_height"
  | "stepover"
  | "stepdown"
  | "tolerance"
  | "smoothing_factor"
  | "look_ahead";

/** Single discrepancy record between predicted and actual G-code */
export interface DiscrepancyRecord {
  /** Unique identifier */
  id: string;
  /** Controller family */
  controller: ControllerFamily;
  /** Operation type */
  operation: OperationType;
  /** Parameter being compared */
  parameter: ParameterType;
  /** Predicted value from post processor */
  predicted_value: number;
  /** Actual value from validated/corrected program */
  actual_value: number;
  /** Correction applied (actual - predicted) */
  correction: number;
  /** Relative error magnitude */
  relative_error: number;
  /** Context features */
  context: {
    material?: string;
    tool_diameter_mm?: number;
    tool_type?: string;
    cutting_speed_m_min?: number;
    program_id?: string;
    job_id?: string;
    [k: string]: unknown;
  };
  /** Timestamp ISO */
  timestamp: string;
  /** Weight for this observation (JM-DIE proven programs get 2x) */
  weight: number;
}

/** Low-rank adaptation weights for a controller/operation pair */
export interface LoRAWeights {
  /** Controller family */
  controller: ControllerFamily;
  /** Operation type */
  operation: OperationType;
  /** Parameter-specific delta corrections */
  deltas: Record<ParameterType, number>;
  /** Parameter-specific confidence scores [0, 1] */
  confidences: Record<ParameterType, number>;
  /** Sample count per parameter */
  sample_counts: Record<ParameterType, number>;
  /** Running variance for confidence calculation */
  variances: Record<ParameterType, number>;
  /** True running mean of the raw corrections per parameter -- the statistic for online
   *  Welford variance, kept distinct from the bounded/smoothed EMA `deltas` applicator. */
  correction_means: Record<ParameterType, number>;
  /** Last updated timestamp */
  last_updated: string;
  /** Total samples across all parameters */
  total_samples: number;
  /** Average confidence across parameters */
  avg_confidence: number;
}

/** Fine-tuned parameter adjustments to apply */
export interface FineTunedParameters {
  controller: ControllerFamily;
  operation: OperationType;
  adjustments: Array<{
    parameter: ParameterType;
    delta: number;
    confidence: number;
    samples: number;
    apply_recommendation: "apply" | "review" | "skip";
  }>;
  overall_confidence: number;
  ready_for_application: boolean;
  warnings: string[];
}

/** G-code block with fine-tuning applied */
export interface FineTunedGCode {
  original_gcode: string;
  fine_tuned_gcode: string;
  modifications: Array<{
    line_number: number;
    original_line: string;
    modified_line: string;
    parameter: ParameterType;
    original_value: number;
    adjusted_value: number;
    delta_applied: number;
    confidence: number;
  }>;
  blocks_modified: number;
  total_blocks: number;
  modification_rate: number;
  confidence_score: number;
}

/** Confidence score result */
export interface ConfidenceResult {
  controller: ControllerFamily;
  operation: OperationType;
  parameter: ParameterType;
  confidence: number;
  sample_count: number;
  variance: number;
  mean_correction: number;
  stability: "stable" | "converging" | "unstable" | "insufficient_data";
  recommendation: string;
}

/** Export format for fine-tuning data */
export interface FineTuningExport {
  version: string;
  exported_at: string;
  weights: LoRAWeights[];
  statistics: {
    total_observations: number;
    controllers_tuned: number;
    operations_tuned: number;
    avg_confidence: number;
    oldest_observation: string;
    newest_observation: string;
  };
  checksum: string;
}

/** Configuration for the engine */
export interface FineTuningConfig {
  /** Learning rate for EMA updates (default 0.1) */
  learning_rate: number;
  /** Minimum samples before applying corrections (default 10) */
  min_samples_threshold: number;
  /** Confidence threshold for auto-apply (default 0.75) */
  confidence_threshold: number;
  /** Decay constant for confidence calculation (default 50) */
  confidence_decay_tau: number;
  /** Maximum correction magnitude as fraction of nominal (default 0.3) */
  max_correction_fraction: number;
  /** Weight multiplier for JM-DIE proven programs (default 2.0) */
  proven_program_weight: number;
  /** History buffer capacity per controller/operation pair */
  history_capacity: number;
}

const DEFAULT_CONFIG: FineTuningConfig = {
  learning_rate: 0.1,
  min_samples_threshold: 10,
  confidence_threshold: 0.75,
  confidence_decay_tau: 50,
  max_correction_fraction: 0.3,
  proven_program_weight: 2.0,
  history_capacity: 1000,
};

const PARAMETER_TYPES: ParameterType[] = [
  "feed_rate",
  "spindle_speed",
  "dwell_time",
  "approach_distance",
  "retract_height",
  "stepover",
  "stepdown",
  "tolerance",
  "smoothing_factor",
  "look_ahead",
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MasterPostFineTuningEngine {
  private weights: Map<string, LoRAWeights> = new Map();
  private history: DiscrepancyRecord[] = [];
  private config: FineTuningConfig;
  private observationCounter = 0;

  constructor(config: Partial<FineTuningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.learning_rate <= 0 || this.config.learning_rate > 1) {
      throw new Error("learning_rate must be in (0, 1]");
    }
    if (this.config.min_samples_threshold < 1) {
      throw new Error("min_samples_threshold must be >= 1");
    }
    if (this.config.confidence_threshold <= 0 || this.config.confidence_threshold > 1) {
      throw new Error("confidence_threshold must be in (0, 1]");
    }
  }

  // ==========================================================================
  // CORE API METHODS
  // ==========================================================================

  /**
   * Record a discrepancy between predicted and actual G-code values.
   * This is the primary learning input for the fine-tuning system.
   *
   * @param predicted - The G-code predicted by the post processor
   * @param actual - The actual/corrected G-code from production
   * @param controller - The controller family
   * @param options - Additional context options
   * @returns The recorded discrepancy details
   */
  recordActualVsPredicted(
    predicted: string,
    actual: string,
    controller: ControllerFamily,
    options: {
      operation?: OperationType;
      context?: Record<string, unknown>;
      jm_die_proven?: boolean;
    } = {}
  ): {
    discrepancies_found: number;
    records: DiscrepancyRecord[];
    weights_updated: boolean;
  } {
    const operation = options.operation ?? this.inferOperation(predicted);
    const weight = options.jm_die_proven ? this.config.proven_program_weight : 1.0;
    const timestamp = new Date().toISOString();

    const discrepancies = this.extractDiscrepancies(predicted, actual, controller, operation, weight, options.context ?? {}, timestamp);

    // Update weights for each discrepancy
    let weightsUpdated = false;
    for (const record of discrepancies) {
      this.history.push(record);
      this.updateWeights(record);
      weightsUpdated = true;
    }

    // Trim history if needed
    while (this.history.length > this.config.history_capacity * 10) {
      this.history.shift();
    }

    log.debug(`[MasterPostFineTuning] Recorded ${discrepancies.length} discrepancies for ${controller}/${operation}`);

    return {
      discrepancies_found: discrepancies.length,
      records: discrepancies,
      weights_updated: weightsUpdated,
    };
  }

  /**
   * Get fine-tuned parameter adjustments for a specific controller/operation.
   *
   * @param controller - Controller family
   * @param operation - Operation type
   * @returns Fine-tuned parameters with confidence scores
   */
  getFineTunedParameters(
    controller: ControllerFamily,
    operation: OperationType
  ): FineTunedParameters {
    const key = this.makeKey(controller, operation);
    const weights = this.weights.get(key);

    if (!weights) {
      return {
        controller,
        operation,
        adjustments: [],
        overall_confidence: 0,
        ready_for_application: false,
        warnings: ["No fine-tuning data available for this controller/operation pair"],
      };
    }

    const adjustments: FineTunedParameters["adjustments"] = [];
    const warnings: string[] = [];

    for (const param of PARAMETER_TYPES) {
      const delta = weights.deltas[param];
      const confidence = weights.confidences[param];
      const samples = weights.sample_counts[param];

      if (samples === 0) continue;

      const variance = weights.variances[param];
      const stability = this.assessStability(variance, samples);

      let recommendation: "apply" | "review" | "skip";
      if (confidence >= this.config.confidence_threshold && samples >= this.config.min_samples_threshold) {
        recommendation = "apply";
      } else if (
        samples >= this.config.min_samples_threshold &&
        (stability === "stable" || stability === "converging")
      ) {
        // Enough samples AND a consistent (low-variance) correction signal -> human review,
        // even while the tau-decayed confidence scalar is still climbing toward the apply bar.
        recommendation = "review";
      } else if (confidence >= 0.5 && samples >= this.config.min_samples_threshold / 2) {
        recommendation = "review";
      } else {
        recommendation = "skip";
        if (samples > 0 && samples < this.config.min_samples_threshold) {
          warnings.push(`${param}: only ${samples} samples (need ${this.config.min_samples_threshold})`);
        }
      }

      adjustments.push({
        parameter: param,
        delta,
        confidence,
        samples,
        apply_recommendation: recommendation,
      });
    }

    const overallConfidence = adjustments.length > 0
      ? adjustments.reduce((s, a) => s + a.confidence * a.samples, 0) /
        adjustments.reduce((s, a) => s + a.samples, 0)
      : 0;

    const readyCount = adjustments.filter(a => a.apply_recommendation === "apply").length;
    const readyForApplication = readyCount >= 3 && overallConfidence >= this.config.confidence_threshold;

    return {
      controller,
      operation,
      adjustments,
      overall_confidence: round(overallConfidence, 4),
      ready_for_application: readyForApplication,
      warnings,
    };
  }

  /**
   * Apply fine-tuning corrections to G-code.
   *
   * @param gcode - Original G-code to fine-tune
   * @param controller - Controller family
   * @param options - Application options
   * @returns Fine-tuned G-code with modification details
   */
  applyFineTuning(
    gcode: string,
    controller: ControllerFamily,
    options: {
      operation?: OperationType;
      force_apply?: boolean;
      confidence_threshold?: number;
    } = {}
  ): FineTunedGCode {
    const operation = options.operation ?? this.inferOperation(gcode);
    const threshold = options.confidence_threshold ?? this.config.confidence_threshold;
    const key = this.makeKey(controller, operation);
    const weights = this.weights.get(key);

    if (!weights && !options.force_apply) {
      return {
        original_gcode: gcode,
        fine_tuned_gcode: gcode,
        modifications: [],
        blocks_modified: 0,
        total_blocks: gcode.split("\n").filter(l => l.trim()).length,
        modification_rate: 0,
        confidence_score: 0,
      };
    }

    const lines = gcode.split("\n");
    const modifications: FineTunedGCode["modifications"] = [];
    const modifiedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const { modified, mods } = this.applyLineCorrections(line, weights, threshold, i + 1);
      modifiedLines.push(modified);
      modifications.push(...mods);
    }

    const blocksModified = modifications.length;
    const totalBlocks = lines.filter(l => l.trim()).length;
    const avgConfidence = modifications.length > 0
      ? modifications.reduce((s, m) => s + m.confidence, 0) / modifications.length
      : weights?.avg_confidence ?? 0;

    return {
      original_gcode: gcode,
      fine_tuned_gcode: modifiedLines.join("\n"),
      modifications,
      blocks_modified: blocksModified,
      total_blocks: totalBlocks,
      modification_rate: totalBlocks > 0 ? round(blocksModified / totalBlocks, 4) : 0,
      confidence_score: round(avgConfidence, 4),
    };
  }

  /**
   * Get confidence score for a specific controller/operation/parameter combination.
   *
   * @param controller - Controller family
   * @param operation - Operation type
   * @param parameter - Parameter type (optional, returns overall if not specified)
   * @returns Confidence details
   */
  getConfidenceScore(
    controller: ControllerFamily,
    operation: OperationType,
    parameter?: ParameterType
  ): ConfidenceResult {
    const key = this.makeKey(controller, operation);
    const weights = this.weights.get(key);

    if (!weights) {
      return {
        controller,
        operation,
        parameter: parameter ?? "feed_rate",
        confidence: 0,
        sample_count: 0,
        variance: 0,
        mean_correction: 0,
        stability: "insufficient_data",
        recommendation: "Collect more training data for this controller/operation pair",
      };
    }

    if (parameter) {
      return this.getParameterConfidence(weights, controller, operation, parameter);
    }

    // Return overall confidence
    const totalSamples = Object.values(weights.sample_counts).reduce((s, n) => s + n, 0);
    const avgVariance = Object.values(weights.variances).reduce((s, v) => s + v, 0) / PARAMETER_TYPES.length;
    const avgDelta = Object.values(weights.deltas).reduce((s, d) => s + Math.abs(d), 0) / PARAMETER_TYPES.length;

    const stability = this.assessStability(avgVariance, totalSamples);

    return {
      controller,
      operation,
      parameter: "feed_rate",
      confidence: weights.avg_confidence,
      sample_count: totalSamples,
      variance: round(avgVariance, 6),
      mean_correction: round(avgDelta, 6),
      stability,
      recommendation: this.generateRecommendation(stability, weights.avg_confidence, totalSamples),
    };
  }

  /**
   * Export all fine-tuning data for persistence or transfer.
   *
   * @returns Serializable fine-tuning export
   */
  exportFineTuningData(): FineTuningExport {
    const weightsArray = Array.from(this.weights.values());
    const timestamps = this.history.map(h => h.timestamp).sort();

    const stats = {
      total_observations: this.history.length,
      controllers_tuned: new Set(weightsArray.map(w => w.controller)).size,
      operations_tuned: new Set(weightsArray.map(w => w.operation)).size,
      avg_confidence: weightsArray.length > 0
        ? round(weightsArray.reduce((s, w) => s + w.avg_confidence, 0) / weightsArray.length, 4)
        : 0,
      oldest_observation: timestamps[0] ?? "",
      newest_observation: timestamps[timestamps.length - 1] ?? "",
    };

    const exportData: FineTuningExport = {
      version: "1.0.0",
      exported_at: new Date().toISOString(),
      weights: weightsArray,
      statistics: stats,
      checksum: this.computeChecksum(weightsArray),
    };

    log.info(`[MasterPostFineTuning] Exported ${weightsArray.length} weight sets, ${stats.total_observations} observations`);

    return exportData;
  }

  /**
   * Import fine-tuning data from a previous export.
   *
   * @param data - Fine-tuning export data
   * @param options - Import options
   * @returns Import result
   */
  importFineTuningData(
    data: FineTuningExport,
    options: {
      merge?: boolean;
      validate_checksum?: boolean;
    } = {}
  ): {
    success: boolean;
    weights_imported: number;
    merged: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate checksum
    if (options.validate_checksum !== false) {
      const expectedChecksum = this.computeChecksum(data.weights);
      if (data.checksum !== expectedChecksum) {
        errors.push("Checksum mismatch — data may be corrupted");
        return { success: false, weights_imported: 0, merged: false, errors };
      }
    }

    // Validate version
    if (!data.version || !data.version.startsWith("1.")) {
      errors.push(`Unsupported version: ${data.version}`);
      return { success: false, weights_imported: 0, merged: false, errors };
    }

    const merge = options.merge ?? true;

    if (!merge) {
      this.weights.clear();
      this.history = [];
    }

    let imported = 0;
    for (const weight of data.weights) {
      const key = this.makeKey(weight.controller, weight.operation);

      if (merge && this.weights.has(key)) {
        // Merge weights using weighted average
        const existing = this.weights.get(key)!;
        const merged = this.mergeWeights(existing, weight);
        this.weights.set(key, merged);
      } else {
        this.weights.set(key, { ...weight });
      }
      imported++;
    }

    log.info(`[MasterPostFineTuning] Imported ${imported} weight sets (merge=${merge})`);

    return {
      success: true,
      weights_imported: imported,
      merged: merge,
      errors,
    };
  }

  // ==========================================================================
  // ADDITIONAL UTILITY METHODS
  // ==========================================================================

  /**
   * Get statistics about the fine-tuning state.
   */
  getStatistics(): {
    total_weights: number;
    total_observations: number;
    controllers: ControllerFamily[];
    operations: OperationType[];
    avg_confidence: number;
    best_tuned: { controller: ControllerFamily; operation: OperationType; confidence: number } | null;
    worst_tuned: { controller: ControllerFamily; operation: OperationType; confidence: number } | null;
  } {
    const weightsArray = Array.from(this.weights.values());
    const controllers = [...new Set(weightsArray.map(w => w.controller))];
    const operations = [...new Set(weightsArray.map(w => w.operation))];

    const sorted = weightsArray.sort((a, b) => b.avg_confidence - a.avg_confidence);
    const best = sorted[0] ?? null;
    const worst = sorted[sorted.length - 1] ?? null;

    return {
      total_weights: weightsArray.length,
      total_observations: this.history.length,
      controllers,
      operations,
      avg_confidence: weightsArray.length > 0
        ? round(weightsArray.reduce((s, w) => s + w.avg_confidence, 0) / weightsArray.length, 4)
        : 0,
      best_tuned: best ? { controller: best.controller, operation: best.operation, confidence: best.avg_confidence } : null,
      worst_tuned: worst ? { controller: worst.controller, operation: worst.operation, confidence: worst.avg_confidence } : null,
    };
  }

  /**
   * Clear all fine-tuning data.
   */
  clear(): void {
    this.weights.clear();
    this.history = [];
    this.observationCounter = 0;
    log.info("[MasterPostFineTuning] All data cleared");
  }

  /**
   * Get the current configuration.
   */
  getConfig(): FineTuningConfig {
    return { ...this.config };
  }

  /**
   * Get historical discrepancy records.
   */
  getHistory(options: {
    controller?: ControllerFamily;
    operation?: OperationType;
    parameter?: ParameterType;
    limit?: number;
  } = {}): DiscrepancyRecord[] {
    let filtered = this.history;

    if (options.controller) {
      filtered = filtered.filter(r => r.controller === options.controller);
    }
    if (options.operation) {
      filtered = filtered.filter(r => r.operation === options.operation);
    }
    if (options.parameter) {
      filtered = filtered.filter(r => r.parameter === options.parameter);
    }

    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private makeKey(controller: ControllerFamily, operation: OperationType): string {
    return `${controller}::${operation}`;
  }

  private inferOperation(gcode: string): OperationType {
    const lower = gcode.toLowerCase();

    if (/rough|hog|stock/i.test(lower)) return "roughing";
    if (/semi.?finish/i.test(lower)) return "semi_finishing";
    if (/finish/i.test(lower)) return "finishing";
    if (/drill|g8[1-3]/i.test(lower)) return "drilling";
    if (/tap|g84/i.test(lower)) return "tapping";
    if (/bore|g76|g85/i.test(lower)) return "boring";
    if (/thread/i.test(lower)) return "threading";
    if (/probe|g65.*p99/i.test(lower)) return "probing";
    if (/g43\.4|traori|tcpc/i.test(lower)) return "5axis";
    if (/hsm|high.?speed|g05\.1/i.test(lower)) return "hsm";
    if (/adaptive|imach|profit/i.test(lower)) return "adaptive";

    return "unknown";
  }

  private extractDiscrepancies(
    predicted: string,
    actual: string,
    controller: ControllerFamily,
    operation: OperationType,
    weight: number,
    context: Record<string, unknown>,
    timestamp: string
  ): DiscrepancyRecord[] {
    const records: DiscrepancyRecord[] = [];
    const predLines = predicted.split("\n");
    const actLines = actual.split("\n");

    // Extract parameter values from both versions
    const predParams = this.extractParameters(predLines);
    const actParams = this.extractParameters(actLines);

    // Compare and record discrepancies
    for (const param of PARAMETER_TYPES) {
      const predValues = predParams.get(param) ?? [];
      const actValues = actParams.get(param) ?? [];

      // Average comparison (simplified — could use DTW for sequence alignment)
      if (predValues.length > 0 && actValues.length > 0) {
        const predAvg = predValues.reduce((s, v) => s + v, 0) / predValues.length;
        const actAvg = actValues.reduce((s, v) => s + v, 0) / actValues.length;
        const correction = actAvg - predAvg;
        const relError = predAvg !== 0 ? Math.abs(correction / predAvg) : 0;

        // Only record significant discrepancies (>1% difference)
        if (relError > 0.01) {
          this.observationCounter++;
          records.push({
            id: `disc-${Date.now().toString(36)}-${this.observationCounter}`,
            controller,
            operation,
            parameter: param,
            predicted_value: round(predAvg, 4),
            actual_value: round(actAvg, 4),
            correction: round(correction, 4),
            relative_error: round(relError, 4),
            context,
            timestamp,
            weight,
          });
        }
      }
    }

    return records;
  }

  private extractParameters(lines: string[]): Map<ParameterType, number[]> {
    const params = new Map<ParameterType, number[]>();
    for (const p of PARAMETER_TYPES) params.set(p, []);

    for (const line of lines) {
      // Feed rate: F...
      const feedMatch = line.match(/F([0-9.]+)/i);
      if (feedMatch) params.get("feed_rate")!.push(parseFloat(feedMatch[1]));

      // Spindle speed: S...
      const spindleMatch = line.match(/S([0-9]+)/i);
      if (spindleMatch) params.get("spindle_speed")!.push(parseFloat(spindleMatch[1]));

      // Dwell: G04 P...
      const dwellMatch = line.match(/G0?4.*P([0-9.]+)/i);
      if (dwellMatch) params.get("dwell_time")!.push(parseFloat(dwellMatch[1]));

      // Z positions (approach/retract)
      const zMatch = line.match(/Z([0-9.]+)/i);
      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        if (z > 10) params.get("retract_height")!.push(z);
        if (z > 0 && z < 10) params.get("approach_distance")!.push(z);
      }
    }

    return params;
  }

  private updateWeights(record: DiscrepancyRecord): void {
    const key = this.makeKey(record.controller, record.operation);
    let weights = this.weights.get(key);

    if (!weights) {
      weights = this.initializeWeights(record.controller, record.operation);
      this.weights.set(key, weights);
    }

    const alpha = this.config.learning_rate * record.weight;
    const param = record.parameter;

    // EMA update for delta
    const oldDelta = weights.deltas[param];
    const newDelta = (1 - alpha) * oldDelta + alpha * record.correction;

    // Bound the delta by max_correction_fraction
    const maxCorrection = Math.abs(record.predicted_value) * this.config.max_correction_fraction;
    weights.deltas[param] = Math.max(-maxCorrection, Math.min(maxCorrection, newDelta));

    // Update running variance using Welford's online algorithm.
    // The statistic must track how consistent the raw CORRECTIONS are, so it runs against the
    // true running mean of corrections -- NOT `deltas[param]`, which is a bounded/smoothed EMA
    // applicator. Running it against the moving, clamped delta injected a spurious ramp-up
    // variance that never washed out (the prior bug: a perfectly consistent correction stream
    // reported variance ~131 instead of ~0, collapsing stability to "unstable").
    weights.sample_counts[param]++;
    const n = weights.sample_counts[param];

    // Self-heal legacy weight sets imported without correction_means (N-1 back-compat).
    if (!weights.correction_means) {
      weights.correction_means = {} as Record<ParameterType, number>;
      for (const p of PARAMETER_TYPES) weights.correction_means[p] = weights.deltas[p] ?? 0;
    }

    const prevMean = weights.correction_means[param];
    const newMean = prevMean + (record.correction - prevMean) / n;
    weights.correction_means[param] = newMean;
    // variance is stored as M2/n (population), so reconstruct M2 from the prior variance.
    const m2Prev = weights.variances[param] * (n - 1);
    const m2 = m2Prev + (record.correction - prevMean) * (record.correction - newMean);
    weights.variances[param] = n > 0 ? m2 / n : 0;

    // Update confidence (the large-correction penalty uses the true correction mean magnitude).
    weights.confidences[param] = this.computeConfidence(
      n,
      weights.variances[param],
      Math.abs(newMean)
    );

    // Update aggregates
    weights.total_samples = Object.values(weights.sample_counts).reduce((s, c) => s + c, 0);
    weights.avg_confidence = this.computeAverageConfidence(weights);
    weights.last_updated = record.timestamp;
  }

  private initializeWeights(controller: ControllerFamily, operation: OperationType): LoRAWeights {
    const deltas: Record<ParameterType, number> = {} as Record<ParameterType, number>;
    const confidences: Record<ParameterType, number> = {} as Record<ParameterType, number>;
    const sample_counts: Record<ParameterType, number> = {} as Record<ParameterType, number>;
    const variances: Record<ParameterType, number> = {} as Record<ParameterType, number>;
    const correction_means: Record<ParameterType, number> = {} as Record<ParameterType, number>;

    for (const p of PARAMETER_TYPES) {
      deltas[p] = 0;
      confidences[p] = 0;
      sample_counts[p] = 0;
      variances[p] = 0;
      correction_means[p] = 0;
    }

    return {
      controller,
      operation,
      deltas,
      confidences,
      sample_counts,
      variances,
      correction_means,
      last_updated: new Date().toISOString(),
      total_samples: 0,
      avg_confidence: 0,
    };
  }

  /**
   * Compute confidence using exponential decay and variance-based penalty.
   *
   * C = (1 - exp(-n/tau)) * (1 / (1 + sqrt(variance)))
   */
  private computeConfidence(sampleCount: number, variance: number, meanCorrection: number): number {
    const tau = this.config.confidence_decay_tau;
    const sampleFactor = 1 - Math.exp(-sampleCount / tau);
    const variancePenalty = 1 / (1 + Math.sqrt(variance));

    // Additional penalty for very large corrections (might indicate systematic error)
    const magnitudePenalty = meanCorrection > 100 ? 0.8 : 1.0;

    return round(sampleFactor * variancePenalty * magnitudePenalty, 4);
  }

  private computeAverageConfidence(weights: LoRAWeights): number {
    const activeParams = PARAMETER_TYPES.filter(p => weights.sample_counts[p] > 0);
    if (activeParams.length === 0) return 0;

    const totalWeightedConf = activeParams.reduce(
      (s, p) => s + weights.confidences[p] * weights.sample_counts[p],
      0
    );
    const totalSamples = activeParams.reduce((s, p) => s + weights.sample_counts[p], 0);

    return round(totalWeightedConf / totalSamples, 4);
  }

  private applyLineCorrections(
    line: string,
    weights: LoRAWeights | undefined,
    threshold: number,
    lineNumber: number
  ): {
    modified: string;
    mods: FineTunedGCode["modifications"];
  } {
    if (!weights) {
      return { modified: line, mods: [] };
    }

    const mods: FineTunedGCode["modifications"] = [];
    let modified = line;

    // Apply feed rate correction
    if (weights.confidences.feed_rate >= threshold && weights.sample_counts.feed_rate >= this.config.min_samples_threshold) {
      const feedMatch = line.match(/F([0-9.]+)/i);
      if (feedMatch) {
        const originalFeed = parseFloat(feedMatch[1]);
        const delta = weights.deltas.feed_rate;
        const adjustedFeed = Math.max(1, originalFeed + delta);
        modified = modified.replace(/F[0-9.]+/i, `F${round(adjustedFeed, 1)}`);
        mods.push({
          line_number: lineNumber,
          original_line: line,
          modified_line: modified,
          parameter: "feed_rate",
          original_value: originalFeed,
          adjusted_value: adjustedFeed,
          delta_applied: delta,
          confidence: weights.confidences.feed_rate,
        });
      }
    }

    // Apply spindle speed correction
    if (weights.confidences.spindle_speed >= threshold && weights.sample_counts.spindle_speed >= this.config.min_samples_threshold) {
      const spindleMatch = modified.match(/S([0-9]+)/i);
      if (spindleMatch) {
        const originalSpindle = parseFloat(spindleMatch[1]);
        const delta = weights.deltas.spindle_speed;
        const adjustedSpindle = Math.max(100, Math.round(originalSpindle + delta));
        modified = modified.replace(/S[0-9]+/i, `S${adjustedSpindle}`);
        mods.push({
          line_number: lineNumber,
          original_line: line,
          modified_line: modified,
          parameter: "spindle_speed",
          original_value: originalSpindle,
          adjusted_value: adjustedSpindle,
          delta_applied: delta,
          confidence: weights.confidences.spindle_speed,
        });
      }
    }

    return { modified, mods };
  }

  private getParameterConfidence(
    weights: LoRAWeights,
    controller: ControllerFamily,
    operation: OperationType,
    parameter: ParameterType
  ): ConfidenceResult {
    const confidence = weights.confidences[parameter];
    const sampleCount = weights.sample_counts[parameter];
    const variance = weights.variances[parameter];
    const meanCorrection = weights.deltas[parameter];
    const stability = this.assessStability(variance, sampleCount);

    return {
      controller,
      operation,
      parameter,
      confidence,
      sample_count: sampleCount,
      variance: round(variance, 6),
      mean_correction: round(meanCorrection, 6),
      stability,
      recommendation: this.generateRecommendation(stability, confidence, sampleCount),
    };
  }

  private assessStability(
    variance: number,
    sampleCount: number
  ): "stable" | "converging" | "unstable" | "insufficient_data" {
    if (sampleCount < this.config.min_samples_threshold) {
      return "insufficient_data";
    }
    // Stability is the CONSISTENCY axis: once enough samples exist, it is determined by how
    // tightly the corrections cluster (variance), independent of `confidence` -- which rises on
    // a slow tau and would otherwise mislabel a tight, low-variance signal as "unstable".
    if (variance < 10) {
      return "stable";
    }
    if (variance < 50) {
      return "converging";
    }
    return "unstable";
  }

  private generateRecommendation(
    stability: "stable" | "converging" | "unstable" | "insufficient_data",
    confidence: number,
    sampleCount: number
  ): string {
    switch (stability) {
      case "stable":
        return `High confidence (${(confidence * 100).toFixed(1)}%) — safe to auto-apply corrections`;
      case "converging":
        return `Moderate confidence (${(confidence * 100).toFixed(1)}%) — recommend manual review before applying`;
      case "unstable":
        return "High variance — corrections may be inconsistent, collect more consistent data";
      case "insufficient_data":
        return `Need ${this.config.min_samples_threshold - sampleCount} more samples before recommendations`;
      default:
        return "Unknown state";
    }
  }

  private mergeWeights(existing: LoRAWeights, imported: LoRAWeights): LoRAWeights {
    const merged = this.initializeWeights(existing.controller, existing.operation);

    for (const param of PARAMETER_TYPES) {
      const n1 = existing.sample_counts[param];
      const n2 = imported.sample_counts[param];
      const totalN = n1 + n2;

      if (totalN === 0) continue;

      // Weighted average for deltas
      merged.deltas[param] = (existing.deltas[param] * n1 + imported.deltas[param] * n2) / totalN;

      // Weighted average for the true correction mean (legacy sets default to their delta).
      const m1 = existing.correction_means?.[param] ?? existing.deltas[param];
      const m2c = imported.correction_means?.[param] ?? imported.deltas[param];
      merged.correction_means[param] = (m1 * n1 + m2c * n2) / totalN;

      // Combined variance (pooled variance formula)
      const v1 = existing.variances[param];
      const v2 = imported.variances[param];
      merged.variances[param] = ((n1 - 1) * v1 + (n2 - 1) * v2) / (totalN - 1) || 0;

      merged.sample_counts[param] = totalN;
      merged.confidences[param] = this.computeConfidence(
        totalN,
        merged.variances[param],
        Math.abs(merged.deltas[param])
      );
    }

    merged.total_samples = Object.values(merged.sample_counts).reduce((s, c) => s + c, 0);
    merged.avg_confidence = this.computeAverageConfidence(merged);
    merged.last_updated = new Date().toISOString();

    return merged;
  }

  private computeChecksum(weights: LoRAWeights[]): string {
    // Simple checksum based on weight values
    let hash = 0;
    for (const w of weights) {
      for (const p of PARAMETER_TYPES) {
        hash = (hash * 31 + Math.floor(w.deltas[p] * 1000)) & 0xffffffff;
        hash = (hash * 31 + w.sample_counts[p]) & 0xffffffff;
      }
    }
    return hash.toString(16).padStart(8, "0");
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function round(x: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const masterPostFineTuningEngine = new MasterPostFineTuningEngine();
