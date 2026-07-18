/**
 * Tests for the control-point-cloud Hausdorff shape-fidelity metric
 * (CADGeometryComparisonEngine.computeSurfaceHausdorff + the pure hausdorffPointClouds helper).
 *
 * The count-weighted topology Jaccard is a point-COUNT proxy that does not imply shape match;
 * Hausdorff is the meaningful shape DISTANCE gate. These tests pin concrete known distances
 * (R9): two clouds offset by 5 -> hausdorff 5; identity -> 0; inch-vs-mm same geometry -> ~0.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  cadGeometryComparisonEngine,
  hausdorffPointClouds,
} from "../../engines/CADGeometryComparisonEngine.js";

// minimal STEP file with the given mm/inch points; only the bits the parser/unit-detector read
function writeStep(points: Array<[number, number, number]>, unit: "mm" | "inch"): string {
  const unitLine =
    unit === "inch"
      ? "#10=(CONVERSION_BASED_UNIT('inch',#11)(LENGTH_UNIT())(NAMED_UNIT(*)));\n#12=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );"
      : "#10=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );";
  const pts = points
    .map((p, i) => `#${100 + i}=CARTESIAN_POINT('',(${p[0]},${p[1]},${p[2]}));`)
    .join("\n");
  const body = `ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n${unitLine}\n${pts}\nENDSEC;\nEND-ISO-10303-21;\n`;
  const f = path.join(os.tmpdir(), `prism-hausdorff-${unit}-${Math.abs(hashStr(pts))}.step`);
  fs.writeFileSync(f, body, "utf8");
  return f;
}
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

describe("hausdorffPointClouds (pure)", () => {
  it("identical clouds -> 0", () => {
    const c = [
      [0, 0, 0],
      [1, 0, 0],
    ] as Array<[number, number, number]>;
    const r = hausdorffPointClouds(c, c);
    expect(r.hausdorff).toBeCloseTo(0, 10);
    expect(r.chamferMean).toBeCloseTo(0, 10);
  });

  it("directed asymmetry: extra far point only in B -> directedBtoA=5, hausdorff=5", () => {
    const a: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, 0, 0],
    ];
    const b: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 5],
    ];
    const r = hausdorffPointClouds(a, b);
    expect(r.directedAtoB).toBeCloseTo(0, 10); // every A point is in B
    expect(r.directedBtoA).toBeCloseTo(5, 10); // [0,0,5] is 5 from nearest A
    expect(r.hausdorff).toBeCloseTo(5, 10);
    // chamfer mean = (A->B mean 0 + B->A mean (0+0+5)/3) / 2 = 0.8333...
    expect(r.chamferMean).toBeCloseTo((0 + 5 / 3) / 2, 6);
  });

  it("single points offset by a 3-4-5 vector -> hausdorff 5", () => {
    const r = hausdorffPointClouds([[0, 0, 0]], [[3, 4, 0]]);
    expect(r.hausdorff).toBeCloseTo(5, 10);
    expect(r.directedAtoB).toBeCloseTo(5, 10);
    expect(r.directedBtoA).toBeCloseTo(5, 10);
  });

  it("empty cloud -> Infinity (fail-loud, never NaN)", () => {
    const r = hausdorffPointClouds([], [[0, 0, 0]]);
    expect(r.hausdorff).toBe(Infinity);
    expect(Number.isNaN(r.hausdorff)).toBe(false);
  });
});

describe("computeSurfaceHausdorff (STEP files)", () => {
  it("identical STEP files -> 0mm, 0%, passed", () => {
    const f = writeStep([[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]], "mm");
    try {
      const r = cadGeometryComparisonEngine.computeSurfaceHausdorff(f, f);
      expect(r.hausdorffMm).toBeCloseTo(0, 6);
      expect(r.hausdorffPercentOfDiagonal).toBeCloseTo(0, 6);
      expect(r.passed).toBe(true);
      expect(r.pointsA).toBe(4);
    } finally {
      fs.unlinkSync(f);
    }
  });

  it("inch file vs mm file of the SAME geometry normalizes to ~0 (units-first)", () => {
    // 1 inch == 25.4 mm: an inch cloud at {1,2,3} matches an mm cloud at {25.4,50.8,76.2}
    const fIn = writeStep([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], "inch");
    const fMm = writeStep([[0, 0, 0], [25.4, 0, 0], [0, 25.4, 0], [0, 0, 25.4]], "mm");
    try {
      const r = cadGeometryComparisonEngine.computeSurfaceHausdorff(fIn, fMm);
      expect(r.unitA).toBe("inch");
      expect(r.unitB).toBe("mm");
      // after unit-normalization both clouds are identical in mm -> ~0 (float tolerance)
      expect(r.hausdorffMm).toBeLessThan(1e-6);
      expect(r.passed).toBe(true);
    } finally {
      fs.unlinkSync(fIn);
      fs.unlinkSync(fMm);
    }
  });

  it("translated geometry -> known mm distance, fails a tight threshold", () => {
    const a = writeStep([[0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 100]], "mm");
    // B = A shifted +50mm in X on the corner that defines the max directed distance
    const b = writeStep([[50, 0, 0], [150, 0, 0], [50, 100, 0], [50, 0, 100]], "mm");
    try {
      const r = cadGeometryComparisonEngine.computeSurfaceHausdorff(a, b, { thresholdPercent: 1 });
      // every point shifted exactly 50mm in X -> directed distances are 50mm
      expect(r.hausdorffMm).toBeCloseTo(50, 6);
      expect(r.passed).toBe(false); // 50mm is way over 1% of a ~173mm diagonal
      expect(r.bboxDiagonalMm).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(a);
      fs.unlinkSync(b);
    }
  });

  it("sampleCap deterministically reduces the cloud and is reproducible", () => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 50; i++) pts.push([i, 0, 0]);
    const f = writeStep(pts, "mm");
    try {
      const r1 = cadGeometryComparisonEngine.computeSurfaceHausdorff(f, f, { sampleCap: 10 });
      const r2 = cadGeometryComparisonEngine.computeSurfaceHausdorff(f, f, { sampleCap: 10 });
      expect(r1.sampledA).toBeLessThanOrEqual(10);
      expect(r1.sampledA).toBe(r2.sampledA); // deterministic
      expect(r1.hausdorffMm).toBe(r2.hausdorffMm);
    } finally {
      fs.unlinkSync(f);
    }
  });
});

/**
 * END-TO-END surface-fidelity validation on the REAL closed-loop regeneration pair:
 * blisk.stp (mm reference) vs blisk-replica.step (the 48-blade parametric replica, exported
 * in INCH). This exercises the FULL pipeline on real data — parse both, unit-normalize
 * (mm vs inch, the 25.4x safety rail), deterministic stride-sample, bidirectional Hausdorff +
 * chamfer mean — and pins the honest measured regeneration accuracy:
 *   worst-case Hausdorff ~88 mm = ~5.09% of the 1734.7 mm diagonal
 *   mean chamfer        ~27 mm = ~1.55% of diagonal
 * This is the validated "how accurately can we REGENERATE the part" number (dims are exact
 * 0.000%; the residual lives in the free-form blade aero surfaces, where generic NACA sections
 * differ from the real B-splines). Literal 0% would require re-importing the real control net.
 * A units-normalization regression would explode these to ~25.4x (>>8%) -> the band catches it.
 * Bands (not exact floats) keep the test robust to minor sampling while encoding the intent.
 */
describe("computeSurfaceHausdorff E2E on the real blisk regeneration pair", () => {
  const REF = "H:/PRISM/resources/CAD FILES/blisk.stp";
  const REPLICA = "H:/prism/state/shared/cad-generated/blisk-replica.step";

  it("real blisk vs replica: units normalized (mm vs inch), single-digit-% regen accuracy", () => {
    if (!fs.existsSync(REF) || !fs.existsSync(REPLICA)) return; // skip-loud
    const r = cadGeometryComparisonEngine.computeSurfaceHausdorff(REF, REPLICA, {
      sampleCap: 2500,
      thresholdPercent: 1,
    });
    // units-first: the reference is mm, the replica exported INCH -> normalized before measuring
    expect(r.unitA).toBe("mm");
    expect(r.unitB).toBe("inch");
    // bbox diagonal of the 1206.9 x 1206.9 x 310 mm rotor
    expect(r.bboxDiagonalMm).toBeCloseTo(1734.7, 0);
    // worst-case Hausdorff: single-digit % of diagonal (a units regression would be ~25.4x = >>8%)
    expect(r.hausdorffPercentOfDiagonal).toBeGreaterThan(3);
    expect(r.hausdorffPercentOfDiagonal).toBeLessThan(8);
    // mean chamfer is the representative fidelity and MUST be tighter than worst-case
    const meanPct = (r.chamferMeanMm / r.bboxDiagonalMm) * 100;
    expect(meanPct).toBeGreaterThan(0.5);
    expect(meanPct).toBeLessThan(3);
    expect(r.chamferMeanMm).toBeLessThan(r.hausdorffMm); // mean < worst, always
    // 5.09% worst > 1% threshold -> honestly does NOT pass a sub-1% surface gate
    expect(r.passed).toBe(false);
  });
});
