/**
 * Tests for TimeSeriesCompletionEngine
 * 22 tests covering Holt-Winters, ARIMAX, Change Point Detection,
 * Regime Switching, Exponential Smoothing, and Seasonal Decomposition.
 */

import { describe, it, expect } from "vitest";
import { timeSeriesCompletionEngine } from "../engines/TimeSeriesCompletionEngine.js";

// Helper: generate seasonal data
function seasonalData(
  n: number, period: number, amplitude: number, trend: number, noise: number
): number[] {
  const data: number[] = [];
  for (let i = 0; i < n; i++) {
    const seasonal = amplitude * Math.sin((2 * Math.PI * i) / period);
    const t = trend * i;
    const e = noise * (Math.sin(i * 7.3) * 0.5 + Math.cos(i * 3.1) * 0.5); // deterministic pseudo-noise
    data.push(100 + t + seasonal + e);
  }
  return data;
}

// ============================================================================
// HOLT-WINTERS
// ============================================================================

describe("TimeSeriesCompletionEngine — Holt-Winters", () => {
  it("1. Additive: captures seasonal pattern", () => {
    const data = seasonalData(48, 12, 10, 0.5, 1);
    const result = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 12,
      method: "additive",
    });

    expect(result.forecast).toHaveLength(12);
    expect(result.fitted).toHaveLength(data.length);
    expect(result.seasonal).toHaveLength(data.length);
    // Seasonal component should have meaningful variation
    const sRange = Math.max(...result.seasonal) - Math.min(...result.seasonal);
    expect(sRange).toBeGreaterThan(1);
  });

  it("2. Forecast horizon matches request", () => {
    const data = seasonalData(36, 6, 5, 0, 0.5);
    const result = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 6,
      forecast_horizon: 18,
    });

    expect(result.forecast).toHaveLength(18);
  });

  it("3. Auto-optimize produces lower MSE than defaults", () => {
    const data = seasonalData(48, 12, 8, 0.3, 2);

    const autoResult = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 12,
      auto_optimize: true,
    });

    const defaultResult = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 12,
      alpha: 0.5,
      beta: 0.5,
      gamma: 0.5,
      auto_optimize: false,
    });

    expect(autoResult.mse).toBeLessThanOrEqual(defaultResult.mse + 1e-6);
  });

  it("4. Multiplicative: handles growing amplitude", () => {
    // Multiplicative seasonal: amplitude grows with level
    const data: number[] = [];
    for (let i = 0; i < 48; i++) {
      const level = 50 + 2 * i;
      const seasonal = 1 + 0.2 * Math.sin((2 * Math.PI * i) / 12);
      data.push(level * seasonal);
    }

    const result = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 12,
      method: "multiplicative",
    });

    expect(result.forecast).toHaveLength(12);
    expect(result.mse).toBeLessThan(1e6);
  });

  it("5. MSE, MAE, MAPE all positive", () => {
    const data = seasonalData(36, 6, 5, 0.2, 1);
    const result = timeSeriesCompletionEngine.holtWinters({
      data,
      seasonal_period: 6,
    });

    expect(result.mse).toBeGreaterThan(0);
    expect(result.mae).toBeGreaterThan(0);
    expect(result.mape).toBeGreaterThan(0);
  });
});

// ============================================================================
// ARIMAX
// ============================================================================

describe("TimeSeriesCompletionEngine — ARIMAX", () => {
  it("6. AR(1): forecast reverts toward mean", () => {
    // AR(1) with phi=0.8, mean=50
    const y: number[] = [50];
    for (let i = 1; i < 100; i++) {
      y.push(50 + 0.8 * (y[i - 1] - 50) + Math.sin(i) * 2);
    }

    const result = timeSeriesCompletionEngine.arimaxForecast({
      y,
      order: [1, 0, 0],
      forecast_horizon: 20,
    });

    expect(result.forecast).toHaveLength(20);
    // Forecast should revert toward mean
    const lastForecast = result.forecast[result.forecast.length - 1];
    const meanY = y.reduce((s, v) => s + v, 0) / y.length;
    expect(Math.abs(lastForecast - meanY)).toBeLessThan(Math.abs(y[y.length - 1] - meanY) + 20);
  });

  it("7. Exogenous: coefficients capture linear effect", () => {
    const n = 100;
    const exog = Array.from({ length: n }, (_, i) => [i]);
    const y = exog.map(([x]) => 10 + 2 * x + Math.sin(x) * 0.5);

    const result = timeSeriesCompletionEngine.arimaxForecast({
      y,
      exog,
      order: [1, 0, 0],
      forecast_horizon: 5,
      exog_future: [[100], [101], [102], [103], [104]],
    });

    expect(result.exog_coefficients).toBeDefined();
    expect(result.exog_coefficients!.length).toBe(1);
    // Coefficient should be roughly positive (capturing the slope)
    expect(result.exog_coefficients![0]).toBeGreaterThan(0);
  });

  it("8. AIC/BIC computed and finite", () => {
    const y = Array.from({ length: 50 }, (_, i) => 10 + Math.sin(i / 5) * 3);
    const result = timeSeriesCompletionEngine.arimaxForecast({
      y,
      order: [2, 0, 1],
    });

    expect(Number.isFinite(result.aic)).toBe(true);
    expect(Number.isFinite(result.bic)).toBe(true);
  });

  it("9. Forecast CI widens with horizon", () => {
    const y = Array.from({ length: 80 }, (_, i) => 50 + Math.sin(i / 3) * 5);
    const result = timeSeriesCompletionEngine.arimaxForecast({
      y,
      order: [1, 1, 0],
      forecast_horizon: 10,
    });

    const [lower, upper] = result.forecast_ci_95;
    expect(lower).toHaveLength(10);
    expect(upper).toHaveLength(10);

    // CI width should increase
    const width1 = upper[0] - lower[0];
    const width10 = upper[9] - lower[9];
    expect(width10).toBeGreaterThan(width1);
  });
});

// ============================================================================
// CHANGE POINT DETECTION
// ============================================================================

describe("TimeSeriesCompletionEngine — Change Point Detection", () => {
  it("10. Detects single mean shift in synthetic data", () => {
    // Mean of 10 for first 50 points, then 20 for next 50
    const data = [
      ...Array.from({ length: 50 }, (_, i) => 10 + Math.sin(i) * 0.5),
      ...Array.from({ length: 50 }, (_, i) => 20 + Math.sin(i) * 0.5),
    ];

    const result = timeSeriesCompletionEngine.changePointDetection({
      data,
      method: "pelt",
    });

    expect(result.n_changepoints).toBeGreaterThanOrEqual(1);
    // At least one changepoint near index 50
    const nearTarget = result.changepoints.some(cp => Math.abs(cp - 50) < 10);
    expect(nearTarget).toBe(true);
  });

  it("11. No false changepoint for constant data", () => {
    const data = Array.from({ length: 100 }, () => 42);

    const result = timeSeriesCompletionEngine.changePointDetection({
      data,
      method: "pelt",
    });

    expect(result.n_changepoints).toBe(0);
  });

  it("12. PELT finds multiple changepoints", () => {
    const data = [
      ...Array.from({ length: 30 }, () => 10),
      ...Array.from({ length: 30 }, () => 30),
      ...Array.from({ length: 30 }, () => 15),
    ];

    const result = timeSeriesCompletionEngine.changePointDetection({
      data,
      method: "pelt",
    });

    expect(result.n_changepoints).toBeGreaterThanOrEqual(2);
    expect(result.segment_means.length).toBe(result.n_changepoints + 1);
  });

  it("13. Binary segmentation gives similar results", () => {
    const data = [
      ...Array.from({ length: 40 }, (_, i) => 5 + Math.sin(i) * 0.3),
      ...Array.from({ length: 40 }, (_, i) => 25 + Math.sin(i) * 0.3),
    ];

    const result = timeSeriesCompletionEngine.changePointDetection({
      data,
      method: "binary_segmentation",
    });

    expect(result.n_changepoints).toBeGreaterThanOrEqual(1);
    const nearTarget = result.changepoints.some(cp => Math.abs(cp - 40) < 10);
    expect(nearTarget).toBe(true);
  });

  it("14. Confidence > 0 for detected changepoints", () => {
    const data = [
      ...Array.from({ length: 50 }, () => 10),
      ...Array.from({ length: 50 }, () => 50),
    ];

    const result = timeSeriesCompletionEngine.changePointDetection({
      data,
      method: "pelt",
    });

    if (result.n_changepoints > 0) {
      for (const conf of result.confidence) {
        expect(conf).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// REGIME SWITCHING
// ============================================================================

describe("TimeSeriesCompletionEngine — Regime Switching", () => {
  it("15. Two regimes: different means recovered", () => {
    // Alternating regimes
    const data: number[] = [];
    let regime = 0;
    for (let i = 0; i < 200; i++) {
      if (i % 40 === 0) regime = 1 - regime;
      data.push(regime === 0 ? 10 + Math.sin(i) * 0.5 : 30 + Math.sin(i) * 0.5);
    }

    const result = timeSeriesCompletionEngine.regimeSwitching({ data, n_regimes: 2 });

    expect(result.regime_means).toHaveLength(2);
    // Means should be distinguishable
    const meanDiff = Math.abs(result.regime_means[0] - result.regime_means[1]);
    expect(meanDiff).toBeGreaterThan(5);
  });

  it("16. Transition matrix rows sum to 1", () => {
    const data = Array.from({ length: 100 }, (_, i) =>
      i < 50 ? 10 + Math.sin(i) : 20 + Math.sin(i)
    );

    const result = timeSeriesCompletionEngine.regimeSwitching({ data });

    for (const row of result.transition_matrix) {
      const rowSum = row.reduce((s, v) => s + v, 0);
      expect(rowSum).toBeCloseTo(1, 1);
    }
  });

  it("17. Expected durations positive and finite", () => {
    const data = Array.from({ length: 100 }, (_, i) =>
      i % 30 < 15 ? 5 + Math.sin(i) * 0.3 : 15 + Math.sin(i) * 0.3
    );

    const result = timeSeriesCompletionEngine.regimeSwitching({ data });

    for (const dur of result.expected_duration) {
      expect(dur).toBeGreaterThan(0);
      expect(Number.isFinite(dur)).toBe(true);
    }
  });
});

// ============================================================================
// EXPONENTIAL SMOOTHING
// ============================================================================

describe("TimeSeriesCompletionEngine — Exponential Smoothing", () => {
  it("18. Simple ES: forecast is constant (no trend)", () => {
    const data = [10, 12, 11, 13, 12, 14, 11, 13, 12, 10];
    const result = timeSeriesCompletionEngine.exponentialSmoothing({
      data,
      method: "simple",
      forecast_horizon: 5,
    });

    // All forecast values should be identical (last level)
    const firstForecast = result.forecast[0];
    for (const f of result.forecast) {
      expect(f).toBeCloseTo(firstForecast, 10);
    }
  });

  it("19. Double ES: forecast has linear trend", () => {
    const data = Array.from({ length: 20 }, (_, i) => 10 + 2 * i);
    const result = timeSeriesCompletionEngine.exponentialSmoothing({
      data,
      method: "double",
      forecast_horizon: 5,
    });

    // Forecast should be increasing
    for (let i = 1; i < result.forecast.length; i++) {
      expect(result.forecast[i]).toBeGreaterThan(result.forecast[i - 1]);
    }
  });

  it("20. Damped trend levels off", () => {
    const data = Array.from({ length: 30 }, (_, i) => 10 + 3 * i);
    const result = timeSeriesCompletionEngine.exponentialSmoothing({
      data,
      method: "damped",
      phi: 0.8,
      forecast_horizon: 50,
    });

    // Increments should decrease
    const diffs: number[] = [];
    for (let i = 1; i < result.forecast.length; i++) {
      diffs.push(result.forecast[i] - result.forecast[i - 1]);
    }
    // Later diffs should be smaller than early ones
    expect(diffs[diffs.length - 1]).toBeLessThan(diffs[0]);
  });
});

// ============================================================================
// SEASONAL DECOMPOSITION
// ============================================================================

describe("TimeSeriesCompletionEngine — Seasonal Decomposition", () => {
  it("21. Components sum to original (additive)", () => {
    const data = seasonalData(48, 12, 10, 0.5, 1);
    const result = timeSeriesCompletionEngine.seasonalDecomposition({
      data,
      period: 12,
      method: "additive",
    });

    // trend + seasonal + residual ≈ original
    for (let i = 6; i < data.length - 6; i++) {
      const reconstructed = result.trend[i] + result.seasonal[i] + result.residual[i];
      expect(reconstructed).toBeCloseTo(data[i], 1);
    }
  });

  it("22. Seasonal repeats with given period", () => {
    const data = seasonalData(60, 12, 15, 0, 0);
    const result = timeSeriesCompletionEngine.seasonalDecomposition({
      data,
      period: 12,
    });

    // Seasonal component at position i should equal position i + period
    for (let i = 0; i < data.length - 12; i++) {
      expect(result.seasonal[i]).toBeCloseTo(result.seasonal[i + 12], 5);
    }

    expect(result.seasonal_strength).toBeGreaterThan(0);
  });
});
