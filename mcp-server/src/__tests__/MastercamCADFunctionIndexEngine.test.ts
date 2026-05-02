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

    it("listAllOperations equals 24 ops total at Phase 1 1/8 (only wireframe shipped)", () => {
      const all = MastercamCADFunctionIndexEngine.listAllOperations();
      expect(all.length).toBe(24);
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
    it("counts exactly 153 parameters across all 24 wireframe operations", () => {
      const total = MastercamCADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(153);
    });

    it("module's per-engine computed total exactly equals its metadata.totalParameters declaration", () => {
      const wireframeTotal = sumParamsForModule("wireframe_operations");
      const wireframeDeclared = (
        MastercamCADFunctionIndexEngine.getModule("wireframe_operations")?.metadata as {
          totalParameters?: number;
        }
      )?.totalParameters;
      expect(wireframeTotal).toBe(153);
      expect(wireframeDeclared).toBe(153);
    });
  });

  describe("coverage_summary — Phase 1 markers (Mastercam CAD exhaust starting)", () => {
    it("api_surface.coverage_state is exactly 'PARTIAL' (only 1 of 8 modules shipped)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.coverage_state).toBe("PARTIAL");
    });

    it("api_surface.phase_1_target_modules equals 8 (full Inventor parity target)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules).toBe(8);
    });

    it("api_surface.phase_1_target_modules_remaining is exactly 7 (1/8 shipped)", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(7);
    });

    it("api_surface.phase_1_modules_pending lists the 7 unbuilt modules in shipping order", () => {
      const apiSurface = MastercamCADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_modules_pending).toEqual([
        "solid_operations",
        "surface_operations",
        "drafting_operations",
        "transformation_operations",
        "analysis_operations",
        "modify_operations",
        "file_layer_operations",
      ]);
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
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(7);
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
});
