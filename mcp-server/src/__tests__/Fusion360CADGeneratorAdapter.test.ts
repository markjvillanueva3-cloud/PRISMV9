/**
 * Fusion360CADGeneratorAdapter.test.ts — U-CADC75 (PHASE-6 Fusion 360 Integration)
 *
 * Exhaustive coverage of the ICADCodeGenerator adapter that targets Fusion 360's
 * Python API (adsk.core/adsk.fusion). Covers: preamble/epilogue, every
 * supportedOp, mm→cm unit conversion, deg→rad angle conversion, edge cases.
 *
 * Rule: Fusion's native unit is cm + rad. The adapter MUST convert mm inputs
 * to cm and deg inputs to rad. These tests verify conversion correctness.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Fusion360CADGeneratorAdapter,
  fusion360CADGeneratorAdapter,
} from "../engines/Fusion360CodeGeneratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import { UnsupportedCapabilityError } from "../engines/UnifiedCADCodeGeneratorBase.js";

describe("Fusion360CADGeneratorAdapter (U-CADC75)", () => {
  let adapter: Fusion360CADGeneratorAdapter;

  beforeEach(() => {
    adapter = new Fusion360CADGeneratorAdapter();
  });

  describe("capability matrix", () => {
    it("declares fusion360 as cadSystem", () => {
      expect(adapter.cadSystem).toBe("fusion360");
    });

    it("nativeLengthUnit is cm (Fusion internal)", () => {
      expect(adapter.capabilities.nativeLengthUnit).toBe("cm");
    });

    it("nativeAngleUnit is rad (Fusion Python API)", () => {
      expect(adapter.capabilities.nativeAngleUnit).toBe("rad");
    });

    it("requires subprocess (out-of-process Python)", () => {
      expect(adapter.capabilities.requiresSubprocess).toBe(true);
    });

    it("supports >40 ops including sketch + feature + assembly + export", () => {
      const ops = adapter.capabilities.supportedOps;
      expect(ops.size).toBeGreaterThan(40);
      expect(ops.has("sketch_create")).toBe(true);
      expect(ops.has("feature_extrude")).toBe(true);
      expect(ops.has("boolean_subtract")).toBe(true);
      expect(ops.has("pattern_circular")).toBe(true);
      expect(ops.has("assembly_mate_concentric")).toBe(true);
      expect(ops.has("export_step")).toBe(true);
    });

    it("does NOT claim surface ops (out-of-scope for U-CADC75)", () => {
      expect(adapter.capabilities.supportedOps.has("surface_loft")).toBe(false);
      expect(adapter.capabilities.supportedOps.has("surface_offset")).toBe(false);
    });

    it("rejects surface_loft via UnsupportedCapabilityError", () => {
      expect(() =>
        adapter.buildScript([{ kind: "surface_loft", args: {} }]),
      ).toThrow(UnsupportedCapabilityError);
    });

    it("declares reasonable limits (maxLoftSections, maxPatternCount)", () => {
      expect(adapter.capabilities.limits?.maxLoftSections).toBeGreaterThanOrEqual(32);
      expect(adapter.capabilities.limits?.maxPatternCount).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("preamble + epilogue + filename", () => {
    it("preamble emits python def run(context) scaffold", () => {
      const script = adapter.buildScript([]);
      expect(script.body).toContain("def run(context):");
      expect(script.body).toContain("import adsk.core, adsk.fusion");
      expect(script.body).toContain("adsk.fusion.Design.cast");
    });

    it("preamble includes documentName in comments when provided", () => {
      const script = adapter.buildScript([], { documentName: "BRACKET" });
      expect(script.body).toMatch(/# Document: BRACKET/);
    });

    it("preamble records the input unit hint", () => {
      const mm = adapter.buildScript([], { unitIn: "mm" });
      const inch = adapter.buildScript([], { unitIn: "in" });
      expect(mm.body).toMatch(/Input unit: mm/);
      expect(inch.body).toMatch(/Input unit: in/);
    });

    it("epilogue emits traceback handler", () => {
      const script = adapter.buildScript([]);
      expect(script.body).toMatch(/except:[\s\S]+traceback\.format_exc/);
    });

    it("scriptFilename slugs documentName and uses .py extension", () => {
      const script = adapter.buildScript([], { documentName: "My Plate 01" });
      expect(script.filename).toBe("My_Plate_01.py");
    });

    it("default filename when no documentName", () => {
      const script = adapter.buildScript([]);
      expect(script.filename).toBe("prism_fusion_cad.py");
    });
  });

  describe("sketch emitters — mm→cm conversion", () => {
    it("sketch_create maps xy to xYConstructionPlane", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "Base" } },
      ]);
      expect(script.body).toContain("root.xYConstructionPlane");
      expect(script.body).toMatch(/\.name = "Base"/);
    });

    it("sketch_create maps xz to xZConstructionPlane", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xz" } },
      ]);
      expect(script.body).toContain("root.xZConstructionPlane");
    });

    it("sketch_create maps yz to yZConstructionPlane", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "yz" } },
      ]);
      expect(script.body).toContain("root.yZConstructionPlane");
    });

    it("sketch_line converts mm → cm: (0,0)→(50,0) mm emits (0,0)→(5,0) cm", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_line", args: { sketch: "p0", x1: 0, y1: 0, x2: 50, y2: 0 } },
      ]);
      expect(script.body).toContain("Point3D.create(0, 0, 0)");
      expect(script.body).toContain("Point3D.create(5, 0, 0)");
    });

    it("sketch_line honors unitIn=in (2 in = 5.08 cm)", () => {
      const script = adapter.buildScript(
        [
          { kind: "sketch_create", args: { plane: "xy" } },
          { kind: "sketch_line", args: { sketch: "p0", x1: 0, y1: 0, x2: 2, y2: 0 } },
        ],
        { unitIn: "in" },
      );
      expect(script.body).toContain("Point3D.create(5.08, 0, 0)");
    });

    it("sketch_line honors unitIn=cm (pass-through)", () => {
      const script = adapter.buildScript(
        [
          { kind: "sketch_create", args: { plane: "xy" } },
          { kind: "sketch_line", args: { sketch: "p0", x1: 0, y1: 0, x2: 7, y2: 0 } },
        ],
        { unitIn: "cm" },
      );
      expect(script.body).toContain("Point3D.create(7, 0, 0)");
    });

    it("sketch_circle warns on zero radius", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_circle", args: { sketch: "p0", cx: 0, cy: 0, radius: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("radius ≤ 0"))).toBe(true);
    });

    it("sketch_circle with 10mm radius emits 1 cm radius", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_circle", args: { sketch: "p0", cx: 0, cy: 0, radius: 10 } },
      ]);
      expect(script.body).toMatch(/addByCenterRadius\(adsk\.core\.Point3D\.create\(0, 0, 0\), 1\)/);
    });

    it("sketch_rectangle 40×20 mm emits opposite corner (4,2) cm", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_rectangle", args: { sketch: "p0", x: 0, y: 0, width: 40, height: 20 } },
      ]);
      expect(script.body).toContain("Point3D.create(4, 2, 0)");
      expect(script.body).toContain("addTwoPointRectangle");
    });

    it("sketch_polygon emits Python loop with math.cos/sin", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_polygon", args: { sketch: "p0", cx: 0, cy: 0, sides: 8, radius: 10 } },
      ]);
      expect(script.body).toMatch(/for _i in range\(8\)/);
      expect(script.body).toMatch(/math\.cos/);
      expect(script.body).toMatch(/math\.sin/);
    });

    it("sketch_polygon with <3 sides warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_polygon", args: { sketch: "p0", cx: 0, cy: 0, sides: 2, radius: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("< 3"))).toBe(true);
    });

    it("sketch_spline emits ObjectCollection with N points", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        {
          kind: "sketch_spline",
          args: { sketch: "p0", points: [0, 0, 10, 5, 20, 0] },
        },
      ]);
      const adds = script.body.match(/_spl\.add\(/g);
      expect(adds?.length).toBe(3);
      expect(script.body).toMatch(/sketchFittedSplines\.add/);
    });

    it("sketch_spline with <2 points warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_spline", args: { sketch: "p0", points: [0, 0] } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥2 points"))).toBe(true);
    });

    it("sketch_ellipse emits sketchEllipses.add", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_ellipse", args: { sketch: "p0", cx: 0, cy: 0, majorX: 10, majorY: 0, minorRadius: 5 } },
      ]);
      expect(script.body).toMatch(/sketchEllipses\.add/);
    });

    it("sketch_slot uses Fusion's center-point slot primitive", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_slot", args: { sketch: "p0", x1: 0, y1: 0, x2: 20, y2: 0, width: 5 } },
      ]);
      expect(script.body).toMatch(/addCenterPointSlot/);
    });

    it("sketch_point adds a SketchPoint", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_point", args: { sketch: "p0", x: 12, y: 5 } },
      ]);
      expect(script.body).toMatch(/sketchPoints\.add\(adsk\.core\.Point3D\.create\(1\.2, 0\.5, 0\)\)/);
    });

    it("sketch_constraint / dimension emit commit comment only", () => {
      const script = adapter.buildScript([
        { kind: "sketch_constraint", args: { type: "parallel" } },
        { kind: "sketch_dimension", args: { value: 25 } },
      ]);
      expect(script.body).toMatch(/# sketch_constraint:/);
      expect(script.body).toMatch(/# sketch_dimension:/);
    });
  });

  describe("feature emitters — deg→rad + mm→cm", () => {
    it("feature_extrude with 10mm → 1cm distance + NewBodyFeatureOperation default", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 10 } },
      ]);
      expect(script.body).toMatch(/ValueInput\.createByReal\(1\)/);
      expect(script.body).toContain("NewBodyFeatureOperation");
    });

    it("feature_extrude with operation=cut maps to CutFeatureOperation", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 5, operation: "cut" } },
      ]);
      expect(script.body).toContain("CutFeatureOperation");
    });

    it("feature_extrude with operation=join maps to JoinFeatureOperation", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 5, operation: "join" } },
      ]);
      expect(script.body).toContain("JoinFeatureOperation");
    });

    it("feature_extrude with distance=0 warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("distance = 0"))).toBe(true);
    });

    it("feature_revolve 180° → π rad ≈ 3.141593 (toRad conversion)", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_revolve", args: { sketch: "p0", axis: "root.yConstructionAxis", angle: 180 } },
      ]);
      expect(script.body).toMatch(/ValueInput\.createByReal\(3\.141593\)/);
    });

    it("feature_revolve 90° → π/2 rad ≈ 1.570796", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_revolve", args: { sketch: "p0", axis: "ax", angle: 90 } },
      ]);
      expect(script.body).toMatch(/1\.570796/);
    });

    it("feature_revolve angle > 360 warns", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_revolve", args: { sketch: "p0", axis: "ax", angle: 400 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("out of (0,360]"))).toBe(true);
    });

    it("feature_loft with 3 profiles emits 3 loftSections.add calls", () => {
      const script = adapter.buildScript([
        { kind: "feature_loft", args: { profiles: ["sk1", "sk2", "sk3"] } },
      ]);
      const adds = script.body.match(/loftSections\.add/g);
      expect(adds?.length).toBe(3);
    });

    it("feature_loft with <2 profiles warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_loft", args: { profiles: ["sk1"] } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥2 profiles"))).toBe(true);
    });

    it("feature_sweep emits createPath + sweepFeatures.add", () => {
      const script = adapter.buildScript([
        { kind: "feature_sweep", args: { profile: "prof", path: "path" } },
      ]);
      expect(script.body).toContain("createPath");
      expect(script.body).toContain("sweepFeatures.add");
    });

    it("feature_hole through uses setAllExtent", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { diameter: 6, depth: "through" } },
      ]);
      expect(script.body).toContain("setAllExtent");
    });

    it("feature_hole with distance uses setDistanceExtent", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { diameter: 6, depth: 20 } },
      ]);
      expect(script.body).toContain("setDistanceExtent");
      // depth 20mm → 2cm
      expect(script.body).toMatch(/ValueInput\.createByReal\(2\)/);
    });

    it("feature_hole zero-diameter warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_hole", args: { diameter: 0, depth: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("diameter ≤ 0"))).toBe(true);
    });

    it("feature_pocket emits negative-distance extrude cut", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "feature_pocket", args: { sketch: "p0", depth: 5 } },
      ]);
      expect(script.body).toContain("CutFeatureOperation");
      expect(script.body).toMatch(/createByReal\(-0\.5\)/);
    });

    it("feature_fillet 5mm → 0.5cm radius with edge collection", () => {
      const script = adapter.buildScript([
        { kind: "feature_fillet", args: { edges: ["e1", "e2"], radius: 5 } },
      ]);
      expect(script.body).toContain("addConstantRadiusEdgeSet");
      expect(script.body).toMatch(/ValueInput\.createByReal\(0\.5\)/);
    });

    it("feature_fillet with empty edges warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_fillet", args: { edges: [], radius: 2 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("≥1 edge"))).toBe(true);
    });

    it("feature_chamfer uses setToEqualDistance", () => {
      const script = adapter.buildScript([
        { kind: "feature_chamfer", args: { edges: ["e"], distance: 1.5 } },
      ]);
      expect(script.body).toContain("setToEqualDistance");
    });

    it("feature_shell routes through shellFeatures + insideThickness", () => {
      const script = adapter.buildScript([
        { kind: "feature_shell", args: { faces: ["f1"], thickness: 1.2 } },
      ]);
      expect(script.body).toContain("shellFeatures.createInput");
      expect(script.body).toContain("insideThickness");
    });

    it("feature_shell zero-thickness warns", () => {
      const script = adapter.buildScript([
        { kind: "feature_shell", args: { faces: ["f1"], thickness: 0 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("thickness ≤ 0"))).toBe(true);
    });

    it("feature_draft uses pressPullFeatures with radians", () => {
      const script = adapter.buildScript([
        { kind: "feature_draft", args: { faces: ["f"], angle: 3 } },
      ]);
      expect(script.body).toContain("pressPullFeatures");
      // 3 deg → 0.052360 rad
      expect(script.body).toMatch(/0\.05236/);
    });

    it("feature_rib and feature_thread emit stubs + warn", () => {
      const script = adapter.buildScript([
        { kind: "feature_rib", args: {} },
        { kind: "feature_thread", args: {} },
      ]);
      expect(script.warnings.filter((w) => w.kind === "feature_rib")).toHaveLength(1);
      expect(script.warnings.filter((w) => w.kind === "feature_thread")).toHaveLength(1);
    });
  });

  describe("booleans, patterns, transforms", () => {
    it("boolean_union maps to JoinFeatureOperation", () => {
      const script = adapter.buildScript([
        { kind: "boolean_union", args: { target: "body1", tool: "body2" } },
      ]);
      expect(script.body).toContain("JoinFeatureOperation");
    });

    it("boolean_subtract maps to CutFeatureOperation", () => {
      const script = adapter.buildScript([
        { kind: "boolean_subtract", args: { target: "body1", tool: "body2" } },
      ]);
      expect(script.body).toContain("CutFeatureOperation");
    });

    it("boolean_intersect maps to IntersectFeatureOperation", () => {
      const script = adapter.buildScript([
        { kind: "boolean_intersect", args: { target: "body1", tool: "body2" } },
      ]);
      expect(script.body).toContain("IntersectFeatureOperation");
    });

    it("pattern_linear 1D emits rectangularPatternFeatures.add", () => {
      const script = adapter.buildScript([
        {
          kind: "pattern_linear",
          args: { features: ["f"], axis1: "root.xConstructionAxis", count1: 5, spacing1: 10 },
        },
      ]);
      expect(script.body).toContain("rectangularPatternFeatures");
      // 10mm → 1cm spacing
      expect(script.body).toMatch(/createByReal\(1\)/);
    });

    it("pattern_linear 2D calls setDirectionTwo", () => {
      const script = adapter.buildScript([
        {
          kind: "pattern_linear",
          args: {
            features: ["f"],
            axis1: "ax1",
            count1: 3,
            spacing1: 20,
            axis2: "ax2",
            count2: 2,
            spacing2: 15,
          },
        },
      ]);
      expect(script.body).toContain("setDirectionTwo");
    });

    it("pattern_linear count1<1 warns", () => {
      const script = adapter.buildScript([
        { kind: "pattern_linear", args: { features: ["f"], axis1: "ax", count1: 0, spacing1: 10 } },
      ]);
      expect(script.warnings.some((w) => w.message.includes("count1=0"))).toBe(true);
    });

    it("pattern_circular sets quantity + totalAngle (rad)", () => {
      const script = adapter.buildScript([
        { kind: "pattern_circular", args: { features: ["f"], axis: "ax", count: 6, angle: 180 } },
      ]);
      expect(script.body).toMatch(/quantity = adsk\.core\.ValueInput\.createByString\('6'\)/);
      // 180 deg = π rad
      expect(script.body).toMatch(/createByReal\(3\.141593\)/);
    });

    it("pattern_mirror uses mirrorFeatures.createInput", () => {
      const script = adapter.buildScript([
        { kind: "pattern_mirror", args: { features: ["f"], mirrorPlane: "root.xYConstructionPlane" } },
      ]);
      expect(script.body).toContain("mirrorFeatures.createInput");
    });

    it("transform_move sets Vector3D translation in cm", () => {
      const script = adapter.buildScript([
        { kind: "transform_move", args: { body: "b", dx: 10, dy: 0, dz: 20 } },
      ]);
      expect(script.body).toMatch(/Vector3D\.create\(1, 0, 2\)/);
    });

    it("transform_rotate converts angle deg→rad", () => {
      const script = adapter.buildScript([
        { kind: "transform_rotate", args: { body: "b", axis: "ax", angle: 45 } },
      ]);
      // 45° = 0.785398 rad
      expect(script.body).toMatch(/0\.785398/);
    });
  });

  describe("datums, assembly, params, i/o", () => {
    it("datum_plane offset emits constructionPlanes.createInput", () => {
      const script = adapter.buildScript([
        { kind: "datum_plane", args: { type: "offset", basePlane: "xy", offset: 15 } },
      ]);
      expect(script.body).toContain("constructionPlanes.createInput");
      // 15mm → 1.5cm
      expect(script.body).toMatch(/createByReal\(1\.5\)/);
    });

    it("datum_plane origin_xy returns xYConstructionPlane", () => {
      const script = adapter.buildScript([
        { kind: "datum_plane", args: { type: "origin_xy" } },
      ]);
      expect(script.body).toMatch(/= root\.xYConstructionPlane/);
    });

    it("datum_axis z returns zConstructionAxis", () => {
      const script = adapter.buildScript([
        { kind: "datum_axis", args: { axis: "z" } },
      ]);
      expect(script.body).toMatch(/= root\.zConstructionAxis/);
    });

    it("datum_point creates ConstructionPoint at (x,y,z) cm", () => {
      const script = adapter.buildScript([
        { kind: "datum_point", args: { x: 10, y: 20, z: 30 } },
      ]);
      expect(script.body).toMatch(/Point3D\.create\(1, 2, 3\)/);
    });

    it("assembly_insert uses addNewComponent with identity matrix", () => {
      const script = adapter.buildScript([
        { kind: "assembly_insert", args: {} },
      ]);
      expect(script.body).toContain("addNewComponent");
      expect(script.body).toMatch(/Matrix3D\.create/);
    });

    it("assembly_mate_concentric creates rigid joint", () => {
      const script = adapter.buildScript([
        { kind: "assembly_mate_concentric", args: { entity1: "f1", entity2: "f2" } },
      ]);
      expect(script.body).toContain("setAsRigidJointMotion");
      expect(script.body).toContain("joints.createInput");
    });

    it("assembly_mate_distance creates slider joint", () => {
      const script = adapter.buildScript([
        { kind: "assembly_mate_distance", args: { entity1: "f1", entity2: "f2", distance: 5 } },
      ]);
      expect(script.body).toContain("setAsSliderJointMotion");
    });

    it("assembly_mate_angle creates revolute joint", () => {
      const script = adapter.buildScript([
        { kind: "assembly_mate_angle", args: { entity1: "f1", entity2: "f2", angle: 30 } },
      ]);
      expect(script.body).toContain("setAsRevoluteJointMotion");
    });

    it("parameter_declare calls userParameters.add with unit string", () => {
      const script = adapter.buildScript([
        { kind: "parameter_declare", args: { name: "wall", value: 2.5, unit: "mm" } },
      ]);
      expect(script.body).toContain('userParameters.add("wall"');
      expect(script.body).toMatch(/"2\.5 mm"/);
      expect(script.parameters.get("wall")?.value).toBe(2.5);
    });

    it("parameter_equation assigns .expression", () => {
      const script = adapter.buildScript([
        { kind: "parameter_equation", args: { name: "outer", expression: "wall * 2" } },
      ]);
      expect(script.body).toMatch(/itemByName\("outer"\)\.expression = "wall \* 2"/);
    });

    it("import_step calls importManager.createSTEPImportOptions", () => {
      const script = adapter.buildScript([
        { kind: "import_step", args: { path: "/tmp/in.step" } },
      ]);
      expect(script.body).toContain("createSTEPImportOptions");
      expect(script.body).toContain("/tmp/in.step");
    });

    it("export_step calls exportManager.createSTEPExportOptions", () => {
      const script = adapter.buildScript([
        { kind: "export_step", args: { path: "/tmp/out.step" } },
      ]);
      expect(script.body).toContain("createSTEPExportOptions");
    });

    it("export_stl / iges / dxf each pick their own export helper", () => {
      const stl = adapter.buildScript([{ kind: "export_stl", args: { path: "/a.stl" } }]);
      const iges = adapter.buildScript([{ kind: "export_iges", args: { path: "/b.igs" } }]);
      const dxf = adapter.buildScript([{ kind: "export_dxf", args: { path: "/c.dxf" } }]);
      expect(stl.body).toContain("createSTLExportOptions");
      expect(iges.body).toContain("createIGESExportOptions");
      expect(dxf.body).toContain("createDXFExportOptions");
    });

    it("custom op emits raw Python body", () => {
      const script = adapter.buildScript([
        { kind: "custom", args: { body: "# inline\nprint('hi')" } },
      ]);
      expect(script.body).toContain("# inline");
      expect(script.body).toContain("print('hi')");
    });
  });

  describe("pipeline behavior — lineage, warnings, required args", () => {
    it("builds a 5-op happy path (sketch→circle→extrude→fillet→export)", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", args: { plane: "xy", name: "Base" } },
        { kind: "sketch_circle", args: { sketch: "p0", cx: 0, cy: 0, radius: 10 } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 5 } },
        { kind: "feature_fillet", args: { edges: ["e1"], radius: 0.5 } },
        { kind: "export_step", args: { path: "/tmp/out.step" } },
      ];
      const script = adapter.buildScript(ops);
      expect(script.lineage).toHaveLength(5);
      expect(script.warnings).toHaveLength(0);
    });

    it("lineage entries are strictly ordered by line range", () => {
      const script = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy" } },
        { kind: "sketch_rectangle", args: { sketch: "p0", x: 0, y: 0, width: 40, height: 20 } },
        { kind: "feature_extrude", args: { sketch: "p0", distance: 10 } },
      ]);
      for (let i = 1; i < script.lineage.length; i++) {
        expect(script.lineage[i].lineStart).toBeGreaterThan(script.lineage[i - 1].lineEnd);
      }
    });

    it("missing required sketch arg throws with kind context", () => {
      expect(() =>
        adapter.buildScript([
          { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
        ]),
      ).toThrow(/op 'sketch_line' missing required string arg 'sketch'/);
    });

    it("missing boolean target/tool throws", () => {
      expect(() =>
        adapter.buildScript([{ kind: "boolean_union", args: {} }]),
      ).toThrow(/missing required string arg/);
    });
  });

  describe("executeScript + validateOutput", () => {
    const originalMock = process.env.PRISM_CAD_MOCK;
    afterEach(() => {
      if (originalMock === undefined) delete process.env.PRISM_CAD_MOCK;
      else process.env.PRISM_CAD_MOCK = originalMock;
    });

    it("executeScript returns mock metrics when PRISM_CAD_MOCK=1", async () => {
      process.env.PRISM_CAD_MOCK = "1";
      const script = adapter.buildScript([{ kind: "custom", args: { body: "# noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(true);
      expect(res.metrics?.volumeMm3).toBe(1000);
      expect(res.metrics?.faceCount).toBe(6);
    });

    it("executeScript reports Fusion-Python unavailable without mock", async () => {
      delete process.env.PRISM_CAD_MOCK;
      const script = adapter.buildScript([{ kind: "custom", args: { body: "# noop" } }]);
      const res = await adapter.executeScript(script);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Fusion 360/);
    });

    it("validateOutput rejects failed execution as EXEC_FAILED", () => {
      const report = adapter.validateOutput({ ok: false, error: "x", durationMs: 1 });
      expect(report.ok).toBe(false);
      expect(report.findings[0].code).toBe("EXEC_FAILED");
    });

    it("validateOutput accepts healthy mock metrics", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 1,
        metrics: { volumeMm3: 1000, faceCount: 6, boundingBoxMm: [10, 10, 10] },
      });
      expect(report.ok).toBe(true);
      expect(report.findings).toHaveLength(0);
    });

    it("validateOutput flags zero-face model", () => {
      const report = adapter.validateOutput({
        ok: true,
        durationMs: 1,
        metrics: { volumeMm3: 100, faceCount: 0 },
      });
      expect(report.findings.some((f) => f.code === "NO_FACES")).toBe(true);
    });
  });

  describe("singleton identity + adapter reuse", () => {
    it("exported singleton is an instance of Fusion360CADGeneratorAdapter", () => {
      expect(fusion360CADGeneratorAdapter).toBeInstanceOf(Fusion360CADGeneratorAdapter);
    });

    it("singleton's cadSystem is fusion360", () => {
      expect(fusion360CADGeneratorAdapter.cadSystem).toBe("fusion360");
    });

    it("capability snapshot via getCapabilities is independent of the original", () => {
      const snap = fusion360CADGeneratorAdapter.getCapabilities();
      (snap.supportedOps as Set<string>).add("surface_loft");
      expect(fusion360CADGeneratorAdapter.capabilities.supportedOps.has("surface_loft")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // U-CADC-OVE-01 — Op Vocabulary Exhaustion: feature_extrude + feature_revolve
  // Fusion 360 uses cm + rad natively; tests verify conversion stays correct.
  // ─────────────────────────────────────────────────────────────────────
  describe("feature_extrude — exhaustive input surface (Fusion 360)", () => {
    const extrudeOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "sketch_rectangle", args: { sketch: "p0", x1: 0, y1: 0, x2: 10, y2: 10 } },
      { kind: "feature_extrude", args: { sketch: "p0", distance: 10, ...extra } },
    ];

    it("endCondition=blind emits setDistanceExtent (default, 10mm→1cm)", () => {
      const s = adapter.buildScript(extrudeOps());
      expect(s.body).toMatch(/setDistanceExtent\(False, adsk\.core\.ValueInput\.createByReal\(1\)\)/);
    });

    it("endCondition=through_all emits setAllExtent with PositiveExtentDirection", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "through_all" }));
      expect(s.body).toMatch(/setAllExtent\(adsk\.fusion\.ExtentDirections\.PositiveExtentDirection\)/);
    });

    it("endCondition=through_all + direction=negative emits NegativeExtentDirection", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "through_all", reversed: true, direction: "one_side" }),
      );
      expect(s.body).toMatch(/setAllExtent\(adsk\.fusion\.ExtentDirections\.NegativeExtentDirection\)/);
    });

    it("endCondition=mid_plane emits setSymmetricExtent(True)", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/setSymmetricExtent\(adsk\.core\.ValueInput\.createByReal\(1\), True\)/);
    });

    it("endCondition=up_to_surface with targetSurface emits setOneSideToExtent", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "up_to_surface", targetSurface: "topFace" }),
      );
      expect(s.body).toMatch(/setOneSideToExtent\(topFace, False, adsk\.core\.ValueInput\.createByReal\(0\)/);
    });

    it("endCondition=up_to_surface without targetSurface warns + falls back to setAllExtent", () => {
      const s = adapter.buildScript(extrudeOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/setAllExtent/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("endCondition=offset_from_surface passes nonzero offset in cm", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "offset_from_surface", targetSurface: "topFace", offsetFromSurface: 5 }),
      );
      // 5mm → 0.5 cm
      expect(s.body).toMatch(/setOneSideToExtent\(topFace, False, adsk\.core\.ValueInput\.createByReal\(0\.5\)/);
    });

    it("direction=two_side emits setTwoSidesDistanceExtent (d + d2)", () => {
      const s = adapter.buildScript(
        extrudeOps({ direction: "two_side", distance2: 5 }),
      );
      // 10mm=1cm, 5mm=0.5cm
      expect(s.body).toMatch(/setTwoSidesDistanceExtent\(adsk\.core\.ValueInput\.createByReal\(1\), adsk\.core\.ValueInput\.createByReal\(0\.5\)\)/);
    });

    it("direction=symmetric emits setSymmetricExtent", () => {
      const s = adapter.buildScript(extrudeOps({ direction: "symmetric" }));
      expect(s.body).toMatch(/setSymmetricExtent\(adsk\.core\.ValueInput\.createByReal\(1\), True\)/);
    });

    it("taperAngle in deg converts to rad in Python ValueInput (6-decimal rounded)", () => {
      // 10 deg ≈ 0.174533 rad (rounded to 6 decimals by toRad)
      const s = adapter.buildScript(extrudeOps({ taperAngle: 10 }));
      expect(s.body).toMatch(/_ext_in\.taperAngle = adsk\.core\.ValueInput\.createByReal\(0\.174533\)/);
    });

    it("taperAngle2 applied only in two_side direction", () => {
      const s = adapter.buildScript(
        extrudeOps({ direction: "two_side", taperAngle2: 20 }),
      );
      // 20 deg ≈ 0.349066 rad
      expect(s.body).toMatch(/_ext_in\.taperAngleTwo = adsk\.core\.ValueInput\.createByReal\(0\.349066\)/);
    });

    it("taperAngle2 without two_side does NOT emit taperAngleTwo", () => {
      const s = adapter.buildScript(
        extrudeOps({ direction: "one_side", taperAngle2: 20 }),
      );
      expect(s.body).not.toMatch(/taperAngleTwo/);
    });

    it("thinFeature sets isSolid=False + thinThickness comment", () => {
      const s = adapter.buildScript(extrudeOps({ thinFeature: true, thinThickness: 2 }));
      expect(s.body).toMatch(/_ext_in\.isSolid = False/);
      expect(s.body).toMatch(/thinThickness=0\.2cm/);
    });

    it("operation=cut maps to CutFeatureOperation", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "cut" }));
      expect(s.body).toMatch(/FeatureOperations\.CutFeatureOperation/);
    });

    it("operation=join maps to JoinFeatureOperation", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "join" }));
      expect(s.body).toMatch(/FeatureOperations\.JoinFeatureOperation/);
    });

    it("operation=intersect maps to IntersectFeatureOperation", () => {
      const s = adapter.buildScript(extrudeOps({ operation: "intersect" }));
      expect(s.body).toMatch(/FeatureOperations\.IntersectFeatureOperation/);
    });

    it("comment line echoes endCondition + direction for provenance", () => {
      const s = adapter.buildScript(
        extrudeOps({ endCondition: "mid_plane", direction: "symmetric" }),
      );
      expect(s.body).toMatch(/# Extrude .* endCondition=mid_plane direction=symmetric/);
    });

    it("zero distance with blind endCondition emits warning", () => {
      const s = adapter.buildScript(extrudeOps({ distance: 0 }));
      expect(s.warnings.some((w) => /distance = 0/.test(w.message))).toBe(true);
    });

    it("combined: two_side + cut + taper + distance2 + thin", () => {
      const s = adapter.buildScript(
        extrudeOps({
          direction: "two_side",
          operation: "cut",
          distance2: 8,
          taperAngle: 5,
          taperAngle2: 5,
          thinFeature: true,
          thinThickness: 1,
        }),
      );
      expect(s.body).toMatch(/setTwoSidesDistanceExtent/);
      expect(s.body).toMatch(/CutFeatureOperation/);
      expect(s.body).toMatch(/taperAngle =/);
      expect(s.body).toMatch(/taperAngleTwo =/);
      expect(s.body).toMatch(/isSolid = False/);
    });

    it("unitIn=in converts inch distances correctly (1 in = 2.54 cm)", () => {
      const s = adapter.buildScript(
        [{ kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
         { kind: "feature_extrude", args: { sketch: "p0", distance: 1 } }],
        { unitIn: "in" },
      );
      expect(s.body).toMatch(/createByReal\(2\.54\)/);
    });
  });

  describe("feature_revolve — exhaustive input surface (Fusion 360)", () => {
    const revolveOps = (extra: Record<string, unknown> = {}): CADOperation[] => [
      { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
      { kind: "feature_revolve", args: { sketch: "p0", axis: "X_AXIS", angle: 180, ...extra } },
    ];

    it("default angle=180 emits setAngleExtent with PI rad", () => {
      const s = adapter.buildScript(revolveOps());
      // 180 deg = π ≈ 3.141592653589793
      expect(s.body).toMatch(/setAngleExtent\(False, adsk\.core\.ValueInput\.createByReal\(3\.141593\)\)/);
    });

    it("angle=360 auto-detects full → setAngleExtent(False, 2π)", () => {
      const s = adapter.buildScript([
        { kind: "sketch_create", args: { plane: "xy", name: "sk0" } },
        { kind: "feature_revolve", args: { sketch: "p0", axis: "X_AXIS", angle: 360 } },
      ]);
      expect(s.body).toMatch(/setAngleExtent\(False, adsk\.core\.ValueInput\.createByReal\(6\.283185\)\)/);
    });

    it("endCondition=mid_plane emits setAngleExtent(True, rad)", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "mid_plane" }));
      expect(s.body).toMatch(/setAngleExtent\(True, adsk\.core\.ValueInput\.createByReal\(3\.141593\)\)/);
    });

    it("endCondition=two_direction emits setTwoSideAngleExtent", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "two_direction", angle2: 90 }));
      // 180deg=π, 90deg=π/2
      expect(s.body).toMatch(/setTwoSideAngleExtent\(adsk\.core\.ValueInput\.createByReal\(3\.141593\), adsk\.core\.ValueInput\.createByReal\(1\.570796\)\)/);
    });

    it("endCondition=up_to_surface emits setOneSideToExtent", () => {
      const s = adapter.buildScript(
        revolveOps({ endCondition: "up_to_surface", targetSurface: "stopFace" }),
      );
      expect(s.body).toMatch(/setOneSideToExtent\(stopFace, False\)/);
    });

    it("endCondition=up_to_surface without targetSurface warns + falls back to angle", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "up_to_surface" }));
      expect(s.body).toMatch(/setAngleExtent/);
      expect(s.warnings.some((w) => /requires targetSurface/.test(w.message))).toBe(true);
    });

    it("direction=symmetric uses setAngleExtent(True, rad)", () => {
      const s = adapter.buildScript(revolveOps({ direction: "symmetric" }));
      expect(s.body).toMatch(/setAngleExtent\(True, adsk\.core\.ValueInput\.createByReal\(3\.141593\)\)/);
    });

    it("operation=cut emits CutFeatureOperation", () => {
      const s = adapter.buildScript(revolveOps({ operation: "cut" }));
      expect(s.body).toMatch(/FeatureOperations\.CutFeatureOperation/);
    });

    it("angle>360 emits out-of-range warning", () => {
      const s = adapter.buildScript(revolveOps({ angle: 400 }));
      expect(s.warnings.some((w) => /out of \(0,360\]/.test(w.message))).toBe(true);
    });

    it("angle=0 emits out-of-range warning", () => {
      const s = adapter.buildScript(revolveOps({ angle: 0 }));
      expect(s.warnings.some((w) => /out of \(0,360\]/.test(w.message))).toBe(true);
    });

    it("thinFeature sets isSolid=False", () => {
      const s = adapter.buildScript(revolveOps({ thinFeature: true }));
      expect(s.body).toMatch(/_rev_in\.isSolid = False/);
    });

    it("comment echoes endCondition + direction for provenance", () => {
      const s = adapter.buildScript(revolveOps({ endCondition: "two_direction", direction: "one_side" }));
      expect(s.body).toMatch(/# Revolve .* endCondition=two_direction direction=one_side/);
    });

    it("combined: cut + mid_plane baseline", () => {
      const s = adapter.buildScript(revolveOps({ operation: "cut", endCondition: "mid_plane" }));
      expect(s.body).toMatch(/CutFeatureOperation/);
      expect(s.body).toMatch(/setAngleExtent\(True,/);
    });
  });
});
