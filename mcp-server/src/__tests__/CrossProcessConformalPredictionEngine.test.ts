/**
 * CrossProcessConformalPredictionEngine.test.ts — XPROC-NEURAL Tier 5 (T5-02)
 *
 * Concrete-assertion suite. Verifies the inductive conformal prediction
 * algorithm (Vovk/Papadopoulos) plus the marginal-coverage acceptance
 * criterion from XPROC-NEURAL-ROADMAP.md Tier 5 R2: empirical coverage
 * >= 1 - α on 1000 holdout queries with N=200 calibration pairs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessConformalPredictionEngine,
  crossProcessConformalPrediction,
} from "../engines/CrossProcessConformalPredictionEngine.js";

beforeEach(() => CrossProcessConformalPredictionEngine.reset());

describe("calibrate() — input validation", () => {
  it("rejects empty pairs array", () => {
    const r = CrossProcessConformalPredictionEngine.calibrate({ pairs: [] });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN in predicted", () => {
    const r = CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: Number.NaN, actual: 1.0 }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects Infinity in actual", () => {
    const r = CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 1.0, actual: Number.POSITIVE_INFINITY }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects pair count beyond DoS guard", () => {
    const huge = new Array(100001).fill({ predicted: 0, actual: 0 });
    const r = CrossProcessConformalPredictionEngine.calibrate({ pairs: huge });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("calibrate() — score computation", () => {
  it("residuals are |actual - predicted|", () => {
    const r = CrossProcessConformalPredictionEngine.calibrate({
      pairs: [
        { predicted: 0, actual: 1 },
        { predicted: 5, actual: 2 },
        { predicted: 10, actual: 10 },
      ],
    });
    if (!r.ok) throw new Error("expected ok");
    // Residuals: 1, 3, 0 → sorted: 0, 1, 3
    expect(r.stats.size).toBe(3);
    expect(r.stats.minResidual).toBe(0);
    expect(r.stats.maxResidual).toBe(3);
    expect(r.stats.medianResidual).toBe(1);
    expect(r.stats.meanResidual).toBeCloseTo(4 / 3, 6);
  });

  it("append=true merges new pairs into existing sorted set", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 5 }],  // residual 5
    });
    const r = CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 2 }],  // residual 2
      append: true,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.stats.size).toBe(2);
    expect(r.stats.minResidual).toBe(2);
    expect(r.stats.maxResidual).toBe(5);
    expect(r.appendedCount).toBe(1);
    expect(r.totalCount).toBe(2);
  });

  it("append=false replaces existing calibration", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [
        { predicted: 0, actual: 100 },
        { predicted: 0, actual: 200 },
      ],
    });
    const r = CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 1 }],
      append: false,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.stats.size).toBe(1);
    expect(r.stats.maxResidual).toBe(1);
  });
});

describe("predictionSet() — algorithmic correctness", () => {
  it("rejects empty calibration with invalid_state", () => {
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 5,
      alpha: 0.05,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_state" });
  });

  it("rank index k = ceil((N+1)*(1-alpha)) — N=19, alpha=0.05 → k=19", () => {
    // residuals 1..19; sorted; k = ceil(20 * 0.95) = 19
    const pairs = Array.from({ length: 19 }, (_, i) => ({
      predicted: 0,
      actual: i + 1,
    }));
    CrossProcessConformalPredictionEngine.calibrate({ pairs });
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 100,
      alpha: 0.05,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.rankUsed).toBe(19);
    expect(r.conformalRadius).toBe(19);  // s_(19) = 19
    expect(r.intervalLow).toBe(81);
    expect(r.intervalHigh).toBe(119);
    expect(r.unbounded).toBe(false);
  });

  it("k=N+1 → unbounded interval with warning (insufficient calibration)", () => {
    // N=10, alpha=0.05 → k = ceil(11 * 0.95) = 11 > 10 → unbounded
    const pairs = Array.from({ length: 10 }, (_, i) => ({
      predicted: 0,
      actual: i + 1,
    }));
    CrossProcessConformalPredictionEngine.calibrate({ pairs });
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 100,
      alpha: 0.05,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.unbounded).toBe(true);
    expect(r.intervalLow).toBe(Number.NEGATIVE_INFINITY);
    expect(r.intervalHigh).toBe(Number.POSITIVE_INFINITY);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/insufficient calibration/);
  });

  it("centered around the prediction — symmetric ±q", () => {
    const pairs = Array.from({ length: 100 }, () => ({
      predicted: 0,
      actual: 5,
    }));
    CrossProcessConformalPredictionEngine.calibrate({ pairs });
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 50,
      alpha: 0.05,
    });
    if (!r.ok) throw new Error("expected ok");
    // All residuals identically 5 → q = 5
    expect(r.intervalLow).toBe(45);
    expect(r.intervalHigh).toBe(55);
    expect(r.conformalRadius).toBe(5);
  });

  it("smaller alpha → wider interval", () => {
    const pairs = Array.from({ length: 1000 }, (_, i) => ({
      predicted: 0,
      actual: i + 1,
    }));
    CrossProcessConformalPredictionEngine.calibrate({ pairs });
    const wide = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 0, alpha: 0.01,
    });
    const narrow = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 0, alpha: 0.20,
    });
    if (!wide.ok || !narrow.ok) throw new Error("expected ok");
    expect(wide.conformalRadius).toBeGreaterThan(narrow.conformalRadius);
  });

  it("rejects alpha = 0", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 1 }],
    });
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 0, alpha: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects alpha = 1", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 1 }],
    });
    const r = CrossProcessConformalPredictionEngine.predictionSet({
      prediction: 0, alpha: 1,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("acceptance — marginal coverage >= 1 - alpha", () => {
  /**
   * Synthetic regression: y_true = 2x + 3, predictor adds Gaussian noise
   * N(0, σ=2). Calibration on N=200 (x, y, ŷ) tuples; evaluate on 1000
   * holdout queries; verify empirical coverage >= 0.95 (alpha=0.05) within
   * a finite-sample slack of 0.02 to allow for the random draw.
   *
   * Tier 5 R2 acceptance: marginal coverage >= 1-alpha on 1K holdout
   * queries.
   */
  it("95% conformal interval achieves >= 93% empirical coverage on synthetic linear+noise dataset", () => {
    const ALPHA = 0.05;
    const N_CAL = 200;
    const N_TEST = 1000;
    const SIGMA = 2;

    let seed = 0xDEADBEEF;
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
    const trueY = (x: number) => 2 * x + 3;
    const predict = (x: number) => trueY(x) + SIGMA * randNormal();

    // Calibration
    const calPairs = [];
    for (let i = 0; i < N_CAL; i++) {
      const x = rand() * 100;
      calPairs.push({ predicted: predict(x), actual: trueY(x) });
    }
    CrossProcessConformalPredictionEngine.calibrate({ pairs: calPairs });

    // Test
    let covered = 0;
    for (let i = 0; i < N_TEST; i++) {
      const x = rand() * 100;
      const yhat = predict(x);
      const yTrue = trueY(x);
      const r = CrossProcessConformalPredictionEngine.predictionSet({
        prediction: yhat,
        alpha: ALPHA,
      });
      if (!r.ok) throw new Error("predict failed");
      if (yTrue >= r.intervalLow && yTrue <= r.intervalHigh) covered++;
    }
    const coverage = covered / N_TEST;
    // Theoretical guarantee: P(covered) >= 1 - alpha = 0.95. Finite-sample
    // empirical coverage may dip slightly below; we require >= 0.93 (2pp
    // slack consistent with N=200 sampling noise).
    expect(coverage).toBeGreaterThanOrEqual(0.93);
  });

  it("80% interval (alpha=0.20) achieves >= 78% empirical coverage", () => {
    const ALPHA = 0.20;
    const N_CAL = 200;
    const N_TEST = 1000;
    const SIGMA = 1.5;

    let seed = 0xCAFEF00D;
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
    const trueY = (x: number) => 0.5 * x - 4;
    const predict = (x: number) => trueY(x) + SIGMA * randNormal();

    const calPairs = [];
    for (let i = 0; i < N_CAL; i++) {
      const x = rand() * 50;
      calPairs.push({ predicted: predict(x), actual: trueY(x) });
    }
    CrossProcessConformalPredictionEngine.calibrate({ pairs: calPairs });

    let covered = 0;
    for (let i = 0; i < N_TEST; i++) {
      const x = rand() * 50;
      const yhat = predict(x);
      const yTrue = trueY(x);
      const r = CrossProcessConformalPredictionEngine.predictionSet({
        prediction: yhat, alpha: ALPHA,
      });
      if (!r.ok) throw new Error("predict failed");
      if (yTrue >= r.intervalLow && yTrue <= r.intervalHigh) covered++;
    }
    const coverage = covered / N_TEST;
    expect(coverage).toBeGreaterThanOrEqual(0.78);
  });
});

describe("getStats() / reset() / constants()", () => {
  it("getStats reflects current calibration state", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [
        { predicted: 0, actual: 1 },
        { predicted: 0, actual: 2 },
        { predicted: 0, actual: 3 },
      ],
    });
    const s = CrossProcessConformalPredictionEngine.getStats();
    expect(s.size).toBe(3);
    expect(s.medianResidual).toBe(2);
  });

  it("reset clears all calibration state", () => {
    CrossProcessConformalPredictionEngine.calibrate({
      pairs: [{ predicted: 0, actual: 1 }],
    });
    CrossProcessConformalPredictionEngine.reset();
    const s = CrossProcessConformalPredictionEngine.getStats();
    expect(s.size).toBe(0);
  });

  it("constants snapshot exposes sane defaults", () => {
    const c = CrossProcessConformalPredictionEngine.constants();
    expect(c.MAX_CALIBRATION_PAIRS).toBe(100000);
    expect(c.DEFAULT_ALPHA).toBe(0.05);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_conformal_calibrate", () => {
    const r = crossProcessConformalPrediction("xproc_conformal_calibrate", {
      pairs: [{ predicted: 1, actual: 3 }],
    }) as { ok: boolean; stats?: { size: number } };
    expect(r.ok).toBe(true);
    expect(r.stats?.size).toBe(1);
  });

  it("routes xproc_conformal_set", () => {
    crossProcessConformalPrediction("xproc_conformal_calibrate", {
      pairs: Array.from({ length: 50 }, (_, i) => ({ predicted: 0, actual: i })),
    });
    const r = crossProcessConformalPrediction("xproc_conformal_set", {
      prediction: 100, alpha: 0.05,
    }) as { ok: boolean; intervalHigh?: number; intervalLow?: number };
    expect(r.ok).toBe(true);
    expect(r.intervalHigh).toBeGreaterThan(100);
    expect(r.intervalLow).toBeLessThan(100);
  });

  it("routes xproc_conformal_stats", () => {
    crossProcessConformalPrediction("xproc_conformal_calibrate", {
      pairs: [{ predicted: 0, actual: 5 }],
    });
    const r = crossProcessConformalPrediction("xproc_conformal_stats", {}) as {
      size: number;
    };
    expect(r.size).toBe(1);
  });

  it("routes xproc_conformal_reset", () => {
    crossProcessConformalPrediction("xproc_conformal_calibrate", {
      pairs: [{ predicted: 0, actual: 5 }],
    });
    crossProcessConformalPrediction("xproc_conformal_reset", {});
    const r = crossProcessConformalPrediction("xproc_conformal_stats", {}) as {
      size: number;
    };
    expect(r.size).toBe(0);
  });

  it("routes xproc_conformal_constants", () => {
    const c = crossProcessConformalPrediction("xproc_conformal_constants", {}) as {
      DEFAULT_ALPHA: number;
    };
    expect(c.DEFAULT_ALPHA).toBe(0.05);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessConformalPrediction("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
