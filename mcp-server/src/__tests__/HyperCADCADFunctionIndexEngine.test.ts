/**
 * Tests for HyperCADCADFunctionIndexEngine — hyperCAD-S CAD Function Index.
 * @see src/engines/HyperCADCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-HCAD-01 (sketch_operations), U-CAD-FIDX-HCAD-02 (solid_operations),
 *      U-CAD-FIDX-HCAD-03 (surface_operations), U-CAD-FIDX-HCAD-04 (healing_operations),
 *      U-CAD-FIDX-HCAD-05 (mesh_operations), U-CAD-FIDX-HCAD-06 (assembly_operations),
 *      U-CAD-FIDX-HCAD-07 (drawing_operations), U-CAD-FIDX-HCAD-08 (datum_operations) — COMPLETE
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

const KNOWN_SOLID_OPS = [
  "BOX", "CYLINDER", "CONE", "SPHERE", "TORUS", "BLOCK",
  "EXTRUDE", "REVOLVE", "SWEEP", "LOFT", "PIPE_ALONG_CURVE", "HELIX",
  "FILLET", "CHAMFER", "SHELL", "DRAFT", "THICKEN",
  "BOOLEAN_UNION", "BOOLEAN_SUBTRACT", "BOOLEAN_INTERSECT",
  "PATTERN_LINEAR", "PATTERN_CIRCULAR", "PATTERN_MIRROR", "PATTERN_PATH",
  "MOVE_FACE", "PUSH_PULL", "REPLACE_FACE",
  "HOLE_SIMPLE", "HOLE_CBORE", "HOLE_TAP",
];

const KNOWN_SURFACE_OPS = [
  "PATCH", "BOUNDARY", "COONS", "NETWORK", "SURFACE_SWEEP", "SURFACE_LOFT",
  "SURFACE_REVOLVE", "SURFACE_EXTRUDE", "SURFACE_PLANE", "RULED", "TABULATED",
  "SURFACE_HELICAL",
  "TRIM", "EXTEND_SURFACE", "UNTRIM", "SURFACE_OFFSET", "STITCH", "UNSTITCH",
  "REVERSE", "SURFACE_MATCH", "BLEND", "SURFACE_FILLET", "SURFACE_CHAMFER",
  "SURFACE_REPLACE", "REFIT",
  "SURFACE_TO_SOLID", "SOLID_TO_SURFACE", "MESH_TO_SURFACE",
];

const KNOWN_HEALING_OPS = [
  "AUTO_HEAL", "GAP_DETECTOR", "VALIDATE_WATERTIGHT",
  "MANUAL_GAP_FILL", "KNIT_FACES", "FORCE_STITCH", "REMOVE_FEATURE",
  "REMOVE_FILLET", "HEAL_REPLACE_FACE", "EDGE_BLEND", "REPAIR_SELF_INTERSECT",
  "DECIMATE_EDGE", "SMOOTH_CURVE", "FIX_TANGENT", "SNAP_TO_GRID", "DETECT_NON_MANIFOLD",
];

const KNOWN_MESH_OPS = [
  "MESH_INSERT",
  "MESH_CONVERT_TO_BREP", "MESH_CONVERT_TO_SURFACE",
  "MESH_REDUCE", "MESH_SMOOTH", "MESH_REPAIR", "MESH_REMESH",
  "MESH_BOOLEAN",
  "MESH_PLANE_CUT", "MESH_CLIP_VOLUME",
  "MESH_EXTRACT_FEATURE_LINES",
  "MESH_SLICE_FOR_ADDITIVE",
];

const KNOWN_ASSEMBLY_OPS = [
  "INSERT_COMPONENT", "REPLACE_COMPONENT", "EDIT_IN_PLACE", "FIX_COMPONENT",
  "JOINT",
  "COMPONENT_PATTERN", "COMPONENT_MIRROR",
  "HIDE_COMPONENT", "SHOW_ONLY", "SUPPRESS_COMPONENT", "GROUP_COMPONENTS",
  "COMPONENT_TREE",
  "BOM_EXTRACT", "MASS_PROPERTIES", "INTERFERENCE_CHECK",
];

const KNOWN_DRAWING_OPS = [
  "VIEW_PROJECTION", "VIEW_AUXILIARY", "VIEW_SECTION", "VIEW_DETAIL",
  "VIEW_BROKEN_OUT", "VIEW_CROP",
  "DIM_LINEAR", "DIM_ANGULAR", "DIM_RADIUS", "DIM_DIAMETER", "DIM_CHAMFER",
  "NOTE", "SYMBOL", "GDT_FRAME",
  "HATCHING",
  "TITLE_BLOCK", "REVISION_TABLE", "BOM_TABLE",
  "LAYER", "LINETYPE", "PLOT_STYLE",
];

const KNOWN_DATUM_OPS = [
  "REFERENCE_PLANE",
  "REFERENCE_AXIS",
  "REFERENCE_POINT",
  "COORDINATE_SYSTEM",
  "REFERENCE_SPLINE_3D",
  "REFERENCE_POLYLINE_3D",
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

    it("modules array contains all eight shipped modules — hyperCAD-S coverage COMPLETE", () => {
      const ids = HyperCADCADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual([
        "sketch_operations", "solid_operations", "surface_operations",
        "healing_operations", "mesh_operations", "assembly_operations",
        "drawing_operations", "datum_operations",
      ]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = HyperCADCADFunctionIndexEngine.getIndex();
      const b = HyperCADCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap COMPLETE", () => {
    it("future_modules is empty AND all 8 historically planned modules are now shipped (HCAD-01..HCAD-08)", () => {
      const idx = HyperCADCADFunctionIndexEngine.getIndex();
      const fm = idx.future_modules ?? [];
      // Negative half: nothing left to ship
      expect(fm).toEqual([]);
      // Positive half: every historically planned module ID appears in shipped modules with substantive metadata
      const shippedIds = idx.modules.map((m) => m.module_id);
      const HISTORICAL_PLAN = [
        "sketch_operations", "solid_operations", "surface_operations",
        "healing_operations", "mesh_operations", "assembly_operations",
        "drawing_operations", "datum_operations",
      ];
      for (const planned of HISTORICAL_PLAN) {
        expect(shippedIds).toContain(planned);
        const entry = idx.modules.find((m) => m.module_id === planned);
        expect(entry?.parameter_count_estimate ?? 0).toBeGreaterThan(0);
        expect((entry?.description ?? "").length).toBeGreaterThan(20);
      }
    });

    it("coverage_summary marks the api_surface as COMPLETE with all 8 unit tags accounted for", () => {
      const idx = HyperCADCADFunctionIndexEngine.getIndex();
      const cs = idx.coverage_summary;
      expect(cs.total_modules).toBe(8);
      expect(cs.total_units_covered).toEqual([
        "U-CAD-FIDX-HCAD-01", "U-CAD-FIDX-HCAD-02", "U-CAD-FIDX-HCAD-03",
        "U-CAD-FIDX-HCAD-04", "U-CAD-FIDX-HCAD-05", "U-CAD-FIDX-HCAD-06",
        "U-CAD-FIDX-HCAD-07", "U-CAD-FIDX-HCAD-08",
      ]);
      expect((cs.api_surface as { coverage_state?: string }).coverage_state).toBe("COMPLETE");
    });

    it("healing_operations promoted from future_modules to shipped (HCAD-04) — appears in modules with U-CAD-FIDX-HCAD-04 tag and >=80 params", () => {
      const idx = HyperCADCADFunctionIndexEngine.getIndex();
      // Negative half: removed from future_modules
      const stillDeferred = (idx.future_modules ?? []).map((f) => f.planned_id);
      expect(stillDeferred).not.toContain("healing_operations");
      // Positive half: present in shipped modules with concrete metadata (matches the original >=80 params bar)
      const shipped = idx.modules.find((m) => m.module_id === "healing_operations");
      expect(shipped?.covered_units).toEqual(["U-CAD-FIDX-HCAD-04"]);
      expect(shipped?.parameter_count_estimate ?? 0).toBeGreaterThanOrEqual(80);
      expect(shipped?.description ?? "").toMatch(/healing|gap.*fill|knit|watertight/i);
    });
  });

  describe("listModules / getModuleEntry", () => {
    it("listModules returns all eight shipped modules in declared order", () => {
      expect(HyperCADCADFunctionIndexEngine.listModules()).toEqual([
        "sketch_operations",
        "solid_operations",
        "surface_operations",
        "healing_operations",
        "mesh_operations",
        "assembly_operations",
        "drawing_operations",
        "datum_operations",
      ]);
    });

    it("getModuleEntry('sketch_operations') has the U-CAD-FIDX-HCAD-01 tag and 242 params", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("sketch_operations");
      expect(entry?.module_id).toBe("sketch_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/sketch-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-01"]);
      expect(entry?.parameter_count_estimate).toBe(242);
    });

    it("getModuleEntry('solid_operations') has the U-CAD-FIDX-HCAD-02 tag and 214 params", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("solid_operations");
      expect(entry?.module_id).toBe("solid_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/solid-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-02"]);
      expect(entry?.parameter_count_estimate).toBe(214);
      expect(entry?.dependencies).toEqual(["sketch_operations"]);
    });

    it("getModuleEntry('surface_operations') has the U-CAD-FIDX-HCAD-03 tag and 148 params", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("surface_operations");
      expect(entry?.module_id).toBe("surface_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/surface-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-03"]);
      expect(entry?.parameter_count_estimate).toBe(148);
      expect(entry?.dependencies).toEqual(["solid_operations"]);
    });

    it("getModuleEntry('healing_operations') has the U-CAD-FIDX-HCAD-04 tag and 83 params with surface+solid dependencies", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("healing_operations");
      expect(entry?.module_id).toBe("healing_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/healing-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-04"]);
      expect(entry?.parameter_count_estimate).toBe(83);
      expect(entry?.dependencies).toEqual(["surface_operations", "solid_operations"]);
    });

    it("getModuleEntry('mesh_operations') has the U-CAD-FIDX-HCAD-05 tag and 66 params with surface dependency", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("mesh_operations");
      expect(entry?.module_id).toBe("mesh_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/mesh-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-05"]);
      expect(entry?.parameter_count_estimate).toBe(66);
      expect(entry?.dependencies).toEqual(["surface_operations"]);
    });

    it("getModuleEntry('assembly_operations') has the U-CAD-FIDX-HCAD-06 tag and 74 params with solid dependency", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("assembly_operations");
      expect(entry?.module_id).toBe("assembly_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/assembly-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-06"]);
      expect(entry?.parameter_count_estimate).toBe(74);
      expect(entry?.dependencies).toEqual(["solid_operations"]);
    });

    it("getModuleEntry('drawing_operations') has the U-CAD-FIDX-HCAD-07 tag and 118 params with solid+assembly dependencies", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("drawing_operations");
      expect(entry?.module_id).toBe("drawing_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/drawing-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-07"]);
      expect(entry?.parameter_count_estimate).toBe(118);
      expect(entry?.dependencies).toEqual(["solid_operations", "assembly_operations"]);
    });

    it("getModuleEntry('datum_operations') has the U-CAD-FIDX-HCAD-08 tag and 56 params with no dependencies (foundational scaffolding)", () => {
      const entry = HyperCADCADFunctionIndexEngine.getModuleEntry("datum_operations");
      expect(entry?.module_id).toBe("datum_operations");
      expect(entry?.path).toBe("cad-functions/hypercad/datum-operations.json");
      expect(entry?.covered_units).toEqual(["U-CAD-FIDX-HCAD-08"]);
      expect(entry?.parameter_count_estimate).toBe(56);
      expect(entry?.dependencies).toEqual([]);
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

    it("listAllOperations sums all 8 module operation counts", () => {
      const all = HyperCADCADFunctionIndexEngine.listAllOperations();
      const sketch = HyperCADCADFunctionIndexEngine.listOperations("sketch_operations");
      const solid = HyperCADCADFunctionIndexEngine.listOperations("solid_operations");
      const surface = HyperCADCADFunctionIndexEngine.listOperations("surface_operations");
      const healing = HyperCADCADFunctionIndexEngine.listOperations("healing_operations");
      const mesh = HyperCADCADFunctionIndexEngine.listOperations("mesh_operations");
      const assembly = HyperCADCADFunctionIndexEngine.listOperations("assembly_operations");
      const drawing = HyperCADCADFunctionIndexEngine.listOperations("drawing_operations");
      const datum = HyperCADCADFunctionIndexEngine.listOperations("datum_operations");
      expect(all.length).toBe(
        sketch.length + solid.length + surface.length + healing.length + mesh.length
        + assembly.length + drawing.length + datum.length,
      );
      expect(all.length).toBe(160);
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

  describe("listOperations — solid_operations module", () => {
    it("returns exactly 30 solid operations matching the canonical hyperCAD-S solid list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("solid_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(30);
      expect(ops.sort()).toEqual([...KNOWN_SOLID_OPS].sort());
    });
  });

  describe("Solid_Primitive — 6 primitives (BOX/CYLINDER/CONE/SPHERE/TORUS/BLOCK)", () => {
    it("getOperationsByCategory enumerates exactly 6 Solid_Primitive operations", () => {
      const prims = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Primitive", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(prims).toEqual(["BLOCK", "BOX", "CONE", "CYLINDER", "SPHERE", "TORUS"]);
    });

    it("BOX exposes 3 origin modes (corner/center_base/center_volume)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "BOX");
      const origin = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Origin Mode");
      expect(origin?.options).toEqual(["corner", "center_base", "center_volume"]);
    });

    it("CYLINDER allows radius- or diameter-driven dimensioning", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "CYLINDER");
      const dim = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Dimension Mode");
      expect(dim?.options).toEqual(["radius", "diameter"]);
    });

    it("TORUS sweep angle is bounded [1, 360] for partial-torus support", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "TORUS");
      const sweep = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Sweep Angle");
      expect(sweep?.min).toBe(1);
      expect(sweep?.max).toBe(360);
      expect(sweep?.default).toBe(360);
    });
  });

  describe("Solid_Sweep — 6 sweep features (EXTRUDE/REVOLVE/SWEEP/LOFT/PIPE_ALONG_CURVE/HELIX)", () => {
    it("getOperationsByCategory enumerates exactly 6 Solid_Sweep operations", () => {
      const sweeps = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Sweep", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(sweeps).toEqual(["EXTRUDE", "HELIX", "LOFT", "PIPE_ALONG_CURVE", "REVOLVE", "SWEEP"]);
    });

    it("EXTRUDE exposes 5 end conditions per side (distance/to_face/through_all/to_next/to_object)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "EXTRUDE");
      const end1 = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "End Condition Side 1");
      expect(end1?.options).toEqual(["distance", "to_face", "through_all", "to_next", "to_object"]);
    });

    it("EXTRUDE supports symmetric / two-sides direction modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "EXTRUDE");
      const dir = op?.tabs?.["Direction"]?.parameters?.find((p) => p.name === "Direction Mode");
      expect(dir?.options).toEqual(["one_side", "two_sides", "symmetric"]);
    });

    it("HELIX direction enumerates right_hand / left_hand", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "HELIX");
      const dir = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Direction");
      expect(dir?.options).toEqual(["right_hand", "left_hand"]);
      expect(dir?.default).toBe("right_hand");
    });

    it("LOFT supports closed-loft toggle for ring/wreath geometry", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "LOFT");
      const closed = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Closed Loft");
      expect(closed?.type).toBe("checkbox");
      expect(closed?.default).toBe(false);
    });
  });

  describe("Solid_Modify — 5 modify ops (FILLET/CHAMFER/SHELL/DRAFT/THICKEN)", () => {
    it("getOperationsByCategory enumerates exactly 5 Solid_Modify operations", () => {
      const mods = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Modify", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(mods).toEqual(["CHAMFER", "DRAFT", "FILLET", "SHELL", "THICKEN"]);
    });

    it("FILLET supports 3 fillet types (constant/variable/full_round)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "FILLET");
      const fType = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Fillet Type");
      expect(fType?.options).toEqual(["constant", "variable", "full_round"]);
    });

    it("FILLET cross-section options include G2-continuous and conic", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "FILLET");
      const cs = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Cross Section");
      expect(cs?.options).toEqual(["circular", "conic", "g2_continuous"]);
    });

    it("CHAMFER supports 3 definitions (equal/two_distance/distance_angle)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "CHAMFER");
      const cType = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Chamfer Type");
      expect(cType?.options).toEqual(["equal_distance", "two_distance", "distance_angle"]);
    });

    it("DRAFT exposes 3 draft types including parting_line and step_draft", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "DRAFT");
      const dType = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Draft Type");
      expect(dType?.options).toEqual(["neutral_plane", "parting_line", "step_draft"]);
    });

    it("DRAFT angle is bounded [-89, 89] degrees (avoid degenerate drafts)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "DRAFT");
      const angle = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Draft Angle");
      expect(angle?.min).toBe(-89);
      expect(angle?.max).toBe(89);
    });
  });

  describe("Solid_Boolean — 3 ops (UNION/SUBTRACT/INTERSECT)", () => {
    it("getOperationsByCategory enumerates exactly 3 Solid_Boolean operations", () => {
      const bools = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Boolean", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(bools).toEqual(["BOOLEAN_INTERSECT", "BOOLEAN_SUBTRACT", "BOOLEAN_UNION"]);
    });

    it("BOOLEAN_UNION declares Tolerance with mm unit and small default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "BOOLEAN_UNION");
      const tol = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Tolerance");
      expect(tol?.unit).toBe("mm");
      expect(tol?.default).toBe(0.001);
    });
  });

  describe("Solid_Pattern — 4 ops (LINEAR/CIRCULAR/MIRROR/PATH)", () => {
    it("getOperationsByCategory enumerates exactly 4 Solid_Pattern operations", () => {
      const pats = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Pattern", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(pats).toEqual(["PATTERN_CIRCULAR", "PATTERN_LINEAR", "PATTERN_MIRROR", "PATTERN_PATH"]);
    });

    it("PATTERN_CIRCULAR exposes 3 angular modes (full/total/increment)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "PATTERN_CIRCULAR");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Angular Mode");
      expect(mode?.options).toEqual(["full_circle", "total_angle", "increment_angle"]);
    });

    it("PATTERN_PATH supports 3 instance orientations including tangent_to_path", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "PATTERN_PATH");
      const orient = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Orientation");
      expect(orient?.options).toEqual(["tangent_to_path", "fixed_world", "fixed_to_seed"]);
      expect(orient?.default).toBe("tangent_to_path");
    });
  });

  describe("Solid_Direct_Edit — 3 history-free ops (MOVE_FACE/PUSH_PULL/REPLACE_FACE)", () => {
    it("getOperationsByCategory enumerates exactly 3 Solid_Direct_Edit operations", () => {
      const edits = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Direct_Edit", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(edits).toEqual(["MOVE_FACE", "PUSH_PULL", "REPLACE_FACE"]);
    });

    it("MOVE_FACE supports translate and rotate modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "MOVE_FACE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Move Mode");
      expect(mode?.options).toEqual(["translate", "rotate"]);
    });

    it("PUSH_PULL signed-offset semantics documented (positive=pull, negative=push)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "PUSH_PULL");
      const offset = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Offset Distance");
      expect(offset?.required).toBe(true);
      expect(offset?.description ?? "").toMatch(/positive.*pull|negative.*push/i);
    });
  });

  describe("Solid_Hole — 3 hole cycles for hyperMILL feature recognition", () => {
    it("getOperationsByCategory enumerates exactly 3 Solid_Hole operations", () => {
      const holes = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Solid_Hole", "solid_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(holes).toEqual(["HOLE_CBORE", "HOLE_SIMPLE", "HOLE_TAP"]);
    });

    it("HOLE_TAP supports the 4 standard thread families (ISO_metric/UN_inch/BSP/NPT)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "HOLE_TAP");
      const std = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Thread Standard");
      expect(std?.options).toEqual(["ISO_metric", "UN_inch", "BSP", "NPT"]);
      expect(std?.default).toBe("ISO_metric");
    });

    it("HOLE_TAP supports cosmetic vs true_helix modeling for downstream toolpath choice", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "HOLE_TAP");
      const modeled = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Modeled As");
      expect(modeled?.options).toEqual(["cosmetic", "true_helix"]);
      expect(modeled?.default).toBe("cosmetic");
    });

    it("HOLE_SIMPLE declares ISO 286 fit field for downstream tolerance-aware drilling", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", "HOLE_SIMPLE");
      const tol = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Hole Tolerance");
      expect(tol?.type).toBe("text");
      expect(tol?.description ?? "").toMatch(/ISO 286|H7|fit/i);
    });
  });

  describe("listOperations — surface_operations module", () => {
    it("returns exactly 28 surface operations matching the canonical hyperCAD-S surface list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("surface_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(28);
      expect(ops.sort()).toEqual([...KNOWN_SURFACE_OPS].sort());
    });
  });

  describe("Surface_Create — 12 surface-creation ops", () => {
    it("getOperationsByCategory enumerates exactly 12 Surface_Create operations", () => {
      const creates = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Surface_Create", "surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(creates).toEqual([
        "BOUNDARY", "COONS", "NETWORK", "PATCH", "RULED", "SURFACE_EXTRUDE",
        "SURFACE_HELICAL", "SURFACE_LOFT", "SURFACE_PLANE", "SURFACE_REVOLVE",
        "SURFACE_SWEEP", "TABULATED",
      ]);
    });

    it("PATCH supports 3 continuity orders (G0/G1/G2) — hyperCAD's surface-fairness signature", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "PATCH");
      const cont = op?.tabs?.["Continuity"]?.parameters?.find((p) => p.name === "Continuity Order");
      expect(cont?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
      expect(cont?.default).toBe("g1_tangent");
    });

    it("PATCH bounds u/v polynomial degree to NURBS-standard [1, 9]", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "PATCH");
      const uDeg = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "U Degree");
      expect(uDeg?.min).toBe(1);
      expect(uDeg?.max).toBe(9);
      expect(uDeg?.default).toBe(3);
    });

    it("BOUNDARY exposes per-side continuity (4 sides, each G0/G1/G2)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "BOUNDARY");
      const tab = op?.tabs?.["Continuity"];
      const sides = ["Side 1", "Side 2", "Side 3", "Side 4"];
      for (const s of sides) {
        const param = tab?.parameters?.find((p) => p.name === `${s} Continuity`);
        expect(param?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
      }
    });

    it("NETWORK requires both u-curves and v-curves and exposes intersection tolerance", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "NETWORK");
      const uCurves = op?.tabs?.["Profile"]?.parameters?.find((p) => p.name === "U Curves");
      const vCurves = op?.tabs?.["Profile"]?.parameters?.find((p) => p.name === "V Curves");
      const tol = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Tolerance");
      expect(uCurves?.required).toBe(true);
      expect(vCurves?.required).toBe(true);
      expect(tol?.unit).toBe("mm");
      expect(tol?.default).toBe(0.001);
    });

    it("RULED parameter-matching enumerates the 3 standard mappings", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "RULED");
      const param = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Parameter Matching");
      expect(param?.options).toEqual(["arc_length", "natural_parameter", "by_points"]);
    });

    it("SURFACE_HELICAL exposes Pitch + Height (mm) + Revolutions as alternate drivers", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_HELICAL");
      const pitch = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Pitch");
      const height = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Height");
      const revs = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Revolutions");
      expect(pitch?.required).toBe(true);
      expect(pitch?.unit).toBe("mm");
      expect(height?.unit).toBe("mm");
      expect(height?.min).toBe(0.001);
      expect(revs?.min).toBe(0.001);
      expect(revs?.description ?? "").toMatch(/alternate driver/i);
    });
  });

  describe("Surface_Modify — 13 modify ops", () => {
    it("getOperationsByCategory enumerates exactly 13 Surface_Modify operations", () => {
      const mods = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Surface_Modify", "surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(mods).toEqual([
        "BLEND", "EXTEND_SURFACE", "REFIT", "REVERSE", "STITCH",
        "SURFACE_CHAMFER", "SURFACE_FILLET", "SURFACE_MATCH",
        "SURFACE_OFFSET", "SURFACE_REPLACE", "TRIM", "UNSTITCH", "UNTRIM",
      ]);
    });

    it("TRIM 'Side to Keep' enumerates the 3 standard pick-side options", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "TRIM");
      const side = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Side to Keep");
      expect(side?.options).toEqual(["positive_normal", "negative_normal", "interactive_pick"]);
      expect(side?.default).toBe("interactive_pick");
    });

    it("EXTEND_SURFACE supports the 3 standard extension types", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "EXTEND_SURFACE");
      const ext = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Extension Type");
      expect(ext?.options).toEqual(["linear", "natural", "reflective"]);
      expect(ext?.default).toBe("natural");
    });

    it("STITCH exposes a Force Closed Solid gate for watertightness validation", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "STITCH");
      const force = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Force Closed Solid");
      expect(force?.type).toBe("checkbox");
      expect(force?.default).toBe(false);
      expect(force?.description ?? "").toMatch(/watertight/i);
    });

    it("BLEND supports per-edge continuity (G0/G1/G2 on each of two edges)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "BLEND");
      const e1 = op?.tabs?.["Continuity"]?.parameters?.find((p) => p.name === "Edge 1 Continuity");
      const e2 = op?.tabs?.["Continuity"]?.parameters?.find((p) => p.name === "Edge 2 Continuity");
      expect(e1?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
      expect(e2?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
      expect(e1?.default).toBe("g1_tangent");
      expect(e2?.default).toBe("g1_tangent");
    });

    it("SURFACE_OFFSET supports both constant and variable offset modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_OFFSET");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Offset Mode");
      expect(mode?.options).toEqual(["constant", "variable"]);
      expect(mode?.default).toBe("constant");
    });

    it("REFIT bounds smoothing weight to [0, 1] for shape preservation control", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "REFIT");
      const smooth = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Smoothing");
      expect(smooth?.min).toBe(0);
      expect(smooth?.max).toBe(1);
      expect(smooth?.default).toBe(0.1);
    });

    it("REFIT exposes 3 knot-reduction levels (none / moderate / aggressive)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "REFIT");
      const knot = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Knot Reduction");
      expect(knot?.options).toEqual(["none", "moderate", "aggressive"]);
      expect(knot?.default).toBe("moderate");
    });
  });

  describe("Surface_Conversion — 3 conversion ops for hyperMILL handoff", () => {
    it("getOperationsByCategory enumerates exactly 3 Surface_Conversion operations", () => {
      const convs = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Surface_Conversion", "surface_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(convs).toEqual(["MESH_TO_SURFACE", "SOLID_TO_SURFACE", "SURFACE_TO_SOLID"]);
    });

    it("SURFACE_TO_SOLID exposes Force Open Shell escape hatch with sane default off", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "SURFACE_TO_SOLID");
      const force = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Force Open Shell");
      expect(force?.type).toBe("checkbox");
      expect(force?.default).toBe(false);
    });

    it("SOLID_TO_SURFACE supports per_face vs stitched_shell output modes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "SOLID_TO_SURFACE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Output Mode");
      expect(mode?.options).toEqual(["per_face", "stitched_shell"]);
      expect(mode?.default).toBe("stitched_shell");
    });

    it("MESH_TO_SURFACE supports 3 segmentation modes for STL/OBJ ingest workflows", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", "MESH_TO_SURFACE");
      const seg = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Segmentation Mode");
      expect(seg?.options).toEqual(["auto_curvature", "by_feature_lines", "by_seed_faces"]);
      expect(seg?.default).toBe("auto_curvature");
    });
  });

  describe("listOperations — healing_operations module", () => {
    it("returns exactly 16 healing operations matching the canonical hyperCAD-S healing list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("healing_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(16);
      expect(ops.sort()).toEqual([...KNOWN_HEALING_OPS].sort());
    });
  });

  describe("Healing_Auto — 3 auto/diagnostic ops (AUTO_HEAL/GAP_DETECTOR/VALIDATE_WATERTIGHT)", () => {
    it("getOperationsByCategory enumerates exactly 3 Healing_Auto operations", () => {
      const auto = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Healing_Auto", "healing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(auto).toEqual(["AUTO_HEAL", "GAP_DETECTOR", "VALIDATE_WATERTIGHT"]);
    });

    it("AUTO_HEAL exposes 3 aggressiveness levels with 'balanced' as the default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "AUTO_HEAL");
      const agg = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Aggressiveness");
      expect(agg?.options).toEqual(["conservative", "balanced", "aggressive"]);
      expect(agg?.default).toBe("balanced");
      expect(agg?.required).toBe(true);
    });

    it("AUTO_HEAL stages enumerate the 6 pipeline stages with safe default subset", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "AUTO_HEAL");
      const stages = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Stages");
      expect(stages?.options).toEqual([
        "stitch_gaps", "knit_faces", "fix_tangent", "decimate_edges", "remove_slivers", "validate_watertight",
      ]);
      expect(stages?.default).toEqual(["stitch_gaps", "knit_faces", "fix_tangent", "validate_watertight"]);
    });

    it("GAP_DETECTOR is read-only and offers 3 output modes for downstream pipelines", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "GAP_DETECTOR");
      const out = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Output Mode");
      expect(out?.options).toEqual(["summary_only", "edge_pair_list", "marked_geometry"]);
      expect(out?.default).toBe("edge_pair_list");
    });

    it("VALIDATE_WATERTIGHT exposes 3 on-failure strategies including auto_invoke_heal escalation", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "VALIDATE_WATERTIGHT");
      const onFail = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "On Failure");
      expect(onFail?.options).toEqual(["report_only", "raise_error", "auto_invoke_heal"]);
      expect(onFail?.default).toBe("report_only");
    });
  });

  describe("Healing_Manual — 8 targeted repair ops", () => {
    it("getOperationsByCategory enumerates exactly 8 Healing_Manual operations", () => {
      const manual = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Healing_Manual", "healing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(manual).toEqual([
        "EDGE_BLEND", "FORCE_STITCH", "HEAL_REPLACE_FACE", "KNIT_FACES",
        "MANUAL_GAP_FILL", "REMOVE_FEATURE", "REMOVE_FILLET", "REPAIR_SELF_INTERSECT",
      ]);
    });

    it("MANUAL_GAP_FILL supports G0/G1/G2 continuity with G1 default for fairness", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "MANUAL_GAP_FILL");
      const cont = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Continuity");
      expect(cont?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
      expect(cont?.default).toBe("g1_tangent");
    });

    it("KNIT_FACES result mode prefers solid output when shell closes (vs sheet body)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "KNIT_FACES");
      const result = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Result Mode");
      expect(result?.options).toEqual(["sheet_body", "solid_if_closed"]);
      expect(result?.default).toBe("solid_if_closed");
    });

    it("FORCE_STITCH bounds Max Forced Gap (mm) with safe default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "FORCE_STITCH");
      const maxGap = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Max Forced Gap");
      expect(maxGap?.unit).toBe("mm");
      expect(maxGap?.default).toBe(0.5);
      expect(maxGap?.min).toBe(0);
    });

    it("REMOVE_FEATURE supports 3 closure modes (extend / blend / fill_with_plane)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "REMOVE_FEATURE");
      const mode = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Closure Mode");
      expect(mode?.options).toEqual(["extend_adjacent", "blend_adjacent", "fill_with_plane"]);
      expect(mode?.default).toBe("extend_adjacent");
    });

    it("REPAIR_SELF_INTERSECT exposes 4 strategies and bounds repair iterations [1, 20]", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "REPAIR_SELF_INTERSECT");
      const strategy = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Strategy");
      const maxIter = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Max Repair Iterations");
      expect(strategy?.options).toEqual(["trim_overlap", "refit_smooth", "remove_face", "report_only"]);
      expect(strategy?.default).toBe("trim_overlap");
      expect(maxIter?.min).toBe(1);
      expect(maxIter?.max).toBe(20);
      expect(maxIter?.default).toBe(5);
    });
  });

  describe("Healing_Edge — 5 edge/curve cleanup ops", () => {
    it("getOperationsByCategory enumerates exactly 5 Healing_Edge operations", () => {
      const edge = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Healing_Edge", "healing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(edge).toEqual([
        "DECIMATE_EDGE", "DETECT_NON_MANIFOLD", "FIX_TANGENT", "SMOOTH_CURVE", "SNAP_TO_GRID",
      ]);
    });

    it("DECIMATE_EDGE preserves endpoints by default and exposes 3 aggressiveness levels", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "DECIMATE_EDGE");
      const preserve = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Preserve Endpoints");
      const agg = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Aggressiveness");
      expect(preserve?.default).toBe(true);
      expect(agg?.options).toEqual(["conservative", "balanced", "aggressive"]);
    });

    it("SMOOTH_CURVE bounds Smoothing Weight to [0, 1] for shape preservation control", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "SMOOTH_CURVE");
      const w = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Smoothing Weight");
      expect(w?.min).toBe(0);
      expect(w?.max).toBe(1);
      expect(w?.default).toBe(0.2);
    });

    it("FIX_TANGENT continuity target enumerates G1/G2 only (G0 not applicable)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "FIX_TANGENT");
      const target = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Continuity Target");
      expect(target?.options).toEqual(["g1_tangent", "g2_curvature"]);
      expect(target?.default).toBe("g1_tangent");
    });

    it("SNAP_TO_GRID requires a grid spacing in mm with non-negative bound", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "SNAP_TO_GRID");
      const spacing = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Grid Spacing");
      expect(spacing?.required).toBe(true);
      expect(spacing?.unit).toBe("mm");
      expect(spacing?.min).toBe(0);
      expect(spacing?.default).toBe(0.001);
    });

    it("DETECT_NON_MANIFOLD covers 5 categories including zero-area-face and zero-length-edge", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", "DETECT_NON_MANIFOLD");
      const cats = op?.tabs?.["Action"]?.parameters?.find((p) => p.name === "Categories To Detect");
      expect(cats?.options).toEqual([
        "edge_3plus_faces", "vertex_2_faces", "self_overlap", "zero_area_face", "zero_length_edge",
      ]);
      expect(cats?.default).toEqual([
        "edge_3plus_faces", "vertex_2_faces", "zero_area_face", "zero_length_edge",
      ]);
    });
  });

  describe("listOperations — mesh_operations module", () => {
    it("returns exactly 12 mesh operations matching the canonical hyperCAD-S mesh list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("mesh_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(12);
      expect(ops.sort()).toEqual([...KNOWN_MESH_OPS].sort());
    });
  });

  describe("Mesh_Import — 1 import op", () => {
    it("MESH_INSERT supports the 6 standard mesh-file formats", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_INSERT");
      const fmt = op?.tabs?.["Source"]?.parameters?.find((p) => p.name === "File Format");
      expect(fmt?.options).toEqual(["stl_binary", "stl_ascii", "obj", "ply", "3mf", "scan_xyz"]);
      expect(fmt?.default).toBe("stl_binary");
    });

    it("MESH_INSERT exposes auto-detect units with the 4 standard explicit overrides", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_INSERT");
      const units = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Source Units");
      expect(units?.options).toEqual(["mm", "cm", "m", "inch", "auto_detect"]);
      expect(units?.default).toBe("auto_detect");
    });
  });

  describe("Mesh_Convert — 2 conversion ops", () => {
    it("getOperationsByCategory enumerates exactly 2 Mesh_Convert operations", () => {
      const conv = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Mesh_Convert", "mesh_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(conv).toEqual(["MESH_CONVERT_TO_BREP", "MESH_CONVERT_TO_SURFACE"]);
    });

    it("MESH_CONVERT_TO_BREP exposes 3 output modes (solid / shell / per_face_brep)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_CONVERT_TO_BREP");
      const mode = op?.tabs?.["Output"]?.parameters?.find((p) => p.name === "Output Mode");
      expect(mode?.options).toEqual(["solid", "shell", "per_face_brep"]);
      expect(mode?.default).toBe("solid");
    });

    it("MESH_CONVERT_TO_SURFACE adds 'single_region' segmentation distinct from surface_operations.MESH_TO_SURFACE", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_CONVERT_TO_SURFACE");
      const seg = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Segmentation Mode");
      expect(seg?.options).toEqual(["auto_curvature", "by_feature_lines", "by_seed_faces", "single_region"]);
      expect(seg?.default).toBe("auto_curvature");
    });
  });

  describe("Mesh_Modify — 4 modify ops (REDUCE/SMOOTH/REPAIR/REMESH)", () => {
    it("getOperationsByCategory enumerates exactly 4 Mesh_Modify operations", () => {
      const mod = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Mesh_Modify", "mesh_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(mod).toEqual(["MESH_REDUCE", "MESH_REMESH", "MESH_REPAIR", "MESH_SMOOTH"]);
    });

    it("MESH_REDUCE exposes 3 reduction modes (target_count / target_ratio / max_deviation)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_REDUCE");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Reduction Mode");
      expect(mode?.options).toEqual(["target_count", "target_ratio", "max_deviation"]);
      expect(mode?.default).toBe("max_deviation");
    });

    it("MESH_REDUCE 'Target Ratio' is bounded (0.001, 1] for safe-rate decimation", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_REDUCE");
      const ratio = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Target Ratio");
      expect(ratio?.min).toBe(0.001);
      expect(ratio?.max).toBe(1);
      expect(ratio?.default).toBe(0.5);
    });

    it("MESH_SMOOTH supports 3 smoothing methods with Taubin as the default (preserves volume)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_SMOOTH");
      const method = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Smoothing Method");
      expect(method?.options).toEqual(["laplacian", "taubin", "bilateral"]);
      expect(method?.default).toBe("taubin");
    });

    it("MESH_REPAIR stages enumerate 6 repair stages with safe default subset (5 of 6)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_REPAIR");
      const stages = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Stages");
      expect(stages?.options).toEqual([
        "fill_holes", "remove_zero_area", "merge_duplicate_vertices",
        "fix_non_manifold", "fix_normals", "remove_disconnected",
      ]);
      expect(stages?.default).toEqual([
        "fill_holes", "remove_zero_area", "merge_duplicate_vertices",
        "fix_non_manifold", "fix_normals",
      ]);
    });

    it("MESH_REMESH 'Curvature Sensitivity' is bounded [0, 1] for adaptive control", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_REMESH");
      const sens = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Curvature Sensitivity");
      expect(sens?.min).toBe(0);
      expect(sens?.max).toBe(1);
      expect(sens?.default).toBe(0.5);
    });
  });

  describe("Mesh_Boolean — 1 op (mesh-mesh union/subtract/intersect)", () => {
    it("MESH_BOOLEAN exposes the 3 standard Boolean operations with union default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_BOOLEAN");
      const oper = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Operation");
      expect(oper?.options).toEqual(["union", "subtract", "intersect"]);
      expect(oper?.default).toBe("union");
      expect(oper?.required).toBe(true);
    });

    it("MESH_BOOLEAN auto-repairs result by default (mesh Boolean commonly produces non-watertight output)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_BOOLEAN");
      const repair = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Auto Repair Result");
      expect(repair?.type).toBe("checkbox");
      expect(repair?.default).toBe(true);
    });
  });

  describe("Mesh_Cut — 2 cut ops (PLANE_CUT / CLIP_VOLUME)", () => {
    it("getOperationsByCategory enumerates exactly 2 Mesh_Cut operations", () => {
      const cut = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Mesh_Cut", "mesh_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(cut).toEqual(["MESH_CLIP_VOLUME", "MESH_PLANE_CUT"]);
    });

    it("MESH_PLANE_CUT exposes 3 side-keep options including both_sides for split-into-two", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_PLANE_CUT");
      const side = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Side To Keep");
      expect(side?.options).toEqual(["positive_normal", "negative_normal", "both_sides"]);
      expect(side?.default).toBe("positive_normal");
    });

    it("MESH_CLIP_VOLUME exposes inside/outside region selection with inside default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_CLIP_VOLUME");
      const region = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Region To Keep");
      expect(region?.options).toEqual(["inside", "outside"]);
      expect(region?.default).toBe("inside");
    });
  });

  describe("Mesh_Extract — feature-line extraction for hyperMILL toolpaths", () => {
    it("MESH_EXTRACT_FEATURE_LINES bounds Sharp Angle Threshold to [0, 180] degrees", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_EXTRACT_FEATURE_LINES");
      const sharp = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Sharp Angle Threshold");
      expect(sharp?.unit).toBe("deg");
      expect(sharp?.min).toBe(0);
      expect(sharp?.max).toBe(180);
      expect(sharp?.default).toBe(25);
    });

    it("MESH_EXTRACT_FEATURE_LINES bounds Curve Smoothing weight to [0, 1]", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_EXTRACT_FEATURE_LINES");
      const smooth = op?.tabs?.["Tolerance"]?.parameters?.find((p) => p.name === "Curve Smoothing");
      expect(smooth?.min).toBe(0);
      expect(smooth?.max).toBe(1);
      expect(smooth?.default).toBe(0.1);
    });
  });

  describe("Mesh_Slice — additive prep", () => {
    it("MESH_SLICE_FOR_ADDITIVE supports 3 output formats including direct g-code outline", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_SLICE_FOR_ADDITIVE");
      const out = op?.tabs?.["Output"]?.parameters?.find((p) => p.name === "Output Format");
      expect(out?.options).toEqual(["contour_curves", "svg_per_layer", "gcode_outline"]);
      expect(out?.default).toBe("contour_curves");
    });

    it("MESH_SLICE_FOR_ADDITIVE 'Layer Height' is required and lower-bounded by minimum slicer resolution", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", "MESH_SLICE_FOR_ADDITIVE");
      const layer = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Layer Height");
      expect(layer?.required).toBe(true);
      expect(layer?.unit).toBe("mm");
      expect(layer?.min).toBe(0.001);
    });
  });

  describe("listOperations — assembly_operations module", () => {
    it("returns exactly 15 assembly operations matching the canonical hyperCAD-S assembly list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("assembly_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(15);
      expect(ops.sort()).toEqual([...KNOWN_ASSEMBLY_OPS].sort());
    });
  });

  describe("Assembly_Component — 4 component lifecycle ops", () => {
    it("getOperationsByCategory enumerates exactly 4 Assembly_Component operations", () => {
      const comp = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Assembly_Component", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(comp).toEqual(["EDIT_IN_PLACE", "FIX_COMPONENT", "INSERT_COMPONENT", "REPLACE_COMPONENT"]);
    });

    it("INSERT_COMPONENT exposes 3 reference modes with linked default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "INSERT_COMPONENT");
      const ref = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Reference Mode");
      expect(ref?.options).toEqual(["linked", "embedded", "linked_with_local_overrides"]);
      expect(ref?.default).toBe("linked");
    });

    it("REPLACE_COMPONENT mate-resolution covers 4 strategies, defaulting to topology-based preservation", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "REPLACE_COMPONENT");
      const res = op?.tabs?.["Constraint"]?.parameters?.find((p) => p.name === "Mate Resolution");
      expect(res?.options).toEqual([
        "preserve_by_face_id", "preserve_by_name", "preserve_by_topology", "drop_unresolved",
      ]);
      expect(res?.default).toBe("preserve_by_topology");
    });

    it("FIX_COMPONENT supports 3 lock modes (full_6dof / translation / rotation)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "FIX_COMPONENT");
      const mode = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Fix Mode");
      expect(mode?.options).toEqual(["full_6dof", "translation_only", "rotation_only"]);
      expect(mode?.default).toBe("full_6dof");
    });

    it("EDIT_IN_PLACE locks siblings by default to prevent cross-edits", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "EDIT_IN_PLACE");
      const lock = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Lock Other Components");
      expect(lock?.type).toBe("checkbox");
      expect(lock?.default).toBe(true);
    });
  });

  describe("Assembly_Joint — 6-kinematics joint op", () => {
    it("JOINT enumerates the 6 standard kinematic types covering machinist + fixture needs", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "JOINT");
      const jtype = op?.tabs?.["Constraint"]?.parameters?.find((p) => p.name === "Joint Type");
      expect(jtype?.options).toEqual([
        "rigid", "revolute", "slider", "cylindrical", "planar", "ball",
      ]);
      expect(jtype?.default).toBe("rigid");
      expect(jtype?.required).toBe(true);
    });

    it("JOINT requires both component selections and a per-component reference frame", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "JOINT");
      const compA = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Component A");
      const compB = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Component B");
      const refA = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Reference A");
      const refB = op?.tabs?.["Component"]?.parameters?.find((p) => p.name === "Reference B");
      expect(compA?.required).toBe(true);
      expect(compB?.required).toBe(true);
      expect(refA?.required).toBe(true);
      expect(refB?.required).toBe(true);
    });
  });

  describe("Assembly_Pattern — 2 instancing ops", () => {
    it("getOperationsByCategory enumerates exactly 2 Assembly_Pattern operations", () => {
      const pat = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Assembly_Pattern", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(pat).toEqual(["COMPONENT_MIRROR", "COMPONENT_PATTERN"]);
    });

    it("COMPONENT_PATTERN exposes 4 layout types (linear/circular/sketch_points/along_path)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "COMPONENT_PATTERN");
      const ptype = op?.tabs?.["Placement"]?.parameters?.find((p) => p.name === "Pattern Type");
      expect(ptype?.options).toEqual(["linear", "circular", "sketch_points", "along_path"]);
      expect(ptype?.required).toBe(true);
    });

    it("COMPONENT_MIRROR defaults to linked instances, with a 'Create New Components' opt-in for handed parts", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "COMPONENT_MIRROR");
      const newComp = op?.tabs?.["Placement"]?.parameters?.find((p) => p.name === "Create New Components");
      const suffix = op?.tabs?.["Placement"]?.parameters?.find((p) => p.name === "Suffix For New Components");
      expect(newComp?.default).toBe(false);
      expect(suffix?.default).toBe("_mirror");
    });
  });

  describe("Assembly_Visibility — 4 visibility/organization ops", () => {
    it("getOperationsByCategory enumerates exactly 4 Assembly_Visibility operations", () => {
      const vis = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Assembly_Visibility", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(vis).toEqual([
        "GROUP_COMPONENTS", "HIDE_COMPONENT", "SHOW_ONLY", "SUPPRESS_COMPONENT",
      ]);
    });

    it("HIDE_COMPONENT scope distinguishes active_viewport vs all_viewports (default active only)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "HIDE_COMPONENT");
      const scope = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Scope");
      expect(scope?.options).toEqual(["active_viewport", "all_viewports"]);
      expect(scope?.default).toBe("active_viewport");
    });

    it("SHOW_ONLY includes both ancestors and descendants by default for a clean isolation view", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "SHOW_ONLY");
      const anc = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Include Ancestors");
      const desc = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Include Descendants");
      expect(anc?.default).toBe(true);
      expect(desc?.default).toBe(true);
    });

    it("SUPPRESS_COMPONENT supports an audit reason tag (distinguishes design intent vs forgotten suppression)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "SUPPRESS_COMPONENT");
      const reason = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Reason Tag");
      expect(reason?.type).toBe("text");
      expect(reason?.description ?? "").toMatch(/audit|why/i);
    });
  });

  describe("Assembly_Tree — component-tree query", () => {
    it("COMPONENT_TREE supports 3 output formats with nested_json default for downstream tooling", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "COMPONENT_TREE");
      const fmt = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Output Format");
      expect(fmt?.options).toEqual(["nested_json", "flat_list", "indented_text"]);
      expect(fmt?.default).toBe("nested_json");
    });

    it("COMPONENT_TREE Max Depth is non-negative and 0 means unlimited recursion", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "COMPONENT_TREE");
      const d = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Max Depth");
      expect(d?.min).toBe(0);
      expect(d?.default).toBe(0);
      expect(d?.description ?? "").toMatch(/unlimited|0\s*=/i);
    });
  });

  describe("Assembly_Analysis — 3 BOM/mass/interference QA ops", () => {
    it("getOperationsByCategory enumerates exactly 3 Assembly_Analysis operations", () => {
      const ana = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Assembly_Analysis", "assembly_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ana).toEqual(["BOM_EXTRACT", "INTERFERENCE_CHECK", "MASS_PROPERTIES"]);
    });

    it("BOM_EXTRACT supports 3 aggregations and 3 output formats for ERP handoff", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "BOM_EXTRACT");
      const agg = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Aggregation");
      const fmt = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Output Format");
      expect(agg?.options).toEqual(["flat", "indented", "parts_only"]);
      expect(agg?.default).toBe("indented");
      expect(fmt?.options).toEqual(["json", "csv", "excel"]);
      expect(fmt?.default).toBe("csv");
    });

    it("MASS_PROPERTIES supports 3 reference frames for inertia-tensor expression", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "MASS_PROPERTIES");
      const frame = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Reference Frame");
      expect(frame?.options).toEqual(["world", "assembly_origin", "selected_axis_system"]);
      expect(frame?.default).toBe("world");
    });

    it("INTERFERENCE_CHECK supports both interference and clearance modes with sane minimum-clearance default", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", "INTERFERENCE_CHECK");
      const mode = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Mode");
      const clear = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Minimum Clearance");
      expect(mode?.options).toEqual(["interference_only", "clearance_check", "both"]);
      expect(mode?.default).toBe("interference_only");
      expect(clear?.unit).toBe("mm");
      expect(clear?.default).toBe(0.5);
      expect(clear?.min).toBe(0);
    });
  });

  describe("listOperations — drawing_operations module", () => {
    it("returns exactly 21 drawing operations matching the canonical hyperCAD-S drawing list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("drawing_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(21);
      expect(ops.sort()).toEqual([...KNOWN_DRAWING_OPS].sort());
    });
  });

  describe("Drawing_View — 6 view ops", () => {
    it("getOperationsByCategory enumerates exactly 6 Drawing_View operations", () => {
      const views = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Drawing_View", "drawing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(views).toEqual([
        "VIEW_AUXILIARY", "VIEW_BROKEN_OUT", "VIEW_CROP", "VIEW_DETAIL",
        "VIEW_PROJECTION", "VIEW_SECTION",
      ]);
    });

    it("VIEW_PROJECTION enumerates the 11 standard projection types (6 ortho + 4 iso + user_defined)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "VIEW_PROJECTION");
      const view = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "View Type");
      expect(view?.options).toEqual([
        "front", "top", "right", "left", "back", "bottom",
        "iso_se", "iso_sw", "iso_ne", "iso_nw", "user_defined",
      ]);
      expect(view?.default).toBe("front");
      expect(view?.required).toBe(true);
    });

    it("VIEW_PROJECTION supports first_angle and third_angle conventions, defaulting to third_angle", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "VIEW_PROJECTION");
      const conv = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Projection Convention");
      expect(conv?.options).toEqual(["first_angle", "third_angle"]);
      expect(conv?.default).toBe("third_angle");
    });

    it("VIEW_SECTION supports the 5 standard section sub-types (full/half/aligned/offset/broken)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "VIEW_SECTION");
      const sub = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Section Type");
      expect(sub?.options).toEqual(["full", "half", "aligned", "offset", "broken"]);
      expect(sub?.default).toBe("full");
      expect(sub?.required).toBe(true);
    });

    it("VIEW_DETAIL supports circular and polygon boundaries", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "VIEW_DETAIL");
      const b = op?.tabs?.["Source"]?.parameters?.find((p) => p.name === "Boundary Type");
      expect(b?.options).toEqual(["circle", "polygon"]);
      expect(b?.default).toBe("circle");
    });

    it("VIEW_BROKEN_OUT exposes 3 cut-depth modes (to_geometry / by_distance / to_plane)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "VIEW_BROKEN_OUT");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Cut Depth Mode");
      expect(mode?.options).toEqual(["to_geometry", "by_distance", "to_plane"]);
      expect(mode?.default).toBe("to_geometry");
    });
  });

  describe("Drawing_Annotation — 8 annotation ops including GD&T", () => {
    it("getOperationsByCategory enumerates exactly 8 Drawing_Annotation operations", () => {
      const ann = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Drawing_Annotation", "drawing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(ann).toEqual([
        "DIM_ANGULAR", "DIM_CHAMFER", "DIM_DIAMETER", "DIM_LINEAR", "DIM_RADIUS",
        "GDT_FRAME", "NOTE", "SYMBOL",
      ]);
    });

    it("DIM_LINEAR exposes 5 tolerance types including iso_286_fit for shaft/hole callouts", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "DIM_LINEAR");
      const tol = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Tolerance Type");
      expect(tol?.options).toEqual(["none", "limits", "plus_minus", "asymmetric", "iso_286_fit"]);
      expect(tol?.default).toBe("none");
    });

    it("DIM_LINEAR supports 4 placement directions (horizontal/vertical/aligned/rotated)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "DIM_LINEAR");
      const dir = op?.tabs?.["Source"]?.parameters?.find((p) => p.name === "Direction");
      expect(dir?.options).toEqual(["horizontal", "vertical", "aligned", "rotated"]);
      expect(dir?.default).toBe("aligned");
    });

    it("DIM_ANGULAR supports 3 angle senses (acute/obtuse/reflex)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "DIM_ANGULAR");
      const sense = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Angle Sense");
      expect(sense?.options).toEqual(["acute", "obtuse", "reflex"]);
      expect(sense?.default).toBe("acute");
    });

    it("GDT_FRAME enumerates all 14 ASME Y14.5-2018 / ISO 1101 symbols", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "GDT_FRAME");
      const sym = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Symbol");
      expect(sym?.options).toEqual([
        "straightness", "flatness", "circularity", "cylindricity",
        "profile_line", "profile_surface",
        "perpendicularity", "angularity", "parallelism",
        "position", "concentricity", "symmetry",
        "circular_runout", "total_runout",
      ]);
      expect(sym?.options).toHaveLength(14);
      expect(sym?.required).toBe(true);
    });

    it("GDT_FRAME exposes the 4 standard material-condition modifiers (none/MMC/LMC/RFS)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "GDT_FRAME");
      const mc = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Material Condition");
      expect(mc?.options).toEqual(["none", "MMC", "LMC", "RFS"]);
      expect(mc?.default).toBe("none");
    });

    it("SYMBOL covers the 6 standard drafting-symbol families (surface/weld/datums/center)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "SYMBOL");
      const t = op?.tabs?.["Source"]?.parameters?.find((p) => p.name === "Symbol Type");
      expect(t?.options).toEqual([
        "surface_finish", "weld", "datum_target", "datum_feature", "centerline", "centermark",
      ]);
      expect(t?.required).toBe(true);
    });
  });

  describe("Drawing_Hatch — pattern fill", () => {
    it("HATCHING enumerates the 5 standard ANSI/ISO patterns plus user_defined", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "HATCHING");
      const p = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Pattern");
      expect(p?.options).toEqual([
        "ANSI31_steel", "ANSI32_cast_iron", "ANSI33_bronze", "ANSI37_lead",
        "ISO_solid", "user_defined",
      ]);
      expect(p?.default).toBe("ANSI31_steel");
    });
  });

  describe("Drawing_Table — 3 sheet-level tables", () => {
    it("getOperationsByCategory enumerates exactly 3 Drawing_Table operations", () => {
      const tbl = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Drawing_Table", "drawing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(tbl).toEqual(["BOM_TABLE", "REVISION_TABLE", "TITLE_BLOCK"]);
    });

    it("TITLE_BLOCK supports the 5 major drawing standards (ASME / ISO / DIN / JIS / company)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "TITLE_BLOCK");
      const std = op?.tabs?.["Properties"]?.parameters?.find((p) => p.name === "Drawing Standard");
      expect(std?.options).toEqual(["ASME_Y14.5", "ISO_1101", "DIN", "JIS", "company"]);
      expect(std?.default).toBe("ASME_Y14.5");
    });

    it("REVISION_TABLE supports 3 source modes (PDM / manual / hybrid)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "REVISION_TABLE");
      const src = op?.tabs?.["Source"]?.parameters?.find((p) => p.name === "Source");
      expect(src?.options).toEqual(["pdm_history", "manual", "hybrid"]);
      expect(src?.default).toBe("pdm_history");
    });

    it("BOM_TABLE auto-balloons items by default to link rows to ballooned views", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "BOM_TABLE");
      const balloon = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Auto Balloon Items");
      expect(balloon?.type).toBe("checkbox");
      expect(balloon?.default).toBe(true);
    });
  });

  describe("Drawing_Style — 3 style ops (LAYER / LINETYPE / PLOT_STYLE)", () => {
    it("getOperationsByCategory enumerates exactly 3 Drawing_Style operations", () => {
      const sty = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Drawing_Style", "drawing_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(sty).toEqual(["LAYER", "LINETYPE", "PLOT_STYLE"]);
    });

    it("LAYER linetype enumerates the 6 standard CAD linetypes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "LAYER");
      const lt = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Linetype");
      expect(lt?.options).toEqual([
        "continuous", "dashed", "dashdot", "dotted", "phantom", "centerline",
      ]);
      expect(lt?.default).toBe("continuous");
    });

    it("PLOT_STYLE bounds Screening to [0, 100] for print-intensity control", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "PLOT_STYLE");
      const scr = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Screening");
      expect(scr?.min).toBe(0);
      expect(scr?.max).toBe(100);
      expect(scr?.default).toBe(100);
    });

    it("PLOT_STYLE color mode covers 4 strategies (object / black / grayscale / table_override)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", "PLOT_STYLE");
      const cm = op?.tabs?.["Style"]?.parameters?.find((p) => p.name === "Color Mode");
      expect(cm?.options).toEqual(["use_object_color", "force_black", "grayscale", "color_table_override"]);
      expect(cm?.default).toBe("force_black");
    });
  });

  describe("listOperations — datum_operations module", () => {
    it("returns exactly 6 datum operations matching the canonical hyperCAD-S datum list", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("datum_operations").map((o) => o.operation_id);
      expect(ops).toHaveLength(6);
      expect(ops.sort()).toEqual([...KNOWN_DATUM_OPS].sort());
    });
  });

  describe("Datum_Plane — 10-mode reference plane", () => {
    it("REFERENCE_PLANE enumerates all 10 standard creation modes per OPEN MIND reference manual", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_PLANE");
      const mode = op?.tabs?.["References"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "offset_from_plane",
        "three_points",
        "tangent_to_face",
        "midplane",
        "normal_to_curve",
        "through_two_edges",
        "angle_to_plane",
        "projection_of_curve",
        "coordinate_aligned",
        "from_axis_pair",
      ]);
      expect(mode?.options).toHaveLength(10);
      expect(mode?.required).toBe(true);
    });

    it("REFERENCE_PLANE Curve Parameter is bounded [0, 1] for normal_to_curve mode", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_PLANE");
      const cp = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Curve Parameter");
      expect(cp?.min).toBe(0);
      expect(cp?.max).toBe(1);
      expect(cp?.default).toBe(0.5);
    });

    it("REFERENCE_PLANE coordinate_aligned mode exposes XY/XZ/YZ origin-plane choices", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_PLANE");
      const cp = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Coordinate Plane");
      expect(cp?.options).toEqual(["XY", "XZ", "YZ"]);
    });
  });

  describe("Datum_Axis — 8-mode reference axis", () => {
    it("REFERENCE_AXIS enumerates all 8 standard creation modes per OPEN MIND reference manual", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_AXIS");
      const mode = op?.tabs?.["References"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "two_points",
        "edge_or_line",
        "intersection_two_planes",
        "normal_to_face_at_point",
        "through_cylindrical_face",
        "through_conical_face_axis",
        "from_three_points_normal",
        "coordinate_axis",
      ]);
      expect(mode?.options).toHaveLength(8);
    });

    it("REFERENCE_AXIS supports finite/ray/infinite length modes (default finite for editor display)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_AXIS");
      const lm = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Length Mode");
      expect(lm?.options).toEqual(["finite", "ray", "infinite"]);
      expect(lm?.default).toBe("finite");
    });

    it("REFERENCE_AXIS coordinate_axis mode targets X / Y / Z world axes", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_AXIS");
      const ca = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Coordinate Axis");
      expect(ca?.options).toEqual(["X", "Y", "Z"]);
    });
  });

  describe("Datum_Point — 12-mode reference point", () => {
    it("REFERENCE_POINT enumerates all 12 standard creation modes per OPEN MIND reference manual", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_POINT");
      const mode = op?.tabs?.["References"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "absolute_xyz",
        "relative_to_point",
        "midpoint_of_edge",
        "endpoint_of_edge",
        "intersection_of_lines",
        "intersection_curve_surface",
        "projection_to_face",
        "center_of_circle_arc",
        "center_of_face",
        "centroid_of_body",
        "by_curve_parameter",
        "by_face_uv",
      ]);
      expect(mode?.options).toHaveLength(12);
    });

    it("REFERENCE_POINT by_face_uv exposes both U and V bounded to [0, 1]", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_POINT");
      const u = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "U");
      const v = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "V");
      expect(u?.min).toBe(0);
      expect(u?.max).toBe(1);
      expect(v?.min).toBe(0);
      expect(v?.max).toBe(1);
    });
  });

  describe("Datum_CoordSys — 6-mode coordinate system with hyperMILL WCS bridge", () => {
    it("COORDINATE_SYSTEM enumerates all 6 standard alignment strategies", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "COORDINATE_SYSTEM");
      const mode = op?.tabs?.["References"]?.parameters?.find((p) => p.name === "Mode");
      expect(mode?.options).toEqual([
        "origin_x_y",
        "origin_two_axes",
        "three_points",
        "from_face",
        "aligned_to_world",
        "from_existing_coordsys",
      ]);
      expect(mode?.options).toHaveLength(6);
    });

    it("COORDINATE_SYSTEM exposes WCS Tag for hyperMILL post-processor offset register emission", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "COORDINATE_SYSTEM");
      const tag = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "WCS Tag");
      expect(tag?.type).toBe("text");
      expect(tag?.description ?? "").toMatch(/G54|WCS|NC/i);
    });
  });

  describe("Datum_Curve — 3D reference spline + polyline", () => {
    it("getOperationsByCategory enumerates exactly 2 Datum_Curve operations", () => {
      const curves = HyperCADCADFunctionIndexEngine
        .getOperationsByCategory("Datum_Curve", "datum_operations")
        .map((o) => o.operation_id)
        .sort();
      expect(curves).toEqual(["REFERENCE_POLYLINE_3D", "REFERENCE_SPLINE_3D"]);
    });

    it("REFERENCE_SPLINE_3D shares 3-mode + knot-vector taxonomy with sketch SPLINE op", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_SPLINE_3D");
      const mode = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Mode");
      const knot = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Knot Vector Type");
      expect(mode?.options).toEqual(["interpolation", "control_polygon"]);
      expect(mode?.default).toBe("interpolation");
      expect(knot?.options).toEqual(["uniform", "centripetal", "chord_length"]);
      expect(knot?.default).toBe("centripetal");
    });

    it("REFERENCE_POLYLINE_3D supports auto-smoothing of sharp corners (off by default to preserve facets)", () => {
      const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", "REFERENCE_POLYLINE_3D");
      const smooth = op?.tabs?.["Geometry"]?.parameters?.find((p) => p.name === "Auto Smooth Sharp Corners");
      expect(smooth?.type).toBe("checkbox");
      expect(smooth?.default).toBe(false);
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
    it("counts exactly 1001 parameters across all 8 shipped modules (242+214+148+83+66+74+118+56)", () => {
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(1001);
    });

    it("sketch module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const sketchTotal = sumParamsForModule("sketch_operations");
      const sketchDeclared = (HyperCADCADFunctionIndexEngine.getModule("sketch_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(sketchTotal).toBe(242);
      expect(sketchDeclared).toBe(242);
    });

    it("solid module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const solidTotal = sumParamsForModule("solid_operations");
      const solidDeclared = (HyperCADCADFunctionIndexEngine.getModule("solid_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(solidTotal).toBe(214);
      expect(solidDeclared).toBe(214);
    });

    it("surface module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const surfaceTotal = sumParamsForModule("surface_operations");
      const surfaceDeclared = (HyperCADCADFunctionIndexEngine.getModule("surface_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(surfaceTotal).toBe(148);
      expect(surfaceDeclared).toBe(148);
    });

    it("healing module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const healingTotal = sumParamsForModule("healing_operations");
      const healingDeclared = (HyperCADCADFunctionIndexEngine.getModule("healing_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(healingTotal).toBe(83);
      expect(healingDeclared).toBe(83);
    });

    it("mesh module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const meshTotal = sumParamsForModule("mesh_operations");
      const meshDeclared = (HyperCADCADFunctionIndexEngine.getModule("mesh_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(meshTotal).toBe(66);
      expect(meshDeclared).toBe(66);
    });

    it("assembly module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const assemblyTotal = sumParamsForModule("assembly_operations");
      const assemblyDeclared = (HyperCADCADFunctionIndexEngine.getModule("assembly_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(assemblyTotal).toBe(74);
      expect(assemblyDeclared).toBe(74);
    });

    it("drawing module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const drawingTotal = sumParamsForModule("drawing_operations");
      const drawingDeclared = (HyperCADCADFunctionIndexEngine.getModule("drawing_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(drawingTotal).toBe(118);
      expect(drawingDeclared).toBe(118);
    });

    it("datum module: computed sum exactly equals metadata.totalParameters (catches catalog drift)", () => {
      const datumTotal = sumParamsForModule("datum_operations");
      const datumDeclared = (HyperCADCADFunctionIndexEngine.getModule("datum_operations")?.metadata as { totalParameters?: number })?.totalParameters;
      expect(datumTotal).toBe(56);
      expect(datumDeclared).toBe(56);
    });

    it("getTotalParameterCount equals the sum of per-module computed totals across all 8 modules", () => {
      const sketchTotal = sumParamsForModule("sketch_operations");
      const solidTotal = sumParamsForModule("solid_operations");
      const surfaceTotal = sumParamsForModule("surface_operations");
      const healingTotal = sumParamsForModule("healing_operations");
      const meshTotal = sumParamsForModule("mesh_operations");
      const assemblyTotal = sumParamsForModule("assembly_operations");
      const drawingTotal = sumParamsForModule("drawing_operations");
      const datumTotal = sumParamsForModule("datum_operations");
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(
        sketchTotal + solidTotal + surfaceTotal + healingTotal + meshTotal
        + assemblyTotal + drawingTotal + datumTotal,
      );
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

    it("every solid op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("solid_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("solid_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every surface op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("surface_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("surface_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every healing op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("healing_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("healing_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every mesh op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("mesh_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("mesh_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every assembly op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("assembly_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("assembly_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every drawing op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("drawing_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("drawing_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });

    it("every datum op has a substantive description", () => {
      const ops = HyperCADCADFunctionIndexEngine.listOperations("datum_operations");
      const failures: string[] = [];
      for (const opInfo of ops) {
        const op = HyperCADCADFunctionIndexEngine.getOperation("datum_operations", opInfo.operation_id);
        const desc = op?.description ?? "";
        if (desc.length < 20) failures.push(`${opInfo.operation_id}: '${desc}'`);
      }
      expect(failures).toEqual([]);
    });
  });
});
