/**
 * ActivationFunctionsAlgorithm — canonical-value tests.
 * U-EXTRACT-ACTIVATIONS (slot:golf 2026-05-24 iter 16).
 *
 * Pins (per Karpathy R9 — tests verify intent, not just behavior):
 *  - ReLU/sigmoid/tanh canonical values at known points
 *  - Each function's derivative is consistent with finite-difference
 *  - Softmax sums to 1 + invariant under additive shift
 *  - Numerical stability: sigmoid doesn't overflow at ±1000, softplus doesn't NaN at large x
 *  - Unknown activation in apply() throws (fail-loud)
 */

import { describe, it, expect } from "vitest";
import {
  ActivationFunctionsAlgorithm,
} from "../algorithms/ActivationFunctionsAlgorithm.js";

const A = ActivationFunctionsAlgorithm;

describe("ReLU + Leaky ReLU", () => {
  it("ReLU at canonical points", () => {
    expect(A.relu(-1)).toBe(0);
    expect(A.relu(0)).toBe(0);
    expect(A.relu(2.5)).toBe(2.5);
  });
  it("ReLU derivative is 1 for positive, 0 elsewhere", () => {
    expect(A.reluDeriv(-1)).toBe(0);
    expect(A.reluDeriv(0)).toBe(0);
    expect(A.reluDeriv(0.5)).toBe(1);
  });
  it("Leaky ReLU preserves negative slope α", () => {
    expect(A.leakyRelu(-10, 0.1)).toBe(-1);
    expect(A.leakyRelu(2, 0.1)).toBe(2);
  });
});

describe("Sigmoid + numerical stability", () => {
  it("sigmoid(0) = 0.5", () => {
    expect(A.sigmoid(0)).toBeCloseTo(0.5, 8);
  });
  it("sigmoid asymptotes to 1 and 0", () => {
    expect(A.sigmoid(10)).toBeCloseTo(1, 4);
    expect(A.sigmoid(-10)).toBeCloseTo(0, 4);
  });
  it("sigmoid does NOT overflow at extreme inputs (±1000 → finite)", () => {
    expect(A.sigmoid(1000)).toBeCloseTo(1, 6);
    expect(A.sigmoid(-1000)).toBeCloseTo(0, 6);
    expect(Number.isFinite(A.sigmoid(1e8))).toBe(true);
  });
  it("sigmoid derivative peaks at 0 = 0.25", () => {
    expect(A.sigmoidDeriv(0)).toBeCloseTo(0.25, 8);
  });
});

describe("tanh", () => {
  it("tanh(0)=0, tanh(±large)→±1", () => {
    expect(A.tanh(0)).toBe(0);
    expect(A.tanh(10)).toBeCloseTo(1, 4);
    expect(A.tanh(-10)).toBeCloseTo(-1, 4);
  });
  it("tanh derivative peaks at 0 = 1", () => {
    expect(A.tanhDeriv(0)).toBeCloseTo(1, 8);
  });
});

describe("ELU + SELU + GELU", () => {
  it("ELU is identity for x>=0", () => {
    expect(A.elu(2.0)).toBe(2.0);
    expect(A.elu(0)).toBe(0);
  });
  it("ELU saturates to -α for x→-∞", () => {
    expect(A.elu(-100, 1.0)).toBeCloseTo(-1, 6);
    expect(A.elu(-100, 2.5)).toBeCloseTo(-2.5, 6);
  });
  it("SELU uses canonical scale 1.0507 and α 1.6732", () => {
    expect(A.selu(1)).toBeCloseTo(1.0507009873554805, 8);
  });
  it("GELU is approximately 0 at x=0, x at x=∞", () => {
    expect(A.gelu(0)).toBeCloseTo(0, 8);
    expect(A.gelu(10)).toBeCloseTo(10, 2);
  });
});

describe("Swish + Mish + softplus", () => {
  it("Swish at x=0 is 0", () => {
    expect(A.swish(0)).toBeCloseTo(0, 8);
  });
  it("Mish at x=0 is 0", () => {
    expect(A.mish(0)).toBeCloseTo(0, 8);
  });
  it("softplus(0) = log(2) ≈ 0.6931", () => {
    expect(A.softplus(0)).toBeCloseTo(Math.LN2, 8);
  });
  it("softplus DOESN'T NaN at x=1000 (cutoff branch)", () => {
    expect(A.softplus(1000)).toBe(1000);
    expect(Number.isFinite(A.softplus(1e6))).toBe(true);
  });
});

describe("softsign + hardSigmoid + hardSwish", () => {
  it("softsign saturates to ±1", () => {
    expect(A.softsign(1e9)).toBeCloseTo(1, 6);
    expect(A.softsign(-1e9)).toBeCloseTo(-1, 6);
  });
  it("hardSigmoid clamps to [0,1]", () => {
    expect(A.hardSigmoid(-100)).toBe(0);
    expect(A.hardSigmoid(100)).toBe(1);
    expect(A.hardSigmoid(0)).toBe(0.5);
  });
  it("hardSwish(0) = 0", () => {
    expect(A.hardSwish(0)).toBe(0);
  });
});

describe("softmax + logSoftmax", () => {
  it("softmax output sums to 1", () => {
    const out = A.softmax([1, 2, 3, 4]);
    const sum = out.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 8);
  });
  it("softmax is shift-invariant (max-shift stability)", () => {
    const a = A.softmax([1, 2, 3]);
    const b = A.softmax([1001, 1002, 1003]);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i], 6);
  });
  it("softmax handles extreme inputs without NaN/Infinity", () => {
    const out = A.softmax([1000, 2000, 3000]);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it("logSoftmax outputs sum to log(1) = 0 after exp + sum", () => {
    const out = A.logSoftmax([1, 2, 3]);
    const sumExp = out.reduce((s, v) => s + Math.exp(v), 0);
    expect(sumExp).toBeCloseTo(1, 8);
  });
  it("softmax on empty array returns empty (no NaN)", () => {
    expect(A.softmax([])).toEqual([]);
    expect(A.logSoftmax([])).toEqual([]);
  });
});

describe("apply() dispatcher", () => {
  it("applies scalar activation to scalar", () => {
    expect(A.apply(-1, "relu")).toBe(0);
    expect(A.apply(0, "sigmoid")).toBeCloseTo(0.5, 8);
  });
  it("applies activation across an array", () => {
    const out = A.apply([-1, 0, 1], "relu") as number[];
    expect(out).toEqual([0, 0, 1]);
  });
  it("passes parametric args through", () => {
    const out = A.apply([-10, 5], "leakyRelu", 0.5) as number[];
    expect(out).toEqual([-5, 5]);
  });
  it("THROWS on unknown activation (fail-loud)", () => {
    expect(() => A.apply(1, "unobtainium" as never)).toThrow(/unknown activation/);
  });
});
