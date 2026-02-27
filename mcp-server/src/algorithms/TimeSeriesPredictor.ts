/**
 * Time Series Predictor — Exponential Smoothing & Trend Forecasting
 *
 * Holt-Winters double exponential smoothing for manufacturing process trending.
 * Predicts future values based on level, trend, and optional seasonality.
 *
 * Manufacturing uses: tool wear progression forecasting, production rate trending,
 * energy consumption prediction, spare parts demand planning.
 *
 * References:
 * - Holt, C.C. (1957). "Forecasting Seasonals and Trends by EWMAs"
 * - Winters, P.R. (1960). "Forecasting Sales by Exponentially Weighted MAs"
 *
 * @module algorithms/TimeSeriesPredictor
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface TimeSeriesPredictorInput {
  /** Historical time series data. */
  data: number[];
  /** Number of future steps to predict. Default 5. */
  horizon?: number;
  /** Level smoothing alpha [0-1]. Default 0.3. */
  alpha?: number;
  /** Trend smoothing beta [0-1]. Default 0.1. */
  beta?: number;
  /** Include trend component. Default true. */
  use_trend?: boolean;
  /** Confidence level for prediction intervals [0-1]. Default 0.95. */
  confidence_level?: number;
}

export interface Forecast {
  step: number;
  value: number;
  lower: number;
  upper: number;
}

export interface TimeSeriesPredictorOutput extends WithWarnings {
  forecasts: Forecast[];
  level: number;
  trend: number;
  fitted_values: number[];
  mape: number;
  rmse: number;
  trend_direction: "increasing" | "decreasing" | "stable";
  calculation_method: string;
}

export class TimeSeriesPredictor implements Algorithm<TimeSeriesPredictorInput, TimeSeriesPredictorOutput> {

  validate(input: TimeSeriesPredictorInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.data?.length || input.data.length < 3) {
      issues.push({ field: "data", message: "At least 3 data points required", severity: "error" });
    }
    if ((input.alpha ?? 0.3) < 0 || (input.alpha ?? 0.3) > 1) {
      issues.push({ field: "alpha", message: "Must be in [0, 1]", severity: "error" });
    }
    if ((input.beta ?? 0.1) < 0 || (input.beta ?? 0.1) > 1) {
      issues.push({ field: "beta", message: "Must be in [0, 1]", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: TimeSeriesPredictorInput): TimeSeriesPredictorOutput {
    const warnings: string[] = [];
    const { data } = input;
    const horizon = input.horizon ?? 5;
    const alpha = input.alpha ?? 0.3;
    const beta = input.beta ?? 0.1;
    const useTrend = input.use_trend ?? true;
    const confLevel = input.confidence_level ?? 0.95;
    const n = data.length;

    // Initialize
    let level = data[0];
    let trend = useTrend && n >= 2 ? data[1] - data[0] : 0;
    const fitted: number[] = [level];
    const errors: number[] = [];

    // Holt's double exponential smoothing
    for (let t = 1; t < n; t++) {
      const forecast = level + trend;
      const newLevel = alpha * data[t] + (1 - alpha) * (level + trend);
      if (useTrend) {
        trend = beta * (newLevel - level) + (1 - beta) * trend;
      }
      level = newLevel;
      fitted.push(forecast);
      errors.push(Math.abs(data[t] - forecast));
    }

    // Error metrics
    const mape = errors.length > 0
      ? errors.reduce((s, e, i) => s + (data[i + 1] !== 0 ? e / Math.abs(data[i + 1]) : 0), 0) / errors.length * 100
      : 0;
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / Math.max(1, errors.length));

    // z-score for confidence interval
    const z = confLevel >= 0.99 ? 2.576 : confLevel >= 0.95 ? 1.96 : confLevel >= 0.90 ? 1.645 : 1.282;

    // Forecast
    const forecasts: Forecast[] = [];
    for (let h = 1; h <= horizon; h++) {
      const val = level + h * trend;
      const uncertainty = rmse * Math.sqrt(h) * z;
      forecasts.push({
        step: h,
        value: val,
        lower: val - uncertainty,
        upper: val + uncertainty,
      });
    }

    const trendDir = Math.abs(trend) < rmse * 0.1 ? "stable"
      : trend > 0 ? "increasing" : "decreasing";

    return {
      forecasts,
      level,
      trend,
      fitted_values: fitted,
      mape,
      rmse,
      trend_direction: trendDir,
      warnings,
      calculation_method: `Holt double exponential smoothing (α=${alpha}, β=${beta})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "time-series-predictor",
      name: "Time Series Predictor (Holt-Winters)",
      description: "Double exponential smoothing for manufacturing process forecasting",
      formula: "L(t) = α×y(t) + (1-α)×(L(t-1)+T(t-1)); T(t) = β×(L(t)-L(t-1)) + (1-β)×T(t-1)",
      reference: "Holt (1957); Winters (1960)",
      safety_class: "informational",
      domain: "ml",
      inputs: { data: "Historical observations", horizon: "Steps ahead", alpha: "Level smoothing" },
      outputs: { forecasts: "Predicted values with CI", mape: "Mean absolute % error", trend_direction: "Trend" },
    };
  }
}
