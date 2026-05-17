/**
 * GradientDescent.test.ts — vitest
 *
 * Real analytical optima (CLAUDE.md R9 — no weak stubs):
 *  - quadratic bowl f=Σxᵢ² → minimum at origin, f*=0
 *  - shifted quadratic → minimum at the shift
 *  - Rosenbrock (banana valley) → minimum at (1,1) with momentum/Adam
 *  - numerical (central-FD) gradient agrees with analytic to O(h²)
 *  - method comparison: Adam/momentum beat vanilla on ill-conditioned
 *  - divergence guard fires on too-large learning rate
 *  - validation + adversarial
 *
 * @module algorithms/GradientDescent.test
 */

import { describe, it, expect } from "vitest";
import { GradientDescent } from "./GradientDescent.js";
import type { ObjectiveFn, GradientFn } from "./GradientDescent.js";

// ─── reference objectives ──────────────────────────────────────────

const bowl: ObjectiveFn = (x) => x.reduce((a, v) => a + v * v, 0);
const bowlGrad: GradientFn = (x) => x.map((v) => 2 * v);

const shifted = (c: readonly number[]): ObjectiveFn =>
  (x) => x.reduce((a, v, i) => a + (v - c[i]) ** 2, 0);

// Rosenbrock: f = (1-x)² + 100(y-x²)²,  min at (1,1), f*=0
const rosenbrock: ObjectiveFn = (p) => {
  const [x, y] = p;
  return (1 - x) ** 2 + 100 * (y - x * x) ** 2;
};
const rosenbrockGrad: GradientFn = (p) => {
  const [x, y] = p;
  return [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)];
};

// ─── convergence to known optima ───────────────────────────────────

describe("GradientDescent — analytical optima", () => {
  it("vanilla GD on quadratic bowl converges to origin (analytic gradient)", () => {
    const out = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [3, -4, 5],
      learning_rate: 0.1, max_iters: 500, method: "vanilla", tol: 1e-8,
    });
    expect(out.converged).toBe(true);
    expect(out.diverged).toBe(false);
    for (const xi of out.x_opt) expect(xi).toBeCloseTo(0, 4);
    expect(out.f_opt.value).toBeCloseTo(0, 8);
  });

  it("shifted quadratic converges to the shift point (3, -2, 7)", () => {
    const c = [3, -2, 7];
    const out = GradientDescent.calculate({
      f: shifted(c), x0: [0, 0, 0],
      learning_rate: 0.05, max_iters: 2000, method: "adam", tol: 1e-7,
    });
    expect(out.x_opt[0]).toBeCloseTo(3, 3);
    expect(out.x_opt[1]).toBeCloseTo(-2, 3);
    expect(out.x_opt[2]).toBeCloseTo(7, 3);
  });

  it("Adam solves Rosenbrock to near (1,1) (ill-conditioned valley)", () => {
    const out = GradientDescent.calculate({
      f: rosenbrock, gradF: rosenbrockGrad, x0: [-1.2, 1.0],
      learning_rate: 2e-3, max_iters: 200_000, method: "adam", tol: 1e-6,
    });
    expect(out.x_opt[0]).toBeCloseTo(1.0, 1);
    expect(out.x_opt[1]).toBeCloseTo(1.0, 1);
    expect(out.f_opt.value).toBeLessThan(1e-2);
  });

  it("momentum beats vanilla on an ILL-CONDITIONED quadratic (where it actually helps)", () => {
    // f = 100·x² + y² — condition number 100. Vanilla GD zig-zags badly in
    // the steep direction; heavy-ball momentum damps the oscillation and
    // converges in far fewer iters. (On an ISOTROPIC bowl momentum would
    // overshoot and be SLOWER — that earlier test premise was wrong; this
    // is the regime where the momentum advantage is real.)
    const illF: ObjectiveFn = (p) => 100 * p[0] ** 2 + p[1] ** 2;
    const illG: GradientFn = (p) => [200 * p[0], 2 * p[1]];
    const base = { f: illF, gradF: illG, x0: [1, 1], learning_rate: 4e-3, max_iters: 20_000, tol: 1e-7 } as const;
    const van = GradientDescent.calculate({ ...base, method: "vanilla" });
    const mom = GradientDescent.calculate({ ...base, method: "momentum", momentum: 0.9 });
    expect(van.converged).toBe(true);
    expect(mom.converged).toBe(true);
    expect(mom.iterations).toBeLessThan(van.iterations);
  });
});

// ─── numerical vs analytic gradient ────────────────────────────────

describe("GradientDescent — numerical-gradient fallback", () => {
  it("central-FD gradient (no gradF) converges to same optimum as analytic", () => {
    const analytic = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [2, -3], learning_rate: 0.1, max_iters: 1000, tol: 1e-8, method: "vanilla",
    });
    const numeric = GradientDescent.calculate({
      f: bowl, x0: [2, -3], learning_rate: 0.1, max_iters: 1000, tol: 1e-8, method: "vanilla",
    });
    expect(numeric.converged).toBe(true);
    expect(numeric.x_opt[0]).toBeCloseTo(analytic.x_opt[0], 4);
    expect(numeric.x_opt[1]).toBeCloseTo(analytic.x_opt[1], 4);
  });

  it("numerical gradient on shifted bowl finds the shift without analytic grad", () => {
    const out = GradientDescent.calculate({
      f: shifted([1.5, -2.5]), x0: [0, 0],
      learning_rate: 0.1, max_iters: 1000, method: "vanilla", tol: 1e-7,
    });
    expect(out.x_opt[0]).toBeCloseTo(1.5, 3);
    expect(out.x_opt[1]).toBeCloseTo(-2.5, 3);
  });
});

// ─── divergence guard ──────────────────────────────────────────────

describe("GradientDescent — divergence guard (fail-loud)", () => {
  it("too-large learning rate on bowl diverges and is flagged, not silently wrong", () => {
    const out = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [1, 1],
      learning_rate: 5.0, max_iters: 100, method: "vanilla", // α=5 ≫ 1/L=0.5 → blow up
    });
    expect(out.diverged).toBe(true);
    expect(out.converged).toBe(false);
    expect(out.warnings.some((w) => /Diverged/.test(w))).toBe(true);
    // Safety weighting: physics(0.35)+material(0.25) are both 1.0 for a pure
    // numerical primitive (no physical applicability to fail), so even a
    // diverged run floors at ~0.86 (process 0.3·0.15 + range 0.85·0.25).
    // The signal is the GAP from a converged run (~0.98), not an absolute
    // low number. Assert meaningful degradation + the explicit diverged flag.
    expect(out.safety.score).toBeLessThan(0.9);
    expect(out.diverged).toBe(true); // the load-bearing fail-loud signal
  });

  it("does NOT converge (but does not diverge) when max_iters too small", () => {
    const out = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [100, 100],
      learning_rate: 1e-4, max_iters: 5, method: "vanilla", tol: 1e-9,
    });
    expect(out.converged).toBe(false);
    expect(out.diverged).toBe(false);
    expect(out.iterations).toBe(5);
  });
});

// ─── history + metadata ────────────────────────────────────────────

describe("GradientDescent — history + metadata", () => {
  it("capture_history records a monotone-ish decreasing ‖∇f‖∞ trail", () => {
    const out = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [5, 5],
      learning_rate: 0.1, max_iters: 200, method: "vanilla", tol: 1e-9,
      capture_history: true,
    });
    expect(Array.isArray(out.grad_norm_history)).toBe(true);
    expect(out.grad_norm_history!.length).toBe(out.iterations);
    // first grad norm strictly larger than last (descent made progress)
    const h = out.grad_norm_history!;
    expect(h[0]).toBeGreaterThan(h[h.length - 1]);
  });

  it("getMetadata cites Adam (Kingma&Ba 2015) + Nocedal&Wright, optimization domain", () => {
    const meta = GradientDescent.getMetadata();
    expect(meta.id).toBe("gradient_descent");
    expect(meta.domain).toBe("optimization");
    expect(meta.references.some((r) => /Kingma/.test(r.authors) && r.year === 2015)).toBe(true);
    expect(meta.references.some((r) => /Nocedal/.test(r.authors) && r.doi === "10.1007/978-0-387-40065-5")).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
  });

  it("default method is adam", () => {
    const out = GradientDescent.calculate({
      f: bowl, gradF: bowlGrad, x0: [1], learning_rate: 0.1, max_iters: 500, tol: 1e-7,
    });
    expect(out.method_used).toBe("adam");
  });
});

// ─── validation + adversarial ──────────────────────────────────────

describe("GradientDescent.validate — failure modes", () => {
  it("rejects missing f / non-function gradF", () => {
    expect(GradientDescent.validate({
      f: undefined as unknown as ObjectiveFn, x0: [1], learning_rate: 0.1, max_iters: 10,
    }).valid).toBe(false);
    expect(GradientDescent.validate({
      f: bowl, gradF: 5 as unknown as GradientFn, x0: [1], learning_rate: 0.1, max_iters: 10,
    }).valid).toBe(false);
  });

  it("rejects empty / non-finite x0", () => {
    expect(GradientDescent.validate({ f: bowl, x0: [], learning_rate: 0.1, max_iters: 10 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [Number.NaN], learning_rate: 0.1, max_iters: 10 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [Number.POSITIVE_INFINITY], learning_rate: 0.1, max_iters: 10 }).valid).toBe(false);
  });

  it("rejects non-positive learning_rate and non-integer max_iters", () => {
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: 0, max_iters: 10 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: -1, max_iters: 10 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: 0.1, max_iters: 2.5 }).valid).toBe(false);
  });

  it("rejects momentum outside [0,1) and bad method", () => {
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: 0.1, max_iters: 10, momentum: 1.0 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: 0.1, max_iters: 10, momentum: -0.1 }).valid).toBe(false);
    expect(GradientDescent.validate({ f: bowl, x0: [1], learning_rate: 0.1, max_iters: 10, method: "lbfgs" as "adam" }).valid).toBe(false);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => GradientDescent.calculate({
      f: bowl, x0: [], learning_rate: 0.1, max_iters: 10,
    })).toThrow(/validation failed/);
  });

  it("throws when supplied gradF returns wrong-length vector", () => {
    const badGrad = ((x: readonly number[]) => x.slice().concat([0])) as GradientFn;
    expect(() => GradientDescent.calculate({
      f: bowl, gradF: badGrad, x0: [1, 2], learning_rate: 0.1, max_iters: 10, method: "vanilla",
    })).toThrow(/gradient must return an array of length 2/);
  });
});
