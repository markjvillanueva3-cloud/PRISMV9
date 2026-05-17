/**
 * LinearStateSpaceModel.test.ts — vitest
 *
 * Real control-theory reference values (CLAUDE.md R9 — no weak stubs):
 *  - char-poly via Faddeev–LeVerrier vs hand-computed coefficients
 *  - SISO transfer function for known systems (integrator, 2nd-order)
 *  - frequency response DC gain + resonant peak
 *  - Kalman controllability / observability on canonical forms
 *  - simulate vs analytical (undamped oscillator, composes ODEIntegrator)
 *  - pendulum-cart factory eigenstructure + physics-param guard
 *  - validation + adversarial matrix shapes
 *
 * @module algorithms/LinearStateSpaceModel.test
 */

import { describe, it, expect } from "vitest";
import {
  LinearStateSpaceModel,
  pendulumCartExample,
  type Matrix,
} from "./LinearStateSpaceModel.js";

// ─── char-poly ─────────────────────────────────────────────────────

describe("LinearStateSpaceModel — characteristic polynomial (Faddeev–LeVerrier)", () => {
  it("2×2 [[0,1],[-2,-3]] → λ²+3λ+2 (eigenvalues -1,-2)", () => {
    // SISO controllable companion of 1/(s²+3s+2)
    const out = LinearStateSpaceModel.calculate({
      A: [[0, 1], [-2, -3]],
      B: [[0], [1]],
      C: [[1, 0]],
      D: [[0]],
      operation: "transfer_function",
    });
    const cp = out.char_poly.map((a) => a.value);
    expect(cp[0]).toBeCloseTo(1, 12);   // λ²
    expect(cp[1]).toBeCloseTo(3, 12);   // λ¹
    expect(cp[2]).toBeCloseTo(2, 12);   // λ⁰
  });

  it("diagonal A=diag(-1,-4) → λ²+5λ+4", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[-1, 0], [0, -4]],
      B: [[1], [1]],
      C: [[1, 1]],
      D: [[0]],
      operation: "ranks",
    });
    const cp = out.char_poly.map((a) => a.value);
    expect(cp[0]).toBeCloseTo(1, 12);
    expect(cp[1]).toBeCloseTo(5, 12);
    expect(cp[2]).toBeCloseTo(4, 12);
  });
});

// ─── SISO transfer function ────────────────────────────────────────

describe("LinearStateSpaceModel — SISO transfer function", () => {
  it("single integrator A=[[0]],B=[[1]],C=[[1]],D=[[0]] → G(s)=1/s", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[0]], B: [[1]], C: [[1]], D: [[0]], operation: "transfer_function",
    });
    const tf = out.transfer_function!;
    expect(tf.num).toEqual([1]);        // numerator = 1
    expect(tf.den).toEqual([1, 0]);     // denominator = s
  });

  it("2nd-order 1/(s²+3s+2): num=[1], den=[1,3,2]", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[0, 1], [-2, -3]], B: [[0], [1]], C: [[1, 0]], D: [[0]],
      operation: "transfer_function",
    });
    const tf = out.transfer_function!;
    expect(tf.num.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([1]);
    expect(tf.den[0]).toBeCloseTo(1, 9);
    expect(tf.den[1]).toBeCloseTo(3, 9);
    expect(tf.den[2]).toBeCloseTo(2, 9);
  });

  it("feedthrough D adds to numerator: A=[[-1]],B=[[1]],C=[[1]],D=[[2]] → (2s+3)/(s+1)", () => {
    // G(s) = C(sI-A)^-1 B + D = 1/(s+1) + 2 = (1 + 2(s+1))/(s+1) = (2s+3)/(s+1)
    const out = LinearStateSpaceModel.calculate({
      A: [[-1]], B: [[1]], C: [[1]], D: [[2]], operation: "transfer_function",
    });
    const tf = out.transfer_function!;
    expect(tf.den[0]).toBeCloseTo(1, 9);
    expect(tf.den[1]).toBeCloseTo(1, 9);
    expect(tf.num[0]).toBeCloseTo(2, 9); // 2s
    expect(tf.num[1]).toBeCloseTo(3, 9); // +3
  });
});

// ─── frequency response ────────────────────────────────────────────

describe("LinearStateSpaceModel — frequency response", () => {
  it("first-order 1/(s+1): DC gain |G(j0)|=1, |G(j1)|=1/√2, phase(j1)=-45°", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[-1]], B: [[1]], C: [[1]], D: [[0]],
      operation: "frequency_response",
      omegas: [0, 1],
    });
    const fr = out.frequency_response!;
    expect(fr[0].magnitude).toBeCloseTo(1.0, 9);          // DC gain = 1
    expect(fr[1].magnitude).toBeCloseTo(1 / Math.SQRT2, 9); // -3dB point
    expect(fr[1].phase_deg).toBeCloseTo(-45, 6);
  });

  it("undamped 2nd-order 1/(s²+1): magnitude blows up near ω=1 (resonance)", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[0, 1], [-1, 0]], B: [[0], [1]], C: [[1, 0]], D: [[0]],
      operation: "frequency_response",
      omegas: [0, 0.5, 0.99],
    });
    const fr = out.frequency_response!;
    expect(fr[0].magnitude).toBeCloseTo(1.0, 6);   // DC: 1/1 = 1
    // Approaching the undamped pole ω=1, |G| = 1/|1-ω²| grows large
    expect(fr[2].magnitude).toBeGreaterThan(fr[1].magnitude);
    expect(fr[2].magnitude).toBeGreaterThan(40); // 1/(1-0.99²) ≈ 50.25
  });
});

// ─── controllability / observability ───────────────────────────────

describe("LinearStateSpaceModel — Kalman ranks", () => {
  it("controllable companion form is fully controllable + observable", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[0, 1], [-2, -3]], B: [[0], [1]], C: [[1, 0]], D: [[0]],
      operation: "ranks",
    });
    const r = out.ranks!;
    expect(r.n).toBe(2);
    expect(r.controllability).toBe(2);
    expect(r.observability).toBe(2);
    expect(r.controllable).toBe(true);
    expect(r.observable).toBe(true);
  });

  it("uncontrollable system: B aligned with one eigenvector only", () => {
    // Diagonal A, B only excites first mode → controllability rank 1 < 2
    const out = LinearStateSpaceModel.calculate({
      A: [[-1, 0], [0, -2]], B: [[1], [0]], C: [[0, 1]], D: [[0]],
      operation: "ranks",
    });
    const r = out.ranks!;
    expect(r.controllability).toBe(1);
    expect(r.controllable).toBe(false);
    // C observes only 2nd state; A diagonal → observability rank 1
    expect(r.observability).toBe(1);
    expect(r.observable).toBe(false);
  });
});

// ─── simulate (composes ODEIntegrator) ─────────────────────────────

describe("LinearStateSpaceModel — simulate (delegates to ODEIntegrator/RK4)", () => {
  it("undamped oscillator ẋ=[[0,1],[-1,0]]x, x0=[1,0], no input → one period returns to x0", () => {
    const period = 2 * Math.PI; // ω=1
    const out = LinearStateSpaceModel.calculate({
      A: [[0, 1], [-1, 0]], B: [[0], [0]], C: [[1, 0]], D: [[0]],
      operation: "simulate",
      x0: [1, 0],
      u: () => [0],
      t0: 0,
      tf: period,
      steps: 400,
    });
    expect(out.final_state![0]).toBeCloseTo(1.0, 4);
    expect(out.final_state![1]).toBeCloseTo(0.0, 3);
  });

  it("first-order ẋ=-x with step input u=1: x→1 as t→∞ (x(5)≈1-e⁻⁵)", () => {
    const out = LinearStateSpaceModel.calculate({
      A: [[-1]], B: [[1]], C: [[1]], D: [[0]],
      operation: "simulate",
      x0: [0],
      u: () => [1],
      t0: 0,
      tf: 5,
      steps: 500,
    });
    expect(out.final_state![0]).toBeCloseTo(1 - Math.exp(-5), 5);
  });
});

// ─── pendulum-cart factory ─────────────────────────────────────────

describe("LinearStateSpaceModel — pendulumCartExample", () => {
  it("builds 4-state A/B/C/D with correct linearized structure", () => {
    const sys = pendulumCartExample({ cartMass: 1, poleMass: 0.1, poleLength: 0.5, gravity: 9.81 });
    expect(sys.A.length).toBe(4);
    expect(sys.A[0]).toEqual([0, 1, 0, 0]);
    expect(sys.A[2]).toEqual([0, 0, 0, 1]);
    // A[1][2] = -m*g/M = -0.1*9.81/1 = -0.981
    expect(sys.A[1][2]).toBeCloseTo(-0.981, 9);
    // A[3][2] = (M+m)*g/(M*l) = 1.1*9.81/(1*0.5) = 21.582
    expect(sys.A[3][2]).toBeCloseTo(21.582, 6);
    expect(sys.B).toEqual([[0], [1], [0], [-2]]); // 1/M=1, -1/(M*l)=-2
    expect(sys.C).toEqual([[1, 0, 0, 0]]);
    expect(sys.D).toEqual([[0]]);
  });

  it("pendulum-cart is an unstable (inverted) system — has a real RHP pole", () => {
    const sys = pendulumCartExample({ cartMass: 1, poleMass: 0.1, poleLength: 0.5, gravity: 9.81 });
    const out = LinearStateSpaceModel.calculate({ ...sys, operation: "ranks" });
    // char-poly of A: λ⁴ - ((M+m)g/Ml)λ² = λ²(λ² - 21.582)
    // → poles at 0,0,±4.646 — the +4.646 is the unstable inverted mode.
    const cp = out.char_poly.map((a) => a.value);
    expect(cp[0]).toBeCloseTo(1, 9);     // λ⁴
    expect(cp[1]).toBeCloseTo(0, 9);     // λ³
    expect(cp[2]).toBeCloseTo(-21.582, 5); // λ²
    expect(cp[3]).toBeCloseTo(0, 9);     // λ¹
    expect(cp[4]).toBeCloseTo(0, 9);     // λ⁰
  });

  it("rejects non-positive / non-finite physical parameters", () => {
    expect(() => pendulumCartExample({ cartMass: 0, poleMass: 0.1, poleLength: 0.5, gravity: 9.81 }))
      .toThrow(RangeError);
    expect(() => pendulumCartExample({ cartMass: 1, poleMass: 0.1, poleLength: 0.5, gravity: Number.NaN }))
      .toThrow(/positive finite/);
  });
});

// ─── validation + adversarial ──────────────────────────────────────

describe("LinearStateSpaceModel.validate — failure modes", () => {
  const sq: Matrix = [[0, 1], [-1, 0]];

  it("rejects non-square A", () => {
    const v = LinearStateSpaceModel.validate({
      A: [[1, 2, 3], [4, 5, 6]], B: [[1], [1]], C: [[1, 0]], D: [[0]],
    });
    expect(v.valid).toBe(false);
    expect(v.errors!.some((e) => /A must be square/.test(e))).toBe(true);
  });

  it("rejects non-rectangular (jagged) matrix", () => {
    const v = LinearStateSpaceModel.validate({
      A: [[1, 2], [3]] as unknown as Matrix, B: [[1], [1]], C: [[1, 0]], D: [[0]],
    });
    expect(v.valid).toBe(false);
  });

  it("rejects B/C/D dimension mismatch", () => {
    const v = LinearStateSpaceModel.validate({
      A: sq, B: [[1]], C: [[1, 0]], D: [[0]], // B rows=1 ≠ state dim 2
    });
    expect(v.valid).toBe(false);
    expect(v.errors!.some((e) => /B rows/.test(e))).toBe(true);
  });

  it("rejects non-finite matrix entries", () => {
    const v = LinearStateSpaceModel.validate({
      A: [[0, 1], [Number.NaN, 0]], B: [[0], [1]], C: [[1, 0]], D: [[0]],
    });
    expect(v.valid).toBe(false);
  });

  it("transfer_function rejects MIMO", () => {
    const v = LinearStateSpaceModel.validate({
      A: sq, B: [[1, 0], [0, 1]], C: [[1, 0], [0, 1]], D: [[0, 0], [0, 0]],
      operation: "transfer_function",
    });
    expect(v.valid).toBe(false);
    expect(v.errors!.some((e) => /SISO/.test(e))).toBe(true);
  });

  it("simulate rejects missing x0 / u / bad time window", () => {
    const v = LinearStateSpaceModel.validate({
      A: sq, B: [[0], [1]], C: [[1, 0]], D: [[0]],
      operation: "simulate", tf: 1, steps: 10, // missing x0 + u
    });
    expect(v.valid).toBe(false);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => LinearStateSpaceModel.calculate({
      A: [[1, 2, 3]], B: [[1]], C: [[1]], D: [[0]],
    })).toThrow(/validation failed/);
  });
});

// ─── metadata ──────────────────────────────────────────────────────

describe("LinearStateSpaceModel — metadata", () => {
  it("getMetadata returns control-domain canonical fields + Ogata ref", () => {
    const meta = LinearStateSpaceModel.getMetadata();
    expect(meta.id).toBe("linear_state_space_model");
    expect(meta.domain).toBe("control");
    expect(meta.references.some((r) => /Ogata/.test(r.authors))).toBe(true);
    expect(meta.references.some((r) => /Faddeev/.test(r.authors))).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
  });
});
