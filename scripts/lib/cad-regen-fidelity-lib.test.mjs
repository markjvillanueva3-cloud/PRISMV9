/**
 * Tests for cad-regen-fidelity-lib.mjs (slot:delta). Reference-value asserts (R9).
 * Run: node scripts/lib/cad-regen-fidelity-lib.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseInchesFromSpec,
  dimFidelity,
  bandPass,
  aggregate,
  INCH_TO_MM,
  DEFAULT_BAND,
} from "./cad-regen-fidelity-lib.mjs";

// --- parseInchesFromSpec -----------------------------------------------------

test("parse: '0.5 inch cube' -> cube [0.5,0.5,0.5], bboxMeasurable", () => {
  assert.deepEqual(parseInchesFromSpec("a 0.5 inch cube"), {
    parsed: true,
    archetype: "cube",
    dimsInch: [0.5, 0.5, 0.5],
    bboxMeasurable: true,
  });
});

test("parse: bboxMeasurable is TRUE only for cubes (point-cloud bbox exact), FALSE for curved", () => {
  // A cylinder's circular extent is a CIRCLE entity, not a point cloud -> extractMetrics under-measures
  // the diameter, so the dim band must NOT be evaluated on it.
  assert.equal(parseInchesFromSpec("a 1.0 inch cube").bboxMeasurable, true);
  assert.equal(parseInchesFromSpec("a 0.75 inch diameter by 3 inch tall cylinder").bboxMeasurable, false);
});

test("parse: 'square plate ... thick' -> plate (NOT a cube), bboxMeasurable:false", () => {
  const r = parseInchesFromSpec("a 2.0 inch square plate 0.375 inch thick");
  assert.equal(r.parsed, true);
  assert.equal(r.archetype, "plate"); // must NOT be mis-classified as a cube
  assert.deepEqual(r.dimsInch, [2, 2, 0.375]);
  assert.equal(r.bboxMeasurable, false);
});

test("parse: cylinder 'D diameter by L tall' -> [D,D,L]", () => {
  const r = parseInchesFromSpec("a 0.75 inch diameter by 3 inch tall cylinder");
  assert.equal(r.parsed, true);
  assert.deepEqual(r.dimsInch, [0.75, 0.75, 3]);
});

test("parse: shaft 'D diameter ... L long' -> [D,D,L]", () => {
  assert.deepEqual(parseInchesFromSpec("a 0.75 inch diameter shaft 2.5 inch long").dimsInch, [0.75, 0.75, 2.5]);
});

test("parse: cube WITH a through-hole -> bbox is still the cube side (hole ignored)", () => {
  // adversarial: a 2nd diameter number must NOT corrupt the cube bbox.
  assert.deepEqual(parseInchesFromSpec("a 1.0 inch cube with a 0.25 inch diameter through hole").dimsInch, [1, 1, 1]);
});

test("parse: compound part ('... on a ... shaft') -> parsed:false (never guess intent)", () => {
  const r = parseInchesFromSpec("a 1.0 inch diameter flange 0.25 inch thick on a 0.5 inch diameter shaft");
  assert.equal(r.parsed, false);
  assert.equal(r.reason, "compound-part");
});

test("parse: empty / no archetype -> parsed:false (fail-soft, no throw)", () => {
  assert.equal(parseInchesFromSpec("").parsed, false);
  assert.equal(parseInchesFromSpec(null).parsed, false);
  assert.equal(parseInchesFromSpec("a mysterious widget").reason, "no-recognized-archetype");
});

test("parse: rectangular block 'X by Y by Z inch' -> block [X,Y,Z], bboxMeasurable:true (all-planar)", () => {
  const r = parseInchesFromSpec("a 1.5 inch by 1.5 inch by 0.375 inch rectangular block");
  assert.equal(r.parsed, true);
  assert.equal(r.archetype, "block");
  assert.deepEqual(r.dimsInch, [1.5, 1.5, 0.375]);
  assert.equal(r.bboxMeasurable, true);
});

test("parse: 'D diameter by L tall' is a cylinder, NOT a block (diameter excludes the block branch)", () => {
  // guard: the block branch must not steal cylinders (both contain 'by').
  assert.equal(parseInchesFromSpec("a 0.75 inch diameter by 3 inch tall cylinder").archetype, "cylinder");
});

test("parse: cylinder with TWO diameters -> parsed:false (ambiguous)", () => {
  const r = parseInchesFromSpec("a 1.0 inch diameter by 2 inch diameter tapered 3 inch tall cylinder");
  assert.equal(r.parsed, false);
});

// --- dimFidelity -------------------------------------------------------------

test("dimFidelity: exact match -> 0% mean/worst", () => {
  const mm = [0.5 * INCH_TO_MM, 0.5 * INCH_TO_MM, 0.5 * INCH_TO_MM]; // 12.7 each
  const f = dimFidelity(mm, [12.7, 12.7, 12.7]);
  assert.equal(f.ok, true);
  assert.equal(f.meanDeltaPct, 0);
  assert.equal(f.worstDeltaPct, 0);
});

test("dimFidelity: orientation-invariant (sorted compare) -- cylinder axes in any order", () => {
  // intended [19.05,19.05,76.2]; measured comes in a different axis order [76.2,19.05,19.05].
  const intended = [0.75 * INCH_TO_MM, 0.75 * INCH_TO_MM, 3 * INCH_TO_MM];
  const f = dimFidelity(intended, [76.2, 19.05, 19.05]);
  assert.equal(f.ok, true);
  assert.ok(f.worstDeltaPct < 1e-9, "sorted compare cancels the axis permutation");
});

test("dimFidelity: a real deviation is measured correctly", () => {
  // intended 25.4mm cube side; measured 26.0 on one axis -> (0.6/25.4)*100 = 2.362% on that dim.
  const f = dimFidelity([25.4, 25.4, 25.4], [25.4, 25.4, 26.0]);
  assert.ok(Math.abs(f.worstDeltaPct - 2.3622) < 1e-3);
});

test("dimFidelity: mismatched count / empty -> ok:false (no false pass)", () => {
  assert.equal(dimFidelity([1, 2, 3], [1, 2]).ok, false);
  assert.equal(dimFidelity([], []).ok, false);
});

// --- bandPass ----------------------------------------------------------------

test("bandPass: within band + determinism -> true", () => {
  assert.equal(bandPass({ meanDeltaPct: 1.0, worstDeltaPct: 5.0 }, true), true);
});

test("bandPass: over the worst band -> false", () => {
  assert.equal(bandPass({ meanDeltaPct: 1.0, worstDeltaPct: 6.1 }, true), false);
});

test("bandPass: determinism failed -> false even with perfect dims (pipeline not self-consistent)", () => {
  assert.equal(bandPass({ meanDeltaPct: 0, worstDeltaPct: 0 }, false), false);
});

test("bandPass: NaN fidelity (unparsed intent) -> false", () => {
  assert.equal(bandPass({ meanDeltaPct: NaN, worstDeltaPct: NaN }, true), false);
  assert.equal(DEFAULT_BAND.meanDeltaPct, 2);
});

// --- aggregate ---------------------------------------------------------------

test("aggregate: mixed parts -> correct determinism + dim-band rates", () => {
  const parts = [
    { intentParsed: true, passed: true, fid: { meanDeltaPct: 0.5, worstDeltaPct: 1.0 }, determinismPassed: true },
    { intentParsed: true, passed: false, fid: { meanDeltaPct: 4.0, worstDeltaPct: 9.0 }, determinismPassed: true },
    { intentParsed: false, passed: false, determinismPassed: true }, // self-consistency only
    { intentParsed: false, passed: false, determinismPassed: false }, // pipeline failed on this one
  ];
  const a = aggregate(parts);
  assert.equal(a.total, 4);
  assert.equal(a.determinismPassRate, 0.75); // 3 of 4
  assert.equal(a.dimEvaluatedParts, 2);
  assert.equal(a.dimBandPassParts, 1);
  assert.equal(a.dimBandPassRate, 0.5);
  assert.equal(a.meanDimDeltaPct, 2.25); // (0.5+4.0)/2
  assert.equal(a.worstDimDeltaPct, 9.0);
  assert.equal(a.bandMet, false); // worst 9 > 6
});

test("aggregate: a determinism-FAILED part is excluded from the dim headline (consistency with dimBandPassRate)", () => {
  const parts = [
    { intentParsed: true, passed: true, fid: { meanDeltaPct: 0.5, worstDeltaPct: 1.0 }, determinismPassed: true },
    // in-band dims BUT determinism failed -> must NOT pull bandMet true or pollute the headline.
    { intentParsed: true, passed: false, fid: { meanDeltaPct: 0.1, worstDeltaPct: 0.2 }, determinismPassed: false },
  ];
  const a = aggregate(parts);
  assert.equal(a.dimEvaluatedParts, 1); // only the determinism-passing fid part
  assert.equal(a.meanDimDeltaPct, 0.5);
  assert.equal(a.worstDimDeltaPct, 1.0);
  assert.equal(a.bandMet, true);
});

test("aggregate: empty -> 0 rates, no throw", () => {
  const a = aggregate([]);
  assert.equal(a.total, 0);
  assert.equal(a.determinismPassRate, 0);
  assert.equal(a.dimBandPassRate, null);
});
