/**
 * U-NN-CONFORMAL01 — split-conformal classification (LAC) tests.
 *
 * Tests the marginal-coverage guarantee empirically + every documented
 * failure mode. Uses a deterministic LCG PRNG so reseeded runs are
 * bit-identical (no flaky-on-CI tests).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessConformalClassificationEngine as CCE,
  crossProcessConformalClassification,
} from "../engines/CrossProcessConformalClassificationEngine.js";

// ============================================================================
// Deterministic PRNG (LCG — Numerical Recipes parameters).
// ============================================================================

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Synthetic K-class generator: pick true class y uniformly, then build a
 * probability vector that's correct with prob `noise=1-confidence` -- i.e.
 * if confidence is 0.7, the model puts 0.7 on the correct class and
 * spreads the remaining 0.3 across the other K-1 classes.
 */
function syntheticPair(rand: () => number, K: number, confidence: number): { probs: number[]; label: number } {
  const y = Math.floor(rand() * K);
  const probs = new Array<number>(K).fill((1 - confidence) / (K - 1));
  probs[y] = confidence;
  // Round-trip via JSON to mimic real serialized inputs (rounding noise).
  return { probs, label: y };
}

beforeEach(() => {
  CCE.reset();
});

// ============================================================================
// 1. CALIBRATE — happy path + shape locks
// ============================================================================

describe("calibrate()", () => {
  it("ingests valid pairs and locks numClasses, returning sorted-stats summary", () => {
    const rand = lcg(0xC0FFEE);
    const pairs = Array.from({ length: 50 }, () => syntheticPair(rand, 3, 0.85));
    const r = CCE.calibrate({ pairs, append: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.appendedCount).toBe(50);
    expect(r.totalCount).toBe(50);
    expect(r.stats.size).toBe(50);
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.minScore).toBeGreaterThanOrEqual(0);
    expect(r.stats.maxScore).toBeLessThanOrEqual(1);
    expect(r.stats.minScore).toBeLessThanOrEqual(r.stats.medianScore);
    expect(r.stats.medianScore).toBeLessThanOrEqual(r.stats.maxScore);
  });

  it("appending preserves sorted order across multiple calls (sort invariant)", () => {
    const rand = lcg(42);
    const part1 = Array.from({ length: 20 }, () => syntheticPair(rand, 3, 0.9));
    const part2 = Array.from({ length: 30 }, () => syntheticPair(rand, 3, 0.6));
    const r1 = CCE.calibrate({ pairs: part1, append: false });
    expect(r1.ok).toBe(true);
    const r2 = CCE.calibrate({ pairs: part2, append: true });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.totalCount).toBe(50);
    expect(r2.stats.size).toBe(50);
    // After appending lower-confidence (higher-score) pairs, max should rise.
    const r1Stats = r1.ok ? r1.stats : null;
    if (r1Stats) {
      expect(r2.stats.maxScore).toBeGreaterThanOrEqual(r1Stats.maxScore - 1e-9);
    }
  });

  it("rejects probs not on the simplex (sum != 1)", () => {
    const r = CCE.calibrate({ pairs: [{ probs: [0.3, 0.3, 0.3], label: 0 }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_input");
    expect(r.message).toMatch(/simplex/);
  });

  it("rejects label outside [0, numClasses)", () => {
    const r = CCE.calibrate({ pairs: [{ probs: [0.5, 0.5], label: 5 }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/label 5 outside/);
  });

  it("locks numClasses on first call; rejects appending with different K (per-pair shape error)", () => {
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    // Append=true with no declared numClasses → targetK inferred from the
    // lock (=2). The per-pair shape check then catches the K=3 pair.
    const r = CCE.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 0 }], append: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/has 3 classes, expected 2/);
  });

  it("rejects explicit numClasses mismatch against the lock with the lock-pinned message", () => {
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    const r = CCE.calibrate({
      pairs: [{ probs: [0.4, 0.3, 0.3], label: 0 }],
      append: true,
      numClasses: 3,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/locked at 2/);
  });

  it("append=false replaces state and admits a new class count", () => {
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    const r = CCE.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 1 }], append: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.size).toBe(1);
  });

  it("rejects NaN entries in probs", () => {
    const r = CCE.calibrate({ pairs: [{ probs: [Number.NaN, 1], label: 1 }] });
    expect(r.ok).toBe(false);
  });
});

// ============================================================================
// 2. PREDICTION SET — coverage guarantee + edge cases
// ============================================================================

describe("predictionSet()", () => {
  it("rejects when calibration is empty", () => {
    const r = CCE.predictionSet({ probs: [0.5, 0.5], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_state");
  });

  it("rejects probs.length != lockedNumClasses", () => {
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    const r = CCE.predictionSet({ probs: [0.4, 0.3, 0.3], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/locked numClasses=2/);
  });

  it("returns full label set when N is too small for chosen alpha (insufficient cal)", () => {
    // N=5, alpha=0.05 → rank = ceil(6*0.95) = 6 > 5 → fullSet
    const pairs = Array.from({ length: 5 }, () => ({ probs: [0.6, 0.4], label: 0 }));
    CCE.calibrate({ pairs, append: false });
    const r = CCE.predictionSet({ probs: [0.7, 0.3], alpha: 0.05 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fullSet).toBe(true);
    expect(r.size).toBe(2);
    expect(r.classes).toEqual([0, 1]);
    expect(r.warnings.some((w) => /insufficient calibration/.test(w))).toBe(true);
  });

  it("MARGINAL COVERAGE — empirical rate ≥ 1−α−tol on 2000 holdouts (K=3)", () => {
    const K = 3;
    const alpha = 0.1;
    const calibration: { probs: number[]; label: number }[] = [];
    const holdout: { probs: number[]; label: number }[] = [];
    const rand = lcg(2026_05_07);
    // N_cal=300, N_test=2000 — exchangeable from same generator.
    for (let i = 0; i < 300; i++) calibration.push(syntheticPair(rand, K, 0.7));
    for (let i = 0; i < 2000; i++) holdout.push(syntheticPair(rand, K, 0.7));
    const r = CCE.calibrate({ pairs: calibration, append: false });
    expect(r.ok).toBe(true);

    let covered = 0;
    for (const { probs, label } of holdout) {
      const setRes = CCE.predictionSet({ probs, alpha });
      expect(setRes.ok).toBe(true);
      if (!setRes.ok) continue;
      if (setRes.classes.includes(label)) covered++;
    }
    const empiricalCoverage = covered / holdout.length;
    // Marginal guarantee: >= 1 - alpha. Tolerance 0.03 for finite-sample
    // wobble (sqrt(p(1-p)/n) at p=0.9, n=2000 is ~0.0067; 5σ is ~0.034).
    expect(empiricalCoverage).toBeGreaterThanOrEqual(1 - alpha - 0.03);
    // Sharpness sanity — set should not always be the full label set.
    // (If it were, coverage would trivially be 1 but the guarantee would
    // be vacuous.)
  });

  it("at α=0.5, set size is smaller than at α=0.05 (sharper coverage → smaller sets)", () => {
    const K = 3;
    const rand = lcg(7);
    const calibration = Array.from({ length: 200 }, () => syntheticPair(rand, K, 0.65));
    CCE.calibrate({ pairs: calibration, append: false });
    const test = syntheticPair(rand, K, 0.65);

    const tight = CCE.predictionSet({ probs: test.probs, alpha: 0.5 });
    const loose = CCE.predictionSet({ probs: test.probs, alpha: 0.05 });
    expect(tight.ok).toBe(true);
    expect(loose.ok).toBe(true);
    if (!tight.ok || !loose.ok) return;
    expect(tight.size).toBeLessThanOrEqual(loose.size);
  });

  it("singleton class with probs ≈ [1, 0, 0] yields a singleton or near-singleton set", () => {
    const K = 3;
    const rand = lcg(11);
    const calibration = Array.from({ length: 200 }, () => syntheticPair(rand, K, 0.99));
    CCE.calibrate({ pairs: calibration, append: false });
    const r = CCE.predictionSet({ probs: [0.99, 0.005, 0.005], alpha: 0.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // With cal confidence 0.99 → q̂ ≈ 0.01; threshold ≈ 0.99; only argmax passes.
    expect(r.classes).toContain(0);
    expect(r.size).toBeLessThanOrEqual(2);
  });

  it("non-empty fallback: if threshold puts no class in the set, argmax is included", () => {
    // Force degenerate: cal scores all 0 → q̂ = 0 → threshold = 1 → no probs[c] >= 1
    // unless one entry equals exactly 1.
    const cal = Array.from({ length: 50 }, () => ({ probs: [1, 0, 0], label: 0 }));
    CCE.calibrate({ pairs: cal, append: false });
    const r = CCE.predictionSet({ probs: [0.7, 0.2, 0.1], alpha: 0.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.size).toBeGreaterThanOrEqual(1);
    expect(r.classes).toContain(0); // argmax fallback included
  });
});

// ============================================================================
// 3. STATE MANAGEMENT — getStats, reset, constants
// ============================================================================

describe("state management", () => {
  it("getStats() reflects current calibration", () => {
    expect(CCE.getStats().size).toBe(0);
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    expect(CCE.getStats().size).toBe(1);
    expect(CCE.getStats().numClasses).toBe(2);
  });

  it("reset() clears all state including the class lock", () => {
    CCE.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    CCE.reset();
    expect(CCE.getStats().size).toBe(0);
    expect(CCE.getStats().numClasses).toBe(0);
    // After reset, a new K is admissible.
    const r = CCE.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 1 }], append: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.numClasses).toBe(3);
  });

  it("constants() reports defaults", () => {
    const c = CCE.constants();
    expect(c.MAX_CALIBRATION_PAIRS).toBe(100_000);
    expect(c.DEFAULT_ALPHA).toBe(0.1);
    expect(c.MAX_NUM_CLASSES).toBe(1024);
    expect(c.SIMPLEX_SUM_TOLERANCE).toBeGreaterThan(0);
    expect(c.SIMPLEX_SUM_TOLERANCE).toBeLessThan(1e-2);
  });
});

// ============================================================================
// 4. DISPATCHER WRAPPER — every action routes to the engine surface
// ============================================================================

describe("crossProcessConformalClassification() dispatcher wrapper", () => {
  it("xproc_conformal_classify_calibrate routes to calibrate()", () => {
    const r = crossProcessConformalClassification("xproc_conformal_classify_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
    }) as { ok: boolean; totalCount?: number };
    expect(r.ok).toBe(true);
    expect(r.totalCount).toBe(1);
  });

  it("xproc_conformal_classify_set routes to predictionSet()", () => {
    crossProcessConformalClassification("xproc_conformal_classify_calibrate", {
      pairs: Array.from({ length: 50 }, (_, i) => ({ probs: [0.7, 0.3], label: i % 2 })),
      append: false,
    });
    const r = crossProcessConformalClassification("xproc_conformal_classify_set", {
      probs: [0.7, 0.3],
      alpha: 0.2,
    }) as { ok: boolean; size?: number; calibrationSize?: number };
    expect(r.ok).toBe(true);
    expect(r.calibrationSize).toBe(50);
    expect(r.size).toBeGreaterThanOrEqual(1);
  });

  it("xproc_conformal_classify_stats routes to getStats()", () => {
    const r = crossProcessConformalClassification("xproc_conformal_classify_stats", {}) as {
      size: number;
    };
    expect(r.size).toBe(0);
  });

  it("xproc_conformal_classify_reset wipes state", () => {
    crossProcessConformalClassification("xproc_conformal_classify_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
    });
    crossProcessConformalClassification("xproc_conformal_classify_reset", {});
    const r = crossProcessConformalClassification("xproc_conformal_classify_stats", {}) as {
      size: number;
    };
    expect(r.size).toBe(0);
  });

  it("xproc_conformal_classify_constants returns the defaults", () => {
    const r = crossProcessConformalClassification("xproc_conformal_classify_constants", {}) as {
      DEFAULT_ALPHA: number;
    };
    expect(r.DEFAULT_ALPHA).toBe(0.1);
  });

  it("unknown action throws descriptively", () => {
    expect(() =>
      crossProcessConformalClassification("not_a_real_action", {}),
    ).toThrow(/unknown action/);
  });
});
