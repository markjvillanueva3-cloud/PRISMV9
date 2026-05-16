#!/usr/bin/env node
/**
 * isotonic-calibrator.test.mjs — node:test suite for U4 component (a) of
 * NN-GRAPH-MS0.
 *
 * Load-bearing invariants:
 *  - Pool Adjacent Violators always yields a monotone non-decreasing fit;
 *  - calibration measurably IMPROVES the Brier score on systematically
 *    miscalibrated data (the whole reason the component exists);
 *  - the fitted `breakpoints` survive a JSON round-trip unchanged (the
 *    serialization contract the U4 checkpoint loader depends on).
 * Deterministic, no stubs (CLAUDE.md R9).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_RELIABLE_SAMPLES,
  poolAdjacentViolators,
  fitIsotonicCalibrator,
  predictCalibrated,
  calibrateScores,
  brierScore,
} from "./isotonic-calibrator.mjs";

/** Assert a numeric array is non-decreasing. */
function assertMonotone(values, label) {
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i] >= values[i - 1] - 1e-12, `${label}: ${values[i - 1]} -> ${values[i]} not non-decreasing`);
  }
}

/**
 * A deterministic, systematically-miscalibrated dataset: 10 score buckets,
 * 20 points each. Bucket k's true positive rate is k/9 (well spread), but its
 * raw score is compressed toward 0.5 — so raw scores are correctly *ordered*
 * yet badly *scaled*. Isotonic calibration should recover the per-bucket rate.
 */
function miscalibratedDataset() {
  const BUCKETS = 10, PER = 20, COMPRESS = 0.05;
  const scores = [], labels = [];
  const rawOf = [], rateOf = [];
  for (let k = 0; k < BUCKETS; k++) {
    const rawScore = 0.5 + (k - (BUCKETS - 1) / 2) * COMPRESS;
    const positives = Math.round((k / (BUCKETS - 1)) * PER);
    rawOf.push(rawScore);
    rateOf.push(positives / PER);
    for (let i = 0; i < PER; i++) {
      scores.push(rawScore);
      labels.push(i < positives ? 1 : 0);
    }
  }
  return { scores, labels, rawOf, rateOf, n: BUCKETS * PER };
}

describe("MIN_RELIABLE_SAMPLES", () => {
  it("is a positive integer floor", () => {
    assert.ok(Number.isInteger(MIN_RELIABLE_SAMPLES) && MIN_RELIABLE_SAMPLES > 0);
  });
});

describe("poolAdjacentViolators", () => {
  it("leaves an already-monotone sequence as one block per point", () => {
    const blocks = poolAdjacentViolators([{ y: 1 }, { y: 2 }, { y: 3 }, { y: 4 }]);
    assert.equal(blocks.length, 4);
    assert.deepEqual(blocks.map((b) => b.y), [1, 2, 3, 4]);
  });
  it("pools a fully-decreasing sequence into a single weighted-mean block", () => {
    const blocks = poolAdjacentViolators([{ y: 4 }, { y: 3 }, { y: 2 }, { y: 1 }]);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].y, 2.5);
    assert.equal(blocks[0].count, 4);
  });
  it("pools only the violating interior of [1,3,2,4]", () => {
    const blocks = poolAdjacentViolators([{ y: 1 }, { y: 3 }, { y: 2 }, { y: 4 }]);
    assert.deepEqual(blocks.map((b) => b.y), [1, 2.5, 4]);
    assert.deepEqual(blocks.map((b) => b.count), [1, 2, 1]);
  });
  it("always produces a non-decreasing block sequence", () => {
    const blocks = poolAdjacentViolators([
      { y: 5 }, { y: 1 }, { y: 4 }, { y: 2 }, { y: 6 }, { y: 3 }, { y: 0 },
    ]);
    assertMonotone(blocks.map((b) => b.y), "PAV blocks");
  });
  it("honors weights in the pooled mean", () => {
    // y=3 weight 3, then y=1 weight 1 -> violation -> mean (3*3+1*1)/4 = 2.5
    const blocks = poolAdjacentViolators([{ y: 3, w: 3 }, { y: 1, w: 1 }]);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].y, 2.5);
    assert.equal(blocks[0].w, 4);
  });
  it("block counts sum to the number of valid points", () => {
    const pts = [{ y: 9 }, { y: 1 }, { y: 5 }, { y: 2 }];
    const total = poolAdjacentViolators(pts).reduce((s, b) => s + b.count, 0);
    assert.equal(total, 4);
  });
  it("returns [] for non-array input and skips non-finite y", () => {
    assert.deepEqual(poolAdjacentViolators(null), []);
    assert.deepEqual(poolAdjacentViolators("nope"), []);
    const blocks = poolAdjacentViolators([{ y: 1 }, { y: NaN }, { y: 2 }]);
    assert.equal(blocks.reduce((s, b) => s + b.count, 0), 2);
  });
  it("coerces a zero / negative / absent weight to 1", () => {
    // y=3 (w:0 -> 1) then y=1 (w:-5 -> 1) violate -> pool -> mean (3+1)/2 = 2.
    const blocks = poolAdjacentViolators([{ y: 3, w: 0 }, { y: 1, w: -5 }]);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].y, 2);
    assert.equal(blocks[0].w, 2);
  });
});

describe("fitIsotonicCalibrator — validation & edge cases", () => {
  it("throws RangeError on non-array or mismatched-length input", () => {
    assert.throws(() => fitIsotonicCalibrator(null, []), /equal-length/);
    assert.throws(() => fitIsotonicCalibrator([1, 2], [1]), /equal-length/);
  });
  it("returns an unfitted result for empty input", () => {
    const r = fitIsotonicCalibrator([], []);
    assert.equal(r.fitted, false);
    assert.equal(r.reliable, false);
    assert.equal(r.n, 0);
    assert.deepEqual(r.breakpoints, []);
  });
  it("drops non-finite (score,label) pairs and counts them", () => {
    const r = fitIsotonicCalibrator([0.1, NaN, 0.3, 0.5], [0, 1, Infinity, 1]);
    assert.equal(r.dropped, 2);
    assert.equal(r.n, 2);
  });
  it("flags reliability against MIN_RELIABLE_SAMPLES", () => {
    const thin = fitIsotonicCalibrator([0.2, 0.8], [0, 1]);
    assert.equal(thin.fitted, true);
    assert.equal(thin.reliable, false); // n=2 < floor
    const big = miscalibratedDataset();
    const r = fitIsotonicCalibrator(big.scores, big.labels);
    assert.equal(r.reliable, big.n >= MIN_RELIABLE_SAMPLES);
    assert.equal(r.reliable, true);
  });
  it("is deterministic — identical breakpoints across runs", () => {
    const { scores, labels } = miscalibratedDataset();
    const a = fitIsotonicCalibrator(scores, labels);
    const b = fitIsotonicCalibrator(scores, labels);
    assert.deepEqual(a.breakpoints, b.breakpoints);
  });
});

describe("fitIsotonicCalibrator — breakpoint properties", () => {
  it("produces breakpoints monotone in both x and y", () => {
    const { scores, labels } = miscalibratedDataset();
    const { breakpoints } = fitIsotonicCalibrator(scores, labels);
    assertMonotone(breakpoints.map((b) => b.x), "breakpoint x");
    assertMonotone(breakpoints.map((b) => b.y), "breakpoint y");
  });
  it("pools exact-score ties into one calibrated value", () => {
    // Two points share score 0.5 with labels 0 and 1 -> single value 0.5.
    const { breakpoints } = fitIsotonicCalibrator([0.5, 0.5], [0, 1]);
    const xs = new Set(breakpoints.map((b) => b.x));
    assert.equal(xs.size, 1);
    assert.equal(predictCalibrated(breakpoints, 0.5), 0.5);
  });
  it("recovers the empirical rate for already-monotone data", () => {
    const { scores, labels, rawOf, rateOf } = miscalibratedDataset();
    const { breakpoints } = fitIsotonicCalibrator(scores, labels);
    for (let k = 0; k < rawOf.length; k++) {
      // predictCalibrated at an exact breakpoint x returns that breakpoint's
      // y with no interpolation drift (t=0). The only wobble is ~1 ULP from
      // the PAV weighted mean (w*y)/w vs the test's direct positives/PER —
      // 1e-12 is ~4 orders above that and far below any real regression.
      assert.ok(
        Math.abs(predictCalibrated(breakpoints, rawOf[k]) - rateOf[k]) < 1e-12,
        `bucket ${k}: predicted ${predictCalibrated(breakpoints, rawOf[k])} vs rate ${rateOf[k]}`
      );
    }
  });
});

describe("predictCalibrated", () => {
  const { scores, labels } = miscalibratedDataset();
  const { breakpoints } = fitIsotonicCalibrator(scores, labels);

  it("degrades to clamped identity for an empty breakpoint set", () => {
    assert.equal(predictCalibrated([], 0.6), 0.6);
    assert.equal(predictCalibrated([], 1.7), 1);
    assert.equal(predictCalibrated([], -0.4), 0);
    assert.equal(predictCalibrated(null, 0.3), 0.3);
  });
  it("clips scores below / above the fitted range", () => {
    const first = breakpoints[0], last = breakpoints[breakpoints.length - 1];
    assert.equal(predictCalibrated(breakpoints, -5), first.y);
    assert.equal(predictCalibrated(breakpoints, 99), last.y);
  });
  it("linearly interpolates strictly between two breakpoints", () => {
    const bp = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    assert.ok(Math.abs(predictCalibrated(bp, 0.25) - 0.25) < 1e-12);
    assert.ok(Math.abs(predictCalibrated(bp, 0.5) - 0.5) < 1e-12);
  });
  it("is non-decreasing across a sweep of input scores", () => {
    const out = [];
    for (let x = -0.2; x <= 1.2; x += 0.02) out.push(predictCalibrated(breakpoints, x));
    assertMonotone(out, "predictCalibrated sweep");
  });
  it("handles a non-finite score by clipping to the low end", () => {
    assert.equal(predictCalibrated(breakpoints, NaN), breakpoints[0].y);
    assert.equal(predictCalibrated([], NaN), 0);
  });
});

describe("calibrateScores", () => {
  it("maps an array of scores through the calibrator", () => {
    const bp = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    assert.deepEqual(calibrateScores(bp, [0, 0.5, 1]), [0, 0.5, 1]);
  });
  it("returns [] for non-array input", () => {
    assert.deepEqual(calibrateScores([{ x: 0, y: 0 }], null), []);
  });
});

describe("brierScore", () => {
  it("is 0 for perfect predictions and 1 for maximally-wrong ones", () => {
    assert.equal(brierScore([1, 0, 1], [1, 0, 1]), 0);
    assert.equal(brierScore([1, 1], [0, 0]), 1);
  });
  it("computes mean squared error", () => {
    // (0.5-1)^2 + (0.5-0)^2 = 0.25 + 0.25 -> /2 = 0.25
    assert.equal(brierScore([0.5, 0.5], [1, 0]), 0.25);
  });
  it("throws on a length mismatch and returns NaN for empty input", () => {
    assert.throws(() => brierScore([0.5], [1, 0]), /equal-length/);
    assert.ok(Number.isNaN(brierScore([], [])));
  });
});

describe("R9 invariant — calibration improves the Brier score", () => {
  it("calibrated predictions beat raw scores on miscalibrated data", () => {
    const { scores, labels, n } = miscalibratedDataset();
    const fit = fitIsotonicCalibrator(scores, labels);
    assert.equal(fit.fitted, true);
    assert.equal(fit.n, n);

    const rawBrier = brierScore(scores, labels);
    const calibrated = calibrateScores(fit.breakpoints, scores);
    const calBrier = brierScore(calibrated, labels);

    // The whole point of the component: calibration must lower the Brier
    // score. A relative-improvement assertion (>=10% better) is robust to
    // exact arithmetic and fails loudly if the fit were inverted or a no-op.
    assert.ok(calBrier < rawBrier, `calibrated Brier ${calBrier} must beat raw ${rawBrier}`);
    assert.ok(calBrier < rawBrier * 0.9, `calibrated ${calBrier} must be >=10% better than raw ${rawBrier}`);
  });
});

describe("serialization contract — breakpoints survive a JSON round-trip", () => {
  it("predicts identically through JSON.parse(JSON.stringify(breakpoints))", () => {
    const { scores, labels } = miscalibratedDataset();
    const { breakpoints } = fitIsotonicCalibrator(scores, labels);
    const restored = JSON.parse(JSON.stringify(breakpoints));
    assert.deepEqual(restored, breakpoints);
    for (let x = 0; x <= 1; x += 0.05) {
      assert.equal(predictCalibrated(restored, x), predictCalibrated(breakpoints, x));
    }
  });
});
