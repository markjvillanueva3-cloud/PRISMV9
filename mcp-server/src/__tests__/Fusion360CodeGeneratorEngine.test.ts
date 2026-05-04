/**
 * Fusion360CodeGeneratorEngine — Unit Tests (U-CADC13)
 * Tests: Python code generation for Autodesk Fusion 360 API
 * Coverage: capabilities, CADOperationKind, context variations, edge cases, dispatcher invocation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fusion360CodeGeneratorEngine } from "../engines/Fusion360CodeGeneratorEngine.js";
import type { CADOperation, CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function op(kind: CADOperationKind, args: Record<string, unknown> = {}): CADOperation {
  return { kind, args };
}

// ── Test suites ──────────────────────────────────────────────────────────────
describe("Fusion360CodeGeneratorEngine", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  describe("capabilities", () => {
    it("reports fusion360 cadSystem with 50+ supported ops", () => {
      const caps = fusion360CodeGeneratorEngine.getCapabilities();
      expect(caps.cadSystem).toBe("fusion360");
      expect(caps.supportedOps.size).toBeGreaterThanOrEqual(50);
      expect(caps.supportsParametric).toBe(true);
      expect(caps.supportsUndo).toBe(true);
      expect(caps.version).toBe("2024");
    });

    it("supports sketch, feature, surface, boolean, transform, export, import, pattern ops", () => {
      const caps = fusion360CodeGeneratorEngine.getCapabilities();
      const required: CADOperationKind[] = [
        "sketch_create", "sketch_line", "sketch_circle", "sketch_rectangle", "sketch_spline",
        "feature_extrude", "feature_revolve", "feature_fillet", "feature_hole", "feature_pocket",
        "surface_loft", "surface_sweep", "surface_fill",
        "boolean_union", "boolean_subtract", "boolean_intersect",
        "transform_move", "transform_rotate", "transform_mirror", "transform_pattern_linear",
        "pattern_linear", "pattern_circular",
        "export_step", "export_stl", "export_f3d", "import_step", "import_iges",
        "parameter_declare", "parameter_equation",
      ];
      for (const opKind of required) {
        expect(caps.supportedOps.has(opKind)).toBe(true);
      }
    });
  });

  describe("Python preamble", () => {
    it("includes adsk.* imports and UNIT_FACTOR", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "mm" });
      expect(script.imports).toContain("import adsk.core");
      expect(script.imports).toContain("import adsk.fusion");
      expect(script.imports).toContain("import adsk.cam");
      expect(script.body).toContain("UNIT_FACTOR = 0.1");
      expect(script.body).toContain("def run(context):");
    });

    it("sets UNIT_FACTOR=2.54 for inches", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "in" });
      expect(script.body).toContain("UNIT_FACTOR = 2.54");
    });

    it("sets UNIT_FACTOR=1 for cm (native Fusion units)", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Test", units: "cm" });
      expect(script.body).toContain("UNIT_FACTOR = 1");
    });
  });

  describe("sketch operations", () => {
    it("generates sketch_create with plane selection", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_create", { plane: "XZ" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("xZConstructionPlane");
      expect(script.body).toContain("sketches.add");
    });

    it("generates sketch_line with coordinates", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_line", { x1: 0, y1: 0, x2: 50, y2: 25 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("sketchLines");
      expect(script.body).toContain("Point3D.create(0*UNIT_FACTOR, 0*UNIT_FACTOR");
      expect(script.body).toContain("Point3D.create(50*UNIT_FACTOR, 25*UNIT_FACTOR");
      expect(script.body).toContain("addByTwoPoints");
    });

    it("generates sketch_circle with center and radius", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_circle", { centerX: 10, centerY: 10, radius: 20 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("sketchCircles");
      expect(script.body).toContain("addByCenterRadius(center, 20*UNIT_FACTOR)");
    });

    it("generates sketch_rectangle, sketch_polygon, sketch_spline", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_rectangle", { x: 0, y: 0, width: 100, height: 50 }),
        op("sketch_polygon", { centerX: 0, centerY: 0, radius: 30, sides: 6 }),
        op("sketch_spline", { points: [[0, 0, 0], [10, 5, 0], [20, 0, 0]] }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("addTwoPointRectangle");
      expect(script.body).toContain("6-sided polygon");
      expect(script.body).toContain("sketchFittedSplines");
    });

    it("generates sketch_arc with center, start, sweep", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_arc", { centerX: 0, centerY: 0, radius: 15, startAngle: 0, sweepAngle: 90 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("sketchArcs");
      expect(script.body).toContain("addByCenterStartSweep");
    });

    it("generates sketch_ellipse with major/minor radii", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_ellipse", { centerX: 0, centerY: 0, majorRadius: 30, minorRadius: 15 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("sketchEllipses");
      expect(script.parameters.has("ellipse_major")).toBe(true);
      expect(script.parameters.has("ellipse_minor")).toBe(true);
    });
  });

  describe("feature operations", () => {
    it("generates feature_extrude with positive/negative direction", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 25, direction: "positive" }),
        op("feature_extrude", { depth: 10, direction: "negative" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("extrudeFeatures");
      expect(script.body).toContain("createByReal(25 * UNIT_FACTOR)");
      expect(script.body).toContain("createByReal(-10 * UNIT_FACTOR)");
    });

    it("generates feature_revolve with angle and axis", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_revolve", { angle: 180, axisX: 1, axisY: 0, axisZ: 0 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("revolveFeatures");
      expect(script.body).toContain("xConstructionAxis");
      expect(script.body).toContain("math.radians(180)");
    });

    it("generates feature_fillet, feature_chamfer", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_fillet", { radius: 3 }),
        op("feature_chamfer", { distance: 2, angle: 45 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("filletFeatures");
      expect(script.body).toContain("addConstantRadiusEdgeSet");
      expect(script.body).toContain("chamferFeatures");
    });

    it("generates feature_hole with position, diameter, depth", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_hole", { x: 50, y: 25, diameter: 10, depth: 30 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("holeFeatures");
      expect(script.parameters.has("hole_diameter")).toBe(true);
      expect(script.parameters.has("hole_depth")).toBe(true);
    });

    it("generates feature_pocket (cut extrude)", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_pocket", { depth: 5 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("CutFeatureOperation");
      expect(script.body).toContain("-5 * UNIT_FACTOR");
    });

    it("generates feature_shell with wall thickness", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_shell", { thickness: 2 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("shellFeatures");
      expect(script.body).toContain("insideThickness");
    });

    it("generates feature_draft with angle", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_draft", { angle: 3 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("draftFeatures");
      expect(script.body).toContain("math.radians(3)");
    });
  });

  describe("boolean and transform operations", () => {
    it("generates boolean_union, boolean_subtract, boolean_intersect", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("boolean_union"), op("boolean_subtract"), op("boolean_intersect"),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("JoinFeatureOperation");
      expect(script.body).toContain("CutFeatureOperation");
      expect(script.body).toContain("IntersectFeatureOperation");
    });

    it("generates transform_move with translation vector", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("transform_move", { dx: 100, dy: 50, dz: 0 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("moveFeatures");
      expect(script.body).toContain("Vector3D.create(100*UNIT_FACTOR");
    });

    it("generates transform_rotate with angle and axis", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("transform_rotate", { angle: 45, axisZ: 1 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("RotateType");
      expect(script.body).toContain("zConstructionAxis");
      expect(script.body).toContain("math.radians(45)");
    });

    it("generates transform_pattern_linear and pattern_circular", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("transform_pattern_linear", { dx: 25, dy: 0, count: 4 }),
        op("pattern_circular", { count: 6, angle: 360 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("rectangularPatternFeatures");
      expect(script.body).toContain("circularPatternFeatures");
    });

    it("generates transform_mirror with plane", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("transform_mirror", { plane: "YZ" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("mirrorFeatures");
      expect(script.body).toContain("yZConstructionPlane");
    });

    it("generates transform_scale with factor", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("transform_scale", { factor: 2.0 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("scaleFeatures");
      expect(script.body).toContain("createByReal(2)");
    });
  });

  describe("surface operations", () => {
    it("generates surface_loft", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("surface_loft"),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("loftFeatures");
      expect(script.body).toContain("isSolid = False");
    });

    it("generates surface_offset with distance", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("surface_offset", { distance: 1 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("offsetFeatures");
      expect(script.body).toContain("1 * UNIT_FACTOR");
    });
  });

  describe("export/import operations", () => {
    it("generates export_step, export_stl, export_f3d with correct format", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("export_step", { filename: "part.step" }),
        op("export_stl", { filename: "mesh.stl" }),
        op("export_f3d", { filename: "archive.f3d" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("createSTEPExportOptions");
      expect(script.body).toContain("createSTLExportOptions");
      expect(script.body).toContain("createFusionArchiveExportOptions");
    });

    it("generates import_step", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("import_step", { filepath: "input.step" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("importManager");
      expect(script.body).toContain("createSTEPImportOptions");
      expect(script.body).toContain("input.step");
    });
  });

  describe("parameter operations", () => {
    it("generates parameter_declare with name, value, unit", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("parameter_declare", { name: "width", value: 50, unit: "mm" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("userParameters");
      expect(script.body).toContain("'width'");
    });

    it("generates parameter_equation with expression", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("parameter_equation", { name: "depth", expression: "width * 0.5" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("'width * 0.5'");
    });
  });

  describe("datum geometry", () => {
    it("generates datum_plane with offset", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("datum_plane", { offset: 25 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("constructionPlanes");
      expect(script.body).toContain("setByOffset");
      expect(script.body).toContain("25*UNIT_FACTOR");
    });

    it("generates datum_point with coordinates", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("datum_point", { x: 10, y: 20, z: 30 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("constructionPoints");
      expect(script.body).toContain("10*UNIT_FACTOR");
    });
  });

  describe("execution (mocked)", () => {
    it("returns success with metrics in CI mode", async () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("feature_extrude", { depth: 10 })], { projectName: "Test", units: "mm" });
      const result = await fusion360CodeGeneratorEngine.executeScript(script);
      expect(result.ok).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.faceCount).toBeGreaterThan(0);
      expect(result.metrics?.bodyCount).toBe(1);
    });
  });

  describe("edge cases and failure modes", () => {
    it("handles empty operations array", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([], { projectName: "Empty", units: "mm" });
      expect(script.body).toContain("def run(context):");
      expect(script.warnings.length).toBe(0);
    });

    it("throws on unsupported operation kind", () => {
      expect(() => {
        fusion360CodeGeneratorEngine.buildScript([op("invalid_op" as CADOperationKind)], { projectName: "Test", units: "mm" });
      }).toThrow(/does not support operation/);
    });

    it("handles special characters in projectName", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "Part #1 (Rev-A)", units: "mm" });
      expect(script.filename).toBe("Part__1__Rev_A_.py");
    });

    it("handles negative coordinate values", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_line", { x1: -100, y1: -50, x2: 100, y2: 50 })], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Point3D.create(-100*UNIT_FACTOR, -50*UNIT_FACTOR");
    });

    it("handles extreme dimensions (0.001mm, 10000mm)", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 0.001 }),
        op("feature_extrude", { depth: 10000 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("createByReal(0.001 * UNIT_FACTOR)");
      expect(script.body).toContain("createByReal(10000 * UNIT_FACTOR)");
    });

    it("handles NaN/undefined gracefully with defaults", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_line", { x1: undefined, y1: NaN }),
        op("feature_extrude", {}),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Point3D.create(0*UNIT_FACTOR");
      expect(script.body).toContain("createByReal(10 * UNIT_FACTOR)");
    });

    it("handles Infinity values as defaults", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_circle", { centerX: Infinity, centerY: -Infinity, radius: Infinity }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("Point3D.create(0*UNIT_FACTOR, 0*UNIT_FACTOR");
      expect(script.body).toContain("addByCenterRadius(center, 10*UNIT_FACTOR)");
    });

    it("handles empty string arguments", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("export_step", { filename: "" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("createSTEPExportOptions");
    });
  });

  describe("parameter tracking", () => {
    it("captures feature parameters via emitter.parameter()", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("feature_extrude", { depth: 20 }),
        op("feature_hole", { diameter: 8 }),
        op("feature_fillet", { radius: 2 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.parameters.has("extrude_depth")).toBe(true);
      expect(script.parameters.has("hole_diameter")).toBe(true);
      expect(script.parameters.has("fillet_radius")).toBe(true);
    });
  });

  describe("context variations (mm, in, cm, 2023/2024/2025)", () => {
    it("generates correct units comment for mm", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm" });
      expect(script.body).toContain("# Units: mm");
      expect(script.body).toContain("UNIT_FACTOR = 0.1");
    });

    it("generates correct units comment for in", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "in" });
      expect(script.body).toContain("# Units: in");
      expect(script.body).toContain("UNIT_FACTOR = 2.54");
    });

    it("generates correct units comment for cm (native)", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "cm" });
      expect(script.body).toContain("# Units: cm");
      expect(script.body).toContain("UNIT_FACTOR = 1");
    });

    it("generates correct target version 2023", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "2023" });
      expect(script.body).toContain("# Target: Fusion 360 2023");
    });

    it("generates correct target version 2025", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], { projectName: "T", units: "mm", targetVersion: "2025" });
      expect(script.body).toContain("# Target: Fusion 360 2025");
    });
  });

  describe("sketch constraint and dimension operations", () => {
    it("generates sketch_constraint with type", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_constraint", { type: "horizontal" }),
        op("sketch_constraint", { type: "perpendicular" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("geometricConstraints");
      expect(script.body).toContain("addHorizontal");
      expect(script.body).toContain("addPerpendicular");
    });

    it("generates sketch_dimension with value", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("sketch_dimension", { type: "linear", value: 50 }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("sketchDimensions");
      expect(script.body).toContain("addDistanceDimension");
    });
  });

  describe("custom code block", () => {
    it("generates custom Python code block", () => {
      const script = fusion360CodeGeneratorEngine.buildScript([
        op("custom", { code: "print('Custom Fusion code')\napp.log('test')" }),
      ], { projectName: "Test", units: "mm" });
      expect(script.body).toContain("--- Custom code block ---");
      expect(script.body).toContain("print('Custom Fusion code')");
      expect(script.body).toContain("app.log('test')");
    });
  });
});

describe("prism_cad dispatcher - fusion360 actions (direct engine)", () => {
  beforeEach(() => {
    vi.stubEnv("PRISM_CAD_MOCK", "true");
    vi.stubEnv("CI", "true");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("fusion360_capabilities via engine returns cadSystem and supportedOps", () => {
    const caps = fusion360CodeGeneratorEngine.getCapabilities();
    expect(caps.cadSystem).toBe("fusion360");
    expect(caps.supportedOps.size).toBeGreaterThanOrEqual(50);
    expect(caps.supportsParametric).toBe(true);
  });

  it("fusion360_generate_script via engine returns Python script with imports", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { depth: 15 } },
    ];
    const script = fusion360CodeGeneratorEngine.buildScript(ops, { projectName: "TestPart", units: "mm" });
    expect(script.imports).toContain("import adsk.core");
    expect(script.imports).toContain("import adsk.fusion");
    expect(script.body).toContain("createByReal(15 * UNIT_FACTOR)");
    expect(script.filename).toBe("TestPart.py");
  });

  it("fusion360_build_part via engine executes and returns mock metrics", async () => {
    const ops: CADOperation[] = [
      { kind: "sketch_circle", args: { radius: 10 } },
      { kind: "feature_extrude", args: { depth: 5 } },
    ];
    const script = fusion360CodeGeneratorEngine.buildScript(ops, { projectName: "Cylinder", units: "mm" });
    expect(script.body).toContain("sketchCircles");
    const result = await fusion360CodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics?.volumeMm3).toBeGreaterThan(0);
  });

  it("fusion360_execute via engine runs script and returns result", async () => {
    const script = { body: "import adsk.core\nprint('hello')", cadSystem: "fusion360" as const, filename: "test.py", parameters: new Map(), lineage: [], warnings: [], imports: [] };
    const result = await fusion360CodeGeneratorEngine.executeScript(script);
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles componentName context option", () => {
    const script = fusion360CodeGeneratorEngine.buildScript([op("sketch_create")], {
      projectName: "Assembly",
      units: "mm",
      componentName: "Bracket_001"
    });
    expect(script.body).toContain("rootComp");
  });
});

describe("Fusion360CodeGeneratorEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const FUS360_CODEGEN_ACTIONS = [
    "cam_fusion360_code_gen_get_capabilities",
    "cam_fusion360_code_gen_build_script",
    "cam_fusion360_code_gen_execute_script",
    "cam_fusion360_code_gen_validate_output",
  ] as const;

  const ACTION_COUNT_EXPECTED = 4;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 4 cam_fusion360_code_gen_* enum entries", async () => {
    const src = await readDispatcher();
    expect(FUS360_CODEGEN_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of FUS360_CODEGEN_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _fus360CodeGen singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_fus360CodeGen\s*:\s*any/);
  });

  it("registers a fus360CodeGen case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"fus360CodeGen"\s*:\s*return\s+_fus360CodeGen\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/Fusion360CodeGeneratorEngine\.js"\s*\)\)\.fusion360CodeGeneratorEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of FUS360_CODEGEN_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"fus360CodeGen\")", async () => {
    const src = await readDispatcher();
    for (const action of FUS360_CODEGEN_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("fus360CodeGen"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("get_capabilities case routes to getCapabilities() (sync, no await on engine method)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion360_code_gen_get_capabilities"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getCapabilities()");
    expect(body).not.toMatch(/await\s+engine\.getCapabilities/);
    expect(body).toContain("capabilities");
  });

  it("build_script case Array.isArray-guards ops, accepts ctx|context fallback, reports opCount", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion360_code_gen_build_script"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("buildScript");
    expect(body).toContain("Array.isArray(params.ops)");
    expect(body).toMatch(/params\.ctx/);
    expect(body).toMatch(/params\.context/);
    expect(body).toContain("opCount");
  });

  it("execute_script case awaits the async executeScript() (subprocess/COM)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion360_code_gen_execute_script"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await engine.executeScript(");
    expect(body).toContain("execution");
  });

  it("validate_output case routes to validateOutput() with result|executionResult fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion360_code_gen_validate_output"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("validateOutput");
    expect(body).toMatch(/params\.result\s*\?\?\s*params\.executionResult/);
    expect(body).toContain("report");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of FUS360_CODEGEN_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("execute_script is the only async-await case (others are synchronous)", async () => {
    const src = await readDispatcher();
    const execRe = /case\s+"cam_fusion360_code_gen_execute_script"\s*:[\s\S]*?break;/;
    const execBody = src.match(execRe)?.[0] ?? "";
    expect(execBody).toContain("await engine.executeScript");

    const SYNC_ACTIONS = [
      "cam_fusion360_code_gen_get_capabilities",
      "cam_fusion360_code_gen_build_script",
      "cam_fusion360_code_gen_validate_output",
    ];
    for (const action of SYNC_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      expect(body).not.toMatch(/await\s+engine\.(getCapabilities|buildScript|validateOutput)/);
    }
  });
});
