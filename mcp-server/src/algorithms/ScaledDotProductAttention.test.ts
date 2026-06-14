import { describe, it, expect } from "vitest";
import {
  ScaledDotProductAttention as ATT,
  type AttentionInput,
} from "./ScaledDotProductAttention.js";

describe("ScaledDotProductAttention — reference values", () => {
  it("uniform scores → uniform weights → output is the mean of value rows", () => {
    // all-zero Q·K → equal scores → softmax = [0.5,0.5]
    const out = ATT.calculate({
      query: [[0, 0]],
      key: [[0, 0], [0, 0]],
      value: [[1, 2], [3, 4]],
    });
    expect(out.attentionWeights[0][0]).toBeCloseTo(0.5, 12);
    expect(out.attentionWeights[0][1]).toBeCloseTo(0.5, 12);
    expect(out.output[0]).toEqual([2, 3]); // mean of [1,2],[3,4]
    expect(out.scale).toBeCloseTo(1 / Math.sqrt(2), 12);
  });

  it("sharp alignment → attention concentrates on the matching key", () => {
    const out = ATT.calculate({
      query: [[10, 0]],
      key: [[10, 0], [0, 10]],
      value: [[1, 0], [0, 1]],
    });
    expect(out.attentionWeights[0][0]).toBeGreaterThan(0.999);
    expect(out.output[0][0]).toBeGreaterThan(0.999);
    expect(out.output[0][1]).toBeLessThan(0.001);
  });

  it("causal mask: position 0 attends only to itself; position 1 attends to 0 and 1", () => {
    const out = ATT.calculate({
      query: [[0, 0], [0, 0]],
      key: [[0, 0], [0, 0]], // equal scores everywhere
      value: [[2, 0], [0, 2]],
      causal: true,
    });
    expect(out.attentionWeights[0]).toEqual([1, 0]); // row 0: only key 0
    expect(out.output[0]).toEqual([2, 0]);
    expect(out.attentionWeights[1][0]).toBeCloseTo(0.5, 12);
    expect(out.attentionWeights[1][1]).toBeCloseTo(0.5, 12);
    expect(out.output[1]).toEqual([1, 1]); // mean of both value rows
  });
});

describe("ScaledDotProductAttention — properties", () => {
  const inp: AttentionInput = {
    query: [[1, 2], [3, 4], [0, 1]],
    key: [[1, 0], [0, 1], [1, 1], [2, 0]],
    value: [[5, 6, 7], [1, 1, 1], [0, 0, 0], [9, 9, 9]],
  };
  const out = ATT.calculate(inp);

  it("attention weight rows are row-stochastic (sum to 1, non-negative)", () => {
    for (const row of out.attentionWeights) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(row.every((w) => w >= 0)).toBe(true);
    }
  });

  it("output shape is [Lq × d_v] and weights shape is [Lq × Lk]", () => {
    expect(out.output).toHaveLength(3); // Lq
    expect(out.output.every((r) => r.length === 3)).toBe(true); // d_v
    expect(out.attentionWeights.every((r) => r.length === 4)).toBe(true); // Lk
    expect([out.qLen, out.kLen, out.dK, out.dV]).toEqual([3, 4, 2, 3]);
  });

  it("custom scale (temperature) sharpens vs default", () => {
    const sharp = ATT.calculate({ ...inp, scale: 100 });
    // higher scale → lower entropy (more peaked) on row 0
    const entropy = (w: number[]) => -w.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
    expect(entropy(sharp.attentionWeights[0])).toBeLessThan(entropy(out.attentionWeights[0]));
  });

  it("explicit additive mask of -Infinity removes a key from attention", () => {
    const masked = ATT.calculate({
      query: [[0, 0]],
      key: [[0, 0], [0, 0]],
      value: [[1, 1], [9, 9]],
      mask: [[0, -Infinity]], // disallow key 1
    });
    expect(masked.attentionWeights[0]).toEqual([1, 0]);
    expect(masked.output[0]).toEqual([1, 1]);
  });
});

describe("ScaledDotProductAttention — failure modes", () => {
  it("rejects d_k mismatch (query cols ≠ key cols)", () => {
    const bad: AttentionInput = { query: [[1, 2, 3]], key: [[1, 2]], value: [[1]] };
    expect(ATT.validate(bad).valid).toBe(false);
    expect(() => ATT.calculate(bad)).toThrow(/d_k mismatch|invalid/i);
  });

  it("rejects key/value length mismatch", () => {
    const bad: AttentionInput = { query: [[1, 1]], key: [[1, 1], [2, 2]], value: [[1]] };
    expect(ATT.validate(bad).valid).toBe(false);
  });

  it("rejects empty query matrix", () => {
    expect(ATT.validate({ query: [], key: [[1]], value: [[1]] }).valid).toBe(false);
  });

  it("rejects non-positive scale", () => {
    expect(ATT.validate({ query: [[1]], key: [[1]], value: [[1]], scale: 0 }).valid).toBe(false);
  });

  it("rejects a mask whose shape doesn't match [Lq × Lk]", () => {
    const bad: AttentionInput = { query: [[1]], key: [[1], [2]], value: [[1], [2]], mask: [[0]] };
    expect(ATT.validate(bad).valid).toBe(false);
  });
});

describe("ScaledDotProductAttention — adversarial inputs", () => {
  it("rejects NaN in query", () => {
    expect(ATT.validate({ query: [[NaN, 1]], key: [[0, 0]], value: [[1, 1]] }).valid).toBe(false);
  });

  it("rejects Infinity in value", () => {
    expect(ATT.validate({ query: [[1, 1]], key: [[1, 1]], value: [[Infinity, 0]] }).valid).toBe(false);
  });

  it("fully-masked row stays row-stochastic (degenerate → uniform, no NaN)", () => {
    const out = ATT.calculate({
      query: [[0, 0]],
      key: [[0, 0], [0, 0]],
      value: [[1, 1], [2, 2]],
      mask: [[-Infinity, -Infinity]],
    });
    expect(out.attentionWeights[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(out.output[0].every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe("ScaledDotProductAttention — metadata", () => {
  it("exposes ml/deep-learning metadata with the Vaswani reference", () => {
    const m = ATT.getMetadata();
    expect(m.id).toBe("scaled_dot_product_attention");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Attention Is All You Need/i);
  });
});
