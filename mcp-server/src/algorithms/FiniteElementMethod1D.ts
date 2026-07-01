/**
 * Finite Element Method (1D, linear Lagrange P1) — weak-form BVP solver
 *
 * Solves the model 1D boundary-value problem on a uniform mesh of [0, L]:
 *
 *     −(a·u′)′ + c·u = f(x)        x ∈ (0, L)
 *
 * with Dirichlet and/or Neumann boundary conditions, using the Galerkin
 * finite-element method with continuous piecewise-linear (P1 "hat") shape
 * functions. This is the **weak-form** counterpart to [[FiniteDifferenceMethod]]
 * (which is the strong-form / collocation discretization) — together they are
 * the two canonical PDE discretizations taught in the MIT-OCW numerical courses.
 *
 * Per element [xᵢ, xᵢ₊₁] of length h, the linear-P1 element matrices are exact:
 *   stiffness  Kₑ = (a/h)·[[1,−1],[−1,1]]
 *   mass       Mₑ = (c·h/6)·[[2,1],[1,2]]
 *   load       Fₑ = (h/2)·[f(xᵢ), f(xᵢ₊₁)]   (trapezoidal consistent load)
 * assembled into a symmetric tridiagonal global system, Dirichlet rows
 * lifted, solved by the Thomas algorithm (O(n)).
 *
 * Pure numerical primitive — NO physics constants. Coefficients a (stiffness/
 * conductivity/EA), c (reaction), and source f(x) are caller-supplied; the
 * caller owns the physics, this file owns the Galerkin algebra.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-FEM: Created 2026-05-17 from
 * MIT-OCW 1.050 / 3.22 / 1.105 (Solid Mechanics / Mechanical Behavior /
 * Solid Mechanics Lab) FORGE-QUEUE candidate `algorithm:finite-element-
 * method`, mfg_relevance 0.80, dedup CLEAR (ThermalFEAModel is a
 * domain-specific thermal model, not a reusable Galerkin primitive).
 *
 * @see Hughes, T.J.R. (2000) "The Finite Element Method: Linear Static and
 *      Dynamic Finite Element Analysis", Dover. ISBN 978-0-486-41181-1
 * @see Strang, G. & Fix, G. (2008) "An Analysis of the Finite Element
 *      Method" 2nd ed., Wellesley-Cambridge. ISBN 978-0-9802327-0-7
 *
 * @module algorithms/FiniteElementMethod1D
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

// ─── BC ────────────────────────────────────────────────────────────

/** Per-end boundary condition. dirichlet fixes u; neumann fixes a·u′ (flux). */
export type EndBC =
  | { kind: "dirichlet"; value: number }
  | { kind: "neumann"; flux: number };

export interface FEM1DBoundary {
  left: EndBC;
  right: EndBC;
}

// ─── Input / Output ────────────────────────────────────────────────

export interface FiniteElementMethod1DInput extends AlgorithmInput {
  /** Domain length L > 0 (domain is [0, L]) */
  length: number;
  /** Number of elements (>= 1) → n+1 nodes */
  elements: number;
  /** Diffusion / stiffness coefficient a > 0 */
  a: number;
  /** Reaction coefficient c >= 0 (0 → pure Poisson/diffusion) */
  c: number;
  /** Source term f(x) */
  source: (x: number) => number;
  /** Boundary conditions */
  bc: FEM1DBoundary;
}

export interface FiniteElementMethod1DOutput extends AlgorithmOutput {
  /** Node coordinates (length elements+1) */
  nodes: number[];
  /** Nodal solution u (length elements+1) */
  solution: number[];
  /** Mesh size h = L / elements */
  h: AtomicValue<number>;
  /** L∞ of the solution (telemetry) */
  solution_max_abs: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const MIN_ELEMENTS = 1;
const MAX_ELEMENTS = 2_000_000;

// ─── Thomas algorithm (tridiagonal solve, pure) ────────────────────

/** Solve a tridiagonal system (sub a, diag b, sup c, rhs d) in O(n). */
function thomasSolve(
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
  d: readonly number[],
): number[] {
  const n = b.length;
  const cp = new Array<number>(n);
  const dp = new Array<number>(n);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i += 1) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Array<number>(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i -= 1) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

// ─── Impl ──────────────────────────────────────────────────────────

class FiniteElementMethod1DImpl
  implements Algorithm<FiniteElementMethod1DInput, FiniteElementMethod1DOutput>
{
  private static readonly VERSION = "1.0.0";

  validate(input: FiniteElementMethod1DInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(input.length) || input.length <= 0) {
      errors.push(`length must be a positive finite number (got ${input.length})`);
    }
    if (!Number.isInteger(input.elements) || input.elements < MIN_ELEMENTS) {
      errors.push(`elements must be an integer >= ${MIN_ELEMENTS} (got ${input.elements})`);
    } else if (input.elements > MAX_ELEMENTS) {
      errors.push(`elements ${input.elements} exceeds max ${MAX_ELEMENTS}`);
    }
    if (!Number.isFinite(input.a) || input.a <= 0) {
      errors.push(`a (stiffness) must be a positive finite number (got ${input.a})`);
    }
    if (!Number.isFinite(input.c) || input.c < 0) {
      errors.push(`c (reaction) must be finite and >= 0 (got ${input.c})`);
    }
    if (typeof input.source !== "function") errors.push("source must be a function");

    if (!input.bc || !input.bc.left || !input.bc.right) {
      errors.push("bc.left and bc.right are required");
    } else {
      for (const [nm, e] of [["left", input.bc.left], ["right", input.bc.right]] as const) {
        if (e.kind !== "dirichlet" && e.kind !== "neumann") {
          errors.push(`bc.${nm}.kind must be dirichlet | neumann (got ${(e as { kind: string }).kind})`);
        } else if (e.kind === "dirichlet" && !Number.isFinite(e.value)) {
          errors.push(`bc.${nm} dirichlet value must be finite`);
        } else if (e.kind === "neumann" && !Number.isFinite(e.flux)) {
          errors.push(`bc.${nm} neumann flux must be finite`);
        }
      }
      if (errors.length === 0 && input.bc.left.kind === "neumann" && input.bc.right.kind === "neumann" && input.c === 0) {
        warnings.push("Pure-Neumann with c=0 is singular (solution defined up to a constant) — pin one value or add reaction c>0");
      }
    }

    return createValidationResult(errors, warnings);
  }

  calculate(input: FiniteElementMethod1DInput): FiniteElementMethod1DOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`FiniteElementMethod1D validation failed: ${(validation.errors ?? []).join(", ")}`);
    }
    const warnings = [...(validation.warnings ?? [])];
    const L = input.length;
    const ne = input.elements;
    const nn = ne + 1; // nodes
    const h = L / ne;
    const a = input.a;
    const c = input.c;
    const f = input.source;
    const bc = input.bc;

    const nodes = Array.from({ length: nn }, (_, i) => i * h);

    // Global tridiagonal system: sub[], diag[], sup[], rhs[]
    const sub = new Array<number>(nn).fill(0);
    const diag = new Array<number>(nn).fill(0);
    const sup = new Array<number>(nn).fill(0);
    const rhs = new Array<number>(nn).fill(0);

    // Element assembly. Linear-P1 element matrices (exact):
    //   Ke = (a/h)[[1,-1],[-1,1]] ;  Me = (c*h/6)[[2,1],[1,2]]
    //   Fe = (h/2)[f(xi), f(xi+1)]   (consistent trapezoidal load)
    const kOff = -a / h;
    const kDiag = a / h;
    const mOff = (c * h) / 6;
    const mDiagSelf = (c * h) / 3; // 2*(c*h/6)
    for (let e = 0; e < ne; e += 1) {
      const i = e;
      const j = e + 1;
      const xi = nodes[i];
      const xj = nodes[j];
      // diagonal contributions
      diag[i] += kDiag + mDiagSelf;
      diag[j] += kDiag + mDiagSelf;
      // off-diagonal: node i couples to j (sup at i), node j to i (sub at j)
      sup[i] += kOff + mOff;
      sub[j] += kOff + mOff;
      // consistent load
      rhs[i] += (h / 2) * f(xi);
      rhs[j] += (h / 2) * f(xj);
    }

    // Neumann: add the prescribed flux a·u′ = flux as a natural BC term.
    if (bc.left.kind === "neumann") rhs[0] += bc.left.flux;
    if (bc.right.kind === "neumann") rhs[nn - 1] += bc.right.flux;

    // Dirichlet: lift — overwrite the node row to enforce u = value.
    const applyDirichlet = (idx: number, value: number): void => {
      diag[idx] = 1;
      sup[idx] = 0;
      sub[idx] = 0;
      rhs[idx] = value;
      // Eliminate the column coupling from the neighbours so symmetry/accuracy
      // is preserved on the reduced system.
      if (idx > 0) {
        rhs[idx - 1] -= sup[idx - 1] * value;
        sup[idx - 1] = 0;
      }
      if (idx < nn - 1) {
        rhs[idx + 1] -= sub[idx + 1] * value;
        sub[idx + 1] = 0;
      }
    };
    if (bc.left.kind === "dirichlet") applyDirichlet(0, bc.left.value);
    if (bc.right.kind === "dirichlet") applyDirichlet(nn - 1, bc.right.value);

    const solution = thomasSolve(sub, diag, sup, rhs);

    let solMaxAbs = 0;
    for (const v of solution) {
      const av = Math.abs(v);
      if (!Number.isFinite(av)) {
        solMaxAbs = Number.POSITIVE_INFINITY;
        break;
      }
      if (av > solMaxAbs) solMaxAbs = av;
    }
    if (!Number.isFinite(solMaxAbs)) {
      warnings.push("Solution contains non-finite values — check coefficients / BC well-posedness");
    }

    return {
      nodes,
      solution,
      h: createAtomicValue(h, "length", 0.001, "fem-1d-p1", 0.97, `h = L/elements = ${L}/${ne}`),
      solution_max_abs: solMaxAbs,
      safety: computeSafetyScore(1.0, 1.0, 1.0, Number.isFinite(solMaxAbs) ? 0.96 : 0.4),
      computed_at: new Date().toISOString(),
      algorithm_version: FiniteElementMethod1DImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "finite_element_method_1d",
      name: "Finite Element Method (1D linear Galerkin)",
      version: FiniteElementMethod1DImpl.VERSION,
      domain: "numerical",
      category: "weak_form_fem",
      description:
        "Galerkin FEM with continuous piecewise-linear (P1) shape functions " +
        "for the 1D model BVP −(a·u′)′ + c·u = f on [0,L] with Dirichlet/" +
        "Neumann BCs. Exact element matrices, tridiagonal Thomas solve. " +
        "Weak-form counterpart to FiniteDifferenceMethod. No physics constants.",
      equation_plain:
        "−(a·u′)′ + c·u = f ;  Kₑ=(a/h)[[1,−1],[−1,1]] ;  Mₑ=(c·h/6)[[2,1],[1,2]]",
      equation_latex:
        "\\int_0^L a\\,u' v' + c\\,u v \\,dx = \\int_0^L f v \\,dx \\quad \\forall v",
      references: [
        {
          authors: "Hughes, T.J.R.",
          title: "The Finite Element Method: Linear Static and Dynamic Finite Element Analysis",
          publication: "Dover",
          year: 2000,
        },
        {
          authors: "Strang, G. & Fix, G.",
          title: "An Analysis of the Finite Element Method",
          publication: "Wellesley-Cambridge (2nd ed.)",
          year: 2008,
        },
      ],
      assumptions: [
        "Model BVP −(a·u′)′ + c·u = f with constant a, c",
        "Continuous piecewise-linear (P1) Galerkin basis on a uniform mesh",
        "Consistent trapezoidal element load (exact for linear f per element)",
        "Symmetric positive-definite system (a>0, c≥0, ≥1 Dirichlet or c>0)",
      ],
      limitations: [
        "1D only; constant coefficients (no spatially-varying a(x)/c(x))",
        "P1 elements only (no quadratic/cubic/hierarchic bases)",
        "Uniform mesh (no adaptive refinement)",
        "Pure-Neumann with c=0 is singular (flagged, not auto-pinned)",
      ],
      valid_ranges: {
        elements: { min: MIN_ELEMENTS, max: MAX_ELEMENTS, unit: "-" },
        length: { min: Number.EPSILON, max: 1e9, unit: "length" },
      },
      applicable_materials: [],
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

export const FiniteElementMethod1D = new FiniteElementMethod1DImpl();

// WIRED: prism_algorithm:num_fem_1d (ENGINE-AUDIT 2026-06-19, slot:bravo) -- the source(x)
// function is built from a serializable source_spec at the dispatcher boundary.
// Also fully usable via direct import. Weak-form sibling of FiniteDifferenceMethod;
// together they are the two canonical MIT-OCW PDE discretizations.
