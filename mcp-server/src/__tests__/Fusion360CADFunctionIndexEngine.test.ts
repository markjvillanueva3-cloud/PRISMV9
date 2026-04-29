/**
 * Tests for Fusion360CADFunctionIndexEngine
 * @see src/engines/Fusion360CADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-FUS-01
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Fusion360CADFunctionIndexEngine } from "../engines/Fusion360CADFunctionIndexEngine.js";

// Sum parameters for a module across all ops and tabs (used by per-module drift assertion).
function sumParamsForModule(moduleId: string): number {
  const mod = Fusion360CADFunctionIndexEngine.getModule(moduleId);
  if (!mod || !mod.operations) return 0;
  let total = 0;
  for (const op of Object.values(mod.operations)) {
    for (const tab of Object.values(op.tabs ?? {})) {
      total += (tab.parameters ?? tab.params ?? []).length;
    }
  }
  return total;
}

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

    it("modules array contains exactly three modules (sketch_operations, feature_operations, modify_operations)", () => {
      const ids = Fusion360CADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual(["sketch_operations", "feature_operations", "modify_operations"]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = Fusion360CADFunctionIndexEngine.getIndex();
      const b = Fusion360CADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap", () => {
    it("declares exactly 3 remaining deferred modules with non-empty scopes (feature_operations + modify_operations now shipped)", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      expect(fm.length).toBe(3);
      for (const f of fm) {
        expect(f.scope.length).toBeGreaterThan(20);
        expect(f.estimated_params).toBeGreaterThan(0);
        expect(f.deferred_to).toMatch(/^U-CAD-FIDX-FUS-\d+$/);
      }
    });

    it("planned_ids cover surface/mesh/assembly (feature + modify now shipped)", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      const ids = fm.map((f) => f.planned_id).sort();
      expect(ids).toEqual([
        "assembly_operations",
        "mesh_operations",
        "surface_operations",
      ]);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns exactly ['sketch_operations', 'feature_operations', 'modify_operations']", () => {
      expect(Fusion360CADFunctionIndexEngine.listModules()).toEqual([
        "sketch_operations",
        "feature_operations",
        "modify_operations",
      ]);
    });

    it("getModuleEntry('sketch_operations') has the U-CAD-FIDX-FUS-01 tag", () => {
      const entry = Fusion360CADFunctionIndexEngine.getModuleEntry("sketch_operations");
      expect(entry?.module_id).toBe("sketch_operations");
      expect(entry?.path).toBe("cad-functions/fusion360/sketch-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-FUS-01"]);
      expect(entry?.parameter_count_estimate).toBe(115);
    });

    it("getModuleEntry('feature_operations') has the U-CAD-FIDX-FUS-02 tag and depends on sketch_operations", () => {
      const entry = Fusion360CADFunctionIndexEngine.getModuleEntry("feature_operations");
      expect(entry?.module_id).toBe("feature_operations");
      expect(entry?.path).toBe("cad-functions/fusion360/feature-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-FUS-02"]);
      expect(entry?.parameter_count_estimate).toBe(206);
      expect(entry?.dependencies).toEqual(["sketch_operations"]);
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

    it("listAllOperations equals sum of listOperations across all three modules (22 sketch + 18 feature + 9 modify = 49)", () => {
      const all = Fusion360CADFunctionIndexEngine.listAllOperations();
      const sketch = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      const feature = Fusion360CADFunctionIndexEngine.listOperations("feature_operations");
      const modify = Fusion360CADFunctionIndexEngine.listOperations("modify_operations");
      expect(sketch.length).toBe(22);
      expect(feature.length).toBe(18);
      expect(modify.length).toBe(9);
      expect(all.length).toBe(sketch.length + feature.length + modify.length);
      expect(all.length).toBe(49);
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
    it("counts exactly 422 parameters across all 49 operations (115 sketch + 206 feature + 101 modify)", () => {
      const total = Fusion360CADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(422);
    });

    it("each module's per-engine computed total exactly equals its metadata.totalParameters declaration", () => {
      // Compute per-module totals by listing operations and summing per-tab params manually,
      // then compare to each catalog's metadata.totalParameters. Catches catalog drift.
      const sketchTotal = sumParamsForModule("sketch_operations");
      const sketchDeclared = (Fusion360CADFunctionIndexEngine.getModule("sketch_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(sketchTotal).toBe(115);
      expect(sketchDeclared).toBe(115);

      const featureTotal = sumParamsForModule("feature_operations");
      const featureDeclared = (Fusion360CADFunctionIndexEngine.getModule("feature_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(featureTotal).toBe(206);
      expect(featureDeclared).toBe(206);

      const modifyTotal = sumParamsForModule("modify_operations");
      const modifyDeclared = (Fusion360CADFunctionIndexEngine.getModule("modify_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(modifyTotal).toBe(101);
      expect(modifyDeclared).toBe(101);

      // Aggregate engine method must equal sum of per-module computed totals
      expect(Fusion360CADFunctionIndexEngine.getTotalParameterCount()).toBe(sketchTotal + featureTotal + modifyTotal);
    });
  });

  describe("feature_operations module (U-CAD-FIDX-FUS-02)", () => {
    const FEATURE_OPS = [
      "EXTRUDE", "REVOLVE", "SWEEP", "LOFT",
      "RIB", "WEB",
      "HOLE", "THREAD",
      "SHELL", "DRAFT",
      "PATTERN_LINEAR", "PATTERN_CIRCULAR", "PATTERN_ON_PATH", "PATTERN_ON_SKETCH",
      "MIRROR",
      "COMBINE", "SPLIT_BODY", "BOUNDARY_FILL",
    ];

    it("listOperations('feature_operations') returns exactly the 18 feature ops", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("feature_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(18);
      expect(ops.sort()).toEqual([...FEATURE_OPS].sort());
    });

    it("HOLE op enumerates all 5 head variants in Hole Type dropdown", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("feature_operations", "HOLE");
      const holeTypeParam = op?.tabs?.["Profile"]?.parameters?.find((p) => p.name === "Hole Type");
      expect(holeTypeParam?.options).toEqual([
        "simple", "counterbore", "countersink", "cbore_csink", "csink_cbore",
      ]);
    });

    it("THREAD op enumerates the 8 supported standards", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("feature_operations", "THREAD");
      const standardParam = op?.tabs?.["Direction"]?.parameters?.find((p) => p.name === "Standard");
      expect(standardParam?.options).toEqual([
        "ANSI_unified_inch", "ANSI_metric", "ISO_metric", "ISO_inch",
        "ANSI_pipe_NPT", "ISO_pipe_BSPP", "ACME", "trapezoidal",
      ]);
    });

    it("LOFT requires 2+ profiles (validation hint via min on Profiles param)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("feature_operations", "LOFT");
      const profiles = op?.tabs?.["Profile"]?.parameters?.find((p) => p.name === "Profiles");
      expect(profiles?.required).toBe(true);
      // min:2 expressed as a numeric on the param schema — verifies the constraint is captured
      expect((profiles as { min?: number })?.min).toBe(2);
    });

    it("EXTRUDE Boolean operation includes all 5 modes", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("feature_operations", "EXTRUDE");
      const opParam = op?.tabs?.["Operation"]?.parameters?.find((p) => p.name === "Operation");
      expect(opParam?.options).toEqual(["new_body", "new_component", "join", "cut", "intersect"]);
    });

    it("getOperationsByCategory enumerates exactly the 4 sweep categories", () => {
      const sweeps = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Solid_Sweep", "feature_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(sweeps).toEqual(["EXTRUDE", "LOFT", "REVOLVE", "SWEEP"]);
    });

    it("getOperationsByCategory enumerates exactly the 4 pattern categories", () => {
      const patterns = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Pattern", "feature_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(patterns).toEqual([
        "MIRROR", "PATTERN_CIRCULAR", "PATTERN_LINEAR", "PATTERN_ON_PATH", "PATTERN_ON_SKETCH",
      ].sort());
    });

    it("findParameter locates HOLE.Drill Tip Angle with correct unit, default, and bounds", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "feature_operations",
        "HOLE",
        "Drill Tip Angle",
      );
      expect(loc?.tab_id).toBe("Direction");
      expect(loc?.parameter.unit).toBe("deg");
      expect(loc?.parameter.default).toBe(118);
      expect((loc?.parameter as { min?: number }).min).toBe(90);
      expect((loc?.parameter as { max?: number }).max).toBe(180);
    });

    it("searchParameters('Taper Angle') finds it in exactly EXTRUDE, RIB, SWEEP, WEB (DRAFT uses 'Draft Angle' instead)", () => {
      const matches = Fusion360CADFunctionIndexEngine.searchParameters("Taper Angle");
      const opsWithTaper = matches
        .filter((m) => m.module_id === "feature_operations")
        .map((m) => m.operation_id)
        .sort();
      expect(opsWithTaper).toEqual(["EXTRUDE", "RIB", "SWEEP", "WEB"]);
    });
  });

  describe("modify_operations module (U-CAD-FIDX-FUS-03)", () => {
    const MODIFY_OPS = [
      "FILLET", "CHAMFER", "PRESS_PULL",
      "MOVE", "SCALE",
      "PLANE", "AXIS", "POINT",
      "SECTION_ANALYSIS",
    ];

    it("listOperations('modify_operations') returns exactly the 9 modify ops", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("modify_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(9);
      expect(ops.sort()).toEqual([...MODIFY_OPS].sort());
    });

    it("FILLET enumerates all 4 geometric construction methods", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "FILLET");
      const filletType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Fillet Type");
      expect(filletType?.options).toEqual(["constant_radius", "variable_radius", "full_round", "chord_length"]);
    });

    it("CHAMFER enumerates the 3 input modes (equal/two_distance/distance_angle)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "CHAMFER");
      const chamferType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Chamfer Type");
      expect(chamferType?.options).toEqual(["equal_distance", "two_distance", "distance_angle"]);
    });

    it("MOVE enumerates all 5 transform types (free/translate/rotate/point_to_point/align)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "MOVE");
      const moveType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Move Type");
      expect(moveType?.options).toEqual(["free", "translate", "rotate", "point_to_point", "align"]);
    });

    it("PLANE enumerates all 7 construction methods", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "PLANE");
      const method = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Construction Method");
      expect(method?.options).toEqual([
        "offset_from_plane",
        "three_points",
        "tangent_to_face",
        "midplane_between",
        "normal_to_curve",
        "two_parallel_edges",
        "angle_through_edge",
      ]);
    });

    it("AXIS enumerates all 5 construction methods", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "AXIS");
      const method = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Construction Method");
      expect(method?.options).toEqual([
        "through_cylinder",
        "through_edge",
        "through_two_planes",
        "through_two_points",
        "normal_to_face_at_point",
      ]);
    });

    it("POINT enumerates all 8 construction methods", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "POINT");
      const method = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Construction Method");
      expect(method?.options).toHaveLength(8);
      expect(method?.options).toContain("at_vertex");
      expect(method?.options).toContain("two_edges_intersection");
      expect(method?.options).toContain("three_planes");
      expect(method?.options).toContain("midpoint_of_edge");
    });

    it("getOperationsByCategory enumerates exactly 3 Construction ops (Plane/Axis/Point)", () => {
      const construction = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Construction", "modify_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(construction).toEqual(["AXIS", "PLANE", "POINT"]);
    });

    it("findParameter locates FILLET.Radius with correct unit, default, and lower bound", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter("modify_operations", "FILLET", "Radius");
      expect(loc?.tab_id).toBe("Configuration");
      expect(loc?.parameter.unit).toBe("mm");
      expect(loc?.parameter.default).toBe(1.0);
      expect((loc?.parameter as { min?: number }).min).toBe(0.001);
    });

    it("SECTION_ANALYSIS Multi-Section Additional Planes caps at 5 (Fusion's 6-section limit minus primary)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "SECTION_ANALYSIS");
      const additional = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Additional Planes");
      expect((additional as { max?: number })?.max).toBe(5);
    });

    it("getOperation returns null for an op that doesn't exist in modify_operations (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.getOperation("modify_operations", "NONEXISTENT_OP")).toBeNull();
    });

    it("findParameter returns null when the parameter doesn't exist on FILLET (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.findParameter("modify_operations", "FILLET", "Bogus Param")).toBeNull();
    });

    it("findParameter returns null when the operation is wrong but parameter exists elsewhere (failure mode)", () => {
      // 'Radius' exists on FILLET but not on CHAMFER — must not cross-pollinate
      expect(Fusion360CADFunctionIndexEngine.findParameter("modify_operations", "CHAMFER", "Radius")).toBeNull();
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
