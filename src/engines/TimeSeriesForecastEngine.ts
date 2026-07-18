// @ts-nocheck
/**
 * TimeSeriesForecastEngine — Time series forecasting and survival/nonparametric analysis
 *
 * Methods:
 *   1. ARIMA (AutoRegressive Integrated Moving Average) — Box & Jenkins 1970
 *   2. Exponential Smoothing (Holt-Winters) — Holt 1957, Winters 1960
 *   3. Kaplan-Meier Survival Estimator — Kaplan & Meier 1958
 *   4. Nonparametric Hypothesis Tests (Mann-Whitney / Kruskal-Wallis / Wilcoxon) — Mann & Whitney 1947, Kruskal & Wallis 1952, Wilcoxon 1945
 *   5. Rank Correlation (Spearman / Kendall) — Spearman 1904, Kendall 1938
 *
 * All methods use real mathematics with proper numerical algorithms.
 * Seeded PRNG (Park-Miller) included for any stochastic needs.
 */

// ─── Helper: Normal CDF (Abramowitz & Stegun approximation 26.2.17) ─────────

/**
 * Standard normal cumulative distribution function.
 * Uses Abramowitz & Stegun rational approximation (|error| < 7.5e-8).
 * @param z - standard normal variate
 * @returns P(Z <= z)
 */
function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z);
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const t = 1.0 / (1.0 + p * x);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1.0 - pdf * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);
  return sign === 1 ? cdf : 1.0 - cdf;
}

/**
 * Two-tailed p-value from z-statistic.
 */
function twoTailP(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

// ─── Helper: Park-Miller PRNG (seed-based) ──────────────────────────────────

/**
 * Park-Miller minimal standard PRNG (a=16807, m=2^31-1).
 * Returns a function yielding U(0,1) on each call.
 */
function parkMillerPRNG(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Helper: Rank computation with ties (average rank) ──────────────────────

/**
 * Compute ranks for an array, assigning the average rank to tied values.
 * @param data - array of numbers
 * @returns ranks (1-based, average rank for ties)
 */
function computeRanks(data: number[]): number[] {
  const n = data.length;
  const indexed = data.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    // Find group of ties
    while (j < n && indexed[j].value === indexed[i].value) {
      j++;
    }
    // Average rank for the tied group (ranks are 1-based)
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j;
  }
  return ranks;
}

// ─── Helper: Autocovariance ─────────────────────────────────────────────────

/**
 * Compute sample autocovariance at lag k for a zero-mean series.
 */
function autocovariance(series: number[], mean: number, lag: number): number {
  const n = series.length;
  let sum = 0;
  for (let t = 0; t < n - lag; t++) {
    sum += (series[t] - mean) * (series[t + lag] - mean);
  }
  return sum / n;
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

/** ARIMA input parameters */
export interface ARIMAInput {
  /** Time series data */
  series: number[];
  /** AR order */
  p: number;
  /** Differencing order */
  d: number;
  /** MA order */
  q: number;
  /** Number of steps to forecast (default 10) */
  forecastHorizon?: number;
}

/** ARIMA result */
export interface ARIMAResult {
  /** Fitted values aligned with differenced series */
  fitted: number[];
  /** Residuals (actual - fitted) */
  residuals: number[];
  /** Forecasted values (undifferenced, on original scale) */
  forecast: number[];
  /** Estimated AR coefficients φ_1..φ_p */
  arCoefficients: number[];
  /** Estimated MA coefficients θ_1..θ_q */
  maCoefficients: number[];
  /** Akaike Information Criterion */
  aic: number;
  /** Mean squared error of residuals */
  mse: number;
}

/** Exponential smoothing input */
export interface ExpSmoothInput {
  /** Time series data */
  series: number[];
  /** Smoothing method */
  method: 'simple' | 'double' | 'triple';
  /** Level smoothing parameter (0 < α < 1, default 0.3) */
  alpha?: number;
  /** Trend smoothing parameter (0 < β < 1, default 0.1) */
  beta?: number;
  /** Seasonal smoothing parameter (0 < γ < 1, default 0.1) */
  gamma?: number;
  /** Length of one seasonal cycle (required for triple) */
  seasonalPeriod?: number;
  /** Number of steps to forecast (default 10) */
  forecastHorizon?: number;
}

/** Exponential smoothing result */
export interface ExpSmoothResult {
  /** Fitted (smoothed) values */
  fitted: number[];
  /** Forecasted values */
  forecast: number[];
  /** Level component at each time step */
  level: number[];
  /** Trend component (double/triple only) */
  trend?: number[];
  /** Seasonal component (triple only) */
  seasonal?: number[];
  /** Mean squared error of one-step-ahead forecast errors */
  mse: number;
}

/** Kaplan-Meier input */
export interface KMInput {
  /** Observed times (failure or censoring) */
  times: number[];
  /** true = event (failure), false = censored */
  events: boolean[];
  /** Optional group labels for log-rank test (2 groups) */
  groups?: number[];
}

/** A single point on the survival curve */
export interface SurvivalPoint {
  /** Time */
  time: number;
  /** Estimated survival probability S(t) */
  survival: number;
  /** Greenwood variance estimate */
  variance: number;
  /** Number at risk just before this time */
  atRisk: number;
}

/** Kaplan-Meier result */
export interface KMResult {
  /** Survival curve points (at each event time) */
  survivalCurve: SurvivalPoint[];
  /** Median survival time (S(t) crosses 0.5), NaN if never crosses */
  medianSurvival: number;
  /** Log-rank test result (only if groups provided with exactly 2 groups) */
  logRankTest?: { chiSquare: number; pValue: number; significant: boolean };
}

/** Nonparametric test input */
export interface NonparamInput {
  /** Test type */
  test: 'mann_whitney' | 'kruskal_wallis' | 'wilcoxon_signed_rank';
  /** Sample arrays: 2 for mann_whitney/wilcoxon, k>=2 for kruskal_wallis */
  samples: number[][];
  /** Significance level (default 0.05) */
  alpha?: number;
}

/** Nonparametric test result */
export interface NonparamResult {
  /** The test statistic (U, H, or W) */
  testStatistic: number;
  /** p-value (normal approximation) */
  pValue: number;
  /** Whether the result is significant at the given alpha */
  significant: boolean;
  /** Effect size (r = Z/√N for Mann-Whitney / Wilcoxon, η² = (H-k+1)/(N-k) for Kruskal-Wallis) */
  effectSize?: number;
  /** Name of the test performed */
  testName: string;
}

/** Rank correlation input */
export interface RankCorrInput {
  /** First variable */
  x: number[];
  /** Second variable */
  y: number[];
  /** Correlation method */
  method: 'spearman' | 'kendall';
}

/** Rank correlation result */
export interface RankCorrResult {
  /** Correlation coefficient (ρ or τ) */
  coefficient: number;
  /** p-value (normal approximation) */
  pValue: number;
  /** Whether the result is significant at α=0.05 */
  significant: boolean;
  /** Sample size */
  n: number;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

/**
 * TimeSeriesForecastEngine — Time series forecasting and survival/nonparametric analysis.
 *
 * Provides ARIMA, exponential smoothing (Holt-Winters), Kaplan-Meier survival estimation,
 * nonparametric hypothesis tests, and rank correlation methods.
 */
export class TimeSeriesForecastEngine {
  private totalCalculations = 0;

  // ─── 1. ARIMA ───────────────────────────────────────────────────────────────

  /**
   * ARIMA(p,d,q) forecasting.
   *
   * Applies d-th order differencing for stationarity, estimates AR(p) coefficients
   * via Yule-Walker equations solved with the Levinson-Durbin algorithm (O(p²)),
   * estimates MA(q) coefficients via the innovations algorithm, then produces
   * multi-step forecasts with undifferencing.
   *
   * @ref Box, G.E.P. & Jenkins, G.M. (1970). Time Series Analysis: Forecasting and Control.
   * @ref Levinson, N. (1947). The Wiener RMS error criterion in filter
   *   design and prediction.
   * @ref Brockwell, P.J. & Davis, R.A. (1991). Time Series: Theory and
   *   Methods, 2nd ed. (innovations algorithm)
   */
  arima(input: ARIMAInput): ARIMAResult {
    this.totalCalculations++;
    const { series, p, d, q, forecastHorizon = 10 } = input;
    if (series.length < 2) throw new Error('ARIMA requires at least 2 data points');
    if (p < 0 || d < 0 || q < 0) throw new Error('p, d, q must be non-negative');

    // ── Step 1: Differencing ──
    let diffed = [...series];
    const diffHistory: number[][] = []; // store each level for undifferencing
    for (let i = 0; i < d; i++) {
      diffHistory.push([...diffed]);
      const next: number[] = [];
      for (let t = 1; t < diffed.length; t++) {
        next.push(diffed[t] - diffed[t - 1]);
      }
      diffed = next;
    }

    const n = diffed.length;
    if (n < Math.max(p, q) + 1) throw new Error('Differenced series too short for given p,q');

    const mean = diffed.reduce((a, b) => a + b, 0) / n;
    const centered = diffed.map(v => v - mean);

    // ── Step 2: AR coefficients via Yule-Walker + Levinson-Durbin ──
    let arCoefficients: number[] = [];
    if (p > 0) {
      // Compute autocovariances γ(0)..γ(p)
      const gamma: number[] = [];
      for (let k = 0; k <= p; k++) {
        gamma.push(autocovariance(diffed, mean, k));
      }

      // Levinson-Durbin recursion: O(p²)
      // Solves the Toeplitz system [γ(|i-j|)] φ = [γ(1)..γ(p)]
      const phi: number[][] = []; // phi[m] = coefficients at order m
      const sigma2: number[] = [gamma[0]]; // prediction error variance

      // Order 1
      phi.push([gamma[1] / gamma[0]]);
      sigma2.push(sigma2[0] * (1 - phi[0][0] * phi[0][0]));

      for (let m = 1; m < p; m++) {
        // Compute reflection coefficient k_{m+1}
        let num = gamma[m + 1];
        for (let j = 0; j < m; j++) {
          num -= phi[m - 1][j] * gamma[m - j];
        }
        const km1 = num / sigma2[m];

        // Update coefficients
        const newPhi: number[] = new Array(m + 1);
        newPhi[m] = km1;
        for (let j = 0; j < m; j++) {
          newPhi[j] = phi[m - 1][j] - km1 * phi[m - 1][m - 1 - j];
        }
        phi.push(newPhi);
        sigma2.push(sigma2[m] * (1 - km1 * km1));
      }

      arCoefficients = phi[p - 1];
    }

    // ── Step 3: Compute AR residuals ──
    const startIdx = Math.max(p, q);
    const residuals: number[] = new Array(n).fill(0);
    const fitted: number[] = new Array(n).fill(mean);

    // First pass: AR prediction to get residuals
    for (let t = startIdx; t < n; t++) {
      let pred = mean;
      for (let j = 0; j < p; j++) {
        pred += arCoefficients[j] * centered[t - 1 - j];
      }
      fitted[t] = pred;
      residuals[t] = diffed[t] - pred;
    }

    // ── Step 4: MA coefficients via innovations algorithm ──
    let maCoefficients: number[] = [];
    if (q > 0) {
      // Innovations algorithm estimates θ_1..θ_q from residual autocovariances.
      // We use the sample autocovariances of the AR residuals.
      const resSlice = residuals.slice(startIdx);
      const resMean = resSlice.reduce((a, b) => a + b, 0) / resSlice.length;
      const resGamma: number[] = [];
      for (let k = 0; k <= q; k++) {
        resGamma.push(autocovariance(resSlice, resMean, k));
      }

      // Innovations algorithm: compute θ coefficients from autocovariance structure
      // κ(i,j) = γ_res(i-j) for the MA(q) process
      // v[0] = κ(1,1) = γ(0)
      const v: number[] = [resGamma[0]];
      const theta: number[][] = []; // theta[m][j] for m=0..q-1, j=0..m

      for (let m = 0; m < q; m++) {
        const thetaM: number[] = new Array(m + 1).fill(0);
        // θ_{m+1, m+1-k} for k=0..m
        for (let k = 0; k <= m; k++) {
          let sum = resGamma[m + 1 - k]; // κ(m+1, k+1) approximated
          // Subtract sum of previous theta products
          for (let j = 0; j < k; j++) {
            if (theta[k - 1] && theta[k - 1][k - 1 - j] !== undefined) {
              sum -= theta[k - 1][k - 1 - j] * thetaM[m - j] * v[j];
            }
          }
          thetaM[m - k] = sum / v[k];
        }
        theta.push(thetaM);

        // v[m+1] = κ(m+2, m+2) - sum θ²_{m+1,j} * v[j]
        let vm1 = resGamma[0];
        for (let j = 0; j <= m; j++) {
          vm1 -= thetaM[m - j] * thetaM[m - j] * v[j];
        }
        v.push(Math.max(vm1, 1e-12));
      }

      // Extract MA coefficients: θ_1..θ_q from the last row
      maCoefficients = theta[q - 1].slice(0, q);
    }

    // ── Step 5: Refit with AR + MA ──
    const fitted2: number[] = new Array(n).fill(mean);
    const residuals2: number[] = new Array(n).fill(0);
    for (let t = 0; t < startIdx; t++) {
      residuals2[t] = diffed[t] - mean;
    }

    for (let t = startIdx; t < n; t++) {
      let pred = mean;
      for (let j = 0; j < p; j++) {
        pred += arCoefficients[j] * centered[t - 1 - j];
      }
      for (let j = 0; j < q; j++) {
        if (t - 1 - j >= 0) {
          pred += maCoefficients[j] * residuals2[t - 1 - j];
        }
      }
      fitted2[t] = pred;
      residuals2[t] = diffed[t] - pred;
    }

    // ── Step 6: MSE and AIC ──
    const validResiduals = residuals2.slice(startIdx);
    const mse = validResiduals.reduce((s, r) => s + r * r, 0) / validResiduals.length;
    const nValid = validResiduals.length;
    const k = p + q + 1; // number of estimated parameters (including variance)
    const aic = nValid * Math.log(mse) + 2 * k;

    // ── Step 7: Forecast on differenced scale ──
    const extendedDiffed = [...diffed];
    const extendedResiduals = [...residuals2];

    for (let h = 0; h < forecastHorizon; h++) {
      const t = n + h;
      let pred = mean;
      for (let j = 0; j < p; j++) {
        const idx = t - 1 - j;
        if (idx >= 0 && idx < extendedDiffed.length) {
          pred += arCoefficients[j] * (extendedDiffed[idx] - mean);
        }
      }
      for (let j = 0; j < q; j++) {
        const idx = t - 1 - j;
        if (idx >= 0 && idx < extendedResiduals.length) {
          pred += maCoefficients[j] * extendedResiduals[idx];
        }
      }
      extendedDiffed.push(pred);
      extendedResiduals.push(0); // future residuals assumed 0
    }

    let forecastDiffed = extendedDiffed.slice(n);

    // ── Step 8: Undifference ──
    // Reverse the differencing to get forecasts on the original scale
    for (let i = d - 1; i >= 0; i--) {
      const hist = diffHistory[i];
      const lastVal = hist[hist.length - 1];
      // Also need to reconstruct from the end of the previous level
      const undiffed: number[] = [];
      let prev = lastVal;
      for (let h = 0; h < forecastDiffed.length; h++) {
        prev = prev + forecastDiffed[h];
        undiffed.push(prev);
      }
      forecastDiffed = undiffed;
    }

    return {
      fitted: fitted2,
      residuals: residuals2,
      forecast: forecastDiffed,
      arCoefficients,
      maCoefficients,
      aic,
      mse,
    };
  }

  // ─── 2. Exponential Smoothing (Holt-Winters) ───────────────────────────────

  /**
   * Exponential smoothing forecasting: simple, double (Holt), or triple (Holt-Winters additive).
   *
   * - Simple: l_t = α·y_t + (1-α)·l_{t-1}
   * - Double (Holt): l_t = α·y_t + (1-α)(l_{t-1}+b_{t-1}), b_t = β(l_t-l_{t-1}) + (1-β)b_{t-1}
   * - Triple (Holt-Winters additive): l_t = α(y_t - s_{t-m}) + (1-α)(l_{t-1}+b_{t-1}),
   *   b_t = β(l_t - l_{t-1}) + (1-β)b_{t-1}, s_t = γ(y_t - l_t) + (1-γ)s_{t-m}
   *
   * @ref Holt, C.C. (1957). Forecasting seasonals and trends by exponentially
   *   weighted moving averages.
   * @ref Winters, P.R. (1960). Forecasting sales by exponentially weighted
   *   moving averages. Management Science.
   */
  exponentialSmoothing(input: ExpSmoothInput): ExpSmoothResult {
    this.totalCalculations++;
    const {
      series,
      method,
      alpha = 0.3,
      beta = 0.1,
      gamma = 0.1,
      seasonalPeriod = 12,
      forecastHorizon = 10,
    } = input;

    const n = series.length;
    if (n < 2) throw new Error('Series must have at least 2 data points');

    if (method === 'simple') {
      return this._simpleSmoothing(series, alpha, forecastHorizon);
    } else if (method === 'double') {
      return this._doubleSmoothing(series, alpha, beta, forecastHorizon);
    } else if (method === 'triple') {
      if (n < 2 * seasonalPeriod) {
        throw new Error('Triple smoothing requires at least 2 full seasonal periods');
      }
      return this._tripleSmoothing(series, alpha, beta, gamma, seasonalPeriod, forecastHorizon);
    }
    throw new Error(`Unknown method: ${method}`);
  }

  /**
   * Simple exponential smoothing (level only).
   */
  private _simpleSmoothing(
    series: number[],
    alpha: number,
    horizon: number
  ): ExpSmoothResult {
    const n = series.length;
    const level: number[] = [series[0]];
    const fitted: number[] = [series[0]];
    let sse = 0;

    for (let t = 1; t < n; t++) {
      const l = alpha * series[t] + (1 - alpha) * level[t - 1];
      level.push(l);
      fitted.push(level[t - 1]); // one-step-ahead forecast is previous level
      const err = series[t] - fitted[t];
      sse += err * err;
    }

    const lastLevel = level[n - 1];
    const forecast = new Array(horizon).fill(lastLevel);
    const mse = sse / (n - 1);

    return { fitted, forecast, level, mse };
  }

  /**
   * Double exponential smoothing (Holt's method: level + trend).
   */
  private _doubleSmoothing(
    series: number[],
    alpha: number,
    beta: number,
    horizon: number
  ): ExpSmoothResult {
    const n = series.length;
    // Initialize: level = y[0], trend = y[1] - y[0]
    const level: number[] = [series[0]];
    const trend: number[] = [series[1] - series[0]];
    const fitted: number[] = [series[0]];
    let sse = 0;

    for (let t = 1; t < n; t++) {
      const l = alpha * series[t] + (1 - alpha) * (level[t - 1] + trend[t - 1]);
      const b = beta * (l - level[t - 1]) + (1 - beta) * trend[t - 1];
      level.push(l);
      trend.push(b);
      fitted.push(level[t - 1] + trend[t - 1]); // one-step-ahead
      const err = series[t] - fitted[t];
      sse += err * err;
    }

    const forecast: number[] = [];
    for (let h = 1; h <= horizon; h++) {
      forecast.push(level[n - 1] + h * trend[n - 1]);
    }
    const mse = sse / (n - 1);

    return { fitted, forecast, level, trend, mse };
  }

  /**
   * Triple exponential smoothing (Holt-Winters additive).
   * Initializes seasonal factors from the first complete cycle.
   */
  private _tripleSmoothing(
    series: number[],
    alpha: number,
    beta: number,
    gamma: number,
    m: number,
    horizon: number
  ): ExpSmoothResult {
    const n = series.length;

    // Initialize level: average of first season
    const firstSeasonMean = series.slice(0, m).reduce((a, b) => a + b, 0) / m;
    const level: number[] = [firstSeasonMean];

    // Initialize trend: average slope between first two seasons
    let trendInit = 0;
    for (let i = 0; i < m; i++) {
      trendInit += (series[i + m] - series[i]) / m;
    }
    trendInit /= m;
    const trend: number[] = [trendInit];

    // Initialize seasonal factors from first cycle
    const seasonal: number[] = [];
    for (let i = 0; i < m; i++) {
      seasonal.push(series[i] - firstSeasonMean);
    }

    const fitted: number[] = new Array(m).fill(0);
    // Fill initial fitted values
    for (let t = 0; t < m; t++) {
      fitted[t] = level[0] + t * trend[0] + seasonal[t];
    }

    let sse = 0;

    for (let t = m; t < n; t++) {
      const sIdx = t - m; // index into seasonal for s_{t-m}
      const l = alpha * (series[t] - seasonal[sIdx]) + (1 - alpha) * (level[t - m] + trend[t - m]);
      const b = beta * (l - level[t - m]) + (1 - beta) * trend[t - m];
      const s = gamma * (series[t] - l) + (1 - gamma) * seasonal[sIdx];

      level.push(l);
      trend.push(b);
      seasonal.push(s);

      const fcast = level[t - m] + trend[t - m] + seasonal[sIdx]; // one-step-ahead
      fitted.push(fcast);
      const err = series[t] - fcast;
      sse += err * err;
    }

    // Forecast
    const forecast: number[] = [];
    const lastLevel = level[level.length - 1];
    const lastTrend = trend[trend.length - 1];
    for (let h = 1; h <= horizon; h++) {
      const sIdx = seasonal.length - m + ((h - 1) % m);
      forecast.push(lastLevel + h * lastTrend + seasonal[sIdx]);
    }

    const mse = sse / (n - m);
    return { fitted, forecast, level, trend, seasonal, mse };
  }

  // ─── 3. Kaplan-Meier Survival Estimator ─────────────────────────────────────

  /**
   * Kaplan-Meier non-parametric survival function estimation.
   *
   * S(t) = Π_{t_i ≤ t} (1 - d_i / n_i)
   *
   * where d_i = number of events at time t_i, n_i = number at risk just before t_i.
   * Handles right-censored observations. Computes Greenwood's variance:
   *   Var(S(t)) = S(t)² Σ_{t_i ≤ t} d_i / (n_i(n_i - d_i))
   *
   * Optionally performs the log-rank test comparing two groups:
   *   χ² = (Σ(O₁ⱼ - E₁ⱼ))² / Σ V₁ⱼ  (Mantel-Haenszel form)
   *
   * @ref Kaplan, E.L. & Meier, P. (1958). Nonparametric estimation from
   *   incomplete observations. JASA.
   * @ref Greenwood, M. (1926). The natural duration of cancer. Reports on
   *   Public Health and Medical Subjects.
   */
  kaplanMeier(input: KMInput): KMResult {
    this.totalCalculations++;
    const { times, events, groups } = input;
    const n = times.length;
    if (n === 0) throw new Error('No observations provided');
    if (events.length !== n) throw new Error('times and events must have equal length');

    // Build survival curve for the overall dataset
    const survivalCurve = this._kmCurve(times, events);

    // Median survival: smallest t where S(t) <= 0.5
    let medianSurvival = NaN;
    for (const pt of survivalCurve) {
      if (pt.survival <= 0.5) {
        medianSurvival = pt.time;
        break;
      }
    }

    // Log-rank test if exactly 2 groups
    let logRankTest: { chiSquare: number; pValue: number; significant: boolean } | undefined;
    if (groups) {
      const uniqueGroups = [...new Set(groups)];
      if (uniqueGroups.length === 2) {
        logRankTest = this._logRankTest(times, events, groups, uniqueGroups);
      }
    }

    return { survivalCurve, medianSurvival, logRankTest };
  }

  /**
   * Compute KM curve for a set of observations.
   */
  private _kmCurve(times: number[], events: boolean[]): SurvivalPoint[] {
    const n = times.length;

    // Sort observations by time; events before censored at ties
    const obs = times.map((t, i) => ({ time: t, event: events[i] }));
    obs.sort((a, b) => a.time - b.time || (a.event ? -1 : 1));

    const curve: SurvivalPoint[] = [];
    let atRisk = n;
    let survival = 1.0;
    let greenwoodSum = 0;
    let i = 0;

    while (i < n) {
      const currentTime = obs[i].time;
      let deaths = 0;
      let censored = 0;

      // Count events and censored at this time
      while (i < n && obs[i].time === currentTime) {
        if (obs[i].event) deaths++;
        else censored++;
        i++;
      }

      if (deaths > 0) {
        const hazard = deaths / atRisk;
        survival *= (1 - hazard);
        if (atRisk > deaths) {
          greenwoodSum += deaths / (atRisk * (atRisk - deaths));
        }
        const variance = survival * survival * greenwoodSum;

        curve.push({
          time: currentTime,
          survival,
          variance,
          atRisk,
        });
      }

      atRisk -= (deaths + censored);
    }

    return curve;
  }

  /**
   * Log-rank test (Mantel-Haenszel) comparing two survival groups.
   * χ² = (Σ(O₁ - E₁))² / Σ Var₁
   * E₁ⱼ = n₁ⱼ·dⱼ/nⱼ
   * Var₁ⱼ = n₁ⱼ·n₂ⱼ·dⱼ·(nⱼ-dⱼ)/(nⱼ²(nⱼ-1))
   */
  private _logRankTest(
    times: number[],
    events: boolean[],
    groups: number[],
    uniqueGroups: number[]
  ): { chiSquare: number; pValue: number; significant: boolean } {
    const g0 = uniqueGroups[0];
    const g1 = uniqueGroups[1];

    // Collect all unique event times
    const allTimes = new Set<number>();
    for (let i = 0; i < times.length; i++) {
      if (events[i]) allTimes.add(times[i]);
    }
    const sortedTimes = [...allTimes].sort((a, b) => a - b);

    // For each group, track subjects remaining
    const obs = times.map((t, i) => ({ time: t, event: events[i], group: groups[i] }));
    obs.sort((a, b) => a.time - b.time);

    let n0 = obs.filter(o => o.group === g0).length;
    let n1 = obs.filter(o => o.group === g1).length;

    let sumOE = 0; // Σ(O₁ - E₁)
    let sumVar = 0;
    let obsIdx = 0;

    for (const t of sortedTimes) {
      // Count events and at-risk at this time
      let d0 = 0, d1 = 0, c0 = 0, c1 = 0;
      const startIdx = obsIdx;

      // Find all observations at times <= t that haven't been processed
      while (obsIdx < obs.length && obs[obsIdx].time <= t) {
        // Process events/censorings before and at this time
        obsIdx++;
      }

      // Re-scan the batch for this specific time
      for (let i = startIdx; i < obsIdx; i++) {
        if (obs[i].time === t) {
          if (obs[i].event) {
            if (obs[i].group === g0) d0++;
            else d1++;
          } else {
            if (obs[i].group === g0) c0++;
            else c1++;
          }
        } else {
          // Censored before this event time — reduce at-risk
          if (obs[i].group === g0) { c0++; }
          else { c1++; }
        }
      }

      const nTotal = n0 + n1;
      const dTotal = d0 + d1;

      if (nTotal > 1 && dTotal > 0) {
        const e0 = n0 * dTotal / nTotal;
        sumOE += d0 - e0;
        sumVar += n0 * n1 * dTotal * (nTotal - dTotal)
          / (nTotal * nTotal * (nTotal - 1));
      }

      // Remove from at-risk
      n0 -= (d0 + c0);
      n1 -= (d1 + c1);
    }

    const chiSquare = sumVar > 0 ? (sumOE * sumOE) / sumVar : 0;
    // Chi-square with 1 df → p-value via normal approximation: p = 2(1-Φ(√χ²))
    const pValue = sumVar > 0 ? (1 - normalCDF(Math.sqrt(chiSquare))) * 2 : 1;

    return {
      chiSquare,
      pValue: Math.min(pValue, 1),
      significant: pValue < 0.05,
    };
  }

  // ─── 4. Nonparametric Hypothesis Tests ──────────────────────────────────────

  /**
   * Nonparametric hypothesis tests: Mann-Whitney U, Kruskal-Wallis H, Wilcoxon signed-rank.
   *
   * Mann-Whitney U: Tests whether two independent samples come from the same distribution.
   *   U = Σ R₁ - n₁(n₁+1)/2, z = (U - n₁n₂/2) / √(n₁n₂(n₁+n₂+1)/12)
   *
   * Kruskal-Wallis H: Extension of Mann-Whitney to k independent samples.
   *   H = (12/(N(N+1))) Σ (R̄ᵢ² · nᵢ) - 3(N+1)
   *
   * Wilcoxon signed-rank: Tests whether paired differences are symmetric about zero.
   *   W = Σ sign(dᵢ)·rank(|dᵢ|), z = W / √(n(n+1)(2n+1)/6)
   *
   * @ref Mann, H.B. & Whitney, D.R. (1947). On a test of whether one of
   *   two random variables is stochastically larger. Ann. Math. Stat.
   * @ref Kruskal, W.H. & Wallis, W.A. (1952). Use of ranks in
   *   one-criterion variance analysis. JASA.
   * @ref Wilcoxon, F. (1945). Individual comparisons by ranking methods.
   *   Biometrics Bulletin.
   */
  nonparametricTest(input: NonparamInput): NonparamResult {
    this.totalCalculations++;
    const { test, samples, alpha = 0.05 } = input;

    switch (test) {
      case 'mann_whitney':
        return this._mannWhitney(samples, alpha);
      case 'kruskal_wallis':
        return this._kruskalWallis(samples, alpha);
      case 'wilcoxon_signed_rank':
        return this._wilcoxonSignedRank(samples, alpha);
      default:
        throw new Error(`Unknown test: ${test}`);
    }
  }

  /**
   * Mann-Whitney U test for two independent samples.
   */
  private _mannWhitney(samples: number[][], alpha: number): NonparamResult {
    if (samples.length !== 2) throw new Error('Mann-Whitney requires exactly 2 samples');
    const [s1, s2] = samples;
    const n1 = s1.length;
    const n2 = s2.length;
    if (n1 === 0 || n2 === 0) throw new Error('Samples must be non-empty');

    // Combine and rank
    const combined: { value: number; group: number }[] = [
      ...s1.map(v => ({ value: v, group: 0 })),
      ...s2.map(v => ({ value: v, group: 1 })),
    ];
    const allValues = combined.map(c => c.value);
    const ranks = computeRanks(allValues);

    // Sum of ranks for group 1
    let R1 = 0;
    for (let i = 0; i < n1; i++) {
      R1 += ranks[i];
    }

    // U statistic
    const U1 = R1 - n1 * (n1 + 1) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);

    // Normal approximation (with continuity correction)
    const muU = n1 * n2 / 2;
    const sigmaU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);

    // Tie correction for variance
    // Count tied groups
    const sorted = [...allValues].sort((a, b) => a - b);
    const tieGroups: number[] = [];
    let ti = 0;
    while (ti < sorted.length) {
      let tj = ti;
      while (tj < sorted.length && sorted[tj] === sorted[ti]) tj++;
      const tieSize = tj - ti;
      if (tieSize > 1) tieGroups.push(tieSize);
      ti = tj;
    }

    let tieCorrection = 0;
    for (const t of tieGroups) {
      tieCorrection += (t * t * t - t);
    }
    const N = n1 + n2;
    const adjustedSigma = Math.sqrt(
      (n1 * n2 / 12) * ((N + 1) - tieCorrection / (N * (N - 1)))
    );
    const sigma = adjustedSigma > 0 ? adjustedSigma : sigmaU;

    const z = (U1 - muU) / sigma;
    const pValue = twoTailP(z);
    const effectSize = Math.abs(z) / Math.sqrt(N); // r = |z|/√N

    return {
      testStatistic: U,
      pValue,
      significant: pValue < alpha,
      effectSize,
      testName: 'Mann-Whitney U test',
    };
  }

  /**
   * Kruskal-Wallis H test for k independent samples.
   */
  private _kruskalWallis(samples: number[][], alpha: number): NonparamResult {
    if (samples.length < 2) throw new Error('Kruskal-Wallis requires at least 2 samples');
    const k = samples.length;
    const allValues: number[] = [];
    const groupSizes: number[] = [];
    const groupStarts: number[] = [];

    for (const s of samples) {
      if (s.length === 0) throw new Error('All samples must be non-empty');
      groupStarts.push(allValues.length);
      allValues.push(...s);
      groupSizes.push(s.length);
    }

    const N = allValues.length;
    const ranks = computeRanks(allValues);

    // Compute rank sums for each group
    const rankSums: number[] = [];
    for (let g = 0; g < k; g++) {
      let sum = 0;
      const start = groupStarts[g];
      for (let i = 0; i < groupSizes[g]; i++) {
        sum += ranks[start + i];
      }
      rankSums.push(sum);
    }

    // H statistic: H = (12/(N(N+1))) Σ (Rᵢ²/nᵢ) - 3(N+1)
    let H = 0;
    for (let g = 0; g < k; g++) {
      H += (rankSums[g] * rankSums[g]) / groupSizes[g];
    }
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);

    // Tie correction
    const sorted = [...allValues].sort((a, b) => a - b);
    let tieCorrection = 0;
    let ti = 0;
    while (ti < sorted.length) {
      let tj = ti;
      while (tj < sorted.length && sorted[tj] === sorted[ti]) tj++;
      const tieSize = tj - ti;
      if (tieSize > 1) tieCorrection += (tieSize * tieSize * tieSize - tieSize);
      ti = tj;
    }
    const C = 1 - tieCorrection / (N * N * N - N);
    if (C > 0) H /= C;

    // p-value: chi-square approximation with k-1 df
    // For df=k-1, use chi-square → normal approximation: z = √(2χ²) - √(2df-1) (Wilson-Hilferty)
    const df = k - 1;
    // More accurate: use chi-square survival via regularized gamma (approximate with normal for large df)
    // For small df, use the transformation: if X ~ χ²(ν), then Z = ((X/ν)^(1/3) - (1-2/(9ν))) / √(2/(9ν))
    const cube = Math.pow(H / df, 1 / 3);
    const zWH = (cube - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
    const pValue = 1 - normalCDF(zWH);

    // Effect size: η² = (H - k + 1) / (N - k)
    const effectSize = (H - k + 1) / (N - k);

    return {
      testStatistic: H,
      pValue,
      significant: pValue < alpha,
      effectSize: Math.max(0, effectSize),
      testName: 'Kruskal-Wallis H test',
    };
  }

  /**
   * Wilcoxon signed-rank test for paired samples.
   */
  private _wilcoxonSignedRank(samples: number[][], alpha: number): NonparamResult {
    if (samples.length !== 2) throw new Error('Wilcoxon signed-rank requires exactly 2 paired samples');
    const [s1, s2] = samples;
    if (s1.length !== s2.length) throw new Error('Paired samples must have equal length');
    const n = s1.length;

    // Compute differences, exclude zeros
    const diffs: { absDiff: number; sign: number }[] = [];
    for (let i = 0; i < n; i++) {
      const diff = s1[i] - s2[i];
      if (diff !== 0) {
        diffs.push({ absDiff: Math.abs(diff), sign: diff > 0 ? 1 : -1 });
      }
    }

    const nr = diffs.length; // effective sample size (excluding zero diffs)
    if (nr === 0) {
      return {
        testStatistic: 0,
        pValue: 1,
        significant: false,
        effectSize: 0,
        testName: 'Wilcoxon signed-rank test',
      };
    }

    // Rank the absolute differences
    const absVals = diffs.map(d => d.absDiff);
    const ranks = computeRanks(absVals);

    // W+ = sum of ranks for positive diffs, W- = sum for negative
    let Wplus = 0;
    let Wminus = 0;
    for (let i = 0; i < nr; i++) {
      if (diffs[i].sign > 0) Wplus += ranks[i];
      else Wminus += ranks[i];
    }

    const W = Math.min(Wplus, Wminus);

    // Normal approximation: z = (W - μ_W) / σ_W
    // μ_W = n(n+1)/4, σ_W = √(n(n+1)(2n+1)/24)
    const muW = nr * (nr + 1) / 4;
    const sigmaW = Math.sqrt(nr * (nr + 1) * (2 * nr + 1) / 24);

    // Tie correction for variance
    const sortedAbs = [...absVals].sort((a, b) => a - b);
    let tieCorrection = 0;
    let ti = 0;
    while (ti < sortedAbs.length) {
      let tj = ti;
      while (tj < sortedAbs.length && sortedAbs[tj] === sortedAbs[ti]) tj++;
      const t = tj - ti;
      if (t > 1) tieCorrection += (t * t * t - t);
      ti = tj;
    }
    const adjustedSigma = Math.sqrt(
      (nr * (nr + 1) * (2 * nr + 1) - tieCorrection / 2) / 24
    );
    const sigma = adjustedSigma > 0 ? adjustedSigma : sigmaW;

    const z = (W - muW) / sigma;
    const pValue = twoTailP(z);
    const effectSize = Math.abs(z) / Math.sqrt(nr); // r = |z|/√n

    return {
      testStatistic: W,
      pValue,
      significant: pValue < alpha,
      effectSize,
      testName: 'Wilcoxon signed-rank test',
    };
  }

  // ─── 5. Rank Correlation ────────────────────────────────────────────────────

  /**
   * Rank correlation: Spearman's ρ or Kendall's τ.
   *
   * Spearman's ρ: Pearson correlation on ranked data.
   *   ρ = 1 - 6Σd²ᵢ / (n(n²-1))  (no ties shortcut, full formula used with ties)
   *   z = ρ√(n-2) / √(1-ρ²) ≈ ρ√(n-1) for significance
   *
   * Kendall's τ: Based on concordant and discordant pairs.
   *   τ = (C - D) / (n(n-1)/2), with tie correction: τ_b = (C-D)/√((n₀-n₁)(n₀-n₂))
   *   z = τ / √(2(2n+5) / (9n(n-1)))
   *
   * @ref Spearman, C. (1904). The proof and measurement of association
   *   between two things. American J. Psychology.
   * @ref Kendall, M.G. (1938). A new measure of rank correlation.
   *   Biometrika.
   */
  rankCorrelation(input: RankCorrInput): RankCorrResult {
    this.totalCalculations++;
    const { x, y, method } = input;
    const n = x.length;
    if (n !== y.length) throw new Error('x and y must have equal length');
    if (n < 3) throw new Error('Need at least 3 observations');

    if (method === 'spearman') {
      return this._spearman(x, y);
    } else if (method === 'kendall') {
      return this._kendall(x, y);
    }
    throw new Error(`Unknown method: ${method}`);
  }

  /**
   * Spearman's rank correlation coefficient.
   */
  private _spearman(x: number[], y: number[]): RankCorrResult {
    const n = x.length;
    const rankX = computeRanks(x);
    const rankY = computeRanks(y);

    // Pearson correlation on ranks
    const meanRx = rankX.reduce((a, b) => a + b, 0) / n;
    const meanRy = rankY.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = rankX[i] - meanRx;
      const dy = rankY[i] - meanRy;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const rho = (denX > 0 && denY > 0) ? num / Math.sqrt(denX * denY) : 0;

    // Significance: z = ρ * √(n-1) for large-sample approximation
    const z = rho * Math.sqrt(n - 1);
    const pValue = twoTailP(z);

    return {
      coefficient: rho,
      pValue,
      significant: pValue < 0.05,
      n,
    };
  }

  /**
   * Kendall's tau-b rank correlation coefficient (with tie correction).
   */
  private _kendall(x: number[], y: number[]): RankCorrResult {
    const n = x.length;
    let concordant = 0;
    let discordant = 0;
    let tiedX = 0;
    let tiedY = 0;
    let tiedBoth = 0;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];

        if (dx === 0 && dy === 0) {
          tiedBoth++;
        } else if (dx === 0) {
          tiedX++;
        } else if (dy === 0) {
          tiedY++;
        } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
          concordant++;
        } else {
          discordant++;
        }
      }
    }

    const n0 = n * (n - 1) / 2;
    const n1 = tiedX + tiedBoth; // pairs tied on X
    const n2 = tiedY + tiedBoth; // pairs tied on Y

    // Kendall's tau-b: (C - D) / sqrt((n0 - n1)(n0 - n2))
    const denom = Math.sqrt((n0 - n1) * (n0 - n2));
    const tau = denom > 0 ? (concordant - discordant) / denom : 0;

    // Significance: z = tau / sqrt(2(2n+5) / (9n(n-1)))
    const varTau = 2 * (2 * n + 5) / (9 * n * (n - 1));
    const z = tau / Math.sqrt(varTau);
    const pValue = twoTailP(z);

    return {
      coefficient: tau,
      pValue,
      significant: pValue < 0.05,
      n,
    };
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  /**
   * Engine capability summary and usage counter.
   * @returns methods list and total calculations performed
   */
  stats(): { methods: string[]; totalCalculations: number } {
    return {
      methods: [
        'arima (Box & Jenkins 1970)',
        'exponentialSmoothing (Holt 1957, Winters 1960)',
        'kaplanMeier (Kaplan & Meier 1958)',
        'nonparametricTest: mann_whitney (1947), kruskal_wallis (1952), wilcoxon_signed_rank (1945)',
        'rankCorrelation: spearman (1904), kendall (1938)',
      ],
      totalCalculations: this.totalCalculations,
    };
  }
}
