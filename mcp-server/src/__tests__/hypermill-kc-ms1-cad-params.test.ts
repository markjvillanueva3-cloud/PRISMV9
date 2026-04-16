/**
 * HM-KC-MS1 CAD Parameter Catalog Tests
 *
 * Tests for U-HKC07 (Sketch Constraint Schemas) and U-HKC08 (Solid Modeling Schemas).
 * All tests validate specific values, ranges, and parsing behavior — no toBeTruthy() stubs.
 *
 * @milestone HM-KC-MS1
 */

import { describe, it, expect } from "vitest";
import {
  coincidentConstraintSchema,
  tangentConstraintSchema,
  equalConstraintSchema,
  parallelConstraintSchema,
  perpendicularConstraintSchema,
  horizontalConstraintSchema,
  verticalConstraintSchema,
  dimensionConstraintSchema,
  radiusConstraintSchema,
  angleConstraintSchema,
  concentricConstraintSchema,
  symmetricConstraintSchema,
  midpointConstraintSchema,
  fixConstraintSchema,
  lockConstraintSchema,
  offsetConstraintSchema,
  colinearConstraintSchema,
  sketchPatternConstraintSchema,
  trimConstraintSchema,
  extendConstraintSchema,
  SKETCH_CONSTRAINT_SCHEMA_MAP,
  SKETCH_CONSTRAINT_METADATA,
  SKETCH_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/sketchConstraintSchemas.js";

import {
  extrudeSchema,
  revolveSchema,
  sweepSchema,
  loftSchema,
  shellSchema,
  draftSchema,
  filletSchema,
  chamferSchema,
  booleanSchema,
  pattern3dSchema,
  mirrorSchema,
  SOLID_OPERATION_SCHEMA_MAP,
  SOLID_OPERATION_METADATA,
  SOLID_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/solidModelingSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC07: Sketch Constraint Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC07: Sketch Constraint Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 20 constraint types", () => {
      expect(Object.keys(SKETCH_CONSTRAINT_SCHEMA_MAP).length).toBe(20);
    });

    it("has metadata for all 20 constraints", () => {
      expect(Object.keys(SKETCH_CONSTRAINT_METADATA).length).toBe(20);
    });

    it("schema map keys match metadata keys", () => {
      const schemaKeys = Object.keys(SKETCH_CONSTRAINT_SCHEMA_MAP).sort();
      const metaKeys = Object.keys(SKETCH_CONSTRAINT_METADATA).sort();
      expect(schemaKeys).toEqual(metaKeys);
    });

    it("total param count is 63", () => {
      expect(SKETCH_TOTAL_PARAM_COUNT).toBe(63);
    });

    it("contains all expected constraint names", () => {
      const expected = [
        "coincident", "tangent", "equal", "parallel", "perpendicular",
        "horizontal", "vertical", "dimension", "radius", "angle",
        "concentric", "symmetric", "midpoint", "fix", "lock",
        "offset", "colinear", "pattern", "trim", "extend",
      ];
      for (const name of expected) {
        expect(SKETCH_CONSTRAINT_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Coincident constraint", () => {
    it("parses with defaults", () => {
      const result = coincidentConstraintSchema.parse({});
      expect(result.point_snap_tolerance).toBe(0.01);
      expect(result.merge_points).toBe(true);
    });

    it("rejects tolerance below 0.001", () => {
      expect(() =>
        coincidentConstraintSchema.parse({ point_snap_tolerance: 0.0001 })
      ).toThrow();
    });

    it("rejects tolerance above 1.0", () => {
      expect(() =>
        coincidentConstraintSchema.parse({ point_snap_tolerance: 5.0 })
      ).toThrow();
    });

    it("accepts valid tolerance", () => {
      const result = coincidentConstraintSchema.parse({ point_snap_tolerance: 0.05 });
      expect(result.point_snap_tolerance).toBe(0.05);
    });
  });

  describe("Tangent constraint", () => {
    it("parses with defaults", () => {
      const result = tangentConstraintSchema.parse({});
      expect(result.curve_type).toBe("line");
      expect(result.tangent_side).toBe("auto");
      expect(result.continuity_order).toBe("g1");
    });

    it("accepts all curve types", () => {
      const types = ["arc", "b_spline", "circle", "conic", "ellipse", "line", "spline"];
      for (const t of types) {
        const result = tangentConstraintSchema.parse({ curve_type: t });
        expect(result.curve_type).toBe(t);
      }
    });

    it("rejects invalid curve type", () => {
      expect(() =>
        tangentConstraintSchema.parse({ curve_type: "polygon" })
      ).toThrow();
    });
  });

  describe("Dimension constraint", () => {
    it("parses with explicit value", () => {
      const result = dimensionConstraintSchema.parse({ value: 50.0 });
      expect(result.value).toBe(50.0);
      expect(result.tolerance_upper).toBe(0.05);
      expect(result.tolerance_lower).toBe(-0.05);
      expect(result.display_format).toBe("nominal");
      expect(result.driving).toBe(true);
    });

    it("requires value field", () => {
      expect(() => dimensionConstraintSchema.parse({})).toThrow();
    });

    it("rejects negative value", () => {
      expect(() => dimensionConstraintSchema.parse({ value: -10 })).toThrow();
    });

    it("accepts all display formats", () => {
      const formats = ["bilateral", "limit", "nominal", "unilateral_lower", "unilateral_upper"];
      for (const f of formats) {
        const result = dimensionConstraintSchema.parse({ value: 25, display_format: f });
        expect(result.display_format).toBe(f);
      }
    });

    it("has 5 parameters in metadata", () => {
      expect(SKETCH_CONSTRAINT_METADATA.dimension.paramCount).toBe(5);
    });
  });

  describe("Radius constraint", () => {
    it("parses with value", () => {
      const result = radiusConstraintSchema.parse({ value: 5.0 });
      expect(result.value).toBe(5.0);
      expect(result.center_locked).toBe(false);
      expect(result.min_radius).toBe(0.1);
      expect(result.max_radius).toBe(10000);
      expect(result.display_diameter).toBe(false);
    });

    it("rejects zero radius", () => {
      expect(() => radiusConstraintSchema.parse({ value: 0 })).toThrow();
    });
  });

  describe("Angle constraint", () => {
    it("parses 45 degree angle", () => {
      const result = angleConstraintSchema.parse({ value: 45 });
      expect(result.value).toBe(45);
      expect(result.reference_line).toBe("sketch_x_axis");
      expect(result.direction).toBe("ccw");
      expect(result.supplementary).toBe(false);
    });

    it("accepts full 360 range", () => {
      expect(angleConstraintSchema.parse({ value: 0 }).value).toBe(0);
      expect(angleConstraintSchema.parse({ value: 360 }).value).toBe(360);
    });

    it("rejects angle > 360", () => {
      expect(() => angleConstraintSchema.parse({ value: 361 })).toThrow();
    });
  });

  describe("Pattern constraint", () => {
    it("parses linear pattern defaults", () => {
      const result = sketchPatternConstraintSchema.parse({});
      expect(result.pattern_type).toBe("linear");
      expect(result.count).toBe(2);
      expect(result.spacing).toBe(10);
      expect(result.angle).toBe(0);
      expect(result.associative).toBe(true);
    });

    it("rejects count < 2", () => {
      expect(() => sketchPatternConstraintSchema.parse({ count: 1 })).toThrow();
    });

    it("accepts circular pattern", () => {
      const result = sketchPatternConstraintSchema.parse({
        pattern_type: "circular",
        count: 8,
        spacing: 45,
      });
      expect(result.pattern_type).toBe("circular");
      expect(result.count).toBe(8);
      expect(result.spacing).toBe(45);
    });
  });

  describe("Offset constraint", () => {
    it("accepts negative offset", () => {
      const result = offsetConstraintSchema.parse({
        distance: -5.0,
        reference_entity: "line_1",
      });
      expect(result.distance).toBe(-5.0);
      expect(result.flip_side).toBe(false);
      expect(result.bidirectional).toBe(false);
    });

    it("requires reference_entity", () => {
      expect(() => offsetConstraintSchema.parse({ distance: 10 })).toThrow();
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 20 constraints have acPythonSetter strings", () => {
      for (const [name, meta] of Object.entries(SKETCH_CONSTRAINT_METADATA)) {
        expect(meta.acPythonSetter).toBeDefined();
        expect(meta.acPythonSetter.length).toBeGreaterThan(10);
        expect(meta.acPythonSetter).toContain("hm.sketch.");
      }
    });

    it("all constraints have descriptions", () => {
      for (const [name, meta] of Object.entries(SKETCH_CONSTRAINT_METADATA)) {
        expect(meta.description.length).toBeGreaterThan(10);
      }
    });

    it("coincident setter includes merge and tolerance params", () => {
      const setter = SKETCH_CONSTRAINT_METADATA.coincident.acPythonSetter;
      expect(setter).toContain("tolerance=");
      expect(setter).toContain("merge=");
    });
  });

  describe("Equal constraint", () => {
    it("requires both entity references", () => {
      expect(() => equalConstraintSchema.parse({})).toThrow();
      expect(() =>
        equalConstraintSchema.parse({ reference_entity: "a" })
      ).toThrow();
    });

    it("parses with both entities", () => {
      const result = equalConstraintSchema.parse({
        reference_entity: "line_1",
        target_entity: "line_2",
      });
      expect(result.quantity).toBe("length");
    });
  });

  describe("Fix and Lock constraints", () => {
    it("fix defaults to position only", () => {
      const result = fixConstraintSchema.parse({});
      expect(result.fix_position).toBe(true);
      expect(result.fix_rotation).toBe(false);
      expect(result.fix_size).toBe(false);
    });

    it("lock defaults to both axes", () => {
      const result = lockConstraintSchema.parse({});
      expect(result.lock_x).toBe(true);
      expect(result.lock_y).toBe(true);
      expect(result.lock_all).toBe(false);
    });
  });

  describe("Trim and Extend constraints", () => {
    it("trim defaults", () => {
      const result = trimConstraintSchema.parse({});
      expect(result.trim_to_intersection).toBe(true);
      expect(result.keep_side).toBe("auto");
      expect(result.delete_remaining).toBe(false);
    });

    it("extend requires target entity", () => {
      expect(() => extendConstraintSchema.parse({})).toThrow();
    });

    it("extend parses with target", () => {
      const result = extendConstraintSchema.parse({ extend_to_entity: "boundary_1" });
      expect(result.gap_tolerance).toBe(0.1);
      expect(result.tangent_extension).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC08: Solid Modeling Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC08: Solid Modeling Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 11 operation types", () => {
      expect(Object.keys(SOLID_OPERATION_SCHEMA_MAP).length).toBe(11);
    });

    it("has metadata for all 11 operations", () => {
      expect(Object.keys(SOLID_OPERATION_METADATA).length).toBe(11);
    });

    it("schema map keys match metadata keys", () => {
      const schemaKeys = Object.keys(SOLID_OPERATION_SCHEMA_MAP).sort();
      const metaKeys = Object.keys(SOLID_OPERATION_METADATA).sort();
      expect(schemaKeys).toEqual(metaKeys);
    });

    it("total param count is 58", () => {
      expect(SOLID_TOTAL_PARAM_COUNT).toBe(58);
    });

    it("contains all expected operation names", () => {
      const expected = [
        "extrude", "revolve", "sweep", "loft", "shell",
        "draft", "fillet", "chamfer", "boolean", "pattern", "mirror",
      ];
      for (const name of expected) {
        expect(SOLID_OPERATION_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Extrude schema", () => {
    it("parses with required distance", () => {
      const result = extrudeSchema.parse({ distance: 25.0 });
      expect(result.distance).toBe(25.0);
      expect(result.direction).toBe("normal");
      expect(result.taper_angle).toBe(0);
      expect(result.draft_inward).toBe(false);
      expect(result.boolean_type).toBe("new_body");
      expect(result.cap_end).toBe(true);
      expect(result.distance_2).toBe(0);
    });

    it("requires distance field", () => {
      expect(() => extrudeSchema.parse({})).toThrow();
    });

    it("rejects taper angle outside -89 to 89", () => {
      expect(() =>
        extrudeSchema.parse({ distance: 10, taper_angle: 90 })
      ).toThrow();
      expect(() =>
        extrudeSchema.parse({ distance: 10, taper_angle: -90 })
      ).toThrow();
    });

    it("accepts all direction modes", () => {
      const dirs = ["normal", "reverse", "symmetric", "two_sides"];
      for (const d of dirs) {
        const result = extrudeSchema.parse({ distance: 10, direction: d });
        expect(result.direction).toBe(d);
      }
    });

    it("accepts all boolean types", () => {
      const types = ["new_body", "add", "cut", "intersect"];
      for (const t of types) {
        const result = extrudeSchema.parse({ distance: 10, boolean_type: t });
        expect(result.boolean_type).toBe(t);
      }
    });

    it("has 7 parameters in metadata", () => {
      expect(SOLID_OPERATION_METADATA.extrude.paramCount).toBe(7);
    });

    it("marks taper_angle as DFM-critical", () => {
      expect(SOLID_OPERATION_METADATA.extrude.dfmCriticalParams).toContain("taper_angle");
    });
  });

  describe("Revolve schema", () => {
    it("parses with defaults (full 360 revolution)", () => {
      const result = revolveSchema.parse({});
      expect(result.angle).toBe(360);
      expect(result.axis).toBe("sketch_line");
      expect(result.direction).toBe("counter_clockwise");
      expect(result.boolean_type).toBe("new_body");
    });

    it("rejects angle below 0.1", () => {
      expect(() => revolveSchema.parse({ angle: 0 })).toThrow();
    });

    it("accepts partial revolution", () => {
      const result = revolveSchema.parse({ angle: 90, direction: "clockwise" });
      expect(result.angle).toBe(90);
      expect(result.direction).toBe("clockwise");
    });
  });

  describe("Sweep schema", () => {
    it("parses with defaults", () => {
      const result = sweepSchema.parse({});
      expect(result.path_type).toBe("single_path");
      expect(result.twist_angle).toBe(0);
      expect(result.scale_factor).toBe(1.0);
      expect(result.orientation).toBe("follow_path");
      expect(result.merge_tangent_faces).toBe(true);
    });

    it("accepts twist up to 3600 degrees (10 full turns)", () => {
      const result = sweepSchema.parse({ twist_angle: 3600 });
      expect(result.twist_angle).toBe(3600);
    });

    it("accepts negative twist", () => {
      const result = sweepSchema.parse({ twist_angle: -720 });
      expect(result.twist_angle).toBe(-720);
    });
  });

  describe("Loft schema", () => {
    it("parses with defaults", () => {
      const result = loftSchema.parse({});
      expect(result.continuity_start).toBe("g0");
      expect(result.continuity_end).toBe("g0");
      expect(result.guide_mode).toBe("none");
      expect(result.closed_loft).toBe(false);
    });

    it("accepts G2 continuity on both ends", () => {
      const result = loftSchema.parse({
        continuity_start: "g2",
        continuity_end: "g2",
      });
      expect(result.continuity_start).toBe("g2");
      expect(result.continuity_end).toBe("g2");
    });
  });

  describe("Shell schema (DFM-critical)", () => {
    it("requires wall_thickness", () => {
      expect(() => shellSchema.parse({})).toThrow();
    });

    it("parses with valid thickness", () => {
      const result = shellSchema.parse({ wall_thickness: 2.0 });
      expect(result.wall_thickness).toBe(2.0);
      expect(result.direction).toBe("inward");
      expect(result.open_faces_count).toBe(1);
      expect(result.uniform).toBe(true);
    });

    it("rejects wall thickness below 0.1mm", () => {
      expect(() => shellSchema.parse({ wall_thickness: 0.05 })).toThrow();
    });

    it("marks wall_thickness as DFM-critical", () => {
      expect(SOLID_OPERATION_METADATA.shell.dfmCriticalParams).toContain("wall_thickness");
    });
  });

  describe("Draft schema (DFM-critical)", () => {
    it("requires draft_angle", () => {
      expect(() => draftSchema.parse({})).toThrow();
    });

    it("parses typical mold draft of 2 degrees", () => {
      const result = draftSchema.parse({ draft_angle: 2.0 });
      expect(result.draft_angle).toBe(2.0);
      expect(result.pull_direction).toBe("normal_to_parting");
      expect(result.fixed_edge).toBe(true);
      expect(result.stepped_draft).toBe(false);
      expect(result.tangent_propagation).toBe(true);
    });

    it("rejects draft angle > 60 degrees", () => {
      expect(() => draftSchema.parse({ draft_angle: 65 })).toThrow();
    });

    it("marks draft_angle as DFM-critical", () => {
      expect(SOLID_OPERATION_METADATA.draft.dfmCriticalParams).toContain("draft_angle");
    });
  });

  describe("Fillet schema (DFM-critical)", () => {
    it("requires radius", () => {
      expect(() => filletSchema.parse({})).toThrow();
    });

    it("parses constant radius fillet", () => {
      const result = filletSchema.parse({ radius: 3.0 });
      expect(result.radius).toBe(3.0);
      expect(result.variable_radius).toBe(false);
      expect(result.face_blend).toBe(false);
      expect(result.continuity).toBe("g1");
      expect(result.overflow_handling).toBe("trim");
    });

    it("parses variable radius fillet", () => {
      const result = filletSchema.parse({
        radius: 5.0,
        variable_radius: true,
        radius_start: 2.0,
        radius_end: 8.0,
      });
      expect(result.variable_radius).toBe(true);
      expect(result.radius_start).toBe(2.0);
      expect(result.radius_end).toBe(8.0);
    });

    it("accepts G2 continuity for curvature-continuous blend", () => {
      const result = filletSchema.parse({ radius: 1.0, continuity: "g2" });
      expect(result.continuity).toBe("g2");
    });

    it("rejects radius below 0.01", () => {
      expect(() => filletSchema.parse({ radius: 0.001 })).toThrow();
    });

    it("marks radius as DFM-critical", () => {
      expect(SOLID_OPERATION_METADATA.fillet.dfmCriticalParams).toContain("radius");
    });
  });

  describe("Chamfer schema", () => {
    it("parses equal distance chamfer", () => {
      const result = chamferSchema.parse({ distance_1: 1.0 });
      expect(result.chamfer_type).toBe("equal_distance");
      expect(result.distance_1).toBe(1.0);
      expect(result.angle).toBe(45);
      expect(result.flip_direction).toBe(false);
    });

    it("parses two-distance chamfer", () => {
      const result = chamferSchema.parse({
        chamfer_type: "two_distances",
        distance_1: 2.0,
        distance_2: 3.0,
      });
      expect(result.chamfer_type).toBe("two_distances");
      expect(result.distance_2).toBe(3.0);
    });

    it("parses distance-angle chamfer", () => {
      const result = chamferSchema.parse({
        chamfer_type: "distance_angle",
        distance_1: 1.5,
        angle: 30,
      });
      expect(result.angle).toBe(30);
    });
  });

  describe("Boolean schema", () => {
    it("requires operation type", () => {
      expect(() => booleanSchema.parse({})).toThrow();
    });

    it("parses subtract operation", () => {
      const result = booleanSchema.parse({ operation: "subtract" });
      expect(result.operation).toBe("subtract");
      expect(result.keep_tools).toBe(false);
      expect(result.simplify_result).toBe(true);
      expect(result.tolerance).toBe(0.001);
    });

    it("accepts all three operations", () => {
      for (const op of ["unite", "subtract", "intersect"]) {
        const result = booleanSchema.parse({ operation: op });
        expect(result.operation).toBe(op);
      }
    });
  });

  describe("Pattern 3D schema", () => {
    it("parses linear pattern defaults", () => {
      const result = pattern3dSchema.parse({});
      expect(result.pattern_type).toBe("linear");
      expect(result.count_primary).toBe(2);
      expect(result.spacing_primary).toBe(10);
      expect(result.count_secondary).toBe(1);
      expect(result.associative).toBe(true);
      expect(result.suppress_instances).toEqual([]);
    });

    it("rejects count < 2", () => {
      expect(() => pattern3dSchema.parse({ count_primary: 1 })).toThrow();
    });

    it("accepts pattern with suppressed instances", () => {
      const result = pattern3dSchema.parse({
        count_primary: 6,
        suppress_instances: [2, 4],
      });
      expect(result.suppress_instances).toEqual([2, 4]);
    });

    it("has 7 parameters in metadata", () => {
      expect(SOLID_OPERATION_METADATA.pattern.paramCount).toBe(7);
    });
  });

  describe("Mirror schema", () => {
    it("parses with defaults", () => {
      const result = mirrorSchema.parse({});
      expect(result.mirror_plane).toBe("xz");
      expect(result.merge_result).toBe(true);
      expect(result.keep_original).toBe(true);
      expect(result.feature_pattern).toBe(false);
    });

    it("accepts all plane options", () => {
      for (const p of ["xy", "xz", "yz", "custom", "face"]) {
        const result = mirrorSchema.parse({ mirror_plane: p });
        expect(result.mirror_plane).toBe(p);
      }
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 11 operations have acPythonSetter strings", () => {
      for (const [name, meta] of Object.entries(SOLID_OPERATION_METADATA)) {
        expect(meta.acPythonSetter).toBeDefined();
        expect(meta.acPythonSetter.length).toBeGreaterThan(10);
        expect(meta.acPythonSetter).toContain("hm.solid.");
      }
    });

    it("all operations have descriptions", () => {
      for (const [name, meta] of Object.entries(SOLID_OPERATION_METADATA)) {
        expect(meta.description.length).toBeGreaterThan(10);
      }
    });

    it("DFM-critical params are defined for shell, draft, fillet, extrude", () => {
      expect(SOLID_OPERATION_METADATA.shell.dfmCriticalParams).toBeDefined();
      expect(SOLID_OPERATION_METADATA.draft.dfmCriticalParams).toBeDefined();
      expect(SOLID_OPERATION_METADATA.fillet.dfmCriticalParams).toBeDefined();
      expect(SOLID_OPERATION_METADATA.extrude.dfmCriticalParams).toBeDefined();
    });
  });

  describe("Cross-unit: combined param counts", () => {
    it("sketch (63) + solid (58) = 121 total CAD params for S1", () => {
      expect(SKETCH_TOTAL_PARAM_COUNT + SOLID_TOTAL_PARAM_COUNT).toBe(121);
    });

    it("sketch has 20 schema types, solid has 11 = 31 total", () => {
      expect(Object.keys(SKETCH_CONSTRAINT_SCHEMA_MAP).length +
        Object.keys(SOLID_OPERATION_SCHEMA_MAP).length).toBe(31);
    });
  });
});
