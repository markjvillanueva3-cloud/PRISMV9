/**
 * BayesianSafetyEngine — Bayesian S(x) with Credible Intervals
 *
 * USSH Phase 0.25: Scientific Foundations — Probability Theory Enhancement
 *
 * Current S(x) is a frequentist point estimate. This engine provides:
 *   - Bayesian posterior with credible intervals
 *   - Prior knowledge from historical operation data
 *   - Decision thresholds with confidence bounds
 *   - Calibrated probability estimates
 *
 * Mathematical Foundation:
 *   - Prior: Beta(α₀, β₀) based on historical pass/fail counts
 *   - Likelihood: Binomial from current operation checks
 *   - Posterior: Beta(α₀ + passed, β₀ + failed)
 *   - Credible Interval: Quantiles of Beta distribution
 *   - Decision: P(S(x) > threshold | data)
 *
 * @module engines/BayesianSafetyEngine
 * @milestone USSH-P0.25/U-SCI02
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface BayesianPrior {
  alpha: number; // successful operations (pseudo-counts)
  beta: number; // failed operations (pseudo-counts)
  source: string;
  updated_at: number;
}

export interface SafetyObservation {
  passed_checks: number;
  total_checks: number;
  operation_type: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface BayesianPosterior {
  alpha: number;
  beta: number;
  mean: number;
  mode: number;
  variance: number;
  std: number;
}

export interface CredibleInterval {
  lower: number;
  upper: number;
  confidence: number;
}

export interface SafetyDecision {
  threshold: number;
  probability_above_threshold: number;
  decision: "pass" | "fail" | "uncertain";
  confidence: number;
  credible_interval: CredibleInterval;
  posterior: BayesianPosterior;
}

export interface CalibrationResult {
  predicted_probabilities: number[];
  actual_outcomes: boolean[];
  calibration_error: number;
  reliability_diagram: { bin_center: number; predicted: number; actual: number }[];
  is_well_calibrated: boolean;
}

export interface SafetyHistory {
  operation_type: string;
  observations: SafetyObservation[];
  prior: BayesianPrior;
  posterior: BayesianPosterior;
}

export interface BayesianSafetyConfig {
  default_prior_alpha: number;
  default_prior_beta: number;
  decision_threshold: number;
  uncertainty_margin: number;
  min_observations_for_decision: number;
  calibration_bins: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: BayesianSafetyConfig = {
  default_prior_alpha: 10, // Prior successful operations
  default_prior_beta: 2, // Prior failed operations (optimistic prior)
  decision_threshold: 0.70, // S(x) threshold
  uncertainty_margin: 0.10, // Margin for "uncertain" decision
  min_observations_for_decision: 5,
  calibration_bins: 10,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BayesianSafetyEngine {
  private config: BayesianSafetyConfig;
  private priors: Map<string, BayesianPrior>;
  private observations: Map<string, SafetyObservation[]>;
  private calibrationData: { predicted: number; actual: boolean }[];

  constructor(config?: Partial<BayesianSafetyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.priors = new Map();
    this.observations = new Map();
    this.calibrationData = [];
  }

  /**
   * Set prior for an operation type.
   */
  setPrior(operationType: string, alpha: number, beta: number, source: string = "manual"): void {
    this.priors.set(operationType, {
      alpha,
      beta,
      source,
      updated_at: Date.now(),
    });
  }

  /**
   * Get prior for an operation type (or default).
   */
  getPrior(operationType: string): BayesianPrior {
    return (
      this.priors.get(operationType) ?? {
        alpha: this.config.default_prior_alpha,
        beta: this.config.default_prior_beta,
        source: "default",
        updated_at: Date.now(),
      }
    );
  }

  /**
   * Observe safety check results.
   */
  observe(observation: SafetyObservation): BayesianPosterior {
    const key = observation.operation_type;

    if (!this.observations.has(key)) {
      this.observations.set(key, []);
    }

    this.observations.get(key)!.push(observation);

    return this.getPosterior(key);
  }

  /**
   * Compute posterior distribution for an operation type.
   */
  getPosterior(operationType: string): BayesianPosterior {
    const prior = this.getPrior(operationType);
    const obs = this.observations.get(operationType) ?? [];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const o of obs) {
      totalPassed += o.passed_checks;
      totalFailed += o.total_checks - o.passed_checks;
    }

    const alpha = prior.alpha + totalPassed;
    const beta = prior.beta + totalFailed;

    const mean = alpha / (alpha + beta);
    const mode = alpha > 1 && beta > 1 ? (alpha - 1) / (alpha + beta - 2) : mean;
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const std = Math.sqrt(variance);

    return { alpha, beta, mean, mode, variance, std };
  }

  /**
   * Get credible interval for safety score.
   */
  getCredibleInterval(operationType: string, confidence: number = 0.95): CredibleInterval {
    const posterior = this.getPosterior(operationType);
    const tail = (1 - confidence) / 2;

    const lower = this.betaQuantile(tail, posterior.alpha, posterior.beta);
    const upper = this.betaQuantile(1 - tail, posterior.alpha, posterior.beta);

    return { lower, upper, confidence };
  }

  /**
   * Compute probability that S(x) exceeds threshold.
   */
  probabilityAboveThreshold(operationType: string, threshold?: number): number {
    const t = threshold ?? this.config.decision_threshold;
    const posterior = this.getPosterior(operationType);

    // P(X > t) = 1 - P(X <= t) = 1 - BetaCDF(t, alpha, beta)
    return 1 - this.betaCDF(t, posterior.alpha, posterior.beta);
  }

  /**
   * Make a safety decision with uncertainty quantification.
   */
  decide(operationType: string, threshold?: number): SafetyDecision {
    const t = threshold ?? this.config.decision_threshold;
    const posterior = this.getPosterior(operationType);
    const ci = this.getCredibleInterval(operationType);
    const probAbove = this.probabilityAboveThreshold(operationType, t);

    let decision: "pass" | "fail" | "uncertain";
    let confidence: number;

    if (ci.lower >= t) {
      decision = "pass";
      confidence = probAbove;
    } else if (ci.upper < t) {
      decision = "fail";
      confidence = 1 - probAbove;
    } else {
      decision = "uncertain";
      confidence = Math.abs(probAbove - 0.5) * 2; // How far from 50/50
    }

    return {
      threshold: t,
      probability_above_threshold: probAbove,
      decision,
      confidence,
      credible_interval: ci,
      posterior,
    };
  }

  /**
   * Batch decide for multiple operation types.
   */
  decideBatch(operationTypes: string[], threshold?: number): Map<string, SafetyDecision> {
    const results = new Map<string, SafetyDecision>();
    for (const op of operationTypes) {
      results.set(op, this.decide(op, threshold));
    }
    return results;
  }

  /**
   * Record calibration data point for later analysis.
   */
  recordCalibrationPoint(predictedProbability: number, actualOutcome: boolean): void {
    this.calibrationData.push({ predicted: predictedProbability, actual: actualOutcome });
  }

  /**
   * Compute calibration metrics.
   */
  computeCalibration(): CalibrationResult {
    if (this.calibrationData.length === 0) {
      return {
        predicted_probabilities: [],
        actual_outcomes: [],
        calibration_error: 0,
        reliability_diagram: [],
        is_well_calibrated: true,
      };
    }

    const bins = this.config.calibration_bins;
    const binWidth = 1 / bins;
    const binCounts: number[] = Array(bins).fill(0);
    const binPredicted: number[] = Array(bins).fill(0);
    const binActual: number[] = Array(bins).fill(0);

    for (const { predicted, actual } of this.calibrationData) {
      const binIdx = Math.min(Math.floor(predicted * bins), bins - 1);
      binCounts[binIdx]++;
      binPredicted[binIdx] += predicted;
      binActual[binIdx] += actual ? 1 : 0;
    }

    const reliabilityDiagram: { bin_center: number; predicted: number; actual: number }[] = [];
    let ece = 0; // Expected Calibration Error

    for (let i = 0; i < bins; i++) {
      if (binCounts[i] > 0) {
        const avgPredicted = binPredicted[i] / binCounts[i];
        const avgActual = binActual[i] / binCounts[i];
        reliabilityDiagram.push({
          bin_center: (i + 0.5) * binWidth,
          predicted: avgPredicted,
          actual: avgActual,
        });
        ece += (binCounts[i] / this.calibrationData.length) * Math.abs(avgPredicted - avgActual);
      }
    }

    return {
      predicted_probabilities: this.calibrationData.map((d) => d.predicted),
      actual_outcomes: this.calibrationData.map((d) => d.actual),
      calibration_error: ece,
      reliability_diagram: reliabilityDiagram,
      is_well_calibrated: ece < 0.05, // <5% calibration error is well-calibrated
    };
  }

  /**
   * Get safety history for an operation type.
   */
  getHistory(operationType: string): SafetyHistory {
    return {
      operation_type: operationType,
      observations: this.observations.get(operationType) ?? [],
      prior: this.getPrior(operationType),
      posterior: this.getPosterior(operationType),
    };
  }

  /**
   * Get all operation types with observations.
   */
  getOperationTypes(): string[] {
    return Array.from(this.observations.keys());
  }

  /**
   * Get observation count for an operation type.
   */
  getObservationCount(operationType: string): number {
    return this.observations.get(operationType)?.length ?? 0;
  }

  /**
   * Check if we have enough observations for a confident decision.
   */
  hasEnoughObservations(operationType: string): boolean {
    return this.getObservationCount(operationType) >= this.config.min_observations_for_decision;
  }

  /**
   * Update prior from historical data.
   */
  updatePriorFromHistory(
    operationType: string,
    historicalPassed: number,
    historicalFailed: number
  ): void {
    const prior = this.getPrior(operationType);
    this.setPrior(
      operationType,
      prior.alpha + historicalPassed,
      prior.beta + historicalFailed,
      "historical"
    );
    log.debug(`[BayesianSafety] Updated prior for ${operationType} from history`);
  }

  /**
   * Get configuration.
   */
  getConfig(): BayesianSafetyConfig {
    return { ...this.config };
  }

  /**
   * Clear all observations (keep priors).
   */
  clearObservations(): void {
    this.observations.clear();
  }

  /**
   * Clear calibration data.
   */
  clearCalibrationData(): void {
    this.calibrationData = [];
  }

  /**
   * Reset everything.
   */
  reset(): void {
    this.priors.clear();
    this.observations.clear();
    this.calibrationData = [];
  }

  /**
   * Export state for persistence.
   */
  export(): {
    priors: [string, BayesianPrior][];
    observations: [string, SafetyObservation[]][];
    calibrationData: { predicted: number; actual: boolean }[];
  } {
    return {
      priors: Array.from(this.priors.entries()),
      observations: Array.from(this.observations.entries()),
      calibrationData: this.calibrationData,
    };
  }

  /**
   * Import state.
   */
  import(data: {
    priors: [string, BayesianPrior][];
    observations: [string, SafetyObservation[]][];
    calibrationData: { predicted: number; actual: boolean }[];
  }): void {
    this.priors = new Map(data.priors);
    this.observations = new Map(data.observations);
    this.calibrationData = data.calibrationData;
  }

  // ============================================================================
  // PRIVATE METHODS — Beta Distribution Functions
  // ============================================================================

  /**
   * Beta CDF approximation using continued fraction.
   */
  private betaCDF(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use regularized incomplete beta function
    return this.regularizedIncompleteBeta(x, a, b);
  }

  /**
   * Beta quantile (inverse CDF) using Newton-Raphson.
   */
  private betaQuantile(p: number, a: number, b: number): number {
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    // Initial guess using normal approximation
    let x = a / (a + b);

    // Newton-Raphson iteration
    for (let i = 0; i < 20; i++) {
      const cdf = this.betaCDF(x, a, b);
      const pdf = this.betaPDF(x, a, b);

      if (pdf < 1e-10) break;

      const delta = (cdf - p) / pdf;
      x = Math.max(1e-10, Math.min(1 - 1e-10, x - delta));

      if (Math.abs(delta) < 1e-8) break;
    }

    return x;
  }

  /**
   * Beta PDF.
   */
  private betaPDF(x: number, a: number, b: number): number {
    if (x <= 0 || x >= 1) return 0;
    return (
      (Math.pow(x, a - 1) * Math.pow(1 - x, b - 1)) /
      this.beta(a, b)
    );
  }

  /**
   * Beta function B(a, b) = Γ(a)Γ(b)/Γ(a+b).
   */
  private beta(a: number, b: number): number {
    return Math.exp(this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b));
  }

  /**
   * Log-Gamma function using Lanczos approximation.
   */
  private logGamma(x: number): number {
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];

    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - this.logGamma(1 - x);
    }

    x -= 1;
    let sum = c[0];
    for (let i = 1; i < g + 2; i++) {
      sum += c[i] / (x + i);
    }

    const t = x + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
  }

  /**
   * Regularized incomplete beta function I_x(a, b).
   */
  private regularizedIncompleteBeta(x: number, a: number, b: number): number {
    // Use continued fraction for efficiency
    if (x > (a + 1) / (a + b + 2)) {
      return 1 - this.regularizedIncompleteBeta(1 - x, b, a);
    }

    const bt =
      x === 0 || x === 1
        ? 0
        : Math.exp(
            this.logGamma(a + b) -
              this.logGamma(a) -
              this.logGamma(b) +
              a * Math.log(x) +
              b * Math.log(1 - x)
          );

    // Continued fraction
    let f = 1;
    let c = 1;
    let d = 1 - ((a + b) * x) / (a + 1);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= 100; m++) {
      const m2 = 2 * m;

      // Even step
      let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;

      // Odd step
      aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;

      if (Math.abs(del - 1) < 1e-8) break;
    }

    return (bt * h) / a;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const bayesianSafetyEngine = new BayesianSafetyEngine();
