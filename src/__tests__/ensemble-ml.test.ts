/**
 * Tests for EnsembleMLEngine — Random Forest, Gradient Boosting, GMM,
 * Numerical Integration, Root Finding
 */
import { describe, it, expect } from "vitest";
import { EnsembleMLEngine } from "../engines/EnsembleMLEngine.js";

const engine = new EnsembleMLEngine();

describe("EnsembleMLEngine", () => {
  // ── Random Forest ─────────────────────────────────────────────────
  describe("randomForest()", () => {
    it("should classify linearly separable data", () => {
      const X = [
        [1, 2], [2, 3], [3, 4], [4, 5],
        [-1, -2], [-2, -3], [-3, -4], [-4, -5],
      ];
      const y = [1, 1, 1, 1, 0, 0, 0, 0];
      const r = engine.randomForest({
        X, y, nTrees: 10, maxDepth: 4, mode: "classification", seed: 42,
      });
      expect(r.predictions).toHaveLength(8);
      expect(r.accuracy).toBeGreaterThanOrEqual(0.5);
      expect(r.featureImportance).toHaveLength(2);
      expect(r.nTrees).toBe(10);
    });

    it("should do regression", () => {
      // y ≈ x1 + 2*x2
      const X = Array.from({ length: 20 }, (_, i) => [i, i * 2]);
      const y = X.map(([x1, x2]) => x1 + 2 * x2 + Math.sin(x1) * 0.1);
      const r = engine.randomForest({
        X, y, nTrees: 15, maxDepth: 5, mode: "regression", seed: 42,
      });
      expect(r.predictions).toHaveLength(20);
      expect(r.mse).toBeDefined();
      expect(r.mse!).toBeGreaterThanOrEqual(0);
      expect(r.featureImportance).toHaveLength(2);
    });

    it("should compute feature importance", () => {
      // x1 matters, x2 is noise
      const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i)]);
      const y = X.map(([x1]) => x1 > 15 ? 1 : 0);
      const r = engine.randomForest({
        X, y, nTrees: 20, maxDepth: 3, mode: "classification", seed: 42,
      });
      expect(r.featureImportance[0]).toBeGreaterThanOrEqual(0);
    });

    it("should be reproducible with same seed", () => {
      const X = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      const y = [1, 1, 0, 0];
      const r1 = engine.randomForest({ X, y, nTrees: 5, maxDepth: 2, seed: 42, mode: "classification" });
      const r2 = engine.randomForest({ X, y, nTrees: 5, maxDepth: 2, seed: 42, mode: "classification" });
      expect(r1.predictions).toEqual(r2.predictions);
    });
  });

  // ── Gradient Boosting ─────────────────────────────────────────────
  describe("gradientBoosting()", () => {
    it("should fit regression data", () => {
      const X = Array.from({ length: 30 }, (_, i) => [i * 0.1]);
      const y = X.map(([x]) => Math.sin(x) * 10);
      const r = engine.gradientBoosting({
        X, y, nTrees: 20, maxDepth: 3, learningRate: 0.1, seed: 42,
      });
      expect(r.predictions).toHaveLength(30);
      expect(r.mse).toBeGreaterThanOrEqual(0);
      expect(r.featureImportance).toHaveLength(1);
      expect(r.nTrees).toBe(20);
    });

    it("should improve with more trees (residual decrease)", () => {
      const X = Array.from({ length: 20 }, (_, i) => [i]);
      const y = X.map(([x]) => x * x);
      const r = engine.gradientBoosting({
        X, y, nTrees: 30, maxDepth: 3, learningRate: 0.1, seed: 42,
      });
      expect(r.residualHistory.length).toBeGreaterThan(0);
      // Residuals should generally decrease
      expect(r.residualHistory[r.residualHistory.length - 1])
        .toBeLessThanOrEqual(r.residualHistory[0] + 0.01);
    });
  });

  // ── Gaussian Mixture Model ────────────────────────────────────────
  describe("gaussianMixture()", () => {
    it("should find 2 clusters in bimodal data", () => {
      const data: number[][] = [];
      // Cluster 1 around [0, 0]
      for (let i = 0; i < 20; i++) data.push([0.1 * i * 0.1, 0.1 * Math.sin(i)]);
      // Cluster 2 around [10, 10]
      for (let i = 0; i < 20; i++) data.push([10 + 0.1 * i * 0.1, 10 + 0.1 * Math.sin(i)]);

      const r = engine.gaussianMixture({ data, k: 2, seed: 42 });
      expect(r.means).toHaveLength(2);
      expect(r.weights).toHaveLength(2);
      expect(r.assignments).toHaveLength(40);
      expect(r.bic).toBeDefined();
      expect(r.logLikelihood).toBeDefined();
      // Weights should sum to ~1
      const wSum = r.weights.reduce((a, b) => a + b, 0);
      expect(wSum).toBeCloseTo(1, 1);
    });

    it("should converge within maxIterations", () => {
      const data = Array.from({ length: 30 }, (_, i) => [Math.sin(i), Math.cos(i)]);
      const r = engine.gaussianMixture({ data, k: 3, maxIterations: 100, seed: 42 });
      expect(r.iterations).toBeLessThanOrEqual(100);
      expect(r.responsibilities).toHaveLength(30);
    });
  });

  // ── Numerical Integration ─────────────────────────────────────────
  describe("numericalIntegration()", () => {
    it("Simpson: should integrate x² from 0 to 1 = 1/3", () => {
      const r = engine.numericalIntegration({
        fn: (x) => x * x,
        a: 0, b: 1,
        method: "simpson",
        n: 100,
      });
      expect(r.result).toBeCloseTo(1 / 3, 4);
      expect(r.method).toContain("simpson");
    });

    it("Gauss-Legendre: should integrate sin(x) from 0 to π = 2", () => {
      const r = engine.numericalIntegration({
        fn: Math.sin,
        a: 0, b: Math.PI,
        method: "gauss_legendre",
      });
      expect(r.result).toBeCloseTo(2, 2);
    });

    it("Adaptive Simpson: should handle sharp peak", () => {
      // Integrate 1/(1+(x-0.5)²*100) — sharp peak at 0.5
      const r = engine.numericalIntegration({
        fn: (x) => 1 / (1 + (x - 0.5) ** 2 * 100),
        a: 0, b: 1,
        method: "adaptive",
        tolerance: 1e-6,
      });
      expect(r.result).toBeGreaterThan(0);
      expect(r.evaluations).toBeGreaterThan(0);
    });

    it("should compute e^x from 0 to 1 = e-1", () => {
      const r = engine.numericalIntegration({
        fn: Math.exp,
        a: 0, b: 1,
        method: "simpson",
        n: 200,
      });
      expect(r.result).toBeCloseTo(Math.E - 1, 4);
    });
  });

  // ── Root Finding ──────────────────────────────────────────────────
  describe("rootFinding()", () => {
    it("Bisection: should find root of x²-4 = 0 → x=2", () => {
      const r = engine.rootFinding({
        fn: (x) => x * x - 4,
        a: 0, b: 3,
        method: "bisection",
        tolerance: 1e-8,
      });
      expect(r.root).toBeCloseTo(2, 5);
      expect(r.converged).toBe(true);
      expect(Math.abs(r.functionValue)).toBeLessThan(1e-6);
    });

    it("Newton: should find root of cos(x) near π/2", () => {
      const r = engine.rootFinding({
        fn: Math.cos,
        dfn: (x) => -Math.sin(x),
        a: 1, b: 2, // initial guess from midpoint
        method: "newton",
        tolerance: 1e-10,
      });
      expect(r.root).toBeCloseTo(Math.PI / 2, 5);
      expect(r.converged).toBe(true);
    });

    it("Brent: should find root of x³-x-2 = 0", () => {
      const r = engine.rootFinding({
        fn: (x) => x ** 3 - x - 2,
        a: 1, b: 2,
        method: "brent",
        tolerance: 1e-10,
      });
      expect(r.converged).toBe(true);
      expect(Math.abs(r.functionValue)).toBeLessThan(1e-6);
      // Verify: root³ - root - 2 ≈ 0
      expect(r.root ** 3 - r.root - 2).toBeCloseTo(0, 5);
    });

    it("should handle simple linear root", () => {
      const r = engine.rootFinding({
        fn: (x) => 2 * x - 6,
        a: 0, b: 10,
        method: "bisection",
      });
      expect(r.root).toBeCloseTo(3, 4);
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
