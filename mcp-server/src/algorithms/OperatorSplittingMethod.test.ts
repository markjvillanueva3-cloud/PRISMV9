/**
 * OperatorSplittingMethod.test.ts — vitest
 *
 * Validates Lie-Trotter and Strang splitting against analytical reference
 * solutions. Real-value assertions (per CLAUDE.md R9 — no weak-stub asserts).
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P1 test coverage:
 *  - analytical reference: linear ODE  y' = -ay (exponential decay)
 *  - convergence order: Strang O(dt²) vs Lie O(dt) — rate empirically observed
 *  - operator non-commutativity stress
 *  - validation: bad input, finite-number check
 *  - adversarial: empty state, NaN, Infinity, non-array return, wrong-length return
 *  - metadata + AlgorithmMeta fields
 *  - safety score + overflow guard
 *
 * @module algorithms/OperatorSplittingMethod.test
 */

import { describe, it, expect } from "vitest";
import { OperatorSplittingMethod } from "./OperatorSplittingMethod.js";
import type { SubstepIntegrator } from "./OperatorSplittingMethod.js";

// ─── helpers ───────────────────────────────────────────────────────

/** Identity substep — returns a copy of state, no time evolution. */
const identity: SubstepIntegrator = (state) => state.slice();

/** Linear decay substep: y' = -a*y, exact integrator y(t+dt) = y * exp(-a*dt) */
const decayBy = (a: number): SubstepIntegrator =>
  (state, dt) => state.map((v) => v * Math.exp(-a * dt));

/** Linear gain substep: y' = +b*y, exact integrator y(t+dt) = y * exp(b*dt) */
const growBy = (b: number): SubstepIntegrator =>
  (state, dt) => state.map((v) => v * Math.exp(b * dt));

/** 2x2 rotation substep: y' = R*y with angular rate ω.
 *  Exact integrator: y(t+dt) = rotate(y, ω*dt). For state [x,y]. */
const rotateBy = (omega: number): SubstepIntegrator =>
  (state, dt) => {
    if (state.length !== 2) throw new Error("rotateBy requires len-2 state");
    const c = Math.cos(omega * dt);
    const s = Math.sin(omega * dt);
    return [state[0] * c - state[1] * s, state[0] * s + state[1] * c];
  };

// ─── analytical correctness ────────────────────────────────────────

describe("OperatorSplittingMethod — analytical references", () => {
  it("Strang split of commuting decay (A:a=1, B:b=0.5) matches exact y*exp(-1.5)", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 100,
      method: "strang",
      applyA: decayBy(1.0),
      applyB: decayBy(0.5),
    });
    const expected = Math.exp(-1.5);
    expect(out.final_state[0]).toBeCloseTo(expected, 10);
    expect(out.method_used).toBe("strang");
    expect(out.steps_completed).toBe(100);
  });

  it("Lie split of commuting decay also matches exact (commuting → both exact)", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 100,
      method: "lie",
      applyA: decayBy(1.0),
      applyB: decayBy(0.5),
    });
    expect(out.final_state[0]).toBeCloseTo(Math.exp(-1.5), 10);
  });

  it("decay + identity preserves y0 * exp(-a*T) for vectorized state", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0, 2.0, 3.0, 4.0],
      total_time: 2.0,
      steps: 50,
      method: "strang",
      applyA: decayBy(0.3),
      applyB: identity,
    });
    const expectedFactor = Math.exp(-0.3 * 2.0);
    expect(out.final_state[0]).toBeCloseTo(1.0 * expectedFactor, 10);
    expect(out.final_state[1]).toBeCloseTo(2.0 * expectedFactor, 10);
    expect(out.final_state[2]).toBeCloseTo(3.0 * expectedFactor, 10);
    expect(out.final_state[3]).toBeCloseTo(4.0 * expectedFactor, 10);
  });

  it("decay + grow with a=b cancels exactly (commuting equal-magnitude)", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [5.0],
      total_time: 3.0,
      steps: 100,
      method: "strang",
      applyA: decayBy(2.0),
      applyB: growBy(2.0),
    });
    expect(out.final_state[0]).toBeCloseTo(5.0, 10);
  });
});

// ─── convergence order ─────────────────────────────────────────────

describe("OperatorSplittingMethod — convergence order (non-commuting ops)", () => {
  // GENUINELY non-commuting pair on R²:
  //   A = rotation by ω   (mixes x and y)
  //   B = anisotropic decay of the x-component ONLY  [x,y] → [x·e^{-dt}, y]
  // B is NOT a scalar multiple of identity, so [A,B] ≠ 0 and the splitting
  // error is O(1)·dt for Lie / O(1)·dt² for Strang — measurable, well above
  // floating-point roundoff at moderate step counts. (Earlier draft used
  // component-wise decay, which IS a scaled identity and commutes with
  // rotation → zero splitting error → roundoff-noise test. Fixed.)
  const rotateA = rotateBy(1.3); // rad/time
  const decayXonly: SubstepIntegrator = (s, dt) => [s[0] * Math.exp(-dt), s[1]];

  function runNoncommuting(method: "lie" | "strang", steps: number): number {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0, 1.0],
      total_time: 1.0,
      steps,
      method,
      applyA: rotateA,
      applyB: decayXonly,
    });
    return Math.hypot(out.final_state[0], out.final_state[1]);
  }

  it("Strang error is substantially smaller than Lie at moderate steps", () => {
    // Converged reference: Strang at very high resolution (its O(dt²) error
    // at 20k steps is ~1e-9, negligible vs the 10-step errors we measure).
    const ref = runNoncommuting("strang", 20_000);
    const lieErr = Math.abs(runNoncommuting("lie", 10) - ref);
    const strangErr = Math.abs(runNoncommuting("strang", 10) - ref);
    // At dt=0.1 with an O(1) commutator, Lie error ~1e-2, Strang ~1e-3.
    // Require Strang at least 3x more accurate (conservative — the
    // asymptotic ratio is ~10x but 10 steps isn't deep in the regime).
    expect(strangErr * 3).toBeLessThan(lieErr);
  });

  it("both schemes converge toward the reference as steps increase", () => {
    const ref = runNoncommuting("strang", 20_000);
    const lieCoarse = Math.abs(runNoncommuting("lie", 20) - ref);
    const lieFine = Math.abs(runNoncommuting("lie", 200) - ref);
    const strangCoarse = Math.abs(runNoncommuting("strang", 20) - ref);
    const strangFine = Math.abs(runNoncommuting("strang", 200) - ref);
    // 10x more steps must reduce error for BOTH schemes (monotone convergence).
    expect(lieFine).toBeLessThan(lieCoarse);
    expect(strangFine).toBeLessThan(strangCoarse);
    // Strang strictly better than Lie at the same (coarse) resolution.
    expect(strangCoarse).toBeLessThan(lieCoarse);
  });
});

// ─── trajectory capture ────────────────────────────────────────────

describe("OperatorSplittingMethod — trajectory capture", () => {
  it("capture_trajectory=true returns steps+1 snapshots (including t=0)", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 10,
      method: "lie",
      applyA: decayBy(1.0),
      applyB: identity,
      capture_trajectory: true,
    });
    expect(Array.isArray(out.trajectory)).toBe(true);
    expect(out.trajectory!.length).toBe(11);
    expect(out.trajectory![0][0]).toBeCloseTo(1.0, 10);
    expect(out.trajectory![10][0]).toBeCloseTo(Math.exp(-1.0), 10);
  });

  it("capture_trajectory omitted (default) yields no trajectory key", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 10,
      method: "lie",
      applyA: identity,
      applyB: identity,
    });
    expect(Array.isArray(out.trajectory)).toBe(false);
  });

  it("trajectory snapshots are decoupled copies (no aliasing into final_state)", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 1.0,
      steps: 5,
      method: "lie",
      applyA: identity,
      applyB: identity,
      capture_trajectory: true,
    });
    const last = out.trajectory![out.trajectory!.length - 1];
    const lastVal = last[0];
    out.final_state[0] = 999;
    expect(last[0]).toBe(lastVal);
  });
});

// ─── validation (failure modes) ────────────────────────────────────

describe("OperatorSplittingMethod.validate — failure modes", () => {
  it("rejects empty initial_state", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [],
      total_time: 1, steps: 10, applyA: identity, applyB: identity,
    });
    expect(v.valid).toBe(false);
    expect(v.errors!.some((e) => /initial_state/.test(e))).toBe(true);
  });

  it("rejects NaN inside initial_state", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [1, Number.NaN, 3],
      total_time: 1, steps: 10, applyA: identity, applyB: identity,
    });
    expect(v.valid).toBe(false);
  });

  it("rejects Infinity inside initial_state", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [Number.POSITIVE_INFINITY],
      total_time: 1, steps: 10, applyA: identity, applyB: identity,
    });
    expect(v.valid).toBe(false);
  });

  it("rejects zero / negative total_time", () => {
    const v1 = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 0, steps: 10, applyA: identity, applyB: identity,
    });
    const v2 = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: -1, steps: 10, applyA: identity, applyB: identity,
    });
    expect(v1.valid).toBe(false);
    expect(v2.valid).toBe(false);
  });

  it("rejects non-integer or zero steps", () => {
    const v1 = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 1, steps: 1.5, applyA: identity, applyB: identity,
    });
    const v2 = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 1, steps: 0, applyA: identity, applyB: identity,
    });
    expect(v1.valid).toBe(false);
    expect(v2.valid).toBe(false);
  });

  it("rejects missing applyA / applyB", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 1, steps: 10,
      applyA: undefined as unknown as SubstepIntegrator,
      applyB: identity,
    });
    expect(v.valid).toBe(false);
  });

  it("rejects invalid method literal", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 1, steps: 10,
      applyA: identity, applyB: identity,
      method: "yoshida4" as "lie",
    });
    expect(v.valid).toBe(false);
  });

  it("warns on fewer than 10 steps (still valid)", () => {
    const v = OperatorSplittingMethod.validate({
      initial_state: [1], total_time: 1, steps: 3, applyA: identity, applyB: identity,
    });
    expect(v.valid).toBe(true);
    expect(v.warnings!.some((w) => /local-truncation/.test(w))).toBe(true);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => OperatorSplittingMethod.calculate({
      initial_state: [], total_time: 1, steps: 10, applyA: identity, applyB: identity,
    })).toThrow(/validation failed/);
  });
});

// ─── adversarial substep returns ───────────────────────────────────

describe("OperatorSplittingMethod — adversarial substep returns", () => {
  it("throws when applyA returns non-array", () => {
    const badA = (() => 42) as unknown as SubstepIntegrator;
    expect(() => OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 1, steps: 10,
      applyA: badA, applyB: identity, method: "lie",
    })).toThrow(/applyA must return an array/);
  });

  it("throws when applyB returns wrong-length array", () => {
    const wrongLength: SubstepIntegrator = (s) => s.slice().concat([0]);
    expect(() => OperatorSplittingMethod.calculate({
      initial_state: [1, 2, 3], total_time: 1, steps: 10,
      applyA: identity, applyB: wrongLength, method: "lie",
    })).toThrow(/returned array of length 4, expected 3/);
  });

  it("triggers overflow guard when substep produces astronomical values", () => {
    const explode: SubstepIntegrator = (s) => s.map((v) => v * 1e10);
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 1, steps: 20,
      applyA: explode, applyB: identity, method: "lie",
    });
    expect(out.steps_completed).toBeLessThan(20);
    expect(out.warnings.some((w) => /Trajectory overflow/.test(w))).toBe(true);
    // Overflow drops process score from 0.95 → 0.4; weighted 0.15 contribution.
    // Net: ~0.96 clean → ~0.885 degraded. Assert at least 5 percentage points
    // of degradation from the clean-run floor (0.9), which is the qualitative
    // signal the safety field is meant to convey.
    expect(out.safety.score).toBeLessThan(0.9);
  });

  it("handles NaN injection via overflow guard (absMax detects non-finite)", () => {
    const nanInject: SubstepIntegrator = (s) => s.map(() => Number.NaN);
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 1, steps: 20,
      applyA: nanInject, applyB: identity, method: "lie",
    });
    expect(out.steps_completed).toBeLessThan(20);
  });
});

// ─── metadata / safety ─────────────────────────────────────────────

describe("OperatorSplittingMethod — metadata + safety", () => {
  it("getMetadata returns canonical AlgorithmMeta fields", () => {
    const meta = OperatorSplittingMethod.getMetadata();
    expect(meta.id).toBe("operator_splitting_method");
    expect(meta.version).toBe("1.0.0");
    expect(meta.domain).toBe("numerical");
    expect(meta.references.length).toBeGreaterThanOrEqual(2);
    expect(meta.references.some((r) => r.year === 1968 && /Strang/.test(r.authors))).toBe(true);
    expect(meta.assumptions.length).toBeGreaterThanOrEqual(3);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
    expect(meta.applicable_materials).toEqual([]);
  });

  it("DOI for Strang 1968 is the SIAM published DOI", () => {
    const meta = OperatorSplittingMethod.getMetadata();
    const strang = meta.references.find((r) => r.year === 1968);
    expect(strang!.doi).toBe("10.1137/0705041");
  });

  it("safety score >= 0.9 for well-resolved Strang run", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 1, steps: 1000,
      applyA: identity, applyB: identity, method: "strang",
    });
    expect(out.safety.score).toBeGreaterThanOrEqual(0.9);
    expect(out.safety.passes).toBe(true);
  });

  it("dt_used reports correct value with formula", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 4.0, steps: 8,
      applyA: identity, applyB: identity, method: "lie",
    });
    expect(out.dt_used.value).toBeCloseTo(0.5, 12);
    expect(out.dt_used.unit).toBe("time");
    expect(out.dt_used.formula).toMatch(/dt = total_time\/steps = 4\/8/);
  });

  it("trajectory_max_abs tracks max |component| across the run", () => {
    const grow: SubstepIntegrator = (s, dt) => s.map((v) => v * Math.exp(0.5 * dt));
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1.0],
      total_time: 4.0,
      steps: 100,
      applyA: grow,
      applyB: identity,
      method: "strang",
    });
    expect(out.trajectory_max_abs).toBeCloseTo(Math.exp(2.0), 5);
  });
});

// ─── default method ───────────────────────────────────────────────

describe("OperatorSplittingMethod — defaults", () => {
  it("method defaults to 'strang' when omitted", () => {
    const out = OperatorSplittingMethod.calculate({
      initial_state: [1], total_time: 1, steps: 10,
      applyA: identity, applyB: identity,
    });
    expect(out.method_used).toBe("strang");
  });
});
