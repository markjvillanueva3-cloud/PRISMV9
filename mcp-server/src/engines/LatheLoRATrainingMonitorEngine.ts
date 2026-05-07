/**
 * LatheLoRATrainingMonitorEngine — LATHE-LORA-MS0 U-LLR12
 * =======================================================
 *
 * Monitors LatheLoRA training progress with real-time metrics,
 * early stopping detection, and checkpoint management.
 *
 * Features:
 *   - Loss tracking (train/eval)
 *   - Learning rate scheduling visualization
 *   - Gradient norm monitoring
 *   - Early stopping detection
 *   - Checkpoint management
 *   - Resource usage tracking
 *   - Training anomaly detection
 *
 * @module engines/LatheLoRATrainingMonitorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Training step metrics */
export interface StepMetrics {
  step: number;
  epoch: number;
  train_loss: number;
  eval_loss?: number;
  learning_rate: number;
  gradient_norm?: number;
  tokens_per_second?: number;
  vram_used_gb?: number;
  timestamp: number;
}

/** Training run state */
export interface TrainingState {
  run_id: string;
  status: "initializing" | "training" | "evaluating" | "completed" | "failed" | "stopped";
  start_time: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number;
  best_eval_loss: number;
  best_step: number;
  steps_since_improvement: number;
  metrics_history: StepMetrics[];
}

/** Early stopping configuration */
export interface EarlyStoppingConfig {
  patience: number;           // Steps without improvement
  min_delta: number;          // Minimum improvement to count
  metric: "eval_loss" | "train_loss";
  mode: "min" | "max";
}

/** Checkpoint info */
export interface Checkpoint {
  step: number;
  epoch: number;
  path: string;
  eval_loss: number;
  is_best: boolean;
  timestamp: number;
}

/** Training summary */
export interface TrainingSummary {
  run_id: string;
  total_time_seconds: number;
  final_train_loss: number;
  final_eval_loss: number;
  best_eval_loss: number;
  best_epoch: number;
  total_steps: number;
  avg_tokens_per_second: number;
  peak_vram_gb: number;
  early_stopped: boolean;
  checkpoints: Checkpoint[];
}

/** Anomaly detection result */
export interface AnomalyResult {
  detected: boolean;
  type?: "loss_spike" | "gradient_explosion" | "learning_stall" | "nan_loss";
  severity: "warning" | "critical";
  message: string;
  step?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_EARLY_STOPPING: EarlyStoppingConfig = {
  patience: 100,
  min_delta: 0.001,
  metric: "eval_loss",
  mode: "min",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRATrainingMonitorEngine {
  private state: TrainingState | null = null;
  private checkpoints: Checkpoint[] = [];
  private earlyStoppingConfig: EarlyStoppingConfig = DEFAULT_EARLY_STOPPING;

  /**
   * Initialize a new training run
   */
  initRun(params: {
    run_id: string;
    total_epochs: number;
    total_steps: number;
  }): TrainingState {
    this.state = {
      run_id: params.run_id,
      status: "initializing",
      start_time: Date.now(),
      current_epoch: 0,
      total_epochs: params.total_epochs,
      current_step: 0,
      total_steps: params.total_steps,
      best_eval_loss: Infinity,
      best_step: 0,
      steps_since_improvement: 0,
      metrics_history: [],
    };
    this.checkpoints = [];
    return { ...this.state };
  }

  /**
   * Record training step metrics
   */
  recordStep(metrics: StepMetrics): {
    state: TrainingState;
    anomaly?: AnomalyResult;
    should_stop: boolean;
  } {
    if (!this.state) {
      throw new Error("No training run initialized");
    }

    this.state.status = "training";
    this.state.current_step = metrics.step;
    this.state.current_epoch = metrics.epoch;
    this.state.metrics_history.push(metrics);

    // Check for anomalies
    const anomaly = this.detectAnomaly(metrics);

    // Update best metrics
    let should_stop = false;
    if (metrics.eval_loss !== undefined) {
      if (metrics.eval_loss < this.state.best_eval_loss - this.earlyStoppingConfig.min_delta) {
        this.state.best_eval_loss = metrics.eval_loss;
        this.state.best_step = metrics.step;
        this.state.steps_since_improvement = 0;
      } else {
        this.state.steps_since_improvement++;
      }

      // Check early stopping
      if (this.state.steps_since_improvement >= this.earlyStoppingConfig.patience) {
        should_stop = true;
        log.info(`[TrainingMonitor] Early stopping triggered at step ${metrics.step}`);
      }
    }

    return {
      state: { ...this.state },
      anomaly: anomaly.detected ? anomaly : undefined,
      should_stop,
    };
  }

  /**
   * Detect training anomalies
   */
  private detectAnomaly(metrics: StepMetrics): AnomalyResult {
    // Check for NaN loss
    if (isNaN(metrics.train_loss) || (metrics.eval_loss !== undefined && isNaN(metrics.eval_loss))) {
      return {
        detected: true,
        type: "nan_loss",
        severity: "critical",
        message: "NaN loss detected - training has diverged",
        step: metrics.step,
      };
    }

    // Check for loss spike
    if (this.state && this.state.metrics_history.length > 5) {
      const recentLosses = this.state.metrics_history.slice(-5).map(m => m.train_loss);
      const avgRecent = recentLosses.reduce((a, b) => a + b, 0) / recentLosses.length;

      if (metrics.train_loss > avgRecent * 2) {
        return {
          detected: true,
          type: "loss_spike",
          severity: "warning",
          message: `Loss spike detected: ${metrics.train_loss.toFixed(4)} vs avg ${avgRecent.toFixed(4)}`,
          step: metrics.step,
        };
      }
    }

    // Check for gradient explosion
    if (metrics.gradient_norm !== undefined && metrics.gradient_norm > 10) {
      return {
        detected: true,
        type: "gradient_explosion",
        severity: "warning",
        message: `High gradient norm: ${metrics.gradient_norm.toFixed(2)}`,
        step: metrics.step,
      };
    }

    // Check for learning stall
    if (this.state && this.state.metrics_history.length > 50) {
      const recent = this.state.metrics_history.slice(-50);
      const lossVariance = this.calculateVariance(recent.map(m => m.train_loss));
      if (lossVariance < 0.0001) {
        return {
          detected: true,
          type: "learning_stall",
          severity: "warning",
          message: "Training appears stalled - loss not changing",
          step: metrics.step,
        };
      }
    }

    return { detected: false, severity: "warning", message: "" };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Record a checkpoint
   */
  recordCheckpoint(checkpoint: Omit<Checkpoint, "timestamp">): void {
    const cp: Checkpoint = {
      ...checkpoint,
      timestamp: Date.now(),
    };
    this.checkpoints.push(cp);
    log.info(`[TrainingMonitor] Checkpoint saved: step ${cp.step}, eval_loss ${cp.eval_loss.toFixed(4)}`);
  }

  /**
   * Mark training as completed
   */
  complete(): TrainingSummary {
    if (!this.state) {
      throw new Error("No training run initialized");
    }

    this.state.status = "completed";
    return this.getSummary();
  }

  /**
   * Mark training as failed
   */
  fail(reason: string): void {
    if (this.state) {
      this.state.status = "failed";
      log.error(`[TrainingMonitor] Training failed: ${reason}`);
    }
  }

  /**
   * Get current state
   */
  getState(): TrainingState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Get training summary
   */
  getSummary(): TrainingSummary {
    if (!this.state) {
      throw new Error("No training run initialized");
    }

    const history = this.state.metrics_history;
    const totalTime = (Date.now() - this.state.start_time) / 1000;

    // Calculate averages
    const tokensPerSec = history
      .filter(m => m.tokens_per_second !== undefined)
      .map(m => m.tokens_per_second!);
    const avgTokens = tokensPerSec.length > 0
      ? tokensPerSec.reduce((a, b) => a + b, 0) / tokensPerSec.length
      : 0;

    const vramUsage = history
      .filter(m => m.vram_used_gb !== undefined)
      .map(m => m.vram_used_gb!);
    const peakVram = vramUsage.length > 0 ? Math.max(...vramUsage) : 0;

    const lastMetrics = history[history.length - 1] || { train_loss: 0, eval_loss: 0 };

    return {
      run_id: this.state.run_id,
      total_time_seconds: totalTime,
      final_train_loss: lastMetrics.train_loss,
      final_eval_loss: lastMetrics.eval_loss || this.state.best_eval_loss,
      best_eval_loss: this.state.best_eval_loss,
      best_epoch: Math.floor(this.state.best_step / (this.state.total_steps / this.state.total_epochs)),
      total_steps: this.state.current_step,
      avg_tokens_per_second: avgTokens,
      peak_vram_gb: peakVram,
      early_stopped: this.state.steps_since_improvement >= this.earlyStoppingConfig.patience,
      checkpoints: [...this.checkpoints],
    };
  }

  /**
   * Get progress percentage
   */
  getProgress(): { percent: number; eta_seconds: number } {
    if (!this.state || this.state.total_steps === 0) {
      return { percent: 0, eta_seconds: 0 };
    }

    const percent = (this.state.current_step / this.state.total_steps) * 100;
    const elapsed = (Date.now() - this.state.start_time) / 1000;
    const stepsPerSec = this.state.current_step / elapsed;
    const remainingSteps = this.state.total_steps - this.state.current_step;
    const eta = stepsPerSec > 0 ? remainingSteps / stepsPerSec : 0;

    return {
      percent: Math.min(100, percent),
      eta_seconds: eta,
    };
  }

  /**
   * Set early stopping configuration
   */
  setEarlyStopping(config: Partial<EarlyStoppingConfig>): void {
    this.earlyStoppingConfig = { ...this.earlyStoppingConfig, ...config };
  }

  /**
   * Get loss history for plotting
   */
  getLossHistory(): { steps: number[]; train_loss: number[]; eval_loss: number[] } {
    if (!this.state) {
      return { steps: [], train_loss: [], eval_loss: [] };
    }

    const steps: number[] = [];
    const train_loss: number[] = [];
    const eval_loss: number[] = [];

    for (const m of this.state.metrics_history) {
      steps.push(m.step);
      train_loss.push(m.train_loss);
      if (m.eval_loss !== undefined) {
        eval_loss.push(m.eval_loss);
      }
    }

    return { steps, train_loss, eval_loss };
  }

  /**
   * Get best checkpoint
   */
  getBestCheckpoint(): Checkpoint | null {
    const best = this.checkpoints.find(c => c.is_best);
    return best || this.checkpoints[this.checkpoints.length - 1] || null;
  }

  /**
   * Format progress string
   */
  formatProgress(): string {
    if (!this.state) return "No training in progress";

    const progress = this.getProgress();
    const elapsed = (Date.now() - this.state.start_time) / 1000;

    return [
      `[${this.state.status.toUpperCase()}]`,
      `Step ${this.state.current_step}/${this.state.total_steps}`,
      `(${progress.percent.toFixed(1)}%)`,
      `Epoch ${this.state.current_epoch}/${this.state.total_epochs}`,
      `Best loss: ${this.state.best_eval_loss.toFixed(4)}`,
      `Elapsed: ${this.formatTime(elapsed)}`,
      `ETA: ${this.formatTime(progress.eta_seconds)}`,
    ].join(" | ");
  }

  /**
   * Format time in human-readable format
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.state = null;
    this.checkpoints = [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRATrainingMonitorEngine = new LatheLoRATrainingMonitorEngine();
