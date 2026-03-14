/**
 * TimeSeriesCompletionEngine — Advanced Time Series Methods
 *
 * Fills remaining time series gaps in PRISM:
 *   - Holt-Winters (triple exponential smoothing, additive/multiplicative)
 *   - ARIMAX (ARIMA with exogenous regressors)
 *   - Change Point Detection (PELT, binary segmentation, CUSUM)
 *   - Regime Switching (Markov two-state)
 *   - Exponential Smoothing (simple, double, damped)
 *   - Seasonal Decomposition (STL-style trend + seasonal + residual)
 *
 * @module engines/TimeSeriesCompletionEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HoltWintersInput {
  data: number[];
  seasonal_period: number;
  method?: "additive" | "multiplicative";
  alpha?: number;
  beta?: number;
  gamma?: number;
  auto_optimize?: boolean;
  forecast_horizon?: number;
}

export interface HoltWintersResult {
  forecast: number[];
  fitted: number[];
  alpha: number;
  beta: number;
  gamma: number;
  level: number[];
  trend: number[];
  seasonal: number[];
  mse: number;
  mae: number;
  mape: number;
  residuals: number[];
}

export interface ArimaxInput {
  y: number[];
  exog?: number[][];
  order: [number, number, number];
  seasonal_order?: [number, number, number, number];
  forecast_horizon?: number;
  exog_future?: number[][];
}

export interface ArimaxResult {
  forecast: number[];
  fitted: number[];
  ar_coefficients: number[];
  ma_coefficients: number[];
  exog_coefficients?: number[];
  aic: number;
  bic: number;
  residuals: number[];
  forecast_ci_95: [number[], number[]];
}

export interface ChangePointInput {
  data: number[];
  method: "pelt" | "binary_segmentation" | "cusum_sequential";
  penalty?: number | "bic";
  min_segment_length?: number;
  max_changepoints?: number;
}

export interface ChangePointResult {
  changepoints: number[];
  n_changepoints: number;
  segment_means: number[];
  segment_stds: number[];
  confidence: number[];
  cost: number;
  penalty_used: number;
}

export interface RegimeSwitchingInput {
  data: number[];
  n_regimes?: number;
  max_iter?: number;
}

export interface RegimeSwitchingResult {
  regime_means: number[];
  regime_stds: number[];
  transition_matrix: number[][];
  smoothed_probabilities: number[][];
  current_regime: number;
  regime_labels: number[];
  expected_duration: number[];
}

export interface ExponentialSmoothingInput {
  data: number[];
  method: "simple" | "double" | "damped";
  alpha?: number;
  beta?: number;
  phi?: number;
  forecast_horizon?: number;
}

export interface ExponentialSmoothingResult {
  forecast: number[];
  fitted: number[];
  alpha: number;
  beta?: number;
  phi?: number;
  mse: number;
  residuals: number[];
}

export interface SeasonalDecompositionInput {
  data: number[];
  period: number;
  method?: "additive" | "multiplicative";
}

export interface SeasonalDecompositionResult {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonal_strength: number;
  trend_strength: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

function stddev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function mse(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += (actual[i] - predicted[i]) ** 2;
  return s / n;
}

function mae(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(actual[i] - predicted[i]);
  return s / n;
}

function mape(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  let s = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      s += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (s / count) * 100 : 0;
}

function difference(y: number[], d: number): number[] {
  let result = [...y];
  for (let i = 0; i < d; i++) {
    const tmp: number[] = [];
    for (let j = 1; j < result.length; j++) {
      tmp.push(result[j] - result[j - 1]);
    }
    result = tmp;
  }
  return result;
}

function undifference(diffed: number[], original: number[], d: number): number[] {
  if (d === 0) return diffed;
  // Reconstruct from differences
  const result: number[] = [];
  let prev = original[d - 1];
  for (const v of diffed) {
    const val = v + prev;
    result.push(val);
    prev = val;
  }
  if (d > 1) {
    return undifference(result, original, d - 1);
  }
  return result;
}

// ============================================================================
// ENGINE
// ============================================================================

export class TimeSeriesCompletionEngine {
  /**
   * Holt-Winters triple exponential smoothing.
   * Supports additive and multiplicative seasonality with auto-optimization.
   */
  holtWinters(params: HoltWintersInput): HoltWintersResult {
    log.info("TimeSeriesCompletionEngine.holtWinters called");
    const {
      data,
      seasonal_period: p,
      method = "additive",
      forecast_horizon = p,
      auto_optimize = true,
    } = params;

    if (data.length < 2 * p) {
      throw new Error(`Need at least 2 full seasons of data (${2 * p} points), got ${data.length}`);
    }

    let bestAlpha = params.alpha ?? 0.3;
    let bestBeta = params.beta ?? 0.1;
    let bestGamma = params.gamma ?? 0.1;

    const runHW = (alpha: number, beta: number, gamma: number) => {
      const n = data.length;
      const level: number[] = new Array(n);
      const trend: number[] = new Array(n);
      const seasonal: number[] = new Array(n);
      const fitted: number[] = new Array(n);

      // Initialize level: mean of first season
      const firstSeasonMean = mean(data.slice(0, p));
      level[0] = firstSeasonMean;

      // Initialize trend: average difference between first two seasons
      let trendInit = 0;
      for (let i = 0; i < p; i++) {
        trendInit += (data[p + i] - data[i]) / p;
      }
      trend[0] = trendInit / p;

      // Initialize seasonal components from first season
      for (let i = 0; i < p; i++) {
        if (method === "additive") {
          seasonal[i] = data[i] - firstSeasonMean;
        } else {
          seasonal[i] = firstSeasonMean !== 0 ? data[i] / firstSeasonMean : 1;
        }
      }

      // First fitted value
      if (method === "additive") {
        fitted[0] = level[0] + trend[0] + seasonal[0];
      } else {
        fitted[0] = (level[0] + trend[0]) * seasonal[0];
      }

      // Iterate
      for (let t = 1; t < n; t++) {
        const sPrev = t >= p ? seasonal[t - p] : seasonal[t % p];

        if (method === "additive") {
          level[t] = alpha * (data[t] - sPrev) + (1 - alpha) * (level[t - 1] + trend[t - 1]);
          trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1];
          seasonal[t] = gamma * (data[t] - level[t]) + (1 - gamma) * sPrev;
          fitted[t] = level[t] + trend[t] + seasonal[t];
        } else {
          const sPrevSafe = sPrev !== 0 ? sPrev : 1;
          level[t] = alpha * (data[t] / sPrevSafe) + (1 - alpha) * (level[t - 1] + trend[t - 1]);
          trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1];
          seasonal[t] = gamma * (level[t] !== 0 ? data[t] / level[t] : 1) + (1 - gamma) * sPrevSafe;
          fitted[t] = (level[t] + trend[t]) * seasonal[t];
        }
      }

      // Forecast
      const forecast: number[] = [];
      const lastLevel = level[n - 1];
      const lastTrend = trend[n - 1];
      for (let h = 1; h <= forecast_horizon; h++) {
        const sIdx = n - p + ((h - 1) % p);
        const s = sIdx >= 0 && sIdx < seasonal.length ? seasonal[sIdx] : 0;
        if (method === "additive") {
          forecast.push(lastLevel + h * lastTrend + s);
        } else {
          forecast.push((lastLevel + h * lastTrend) * (s || 1));
        }
      }

      const residuals = data.map((v, i) => v - fitted[i]);
      const mseVal = mse(data, fitted);

      return { forecast, fitted, level, trend, seasonal, residuals, mseVal, alpha, beta, gamma };
    };

    // Auto-optimize via grid search
    if (auto_optimize && params.alpha === undefined) {
      let bestMSE = Infinity;
      const steps = [0.1, 0.3, 0.5, 0.7, 0.9];
      for (const a of steps) {
        for (const b of steps) {
          for (const g of steps) {
            try {
              const r = runHW(a, b, g);
              if (r.mseVal < bestMSE && isFinite(r.mseVal)) {
                bestMSE = r.mseVal;
                bestAlpha = a;
                bestBeta = b;
                bestGamma = g;
              }
            } catch {
              // skip invalid combos
            }
          }
        }
      }
    }

    const result = runHW(bestAlpha, bestBeta, bestGamma);

    return {
      forecast: result.forecast,
      fitted: result.fitted,
      alpha: result.alpha,
      beta: result.beta,
      gamma: result.gamma,
      level: result.level,
      trend: result.trend,
      seasonal: result.seasonal,
      mse: result.mseVal,
      mae: mae(data, result.fitted),
      mape: mape(data, result.fitted),
      residuals: result.residuals,
    };
  }

  /**
   * ARIMAX — ARIMA with exogenous variables.
   * Fits AR(p) + MA(q) model on d-differenced series with optional exogenous regressors.
   */
  arimaxForecast(params: ArimaxInput): ArimaxResult {
    log.info("TimeSeriesCompletionEngine.arimaxForecast called");
    const {
      y,
      exog,
      order,
      forecast_horizon = 10,
      exog_future,
    } = params;

    const [p, d, q] = order;
    const n = y.length;

    // Difference the series d times
    const yDiff = difference(y, d);
    const nDiff = yDiff.length;

    // Fit exogenous coefficients via OLS if provided
    let exogCoeffs: number[] | undefined;
    let yResidFromExog = [...yDiff];

    if (exog && exog.length > 0) {
      const nExog = exog[0].length;
      exogCoeffs = new Array(nExog).fill(0);
      // OLS via normal equations: β = (X'X)^(-1) X'y
      const exogSlice = exog.slice(d);
      const m = Math.min(nDiff, exogSlice.length);
      // Build X'X and X'y
      const XtX: number[][] = Array.from({ length: nExog }, () => new Array(nExog).fill(0));
      const XtY: number[] = new Array(nExog).fill(0);
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < nExog; j++) {
          XtY[j] += exogSlice[i][j] * yDiff[i];
          for (let k = 0; k < nExog; k++) {
            XtX[j][k] += exogSlice[i][j] * exogSlice[i][k];
          }
        }
      }
      // Add regularization for stability
      for (let j = 0; j < nExog; j++) XtX[j][j] += 1e-8;
      // Solve via Gauss elimination
      const A = XtX.map(r => [...r]);
      const b = [...XtY];
      for (let k = 0; k < nExog; k++) {
        const pivot = A[k][k];
        if (Math.abs(pivot) < 1e-15) continue;
        for (let i = k + 1; i < nExog; i++) {
          const factor = A[i][k] / pivot;
          for (let j = k; j < nExog; j++) A[i][j] -= factor * A[k][j];
          b[i] -= factor * b[k];
        }
      }
      for (let k = nExog - 1; k >= 0; k--) {
        let sum = b[k];
        for (let j = k + 1; j < nExog; j++) sum -= A[k][j] * exogCoeffs[j];
        exogCoeffs[k] = A[k][k] !== 0 ? sum / A[k][k] : 0;
      }

      // Remove exogenous effect
      yResidFromExog = yDiff.map((v, i) => {
        if (i < exogSlice.length) {
          let exogEffect = 0;
          for (let j = 0; j < nExog; j++) exogEffect += exogCoeffs![j] * exogSlice[i][j];
          return v - exogEffect;
        }
        return v;
      });
    }

    // Fit AR coefficients via Yule-Walker
    const arCoeffs = new Array(p).fill(0);
    if (p > 0 && nDiff > p) {
      // Autocorrelation
      const yMean = mean(yResidFromExog);
      const yCentered = yResidFromExog.map(v => v - yMean);
      const autoCorr: number[] = [];
      const c0 = yCentered.reduce((s, v) => s + v * v, 0) / nDiff;
      for (let lag = 0; lag <= p; lag++) {
        let sum = 0;
        for (let i = lag; i < nDiff; i++) sum += yCentered[i] * yCentered[i - lag];
        autoCorr.push(sum / nDiff / (c0 || 1));
      }

      // Levinson-Durbin
      const phi: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0));
      phi[1][1] = autoCorr[1];
      let v = c0 * (1 - phi[1][1] * phi[1][1]);

      for (let k = 2; k <= p; k++) {
        let num = autoCorr[k];
        for (let j = 1; j < k; j++) num -= phi[k - 1][j] * autoCorr[k - j];
        phi[k][k] = num / (v || 1);
        for (let j = 1; j < k; j++) {
          phi[k][j] = phi[k - 1][j] - phi[k][k] * phi[k - 1][k - j];
        }
        v = v * (1 - phi[k][k] * phi[k][k]);
      }

      for (let j = 0; j < p; j++) arCoeffs[j] = phi[p][j + 1];
    }

    // Compute AR residuals for MA estimation
    const arResiduals: number[] = new Array(nDiff).fill(0);
    const yMeanDiff = mean(yResidFromExog);
    for (let t = 0; t < nDiff; t++) {
      let arPred = yMeanDiff;
      for (let j = 0; j < p; j++) {
        if (t - j - 1 >= 0) {
          arPred += arCoeffs[j] * (yResidFromExog[t - j - 1] - yMeanDiff);
        }
      }
      arResiduals[t] = yResidFromExog[t] - arPred;
    }

    // Fit MA coefficients from residual autocorrelation
    const maCoeffs = new Array(q).fill(0);
    if (q > 0 && nDiff > q) {
      const resVar = variance(arResiduals);
      for (let k = 0; k < q; k++) {
        let sum = 0;
        for (let t = k + 1; t < nDiff; t++) {
          sum += arResiduals[t] * arResiduals[t - k - 1];
        }
        maCoeffs[k] = resVar !== 0 ? sum / (nDiff * resVar) : 0;
        // Clamp for stability
        maCoeffs[k] = Math.max(-0.99, Math.min(0.99, maCoeffs[k]));
      }
    }

    // Compute fitted values on differenced series
    const fittedDiff: number[] = new Array(nDiff).fill(0);
    const residuals: number[] = new Array(nDiff).fill(0);
    for (let t = 0; t < nDiff; t++) {
      let pred = yMeanDiff;
      for (let j = 0; j < p; j++) {
        if (t - j - 1 >= 0) pred += arCoeffs[j] * (yResidFromExog[t - j - 1] - yMeanDiff);
      }
      for (let j = 0; j < q; j++) {
        if (t - j - 1 >= 0) pred += maCoeffs[j] * residuals[t - j - 1];
      }
      // Add back exogenous
      if (exogCoeffs && exog) {
        const exogSlice = exog.slice(d);
        if (t < exogSlice.length) {
          for (let j = 0; j < exogCoeffs.length; j++) {
            pred += exogCoeffs[j] * exogSlice[t][j];
          }
        }
      }
      fittedDiff[t] = pred;
      residuals[t] = yDiff[t] - pred;
    }

    // Undifference fitted values
    const fitted = undifference(fittedDiff, y, d);
    // Pad fitted to match original length
    const fittedFull = new Array(d).fill(y[0]).concat(fitted).slice(0, n);

    // Forecast
    const forecast: number[] = [];
    const extendedDiff = [...yDiff];
    const extendedResid = [...residuals];

    for (let h = 0; h < forecast_horizon; h++) {
      let pred = yMeanDiff;
      const tPos = nDiff + h;
      for (let j = 0; j < p; j++) {
        const idx = tPos - j - 1;
        const val = idx < extendedDiff.length ? extendedDiff[idx] : yMeanDiff;
        pred += arCoeffs[j] * (val - yMeanDiff);
      }
      for (let j = 0; j < q; j++) {
        const idx = tPos - j - 1;
        if (idx >= 0 && idx < extendedResid.length) {
          pred += maCoeffs[j] * extendedResid[idx];
        }
      }
      // Add exogenous for future
      if (exogCoeffs && exog_future && h < exog_future.length) {
        for (let j = 0; j < exogCoeffs.length; j++) {
          pred += exogCoeffs[j] * exog_future[h][j];
        }
      }
      extendedDiff.push(pred);
      extendedResid.push(0); // assume zero future residuals
      forecast.push(pred);
    }

    // Undifference forecast
    const forecastUndiff = undifference(forecast, [...y, ...new Array(forecast_horizon).fill(0)], d);

    // For d>0 fix: anchor forecast to last value
    const forecastFinal: number[] = [];
    if (d > 0) {
      let prev = y[n - 1];
      for (const f of forecast) {
        prev = prev + f;
        forecastFinal.push(prev);
      }
    } else {
      forecastFinal.push(...forecastUndiff.slice(0, forecast_horizon));
    }

    // Confidence intervals (approximate: ±1.96 × σ × √h)
    const residStd = stddev(residuals);
    const ciLower: number[] = [];
    const ciUpper: number[] = [];
    for (let h = 1; h <= forecast_horizon; h++) {
      const width = 1.96 * residStd * Math.sqrt(h);
      const fc = forecastFinal[h - 1] ?? forecastUndiff[h - 1] ?? yMeanDiff;
      ciLower.push(fc - width);
      ciUpper.push(fc + width);
    }

    // AIC / BIC
    const nParams = p + q + (exogCoeffs ? exogCoeffs.length : 0) + 1;
    const residVar = variance(residuals);
    const logLik = -0.5 * nDiff * (Math.log(2 * Math.PI) + Math.log(residVar + 1e-15) + 1);
    const aic = -2 * logLik + 2 * nParams;
    const bic = -2 * logLik + Math.log(nDiff) * nParams;

    return {
      forecast: forecastFinal.length > 0 ? forecastFinal : forecastUndiff.slice(0, forecast_horizon),
      fitted: fittedFull,
      ar_coefficients: arCoeffs,
      ma_coefficients: maCoeffs,
      exog_coefficients: exogCoeffs,
      aic,
      bic,
      residuals,
      forecast_ci_95: [ciLower, ciUpper],
    };
  }

  /**
   * Change Point Detection — PELT, binary segmentation, or sequential CUSUM.
   */
  changePointDetection(params: ChangePointInput): ChangePointResult {
    log.info("TimeSeriesCompletionEngine.changePointDetection called");
    const {
      data,
      method,
      min_segment_length = 5,
      max_changepoints,
    } = params;

    const n = data.length;

    // BIC penalty as default
    const penaltyVal = typeof params.penalty === "number"
      ? params.penalty
      : Math.log(n);

    // Cost function: normal distribution cost = n * log(var)
    const segmentCost = (start: number, end: number): number => {
      const seg = data.slice(start, end);
      if (seg.length < 2) return 0;
      const v = variance(seg);
      return seg.length * Math.log(Math.max(v, 1e-15));
    };

    let changepoints: number[] = [];

    if (method === "pelt") {
      // PELT algorithm
      const F: number[] = new Array(n + 1).fill(0);
      const cp: number[] = new Array(n + 1).fill(0);
      F[0] = -penaltyVal;

      for (let t = min_segment_length; t <= n; t++) {
        let bestCost = Infinity;
        let bestS = 0;
        // Check all valid starting points
        for (let s = 0; s <= t - min_segment_length; s++) {
          const cost = F[s] + segmentCost(s, t) + penaltyVal;
          if (cost < bestCost) {
            bestCost = cost;
            bestS = s;
          }
        }
        F[t] = bestCost;
        cp[t] = bestS;
      }

      // Backtrack
      let idx = n;
      while (idx > 0) {
        const prev = cp[idx];
        if (prev > 0) changepoints.push(prev);
        idx = prev;
      }
      changepoints.sort((a, b) => a - b);
    } else if (method === "binary_segmentation") {
      // Binary segmentation
      const binseg = (start: number, end: number, cps: number[]) => {
        if (end - start < 2 * min_segment_length) return;
        if (max_changepoints !== undefined && cps.length >= max_changepoints) return;

        let bestGain = -Infinity;
        let bestK = -1;
        const totalCost = segmentCost(start, end);

        for (let k = start + min_segment_length; k <= end - min_segment_length; k++) {
          const gain = totalCost - segmentCost(start, k) - segmentCost(k, end);
          if (gain > bestGain) {
            bestGain = gain;
            bestK = k;
          }
        }

        if (bestGain > penaltyVal && bestK > 0) {
          cps.push(bestK);
          binseg(start, bestK, cps);
          binseg(bestK, end, cps);
        }
      };
      binseg(0, n, changepoints);
      changepoints.sort((a, b) => a - b);
    } else {
      // cusum_sequential
      const cumsum: number[] = [0];
      const dataMean = mean(data);
      for (let i = 0; i < n; i++) {
        cumsum.push(cumsum[i] + (data[i] - dataMean));
      }

      // Find peaks in |CUSUM|
      const absCusum = cumsum.map(Math.abs);
      const threshold = penaltyVal * stddev(data);

      for (let i = min_segment_length; i < n - min_segment_length; i++) {
        if (absCusum[i] > threshold) {
          // Local maximum check
          if (absCusum[i] >= absCusum[i - 1] && absCusum[i] >= absCusum[i + 1]) {
            // Check minimum distance from existing changepoints
            const tooClose = changepoints.some(cp => Math.abs(cp - i) < min_segment_length);
            if (!tooClose) {
              changepoints.push(i);
            }
          }
        }
      }
      if (max_changepoints !== undefined) {
        changepoints = changepoints.slice(0, max_changepoints);
      }
    }

    // Limit by max_changepoints
    if (max_changepoints !== undefined && changepoints.length > max_changepoints) {
      changepoints = changepoints.slice(0, max_changepoints);
    }

    // Compute segment statistics
    const boundaries = [0, ...changepoints, n];
    const segmentMeans: number[] = [];
    const segmentStds: number[] = [];
    const confidence: number[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const seg = data.slice(boundaries[i], boundaries[i + 1]);
      segmentMeans.push(mean(seg));
      segmentStds.push(stddev(seg));
    }

    // Confidence based on mean difference between adjacent segments
    for (let i = 0; i < changepoints.length; i++) {
      const leftSeg = data.slice(boundaries[i], boundaries[i + 1]);
      const rightSeg = data.slice(boundaries[i + 1], boundaries[i + 2]);
      const meanDiff = Math.abs(mean(leftSeg) - mean(rightSeg));
      const pooledStd = Math.sqrt(
        (variance(leftSeg) * leftSeg.length + variance(rightSeg) * rightSeg.length) /
        (leftSeg.length + rightSeg.length)
      );
      // Effect size as confidence proxy (clamped to [0, 1])
      const effectSize = pooledStd > 0 ? meanDiff / pooledStd : 1;
      confidence.push(Math.min(1, effectSize / 3));
    }

    // Total cost
    let totalCost = 0;
    for (let i = 0; i < boundaries.length - 1; i++) {
      totalCost += segmentCost(boundaries[i], boundaries[i + 1]);
    }

    return {
      changepoints,
      n_changepoints: changepoints.length,
      segment_means: segmentMeans,
      segment_stds: segmentStds,
      confidence,
      cost: totalCost,
      penalty_used: penaltyVal,
    };
  }

  /**
   * Markov Regime Switching model via EM algorithm.
   */
  regimeSwitching(params: RegimeSwitchingInput): RegimeSwitchingResult {
    log.info("TimeSeriesCompletionEngine.regimeSwitching called");
    const { data, n_regimes = 2, max_iter = 100 } = params;
    const n = data.length;
    const K = n_regimes;

    // Initialize with K-means style
    const sorted = [...data].sort((a, b) => a - b);
    const regimeMeans = Array.from({ length: K }, (_, i) =>
      sorted[Math.floor((i + 0.5) * n / K)]
    );
    const regimeStds = new Array(K).fill(stddev(data) / K);

    // Initialize transition matrix: high self-transition probability
    const transMatrix: number[][] = Array.from({ length: K }, (_, i) =>
      Array.from({ length: K }, (_, j) => (i === j ? 0.9 : 0.1 / (K - 1)))
    );

    // EM iterations
    // Forward-backward (smoothed probabilities)
    let smoothedProbs: number[][] = Array.from({ length: n }, () => new Array(K).fill(1 / K));

    for (let iter = 0; iter < max_iter; iter++) {
      // E-step: forward-backward
      const alpha: number[][] = Array.from({ length: n }, () => new Array(K).fill(0));
      const beta: number[][] = Array.from({ length: n }, () => new Array(K).fill(0));

      // Emission probabilities
      const emissionProb = (t: number, k: number): number => {
        const std = Math.max(regimeStds[k], 1e-10);
        const z = (data[t] - regimeMeans[k]) / std;
        return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
      };

      // Forward pass
      for (let k = 0; k < K; k++) {
        alpha[0][k] = (1 / K) * emissionProb(0, k);
      }
      let scale = alpha[0].reduce((s, v) => s + v, 0) || 1;
      for (let k = 0; k < K; k++) alpha[0][k] /= scale;

      for (let t = 1; t < n; t++) {
        for (let j = 0; j < K; j++) {
          let sum = 0;
          for (let i = 0; i < K; i++) sum += alpha[t - 1][i] * transMatrix[i][j];
          alpha[t][j] = sum * emissionProb(t, j);
        }
        scale = alpha[t].reduce((s, v) => s + v, 0) || 1;
        for (let k = 0; k < K; k++) alpha[t][k] /= scale;
      }

      // Backward pass
      for (let k = 0; k < K; k++) beta[n - 1][k] = 1;
      for (let t = n - 2; t >= 0; t--) {
        for (let i = 0; i < K; i++) {
          let sum = 0;
          for (let j = 0; j < K; j++) {
            sum += transMatrix[i][j] * emissionProb(t + 1, j) * beta[t + 1][j];
          }
          beta[t][i] = sum;
        }
        scale = beta[t].reduce((s, v) => s + v, 0) || 1;
        for (let k = 0; k < K; k++) beta[t][k] /= scale;
      }

      // Smoothed probabilities
      smoothedProbs = Array.from({ length: n }, (_, t) => {
        const row = new Array(K);
        let total = 0;
        for (let k = 0; k < K; k++) {
          row[k] = alpha[t][k] * beta[t][k];
          total += row[k];
        }
        for (let k = 0; k < K; k++) row[k] /= (total || 1);
        return row;
      });

      // M-step: update parameters
      for (let k = 0; k < K; k++) {
        let wSum = 0;
        let wMean = 0;
        for (let t = 0; t < n; t++) {
          wSum += smoothedProbs[t][k];
          wMean += smoothedProbs[t][k] * data[t];
        }
        if (wSum > 0) {
          regimeMeans[k] = wMean / wSum;
          let wVar = 0;
          for (let t = 0; t < n; t++) {
            wVar += smoothedProbs[t][k] * (data[t] - regimeMeans[k]) ** 2;
          }
          regimeStds[k] = Math.sqrt(Math.max(wVar / wSum, 1e-10));
        }
      }

      // Update transition matrix
      for (let i = 0; i < K; i++) {
        let rowSum = 0;
        for (let j = 0; j < K; j++) {
          let tSum = 0;
          for (let t = 0; t < n - 1; t++) {
            const xi = smoothedProbs[t][i] * transMatrix[i][j] *
                       emissionProb(t + 1, j) * beta[t + 1][j];
            tSum += xi;
          }
          transMatrix[i][j] = tSum;
          rowSum += tSum;
        }
        for (let j = 0; j < K; j++) transMatrix[i][j] /= (rowSum || 1);
      }
    }

    // Regime labels (most probable regime at each time)
    const regimeLabels = smoothedProbs.map(row => {
      let maxIdx = 0;
      for (let k = 1; k < K; k++) {
        if (row[k] > row[maxIdx]) maxIdx = k;
      }
      return maxIdx;
    });

    const currentRegime = regimeLabels[n - 1];

    // Expected durations: 1 / (1 - p_ii)
    const expectedDuration = transMatrix.map((row, i) =>
      1 / Math.max(1 - row[i], 1e-10)
    );

    return {
      regime_means: regimeMeans,
      regime_stds: regimeStds,
      transition_matrix: transMatrix,
      smoothed_probabilities: smoothedProbs,
      current_regime: currentRegime,
      regime_labels: regimeLabels,
      expected_duration: expectedDuration,
    };
  }

  /**
   * Exponential Smoothing — simple, double, and damped trend.
   */
  exponentialSmoothing(params: ExponentialSmoothingInput): ExponentialSmoothingResult {
    log.info("TimeSeriesCompletionEngine.exponentialSmoothing called");
    const {
      data,
      method,
      alpha = 0.3,
      beta = 0.1,
      phi = 0.98,
      forecast_horizon = 10,
    } = params;

    const n = data.length;
    const fitted: number[] = new Array(n);
    const level: number[] = new Array(n);
    const trend: number[] = new Array(n);

    level[0] = data[0];
    trend[0] = data.length > 1 ? data[1] - data[0] : 0;
    fitted[0] = data[0];

    if (method === "simple") {
      for (let t = 1; t < n; t++) {
        level[t] = alpha * data[t] + (1 - alpha) * level[t - 1];
        fitted[t] = level[t];
      }
      const forecast = new Array(forecast_horizon).fill(level[n - 1]);
      const residuals = data.map((v, i) => v - fitted[i]);
      return {
        forecast,
        fitted,
        alpha,
        mse: mse(data, fitted),
        residuals,
      };
    }

    if (method === "double") {
      for (let t = 1; t < n; t++) {
        level[t] = alpha * data[t] + (1 - alpha) * (level[t - 1] + trend[t - 1]);
        trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1];
        fitted[t] = level[t] + trend[t];
      }
      const lastL = level[n - 1];
      const lastB = trend[n - 1];
      const forecast = Array.from({ length: forecast_horizon }, (_, h) => lastL + (h + 1) * lastB);
      const residuals = data.map((v, i) => v - fitted[i]);
      return {
        forecast,
        fitted,
        alpha,
        beta,
        mse: mse(data, fitted),
        residuals,
      };
    }

    // damped
    for (let t = 1; t < n; t++) {
      level[t] = alpha * data[t] + (1 - alpha) * (level[t - 1] + phi * trend[t - 1]);
      trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * phi * trend[t - 1];
      fitted[t] = level[t] + phi * trend[t];
    }
    const lastL = level[n - 1];
    const lastB = trend[n - 1];
    const forecast: number[] = [];
    for (let h = 1; h <= forecast_horizon; h++) {
      // Cumulative damping: phi + phi^2 + ... + phi^h = phi * (1 - phi^h) / (1 - phi)
      const dampSum = phi * (1 - Math.pow(phi, h)) / (1 - phi);
      forecast.push(lastL + dampSum * lastB);
    }
    const residuals = data.map((v, i) => v - fitted[i]);
    return {
      forecast,
      fitted,
      alpha,
      beta,
      phi,
      mse: mse(data, fitted),
      residuals,
    };
  }

  /**
   * STL-style seasonal decomposition into trend + seasonal + residual.
   */
  seasonalDecomposition(params: SeasonalDecompositionInput): SeasonalDecompositionResult {
    log.info("TimeSeriesCompletionEngine.seasonalDecomposition called");
    const { data, period, method = "additive" } = params;
    const n = data.length;

    if (n < 2 * period) {
      throw new Error(`Need at least 2 periods (${2 * period} points), got ${n}`);
    }

    // Step 1: Estimate trend via centered moving average
    const trendArr: number[] = new Array(n).fill(0);
    const halfP = Math.floor(period / 2);

    for (let i = halfP; i < n - halfP; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - halfP; j <= i + halfP; j++) {
        if (j >= 0 && j < n) {
          sum += data[j];
          count++;
        }
      }
      trendArr[i] = sum / count;
    }
    // Extend edges
    for (let i = 0; i < halfP; i++) trendArr[i] = trendArr[halfP];
    for (let i = n - halfP; i < n; i++) trendArr[i] = trendArr[n - halfP - 1];

    // Step 2: Detrend
    const detrended = data.map((v, i) =>
      method === "additive" ? v - trendArr[i] : (trendArr[i] !== 0 ? v / trendArr[i] : 1)
    );

    // Step 3: Average seasonal component per position
    const seasonalPattern: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);
    for (let i = 0; i < n; i++) {
      seasonalPattern[i % period] += detrended[i];
      counts[i % period]++;
    }
    for (let i = 0; i < period; i++) {
      seasonalPattern[i] /= counts[i] || 1;
    }

    // Normalize: seasonal should sum to 0 (additive) or mean 1 (multiplicative)
    if (method === "additive") {
      const seasonalMean = mean(seasonalPattern);
      for (let i = 0; i < period; i++) seasonalPattern[i] -= seasonalMean;
    } else {
      const seasonalMean = mean(seasonalPattern);
      if (seasonalMean !== 0) {
        for (let i = 0; i < period; i++) seasonalPattern[i] /= seasonalMean;
      }
    }

    // Extend seasonal to full length
    const seasonal = data.map((_, i) => seasonalPattern[i % period]);

    // Step 4: Residual
    const residual = data.map((v, i) =>
      method === "additive" ? v - trendArr[i] - seasonal[i] : (trendArr[i] * seasonal[i] !== 0 ? v / (trendArr[i] * seasonal[i]) : 0)
    );

    // Strength measures (Hyndman-Athanasopoulos)
    const residVar = variance(residual);
    const trendPlusResid = method === "additive"
      ? data.map((v, i) => v - seasonal[i])
      : data.map((v, i) => seasonal[i] !== 0 ? v / seasonal[i] : v);
    const seasonPlusResid = method === "additive"
      ? data.map((v, i) => v - trendArr[i])
      : data.map((v, i) => trendArr[i] !== 0 ? v / trendArr[i] : v);

    const trendStrength = Math.max(0, 1 - residVar / (variance(trendPlusResid) || 1));
    const seasonalStrength = Math.max(0, 1 - residVar / (variance(seasonPlusResid) || 1));

    return {
      trend: trendArr,
      seasonal,
      residual,
      seasonal_strength: seasonalStrength,
      trend_strength: trendStrength,
    };
  }
}

export const timeSeriesCompletionEngine = new TimeSeriesCompletionEngine();
