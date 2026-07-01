// Tests for cad-self-check-sweep.mjs (U-DELTA-CAD-SELF-CHECK-SWEEP, slot:delta).
// aggregateSweep (pure) gets full reference-value coverage; gradeOnePart's SKIP control-flow is unit-tested,
// and its happy-path grading is validated LIVE on the real 254-part corpus (stronger than a synthetic STEP).
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeOnePart, aggregateSweep, newestPerRequest } from "./cad-self-check-sweep.mjs";

test("newestPerRequest: keeps the NEWEST generation per request slug (drops stale pre-fix duplicates)", () => {
  const parts = [
    { label: "a-2-0-inch-plate-1782446006596" },  // oldest (pre-fix, buggy)
    { label: "a-2-0-inch-plate-1782446771327" },  // middle (pre-fix)
    { label: "a-2-0-inch-plate-1782686811266" },  // newest (post-fix, correct)
    { label: "a-1-0-inch-cube-1782445953393" },   // different request, single gen
  ];
  const kept = newestPerRequest(parts);
  assert.equal(kept.length, 2, "the 3 plate dupes collapse to 1 newest + the cube");
  assert.ok(kept.some((p) => p.label === "a-2-0-inch-plate-1782686811266"), "kept the newest plate");
  assert.ok(!kept.some((p) => p.label === "a-2-0-inch-plate-1782446006596"), "dropped the oldest buggy plate");
  assert.ok(kept.some((p) => p.label === "a-1-0-inch-cube-1782445953393"));
});
test("newestPerRequest: a label without a -timestamp suffix is kept as its own key (never dropped)", () => {
  const kept = newestPerRequest([{ label: "weird-no-ts" }, { label: "weird-no-ts" }]);
  assert.equal(kept.length, 1, "identical no-ts labels collapse to one");
  assert.equal(newestPerRequest([]).length, 0);
});

test("gradeOnePart: a request with NO parseable dimensions -> skipped unparseable-request (never a false pass)", () => {
  const r = gradeOnePart({ label: "blob", requestText: "make something nice", stepText: "anything" });
  assert.equal(r.skipped, "unparseable-request");
  assert.equal(r.accurate, undefined, "an ungradeable part is never counted accurate");
});
test("gradeOnePart: a valid request but empty/garbage STEP -> skipped no-part-dims (surfaced, not a pass)", () => {
  const r = gradeOnePart({ label: "cube", requestText: "a 1 inch cube", stepText: "" });
  assert.equal(r.skipped, "no-part-dims");
});

test("aggregateSweep: accuracy + reliable-bbox rate + defect distribution (reference values)", () => {
  const rows = [
    { label: "a", accurate: true, score: 1, missingCount: 0, extraCount: 0, bboxReliable: true, bboxAdvisory: false },
    { label: "b", accurate: false, score: 0.75, missingCount: 1, extraCount: 0, bboxReliable: true, bboxAdvisory: false }, // missing hole
    { label: "c", accurate: false, score: 0.8, missingCount: 0, extraCount: 2, bboxReliable: false, bboxAdvisory: true }, // curved, extra radii
    { label: "d", skipped: "unparseable-request" },
    { label: "e", skipped: "no-part-dims" },
  ];
  const s = aggregateSweep(rows);
  assert.equal(s.total, 5);
  assert.equal(s.graded, 3);
  assert.equal(s.accurate, 1);
  assert.equal(s.accuracyRate, 0.3333);
  assert.equal(s.reliableGraded, 2, "a + b are reliable-bbox (planar)");
  assert.equal(s.reliableAccuracyRate, 0.5, "1 of 2 reliable parts accurate");
  assert.equal(s.withMissingFeature, 1);
  assert.equal(s.withExtraFeature, 1);
  assert.equal(s.bboxAdvisory, 1);
  assert.equal(s.unparseableRequest, 1);
  assert.equal(s.otherSkipped, 1);
});
test("aggregateSweep: mfg-logic coverage -- counts applicable plans, workholdable, warning-flagged (skipped rows never counted)", () => {
  const rows = [
    { accurate: true, bboxReliable: true, mfg: { applicable: true, workholdApplicable: true, warningCount: 0 } },
    { accurate: false, bboxReliable: true, missingCount: 1, mfg: { applicable: true, workholdApplicable: true, warningCount: 1 } }, // thin/short-grip flagged
    { accurate: false, bboxReliable: false, bboxAdvisory: true, mfg: { applicable: true, workholdApplicable: false, warningCount: 0 } },
    { accurate: true, bboxReliable: true, mfg: { applicable: false } }, // request had no external envelope
    { skipped: "unparseable-request" },                                 // skipped -> never in any mfg count
  ];
  const s = aggregateSweep(rows);
  assert.equal(s.mfgApplicable, 3);
  assert.equal(s.mfgWithWorkholding, 2);
  assert.equal(s.mfgWithWarnings, 1);
});
test("aggregateSweep: legacy rows with NO mfg field don't break the mfg aggregate (back-compat -> 0)", () => {
  const s = aggregateSweep([{ accurate: true, bboxReliable: true }, { skipped: "no-part-dims" }]);
  assert.equal(s.mfgApplicable, 0);
  assert.equal(s.mfgWithWorkholding, 0);
  assert.equal(s.mfgWithWarnings, 0);
});
test("aggregateSweep: empty + all-skipped -> null rates, never a fabricated 100%", () => {
  assert.equal(aggregateSweep([]).accuracyRate, null);
  const allSkip = aggregateSweep([{ skipped: "unparseable-request" }, { skipped: "no-part-dims" }]);
  assert.equal(allSkip.graded, 0);
  assert.equal(allSkip.accuracyRate, null);
  assert.equal(allSkip.reliableAccuracyRate, null);
});
