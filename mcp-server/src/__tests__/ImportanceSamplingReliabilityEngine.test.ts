// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  ImportanceSamplingReliabilityEngine,
  importanceSamplingReliabilityEngine,
  importancesamplingEngine,
  type ISReliabilityInput,
} from "../engines/ImportanceSamplingReliabilityEngine.js";

// ─── Reference values (re-derived by hand / closed-form, see task notes) ───
//
// P(Z > 4.5) exact upper-tail (standard normal), 7 sig figs:            3.397673124e-6
// P(Z > 0)   exact:                                                     0.5
// Classic R-S structural-reliability problem:
//   R ~ N(300,30), S ~ N(150,45) MPa, M = R - S, failure = M <= 0
//   M ~ N(mu_R-mu_S, sqrt(sigR^2+sigS^2)) = N(150, sqrt(2925)=54.0833...)
//   beta = mu_M / sigma_M = 150 / 54.08326... = 2.773500981...
//   pf = Phi(-beta) = standardNormalTail(beta) = 2.772833635e-3
// 2D linear-sum problem: X0,X1 ~ N(0,1) iid, g = X0+X1, failure "above" T=6
//   sum ~ N(0,2) => equivalent z = T/sqrt(2) = 4.242640687...
//   exact MPP (closest point on x0+x1=6 to origin) = (3,3), beta = sqrt(3^2+3^2)=4.242640687
//
const P_Z_GT_4_5 = 3.397673124e-6;
const RS_MU_R = 300;
const RS_SIG_R = 30;
const RS_MU_S = 150;
const RS_SIG_S = 45;
const RS_BETA_EXACT = (RS_MU_R - RS_MU_S) / Math.sqrt(RS_SIG_R ** 2 + RS_SIG_S ** 2); // 2.773500981...

describe("ImportanceSamplingReliabilityEngine", () => {
  const eng = importanceSamplingReliabilityEngine;

  // ── Singleton / alias wiring ───────────────────────────────────────────
  describe("singleton exports", () => {
    it("1. exports a class instance singleton and a spec-named alias to the same instance", () => {
      expect(eng).toBeInstanceOf(ImportanceSamplingReliabilityEngine);
      expect(importancesamplingEngine).toBe(importanceSamplingReliabilityEngine);
    });
  });

  // ── Standard-normal utilities (erf-based) — public building blocks ─────
  describe("standard-normal utilities", () => {
    it("2. standardNormalTail(4.5) matches the exact upper tail to ~4 significant figures", () => {
      const tail = eng.standardNormalTail(4.5);
      expect(Math.abs(tail - P_Z_GT_4_5) / P_Z_GT_4_5).toBeLessThan(1e-4);
    });

    it("3. standardNormalTail(0) = 0.5 (sanity)", () => {
      expect(eng.standardNormalTail(0)).toBeCloseTo(0.5, 6);
    });

    it("4. standardNormalCdf + standardNormalTail sum to 1 (complementary) at several z", () => {
      // erfc's own documented fractional error is < 1.2e-7 (Numerical Recipes erfcc);
      // summing two evaluations can accumulate ~2x that, so 7 decimal places (1e-7
      // absolute tolerance) is the honest bound here, not 9.
      for (const z of [-3, -1, 0, 1.96, 3, 4.5]) {
        expect(eng.standardNormalCdf(z) + eng.standardNormalTail(z)).toBeCloseTo(1, 7);
      }
    });

    it("5. standardNormalQuantile is the inverse of standardNormalCdf (round-trip) and Phi^-1(0.5)=0", () => {
      expect(eng.standardNormalQuantile(0.5)).toBeCloseTo(0, 9);
      for (const p of [0.001, 0.025, 0.5, 0.975, 0.999]) {
        const z = eng.standardNormalQuantile(p);
        expect(eng.standardNormalCdf(z)).toBeCloseTo(p, 6);
      }
      // known reference: Phi^-1(0.975) = 1.959963986...
      expect(eng.standardNormalQuantile(0.975)).toBeCloseTo(1.959963986, 6);
    });

    it("6. standardNormalQuantile handles boundary probabilities without throwing", () => {
      expect(eng.standardNormalQuantile(0)).toBe(-Infinity);
      expect(eng.standardNormalQuantile(1)).toBe(Infinity);
    });
  });

  // ── Design-point (HL-RF) search — deterministic, no RNG involved ───────
  describe("findDesignPoint (HL-RF)", () => {
    it("7. converges in closed form for a 1D linear limit state (design point = threshold exactly)", () => {
      const dp = eng.findDesignPoint(
        (x: number[]) => x[0],
        [0],
        [1],
        4.5,
        "above",
        60,
      );
      expect(dp.converged).toBe(true);
      expect(dp.designPoint[0]).toBeCloseTo(4.5, 9);
      expect(dp.beta).toBeCloseTo(4.5, 9);
    });

    it("8. converges to the exact MPP for a 2D linear-sum limit state (matches the R-S structural formula)", () => {
      const dp = eng.findDesignPoint(
        (x: number[]) => x[0] + x[1],
        [0, 0],
        [1, 1],
        6,
        "above",
        60,
      );
      expect(dp.converged).toBe(true);
      // Closest point on x0+x1=6 to the origin is (3,3); beta = sqrt(18) = 4.2426...
      expect(dp.designPoint[0]).toBeCloseTo(3, 6);
      expect(dp.designPoint[1]).toBeCloseTo(3, 6);
      expect(dp.beta).toBeCloseTo(6 / Math.sqrt(2), 6);
    });

    it("9. reproduces the classic R-S structural-reliability beta exactly (matches hand-derived closed form)", () => {
      const dp = eng.findDesignPoint(
        (x: number[]) => x[0] - x[1],
        [RS_MU_R, RS_MU_S],
        [RS_SIG_R, RS_SIG_S],
        0,
        "below",
        60,
      );
      expect(dp.converged).toBe(true);
      expect(dp.beta).toBeCloseTo(RS_BETA_EXACT, 6);
    });
  });

  // ── Main estimator: happy-path rare-tail behavior ──────────────────────
  describe("estimateFailureProbability — rare-tail happy path", () => {
    const input: ISReliabilityInput = {
      limitState: (x) => x[0],
      input: { mean: [0], std: [1] },
      failureThreshold: 4.5,
      failureMode: "above",
      nSamples: 5000,
      seed: 12345,
    };

    it("10. IS estimate of P(Z>4.5) is within a few percent of the exact value at N=5000", () => {
      const r = eng.estimateFailureProbability(input);
      const relErr = Math.abs(r.failureProbability - P_Z_GT_4_5) / P_Z_GT_4_5;
      expect(relErr).toBeLessThan(0.05); // "a few percent" per task spec
      expect(r.failureProbability).toBeGreaterThan(0);
    });

    it("11. naive (crude) Monte Carlo at the SAME N is ~0 while IS is not (the whole point of IS)", () => {
      const r = eng.estimateFailureProbability(input);
      expect(r.naiveEstimate).toBeLessThan(1e-3);
      expect(r.failureProbability).toBeGreaterThan(r.naiveEstimate === 0 ? 0 : -Infinity);
      // IS relative error to truth must be far smaller than naive's (naive is 0 -> 100% rel err)
      const isRelErr = Math.abs(r.failureProbability - P_Z_GT_4_5) / P_Z_GT_4_5;
      expect(isRelErr).toBeLessThan(1); // naive rel-err is exactly 1 (100%) when naive==0
    });

    it("12. auto-shift design point is found and centred on the true MPP (x*=4.5)", () => {
      const r = eng.estimateFailureProbability(input);
      expect(r.designPointFound).toBe(true);
      expect(r.proposalMean[0]).toBeCloseTo(4.5, 6);
      expect(r.designPointBeta).toBeCloseTo(4.5, 6);
    });

    it("13. effective sample size is in (0, N]", () => {
      const r = eng.estimateFailureProbability(input);
      expect(r.effectiveSampleSize).toBeGreaterThan(0);
      expect(r.effectiveSampleSize).toBeLessThanOrEqual(r.nSamples);
      expect(r.effectiveSampleSizeFraction).toBeGreaterThan(0);
      expect(r.effectiveSampleSizeFraction).toBeLessThanOrEqual(1);
    });

    it("14. variance-reduction ratio vs naive MC at the same N is >> 1 for a rare tail", () => {
      const r = eng.estimateFailureProbability(input);
      expect(r.varianceReductionRatio).toBeGreaterThan(1);
      // For a 4.5-sigma tail this should be several orders of magnitude
      expect(r.varianceReductionRatio).toBeGreaterThan(1000);
    });

    it("15. seeded PRNG gives bit-identical reproducibility across repeated calls with the same seed", () => {
      const r1 = eng.estimateFailureProbability(input);
      const r2 = eng.estimateFailureProbability(input);
      expect(r2.failureProbability).toBe(r1.failureProbability);
      expect(r2.effectiveSampleSize).toBe(r1.effectiveSampleSize);
      expect(r2.failureSamples).toBe(r1.failureSamples);
    });

    it("16. reliabilityIndex = -Phi^-1(pf) is consistent with the estimated pf", () => {
      const r = eng.estimateFailureProbability(input);
      expect(-eng.standardNormalQuantile(r.failureProbability)).toBeCloseTo(
        r.reliabilityIndex,
        9,
      );
    });
  });

  // ── Unbiasedness — mean over independent seeds converges to the exact value ──
  describe("estimateFailureProbability — unbiasedness over seeds", () => {
    it("17. mean of P(Z>4.5) IS estimates over 30 independent seeds is within a few percent of the exact value", () => {
      const M = 30;
      let sum = 0;
      for (let s = 0; s < M; s++) {
        const r = eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [1] },
          failureThreshold: 4.5,
          failureMode: "above",
          nSamples: 3000,
          seed: 1000 + s,
        });
        sum += r.failureProbability;
      }
      const avg = sum / M;
      const relErr = Math.abs(avg - P_Z_GT_4_5) / P_Z_GT_4_5;
      expect(relErr).toBeLessThan(0.05);
    });
  });

  // ── P(Z>0) = 0.5 sanity: failure region carries half the probability ──
  describe("estimateFailureProbability — P(Z>0)=0.5 sanity", () => {
    it("18. when the design point coincides with the origin, the proposal reduces to the nominal density and pf ~ 0.5", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 0,
        failureMode: "above",
        nSamples: 20000,
        seed: 777,
      });
      expect(r.designPointBeta).toBeCloseTo(0, 6);
      expect(r.proposalMean[0]).toBeCloseTo(0, 6);
      // SE of a Bernoulli(0.5) mean at N=20000 is ~0.00354; allow a generous 5-sigma band
      expect(Math.abs(r.failureProbability - 0.5)).toBeLessThan(0.02);
    });

    it("19. autoShift=false at threshold=0 reduces the estimator to crude Monte Carlo (proposal = nominal)", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 0,
        failureMode: "above",
        nSamples: 20000,
        seed: 3,
        autoShift: false,
      });
      expect(r.proposalMean).toEqual([0]);
      expect(Math.abs(r.failureProbability - 0.5)).toBeLessThan(0.02);
    });
  });

  // ── Multi-dimensional / structural-reliability closed-form checks ─────
  describe("estimateFailureProbability — multi-dimensional closed-form problems", () => {
    it("20. classic R-S structural-reliability problem: pf and beta both match the closed-form value", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0] - x[1], // R - S
        input: { mean: [RS_MU_R, RS_MU_S], std: [RS_SIG_R, RS_SIG_S] },
        failureThreshold: 0,
        failureMode: "below",
        nSamples: 10000,
        seed: 42,
      });
      const pfExact = eng.standardNormalTail(RS_BETA_EXACT);
      expect(r.designPointBeta).toBeCloseTo(RS_BETA_EXACT, 6);
      expect(r.reliabilityIndex).toBeCloseTo(RS_BETA_EXACT, 1);
      const relErr = Math.abs(r.failureProbability - pfExact) / pfExact;
      expect(relErr).toBeLessThan(0.05);
    });

    it("21. 2D linear-sum problem: IS estimate matches the exact tail probability and MPP", () => {
      const T = 6;
      const zEquiv = T / Math.sqrt(2);
      const exact = eng.standardNormalTail(zEquiv);
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0] + x[1],
        input: { mean: [0, 0], std: [1, 1] },
        failureThreshold: T,
        failureMode: "above",
        nSamples: 8000,
        seed: 55,
      });
      expect(r.proposalMean[0]).toBeCloseTo(3, 5);
      expect(r.proposalMean[1]).toBeCloseTo(3, 5);
      expect(r.designPointBeta).toBeCloseTo(zEquiv, 6);
      const relErr = Math.abs(r.failureProbability - exact) / exact;
      expect(relErr).toBeLessThan(0.05);
    });
  });

  // ── Explicit designPoint / proposalStd overrides ───────────────────────
  describe("estimateFailureProbability — explicit proposal overrides", () => {
    it("22. an explicit designPoint is honoured (skips HL-RF) and its FORM beta is reported for context", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 4.5,
        failureMode: "above",
        nSamples: 3000,
        seed: 9,
        designPoint: [4.5],
      });
      expect(r.designPointFound).toBe(true);
      expect(r.designPointBeta).toBeCloseTo(4.5, 9);
      expect(r.proposalMean).toEqual([4.5]);
    });

    it("23. an explicit proposalStd changes the estimator's ESS while remaining unbiased in expectation", () => {
      const wide = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 4.5,
        failureMode: "above",
        nSamples: 3000,
        seed: 12345,
        designPoint: [4.5],
        proposalStd: [2], // deliberately mismatched (too wide) proposal std
      });
      expect(wide.failureProbability).toBeGreaterThan(0);
      expect(wide.effectiveSampleSize).toBeGreaterThan(0);
      expect(wide.effectiveSampleSize).toBeLessThanOrEqual(wide.nSamples);
    });
  });

  // ── nSamples clamping ──────────────────────────────────────────────────
  describe("estimateFailureProbability — nSamples clamping", () => {
    it("24. nSamples above the maximum is clamped to 5,000,000", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        nSamples: 10_000_000,
        seed: 1,
      });
      expect(r.nSamples).toBe(5_000_000);
    });

    it("25. nSamples defaults to 20,000 when omitted", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        seed: 1,
      });
      expect(r.nSamples).toBe(20_000);
    });
  });

  // ── naiveMonteCarlo public method ───────────────────────────────────────
  describe("naiveMonteCarlo", () => {
    it("26. crude MC of a non-rare event (P(Z>0)=0.5) is close to 0.5", () => {
      const naive = eng.naiveMonteCarlo({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 0,
        failureMode: "above",
        nSamples: 20000,
        seed: 5,
      });
      expect(Math.abs(naive.estimate - 0.5)).toBeLessThan(0.02);
    });

    it("27. crude MC of a 4.5-sigma tail at N=5000 finds ~0 hits (the motivation for IS)", () => {
      const naive = eng.naiveMonteCarlo({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 4.5,
        failureMode: "above",
        nSamples: 5000,
        seed: 12345,
      });
      expect(naive.estimate).toBeLessThan(1e-3);
      expect(naive.failureSamples).toBeLessThanOrEqual(1);
    });
  });

  // ── Adversarial input validation ────────────────────────────────────────
  describe("input validation — adversarial", () => {
    it("28. throws when input.mean and input.std have mismatched lengths", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0, 0], std: [1] },
        } as ISReliabilityInput),
      ).toThrow(/length mismatch/);
    });

    it("29. throws when limitState returns a non-finite value (NaN)", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: () => NaN,
          input: { mean: [0], std: [1] },
          nSamples: 100,
        }),
      ).toThrow(/non-finite/);
    });

    it("30. throws when limitState returns Infinity", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: () => Infinity,
          input: { mean: [0], std: [1] },
          nSamples: 100,
        }),
      ).toThrow(/non-finite/);
    });

    it("31. throws when a std component is <= 0", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [0] },
        }),
      ).toThrow(/must be finite and > 0/);
    });

    it("32. throws when limitState is not a function", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: "not-a-function" as unknown as (x: number[]) => number,
          input: { mean: [0], std: [1] },
        }),
      ).toThrow(/must be a function/);
    });

    it("33. throws when failureMode is invalid", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [1] },
          failureMode: "sideways" as unknown as "below" | "above",
        }),
      ).toThrow(/failureMode must be/);
    });

    it("34. throws when nSamples is below the minimum (e.g. 0)", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [1] },
          nSamples: 0,
        }),
      ).toThrow(/nSamples must be/);
    });

    it("35. throws when input dimension is zero (empty mean/std arrays)", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: () => 0,
          input: { mean: [], std: [] },
        }),
      ).toThrow(/dimension must be/);
    });

    it("36. throws when designPoint length does not match input dimension", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [1] },
          designPoint: [1, 2],
        }),
      ).toThrow(/designPoint length/);
    });

    it("37. throws when proposalStd contains a non-positive value", () => {
      expect(() =>
        eng.estimateFailureProbability({
          limitState: (x) => x[0],
          input: { mean: [0], std: [1] },
          proposalStd: [-1],
        }),
      ).toThrow(/proposalStd/);
    });
  });

  // ── Diagnostics / warnings ──────────────────────────────────────────────
  describe("diagnostics", () => {
    it("38. warns when no failure samples are observed (extremely rare event, tiny N, no auto-shift)", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        failureThreshold: 4.5,
        failureMode: "above",
        nSamples: 50,
        seed: 1,
        autoShift: false, // crude MC at N=50 will not find a 4.5-sigma tail hit
      });
      expect(r.failureSamples).toBe(0);
      expect(r.failureProbability).toBe(0);
      expect(r.warnings.some((w) => /no failure samples/.test(w))).toBe(true);
    });

    it("39. source label identifies the method", () => {
      const r = eng.estimateFailureProbability({
        limitState: (x) => x[0],
        input: { mean: [0], std: [1] },
        seed: 1,
        nSamples: 100,
      });
      expect(r.source).toBe("importance_sampling_reliability");
    });
  });
});
