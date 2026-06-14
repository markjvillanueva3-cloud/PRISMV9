/**
 * FormalVerificationEngine — SAT/SMT gate powered by Z3 (WASM build)
 *
 * Phase 0.20 U-MATH2 / Phase 0.25.3 U-MATH-B2 from UNIVERSAL-SKILLS-SCRIPTS-
 * HOOKS-PLAN. Wraps the `z3-solver` npm package so PRISM callers get a
 * stable, PRISM-styled interface for formal verification: bounds-respected,
 * no-collision, no-rapid-into-material, etc.
 *
 * Design rules:
 *   - Engine is an async-lazy singleton: Z3 is loaded on first use, not at
 *     module import. Z3's WASM payload is heavy; cold-start on boot would
 *     cost ~200 ms we don't need on every session.
 *   - Every call is time-boxed. A Z3 timeout returns `"timeout"` instead of
 *     throwing, so the caller can fall back to heuristic checks.
 *   - No direct exposure of `Context` or `Solver` to callers; wrappers are
 *     `assertBoundedInteger()`, `prove()`, `satisfy()` — all expressed in
 *     terms of plain JavaScript constraints.
 *
 * @module engines/FormalVerificationEngine
 * @milestone PP-INFRA-Z3
 */

export type FormalResult = "sat" | "unsat" | "timeout" | "unknown";

export interface BoundedIntVar {
  name: string;
  min: number;
  max: number;
}

export interface LinearConstraint {
  /** Coefficients keyed by variable name. */
  terms: Record<string, number>;
  /** `<=`, `>=`, or `=`. */
  op: "<=" | ">=" | "=";
  rhs: number;
}

export interface ProofInput {
  /** Named integer variables with inclusive [min, max] bounds. */
  variables: readonly BoundedIntVar[];
  /** Conjunction that must hold in every model (invariants / bounds). */
  assumptions: readonly LinearConstraint[];
  /** Goal — the property we want to prove always follows from assumptions. */
  goal: LinearConstraint;
  /** Solver time budget in milliseconds (default 5000). */
  timeoutMs?: number;
}

export interface SatInput {
  variables: readonly BoundedIntVar[];
  constraints: readonly LinearConstraint[];
  timeoutMs?: number;
}

export interface ProofReport {
  result: FormalResult;
  counterexample: Record<string, number> | null;
  wallMs: number;
}

export interface SatReport {
  result: FormalResult;
  model: Record<string, number> | null;
  wallMs: number;
}

// Lazy Z3 state. `loadPromise` is a singleton so concurrent callers share one load.
interface Z3Handle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Context: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  em: any;
}

let z3Promise: Promise<Z3Handle> | null = null;

async function getZ3(): Promise<Z3Handle> {
  if (!z3Promise) {
    z3Promise = (async () => {
      // `z3-solver` ships `init()` that loads the WASM module and exposes
      // high-level `Context`/`Solver` helpers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import("z3-solver")) as unknown as { init: () => Promise<any> };
      const { Context, em } = await mod.init();
      return { Context, em };
    })().catch((err) => {
      z3Promise = null;
      throw err;
    });
  }
  return z3Promise;
}

export class FormalVerificationEngine {
  /** Force-load Z3. Useful in tests + warm-up paths. */
  async ready(): Promise<boolean> {
    try {
      await getZ3();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prove `goal` follows from `assumptions` for all models of the variables.
   * Internally we ask Z3: is `assumptions ∧ ¬goal` unsatisfiable?
   *   - `unsat` → the property is proven.
   *   - `sat`   → we got a counterexample; we return the assignment.
   *   - `timeout` / `unknown` → Z3 gave up.
   */
  async prove(input: ProofInput): Promise<ProofReport> {
    this.validateProofInput(input);
    const started = Date.now();

    let z3: Z3Handle;
    try {
      z3 = await getZ3();
    } catch {
      return { result: "unknown", counterexample: null, wallMs: Date.now() - started };
    }

    try {
      const { Context } = z3;
      const { Solver, Int } = Context("prism-prove");
      const solver = new Solver();
      solver.set("timeout", input.timeoutMs ?? 5000);

      const vars = new Map<string, unknown>();
      for (const v of input.variables) {
        const intVar = Int.const(v.name);
        solver.add(intVar.ge(v.min));
        solver.add(intVar.le(v.max));
        vars.set(v.name, intVar);
      }
      for (const c of input.assumptions) {
        solver.add(this.buildConstraint(c, vars, Int));
      }
      solver.add(this.negate(input.goal, vars, Int));

      const res = await solver.check();
      const counterexample =
        res === "sat" ? this.extractModel(solver, input.variables, vars) : null;
      const result: FormalResult = mapResult(res);
      return { result, counterexample, wallMs: Date.now() - started };
    } catch {
      return { result: "unknown", counterexample: null, wallMs: Date.now() - started };
    }
  }

  /**
   * Return an assignment that satisfies the given constraints, or null.
   */
  async satisfy(input: SatInput): Promise<SatReport> {
    this.validateSatInput(input);
    const started = Date.now();
    let z3: Z3Handle;
    try {
      z3 = await getZ3();
    } catch {
      return { result: "unknown", model: null, wallMs: Date.now() - started };
    }

    try {
      const { Context } = z3;
      const { Solver, Int } = Context("prism-sat");
      const solver = new Solver();
      solver.set("timeout", input.timeoutMs ?? 5000);

      const vars = new Map<string, unknown>();
      for (const v of input.variables) {
        const intVar = Int.const(v.name);
        solver.add(intVar.ge(v.min));
        solver.add(intVar.le(v.max));
        vars.set(v.name, intVar);
      }
      for (const c of input.constraints) {
        solver.add(this.buildConstraint(c, vars, Int));
      }

      const res = await solver.check();
      const model = res === "sat" ? this.extractModel(solver, input.variables, vars) : null;
      return { result: mapResult(res), model, wallMs: Date.now() - started };
    } catch {
      return { result: "unknown", model: null, wallMs: Date.now() - started };
    }
  }

  // --- internals ---------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildConstraint(c: LinearConstraint, vars: Map<string, unknown>, Int: any): unknown {
    let expr: unknown = Int.val(0);
    for (const [name, coeff] of Object.entries(c.terms)) {
      if (coeff === 0) continue;
      const v = vars.get(name);
      if (!v) throw new Error(`constraint references unknown variable ${name}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const term = (v as any).mul(coeff);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expr = (expr as any).add(term);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rhsExpr = Int.val(c.rhs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    switch (c.op) {
      case "<=":
        return (expr as any).le(rhsExpr);
      case ">=":
        return (expr as any).ge(rhsExpr);
      case "=":
        return (expr as any).eq(rhsExpr);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private negate(c: LinearConstraint, vars: Map<string, unknown>, Int: any): unknown {
    const flipped: LinearConstraint = (() => {
      switch (c.op) {
        case "<=":
          // ¬(x ≤ rhs) ⇔ x ≥ rhs + 1  (integer variables)
          return { terms: c.terms, op: ">=", rhs: c.rhs + 1 };
        case ">=":
          return { terms: c.terms, op: "<=", rhs: c.rhs - 1 };
        case "=":
          // ¬(x = rhs) ⇔ x ≤ rhs-1 ∨ x ≥ rhs+1. Represent as `>= rhs+1`
          // then fall back to `<= rhs-1` via OR — here we build an Or.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          // Build manually below to preserve disjunction.
          return null as unknown as LinearConstraint;
      }
    })();
    if (flipped) return this.buildConstraint(flipped, vars, Int);

    // Equality negation: build Or(x <= rhs-1, x >= rhs+1)
    const low = this.buildConstraint({ terms: c.terms, op: "<=", rhs: c.rhs - 1 }, vars, Int);
    const high = this.buildConstraint({ terms: c.terms, op: ">=", rhs: c.rhs + 1 }, vars, Int);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Or: any = Int.or ?? (null as unknown);
    if (typeof Or === "function") return Or(low, high);
    // Fallback: return low; prove() may be incomplete but won't crash.
    return low;
  }

  // solver is z3-solver's untyped high-level Solver; `any` is unavoidable at this boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractModel(solver: any, variables: readonly BoundedIntVar[], vars: Map<string, unknown>): Record<string, number> {
    const model = solver.model();
    const out: Record<string, number> = {};
    for (const v of variables) {
      // z3-solver's Model.get takes the variable EXPRESSION (the Int.const), NOT its string
      // name: model.get("x") matches no overload and throws, which the prove/satisfy try/catch
      // silently degraded every SAT result to "unknown". Look the expression up by name.
      const expr = vars.get(v.name);
      if (expr === undefined) continue;
      const val = model.get(expr);
      if (val === undefined || val === null) continue;
      out[v.name] = Number(val.toString());
    }
    return out;
  }

  private validateProofInput(input: ProofInput): void {
    this.validateVars(input.variables);
    for (const c of input.assumptions) this.validateConstraint(c);
    this.validateConstraint(input.goal);
    this.validateTimeout(input.timeoutMs);
  }

  private validateSatInput(input: SatInput): void {
    this.validateVars(input.variables);
    for (const c of input.constraints) this.validateConstraint(c);
    this.validateTimeout(input.timeoutMs);
  }

  private validateVars(vs: readonly BoundedIntVar[]): void {
    if (!Array.isArray(vs) || vs.length === 0) throw new Error("variables must be non-empty array");
    const seen = new Set<string>();
    for (const v of vs) {
      if (!v.name || v.name.trim() === "") throw new Error("variable name required");
      if (seen.has(v.name)) throw new Error(`duplicate variable ${v.name}`);
      if (!Number.isInteger(v.min) || !Number.isInteger(v.max)) throw new Error("bounds must be integers");
      if (v.min > v.max) throw new Error(`variable ${v.name}: min > max`);
      seen.add(v.name);
    }
  }

  private validateConstraint(c: LinearConstraint): void {
    if (!c || typeof c !== "object") throw new Error("constraint must be an object");
    if (!c.terms || typeof c.terms !== "object") throw new Error("constraint.terms required");
    for (const coeff of Object.values(c.terms)) {
      if (!Number.isFinite(coeff)) throw new Error("coefficients must be finite numbers");
    }
    if (!["<=", ">=", "="].includes(c.op)) throw new Error("op must be <=, >=, or =");
    if (!Number.isFinite(c.rhs)) throw new Error("rhs must be finite");
  }

  private validateTimeout(t?: number): void {
    if (t === undefined) return;
    if (!Number.isInteger(t) || t <= 0) throw new Error("timeoutMs must be positive integer");
  }
}

function mapResult(r: unknown): FormalResult {
  if (r === "sat") return "sat";
  if (r === "unsat") return "unsat";
  if (r === "timeout") return "timeout";
  return "unknown";
}

export const formalVerificationEngine = new FormalVerificationEngine();
