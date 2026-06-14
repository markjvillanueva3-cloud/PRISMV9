/**
 * CADJMDieArchetypeFrequencyEngine — CAD-COMPLETE-MS0/U-CADC33 tests.
 */

import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_FREQUENCY_PRIOR,
  CADJMDieArchetypeFrequencyEngine,
  applyEvidence,
  cadJMDieArchetypeFrequencyEngine,
  getFrequencyPrior,
  rankByFrequency,
  sumPriors,
} from "../engines/CADJMDieArchetypeFrequencyEngine.js";

describe("ARCHETYPE_FREQUENCY_PRIOR invariants", () => {
  it("covers all 8 archetypes from the registry (no missing kinds)", () => {
    expect(ARCHETYPE_FREQUENCY_PRIOR.size).toBe(8);
  });

  it("frequencies sum to 1.0 within float tolerance (valid probability distribution)", () => {
    expect(sumPriors()).toBeCloseTo(1.0, 6);
  });

  it("every frequency is in [0, 1] (valid probability)", () => {
    for (const v of ARCHETYPE_FREQUENCY_PRIOR.values()) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("registry map is frozen (consumer mutation guard)", () => {
    expect(Object.isFrozen(ARCHETYPE_FREQUENCY_PRIOR)).toBe(true);
  });
});

describe("getFrequencyPrior", () => {
  it("returns 0.42 for hole_simple (most common JM Die feature)", () => {
    expect(getFrequencyPrior("hole_simple")).toBe(0.42);
  });

  it("returns 0.02 for keyway (rare in JM Die mix)", () => {
    expect(getFrequencyPrior("keyway")).toBe(0.02);
  });

  it("returns 0 for unknown kind (silent default for downstream Bayes math)", () => {
    expect(getFrequencyPrior("nonexistent" as never)).toBe(0);
  });
});

describe("rankByFrequency", () => {
  it("returns 8 entries in descending frequency order", () => {
    const r = rankByFrequency();
    expect(r.length).toBe(8);
    expect(r[0].kind).toBe("hole_simple");
    expect(r[0].frequency).toBe(0.42);
    expect(r[r.length - 1].kind).toBe("keyway");
  });

  it("respects descending order across all adjacent pairs", () => {
    const r = rankByFrequency();
    for (let i = 0; i < r.length - 1; i++) {
      expect(r[i].frequency).toBeGreaterThanOrEqual(r[i + 1].frequency);
    }
  });
});

describe("applyEvidence (Bayesian posterior)", () => {
  it("uniform likelihood preserves the prior ranking (perception says equal evidence everywhere)", () => {
    const likelihoods: Record<string, number> = {};
    for (const k of ARCHETYPE_FREQUENCY_PRIOR.keys()) likelihoods[k] = 1;
    const post = applyEvidence(likelihoods);
    expect(post[0].kind).toBe("hole_simple");
    expect(post[0].posterior).toBeCloseTo(0.42, 6);
  });

  it("strong likelihood on a low-prior kind can flip the ranking (Bayes works as intended)", () => {
    const likelihoods: Record<string, number> = { keyway: 100, hole_simple: 0.01 };
    const post = applyEvidence(likelihoods);
    expect(post[0].kind).toBe("keyway"); // 0.02 × 100 = 2.0 > 0.42 × 0.01 = 0.0042
  });

  it("missing likelihood defaults to 0 (no evidence → no posterior weight)", () => {
    const likelihoods: Record<string, number> = { hole_simple: 1 }; // only this one has evidence
    const post = applyEvidence(likelihoods);
    expect(post[0].kind).toBe("hole_simple");
    expect(post[0].posterior).toBeCloseTo(0.42, 6);
    expect(post[1].posterior).toBe(0); // all others zero out
  });

  it("throws (R12 fail-loud) on negative likelihood — never silently clamps", () => {
    expect(() => applyEvidence({ hole_simple: -1 })).toThrow(/non-negative/);
  });

  it("throws on NaN/Infinity likelihood (adversarial input floor per build-enforce)", () => {
    expect(() => applyEvidence({ hole_simple: NaN })).toThrow();
    expect(() => applyEvidence({ hole_simple: Infinity })).toThrow();
  });
});

describe("CADJMDieArchetypeFrequencyEngine class wrapper", () => {
  it("singleton and class agree on the priors", () => {
    const eng = new CADJMDieArchetypeFrequencyEngine();
    expect(eng.prior("hole_simple")).toBe(cadJMDieArchetypeFrequencyEngine.prior("hole_simple"));
  });

  it("summary reports schemaVersion=1 + sourceCorpus + sum=1 + top1=hole_simple", () => {
    const s = cadJMDieArchetypeFrequencyEngine.summary();
    expect(s.schemaVersion).toBe(1);
    expect(s.sourceCorpus).toBe("JM_DIE_2026_05_23");
    expect(s.count).toBe(8);
    expect(s.sumPriors).toBeCloseTo(1.0, 6);
    expect(s.top1.kind).toBe("hole_simple");
  });
});
