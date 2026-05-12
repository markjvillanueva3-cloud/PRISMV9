/**
 * PPOnlineLearningTrackerEngine — PP-DL-MS7
 *
 * Tracks PP-AGI prediction performance over time using production feedback.
 * Enables continuous improvement by:
 *   - Recording predictions and their outcomes
 *   - Computing accuracy/error metrics per domain
 *   - Detecting concept drift (accuracy degradation)
 *   - Identifying which scenarios need more training data
 *
 * Complements the active learning queue — the tracker finds scenarios
 * where predictions were WRONG (even if confidence was high), while
 * the queue finds scenarios where confidence was LOW.
 *
 * @module PPOnlineLearningTrackerEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type OutcomeCategory = "correct" | "incorrect" | "partial" | "unknown";

export interface PredictionRecord {
  id: string;
  timestamp: number;
  domain: "controller" | "machine" | "material" | "toolpath" | "scenario";
  prediction: string;              // what was predicted
  confidence: number;              // 0-1
  actual_outcome?: string;         // ground truth from production
  outcome_category?: OutcomeCategory;
  error_magnitude?: number;        // 0-1, for partial matches
  feedback_notes?: string;
  context?: Record<string, unknown>;
}

export interface DomainMetrics {
  domain: string;
  total_predictions: number;
  correct: number;
  incorrect: number;
  partial: number;
  unknown: number;
  accuracy: number;                // correct / (correct + incorrect + partial)
  avg_confidence: number;
  calibration_error: number;       // |accuracy - avg_confidence|
  recent_accuracy_7d: number;
  recent_accuracy_30d: number;
}

export interface DriftAlert {
  domain: string;
  severity: "info" | "warning" | "critical";
  metric: "accuracy_drop" | "confidence_miscalibration" | "outcome_shift";
  current_value: number;
  baseline_value: number;
  delta: number;
  message: string;
}

export interface LearningOpportunity {
  domain: string;
  scenario_pattern: string;
  error_count: number;
  avg_error_magnitude: number;
  recommendation: string;
}

export interface OnlineLearningStats {
  total_records: number;
  domains: DomainMetrics[];
  overall_accuracy: number;
  overall_calibration: number;
  drift_alerts: DriftAlert[];
  learning_opportunities: LearningOpportunity[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPOnlineLearningTrackerEngine {
  private records: PredictionRecord[] = [];
  private counter = 0;

  /**
   * Record a prediction made by the system.
   */
  recordPrediction(
    domain: PredictionRecord["domain"],
    prediction: string,
    confidence: number,
    context?: Record<string, unknown>,
  ): string {
    const id = `pr_${Date.now()}_${this.counter++}`;
    this.records.push({
      id, timestamp: Date.now(), domain, prediction, confidence, context,
    });
    return id;
  }

  /**
   * Record the actual outcome (production feedback).
   */
  recordOutcome(
    id: string,
    actualOutcome: string,
    errorMagnitude?: number,
    notes?: string,
  ): boolean {
    const record = this.records.find(r => r.id === id);
    if (!record) return false;

    record.actual_outcome = actualOutcome;
    record.feedback_notes = notes;

    if (record.prediction === actualOutcome) {
      record.outcome_category = "correct";
      record.error_magnitude = 0;
    } else if (errorMagnitude !== undefined && errorMagnitude < 0.3) {
      record.outcome_category = "partial";
      record.error_magnitude = errorMagnitude;
    } else {
      record.outcome_category = "incorrect";
      record.error_magnitude = errorMagnitude ?? 1;
    }
    return true;
  }

  /**
   * Get metrics for a specific domain.
   */
  getDomainMetrics(domain: string): DomainMetrics {
    const domainRecords = this.records.filter(r => r.domain === domain);
    return this.computeMetrics(domain, domainRecords);
  }

  /**
   * Get full statistics including drift alerts and learning opportunities.
   */
  getStats(): OnlineLearningStats {
    const domains = ["controller", "machine", "material", "toolpath", "scenario"];
    const domainMetrics = domains.map(d => this.computeMetrics(d, this.records.filter(r => r.domain === d)));

    // Filter out domains with no data
    const activeDomainMetrics = domainMetrics.filter(m => m.total_predictions > 0);

    const totalKnown = this.records.filter(r => r.outcome_category && r.outcome_category !== "unknown");
    const totalCorrect = totalKnown.filter(r => r.outcome_category === "correct").length;
    const overallAccuracy = totalKnown.length > 0 ? round4(totalCorrect / totalKnown.length) : 0;

    const avgConf = totalKnown.length > 0
      ? totalKnown.reduce((s, r) => s + r.confidence, 0) / totalKnown.length : 0;
    const overallCalibration = round4(Math.abs(overallAccuracy - avgConf));

    return {
      total_records: this.records.length,
      domains: activeDomainMetrics,
      overall_accuracy: overallAccuracy,
      overall_calibration: overallCalibration,
      drift_alerts: this.detectDrift(activeDomainMetrics),
      learning_opportunities: this.findLearningOpportunities(),
    };
  }

  /**
   * Get recent prediction history for a domain.
   */
  getHistory(domain: string, limit = 50): PredictionRecord[] {
    return this.records
      .filter(r => r.domain === domain)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all records (e.g., after a major retraining).
   */
  reset(): void {
    this.records = [];
    this.counter = 0;
  }

  /**
   * Export labeled records for retraining.
   */
  exportLabeledData(): PredictionRecord[] {
    return this.records.filter(r => r.outcome_category && r.outcome_category !== "unknown");
  }

  // ── Private ──────────────────────────────────────────────────────────

  private computeMetrics(domain: string, records: PredictionRecord[]): DomainMetrics {
    const correct = records.filter(r => r.outcome_category === "correct").length;
    const incorrect = records.filter(r => r.outcome_category === "incorrect").length;
    const partial = records.filter(r => r.outcome_category === "partial").length;
    const unknown = records.filter(r => !r.outcome_category || r.outcome_category === "unknown").length;

    const judged = correct + incorrect + partial;
    const accuracy = judged > 0 ? (correct + partial * 0.5) / judged : 0;

    const avgConf = records.length > 0
      ? records.reduce((s, r) => s + r.confidence, 0) / records.length : 0;

    const now = Date.now();
    const day7 = now - 7 * 24 * 60 * 60 * 1000;
    const day30 = now - 30 * 24 * 60 * 60 * 1000;

    const recent7 = records.filter(r => r.timestamp >= day7 && r.outcome_category && r.outcome_category !== "unknown");
    const recent30 = records.filter(r => r.timestamp >= day30 && r.outcome_category && r.outcome_category !== "unknown");

    const acc7 = recent7.length > 0
      ? recent7.filter(r => r.outcome_category === "correct").length / recent7.length : 0;
    const acc30 = recent30.length > 0
      ? recent30.filter(r => r.outcome_category === "correct").length / recent30.length : 0;

    return {
      domain,
      total_predictions: records.length,
      correct, incorrect, partial, unknown,
      accuracy: round4(accuracy),
      avg_confidence: round4(avgConf),
      calibration_error: round4(Math.abs(accuracy - avgConf)),
      recent_accuracy_7d: round4(acc7),
      recent_accuracy_30d: round4(acc30),
    };
  }

  private detectDrift(metrics: DomainMetrics[]): DriftAlert[] {
    const alerts: DriftAlert[] = [];

    for (const m of metrics) {
      if (m.total_predictions < 10) continue;

      // Accuracy drop: recent 7d vs overall
      if (m.recent_accuracy_7d > 0 && m.accuracy - m.recent_accuracy_7d > 0.15) {
        alerts.push({
          domain: m.domain,
          severity: m.accuracy - m.recent_accuracy_7d > 0.3 ? "critical" : "warning",
          metric: "accuracy_drop",
          current_value: m.recent_accuracy_7d,
          baseline_value: m.accuracy,
          delta: round4(m.recent_accuracy_7d - m.accuracy),
          message: `${m.domain} accuracy dropped from ${(m.accuracy * 100).toFixed(0)}% to ${(m.recent_accuracy_7d * 100).toFixed(0)}% in last 7 days`,
        });
      }

      // Confidence miscalibration
      if (m.calibration_error > 0.2) {
        alerts.push({
          domain: m.domain,
          severity: m.calibration_error > 0.35 ? "critical" : "warning",
          metric: "confidence_miscalibration",
          current_value: m.avg_confidence,
          baseline_value: m.accuracy,
          delta: round4(m.avg_confidence - m.accuracy),
          message: m.avg_confidence > m.accuracy
            ? `${m.domain} overconfident: predicts ${(m.avg_confidence * 100).toFixed(0)}% but only ${(m.accuracy * 100).toFixed(0)}% correct`
            : `${m.domain} underconfident: predicts ${(m.avg_confidence * 100).toFixed(0)}% but ${(m.accuracy * 100).toFixed(0)}% correct`,
        });
      }
    }

    return alerts;
  }

  private findLearningOpportunities(): LearningOpportunity[] {
    const opportunities: LearningOpportunity[] = [];

    // Group incorrect predictions by domain and actual_outcome pattern
    const errorGroups = new Map<string, PredictionRecord[]>();
    for (const r of this.records) {
      if (r.outcome_category !== "incorrect" && r.outcome_category !== "partial") continue;
      const key = `${r.domain}:${r.actual_outcome ?? "unknown"}`;
      if (!errorGroups.has(key)) errorGroups.set(key, []);
      errorGroups.get(key)!.push(r);
    }

    // Report groups with multiple errors
    for (const [key, records] of errorGroups) {
      if (records.length < 2) continue;
      const [domain, pattern] = key.split(":");
      const avgError = records.reduce((s, r) => s + (r.error_magnitude ?? 1), 0) / records.length;

      opportunities.push({
        domain,
        scenario_pattern: pattern,
        error_count: records.length,
        avg_error_magnitude: round4(avgError),
        recommendation: `Collect ${Math.max(10, records.length * 3)} labeled examples for "${pattern}" pattern in ${domain} domain`,
      });
    }

    return opportunities.sort((a, b) => b.error_count - a.error_count).slice(0, 10);
  }
}

function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppOnlineLearningTrackerEngine = new PPOnlineLearningTrackerEngine();
