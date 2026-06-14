// scripts/lib/step-dimension-extract.test.mjs
// Tests for U-CAD-DIM-RADII: extract unit-normalized radii from real STEP syntax.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseStepUnitScale, extractRadiiMm, radiusStats, dimensionTrainingPair, extractBboxMm, bboxStats, bboxTrainingPair } from "./step-dimension-extract.mjs";

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
