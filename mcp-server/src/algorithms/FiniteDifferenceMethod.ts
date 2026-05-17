/**
 * Finite Difference Method — 1D spatial discretization + method-of-lines
 *
 * Discretizes spatial derivatives of a scalar field sampled on a uniform 1D
 * grid, and assembles a semi-discrete method-of-lines right-hand-side that
 * plugs straight into [[ODEIntegrator]]. The diffusion and advection operators
 * it builds are exactly the kind of additively-decomposed operators that
 * [[OperatorSplittingMethod]] splits — so FDM is the keystone that turns the
 * P1/P6/P7 numerical suite into a PDE solver:
 *
 *     FiniteDifferenceMethod  →  method-of-lines RHS  →  ODEIntegrator (RK4)
 *                             ↘  advection / diffusion operators  →  OperatorSplittingMethod
 *
 * Schemes:
 *   - first derivative: forward / backward (O(dx)), central (O(dx²))
 *   - second derivative: central 3-point stencil [1,−2,1]/dx² (O(dx²)) — the
 *     discrete Laplacian / diffusion operator
 *   - boundary conditions: dirichlet (fixed end values), neumann (zero-gradient
 *     ghost reflection), periodic (wrap)
 *
 * Pure numerical primitive — NO physics constants. Diffusivity / advection
 * velocity are caller-supplied (the caller owns the physics).
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-FDM: Created 2026-05-17 from
 * MIT-OCW 2.086 (Numerical Computation for Mechanical Engineers)
 * FORGE-QUEUE candidate `algorithm:finite-difference-method`,
 * mfg_relevance 0.80, dedup CLEAR.
 *
 * @see LeVeque, R.J. (2007) "Finite Difference Methods for Ordinary and
 *      Partial Differential Equations", SIAM. doi:10.1137/1.9780898717839
 * @see Strikwerda, J.C. (2004) "Finite Difference Schemes and Partial
 *      Differential Equations" 2nd ed., SIAM. ISBN 978-0-89871-567-5
 *
 * @module algorithms/FiniteDifferenceMethod
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

// ─── BC + scheme types ─────────────────────────────────────────────

export type BoundaryCondition =
  | { kind: "dirichlet"; left: number; right: number }
  | { kind: "neumann" } // zero-gradient (reflective ghost)
  | { kind: "periodic" };

export type FirstDerivScheme = "forward" | "backward" | "central";

// ─── Input / Output ────────────────────────────────────────────────

export interface FiniteDifferenceInput extends AlgorithmInput {
  /** Field samples on a uniform grid (length N >= 3) */
  field: readonly number[];
  /** Grid spacing dx > 0 */
  dx: number;
  /** What to compute */
  operation: "first_derivative" | "second_derivative" | "method_of_lines_rhs";
  /** first_derivative scheme (default central) */
  scheme?: FirstDerivScheme;
  /** Boundary condition (default neumann) */
  bc?: BoundaryCondition;
  /** method_of_lines: diffusion coefficient D in  ∂u/∂t = D·∂²u/∂x² − v·∂u/∂x */
  diffusivity?: number;
  /** method_of_lines: advection velocity v */
  advection_velocity?: number;
}

export interface FiniteDifferenceOutput extends AlgorithmOutput {
  operation: string;
  /** Discrete derivative / RHS evaluated once at the input field */
  result: number[];
  /** L∞ norm of the result (telemetry / sanity) */
  result_max_abs: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const MIN_GRID = 3; // central stencils need ≥3 points
const MAX_GRID = 5_000_000;

// ─── Stencil helpers (pure) ────────────────────────────────────────

/** Apply a boundary condition to produce ghost values (uL = u[-1], uR = u[N]). */
function ghosts(field: readonly number[], bc: BoundaryCondition): { uL: number; uR: number } {
  const N = field.length;
  if (bc.kind === "periodic") return { uL: field[N - 1], uR: field[0] };
  if (bc.kind === "neumann") return { uL: field[1], uR: field[N - 2] }; // zero-gradient reflection
  // dirichlet: ghost chosen so the boundary VALUE equals the prescribed one
  return { uL: 2 * bc.left - field[1], uR: 2 * bc.right - field[N - 2] };
}

function firstDerivative(
  field: readonly number[],
  dx: number,
  scheme: FirstDerivScheme,
  bc: BoundaryCondition,
): number[] {
  const N = field.length;
  const { uL, uR } = ghosts(field, bc);
  const at = (i: number): number => (i < 0 ? uL : i >= N ? uR : field[i]);
  const out = new Array<number>(N);
  for (let i = 0; i < N; i += 1) {
    if (scheme === "forward") out[i] = (at(i + 1) - at(i)) / dx;
    else if (scheme === "backward") out[i] = (at(i) - at(i - 1)) / dx;
    else out[i] = (at(i + 1) - at(i - 1)) / (2 * dx); // central O(dx²)
  }
  return out;
}

function secondDerivative(
  field: readonly number[],
  dx: number,
  bc: BoundaryCondition,
): number[] {
  const N = field.length;
  const { uL, uR } = ghosts(field, bc);
  const at = (i: number): number => (i < 0 ? uL : i >= N ? uR : field[i]);
  const inv = 1 / (dx * dx);
  const out = new Array<number>(N);
  for (let i = 0; i < N; i += 1) {
    out[i] = (at(i - 1) - 2 * at(i) + at(i + 1)) * inv; // [1,-2,1]/dx²
  }
  return out;
}

function absMax(a: readonly number[]): number {
  let m = 0;
  for (let i = 0; i < a.length; i += 1) {
    const v = Math.abs(a[i]);
    if (!Number.isFinite(v)) return Number.POSITIVE_INFINITY;
    if (v > m) m = v;
  }
  return m;
}

// ─── Impl ──────────────────────────────────────────────────────────

class FiniteDifferenceMethodImpl
  implements Algorithm<FiniteDifferenceInput, FiniteDifferenceOutput>
{
  private static readonly VERSION = "1.0.0";

  validate(input: FiniteDifferenceInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(input.field) || input.field.length < MIN_GRID) {
      errors.push(`field must be an array of length >= ${MIN_GRID}`);
    } else {
      for (let i = 0; i < input.field.length; i += 1) {
        if (typeof input.field[i] !== "number" || !Number.isFinite(input.field[i])) {
          errors.push(`field[${i}] must be a finite number (got ${input.field[i]})`);
          break;
        }
      }
      if (input.field.length > MAX_GRID) {
        errors.push(`field length ${input.field.length} exceeds max ${MAX_GRID}`);
      }
    }

    if (!Number.isFinite(input.dx) || input.dx <= 0) {
      errors.push(`dx must be a positive finite number (got ${input.dx})`);
    }

    const op = input.operation;
    if (op !== "first_derivative" && op !== "second_derivative" && op !== "method_of_lines_rhs") {
      errors.push(`operation must be first_derivative | second_derivative | method_of_lines_rhs (got ${op})`);
    }

    if (input.scheme !== undefined && !["forward", "backward", "central"].includes(input.scheme)) {
      errors.push(`scheme must be forward | backward | central (got ${input.scheme})`);
    }

    if (input.bc !== undefined) {
      const k = input.bc.kind;
      if (k !== "dirichlet" && k !== "neumann" && k !== "periodic") {
        errors.push(`bc.kind must be dirichlet | neumann | periodic (got ${k})`);
      } else if (k === "dirichlet") {
        const d = input.bc as { left: number; right: number };
        if (!Number.isFinite(d.left) || !Number.isFinite(d.right)) {
          errors.push("dirichlet bc requires finite left/right values");
        }
      }
    }

    if (op === "method_of_lines_rhs" && errors.length === 0) {
      const D = input.diffusivity ?? 0;
      const v = input.advection_velocity ?? 0;
      if (!Number.isFinite(D) || D < 0) errors.push(`diffusivity must be finite and >= 0 (got ${D})`);
      if (!Number.isFinite(v)) errors.push(`advection_velocity must be finite (got ${v})`);
      if (D === 0 && v === 0) {
        warnings.push("method_of_lines_rhs with D=0 and v=0 yields a zero RHS (no dynamics)");
      }
    }

    return createValidationResult(errors, warnings);
  }

  calculate(input: FiniteDifferenceInput): FiniteDifferenceOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`FiniteDifferenceMethod validation failed: ${(validation.errors ?? []).join(", ")}`);
    }
    const warnings = [...(validation.warnings ?? [])];
    const op = input.operation;
    const field = input.field;
    const dx = input.dx;
    const bc: BoundaryCondition = input.bc ?? { kind: "neumann" };

    let result: number[];
    if (op === "first_derivative") {
      result = firstDerivative(field, dx, input.scheme ?? "central", bc);
    } else if (op === "second_derivative") {
      result = secondDerivative(field, dx, bc);
    } else {
      // method_of_lines_rhs: ∂u/∂t = D·u_xx − v·u_x
      const D = input.diffusivity ?? 0;
      const v = input.advection_velocity ?? 0;
      const uxx = D !== 0 ? secondDerivative(field, dx, bc) : null;
      const ux = v !== 0 ? firstDerivative(field, dx, "central", bc) : null;
      result = new Array<number>(field.length);
      for (let i = 0; i < field.length; i += 1) {
        result[i] = (uxx ? D * uxx[i] : 0) - (ux ? v * ux[i] : 0);
      }
    }

    const resultMaxAbs = absMax(result);
    if (!Number.isFinite(resultMaxAbs)) {
      warnings.push("Result contains non-finite values — check dx and field for degeneracy");
    }

    return {
      operation: op,
      result,
      result_max_abs: resultMaxAbs,
      safety: computeSafetyScore(1.0, 1.0, 1.0, Number.isFinite(resultMaxAbs) ? 0.95 : 0.4),
      computed_at: new Date().toISOString(),
      algorithm_version: FiniteDifferenceMethodImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "finite_difference_method",
      name: "Finite Difference Method (1D)",
      version: FiniteDifferenceMethodImpl.VERSION,
      domain: "numerical",
      category: "spatial_discretization",
      description:
        "1D finite-difference spatial discretization: first derivative " +
        "(fwd/bwd/central), second derivative (central Laplacian), and a " +
        "method-of-lines RHS (∂u/∂t = D·u_xx − v·u_x) that composes with " +
        "ODEIntegrator. Dirichlet/Neumann/periodic BCs. No physics constants.",
      equation_plain:
        "u'' ≈ (u_{i-1} − 2u_i + u_{i+1})/dx² ;  MOL: ∂u/∂t = D·u_xx − v·u_x",
      equation_latex:
        "u''_i \\approx \\frac{u_{i-1} - 2u_i + u_{i+1}}{\\Delta x^2}",
      references: [
        {
          authors: "LeVeque, R.J.",
          title: "Finite Difference Methods for Ordinary and Partial Differential Equations",
          publication: "SIAM",
          year: 2007,
          doi: "10.1137/1.9780898717839",
        },
        {
          authors: "Strikwerda, J.C.",
          title: "Finite Difference Schemes and Partial Differential Equations",
          publication: "SIAM (2nd ed.)",
          year: 2004,
        },
      ],
      assumptions: [
        "Uniform 1D grid spacing dx",
        "Field is a scalar sampled at grid nodes",
        "Central schemes are second-order; fwd/bwd are first-order accurate",
        "Stability of any time integration of the MOL RHS is the caller's responsibility (CFL)",
      ],
      limitations: [
        "1D only (no 2D/3D tensor-product stencils this version)",
        "Uniform grid only (no stretched / adaptive meshes)",
        "Explicit stencils only (no compact / spectral schemes)",
        "No flux limiters — central advection can oscillate at high Péclet",
      ],
      valid_ranges: {
        grid: { min: MIN_GRID, max: MAX_GRID, unit: "-" },
        dx: { min: Number.EPSILON, max: 1e9, unit: "length" },
      },
      applicable_materials: [],
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

// ─── Public singleton + composition adapter ────────────────────────

export const FiniteDifferenceMethod = new FiniteDifferenceMethodImpl();

/**
 * Build a method-of-lines DerivativeFn for ODEIntegrator: the state vector IS
 * the field samples; dy/dt = D·u_xx − v·u_x evaluated by FDM each call.
 *
 * @example
 *   const f = makeMethodOfLinesRHS({ dx: 0.01, diffusivity: 1e-4,
 *                                    bc: { kind: "periodic" } });
 *   ODEIntegrator.calculate({ initial_state: u0, f, t0:0, tf:1, steps:1000 });
 */
export function makeMethodOfLinesRHS(opts: {
  dx: number;
  diffusivity?: number;
  advection_velocity?: number;
  bc?: BoundaryCondition;
}): DerivativeFn {
  return (_t: number, y: readonly number[]): number[] => {
    const out = FiniteDifferenceMethod.calculate({
      field: y,
      dx: opts.dx,
      operation: "method_of_lines_rhs",
      diffusivity: opts.diffusivity ?? 0,
      advection_velocity: opts.advection_velocity ?? 0,
      bc: opts.bc ?? { kind: "neumann" },
    });
    return out.result;
  };
}

// WIRE-EXEMPT: numerical primitive intentionally not wired this commit —
// shares deferred U-COURSE-FORGE-P1-DISPATCHER (prism_calc:fdm_discretize).
// Fully usable via import; makeMethodOfLinesRHS composes into ODEIntegrator
// (which composes into OperatorSplittingMethod) — completes the PDE suite.
