/**
 * Tests for MastercamCADFunctionIndexEngine
 * @see src/engines/MastercamCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-MC-01..08 (Mastercam CAD exhaust track)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MastercamCADFunctionIndexEngine } from "../engines/MastercamCADFunctionIndexEngine.js";

function sumParamsForModule(moduleId: string): number {
  const mod = MastercamCADFunctionIndexEngine.getModule(moduleId);
  if (!mod || !mod.operations) return 0;
  let total = 0;
  for (const op of Object.values(mod.operations)) {
    for (const tab of Object.values(op.tabs ?? {})) {
      total += (tab.parameters ?? tab.params ?? []).length;
    }
  }
  return total;
}

const KNOWN_WIREFRAME_OPS = [
  "POINT",
  "LINE_ENDPOINTS",
  "LINE_PARALLEL",
  "LINE_PERPENDICULAR",
  "LINE_CLOSEST",
  "LINE_TANGENT",
  "CIRCLE_CENTER_POINT",
  "CIRCLE_CENTER_RADIUS",
  "CIRCLE_3_POINTS",
  "CIRCLE_2_POINTS",
  "CIRCLE_TANGENT",
  "ARC_3_POINT",
  "ARC_ENDPOINTS",
  "ARC_TANGENT",
  "ELLIPSE",
  "POLYGON",
  "RECTANGLE",
  "SHAPE",
  "SPLINE_PARAMETRIC",
  "SPLINE_NURBS",
  "CURVE_DERIVE",
  "TEXT_WIREFRAME",
  "HELIX",
  "SPIRAL",
];

describe("MastercamCADFunctionIndexEngine", () => {
  beforeEach(() => {
    MastercamCADFunctionIndexEngine.clearCache();
  });

  describe("getIndex — index header values", () => {
    it("system_id is exactly 'mastercam'", () => {
      expect(MastercamCADFunctionIndexEngine.getIndex().system_id).toBe("mastercam");
    });

    it("module_id is exactly 'cad_function_index'", () => {
      expect(MastercamCADFunctionIndexEngine.getIndex().module_id).toBe("cad_function_index");
    });

    it("schema_version is exactly '1.0.0'", () => {
      expect(MastercamCADFunctionIndexEngine.getIndex().schema_version).toBe("1.0.0");
    });

    it("indexed_at parses to a real Date in 2026", () => {
      const ts = MastercamCADFunctionIndexEngine.getIndex().indexed_at;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      const d = new Date(ts);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(Number.isNaN(d.getTime())).toBe(false);
    });

    it("modules array contains the wireframe module (Phase 1 1/8)", () => {
      const ids = MastercamCADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toContain("wireframe_operations");
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = MastercamCADFunctionIndexEngine.getIndex();
      const b = MastercamCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules contains wireframe_operations", () => {
      expect(MastercamCADFunctionIndexEngine.listModules()).toContain("wireframe_operations");
    });

    it("getModuleEntry('wireframe_operations') has the U-CAD-FIDX-MC-01 tag", () => {
      const entry = MastercamCADFunctionIndexEngine.getModuleEntry("wireframe_operations");
      expect(entry?.module_id).toBe("wireframe_operations");
      expect(entry?.path).toBe("cad-functions/mastercam/wireframe-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-MC-01"]);
      expect(entry?.parameter_count_estimate).toBe(153);
    });

    it("getModuleEntry returns null for unknown module", () => {
      expect(MastercamCADFunctionIndexEngine.getModuleEntry("nonexistent_xyz")).toBeNull();
    });
  });

  describe("getModule — wireframe_operations catalog", () => {
    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-01'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-01");
    });

    it("operations dict has exactly 24 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(24);
    });

    it("returns same object identity on cache hit", () => {
      const a = MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      const b = MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      expect(a === b).toBe(true);
    });

    it("returns null for unregistered module without throwing (failure mode)", () => {
      expect(MastercamCADFunctionIndexEngine.getModule("not_a_real_module")).toBeNull();
    });
  });

  describe("listOperations / listAllOperations — wireframe coverage", () => {
    it("listOperations returns exactly the 24 expected wireframe ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("wireframe_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_WIREFRAME_OPS].sort());
    });

    it("every operation reports a Wireframe_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("wireframe_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Wireframe_")).toBe(true);
      }
    });

    it("every operation reports a positive params_count", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("wireframe_operations");
      for (const op of ops) {
        expect(op.params_count ?? 0).toBeGreaterThan(0);
      }
    });

    it("listAllOperations equals 108 ops total at Phase 1 7/8 (+ modify)", () => {
      const all = MastercamCADFunctionIndexEngine.listAllOperations();
      expect(all.length).toBe(108);
    });

    it("listOperations on unknown module returns empty array (failure mode)", () => {
      expect(MastercamCADFunctionIndexEngine.listOperations("nonexistent")).toEqual([]);
    });
  });

  describe("getOperation — known wireframe operations", () => {
    it("POINT supports all 8 creation modes (free/parametric/dynamic/endpoint/intersection/perpendicular/on_entity/segment)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "POINT");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "free_position",
        "parametric",
        "dynamic",
        "endpoint",
        "intersection",
        "perpendicular",
        "on_entity",
        "segment",
      ]);
    });

    it("LINE_TANGENT Mode supports both from_entity and to_two modes (failure mode: missing tangent mode)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "wireframe_operations",
        "LINE_TANGENT",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["from_entity", "to_two"]);
    });

    it("CIRCLE_TANGENT Mode covers Apollonian 3-tangent variant (failure mode: classical geometry completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "wireframe_operations",
        "CIRCLE_TANGENT",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["2_tangent_radius", "3_tangent"]);
    });

    it("POLYGON Inscribed/Circumscribed declares both classical polygon datums", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "POLYGON");
      const datumParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Inscribed/Circumscribed",
      );
      expect(datumParam?.options).toEqual(["inscribed", "circumscribed"]);
    });

    it("POLYGON Side Count is bounded 3..256 (failure mode: out-of-bounds polygon)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "POLYGON");
      const sideParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Side Count");
      expect(sideParam?.min).toBe(3);
      expect(sideParam?.max).toBe(256);
      expect(sideParam?.default).toBe(6);
    });

    it("HELIX Conical flag distinguishes cylindrical vs conical helix", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "HELIX");
      const conicalParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Conical");
      expect(conicalParam?.type).toBe("checkbox");
      expect(conicalParam?.default).toBe(false);
    });

    it("SHAPE Type covers all 6 built-in library shapes", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "SHAPE");
      const typeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual([
        "oval",
        "slot",
        "hexagon",
        "diamond",
        "rounded_rectangle",
        "d_shape",
      ]);
    });

    it("CURVE_DERIVE Source Type covers 5 derivation modes", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "wireframe_operations",
        "CURVE_DERIVE",
      );
      const sourceParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Source Type");
      expect(sourceParam?.options).toEqual([
        "edge",
        "face_boundary",
        "silhouette",
        "intersection",
        "project",
      ]);
    });

    it("returns null for unknown operation (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("wireframe_operations", "TELEPORT"),
      ).toBeNull();
    });

    it("returns null for unknown module (adversarial: cross-module typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("not_a_module", "POINT"),
      ).toBeNull();
    });
  });

  describe("findParameter", () => {
    it("locates 'Sketch Plane' on LINE_ENDPOINTS (case-insensitive)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "wireframe_operations",
        "LINE_ENDPOINTS",
        "sketch plane",
      );
      expect(loc?.parameter.name).toBe("Sketch Plane");
      expect(loc?.tab_id).toBe("Shape");
    });

    it("locates 'Side Count' on POLYGON with bounds (failure mode: param coordinate)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "wireframe_operations",
        "POLYGON",
        "Side Count",
      );
      expect(loc?.parameter.type).toBe("integer");
      expect(loc?.parameter.min).toBe(3);
      expect(loc?.parameter.max).toBe(256);
    });

    it("returns null for unknown parameter on a real op (failure mode)", () => {
      expect(
        MastercamCADFunctionIndexEngine.findParameter(
          "wireframe_operations",
          "POINT",
          "MagicNumber",
        ),
      ).toBeNull();
    });

    it("returns null for unknown operation (adversarial)", () => {
      expect(
        MastercamCADFunctionIndexEngine.findParameter("wireframe_operations", "TELEPORT", "foo"),
      ).toBeNull();
    });
  });

  describe("searchParameters", () => {
    it("'Sketch Plane' substring matches ops that declare a Sketch Plane parameter", () => {
      const hits = MastercamCADFunctionIndexEngine.searchParameters("Sketch Plane");
      expect(hits.length).toBeGreaterThan(0);
      const opIds = new Set(hits.map((h) => h.operation_id));
      expect(opIds.has("LINE_ENDPOINTS")).toBe(true);
      expect(opIds.has("POINT")).toBe(true);
    });

    it("'Radius' substring matches multiple geometry ops (failure mode: cross-op semantic span)", () => {
      const hits = MastercamCADFunctionIndexEngine.searchParameters("Radius");
      const opIds = new Set(hits.map((h) => h.operation_id));
      expect(opIds.has("CIRCLE_CENTER_RADIUS")).toBe(true);
      expect(opIds.has("ARC_ENDPOINTS")).toBe(true);
      expect(opIds.has("HELIX")).toBe(true);
    });

    it("respects limit argument (returns at most N matches)", () => {
      const hits = MastercamCADFunctionIndexEngine.searchParameters("Sketch Plane", 2);
      expect(hits.length).toBeLessThanOrEqual(2);
    });

    it("returns empty array for substring no operation contains (failure mode)", () => {
      expect(
        MastercamCADFunctionIndexEngine.searchParameters("__never_present_in_mastercam__"),
      ).toEqual([]);
    });
  });

  describe("getOperationsByCategory", () => {
    it("Wireframe_Line_Endpoints returns exactly LINE_ENDPOINTS", () => {
      const ids = MastercamCADFunctionIndexEngine.getOperationsByCategory(
        "Wireframe_Line_Endpoints",
        "wireframe_operations",
      ).map((p) => p.operation_id);
      expect(ids).toEqual(["LINE_ENDPOINTS"]);
    });

    it("returns empty array for unknown category (adversarial)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperationsByCategory("Wireframe_Nonsense"),
      ).toEqual([]);
    });
  });

  describe("getTotalParameterCount", () => {
    it("counts exactly 748 parameters across all 108 ops (+ 86 modify)", () => {
      const total = MastercamCADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(748);
    });

    it("each module's per-engine computed total exactly equals its metadata.totalParameters declaration", () => {
      const wireframeTotal = sumParamsForModule("wireframe_operations");
      const wireframeDeclared = (
        MastercamCADFunctionIndexEngine.getModule("wireframe_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(wireframeTotal).toBe(153);
      expect(wireframeDeclared).toBe(153);

      const solidTotal = sumParamsForModule("solid_operations");
      const solidDeclared = (
        MastercamCADFunctionIndexEngine.getModule("solid_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(solidTotal).toBe(140);
      expect(solidDeclared).toBe(140);

      const surfaceTotal = sumParamsForModule("surface_operations");
      const surfaceDeclared = (
        MastercamCADFunctionIndexEngine.getModule("surface_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(surfaceTotal).toBe(110);
      expect(surfaceDeclared).toBe(110);

      const draftingTotal = sumParamsForModule("drafting_operations");
      const draftingDeclared = (
        MastercamCADFunctionIndexEngine.getModule("drafting_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(draftingTotal).toBe(124);
      expect(draftingDeclared).toBe(124);

      const transformTotal = sumParamsForModule("transformation_operations");
      const transformDeclared = (
        MastercamCADFunctionIndexEngine.getModule("transformation_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(transformTotal).toBe(75);
      expect(transformDeclared).toBe(75);

      const analysisTotal = sumParamsForModule("analysis_operations");
      const analysisDeclared = (
        MastercamCADFunctionIndexEngine.getModule("analysis_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(analysisTotal).toBe(60);
      expect(analysisDeclared).toBe(60);

      const modifyTotal = sumParamsForModule("modify_operations");
      const modifyDeclared = (
        MastercamCADFunctionIndexEngine.getModule("modify_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(modifyTotal).toBe(86);
      expect(modifyDeclared).toBe(86);

      // Aggregate engine method must equal sum of per-module computed totals
      expect(MastercamCADFunctionIndexEngine.getTotalParameterCount()).toBe(
        wireframeTotal +
          solidTotal +
          surfaceTotal +
          draftingTotal +
          transformTotal +
          analysisTotal +
          modifyTotal,
      );
    });
  });

  describe("coverage_summary — Phase 1 markers (Mastercam CAD exhaust starting)", () => {
    it("api_surface.coverage_state is exactly 'PARTIAL' (7 of 8 modules shipped — 1 to go)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.coverage_state).toBe("PARTIAL");
    });

    it("api_surface.phase_1_target_modules equals 8 (full Inventor parity target)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules).toBe(8);
    });

    it("api_surface.phase_1_target_modules_remaining is exactly 1 (7/8 shipped)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(1);
    });

    it("api_surface.phase_1_modules_pending lists exactly file_layer_operations as last unbuilt module", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_modules_pending).toEqual(["file_layer_operations"]);
    });

    it("phase_1 ledger is internally consistent (failure mode: target/remaining/pending drift)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const total = apiSurface?.phase_1_target_modules as number;
      const remaining = apiSurface?.phase_1_target_modules_remaining as number;
      const pending = (apiSurface?.phase_1_modules_pending as readonly string[]) ?? [];
      expect(remaining).toBe(pending.length);
      expect(remaining).toBeLessThanOrEqual(total);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it("phase_1 markers persist after clearCache (failure mode: cache invalidation)", () => {
      MastercamCADFunctionIndexEngine.clearCache();
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.coverage_state).toBe("PARTIAL");
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(1);
    });

    it("total_units_covered length matches shipped module count (failure mode: ledger drift)", () => {
      const cs = MastercamCADFunctionIndexEngine.getIndex().coverage_summary;
      const apiSurface = cs.api_surface as Record<string, unknown> | undefined;
      const target = apiSurface?.phase_1_target_modules as number;
      const remaining = apiSurface?.phase_1_target_modules_remaining as number;
      expect(cs.total_units_covered.length).toBe(target - remaining);
    });

    it("phase_1_target_modules cannot exceed Inventor parity cap of 8 (adversarial: scope creep)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const target = apiSurface?.phase_1_target_modules as number;
      expect(target).toBeLessThanOrEqual(8);
    });

    it("coverage_state is one of the allowed states (adversarial: typo)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(["COMPLETE", "PARTIAL", "PENDING"]).toContain(apiSurface?.coverage_state);
    });
  });

  describe("getLoadErrors / clearCache", () => {
    it("getLoadErrors returns empty array on clean state", () => {
      MastercamCADFunctionIndexEngine.clearCache();
      MastercamCADFunctionIndexEngine.getIndex();
      MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      expect(MastercamCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
    });

    it("clearCache resets indexCache + moduleCache + loadErrors", () => {
      MastercamCADFunctionIndexEngine.getIndex();
      MastercamCADFunctionIndexEngine.getModule("wireframe_operations");
      MastercamCADFunctionIndexEngine.clearCache();
      // After clearCache, getIndex must re-read from disk (no cached identity)
      const fresh = MastercamCADFunctionIndexEngine.getIndex();
      expect(fresh.system_id).toBe("mastercam");
      expect(MastercamCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
    });
  });

  describe("solid_operations catalog (U-CAD-FIDX-MC-02)", () => {
    const KNOWN_SOLID_OPS = [
      "EXTRUDE_SOLID",
      "REVOLVE_SOLID",
      "SWEEP_SOLID",
      "LOFT_SOLID",
      "EXTRUDE_CUT",
      "REVOLVE_CUT",
      "SWEEP_CUT",
      "LOFT_CUT",
      "BOOLEAN",
      "FILLET_SOLID",
      "CHAMFER_SOLID",
      "SHELL",
      "DRAFT",
      "THICKEN_SURFACE",
      "PRIMITIVE",
      "HOLE",
      "PATTERN_LINEAR",
      "PATTERN_CIRCULAR",
    ];

    const SWEEP_OPS = ["EXTRUDE_SOLID", "REVOLVE_SOLID", "SWEEP_SOLID", "LOFT_SOLID"];
    const CUT_OPS = ["EXTRUDE_CUT", "REVOLVE_CUT", "SWEEP_CUT", "LOFT_CUT"];
    const MODIFY_OPS = ["FILLET_SOLID", "CHAMFER_SOLID", "SHELL", "DRAFT"];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("solid_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-02'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("solid_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-02");
    });

    it("operations dict has exactly 18 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("solid_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(18);
    });

    it("listOperations returns exactly the 18 expected solid ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_SOLID_OPS].sort());
    });

    it("every operation reports a Solid_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("solid_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Solid_")).toBe(true);
      }
    });

    it("SWEEP_OPS span all 4 sweep subcategories (Solid_Sweep_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("solid_operations");
      const sweepCategories = ops
        .filter((op) => SWEEP_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(sweepCategories).toEqual([
        "Solid_Sweep_Extrude",
        "Solid_Sweep_Loft",
        "Solid_Sweep_Revolve",
        "Solid_Sweep_Sweep",
      ]);
    });

    it("CUT_OPS span all 4 cut subcategories (Solid_Cut_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("solid_operations");
      const cutCategories = ops
        .filter((op) => CUT_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(cutCategories).toEqual([
        "Solid_Cut_Extrude",
        "Solid_Cut_Loft",
        "Solid_Cut_Revolve",
        "Solid_Cut_Sweep",
      ]);
    });

    it("MODIFY_OPS span all 4 modify subcategories (Solid_Modify_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("solid_operations");
      const modifyCategories = ops
        .filter((op) => MODIFY_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(modifyCategories).toEqual([
        "Solid_Modify_Chamfer",
        "Solid_Modify_Draft",
        "Solid_Modify_Fillet",
        "Solid_Modify_Shell",
      ]);
    });

    it("BOOLEAN Mode covers all 4 set operations (add/subtract/intersect/common)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "BOOLEAN");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["add", "subtract", "intersect", "common"]);
    });

    it("HOLE Type lists all 5 hole variants (failure mode: hole completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "HOLE");
      const typeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual([
        "simple",
        "counterbore",
        "countersink",
        "threaded",
        "tapered",
      ]);
    });

    it("HOLE Termination supports 4 modes (blind/through/up_to/up_to_offset)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "HOLE");
      const termParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Termination");
      expect(termParam?.options).toEqual(["blind", "through", "up_to", "up_to_offset"]);
    });

    it("HOLE Thread Standard covers 6 thread standards", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "HOLE");
      const stdParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Thread Standard");
      expect(stdParam?.options).toEqual(["ANSI", "ISO", "BSW", "BSF", "UNJ", "UNS"]);
    });

    it("PRIMITIVE Type covers 5 classical primitives (box/cylinder/cone/sphere/torus)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "PRIMITIVE");
      const typeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual(["box", "cylinder", "cone", "sphere", "torus"]);
    });

    it("FILLET_SOLID Mode supports constant + variable + face_face (failure mode: fillet completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "FILLET_SOLID");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["constant", "variable", "face_face"]);
    });

    it("FILLET_SOLID Continuity supports G1/G2/G3 fairing (failure mode: continuity span)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "FILLET_SOLID");
      const contParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Continuity");
      expect(contParam?.options).toEqual(["G1", "G2", "G3"]);
    });

    it("CHAMFER_SOLID Mode covers all 4 chamfer parameterizations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "CHAMFER_SOLID");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "distance",
        "distance_distance",
        "distance_angle",
        "two_distances",
      ]);
    });

    it("EXTRUDE_SOLID Operation supports create/add/cut polymorphism", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("solid_operations", "EXTRUDE_SOLID");
      const opParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Operation");
      expect(opParam?.options).toEqual(["create_new", "add_to_existing", "cut_existing"]);
    });

    it("returns null for unknown solid op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("solid_operations", "TELEPORT_BODY"),
      ).toBeNull();
    });

    it("findParameter locates 'Tool Bodies' on BOOLEAN as required (adversarial: cross-tab param)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "solid_operations",
        "BOOLEAN",
        "Tool Bodies",
      );
      expect(loc?.parameter.name).toBe("Tool Bodies");
      expect(loc?.parameter.required).toBe(true);
    });

    it("PATTERN_CIRCULAR Spacing supports equal + incremental (adversarial: missing spacing mode)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "solid_operations",
        "PATTERN_CIRCULAR",
      );
      const spaceParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Spacing");
      expect(spaceParam?.options).toEqual(["equal", "incremental"]);
    });
  });

  describe("surface_operations catalog (U-CAD-FIDX-MC-03)", () => {
    const KNOWN_SURFACE_OPS = [
      "SURFACE_LOFT",
      "SURFACE_SWEEP",
      "SURFACE_REVOLVE",
      "SURFACE_RULED",
      "SURFACE_DRAFT",
      "SURFACE_NET",
      "SURFACE_PRIMITIVE",
      "SURFACE_FROM_SOLID",
      "SURFACE_TRIM",
      "SURFACE_EXTEND",
      "SURFACE_FILLET_FACE_FACE",
      "SURFACE_BLEND",
      "SURFACE_OFFSET",
      "SURFACE_KNIT",
      "SURFACE_UNTRIM",
      "SURFACE_SPLIT",
    ];

    const SWEEP_GENERATION_OPS = [
      "SURFACE_LOFT",
      "SURFACE_SWEEP",
      "SURFACE_REVOLVE",
      "SURFACE_RULED",
      "SURFACE_DRAFT",
      "SURFACE_NET",
    ];

    const MODIFY_OPS = [
      "SURFACE_TRIM",
      "SURFACE_EXTEND",
      "SURFACE_FILLET_FACE_FACE",
      "SURFACE_BLEND",
      "SURFACE_OFFSET",
      "SURFACE_KNIT",
      "SURFACE_UNTRIM",
      "SURFACE_SPLIT",
    ];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("surface_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-03'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("surface_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-03");
    });

    it("operations dict has exactly 16 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("surface_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(16);
    });

    it("listOperations returns exactly the 16 expected surface ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_SURFACE_OPS].sort());
    });

    it("every operation reports a Surface_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("surface_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Surface_")).toBe(true);
      }
    });

    it("SWEEP_GENERATION_OPS span all 6 generation subcategories (Surface_Sweep_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("surface_operations");
      const sweepCategories = ops
        .filter((op) => SWEEP_GENERATION_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(sweepCategories).toEqual([
        "Surface_Sweep_Draft",
        "Surface_Sweep_Loft",
        "Surface_Sweep_Net",
        "Surface_Sweep_Revolve",
        "Surface_Sweep_Ruled",
        "Surface_Sweep_Sweep",
      ]);
    });

    it("MODIFY_OPS span all 8 modify subcategories (Surface_Modify_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("surface_operations");
      const modifyCategories = ops
        .filter((op) => MODIFY_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(modifyCategories).toEqual([
        "Surface_Modify_Blend",
        "Surface_Modify_Extend",
        "Surface_Modify_FilletFaceFace",
        "Surface_Modify_Knit",
        "Surface_Modify_Offset",
        "Surface_Modify_Split",
        "Surface_Modify_Trim",
        "Surface_Modify_Untrim",
      ]);
    });

    it("SURFACE_BLEND Continuity 1 + Continuity 2 each support G0/G1/G2/G3 independently", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_BLEND",
      );
      const c1 = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Continuity 1");
      const c2 = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Continuity 2");
      expect(c1?.options).toEqual(["G0", "G1", "G2", "G3"]);
      expect(c2?.options).toEqual(["G0", "G1", "G2", "G3"]);
    });

    it("SURFACE_FILLET_FACE_FACE Continuity supports G1/G2/G3 (failure mode: G2 minimum for class-A surfacing)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_FILLET_FACE_FACE",
      );
      const contParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Continuity");
      expect(contParam?.options).toEqual(["G1", "G2", "G3"]);
    });

    it("SURFACE_FILLET_FACE_FACE Roll Direction covers all 4 reverse permutations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_FILLET_FACE_FACE",
      );
      const rollParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Roll Direction");
      expect(rollParam?.options).toEqual([
        "natural",
        "reverse_1",
        "reverse_2",
        "reverse_both",
      ]);
    });

    it("SURFACE_PRIMITIVE Type covers 5 classical primitives", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_PRIMITIVE",
      );
      const typeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual(["box", "cylinder", "cone", "sphere", "torus"]);
    });

    it("SURFACE_TRIM Keep Side supports positive/negative/both (failure mode: trim direction)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_TRIM");
      const sideParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Keep Side");
      expect(sideParam?.options).toEqual(["positive", "negative", "both"]);
    });

    it("SURFACE_EXTEND Continuity supports G0/G1/G2 (failure mode: extension continuity)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_EXTEND",
      );
      const contParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Continuity");
      expect(contParam?.options).toEqual(["G0", "G1", "G2"]);
    });

    it("SURFACE_KNIT Output As Solid + Manifold Check expose closed-set conversion path", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_KNIT");
      const solidParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output As Solid");
      const manifoldParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Manifold Check");
      expect(solidParam?.type).toBe("checkbox");
      expect(manifoldParam?.type).toBe("checkbox");
      expect(manifoldParam?.default).toBe(true);
    });

    it("SURFACE_NET U Tangency + V Tangency each support G0/G1/G2", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_NET");
      const u = op?.tabs?.Shape?.parameters?.find((p) => p.name === "U Tangency");
      const v = op?.tabs?.Shape?.parameters?.find((p) => p.name === "V Tangency");
      expect(u?.options).toEqual(["G0", "G1", "G2"]);
      expect(v?.options).toEqual(["G0", "G1", "G2"]);
    });

    it("SURFACE_BLEND Bias is bounded 0..1 (failure mode: blend bias range)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_BLEND",
      );
      const biasParam = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Bias");
      expect(biasParam?.min).toBe(0);
      expect(biasParam?.max).toBe(1);
      expect(biasParam?.default).toBe(0.5);
    });

    it("SURFACE_SPLIT Result Mode supports two_surfaces vs one_with_seam", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_SPLIT",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Result Mode");
      expect(modeParam?.options).toEqual(["two_surfaces", "one_with_seam"]);
    });

    it("returns null for unknown surface op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("surface_operations", "TELEPORT_SURFACE"),
      ).toBeNull();
    });

    it("findParameter locates 'Bias' on SURFACE_BLEND in Continuity tab (adversarial: cross-tab param)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "surface_operations",
        "SURFACE_BLEND",
        "Bias",
      );
      expect(loc?.parameter.name).toBe("Bias");
      expect(loc?.tab_id).toBe("Continuity");
    });

    it("SURFACE_OFFSET Side selector supports outside/inside/both (adversarial: offset direction)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "surface_operations",
        "SURFACE_OFFSET",
      );
      const sideParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Side");
      expect(sideParam?.options).toEqual(["outside", "inside", "both"]);
    });
  });

  describe("drafting_operations catalog (U-CAD-FIDX-MC-04)", () => {
    const KNOWN_DRAFTING_OPS = [
      "SHEET",
      "VIEW_BASE",
      "VIEW_PROJECTED",
      "VIEW_SECTION",
      "VIEW_DETAIL",
      "VIEW_AUXILIARY",
      "VIEW_BREAK",
      "DIMENSION",
      "LEADER",
      "NOTE",
      "HATCH",
      "GDT_FRAME",
      "SURFACE_FINISH",
      "CENTERLINE_2D",
      "PARTS_LIST",
      "TITLE_BLOCK",
    ];

    const VIEW_OPS = [
      "VIEW_BASE",
      "VIEW_PROJECTED",
      "VIEW_SECTION",
      "VIEW_DETAIL",
      "VIEW_AUXILIARY",
      "VIEW_BREAK",
    ];

    const ANNOTATION_OPS = [
      "DIMENSION",
      "LEADER",
      "NOTE",
      "HATCH",
      "GDT_FRAME",
      "SURFACE_FINISH",
      "CENTERLINE_2D",
    ];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("drafting_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-04'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("drafting_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-04");
    });

    it("operations dict has exactly 16 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("drafting_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(16);
    });

    it("listOperations returns exactly the 16 expected drafting ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("drafting_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_DRAFTING_OPS].sort());
    });

    it("every operation reports a Drafting_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("drafting_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Drafting_")).toBe(true);
      }
    });

    it("VIEW_OPS span all 6 view subcategories (Drafting_View_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("drafting_operations");
      const viewCategories = ops
        .filter((op) => VIEW_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(viewCategories).toEqual([
        "Drafting_View_Auxiliary",
        "Drafting_View_Base",
        "Drafting_View_Break",
        "Drafting_View_Detail",
        "Drafting_View_Projected",
        "Drafting_View_Section",
      ]);
    });

    it("ANNOTATION_OPS all carry Drafting_Annotation_ category prefix", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("drafting_operations");
      const annotationOps = ops.filter((op) => ANNOTATION_OPS.includes(op.operation_id));
      expect(annotationOps.length).toBe(7);
      for (const op of annotationOps) {
        expect(op.category.startsWith("Drafting_Annotation_")).toBe(true);
      }
    });

    it("SHEET Format declares 11 size options (ANSI A..E + ISO A0..A4 + custom)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "SHEET");
      const formatParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Format");
      expect(formatParam?.options).toHaveLength(11);
      expect(formatParam?.options).toContain("ANSI_A");
      expect(formatParam?.options).toContain("ISO_A4");
      expect(formatParam?.options).toContain("custom");
    });

    it("VIEW_BASE Orientation declares 11 view orientations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "VIEW_BASE",
      );
      const orientParam = op?.tabs?.View?.parameters?.find((p) => p.name === "Orientation");
      expect(orientParam?.options).toHaveLength(11);
      expect(orientParam?.options).toContain("front");
      expect(orientParam?.options).toContain("iso_top_left");
    });

    it("VIEW_SECTION Section Method supports 6 ASME-standard variants", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "VIEW_SECTION",
      );
      const methodParam = op?.tabs?.View?.parameters?.find((p) => p.name === "Section Method");
      expect(methodParam?.options).toEqual([
        "full",
        "half",
        "aligned",
        "offset",
        "broken_out",
        "revolved",
      ]);
    });

    it("DIMENSION Type spans 8 dimension subtypes (failure mode: missing dimension type)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "DIMENSION");
      const typeParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual([
        "linear",
        "aligned",
        "angular",
        "radial",
        "diameter",
        "arc_length",
        "jogged",
        "ordinate",
      ]);
    });

    it("DIMENSION Tolerance Type covers 7 ASME tolerance forms (failure mode: tolerance completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "DIMENSION");
      const tolParam = op?.tabs?.Tolerance?.parameters?.find((p) => p.name === "Tolerance Type");
      expect(tolParam?.options).toEqual([
        "none",
        "bilateral",
        "limits",
        "symmetric",
        "MAX",
        "MIN",
        "single_limit",
      ]);
    });

    it("GDT_FRAME Geometric Type lists exactly 14 ASME Y14.5 characteristics (failure mode: GD&T completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "GDT_FRAME",
      );
      const typeParam = op?.tabs?.Tolerance?.parameters?.find((p) => p.name === "Geometric Type");
      expect(typeParam?.options).toHaveLength(14);
      expect(typeParam?.options).toContain("position");
      expect(typeParam?.options).toContain("flatness");
      expect(typeParam?.options).toContain("total_runout");
      expect(typeParam?.options).toContain("profile_surface");
    });

    it("SURFACE_FINISH Lay Direction covers 7 ASME Y14.36 lay symbols", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "SURFACE_FINISH",
      );
      const layParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Lay Direction");
      expect(layParam?.options).toEqual([
        "parallel",
        "perpendicular",
        "crossed",
        "multi",
        "circular",
        "radial",
        "particulate",
      ]);
    });

    it("HATCH Pattern covers all 12 ANSI/ISO patterns + solid + auto", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "HATCH");
      const patternParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Pattern");
      expect(patternParam?.options).toHaveLength(13);
      expect(patternParam?.options).toContain("ANSI31");
      expect(patternParam?.options).toContain("ISO_steel");
      expect(patternParam?.options).toContain("auto_by_material");
    });

    it("CENTERLINE_2D Type supports all 5 generation modes", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "CENTERLINE_2D",
      );
      const typeParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual([
        "bisector",
        "two_lines",
        "circular_pattern",
        "projected",
        "full_pattern",
      ]);
    });

    it("LEADER Style supports straight/jogged/curved (failure mode: missing leader style)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "LEADER");
      const styleParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Style");
      expect(styleParam?.options).toEqual(["straight", "jogged", "curved"]);
    });

    it("NOTE Attach Mode supports floating/with_leader/with_balloon", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "NOTE");
      const attachParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Attach Mode");
      expect(attachParam?.options).toEqual(["floating", "with_leader", "with_balloon"]);
    });

    it("returns null for unknown drafting op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("drafting_operations", "TELEPORT_VIEW"),
      ).toBeNull();
    });

    it("findParameter locates 'Tolerance Value' on GDT_FRAME as required (adversarial: cross-tab GDT param)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "drafting_operations",
        "GDT_FRAME",
        "Tolerance Value",
      );
      expect(loc?.parameter.name).toBe("Tolerance Value");
      expect(loc?.parameter.required).toBe(true);
    });

    it("VIEW_BREAK Break Style supports 4 aesthetic options (adversarial: break style)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "drafting_operations",
        "VIEW_BREAK",
      );
      const styleParam = op?.tabs?.View?.parameters?.find((p) => p.name === "Break Style");
      expect(styleParam?.options).toEqual(["straight", "curved", "zigzag", "step"]);
    });
  });

  describe("transformation_operations catalog (U-CAD-FIDX-MC-05)", () => {
    const KNOWN_TRANSFORM_OPS = [
      "TRANSLATE",
      "ROTATE",
      "MIRROR",
      "SCALE",
      "ARRAY_LINEAR",
      "ARRAY_RECTANGULAR",
      "ARRAY_CIRCULAR",
      "DYNAMIC_TRANSFORM",
      "PROJECT_TO_PLANE",
      "UNROLL",
    ];

    const ARRAY_OPS = ["ARRAY_LINEAR", "ARRAY_RECTANGULAR", "ARRAY_CIRCULAR"];
    const BASIC_TRANSFORMS = ["TRANSLATE", "ROTATE", "MIRROR", "SCALE"];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("transformation_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-05'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("transformation_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-05");
    });

    it("operations dict has exactly 10 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("transformation_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(10);
    });

    it("listOperations returns exactly the 10 expected transformation ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("transformation_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_TRANSFORM_OPS].sort());
    });

    it("every operation reports a Transform_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("transformation_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Transform_")).toBe(true);
      }
    });

    it("ARRAY_OPS span all 3 array subcategories (Transform_Array_*)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("transformation_operations");
      const arrayCategories = ops
        .filter((op) => ARRAY_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(arrayCategories).toEqual([
        "Transform_Array_Circular",
        "Transform_Array_Linear",
        "Transform_Array_Rectangular",
      ]);
    });

    it("BASIC_TRANSFORMS each support copy/move/join semantics (failure mode: missing copy mode)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("transformation_operations");
      const basics = ops.filter((op) => BASIC_TRANSFORMS.includes(op.operation_id));
      expect(basics.length).toBe(4);
      for (const op of basics) {
        const fullOp = MastercamCADFunctionIndexEngine.getOperation(
          "transformation_operations",
          op.operation_id,
        );
        const copyParam = fullOp?.tabs?.Shape?.parameters?.find((p) => p.name === "Copy/Move");
        expect(copyParam?.options).toContain("copy");
        expect(copyParam?.options).toContain("move");
      }
    });

    it("SCALE Mode supports uniform/non_uniform/along_axis (failure mode: scale mode completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "SCALE",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["uniform", "non_uniform", "along_axis"]);
    });

    it("ARRAY_CIRCULAR Spacing supports equal + incremental", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "ARRAY_CIRCULAR",
      );
      const spaceParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Spacing");
      expect(spaceParam?.options).toEqual(["equal", "incremental"]);
    });

    it("DYNAMIC_TRANSFORM Translation Lock supports 7 axis-lock combinations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "DYNAMIC_TRANSFORM",
      );
      const lockParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Translation Lock",
      );
      expect(lockParam?.options).toEqual(["none", "x", "y", "z", "xy", "xz", "yz"]);
    });

    it("DYNAMIC_TRANSFORM Scale Lock includes uniform-lock alongside per-axis (failure mode: scale lock semantics)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "DYNAMIC_TRANSFORM",
      );
      const scaleLockParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Scale Lock");
      expect(scaleLockParam?.options).toEqual(["none", "x", "y", "z", "uniform"]);
    });

    it("PROJECT_TO_PLANE Direction supports normal + specified projection (failure mode: projection direction)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "PROJECT_TO_PLANE",
      );
      const dirParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Direction");
      expect(dirParam?.options).toEqual(["normal", "specified"]);
    });

    it("UNROLL Approximation Mode supports linear/spline/refit_nurbs", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "UNROLL",
      );
      const approxParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Approximation Mode",
      );
      expect(approxParam?.options).toEqual(["linear", "spline", "refit_nurbs"]);
    });

    it("MIRROR Connect Open Ends parameter exists for source-mirror bridge", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "MIRROR",
      );
      const connectParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Connect Open Ends",
      );
      expect(connectParam?.type).toBe("checkbox");
      expect(connectParam?.default).toBe(false);
    });

    it("returns null for unknown transformation op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation(
          "transformation_operations",
          "TELEPORT_BODY",
        ),
      ).toBeNull();
    });

    it("findParameter locates 'Center Axis' on ARRAY_CIRCULAR as required (adversarial)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "transformation_operations",
        "ARRAY_CIRCULAR",
        "Center Axis",
      );
      expect(loc?.parameter.name).toBe("Center Axis");
      expect(loc?.parameter.required).toBe(true);
    });

    it("UNROLL Stationary Edge is required (adversarial: unroll requires fixed edge)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "transformation_operations",
        "UNROLL",
      );
      const stationaryParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Stationary Edge",
      );
      expect(stationaryParam?.required).toBe(true);
    });
  });

  describe("analysis_operations catalog (U-CAD-FIDX-MC-06)", () => {
    const KNOWN_ANALYSIS_OPS = [
      "CHAIN_ANALYZE",
      "DISTANCE_TWO_POINTS",
      "DISTANCE_TWO_ENTITIES",
      "ANGLE_TWO_LINES",
      "AREA_PROFILE",
      "AREA_SURFACE",
      "VOLUME_SOLID",
      "ENTITY_INFO",
      "DYNAMIC_INSPECT",
      "ENTITY_VERIFY",
    ];

    const DISTANCE_OPS = ["DISTANCE_TWO_POINTS", "DISTANCE_TWO_ENTITIES"];
    const AREA_OPS = ["AREA_PROFILE", "AREA_SURFACE"];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("analysis_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-06'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("analysis_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-06");
    });

    it("operations dict has exactly 10 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("analysis_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(10);
    });

    it("listOperations returns exactly the 10 expected analysis ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("analysis_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_ANALYSIS_OPS].sort());
    });

    it("every operation reports an Analysis_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("analysis_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Analysis_")).toBe(true);
      }
    });

    it("DISTANCE_OPS span both distance subcategories (TwoPoints + TwoEntities)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("analysis_operations");
      const distanceCategories = ops
        .filter((op) => DISTANCE_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(distanceCategories).toEqual([
        "Analysis_Distance_TwoEntities",
        "Analysis_Distance_TwoPoints",
      ]);
    });

    it("AREA_OPS span both area subcategories (Profile + Surface)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("analysis_operations");
      const areaCategories = ops
        .filter((op) => AREA_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(areaCategories).toEqual(["Analysis_Area_Profile", "Analysis_Area_Surface"]);
    });

    it("DISTANCE_TWO_POINTS Display Mode covers 3d_euclidean / projected_2d / axis_components", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "DISTANCE_TWO_POINTS",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Display Mode");
      expect(modeParam?.options).toEqual(["3d_euclidean", "projected_2d", "axis_components"]);
    });

    it("DISTANCE_TWO_ENTITIES Mode supports closest/farthest/both", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "DISTANCE_TWO_ENTITIES",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["closest", "farthest", "both"]);
    });

    it("ANGLE_TWO_LINES Reflex Mode supports acute/reflex/both (failure mode: angle ambiguity)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "ANGLE_TWO_LINES",
      );
      const reflexParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Reflex Mode");
      expect(reflexParam?.options).toEqual(["acute", "reflex", "both"]);
    });

    it("VOLUME_SOLID Density parameter has g/cm3 unit (mass-properties standard)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "VOLUME_SOLID",
      );
      const densityParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Density");
      expect(densityParam?.unit).toBe("g/cm3");
    });

    it("AREA_PROFILE Output Units covers SI + imperial (5 unit choices)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "AREA_PROFILE",
      );
      const unitParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Units");
      expect(unitParam?.options).toEqual(["mm2", "cm2", "m2", "in2", "ft2"]);
    });

    it("VOLUME_SOLID Output Units covers SI + imperial (5 unit choices)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "VOLUME_SOLID",
      );
      const unitParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Units");
      expect(unitParam?.options).toEqual(["mm3", "cm3", "m3", "in3", "ft3"]);
    });

    it("CHAIN_ANALYZE Output Mode supports display_only / log / highlight / all", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "CHAIN_ANALYZE",
      );
      const outputParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Mode");
      expect(outputParam?.options).toEqual([
        "display_only",
        "log_to_file",
        "highlight_in_view",
        "all",
      ]);
    });

    it("ENTITY_VERIFY Validation Type covers all 6 categories (failure mode: validation completeness)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "ENTITY_VERIFY",
      );
      const valParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Validation Type");
      expect(valParam?.options).toEqual([
        "gaps",
        "overlaps",
        "self_intersect",
        "manifold",
        "small_features",
        "all",
      ]);
    });

    it("ENTITY_VERIFY Severity Filter supports errors_only / warnings_and_errors / all", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "ENTITY_VERIFY",
      );
      const severityParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Severity Filter",
      );
      expect(severityParam?.options).toEqual([
        "errors_only",
        "warnings_and_errors",
        "all",
      ]);
    });

    it("DYNAMIC_INSPECT Mode supports distance/angle/area/length", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "DYNAMIC_INSPECT",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["distance", "angle", "area", "length"]);
    });

    it("ENTITY_INFO Display Detail Level supports basic/full/verbose", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "ENTITY_INFO",
      );
      const detailParam = op?.tabs?.Shape?.parameters?.find(
        (p) => p.name === "Display Detail Level",
      );
      expect(detailParam?.options).toEqual(["basic", "full", "verbose"]);
    });

    it("ENTITY_INFO Output Format supports dialog/log/json/csv (adversarial: format coverage)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "analysis_operations",
        "ENTITY_INFO",
      );
      const formatParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Format");
      expect(formatParam?.options).toEqual(["dialog", "log_to_file", "json", "csv"]);
    });

    it("returns null for unknown analysis op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("analysis_operations", "TELEPORT_QUERY"),
      ).toBeNull();
    });

    it("findParameter locates 'Tolerance' on CHAIN_ANALYZE (adversarial: cross-op tolerance)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "analysis_operations",
        "CHAIN_ANALYZE",
        "Tolerance",
      );
      expect(loc?.parameter.name).toBe("Tolerance");
      expect(loc?.parameter.unit).toBe("mm");
    });
  });

  describe("modify_operations catalog (U-CAD-FIDX-MC-07)", () => {
    const KNOWN_MODIFY_OPS = [
      "TRIM",
      "EXTEND",
      "BREAK_AT_POINT",
      "BREAK_AT_INTERSECTION",
      "JOIN",
      "FILLET_2D",
      "CHAMFER_2D",
      "BLEND_CURVES",
      "SMOOTH_CURVE",
      "SIMPLIFY_CURVE",
      "REVERSE_DIRECTION",
      "CONVERT_TO_SPLINE",
      "EDIT_SPLINE",
      "MODIFY_LENGTH",
    ];

    const BREAK_OPS = ["BREAK_AT_POINT", "BREAK_AT_INTERSECTION"];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("modify_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-MC-07'", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("modify_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-MC-07");
    });

    it("operations dict has exactly 14 entries", () => {
      const mod = MastercamCADFunctionIndexEngine.getModule("modify_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(14);
    });

    it("listOperations returns exactly the 14 expected modify ops", () => {
      const ids = MastercamCADFunctionIndexEngine.listOperations("modify_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_MODIFY_OPS].sort());
    });

    it("every operation reports a Modify_-prefixed category", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("modify_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Modify_")).toBe(true);
      }
    });

    it("BREAK_OPS span both break subcategories (AtPoint + AtIntersection)", () => {
      const ops = MastercamCADFunctionIndexEngine.listOperations("modify_operations");
      const breakCategories = ops
        .filter((op) => BREAK_OPS.includes(op.operation_id))
        .map((op) => op.category)
        .sort();
      expect(breakCategories).toEqual([
        "Modify_Break_AtIntersection",
        "Modify_Break_AtPoint",
      ]);
    });

    it("TRIM Mode supports trim_one/trim_both/divide", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("modify_operations", "TRIM");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["trim_one", "trim_both", "divide"]);
    });

    it("EXTEND Length Mode supports fixed_distance/to_boundary/specified_curve", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("modify_operations", "EXTEND");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Length Mode");
      expect(modeParam?.options).toEqual([
        "fixed_distance",
        "to_boundary",
        "specified_curve",
      ]);
    });

    it("BREAK_AT_POINT Mode supports at_point/by_distance/by_parameter", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "BREAK_AT_POINT",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["at_point", "by_distance", "by_parameter"]);
    });

    it("FILLET_2D Mode supports trim/no_trim", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("modify_operations", "FILLET_2D");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["trim", "no_trim"]);
    });

    it("CHAMFER_2D Mode supports 3 parameterizations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("modify_operations", "CHAMFER_2D");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "equal_distance",
        "distance_distance",
        "distance_angle",
      ]);
    });

    it("BLEND_CURVES Continuity 1 + Continuity 2 each support G0/G1/G2/G3 independently", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "BLEND_CURVES",
      );
      const c1 = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Continuity 1");
      const c2 = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Continuity 2");
      expect(c1?.options).toEqual(["G0", "G1", "G2", "G3"]);
      expect(c2?.options).toEqual(["G0", "G1", "G2", "G3"]);
    });

    it("BLEND_CURVES Bias bounded 0..1 with default 0.5 (failure mode: blend bias range)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "BLEND_CURVES",
      );
      const biasParam = op?.tabs?.Continuity?.parameters?.find((p) => p.name === "Bias");
      expect(biasParam?.min).toBe(0);
      expect(biasParam?.max).toBe(1);
      expect(biasParam?.default).toBe(0.5);
    });

    it("SIMPLIFY_CURVE Mode supports reduce_points/refit/decimate", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "SIMPLIFY_CURVE",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["reduce_points", "refit", "decimate"]);
    });

    it("CONVERT_TO_SPLINE Degree bounded 1..7 (failure mode: NURBS degree range)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "CONVERT_TO_SPLINE",
      );
      const degParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Degree");
      expect(degParam?.min).toBe(1);
      expect(degParam?.max).toBe(7);
      expect(degParam?.default).toBe(3);
    });

    it("EDIT_SPLINE Mode supports 5 interactive edit operations", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "EDIT_SPLINE",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual([
        "move_point",
        "insert_point",
        "delete_point",
        "edit_weight",
        "edit_knot",
      ]);
    });

    it("REVERSE_DIRECTION Mode supports reverse + match_pair (failure mode: chain alignment)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "REVERSE_DIRECTION",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["reverse", "match_pair"]);
    });

    it("MODIFY_LENGTH Mode supports lengthen/shorten/total_length", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation(
        "modify_operations",
        "MODIFY_LENGTH",
      );
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["lengthen", "shorten", "total_length"]);
    });

    it("JOIN Output Type supports polyline/spline/preserve_individual (adversarial: output flexibility)", () => {
      const op = MastercamCADFunctionIndexEngine.getOperation("modify_operations", "JOIN");
      const outputParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Type");
      expect(outputParam?.options).toEqual(["polyline", "spline", "preserve_individual"]);
    });

    it("returns null for unknown modify op (adversarial: typo)", () => {
      expect(
        MastercamCADFunctionIndexEngine.getOperation("modify_operations", "TELEPORT_CURVE"),
      ).toBeNull();
    });

    it("findParameter locates 'Bias' on BLEND_CURVES in Continuity tab (adversarial: cross-tab)", () => {
      const loc = MastercamCADFunctionIndexEngine.findParameter(
        "modify_operations",
        "BLEND_CURVES",
        "Bias",
      );
      expect(loc?.parameter.name).toBe("Bias");
      expect(loc?.tab_id).toBe("Continuity");
    });
  });
});
