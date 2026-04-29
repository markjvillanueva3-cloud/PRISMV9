/**
 * Tests for HyperCADCADFunctionIndexEngine — hyperCAD-S CAD Function Index.
 * @see src/engines/HyperCADCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-HCAD-01
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyperCADCADFunctionIndexEngine } from "../engines/HyperCADCADFunctionIndexEngine.js";

const KNOWN_SKETCH_OPS = [
  "LINE", "RECTANGLE", "CIRCLE", "ARC", "POLYGON", "ELLIPSE", "SPLINE", "SLOT", "POINT",
  "TRIM", "EXTEND", "BREAK", "MIRROR", "OFFSET", "SCALE", "ROTATE", "TRANSLATE", "STRETCH",
  "SKETCH_FILLET", "SKETCH_CHAMFER", "MATCH",
  "PROJECT_EDGE", "PROJECT_FACE", "INTERSECT_SURFACE", "PROJECT_SILHOUETTE",
  "SKETCH_CONSTRAINT", "SKETCH_DIMENSION",
  "QUERY_LENGTH", "QUERY_AREA", "QUERY_DISTANCE", "QUERY_ANGLE", "QUERY_COORDINATES",
];

function sumParamsForModule(moduleId: string): number {
  const mod = HyperCADCADFunctionIndexEngine.getModule(moduleId);
  if (!mod || !mod.operations) return 0;
  let total = 0;
  for (const op of Object.values(mod.operations)) {
    for (const tab of Object.values(op.tabs ?? {})) {
      total += (tab.parameters ?? tab.params ?? []).length;
    }
  }
  return total;
}

describe("HyperCADCADFunctionIndexEngine", () => {
  beforeEach(() => {
    HyperCADCADFunctionIndexEngine.clearCache();
  });

  describe("getIndex — index header values", () => {
    it("system_id is exactly 'hypercad_s'", () => {
      expect(HyperCADCADFunctionIndexEngine.getIndex().system_id).toBe("hypercad_s");
    });

    it("module_id is exactly 'cad_function_index'", () => {
      expect(HyperCADCADFunctionIndexEngine.getIndex().module_id).toBe("cad_function_index");
    });

    it("schema_version is exactly '1.0.0'", () => {
      expect(HyperCADCADFunctionIndexEngine.getIndex().schema_version).toBe("1.0.0");
    });

    it("indexed_at parses to a real Date in 2026", () => {
      const ts = HyperCADCADFunctionIndexEngine.getIndex().indexed_at;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      const d = new Date(ts);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(Number.isNaN(d.getTime())).toBe(false);
    });

    it("modules array contains exactly one shipped module today (sketch_operations)", () => {
      const ids = HyperCADCADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual(["sketch_operations"]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = HyperCADCADFunctionIndexEngine.getIndex();
      const b = HyperCADCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap", () => {
    it("declares exactly 7 deferred modules with non-empty scopes", () => {
      const fm = HyperCADCADFunctionIndexEngine.getIndex().future_modules ?? [];
      expect(fm.length).toBe(7);
      for (const f of fm) {
        expect(f.scope.length).toBeGreaterThan(20);
        expect(f.estimated_params).toBeGreaterThan(0);
        expect(f.deferred_to).toMatch(/^U-CAD-FIDX-HCAD-\d+$/);
      }
    });

    it("planned_ids cover solid/surface/healing/mesh/assembly/drawing/datum", () => {
      const fm = HyperCADCADFunctionIndexEngine.getIndex().future_modules ?? [];
      const ids = fm.map((f) => f.planned_id).sort();
      expect(ids).toEqual([
        "assembly_operations",
        "datum_operations",
        "drawing_operations",
        "healing_operations",
        "mesh_operations",
        "solid_operations",
        "surface_operations",
      ]);
    });

    it("healing_operations is captured as hyperCAD's distinctive feature with substantive scope", () => {
      const fm = HyperCADCADFunctionIndexEngine.getIndex().future_modules ?? [];
      const healing = fm.find((f) => f.planned_id === "healing_operations");
      // Substantive existence assertion: must be present with all fields
      expect(healing?.planned_id).toBe("healing_operations");
      expect(healing?.scope ?? "").toMatch(/healing|gap.*fill|knit/i);
      expect(healing?.estimated_params ?? 0).toBeGreaterThanOrEqual(80);
      expect(healing?.deferred_to).toBe("U-CAD-FIDX-HCAD-04");
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns exactly ['sketch_operations']", () => {
      expect(HyperCADCADFunctionIndexEngine.listModules()).toEqual(["sketch_operations"]);
    });

    it("getModuleEntry('sketch_operations') has the U-CAD-FIDX-HCAD-01 tag and 242 params", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("sketch_operations");
      expect(entry?.module_id).toBe("sketch_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/sketch-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-01"]);
      expect(entry?.parameter_count_estimate).toBe(242);
    });

    it("getModuleEntry returns null for unknown module", () => {
      expect(HyperCADCADFunctionIndexEngine.getModuleEntry("nonexistent_xyz")).toBeNull();
    });
  });

  describe("listOperations — sketch_operations module", () => {
    it("returns exactly 32 sketch operations matching the canonical hyperCAD-S list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("sketch_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(32);
      expect(ops.sort()).toEqual([...KNOWN_SKETCH_OPS].sort());
    });

    it("listAllOperations equals listOperations of the only shipped module", () => {
      const all = HyperCADCADFunctionIndexEngine.listAllOperations();
      const sketch = HyperCADCADFunctionIndexEngine.listOperations("sketch_operations");
      expect(all.length).toBe(sketch.length);
      expect(all.length).toBe(32);
    });

    it("listOperations on unknown module returns empty array (failure mode)", () => {
      expect(HyperCADCADFunctionIndexEngine.listOperations("nonexistent")).toEqual([]);
    });
  });

  describe("LINE — 8-mode taxonomy (hyperCAD's distinguishing feature vs Fusion's 1-mode)", () => {
    it("LINE enumerates all 8 placement modes including ortho/parallel/perpendicular/tangent/polar/offset", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "LINE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "two_point", "ortho", "parallel", "perpendicular", "tangent", "polar", "offset", "free",
      ]);
    });
  });

  describe("CIRCLE — 5 placement methods (more than Fusion's variant set)", () => {
    it("CIRCLE includes hyperCAD's tangent_two_circles and tangent_three_elements modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "CIRCLE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "center_radius", "three_point", "two_point_diameter", "tangent_two_circles", "tangent_three_elements",
      ]);
    });

    it("CIRCLE side_selector enumerates the 4 multi-solution choices for tangent_three_elements", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "CIRCLE");
      const sideSelector = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Side Selector");
      expect(sideSelector?.options).toEqual(["smallest", "largest", "interior", "exterior"]);
    });
  });

  describe("SPLINE — 3 distinct creation methods", () => {
    it("SPLINE distinguishes interpolation / control_polygon / tangent_spline modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SPLINE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual(["interpolation", "control_polygon", "tangent_spline"]);
    });

    it("SPLINE supports degree options (cubic/quintic standard, plus 2 and 7)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SPLINE");
      const degree = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Degree");
      expect(degree?.options).toEqual([2, 3, 5, 7]);
      expect(degree?.default).toBe(3);
    });

    it("SPLINE knot vector type defaults to centripetal (canonical for interpolation)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SPLINE");
      const knot = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Knot Vector Type");
      expect(knot?.options).toEqual(["uniform", "centripetal", "chord_length"]);
      expect(knot?.default).toBe("centripetal");
    });
  });

  describe("SKETCH_CONSTRAINT — 15 constraint types (hyperCAD's solver depth)", () => {
    it("enumerates all 15 constraint types including smooth_g2 (rare in 2D solvers)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SKETCH_CONSTRAINT");
      const ctype = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Constraint Type");
      expect(ctype?.options).toEqual([
        "coincident", "concentric", "collinear", "parallel", "perpendicular",
        "tangent", "equal", "symmetric", "horizontal", "vertical",
        "fix_point", "fix_length", "lock_distance", "midpoint", "smooth_g2",
      ]);
      expect(ctype?.options).toHaveLength(15);
    });
  });

  describe("SKETCH_DIMENSION — 8 dimension types", () => {
    it("enumerates 8 dimension types including arc_length and reference (display-only)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SKETCH_DIMENSION");
      const dtype = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Dimension Type");
      expect(dtype?.options).toEqual([
        "linear", "angular", "diameter", "radius",
        "arc_length", "distance_between", "distance_to_point", "reference",
      ]);
    });

    it("SKETCH_DIMENSION supports all 4 tolerance display styles", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "SKETCH_DIMENSION");
      const tolType = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Tolerance Type");
      expect(tolType?.options).toEqual(["none", "limits", "plus_minus", "asymmetric"]);
    });
  });

  describe("Sketch_Edit — 12 editing operations", () => {
    it("getOperationsByCategory enumerates exactly 12 Sketch_Edit operations", () => {
      const edits = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Sketch_Edit", "sketch_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(edits).toEqual([
        "BREAK", "EXTEND", "MATCH", "MIRROR", "OFFSET",
        "ROTATE", "SCALE", "SKETCH_CHAMFER", "SKETCH_FILLET",
        "STRETCH", "TRANSLATE", "TRIM",
      ]);
    });

    it("OFFSET corner_type enumerates all 4 corner-treatment options", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "OFFSET");
      const corner = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Corner Type");
      expect(corner?.options).toEqual(["arc", "extension", "miter", "chamfer"]);
    });
  });

  describe("Sketch_Reference — 4 projection ops", () => {
    it("getOperationsByCategory enumerates exactly 4 Sketch_Reference operations", () => {
      const refs = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Sketch_Reference", "sketch_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(refs).toEqual(["INTERSECT_SURFACE", "PROJECT_EDGE", "PROJECT_FACE", "PROJECT_SILHOUETTE"]);
    });
  });

  describe("Sketch_Query — 5 measurement ops", () => {
    it("getOperationsByCategory enumerates exactly 5 Sketch_Query operations", () => {
      const queries = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Sketch_Query", "sketch_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(queries).toEqual([
        "QUERY_ANGLE", "QUERY_AREA", "QUERY_COORDINATES", "QUERY_DISTANCE", "QUERY_LENGTH",
      ]);
    });

    it("QUERY_ANGLE supports the 5 angle-sense options", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "QUERY_ANGLE");
      const sense = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Angle Sense");
      expect(sense?.options).toEqual([
        "acute", "obtuse", "supplementary", "complementary", "signed_ccw",
      ]);
    });

    it("QUERY_COORDINATES supports 3 coordinate systems including polar", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", "QUERY_COORDINATES");
      const coordSys = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Coordinate System");
      expect(coordSys?.options).toEqual(["sketch_local", "model_global", "polar"]);
    });
  });

  describe("findParameter — happy path + 3 failure modes", () => {
    it("locates LINE.Mode with full option set", () => {
      const loc = HyperCADCADFunctionIndexEngine.findParameter("sketch_operations", "LINE", "Mode");
      expect(loc?.tab_id).toBe("Geometry");
      expect(loc?.parameter.required).toBe(true);
      expect(loc?.parameter.options).toContain("polar");
    });

    it("returns null when the operation doesn't exist (failure mode)", () => {
      expect(HyperCADCADFunctionIndexEngine.findParameter("sketch_operations", "NONEXISTENT", "Mode")).toBeNull();
    });

    it("returns null when the parameter doesn't exist on the operation (failure mode)", () => {
      expect(HyperCADCADFunctionIndexEngine.findParameter("sketch_operations", "LINE", "FakeParam")).toBeNull();
    });

    it("returns null when looking up CIRCLE-only param on LINE — must not cross-pollinate (failure mode)", () => {
      // 'Side Selector' exists on CIRCLE only — must not match LINE
      expect(HyperCADCADFunctionIndexEngine.findParameter("sketch_operations", "LINE", "Side Selector")).toBeNull();
    });
  });

  describe("searchParameters — substring matching", () => {
    it("'Tangent' matches across CIRCLE, ARC, SPLINE, OFFSET, SKETCH_FILLET — at least 5 ops", () => {
      const matches = HyperCADCADFunctionIndexEngine.searchParameters("Tangent");
      const opsWithTangent = new Set(matches.map((m) => m.operation_id));
      expect(opsWithTangent.size).toBeGreaterThanOrEqual(5);
    });

    it("'Construction' matches the construction toggle that appears across primitives", () => {
      const matches = HyperCADCADFunctionIndexEngine.searchParameters("Construction");
      // Construction toggle appears on 9 primitive ops + a handful of edit ops/descriptions
      // — drift guard at 14, the catalog's measured count
      expect(matches.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe("getTotalParameterCount + per-module drift guard", () => {
    it("counts exactly 242 parameters across all 32 sketch operations", () => {
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(242);
    });

    it("per-module computed total exactly equals metadata.totalParameters declaration (catches catalog drift)", () => {
      const sketchTotal = sumParamsForModule("sketch_operations");
      const sketchDeclared = (HyperCADCADFunctionIndexEngine.getModule("sketch_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(sketchTotal).toBe(242);
      expect(sketchDeclared).toBe(242);
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(sketchTotal);
    });
  });

  describe("clearCache", () => {
    it("forces re-read on next getIndex (different object identity after clear)", () => {
      const before = HyperCADCADFunctionIndexEngine.getIndex();
      HyperCADCADFunctionIndexEngine.clearCache();
      const after = HyperCADCADFunctionIndexEngine.getIndex();
      // Same content, different object identity
      expect(after.system_id).toBe(before.system_id);
      expect(after === before).toBe(false);
    });
  });

  describe("contract: every operation declares a substantive description (>=20 chars)", () => {
    it("every sketch op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("sketch_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("sketch_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });
  });
});
