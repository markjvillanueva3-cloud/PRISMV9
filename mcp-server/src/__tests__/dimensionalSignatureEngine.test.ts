/**
 * dimensionalSignatureEngine.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT05
 *
 * Validates STEP→fingerprint extraction, SI-unit conversion, AABB geometry,
 * hole detection, and signature determinism.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  DimensionalSignatureEngine,
  dimensionalSignatureEngine,
  DimensionalSignatureSchema,
  detectLengthUnit,
  extractCartesianPoints,
  extractCircleRadii,
  countLines,
  computeBBox,
  dimensionalSignatureHash,
  type DimensionalSignature,
} from "../engines/DimensionalSignatureEngine.js";

let engine: DimensionalSignatureEngine;

beforeEach(() => {
  engine = new DimensionalSignatureEngine();
});

function cubeStepMm(): string {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('cube test'),'2;1');
FILE_NAME('cube.step','2026-01-01T00:00:00',('PRISM'),(''),'PRISM','PRISM','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 242 1 1 4 }'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('p0',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('p1',(50.0,0.0,0.0));
#3=CARTESIAN_POINT('p2',(50.0,30.0,0.0));
#4=CARTESIAN_POINT('p3',(0.0,30.0,0.0));
#5=CARTESIAN_POINT('p4',(0.0,0.0,20.0));
#6=CARTESIAN_POINT('p5',(50.0,0.0,20.0));
#7=CARTESIAN_POINT('p6',(50.0,30.0,20.0));
#8=CARTESIAN_POINT('p7',(0.0,30.0,20.0));
#9=LINE('e0',#1,#2);
#10=LINE('e1',#2,#3);
#11=LINE('e2',#3,#4);
#12=LINE('e3',#4,#1);
#100=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
ENDSEC;
END-ISO-10303-21;
`;
}

function cubeWithHolesStep(): string {
  return cubeStepMm().replace(
    "#12=LINE('e3',#4,#1);",
    `#12=LINE('e3',#4,#1);
#20=AXIS2_PLACEMENT_3D('h1',#1,#1,#1);
#21=CIRCLE('hole1',#20,6.0);
#22=CIRCLE('hole2',#20,6.0000000001);
#23=CIRCLE('hole3',#20,12.0);`,
  );
}

function emptyStep(): string {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('empty'),'2;1');
FILE_NAME('e.step','t',('PRISM'),(''),'PRISM','PRISM','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
`;
}

function cubeStepMetres(): string {
  return cubeStepMm()
    .replace("SI_UNIT(.MILLI.,.METRE.)", "SI_UNIT($,.METRE.)")
    .replace(/CARTESIAN_POINT\('p(\d)',\(([^)]+)\)\)/g, (_, idx, body) => {
      const [x, y, z] = body
        .split(",")
        .map((s: string) => Number(s.trim()) / 1000);
      return `CARTESIAN_POINT('p${idx}',(${x},${y},${z}))`;
    });
}

describe("DimensionalSignatureEngine — singleton + schema", () => {
  it("singleton matches fresh-instance schemaVersion", () => {
    expect(dimensionalSignatureEngine.schemaVersion).toBe("1.0.0");
    expect(dimensionalSignatureEngine.schemaVersion).toBe(engine.schemaVersion);
  });

  it("schema rejects malformed signature hash", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/x.step");
    const bad = { ...sig, signature: "not-hex" };
    const r = DimensionalSignatureSchema.safeParse(bad);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("signature"))).toBe(true);
    }
  });

  it("schema rejects negative envelopeM and volume", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/x.step");
    expect(
      DimensionalSignatureSchema.safeParse({ ...sig, envelopeM: -1 }).success,
    ).toBe(false);
    expect(
      DimensionalSignatureSchema.safeParse({ ...sig, volumeBboxM3: -5 }).success,
    ).toBe(false);
  });
});

describe("detectLengthUnit / extractors", () => {
  it("detects mm via SI_UNIT(.MILLI.,.METRE.)", () => {
    expect(detectLengthUnit(cubeStepMm())).toBe("mm");
  });

  it("detects m via SI_UNIT($,.METRE.)", () => {
    expect(detectLengthUnit(cubeStepMetres())).toBe("m");
  });

  it("detects inch via CONVERSION_BASED_UNIT('INCH')", () => {
    const txt = cubeStepMm().replace(
      "SI_UNIT(.MILLI.,.METRE.)",
      "CONVERSION_BASED_UNIT('INCH',#101)",
    );
    expect(detectLengthUnit(txt)).toBe("in");
  });

  it("returns 'unknown' when no unit clue is present", () => {
    expect(detectLengthUnit("DATA;\nCARTESIAN_POINT('p',(1,2,3));\n")).toBe(
      "unknown",
    );
  });

  it("extractCartesianPoints parses all 8 cube corners", () => {
    const pts = extractCartesianPoints(cubeStepMm());
    expect(pts.length).toBe(8);
    expect(pts).toContainEqual([0, 0, 0]);
    expect(pts).toContainEqual([50, 30, 20]);
  });

  it("extractCartesianPoints skips malformed entries", () => {
    const pts = extractCartesianPoints(
      "CARTESIAN_POINT('a',(1,2,3));CARTESIAN_POINT('b',(NaN,2,3));CARTESIAN_POINT('c',(4,5));",
    );
    expect(pts).toEqual([[1, 2, 3]]);
  });

  it("extractCircleRadii returns the trailing numeric radius", () => {
    const radii = extractCircleRadii(cubeWithHolesStep());
    expect(radii.length).toBe(3);
    expect(radii).toContain(6.0);
    expect(radii).toContain(12.0);
  });

  it("countLines counts LINE entities only", () => {
    expect(countLines(cubeStepMm())).toBe(4);
    expect(countLines("LINE('e0',#1,#2);LINE('e1',#2,#3);")).toBe(2);
    expect(countLines("CARTESIAN_POINT('p',(0,0,0));")).toBe(0);
  });

  it("computeBBox handles empty input as zero-extent at origin", () => {
    const b = computeBBox([]);
    expect(b.min).toEqual([0, 0, 0]);
    expect(b.max).toEqual([0, 0, 0]);
    expect(b.extent).toEqual([0, 0, 0]);
  });

  it("computeBBox finds true min/max across all axes", () => {
    const b = computeBBox([
      [-1, 5, 10],
      [3, -2, 0],
      [0, 0, 7],
    ]);
    expect(b.min).toEqual([-1, -2, 0]);
    expect(b.max).toEqual([3, 5, 10]);
    expect(b.extent).toEqual([4, 7, 10]);
  });
});

describe("extractFromStepText — geometry conversion", () => {
  it("converts 50×30×20 mm cube → SI bbox extent of 0.05/0.03/0.02 m", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    expect(sig.sourceLengthUnit).toBe("mm");
    expect(sig.bbox.extent[0]).toBeCloseTo(0.05, 12);
    expect(sig.bbox.extent[1]).toBeCloseTo(0.03, 12);
    expect(sig.bbox.extent[2]).toBeCloseTo(0.02, 12);
    expect(sig.envelopeM).toBeCloseTo(0.05, 12);
    expect(sig.volumeBboxM3).toBeCloseTo(0.05 * 0.03 * 0.02, 14);
    expect(sig.surfaceAreaM2).toBeCloseTo(0.0062, 10);
  });

  it("computes COM at cube centroid (0.025, 0.015, 0.010 m)", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    expect(sig.com[0]).toBeCloseTo(0.025, 12);
    expect(sig.com[1]).toBeCloseTo(0.015, 12);
    expect(sig.com[2]).toBeCloseTo(0.010, 12);
  });

  it("counts cartesianPoints/circles/lines correctly", () => {
    const sig = engine.extractFromStepText(cubeWithHolesStep(), "/c.step");
    expect(sig.counts.cartesianPoints).toBe(8);
    expect(sig.counts.circles).toBe(3);
    expect(sig.counts.lines).toBe(4);
  });

  it("dedups holes within 1 µm tolerance and converts to SI radii", () => {
    const sig = engine.extractFromStepText(cubeWithHolesStep(), "/c.step");
    expect(sig.holes.length).toBe(2);
    expect(sig.holes[0]?.radiusM).toBeCloseTo(0.006, 12);
    expect(sig.holes[1]?.radiusM).toBeCloseTo(0.012, 12);
  });

  it("metres-declared cube produces identical SI numbers as mm cube", () => {
    const sigMm = engine.extractFromStepText(cubeStepMm(), "/a.step");
    const sigM = engine.extractFromStepText(cubeStepMetres(), "/a.step");
    expect(sigM.sourceLengthUnit).toBe("m");
    expect(sigM.bbox.extent[0]).toBeCloseTo(sigMm.bbox.extent[0], 12);
    expect(sigM.bbox.extent[1]).toBeCloseTo(sigMm.bbox.extent[1], 12);
    expect(sigM.bbox.extent[2]).toBeCloseTo(sigMm.bbox.extent[2], 12);
    expect(sigM.signature).toBe(sigMm.signature);
  });

  it("inch-declared single-point STEP converts 1 in → 0.0254 m", () => {
    const txt = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('i'),'2;1');FILE_NAME('i','t',(''),(''),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));ENDSEC;
DATA;
#1=CARTESIAN_POINT('p',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('q',(1.0,0.0,0.0));
#100=CONVERSION_BASED_UNIT('INCH',#101);
ENDSEC;END-ISO-10303-21;
`;
    const sig = engine.extractFromStepText(txt, "/i.step");
    expect(sig.sourceLengthUnit).toBe("in");
    expect(sig.bbox.extent[0]).toBeCloseTo(0.0254, 12);
  });

  it("AABB MOI matches m·(b²+c²)/12 with unit density", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    const a = 0.05, b = 0.03, c = 0.02;
    const m = a * b * c;
    expect(sig.moiAABB.Ixx).toBeCloseTo((m * (b * b + c * c)) / 12, 16);
    expect(sig.moiAABB.Iyy).toBeCloseTo((m * (a * a + c * c)) / 12, 16);
    expect(sig.moiAABB.Izz).toBeCloseTo((m * (a * a + b * b)) / 12, 16);
  });
});

describe("Signature determinism + change detection", () => {
  it("produces bit-identical signatures for two passes of the same STEP text", () => {
    const a = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    const b = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    expect(a.signature).toBe(b.signature);
    expect(a.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different geometry → different signature", () => {
    const a = engine.extractFromStepText(cubeStepMm(), "/cube.step");
    const b = engine.extractFromStepText(cubeWithHolesStep(), "/cube.step");
    expect(a.signature).not.toBe(b.signature);
  });

  it("recomputeSignature(sig) reproduces sig.signature", () => {
    const sig = engine.extractFromStepText(cubeWithHolesStep(), "/c.step");
    expect(engine.recomputeSignature(sig)).toBe(sig.signature);
  });

  it("hole reordering does not change signature (sort+canon)", () => {
    const baseSig = engine.extractFromStepText(cubeWithHolesStep(), "/c.step");
    const reversed = { ...baseSig, holes: [...baseSig.holes].reverse() };
    expect(dimensionalSignatureHash(reversed)).toBe(baseSig.signature);
  });

  it("warnings/sourceLengthUnit changes do not perturb signature", () => {
    const a = engine.extractFromStepText(cubeStepMm(), "/c.step");
    const aClone: DimensionalSignature = {
      ...a,
      warnings: ["different"],
      sourceLengthUnit: "unknown",
    };
    expect(engine.recomputeSignature(aClone)).toBe(a.signature);
  });
});

describe("compare() and validate()", () => {
  it("compare reports signatureMatch=true for identical inputs", () => {
    const a = engine.extractFromStepText(cubeStepMm(), "/c.step");
    const b = engine.extractFromStepText(cubeStepMm(), "/c.step");
    const cmp = engine.compare(a, b);
    expect(cmp.signatureMatch).toBe(true);
    expect(cmp.envelopeDeltaM).toBe(0);
    expect(cmp.holeCountDelta).toBe(0);
  });

  it("compare reports concrete deltas between cube and cube+holes", () => {
    const a = engine.extractFromStepText(cubeStepMm(), "/c.step");
    const b = engine.extractFromStepText(cubeWithHolesStep(), "/c.step");
    const cmp = engine.compare(a, b);
    expect(cmp.signatureMatch).toBe(false);
    expect(cmp.holeCountDelta).toBe(2);
  });

  it("validate ok=true for fresh signature; ok=false for malformed", () => {
    const sig = engine.extractFromStepText(cubeStepMm(), "/c.step");
    const v = engine.validate(sig);
    expect(v.ok).toBe(true);
    expect(v.errors.length).toBe(0);

    const bad = engine.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(3);
    expect(bad.errors.some((e) => e.includes("signature"))).toBe(true);
  });
});

describe("extractFromStep — file IO + edge cases", () => {
  let tmpRoot: string;
  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt05-"));
  });

  it("reads a real .step file from disk and produces a deterministic signature", async () => {
    const p = path.join(tmpRoot, "cube.step");
    fs.writeFileSync(p, cubeStepMm(), "utf8");
    const sig = await engine.extractFromStep(p);
    expect(sig.counts.cartesianPoints).toBe(8);
    expect(sig.signature).toMatch(/^[0-9a-f]{64}$/);
    const sig2 = await engine.extractFromStep(p);
    expect(sig2.signature).toBe(sig.signature);
  });

  it("missing file produces zero-signature with read warning, no throw", async () => {
    const sig = await engine.extractFromStep(
      path.join(tmpRoot, "does-not-exist.step"),
    );
    expect(sig.counts.cartesianPoints).toBe(0);
    expect(sig.envelopeM).toBe(0);
    expect(sig.warnings.some((w) => w.startsWith("Read failed"))).toBe(true);
    expect(sig.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("empty STEP body emits zero geometry + 'No CARTESIAN_POINT' warning", () => {
    const sig = engine.extractFromStepText(emptyStep(), "/e.step");
    expect(sig.counts.cartesianPoints).toBe(0);
    expect(sig.bbox.extent).toEqual([0, 0, 0]);
    expect(sig.warnings.some((w) => w.includes("No CARTESIAN_POINT"))).toBe(true);
  });

  it("missing ISO-10303-21 magic flagged + zero result", () => {
    const sig = engine.extractFromStepText("not a step file", "/x.step");
    expect(sig.warnings.some((w) => w.includes("Missing ISO-10303-21"))).toBe(true);
    expect(sig.envelopeM).toBe(0);
  });

  it("rejects empty filePath", async () => {
    await expect(engine.extractFromStep("")).rejects.toThrow(
      /must be a non-empty string/,
    );
  });
});
