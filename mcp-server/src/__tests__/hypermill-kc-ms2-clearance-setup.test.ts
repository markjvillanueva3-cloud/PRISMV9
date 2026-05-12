/**
 * HM-KC-MS2 Clearance + Setup + Allowance Parameter Schema Tests
 *
 * Tests for U-HKC14 (Clearance, Setup, and Allowance Parameter Schemas).
 * All tests validate specific values, ranges, and parsing behavior — no toBeTruthy() stubs.
 *
 * @milestone HM-KC-MS2
 */

import { describe, it, expect } from "vitest";
import {
  clearancePlaneSchema,
  retractHeightsSchema,
  feedHeightsSchema,
  linkHeightsSchema,
  CLEARANCE_SCHEMA_MAP,
  CLEARANCE_METADATA,
  CLEARANCE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/clearanceSchemas.js";
import {
  jobCreateSchema,
  toolAssignmentSchema,
  restMachiningSchema,
  transformationSchema,
  SETUP_SCHEMA_MAP,
  SETUP_METADATA,
  SETUP_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/setupSchemas.js";
import {
  radialAxialSchema,
  xyCornerSchema,
  negativeAllowanceSchema,
  ALLOWANCE_SCHEMA_MAP,
  ALLOWANCE_METADATA,
  ALLOWANCE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/allowanceSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Clearance Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC14: Clearance Parameter Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 4 operation types in CLEARANCE_SCHEMA_MAP", () => {
      const keys = Object.keys(CLEARANCE_SCHEMA_MAP);
      expect(keys).toHaveLength(4);
    });

    it("contains expected operation type keys", () => {
      const keys = Object.keys(CLEARANCE_SCHEMA_MAP);
      expect(keys).toContain("clearance_plane");
      expect(keys).toContain("retract_heights");
      expect(keys).toContain("feed_heights");
      expect(keys).toContain("link_heights");
    });

    it("has total param count of 24", () => {
      expect(CLEARANCE_TOTAL_PARAM_COUNT).toBe(24);
    });
  });

  // ── Clearance Plane ────────────────────────────────────────────────────

  describe("Clearance Plane schema", () => {
    it("accepts valid clearance plane with all fields", () => {
      const result = clearancePlaneSchema.safeParse({
        mode: "absolute",
        z_value: 50,
        apply_to: "all_operations",
        reference: "stock_top",
        safety_margin: 5.0,
        collision_check: true,
      });
      expect(result.success).toBe(true);
    });

    it("applies default mode of 'relative'", () => {
      const result = clearancePlaneSchema.parse({
        z_value: 100,
        apply_to: "current_only",
        safety_margin: 10,
      });
      expect(result.mode).toBe("relative");
      expect(result.reference).toBe("stock_top");
      expect(result.collision_check).toBe(true);
    });

    it("rejects safety_margin of 0 (must be > 0 for safety)", () => {
      const result = clearancePlaneSchema.safeParse({
        mode: "relative",
        z_value: 50,
        apply_to: "all_operations",
        safety_margin: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative safety_margin", () => {
      const result = clearancePlaneSchema.safeParse({
        mode: "relative",
        z_value: 50,
        apply_to: "all_operations",
        safety_margin: -1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts safety_margin of 0.1 (above 0)", () => {
      const result = clearancePlaneSchema.safeParse({
        mode: "absolute",
        z_value: 50,
        apply_to: "all_operations",
        safety_margin: 0.1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects z_value outside range (-10000..10000)", () => {
      const result = clearancePlaneSchema.safeParse({
        mode: "absolute",
        z_value: 20000,
        apply_to: "all_operations",
        safety_margin: 5,
      });
      expect(result.success).toBe(false);
    });

    it("accepts all mode enum values", () => {
      for (const mode of ["absolute", "relative", "incremental"] as const) {
        const result = clearancePlaneSchema.safeParse({
          mode,
          z_value: 50,
          apply_to: "all_operations",
          safety_margin: 5,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ── Retract Heights ───────────────────────────────────────────────────

  describe("Retract Heights schema", () => {
    it("applies correct defaults", () => {
      const result = retractHeightsSchema.parse({
        retract_mode: "clearance_plane",
      });
      expect(result.retract_height).toBe(50);
      expect(result.rapid_to_retract).toBe(true);
      expect(result.second_retract).toBe(false);
      expect(result.second_retract_height).toBe(100);
      expect(result.between_operations).toBe(true);
    });

    it("rejects retract_height below 0", () => {
      const result = retractHeightsSchema.safeParse({
        retract_mode: "incremental",
        retract_height: -5,
      });
      expect(result.success).toBe(false);
    });

    it("accepts retract_height at maximum 10000", () => {
      const result = retractHeightsSchema.safeParse({
        retract_mode: "absolute",
        retract_height: 10000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Feed Heights ──────────────────────────────────────────────────────

  describe("Feed Heights schema", () => {
    it("applies default feed_height of 2.0 and plunge_feed_rate of 500", () => {
      const result = feedHeightsSchema.parse({
        feed_height_mode: "relative_to_top",
        approach_type: "ramp",
      });
      expect(result.feed_height).toBeCloseTo(2.0, 1);
      expect(result.plunge_feed_rate).toBe(500);
      expect(result.approach_angle).toBeCloseTo(3.0, 1);
    });

    it("rejects plunge_feed_rate below 1 mm/min", () => {
      const result = feedHeightsSchema.safeParse({
        feed_height_mode: "absolute",
        approach_type: "direct",
        plunge_feed_rate: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects approach_angle above 90 degrees", () => {
      const result = feedHeightsSchema.safeParse({
        feed_height_mode: "incremental",
        approach_type: "helix",
        approach_angle: 95,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Link Heights ──────────────────────────────────────────────────────

  describe("Link Heights schema", () => {
    it("applies default link_mode of 'optimized'", () => {
      const result = linkHeightsSchema.parse({});
      expect(result.link_mode).toBe("optimized");
      expect(result.min_link_height).toBeCloseTo(2.0, 1);
      expect(result.optimize_rapids).toBe(true);
      expect(result.avoid_clamps).toBe(true);
      expect(result.clamp_clearance).toBeCloseTo(5.0, 1);
      expect(result.max_link_distance).toBe(0);
    });

    it("rejects clamp_clearance above 100mm", () => {
      const result = linkHeightsSchema.safeParse({
        clamp_clearance: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── AC Python setter namespace ────────────────────────────────────────

  describe("AC Python setter namespace", () => {
    it("all clearance setters use 'hm.clearance.' prefix", () => {
      const entries = Object.entries(CLEARANCE_METADATA);
      expect(entries).toHaveLength(4);
      for (const [key, meta] of entries) {
        expect(meta.acPythonSetter.startsWith("hm.clearance.")).toBe(true);
      }
    });

    it("setter names match schema map keys", () => {
      for (const key of Object.keys(CLEARANCE_SCHEMA_MAP)) {
        const setter = CLEARANCE_METADATA[key as keyof typeof CLEARANCE_METADATA].acPythonSetter;
        expect(setter).toBe(`hm.clearance.${key}`);
      }
    });
  });

  // ── Metadata param counts ─────────────────────────────────────────────

  describe("Metadata param counts", () => {
    it("clearance_plane has 6 params", () => {
      expect(CLEARANCE_METADATA.clearance_plane.paramCount).toBe(6);
    });

    it("retract_heights has 6 params", () => {
      expect(CLEARANCE_METADATA.retract_heights.paramCount).toBe(6);
    });

    it("feed_heights has 6 params", () => {
      expect(CLEARANCE_METADATA.feed_heights.paramCount).toBe(6);
    });

    it("link_heights has 6 params", () => {
      expect(CLEARANCE_METADATA.link_heights.paramCount).toBe(6);
    });
  });

  // ── DFM-critical params ───────────────────────────────────────────────

  describe("DFM-critical params in clearance metadata", () => {
    it("clearance_plane lists safety_margin as DFM-critical", () => {
      const dfm = CLEARANCE_METADATA.clearance_plane.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("safety_margin");
      expect(dfm).toHaveLength(1);
    });

    it("feed_heights lists plunge_feed_rate as DFM-critical", () => {
      const dfm = CLEARANCE_METADATA.feed_heights.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("plunge_feed_rate");
      expect(dfm).toHaveLength(1);
    });

    it("retract_heights has no DFM-critical params", () => {
      expect(CLEARANCE_METADATA.retract_heights.dfmCriticalParams).toBeUndefined();
    });

    it("link_heights has no DFM-critical params", () => {
      expect(CLEARANCE_METADATA.link_heights.dfmCriticalParams).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Setup Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC14: Setup Parameter Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 4 operation types in SETUP_SCHEMA_MAP", () => {
      const keys = Object.keys(SETUP_SCHEMA_MAP);
      expect(keys).toHaveLength(4);
    });

    it("contains expected operation type keys", () => {
      const keys = Object.keys(SETUP_SCHEMA_MAP);
      expect(keys).toContain("job_create");
      expect(keys).toContain("tool_assignment");
      expect(keys).toContain("rest_machining");
      expect(keys).toContain("transformation");
    });

    it("has total param count of 20", () => {
      expect(SETUP_TOTAL_PARAM_COUNT).toBe(20);
    });
  });

  // ── Job Create ────────────────────────────────────────────────────────

  describe("Job Create schema", () => {
    it("accepts valid job with required fields", () => {
      const result = jobCreateSchema.safeParse({
        job_name: "OP10_ROUGH",
        operation_type: "milling",
        coordinate_system: "g54",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.job_name).toBe("OP10_ROUGH");
        expect(result.data.machine_id).toBeUndefined();
        expect(result.data.post_processor).toBeUndefined();
      }
    });

    it("rejects empty job_name", () => {
      const result = jobCreateSchema.safeParse({
        job_name: "",
        operation_type: "milling",
        coordinate_system: "g54",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all operation_type enum values", () => {
      for (const opType of ["milling", "turning", "mill_turn", "drilling", "edm"] as const) {
        const result = jobCreateSchema.safeParse({
          job_name: "TEST",
          operation_type: opType,
          coordinate_system: "absolute",
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all coordinate_system enum values", () => {
      for (const cs of ["absolute", "g54", "g55", "g56", "g57", "g58", "g59"] as const) {
        const result = jobCreateSchema.safeParse({
          job_name: "TEST",
          operation_type: "milling",
          coordinate_system: cs,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts optional machine_id and post_processor", () => {
      const result = jobCreateSchema.safeParse({
        job_name: "OP20_FINISH",
        operation_type: "turning",
        coordinate_system: "g55",
        machine_id: "HAAS_VF2",
        post_processor: "fanuc_30i",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.machine_id).toBe("HAAS_VF2");
        expect(result.data.post_processor).toBe("fanuc_30i");
      }
    });
  });

  // ── Tool Assignment ───────────────────────────────────────────────────

  describe("Tool Assignment schema", () => {
    it("rejects tool_number of 0 (below minimum 1)", () => {
      const result = toolAssignmentSchema.safeParse({
        tool_number: 0,
        tool_name: "EM_12",
        length_offset: 1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts tool_number of 1 (minimum)", () => {
      const result = toolAssignmentSchema.safeParse({
        tool_number: 1,
        tool_name: "EM_12",
        length_offset: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts tool_number of 9999 (maximum)", () => {
      const result = toolAssignmentSchema.safeParse({
        tool_number: 9999,
        tool_name: "EM_12",
        length_offset: 1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects tool_number of 10000 (above maximum 9999)", () => {
      const result = toolAssignmentSchema.safeParse({
        tool_number: 10000,
        tool_name: "EM_12",
        length_offset: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer tool_number", () => {
      const result = toolAssignmentSchema.safeParse({
        tool_number: 1.5,
        tool_name: "EM_12",
        length_offset: 1,
      });
      expect(result.success).toBe(false);
    });

    it("applies default coolant_mode of 'flood'", () => {
      const result = toolAssignmentSchema.parse({
        tool_number: 5,
        tool_name: "DRILL_8",
        length_offset: 5,
      });
      expect(result.coolant_mode).toBe("flood");
      expect(result.diameter_offset).toBe(0);
    });

    it("accepts all coolant_mode enum values", () => {
      for (const mode of ["off", "flood", "mist", "through_tool", "air_blast"] as const) {
        const result = toolAssignmentSchema.safeParse({
          tool_number: 10,
          tool_name: "EM_6",
          length_offset: 10,
          coolant_mode: mode,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ── Rest Machining ────────────────────────────────────────────────────

  describe("Rest Machining schema", () => {
    it("applies correct defaults", () => {
      const result = restMachiningSchema.parse({
        source_operation: "OP10_ROUGH",
        stock_recognition: "from_previous",
        rest_strategy: "auto",
      });
      expect(result.min_rest_width).toBeCloseTo(0.5, 1);
      expect(result.add_overlap).toBeCloseTo(0.5, 1);
    });

    it("rejects min_rest_width below 0.01mm", () => {
      const result = restMachiningSchema.safeParse({
        source_operation: "OP10",
        stock_recognition: "from_stock",
        rest_strategy: "contour",
        min_rest_width: 0.001,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty source_operation", () => {
      const result = restMachiningSchema.safeParse({
        source_operation: "",
        stock_recognition: "from_ipw",
        rest_strategy: "pencil",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Transformation ────────────────────────────────────────────────────

  describe("Transformation schema", () => {
    it("accepts valid transformation with all fields", () => {
      const result = transformationSchema.safeParse({
        transform_type: "translate",
        translate_vector: { x: 100, y: 0, z: 0 },
        rotation_axis: "z",
        rotation_angle: 0,
        keep_original: true,
      });
      expect(result.success).toBe(true);
    });

    it("applies default keep_original of true", () => {
      const result = transformationSchema.parse({
        transform_type: "rotate",
        translate_vector: { x: 0, y: 0, z: 0 },
        rotation_axis: "z",
        rotation_angle: 90,
      });
      expect(result.keep_original).toBe(true);
    });

    it("rejects rotation_angle outside -360..360", () => {
      const result = transformationSchema.safeParse({
        transform_type: "rotate",
        translate_vector: { x: 0, y: 0, z: 0 },
        rotation_axis: "x",
        rotation_angle: 400,
      });
      expect(result.success).toBe(false);
    });

    it("accepts all transform_type enum values", () => {
      for (const tt of ["translate", "rotate", "mirror", "pattern"] as const) {
        const result = transformationSchema.safeParse({
          transform_type: tt,
          translate_vector: { x: 0, y: 0, z: 0 },
          rotation_axis: "y",
          rotation_angle: 0,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ── AC Python setter namespace ────────────────────────────────────────

  describe("AC Python setter namespace", () => {
    it("all setup setters use 'hm.setup.' prefix", () => {
      const entries = Object.entries(SETUP_METADATA);
      expect(entries).toHaveLength(4);
      for (const [key, meta] of entries) {
        expect(meta.acPythonSetter.startsWith("hm.setup.")).toBe(true);
      }
    });

    it("setter names match schema map keys", () => {
      for (const key of Object.keys(SETUP_SCHEMA_MAP)) {
        const setter = SETUP_METADATA[key as keyof typeof SETUP_METADATA].acPythonSetter;
        expect(setter).toBe(`hm.setup.${key}`);
      }
    });
  });

  // ── Metadata param counts ─────────────────────────────────────────────

  describe("Metadata param counts", () => {
    it("job_create has 5 params", () => {
      expect(SETUP_METADATA.job_create.paramCount).toBe(5);
    });

    it("tool_assignment has 5 params", () => {
      expect(SETUP_METADATA.tool_assignment.paramCount).toBe(5);
    });

    it("rest_machining has 5 params", () => {
      expect(SETUP_METADATA.rest_machining.paramCount).toBe(5);
    });

    it("transformation has 5 params", () => {
      expect(SETUP_METADATA.transformation.paramCount).toBe(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Allowance Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC14: Allowance Parameter Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 3 allowance types in ALLOWANCE_SCHEMA_MAP", () => {
      const keys = Object.keys(ALLOWANCE_SCHEMA_MAP);
      expect(keys).toHaveLength(3);
    });

    it("contains expected allowance type keys", () => {
      const keys = Object.keys(ALLOWANCE_SCHEMA_MAP);
      expect(keys).toContain("radial_axial");
      expect(keys).toContain("xy_corner");
      expect(keys).toContain("negative_allowance");
    });

    it("has total param count of 14", () => {
      expect(ALLOWANCE_TOTAL_PARAM_COUNT).toBe(14);
    });
  });

  // ── Radial/Axial Allowance ────────────────────────────────────────────

  describe("Radial/Axial Allowance schema", () => {
    it("applies correct defaults", () => {
      const result = radialAxialSchema.parse({
        apply_mode: "uniform",
      });
      expect(result.radial_allowance).toBeCloseTo(0.5, 1);
      expect(result.axial_allowance).toBeCloseTo(0.3, 1);
      expect(result.locked).toBe(false);
      expect(result.inherited_from).toBeUndefined();
    });

    it("rejects radial_allowance below -5mm", () => {
      const result = radialAxialSchema.safeParse({
        radial_allowance: -10,
        apply_mode: "uniform",
      });
      expect(result.success).toBe(false);
    });

    it("rejects radial_allowance above 50mm", () => {
      const result = radialAxialSchema.safeParse({
        radial_allowance: 60,
        apply_mode: "uniform",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional inherited_from reference", () => {
      const result = radialAxialSchema.safeParse({
        apply_mode: "per_surface",
        inherited_from: "OP10_ROUGH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inherited_from).toBe("OP10_ROUGH");
      }
    });
  });

  // ── XY + Corner Allowance ─────────────────────────────────────────────

  describe("XY + Corner Allowance schema", () => {
    it("applies correct defaults", () => {
      const result = xyCornerSchema.parse({});
      expect(result.xy_allowance).toBeCloseTo(0.5, 1);
      expect(result.corner_radius_allowance).toBe(0);
      expect(result.floor_allowance).toBeCloseTo(0.3, 1);
      expect(result.blend_transition).toBe(true);
      expect(result.display_stock_model).toBe(true);
    });

    it("rejects corner_radius_allowance below 0", () => {
      const result = xyCornerSchema.safeParse({
        corner_radius_allowance: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects corner_radius_allowance above 10mm", () => {
      const result = xyCornerSchema.safeParse({
        corner_radius_allowance: 15,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Negative Allowance ────────────────────────────────────────────────

  describe("Negative Allowance schema", () => {
    it("defaults allow_negative to false (DFM-BLOCKING)", () => {
      const result = negativeAllowanceSchema.parse({});
      expect(result.allow_negative).toBe(false);
    });

    it("defaults negative_confirmation to false", () => {
      const result = negativeAllowanceSchema.parse({});
      expect(result.negative_confirmation).toBe(false);
    });

    it("defaults max_negative_depth to -0.5mm", () => {
      const result = negativeAllowanceSchema.parse({});
      expect(result.max_negative_depth).toBeCloseTo(-0.5, 1);
    });

    it("defaults warning_threshold to -0.1mm", () => {
      const result = negativeAllowanceSchema.parse({});
      expect(result.warning_threshold).toBeCloseTo(-0.1, 1);
    });

    it("rejects max_negative_depth below -10mm", () => {
      const result = negativeAllowanceSchema.safeParse({
        max_negative_depth: -15,
      });
      expect(result.success).toBe(false);
    });

    it("rejects max_negative_depth above 0mm", () => {
      const result = negativeAllowanceSchema.safeParse({
        max_negative_depth: 1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts max_negative_depth of -10mm (boundary)", () => {
      const result = negativeAllowanceSchema.safeParse({
        max_negative_depth: -10,
      });
      expect(result.success).toBe(true);
    });

    it("accepts max_negative_depth of 0mm (boundary)", () => {
      const result = negativeAllowanceSchema.safeParse({
        max_negative_depth: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── AC Python setter namespace ────────────────────────────────────────

  describe("AC Python setter namespace", () => {
    it("all allowance setters use 'hm.allowance.' prefix", () => {
      const entries = Object.entries(ALLOWANCE_METADATA);
      expect(entries).toHaveLength(3);
      for (const [key, meta] of entries) {
        expect(meta.acPythonSetter.startsWith("hm.allowance.")).toBe(true);
      }
    });

    it("setter names match schema map keys", () => {
      for (const key of Object.keys(ALLOWANCE_SCHEMA_MAP)) {
        const setter = ALLOWANCE_METADATA[key as keyof typeof ALLOWANCE_METADATA].acPythonSetter;
        expect(setter).toBe(`hm.allowance.${key}`);
      }
    });
  });

  // ── Metadata param counts ─────────────────────────────────────────────

  describe("Metadata param counts", () => {
    it("radial_axial has 5 params", () => {
      expect(ALLOWANCE_METADATA.radial_axial.paramCount).toBe(5);
    });

    it("xy_corner has 5 params", () => {
      expect(ALLOWANCE_METADATA.xy_corner.paramCount).toBe(5);
    });

    it("negative_allowance has 4 params", () => {
      expect(ALLOWANCE_METADATA.negative_allowance.paramCount).toBe(4);
    });
  });

  // ── DFM-critical params ───────────────────────────────────────────────

  describe("DFM-critical params in allowance metadata", () => {
    it("negative_allowance lists allow_negative and max_negative_depth as DFM-critical", () => {
      const dfm = ALLOWANCE_METADATA.negative_allowance.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("allow_negative");
      expect(dfm).toContain("max_negative_depth");
      expect(dfm).toHaveLength(2);
    });

    it("radial_axial has no DFM-critical params", () => {
      expect(ALLOWANCE_METADATA.radial_axial.dfmCriticalParams).toBeUndefined();
    });

    it("xy_corner has no DFM-critical params", () => {
      expect(ALLOWANCE_METADATA.xy_corner.dfmCriticalParams).toBeUndefined();
    });
  });
});
