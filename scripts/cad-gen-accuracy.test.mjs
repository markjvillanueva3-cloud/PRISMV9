// Tests for cad-gen-accuracy.mjs pure helpers (U-DELTA-CADGEN-KERNEL-ACCURACY, slot:delta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRequestedDims, gradeDimAccuracy, aggregateSuite, runSuite, CANONICAL_SUITE } from "./cad-gen-accuracy.mjs";

test("parseRequestedDims: mm triple in various phrasings -> sorted-desc mm", () => {
  assert.deepEqual(parseRequestedDims("50mm x 30mm x 20mm").dimsMm, [50, 30, 20]);
  assert.deepEqual(parseRequestedDims("a 50 x 30 x 20 mm plate").dimsMm, [50, 30, 20]);
  assert.deepEqual(parseRequestedDims("50x30x20").dimsMm, [50, 30, 20]);
  assert.deepEqual(parseRequestedDims("a block 20 x 50 x 30 mm").dimsMm, [50, 30, 20], "sorted descending (orientation-free)");
});

test("parseRequestedDims: inch + cm convert to mm", () => {
  assert.deepEqual(parseRequestedDims("2 x 1 x 0.5 inch").dimsMm, [50.8, 25.4, 12.7]);
  assert.equal(parseRequestedDims('2" x 1" x 0.5"').unit, "inch");
  assert.deepEqual(parseRequestedDims("5 x 3 x 2 cm").dimsMm, [50, 30, 20]);
});

test("parseRequestedDims: no triple / degenerate -> null (never fabricates)", () => {
  assert.equal(parseRequestedDims("a typical die plate"), null);
  assert.equal(parseRequestedDims("a 50mm cube"), null, "single dim is not a triple");
  assert.equal(parseRequestedDims("0 x 0 x 0 mm"), null, "non-positive dropped");
  assert.equal(parseRequestedDims(""), null);
  assert.equal(parseRequestedDims(null), null);
});

test("gradeDimAccuracy: within tol -> accurate; over tol -> inaccurate", () => {
  // kernel reads the TRUE 50x30x20 (where point-cloud wrongly gave 50x50x30 -- the whole point)
  const ok = gradeDimAccuracy([50, 30, 20], [50, 30, 20]);
  assert.equal(ok.accurate, true);
  assert.equal(ok.maxRelErr, 0);
  // a 2x-too-big part fails
  const big = gradeDimAccuracy([100, 60, 40], [50, 30, 20]);
  assert.equal(big.accurate, false);
  assert.equal(big.maxRelErr, 1);
  // orientation-free (sorted desc): kernel [20,30,50] matches requested [50,30,20]
  assert.equal(gradeDimAccuracy([20, 30, 50], [50, 30, 20]).accurate, true);
});

test("gradeDimAccuracy: tolerance boundary (2% default)", () => {
  assert.equal(gradeDimAccuracy([51, 30, 20], [50, 30, 20]).accurate, true, "2% exactly -> accurate");
  assert.equal(gradeDimAccuracy([51.5, 30, 20], [50, 30, 20]).accurate, false, "3% -> inaccurate");
  assert.equal(gradeDimAccuracy([50, 30, 20], [50, 30, 20], 0).accurate, true, "exact with 0 tol");
});

test("gradeDimAccuracy: missing/degenerate inputs -> not accurate, never throws (R12)", () => {
  assert.equal(gradeDimAccuracy(null, [50, 30, 20]).accurate, false);
  assert.equal(gradeDimAccuracy([50, 30], [50, 30, 20]).accurate, false, "wrong arity");
  assert.doesNotThrow(() => gradeDimAccuracy(null, null));
  assert.match(gradeDimAccuracy(null, null).reason, /missing/);
});

test("CANONICAL_SUITE: every case has a request + a valid 3-dim expectMm", () => {
  assert.ok(CANONICAL_SUITE.length >= 5);
  for (const c of CANONICAL_SUITE) {
    assert.equal(typeof c.request, "string");
    assert.ok(Array.isArray(c.expectMm) && c.expectMm.length === 3 && c.expectMm.every((d) => d > 0));
  }
});

test("aggregateSuite: splits accurate / inaccurate / gen-failed; computes rate over GENERATED", () => {
  const agg = aggregateSuite([
    { request: "a", genFail: false, accurate: true, kernelDims: [50, 30, 20], requestedDims: [50, 30, 20], maxRelErr: 0 },
    { request: "b", genFail: false, accurate: false, kernelDims: [100, 60, 40], requestedDims: [50, 30, 20], maxRelErr: 1 },
    { request: "c", genFail: true, reason: "ollama down" },
  ]);
  assert.equal(agg.total, 3);
  assert.equal(agg.generated, 2);
  assert.equal(agg.accurate, 1);
  assert.equal(agg.accuracyRate, 0.5, "rate is over GENERATED (2), not total (3)");
  assert.equal(agg.inaccurate.length, 1);
  assert.equal(agg.inaccurate[0].request, "b");
  assert.equal(agg.genFailed.length, 1);
  assert.equal(agg.genFailed[0].reason, "ollama down");
});

test("runSuite: injected generate/validate; a generate/validate throw -> genFail, never aborts (R12)", async () => {
  const cases = [
    { request: "good", expectMm: [50, 30, 20] },
    { request: "wrongsize", expectMm: [50, 30, 20] },
    { request: "genthrows", expectMm: [10, 10, 10] },
  ];
  const generate = async (req) => { if (req === "genthrows") throw new Error("ollama timeout"); return `/staged/${req}.step`; };
  const validate = async (sp) => (sp.includes("good") ? [20, 30, 50] : [99, 99, 99]); // good=accurate (sorted), wrong=off
  const { summary } = await runSuite(cases, { generate, validate });
  assert.equal(summary.total, 3);
  assert.equal(summary.accurate, 1, "only 'good' matches");
  assert.equal(summary.inaccurate.length, 1);
  assert.equal(summary.genFailed.length, 1, "'genthrows' recorded, suite did not abort");
  assert.equal(summary.genFailed[0].reason, "ollama timeout");
});

test("runSuite: missing generate/validate throws (R12 contract)", async () => {
  await assert.rejects(() => runSuite([], {}), /generate \+ validate required/);
});
