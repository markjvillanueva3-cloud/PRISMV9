/**
 * PredictionValidationEngine — Statistical Comparison of Predicted vs Measured Values
 *
 * Six core metrics for every prediction-vs-measurement comparison:
 *   - MAE (Mean Absolute Error)
 *   - MAPE (Mean Absolute Percentage Error)
 *   - R-squared (Coefficient of Determination)
 *   - Bland-Altman (bias, limits of agreement, proportional bias check)
 *   - Paired t-test (H0: predicted = measured)
 *   - 95% Confidence Interval on prediction error
 *
 * Plus RMSE, max error, pass/fail grading, residual diagnostics.
 *
 * @module engines/PredictionValidationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationPair {
  predicted: number;
  measured: number;
  label?: string;
}

export interface ValidationInput {
  pairs: ValidationPair[];
  quantity: string;
  algorithm?: string;
  material?: string;
  pass_threshold_mape?: number;
}

export interface BlandAltmanData {
  bias: number;
  sd: number;
  upper_loa: number;
  lower_loa: number;
  points: Array<{ mean: number; diff: number }>;
  proportional_bias: boolean;
}

export interface ValidationResult {
  quantity: string;
  algorithm: string;
  material: string;
  n: number;
  mae: number;
  mape_pct: number;
  r_squared: number;
  bland_altman: BlandAltmanData;
  t_test: { t_statistic: number; p_value: number; significant: boolean; df: number };
  confidence_interval_95: { lower: number; upper: number; width: number };
  rmse: number;
  max_error: number;
  passed: boolean;
  grade: "A" | "B" | "C" | "D" | "F";
  residuals: number[];
  warnings: string[];
  formula: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Standard normal CDF approximation (Abramowitz & Stegun 26.2.17) */
function normalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1.0 + sign * y);
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[], m: number): number {
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function assignGrade(mape: number): "A" | "B" | "C" | "D" | "F" {
  if (mape < 5) return "A";
  if (mape < 10) return "B";
  if (mape < 15) return "C";
  if (mape < 25) return "D";
  return "F";
}

// ============================================================================
// ENGINE
// ============================================================================

export class PredictionValidationEngine {
  /**
   * Compute R-squared (coefficient of determination).
   * R² = 1 - SS_res / SS_tot, where SS_tot uses measured mean.
   */
  rSquared(predicted: number[], measured: number[]): number {
    const m = mean(measured);
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < measured.length; i++) {
      ssRes += (measured[i] - predicted[i]) ** 2;
      ssTot += (measured[i] - m) ** 2;
    }
    return ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
  }

  /**
   * Bland-Altman analysis: bias, SD, limits of agreement, proportional bias.
   * Difference = predicted - measured.
   */
  blandAltman(pairs: ValidationPair[]): BlandAltmanData {
    const points = pairs.map(p => ({
      mean: (p.predicted + p.measured) / 2,
      diff: p.predicted - p.measured,
    }));
    const diffs = points.map(pt => pt.diff);
    const means = points.map(pt => pt.mean);
    const bias = mean(diffs);
    const sd = diffs.length > 1 ? stdDev(diffs, bias) : 0;
    const r = diffs.length > 2 ? Math.abs(pearsonR(means, diffs)) : 0;
    return {
      bias,
      sd,
      upper_loa: bias + 1.96 * sd,
      lower_loa: bias - 1.96 * sd,
      points,
      proportional_bias: r > 0.3,
    };
  }

  /**
   * Paired t-test on differences. H0: mean difference = 0.
   * p-value approximation: p ~ 2*(1 - Phi(|t| * sqrt(1 - 0.25/df)))
   */
  pairedTTest(diffs: number[]): { t: number; p: number; df: number } {
    const n = diffs.length;
    const df = n - 1;
    const m = mean(diffs);
    const sd = stdDev(diffs, m);
    const se = sd / Math.sqrt(n);
    const t = se === 0 ? 0 : m / se;
    const adjustedT = Math.abs(t) * Math.sqrt(1 - 0.25 / df);
    const p = 2 * (1 - normalCdf(adjustedT));
    return { t, p, df };
  }

  /**
   * Full validation: compute all 6 metrics plus ancillary statistics.
   */
  validate(input: ValidationInput): ValidationResult {
    const { pairs, quantity, algorithm = "unknown", material = "unknown" } = input;
    const threshold = input.pass_threshold_mape ?? 15;
    const warnings: string[] = [];
    const n = pairs.length;

    // Guards
    if (n < 3) {
      warnings.push("n < 3: statistical tests unreliable");
    }
    if (n === 0) {
      return this.emptyResult(quantity, algorithm, material, threshold);
    }

    const predicted = pairs.map(p => p.predicted);
    const measured = pairs.map(p => p.measured);
    const residuals = pairs.map(p => p.predicted - p.measured);
    const absErrors = residuals.map(Math.abs);

    // MAE
    const mae = mean(absErrors);

    // MAPE — skip pairs where measured is zero to avoid division by zero
    let mapeSum = 0, mapeCount = 0;
    for (let i = 0; i < n; i++) {
      if (measured[i] !== 0) {
        mapeSum += Math.abs(residuals[i] / measured[i]);
        mapeCount++;
      }
    }
    if (mapeCount < n) {
      warnings.push(`${n - mapeCount} pair(s) with measured=0 excluded from MAPE`);
    }
    const mape_pct = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : Infinity;

    // R-squared
    const r_squared = n > 1 ? this.rSquared(predicted, measured) : 0;

    // RMSE
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

    // Max error
    const max_error = Math.max(...absErrors);

    // Bland-Altman
    const bland_altman = this.blandAltman(pairs);
    if (bland_altman.proportional_bias) {
      warnings.push("Proportional bias detected (|r| > 0.3 between mean and difference)");
    }

    // Paired t-test (need n >= 2)
    let t_test: ValidationResult["t_test"];
    if (n >= 2) {
      const tt = this.pairedTTest(residuals);
      t_test = {
        t_statistic: tt.t,
        p_value: tt.p,
        significant: tt.p < 0.05,
        df: tt.df,
      };
      if (t_test.significant) {
        warnings.push(`Paired t-test significant (p=${tt.p.toFixed(4)}): systematic bias detected`);
      }
    } else {
      t_test = { t_statistic: 0, p_value: 1, significant: false, df: 0 };
      warnings.push("n < 2: paired t-test skipped");
    }

    // 95% CI on mean prediction error
    const meanErr = mean(residuals);
    const sdErr = n > 1 ? stdDev(residuals, meanErr) : 0;
    const se = sdErr / Math.sqrt(n);
    const z95 = 1.96;
    const confidence_interval_95 = {
      lower: meanErr - z95 * se,
      upper: meanErr + z95 * se,
      width: 2 * z95 * se,
    };

    // R-squared warnings
    if (r_squared < 0) {
      warnings.push("Negative R²: model is worse than predicting the mean");
    } else if (r_squared < 0.5 && n > 5) {
      warnings.push(`Low R² (${r_squared.toFixed(3)}): weak predictive power`);
    }

    // Grade and pass/fail
    const grade = assignGrade(mape_pct);
    const passed = mape_pct < threshold;

    const formula =
      `MAE=Σ|pred-meas|/n, MAPE=100*Σ|e/meas|/n, R²=1-SS_res/SS_tot, ` +
      `BA: bias±1.96*SD, t=mean(d)/(SD(d)/√n), 95%CI=mean(e)±1.96*SE`;

    log.info(`[PredictionValidation] ${quantity} (${algorithm}): MAPE=${mape_pct.toFixed(1)}% grade=${grade} n=${n}`);

    return {
      quantity, algorithm, material, n,
      mae, mape_pct, r_squared,
      bland_altman, t_test, confidence_interval_95,
      rmse, max_error,
      passed, grade, residuals, warnings, formula,
    };
  }

  /** Return a zero-filled result for empty input. */
  private emptyResult(
    quantity: string, algorithm: string, material: string, threshold: number
  ): ValidationResult {
    return {
      quantity, algorithm, material, n: 0,
      mae: 0, mape_pct: Infinity, r_squared: 0,
      bland_altman: {
        bias: 0, sd: 0, upper_loa: 0, lower_loa: 0,
        points: [], proportional_bias: false,
      },
      t_test: { t_statistic: 0, p_value: 1, significant: false, df: 0 },
      confidence_interval_95: { lower: 0, upper: 0, width: 0 },
      rmse: 0, max_error: 0,
      passed: false, grade: "F", residuals: [],
      warnings: ["No data pairs provided"],
      formula: "N/A",
    };
  }
}

export const predictionValidationEngine = new PredictionValidationEngine();
