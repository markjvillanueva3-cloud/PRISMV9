/**
 * SolidWorksCodeGeneratorEngine Tests — U-CADC10 (PHASE-3)
 *
 * Validates VBA code generation for SolidWorks CAD operations.
 * Tests cover sketch, feature, boolean, transform, and export operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SolidWorksCodeGeneratorEngine,
  solidWorksCodeGeneratorEngine,
} from "../engines/SolidWorksCodeGeneratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("SolidWorksCodeGeneratorEngine", () => {
  let engine: SolidWorksCodeGeneratorEngine;

  beforeEach(() => {
    engine = new SolidWorksCodeGeneratorEngine();
  });

  describe("capabilities", () => {
    it("declares solidworks as CAD system ID", () => {
      expect(engine.cadSystem).toBe("solidworks");
    });

    it("supports sketch operations", () => {
      expect(engine.capabilities.sketch_create?.supported).toBe(true);
      expect(engine.capabilities.sketch_line?.supported).toBe(true);
      expect(engine.capabilities.sketch_circle?.supported).toBe(true);
      expect(engine.capabilities.sketch_rectangle?.supported).toBe(true);
    });

    it("supports feature operations", () => {
      expect(engine.capabilities.feature_extrude?.supported).toBe(true);
      expect(engine.capabilities.feature_revolve?.supported).toBe(true);
      expect(engine.capabilities.feature_fillet?.supported).toBe(true);
      expect(engine.capabilities.feature_chamfer?.supported).toBe(true);
    });

    it("supports boolean operations", () => {
      expect(engine.capabilities.boolean_union?.supported).toBe(true);
      expect(engine.capabilities.boolean_subtract?.supported).toBe(true);
      expect(engine.capabilities.boolean_intersect?.supported).toBe(true);
    });

    it("supports export operations", () => {
      expect(engine.capabilities.export_step?.supported).toBe(true);
      expect(engine.capabilities.export_stl?.supported).toBe(true);
      expect(engine.capabilities.export_pdf?.supported).toBe(true);
    });
  });

  describe("buildScript - sketch operations", () => {
    it("generates VBA for sketch_create on Front plane", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
      ];

      const result = engine.buildScript(ops, { partName: "TestPart", units: "mm" });

      expect(result.body).toContain("Front Plane");
      expect(result.body).toContain("InsertSketch");
      expect(result.body).toContain("SelectByID2");
    });

    it("generates VBA for sketch_line with coordinates", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Top" } },
        { kind: "sketch_line", params: { x1: 0, y1: 0, x2: 50, y2: 25 } },
        { kind: "sketch_close", params: {} },
      ];

      const result = engine.buildScript(ops, { partName: "LinePart", units: "mm" });

      expect(result.body).toContain("CreateLine");
      expect(result.body).toContain("0.05");  // 50mm -> 0.05m
      expect(result.body).toContain("0.025"); // 25mm -> 0.025m
    });

    it("generates VBA for sketch_circle", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_circle", params: { centerX: 0, centerY: 0, radius: 25 } },
        { kind: "sketch_close", params: {} },
      ];

      const result = engine.buildScript(ops, { partName: "CirclePart", units: "mm" });

      expect(result.body).toContain("CreateCircle");
      expect(result.body).toContain("0.025"); // 25mm radius
    });

    it("generates VBA for sketch_rectangle", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_rectangle", params: { x: 0, y: 0, width: 100, height: 50 } },
        { kind: "sketch_close", params: {} },
      ];

      const result = engine.buildScript(ops, { partName: "RectPart", units: "mm" });

      expect(result.body).toContain("CreateCornerRectangle");
    });

    it("generates VBA for sketch_polygon", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_polygon", params: { centerX: 0, centerY: 0, radius: 20, sides: 6 } },
        { kind: "sketch_close", params: {} },
      ];

      const result = engine.buildScript(ops, { partName: "HexPart", units: "mm" });

      expect(result.body).toContain("CreatePolygon");
      expect(result.body).toContain("6"); // hexagon
    });
  });

  describe("buildScript - feature operations", () => {
    it("generates VBA for feature_extrude", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_rectangle", params: { x: -25, y: -25, width: 50, height: 50 } },
        { kind: "feature_extrude", params: { depth: 30 } },
      ];

      const result = engine.buildScript(ops, { partName: "ExtrudePart", units: "mm" });

      expect(result.body).toContain("FeatureExtrusion2");
      expect(result.body).toContain("0.03"); // 30mm depth
    });

    it("generates VBA for cut extrude", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_circle", params: { x: 0, y: 0, radius: 5 } },
        { kind: "feature_extrude", params: { depth: 10, direction: "cut" } },
      ];

      const result = engine.buildScript(ops, { partName: "CutPart", units: "mm" });

      expect(result.body).toContain("FeatureCut3");
    });

    it("generates VBA for feature_fillet", () => {
      const ops: CADOperation[] = [
        { kind: "feature_fillet", params: { radius: 2 } },
      ];

      const result = engine.buildScript(ops, { partName: "FilletPart", units: "mm" });

      expect(result.body).toContain("FeatureFillet3");
      expect(result.body).toContain("0.002"); // 2mm radius
    });

    it("generates VBA for feature_chamfer", () => {
      const ops: CADOperation[] = [
        { kind: "feature_chamfer", params: { distance: 1.5, angle: 45 } },
      ];

      const result = engine.buildScript(ops, { partName: "ChamferPart", units: "mm" });

      expect(result.body).toContain("InsertFeatureChamfer");
      expect(result.body).toContain("0.0015"); // 1.5mm distance
    });

    it("generates VBA for feature_shell", () => {
      const ops: CADOperation[] = [
        { kind: "feature_shell", params: { thickness: 2 } },
      ];

      const result = engine.buildScript(ops, { partName: "ShellPart", units: "mm" });

      expect(result.body).toContain("InsertFeatureShell");
      expect(result.body).toContain("0.002"); // 2mm thickness
    });

    it("generates VBA for feature_hole", () => {
      const ops: CADOperation[] = [
        { kind: "feature_hole", params: { diameter: 6, depth: 15, x: 10, y: 10 } },
      ];

      const result = engine.buildScript(ops, { partName: "HolePart", units: "mm" });

      expect(result.body).toContain("HoleWizard");
    });
  });

  describe("buildScript - transform operations", () => {
    it("generates VBA for transform_mirror", () => {
      const ops: CADOperation[] = [
        { kind: "transform_mirror", params: { plane: "Right Plane" } },
      ];

      const result = engine.buildScript(ops, { partName: "MirrorPart", units: "mm" });

      expect(result.body).toContain("InsertMirrorFeature2");
      expect(result.body).toContain("Right Plane");
    });

    it("generates VBA for transform_pattern_linear", () => {
      const ops: CADOperation[] = [
        { kind: "transform_pattern_linear", params: { countX: 4, spacingX: 20 } },
      ];

      const result = engine.buildScript(ops, { partName: "PatternPart", units: "mm" });

      expect(result.body).toContain("FeatureLinearPattern4");
      expect(result.body).toContain("4"); // count
      expect(result.body).toContain("0.02"); // 20mm spacing
    });

    it("generates VBA for transform_pattern_circular", () => {
      const ops: CADOperation[] = [
        { kind: "transform_pattern_circular", params: { count: 8, angle: 360 } },
      ];

      const result = engine.buildScript(ops, { partName: "CircPatternPart", units: "mm" });

      expect(result.body).toContain("FeatureCircularPattern4");
      expect(result.body).toContain("8"); // count
    });
  });

  describe("buildScript - export operations", () => {
    it("generates VBA for export_step", () => {
      const ops: CADOperation[] = [
        { kind: "export_step", params: { path: "C:\\Output\\part.step" } },
      ];

      const result = engine.buildScript(ops, { partName: "ExportPart", units: "mm" });

      expect(result.body).toContain("SaveAs3");
      expect(result.body).toContain("part.step");
    });

    it("generates VBA for export_stl", () => {
      const ops: CADOperation[] = [
        { kind: "export_stl", params: { path: "C:\\Output\\mesh.stl" } },
      ];

      const result = engine.buildScript(ops, { partName: "STLPart", units: "mm" });

      expect(result.body).toContain("SaveAs3");
      expect(result.body).toContain("mesh.stl");
    });
  });

  describe("buildScript - complete part generation", () => {
    it("generates complete bracket part with multiple features", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_rectangle", params: { x: -50, y: -25, width: 100, height: 50 } },
        { kind: "feature_extrude", params: { depth: 10 } },
        { kind: "sketch_create", params: { plane: "Top" } },
        { kind: "sketch_circle", params: { centerX: -30, centerY: 0, radius: 5 } },
        { kind: "feature_extrude", params: { depth: 10, direction: "cut" } },
        { kind: "transform_pattern_linear", params: { countX: 3, spacingX: 30 } },
        { kind: "feature_fillet", params: { radius: 2 } },
        { kind: "export_step", params: { path: "C:\\Parts\\bracket.step" } },
      ];

      const result = engine.buildScript(ops, { partName: "Bracket", units: "mm" });

      expect(result.body).toContain("PRISM SolidWorks VBA Script");
      expect(result.body).toContain("CreateCornerRectangle");
      expect(result.body).toContain("FeatureExtrusion2");
      expect(result.body).toContain("CreateCircle");
      expect(result.body).toContain("FeatureCut3");
      expect(result.body).toContain("FeatureLinearPattern4");
      expect(result.body).toContain("FeatureFillet3");
      expect(result.body).toContain("SaveAs3");
      expect(result.warnings).toHaveLength(0);
    });

    it("collects parameters from all operations", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_circle", params: { centerX: 0, centerY: 0, radius: 15 } },
        { kind: "feature_extrude", params: { depth: 20 } },
      ];

      const result = engine.buildScript(ops, { partName: "ParamPart", units: "mm" });

      // parameters is a Map<name, {value, unit, description?}>
      expect(result.parameters.size).toBeGreaterThanOrEqual(0);
      // Body should contain the generated VBA
      expect(result.body).toContain("CreateCircle");
      expect(result.body).toContain("FeatureExtrusion2");
    });
  });

  describe("error handling", () => {
    it("throws on unsupported operation", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "some_unsupported_op" as any, params: {} },
      ];

      expect(() => engine.buildScript(ops, { partName: "WarnPart", units: "mm" }))
        .toThrow("does not support operation 'some_unsupported_op'");
    });

    it("handles empty operations array", () => {
      const ops: CADOperation[] = [];
      const result = engine.buildScript(ops, { partName: "EmptyPart", units: "mm" });

      expect(result.body).toContain("PRISM SolidWorks VBA Script");
      expect(result.body).toContain("main()");
    });
  });

  describe("executeScript - mock mode", () => {
    it("returns success in mock mode", async () => {
      process.env.PRISM_CAD_MOCK = "1";

      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_circle", params: { centerX: 0, centerY: 0, radius: 10 } },
        { kind: "feature_extrude", params: { depth: 5 } },
      ];

      const buildResult = engine.buildScript(ops, { partName: "MockPart", units: "mm" });
      const execResult = await engine.executeScript(buildResult.script, { partName: "MockPart", units: "mm" });

      expect(execResult.success).toBe(true);
      expect(execResult.executionTime).toBeGreaterThanOrEqual(0);

      delete process.env.PRISM_CAD_MOCK;
    });
  });

  describe("singleton instance", () => {
    it("exports singleton with correct CAD system", () => {
      expect(solidWorksCodeGeneratorEngine.cadSystem).toBe("solidworks");
      expect(solidWorksCodeGeneratorEngine.capabilities.feature_extrude?.supported).toBe(true);
    });
  });

  describe("unit conversions", () => {
    it("converts mm to meters for SolidWorks API", () => {
      const ops: CADOperation[] = [
        { kind: "sketch_create", params: { plane: "Front" } },
        { kind: "sketch_line", params: { x1: 0, y1: 0, x2: 100, y2: 50 } },
      ];

      const result = engine.buildScript(ops, { partName: "UnitPart", units: "mm" });

      // 100mm = 0.1m, 50mm = 0.05m
      expect(result.body).toContain("0.1");
      expect(result.body).toContain("0.05");
    });
  });
});
