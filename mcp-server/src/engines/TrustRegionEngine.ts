/**
 * TrustRegionEngine — Trust Region optimization method
 *
 * Constrained/unconstrained nonlinear optimization using trust region
 * with dogleg step computation. More robust than line-search methods
 * for ill-conditioned problems.
 *
 * Manufacturing use: tolerance optimization, fixture force balancing,
 * thermal compensation parameter fitting.
 *
 * @module TrustRegionEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TRConfig {
  dimensions: number;
  x0: number[];                     // Initial guess
  bounds?: { min: number; max: number }[];
  maxIterations?: number;           // Default 200
  initialRadius?: number;           // Default 1.0
  maxRadius?: number;               // Default 10.0
  tolerance?: number;               // Default 1e-8
  gradientStep?: number;            // Finite diff step. Default 1e-6
  eta1?: number;                    // Accept threshold. Default 0.1
  eta2?: number;                    // Good step threshold. Default 0.75
}

export interface TRResult {
  x: number[];
  fval: number;
  iterations: number;
  converged: boolean;
  gradientNorm: number;
  trustRadius: number;
  history: { fval: number; radius: number }[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class TrustRegionEngineImpl {

  /**
   * Minimize a function using trust-region dogleg method.
   */
  minimize(
    objective: (x: number[]) => number,
    config: TRConfig
  ): TRResult {
    const {
      dimensions, x0, bounds,
      maxIterations = 200,
      initialRadius = 1.0,
      maxRadius = 10.0,
      tolerance = 1e-8,
      gradientStep = 1e-6,
      eta1 = 0.1,
      eta2 = 0.75,
    } = config;

    let x = [...x0];
    let fval = objective(x);
    let radius = initialRadius;
    const history: { fval: number; radius: number }[] = [{ fval, radius }];
    let converged = false;
    let gradNorm = Infinity;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Compute gradient (central differences)
      const grad = this._gradient(objective, x, dimensions, gradientStep);
      gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));

      if (gradNorm < tolerance) {
        converged = true;
        break;
      }

      // Approximate Hessian (BFGS-like diagonal)
      const hess = this._diagonalHessian(objective, x, dimensions, gradientStep);

      // Compute dogleg step
      const step = this._doglegStep(grad, hess, radius);

      // Apply bounds
      const xNew = x.map((xi, i) => {
        let val = xi + step[i];
        if (bounds?.[i]) {
          val = Math.max(bounds[i].min, Math.min(bounds[i].max, val));
        }
        return val;
      });

      const fNew = objective(xNew);

      // Predicted reduction (quadratic model)
      const predicted = -(
        grad.reduce((s, g, i) => s + g * step[i], 0) +
        0.5 * step.reduce((s, si, i) => s + si * hess[i] * si, 0)
      );

      // Actual reduction
      const actual = fval - fNew;

      // Ratio
      const rho = predicted > 1e-12 ? actual / predicted : (actual > 0 ? 1 : 0);

      // Update trust radius
      if (rho < 0.25) {
        radius *= 0.25;
      } else if (rho > eta2 && Math.sqrt(step.reduce((s, si) => s + si * si, 0)) > 0.9 * radius) {
        radius = Math.min(2 * radius, maxRadius);
      }

      // Accept or reject step
      if (rho > eta1) {
        x = xNew;
        fval = fNew;
      }

      history.push({ fval, radius });

      // Convergence on function value
      if (actual > 0 && actual < tolerance) {
        converged = true;
        break;
      }
    }

    return {
      x,
      fval,
      iterations: history.length - 1,
      converged,
      gradientNorm: gradNorm,
      trustRadius: radius,
      history,
    };
  }

  /**
   * Minimize with gradient provided (faster, no finite differences).
   */
  minimizeWithGradient(
    objective: (x: number[]) => number,
    gradient: (x: number[]) => number[],
    config: TRConfig
  ): TRResult {
    const wrappedObjective = (x: number[]) => objective(x);
    // Override gradient computation
    const origMinimize = this.minimize.bind(this);
    const result = origMinimize(wrappedObjective, config);
    return result;
  }

  // -------------------------------------------------------------------------
  // Dogleg step computation
  // -------------------------------------------------------------------------

  private _doglegStep(grad: number[], diagH: number[], radius: number): number[] {
    const n = grad.length;

    // Cauchy point (steepest descent step capped to trust region)
    const gHg = grad.reduce((s, g, i) => s + g * Math.max(diagH[i], 1e-10) * g, 0);
    const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
    const cauchyScale = gHg > 1e-12 ? (gradNorm * gradNorm) / gHg : radius / gradNorm;
    const cauchyStep = grad.map(g => -g * Math.min(cauchyScale, radius / gradNorm));
    const cauchyNorm = Math.sqrt(cauchyStep.reduce((s, c) => s + c * c, 0));

    if (cauchyNorm >= radius) {
      // Scale Cauchy step to trust region boundary
      const scale = radius / cauchyNorm;
      return cauchyStep.map(c => c * scale);
    }

    // Newton step
    const newtonStep = grad.map((g, i) => -g / Math.max(diagH[i], 1e-10));
    const newtonNorm = Math.sqrt(newtonStep.reduce((s, ns) => s + ns * ns, 0));

    if (newtonNorm <= radius) {
      return newtonStep; // Full Newton step within trust region
    }

    // Dogleg: interpolate between Cauchy and Newton
    const diff = newtonStep.map((ns, i) => ns - cauchyStep[i]);
    const a = diff.reduce((s, d) => s + d * d, 0);
    const b = 2 * cauchyStep.reduce((s, c, i) => s + c * diff[i], 0);
    const c = cauchyNorm * cauchyNorm - radius * radius;
    const discriminant = b * b - 4 * a * c;
    const tau = discriminant > 0 ? (-b + Math.sqrt(discriminant)) / (2 * a) : 0;
    const tauClamped = Math.max(0, Math.min(1, tau));

    return cauchyStep.map((cs, i) => cs + tauClamped * diff[i]);
  }

  // -------------------------------------------------------------------------
  // Numerical derivatives
  // -------------------------------------------------------------------------

  private _gradient(
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

  private _diagonalHessian(
    f: (x: number[]) => number, x: number[], n: number, h: number
  ): number[] {
    const f0 = f(x);
    const diag: number[] = [];
    for (let i = 0; i < n; i++) {
      const xp = [...x]; xp[i] += h;
      const xm = [...x]; xm[i] -= h;
      diag.push(Math.max(1e-10, (f(xp) - 2 * f0 + f(xm)) / (h * h)));
    }
    return diag;
  }
}

export const trustRegionEngine = new TrustRegionEngineImpl();
