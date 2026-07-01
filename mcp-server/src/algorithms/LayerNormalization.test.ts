import { describe, it, expect } from "vitest";
import { LayerNormalization as LN, type LayerNormInput } from "./LayerNormalization.js";

describe("LayerNormalization — known closed-form values", () => {
  it("normalizes [1,2,3] to [-1.2247, 0, 1.2247] (μ=2, σ²=2/3)", () => {
    // hand-derived: (x-2)/sqrt(2/3 + ε) ; a negligible ε leaves the values intact to 7 digits
    const out = LN.calculate({ data: [[1, 2, 3]], epsilon: 1e-12 });
    expect(out.means[0]).toBeCloseTo(2, 12);
    expect(out.variances[0]).toBeCloseTo(2 / 3, 12);
    expect(out.normalized[0][0]).toBeCloseTo(-1.224744871, 7);
    expect(out.normalized[0][1]).toBeCloseTo(0, 12);
    expect(out.normalized[0][2]).toBeCloseTo(1.224744871, 7);
  });

  it("applies the per-feature affine γ·x̂ + β", () => {
    const out = LN.calculate({ data: [[1, 2, 3]], gamma: [2, 2, 2], beta: [1, 1, 1], epsilon: 1e-12 });
    expect(out.normalized[0][0]).toBeCloseTo(2 * -1.224744871 + 1, 6);
    expect(out.normalized[0][1]).toBeCloseTo(1, 12);
    expect(out.normalized[0][2]).toBeCloseTo(2 * 1.224744871 + 1, 6);
  });
});

describe("LayerNormalization — statistical invariants", () => {
  it("each output row has ~zero mean and ~unit variance (default γ=1, β=0)", () => {
    const data = [[3, 1, 4, 1, 5, 9, 2, 6], [-2, 7, 0, 0, 11, -3, 8, 4]];
    const out = LN.calculate({ data, epsilon: 1e-12 });
    for (const row of out.normalized) {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const varr = row.reduce((s, v) => s + (v - mean) ** 2, 0) / row.length;
      expect(mean).toBeCloseTo(0, 8);
      expect(varr).toBeCloseTo(1, 5);
    }
  });

  it("normalizes each row independently (batch-size-independent)", () => {
    const a = LN.calculate({ data: [[1, 2, 3]] }).normalized[0];
    const both = LN.calculate({ data: [[1, 2, 3], [100, 200, 300]] }).normalized[0];
    // row 0's output is unchanged by the presence of a wildly different row 1
    a.forEach((v, j) => expect(both[j]).toBeCloseTo(v, 12));
  });

  it("a constant row stays finite via epsilon (σ²=0)", () => {
    const out = LN.calculate({ data: [[5, 5, 5, 5]] });
    out.normalized[0].forEach((v) => expect(Number.isFinite(v)).toBe(true));
    out.normalized[0].forEach((v) => expect(v).toBeCloseTo(0, 6)); // (5-5)/sqrt(eps) = 0
  });
});

describe("LayerNormalization — failure modes", () => {
  it("rejects empty / ragged / non-matrix data", () => {
    expect(LN.validate({ data: [] as unknown as number[][] }).valid).toBe(false);
    expect(LN.validate({ data: [[1, 2], [3]] }).valid).toBe(false);
  });
  it("rejects gamma/beta length ≠ nFeatures", () => {
    expect(LN.validate({ data: [[1, 2, 3]], gamma: [1, 1] }).valid).toBe(false);
    expect(LN.validate({ data: [[1, 2, 3]], beta: [0, 0, 0, 0] }).valid).toBe(false);
  });
  it("rejects non-positive epsilon", () => {
    expect(LN.validate({ data: [[1, 2, 3]], epsilon: 0 }).valid).toBe(false);
    expect(LN.validate({ data: [[1, 2, 3]], epsilon: -1 }).valid).toBe(false);
  });
  it("throws on calculate with invalid input", () => {
    expect(() => LN.calculate({ data: [[1, 2], [3]] })).toThrow(/invalid/i);
  });
});

describe("LayerNormalization — adversarial inputs", () => {
  it("rejects NaN / Infinity in data", () => {
    expect(LN.validate({ data: [[1, NaN, 3]] }).valid).toBe(false);
    expect(LN.validate({ data: [[1, Infinity, 3]] }).valid).toBe(false);
  });
  it("rejects NaN in gamma", () => {
    expect(LN.validate({ data: [[1, 2, 3]], gamma: [1, NaN, 1] }).valid).toBe(false);
  });
  it("warns (not errors) on single-feature rows", () => {
    const out = LN.calculate({ data: [[7], [9]] });
    expect(out.warnings.join(" ")).toMatch(/single feature|nFeatures=1/i);
  });
});

describe("LayerNormalization — metadata", () => {
  it("exposes ml/normalization metadata with the LayerNorm reference", () => {
    const m = LN.getMetadata();
    expect(m.id).toBe("layer_normalization");
    expect(m.domain).toBe("ml");
    expect(m.category).toBe("normalization");
    expect(m.reference).toMatch(/Layer Normalization/i);
  });
});
