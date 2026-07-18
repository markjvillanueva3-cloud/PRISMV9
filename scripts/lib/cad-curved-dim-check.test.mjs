/**
 * Tests for cad-curved-dim-check.mjs (slot:delta, U-CAD-CURVED-DIM-CHECK). Reference-value asserts (R9):
 * a generated cylinder whose STEP radius entity matches the requested diameter must read ACCURATE offline
 * (no kernel), and a mismatch must read inaccurate -- the check that closes the spurious curved "0%".
 *   run: node --test scripts/lib/cad-curved-dim-check.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseRequestedDiameterMm, parseRequestedLengthMm, curvedDimCheck } from "./cad-curved-dim-check.mjs";

const MM_UNIT = "#1=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );";
const INCH_UNIT = "#1=( LENGTH_UNIT() NAMED_UNIT(*) CONVERSION_BASED_UNIT('INCH',#2) );";
const cylStep = (unitLine, radius) => [unitLine, `#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, ${radius} );`, `#66 = CIRCLE ( 'NONE', #588, ${radius} );`].join("\n");
// full cylinder: radius entity + the two seam VERTEX_POINTs at Z=0 and Z=length -> bbox maxExtent = length
const cylStepFull = (unitLine, radius, length) => [
  unitLine, `#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, ${radius} );`,
  `#10=CARTESIAN_POINT('',(${radius},0.,0.));`, `#11=CARTESIAN_POINT('',(${radius},0.,${length}));`,
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
].join("\n");

test("parseRequestedDiameterMm: mm, inch, reversed order, none", () => {
  assert.equal(parseRequestedDiameterMm("a 15.88 mm diameter cylinder 2.92 mm long"), 15.88);
  assert.equal(parseRequestedDiameterMm("a 0.5 inch diameter shaft"), 12.7);
  assert.equal(parseRequestedDiameterMm("cylinder, diameter 20 mm"), 20);
  assert.equal(parseRequestedDiameterMm("a 50mm cube"), null, "no diameter stated -> null");
  assert.equal(parseRequestedDiameterMm(""), null);
});

test("curvedDimCheck: matching radius (mm) -> accurate, ~0% delta (the real offline curved measurement)", () => {
  const r = curvedDimCheck("a 15.88 mm diameter cylinder 2.92 mm long", cylStep(MM_UNIT, "7.94"));
  assert.equal(r.applicable, true);
  assert.equal(r.requestedDiaMm, 15.88);
  assert.equal(r.matchedDiaMm, 15.88);
  assert.equal(r.deltaPct, 0);
  assert.equal(r.accurate, true);
});

test("curvedDimCheck: inch request + inch STEP -> unit-resolved match", () => {
  const r = curvedDimCheck("a 0.5 inch diameter shaft", cylStep(INCH_UNIT, "0.25"));
  assert.equal(r.applicable, true);
  assert.ok(Math.abs(r.requestedDiaMm - 12.7) < 1e-6);
  assert.ok(Math.abs(r.matchedDiaMm - 12.7) < 1e-6, "0.25 inch radius -> 12.7 mm diameter");
  assert.equal(r.accurate, true);
});

test("curvedDimCheck: wrong diameter -> inaccurate", () => {
  const r = curvedDimCheck("a 15.88 mm diameter cylinder", cylStep(MM_UNIT, "10.0")); // dia 20 vs 15.88
  assert.equal(r.accurate, false);
  assert.ok(r.deltaPct > 20, "20mm vs 15.88mm ~26% off");
});

test("curvedDimCheck: picks the radius CLOSEST to requested/2 (robust to extra fillet radii)", () => {
  const step = [MM_UNIT, "#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, 7.94 );", "#70 = CIRCLE ( 'NONE', #99, 0.5 );"].join("\n"); // 0.5 = fillet
  const r = curvedDimCheck("a 15.88 mm diameter cylinder", step);
  assert.equal(r.matchedDiaMm, 15.88, "the 7.94 radius wins over the 0.5 fillet");
  assert.equal(r.accurate, true);
});

test("curvedDimCheck: no diameter request / no radii -> applicable false (no throw)", () => {
  assert.equal(curvedDimCheck("a 50mm cube", cylStep(MM_UNIT, "7.94")).applicable, false);
  assert.equal(curvedDimCheck("a 15.88 mm diameter cylinder", MM_UNIT).applicable, false, "no radius entity -> not applicable");
});

test("parseRequestedLengthMm: long/tall/inch/none", () => {
  assert.equal(parseRequestedLengthMm("a 15.88 mm diameter cylinder 2.92 mm long"), 2.92);
  assert.ok(Math.abs(parseRequestedLengthMm("a 3 inch tall cylinder") - 76.2) < 1e-6, "3 inch -> 76.2 mm (float-tolerant)");
  assert.equal(parseRequestedLengthMm("a 50mm cube"), null);
});

test("curvedDimCheck: LENGTH checked via bbox -- right dia + WRONG length -> inaccurate (the new coverage)", () => {
  const r = curvedDimCheck("a 15.88 mm diameter cylinder 2.92 mm long", cylStepFull(MM_UNIT, "7.94", "10.0"));
  assert.equal(r.applicable, true);
  assert.ok(Math.abs(r.diaDeltaPct) < 0.01, "diameter is correct");
  assert.ok(r.lenDeltaPct > 100, "length way off (10 mm vs requested 2.92 mm)");
  assert.equal(r.accurate, false, "right diameter but wrong length -> NOT accurate");
});

test("curvedDimCheck: right dia + right length -> accurate; deltaPct is the worst of the two", () => {
  const r = curvedDimCheck("a 15.88 mm diameter cylinder 2.92 mm long", cylStepFull(MM_UNIT, "7.94", "2.92"));
  assert.equal(r.lenDeltaPct, 0);
  assert.equal(r.diaDeltaPct, 0);
  assert.equal(r.deltaPct, 0);
  assert.equal(r.accurate, true);
});

test("curvedDimCheck: length SKIPPED when the STEP has no bbox (radius-only) -> diameter-only verdict", () => {
  const r = curvedDimCheck("a 15.88 mm diameter cylinder 2.92 mm long", cylStep(MM_UNIT, "7.94"));
  assert.equal(r.lenDeltaPct, null, "no vertices -> no envelope -> length not checked (fail-open on length)");
  assert.equal(r.accurate, true, "falls back to the diameter-only verdict");
});

// A DISC whose rim IS vertex-sampled: bbox = [D, D, thickness]. The OLD maxExtentMm picked D (the diameter)
// as "length" and false-failed a correct disc; the fix removes the two diameter extents -> thickness survives.
const discStep = (unitLine, radius, thick) => [
  unitLine, `#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, ${radius} );`, `#66 = CIRCLE ( 'NONE', #588, ${radius} );`,
  `#10=CARTESIAN_POINT('',(${radius},0.,0.));`, `#11=CARTESIAN_POINT('',(-${radius},0.,0.));`,
  `#12=CARTESIAN_POINT('',(0.,${radius},${thick}));`, `#13=CARTESIAN_POINT('',(0.,-${radius},${thick}));`,
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);", "#22=VERTEX_POINT('',#12);", "#23=VERTEX_POINT('',#13);",
].join("\n");

test("curvedDimCheck: DISC (dia>>thickness, rim sampled) -> thickness measured, not the diameter (the fix)", () => {
  const r = curvedDimCheck("a 38.1 mm diameter disc 6.35 mm thick", discStep(MM_UNIT, "19.05", "6.35"));
  assert.equal(r.matchedDiaMm, 38.1, "diameter still 38.1");
  assert.equal(r.lenReliable, true, "axial thickness unambiguously isolated");
  assert.ok(Math.abs(r.matchedLenMm - 6.35) < 1e-6, "length reads the 6.35 thickness, NOT the 38.1 diameter (old bug)");
  assert.equal(r.accurate, true, "correct disc is now accurate, not false-failed on length");
});

test("curvedDimCheck: DISC with a genuinely wrong thickness still fails on length", () => {
  const r = curvedDimCheck("a 38.1 mm diameter disc 6.35 mm thick", discStep(MM_UNIT, "19.05", "20.0"));
  assert.equal(r.lenReliable, true);
  assert.ok(r.lenDeltaPct > 100, "20 mm vs requested 6.35 mm");
  assert.equal(r.accurate, false, "wrong thickness is still caught (the length check is not neutered)");
});

// A square PLATE with a hole: bbox = [W, W, T], hole radius is the requested "diameter". None of the three
// extents match the hole diameter -> axial length is ambiguous from the point bbox -> ADVISORY, not a fail.
const plateHoleStep = (unitLine, holeR, w, t) => [
  unitLine, `#66 = CIRCLE ( 'NONE', #588, ${holeR} );`,
  `#10=CARTESIAN_POINT('',(${w / 2},${w / 2},0.));`, `#11=CARTESIAN_POINT('',(-${w / 2},-${w / 2},0.));`,
  `#12=CARTESIAN_POINT('',(${w / 2},${w / 2},${t}));`, `#13=CARTESIAN_POINT('',(-${w / 2},-${w / 2},${t}));`,
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);", "#22=VERTEX_POINT('',#12);", "#23=VERTEX_POINT('',#13);",
].join("\n");

test("curvedDimCheck: PLAIN cylinder with a wrong length ~= diameter is STILL caught (no L~=D false pass)", () => {
  // Regression guard (arm-A scrutiny 2026-07-05): requested dia 15.88 / len 2.92, but the part is 15.5 mm long
  // (~= its 15.88 diameter). The sole non-zero bbox extent IS the length -> must NOT be absorbed by the
  // cross-section filter. Old maxExtentMm caught it; the fix must too.
  const r = curvedDimCheck("a 15.88 mm diameter cylinder 2.92 mm long", cylStepFull(MM_UNIT, "7.94", "15.5"));
  assert.equal(r.lenReliable, true, "a plain cylinder's sole extent is always the length, even when L~=D");
  assert.ok(Math.abs(r.matchedLenMm - 15.5) < 1e-6, "measures the true 15.5 mm length, not advisory");
  assert.ok(r.lenDeltaPct > 100, "15.5 vs requested 2.92 mm");
  assert.equal(r.accurate, false, "wrong length ~= diameter is still a FAIL, not a false pass");
});

test("curvedDimCheck: square-plate-with-hole -> right hole diameter, length ADVISORY (no false length fail)", () => {
  // 50.8mm square, 9.525mm thick, 12.7mm dia hole (r=6.35). Requested hole dia 12.7, thickness 9.525.
  const r = curvedDimCheck("a 50.8 mm square plate 9.525 mm thick with a 12.7 mm diameter hole", plateHoleStep(MM_UNIT, "6.35", 50.8, "9.525"));
  assert.equal(r.matchedDiaMm, 12.7, "hole diameter correct");
  assert.equal(r.lenReliable, false, "footprint dominates -> axial length not isolable -> advisory");
  assert.equal(r.lenDeltaPct, null, "length not measured (never false-fails on the 50.8 footprint)");
  assert.equal(r.accurate, true, "diameter-correct part is accurate, not sunk by an un-isolable length");
});
