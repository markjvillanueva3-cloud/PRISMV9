/**
 * Linear State-Space Model — LTI system analysis (P6: pendulum-cart / transfer functions)
 *
 * Represents a continuous linear time-invariant system in state-space form:
 *
 *     ẋ = A·x + B·u        (state equation)
 *     y  = C·x + D·u        (output equation)
 *
 * and provides the standard analysis operations a controls engineer needs:
 *   - `simulate`           — time response to an input u(t), integrated via
 *                            the ODEIntegrator primitive (RK4 by default)
 *   - `transferFunctionSISO` — single-input-single-output transfer function
 *                            G(s) = C·(sI − A)⁻¹·B + D as {num, den} polynomial
 *                            coefficients, denominator = char-poly of A
 *                            (Faddeev–LeVerrier)
 *   - `frequencyResponse`  — |G(jω)| and phase over an ω grid (Bode data)
 *   - `controllabilityRank` / `observabilityRank` — Kalman rank tests
 *
 * Generalizes the inline SDOF G(jω) that StabilityLobeDiagram computes for
 * chatter — that engine's transfer function is one special case of this
 * primitive. Composes with [[ODEIntegrator]] (simulate delegates to it).
 *
 * Pure linear-algebra primitive — NO physics constants. The canonical
 * `pendulumCartExample` factory builds the textbook inverted-pendulum-on-cart
 * A/B/C/D from caller-supplied physical parameters (the caller owns the
 * physics; this file owns only the matrix algebra).
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P6: Created 2026-05-17 from
 * MIT-OCW 2.003 "Modeling Dynamics and Control I" FORGE-QUEUE candidates
 * `algorithm:pendulum-cart-modeling` + `formula:transfer-functions`
 * (the latter is algebraic — no physical constants — so it does NOT take
 * the physics-reviewer/constants.ts path; it lands as algorithm).
 *
 * @see Ogata, K. (2010) "Modern Control Engineering" 5th ed., Prentice Hall.
 *      ISBN 978-0-13-615673-4. Ch.2-3 (state space), Ch.5 (frequency response)
 * @see Faddeev, D.K. & Faddeeva, V.N. (1963) "Computational Methods of
 *      Linear Algebra", Freeman. (Faddeev–LeVerrier char-poly recursion)
 *
 * @module algorithms/LinearStateSpaceModel
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
import { ODEIntegrator, type DerivativeFn } from "./ODEIntegrator.js";

// ─── Matrix type + pure helpers ────────────────────────────────────

/** Dense row-major matrix: rows × cols, every row equal length. */
export type Matrix = number[][];

function rows(m: Matrix): number {
  return m.length;
}
function cols(m: Matrix): number {
  return m.length === 0 ? 0 : m[0].length;
}
function isRectangular(m: Matrix): boolean {
  if (!Array.isArray(m) || m.length === 0) return false;
  const c = m[0].length;
  return m.every((r) => Array.isArray(r) && r.length === c);
}
function allFinite(m: Matrix): boolean {
  return m.every((r) => r.every((v) => typeof v === "number" && Number.isFinite(v)));
}
function matVec(A: Matrix, x: readonly number[]): number[] {
  const out = new Array<number>(A.length);
  for (let i = 0; i < A.length; i += 1) {
    let acc = 0;
    const Ai = A[i];
    for (let j = 0; j < Ai.length; j += 1) acc += Ai[j] * x[j];
    out[i] = acc;
  }
  return out;
}
function matMul(A: Matrix, B: Matrix): Matrix {
  const n = A.length;
  const k = B.length;
  const m = B[0].length;
  const out: Matrix = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let p = 0; p < k; p += 1) {
      const a = A[i][p];
      if (a === 0) continue;
      for (let j = 0; j < m; j += 1) out[i][j] += a * B[p][j];
    }
  }
  return out;
}
function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}
function trace(m: Matrix): number {
  let t = 0;
  for (let i = 0; i < m.length; i += 1) t += m[i][i];
  return t;
}
function scaleAdd(A: Matrix, s: number, B: Matrix): Matrix {
  // A + s·B
  return A.map((row, i) => row.map((v, j) => v + s * B[i][j]));
}

/**
 * Faddeev–LeVerrier recursion → characteristic polynomial coefficients of
 * an n×n matrix A, returned highest-degree-first:
 *   p(λ) = λⁿ + c₁λⁿ⁻¹ + … + cₙ   →   [1, c₁, …, cₙ]
 * Also yields the adjugate-building M-matrices used for the SISO numerator.
 */
function faddeevLeVerrier(A: Matrix): { charPoly: number[]; Ms: Matrix[] } {
  const n = A.length;
  const coeffs: number[] = [1];
  const Ms: Matrix[] = [];
  let M = identity(n); // M₀ = I
  for (let k = 1; k <= n; k += 1) {
    Ms.push(M);
    const AM = matMul(A, M);
    // `+ 0` normalizes negative zero (-trace/k yields -0 when trace==0),
    // so emitted polynomial coefficients are clean for downstream
    // equality / serialization (Object.is(-0,0) is false).
    const ck = -trace(AM) / k + 0;
    coeffs.push(ck);
    // M_k = A·M_{k-1} + c_k·I
    M = scaleAdd(AM, ck, identity(n));
  }
  return { charPoly: coeffs, Ms };
}

/** Gaussian-elimination numerical rank (partial pivoting, tol-based). */
function matrixRank(mIn: Matrix, tol = 1e-9): number {
  const m = mIn.map((r) => r.slice());
  const R = m.length;
  const C = m[0].length;
  let rank = 0;
  for (let col = 0; col < C && rank < R; col += 1) {
    let piv = rank;
    for (let r = rank + 1; r < R; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    }
    if (Math.abs(m[piv][col]) < tol) continue;
    [m[rank], m[piv]] = [m[piv], m[rank]];
    const pivVal = m[rank][col];
    for (let r = 0; r < R; r += 1) {
      if (r === rank) continue;
      const f = m[r][col] / pivVal;
      for (let c = col; c < C; c += 1) m[r][c] -= f * m[rank][c];
    }
    rank += 1;
  }
  return rank;
}

/** Horner eval of a real polynomial (highest-degree-first) at complex jω. */
function polyAtImag(coeffs: readonly number[], omega: number): { re: number; im: number } {
  // p(jω): accumulate with complex arithmetic, s = jω.
  let re = 0;
  let im = 0;
  for (let i = 0; i < coeffs.length; i += 1) {
    // (re + j·im)·(jω) + coeff
    const nr = -im * omega + coeffs[i];
    const ni = re * omega;
    re = nr;
    im = ni;
  }
  return { re, im };
}

// ─── Input / Output ────────────────────────────────────────────────

export interface LinearStateSpaceInput extends AlgorithmInput {
  /** State matrix A (n×n) */
  A: Matrix;
  /** Input matrix B (n×m) */
  B: Matrix;
  /** Output matrix C (p×n) */
  C: Matrix;
  /** Feedthrough matrix D (p×m) */
  D: Matrix;
  /** What to compute. Default: "transfer_function" */
  operation?: "transfer_function" | "frequency_response" | "simulate" | "ranks";
  /** simulate: initial state x0 (length n) */
  x0?: readonly number[];
  /** simulate: input function u(t) → length-m vector */
  u?: (t: number) => number[];
  /** simulate: [t0, tf] */
  t0?: number;
  /** simulate: end time */
  tf?: number;
  /** simulate: step count */
  steps?: number;
  /** frequency_response: ω grid [rad/s] */
  omegas?: readonly number[];
}

export interface LinearStateSpaceOutput extends AlgorithmOutput {
  operation: string;
  /** transfer_function: SISO numerator/denominator (highest-degree-first) */
  transfer_function?: { num: number[]; den: number[] };
  /** frequency_response: per-ω magnitude + phase (deg) */
  frequency_response?: { omega: number; magnitude: number; phase_deg: number }[];
  /** simulate: final state + optional trajectory */
  final_state?: number[];
  trajectory?: number[][];
  /** ranks: controllability/observability Kalman rank + n */
  ranks?: { n: number; controllability: number; observability: number; controllable: boolean; observable: boolean };
  /** Characteristic-polynomial coefficients of A (always computed) */
  char_poly: AtomicValue<number>[];
}

// ─── Valid ranges ──────────────────────────────────────────────────

const VALID = { dim: { min: 1, max: 200, unit: "-" }, steps: { min: 1, max: 1_000_000, unit: "-" } };

// ─── Impl ──────────────────────────────────────────────────────────

class LinearStateSpaceModelImpl
  implements Algorithm<LinearStateSpaceInput, LinearStateSpaceOutput>
{
  private static readonly VERSION = "1.0.0";

  validate(input: LinearStateSpaceInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [nm, mtx] of [["A", input.A], ["B", input.B], ["C", input.C], ["D", input.D]] as const) {
      if (!isRectangular(mtx)) {
        errors.push(`${nm} must be a non-empty rectangular matrix`);
      } else if (!allFinite(mtx)) {
        errors.push(`${nm} contains non-finite entries`);
      }
    }
    if (errors.length > 0) return createValidationResult(errors, warnings);

    const n = rows(input.A);
    if (cols(input.A) !== n) errors.push(`A must be square (got ${n}×${cols(input.A)})`);
    if (n > VALID.dim.max) errors.push(`state dim ${n} exceeds max ${VALID.dim.max}`);
    if (rows(input.B) !== n) errors.push(`B rows ${rows(input.B)} must equal state dim ${n}`);
    if (cols(input.C) !== n) errors.push(`C cols ${cols(input.C)} must equal state dim ${n}`);
    const m = cols(input.B);
    const p = rows(input.C);
    if (rows(input.D) !== p) errors.push(`D rows ${rows(input.D)} must equal output dim ${p}`);
    if (cols(input.D) !== m) errors.push(`D cols ${cols(input.D)} must equal input dim ${m}`);

    const op = input.operation ?? "transfer_function";
    if (op === "transfer_function" && errors.length === 0 && (m !== 1 || p !== 1)) {
      errors.push(`transfer_function requires SISO (1 input, 1 output); got ${m} inputs, ${p} outputs`);
    }
    if (op === "simulate" && errors.length === 0) {
      if (!input.x0 || input.x0.length !== n) errors.push(`simulate needs x0 of length ${n}`);
      if (typeof input.u !== "function") errors.push("simulate needs u(t) function");
      if (!Number.isFinite(input.t0 ?? 0) || !Number.isFinite(input.tf ?? NaN) || (input.tf ?? 0) <= (input.t0 ?? 0)) {
        errors.push("simulate needs finite tf > t0");
      }
      if (!Number.isInteger(input.steps) || (input.steps ?? 0) < 1) errors.push("simulate needs steps >= 1");
    }
    if (op === "frequency_response" && errors.length === 0) {
      if (!input.omegas || input.omegas.length === 0) errors.push("frequency_response needs non-empty omegas[]");
      else if (input.omegas.some((w) => !Number.isFinite(w) || w < 0)) errors.push("omegas must be finite and >= 0");
      if ((m !== 1 || p !== 1)) errors.push("frequency_response requires SISO");
    }

    return createValidationResult(errors, warnings);
  }

  calculate(input: LinearStateSpaceInput): LinearStateSpaceOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`LinearStateSpaceModel validation failed: ${(validation.errors ?? []).join(", ")}`);
    }
    const warnings = [...(validation.warnings ?? [])];
    const op = input.operation ?? "transfer_function";
    const A = input.A;
    const n = rows(A);

    const { charPoly, Ms } = faddeevLeVerrier(A);
    const charPolyAtomic = charPoly.map((c, i) =>
      createAtomicValue(c, "-", 0.001, "faddeev-leverrier", 0.99, `char-poly λ^${n - i} coeff`),
    );

    const out: LinearStateSpaceOutput = {
      operation: op,
      char_poly: charPolyAtomic,
      safety: computeSafetyScore(1.0, 1.0, 1.0, 0.95),
      computed_at: new Date().toISOString(),
      algorithm_version: LinearStateSpaceModelImpl.VERSION,
      warnings,
    };

    if (op === "transfer_function" || op === "frequency_response") {
      // SISO G(s) = C·(sI−A)⁻¹·B + D.
      // (sI−A)⁻¹ = adj(sI−A)/det(sI−A); det = char-poly(s).
      // Numerator poly: C·[ Σ M_{n-1-k} s^k ]·B  + D·den   (Faddeev M-matrices
      // give adj(sI−A) = Σ_{k=0}^{n-1} M_k s^{n-1-k}).
      const den = charPoly.slice(); // highest-degree-first, monic
      const B = input.B;
      const C = input.C;
      const Dscalar = input.D[0][0];
      // numerator coefficients, degree n-1 .. 0  (then + D·den)
      const numAdj: number[] = new Array<number>(n).fill(0);
      for (let k = 0; k < n; k += 1) {
        // term s^{n-1-k} has matrix M_k
        const CMk = matMul(C, Ms[k]); // 1×n
        const CMkB = matMul(CMk, B); // 1×1
        numAdj[k] = CMkB[0][0]; // coeff of s^{n-1-k}
      }
      // Pad numAdj (length n, degrees n-1..0) to length n+1 to add D·den (degree n)
      const num: number[] = new Array<number>(n + 1).fill(0);
      for (let i = 0; i < n; i += 1) num[i + 1] += numAdj[i];
      for (let i = 0; i < den.length; i += 1) num[i] += Dscalar * den[i];
      // Strip leading zeros on numerator (keep at least one coeff)
      let lead = 0;
      while (lead < num.length - 1 && Math.abs(num[lead]) < 1e-14) lead += 1;
      const numTrim = num.slice(lead);

      if (op === "transfer_function") {
        out.transfer_function = { num: numTrim, den };
      } else {
        const omegas = input.omegas!;
        out.transfer_function = { num: numTrim, den };
        out.frequency_response = omegas.map((w) => {
          const N = polyAtImag(numTrim, w);
          const Dn = polyAtImag(den, w);
          const denMag2 = Dn.re * Dn.re + Dn.im * Dn.im;
          // G = N/Dn
          const gre = (N.re * Dn.re + N.im * Dn.im) / denMag2;
          const gim = (N.im * Dn.re - N.re * Dn.im) / denMag2;
          const magnitude = Math.hypot(gre, gim);
          const phase_deg = (Math.atan2(gim, gre) * 180) / Math.PI;
          return { omega: w, magnitude, phase_deg };
        });
      }
    } else if (op === "ranks") {
      // Controllability [B AB A²B … Aⁿ⁻¹B]; Observability [C; CA; …; CAⁿ⁻¹]
      const B = input.B;
      const C = input.C;
      const ctrlCols: number[][] = [];
      let AkB = B;
      for (let k = 0; k < n; k += 1) {
        for (let j = 0; j < cols(AkB); j += 1) ctrlCols.push(AkB.map((r) => r[j]));
        AkB = matMul(A, AkB);
      }
      // ctrlCols are columns; build matrix n×(n·m)
      const ctrlMat: Matrix = Array.from({ length: n }, (_, i) => ctrlCols.map((c) => c[i]));
      const obsRows: number[][] = [];
      let CAk = C;
      for (let k = 0; k < n; k += 1) {
        for (let i = 0; i < rows(CAk); i += 1) obsRows.push(CAk[i].slice());
        CAk = matMul(CAk, A);
      }
      const ctrlRank = matrixRank(ctrlMat);
      const obsRank = matrixRank(obsRows);
      out.ranks = {
        n,
        controllability: ctrlRank,
        observability: obsRank,
        controllable: ctrlRank === n,
        observable: obsRank === n,
      };
    } else if (op === "simulate") {
      const A2 = A;
      const B = input.B;
      const uFn = input.u!;
      const f: DerivativeFn = (t, x) => {
        const Ax = matVec(A2, x);
        const u = uFn(t);
        const Bu = matVec(B, u);
        return Ax.map((v, i) => v + Bu[i]);
      };
      const sim = ODEIntegrator.calculate({
        initial_state: input.x0!,
        t0: input.t0 ?? 0,
        tf: input.tf!,
        steps: input.steps!,
        method: "rk4",
        f,
      });
      out.final_state = sim.final_state;
      out.safety = sim.safety;
      for (const w of sim.warnings) if (!warnings.includes(w)) warnings.push(w);
    }

    return out;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "linear_state_space_model",
      name: "Linear State-Space Model (LTI analysis)",
      version: LinearStateSpaceModelImpl.VERSION,
      domain: "control",
      category: "lti_state_space",
      description:
        "Continuous LTI system ẋ=Ax+Bu, y=Cx+Du. SISO transfer function via " +
        "Faddeev–LeVerrier char-poly, Bode frequency response, time-domain " +
        "simulation (delegated to ODEIntegrator/RK4), Kalman controllability " +
        "and observability rank tests. Pure linear algebra — no physics constants.",
      equation_plain: "ẋ = A·x + B·u ; y = C·x + D·u ; G(s) = C(sI−A)⁻¹B + D",
      equation_latex: "G(s) = C\\,(sI - A)^{-1} B + D",
      references: [
        {
          authors: "Ogata, K.",
          title: "Modern Control Engineering",
          publication: "Prentice Hall (5th ed.)",
          year: 2010,
        },
        {
          authors: "Faddeev, D.K. & Faddeeva, V.N.",
          title: "Computational Methods of Linear Algebra",
          publication: "W. H. Freeman",
          year: 1963,
        },
      ],
      assumptions: [
        "Continuous linear time-invariant dynamics (constant A,B,C,D)",
        "Transfer function / frequency response paths require SISO (1-in 1-out)",
        "simulate() assumes a non-stiff system (explicit RK4 via ODEIntegrator)",
        "Numerical rank uses a 1e-9 pivot tolerance",
      ],
      limitations: [
        "No MIMO transfer-function matrix (SISO only this version)",
        "Faddeev–LeVerrier is O(n⁴) — fine for n≲200, not large sparse systems",
        "No discrete-time (z-domain) support",
        "No minimal realization / pole-zero cancellation",
      ],
      valid_ranges: VALID,
      applicable_materials: [],
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

// ─── Public singleton + canonical example ──────────────────────────

export const LinearStateSpaceModel = new LinearStateSpaceModelImpl();

/**
 * Textbook inverted-pendulum-on-cart linearized about the upright equilibrium.
 * State x = [cart_pos, cart_vel, pole_angle, pole_angvel]; input u = cart force.
 * The PHYSICS (M,m,l,g) is supplied by the caller — this factory only assembles
 * the linear-algebra A/B/C/D, keeping this module physics-constant-free.
 *
 * Linearization (small θ), per Ogata Ch.3 / standard cart-pole derivation:
 *   ẍ  = ( -m·g·θ + u ) / M
 *   θ̈  = ( (M+m)·g·θ − u ) / (M·l)
 *
 * @param p caller-supplied physical parameters (all > 0)
 */
export function pendulumCartExample(p: {
  cartMass: number;
  poleMass: number;
  poleLength: number;
  gravity: number;
}): { A: Matrix; B: Matrix; C: Matrix; D: Matrix } {
  const { cartMass: M, poleMass: m, poleLength: l, gravity: g } = p;
  if (![M, m, l, g].every((v) => Number.isFinite(v) && v > 0)) {
    throw new RangeError("pendulumCartExample requires positive finite M,m,l,g");
  }
  const A: Matrix = [
    [0, 1, 0, 0],
    [0, 0, -(m * g) / M, 0],
    [0, 0, 0, 1],
    [0, 0, ((M + m) * g) / (M * l), 0],
  ];
  const B: Matrix = [[0], [1 / M], [0], [-1 / (M * l)]];
  const C: Matrix = [[1, 0, 0, 0]]; // observe cart position (SISO)
  const D: Matrix = [[0]];
  return { A, B, C, D };
}

// WIRE-EXEMPT: control-theory primitive intentionally not wired this commit —
// shares deferred dispatcher unit U-COURSE-FORGE-P1-DISPATCHER
// (prism_calc:lti_analyze). Fully usable via direct import; composes with
// ODEIntegrator (simulate path) which composes with OperatorSplittingMethod.
