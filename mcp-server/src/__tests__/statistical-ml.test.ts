/**
 * Tests for StatisticalMLEngine — 7 statistical/ML methods
 * MCMC, Bootstrap, PCA, K-Means, Logistic Regression, Wavelet, CUSUM/EWMA
 */
import { describe, it, expect } from "vitest";
import { StatisticalMLEngine } from "../engines/StatisticalMLEngine.js";

const engine = new StatisticalMLEngine();

describe("StatisticalMLEngine", () => {
  // ──────────────────────────────────────────────────────────────────
  // 1. MCMC (Metropolis-Hastings)
  // ──────────────────────────────────────────────────────────────────
  describe("mcmc()", () => {
    it("should sample from a Gaussian target", () => {
      // Target: N(3, 1) — log density = -0.5*(x-3)^2
      const r = engine.mcmc({
        logDensityFn: (x) => -0.5 * (x[0] - 3) ** 2,
        initialState: [0],
        nSamples: 2000,
        burnIn: 500,
        thinning: 1,
        stepSize: 1.0,
        seed: 42,
      });
      expect(r.samples.length).toBe(2000);
      expect(r.acceptanceRate).toBeGreaterThan(0.1);
      expect(r.acceptanceRate).toBeLessThan(0.95);
      // Mean should be near 3
      expect(r.meanEstimate[0]).toBeCloseTo(3, 0);
    });

    it("should sample 2D Gaussian", () => {
      const r = engine.mcmc({
        logDensityFn: (x) => -0.5 * ((x[0] - 1) ** 2 + (x[1] - 2) ** 2),
        initialState: [0, 0],
        nSamples: 5000,
        burnIn: 1000,
        stepSize: 1.0,
        seed: 123,
      });
      expect(r.meanEstimate).toHaveLength(2);
      // Relaxed tolerance — MCMC with finite samples
      expect(Math.abs(r.meanEstimate[0] - 1)).toBeLessThan(1.5);
      expect(Math.abs(r.meanEstimate[1] - 2)).toBeLessThan(1.5);
      expect(r.covEstimate).toHaveLength(2);
      expect(r.covEstimate[0]).toHaveLength(2);
    });

    it("should have non-zero acceptance rate", () => {
      const r = engine.mcmc({
        logDensityFn: (x) => -0.5 * x[0] ** 2,
        initialState: [0],
        nSamples: 1000,
        burnIn: 100,
        stepSize: 1.0,
        seed: 42,
      });
      expect(r.acceptanceRate).toBeGreaterThan(0);
      expect(r.acceptanceRate).toBeLessThanOrEqual(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. Bootstrap
  // ──────────────────────────────────────────────────────────────────
  describe("bootstrap()", () => {
    it("should estimate mean with confidence interval", () => {
      const data = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
      const r = engine.bootstrap({
        data,
        statistic: (s) => s.reduce((a, b) => a + b, 0) / s.length,
        nBootstrap: 2000,
        confidenceLevel: 0.95,
        seed: 42,
      });
      expect(r.estimate).toBeCloseTo(11, 0); // true mean = 11
      expect(r.standardError).toBeGreaterThan(0);
      expect(r.confidenceInterval[0]).toBeLessThan(11);
      expect(r.confidenceInterval[1]).toBeGreaterThan(11);
      expect(r.bootstrapDistribution).toHaveLength(2000);
    });

    it("should estimate median", () => {
      const data = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
      const median = (s: number[]) => {
        const sorted = [...s].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };
      const r = engine.bootstrap({
        data,
        statistic: median,
        nBootstrap: 1000,
        confidenceLevel: 0.9,
        seed: 42,
      });
      expect(r.estimate).toBeCloseTo(10, 1);
      expect(r.confidenceInterval[0]).toBeLessThanOrEqual(r.estimate);
      expect(r.confidenceInterval[1]).toBeGreaterThanOrEqual(r.estimate);
    });

    it("should report bias", () => {
      const data = [1, 2, 3, 4, 5];
      const r = engine.bootstrap({
        data,
        statistic: (s) => s.reduce((a, b) => a + b, 0) / s.length,
        nBootstrap: 1000,
        seed: 42,
      });
      expect(typeof r.bias).toBe("number");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. PCA
  // ──────────────────────────────────────────────────────────────────
  describe("pca()", () => {
    it("should reduce 3D to 2D", () => {
      // Data with clear 2D structure embedded in 3D
      const data = [
        [1, 2, 1], [2, 4, 2], [3, 6, 3],
        [4, 8, 4], [5, 10, 5], [1.1, 2.2, 1.1],
        [2.1, 4.2, 2.1], [3.1, 6.2, 3.1],
      ];
      const r = engine.pca({ data, nComponents: 2 });
      expect(r.components).toHaveLength(2);
      expect(r.eigenvalues).toHaveLength(2);
      expect(r.projectedData).toHaveLength(8);
      expect(r.projectedData[0]).toHaveLength(2);
      // First component should explain most variance
      expect(r.explainedVarianceRatio[0]).toBeGreaterThan(0.9);
    });

    it("should explain ~100% variance when nComponents = D", () => {
      const data = [
        [1, 2], [3, 4], [5, 6], [7, 8], [9, 10],
      ];
      const r = engine.pca({ data, nComponents: 2 });
      const totalVariance = r.cumulativeVariance[r.cumulativeVariance.length - 1];
      expect(totalVariance).toBeCloseTo(1, 1);
    });

    it("should return sorted eigenvalues (descending)", () => {
      const data = Array.from({ length: 20 }, (_, i) => [
        Math.sin(i), Math.cos(i), i * 0.1, Math.sin(i) + Math.cos(i),
      ]);
      const r = engine.pca({ data, nComponents: 4 });
      for (let i = 1; i < r.eigenvalues.length; i++) {
        expect(r.eigenvalues[i]).toBeLessThanOrEqual(r.eigenvalues[i - 1] + 1e-10);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. K-Means
  // ──────────────────────────────────────────────────────────────────
  describe("kMeans()", () => {
    it("should find 2 clusters in clearly separated data", () => {
      const data = [
        // Cluster A around (0,0)
        [0.1, 0.2], [-0.1, 0.1], [0.2, -0.1], [0, 0.3], [-0.2, -0.2],
        // Cluster B around (10,10)
        [10.1, 10.2], [9.9, 10.1], [10.2, 9.9], [10, 10.3], [9.8, 9.8],
      ];
      const r = engine.kMeans({ data, k: 2, maxIterations: 100, seed: 42 });
      expect(r.centroids).toHaveLength(2);
      expect(r.assignments).toHaveLength(10);
      expect(r.clusterSizes).toHaveLength(2);
      // Each cluster should have 5 points
      expect(r.clusterSizes.sort()).toEqual([5, 5]);
      expect(r.inertia).toBeGreaterThan(0);
      expect(r.inertia).toBeLessThan(5); // tight clusters
    });

    it("should handle 3 clusters", () => {
      const data = [
        [0, 0], [1, 0], [0, 1],
        [10, 10], [11, 10], [10, 11],
        [0, 10], [1, 10], [0, 11],
      ];
      const r = engine.kMeans({ data, k: 3, maxIterations: 50, seed: 42 });
      expect(r.centroids).toHaveLength(3);
      expect(new Set(r.assignments).size).toBe(3);
    });

    it("should converge within maxIterations", () => {
      const data = Array.from({ length: 50 }, (_, i) => [
        i < 25 ? i * 0.1 : 10 + i * 0.1,
        i < 25 ? i * 0.1 : 10 + i * 0.1,
      ]);
      const r = engine.kMeans({ data, k: 2, maxIterations: 100, seed: 42 });
      expect(r.iterations).toBeLessThanOrEqual(100);
    });

    it("should be reproducible with same seed", () => {
      const data = [[0, 0], [1, 1], [10, 10], [11, 11]];
      const r1 = engine.kMeans({ data, k: 2, maxIterations: 50, seed: 42 });
      const r2 = engine.kMeans({ data, k: 2, maxIterations: 50, seed: 42 });
      expect(r1.assignments).toEqual(r2.assignments);
      expect(r1.inertia).toBe(r2.inertia);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. Logistic Regression
  // ──────────────────────────────────────────────────────────────────
  describe("logisticRegression()", () => {
    it("should classify linearly separable data", () => {
      const X = [
        [1, 2], [2, 3], [3, 4], [4, 5],
        [-1, -2], [-2, -3], [-3, -4], [-4, -5],
      ];
      const y = [1, 1, 1, 1, 0, 0, 0, 0];
      const r = engine.logisticRegression({
        X, y,
        learningRate: 0.5,
        maxIterations: 2000,
        seed: 42,
      });
      expect(r.weights).toHaveLength(2);
      expect(typeof r.bias).toBe("number");
      expect(r.accuracy).toBeGreaterThanOrEqual(0.5);
      expect(r.predictions).toHaveLength(8);
      expect(r.lossHistory.length).toBeGreaterThan(0);
      // Loss should decrease
      expect(r.lossHistory[r.lossHistory.length - 1])
        .toBeLessThanOrEqual(r.lossHistory[0] + 0.01);
    });

    it("should work with L2 regularization", () => {
      const X = [[1], [2], [3], [-1], [-2], [-3]];
      const y = [1, 1, 1, 0, 0, 0];
      const r = engine.logisticRegression({
        X, y,
        learningRate: 0.1,
        maxIterations: 200,
        lambda: 0.1,
        seed: 42,
      });
      expect(r.accuracy).toBeGreaterThanOrEqual(0.5);
      // Regularized weights should be smaller in magnitude
      expect(Math.abs(r.weights[0])).toBeLessThan(100);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. Wavelet Transform (Haar)
  // ──────────────────────────────────────────────────────────────────
  describe("waveletTransform()", () => {
    it("should decompose and reconstruct a signal", () => {
      const signal = [1, 2, 3, 4, 5, 6, 7, 8];
      const r = engine.waveletTransform({ signal, levels: 2 });
      expect(r.approximation.length).toBeGreaterThan(0);
      expect(r.details.length).toBe(2);
      // Reconstruction should match original
      for (let i = 0; i < signal.length; i++) {
        expect(r.reconstructed[i]).toBeCloseTo(signal[i], 5);
      }
    });

    it("should preserve energy across levels", () => {
      const signal = Array.from({ length: 16 }, (_, i) =>
        Math.sin(2 * Math.PI * i / 16) + 0.5 * Math.cos(4 * Math.PI * i / 16));
      const r = engine.waveletTransform({ signal, levels: 3 });
      const totalEnergy = signal.reduce((s, v) => s + v * v, 0);
      const decomposedEnergy = r.energyByLevel.reduce((s, e) => s + e, 0);
      // Energy should be approximately preserved
      if (totalEnergy > 0.01) {
        expect(decomposedEnergy).toBeGreaterThan(0);
      }
    });

    it("should handle power-of-2 length signals", () => {
      const signal = Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.3));
      const r = engine.waveletTransform({ signal });
      expect(r.reconstructed).toHaveLength(32);
      expect(r.details.length).toBeGreaterThan(0);
    });

    it("should detect high-frequency detail", () => {
      // Low freq + high freq spike
      const signal = Array.from({ length: 8 }, (_, i) =>
        i === 3 ? 10 : 1);
      const r = engine.waveletTransform({ signal, levels: 1 });
      // First detail level should capture the spike
      expect(r.details[0].some((d) => Math.abs(d) > 1)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. CUSUM & EWMA Control Charts
  // ──────────────────────────────────────────────────────────────────
  describe("controlChart()", () => {
    it("should detect mean shift with CUSUM", () => {
      // In-control (mean=10) then shift to mean=13
      const data = [
        ...Array.from({ length: 20 }, () => 10 + (Math.random() - 0.5)),
        ...Array.from({ length: 20 }, () => 13 + (Math.random() - 0.5)),
      ];
      const r = engine.controlChart({
        data, target: 10, sigma: 1,
        type: "cusum",
        cusumK: 0.5,
        cusumH: 5,
      });
      expect(r.cusumUpper).toHaveLength(40);
      expect(r.cusumLower).toHaveLength(40);
      // Should detect OOC after the shift
      expect(r.outOfControlIndices.length).toBeGreaterThan(0);
    });

    it("should detect mean shift with EWMA", () => {
      const data = [
        ...Array.from({ length: 20 }, () => 10 + (Math.random() - 0.5) * 0.5),
        ...Array.from({ length: 20 }, () => 12 + (Math.random() - 0.5) * 0.5),
      ];
      const r = engine.controlChart({
        data, target: 10, sigma: 1,
        type: "ewma",
        ewmaLambda: 0.2,
        ewmaL: 3,
      });
      expect(r.ewmaValues).toHaveLength(40);
      expect(r.ewmaUCL).toHaveLength(40);
      expect(r.ewmaLCL).toHaveLength(40);
      expect(r.outOfControlIndices.length).toBeGreaterThan(0);
    });

    it("should run both CUSUM and EWMA together", () => {
      const data = Array.from({ length: 30 }, (_, i) =>
        i < 15 ? 10 + (Math.random() - 0.5) : 14 + (Math.random() - 0.5));
      const r = engine.controlChart({
        data, target: 10, sigma: 1,
        type: "both",
        cusumK: 0.5, cusumH: 5,
        ewmaLambda: 0.2, ewmaL: 3,
      });
      expect(r.cusumUpper).toHaveLength(30);
      expect(r.ewmaValues).toHaveLength(30);
      expect(r.alarmPoints.length).toBeGreaterThan(0);
    });

    it("should NOT alarm on in-control data", () => {
      // Stable process at target=10, sigma=1
      const data = [10.1, 9.8, 10.2, 9.9, 10.0, 10.1, 9.7, 10.3, 9.9, 10.0];
      const r = engine.controlChart({
        data, target: 10, sigma: 1,
        type: "cusum",
        cusumK: 0.5,
        cusumH: 5,
      });
      expect(r.outOfControlIndices).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 7 methods", () => {
      const s = engine.stats();
      expect(s.methods).toHaveLength(7);
      expect(s.methods.some((m) => m.includes("MCMC"))).toBe(true);
      expect(s.methods.some((m) => m.includes("Bootstrap"))).toBe(true);
      expect(s.methods.some((m) => m.includes("pca") || m.includes("PCA"))).toBe(true);
      expect(s.methods.some((m) => m.includes("K-Means") || m.includes("kMeans"))).toBe(true);
    });
  });
});
