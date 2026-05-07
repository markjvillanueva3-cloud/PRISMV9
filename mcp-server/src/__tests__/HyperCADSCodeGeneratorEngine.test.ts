/**
 * HyperCADSCodeGeneratorEngine — Unit Tests (U-CADC12)
 * Tests: Python code generation for hyperCAD-S Automation API
 * Coverage: capabilities, CADOperationKind, context variations, edge cases, dispatcher invocation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hyperCADSCodeGeneratorEngine } from "../engines/HyperCADSCodeGeneratorEngine.js";
import type { CADOperation, CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function op(kind: CADOperationKind, args: Record<string, unknown> = {}): CADOperation {
  return { kind, args };
}

// ── Test suites ──────────────────────────────────────────────────────────────
describe("HyperCADSCodeGeneratorEngine", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  describe("capabilities", () => {
    it("reports hypercads cadSystem with 42+ supported ops", () => {
      const caps = hyperCADSCodeGeneratorEngine.getCapabilities();
      expect(caps.cadSystem).toBe("hypercads");
      expect(caps.supportedOps.size).toBeGreaterThanOrEqual(42);
      expect(caps.supportsParametric).toBe(true);
      expect(caps.supportsUndo).toBe(true);
      expect(caps.version).toBe("2024");
    });

    it("supports sketch, feature, surface, boolean, transform, export, import ops", () => {
      const caps = hyperCADSCodeGeneratorEngine.getCapabilities();
      const required: CADOperationKind[] = [
        "sketch_create", "sketch_line", "sketch_circle", "sketch_rectangle", "sketch_spline",
        "feature_extrude", "feature_revolve", "feature_fillet", "feature_hole", "feature_pocket",
        "surface_loft", "surface_sweep", "surface_fill",
        "boolean_union", "boolean_subtract", "boolean_intersect",
        "transform_move", "transform_rotate", "transform_mirror", "transform_pattern_linear",
        "export_step", "export_stl", "import_step", "import_iges",
      ];
      for (const opKind of required) {
        expect(caps.supportedOps.has(opKind)).toBe(true);
      }
    });
  });

  describe("Python preamble", () => {
    it("includes hyperCAD-S imports and UNIT_FACTOR", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "mm" });
      expect(script.imports).toContain("import hcad");
      expect(script.imports).toContain("import hcad.geometry as geo");
      expect(script.imports).toContain("import hcad.modeling as mod");
      expect(script.body).toContain("UNIT_FACTOR = 1");
      expect(script.body).toContain("def main():");
    });

    it("sets UNIT_FACTOR=25.4 for inches", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "in" });
      expect(script.body).toContain("UNIT_FACTOR = 25.4");
    });
  });

  describe("sketch operations", () => {
    it("generates sketch_create, sketch_line, sketch_circle correctly", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("sketch_create", { plane: "XZ" }),
        op("sketch_line", { x1: 0, y1: 0, x2: 50, y2: 25 }),
        op("sketch_circle", { centerX: 10, centerY: 10, radius: 20 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain('hcad.create_sketch(plane="XZ")');
      expect(script.body).toContain("geo.Line(geo.Point(0*UNIT_FACTOR, 0*UNIT_FACTOR");
      expect(script.body).toContain("geo.Circle(geo.Point(10*UNIT_FACTOR, 10*UNIT_FACTOR");
      expect(script.body).toContain("20*UNIT_FACTOR)");
    });

    it("generates sketch_rectangle, sketch_polygon, sketch_spline", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("sketch_rectangle", { x: 0, y: 0, width: 100, height: 50 }),
        op("sketch_polygon", { centerX: 0, centerY: 0, radius: 30, sides: 6 }),
        op("sketch_spline", { points: [[0, 0, 0], [10, 5, 0], [20, 0, 0]] }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("geo.Rectangle(");
      expect(script.body).toContain("geo.Polygon(");
      expect(script.body).toContain("geo.Spline([");
    });
  });

  describe("feature operations", () => {
    it("generates feature_extrude with positive/negative direction", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 25, direction: "positive" }),
        op("feature_extrude", { depth: 10, direction: "negative" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mod.extrude(25 * UNIT_FACTOR)");
      expect(script.body).toContain("mod.extrude(-10 * UNIT_FACTOR)");
    });

    it("generates feature_revolve, feature_fillet, feature_chamfer, feature_hole", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("feature_revolve", { angle: 180, axisX: 1, axisY: 0, axisZ: 0 }),
        op("feature_fillet", { radius: 3 }),
        op("feature_chamfer", { distance: 2, angle: 45 }),
        op("feature_hole", { x: 50, y: 25, diameter: 10, depth: 30 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mod.revolve(180, geo.Vector(1, 0, 0))");
      expect(script.body).toContain("mod.fillet(3 * UNIT_FACTOR)");
      expect(script.body).toContain("mod.chamfer(2 * UNIT_FACTOR, 45)");
      expect(script.body).toContain("mod.drill_hole(");
    });
  });

  describe("boolean and transform operations", () => {
    it("generates boolean_union, boolean_subtract, boolean_intersect", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("boolean_union"), op("boolean_subtract"), op("boolean_intersect"),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mod.boolean_add()");
      expect(script.body).toContain("mod.boolean_subtract()");
      expect(script.body).toContain("mod.boolean_common()");
    });

    it("generates transform_move, transform_rotate, transform_pattern_linear", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("transform_move", { dx: 100, dy: 50, dz: 0 }),
        op("transform_rotate", { angle: 45, axisZ: 1 }),
        op("transform_pattern_linear", { dx: 25, dy: 0, count: 4 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mod.translate(geo.Vector(100*UNIT_FACTOR");
      expect(script.body).toContain("mod.rotate(45");
      expect(script.body).toContain("mod.linear_pattern(");
    });
  });

  describe("export/import operations", () => {
    it("generates export_step, export_stl with correct format", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("export_step", { filename: "part.step" }),
        op("export_stl", { filename: "mesh.stl" }),
      ], { projectName: "Test", units: "mm", outputDir: "/out" });
      expect(script.body).toContain('io.export("/out/part.step", format="STEP")');
      expect(script.body).toContain('format="STL"');
    });

    it("generates import_step, import_iges", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("import_step", { filepath: "input.step" }),
        op("import_iges", { filepath: "model.igs" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain('io.open("input.step")');
      expect(script.body).toContain('io.open("model.igs")');
    });
  });

  describe("execution (mocked)", () => {
    it("returns success with metrics in CI mode", async () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("feature_extrude", { depth: 10 })], { projectName: "Test", units: "mm" });
      const result = await hyperCADSCodeGeneratorEngine.executeScript(script);
      expect(result.ok).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.faceCount).toBeGreaterThan(0);
    });
  });

  describe("edge cases and failure modes", () => {
    it("handles empty operations array", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([], { projectName: "Empty", units: "mm" });
      expect(script.body).toContain("def main():");
      expect(script.warnings.length).toBe(0);
    });

    it("throws on unsupported operation kind", () => {
      expect(() => {
        hyperCADSCodeGeneratorEngine.buildScript([op("invalid_op" as CADOperationKind)], { projectName: "Test", units: "mm" });
      }).toThrow(/does not support operation/);
    });

    it("handles special characters in projectName", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Part #1 (Rev-A)", units: "mm" });
      expect(script.filename).toBe("Part__1__Rev_A_.py");
    });

    it("handles negative coordinate values", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_line", { x1: -100, y1: -50, x2: 100, y2: 50 })], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("geo.Point(-100*UNIT_FACTOR, -50*UNIT_FACTOR");
    });

    it("handles extreme dimensions (0.001mm, 10000mm)", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 0.001 }),
        op("feature_extrude", { depth: 10000 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mod.extrude(0.001 * UNIT_FACTOR)");
      expect(script.body).toContain("mod.extrude(10000 * UNIT_FACTOR)");
    });

    it("handles NaN/undefined gracefully with defaults", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("sketch_line", { x1: undefined, y1: NaN }),
        op("feature_extrude", {}),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("geo.Point(0*UNIT_FACTOR");
      expect(script.body).toContain("mod.extrude(10 * UNIT_FACTOR)");
    });
  });

  describe("parameter tracking", () => {
    it("captures feature parameters via emitter.parameter()", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 20 }),
        op("feature_hole", { diameter: 8 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.parameters.has("extrude_depth")).toBe(true);
      expect(script.parameters.has("hole_diameter")).toBe(true);
    });
  });

  describe("context variations (mm, in, 2023/2024/2025)", () => {
    it("generates correct units comment for mm", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm" });
      expect(script.body).toContain("# Units: mm");
    });

    it("generates correct units comment for in", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "in" });
      expect(script.body).toContain("# Units: in");
    });

    it("generates correct target version 2023", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "2023" });
      expect(script.body).toContain("# Target: hyperCAD-S 2023");
    });

    it("generates correct target version 2025", () => {
      const script = hyperCADSCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "2025" });
      expect(script.body).toContain("# Target: hyperCAD-S 2025");
    });
  });
});

describe("prism_cad dispatcher - hypercads actions (direct engine)", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("hypercads_capabilities via engine returns cadSystem and supportedOps", () => {
    const caps = hyperCADSCodeGeneratorEngine.getCapabilities();
    expect(caps.cadSystem).toBe("hypercads");
    expect(caps.supportedOps.size).toBeGreaterThanOrEqual(42);
    expect(caps.supportsParametric).toBe(true);
  });

  it("hypercads_generate_script via engine returns Python script with imports", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { depth: 15 } },
    ];
    const script = hyperCADSCodeGeneratorEngine.buildScript(ops, { projectName: "TestPart", units: "mm" });
    expect(script.imports).toContain("import hcad");
    expect(script.body).toContain("mod.extrude(15 * UNIT_FACTOR)");
    expect(script.filename).toBe("TestPart.py");
    expect(script.imports).toContain("import hcad.geometry as geo");
  });

  it("hypercads_build_part via engine executes and returns mock metrics", async () => {
    const ops: CADOperation[] = [
      { kind: "sketch_circle", args: { radius: 10 } },
      { kind: "feature_extrude", args: { depth: 5 } },
    ];
    const script = hyperCADSCodeGeneratorEngine.buildScript(ops, { projectName: "Cylinder", units: "mm" });
    expect(script.body).toContain("geo.Circle");
    const result = await hyperCADSCodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("hypercads_execute via engine runs script and returns result", async () => {
    const script = { body: "import hcad\nprint('hello')", cadSystem: "hypercads" as const, filename: "test.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
    const result = await hyperCADSCodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
