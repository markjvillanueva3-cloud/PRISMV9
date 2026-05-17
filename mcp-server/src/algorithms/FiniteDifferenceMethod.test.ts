/**
 * FiniteDifferenceMethod.test.ts — vitest
 *
 * Analytical references (CLAUDE.md R9 — no weak stubs):
 *  - d/dx sin(x) ≈ cos(x); d²/dx² sin(x) ≈ -sin(x) (2nd-order central)
 *  - convergence: central 2nd-deriv error ~ O(dx²)
 *  - boundary conditions: periodic exactness, Neumann zero-gradient,
 *    Dirichlet fixed-value
 *  - method-of-lines heat equation: Fourier mode decays at exp(-D k² t)
 *    when integrated through ODEIntegrator (PDE-suite composition)
 *  - validation + adversarial
 *
 * @module algorithms/FiniteDifferenceMethod.test
 */

import { describe, it, expect } from "vitest";
import {
  FiniteDifferenceMethod,
  makeMethodOfLinesRHS,
  type BoundaryCondition,
} from "./FiniteDifferenceMethod.js";
import { ODEIntegrator } from "./ODEIntegrator.js";

// grid helper: sample fn on [0, L) with N points, spacing dx = L/N (periodic-friendly)
function grid(fn: (x: number) => number, N: number, L: number): { field: number[]; dx: number } {
  const dx = L / N;
  const field = Array.from({ length: N }, (_, i) => fn(i * dx));
  return { field, dx };
}

// ─── derivative accuracy ───────────────────────────────────────────

describe("FiniteDifferenceMethod — derivative accuracy", () => {
  it("central 2nd derivative of sin(x) ≈ -sin(x) on a periodic grid", () => {
    const N = 200;
    const L = 2 * Math.PI;
    const { field, dx } = grid(Math.sin, N, L);
    const out = FiniteDifferenceMethod.calculate({
      field, dx, operation: "second_derivative", bc: { kind: "periodic" },
    });
    // interior + periodic ends: u'' ≈ -sin(x). Check several nodes.
    for (const i of [10, 50, 100, 150]) {
      expect(out.result[i]).toBeCloseTo(-field[i], 3);
    }
  });

  it("central 1st derivative of sin(x) ≈ cos(x)", () => {
    const N = 400;
    const L = 2 * Math.PI;
    const { field, dx } = grid(Math.sin, N, L);
    const out = FiniteDifferenceMethod.calculate({
      field, dx, operation: "first_derivative", scheme: "central", bc: { kind: "periodic" },
    });
    for (const i of [25, 100, 250]) {
      expect(out.result[i]).toBeCloseTo(Math.cos(i * dx), 3);
    }
  });

  it("central 2nd-derivative error shrinks ≈4x when dx halves (O(dx²))", () => {
    const L = 2 * Math.PI;
    const mid = (N: number): number => {
      const { field, dx } = grid(Math.sin, N, L);
      const out = FiniteDifferenceMethod.calculate({
        field, dx, operation: "second_derivative", bc: { kind: "periodic" },
      });
      const i = Math.floor(N / 4); // x ≈ π/2, -sin = -1
      return Math.abs(out.result[i] - -field[i]);
    };
    const eCoarse = mid(100);
    const eFine = mid(200);
    expect(eCoarse / eFine).toBeGreaterThan(3.5); // ≈4 for 2nd order
  });

  it("forward vs central: forward is O(dx), central O(dx²) — central more accurate", () => {
    const N = 100;
    const L = 2 * Math.PI;
    const { field, dx } = grid(Math.sin, N, L);
    const fwd = FiniteDifferenceMethod.calculate({
      field, dx, operation: "first_derivative", scheme: "forward", bc: { kind: "periodic" },
    });
    const ctr = FiniteDifferenceMethod.calculate({
      field, dx, operation: "first_derivative", scheme: "central", bc: { kind: "periodic" },
    });
    const i = 30;
    const exact = Math.cos(i * dx);
    expect(Math.abs(ctr.result[i] - exact)).toBeLessThan(Math.abs(fwd.result[i] - exact));
  });
});

// ─── boundary conditions ───────────────────────────────────────────

describe("FiniteDifferenceMethod — boundary conditions", () => {
  it("Dirichlet bc holds the prescribed end values for the 2nd-derivative stencil", () => {
    // Linear field u=x has u''=0 everywhere including with correct dirichlet ghosts
    const field = [0, 1, 2, 3, 4];
    const out = FiniteDifferenceMethod.calculate({
      field, dx: 1, operation: "second_derivative",
      bc: { kind: "dirichlet", left: 0, right: 4 },
    });
    // u=x is linear → u'' = 0 everywhere (ghost = 2*bv - u[1] keeps linearity)
    for (const v of out.result) expect(v).toBeCloseTo(0, 9);
  });

  it("Neumann bc gives zero gradient at the ends (central 1st deriv ~0 at boundary)", () => {
    // Symmetric field → zero-gradient reflective ghost → boundary deriv 0
    const field = [1, 2, 3, 2, 1];
    const out = FiniteDifferenceMethod.calculate({
      field, dx: 1, operation: "first_derivative", scheme: "central",
      bc: { kind: "neumann" },
    });
    expect(out.result[0]).toBeCloseTo(0, 9); // (u[1]-uL)/2 with uL=u[1] → 0
    expect(out.result[4]).toBeCloseTo(0, 9);
  });

  it("periodic bc wraps: derivative of a constant field is exactly zero", () => {
    const field = [5, 5, 5, 5, 5];
    const out = FiniteDifferenceMethod.calculate({
      field, dx: 0.5, operation: "second_derivative", bc: { kind: "periodic" },
    });
    for (const v of out.result) expect(v).toBe(0);
  });
});

// ─── method-of-lines composition with ODEIntegrator ────────────────

describe("FiniteDifferenceMethod — heat equation via method-of-lines + ODEIntegrator", () => {
  it("Fourier mode sin(kx) decays at exp(-D·k²·t) (heat equation analytic)", () => {
    // Domain [0,2π), periodic. u0 = sin(x) (k=1). Heat eq ∂u/∂t = D u_xx.
    // Analytic: u(x,t) = exp(-D·k²·t)·sin(x). At t=T, amplitude = exp(-D·T).
    const N = 128;
    const L = 2 * Math.PI;
    const D = 0.05;
    const T = 2.0;
    const { field: u0, dx } = grid(Math.sin, N, L);
    const f = makeMethodOfLinesRHS({ dx, diffusivity: D, bc: { kind: "periodic" } });
    const sol = ODEIntegrator.calculate({
      initial_state: u0,
      t0: 0,
      tf: T,
      steps: 4000, // small dt for explicit-RK4 diffusion stability
      method: "rk4",
      f,
    });
    const expectedAmp = Math.exp(-D * 1 * 1 * T); // k=1
    // peak of sin is at index N/4 (x=π/2)
    const peak = Math.floor(N / 4);
    expect(sol.final_state[peak]).toBeCloseTo(expectedAmp, 2);
    // shape stays sinusoidal: trough at 3N/4 ≈ -expectedAmp
    const trough = Math.floor((3 * N) / 4);
    expect(sol.final_state[trough]).toBeCloseTo(-expectedAmp, 2);
  });

  it("pure advection (D=0, v>0) translates a bump without changing its integral", () => {
    const N = 200;
    const L = 10;
    const v = 1.0;
    const T = 1.0;
    const { field: u0, dx } = grid((x) => Math.exp(-((x - 5) ** 2)), N, L);
    const sum0 = u0.reduce((a, b) => a + b, 0);
    const f = makeMethodOfLinesRHS({ dx, advection_velocity: v, bc: { kind: "periodic" } });
    const sol = ODEIntegrator.calculate({
      initial_state: u0, t0: 0, tf: T, steps: 2000, method: "rk4", f,
    });
    const sumT = sol.final_state.reduce((a, b) => a + b, 0);
    // Central-difference advection conserves the discrete sum (periodic) to roundoff
    expect(sumT).toBeCloseTo(sum0, 4);
  });
});

// ─── validation + adversarial ──────────────────────────────────────

describe("FiniteDifferenceMethod.validate — failure modes", () => {
  it("rejects field shorter than 3", () => {
    const v = FiniteDifferenceMethod.validate({ field: [1, 2], dx: 1, operation: "second_derivative" });
    expect(v.valid).toBe(false);
  });

  it("rejects non-positive dx", () => {
    expect(FiniteDifferenceMethod.validate({ field: [1, 2, 3], dx: 0, operation: "first_derivative" }).valid).toBe(false);
    expect(FiniteDifferenceMethod.validate({ field: [1, 2, 3], dx: -1, operation: "first_derivative" }).valid).toBe(false);
  });

  it("rejects non-finite field entries", () => {
    const v = FiniteDifferenceMethod.validate({ field: [1, Number.NaN, 3], dx: 1, operation: "second_derivative" });
    expect(v.valid).toBe(false);
  });

  it("rejects unknown operation / scheme / bc kind", () => {
    expect(FiniteDifferenceMethod.validate({ field: [1, 2, 3], dx: 1, operation: "curl" as "first_derivative" }).valid).toBe(false);
    expect(FiniteDifferenceMethod.validate({ field: [1, 2, 3], dx: 1, operation: "first_derivative", scheme: "spectral" as "central" }).valid).toBe(false);
    expect(FiniteDifferenceMethod.validate({ field: [1, 2, 3], dx: 1, operation: "first_derivative", bc: { kind: "robin" } as unknown as BoundaryCondition }).valid).toBe(false);
  });

  it("rejects negative diffusivity / non-finite advection for method_of_lines", () => {
    expect(FiniteDifferenceMethod.validate({
      field: [1, 2, 3], dx: 1, operation: "method_of_lines_rhs", diffusivity: -1,
    }).valid).toBe(false);
    expect(FiniteDifferenceMethod.validate({
      field: [1, 2, 3], dx: 1, operation: "method_of_lines_rhs", advection_velocity: Number.POSITIVE_INFINITY,
    }).valid).toBe(false);
  });

  it("warns on D=0 v=0 method-of-lines (zero RHS)", () => {
    const v = FiniteDifferenceMethod.validate({
      field: [1, 2, 3], dx: 1, operation: "method_of_lines_rhs", diffusivity: 0, advection_velocity: 0,
    });
    expect(v.valid).toBe(true);
    expect(v.warnings!.some((w) => /zero RHS/.test(w))).toBe(true);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => FiniteDifferenceMethod.calculate({ field: [1], dx: 1, operation: "first_derivative" }))
      .toThrow(/validation failed/);
  });
});

// ─── metadata ──────────────────────────────────────────────────────

describe("FiniteDifferenceMethod — metadata", () => {
  it("getMetadata cites LeVeque + Strikwerda, numerical domain", () => {
    const meta = FiniteDifferenceMethod.getMetadata();
    expect(meta.id).toBe("finite_difference_method");
    expect(meta.domain).toBe("numerical");
    expect(meta.references.some((r) => /LeVeque/.test(r.authors) && r.doi)).toBe(true);
    expect(meta.references.some((r) => /Strikwerda/.test(r.authors))).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
  });

  it("result_max_abs tracks L∞ of the discrete operator output", () => {
    const out = FiniteDifferenceMethod.calculate({
      field: [0, 1, 0, -1, 0], dx: 1, operation: "second_derivative", bc: { kind: "periodic" },
    });
    expect(out.result_max_abs).toBeGreaterThan(0);
    expect(out.result_max_abs).toBe(Math.max(...out.result.map((v) => Math.abs(v))));
  });
});
