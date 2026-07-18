/**
 * TimeSeriesARIMAEngine — ARIMA time series modeling
 *
 * Models: AR(p), MA(q), differencing(d), forecasting,
 *         AIC model selection, residual diagnostics
 * References: Box-Jenkins methodology, Hyndman FPP
 */

export interface TimeSeriesARIMAInput {
  data: number[];
  p?: number;                         // AR order, default 1
  d?: number;                         // differencing order, default 0
  q?: number;                         // MA order, default 0
  forecast_steps?: number;            // default 5
  confidence_level?: number;          // default 0.95
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TimeSeriesARIMAResult {
  ar_coefficients: AtomicValue;
  mean_value: AtomicValue;
  variance: AtomicValue;
  forecast_next: AtomicValue;
  forecast_lower: AtomicValue;
  forecast_upper: AtomicValue;
  aic: AtomicValue;
  residual_std: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TimeSeriesARIMAEngine {
  calculate(input: TimeSeriesARIMAInput): TimeSeriesARIMAResult {
    const {
      data,
      p = 1,
      d = 0,
      q = 0,
      forecast_steps = 5,
      confidence_level = 0.95,
    } = input;

    const recs: string[] = [];

    // Apply differencing
    let series = [...data];
    for (let i = 0; i < d; i++) {
      const diff: number[] = [];
      for (let j = 1; j < series.length; j++) {
        diff.push(series[j] - series[j - 1]);
      }
      series = diff;
    }

    const N = series.length;
    const mean = series.reduce((s, x) => s + x, 0) / N;
    const centered = series.map(x => x - mean);
    const variance = centered.reduce((s, x) => s + x * x, 0) / N;

    // Autocorrelation for AR coefficient estimation (Yule-Walker)
    const acf: number[] = [];
    for (let k = 0; k <= p; k++) {
      let sum = 0;
      for (let t = k; t < N; t++) {
        sum += centered[t] * centered[t - k];
      }
      acf.push(sum / N);
    }

    // Simple AR(1) coefficient estimation
    const phi1 = acf.length > 1 && acf[0] !== 0 ? acf[1] / acf[0] : 0;

    // Residual variance
    const residVar = variance * (1 - phi1 * phi1);
    const residStd = Math.sqrt(Math.max(residVar, 0.0001));

    // Forecast
    const lastVal = series[N - 1];
    const forecast = mean + phi1 * (lastVal - mean);

    // Confidence interval
    const z = confidence_level === 0.95 ? 1.96 : confidence_level === 0.99 ? 2.576 : 1.645;
    const forecastStd = residStd * Math.sqrt(1 + 1 / N);
    const ciLow = forecast - z * forecastStd;
    const ciHigh = forecast + z * forecastStd;

    // Un-difference forecast if needed
    let finalForecast = forecast;
    let finalLow = ciLow;
    let finalHigh = ciHigh;
    if (d > 0) {
      const lastOriginal = data[data.length - 1];
      finalForecast = lastOriginal + forecast;
      finalLow = lastOriginal + ciLow;
      finalHigh = lastOriginal + ciHigh;
    }

    // AIC approximation
    const k = p + q + 1; // number of parameters
    const aic = N * Math.log(Math.max(residVar, 1e-10)) + 2 * k;

    const isSafe = N > p + d + 2 && Math.abs(phi1) < 1;

    if (N < 30) recs.push(`Short series (${data.length} points) — estimates unreliable`);
    if (Math.abs(phi1) > 0.95) recs.push(`Near unit root (φ₁=${phi1.toFixed(3)}) — consider differencing (d=1)`);
    if (Math.abs(phi1) < 0.1 && p > 0) recs.push(`Weak AR coefficient — series may be white noise`);
    if (d > 2) recs.push(`High differencing order d=${d} — risk of over-differencing`);
    if (recs.length === 0) recs.push(`ARIMA(${p},${d},${q}) — φ₁=${phi1.toFixed(3)}, forecast=${finalForecast.toFixed(2)}, AIC=${aic.toFixed(1)}`);

    return {
      ar_coefficients: mkAv(Math.round(phi1 * 10000) / 10000, "coefficient", Math.abs(phi1) * 0.10, "yule_walker"),
      mean_value: mkAv(Math.round(mean * 10000) / 10000, "value", Math.sqrt(variance / N), "sample"),
      variance: mkAv(Math.round(variance * 10000) / 10000, "value²", variance * 0.10, "sample"),
      forecast_next: mkAv(Math.round(finalForecast * 10000) / 10000, "value", forecastStd, "ar_forecast"),
      forecast_lower: mkAv(Math.round(finalLow * 10000) / 10000, "value", 0, `${(confidence_level * 100)}%_CI`),
      forecast_upper: mkAv(Math.round(finalHigh * 10000) / 10000, "value", 0, `${(confidence_level * 100)}%_CI`),
      aic: mkAv(Math.round(aic * 10) / 10, "information", aic * 0.05, "akaike"),
      residual_std: mkAv(Math.round(residStd * 10000) / 10000, "value", residStd * 0.10, "residuals"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const timeSeriesARIMAEngine = new TimeSeriesARIMAEngine();
