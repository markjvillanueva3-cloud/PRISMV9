/**
 * ODE Integrator — Explicit Euler and Classical Runge-Kutta (RK4)
 *
 * Integrates a first-order system  dy/dt = f(t, y)  over a fixed time grid.
 * Two fixed-step explicit schemes:
 *   - **euler** (forward / explicit Euler): y_{n+1} = y_n + dt·f(t_n, y_n)
 *                                          local error O(dt²), global O(dt)
 *   - **rk4** (classical 4th-order Runge-Kutta): the textbook k1..k4 average
 *                                          local error O(dt⁵), global O(dt⁴)
 *
 * This is a sibling primitive to [[OperatorSplittingMethod]]: an `ODEIntegrator`
 * single-step closure is itself a valid `SubstepIntegrator` for the splitting
 * scheme (split a multi-physics ODE, integrate each operator with Euler/RK4).
 *
 * Pure numerical primitive — does NOT import physics constants. The caller
 * supplies the derivative function `f(t, y)`; PRISM physics live in the
 * caller's `f`, never here (R8/R10).
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P7: Created 2026-05-17 from
 * MIT-OCW 2.003 / 2.003j (Modeling Dynamics and Control I) FORGE-QUEUE
 * candidate `algorithm:euler-method`, mfg_relevance 0.80, dedup CLEAR.
 * Scope expanded per the P7 proposal note ("sister RK4 for accuracy
 * comparison") — Euler alone is rarely production-grade; RK4 makes the
 * node useful for real thermal-transient / motion-profile work.
 *
 * @see Hairer, Nørsett & Wanner (1993) "Solving Ordinary Differential
 *      Equations I: Nonstiff Problems" 2nd ed., Springer. ISBN 978-3-540-56670-0
 * @see Butcher, J.C. (2016) "Numerical Methods for Ordinary Differential
 *      Equations" 3rd ed., Wiley. doi:10.1002/9781119121534
 *
 * @module algorithms/ODEIntegrator
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

// ─── Derivative contract ───────────────────────────────────────────

/**
 * Right-hand side of dy/dt = f(t, y). MUST be pure — return a NEW vector
 * of the same length as `y`. Mutating `y` is a contract violation.
 */
export type DerivativeFn = (t: number, y: readonly number[]) => number[];

// ─── Input Interface ───────────────────────────────────────────────

export interface ODEIntegratorInput extends AlgorithmInput {
  /** Initial state vector y(t0) */
  initial_state: readonly number[];
  /** Start time */
  t0: number;
  /** End time (must be > t0) */
  tf: number;
  /** Number of fixed steps; dt = (tf - t0) / steps */
  steps: number;
  /** dy/dt = f(t, y) */
  f: DerivativeFn;
  /** Integration scheme — explicit Euler or classical RK4 */
  method?: "euler" | "rk4";
  /** If true, capture state after every step (memory O(steps × N)) */
  capture_trajectory?: boolean;
}

// ─── Output Interface ──────────────────────────────────────────────

export interface ODEIntegratorOutput extends AlgorithmOutput {
  /** Final state vector y(tf) */
  final_state: number[];
  /** Scheme actually used */
  method_used: "euler" | "rk4";
  /** Steps completed (< steps if overflow guard tripped) */
  steps_completed: number;
  /** Step size used */
  dt_used: AtomicValue<number>;
  /** Max |component| seen across the trajectory (overflow telemetry) */
  trajectory_max_abs: number;
  /** Optional trajectory snapshots if capture_trajectory was true */
  trajectory?: number[][];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Halt integration if any component magnitude exceeds this (overflow guard). */
const OVERFLOW_THRESHOLD = 1e15;

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  span: { min: Number.EPSILON, max: 1e9, unit: "time" },
  steps: { min: 1, max: 1_000_000, unit: "-" },
  state_dim: { min: 1, max: 100_000, unit: "-" },
};

// ─── Impl ──────────────────────────────────────────────────────────

class ODEIntegratorImpl implements Algorithm<ODEIntegratorInput, ODEIntegratorOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: ODEIntegratorInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(input.initial_state) || input.initial_state.length === 0) {
      errors.push("initial_state must be a non-empty array");
    } else {
      for (let i = 0; i < input.initial_state.length; i += 1) {
        const v = input.initial_state[i];
        if (typeof v !== "number" || !Number.isFinite(v)) {
          errors.push(`initial_state[${i}] must be a finite number (got ${v})`);
          break;
        }
      }
      if (input.initial_state.length > VALID_RANGES.state_dim.max) {
        errors.push(`initial_state length ${input.initial_state.length} exceeds max ${VALID_RANGES.state_dim.max}`);
      }
    }

    if (!Number.isFinite(input.t0)) errors.push(`t0 must be finite (got ${input.t0})`);
    if (!Number.isFinite(input.tf)) errors.push(`tf must be finite (got ${input.tf})`);
    if (Number.isFinite(input.t0) && Number.isFinite(input.tf)) {
      const span = input.tf - input.t0;
      if (span <= 0) errors.push(`tf must be > t0 (span ${span} <= 0)`);
      else if (span > VALID_RANGES.span.max) {
        errors.push(`time span ${span} exceeds max ${VALID_RANGES.span.max}`);
      }
    }

    if (!Number.isInteger(input.steps) || input.steps < 1) {
      errors.push(`steps must be a positive integer (got ${input.steps})`);
    } else if (input.steps > VALID_RANGES.steps.max) {
      errors.push(`steps ${input.steps} exceeds max ${VALID_RANGES.steps.max}`);
    }

    if (typeof input.f !== "function") errors.push("f must be a function");

    if (input.method !== undefined && input.method !== "euler" && input.method !== "rk4") {
      errors.push(`method must be 'euler' or 'rk4' (got ${input.method})`);
    }

    if (errors.length === 0 && input.method === "euler" && input.steps < 50) {
      warnings.push("Explicit Euler with < 50 steps — O(dt) global error may be large; consider rk4");
    }

    return createValidationResult(errors, warnings);
  }

  calculate(input: ODEIntegratorInput): ODEIntegratorOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`ODEIntegrator validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];
    const method = input.method ?? "rk4";
    const t0 = input.t0;
    const steps = input.steps;
    const dt = (input.tf - t0) / steps;
    const f = input.f;
    const capture = input.capture_trajectory === true;
    const n = input.initial_state.length;

    let state: number[] = Array.from(input.initial_state);
    const trajectory: number[][] | undefined = capture ? [state.slice()] : undefined;
    let trajectoryMaxAbs = absMax(state);
    let stepsCompleted = 0;

    for (let s = 0; s < steps; s += 1) {
      const t = t0 + s * dt;
      let next: number[];

      if (method === "euler") {
        const k = f(t, state);
        validateDeriv(k, n, "f");
        next = new Array<number>(n);
        for (let i = 0; i < n; i += 1) next[i] = state[i] + dt * k[i];
      } else {
        // Classical RK4
        const k1 = f(t, state);
        validateDeriv(k1, n, "f(k1)");
        const y2 = addScaled(state, k1, dt / 2);
        const k2 = f(t + dt / 2, y2);
        validateDeriv(k2, n, "f(k2)");
        const y3 = addScaled(state, k2, dt / 2);
        const k3 = f(t + dt / 2, y3);
        validateDeriv(k3, n, "f(k3)");
        const y4 = addScaled(state, k3, dt);
        const k4 = f(t + dt, y4);
        validateDeriv(k4, n, "f(k4)");
        next = new Array<number>(n);
        for (let i = 0; i < n; i += 1) {
          next[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
        }
      }

      state = next;
      const absMaxNow = absMax(state);
      if (absMaxNow > trajectoryMaxAbs) trajectoryMaxAbs = absMaxNow;

      if (absMaxNow > OVERFLOW_THRESHOLD) {
        warnings.push(
          `Trajectory overflow at step ${s + 1}: |state|_max=${absMaxNow.toExponential(2)} exceeds ${OVERFLOW_THRESHOLD.toExponential(0)}; stopping early. (Step size dt=${dt} likely violates stability for this f.)`,
        );
        if (capture && trajectory) trajectory.push(state.slice());
        stepsCompleted = s + 1;
        break;
      }

      if (capture && trajectory) trajectory.push(state.slice());
      stepsCompleted = s + 1;
    }

    // Numerical primitive: physics-clean (no constants). Range score reflects
    // step resolution + scheme order; overflow degrades process score.
    const orderBonus = method === "rk4" ? 1.0 : 0.85; // RK4 far more accurate/step
    const stepResolutionScore = steps >= 100 ? 1.0 : steps >= 20 ? 0.9 : 0.75;
    const overflowed = stepsCompleted < steps;
    const processScore = overflowed ? 0.4 : 0.95;
    const safety = computeSafetyScore(
      1.0,
      Math.min(stepResolutionScore, orderBonus),
      1.0,
      processScore,
    );
    const dtUncertaintyPct = method === "rk4" ? 2 : 12; // O(dt⁴) vs O(dt)

    return {
      final_state: state,
      method_used: method,
      steps_completed: stepsCompleted,
      dt_used: createAtomicValue(
        dt,
        "time",
        dtUncertaintyPct,
        "ode-integrator",
        safety.score,
        `dt = (tf - t0)/steps = (${input.tf} - ${t0})/${steps}`,
      ),
      trajectory_max_abs: trajectoryMaxAbs,
      trajectory,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: ODEIntegratorImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "ode_integrator",
      name: "ODE Integrator (Explicit Euler / Classical RK4)",
      version: ODEIntegratorImpl.VERSION,
      domain: "numerical",
      category: "ode_solver_fixed_step",
      description:
        "Integrates dy/dt = f(t,y) on a fixed time grid via explicit Euler " +
        "(global O(dt)) or classical 4th-order Runge-Kutta (global O(dt⁴)). " +
        "Pure primitive; caller supplies the derivative function. Composes " +
        "with OperatorSplittingMethod as a SubstepIntegrator.",
      equation_plain:
        "Euler: y_{n+1} = y_n + dt·f(t_n,y_n)   RK4: y_{n+1} = y_n + dt/6·(k1+2k2+2k3+k4)",
      equation_latex:
        "y_{n+1} = y_n + \\frac{\\Delta t}{6}\\,(k_1 + 2k_2 + 2k_3 + k_4)",
      references: [
        {
          authors: "Hairer, E., Nørsett, S.P. & Wanner, G.",
          title: "Solving Ordinary Differential Equations I: Nonstiff Problems",
          publication: "Springer (2nd ed.)",
          year: 1993,
          doi: "10.1007/978-3-540-78862-1",
        },
        {
          authors: "Butcher, J.C.",
          title: "Numerical Methods for Ordinary Differential Equations",
          publication: "Wiley (3rd ed.)",
          year: 2016,
          doi: "10.1002/9781119121534",
        },
      ],
      assumptions: [
        "System is first-order: dy/dt = f(t, y) (higher order → state augmentation by caller)",
        "f is a pure function returning a vector of the SAME length as y",
        "Fixed step size — no adaptive error control",
        "Non-stiff problem (explicit schemes; stiff systems need implicit methods)",
      ],
      limitations: [
        "Explicit Euler is conditionally stable — large dt diverges (overflow guard catches it)",
        "RK4 also conditionally stable for stiff systems despite high order",
        "No adaptive step / embedded error estimate (Dormand-Prince out of scope)",
        "No dense output / interpolation between grid points",
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
    if (!Number.isFinite(a)) return Number.POSITIVE_INFINITY;
    if (a > m) m = a;
  }
  return m;
}

/** Return a NEW vector  base + scale·delta  (RK4 stage construction). */
function addScaled(base: readonly number[], delta: readonly number[], scale: number): number[] {
  const out = new Array<number>(base.length);
  for (let i = 0; i < base.length; i += 1) out[i] = base[i] + scale * delta[i];
  return out;
}

function validateDeriv(out: unknown, expectedLength: number, name: string): asserts out is number[] {
  if (!Array.isArray(out)) {
    throw new TypeError(`${name} must return an array (got ${typeof out})`);
  }
  if (out.length !== expectedLength) {
    throw new TypeError(`${name} returned array of length ${out.length}, expected ${expectedLength}`);
  }
  if (out.length > 0 && typeof out[0] !== "number") {
    throw new TypeError(`${name} returned non-number at index 0 (got ${typeof out[0]})`);
  }
}

// ─── Public singleton ─────────────────────────────────────────────

export const ODEIntegrator = new ODEIntegratorImpl();

/**
 * Adapter: wrap an autonomous derivative f(y) as a one-step SubstepIntegrator
 * compatible with OperatorSplittingMethod. Integrates ONE substep of size dt
 * using the given method. Lets a caller split a multi-physics ODE and push
 * each operator through Euler/RK4.
 *
 * @example
 *   const stepA = makeSubstepIntegrator((y) => [-y[0]], "rk4");
 *   OperatorSplittingMethod.calculate({ applyA: stepA, applyB: ..., ... });
 */
export function makeSubstepIntegrator(
  fAutonomous: (y: readonly number[]) => number[],
  method: "euler" | "rk4" = "rk4",
): (state: readonly number[], dt: number) => number[] {
  return (state: readonly number[], dt: number): number[] => {
    const out = ODEIntegrator.calculate({
      initial_state: state,
      t0: 0,
      tf: dt,
      steps: 1,
      method,
      f: (_t, y) => fAutonomous(y),
    });
    return out.final_state;
  };
}

// WIRE-EXEMPT: numerical primitive intentionally not wired this commit —
// follow-up unit U-COURSE-FORGE-P1-DISPATCHER (shared with OperatorSplitting)
// will add `prism_calc:ode_integrate`. Fully usable via direct import and via
// the makeSubstepIntegrator adapter into OperatorSplittingMethod.
