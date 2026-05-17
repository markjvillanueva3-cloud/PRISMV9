/**
 * Gradient Descent — first-order local optimizer (vanilla / momentum / Adam)
 *
 * Minimizes a smooth scalar objective f: ℝⁿ → ℝ by iterating against its
 * gradient. Complements PRISM's existing derivative-FREE global optimizers
 * (`BayesianOptimizer`, `GeneticOptimizer`) — this is the first-order LOCAL
 * regime: smooth differentiable objectives, fast convergence near a minimum
 * (least-squares calibration, speed/feed parameter fitting, model tuning).
 *
 * Three update rules:
 *   - **vanilla**:  x ← x − α·∇f
 *   - **momentum** (heavy-ball): v ← μ·v − α·∇f ; x ← x + v
 *   - **adam** (Kingma & Ba 2015): bias-corrected 1st/2nd moment estimates
 *
 * Gradient is caller-supplied (`gradF`) when known; otherwise estimated by
 * central finite differences (O(h²)) — the same stencil family as
 * [[FiniteDifferenceMethod]], kept self-contained here for a scalar→vector
 * objective so the optimizer has no cross-dependency.
 *
 * Pure numerical primitive — NO physics constants. The objective encodes
 * whatever physics the caller needs; this file only walks downhill.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-GD: Created 2026-05-17 from
 * MIT-OCW 18.02 (Multivariable Calculus) FORGE-QUEUE candidate
 * `algorithm:gradient-descent`, mfg_relevance 0.80, dedup CLEAR
 * (Bayesian/Genetic optimizers are derivative-free — different regime).
 *
 * @see Kingma, D.P. & Ba, J. (2015) "Adam: A Method for Stochastic
 *      Optimization", ICLR. arXiv:1412.6980
 * @see Nocedal, J. & Wright, S.J. (2006) "Numerical Optimization" 2nd ed.,
 *      Springer. doi:10.1007/978-0-387-40065-5 (Ch.3 line search, Ch.5)
 *
 * @module algorithms/GradientDescent
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type AtomicValue,
  type ValidationResult,
  createAtomicValue,
  computeSafetyScore,
  createValidationResult,
} from "./types.js";

// ─── Objective contract ────────────────────────────────────────────

/** Scalar objective f(x) → ℝ. MUST be pure and return a finite number. */
export type ObjectiveFn = (x: readonly number[]) => number;
/** Optional analytic gradient ∇f(x) → ℝⁿ (same length as x). */
export type GradientFn = (x: readonly number[]) => number[];

// ─── Input / Output ────────────────────────────────────────────────

export interface GradientDescentInput extends AlgorithmInput {
  /** Objective to minimize */
  f: ObjectiveFn;
  /** Initial point x0 */
  x0: readonly number[];
  /** Learning rate α > 0 */
  learning_rate: number;
  /** Max iterations */
  max_iters: number;
  /** Convergence tolerance on ‖∇f‖∞ (default 1e-6) */
  tol?: number;
  /** Update rule (default "adam") */
  method?: "vanilla" | "momentum" | "adam";
  /** Analytic gradient; if omitted, central finite-difference is used */
  gradF?: GradientFn;
  /** momentum: μ ∈ [0,1) (default 0.9) */
  momentum?: number;
  /** adam: β1, β2, ε (defaults 0.9, 0.999, 1e-8) */
  adam?: { beta1?: number; beta2?: number; epsilon?: number };
  /** finite-diff step h for numerical gradient (default 1e-6) */
  fd_step?: number;
  /** capture ‖∇f‖∞ per iteration (memory O(iters)) */
  capture_history?: boolean;
}

export interface GradientDescentOutput extends AlgorithmOutput {
  /** Optimum found */
  x_opt: number[];
  /** f(x_opt) */
  f_opt: AtomicValue<number>;
  /** Iterations actually run */
  iterations: number;
  /** True if ‖∇f‖∞ < tol before max_iters */
  converged: boolean;
  /** Final ‖∇f‖∞ */
  final_grad_norm: number;
  method_used: "vanilla" | "momentum" | "adam";
  /** Optional ‖∇f‖∞ per iteration */
  grad_norm_history?: number[];
  /** True if the run diverged (f or x went non-finite) — fail-loud */
  diverged: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_TOL = 1e-6;
const DEFAULT_FD_STEP = 1e-6;
const DIVERGENCE_THRESHOLD = 1e15;
const MAX_DIM = 100_000;
const MAX_ITERS_CEIL = 10_000_000;

// ─── helpers ───────────────────────────────────────────────────────

function infNorm(v: readonly number[]): number {
  let m = 0;
  for (let i = 0; i < v.length; i += 1) {
    const a = Math.abs(v[i]);
    if (!Number.isFinite(a)) return Number.POSITIVE_INFINITY;
    if (a > m) m = a;
  }
  return m;
}

/** Central finite-difference gradient: ∂f/∂xᵢ ≈ (f(x+hₑᵢ) − f(x−hₑᵢ))/2h. */
function numericalGradient(f: ObjectiveFn, x: readonly number[], h: number): number[] {
  const n = x.length;
  const g = new Array<number>(n);
  const xp = x.slice();
  for (let i = 0; i < n; i += 1) {
    const xi = x[i];
    xp[i] = xi + h;
    const fp = f(xp);
    xp[i] = xi - h;
    const fm = f(xp);
    xp[i] = xi; // restore
    g[i] = (fp - fm) / (2 * h);
  }
  return g;
}

// ─── Impl ──────────────────────────────────────────────────────────

class GradientDescentImpl implements Algorithm<GradientDescentInput, GradientDescentOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: GradientDescentInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof input.f !== "function") errors.push("f must be a function");
    if (input.gradF !== undefined && typeof input.gradF !== "function") {
      errors.push("gradF must be a function when provided");
    }
    if (!Array.isArray(input.x0) || input.x0.length === 0) {
      errors.push("x0 must be a non-empty array");
    } else {
      for (let i = 0; i < input.x0.length; i += 1) {
        if (typeof input.x0[i] !== "number" || !Number.isFinite(input.x0[i])) {
          errors.push(`x0[${i}] must be a finite number (got ${input.x0[i]})`);
          break;
        }
      }
      if (input.x0.length > MAX_DIM) errors.push(`x0 dim ${input.x0.length} exceeds max ${MAX_DIM}`);
    }
    if (!Number.isFinite(input.learning_rate) || input.learning_rate <= 0) {
      errors.push(`learning_rate must be a positive finite number (got ${input.learning_rate})`);
    }
    if (!Number.isInteger(input.max_iters) || input.max_iters < 1) {
      errors.push(`max_iters must be a positive integer (got ${input.max_iters})`);
    } else if (input.max_iters > MAX_ITERS_CEIL) {
      errors.push(`max_iters ${input.max_iters} exceeds ceiling ${MAX_ITERS_CEIL}`);
    }
    if (input.tol !== undefined && (!Number.isFinite(input.tol) || input.tol <= 0)) {
      errors.push(`tol must be a positive finite number (got ${input.tol})`);
    }
    if (input.method !== undefined && !["vanilla", "momentum", "adam"].includes(input.method)) {
      errors.push(`method must be vanilla | momentum | adam (got ${input.method})`);
    }
    if (input.momentum !== undefined && (!(input.momentum >= 0) || input.momentum >= 1)) {
      errors.push(`momentum must be in [0,1) (got ${input.momentum})`);
    }
    return createValidationResult(errors, warnings);
  }

  calculate(input: GradientDescentInput): GradientDescentOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`GradientDescent validation failed: ${(validation.errors ?? []).join(", ")}`);
    }
    const warnings = [...(validation.warnings ?? [])];
    const f = input.f;
    const method = input.method ?? "adam";
    const alpha = input.learning_rate;
    const maxIters = input.max_iters;
    const tol = input.tol ?? DEFAULT_TOL;
    const h = input.fd_step ?? DEFAULT_FD_STEP;
    const mu = input.momentum ?? 0.9;
    const beta1 = input.adam?.beta1 ?? 0.9;
    const beta2 = input.adam?.beta2 ?? 0.999;
    const eps = input.adam?.epsilon ?? 1e-8;
    const grad: GradientFn = input.gradF ?? ((x) => numericalGradient(f, x, h));
    const capture = input.capture_history === true;
    const n = input.x0.length;

    let x = input.x0.slice();
    const v = new Array<number>(n).fill(0); // momentum velocity
    const mAdam = new Array<number>(n).fill(0); // adam 1st moment
    const vAdam = new Array<number>(n).fill(0); // adam 2nd moment
    const history: number[] | undefined = capture ? [] : undefined;

    let iterations = 0;
    let converged = false;
    let diverged = false;
    let gNorm = Number.POSITIVE_INFINITY;

    for (let k = 1; k <= maxIters; k += 1) {
      const g = grad(x);
      if (!Array.isArray(g) || g.length !== n) {
        throw new TypeError(`gradient must return an array of length ${n}, got ${Array.isArray(g) ? g.length : typeof g}`);
      }
      gNorm = infNorm(g);
      if (history) history.push(gNorm);
      iterations = k;

      if (!Number.isFinite(gNorm) || gNorm > DIVERGENCE_THRESHOLD) {
        diverged = true;
        warnings.push(
          `Diverged at iter ${k}: ‖∇f‖∞=${gNorm.toExponential(2)} — learning_rate ${alpha} likely too large for this objective.`,
        );
        break;
      }
      if (gNorm < tol) {
        converged = true;
        break;
      }

      if (method === "vanilla") {
        for (let i = 0; i < n; i += 1) x[i] -= alpha * g[i];
      } else if (method === "momentum") {
        for (let i = 0; i < n; i += 1) {
          v[i] = mu * v[i] - alpha * g[i];
          x[i] += v[i];
        }
      } else {
        // Adam (Kingma & Ba 2015), bias-corrected
        const bc1 = 1 - Math.pow(beta1, k);
        const bc2 = 1 - Math.pow(beta2, k);
        for (let i = 0; i < n; i += 1) {
          mAdam[i] = beta1 * mAdam[i] + (1 - beta1) * g[i];
          vAdam[i] = beta2 * vAdam[i] + (1 - beta2) * g[i] * g[i];
          const mHat = mAdam[i] / bc1;
          const vHat = vAdam[i] / bc2;
          x[i] -= (alpha * mHat) / (Math.sqrt(vHat) + eps);
        }
      }

      const xNorm = infNorm(x);
      if (!Number.isFinite(xNorm) || xNorm > DIVERGENCE_THRESHOLD) {
        diverged = true;
        warnings.push(`Diverged at iter ${k}: ‖x‖∞=${xNorm.toExponential(2)} (step overshoot).`);
        break;
      }
    }

    const fOpt = f(x);
    const processScore = diverged ? 0.3 : converged ? 0.98 : 0.8;
    const safety = computeSafetyScore(1.0, converged ? 1.0 : 0.85, 1.0, processScore);

    return {
      x_opt: x,
      f_opt: createAtomicValue(
        fOpt,
        "-",
        converged ? 1 : 10,
        "gradient-descent",
        safety.score,
        `f(x_opt) after ${iterations} iters (${method}), ‖∇f‖∞=${gNorm.toExponential(2)}`,
      ),
      iterations,
      converged,
      final_grad_norm: gNorm,
      method_used: method,
      grad_norm_history: history,
      diverged,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: GradientDescentImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "gradient_descent",
      name: "Gradient Descent (vanilla / momentum / Adam)",
      version: GradientDescentImpl.VERSION,
      domain: "optimization",
      category: "first_order_local",
      description:
        "First-order local minimizer for smooth f:ℝⁿ→ℝ. Vanilla / heavy-ball " +
        "momentum / Adam update rules; analytic or central-finite-difference " +
        "gradient. Complements derivative-free Bayesian/Genetic optimizers. " +
        "No physics constants — objective encodes the caller's physics.",
      equation_plain:
        "vanilla: x←x−α∇f ; momentum: v←μv−α∇f, x←x+v ; adam: bias-corrected m,v",
      equation_latex:
        "x_{k+1} = x_k - \\alpha \\nabla f(x_k)",
      references: [
        {
          authors: "Kingma, D.P. & Ba, J.",
          title: "Adam: A Method for Stochastic Optimization",
          publication: "ICLR (arXiv:1412.6980)",
          year: 2015,
        },
        {
          authors: "Nocedal, J. & Wright, S.J.",
          title: "Numerical Optimization",
          publication: "Springer (2nd ed.)",
          year: 2006,
          doi: "10.1007/978-0-387-40065-5",
        },
      ],
      assumptions: [
        "Objective f is (at least locally) smooth and differentiable",
        "A descent direction exists (well-posed minimization)",
        "Analytic gradient is correct when supplied; else central-FD O(h²)",
        "Learning rate is within the stable regime for the objective curvature",
      ],
      limitations: [
        "Local optimizer — converges to nearest stationary point, not global",
        "No line search / trust region (fixed α; divergence guard only)",
        "Numerical gradient costs 2n objective evals per iteration",
        "Stochastic / mini-batch objectives out of scope (deterministic f)",
      ],
      valid_ranges: {
        dim: { min: 1, max: MAX_DIM, unit: "-" },
        max_iters: { min: 1, max: MAX_ITERS_CEIL, unit: "-" },
      },
      applicable_materials: [],
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

export const GradientDescent = new GradientDescentImpl();

// WIRE-EXEMPT: numerical primitive intentionally not wired this commit —
// shares deferred U-COURSE-FORGE-P1-DISPATCHER (prism_calc:gradient_descent).
// Fully usable via direct import; complements BayesianOptimizer /
// GeneticOptimizer (derivative-free) with the first-order local regime.
