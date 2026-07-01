import { describe, it, expect } from "vitest";
import { BeamSearchDecoder as BS, type BeamSearchInput } from "./BeamSearchDecoder.js";

const L = Math.log;
// emissions strongly favouring token 0 at both steps
const EM = [[L(0.9), L(0.1)], [L(0.9), L(0.1)]];

describe("BeamSearchDecoder — independent steps (no transition)", () => {
  it("top sequence is the argmax path [0,0] with score 2·log(0.9)", () => {
    const out = BS.calculate({ emissions: EM, beamWidth: 2 });
    expect(out.sequences[0]).toEqual([0, 0]);
    expect(out.scores[0]).toBeCloseTo(2 * L(0.9), 10);
    expect(out.exact).toBe(true); // B=2 ≥ V=2
  });

  it("returns scores in descending order", () => {
    const out = BS.calculate({ emissions: EM, beamWidth: 2, topK: 2 });
    for (let i = 1; i < out.scores.length; i++) {
      expect(out.scores[i]).toBeLessThanOrEqual(out.scores[i - 1]);
    }
  });
});

describe("BeamSearchDecoder — transition model changes the optimum", () => {
  it("a heavy stay-penalty makes the best path SWITCH tokens", () => {
    // emissions favour token 0 twice, but staying on the same token costs -10
    const transition = [[-10, 0], [0, -10]];
    const out = BS.calculate({ emissions: EM, transition, beamWidth: 2 });
    const best = out.sequences[0];
    expect(best[0]).not.toBe(best[1]); // [0,1] or [1,0], NOT [0,0]
    // best switching score: log(0.9) + 0 + log(0.1)
    expect(out.scores[0]).toBeCloseTo(L(0.9) + 0 + L(0.1), 10);
  });

  it("an initial prior shifts the first-token choice", () => {
    // emissions equal; prior strongly favours token 1
    const flat = [[L(0.5), L(0.5)], [L(0.5), L(0.5)]];
    const out = BS.calculate({ emissions: flat, initial: [L(0.01), L(0.99)], beamWidth: 2 });
    expect(out.sequences[0][0]).toBe(1);
  });
});

describe("BeamSearchDecoder — beam width / exactness", () => {
  it("greedy (B=1) decodes the per-step argmax and flags inexact", () => {
    const out = BS.calculate({ emissions: EM, beamWidth: 1 });
    expect(out.sequences[0]).toEqual([0, 0]);
    expect(out.exact).toBe(false); // B=1 < V=2
    expect(out.warnings.join(" ")).toMatch(/approximate/i);
  });

  it("B ≥ V is exact: top-1 equals the global MAP path", () => {
    // build a 3-step, 3-vocab trellis; with B=3=V beam is exact
    const em = [
      [L(0.6), L(0.3), L(0.1)],
      [L(0.2), L(0.7), L(0.1)],
      [L(0.1), L(0.2), L(0.7)],
    ];
    const out = BS.calculate({ emissions: em, beamWidth: 3 });
    expect(out.exact).toBe(true);
    expect(out.sequences[0]).toEqual([0, 1, 2]); // per-step argmax (independent steps)
    expect(out.scores[0]).toBeCloseTo(L(0.6) + L(0.7) + L(0.7), 10);
  });

  it("topK > beamWidth is capped with a warning", () => {
    const out = BS.calculate({ emissions: EM, beamWidth: 2, topK: 10 });
    expect(out.sequences.length).toBeLessThanOrEqual(2);
    expect(out.warnings.join(" ")).toMatch(/capped/i);
  });
});

describe("BeamSearchDecoder — single step / single token", () => {
  it("T=1 returns the top tokens ranked by emission", () => {
    const out = BS.calculate({ emissions: [[L(0.1), L(0.7), L(0.2)]], beamWidth: 3 });
    expect(out.sequences[0]).toEqual([1]);
    expect(out.steps).toBe(1);
  });
});

describe("BeamSearchDecoder — failure modes", () => {
  it("rejects empty / ragged emissions", () => {
    expect(BS.validate({ emissions: [] as unknown as number[][], beamWidth: 2 }).valid).toBe(false);
    expect(BS.validate({ emissions: [[1, 2], [3]], beamWidth: 2 }).valid).toBe(false);
  });
  it("rejects beamWidth < 1", () => {
    expect(BS.validate({ emissions: EM, beamWidth: 0 }).valid).toBe(false);
  });
  it("rejects a non-square / wrong-size transition", () => {
    expect(BS.validate({ emissions: EM, transition: [[0, 0, 0], [0, 0, 0]], beamWidth: 2 }).valid).toBe(false);
  });
  it("rejects initial of wrong length", () => {
    expect(BS.validate({ emissions: EM, initial: [0, 0, 0], beamWidth: 2 }).valid).toBe(false);
  });
  it("throws on calculate with invalid input", () => {
    expect(() => BS.calculate({ emissions: [[1, 2], [3]], beamWidth: 2 })).toThrow(/invalid/i);
  });
});

describe("BeamSearchDecoder — adversarial inputs", () => {
  it("rejects NaN / Infinity in emissions", () => {
    expect(BS.validate({ emissions: [[1, NaN], [3, 4]], beamWidth: 2 }).valid).toBe(false);
    expect(BS.validate({ emissions: [[1, 2], [Infinity, 4]], beamWidth: 2 }).valid).toBe(false);
  });
  it("rejects NaN in transition", () => {
    expect(BS.validate({ emissions: EM, transition: [[0, NaN], [0, 0]], beamWidth: 2 }).valid).toBe(false);
  });
});

describe("BeamSearchDecoder — metadata", () => {
  it("exposes ml/sequence-decoding metadata", () => {
    const m = BS.getMetadata();
    expect(m.id).toBe("beam_search_decoder");
    expect(m.domain).toBe("ml");
    expect(m.category).toBe("sequence-decoding");
  });
});
