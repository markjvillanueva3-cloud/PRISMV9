/**
 * Tests for CADGeometryComparisonEngine -- the core CAD STEP comparison engine (consumed by
 * cad_geometry_compare + the regen-fidelity runner). Previously ZERO tests despite wide use.
 *
 * Reference-value asserts over hermetic temp-STEP fixtures (R9). Covers the public API:
 * extractMetrics (point-cloud bbox + bbox-proxy volume + unit normalization), compare
 * (overallPassed + per-call thresholds that never mutate the singleton), detectFormat, and a
 * REGRESSION GUARD for the documented curved-geometry limitation (point-cloud bbox under-measures
 * a CIRCLE's radial extent) -- the invariant the regen-fidelity runner's `bboxMeasurable` gate relies on.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cadGeometryComparisonEngine } from "../engines/CADGeometryComparisonEngine.js";

const tmpFiles: string[] = [];
function writeStep(points: Array<[number, number, number]>, opts: { inch?: boolean; manifold?: boolean } = {}): string {
  const ptLines = points.map((p, i) => `#${i + 1}=CARTESIAN_POINT('',(${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}));`).join("\n");
  const unit = opts.inch
    ? "#900=( CONVERSION_BASED_UNIT('INCH',#901) LENGTH_UNIT() ); #902=LENGTH_MEASURE(0.0254);"
    : "#900=( SI_UNIT(.MILLI.,.METRE.) LENGTH_UNIT() );";
  const manifold = opts.manifold === false ? "" : "#800=MANIFOLD_SOLID_BREP('',#801);\n#810=CLOSED_SHELL('',(#811));";
  const body = `ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n${unit}\n${ptLines}\n${manifold}\nENDSEC;\nEND-ISO-10303-21;`;
  const p = path.join(os.tmpdir(), `cgc-test-${process.pid}-${tmpFiles.length}-${points.length}.step`);
  fs.writeFileSync(p, body, "utf8");
  tmpFiles.push(p);
  return p;
}
const CUBE_CORNERS = (s: number): Array<[number, number, number]> => [
  [0, 0, 0], [s, 0, 0], [0, s, 0], [s, s, 0], [0, 0, s], [s, 0, s], [0, s, s], [s, s, s],
];

afterEach(() => {
  while (tmpFiles.length) {
    try { fs.rmSync(tmpFiles.pop() as string, { force: true }); } catch { /* ignore */ }
  }
});

describe("CADGeometryComparisonEngine.detectFormat", () => {
  it("maps extensions to formats (engine CADFormat codes are uppercase)", () => {
    expect(cadGeometryComparisonEngine.detectFormat("a.step")).toBe("STEP");
    expect(cadGeometryComparisonEngine.detectFormat("a.STP")).toBe("STEP");
    expect(cadGeometryComparisonEngine.detectFormat("a.stl")).toBe("STL");
  });
});

describe("CADGeometryComparisonEngine.extractMetrics", () => {
  it("a 10mm cube STEP -> bbox 10x10x10, bbox-proxy volume 1000", () => {
    const m = cadGeometryComparisonEngine.extractMetrics(writeStep(CUBE_CORNERS(10)));
    expect(m.boundingBox.sizeX).toBeCloseTo(10, 3);
    expect(m.boundingBox.sizeY).toBeCloseTo(10, 3);
    expect(m.boundingBox.sizeZ).toBeCloseTo(10, 3);
    expect(m.volumeMethod).toBe("bbox-proxy");
    expect(m.volume).toBeCloseTo(1000, 1);
  });

  it("inch unit is normalized to mm (a 1-inch cube -> ~25.4mm bbox)", () => {
    const m = cadGeometryComparisonEngine.extractMetrics(writeStep(CUBE_CORNERS(1), { inch: true }));
    // scale x25.4 must be applied; allow tolerance for the detector's exact factor.
    expect(m.boundingBox.sizeX).toBeGreaterThan(20);
    expect(m.boundingBox.sizeX).toBeCloseTo(25.4, 1);
  });

  it("no CARTESIAN_POINTs -> empty bbox (0 sizes), no throw", () => {
    const m = cadGeometryComparisonEngine.extractMetrics(writeStep([], { manifold: false }));
    expect(m.boundingBox.sizeX).toBe(0);
    expect(m.boundingBox.sizeY).toBe(0);
    expect(m.boundingBox.sizeZ).toBe(0);
  });

  it("REGRESSION GUARD: point-cloud bbox UNDER-measures curved (axis-only) geometry", () => {
    // A cylinder's circular extent is a CIRCLE entity, not CARTESIAN_POINTs. With only axis points,
    // the bbox misses the diameter -> sizeX/sizeY ~0. This is the documented limitation the
    // regen-fidelity runner's `bboxMeasurable` gate depends on; if someone makes extractMetrics
    // CIRCLE-radius-aware, this test should be UPDATED (not deleted) + the runner's gate revisited.
    const m = cadGeometryComparisonEngine.extractMetrics(writeStep([[0, 0, 0], [0, 0, 50]]));
    expect(m.boundingBox.sizeZ).toBeCloseTo(50, 3); // axial extent measured
    expect(m.boundingBox.sizeX).toBeCloseTo(0, 6); // radial extent MISSED (the limitation)
    expect(m.boundingBox.sizeY).toBeCloseTo(0, 6);
  });
});

describe("CADGeometryComparisonEngine.compare", () => {
  it("a STEP compared to ITSELF -> overallPassed, zero bbox delta (determinism)", () => {
    const f = writeStep(CUBE_CORNERS(10));
    const r = cadGeometryComparisonEngine.compare(f, f);
    expect(r.overallPassed).toBe(true);
    const bbox = r.metrics.find((mm) => mm.metric === "Bounding Box");
    expect(bbox?.deltaPercent).toBeCloseTo(0, 6);
    expect(bbox?.passed).toBe(true);
  });

  it("two cubes of DIFFERENT size -> bbox metric reflects the delta and fails the gate", () => {
    const a = writeStep(CUBE_CORNERS(10));
    const b = writeStep(CUBE_CORNERS(20)); // 100% larger -> way over the 2% bbox threshold
    const r = cadGeometryComparisonEngine.compare(a, b);
    const bbox = r.metrics.find((mm) => mm.metric === "Bounding Box");
    expect(bbox?.deltaPercent).toBeGreaterThan(2);
    expect(bbox?.passed).toBe(false);
    expect(r.overallPassed).toBe(false);
  });

  it("per-call thresholds do NOT mutate the global singleton", () => {
    const before = cadGeometryComparisonEngine.getThresholds().bboxDeltaPercent;
    const f = writeStep(CUBE_CORNERS(10));
    cadGeometryComparisonEngine.compare(f, f, { bboxDeltaPercent: 99 });
    expect(cadGeometryComparisonEngine.getThresholds().bboxDeltaPercent).toBe(before); // unchanged
  });

  it("a loose per-call bbox threshold lets a moderately different part pass (threshold is honored)", () => {
    const a = writeStep(CUBE_CORNERS(10));
    const b = writeStep(CUBE_CORNERS(10.1)); // 1% larger
    const strict = cadGeometryComparisonEngine.compare(a, b, { bboxDeltaPercent: 0.1 });
    const loose = cadGeometryComparisonEngine.compare(a, b, { bboxDeltaPercent: 5 });
    const bboxStrict = strict.metrics.find((mm) => mm.metric === "Bounding Box");
    const bboxLoose = loose.metrics.find((mm) => mm.metric === "Bounding Box");
    expect(bboxStrict?.passed).toBe(false);
    expect(bboxLoose?.passed).toBe(true);
  });
});

describe("CADGeometryComparisonEngine.setThresholds/getThresholds", () => {
  it("round-trips a threshold change then restores it (no test leaks global state)", () => {
    const orig = cadGeometryComparisonEngine.getThresholds();
    cadGeometryComparisonEngine.setThresholds({ bboxDeltaPercent: 7.5 });
    expect(cadGeometryComparisonEngine.getThresholds().bboxDeltaPercent).toBe(7.5);
    cadGeometryComparisonEngine.setThresholds({ bboxDeltaPercent: orig.bboxDeltaPercent }); // restore
    expect(cadGeometryComparisonEngine.getThresholds().bboxDeltaPercent).toBe(orig.bboxDeltaPercent);
  });
});
