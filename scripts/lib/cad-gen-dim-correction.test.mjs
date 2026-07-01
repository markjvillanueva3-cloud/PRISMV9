/**
 * Tests for cad-gen-dim-correction.mjs (U-DELTA-CADGEN-DIM-CORRECTION, slot:delta).
 * Run: node scripts/lib/cad-gen-dim-correction.test.mjs   (node:test auto-runs on exit)
 *
 * R9: real reference values -- 1 inch = 25.4 mm exactly. The fixtures are REAL GEN worklist specs
 * (state/shared/cad-gen-loop/worklist.txt), so the parser is tested against the strings the format
 * actually emits (the trailing-dot lesson: parse what the format emits, not what you'd type).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INCH_TO_MM, parseIntendedDims, dimDivergence, dimDivergenceToFixRow } from "./cad-gen-dim-correction.mjs";

const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const nearArr = (a, b, tol = 1e-9) => a.length === b.length && a.every((x, i) => near(x, b[i], tol));

// ---- parseIntendedDims: prismatic box-family -> envelope mm ----
test("parseIntendedDims: 'a 1.0 inch cube' -> [25.4,25.4,25.4]", () => {
  const r = parseIntendedDims("a 1.0 inch cube");
  assert.equal(r.kind, "cube");
  assert.ok(nearArr(r.envelopeMm, [25.4, 25.4, 25.4]), JSON.stringify(r));
});

test("parseIntendedDims: integer form 'a 2 inch cube' (no decimal) parses", () => {
  assert.ok(nearArr(parseIntendedDims("a 2 inch cube").envelopeMm, [50.8, 50.8, 50.8]));
});

test("parseIntendedDims: 'A by B by C' block -> sorted-desc envelope (orientation-independent)", () => {
  // real spec: "a 2.0 inch by 1.0 inch by 0.5 inch rectangular plate"
  const r = parseIntendedDims("a 2.0 inch by 1.0 inch by 0.5 inch rectangular plate");
  assert.equal(r.kind, "box");
  assert.ok(nearArr(r.envelopeMm, [50.8, 25.4, 12.7]), JSON.stringify(r));
  // gauge block 1.0 x 0.5 x 0.25
  assert.ok(nearArr(parseIntendedDims("a gauge block 1.0 inch by 0.5 inch by 0.25 inch").envelopeMm, [25.4, 12.7, 6.35]));
});

test("parseIntendedDims: 'N inch square ... M inch thick' -> [a,a,t]", () => {
  // "a 2.0 inch square plate 0.375 inch thick" (NO holes -> not gated)
  const r = parseIntendedDims("a 2.0 inch square plate 0.375 inch thick");
  assert.ok(nearArr(r.envelopeMm, [50.8, 50.8, 9.525]), JSON.stringify(r));
});

test("parseIntendedDims: GATES curved/featured parts to null (point-bbox unreliable -> no false flag)", () => {
  // every one of these is a REAL worklist spec that is round or feature-complex
  assert.equal(parseIntendedDims("a 1.5 inch diameter by 2.0 inch tall cylinder"), null);
  assert.equal(parseIntendedDims("a bushing: 1.0 inch outer diameter, 0.5 inch bore, 1.25 inch long"), null);
  assert.equal(parseIntendedDims("a tapered plug: 1.0 inch diameter at base tapering to 0.5 inch over a 1.5 inch length"), null);
  assert.equal(parseIntendedDims("a v-block 2.0 inch cube with a 90 degree v-groove 0.75 inch deep across the top"), null, "cube w/ v-groove must gate on the groove, not parse as a plain cube");
  assert.equal(parseIntendedDims("a 2.0 inch square plate 0.375 inch thick with a 0.5 inch diameter hole in each corner"), null, "holes -> 'diameter' -> gated (conservative)");
});

test("parseIntendedDims: adversarial -- empty/null/non-string/no-dims -> null", () => {
  assert.equal(parseIntendedDims(""), null);
  assert.equal(parseIntendedDims(null), null);
  assert.equal(parseIntendedDims(42), null);
  assert.equal(parseIntendedDims("a part with no stated dimensions"), null);
});

// ---- dimDivergence: the diff gate ----
test("dimDivergence happy: produced matches intended -> not diverged", () => {
  const d = dimDivergence([25.4, 25.4, 25.4], [25.4, 25.4, 25.4]);
  assert.ok(d.assessable && !d.diverged && d.maxErr < 1e-9, JSON.stringify(d));
});

test("dimDivergence: orientation-independent (axes permuted) still matches", () => {
  const d = dimDivergence([50.8, 25.4, 12.7], [12.7, 50.8, 25.4]); // same box, different axis order
  assert.ok(d.assessable && !d.diverged, `permuted axes must match; ${JSON.stringify(d)}`);
});

test("dimDivergence failure 1: a 50% oversize envelope is FLAGGED", () => {
  const d = dimDivergence([25.4, 25.4, 25.4], [38.1, 25.4, 25.4]); // one axis 1.5x
  assert.ok(d.diverged, "50% axis error must flag");
  assert.ok(near(d.maxErr, 0.5, 1e-6), `maxErr=${d.maxErr}`);
});

test("dimDivergence failure 2: a unit-confusion 25.4x miss (1mm cube vs 1in intended) is FLAGGED", () => {
  // CadQuery built ~1mm instead of 1 inch -> produced ~[1,1,1] vs intended [25.4,25.4,25.4]
  const d = dimDivergence([25.4, 25.4, 25.4], [1, 1, 1]);
  assert.ok(d.diverged && d.maxErr > 0.9, `gross unit-confusion must flag; ${JSON.stringify(d)}`);
});

test("dimDivergence failure 3: malformed/non-finite produced -> not assessable + reason (R12, no fake)", () => {
  assert.equal(dimDivergence([25.4, 25.4, 25.4], [NaN, 25.4, 25.4]).assessable, false);
  assert.equal(dimDivergence([25.4, 25.4, 25.4], [25.4, 25.4]).assessable, false);
  assert.equal(dimDivergence(null, [1, 2, 3]).reason, "no-intended-envelope");
});

test("dimDivergence adversarial: absFloor prevents a thin-dim divide-by-near-zero false flag", () => {
  // intended thin dim 0.1mm, produced 0.3mm: raw rel err = 2.0, but absFloor 0.5 -> 0.2/0.5 = 0.4
  const d = dimDivergence([50, 50, 0.1], [50, 50, 0.3], { relTol: 0.5 });
  assert.ok(d.assessable, JSON.stringify(d));
  assert.ok(near(d.perAxis[2], 0.4, 1e-9), `thin-dim err floored; ${d.perAxis[2]}`);
});

// ---- dimDivergenceToFixRow: canonical fix-ledger row ----
test("dimDivergenceToFixRow: a diverged diff -> canonical row (kind dimensional-divergence, caller ts)", () => {
  const div = dimDivergence([25.4, 25.4, 25.4], [38.1, 25.4, 25.4]);
  const row = dimDivergenceToFixRow(div, { part: "cube", slug: "a-1-inch-cube-123", ts: "2026-06-28T00:00:00.000Z" });
  assert.equal(row.kind, "dimensional-divergence");
  assert.equal(row.domain, "cad");
  assert.equal(row.trainsCadGen, true);
  assert.equal(row.ts, "2026-06-28T00:00:00.000Z");
  assert.equal(row.field, "envelope_bbox_mm");
  assert.match(row.source, /^cad-gen-dim:a-1-inch-cube-123$/);
  assert.match(row.wrong, /produced 38.1x25.4x25.4 mm/);
  assert.match(row.right, /intended 38.1x25.4x25.4 mm|intended 25.4/); // sorted-desc
});

test("dimDivergenceToFixRow: NOT diverged or NOT assessable -> null (no spurious row)", () => {
  assert.equal(dimDivergenceToFixRow(dimDivergence([25.4, 25.4, 25.4], [25.4, 25.4, 25.4]), { part: "cube" }), null);
  assert.equal(dimDivergenceToFixRow(dimDivergence(null, [1, 2, 3]), { part: "x" }), null);
  assert.equal(dimDivergenceToFixRow(null, {}), null);
});

test("INCH_TO_MM is exactly 25.4", () => assert.equal(INCH_TO_MM, 25.4));
