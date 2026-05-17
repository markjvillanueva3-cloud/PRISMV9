/**
 * LagrangianMechanics.test.ts — vitest
 *
 * Analytical equations of motion (CLAUDE.md R9 — no weak stubs):
 *  - free particle  L=½mẋ²            → ẍ = 0
 *  - harmonic osc.  L=½mẋ²−½kx²       → ẍ = −(k/m)x
 *  - simple pendulum L=½mℓ²θ̇²+mgℓcosθ → θ̈ = −(g/ℓ)sinθ
 *  - 2-DOF coupled system → symmetric non-diagonal mass matrix
 *  - generalized (non-conservative) force adds to q̈
 *  - singular Lagrangian → NaN q̈ + flagged (R12 fail-loud)
 *  - composition: makeEOMDerivative → ODEIntegrator (pendulum small-angle
 *    period ≈ 2π√(ℓ/g); energy conservation)
 *  - validation + adversarial
 *
 * @module algorithms/LagrangianMechanics.test
 */

import { describe, it, expect } from "vitest";
import { LagrangianMechanics, makeEOMDerivative } from "./LagrangianMechanics.js";
import type { LagrangianFn } from "./LagrangianMechanics.js";
import { ODEIntegrator } from "./ODEIntegrator.js";

// ─── analytical EOM ────────────────────────────────────────────────

describe("LagrangianMechanics — analytical equations of motion", () => {
  it("free particle L=½mẋ² → ẍ=0", () => {
    const m = 2.0;
    const L: LagrangianFn = (_q, v) => 0.5 * m * v[0] * v[0];
    const out = LagrangianMechanics.calculate({ lagrangian: L, q: [3], qdot: [1.5] });
    expect(out.accelerations[0]).toBeCloseTo(0, 6);
    expect(out.singular).toBe(false);
    // mass matrix = [[m]]
    expect(out.mass_matrix[0][0]).toBeCloseTo(m, 4);
  });

  it("harmonic oscillator L=½mẋ²−½kx² → ẍ=−(k/m)x", () => {
    const m = 1.5;
    const k = 6.0;
    const L: LagrangianFn = (q, v) => 0.5 * m * v[0] * v[0] - 0.5 * k * q[0] * q[0];
    const x0 = 0.7;
    const out = LagrangianMechanics.calculate({ lagrangian: L, q: [x0], qdot: [0] });
    expect(out.accelerations[0]).toBeCloseTo(-(k / m) * x0, 4);
  });

  it("simple pendulum L=½mℓ²θ̇²+mgℓcosθ → θ̈=−(g/ℓ)sinθ", () => {
    const m = 1.0;
    const l = 0.8;
    const g = 9.81;
    const L: LagrangianFn = (q, v) =>
      0.5 * m * l * l * v[0] * v[0] + m * g * l * Math.cos(q[0]);
    for (const theta of [0.3, 1.0, 2.0, -0.5]) {
      const out = LagrangianMechanics.calculate({ lagrangian: L, q: [theta], qdot: [0] });
      expect(out.accelerations[0]).toBeCloseTo(-(g / l) * Math.sin(theta), 3);
    }
  });

  it("acceleration is velocity-independent for a quadratic-KE Lagrangian", () => {
    // pendulum θ̈ depends only on θ, not θ̇ (no Coriolis in 1-DOF)
    const L: LagrangianFn = (q, v) => 0.5 * v[0] * v[0] + Math.cos(q[0]);
    const a0 = LagrangianMechanics.calculate({ lagrangian: L, q: [0.5], qdot: [0] }).accelerations[0];
    const a1 = LagrangianMechanics.calculate({ lagrangian: L, q: [0.5], qdot: [4.2] }).accelerations[0];
    expect(a1).toBeCloseTo(a0, 4);
  });
});

// ─── 2-DOF / mass matrix ───────────────────────────────────────────

describe("LagrangianMechanics — multi-DOF mass matrix", () => {
  it("two uncoupled masses → diagonal mass matrix, independent accelerations", () => {
    // L = ½m₁ẋ₁² + ½m₂ẋ₂² − ½k₁x₁² − ½k₂x₂²
    const m1 = 1, m2 = 3, k1 = 4, k2 = 9;
    const L: LagrangianFn = (q, v) =>
      0.5 * m1 * v[0] ** 2 + 0.5 * m2 * v[1] ** 2 - 0.5 * k1 * q[0] ** 2 - 0.5 * k2 * q[1] ** 2;
    const out = LagrangianMechanics.calculate({ lagrangian: L, q: [1, 1], qdot: [0, 0] });
    expect(out.mass_matrix[0][0]).toBeCloseTo(m1, 3);
    expect(out.mass_matrix[1][1]).toBeCloseTo(m2, 3);
    expect(out.mass_matrix[0][1]).toBeCloseTo(0, 3); // uncoupled
    expect(out.accelerations[0]).toBeCloseTo(-k1 / m1, 3);
    expect(out.accelerations[1]).toBeCloseTo(-k2 / m2, 3);
  });

  it("coupled-KE Lagrangian → symmetric non-diagonal mass matrix", () => {
    // L = ½(ẋ₁² + ẋ₂² + ẋ₁ẋ₂) − potential   → M = [[1,0.5],[0.5,1]]
    const L: LagrangianFn = (q, v) =>
      0.5 * (v[0] ** 2 + v[1] ** 2 + v[0] * v[1]) - 0.5 * (q[0] ** 2 + q[1] ** 2);
    const out = LagrangianMechanics.calculate({ lagrangian: L, q: [0.5, -0.5], qdot: [0, 0] });
    expect(out.mass_matrix[0][0]).toBeCloseTo(1, 3);
    expect(out.mass_matrix[1][1]).toBeCloseTo(1, 3);
    expect(out.mass_matrix[0][1]).toBeCloseTo(0.5, 3);
    expect(out.mass_matrix[1][0]).toBeCloseTo(out.mass_matrix[0][1], 9); // symmetric
    expect(out.singular).toBe(false);
  });
});

// ─── generalized force ─────────────────────────────────────────────

describe("LagrangianMechanics — non-conservative generalized force", () => {
  it("constant applied force F adds F/m to the free-particle acceleration", () => {
    const m = 2.0;
    const F = 5.0;
    const L: LagrangianFn = (_q, v) => 0.5 * m * v[0] * v[0];
    const out = LagrangianMechanics.calculate({
      lagrangian: L, q: [0], qdot: [0], generalizedForce: () => [F],
    });
    expect(out.accelerations[0]).toBeCloseTo(F / m, 4); // m·ẍ = F
  });

  it("viscous damping −cẋ produces ẍ = −(k/m)x − (c/m)ẋ", () => {
    const m = 1, k = 4, c = 0.5;
    const L: LagrangianFn = (q, v) => 0.5 * m * v[0] ** 2 - 0.5 * k * q[0] ** 2;
    const out = LagrangianMechanics.calculate({
      lagrangian: L, q: [1], qdot: [2],
      generalizedForce: (_q, v) => [-c * v[0]],
    });
    expect(out.accelerations[0]).toBeCloseTo(-(k / m) * 1 - (c / m) * 2, 3);
  });
});

// ─── singular Lagrangian (fail-loud) ───────────────────────────────

describe("LagrangianMechanics — degenerate Lagrangian", () => {
  it("Lagrangian with no kinetic term for a DOF → singular M, NaN q̈, flagged", () => {
    // L depends on q̇₀ but NOT q̇₁ → M row/col 1 is zero → singular
    const L: LagrangianFn = (q, v) => 0.5 * v[0] ** 2 - 0.5 * (q[0] ** 2 + q[1] ** 2);
    const out = LagrangianMechanics.calculate({ lagrangian: L, q: [1, 1], qdot: [0, 0] });
    expect(out.singular).toBe(true);
    expect(out.mass_matrix_det).toBe(0);
    expect(Number.isNaN(out.accelerations[0])).toBe(true);
    expect(out.warnings.some((w) => /singular/.test(w))).toBe(true);
    // Safety weighting: physics+range+material are all 1.0 for a pure
    // numerical primitive, so a singular run floors at ~0.895 (only the
    // 0.15-weighted process term drops to 0.3). The load-bearing fail-loud
    // signal is the explicit `singular` flag + NaN q̈, not an absolute score.
    expect(out.safety.score).toBeLessThan(0.92);
    expect(out.safety.score).toBeLessThan(
      LagrangianMechanics.calculate({
        lagrangian: (_q, v) => 0.5 * v[0] * v[0], q: [0], qdot: [0],
      }).safety.score, // strictly below a healthy run
    );
  });
});

// ─── composition with ODEIntegrator ────────────────────────────────

describe("LagrangianMechanics — makeEOMDerivative composes with ODEIntegrator", () => {
  it("pendulum small-angle oscillation has period ≈ 2π√(ℓ/g)", () => {
    const m = 1, l = 1, g = 9.81;
    const L: LagrangianFn = (q, v) =>
      0.5 * m * l * l * v[0] * v[0] + m * g * l * Math.cos(q[0]);
    const f = makeEOMDerivative(L, 1);
    const theta0 = 0.05; // small angle
    const period = 2 * Math.PI * Math.sqrt(l / g);
    // integrate exactly one period; θ should return near θ0, θ̇ near 0
    const sol = ODEIntegrator.calculate({
      initial_state: [theta0, 0],
      t0: 0, tf: period, steps: 4000, method: "rk4", f,
    });
    expect(sol.final_state[0]).toBeCloseTo(theta0, 3);
    expect(sol.final_state[1]).toBeCloseTo(0, 2);
  });

  it("harmonic oscillator conserves energy over many periods (RK4)", () => {
    const m = 1, k = 4; // ω = 2
    const L: LagrangianFn = (q, v) => 0.5 * m * v[0] ** 2 - 0.5 * k * q[0] ** 2;
    const f = makeEOMDerivative(L, 1);
    const x0 = 1.0;
    const E0 = 0.5 * k * x0 * x0; // initial energy (all potential)
    const sol = ODEIntegrator.calculate({
      initial_state: [x0, 0], t0: 0, tf: 20, steps: 20000, method: "rk4", f,
    });
    const xf = sol.final_state[0];
    const vf = sol.final_state[1];
    const Ef = 0.5 * m * vf * vf + 0.5 * k * xf * xf;
    expect(Ef).toBeCloseTo(E0, 2); // energy conserved
  });

  it("free particle under constant force: x(t) = x0 + v0·t + ½(F/m)t²", () => {
    const m = 2, F = 4; // a = F/m = 2
    const L: LagrangianFn = (_q, v) => 0.5 * m * v[0] ** 2;
    const f = makeEOMDerivative(L, 1, () => [F]);
    const sol = ODEIntegrator.calculate({
      initial_state: [0, 1], t0: 0, tf: 3, steps: 3000, method: "rk4", f,
    });
    // x(3) = 0 + 1·3 + ½·2·9 = 3 + 9 = 12
    expect(sol.final_state[0]).toBeCloseTo(12, 2);
    expect(sol.final_state[1]).toBeCloseTo(1 + 2 * 3, 3); // v(3) = v0 + a·t = 7
  });
});

// ─── validation + adversarial ──────────────────────────────────────

describe("LagrangianMechanics.validate — failure modes", () => {
  const okL: LagrangianFn = (_q, v) => 0.5 * v[0] * v[0];

  it("rejects missing lagrangian", () => {
    expect(LagrangianMechanics.validate({
      lagrangian: undefined as unknown as LagrangianFn, q: [1], qdot: [0],
    }).valid).toBe(false);
  });

  it("rejects empty / mismatched q and qdot", () => {
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [], qdot: [] }).valid).toBe(false);
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [1, 2], qdot: [0] }).valid).toBe(false);
  });

  it("rejects non-finite q / qdot / t", () => {
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [Number.NaN], qdot: [0] }).valid).toBe(false);
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [1], qdot: [Number.POSITIVE_INFINITY] }).valid).toBe(false);
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [1], qdot: [0], t: Number.NaN }).valid).toBe(false);
  });

  it("rejects non-positive fd_step and non-function generalizedForce", () => {
    expect(LagrangianMechanics.validate({ lagrangian: okL, q: [1], qdot: [0], fd_step: 0 }).valid).toBe(false);
    expect(LagrangianMechanics.validate({
      lagrangian: okL, q: [1], qdot: [0], generalizedForce: 7 as unknown as () => number[],
    }).valid).toBe(false);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => LagrangianMechanics.calculate({ lagrangian: okL, q: [], qdot: [] }))
      .toThrow(/validation failed/);
  });
});

// ─── metadata ──────────────────────────────────────────────────────

describe("LagrangianMechanics — metadata", () => {
  it("getMetadata cites Goldstein + Lanczos, dynamics domain", () => {
    const meta = LagrangianMechanics.getMetadata();
    expect(meta.id).toBe("lagrangian_mechanics");
    expect(meta.domain).toBe("dynamics");
    expect(meta.references.some((r) => /Goldstein/.test(r.authors))).toBe(true);
    expect(meta.references.some((r) => /Lanczos/.test(r.authors))).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
  });
});
