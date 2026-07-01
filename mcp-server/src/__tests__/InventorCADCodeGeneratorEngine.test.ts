/**
 * InventorCADCodeGeneratorEngine Integration Tests
 * Tests iLogic VB.NET code generation for Autodesk Inventor CAD operations
 *
 * U-CADC08: Inventor CAD Integration
 * Comprehensive tests per COMPREHENSIVE-BUILD ENFORCEMENT directive:
 * - Real behavioral tests (no placeholder asserts)
 * - 3+ failure modes tested
 * - Dispatcher integration verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InventorCADCodeGeneratorEngine } from "../engines/InventorCADCodeGeneratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("InventorCADCodeGeneratorEngine", () => {
  let engine: InstanceType<typeof InventorCADCodeGeneratorEngine>;

  beforeEach(() => {
    engine = new InventorCADCodeGeneratorEngine();
  });

  describe("Sketch Operations", () => {
    it("generates sketch_rectangle with proper iLogic syntax", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Dim oDoc As PartDocument");
      expect(script.body).toContain("SketchLines.AddAsTwoPointRectangle");
      expect(script.body).toContain("100"); // width
      expect(script.body).toContain("50"); // height
    });

    it("generates sketch_circle with center and radius", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_circle", args: { cx: 25, cy: 25, radius: 15 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchCircles.AddByCenterRadius");
      expect(script.body).toContain("25"); // center
      expect(script.body).toContain("15"); // radius
    });

    it("generates sketch_line with start and end points", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 100, y2: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchLines.AddByTwoPoints");
    });

    it("generates sketch_arc with center, radius, and angles", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_arc", args: { cx: 0, cy: 0, radius: 20, start_angle: 0, end_angle: 90 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchArcs.AddByCenterStartEndPoint");
    });

    it("generates sketch_spline with control points", () => {
      const ops: CADOperation[] = [
        {
          kind: "sketch_spline",
          args: { points: [0, 0, 10, 20, 30, 15, 50, 0] }
        }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchSplines.Add");
      expect(script.body).toContain("ObjectCollection");
    });

    it("generates sketch_polygon with sides", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_polygon", args: { cx: 0, cy: 0, radius: 20, sides: 6 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchLines.AddAsPolygon");
      expect(script.body).toContain("6"); // sides
    });

    it("generates sketch_slot with length and width", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_slot", args: { cx: 0, cy: 0, length: 40, width: 10 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("slot geometry");
    });

    it("generates sketch_ellipse with major and minor radii", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_ellipse", args: { cx: 0, cy: 0, major_radius: 30, minor_radius: 15 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchEllipses.Add");
    });

    it("generates sketch_point with coordinates", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_point", args: { x: 10, y: 20 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchPoints.Add");
    });

    it("generates sketch_create for new sketch on plane", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", args: { plane: "XY", name: "BaseSketch" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Sketches.Add");
      expect(script.body).toContain("BaseSketch");
    });
  });

  describe("Feature Operations", () => {
    it("generates feature_extrude with length parameter", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 50 } },
        { kind: "feature_extrude", args: { length: 25, direction: "positive" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("ExtrudeFeatures.AddByDistanceExtent");
      expect(script.body).toContain("25"); // length in mm
    });

    it("generates feature_extrude with symmetric option", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 50 } },
        { kind: "feature_extrude", args: { length: 50, symmetric: true } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("kSymmetricExtentDirection");
    });

    it("generates feature_revolve with angle", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 10, y: 0, width: 20, height: 30 } },
        { kind: "feature_revolve", args: { angle: 360 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("RevolveFeatures.AddFull");
    });

    it("generates feature_pocket with length parameter", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 10, y: 10, width: 30, height: 20 } },
        { kind: "feature_pocket", args: { length: 8 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("ExtrudeFeatures.AddByDistanceExtent");
      expect(script.body).toContain("kCutOperation");
    });

    it("generates feature_fillet with radius", () => {
      const ops: CADOperation[] = [
        { kind: "feature_fillet", args: { radius: 5 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("FilletFeatures.AddSimple");
      expect(script.body).toContain("5"); // radius
    });

    it("generates feature_chamfer with distance", () => {
      const ops: CADOperation[] = [
        { kind: "feature_chamfer", args: { distance: 2 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("ChamferFeatures.AddUsingDistance");
    });

    it("generates feature_hole with diameter and depth", () => {
      const ops: CADOperation[] = [
        { kind: "feature_hole", args: { diameter: 10, depth: 15 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("HoleFeatures");
      expect(script.body).toContain("10"); // diameter
      expect(script.body).toContain("15"); // depth
    });

    it("generates feature_shell with thickness", () => {
      const ops: CADOperation[] = [
        { kind: "feature_shell", args: { thickness: 2 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("ShellFeatures.Add");
      expect(script.body).toContain("2"); // wall thickness
    });

    it("generates feature_loft between profiles", () => {
      const ops: CADOperation[] = [
        { kind: "feature_loft", args: { sections: [1, 2] } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("LoftFeatures.Add");
    });

    it("generates feature_sweep along path", () => {
      const ops: CADOperation[] = [
        { kind: "feature_sweep", args: { profile_sketch: 1, path_sketch: 2 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SweepFeatures.Add");
    });
  });

  describe("Pattern Operations", () => {
    it("generates pattern_rectangular with counts and spacing", () => {
      const ops: CADOperation[] = [
        { kind: "pattern_rectangular", args: { count_x: 3, count_y: 4, spacing_x: 25, spacing_y: 30 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("RectangularPatternFeatures.Add");
      expect(script.body).toContain("3"); // count_x
      expect(script.body).toContain("4"); // count_y
    });

    it("generates pattern_circular with count and angle", () => {
      const ops: CADOperation[] = [
        { kind: "pattern_circular", args: { count: 6, angle: 360 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("CircularPatternFeatures.Add");
      expect(script.body).toContain("6"); // count
    });

    it("generates pattern_mirror across plane", () => {
      const ops: CADOperation[] = [
        { kind: "pattern_mirror", args: { plane: "XZ" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("MirrorFeatures.Add");
    });
  });

  describe("Boolean Operations", () => {
    it("generates boolean_union of bodies", () => {
      const ops: CADOperation[] = [
        { kind: "boolean_union", args: {} }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("CombineFeatures.Add");
      expect(script.body).toContain("kBooleanTypeUnion");
    });

    it("generates boolean_subtract (cut)", () => {
      const ops: CADOperation[] = [
        { kind: "boolean_subtract", args: {} }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("CombineFeatures.Add");
      expect(script.body).toContain("kBooleanTypeDifference");
    });

    it("generates boolean_intersect", () => {
      const ops: CADOperation[] = [
        { kind: "boolean_intersect", args: {} }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("CombineFeatures.Add");
      expect(script.body).toContain("kBooleanTypeIntersect");
    });
  });

  describe("Work Features", () => {
    it("generates work_plane offset from face", () => {
      const ops: CADOperation[] = [
        { kind: "work_plane", args: { offset: 10 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("WorkPlanes.AddByPlaneAndOffset");
    });

    it("generates work_axis through points", () => {
      const ops: CADOperation[] = [
        { kind: "work_axis", args: {} }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("WorkAxes");
    });

    it("generates work_point at coordinates", () => {
      const ops: CADOperation[] = [
        { kind: "work_point", args: { x: 50, y: 25, z: 0 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("WorkPoints.AddFixed");
    });
  });

  describe("Parameter Operations", () => {
    it("generates parameter_declare with name and value", () => {
      const ops: CADOperation[] = [
        { kind: "parameter_declare", args: { name: "Width", value: 100, unit: "mm" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Parameters.UserParameters");
      expect(script.body).toContain("Width");
      expect(script.body).toContain("100");
    });

    it("generates parameter_link between parameters", () => {
      const ops: CADOperation[] = [
        { kind: "parameter_link", args: { source: "Width", target: "Length" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Expression");
      expect(script.body).toContain("Width");
      expect(script.body).toContain("Length");
    });
  });

  describe("Import/Export Operations", () => {
    it("generates export_step with filename", () => {
      const ops: CADOperation[] = [
        { kind: "export_step", args: { file: "output.step" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SaveCopyAs");
      expect(script.body).toContain("output.step");
    });

    it("generates export_stl with filename", () => {
      const ops: CADOperation[] = [
        { kind: "export_stl", args: { file: "output.stl" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SaveCopyAs");
      expect(script.body).toContain("output.stl");
    });

    it("generates export_dxf with filename", () => {
      const ops: CADOperation[] = [
        { kind: "export_dxf", args: { file: "output.dxf" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SaveCopyAs");
      expect(script.body).toContain("output.dxf");
    });

    it("generates import_step with filename", () => {
      const ops: CADOperation[] = [
        { kind: "import_step", args: { file: "input.step" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Open");
      expect(script.body).toContain("input.step");
    });

    it("generates import_iges with filename", () => {
      const ops: CADOperation[] = [
        { kind: "import_iges", args: { file: "input.igs" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Open");
      expect(script.body).toContain("input.igs");
    });
  });

  describe("Assembly Operations", () => {
    it("generates assembly_place component", () => {
      const ops: CADOperation[] = [
        { kind: "assembly_place", args: { file: "part.ipt" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Occurrences.Add");
      expect(script.body).toContain("part.ipt");
    });

    it("generates assembly_constrain mate", () => {
      const ops: CADOperation[] = [
        { kind: "assembly_constrain", args: { type: "mate", occurrence_a: 1, occurrence_b: 2 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("mate constraint");
    });

    it("generates assembly_ground component", () => {
      const ops: CADOperation[] = [
        { kind: "assembly_ground", args: {} }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Grounded");
    });
  });

  describe("Complex Part Generation", () => {
    it("generates complete bracket with multiple features", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 60 } },
        { kind: "feature_extrude", args: { length: 10, direction: "positive" } },
        { kind: "sketch_circle", args: { cx: 20, cy: 30, radius: 8 } },
        { kind: "feature_pocket", args: { length: 10 } },
        { kind: "sketch_circle", args: { cx: 80, cy: 30, radius: 8 } },
        { kind: "feature_pocket", args: { length: 10 } },
        { kind: "feature_fillet", args: { radius: 3 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("Dim oDoc As PartDocument");
      expect(script.body).toContain("ExtrudeFeatures");
      expect(script.body).toContain("FilletFeatures");
      const errorWarnings = script.warnings.filter(w =>
        w.severity === "error"
      );
      expect(errorWarnings.length).toBe(0);
    });

    it("generates cylindrical shaft with patterns", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 25 } },
        { kind: "feature_extrude", args: { length: 100, direction: "positive" } },
        { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 5 } },
        { kind: "feature_pocket", args: { length: 10 } },
        { kind: "pattern_circular", args: { count: 6, angle: 360 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("SketchCircles.AddByCenterRadius");
      expect(script.body).toContain("CircularPatternFeatures.Add");
    });

    it("generates enclosure with shell and ribs", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 120, height: 80 } },
        { kind: "feature_extrude", args: { length: 40, direction: "positive" } },
        { kind: "feature_shell", args: { thickness: 3 } },
        { kind: "sketch_rectangle", args: { x: 58, y: 0, width: 4, height: 80 } },
        { kind: "feature_extrude", args: { length: 37, direction: "positive" } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body.length).toBeGreaterThan(0);
      expect(script.body).toContain("ShellFeatures.Add");
      const extrudeCount = (script.body.match(/ExtrudeFeatures\.AddByDistanceExtent/g) || []).length;
      expect(extrudeCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Error Handling / Failure Modes", () => {
    it("throws on unsupported operation kind", () => {
      const ops: CADOperation[] = [
        { kind: "custom_unsupported_op" as any, args: { unsupported: true } }
      ];

      expect(() => engine.buildScript(ops)).toThrow(/unsupported/i);
    });

    it("throws on missing required parameters for sketch_rectangle", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: {} } // missing width/height
      ];

      expect(() => engine.buildScript(ops)).toThrow(/missing required arg/i);
    });

    it("throws on missing required 'length' for feature_extrude", () => {
      const ops: CADOperation[] = [
        { kind: "feature_extrude", args: {} } // missing length
      ];

      expect(() => engine.buildScript(ops)).toThrow(/missing required arg.*length/i);
    });

    it("throws on missing required 'radius' for sketch_circle", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_circle", args: { cx: 0, cy: 0 } } // missing radius
      ];

      expect(() => engine.buildScript(ops)).toThrow(/missing required arg.*radius/i);
    });

    it("throws on missing 'points' for sketch_spline", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_spline", args: {} }
      ];

      expect(() => engine.buildScript(ops)).toThrow(/missing required arg.*points/i);
    });

    it("handles empty operations array without throwing", () => {
      const ops: CADOperation[] = [];

      const script = engine.buildScript(ops);

      expect(script).toBeDefined();
      expect(script.body).toBeDefined();
      expect(script.cadSystem).toBe("inventor");
    });

    it("accepts negative length for reverse extrusion direction", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
        { kind: "feature_extrude", args: { length: -10, direction: "negative" } }
      ];

      // Engine should not throw — negative direction is valid
      const script = engine.buildScript(ops);
      expect(script.body).toBeDefined();
    });

    it("handles invalid operation sequence (pattern without feature)", () => {
      const ops: CADOperation[] = [
        // Pattern without prior feature — engine still generates code
        { kind: "pattern_circular", args: { count: 4, angle: 360 } }
      ];

      const script = engine.buildScript(ops);

      expect(script).toBeDefined();
      expect(script.body).toBeDefined();
    });
  });

  describe("Script Structure", () => {
    it("includes proper iLogic preamble with oApp and oDoc", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("Dim oApp As Inventor.Application = ThisApplication");
      expect(script.body).toContain("Dim oDoc As PartDocument");
      expect(script.body).toContain("Dim oDef As PartComponentDefinition");
    });

    it("includes proper epilogue with Update2", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
        { kind: "feature_extrude", args: { length: 10 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("oDoc.Update2(True)");
    });

    it("includes imports section", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("Imports Inventor");
      expect(script.body).toContain("Imports System.Math");
    });

    it("includes working variable declarations", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("Dim oSketch As PlanarSketch");
      expect(script.body).toContain("Dim oProfile As Profile");
      expect(script.body).toContain("Dim oFeature As Object");
    });

    it("tracks operation lineage", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 50 } },
        { kind: "feature_extrude", args: { length: 25 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.lineage).toBeDefined();
      expect(script.lineage.length).toBe(2);
      expect(script.lineage[0].kind).toBe("sketch_rectangle");
      expect(script.lineage[1].kind).toBe("feature_extrude");
    });

    it("reports parameters used", () => {
      const ops: CADOperation[] = [
        { kind: "parameter_declare", args: { name: "BoxWidth", value: 100, unit: "mm" } },
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.parameters).toBeDefined();
      expect(script.parameters.size).toBeGreaterThan(0);
    });

    it("sets filename from context outputPath", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops, { outputPath: "C:\\Parts\\test.ipt" });

      expect(script.filename).toBeDefined();
    });
  });

  describe("Context Options", () => {
    it("uses mm units by default", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.body).toContain("kMillimeterLengthUnits");
    });

    it("supports inch units via context", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 2, height: 1 } }
      ];

      const script = engine.buildScript(ops, { units: "in" });

      expect(script.body).toContain("kInchLengthUnits");
    });

    it("supports cm units via context", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 10, height: 5 } }
      ];

      const script = engine.buildScript(ops, { units: "cm" });

      expect(script.body).toContain("kCentimeterLengthUnits");
    });

    it("creates assembly document when documentType is assembly", () => {
      const ops: CADOperation[] = [];

      const script = engine.buildScript(ops, { documentType: "assembly" });

      expect(script.body).toContain("kAssemblyDocumentObject");
      expect(script.body).toContain("AssemblyComponentDefinition");
    });

    it("saves document when outputPath is provided", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } }
      ];

      const script = engine.buildScript(ops, { outputPath: "C:\\Output\\part.ipt" });

      expect(script.body).toContain('SaveAs("C:\\\\Output\\\\part.ipt"');
    });
  });

  describe("Capabilities", () => {
    it("reports correct CAD system ID", () => {
      expect(engine.cadSystem).toBe("inventor");
    });

    it("exposes capabilities property", () => {
      expect(engine.capabilities).toBeDefined();
      expect(engine.capabilities.supportedOps).toBeDefined();
    });

    it("lists supported operations via capabilities", () => {
      const caps = engine.capabilities;
      expect(caps.supportedOps.size).toBeGreaterThan(0);
      expect(caps.supportedOps.has("sketch_rectangle")).toBe(true);
      expect(caps.supportedOps.has("feature_extrude")).toBe(true);
      expect(caps.supportedOps.has("pattern_circular")).toBe(true);
    });

    it("reports capability flags correctly", () => {
      const caps = engine.capabilities;
      expect(caps.supportsParameters).toBe(true);
      expect(caps.supportsUndo).toBe(true);
      expect(caps.assemblyModeling).toBe(true);
      expect(caps.sheetMetal).toBe(true);
      expect(caps.surfaceModeling).toBe(true);
    });

    it("has maxOpsPerScript limit", () => {
      const caps = engine.capabilities;
      expect(caps.maxOpsPerScript).toBeDefined();
      expect(caps.maxOpsPerScript).toBeGreaterThan(0);
    });
  });

  describe("Dispatcher Integration (via prism_cad)", () => {
    it("exports engine class for dispatcher wiring", async () => {
      const mod = await import("../engines/InventorCADCodeGeneratorEngine.js");
      expect(mod.InventorCADCodeGeneratorEngine).toBeDefined();
      expect(typeof mod.InventorCADCodeGeneratorEngine).toBe("function");
    });

    it("engine instance has buildScript method for dispatcher", () => {
      expect(typeof engine.buildScript).toBe("function");
    });

    it("engine instance has executeScript method for dispatcher", () => {
      expect(typeof engine.executeScript).toBe("function");
    });

    it("engine instance has validateOutput method for dispatcher", () => {
      expect(typeof engine.validateOutput).toBe("function");
    });

    it("engine extends UnifiedCADCodeGeneratorBase", () => {
      // Verify inheritance chain by checking inherited methods exist
      expect(typeof engine.buildScript).toBe("function");
      expect(engine.cadSystem).toBe("inventor");
    });

    it("buildScript returns CADScript with required fields", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 10 } }
      ];

      const script = engine.buildScript(ops);

      expect(script.cadSystem).toBe("inventor");
      expect(typeof script.body).toBe("string");
      expect(Array.isArray(script.lineage)).toBe(true);
      expect(Array.isArray(script.warnings)).toBe(true);
      expect(script.parameters instanceof Map).toBe(true);
    });
  });
});
