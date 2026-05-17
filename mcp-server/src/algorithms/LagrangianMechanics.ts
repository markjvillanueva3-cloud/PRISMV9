/**
 * Lagrangian Mechanics — numerical Euler-Lagrange equations of motion
 *
 * Given a Lagrangian L(q, q̇, t) as a caller-supplied function of generalized
 * coordinates, derives the generalized accelerations q̈ by the Euler-Lagrange
 * equation
 *
 *     d/dt (∂L/∂q̇ᵢ) − ∂L/∂qᵢ = Qᵢ            (Qᵢ = non-conservative force)
 *
 * Expanding the total time derivative gives a linear system in q̈:
 *
 *     M·q̈ = ∂L/∂q + Q − (∂²L/∂q̇∂q)·q̇ − ∂²L/∂q̇∂t
 *
 * where the **generalized mass matrix** Mᵢⱼ = ∂²L/∂q̇ᵢ∂q̇ⱼ. All partial
 * derivatives are evaluated by central finite differences (O(h²)); the linear
 * system is solved by Gaussian elimination with partial pivoting.
 *
 * The resulting q̈(q, q̇, t) is a second-order ODE; in state-space form
 * x = [q, q̇] it becomes a first-order `DerivativeFn` — so `makeEOMDerivative`
 * lets [[ODEIntegrator]] march a Lagrangian system directly. This is the
 * "model the physics symbolically, integrate numerically" bridge from the
 * MIT-OCW dynamics courses.
 *
 * Pure numerical primitive — NO physics constants. Masses, lengths, gravity,
 * spring constants all live inside the caller's Lagrangian closure.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-LAG: Created 2026-05-17 from
 * MIT-OCW 16.07 (Dynamics) + 2.032 (Dynamics) FORGE-QUEUE candidate
 * `algorithm:lagranges-equations`, mfg_relevance 0.80, dedup CLEAR.
 *
 * @see Goldstein, H., Poole, C. & Safko, J. (2002) "Classical Mechanics"
 *      3rd ed., Addison-Wesley. ISBN 978-0-201-65702-9 (Ch.1-2)
 * @see Lanczos, C. (1986) "The Variational Principles of Mechanics" 4th ed.,
 *      Dover. ISBN 978-0-486-65067-8
 *
 * @module algorithms/LagrangianMechanics
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type ValidationResult,
  createValidationResult,
  computeSafetyScore,
} from "./types.js";
import { type DerivativeFn } from "./ODEIntegrator.js";

// ─── Lagrangian contract ───────────────────────────────────────────

/** L(q, q̇, t) → scalar. MUST be pure and return a finite number. */
export type LagrangianFn = (
  q: readonly number[],
  qdot: readonly number[],
  t: number,
) => number;

/** Optional generalized non-conservative force Q(q, q̇, t) → vector. */
export type GeneralizedForceFn = (
  q: readonly number[],
  qdot: readonly number[],
  t: number,
) => number[];

// ─── Input / Output ────────────────────────────────────────────────

export interface LagrangianMechanicsInput extends AlgorithmInput {
  /** Lagrangian L(q, q̇, t) */
  lagrangian: LagrangianFn;
  /** Generalized coordinates q */
  q: readonly number[];
  /** Generalized velocities q̇ */
  qdot: readonly number[];
  /** Time t (default 0) */
  t?: number;
  /** Optional non-conservative generalized force Q */
  generalizedForce?: GeneralizedForceFn;
  /** Finite-difference step h (default 1e-5) */
  fd_step?: number;
}

export interface LagrangianMechanicsOutput extends AlgorithmOutput {
  /** Generalized accelerations q̈ */
  accelerations: number[];
  /** Generalized mass matrix M = ∂²L/∂q̇∂q̇ (n×n) */
  mass_matrix: number[][];
  /** Determinant of M (singular ⇒ degenerate / non-physical Lagrangian) */
  mass_matrix_det: number;
  /** True if M was (near-)singular — q̈ then unreliable (R12 fail-loud) */
  singular: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_FD_STEP = 1e-5;
const SINGULAR_TOL = 1e-12;
const MAX_DOF = 1000;

// ─── numerical-derivative + linear-solve helpers (pure) ────────────

/** ∂g/∂xᵢ via central difference, g: ℝⁿ → ℝ. */
function partial(
  g: (x: readonly number[]) => number,
  x: readonly number[],
  i: number,
  h: number,
): number {
  const xp = x.slice();
  xp[i] = x[i] + h;
  const gp = g(xp);
  xp[i] = x[i] - h;
  const gm = g(xp);
  return (gp - gm) / (2 * h);
}

/** ∂²g/∂xᵢ∂xⱼ via central difference of central differences. */
function partial2(
  g: (x: readonly number[]) => number,
  x: readonly number[],
  i: number,
  j: number,
  h: number,
): number {
  if (i === j) {
    const xp = x.slice();
    const x0 = g(x);
    xp[i] = x[i] + h;
    const gp = g(xp);
    xp[i] = x[i] - h;
    const gm = g(xp);
    return (gp - 2 * x0 + gm) / (h * h);
  }
  const x_pp = x.slice();
  x_pp[i] = x[i] + h;
  x_pp[j] = x[j] + h;
  const x_pm = x.slice();
  x_pm[i] = x[i] + h;
  x_pm[j] = x[j] - h;
  const x_mp = x.slice();
  x_mp[i] = x[i] - h;
  x_mp[j] = x[j] + h;
  const x_mm = x.slice();
  x_mm[i] = x[i] - h;
  x_mm[j] = x[j] - h;
  return (g(x_pp) - g(x_pm) - g(x_mp) + g(x_mm)) / (4 * h * h);
}

/** Solve A·x = b (n×n) by Gaussian elimination with partial pivoting.
 *  Returns null when A is (near-)singular. */
function gaussSolve(Ain: number[][], bin: readonly number[]): { x: number[]; det: number } | null {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  let det = 1;
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (Math.abs(A[piv][col]) < SINGULAR_TOL) return null;
    if (piv !== col) {
      [A[col], A[piv]] = [A[piv], A[col]];
      [b[col], b[piv]] = [b[piv], b[col]];
      det = -det;
    }
    det *= A[col][col];
    for (let r = col + 1; r < n; r += 1) {
      const f = A[r][col] / A[col][col];
      for (let c = col; c < n; c += 1) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = b[i];
    for (let c = i + 1; c < n; c += 1) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return { x, det };
}

// ─── Impl ──────────────────────────────────────────────────────────

class LagrangianMechanicsImpl
  implements Algorithm<LagrangianMechanicsInput, LagrangianMechanicsOutput>
{
  private static readonly VERSION = "1.0.0";

  validate(input: LagrangianMechanicsInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof input.lagrangian !== "function") errors.push("lagrangian must be a function");
    if (input.generalizedForce !== undefined && typeof input.generalizedForce !== "function") {
      errors.push("generalizedForce must be a function when provided");
    }
    if (!Array.isArray(input.q) || input.q.length === 0) {
      errors.push("q must be a non-empty array");
    }
    if (!Array.isArray(input.qdot) || input.qdot.length === 0) {
      errors.push("qdot must be a non-empty array");
    }
    if (
      Array.isArray(input.q) && Array.isArray(input.qdot) &&
      input.q.length !== input.qdot.length
    ) {
      errors.push(`q (${input.q.length}) and qdot (${input.qdot.length}) must have equal length`);
    }
    if (Array.isArray(input.q)) {
      if (input.q.length > MAX_DOF) errors.push(`DOF ${input.q.length} exceeds max ${MAX_DOF}`);
      for (let i = 0; i < input.q.length; i += 1) {
        if (!Number.isFinite(input.q[i])) { errors.push(`q[${i}] must be finite`); break; }
      }
    }
    if (Array.isArray(input.qdot)) {
      for (let i = 0; i < input.qdot.length; i += 1) {
        if (!Number.isFinite(input.qdot[i])) { errors.push(`qdot[${i}] must be finite`); break; }
      }
    }
    if (input.t !== undefined && !Number.isFinite(input.t)) errors.push("t must be finite");
    if (input.fd_step !== undefined && (!Number.isFinite(input.fd_step) || input.fd_step <= 0)) {
      errors.push("fd_step must be a positive finite number");
    }
    return createValidationResult(errors, warnings);
  }

  calculate(input: LagrangianMechanicsInput): LagrangianMechanicsOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`LagrangianMechanics validation failed: ${(validation.errors ?? []).join(", ")}`);
    }
    const warnings = [...(validation.warnings ?? [])];
    const L = input.lagrangian;
    const q = input.q.slice();
    const qdot = input.qdot.slice();
    const t = input.t ?? 0;
    const h = input.fd_step ?? DEFAULT_FD_STEP;
    const n = q.length;

    // L as a function of q̇ alone (q,t fixed) — for the mass matrix + cross terms
    const LofQdot = (v: readonly number[]): number => L(q, v, t);
    // L as a function of q alone (q̇,t fixed) — for ∂L/∂q
    const LofQ = (Q: readonly number[]): number => L(Q, qdot, t);

    // Mass matrix M_ij = ∂²L/∂q̇ᵢ∂q̇ⱼ
    const M: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i += 1) {
      for (let j = i; j < n; j += 1) {
        const v = partial2(LofQdot, qdot, i, j, h);
        M[i][j] = v;
        M[j][i] = v; // symmetric
      }
    }

    // RHS = ∂L/∂q + Q − (∂²L/∂q̇∂q)·q̇   (autonomous: ∂²L/∂q̇∂t = 0)
    const dLdq = new Array<number>(n);
    for (let i = 0; i < n; i += 1) dLdq[i] = partial(LofQ, q, i, h);

    // cross term C_ij = ∂²L/∂q̇ᵢ∂qⱼ : perturb q̇ᵢ then differentiate wrt qⱼ
    const rhs = new Array<number>(n);
    for (let i = 0; i < n; i += 1) {
      let cross = 0;
      for (let j = 0; j < n; j += 1) {
        // ∂/∂qⱼ ( ∂L/∂q̇ᵢ )  — nested central difference
        const dqi = (qj: readonly number[]): number =>
          partial((v) => L(qj, v, t), qdot, i, h);
        const Cij = partial(dqi, q, j, h);
        cross += Cij * qdot[j];
      }
      rhs[i] = dLdq[i] - cross;
    }
    if (input.generalizedForce) {
      const Q = input.generalizedForce(q, qdot, t);
      for (let i = 0; i < n; i += 1) rhs[i] += Q[i] ?? 0;
    }

    const solved = gaussSolve(M, rhs);
    let accelerations: number[];
    let det: number;
    let singular: boolean;
    if (solved === null) {
      singular = true;
      det = 0;
      accelerations = new Array<number>(n).fill(Number.NaN);
      warnings.push(
        "Generalized mass matrix M = ∂²L/∂q̇² is singular — the Lagrangian is degenerate " +
          "(missing kinetic terms for some DOF). q̈ is undefined; returned as NaN.",
      );
    } else {
      accelerations = solved.x;
      det = solved.det;
      singular = false;
      if (accelerations.some((a) => !Number.isFinite(a))) {
        singular = true;
        warnings.push("q̈ contains non-finite values — check the Lagrangian for ill-conditioning.");
      }
    }

    return {
      accelerations,
      mass_matrix: M,
      mass_matrix_det: det,
      singular,
      safety: computeSafetyScore(1.0, 1.0, 1.0, singular ? 0.3 : 0.95),
      computed_at: new Date().toISOString(),
      algorithm_version: LagrangianMechanicsImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "lagrangian_mechanics",
      name: "Lagrangian Mechanics (numerical Euler-Lagrange)",
      version: LagrangianMechanicsImpl.VERSION,
      domain: "dynamics",
      category: "equations_of_motion",
      description:
        "Derives generalized accelerations q̈ from a caller-supplied " +
        "Lagrangian L(q,q̇,t) via the Euler-Lagrange equation. Mass matrix " +
        "and cross terms by central finite difference; q̈ by Gaussian " +
        "elimination. makeEOMDerivative composes into ODEIntegrator. " +
        "No physics constants — masses/lengths live in the caller's L.",
      equation_plain:
        "d/dt(∂L/∂q̇) − ∂L/∂q = Q  →  M·q̈ = ∂L/∂q + Q − (∂²L/∂q̇∂q)·q̇",
      equation_latex:
        "\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot q_i} - \\frac{\\partial L}{\\partial q_i} = Q_i",
      references: [
        {
          authors: "Goldstein, H., Poole, C. & Safko, J.",
          title: "Classical Mechanics",
          publication: "Addison-Wesley (3rd ed.)",
          year: 2002,
        },
        {
          authors: "Lanczos, C.",
          title: "The Variational Principles of Mechanics",
          publication: "Dover (4th ed.)",
          year: 1986,
        },
      ],
      assumptions: [
        "Lagrangian L(q,q̇,t) is C² in q and q̇ (twice differentiable)",
        "Holonomic system — generalized coordinates are independent",
        "Mass matrix ∂²L/∂q̇² is non-singular (regular Lagrangian)",
        "Autonomous cross term (∂²L/∂q̇∂t = 0) — explicit time-dep L is approximate",
      ],
      limitations: [
        "Non-conservative forces only via the explicit generalizedForce term",
        "Central-FD derivatives: O(h²), 2-4 L-evals per matrix entry",
        "Singular (degenerate) Lagrangians return NaN q̈ — flagged, not solved",
        "No constraint handling (Lagrange multipliers / DAE) this version",
      ],
      valid_ranges: {
        dof: { min: 1, max: MAX_DOF, unit: "-" },
      },
      applicable_materials: [],
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

export const LagrangianMechanics = new LagrangianMechanicsImpl();

/**
 * Build a state-space DerivativeFn for ODEIntegrator from a Lagrangian.
 * State x = [q₀..qₙ₋₁, q̇₀..q̇ₙ₋₁] (length 2n); ẋ = [q̇, q̈].
 *
 * @example
 *   // simple pendulum: L = ½mℓ²θ̇² + mgℓcosθ
 *   const L = (q,v) => 0.5*m*l*l*v[0]**2 + m*g*l*Math.cos(q[0]);
 *   const f = makeEOMDerivative(L, 1);
 *   ODEIntegrator.calculate({ initial_state:[θ0,0], f, t0:0, tf:10, steps:5000 });
 */
export function makeEOMDerivative(
  lagrangian: LagrangianFn,
  dof: number,
  generalizedForce?: GeneralizedForceFn,
): DerivativeFn {
  return (t: number, x: readonly number[]): number[] => {
    const q = x.slice(0, dof);
    const qdot = x.slice(dof, 2 * dof);
    const out = LagrangianMechanics.calculate({
      lagrangian, q, qdot, t, generalizedForce,
    });
    return [...qdot, ...out.accelerations];
  };
}

// WIRE-EXEMPT: numerical primitive intentionally not wired this commit —
// shares deferred U-COURSE-FORGE-P1-DISPATCHER (prism_calc:lagrangian_eom).
// Fully usable via import; makeEOMDerivative composes into ODEIntegrator
// (which composes into OperatorSplittingMethod).
