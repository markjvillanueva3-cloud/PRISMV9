/**
 * Tests for ConvexOptimization, NumericalIntegration, DifferentialEquation engines
 */
import { describe, it, expect } from "vitest";
import { convexOptimizationEngine } from "../engines/ConvexOptimizationEngine.js";
import { numericalIntegrationEngine } from "../engines/NumericalIntegrationEngine.js";
import { differentialEquationEngine } from "../engines/DifferentialEquationEngine.js";

// ===========================================================================
// ConvexOptimization
// ===========================================================================

describe("ConvexOptimization — QP Solver", () => {
  it("minimizes simple unconstrained quadratic", () => {
    // min x^2 + y^2 → x=0, y=0
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [0, 0],
    });
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(0, 3);
    expect(result.fval).toBeCloseTo(0, 3);
  });

  it("minimizes QP with linear term", () => {
    // min 0.5*(2x^2 + 2y^2) + (-6x - 4y) → x=3, y=2
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [-6, -4],
    });
    expect(result.x[0]).toBeCloseTo(3, 2);
    expect(result.x[1]).toBeCloseTo(2, 2);
  });

  it("respects bound constraints", () => {
    // min 0.5*(2x^2 + 2y^2) - 6x - 4y, s.t. 0 <= x <= 2, 0 <= y <= 1
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [-6, -4],
      bounds: [{ min: 0, max: 2 }, { min: 0, max: 1 }],
    });
    expect(result.x[0]).toBeLessThanOrEqual(2.01);
    expect(result.x[1]).toBeLessThanOrEqual(1.01);
    expect(result.x[0]).toBeGreaterThanOrEqual(-0.01);
    expect(result.x[1]).toBeGreaterThanOrEqual(-0.01);
  });

  it("respects inequality constraints", () => {
    // min x^2 + y^2, s.t. x + y <= 1
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [0, 0],
      A: [[1, 1]],
      b: [1],
    });
    // Unconstrained optimum is (0,0), which satisfies x+y<=1
    expect(result.x[0] + result.x[1]).toBeLessThanOrEqual(1.01);
  });

  it("handles equality constraints", () => {
    // min x^2 + y^2, s.t. x + y = 4
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [0, 0],
      Aeq: [[1, 1]],
      beq: [4],
      x0: [2, 2],
    });
    expect(result.x[0] + result.x[1]).toBeCloseTo(4, 0);
  });

  it("reports active constraints", () => {
    const result = convexOptimizationEngine.solveQP({
      Q: [[2, 0], [0, 2]],
      c: [-10, -10],
      bounds: [{ min: 0, max: 3 }, { min: 0, max: 3 }],
    });
    expect(result.activeConstraints.length).toBeGreaterThan(0);
  });
});

describe("ConvexOptimization — General Convex", () => {
  it("minimizes Rosenbrock-like function with bounds", () => {
    const result = convexOptimizationEngine.minimizeConvex(
      (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
      {
        dimensions: 2,
        x0: [0, 0],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        maxIterations: 5000,
        stepSize: 0.001,
      }
    );
    // May not converge to exact (1,1) but should improve from (0,0)
    expect(result.fval).toBeLessThan(10);
  });

  it("minimizes simple convex function", () => {
    const result = convexOptimizationEngine.minimizeConvex(
      (x) => (x[0] - 3) ** 2 + (x[1] + 1) ** 2,
      { dimensions: 2, x0: [0, 0] }
    );
    expect(result.x[0]).toBeCloseTo(3, 1);
    expect(result.x[1]).toBeCloseTo(-1, 1);
    expect(result.fval).toBeLessThan(0.1);
  });
});

describe("ConvexOptimization — Least Squares", () => {
  it("fits a line through points", () => {
    // y = 2x + 1: points (0,1), (1,3), (2,5)
    const A = [[1, 0], [1, 1], [1, 2]]; // [1, x]
    const b = [1, 3, 5];
    const result = convexOptimizationEngine.leastSquares(A, b);
    expect(result.x[0]).toBeCloseTo(1, 3); // intercept
    expect(result.x[1]).toBeCloseTo(2, 3); // slope
    expect(result.residual).toBeCloseTo(0, 3);
  });

  it("handles overdetermined system", () => {
    const A = [[1, 1], [1, 2], [1, 3], [1, 4]];
    const b = [2.1, 3.9, 6.2, 7.8];
    const result = convexOptimizationEngine.leastSquares(A, b);
    expect(result.x.length).toBe(2);
    expect(result.residual).toBeGreaterThan(0);
    // Slope should be ~2
    expect(result.x[1]).toBeCloseTo(2, 0);
  });
});

// ===========================================================================
// NumericalIntegration
// ===========================================================================

describe("NumericalIntegration — Basic Methods", () => {
  const sinIntegral = Math.PI * 2; // not used; ∫₀^π sin(x) dx = 2

  it("trapezoidal integrates x^2 on [0,1]", () => {
    const r = numericalIntegrationEngine.trapezoidal(x => x * x, 0, 1, 1000);
    expect(r.value).toBeCloseTo(1 / 3, 4);
  });

  it("simpson integrates sin(x) on [0, π]", () => {
    const r = numericalIntegrationEngine.simpson(Math.sin, 0, Math.PI, 100);
    expect(r.value).toBeCloseTo(2, 6);
  });

  it("gauss-legendre 5-point integrates polynomial exactly", () => {
    // GL with 5 points is exact for polynomials up to degree 9
    const r = numericalIntegrationEngine.gaussLegendre(x => x ** 4, 0, 1, 5);
    expect(r.value).toBeCloseTo(1 / 5, 10);
    expect(r.evaluations).toBe(5);
  });

  it("composite gauss-legendre handles oscillatory functions", () => {
    // ∫₀^{2π} cos(x) dx = 0
    const r = numericalIntegrationEngine.compositeGaussLegendre(Math.cos, 0, 2 * Math.PI, 10, 5);
    expect(Math.abs(r.value)).toBeLessThan(1e-10);
  });

  it("adaptive simpson achieves high accuracy", () => {
    // ∫₀^1 e^x dx = e - 1
    const r = numericalIntegrationEngine.adaptiveSimpson(Math.exp, 0, 1, 1e-10);
    expect(r.value).toBeCloseTo(Math.E - 1, 9);
  });

  it("romberg integration converges quickly", () => {
    // ∫₀^1 1/(1+x^2) dx = π/4
    const r = numericalIntegrationEngine.romberg(x => 1 / (1 + x * x), 0, 1);
    expect(r.value).toBeCloseTo(Math.PI / 4, 8);
  });
});

describe("NumericalIntegration — 2D and Sampled", () => {
  it("2D integration of constant gives area", () => {
    const r = numericalIntegrationEngine.integrate2D(
      () => 1, 0, 2, 0, 3, 10, 10
    );
    expect(r.value).toBeCloseTo(6, 5); // 2 × 3 = 6
  });

  it("2D integration of x*y over unit square", () => {
    // ∫₀^1 ∫₀^1 xy dy dx = 1/4
    const r = numericalIntegrationEngine.integrate2D(
      (x, y) => x * y, 0, 1, 0, 1, 20, 20
    );
    expect(r.value).toBeCloseTo(0.25, 4);
  });

  it("integrates sampled data (trapezoidal)", () => {
    // Linear: y = 2x from 0 to 5, area = 25
    const x = [0, 1, 2, 3, 4, 5];
    const y = [0, 2, 4, 6, 8, 10];
    const r = numericalIntegrationEngine.integrateSampled(x, y);
    expect(r.value).toBeCloseTo(25, 6);
  });

  it("handles non-uniform sampling", () => {
    const x = [0, 0.5, 2, 5];
    const y = x.map(xi => xi * xi); // x^2
    const r = numericalIntegrationEngine.integrateSampled(x, y);
    // Exact: 125/3 ≈ 41.67. Trapezoidal with 3 panels won't be exact.
    expect(r.value).toBeGreaterThan(30);
    expect(r.value).toBeLessThan(55);
  });
});

// ===========================================================================
// DifferentialEquation
// ===========================================================================

describe("DifferentialEquation — Basic ODE", () => {
  it("euler solves exponential growth dy/dt = y", () => {
    const sol = differentialEquationEngine.euler({
      f: (_t, y) => [y[0]],
      y0: [1],
      tSpan: [0, 1],
      numPoints: 1000,
    });
    // y(1) = e ≈ 2.718 (Euler has first-order error)
    const yEnd = sol.y[sol.y.length - 1][0];
    expect(yEnd).toBeCloseTo(Math.E, 1);
  });

  it("rk4 solves exponential growth with high accuracy", () => {
    const sol = differentialEquationEngine.rk4({
      f: (_t, y) => [y[0]],
      y0: [1],
      tSpan: [0, 1],
      numPoints: 100,
    });
    const yEnd = sol.y[sol.y.length - 1][0];
    expect(yEnd).toBeCloseTo(Math.E, 6);
  });

  it("rk4 solves harmonic oscillator", () => {
    // y'' = -y  →  system: y' = v, v' = -y
    const sol = differentialEquationEngine.rk4({
      f: (_t, y) => [y[1], -y[0]],
      y0: [1, 0], // cos(t)
      tSpan: [0, 2 * Math.PI],
      numPoints: 200,
    });
    const yEnd = sol.y[sol.y.length - 1][0];
    // cos(2π) = 1
    expect(yEnd).toBeCloseTo(1, 3);
  });

  it("rk45 adaptive handles stiff-like problem", () => {
    // dy/dt = -50*(y - cos(t))
    const sol = differentialEquationEngine.rk45({
      f: (t, y) => [-50 * (y[0] - Math.cos(t))],
      y0: [0],
      tSpan: [0, 2],
      adaptive: { rtol: 1e-6, atol: 1e-9 },
    });
    // Solution should track cos(t) closely
    const lastY = sol.y[sol.y.length - 1][0];
    expect(Math.abs(lastY - Math.cos(2))).toBeLessThan(0.1);
    expect(sol.accepted).toBeGreaterThan(0);
  });

  it("rk45 provides step statistics", () => {
    const sol = differentialEquationEngine.rk45({
      f: (_t, y) => [y[0]],
      y0: [1],
      tSpan: [0, 1],
    });
    expect(sol.steps).toBeGreaterThan(0);
    expect(sol.accepted).toBeGreaterThan(0);
    expect(sol.t.length).toBe(sol.y.length);
  });
});

describe("DifferentialEquation — Second Order", () => {
  it("solves spring-mass: y'' = -k*y", () => {
    const sol = differentialEquationEngine.solveSecondOrder({
      f: (_t, y, _v) => -y, // k=1
      y0: 1,
      v0: 0,
      tSpan: [0, 2 * Math.PI],
      numPoints: 200,
    });
    // y(2π) ≈ cos(2π) = 1
    expect(sol.y[sol.y.length - 1]).toBeCloseTo(1, 2);
    expect(sol.v[sol.v.length - 1]).toBeCloseTo(0, 1);
  });

  it("solves damped oscillator", () => {
    // y'' + 0.5*y' + y = 0
    const sol = differentialEquationEngine.solveSecondOrder({
      f: (_t, y, v) => -0.5 * v - y,
      y0: 1,
      v0: 0,
      tSpan: [0, 20],
      numPoints: 500,
    });
    // Damped: final amplitude should be much less than 1
    expect(Math.abs(sol.y[sol.y.length - 1])).toBeLessThan(0.1);
  });
});

describe("DifferentialEquation — BVP", () => {
  it("solves y'' = -y, y(0)=0, y(π)=0", () => {
    // Solution: y = sin(x) (or any scalar multiple)
    const sol = differentialEquationEngine.solveBVP(
      (_t, y, _v) => -y,
      0, Math.PI, 0, 0, 100
    );
    // y(π/2) should be the peak
    const midIdx = Math.floor(sol.y.length / 2);
    expect(sol.y[0]).toBeCloseTo(0, 1);
    expect(sol.y[sol.y.length - 1]).toBeCloseTo(0, 1);
  });
});

describe("DifferentialEquation — Stability Analysis", () => {
  it("detects stable system", () => {
    // dy/dt = -2y (eigenvalue = -2)
    const result = differentialEquationEngine.stabilityAnalysis(
      (_t, y) => [-2 * y[0]], [1]
    );
    expect(result.stable).toBe(true);
    expect(result.maxRealPart).toBeLessThan(0);
  });

  it("detects unstable system", () => {
    // dy/dt = +3y (eigenvalue = +3)
    const result = differentialEquationEngine.stabilityAnalysis(
      (_t, y) => [3 * y[0]], [1]
    );
    expect(result.stable).toBe(false);
    expect(result.maxRealPart).toBeGreaterThan(0);
  });

  it("analyzes 2D system", () => {
    // dx/dt = -x + 2y, dy/dt = -3y → eigenvalues -1, -3 (stable)
    const result = differentialEquationEngine.stabilityAnalysis(
      (_t, y) => [-y[0] + 2 * y[1], -3 * y[1]], [1, 1]
    );
    expect(result.stable).toBe(true);
    expect(result.eigenvalueEstimates.length).toBe(2);
  });
});
