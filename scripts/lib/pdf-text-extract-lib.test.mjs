// scripts/lib/pdf-text-extract-lib.test.mjs
// Tests for U-TDP07 PDF embedded-text extractor pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractDimensionsFromText,
  _internals,
} from "./pdf-text-extract-lib.mjs";

const { parseSignedTolLine, tryParseToleranceTriple, classifyKind, toLines } = _internals;

// ── parseSignedTolLine ─────────────────────────────────────────────

test("parseSignedTolLine: '- .10' → sign=-1, value=0.10", () => {
  const r = parseSignedTolLine("- .10");
  assert.deepEqual(r, { sign: -1, value: 0.10 });
});

test("parseSignedTolLine: '.10' → sign=+1, value=0.10", () => {
  const r = parseSignedTolLine(".10");
  assert.deepEqual(r, { sign: 1, value: 0.10 });
});

test("parseSignedTolLine: '+.05' → sign=+1, value=0.05", () => {
  const r = parseSignedTolLine("+.05");
  assert.deepEqual(r, { sign: 1, value: 0.05 });
});

test("parseSignedTolLine: empty/garbage → null", () => {
  assert.equal(parseSignedTolLine(""), null);
  assert.equal(parseSignedTolLine("abc"), null);
  assert.equal(parseSignedTolLine(null), null);
});

// ── classifyKind ───────────────────────────────────────────────────

test("classifyKind: 45° angle → bevel_face_chamfer", () => {
  assert.equal(classifyKind({ kind: "angle", nominal: 45.0 }), "bevel_face_chamfer");
  assert.equal(classifyKind({ kind: "angle", nominal: 44.5 }), "bevel_face_chamfer");
  assert.equal(classifyKind({ kind: "angle", nominal: 46.0 }), "bevel_face_chamfer");
});

test("classifyKind: 120° angle → working_tip_taper", () => {
  assert.equal(classifyKind({ kind: "angle", nominal: 120.0 }), "working_tip_taper");
});

test("classifyKind: chamfer-typed dim → bevel_face_chamfer regardless of size", () => {
  assert.equal(classifyKind({ kind: "chamfer", nominal: 0.30 }), "bevel_face_chamfer");
  assert.equal(classifyKind({ kind: "chamfer", nominal: 5.00 }), "bevel_face_chamfer");
});

test("classifyKind: R1.00 → leading_edge_fillet (small)", () => {
  assert.equal(classifyKind({ kind: "radius", nominal: 1.0 }), "leading_edge_fillet");
});

test("classifyKind: R3.00 → shoulder_fillet (mid)", () => {
  assert.equal(classifyKind({ kind: "radius", nominal: 3.0 }), "shoulder_fillet");
});

test("classifyKind: R10.00 → blade_root_fillet (large)", () => {
  assert.equal(classifyKind({ kind: "radius", nominal: 10.0 }), "blade_root_fillet");
});

test("classifyKind: small tight-tol diameter → central_oil_hole", () => {
  // 1.27 mm bore with +/-0.025 tolerance (band=0.05) → tight precision hole
  const r = classifyKind({ kind: "diameter", nominal: 1.27, tolerance: { upper: 0.025, lower: -0.025 } });
  assert.equal(r, "central_oil_hole");
});

test("classifyKind: large diameter → stepped_revolved_axis", () => {
  assert.equal(classifyKind({ kind: "diameter", nominal: 12.0 }), "stepped_revolved_axis");
  assert.equal(classifyKind({ kind: "diameter", nominal: 20.0 }), "stepped_revolved_axis");
});

test("classifyKind: linear dims default → stepped_revolved_axis", () => {
  assert.equal(classifyKind({ kind: "linear", nominal: 70.0 }), "stepped_revolved_axis");
});

// ── tryParseToleranceTriple ────────────────────────────────────────

test("tryParseToleranceTriple: canonical 4-token sequence", () => {
  const lines = ["- .10", ".10", "+", "mm"];
  const r = tryParseToleranceTriple(lines, 0);
  assert.ok(r);
  assert.equal(r.lower, -0.10);
  assert.equal(r.upper, 0.10);
  assert.equal(r.advance, 4);
});

test("tryParseToleranceTriple: missing '+' line → null", () => {
  const lines = ["- .10", ".10", "x", "mm"];
  assert.equal(tryParseToleranceTriple(lines, 0), null);
});

test("tryParseToleranceTriple: missing 'mm' line → null", () => {
  const lines = ["- .10", ".10", "+", "in"];
  assert.equal(tryParseToleranceTriple(lines, 0), null);
});

test("tryParseToleranceTriple: out-of-range index → null", () => {
  const lines = ["- .10", ".10"];
  assert.equal(tryParseToleranceTriple(lines, 0), null);
});

// ── extractDimensionsFromText: happy path ──────────────────────────

test("extract: real JM Die 1666891 carbide-tip PDF text", () => {
  const sample = `DETAIL  A
SCALE 6
SHEET 1  OF 1
DWG NO
1666891
Material: Carbide 883
Grade [HRC]: without
Surface:CVD-TICN
✓Ra 0.05
5.00
n
- .10
.10
+
mm
4.00mm
.30 X 45.0° CHAMFER
R1.00mm
20.0°
4.00
n
- .02
.00
+
mm
Air Flat .05mm deep
3 x 120°
70.00mm
55.00mm
2.31
n
- .01
.00
+
mm
150.0°`;
  const r = extractDimensionsFromText(sample);
  assert.equal(r.success, true);
  // Material + surface + grade recovered
  assert.equal(r.extraction.material, "Carbide 883");
  assert.equal(r.extraction.surface_treatment, "CVD-TICN");
  assert.equal(r.extraction.surface_roughness_ra_um, 0.05);
  const dims = r.extraction.dimensions;
  // At least: 5.00 (Ø bilateral), 4.00 (linear), .30 X 45° chamfer,
  // R1.00, 20° angle, 4.00 (Ø unilateral-ish), relief pattern, 70.00, 55.00, 2.31 (Ø unilateral)
  assert.ok(dims.length >= 8, `expected >=8 dims, got ${dims.length}`);
  // 5.00 Ø with ±0.10 tolerance → bilateral
  const bore5 = dims.find((d) => d.nominal === 5.00 && d.tolerance);
  assert.ok(bore5, "missing 5.00 Ø dim with tolerance");
  assert.equal(bore5.tolerance.upper, 0.10);
  assert.equal(bore5.tolerance.lower, -0.10);
  // Relief pattern recovered (Air Flat .05mm deep + 3 x 120°)
  const relief = dims.find((d) => d.kind === "cross_drilled_relief_holes");
  assert.ok(relief, "missing relief-pattern dim");
  assert.equal(relief.meta.count, 3);
  assert.equal(relief.meta.spacing_deg, 120);
  // Chamfer
  const chamfer = dims.find((d) => d.kind === "bevel_face_chamfer" && d.meta && d.meta.type === "chamfer");
  assert.ok(chamfer, "missing chamfer dim");
  assert.equal(chamfer.meta.angle_deg, 45.0);
  // Fillet R1.00
  const fillet = dims.find((d) => d.kind === "leading_edge_fillet");
  assert.ok(fillet, "missing R1.00 fillet");
});

test("extract: confidence high when ≥3 toleranced dims + material + surface", () => {
  const sample = `Material: Carbide 883
Surface:CVD-TICN
5.00
n
- .10
.10
+
mm
4.00
n
- .02
.00
+
mm
2.31
n
- .01
.00
+
mm`;
  const r = extractDimensionsFromText(sample);
  assert.equal(r.success, true);
  assert.equal(r.extraction.confidence, 0.95);
});

test("extract: confidence medium when ≥2 toleranced dims", () => {
  const sample = `5.00
n
- .10
.10
+
mm
4.00
n
- .02
.00
+
mm`;
  const r = extractDimensionsFromText(sample);
  assert.equal(r.success, true);
  assert.equal(r.extraction.confidence, 0.85);
});

test("extract: confidence low when no dims at all", () => {
  const r = extractDimensionsFromText("SHEET 1 OF 1\nDRAWN\nQA");
  assert.equal(r.success, true);
  assert.equal(r.extraction.confidence, 0.10);
  assert.equal(r.extraction.dimensions.length, 0);
});

// ── extractDimensionsFromText: edge cases / R12 fail-loud ──────────

test("extract: empty/null/whitespace → error", () => {
  for (const c of ["", "   \n  ", null, undefined]) {
    const r = extractDimensionsFromText(c);
    assert.equal(r.success, false);
    assert.ok(typeof r.error === "string" && r.error.length > 0);
  }
});

test("extract: NaN nominals are not emitted", () => {
  const sample = `abc
n
- .10
.10
+
mm`;
  const r = extractDimensionsFromText(sample);
  assert.equal(r.success, true);
  // 'abc' is not a number → no diameter recorded for it
  for (const d of r.extraction.dimensions) {
    assert.ok(Number.isFinite(d.nominal), "NaN nominal slipped through: " + JSON.stringify(d));
  }
});

test("extract: alternate diameter glyph 'Ø' (Unicode) accepted", () => {
  const sample = `5.00
Ø
- .10
.10
+
mm`;
  const r = extractDimensionsFromText(sample);
  assert.equal(r.success, true);
  const d = r.extraction.dimensions.find((x) => x.nominal === 5.00);
  assert.ok(d);
  assert.ok(d.tolerance);
});

test("extract: 'R<n>mm' radius variants", () => {
  const r1 = extractDimensionsFromText("R2.50mm");
  assert.equal(r1.success, true);
  const r2 = extractDimensionsFromText("R0.5mm");
  assert.equal(r2.success, true);
});

test("extract: stuck-mm form '4.00mm' captured as linear", () => {
  const r = extractDimensionsFromText("70.00mm\n55.00mm\n4.00mm");
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 3);
  for (const d of r.extraction.dimensions) {
    assert.equal(d.meta.type, "linear");
  }
});

test("extract: relief pattern requires BOTH 'Air Flat' AND 'N x angle°' lines", () => {
  // Only Air Flat without pattern → no relief dim
  const r1 = extractDimensionsFromText("Air Flat .05mm deep");
  assert.equal(r1.success, true);
  assert.equal(r1.extraction.dimensions.filter((d) => d.kind === "cross_drilled_relief_holes").length, 0);
  // Only pattern without Air Flat → no relief dim (just plain angle)
  const r2 = extractDimensionsFromText("3 x 120°");
  assert.equal(r2.success, true);
  assert.equal(r2.extraction.dimensions.filter((d) => d.kind === "cross_drilled_relief_holes").length, 0);
});

test("extract: relief pattern count must be in [2,12] range", () => {
  // 1 hole = not a pattern
  const r1 = extractDimensionsFromText("Air Flat .05mm deep\n1 x 360°");
  assert.equal(r1.extraction.dimensions.filter((d) => d.kind === "cross_drilled_relief_holes").length, 0);
  // 20 holes = bolt circle, not relief
  const r2 = extractDimensionsFromText("Air Flat .05mm deep\n20 x 18°");
  assert.equal(r2.extraction.dimensions.filter((d) => d.kind === "cross_drilled_relief_holes").length, 0);
  // 3 holes = canonical relief
  const r3 = extractDimensionsFromText("Air Flat .05mm deep\n3 x 120°");
  assert.equal(r3.extraction.dimensions.filter((d) => d.kind === "cross_drilled_relief_holes").length, 1);
});

test("extract: adversarial — extremely long input does not hang", () => {
  // 50K lines of irrelevant header noise
  const noise = Array.from({ length: 50000 }, (_, i) => `noise line ${i}`).join("\n");
  const start = Date.now();
  const r = extractDimensionsFromText(noise);
  const ms = Date.now() - start;
  assert.equal(r.success, true);
  assert.ok(ms < 2000, "adversarial input took " + ms + "ms (>2s)");
});

test("extract: source field set to 'pdf-embedded-text'", () => {
  const r = extractDimensionsFromText("Material: Steel\n5.00mm");
  assert.equal(r.extraction.source, "pdf-embedded-text");
});

test("extract: every dimension's nominal is finite", () => {
  const sample = `5.00
n
- .10
.10
+
mm
4.00mm
.30 X 45.0° CHAMFER
R1.00mm
20.0°`;
  const r = extractDimensionsFromText(sample);
  for (const d of r.extraction.dimensions) {
    assert.ok(Number.isFinite(d.nominal), JSON.stringify(d));
  }
});

// ── shape contract — interop with downstream consumers ────────────

test("extract: result shape matches BlueprintExtraction contract", () => {
  const r = extractDimensionsFromText("Material: Steel\n5.00mm");
  assert.equal(r.success, true);
  assert.ok(typeof r.extraction.confidence === "number");
  assert.ok(Array.isArray(r.extraction.dimensions));
  assert.ok(r.extraction.confidence >= 0 && r.extraction.confidence <= 1);
  for (const d of r.extraction.dimensions) {
    assert.ok(typeof d.kind === "string");
    assert.ok(Number.isFinite(d.nominal));
    if (d.tolerance) {
      assert.ok(Number.isFinite(d.tolerance.upper));
      assert.ok(Number.isFinite(d.tolerance.lower));
    }
  }
});

test("toLines: strips per-line whitespace and CRLF", () => {
  const r = toLines("foo\r\nbar  baz\r\n   \nquux\n");
  assert.deepEqual(r, ["foo", "bar baz", "", "quux", ""]);
});
