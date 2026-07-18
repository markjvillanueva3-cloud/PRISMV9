/**
 * NumericalIntegrationEngine — Quadrature Methods
 *
 * Provides numerical integration (quadrature) methods:
 * - Trapezoidal rule
 * - Simpson's 1/3 rule
 * - Gauss-Legendre (up to 5-point)
 * - Adaptive Simpson's with error control
 * - 2D integration over rectangular domains
 *
 * Manufacturing use: cutting force integration over engagement arcs,
 * MRR over variable-depth paths, energy consumption, thermal load
 * accumulation, surface area of freeform surfaces.
 *
 * @module NumericalIntegrationEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrationResult {
  value: number;
  error?: number;
  evaluations: number;
}

export interface Integration2DResult {
  value: number;
  evaluations: number;
}

// ---------------------------------------------------------------------------
// Gauss-Legendre nodes and weights (on [-1, 1])
// ---------------------------------------------------------------------------

const GL_NODES: Record<number, number[]> = {
  1: [0],
  2: [-0.5773502691896257, 0.5773502691896257],
  3: [-0.7745966692414834, 0, 0.7745966692414834],
  4: [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526],
  5: [-0.9061798459386640, -0.5384693101056831, 0, 0.5384693101056831, 0.9061798459386640],
};

const GL_WEIGHTS: Record<number, number[]> = {
  1: [2],
  2: [1, 1],
  3: [0.5555555555555556, 0.8888888888888888, 0.5555555555555556],
  4: [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538],
  5: [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891],
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class NumericalIntegrationEngineImpl {

  /**
   * Trapezoidal rule.
   */
  trapezoidal(f: (x: number) => number, a: number, b: number, n: number = 100): IntegrationResult {
    const h = (b - a) / n;
    let sum = 0.5 * (f(a) + f(b));
    for (let i = 1; i < n; i++) {
      sum += f(a + i * h);
    }
    return { value: sum * h, evaluations: n + 1 };
  }

  /**
   * Simpson's 1/3 rule (n must be even, will be rounded up if odd).
   */
  simpson(f: (x: number) => number, a: number, b: number, n: number = 100): IntegrationResult {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * f(x);
    }

    return { value: (sum * h) / 3, evaluations: n + 1 };
  }

  /**
   * Gauss-Legendre quadrature on [a, b].
   * @param points Number of quadrature points (1-5)
   */
  gaussLegendre(
    f: (x: number) => number, a: number, b: number, points: number = 5
  ): IntegrationResult {
    const np = Math.min(5, Math.max(1, points));
    const nodes = GL_NODES[np];
    const weights = GL_WEIGHTS[np];

    // Transform from [-1,1] to [a,b]: x = (b-a)/2 * t + (a+b)/2
    const halfRange = (b - a) / 2;
    const midpoint = (a + b) / 2;

    let sum = 0;
    for (let i = 0; i < np; i++) {
      const x = halfRange * nodes[i] + midpoint;
      sum += weights[i] * f(x);
    }

    return { value: sum * halfRange, evaluations: np };
  }

  /**
   * Composite Gauss-Legendre: split [a,b] into panels, apply GL on each.
   */
  compositeGaussLegendre(
    f: (x: number) => number, a: number, b: number,
    panels: number = 10, points: number = 5
  ): IntegrationResult {
    const panelWidth = (b - a) / panels;
    let total = 0;
    let evals = 0;

    for (let p = 0; p < panels; p++) {
      const pa = a + p * panelWidth;
      const pb = pa + panelWidth;
      const r = this.gaussLegendre(f, pa, pb, points);
      total += r.value;
      evals += r.evaluations;
    }

    return { value: total, evaluations: evals };
  }

  /**
   * Adaptive Simpson's rule with automatic error control.
   */
  adaptiveSimpson(
    f: (x: number) => number, a: number, b: number,
    tolerance: number = 1e-8, maxDepth: number = 50
  ): IntegrationResult {
    let evaluations = 0;

    const evalF = (x: number): number => {
      evaluations++;
      return f(x);
    };

    const simpsonRule = (a: number, fa: number, b: number, fb: number): {
      value: number; mid: number; fmid: number
    } => {
      const mid = (a + b) / 2;
      const fmid = evalF(mid);
      return { value: ((b - a) / 6) * (fa + 4 * fmid + fb), mid, fmid };
    };

    const recurse = (
      a: number, fa: number, b: number, fb: number,
      whole: number, depth: number
    ): number => {
      const mid = (a + b) / 2;
      const fmid = evalF(mid);
      const left = simpsonRule(a, fa, mid, fmid);
      const right = simpsonRule(mid, fmid, b, fb);
      const refined = left.value + right.value;

      if (depth >= maxDepth || Math.abs(refined - whole) <= 15 * tolerance) {
        return refined + (refined - whole) / 15; // Richardson extrapolation
      }

      return (
        recurse(a, fa, mid, fmid, left.value, depth + 1) +
        recurse(mid, fmid, b, fb, right.value, depth + 1)
      );
    };

    const fa = evalF(a);
    const fb = evalF(b);
    const { value: whole } = simpsonRule(a, fa, b, fb);
    const value = recurse(a, fa, b, fb, whole, 0);

    return { value, evaluations };
  }

  /**
   * 2D integration over [xa, xb] × [ya, yb] using composite Simpson.
   */
  integrate2D(
    f: (x: number, y: number) => number,
    xa: number, xb: number,
    ya: number, yb: number,
    nx: number = 20, ny: number = 20
  ): Integration2DResult {
    if (nx % 2 !== 0) nx++;
    if (ny % 2 !== 0) ny++;

    let evaluations = 0;
    const outerIntegrand = (x: number): number => {
      // Inner Simpson over y
      const hy = (yb - ya) / ny;
      let innerSum = f(x, ya) + f(x, yb);
      evaluations += 2;
      for (let j = 1; j < ny; j++) {
        const y = ya + j * hy;
        innerSum += (j % 2 === 0 ? 2 : 4) * f(x, y);
        evaluations++;
      }
      return (innerSum * hy) / 3;
    };

    // Outer Simpson over x
    const hx = (xb - xa) / nx;
    let sum = outerIntegrand(xa) + outerIntegrand(xb);
    for (let i = 1; i < nx; i++) {
      const x = xa + i * hx;
      sum += (i % 2 === 0 ? 2 : 4) * outerIntegrand(x);
    }

    return { value: (sum * hx) / 3, evaluations };
  }

  /**
   * Integrate a sampled function (discrete data points) using trapezoidal rule.
   */
  integrateSampled(x: number[], y: number[]): IntegrationResult {
    if (x.length !== y.length || x.length < 2) {
      return { value: 0, evaluations: 0 };
    }
    let sum = 0;
    for (let i = 1; i < x.length; i++) {
      sum += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
    }
    return { value: sum, evaluations: x.length };
  }

  /**
   * Romberg integration — Richardson extrapolation of trapezoidal rule.
   */
  romberg(
    f: (x: number) => number, a: number, b: number,
    maxOrder: number = 8, tolerance: number = 1e-10
  ): IntegrationResult {
    const R: number[][] = [];
    let evaluations = 0;

    for (let k = 0; k < maxOrder; k++) {
      const n = 1 << k; // 2^k
      R[k] = [];

      // Trapezoidal with 2^k panels
      const h = (b - a) / n;
      if (k === 0) {
        R[0][0] = 0.5 * (b - a) * (f(a) + f(b));
        evaluations += 2;
      } else {
        let sum = 0;
        for (let i = 1; i <= n / 2; i++) {
          sum += f(a + (2 * i - 1) * h);
          evaluations++;
        }
        R[k][0] = 0.5 * R[k - 1][0] + h * sum;
      }

      // Richardson extrapolation
      for (let j = 1; j <= k; j++) {
        const factor = 4 ** j;
        R[k][j] = (factor * R[k][j - 1] - R[k - 1][j - 1]) / (factor - 1);
      }

      if (k > 0 && Math.abs(R[k][k] - R[k - 1][k - 1]) < tolerance) {
        return { value: R[k][k], error: Math.abs(R[k][k] - R[k - 1][k - 1]), evaluations };
      }
    }

    const last = maxOrder - 1;
    return {
      value: R[last][last],
      error: last > 0 ? Math.abs(R[last][last] - R[last - 1][last - 1]) : undefined,
      evaluations,
    };
  }
}

export const numericalIntegrationEngine = new NumericalIntegrationEngineImpl();
