/**
 * SQPEngine — Sequential Quadratic Programming
 *
 * Solves nonlinear constrained optimization by solving a sequence of
 * QP subproblems. Each iteration approximates the Lagrangian Hessian
 * and linearizes constraints.
 *
 * Manufacturing use: multi-objective cutting parameter optimization
 * with nonlinear constraints (power, vibration, surface finish).
 *
 * @module SQPEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SQPConfig {
  dimensions: number;
  x0: number[];
  /** Inequality constraints g_i(x) <= 0 */
  constraints?: ((x: number[]) => number)[];
  /** Equality constraints h_i(x) = 0 */
  equalityConstraints?: ((x: number[]) => number)[];
  bounds?: { min: number; max: number }[];
  maxIterations?: number;      // Default 100
  tolerance?: number;          // Default 1e-6
  gradientStep?: number;       // Default 1e-6
}

export interface SQPResult {
  x: number[];
  fval: number;
  iterations: number;
  converged: boolean;
  constraintViolation: number;
  lagrangeMultipliers: number[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SQPEngineImpl {

  /**
   * Minimize f(x) subject to g(x) <= 0, h(x) = 0, bounds.
   */
  minimize(
    objective: (x: number[]) => number,
    config: SQPConfig
  ): SQPResult {
    const {
      dimensions: n, x0,
      constraints = [],
      equalityConstraints = [],
      bounds,
      maxIterations = 100,
      tolerance = 1e-6,
      gradientStep: h = 1e-6,
    } = config;

    let x = [...x0];
    const m = constraints.length;
    const p = equalityConstraints.length;
    let lambda = new Array(m + p).fill(0);  // Lagrange multipliers
    let converged = false;

    // BFGS Hessian approximation (start with identity)
    let B: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1.0 : 0.0)
    );

    for (let iter = 0; iter < maxIterations; iter++) {
      const f = objective(x);
      const gradF = this._gradient(objective, x, n, h);

      // Evaluate constraints
      const g = constraints.map(c => c(x));
      const heq = equalityConstraints.map(c => c(x));

      // Check convergence
      const maxViolation = Math.max(
        0,
        ...g.map(gi => Math.max(0, gi)),
        ...heq.map(hi => Math.abs(hi))
      );
      const gradNorm = Math.sqrt(gradF.reduce((s, gi) => s + gi * gi, 0));

      if (gradNorm < tolerance && maxViolation < tolerance) {
        converged = true;
        break;
      }

      // Solve QP subproblem: min 0.5 d^T B d + gradF^T d
      // s.t. gradG_i^T d + g_i <= 0, gradH_j^T d + h_j = 0
      const gradG = constraints.map(c => this._gradient(c, x, n, h));
      const gradH = equalityConstraints.map(c => this._gradient(c, x, n, h));

      const d = this._solveQPSubproblem(B, gradF, g, gradG, heq, gradH, n, bounds, x);

      // Line search with merit function
      let alpha = 1.0;
      const penalty = 10;
      const meritBefore = f + penalty * maxViolation;

      for (let ls = 0; ls < 20; ls++) {
        const xNew = x.map((xi, i) => xi + alpha * d[i]);

        // Apply bounds
        if (bounds) {
          for (let i = 0; i < n; i++) {
            xNew[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, xNew[i]));
          }
        }

        const fNew = objective(xNew);
        const gNew = constraints.map(c => c(xNew));
        const hNew = equalityConstraints.map(c => c(xNew));
        const violNew = Math.max(0, ...gNew.map(gi => Math.max(0, gi)), ...hNew.map(hi => Math.abs(hi)));
        const meritNew = fNew + penalty * violNew;

        if (meritNew < meritBefore - 1e-4 * alpha * gradNorm) {
          break;
        }
        alpha *= 0.5;
      }

      // Update x
      const xPrev = [...x];
      for (let i = 0; i < n; i++) {
        x[i] += alpha * d[i];
        if (bounds?.[i]) {
          x[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, x[i]));
        }
      }

      // BFGS Hessian update
      const gradFNew = this._gradient(objective, x, n, h);
      const s = x.map((xi, i) => xi - xPrev[i]);
      const y = gradFNew.map((gi, i) => gi - gradF[i]);
      B = this._bfgsUpdate(B, s, y, n);

      // Update Lagrange multipliers
      for (let i = 0; i < m; i++) {
        lambda[i] = Math.max(0, lambda[i] + alpha * g[i]);
      }
      for (let i = 0; i < p; i++) {
        lambda[m + i] += alpha * heq[i];
      }
    }

    const finalG = constraints.map(c => c(x));
    const finalH = equalityConstraints.map(c => c(x));
    const violation = Math.max(
      0,
      ...finalG.map(gi => Math.max(0, gi)),
      ...finalH.map(hi => Math.abs(hi))
    );

    return {
      x,
      fval: objective(x),
      iterations: maxIterations,
      converged,
      constraintViolation: violation,
      lagrangeMultipliers: lambda,
    };
  }

  private _solveQPSubproblem(
    B: number[][], gradF: number[],
    g: number[], gradG: number[][],
    heq: number[], gradH: number[][],
    n: number,
    bounds: { min: number; max: number }[] | undefined,
    x: number[]
  ): number[] {
    // Simplified: projected gradient step
    // Full QP would use active-set or interior-point
    const d = new Array(n).fill(0);

    // Newton direction: d = -B^{-1} gradF (simplified as -gradF for diagonal B)
    for (let i = 0; i < n; i++) {
      d[i] = -gradF[i] / (B[i][i] || 1);
    }

    // Project onto constraint boundaries
    for (let ci = 0; ci < g.length; ci++) {
      if (g[ci] >= 0) {
        // Active constraint: project d to reduce violation
        const gNorm2 = gradG[ci].reduce((s, gi) => s + gi * gi, 0);
        if (gNorm2 > 1e-12) {
          const proj = (gradG[ci].reduce((s, gi, i) => s + gi * d[i], 0) + g[ci]) / gNorm2;
          if (proj > 0) {
            for (let i = 0; i < n; i++) {
              d[i] -= proj * gradG[ci][i];
            }
          }
        }
      }
    }

    // Bound clamp
    if (bounds) {
      for (let i = 0; i < n; i++) {
        const newX = x[i] + d[i];
        if (newX < bounds[i].min) d[i] = bounds[i].min - x[i];
        if (newX > bounds[i].max) d[i] = bounds[i].max - x[i];
      }
    }

    return d;
  }

  private _bfgsUpdate(B: number[][], s: number[], y: number[], n: number): number[][] {
    const sy = s.reduce((sum, si, i) => sum + si * y[i], 0);
    if (Math.abs(sy) < 1e-12) return B;

    const Bs = B.map(row => row.reduce((sum, bij, j) => sum + bij * s[j], 0));
    const sBs = s.reduce((sum, si, i) => sum + si * Bs[i], 0);

    const Bnew = B.map(row => [...row]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Bnew[i][j] += (y[i] * y[j]) / sy - (Bs[i] * Bs[j]) / (sBs || 1);
      }
    }

    return Bnew;
  }

  private _gradient(f: (x: number[]) => number, x: number[], n: number, h: number): number[] {
    const grad: number[] = [];
    for (let i = 0; i < n; i++) {
      const xp = [...x]; xp[i] += h;
      const xm = [...x]; xm[i] -= h;
      grad.push((f(xp) - f(xm)) / (2 * h));
    }
    return grad;
  }
}

export const sqpEngine = new SQPEngineImpl();
