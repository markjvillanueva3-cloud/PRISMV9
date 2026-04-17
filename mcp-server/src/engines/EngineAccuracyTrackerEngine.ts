/**
 * EngineAccuracyTrackerEngine — Cross-Engine Prediction Accuracy Monitor
 *
 * Part of MILL-AGI-P0 Phase 0.5: Meta-Learning Loop
 *
 * Monitors prediction accuracy across ALL PRISM engines, not just strategies.
 * Tracks predicted vs actual outcomes, computes accuracy metrics, and flags
 * engines whose predictions are degrading.
 *
 * Key capabilities:
 *   - recordOutcome(engineId, predicted, actual): Log prediction vs reality
 *   - getEngineAccuracy(engineId): Retrieve accuracy stats for an engine
 *   - getAccuracyReport(): System-wide accuracy summary
 *   - flagDegradingEngines(threshold): Identify engines needing recalibration
 *
 * Metrics computed per engine:
 *   - MAPE: Mean Absolute Percentage Error
 *   - Bias: Mean signed error (positive = over-predict)
 *   - Accuracy: 1 - MAPE (capped at 0)
 *   - Sample count and confidence interval
 *   - Trend: improving/stable/degrading based on recent vs historical
 *
 * Integration points:
 *   - DeepLogicTraceEngine: Proof trees can cite accuracy stats
 *   - MillingMetaLearningEngine: Feeds into learning priority
 *   - PRISMSelfAwarenessEngine: Surfaces accuracy in capability manifest
 *
 * @module engines/EngineAccuracyTrackerEngine
 * @milestone MILL-AGI-P0/U-P0.5
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Single prediction outcome record */
export interface PredictionOutcome {
  id: string;
  engineId: string;
  timestamp: string;
  metricName: string;
  predicted: number;
  actual: number;
  unit?: string;
  context?: Record<string, unknown>;
}

/** Computed accuracy for a single metric */
export interface MetricAccuracyStats {
  metricName: string;
  sampleCount: number;
  mape: number;
  bias: number;
  accuracy: number;
  stdDev: number;
  minError: number;
  maxError: number;
  wilson95Lower: number;
  wilson95Upper: number;
}

/** Accuracy summary for one engine */
export interface EngineAccuracySummary {
  engineId: string;
  totalOutcomes: number;
  firstRecordedAt: string;
  lastRecordedAt: string;
  metrics: Map<string, MetricAccuracyStats>;
  overallAccuracy: number;
  overallMape: number;
  trend: "improving" | "stable" | "degrading" | "unknown";
  recentAccuracy: number;
  historicalAccuracy: number;
}

/** System-wide accuracy report */
export interface AccuracyReport {
  generatedAt: string;
  totalEngines: number;
  totalOutcomes: number;
  engineSummaries: EngineAccuracySummary[];
  topPerformers: Array<{ engineId: string; accuracy: number }>;
  degradingEngines: Array<{ engineId: string; accuracy: number; trend: string }>;
  systemAccuracy: number;
}

/** Degradation alert */
export interface DegradationAlert {
  engineId: string;
  metricName: string;
  currentAccuracy: number;
  historicalAccuracy: number;
  degradationPercent: number;
  sampleCount: number;
  recommendation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class EngineAccuracyTrackerEngine {
  private outcomes: PredictionOutcome[] = [];
  private readonly RECENT_WINDOW = 20;
  private readonly TREND_THRESHOLD = 0.05;

  /**
   * Record a prediction outcome.
   * @param engineId The engine that made the prediction
   * @param metricName The metric being predicted (e.g., "cutting_force", "tool_life")
   * @param predicted The predicted value
   * @param actual The actual measured value
   * @param unit Optional unit string
   * @param context Optional context for debugging
   */
  recordOutcome(
    engineId: string,
    metricName: string,
    predicted: number,
    actual: number,
    unit?: string,
    context?: Record<string, unknown>
  ): PredictionOutcome {
    this.validateInput(engineId, metricName, predicted, actual);

    const outcome: PredictionOutcome = {
      id: this.generateId(),
      engineId,
      timestamp: new Date().toISOString(),
      metricName,
      predicted,
      actual,
      unit,
      context,
    };

    this.outcomes.push(outcome);
    log.info(`EngineAccuracyTracker.recordOutcome: ${engineId}/${metricName} pred=${predicted} actual=${actual}`);

    return outcome;
  }

  /**
   * Get accuracy stats for a specific engine.
   */
  getEngineAccuracy(engineId: string): EngineAccuracySummary | null {
    if (!engineId?.trim()) throw new Error("engineId required");

    const engineOutcomes = this.outcomes.filter((o) => o.engineId === engineId);
    if (engineOutcomes.length === 0) return null;

    return this.computeEngineSummary(engineId, engineOutcomes);
  }

  /**
   * Get accuracy stats for a specific engine and metric.
   */
  getMetricAccuracy(engineId: string, metricName: string): MetricAccuracyStats | null {
    if (!engineId?.trim()) throw new Error("engineId required");
    if (!metricName?.trim()) throw new Error("metricName required");

    const filtered = this.outcomes.filter(
      (o) => o.engineId === engineId && o.metricName === metricName
    );
    if (filtered.length === 0) return null;

    return this.computeMetricStats(metricName, filtered);
  }

  /**
   * Generate system-wide accuracy report.
   */
  getAccuracyReport(): AccuracyReport {
    const engineIds = [...new Set(this.outcomes.map((o) => o.engineId))];
    const summaries = engineIds
      .map((id) => this.getEngineAccuracy(id))
      .filter((s): s is EngineAccuracySummary => s !== null);

    const sorted = [...summaries].sort((a, b) => b.overallAccuracy - a.overallAccuracy);
    const topPerformers = sorted.slice(0, 10).map((s) => ({
      engineId: s.engineId,
      accuracy: s.overallAccuracy,
    }));

    const degrading = summaries
      .filter((s) => s.trend === "degrading")
      .map((s) => ({
        engineId: s.engineId,
        accuracy: s.overallAccuracy,
        trend: s.trend,
      }));

    const systemAccuracy =
      summaries.length > 0
        ? this.round4(summaries.reduce((sum, s) => sum + s.overallAccuracy, 0) / summaries.length)
        : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalEngines: engineIds.length,
      totalOutcomes: this.outcomes.length,
      engineSummaries: summaries,
      topPerformers,
      degradingEngines: degrading,
      systemAccuracy,
    };
  }

  /**
   * Identify engines whose accuracy has degraded below threshold.
   * @param threshold Minimum acceptable accuracy (0-1), default 0.8
   */
  flagDegradingEngines(threshold = 0.8): DegradationAlert[] {
    const alerts: DegradationAlert[] = [];
    const engineIds = [...new Set(this.outcomes.map((o) => o.engineId))];

    for (const engineId of engineIds) {
      const summary = this.getEngineAccuracy(engineId);
      if (!summary || summary.totalOutcomes < 5) continue;

      if (summary.overallAccuracy < threshold || summary.trend === "degrading") {
        const degradationPercent =
          summary.historicalAccuracy > 0
            ? this.round4(
                ((summary.historicalAccuracy - summary.recentAccuracy) /
                  summary.historicalAccuracy) *
                  100
              )
            : 0;

        alerts.push({
          engineId,
          metricName: "overall",
          currentAccuracy: summary.recentAccuracy,
          historicalAccuracy: summary.historicalAccuracy,
          degradationPercent,
          sampleCount: summary.totalOutcomes,
          recommendation: this.generateRecommendation(summary),
        });
      }
    }

    return alerts.sort((a, b) => b.degradationPercent - a.degradationPercent);
  }

  /**
   * Query outcomes with filters.
   */
  queryOutcomes(filter: {
    engineId?: string;
    metricName?: string;
    since?: string;
    limit?: number;
  }): PredictionOutcome[] {
    let results = [...this.outcomes];

    if (filter.engineId) {
      results = results.filter((o) => o.engineId === filter.engineId);
    }
    if (filter.metricName) {
      results = results.filter((o) => o.metricName === filter.metricName);
    }
    if (filter.since) {
      const sinceDate = new Date(filter.since);
      results = results.filter((o) => new Date(o.timestamp) >= sinceDate);
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get list of all tracked engines.
   */
  listEngines(): string[] {
    return [...new Set(this.outcomes.map((o) => o.engineId))].sort();
  }

  /**
   * Get list of all tracked metrics for an engine.
   */
  listMetrics(engineId: string): string[] {
    return [
      ...new Set(
        this.outcomes.filter((o) => o.engineId === engineId).map((o) => o.metricName)
      ),
    ].sort();
  }

  /**
   * Get overall statistics.
   */
  getStats(): {
    totalOutcomes: number;
    totalEngines: number;
    totalMetrics: number;
    oldestRecord: string | null;
    newestRecord: string | null;
  } {
    const engines = new Set(this.outcomes.map((o) => o.engineId));
    const metrics = new Set(this.outcomes.map((o) => `${o.engineId}:${o.metricName}`));

    const timestamps = this.outcomes.map((o) => o.timestamp).sort();

    return {
      totalOutcomes: this.outcomes.length,
      totalEngines: engines.size,
      totalMetrics: metrics.size,
      oldestRecord: timestamps[0] ?? null,
      newestRecord: timestamps[timestamps.length - 1] ?? null,
    };
  }

  /**
   * Clear all recorded outcomes.
   */
  clear(): void {
    this.outcomes = [];
    log.info("EngineAccuracyTracker.clear: All outcomes cleared");
  }

  /**
   * Export all outcomes for persistence.
   */
  exportOutcomes(): PredictionOutcome[] {
    return this.outcomes.map((o) => ({ ...o }));
  }

  /**
   * Import outcomes from persistence.
   */
  importOutcomes(outcomes: PredictionOutcome[]): number {
    const validOutcomes = outcomes.filter(
      (o) =>
        o.id &&
        o.engineId &&
        o.metricName &&
        typeof o.predicted === "number" &&
        typeof o.actual === "number"
    );

    this.outcomes.push(...validOutcomes);
    return validOutcomes.length;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ──────────────────────────────────────────────────────────────────────────

  private validateInput(
    engineId: string,
    metricName: string,
    predicted: number,
    actual: number
  ): void {
    if (!engineId?.trim()) throw new Error("engineId is required");
    if (!metricName?.trim()) throw new Error("metricName is required");
    if (typeof predicted !== "number" || !Number.isFinite(predicted)) {
      throw new Error("predicted must be a finite number");
    }
    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      throw new Error("actual must be a finite number");
    }
  }

  private generateId(): string {
    return `eat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private computeEngineSummary(
    engineId: string,
    outcomes: PredictionOutcome[]
  ): EngineAccuracySummary {
    const metricNames = [...new Set(outcomes.map((o) => o.metricName))];
    const metrics = new Map<string, MetricAccuracyStats>();

    for (const metricName of metricNames) {
      const metricOutcomes = outcomes.filter((o) => o.metricName === metricName);
      metrics.set(metricName, this.computeMetricStats(metricName, metricOutcomes));
    }

    const timestamps = outcomes.map((o) => o.timestamp).sort();
    const allErrors = outcomes.map((o) => Math.abs((o.actual - o.predicted) / (o.actual || 1)));
    const overallMape = this.round4(this.mean(allErrors));
    const overallAccuracy = this.round4(Math.max(0, 1 - overallMape));

    const recentOutcomes = outcomes.slice(-this.RECENT_WINDOW);
    const historicalOutcomes = outcomes.slice(0, -this.RECENT_WINDOW);

    const recentErrors = recentOutcomes.map((o) =>
      Math.abs((o.actual - o.predicted) / (o.actual || 1))
    );
    const historicalErrors = historicalOutcomes.map((o) =>
      Math.abs((o.actual - o.predicted) / (o.actual || 1))
    );

    const recentMape = recentErrors.length > 0 ? this.mean(recentErrors) : overallMape;
    const historicalMape =
      historicalErrors.length > 0 ? this.mean(historicalErrors) : overallMape;

    const recentAccuracy = this.round4(Math.max(0, 1 - recentMape));
    const historicalAccuracy = this.round4(Math.max(0, 1 - historicalMape));

    let trend: "improving" | "stable" | "degrading" | "unknown" = "unknown";
    if (outcomes.length >= this.RECENT_WINDOW * 2) {
      const diff = recentAccuracy - historicalAccuracy;
      if (diff > this.TREND_THRESHOLD) trend = "improving";
      else if (diff < -this.TREND_THRESHOLD) trend = "degrading";
      else trend = "stable";
    }

    return {
      engineId,
      totalOutcomes: outcomes.length,
      firstRecordedAt: timestamps[0],
      lastRecordedAt: timestamps[timestamps.length - 1],
      metrics,
      overallAccuracy,
      overallMape,
      trend,
      recentAccuracy,
      historicalAccuracy,
    };
  }

  private computeMetricStats(
    metricName: string,
    outcomes: PredictionOutcome[]
  ): MetricAccuracyStats {
    const errors = outcomes.map((o) => {
      const denominator = o.actual !== 0 ? o.actual : 1;
      return (o.actual - o.predicted) / denominator;
    });

    const absErrors = errors.map(Math.abs);
    const mape = this.round4(this.mean(absErrors));
    const bias = this.round4(this.mean(errors));
    const stdDev = this.round4(this.standardDeviation(errors));
    const minError = this.round4(Math.min(...absErrors));
    const maxError = this.round4(Math.max(...absErrors));

    const accuracy = this.round4(Math.max(0, 1 - mape));

    const successCount = absErrors.filter((e) => e < 0.1).length;
    const [wilson95Lower, wilson95Upper] = this.wilsonInterval(
      successCount,
      outcomes.length,
      0.95
    );

    return {
      metricName,
      sampleCount: outcomes.length,
      mape,
      bias,
      accuracy,
      stdDev,
      minError,
      maxError,
      wilson95Lower: this.round4(wilson95Lower),
      wilson95Upper: this.round4(wilson95Upper),
    };
  }

  private generateRecommendation(summary: EngineAccuracySummary): string {
    if (summary.overallAccuracy < 0.5) {
      return "CRITICAL: Engine accuracy below 50%. Consider replacing or retraining.";
    }
    if (summary.trend === "degrading" && summary.totalOutcomes > 50) {
      return "Accuracy degrading over time. Review recent input distributions for drift.";
    }
    if (summary.overallAccuracy < 0.7) {
      return "Accuracy below target. Recalibrate coefficients or add domain-specific tuning.";
    }
    return "Monitor accuracy trend. Consider adding more training data.";
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private wilsonInterval(successes: number, n: number, confidence: number): [number, number] {
    if (n === 0) return [0, 0];

    const z = confidence === 0.95 ? 1.96 : 1.645;
    const phat = successes / n;
    const denominator = 1 + (z * z) / n;

    const center = phat + (z * z) / (2 * n);
    const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);

    return [(center - margin) / denominator, (center + margin) / denominator];
  }

  private round4(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const engineAccuracyTrackerEngine = new EngineAccuracyTrackerEngine();
