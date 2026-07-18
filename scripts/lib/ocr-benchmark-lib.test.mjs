// scripts/lib/ocr-benchmark-lib.test.mjs
// Tests for U-TDP04 OCR extraction benchmark pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  percentile,
  f1Score,
  compareExtractionToGroundTruth,
  aggregateBenchmark,
  formatBenchmarkSummary,
  DEFAULT_THRESHOLDS,
  DEFAULT_DIM_MATCH_TOLERANCE_MM,
} from "./ocr-benchmark-lib.mjs";

// ── percentile (R-7 linear interpolation reference values) ──────────

test("percentile: single value at any q returns that value", () => {
  assert.equal(percentile([5.0], 0.5), 5.0);
  assert.equal(percentile([5.0], 0.95), 5.0);
});

test("percentile: [1,2,3,4,5] p50=3 (R-7 linear interpolation, idx=2)", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
});

test("percentile: [1,2,3,4,5] p95 ≈ 4.8 (R-7: idx=3.8, lerp(4,5,0.8) = 4.8)", () => {
  const r = percentile([1, 2, 3, 4, 5], 0.95);
  assert.ok(Math.abs(r - 4.8) < 1e-9);
});

test("percentile: empty array returns 0", () => {
  assert.equal(percentile([], 0.5), 0);
  assert.equal(percentile(null, 0.5), 0);
});

test("percentile: NaN/Infinity values stripped before sort", () => {
  assert.equal(percentile([1, NaN, 2, Infinity, 3], 0.5), 2);
});

test("percentile: q clamped to [0,1]", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 1.5), 5); // clamps to 1.0 → max
  assert.equal(percentile([1, 2, 3, 4, 5], -0.5), 1); // clamps to 0.0 → min
});

// ── f1Score reference values ────────────────────────────────────────

test("f1Score: P=R=1 → F1=1", () => {
  assert.equal(f1Score(1, 1), 1);
});

test("f1Score: P=R=0.5 → F1=0.5", () => {
  assert.equal(f1Score(0.5, 0.5), 0.5);
});

test("f1Score: P=1, R=0 → F1=0 (no harmonic-mean blowup)", () => {
  assert.equal(f1Score(1, 0), 0);
});

test("f1Score: P=R=0 → F1=0 (safe division-by-zero)", () => {
  assert.equal(f1Score(0, 0), 0);
});

test("f1Score: NaN inputs → 0", () => {
  assert.equal(f1Score(NaN, 0.5), 0);
  assert.equal(f1Score(0.5, NaN), 0);
});

test("f1Score: P=0.8, R=0.6 → F1 = 2*0.8*0.6/(0.8+0.6) ≈ 0.6857", () => {
  const r = f1Score(0.8, 0.6);
  assert.ok(Math.abs(r - (2 * 0.8 * 0.6) / (0.8 + 0.6)) < 1e-9);
});

// ── compareExtractionToGroundTruth: perfect match ───────────────────

test("compare: perfect match (3 dims, all kinds + nominals match within tol) → TP=3, FP=0, FN=0", () => {
  const extracted = {
    dimensions: [
      { kind: "central_oil_hole", nominal: 1.27 },
      { kind: "stepped_revolved_axis", nominal: 6.35 },
      { kind: "bevel_face_chamfer", nominal: 0.50 },
    ],
  };
  const groundTruth = {
    dimensions: [
      { kind: "central_oil_hole", nominal: 1.27 },
      { kind: "stepped_revolved_axis", nominal: 6.35 },
      { kind: "bevel_face_chamfer", nominal: 0.50 },
    ],
  };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 3);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
  assert.equal(r.byKind["central_oil_hole"].precision, 1);
  assert.equal(r.byKind["central_oil_hole"].recall, 1);
  assert.equal(r.byKind["central_oil_hole"].f1, 1);
});

test("compare: dim within tolerance (Δ=0.05mm < 0.10mm default tol) → matched as TP", () => {
  const extracted = { dimensions: [{ kind: "x", nominal: 1.27 }] };
  const groundTruth = { dimensions: [{ kind: "x", nominal: 1.32 }] }; // Δ=0.05
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
  assert.ok(Math.abs(r.byKind["x"].dim_error_mm_p50 - 0.05) < 1e-9);
});

test("compare: dim OUTSIDE tolerance (Δ=0.20mm > 0.10mm tol) → FP + FN, NOT TP", () => {
  const extracted = { dimensions: [{ kind: "x", nominal: 1.27 }] };
  const groundTruth = { dimensions: [{ kind: "x", nominal: 1.47 }] }; // Δ=0.20
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 0);
  assert.equal(r.fp, 1); // extracted dim not matched
  assert.equal(r.fn, 1); // ground-truth dim not matched
});

test("compare: extra extracted feature (not in ground truth) → false positive", () => {
  const extracted = {
    dimensions: [
      { kind: "x", nominal: 1.0 },
      { kind: "hallucinated", nominal: 5.0 }, // not in GT
    ],
  };
  const groundTruth = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 1);
  assert.equal(r.fn, 0);
});

test("compare: missed ground-truth feature (extraction didn't find it) → false negative", () => {
  const extracted = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const groundTruth = {
    dimensions: [
      { kind: "x", nominal: 1.0 },
      { kind: "missed", nominal: 2.0 },
    ],
  };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 1);
});

test("compare: multiple of same kind — greedy nearest pairing", () => {
  const extracted = {
    dimensions: [
      { kind: "hole", nominal: 1.0 },
      { kind: "hole", nominal: 2.0 },
      { kind: "hole", nominal: 3.0 },
    ],
  };
  const groundTruth = {
    dimensions: [
      { kind: "hole", nominal: 1.05 },
      { kind: "hole", nominal: 2.05 },
      { kind: "hole", nominal: 3.05 },
    ],
  };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 3);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
});

test("compare: empty extracted → all GT entries are FN", () => {
  const r = compareExtractionToGroundTruth(
    { dimensions: [] },
    { dimensions: [{ kind: "x", nominal: 1 }, { kind: "y", nominal: 2 }] },
  );
  assert.equal(r.tp, 0);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 2);
});

test("compare: empty ground truth → all extracted entries are FP", () => {
  const r = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1 }] },
    { dimensions: [] },
  );
  assert.equal(r.tp, 0);
  assert.equal(r.fp, 1);
  assert.equal(r.fn, 0);
});

test("compare: ADVERSARIAL — corrupt nominal (string) in extraction → that dim cannot pair, becomes FP", () => {
  const r = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: "garbage" }] },
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
  );
  assert.equal(r.tp, 0);
  assert.equal(r.fp, 1);
  assert.equal(r.fn, 1);
});

test("compare: custom matchToleranceMm honored", () => {
  // Δ=0.20mm, default tol=0.10 → mismatch. With opts.matchToleranceMm=0.25 → match.
  const r = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
    { dimensions: [{ kind: "x", nominal: 1.20 }] },
    { matchToleranceMm: 0.25 },
  );
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
});

// ── aggregateBenchmark ─────────────────────────────────────────────

function mkPrint(part_class, comparison, extracted) {
  return { part_class, comparison, extracted };
}

test("aggregateBenchmark: empty input returns zero classes", () => {
  const r = aggregateBenchmark([]);
  assert.equal(r.classes.length, 0);
  assert.equal(r.summary.classCount, 0);
});

test("aggregateBenchmark: groups by part_class (stratified)", () => {
  const cmp = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
  );
  const r = aggregateBenchmark([
    mkPrint("die", cmp, {}),
    mkPrint("die", cmp, {}),
    mkPrint("extrude_punch", cmp, {}),
  ]);
  assert.equal(r.classes.length, 2);
  const die = r.classes.find((c) => c.part_class === "die");
  assert.equal(die.ground_truth_count, 2);
  assert.equal(die.extractions_completed, 2);
});

test("aggregateBenchmark: classes sorted by ground_truth_count desc (common parts first)", () => {
  const cmp = compareExtractionToGroundTruth({ dimensions: [{ kind: "x", nominal: 1 }] }, { dimensions: [{ kind: "x", nominal: 1 }] });
  const prints = [];
  for (let i = 0; i < 3; i++) prints.push(mkPrint("die", cmp, {}));
  for (let i = 0; i < 7; i++) prints.push(mkPrint("extrude_punch", cmp, {}));
  for (let i = 0; i < 1; i++) prints.push(mkPrint("shaft", cmp, {}));
  const r = aggregateBenchmark(prints);
  assert.equal(r.classes[0].part_class, "extrude_punch"); // 7 — most common
  assert.equal(r.classes[1].part_class, "die");
  assert.equal(r.classes[2].part_class, "shaft");
});

test("aggregateBenchmark: per_feature pass=true when P/R/F1 above thresholds + dim_p95 below max", () => {
  const cmp = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
    { dimensions: [{ kind: "x", nominal: 1.0 }] },
  );
  const r = aggregateBenchmark([mkPrint("die", cmp, {})]);
  assert.equal(r.classes[0].per_feature["x"].pass, true);
  assert.equal(r.classes[0].pass, true);
});

test("aggregateBenchmark: per_feature pass=false when precision below threshold", () => {
  // 1 TP + 1 FP → precision=0.5 (below 0.80 default)
  const extracted = {
    dimensions: [
      { kind: "x", nominal: 1.0 },
      { kind: "hallucinated", nominal: 5.0 },
    ],
  };
  const groundTruth = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const cmp = compareExtractionToGroundTruth(extracted, groundTruth);
  const r = aggregateBenchmark([mkPrint("die", cmp, extracted)]);
  // 'hallucinated' kind has 0 TP + 1 FP + 0 FN → precision=0, recall=0 → fail
  assert.equal(r.classes[0].per_feature["hallucinated"].pass, false);
  assert.equal(r.classes[0].pass, false);
});

test("aggregateBenchmark: custom thresholds honored", () => {
  // Lax thresholds — should pass even imperfect extraction
  const extracted = {
    dimensions: [
      { kind: "x", nominal: 1.0 },
      { kind: "hallucinated", nominal: 5.0 },
    ],
  };
  const groundTruth = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const cmp = compareExtractionToGroundTruth(extracted, groundTruth);
  const r = aggregateBenchmark(
    [mkPrint("die", cmp, extracted)],
    { thresholds: { min_precision: 0, min_recall: 0, min_f1: 0, max_dim_error_mm_p95: 999 } },
  );
  assert.equal(r.classes[0].pass, true);
});

test("aggregateBenchmark: overall_precision + overall_recall computed from total TP/FP/FN", () => {
  // 2 prints: 1 perfect, 1 with 1 FP
  const perfect = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1 }] },
    { dimensions: [{ kind: "x", nominal: 1 }] },
  );
  const withFP = compareExtractionToGroundTruth(
    { dimensions: [{ kind: "x", nominal: 1 }, { kind: "hallucinated", nominal: 2 }] },
    { dimensions: [{ kind: "x", nominal: 1 }] },
  );
  const r = aggregateBenchmark([
    mkPrint("die", perfect, {}),
    mkPrint("die", withFP, {}),
  ]);
  // total tp=2, fp=1, fn=0 → P = 2/3, R = 2/2 = 1
  const die = r.classes[0];
  assert.ok(Math.abs(die.overall_precision - 2/3) < 1e-9);
  assert.equal(die.overall_recall, 1);
});

// ── formatBenchmarkSummary ─────────────────────────────────────────

test("formatBenchmarkSummary: returns non-empty operator-readable lines", () => {
  const cmp = compareExtractionToGroundTruth({ dimensions: [{ kind: "x", nominal: 1 }] }, { dimensions: [{ kind: "x", nominal: 1 }] });
  const r = aggregateBenchmark([mkPrint("die", cmp, {})]);
  const lines = formatBenchmarkSummary(r);
  assert.ok(lines.length >= 3);
  assert.ok(lines[0].includes("BENCHMARK SUMMARY"));
  assert.ok(lines.some((l) => l.includes("die")));
  assert.ok(lines.some((l) => l.includes("PASS") || l.includes("FAIL")));
});

test("formatBenchmarkSummary: null/empty report doesn't crash", () => {
  const lines = formatBenchmarkSummary(null);
  assert.ok(lines.length >= 1);
});

// ── Constants surface ─────────────────────────────────────────────

test("DEFAULT_THRESHOLDS: precision/recall/F1 floor is 0.80", () => {
  assert.equal(DEFAULT_THRESHOLDS.min_precision, 0.80);
  assert.equal(DEFAULT_THRESHOLDS.min_recall, 0.80);
  assert.equal(DEFAULT_THRESHOLDS.min_f1, 0.80);
});

test("DEFAULT_DIM_MATCH_TOLERANCE_MM is 0.10mm (canonical for 'these are the same dim')", () => {
  assert.equal(DEFAULT_DIM_MATCH_TOLERANCE_MM, 0.10);
});

// ── R12: never silent miss ─────────────────────────────────────────

// ── U-TDP05: presence_only matching mode ───────────────────────────

test("presence_only: kind in extraction → TP (no nominal pairing required)", () => {
  const extracted = { dimensions: [{ kind: "central_oil_hole", nominal: 1.27 }] };
  const groundTruth = { dimensions: [{ kind: "central_oil_hole", presence_only: true }] };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
});

test("presence_only: kind MISSING from extraction → FN", () => {
  const extracted = { dimensions: [{ kind: "other", nominal: 5.0 }] };
  const groundTruth = { dimensions: [{ kind: "central_oil_hole", presence_only: true }] };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 0);
  assert.equal(r.byKind["central_oil_hole"].fn, 1);
});

test("presence_only: extra extracted of same kind does NOT count as FP (GT carries no nominal to compare)", () => {
  // 1 presence_only GT, 3 extracted of same kind → 1 TP, NOT 1 TP + 2 FP.
  // Rationale: GT didn't carry the dim values to compare; we can't say the
  // extras are hallucinations.
  const extracted = {
    dimensions: [
      { kind: "central_oil_hole", nominal: 1.27 },
      { kind: "central_oil_hole", nominal: 1.30 },
      { kind: "central_oil_hole", nominal: 1.25 },
    ],
  };
  const groundTruth = { dimensions: [{ kind: "central_oil_hole", presence_only: true }] };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
});

test("presence_only: mixed-mode grades each GT entry by its OWN mode (R12 — no silent drops)", () => {
  // GT has BOTH presence_only and nominal entries for same kind:
  //   - presence_only entry → TP (any unused extracted of same kind exists)
  //   - nominal 5.0 entry → can't pair (only extracted is at 1.0, Δ=4.0 > tol)
  // Extracted at 1.0 → used by presence_only match (greedy first-free).
  const extracted = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const groundTruth = {
    dimensions: [
      { kind: "x", presence_only: true },
      { kind: "x", nominal: 5.0 },
    ],
  };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.tp, 1); // presence_only matched
  assert.equal(r.fn, 1); // nominal 5.0 unmatched
  assert.equal(r.fp, 0); // extracted was consumed by presence_only
});

test("presence_only: malformed GT entry (no flag + no finite nominal) → counted as FN (R12 — never silent)", () => {
  const extracted = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const groundTruth = {
    dimensions: [
      { kind: "x" }, // no nominal, no presence_only flag — malformed
    ],
  };
  const r = compareExtractionToGroundTruth(extracted, groundTruth);
  assert.equal(r.fn, 1); // malformed GT entry counted, not silently dropped
  assert.equal(r.fp, 1); // extracted leftover → FP
});

test("R12: per_feature surfaces tp/fp/fn even when class fails (operators see WHY it failed)", () => {
  const extracted = { dimensions: [{ kind: "x", nominal: 1.0 }] };
  const groundTruth = { dimensions: [{ kind: "y", nominal: 2.0 }] }; // entirely different kind
  const cmp = compareExtractionToGroundTruth(extracted, groundTruth);
  const r = aggregateBenchmark([mkPrint("die", cmp, extracted)]);
  // Both kinds present in per_feature so operator can see the failure shape
  assert.ok("x" in r.classes[0].per_feature);
  assert.ok("y" in r.classes[0].per_feature);
  assert.equal(r.classes[0].per_feature["x"].fp, 1);
  assert.equal(r.classes[0].per_feature["y"].fn, 1);
});
