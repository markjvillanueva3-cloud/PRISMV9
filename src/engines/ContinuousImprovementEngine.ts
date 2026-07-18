/**
 * ContinuousImprovementEngine — Learns from validation results to improve
 * algorithm predictions via Bayesian model averaging, residual analysis,
 * and empirical correction factors.
 *
 * Methods: BMA model weighting (BIC-based), systematic residual pattern
 * detection (bias/trend/heteroscedasticity), correction factor learning,
 * and accuracy tracking over time.
 *
 * References: Schwarz (1978) BIC, Raftery (1995) BMA,
 *   Breusch-Pagan (1979) heteroscedasticity, Shapiro-Wilk (1965) normality
 */

// ─── Types ──────────────────────────────────────────────

/** Model result with predictions vs measurements for BIC/RMSE scoring. */
export interface ModelResult {
  model_name: string;
  predictions: number[];
  measured: number[];
  n_parameters: number;
}

/** Empirical correction factor learned from validation data. */
export interface CorrectionFactor {
  algorithm: string;
  material: string;
  quantity: string;
  factor: number;
  bias_offset: number;
  confidence: number;
  n_observations: number;
  description: string;
}

/** Input configuration for the improve() pipeline. */
export interface ImprovementInput {
  models: ModelResult[];
  algorithm?: string;
  material?: string;
  quantity?: string;
  existing_corrections?: CorrectionFactor[];
  min_observations?: number;
}

/** Full output of the improvement analysis. */
export interface ImprovementResult {
  model_weights: Array<{
    model: string; weight: number; bic: number; rmse: number;
  }>;
  best_model: string;
  correction_factors: CorrectionFactor[];
  residual_analysis: {
    has_bias: boolean;
    bias_value: number;
    has_trend: boolean;
    trend_slope: number;
    has_heteroscedasticity: boolean;
    normality_p_value: number;
  };
  improvement: {
    before_rmse: number;
    after_rmse: number;
    improvement_pct: number;
  };
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ─── Helpers ────────────────────────────────────────────

/** Compute mean of an array. */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Compute standard deviation (population). */
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/** Compute RMSE between two arrays. */
function rmse(predicted: number[], measured: number[]): number {
  const n = Math.min(predicted.length, measured.length);
  if (n === 0) return 0;
  const ss = predicted.slice(0, n).reduce((s, p, i) => s + (p - measured[i]) ** 2, 0);
  return Math.sqrt(ss / n);
}

/** Simple linear regression: returns { slope, intercept, r_squared }. */
function linearRegression(
  x: number[], y: number[]
): { slope: number; intercept: number; r_squared: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: mean(y), r_squared: 0 };
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r_squared = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept, r_squared };
}

/**
 * Approximate Shapiro-Wilk normality test via D'Agostino skewness/kurtosis.
 * Returns an approximate p-value (0 = not normal, 1 = perfectly normal).
 */
function approxNormalityPValue(data: number[]): number {
  const n = data.length;
  if (n < 8) return 1;
  const m = mean(data);
  const sd = stddev(data);
  if (sd < 1e-15) return 1;
  const standardized = data.map(v => (v - m) / sd);
  const skew = standardized.reduce((s, z) => s + z ** 3, 0) / n;
  const kurt = standardized.reduce((s, z) => s + z ** 4, 0) / n - 3;
  // Jarque-Bera test statistic approximation
  const jb = (n / 6) * (skew ** 2 + (kurt ** 2) / 4);
  // Approximate p-value from chi-squared(2) CDF
  const pValue = Math.exp(-jb / 2);
  return Math.min(1, Math.max(0, pValue));
}

// ─── Engine ─────────────────────────────────────────────

/**
 * ContinuousImprovementEngine learns from validation data to refine
 * manufacturing prediction models via BMA, residual diagnostics,
 * and empirical correction factors.
 */
export class ContinuousImprovementEngine {
  /**
   * Main pipeline: score models, analyze residuals, learn corrections,
   * measure improvement.
   */
  improve(input: ImprovementInput): ImprovementResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const minObs = input.min_observations ?? 10;
    const algo = input.algorithm ?? "unknown";
    const mat = input.material ?? "unknown";
    const qty = input.quantity ?? "value";

    if (input.models.length === 0) {
      throw new Error("At least one model result is required");
    }

    // Validate all models have matching lengths
    for (const m of input.models) {
      if (m.predictions.length !== m.measured.length) {
        const pLen = m.predictions.length;
        const mLen = m.measured.length;
        throw new Error(
          `Model "${m.model_name}": predictions (${pLen}) and measured (${mLen}) lengths must match`
        );
      }
      if (m.predictions.length < 3) {
        warnings.push(
          `Model "${m.model_name}" has only ${m.predictions.length} obs — results may be unreliable`
        );
      }
    }

    // 1. Bayesian model averaging
    const modelWeights = this.bayesianModelAveraging(input.models);
    const weightedResults = modelWeights.map(mw => {
      const model = input.models.find(m => m.model_name === mw.model)!;
      return { ...mw, rmse: rmse(model.predictions, model.measured) };
    });
    weightedResults.sort((a, b) => b.weight - a.weight);
    const bestModel = weightedResults[0].model;

    // 2. Use best model for residual analysis
    const best = input.models.find(m => m.model_name === bestModel)!;
    const residuals = best.predictions.map((p, i) => p - best.measured[i]);
    const residualAnalysis = this.analyzeResiduals(residuals);

    // 3. Learn correction factors
    const correctionFactors: CorrectionFactor[] = [];
    if (best.predictions.length >= minObs) {
      const cf = this.learnCorrection(best.predictions, best.measured, algo, mat, qty);
      correctionFactors.push(cf);
    } else {
      warnings.push(
        `Insufficient observations (${best.predictions.length} < ${minObs}) — skipping correction learning`
      );
    }

    // Merge with existing corrections if provided
    const allCorrections = [...(input.existing_corrections ?? []), ...correctionFactors];

    // 4. Measure improvement
    const beforeRmse = rmse(best.predictions, best.measured);
    const correctedPredictions = best.predictions.map(p =>
      this.applyCorrections(p, allCorrections, algo, mat, qty)
    );
    const afterRmse = rmse(correctedPredictions, best.measured);
    const improvementPct = beforeRmse > 0 ? ((beforeRmse - afterRmse) / beforeRmse) * 100 : 0;

    // 5. Generate recommendations
    if (residualAnalysis.has_bias) {
      const dir = residualAnalysis.bias_value > 0 ? "over" : "under";
      const mag = Math.abs(residualAnalysis.bias_value).toFixed(3);
      recommendations.push(
        `Systematic bias detected (${dir}prediction of ${mag}). Apply additive correction.`
      );
    }
    if (residualAnalysis.has_trend) {
      const slope = residualAnalysis.trend_slope.toFixed(4);
      recommendations.push(
        `Trend in residuals (slope=${slope}). Model may need time-varying or range-dependent correction.`
      );
    }
    if (residualAnalysis.has_heteroscedasticity) {
      recommendations.push(
        "Heteroscedasticity detected — variance changes with magnitude. Consider log-transform."
      );
    }
    if (residualAnalysis.normality_p_value < 0.05) {
      recommendations.push(
        "Residuals are non-normal — robust or non-parametric methods may improve predictions."
      );
    }
    if (weightedResults.length > 1) {
      const topTwo = weightedResults.slice(0, 2);
      if (topTwo[0].weight < 0.6) {
        const w = topTwo[0].weight.toFixed(3);
        recommendations.push(
          `No single dominant model (best weight=${w}). Consider BMA ensemble prediction.`
        );
      }
    }
    if (improvementPct > 1) {
      recommendations.push(
        `Correction factors reduced RMSE by ${improvementPct.toFixed(1)}%. Apply in production.`
      );
    }

    // Build formula string
    const cf0 = correctionFactors[0];
    const cfDesc = cf0
      ? `corrected = ${cf0.factor.toFixed(4)} * pred + (${cf0.bias_offset.toFixed(4)})`
      : "corrected = prediction (no correction learned)";
    const formula = [
      "BIC_i = n*ln(RSS_i/n) + k_i*ln(n)",
      "W_i = exp(-BIC_i/2) / sum(exp(-BIC_j/2))",
      cfDesc,
    ].join("; ");

    return {
      model_weights: weightedResults,
      best_model: bestModel,
      correction_factors: correctionFactors,
      residual_analysis: residualAnalysis,
      improvement: {
        before_rmse: beforeRmse,
        after_rmse: afterRmse,
        improvement_pct: improvementPct,
      },
      recommendations,
      warnings,
      formula,
    };
  }

  /**
   * Bayesian Model Averaging via BIC weights.
   * BIC = n·ln(RSS/n) + k·ln(n)
   * Weight_i = exp(-BIC_i / 2) / Σ exp(-BIC_j / 2)
   */
  bayesianModelAveraging(
    models: ModelResult[]
  ): Array<{ model: string; weight: number; bic: number }> {
    const bics: Array<{ model: string; bic: number }> = [];

    for (const m of models) {
      const n = m.predictions.length;
      if (n === 0) {
        bics.push({ model: m.model_name, bic: Infinity });
        continue;
      }
      const rss = m.predictions.reduce((s, p, i) => s + (p - m.measured[i]) ** 2, 0);
      const rssPerN = rss / n;
      const logLik = rssPerN > 0 ? n * Math.log(rssPerN) : -Infinity;
      const bic = logLik + m.n_parameters * Math.log(n);
      bics.push({ model: m.model_name, bic });
    }

    // Compute weights with numerical stability (subtract min BIC)
    const finiteBics = bics.filter(b => isFinite(b.bic));
    if (finiteBics.length === 0) {
      return bics.map(b => ({ model: b.model, weight: 1 / bics.length, bic: b.bic }));
    }
    const minBic = Math.min(...finiteBics.map(b => b.bic));
    const expTerms = bics.map(b => isFinite(b.bic) ? Math.exp(-(b.bic - minBic) / 2) : 0);
    const sumExp = expTerms.reduce((s, v) => s + v, 0);

    return bics.map((b, i) => ({
      model: b.model,
      weight: sumExp > 0 ? expTerms[i] / sumExp : 1 / bics.length,
      bic: b.bic,
    }));
  }

  /**
   * Analyze residuals for systematic patterns: bias, linear trend,
   * heteroscedasticity (Breusch-Pagan style), and normality.
   */
  analyzeResiduals(residuals: number[]): ImprovementResult["residual_analysis"] {
    if (residuals.length === 0) {
      return {
        has_bias: false, bias_value: 0, has_trend: false,
        trend_slope: 0, has_heteroscedasticity: false, normality_p_value: 1,
      };
    }

    // Bias: t-test on mean residual
    const m = mean(residuals);
    const sd = stddev(residuals);
    const n = residuals.length;
    const tStat = sd > 0 && n > 1 ? Math.abs(m) / (sd / Math.sqrt(n)) : 0;
    const hasBias = tStat > 2.0 && n >= 5; // ~95% significance

    // Trend: regress residuals on observation index
    const indices = residuals.map((_, i) => i);
    const reg = linearRegression(indices, residuals);
    const hasTrend = reg.r_squared > 0.15 && n >= 5;

    // Heteroscedasticity: compare variance of first half vs second half
    const half = Math.floor(n / 2);
    let hasHetero = false;
    if (half >= 4) {
      // Sort by absolute residual magnitude (proxy for Breusch-Pagan)
      const sorted = [...residuals].sort((a, b) => Math.abs(a) - Math.abs(b));
      const varLow = stddev(sorted.slice(0, half)) ** 2;
      const varHigh = stddev(sorted.slice(half)) ** 2;
      const ratio = varLow > 0 ? varHigh / varLow : 1;
      hasHetero = ratio > 3.0 || ratio < 1 / 3.0;
    }

    // Normality
    const pValue = approxNormalityPValue(residuals);

    return {
      has_bias: hasBias,
      bias_value: m,
      has_trend: hasTrend,
      trend_slope: reg.slope,
      has_heteroscedasticity: hasHetero,
      normality_p_value: pValue,
    };
  }

  /**
   * Learn a multiplicative + additive correction factor from predicted vs measured.
   * Uses least-squares: measured ≈ factor × predicted + bias_offset
   */
  learnCorrection(
    predicted: number[],
    measured: number[],
    algorithm: string,
    material: string,
    quantity: string
  ): CorrectionFactor {
    const n = Math.min(predicted.length, measured.length);
    if (n === 0) {
      return {
        algorithm, material, quantity, factor: 1,
        bias_offset: 0, confidence: 0, n_observations: 0, description: "No data",
      };
    }

    // Linear regression: measured = factor * predicted + bias_offset
    const reg = linearRegression(predicted.slice(0, n), measured.slice(0, n));
    const factor = reg.slope;
    const biasOffset = reg.intercept;

    // Confidence based on R² and sample size
    const sizeConf = Math.min(1, n / 50);
    const confidence = Math.min(1, reg.r_squared * 0.7 + sizeConf * 0.3);

    // Compute error percentage for description
    const meanMeasured = mean(measured.slice(0, n));
    const meanPredicted = mean(predicted.slice(0, n));
    const errPct = meanMeasured !== 0
      ? ((meanPredicted - meanMeasured) / meanMeasured) * 100
      : 0;
    const dir = errPct > 0 ? "overpredicts" : "underpredicts";
    const desc = `${algorithm} ${dir} ${quantity} by ${Math.abs(errPct).toFixed(1)}% in ${material}`;

    return {
      algorithm, material, quantity, factor,
      bias_offset: biasOffset, confidence, n_observations: n, description: desc,
    };
  }

  /**
   * Apply matching correction factors to a predicted value.
   * Filters by algorithm/material/quantity, then uses the highest-confidence match.
   */
  applyCorrections(
    value: number,
    corrections: CorrectionFactor[],
    algorithm: string,
    material: string,
    quantity: string
  ): number {
    const matching = corrections.filter(c =>
      c.algorithm === algorithm && c.material === material && c.quantity === quantity
    );
    if (matching.length === 0) return value;

    // Use highest-confidence correction
    matching.sort((a, b) => b.confidence - a.confidence);
    const best = matching[0];
    return best.factor * value + best.bias_offset;
  }
}

// ─── Singleton Export ───────────────────────────────────

/** Singleton instance of ContinuousImprovementEngine. */
export const continuousImprovementEngine = new ContinuousImprovementEngine();
