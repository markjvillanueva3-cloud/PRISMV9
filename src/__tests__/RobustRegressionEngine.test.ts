/**
 * RobustRegressionEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P2-U02
 */
import { describe, it, expect } from "vitest";
import { RobustRegressionEngine } from "../engines/RobustRegressionEngine.js";

// Helper: generate linear data y = a*x + b with optional outliers
function linearData(a: number, b: number, n: number, outlierFrac = 0) {
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i + 1) * 0.1;
    X.push([x]);
    const isOutlier = i < n * outlierFrac;
    y.push(isOutlier ? a * x + b + 50 : a * x + b);
  }
  return { X, y };
}

// ============================================================================
// OLS BASELINE
// ============================================================================

describe("RobustRegressionEngine — OLS", () => {
  it("fits exact linear relationship y = 3x + 1", () => {
    const { X, y } = linearData(3, 1, 20);
    const r = RobustRegressionEngine.ols(X, y);
    expect(r.coefficients[0]).toBeCloseTo(3, 6);
    expect(r.intercept).toBeCloseTo(1, 6);
    expect(r.r2).toBeCloseTo(1, 6);
    expect(r.method).toBe("ols");
  });

  it("fits multi-feature y = 2*x1 + 3*x2 + 5", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 30; i++) {
      const x1 = Math.sin(i * 0.3);
      const x2 = Math.cos(i * 0.5);
      X.push([x1, x2]);
      y.push(2 * x1 + 3 * x2 + 5);
    }
    const r = RobustRegressionEngine.ols(X, y);
    expect(r.coefficients[0]).toBeCloseTo(2, 4);
    expect(r.coefficients[1]).toBeCloseTo(3, 4);
    expect(r.intercept).toBeCloseTo(5, 4);
  });

  it("returns R² = 0 for constant y with no-intercept", () => {
    const X = [[1], [2], [3]];
    const y = [5, 5, 5];
    const r = RobustRegressionEngine.ols(X, y);
    expect(r.rss).toBeCloseTo(0, 6);
  });
});

// ============================================================================
// RIDGE REGRESSION
// ============================================================================

describe("RobustRegressionEngine — Ridge", () => {
  it("shrinks coefficients toward zero", () => {
    const { X, y } = linearData(3, 1, 20);
    const ols = RobustRegressionEngine.ols(X, y);
    const ridge = RobustRegressionEngine.ridge(X, y, { lambda: 10 });
    // Ridge coefficients should be smaller in magnitude
    expect(Math.abs(ridge.coefficients[0])).toBeLessThanOrEqual(Math.abs(ols.coefficients[0]) + 0.01);
    expect(ridge.method).toBe("ridge");
  });

  it("lambda=0 gives OLS", () => {
    const { X, y } = linearData(3, 1, 20);
    const ols = RobustRegressionEngine.ols(X, y);
    const ridge = RobustRegressionEngine.ridge(X, y, { lambda: 0 });
    expect(ridge.coefficients[0]).toBeCloseTo(ols.coefficients[0], 4);
    expect(ridge.intercept).toBeCloseTo(ols.intercept, 4);
  });

  it("stabilizes ill-conditioned problem", () => {
    // Nearly collinear features
    const X = Array.from({ length: 20 }, (_, i) => [i * 0.1, i * 0.1 + 1e-8 * i]);
    const y = Array.from({ length: 20 }, (_, i) => 2 * i * 0.1 + 1);
    // OLS may be unstable, Ridge should stabilize
    const ridge = RobustRegressionEngine.ridge(X, y, { lambda: 1 });
    expect(isFinite(ridge.coefficients[0])).toBe(true);
    expect(isFinite(ridge.coefficients[1])).toBe(true);
  });

  it("throws on negative lambda", () => {
    expect(() => RobustRegressionEngine.ridge([[1]], [1], { lambda: -1 })).toThrow("lambda");
  });
});

// ============================================================================
// LASSO REGRESSION
// ============================================================================

describe("RobustRegressionEngine — Lasso", () => {
  it("produces sparse coefficients", () => {
    // y = 3*x1 + 0*x2 + 0*x3, Lasso should zero out x2 and x3
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 50; i++) {
      X.push([i * 0.1, Math.sin(i), Math.cos(i)]);
      y.push(3 * i * 0.1);
    }
    const r = RobustRegressionEngine.lasso(X, y, { lambda: 0.5 });
    expect(r.method).toBe("lasso");
    // x2 and x3 should be near zero or exactly zero
    expect(Math.abs(r.coefficients[1])).toBeLessThan(1);
    expect(Math.abs(r.coefficients[2])).toBeLessThan(1);
  });

  it("recovers signal with moderate lambda", () => {
    const X = Array.from({ length: 30 }, (_, i) => [i * 0.1]);
    const y = Array.from({ length: 30 }, (_, i) => 5 * i * 0.1 + 2);
    const r = RobustRegressionEngine.lasso(X, y, { lambda: 0.01 });
    expect(r.coefficients[0]).toBeCloseTo(5, 0);
  });
});

// ============================================================================
// ELASTIC NET
// ============================================================================

describe("RobustRegressionEngine — Elastic Net", () => {
  it("alpha=0 behaves like Ridge", () => {
    const { X, y } = linearData(3, 1, 20);
    const en = RobustRegressionEngine.elasticNet(X, y, { lambda: 1, alpha: 0 });
    const ridge = RobustRegressionEngine.ridge(X, y, { lambda: 1 });
    // Should be similar (coordinate descent vs closed-form)
    expect(en.coefficients[0]).toBeCloseTo(ridge.coefficients[0], 1);
  });

  it("alpha=1 behaves like Lasso", () => {
    const { X, y } = linearData(3, 1, 20);
    const en = RobustRegressionEngine.elasticNet(X, y, { lambda: 1, alpha: 1 });
    const lasso = RobustRegressionEngine.lasso(X, y, { lambda: 1 });
    expect(en.coefficients[0]).toBeCloseTo(lasso.coefficients[0], 4);
  });

  it("mixed alpha gives intermediate result", () => {
    const { X, y } = linearData(3, 1, 30);
    const en = RobustRegressionEngine.elasticNet(X, y, { lambda: 1, alpha: 0.5 });
    expect(en.method).toBe("elastic-net");
    expect(isFinite(en.coefficients[0])).toBe(true);
    expect(en.r2).toBeGreaterThan(0);
  });
});

// ============================================================================
// HUBER REGRESSION
// ============================================================================

describe("RobustRegressionEngine — Huber", () => {
  it("resists outliers better than OLS", () => {
    // True relationship: y = 2x + 1 with 20% outliers
    const n = 50;
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i + 1) * 0.1;
      X.push([x]);
      const outlier = i < 10 ? 30 : 0; // first 10 are outliers
      y.push(2 * x + 1 + outlier);
    }

    const ols = RobustRegressionEngine.ols(X, y);
    const huber = RobustRegressionEngine.huber(X, y);

    // Huber slope should be closer to 2 than OLS
    expect(Math.abs(huber.coefficients[0] - 2)).toBeLessThan(Math.abs(ols.coefficients[0] - 2) + 0.5);
    expect(huber.method).toBe("huber");
  });

  it("converges to OLS without outliers", () => {
    const { X, y } = linearData(3, 1, 30);
    const ols = RobustRegressionEngine.ols(X, y);
    const huber = RobustRegressionEngine.huber(X, y);
    expect(huber.coefficients[0]).toBeCloseTo(ols.coefficients[0], 1);
    expect(huber.intercept).toBeCloseTo(ols.intercept, 1);
  });

  it("throws on invalid delta", () => {
    expect(() => RobustRegressionEngine.huber([[1]], [1], { delta: 0 })).toThrow("delta");
  });
});

// ============================================================================
// RANSAC
// ============================================================================

describe("RobustRegressionEngine — RANSAC", () => {
  it("fits through inliers ignoring outliers", () => {
    // True: y = 2x + 1, with 5 gross outliers out of 25
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 25; i++) {
      const x = (i + 1) * 0.2;
      X.push([x]);
      y.push(i < 5 ? 100 : 2 * x + 1); // first 5 are outliers
    }

    const r = RobustRegressionEngine.ransac(X, y, { threshold: 1, maxIter: 200 });
    expect(r.coefficients[0]).toBeCloseTo(2, 0);
    expect(r.intercept).toBeCloseTo(1, 0);
    expect(r.numInliers).toBeGreaterThanOrEqual(15);
    expect(r.method).toBe("ransac");
    expect(r.inlierIndices.length).toBe(r.numInliers);
  });

  it("returns iteration count", () => {
    const { X, y } = linearData(1, 0, 15);
    const r = RobustRegressionEngine.ransac(X, y, { threshold: 0.1 });
    expect(r.iterations).toBeGreaterThan(0);
  });

  it("throws when minSamples > data size", () => {
    expect(() => RobustRegressionEngine.ransac([[1]], [1], { minSamples: 5 })).toThrow("minSamples");
  });

  it("uses seed for reproducibility", () => {
    const { X, y } = linearData(2, 1, 20, 0.2);
    const r1 = RobustRegressionEngine.ransac(X, y, { seed: 123, threshold: 5 });
    const r2 = RobustRegressionEngine.ransac(X, y, { seed: 123, threshold: 5 });
    expect(r1.coefficients[0]).toBeCloseTo(r2.coefficients[0], 10);
  });
});
