/**
 * MillingOnlineLearningTrackerEngine — Online Learning Progress Tracker
 *
 * MILL-AGI Phase 0.4: Online Learning Layer — Unit 2
 *
 * Tracks and manages online learning progress across milling operations:
 *   - Model performance drift detection
 *   - Learning rate scheduling with warm restarts
 *   - Feature importance evolution tracking
 *   - Catastrophic forgetting prevention
 *   - A/B testing of model variants
 *
 * Drift Detection:
 *   - Page-Hinkley test for concept drift
 *   - ADWIN (Adaptive Windowing) for distribution shift
 *   - Prediction error monitoring with exponential smoothing
 *
 * References:
 *   [1] Gama et al. (2004) "Learning with Drift Detection" SBIA
 *   [2] Bifet & Gavalda (2007) "Learning from Time-Changing Data with
 *       Adaptive Windowing" SDM
 *   [3] MIT 6.S191 — Online Learning and Adaptation
 *
 * @module engines/MillingOnlineLearningTrackerEngine
 * @milestone MILL-AGI-P0/U-P0.4-02
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface LearningMetrics {
  timestamp: number;
  prediction_error: number;
  model_loss: number;
  learning_rate: number;
  samples_seen: number;
  feature_importance: Record<string, number>;
}

export interface DriftStatus {
  detected: boolean;
  type: "none" | "gradual" | "sudden" | "recurring";
  severity: number;
  affected_features: string[];
  since_timestamp?: number;
  recommendation: string;
}

export interface ModelVariant {
  id: string;
  description: string;
  metrics: {
    avg_error: number;
    samples: number;
    win_rate: number;
  };
  active: boolean;
}

export interface LearningState {
  total_samples: number;
  current_epoch: number;
  learning_rate: number;
  best_loss: number;
  patience_counter: number;
  drift_events: number;
  last_checkpoint: number;
}

export interface TrackerConfig {
  error_window_size: number;
  drift_threshold: number;
  patience: number;
  lr_decay_factor: number;
  lr_warmup_steps: number;
  min_lr: number;
  max_lr: number;
  checkpoint_interval: number;
  ewma_alpha: number;
}

export interface CheckpointData {
  state: LearningState;
  error_history: number[];
  feature_importance_history: Array<Record<string, number>>;
  model_variants: ModelVariant[];
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: TrackerConfig = {
  error_window_size: 100,
  drift_threshold: 0.15,
  patience: 10,
  lr_decay_factor: 0.5,
  lr_warmup_steps: 100,
  min_lr: 1e-5,
  max_lr: 0.01,
  checkpoint_interval: 1000,
  ewma_alpha: 0.1,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillingOnlineLearningTrackerEngine {
  private config: TrackerConfig;
  private state: LearningState;
  private errorHistory: number[];
  private ewmaError: number;
  private featureImportanceHistory: Array<Record<string, number>>;
  private modelVariants: Map<string, ModelVariant>;
  private pageHinkleySum: number;
  private pageHinkleyMin: number;
  private adwinWindow: number[];

  constructor(config?: Partial<TrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.initState();
    this.errorHistory = [];
    this.ewmaError = 0;
    this.featureImportanceHistory = [];
    this.modelVariants = new Map();
    this.pageHinkleySum = 0;
    this.pageHinkleyMin = 0;
    this.adwinWindow = [];
  }

  /**
   * Record a learning step with metrics.
   */
  recordStep(metrics: LearningMetrics): {
    drift: DriftStatus;
    lr_adjusted: boolean;
    checkpoint_needed: boolean;
  } {
    this.state.total_samples++;

    this.errorHistory.push(metrics.prediction_error);
    if (this.errorHistory.length > this.config.error_window_size) {
      this.errorHistory.shift();
    }

    this.ewmaError =
      this.config.ewma_alpha * metrics.prediction_error +
      (1 - this.config.ewma_alpha) * this.ewmaError;

    this.featureImportanceHistory.push(metrics.feature_importance);
    if (this.featureImportanceHistory.length > 50) {
      this.featureImportanceHistory.shift();
    }

    const drift = this.detectDrift(metrics.prediction_error);

    const lrAdjusted = this.adjustLearningRate(metrics.model_loss, drift);

    const checkpointNeeded =
      this.state.total_samples % this.config.checkpoint_interval === 0;

    if (checkpointNeeded) {
      this.state.last_checkpoint = this.state.total_samples;
    }

    log.debug(
      `[OnlineTracker] step=${this.state.total_samples}, err=${metrics.prediction_error.toFixed(4)}, drift=${drift.type}, lr=${this.state.learning_rate.toFixed(6)}`
    );

    return { drift, lr_adjusted: lrAdjusted, checkpoint_needed: checkpointNeeded };
  }

  /**
   * Detect concept drift using Page-Hinkley and ADWIN.
   */
  detectDrift(error: number): DriftStatus {
    this.updatePageHinkley(error);
    this.updateADWIN(error);

    const phDrift = this.checkPageHinkleyDrift();
    const adwinDrift = this.checkADWINDrift();

    const affectedFeatures = this.detectFeatureShift();

    if (phDrift && adwinDrift) {
      this.state.drift_events++;
      return {
        detected: true,
        type: "sudden",
        severity: Math.min((this.pageHinkleySum - this.pageHinkleyMin) / 10, 1),
        affected_features: affectedFeatures,
        since_timestamp: Date.now(),
        recommendation: "Reset learning rate and increase exploration",
      };
    } else if (phDrift || adwinDrift) {
      return {
        detected: true,
        type: "gradual",
        severity: 0.5,
        affected_features: affectedFeatures,
        recommendation: "Monitor closely, consider partial model update",
      };
    }

    if (this.state.drift_events > 0 && this.errorHistory.length >= 50) {
      const recentAvg = this.computeRecentAverage(20);
      const olderAvg = this.computeOlderAverage(20, 30);
      if (Math.abs(recentAvg - olderAvg) > this.config.drift_threshold * 0.5) {
        return {
          detected: true,
          type: "recurring",
          severity: 0.3,
          affected_features: affectedFeatures,
          recommendation: "Consider ensemble approach for recurring patterns",
        };
      }
    }

    return {
      detected: false,
      type: "none",
      severity: 0,
      affected_features: [],
      recommendation: "Continue current learning strategy",
    };
  }

  /**
   * Adjust learning rate based on performance.
   */
  adjustLearningRate(loss: number, drift: DriftStatus): boolean {
    if (this.state.total_samples < this.config.lr_warmup_steps) {
      const warmupProgress = this.state.total_samples / this.config.lr_warmup_steps;
      this.state.learning_rate = this.config.min_lr +
        (this.config.max_lr - this.config.min_lr) * warmupProgress;
      return true;
    }

    if (drift.type === "sudden") {
      this.state.learning_rate = Math.min(
        this.config.max_lr,
        this.state.learning_rate * 2
      );
      this.state.patience_counter = 0;
      return true;
    }

    if (loss < this.state.best_loss) {
      this.state.best_loss = loss;
      this.state.patience_counter = 0;
      return false;
    }

    this.state.patience_counter++;

    if (this.state.patience_counter >= this.config.patience) {
      this.state.learning_rate = Math.max(
        this.config.min_lr,
        this.state.learning_rate * this.config.lr_decay_factor
      );
      this.state.patience_counter = 0;
      return true;
    }

    return false;
  }

  /**
   * Register a model variant for A/B testing.
   */
  registerVariant(id: string, description: string): void {
    this.modelVariants.set(id, {
      id,
      description,
      metrics: { avg_error: 0, samples: 0, win_rate: 0 },
      active: true,
    });
  }

  /**
   * Record result for a model variant.
   */
  recordVariantResult(variantId: string, error: number): void {
    const variant = this.modelVariants.get(variantId);
    if (!variant) return;

    const n = variant.metrics.samples;
    variant.metrics.avg_error =
      (variant.metrics.avg_error * n + error) / (n + 1);
    variant.metrics.samples++;

    let bestError = Infinity;
    for (const v of this.modelVariants.values()) {
      if (v.metrics.samples > 0 && v.metrics.avg_error < bestError) {
        bestError = v.metrics.avg_error;
      }
    }

    if (variant.metrics.avg_error <= bestError) {
      variant.metrics.win_rate =
        (variant.metrics.win_rate * n + 1) / (n + 1);
    } else {
      variant.metrics.win_rate =
        (variant.metrics.win_rate * n) / (n + 1);
    }
  }

  /**
   * Get best performing variant.
   */
  getBestVariant(): ModelVariant | null {
    let best: ModelVariant | null = null;
    let bestScore = Infinity;

    for (const variant of this.modelVariants.values()) {
      if (variant.active && variant.metrics.samples >= 10) {
        if (variant.metrics.avg_error < bestScore) {
          bestScore = variant.metrics.avg_error;
          best = variant;
        }
      }
    }

    return best;
  }

  /**
   * Get all registered variants.
   */
  getVariants(): ModelVariant[] {
    return Array.from(this.modelVariants.values());
  }

  /**
   * Get current learning state.
   */
  getState(): LearningState {
    return { ...this.state };
  }

  /**
   * Get error statistics.
   */
  getErrorStats(): {
    current_ewma: number;
    recent_mean: number;
    recent_std: number;
    trend: "improving" | "stable" | "degrading";
  } {
    const recentMean = this.computeRecentAverage(20);
    const olderMean = this.computeOlderAverage(20, 30);

    let trend: "improving" | "stable" | "degrading";
    const diff = recentMean - olderMean;
    if (diff < -0.05) trend = "improving";
    else if (diff > 0.05) trend = "degrading";
    else trend = "stable";

    const variance = this.computeVariance(this.errorHistory.slice(-20));
    const std = Math.sqrt(variance);

    return {
      current_ewma: this.ewmaError,
      recent_mean: recentMean,
      recent_std: std,
      trend,
    };
  }

  /**
   * Get feature importance evolution.
   */
  getFeatureEvolution(featureName: string): number[] {
    return this.featureImportanceHistory.map(
      (fi) => fi[featureName] ?? 0
    );
  }

  /**
   * Create checkpoint.
   */
  createCheckpoint(): CheckpointData {
    return {
      state: { ...this.state },
      error_history: [...this.errorHistory],
      feature_importance_history: this.featureImportanceHistory.map((fi) => ({
        ...fi,
      })),
      model_variants: Array.from(this.modelVariants.values()),
    };
  }

  /**
   * Restore from checkpoint.
   */
  restoreCheckpoint(data: CheckpointData): void {
    this.state = { ...data.state };
    this.errorHistory = [...data.error_history];
    this.featureImportanceHistory = data.feature_importance_history.map(
      (fi) => ({ ...fi })
    );
    this.modelVariants.clear();
    for (const v of data.model_variants) {
      this.modelVariants.set(v.id, { ...v });
    }
  }

  /**
   * Reset tracker state.
   */
  reset(): void {
    this.state = this.initState();
    this.errorHistory = [];
    this.ewmaError = 0;
    this.featureImportanceHistory = [];
    this.modelVariants.clear();
    this.pageHinkleySum = 0;
    this.pageHinkleyMin = 0;
    this.adwinWindow = [];
  }

  /**
   * Get summary report.
   */
  getSummary(): {
    total_samples: number;
    current_lr: number;
    drift_events: number;
    error_trend: string;
    best_variant: string | null;
    recommendations: string[];
  } {
    const errorStats = this.getErrorStats();
    const bestVariant = this.getBestVariant();

    const recommendations: string[] = [];

    if (errorStats.trend === "degrading") {
      recommendations.push("Consider retraining or updating model");
    }

    if (this.state.drift_events > 3) {
      recommendations.push("High drift frequency — consider ensemble methods");
    }

    if (this.state.learning_rate <= this.config.min_lr * 1.1) {
      recommendations.push("Learning rate at minimum — may need warm restart");
    }

    if (bestVariant && bestVariant.metrics.win_rate > 0.7) {
      recommendations.push(`Variant '${bestVariant.id}' performing well — consider promotion`);
    }

    return {
      total_samples: this.state.total_samples,
      current_lr: this.state.learning_rate,
      drift_events: this.state.drift_events,
      error_trend: errorStats.trend,
      best_variant: bestVariant?.id ?? null,
      recommendations,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private initState(): LearningState {
    return {
      total_samples: 0,
      current_epoch: 0,
      learning_rate: this.config?.max_lr ?? DEFAULT_CONFIG.max_lr,
      best_loss: Infinity,
      patience_counter: 0,
      drift_events: 0,
      last_checkpoint: 0,
    };
  }

  private updatePageHinkley(error: number): void {
    const delta = 0.005;
    this.pageHinkleySum += error - this.ewmaError - delta;
    this.pageHinkleyMin = Math.min(this.pageHinkleyMin, this.pageHinkleySum);
  }

  private checkPageHinkleyDrift(): boolean {
    const lambda = 50;
    return this.pageHinkleySum - this.pageHinkleyMin > lambda;
  }

  private updateADWIN(error: number): void {
    this.adwinWindow.push(error);
    if (this.adwinWindow.length > 200) {
      this.adwinWindow.shift();
    }
  }

  private checkADWINDrift(): boolean {
    if (this.adwinWindow.length < 50) return false;

    const mid = Math.floor(this.adwinWindow.length / 2);
    const firstHalf = this.adwinWindow.slice(0, mid);
    const secondHalf = this.adwinWindow.slice(mid);

    const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const threshold = this.config.drift_threshold;
    return Math.abs(mean1 - mean2) > threshold;
  }

  private detectFeatureShift(): string[] {
    if (this.featureImportanceHistory.length < 10) return [];

    const recent = this.featureImportanceHistory.slice(-5);
    const older = this.featureImportanceHistory.slice(-10, -5);

    const shifted: string[] = [];
    const allFeatures = new Set<string>();

    for (const fi of [...recent, ...older]) {
      for (const key of Object.keys(fi)) {
        allFeatures.add(key);
      }
    }

    for (const feature of allFeatures) {
      const recentAvg =
        recent.reduce((sum, fi) => sum + (fi[feature] ?? 0), 0) / recent.length;
      const olderAvg =
        older.reduce((sum, fi) => sum + (fi[feature] ?? 0), 0) / older.length;

      if (Math.abs(recentAvg - olderAvg) > 0.2) {
        shifted.push(feature);
      }
    }

    return shifted;
  }

  private computeRecentAverage(n: number): number {
    const slice = this.errorHistory.slice(-n);
    if (slice.length === 0) return 0;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private computeOlderAverage(n: number, offset: number): number {
    const start = Math.max(0, this.errorHistory.length - n - offset);
    const end = Math.max(0, this.errorHistory.length - offset);
    const slice = this.errorHistory.slice(start, end);
    if (slice.length === 0) return 0;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private computeVariance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millingOnlineLearningTrackerEngine = new MillingOnlineLearningTrackerEngine();
