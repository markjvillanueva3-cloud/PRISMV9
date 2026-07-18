/**
 * LatheLoRAExperimentTrackerEngine — LATHE-LORA-MS0 U-LLR47
 * ==========================================================
 *
 * Tracks training experiments, hyperparameters, metrics, and artifacts.
 * Supports experiment comparison and best-model selection.
 *
 * Features:
 *   - Experiment lifecycle
 *   - Metric logging per step
 *   - Hyperparameter recording
 *   - Artifact references
 *   - Best-experiment selection
 *
 * @module engines/LatheLoRAExperimentTrackerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ExperimentStatus = "running" | "completed" | "failed" | "archived";

export interface ExperimentMetric {
  name: string;
  value: number;
  step: number;
  timestamp: number;
}

export interface ExperimentArtifact {
  name: string;
  path: string;
  size_bytes?: number;
  type: "model" | "log" | "checkpoint" | "config" | "dataset" | "other";
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  hyperparameters: Record<string, unknown>;
  metrics: ExperimentMetric[];
  artifacts: ExperimentArtifact[];
  tags: string[];
  created_at: number;
  started_at?: number;
  completed_at?: number;
  parent_id?: string;
}

export interface TrackerConfig {
  max_metrics_per_experiment: number;
  auto_archive_days: number;
  primary_metric: string;
  metric_goal: "minimize" | "maximize";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: TrackerConfig = {
  max_metrics_per_experiment: 10000,
  auto_archive_days: 90,
  primary_metric: "val_loss",
  metric_goal: "minimize",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAExperimentTrackerEngine {
  private config: TrackerConfig = DEFAULT_CONFIG;
  private experiments: Map<string, Experiment> = new Map();

  setConfig(config: Partial<TrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TrackerConfig {
    return { ...this.config };
  }

  /**
   * Create an experiment
   */
  createExperiment(name: string, hyperparameters: Record<string, unknown>, tags: string[] = []): Experiment {
    const exp: Experiment = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      status: "running",
      hyperparameters,
      metrics: [],
      artifacts: [],
      tags,
      created_at: Date.now(),
      started_at: Date.now(),
    };
    this.experiments.set(exp.id, exp);
    return exp;
  }

  /**
   * Log a metric
   */
  logMetric(experimentId: string, name: string, value: number, step: number): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;

    if (exp.metrics.length >= this.config.max_metrics_per_experiment) {
      exp.metrics = exp.metrics.slice(-Math.floor(this.config.max_metrics_per_experiment / 2));
    }

    exp.metrics.push({ name, value, step, timestamp: Date.now() });
    return true;
  }

  /**
   * Log multiple metrics at once
   */
  logMetrics(experimentId: string, metrics: Record<string, number>, step: number): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;

    for (const [name, value] of Object.entries(metrics)) {
      exp.metrics.push({ name, value, step, timestamp: Date.now() });
    }
    return true;
  }

  /**
   * Add an artifact
   */
  addArtifact(experimentId: string, artifact: ExperimentArtifact): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.artifacts.push(artifact);
    return true;
  }

  /**
   * Complete an experiment
   */
  completeExperiment(experimentId: string, status: "completed" | "failed" = "completed"): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return false;

    exp.status = status;
    exp.completed_at = Date.now();
    return true;
  }

  /**
   * Get metric series
   */
  getMetricSeries(experimentId: string, metricName: string): ExperimentMetric[] {
    const exp = this.experiments.get(experimentId);
    if (!exp) return [];
    return exp.metrics.filter(m => m.name === metricName).sort((a, b) => a.step - b.step);
  }

  /**
   * Get latest metric value
   */
  getLatestMetric(experimentId: string, metricName: string): number | undefined {
    const series = this.getMetricSeries(experimentId, metricName);
    return series.length > 0 ? series[series.length - 1].value : undefined;
  }

  /**
   * Get best metric value (per config goal)
   */
  getBestMetric(experimentId: string, metricName: string, goal?: "minimize" | "maximize"): number | undefined {
    const series = this.getMetricSeries(experimentId, metricName);
    if (series.length === 0) return undefined;
    const g = goal || this.config.metric_goal;
    const values = series.map(m => m.value);
    return g === "minimize" ? Math.min(...values) : Math.max(...values);
  }

  /**
   * Find best experiment by primary metric
   */
  findBestExperiment(tag?: string): Experiment | null {
    let candidates = Array.from(this.experiments.values()).filter(e => e.status === "completed");
    if (tag) candidates = candidates.filter(e => e.tags.includes(tag));
    if (candidates.length === 0) return null;

    let best = candidates[0];
    let bestValue = this.getBestMetric(best.id, this.config.primary_metric);
    if (bestValue === undefined) return null;

    for (let i = 1; i < candidates.length; i++) {
      const val = this.getBestMetric(candidates[i].id, this.config.primary_metric);
      if (val === undefined) continue;
      const better = this.config.metric_goal === "minimize" ? val < bestValue! : val > bestValue!;
      if (better) {
        best = candidates[i];
        bestValue = val;
      }
    }

    return best;
  }

  /**
   * Compare two experiments on a metric
   */
  compareExperiments(expIdA: string, expIdB: string, metric: string): {
    winner: string | null;
    diff: number;
  } {
    const valA = this.getLatestMetric(expIdA, metric);
    const valB = this.getLatestMetric(expIdB, metric);
    if (valA === undefined || valB === undefined) return { winner: null, diff: 0 };

    const diff = valA - valB;
    const winner =
      this.config.metric_goal === "minimize"
        ? valA < valB
          ? expIdA
          : valB < valA
          ? expIdB
          : null
        : valA > valB
        ? expIdA
        : valB > valA
        ? expIdB
        : null;
    return { winner, diff };
  }

  /**
   * Get experiment
   */
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * Get all experiments
   */
  getExperiments(filter?: { status?: ExperimentStatus; tag?: string }): Experiment[] {
    let list = Array.from(this.experiments.values());
    if (filter?.status) list = list.filter(e => e.status === filter.status);
    if (filter?.tag) { const tag = filter.tag; list = list.filter(e => e.tags.includes(tag)); }
    return list;
  }

  /**
   * Archive an experiment
   */
  archive(id: string): boolean {
    const exp = this.experiments.get(id);
    if (!exp) return false;
    exp.status = "archived";
    return true;
  }

  /**
   * Get stats
   */
  getStats(): {
    total_experiments: number;
    running: number;
    completed: number;
    failed: number;
    archived: number;
    total_metrics_logged: number;
    total_artifacts: number;
  } {
    const all = Array.from(this.experiments.values());
    return {
      total_experiments: all.length,
      running: all.filter(e => e.status === "running").length,
      completed: all.filter(e => e.status === "completed").length,
      failed: all.filter(e => e.status === "failed").length,
      archived: all.filter(e => e.status === "archived").length,
      total_metrics_logged: all.reduce((s, e) => s + e.metrics.length, 0),
      total_artifacts: all.reduce((s, e) => s + e.artifacts.length, 0),
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Experiment Tracker Summary",
      "==========================",
      `Total: ${stats.total_experiments}`,
      `Running: ${stats.running}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Metrics Logged: ${stats.total_metrics_logged}`,
      `Artifacts: ${stats.total_artifacts}`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.experiments.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAExperimentTrackerEngine = new LatheLoRAExperimentTrackerEngine();
