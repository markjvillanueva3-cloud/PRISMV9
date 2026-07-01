// Tests for cad-request-print.mjs -- the "decipher the print" primitive (U-DELTA-CAD-REQUEST-PRINT, slot:delta).
// Grounded in REAL corpus request strings (state/shared/cad-text-gen/*/request.json) with reference mm values.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantUnit, parseEnvelope, parseFeatures, parseRequestPrint } from "./cad-request-print.mjs";

const approx = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} ~= ${b}`);
const linears = (dims) => dims.filter((d) => d.type === "linear").map((d) => d.nominal);
const diams = (dims) => dims.filter((d) => d.type === "diameter").map((d) => d.nominal);

test("dominantUnit: inch vs mm detection; unknown -> null (never silently assume)", () => {
  assert.equal(dominantUnit("a 1.0 inch cube"), "in");
  assert.equal(dominantUnit("a 50mm x 30mm plate"), "mm");
  assert.equal(dominantUnit("a featureless blob"), null);
});

test("parseEnvelope: cube -> 3 equal linear (inch->mm)", () => {
  const { dims, shape } = parseEnvelope("a 1.0 inch cube", "in");
  assert.equal(shape, "cube");
  assert.deepEqual(linears(dims).map((v) => Math.round(v * 100) / 100), [25.4, 25.4, 25.4]);
});
test("parseEnvelope: 'N by M by P' rectangular plate (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a 2 inch by 1 inch by 0.5 inch rectangular steel plate", "in");
  assert.equal(shape, "rect");
  const L = linears(dims);
  approx(L[0], 50.8); approx(L[1], 25.4); approx(L[2], 12.7);
});
test("parseEnvelope: 'D diameter disc T thick' -> diameter + linear (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a 1.5 inch diameter disc 0.25 inch thick", "in");
  assert.equal(shape, "disc");
  approx(diams(dims)[0], 38.1);    // 1.5"
  approx(linears(dims)[0], 6.35);  // 0.25"
});
test("parseEnvelope: 'N square plate T thick' -> two equal linear + thickness", () => {
  const { dims, shape } = parseEnvelope("a 2.0 inch square plate 0.375 inch thick", "in");
  assert.equal(shape, "square-plate");
  const L = linears(dims);
  approx(L[0], 50.8); approx(L[1], 50.8); approx(L[2], 9.525);
});

test("parseEnvelope: 'D diameter by L tall cylinder' -> diameter + linear (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a 0.75 inch diameter by 3 inch tall cylinder", "in");
  assert.equal(shape, "cylinder");
  approx(diams(dims)[0], 19.05);   // 0.75"
  approx(linears(dims)[0], 76.2);  // 3"
});
test("parseEnvelope: 'D diameter cylinder L long' (noun before length, no 'by') + mm form", () => {
  const a = parseEnvelope("a 12.04 mm diameter cylinder 31.78 mm long", "mm");
  assert.equal(a.shape, "cylinder");
  approx(diams(a.dims)[0], 12.04); approx(linears(a.dims)[0], 31.78);
  // shaft form -- envelope is the diameter + overall length (groove/keyway are features, not the envelope)
  const b = parseEnvelope("a 1 inch diameter shaft 3 inch long with a 0.125 inch keyway", "in");
  assert.equal(b.shape, "cylinder");
  approx(diams(b.dims)[0], 25.4); approx(linears(b.dims)[0], 76.2);
});

test("parseEnvelope: truncated cone / tapered plug -> 2 diameters + length (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a truncated cone: 1.5 inch diameter base tapering to 0.75 inch diameter top over 1.5 inch", "in");
  assert.equal(shape, "cone");
  const d = diams(dims); approx(d[0], 38.1); approx(d[1], 19.05);
  approx(linears(dims)[0], 38.1);
});
test("parseEnvelope: two-body flange (D1 thick on a D2 long hub) -> 2 diameters + 2 lengths (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a 1.0 inch diameter flange 0.25 inch thick on a 0.5 inch diameter 1.0 inch long hub", "in");
  assert.equal(shape, "two-body");
  const d = diams(dims), l = linears(dims);
  approx(d[0], 25.4); approx(d[1], 12.7);    // flange OD, hub OD
  approx(l[0], 6.35); approx(l[1], 25.4);    // flange thickness, hub length
});
test("parseEnvelope: pilot punch (stepping down to) + die button (head on body) -> two-body", () => {
  const pp = parseEnvelope("a pilot punch: a 0.5 inch diameter body 1.5 inch long stepping down to a 0.25 inch diameter 0.5 inch long tip", "in");
  assert.equal(pp.shape, "two-body");
  approx(diams(pp.dims)[0], 12.7); approx(diams(pp.dims)[1], 6.35);
  const db = parseEnvelope("a die button: a 0.75 inch diameter head 0.25 inch tall on a 0.5 inch diameter 0.75 inch long body", "in");
  assert.equal(db.shape, "two-body");
  approx(diams(db.dims)[0], 19.05); approx(diams(db.dims)[1], 12.7);
});
test("parseEnvelope: solid cylinder 'N in diameter and M tall' (real corpus form)", () => {
  const { dims, shape } = parseEnvelope("a solid cylinder 30 mm in diameter and 40 mm tall", "mm");
  assert.equal(shape, "cylinder");
  approx(diams(dims)[0], 30); approx(linears(dims)[0], 40);
});
test("parseEnvelope: square tube -> outer square envelope + length (wall is an internal feature)", () => {
  const { dims, shape } = parseEnvelope("a square tube: 1.5 inch square outside with 0.25 inch wall thickness, 3 inch long", "in");
  assert.equal(shape, "square-tube");
  const l = linears(dims);
  approx(l[0], 38.1); approx(l[1], 38.1); approx(l[2], 76.2); // NOT the 0.25 wall thickness
});
test("parseRequestPrint: a dimensionless request ('a typical die plate') stays UNPARSEABLE (no heuristic-fill -- soul rule)", () => {
  assert.deepEqual(parseRequestPrint("a typical die plate").dims, []);
  assert.deepEqual(parseRequestPrint("a typical extrude punch").dims, []);
});

test("parseFeatures: a single through hole -> one diameter (real corpus form)", () => {
  const f = parseFeatures("a 1 inch cube with a 0.25 inch diameter through hole centered on the top face", "in");
  assert.equal(f.length, 1);
  approx(f[0].nominal, 6.35); // 0.25"
  assert.equal(f[0].feature, "hole");
});
test("parseFeatures: 'central bore' / bare 'bore' captured as a diameter", () => {
  approx(parseFeatures("a 1 inch diameter disc with a 0.375 inch diameter central bore", "in")[0].nominal, 9.525);
  approx(parseFeatures("a 2.0 inch gear blank 0.5 inch thick with a 0.625 inch bore", "in")[0].nominal, 15.875);
});
test("parseFeatures: 'hole in each corner' -> FOUR diameter instances (the feature-count gate)", () => {
  const f = parseFeatures("a 2.0 inch square plate with a 0.5 inch diameter hole in each corner inset 0.375 inch", "in");
  assert.equal(f.length, 4, "in each corner = 4 holes");
  for (const h of f) approx(h.nominal, 12.7);
});
test("parseFeatures: counterbore adds a SECOND larger diameter (real corpus form)", () => {
  const f = parseFeatures("a 2 inch plate with a 0.25 inch diameter through hole counterbored to 0.5 inch diameter 0.25 inch deep", "in");
  assert.equal(f.length, 2, "the hole + the counterbore");
  const ds = f.map((x) => x.nominal).sort((a, b) => a - b);
  approx(ds[0], 6.35);   // 0.25 hole
  approx(ds[1], 12.7);   // 0.5 counterbore
  assert.ok(f.some((x) => x.feature === "counterbore"));
});

test("parseRequestPrint: full decipher -- square plate + 4 corner holes (envelope + features)", () => {
  const { dims, shape, featureCount } = parseRequestPrint("a 2.0 inch square plate 0.375 inch thick with a 0.5 inch diameter hole in each corner inset 0.375 inch");
  assert.equal(shape, "square-plate");
  assert.equal(featureCount, 4);
  assert.equal(linears(dims).length, 3);   // side, side, thickness
  assert.equal(diams(dims).length, 4);      // 4 corner holes
  approx(diams(dims)[0], 12.7);
});
test("parseRequestPrint: plate with hole -- this is the 2D ground-truth print the self-check grades against", () => {
  const { dims } = parseRequestPrint("a 2 inch by 1 inch by 0.5 inch rectangular steel plate with a 0.25 inch diameter hole centered on the top face");
  approx(linears(dims).sort((a, b) => b - a)[0], 50.8); // longest = 2"
  assert.equal(diams(dims).length, 1);
  approx(diams(dims)[0], 6.35);
});
test("parseRequestPrint: unparseable request -> empty dims (never fabricates)", () => {
  const { dims } = parseRequestPrint("make something nice");
  assert.deepEqual(dims, []);
});
test("parseRequestPrint: mm request resolves without an inch fallback", () => {
  const { dims, unit } = parseRequestPrint("a 50mm x 30mm x 20mm plate with a 10mm diameter hole");
  assert.equal(unit, "mm");
  approx(linears(dims).sort((a, b) => b - a)[0], 50);
  approx(diams(dims)[0], 10);
});
