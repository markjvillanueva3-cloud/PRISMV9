import { describe, it, expect } from "vitest";
import { MultiHeadAttention as MHA, type MultiHeadAttentionInput } from "./MultiHeadAttention.js";
import { ScaledDotProductAttention as SDPA } from "./ScaledDotProductAttention.js";

const I2 = [[1, 0], [0, 1]];

describe("MultiHeadAttention — reduces to single-head when h=1, no projections", () => {
  it("output equals ScaledDotProductAttention exactly", () => {
    const query = [[1, 0], [0, 1]];
    const key = [[1, 0], [0, 1]];
    const value = [[1, 2], [3, 4]];
    const mha = MHA.calculate({ query, key, value, numHeads: 1 });
    const sdpa = SDPA.calculate({ query, key, value });
    expect(mha.output).toHaveLength(sdpa.output.length);
    for (let i = 0; i < sdpa.output.length; i++) {
      for (let j = 0; j < sdpa.output[i].length; j++) {
        expect(mha.output[i][j]).toBeCloseTo(sdpa.output[i][j], 12);
      }
    }
    expect(mha.numHeads).toBe(1);
    expect(mha.dHead).toBe(2);
  });
});

describe("MultiHeadAttention — uniform attention returns the mean of value rows", () => {
  // identical keys ⇒ every query attends uniformly ⇒ output row = column-wise mean of values
  const query = [[0.5, 0.5]];
  const key = [[1, 1], [1, 1]];
  const value = [[1, 2], [3, 4]]; // column means → [2, 3]

  it("h=1: output = [2, 3]", () => {
    const out = MHA.calculate({ query, key, value, numHeads: 1 });
    expect(out.output[0][0]).toBeCloseTo(2, 10);
    expect(out.output[0][1]).toBeCloseTo(3, 10);
  });

  it("h=2 (d_head=1): each 1-dim head still means its column → [2, 3]", () => {
    const out = MHA.calculate({ query, key, value, numHeads: 2 });
    expect(out.dHead).toBe(1);
    expect(out.headWeights).toHaveLength(2);
    expect(out.output[0][0]).toBeCloseTo(2, 10);
    expect(out.output[0][1]).toBeCloseTo(3, 10);
    // each head's weights are a valid distribution
    for (const hw of out.headWeights) {
      for (const row of hw) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });
});

describe("MultiHeadAttention — projections", () => {
  const query = [[0.5, 0.5]];
  const key = [[1, 1], [1, 1]];
  const value = [[1, 2], [3, 4]];

  it("identity projections == no projections", () => {
    const a = MHA.calculate({ query, key, value, numHeads: 1 });
    const b = MHA.calculate({ query, key, value, numHeads: 1, wq: I2, wk: I2, wv: I2, wo: I2 });
    expect(b.output[0][0]).toBeCloseTo(a.output[0][0], 12);
    expect(b.output[0][1]).toBeCloseTo(a.output[0][1], 12);
  });

  it("output projection Wo = 2·I doubles the output", () => {
    const base = MHA.calculate({ query, key, value, numHeads: 1 });
    const scaled = MHA.calculate({ query, key, value, numHeads: 1, wo: [[2, 0], [0, 2]] });
    expect(scaled.output[0][0]).toBeCloseTo(2 * base.output[0][0], 10);
    expect(scaled.output[0][1]).toBeCloseTo(2 * base.output[0][1], 10);
  });

  it("a value projection that swaps columns swaps the output", () => {
    const swap = [[0, 1], [1, 0]];
    const out = MHA.calculate({ query, key, value, numHeads: 1, wv: swap });
    // value·swap = [[2,1],[4,3]] → column means [3, 2]
    expect(out.output[0][0]).toBeCloseTo(3, 10);
    expect(out.output[0][1]).toBeCloseTo(2, 10);
  });
});

describe("MultiHeadAttention — causal passthrough", () => {
  it("h=1 causal equals the inner causal attention", () => {
    const query = [[1, 0], [0, 1], [1, 1]];
    const key = query;
    const value = [[1, 0], [0, 1], [1, 1]];
    const mha = MHA.calculate({ query, key, value, numHeads: 1, causal: true });
    const sdpa = SDPA.calculate({ query, key, value, causal: true });
    for (let i = 0; i < sdpa.output.length; i++)
      for (let j = 0; j < sdpa.output[i].length; j++)
        expect(mha.output[i][j]).toBeCloseTo(sdpa.output[i][j], 12);
    // causal: first query attends only to itself → its weights are [1, 0, 0]
    expect(mha.headWeights[0][0][1]).toBeCloseTo(0, 12);
    expect(mha.headWeights[0][0][2]).toBeCloseTo(0, 12);
  });
});

describe("MultiHeadAttention — failure modes", () => {
  const q = [[1, 2, 3, 4]], k = [[1, 2, 3, 4]], v = [[5, 6, 7, 8]];
  it("rejects d_model not divisible by numHeads", () => {
    expect(MHA.validate({ query: q, key: k, value: v, numHeads: 3 }).valid).toBe(false); // 4 % 3 ≠ 0
  });
  it("rejects numHeads < 1", () => {
    expect(MHA.validate({ query: q, key: k, value: v, numHeads: 0 }).valid).toBe(false);
  });
  it("rejects a wrongly-shaped projection", () => {
    expect(MHA.validate({ query: q, key: k, value: v, numHeads: 2, wq: [[1, 0], [0, 1]] }).valid).toBe(false); // needs 4×4
  });
  it("rejects key/value length mismatch", () => {
    expect(MHA.validate({ query: q, key: [[1, 2, 3, 4], [5, 6, 7, 8]], value: v, numHeads: 2 }).valid).toBe(false);
  });
  it("throws on calculate with invalid input", () => {
    expect(() => MHA.calculate({ query: q, key: k, value: v, numHeads: 3 })).toThrow(/invalid/i);
  });
});

describe("MultiHeadAttention — adversarial inputs", () => {
  it("rejects NaN / Infinity", () => {
    expect(MHA.validate({ query: [[1, NaN]], key: [[1, 2]], value: [[1, 2]], numHeads: 1 }).valid).toBe(false);
    expect(MHA.validate({ query: [[1, 2]], key: [[Infinity, 2]], value: [[1, 2]], numHeads: 1 }).valid).toBe(false);
  });
  it("rejects empty / non-rectangular", () => {
    expect(MHA.validate({ query: [] as unknown as number[][], key: [[1]], value: [[1]], numHeads: 1 }).valid).toBe(false);
    expect(MHA.validate({ query: [[1, 2], [3]], key: [[1, 2]], value: [[1, 2]], numHeads: 1 }).valid).toBe(false);
  });
});

describe("MultiHeadAttention — metadata", () => {
  it("exposes ml/deep-learning metadata with the Vaswani reference", () => {
    const m = MHA.getMetadata();
    expect(m.id).toBe("multi_head_attention");
    expect(m.domain).toBe("ml");
    expect(m.category).toBe("deep-learning");
    expect(m.reference).toMatch(/Attention Is All You Need/i);
  });
});
