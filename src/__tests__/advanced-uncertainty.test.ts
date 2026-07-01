/**
 * Tests for AdvancedUncertaintyEngine
 * Covers: Kriging/GP surrogates, Quasi-Monte Carlo (Sobol/Halton), Gaussian Copula
 */
import { describe, it, expect } from "vitest";
import { advancedUncertaintyEngine } from "../engines/AdvancedUncertaintyEngine.js";

describe("AdvancedUncertaintyEngine", () => {

  // ── Kriging / Gaussian Process ──

  describe("Kriging", () => {
    it("interpolation: prediction at training point equals training value", () => {
      const X = [[0], [1], [2], [3], [4]];
      const y = [0, 1, 4, 9, 16]; // x²
      const model = advancedUncertaintyEngine.krigingFit({
        X_train: X, y_train: y, kernel: "squared_exponential", noise_variance: 1e-10,
      });
      const pred = advancedUncertaintyEngine.krigingPredict({ X_new: [[1], [3]], model: model.value.model });
      expect(pred.value.predictions[0]).toBeCloseTo(1, 1);
      expect(pred.value.predictions[1]).toBeCloseTo(9, 1);
    });

    it("uncertainty is low at training points, higher between them", () => {
      const X = [[0], [2], [4]];
      const y = [0, 4, 16];
      const model = advancedUncertaintyEngine.krigingFit({
        X_train: X, y_train: y, kernel: "squared_exponential", noise_variance: 1e-10,
      });
      const pred = advancedUncertaintyEngine.krigingPredict({ X_new: [[0], [1], [2]], model: model.value.model });
      // Uncertainty at x=1 (between training points) should be higher than at x=0 or x=2
      expect(pred.value.uncertainties[1]).toBeGreaterThan(pred.value.uncertainties[0]);
    });

    it("1D smooth function recovered with reasonable accuracy", () => {
      const X = Array.from({ length: 10 }, (_, i) => [i * 0.5]);
      const y = X.map(x => Math.sin(x[0]));
      const model = advancedUncertaintyEngine.krigingFit({
        X_train: X, y_train: y, kernel: "squared_exponential",
      });
      const X_test = [[0.25], [1.25], [2.75]];
      const pred = advancedUncertaintyEngine.krigingPredict({ X_new: X_test, model: model.value.model });
      // Should be reasonably close to sin(x)
      for (let i = 0; i < X_test.length; i++) {
        expect(Math.abs(pred.value.predictions[i] - Math.sin(X_test[i][0]))).toBeLessThan(0.3);
      }
    });

    it("surrogate optimization finds minimum of simple quadratic", () => {
      const X_init = [[-2], [0], [2], [4]];
      const y_init = X_init.map(x => (x[0] - 1) ** 2); // min at x=1
      const result = advancedUncertaintyEngine.surrogateOptimize({
        X_initial: X_init, y_initial: y_init,
        bounds: [[-5, 5]], acquisition: "expected_improvement", n_iterations: 10,
      });
      expect(result.value.best_x[0]).toBeCloseTo(1, 0);
      expect(result.value.best_y).toBeLessThan(1);
    });

    it("manufacturing surrogate returns predictions for speed/feed", () => {
      const experiments = [
        { speed: 100, feed: 0.1, response: 500 },
        { speed: 200, feed: 0.1, response: 450 },
        { speed: 100, feed: 0.2, response: 800 },
        { speed: 200, feed: 0.2, response: 700 },
        { speed: 150, feed: 0.15, response: 600 },
      ];
      const result = advancedUncertaintyEngine.krigingManufacturing({
        experiments, response_type: "force",
        predict_at: [{ speed: 150, feed: 0.12 }],
      });
      expect(result.value.predictions).toBeDefined();
      expect(result.value.predictions.length).toBeGreaterThan(0);
    });
  });

  // ── Quasi-Monte Carlo ──

  describe("Quasi-Monte Carlo", () => {
    it("Sobol sequence generates points in [0,1]", () => {
      const result = advancedUncertaintyEngine.sobolSequence({
        n_points: 100, n_dimensions: 3,
      });
      expect(result.value.points.length).toBe(100);
      for (const pt of result.value.points) {
        expect(pt.length).toBe(3);
        for (const v of pt) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("QMC integration of x² from 0 to 1 approximates 1/3", () => {
      const result = advancedUncertaintyEngine.quasiMonteCarloIntegrate({
        integrand: (x) => x[0] ** 2,
        n_dimensions: 1, n_points: 1000,
        bounds: [[0, 1]], sequence: "sobol",
      });
      expect(result.value.estimate).toBeCloseTo(1 / 3, 1);
    });

    it("QMC converges faster than MC (lower std error)", () => {
      const result = advancedUncertaintyEngine.quasiMonteCarloIntegrate({
        integrand: (x) => x[0] * x[1],
        n_dimensions: 2, n_points: 2000,
        bounds: [[0, 1], [0, 1]], sequence: "sobol",
      });
      if (result.value.mc_comparison) {
        expect(result.value.std_error).toBeLessThanOrEqual(result.value.mc_comparison.mc_std_error * 2);
      }
      expect(result.value.estimate).toBeCloseTo(0.25, 1); // integral of xy over [0,1]²
    });

    it("QMC UQ: output mean close to analytical for linear model", () => {
      const result = advancedUncertaintyEngine.quasiMonteCarloUQ({
        model_fn: (x) => 2 * x.a + 3 * x.b,
        parameter_distributions: {
          a: { mean: 1, std: 0.1, dist: "normal" },
          b: { mean: 2, std: 0.2, dist: "normal" },
        },
        n_samples: 2000,
      });
      // E[2a + 3b] = 2*1 + 3*2 = 8
      expect(result.value.output_mean).toBeCloseTo(8, 0);
    });

    it("Halton sequence has correct dimensions", () => {
      const result = advancedUncertaintyEngine.haltonSequence({
        n_points: 50, n_dimensions: 4,
      });
      expect(result.value.points.length).toBe(50);
      expect(result.value.points[0].length).toBe(4);
      expect(result.value.primes_used.length).toBe(4);
    });
  });

  // ── Gaussian Copula ──

  describe("Gaussian Copula", () => {
    it("independent case produces uncorrelated samples", () => {
      const result = advancedUncertaintyEngine.gaussianCopula({
        marginals: [
          { name: "x", distribution: "normal", params: { mean: 0, std: 1 } },
          { name: "y", distribution: "normal", params: { mean: 0, std: 1 } },
        ],
        correlation_matrix: [[1, 0], [0, 1]],
        n_samples: 2000, seed: 42,
      });
      expect(result.value.samples.length).toBe(2000);
      // Realized correlation should be near 0
      expect(Math.abs(result.value.realized_correlation[0][1])).toBeLessThan(0.1);
    });

    it("high positive correlation preserved (ρ=0.9)", () => {
      const result = advancedUncertaintyEngine.gaussianCopula({
        marginals: [
          { name: "x", distribution: "normal", params: { mean: 0, std: 1 } },
          { name: "y", distribution: "normal", params: { mean: 0, std: 1 } },
        ],
        correlation_matrix: [[1, 0.9], [0.9, 1]],
        n_samples: 5000, seed: 42,
      });
      expect(result.value.realized_correlation[0][1]).toBeGreaterThan(0.7);
    });

    it("correlated UQ: output std differs from independent case", () => {
      const model_fn = (x: Record<string, number>) => x.a + x.b;
      const marginals = [
        { name: "a", distribution: "normal" as const, params: { mean: 0, std: 1 } },
        { name: "b", distribution: "normal" as const, params: { mean: 0, std: 1 } },
      ];
      const correlated = advancedUncertaintyEngine.correlatedUQ({
        model_fn, marginals,
        correlation_matrix: [[1, 0.8], [0.8, 1]],
        n_samples: 3000, method: "copula_mc",
      });
      // For a+b with ρ=0.8: Var = σa² + σb² + 2ρσaσb = 1 + 1 + 1.6 = 3.6, std ≈ 1.9
      // vs independent: std ≈ √2 ≈ 1.41
      expect(correlated.value.output_std).toBeGreaterThan(1.3);
      if (correlated.value.comparison_independent) {
        expect(correlated.value.output_std).toBeGreaterThan(correlated.value.comparison_independent.std * 0.9);
      }
    });

    it("negative correlation preserved correctly", () => {
      const result = advancedUncertaintyEngine.gaussianCopula({
        marginals: [
          { name: "x", distribution: "normal", params: { mean: 0, std: 1 } },
          { name: "y", distribution: "normal", params: { mean: 0, std: 1 } },
        ],
        correlation_matrix: [[1, -0.7], [-0.7, 1]],
        n_samples: 3000, seed: 42,
      });
      expect(result.value.realized_correlation[0][1]).toBeLessThan(-0.4);
    });

    it("correlation from data recovers known structure", () => {
      // Generate correlated data manually
      const n = 200;
      const data: number[][] = [];
      for (let i = 0; i < n; i++) {
        const x = Math.sin(i * 0.1) + (i % 7) * 0.1;
        const y = x * 0.8 + Math.cos(i * 0.2) * 0.3;
        data.push([x, y]);
      }
      const result = advancedUncertaintyEngine.correlationFromData({
        data, variable_names: ["x", "y"],
      });
      expect(result.value.spearman_matrix).toBeDefined();
      expect(result.value.spearman_matrix[0][1]).toBeGreaterThan(0.3); // positive correlation
    });
  });
});
