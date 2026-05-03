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

    it("listAllOperations returns 159 ops total (7 modules shipped through U-07: sketch+part+surface+assembly+drawing+sheet_metal+weldment)", () => {
      const all = SolidWorksCADFunctionIndexEngine.listAllOperations();
      expect(all).toHaveLength(159);
    });

    it("listOperations('part_operations') returns 30 (shipped in U-02)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("part_operations")).toHaveLength(30);
    });

    it("listOperations('surface_operations') returns 20 (shipped in U-03)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("surface_operations")).toHaveLength(
        20,
      );
    });

    it("listOperations('assembly_operations') returns 26 (shipped in U-04)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("assembly_operations")).toHaveLength(
        26,
      );
    });

    it("listOperations('drawing_operations') returns 24 (shipped in U-05)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("drawing_operations")).toHaveLength(
        24,
      );
    });

    it("listOperations('sheet_metal_operations') returns 22 (shipped in U-06)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("sheet_metal_operations")).toHaveLength(
        22,
      );
    });

    it("listOperations('weldment_operations') returns 15 (shipped in U-07)", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("weldment_operations")).toHaveLength(
        15,
      );
    });

    it("listOperations('evaluation_operations') returns 0 — final pending module — failure mode", () => {
      expect(SolidWorksCADFunctionIndexEngine.listOperations("evaluation_operations")).toHaveLength(
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
    it("searchParameters('Sketch Plane') finds 20 operations across sketch + part + surface + sheet_metal modules", () => {
      const matches = SolidWorksCADFunctionIndexEngine.searchParameters("Sketch Plane");
      // 16 sketch + HOLE_WIZARD (part) + SURFACE_EXTRUDE + SURFACE_PLANAR (surface)
      //   + TAB (sheet_metal) = 20.
      expect(matches.length).toBe(20);
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
      // 10 sketch + 1 part + 2 surface + 4 assembly + 5 drawing + 4 sheet_metal = 26 distinct ops.
      // Sheet_metal contributors (substring 'mode' matches Mode-bearing params):
      //   EDGE_FLANGE (Position Mode) / MITER_FLANGE (Position Mode) /
      //   HEM (Position Mode) / SKETCHED_BEND (Bend Position).
      const distinctOps = new Set(matches.map((m) => m.operation_id));
      expect(distinctOps.size).toBe(26);
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

    it("getTotalParameterCount equals 1061 (132+190+150+172+165+148+104 across 7 shipped modules)", () => {
      expect(SolidWorksCADFunctionIndexEngine.getTotalParameterCount()).toBe(1061);
    });

    it("declared estimated_parameter_total matches actual count (no drift)", () => {
      const declared =
        SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total;
      const actual = SolidWorksCADFunctionIndexEngine.getTotalParameterCount();
      expect(declared).toBe(actual);
      expect(declared).toBe(1061);
    });
  });

  describe("coverage_summary + platform_integration — phase 1 progress", () => {
    it("coverage_state is IN_PROGRESS with 1 module pending (only evaluation_operations remains)", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface as {
        coverage_state?: string;
        phase_1_target_modules_remaining?: number;
        phase_1_modules_pending?: readonly string[];
        solidworks_cad_8_of_8?: boolean;
        inventor_parity?: boolean;
      };
      expect(api.coverage_state).toBe("IN_PROGRESS");
      expect(api.phase_1_target_modules_remaining).toBe(1);
      expect(api.phase_1_modules_pending).toEqual(["evaluation_operations"]);
      expect(api.solidworks_cad_8_of_8).toBe(false);
      expect(api.inventor_parity).toBe(false);
    });

    it("platform_integration has 7 authoring layers enabled through U-07 (sketch + part + surface + assembly + drawing + sheet_metal + weldment)", () => {
      const pi = SolidWorksCADFunctionIndexEngine.getIndex().platform_integration ?? {};
      expect(pi.sketch_layer).toBe(true);
      expect(pi.part_layer).toBe(true);
      expect(pi.surface_layer).toBe(true);
      expect(pi.assembly_layer).toBe(true);
      expect(pi.drawing_layer).toBe(true);
      expect(pi.sheet_metal_layer).toBe(true);
      expect(pi.weldment_layer).toBe(true);
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
      expect(api.sw_api_com_items).toBe(159);
      expect(api.vba_macro_items).toBe(159);
      expect(api.vsta_addin_items).toBe(159);
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

  describe("part_operations — coverage rollup into the index (post-U-07)", () => {
    it("coverage_summary.total_units_covered now lists U-01 through U-07", () => {
      const cs = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary;
      expect(cs.total_units_covered).toEqual([
        "U-CAD-FIDX-SW-01",
        "U-CAD-FIDX-SW-02",
        "U-CAD-FIDX-SW-03",
        "U-CAD-FIDX-SW-04",
        "U-CAD-FIDX-SW-05",
        "U-CAD-FIDX-SW-06",
        "U-CAD-FIDX-SW-07",
      ]);
    });

    it("coverage_summary.estimated_parameter_total is 1061 (132+190+150+172+165+148+104 across 7 modules)", () => {
      const cs = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary;
      expect(cs.estimated_parameter_total).toBe(1061);
    });

    it("api_surface counts climb to 159 (22+30+20+26+24+22+15 ops across 7 modules)", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.sw_api_com_items).toBe(159);
      expect(api.vba_macro_items).toBe(159);
      expect(api.vsta_addin_items).toBe(159);
    });

    it("phase_1_target_modules_remaining drops from 2 to 1 — only evaluation_operations remains", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.phase_1_target_modules_remaining).toBe(1);
    });

    it("phase_1_modules_pending contains only evaluation_operations", () => {
      const api = SolidWorksCADFunctionIndexEngine.getIndex().coverage_summary.api_surface;
      expect(api.phase_1_modules_pending).not.toContain("weldment_operations");
      expect(api.phase_1_modules_pending).toEqual(["evaluation_operations"]);
      expect(api.phase_1_modules_pending).toHaveLength(1);
    });

    it("platform_integration has 7 of 8 layers true (only evaluation_layer remains false)", () => {
      const pi = SolidWorksCADFunctionIndexEngine.getIndex().platform_integration;
      expect(pi.part_layer).toBe(true);
      expect(pi.surface_layer).toBe(true);
      expect(pi.assembly_layer).toBe(true);
      expect(pi.drawing_layer).toBe(true);
      expect(pi.sheet_metal_layer).toBe(true);
      expect(pi.weldment_layer).toBe(true);
      expect(pi.evaluation_layer).toBe(false);
    });

    it("getTotalParameterCount() returns 1061 across all 7 shipped modules", () => {
      const total = SolidWorksCADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(1061);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-03 — surface_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_SURFACE_OPS_20 = [
    "SURFACE_EXTRUDE",
    "SURFACE_REVOLVE",
    "SURFACE_SWEEP",
    "SURFACE_LOFT",
    "SURFACE_BOUNDARY",
    "SURFACE_RULED",
    "SURFACE_RADIATED",
    "SURFACE_FILL",
    "SURFACE_PLANAR",
    "SURFACE_FROM_BODY",
    "SURFACE_OFFSET",
    "SURFACE_TRIM",
    "SURFACE_UNTRIM",
    "SURFACE_EXTEND",
    "SURFACE_KNIT",
    "SURFACE_REPLACE_FACE",
    "SURFACE_DELETE_FACE",
    "SURFACE_MOVE_FACE",
    "SURFACE_THICKEN",
    "SURFACE_KNIT_TO_SOLID",
  ];

  describe("surface_operations — module catalog (U-CAD-FIDX-SW-03)", () => {
    it("loads the surface_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 150 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(cat!.metadata.totalParameters).toBe(150);
    });

    it("metadata.operationCount is exactly 20", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(cat!.metadata.operationCount).toBe(20);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-03'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-03");
    });

    it("listOperations('surface_operations') returns exactly 20 operations", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("surface_operations");
      expect(ops).toHaveLength(20);
    });

    it("listOperations contains every expected surface op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("surface_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_SURFACE_OPS_20].sort());
    });

    it("module_entry.parameter_count_estimate is 150 in the index header", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("surface_operations");
      expect(entry!.parameter_count_estimate).toBe(150);
    });

    it("module_entry.dependencies is exactly ['sketch_operations', 'part_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("surface_operations");
      expect(entry!.dependencies).toEqual(["sketch_operations", "part_operations"]);
    });

    it("sum of per-tab parameter arrays equals 150 (no count drift between metadata and reality)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(150);
    });

    it("returns same module-object identity on repeated getModule calls (per-module cache)", () => {
      const a = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      const b = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(a === b).toBe(true);
    });
  });

  describe("surface_operations — sweep families (extrude/revolve/sweep/loft/boundary/ruled/radiated)", () => {
    it("SURFACE_EXTRUDE binds to IFeatureManager.FeatureExtruRefSurface3", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_EXTRUDE",
      );
      expect(op!.solidworks_command).toBe("Insert > Surface > Extrude");
      expect(op!.solidworks_api).toBe("IFeatureManager.FeatureExtruRefSurface3");
      expect(op!.category).toBe("Surface_Sweep_Extrude");
    });

    it("SURFACE_EXTRUDE Direction 1 End Condition has 8 termination modes (parity with EXTRUDE_BOSS)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_EXTRUDE",
        "Direction 1 End Condition",
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

    it("SURFACE_REVOLVE Revolve Type lists exactly the 3 revolve modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_REVOLVE",
        "Revolve Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["one_direction", "mid_plane", "two_direction"]);
    });

    it("SURFACE_SWEEP Profile Type supports sketch/circular/solid profile modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_SWEEP",
        "Profile Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["sketch_profile", "circular_profile", "solid_profile"]);
    });

    it("SURFACE_SWEEP Twist Type covers all 5 twist modes including direction_vector", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_SWEEP",
        "Twist Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "follow_path",
        "keep_normal_constant",
        "direction_vector",
        "twist_with_n_turns",
        "twist_with_angle",
      ]);
    });

    it("SURFACE_LOFT Start Constraint and End Constraint both expose 5 continuity modes", () => {
      const startLoc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_LOFT",
        "Start Constraint",
      );
      const endLoc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_LOFT",
        "End Constraint",
      );
      const expected = [
        "none",
        "normal_to_profile",
        "direction_vector",
        "tangent_to_face",
        "curvature_to_face",
      ];
      expect((startLoc!.parameter as { options?: string[] }).options).toEqual(expected);
      expect((endLoc!.parameter as { options?: string[] }).options).toEqual(expected);
    });

    it("SURFACE_BOUNDARY Direction 1/2 Tangent Type both cover 4 continuity modes", () => {
      const d1 = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_BOUNDARY",
        "Direction 1 Tangent Type",
      );
      const d2 = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_BOUNDARY",
        "Direction 2 Tangent Type",
      );
      const expected = ["none", "contact", "tangency", "curvature"];
      expect((d1!.parameter as { options?: string[] }).options).toEqual(expected);
      expect((d2!.parameter as { options?: string[] }).options).toEqual(expected);
    });

    it("SURFACE_RULED Type enumerates all 5 ruling generation modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_RULED",
        "Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "tangent_to_surface",
        "normal_to_surface",
        "tapered_to_vector",
        "perpendicular_to_vector",
        "sweep",
      ]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_RADIATED Draft Angle is bounded (-89, +89) deg with default 0", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_RADIATED",
        "Draft Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(-89);
      expect(param.max).toBe(89);
      expect(param.default).toBe(0);
      expect(param.unit).toBe("deg");
    });
  });

  describe("surface_operations — patch creators (fill / planar / from_body)", () => {
    it("SURFACE_FILL has 12 params and Curvature Control with 3 modes", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      const fill = cat!.operations.SURFACE_FILL;
      expect(fill.parameterCount).toBe(12);
      const curv = (fill.tabs!.Surface.parameters ?? []).find(
        (p) => p.name === "Curvature Control",
      );
      expect((curv as { options?: string[] }).options).toEqual(["contact", "tangent", "curvature"]);
    });

    it("SURFACE_FILL Resolution Control supports coarse/medium/fine and defaults to medium", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_FILL",
        "Resolution Control",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual(["coarse", "medium", "fine"]);
      expect(param.default).toBe("medium");
    });

    it("SURFACE_PLANAR has 4 params on a single Surface tab", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("surface_operations");
      expect(cat!.operations.SURFACE_PLANAR.parameterCount).toBe(4);
      expect(Object.keys(cat!.operations.SURFACE_PLANAR.tabs ?? {})).toEqual(["Surface"]);
    });

    it("SURFACE_FROM_BODY binds to InsertSurfaceFromBody and lives in the Convert taxonomy", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_FROM_BODY",
      );
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertSurfaceFromBody");
      expect(op!.category).toBe("Surface_Convert_FromSolid");
    });
  });

  describe("surface_operations — modify ops (offset/trim/untrim/extend/knit/replace_face)", () => {
    it("SURFACE_OFFSET binds to InsertOffsetSurface2 and exposes Make Solid checkbox", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_OFFSET",
      );
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertOffsetSurface2");
      const makeSolid = (op!.tabs!.Surface.parameters ?? []).find((p) => p.name === "Make Solid");
      expect(makeSolid?.type).toBe("checkbox");
      expect(makeSolid?.default).toBe(false);
    });

    it("SURFACE_TRIM Trim Type supports standard and mutual trimming", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_TRIM",
        "Trim Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["standard", "mutual"]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_TRIM Selection Mode toggles keep vs remove pieces", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_TRIM",
        "Selection Mode",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["keep_selections", "remove_selections"]);
    });

    it("SURFACE_UNTRIM Untrim Type covers internal / external / both boundaries", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_UNTRIM",
        "Untrim Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["all_internal", "external_boundary", "both"]);
    });

    it("SURFACE_EXTEND End Condition supports distance / up_to_point / up_to_surface", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_EXTEND",
        "End Condition",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["distance", "up_to_point", "up_to_surface"]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_KNIT Try To Form Solid is opt-in (default false) — distinct from KNIT_TO_SOLID (default true)", () => {
      const knit = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_KNIT",
        "Try To Form Solid",
      );
      const knitToSolid = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_KNIT_TO_SOLID",
        "Try To Form Solid",
      );
      expect(knit!.parameter.default).toBe(false);
      expect(knitToSolid!.parameter.default).toBe(true);
    });

    it("SURFACE_REPLACE_FACE binds to InsertReplaceFace2 (direct-edit on imported geometry)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_REPLACE_FACE",
      );
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertReplaceFace2");
      expect(op!.category).toBe("Surface_Modify_ReplaceFace");
    });
  });

  describe("surface_operations — face-level direct-edit ops (delete_face / move_face)", () => {
    it("SURFACE_DELETE_FACE Mode supports delete / patch / fill (3 modes)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_DELETE_FACE",
        "Mode",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["delete", "delete_and_patch", "delete_and_fill"]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_MOVE_FACE Move Type covers offset / translate / rotate", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_MOVE_FACE",
        "Move Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["offset", "translate", "rotate"]);
      expect(param.required).toBe(true);
    });
  });

  describe("surface_operations — surface→solid converters (thicken / knit_to_solid)", () => {
    it("SURFACE_THICKEN Direction lists outward / inward / both_directions", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_THICKEN",
        "Direction",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["outward", "inward", "both_directions"]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_THICKEN binds to InsertThickenFeature in the Convert taxonomy", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_THICKEN",
      );
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertThickenFeature");
      expect(op!.category).toBe("Surface_Convert_Thicken");
    });

    it("SURFACE_KNIT_TO_SOLID lives in Convert taxonomy and shares InsertSewingFeature with SURFACE_KNIT", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_KNIT_TO_SOLID",
      );
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertSewingFeature");
      expect(op!.category).toBe("Surface_Convert_KnitToSolid");
    });

    it("getOperationsByCategory('Surface_Convert_KnitToSolid') returns exactly 1 op", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Surface_Convert_KnitToSolid",
      );
      expect(ops.map((o) => o.operation_id)).toEqual(["SURFACE_KNIT_TO_SOLID"]);
    });
  });

  describe("surface_operations — concrete contract tables (no synthetic loops, no toBeTruthy)", () => {
    it("getOperation returns null for unknown surface op — failure mode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.getOperation(
          "surface_operations",
          "SURFACE_NONEXISTENT",
        ),
      ).toBeNull();
    });

    it("findParameter returns null for unknown param on a real surface op — failure mode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "surface_operations",
          "SURFACE_EXTRUDE",
          "phantom_param",
        ),
      ).toBeNull();
    });

    it("Distance numeric params have min=0.001 mm on the 3 distance-bearing ops", () => {
      const distanceOps: readonly string[] = ["SURFACE_RULED", "SURFACE_RADIATED", "SURFACE_EXTEND"];
      for (const opId of distanceOps) {
        const loc = SolidWorksCADFunctionIndexEngine.findParameter(
          "surface_operations",
          opId,
          "Distance",
        );
        const param = loc!.parameter as { type?: string; min?: number; unit?: string };
        expect(param.type).toBe("numeric");
        expect(param.min).toBe(0.001);
        expect(param.unit).toBe("mm");
      }
    });

    it("SURFACE_REVOLVE Angle 1 is bounded (0.001, 360) deg with default 360", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_REVOLVE",
        "Angle 1",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(360);
      expect(param.default).toBe(360);
      expect(param.unit).toBe("deg");
    });

    it("each of the 20 surface ops binds to its IFeatureManager API method (concrete table)", () => {
      const apiBindings: Record<string, string> = {
        SURFACE_EXTRUDE: "IFeatureManager.FeatureExtruRefSurface3",
        SURFACE_REVOLVE: "IFeatureManager.FeatureRevolveSurface2",
        SURFACE_SWEEP: "IFeatureManager.FeatureSurfaceSweep",
        SURFACE_LOFT: "IFeatureManager.FeatureSurfaceLoft",
        SURFACE_BOUNDARY: "IFeatureManager.FeatureBoundarySurface",
        SURFACE_RULED: "IFeatureManager.InsertRuledSurface2",
        SURFACE_RADIATED: "IFeatureManager.RadiatedSurfaceFeature",
        SURFACE_FILL: "IFeatureManager.InsertFilledSurfaceFeature2",
        SURFACE_PLANAR: "IFeatureManager.InsertPlanarSurface",
        SURFACE_FROM_BODY: "IFeatureManager.InsertSurfaceFromBody",
        SURFACE_OFFSET: "IFeatureManager.InsertOffsetSurface2",
        SURFACE_TRIM: "IFeatureManager.InsertSurfaceTrim2",
        SURFACE_UNTRIM: "IFeatureManager.FeatureUntrimSurface",
        SURFACE_EXTEND: "IFeatureManager.InsertExtendSurfaceFeature",
        SURFACE_KNIT: "IFeatureManager.InsertSewingFeature",
        SURFACE_REPLACE_FACE: "IFeatureManager.InsertReplaceFace2",
        SURFACE_DELETE_FACE: "IFeatureManager.InsertDeleteFace",
        SURFACE_MOVE_FACE: "IFeatureManager.InsertMoveFace2",
        SURFACE_THICKEN: "IFeatureManager.InsertThickenFeature",
        SURFACE_KNIT_TO_SOLID: "IFeatureManager.InsertSewingFeature",
      };
      const expectedKeys = Object.keys(apiBindings).sort();
      expect(expectedKeys).toEqual([...KNOWN_SURFACE_OPS_20].sort());
      for (const [opId, expectedApi] of Object.entries(apiBindings)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("surface_operations", opId);
        expect(op).not.toBeNull();
        expect(op!.solidworks_api).toBe(expectedApi);
      }
    });

    it("each of the 20 surface ops carries its UI command path (Insert > Surface > X table)", () => {
      const commandPaths: Record<string, string> = {
        SURFACE_EXTRUDE: "Insert > Surface > Extrude",
        SURFACE_REVOLVE: "Insert > Surface > Revolve",
        SURFACE_SWEEP: "Insert > Surface > Sweep",
        SURFACE_LOFT: "Insert > Surface > Loft",
        SURFACE_BOUNDARY: "Insert > Surface > Boundary",
        SURFACE_RULED: "Insert > Surface > Ruled Surface",
        SURFACE_RADIATED: "Insert > Surface > Radiated Surface",
        SURFACE_FILL: "Insert > Surface > Fill",
        SURFACE_PLANAR: "Insert > Surface > Planar Surface",
        SURFACE_FROM_BODY: "Insert > Surface > Offset (zero offset)",
        SURFACE_OFFSET: "Insert > Surface > Offset",
        SURFACE_TRIM: "Insert > Surface > Trim",
        SURFACE_UNTRIM: "Insert > Surface > Untrim",
        SURFACE_EXTEND: "Insert > Surface > Extend",
        SURFACE_KNIT: "Insert > Surface > Knit",
        SURFACE_REPLACE_FACE: "Insert > Face > Replace",
        SURFACE_DELETE_FACE: "Insert > Face > Delete",
        SURFACE_MOVE_FACE: "Insert > Face > Move",
        SURFACE_THICKEN: "Insert > Boss/Base > Thicken",
        SURFACE_KNIT_TO_SOLID: "Insert > Surface > Knit (Try To Form Solid)",
      };
      for (const [opId, expectedCommand] of Object.entries(commandPaths)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("surface_operations", opId);
        expect(op!.solidworks_command).toBe(expectedCommand);
      }
    });

    it("each of the 20 surface ops sits in its category bucket (Sweep/Convert/Modify split table)", () => {
      const categories: Record<string, string> = {
        SURFACE_EXTRUDE: "Surface_Sweep_Extrude",
        SURFACE_REVOLVE: "Surface_Sweep_Revolve",
        SURFACE_SWEEP: "Surface_Sweep_Sweep",
        SURFACE_LOFT: "Surface_Sweep_Loft",
        SURFACE_BOUNDARY: "Surface_Sweep_Boundary",
        SURFACE_RULED: "Surface_Sweep_Ruled",
        SURFACE_RADIATED: "Surface_Sweep_Radiated",
        SURFACE_FILL: "Surface_Sweep_Fill",
        SURFACE_PLANAR: "Surface_Sweep_Planar",
        SURFACE_FROM_BODY: "Surface_Convert_FromSolid",
        SURFACE_OFFSET: "Surface_Modify_Offset",
        SURFACE_TRIM: "Surface_Modify_Trim",
        SURFACE_UNTRIM: "Surface_Modify_Untrim",
        SURFACE_EXTEND: "Surface_Modify_Extend",
        SURFACE_KNIT: "Surface_Modify_Knit",
        SURFACE_REPLACE_FACE: "Surface_Modify_ReplaceFace",
        SURFACE_DELETE_FACE: "Surface_Modify_DeleteFace",
        SURFACE_MOVE_FACE: "Surface_Modify_MoveFace",
        SURFACE_THICKEN: "Surface_Convert_Thicken",
        SURFACE_KNIT_TO_SOLID: "Surface_Convert_KnitToSolid",
      };
      for (const [opId, expectedCategory] of Object.entries(categories)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("surface_operations", opId);
        expect(op!.category).toBe(expectedCategory);
      }
    });

    it("each surface op declares its first required input (concrete API selection contract)", () => {
      const requiredFirstParam: Record<string, string> = {
        SURFACE_EXTRUDE: "Profile",
        SURFACE_REVOLVE: "Profile",
        SURFACE_SWEEP: "Profile",
        SURFACE_LOFT: "Profiles",
        SURFACE_BOUNDARY: "Direction 1 Curves",
        SURFACE_RULED: "Edges",
        SURFACE_RADIATED: "Source Curves",
        SURFACE_FILL: "Patch Boundary",
        SURFACE_PLANAR: "Boundary",
        SURFACE_FROM_BODY: "Faces",
        SURFACE_OFFSET: "Source Faces",
        SURFACE_TRIM: "Trim Type",
        SURFACE_UNTRIM: "Faces / Edges",
        SURFACE_EXTEND: "Edges / Faces",
        SURFACE_KNIT: "Surfaces / Faces",
        SURFACE_REPLACE_FACE: "Target Faces",
        SURFACE_DELETE_FACE: "Faces",
        SURFACE_MOVE_FACE: "Faces",
        SURFACE_THICKEN: "Surface",
        SURFACE_KNIT_TO_SOLID: "Surfaces",
      };
      for (const [opId, paramName] of Object.entries(requiredFirstParam)) {
        const loc = SolidWorksCADFunctionIndexEngine.findParameter(
          "surface_operations",
          opId,
          paramName,
        );
        expect(loc, `${opId} missing required first param '${paramName}'`).not.toBeNull();
        expect(loc!.parameter.required).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-04 — assembly_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_ASSEMBLY_OPS_26 = [
    "MATE_ADD",
    "MATE_DELETE",
    "MATE_EDIT",
    "MATE_FLIP_ALIGNMENT",
    "MATE_SUPPRESS",
    "INSERT_COMPONENT",
    "DELETE_COMPONENT",
    "REPLACE_COMPONENT",
    "COMPONENT_LINEAR_PATTERN",
    "COMPONENT_CIRCULAR_PATTERN",
    "COMPONENT_PATTERN_DRIVEN",
    "MIRROR_COMPONENTS",
    "FIX_COMPONENT",
    "SUPPRESS_COMPONENT",
    "SMART_FASTENER",
    "INSERT_SUBASSEMBLY",
    "INSERT_NEW_PART",
    "DISSOLVE_SUBASSEMBLY",
    "FLEXIBLE_SUBASSEMBLY",
    "ADD_CONFIGURATION",
    "SWITCH_CONFIGURATION",
    "EXPLODE_VIEW_CREATE",
    "EXPLODED_STEP_ADD",
    "SMART_EXPLODE_LINE",
    "INTERFERENCE_DETECTION",
    "CLEARANCE_VERIFICATION",
  ];

  // The 26-mate-type SolidWorks taxonomy: 10 standard + 8 advanced + 8 mechanical.
  const STANDARD_MATES_10 = [
    "coincident", "concentric", "parallel", "perpendicular", "tangent",
    "distance", "angle", "lock", "lock_distance", "profile_center",
  ];
  const ADVANCED_MATES_8 = [
    "symmetric", "width", "path", "linear_coupler",
    "distance_limit", "angle_limit", "hinge", "slot",
  ];
  const MECHANICAL_MATES_8 = [
    "cam", "gear", "screw", "universal_joint",
    "rack_pinion", "belt_chain", "hinge_advanced", "slot_advanced",
  ];
  const ALL_26_MATE_TYPES = [...STANDARD_MATES_10, ...ADVANCED_MATES_8, ...MECHANICAL_MATES_8];

  describe("assembly_operations — module catalog (U-CAD-FIDX-SW-04)", () => {
    it("loads the assembly_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("assembly_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 172 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("assembly_operations");
      expect(cat!.metadata.totalParameters).toBe(172);
    });

    it("metadata.operationCount is exactly 26", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("assembly_operations");
      expect(cat!.metadata.operationCount).toBe(26);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-04'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("assembly_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-04");
    });

    it("listOperations('assembly_operations') returns exactly 26 operations", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("assembly_operations");
      expect(ops).toHaveLength(26);
    });

    it("listOperations contains every expected assembly op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("assembly_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_ASSEMBLY_OPS_26].sort());
    });

    it("module_entry.parameter_count_estimate is 172 in the index header", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("assembly_operations");
      expect(entry!.parameter_count_estimate).toBe(172);
    });

    it("module_entry.dependencies is exactly ['part_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("assembly_operations");
      expect(entry!.dependencies).toEqual(["part_operations"]);
    });

    it("sum of per-tab parameter arrays equals 172 (no count drift)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("assembly_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(172);
    });
  });

  describe("assembly_operations — MATE_ADD with 26 mate types (10 standard + 8 advanced + 8 mechanical)", () => {
    it("MATE_ADD binds to IAssemblyDoc.AddMate3", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      expect(op!.solidworks_command).toBe("Insert > Mate");
      expect(op!.solidworks_api).toBe("IAssemblyDoc.AddMate3");
      expect(op!.category).toBe("Assembly_Mate_Add");
    });

    it("MATE_ADD Mate Type enumerates exactly 26 mate types in canonical SolidWorks order", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Mate Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(ALL_26_MATE_TYPES);
      expect(param.required).toBe(true);
      expect(param.default).toBe("coincident");
    });

    it("MATE_ADD Mate Type contains all 10 standard mates", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Mate Type",
      );
      const param = loc!.parameter as { options?: string[] };
      for (const standardMate of STANDARD_MATES_10) {
        expect(param.options).toContain(standardMate);
      }
    });

    it("MATE_ADD Mate Type contains all 8 advanced mates", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Mate Type",
      );
      const param = loc!.parameter as { options?: string[] };
      for (const advancedMate of ADVANCED_MATES_8) {
        expect(param.options).toContain(advancedMate);
      }
    });

    it("MATE_ADD Mate Type contains all 8 mechanical mates", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Mate Type",
      );
      const param = loc!.parameter as { options?: string[] };
      for (const mechanicalMate of MECHANICAL_MATES_8) {
        expect(param.options).toContain(mechanicalMate);
      }
    });

    it("MATE_ADD has 4 parameter tabs (Selections + Standard Mates + Advanced Mates + Mechanical Mates)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      expect(Object.keys(op!.tabs ?? {})).toEqual([
        "Selections",
        "Standard Mates",
        "Advanced Mates",
        "Mechanical Mates",
      ]);
    });

    it("MATE_ADD parameterCount sums to 25 across all 4 tabs (no drift)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      let sum = 0;
      for (const tab of Object.values(op!.tabs ?? {})) {
        sum += (tab.parameters ?? []).length;
      }
      expect(sum).toBe(25);
      expect(op!.parameterCount).toBe(25);
    });

    it("MATE_ADD Standard Mates tab carries the Distance + Angle dimensional params", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      const standardParams = op!.tabs!["Standard Mates"].parameters ?? [];
      const distance = standardParams.find((p) => p.name === "Distance");
      const angle = standardParams.find((p) => p.name === "Angle");
      expect(distance?.unit).toBe("mm");
      expect(distance?.min).toBe(0);
      expect(angle?.unit).toBe("deg");
      expect(angle?.min).toBe(-360);
      expect(angle?.max).toBe(360);
    });

    it("MATE_ADD Advanced Mates tab covers symmetric/width/path/linear_coupler/limit-pair semantics", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      const advancedParams = op!.tabs!["Advanced Mates"].parameters ?? [];
      const names = advancedParams.map((p) => p.name);
      expect(names).toContain("Symmetric About");
      expect(names).toContain("Width Constraint");
      expect(names).toContain("Path Constraint");
      expect(names).toContain("Linear Coupler Ratio");
      expect(names).toContain("Distance Limit Min");
      expect(names).toContain("Distance Limit Max");
      expect(names).toContain("Angle Limit Min");
      expect(names).toContain("Angle Limit Max");
    });

    it("MATE_ADD Mechanical Mates tab covers cam/gear/screw/universal_joint/belt_chain", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_ADD");
      const mechanicalParams = op!.tabs!["Mechanical Mates"].parameters ?? [];
      const names = mechanicalParams.map((p) => p.name);
      expect(names).toContain("Cam Path");
      expect(names).toContain("Gear Ratio Numerator");
      expect(names).toContain("Gear Ratio Denominator");
      expect(names).toContain("Screw Pitch");
      expect(names).toContain("Universal Joint Yoke Direction");
      expect(names).toContain("Belt Chain Length");
      expect(names).toContain("Belt Chain Driver Direction");
    });

    it("MATE_ADD Width Constraint enumerates all 4 width modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Width Constraint",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["centered", "free", "dimension", "percent"]);
    });

    it("MATE_ADD Path Constraint enumerates all 3 path modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Path Constraint",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["free", "distance_along_path", "percent_along_path"]);
    });
  });

  describe("assembly_operations — mate lifecycle (delete / edit / flip / suppress)", () => {
    it("MATE_DELETE binds to IFeatureManager.DeleteFeatureByName", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", "MATE_DELETE");
      expect(op!.solidworks_api).toBe("IFeatureManager.DeleteFeatureByName");
      expect(op!.category).toBe("Assembly_Mate_Lifecycle");
    });

    it("MATE_FLIP_ALIGNMENT New Alignment supports aligned/anti_aligned/auto", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_FLIP_ALIGNMENT",
        "New Alignment",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["aligned", "anti_aligned", "auto"]);
    });

    it("MATE_SUPPRESS State enumerates exactly suppressed / unsuppressed", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_SUPPRESS",
        "State",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["suppressed", "unsuppressed"]);
      expect(param.required).toBe(true);
    });

    it("MATE_SUPPRESS Apply To Configuration covers per-config / all-configs / specified", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_SUPPRESS",
        "Apply To Configuration",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["this_configuration", "all_configurations", "specified"]);
    });

    it("getOperationsByCategory('Assembly_Mate_Lifecycle') returns the 4 lifecycle ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Assembly_Mate_Lifecycle",
      );
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["MATE_DELETE", "MATE_EDIT", "MATE_FLIP_ALIGNMENT", "MATE_SUPPRESS"]);
    });
  });

  describe("assembly_operations — component management (insert / delete / replace / state)", () => {
    it("INSERT_COMPONENT binds to IAssemblyDoc.AddComponent5 with X/Y/Z position params", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "assembly_operations",
        "INSERT_COMPONENT",
      );
      expect(op!.solidworks_api).toBe("IAssemblyDoc.AddComponent5");
      const params = op!.tabs!.Selections.parameters ?? [];
      const names = params.map((p) => p.name);
      expect(names).toContain("Position X");
      expect(names).toContain("Position Y");
      expect(names).toContain("Position Z");
      expect(names).toContain("Lightweight");
      expect(names).toContain("Envelope");
    });

    it("REPLACE_COMPONENT exposes Match Faces topology-remap heuristic (default true)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "REPLACE_COMPONENT",
        "Match Faces",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(true);
    });

    it("FIX_COMPONENT State toggles fixed vs float", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "FIX_COMPONENT",
        "State",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["fixed", "float"]);
      expect(param.required).toBe(true);
    });

    it("SUPPRESS_COMPONENT State covers all 4 component load states", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "SUPPRESS_COMPONENT",
        "State",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["suppressed", "resolved", "lightweight", "hidden"]);
    });

    it("SMART_FASTENER Fastener Standard covers 7 international standards", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "SMART_FASTENER",
        "Fastener Standard",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["ANSI_inch", "ANSI_metric", "ISO", "DIN", "JIS", "BSI", "GB"]);
      expect(param.required).toBe(true);
    });

    it("SMART_FASTENER Fastener Type covers 6 standard fastener geometries", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "SMART_FASTENER",
        "Fastener Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "socket_head_cap",
        "hex_bolt",
        "flat_head",
        "button_head",
        "set_screw",
        "stud",
      ]);
    });
  });

  describe("assembly_operations — component patterns (linear / circular / pattern-driven / mirror)", () => {
    it("COMPONENT_LINEAR_PATTERN supports 2-direction grids with skip instances", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "assembly_operations",
        "COMPONENT_LINEAR_PATTERN",
      );
      const params = op!.tabs!.Pattern.parameters ?? [];
      const names = params.map((p) => p.name);
      expect(names).toContain("Direction 1 Reference");
      expect(names).toContain("Direction 1 Spacing");
      expect(names).toContain("Direction 1 Instances");
      expect(names).toContain("Direction 2 Reference");
      expect(names).toContain("Skip Instances");
    });

    it("COMPONENT_LINEAR_PATTERN Direction 1 Instances is bounded 2..999 with default 2", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "COMPONENT_LINEAR_PATTERN",
        "Direction 1 Instances",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; required?: boolean };
      expect(param.min).toBe(2);
      expect(param.max).toBe(999);
      expect(param.default).toBe(2);
      expect(param.required).toBe(true);
    });

    it("COMPONENT_CIRCULAR_PATTERN Total Angle bounded (0.001, 360) deg with default 360", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "COMPONENT_CIRCULAR_PATTERN",
        "Total Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(360);
      expect(param.default).toBe(360);
      expect(param.unit).toBe("deg");
    });

    it("MIRROR_COMPONENTS Mode supports instance_reference vs create_opposite_hand_versions", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MIRROR_COMPONENTS",
        "Mode",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["instance_reference", "create_opposite_hand_versions"]);
      expect(param.required).toBe(true);
    });

    it("getOperationsByCategory('Assembly_Component_Pattern') returns the 4 pattern ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Assembly_Component_Pattern",
      );
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "COMPONENT_CIRCULAR_PATTERN",
        "COMPONENT_LINEAR_PATTERN",
        "COMPONENT_PATTERN_DRIVEN",
        "MIRROR_COMPONENTS",
      ]);
    });
  });

  describe("assembly_operations — sub-assembly + configuration + exploded view + verification", () => {
    it("INSERT_SUBASSEMBLY Solve As toggles rigid vs flexible", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "INSERT_SUBASSEMBLY",
        "Solve As",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual(["rigid", "flexible"]);
      expect(param.default).toBe("rigid");
    });

    it("INSERT_NEW_PART Save As Virtual defaults true (in-context virtual part embedding)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "INSERT_NEW_PART",
        "Save As Virtual",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(true);
    });

    it("FLEXIBLE_SUBASSEMBLY State enumerates rigid vs flexible", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "FLEXIBLE_SUBASSEMBLY",
        "State",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["rigid", "flexible"]);
      expect(param.required).toBe(true);
    });

    it("ADD_CONFIGURATION Suppression Inheritance covers 3 inheritance policies", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "ADD_CONFIGURATION",
        "Suppression Inheritance",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "new_components_unsuppressed",
        "new_components_suppressed",
        "use_parent_setting",
      ]);
    });

    it("EXPLODED_STEP_ADD Step Type supports translate vs rotate", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "EXPLODED_STEP_ADD",
        "Step Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["translate", "rotate"]);
      expect(param.required).toBe(true);
    });

    it("EXPLODED_STEP_ADD Step Index uses -1 sentinel for append-to-end", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "EXPLODED_STEP_ADD",
        "Step Index",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number };
      expect(param.min).toBe(-1);
      expect(param.max).toBe(999);
      expect(param.default).toBe(-1);
    });

    it("INTERFERENCE_DETECTION binds to IInterferenceDetectionMgr.GetInterferences", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "assembly_operations",
        "INTERFERENCE_DETECTION",
      );
      expect(op!.solidworks_api).toBe("IInterferenceDetectionMgr.GetInterferences");
      expect(op!.category).toBe("Assembly_Verification");
    });

    it("CLEARANCE_VERIFICATION Pair Strategy covers between/within/all_pairs", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "CLEARANCE_VERIFICATION",
        "Pair Strategy",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["between_groups", "within_groups", "all_pairs"]);
    });
  });

  describe("assembly_operations — concrete contract tables (api / command / category / required)", () => {
    it("each of the 26 assembly ops binds to its IAssemblyDoc / IFeatureManager / IComponent2 API method", () => {
      const apiBindings: Record<string, string> = {
        MATE_ADD: "IAssemblyDoc.AddMate3",
        MATE_DELETE: "IFeatureManager.DeleteFeatureByName",
        MATE_EDIT: "IMate2.MateEntity / IMate2.SetDistance / IMate2.SetAngle",
        MATE_FLIP_ALIGNMENT: "IMate2.Alignment (set)",
        MATE_SUPPRESS: "IFeatureManager.EditSuppression2",
        INSERT_COMPONENT: "IAssemblyDoc.AddComponent5",
        DELETE_COMPONENT: "IModelDoc2.Extension.DeleteSelection2",
        REPLACE_COMPONENT: "IAssemblyDoc.ReplaceComponents2",
        COMPONENT_LINEAR_PATTERN: "IAssemblyDoc.FeatureLinearComponentPattern",
        COMPONENT_CIRCULAR_PATTERN: "IAssemblyDoc.FeatureCircularComponentPattern",
        COMPONENT_PATTERN_DRIVEN: "IAssemblyDoc.FeatureDerivedComponentPattern",
        MIRROR_COMPONENTS: "IAssemblyDoc.FeatureMirrorComponent",
        FIX_COMPONENT: "IComponent2.Select4 + IModelDoc2.Extension.FixComponent / FloatComponent",
        SUPPRESS_COMPONENT: "IComponent2.SetSuppression2",
        SMART_FASTENER: "IAssemblyDoc.SmartFastener",
        INSERT_SUBASSEMBLY: "IAssemblyDoc.AddComponent5 (with sub-assembly path)",
        INSERT_NEW_PART: "IAssemblyDoc.InsertNewVirtualPart",
        DISSOLVE_SUBASSEMBLY: "IAssemblyDoc.Dissolve",
        FLEXIBLE_SUBASSEMBLY: "IComponent2.Solving (set)",
        ADD_CONFIGURATION: "IConfigurationManager.AddConfiguration2",
        SWITCH_CONFIGURATION: "IModelDoc2.ShowConfiguration2",
        EXPLODE_VIEW_CREATE: "IAssemblyDoc.CreateExplodedViewByConfig",
        EXPLODED_STEP_ADD: "IExplodeStep.AddStep",
        SMART_EXPLODE_LINE: "IExplodeLineSketch.AddRoute",
        INTERFERENCE_DETECTION: "IInterferenceDetectionMgr.GetInterferences",
        CLEARANCE_VERIFICATION: "IClearanceVerification.GetMinimumDistances",
      };
      const expectedKeys = Object.keys(apiBindings).sort();
      expect(expectedKeys).toEqual([...KNOWN_ASSEMBLY_OPS_26].sort());
      for (const [opId, expectedApi] of Object.entries(apiBindings)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", opId);
        expect(op).not.toBeNull();
        expect(op!.solidworks_api).toBe(expectedApi);
      }
    });

    it("each of the 26 assembly ops sits in its category bucket", () => {
      const categories: Record<string, string> = {
        MATE_ADD: "Assembly_Mate_Add",
        MATE_DELETE: "Assembly_Mate_Lifecycle",
        MATE_EDIT: "Assembly_Mate_Lifecycle",
        MATE_FLIP_ALIGNMENT: "Assembly_Mate_Lifecycle",
        MATE_SUPPRESS: "Assembly_Mate_Lifecycle",
        INSERT_COMPONENT: "Assembly_Component_Insert",
        DELETE_COMPONENT: "Assembly_Component_Lifecycle",
        REPLACE_COMPONENT: "Assembly_Component_Lifecycle",
        COMPONENT_LINEAR_PATTERN: "Assembly_Component_Pattern",
        COMPONENT_CIRCULAR_PATTERN: "Assembly_Component_Pattern",
        COMPONENT_PATTERN_DRIVEN: "Assembly_Component_Pattern",
        MIRROR_COMPONENTS: "Assembly_Component_Pattern",
        FIX_COMPONENT: "Assembly_Component_State",
        SUPPRESS_COMPONENT: "Assembly_Component_State",
        SMART_FASTENER: "Assembly_Component_Insert",
        INSERT_SUBASSEMBLY: "Assembly_SubAssembly",
        INSERT_NEW_PART: "Assembly_SubAssembly",
        DISSOLVE_SUBASSEMBLY: "Assembly_SubAssembly",
        FLEXIBLE_SUBASSEMBLY: "Assembly_SubAssembly",
        ADD_CONFIGURATION: "Assembly_Configuration",
        SWITCH_CONFIGURATION: "Assembly_Configuration",
        EXPLODE_VIEW_CREATE: "Assembly_ExplodedView",
        EXPLODED_STEP_ADD: "Assembly_ExplodedView",
        SMART_EXPLODE_LINE: "Assembly_ExplodedView",
        INTERFERENCE_DETECTION: "Assembly_Verification",
        CLEARANCE_VERIFICATION: "Assembly_Verification",
      };
      for (const [opId, expectedCategory] of Object.entries(categories)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", opId);
        expect(op!.category).toBe(expectedCategory);
      }
    });

    it("each of the 26 assembly ops declares its first required input (concrete API contract)", () => {
      const requiredFirstParam: Record<string, string> = {
        MATE_ADD: "Entity 1",
        MATE_DELETE: "Mate Name",
        MATE_EDIT: "Mate Name",
        MATE_FLIP_ALIGNMENT: "Mate Name",
        MATE_SUPPRESS: "Mate Name",
        INSERT_COMPONENT: "File Path",
        DELETE_COMPONENT: "Component Names",
        REPLACE_COMPONENT: "Component Name",
        COMPONENT_LINEAR_PATTERN: "Seed Components",
        COMPONENT_CIRCULAR_PATTERN: "Seed Components",
        COMPONENT_PATTERN_DRIVEN: "Seed Components",
        MIRROR_COMPONENTS: "Mirror Plane",
        FIX_COMPONENT: "Component Names",
        SUPPRESS_COMPONENT: "Component Names",
        SMART_FASTENER: "Hole Selections",
        INSERT_SUBASSEMBLY: "File Path",
        INSERT_NEW_PART: "Mounting Face",
        DISSOLVE_SUBASSEMBLY: "Sub-Assembly Name",
        FLEXIBLE_SUBASSEMBLY: "Sub-Assembly Name",
        ADD_CONFIGURATION: "Configuration Name",
        SWITCH_CONFIGURATION: "Configuration Name",
        EXPLODE_VIEW_CREATE: "Exploded View Name",
        EXPLODED_STEP_ADD: "Exploded View Name",
        SMART_EXPLODE_LINE: "Exploded View Name",
        INTERFERENCE_DETECTION: "Components To Check",
        CLEARANCE_VERIFICATION: "Components A",
      };
      for (const [opId, paramName] of Object.entries(requiredFirstParam)) {
        const loc = SolidWorksCADFunctionIndexEngine.findParameter(
          "assembly_operations",
          opId,
          paramName,
        );
        expect(loc, `${opId} missing required first param '${paramName}'`).not.toBeNull();
        expect(loc!.parameter.required).toBe(true);
      }
    });
  });

  describe("assembly_operations — adversarial inputs (NaN / Infinity / empty / oversize / boundary)", () => {
    it("findParameter with empty-string parameter name returns null — adversarial empty input", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("assembly_operations", "MATE_ADD", ""),
      ).toBeNull();
    });

    it("findParameter with 256-char oversize parameter name returns null — adversarial oversize", () => {
      const oversize = "x".repeat(256);
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("assembly_operations", "MATE_ADD", oversize),
      ).toBeNull();
    });

    it("findParameter with NaN-cast string ('NaN') as param name returns null — adversarial NaN-shaped", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("assembly_operations", "MATE_ADD", "NaN"),
      ).toBeNull();
    });

    it("findParameter with Infinity-shaped string returns null — adversarial Infinity-shaped", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "assembly_operations",
          "MATE_ADD",
          "Infinity",
        ),
      ).toBeNull();
    });

    it("findParameter with unicode parameter name returns null — adversarial unicode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "assembly_operations",
          "MATE_ADD",
          "🔥💀⚠️",
        ),
      ).toBeNull();
    });

    it("getOperation with empty-string operation_id returns null — adversarial empty", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.getOperation("assembly_operations", ""),
      ).toBeNull();
    });

    it("getOperationsByCategory with unknown category returns empty array — failure mode", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "Assembly_Nonexistent_Category",
      );
      expect(ops).toEqual([]);
    });

    it("Distance Limit Min / Max coexist as a paired numeric range (no max==min collapse risk)", () => {
      const minLoc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Distance Limit Min",
      );
      const maxLoc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "MATE_ADD",
        "Distance Limit Max",
      );
      const minParam = minLoc!.parameter as { default?: number; unit?: string };
      const maxParam = maxLoc!.parameter as { default?: number; unit?: string };
      expect(minParam.default).toBe(0);
      expect(maxParam.default).toBe(100);
      expect(maxParam.default!).toBeGreaterThan(minParam.default!);
      expect(minParam.unit).toBe("mm");
      expect(maxParam.unit).toBe("mm");
    });

    it("INTERFERENCE_DETECTION Coincident Faces Tolerance is exactly 0.001 mm (sub-micron contact threshold)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "INTERFERENCE_DETECTION",
        "Coincident Faces Tolerance",
      );
      const param = loc!.parameter as { default?: number; min?: number; unit?: string };
      expect(param.default).toBe(0.001);
      expect(param.min).toBe(0);
      expect(param.unit).toBe("mm");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-05 — drawing_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_DRAWING_OPS_24 = [
    "DRAWING_NEW",
    "SHEET_ADD",
    "SHEET_FORMAT_EDIT",
    "VIEW_MODEL",
    "VIEW_PROJECTED",
    "VIEW_AUXILIARY",
    "VIEW_SECTION",
    "VIEW_DETAIL",
    "VIEW_BROKEN",
    "VIEW_BREAK_OUT",
    "VIEW_CROP",
    "DIMENSION_SMART",
    "DIMENSION_BASELINE",
    "DIMENSION_ORDINATE",
    "GDT_ADD",
    "DATUM_FEATURE",
    "SURFACE_FINISH_SYMBOL",
    "WELD_SYMBOL",
    "CENTER_MARK",
    "BOM_TABLE",
    "REVISION_TABLE",
    "GENERAL_TABLE",
    "HOLE_TABLE",
    "DESIGN_TABLE_ATTACH",
  ];

  // ASME Y14.5-2018 14 geometric characteristics in canonical SolidWorks order.
  const ASME_Y14_5_GDT_SYMBOLS_14 = [
    "straightness", "flatness", "circularity", "cylindricity",
    "profile_of_a_line", "profile_of_a_surface",
    "perpendicularity", "parallelism", "angularity",
    "position", "concentricity", "symmetry",
    "circular_runout", "total_runout",
  ];

  describe("drawing_operations — module catalog (U-CAD-FIDX-SW-05)", () => {
    it("loads the drawing_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("drawing_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 165 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("drawing_operations");
      expect(cat!.metadata.totalParameters).toBe(165);
    });

    it("metadata.operationCount is exactly 24", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("drawing_operations");
      expect(cat!.metadata.operationCount).toBe(24);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-05'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("drawing_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-05");
    });

    it("listOperations('drawing_operations') returns exactly 24 operations", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("drawing_operations");
      expect(ops).toHaveLength(24);
    });

    it("listOperations contains every expected drawing op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("drawing_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_DRAWING_OPS_24].sort());
    });

    it("module_entry.parameter_count_estimate is 165 in the index header", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("drawing_operations");
      expect(entry!.parameter_count_estimate).toBe(165);
    });

    it("module_entry.dependencies is exactly ['part_operations', 'assembly_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("drawing_operations");
      expect(entry!.dependencies).toEqual(["part_operations", "assembly_operations"]);
    });

    it("sum of per-tab parameter arrays equals 165 (no count drift)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("drawing_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(165);
    });
  });

  describe("drawing_operations — drawing document setup (DRAWING_NEW / SHEET_ADD / SHEET_FORMAT_EDIT)", () => {
    it("DRAWING_NEW Projection requires first_angle vs third_angle (ISO/EU vs ANSI/US default)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DRAWING_NEW",
        "Projection",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["first_angle", "third_angle"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("third_angle");
    });

    it("DRAWING_NEW Paper Size enumerates all 13 standard ANSI + ISO paper sizes plus Custom", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DRAWING_NEW",
        "Paper Size",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "A_Landscape", "A_Portrait", "B", "C", "D", "E",
        "A4_Landscape", "A4_Portrait", "A3", "A2", "A1", "A0",
        "Custom",
      ]);
    });

    it("SHEET_ADD Position Index uses -1 sentinel for append-to-end", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "SHEET_ADD",
        "Position Index",
      );
      const param = loc!.parameter as { min?: number; default?: number };
      expect(param.min).toBe(-1);
      expect(param.default).toBe(-1);
    });

    it("getOperationsByCategory('Drawing_Document') returns the 3 setup ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_Document");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["DRAWING_NEW", "SHEET_ADD", "SHEET_FORMAT_EDIT"]);
    });
  });

  describe("drawing_operations — 9 SolidWorks view types (model/projected/auxiliary/section/detail/broken/break_out/crop)", () => {
    it("VIEW_MODEL Display Style covers all 5 SolidWorks display modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_MODEL",
        "Display Style",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "wireframe",
        "hidden_lines_visible",
        "hidden_lines_removed",
        "shaded_with_edges",
        "shaded",
      ]);
    });

    it("VIEW_MODEL Orientation lists 11 named orientations including 3 axonometric", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_MODEL",
        "Orientation",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "front", "back", "top", "bottom", "left", "right",
        "isometric", "trimetric", "dimetric",
        "current_model_view", "named_view",
      ]);
    });

    it("VIEW_MODEL Tangent Edges supports visible / phantom / hide (per ASME Y14.3)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_MODEL",
        "Tangent Edges",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["visible", "phantom", "hide"]);
    });

    it("VIEW_PROJECTED Projection Direction requires left / right / top / bottom", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_PROJECTED",
        "Projection Direction",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["left", "right", "top", "bottom"]);
      expect(param.required).toBe(true);
    });

    it("VIEW_SECTION Section Type covers planar / aligned / offset / unfolded", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_SECTION",
        "Section Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["planar", "aligned", "offset", "unfolded"]);
      expect(param.required).toBe(true);
    });

    it("VIEW_DETAIL Boundary Type requires circle vs closed_profile, defaults circle (ASME Y14.3)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_DETAIL",
        "Boundary Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["circle", "closed_profile"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("circle");
    });

    it("VIEW_BROKEN Break Type covers 5 standard break geometry styles", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_BROKEN",
        "Break Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "zigzag", "straight", "small_zigzag", "curved", "structural",
      ]);
    });

    it("VIEW_BREAK_OUT Depth Mode requires depth_value vs up_to_geometry", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_BREAK_OUT",
        "Depth Mode",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["depth_value", "up_to_geometry"]);
      expect(param.required).toBe(true);
    });

    it("getOperationsByCategory('Drawing_View') returns exactly 8 view-creation ops (the 8 view types)", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_View");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "VIEW_AUXILIARY",
        "VIEW_BREAK_OUT",
        "VIEW_BROKEN",
        "VIEW_CROP",
        "VIEW_DETAIL",
        "VIEW_MODEL",
        "VIEW_PROJECTED",
        "VIEW_SECTION",
      ]);
    });
  });

  describe("drawing_operations — dimensions (smart / baseline / ordinate)", () => {
    it("DIMENSION_SMART Dimensioning Mode covers all 10 dimensioning modes (parity with sketch SMART_DIMENSION)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DIMENSION_SMART",
        "Dimensioning Mode",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "smart", "horizontal", "vertical", "aligned", "angular",
        "radial", "diametral", "arc_length", "baseline", "ordinate",
      ]);
    });

    it("DIMENSION_SMART Tolerance Type covers all 8 ASME Y14.5 tolerance forms", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DIMENSION_SMART",
        "Tolerance Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "none", "basic", "bilateral", "limit",
        "symmetric", "min", "max", "fit",
      ]);
    });

    it("DIMENSION_BASELINE Direction supports horizontal / vertical / aligned", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DIMENSION_BASELINE",
        "Direction",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["horizontal", "vertical", "aligned"]);
      expect(param.required).toBe(true);
    });

    it("DIMENSION_ORDINATE Direction supports horizontal / vertical only (ordinate is single-axis)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DIMENSION_ORDINATE",
        "Direction",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["horizontal", "vertical"]);
    });

    it("getOperationsByCategory('Drawing_Dimension') returns exactly 3 dimension ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_Dimension");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["DIMENSION_BASELINE", "DIMENSION_ORDINATE", "DIMENSION_SMART"]);
    });
  });

  describe("drawing_operations — GD&T (ASME Y14.5-2018 with all 14 geometric characteristics)", () => {
    it("GDT_ADD Symbol enumerates ALL 14 ASME Y14.5 geometric characteristics in canonical order", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GDT_ADD",
        "Symbol",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(ASME_Y14_5_GDT_SYMBOLS_14);
      expect(param.options!.length).toBe(14);
      expect(param.required).toBe(true);
    });

    it("GDT_ADD Material Condition supports RFS (default) / MMC / LMC", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GDT_ADD",
        "Material Condition",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual(["RFS", "MMC", "LMC"]);
      expect(param.default).toBe("RFS");
    });

    it("GDT_ADD Tolerance Zone Modifier covers 7 modifier types per ASME Y14.5", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GDT_ADD",
        "Tolerance Zone Modifier",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "none", "diameter", "spherical_diameter",
        "projected", "tangent_plane", "free_state", "statistical",
      ]);
    });

    it("GDT_ADD has datum chain (primary + secondary + tertiary) all with MMC/LMC/RFS modifiers", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("drawing_operations", "GDT_ADD");
      const params = op!.tabs!["GD&T"].parameters ?? [];
      const names = params.map((p) => p.name);
      expect(names).toContain("Primary Datum");
      expect(names).toContain("Primary Datum Modifier");
      expect(names).toContain("Secondary Datum");
      expect(names).toContain("Secondary Datum Modifier");
      expect(names).toContain("Tertiary Datum");
      expect(names).toContain("Tertiary Datum Modifier");
      // Each modifier param exposes the same 3-option enum
      for (const modName of ["Primary Datum Modifier", "Secondary Datum Modifier", "Tertiary Datum Modifier"]) {
        const mod = params.find((p) => p.name === modName);
        expect((mod as { options?: string[] }).options).toEqual(["RFS", "MMC", "LMC"]);
      }
    });

    it("DATUM_FEATURE Frame Style covers square / circle / filled_triangle (ASME Y14.5 datum identifier styles)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DATUM_FEATURE",
        "Frame Style",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["square", "circle", "filled_triangle"]);
    });

    it("getOperationsByCategory('Drawing_GDT') returns exactly GDT_ADD + DATUM_FEATURE", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_GDT");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["DATUM_FEATURE", "GDT_ADD"]);
    });
  });

  describe("drawing_operations — annotation symbols (surface finish / weld / center mark)", () => {
    it("SURFACE_FINISH_SYMBOL Symbol Type covers basic / machining_required / machining_prohibited / all_around", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "SURFACE_FINISH_SYMBOL",
        "Symbol Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "basic", "machining_required", "machining_prohibited", "all_around",
      ]);
      expect(param.required).toBe(true);
    });

    it("SURFACE_FINISH_SYMBOL Lay Symbol covers all 8 ASME Y14.36 lay direction symbols", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "SURFACE_FINISH_SYMBOL",
        "Lay Symbol",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "none", "parallel", "perpendicular", "crossed",
        "multidirectional", "circular", "radial", "particulate",
      ]);
    });

    it("SURFACE_FINISH_SYMBOL Roughness Standard covers ISO_metric / ASME_inch / JIS", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "SURFACE_FINISH_SYMBOL",
        "Roughness Standard",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["ISO_metric", "ASME_inch", "JIS"]);
    });

    it("WELD_SYMBOL Weld Type enumerates all 12 AWS A2.4 standard weld types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "WELD_SYMBOL",
        "Weld Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "fillet", "groove_v", "groove_bevel", "groove_u", "groove_j",
        "plug_slot", "spot", "seam", "stud", "edge", "back", "surfacing",
      ]);
      expect(param.required).toBe(true);
    });

    it("WELD_SYMBOL exposes All-Around + Field Weld modifiers as checkboxes", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation("drawing_operations", "WELD_SYMBOL");
      const params = op!.tabs!.Symbol.parameters ?? [];
      const allAround = params.find((p) => p.name === "All-Around");
      const field = params.find((p) => p.name === "Field Weld");
      expect(allAround?.type).toBe("checkbox");
      expect(allAround?.default).toBe(false);
      expect(field?.type).toBe("checkbox");
      expect(field?.default).toBe(false);
    });

    it("CENTER_MARK Pattern Mode supports single / linear / circular pattern application", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "CENTER_MARK",
        "Pattern Mode",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["single", "linear_pattern", "circular_pattern"]);
    });

    it("getOperationsByCategory('Drawing_Symbol') returns exactly the 3 symbol ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_Symbol");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["CENTER_MARK", "SURFACE_FINISH_SYMBOL", "WELD_SYMBOL"]);
    });
  });

  describe("drawing_operations — tables (BOM / revision / general / hole / design table)", () => {
    it("BOM_TABLE BOM Type requires top_level_only / parts_only / indented", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "BOM_TABLE",
        "BOM Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["top_level_only", "parts_only", "indented"]);
      expect(param.required).toBe(true);
    });

    it("BOM_TABLE Anchor Type covers all 4 sheet corners", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "BOM_TABLE",
        "Anchor Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["top_left", "top_right", "bottom_left", "bottom_right"]);
    });

    it("REVISION_TABLE Letter Convention supports the ASME Y14.35 IQSOXZ-skip convention by default", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "REVISION_TABLE",
        "Letter Convention",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual([
        "alphabetic", "alphabetic_skip_iqsox", "numeric", "alphanumeric",
      ]);
      expect(param.default).toBe("alphabetic_skip_iqsox");
    });

    it("HOLE_TABLE Tag Convention supports all 3 hole-tagging schemes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "HOLE_TABLE",
        "Tag Convention",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual([
        "alphanumeric_by_size", "numeric_sequential", "by_diameter",
      ]);
    });

    it("GENERAL_TABLE Column Count + Row Count have realistic bounds (1..100 cols, 1..999 rows)", () => {
      const cols = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GENERAL_TABLE",
        "Column Count",
      );
      const rows = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GENERAL_TABLE",
        "Row Count",
      );
      const colsParam = cols!.parameter as { min?: number; max?: number; default?: number; required?: boolean };
      const rowsParam = rows!.parameter as { min?: number; max?: number; default?: number; required?: boolean };
      expect(colsParam.min).toBe(1);
      expect(colsParam.max).toBe(100);
      expect(colsParam.default).toBe(3);
      expect(colsParam.required).toBe(true);
      expect(rowsParam.min).toBe(1);
      expect(rowsParam.max).toBe(999);
      expect(rowsParam.default).toBe(5);
      expect(rowsParam.required).toBe(true);
    });

    it("DESIGN_TABLE_ATTACH Configuration Set supports all / shown_only / specified", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "DESIGN_TABLE_ATTACH",
        "Configuration Set",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual(["all", "shown_only", "specified"]);
      expect(param.default).toBe("all");
    });

    it("getOperationsByCategory('Drawing_Table') returns exactly the 5 table ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_Table");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "BOM_TABLE",
        "DESIGN_TABLE_ATTACH",
        "GENERAL_TABLE",
        "HOLE_TABLE",
        "REVISION_TABLE",
      ]);
    });
  });

  describe("drawing_operations — concrete contract tables (api / category / required)", () => {
    it("each of the 24 drawing ops binds to its IDrawingDoc / IModelDoc2 / IModelDocExtension API method", () => {
      const apiBindings: Record<string, string> = {
        DRAWING_NEW: "ISldWorks.NewDocument (DocumentType=swDocDRAWING)",
        SHEET_ADD: "IDrawingDoc.NewSheet4",
        SHEET_FORMAT_EDIT: "IDrawingDoc.EditTemplate",
        VIEW_MODEL: "IDrawingDoc.CreateModelView",
        VIEW_PROJECTED: "IDrawingDoc.CreateUnfoldedViewAt5",
        VIEW_AUXILIARY: "IDrawingDoc.CreateAuxiliaryView2",
        VIEW_SECTION: "IDrawingDoc.CreateSectionView5",
        VIEW_DETAIL: "IDrawingDoc.CreateDetailViewAt4",
        VIEW_BROKEN: "IDrawingDoc.CreateBrokenView",
        VIEW_BREAK_OUT: "IDrawingDoc.CreateBreakOutSection",
        VIEW_CROP: "IDrawingDoc.CreateCropView",
        DIMENSION_SMART: "IModelDoc2.AddDimension2",
        DIMENSION_BASELINE: "IDrawingDoc.AutoBaselineDimension",
        DIMENSION_ORDINATE: "IDrawingDoc.InsertOrdinateDimension",
        GDT_ADD: "IModelDocExtension.InsertGtol / IGtol.SetGtolValues",
        DATUM_FEATURE: "IModelDocExtension.InsertDatumFeature",
        SURFACE_FINISH_SYMBOL: "IModelDocExtension.InsertSurfaceFinishSymbol",
        WELD_SYMBOL: "IModelDocExtension.InsertWeldSymbol",
        CENTER_MARK: "IModelDocExtension.InsertCenterMark",
        BOM_TABLE: "IDrawingDoc.InsertBomTable4",
        REVISION_TABLE: "IDrawingDoc.InsertRevisionTable3",
        GENERAL_TABLE: "IDrawingDoc.InsertTableAnnotation2",
        HOLE_TABLE: "IDrawingDoc.InsertHoleTable",
        DESIGN_TABLE_ATTACH: "IDrawingDoc.InsertDesignTable",
      };
      const expectedKeys = Object.keys(apiBindings).sort();
      expect(expectedKeys).toEqual([...KNOWN_DRAWING_OPS_24].sort());
      for (const [opId, expectedApi] of Object.entries(apiBindings)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("drawing_operations", opId);
        expect(op).not.toBeNull();
        expect(op!.solidworks_api).toBe(expectedApi);
      }
    });

    it("each of the 24 drawing ops sits in its category bucket", () => {
      const categories: Record<string, string> = {
        DRAWING_NEW: "Drawing_Document",
        SHEET_ADD: "Drawing_Document",
        SHEET_FORMAT_EDIT: "Drawing_Document",
        VIEW_MODEL: "Drawing_View",
        VIEW_PROJECTED: "Drawing_View",
        VIEW_AUXILIARY: "Drawing_View",
        VIEW_SECTION: "Drawing_View",
        VIEW_DETAIL: "Drawing_View",
        VIEW_BROKEN: "Drawing_View",
        VIEW_BREAK_OUT: "Drawing_View",
        VIEW_CROP: "Drawing_View",
        DIMENSION_SMART: "Drawing_Dimension",
        DIMENSION_BASELINE: "Drawing_Dimension",
        DIMENSION_ORDINATE: "Drawing_Dimension",
        GDT_ADD: "Drawing_GDT",
        DATUM_FEATURE: "Drawing_GDT",
        SURFACE_FINISH_SYMBOL: "Drawing_Symbol",
        WELD_SYMBOL: "Drawing_Symbol",
        CENTER_MARK: "Drawing_Symbol",
        BOM_TABLE: "Drawing_Table",
        REVISION_TABLE: "Drawing_Table",
        GENERAL_TABLE: "Drawing_Table",
        HOLE_TABLE: "Drawing_Table",
        DESIGN_TABLE_ATTACH: "Drawing_Table",
      };
      for (const [opId, expectedCategory] of Object.entries(categories)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("drawing_operations", opId);
        expect(op!.category).toBe(expectedCategory);
      }
    });
  });

  describe("drawing_operations — adversarial inputs (NaN / Infinity / empty / oversize / unicode)", () => {
    it("findParameter with empty-string parameter name returns null — adversarial empty", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("drawing_operations", "GDT_ADD", ""),
      ).toBeNull();
    });

    it("findParameter with 256-char oversize parameter name returns null — adversarial oversize", () => {
      const oversize = "z".repeat(256);
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("drawing_operations", "GDT_ADD", oversize),
      ).toBeNull();
    });

    it("findParameter with NaN-shaped string returns null — adversarial NaN-shaped", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("drawing_operations", "GDT_ADD", "NaN"),
      ).toBeNull();
    });

    it("findParameter with Infinity-shaped string returns null — adversarial Infinity-shaped", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "drawing_operations",
          "VIEW_DETAIL",
          "Infinity",
        ),
      ).toBeNull();
    });

    it("findParameter with unicode parameter name returns null — adversarial unicode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "drawing_operations",
          "WELD_SYMBOL",
          "🔧⚙️🛠",
        ),
      ).toBeNull();
    });

    it("getOperationsByCategory('Drawing_Nonexistent') returns empty array — failure mode", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Drawing_Nonexistent");
      expect(ops).toEqual([]);
    });

    it("VIEW_DETAIL Radius numeric param has min=0.001 mm (no zero-radius detail circles)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_DETAIL",
        "Radius",
      );
      const param = loc!.parameter as { min?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.default).toBe(25);
      expect(param.unit).toBe("mm");
    });

    it("GDT_ADD Tolerance Value has min=0 (zero-tolerance is allowed for basic dimensions)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GDT_ADD",
        "Tolerance Value",
      );
      const param = loc!.parameter as { min?: number; default?: number; required?: boolean };
      expect(param.min).toBe(0);
      expect(param.default).toBe(0.1);
      expect(param.required).toBe(true);
    });

    it("VIEW_BROKEN Gap Distance min=0.001 mm (no degenerate zero-gap broken views)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "VIEW_BROKEN",
        "Gap Distance",
      );
      const param = loc!.parameter as { min?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.default).toBe(10);
      expect(param.unit).toBe("mm");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-06 — sheet_metal_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_SHEET_METAL_OPS_22 = [
    "BASE_FLANGE_TAB",
    "EDGE_FLANGE",
    "MITER_FLANGE",
    "TAB",
    "SWEPT_FLANGE",
    "LOFTED_BEND",
    "SKETCHED_BEND",
    "HEM",
    "JOG",
    "CROSS_BREAK",
    "CORNER_RELIEF",
    "CLOSED_CORNER",
    "GUSSET",
    "VENT",
    "FORMING_TOOL",
    "RIP",
    "UNFOLD",
    "FOLD",
    "FLATTEN",
    "NO_BEND_REGION",
    "SHEET_METAL_PARAMS",
    "BEND_TABLE_ATTACH",
  ];

  describe("sheet_metal_operations — module catalog (U-CAD-FIDX-SW-06)", () => {
    it("loads the sheet_metal_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 148 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(cat!.metadata.totalParameters).toBe(148);
    });

    it("metadata.operationCount is exactly 22", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(cat!.metadata.operationCount).toBe(22);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-06'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-06");
    });

    it("listOperations contains every expected sheet metal op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("sheet_metal_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_SHEET_METAL_OPS_22].sort());
    });

    it("module_entry.parameter_count_estimate is 148", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("sheet_metal_operations");
      expect(entry!.parameter_count_estimate).toBe(148);
    });

    it("module_entry.dependencies is exactly ['part_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("sheet_metal_operations");
      expect(entry!.dependencies).toEqual(["part_operations"]);
    });

    it("sum of per-tab parameter arrays equals 148 (no count drift)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("sheet_metal_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(148);
    });
  });

  describe("sheet_metal_operations — base flange + bend allowance (foundational K-factor / bend table semantics)", () => {
    it("BASE_FLANGE_TAB binds to IFeatureManager.InsertSheetMetalBaseFlange2", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
      );
      expect(op!.solidworks_command).toBe("Insert > Sheet Metal > Base Flange/Tab");
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertSheetMetalBaseFlange2");
      expect(op!.category).toBe("SheetMetal_Base");
    });

    it("BASE_FLANGE_TAB Bend Allowance Type covers k_factor / bend_allowance / bend_deduction / bend_table", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
        "Bend Allowance Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["k_factor", "bend_allowance", "bend_deduction", "bend_table"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("k_factor");
    });

    it("BASE_FLANGE_TAB K-Factor is bounded [0, 1] with default 0.5 (industry standard neutral-axis position)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
        "K-Factor",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number };
      expect(param.min).toBe(0);
      expect(param.max).toBe(1);
      expect(param.default).toBe(0.5);
    });

    it("BASE_FLANGE_TAB Auto Relief Type covers rectangular / obround / tear (3 standard relief geometries)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
        "Auto Relief Type",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual(["rectangular", "obround", "tear"]);
      expect(param.default).toBe("rectangular");
    });

    it("BASE_FLANGE_TAB has 4 parameter tabs (Selections + Sheet Metal Parameters + Bend Allowance + Auto Relief)", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
      );
      expect(Object.keys(op!.tabs ?? {})).toEqual([
        "Selections",
        "Sheet Metal Parameters",
        "Bend Allowance",
        "Auto Relief",
      ]);
    });

    it("BASE_FLANGE_TAB Thickness is bounded (0.001, 50) mm — covers foil-stock through plate-stock", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
        "Thickness",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; required?: boolean };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(50);
      expect(param.default).toBe(1);
      expect(param.required).toBe(true);
    });

    it("BEND_TABLE_ATTACH Table Type covers all 4 lookup-table types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BEND_TABLE_ATTACH",
        "Table Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["bend_allowance", "bend_deduction", "k_factor", "gauge"]);
      expect(param.required).toBe(true);
    });
  });

  describe("sheet_metal_operations — flange creators (edge / miter / tab / swept / lofted / sketched bend)", () => {
    it("EDGE_FLANGE Length End Condition covers 5 termination modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "EDGE_FLANGE",
        "Length End Condition",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "blind", "up_to_vertex", "up_to_edge", "up_to_surface", "offset_from_surface",
      ]);
      expect(param.required).toBe(true);
    });

    it("EDGE_FLANGE Position Mode covers all 5 SolidWorks flange placement modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "EDGE_FLANGE",
        "Position Mode",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "material_inside", "material_outside", "bend_outside", "bend_centered", "bend_from_virtual_sharp",
      ]);
      expect(param.required).toBe(true);
    });

    it("EDGE_FLANGE Flange Angle is bounded (0.001, 359.999) deg with default 90", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "EDGE_FLANGE",
        "Flange Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string; required?: boolean };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(359.999);
      expect(param.default).toBe(90);
      expect(param.unit).toBe("deg");
      expect(param.required).toBe(true);
    });

    it("MITER_FLANGE Continuous Propagation defaults true (auto-extend across tangent edges)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "MITER_FLANGE",
        "Continuous Propagation",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(true);
    });

    it("LOFTED_BEND Forming Method requires bend (preserves manufacturable bend lines) vs formed (continuous deformation)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "LOFTED_BEND",
        "Forming Method",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["bend", "formed"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("bend");
    });

    it("LOFTED_BEND Number of Bend Lines is bounded [2, 200] with default 8", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "LOFTED_BEND",
        "Number of Bend Lines",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number };
      expect(param.min).toBe(2);
      expect(param.max).toBe(200);
      expect(param.default).toBe(8);
    });

    it("SKETCHED_BEND Bend Position covers all 4 positioning modes", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "SKETCHED_BEND",
        "Bend Position",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "bend_centerline", "material_inside", "material_outside", "bend_outside",
      ]);
      expect(param.required).toBe(true);
    });
  });

  describe("sheet_metal_operations — bend lifecycle ops (hem / jog / cross_break / corner_relief / closed_corner)", () => {
    it("HEM Hem Type enumerates 4 standard hem geometries", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "HEM",
        "Hem Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["closed", "open", "tear_drop", "rolled"]);
      expect(param.required).toBe(true);
    });

    it("JOG Dimension Position requires outside_offset / inside_offset / overall_dimension", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "JOG",
        "Dimension Position",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["outside_offset", "inside_offset", "overall_dimension"]);
      expect(param.required).toBe(true);
    });

    it("CROSS_BREAK Cross-Break Angle is bounded (0.001, 5) deg (cosmetic micro-deformation, not a true bend)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "CROSS_BREAK",
        "Cross-Break Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(5);
      expect(param.default).toBe(1);
      expect(param.unit).toBe("deg");
    });

    it("CORNER_RELIEF Relief Type covers rectangular / obround / round / tear", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "CORNER_RELIEF",
        "Relief Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["rectangular", "obround", "round", "tear"]);
      expect(param.required).toBe(true);
    });

    it("CLOSED_CORNER Corner Type covers overlap / underlap / butt", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "CLOSED_CORNER",
        "Corner Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["overlap", "underlap", "butt"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("butt");
    });

    it("CLOSED_CORNER Overlap Ratio is bounded [0, 1] with default 0.5 (centered overlap)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "CLOSED_CORNER",
        "Overlap Ratio",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number };
      expect(param.min).toBe(0);
      expect(param.max).toBe(1);
      expect(param.default).toBe(0.5);
    });
  });

  describe("sheet_metal_operations — form features + flat pattern (gusset / vent / forming_tool / rip / unfold / fold / flatten)", () => {
    it("GUSSET Form Method requires flat vs round forming", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "GUSSET",
        "Form Method",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["flat", "round"]);
      expect(param.required).toBe(true);
    });

    it("VENT Pattern Style covers 4 ventilation pattern types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "VENT",
        "Pattern Style",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["circular", "rectangular", "louver", "diamond"]);
      expect(param.required).toBe(true);
    });

    it("FORMING_TOOL Link To Tool File defaults true (maintains catalog-link for future updates)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "FORMING_TOOL",
        "Link To Tool File",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(true);
    });

    it("RIP Rip Direction covers both / positive_normal / negative_normal", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "RIP",
        "Rip Direction",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["both_directions", "positive_normal", "negative_normal"]);
      expect(param.required).toBe(true);
    });

    it("FLATTEN State requires flatten vs fold (toggles full flat pattern)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "FLATTEN",
        "State",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["flatten", "fold"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("flatten");
    });

    it("UNFOLD and FOLD share Fixed Face / Bends + are inverses (UNFOLD has 4 params, FOLD has 3)", () => {
      const unfold = SolidWorksCADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "UNFOLD",
      );
      const fold = SolidWorksCADFunctionIndexEngine.getOperation("sheet_metal_operations", "FOLD");
      const unfoldNames = (unfold!.tabs!.Selections.parameters ?? []).map((p) => p.name);
      const foldNames = (fold!.tabs!.Selections.parameters ?? []).map((p) => p.name);
      expect(unfoldNames).toContain("Fixed Face");
      expect(unfoldNames).toContain("Bends To Unfold");
      expect(foldNames).toContain("Fixed Face");
      expect(foldNames).toContain("Bends To Fold");
      expect(unfold!.parameterCount).toBe(4);
      expect(fold!.parameterCount).toBe(3);
    });

    it("getOperationsByCategory('SheetMetal_FlatPattern') returns the 4 flat-pattern ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory(
        "SheetMetal_FlatPattern",
      );
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["FLATTEN", "FOLD", "NO_BEND_REGION", "UNFOLD"]);
    });
  });

  describe("sheet_metal_operations — concrete contract tables (api / category) for all 22 ops", () => {
    it("each of the 22 sheet_metal ops binds to its IFeatureManager / IModelDoc2 API method", () => {
      const apiBindings: Record<string, string> = {
        BASE_FLANGE_TAB: "IFeatureManager.InsertSheetMetalBaseFlange2",
        EDGE_FLANGE: "IFeatureManager.InsertSheetMetalEdgeFlange3",
        MITER_FLANGE: "IFeatureManager.InsertSheetMetalMiterFlange",
        TAB: "IFeatureManager.InsertSheetMetalTab",
        SWEPT_FLANGE: "IFeatureManager.InsertSheetMetalSweptFlange",
        LOFTED_BEND: "IFeatureManager.InsertSheetMetalLoftedBend",
        SKETCHED_BEND: "IFeatureManager.InsertSketchedBend",
        HEM: "IFeatureManager.InsertSheetMetalHem",
        JOG: "IFeatureManager.InsertSheetMetalJog2",
        CROSS_BREAK: "IFeatureManager.InsertSheetMetalCrossBreak",
        CORNER_RELIEF: "IFeatureManager.InsertCornerRelief",
        CLOSED_CORNER: "IFeatureManager.InsertClosedCorner",
        GUSSET: "IFeatureManager.InsertSheetMetalGusset",
        VENT: "IFeatureManager.InsertSheetMetalVent",
        FORMING_TOOL: "IFeatureManager.InsertFormToolFromCatalog",
        RIP: "IFeatureManager.InsertSheetMetalRip",
        UNFOLD: "IFeatureManager.InsertSheetMetalUnfold",
        FOLD: "IFeatureManager.InsertSheetMetalFold",
        FLATTEN: "IModelDoc2.SheetMetalFlatten",
        NO_BEND_REGION: "IFeatureManager.InsertSheetMetalNoBendRegion",
        SHEET_METAL_PARAMS: "ISheetMetalFeatureData.* (set)",
        BEND_TABLE_ATTACH: "IModelDocExtension.AddBendTable",
      };
      const expectedKeys = Object.keys(apiBindings).sort();
      expect(expectedKeys).toEqual([...KNOWN_SHEET_METAL_OPS_22].sort());
      for (const [opId, expectedApi] of Object.entries(apiBindings)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("sheet_metal_operations", opId);
        expect(op).not.toBeNull();
        expect(op!.solidworks_api).toBe(expectedApi);
      }
    });

    it("each of the 22 sheet_metal ops sits in its category bucket (Base/Flange/Bend/Form/Modify/FlatPattern/Parameters)", () => {
      const categories: Record<string, string> = {
        BASE_FLANGE_TAB: "SheetMetal_Base",
        EDGE_FLANGE: "SheetMetal_Flange",
        MITER_FLANGE: "SheetMetal_Flange",
        TAB: "SheetMetal_Flange",
        SWEPT_FLANGE: "SheetMetal_Flange",
        LOFTED_BEND: "SheetMetal_Flange",
        SKETCHED_BEND: "SheetMetal_Bend",
        HEM: "SheetMetal_Bend",
        JOG: "SheetMetal_Bend",
        CROSS_BREAK: "SheetMetal_Form",
        CORNER_RELIEF: "SheetMetal_Modify",
        CLOSED_CORNER: "SheetMetal_Modify",
        GUSSET: "SheetMetal_Form",
        VENT: "SheetMetal_Form",
        FORMING_TOOL: "SheetMetal_Form",
        RIP: "SheetMetal_Modify",
        UNFOLD: "SheetMetal_FlatPattern",
        FOLD: "SheetMetal_FlatPattern",
        FLATTEN: "SheetMetal_FlatPattern",
        NO_BEND_REGION: "SheetMetal_FlatPattern",
        SHEET_METAL_PARAMS: "SheetMetal_Parameters",
        BEND_TABLE_ATTACH: "SheetMetal_Parameters",
      };
      for (const [opId, expectedCategory] of Object.entries(categories)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("sheet_metal_operations", opId);
        expect(op!.category).toBe(expectedCategory);
      }
    });
  });

  describe("sheet_metal_operations — adversarial inputs (NaN / Infinity / empty / oversize / unicode / boundary)", () => {
    it("findParameter with empty-string parameter name returns null — adversarial empty", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sheet_metal_operations",
          "BASE_FLANGE_TAB",
          "",
        ),
      ).toBeNull();
    });

    it("findParameter with 256-char oversize parameter name returns null — adversarial oversize", () => {
      const oversize = "k".repeat(256);
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sheet_metal_operations",
          "BASE_FLANGE_TAB",
          oversize,
        ),
      ).toBeNull();
    });

    it("findParameter with NaN-shaped string returns null — adversarial NaN", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sheet_metal_operations",
          "EDGE_FLANGE",
          "NaN",
        ),
      ).toBeNull();
    });

    it("findParameter with Infinity-shaped string returns null — adversarial Infinity", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sheet_metal_operations",
          "EDGE_FLANGE",
          "Infinity",
        ),
      ).toBeNull();
    });

    it("findParameter with unicode parameter name returns null — adversarial unicode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "sheet_metal_operations",
          "FORMING_TOOL",
          "🔩⚒️🪛",
        ),
      ).toBeNull();
    });

    it("getOperationsByCategory('SheetMetal_Nonexistent') returns empty array — failure mode", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("SheetMetal_Nonexistent");
      expect(ops).toEqual([]);
    });

    it("BASE_FLANGE_TAB Thickness must be > 0 (zero-thickness is degenerate sheet metal)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "BASE_FLANGE_TAB",
        "Thickness",
      );
      const param = loc!.parameter as { min?: number };
      expect(param.min).toBe(0.001);
      expect(param.min).toBeGreaterThan(0);
    });

    it("LOFTED_BEND Number of Bend Lines bounded [2, 200] (lofted bend needs at least 2 to interpolate)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "LOFTED_BEND",
        "Number of Bend Lines",
      );
      const param = loc!.parameter as { min?: number; max?: number };
      expect(param.min).toBe(2);
      expect(param.max).toBe(200);
    });

    it("CLOSED_CORNER Overlap Ratio bounded [0, 1] (cannot overlap more than 100%)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "CLOSED_CORNER",
        "Overlap Ratio",
      );
      const param = loc!.parameter as { min?: number; max?: number };
      expect(param.min).toBe(0);
      expect(param.max).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // U-CAD-FIDX-SW-07 — weldment_operations module
  // ─────────────────────────────────────────────────────────────────────────

  const KNOWN_WELDMENT_OPS_15 = [
    "WELDMENT",
    "STRUCTURAL_MEMBER",
    "TRIM_EXTEND",
    "EXTEND_BY_PLANE",
    "END_TRIM_TO_BODY",
    "END_CAP",
    "GUSSET",
    "FILLET_WELD_BEAD",
    "WELD_BEAD",
    "SPOT_WELD",
    "CUT_LIST_GENERATE",
    "WELDMENT_BODY_RENAME",
    "WELDMENT_BODY_PROPERTY",
    "CUT_LIST_SUMMARY",
    "CUSTOM_PROFILE_DEFINE",
  ];

  describe("weldment_operations — module catalog (U-CAD-FIDX-SW-07)", () => {
    it("loads the weldment_operations catalog and reports schemaVersion '1.0.0'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("weldment_operations");
      expect(cat).not.toBeNull();
      expect(cat!.schemaVersion).toBe("1.0.0");
    });

    it("metadata.totalParameters is exactly 104 (matches index declaration)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("weldment_operations");
      expect(cat!.metadata.totalParameters).toBe(104);
    });

    it("metadata.operationCount is exactly 15", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("weldment_operations");
      expect(cat!.metadata.operationCount).toBe(15);
    });

    it("metadata.milestone is 'U-CAD-FIDX-SW-07'", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("weldment_operations");
      expect(cat!.metadata.milestone).toBe("U-CAD-FIDX-SW-07");
    });

    it("listOperations contains every expected weldment op id", () => {
      const ops = SolidWorksCADFunctionIndexEngine.listOperations("weldment_operations");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([...KNOWN_WELDMENT_OPS_15].sort());
    });

    it("module_entry.parameter_count_estimate is 104", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("weldment_operations");
      expect(entry!.parameter_count_estimate).toBe(104);
    });

    it("module_entry.dependencies is exactly ['part_operations']", () => {
      const entry = SolidWorksCADFunctionIndexEngine.getModuleEntry("weldment_operations");
      expect(entry!.dependencies).toEqual(["part_operations"]);
    });

    it("sum of per-tab parameter arrays equals 104 (no count drift)", () => {
      const cat = SolidWorksCADFunctionIndexEngine.getModule("weldment_operations");
      let total = 0;
      for (const opId of Object.keys(cat!.operations)) {
        const op = (cat!.operations as Record<string, { tabs?: Record<string, { parameters?: unknown[] }> }>)[opId];
        for (const tabName of Object.keys(op.tabs ?? {})) {
          total += (op.tabs![tabName].parameters ?? []).length;
        }
      }
      expect(total).toBe(104);
    });
  });

  describe("weldment_operations — STRUCTURAL_MEMBER (profile library + corner treatment)", () => {
    it("STRUCTURAL_MEMBER binds to IFeatureManager.InsertWeldmentMember", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
      );
      expect(op!.solidworks_command).toBe("Insert > Weldments > Structural Member");
      expect(op!.solidworks_api).toBe("IFeatureManager.InsertWeldmentMember");
      expect(op!.category).toBe("Weldment_Member");
    });

    it("STRUCTURAL_MEMBER Standard enumerates all 9 international structural-shape standards", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
        "Standard",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "ANSI_inch", "ANSI_metric", "ISO", "DIN", "JIS",
        "AS_AU", "IS_IN", "GB_CN", "Custom",
      ]);
      expect(param.required).toBe(true);
    });

    it("STRUCTURAL_MEMBER Profile Type enumerates all 12 standard structural cross-sections", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
        "Profile Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "square_tube", "rectangular_tube", "round_tube",
        "c_channel", "angle", "i_beam", "wide_flange",
        "s_beam", "t_section", "z_section", "pipe", "custom",
      ]);
      expect(param.required).toBe(true);
    });

    it("STRUCTURAL_MEMBER Corner Treatment requires trimmed_butt / coped / lapped", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
        "Corner Treatment",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean; default?: string };
      expect(param.options).toEqual(["trimmed_butt", "coped", "lapped"]);
      expect(param.required).toBe(true);
      expect(param.default).toBe("trimmed_butt");
    });

    it("STRUCTURAL_MEMBER has 3 parameter tabs (Selections + Profile + Corner Treatment) summing 12 params", () => {
      const op = SolidWorksCADFunctionIndexEngine.getOperation(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
      );
      expect(Object.keys(op!.tabs ?? {})).toEqual(["Selections", "Profile", "Corner Treatment"]);
      let sum = 0;
      for (const tab of Object.values(op!.tabs ?? {})) {
        sum += (tab.parameters ?? []).length;
      }
      expect(sum).toBe(12);
      expect(op!.parameterCount).toBe(12);
    });

    it("STRUCTURAL_MEMBER Rotation Angle is bounded (-360, +360) deg with default 0", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
        "Rotation Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(-360);
      expect(param.max).toBe(360);
      expect(param.default).toBe(0);
      expect(param.unit).toBe("deg");
    });
  });

  describe("weldment_operations — trim/extend ops (TRIM_EXTEND / EXTEND_BY_PLANE / END_TRIM_TO_BODY)", () => {
    it("TRIM_EXTEND Trim Boundary Type covers face_plane vs bodies", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "TRIM_EXTEND",
        "Trim Boundary Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["face_plane", "bodies"]);
      expect(param.required).toBe(true);
    });

    it("TRIM_EXTEND Action covers trim / extend / both", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "TRIM_EXTEND",
        "Action",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["trim", "extend", "both"]);
      expect(param.required).toBe(true);
    });

    it("EXTEND_BY_PLANE End To Extend covers positive / negative / both directions", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "EXTEND_BY_PLANE",
        "End To Extend",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["positive_normal", "negative_normal", "both_directions"]);
      expect(param.required).toBe(true);
    });

    it("END_TRIM_TO_BODY Coping Type covers face_to_face / weld_gap / nominal_butt", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "END_TRIM_TO_BODY",
        "Coping Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["face_to_face", "weld_gap", "nominal_butt"]);
    });

    it("getOperationsByCategory('Weldment_TrimExtend') returns the 3 trim/extend ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Weldment_TrimExtend");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["END_TRIM_TO_BODY", "EXTEND_BY_PLANE", "TRIM_EXTEND"]);
    });
  });

  describe("weldment_operations — reinforcement ops (END_CAP / GUSSET / FILLET_WELD_BEAD)", () => {
    it("END_CAP Thickness Direction requires inward / outward / centered", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "END_CAP",
        "Thickness Direction",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["inward", "outward", "centered"]);
      expect(param.required).toBe(true);
    });

    it("END_CAP Chamfer Angle is bounded (0.001, 89) deg with default 45", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "END_CAP",
        "Chamfer Angle",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number; unit?: string };
      expect(param.min).toBe(0.001);
      expect(param.max).toBe(89);
      expect(param.default).toBe(45);
      expect(param.unit).toBe("deg");
    });

    it("GUSSET Profile Type requires triangular vs polygonal", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "GUSSET",
        "Profile Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["triangular", "polygonal"]);
      expect(param.required).toBe(true);
    });

    it("GUSSET Thickness Side covers both / side_a / side_b application", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "GUSSET",
        "Thickness Side",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["both", "side_a", "side_b"]);
    });

    it("FILLET_WELD_BEAD Bead Type requires full_length / intermittent / staggered_intermittent", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "FILLET_WELD_BEAD",
        "Bead Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["full_length", "intermittent", "staggered_intermittent"]);
      expect(param.required).toBe(true);
    });
  });

  describe("weldment_operations — material weld ops (WELD_BEAD with 9 AWS types / SPOT_WELD)", () => {
    it("WELD_BEAD Weld Type enumerates all 9 AWS A2.4 standard weld types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "WELD_BEAD",
        "Weld Type",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "fillet", "groove_v", "groove_bevel", "groove_u", "groove_j",
        "plug", "spot", "stud", "back",
      ]);
      expect(param.required).toBe(true);
    });

    it("WELD_BEAD Mass Contribution defaults true (real material adds to part mass)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "WELD_BEAD",
        "Mass Contribution",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(true);
    });

    it("SPOT_WELD Pattern Type covers single / linear / rectangular / circular grids", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "SPOT_WELD",
        "Pattern Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["single", "linear", "rectangular", "circular"]);
    });

    it("SPOT_WELD defaults to RSW process (resistance spot welding — most common)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "SPOT_WELD",
        "Process Reference",
      );
      const param = loc!.parameter as { default?: string };
      expect(param.default).toBe("RSW");
    });

    it("getOperationsByCategory('Weldment_Weld') returns exactly WELD_BEAD + SPOT_WELD", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Weldment_Weld");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["SPOT_WELD", "WELD_BEAD"]);
    });
  });

  describe("weldment_operations — cut list + body management (CUT_LIST_GENERATE / WELDMENT_BODY_PROPERTY / CUT_LIST_SUMMARY)", () => {
    it("CUT_LIST_GENERATE Sort By covers item_number / length / quantity / description / material", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "CUT_LIST_GENERATE",
        "Sort By",
      );
      const param = loc!.parameter as { options?: string[]; default?: string };
      expect(param.options).toEqual([
        "item_number", "length", "quantity", "description", "material",
      ]);
      expect(param.default).toBe("item_number");
    });

    it("CUT_LIST_GENERATE Length Tolerance defaults 0.5 mm (mid-precision grouping default)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "CUT_LIST_GENERATE",
        "Length Tolerance",
      );
      const param = loc!.parameter as { default?: number; min?: number; unit?: string };
      expect(param.default).toBe(0.5);
      expect(param.min).toBe(0);
      expect(param.unit).toBe("mm");
    });

    it("WELDMENT_BODY_PROPERTY Property Type covers text / number / date / yes_no", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "WELDMENT_BODY_PROPERTY",
        "Property Type",
      );
      const param = loc!.parameter as { options?: string[] };
      expect(param.options).toEqual(["text", "number", "date", "yes_no"]);
    });

    it("CUT_LIST_SUMMARY Output Format covers table / csv / xml / drawing_annotation", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "CUT_LIST_SUMMARY",
        "Output Format",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual(["table", "csv", "xml", "drawing_annotation"]);
      expect(param.required).toBe(true);
    });

    it("CUSTOM_PROFILE_DEFINE Profile Type Category mirrors STRUCTURAL_MEMBER's 12 profile types", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "CUSTOM_PROFILE_DEFINE",
        "Profile Type Category",
      );
      const param = loc!.parameter as { options?: string[]; required?: boolean };
      expect(param.options).toEqual([
        "square_tube", "rectangular_tube", "round_tube",
        "c_channel", "angle", "i_beam", "wide_flange",
        "s_beam", "t_section", "z_section", "pipe", "custom",
      ]);
      expect(param.required).toBe(true);
    });

    it("getOperationsByCategory('Weldment_CutList') returns the 4 cut-list management ops", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Weldment_CutList");
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "CUT_LIST_GENERATE",
        "CUT_LIST_SUMMARY",
        "WELDMENT_BODY_PROPERTY",
        "WELDMENT_BODY_RENAME",
      ]);
    });
  });

  describe("weldment_operations — concrete contract tables (api / category) for all 15 ops", () => {
    it("each of the 15 weldment ops binds to its IFeatureManager / IBody2 / IModelDoc2 API method", () => {
      const apiBindings: Record<string, string> = {
        WELDMENT: "IFeatureManager.InsertWeldment",
        STRUCTURAL_MEMBER: "IFeatureManager.InsertWeldmentMember",
        TRIM_EXTEND: "IFeatureManager.InsertTrimExtend",
        EXTEND_BY_PLANE: "IFeatureManager.InsertExtendByPlane",
        END_TRIM_TO_BODY: "IFeatureManager.InsertEndTrimToBody",
        END_CAP: "IFeatureManager.InsertEndCap",
        GUSSET: "IFeatureManager.InsertWeldmentGusset",
        FILLET_WELD_BEAD: "IFeatureManager.InsertFilletBead",
        WELD_BEAD: "IFeatureManager.InsertWeldBead",
        SPOT_WELD: "IFeatureManager.InsertSpotWeld",
        CUT_LIST_GENERATE: "IFeatureManager.UpdateCutList",
        WELDMENT_BODY_RENAME: "IBody2.Name (set)",
        WELDMENT_BODY_PROPERTY: "IModelDocExtension.CustomPropertyManager.Add3 (per body)",
        CUT_LIST_SUMMARY: "IFeatureManager.GenerateCutListSummary",
        CUSTOM_PROFILE_DEFINE: "IModelDoc2.SaveAsLibraryFeature (with weldment profile flag)",
      };
      const expectedKeys = Object.keys(apiBindings).sort();
      expect(expectedKeys).toEqual([...KNOWN_WELDMENT_OPS_15].sort());
      for (const [opId, expectedApi] of Object.entries(apiBindings)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("weldment_operations", opId);
        expect(op).not.toBeNull();
        expect(op!.solidworks_api).toBe(expectedApi);
      }
    });

    it("each of the 15 weldment ops sits in its category bucket", () => {
      const categories: Record<string, string> = {
        WELDMENT: "Weldment_Foundation",
        STRUCTURAL_MEMBER: "Weldment_Member",
        TRIM_EXTEND: "Weldment_TrimExtend",
        EXTEND_BY_PLANE: "Weldment_TrimExtend",
        END_TRIM_TO_BODY: "Weldment_TrimExtend",
        END_CAP: "Weldment_Reinforcement",
        GUSSET: "Weldment_Reinforcement",
        FILLET_WELD_BEAD: "Weldment_Reinforcement",
        WELD_BEAD: "Weldment_Weld",
        SPOT_WELD: "Weldment_Weld",
        CUT_LIST_GENERATE: "Weldment_CutList",
        WELDMENT_BODY_RENAME: "Weldment_CutList",
        WELDMENT_BODY_PROPERTY: "Weldment_CutList",
        CUT_LIST_SUMMARY: "Weldment_CutList",
        CUSTOM_PROFILE_DEFINE: "Weldment_Profile",
      };
      for (const [opId, expectedCategory] of Object.entries(categories)) {
        const op = SolidWorksCADFunctionIndexEngine.getOperation("weldment_operations", opId);
        expect(op!.category).toBe(expectedCategory);
      }
    });
  });

  describe("weldment_operations — adversarial inputs (NaN / Infinity / empty / oversize / unicode / boundary)", () => {
    it("findParameter with empty-string parameter name returns null — adversarial empty", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "weldment_operations",
          "STRUCTURAL_MEMBER",
          "",
        ),
      ).toBeNull();
    });

    it("findParameter with 256-char oversize parameter name returns null — adversarial oversize", () => {
      const oversize = "w".repeat(256);
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "weldment_operations",
          "STRUCTURAL_MEMBER",
          oversize,
        ),
      ).toBeNull();
    });

    it("findParameter with NaN-shaped string returns null — adversarial NaN", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter("weldment_operations", "WELD_BEAD", "NaN"),
      ).toBeNull();
    });

    it("findParameter with Infinity-shaped string returns null — adversarial Infinity", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "weldment_operations",
          "WELD_BEAD",
          "Infinity",
        ),
      ).toBeNull();
    });

    it("findParameter with unicode parameter name returns null — adversarial unicode", () => {
      expect(
        SolidWorksCADFunctionIndexEngine.findParameter(
          "weldment_operations",
          "WELD_BEAD",
          "🔥⚡️🛠",
        ),
      ).toBeNull();
    });

    it("getOperationsByCategory('Weldment_Nonexistent') returns empty array — failure mode", () => {
      const ops = SolidWorksCADFunctionIndexEngine.getOperationsByCategory("Weldment_Nonexistent");
      expect(ops).toEqual([]);
    });

    it("END_CAP Thickness must be > 0 (zero-thickness end cap is degenerate)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "END_CAP",
        "Thickness",
      );
      const param = loc!.parameter as { min?: number; default?: number; required?: boolean };
      expect(param.min).toBe(0.001);
      expect(param.default).toBe(3);
      expect(param.required).toBe(true);
    });

    it("GUSSET Number of Gussets bounded [1, 99] (cannot have 0 gussets in a gusset op)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "GUSSET",
        "Number of Gussets",
      );
      const param = loc!.parameter as { min?: number; max?: number; default?: number };
      expect(param.min).toBe(1);
      expect(param.max).toBe(99);
      expect(param.default).toBe(1);
    });

    it("STRUCTURAL_MEMBER Allow Cosmetic Welds defaults false (prefer explicit weld feature placement)", () => {
      const loc = SolidWorksCADFunctionIndexEngine.findParameter(
        "weldment_operations",
        "STRUCTURAL_MEMBER",
        "Allow Cosmetic Welds",
      );
      const param = loc!.parameter as { type?: string; default?: boolean };
      expect(param.type).toBe("checkbox");
      expect(param.default).toBe(false);
    });
  });
});
