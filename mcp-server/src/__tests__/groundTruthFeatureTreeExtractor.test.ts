/**
 * groundTruthFeatureTreeExtractor.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT04
 *
 * Validates canonical feature-tree normalization across FreeCAD, Fusion 360,
 * and STEP fallback paths. Mock mode exercises bridge-required formats
 * (.sldprt, .ipt, etc.) without a CAD installation.
 */

process.env["PRISM_CAD_MOCK"] = "1";

import { describe, it, expect, beforeEach } from "vitest";

import {
  GroundTruthFeatureTreeExtractor,
  groundTruthFeatureTreeExtractor,
  CanonicalFeatureTreeSchema,
  CANONICAL_FEATURE_TYPES,
  canonicalSignature,
  type CanonicalFeature,
  type CanonicalFeatureTree,
} from "../engines/GroundTruthFeatureTreeExtractor.js";

import type { FCStdParseResult } from "../engines/FCStdNativeParserEngine.js";
import type { F3DParseResult } from "../engines/F3DSQLiteParserEngine.js";

let engine: GroundTruthFeatureTreeExtractor;

beforeEach(() => {
  engine = new GroundTruthFeatureTreeExtractor();
});

// ── Fixtures ────────────────────────────────────────────────────────────────

function freecadFixture(): FCStdParseResult {
  return {
    format: "FCStd",
    freecadVersion: "0.21.2",
    objects: [
      {
        type: "Sketcher::SketchObject",
        name: "Sketch001",
        label: "BaseSketch",
        properties: {
          Visibility: { type: "Bool", value: true },
        },
      },
      {
        type: "PartDesign::Pad",
        name: "Pad001",
        label: "Boss",
        properties: {
          Length: { type: "Length", value: 25, unit: "mm" },
          Sketch: { type: "Link", value: "Sketch001" },
          BaseFeature: { type: "Link", value: "Body001" },
        },
        expression: "thickness * 2",
      },
      {
        type: "PartDesign::Hole",
        name: "Hole001",
        label: "M6 Hole",
        properties: {
          Diameter: { type: "Length", value: 6, unit: "mm" },
          Depth: { type: "Length", value: 12, unit: "mm" },
          Sketch: { type: "Link", value: "HoleSketch" },
        },
      },
      {
        type: "PartDesign::LinearPattern",
        name: "Pattern001",
        label: "Hole Array",
        properties: {
          Count: { type: "Integer", value: 5 },
          Length: { type: "Length", value: 100, unit: "mm" },
        },
      },
      {
        type: "PartDesign::Mirrored",
        name: "Mirror001",
        label: "Mirror Y",
        properties: {},
      },
      {
        type: "PartDesign::Revolution",
        name: "Rev001",
        label: "Revolve Profile",
        properties: { Angle: { type: "Angle", value: 360, unit: "deg" } },
      },
      {
        type: "PartDesign::Thickness",
        name: "Shell001",
        label: "Shell",
        properties: { Value: { type: "Length", value: 2, unit: "mm" } },
      },
      {
        type: "Part::Box",
        name: "Box001",
        label: "Stock",
        properties: {
          Length: { type: "Length", value: 50, unit: "mm" },
          Width: { type: "Length", value: 30, unit: "mm" },
          Height: { type: "Length", value: 20, unit: "mm" },
        },
      },
      {
        type: "App::Part",
        name: "TopAssembly",
        label: "Assembly",
        properties: {},
      },
      {
        type: "Some::UnknownType",
        name: "Mystery",
        label: "Mystery",
        properties: {},
      },
    ],
    spreadsheets: [
      {
        name: "Parameters",
        cells: [
          { address: "A1", value: "thickness" },
          { address: "B1", value: "12.5", expression: "=10+2.5" },
        ],
      },
    ],
    coverage: 0.95,
    warnings: [],
  };
}

function fusionFixture(): F3DParseResult {
  return {
    format: "f3d",
    fusionVersion: "2.0.20055",
    timeline: [
      {
        index: 0,
        featureType: "Sketch",
        name: "Sketch1",
        parameters: {},
        suppressed: false,
      },
      {
        index: 1,
        featureType: "Extrude",
        name: "ExtrudePad",
        parameters: {
          distance: { value: 25, unit: "mm" },
          taper: { value: 0, unit: "deg" },
        },
        parentId: "Sketch1",
        suppressed: false,
      },
      {
        index: 2,
        featureType: "Fillet",
        name: "EdgeFillet",
        parameters: { radius: { value: 2, unit: "mm" } },
        suppressed: false,
      },
      {
        index: 3,
        featureType: "PatternRectangular",
        name: "BoltPattern",
        parameters: { qx: { value: 4, unit: "" }, qy: { value: 2, unit: "" } },
        suppressed: false,
      },
      {
        index: 4,
        featureType: "ExoticFeatureType",
        name: "Mystery",
        parameters: {},
        suppressed: true,
      },
    ],
    parameters: [
      { name: "thickness", expression: "12 mm", value: 12, unit: "mm" },
    ],
    sketches: [{ name: "Sketch1", planeId: "XY", entities: 4 }],
    bodies: [{ name: "Body1", type: "solid", visibility: true }],
    coverage: 0.9,
    warnings: ["one warning"],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GroundTruthFeatureTreeExtractor — singleton + schema", () => {
  it("singleton is wired to the same class as fresh instances", () => {
    expect(groundTruthFeatureTreeExtractor.schemaVersion).toBe("1.0.0");
    expect(groundTruthFeatureTreeExtractor.listCanonicalTypes()).toEqual(
      engine.listCanonicalTypes(),
    );
  });

  it("listCanonicalTypes returns the full canonical taxonomy", () => {
    const types = engine.listCanonicalTypes();
    expect(types).toEqual(CANONICAL_FEATURE_TYPES);
    expect(types.length).toBe(15);
    expect(types).toContain("Extrude");
    expect(types).toContain("Pattern");
    expect(types).toContain("Body");
    expect(types).toContain("Spreadsheet");
  });

  it("schema rejects unknown feature types", () => {
    const tree = {
      schemaVersion: "1.0.0",
      sourceFile: "/x.FCStd",
      sourceFormat: "FCStd",
      features: [{ id: "a", type: "WeldBead", name: "x" }],
      coverage: 1,
      signature: "0".repeat(64),
      warnings: [],
    };
    const r = CanonicalFeatureTreeSchema.safeParse(tree);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("type"))).toBe(true);
    }
  });

  it("schema rejects malformed signature (wrong length / hex)", () => {
    const tree = {
      schemaVersion: "1.0.0",
      sourceFile: "/x.FCStd",
      sourceFormat: "FCStd",
      features: [],
      coverage: 1,
      signature: "not-a-real-hash",
      warnings: [],
    };
    const r = CanonicalFeatureTreeSchema.safeParse(tree);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("signature"))).toBe(
        true,
      );
    }
  });
});

describe("normalizeFromFCStd — FreeCAD type mapping", () => {
  it("maps PartDesign::Pad → Extrude with sketchRef and parentId", () => {
    const tree = engine.normalizeFromFCStd(
      freecadFixture(),
      "/test/sample.FCStd",
    );
    const pad = tree.features.find((f) => f.id === "Pad001");
    expect(pad?.type).toBe("Extrude");
    expect(pad?.sketchRef).toBe("Sketch001");
    expect(pad?.parentId).toBe("Body001");
    expect(pad?.parameters?.["Length"]).toBe(25);
    expect(pad?.parameters?.["expression"]).toBe("thickness * 2");
    expect(pad?.sourceType).toBe("PartDesign::Pad");
  });

  it("maps Sketch / Hole / Pattern / Mirror / Revolve / Shell / Box / Assembly correctly", () => {
    const tree = engine.normalizeFromFCStd(
      freecadFixture(),
      "/test/sample.FCStd",
    );
    const byId = (id: string): CanonicalFeature => {
      const f = tree.features.find((x) => x.id === id);
      if (!f) throw new Error(`fixture missing feature ${id}`);
      return f;
    };
    expect(byId("Sketch001").type).toBe("Sketch");
    expect(byId("Hole001").type).toBe("Hole");
    expect(byId("Hole001").parameters?.["Diameter"]).toBe(6);
    expect(byId("Pattern001").type).toBe("Pattern");
    expect(byId("Pattern001").parameters?.["Count"]).toBe(5);
    expect(byId("Mirror001").type).toBe("Mirror");
    expect(byId("Rev001").type).toBe("Revolve");
    expect(byId("Rev001").parameters?.["Angle"]).toBe(360);
    expect(byId("Shell001").type).toBe("Shell");
    expect(byId("Box001").type).toBe("Body");
    expect(byId("Box001").parameters?.["Length"]).toBe(50);
    expect(byId("TopAssembly").type).toBe("Component");
    expect(byId("Mystery").type).toBe("Other");
  });

  it("emits a Spreadsheet feature with cell values flattened to parameters", () => {
    const tree = engine.normalizeFromFCStd(
      freecadFixture(),
      "/test/sample.FCStd",
    );
    const sheet = tree.features.find((f) => f.type === "Spreadsheet");
    expect(sheet?.id).toBe("spreadsheet:Parameters");
    expect(sheet?.parameters?.["A1"]).toBe("thickness");
    expect(sheet?.parameters?.["B1"]).toBeCloseTo(12.5, 5);
    expect(sheet?.parameters?.["B1:expr"]).toBe("=10+2.5");
  });

  it("preserves coverage, sourceVersion, warnings; signature is 64-hex; passes schema", () => {
    const tree = engine.normalizeFromFCStd(
      freecadFixture(),
      "/test/sample.FCStd",
    );
    expect(tree.sourceFormat).toBe("FCStd");
    expect(tree.sourceVersion).toBe("0.21.2");
    expect(tree.coverage).toBeCloseTo(0.95, 5);
    expect(tree.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(tree.signature.length).toBe(64);
    expect(CanonicalFeatureTreeSchema.safeParse(tree).success).toBe(true);
  });

  it("clamps out-of-range coverage into [0,1]", () => {
    const high: FCStdParseResult = { ...freecadFixture(), coverage: 1.5 };
    expect(engine.normalizeFromFCStd(high, "/x.FCStd").coverage).toBe(1);

    const neg: FCStdParseResult = { ...freecadFixture(), coverage: -0.2 };
    expect(engine.normalizeFromFCStd(neg, "/x.FCStd").coverage).toBe(0);

    const nan: FCStdParseResult = { ...freecadFixture(), coverage: Number.NaN };
    expect(engine.normalizeFromFCStd(nan, "/x.FCStd").coverage).toBe(0);
  });
});

describe("normalizeFromF3D — Fusion timeline mapping", () => {
  it("maps Extrude / Fillet / Pattern / unknown(suppressed) correctly", () => {
    const tree = engine.normalizeFromF3D(fusionFixture(), "/test/x.f3d");
    const findByName = (n: string): CanonicalFeature => {
      const f = tree.features.find((x) => x.name === n);
      if (!f) throw new Error(`fixture missing feature ${n}`);
      return f;
    };
    expect(findByName("ExtrudePad").type).toBe("Extrude");
    expect(findByName("ExtrudePad").parameters?.["distance"]).toBe(25);
    expect(findByName("ExtrudePad").parentId).toBe("Sketch1");
    expect(findByName("EdgeFillet").type).toBe("Fillet");
    expect(findByName("EdgeFillet").parameters?.["radius"]).toBe(2);
    expect(findByName("BoltPattern").type).toBe("Pattern");
    expect(findByName("BoltPattern").parameters?.["qx"]).toBe(4);
    const mystery = findByName("Mystery");
    expect(mystery.type).toBe("Other");
    expect(mystery.suppressed).toBe(true);
  });

  it("emits Sketch features for sketches array and Body features for bodies", () => {
    const tree = engine.normalizeFromF3D(fusionFixture(), "/test/x.f3d");
    const sketch = tree.features.find((f) => f.id === "sketch:Sketch1");
    const body = tree.features.find((f) => f.id === "body:Body1");
    expect(sketch?.type).toBe("Sketch");
    expect(sketch?.parameters?.["entities"]).toBe(4);
    expect(sketch?.parameters?.["planeId"]).toBe("XY");
    expect(body?.type).toBe("Body");
    expect(body?.parameters?.["visible"]).toBe(true);
    expect(body?.parameters?.["kind"]).toBe("solid");
  });

  it("captures document parameters into a Spreadsheet feature", () => {
    const tree = engine.normalizeFromF3D(fusionFixture(), "/test/x.f3d");
    const sheet = tree.features.find(
      (f) => f.id === "spreadsheet:fusion-parameters",
    );
    expect(sheet?.type).toBe("Spreadsheet");
    expect(sheet?.parameters?.["thickness"]).toBe(12);
    expect(sheet?.parameters?.["thickness:expr"]).toBe("12 mm");
    expect(sheet?.parameters?.["thickness:unit"]).toBe("mm");
  });

  it("propagates warnings, sourceVersion, and produces schema-valid output", () => {
    const tree = engine.normalizeFromF3D(fusionFixture(), "/test/x.f3d");
    expect(tree.warnings).toContain("one warning");
    expect(tree.sourceVersion).toBe("2.0.20055");
    expect(tree.sourceFormat).toBe("f3d");
    expect(CanonicalFeatureTreeSchema.safeParse(tree).success).toBe(true);
  });
});

describe("canonicalSignature determinism", () => {
  it("produces bit-identical signatures for two normalize() runs of the same fixture", () => {
    const t1 = engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd");
    const t2 = engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd");
    expect(t1.signature).toBe(t2.signature);
    expect(t1.signature.length).toBe(64);
  });

  it("produces different signatures when a feature is added/removed", () => {
    const base = engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd");
    const fx = freecadFixture();
    fx.objects.push({
      type: "PartDesign::Chamfer",
      name: "Chamfer001",
      label: "EdgeChamfer",
      properties: { Size: { type: "Length", value: 1.5, unit: "mm" } },
    });
    const mutated = engine.normalizeFromFCStd(fx, "/x.FCStd");
    expect(mutated.signature).not.toBe(base.signature);
    expect(mutated.features.some((f) => f.type === "Chamfer")).toBe(true);
    expect(mutated.features.length).toBe(base.features.length + 1);
  });

  it("ignores warnings/sourceVersion when computing signature", () => {
    const a = engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd");
    const fx = freecadFixture();
    fx.warnings = ["different warning"];
    fx.freecadVersion = "1.0.0-alpha";
    const b = engine.normalizeFromFCStd(fx, "/x.FCStd");
    expect(a.signature).toBe(b.signature);
  });

  it("recomputeSignature(tree) reproduces tree.signature", () => {
    const tree = engine.normalizeFromF3D(fusionFixture(), "/x.f3d");
    expect(engine.recomputeSignature(tree)).toBe(tree.signature);
  });

  it("standalone canonicalSignature() is stable under feature key reordering", () => {
    const f1: CanonicalFeature = {
      id: "a",
      type: "Extrude",
      name: "n",
      parameters: { length: 10, taper: 0 },
    };
    const f2: CanonicalFeature = {
      id: "a",
      type: "Extrude",
      name: "n",
      parameters: { taper: 0, length: 10 },
    };
    expect(canonicalSignature([f1], undefined, "FCStd")).toBe(
      canonicalSignature([f2], undefined, "FCStd"),
    );
  });

  it("canonicalSignature differs across sourceFormat for identical features", () => {
    const f: CanonicalFeature = { id: "a", type: "Body", name: "n" };
    expect(canonicalSignature([f], undefined, "FCStd")).not.toBe(
      canonicalSignature([f], undefined, "f3d"),
    );
  });
});

describe("extract() — file routing", () => {
  it("STEP path returns single-Body fallback tree", async () => {
    const tree = await engine.extract("/virtual/part.step");
    expect(tree.sourceFormat).toBe("step");
    expect(tree.features.length).toBe(1);
    expect(tree.features[0]?.type).toBe("Body");
    expect(tree.features[0]?.name).toBe("part");
    expect(tree.coverage).toBeCloseTo(0.1, 5);
  });

  it("bridge-required formats return deterministic mock trees in mock mode", async () => {
    const a = await engine.extract("/virtual/part.sldprt");
    const b = await engine.extract("/virtual/part.sldprt");
    expect(a.sourceFormat).toBe("sldprt");
    expect(a.signature).toBe(b.signature);
    expect(a.features.length).toBeGreaterThanOrEqual(2);
    expect(a.features.length).toBeLessThanOrEqual(5);
    expect(a.warnings[0]).toContain("mock-mode");

    const ipt = await engine.extract("/virtual/x.ipt");
    expect(ipt.sourceFormat).toBe("ipt");
  });

  it("rejects unsupported extensions", async () => {
    await expect(engine.extract("/virtual/x.unknownformat")).rejects.toThrow(
      /Unsupported file extension/,
    );
  });

  it("rejects empty filePath", async () => {
    await expect(engine.extract("")).rejects.toThrow(
      /must be a non-empty string/,
    );
  });

  it("buildStepFallback names the body after the file basename", () => {
    const t = engine.buildStepFallback("/some/dir/MyPart.step");
    expect(t.features[0]?.name).toBe("MyPart");
    expect(t.features[0]?.type).toBe("Body");
    expect(t.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildMockTree is deterministic per (path, format) and produces 2..5 features", () => {
    const a = engine.buildMockTree("/virtual/x.sldprt", "sldprt");
    const b = engine.buildMockTree("/virtual/x.sldprt", "sldprt");
    const c = engine.buildMockTree("/virtual/y.sldprt", "sldprt");
    expect(a.signature).toBe(b.signature);
    expect(a.signature).not.toBe(c.signature);
    expect(a.features.length).toBeGreaterThanOrEqual(2);
    expect(a.features.length).toBeLessThanOrEqual(5);
    expect(a.coverage).toBe(1);
  });
});

describe("validate() — schema diagnostics", () => {
  it("returns ok for a freshly normalized tree", () => {
    const tree = engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd");
    const v = engine.validate(tree);
    expect(v.ok).toBe(true);
    expect(v.errors.length).toBe(0);
  });

  it("returns errors with paths for a malformed tree", () => {
    const bad: CanonicalFeatureTree = {
      ...engine.normalizeFromFCStd(freecadFixture(), "/x.FCStd"),
      coverage: 5,
    };
    const v = engine.validate(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.startsWith("coverage"))).toBe(true);
  });

  it("returns errors for a tree missing required fields", () => {
    const v = engine.validate({ schemaVersion: "1.0.0" });
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(2);
    expect(v.errors.some((e) => e.includes("sourceFile"))).toBe(true);
    expect(v.errors.some((e) => e.includes("features"))).toBe(true);
    expect(v.errors.some((e) => e.includes("signature"))).toBe(true);
  });
});
