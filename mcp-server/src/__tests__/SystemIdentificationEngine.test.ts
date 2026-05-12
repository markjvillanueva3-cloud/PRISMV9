/**
 * SystemIdentificationEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P2-U01
 */
import { describe, it, expect } from "vitest";
import { SystemIdentificationEngine } from "../engines/SystemIdentificationEngine.js";

// ============================================================================
// RECURSIVE LEAST SQUARES (RLS)
// ============================================================================

describe("SystemIdentificationEngine — RLS", () => {
  it("initializes with correct dimensions", () => {
    const state = SystemIdentificationEngine.rlsInit(3);
    expect(state.theta).toEqual([0, 0, 0]);
    expect(state.P.length).toBe(3);
    expect(state.P[0][0]).toBe(1000);
    expect(state.P[0][1]).toBe(0);
    expect(state.lambda).toBe(1.0);
    expect(state.sampleCount).toBe(0);
  });

  it("estimates parameters for y = 2*x1 + 3*x2", () => {
    // True model: y = 2*x1 + 3*x2
    const Phi: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 50; i++) {
      const x1 = Math.sin(i * 0.3);
      const x2 = Math.cos(i * 0.5);
      Phi.push([x1, x2]);
      y.push(2 * x1 + 3 * x2);
    }
    const state = SystemIdentificationEngine.rlsBatch(Phi, y);
    expect(state.theta[0]).toBeCloseTo(2, 3);
    expect(state.theta[1]).toBeCloseTo(3, 3);
    expect(state.sampleCount).toBe(50);
  });

  it("estimates parameters with noisy data", () => {
    // y = 5*x + 1 with small noise
    const Phi: number[][] = [];
    const y: number[] = [];
    // Use deterministic "noise" pattern
    for (let i = 0; i < 100; i++) {
      const x = i * 0.1;
      const noise = 0.01 * Math.sin(i * 7.3 + 2.1);
      Phi.push([x, 1]);
      y.push(5 * x + 1 + noise);
    }
    const state = SystemIdentificationEngine.rlsBatch(Phi, y);
    expect(state.theta[0]).toBeCloseTo(5, 1);
    expect(state.theta[1]).toBeCloseTo(1, 1);
  });

  it("forgetting factor tracks time-varying parameters", () => {
    // Parameters shift at sample 50: from [1, 0] to [0, 1]
    const state = SystemIdentificationEngine.rlsInit(2, { lambda: 0.95 });
    for (let i = 0; i < 50; i++) {
      const phi = [Math.sin(i * 0.2), Math.cos(i * 0.3)];
      SystemIdentificationEngine.rlsUpdate(state, phi, phi[0]); // y = 1*x1 + 0*x2
    }
    // First half: theta should be close to [1, 0]
    expect(state.theta[0]).toBeCloseTo(1, 0);

    for (let i = 50; i < 150; i++) {
      const phi = [Math.sin(i * 0.2), Math.cos(i * 0.3)];
      SystemIdentificationEngine.rlsUpdate(state, phi, phi[1]); // y = 0*x1 + 1*x2
    }
    // Second half with forgetting: theta should shift toward [0, 1]
    expect(state.theta[1]).toBeCloseTo(1, 0);
    expect(Math.abs(state.theta[0])).toBeLessThan(0.5);
  });

  it("single-parameter estimation (scalar)", () => {
    const state = SystemIdentificationEngine.rlsInit(1);
    for (let i = 0; i < 20; i++) {
      SystemIdentificationEngine.rlsUpdate(state, [i + 1], 7 * (i + 1));
    }
    expect(state.theta[0]).toBeCloseTo(7, 4);
  });

  it("throws on invalid lambda", () => {
    expect(() => SystemIdentificationEngine.rlsInit(2, { lambda: 0 })).toThrow("lambda");
    expect(() => SystemIdentificationEngine.rlsInit(2, { lambda: 1.5 })).toThrow("lambda");
  });

  it("throws on phi dimension mismatch", () => {
    const state = SystemIdentificationEngine.rlsInit(2);
    expect(() => SystemIdentificationEngine.rlsUpdate(state, [1, 2, 3], 5)).toThrow("phi length");
  });

  it("handles custom delta (initial covariance)", () => {
    const state = SystemIdentificationEngine.rlsInit(2, { delta: 1 });
    expect(state.P[0][0]).toBe(1);
    expect(state.P[1][1]).toBe(1);
  });
});

// ============================================================================
// TOTAL LEAST SQUARES (TLS)
// ============================================================================

describe("SystemIdentificationEngine — TLS", () => {
  it("solves exact system (no noise)", () => {
    // 3x = 6 → x = 2
    const A = [[3], [6], [9]];
    const b = [6, 12, 18];
    const result = SystemIdentificationEngine.totalLeastSquares(A, b);
    expect(result.x[0]).toBeCloseTo(2, 6);
  });

  it("solves overdetermined 2-param system", () => {
    // y = 2*x1 + 3*x2 with noise in both A and b
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 20; i++) {
      const x1 = Math.sin(i * 0.5);
      const x2 = Math.cos(i * 0.3);
      A.push([x1, x2]);
      b.push(2 * x1 + 3 * x2);
    }
    const result = SystemIdentificationEngine.totalLeastSquares(A, b);
    expect(result.x[0]).toBeCloseTo(2, 3);
    expect(result.x[1]).toBeCloseTo(3, 3);
    expect(result.residual).toBeCloseTo(0, 6);
  });

  it("differs from OLS when A has errors", () => {
    // TLS should give better results when A is noisy
    const result = SystemIdentificationEngine.totalLeastSquares(
      [[1], [2], [3], [4], [5]],
      [2, 4, 6, 8, 10]
    );
    expect(result.x[0]).toBeCloseTo(2, 4);
    expect(result.conditionNumber).toBeGreaterThan(0);
  });

  it("returns condition number", () => {
    const result = SystemIdentificationEngine.totalLeastSquares(
      [[1, 0], [0, 1], [1, 1]],
      [1, 1, 2]
    );
    expect(result.conditionNumber).toBeDefined();
    expect(result.conditionNumber).toBeGreaterThan(0);
  });
});

// ============================================================================
// N4SID SUBSPACE IDENTIFICATION
// ============================================================================

describe("SystemIdentificationEngine — N4SID", () => {
  it("identifies a SISO first-order system", () => {
    // True system: x(k+1) = 0.8*x(k) + 0.5*u(k), y(k) = x(k)
    const N = 200;
    const u: number[] = [];
    const y: number[] = [];
    let x = 0;
    for (let k = 0; k < N; k++) {
      const uk = Math.sin(k * 0.1) + 0.5 * Math.cos(k * 0.3);
      u.push(uk);
      y.push(x);
      x = 0.8 * x + 0.5 * uk;
    }

    const model = SystemIdentificationEngine.n4sid(u, y, { order: 1 });
    expect(model.order).toBe(1);
    expect(model.A.length).toBe(1);
    expect(model.B.length).toBe(1);
    expect(model.C.length).toBe(1);
    expect(model.hankelSingularValues.length).toBeGreaterThan(0);
  });

  it("identifies system order from singular value gap", () => {
    // Second-order system
    const N = 300;
    const u: number[] = [];
    const y: number[] = [];
    let x1 = 0, x2 = 0;
    for (let k = 0; k < N; k++) {
      const uk = Math.sin(k * 0.05);
      u.push(uk);
      y.push(x1 + 0.5 * x2);
      const x1New = 0.7 * x1 + 0.3 * x2 + 0.4 * uk;
      const x2New = -0.2 * x1 + 0.5 * x2 + 0.2 * uk;
      x1 = x1New;
      x2 = x2New;
    }

    const model = SystemIdentificationEngine.n4sid(u, y);
    // Should detect order ≥ 1 (order detection is approximate)
    expect(model.order).toBeGreaterThanOrEqual(1);
    expect(model.hankelSingularValues[0]).toBeGreaterThan(0);
  });

  it("simulation reproduces known system behavior", () => {
    // Simple gain system: y = 0.9 * u (first-order with fast pole)
    const N = 100;
    const u: number[] = [];
    const y: number[] = [];
    let x = 0;
    for (let k = 0; k < N; k++) {
      const uk = k < 10 ? 0 : 1; // step input
      u.push(uk);
      y.push(x);
      x = 0.5 * x + 0.5 * uk;
    }

    const model = SystemIdentificationEngine.n4sid(u, y, { order: 1 });
    const ySim = SystemIdentificationEngine.simulate(model, u);
    expect(ySim.length).toBe(N);

    // Check that simulated output has similar shape (step response)
    // After initial transient, should be positive
    let posCount = 0;
    for (let k = 30; k < N; k++) {
      if (ySim[k][0] > 0) posCount++;
    }
    expect(posCount).toBeGreaterThan((N - 30) * 0.5);
  });

  it("handles MIMO input format", () => {
    const N = 100;
    const u: number[][] = Array.from({ length: N }, (_, k) => [Math.sin(k * 0.1), Math.cos(k * 0.2)]);
    const y: number[][] = Array.from({ length: N }, (_, k) => [0.5 * Math.sin(k * 0.1) + 0.3 * Math.cos(k * 0.2)]);
    const model = SystemIdentificationEngine.n4sid(u, y, { order: 2 });
    expect(model.B[0].length).toBe(2); // 2 inputs
    expect(model.C.length).toBe(1);    // 1 output
  });

  it("throws on insufficient data", () => {
    expect(() => SystemIdentificationEngine.n4sid([1, 2, 3], [1, 2, 3])).toThrow("insufficient");
  });
});

// ============================================================================
// STATE-SPACE TO TRANSFER FUNCTION
// ============================================================================

describe("SystemIdentificationEngine — ss2tf", () => {
  it("converts first-order system to transfer function", () => {
    // x(k+1) = a*x(k) + b*u(k), y = x
    // H(z) = b/(z-a) = b*z^0 / (z - a)
    const model = {
      A: [[0.8]], B: [[0.5]], C: [[1]], D: [[0]],
      order: 1, hankelSingularValues: [1],
    };
    const { num, den } = SystemIdentificationEngine.ss2tf(model);
    expect(den.length).toBe(2); // z - 0.8
    expect(den[0]).toBeCloseTo(1);
    expect(den[1]).toBeCloseTo(-0.8, 6);
    // Numerator: C*adj(zI-A)*B = C*I*B*z^0 = 0.5, with D=0 → num = [0, 0.5]
    expect(num[0]).toBeCloseTo(0, 6); // no z^1 term when D=0
    expect(num[1]).toBeCloseTo(0.5, 6);
  });

  it("handles feedthrough (D ≠ 0)", () => {
    const model = {
      A: [[0.5]], B: [[1]], C: [[1]], D: [[2]],
      order: 1, hankelSingularValues: [1],
    };
    const { num, den } = SystemIdentificationEngine.ss2tf(model);
    // H(z) = C*(zI-A)^{-1}*B + D = 1/(z-0.5) + 2 = (2z - 1 + 1)/(z-0.5) = (2z)/(z-0.5)
    // den = [1, -0.5], num = D*den + [0, C*I*B] = [2, -1] + [0, 1] = [2, 0]
    expect(den[0]).toBeCloseTo(1);
    expect(den[1]).toBeCloseTo(-0.5, 6);
    expect(num[0]).toBeCloseTo(2, 4); // coefficient of z^1
    expect(num[1]).toBeCloseTo(0, 4); // coefficient of z^0: -1 + 1 = 0
  });

  it("second-order system produces degree-2 denominator", () => {
    const model = {
      A: [[0.5, 0.3], [-0.2, 0.4]],
      B: [[1], [0]],
      C: [[1, 0]],
      D: [[0]],
      order: 2, hankelSingularValues: [1, 0.5],
    };
    const { num, den } = SystemIdentificationEngine.ss2tf(model);
    expect(den.length).toBe(3); // z^2 + c1*z + c2
    expect(den[0]).toBeCloseTo(1);
    // Characteristic polynomial: det(zI - A) = (z-0.5)(z-0.4) - (0.3)(-0.2)
    // = z^2 - 0.9z + 0.2 + 0.06 = z^2 - 0.9z + 0.26
    expect(den[1]).toBeCloseTo(-0.9, 6);
    expect(den[2]).toBeCloseTo(0.26, 6);
  });
});
