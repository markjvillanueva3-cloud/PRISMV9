import { describe, it, expect } from "vitest";
import { ViterbiDecoder as VIT, type ViterbiInput } from "./ViterbiDecoder.js";

// Canonical Wikipedia "healthy/fever" HMM.
// states: 0=Healthy, 1=Fever ; obs: 0=normal, 1=cold, 2=dizzy
const HMM: ViterbiInput = {
  startProb: [0.6, 0.4],
  transitionProb: [
    [0.7, 0.3], // Healthy → {Healthy, Fever}
    [0.4, 0.6], // Fever   → {Healthy, Fever}
  ],
  emissionProb: [
    [0.5, 0.4, 0.1], // Healthy → {normal, cold, dizzy}
    [0.1, 0.3, 0.6], // Fever   → {normal, cold, dizzy}
  ],
  observations: [0, 1, 2], // normal, cold, dizzy
};

describe("ViterbiDecoder — reference (canonical healthy/fever HMM)", () => {
  const out = VIT.calculate(HMM);

  it("decodes the textbook MAP path Healthy → Healthy → Fever", () => {
    expect(out.path).toEqual([0, 0, 1]);
  });

  it("reports the correct best-path log-probability (≈ ln 0.01512)", () => {
    // P(best) = 0.6·0.5 · 0.7·0.4 · 0.3·0.6 = 0.01512
    expect(out.prob).toBeCloseTo(0.01512, 8);
    expect(out.logProb).toBeCloseTo(Math.log(0.01512), 6);
    expect([out.nStates, out.nObs, out.length]).toEqual([2, 3, 3]);
  });
});

describe("ViterbiDecoder — properties", () => {
  it("single observation → argmax of π·B(o)", () => {
    const out = VIT.calculate({ ...HMM, observations: [2] }); // dizzy
    // Healthy: 0.6·0.1=0.06 ; Fever: 0.4·0.6=0.24 → Fever
    expect(out.path).toEqual([1]);
    expect(out.prob).toBeCloseTo(0.24, 8);
  });

  it("empty observation sequence → empty path, logProb 0", () => {
    const out = VIT.calculate({ ...HMM, observations: [] });
    expect(out.path).toEqual([]);
    expect(out.logProb).toBe(0);
  });

  it("logInput:true matches probability input (same decode)", () => {
    const log = (m: number[][]) => m.map((r) => r.map((p) => (p === 0 ? -Infinity : Math.log(p))));
    const out = VIT.calculate({
      observations: HMM.observations,
      startProb: HMM.startProb.map((p) => Math.log(p)),
      transitionProb: log(HMM.transitionProb),
      emissionProb: log(HMM.emissionProb),
      logInput: true,
    });
    expect(out.path).toEqual([0, 0, 1]);
    expect(out.logProb).toBeCloseTo(Math.log(0.01512), 6);
  });

  it("impossible transition (log 0) is handled — forced path still decodes", () => {
    // Fever unreachable from start and from Healthy → must stay Healthy
    const out = VIT.calculate({
      startProb: [1, 0],
      transitionProb: [[1, 0], [1, 0]],
      emissionProb: [[0.5, 0.5], [0.5, 0.5]],
      observations: [0, 1, 0],
    });
    expect(out.path).toEqual([0, 0, 0]);
    expect(Number.isFinite(out.logProb)).toBe(true);
  });

  it("deterministic — repeated decode is identical", () => {
    expect(VIT.calculate(HMM).path).toEqual(VIT.calculate(HMM).path);
  });
});

describe("ViterbiDecoder — failure modes", () => {
  it("rejects observation index out of range", () => {
    const bad = { ...HMM, observations: [0, 5] };
    expect(VIT.validate(bad).valid).toBe(false);
    expect(() => VIT.calculate(bad)).toThrow(/range|invalid/i);
  });
  it("rejects transition matrix wrong shape", () => {
    expect(VIT.validate({ ...HMM, transitionProb: [[1]] }).valid).toBe(false);
  });
  it("rejects empty startProb", () => {
    expect(VIT.validate({ ...HMM, startProb: [] }).valid).toBe(false);
  });
  it("rejects probabilities outside [0,1] when logInput is false", () => {
    expect(VIT.validate({ ...HMM, startProb: [1.5, -0.5] }).valid).toBe(false);
  });
});

describe("ViterbiDecoder — adversarial inputs", () => {
  it("rejects NaN in emission matrix", () => {
    expect(VIT.validate({ ...HMM, emissionProb: [[NaN, 0.5, 0.5], [0.1, 0.3, 0.6]] }).valid).toBe(false);
  });
  it("warns (not error) when rows don't sum to 1 but still decodes", () => {
    const out = VIT.calculate({
      startProb: [0.6, 0.4],
      transitionProb: [[0.7, 0.3], [0.4, 0.6]],
      emissionProb: [[0.9, 0.9, 0.9], [0.1, 0.3, 0.6]], // row 0 sums > 1
      observations: [0, 1],
    });
    expect(out.warnings.join(" ")).toMatch(/sum to 1/i);
    expect(out.path).toHaveLength(2);
  });
});

describe("ViterbiDecoder — metadata", () => {
  it("exposes ml/sequence-inference metadata with the Viterbi reference", () => {
    const m = VIT.getMetadata();
    expect(m.id).toBe("viterbi_decoder");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Viterbi/i);
  });
});
