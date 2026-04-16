/**
 * PRISM MCP Server -- Time Series Engine
 *
 * Exponential smoothing family + seasonality analysis:
 * - Simple Exponential Smoothing (SES)
 * - Holt's double exponential (trend)
 * - Holt-Winters triple exponential (trend + seasonality)
 * - Autocorrelation-based seasonality detection
 * - STL-like seasonal decomposition (trend + seasonal + residual)
 * - Forecast generation
 *
 * Based on MIT 15.099, Hyndman & Athanasopoulos (2021).
 * Ported from PRISM_TIME_SERIES_COMPLETE.js (monolith R2.3.1).
 *
 * @module TimeSeriesEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HoltResult {
  smoothed: number[];
  level: number[];
  trend: number[];
}

export interface HoltWintersResult {
  fitted: number[];
  level: number[];
  trend: number[];
  seasonal: number[];
  forecast: (h: number) => number[];
}

export interface SeasonalityResult {
  seasonal: boolean;
  period?: number;
  strength?: number;
  allPeaks?: Array<{ lag: number; correlation: number }>;
  autocorrelations: Array<{ lag: number; correlation: number }>;
  message?: string;
}

export interface DecompositionResult {
  trend: Array<number | null>;
  seasonal: number[];
  residual: Array<number | null>;
  observed: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

class TimeSeriesEngineImpl {

  /**
   * Simple Exponential Smoothing: S_t = α·Y_t + (1-α)·S_{t-1}
   */
  simpleExponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return [];
    const smoothed = [data[0]];
    for (let i = 1; i < data.length; i++) {
      smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
    }
    return smoothed;
  }

  /**
   * Holt's Double Exponential Smoothing (linear trend).
   * Level: L_t = α·Y_t + (1-α)·(L_{t-1} + T_{t-1})
   * Trend: T_t = β·(L_t - L_{t-1}) + (1-β)·T_{t-1}
   */
  holtSmoothing(data: number[], alpha: number = 0.3, beta: number = 0.1): HoltResult {
    if (data.length < 2) return { smoothed: [...data], level: [...data], trend: [0] };

    let L = data[0];
    let T = data[1] - data[0];

    const level = [L];
    const trend = [T];
    const smoothed = [L];

    for (let i = 1; i < data.length; i++) {
      const prevL = L;
      L = alpha * data[i] + (1 - alpha) * (L + T);
      T = beta * (L - prevL) + (1 - beta) * T;
      level.push(L);
      trend.push(T);
      smoothed.push(L);
    }

    return { smoothed, level, trend };
  }

  /**
   * Holt-Winters Triple Exponential Smoothing (trend + seasonality).
   */
  holtWinters(
    data: number[],
    config: { alpha?: number; beta?: number; gamma?: number; seasonLength?: number; multiplicative?: boolean } = {}
  ): HoltWintersResult | { error: string } {
    const alpha = config.alpha ?? 0.3;
    const beta = config.beta ?? 0.1;
    const gamma = config.gamma ?? 0.1;
    const seasonLength = config.seasonLength ?? 12;
    const multiplicative = config.multiplicative ?? true;

    if (data.length < seasonLength * 2) {
      return { error: "Insufficient data for Holt-Winters" };
    }

    // Initialize seasonal indices from first season
    const seasonal: number[] = [];
    const firstSeasonAvg = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;

    for (let i = 0; i < seasonLength; i++) {
      seasonal.push(multiplicative ? data[i] / firstSeasonAvg : data[i] - firstSeasonAvg);
    }

    // Initialize level and trend
    let L = firstSeasonAvg;
    let T = (data.slice(seasonLength, 2 * seasonLength).reduce((a, b) => a + b, 0) / seasonLength - firstSeasonAvg) / seasonLength;

    const level = [L];
    const trend = [T];
    const fitted: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const seasonIdx = i % seasonLength;

      if (i === 0) {
        fitted.push(multiplicative ? L * seasonal[seasonIdx] : L + seasonal[seasonIdx]);
        continue;
      }

      const prevL = L;
      const prevS = seasonal[seasonIdx];

      if (multiplicative) {
        L = alpha * (data[i] / prevS) + (1 - alpha) * (prevL + T);
      } else {
        L = alpha * (data[i] - prevS) + (1 - alpha) * (prevL + T);
      }

      T = beta * (L - prevL) + (1 - beta) * T;

      if (multiplicative) {
        seasonal[seasonIdx] = gamma * (data[i] / L) + (1 - gamma) * prevS;
      } else {
        seasonal[seasonIdx] = gamma * (data[i] - L) + (1 - gamma) * prevS;
      }

      level.push(L);
      trend.push(T);
      fitted.push(multiplicative ? L * seasonal[seasonIdx] : L + seasonal[seasonIdx]);
    }

    const finalL = L;
    const finalT = T;
    const finalSeasonal = [...seasonal];
    const len = data.length;

    return {
      fitted,
      level,
      trend,
      seasonal: [...seasonal],
      forecast: (h: number): number[] => {
        const forecasts: number[] = [];
        for (let i = 1; i <= h; i++) {
          const sIdx = (len + i - 1) % seasonLength;
          const fL = finalL + i * finalT;
          forecasts.push(multiplicative ? fL * finalSeasonal[sIdx] : fL + finalSeasonal[sIdx]);
        }
        return forecasts;
      },
    };
  }

  /**
   * Detect seasonality via autocorrelation peaks.
   */
  detectSeasonality(data: number[], maxPeriod?: number): SeasonalityResult {
    const mp = maxPeriod ?? Math.floor(data.length / 2);

    if (data.length < mp * 2) {
      return { seasonal: false, autocorrelations: [], message: "Insufficient data" };
    }

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + (x - mean) * (x - mean), 0);

    if (variance === 0) {
      return { seasonal: false, autocorrelations: [] };
    }

    const autocorrelations: Array<{ lag: number; correlation: number }> = [];
    for (let lag = 1; lag <= mp; lag++) {
      let corr = 0;
      for (let i = lag; i < data.length; i++) {
        corr += (data[i] - mean) * (data[i - lag] - mean);
      }
      autocorrelations.push({ lag, correlation: corr / variance });
    }

    // Find peaks
    const peaks: Array<{ lag: number; correlation: number }> = [];
    for (let i = 1; i < autocorrelations.length - 1; i++) {
      if (
        autocorrelations[i].correlation > autocorrelations[i - 1].correlation &&
        autocorrelations[i].correlation > autocorrelations[i + 1].correlation &&
        autocorrelations[i].correlation > 0.2
      ) {
        peaks.push(autocorrelations[i]);
      }
    }

    if (peaks.length === 0) {
      return { seasonal: false, autocorrelations };
    }

    const strongest = peaks.reduce((a, b) => (a.correlation > b.correlation ? a : b));

    return {
      seasonal: strongest.correlation > 0.3,
      period: strongest.lag,
      strength: strongest.correlation,
      allPeaks: peaks,
      autocorrelations,
    };
  }

  /**
   * STL-like seasonal decomposition: Observed = Trend + Seasonal + Residual.
   */
  decompose(data: number[], period: number, multiplicative: boolean = false): DecompositionResult {
    const n = data.length;
    const halfPeriod = Math.floor(period / 2);

    // Centered moving average for trend
    const trend: Array<number | null> = [];
    for (let i = 0; i < n; i++) {
      if (i < halfPeriod || i >= n - halfPeriod) {
        trend.push(null);
      } else {
        let sum = 0;
        for (let j = -halfPeriod; j <= halfPeriod; j++) sum += data[i + j];
        trend.push(sum / period);
      }
    }

    // Detrend
    const detrended = data.map((d, i) => {
      if (trend[i] === null) return null;
      return multiplicative ? d / trend[i]! : d - trend[i]!;
    });

    // Average seasonal pattern
    const seasonalAvg = new Array(period).fill(0);
    const seasonalCount = new Array(period).fill(0);
    for (let i = 0; i < n; i++) {
      if (detrended[i] !== null) {
        seasonalAvg[i % period] += detrended[i]!;
        seasonalCount[i % period]++;
      }
    }
    for (let i = 0; i < period; i++) {
      seasonalAvg[i] = seasonalCount[i] > 0 ? seasonalAvg[i] / seasonalCount[i] : (multiplicative ? 1 : 0);
    }

    // Normalize: mean of seasonal = 0 (additive) or 1 (multiplicative)
    const sMean = seasonalAvg.reduce((a: number, b: number) => a + b, 0) / period;
    const seasonal = seasonalAvg.map((s: number) => (multiplicative ? s / sMean : s - sMean));

    // Build full seasonal component and residual
    const fullSeasonal = data.map((_, i) => seasonal[i % period]);
    const residual = data.map((d, i) => {
      if (trend[i] === null) return null;
      return multiplicative ? d / (trend[i]! * fullSeasonal[i]) : d - trend[i]! - fullSeasonal[i];
    });

    return { trend, seasonal: fullSeasonal, residual, observed: data };
  }

  /**
   * Forecast h steps ahead using SES (simple baseline).
   */
  forecastSES(data: number[], h: number, alpha: number = 0.3): number[] {
    const smoothed = this.simpleExponentialSmoothing(data, alpha);
    const last = smoothed[smoothed.length - 1];
    return new Array(h).fill(last);
  }

  /**
   * Forecast h steps ahead using Holt's method.
   */
  forecastHolt(data: number[], h: number, alpha: number = 0.3, beta: number = 0.1): number[] {
    const result = this.holtSmoothing(data, alpha, beta);
    const lastL = result.level[result.level.length - 1];
    const lastT = result.trend[result.trend.length - 1];
    return Array.from({ length: h }, (_, i) => lastL + (i + 1) * lastT);
  }
}

export const timeSeriesEngine = new TimeSeriesEngineImpl();
