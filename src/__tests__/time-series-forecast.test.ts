/**
 * Tests for TimeSeriesForecastEngine — ARIMA, Holt-Winters, Kaplan-Meier,
 * Nonparametric Tests, Rank Correlation
 */
import { describe, it, expect } from "vitest";
import { TimeSeriesForecastEngine } from "../engines/TimeSeriesForecastEngine.js";

const engine = new TimeSeriesForecastEngine();

describe("TimeSeriesForecastEngine", () => {
  // ── ARIMA ──────────────────────────────────────────────────────────
  describe("arima()", () => {
    it("should fit and forecast a simple AR(1) series", () => {
      // Generate AR(1): x(t) = 0.7*x(t-1) + noise
      const series = [10];
      for (let i = 1; i < 100; i++) {
        series.push(0.7 * series[i - 1] + 2 * Math.sin(i * 0.5));
      }
      const r = engine.arima({ series, p: 1, d: 0, q: 0, forecastHorizon: 5 });
      expect(r.arCoefficients).toHaveLength(1);
      expect(r.fitted).toHaveLength(series.length);
      expect(r.forecast).toHaveLength(5);
      expect(r.mse).toBeGreaterThan(0);
      expect(r.aic).toBeDefined();
    });

    it("should handle differencing (d=1)", () => {
      // Linear trend + noise → d=1 removes trend
      const series = Array.from({ length: 50 }, (_, i) => 2 * i + Math.sin(i));
      const r = engine.arima({ series, p: 1, d: 1, q: 0, forecastHorizon: 3 });
      expect(r.forecast).toHaveLength(3);
      // Forecast should continue upward trend
      expect(r.forecast[0]).toBeGreaterThan(series[40]);
    });

    it("should produce residuals", () => {
      const series = Array.from({ length: 60 }, (_, i) => 5 + Math.sin(i * 0.3));
      const r = engine.arima({ series, p: 2, d: 0, q: 0 });
      expect(r.residuals).toHaveLength(series.length);
    });
  });

  // ── Exponential Smoothing ─────────────────────────────────────────
  describe("exponentialSmoothing()", () => {
    it("simple: should smooth a noisy series", () => {
      const series = Array.from({ length: 30 }, (_, i) => 10 + 2 * Math.sin(i) + Math.random() * 0.5);
      const r = engine.exponentialSmoothing({
        series, method: "simple", alpha: 0.3, forecastHorizon: 5,
      });
      expect(r.fitted).toHaveLength(series.length);
      expect(r.forecast).toHaveLength(5);
      expect(r.level.length).toBeGreaterThan(0);
      expect(r.mse).toBeGreaterThan(0);
    });

    it("double (Holt): should capture trend", () => {
      const series = Array.from({ length: 40 }, (_, i) => 10 + 0.5 * i);
      const r = engine.exponentialSmoothing({
        series, method: "double", alpha: 0.5, beta: 0.3, forecastHorizon: 5,
      });
      expect(r.forecast).toHaveLength(5);
      expect(r.trend).toBeDefined();
      // Forecast should continue upward
      expect(r.forecast[4]).toBeGreaterThan(r.forecast[0]);
    });

    it("triple (Holt-Winters): should capture seasonality", () => {
      // Seasonal pattern with period 4
      const series: number[] = [];
      for (let i = 0; i < 24; i++) {
        series.push(10 + [0, 3, 1, -2][i % 4] + 0.2 * i);
      }
      const r = engine.exponentialSmoothing({
        series, method: "triple", alpha: 0.3, beta: 0.1, gamma: 0.2,
        seasonalPeriod: 4, forecastHorizon: 4,
      });
      expect(r.forecast).toHaveLength(4);
      expect(r.seasonal).toBeDefined();
    });
  });

  // ── Kaplan-Meier ──────────────────────────────────────────────────
  describe("kaplanMeier()", () => {
    it("should compute survival curve with censoring", () => {
      const r = engine.kaplanMeier({
        times: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        events: [true, false, true, true, false, true, false, true, true, false],
      });
      expect(r.survivalCurve.length).toBeGreaterThan(0);
      // S(0) ≈ 1, S(t) decreases
      expect(r.survivalCurve[0].survival).toBeLessThanOrEqual(1);
      expect(r.survivalCurve[r.survivalCurve.length - 1].survival)
        .toBeLessThan(r.survivalCurve[0].survival);
      expect(r.medianSurvival).toBeGreaterThan(0);
    });

    it("should handle all-failure data (no censoring)", () => {
      const r = engine.kaplanMeier({
        times: [5, 10, 15, 20, 25],
        events: [true, true, true, true, true],
      });
      expect(r.survivalCurve.length).toBeGreaterThan(0);
      // Last survival should be 0
      expect(r.survivalCurve[r.survivalCurve.length - 1].survival).toBe(0);
    });

    it("should perform log-rank test for two groups", () => {
      const r = engine.kaplanMeier({
        times: [1, 3, 5, 7, 9, 2, 8, 12, 15, 20],
        events: [true, true, true, true, true, true, true, true, true, true],
        groups: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      });
      expect(r.logRankTest).toBeDefined();
      expect(r.logRankTest!.chiSquare).toBeGreaterThanOrEqual(0);
      expect(typeof r.logRankTest!.significant).toBe("boolean");
    });

    it("should compute Greenwood variance", () => {
      const r = engine.kaplanMeier({
        times: [3, 5, 7, 10, 12],
        events: [true, true, false, true, true],
      });
      for (const point of r.survivalCurve) {
        expect(point.variance).toBeGreaterThanOrEqual(0);
        expect(point.atRisk).toBeGreaterThan(0);
      }
    });
  });

  // ── Nonparametric Tests ───────────────────────────────────────────
  describe("nonparametricTest()", () => {
    it("Mann-Whitney: should detect difference between groups", () => {
      const r = engine.nonparametricTest({
        test: "mann_whitney",
        samples: [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]],
        alpha: 0.05,
      });
      expect(r.testStatistic).toBeDefined();
      expect(r.pValue).toBeGreaterThanOrEqual(0);
      expect(r.pValue).toBeLessThanOrEqual(1);
      expect(r.testName).toContain("Mann");
      expect(r.significant).toBe(true); // clearly different
    });

    it("Mann-Whitney: should NOT reject for similar groups", () => {
      const r = engine.nonparametricTest({
        test: "mann_whitney",
        samples: [[1, 3, 5, 7, 9], [2, 4, 6, 8, 10]],
      });
      expect(r.significant).toBe(false);
    });

    it("Kruskal-Wallis: should test 3+ groups", () => {
      const r = engine.nonparametricTest({
        test: "kruskal_wallis",
        samples: [[1, 2, 3], [10, 11, 12], [20, 21, 22]],
        alpha: 0.05,
      });
      expect(r.testStatistic).toBeGreaterThan(0);
      expect(r.testName).toContain("Kruskal");
      expect(r.significant).toBe(true);
    });

    it("Wilcoxon signed-rank: should test paired samples", () => {
      const r = engine.nonparametricTest({
        test: "wilcoxon_signed_rank",
        samples: [[10, 12, 14, 16, 18], [11, 13, 15, 17, 19]],
      });
      expect(r.testStatistic).toBeDefined();
      expect(r.testName).toContain("Wilcoxon");
    });
  });

  // ── Rank Correlation ──────────────────────────────────────────────
  describe("rankCorrelation()", () => {
    it("Spearman: should detect perfect monotonic relationship", () => {
      const r = engine.rankCorrelation({
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100], // y = x² (monotonic)
        method: "spearman",
      });
      expect(r.coefficient).toBeCloseTo(1, 1);
      expect(r.n).toBe(10);
    });

    it("Kendall: should detect negative correlation", () => {
      const r = engine.rankCorrelation({
        x: [1, 2, 3, 4, 5],
        y: [5, 4, 3, 2, 1],
        method: "kendall",
      });
      expect(r.coefficient).toBeCloseTo(-1, 1);
    });

    it("should return p-value and significance", () => {
      const r = engine.rankCorrelation({
        x: [1, 2, 3, 4, 5, 6, 7, 8],
        y: [2, 1, 4, 3, 6, 5, 8, 7],
        method: "spearman",
      });
      expect(r.pValue).toBeGreaterThanOrEqual(0);
      expect(r.pValue).toBeLessThanOrEqual(1);
      expect(typeof r.significant).toBe("boolean");
    });
  });

  // ── Stats ─────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 5 methods", () => {
      const s = engine.stats();
      expect(s.methods).toHaveLength(5);
    });
  });
});
