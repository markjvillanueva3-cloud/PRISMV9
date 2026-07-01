// Tests for cad-print-dims.mjs -- the OCR/part-spec -> PrintDim[] adapter (U-DELTA-CAD-PRINT-DIMS, slot:delta).
// Grounded in a REAL JM inch print (Ø.250 +.002/-.000, 2.000 +/-.005) -> proves units-first (inch callout ->
// mm) end-to-end against a mm-generated part, via the canonical convertToMm (single-sourced, not re-implemented).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonType, dimsFromVisionExtraction, dimsFromPartSpec, canonicalizeCircularDims } from "./cad-print-dims.mjs";
import { scorePrintMatch } from "./cad-print-dim-match.mjs";

const approx = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) <= eps, `${a} ~= ${b}`);

test("canonType: normalizes linear/angular; passes diameter/radius/chamfer through; unknown -> lowercased raw", () => {
  assert.equal(canonType("linear"), "linear");
  assert.equal(canonType("angular"), "angle");
  assert.equal(canonType("Diameter"), "diameter");
  assert.equal(canonType("RADIUS"), "radius");
  assert.equal(canonType("counterbore"), "counterbore");
  assert.equal(canonType("weirdtype"), "weirdtype");
  assert.equal(canonType(null), "linear");
});

test("dimsFromVisionExtraction: INCH callouts -> mm via convertToMm (units-first 25.4x)", () => {
  const extraction = { dimensions: [
    { type: "diameter", nominal: 0.25, unit: "in", tolerance_type: "unilateral_plus", tolerance_upper: 0.002, tolerance_lower: 0.0 },
    { type: "linear", nominal: 2.0, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.005, tolerance_lower: -0.005 },
  ] };
  const { dims, dropped } = dimsFromVisionExtraction(extraction);
  assert.equal(dropped.length, 0);
  approx(dims[0].nominal, 6.35);          // .250" -> 6.35mm
  approx(dims[0].tolPlus, 0.0508);        // .002" -> 0.0508mm
  approx(dims[0].tolMinus, 0.0);
  assert.equal(dims[0].type, "diameter");
  approx(dims[1].nominal, 50.8);          // 2.000" -> 50.8mm
  approx(dims[1].tolPlus, 0.127);         // .005" -> 0.127mm
  approx(dims[1].tolMinus, 0.127);
});
test("dimsFromVisionExtraction: mm passthrough; basic/reference get NO band; bare-array input accepted", () => {
  const { dims } = dimsFromVisionExtraction([
    { type: "linear", nominal: 30, unit: "mm", tolerance_type: "basic", tolerance_upper: 0.1, tolerance_lower: -0.1 },
  ]);
  approx(dims[0].nominal, 30);
  assert.equal(dims[0].tolPlus, undefined, "basic dims carry NO band -> scorer falls back to relTol");
  assert.equal(dims[0].tolMinus, undefined);
});
test("dimsFromVisionExtraction: unit-unresolved dim is SURFACED in dropped, never silently coerced (PMI safety)", () => {
  const { dims, dropped } = dimsFromVisionExtraction({ dimensions: [
    { type: "diameter", nominal: 0.5, unit: "wat" },           // unknown unit, no assumeUnits -> unresolved
    { type: "linear", nominal: 10, unit: "mm" },
  ] });
  assert.equal(dims.length, 1, "only the resolvable mm dim is emitted");
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].reason, "unit-unresolved");
  assert.equal(dropped[0].nominal, 0.5);
});
test("dimsFromVisionExtraction: assumeUnits applies the title-block default to a unit-less dim", () => {
  const { dims, dropped } = dimsFromVisionExtraction({ dimensions: [{ type: "linear", nominal: 1.0 }] }, { assumeUnits: "in" });
  assert.equal(dropped.length, 0);
  approx(dims[0].nominal, 25.4, 1e-3);
  assert.equal(dims[0].unitsAssumed, true, "assumed-units flagged, not hidden");
});

test("dimsFromPartSpec: bbox -> linear dims; holes -> diameter dims; radii -> radius dims (mm passthrough)", () => {
  const dims = dimsFromPartSpec({ bboxMm: [50.8, 25.4, 12.7], holes: [{ diameterMm: 6.35 }, 6.35], radiiMm: [3.0] });
  assert.equal(dims.filter((d) => d.type === "linear").length, 3);
  assert.equal(dims.filter((d) => d.type === "diameter").length, 2);
  assert.equal(dims.filter((d) => d.type === "radius").length, 1);
  assert.equal(dims.find((d) => d.type === "radius").nominal, 3.0);
  // robust to a bare-number hole and a {dia} alias; drops non-positive / non-finite
  const d2 = dimsFromPartSpec({ bboxMm: [10, 0, -5], holes: [{ dia: 4 }], radiiMm: ["x", 2] });
  assert.equal(d2.filter((d) => d.type === "linear").length, 1, "only the positive bbox axis");
  assert.equal(d2.find((d) => d.type === "diameter").nominal, 4);
  assert.equal(d2.filter((d) => d.type === "radius").length, 1);
});

test("canonicalizeCircularDims: diameter Ø -> radius D/2 (band halved, dimAs tag); radius/linear pass through", () => {
  const out = canonicalizeCircularDims([
    { type: "diameter", nominal: 0.75 * 25.4, tolPlus: 0.05, tolMinus: 0.05 }, // Ø19.05 -> R9.525
    { type: "radius", nominal: 3.0 },
    { type: "linear", nominal: 50 },
  ]);
  approx(out[0].nominal, 9.525);
  assert.equal(out[0].type, "radius");
  assert.equal(out[0].dimAs, "diameter", "original convention preserved for reporting");
  approx(out[0].tolPlus, 0.025);
  assert.equal(out[1].nominal, 3.0, "an existing radius is untouched");
  assert.equal(out[2].type, "linear", "linear untouched");
});
test("canonicalizeCircularDims: a Ø-print feature now matches the SAME feature as a STEP radius literal", () => {
  // print holes a Ø.750; the generated STEP exposes that hole as a radius literal R.375 (9.525mm)
  const print = canonicalizeCircularDims([{ type: "diameter", nominal: 19.05 }]);
  const part = canonicalizeCircularDims(dimsFromPartSpec({ bboxMm: [], radiiMm: [9.525] }));
  const r = scorePrintMatch(print, part);
  assert.equal(r.accurate, true, "Ø.750 hole <-> R.375 STEP radius is the same feature");
  assert.equal(r.missingCount, 0);
  assert.equal(r.extraCount, 0);
});

test("END-TO-END: an INCH print matches a MM-generated part through the scorer (units-first proven)", () => {
  // Original print: 2x1x0.5 inch block + a Ø.250 inch hole, all toleranced.
  const print = dimsFromVisionExtraction({ dimensions: [
    { type: "linear", nominal: 2.0, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.01, tolerance_lower: -0.01 },
    { type: "linear", nominal: 1.0, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.01, tolerance_lower: -0.01 },
    { type: "linear", nominal: 0.5, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.01, tolerance_lower: -0.01 },
    { type: "diameter", nominal: 0.25, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.005, tolerance_lower: -0.005 },
  ] }).dims;
  // Generated part (kernel mm): 50.8 x 25.4 x 12.7 + a 6.35mm hole -> should MATCH the inch print exactly.
  const gen = dimsFromPartSpec({ bboxMm: [50.8, 25.4, 12.7], holes: [{ diameterMm: 6.35 }] });
  const report = scorePrintMatch(print, gen);
  assert.equal(report.accurate, true, "inch print <-> mm part agree once units are resolved to mm");
  assert.equal(report.completeness, 1);
  assert.equal(report.dimAccuracy, 1);

  // And a part with the hole MISSING is caught (the feature-count gate, across the OCR<->gen boundary)
  const genNoHole = dimsFromPartSpec({ bboxMm: [50.8, 25.4, 12.7], holes: [] });
  const bad = scorePrintMatch(print, genNoHole);
  assert.equal(bad.accurate, false);
  assert.equal(bad.missingCount, 1);
  assert.equal(bad.missing[0].type, "diameter");
});
