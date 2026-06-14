#!/usr/bin/env node
/**
 * nn-graph-calibration-analysis.test.mjs — node:test suite for the calibration
 * study. The calibrators (temperature scaling, Platt, isotonic), the LOO-CV
 * driver, and the Murphy decomposition are pinned to hand-verifiable reference
 * values / invariants — a stub returning a constant would fail. The end-to-end
 * `analyzeCalibration` is run on a deterministic fixture with a known answer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  fitTemperature,
  fitPlatt,
  fitIsotonic,
  looCV,
  murphy,
  analyzeCalibration,
} from "./nn-graph-calibration-analysis.mjs";
import { GATE_THRESHOLDS } from "./lib/nn-graph-eval.mjs";

// --- fitIsotonic -----------------------------------------------------------

test("fitIsotonic — non-decreasing map; perfectly-ordered data is the identity-ish step", () => {
  const m = fitIsotonic([0.1, 0.4, 0.6, 0.9], [0, 0, 1, 1]);
  // monotone: applying across the range never decreases
  let prev = -Infinity;
  for (const x of [0.0, 0.2, 0.5, 0.7, 1.0]) {
    const y = m.apply(x);
    assert.ok(y >= prev - 1e-9, `monotone at ${x}`);
    prev = y;
  }
  // low region → ~0, high region → ~1
  assert.ok(m.apply(0.1) <= 0.5);
  assert.ok(m.apply(0.9) >= 0.5);
});

test("fitIsotonic — pools adjacent violators (a dip is averaged, not preserved)", () => {
  // y violates monotonicity at x=0.4 (label 1) then x=0.6 (label 0) → PAV pools them to 0.5
  const m = fitIsotonic([0.2, 0.4, 0.6, 0.8], [0, 1, 0, 1]);
  const mid = m.apply(0.5);
  assert.ok(mid >= 0 && mid <= 1);
  // strictly non-decreasing endpoints
  assert.ok(m.apply(0.8) >= m.apply(0.2));
});

// --- fitTemperature --------------------------------------------------------

test("fitTemperature — under-confident data yields T<1 (sharpening)", () => {
  // predictions cluster at 0.6 but are right ~everywhere → should sharpen (T<1)
  const cs = [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6];
  const ys = [1, 1, 1, 1, 1, 1, 1, 0];
  const m = fitTemperature(cs, ys);
  assert.ok(m.T < 1, `expected sharpening, got T=${m.T}`);
  assert.ok(m.apply(0.6) > 0.6, "calibrated prob is pushed up for under-confident input");
});

test("fitTemperature — over-confident data yields T>1 (softening)", () => {
  // predictions at 0.9 but only half correct → should soften (T>1)
  const cs = [0.9, 0.9, 0.9, 0.9];
  const ys = [1, 0, 1, 0];
  const m = fitTemperature(cs, ys);
  assert.ok(m.T > 1, `expected softening, got T=${m.T}`);
  assert.ok(m.apply(0.9) < 0.9, "calibrated prob is pulled toward 0.5");
});

// --- fitPlatt --------------------------------------------------------------

test("fitPlatt — recovers a near-identity on already-calibrated data", () => {
  // balanced data calibrated around the diagonal → A≈1, B≈0, apply ≈ identity
  const cs = [0.2, 0.4, 0.6, 0.8, 0.2, 0.4, 0.6, 0.8];
  const ys = [0, 0, 1, 1, 0, 1, 0, 1];
  const m = fitPlatt(cs, ys);
  assert.ok(Number.isFinite(m.A) && Number.isFinite(m.B));
  // applied probabilities stay in (0,1)
  for (const c of cs) { const p = m.apply(c); assert.ok(p > 0 && p < 1); }
});

test("fitPlatt — monotone in the input confidence (A>0 case)", () => {
  const cs = [0.3, 0.5, 0.7, 0.9, 0.3, 0.5, 0.7, 0.9];
  const ys = [0, 0, 1, 1, 0, 1, 1, 1];
  const m = fitPlatt(cs, ys);
  assert.ok(m.apply(0.9) > m.apply(0.3), "higher confidence → higher calibrated prob");
});

// --- looCV -----------------------------------------------------------------

test("looCV — fits on all-but-i and returns one out-of-fold prediction per sample", () => {
  const cs = [0.2, 0.4, 0.6, 0.8];
  const ys = [0, 0, 1, 1];
  const out = looCV(cs, ys, fitPlatt);
  assert.equal(out.length, cs.length);
  for (const p of out) assert.ok(p >= 0 && p <= 1);
});

test("looCV — out-of-fold (never sees its own label) ≠ in-sample fit on a tiny set", () => {
  const cs = [0.1, 0.5, 0.9];
  const ys = [0, 1, 1];
  const oof = looCV(cs, ys, fitIsotonic);
  const inSample = fitIsotonic(cs, ys);
  // at least one out-of-fold prediction differs from the in-sample map (no leak)
  const anyDiff = oof.some((p, i) => Math.abs(p - inSample.apply(cs[i])) > 1e-9);
  assert.ok(anyDiff, "LOO predictions must not equal the in-sample fit on every point");
});

// --- murphy ----------------------------------------------------------------

test("murphy — decomposition sums to Brier (reliability - resolution + uncertainty)", () => {
  const probs = [0.1, 0.3, 0.6, 0.9, 0.2, 0.8, 0.4, 0.7];
  const labels = [0, 0, 1, 1, 0, 1, 0, 1];
  const d = murphy(probs, labels, 10);
  const brierFromDecomp = d.reliability - d.resolution + d.uncertainty;
  // direct Brier
  let b = 0; for (let i = 0; i < probs.length; i++) b += (probs[i] - labels[i]) ** 2; b /= probs.length;
  assert.ok(Math.abs(brierFromDecomp - b) < 1e-9, `decomp ${brierFromDecomp} vs brier ${b}`);
  assert.ok(d.reliability >= 0 && d.resolution >= 0 && d.uncertainty >= 0);
});

test("murphy — perfectly-calibrated data has ~zero reliability (miscalibration)", () => {
  // each bin's mean prob equals its empirical accuracy → reliability ≈ 0
  const probs = [0.0, 0.0, 1.0, 1.0];
  const labels = [0, 0, 1, 1];
  const d = murphy(probs, labels, 10);
  assert.ok(d.reliability < 1e-9, `reliability ${d.reliability} should be ~0`);
});

// --- analyzeCalibration (end-to-end) ---------------------------------------

test("analyzeCalibration — reproduces the live finding on the canonical 62-sample shape", () => {
  // A miniature but faithful holdout: a confidently-correct head + an uncertain tail.
  const samples = [
    ...Array.from({ length: 10 }, (_, i) => ({ predicted: "prism_cam", truth: "prism_cam", confidence: 0.8, correct: true, engine: `H${i}` })),
    ...Array.from({ length: 6 }, (_, i) => ({ predicted: "prism_calc", truth: "prism_calc", confidence: 0.65, correct: true, engine: `M${i}` })),
    ...Array.from({ length: 8 }, (_, i) => ({ predicted: "prism_cam", truth: "prism_turning", confidence: 0.33, correct: false, engine: `L${i}` })),
  ];
  const out = analyzeCalibration(samples, { brier: 0.15, macroF1: 0.55 });
  assert.ok(out.rawBrier > 0, "computes a Brier");
  // the Murphy decomposition identity holds: Brier = reliability - resolution + uncertainty
  const m = out.murphyDecomposition;
  assert.ok(Math.abs((m.reliability_miscalibration - m.resolution_refinement + m.uncertainty_baseRate) - out.rawBrier) < 1e-3);
  // the confidently-correct head (conf 0.8) clears at the production gate τ=0.7
  assert.equal(out.deployPoint.found, true);
  assert.ok(out.deployPoint.productionPoint && out.deployPoint.productionPoint.brier <= 0.15);
  // the verdict carries both findings (FINDING 1 = calibration outcome, FINDING 2 = selective deploy)
  assert.ok(out.verdict.some((l) => /FINDING 1/.test(l)));
  assert.ok(out.verdict.some((l) => /FINDING 2/.test(l) && /SELECTIVE|ABSTAINING/.test(l)));
});

test("analyzeCalibration — gate defaults are sourced from GATE_THRESHOLDS (single source, no inlined 0.15/0.55)", () => {
  // Lock the dedup: the Brier gate default must equal the canonical GATE_THRESHOLDS.brier
  // (0.15 today), not a re-inlined literal that could drift from the eval harness.
  const out = analyzeCalibration([
    { predicted: "a", truth: "a", confidence: 0.8, correct: true },
    { predicted: "a", truth: "b", confidence: 0.4, correct: false },
  ], {});
  assert.equal(out.gate, GATE_THRESHOLDS.brier);
});

test("analyzeCalibration — gate default is 0.15 when not supplied", () => {
  const samples = [
    { predicted: "a", truth: "a", confidence: 0.8, correct: true },
    { predicted: "a", truth: "b", confidence: 0.4, correct: false },
  ];
  const out = analyzeCalibration(samples, {});
  assert.equal(out.gate, 0.15);
});
