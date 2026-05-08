/**
 * U-NN-MONDRIAN01 — class-conditional conformal classification tests.
 *
 * The fundamental property that distinguishes Mondrian from LAC/APS/RAPS
 * is class-CONDITIONAL coverage: P(Y ∈ S(X) | Y = c) ≥ 1 − α for every c,
 * not just the marginal P(Y ∈ S(X)). The headline test exercises this on
 * imbalanced synthetic data where a vanilla LAC under-covers the rare
 * class — Mondrian must hit per-class coverage on all three classes
 * simultaneously, paying for the guarantee with wider sets on the rare
 * class rather than under-coverage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessMondrianClassificationEngine as MON,
  crossProcessMondrianClassification,
} from "../engines/CrossProcessMondrianClassificationEngine.js";
import { CrossProcessConformalClassificationEngine as LAC } from "../engines/CrossProcessConformalClassificationEngine.js";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Imbalanced synthetic generator: 3 classes, class-conditional confidence
 * deliberately UNEQUAL so a marginal calibrator under-covers the worst
 * class. Class 0 (success) gets confidence 0.9 with prior 0.6;
 * class 1 (failure) gets 0.7 with prior 0.3;
 * class 2 (operator_override) gets 0.45 with prior 0.1.
 *   - Marginal-α calibrator's q̂ is dominated by the easy classes →
 *     class 2 with low confidence is systematically under-covered.
 *   - Mondrian's per-class q̂[2] adapts to the higher-score regime of
 *     class 2 alone, restoring per-class coverage.
 */
const PRIORS = [0.6, 0.3, 0.1];
const CONFIDENCES = [0.9, 0.7, 0.45];
function imbalancedPair(rand: () => number): { probs: number[]; label: number } {
  const u = rand();
  let y: number;
  if (u < PRIORS[0]) y = 0;
  else if (u < PRIORS[0] + PRIORS[1]) y = 1;
  else y = 2;
  const conf = CONFIDENCES[y];
  const others = (1 - conf) / 2;
  const probs = [others, others, others];
  probs[y] = conf;
  // Normalize to absorb fp noise.
  let s = 0;
  for (const p of probs) s += p;
  for (let i = 0; i < 3; i++) probs[i] /= s;
  return { probs, label: y };
}

beforeEach(() => {
  MON.reset();
  LAC.reset();
});

// ============================================================================
// 1. CALIBRATE — bucket math + lock semantics
// ============================================================================

describe("calibrate()", () => {
  it("partitions LAC scores into per-class buckets and reports per-class stats", () => {
    const rand = lcg(0xAA01);
    const pairs = Array.from({ length: 300 }, () => imbalancedPair(rand));
    const r = MON.calibrate({ pairs, append: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.appendedCount).toBe(300);
    expect(r.totalCount).toBe(300);
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.size).toBe(300);
    // Buckets should reflect the priors approximately. With 300 pairs and
    // priors [0.6, 0.3, 0.1] expected ~[180, 90, 30]. Allow ±2σ.
    expect(r.stats.perClass[0].size).toBeGreaterThanOrEqual(160);
    expect(r.stats.perClass[0].size).toBeLessThanOrEqual(200);
    expect(r.stats.perClass[2].size).toBeGreaterThanOrEqual(20);
    expect(r.stats.perClass[2].size).toBeLessThanOrEqual(45);
    // Sum of bucket sizes equals total.
    const sum = r.stats.perClass.reduce((s, p) => s + p.size, 0);
    expect(sum).toBe(300);
    // minBucketSize / maxBucketSize match the per-class report.
    const sizes = r.stats.perClass.map((p) => p.size);
    expect(r.stats.minBucketSize).toBe(Math.min(...sizes));
    expect(r.stats.maxBucketSize).toBe(Math.max(...sizes));
  });

  it("computes LAC scores correctly per pair (1 - probs[label])", () => {
    // Single pair → score = 1 - 0.7 = 0.3 in bucket[label=1].
    const r = MON.calibrate({
      pairs: [{ probs: [0.2, 0.7, 0.1], label: 1 }],
      append: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.perClass[1].size).toBe(1);
    expect(r.stats.perClass[1].minScore).toBeCloseTo(0.3, 12);
    expect(r.stats.perClass[1].maxScore).toBeCloseTo(0.3, 12);
    // Other buckets empty.
    expect(r.stats.perClass[0].size).toBe(0);
    expect(r.stats.perClass[2].size).toBe(0);
  });

  it("appending preserves sorted order across both buckets", () => {
    const part1 = Array.from({ length: 5 }, () => ({ probs: [0.9, 0.05, 0.05], label: 0 }));
    const part2 = Array.from({ length: 5 }, () => ({ probs: [0.5, 0.4, 0.1], label: 0 }));
    MON.calibrate({ pairs: part1, append: false });
    const r2 = MON.calibrate({ pairs: part2, append: true });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    // Bucket 0 has 10 entries, sorted.
    expect(r2.stats.perClass[0].size).toBe(10);
    // Min comes from the high-confidence pairs (score=0.1), max from low-confidence (score=0.5).
    expect(r2.stats.perClass[0].minScore).toBeCloseTo(0.1, 12);
    expect(r2.stats.perClass[0].maxScore).toBeCloseTo(0.5, 12);
  });

  it("rejects probs not on simplex", () => {
    const r = MON.calibrate({ pairs: [{ probs: [0.3, 0.3, 0.3], label: 0 }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/simplex/);
  });

  it("rejects label outside [0, numClasses)", () => {
    const r = MON.calibrate({ pairs: [{ probs: [0.5, 0.5], label: 7 }] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/label 7 outside/);
  });

  it("rejects NaN entries in probs", () => {
    const r = MON.calibrate({ pairs: [{ probs: [Number.NaN, 1], label: 1 }] });
    expect(r.ok).toBe(false);
  });

  it("rejects Infinity entries in probs", () => {
    const r = MON.calibrate({ pairs: [{ probs: [Number.POSITIVE_INFINITY, 0.5], label: 0 }] });
    expect(r.ok).toBe(false);
  });

  it("rejects appending with mismatched K and reports the lock", () => {
    MON.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    const r = MON.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 0 }], append: true });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/has 3 classes, expected 2/);
  });

  it("append=false replaces all buckets and admits a new K", () => {
    MON.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    const r = MON.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 1 }], append: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.numClasses).toBe(3);
    expect(r.stats.size).toBe(1);
    // Bucket 1 has the new entry; 0 and 2 are empty.
    expect(r.stats.perClass[0].size).toBe(0);
    expect(r.stats.perClass[1].size).toBe(1);
    expect(r.stats.perClass[2].size).toBe(0);
  });
});

// ============================================================================
// 2. PREDICTION SET — class-conditional behaviour
// ============================================================================

describe("predictionSet()", () => {
  it("rejects when calibration is empty", () => {
    const r = MON.predictionSet({ probs: [0.5, 0.5], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_state");
  });

  it("rejects probs.length != lockedNumClasses", () => {
    MON.calibrate({
      pairs: [{ probs: [0.6, 0.4], label: 0 }, { probs: [0.4, 0.6], label: 1 }],
      append: false,
    });
    const r = MON.predictionSet({ probs: [0.4, 0.3, 0.3], alpha: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/locked numClasses=2/);
  });

  it("returns per-class thresholds and starvation flags", () => {
    // Class 0 well-populated (50 pairs), class 1 starved (3 pairs at α=0.05).
    // For α=0.05, rank = ceil((N+1)*0.95). N=3 → rank=4 > 3 → starved.
    const c0 = Array.from({ length: 50 }, () => ({ probs: [0.9, 0.1] as number[], label: 0 }));
    const c1 = Array.from({ length: 3 }, () => ({ probs: [0.6, 0.4] as number[], label: 1 }));
    MON.calibrate({ pairs: [...c0, ...c1], append: false });
    const r = MON.predictionSet({ probs: [0.7, 0.3], alpha: 0.05 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.thresholds).toHaveLength(2);
    expect(r.thresholds[0].cls).toBe(0);
    expect(r.thresholds[0].starved).toBe(false);
    expect(r.thresholds[1].cls).toBe(1);
    expect(r.thresholds[1].starved).toBe(true);
    expect(r.thresholds[1].qHat).toBe(1);
    expect(r.anyStarved).toBe(true);
    expect(r.warnings.some((w) => /bucket starvation/.test(w))).toBe(true);
  });

  it("CLASS-CONDITIONAL COVERAGE — every class meets ≥1−α−tol on imbalanced data", () => {
    // 800 cal + 4000 holdout. Per-class holdout coverage must each clear
    // 1 - α - 0.05 (5σ-style finite-sample slack at the smallest class).
    // The smallest class will have ~400 holdout samples and ~80 cal
    // samples, which is enough at α=0.1 to test class-conditional coverage.
    const K = 3;
    const alpha = 0.1;
    const rand = lcg(2026_05_08);
    const cal: { probs: number[]; label: number }[] = [];
    const test: { probs: number[]; label: number }[] = [];
    for (let i = 0; i < 800; i++) cal.push(imbalancedPair(rand));
    for (let i = 0; i < 4000; i++) test.push(imbalancedPair(rand));

    MON.calibrate({ pairs: cal, append: false });

    const perClassCovered = [0, 0, 0];
    const perClassTotal = [0, 0, 0];
    for (const { probs, label } of test) {
      const r = MON.predictionSet({ probs, alpha });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      perClassTotal[label]++;
      if (r.classes.includes(label)) perClassCovered[label]++;
    }
    for (let c = 0; c < K; c++) {
      const cov = perClassCovered[c] / Math.max(1, perClassTotal[c]);
      // Per-class coverage floor — Mondrian's defining contract.
      expect(cov).toBeGreaterThanOrEqual(1 - alpha - 0.05);
    }
  });

  it("MARGINAL COVERAGE — Mondrian also satisfies the marginal floor (weighted average)", () => {
    const alpha = 0.1;
    const rand = lcg(0xC0FFEE);
    const cal = Array.from({ length: 600 }, () => imbalancedPair(rand));
    const test = Array.from({ length: 2000 }, () => imbalancedPair(rand));
    MON.calibrate({ pairs: cal, append: false });
    let covered = 0;
    for (const { probs, label } of test) {
      const r = MON.predictionSet({ probs, alpha });
      if (r.ok && r.classes.includes(label)) covered++;
    }
    expect(covered / test.length).toBeGreaterThanOrEqual(1 - alpha - 0.03);
  });

  it("MONDRIAN vs LAC on the rare class — LAC may under-cover, Mondrian must not", () => {
    // Construct a more pathological generator where LAC's marginal q̂
    // can land below class-2's typical score, leaving class-2 uncovered.
    // Class 2 confidence is intentionally LOW so its scores sit in a
    // different regime than classes 0/1.
    const alpha = 0.1;
    const rand = lcg(0xBEEF_BEEF);
    function pathologicalPair(): { probs: number[]; label: number } {
      const u = rand();
      let y: number;
      if (u < 0.45) y = 0;
      else if (u < 0.9) y = 1;
      else y = 2; // 10% class 2
      // Easy classes get 0.95 confidence; class 2 gets 0.4 (model unsure).
      const conf = y === 2 ? 0.4 : 0.95;
      const others = (1 - conf) / 2;
      const probs = [others, others, others];
      probs[y] = conf;
      let s = 0;
      for (const p of probs) s += p;
      for (let i = 0; i < 3; i++) probs[i] /= s;
      return { probs, label: y };
    }
    const cal = Array.from({ length: 1000 }, () => pathologicalPair());
    const test = Array.from({ length: 3000 }, () => pathologicalPair());

    MON.calibrate({ pairs: cal, append: false });
    LAC.calibrate({ pairs: cal, append: false });

    let monClass2Covered = 0, monClass2Total = 0;
    let lacClass2Covered = 0, lacClass2Total = 0;
    for (const { probs, label } of test) {
      if (label === 2) {
        monClass2Total++;
        lacClass2Total++;
        const monRes = MON.predictionSet({ probs, alpha });
        const lacRes = LAC.predictionSet({ probs, alpha });
        if (monRes.ok && monRes.classes.includes(label)) monClass2Covered++;
        if (lacRes.ok && lacRes.classes.includes(label)) lacClass2Covered++;
      }
    }
    const monCov = monClass2Covered / monClass2Total;
    const lacCov = lacClass2Covered / lacClass2Total;
    // Mondrian MUST hit per-class coverage on class 2 (its raison d'être).
    expect(monCov).toBeGreaterThanOrEqual(1 - alpha - 0.05);
    // LAC may or may not — this is informational, but Mondrian's coverage
    // should be ≥ LAC's on the class where LAC structurally under-covers.
    expect(monCov).toBeGreaterThanOrEqual(lacCov - 1e-9);
  });

  it("argmax fallback fires when every per-class threshold excludes (degenerate q̂[c]=0 case)", () => {
    // Force degenerate q̂[c]=0 by giving each class one perfect-cal pair
    // (probs[label]=1.0, all others 0). Score = 1 - 1 = 0 in each bucket.
    // q̂[c] = 0 → threshold = 1 - 0 = 1 → only probs[c]=1 included.
    const K = 3;
    const cal: { probs: number[]; label: number }[] = [];
    for (let c = 0; c < K; c++) {
      const probs = [0, 0, 0];
      probs[c] = 1;
      // Need >= 19 entries to make rank computable at α=0.05 (ceil(20*0.95)=19).
      for (let i = 0; i < 19; i++) cal.push({ probs, label: c });
    }
    MON.calibrate({ pairs: cal, append: false });
    const r = MON.predictionSet({ probs: [0.5, 0.3, 0.2], alpha: 0.05 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // No class has prob = 1, so naïvely the set is empty. Argmax fallback
    // must include class 0 (highest prob).
    expect(r.classes.length).toBeGreaterThanOrEqual(1);
    expect(r.classes).toContain(0);
    expect(r.warnings.some((w) => /empty-set fallback/.test(w))).toBe(true);
  });

  it("alpha rank monotonicity — tight α produces ≥-size sets vs loose α", () => {
    const cal = Array.from({ length: 200 }, (_, i) => imbalancedPair(lcg(i + 1)));
    MON.calibrate({ pairs: cal, append: false });
    const probe = imbalancedPair(lcg(999));
    const tight = MON.predictionSet({ probs: probe.probs, alpha: 0.5 });
    const loose = MON.predictionSet({ probs: probe.probs, alpha: 0.05 });
    expect(tight.ok).toBe(true);
    expect(loose.ok).toBe(true);
    if (!tight.ok || !loose.ok) return;
    expect(tight.size).toBeLessThanOrEqual(loose.size);
  });

  it("never-observed class — bucket of zero is starved → q̂=1, class always included", () => {
    // Calibrate with only label=0 pairs; class 1 bucket stays empty.
    const cal = Array.from({ length: 30 }, () => ({
      probs: [0.9, 0.05, 0.05] as number[],
      label: 0,
    }));
    MON.calibrate({ pairs: cal, append: false });
    const r = MON.predictionSet({ probs: [0.5, 0.4, 0.1], alpha: 0.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Class 1 and class 2 buckets are empty → starved → q̂=1 → always include.
    expect(r.classes).toContain(1);
    expect(r.classes).toContain(2);
    expect(r.thresholds[1].starved).toBe(true);
    expect(r.thresholds[2].starved).toBe(true);
    expect(r.thresholds[1].qHat).toBe(1);
    expect(r.anyStarved).toBe(true);
  });
});

// ============================================================================
// 3. STATE — getStats / reset / constants
// ============================================================================

describe("state management", () => {
  it("getStats() reflects current calibration with per-class breakdown", () => {
    expect(MON.getStats().size).toBe(0);
    MON.calibrate({
      pairs: [
        { probs: [0.7, 0.3], label: 0 },
        { probs: [0.3, 0.7], label: 1 },
      ],
      append: false,
    });
    const s = MON.getStats();
    expect(s.size).toBe(2);
    expect(s.numClasses).toBe(2);
    expect(s.perClass[0].size).toBe(1);
    expect(s.perClass[1].size).toBe(1);
    expect(s.minBucketSize).toBe(1);
    expect(s.maxBucketSize).toBe(1);
  });

  it("reset() wipes all per-class buckets and unlocks numClasses", () => {
    MON.calibrate({ pairs: [{ probs: [0.6, 0.4], label: 0 }], append: false });
    MON.reset();
    expect(MON.getStats().size).toBe(0);
    expect(MON.getStats().numClasses).toBe(0);
    // After reset, a new K is admissible.
    const r = MON.calibrate({ pairs: [{ probs: [0.4, 0.3, 0.3], label: 1 }], append: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.numClasses).toBe(3);
  });

  it("constants() reports defaults and bounds", () => {
    const c = MON.constants();
    expect(c.MAX_CALIBRATION_PAIRS).toBe(100_000);
    expect(c.DEFAULT_ALPHA).toBe(0.1);
    expect(c.MAX_NUM_CLASSES).toBe(1024);
    expect(c.SIMPLEX_SUM_TOLERANCE).toBeGreaterThan(0);
    expect(c.SIMPLEX_SUM_TOLERANCE).toBeLessThan(1e-2);
  });
});

// ============================================================================
// 4. DISPATCHER WRAPPER
// ============================================================================

describe("crossProcessMondrianClassification() dispatcher wrapper", () => {
  it("xproc_mondrian_calibrate routes to calibrate()", () => {
    const r = crossProcessMondrianClassification("xproc_mondrian_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
    }) as { ok: boolean; totalCount?: number };
    expect(r.ok).toBe(true);
    expect(r.totalCount).toBe(1);
  });

  it("xproc_mondrian_set routes to predictionSet()", () => {
    crossProcessMondrianClassification("xproc_mondrian_calibrate", {
      pairs: Array.from({ length: 50 }, (_, i) => ({ probs: [0.7, 0.3], label: i % 2 })),
      append: false,
    });
    const r = crossProcessMondrianClassification("xproc_mondrian_set", {
      probs: [0.7, 0.3],
      alpha: 0.2,
    }) as { ok: boolean; size?: number; calibrationSize?: number };
    expect(r.ok).toBe(true);
    expect(r.calibrationSize).toBe(50);
    expect(r.size).toBeGreaterThanOrEqual(1);
  });

  it("xproc_mondrian_stats routes to getStats()", () => {
    const r = crossProcessMondrianClassification("xproc_mondrian_stats", {}) as { size: number };
    expect(r.size).toBe(0);
  });

  it("xproc_mondrian_reset wipes state", () => {
    crossProcessMondrianClassification("xproc_mondrian_calibrate", {
      pairs: [{ probs: [0.6, 0.4], label: 0 }],
      append: false,
    });
    crossProcessMondrianClassification("xproc_mondrian_reset", {});
    const r = crossProcessMondrianClassification("xproc_mondrian_stats", {}) as { size: number };
    expect(r.size).toBe(0);
  });

  it("xproc_mondrian_constants returns the defaults", () => {
    const r = crossProcessMondrianClassification("xproc_mondrian_constants", {}) as {
      DEFAULT_ALPHA: number;
    };
    expect(r.DEFAULT_ALPHA).toBe(0.1);
  });

  it("unknown action throws descriptively", () => {
    expect(() => crossProcessMondrianClassification("not_a_real_action", {})).toThrow(
      /unknown action/,
    );
  });
});
