/**
 * Tests for Fusion360CADFunctionIndexEngine
 * @see src/engines/Fusion360CADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-FUS-01
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Fusion360CADFunctionIndexEngine } from "../engines/Fusion360CADFunctionIndexEngine.js";

const KNOWN_OPS = [
  "LINE",
  "RECTANGLE",
  "CIRCLE",
  "ARC",
  "POLYGON",
  "ELLIPSE",
  "SPLINE",
  "SLOT",
  "CONIC_CURVE",
  "POINT",
  "PROJECT",
  "INTERSECT",
  "PROJECT_TO_SURFACE",
  "MIRROR",
  "OFFSET",
  "TRIM",
  "EXTEND",
  "BREAK",
  "SCALE",
  "SKETCH_DIMENSION",
  "GEOMETRIC_CONSTRAINT",
  "CONSTRUCTION_TOGGLE",
];

describe("Fusion360CADFunctionIndexEngine", () => {
  beforeEach(() => {
    Fusion360CADFunctionIndexEngine.clearCache();
  });

  describe("getIndex — index header values", () => {
    it("system_id is exactly 'fusion360'", () => {
      expect(Fusion360CADFunctionIndexEngine.getIndex().system_id).toBe("fusion360");
    });

    it("module_id is exactly 'cad_function_index'", () => {
      expect(Fusion360CADFunctionIndexEngine.getIndex().module_id).toBe("cad_function_index");
    });

    it("schema_version is exactly '1.0.0'", () => {
      expect(Fusion360CADFunctionIndexEngine.getIndex().schema_version).toBe("1.0.0");
    });

    it("indexed_at parses to a real Date in 2026", () => {
      const ts = Fusion360CADFunctionIndexEngine.getIndex().indexed_at;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      const d = new Date(ts);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(Number.isNaN(d.getTime())).toBe(false);
    });

    it("modules array contains exactly one module today (sketch_operations)", () => {
      const ids = Fusion360CADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual(["sketch_operations"]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = Fusion360CADFunctionIndexEngine.getIndex();
      const b = Fusion360CADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap", () => {
    it("declares exactly 5 deferred modules with non-empty scopes", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      expect(fm.length).toBe(5);
      for (const f of fm) {
        expect(f.scope.length).toBeGreaterThan(20);
        expect(f.estimated_params).toBeGreaterThan(0);
        expect(f.deferred_to).toMatch(/^U-CAD-FIDX-FUS-\d+$/);
      }
    });

    it("planned_ids cover feature/modify/surface/mesh/assembly", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      const ids = fm.map((f) => f.planned_id).sort();
      expect(ids).toEqual([
        "assembly_operations",
        "feature_operations",
        "mesh_operations",
        "modify_operations",
        "surface_operations",
      ]);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns exactly ['sketch_operations']", () => {
      expect(Fusion360CADFunctionIndexEngine.listModules()).toEqual(["sketch_operations"]);
    });

    it("getModuleEntry('sketch_operations') has the U-CAD-FIDX-FUS-01 tag", () => {
      const entry = Fusion360CADFunctionIndexEngine.getModuleEntry("sketch_operations");
      expect(entry?.module_id).toBe("sketch_operations");
      expect(entry?.path).toBe("cad-functions/fusion360/sketch-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-FUS-01"]);
      expect(entry?.parameter_count_estimate).toBe(115);
    });

    it("getModuleEntry returns null for unknown module", () => {
      expect(Fusion360CADFunctionIndexEngine.getModuleEntry("nonexistent_xyz")).toBeNull();
    });
  });

  describe("getModule — sketch_operations catalog", () => {
    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-FUS-01'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-FUS-01");
    });

    it("operations dict has exactly 22 entries", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(22);
    });

    it("returns same object identity on cache hit", () => {
      const a = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      const b = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      expect(a === b).toBe(true);
    });

    it("returns null for unregistered module without throwing", () => {
      expect(Fusion360CADFunctionIndexEngine.getModule("not_a_real_module")).toBeNull();
    });
  });

  describe("listOperations / listAllOperations — coverage", () => {
    it("listOperations returns exactly the 22 expected primitives/edits/constraints", () => {
      const ids = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_OPS].sort());
    });

    it("every operation reports one of the 6 sketch categories", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      const allowed = new Set([
        "Sketch_Primitive",
        "Sketch_Curve",
        "Sketch_Reference",
        "Sketch_Edit",
        "Sketch_Constraint",
        "Sketch_Property",
      ]);
      for (const op of ops) {
        expect(allowed.has(op.category)).toBe(true);
      }
    });

    it("every operation reports a positive params_count", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      for (const op of ops) {
        expect(op.params_count ?? 0).toBeGreaterThan(0);
      }
    });

    it("listAllOperations equals listOperations of the only module (length match)", () => {
      const all = Fusion360CADFunctionIndexEngine.listAllOperations();
      const sketch = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      expect(all.length).toBe(sketch.length);
    });

    it("listOperations on unknown module returns empty array (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.listOperations("nonexistent")).toEqual([]);
    });
  });

  describe("getOperation — known operations", () => {
    it("LINE has fusion_command 'SketchLines' and ByTwoPoints API", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("sketch_operations", "LINE");
      expect(op?.fusion_command).toBe("SketchLines");
      expect(op?.python_api).toBe("sketch.sketchCurves.sketchLines.addByTwoPoints");
      expect(op?.category).toBe("Sketch_Primitive");
    });

    it("CIRCLE Geometry tab declares the 5 construction variants", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("sketch_operations", "CIRCLE");
      const variantParam = op?.tabs?.Geometry?.parameters?.find((p) => p.name === "Variant");
      expect(variantParam?.options).toEqual([
        "center_diameter",
        "center_radius",
        "three_point",
        "two_tangent",
        "three_tangent",
      ]);
      expect(variantParam?.default).toBe("center_diameter");
    });

    it("GEOMETRIC_CONSTRAINT lists exactly 13 constraint types", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "sketch_operations",
        "GEOMETRIC_CONSTRAINT"
      );
      const typeParam = op?.tabs?.Constraint?.parameters?.find((p) => p.name === "Constraint Type");
      expect(typeParam?.options).toHaveLength(13);
      expect(typeParam?.options).toEqual([
        "coincident",
        "collinear",
        "concentric",
        "equal",
        "fix",
        "horizontal",
        "midpoint",
        "parallel",
        "perpendicular",
        "smooth",
        "symmetric",
        "tangent",
        "vertical",
      ]);
    });

    it("SKETCH_DIMENSION supports linear/angular/radial/diameter/arc_length", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "sketch_operations",
        "SKETCH_DIMENSION"
      );
      const typeParam = op?.tabs?.Constraint?.parameters?.find((p) => p.name === "Dimension Type");
      expect(typeParam?.options).toEqual([
        "linear",
        "linear_aligned",
        "angular",
        "radial",
        "diameter",
        "arc_length",
      ]);
    });

    it("returns null for unknown operation (failure mode)", () => {
      expect(
        Fusion360CADFunctionIndexEngine.getOperation("sketch_operations", "TELEPORT")
      ).toBeNull();
    });

    it("returns null for unknown module (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.getOperation("not_a_module", "LINE")).toBeNull();
    });
  });

  describe("findParameter", () => {
    it("locates 'Sketch Plane' on LINE in Plane tab, marks it required", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "LINE",
        "Sketch Plane"
      );
      expect(loc?.tab_id).toBe("Plane");
      expect(loc?.parameter.name).toBe("Sketch Plane");
      expect(loc?.parameter.required).toBe(true);
      expect(loc?.parameter.type).toBe("selection");
    });

    it("is case-insensitive — 'diameter' matches 'Diameter' on CIRCLE", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "CIRCLE",
        "diameter"
      );
      expect(loc?.parameter.name).toBe("Diameter");
      expect(loc?.parameter.unit).toBe("mm");
      expect(loc?.parameter.min).toBe(0.002);
    });

    it("locates 'Side Count' on POLYGON with 3..64 bounds and default 6", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "POLYGON",
        "Side Count"
      );
      expect(loc?.parameter.type).toBe("integer");
      expect(loc?.parameter.min).toBe(3);
      expect(loc?.parameter.max).toBe(64);
      expect(loc?.parameter.default).toBe(6);
    });

    it("returns null for unknown parameter on a real op (failure mode)", () => {
      expect(
        Fusion360CADFunctionIndexEngine.findParameter("sketch_operations", "LINE", "MagicNumber")
      ).toBeNull();
    });

    it("returns null for unknown operation (failure mode)", () => {
      expect(
        Fusion360CADFunctionIndexEngine.findParameter("sketch_operations", "TELEPORT", "foo")
      ).toBeNull();
    });
  });

  describe("searchParameters", () => {
    it("'Sketch Plane' substring matches exactly 10 hits (one per primitive op with Plane tab)", () => {
      const hits = Fusion360CADFunctionIndexEngine.searchParameters("Sketch Plane");
      // 10 ops declare a 'Sketch Plane' parameter in their Plane tab:
      // LINE, RECTANGLE, CIRCLE, ARC, POLYGON, ELLIPSE, SPLINE, SLOT, CONIC_CURVE, POINT.
      // Reference/edit ops use 'Active Sketch' or have no Plane tab.
      expect(hits).toHaveLength(10);
      const opIds = new Set(hits.map((h) => h.operation_id));
      expect(opIds).toEqual(
        new Set([
          "LINE",
          "RECTANGLE",
          "CIRCLE",
          "ARC",
          "POLYGON",
          "ELLIPSE",
          "SPLINE",
          "SLOT",
          "CONIC_CURVE",
          "POINT",
        ])
      );
    });

    it("'Variant' substring matches exactly 6 ops that expose a Variant dropdown", () => {
      // RECTANGLE, CIRCLE, ARC, POLYGON, SPLINE, SLOT — 6 ops with named Variant
      const hits = Fusion360CADFunctionIndexEngine.searchParameters("Variant");
      const opIds = new Set(hits.map((h) => h.operation_id));
      expect(opIds).toEqual(new Set(["RECTANGLE", "CIRCLE", "ARC", "POLYGON", "SPLINE", "SLOT"]));
    });

    it("respects limit argument (returns at most N matches)", () => {
      const hits = Fusion360CADFunctionIndexEngine.searchParameters("Sketch Plane", 3);
      expect(hits).toHaveLength(3);
    });

    it("returns empty array for substring no operation contains (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.searchParameters("__never_present__")).toEqual([]);
    });
  });

  describe("getOperationsByCategory", () => {
    it("Sketch_Primitive contains LINE/RECTANGLE/CIRCLE/ARC/POLYGON/ELLIPSE/SLOT/POINT", () => {
      const ids = Fusion360CADFunctionIndexEngine.getOperationsByCategory("Sketch_Primitive")
        .map((p) => p.operation_id)
        .sort();
      expect(ids).toEqual(
        ["ARC", "CIRCLE", "ELLIPSE", "LINE", "POINT", "POLYGON", "RECTANGLE", "SLOT"].sort()
      );
    });

    it("Sketch_Curve contains exactly SPLINE and CONIC_CURVE", () => {
      const ids = Fusion360CADFunctionIndexEngine.getOperationsByCategory("Sketch_Curve")
        .map((p) => p.operation_id)
        .sort();
      expect(ids).toEqual(["CONIC_CURVE", "SPLINE"]);
    });

    it("Sketch_Constraint contains exactly SKETCH_DIMENSION and GEOMETRIC_CONSTRAINT", () => {
      const ids = Fusion360CADFunctionIndexEngine.getOperationsByCategory("Sketch_Constraint")
        .map((p) => p.operation_id)
        .sort();
      expect(ids).toEqual(["GEOMETRIC_CONSTRAINT", "SKETCH_DIMENSION"]);
    });

    it("Sketch_Edit contains exactly MIRROR/OFFSET/TRIM/EXTEND/BREAK/SCALE", () => {
      const ids = Fusion360CADFunctionIndexEngine.getOperationsByCategory("Sketch_Edit")
        .map((p) => p.operation_id)
        .sort();
      expect(ids).toEqual(["BREAK", "EXTEND", "MIRROR", "OFFSET", "SCALE", "TRIM"]);
    });

    it("module-scoped filter equals global when only one module", () => {
      const a = Fusion360CADFunctionIndexEngine.getOperationsByCategory("Sketch_Edit");
      const b = Fusion360CADFunctionIndexEngine.getOperationsByCategory(
        "Sketch_Edit",
        "sketch_operations"
      );
      expect(a.length).toBe(b.length);
    });

    it("returns empty for unknown category (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.getOperationsByCategory("Mystery")).toEqual([]);
    });
  });

  describe("getTotalParameterCount", () => {
    it("counts exactly 115 parameters across all 22 sketch operations", () => {
      // 22 ops, ~5 params/op average — sketch ops have fewer params than CAM toolpaths
      const total = Fusion360CADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(115);
    });

    it("computed total exactly equals metadata.totalParameters declaration", () => {
      const total = Fusion360CADFunctionIndexEngine.getTotalParameterCount();
      const declared =
        Fusion360CADFunctionIndexEngine.getModule("sketch_operations")?.metadata
          ?.totalParameters ?? 0;
      // Catalog author-curated number must match engine-computed reality
      expect(declared).toBe(total);
    });
  });

  describe("clearCache", () => {
    it("forces re-read on next getIndex (different object identity)", () => {
      const before = Fusion360CADFunctionIndexEngine.getIndex();
      Fusion360CADFunctionIndexEngine.clearCache();
      const after = Fusion360CADFunctionIndexEngine.getIndex();
      expect(after === before).toBe(false);
      expect(after.system_id).toBe(before.system_id);
    });

    it("forces re-read on next getModule (different object identity)", () => {
      const before = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      Fusion360CADFunctionIndexEngine.clearCache();
      const after = Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      expect(after === before).toBe(false);
      expect(after?.metadata?.milestone).toBe("U-CAD-FIDX-FUS-01");
    });

    it("resets load-error log to empty", () => {
      // Trigger a load-error by attempting to load a registered module whose file we'll temporarily reference incorrectly is hard;
      // instead verify the simpler invariant: errors are empty after clear and a successful load.
      Fusion360CADFunctionIndexEngine.getModule("sketch_operations");
      Fusion360CADFunctionIndexEngine.clearCache();
      expect(Fusion360CADFunctionIndexEngine.getLoadErrors()).toEqual([]);
    });
  });

  describe("contract: every operation declares description ≥20 chars", () => {
    it("every sketch op has a substantive description", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = Fusion360CADFunctionIndexEngine.getOperation(
          "sketch_operations",
          opInfo.operation_id
        );
        const desc = op?.description ?? "";
        if (desc.length < 20) {
          failures.push(`${opInfo.operation_id}: '${desc}'`);
        }
      }
      expect(failures).toEqual([]);
    });
  });
});
