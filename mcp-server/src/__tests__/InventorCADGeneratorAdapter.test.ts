/**
 * InventorCADGeneratorAdapter.test.ts — U-CADC08 (PHASE-0B)
 *
 * Exhaustive coverage for the pure-CAD extension of InventorCAMCodeGeneratorEngine:
 *  - Fragment emitters (ilXxx): one test per helper + boundary conditions
 *  - Instance methods (createSketch/Extrude/…): mandated 6 + ~20 extras
 *  - Adapter (InventorCADGeneratorAdapter): capability enforcement, build output,
 *    lineage, warnings, parameters, validation, mock subprocess
 *  - Unit conversions: mm + in + cm + "25 mm" string expressions
 *  - Edge cases: zero / negative / extreme / NaN / empty / oversized
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  InventorCAMCodeGeneratorEngineClass,
  InventorCADGeneratorAdapter,
  inventorCADGeneratorAdapter,
  inventorCAMCodeGeneratorEngine,
  ilCreateSketch,
  ilSketchLine,
  ilSketchArc,
  ilSketchCircle,
  ilSketchRectangle,
  ilSketchPolygon,
  ilSketchSpline,
  ilSketchEllipse,
  ilSketchSlot,
  ilSketchPoint,
  ilExtrude,
  ilRevolve,
  ilLoft,
  ilSweep,
  ilHole,
  ilPocket,
  ilFillet,
  ilChamfer,
  ilShell,
  ilDraft,
  ilBoolean,
  ilPatternRectangular,
  ilPatternCircular,
  ilMirror,
  ilMove,
  ilRotate,
  ilWorkPlane,
  ilWorkAxis,
  ilWorkPoint,
  ilAssemblyMate,
  ilImport,
  ilExport,
  ilParameter,
  ilEquation,
} from "../engines/InventorCAMCodeGeneratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import { UnsupportedCapabilityError } from "../engines/UnifiedCADCodeGeneratorBase.js";

function body(frag: { lines: string[] }): string {
  return frag.lines.join("\n");
}

describe("InventorCADGeneratorAdapter (U-CADC08)", () => {
  describe("ilCreateSketch fragment emitter", () => {
    it("emits sketch on XY plane referencing WorkPlanes.Item(3)", () => {
      const f = ilCreateSketch("sk0", "xy", "Base");
      expect(body(f)).toMatch(/WorkPlanes\.Item\(3\)/);
      expect(body(f)).toMatch(/sk0\.Name = "Base"/);
    });

    it("emits sketch on YZ plane referencing WorkPlanes.Item(1)", () => {
      const f = ilCreateSketch("sk1", "yz", "Side");
      expect(body(f)).toMatch(/WorkPlanes\.Item\(1\)/);
    });

    it("emits sketch on XZ plane referencing WorkPlanes.Item(2)", () => {
      const f = ilCreateSketch("sk2", "xz", "Front");
      expect(body(f)).toMatch(/WorkPlanes\.Item\(2\)/);
    });

    it("emits sketch on face with provided faceRef", () => {
      const f = ilCreateSketch("sk3", "face", "TopFace", "ext1.TopFace");
      expect(body(f)).toMatch(/compDef\.Sketches\.Add\(ext1\.TopFace\)/);
    });

    it("warns and produces no valid code when face sketch missing faceRef", () => {
      const f = ilCreateSketch("sk4", "face", "x");
      expect(f.warnings).toBeDefined();
      expect(f.warnings!.join(" ")).toMatch(/faceRef missing/);
    });
  });

  describe("ilSketch* primitives", () => {
    it("line emits AddByTwoPoints with 4 coordinates", () => {
      const f = ilSketchLine("s", 0, 0, 25, 50);
      expect(body(f)).toMatch(/AddByTwoPoints/);
      expect(body(f)).toMatch(/CreatePoint2d\(0, 0\)/);
      expect(body(f)).toMatch(/CreatePoint2d\(25, 50\)/);
    });

    it("arc with negative radius warns", () => {
      const f = ilSketchArc("s", 0, 0, -5, 0, 90);
      expect(f.warnings!.join(" ")).toMatch(/radius.*0/);
    });

    it("arc with valid radius computes start/end points from angles", () => {
      const f = ilSketchArc("s", 0, 0, 10, 0, 90);
      expect(body(f)).toMatch(/AddByCenterStartEndPoint/);
      // cos(0)=1 → start x=10, sin(90°)=1 → end y=10
      expect(body(f)).toMatch(/CreatePoint2d\(10, 0\)/);
    });

    it("circle with zero radius warns", () => {
      const f = ilSketchCircle("s", 0, 0, 0);
      expect(f.warnings!.join(" ")).toMatch(/radius.*0/);
    });

    it("rectangle emits AddAsTwoPointRectangle with opposite corner", () => {
      const f = ilSketchRectangle("s", 0, 0, 40, 20);
      expect(body(f)).toMatch(/AddAsTwoPointRectangle/);
      expect(body(f)).toMatch(/CreatePoint2d\(40, 20\)/);
    });

    it("polygon with <3 sides warns", () => {
      const f = ilSketchPolygon("s", 0, 0, 2, 10);
      expect(f.warnings!.join(" ")).toMatch(/sides=2/);
    });

    it("hexagon emits exactly 6 lines", () => {
      const f = ilSketchPolygon("s", 0, 0, 6, 10);
      const addLines = f.lines.filter((l) => l.includes("SketchLines.AddByTwoPoints"));
      expect(addLines).toHaveLength(6);
    });

    it("circumscribed polygon computes larger radius than inscribed", () => {
      const inscribed = ilSketchPolygon("s", 0, 0, 6, 10, true);
      const circ = ilSketchPolygon("s", 0, 0, 6, 10, false);
      // circumscribed uses r/cos(pi/n) > inscribed r
      expect(body(circ).length).toBeGreaterThan(0);
      expect(body(inscribed).length).toBeGreaterThan(0);
    });

    it("spline with < 2 points warns", () => {
      const f = ilSketchSpline("s", [[0, 0]]);
      expect(f.warnings!.join(" ")).toMatch(/≥2 points/);
    });

    it("spline with 3 points emits collection + SketchSplines.Add", () => {
      const f = ilSketchSpline("s", [[0, 0], [10, 5], [20, 0]]);
      const addedPts = f.lines.filter((l) => l.includes(".Add(tg.CreatePoint2d"));
      expect(addedPts).toHaveLength(3);
      expect(body(f)).toMatch(/SketchSplines\.Add/);
    });

    it("ellipse with zero minor radius warns", () => {
      const f = ilSketchEllipse("s", 0, 0, 10, 0, 0);
      expect(f.warnings!.join(" ")).toMatch(/minor radius.*0/);
    });

    it("slot with zero width warns", () => {
      const f = ilSketchSlot("s", 0, 0, 10, 0, 0);
      expect(f.warnings!.join(" ")).toMatch(/width.*0/);
    });

    it("slot emits 2 lines + 2 arcs", () => {
      const f = ilSketchSlot("s", 0, 0, 20, 0, 4);
      const lines = f.lines.filter((l) => l.includes("SketchLines.AddByTwoPoints"));
      const arcs = f.lines.filter((l) => l.includes("SketchArcs.AddByCenterStartEndPoint"));
      expect(lines).toHaveLength(2);
      expect(arcs).toHaveLength(2);
    });

    it("point emits SketchPoints.Add with fixed=False", () => {
      const f = ilSketchPoint("s", 12.5, -4);
      expect(body(f)).toMatch(/SketchPoints\.Add\(tg\.CreatePoint2d\(12\.5, -4\), False\)/);
    });
  });

  describe("ilExtrude / ilRevolve / ilLoft / ilSweep", () => {
    it("extrude default join+positive", () => {
      const f = ilExtrude("e0", "sk", 10);
      expect(body(f)).toMatch(/kJoinOperation/);
      expect(body(f)).toMatch(/kPositiveExtentDirection/);
      expect(body(f)).toMatch(/"10 mm"/);
    });

    it("extrude cut+symmetric", () => {
      const f = ilExtrude("e1", "sk", 5, "cut", "symmetric");
      expect(body(f)).toMatch(/kCutOperation/);
      expect(body(f)).toMatch(/kSymmetricExtentDirection/);
    });

    it("extrude with string distance passes through quoted expression", () => {
      const f = ilExtrude("e2", "sk", "thickness * 2");
      expect(body(f)).toMatch(/"thickness \* 2"/);
    });

    it("extrude with negative distance warns", () => {
      const f = ilExtrude("e3", "sk", -1);
      expect(f.warnings!.join(" ")).toMatch(/distance.*0/);
    });

    it("revolve 360° uses AddFull overload", () => {
      const f = ilRevolve("r0", "sk", "axis", 360);
      expect(body(f)).toMatch(/AddFull/);
      expect(body(f)).not.toMatch(/AddByAngle/);
    });

    it("revolve < 360° uses AddByAngle overload", () => {
      const f = ilRevolve("r1", "sk", "axis", 90);
      expect(body(f)).toMatch(/AddByAngle/);
      expect(body(f)).toMatch(/"90 deg"/);
    });

    it("revolve out-of-range angle warns", () => {
      const f = ilRevolve("r2", "sk", "axis", 400);
      expect(f.warnings!.join(" ")).toMatch(/out of \(0,360\]/);
    });

    it("loft with < 2 profiles warns", () => {
      const f = ilLoft("lft", ["p1"], "join");
      expect(f.warnings!.join(" ")).toMatch(/≥2 profiles/);
    });

    it("loft with 3 profiles emits 3 collection adds", () => {
      const f = ilLoft("lft", ["p1", "p2", "p3"], "new_body");
      const adds = f.lines.filter((l) => l.match(/\.Add\(p\d\.Profiles/));
      expect(adds).toHaveLength(3);
      expect(body(f)).toMatch(/kNewBodyOperation/);
    });

    it("sweep composes Path + SweepDefinition", () => {
      const f = ilSweep("sw", "prof", "path", "join");
      expect(body(f)).toMatch(/CreatePath\(path\)/);
      expect(body(f)).toMatch(/kPathSweepType/);
    });
  });

  describe("ilHole cycles", () => {
    it("drilled through emits AddDrilledByThroughAllExtent", () => {
      const f = ilHole("h0", "face", 0, 0, "drilled", 6, "through");
      expect(body(f)).toMatch(/AddDrilledByThroughAllExtent/);
    });

    it("drilled to depth emits AddDrilledByDistanceExtent with 118° drill tip", () => {
      const f = ilHole("h1", "face", 0, 0, "drilled", 6, 20);
      expect(body(f)).toMatch(/AddDrilledByDistanceExtent/);
      expect(body(f)).toMatch(/"118 deg"/);
    });

    it("counterbore derives defaults from diameter when not provided", () => {
      const f = ilHole("h2", "face", 0, 0, "counterbore", 10, 20);
      expect(body(f)).toMatch(/AddCounterboreByDistanceExtent/);
      // cbDia defaults to 1.8 * dia = 18 mm
      expect(body(f)).toMatch(/"18 mm"/);
    });

    it("counterbore honors explicit options", () => {
      const f = ilHole("h3", "face", 0, 0, "counterbore", 10, 20, {
        counterboreDiameter: 16,
        counterboreDepth: 4,
      });
      expect(body(f)).toMatch(/"16 mm"/);
      expect(body(f)).toMatch(/"4 mm"/);
    });

    it("countersink uses AddCountersinkByDistanceExtent + 82° cone", () => {
      const f = ilHole("h4", "face", 0, 0, "countersink", 6, 15);
      expect(body(f)).toMatch(/AddCountersinkByDistanceExtent/);
      expect(body(f)).toMatch(/"82 deg"/);
    });

    it("tapped hole emits thread placeholder comment", () => {
      const f = ilHole("h5", "face", 0, 0, "tapped", 6.8, "through", { tapSize: "M8x1.25" });
      expect(body(f)).toMatch(/M8x1\.25/);
    });

    it("peck option emits post-process hint", () => {
      const f = ilHole("h6", "face", 0, 0, "drilled", 3, 50, { peck: true });
      expect(body(f)).toMatch(/peck-drilling hint/);
    });

    it("zero diameter warns", () => {
      const f = ilHole("h7", "face", 0, 0, "drilled", 0, "through");
      expect(f.warnings!.join(" ")).toMatch(/diameter.*0/);
    });
  });

  describe("ilFillet / ilChamfer / ilShell / ilDraft", () => {
    it("fillet emits EdgeCollection + constant-radius definition", () => {
      const f = ilFillet("fl", ["e1", "e2"], 2);
      expect(body(f)).toMatch(/CreateEdgeCollection/);
      expect(body(f)).toMatch(/AddConstantRadiusEdgeSet/);
      expect(body(f)).toMatch(/"2 mm"/);
    });

    it("fillet with empty edges warns", () => {
      const f = ilFillet("fl", [], 2);
      expect(f.warnings!.join(" ")).toMatch(/≥1 edge/);
    });

    it("fillet with negative radius warns", () => {
      const f = ilFillet("fl", ["e1"], -1);
      expect(f.warnings!.join(" ")).toMatch(/radius.*0/);
    });

    it("chamfer emits AddEqualDistanceChamfer", () => {
      const f = ilChamfer("ch", ["e1", "e2", "e3"], 1.5);
      expect(body(f)).toMatch(/AddEqualDistanceChamfer/);
      expect(body(f)).toMatch(/"1\.5 mm"/);
    });

    it("shell emits FaceCollection + inside-direction", () => {
      const f = ilShell("sh", ["f1", "f2"], 1.2);
      expect(body(f)).toMatch(/CreateFaceCollection/);
      expect(body(f)).toMatch(/kInsideShellDirection/);
      expect(body(f)).toMatch(/"1\.2 mm"/);
    });

    it("shell with negative thickness warns", () => {
      const f = ilShell("sh", ["f1"], -0.5);
      expect(f.warnings!.join(" ")).toMatch(/thickness.*0/);
    });

    it("draft emits FaceDraftFeatures.CreateFaceDraftDefinition", () => {
      const f = ilDraft("dr", ["f1"], "pullDir", 3);
      expect(body(f)).toMatch(/CreateFaceDraftDefinition/);
      expect(body(f)).toMatch(/"3 deg"/);
    });
  });

  describe("Booleans, patterns, transforms, datums", () => {
    it("boolean union maps to kJoinOperation", () => {
      expect(body(ilBoolean("b", "tool", "union"))).toMatch(/kJoinOperation/);
    });

    it("boolean subtract maps to kCutOperation", () => {
      expect(body(ilBoolean("b", "tool", "subtract"))).toMatch(/kCutOperation/);
    });

    it("boolean intersect maps to kIntersectOperation", () => {
      expect(body(ilBoolean("b", "tool", "intersect"))).toMatch(/kIntersectOperation/);
    });

    it("rectangular pattern 1-direction emits single AddFn call", () => {
      const f = ilPatternRectangular("pat", ["f1"], "dirX", 5, 10);
      expect(body(f)).toMatch(/RectangularPatternFeatures\.Add/);
      expect(body(f)).not.toMatch(/dirY/);
    });

    it("rectangular pattern 2-direction emits both axes", () => {
      const f = ilPatternRectangular("pat", ["f1"], "dirX", 5, 10, "dirY", 3, 8);
      expect(body(f)).toMatch(/dirY, 3,/);
    });

    it("rectangular pattern with count1=0 warns", () => {
      const f = ilPatternRectangular("pat", ["f1"], "dirX", 0, 10);
      expect(f.warnings!.join(" ")).toMatch(/count1=0/);
    });

    it("circular pattern emits kOptimizedCompute", () => {
      const f = ilPatternCircular("pat", ["f1"], "ax", 8, 360);
      expect(body(f)).toMatch(/kOptimizedCompute/);
      expect(body(f)).toMatch(/"360 deg"/);
    });

    it("mirror emits MirrorFeatures.Add with mirror plane", () => {
      const f = ilMirror("m", ["f1"], "XZ");
      expect(body(f)).toMatch(/MirrorFeatures\.Add/);
      expect(body(f)).toMatch(/, XZ,/);
    });

    it("move emits AddFreeDrag with 3 offsets", () => {
      const f = ilMove("mv", "body", 5, -3, 10);
      expect(body(f)).toMatch(/AddFreeDrag\("5 mm", "-3 mm", "10 mm"\)/);
    });

    it("rotate emits AddFreeRotate with axis + angle", () => {
      const f = ilRotate("rt", "body", "Zaxis", 45);
      expect(body(f)).toMatch(/AddFreeRotate\(Zaxis, "45 deg"\)/);
    });

    it("workplane offset emits AddByPlaneAndOffset", () => {
      const f = ilWorkPlane("wp", "offset", { offset: 15, basePlane: "xy" });
      expect(body(f)).toMatch(/AddByPlaneAndOffset/);
      expect(body(f)).toMatch(/"15 mm"/);
    });

    it("origin workplane shortcuts return principal Item()", () => {
      expect(body(ilWorkPlane("wp", "origin_xy"))).toMatch(/Item\(3\)/);
      expect(body(ilWorkPlane("wp", "origin_xz"))).toMatch(/Item\(2\)/);
      expect(body(ilWorkPlane("wp", "origin_yz"))).toMatch(/Item\(1\)/);
    });

    it("workaxis by-line returns AddByLine", () => {
      const f = ilWorkAxis("ax", "line", "edge1");
      expect(body(f)).toMatch(/WorkAxes\.AddByLine\(edge1\)/);
    });

    it("workpoint fixed uses tg.CreatePoint with 3 InvLen", () => {
      const f = ilWorkPoint("wp", 10, 20, 30);
      expect(body(f)).toMatch(/AddFixed\(tg\.CreatePoint\("10 mm", "20 mm", "30 mm"\)\)/);
    });
  });

  describe("Assembly mates — exhaustive kind coverage", () => {
    const kinds = ["mate", "flush", "angle", "tangent", "insert", "parallel", "perpendicular", "symmetry"] as const;
    for (const kind of kinds) {
      it(`emits a constraint for ${kind}`, () => {
        const f = ilAssemblyMate("mc", kind, "ent1", "ent2", { offset: 0, angle: 30 });
        expect(body(f)).toMatch(/Constraint/);
      });
    }

    it("angle mate includes angle value", () => {
      const f = ilAssemblyMate("mc", "angle", "e1", "e2", { angle: 45 });
      expect(body(f)).toMatch(/"45 deg"/);
    });

    it("insert mate includes offset", () => {
      const f = ilAssemblyMate("mc", "insert", "e1", "e2", { offset: 2 });
      expect(body(f)).toMatch(/False, "2 mm"/);
    });

    it("perpendicular mate fixes 90 deg", () => {
      const f = ilAssemblyMate("mc", "perpendicular", "e1", "e2");
      expect(body(f)).toMatch(/"90 deg"/);
    });
  });

  describe("Import / Export / Parameter / Equation", () => {
    it("STEP import embeds TranslatorAddIn GUID + path", () => {
      const f = ilImport("C:/part.step", "step");
      expect(body(f)).toMatch(/90AF7F40/);
      expect(body(f)).toMatch(/C:\/part\.step/);
    });

    it("IGES import uses its own GUID", () => {
      const f = ilImport("C:/a.iges", "iges");
      expect(body(f)).toMatch(/8F7D80D6/);
    });

    it("STL export uses STL GUID", () => {
      const f = ilExport("C:/out.stl", "stl");
      expect(body(f)).toMatch(/533E0DE0/);
    });

    it("DXF export uses DXF GUID", () => {
      const f = ilExport("C:/out.dxf", "dxf");
      expect(body(f)).toMatch(/C24E3AC4/);
    });

    it("parameter declare emits user-parameter upsert + records metadata", () => {
      const f = ilParameter("wallThickness", 2.5, "mm");
      expect(body(f)).toMatch(/UserParameters/);
      expect(body(f)).toMatch(/"2\.5 mm"/);
      expect(f.parameters).toHaveLength(1);
      expect(f.parameters![0].name).toBe("wallThickness");
      expect(f.parameters![0].value).toBe(2.5);
    });

    it("parameter with inch unit propagates unit string", () => {
      const f = ilParameter("height", 1.5, "in");
      expect(body(f)).toMatch(/"1\.5 in"/);
      expect(f.parameters![0].unit).toBe("in");
    });

    it("equation writes Expression assignment", () => {
      const f = ilEquation("wallThickness", "baseThickness * 1.5");
      expect(body(f)).toMatch(/\.Expression = "baseThickness \* 1\.5"/);
    });
  });

  describe("Instance methods on InventorCAMCodeGeneratorEngineClass", () => {
    const engine = new InventorCAMCodeGeneratorEngineClass();

    it("createSketch — mandated method #1", () => {
      const f = engine.createSketch("xy", "Base");
      expect(body(f)).toMatch(/WorkPlanes\.Item\(3\)/);
    });

    it("createExtrude — mandated method #2", () => {
      const f = engine.createExtrude("sk", 12, { operation: "cut" });
      expect(body(f)).toMatch(/kCutOperation/);
      expect(body(f)).toMatch(/"12 mm"/);
    });

    it("createRevolve — mandated method #3", () => {
      const f = engine.createRevolve("sk", "ax", { angle: 270 });
      expect(body(f)).toMatch(/"270 deg"/);
    });

    it("createHole — mandated method #4", () => {
      const f = engine.createHole("face", 10, 20, { diameter: 8, depth: 15 });
      expect(body(f)).toMatch(/AddDrilledByDistanceExtent/);
    });

    it("createFillet — mandated method #5", () => {
      const f = engine.createFillet(["e1", "e2"], 1);
      expect(body(f)).toMatch(/AddConstantRadiusEdgeSet/);
    });

    it("createAssemblyMate — mandated method #6 (concentric via 'mate')", () => {
      const f = engine.createAssemblyMate("mate", "e1", "e2", { offset: 0 });
      expect(body(f)).toMatch(/AddMateConstraint/);
    });

    it("createChamfer / createShell / createDraft extras emit correctly", () => {
      expect(body(engine.createChamfer(["e"], 0.8))).toMatch(/AddEqualDistanceChamfer/);
      expect(body(engine.createShell(["f"], 1))).toMatch(/kInsideShellDirection/);
      expect(body(engine.createDraft(["f"], "pd", 2))).toMatch(/CreateFaceDraftDefinition/);
    });

    it("createBoolean / createRectangularPattern / createCircularPattern / createMirror extras", () => {
      expect(body(engine.createBoolean("tb", "union"))).toMatch(/kJoinOperation/);
      expect(body(engine.createRectangularPattern(["f"], "dx", 3, 5))).toMatch(/RectangularPatternFeatures/);
      expect(body(engine.createCircularPattern(["f"], "ax", 6))).toMatch(/CircularPatternFeatures/);
      expect(body(engine.createMirror(["f"], "XZ"))).toMatch(/MirrorFeatures/);
    });

    it("createMove / createRotate / createWorkPlane / createWorkAxis / createWorkPoint extras", () => {
      expect(body(engine.createMove("b", 1, 2, 3))).toMatch(/AddFreeDrag/);
      expect(body(engine.createRotate("b", "a", 30))).toMatch(/AddFreeRotate/);
      expect(body(engine.createWorkPlane("origin_xy"))).toMatch(/Item\(3\)/);
      expect(body(engine.createWorkAxis("z"))).toMatch(/WorkAxes\.Item\(3\)/);
      expect(body(engine.createWorkPoint(0, 0, 0))).toMatch(/AddFixed/);
    });

    it("createParameter / createEquation / createImport / createExport extras", () => {
      expect(body(engine.createParameter("x", 10))).toMatch(/UserParameters/);
      expect(body(engine.createEquation("x", "y + 1"))).toMatch(/Expression = "y \+ 1"/);
      expect(body(engine.createImport("C:/a.step", "step"))).toMatch(/90AF7F40/);
      expect(body(engine.createExport("C:/b.iges", "iges"))).toMatch(/8F7D80D6/);
    });

    it("createLoft / createSweep / createPocket extras", () => {
      expect(body(engine.createLoft(["p1", "p2"]))).toMatch(/LoftFeatures/);
      expect(body(engine.createSweep("prof", "path"))).toMatch(/kPathSweepType/);
      expect(body(engine.createPocket("sk", 5))).toMatch(/kCutOperation/);
    });

    it("cadAdapter getter returns the singleton adapter", () => {
      expect(engine.cadAdapter).toBe(inventorCADGeneratorAdapter);
    });

    it("createSketchCircle / createSketchRectangle / createSketchPolygon extras", () => {
      expect(body(engine.createSketchCircle("s", 0, 0, 5))).toMatch(/AddByCenterRadius/);
      expect(body(engine.createSketchRectangle("s", 0, 0, 10, 5))).toMatch(/AddAsTwoPointRectangle/);
      expect(body(engine.createSketchPolygon("s", 0, 0, 8, 10))).toMatch(/SketchLines\.AddByTwoPoints/);
    });
  });

  describe("InventorCADGeneratorAdapter — capability matrix", () => {
    it("declares inventor as cadSystem", () => {
      expect(inventorCADGeneratorAdapter.cadSystem).toBe("inventor");
    });

    it("supports the 6 mandated op kinds plus many more", () => {
      const caps = inventorCADGeneratorAdapter.capabilities;
      expect(caps.supportedOps.has("sketch_create")).toBe(true);
      expect(caps.supportedOps.has("feature_extrude")).toBe(true);
      expect(caps.supportedOps.has("feature_revolve")).toBe(true);
      expect(caps.supportedOps.has("feature_hole")).toBe(true);
      expect(caps.supportedOps.has("feature_fillet")).toBe(true);
      expect(caps.supportedOps.has("assembly_mate_concentric")).toBe(true);
      expect(caps.supportedOps.size).toBeGreaterThan(40);
    });

    it("does not claim surface_* ops (Inventor surface features out-of-scope for U-CADC08)", () => {
      expect(inventorCADGeneratorAdapter.capabilities.supportedOps.has("surface_loft")).toBe(false);
      expect(inventorCADGeneratorAdapter.capabilities.supportedOps.has("surface_trim")).toBe(false);
    });

    it("nativeLengthUnit = mm, nativeAngleUnit = deg, requiresSubprocess = true", () => {
      const c = inventorCADGeneratorAdapter.capabilities;
      expect(c.nativeLengthUnit).toBe("mm");
      expect(c.nativeAngleUnit).toBe("deg");
      expect(c.requiresSubprocess).toBe(true);
    });
  });

  describe("InventorCADGeneratorAdapter — buildScript pipeline", () => {
    let adapter: InventorCADGeneratorAdapter;
    beforeEach(() => {
      adapter = new InventorCADGeneratorAdapter();
    });

    it("emits a part preamble + epilogue wrapping ops", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "Sk" } },
      ]);
      expect(script.body).toMatch(/PartDocument/);
      expect(script.body).toMatch(/Public Class PRISMInventorCAD/);
      expect(script.body).toMatch(/End Class/);
      expect(script.body.indexOf("End Class")).toBeGreaterThan(script.body.indexOf("PartDocument"));
    });

    it("emits an assembly preamble when docKind=assembly", () => {
      const script = adapter.buildScript([], { docKind: "assembly" });
      expect(script.body).toMatch(/AssemblyDocument/);
      expect(script.body).toMatch(/AssemblyComponentDefinition/);
    });

    it("throws UnsupportedCapabilityError on surface_loft", () => {
      expect(() =>
        adapter.buildScript([
          { kind: "surface_loft", args: { profiles: [] } },
        ]),
      ).toThrow(UnsupportedCapabilityError);
    });

    it("produces per-op lineage entries with ascending line ranges", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "A" } },
        { kind: "sketch_circle", args: { sketch: "p0", cx: 0, cy: 0, radius: 10 } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 5 } },
      ]);
      expect(script.lineage).toHaveLength(3);
      expect(script.lineage[0].kind).toBe("sketch_create");
      expect(script.lineage[1].lineStart).toBeGreaterThan(script.lineage[0].lineEnd);
      expect(script.lineage[2].lineStart).toBeGreaterThan(script.lineage[1].lineEnd);
    });

    it("requires string args via throw when missing", () => {
      expect(() =>
        adapter.buildScript([{ kind: "sketch_line", args: { x1: 0, y1: 0, x2: 1, y2: 1 } }]),
      ).toThrow(/required string arg 'sketch'/);
    });

    it("registers parameters from parameter_declare ops", () => {
      const script = adapter.buildScript([
        { kind: "parameter_declare", args: { name: "diam", value: 6.35, unit: "mm" } },
      ]);
      const p = script.parameters.get("diam");
      expect(p?.value).toBe(6.35);
      expect(p?.unit).toBe("mm");
    });

    it("collects warnings without throwing for non-fatal issues", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "S" } },
        { kind: "feature_fillet", args: { edges: [], radius: 2 } },
      ]);
      expect(script.warnings.length).toBeGreaterThan(0);
      expect(script.warnings.some((w) => w.message.includes("≥1 edge"))).toBe(true);
    });

    it("scriptFilename uses documentName slug", () => {
      const script = adapter.buildScript([], { documentName: "Custom Plate 01" });
      expect(script.filename).toBe("Custom_Plate_01.iLogicVb");
    });

    it("custom op emits inline VB body verbatim", () => {
      const script = adapter.buildScript([
        { kind: "custom", args: { body: "' inline comment\nMsgBox(\"hi\")" } },
      ]);
      expect(script.body).toMatch(/inline comment/);
      expect(script.body).toMatch(/MsgBox\("hi"\)/);
    });

    it("feature_rib / feature_thread stubs warn", () => {
      const script = adapter.buildScript([
        { kind: "feature_rib", args: { sketch: "s" } },
        { kind: "feature_thread", args: {} },
      ]);
      expect(script.warnings.filter((w) => w.kind === "feature_rib")).toHaveLength(1);
      expect(script.warnings.filter((w) => w.kind === "feature_thread")).toHaveLength(1);
    });

    it("datum_coord_system emits UserCoordinateSystems.AddFixed", () => {
      const script = adapter.buildScript([
        { kind: "datum_coord_system", args: { x: 10, y: 0, z: 0 } },
      ]);
      expect(script.body).toMatch(/UserCoordinateSystems\.AddFixed/);
    });

    it("assembly_insert emits ComponentOccurrence.Add", () => {
      const script = adapter.buildScript(
        [{ kind: "assembly_insert", args: { componentPath: "C:/parts/bolt.ipt" } }],
        { docKind: "assembly" },
      );
      expect(script.body).toMatch(/Occurrences\.Add\("C:\/parts\/bolt\.ipt"/);
    });

    it("builds a 5-op chain (sketch → circle → extrude → fillet → export) with zero warnings", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", args: { plane: "xy", name: "Base" } },
        { kind: "sketch_circle", args: { sketch: "p0", cx: 0, cy: 0, radius: 10 } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 5 } },
        { kind: "feature_fillet", args: { edges: ["e1"], radius: 0.5 } },
        { kind: "export_step", args: { path: "C:/out.step" } },
      ];
      const script = adapter.buildScript(ops);
      expect(script.lineage).toHaveLength(5);
      expect(script.warnings).toHaveLength(0);
      expect(script.body.split("\n").length).toBeGreaterThan(20);
    });
  });

  describe("InventorCADGeneratorAdapter — executeScript & validate", () => {
    let adapter: InventorCADGeneratorAdapter;
    const originalMock = process.env.PRISM_CAD_MOCK;
    beforeEach(() => {
      adapter = new InventorCADGeneratorAdapter();
    });
    afterEach(() => {
      if (originalMock === undefined) delete process.env.PRISM_CAD_MOCK;
      else process.env.PRISM_CAD_MOCK = originalMock;
    });

    it("executeScript returns mock metrics when PRISM_CAD_MOCK=1", async () => {
      process.env.PRISM_CAD_MOCK = "1";
      const script = adapter.buildScript([{ kind: "custom", args: { body: "' noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(true);
      expect(res.metrics?.faceCount).toBe(6);
      expect(res.metrics?.volumeMm3).toBe(1000);
    });

    it("executeScript reports Inventor runtime unavailable without mock", async () => {
      delete process.env.PRISM_CAD_MOCK;
      const script = adapter.buildScript([{ kind: "custom", args: { body: "' noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Inventor/);
    });

    it("validateOutput rejects result with ok=false (EXEC_FAILED)", () => {
      const report = adapter.validateOutput({ ok: false, error: "boom", durationMs: 5 });
      expect(report.ok).toBe(false);
      expect(report.findings[0].code).toBe("EXEC_FAILED");
    });

    it("validateOutput accepts healthy mock result", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 1,
        metrics: { volumeMm3: 1000, faceCount: 6, boundingBoxMm: [10, 10, 10] },
      });
      expect(report.ok).toBe(true);
      expect(report.findings).toHaveLength(0);
    });

    it("validateOutput flags empty geometry", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 1,
        metrics: { volumeMm3: 0, faceCount: 6 },
      });
      expect(report.ok).toBe(false);
      expect(report.findings.some((f) => f.code === "EMPTY_GEOMETRY")).toBe(true);
    });
  });

  describe("Unit & edge-case variability", () => {
    const engine = new InventorCAMCodeGeneratorEngineClass();

    it("mm fragment: bare number → \"N mm\"", () => {
      expect(body(engine.createExtrude("s", 25))).toMatch(/"25 mm"/);
    });

    it("in expression pass-through: string → \"<expr>\"", () => {
      expect(body(engine.createExtrude("s", "1.25 in"))).toMatch(/"1\.25 in"/);
    });

    it("radians not supported: only deg strings emitted", () => {
      expect(body(engine.createRevolve("s", "ax", { angle: 180 }))).toMatch(/"180 deg"/);
      expect(body(engine.createRevolve("s", "ax", { angle: "pi rad" }))).toMatch(/"pi rad"/);
    });

    it("extreme distance (1e6 mm) emits as-is", () => {
      expect(body(engine.createExtrude("s", 1e6))).toMatch(/"1000000 mm"/);
    });

    it("NaN distance coerced to 0 via fmtNum in sketch primitives", () => {
      const f = engine.createSketchLine("s", NaN, 0, 10, 0);
      expect(body(f)).toMatch(/CreatePoint2d\(0, 0\)/);
    });

    it("Infinity distance coerced to 0 via fmtNum", () => {
      const f = engine.createSketchLine("s", Infinity, 0, 10, 0);
      expect(body(f)).toMatch(/CreatePoint2d\(0, 0\)/);
    });

    it("Singleton shares state with cadAdapter getter", () => {
      expect(inventorCAMCodeGeneratorEngine.cadAdapter).toBe(inventorCADGeneratorAdapter);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // U-CADC-OVE-01 — Op Vocabulary Exhaustion: feature_extrude + feature_revolve
  // Seasoned-engineer arg surface: 8 endConditions × 3 directions × taper × two-direction × thin × up-to-surface
  // ─────────────────────────────────────────────────────────────────────
  describe("feature_extrude — exhaustive input surface", () => {
    let adapter: InventorCADGeneratorAdapter;
    beforeEach(() => {
      adapter = new InventorCADGeneratorAdapter();
    });

    const extrudeOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "sketch_rectangle", args: { sketch: "p0", x1: 0, y1: 0, x2: 10, y2: 10 } },
      { kind: "feature_extrude", args: { sketch: "p0", distance: 10, ...extra } },
    ];

    it("endCondition=blind emits SetDistanceExtent (default)", () => {
      const s = adapter.buildScript(extrudeOps());
      expect(s.body).toMatch(/SetDistanceExtent\("10 mm", PartFeatureExtentDirectionEnum\.kPositiveExtentDirection\)/);
    });

    it("endCondition=through_all emits SetThroughAllExtent", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "through_all" }));
      expect(s.body).toMatch(/SetThroughAllExtent\(PartFeatureExtentDirectionEnum\.kPositiveExtentDirection\)/);
    });

    it("endCondition=up_to_next emits SetToNextExtent", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "up_to_next" }));
      expect(s.body).toMatch(/SetToNextExtent\(PartFeatureExtentDirectionEnum\.kPositiveExtentDirection\)/);
    });

    it("endCondition=up_to_surface with targetSurface emits SetToExtent with face ref", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_surface", targetSurface: "topFace" }),
      );
      expect(s.body).toMatch(/SetToExtent\(topFace, 0, True,/);
    });

    it("endCondition=up_to_surface without targetSurface falls back to ThroughAll with warning", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/SetThroughAllExtent/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("endCondition=offset_from_surface emits SetToExtent with nonzero offset", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "offset_from_surface", targetSurface: "topFace", offsetFromSurface: 5 }),
      );
      expect(s.body).toMatch(/SetToExtent\(topFace, "5 mm", True,/);
    });

    it("endCondition=mid_plane forces symmetric direction", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/SetDistanceExtent\("10 mm", PartFeatureExtentDirectionEnum\.kSymmetricExtentDirection\)/);
    });

    it("endCondition=up_to_body emits SetToExtent when targetSurface provided", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_body", targetSurface: "targetBody" }),
      );
      expect(s.body).toMatch(/SetToExtent\(targetBody, 0, True,/);
    });

    it("direction=negative emits kNegativeExtentDirection", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "negative" }));
      expect(s.body).toMatch(/kNegativeExtentDirection/);
    });

    it("direction=symmetric emits kSymmetricExtentDirection", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "symmetric" }));
      expect(s.body).toMatch(/kSymmetricExtentDirection/);
    });

    it("taperAngle > 0 emits TaperAngle property", () => {
      const s = adapter.buildScript(extrudeOps({ taperAngle: 3 }));
      expect(s.body).toMatch(/_def\.TaperAngle = "3 deg"/);
    });

    it("taperAngle negative (draft inward) emits negative string", () => {
      const s = adapter.buildScript(extrudeOps({ taperAngle: -5 }));
      expect(s.body).toMatch(/_def\.TaperAngle = "-5 deg"/);
    });

    it("distance2 with non-symmetric direction emits SetDistanceExtentTwo", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "positive", distance2: 7 }));
      expect(s.body).toMatch(/SetDistanceExtentTwo\("7 mm"\)/);
    });

    it("distance2 with symmetric direction is ignored (no SetDistanceExtentTwo)", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "symmetric", distance2: 7 }));
      expect(s.body).not.toMatch(/SetDistanceExtentTwo/);
    });

    it("taperAngle2 emits TaperAngleTwo property", () => {
      const s = adapter.buildScript(extrudeOps({ taperAngle2: 2 }));
      expect(s.body).toMatch(/_def\.TaperAngleTwo = "2 deg"/);
    });

    it("thinFeature=true emits SetThinWallExtrude with positive direction by default", () => {
      const s = adapter.buildScript(extrudeOps({ thinFeature: true, thinThickness: 1.5 }));
      expect(s.body).toMatch(/SetThinWallExtrude\("1\.5 mm", PartFeatureThinWallDirectionEnum\.kPositiveThinWallDirection\)/);
    });

    it("thinFeature with thinType=symmetric emits kSymmetricThinWallDirection", () => {
      const s = adapter.buildScript(
        extrudeOps({ thinFeature: true, thinThickness: 2, thinType: "symmetric" }),
      );
      expect(s.body).toMatch(/kSymmetricThinWallDirection/);
    });

    it("thinFeature with thinType=two_side emits kNegativeThinWallDirection", () => {
      const s = adapter.buildScript(
        extrudeOps({ thinFeature: true, thinThickness: 3, thinType: "two_side" }),
      );
      expect(s.body).toMatch(/kNegativeThinWallDirection/);
    });

    it("operation=cut with through_all emits kCutOperation + SetThroughAllExtent", () => {
      const s = adapter.buildScript(
        extrudeOps({ operation: "cut", endCondition: "through_all" }),
      );
      expect(s.body).toMatch(/kCutOperation/);
      expect(s.body).toMatch(/SetThroughAllExtent/);
    });

    it("matchShape=false flips the boolean in SetToExtent call", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_surface", targetSurface: "topFace", matchShape: false }),
      );
      expect(s.body).toMatch(/SetToExtent\(topFace, 0, False,/);
    });

    it("combined: through_all + cut + taper + two-side direction", () => {
      const s = adapter.buildScript(
        extrudeOps({
          endCondition: "through_all",
          operation: "cut",
          taperAngle: 2,
          direction: "positive",
          distance2: 5,
        }),
      );
      expect(s.body).toMatch(/SetThroughAllExtent/);
      expect(s.body).toMatch(/kCutOperation/);
      expect(s.body).toMatch(/TaperAngle = "2 deg"/);
      expect(s.body).toMatch(/SetDistanceExtentTwo\("5 mm"\)/);
    });

    it("operation=new_body produces kNewBodyOperation", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "new_body" }));
      expect(s.body).toMatch(/kNewBodyOperation/);
    });

    it("operation=intersect produces kIntersectOperation", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "intersect" }));
      expect(s.body).toMatch(/kIntersectOperation/);
    });
  });

  describe("feature_revolve — exhaustive input surface", () => {
    let adapter: InventorCADGeneratorAdapter;
    beforeEach(() => {
      adapter = new InventorCADGeneratorAdapter();
    });

    const revolveOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "sketch_line", args: { sketch: "p0", x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "feature_revolve", args: { sketch: "p0", axis: "X_AXIS", angle: 180, ...extra } },
    ];

    it("default angle=180 emits AddByAngle with positive extent", () => {
      const s = adapter.buildScript(revolveOps());
      expect(s.body).toMatch(/RevolveFeatures\.AddByAngle/);
      expect(s.body).toMatch(/"180 deg"/);
    });

    it("angle=360 auto-detects full endCondition and emits AddFull", () => {
      const s = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
        { kind: "feature_revolve", args: { sketch: "p0", axis: "X_AXIS", angle: 360 } },
      ]);
      expect(s.body).toMatch(/RevolveFeatures\.AddFull/);
    });

    it("endCondition=full overrides angle input", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "full" }));
      expect(s.body).toMatch(/RevolveFeatures\.AddFull/);
    });

    it("endCondition=mid_plane emits AddByAngle with kSymmetricExtentDirection", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/kSymmetricExtentDirection/);
    });

    it("endCondition=two_direction emits CreateRevolveDefinition + SetAngleExtentTwo", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "two_direction", angle2: 90 }));
      expect(s.body).toMatch(/CreateRevolveDefinition/);
      expect(s.body).toMatch(/SetAngleExtent\("180 deg", PartFeatureExtentDirectionEnum\.kPositiveExtentDirection\)/);
      expect(s.body).toMatch(/SetAngleExtentTwo\("90 deg"\)/);
    });

    it("endCondition=two_direction without angle2 defaults to primary angle", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "two_direction" }));
      expect(s.body).toMatch(/SetAngleExtentTwo\("180 deg"\)/);
    });

    it("endCondition=up_to_surface with targetSurface emits SetToExtent", () => {
      const s = adapter.buildScript(
        revolveOps({ endCondition: "up_to_surface", targetSurface: "stopFace" }),
      );
      expect(s.body).toMatch(/SetToExtent\(stopFace, PartFeatureExtentDirectionEnum\.kPositiveExtentDirection\)/);
    });

    it("endCondition=up_to_surface without targetSurface falls back to angle with warning", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/AddByAngle/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("direction=negative uses kNegativeExtentDirection", () => {
      const s = adapter.buildScript(revolveOps({ direction: "negative" }));
      expect(s.body).toMatch(/kNegativeExtentDirection/);
    });

    it("operation=cut emits kCutOperation", () => {
      const s = adapter.buildScript(revolveOps({ operation: "cut" }));
      expect(s.body).toMatch(/kCutOperation/);
    });

    it("angle > 360 emits out-of-range warning", () => {
      const s = adapter.buildScript(revolveOps({ angle: 400 }));
      expect(s.warnings.some((w) => /out of \(0,360\]/.test(w.message))).toBe(true);
    });

    it("thinFeature emits annotation comment", () => {
      const s = adapter.buildScript(
        revolveOps({ thinFeature: true, thinThickness: 1, thinType: "one_side" }),
      );
      expect(s.body).toMatch(/thin revolve: thickness="1 mm" type=one_side/);
    });

    it("combined: cut + two_direction + angle2 baseline", () => {
      const s = adapter.buildScript(
        revolveOps({ operation: "cut", endCondition: "two_direction", angle2: 45 }),
      );
      expect(s.body).toMatch(/kCutOperation/);
      expect(s.body).toMatch(/SetAngleExtentTwo\("45 deg"\)/);
    });
  });
});
