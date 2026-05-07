/**
 * LatheLoRADriftDetectorEngine — LATHE-LORA-MS0 U-LLR29
 * =====================================================
 *
 * Detects model drift and performance degradation over time.
 * Monitors output quality and triggers retraining when needed.
 *
 * Features:
 *   - Output distribution monitoring
 *   - Quality metric tracking
 *   - Statistical drift detection
 *   - Retraining triggers
 *
 * @module engines/LatheLoRADriftDetectorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Drift status */
export type DriftStatus = "stable" | "warning" | "drifting" | "critical";

/** Drift type */
export type DriftType = "output_quality" | "latency" | "physics_accuracy" | "safety_score" | "user_feedback";

/** Quality sample */
export interface QualitySample {
  timestamp: number;
  model_id: string;
  prompt_hash: string;
  physics_score: number;
  safety_score: number;
  coherence_score: number;
  latency_ms: number;
  user_rating?: number;
}

/** Drift detection result */
export interface DriftDetection {
  type: DriftType;
  status: DriftStatus;
  current_value: number;
  baseline_value: number;
  deviation: number;
  threshold: number;
  trend: "improving" | "stable" | "degrading";
  samples_analyzed: number;
  confidence: number;
  message: string;
}

/** Model baseline */
export interface ModelBaseline {
  model_id: string;
  created_at: number;
  samples_count: number;
  metrics: {
    physics_mean: number;
    physics_std: number;
    safety_mean: number;
    safety_std: number;
    coherence_mean: number;
    coherence_std: number;
    latency_mean: number;
    latency_std: number;
  };
}

/** Engine configuration */
export interface DriftConfig {
  window_size: number;
  min_samples: number;
  warning_threshold: number;
  critical_threshold: number;
  enable_auto_retrain: boolean;
  retrain_cooldown_hours: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: DriftConfig = {
  window_size: 100,
  min_samples: 20,
  warning_threshold: 1.5, // std deviations
  critical_threshold: 2.5,
  enable_auto_retrain: false,
  retrain_cooldown_hours: 24,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRADriftDetectorEngine {
  private config: DriftConfig = DEFAULT_CONFIG;
  private baselines: Map<string, ModelBaseline> = new Map();
  private samples: Map<string, QualitySample[]> = new Map();
  private lastRetrainTrigger: Map<string, number> = new Map();

  /**
   * Set configuration
   */
  setConfig(config: Partial<DriftConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): DriftConfig {
    return { ...this.config };
  }

  /**
   * Record quality sample
   */
  recordSample(sample: QualitySample): void {
    const samples = this.samples.get(sample.model_id) || [];
    samples.push(sample);

    // Keep only window_size samples
    if (samples.length > this.config.window_size * 2) {
      samples.splice(0, samples.length - this.config.window_size);
    }

    this.samples.set(sample.model_id, samples);
  }

  /**
   * Set baseline for model
   */
  setBaseline(modelId: string, baseline?: ModelBaseline): ModelBaseline {
    if (baseline) {
      this.baselines.set(modelId, baseline);
      return baseline;
    }

    // Calculate baseline from current samples
    const samples = this.samples.get(modelId) || [];
    if (samples.length < this.config.min_samples) {
      throw new Error(`Insufficient samples for baseline: ${samples.length} < ${this.config.min_samples}`);
    }

    const physics = samples.map(s => s.physics_score);
    const safety = samples.map(s => s.safety_score);
    const coherence = samples.map(s => s.coherence_score);
    const latency = samples.map(s => s.latency_ms);

    const newBaseline: ModelBaseline = {
      model_id: modelId,
      created_at: Date.now(),
      samples_count: samples.length,
      metrics: {
        physics_mean: this.mean(physics),
        physics_std: this.std(physics),
        safety_mean: this.mean(safety),
        safety_std: this.std(safety),
        coherence_mean: this.mean(coherence),
        coherence_std: this.std(coherence),
        latency_mean: this.mean(latency),
        latency_std: this.std(latency),
      },
    };

    this.baselines.set(modelId, newBaseline);
    return newBaseline;
  }

  /**
   * Get baseline for model
   */
  getBaseline(modelId: string): ModelBaseline | undefined {
    return this.baselines.get(modelId);
  }

  /**
   * Calculate mean
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private std(values: number[]): number {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect drift for model
   */
  detectDrift(modelId: string): DriftDetection[] {
    const baseline = this.baselines.get(modelId);
    const samples = this.samples.get(modelId) || [];

    if (!baseline) {
      return [{
        type: "output_quality",
        status: "stable",
        current_value: 0,
        baseline_value: 0,
        deviation: 0,
        threshold: this.config.warning_threshold,
        trend: "stable",
        samples_analyzed: 0,
        confidence: 0,
        message: "No baseline set for model",
      }];
    }

    if (samples.length < this.config.min_samples) {
      return [{
        type: "output_quality",
        status: "stable",
        current_value: 0,
        baseline_value: 0,
        deviation: 0,
        threshold: this.config.warning_threshold,
        trend: "stable",
        samples_analyzed: samples.length,
        confidence: 0,
        message: `Insufficient samples: ${samples.length} < ${this.config.min_samples}`,
      }];
    }

    const recentSamples = samples.slice(-this.config.window_size);
    const detections: DriftDetection[] = [];

    // Physics accuracy drift
    detections.push(this.detectMetricDrift(
      "physics_accuracy",
      recentSamples.map(s => s.physics_score),
      baseline.metrics.physics_mean,
      baseline.metrics.physics_std
    ));

    // Safety score drift
    detections.push(this.detectMetricDrift(
      "safety_score",
      recentSamples.map(s => s.safety_score),
      baseline.metrics.safety_mean,
      baseline.metrics.safety_std
    ));

    // Latency drift
    detections.push(this.detectMetricDrift(
      "latency",
      recentSamples.map(s => s.latency_ms),
      baseline.metrics.latency_mean,
      baseline.metrics.latency_std,
      true // Higher is worse for latency
    ));

    return detections;
  }

  /**
   * Detect drift for a single metric
   */
  private detectMetricDrift(
    type: DriftType,
    values: number[],
    baselineMean: number,
    baselineStd: number,
    higherIsWorse: boolean = false
  ): DriftDetection {
    const currentMean = this.mean(values);
    const deviation = baselineStd > 0
      ? Math.abs(currentMean - baselineMean) / baselineStd
      : 0;

    let status: DriftStatus = "stable";
    if (deviation >= this.config.critical_threshold) {
      status = "critical";
    } else if (deviation >= this.config.warning_threshold) {
      status = higherIsWorse
        ? (currentMean > baselineMean ? "drifting" : "warning")
        : (currentMean < baselineMean ? "drifting" : "warning");
    }

    // Determine trend
    const halfPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, halfPoint);
    const secondHalf = values.slice(halfPoint);
    const firstMean = this.mean(firstHalf);
    const secondMean = this.mean(secondHalf);

    let trend: "improving" | "stable" | "degrading" = "stable";
    const trendDiff = (secondMean - firstMean) / (baselineStd || 1);
    if (Math.abs(trendDiff) > 0.5) {
      trend = higherIsWorse
        ? (secondMean > firstMean ? "degrading" : "improving")
        : (secondMean > firstMean ? "improving" : "degrading");
    }

    const confidence = Math.min(1, values.length / this.config.window_size);

    return {
      type,
      status,
      current_value: Number(currentMean.toFixed(2)),
      baseline_value: Number(baselineMean.toFixed(2)),
      deviation: Number(deviation.toFixed(2)),
      threshold: this.config.warning_threshold,
      trend,
      samples_analyzed: values.length,
      confidence,
      message: this.generateDriftMessage(type, status, deviation, trend),
    };
  }

  /**
   * Generate drift message
   */
  private generateDriftMessage(
    type: DriftType,
    status: DriftStatus,
    deviation: number,
    trend: string
  ): string {
    if (status === "stable") {
      return `${type} is stable (deviation: ${deviation.toFixed(1)}σ)`;
    }
    if (status === "critical") {
      return `CRITICAL: ${type} drift detected (${deviation.toFixed(1)}σ from baseline, trend: ${trend})`;
    }
    return `${status.toUpperCase()}: ${type} showing ${deviation.toFixed(1)}σ deviation (trend: ${trend})`;
  }

  /**
   * Check if retraining is needed
   */
  needsRetraining(modelId: string): {
    needed: boolean;
    reasons: string[];
    urgency: "low" | "medium" | "high";
  } {
    const detections = this.detectDrift(modelId);
    const reasons: string[] = [];

    let urgency: "low" | "medium" | "high" = "low";

    for (const d of detections) {
      if (d.status === "critical") {
        reasons.push(d.message);
        urgency = "high";
      } else if (d.status === "drifting") {
        reasons.push(d.message);
        if (urgency !== "high") urgency = "medium";
      }
    }

    // Check cooldown
    const lastRetrain = this.lastRetrainTrigger.get(modelId) || 0;
    const hoursSinceRetrain = (Date.now() - lastRetrain) / (1000 * 60 * 60);
    const inCooldown = hoursSinceRetrain < this.config.retrain_cooldown_hours;

    if (inCooldown && reasons.length > 0) {
      reasons.push(`In cooldown: ${(this.config.retrain_cooldown_hours - hoursSinceRetrain).toFixed(1)} hours remaining`);
    }

    return {
      needed: reasons.length > 0 && !inCooldown,
      reasons,
      urgency,
    };
  }

  /**
   * Trigger retraining
   */
  triggerRetraining(modelId: string): {
    triggered: boolean;
    reason: string;
  } {
    const check = this.needsRetraining(modelId);

    if (!check.needed) {
      return {
        triggered: false,
        reason: check.reasons.length > 0
          ? `In cooldown: ${check.reasons.join(", ")}`
          : "No drift detected",
      };
    }

    this.lastRetrainTrigger.set(modelId, Date.now());

    return {
      triggered: true,
      reason: check.reasons.join("; "),
    };
  }

  /**
   * Get samples for model
   */
  getSamples(modelId: string, limit?: number): QualitySample[] {
    const samples = this.samples.get(modelId) || [];
    return limit ? samples.slice(-limit) : [...samples];
  }

  /**
   * Get drift summary
   */
  getSummary(modelId: string): string {
    const baseline = this.baselines.get(modelId);
    const samples = this.samples.get(modelId) || [];
    const detections = this.detectDrift(modelId);
    const retraining = this.needsRetraining(modelId);

    const lines = [
      `Drift Summary: ${modelId}`,
      `====================`,
      `Samples: ${samples.length}`,
      `Baseline: ${baseline ? `${baseline.samples_count} samples from ${new Date(baseline.created_at).toISOString()}` : "Not set"}`,
      ``,
      `Metrics:`,
    ];

    for (const d of detections) {
      lines.push(`  ${d.type}: ${d.status.toUpperCase()} (${d.current_value} vs ${d.baseline_value}, ${d.deviation}σ)`);
    }

    lines.push(``);
    lines.push(`Retraining: ${retraining.needed ? "NEEDED" : "Not needed"} (${retraining.urgency})`);
    if (retraining.reasons.length > 0) {
      lines.push(`Reasons: ${retraining.reasons.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Clear samples for model
   */
  clearSamples(modelId: string): void {
    this.samples.delete(modelId);
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.baselines.clear();
    this.samples.clear();
    this.lastRetrainTrigger.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRADriftDetectorEngine = new LatheLoRADriftDetectorEngine();
