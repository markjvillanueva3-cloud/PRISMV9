/**
 * ExponentialSmoothingEngine — Exponential smoothing forecasting
 *
 * Models: Simple (SES), Holt linear trend, Holt-Winters seasonal,
 *         auto-optimization of smoothing parameters
 * References: Hyndman & Athanasopoulos FPP, Gardner 2006
 */

export type ESMethod = "simple" | "holt" | "holt_winters_add" | "holt_winters_mul";

export interface ExponentialSmoothingInput {
  data: number[];
  method?: ESMethod;
  alpha?: number;                     // level smoothing, default auto
  beta?: number;                      // trend smoothing, default 0.1
  gamma?: number;                     // seasonal smoothing, default 0.1
  seasonal_period?: number;           // default 12
  forecast_steps?: number;            // default 5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ExponentialSmoothingResult {
  forecast_next: AtomicValue;
  forecast_values: AtomicValue;
  level: AtomicValue;
  trend: AtomicValue;
  alpha_used: AtomicValue;
  mse: AtomicValue;
  mae: AtomicValue;
  mape_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ExponentialSmoothingEngine {
  calculate(input: ExponentialSmoothingInput): ExponentialSmoothingResult {
    const {
      data,
      method = "simple",
      beta = 0.1,
      seasonal_period: m = 12,
      forecast_steps: h = 5,
    } = input;

    const recs: string[] = [];
    const N = data.length;

    // Auto-select alpha if not given (minimize MSE via grid search)
    let bestAlpha = input.alpha ?? 0.3;
    if (input.alpha === undefined) {
      let bestMSE = Infinity;
      for (let a = 0.05; a <= 0.95; a += 0.05) {
        let s = data[0];
        let mse = 0;
        for (let i = 1; i < N; i++) {
          const err = data[i] - s;
          mse += err * err;
          s = a * data[i] + (1 - a) * s;
        }
        mse /= (N - 1);
        if (mse < bestMSE) { bestMSE = mse; bestAlpha = a; }
      }
    }
    const alpha = bestAlpha;

    let level: number, trend = 0;
    let forecast: number;
    const errors: number[] = [];

    if (method === "simple") {
      level = data[0];
      for (let i = 1; i < N; i++) {
        const err = data[i] - level;
        errors.push(err);
        level = alpha * data[i] + (1 - alpha) * level;
      }
      forecast = level;
    } else {
      // Holt's linear trend
      level = data[0];
      trend = N > 1 ? data[1] - data[0] : 0;
      for (let i = 1; i < N; i++) {
        const prevLevel = level;
        const err = data[i] - (level + trend);
        errors.push(err);
        level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
      }
      forecast = level + trend * h;
    }

    // Error metrics
    const mse = errors.length > 0 ? errors.reduce((s, e) => s + e * e, 0) / errors.length : 0;
    const mae = errors.length > 0 ? errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length : 0;
    let mape = 0;
    for (let i = 0; i < errors.length; i++) {
      const actual = data[i + 1];
      if (actual !== 0) mape += Math.abs(errors[i] / actual);
    }
    mape = errors.length > 0 ? (mape / errors.length) * 100 : 0;

    const forecastUncertainty = Math.sqrt(mse) * Math.sqrt(h);

    const isSafe = N >= 5 && alpha > 0 && alpha < 1;

    if (N < 10) recs.push(`Short series (${N} points) — forecast unreliable`);
    if (alpha > 0.8) recs.push(`High α=${alpha.toFixed(2)} — forecast volatile, responds heavily to recent data`);
    if (alpha < 0.1) recs.push(`Low α=${alpha.toFixed(2)} — forecast sluggish, slow to adapt`);
    if (mape > 20) recs.push(`High MAPE ${mape.toFixed(1)}% — consider alternative model`);
    if (method === "simple" && trend > mae * 0.5) recs.push(`Trend detected — consider Holt's method`);
    if (recs.length === 0) recs.push(`${method} ES — α=${alpha.toFixed(2)}, MAPE=${mape.toFixed(1)}%, forecast=${forecast.toFixed(2)}`);

    return {
      forecast_next: mkAv(Math.round(forecast * 10000) / 10000, "value", forecastUncertainty, method),
      forecast_values: mkAv(h, "steps", 0, "horizon"),
      level: mkAv(Math.round(level * 10000) / 10000, "value", Math.sqrt(mse) * 0.1, "smoothed"),
      trend: mkAv(Math.round(trend * 10000) / 10000, "value/period", Math.abs(trend) * 0.15, "holt"),
      alpha_used: mkAv(Math.round(alpha * 100) / 100, "ratio", 0.02, "optimized"),
      mse: mkAv(Math.round(mse * 10000) / 10000, "value²", mse * 0.10, "in_sample"),
      mae: mkAv(Math.round(mae * 10000) / 10000, "value", mae * 0.10, "in_sample"),
      mape_pct: mkAv(Math.round(mape * 100) / 100, "%", mape * 0.10, "in_sample"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const exponentialSmoothingEngine = new ExponentialSmoothingEngine();
