/**
 * CrossProcessCalibrationAuditorEngine.test.ts — XPROC-NEURAL Tier 5 (T5-04)
 *
 * Concrete-assertion suite. Verifies ECE/MCE/Brier math, the Guo et al.
 * 2017 temperature-scaling fit, the Platt scaling MLE, and the Tier 5 R4
 * acceptance criterion: post-correction ECE ≤ 0.05 on a synthetic
 * miscalibrated classifier.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessCalibrationAuditorEngine,
  crossProcessCalibrationAuditor,
} from "../engines/CrossProcessCalibrationAuditorEngine.js";

describe("score() — input validation", () => {
  it("rejects empty pairs", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({ pairs: [] });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects prob > 1", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [{ prob: 1.5, actual: 1 }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects label not in {0,1}", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [{ prob: 0.5, actual: 2 as 0 | 1 }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN prob", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [{ prob: Number.NaN, actual: 1 }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects numBins out of range", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [{ prob: 0.5, actual: 1 }],
      numBins: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("score() — math correctness", () => {
  it("perfectly calibrated → ECE = 0", () => {
    // 100 examples at p=0.5, 50% positive → ECE=0
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 1 as const });
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 0 as const });
    const r = CrossProcessCalibrationAuditorEngine.score({ pairs, numBins: 10 });
    if (!r.ok) throw new Error("expected ok");
    expect(r.ece).toBeCloseTo(0, 6);
    expect(r.mce).toBeCloseTo(0, 6);
  });

  it("Brier score = MSE between prob and label", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [
        { prob: 0.9, actual: 1 },  // (0.9-1)² = 0.01
        { prob: 0.1, actual: 0 },  // (0.1-0)² = 0.01
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.brier).toBeCloseTo(0.01, 8);
  });

  it("worst-case Brier = 1 when prob=1, label=0 (and vice versa)", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [
        { prob: 1, actual: 0 },
        { prob: 0, actual: 1 },
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.brier).toBeCloseTo(1, 8);
  });

  it("ECE catches systematic overconfidence", () => {
    // Predict 0.9 always; only 50% are actually positive → ECE = 0.4
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.9, actual: 1 as const });
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.9, actual: 0 as const });
    const r = CrossProcessCalibrationAuditorEngine.score({ pairs, numBins: 10 });
    if (!r.ok) throw new Error("expected ok");
    // Bin [0.9, 1.0]: confidence=0.9, accuracy=0.5, |0.9-0.5|=0.4, weighted = 0.4
    expect(r.ece).toBeCloseTo(0.4, 4);
    expect(r.mce).toBeCloseTo(0.4, 4);
  });

  it("reliability bins span [0, 1] with no gaps", () => {
    const r = CrossProcessCalibrationAuditorEngine.score({
      pairs: [{ prob: 0.5, actual: 1 }],
      numBins: 5,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.bins.length).toBe(5);
    expect(r.bins[0].binLow).toBe(0);
    expect(r.bins[r.bins.length - 1].binHigh).toBe(1);
    for (let i = 1; i < r.bins.length; i++) {
      expect(r.bins[i].binLow).toBe(r.bins[i - 1].binHigh);
    }
  });
});

describe("recommend() — already-calibrated case", () => {
  it("returns no_action when pre-ECE ≤ threshold", () => {
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 1 as const });
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 0 as const });
    const r = CrossProcessCalibrationAuditorEngine.recommend({
      pairs,
      eceThreshold: 0.05,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.recommended).toBe("no_action");
    expect(r.meetsThreshold).toBe(true);
  });
});

describe("recommend() — degenerate label distribution", () => {
  it("returns no_action with warning when all labels identical", () => {
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.7, actual: 1 as const });
    const r = CrossProcessCalibrationAuditorEngine.recommend({ pairs });
    if (!r.ok) throw new Error("expected ok");
    expect(r.recommended).toBe("no_action");
    expect(r.warnings.some((w) => w.includes("all labels"))).toBe(true);
  });
});

describe("acceptance — post-correction ECE ≤ 0.05 (Tier 5 R4)", () => {
  /**
   * Synthetic miscalibrated classifier: true probabilities are p_true ∈
   * {0.1, 0.3, 0.5, 0.7, 0.9} but the model emits sharpened probs σ(2 ·
   * logit(p_true)) — i.e. T_true = 0.5 (overconfident). Temperature
   * scaling should recover T ≈ 2 and bring ECE under 0.05.
   */
  it("temperature scaling reduces ECE on overconfident classifier from > 0.05 to ≤ 0.05", () => {
    const TRUE_T_INV = 2;  // Model sharpens by factor 2 → search should pick T ≈ 2
    const pairs: { prob: number; actual: 0 | 1 }[] = [];
    let seed = 0xFEEDBEEF;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const trueProbs = [0.1, 0.3, 0.5, 0.7, 0.9];
    const PER_BUCKET = 200;
    for (const pTrue of trueProbs) {
      for (let i = 0; i < PER_BUCKET; i++) {
        const actual = rand() < pTrue ? 1 : 0;
        // Miscalibrated emission: σ(TRUE_T_INV · logit(p_true))
        const z = Math.log(pTrue / (1 - pTrue));
        const pMiscal = 1 / (1 + Math.exp(-TRUE_T_INV * z));
        pairs.push({ prob: pMiscal, actual: actual as 0 | 1 });
      }
    }
    const baseScore = CrossProcessCalibrationAuditorEngine.score({ pairs, numBins: 15 });
    if (!baseScore.ok) throw new Error("expected ok");
    // Baseline must exceed the 0.05 acceptance threshold for the test to be meaningful
    // (we observed ~0.093 in dry-runs; the 0.05 floor is the Tier 5 R4 threshold itself).
    expect(baseScore.ece).toBeGreaterThan(0.05);
    const r = CrossProcessCalibrationAuditorEngine.recommend({
      pairs,
      eceThreshold: 0.05,
      numBins: 15,
    });
    if (!r.ok) throw new Error("expected ok");
    // Post-correction must improve ECE significantly
    expect(r.postEce).toBeLessThan(baseScore.ece);
    // Tier 5 R4 acceptance: post-correction ECE ≤ 0.05
    expect(r.postEce).toBeLessThanOrEqual(0.05);
    // Method should be one of the post-hoc options (not no_action since pre>threshold)
    expect(r.recommended === "temperature_scaling" || r.recommended === "platt_scaling").toBe(true);
    // If temperature was selected, T should be ≈ TRUE_T_INV (i.e. > 1 to soften)
    if (r.recommended === "temperature_scaling" && r.parameters.T !== undefined) {
      expect(r.parameters.T).toBeGreaterThan(1.4);
      expect(r.parameters.T).toBeLessThan(3);
    }
  });
});

describe("recommend() — Platt scaling fit sanity", () => {
  it("Platt parameters are finite for nondegenerate input", () => {
    // Shift miscalibration: predicted probs systematically biased down by 0.1
    const pairs: { prob: number; actual: 0 | 1 }[] = [];
    let seed = 0xCAFEBABE;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 500; i++) {
      const trueP = 0.2 + rand() * 0.6;  // 0.2..0.8
      const actual = rand() < trueP ? 1 : 0;
      const biasedP = Math.max(0.01, Math.min(0.99, trueP - 0.1));
      pairs.push({ prob: biasedP, actual: actual as 0 | 1 });
    }
    const r = CrossProcessCalibrationAuditorEngine.recommend({
      pairs, eceThreshold: 0.001,  // force a recommendation
    });
    if (!r.ok) throw new Error("expected ok");
    // Whichever was recommended, parameters must be finite
    if (r.recommended === "platt_scaling") {
      expect(Number.isFinite(r.parameters.A!)).toBe(true);
      expect(Number.isFinite(r.parameters.B!)).toBe(true);
    } else if (r.recommended === "temperature_scaling") {
      expect(Number.isFinite(r.parameters.T!)).toBe(true);
      expect(r.parameters.T!).toBeGreaterThan(0);
    }
  });
});

describe("constants() snapshot", () => {
  it("exposes Tier 5 R4 thresholds and grid bounds", () => {
    const c = CrossProcessCalibrationAuditorEngine.constants();
    expect(c.DEFAULT_NUM_BINS).toBe(15);
    expect(c.ECE_THRESHOLD).toBe(0.05);
    expect(c.T_MIN).toBe(0.1);
    expect(c.T_MAX).toBe(10);
    expect(c.PLATT_ITERATIONS).toBe(3);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_calibration_score", () => {
    const r = crossProcessCalibrationAuditor("xproc_calibration_score", {
      pairs: [
        { prob: 0.9, actual: 1 },
        { prob: 0.1, actual: 0 },
      ],
    }) as { ok: boolean; brier?: number };
    expect(r.ok).toBe(true);
    expect(r.brier).toBeCloseTo(0.01, 8);
  });

  it("routes xproc_calibration_recommend", () => {
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 1 as const });
    for (let i = 0; i < 50; i++) pairs.push({ prob: 0.5, actual: 0 as const });
    const r = crossProcessCalibrationAuditor("xproc_calibration_recommend", {
      pairs,
    }) as { ok: boolean; recommended?: string };
    expect(r.ok).toBe(true);
    expect(r.recommended).toBe("no_action");
  });

  it("routes xproc_calibration_constants", () => {
    const c = crossProcessCalibrationAuditor("xproc_calibration_constants", {}) as {
      ECE_THRESHOLD: number;
    };
    expect(c.ECE_THRESHOLD).toBe(0.05);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessCalibrationAuditor("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
