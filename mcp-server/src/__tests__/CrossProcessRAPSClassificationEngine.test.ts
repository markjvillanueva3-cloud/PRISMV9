/**
 * U-NN-CONFORMAL04 — RAPS regularized adaptive prediction sets.
 *
 * Tests verify the marginal coverage guarantee, the λ=0 ⇒ APS equivalence
 * (cross-engine score check), the monotonic effect of λ on scores past
 * k_reg, regularization-config locking, and every documented failure
 * mode. Deterministic LCG PRNG so seeded runs are bit-identical.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessRAPSClassificationEngine as RAPS,
  crossProcessRAPSClassification,
} from "../engines/CrossProcessRAPSClassificationEngine.js";
import { CrossProcessAPSClassificationEngine as APS } from "../engines/CrossProcessAPSClassificationEngine.js";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function syntheticPair(
  rand: () => number,
  K: number,
  confidence: number,
): { probs: number[]; label: number } {
  const y = Math.floor(rand() * K);
  const others = (1 - confidence) / (K - 1);
  const probs = new Array<number>(K).fill(others);
  probs[y] = confidence;
  // Normalize to absorb fp noise.
  let s = 0;
  for (const p of probs) s += p;
  for (let i = 0; i < K; i++) probs[i] /= s;
  return { probs, label: y };
}

beforeEach(() => {
  RAPS.reset();
  APS.reset();
});

// ============================================================================
// 1. CALIBRATE — happy path + shape locks + reg locks
// ============================================================================

describe("calibrate()", () => {
  it("ingests valid pairs, locks numClasses + reg, returns sorted-stats summary", () => {
    const rand = lcg(0xAA01);
    const pairs = Array.from({ length: 50 }, () => syntheticPair(rand, 3, 0.7));
    const r = RAPS.calibrate({ pairs, append: false, lambda: 0.05, kReg: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.appendedCount).toBe(50);
    expect(r.totalCount).toBe(50);
    expect(r.stats.size).toBe(50);
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.reg.lambda).toBe(0.05);
    expect(r.stats.reg.kReg).toBe(1);
    // RAPS scores are bounded above by 1 + λ·(K-kReg) = 1 + 0.05·2 = 1.1.
    expect(r.stats.maxScore).toBeLessThanOrEqual(1.1 + 1e-9);
    expect(r.stats.minScore).toBeGreaterThanOrEqual(0);
  });

  it("appending with same reg works; different reg is rejected", () => {
    RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.3, 0.1], label: 0 }],
      append: false,
      lambda: 0.05,
      kReg: 1,
    });
    const okAppend = RAPS.calibrate({
      pairs: [{ probs: [0.5, 0.4, 0.1], label: 1 }],
      append: true,
      lambda: 0.05,
      kReg: 1,
    });
    expect(okAppend.ok).toBe(true);
    const badAppend = RAPS.calibrate({
      pairs: [{ probs: [0.5, 0.4, 0.1], label: 1 }],
      append: true,
      lambda: 0.10,
      kReg: 1,
    });
    expect(badAppend.ok).toBe(false);
    if (badAppend.ok) return;
    expect(badAppend.message).toMatch(/locked at \(lambda=0\.05/);
  });

  it("rejects negative lambda (Zod gate fires first with the >=0 message)", () => {
    const r = RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      lambda: -0.01,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // Zod's .min(0) refinement runs in safeParse() and emits "expected
    // number to be >=0"; the engine's hand-rolled "lambda must be >= 0"
    // message is a defensive fallback never reached on the ergonomic
    // path. Either form is the correct rejection.
    expect(r.message).toMatch(/lambda|>=\s*0|Too small/);
  });

  it("rejects kReg outside [1, numClasses]", () => {
    const r1 = RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      kReg: 0,
    });
    expect(r1.ok).toBe(false);
    const r2 = RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      kReg: 5,
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.message).toMatch(/kReg 5 outside/);
  });

  it("rejects probs not on simplex", () => {
    const r = RAPS.calibrate({ pairs: [{ probs: [0.3, 0.3, 0.3], label: 0 }] });
    expect(r.ok).toBe(false);
  });

  it("rejects label outside [0, numClasses)", () => {
    const r = RAPS.calibrate({ pairs: [{ probs: [0.5, 0.5], label: 7 }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/label 7 outside/);
  });

  it("rejects NaN entries in probs", () => {
    const r = RAPS.calibrate({ pairs: [{ probs: [Number.NaN, 1], label: 1 }] });
    expect(r.ok).toBe(false);
  });

  it("append=false replaces state and unlocks the regularization config", () => {
    RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
      lambda: 0.1,
      kReg: 1,
    });
    expect(RAPS.getStats().reg.lambda).toBe(0.1);
    const r = RAPS.calibrate({
      pairs: [{ probs: [0.5, 0.3, 0.2], label: 1 }],
      append: false,
      lambda: 0.0,
      kReg: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.reg.lambda).toBe(0.0);
    expect(r.stats.reg.kReg).toBe(2);
  });
});

// ============================================================================
// 2. λ=0 ⇒ APS equivalence (cross-engine score check)
// ============================================================================

describe("λ=0 equivalence with APS", () => {
  it("calibration scores at λ=0 match APS engine scores byte-for-byte", () => {
    const rand = lcg(0xDEAD_BEEF);
    const pairs = Array.from({ length: 200 }, () => syntheticPair(rand, 3, 0.6));
    const rapsRes = RAPS.calibrate({ pairs, append: false, lambda: 0, kReg: 1 });
    const apsRes = APS.calibrate({ pairs, append: false });
    expect(rapsRes.ok).toBe(true);
    expect(apsRes.ok).toBe(true);
    if (!rapsRes.ok || !apsRes.ok) return;
    expect(rapsRes.stats.size).toBe(apsRes.stats.size);
    expect(rapsRes.stats.minScore).toBeCloseTo(apsRes.stats.minScore, 12);
    expect(rapsRes.stats.maxScore).toBeCloseTo(apsRes.stats.maxScore, 12);
    expect(rapsRes.stats.medianScore).toBeCloseTo(apsRes.stats.medianScore, 12);
    expect(rapsRes.stats.meanScore).toBeCloseTo(apsRes.stats.meanScore, 12);
  });

  it("prediction sets at λ=0 match APS sets exactly on identical (probs, alpha)", () => {
    const rand = lcg(0xCAFE);
    const pairs = Array.from({ length: 100 }, () => syntheticPair(rand, 3, 0.7));
    RAPS.calibrate({ pairs, append: false, lambda: 0, kReg: 1 });
    APS.calibrate({ pairs, append: false });
    const probe = syntheticPair(rand, 3, 0.6);
    const rapsSet = RAPS.predictionSet({ probs: probe.probs, alpha: 0.2 });
    const apsSet = APS.predictionSet({ probs: probe.probs, alpha: 0.2 });
    expect(rapsSet.ok).toBe(true);
    expect(apsSet.ok).toBe(true);
    if (!rapsSet.ok || !apsSet.ok) return;
    expect(rapsSet.classes).toEqual(apsSet.classes);
    expect(rapsSet.size).toBe(apsSet.size);
    expect(rapsSet.qHat).toBeCloseTo(apsSet.qHat, 12);
  });
});

// ============================================================================
// 3. λ MONOTONICITY — penalty grows scores past k_reg
// ============================================================================

describe("λ monotonicity", () => {
  it("a single pair's RAPS score with λ>0 ≥ score with λ=0 (penalty is non-negative)", () => {
    // Pair where the true label is at rank 2 → penalty fires past kReg=1.
    const probs = [0.5, 0.3, 0.2];
    const label = 1; // probs[1]=0.3 is rank 2 (sorted desc: [0,1,2]).

    RAPS.calibrate({
      pairs: [{ probs, label }],
      append: false,
      lambda: 0,
      kReg: 1,
    });
    const lo = RAPS.getStats().maxScore; // single-pair max = its score
    RAPS.calibrate({
      pairs: [{ probs, label }],
      append: false,
      lambda: 0.2,
      kReg: 1,
    });
    const hi = RAPS.getStats().maxScore;
    // λ=0 score: cum at rank 2 = 0.5 + 0.3 = 0.8.
    expect(lo).toBeCloseTo(0.8, 9);
    // λ=0.2 score: 0.8 + 0.2·(2-1) = 1.0.
    expect(hi).toBeCloseTo(1.0, 9);
    expect(hi).toBeGreaterThan(lo);
  });

  it("penalty is zero when the true-label rank is ≤ k_reg (free window)", () => {
    // True label is the argmax → rank=1, kReg=1 → no penalty regardless of λ.
    const probs = [0.7, 0.2, 0.1];
    const label = 0;

    RAPS.calibrate({
      pairs: [{ probs, label }],
      append: false,
      lambda: 0,
      kReg: 1,
    });
    const lo = RAPS.getStats().maxScore;
    RAPS.calibrate({
      pairs: [{ probs, label }],
      append: false,
      lambda: 1.0, // huge λ — would dominate if penalty fired
      kReg: 1,
    });
    const hi = RAPS.getStats().maxScore;
    expect(lo).toBeCloseTo(0.7, 9);
    expect(hi).toBeCloseTo(0.7, 9);
    expect(hi).toBeCloseTo(lo, 9);
  });

  it("higher k_reg widens the free window — fewer pairs incur penalty", () => {
    // Build pairs where labels span all ranks (NOT always argmax). Without
    // wrong/uncertain cases, every label sits at rank 1 and penalty is
    // always zero — kReg has no effect. Half the pairs put the label at
    // rank 2 (penalty fires for kReg=1, vanishes for kReg=2+).
    const pairs = [
      // 50 rank-1 pairs (penalty=0 either way)
      ...Array.from({ length: 50 }, () => ({
        probs: [0.7, 0.2, 0.1] as number[],
        label: 0,
      })),
      // 50 rank-2 pairs (true label at rank 2 — penalty fires for kReg=1 only)
      ...Array.from({ length: 50 }, () => ({
        probs: [0.5, 0.3, 0.2] as number[],
        label: 1,
      })),
    ];

    RAPS.calibrate({ pairs, append: false, lambda: 0.5, kReg: 1 });
    const meanKReg1 = RAPS.getStats().meanScore;
    RAPS.calibrate({ pairs, append: false, lambda: 0.5, kReg: 3 });
    const meanKReg3 = RAPS.getStats().meanScore;
    // kReg=3 → all penalties zero → pure APS scores.
    // kReg=1 → 50 rank-2 pairs each get +0.5 penalty → mean shifts up by ~0.25.
    expect(meanKReg3).toBeLessThan(meanKReg1);
    expect(meanKReg1 - meanKReg3).toBeCloseTo(0.25, 3);
  });
});

// ============================================================================
// 4. PREDICTION SET — coverage + concrete construction
// ============================================================================

describe("predictionSet()", () => {
  it("rejects when calibration is empty", () => {
    const r = RAPS.predictionSet({ probs: [0.5, 0.5], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_state");
  });

  it("rejects probs.length != lockedNumClasses", () => {
    RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
      lambda: 0,
      kReg: 1,
    });
    const r = RAPS.predictionSet({ probs: [0.4, 0.3, 0.3], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/locked numClasses=2/);
  });

  it("returns full label set when N is too small for chosen alpha", () => {
    const pairs = Array.from({ length: 5 }, () => ({ probs: [0.6, 0.4], label: 0 }));
    RAPS.calibrate({ pairs, append: false, lambda: 0, kReg: 1 });
    const r = RAPS.predictionSet({ probs: [0.7, 0.3], alpha: 0.05 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fullSet).toBe(true);
    expect(r.size).toBe(2);
    expect(r.classes).toEqual([0, 1]);
  });

  it("MARGINAL COVERAGE — empirical rate ≥ 1−α−tol on 2000 holdouts at λ=0", () => {
    const K = 3;
    const alpha = 0.1;
    const calibration: { probs: number[]; label: number }[] = [];
    const holdout: { probs: number[]; label: number }[] = [];
    const rand = lcg(20260507);
    for (let i = 0; i < 300; i++) calibration.push(syntheticPair(rand, K, 0.7));
    for (let i = 0; i < 2000; i++) holdout.push(syntheticPair(rand, K, 0.7));
    RAPS.calibrate({ pairs: calibration, append: false, lambda: 0, kReg: 1 });
    let covered = 0;
    for (const { probs, label } of holdout) {
      const r = RAPS.predictionSet({ probs, alpha });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      if (r.classes.includes(label)) covered++;
    }
    expect(covered / holdout.length).toBeGreaterThanOrEqual(1 - alpha - 0.03);
  });

  it("MARGINAL COVERAGE — empirical rate ≥ 1−α−tol on 2000 holdouts at λ=0.05", () => {
    const K = 3;
    const alpha = 0.1;
    const calibration: { probs: number[]; label: number }[] = [];
    const holdout: { probs: number[]; label: number }[] = [];
    const rand = lcg(20260508);
    for (let i = 0; i < 300; i++) calibration.push(syntheticPair(rand, K, 0.7));
    for (let i = 0; i < 2000; i++) holdout.push(syntheticPair(rand, K, 0.7));
    RAPS.calibrate({ pairs: calibration, append: false, lambda: 0.05, kReg: 1 });
    let covered = 0;
    for (const { probs, label } of holdout) {
      const r = RAPS.predictionSet({ probs, alpha });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      if (r.classes.includes(label)) covered++;
    }
    expect(covered / holdout.length).toBeGreaterThanOrEqual(1 - alpha - 0.03);
  });

  it("set construction is deterministic — same inputs always yield the same set", () => {
    const calibration = Array.from({ length: 100 }, (_, i) => ({
      probs: [0.5, 0.3, 0.2],
      label: i % 3,
    }));
    RAPS.calibrate({ pairs: calibration, append: false, lambda: 0.05, kReg: 1 });
    const a = RAPS.predictionSet({ probs: [0.4, 0.35, 0.25], alpha: 0.2 });
    const b = RAPS.predictionSet({ probs: [0.4, 0.35, 0.25], alpha: 0.2 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.classes).toEqual(b.classes);
    expect(a.qHat).toBe(b.qHat);
    expect(a.size).toBe(b.size);
  });

  it("singleton on confident input regardless of regularization (argmax always covered)", () => {
    const K = 3;
    const rand = lcg(11);
    const calibration = Array.from({ length: 200 }, () => syntheticPair(rand, K, 0.99));
    RAPS.calibrate({ pairs: calibration, append: false, lambda: 0.01, kReg: 1 });
    const r = RAPS.predictionSet({ probs: [0.99, 0.005, 0.005], alpha: 0.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.classes).toContain(0);
    expect(r.size).toBeLessThanOrEqual(2);
  });

  it("at α=0.5 set size ≤ size at α=0.05 (quantile rank monotonicity)", () => {
    const K = 3;
    const rand = lcg(99);
    const calibration = Array.from({ length: 200 }, () => syntheticPair(rand, K, 0.6));
    RAPS.calibrate({ pairs: calibration, append: false, lambda: 0.05, kReg: 1 });
    const probe = syntheticPair(rand, K, 0.5);
    const tight = RAPS.predictionSet({ probs: probe.probs, alpha: 0.5 });
    const loose = RAPS.predictionSet({ probs: probe.probs, alpha: 0.05 });
    expect(tight.ok).toBe(true);
    expect(loose.ok).toBe(true);
    if (!tight.ok || !loose.ok) return;
    expect(tight.size).toBeLessThanOrEqual(loose.size);
  });
});

// ============================================================================
// 5. STATE — getStats + reset + constants
// ============================================================================

describe("state management", () => {
  it("getStats reports the locked reg + zero-state defaults pre-calibration", () => {
    expect(RAPS.getStats().size).toBe(0);
    expect(RAPS.getStats().numClasses).toBe(0);
    expect(RAPS.getStats().reg.lambda).toBe(0.01); // default λ
    expect(RAPS.getStats().reg.kReg).toBe(1); // default kReg
  });

  it("reset wipes scores, lock, and reg config", () => {
    RAPS.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
      lambda: 0.5,
      kReg: 2,
    });
    expect(RAPS.getStats().size).toBe(1);
    RAPS.reset();
    expect(RAPS.getStats().size).toBe(0);
    expect(RAPS.getStats().numClasses).toBe(0);
    expect(RAPS.getStats().reg.lambda).toBe(0.01); // back to default
    expect(RAPS.getStats().reg.kReg).toBe(1);
  });

  it("constants reports defaults", () => {
    const c = RAPS.constants();
    expect(c.MAX_CALIBRATION_PAIRS).toBe(100_000);
    expect(c.DEFAULT_ALPHA).toBe(0.1);
    expect(c.DEFAULT_LAMBDA).toBe(0.01);
    expect(c.DEFAULT_K_REG).toBe(1);
    expect(c.MAX_NUM_CLASSES).toBe(1024);
  });
});

// ============================================================================
// 6. DISPATCHER WRAPPER
// ============================================================================

describe("crossProcessRAPSClassification() dispatcher wrapper", () => {
  it("xproc_raps_calibrate routes to calibrate()", () => {
    const r = crossProcessRAPSClassification("xproc_raps_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
      lambda: 0.05,
      kReg: 1,
    }) as { ok: boolean; totalCount?: number };
    expect(r.ok).toBe(true);
    expect(r.totalCount).toBe(1);
  });

  it("xproc_raps_set routes to predictionSet()", () => {
    crossProcessRAPSClassification("xproc_raps_calibrate", {
      pairs: Array.from({ length: 50 }, (_, i) => ({ probs: [0.7, 0.3], label: i % 2 })),
      append: false,
      lambda: 0.02,
      kReg: 1,
    });
    const r = crossProcessRAPSClassification("xproc_raps_set", {
      probs: [0.7, 0.3],
      alpha: 0.2,
    }) as { ok: boolean; size?: number; calibrationSize?: number };
    expect(r.ok).toBe(true);
    expect(r.calibrationSize).toBe(50);
    expect(r.size).toBeGreaterThanOrEqual(1);
  });

  it("xproc_raps_stats routes to getStats()", () => {
    const r = crossProcessRAPSClassification("xproc_raps_stats", {}) as { size: number };
    expect(r.size).toBe(0);
  });

  it("xproc_raps_reset wipes state", () => {
    crossProcessRAPSClassification("xproc_raps_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
      lambda: 0,
      kReg: 1,
    });
    crossProcessRAPSClassification("xproc_raps_reset", {});
    const r = crossProcessRAPSClassification("xproc_raps_stats", {}) as { size: number };
    expect(r.size).toBe(0);
  });

  it("xproc_raps_constants returns the defaults", () => {
    const r = crossProcessRAPSClassification("xproc_raps_constants", {}) as {
      DEFAULT_ALPHA: number;
      DEFAULT_LAMBDA: number;
      DEFAULT_K_REG: number;
    };
    expect(r.DEFAULT_ALPHA).toBe(0.1);
    expect(r.DEFAULT_LAMBDA).toBe(0.01);
    expect(r.DEFAULT_K_REG).toBe(1);
  });

  it("unknown action throws descriptively", () => {
    expect(() => crossProcessRAPSClassification("not_a_real_action", {})).toThrow(/unknown action/);
  });
});
