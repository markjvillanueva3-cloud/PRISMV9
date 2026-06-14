import { describe, it, expect } from "vitest";
import { TransformerBlock as TB, type TransformerBlockInput } from "./TransformerBlock.js";

const Z2 = [[0, 0], [0, 0]];   // zero 2×2
const I2 = [[1, 0], [0, 1]];   // identity 2×2

describe("TransformerBlock — identity invariant (zero W_v + zero FFN ⇒ out = x)", () => {
  it("returns the input unchanged when both sublayers are zeroed", () => {
    const x = [[3, 5], [7, 11]];
    const out = TB.calculate({
      x, numHeads: 1,
      wv: Z2,                       // attention contributes 0
      w1: Z2, b1: [0, 0], w2: Z2, b2: [0, 0], // FFN contributes 0
    });
    for (let i = 0; i < x.length; i++)
      for (let j = 0; j < x[i].length; j++)
        expect(out.output[i][j]).toBeCloseTo(x[i][j], 10);
    // sublayer contributions are exactly zero
    out.attentionOutput.forEach((r) => r.forEach((v) => expect(v).toBeCloseTo(0, 10)));
    out.ffnOutput.forEach((r) => r.forEach((v) => expect(v).toBeCloseTo(0, 10)));
  });
});

describe("TransformerBlock — fully hand-derived FFN path", () => {
  it("x=[[1,1]], wv=0, w1=I, b1=[1,-1], w2=I, relu ⇒ output=[[2,1]]", () => {
    // pre-LN: LN1([1,1])=[0,0] → MHA(wv=0)=0 → a=x=[1,1]
    //         LN2([1,1])=[0,0] → FFN: relu([0,0]+[1,-1])=[1,0]; ·I+0=[1,0]
    //         out = a + ffn = [1,1]+[1,0] = [2,1]
    const out = TB.calculate({
      x: [[1, 1]], numHeads: 1,
      wv: Z2,
      w1: I2, b1: [1, -1], w2: I2, b2: [0, 0],
      activation: "relu",
    });
    expect(out.output[0][0]).toBeCloseTo(2, 8);
    expect(out.output[0][1]).toBeCloseTo(1, 8);
    expect(out.ffnOutput[0][0]).toBeCloseTo(1, 8);
    expect(out.ffnOutput[0][1]).toBeCloseTo(0, 8);
    expect(out.attentionOutput[0][0]).toBeCloseTo(0, 10);
  });
});

describe("TransformerBlock — residual structure (pre-LN)", () => {
  it("output = x + attentionOutput + ffnOutput exactly", () => {
    const x = [[1, 0, 2, -1], [0.5, 1, -1, 2]];
    const out = TB.calculate({
      x, numHeads: 2,
      w1: [[1, 0], [0, 1], [1, 1], [-1, 0]],     // [d_model=4 × d_ff=2]
      b1: [0.1, -0.2],
      w2: [[1, 0, 0, 1], [0, 1, 1, 0]],          // [d_ff=2 × d_model=4]
      b2: [0, 0, 0, 0],
      activation: "gelu",
    });
    expect(out.dFF).toBe(2);
    for (let i = 0; i < x.length; i++)
      for (let j = 0; j < x[i].length; j++) {
        const recombined = x[i][j] + out.attentionOutput[i][j] + out.ffnOutput[i][j];
        expect(out.output[i][j]).toBeCloseTo(recombined, 10);
      }
  });
});

describe("TransformerBlock — variability (preNorm/postNorm, relu/gelu)", () => {
  const base: TransformerBlockInput = {
    x: [[1, 2], [3, 4]], numHeads: 1,
    w1: I2, b1: [0.5, 0.5], w2: I2, b2: [0, 0],
  };
  it("post-LN produces a finite, correctly-shaped output", () => {
    const out = TB.calculate({ ...base, preNorm: false });
    expect(out.preNorm).toBe(false);
    expect(out.output).toHaveLength(2);
    out.output.forEach((r) => { expect(r).toHaveLength(2); r.forEach((v) => expect(Number.isFinite(v)).toBe(true)); });
  });
  it("relu and gelu give different outputs for the same weights", () => {
    const r = TB.calculate({ ...base, activation: "relu" });
    const g = TB.calculate({ ...base, activation: "gelu" });
    const diff = Math.abs(r.output[0][0] - g.output[0][0]) + Math.abs(r.output[1][1] - g.output[1][1]);
    expect(diff).toBeGreaterThan(1e-9);
  });
  it("causal self-attention zeroes the upper triangle of head weights", () => {
    const out = TB.calculate({ ...base, causal: true });
    expect(out.headWeights[0][0][1]).toBeCloseTo(0, 12); // position 0 cannot attend to position 1
  });
});

describe("TransformerBlock — failure modes", () => {
  const ok = { x: [[1, 2], [3, 4]], numHeads: 1, w1: I2, b1: [0, 0], w2: I2, b2: [0, 0] };
  it("rejects missing/!shaped FFN weights", () => {
    expect(TB.validate({ ...ok, w1: undefined as unknown as number[][] }).valid).toBe(false);
    expect(TB.validate({ ...ok, w2: [[1, 0, 0]] }).valid).toBe(false); // wrong shape
  });
  it("rejects b1 of wrong length", () => {
    expect(TB.validate({ ...ok, b1: [0, 0, 0] }).valid).toBe(false); // d_ff=2
  });
  it("rejects d_model not divisible by numHeads", () => {
    expect(TB.validate({ x: [[1, 2, 3]], numHeads: 2, w1: [[1], [1], [1]], b1: [0], w2: [[1, 1, 1]], b2: [0, 0, 0] }).valid).toBe(false);
  });
  it("rejects an unknown activation", () => {
    expect(TB.validate({ ...ok, activation: "swish" as unknown as "relu" }).valid).toBe(false);
  });
  it("throws on calculate with invalid input", () => {
    expect(() => TB.calculate({ ...ok, w1: undefined as unknown as number[][] })).toThrow(/invalid/i);
  });
});

describe("TransformerBlock — adversarial inputs", () => {
  const ok = { numHeads: 1, w1: I2, b1: [0, 0], w2: I2, b2: [0, 0] };
  it("rejects NaN / Infinity in x", () => {
    expect(TB.validate({ ...ok, x: [[1, NaN]] }).valid).toBe(false);
    expect(TB.validate({ ...ok, x: [[1, 2], [Infinity, 4]] }).valid).toBe(false);
  });
  it("rejects empty x", () => {
    expect(TB.validate({ ...ok, x: [] as unknown as number[][] }).valid).toBe(false);
  });
});

describe("TransformerBlock — metadata", () => {
  it("exposes ml/deep-learning metadata", () => {
    const m = TB.getMetadata();
    expect(m.id).toBe("transformer_block");
    expect(m.domain).toBe("ml");
    expect(m.category).toBe("deep-learning");
    expect(m.reference).toMatch(/Attention Is All You Need/i);
  });
});
