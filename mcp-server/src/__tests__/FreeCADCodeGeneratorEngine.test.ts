/**
 * FreeCADCodeGeneratorEngine.test.ts — U-CADC05 (PHASE-1)
 *
 * Exhaustive vitest coverage (≥10) of the FreeCAD Python code generator,
 * our first concrete subclass of UnifiedCADCodeGeneratorBase. Verifies
 * capability matrix, each script emitter, unit invariants (mm/deg native),
 * parameter + warning collection, and mock execution.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FreeCADCodeGeneratorEngine } from "../engines/FreeCADCodeGeneratorEngine.js";
import {
  UnsupportedCapabilityError,
  CADBuildError,
} from "../engines/UnifiedCADCodeGeneratorBase.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("FreeCADCodeGeneratorEngine (U-CADC05)", () => {
  let eng: FreeCADCodeGeneratorEngine;

  beforeEach(() => {
    eng = new FreeCADCodeGeneratorEngine();
  });

  describe("capability matrix", () => {
    it("declares freecad as the cadSystem", () => {
      expect(eng.cadSystem).toBe("freecad");
    });

    it("declares mm + deg as native units (no conversion layer)", () => {
      expect(eng.capabilities.nativeLengthUnit).toBe("mm");
      expect(eng.capabilities.nativeAngleUnit).toBe("deg");
    });

    it("requires subprocess (FreeCADCmd)", () => {
      expect(eng.capabilities.requiresSubprocess).toBe(true);
    });

    it("supports a rich op set including sketch + feature + pattern", () => {
      const caps = eng.capabilities.supportedOps;
      expect(caps.has("sketch_create")).toBe(true);
      expect(caps.has("sketch_rectangle")).toBe(true);
      expect(caps.has("feature_extrude")).toBe(true);
      expect(caps.has("feature_fillet")).toBe(true);
      expect(caps.has("pattern_linear")).toBe(true);
      expect(caps.has("boolean_subtract")).toBe(true);
      expect(caps.has("import_step")).toBe(true);
      expect(caps.has("parameter_declare")).toBe(true);
    });

    it("does NOT claim surface ops FreeCAD's PartDesign workbench lacks", () => {
      const caps = eng.capabilities.supportedOps;
      // Our capability list explicitly omits surface_* because PartDesign
      // doesn't handle them; Part workbench surface ops belong in a separate engine.
      expect(caps.has("surface_loft")).toBe(false);
      expect(caps.has("surface_fill")).toBe(false);
    });

    it("rejects unsupported op with UnsupportedCapabilityError", () => {
      expect(() =>
        eng.buildScript([{ kind: "surface_loft", args: {} }]),
      ).toThrow(UnsupportedCapabilityError);
    });
  });

  describe("preamble / epilogue", () => {
    it("preamble imports FreeCAD, Part, Sketcher, Draft, Base", () => {
      const script = eng.buildScript([{ kind: "sketch_create", args: {} }]);
      expect(script.body).toContain("import FreeCAD");
      expect(script.body).toContain("import Part");
      expect(script.body).toContain("import Sketcher");
      expect(script.body).toContain("from FreeCAD import Base");
    });

    it("preamble creates document with the provided documentName", () => {
      const script = eng.buildScript([{ kind: "sketch_create", args: {} }], {
        documentName: "BRACKET",
      });
      expect(script.body).toContain('FreeCAD.newDocument("BRACKET")');
    });

    it("preamble creates PartDesign Body by default", () => {
      const script = eng.buildScript([{ kind: "sketch_create", args: {} }]);
      expect(script.body).toContain('doc.addObject("PartDesign::Body", "Body")');
    });

    it("epilogue recomputes doc and optionally exports STEP", () => {
      const script = eng.buildScript(
        [{ kind: "sketch_create", args: {} }],
        { exportPath: "/tmp/out.step" },
      );
      expect(script.body).toContain("doc.recompute()");
      expect(script.body).toContain('Part.export(_targets, "/tmp/out.step")');
    });
  });

  describe("sketch emitters", () => {
    it("sketch_line emits Part.LineSegment with correct endpoints", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 50, y2: 0 } },
      ]);
      expect(script.body).toMatch(
        /Part\.LineSegment\(Base\.Vector\(0,0,0\), Base\.Vector\(50,0,0\)\)/,
      );
    });

    it("sketch_circle emits Part.Circle with mm radius", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        { kind: "sketch_circle", args: { cx: 10, cy: 20, radius: 5 } },
      ]);
      expect(script.body).toMatch(
        /Part\.Circle\(Base\.Vector\(10,20,0\), Base\.Vector\(0,0,1\), 5\)/,
      );
    });

    it("sketch_rectangle emits 4 LineSegments forming a closed rectangle", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        {
          kind: "sketch_rectangle",
          args: { x: 0, y: 0, width: 30, height: 20 },
        },
      ]);
      const lineMatches = script.body.match(/Part\.LineSegment/g);
      expect(lineMatches?.length).toBe(4);
    });

    it("sketch_arc converts degrees to radians", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        {
          kind: "sketch_arc",
          args: { cx: 0, cy: 0, radius: 10, startAngleDeg: 0, endAngleDeg: 180 },
        },
      ]);
      // 180 deg = π rad ≈ 3.141592…
      expect(script.body).toMatch(/3\.14159/);
    });

    it("sketch_polygon emits N-sided construction with math.pi", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        { kind: "sketch_polygon", args: { cx: 0, cy: 0, radius: 10, sides: 6 } },
      ]);
      expect(script.body).toContain("range(6)");
      expect(script.body).toMatch(/math'\)\.cos/);
      expect(script.body).toMatch(/math'\)\.sin/);
    });

    it("sketch_spline emits Part.BSplineCurve with Vector points", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        {
          kind: "sketch_spline",
          args: { points: [0, 0, 10, 5, 20, 3, 30, 8] },
        },
      ]);
      expect(script.body).toContain("Part.BSplineCurve");
      expect(script.body.match(/Base\.Vector\(\d/g)?.length).toBeGreaterThanOrEqual(4);
    });

    it("sketch_slot emits 2 lines + 2 arcs", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        {
          kind: "sketch_slot",
          args: { cx: 0, cy: 0, length: 20, width: 5 },
        },
      ]);
      const lines = script.body.match(/Part\.LineSegment/g)?.length ?? 0;
      const arcs = script.body.match(/Part\.ArcOfCircle/g)?.length ?? 0;
      expect(lines).toBe(2);
      expect(arcs).toBe(2);
    });
  });

  describe("feature emitters", () => {
    it("feature_extrude emits Pad with length and records parameter", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        { kind: "feature_extrude", args: { length: 25 }, description: "riser" },
      ]);
      expect(script.body).toContain('body.newObject("PartDesign::Pad"');
      expect(script.body).toContain("pad.Length = 25");
      const padParams = [...script.parameters.entries()].filter(([k]) =>
        k.startsWith("pad_length_"),
      );
      expect(padParams.length).toBe(1);
      expect(padParams[0][1].value).toBe(25);
      expect(padParams[0][1].description).toBe("riser");
    });

    it("feature_extrude without length throws CADBuildError", () => {
      expect(() =>
        eng.buildScript([
          { kind: "sketch_create", args: {} },
          { kind: "feature_extrude", args: {} },
        ]),
      ).toThrow(CADBuildError);
    });

    it("feature_revolve emits Revolution with angle", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: {} },
        { kind: "feature_revolve", args: { angleDeg: 270, axis: "V_Axis" } },
      ]);
      expect(script.body).toContain('body.newObject("PartDesign::Revolution"');
      expect(script.body).toContain("rev.Angle = 270");
    });

    it("feature_fillet warns when radius exceeds limit", () => {
      const script = eng.buildScript([
        { kind: "feature_fillet", args: { radius: 20_000 } },
      ]);
      expect(script.warnings.length).toBeGreaterThan(0);
      expect(script.warnings[0].message).toMatch(/exceeds limit/);
    });

    it("boolean_subtract emits Part::Cut with Base + Tool", () => {
      const script = eng.buildScript([
        { kind: "boolean_subtract", args: { a: "Pad", b: "Pocket" } },
      ]);
      expect(script.body).toContain('doc.addObject("Part::Cut"');
      expect(script.body).toContain('doc.getObject("Pad")');
      expect(script.body).toContain('doc.getObject("Pocket")');
    });

    it("boolean_union and boolean_intersect use Fuse / Common", () => {
      const union = eng.buildScript([
        { kind: "boolean_union", args: { a: "A", b: "B" } },
      ]);
      const intersect = eng.buildScript([
        { kind: "boolean_intersect", args: { a: "A", b: "B" } },
      ]);
      expect(union.body).toContain('"Part::Fuse"');
      expect(intersect.body).toContain('"Part::Common"');
    });
  });

  describe("pattern + transform", () => {
    it("pattern_linear emits LinearPattern with length = count*spacing", () => {
      const script = eng.buildScript([
        { kind: "pattern_linear", args: { count: 5, spacing: 10 } },
      ]);
      expect(script.body).toContain("lpat.Length = 50");
      expect(script.body).toContain("lpat.Occurrences = 5");
    });

    it("pattern_linear warns when count exceeds 500", () => {
      const script = eng.buildScript([
        { kind: "pattern_linear", args: { count: 1_000, spacing: 1 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("exceeds"))).toBe(
        true,
      );
    });

    it("pattern_circular emits PolarPattern with angle + occurrences", () => {
      const script = eng.buildScript([
        { kind: "pattern_circular", args: { count: 8, angleDeg: 360 } },
      ]);
      expect(script.body).toContain('"PartDesign::PolarPattern"');
      expect(script.body).toContain("cpat.Angle = 360");
      expect(script.body).toContain("cpat.Occurrences = 8");
    });

    it("transform_move writes Placement.Base", () => {
      const script = eng.buildScript([
        {
          kind: "transform_move",
          args: { target: "Body", dx: 10, dy: 0, dz: 5 },
        },
      ]);
      expect(script.body).toContain(
        'doc.getObject("Body").Placement.Base = Base.Vector(10,0,5)',
      );
    });
  });

  describe("import / export", () => {
    it("import_step emits Part.insert with path", () => {
      const script = eng.buildScript([
        { kind: "import_step", args: { path: "/tmp/in.step" } },
      ]);
      expect(script.body).toContain('Part.insert("/tmp/in.step", doc.Name)');
    });

    it("export_step uses Part.export", () => {
      const script = eng.buildScript([
        { kind: "export_step", args: { path: "/tmp/out.step", target: "Body" } },
      ]);
      expect(script.body).toContain(
        'Part.export([doc.getObject("Body")], "/tmp/out.step")',
      );
    });

    it("export_dxf uses Draft.exportDXF instead of Part.export", () => {
      const script = eng.buildScript([
        { kind: "export_dxf", args: { path: "/tmp/out.dxf", target: "Sketch" } },
      ]);
      expect(script.body).toContain("Draft.exportDXF");
    });

    it("export without path throws CADBuildError", () => {
      expect(() =>
        eng.buildScript([{ kind: "export_step", args: {} }]),
      ).toThrow(CADBuildError);
    });
  });

  describe("parametric + custom", () => {
    it("parameter_declare registers a typed parameter", () => {
      const script = eng.buildScript([
        {
          kind: "parameter_declare",
          args: { name: "wall", value: 2.5, unit: "mm" },
        },
      ]);
      const p = script.parameters.get("wall");
      expect(p?.value).toBe(2.5);
      expect(p?.unit).toBe("mm");
      expect(script.body).toContain("wall = 2.5");
    });

    it("parameter_equation emits raw expression", () => {
      const script = eng.buildScript([
        {
          kind: "parameter_equation",
          args: { name: "outer", expression: "wall * 2 + 5" },
        },
      ]);
      expect(script.body).toContain("outer = wall * 2 + 5");
    });

    it("custom op pastes raw Python block verbatim", () => {
      const script = eng.buildScript([
        {
          kind: "custom",
          args: { body: "# custom\nfoo = 1\nbar = 2" },
        },
      ]);
      expect(script.body).toContain("foo = 1");
      expect(script.body).toContain("bar = 2");
    });
  });

  describe("lineage", () => {
    it("lineage entries cover every op in order", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", args: {}, operationId: "sk" },
        { kind: "sketch_rectangle", args: { width: 40, height: 20 }, operationId: "rect" },
        { kind: "feature_extrude", args: { length: 10 }, operationId: "pad" },
      ];
      const script = eng.buildScript(ops);
      expect(script.lineage.map((l) => l.operationId)).toEqual(["sk", "rect", "pad"]);
      // Each entry has non-decreasing line ranges
      for (let i = 1; i < script.lineage.length; i++) {
        expect(script.lineage[i].lineStart).toBeGreaterThan(
          script.lineage[i - 1].lineEnd,
        );
      }
    });
  });

  describe("execute (mock)", () => {
    let priorMock: string | undefined;
    beforeEach(() => {
      priorMock = process.env.PRISM_CAD_MOCK;
      process.env.PRISM_CAD_MOCK = "1";
    });
    afterEach(() => {
      if (priorMock === undefined) delete process.env.PRISM_CAD_MOCK;
      else process.env.PRISM_CAD_MOCK = priorMock;
    });

    it("mock execution returns healthy metrics", async () => {
      const script = eng.buildScript([{ kind: "sketch_create", args: {} }]);
      const res = await eng.executeScript(script);
      expect(res.ok).toBe(true);
      expect(res.metrics?.volumeMm3).toBe(1_000);
      expect(res.metrics?.faceCount).toBe(6);
    });

    it("validateOutput accepts the mock metrics", async () => {
      const script = eng.buildScript([{ kind: "sketch_create", args: {} }]);
      const res = await eng.executeScript(script);
      const report = eng.validateOutput(res);
      expect(report.ok).toBe(true);
      expect(report.findings).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // U-CADC-OVE-01 — Op Vocabulary Exhaustion: feature_extrude + feature_revolve
  // FreeCAD PartDesign::Pad / PartDesign::Revolution full option surface
  // ─────────────────────────────────────────────────────────────────────
  describe("feature_extrude — exhaustive input surface (FreeCAD)", () => {
    const extrudeOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "feature_extrude", args: { sketch: "sk0", distance: 10, ...extra } },
    ];

    it("endCondition=blind emits Type='Length' (default)", () => {
      const script = eng.buildScript(extrudeOps());
      expect(script.body).toMatch(/pad\.Type = "Length"/);
      expect(script.body).toMatch(/pad\.Length = 10/);
    });

    it("endCondition=through_all emits Type='UpToLast'", () => {
      const script = eng.buildScript(extrudeOps({ endCondition: "through_all" }));
      expect(script.body).toMatch(/pad\.Type = "UpToLast"/);
    });

    it("endCondition=up_to_next emits Type='UpToFirst'", () => {
      const script = eng.buildScript(extrudeOps({ endCondition: "up_to_next" }));
      expect(script.body).toMatch(/pad\.Type = "UpToFirst"/);
    });

    it("endCondition=up_to_surface with targetSurface emits Type='UpToFace' + UpToFace assignment", () => {
      const script = eng.buildScript(
        extrudeOps({ endCondition: "up_to_surface", targetSurface: "Face1" }),
      );
      expect(script.body).toMatch(/pad\.Type = "UpToFace"/);
      expect(script.body).toMatch(/pad\.UpToFace = \(doc\.getObject\("Face1"\), \[""\]\)/);
    });

    it("endCondition=up_to_surface without targetSurface warns + falls back to UpToLast", () => {
      const script = eng.buildScript(extrudeOps({ endCondition: "up_to_surface" }));
      expect(script.body).toMatch(/pad\.Type = "UpToLast"/);
      expect(script.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("endCondition=offset_from_surface emits Type='UpToFace' + Offset", () => {
      const script = eng.buildScript(
        extrudeOps({ endCondition: "offset_from_surface", targetSurface: "Face1", offsetFromSurface: 3 }),
      );
      expect(script.body).toMatch(/pad\.Type = "UpToFace"/);
      expect(script.body).toMatch(/pad\.Offset = 3/);
    });

    it("direction=two_side emits Type='TwoLengths' + Length2", () => {
      const script = eng.buildScript(extrudeOps({ direction: "two_side", distance2: 7 }));
      expect(script.body).toMatch(/pad\.Type = "TwoLengths"/);
      expect(script.body).toMatch(/pad\.Length2 = 7/);
    });

    it("direction=symmetric sets Midplane=True", () => {
      const script = eng.buildScript(extrudeOps({ direction: "symmetric" }));
      expect(script.body).toMatch(/pad\.Midplane = True/);
    });

    it("reversed=true sets Reversed=True", () => {
      const script = eng.buildScript(extrudeOps({ reversed: true }));
      expect(script.body).toMatch(/pad\.Reversed = True/);
    });

    it("taperAngle emits TaperAngle assignment", () => {
      const script = eng.buildScript(extrudeOps({ taperAngle: 4 }));
      expect(script.body).toMatch(/pad\.TaperAngle = 4/);
    });

    it("taperAngle2 emits TaperAngleRev assignment", () => {
      const script = eng.buildScript(extrudeOps({ taperAngle2: -2 }));
      expect(script.body).toMatch(/pad\.TaperAngleRev = -2/);
    });

    it("thinFeature emits annotation with thickness", () => {
      const script = eng.buildScript(extrudeOps({ thinFeature: true, thinThickness: 1.5 }));
      expect(script.body).toMatch(/thinThickness=1\.5mm/);
    });

    it("midplane arg legacy path also sets Midplane=True", () => {
      const script = eng.buildScript(extrudeOps({ midplane: true }));
      expect(script.body).toMatch(/pad\.Midplane = True/);
    });

    it("zero distance with blind endCondition emits warning", () => {
      const script = eng.buildScript(extrudeOps({ distance: 0 }));
      expect(script.warnings.some((w) => /distance = 0/.test(w.message))).toBe(true);
    });

    it("backward-compat: legacy 'length' arg still works", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
        { kind: "feature_extrude", args: { sketch: "sk0", length: 12 } },
      ]);
      expect(script.body).toMatch(/pad\.Length = 12/);
    });

    it("combined: two_side + taper + distance2", () => {
      const script = eng.buildScript(
        extrudeOps({
          direction: "two_side",
          distance2: 5,
          taperAngle: 2,
          taperAngle2: -3,
        }),
      );
      expect(script.body).toMatch(/pad\.Type = "TwoLengths"/);
      expect(script.body).toMatch(/pad\.Length2 = 5/);
      expect(script.body).toMatch(/pad\.TaperAngle = 2/);
      expect(script.body).toMatch(/pad\.TaperAngleRev = -3/);
    });
  });

  describe("feature_revolve — exhaustive input surface (FreeCAD)", () => {
    const revolveOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "feature_revolve", args: { sketch: "sk0", axis: "X_AXIS", angle: 180, ...extra } },
    ];

    it("default angle=180 emits Angle assignment", () => {
      const script = eng.buildScript(revolveOps());
      expect(script.body).toMatch(/rev\.Angle = 180/);
    });

    it("endCondition=full forces Angle=360", () => {
      const script = eng.buildScript(revolveOps({ endCondition: "full" }));
      expect(script.body).toMatch(/rev\.Angle = 360/);
    });

    it("endCondition=two_direction emits Type='TwoAngles' + Angle2", () => {
      const script = eng.buildScript(revolveOps({ endCondition: "two_direction", angle2: 90 }));
      expect(script.body).toMatch(/rev\.Type = "TwoAngles"/);
      expect(script.body).toMatch(/rev\.Angle2 = 90/);
    });

    it("endCondition=up_to_surface with targetSurface emits Type='UpToFace'", () => {
      const script = eng.buildScript(
        revolveOps({ endCondition: "up_to_surface", targetSurface: "StopFace" }),
      );
      expect(script.body).toMatch(/rev\.Type = "UpToFace"/);
    });

    it("endCondition=up_to_surface without targetSurface warns + falls back", () => {
      const script = eng.buildScript(revolveOps({ endCondition: "up_to_surface" }));
      expect(script.warnings.some((w) => /without targetSurface/.test(w.message))).toBe(true);
    });

    it("direction=symmetric sets Midplane=True", () => {
      const script = eng.buildScript(revolveOps({ direction: "symmetric" }));
      expect(script.body).toMatch(/rev\.Midplane = True/);
    });

    it("direction=cw sets Reversed=True", () => {
      const script = eng.buildScript(revolveOps({ direction: "cw" }));
      expect(script.body).toMatch(/rev\.Reversed = True/);
    });

    it("backward-compat: legacy 'angleDeg' arg still works", () => {
      const script = eng.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
        { kind: "feature_revolve", args: { sketch: "sk0", axis: "X_AXIS", angleDeg: 270 } },
      ]);
      expect(script.body).toMatch(/rev\.Angle = 270/);
    });

    it("angle > 360 emits out-of-range warning", () => {
      const script = eng.buildScript(revolveOps({ angle: 400 }));
      expect(script.warnings.some((w) => /out of/.test(w.message))).toBe(true);
    });

    it("combined: cw + angle + thinFeature annotation", () => {
      const script = eng.buildScript(
        revolveOps({ direction: "cw", angle: 120, thinFeature: true, thinThickness: 0.8 }),
      );
      expect(script.body).toMatch(/rev\.Reversed = True/);
      expect(script.body).toMatch(/rev\.Angle = 120/);
      expect(script.body).toMatch(/Thin revolve.*post-hoc with 0\.8mm/);
    });
  });
});
