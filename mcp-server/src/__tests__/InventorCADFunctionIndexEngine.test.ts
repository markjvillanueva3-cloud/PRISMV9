/**
 * Tests for InventorCADFunctionIndexEngine — Autodesk Inventor CAD Function Index.
 *
 * Foundation suite for U-CAD-FIDX-INV-01 (sketch_operations module).
 *
 * Pattern mirrors HyperCADCADFunctionIndexEngine.test.ts: KNOWN_OPS list,
 * drift guard (per-module sum vs declared metadata.totalParameters), index
 * shape, parameter lookups, and future_modules registration discipline.
 *
 * @see src/engines/InventorCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-INV-01 (sketch_operations) — current
 * @see U-CAD-FIDX-INV-02..08 — future_modules (part / surface / sheet_metal / frame_generator / weldment / drawing / assembly)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InventorCADFunctionIndexEngine } from "../engines/InventorCADFunctionIndexEngine.js";

const KNOWN_SKETCH_OPS = [
  // 9 primitive families
  "LINE", "RECTANGLE", "CIRCLE", "ARC", "ELLIPSE", "POLYGON", "SPLINE", "SLOT", "POINT",
  // 8 editing tools
  "TRIM", "EXTEND", "BREAK", "OFFSET", "MIRROR", "MOVE", "ROTATE", "SCALE",
  // 3 reference projections
  "PROJECT_GEOMETRY", "PROJECT_TO_SURFACE", "INTERSECT_CURVE",
  // 2 constraint families
  "GEOMETRIC_CONSTRAINT", "DIMENSION_CONSTRAINT",
  // sketch fillet/chamfer
  "FILLET_SKETCH", "CHAMFER_SKETCH",
  // sketch patterns
  "PATTERN_RECTANGULAR", "PATTERN_CIRCULAR",
  // construction toggle + text
  "CONSTRUCTION_TOGGLE", "TEXT_SKETCH",
];

const PLANNED_FUTURE_MODULES = [
  "part_operations",
  "surface_operations",
  "sheet_metal_operations",
  "frame_generator_operations",
  "weldment_operations",
  "drawing_operations",
  "assembly_operations",
];

describe("InventorCADFunctionIndexEngine — index navigation", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getIndex returns Autodesk Inventor metadata", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.system_id).toBe("inventor");
    expect(idx.module_id).toBe("cad_function_index");
    expect(idx.module_name).toBe("Autodesk Inventor CAD Unified Function Index");
    expect(idx.schema_version).toBe("1.0.0");
    expect(idx.modules.length).toBe(1);
  });

  it("listModules surfaces sketch_operations as the foundation module", () => {
    expect(InventorCADFunctionIndexEngine.listModules()).toEqual(["sketch_operations"]);
  });

  it("getModuleEntry returns the registered sketch_operations entry", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("sketch_operations");
    expect(entry?.module_id).toBe("sketch_operations");
    expect(entry?.path).toBe("cad-functions/inventor/sketch-operations.json");
    expect(entry?.covered_units).toEqual(["U-CAD-FIDX-INV-01"]);
    expect(entry?.parameter_count_estimate).toBe(138);
  });

  it("getModuleEntry returns null for unknown module", () => {
    expect(InventorCADFunctionIndexEngine.getModuleEntry("does_not_exist")).toBeNull();
  });

  it("future_modules registers exactly the planned 7 follow-ups", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    const planned = (idx.future_modules ?? []).map((f) => f.planned_id);
    expect(planned.sort()).toEqual([...PLANNED_FUTURE_MODULES].sort());
  });

  it("each future_modules entry has scope, params, and a valid INV unit id", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    const futureModules = idx.future_modules ?? [];
    expect(futureModules.length).toBe(7);
    for (const fm of futureModules) {
      expect(fm.scope.length).toBeGreaterThan(20);
      expect(fm.estimated_params).toBeGreaterThan(0);
      expect(fm.deferred_to).toMatch(/^U-CAD-FIDX-INV-0[2-8]$/);
    }
  });

  it("global_cross_references names InventorCADFunctionIndexEngine in engines_linked", () => {
    const refs = InventorCADFunctionIndexEngine.getIndex().global_cross_references;
    expect(refs.engines_linked).toContain("InventorCADFunctionIndexEngine");
    expect(refs.dispatchers_touched).toContain("prism_cad");
  });
});

describe("InventorCADFunctionIndexEngine — sketch_operations module", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 28 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-01");
    expect(mod?.metadata?.operationCount).toBe(28);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(28);
  });

  it("listOperations returns exactly KNOWN_SKETCH_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sketch_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_SKETCH_OPS].sort());
  });

  it("listOperations returns empty array for unknown module", () => {
    expect(InventorCADFunctionIndexEngine.listOperations("does_not_exist")).toEqual([]);
  });

  it("each operation carries a Sketch_-prefixed category and non-zero param count", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sketch_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Sketch_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(2);
    }
  });

  it("getOperation('LINE') exposes Inventor SketchLines.AddByTwoPoints binding", () => {
    const line = InventorCADFunctionIndexEngine.getOperation("sketch_operations", "LINE");
    expect(line?.category).toBe("Sketch_Primitive_Line");
    expect(line?.python_api).toBe("Sketch.SketchLines.AddByTwoPoints(StartPoint, EndPoint)");
    expect(Object.keys(line?.tabs ?? {})).toEqual(["Plane", "Geometry", "Properties"]);
  });

  it("getOperation('RECTANGLE') has 4-mode dropdown", () => {
    const rect = InventorCADFunctionIndexEngine.getOperation("sketch_operations", "RECTANGLE");
    const modeParam = rect?.tabs?.Geometry?.parameters?.find((p) => p.name === "Mode");
    expect(modeParam?.options).toEqual([
      "two_point",
      "three_point",
      "two_point_centered",
      "three_point_centered",
    ]);
  });

  it("getOperation('GEOMETRIC_CONSTRAINT') registers all 13 constraint types", () => {
    const gc = InventorCADFunctionIndexEngine.getOperation(
      "sketch_operations",
      "GEOMETRIC_CONSTRAINT",
    );
    const typeParam = gc?.tabs?.Geometry?.parameters?.find((p) => p.name === "Constraint Type");
    expect(typeParam?.options?.length).toBe(13);
    expect(typeParam?.options).toContain("coincident");
    expect(typeParam?.options).toContain("tangent");
    expect(typeParam?.options).toContain("symmetric");
  });

  it("getOperation returns null for unknown op or module", () => {
    expect(
      InventorCADFunctionIndexEngine.getOperation("sketch_operations", "FAKE_OP"),
    ).toBeNull();
    expect(
      InventorCADFunctionIndexEngine.getOperation("does_not_exist", "LINE"),
    ).toBeNull();
  });
});

describe("InventorCADFunctionIndexEngine — parameter discovery", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("findParameter locates Length on LINE in the Geometry tab", () => {
    const loc = InventorCADFunctionIndexEngine.findParameter(
      "sketch_operations",
      "LINE",
      "Length",
    );
    expect(loc?.module_id).toBe("sketch_operations");
    expect(loc?.operation_id).toBe("LINE");
    expect(loc?.tab_id).toBe("Geometry");
    expect(loc?.parameter.name).toBe("Length");
    expect(loc?.parameter.unit).toBe("mm");
    expect(loc?.parameter.type).toBe("numeric");
  });

  it("findParameter is case-insensitive", () => {
    const loc = InventorCADFunctionIndexEngine.findParameter(
      "sketch_operations",
      "LINE",
      "lEnGtH",
    );
    expect(loc?.parameter.name).toBe("Length");
  });

  it("findParameter returns null when parameter is absent", () => {
    expect(
      InventorCADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "LINE",
        "NotARealParam",
      ),
    ).toBeNull();
  });

  it("findParameter returns null when operation is absent", () => {
    expect(
      InventorCADFunctionIndexEngine.findParameter("sketch_operations", "GHOST", "Length"),
    ).toBeNull();
  });

  it("searchParameters('radius') matches every Radius / Minor Radius / Circumradius hit", () => {
    const matches = InventorCADFunctionIndexEngine.searchParameters("radius");
    expect(matches.length).toBeGreaterThanOrEqual(3);
    for (const m of matches) {
      expect.soft(m.parameter.name.toLowerCase()).toContain("radius");
    }
    const opIds = new Set(matches.map((m) => m.operation_id));
    expect(opIds.has("CIRCLE")).toBe(true);
    expect(opIds.has("ELLIPSE")).toBe(true);
  });

  it("searchParameters honors limit", () => {
    const matches = InventorCADFunctionIndexEngine.searchParameters("point", 3);
    expect(matches.length).toBe(3);
  });

  it("searchParameters returns empty for no matches", () => {
    expect(InventorCADFunctionIndexEngine.searchParameters("zzzzz_nope")).toEqual([]);
  });
});

describe("InventorCADFunctionIndexEngine — taxonomy queries", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getOperationsByCategory('Sketch_Primitive_Line') returns LINE only", () => {
    const lines = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Sketch_Primitive_Line",
    );
    expect(lines.length).toBe(1);
    expect(lines[0]?.operation_id).toBe("LINE");
  });

  it("getOperationsByCategory restricts when moduleId provided", () => {
    const ops = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Sketch_Edit_Trim",
      "sketch_operations",
    );
    expect(ops.length).toBe(1);
    expect(ops[0]?.operation_id).toBe("TRIM");
  });

  it("getOperationsByCategory returns empty for unknown category", () => {
    expect(
      InventorCADFunctionIndexEngine.getOperationsByCategory("Not_A_Category"),
    ).toEqual([]);
  });

  it("listAllOperations returns 28 sketch operations", () => {
    expect(InventorCADFunctionIndexEngine.listAllOperations().length).toBe(28);
  });
});

describe("InventorCADFunctionIndexEngine — drift guards", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getTotalParameterCount equals 138 (the live tab-sum across the catalog)", () => {
    expect(InventorCADFunctionIndexEngine.getTotalParameterCount()).toBe(138);
  });

  it("module declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(138);
    expect(mod?.metadata?.totalParameters).toBe(138);
  });

  it("each per-op declared parameterCount matches actual tab-sum (per-op drift)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    for (const [opId, op] of Object.entries(mod?.operations ?? {})) {
      const declared = op.parameterCount;
      let actual = 0;
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
      expect.soft(actual, `op ${opId} drift`).toBe(declared);
    }
  });

  it("index estimated_parameter_total matches engine getTotalParameterCount", () => {
    const declared =
      InventorCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total;
    expect(InventorCADFunctionIndexEngine.getTotalParameterCount()).toBe(declared);
  });

  it("index module count matches loaded modules length", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.coverage_summary.total_modules).toBe(idx.modules.length);
    expect(idx.coverage_summary.total_units_covered).toEqual(["U-CAD-FIDX-INV-01"]);
  });

  it("getLoadErrors is empty when catalog is healthy", () => {
    InventorCADFunctionIndexEngine.getTotalParameterCount(); // forces all loads
    expect(InventorCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
  });

  it("operationCount declared in metadata equals 28", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    expect(Object.keys(mod?.operations ?? {}).length).toBe(28);
    expect(mod?.metadata?.operationCount).toBe(28);
  });
});

describe("InventorCADFunctionIndexEngine — cache discipline", () => {
  it("clearCache resets indexCache + moduleCache + loadErrors", () => {
    InventorCADFunctionIndexEngine.getIndex();
    InventorCADFunctionIndexEngine.getModule("sketch_operations");
    InventorCADFunctionIndexEngine.clearCache();
    // After clear, calling again should re-populate without throwing
    expect(() => InventorCADFunctionIndexEngine.getIndex()).not.toThrow();
    expect(() => InventorCADFunctionIndexEngine.getModule("sketch_operations")).not.toThrow();
    expect(InventorCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
  });

  it("repeated getIndex returns cached reference (no I/O on second call)", () => {
    InventorCADFunctionIndexEngine.clearCache();
    const a = InventorCADFunctionIndexEngine.getIndex();
    const b = InventorCADFunctionIndexEngine.getIndex();
    expect(a).toBe(b);
  });
});
