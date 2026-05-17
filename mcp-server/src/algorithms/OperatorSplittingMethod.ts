/**
 * Operator Splitting Method — Lie-Trotter and Strang Splitting Schemes
 *
 * Solves additively-decomposed ODEs of the form  dy/dt = A(y) + B(y)
 * by alternating sub-integrations of A and B over short time steps. This is
 * the foundational scheme for multi-physics PRISM solvers — e.g. coupling
 * convection (A) with diffusion (B) in a thermal field, or coupling spindle
 * dynamics (A) with cutting-force feedback (B) in a chatter solver.
 *
 * Two methods provided:
 *  - **Lie (first-order)**:  ψ_dt ≈ Φ_B^dt ∘ Φ_A^dt          (cheaper, O(dt))
 *  - **Strang (second-order symmetric)**:                                                    *      ψ_dt ≈ Φ_A^{dt/2} ∘ Φ_B^dt ∘ Φ_A^{dt/2}    (O(dt²), one extra A-step)
 *
 * The caller injects pure substep integrators `applyA(state, dt)` and
 * `applyB(state, dt)` — this algorithm is operator-agnostic. It does NOT
 * import physics constants (R8/R10 — that's the caller's responsibility).
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P1: Created 2026-05-17 from
 * MIT-OCW 10.34 "Numerical Methods Applied to Chemical Engineering"
 * FORGE-QUEUE candidate, mfg_relevance 0.80, dedup-preflight CLEAR.
 *
 * @see Strang, G. (1968) "On the construction and comparison of difference
 *      schemes." SIAM J. Numer. Anal. 5(3):506-517. doi:10.1137/0705041
 * @see McLachlan & Quispel (2002) "Splitting methods." Acta Numerica 11:341-434.
 *
 * @module algorithms/OperatorSplittingMethod
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

// ─── Operator substep contract ─────────────────────────────────────

/**
 * Substep integrator: advance `state` by `dt` under one operator alone.
 * MUST be a pure function — accept a state, return a NEW state. Mutating
 * the input vector is a contract violation; the splitting scheme expects
 * fresh arrays each substep so trajectory snapshots remain immutable.
 */
export type SubstepIntegrator = (state: readonly number[], dt: number) => number[];

// ─── Input Interface ───────────────────────────────────────────────

export interface OperatorSplittingInput extends AlgorithmInput {
  /** Initial state vector y(t=0) */
  initial_state: readonly number[];
  /** Total time horizon (consistent units with applyA / applyB) */
  total_time: number;
  /** Number of macro-steps; per-step dt = total_time / steps */
  steps: number;
  /** Substep A integrator: y → applyA(y, dt) */
  applyA: SubstepIntegrator;
  /** Substep B integrator: y → applyB(y, dt) */
  applyB: SubstepIntegrator;
  /** Splitting order — Lie (first-order) or Strang (second-order symmetric) */
  method?: "lie" | "strang";
  /** If true, capture state after every macro-step. Memory cost O(steps × N) */
  capture_trajectory?: boolean;
}

// ─── Output Interface ──────────────────────────────────────────────

export interface OperatorSplittingOutput extends AlgorithmOutput {
  /** Final state vector y(t = total_time) */
  final_state: number[];
  /** Splitting method actually used */
  method_used: "lie" | "strang";
  /** Wall-clock macro-step count completed */
  steps_completed: number;
  /** Per-step dt used */
  dt_used: AtomicValue<number>;
  /** Maximum absolute component magnitude along the trajectory (overflow guard) */
  trajectory_max_abs: number;
  /** Optional trajectory snapshots if capture_trajectory was true */
  trajectory?: number[][];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Stop integration early if any component magnitude exceeds this — overflow guard. */
const TRAJECTORY_OVERFLOW_THRESHOLD = 1e15;

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  total_time: { min: Number.EPSILON, max: 1e9, unit: "consistent" },
  steps: { min: 1, max: 1_000_000, unit: "-" },
  state_dim: { min: 1, max: 100_000, unit: "-" },
};

// ─── Impl ──────────────────────────────────────────────────────────

class OperatorSplittingMethodImpl
  implements Algorithm<OperatorSplittingInput, OperatorSplittingOutput>
{
  private static readonly VERSION = "1.0.0";

  validate(input: OperatorSplittingInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(input.initial_state) || input.initial_state.length === 0) {
      errors.push("initial_state must be a non-empty array");
    } else {
      for (let i = 0; i < input.initial_state.length; i += 1) {
        const v = input.initial_state[i];
        if (typeof v !== "number" || !Number.isFinite(v)) {
          errors.push(`initial_state[${i}] must be a finite number (got ${v})`);
          break; // one report is enough
        }
      }
      if (input.initial_state.length > VALID_RANGES.state_dim.max) {
        errors.push(`initial_state length ${input.initial_state.length} exceeds max ${VALID_RANGES.state_dim.max}`);
      }
    }

    if (!Number.isFinite(input.total_time) || input.total_time <= 0) {
      errors.push(`total_time must be a positive finite number (got ${input.total_time})`);
    } else if (input.total_time > VALID_RANGES.total_time.max) {
      errors.push(`total_time ${input.total_time} exceeds max ${VALID_RANGES.total_time.max}`);
    }

    if (!Number.isInteger(input.steps) || input.steps < 1) {
      errors.push(`steps must be a positive integer (got ${input.steps})`);
    } else if (input.steps > VALID_RANGES.steps.max) {
      errors.push(`steps ${input.steps} exceeds max ${VALID_RANGES.steps.max}`);
    }

    if (typeof input.applyA !== "function") errors.push("applyA must be a function");
    if (typeof input.applyB !== "function") errors.push("applyB must be a function");

    if (input.method !== undefined && input.method !== "lie" && input.method !== "strang") {
      errors.push(`method must be 'lie' or 'strang' (got ${input.method})`);
    }

    if (errors.length === 0 && input.steps < 10) {
      warnings.push("Fewer than 10 steps — local-truncation error may dominate for stiff problems");
    }

    return createValidationResult(errors, warnings);
  }

  calculate(input: OperatorSplittingInput): OperatorSplittingOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`OperatorSplitting validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];
    const method = input.method ?? "strang";
    const totalTime = input.total_time;
    const steps = input.steps;
    const dt = totalTime / steps;
    const half = dt / 2;
    const applyA = input.applyA;
    const applyB = input.applyB;
    const capture = input.capture_trajectory === true;

    let state: number[] = Array.from(input.initial_state);
    const trajectory: number[][] | undefined = capture ? [state.slice()] : undefined;
    let trajectoryMaxAbs = absMax(state);
    let stepsCompleted = 0;

    for (let s = 0; s < steps; s += 1) {
      let next: number[];
      if (method === "lie") {
        // Lie-Trotter:  Φ_B^dt ∘ Φ_A^dt
        const a = applyA(state, dt);
        validateSubstepReturn(a, state.length, "applyA");
        next = applyB(a, dt);
        validateSubstepReturn(next, state.length, "applyB");
      } else {
        // Strang:  Φ_A^{dt/2} ∘ Φ_B^dt ∘ Φ_A^{dt/2}
        const a1 = applyA(state, half);
        validateSubstepReturn(a1, state.length, "applyA");
        const b = applyB(a1, dt);
        validateSubstepReturn(b, state.length, "applyB");
        next = applyA(b, half);
        validateSubstepReturn(next, state.length, "applyA");
      }

      state = next.slice(); // defensive copy — callers must not retain refs
      const absMaxNow = absMax(state);
      if (absMaxNow > trajectoryMaxAbs) trajectoryMaxAbs = absMaxNow;

      if (absMaxNow > TRAJECTORY_OVERFLOW_THRESHOLD) {
        warnings.push(
          `Trajectory overflow at step ${s + 1}: |state|_max=${absMaxNow.toExponential(2)} exceeds ${TRAJECTORY_OVERFLOW_THRESHOLD.toExponential(0)}; stopping early.`,
        );
        if (capture && trajectory) trajectory.push(state.slice());
        stepsCompleted = s + 1;
        break;
      }

      if (capture && trajectory) trajectory.push(state.slice());
      stepsCompleted = s + 1;
    }

    // Safety score — splitting itself is unconditionally physics-clean
    // (no constants, no formula), so physics=1.0. Range score reflects step
    // resolution; material/process are n/a (set to 1.0 — splitting is
    // material-agnostic). Overflow degrades the process score.
    const stepResolutionScore = steps >= 100 ? 1.0 : steps >= 10 ? 0.9 : 0.75;
    const overflowed = stepsCompleted < steps;
    const processScore = overflowed ? 0.4 : 0.95;
    const safety = computeSafetyScore(1.0, stepResolutionScore, 1.0, processScore);
    // Strang is O(dt²), Lie is O(dt) — reflect that in dt_used's relative
    // uncertainty so downstream consumers can propagate it.
    const dtUncertaintyPct = method === "strang" ? 5 : 15;

    return {
      final_state: state,
      method_used: method,
      steps_completed: stepsCompleted,
      dt_used: createAtomicValue(
        dt,
        "time",
        dtUncertaintyPct,
        "operator-splitting",
        safety.score,
        `dt = total_time/steps = ${totalTime}/${steps}`,
      ),
      trajectory_max_abs: trajectoryMaxAbs,
      trajectory,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: OperatorSplittingMethodImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "operator_splitting_method",
      name: "Operator Splitting Method (Lie-Trotter / Strang)",
      version: OperatorSplittingMethodImpl.VERSION,
      domain: "numerical",
      category: "ode_solver_operator_splitting",
      description:
        "Solves dy/dt = A(y) + B(y) by alternating sub-integrations of A and B. " +
        "Provides Lie-Trotter (first-order) and Strang (second-order symmetric) schemes. " +
        "Operator-agnostic: caller injects pure-function substep integrators.",
      equation_plain:
        "Lie:    ψ_dt ≈ Φ_B^dt ∘ Φ_A^dt    Strang: ψ_dt ≈ Φ_A^{dt/2} ∘ Φ_B^dt ∘ Φ_A^{dt/2}",
      equation_latex:
        "\\psi_{\\Delta t}^{\\mathrm{Strang}} = \\Phi_A^{\\Delta t/2} \\circ \\Phi_B^{\\Delta t} \\circ \\Phi_A^{\\Delta t/2}",
      references: [
        {
          authors: "Strang, G.",
          title: "On the construction and comparison of difference schemes",
          publication: "SIAM J. Numer. Anal.",
          year: 1968,
          pages: "506-517",
          doi: "10.1137/0705041",
        },
        {
          authors: "McLachlan, R. & Quispel, R.",
          title: "Splitting methods",
          publication: "Acta Numerica",
          year: 2002,
          pages: "341-434",
        },
      ],
      assumptions: [
        "Operator decomposition dy/dt = A(y) + B(y) is exact (caller's responsibility)",
        "Substep integrators applyA and applyB are pure functions (no shared mutable state)",
        "Substeps return arrays of the SAME length as the input state",
        "Time scales of A and B are comparable (otherwise stiff-splitting error dominates)",
      ],
      limitations: [
        "Splitting error: O(dt) for Lie, O(dt²) for Strang — not exact for non-commuting operators",
        "Pathological non-commutativity ([A,B] large) can require sub-stepping below dt",
        "Adaptive step control NOT included — caller chooses dt",
        "Higher-order (Yoshida-4, Suzuki) splittings are out of scope for this primitive",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: [], // material-agnostic numerical primitive
      last_validated: "2026-05-17",
      validation_score: 0.95,
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function absMax(arr: readonly number[]): number {
  let m = 0;
  for (let i = 0; i < arr.length; i += 1) {
    const a = Math.abs(arr[i]);
    if (a > m) m = a;
    if (!Number.isFinite(a)) return Number.POSITIVE_INFINITY;
  }
  return m;
}

function validateSubstepReturn(
  out: unknown,
  expectedLength: number,
  name: string,
): asserts out is number[] {
  if (!Array.isArray(out)) {
    throw new TypeError(`${name} must return an array (got ${typeof out})`);
  }
  if (out.length !== expectedLength) {
    throw new TypeError(
      `${name} returned array of length ${out.length}, expected ${expectedLength}`,
    );
  }
  // Cheap finite check on the first element — full vector check would be O(N).
  // Strang loop tracks absMax(state) which catches NaN/Infinity downstream.
  if (out.length > 0 && typeof out[0] !== "number") {
    throw new TypeError(`${name} returned non-number at index 0 (got ${typeof out[0]})`);
  }
}

// ─── Public singleton ─────────────────────────────────────────────

export const OperatorSplittingMethod = new OperatorSplittingMethodImpl();

// WIRE-EXEMPT: algorithm primitive intentionally not wired this commit —
// follow-up unit U-COURSE-FORGE-P1-DISPATCHER will add a calcDispatcher
// action `prism_calc:operator_split` once the per-file scrutiny gate can
// run cleanly against a less peer-saturated dispatcher tree. The algorithm
// is fully usable via direct import.
