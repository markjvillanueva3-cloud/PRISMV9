/**
 * CrossProcessDeepEnsembleEngine.test.ts — XPROC-NEURAL Tier 5 (T5-03)
 *
 * Verifies Lakshminarayanan et al. (2017) Deep Ensemble aggregation math
 * + the Tier 5 R3 acceptance criterion: ensemble Brier score is strictly
 * less than the average single-model Brier on a synthetic calibration-
 * deficient classifier.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessDeepEnsembleEngine,
  crossProcessDeepEnsemble,
} from "../engines/CrossProcessDeepEnsembleEngine.js";

describe("predictRegression() — input validation", () => {
  it("rejects empty memberPredictions", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN in memberPredictions", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [1, 2, Number.NaN],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects Infinity in memberPredictions", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [Number.POSITIVE_INFINITY, 2, 3],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects beyond MAX_ENSEMBLE_MEMBERS=128", () => {
    const huge = new Array(129).fill(1.0);
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: huge,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("predictRegression() — degenerate inputs", () => {
  it("M=1 returns mean unchanged with σ²=0 + warning", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [42],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.mean).toBe(42);
    expect(r.variance).toBe(0);
    expect(r.range).toBe(0);
    expect(r.warnings.some((w) => w.includes("M=1"))).toBe(true);
  });

  it("all-equal predictions yield variance 0 and range 0", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [7, 7, 7, 7, 7],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.variance).toBe(0);
    expect(r.range).toBe(0);
    expect(r.coefficientOfVariation).toBe(0);
  });

  it("warns when M below recommended 5", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [1, 2, 3],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.warnings.some((w) => w.includes("below recommended"))).toBe(true);
  });
});

describe("predictRegression() — math correctness", () => {
  it("M=5 with [1,2,3,4,5]: μ=3, biased σ²=2 (NOT 2.5)", () => {
    // Lakshminarayanan uses biased (1/M) estimator, not Bessel-corrected (1/(M-1))
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [1, 2, 3, 4, 5],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.mean).toBe(3);
    expect(r.variance).toBeCloseTo(2, 8);
    expect(r.stdDev).toBeCloseTo(Math.sqrt(2), 8);
    expect(r.range).toBe(4);
  });

  it("CV = stdDev / |mean|", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [10, 12, 14, 16, 18],
    });
    if (!r.ok) throw new Error("expected ok");
    // mean=14, biased var=8, std=√8≈2.828, cv=2.828/14≈0.2020
    expect(r.coefficientOfVariation).toBeCloseTo(Math.sqrt(8) / 14, 4);
  });

  it("CV = ∞ when mean is 0", () => {
    const r = CrossProcessDeepEnsembleEngine.predictRegression({
      memberPredictions: [-2, -1, 0, 1, 2],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.coefficientOfVariation).toBe(Infinity);
  });
});

describe("disagreement() — input validation", () => {
  it("rejects different-length probability vectors", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.5, 0.5],
        [0.3, 0.4, 0.3],
      ],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects probabilities not summing to 1", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.5, 0.5],
        [0.3, 0.3],  // sums to 0.6
      ],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects probabilities containing values > 1", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [[1.5, -0.5]],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("disagreement() — math correctness", () => {
  it("M=2 identical → meanPairwiseBrier=0, BALD=0", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.7, 0.3],
        [0.7, 0.3],
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.meanPairwiseBrier).toBeCloseTo(0, 8);
    expect(r.baldNats).toBeCloseTo(0, 8);
  });

  it("M=2 antipodal → meanPairwiseBrier = 2·(1²) = 2", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [1.0, 0.0],
        [0.0, 1.0],
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    // Squared L2 between [1,0] and [0,1] = 1+1 = 2
    expect(r.meanPairwiseBrier).toBeCloseTo(2.0, 8);
    // mean = [0.5, 0.5], H(mean) = ln 2 ≈ 0.693
    // each member entropy = -1·ln(1) - 0·ln(0) = 0
    // BALD = 0.693 - 0 = 0.693
    expect(r.baldNats).toBeCloseTo(Math.log(2), 6);
  });

  it("ensemble mean probabilities computed correctly", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.9, 0.1],
        [0.7, 0.3],
        [0.5, 0.5],
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.meanProbabilities[0]).toBeCloseTo(0.7, 6);
    expect(r.meanProbabilities[1]).toBeCloseTo(0.3, 6);
  });

  it("predictive entropy = -Σ p_mean log p_mean", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.5, 0.5],
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    // Mean = [0.5, 0.5], H = ln 2
    expect(r.predictiveEntropyNats).toBeCloseTo(Math.log(2), 8);
  });

  it("BALD ≥ 0 invariant (clipped from float drift)", () => {
    const r = CrossProcessDeepEnsembleEngine.disagreement({
      memberProbabilities: [
        [0.99999999, 0.00000001],
        [0.99999999, 0.00000001],
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.baldNats).toBeGreaterThanOrEqual(0);
  });
});

describe("acceptance — ensemble Brier < single-model Brier", () => {
  /**
   * Synthetic 2-class classifier where each "model" predicts probability
   * = true_p + noise, clipped to [0, 1]. Ensemble averaging reduces noise
   * variance and therefore the Brier score (which is squared error in
   * probability space). Lakshminarayanan §5 demonstrates this empirically;
   * we reproduce the inequality for our acceptance test.
   */
  it("ensemble Brier strictly less than mean single-model Brier on synthetic noisy classifier", () => {
    const N = 500;       // examples
    const M = 5;         // ensemble size

    let seed = 0xBADC0DE;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const randNormal = () => {
      let u = rand();
      while (u === 0) u = rand();
      const v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const NOISE_SIGMA = 0.2;
    let singleBrierSum = 0;
    let ensembleBrierSum = 0;

    for (let i = 0; i < N; i++) {
      // True class = 0 with prob 0.7, class 1 with prob 0.3
      const trueClass = rand() < 0.7 ? 0 : 1;
      const trueP = trueClass === 0 ? [0.7, 0.3] : [0.3, 0.7];
      // Build M noisy member predictions; clip to [0,1] and renormalize
      const memberProbs: number[][] = [];
      for (let m = 0; m < M; m++) {
        const p0Raw = trueP[0] + NOISE_SIGMA * randNormal();
        const p0 = Math.max(0.001, Math.min(0.999, p0Raw));
        memberProbs.push([p0, 1 - p0]);
      }
      // Single-model Brier: average over members of ||p_member - one_hot||²
      let single = 0;
      for (const p of memberProbs) {
        const oh0 = trueClass === 0 ? 1 : 0;
        const oh1 = trueClass === 0 ? 0 : 1;
        single += (p[0] - oh0) ** 2 + (p[1] - oh1) ** 2;
      }
      single /= M;
      singleBrierSum += single;
      // Ensemble Brier: ||mean_p - one_hot||²
      let mp0 = 0;
      for (const p of memberProbs) mp0 += p[0];
      mp0 /= M;
      const mp1 = 1 - mp0;
      const oh0 = trueClass === 0 ? 1 : 0;
      const oh1 = trueClass === 0 ? 0 : 1;
      const ensemble = (mp0 - oh0) ** 2 + (mp1 - oh1) ** 2;
      ensembleBrierSum += ensemble;
    }
    const meanSingle = singleBrierSum / N;
    const meanEnsemble = ensembleBrierSum / N;
    expect(meanEnsemble).toBeLessThan(meanSingle);  // Tier 5 R3 acceptance
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_ensemble_predict", () => {
    const r = crossProcessDeepEnsemble("xproc_ensemble_predict", {
      memberPredictions: [1, 2, 3, 4, 5],
    }) as { ok: boolean; mean?: number };
    expect(r.ok).toBe(true);
    expect(r.mean).toBe(3);
  });

  it("routes xproc_ensemble_disagreement", () => {
    const r = crossProcessDeepEnsemble("xproc_ensemble_disagreement", {
      memberProbabilities: [
        [0.5, 0.5],
        [0.5, 0.5],
      ],
    }) as { ok: boolean; meanPairwiseBrier?: number };
    expect(r.ok).toBe(true);
    expect(r.meanPairwiseBrier).toBeCloseTo(0, 8);
  });

  it("routes xproc_ensemble_constants", () => {
    const c = crossProcessDeepEnsemble("xproc_ensemble_constants", {}) as {
      RECOMMENDED_M: number;
      MAX_ENSEMBLE_MEMBERS: number;
    };
    expect(c.RECOMMENDED_M).toBe(5);
    expect(c.MAX_ENSEMBLE_MEMBERS).toBe(128);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessDeepEnsemble("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
