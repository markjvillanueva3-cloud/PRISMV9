/**
 * Monte Carlo Engine — Unit Tests
 * @milestone AUDIT-FT-MC
 */
import { describe, it, expect } from "vitest";
import { monteCarloEngine } from "../engines/MonteCarloEngine.js";
describe("MonteCarloEngine", () => {
  describe("random distributions", () => {
    it("uniform produces values in range", () => {
      for (let i = 0; i < 100; i++) {
        const v = monteCarloEngine.random.uniform(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
      }
    });
    it("normal produces reasonable values", () => {
      const samples = Array.from({ length: 10000 },
        () => monteCarloEngine.random.normal(100, 10));
      const mean = samples.reduce((a, b) => a + b) / samples.length;
      expect(mean).toBeCloseTo(100, 0);
    });
    it("lognormalFromMeanCV produces positive values", () => {
      for (let i = 0; i < 100; i++) {
        expect(monteCarloEngine.random.lognormalFromMeanCV(50, 0.2))
          .toBeGreaterThan(0);
      }
    });
    it("weibull produces positive values", () => {
      for (let i = 0; i < 100; i++) {
        expect(monteCarloEngine.random.weibull(100, 2))
          .toBeGreaterThan(0);
      }
    });
    it("triangular stays within bounds", () => {
      for (let i = 0; i < 100; i++) {
        const v = monteCarloEngine.random.triangular(5, 8, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
      }
    });
    it("beta produces values in [0,1]", () => {
      for (let i = 0; i < 100; i++) {
        const v = monteCarloEngine.random.beta(2, 5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });
  describe("simulate", () => {
    it("runs simulation with correct sample count", () => {
      const r = monteCarloEngine.simulate(() => Math.random(), 1000);
      expect(r.sample_count).toBe(1000);
      expect(r.mean).toBeGreaterThan(0);
      expect(r.mean).toBeLessThan(1);
    });
    it("computes statistics correctly for known distribution", () => {
      // Constant model — all values = 42
      const r = monteCarloEngine.simulate(() => 42, 500);
      expect(r.mean).toBe(42);
      expect(r.median).toBe(42);
      expect(r.std_dev).toBe(0);
      expect(r.min).toBe(42);
      expect(r.max).toBe(42);
    });
    it("provides confidence intervals", () => {
      const r = monteCarloEngine.simulate(
        () => monteCarloEngine.random.normal(100, 10),
        5000,
      );
      expect(r.confidence_intervals.ci95.lower).toBeLessThan(100);
      expect(r.confidence_intervals.ci95.upper).toBeGreaterThan(100);
      // 95% CI should be tighter than 99% CI
      const ci95w = r.confidence_intervals.ci95.upper
        - r.confidence_intervals.ci95.lower;
      const ci99w = r.confidence_intervals.ci99.upper
        - r.confidence_intervals.ci99.lower;
      expect(ci95w).toBeLessThan(ci99w);
    });
    it("provides percentiles", () => {
      const r = monteCarloEngine.simulate(
        () => monteCarloEngine.random.normal(0, 1), 5000,
      );
      expect(r.percentiles.p5).toBeLessThan(r.percentiles.p50);
      expect(r.percentiles.p50).toBeLessThan(r.percentiles.p95);
    });
    it("clamps to min/max samples", () => {
      const r = monteCarloEngine.simulate(() => 1, 10);
      expect(r.sample_count).toBe(100); // MIN_SAMPLES
    });
  });
  describe("histogram", () => {
    it("generates bins with correct count", () => {
      const samples = Array.from({ length: 1000 }, () => Math.random());
      const h = monteCarloEngine.histogram(samples, 10);
      expect(h.bins).toHaveLength(10);
      expect(h.bin_edges).toHaveLength(11);
      expect(h.frequencies).toHaveLength(10);
      // All samples accounted for
      expect(h.bins.reduce((a, b) => a + b)).toBe(1000);
    });
    it("frequencies sum to ~1", () => {
      const samples = Array.from({ length: 5000 }, () => Math.random());
      const h = monteCarloEngine.histogram(samples, 20);
      const totalFreq = h.frequencies.reduce((a, b) => a + b);
      expect(totalFreq).toBeCloseTo(1, 1);
    });
  });
  describe("predictToolLife", () => {
    it("returns prediction with risk assessment", () => {
      // C must be V^(1/n) scale: n=0.25 → 1/n=4 → C~1e9
      const r = monteCarloEngine.predictToolLife({
        cutting_speed: 100, feedrate: 0.2, depth_of_cut: 2,
        taylor_C: 1e9, taylor_n: 0.25, samples: 2000,
      });
      expect(r.prediction.expected_min).toBeGreaterThan(0);
      expect(r.prediction.ci95_lower).toBeLessThan(
        r.prediction.ci95_upper,
      );
      expect(r.risk.safe_change_interval_min).toBeGreaterThan(0);
      expect(r.risk.prob_less_than_10min).toBeGreaterThanOrEqual(0);
      expect(r.risk.prob_less_than_10min).toBeLessThanOrEqual(1);
    });
    it("higher speed = shorter tool life", () => {
      const slow = monteCarloEngine.predictToolLife({
        cutting_speed: 100, taylor_C: 1e9, taylor_n: 0.25, samples: 2000,
      });
      const fast = monteCarloEngine.predictToolLife({
        cutting_speed: 200, taylor_C: 1e9, taylor_n: 0.25, samples: 2000,
      });
      expect(fast.prediction.expected_min)
        .toBeLessThan(slow.prediction.expected_min);
    });
  });
  describe("toleranceStackUp", () => {
    it("stacks dimensions with yield estimate", () => {
      const r = monteCarloEngine.toleranceStackUp({
        dimensions: [
          { name: "Length A", nominal: 50, tolerance: 0.1 },
          { name: "Length B", nominal: 30, tolerance: 0.05 },
          { name: "Length C", nominal: 20, tolerance: 0.08 },
        ],
        target_tolerance: 0.15,
        samples: 5000,
      });
      expect(r.nominal).toBe(100);
      expect(r.contributions).toHaveLength(3);
      expect(r.yield_estimate).toBeGreaterThanOrEqual(0);
      expect(r.yield_estimate).toBeLessThanOrEqual(1);
      expect(r.mean).toBeCloseTo(100, 0);
    });
    it("wider tolerances = lower yield", () => {
      const tight = monteCarloEngine.toleranceStackUp({
        dimensions: [
          { name: "A", nominal: 50, tolerance: 0.01 },
          { name: "B", nominal: 50, tolerance: 0.01 },
        ],
        target_tolerance: 0.015,
        samples: 5000,
      });
      const loose = monteCarloEngine.toleranceStackUp({
        dimensions: [
          { name: "A", nominal: 50, tolerance: 0.1 },
          { name: "B", nominal: 50, tolerance: 0.1 },
        ],
        target_tolerance: 0.015,
        samples: 5000,
      });
      expect(loose.yield_estimate).toBeLessThan(tight.yield_estimate);
    });
  });
  describe("analyzeResults edge cases", () => {
    it("handles empty array", () => {
      const r = monteCarloEngine.analyzeResults([]);
      expect(r.sample_count).toBe(0);
      expect(r.mean).toBe(0);
    });
    it("handles single value", () => {
      const r = monteCarloEngine.analyzeResults([42]);
      expect(r.mean).toBe(42);
      expect(r.min).toBe(42);
      expect(r.max).toBe(42);
    });
  });
});
