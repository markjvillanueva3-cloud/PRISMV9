/**
 * MultipleRegressionEngine — Unit Tests (15 tests)
 * OLS regression, ridge, polynomial, stepwise, diagnostics.
 */
import { describe, it, expect } from "vitest";
import { multipleRegressionEngine } from "../engines/MultipleRegressionEngine.js";

describe("MultipleRegressionEngine", () => {

  describe("fit", () => {

    it("perfect linear fit: R² = 1.0 for y = 2x₁ + 3x₂ + 1", () => {
      const X = [
        [1, 0], [0, 1], [1, 1], [2, 1], [1, 2],
        [3, 0], [0, 3], [2, 2], [3, 1], [1, 3],
      ];
      const y = X.map(([x1, x2]) => 2 * x1 + 3 * x2 + 1);
      const model = multipleRegressionEngine.fit({ X, y });
      expect(model.r_squared).toBeCloseTo(1.0, 5);
    });

    it("coefficients match known values (2, 3, intercept=1)", () => {
      const X = [
        [1, 0], [0, 1], [1, 1], [2, 1], [1, 2],
        [3, 0], [0, 3], [2, 2], [3, 1], [1, 3],
      ];
      const y = X.map(([x1, x2]) => 2 * x1 + 3 * x2 + 1);
      const model = multipleRegressionEngine.fit({ X, y });
      expect(model.coefficients[0]).toBeCloseTo(2, 3);
      expect(model.coefficients[1]).toBeCloseTo(3, 3);
      expect(model.intercept).toBeCloseTo(1, 3);
    });

    it("R² between 0 and 1 for noisy data", () => {
      const rng = mulberry32(42);
      const X = Array.from({ length: 50 }, () => [rng() * 10, rng() * 10]);
      const y = X.map(([x1, x2]) => 2 * x1 + 3 * x2 + 1 + (rng() - 0.5) * 5);
      const model = multipleRegressionEngine.fit({ X, y });
      expect(model.r_squared).toBeGreaterThan(0);
      expect(model.r_squared).toBeLessThanOrEqual(1);
    });

    it("adjusted R² ≤ R²", () => {
      const rng = mulberry32(77);
      const X = Array.from({ length: 30 }, () => [rng() * 10, rng() * 10, rng() * 10]);
      const y = X.map(([x1, x2]) => x1 + x2 + (rng() - 0.5) * 2);
      const model = multipleRegressionEngine.fit({ X, y });
      expect(model.adjusted_r_squared).toBeLessThanOrEqual(model.r_squared + 1e-10);
    });

    it("residuals sum to ~0 with intercept", () => {
      const rng = mulberry32(55);
      const X = Array.from({ length: 20 }, () => [rng() * 10]);
      const y = X.map(([x]) => 3 * x + 2 + (rng() - 0.5));
      const model = multipleRegressionEngine.fit({ X, y });
      const residSum = model.residuals.reduce((a, b) => a + b, 0);
      expect(Math.abs(residSum)).toBeLessThan(1e-6);
    });

    it("AIC/BIC lower for better models", () => {
      const rng = mulberry32(123);
      const X = Array.from({ length: 50 }, () => [rng() * 10, rng() * 10, rng() * 10]);
      const y = X.map(([x1]) => 5 * x1 + 1 + (rng() - 0.5) * 0.5);

      // Good model: uses x1
      const Xgood = X.map(row => [row[0]]);
      const goodModel = multipleRegressionEngine.fit({ X: Xgood, y });

      // Bad model: uses only x3 (irrelevant)
      const Xbad = X.map(row => [row[2]]);
      const badModel = multipleRegressionEngine.fit({ X: Xbad, y });

      expect(goodModel.aic).toBeLessThan(badModel.aic);
      expect(goodModel.bic).toBeLessThan(badModel.bic);
    });
  });

  describe("predict", () => {

    it("prediction matches for new data", () => {
      const X = [
        [1, 0], [0, 1], [1, 1], [2, 1], [1, 2],
        [3, 0], [0, 3], [2, 2], [3, 1], [1, 3],
      ];
      const y = X.map(([x1, x2]) => 2 * x1 + 3 * x2 + 1);
      const model = multipleRegressionEngine.fit({ X, y });

      const pred = multipleRegressionEngine.predict([[5, 5]], model);
      expect(pred.predictions[0]).toBeCloseTo(2 * 5 + 3 * 5 + 1, 2);
    });

    it("CI contains true value (perfect fit case)", () => {
      const X = Array.from({ length: 20 }, (_, i) => [i, i * 2]);
      const y = X.map(([x1, x2]) => x1 + x2 + 5);
      const model = multipleRegressionEngine.fit({ X, y });
      const pred = multipleRegressionEngine.predict([[10, 20]], model);
      const trueVal = 10 + 20 + 5;
      expect(pred.ci_95.lower[0]).toBeLessThanOrEqual(trueVal + 0.1);
      expect(pred.ci_95.upper[0]).toBeGreaterThanOrEqual(trueVal - 0.1);
    });

    it("single predictor degrades to simple regression", () => {
      const X = Array.from({ length: 20 }, (_, i) => [i + 1]);
      const y = X.map(([x]) => 3 * x + 7);
      const model = multipleRegressionEngine.fit({ X, y });
      expect(model.coefficients[0]).toBeCloseTo(3, 3);
      expect(model.intercept).toBeCloseTo(7, 3);
      expect(model.r_squared).toBeCloseTo(1.0, 5);
    });
  });

  describe("diagnostics", () => {

    it("VIF detects multicollinearity (correlated predictors → VIF > 5)", () => {
      const rng = mulberry32(42);
      // x2 ≈ 2*x1 + small noise → highly collinear
      const X = Array.from({ length: 50 }, () => {
        const x1 = rng() * 10;
        return [x1, 2 * x1 + (rng() - 0.5) * 0.1, rng() * 10];
      });
      const y = X.map(([x1, , x3]) => x1 + x3 + rng());
      const model = multipleRegressionEngine.fit({ X, y, feature_names: ["x1", "x2", "x3"] });
      const diag = multipleRegressionEngine.diagnostics(model);

      const x1Vif = diag.vif.find(v => v.feature === "x1");
      const x2Vif = diag.vif.find(v => v.feature === "x2");
      expect(x1Vif!.vif).toBeGreaterThan(5);
      expect(x2Vif!.vif).toBeGreaterThan(5);
      expect(x1Vif!.is_collinear).toBe(true);
    });

    it("Cook's distance identifies outlier", () => {
      const X = Array.from({ length: 20 }, (_, i) => [i + 1]);
      const y = X.map(([x]) => 2 * x + 1);
      // Add extreme outlier
      y[19] = 2 * 20 + 1 + 500;

      const model = multipleRegressionEngine.fit({ X, y });
      const diag = multipleRegressionEngine.diagnostics(model);

      const maxCook = diag.cooks_distance.reduce((best, c) =>
        c.distance > best.distance ? c : best, diag.cooks_distance[0]);
      expect(maxCook.index).toBe(19);
      expect(maxCook.is_influential).toBe(true);
    });
  });

  describe("ridgeRegression", () => {

    it("ridge regression shrinks coefficients toward zero", () => {
      const rng = mulberry32(42);
      const X = Array.from({ length: 50 }, () => [rng() * 10, rng() * 10]);
      const y = X.map(([x1, x2]) => 5 * x1 + 3 * x2 + rng());

      const ols = multipleRegressionEngine.fit({ X, y });
      const ridge = multipleRegressionEngine.ridgeRegression({ X, y, lambda: 100 });

      // Ridge coefficients should be smaller in magnitude
      const olsNorm = Math.sqrt(ols.coefficients.reduce((s, c) => s + c * c, 0));
      const ridgeNorm = Math.sqrt(ridge.coefficients.reduce((s, c) => s + c * c, 0));
      expect(ridgeNorm).toBeLessThan(olsNorm);
    });

    it("ridge with λ=0 equals OLS", () => {
      const rng = mulberry32(99);
      const X = Array.from({ length: 30 }, () => [rng() * 10, rng() * 10]);
      const y = X.map(([x1, x2]) => 2 * x1 + x2 + rng());

      const ols = multipleRegressionEngine.fit({ X, y });
      const ridge = multipleRegressionEngine.ridgeRegression({ X, y, lambda: 0 });

      expect(ridge.coefficients[0]).toBeCloseTo(ols.coefficients[0], 3);
      expect(ridge.coefficients[1]).toBeCloseTo(ols.coefficients[1], 3);
      expect(ridge.optimal_lambda).toBe(0);
    });
  });

  describe("polynomialRegression", () => {

    it("polynomial degree 2 fits quadratic data", () => {
      // y = x² + 2x + 1
      const X = Array.from({ length: 30 }, (_, i) => [(i - 15) / 5]);
      const y = X.map(([x]) => x * x + 2 * x + 1);
      const model = multipleRegressionEngine.polynomialRegression({ X, y, degree: 2 });
      expect(model.r_squared).toBeGreaterThan(0.99);
    });
  });

  describe("stepwiseSelection", () => {

    it("stepwise selects relevant variables", () => {
      const rng = mulberry32(42);
      // x1, x2 are relevant; x3, x4 are noise
      const X = Array.from({ length: 80 }, () => [
        rng() * 10, rng() * 10, rng() * 10, rng() * 10,
      ]);
      const y = X.map(([x1, x2]) => 5 * x1 + 3 * x2 + 1 + (rng() - 0.5) * 2);

      const result = multipleRegressionEngine.stepwiseSelection({
        X, y,
        feature_names: ["x1", "x2", "x3", "x4"],
        direction: "both",
        criterion: "bic",
      });

      expect(result.selected_features).toContain("x1");
      expect(result.selected_features).toContain("x2");
      // Noise variables may or may not be selected but BIC should prefer simpler
      expect(result.selected_features.length).toBeLessThanOrEqual(3);
    });
  });
});

// ── Helper: seeded PRNG for reproducible tests ──
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
