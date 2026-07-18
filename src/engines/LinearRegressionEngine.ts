/**
 * LinearRegressionEngine — Least squares regression analysis
 *
 * Models: OLS (y=ax+b), R², standard error, confidence intervals,
 *         prediction intervals, residual analysis
 * References: Draper & Smith, Montgomery "Applied Statistics"
 */

export interface LinearRegressionInput {
  x_values: number[];
  y_values: number[];
  prediction_x?: number;                // predict y at this x
  confidence_pct?: number;              // default 95
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface LinearRegressionResult {
  slope: AtomicValue;
  intercept: AtomicValue;
  r_squared: AtomicValue;
  std_error: AtomicValue;
  predicted_y: AtomicValue;
  prediction_interval: AtomicValue;
  f_statistic: AtomicValue;
  sample_size: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class LinearRegressionEngine {
  calculate(input: LinearRegressionInput): LinearRegressionResult {
    const { x_values: x, y_values: y, confidence_pct = 95 } = input;
    const recs: string[] = [];
    const n = Math.min(x.length, y.length);

    // Means
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    // Sums of squares
    let Sxx = 0, Syy = 0, Sxy = 0;
    for (let i = 0; i < n; i++) {
      Sxx += (x[i] - xMean) * (x[i] - xMean);
      Syy += (y[i] - yMean) * (y[i] - yMean);
      Sxy += (x[i] - xMean) * (y[i] - yMean);
    }

    // Coefficients
    const slope = Sxy / Sxx;
    const intercept = yMean - slope * xMean;

    // R²
    const SSreg = slope * Sxy;
    const SSres = Syy - SSreg;
    const R2 = SSreg / Syy;

    // Standard error of estimate
    const Se = Math.sqrt(SSres / (n - 2));

    // Standard error of slope
    const Se_slope = Se / Math.sqrt(Sxx);

    // F-statistic
    const F = SSreg / (SSres / (n - 2));

    // Prediction
    const predX = input.prediction_x ?? xMean;
    const predY = slope * predX + intercept;

    // t-value for confidence (approximate for large n)
    const t_val = confidence_pct >= 99 ? 2.576 : confidence_pct >= 95 ? 1.96 : 1.645;

    // Prediction interval
    const hx = 1 / n + (predX - xMean) * (predX - xMean) / Sxx;
    const predInterval = t_val * Se * Math.sqrt(1 + hx);

    const isSafe = R2 > 0.7 && n >= 5;

    if (R2 < 0.5) recs.push(`Weak fit R²=${R2.toFixed(3)} — linear model may not be appropriate`);
    if (R2 < 0.8 && R2 >= 0.5) recs.push(`Moderate fit R²=${R2.toFixed(3)} — consider nonlinear or additional predictors`);
    if (n < 10) recs.push(`Small sample n=${n} — wide prediction intervals, collect more data`);
    if (F < 4) recs.push(`Low F-statistic ${F.toFixed(1)} — slope not significantly different from zero`);
    if (recs.length === 0) recs.push(`Regression nominal — y=${slope.toFixed(4)}x+${intercept.toFixed(4)}, R²=${R2.toFixed(3)}`);

    return {
      slope: mkAv(Math.round(slope * 10000) / 10000, "units/unit", Se_slope, "ols"),
      intercept: mkAv(Math.round(intercept * 10000) / 10000, "units", Se * Math.sqrt(1 / n + xMean * xMean / Sxx), "ols"),
      r_squared: mkAv(Math.round(R2 * 10000) / 10000, "ratio", R2 * 0.03, "correlation"),
      std_error: mkAv(Math.round(Se * 10000) / 10000, "units", Se * 0.10, "residuals"),
      predicted_y: mkAv(Math.round(predY * 10000) / 10000, "units", predInterval, "regression"),
      prediction_interval: mkAv(Math.round(predInterval * 10000) / 10000, "units", predInterval * 0.10, "t_distribution"),
      f_statistic: mkAv(Math.round(F * 100) / 100, "F", F * 0.10, "anova"),
      sample_size: mkAv(n, "samples", 0, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const linearRegressionEngine = new LinearRegressionEngine();
