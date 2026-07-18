/**
 * Tests for cad-systematic-bias.mjs (U-INDIA-CAD-SYSTEMATIC-BIAS).
 * Reference-value assertions (no toBeDefined stubs): exact mean/scale, the pre-correction round-trip
 * invariant (pre-scaling cancels a known generator bias), honest gating (thin samples / mixed sign /
 * sub-threshold are NOT flagged), multi-group separation, plan-object + categorical handling, edges.
 * Run: node --test scripts/lib/cad-systematic-bias.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectSystematicBias, buildBiasModel, applyBiasPrecorrection } from "./cad-systematic-bias.mjs";

/** A numeric set-edit as planCorrections emits: only featureType/parameter/numeric/pctDelta are read. */
const E = (featureType, parameter, pctDelta) => ({ kind: "set", featureType, parameter, numeric: true, pctDelta });
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

test("consistent +2% oversizing over 12 parts -> flagged biased with exact mean + suggested scale", () => {
  const edits = repeat(12, () => E("hole", "diameter", 2));
  const res = detectSystematicBias(edits);
  assert.equal(res.biasedCount, 1);
  const g = res.groups[0];
  assert.equal(g.featureType, "hole");
  assert.equal(g.parameter, "diameter");
  assert.equal(g.n, 12);
  assert.ok(Math.abs(g.meanPctDelta - 2) < 1e-9);
  assert.ok(Math.abs(g.suggestedScale - 1 / 1.02) < 1e-9); // 0.980392...
  assert.equal(g.biased, true);
  assert.match(g.directive, /oversized/);
});

test("ROUND-TRIP INVARIANT: pre-correction cancels a known +2% generator bias to ~0", () => {
  const edits = repeat(10, () => E("hole", "diameter", 2)); // generator draws +2% oversized
  const model = buildBiasModel(detectSystematicBias(edits));
  const intended = 10;
  const preCorrected = applyBiasPrecorrection("hole", "diameter", intended, model); // feed generator this
  const drawn = preCorrected * 1.02; // the generator applies its own +2% bias
  assert.ok(Math.abs(drawn - intended) < 1e-9, `pre-correction should land on ${intended}, got ${drawn}`);
});

test("honest gating -- thin evidence (n<minSamples) is NOT declared a bias", () => {
  const edits = repeat(5, () => E("hole", "diameter", 5)); // strong but only 5 samples
  const res = detectSystematicBias(edits);
  assert.equal(res.biasedCount, 0);
  assert.equal(res.groups[0].biased, false);
  assert.equal(res.groups[0].suggestedScale, 1); // no scaling on thin evidence
});

test("honest gating -- inconsistent sign is NOT pre-corrected even when |mean| clears the threshold", () => {
  // 8x +3% and 4x -3% -> mean = (24-12)/12 = +1.0% (>= 1.0 threshold) but same-sign only 8/12 = 66.7% < 75%
  const edits = [...repeat(8, () => E("slot", "width", 3)), ...repeat(4, () => E("slot", "width", -3))];
  const res = detectSystematicBias(edits);
  const g = res.groups[0];
  assert.ok(Math.abs(g.meanPctDelta - 1) < 1e-9);
  assert.ok(g.sameSignFraction < 0.75);
  assert.equal(g.biased, false, "mixed-sign scatter is random error, not a systematic bias");
});

test("honest gating -- a sub-threshold mean (|mean| < minBiasPct) is noise, not a bias", () => {
  const edits = repeat(12, () => E("pocket", "depth", 0.5)); // consistent but only 0.5%
  const res = detectSystematicBias(edits);
  assert.equal(res.groups[0].biased, false);
});

test("multiple groups -- oversize scales down, undersize scales up, tracked independently", () => {
  const edits = [
    ...repeat(10, () => E("hole", "diameter", 2)), // +2% oversized -> scale < 1
    ...repeat(10, () => E("pocket", "depth", -3)), // -3% undersized -> scale > 1
  ];
  const res = detectSystematicBias(edits);
  assert.equal(res.biasedCount, 2);
  const hole = res.groups.find((g) => g.featureType === "hole");
  const pocket = res.groups.find((g) => g.featureType === "pocket");
  assert.ok(hole.suggestedScale < 1);
  assert.ok(pocket.suggestedScale > 1);
  assert.ok(Math.abs(pocket.suggestedScale - 1 / 0.97) < 1e-9);
});

test("buildBiasModel keeps ONLY biased groups; applyBiasPrecorrection is identity for unmodeled keys", () => {
  const edits = [
    ...repeat(10, () => E("hole", "diameter", 2)), // biased
    ...repeat(3, () => E("boss", "height", 4)), // thin -> not biased
  ];
  const model = buildBiasModel(detectSystematicBias(edits));
  assert.ok(model["hole::diameter"]);
  assert.equal(model["boss::height"], undefined);
  assert.equal(applyBiasPrecorrection("boss", "height", 7, model), 7); // untouched
});

test("accepts planCorrections() result objects (flattens their .setEdits)", () => {
  const planA = { setEdits: repeat(6, () => E("hole", "diameter", 2)) };
  const planB = { setEdits: repeat(6, () => E("hole", "diameter", 2)) };
  const res = detectSystematicBias([planA, planB]);
  assert.equal(res.groups[0].n, 12);
  assert.equal(res.groups[0].biased, true);
});

test("categorical set-edits (numeric:false) carry no pctDelta and are excluded", () => {
  const edits = [
    ...repeat(10, () => E("hole", "diameter", 2)),
    { kind: "set", featureType: "hole", parameter: "style", numeric: false }, // ignored
  ];
  const res = detectSystematicBias(edits);
  assert.equal(res.summary.totalSamples, 10);
});

test("strongest bias ranks first and is surfaced as summary.topBias", () => {
  const edits = [
    ...repeat(10, () => E("hole", "diameter", 1.5)),
    ...repeat(10, () => E("pocket", "depth", 6)), // bigger bias
  ];
  const res = detectSystematicBias(edits);
  assert.equal(res.groups[0].featureType, "pocket");
  assert.equal(res.summary.topBias, res.groups[0].directive);
});

test("edge: empty stream -> no groups; non-array -> TypeError; bad value passes through", () => {
  const res = detectSystematicBias([]);
  assert.equal(res.summary.totalGroups, 0);
  assert.equal(res.biasedCount, 0);
  assert.equal(res.summary.topBias, null);
  assert.throws(() => detectSystematicBias(null), TypeError);
  assert.equal(applyBiasPrecorrection("hole", "diameter", "NaNvalue", {}), "NaNvalue");
  assert.equal(applyBiasPrecorrection("hole", "diameter", 5, undefined), 5);
});
