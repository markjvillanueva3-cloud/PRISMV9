/**
 * LearningAdaptationEngine — Outcome-Based Learning for PRISM
 * ===========================================================
 * Provides learning and adaptation capabilities:
 *   - Prediction-outcome comparison and error analysis
 *   - Bayesian belief updating
 *   - Pattern recognition in historical outcomes
 *   - Model calibration and bias correction
 *   - Confidence adjustment based on track record
 *   - Tribal knowledge extraction from outcomes
 *
 * This engine enables PRISM to learn from real-world results,
 * continuously improving prediction accuracy over time.
 *
 * @module engines/LearningAdaptationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Prediction type */
export type PredictionCategory =
  | "cutting_force"
  | "tool_life"
  | "surface_finish"
  | "cycle_time"
  | "temperature"
  | "deflection"
  | "chatter_risk"
  | "cost"
  | "power"
  | "mrr";

/** A prediction made by PRISM */
export interface Prediction {
  prediction_id: string;
  category: PredictionCategory;
  predicted_value: number;
  predicted_uncertainty: number;
  confidence: number;
  timestamp: string;
  context: PredictionContext;
  model_version: string;
  explanation?: string;
}

/** Context of the prediction */
export interface PredictionContext {
  material?: string;
  operation?: string;
  machine?: string;
  tool?: string;
  cutting_speed?: number;
  feed?: number;
  depth?: number;
  [key: string]: unknown;
}

/** Observed outcome */
export interface Outcome {
  prediction_id: string;
  observed_value: number;
  observed_uncertainty?: number;
  measurement_method?: string;
  timestamp: string;
  operator_notes?: string;
  anomaly_flags?: string[];
}

/** Error analysis result */
export interface ErrorAnalysis {
  absolute_error: number;
  relative_error: number;
  error_direction: "over" | "under" | "accurate";
  within_uncertainty: boolean;
  z_score: number;
  error_category: "systematic" | "random" | "outlier";
  potential_causes: string[];
}

/** Prediction-outcome pair for learning */
export interface LearningRecord {
  prediction: Prediction;
  outcome: Outcome;
  error_analysis: ErrorAnalysis;
  learning_weight: number;  // How much to weight this in learning
}

/** Bayesian belief about a parameter */
export interface BayesianBelief {
  parameter: string;
  prior_mean: number;
  prior_variance: number;
  posterior_mean: number;
  posterior_variance: number;
  observations: number;
  last_updated: string;
}

/** Learned pattern */
export interface LearnedPattern {
  pattern_id: string;
  description: string;
  conditions: PatternCondition[];
  effect: PatternEffect;
  confidence: number;
  support_count: number;
  first_observed: string;
  last_confirmed: string;
}

/** Pattern condition */
export interface PatternCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "contains" | "in_range";
  value: unknown;
}

/** Pattern effect on prediction */
export interface PatternEffect {
  type: "bias" | "scale" | "variance_increase" | "limit";
  magnitude: number;
  direction?: "positive" | "negative";
}

/** Model calibration */
export interface CalibrationResult {
  category: PredictionCategory;
  bias: number;                    // Systematic over/under prediction
  scale_factor: number;            // Multiplicative correction
  rmse: number;                    // Root mean square error
  mae: number;                     // Mean absolute error
  calibration_curve: Array<{
    predicted: number;
    observed: number;
    count: number;
  }>;
  recommendation: string;
}

/** Track record for a prediction category */
export interface TrackRecord {
  category: PredictionCategory;
  total_predictions: number;
  within_uncertainty: number;
  accuracy_rate: number;
  average_error: number;
  error_trend: "improving" | "stable" | "degrading";
  best_context?: PredictionContext;
  worst_context?: PredictionContext;
  confidence_calibration: number;  // Ideal = 1.0
}

/** Learning engine state */
export interface LearningState {
  records: LearningRecord[];
  beliefs: BayesianBelief[];
  patterns: LearnedPattern[];
  track_records: TrackRecord[];
  last_consolidation: string;
  model_version: string;
}

/** Adjustment recommendation */
export interface AdjustmentRecommendation {
  category: PredictionCategory;
  adjustment_type: "bias_correction" | "scale" | "uncertainty_increase" | "model_retrain";
  factor: number;
  confidence: number;
  reason: string;
  applicable_contexts: PredictionContext[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class LearningAdaptationEngine {
  private static state: LearningState = {
    records: [],
    beliefs: [],
    patterns: [],
    track_records: [],
    last_consolidation: new Date().toISOString(),
    model_version: "1.0.0",
  };

  private static readonly MAX_RECORDS = 10000;
  private static readonly PATTERN_MIN_SUPPORT = 5;
  private static readonly OUTLIER_THRESHOLD = 3.0;  // Z-score

  /**
   * Record a prediction-outcome pair and learn from it
   */
  static learn(prediction: Prediction, outcome: Outcome): LearningRecord {
    log.info("[LearningAdaptation] Recording prediction-outcome pair", {
      prediction_id: prediction.prediction_id,
      category: prediction.category,
    });

    // Analyze the error
    const errorAnalysis = this.analyzeError(prediction, outcome);

    // Calculate learning weight
    const learningWeight = this.calculateLearningWeight(prediction, outcome, errorAnalysis);

    const record: LearningRecord = {
      prediction,
      outcome,
      error_analysis: errorAnalysis,
      learning_weight: learningWeight,
    };

    // Add to records
    this.state.records.push(record);

    // Trim old records if needed
    if (this.state.records.length > this.MAX_RECORDS) {
      this.state.records = this.state.records.slice(-this.MAX_RECORDS);
    }

    // Update Bayesian beliefs
    this.updateBeliefs(record);

    // Update track record
    this.updateTrackRecord(record);

    // Try to extract patterns (periodically)
    if (this.state.records.length % 50 === 0) {
      this.extractPatterns(prediction.category);
    }

    log.info("[LearningAdaptation] Learning complete", {
      error: errorAnalysis.absolute_error,
      within_uncertainty: errorAnalysis.within_uncertainty,
      learning_weight: learningWeight,
    });

    return record;
  }

  /**
   * Get adjustment recommendation for a prediction
   */
  static getAdjustment(
    category: PredictionCategory,
    context: PredictionContext
  ): AdjustmentRecommendation | null {
    const trackRecord = this.state.track_records.find(tr => tr.category === category);
    if (!trackRecord || trackRecord.total_predictions < 10) {
      return null;  // Not enough data to recommend adjustments
    }

    // Check for systematic bias
    if (Math.abs(trackRecord.average_error) > 0.1) {
      return {
        category,
        adjustment_type: "bias_correction",
        factor: -trackRecord.average_error,
        confidence: Math.min(0.9, trackRecord.total_predictions / 100),
        reason: `Systematic ${trackRecord.average_error > 0 ? "over" : "under"}prediction detected`,
        applicable_contexts: [],
      };
    }

    // Check for confidence miscalibration
    if (trackRecord.confidence_calibration < 0.8) {
      return {
        category,
        adjustment_type: "uncertainty_increase",
        factor: 1 / trackRecord.confidence_calibration,
        confidence: 0.7,
        reason: "Predictions more uncertain than reported; increase uncertainty bounds",
        applicable_contexts: [],
      };
    }

    // Check for context-specific patterns
    const matchingPatterns = this.state.patterns.filter(p => {
      if (p.confidence < 0.7) return false;
      return p.conditions.every(c => this.matchesCondition(context, c));
    });

    if (matchingPatterns.length > 0) {
      const strongest = matchingPatterns.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        category,
        adjustment_type: strongest.effect.type === "bias" ? "bias_correction" : "scale",
        factor: strongest.effect.magnitude * (strongest.effect.direction === "negative" ? -1 : 1),
        confidence: strongest.confidence,
        reason: strongest.description,
        applicable_contexts: [context],
      };
    }

    return null;
  }

  /**
   * Adjust a prediction based on learned patterns
   */
  static adjustPrediction(
    category: PredictionCategory,
    value: number,
    uncertainty: number,
    context: PredictionContext
  ): {
    adjusted_value: number;
    adjusted_uncertainty: number;
    adjustments_applied: string[];
    confidence_modifier: number;
  } {
    let adjustedValue = value;
    let adjustedUncertainty = uncertainty;
    const adjustmentsApplied: string[] = [];
    let confidenceModifier = 1.0;

    // Apply systematic bias correction
    const trackRecord = this.state.track_records.find(tr => tr.category === category);
    if (trackRecord && trackRecord.total_predictions >= 10) {
      if (Math.abs(trackRecord.average_error) > 0.05) {
        const biasCorrection = -trackRecord.average_error * value;
        adjustedValue += biasCorrection;
        adjustmentsApplied.push(`Bias correction: ${biasCorrection > 0 ? "+" : ""}${biasCorrection.toFixed(3)}`);
      }

      // Adjust uncertainty based on actual accuracy
      if (trackRecord.confidence_calibration < 0.9) {
        adjustedUncertainty *= 1 / trackRecord.confidence_calibration;
        adjustmentsApplied.push(`Uncertainty scaled by ${(1 / trackRecord.confidence_calibration).toFixed(2)}`);
      }

      // Adjust confidence based on track record
      confidenceModifier = trackRecord.accuracy_rate;
    }

    // Apply context-specific patterns
    for (const pattern of this.state.patterns) {
      if (pattern.confidence < 0.7) continue;

      const matches = pattern.conditions.every(c => this.matchesCondition(context, c));
      if (!matches) continue;

      switch (pattern.effect.type) {
        case "bias":
          const bias = pattern.effect.magnitude * (pattern.effect.direction === "negative" ? -1 : 1);
          adjustedValue *= (1 + bias);
          adjustmentsApplied.push(`Pattern "${pattern.pattern_id}": ${bias > 0 ? "+" : ""}${(bias * 100).toFixed(1)}%`);
          break;

        case "scale":
          adjustedValue *= pattern.effect.magnitude;
          adjustmentsApplied.push(`Pattern "${pattern.pattern_id}": scale ×${pattern.effect.magnitude.toFixed(2)}`);
          break;

        case "variance_increase":
          adjustedUncertainty *= pattern.effect.magnitude;
          adjustmentsApplied.push(`Pattern "${pattern.pattern_id}": uncertainty ×${pattern.effect.magnitude.toFixed(2)}`);
          break;
      }
    }

    return {
      adjusted_value: adjustedValue,
      adjusted_uncertainty: adjustedUncertainty,
      adjustments_applied: adjustmentsApplied,
      confidence_modifier: confidenceModifier,
    };
  }

  /**
   * Calibrate model for a category
   */
  static calibrate(category: PredictionCategory): CalibrationResult {
    log.info("[LearningAdaptation] Calibrating model", { category });

    const records = this.state.records.filter(r => r.prediction.category === category);

    if (records.length < 10) {
      return {
        category,
        bias: 0,
        scale_factor: 1,
        rmse: NaN,
        mae: NaN,
        calibration_curve: [],
        recommendation: "Insufficient data for calibration (need at least 10 records)",
      };
    }

    // Calculate bias and scale
    let sumError = 0;
    let sumSquaredError = 0;
    let sumAbsError = 0;
    let sumPredicted = 0;
    let sumObserved = 0;

    for (const record of records) {
      const error = record.outcome.observed_value - record.prediction.predicted_value;
      sumError += error;
      sumSquaredError += error * error;
      sumAbsError += Math.abs(error);
      sumPredicted += record.prediction.predicted_value;
      sumObserved += record.outcome.observed_value;
    }

    const n = records.length;
    const bias = sumError / n;
    const rmse = Math.sqrt(sumSquaredError / n);
    const mae = sumAbsError / n;
    const scale_factor = sumPredicted !== 0 ? sumObserved / sumPredicted : 1;

    // Build calibration curve (binned)
    const bins = 10;
    const sortedRecords = [...records].sort(
      (a, b) => a.prediction.predicted_value - b.prediction.predicted_value
    );
    const binSize = Math.ceil(n / bins);
    const calibration_curve: Array<{ predicted: number; observed: number; count: number }> = [];

    for (let i = 0; i < bins; i++) {
      const binRecords = sortedRecords.slice(i * binSize, (i + 1) * binSize);
      if (binRecords.length === 0) continue;

      const avgPredicted = binRecords.reduce((s, r) => s + r.prediction.predicted_value, 0) / binRecords.length;
      const avgObserved = binRecords.reduce((s, r) => s + r.outcome.observed_value, 0) / binRecords.length;

      calibration_curve.push({
        predicted: avgPredicted,
        observed: avgObserved,
        count: binRecords.length,
      });
    }

    // Generate recommendation
    let recommendation = "";
    if (Math.abs(bias) > 0.1 * sumObserved / n) {
      recommendation = `Apply bias correction of ${bias > 0 ? "-" : "+"}${Math.abs(bias).toFixed(3)} to predictions`;
    } else if (Math.abs(scale_factor - 1) > 0.1) {
      recommendation = `Apply scale factor of ${scale_factor.toFixed(3)} to predictions`;
    } else if (rmse > 0.2 * sumObserved / n) {
      recommendation = "High RMSE - consider retraining model or increasing uncertainty bounds";
    } else {
      recommendation = "Model is well-calibrated; no adjustments recommended";
    }

    log.info("[LearningAdaptation] Calibration complete", {
      bias,
      scale_factor,
      rmse,
      mae,
    });

    return {
      category,
      bias,
      scale_factor,
      rmse,
      mae,
      calibration_curve,
      recommendation,
    };
  }

  /**
   * Get track record summary
   */
  static getTrackRecord(category?: PredictionCategory): TrackRecord[] {
    if (category) {
      const tr = this.state.track_records.find(t => t.category === category);
      return tr ? [tr] : [];
    }
    return this.state.track_records;
  }

  /**
   * Get learned patterns
   */
  static getPatterns(minConfidence: number = 0.7): LearnedPattern[] {
    return this.state.patterns.filter(p => p.confidence >= minConfidence);
  }

  /**
   * Extract tribal knowledge from learning records
   */
  static extractTribalKnowledge(): Array<{
    insight: string;
    confidence: number;
    evidence_count: number;
    applicable_to: string[];
  }> {
    const insights: Array<{
      insight: string;
      confidence: number;
      evidence_count: number;
      applicable_to: string[];
    }> = [];

    // Analyze material-specific patterns
    const materialErrors = new Map<string, number[]>();
    for (const record of this.state.records) {
      const material = record.prediction.context.material;
      if (material) {
        if (!materialErrors.has(material)) {
          materialErrors.set(material, []);
        }
        materialErrors.get(material)!.push(record.error_analysis.relative_error);
      }
    }

    for (const [material, errors] of materialErrors) {
      if (errors.length < 5) continue;

      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      if (Math.abs(avgError) > 0.1) {
        insights.push({
          insight: `For ${material}, predictions tend to be ${avgError > 0 ? "low" : "high"} by ${Math.abs(avgError * 100).toFixed(0)}%`,
          confidence: Math.min(0.9, errors.length / 20),
          evidence_count: errors.length,
          applicable_to: [material],
        });
      }
    }

    // Analyze operation-specific patterns
    const operationErrors = new Map<string, number[]>();
    for (const record of this.state.records) {
      const operation = record.prediction.context.operation;
      if (operation) {
        if (!operationErrors.has(operation)) {
          operationErrors.set(operation, []);
        }
        operationErrors.get(operation)!.push(record.error_analysis.relative_error);
      }
    }

    for (const [operation, errors] of operationErrors) {
      if (errors.length < 5) continue;

      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      if (Math.abs(avgError) > 0.15) {
        insights.push({
          insight: `${operation} operations: adjust predictions by ${avgError > 0 ? "+" : ""}${(avgError * 100).toFixed(0)}%`,
          confidence: Math.min(0.85, errors.length / 25),
          evidence_count: errors.length,
          applicable_to: [operation],
        });
      }
    }

    // Look for compound patterns
    const patterns = this.state.patterns.filter(p => p.confidence > 0.75 && p.support_count >= 10);
    for (const pattern of patterns) {
      insights.push({
        insight: pattern.description,
        confidence: pattern.confidence,
        evidence_count: pattern.support_count,
        applicable_to: pattern.conditions.map(c => `${c.field}:${c.value}`),
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get confidence interval based on historical accuracy
   */
  static getHistoricalConfidenceInterval(
    category: PredictionCategory,
    predicted: number,
    nominal_uncertainty: number,
    confidence_level: number = 0.95
  ): { lower: number; upper: number; adjusted_uncertainty: number } {
    const trackRecord = this.state.track_records.find(tr => tr.category === category);

    let adjustedUncertainty = nominal_uncertainty;

    if (trackRecord && trackRecord.total_predictions >= 20) {
      // Adjust based on calibration
      adjustedUncertainty *= 1 / trackRecord.confidence_calibration;

      // Add historical RMSE contribution
      const categoryRecords = this.state.records.filter(r => r.prediction.category === category);
      if (categoryRecords.length >= 10) {
        const errors = categoryRecords.map(r => r.error_analysis.absolute_error);
        const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);

        // Combine nominal uncertainty with historical RMSE
        adjustedUncertainty = Math.sqrt(
          Math.pow(adjustedUncertainty, 2) + Math.pow(rmse, 2)
        );
      }
    }

    // Coverage factor for confidence level
    const coverageFactor = confidence_level === 0.99 ? 2.576 : confidence_level === 0.95 ? 1.96 : 1.645;

    return {
      lower: predicted - coverageFactor * adjustedUncertainty,
      upper: predicted + coverageFactor * adjustedUncertainty,
      adjusted_uncertainty: adjustedUncertainty,
    };
  }

  /**
   * Reset learning state (for testing)
   */
  static reset(): void {
    this.state = {
      records: [],
      beliefs: [],
      patterns: [],
      track_records: [],
      last_consolidation: new Date().toISOString(),
      model_version: "1.0.0",
    };
  }

  /**
   * Export state for persistence
   */
  static exportState(): LearningState {
    return { ...this.state };
  }

  /**
   * Import state from persistence
   */
  static importState(state: LearningState): void {
    this.state = state;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static analyzeError(prediction: Prediction, outcome: Outcome): ErrorAnalysis {
    const absoluteError = outcome.observed_value - prediction.predicted_value;
    const relativeError = prediction.predicted_value !== 0
      ? absoluteError / prediction.predicted_value
      : absoluteError;

    const zScore = prediction.predicted_uncertainty > 0
      ? absoluteError / prediction.predicted_uncertainty
      : Infinity;

    const withinUncertainty = Math.abs(zScore) <= 2;

    let errorDirection: "over" | "under" | "accurate";
    if (Math.abs(relativeError) < 0.05) {
      errorDirection = "accurate";
    } else if (absoluteError > 0) {
      errorDirection = "under";  // Predicted low
    } else {
      errorDirection = "over";   // Predicted high
    }

    let errorCategory: "systematic" | "random" | "outlier";
    if (Math.abs(zScore) > this.OUTLIER_THRESHOLD) {
      errorCategory = "outlier";
    } else if (this.isSystematicError(prediction.category, errorDirection)) {
      errorCategory = "systematic";
    } else {
      errorCategory = "random";
    }

    const potentialCauses = this.identifyPotentialCauses(prediction, outcome, errorDirection);

    return {
      absolute_error: absoluteError,
      relative_error: relativeError,
      error_direction: errorDirection,
      within_uncertainty: withinUncertainty,
      z_score: zScore,
      error_category: errorCategory,
      potential_causes: potentialCauses,
    };
  }

  private static isSystematicError(category: PredictionCategory, direction: "over" | "under" | "accurate"): boolean {
    if (direction === "accurate") return false;

    const recentRecords = this.state.records
      .filter(r => r.prediction.category === category)
      .slice(-20);

    if (recentRecords.length < 5) return false;

    const sameDirection = recentRecords.filter(
      r => r.error_analysis.error_direction === direction
    ).length;

    return sameDirection / recentRecords.length > 0.7;
  }

  private static identifyPotentialCauses(
    prediction: Prediction,
    outcome: Outcome,
    direction: "over" | "under" | "accurate"
  ): string[] {
    const causes: string[] = [];

    if (direction === "accurate") return causes;

    // Category-specific causes
    switch (prediction.category) {
      case "cutting_force":
        if (direction === "under") {
          causes.push("Material harder than expected (work hardening?)");
          causes.push("Tool wear increased effective rake angle");
        } else {
          causes.push("Material softer than spec");
          causes.push("Better chip formation than modeled");
        }
        break;

      case "tool_life":
        if (direction === "under") {
          causes.push("Abrasive inclusions in material");
          causes.push("Intermittent cutting/interrupted cut");
          causes.push("Coolant flow inadequate");
        } else {
          causes.push("Superior coating performance");
          causes.push("Favorable chip breaking");
        }
        break;

      case "surface_finish":
        if (direction === "under") {
          causes.push("Tool nose radius wear");
          causes.push("Vibration/chatter present");
          causes.push("BUE formation");
        } else {
          causes.push("Tool sharper than modeled");
          causes.push("Better machine rigidity than assumed");
        }
        break;

      case "temperature":
        if (direction === "under") {
          causes.push("Less coolant penetration than assumed");
          causes.push("Higher friction coefficient");
        } else {
          causes.push("Effective chip evacuation reducing heat");
          causes.push("Better coolant delivery than modeled");
        }
        break;
    }

    // Context-specific causes
    if (prediction.context.material?.toLowerCase().includes("titanium")) {
      causes.push("Titanium's variable work hardening behavior");
    }
    if (prediction.context.operation?.toLowerCase().includes("finish")) {
      causes.push("Finishing passes more sensitive to tool condition");
    }

    return causes;
  }

  private static calculateLearningWeight(
    prediction: Prediction,
    outcome: Outcome,
    errorAnalysis: ErrorAnalysis
  ): number {
    let weight = 1.0;

    // Reduce weight for outliers
    if (errorAnalysis.error_category === "outlier") {
      weight *= 0.3;
    }

    // Increase weight for recent records
    const age = Date.now() - new Date(outcome.timestamp).getTime();
    const ageMonths = age / (30 * 24 * 60 * 60 * 1000);
    weight *= Math.exp(-ageMonths / 12);  // Half-life of 12 months

    // Increase weight for confident predictions that were wrong
    if (!errorAnalysis.within_uncertainty && prediction.confidence > 0.8) {
      weight *= 1.5;  // Learn more from confident mistakes
    }

    // Reduce weight if outcome uncertainty is high
    if (outcome.observed_uncertainty && outcome.observed_uncertainty > prediction.predicted_uncertainty) {
      weight *= prediction.predicted_uncertainty / outcome.observed_uncertainty;
    }

    return Math.max(0.1, Math.min(2.0, weight));
  }

  private static updateBeliefs(record: LearningRecord): void {
    // Bayesian update for category-level bias
    const beliefKey = `${record.prediction.category}_bias`;
    let belief = this.state.beliefs.find(b => b.parameter === beliefKey);

    if (!belief) {
      belief = {
        parameter: beliefKey,
        prior_mean: 0,
        prior_variance: 0.1,
        posterior_mean: 0,
        posterior_variance: 0.1,
        observations: 0,
        last_updated: new Date().toISOString(),
      };
      this.state.beliefs.push(belief);
    }

    // Bayesian update (assuming normal prior and likelihood)
    const observation = record.error_analysis.relative_error;
    const observationVariance = Math.pow(record.prediction.predicted_uncertainty / record.prediction.predicted_value, 2);

    const priorPrecision = 1 / belief.prior_variance;
    const likelihoodPrecision = record.learning_weight / observationVariance;
    const posteriorPrecision = priorPrecision + likelihoodPrecision;

    belief.posterior_mean = (priorPrecision * belief.prior_mean + likelihoodPrecision * observation) / posteriorPrecision;
    belief.posterior_variance = 1 / posteriorPrecision;
    belief.observations++;
    belief.last_updated = new Date().toISOString();

    // Update prior for next observation
    belief.prior_mean = belief.posterior_mean;
    belief.prior_variance = belief.posterior_variance + 0.001;  // Small process noise
  }

  private static updateTrackRecord(record: LearningRecord): void {
    let trackRecord = this.state.track_records.find(
      tr => tr.category === record.prediction.category
    );

    if (!trackRecord) {
      trackRecord = {
        category: record.prediction.category,
        total_predictions: 0,
        within_uncertainty: 0,
        accuracy_rate: 0,
        average_error: 0,
        error_trend: "stable",
        confidence_calibration: 1.0,
      };
      this.state.track_records.push(trackRecord);
    }

    // Update counts
    trackRecord.total_predictions++;
    if (record.error_analysis.within_uncertainty) {
      trackRecord.within_uncertainty++;
    }

    // Update accuracy rate
    trackRecord.accuracy_rate = trackRecord.within_uncertainty / trackRecord.total_predictions;

    // Update average error (exponential moving average)
    const alpha = 0.1;
    trackRecord.average_error = alpha * record.error_analysis.relative_error +
      (1 - alpha) * trackRecord.average_error;

    // Update confidence calibration (how well uncertainties predict errors)
    const expectedWithinU = 0.95;  // 95% should be within 2σ
    trackRecord.confidence_calibration = trackRecord.accuracy_rate / expectedWithinU;

    // Detect trend
    const recentRecords = this.state.records
      .filter(r => r.prediction.category === record.prediction.category)
      .slice(-20);

    if (recentRecords.length >= 10) {
      const firstHalf = recentRecords.slice(0, 10);
      const secondHalf = recentRecords.slice(-10);

      const firstAccuracy = firstHalf.filter(r => r.error_analysis.within_uncertainty).length / 10;
      const secondAccuracy = secondHalf.filter(r => r.error_analysis.within_uncertainty).length / 10;

      if (secondAccuracy > firstAccuracy + 0.1) {
        trackRecord.error_trend = "improving";
      } else if (secondAccuracy < firstAccuracy - 0.1) {
        trackRecord.error_trend = "degrading";
      } else {
        trackRecord.error_trend = "stable";
      }
    }
  }

  private static extractPatterns(category: PredictionCategory): void {
    const categoryRecords = this.state.records.filter(
      r => r.prediction.category === category
    );

    if (categoryRecords.length < this.PATTERN_MIN_SUPPORT * 2) return;

    // Look for material-based patterns
    const materialGroups = new Map<string, LearningRecord[]>();
    for (const record of categoryRecords) {
      const material = record.prediction.context.material;
      if (material) {
        if (!materialGroups.has(material)) {
          materialGroups.set(material, []);
        }
        materialGroups.get(material)!.push(record);
      }
    }

    for (const [material, records] of materialGroups) {
      if (records.length < this.PATTERN_MIN_SUPPORT) continue;

      const avgError = records.reduce((s, r) => s + r.error_analysis.relative_error, 0) / records.length;

      if (Math.abs(avgError) > 0.1) {
        const patternId = `${category}_${material}_bias`;
        const existing = this.state.patterns.find(p => p.pattern_id === patternId);

        if (existing) {
          existing.confidence = Math.min(0.95, existing.confidence + 0.05);
          existing.support_count = records.length;
          existing.last_confirmed = new Date().toISOString();
          existing.effect.magnitude = avgError;
        } else {
          this.state.patterns.push({
            pattern_id: patternId,
            description: `For ${material}, ${category} predictions are ${avgError > 0 ? "low" : "high"} by ~${Math.abs(avgError * 100).toFixed(0)}%`,
            conditions: [{ field: "material", operator: "eq", value: material }],
            effect: {
              type: "bias",
              magnitude: Math.abs(avgError),
              direction: avgError > 0 ? "positive" : "negative",
            },
            confidence: Math.min(0.9, records.length / 20),
            support_count: records.length,
            first_observed: new Date().toISOString(),
            last_confirmed: new Date().toISOString(),
          });
        }
      }
    }
  }

  private static matchesCondition(context: PredictionContext, condition: PatternCondition): boolean {
    const value = context[condition.field];
    if (value === undefined) return false;

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "gt":
        return typeof value === "number" && value > (condition.value as number);
      case "lt":
        return typeof value === "number" && value < (condition.value as number);
      case "contains":
        return typeof value === "string" && value.includes(condition.value as string);
      case "in_range":
        if (typeof value !== "number") return false;
        const [min, max] = condition.value as [number, number];
        return value >= min && value <= max;
      default:
        return false;
    }
  }
}

// Export singleton
export const learningAdaptationEngine = new LearningAdaptationEngine();
