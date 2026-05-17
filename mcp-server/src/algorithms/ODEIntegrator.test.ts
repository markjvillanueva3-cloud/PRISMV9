/**
 * ODEIntegrator.test.ts — vitest
 *
 * Validates explicit Euler + classical RK4 against closed-form solutions,
 * verifies RK4's superior order, and proves the makeSubstepIntegrator
 * adapter composes correctly with OperatorSplittingMethod.
 *
 * Real-value assertions (CLAUDE.md R9 — no weak stubs).
 *
 * @module algorithms/ODEIntegrator.test
 */

import { describe, it, expect } from "vitest";
import { ODEIntegrator, makeSubstepIntegrator } from "./ODEIntegrator.js";
import type { DerivativeFn } from "./ODEIntegrator.js";
import { OperatorSplittingMethod } from "./OperatorSplittingMethod.js";

// ─── reference systems ─────────────────────────────────────────────

/** y' = -λy. Exact: y(t) = y0·exp(-λt). */
const decay = (lambda: number): DerivativeFn => (_t, y) => y.map((v) => -lambda * v);

/** Harmonic oscillator: y'' = -ω²y → state [x, v], x'=v, v'=-ω²x.
 *  Exact: x(t) = x0·cos(ωt) + (v0/ω)·sin(ωt). Energy x²+ (v/ω)² conserved. */
const oscillator = (omega: number): DerivativeFn =>
  (_t, y) => [y[1], -(omega * omega) * y[0]];

/** Non-autonomous: y' = t (exact y(t) = y0 + t²/2). Tests time-dependence. */
const rampSlope: DerivativeFn = (t, _y) => [t];

// ─── analytical correctness ────────────────────────────────────────

describe("ODEIntegrator — analytical references", () => {
  it("RK4 solves y'=-y to machine accuracy (y(1)=e⁻¹)", () => {
    const out = ODEIntegrator.calculate({
      initial_state: [1.0], t0: 0, tf: 1, steps: 100, method: "rk4", f: decay(1.0),
    });
    expect(out.final_state[0]).toBeCloseTo(Math.exp(-1.0), 8);
    expect(out.method_used).toBe("rk4");
    expect(out.steps_completed).toBe(100);
  });

  it("Euler solves y'=-y with O(dt) error (looser tolerance than RK4)", () => {
    const out = ODEIntegrator.calculate({
      initial_state: [1.0], t0: 0, tf: 1, steps: 1000, method: "euler", f: decay(1.0),
    });
    // Euler at 1000 steps: error ~ λ²·dt·exp(-λ)/2 ≈ 1.8e-4
    expect(out.final_state[0]).toBeCloseTo(Math.exp(-1.0), 3);
  });

  it("RK4 integrates non-autonomous y'=t to y(2)=2.0 (y0=0 + 2²/2)", () => {
    const out = ODEIntegrator.calculate({
      initial_state: [0.0], t0: 0, tf: 2, steps: 40, method: "rk4", f: rampSlope,
    });
    expect(out.final_state[0]).toBeCloseTo(2.0, 8); // polynomial → RK4 exact
  });

  it("RK4 conserves harmonic-oscillator amplitude over one period", () => {
    const omega = 2.0;
    const period = (2 * Math.PI) / omega;
    const out = ODEIntegrator.calculate({
      initial_state: [1.0, 0.0], t0: 0, tf: period, steps: 400, method: "rk4",
      f: oscillator(omega),
    });
    // After exactly one period, x ≈ x0 = 1, v ≈ 0
    expect(out.final_state[0]).toBeCloseTo(1.0, 4);
    expect(out.final_state[1]).toBeCloseTo(0.0, 3);
  });

  it("vectorized decay: each component decays independently", () => {
    const out = ODEIntegrator.calculate({
      initial_state: [1, 2, 3], t0: 0, tf: 1, steps: 200, method: "rk4", f: decay(0.5),
    });
    const factor = Math.exp(-0.5);
    expect(out.final_state[0]).toBeCloseTo(1 * factor, 6);
    expect(out.final_state[1]).toBeCloseTo(2 * factor, 6);
    expect(out.final_state[2]).toBeCloseTo(3 * factor, 6);
  });
});

// ─── order of accuracy ─────────────────────────────────────────────

describe("ODEIntegrator — order of accuracy (RK4 ≫ Euler)", () => {
  function errAt(method: "euler" | "rk4", steps: number): number {
    const out = ODEIntegrator.calculate({
      initial_state: [1.0], t0: 0, tf: 1, steps, method, f: decay(1.0),
    });
    return Math.abs(out.final_state[0] - Math.exp(-1.0));
  }

  it("RK4 error is orders of magnitude below Euler at the same step count", () => {
    const eulerErr = errAt("euler", 100);
    const rk4Err = errAt("rk4", 100);
    expect(rk4Err).toBeLessThan(eulerErr / 1000); // RK4 dominates
  });

  it("Euler global error halves when steps double (O(dt) convergence)", () => {
    const e1 = errAt("euler", 500);
    const e2 = errAt("euler", 1000);
    const ratio = e1 / e2;
    expect(ratio).toBeGreaterThan(1.7); // ≈2 for first-order
    expect(ratio).toBeLessThan(2.3);
  });

  it("RK4 error drops ≈16x when steps double (O(dt⁴) convergence)", () => {
    const e1 = errAt("rk4", 20);
    const e2 = errAt("rk4", 40);
    const ratio = e1 / e2;
    expect(ratio).toBeGreaterThan(10); // theoretical 16, leave roundoff headroom
  });
});

// ─── composition with OperatorSplittingMethod ──────────────────────

describe("ODEIntegrator — composition via makeSubstepIntegrator", () => {
  it("makeSubstepIntegrator yields a valid SubstepIntegrator for splitting", () => {
    // Split y' = -y - 0.5y into A:(-y) and B:(-0.5y). Exact: y(1)=exp(-1.5).
    const stepA = makeSubstepIntegrator((y) => y.map((v) => -1.0 * v), "rk4");
    const stepB = makeSubstepIntegrator((y) => y.map((v) => -0.5 * v), "rk4");
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 200,
      method: "strang",
      applyA: stepA,
      applyB: stepB,
    });
    expect(out.final_state[0]).toBeCloseTo(Math.exp(-1.5), 5);
  });

  it("euler-backed substep is less accurate than rk4-backed (visible in split error)", () => {
    const exact = Math.exp(-1.5);
    const eulerA = makeSubstepIntegrator((y) => y.map((v) => -1.0 * v), "euler");
    const eulerB = makeSubstepIntegrator((y) => y.map((v) => -0.5 * v), "euler");
    const rk4A = makeSubstepIntegrator((y) => y.map((v) => -1.0 * v), "rk4");
    const rk4B = makeSubstepIntegrator((y) => y.map((v) => -0.5 * v), "rk4");
    const base = { initial_state: [1.0], total_time: 1.0, steps: 20, method: "strang" as const };
    const eulerOut = OperatorSplittingMethod.calculate({ ...base, applyA: eulerA, applyB: eulerB });
    const rk4Out = OperatorSplittingMethod.calculate({ ...base, applyA: rk4A, applyB: rk4B });
    const eulerErr = Math.abs(eulerOut.final_state[0] - exact);
    const rk4Err = Math.abs(rk4Out.final_state[0] - exact);
    expect(rk4Err).toBeLessThan(eulerErr);
  });

  it("makeSubstepIntegrator defaults to rk4 (one-step value distinguishes RK4 from Euler)", () => {
    const step = makeSubstepIntegrator((y) => y.map((v) => -v));
    const result = step([1.0], 1.0);
    // One RK4 step of y'=-y over dt=1:
    //   k1=-1, k2=-0.5, k3=-0.75, k4=-0.25
    //   y1 = 1 + (1/6)(k1 + 2k2 + 2k3 + k4) = 1 - 0.625 = 0.375
    // (Euler one-step would give 1 + 1·(-1) = 0 — proves rk4 is the default.)
    expect(result[0]).toBeCloseTo(0.375, 12);
    expect(result.length).toBe(1);
  });
});

// ─── validation failure modes ──────────────────────────────────────

describe("ODEIntegrator.validate — failure modes", () => {
  const okF: DerivativeFn = (_t, y) => y.slice();

  it("rejects empty initial_state", () => {
    const v = ODEIntegrator.validate({ initial_state: [], t0: 0, tf: 1, steps: 10, f: okF });
    expect(v.valid).toBe(false);
  });

  it("rejects NaN / Infinity in initial_state", () => {
    expect(ODEIntegrator.validate({ initial_state: [Number.NaN], t0: 0, tf: 1, steps: 10, f: okF }).valid).toBe(false);
    expect(ODEIntegrator.validate({ initial_state: [Number.POSITIVE_INFINITY], t0: 0, tf: 1, steps: 10, f: okF }).valid).toBe(false);
  });

  it("rejects tf <= t0", () => {
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 5, tf: 5, steps: 10, f: okF }).valid).toBe(false);
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 5, tf: 1, steps: 10, f: okF }).valid).toBe(false);
  });

  it("rejects non-finite t0 / tf", () => {
    expect(ODEIntegrator.validate({ initial_state: [1], t0: Number.NaN, tf: 1, steps: 10, f: okF }).valid).toBe(false);
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: Number.POSITIVE_INFINITY, steps: 10, f: okF }).valid).toBe(false);
  });

  it("rejects non-integer / zero steps", () => {
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: 1, steps: 2.5, f: okF }).valid).toBe(false);
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: 1, steps: 0, f: okF }).valid).toBe(false);
  });

  it("rejects missing f and invalid method", () => {
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: 1, steps: 10, f: undefined as unknown as DerivativeFn }).valid).toBe(false);
    expect(ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: 1, steps: 10, f: okF, method: "dopri5" as "rk4" }).valid).toBe(false);
  });

  it("warns on Euler with < 50 steps", () => {
    const v = ODEIntegrator.validate({ initial_state: [1], t0: 0, tf: 1, steps: 10, f: okF, method: "euler" });
    expect(v.valid).toBe(true);
    expect(v.warnings!.some((w) => /Euler/.test(w))).toBe(true);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => ODEIntegrator.calculate({ initial_state: [], t0: 0, tf: 1, steps: 10, f: okF }))
      .toThrow(/validation failed/);
  });
});

// ─── adversarial derivative returns ────────────────────────────────

describe("ODEIntegrator — adversarial derivative", () => {
  it("throws when f returns non-array", () => {
    const badF = (() => 1) as unknown as DerivativeFn;
    expect(() => ODEIntegrator.calculate({
      initial_state: [1], t0: 0, tf: 1, steps: 10, method: "euler", f: badF,
    })).toThrow(/must return an array/);
  });

  it("throws when f returns wrong-length array", () => {
    const badF: DerivativeFn = (_t, y) => y.slice().concat([0]);
    expect(() => ODEIntegrator.calculate({
      initial_state: [1, 2], t0: 0, tf: 1, steps: 10, method: "rk4", f: badF,
    })).toThrow(/returned array of length 3, expected 2/);
  });

  it("overflow guard trips on divergent stiff Euler (large dt)", () => {
    // y' = -1000y with dt=0.1 → |1 + dt·(-1000)| = 99 ≫ 1 → blows up
    const stiff: DerivativeFn = (_t, y) => y.map((v) => -1000 * v);
    const out = ODEIntegrator.calculate({
      initial_state: [1.0], t0: 0, tf: 1, steps: 10, method: "euler", f: stiff,
    });
    expect(out.steps_completed).toBeLessThan(10);
    expect(out.warnings.some((w) => /Trajectory overflow/.test(w))).toBe(true);
    expect(out.safety.score).toBeLessThan(0.9);
  });

  it("NaN-producing f trips overflow guard (absMax non-finite detection)", () => {
    const nanF: DerivativeFn = (_t, y) => y.map(() => Number.NaN);
    const out = ODEIntegrator.calculate({
      initial_state: [1], t0: 0, tf: 1, steps: 10, method: "euler", f: nanF,
    });
    expect(out.steps_completed).toBeLessThan(10);
  });
});

// ─── trajectory + metadata ─────────────────────────────────────────

describe("ODEIntegrator — trajectory + metadata", () => {
  it("capture_trajectory returns steps+1 snapshots, decoupled from final_state", () => {
    const out = ODEIntegrator.calculate({
      initial_state: [1.0], t0: 0, tf: 1, steps: 8, method: "rk4",
      f: decay(1.0), capture_trajectory: true,
    });
    expect(Array.isArray(out.trajectory)).toBe(true);
    expect(out.trajectory!.length).toBe(9);
    const last = out.trajectory![8];
    const lastVal = last[0];
    out.final_state[0] = -999;
    expect(last[0]).toBe(lastVal);
  });

  it("default method is rk4", () => {
    const out = ODEIntegrator.calculate({ initial_state: [1], t0: 0, tf: 1, steps: 50, f: decay(1.0) });
    expect(out.method_used).toBe("rk4");
  });

  it("dt_used reports (tf-t0)/steps with formula", () => {
    const out = ODEIntegrator.calculate({ initial_state: [1], t0: 1, tf: 5, steps: 8, f: decay(1.0) });
    expect(out.dt_used.value).toBeCloseTo(0.5, 12);
    expect(out.dt_used.formula).toMatch(/\(5 - 1\)\/8/);
  });

  it("getMetadata cites Hairer + Butcher with DOIs", () => {
    const meta = ODEIntegrator.getMetadata();
    expect(meta.id).toBe("ode_integrator");
    expect(meta.domain).toBe("numerical");
    expect(meta.references.length).toBe(2);
    expect(meta.references.some((r) => /Hairer/.test(r.authors) && r.doi)).toBe(true);
    expect(meta.references.some((r) => /Butcher/.test(r.authors) && r.doi === "10.1002/9781119121534")).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
  });

  it("safety score high for well-resolved RK4 run", () => {
    const out = ODEIntegrator.calculate({ initial_state: [1], t0: 0, tf: 1, steps: 500, method: "rk4", f: decay(1.0) });
    expect(out.safety.score).toBeGreaterThanOrEqual(0.9);
    expect(out.safety.passes).toBe(true);
  });
});
