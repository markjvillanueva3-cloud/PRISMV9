/**
 * LBFGSBOptimizer — Limited-memory BFGS with simple bound constraints.
 *
 * Quasi-Newton optimizer that approximates the inverse Hessian using only the
 * last m steps' (s_k, y_k) pairs (Nocedal 1980; Liu & Nocedal 1989) and projects
 * iterates onto a box [lower, upper] (Byrd, Lu, Nocedal, Zhu 1995 — the "B" in
 * L-BFGS-B). Far fewer function evaluations than GradientDescent on smooth
 * problems (5-30× faster in practice), and unlike SimulatedAnnealing or genetic
 * methods it converges deterministically.
 *
 * Why PRISM needs it (per PSN-ALGORITHM-SCOPING-2026-05-24 §3.5 ALGO-MAT-01):
 *   GradientDescent.ts is the only first-order solver in mcp-server/src/algorithms/.
 *   It's used inside:
 *     • BayesianOptimizer inner-loop maximization of acquisition function
 *     • SurfaceFinishPredictor parameter fit
 *     • JohnsonCookModel constitutive-parameter calibration
 *     • RCSA modal-frequency identification
 *   Each of these is smooth and low-dimensional (≤ 10 params) — exactly L-BFGS-B's
 *   sweet spot. Replacing GD in the inner loop typically cuts iteration count
 *   5-30× without changing the outer engine's contract.
 *
 * Algorithmic specification:
 *
 *   1. Compute g = ∇f(x) at current iterate x.
 *   2. Identify *active set* of bound constraints — components at the bound where
 *      gradient points outward. Project g onto the inactive (free) subspace.
 *   3. Two-loop recursion (Nocedal 1980) builds the search direction
 *      d = −H_k g  from the last m (s_i, y_i) pairs:
 *        q ← g
 *        for i = k-1 ... k-m:
 *          α_i ← ρ_i · s_iᵀ · q;  q ← q − α_i · y_i
 *        r ← γ · q          where γ = (s_{k-1}ᵀ y_{k-1}) / (y_{k-1}ᵀ y_{k-1})
 *        for i = k-m ... k-1:
 *          β ← ρ_i · y_iᵀ · r;  r ← r + (α_i − β) · s_i
 *        d ← −r
 *   4. Line search along d using a backtracking-Armijo rule (sufficient-decrease
 *      with `c1 = 1e-4`), projected onto the box at each trial.
 *   5. Update x; compute new g; build (s, y) and store. Discard the oldest pair
 *      if memory is full.
 *   6. Convergence: ‖projected_g‖∞ < tolGrad OR |f_new - f_old| / max(1, |f_old|) < tolF.
 *
 * Complexity:
 *   • Per iteration: O(m · n) memory, O(m · n) compute  — independent of any
 *     Hessian matrix size.
 *   • Total: O(K · m · n) for K iterations. Typically K ≪ GradientDescent.
 *
 * References:
 *   - Nocedal, J. (1980) "Updating Quasi-Newton Matrices with Limited Storage."
 *     Math. Comp. 35, 773-782.
 *   - Liu, D. C. & Nocedal, J. (1989) "On the Limited Memory BFGS Method for
 *     Large Scale Optimization." Math. Prog. 45, 503-528.
 *   - Byrd, R. H., Lu, P., Nocedal, J., Zhu, C. (1995) "A Limited Memory
 *     Algorithm for Bound Constrained Optimization." SIAM J. Sci. Comput.
 *     16(5), 1190-1208.
 *   - Nocedal, J. & Wright, S. J. (2006) Numerical Optimization, 2nd ed.,
 *     Springer, Algorithms 7.4 and 7.5.
 *
 * Design notes (scientist's red-team):
 *   • This is a *simplified* L-BFGS-B that does NOT implement the cauchy-point
 *     + subspace minimization of Byrd et al. 1995. Instead, it uses the simpler
 *     "gradient projection + projected line search" that handles **box bounds
 *     correctly but may be slower than the full Byrd algorithm on heavily-bound
 *     problems**. For PRISM use cases (bounds are mostly inactive — they only
 *     prevent calibration parameters from going to ±∞), the simplified version
 *     is the right complexity-vs-correctness trade. Documented as a limitation.
 *   • Numerical-safety guards: skip the (s, y) update if `s·y ≤ ε‖s‖‖y‖` to
 *     preserve positive-definiteness of the implicit Hessian approximation
 *     (curvature condition). Without this guard, ill-conditioned objectives
 *     blow up.
 *
 * @module algorithms/LBFGSBOptimizer
 * @since ALGO-SYNERGY-MS0 Phase 3 (2026-05-24, slot:tango)
 */

import type { Algorithm, AlgorithmMeta, ValidationResult } from "./types.js";
import { createValidationResult } from "./types.js";

// ─── Input / Output Types ──────────────────────────────────────────────

export type GradientFunction = (x: readonly number[]) => {
  f: number;
  g: readonly number[];
};

export interface LBFGSBInput {
  /** Objective + gradient function. Returns {f, g} at point x. */
  fun: GradientFunction;
  /** Initial point x_0. Length = problem dimension n. */
  x0: readonly number[];
  /** Lower bounds (length n). Use -Infinity for unbounded below. */
  lower?: readonly number[];
  /** Upper bounds (length n). Use +Infinity for unbounded above. */
  upper?: readonly number[];
  /** L-BFGS memory size m (default 10; 3-20 typical). */
  memory?: number;
  /** Max iterations (default 200). */
  maxIter?: number;
  /** Max line-search backtracks per iteration (default 20). */
  maxLineSearch?: number;
  /** Convergence: ‖projected_g‖∞ < tolGrad (default 1e-6). */
  tolGrad?: number;
  /** Convergence: relative function change < tolF (default 1e-9). */
  tolF?: number;
  /** Armijo sufficient-decrease constant c1 (default 1e-4). */
  c1?: number;
  /** Initial step length (default 1.0). */
  initialStep?: number;
  /** Backtracking shrink factor (default 0.5). */
  backtrackShrink?: number;
}

export type LBFGSBStatus =
  | "converged_grad"
  | "converged_f"
  | "max_iter"
  | "line_search_failed"
  | "non_finite";

export interface LBFGSBOutput {
  /** Final iterate. */
  x: number[];
  /** Final objective value. */
  f: number;
  /** Final gradient (projected onto free subspace). */
  g: number[];
  /** ‖projected_g‖∞ at termination. */
  gNormInf: number;
  /** Iterations performed. */
  iterations: number;
  /** Total f+g evaluations (≥ iterations because of line search). */
  evaluations: number;
  /** Why termination happened. */
  status: LBFGSBStatus;
  /** Final memory occupancy (≤ memory). */
  memoryUsed: number;
  /** Per-iteration trace (f, gNormInf) — useful for debug, capped at 1000. */
  trace: Array<{ iter: number; f: number; gNormInf: number; stepLen: number }>;
  /** Warnings (e.g., curvature condition skipped). */
  warnings: string[];
  /** ISO timestamp. */
  computed_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function projectToBox(
  x: readonly number[],
  lower: readonly number[],
  upper: readonly number[],
): number[] {
  const n = x.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let v = x[i];
    if (v < lower[i]) v = lower[i];
    if (v > upper[i]) v = upper[i];
    out[i] = v;
  }
  return out;
}

/**
 * Project gradient g onto the *free* subspace defined by bounds at x.
 * A component i is "active" (constrained) if x_i == bound and gradient points
 * outward — those entries are zeroed.
 */
function projectGradient(
  x: readonly number[],
  g: readonly number[],
  lower: readonly number[],
  upper: readonly number[],
): number[] {
  const n = x.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const atLower = x[i] <= lower[i] && g[i] > 0; // moving down would leave box
    const atUpper = x[i] >= upper[i] && g[i] < 0; // moving up would leave box
    out[i] = atLower || atUpper ? 0 : g[i];
  }
  return out;
}

function infinityNorm(v: readonly number[]): number {
  let m = 0;
  for (let i = 0; i < v.length; i++) {
    const a = Math.abs(v[i]);
    if (a > m) m = a;
  }
  return m;
}

function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function allFinite(v: readonly number[]): boolean {
  for (let i = 0; i < v.length; i++) {
    if (!Number.isFinite(v[i])) return false;
  }
  return true;
}

// ─── Two-loop recursion ────────────────────────────────────────────────

interface MemoryPair {
  s: number[]; // x_{k+1} - x_k
  y: number[]; // g_{k+1} - g_k
  rho: number; // 1 / (y · s)
}

function twoLoopRecursion(
  g: readonly number[],
  history: ReadonlyArray<MemoryPair>,
): number[] {
  const n = g.length;
  const q = g.slice();
  const m = history.length;

  if (m === 0) {
    // Steepest descent (negated below by caller).
    return q;
  }

  const alpha = new Array<number>(m);

  // Backward loop: i = m-1 ... 0
  for (let i = m - 1; i >= 0; i--) {
    const pair = history[i];
    const a = pair.rho * dot(pair.s, q);
    alpha[i] = a;
    for (let k = 0; k < n; k++) q[k] -= a * pair.y[k];
  }

  // Initial Hessian-vector scaling: γ = (s · y) / (y · y) of the most-recent pair.
  const last = history[m - 1];
  const yy = dot(last.y, last.y);
  const gamma = yy > 0 ? dot(last.s, last.y) / yy : 1;
  for (let k = 0; k < n; k++) q[k] *= gamma;

  // Forward loop: i = 0 ... m-1
  for (let i = 0; i < m; i++) {
    const pair = history[i];
    const beta = pair.rho * dot(pair.y, q);
    const diff = alpha[i] - beta;
    for (let k = 0; k < n; k++) q[k] += diff * pair.s[k];
  }

  // H_k · g (caller negates for descent).
  return q;
}

// ─── Algorithm Object ──────────────────────────────────────────────────

export const LBFGSBOptimizer: Algorithm<LBFGSBInput, LBFGSBOutput> = {
  validate(input: LBFGSBInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || typeof input.fun !== "function") {
      errors.push("input.fun must be a function returning {f, g}");
      return createValidationResult(errors, warnings);
    }
    if (!Array.isArray(input.x0) || input.x0.length === 0) {
      errors.push("input.x0 must be a non-empty array");
      return createValidationResult(errors, warnings);
    }
    const n = input.x0.length;
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(input.x0[i])) {
        errors.push(`x0[${i}] is not finite (${input.x0[i]})`);
      }
    }
    if (input.lower !== undefined) {
      if (!Array.isArray(input.lower) || input.lower.length !== n) {
        errors.push(`lower must be an array of length ${n}`);
      } else {
        for (let i = 0; i < n; i++) {
          if (Number.isNaN(input.lower[i])) errors.push(`lower[${i}] is NaN`);
        }
      }
    }
    if (input.upper !== undefined) {
      if (!Array.isArray(input.upper) || input.upper.length !== n) {
        errors.push(`upper must be an array of length ${n}`);
      } else {
        for (let i = 0; i < n; i++) {
          if (Number.isNaN(input.upper[i])) errors.push(`upper[${i}] is NaN`);
        }
      }
    }
    if (input.lower && input.upper) {
      for (let i = 0; i < n; i++) {
        if (input.lower[i] > input.upper[i]) {
          errors.push(
            `lower[${i}]=${input.lower[i]} > upper[${i}]=${input.upper[i]}`,
          );
        }
      }
    }
    if (input.memory !== undefined) {
      if (!Number.isInteger(input.memory) || input.memory < 1) {
        errors.push(`memory must be a positive integer (got ${input.memory})`);
      } else if (input.memory > 100) {
        warnings.push(
          `memory=${input.memory} is unusually large; m=10 is standard, m≥30 ` +
            `loses the "limited-memory" advantage`,
        );
      }
    }
    if (input.maxIter !== undefined) {
      if (!Number.isInteger(input.maxIter) || input.maxIter < 1) {
        errors.push(`maxIter must be a positive integer (got ${input.maxIter})`);
      }
    }
    if (input.tolGrad !== undefined && !(input.tolGrad >= 0)) {
      errors.push(`tolGrad must be >= 0 (got ${input.tolGrad})`);
    }
    if (input.tolF !== undefined && !(input.tolF >= 0)) {
      errors.push(`tolF must be >= 0 (got ${input.tolF})`);
    }
    if (input.c1 !== undefined && !(input.c1 > 0 && input.c1 < 1)) {
      errors.push(`c1 (Armijo) must be in (0, 1) (got ${input.c1})`);
    }
    if (input.initialStep !== undefined && !(input.initialStep > 0)) {
      errors.push(`initialStep must be > 0 (got ${input.initialStep})`);
    }
    if (
      input.backtrackShrink !== undefined &&
      !(input.backtrackShrink > 0 && input.backtrackShrink < 1)
    ) {
      errors.push(
        `backtrackShrink must be in (0, 1) (got ${input.backtrackShrink})`,
      );
    }

    return createValidationResult(errors, warnings);
  },

  calculate(input: LBFGSBInput): LBFGSBOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(
        "LBFGSBOptimizer: input validation failed: " +
          (validation.errors ?? []).join("; "),
      );
    }

    const warnings: string[] = [];
    const n = input.x0.length;
    const lower = input.lower
      ? Array.from(input.lower)
      : new Array<number>(n).fill(-Infinity);
    const upper = input.upper
      ? Array.from(input.upper)
      : new Array<number>(n).fill(Infinity);

    const memory = input.memory ?? 10;
    const maxIter = input.maxIter ?? 200;
    const maxLineSearch = input.maxLineSearch ?? 20;
    const tolGrad = input.tolGrad ?? 1e-6;
    const tolF = input.tolF ?? 1e-9;
    const c1 = input.c1 ?? 1e-4;
    const initialStep = input.initialStep ?? 1.0;
    const backtrackShrink = input.backtrackShrink ?? 0.5;
    const curvatureEps = 1e-10; // (s·y) > eps · ‖s‖·‖y‖ to accept pair

    // Project starting point into the box.
    let x = projectToBox(input.x0, lower, upper);
    let { f, g } = input.fun(x);
    let evaluations = 1;

    if (!Number.isFinite(f) || !allFinite(g)) {
      return {
        x,
        f,
        g: Array.from(g),
        gNormInf: NaN,
        iterations: 0,
        evaluations,
        status: "non_finite",
        memoryUsed: 0,
        trace: [],
        warnings: ["initial f or g not finite"],
        computed_at: new Date().toISOString(),
      };
    }

    const history: MemoryPair[] = [];
    const trace: LBFGSBOutput["trace"] = [];
    let status: LBFGSBStatus = "max_iter";
    let iter = 0;

    for (; iter < maxIter; iter++) {
      const projG = projectGradient(x, g, lower, upper);
      const gNormInf = infinityNorm(projG);

      if (trace.length < 1000) {
        trace.push({ iter, f, gNormInf, stepLen: 0 });
      }

      if (gNormInf < tolGrad) {
        status = "converged_grad";
        break;
      }

      // Direction: d = −H_k · g (project to free subspace too).
      const Hg = twoLoopRecursion(projG, history);
      const d = projectGradient(x, Hg, lower, upper).map((v) => -v);

      // If projected direction is non-descent, fall back to steepest descent.
      const gd = dot(projG, d);
      let dDescent = d;
      if (gd >= 0) {
        warnings.push(
          `iter ${iter}: L-BFGS direction not descent (g·d=${gd.toExponential(2)}), ` +
            `falling back to steepest descent`,
        );
        dDescent = projG.map((v) => -v);
      }

      // Backtracking Armijo line search projected onto the box.
      // First-iteration trick (Nocedal & Wright Eq. 7.20): without curvature
      // info the unit step in the steepest-descent direction can overshoot
      // wildly. Scale by 1/min(1, ‖g‖₂) so the initial step is at most a
      // unit-length move in objective-space coordinates.
      let step = initialStep;
      if (history.length === 0) {
        const gNorm2 = Math.sqrt(dot(projG, projG));
        if (gNorm2 > 1) step = initialStep / gNorm2;
      }
      let lineSearchOK = false;
      let xNew: number[] = x.slice();
      let fNew = f;
      let gNew: readonly number[] = g;
      const slope = dot(projG, dDescent);
      for (let ls = 0; ls < maxLineSearch; ls++) {
        const candidate = new Array<number>(n);
        for (let i = 0; i < n; i++) candidate[i] = x[i] + step * dDescent[i];
        xNew = projectToBox(candidate, lower, upper);
        const { f: fTrial, g: gTrial } = input.fun(xNew);
        evaluations++;
        if (!Number.isFinite(fTrial) || !allFinite(gTrial)) {
          step *= backtrackShrink;
          continue;
        }
        // Armijo: f(x + step·d) ≤ f(x) + c1 · step · (g·d)
        if (fTrial <= f + c1 * step * slope) {
          fNew = fTrial;
          gNew = gTrial;
          lineSearchOK = true;
          break;
        }
        step *= backtrackShrink;
      }

      if (!lineSearchOK) {
        status = "line_search_failed";
        break;
      }

      // Check relative function-value convergence.
      const fRelChange = Math.abs(fNew - f) / Math.max(1, Math.abs(f));

      // Build (s, y) pair.
      const s = new Array<number>(n);
      const y = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        s[i] = xNew[i] - x[i];
        y[i] = gNew[i] - g[i];
      }
      const sy = dot(s, y);
      const sNorm = Math.sqrt(dot(s, s));
      const yNorm = Math.sqrt(dot(y, y));
      // Curvature condition (Nocedal & Wright p.137): require s·y > eps · ‖s‖·‖y‖
      // for positive-definite Hessian update. Skip otherwise — preserves stability.
      if (sy > curvatureEps * sNorm * yNorm) {
        history.push({ s, y, rho: 1 / sy });
        while (history.length > memory) history.shift();
      } else {
        warnings.push(
          `iter ${iter}: curvature condition failed (s·y=${sy.toExponential(2)}), ` +
            `skipping (s,y) update`,
        );
      }

      x = xNew;
      f = fNew;
      g = Array.from(gNew);

      // Patch last trace entry's step length for visibility.
      if (trace.length > 0) {
        trace[trace.length - 1].stepLen = step;
      }

      if (fRelChange < tolF && iter > 0) {
        status = "converged_f";
        iter++;
        break;
      }
    }

    const finalProjG = projectGradient(x, g, lower, upper);
    return {
      x,
      f,
      g: Array.from(g),
      gNormInf: infinityNorm(finalProjG),
      iterations: iter,
      evaluations,
      status,
      memoryUsed: history.length,
      trace,
      warnings,
      computed_at: new Date().toISOString(),
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "lbfgsb_optimizer",
      name: "L-BFGS-B Optimizer",
      version: "1.0.0",
      domain: "optimization",
      category: "smooth_bound_constrained_minimization",
      description:
        "Limited-memory quasi-Newton optimizer with simple bound constraints. " +
        "Approximates the inverse Hessian from the last m (s, y) pairs via " +
        "Nocedal's two-loop recursion (O(m·n) per iteration). Projects iterates " +
        "onto a box [lower, upper] with active-set gradient projection and " +
        "backtracking-Armijo line search. Workhorse for smooth low-dimensional " +
        "calibration problems (Bayesian-opt inner loop, parameter fits, modal ID).",
      equation_plain:
        "x_{k+1} = Π_[L,U](x_k - α_k · H_k · ∇f(x_k))   where H_k from two-loop recursion",
      formula: "lbfgsb",
      references: [
        {
          authors: "Nocedal, J.",
          title: "Updating Quasi-Newton Matrices with Limited Storage",
          publication: "Mathematics of Computation",
          year: 1980,
          pages: "35, 773-782",
        },
        {
          authors: "Liu, D. C. and Nocedal, J.",
          title: "On the Limited Memory BFGS Method for Large Scale Optimization",
          publication: "Mathematical Programming",
          year: 1989,
          pages: "45, 503-528",
        },
        {
          authors: "Byrd, R. H., Lu, P., Nocedal, J., Zhu, C.",
          title: "A Limited Memory Algorithm for Bound Constrained Optimization",
          publication: "SIAM Journal on Scientific Computing",
          year: 1995,
          pages: "16(5), 1190-1208",
        },
      ],
      assumptions: [
        "Objective is C^1 smooth (gradient is Lipschitz on the search region)",
        "Bounds are simple (axis-aligned box); no general linear/nonlinear constraints",
        "Curvature condition s·y > 0 holds at most iterates (skip-update guards otherwise)",
      ],
      limitations: [
        "Simplified bound handling — uses gradient projection + projected line search, " +
          "NOT the full Byrd-Lu-Nocedal-Zhu cauchy-point + subspace minimization. " +
          "Slower on heavily-bound problems but correct.",
        "No general linear constraints (use ADMM or interior-point methods)",
        "Sensitive to badly-scaled objectives — scale parameters to unit range before calling",
      ],
      inputs: {
        fun: "objective + gradient function (x) => {f, g}",
        x0: "initial point (length n)",
        lower: "lower bounds (length n; use -Infinity for unbounded)",
        upper: "upper bounds (length n; use +Infinity for unbounded)",
        memory: "L-BFGS memory size m (default 10)",
        maxIter: "max iterations (default 200)",
        tolGrad: "convergence: ‖projected_g‖∞ < tolGrad (default 1e-6)",
        tolF: "convergence: |Δf|/max(1,|f|) < tolF (default 1e-9)",
      },
      outputs: {
        x: "final iterate",
        f: "final objective value",
        g: "final gradient",
        gNormInf: "‖projected_g‖∞ at termination",
        iterations: "iterations performed",
        evaluations: "total f+g evaluations",
        status: "termination cause (converged_grad / converged_f / max_iter / line_search_failed / non_finite)",
        memoryUsed: "final (s,y) memory occupancy",
        trace: "per-iteration (iter, f, gNormInf, stepLen) — capped at 1000",
      },
      last_validated: "2026-05-24",
    };
  },
};

export default LBFGSBOptimizer;
