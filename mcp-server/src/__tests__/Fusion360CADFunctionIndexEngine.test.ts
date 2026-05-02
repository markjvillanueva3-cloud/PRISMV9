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

    it("modules array contains all eight Fusion modules in shipping order (Fusion CAD COMPLETE 8/8 — Inventor parity)", () => {
      const ids = Fusion360CADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual([
        "sketch_operations",
        "feature_operations",
        "modify_operations",
        "surface_operations",
        "mesh_operations",
        "assembly_operations",
        "sheet_metal_operations",
        "drawing_operations",
      ]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = Fusion360CADFunctionIndexEngine.getIndex();
      const b = Fusion360CADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap", () => {
    it("declares zero remaining deferred modules — Fusion catalog is FULLY COMPLETE", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      expect(fm.length).toBe(0);
    });

    it("future_modules array is empty (all 6 Fusion modules shipped)", () => {
      const fm = Fusion360CADFunctionIndexEngine.getIndex().future_modules ?? [];
      const ids = fm.map((f) => f.planned_id).sort();
      expect(ids).toEqual([]);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns all 8 shipped modules in order (Fusion CAD COMPLETE 8/8 — Inventor parity)", () => {
      expect(Fusion360CADFunctionIndexEngine.listModules()).toEqual([
        "sketch_operations",
        "feature_operations",
        "modify_operations",
        "surface_operations",
        "mesh_operations",
        "assembly_operations",
        "sheet_metal_operations",
        "drawing_operations",
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

    it("listAllOperations equals sum across all 8 modules (22+18+9+8+7+10+13+18 = 105)", () => {
      const all = Fusion360CADFunctionIndexEngine.listAllOperations();
      const sketch = Fusion360CADFunctionIndexEngine.listOperations("sketch_operations");
      const feature = Fusion360CADFunctionIndexEngine.listOperations("feature_operations");
      const modify = Fusion360CADFunctionIndexEngine.listOperations("modify_operations");
      const surface = Fusion360CADFunctionIndexEngine.listOperations("surface_operations");
      const mesh = Fusion360CADFunctionIndexEngine.listOperations("mesh_operations");
      const assembly = Fusion360CADFunctionIndexEngine.listOperations("assembly_operations");
      const sheetMetal = Fusion360CADFunctionIndexEngine.listOperations("sheet_metal_operations");
      const drawing = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations");
      expect(sketch.length).toBe(22);
      expect(feature.length).toBe(18);
      expect(modify.length).toBe(9);
      expect(surface.length).toBe(8);
      expect(mesh.length).toBe(7);
      expect(assembly.length).toBe(10);
      expect(sheetMetal.length).toBe(13);
      expect(drawing.length).toBe(18);
      expect(all.length).toBe(
        sketch.length +
          feature.length +
          modify.length +
          surface.length +
          mesh.length +
          assembly.length +
          sheetMetal.length +
          drawing.length,
      );
      expect(all.length).toBe(105);
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
    it("counts exactly 950 parameters across all 105 operations (115+206+101+74+66+112+121+155)", () => {
      const total = Fusion360CADFunctionIndexEngine.getTotalParameterCount();
      expect(total).toBe(950);
    });

    it("each module's per-engine computed total exactly equals its metadata.totalParameters declaration", () => {
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

      const surfaceTotal = sumParamsForModule("surface_operations");
      const surfaceDeclared = (Fusion360CADFunctionIndexEngine.getModule("surface_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(surfaceTotal).toBe(74);
      expect(surfaceDeclared).toBe(74);

      const meshTotal = sumParamsForModule("mesh_operations");
      const meshDeclared = (Fusion360CADFunctionIndexEngine.getModule("mesh_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(meshTotal).toBe(66);
      expect(meshDeclared).toBe(66);

      const assemblyTotal = sumParamsForModule("assembly_operations");
      const assemblyDeclared = (Fusion360CADFunctionIndexEngine.getModule("assembly_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(assemblyTotal).toBe(112);
      expect(assemblyDeclared).toBe(112);

      const sheetMetalTotal = sumParamsForModule("sheet_metal_operations");
      const sheetMetalDeclared = (Fusion360CADFunctionIndexEngine.getModule("sheet_metal_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(sheetMetalTotal).toBe(121);
      expect(sheetMetalDeclared).toBe(121);

      const drawingTotal = sumParamsForModule("drawing_operations");
      const drawingDeclared = (Fusion360CADFunctionIndexEngine.getModule("drawing_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(drawingTotal).toBe(155);
      expect(drawingDeclared).toBe(155);

      // Aggregate engine method must equal sum of per-module computed totals
      expect(Fusion360CADFunctionIndexEngine.getTotalParameterCount()).toBe(
        sketchTotal +
          featureTotal +
          modifyTotal +
          surfaceTotal +
          meshTotal +
          assemblyTotal +
          sheetMetalTotal +
          drawingTotal,
      );
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

  describe("surface_operations module (U-CAD-FIDX-FUS-04)", () => {
    const SURFACE_OPS = [
      "PATCH", "STITCH", "UNSTITCH",
      "TRIM_SURFACE", "EXTEND_SURFACE", "REVERSE_NORMAL",
      "OFFSET_SURFACE", "THICKEN",
    ];

    it("listOperations('surface_operations') returns exactly the 8 surface ops", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("surface_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(8);
      expect(ops.sort()).toEqual([...SURFACE_OPS].sort());
    });

    it("PATCH enumerates 3 boundary continuity types (free / G1 tangent / G2 curvature)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "PATCH");
      const continuity = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Default Continuity");
      expect(continuity?.options).toEqual(["free", "tangent_G1", "curvature_G2"]);
    });

    it("EXTEND_SURFACE enumerates 4 extension types and 3 resulting-continuity grades", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "EXTEND_SURFACE");
      const extType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Extension Type");
      expect(extType?.options).toEqual(["natural", "tangent", "linear", "to_object"]);
      const continuity = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Resulting Continuity");
      expect(continuity?.options).toEqual(["G0_position", "G1_tangent", "G2_curvature"]);
    });

    it("THICKEN enumerates the 3 direction modes (side_1 / side_2 / symmetric)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "THICKEN");
      const direction = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Direction");
      expect(direction?.options).toEqual(["side_1", "side_2", "symmetric"]);
    });

    it("STITCH enforces minimum 2 surfaces (single-surface stitch is a no-op)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "STITCH");
      const surfaces = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Surfaces");
      expect(surfaces?.required).toBe(true);
      expect((surfaces as { min?: number })?.min).toBe(2);
    });

    it("STITCH default tolerance matches Fusion's import default (0.01 mm)", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter("surface_operations", "STITCH", "Tolerance");
      expect(loc?.parameter.unit).toBe("mm");
      expect(loc?.parameter.default).toBe(0.01);
      expect((loc?.parameter as { min?: number }).min).toBe(0.0001);
    });

    it("getOperationsByCategory enumerates exactly 2 Surface_Combine ops (Stitch + Unstitch)", () => {
      const combine = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Surface_Combine", "surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(combine).toEqual(["STITCH", "UNSTITCH"]);
    });

    it("getOperationsByCategory enumerates exactly 5 Surface_Modify ops", () => {
      const modify = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Surface_Modify", "surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(modify).toEqual([
        "EXTEND_SURFACE", "OFFSET_SURFACE", "REVERSE_NORMAL", "THICKEN", "TRIM_SURFACE",
      ]);
    });

    it("BOUNDARY_FILL is NOT in surface_operations (it lives in feature_operations) — failure mode", () => {
      // Catches accidental duplication if a future contributor moves it
      expect(Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "BOUNDARY_FILL")).toBeNull();
      expect(Fusion360CADFunctionIndexEngine.getOperation("feature_operations", "BOUNDARY_FILL")).not.toBeNull();
    });

    it("findParameter returns null for a surface op that doesn't exist (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.findParameter("surface_operations", "NONEXISTENT", "Tolerance")).toBeNull();
    });

    it("THICKEN supports per-face thickness overrides for variable-thickness shells", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("surface_operations", "THICKEN");
      const overrides = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Per-Face Thickness Overrides");
      expect(overrides?.type).toBe("selection_pairs");
    });
  });

  describe("mesh_operations module (U-CAD-FIDX-FUS-05)", () => {
    const MESH_OPS = [
      "INSERT_MESH", "CONVERT_TO_BREP",
      "REDUCE", "SMOOTH", "REPAIR",
      "PLANE_CUT", "ERASE_AND_FILL",
    ];

    it("listOperations('mesh_operations') returns exactly the 7 mesh ops", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("mesh_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(7);
      expect(ops.sort()).toEqual([...MESH_OPS].sort());
    });

    it("INSERT_MESH supports OBJ/STL/3MF formats with auto-detection", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "INSERT_MESH");
      const fileFormat = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "File Format");
      expect(fileFormat?.options).toEqual(["auto", "obj", "stl", "3mf"]);
      expect(fileFormat?.default).toBe("auto");
    });

    it("INSERT_MESH supports both Y-up and Z-up source axis remapping", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "INSERT_MESH");
      const upAxis = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Up Axis");
      expect(upAxis?.options).toEqual(["Y_up", "Z_up"]);
    });

    it("REDUCE enumerates 3 target modes (count / percentage / deviation)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "REDUCE");
      const targetMode = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Target Mode");
      expect(targetMode?.options).toEqual(["triangle_count", "percentage", "deviation"]);
    });

    it("SMOOTH defaults to Taubin algorithm with canonical λ=0.5 / μ=0.55 from Taubin SIGGRAPH 1995", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "SMOOTH");
      const algo = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Algorithm");
      expect(algo?.options).toEqual(["laplacian", "taubin"]);
      expect(algo?.default).toBe("taubin");

      const lambda = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Smoothness Factor");
      expect(lambda?.default).toBe(0.5);
      const mu = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Shrinkage Factor");
      expect(mu?.default).toBe(0.55);
    });

    it("REPAIR exposes all 6 healing toggles (holes, non-manifold, self-intersect, duplicates, flip, small components)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "REPAIR");
      const cfg = op?.tabs?.["Configuration"]?.parameters ?? [];
      const toggles = cfg.filter((p) => p.type === "checkbox").map((p) => p.name);
      expect(toggles).toContain("Fill Holes");
      expect(toggles).toContain("Fix Non-Manifold Edges");
      expect(toggles).toContain("Resolve Self-Intersections");
      expect(toggles).toContain("Merge Duplicate Vertices");
      expect(toggles).toContain("Flip Inverted Normals");
      expect(toggles).toContain("Delete Small Components");
    });

    it("PLANE_CUT enumerates 3 cut directions (keep_positive / keep_negative / split)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "PLANE_CUT");
      const cutDir = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Cut Direction");
      expect(cutDir?.options).toEqual(["keep_positive", "keep_negative", "split"]);
    });

    it("ERASE_AND_FILL enumerates 3 fill methods (flat / tangent / smooth_curvature)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "ERASE_AND_FILL");
      const fillMethod = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Fill Method");
      expect(fillMethod?.options).toEqual(["flat", "tangent", "smooth_curvature"]);
    });

    it("CONVERT_TO_BREP defaults to stitched_planar to avoid one-face-per-triangle blowup", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "CONVERT_TO_BREP");
      const outType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Output Type");
      expect(outType?.options).toEqual(["faceted", "stitched_planar"]);
      expect(outType?.default).toBe("stitched_planar");
    });

    it("getOperationsByCategory enumerates exactly 3 Mesh_Modify ops (Smooth, Repair, Erase and Fill)", () => {
      const modify = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Mesh_Modify", "mesh_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(modify).toEqual(["ERASE_AND_FILL", "REPAIR", "SMOOTH"]);
    });

    it("findParameter returns null for an op that doesn't exist in mesh_operations (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.findParameter("mesh_operations", "FAKE_OP", "Algorithm")).toBeNull();
    });

    it("findParameter returns null for SMOOTH but a parameter that exists only on REDUCE (failure mode)", () => {
      // 'Sharp Edge Angle' is on REDUCE only — must not pollute SMOOTH
      expect(Fusion360CADFunctionIndexEngine.findParameter("mesh_operations", "SMOOTH", "Sharp Edge Angle")).toBeNull();
    });

    it("INSERT_MESH preserves backward compatibility — required 'File Path' must remain required (failure mode)", () => {
      // Catches accidental schema break that would silently fail mesh imports
      const op = Fusion360CADFunctionIndexEngine.getOperation("mesh_operations", "INSERT_MESH");
      const filePath = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "File Path");
      expect(filePath?.required).toBe(true);
      expect(filePath?.type).toBe("string");
    });
  });

  describe("assembly_operations module (U-CAD-FIDX-FUS-06)", () => {
    const ASSEMBLY_OPS = [
      "JOINT", "AS_BUILT_JOINT", "RIGID_GROUP",
      "COMPONENT_FROM_BODIES", "COMPONENT_INSERT", "COMPONENT_GROUND",
      "MOTION_LINK", "DRIVE_JOINTS", "MOTION_STUDY", "ENABLE_CONTACT_SET",
    ];

    it("listOperations('assembly_operations') returns exactly the 10 assembly ops", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("assembly_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(10);
      expect(ops.sort()).toEqual([...ASSEMBLY_OPS].sort());
    });

    it("JOINT enumerates all 7 motion types (rigid/revolute/slider/cylindrical/pin_slot/planar/ball)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "JOINT");
      const motionType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Motion Type");
      expect(motionType?.options).toEqual([
        "rigid", "revolute", "slider", "cylindrical", "pin_slot", "planar", "ball",
      ]);
    });

    it("AS_BUILT_JOINT enumerates the same 7 motion types as JOINT", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "AS_BUILT_JOINT");
      const motionType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Motion Type");
      expect(motionType?.options).toEqual([
        "rigid", "revolute", "slider", "cylindrical", "pin_slot", "planar", "ball",
      ]);
    });

    it("RIGID_GROUP enforces minimum 2 components (single-component group is meaningless)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "RIGID_GROUP");
      const components = op?.tabs?.["Selection"]?.parameters?.find((p) => p.name === "Components");
      expect(components?.required).toBe(true);
      expect((components as { min?: number })?.min).toBe(2);
    });

    it("MOTION_LINK enumerates 4 ratio types (gear / linear / rack-pinion / leadscrew)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "MOTION_LINK");
      const ratioType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Ratio Type");
      expect(ratioType?.options).toEqual(["gear_ratio", "linear_ratio", "rack_pinion", "leadscrew"]);
    });

    it("MOTION_STUDY gravity defaults to physical -Z * 9.81 m/s² (in mm/s²)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "MOTION_STUDY");
      const gravity = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Gravity Vector");
      // Default = [0, 0, -9810] mm/s² = -9.81 m/s² in Fusion's mm-default unit system
      expect(gravity?.default).toEqual([0, 0, -9810]);
    });

    it("MOTION_STUDY render formats include all common video + still options", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "MOTION_STUDY");
      const renderFormat = op?.tabs?.["Operation"]?.parameters?.find((p) => p.name === "Render Format");
      expect(renderFormat?.options).toEqual(["mp4", "avi", "png_sequence", "gif"]);
    });

    it("COMPONENT_INSERT distinguishes copy (independent) from derive (linked-source)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "COMPONENT_INSERT");
      const mode = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Insertion Mode");
      expect(mode?.options).toEqual(["copy", "derive"]);
    });

    it("ENABLE_CONTACT_SET supports rigid / elastic / frictional contact types with restitution bounded [0,1]", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "ENABLE_CONTACT_SET");
      const contactType = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Contact Type");
      expect(contactType?.options).toEqual(["rigid", "elastic", "frictional"]);
      const restitution = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Restitution");
      expect((restitution as { min?: number })?.min).toBe(0);
      expect((restitution as { max?: number })?.max).toBe(1);
    });

    it("DRIVE_JOINTS enumerates 4 easing profiles (linear/ease_in_out/ease_in/ease_out)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("assembly_operations", "DRIVE_JOINTS");
      const easing = op?.tabs?.["Configuration"]?.parameters?.find((p) => p.name === "Easing");
      expect(easing?.options).toEqual(["linear", "ease_in_out", "ease_in", "ease_out"]);
    });

    it("getOperationsByCategory enumerates exactly 3 Joint ops (Joint + As-Built + Rigid Group)", () => {
      const joints = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Joint", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(joints).toEqual(["AS_BUILT_JOINT", "JOINT", "RIGID_GROUP"]);
    });

    it("getOperationsByCategory enumerates exactly 4 Motion ops", () => {
      const motion = Fusion360CADFunctionIndexEngine
        .getOperationsByCategory("Motion", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(motion).toEqual(["DRIVE_JOINTS", "ENABLE_CONTACT_SET", "MOTION_LINK", "MOTION_STUDY"]);
    });

    it("findParameter returns null for an op that doesn't exist (failure mode)", () => {
      expect(Fusion360CADFunctionIndexEngine.findParameter("assembly_operations", "NOPE", "Motion Type")).toBeNull();
    });

    it("findParameter returns null for COMPONENT_GROUND but a JOINT-only parameter (failure mode)", () => {
      // 'Motion Type' is JOINT-only — must not pollute COMPONENT_GROUND
      expect(Fusion360CADFunctionIndexEngine.findParameter("assembly_operations", "COMPONENT_GROUND", "Motion Type")).toBeNull();
    });

    it("Fusion catalog total at completion: 8 modules / 105 ops / 950 params (Fusion CAD COMPLETE 8/8 — Inventor parity)", () => {
      // Final integration check — confirms the entire Fusion CAD catalog landed clean.
      // Phase 1 6/6 + Phase 2 2/2 (sheet_metal + drawing) = 8/8 truly exhausted.
      expect(Fusion360CADFunctionIndexEngine.listModules()).toHaveLength(8);
      expect(Fusion360CADFunctionIndexEngine.listAllOperations()).toHaveLength(105);
      expect(Fusion360CADFunctionIndexEngine.getTotalParameterCount()).toBe(950);
      expect(Fusion360CADFunctionIndexEngine.getIndex().future_modules).toEqual([]);
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

  describe("coverage_summary — Phase 1 COMPLETE markers (U-CAD-FIDX-FUS-COMPLETE)", () => {
    it("api_surface.coverage_state is exactly 'COMPLETE'", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.coverage_state).toBe("COMPLETE");
    });

    it("api_surface.phase_1_target_modules equals 6 (Phase 1 cap, locked even after Phase 2 expansion)", () => {
      const idx = Fusion360CADFunctionIndexEngine.getIndex();
      const apiSurface = idx.coverage_summary.api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules).toBe(6);
      expect(idx.modules.length).toBeGreaterThanOrEqual(6);
    });

    it("api_surface.phase_1_target_modules_remaining is exactly numeric 0", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(0);
      expect(typeof apiSurface?.phase_1_target_modules_remaining).toBe("number");
    });

    it("api_surface.phase_1_modules_pending is an empty array", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const pending = apiSurface?.phase_1_modules_pending;
      expect(Array.isArray(pending)).toBe(true);
      expect((pending as readonly unknown[])?.length).toBe(0);
    });

    it("phase_1 markers persist after clearCache (failure mode: cache invalidation)", () => {
      Fusion360CADFunctionIndexEngine.clearCache();
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.coverage_state).toBe("COMPLETE");
      expect(apiSurface?.phase_1_target_modules_remaining).toBe(0);
    });

    it("total_units_covered length equals phase_1 + shipped phase_2 modules (failure mode: ledger drift)", () => {
      const cs = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary;
      const apiSurface = cs.api_surface as Record<string, unknown> | undefined;
      const phase1 = apiSurface?.phase_1_target_modules as number;
      const phase2Total = (apiSurface?.phase_2_target_modules as number) ?? 0;
      const phase2Remaining = (apiSurface?.phase_2_target_modules_remaining as number) ?? 0;
      expect(cs.total_units_covered.length).toBe(phase1 + (phase2Total - phase2Remaining));
    });

    it("future_modules empty when phase_1_modules_pending empty (failure mode: dual-ledger drift)", () => {
      const idx = Fusion360CADFunctionIndexEngine.getIndex();
      const apiSurface = idx.coverage_summary.api_surface as Record<string, unknown> | undefined;
      const pending = (apiSurface?.phase_1_modules_pending as readonly unknown[]) ?? [];
      expect(pending.length).toBe(0);
      expect((idx.future_modules ?? []).length).toBe(0);
    });

    it("phase_1_target_modules cannot exceed modules.length (adversarial: over-promise)", () => {
      const idx = Fusion360CADFunctionIndexEngine.getIndex();
      const apiSurface = idx.coverage_summary.api_surface as Record<string, unknown> | undefined;
      const target = apiSurface?.phase_1_target_modules as number;
      expect(target).toBeLessThanOrEqual(idx.modules.length);
    });

    it("phase_1_target_modules_remaining is non-negative (adversarial: negative count)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const remaining = apiSurface?.phase_1_target_modules_remaining as number;
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it("coverage_state is one of the allowed states (adversarial: typo state)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(["COMPLETE", "PARTIAL", "PENDING"]).toContain(apiSurface?.coverage_state);
    });
  });

  describe("sheet_metal_operations catalog (U-CAD-FIDX-FUS-07)", () => {
    const KNOWN_SHEET_METAL_OPS = [
      "SHEET_METAL_RULE",
      "CONVERT_TO_SHEET_METAL",
      "FLANGE",
      "BEND",
      "HEM",
      "TAB",
      "RIP",
      "UNFOLD",
      "REFOLD",
      "INSERT_BEND",
      "SHEET_METAL_CUT",
      "BEND_ORDER_EDIT",
      "CREATE_FLAT_PATTERN",
    ];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-FUS-07'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-FUS-07");
    });

    it("operations dict has exactly 13 entries", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("sheet_metal_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(13);
    });

    it("listOperations returns exactly the 13 expected sheet metal ops", () => {
      const ids = Fusion360CADFunctionIndexEngine.listOperations("sheet_metal_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_SHEET_METAL_OPS].sort());
    });

    it("every operation reports a SheetMetal_-prefixed category", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("sheet_metal_operations");
      for (const op of ops) {
        expect(op.category.startsWith("SheetMetal_")).toBe(true);
      }
    });

    it("FLANGE has 4 tabs (Shape, Bend, Relief, Tip)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("sheet_metal_operations", "FLANGE");
      expect(Object.keys(op?.tabs ?? {}).sort()).toEqual(["Bend", "Relief", "Shape", "Tip"]);
    });

    it("HEM Type parameter declares the 5 hem profile options (closed/open/teardrop/rolled/double)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("sheet_metal_operations", "HEM");
      const typeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual(["closed", "open", "teardrop", "rolled", "double"]);
    });

    it("BEND Mode supports both edge and between_faces modes (failure mode: missing mode)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("sheet_metal_operations", "BEND");
      const modeParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Mode");
      expect(modeParam?.options).toEqual(["edge", "between_faces"]);
    });

    it("SHEET_METAL_RULE K-Factor parameter has neutral-axis bounds 0..0.5 (failure mode: bend allowance integrity)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "SHEET_METAL_RULE",
      );
      const kParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "K-Factor");
      expect(kParam?.min).toBe(0);
      expect(kParam?.max).toBe(0.5);
      expect(kParam?.default).toBe(0.44);
    });

    it("CREATE_FLAT_PATTERN exposes 14 parameters in single Shape tab (failure mode: pattern emission completeness)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "CREATE_FLAT_PATTERN",
      );
      expect((op?.tabs?.Shape?.parameters ?? []).length).toBe(14);
    });

    it("returns null for unknown sheet_metal op (adversarial: typo)", () => {
      expect(
        Fusion360CADFunctionIndexEngine.getOperation("sheet_metal_operations", "TELEPORT_BEND"),
      ).toBeNull();
    });

    it("findParameter locates 'Stationary Face' on UNFOLD as required (adversarial: cross-op param search)", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "sheet_metal_operations",
        "UNFOLD",
        "Stationary Face",
      );
      expect(loc?.parameter.name).toBe("Stationary Face");
      expect(loc?.parameter.required).toBe(true);
    });

    it("UNFOLD/REFOLD pair: REFOLD operation_id exists (adversarial: workflow completeness)", () => {
      const refold = Fusion360CADFunctionIndexEngine.getOperation(
        "sheet_metal_operations",
        "REFOLD",
      );
      expect(refold?.category).toBe("SheetMetal_Workflow_Refold");
    });
  });

  describe("coverage_summary — Phase 2 markers (Fusion CAD COMPLETE 8/8 — Inventor parity)", () => {
    it("api_surface.phase_2_coverage_state is exactly 'COMPLETE' (2 of 2 Phase 2 modules done)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_2_coverage_state).toBe("COMPLETE");
    });

    it("api_surface.phase_2_target_modules equals 2 (sheet_metal + drawing)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_2_target_modules).toBe(2);
    });

    it("api_surface.phase_2_target_modules_remaining is exactly 0 (Phase 2 closed)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_2_target_modules_remaining).toBe(0);
    });

    it("api_surface.phase_2_modules_pending is empty array (no Phase 2 work pending)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.phase_2_modules_pending).toEqual([]);
    });

    it("api_surface.fusion_cad_8_of_8 marker is true (true exhaustion flag)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.fusion_cad_8_of_8).toBe(true);
    });

    it("api_surface.inventor_parity marker is true (parity guarantee)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      expect(apiSurface?.inventor_parity).toBe(true);
    });

    it("phase_2 ledger is internally consistent (failure mode: target/remaining/pending drift)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const total = apiSurface?.phase_2_target_modules as number;
      const remaining = apiSurface?.phase_2_target_modules_remaining as number;
      const pending = (apiSurface?.phase_2_modules_pending as readonly string[]) ?? [];
      expect(remaining).toBe(pending.length);
      expect(remaining).toBeLessThanOrEqual(total);
    });

    it("platform_integration.sheet_metal_workspace flipped from false to true (failure mode: feature flag drift)", () => {
      const platform = Fusion360CADFunctionIndexEngine.getIndex().platform_integration ?? {};
      expect(platform.sheet_metal_workspace).toBe(true);
    });

    it("platform_integration.drawing_workspace is true (failure mode: drawing flag missing)", () => {
      const platform = Fusion360CADFunctionIndexEngine.getIndex().platform_integration ?? {};
      expect(platform.drawing_workspace).toBe(true);
    });

    it("phase_2_target_modules cannot exceed modules.length (adversarial: over-promise)", () => {
      const idx = Fusion360CADFunctionIndexEngine.getIndex();
      const apiSurface = idx.coverage_summary.api_surface as Record<string, unknown> | undefined;
      const target = apiSurface?.phase_2_target_modules as number;
      expect(target).toBeLessThanOrEqual(idx.modules.length);
    });

    it("phase_2_target_modules_remaining is non-negative (adversarial: negative count)", () => {
      const apiSurface = Fusion360CADFunctionIndexEngine.getIndex().coverage_summary
        .api_surface as Record<string, unknown> | undefined;
      const remaining = apiSurface?.phase_2_target_modules_remaining as number;
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe("drawing_operations catalog (U-CAD-FIDX-FUS-08)", () => {
    const KNOWN_DRAWING_OPS = [
      "SHEET",
      "BASE_VIEW",
      "PROJECTED_VIEW",
      "SECTION_VIEW",
      "DETAIL_VIEW",
      "AUXILIARY_VIEW",
      "BREAK_VIEW",
      "DIMENSION",
      "GEOMETRIC_TOLERANCE",
      "DATUM_FEATURE",
      "CENTERLINE",
      "CENTERMARK",
      "TEXT",
      "PARTS_LIST",
      "HOLE_TABLE",
      "TITLE_BLOCK",
      "REVISION_TABLE",
      "EXPORT",
    ];

    const VIEW_OPS = [
      "BASE_VIEW",
      "PROJECTED_VIEW",
      "SECTION_VIEW",
      "DETAIL_VIEW",
      "AUXILIARY_VIEW",
      "BREAK_VIEW",
    ];

    const ANNOTATION_OPS = [
      "DIMENSION",
      "GEOMETRIC_TOLERANCE",
      "DATUM_FEATURE",
      "CENTERLINE",
      "CENTERMARK",
      "TEXT",
    ];

    const TABLE_OPS = ["PARTS_LIST", "HOLE_TABLE", "REVISION_TABLE"];

    it("schemaVersion is exactly '1.0.0'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("drawing_operations");
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("metadata.milestone is exactly 'U-CAD-FIDX-FUS-08'", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("drawing_operations");
      expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-FUS-08");
    });

    it("operations dict has exactly 18 entries", () => {
      const mod = Fusion360CADFunctionIndexEngine.getModule("drawing_operations");
      expect(Object.keys(mod?.operations ?? {})).toHaveLength(18);
    });

    it("listOperations returns exactly the 18 expected drawing ops", () => {
      const ids = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ids).toEqual([...KNOWN_DRAWING_OPS].sort());
    });

    it("every operation reports a Drawing_-prefixed category", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations");
      for (const op of ops) {
        expect(op.category.startsWith("Drawing_")).toBe(true);
      }
    });

    it("VIEW_OPS span all 6 view subcategories (Drawing_View_*)", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations");
      const viewCategories = ops
        .filter((op) => VIEW_OPS.includes(op.operation_id))
        .map((op) => op.category);
      expect(viewCategories.sort()).toEqual([
        "Drawing_View_Auxiliary",
        "Drawing_View_Base",
        "Drawing_View_Break",
        "Drawing_View_Detail",
        "Drawing_View_Projected",
        "Drawing_View_Section",
      ]);
    });

    it("ANNOTATION_OPS all carry Drawing_Annotation_ category prefix", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations");
      const annotationOps = ops.filter((op) => ANNOTATION_OPS.includes(op.operation_id));
      expect(annotationOps.length).toBe(6);
      for (const op of annotationOps) {
        expect(op.category.startsWith("Drawing_Annotation_")).toBe(true);
      }
    });

    it("TABLE_OPS all carry Drawing_Table_ category prefix", () => {
      const ops = Fusion360CADFunctionIndexEngine.listOperations("drawing_operations");
      const tableOps = ops.filter((op) => TABLE_OPS.includes(op.operation_id));
      expect(tableOps.length).toBe(3);
      for (const op of tableOps) {
        expect(op.category.startsWith("Drawing_Table_")).toBe(true);
      }
    });

    it("SHEET Format declares 11 size options (ANSI A..E + ISO A0..A4 + custom)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "SHEET");
      const formatParam = op?.tabs?.Shape?.parameters?.find((p) => p.name === "Format");
      expect(formatParam?.options).toHaveLength(11);
      expect(formatParam?.options).toContain("ANSI_A");
      expect(formatParam?.options).toContain("ISO_A4");
      expect(formatParam?.options).toContain("custom");
    });

    it("BASE_VIEW Orientation declares 11 view orientations (6 ortho + 4 iso + named)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "BASE_VIEW");
      const orientationParam = op?.tabs?.View?.parameters?.find((p) => p.name === "Orientation");
      expect(orientationParam?.options).toHaveLength(11);
      expect(orientationParam?.options).toContain("front");
      expect(orientationParam?.options).toContain("iso_top_left");
      expect(orientationParam?.options).toContain("named_view");
    });

    it("SECTION_VIEW Section Method supports the 6 ASME-standard section variants", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "SECTION_VIEW");
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

    it("DIMENSION Type spans the 8 dimension subtypes (failure mode: missing dimension type)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "DIMENSION");
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

    it("DIMENSION Tolerance Type covers the 7 ASME tolerance forms (failure mode: tolerance completeness)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "DIMENSION");
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

    it("GEOMETRIC_TOLERANCE Type lists exactly 14 ASME Y14.5 geometric characteristics (failure mode: GD&T completeness)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "drawing_operations",
        "GEOMETRIC_TOLERANCE",
      );
      const typeParam = op?.tabs?.Tolerance?.parameters?.find((p) => p.name === "Geometric Type");
      expect(typeParam?.options).toHaveLength(14);
      // ASME Y14.5 categories: form (3), orientation (3), location (3), profile (2), runout (2), straightness/circularity in form
      expect(typeParam?.options).toContain("position");
      expect(typeParam?.options).toContain("flatness");
      expect(typeParam?.options).toContain("total_runout");
      expect(typeParam?.options).toContain("profile_surface");
    });

    it("EXPORT Format covers all 6 multi-format outputs (PDF/DWG/DXF/PNG/JPG/SVG)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "EXPORT");
      const formatParam = op?.tabs?.Output?.parameters?.find((p) => p.name === "Format");
      expect(formatParam?.options).toEqual(["pdf", "dwg", "dxf", "png", "jpg", "svg"]);
    });

    it("CENTERLINE Type supports all 5 generation modes", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "CENTERLINE");
      const typeParam = op?.tabs?.Annotation?.parameters?.find((p) => p.name === "Type");
      expect(typeParam?.options).toEqual([
        "bisector",
        "two_lines",
        "circular_pattern",
        "projected",
        "full_pattern",
      ]);
    });

    it("REVISION_TABLE Revision Format includes letter_skip_reserved per ASME Y14.35 (failure mode: standard non-compliance)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation(
        "drawing_operations",
        "REVISION_TABLE",
      );
      const formatParam = op?.tabs?.Annotation?.parameters?.find(
        (p) => p.name === "Revision Format",
      );
      expect(formatParam?.options).toContain("letter_skip_reserved");
      expect(formatParam?.default).toBe("letter_skip_reserved");
    });

    it("returns null for unknown drawing op (adversarial: typo)", () => {
      expect(
        Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "TELEPORT_VIEW"),
      ).toBeNull();
    });

    it("findParameter locates 'Tolerance Value' on GEOMETRIC_TOLERANCE as required (adversarial: cross-tab param)", () => {
      const loc = Fusion360CADFunctionIndexEngine.findParameter(
        "drawing_operations",
        "GEOMETRIC_TOLERANCE",
        "Tolerance Value",
      );
      expect(loc?.parameter.name).toBe("Tolerance Value");
      expect(loc?.parameter.required).toBe(true);
    });

    it("BREAK_VIEW Break Style supports 4 aesthetic options (adversarial: missing break style)", () => {
      const op = Fusion360CADFunctionIndexEngine.getOperation("drawing_operations", "BREAK_VIEW");
      const styleParam = op?.tabs?.View?.parameters?.find((p) => p.name === "Break Style");
      expect(styleParam?.options).toEqual(["straight", "curved", "zigzag", "step"]);
    });
  });
});
