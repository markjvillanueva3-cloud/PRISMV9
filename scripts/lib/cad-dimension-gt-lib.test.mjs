// scripts/lib/cad-dimension-gt-lib.test.mjs
// Tests for U-XRAY-CAD-GT-SCORE: derive callout-class dimensional GT from a neutral STEP model,
// score OCR dims against it, triangulate vs program GT, and adapt to the reconcile-engine candidate
// shape. Real STEP entity syntax (mirrors step-dimension-extract.test.mjs). Reference values computed
// from the documented contract; revert-the-fix proves each assertion is load-bearing (R9).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractCadGT,
  dimMatchesCadGT,
  scorePartAgainstCadGT,
  triangulateGT,
  cadGtToCandidates,
  CAD_CALLOUT_FLOOR_MM,
} from "./cad-dimension-gt-lib.mjs";

// Real JM-Die STEP entity syntax.
const INCH_HEADER = "CONVERSION_BASED_UNIT ( 'INCH', #969 ) LENGTH_UNIT ( ) NAMED_UNIT ( #449 ) )";
const MM_HEADER = "( LENGTH_UNIT ( ) NAMED_UNIT ( #290 ) SI_UNIT ( .MILLI., .METRE. ) )";
const pt = (x, y, z) => `#9 = CARTESIAN_POINT ( 'NONE', ( ${x}, ${y}, ${z} ) )`;

// Inch part: r0.5in -> dia 25.4mm, r0.25in -> dia 12.7mm, r0.01in fillet -> dia 0.508mm (below floor,
// excluded); bbox 2x1x0.5 in -> 50.8 x 25.4 x 12.7 mm.
const INCH_PART = [
  INCH_HEADER,
  "#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, 0.50000000000000000 )",
  "#101 = CIRCLE ( 'NONE', #928, 0.25000000000000000 )",
  "#138 = CIRCLE ( 'NONE', #25, 0.01000000000000000 )",
  pt(0.0, 0.0, 0.0),
  pt(2.0, 1.0, 0.5),
].join("\n");

describe("extractCadGT -- inch part, callout-class filtering", () => {
  const gt = extractCadGT(INCH_PART);
  it("resolves inch unit + scale", () => {
    assert.equal(gt.unit, "inch");
    assert.equal(gt.scaleResolved, true);
  });
  it("radii->diameters, drops sub-floor fillet, clusters to feature diameters (mm)", () => {
    // raw diameters = [25.4, 12.7, 0.508]; 0.508 < 1.0 floor -> dropped; 12.7 & 25.4 distinct clusters.
    assert.deepEqual(gt.featureDiametersMm, [12.7, 25.4]);
    assert.equal(gt.rawDiameterCount, 3);
    assert.equal(gt.calloutDiameterCount, 2);
  });
  it("envelope = bbox L,W,H descending (mm)", () => {
    assert.deepEqual(gt.envelopeMm, [50.8, 25.4, 12.7]);
  });
  it("calloutDimsMm = featureDiameters + envelope; class ok + reliable", () => {
    assert.deepEqual(gt.calloutDimsMm, [12.7, 25.4, 50.8, 25.4, 12.7]);
    assert.equal(gt.cadGtClass, "ok");
    assert.equal(gt.gtReliable, true);
  });
});

describe("extractCadGT -- mm part (no double-convert, the 25.4x trap)", () => {
  const gt = extractCadGT([MM_HEADER, "#65 = CIRCLE ( 'NONE', #1, 6.35000000 )"].join("\n"));
  it("a 6.35mm radius is a 12.7mm diameter -- NOT 12.7*25.4", () => {
    assert.equal(gt.unit, "mm");
    assert.deepEqual(gt.featureDiametersMm, [12.7]);
  });
});

describe("extractCadGT -- unknown unit -> never fabricate a dim", () => {
  const gt = extractCadGT("#65 = CIRCLE ( 'NONE', #1, 0.5 )"); // no unit decl
  it("flags unknown-unit, empty, unreliable", () => {
    assert.equal(gt.scaleResolved, false);
    assert.equal(gt.cadGtClass, "unknown-unit");
    assert.equal(gt.gtReliable, false);
    assert.deepEqual(gt.calloutDimsMm, []);
  });
});

describe("extractCadGT -- fillet-dominated -> no callout geometry, unreliable", () => {
  const gt = extractCadGT([
    INCH_HEADER,
    "#65 = CIRCLE ( 'NONE', #1, 0.01000000 )", // dia 0.508mm
    "#66 = CIRCLE ( 'NONE', #2, 0.00500000 )", // dia 0.254mm
  ].join("\n")); // no >=2 cartesian points -> no envelope
  it("all diameters below floor + no envelope -> no-callout-geometry", () => {
    assert.equal(gt.rawDiameterCount, 2);
    assert.equal(gt.calloutDiameterCount, 0);
    assert.deepEqual(gt.envelopeMm, []);
    assert.equal(gt.cadGtClass, "no-callout-geometry");
    assert.equal(gt.gtReliable, false);
  });
});

describe("extractCadGT -- degenerate (planar) bbox dropped, diameters kept", () => {
  const gt = extractCadGT([
    INCH_HEADER,
    "#65 = CIRCLE ( 'NONE', #1, 0.50000000 )", // dia 25.4mm
    pt(0.0, 0.0, 0.0),
    pt(2.0, 1.0, 0.0), // z all 0 -> smallest extent 0 < 0.05 -> bbox dropped
  ].join("\n"));
  it("planar bbox excluded but diameter survives -> still ok", () => {
    assert.deepEqual(gt.envelopeMm, []);
    assert.deepEqual(gt.featureDiametersMm, [25.4]);
    assert.equal(gt.cadGtClass, "ok");
  });
});

describe("extractCadGT -- tunable callout floor", () => {
  it("a lower floor keeps the small diameter", () => {
    const gt = extractCadGT("#65 = CIRCLE ( 'NONE', #1, 0.30000 )\n" + MM_HEADER, { calloutFloorMm: 0.5 });
    // r0.3mm -> dia 0.6mm; default floor 1.0 would drop it, floor 0.5 keeps it.
    assert.deepEqual(gt.featureDiametersMm, [0.6]);
  });
  it("default floor constant is 1.0mm", () => assert.equal(CAD_CALLOUT_FLOOR_MM, 1.0));
});

describe("dimMatchesCadGT", () => {
  it("matches within relTol, reports relErr; mm-vs-mm (no convert)", () => {
    const m = dimMatchesCadGT(12.7, [25.4, 12.71], { relTol: 0.02 });
    assert.equal(m.matched, true);
    assert.equal(m.gtMm, 12.71);
  });
  it("rejects out-of-tolerance + invalid input", () => {
    assert.equal(dimMatchesCadGT(12.7, [25.4], { relTol: 0.02 }).matched, false);
    assert.equal(dimMatchesCadGT(0, [12.7]).matched, false);
    assert.equal(dimMatchesCadGT(12.7, null).matched, false);
  });
});

describe("scorePartAgainstCadGT", () => {
  const gt = extractCadGT(INCH_PART); // distinct GT = {12.7, 25.4, 50.8}
  it("perfect recall + precision when OCR reads every GT dim", () => {
    const s = scorePartAgainstCadGT([12.7, 25.4, 50.8], gt);
    assert.equal(s.gtCount, 3);
    assert.equal(s.recall, 1);
    assert.equal(s.precision, 1);
  });
  it("partial recall + precision honestly computed", () => {
    const s = scorePartAgainstCadGT([12.7, 99.0], gt);
    assert.equal(s.gtMatched, 1);
    assert.equal(s.recall, 0.3333);
    assert.equal(s.ocrMatched, 1);
    assert.equal(s.precision, 0.5);
  });
  it("empty OCR -> zero recall, zero precision (no divide-by-zero)", () => {
    const s = scorePartAgainstCadGT([], gt);
    assert.equal(s.recall, 0);
    assert.equal(s.precision, 0);
  });
});

describe("triangulateGT -- program (intersect) cad corroboration", () => {
  it("high confidence: dims in BOTH sources are corroborated", () => {
    const t = triangulateGT({
      programGT: { calloutDimsIn: [0.5, 1.0] }, // -> 12.7, 25.4 mm
      cadGT: { calloutDimsMm: [12.7, 25.4, 50.8] },
    });
    assert.deepEqual(t.corroboratedMm, [12.7, 25.4]);
    assert.deepEqual(t.cadOnlyMm, [50.8]);
    assert.deepEqual(t.programOnlyMm, []);
    assert.equal(t.confidence, "high");
  });
  it("greedy 1:1 -- one cad dim cannot corroborate two program dims", () => {
    const t = triangulateGT({
      programGT: { calloutDimsIn: [0.5, 0.501] }, // -> 12.7, 12.725 mm (both ~ cad 12.7)
      cadGT: { calloutDimsMm: [12.7] },
    });
    assert.equal(t.nCorroborated, 1);
    assert.deepEqual(t.corroboratedMm, [12.7]);
    assert.deepEqual(t.programOnlyMm, [12.725]);
  });
  it("program-only when CAD absent", () => {
    const t = triangulateGT({ programGT: { calloutDimsIn: [0.5] }, cadGT: { calloutDimsMm: [] } });
    assert.equal(t.confidence, "program-only");
    assert.deepEqual(t.programOnlyMm, [12.7]);
  });
  it("cad-only when program absent", () => {
    const t = triangulateGT({ cadGT: { calloutDimsMm: [12.7] } });
    assert.equal(t.confidence, "cad-only");
    assert.deepEqual(t.cadOnlyMm, [12.7]);
  });
  it("uncorroborated when both sources present but disjoint (a real disagreement, != no-data)", () => {
    const t = triangulateGT({ programGT: { calloutDimsIn: [0.5] }, cadGT: { calloutDimsMm: [99.0] } });
    assert.equal(t.nCorroborated, 0);
    assert.equal(t.confidence, "uncorroborated");
    assert.deepEqual(t.programOnlyMm, [12.7]);
    assert.deepEqual(t.cadOnlyMm, [99.0]);
  });
  it("none when both empty", () => {
    assert.equal(triangulateGT({}).confidence, "none");
  });
});

describe("cadGtToCandidates -- reconcile-engine adapter", () => {
  const gt = extractCadGT(INCH_PART); // diameters [12.7,25.4], envelope [50.8,25.4,12.7]
  it("emits DimCandidate[] with cad source + canonical type tokens + default cad prior", () => {
    const cands = cadGtToCandidates(gt);
    assert.equal(cands.length, 5); // 2 diameters + 3 envelope extents
    assert.ok(cands.every((c) => c.source === "cad"));
    assert.equal(cands.filter((c) => c.type === "diameter").length, 2);
    // envelope extents are the engine's canonical "linear" token (NOT "length" -- it has no such type)
    assert.equal(cands.filter((c) => c.type === "linear").length, 3);
    assert.ok(cands.every((c) => c.confidence === 0.95));
  });
  it("envelope extents carry canonical L/W/H labels; diameters unlabeled", () => {
    const cands = cadGtToCandidates(gt);
    const linear = cands.filter((c) => c.type === "linear");
    assert.deepEqual(linear.map((c) => c.label), ["overall_length", "width", "height"]);
    assert.ok(cands.filter((c) => c.type === "diameter").every((c) => c.label === undefined));
  });
  it("non-reliable cadGT drops confidence to 0.5", () => {
    const cands = cadGtToCandidates({ calloutDimsMm: [12.7], featureDiametersMm: [12.7], envelopeMm: [], gtReliable: false });
    assert.equal(cands[0].confidence, 0.5);
  });
  it("opts.confidence override + label", () => {
    const cands = cadGtToCandidates(gt, { confidence: 0.8, label: "BORE_A" });
    assert.ok(cands.every((c) => c.confidence === 0.8 && c.label === "BORE_A"));
  });
  it("empty/invalid cadGT -> []", () => {
    assert.deepEqual(cadGtToCandidates(null), []);
    assert.deepEqual(cadGtToCandidates({}), []);
  });
});
