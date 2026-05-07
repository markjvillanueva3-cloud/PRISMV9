/**
 * MastercamCADGeneratorAdapter.test.ts — U-CADC77 (PHASE-12 Mastercam Integration)
 *
 * Exhaustive coverage of the ICADCodeGenerator adapter that emits Mastercam
 * NetHook C# code (Mastercam.App / Mastercam.Curves / Mastercam.Database /
 * Mastercam.Solids). Covers preamble/epilogue, every supportedOp, the 4
 * extrude-operation-enum mappings, 3 boolean mappings, pattern dimension
 * fan-out, wireframe rectangle decomposition, slot 2-line-2-arc construction,
 * and all edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MastercamCADGeneratorAdapter,
  mastercamCADGeneratorAdapter,
} from "../engines/MastercamCodeGeneratorEngine.js";
import { UnsupportedCapabilityError } from "../engines/UnifiedCADCodeGeneratorBase.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("MastercamCADGeneratorAdapter (U-CADC77)", () => {
  let adapter: MastercamCADGeneratorAdapter;

  beforeEach(() => {
    adapter = new MastercamCADGeneratorAdapter();
  });

  describe("capability matrix", () => {
    it("declares mastercam as cadSystem", () => {
      expect(adapter.cadSystem).toBe("mastercam");
    });

    it("native units mm + deg (Mastercam metric mode)", () => {
      expect(adapter.capabilities.nativeLengthUnit).toBe("mm");
      expect(adapter.capabilities.nativeAngleUnit).toBe("deg");
    });

    it("requires subprocess (compiled NetHook plug-in)", () => {
      expect(adapter.capabilities.requiresSubprocess).toBe(true);
    });

    it("supports >40 ops covering sketch + feature + boolean + pattern + assembly + import/export", () => {
      const ops = adapter.capabilities.supportedOps;
      expect(ops.size).toBeGreaterThan(40);
      expect(ops.has("sketch_create")).toBe(true);
      expect(ops.has("feature_extrude")).toBe(true);
      expect(ops.has("boolean_intersect")).toBe(true);
      expect(ops.has("pattern_linear")).toBe(true);
      expect(ops.has("export_step")).toBe(true);
    });

    it("does NOT claim surface ops or assembly mates (wireframe/solid-only scope)", () => {
      expect(adapter.capabilities.supportedOps.has("surface_loft")).toBe(false);
      expect(adapter.capabilities.supportedOps.has("assembly_mate_concentric")).toBe(false);
    });

    it("rejects surface_loft via UnsupportedCapabilityError", () => {
      expect(() =>
        adapter.buildScript([{ kind: "surface_loft", args: {} }]),
      ).toThrow(UnsupportedCapabilityError);
    });

    it("declares typical latency ≥1s (NetHook compile+load is slow)", () => {
      expect(adapter.capabilities.typicalLatencyMs).toBeGreaterThanOrEqual(1000);
    });

    it("declares reasonable limits", () => {
      expect(adapter.capabilities.limits?.maxLoftProfiles).toBeGreaterThanOrEqual(8);
      expect(adapter.capabilities.limits?.maxChainEntities).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("preamble + epilogue + filename", () => {
    it("preamble emits NetHook3App subclass scaffold", () => {
      const script = adapter.buildScript([]);
      expect(script.body).toContain("public class PRISMMastercamCAD : NetHook3App");
      expect(script.body).toContain("public override MCamReturn Run(int param)");
      expect(script.body).toContain("using Mastercam.Solids");
      expect(script.body).toContain("using Mastercam.Curves");
    });

    it("preamble includes documentName in comment when provided", () => {
      const script = adapter.buildScript([], { documentName: "BRACKET" });
      expect(script.body).toMatch(/\/\/ Document: BRACKET/);
    });

    it("preamble reports unitSystem and nethookVersion", () => {
      const script = adapter.buildScript([], { unitSystem: "english", nethookVersion: "2026" });
      expect(script.body).toMatch(/Units: english/);
      expect(script.body).toMatch(/NetHook API target: 2026/);
    });

    it("epilogue emits Regen + try/catch MCamReturn", () => {
      const script = adapter.buildScript([]);
      expect(script.body).toContain("DatabaseManager.Regen(true)");
      expect(script.body).toContain("return MCamReturn.NoErrors");
      expect(script.body).toContain("return MCamReturn.GeneralError");
    });

    it("scriptFilename slugs documentName and uses .cs extension", () => {
      const script = adapter.buildScript([], { documentName: "Custom Plate 01" });
      expect(script.filename).toBe("Custom_Plate_01.cs");
    });

    it("default filename without documentName", () => {
      expect(adapter.buildScript([]).filename).toBe("prism_mastercam_cad.cs");
    });
  });

  describe("sketch_create plane mapping", () => {
    it("xy → Top", () => {
      const script = adapter.buildScript([{ kind: "sketch_create", args: { plane: "xy" } }]);
      expect(script.body).toContain("GraphicsViewType.Top");
    });

    it("xz → Front", () => {
      const script = adapter.buildScript([{ kind: "sketch_create", args: { plane: "xz" } }]);
      expect(script.body).toContain("GraphicsViewType.Front");
    });

    it("yz → Right", () => {
      const script = adapter.buildScript([{ kind: "sketch_create", args: { plane: "yz" } }]);
      expect(script.body).toContain("GraphicsViewType.Right");
    });

    it("unknown plane → Iso fallback", () => {
      const script = adapter.buildScript([{ kind: "sketch_create", args: { plane: "oblique" } }]);
      expect(script.body).toContain("GraphicsViewType.Iso");
    });

    it("stores named sketch handle", () => {
      const script = adapter.buildScript([{ kind: "sketch_create", args: { plane: "xy", name: "Base" } }]);
      expect(script.body).toMatch(/string p\d+ = "Base"/);
    });
  });

  describe("sketch primitives", () => {
    it("sketch_line emits LineGeometry.Commit()", () => {
      const script = adapter.buildScript([
        { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 25, y2: 50 } },
      ]);
      expect(script.body).toMatch(
        /LineGeometry p\d+ = new LineGeometry\(new Point3D\(0, 0, 0\), new Point3D\(25, 50, 0\)\);/,
      );
      expect(script.body).toMatch(/\.Commit\(\);/);
    });

    it("sketch_arc emits ArcGeometry with radius + startAngle + sweep=end-start", () => {
      const script = adapter.buildScript([
        { kind: "sketch_arc", args: { cx: 0, cy: 0, radius: 10, startDeg: 30, endDeg: 120 } },
      ]);
      expect(script.body).toMatch(/new ArcGeometry\(new Point3D\(0, 0, 0\), 10, 30, 90/);
    });

    it("sketch_arc with zero radius warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_arc", args: { cx: 0, cy: 0, radius: 0, startDeg: 0, endDeg: 90 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("radius ≤ 0"))).toBe(true);
    });

    it("sketch_circle emits full-sweep ArcGeometry (0,360)", () => {
      const script = adapter.buildScript([
        { kind: "sketch_circle", args: { cx: 5, cy: 10, radius: 3 } },
      ]);
      expect(script.body).toMatch(/new ArcGeometry\(new Point3D\(5, 10, 0\), 3, 0, 360/);
    });

    it("sketch_circle with zero radius warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("radius ≤ 0"))).toBe(true);
    });

    it("sketch_rectangle decomposes into 4 LineGeometry.Commit() calls", () => {
      const script = adapter.buildScript([
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 40, height: 20 } },
      ]);
      const commits = script.body.match(/new LineGeometry\([^)]+,\s*[^)]+\)\.Commit\(\)/g);
      expect(commits?.length).toBe(4);
    });

    it("sketch_polygon emits C# for-loop with Math.Cos/Sin", () => {
      const script = adapter.buildScript([
        { kind: "sketch_polygon", args: { cx: 0, cy: 0, sides: 6, radius: 10 } },
      ]);
      expect(script.body).toMatch(/Point3D\[\] pts = new Point3D\[6\]/);
      expect(script.body).toMatch(/Math\.Cos/);
      expect(script.body).toMatch(/Math\.Sin/);
    });

    it("sketch_polygon with sides<3 warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_polygon", args: { cx: 0, cy: 0, sides: 2, radius: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("< 3"))).toBe(true);
    });

    it("sketch_spline emits SplineGeometry.CreateThroughPoints with N points", () => {
      const script = adapter.buildScript([
        { kind: "sketch_spline", args: { points: [0, 0, 10, 5, 20, 0, 30, 8] } },
      ]);
      expect(script.body).toMatch(/Point3D\[\] p\d+_pts = new Point3D\[4\]/);
      expect(script.body).toMatch(/CreateThroughPoints/);
    });

    it("sketch_spline with <2 points warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_spline", args: { points: [0, 0] } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥2 points"))).toBe(true);
    });

    it("sketch_ellipse emits EllipseGeometry with majorR = hypot(majorX, majorY)", () => {
      const script = adapter.buildScript([
        { kind: "sketch_ellipse", args: { cx: 0, cy: 0, majorX: 3, majorY: 4, minorRadius: 2 } },
      ]);
      // hypot(3,4)=5
      expect(script.body).toMatch(/EllipseGeometry p\d+ = new EllipseGeometry\(new Point3D\(0, 0, 0\), 5, 2/);
    });

    it("sketch_ellipse zero minor radius warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_ellipse", args: { cx: 0, cy: 0, majorX: 1, majorY: 0, minorRadius: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("minor radius ≤ 0"))).toBe(true);
    });

    it("sketch_slot emits 2 LineGeometry + 2 ArcGeometry", () => {
      const script = adapter.buildScript([
        { kind: "sketch_slot", args: { x1: 0, y1: 0, x2: 20, y2: 0, width: 4 } },
      ]);
      const lines = script.body.match(/new LineGeometry/g);
      const arcs = script.body.match(/new ArcGeometry/g);
      expect(lines?.length).toBe(2);
      expect(arcs?.length).toBe(2);
    });

    it("sketch_slot width=0 warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_slot", args: { x1: 0, y1: 0, x2: 10, y2: 0, width: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("width ≤ 0"))).toBe(true);
    });

    it("sketch_point emits PointGeometry.Commit()", () => {
      const script = adapter.buildScript([
        { kind: "sketch_point", args: { x: 7, y: -3 } },
      ]);
      expect(script.body).toMatch(
        /PointGeometry p\d+ = new PointGeometry\(new Point3D\(7, -3, 0\)\);/,
      );
    });

    it("sketch_constraint / dimension emit comment-only (Mastercam wireframe is non-parametric)", () => {
      const script = adapter.buildScript([
        { kind: "sketch_constraint", args: { type: "parallel" } },
        { kind: "sketch_dimension", args: { value: 10 } },
      ]);
      expect(script.body).toMatch(/\/\/ sketch_constraint/);
      expect(script.body).toMatch(/\/\/ sketch_dimension/);
    });
  });

  describe("feature emitters", () => {
    it("feature_extrude join → ExtrudeOperationType.Add", () => {
      const script = adapter.buildScript([
        { kind: "feature_extrude", args: { chain: "ch1", distance: 10, operation: "join" } },
      ]);
      expect(script.body).toContain("ExtrudeOperationType.Add");
    });

    it("feature_extrude cut → Remove", () => {
      const script = adapter.buildScript([
        { kind: "feature_extrude", args: { chain: "ch1", distance: 10, operation: "cut" } },
      ]);
      expect(script.body).toContain("ExtrudeOperationType.Remove");
    });

    it("feature_extrude intersect → Common", () => {
      const script = adapter.buildScript([
        { kind: "feature_extrude", args: { chain: "ch1", distance: 10, operation: "intersect" } },
      ]);
      expect(script.body).toContain("ExtrudeOperationType.Common");
    });

    it("feature_extrude default (no operation) → CreateBody", () => {
      const script = adapter.buildScript([
        { kind: "feature_extrude", args: { chain: "ch1", distance: 10 } },
      ]);
      expect(script.body).toContain("ExtrudeOperationType.CreateBody");
    });

    it("feature_extrude distance=0 warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_extrude", args: { chain: "ch1", distance: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("distance = 0"))).toBe(true);
    });

    it("feature_revolve embeds angleDegrees directly (no rad conversion)", () => {
      const script = adapter.buildScript([
        { kind: "feature_revolve", args: { chain: "ch1", axis: "ax", angle: 270 } },
      ]);
      expect(script.body).toMatch(/AngleDegrees = 270/);
    });

    it("feature_revolve 400° angle warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_revolve", args: { chain: "ch1", axis: "ax", angle: 400 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("out of (0,360]"))).toBe(true);
    });

    it("feature_loft builds List<Chain> and Loft.ToArray()", () => {
      const script = adapter.buildScript([
        { kind: "feature_loft", args: { chains: ["c1", "c2", "c3"] } },
      ]);
      const adds = script.body.match(/\.Add\(c\d\)/g);
      expect(adds?.length).toBe(3);
      expect(script.body).toContain("SolidManager.Loft");
    });

    it("feature_loft with <2 chains warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_loft", args: { chains: ["c1"] } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥2 chains"))).toBe(true);
    });

    it("feature_sweep calls SolidManager.Sweep(profile, path)", () => {
      const script = adapter.buildScript([
        { kind: "feature_sweep", args: { profile: "pr", path: "pt" } },
      ]);
      expect(script.body).toContain("SolidManager.Sweep(pr, pt)");
    });

    it("feature_hole through uses ThroughAll=true", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { x: 0, y: 0, diameter: 6, depth: "through" } },
      ]);
      expect(script.body).toMatch(/ThroughAll = true/);
    });

    it("feature_hole fixed depth uses ThroughAll=false", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { x: 0, y: 0, diameter: 6, depth: 20 } },
      ]);
      expect(script.body).toMatch(/ThroughAll = false/);
      expect(script.body).toMatch(/Depth = 20/);
    });

    it("feature_hole zero diameter warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { x: 0, y: 0, diameter: 0, depth: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("diameter ≤ 0"))).toBe(true);
    });

    it("feature_pocket emits negative-distance Remove extrude", () => {
      const script = adapter.buildScript([
        { kind: "feature_pocket", args: { chain: "ch", depth: 5 } },
      ]);
      expect(script.body).toMatch(/Distance = -5/);
      expect(script.body).toMatch(/ExtrudeOperationType\.Remove/);
    });

    it("feature_fillet emits FilletEdges with radius", () => {
      const script = adapter.buildScript([
        { kind: "feature_fillet", args: { edges: ["e1", "e2"], radius: 2 } },
      ]);
      expect(script.body).toContain("SolidManager.FilletEdges");
      expect(script.body).toMatch(/, 2\);/);
    });

    it("feature_fillet empty edges warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_fillet", args: { edges: [], radius: 2 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥1 edge"))).toBe(true);
    });

    it("feature_chamfer emits ChamferEdges with distance", () => {
      const script = adapter.buildScript([
        { kind: "feature_chamfer", args: { edges: ["e"], distance: 1.5 } },
      ]);
      expect(script.body).toContain("SolidManager.ChamferEdges");
      expect(script.body).toMatch(/, 1\.5\);/);
    });

    it("feature_shell emits ShellBody with face list + thickness", () => {
      const script = adapter.buildScript([
        { kind: "feature_shell", args: { faces: ["f"], thickness: 1.2 } },
      ]);
      expect(script.body).toContain("SolidManager.ShellBody");
      expect(script.body).toMatch(/, 1\.2\);/);
    });

    it("feature_shell zero thickness warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_shell", args: { faces: ["f"], thickness: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("thickness ≤ 0"))).toBe(true);
    });

    it("feature_draft emits SolidManager.Draft with pull direction + angle", () => {
      const script = adapter.buildScript([
        { kind: "feature_draft", args: { faces: ["f"], pullDirection: "pd", angle: 3 } },
      ]);
      expect(script.body).toMatch(/SolidManager\.Draft\(.*, pd, 3\);/);
    });
  });

  describe("booleans, patterns, transforms, datums", () => {
    it("boolean_union → SolidManager.BooleanAdd", () => {
      const script = adapter.buildScript([
        { kind: "boolean_union", args: { target: "t", tool: "x" } },
      ]);
      expect(script.body).toContain("SolidManager.BooleanAdd(t, x)");
    });

    it("boolean_subtract → BooleanSubtract", () => {
      const script = adapter.buildScript([
        { kind: "boolean_subtract", args: { target: "t", tool: "x" } },
      ]);
      expect(script.body).toContain("SolidManager.BooleanSubtract(t, x)");
    });

    it("boolean_intersect → BooleanIntersect", () => {
      const script = adapter.buildScript([
        { kind: "boolean_intersect", args: { target: "t", tool: "x" } },
      ]);
      expect(script.body).toContain("SolidManager.BooleanIntersect(t, x)");
    });

    it("pattern_linear 1D uses RectangularPattern with spacing", () => {
      const script = adapter.buildScript([
        { kind: "pattern_linear", args: { features: ["f1"], count1: 5, spacing1: 10 } },
      ]);
      expect(script.body).toContain("SolidManager.RectangularPattern");
    });

    it("pattern_linear 2D calls RectangularPattern again with Y direction", () => {
      const script = adapter.buildScript([
        {
          kind: "pattern_linear",
          args: { features: ["f1"], count1: 3, spacing1: 10, count2: 2, spacing2: 15 },
        },
      ]);
      expect(script.body).toMatch(/RectangularPattern\([^)]+PatternDirection\.Y/);
    });

    it("pattern_linear count1<1 warns", () => {
      const script = adapter.buildScript([
        { kind: "pattern_linear", args: { features: ["f"], count1: 0, spacing1: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("count1=0"))).toBe(true);
    });

    it("pattern_circular emits CircularPattern with axis + angle", () => {
      const script = adapter.buildScript([
        { kind: "pattern_circular", args: { features: ["f"], axis: "ax", count: 8, angle: 360 } },
      ]);
      expect(script.body).toContain("SolidManager.CircularPattern");
      expect(script.body).toMatch(/ax, 8, 360\);/);
    });

    it("pattern_circular count<1 warns", () => {
      const script = adapter.buildScript([
        { kind: "pattern_circular", args: { features: ["f"], axis: "ax", count: 0, angle: 360 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("count=0"))).toBe(true);
    });

    it("pattern_mirror emits SolidManager.Mirror", () => {
      const script = adapter.buildScript([
        { kind: "pattern_mirror", args: { features: ["f"], mirrorPlane: "plXZ" } },
      ]);
      expect(script.body).toMatch(/SolidManager\.Mirror\([^)]+, plXZ\);/);
    });

    it("transform_move emits DatabaseManager.Translate with Vector3D", () => {
      const script = adapter.buildScript([
        { kind: "transform_move", args: { body: "b", dx: 5, dy: -3, dz: 0 } },
      ]);
      expect(script.body).toMatch(/Vector3D p\d+_delta = new Vector3D\(5, -3, 0\)/);
      expect(script.body).toMatch(/DatabaseManager\.Translate\(b,/);
    });

    it("transform_rotate emits DatabaseManager.Rotate(body, axis, angleDeg)", () => {
      const script = adapter.buildScript([
        { kind: "transform_rotate", args: { body: "b", axis: "ax", angle: 45 } },
      ]);
      expect(script.body).toMatch(/DatabaseManager\.Rotate\(b, ax, 45\)/);
    });

    it("datum_plane offset emits ConstructionPlane.Offset(base, offset)", () => {
      const script = adapter.buildScript([
        { kind: "datum_plane", args: { type: "offset", basePlane: "xy", offset: 15 } },
      ]);
      expect(script.body).toMatch(/ConstructionPlane\.Offset\([^,]*GraphicsViewType\.Top, 15\)/);
    });

    it("datum_plane origin_xz emits GraphicsViewType.Front", () => {
      const script = adapter.buildScript([
        { kind: "datum_plane", args: { type: "origin_xz" } },
      ]);
      expect(script.body).toMatch(/new ConstructionPlane\(GraphicsViewType\.Front\)/);
    });

    it("datum_axis z → Vector3D(0,0,1)", () => {
      const script = adapter.buildScript([{ kind: "datum_axis", args: { axis: "z" } }]);
      expect(script.body).toMatch(/new Vector3D\(0, 0, 1\)/);
    });

    it("datum_axis y → Vector3D(0,1,0)", () => {
      const script = adapter.buildScript([{ kind: "datum_axis", args: { axis: "y" } }]);
      expect(script.body).toMatch(/new Vector3D\(0, 1, 0\)/);
    });

    it("datum_point emits Point3D(x,y,z)", () => {
      const script = adapter.buildScript([
        { kind: "datum_point", args: { x: 5, y: 10, z: 15 } },
      ]);
      expect(script.body).toMatch(/Point3D p\d+ = new Point3D\(5, 10, 15\)/);
    });
  });

  describe("import / export / parameters / custom", () => {
    it("import_step emits FileManager.ImportFile with FileType.STEP", () => {
      const script = adapter.buildScript([
        { kind: "import_step", args: { path: "C:/in.step" } },
      ]);
      expect(script.body).toMatch(/FileManager\.ImportFile\("C:\/in\.step", FileType\.STEP\)/);
    });

    it("import_iges / import_stl use their own FileType enum values", () => {
      const iges = adapter.buildScript([{ kind: "import_iges", args: { path: "/a.igs" } }]);
      const stl = adapter.buildScript([{ kind: "import_stl", args: { path: "/b.stl" } }]);
      expect(iges.body).toContain("FileType.IGES");
      expect(stl.body).toContain("FileType.STL");
    });

    it("export_dxf routes through FileManager.ExportFile + FileType.DXF", () => {
      const script = adapter.buildScript([
        { kind: "export_dxf", args: { path: "/c.dxf" } },
      ]);
      expect(script.body).toContain("FileType.DXF");
      expect(script.body).toContain("ExportFile");
    });

    it("parameter_declare emits C# local + records metadata", () => {
      const script = adapter.buildScript([
        { kind: "parameter_declare", args: { name: "wall", value: 2.5, unit: "mm" } },
      ]);
      expect(script.body).toMatch(/double wall = 2\.5;/);
      expect(script.parameters.get("wall")?.value).toBe(2.5);
      expect(script.parameters.get("wall")?.unit).toBe("mm");
    });

    it("parameter_equation emits C# assignment", () => {
      const script = adapter.buildScript([
        { kind: "parameter_equation", args: { name: "outer", expression: "wall * 2" } },
      ]);
      expect(script.body).toMatch(/double outer = wall \* 2;/);
    });

    it("custom op emits raw C# verbatim", () => {
      const script = adapter.buildScript([
        { kind: "custom", args: { body: "// inline\nConsole.WriteLine(\"hi\");" } },
      ]);
      expect(script.body).toContain("// inline");
      expect(script.body).toContain("Console.WriteLine");
    });
  });

  describe("pipeline behavior — lineage, warnings, required args", () => {
    it("builds a 5-op happy path with no warnings", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", args: { plane: "xy", name: "Base" } },
        { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 10 } },
        { kind: "feature_extrude", args: { chain: "ch1", distance: 5 } },
        { kind: "feature_fillet", args: { edges: ["e1"], radius: 0.5 } },
        { kind: "export_step", args: { path: "/tmp/out.step" } },
      ];
      const script = adapter.buildScript(ops);
      expect(script.lineage).toHaveLength(5);
      expect(script.warnings).toHaveLength(0);
    });

    it("lineage strictly ordered (each lineStart > previous lineEnd)", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 40, height: 20 } },
        { kind: "feature_extrude", args: { chain: "ch", distance: 10 } },
      ]);
      for (let i = 1; i < script.lineage.length; i++) {
        expect(script.lineage[i].lineStart).toBeGreaterThan(script.lineage[i - 1].lineEnd);
      }
    });

    it("missing required chain arg throws", () => {
      expect(() =>
        adapter.buildScript([{ kind: "feature_extrude", args: { distance: 10 } }]),
      ).toThrow(/op 'feature_extrude' missing required string arg 'chain'/);
    });

    it("missing required target/tool on boolean throws", () => {
      expect(() =>
        adapter.buildScript([{ kind: "boolean_subtract", args: {} }]),
      ).toThrow(/missing required string arg/);
    });

    it("imports include Mastercam.Solids and Mastercam.Curves", () => {
      const script = adapter.buildScript([]);
      expect(script.imports).toContain("Mastercam.Solids");
      expect(script.imports).toContain("Mastercam.Curves");
    });

    it("warnings keep op context (kind + opIndex)", () => {
      const script = adapter.buildScript([
        { kind: "feature_fillet", args: { edges: [], radius: 1 } },
      ]);
      expect(script.warnings[0].kind).toBe("feature_fillet");
      expect(script.warnings[0].opIndex).toBe(0);
    });
  });

  describe("executeScript + validateOutput", () => {
    const originalMock = process.env.PRISM_CAD_MOCK;
    afterEach(() => {
      if (originalMock === undefined) delete process.env.PRISM_CAD_MOCK;
      else process.env.PRISM_CAD_MOCK = originalMock;
    });

    it("executeScript returns healthy mock metrics under PRISM_CAD_MOCK=1", async () => {
      process.env.PRISM_CAD_MOCK = "1";
      const script = adapter.buildScript([{ kind: "custom", args: { body: "// noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(true);
      expect(res.metrics?.faceCount).toBe(6);
    });

    it("executeScript reports Mastercam NetHook unavailable without mock", async () => {
      delete process.env.PRISM_CAD_MOCK;
      const script = adapter.buildScript([{ kind: "custom", args: { body: "// noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Mastercam NetHook/);
    });

    it("validateOutput rejects failed execution (EXEC_FAILED)", () => {
      const report = adapter.validateOutput({ ok: false, error: "x", durationMs: 0 });
      expect(report.findings[0].code).toBe("EXEC_FAILED");
    });

    it("validateOutput accepts healthy execution", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 5,
        metrics: { volumeMm3: 100, faceCount: 6, boundingBoxMm: [2, 2, 2] },
      });
      expect(report.ok).toBe(true);
    });

    it("validateOutput flags NEGATIVE_BBOX", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 1,
        metrics: { volumeMm3: 100, faceCount: 6, boundingBoxMm: [-5, 5, 5] },
      });
      expect(report.findings.some((f) => f.code === "NEGATIVE_BBOX")).toBe(true);
    });
  });

  describe("singleton identity", () => {
    it("singleton instance exported", () => {
      expect(mastercamCADGeneratorAdapter).toBeInstanceOf(MastercamCADGeneratorAdapter);
    });

    it("singleton cadSystem is mastercam", () => {
      expect(mastercamCADGeneratorAdapter.cadSystem).toBe("mastercam");
    });

    it("getCapabilities snapshot is independent (mutating snap doesn't leak)", () => {
      const snap = mastercamCADGeneratorAdapter.getCapabilities();
      (snap.supportedOps as Set<string>).add("surface_loft");
      expect(mastercamCADGeneratorAdapter.capabilities.supportedOps.has("surface_loft")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // U-CADC-OVE-01 — Op Vocabulary Exhaustion: feature_extrude + feature_revolve
  // Mastercam SolidExtrudeParams / SolidRevolveParams full option surface
  // ─────────────────────────────────────────────────────────────────────
  describe("feature_extrude — exhaustive input surface (Mastercam)", () => {
    const extrudeOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "top", name: "sk0" } },
      { kind: "sketch_rectangle", args: { sketch: "p0", x1: 0, y1: 0, x2: 10, y2: 10 } },
      { kind: "feature_extrude", args: { chain: "rect1", distance: 10, ...extra } },
    ];

    it("endCondition=blind emits EndConditionType.Blind", () => {
      const s = adapter.buildScript(extrudeOps());
      expect(s.body).toMatch(/\.EndCondition = SolidExtrudeParams\.EndConditionType\.Blind;/);
    });

    it("endCondition=through_all emits ThroughAll + EndConditionType.ThroughAll", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "through_all" }));
      expect(s.body).toMatch(/\.ThroughAll = true;/);
      expect(s.body).toMatch(/\.EndCondition = SolidExtrudeParams\.EndConditionType\.ThroughAll;/);
    });

    it("endCondition=up_to_next emits EndConditionType.UpToNext", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "up_to_next" }));
      expect(s.body).toMatch(/\.EndCondition = SolidExtrudeParams\.EndConditionType\.UpToNext;/);
    });

    it("endCondition=up_to_surface with targetSurface emits UpToSurface + TargetSurface assignment", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_surface", targetSurface: "topFace" }),
      );
      expect(s.body).toMatch(/\.EndCondition = SolidExtrudeParams\.EndConditionType\.UpToSurface;/);
      expect(s.body).toMatch(/\.TargetSurface = topFace;/);
    });

    it("endCondition=up_to_surface without targetSurface falls back to ThroughAll with warning", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/\.ThroughAll = true;/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("endCondition=offset_from_surface emits OffsetFromSurface + SurfaceOffset", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "offset_from_surface", targetSurface: "topFace", offsetFromSurface: 5 }),
      );
      expect(s.body).toMatch(/\.EndCondition = SolidExtrudeParams\.EndConditionType\.OffsetFromSurface;/);
      expect(s.body).toMatch(/\.SurfaceOffset = 5;/);
    });

    it("endCondition=mid_plane forces PropertyType.Symmetric", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/\.PropertyType = SolidExtrudeParams\.PropertyType\.Symmetric;/);
    });

    it("direction=two_direction emits PropertyType.BothDirections + Distance2", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "two_direction", distance2: 7 }));
      expect(s.body).toMatch(/\.PropertyType = SolidExtrudeParams\.PropertyType\.BothDirections;/);
      expect(s.body).toMatch(/\.Distance2 = 7;/);
    });

    it("direction=symmetric emits PropertyType.Symmetric", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "symmetric" }));
      expect(s.body).toMatch(/\.PropertyType = SolidExtrudeParams\.PropertyType\.Symmetric;/);
    });

    it("taperAngle emits TaperAngle + UseTaperAngle=true", () => {
      const s = adapter.buildScript(extrudeOps({ taperAngle: 3 }));
      expect(s.body).toMatch(/\.TaperAngle = 3;/);
      expect(s.body).toMatch(/\.UseTaperAngle = true;/);
    });

    it("taperAngle=0 does NOT emit TaperAngle assignment", () => {
      const s = adapter.buildScript(extrudeOps({ taperAngle: 0 }));
      expect(s.body).not.toMatch(/\.TaperAngle =/);
    });

    it("thinFeature=true emits ThinWall + ThinWallThickness", () => {
      const s = adapter.buildScript(extrudeOps({ thinFeature: true, thinThickness: 1.5 }));
      expect(s.body).toMatch(/\.ThinWall = true;/);
      expect(s.body).toMatch(/\.ThinWallThickness = 1\.5;/);
    });

    it("operation=cut emits ExtrudeOperationType.Remove", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "cut" }));
      expect(s.body).toMatch(/\.Operation = ExtrudeOperationType\.Remove;/);
    });

    it("operation=join emits ExtrudeOperationType.Add", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "join" }));
      expect(s.body).toMatch(/\.Operation = ExtrudeOperationType\.Add;/);
    });

    it("operation=intersect emits ExtrudeOperationType.Common", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "intersect" }));
      expect(s.body).toMatch(/\.Operation = ExtrudeOperationType\.Common;/);
    });

    it("operation=new_body emits ExtrudeOperationType.CreateBody", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "new_body" }));
      expect(s.body).toMatch(/\.Operation = ExtrudeOperationType\.CreateBody;/);
    });

    it("comment echoes endCondition + direction for provenance", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "mid_plane", direction: "symmetric", operation: "cut" }),
      );
      expect(s.body).toMatch(/\/\/ Extrude .* endCondition=mid_plane direction=symmetric/);
    });

    it("zero distance with blind endCondition emits warning", () => {
      const s = adapter.buildScript(extrudeOps({ distance: 0 }));
      expect(s.warnings.some((w) => /distance = 0/.test(w.message))).toBe(true);
    });

    it("combined: through_all + cut + taper + thin", () => {
      const s = adapter.buildScript(
        extrudeOps({
          endCondition: "through_all",
          operation: "cut",
          taperAngle: 2,
          thinFeature: true,
          thinThickness: 1,
        }),
      );
      expect(s.body).toMatch(/\.ThroughAll = true;/);
      expect(s.body).toMatch(/ExtrudeOperationType\.Remove/);
      expect(s.body).toMatch(/\.TaperAngle = 2;/);
      expect(s.body).toMatch(/\.ThinWall = true;/);
    });

    it("endCondition=up_to_body with targetSurface emits UpToSurface path", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_body", targetSurface: "targetBody" }),
      );
      expect(s.body).toMatch(/\.TargetSurface = targetBody;/);
    });
  });

  describe("feature_revolve — exhaustive input surface (Mastercam)", () => {
    const revolveOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "top", name: "sk0" } },
      { kind: "feature_revolve", args: { chain: "profile1", axis: "X_AXIS", angle: 180, ...extra } },
    ];

    it("default angle=180 emits Angle end-condition + AngleDegrees=180", () => {
      const s = adapter.buildScript(revolveOps());
      expect(s.body).toMatch(/\.AngleDegrees = 180;/);
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.Angle;/);
    });

    it("angle=360 auto-detects full endCondition", () => {
      const s = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "top", name: "sk0" } },
        { kind: "feature_revolve", args: { chain: "profile1", axis: "X_AXIS", angle: 360 } },
      ]);
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.Full;/);
      expect(s.body).toMatch(/\.AngleDegrees = 360;/);
    });

    it("endCondition=full explicit override with arbitrary angle still forces AngleDegrees=360", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "full" }));
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.Full;/);
      expect(s.body).toMatch(/\.AngleDegrees = 360;/);
    });

    it("endCondition=two_direction emits Angle + AngleDegrees2", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "two_direction", angle2: 90 }));
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.Angle;/);
      expect(s.body).toMatch(/\.AngleDegrees2 = 90;/);
    });

    it("endCondition=up_to_surface with targetSurface emits UpToSurface + TargetSurface", () => {
      const s = adapter.buildScript(
        revolveOps({ endCondition: "up_to_surface", targetSurface: "stopFace" }),
      );
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.UpToSurface;/);
      expect(s.body).toMatch(/\.TargetSurface = stopFace;/);
    });

    it("endCondition=up_to_surface without targetSurface falls back to Angle with warning", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/\.EndCondition = SolidRevolveParams\.EndConditionType\.Angle;/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("endCondition=mid_plane forces PropertyType.Symmetric", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/\.PropertyType = SolidRevolveParams\.PropertyType\.Symmetric;/);
    });

    it("direction=two_direction emits PropertyType.BothDirections", () => {
      const s = adapter.buildScript(revolveOps({ direction: "two_direction", angle2: 90 }));
      expect(s.body).toMatch(/\.PropertyType = SolidRevolveParams\.PropertyType\.BothDirections;/);
    });

    it("direction=symmetric emits PropertyType.Symmetric", () => {
      const s = adapter.buildScript(revolveOps({ direction: "symmetric" }));
      expect(s.body).toMatch(/\.PropertyType = SolidRevolveParams\.PropertyType\.Symmetric;/);
    });

    it("operation=cut emits RevolveOperationType.Remove", () => {
      const s = adapter.buildScript(revolveOps({ operation: "cut" }));
      expect(s.body).toMatch(/\.Operation = RevolveOperationType\.Remove;/);
    });

    it("operation=new_body emits RevolveOperationType.CreateBody", () => {
      const s = adapter.buildScript(revolveOps({ operation: "new_body" }));
      expect(s.body).toMatch(/\.Operation = RevolveOperationType\.CreateBody;/);
    });

    it("angle out of range emits warning", () => {
      const s = adapter.buildScript(revolveOps({ angle: 400 }));
      expect(s.warnings.some((w) => /out of \(0,360\]/.test(w.message))).toBe(true);
    });

    it("thinFeature=true emits ThinWall + ThinWallThickness", () => {
      const s = adapter.buildScript(revolveOps({ thinFeature: true, thinThickness: 0.5 }));
      expect(s.body).toMatch(/\.ThinWall = true;/);
      expect(s.body).toMatch(/\.ThinWallThickness = 0\.5;/);
    });

    it("comment echoes endCondition + direction for provenance", () => {
      const s = adapter.buildScript(
        revolveOps({ endCondition: "two_direction", direction: "one_direction" }),
      );
      expect(s.body).toMatch(/\/\/ Revolve .* endCondition=two_direction direction=one_direction/);
    });

    it("combined: cut + up_to_surface + thin", () => {
      const s = adapter.buildScript(
        revolveOps({
          operation: "cut",
          endCondition: "up_to_surface",
          targetSurface: "stopFace",
          thinFeature: true,
          thinThickness: 0.8,
        }),
      );
      expect(s.body).toMatch(/RevolveOperationType\.Remove/);
      expect(s.body).toMatch(/EndConditionType\.UpToSurface/);
      expect(s.body).toMatch(/\.TargetSurface = stopFace;/);
      expect(s.body).toMatch(/\.ThinWall = true;/);
    });
  });
});
