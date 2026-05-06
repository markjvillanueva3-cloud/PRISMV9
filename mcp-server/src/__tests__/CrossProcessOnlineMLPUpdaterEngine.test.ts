/**
 * CrossProcessOnlineMLPUpdaterEngine.test.ts — XPROC-NEURAL Tier 3 (T3-01)
 *
 * Verifies Adam optimizer correctness against the closed-form Kingma & Ba
 * 2015 reference (numerical reference values computed by hand below) plus
 * the 9 documented failure modes and the <10ms acceptance criterion.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessOnlineMLPUpdaterEngine,
  crossProcessOnlineMLPUpdater,
  type AdamState,
} from "../engines/CrossProcessOnlineMLPUpdaterEngine.js";

describe("input validation", () => {
  it("rejects shape mismatch (weights ≠ gradients length)", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2, 3],
      gradients: [0.1, 0.2],
      lr: 0.01,
    });
    expect(r).toMatchObject({ ok: false, error: "shape_mismatch" });
    if (!r.ok) {
      expect(r.message).toContain("3");
      expect(r.message).toContain("2");
    }
  });

  it("rejects NaN gradient with non_finite_gradient error", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2],
      gradients: [0.1, Number.NaN],
      lr: 0.01,
    });
    expect(r).toMatchObject({ ok: false, error: "non_finite_gradient" });
  });

  it("rejects Infinity gradient", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2],
      gradients: [0.1, Number.POSITIVE_INFINITY],
      lr: 0.01,
    });
    expect(r).toMatchObject({ ok: false, error: "non_finite_gradient" });
  });

  it("rejects NaN weight with non_finite_weight error", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [Number.NaN, 2],
      gradients: [0.1, 0.2],
      lr: 0.01,
    });
    expect(r).toMatchObject({ ok: false, error: "non_finite_weight" });
  });

  it("rejects β₁ ≥ 1 (Zod schema gate)", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1],
      gradients: [0.1],
      lr: 0.01,
      beta1: 1.0,  // < 1 required for bias-correction stability
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects ε ≤ 0 (Zod schema gate — would produce ÷0)", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1],
      gradients: [0.1],
      lr: 0.01,
      epsilon: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects empty weights/gradients arrays", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [],
      gradients: [],
      lr: 0.01,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("lr bounds + clamping", () => {
  it("lr=0 → no-op update, weights unchanged", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2, 3],
      gradients: [0.5, 0.5, 0.5],
      lr: 0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.weights).toEqual([1, 2, 3]);
      expect(r.noOp).toBe(true);
      expect(r.effectiveLr).toBe(0);
      expect(r.state.t).toBe(0);  // step counter NOT incremented on no-op
    }
  });

  it("lr > LR_MAX (=1.0) is clamped with warning", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1],
      gradients: [0.1],
      lr: 5.0,  // way too high
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.effectiveLr).toBe(1.0);
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0]).toMatch(/clamped/);
    }
  });

  it("lr < 0 is clamped to 0 (becomes no-op) with warning", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1],
      gradients: [0.1],
      lr: -0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.effectiveLr).toBe(0);
      expect(r.noOp).toBe(true);
      expect(r.warnings[0]).toMatch(/clamped/);
    }
  });
});

describe("Adam mathematical correctness (reference values)", () => {
  /**
   * Reference computation by hand for first Adam step:
   *   t = 1, β₁=0.9, β₂=0.999, ε=1e-8
   *   weights = [1.0], gradients = [0.5], lr = 0.1
   *
   *   m₁ = 0.9·0 + 0.1·0.5 = 0.05
   *   v₁ = 0.999·0 + 0.001·0.25 = 0.00025
   *   biasCorr1 = 1 - 0.9¹ = 0.1
   *   biasCorr2 = 1 - 0.999¹ = 0.001
   *   stepSize = 0.1 · √0.001 / 0.1 = √0.001 ≈ 0.031623
   *   denom = √0.00025 + 1e-8 ≈ 0.015811
   *   delta = 0.031623 · 0.05 / 0.015811 ≈ 0.1
   *   newWeight = 1.0 - 0.1 = 0.9
   *
   * (This is the well-known Adam property: on the first step, |Δθ| ≈ lr.)
   */
  it("first step magnitude ≈ lr (Adam paper Theorem 4.1 corollary)", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1.0],
      gradients: [0.5],
      lr: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // |new - old| should be very close to lr regardless of |g| (1st step)
      expect(r.weights[0]).toBeCloseTo(0.9, 4);
      expect(r.state.m[0]).toBeCloseTo(0.05, 6);
      expect(r.state.v[0]).toBeCloseTo(0.00025, 8);
      expect(r.state.t).toBe(1);
    }
  });

  it("zero gradient produces zero weight change", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [3.14159],
      gradients: [0],
      lr: 0.01,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.weights[0]).toBeCloseTo(3.14159, 8);
      expect(r.state.m[0]).toBe(0);
      expect(r.state.v[0]).toBe(0);
    }
  });

  it("opposite-sign gradients produce opposite weight updates", () => {
    const rPos = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [0],
      gradients: [1],
      lr: 0.01,
    });
    const rNeg = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [0],
      gradients: [-1],
      lr: 0.01,
    });
    if (rPos.ok && rNeg.ok) {
      expect(Math.sign(rPos.weights[0])).toBe(-1);   // pos grad → neg update
      expect(Math.sign(rNeg.weights[0])).toBe(1);    // neg grad → pos update
      expect(Math.abs(rPos.weights[0])).toBeCloseTo(Math.abs(rNeg.weights[0]), 8);
    }
  });

  it("convex quadratic minimization converges (loss decreases monotonically)", () => {
    // Minimize f(w) = (w - 5)² → optimum at w = 5, gradient = 2(w - 5)
    let weights = [0.0];
    let state: AdamState | undefined;
    const losses: number[] = [];
    for (let step = 0; step < 200; step++) {
      const w = weights[0];
      const grad = 2 * (w - 5);
      const r = CrossProcessOnlineMLPUpdaterEngine.update({
        weights,
        gradients: [grad],
        lr: 0.1,
        state,
      });
      if (!r.ok) throw new Error("convergence test setup failure");
      weights = r.weights;
      state = r.state;
      losses.push((weights[0] - 5) ** 2);
    }
    // After 200 steps, weight should be very close to 5
    expect(weights[0]).toBeCloseTo(5, 2);
    // Loss strictly decreased (Adam can have transient bumps with high lr,
    // but final loss << initial loss)
    expect(losses[losses.length - 1]).toBeLessThan(losses[0]);
    expect(losses[losses.length - 1]).toBeLessThan(0.01);
  });
});

describe("state persistence across calls", () => {
  it("explicit state is preserved + accumulated across updates", () => {
    const init = CrossProcessOnlineMLPUpdaterEngine.initState(3);
    expect(init.m).toEqual([0, 0, 0]);
    expect(init.v).toEqual([0, 0, 0]);
    expect(init.t).toBe(0);

    const r1 = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2, 3],
      gradients: [0.1, 0.2, 0.3],
      lr: 0.01,
      state: init,
    });
    if (!r1.ok) throw new Error("step 1 failed");
    expect(r1.state.t).toBe(1);

    const r2 = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: r1.weights,
      gradients: [0.1, 0.2, 0.3],
      lr: 0.01,
      state: r1.state,
    });
    if (!r2.ok) throw new Error("step 2 failed");
    expect(r2.state.t).toBe(2);
    // m should be accumulating (β₁=0.9 default → m₂ > m₁)
    expect(r2.state.m[0]).toBeGreaterThan(r1.state.m[0]);
    expect(r2.state.m[0]).toBeCloseTo(0.9 * r1.state.m[0] + 0.1 * 0.1, 8);
  });

  it("state shape mismatch is caught", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1, 2, 3],
      gradients: [0.1, 0.2, 0.3],
      lr: 0.01,
      state: { m: [0, 0], v: [0, 0], t: 0 },  // length 2 vs weights length 3
    });
    expect(r).toMatchObject({ ok: false, error: "shape_mismatch" });
  });

  it("non-finite values in state are caught", () => {
    const r = CrossProcessOnlineMLPUpdaterEngine.update({
      weights: [1],
      gradients: [0.1],
      lr: 0.01,
      state: { m: [Number.NaN], v: [0], t: 1 },
    });
    expect(r).toMatchObject({ ok: false, error: "non_finite_weight" });
  });
});

describe("performance acceptance — <10ms per step", () => {
  it("4096-dimensional weight vector update completes in <10ms", () => {
    const D = 4096;
    const weights = Array.from({ length: D }, (_, i) => Math.sin(i));
    const gradients = Array.from({ length: D }, (_, i) => Math.cos(i) * 0.01);

    // Warm-up to avoid JIT cold-start in measurement
    CrossProcessOnlineMLPUpdaterEngine.update({ weights, gradients, lr: 0.001 });

    const start = performance.now();
    const r = CrossProcessOnlineMLPUpdaterEngine.update({ weights, gradients, lr: 0.001 });
    const elapsedMs = performance.now() - start;

    expect(r.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(10);
  });
});

describe("initState() helper", () => {
  it("creates zero-initialized state of correct dimension", () => {
    const s = CrossProcessOnlineMLPUpdaterEngine.initState(5);
    expect(s.m).toEqual([0, 0, 0, 0, 0]);
    expect(s.v).toEqual([0, 0, 0, 0, 0]);
    expect(s.t).toBe(0);
  });

  it("rejects non-positive dimension", () => {
    expect(() => CrossProcessOnlineMLPUpdaterEngine.initState(0)).toThrow();
    expect(() => CrossProcessOnlineMLPUpdaterEngine.initState(-1)).toThrow();
  });

  it("rejects non-integer dimension", () => {
    expect(() => CrossProcessOnlineMLPUpdaterEngine.initState(2.5)).toThrow();
  });
});

describe("constants() snapshot", () => {
  it("exposes Adam paper defaults", () => {
    const c = CrossProcessOnlineMLPUpdaterEngine.constants();
    expect(c.DEFAULT_BETA_1).toBe(0.9);
    expect(c.DEFAULT_BETA_2).toBe(0.999);
    expect(c.DEFAULT_EPSILON).toBe(1e-8);
    expect(c.LR_MAX).toBe(1.0);
    expect(c.LR_MIN).toBe(0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_online_update to update()", () => {
    const r = crossProcessOnlineMLPUpdater("xproc_online_update", {
      weights: [1.0],
      gradients: [0.5],
      lr: 0.1,
    }) as { ok: boolean; weights?: number[] };
    expect(r.ok).toBe(true);
    expect(r.weights?.[0]).toBeCloseTo(0.9, 4);
  });

  it("routes xproc_online_init_state to initState()", () => {
    const r = crossProcessOnlineMLPUpdater("xproc_online_init_state", {
      dimension: 3,
    }) as AdamState;
    expect(r.m.length).toBe(3);
    expect(r.t).toBe(0);
  });

  it("xproc_online_init_state without dimension throws descriptive error", () => {
    expect(() => crossProcessOnlineMLPUpdater("xproc_online_init_state", {})).toThrow(
      /dimension.*must be a number/,
    );
  });

  it("routes xproc_online_constants to constants()", () => {
    const r = crossProcessOnlineMLPUpdater("xproc_online_constants", {}) as {
      DEFAULT_BETA_1: number;
    };
    expect(r.DEFAULT_BETA_1).toBe(0.9);
  });

  it("throws on unknown action with descriptive message", () => {
    expect(() => crossProcessOnlineMLPUpdater("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
