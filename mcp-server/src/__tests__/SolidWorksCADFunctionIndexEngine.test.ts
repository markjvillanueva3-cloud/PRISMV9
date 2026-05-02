/**
 * Tests for SolidWorksCADFunctionIndexEngine
 * @see src/engines/SolidWorksCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-SW-01 (SolidWorks CAD exhaust track — sketch + scaffold)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SolidWorksCADFunctionIndexEngine } from "../engines/SolidWorksCADFunctionIndexEngine.js";

const KNOWN_SKETCH_OPS = [
  "LINE",
  "CENTERLINE",
  "CIRCLE",
  "ARC",
  "SPLINE",
  "STYLE_SPLINE",
  "POLYGON",
  "RECTANGLE",
  "SLOT",
  "ELLIPSE",
  "PARTIAL_ELLIPSE",
  "CONIC",
  "POINT",
  "TEXT",
  "SMART_DIMENSION",
  "ADD_RELATION",
  "SKETCH_FILLET",
  "SKETCH_CHAMFER",
  "TRIM_ENTITIES",
  "EXTEND_ENTITIES",
  "OFFSET_ENTITIES",
  "MIRROR_ENTITIES",
];

const ALL_8_MODULES = [
  "sketch_operations",
  "part_operations",
  "surface_operations",
  "assembly_operations",
  "drawing_operations",
  "sheet_metal_operations",
  "weldment_operations",
  "evaluation_operations",
];

const ALL_16_RELATIONS = [
  "coincident",
  "concentric",
  "collinear",
  "parallel",
  "perpendicular",
  "tangent",
  "equal",
  "equal_length",
  "horizontal",
  "vertical",
  "midpoint",
  "intersection",
  "fix",
  "symmetric",
  "merge",
  "pierce",
];

describe("SolidWorksCADFunctionIndexEngine", () => {
  beforeEach(() => {
    SolidWorksCADFunctionIndexEngine.clearCache();
  });

  describe("getIndex — index header values", () => {
    it("system_id is exactly 'solidworks'", () => {
      expect(SolidWorksCADFunctionIndexEngine.getIndex().system_id).toBe("solidworks");
    });

    it("module_id is exactly 'cad_function_index'", () => {
      expect(SolidWorksCADFunctionIndexEngine.getIndex().module_id).toBe("cad_function_index");
    });

    it("schema_version is exactly '1.0.0'", () => {
      expect(SolidWorksCADFunctionIndexEngine.getIndex().schema_version).toBe("1.0.0");
    });

    it("module_name is the documented 'SolidWorks CAD Unified Function Index'", () => {
      expect(SolidWorksCADFunctionIndexEngine.getIndex().module_name).toBe(
        "SolidWorks CAD Unified Function Index",
      );
    });

    it("indexed_at parses to a real Date in 2026 with ISO Z format", () => {
      const ts = SolidWorksCADFunctionIndexEngine.getIndex().indexed_at;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      const d = new Date(ts);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(Number.isNaN(d.getTime())).toBe(false);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = SolidWorksCADFunctionIndexEngine.getIndex();
      const b = SolidWorksCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns the exact 8-module list in declaration order", () => {
      expect(SolidWorksCADFunctionIndexEngine.listModules()).toEqual(ALL_8_MODULES);
    });

    it("getModuleEntry('sketch_operations') has the U-CAD-FIDX-SW-01 tag and 132 estimated params", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("sketch_operations");
      expect(entry?.module_id).toBe("sketch_operations");
      expect(entry?.path).toBe("cad-functions/solidworks/sketch-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-SW-01"]);
      expect(entry?.parameter_count_estimate).toBe(132);
      expect(entry?.dependencies).toEqual([]);
    });

    it("getModuleEntry returns null for an unknown module — failure mode", () => {
      expect(SolidWorksCADFunctionIndexEngine.getModuleEntry("nonexistent_module")).toBeNull();
    });

    it("module dependencies trace sketch → part → surface chain", () => {
      const part = SolidWorksCADFunctionIndexEngine.getModuleEntry("part_operations");
      const surface = SolidWorksCADFunctionIndexEngine.getModuleEntry("surface_operations");
      const drawing = SolidWorksCADFunctionIndexEngine.getModuleEntry("drawing_operations");
      expect(part?.dependencies).toEqual(["sketch_operations"]);
      expect(surface?.dependencies).toEqual(["sketch_operations", "part_operations"]);
      expect(drawing?.dependencies).toEqual(["part_operations", "assembly_operations"]);
    });
  });

  describe("getModule — sketch_operations catalog loading", () => {
    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-01' and totalParameters is 132", () => {
      const mod = SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-SW-01");
      expect(mod?.metadata?.totalParameters).toBe(132);
      expect(mod?.metadata?.operationCount).toBe(22);
    });

    it("operations dict has exactly 22 entries matching KNOWN_SKETCH_OPS", () => {
      const mod = SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      const opIds = Object.keys(mod?.operations ?? {}).sort();
      expect(opIds).toEqual([...KNOWN_SKETCH_OPS].sort());
    });

    it("returns same object identity on repeated calls (per-module cache)", () => {
      const a = SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      const b = SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      expect(a === b).toBe(true);
    });

    it("returns null for unknown module without throwing — failure mode", () => {
      expect(SolidWorksCADFunctionIndexEngine.getModule("nonexistent_module")).toBeNull();
      // No load error should be recorded — getIndex().modules.find() returned undefined first.
      expect(SolidWorksCADFunctionIndexEngine.getLoadErrors()).toHaveLength(0);
    });
  });

  describe("listOperations / listAllOperations — operation discovery", () => {
    it("listOperations('sketch_operations') returns all 22 known sketch operations", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sketch_operations");
      const ids = ops.map((op) => op.operation_id).sort();
      expect(ids).toEqual([...KNOWN_SKETCH_OPS].sort());
    });

    it("LINE has command 'Sketch.Line' bound to ISketchManager.CreateLine", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sketch_operations");
      const line = ops.find((o) => o.operation_id === "LINE");
      expect(line?.solidworks_command).toBe("Sketch.Line");
      expect(line?.solidworks_api).toBe("ISketchManager.CreateLine");
      expect(line?.category).toBe("Sketch_Line");
    });

    it("CIRCLE has command 'Sketch.Circle' and category Sketch_Circle", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sketch_operations");
      const circle = ops.find((o) => o.operation_id === "CIRCLE");
      expect(circle?.solidworks_command).toBe("Sketch.Circle");
      expect(circle?.category).toBe("Sketch_Circle");
    });

    it("SMART_DIMENSION binds to IModelDoc2.AddDimension2 in category Sketch_Dimension", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sketch_operations");
      const dim = ops.find((o) => o.operation_id === "SMART_DIMENSION");
      expect(dim?.solidworks_command).toBe("Sketch.SmartDimension");
      expect(dim?.solidworks_api).toBe("IModelDoc2.AddDimension2 / ClickDimension");
      expect(dim?.category).toBe("Sketch_Dimension");
    });

    it("the 6 modify ops all share category Sketch_Modify", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sketch_operations");
      const modifyOps = ops.filter((o) => o.category === "Sketch_Modify");
      expect(modifyOps.map((o) => o.operation_id).sort()).toEqual([
        "EXTEND_ENTITIES",
        "MIRROR_ENTITIES",
        "OFFSET_ENTITIES",
        "SKETCH_CHAMFER",
        "SKETCH_FILLET",
        "TRIM_ENTITIES",
      ]);
    });

    it("listAllOperations returns 52 ops total (sketch + part shipped through U-02)", () => {
      const all = SolidWorksCADFunctionIndexEngine.listAllOperations();
      expect(all).toHaveLength(52);
    });

    it("listOperations('part_operations') returns 30 (shipped in U-02)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("part_operations")).toHaveLength(30);
    });

    it("listOperations('surface_operations') returns 0 — module pending — failure mode", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("surface_operations")).toHaveLength(
        0,
      );
    });
  });

  describe("getOperation / findParameter — parameter discovery", () => {
    it("SMART_DIMENSION supports all 10 dimensioning modes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "sketch_operations",
        "SMART_DIMENSION",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "smart",
        "horizontal",
        "vertical",
        "aligned",
        "angular",
        "radial",
        "diametral",
        "arc_length",
        "baseline",
        "ordinate",
      ]);
    });

    it("ADD_RELATION enumerates all 16 SolidWorks geometric relation types", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "sketch_operations",
        "ADD_RELATION",
      );
      const typeParam = op?.tabs?.Constraint?.parameters?.find((p) => p.name === "Relation Type");
      expect(typeParam?.options).toEqual(ALL_16_RELATIONS);
    });

    it("POLYGON supports inscribed and circumscribed modes only", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "POLYGON");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["inscribed", "circumscribed"]);
    });

    it("POLYGON sides parameter is bounded 3..40 with default 6", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "POLYGON");
      const sides = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Number of Sides");
      expect(sides?.min).toBe(3);
      expect(sides?.max).toBe(40);
      expect(sides?.default).toBe(6);
      expect(sides?.required).toBe(true);
    });

    it("CIRCLE supports all 4 placement modes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "CIRCLE");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "center_radius",
        "perimeter_3point",
        "perimeter_2point",
        "tangent_3entity",
      ]);
    });

    it("RECTANGLE supports all 5 placement modes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "RECTANGLE");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "corner",
        "center",
        "3point_corner",
        "3point_center",
        "parallelogram",
      ]);
    });

    it("SLOT supports all 4 modes (centerpoint/3point × straight/arc)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "SLOT");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "centerpoint_straight",
        "3point_straight",
        "centerpoint_arc",
        "3point_arc",
      ]);
    });

    it("CONIC Rho parameter is constrained to (0.001, 0.999) with parabola midpoint default", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "CONIC");
      const rho = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Rho");
      expect(rho?.min).toBe(0.001);
      expect(rho?.max).toBe(0.999);
      expect(rho?.default).toBe(0.5); // Parabola at the natural midpoint of the conic family
    });

    it("SPLINE exposes both tangency and curvature controls as checkboxes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "SPLINE");
      const tangency = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Tangency Control");
      const curvature = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Curvature Control");
      expect(tangency?.type).toBe("checkbox");
      expect(tangency?.default).toBe(false);
      expect(curvature?.type).toBe("checkbox");
      expect(curvature?.default).toBe(false);
    });

    it("STYLE_SPLINE degree is bounded 3..5 with default 3 and supports b_spline + bezier modes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "sketch_operations",
        "STYLE_SPLINE",
      );
      const degree = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Degree");
      const mode = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(degree?.min).toBe(3);
      expect(degree?.max).toBe(5);
      expect(degree?.default).toBe(3);
      expect(mode?.options).toEqual(["b_spline", "bezier"]);
    });

    it("findParameter is case-insensitive on parameter name and reports tab_id", () => {
      const found = SolidWorksCADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "LINE",
        "endpoint 1",
      );
      expect(found?.parameter.name).toBe("Endpoint 1");
      expect(found?.parameter.required).toBe(true);
      expect(found?.tab_id).toBe("Shape");
      expect(found?.module_id).toBe("sketch_operations");
      expect(found?.operation_id).toBe("LINE");
    });

    it("findParameter returns null for missing parameter — failure mode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sketch_operations",
          "LINE",
          "nonexistent_param",
        ),
      ).toBeNull();
    });

    it("getOperation returns null for unknown operation — failure mode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.getOperation("sketch_operations", "NONEXISTENT_OP"),
      ).toBeNull();
    });
  });

  describe("searchParameters — substring search across operations", () => {
    it("searchParameters('Sketch Plane') finds 17 operations across sketch + part modules", () => {
      const matches = SolidWorksCADFunctionIndexEngine.searchParameters("Sketch Plane");
      // 16 sketch ops carry Sketch Plane + HOLE_WIZARD references it for hole placement = 17.
      expect(matches.length).toBe(17);
      // First match must reference the sketch_operations module
      expect(matches[0]?.module_id).toBe("sketch_operations");
      expect(matches[0]?.parameter.name).toBe("Sketch Plane");
    });

    it("searchParameters honors the limit parameter", () => {
      const matches = SolidWorksCADFunctionIndexEngine.searchParameters("Sketch Plane", 3);
      expect(matches.length).toBe(3);
    });

    it("searchParameters('Mode') finds the operations with Mode-bearing parameters", () => {
      const matches = SolidWorksCADFunctionIndexEngine.searchParameters("Mode");
      // 10 sketch ops carry "Mode" + 1 part_operations op contributes a Mode-bearing parameter = 11.
      const distinctOps = new Set(matches.map((m) => m.operation_id));
      expect(distinctOps.size).toBe(11);
    });

    it("searchParameters returns [] for nonsense queries — failure mode", () => {
      expect(SolidWorksCADFunctionIndexEngine.searchParameters("zzzz_no_match")).toEqual([]);
    });
  });

  describe("getOperationsByCategory / getTotalParameterCount — taxonomy + aggregate", () => {
    it("getOperationsByCategory('Sketch_Modify') returns the 6 modify ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Sketch_Modify");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "EXTEND_ENTITIES",
        "MIRROR_ENTITIES",
        "OFFSET_ENTITIES",
        "SKETCH_CHAMFER",
        "SKETCH_FILLET",
        "TRIM_ENTITIES",
      ]);
    });

    it("getOperationsByCategory with module filter respects the moduleId argument", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Sketch_Modify",
        "sketch_operations",
      );
      expect(ops).toHaveLength(6);
      // Filtering on a non-shipped module returns 0
      const empty = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Sketch_Modify",
        "part_operations",
      );
      expect(empty).toHaveLength(0);
    });

    it("getTotalParameterCount equals 322 (132 sketch + 190 part)", () => {
      expect(SolidWorksCADFunctionIndexEngine.getTotalParameterCount()).toBe(322);
    });

    it("declared estimated_parameter_total matches actual count (no drift)", () => {
      const declared =
        SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total;
      const actual = SolidWorksCADFunctionIndexEngine.getTotalParameterCount();
      expect(declared).toBe(actual);
      expect(declared).toBe(322);
    });
  });

  describe("coverage_summary + platform_integration — phase 1 progress", () => {
    it("coverage_state is IN_PROGRESS with 6 modules pending and the right pending list", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface as {
        coverage_state?: string;
        phase_1_target_modules_remaining?: number;
        phase_1_modules_pending?: readonly string[];
        solidworks_cad_8_of_8?: boolean;
        inventor_parity?: boolean;
      };
      expect(api.coverage_state).toBe("IN_PROGRESS");
      expect(api.phase_1_target_modules_remaining).toBe(6);
      expect(api.phase_1_modules_pending).toEqual([
        "surface_operations",
        "assembly_operations",
        "drawing_operations",
        "sheet_metal_operations",
        "weldment_operations",
        "evaluation_operations",
      ]);
      expect(api.solidworks_cad_8_of_8).toBe(false);
      expect(api.inventor_parity).toBe(false);
    });

    it("platform_integration has sketch_layer + part_layer enabled through U-02", () => {
      const pi = SolidWorksCADFunctionIndexEngine.getIndex().platform_integration ?? {};
      expect(pi.sketch_layer).toBe(true);
      expect(pi.part_layer).toBe(true);
      expect(pi.surface_layer).toBe(false);
      expect(pi.assembly_layer).toBe(false);
      expect(pi.drawing_layer).toBe(false);
      expect(pi.sheet_metal_layer).toBe(false);
      expect(pi.weldment_layer).toBe(false);
      expect(pi.evaluation_layer).toBe(false);
    });

    it("API surface flags COM + VBA + VSTA + 2024 + 2025 SolidWorks compatibility", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface as {
        sw_api_com_items?: number;
        vba_macro_items?: number;
        vsta_addin_items?: number;
        solidworks_2024_compatible?: boolean;
        solidworks_2025_compatible?: boolean;
      };
      expect(api.sw_api_com_items).toBe(52);
      expect(api.vba_macro_items).toBe(52);
      expect(api.vsta_addin_items).toBe(52);
      expect(api.solidworks_2024_compatible).toBe(true);
      expect(api.solidworks_2025_compatible).toBe(true);
    });

    it("global_cross_references lists the 3 SolidWorks engines linked", () => {
      const linked =
        SolidWorksCADFunctionIndexEngine.getIndex().global_cross_references.engines_linked;
      expect(linked).toEqual([
        "SolidWorksCADFunctionIndexEngine",
        "SolidWorksAutomationBridge",
        "SolidWorksCodeGeneratorEngine",
      ]);
    });

    it("dispatchers_touched lists prism_cad and prism_ai", () => {
      const dispatchers =
        SolidWorksCADFunctionIndexEngine.getIndex().global_cross_references.dispatchers_touched;
      expect(dispatchers).toEqual(["prism_cad", "prism_ai"]);
    });
  });

  describe("clearCache — test isolation", () => {
    it("clearCache resets index + module caches and load errors", () => {
      SolidWorksCADFunctionIndexEngine.getIndex();
      SolidWorksCADFunctionIndexEngine.getModule("sketch_operations");
      SolidWorksCADFunctionIndexEngine.clearCache();
      // After clearCache, getIndex returns a fresh-but-identical-by-reference object
      const a = SolidWorksCADFunctionIndexEngine.getIndex();
      const b = SolidWorksCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
      expect(SolidWorksCADFunctionIndexEngine.getLoadErrors()).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-02 — part_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_PART_OPS_30 = [
    "EXTRUDE_BOSS",
    "EXTRUDE_CUT",
    "REVOLVE_BOSS",
    "REVOLVE_CUT",
    "SWEEP_BOSS",
    "SWEEP_CUT",
    "LOFT_BOSS",
    "LOFT_CUT",
    "BOUNDARY",
    "HOLE_WIZARD",
    "RIB",
    "DOME",
    "INDENT",
    "FLEX",
    "THICKEN",
    "FILLET",
    "CHAMFER",
    "SHELL",
    "DRAFT",
    "LINEAR_PATTERN",
    "CIRCULAR_PATTERN",
    "CURVE_DRIVEN_PATTERN",
    "SKETCH_DRIVEN_PATTERN",
    "TABLE_DRIVEN_PATTERN",
    "FILL_PATTERN",
    "MIRROR_FEATURE",
    "MOVE_COPY_BODY",
    "SCALE_BODY",
    "COMBINE_BODIES",
    "SPLIT_BODY",
  ];

  describe("part_operations — module catalog (U-CAD-FIDX-SW-02)", () => {
    it("loads the part_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("part_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 190 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("part_operations");
      expect(cat!.metadata.totalParameters).toBe(190);
    });

    it("metadata.operationCount is exactly 30", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("part_operations");
      expect(cat!.metadata.operationCount).toBe(30);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-02'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("part_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-02");
    });

    it("listOperations('part_operations') returns exactly 30 operations", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("part_operations");
      expect(ops).toHaveLength(30);
    });

    it("listOperations contains every expected part-feature op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("part_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_PART_OPS_30].sort());
    });

    it("module_entry.parameter_count_estimate is 190 in the index header", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("part_operations");
      expect(entry!.parameter_count_estimate).toBe(190);
    });

    it("module_entry.dependencies is exactly ['sketch_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("part_operations");
      expect(entry!.dependencies).toEqual(["sketch_operations"]);
    });

    it("sum of per-tab parameter arrays equals 190 (no count drift)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("part_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(190);
    });
  });

  describe("part_operations — sweep families (8 ops with boss/cut variants)", () => {
    it("EXTRUDE_BOSS binds to IFeatureManager.FeatureExtrusion3", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "EXTRUDE_BOSS");
      expect(op!.solidworks_command).toBe("Insert.Boss.Extrude");
      expect(op!.solidworks_api).toBe("IFeatureManager.FeatureExtrusion3");
      expect(op!.category).toBe("Part_Sweep_Boss");
    });

    it("EXTRUDE_CUT binds to IFeatureManager.FeatureCut4", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "EXTRUDE_CUT");
      expect(op!.solidworks_command).toBe("Insert.Cut.Extrude");
      expect(op!.solidworks_api).toBe("IFeatureManager.FeatureCut4");
      expect(op!.category).toBe("Part_Sweep_Cut");
    });

    it("REVOLVE_BOSS binds to IFeatureManager.FeatureRevolve2", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "REVOLVE_BOSS");
      expect(op!.solidworks_api).toBe("IFeatureManager.FeatureRevolve2");
    });

    it("LOFT_BOSS lives in the Part_Sweep_Boss category", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "LOFT_BOSS");
      expect(op!.category).toBe("Part_Sweep_Boss");
    });

    it("operationsByCategory('Part_Sweep_Boss') returns exactly 4 ops (extrude/revolve/sweep/loft)", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Sweep_Boss");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["EXTRUDE_BOSS", "LOFT_BOSS", "REVOLVE_BOSS", "SWEEP_BOSS"]);
    });

    it("operationsByCategory('Part_Sweep_Cut') returns exactly 4 ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Sweep_Cut");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["EXTRUDE_CUT", "LOFT_CUT", "REVOLVE_CUT", "SWEEP_CUT"]);
    });

    it("EXTRUDE_BOSS End Condition has 8 termination modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "EXTRUDE_BOSS",
        "End Condition",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "blind",
        "through_all",
        "up_to_next",
        "up_to_vertex",
        "up_to_surface",
        "offset_from_surface",
        "up_to_body",
        "mid_plane",
      ]);
    });
  });

  describe("part_operations — hole wizard, apply, modify families", () => {
    it("HOLE_WIZARD binds to IFeatureManager.HoleWizard5", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "HOLE_WIZARD");
      expect(op!.solidworks_api).toBe("IFeatureManager.HoleWizard5");
    });

    it("HOLE_WIZARD Hole Type dropdown lists exactly 5 hole types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "HOLE_WIZARD",
        "Hole Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "simple",
        "counterbore",
        "countersink",
        "threaded_tap",
        "tapered_pipe",
      ]);
    });

    it("HOLE_WIZARD End Condition lists exactly 5 termination modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "HOLE_WIZARD",
        "End Condition",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "blind",
        "through_all",
        "up_to_next",
        "up_to_vertex",
        "up_to_surface",
      ]);
    });

    it("operationsByCategory('Part_Apply') returns exactly 5 ops (rib/dome/indent/flex/thicken)", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Apply");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["DOME", "FLEX", "INDENT", "RIB", "THICKEN"]);
    });

    it("operationsByCategory('Part_Modify') returns exactly 4 ops (fillet/chamfer/shell/draft)", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Modify");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["CHAMFER", "DRAFT", "FILLET", "SHELL"]);
    });

    it("FILLET 'Fillet Type' dropdown contains 'variable_radius' (variable-radius fillet support)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "FILLET",
        "Fillet Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toContain("variable_radius");
    });

    it("DRAFT 'Draft Type' dropdown contains all 3 draft modes (neutral/parting/step)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "DRAFT",
        "Draft Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["neutral_plane", "parting_line", "step"]);
    });
  });

  describe("part_operations — patterns, mirror, body operations", () => {
    it("operationsByCategory('Part_Pattern') returns exactly 6 pattern ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Pattern");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "CIRCULAR_PATTERN",
        "CURVE_DRIVEN_PATTERN",
        "FILL_PATTERN",
        "LINEAR_PATTERN",
        "SKETCH_DRIVEN_PATTERN",
        "TABLE_DRIVEN_PATTERN",
      ]);
    });

    it("operationsByCategory('Part_Body') returns exactly 4 body ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Part_Body");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["COMBINE_BODIES", "MOVE_COPY_BODY", "SCALE_BODY", "SPLIT_BODY"]);
    });

    it("MIRROR_FEATURE has its own Part_Mirror category (distinct from patterns)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "MIRROR_FEATURE");
      expect(op!.category).toBe("Part_Mirror");
    });

    it("COMBINE_BODIES 'Operation' dropdown lists boolean modes (add/subtract/common)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "part_operations",
        "COMBINE_BODIES",
        "Operation",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["add", "subtract", "common"]);
    });

    it("LINEAR_PATTERN binds to IFeatureManager.FeatureLinearPattern5", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("part_operations", "LINEAR_PATTERN");
      expect(op!.solidworks_api).toBe("IFeatureManager.FeatureLinearPattern5");
    });
  });

  describe("part_operations — coverage rollup into the index", () => {
    it("coverage_summary.total_units_covered now lists U-01 and U-02", () => {
      const cs = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary;
      expect(cs.total_units_covered).toEqual(["U-CAD-FIDX-SW-01", "U-CAD-FIDX-SW-02"]);
    });

    it("coverage_summary.estimated_parameter_total is 322 (132 sketch + 190 part)", () => {
      const cs = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary;
      expect(cs.estimated_parameter_total).toBe(322);
    });

    it("api_surface counts climb from 22 to 52 (22 sketch + 30 part ops)", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.sw_api_com_items).toBe(52);
      expect(api.vba_macro_items).toBe(52);
      expect(api.vsta_addin_items).toBe(52);
    });

    it("phase_1_target_modules_remaining drops from 7 to 6", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.phase_1_target_modules_remaining).toBe(6);
    });

    it("phase_1_modules_pending no longer contains 'part_operations'", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.phase_1_modules_pending).not.toContain("part_operations");
      expect(api.phase_1_modules_pending).toHaveLength(6);
    });

    it("platform_integration.part_layer is now true", () => {
      const pi = SolidWorksCADFunctionIndexEngine.getIndex().platform_integration;
      expect(pi.part_layer).toBe(true);
    });

    it("getTotalParameterCount() returns 322 across both shipped modules", () => {
      const total = SolidWorksCADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(322);
    });
  });
});
