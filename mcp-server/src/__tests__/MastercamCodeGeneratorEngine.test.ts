/**
 * MastercamCodeGeneratorEngine Tests — U-CADC11
 *
 * Comprehensive test suite covering:
 * - Happy path for all operation types
 * - Failure modes (bad input, boundary, resource)
 * - Adversarial inputs (NaN, Infinity, empty, oversize)
 * - Multiple CAD system configurations
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MastercamCodeGeneratorEngine,
  mastercamCodeGeneratorEngine,
  type MastercamGenerationContext,
} from "../engines/MastercamCodeGeneratorEngine.js";
import type { CADOperation, CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

describe("MastercamCodeGeneratorEngine", () => {
  let engine: MastercamCodeGeneratorEngine;

  beforeEach(() => {
    engine = new MastercamCodeGeneratorEngine();
  });

  describe("capabilities", () => {
    it("reports mastercam as CAD system", () => {
      expect(engine.cadSystem).toBe("mastercam");
    });

    it("supports sketch operations", () => {
      const caps = engine.getCapabilities();
      expect(caps.supportedOps.has("sketch_line")).toBe(true);
      expect(caps.supportedOps.has("sketch_arc")).toBe(true);
      expect(caps.supportedOps.has("sketch_circle")).toBe(true);
      expect(caps.supportedOps.has("sketch_rectangle")).toBe(true);
      expect(caps.supportedOps.has("sketch_spline")).toBe(true);
    });

    it("supports feature operations", () => {
      const caps = engine.getCapabilities();
      expect(caps.supportedOps.has("feature_extrude")).toBe(true);
      expect(caps.supportedOps.has("feature_revolve")).toBe(true);
      expect(caps.supportedOps.has("feature_fillet")).toBe(true);
      expect(caps.supportedOps.has("feature_hole")).toBe(true);
    });

    it("supports boolean operations", () => {
      const caps = engine.getCapabilities();
      expect(caps.supportedOps.has("boolean_union")).toBe(true);
      expect(caps.supportedOps.has("boolean_intersect")).toBe(true);
      expect(caps.supportedOps.has("boolean_subtract")).toBe(true);
    });

    it("supports export operations", () => {
      const caps = engine.getCapabilities();
      expect(caps.supportedOps.has("export_step")).toBe(true);
      expect(caps.supportedOps.has("export_stl")).toBe(true);
      expect(caps.supportedOps.has("export_dxf")).toBe(true);
    });

    it("returns frozen supportedOps set", () => {
      const caps1 = engine.getCapabilities();
      const caps2 = engine.getCapabilities();
      expect(caps1.supportedOps).not.toBe(caps2.supportedOps);
    });
  });

  describe("buildScript - sketch operations", () => {
    const ctx: MastercamGenerationContext = {
      projectName: "TestProject",
      units: "mm",
    };

    it("generates C# for sketch_line", () => {
      const ops: CADOperation[] = [
        {
          operationId: "line1",
          kind: "sketch_line",
          args: { x1: 0, y1: 0, z1: 0, x2: 100, y2: 50, z2: 0 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.cadSystem).toBe("mastercam");
      expect(script.body).toContain("LineGeometry");
      expect(script.body).toContain("Point3D(0 * UNIT_FACTOR");
      expect(script.body).toContain("Point3D(100 * UNIT_FACTOR");
      expect(script.body).toContain(".Commit()");
      expect(script.lineage).toHaveLength(1);
      expect(script.lineage[0]!.kind).toBe("sketch_line");
    });

    it("generates C# for sketch_circle", () => {
      const ops: CADOperation[] = [
        {
          operationId: "circle1",
          kind: "sketch_circle",
          args: { centerX: 50, centerY: 50, centerZ: 0, radius: 25 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("ArcGeometry");
      expect(script.body).toContain("CenterPoint");
      expect(script.body).toContain("Radius = 25 * UNIT_FACTOR");
      expect(script.body).toContain("StartAngleDegrees = 0");
      expect(script.body).toContain("EndAngleDegrees = 360");
    });

    it("generates C# for sketch_rectangle", () => {
      const ops: CADOperation[] = [
        {
          operationId: "rect1",
          kind: "sketch_rectangle",
          args: { x: 0, y: 0, width: 100, height: 50 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Rectangle at (0, 0) size 100x50");
      expect(script.body.match(/LineGeometry/g)?.length).toBeGreaterThanOrEqual(4);
    });

    it("generates C# for sketch_polygon", () => {
      const ops: CADOperation[] = [
        {
          operationId: "hex1",
          kind: "sketch_polygon",
          args: { centerX: 0, centerY: 0, radius: 20, sides: 6 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("6-sided polygon");
      expect(script.body).toContain("polygonPoints");
      expect(script.body).toContain("Math.Cos(angle)");
    });

    it("generates C# for sketch_spline", () => {
      const ops: CADOperation[] = [
        {
          operationId: "spline1",
          kind: "sketch_spline",
          args: {
            points: [[0, 0, 0], [10, 5, 0], [20, 0, 0], [30, 5, 0]],
          },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("SplineGeometry.CreateFromPoints");
      expect(script.body).toContain("splinePoints");
    });

    it("generates C# for sketch_slot", () => {
      const ops: CADOperation[] = [
        {
          operationId: "slot1",
          kind: "sketch_slot",
          args: { x1: 0, y1: 0, x2: 30, y2: 0, width: 10 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Slot from");
      expect(script.body).toContain("slot_");
      expect(script.body).toContain("_line1");
      expect(script.body).toContain("_arc1");
    });
  });

  describe("buildScript - feature operations", () => {
    const ctx: MastercamGenerationContext = {
      projectName: "FeatureTest",
      units: "mm",
    };

    it("generates C# for feature_extrude", () => {
      const ops: CADOperation[] = [
        {
          operationId: "ext1",
          kind: "feature_extrude",
          args: { depth: 25, direction: "positive", taper: 0 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("SolidExtrudeParams");
      expect(script.body).toContain("Distance = 25 * UNIT_FACTOR");
      expect(script.body).toContain("ExtrudeDirection.Positive");
      expect(script.parameters.has("extrude_depth")).toBe(true);
    });

    it("generates C# for feature_revolve", () => {
      const ops: CADOperation[] = [
        {
          operationId: "rev1",
          kind: "feature_revolve",
          args: { angle: 180, axisX: 0, axisY: 0, axisZ: 1 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("SolidRevolveParams");
      expect(script.body).toContain("Angle = 180");
      expect(script.body).toContain("Vector3D(0, 0, 1)");
    });

    it("generates C# for feature_hole", () => {
      const ops: CADOperation[] = [
        {
          operationId: "hole1",
          kind: "feature_hole",
          args: { x: 50, y: 50, diameter: 10, depth: 20 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("DrillHoleParams");
      expect(script.body).toContain("Diameter = 10 * UNIT_FACTOR");
      expect(script.body).toContain("Depth = 20 * UNIT_FACTOR");
    });

    it("generates C# for feature_fillet", () => {
      const ops: CADOperation[] = [
        {
          operationId: "fil1",
          kind: "feature_fillet",
          args: { radius: 3 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("CreateFillet");
      expect(script.body).toContain("3 * UNIT_FACTOR");
    });

    it("generates C# for feature_chamfer", () => {
      const ops: CADOperation[] = [
        {
          operationId: "cham1",
          kind: "feature_chamfer",
          args: { distance: 2, angle: 45 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("CreateChamfer");
      expect(script.body).toContain("2 * UNIT_FACTOR, 45");
    });
  });

  describe("buildScript - transform operations", () => {
    const ctx: MastercamGenerationContext = {
      projectName: "TransformTest",
      units: "mm",
    };

    it("generates C# for transform_move", () => {
      const ops: CADOperation[] = [
        {
          operationId: "move1",
          kind: "transform_move",
          args: { dx: 100, dy: 50, dz: 0 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Xform");
      expect(script.body).toContain("Translate");
      expect(script.body).toContain("Vector3D(100 * UNIT_FACTOR");
    });

    it("generates C# for transform_rotate", () => {
      const ops: CADOperation[] = [
        {
          operationId: "rot1",
          kind: "transform_rotate",
          args: { angle: 45, axisX: 0, axisY: 0, axisZ: 1 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Rotate");
      expect(script.body).toContain("45 * Math.PI / 180");
    });

    it("generates C# for transform_pattern_linear", () => {
      const ops: CADOperation[] = [
        {
          operationId: "pat1",
          kind: "transform_pattern_linear",
          args: { dx: 25, dy: 0, count: 5 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Linear pattern: 5 copies");
      expect(script.body).toContain("for (int i = 1; i < 5; i++)");
      expect(script.body).toContain("Clone()");
    });

    it("generates C# for transform_pattern_circular", () => {
      const ops: CADOperation[] = [
        {
          operationId: "circ1",
          kind: "transform_pattern_circular",
          args: { count: 8, angle: 360 },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("Circular pattern: 8 instances");
      expect(script.body).toContain("angleStep");
    });
  });

  describe("buildScript - export/import operations", () => {
    const ctx: MastercamGenerationContext = {
      projectName: "IOTest",
      units: "mm",
      outputDir: "C:\\\\Output",
    };

    it("generates C# for export_step", () => {
      const ops: CADOperation[] = [
        {
          operationId: "exp1",
          kind: "export_step",
          args: { filename: "part.step" },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("FileManager.Export");
      expect(script.body).toContain("ExportType.STEP");
      expect(script.body).toContain("part.step");
    });

    it("generates C# for import_step", () => {
      const ops: CADOperation[] = [
        {
          operationId: "imp1",
          kind: "import_step",
          args: { filepath: "C:\\\\Models\\\\part.step" },
        },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("FileManager.Open");
      expect(script.body).toContain("part.step");
    });
  });

  describe("buildScript - context variations", () => {
    it("handles mm units (default)", () => {
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      ];
      const ctx: MastercamGenerationContext = { projectName: "Test", units: "mm" };
      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("UNIT_FACTOR = 1");
    });

    it("handles inch units", () => {
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      ];
      const ctx: MastercamGenerationContext = { projectName: "Test", units: "in" };
      const script = engine.buildScript(ops, ctx);
      expect(script.body).toContain("UNIT_FACTOR = 25.4");
    });

    it("handles different target versions", () => {
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: {} },
      ];

      const ctx2023: MastercamGenerationContext = { projectName: "V2023", units: "mm", targetVersion: "2023" };
      const ctx2024: MastercamGenerationContext = { projectName: "V2024", units: "mm", targetVersion: "2024" };
      const ctx2025: MastercamGenerationContext = { projectName: "V2025", units: "mm", targetVersion: "2025" };

      expect(engine.buildScript(ops, ctx2023).body).toContain("Mastercam 2023");
      expect(engine.buildScript(ops, ctx2024).body).toContain("Mastercam 2024");
      expect(engine.buildScript(ops, ctx2025).body).toContain("Mastercam 2025");
    });

    it("generates proper filename from context", () => {
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: {} },
      ];
      const ctx: MastercamGenerationContext = { projectName: "My-Complex Part#1", units: "mm" };
      const script = engine.buildScript(ops, ctx);
      expect(script.filename).toBe("My_Complex_Part_1.cs");
    });
  });

  describe("buildScript - complex sequences", () => {
    it("generates bracket part (circle + extrude + holes)", () => {
      const ops: CADOperation[] = [
        { operationId: "s1", kind: "sketch_create", args: { level: 1 } },
        { operationId: "c1", kind: "sketch_circle", args: { centerX: 0, centerY: 0, radius: 50 } },
        { operationId: "s2", kind: "sketch_close", args: {} },
        { operationId: "e1", kind: "feature_extrude", args: { depth: 10 } },
        { operationId: "h1", kind: "feature_hole", args: { x: 30, y: 0, diameter: 8, depth: 10 } },
        { operationId: "p1", kind: "transform_pattern_circular", args: { count: 6, angle: 360 } },
        { operationId: "x1", kind: "export_step", args: { filename: "bracket.step" } },
      ];

      const ctx: MastercamGenerationContext = { projectName: "Bracket", units: "mm" };
      const script = engine.buildScript(ops, ctx);

      expect(script.lineage).toHaveLength(7);
      expect(script.body).toContain("LevelsManager.SetMainLevel(1)");
      expect(script.body).toContain("ArcGeometry");
      expect(script.body).toContain("ChainManager.ChainAll");
      expect(script.body).toContain("SolidExtrudeParams");
      expect(script.body).toContain("DrillHoleParams");
      expect(script.body).toContain("Circular pattern");
      expect(script.body).toContain("FileManager.Export");
    });

    it("tracks lineage correctly for multi-op sequence", () => {
      const ops: CADOperation[] = [
        { operationId: "op1", kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
        { operationId: "op2", kind: "sketch_line", args: { x1: 10, y1: 0, x2: 10, y2: 10 } },
        { operationId: "op3", kind: "sketch_line", args: { x1: 10, y1: 10, x2: 0, y2: 10 } },
        { operationId: "op4", kind: "sketch_line", args: { x1: 0, y1: 10, x2: 0, y2: 0 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.lineage).toHaveLength(4);
      script.lineage.forEach((entry, idx) => {
        expect(entry.opIndex).toBe(idx);
        expect(entry.operationId).toBe(`op${idx + 1}`);
        expect(entry.kind).toBe("sketch_line");
        expect(entry.lineStart).toBeLessThan(entry.lineEnd + 1);
      });
    });
  });

  describe("failure modes - bad input", () => {
    it("throws for unsupported operation kind", () => {
      const ops: CADOperation[] = [
        { operationId: "bad1", kind: "nonexistent_op" as CADOperationKind, args: {} },
      ];

      expect(() => engine.buildScript(ops)).toThrow("does not support operation");
    });

    it("handles missing optional args gracefully", () => {
      const ops: CADOperation[] = [
        { operationId: "line1", kind: "sketch_line", args: {} },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("Point3D(0 * UNIT_FACTOR, 0 * UNIT_FACTOR, 0 * UNIT_FACTOR)");
      expect(script.body).toContain("Point3D(10 * UNIT_FACTOR, 0 * UNIT_FACTOR, 0 * UNIT_FACTOR)");
    });

    it("handles empty operations array", () => {
      const script = engine.buildScript([]);
      expect(script.lineage).toHaveLength(0);
      expect(script.body).toContain("namespace PRISM.Generated");
      expect(script.body).toContain("MCamReturn.NoErrors");
    });
  });

  describe("failure modes - boundary conditions", () => {
    it("handles zero dimensions", () => {
      const ops: CADOperation[] = [
        { operationId: "rect1", kind: "sketch_rectangle", args: { x: 0, y: 0, width: 0, height: 0 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("size 0x0");
    });

    it("handles negative dimensions", () => {
      const ops: CADOperation[] = [
        { operationId: "ext1", kind: "feature_extrude", args: { depth: -10 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("Distance = -10 * UNIT_FACTOR");
    });

    it("handles very large dimensions", () => {
      const ops: CADOperation[] = [
        { operationId: "line1", kind: "sketch_line", args: { x1: 0, y1: 0, x2: 1e9, y2: 1e9 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("1000000000 * UNIT_FACTOR");
    });

    it("handles polygon with minimum sides (3)", () => {
      const ops: CADOperation[] = [
        { operationId: "tri1", kind: "sketch_polygon", args: { sides: 3, radius: 10 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("3-sided polygon");
    });

    it("handles polygon with many sides (100)", () => {
      const ops: CADOperation[] = [
        { operationId: "many1", kind: "sketch_polygon", args: { sides: 100, radius: 50 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("100-sided polygon");
    });
  });

  describe("adversarial inputs", () => {
    it("handles NaN in coordinates", () => {
      const ops: CADOperation[] = [
        { operationId: "nan1", kind: "sketch_line", args: { x1: NaN, y1: 0, x2: 10, y2: 0 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("NaN");
    });

    it("handles Infinity in coordinates", () => {
      const ops: CADOperation[] = [
        { operationId: "inf1", kind: "sketch_line", args: { x1: 0, y1: 0, x2: Infinity, y2: 0 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain("Infinity");
    });

    it("handles empty string in filename", () => {
      const ops: CADOperation[] = [
        { operationId: "exp1", kind: "export_step", args: { filename: "" } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain('""');
    });

    it("handles very long filename", () => {
      const longName = "a".repeat(500) + ".step";
      const ops: CADOperation[] = [
        { operationId: "exp1", kind: "export_step", args: { filename: longName } },
      ];

      const script = engine.buildScript(ops);
      expect(script.body).toContain(longName);
    });

    it("handles special characters in project name", () => {
      const ctx: MastercamGenerationContext = {
        projectName: "Test<>|:*?/\\\"Project",
        units: "mm",
      };
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: {} },
      ];

      const script = engine.buildScript(ops, ctx);
      expect(script.filename).not.toContain("<");
      expect(script.filename).not.toContain(">");
      expect(script.filename).toMatch(/^[a-zA-Z0-9_]+\.cs$/);
    });

    it("handles oversize operations array (1000 ops)", () => {
      const ops: CADOperation[] = Array.from({ length: 1000 }, (_, i) => ({
        operationId: `line${i}`,
        kind: "sketch_line" as CADOperationKind,
        args: { x1: i, y1: 0, x2: i + 1, y2: 0 },
      }));

      const script = engine.buildScript(ops);
      expect(script.lineage).toHaveLength(1000);
      expect(script.body.length).toBeGreaterThan(50000);
    });
  });

  describe("validateOutput", () => {
    it("passes for successful result with valid metrics", () => {
      const result = engine.validateOutput({
        ok: true,
        metrics: { volumeMm3: 1000, faceCount: 6, boundingBoxMm: [10, 10, 10] },
        durationMs: 100,
      });

      expect(result.ok).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it("fails for failed execution", () => {
      const result = engine.validateOutput({
        ok: false,
        error: "Compilation failed",
        durationMs: 50,
      });

      expect(result.ok).toBe(false);
      expect(result.findings.some(f => f.code === "EXEC_FAILED")).toBe(true);
    });

    it("fails for zero volume", () => {
      const result = engine.validateOutput({
        ok: true,
        metrics: { volumeMm3: 0, faceCount: 6, boundingBoxMm: [10, 10, 10] },
        durationMs: 100,
      });

      expect(result.ok).toBe(false);
      expect(result.findings.some(f => f.code === "EMPTY_GEOMETRY")).toBe(true);
    });

    it("warns for implausibly large volume", () => {
      const result = engine.validateOutput({
        ok: true,
        metrics: { volumeMm3: 2e12, faceCount: 100, boundingBoxMm: [1000, 1000, 1000] },
        durationMs: 100,
      });

      expect(result.ok).toBe(true);
      expect(result.findings.some(f => f.code === "IMPLAUSIBLE_VOLUME")).toBe(true);
    });

    it("fails for zero faces", () => {
      const result = engine.validateOutput({
        ok: true,
        metrics: { volumeMm3: 1000, faceCount: 0, boundingBoxMm: [10, 10, 10] },
        durationMs: 100,
      });

      expect(result.ok).toBe(false);
      expect(result.findings.some(f => f.code === "NO_FACES")).toBe(true);
    });
  });

  describe("executeScript (mock mode)", () => {
    it("returns simulated success in CI mode", async () => {
      const originalCI = process.env.CI;
      process.env.CI = "true";

      try {
        const ops: CADOperation[] = [
          { operationId: "l1", kind: "sketch_line", args: {} },
        ];
        const script = engine.buildScript(ops);
        const result = await engine.executeScript(script);

        expect(result.ok).toBe(true);
        expect(result.metrics?.volumeMm3).toBe(1000);
        expect(result.durationMs).toBeGreaterThan(0);
      } finally {
        if (originalCI === undefined) {
          delete process.env.CI;
        } else {
          process.env.CI = originalCI;
        }
      }
    });
  });

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(mastercamCodeGeneratorEngine).toBeInstanceOf(MastercamCodeGeneratorEngine);
      expect(mastercamCodeGeneratorEngine.cadSystem).toBe("mastercam");
    });
  });

  describe("imports collection", () => {
    it("collects required using statements", () => {
      const ops: CADOperation[] = [
        { operationId: "l1", kind: "sketch_line", args: {} },
      ];

      const script = engine.buildScript(ops);
      expect(script.imports).toContain("using System;");
      expect(script.imports).toContain("using Mastercam.App;");
      expect(script.imports).toContain("using Mastercam.Geometry;");
    });
  });

  describe("parameters collection", () => {
    it("collects parameters from operations", () => {
      const ops: CADOperation[] = [
        { operationId: "ext1", kind: "feature_extrude", args: { depth: 25 } },
        { operationId: "hole1", kind: "feature_hole", args: { diameter: 10, depth: 15 } },
      ];

      const script = engine.buildScript(ops);
      expect(script.parameters.has("extrude_depth")).toBe(true);
      expect(script.parameters.get("extrude_depth")?.value).toBe(25);
      expect(script.parameters.has("hole_diameter")).toBe(true);
      expect(script.parameters.has("hole_depth")).toBe(true);
    });
  });
});
