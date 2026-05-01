/**
 * DifferentialEquationEngine — ODE/PDE Solvers
 *
 * Solves ordinary differential equations:
 * - Euler (first-order, for reference)
 * - RK4 (classical Runge-Kutta)
 * - RK45 (Dormand-Prince adaptive step)
 * - Systems of ODEs
 * - Second-order ODEs (converted to system)
 * - Stiff system detection
 *
 * Manufacturing use: thermal transient modeling, tool wear progression,
 * vibration dynamics (chatter), spindle thermal growth, coolant temperature
 * evolution, chip curling mechanics.
 *
 * @module DifferentialEquationEngine
 * @milestone SCIMATH-WIRE-MS0
 * @unit P6-U02
 */

import { EigensolverEngine } from "./EigensolverEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** dy/dt = f(t, y) */
export type ODEFunction = (t: number, y: number[]) => number[];

export interface ODEConfig {
  /** Right-hand side function f(t, y) */
  f: ODEFunction;
  /** Initial conditions y(t0) */
  y0: number[];
  /** Time span [t0, tEnd] */
  tSpan: [number, number];
  /** Fixed step size (for Euler/RK4) */
  dt?: number;
  /** Number of output points */
  numPoints?: number;
  /** Adaptive step control */
  adaptive?: {
    rtol?: number;    // Relative tolerance (default 1e-6)
    atol?: number;    // Absolute tolerance (default 1e-9)
    dtMin?: number;   // Minimum step size
    dtMax?: number;   // Maximum step size
    maxSteps?: number;
  };
}

export interface ODESolution {
  t: number[];
  y: number[][];      // y[i] = state vector at t[i]
  steps: number;
  accepted: number;
  rejected: number;
  stiffnessWarning: boolean;
}

export interface SecondOrderConfig {
  /** d²y/dt² = f(t, y, dy/dt) */
  f: (t: number, y: number, dydt: number) => number;
  y0: number;         // Initial position
  v0: number;         // Initial velocity
  tSpan: [number, number];
  dt?: number;
  numPoints?: number;
}

export interface SecondOrderSolution {
  t: number[];
  y: number[];        // Position
  v: number[];        // Velocity
  steps: number;
}

// ---------------------------------------------------------------------------
// Dormand-Prince RK45 Butcher tableau
// ---------------------------------------------------------------------------

const DP_A = [
  [],
  [1/5],
  [3/40, 9/40],
  [44/45, -56/15, 32/9],
  [19372/6561, -25360/2187, 64448/6561, -212/729],
  [9017/3168, -355/33, 46732/5247, 49/176, -5103/18656],
  [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84],
];

const DP_B5 = [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84, 0];
const DP_B4 = [5179/57600, 0, 7571/16695, 393/640, -92097/339200, 187/2100, 1/40];
const DP_C = [0, 1/5, 3/10, 4/5, 8/9, 1, 1];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class DifferentialEquationEngineImpl {

  /**
   * Euler method (first-order, for benchmarking).
   */
  euler(config: ODEConfig): ODESolution {
    const { f, y0, tSpan } = config;
    const n = config.numPoints ?? 100;
    const dt = config.dt ?? (tSpan[1] - tSpan[0]) / n;
    const dim = y0.length;

    const tValues: number[] = [tSpan[0]];
    const yValues: number[][] = [[...y0]];
    let t = tSpan[0];
    let y = [...y0];
    let steps = 0;

    while (t < tSpan[1] - 1e-14) {
      const h = Math.min(dt, tSpan[1] - t);
      const dydt = f(t, y);
      const yNew = new Array(dim);
      for (let i = 0; i < dim; i++) {
        yNew[i] = y[i] + h * dydt[i];
      }
      t += h;
      y = yNew;
      tValues.push(t);
      yValues.push([...y]);
      steps++;
    }

    return { t: tValues, y: yValues, steps, accepted: steps, rejected: 0, stiffnessWarning: false };
  }

  /**
   * Classical 4th-order Runge-Kutta.
   */
  rk4(config: ODEConfig): ODESolution {
    const { f, y0, tSpan } = config;
    const n = config.numPoints ?? 100;
    const dt = config.dt ?? (tSpan[1] - tSpan[0]) / n;
    const dim = y0.length;

    const tValues: number[] = [tSpan[0]];
    const yValues: number[][] = [[...y0]];
    let t = tSpan[0];
    let y = [...y0];
    let steps = 0;

    while (t < tSpan[1] - 1e-14) {
      const h = Math.min(dt, tSpan[1] - t);

      const k1 = f(t, y);
      const k2 = f(t + h / 2, y.map((yi, i) => yi + h / 2 * k1[i]));
      const k3 = f(t + h / 2, y.map((yi, i) => yi + h / 2 * k2[i]));
      const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));

      const yNew = new Array(dim);
      for (let i = 0; i < dim; i++) {
        yNew[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      }

      t += h;
      y = yNew;
      tValues.push(t);
      yValues.push([...y]);
      steps++;
    }

    return { t: tValues, y: yValues, steps, accepted: steps, rejected: 0, stiffnessWarning: false };
  }

  /**
   * Dormand-Prince RK45 with adaptive step control.
   */
  rk45(config: ODEConfig): ODESolution {
    const { f, y0, tSpan } = config;
    const dim = y0.length;
    const adaptive = config.adaptive ?? {};
    const rtol = adaptive.rtol ?? 1e-6;
    const atol = adaptive.atol ?? 1e-9;
    const dtMin = adaptive.dtMin ?? 1e-12;
    const dtMax = adaptive.dtMax ?? (tSpan[1] - tSpan[0]) / 4;
    const maxSteps = adaptive.maxSteps ?? 10000;

    let t = tSpan[0];
    let y = [...y0];
    let h = Math.min(dtMax, (tSpan[1] - tSpan[0]) / 50);

    const tValues: number[] = [t];
    const yValues: number[][] = [[...y]];
    let accepted = 0;
    let rejected = 0;
    let stiffCount = 0;

    for (let step = 0; step < maxSteps; step++) {
      if (t >= tSpan[1] - 1e-14) break;
      h = Math.min(h, tSpan[1] - t);

      // Compute 7 stages
      const k: number[][] = [];
      k[0] = f(t, y);

      for (let s = 1; s <= 6; s++) {
        const ts = t + DP_C[s] * h;
        const ys = new Array(dim);
        for (let i = 0; i < dim; i++) {
          let sum = y[i];
          for (let j = 0; j < s; j++) {
            sum += h * DP_A[s][j] * k[j][i];
          }
          ys[i] = sum;
        }
        k[s] = f(ts, ys);
      }

      // 5th and 4th order solutions
      const y5 = new Array(dim);
      const y4 = new Array(dim);
      for (let i = 0; i < dim; i++) {
        let s5 = 0, s4 = 0;
        for (let j = 0; j < 7; j++) {
          s5 += DP_B5[j] * k[j][i];
          s4 += DP_B4[j] * k[j][i];
        }
        y5[i] = y[i] + h * s5;
        y4[i] = y[i] + h * s4;
      }

      // Error estimate
      let errMax = 0;
      for (let i = 0; i < dim; i++) {
        const sc = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(y5[i]));
        const err = Math.abs(y5[i] - y4[i]) / sc;
        errMax = Math.max(errMax, err);
      }

      if (errMax <= 1.0) {
        // Accept step
        t += h;
        y = y5;
        tValues.push(t);
        yValues.push([...y]);
        accepted++;

        // Stiffness detection: if error is tiny but step is at dtMin
        if (h <= dtMin * 2 && errMax < 0.01) stiffCount++;
      } else {
        rejected++;
      }

      // Step size control (PI controller)
      const safety = 0.9;
      const minFactor = 0.2;
      const maxFactor = 5.0;
      const order = 5;
      const factor = errMax > 0
        ? safety * Math.pow(errMax, -1 / (order + 1))
        : maxFactor;
      h *= Math.max(minFactor, Math.min(maxFactor, factor));
      h = Math.max(dtMin, Math.min(dtMax, h));
    }

    return {
      t: tValues,
      y: yValues,
      steps: accepted + rejected,
      accepted,
      rejected,
      stiffnessWarning: stiffCount > 10,
    };
  }

  /**
   * Solve a second-order ODE: y'' = f(t, y, y')
   * by converting to system [y, v] where v = y'.
   */
  solveSecondOrder(config: SecondOrderConfig): SecondOrderSolution {
    const { f: f2, y0, v0, tSpan } = config;
    const n = config.numPoints ?? 100;
    const dt = config.dt ?? (tSpan[1] - tSpan[0]) / n;

    const sysConfig: ODEConfig = {
      f: (t, state) => [state[1], f2(t, state[0], state[1])],
      y0: [y0, v0],
      tSpan,
      dt,
      numPoints: n,
    };

    const sol = this.rk4(sysConfig);

    return {
      t: sol.t,
      y: sol.y.map(s => s[0]),
      v: sol.y.map(s => s[1]),
      steps: sol.steps,
    };
  }

  /**
   * Solve a boundary value problem (shooting method):
   * y'' = f(t, y, y'), y(a) = ya, y(b) = yb.
   */
  solveBVP(
    f: (t: number, y: number, dydt: number) => number,
    a: number, b: number,
    ya: number, yb: number,
    numPoints: number = 100,
    maxIter: number = 50,
    tolerance: number = 1e-6,
  ): SecondOrderSolution {
    // Bisection on initial slope v0
    let vLow = -100, vHigh = 100;

    // Evaluate endpoints
    const shoot = (v0: number): number => {
      const sol = this.solveSecondOrder({
        f, y0: ya, v0, tSpan: [a, b], numPoints,
      });
      return sol.y[sol.y.length - 1] - yb;
    };

    let fLow = shoot(vLow);
    let fHigh = shoot(vHigh);

    // Expand bracket if needed
    for (let i = 0; i < 10 && fLow * fHigh > 0; i++) {
      vLow *= 2;
      vHigh *= 2;
      fLow = shoot(vLow);
      fHigh = shoot(vHigh);
    }

    // Secant/bisection hybrid
    let v0 = (vLow + vHigh) / 2;
    for (let iter = 0; iter < maxIter; iter++) {
      const fMid = shoot(v0);
      if (Math.abs(fMid) < tolerance) break;

      if (fMid * fLow < 0) {
        vHigh = v0;
        fHigh = fMid;
      } else {
        vLow = v0;
        fLow = fMid;
      }
      v0 = (vLow + vHigh) / 2;
    }

    return this.solveSecondOrder({
      f, y0: ya, v0, tSpan: [a, b], numPoints,
    });
  }

  /**
   * Stability analysis: estimate eigenvalues of Jacobian at a point.
   * Returns maximum real part (negative = stable, positive = unstable).
   */
  stabilityAnalysis(
    f: ODEFunction, y0: number[], t0: number = 0, h: number = 1e-6
  ): { maxRealPart: number; stable: boolean; eigenvalueEstimates: number[] } {
    const dim = y0.length;
    const f0 = f(t0, y0);

    // Approximate Jacobian via finite differences
    const J: number[][] = [];
    for (let j = 0; j < dim; j++) {
      const yp = [...y0];
      yp[j] += h;
      const fp = f(t0, yp);
      J.push(fp.map((fi, i) => (fi - f0[i]) / h));
    }

    // Transpose (J is column-major from the loop above)
    const Jt: number[][] = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => J[j][i])
    );

    // Estimate eigenvalues via power iteration + trace/det for small systems
    if (dim === 1) {
      return { maxRealPart: Jt[0][0], stable: Jt[0][0] < 0, eigenvalueEstimates: [Jt[0][0]] };
    }

    if (dim === 2) {
      const tr = Jt[0][0] + Jt[1][1];
      const det = Jt[0][0] * Jt[1][1] - Jt[0][1] * Jt[1][0];
      const disc = tr * tr - 4 * det;
      let eigs: number[];
      if (disc >= 0) {
        eigs = [(tr + Math.sqrt(disc)) / 2, (tr - Math.sqrt(disc)) / 2];
      } else {
        eigs = [tr / 2, tr / 2]; // Real parts of complex conjugate pair
      }
      const maxReal = Math.max(...eigs);
      return { maxRealPart: maxReal, stable: maxReal < 0, eigenvalueEstimates: eigs };
    }

    // For larger systems, use EigensolverEngine for proper eigenvalue analysis.
    // Symmetrize Jacobian for EigensolverEngine (take real parts of eigenvalues).
    // For non-symmetric J, eigenvalues may be complex — use the symmetric part
    // (J + J^T)/2 for the real spectral estimate, which bounds the maximum real part.
    const Jsym: number[][] = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => (Jt[i][j] + Jt[j][i]) / 2)
    );
    const result = EigensolverEngine.symmetricQR(Jsym, { maxIterations: 300, tolerance: 1e-10 });
    const eigs = result.converged ? result.eigenvalues : Jt.map((_, i) => Jt[i][i]);
    const maxReal = Math.max(...eigs);
    return { maxRealPart: maxReal, stable: maxReal < 0, eigenvalueEstimates: eigs };
  }
}

export const differentialEquationEngine = new DifferentialEquationEngineImpl();
