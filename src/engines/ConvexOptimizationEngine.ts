/**
 * ConvexOptimizationEngine — Quadratic Programming & Convex Optimization
 *
 * Solves QP problems: min 0.5 x^T Q x + c^T x  s.t. Ax <= b, Aeq x = beq.
 * Uses active-set method for QP and projected gradient for general convex.
 *
 * Manufacturing use: cutting parameter optimization under machine limits,
 * tool allocation, feed/speed trade-off surfaces, fixture clamping force
 * distribution.
 *
 * @module ConvexOptimizationEngine
 */
import { CholeskyEngine } from "./CholeskyEngine.js";
import { SVDEngine } from "./SVDEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QPConfig {
  /** Positive semi-definite quadratic cost matrix (n×n) */
  Q: number[][];
  /** Linear cost vector (n) */
  c: number[];
  /** Inequality constraint matrix A x <= b */
  A?: number[][];
  b?: number[];
  /** Equality constraint matrix Aeq x = beq */
  Aeq?: number[][];
  beq?: number[];
  /** Variable bounds */
  bounds?: { min: number; max: number }[];
  /** Initial feasible point (optional) */
  x0?: number[];
  maxIterations?: number;
  tolerance?: number;
}

export interface QPResult {
  x: number[];
  fval: number;
  iterations: number;
  converged: boolean;
  activeConstraints: number[];
  dualVariables: number[];
}

export interface ConvexConfig {
  dimensions: number;
  x0?: number[];
  bounds?: { min: number; max: number }[];
  constraints?: ((x: number[]) => number)[];  // g_i(x) <= 0
  maxIterations?: number;
  tolerance?: number;
  stepSize?: number;
}

export interface ConvexResult {
  x: number[];
  fval: number;
  iterations: number;
  converged: boolean;
  gradientNorm: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class ConvexOptimizationEngineImpl {

  /**
   * Solve a Quadratic Program via active-set method.
   */
  solveQP(config: QPConfig): QPResult {
    const n = config.c.length;
    const Q = config.Q;
    const c = config.c;
    const A = config.A ?? [];
    const b = config.b ?? [];
    const Aeq = config.Aeq ?? [];
    const beq = config.beq ?? [];
    const maxIter = config.maxIterations ?? 200;
    const tol = config.tolerance ?? 1e-8;

    // Convert bounds to inequality constraints
    const allA: number[][] = [...A];
    const allB: number[] = [...b];
    if (config.bounds) {
      for (let i = 0; i < n; i++) {
        const bound = config.bounds[i];
        if (bound) {
          // x_i <= max  →  e_i^T x <= max
          const rowUpper = new Array(n).fill(0);
          rowUpper[i] = 1;
          allA.push(rowUpper);
          allB.push(bound.max);
          // -x_i <= -min  →  x_i >= min
          const rowLower = new Array(n).fill(0);
          rowLower[i] = -1;
          allA.push(rowLower);
          allB.push(-bound.min);
        }
      }
    }

    const m = allA.length;
    const p = Aeq.length;

    // Initialize with x0 or zero
    let x = config.x0 ? [...config.x0] : new Array(n).fill(0);

    // Project x0 to satisfy equality constraints (simple correction)
    if (p > 0) {
      for (let iter = 0; iter < 10; iter++) {
        for (let j = 0; j < p; j++) {
          const residual = this._dot(Aeq[j], x) - beq[j];
          const norm2 = this._dot(Aeq[j], Aeq[j]);
          if (norm2 > 1e-12) {
            const correction = residual / norm2;
            for (let i = 0; i < n; i++) {
              x[i] -= correction * Aeq[j][i];
            }
          }
        }
      }
    }

    // Active set tracking
    let activeSet: Set<number> = new Set();
    const dualVars = new Array(m).fill(0);

    let converged = false;
    let iter = 0;

    for (; iter < maxIter; iter++) {
      // Gradient: Qx + c
      const grad = this._matVec(Q, x);
      for (let i = 0; i < n; i++) grad[i] += c[i];

      // Project gradient onto equality constraints
      let d = grad.map(g => -g);
      for (let j = 0; j < p; j++) {
        const proj = this._dot(Aeq[j], d) / (this._dot(Aeq[j], Aeq[j]) || 1);
        for (let i = 0; i < n; i++) {
          d[i] -= proj * Aeq[j][i];
        }
      }

      // Project onto active inequality constraints
      for (const ci of activeSet) {
        const proj = this._dot(allA[ci], d) / (this._dot(allA[ci], allA[ci]) || 1);
        if (proj > 0) {
          for (let i = 0; i < n; i++) {
            d[i] -= proj * allA[ci][i];
          }
        }
      }

      const dNorm = Math.sqrt(this._dot(d, d));

      if (dNorm < tol) {
        // Check dual variables for active constraints
        let canRelease = false;
        for (const ci of activeSet) {
          const lambda = this._dot(allA[ci], grad);
          dualVars[ci] = lambda;
          if (lambda < -tol) {
            activeSet.delete(ci);
            canRelease = true;
            break;
          }
        }
        if (!canRelease) {
          converged = true;
          break;
        }
        continue;
      }

      // Line search: step along d
      let alpha = 1.0;

      // Exact step for QP: alpha = -grad^T d / (d^T Q d)
      const dQd = this._quadForm(Q, d);
      if (dQd > tol) {
        alpha = Math.min(1.0, this._dot(grad.map(g => -g), d) / dQd);
      }

      // Constraint limiting
      for (let ci = 0; ci < m; ci++) {
        if (activeSet.has(ci)) continue;
        const ad = this._dot(allA[ci], d);
        if (ad > tol) {
          const slack = allB[ci] - this._dot(allA[ci], x);
          const maxStep = slack / ad;
          if (maxStep < alpha) {
            alpha = Math.max(0, maxStep);
            activeSet.add(ci);
          }
        }
      }

      // Update x
      for (let i = 0; i < n; i++) {
        x[i] += alpha * d[i];
      }
    }

    const fval = 0.5 * this._quadForm(Q, x) + this._dot(c, x);
    return {
      x,
      fval,
      iterations: iter,
      converged,
      activeConstraints: [...activeSet],
      dualVariables: dualVars.slice(0, m),
    };
  }

  /**
   * Minimize a general convex function via projected gradient descent.
   */
  minimizeConvex(
    objective: (x: number[]) => number,
    config: ConvexConfig
  ): ConvexResult {
    const n = config.dimensions;
    const maxIter = config.maxIterations ?? 500;
    const tol = config.tolerance ?? 1e-6;
    const h = 1e-6;
    let stepSize = config.stepSize ?? 0.01;

    let x = config.x0 ? [...config.x0] : new Array(n).fill(0);
    let converged = false;
    let gradNorm = Infinity;
    let iter = 0;

    for (; iter < maxIter; iter++) {
      const f = objective(x);
      const grad = this._numericalGradient(objective, x, n, h);
      gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));

      if (gradNorm < tol) {
        converged = true;
        break;
      }

      // Backtracking line search (Armijo)
      let alpha = stepSize;
      const dg = grad.reduce((s, g) => s + g * g, 0); // grad^T grad
      for (let ls = 0; ls < 30; ls++) {
        const xNew = x.map((xi, i) => xi - alpha * grad[i]);
        this._projectBounds(xNew, config.bounds);
        this._projectConstraints(xNew, config.constraints, n);
        const fNew = objective(xNew);
        if (fNew <= f - 1e-4 * alpha * dg) {
          x = xNew;
          break;
        }
        alpha *= 0.5;
        if (ls === 29) {
          // Take the step anyway with tiny alpha
          for (let i = 0; i < n; i++) {
            x[i] -= alpha * grad[i];
          }
          this._projectBounds(x, config.bounds);
        }
      }
    }

    return {
      x,
      fval: objective(x),
      iterations: iter,
      converged,
      gradientNorm: gradNorm,
    };
  }

  /**
   * Solve a least-squares problem: min ||Ax - b||^2
   * via normal equations A^T A x = A^T b.
   */
  leastSquares(A: number[][], b: number[]): { x: number[]; residual: number } {
    const m = A.length;
    const n = A[0].length;

    // A^T A
    const ATA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < m; k++) sum += A[k][i] * A[k][j];
        ATA[i][j] = sum;
      }
    }

    // A^T b
    const ATb = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < m; k++) ATb[i] += A[k][i] * b[k];
    }

    // Solve via Cholesky-like: add small regularization for stability
    for (let i = 0; i < n; i++) ATA[i][i] += 1e-10;

    const x = this._solveSymmetric(ATA, ATb, n);

    // Compute residual
    let residual = 0;
    for (let k = 0; k < m; k++) {
      let pred = 0;
      for (let j = 0; j < n; j++) pred += A[k][j] * x[j];
      residual += (pred - b[k]) ** 2;
    }

    return { x, residual: Math.sqrt(residual) };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _matVec(M: number[][], v: number[]): number[] {
    return M.map(row => row.reduce((s, mij, j) => s + mij * v[j], 0));
  }

  private _dot(a: number[], b: number[]): number {
    return a.reduce((s, ai, i) => s + ai * (b[i] ?? 0), 0);
  }

  private _quadForm(Q: number[][], x: number[]): number {
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < x.length; j++) {
        sum += x[i] * Q[i][j] * x[j];
      }
    }
    return sum;
  }

  private _numericalGradient(
    f: (x: number[]) => number, x: number[], n: number, h: number
  ): number[] {
    const grad: number[] = [];
    for (let i = 0; i < n; i++) {
      const xp = [...x]; xp[i] += h;
      const xm = [...x]; xm[i] -= h;
      grad.push((f(xp) - f(xm)) / (2 * h));
    }
    return grad;
  }

  private _projectBounds(x: number[], bounds?: { min: number; max: number }[]): void {
    if (!bounds) return;
    for (let i = 0; i < x.length; i++) {
      if (bounds[i]) {
        x[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, x[i]));
      }
    }
  }

  private _projectConstraints(
    x: number[], constraints: ((x: number[]) => number)[] | undefined, n: number
  ): void {
    if (!constraints) return;
    const h = 1e-6;
    for (let pass = 0; pass < 5; pass++) {
      for (const c of constraints) {
        const val = c(x);
        if (val > 0) {
          // Project: move x to reduce constraint violation
          const grad = this._numericalGradient(c, x, n, h);
          const norm2 = grad.reduce((s, g) => s + g * g, 0);
          if (norm2 > 1e-12) {
            const step = val / norm2;
            for (let i = 0; i < n; i++) {
              x[i] -= step * grad[i];
            }
          }
        }
      }
    }
  }

  private _solveSymmetric(A: number[][], b: number[], n: number): number[] {
    // Cholesky for SPD systems (normal equations, regularized Hessians)
    try {
      const L = CholeskyEngine.factorize(A).L;
      return CholeskyEngine.solve(L, b);
    } catch {
      // Fallback: SVD least-squares for indefinite or near-singular systems
      try {
        return SVDEngine.leastSquares(A, b).x;
      } catch {
        // Final fallback: Gaussian elimination
        const aug = A.map((row, i) => [...row, b[i]]);
        for (let col = 0; col < n; col++) {
          let maxVal = Math.abs(aug[col][col]), maxRow = col;
          for (let row = col + 1; row < n; row++)
            if (Math.abs(aug[row][col]) > maxVal) { maxVal = Math.abs(aug[row][col]); maxRow = row; }
          if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
          const pivot = aug[col][col];
          if (Math.abs(pivot) < 1e-14) continue;
          for (let row = col + 1; row < n; row++) {
            const factor = aug[row][col] / pivot;
            for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
          }
        }
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
          let sum = aug[i][n];
          for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
          x[i] = Math.abs(aug[i][i]) > 1e-14 ? sum / aug[i][i] : 0;
        }
        return x;
      }
    }
  }
}

export const convexOptimizationEngine = new ConvexOptimizationEngineImpl();
