// scripts/lib/step-dimension-extract.test.mjs
// Tests for U-CAD-DIM-RADII: extract unit-normalized radii from real STEP syntax.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseStepUnitScale, extractRadiiMm, radiusStats, dimensionTrainingPair, extractBboxMm, bboxStats, bboxTrainingPair, classifyStepGeometry, harvestCorpusRow, aggregateHarvest } from "./step-dimension-extract.mjs";

const pt = (x, y, z) => `#1 = CARTESIAN_POINT ( 'NONE', ( ${x}, ${y}, ${z} ) )`;

// Real JM-Die STEP entity syntax (inch file).
const INCH_HEADER = "CONVERSION_BASED_UNIT ( 'INCH', #969 ) LENGTH_UNIT ( ) NAMED_UNIT ( #449 ) )";
const MM_HEADER = "( LENGTH_UNIT ( ) NAMED_UNIT ( #290 ) SI_UNIT ( .MILLI., .METRE. ) )";
const ENTITIES = `
#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, 0.10000000000000000 )
#101 = CIRCLE ( 'NONE', #928, 0.50000000000000000 )
#138 = CYLINDRICAL_SURFACE ( 'NONE', #25, 0.25000000000000000 )
`;

describe("parseStepUnitScale", () => {
  it("resolves inch / mm / metre / unknown", () => {
    assert.equal(parseStepUnitScale(INCH_HEADER).scaleToMm, 25.4);
    assert.equal(parseStepUnitScale(MM_HEADER).scaleToMm, 1);
    assert.equal(parseStepUnitScale("SI_UNIT ( .METRE. )").scaleToMm, 1000);
    assert.equal(parseStepUnitScale("no unit decl").scaleToMm, null);
  });
  it("adversarial: non-string -> unknown (no throw)", () => {
    assert.doesNotThrow(() => assert.equal(parseStepUnitScale(null).unit, "unknown"));
  });
});

describe("extractRadiiMm", () => {
  it("HAPPY (inch): 3rd-arg radii x 25.4 -> mm", () => {
    const r = extractRadiiMm(INCH_HEADER + ENTITIES);
    assert.equal(r.unit, "inch");
    // 0.1in=2.54, 0.5in=12.7, 0.25in=6.35
    assert.deepEqual(r.radiiMm.map((x) => Math.round(x * 100) / 100), [2.54, 12.7, 6.35]);
  });
  it("mm units -> radii unchanged (x1)", () => {
    const r = extractRadiiMm(MM_HEADER + ENTITIES);
    assert.equal(r.unit, "mm");
    assert.deepEqual(r.radiiMm, [0.1, 0.5, 0.25]);
  });
  it("UNKNOWN unit -> radiiMm:[] (caller skips; never fabricates dims in an unknown unit, R12)", () => {
    const r = extractRadiiMm("no unit decl" + ENTITIES);
    assert.equal(r.unit, "unknown");
    assert.deepEqual(r.radiiMm, []);
  });
  it("drops degenerate radii (0, negative) and ignores non-radius entities", () => {
    const txt = INCH_HEADER + "\n#1 = CIRCLE ( 'NONE', #2, 0.0 )\n#3 = PLANE ( 'NONE', #4 )\n#5 = CIRCLE ( 'NONE', #6, 0.1 )";
    const r = extractRadiiMm(txt);
    assert.equal(r.radiiMm.length, 1); // only the 0.1 survives
  });
  it("adversarial: empty / non-string -> []", () => {
    assert.deepEqual(extractRadiiMm("").radiiMm, []);
    assert.deepEqual(extractRadiiMm(null).radiiMm, []);
  });
});

describe("radiusStats", () => {
  it("computes count + percentiles over a known array", () => {
    const s = radiusStats([1, 2, 3, 4]); // median 2.5, p25 1.75, p75 3.25
    assert.equal(s.count, 4);
    assert.equal(s.minMm, 1);
    assert.equal(s.maxMm, 4);
    assert.equal(s.medianMm, 2.5);
    assert.equal(s.meanMm, 2.5);
  });
  it("empty array -> null (no claim without data)", () => {
    assert.equal(radiusStats([]), null);
    assert.equal(radiusStats(null), null);
  });
});

describe("dimensionTrainingPair", () => {
  it("builds a pair with the mm distribution; null when stats null", () => {
    const s = radiusStats([2.54, 6.35, 12.7]);
    const p = dimensionTrainingPair("die", s, 75);
    assert.match(p.instruction, /classified as "die".*radii .*in mm/);
    assert.match(p.output, /spanning ~2\.54-12\.7 mm/);
    assert.match(p.output, /across 75 STEP files/);
    assert.equal(dimensionTrainingPair("die", null, 75), null);
  });
});

describe("extractBboxMm", () => {
  it("HAPPY (inch): extents x 25.4, sorted L>=W>=H", () => {
    const txt = INCH_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(1, 2, 3); // extents 1,2,3 in -> 25.4,50.8,76.2 mm
    const b = extractBboxMm(txt);
    assert.deepEqual(b.dims, [76.2, 50.8, 25.4]); // descending
    assert.equal(b.maxExtentMm, 76.2);
    assert.equal(b.pointCount, 2);
  });
  it("handles negative coords (geometry around origin)", () => {
    const txt = MM_HEADER + "\n" + pt(-5, 0, 0) + "\n" + pt(5, 0, 0); // x extent 10 mm
    assert.equal(extractBboxMm(txt).maxExtentMm, 10);
  });
  it("UNKNOWN unit -> null; <2 points -> null", () => {
    assert.equal(extractBboxMm("no unit\n" + pt(0, 0, 0) + "\n" + pt(1, 1, 1)), null);
    assert.equal(extractBboxMm(INCH_HEADER + "\n" + pt(0, 0, 0)), null); // 1 point
  });
});

describe("bboxStats + bboxTrainingPair", () => {
  it("medians across per-file bboxes; pair format", () => {
    const s = bboxStats([{ dims: [40, 20, 10], maxExtentMm: 40 }, { dims: [60, 30, 20], maxExtentMm: 60 }]);
    assert.equal(s.files, 2);
    assert.equal(s.medianL, 50); // median(40,60)
    const p = bboxTrainingPair("die", s);
    assert.match(p.instruction, /overall part envelope/);
    assert.match(p.output, /~50 x 25 x 15 mm/);
    assert.equal(bboxTrainingPair("die", null), null);
  });
  it("empty -> null", () => assert.equal(bboxStats([]), null));
  it("degenerate bboxes (smallest dim ~0, planar capture) are excluded; all-degenerate -> null", () => {
    // one good (min dim 10) + one degenerate (min dim 0) -> only the good one counts
    const s = bboxStats([{ dims: [40, 20, 10], maxExtentMm: 40 }, { dims: [63, 50, 0], maxExtentMm: 63 }]);
    assert.equal(s.files, 1);
    assert.equal(s.medianL, 40);
    // all-degenerate -> null (no misleading "x by y by 0" envelope)
    assert.equal(bboxStats([{ dims: [63, 50, 0], maxExtentMm: 63 }]), null);
  });
});

// U-DELTA-STEP-TRAILING-DOT (slot:delta 2026-06-28): STEP/EXPRESS reals are routinely written with a
// trailing dot and NO fractional digits (`20.`, `0.`, `-3.`). The number sub-pattern was `\.[0-9]+`
// (digits REQUIRED after the dot), so those literals were silently dropped: extractBboxMm matched 0
// points on a standard STEP file -> returned null on a valid part; extractRadiiMm missed integer-valued
// radii (`5.`). Fixed to `\.[0-9]*` (zero-or-more). These pin the fix (each FAILS pre-fix).
describe("trailing-dot STEP reals (U-DELTA-STEP-TRAILING-DOT regression)", () => {
  it("extractRadiiMm catches an integer-valued radius written `5.` (silently dropped pre-fix)", () => {
    const txt = MM_HEADER + "\n#1 = CIRCLE ( 'NONE', #2, 5. )\n#3 = CYLINDRICAL_SURFACE ( 'NONE', #4, 12.5 )";
    assert.deepEqual(extractRadiiMm(txt).radiiMm.slice().sort((a, b) => a - b), [5, 12.5], "both `5.` and `12.5`");
  });
  it("extractBboxMm returns a real envelope from trailing-dot 3D points (null pre-fix: 0 points)", () => {
    const txt = MM_HEADER + "\n" + [pt("0.", "0.", "0."), pt("30.", "20.", "10."), pt("0.", "0.", "10.")].join("\n");
    const b = extractBboxMm(txt);
    assert.ok(b, "must not be null (the bug returned null on this valid part)");
    assert.deepEqual(b.dims, [30, 20, 10]);
    assert.equal(b.pointCount, 3);
  });
  it("exact pre-fix repro: compact `(0.,0.,0.)` / `(-3.,40.,20.)` points now match (0 matched pre-fix)", () => {
    const txt = MM_HEADER + "\n#1 = CARTESIAN_POINT ( 'NONE', (0.,0.,0.) )\n#2 = CARTESIAN_POINT ( 'NONE', (-3.,40.,20.) )";
    const b = extractBboxMm(txt);
    assert.ok(b && b.pointCount === 2, `expected 2 points, got ${b && b.pointCount}`);
    assert.deepEqual(b.dims, [40, 20, 3]); // X:[-3,0]=3, Y:[0,40]=40, Z:[0,20]=20 -> sorted desc
  });
  it("regression guard: scientific-notation + normal decimals still parse (no over/under-match)", () => {
    const txt = MM_HEADER + "\n" + [pt("12.5", "-3.061616997868E-15", "20."), pt("0.", "0.", "-20.")].join("\n");
    const b = extractBboxMm(txt);
    assert.ok(b && b.pointCount === 2);
    assert.deepEqual(b.dims, [40, 12.5, 0]); // Z:[-20,20]=40, X:[0,12.5]=12.5, Y~0 (the documented point-bbox limit for curves)
  });
});

// U-DELTA-CADGEN-GEOMCLASS (slot:delta 2026-06-29): classify a STEP by surface entities so the corpus
// harvest can TRIAGE which point-cloud envelopes are trustworthy. The live CORPUS-KERNEL sweep proved
// only plane-only prismatic parts agree with the Fusion kernel (bracket 0% err); curved/freeform parts
// disagree 47-100%. pointBboxReliable must be true ONLY for plane-only solids.
const PLANE_FACE = "#10 = PLANE ( 'NONE', #11 )";
const CYL_FACE = "#20 = CYLINDRICAL_SURFACE ( 'NONE', #21, 5.0 )";
const BSPLINE_FACE = "#30 = B_SPLINE_SURFACE_WITH_KNOTS ( 'NONE', 3, 3, ( ( #40, #41 ) ), .UNSPECIFIED., .F., .F., .F. )";
// real STEP unit-context header carries PLANE_ANGLE_UNIT -- must NOT be miscounted as a PLANE face.
const ANGLE_UNIT_HEADER = "( NAMED_UNIT ( * ) PLANE_ANGLE_UNIT ( ) SI_UNIT ( $, .RADIAN. ) )";

describe("classifyStepGeometry (U-DELTA-CADGEN-GEOMCLASS)", () => {
  it("plane-only -> prismatic + pointBboxReliable (the ONE class the point envelope is trusted for)", () => {
    const g = classifyStepGeometry(PLANE_FACE + "\n" + PLANE_FACE + "\n" + PLANE_FACE);
    assert.equal(g.geometryClass, "prismatic");
    assert.equal(g.pointBboxReliable, true);
    assert.equal(g.surfaceKinds.plane, 3);
    assert.equal(g.curvedSurfaceCount, 0);
  });
  it("any cylindrical face -> curved + NOT reliable (point envelope under-estimates curved extent)", () => {
    const g = classifyStepGeometry(PLANE_FACE + "\n" + CYL_FACE);
    assert.equal(g.geometryClass, "curved");
    assert.equal(g.pointBboxReliable, false);
    assert.equal(g.curvedSurfaceCount, 1);
    assert.equal(g.hasFreeform, false);
  });
  it("B-spline surface -> freeform (blisk/impeller/turbine class) + NOT reliable", () => {
    const g = classifyStepGeometry(PLANE_FACE + "\n" + BSPLINE_FACE);
    assert.equal(g.geometryClass, "freeform");
    assert.equal(g.hasFreeform, true);
    assert.equal(g.pointBboxReliable, false);
    assert.equal(g.surfaceKinds.bspline, 1);
  });
  it("ADVERSARIAL: PLANE_ANGLE_UNIT header is NOT counted as a PLANE face (regex boundary)", () => {
    const g = classifyStepGeometry(ANGLE_UNIT_HEADER + "\n" + CYL_FACE);
    assert.equal(g.surfaceKinds.plane, 0, "PLANE_ANGLE_UNIT must not match \\bPLANE\\s*\\(");
    assert.equal(g.geometryClass, "curved"); // only the real cylindrical face counts
  });
  it("no surface faces parsed -> unknown + NOT reliable (no claim without geometry)", () => {
    const g = classifyStepGeometry(ANGLE_UNIT_HEADER);
    assert.equal(g.geometryClass, "unknown");
    assert.equal(g.totalSurfaces, 0);
    assert.equal(g.pointBboxReliable, false);
  });
  it("adversarial: empty / non-string -> unknown (no throw)", () => {
    assert.doesNotThrow(() => classifyStepGeometry(null));
    assert.equal(classifyStepGeometry(null).geometryClass, "unknown");
  });
});

describe("harvestCorpusRow", () => {
  const planePart = INCH_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(1, 2, 3) + "\n" + PLANE_FACE; // 25.4x50.8x76.2 mm
  const cylPart = MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(50, 50, 30) + "\n" + CYL_FACE;
  it("HAPPY: inch plane-only part -> processed, prismatic, reliable, envelope present", () => {
    const r = harvestCorpusRow({ hash: "h1", label: "block.stp", partClass: "die", text: planePart });
    assert.equal(r.skipped, null);
    assert.equal(r.geometryClass, "prismatic");
    assert.equal(r.pointBboxReliable, true);
    assert.equal(r.pointDegenerate, false);
    assert.deepEqual(r.pointEnvelopeMm, [76.2, 50.8, 25.4]);
    assert.equal(r.partClass, "die");
  });
  it("curved part -> processed but NOT reliable (queued for kernel-GT downstream)", () => {
    const r = harvestCorpusRow({ hash: "h2", label: "shaft.stp", partClass: "shaft", text: cylPart });
    assert.equal(r.skipped, null);
    assert.equal(r.geometryClass, "curved");
    assert.equal(r.pointBboxReliable, false);
  });
  it("FAILURE: unknown unit -> skipped, never fabricates dims (R12)", () => {
    const r = harvestCorpusRow({ hash: "h3", label: "x.stp", partClass: "general", text: "no unit\n" + PLANE_FACE });
    assert.equal(r.skipped, "unknown-unit");
    assert.equal(r.pointEnvelopeMm, null);
  });
  it("adversarial: missing fields -> safe defaults, no throw", () => {
    assert.doesNotThrow(() => harvestCorpusRow({}));
    assert.equal(harvestCorpusRow({}).label, "part");
  });
});

describe("aggregateHarvest (triage: reliable dim-prior NOW + scoped kernel worklist)", () => {
  const planePart = (c, h) => harvestCorpusRow({ hash: h, label: `${c}-${h}.stp`, partClass: c, text: INCH_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(1, 2, 3) + "\n" + PLANE_FACE });
  const cylRow = harvestCorpusRow({ hash: "c1", label: "imp.stp", partClass: "impeller", text: MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(50, 50, 30) + "\n" + BSPLINE_FACE });
  const flatRow = harvestCorpusRow({ hash: "f1", label: "flat.stp", partClass: "plate", text: INCH_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(1, 2, 0) + "\n" + PLANE_FACE }); // z=0 -> degenerate
  const skipRow = harvestCorpusRow({ hash: "s1", label: "u.stp", partClass: "general", text: "no unit\n" + PLANE_FACE });

  it("splits reliable (prismatic) -> dim-prior pairs; curved/degenerate -> kernel worklist; skipped excluded", () => {
    const rows = [planePart("die", "d1"), planePart("die", "d2"), cylRow, flatRow, skipRow];
    const agg = aggregateHarvest(rows);
    assert.equal(agg.totalRows, 5);
    assert.equal(agg.skipped, 1);          // skipRow
    assert.equal(agg.processed, 4);
    assert.equal(agg.reliable, 2);         // two die prismatic parts
    assert.equal(agg.kernelNeeded, 2);     // cylRow (freeform) + flatRow (degenerate prismatic)
    // reliable dim-prior pair only for the die class, sourced corpus-prismatic
    assert.equal(agg.reliablePairs.length, 1);
    assert.equal(agg.reliablePairs[0].partClass, "die");
    assert.equal(agg.reliablePairs[0].files, 2);
    assert.equal(agg.reliablePairs[0].source, "corpus-prismatic");
    assert.match(agg.reliablePairs[0].output, /overall envelope/);
  });
  it("kernel worklist tags the reason: freeform=curved:<class>, degenerate-prismatic=degenerate-point-capture", () => {
    const rows = [cylRow, flatRow];
    const agg = aggregateHarvest(rows);
    const byLabel = Object.fromEntries(agg.kernelNeededWorklist.map((w) => [w.label, w]));
    assert.equal(byLabel["imp.stp"].reason, "curved:freeform");
    assert.equal(byLabel["flat.stp"].reason, "degenerate-point-capture");
  });
  it("geometry-class histogram counts every processed row", () => {
    const agg = aggregateHarvest([planePart("die", "d1"), cylRow, flatRow]);
    assert.equal(agg.geometryClassHist.prismatic, 2); // die + flat (flat is still prismatic-classified, just degenerate capture)
    assert.equal(agg.geometryClassHist.freeform, 1);
  });
  it("adversarial: empty / non-array -> zeroed aggregate, no throw", () => {
    assert.doesNotThrow(() => aggregateHarvest(null));
    const agg = aggregateHarvest([]);
    assert.equal(agg.reliable, 0);
    assert.equal(agg.reliablePairs.length, 0);
  });
});

// U-DELTA-CADGEN-RADII-PRIOR (slot:delta 2026-06-29): radii are RELIABLE for EVERY part (explicit
// CIRCLE/CYLINDRICAL_SURFACE radius literals, units-resolved -- NOT a point-cloud envelope), so the
// harvest aggregates a per-class radii prior across ALL parts, not just the prismatic subset.
const RADII_ENT = "\n#65 = CYLINDRICAL_SURFACE ( 'NONE', #764, 0.5 )\n#66 = CIRCLE ( 'NONE', #99, 0.25 )"; // mm -> 0.5, 0.25
describe("radii prior (U-DELTA-CADGEN-RADII-PRIOR)", () => {
  it("harvestCorpusRow captures the radiiMm values (units-resolved)", () => {
    const txt = MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(40, 20, 10) + RADII_ENT;
    const r = harvestCorpusRow({ hash: "h", label: "x.stp", partClass: "die", text: txt });
    assert.deepEqual(r.radiiMm.slice().sort((a, b) => a - b), [0.25, 0.5]);
    assert.equal(r.radiiCount, 2);
  });
  it("harvestCorpusRow caps radiiMm at 64/part (ledger-bloat bound)", () => {
    const many = Array.from({ length: 80 }, (_, i) => `#${i} = CIRCLE ( 'NONE', #9, ${1 + i * 0.01} )`).join("\n");
    const r = harvestCorpusRow({ hash: "h", label: "x.stp", partClass: "die", text: MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(40, 20, 10) + "\n" + many });
    assert.equal(r.radiiMm.length, 64, "capped");
    assert.equal(r.radiiCount, 80, "but the true count is preserved");
  });
  it("aggregateHarvest builds a per-class radii prior from ALL parts (curved + prismatic)", () => {
    const mk = (h) => harvestCorpusRow({ hash: h, label: `${h}.stp`, partClass: "die", text: MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(40, 20, 10) + RADII_ENT });
    const agg = aggregateHarvest([mk("a"), mk("b")]);
    const die = agg.radiiPairs.find((p) => p.partClass === "die");
    assert.ok(die, "die radii prior present");
    assert.equal(die.source, "corpus-radii");
    assert.equal(die.files, 2);
    assert.equal(die.count, 4, "2 radii x 2 parts");
    assert.match(die.output, /radii/i);
  });
  it("harvestCorpusRow DROPS non-machinable radii: km-scale arc artifacts + sub-floor (R12 data-quality)", () => {
    const txt = MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(40, 20, 10) +
      "\n#1 = CIRCLE ( 'NONE', #9, 5.0 )" +         // real 5 mm feature -> kept
      "\n#2 = CIRCLE ( 'NONE', #9, 1096162.73 )" +  // near-straight edge as near-infinite arc -> dropped
      "\n#3 = CIRCLE ( 'NONE', #9, 0.001 )";        // degenerate sub-floor circle -> dropped
    const r = harvestCorpusRow({ hash: "h", label: "x.stp", partClass: "die", text: txt });
    assert.deepEqual(r.radiiMm, [5], "only the real 5 mm feature survives");
    assert.equal(r.radiiCount, 1);
  });
  it("aggregateHarvest: parts with no radii contribute no radii prior (no fabricated stat)", () => {
    const noRadii = harvestCorpusRow({ hash: "n", label: "n.stp", partClass: "plate", text: MM_HEADER + "\n" + pt(0, 0, 0) + "\n" + pt(10, 10, 10) + "\n#10 = PLANE ( 'NONE', #11 )" });
    const agg = aggregateHarvest([noRadii]);
    assert.equal(agg.radiiPairs.length, 0);
  });
});
