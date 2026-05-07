/**
 * NXCodeGeneratorEngine — Unit Tests (U-CADC14)
 * Tests: Python code generation for Siemens NX NXOpen API
 * Coverage: capabilities, CADOperationKind, context variations, edge cases, dispatcher invocation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nxCodeGeneratorEngine } from "../engines/NXCodeGeneratorEngine.js";
import type { CADOperation, CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function op(kind: CADOperationKind, args: Record<string, unknown> = {}): CADOperation {
  return { kind, args };
}

// ── Test suites ──────────────────────────────────────────────────────────────
describe("NXCodeGeneratorEngine", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  describe("capabilities", () => {
    it("reports nx cadSystem with 60+ supported ops", () => {
      const caps = nxCodeGeneratorEngine.getCapabilities();
      expect(caps.cadSystem).toBe("nx");
      expect(caps.supportedOps.size).toBeGreaterThanOrEqual(60);
      expect(caps.supportsParametric).toBe(true);
      expect(caps.supportsUndo).toBe(true);
      expect(caps.version).toBe("NX2306");
    });

    it("supports sketch, feature, surface, boolean, transform, export, import, assembly ops", () => {
      const caps = nxCodeGeneratorEngine.getCapabilities();
      const required: CADOperationKind[] = [
        "sketch_create", "sketch_line", "sketch_circle", "sketch_rectangle", "sketch_spline",
        "feature_extrude", "feature_revolve", "feature_fillet", "feature_hole", "feature_pocket",
        "surface_extrude", "surface_loft", "surface_fill",
        "boolean_union", "boolean_subtract", "boolean_intersect",
        "transform_move", "transform_rotate", "transform_mirror", "transform_pattern_linear",
        "export_step", "export_stl", "export_parasolid", "export_jt",
        "import_step", "import_iges", "import_parasolid", "import_jt",
        "assembly_create", "assembly_add_component", "assembly_constrain",
      ];
      for (const opKind of required) {
        expect(caps.supportedOps.has(opKind)).toBe(true);
      }
    });
  });

  describe("Python preamble", () => {
    it("includes NXOpen imports and UNIT_FACTOR", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "mm" });
      expect(script.imports).toContain("import NXOpen");
      expect(script.imports).toContain("import NXOpen.Features");
      expect(script.body).toContain("UNIT_FACTOR = 1");
      expect(script.body).toContain("def main():");
    });

    it("sets UNIT_FACTOR=25.4 for inches", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "in" });
      expect(script.body).toContain("UNIT_FACTOR = 25.4");
    });

    it("includes session and work_part setup", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("session = NXOpen.Session.GetSession()");
      expect(script.body).toContain("work_part = session.Parts.Work");
    });
  });

  describe("sketch operations", () => {
    it("generates sketch_create with plane selection", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_create", { plane: "XZ" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Sketch on XZ plane");
      expect(script.body).toContain('DATUM_CSYS(0) XZ plane');
      expect(script.body).toContain("CreateSketchInPlaceBuilder2");
    });

    it("generates sketch_line with coordinates", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_line", { x1: 0, y1: 0, x2: 50, y2: 25 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("NXOpen.Point3d(0*UNIT_FACTOR, 0*UNIT_FACTOR");
      expect(script.body).toContain("NXOpen.Point3d(50*UNIT_FACTOR, 25*UNIT_FACTOR");
      expect(script.body).toContain("_current_sketch.CreateLine");
    });

    it("generates sketch_circle with center and radius", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_circle", { centerX: 10, centerY: 10, radius: 20 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("NXOpen.Point3d(10*UNIT_FACTOR, 10*UNIT_FACTOR");
      expect(script.body).toContain("_current_sketch.CreateCircle");
      expect(script.body).toContain("20*UNIT_FACTOR");
    });

    it("generates sketch_rectangle, sketch_polygon, sketch_spline", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_rectangle", { x: 0, y: 0, width: 100, height: 50 }),
        op("sketch_polygon", { centerX: 0, centerY: 0, radius: 30, sides: 6 }),
        op("sketch_spline", { points: [[0, 0, 0], [10, 5, 0], [20, 0, 0]] }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Rectangle at (0, 0) size 100x50");
      expect(script.body).toContain("polygon_pts");
      expect(script.body).toContain("CreateSpline");
    });

    it("generates sketch_arc with angles", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_arc", { centerX: 0, centerY: 0, radius: 15, startAngle: 0, endAngle: 90 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("_current_sketch.CreateArc");
      expect(script.body).toContain("math.radians(0)");
      expect(script.body).toContain("math.radians(90)");
    });

    it("generates sketch_ellipse with major/minor radii", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_ellipse", { centerX: 0, centerY: 0, majorRadius: 20, minorRadius: 10 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateEllipse");
      expect(script.body).toContain("20*UNIT_FACTOR");
      expect(script.body).toContain("10*UNIT_FACTOR");
    });

    it("generates sketch_slot", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_slot", { centerX: 0, centerY: 0, length: 40, width: 10 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateSlotBuilder");
      expect(script.body).toContain("SlotTypes.Straight");
    });
  });

  describe("feature operations", () => {
    it("generates feature_extrude with positive/negative direction", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 25, direction: "positive" }),
        op("feature_extrude", { depth: 10, direction: "negative" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Extrude sketch 25mm");
      expect(script.body).toContain("Extrude sketch -10mm");
      expect(script.body).toContain("CreateExtrudeBuilder");
    });

    it("generates feature_revolve with axis", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_revolve", { angle: 180, axisX: 1, axisY: 0, axisZ: 0 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Revolve 180°");
      expect(script.body).toContain("CreateRevolveBuilder");
      expect(script.body).toContain("NXOpen.Vector3d(1, 0, 0)");
    });

    it("generates feature_fillet, feature_chamfer", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_fillet", { radius: 3 }),
        op("feature_chamfer", { distance: 2, angle: 45 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateEdgeBlendBuilder");
      expect(script.body).toContain("DefaultRadius.Value = 3*UNIT_FACTOR");
      expect(script.body).toContain("CreateChamferBuilder");
      expect(script.body).toContain("FirstOffset.Value = 2*UNIT_FACTOR");
    });

    it("generates feature_hole with position and dimensions", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_hole", { x: 50, y: 25, diameter: 10, depth: 30 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateHoleBuilder");
      expect(script.body).toContain("HoleDiameter.Value = 10*UNIT_FACTOR");
      expect(script.body).toContain("Depth.Value = 30*UNIT_FACTOR");
    });

    it("generates feature_pocket (cut extrude)", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_pocket", { depth: 15 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Pocket (cut extrude)");
      expect(script.body).toContain("BooleanType.Subtract");
    });

    it("generates feature_shell", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_shell", { thickness: 2 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateShellBuilder");
      expect(script.body).toContain("AllFacesThickness.Value = 2*UNIT_FACTOR");
    });

    it("generates feature_draft", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_draft", { angle: 3 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateDraftBuilder");
      expect(script.body).toContain("DraftAngle.Value = 3");
    });
  });

  describe("boolean operations", () => {
    it("generates boolean_union, boolean_subtract, boolean_intersect", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("boolean_union"), op("boolean_subtract"), op("boolean_intersect"),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("BooleanType.Unite");
      expect(script.body).toContain("BooleanType.Subtract");
      expect(script.body).toContain("BooleanType.Intersect");
    });
  });

  describe("transform operations", () => {
    it("generates transform_move with delta coordinates", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("transform_move", { dx: 100, dy: 50, dz: 25 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateMoveObjectBuilder");
      expect(script.body).toContain("DeltaXc.Value = 100*UNIT_FACTOR");
      expect(script.body).toContain("DeltaYc.Value = 50*UNIT_FACTOR");
      expect(script.body).toContain("DeltaZc.Value = 25*UNIT_FACTOR");
    });

    it("generates transform_rotate with angle", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("transform_rotate", { angle: 45, axisZ: 1 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Rotate 45°");
      expect(script.body).toContain("Options.Angle");
    });

    it("generates transform_pattern_linear", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("transform_pattern_linear", { dx: 25, dy: 0, count: 4 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreatePatternFeatureBuilder");
      expect(script.body).toContain("PatternTypes.Linear");
      expect(script.body).toContain("XDirectionCount.Value = 4");
    });

    it("generates transform_pattern_circular", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("transform_pattern_circular", { count: 6, angle: 360 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("PatternTypes.Circular");
      expect(script.body).toContain("CircularCount.Value = 6");
    });
  });

  describe("export/import operations", () => {
    it("generates export_step, export_stl, export_parasolid, export_jt", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("export_step", { filename: "part.step" }),
        op("export_stl", { filename: "mesh.stl" }),
        op("export_parasolid", { filename: "part.x_t" }),
        op("export_jt", { filename: "part.jt" }),
      ], { projectName: "Test", units: "mm", outputDir: "/out" });
      expect(script.body).toContain("CreateStep203Creator");
      expect(script.body).toContain("/out/part.step");
      expect(script.body).toContain("CreateStlCreator");
      expect(script.body).toContain("CreateParasolidCreator");
      expect(script.body).toContain("CreateJtCreator");
    });

    it("generates import_step, import_iges, import_parasolid, import_jt", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("import_step", { filepath: "input.step" }),
        op("import_iges", { filepath: "model.igs" }),
        op("import_parasolid", { filepath: "model.x_t" }),
        op("import_jt", { filepath: "model.jt" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateStep203Importer");
      expect(script.body).toContain("CreateIgesImporter");
      expect(script.body).toContain("CreateParasolidImporter");
      expect(script.body).toContain("CreateJtImporter");
    });
  });

  describe("assembly operations", () => {
    it("generates assembly_create", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("assembly_create", { name: "main_assembly" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain('Parts.NewDisplay("main_assembly"');
    });

    it("generates assembly_add_component", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("assembly_add_component", { partPath: "component.prt" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateAddComponentBuilder");
      expect(script.body).toContain('SetPartToAdd("component.prt")');
    });

    it("generates assembly_constrain", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("assembly_constrain", { type: "fix" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateComponentConstraintBuilder");
    });

    it("generates assembly_explode", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("assembly_explode"),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CreateExplodedViewBuilder");
    });
  });

  describe("execution (mocked)", () => {
    it("returns success with metrics in CI mode", async () => {
      const script = nxCodeGeneratorEngine.buildScript([op("feature_extrude", { depth: 10 })], { projectName: "Test", units: "mm" });
      const result = await nxCodeGeneratorEngine.executeScript(script);
      expect(result.ok).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.faceCount).toBeGreaterThan(0);
      expect(result.metrics?.volumeMm3).toBe(12500);
    });
  });

  describe("edge cases and failure modes", () => {
    it("handles empty operations array", () => {
      const script = nxCodeGeneratorEngine.buildScript([], { projectName: "Empty", units: "mm" });
      expect(script.body).toContain("def main():");
      expect(script.warnings.length).toBe(0);
    });

    it("throws on unsupported operation kind", () => {
      expect(() => {
        nxCodeGeneratorEngine.buildScript([op("invalid_op" as CADOperationKind)], { projectName: "Test", units: "mm" });
      }).toThrow(/does not support operation/);
    });

    it("handles special characters in projectName", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Part #1 (Rev-A)", units: "mm" });
      expect(script.filename).toBe("Part__1__Rev_A_.py");
    });

    it("handles negative coordinate values", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_line", { x1: -100, y1: -50, x2: 100, y2: 50 })], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("NXOpen.Point3d(-100*UNIT_FACTOR, -50*UNIT_FACTOR");
    });

    it("handles extreme dimensions (0.001mm, 10000mm)", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 0.001 }),
        op("feature_extrude", { depth: 10000 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("0.001*UNIT_FACTOR");
      expect(script.body).toContain("10000*UNIT_FACTOR");
    });

    it("handles NaN/undefined gracefully with defaults", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_line", { x1: undefined, y1: NaN }),
        op("feature_extrude", {}),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("NXOpen.Point3d(0*UNIT_FACTOR");
      expect(script.body).toContain("Extrude sketch 10mm");
    });

    it("handles zero radius for circle (uses default)", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_circle", { centerX: 0, centerY: 0, radius: 0 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("0*UNIT_FACTOR)");
    });

    it("handles negative polygon sides (clamps to minimum 3)", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("sketch_polygon", { centerX: 0, centerY: 0, radius: 10, sides: -5 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("range(3)");
    });
  });

  describe("parameter tracking", () => {
    it("captures feature parameters via emitter.parameter()", () => {
      const script = nxCodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 20 }),
        op("feature_hole", { diameter: 8 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.parameters.has("extrude_depth")).toBe(true);
      expect(script.parameters.has("hole_diameter")).toBe(true);
    });
  });

  describe("context variations", () => {
    it("generates correct units comment for mm", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm" });
      expect(script.body).toContain("# Units: mm");
    });

    it("generates correct units comment for in", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "in" });
      expect(script.body).toContain("# Units: in");
    });

    it("generates correct target version NX12", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "NX12" });
      expect(script.body).toContain("# Target: Siemens NX NX12");
    });

    it("generates correct target version NX2206", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "NX2206" });
      expect(script.body).toContain("# Target: Siemens NX NX2206");
    });

    it("includes NXOpen.UF import when useUserFunction is true", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", useUserFunction: true });
      expect(script.body).toContain("import NXOpen.UF");
      expect(script.imports).toContain("import NXOpen.UF");
    });

    it("uses custom part template when provided", () => {
      const script = nxCodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", partTemplate: "my_template.prt" });
      expect(script.body).toContain('Parts.NewDisplay("my_template.prt"');
    });
  });
});

describe("prism_cad dispatcher - nx actions (direct engine)", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("nx_capabilities via engine returns cadSystem and supportedOps", () => {
    const caps = nxCodeGeneratorEngine.getCapabilities();
    expect(caps.cadSystem).toBe("nx");
    expect(caps.supportedOps.size).toBeGreaterThanOrEqual(60);
    expect(caps.supportsParametric).toBe(true);
  });

  it("nx_generate_script via engine returns Python script with imports", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { depth: 15 } },
    ];
    const script = nxCodeGeneratorEngine.buildScript(ops, { projectName: "TestPart", units: "mm" });
    expect(script.imports).toContain("import NXOpen");
    expect(script.body).toContain("Extrude sketch 15mm");
    expect(script.filename).toBe("TestPart.py");
  });

  it("nx_build_part via engine executes and returns mock metrics", async () => {
    const ops: CADOperation[] = [
      { kind: "sketch_circle", args: { radius: 10 } },
      { kind: "feature_extrude", args: { depth: 5 } },
    ];
    const script = nxCodeGeneratorEngine.buildScript(ops, { projectName: "Cylinder", units: "mm" });
    expect(script.body).toContain("CreateCircle");
    const result = await nxCodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("nx_execute via engine runs script and returns result", async () => {
    const script = { body: "import NXOpen\nprint('hello')", cadSystem: "nx" as const, filename: "test.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
    const result = await nxCodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
