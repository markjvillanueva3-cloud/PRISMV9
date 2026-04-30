/**
 * Tests for HyperCADCADFunctionIndexEngine — hyperCAD-S CAD Function Index.
 * @see src/engines/HyperCADCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-HCAD-01 (sketch_operations), U-CAD-FIDX-HCAD-02 (solid_operations),
 *      U-CAD-FIDX-HCAD-03 (surface_operations), U-CAD-FIDX-HCAD-04 (healing_operations)
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

    it("modules array contains the four shipped modules (sketch + solid + surface + healing)", () => {
      const ids = HyperCADCADFunctionIndexEngine.getIndex().modules.map((m) => m.module_id);
      expect(ids).toEqual(["sketch_operations", "solid_operations", "surface_operations", "healing_operations"]);
    });

    it("returns same object identity on repeated calls (cache hit)", () => {
      const a = HyperCADCADFunctionIndexEngine.getIndex();
      const b = HyperCADCADFunctionIndexEngine.getIndex();
      expect(a === b).toBe(true);
    });
  });

  describe("future_modules — expansion roadmap", () => {
    it("declares exactly 4 deferred modules with non-empty scopes (sketch+solid+surface+healing now shipped)", () => {
      const fm = HyperCADCADFunctionIndexEngine.getIndex().future_modules ?? [];
      expect(fm.length).toBe(4);
      for (const f of fm) {
        expect(f.scope.length).toBeGreaterThan(20);
        expect(f.estimated_params).toBeGreaterThan(0);
        expect(f.deferred_to).toMatch(/^U-CAD-FIDX-HCAD-\d+$/);
      }
    });

    it("planned_ids cover mesh/assembly/drawing/datum (healing moved to shipped)", () => {
      const fm = HyperCADCADFunctionIndexEngine.getIndex().future_modules ?? [];
      const ids = fm.map((f) => f.planned_id).sort();
      expect(ids).toEqual([
        "assembly_operations",
        "datum_operations",
        "drawing_operations",
        "mesh_operations",
      ]);
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
    it("listModules returns the four shipped modules in declared order", () => {
      expect(HyperCADCADFunctionIndexEngine.listModules()).toEqual([
        "sketch_operations",
        "solid_operations",
        "surface_operations",
        "healing_operations",
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

    it("listAllOperations sums sketch + solid + surface + healing module operation counts", () => {
      const all = HyperCADCADFunctionIndexEngine.listAllOperations();
      const sketch = HyperCADCADFunctionIndexEngine.listOperations("sketch_operations");
      const solid = HyperCADCADFunctionIndexEngine.listOperations("solid_operations");
      const surface = HyperCADCADFunctionIndexEngine.listOperations("surface_operations");
      const healing = HyperCADCADFunctionIndexEngine.listOperations("healing_operations");
      expect(all.length).toBe(sketch.length + solid.length + surface.length + healing.length);
      expect(all.length).toBe(106);
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
    it("counts exactly 687 parameters across all 4 shipped modules (242 sketch + 214 solid + 148 surface + 83 healing)", () => {
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(687);
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

    it("getTotalParameterCount equals the sum of per-module computed totals", () => {
      const sketchTotal = sumParamsForModule("sketch_operations");
      const solidTotal = sumParamsForModule("solid_operations");
      const surfaceTotal = sumParamsForModule("surface_operations");
      const healingTotal = sumParamsForModule("healing_operations");
      expect(HyperCADCADFunctionIndexEngine.getTotalParameterCount()).toBe(sketchTotal + solidTotal + surfaceTotal + healingTotal);
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
  });
});
