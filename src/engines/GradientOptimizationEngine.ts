/**
 * GradientOptimizationEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * General-purpose numerical optimization: gradient descent (4 variants),
 * Newton's method with line search, and BFGS quasi-Newton.
 *
 * Manufacturing applications: parameter tuning, curve fitting,
 * process optimization objective functions, model calibration.
 *
 * Source: PRISM_OPTIMIZATION_ALGORITHMS (MIT 6.251J, 15.099, Stanford AA222)
 */
import { SVDEngine } from "./SVDEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ObjectiveFn = (x: number[]) => number;
export type GradientFn = (x: number[]) => number[];
export type HessianFn = (x: number[]) => number[][];

export interface OptimizationResult {
  x: number[];
  objective: number;
  iterations: number;
  converged: boolean;
  gradNorm: number;
  history: Array<{ iter: number; objective: number; gradNorm: number }>;
}

export interface GradientDescentOptions {
  maxIter?: number;
  tol?: number;
  learningRate?: number;
  momentum?: number;
  variant?: "vanilla" | "momentum" | "nesterov" | "adam";
}

export interface NewtonOptions {
  maxIter?: number;
  tol?: number;
  lineSearch?: boolean;
}

export interface BFGSOptions {
  maxIter?: number;
  tol?: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class GradientOptimizationEngineImpl {

  /**
   * Gradient descent with 4 variants: vanilla, momentum, Nesterov, Adam.
   */
  gradientDescent(
    f: ObjectiveFn,
    grad: GradientFn,
    x0: number[],
    options: GradientDescentOptions = {}
  ): OptimizationResult {
    const {
      maxIter = 1000,
      tol = 1e-8,
      learningRate: alpha = 0.01,
      momentum: mu = 0.9,
      variant = "vanilla",
    } = options;

    let x = [...x0];
    const n = x.length;
    let v = new Array(n).fill(0);
    let m = new Array(n).fill(0);
    let vAdam = new Array(n).fill(0);
    const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;

    const history: OptimizationResult["history"] = [];

    for (let iter = 0; iter < maxIter; iter++) {
      const g = grad(x);
      const gNorm = this._norm(g);
      history.push({ iter, objective: f(x), gradNorm: gNorm });

      if (gNorm < tol) {
        return this._result(x, f, g, history, true);
      }

      switch (variant) {
        case "momentum":
          for (let i = 0; i < n; i++) {
            v[i] = mu * v[i] - alpha * g[i];
            x[i] += v[i];
          }
          break;

        case "nesterov": {
          const xLook = x.map((xi, i) => xi + mu * v[i]);
          const gLook = grad(xLook);
          for (let i = 0; i < n; i++) {
            v[i] = mu * v[i] - alpha * gLook[i];
            x[i] += v[i];
          }
          break;
        }

        case "adam": {
          const t = iter + 1;
          for (let i = 0; i < n; i++) {
            m[i] = beta1 * m[i] + (1 - beta1) * g[i];
            vAdam[i] = beta2 * vAdam[i] + (1 - beta2) * g[i] * g[i];
            const mHat = m[i] / (1 - Math.pow(beta1, t));
            const vHat = vAdam[i] / (1 - Math.pow(beta2, t));
            x[i] -= alpha * mHat / (Math.sqrt(vHat) + epsilon);
          }
          break;
        }

        default: // vanilla
          for (let i = 0; i < n; i++) {
            x[i] -= alpha * g[i];
          }
      }
    }

    return this._result(x, f, grad(x), history, false);
  }

  /**
   * Newton's method with optional backtracking line search.
   */
  newton(
    f: ObjectiveFn,
    grad: GradientFn,
    hessian: HessianFn,
    x0: number[],
    options: NewtonOptions = {}
  ): OptimizationResult {
    const { maxIter = 100, tol = 1e-10, lineSearch = true } = options;

    let x = [...x0];
    const n = x.length;
    const history: OptimizationResult["history"] = [];

    for (let iter = 0; iter < maxIter; iter++) {
      const g = grad(x);
      const H = hessian(x);
      const fVal = f(x);
      const gNorm = this._norm(g);

      history.push({ iter, objective: fVal, gradNorm: gNorm });
      if (gNorm < tol) {
        return this._result(x, f, g, history, true);
      }

      // Solve H*d = -g
      const negG = g.map(gi => -gi);
      const d = this._solveLinearSystem(H, negG);
      if (!d) {
        return this._result(x, f, g, history, false);
      }

      // Backtracking line search
      let step = 1.0;
      if (lineSearch) {
        const c = 0.0001;
        const rho = 0.5;
        const dirDeriv = this._dot(g, d);
        while (f(x.map((xi, i) => xi + step * d[i])) > fVal + c * step * dirDeriv) {
          step *= rho;
          if (step < 1e-16) break;
        }
      }

      for (let i = 0; i < n; i++) {
        x[i] += step * d[i];
      }
    }

    return this._result(x, f, grad(x), history, false);
  }

  /**
   * BFGS quasi-Newton method (approximates inverse Hessian).
   */
  bfgs(
    f: ObjectiveFn,
    grad: GradientFn,
    x0: number[],
    options: BFGSOptions = {}
  ): OptimizationResult {
    const { maxIter = 200, tol = 1e-8 } = options;

    let x = [...x0];
    const n = x.length;

    // Initialize inverse Hessian as identity
    let H = Array.from({ length: n }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1;
      return row;
    });

    const history: OptimizationResult["history"] = [];

    for (let iter = 0; iter < maxIter; iter++) {
      const g = grad(x);
      const fVal = f(x);
      const gNorm = this._norm(g);

      history.push({ iter, objective: fVal, gradNorm: gNorm });
      if (gNorm < tol) {
        return this._result(x, f, g, history, true);
      }

      // Search direction: d = -H * g
      const d = this._matVecMult(H, g.map(gi => -gi));

      // Backtracking line search
      let alpha = 1.0;
      const c = 0.0001;
      const rho = 0.5;
      const dirDeriv = this._dot(g, d);
      while (f(x.map((xi, i) => xi + alpha * d[i])) > fVal + c * alpha * dirDeriv) {
        alpha *= rho;
        if (alpha < 1e-16) break;
      }

      // Update x
      const xNew = x.map((xi, i) => xi + alpha * d[i]);
      const s = xNew.map((xni, i) => xni - x[i]);
      const gNew = grad(xNew);
      const y = gNew.map((gni, i) => gni - g[i]);

      // BFGS inverse Hessian update
      const rho_k = 1 / this._dot(y, s);
      if (isFinite(rho_k) && rho_k > 0) {
        const I = Array.from({ length: n }, (_, i) => {
          const row = new Array(n).fill(0);
          row[i] = 1;
          return row;
        });

        const sy = this._outerProduct(s, y);
        const ys = this._outerProduct(y, s);
        const ss = this._outerProduct(s, s);

        const M1 = this._matSubtract(I, this._matScale(sy, rho_k));
        const M2 = this._matSubtract(I, this._matScale(ys, rho_k));
        const term1 = this._matMult(this._matMult(M1, H), M2);
        const term2 = this._matScale(ss, rho_k);
        H = this._matAdd(term1, term2);
      }

      x = xNew;
    }

    return this._result(x, f, grad(x), history, false);
  }

  /**
   * Golden section search for 1D optimization.
   */
  goldenSection(
    f: (x: number) => number,
    a: number,
    b: number,
    tol: number = 1e-8,
    maxIter: number = 100
  ): { x: number; objective: number; iterations: number } {
    const phi = (1 + Math.sqrt(5)) / 2;
    const resphi = 2 - phi;

    let x1 = a + resphi * (b - a);
    let x2 = b - resphi * (b - a);
    let f1 = f(x1);
    let f2 = f(x2);

    let iter = 0;
    while (Math.abs(b - a) > tol && iter < maxIter) {
      if (f1 < f2) {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = a + resphi * (b - a);
        f1 = f(x1);
      } else {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = b - resphi * (b - a);
        f2 = f(x2);
      }
      iter++;
    }

    const xOpt = (a + b) / 2;
    return { x: xOpt, objective: f(xOpt), iterations: iter };
  }

  /**
   * Numerical gradient approximation (central difference).
   */
  numericalGradient(f: ObjectiveFn, x: number[], h: number = 1e-7): number[] {
    const n = x.length;
    const grad = new Array(n);
    for (let i = 0; i < n; i++) {
      const xPlus = [...x];
      const xMinus = [...x];
      xPlus[i] += h;
      xMinus[i] -= h;
      grad[i] = (f(xPlus) - f(xMinus)) / (2 * h);
    }
    return grad;
  }

  /**
   * Numerical Hessian approximation.
   */
  numericalHessian(f: ObjectiveFn, x: number[], h: number = 1e-5): number[][] {
    const n = x.length;
    const H: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          // Diagonal: standard 3-point central difference d²f/dx² = (f(x+h) - 2f(x) + f(x-h))/h²
          const xp = [...x]; xp[i] += h;
          const xm = [...x]; xm[i] -= h;
          H[i][i] = (f(xp) - 2 * f(x) + f(xm)) / (h * h);
        } else {
          // Off-diagonal: 4-point cross derivative
          const xpp = [...x]; xpp[i] += h; xpp[j] += h;
          const xpm = [...x]; xpm[i] += h; xpm[j] -= h;
          const xmp = [...x]; xmp[i] -= h; xmp[j] += h;
          const xmm = [...x]; xmm[i] -= h; xmm[j] -= h;
          H[i][j] = (f(xpp) - f(xpm) - f(xmp) + f(xmm)) / (4 * h * h);
          H[j][i] = H[i][j];
        }
      }
    }

    return H;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _result(
    x: number[],
    f: ObjectiveFn,
    g: number[],
    history: OptimizationResult["history"],
    converged: boolean
  ): OptimizationResult {
    return {
      x: x.map(v => Math.round(v * 1e12) / 1e12),
      objective: f(x),
      iterations: history.length,
      converged,
      gradNorm: this._norm(g),
      history,
    };
  }

  private _norm(v: number[]): number {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  }

  private _dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
    return sum;
  }

  private _matVecMult(M: number[][], v: number[]): number[] {
    return M.map(row => this._dot(row, v));
  }

  private _outerProduct(a: number[], b: number[]): number[][] {
    return a.map(ai => b.map(bi => ai * bi));
  }

  private _matScale(M: number[][], s: number): number[][] {
    return M.map(row => row.map(v => v * s));
  }

  private _matAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((v, j) => v + B[i][j]));
  }

  private _matSubtract(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((v, j) => v - B[i][j]));
  }

  private _matMult(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;
    const p = B.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (_, j) => {
        let sum = 0;
        for (let k = 0; k < p; k++) sum += A[i][k] * B[k][j];
        return sum;
      })
    );
  }

  private _solveLinearSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    // SVD-backed solve with condition monitoring (BFGS Hessian may be ill-conditioned)
    try {
      const kappa = SVDEngine.conditionNumber(A).conditionNumber;
      if (kappa > 1e14) return null; // Nearly singular — signal gradient fallback
      return SVDEngine.leastSquares(A, b).x;
    } catch { /* SVD failed */ }
    // Fallback: Gaussian elimination
    const M = A.map((row, i) => [...row, b[i]]);
    for (let k = 0; k < n; k++) {
      let maxVal = Math.abs(M[k][k]), maxRow = k;
      for (let i = k + 1; i < n; i++)
        if (Math.abs(M[i][k]) > maxVal) { maxVal = Math.abs(M[i][k]); maxRow = i; }
      if (maxVal < 1e-15) return null;
      if (maxRow !== k) [M[k], M[maxRow]] = [M[maxRow], M[k]];
      for (let i = k + 1; i < n; i++) {
        const factor = M[i][k] / M[k][k];
        for (let j = k; j <= n; j++) M[i][j] -= factor * M[k][j];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
      if (Math.abs(M[i][i]) < 1e-15) return null;
      x[i] /= M[i][i];
    }
    return x;
  }
}

export const gradientOptimizationEngine = new GradientOptimizationEngineImpl();
