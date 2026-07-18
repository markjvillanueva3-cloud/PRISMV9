/**
 * HM-KC-MS5 Lead-In/Lead-Out Parameter Schema Tests
 *
 * Tests for U-HKC28 (Lead-In/Lead-Out Parameter Schemas).
 * All tests validate specific values, ranges, and DFM constraints — no toBeTruthy() stubs.
 *
 * @milestone HM-KC-MS5
 */

import { describe, it, expect } from "vitest";
import {
  arcLeadInSchema,
  lineLeadInSchema,
  helixLeadInSchema,
  rampLeadInSchema,
  plungeLeadInSchema,
  arcLeadOutSchema,
  lineLeadOutSchema,
  retractLeadOutSchema,
  LEAD_IN_OUT_SCHEMA_MAP,
  LEAD_IN_OUT_METADATA,
  LEAD_IN_OUT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/linking/leadInOutSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC28: Lead-In/Lead-Out Parameter Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC28: Lead-In/Lead-Out Parameter Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 8 lead-in/out profile types", () => {
      const keys = Object.keys(LEAD_IN_OUT_SCHEMA_MAP);
      expect(keys).toHaveLength(8);
    });

    it("contains all expected profile type keys", () => {
      const keys = Object.keys(LEAD_IN_OUT_SCHEMA_MAP);
      expect(keys).toContain("arc_lead_in");
      expect(keys).toContain("line_lead_in");
      expect(keys).toContain("helix_lead_in");
      expect(keys).toContain("ramp_lead_in");
      expect(keys).toContain("plunge_lead_in");
      expect(keys).toContain("arc_lead_out");
      expect(keys).toContain("line_lead_out");
      expect(keys).toContain("retract_lead_out");
    });

    it("has total param count >= 49", () => {
      expect(LEAD_IN_OUT_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(49);
      // Exact sum: 8 + 6 + 8 + 6 + 5 + 6 + 5 + 5 = 49
      expect(LEAD_IN_OUT_TOTAL_PARAM_COUNT).toBe(49);
    });

    it("metadata param counts match individual schema key counts", () => {
      expect(LEAD_IN_OUT_METADATA.arc_lead_in.paramCount).toBe(8);
      expect(LEAD_IN_OUT_METADATA.line_lead_in.paramCount).toBe(6);
      expect(LEAD_IN_OUT_METADATA.helix_lead_in.paramCount).toBe(8);
      expect(LEAD_IN_OUT_METADATA.ramp_lead_in.paramCount).toBe(6);
      expect(LEAD_IN_OUT_METADATA.plunge_lead_in.paramCount).toBe(5);
      expect(LEAD_IN_OUT_METADATA.arc_lead_out.paramCount).toBe(6);
      expect(LEAD_IN_OUT_METADATA.line_lead_out.paramCount).toBe(5);
      expect(LEAD_IN_OUT_METADATA.retract_lead_out.paramCount).toBe(5);
    });
  });

  describe("All setters contain hm.linking.", () => {
    it("every metadata entry has acPythonSetter starting with hm.linking.", () => {
      for (const [key, meta] of Object.entries(LEAD_IN_OUT_METADATA)) {
        expect(meta.acPythonSetter).toMatch(/^hm\.linking\./);
        // Verify setter matches the key
        expect(meta.acPythonSetter).toBe(`hm.linking.${key}`);
      }
    });
  });

  // ── Arc Lead-In ──────────────────────────────────────────────────────────────

  describe("Arc Lead-In schema", () => {
    it("accepts valid arc lead-in with all params", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 5,
        arc_angle: 90,
        arc_direction: "auto",
        overlap: 1,
        height_offset: 0,
        tangential: true,
        full_circle: false,
        z_ramp: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects radius below 0.1", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 0.05,
        arc_angle: 90,
        arc_direction: "cw",
        overlap: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects radius exactly 0", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 0,
        arc_angle: 90,
        arc_direction: "ccw",
        overlap: 0,
      });
      expect(result.success).toBe(false);
    });

    it("accepts radius at minimum boundary 0.1", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 0.1,
        arc_angle: 90,
        arc_direction: "auto",
        overlap: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts radius at maximum boundary 1000", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 1000,
        arc_angle: 360,
        arc_direction: "cw",
        overlap: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid arc_direction enum", () => {
      const result = arcLeadInSchema.safeParse({
        radius: 5,
        arc_angle: 90,
        arc_direction: "left",
        overlap: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Helix Lead-In ────────────────────────────────────────────────────────────

  describe("Helix Lead-In schema", () => {
    it("validates helix_angle range 0.5..90", () => {
      // Below minimum
      const tooLow = helixLeadInSchema.safeParse({
        helix_radius: 5,
        helix_angle: 0.3,
        pitch: 1,
        revolutions: 2,
        direction: "auto",
        center_offset: 0,
        min_diameter: 10,
        variable_radius: false,
      });
      expect(tooLow.success).toBe(false);

      // At minimum boundary
      const atMin = helixLeadInSchema.safeParse({
        helix_radius: 5,
        helix_angle: 0.5,
        pitch: 1,
        revolutions: 2,
        direction: "auto",
        center_offset: 0,
        min_diameter: 10,
        variable_radius: false,
      });
      expect(atMin.success).toBe(true);

      // At maximum boundary
      const atMax = helixLeadInSchema.safeParse({
        helix_radius: 5,
        helix_angle: 90,
        pitch: 1,
        revolutions: 2,
        direction: "cw",
        center_offset: 0,
        min_diameter: 10,
        variable_radius: false,
      });
      expect(atMax.success).toBe(true);

      // Above maximum
      const tooHigh = helixLeadInSchema.safeParse({
        helix_radius: 5,
        helix_angle: 91,
        pitch: 1,
        revolutions: 2,
        direction: "ccw",
        center_offset: 0,
        min_diameter: 10,
        variable_radius: false,
      });
      expect(tooHigh.success).toBe(false);
    });

    it("defaults helix_angle to 3 degrees", () => {
      const result = helixLeadInSchema.safeParse({
        helix_radius: 5,
        pitch: 1,
        revolutions: 2,
        direction: "auto",
        center_offset: 0,
        min_diameter: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.helix_angle).toBe(3);
      }
    });

    it("helix_radius and helix_angle are DFM-critical", () => {
      const meta = LEAD_IN_OUT_METADATA.helix_lead_in;
      expect(meta.dfmCriticalParams).toBeDefined();
      expect(meta.dfmCriticalParams).toContain("helix_radius");
      expect(meta.dfmCriticalParams).toContain("helix_angle");
    });
  });

  // ── Plunge Lead-In ───────────────────────────────────────────────────────────

  describe("Plunge Lead-In schema", () => {
    it("center_cutting_required is DFM-critical", () => {
      const meta = LEAD_IN_OUT_METADATA.plunge_lead_in;
      expect(meta.dfmCriticalParams).toBeDefined();
      expect(meta.dfmCriticalParams).toContain("center_cutting_required");
    });

    it("plunge_feed is also DFM-critical", () => {
      const meta = LEAD_IN_OUT_METADATA.plunge_lead_in;
      expect(meta.dfmCriticalParams).toContain("plunge_feed");
    });

    it("validates plunge_feed range 1..10000", () => {
      const tooLow = plungeLeadInSchema.safeParse({
        plunge_feed: 0,
        center_cutting_required: true,
      });
      expect(tooLow.success).toBe(false);

      const valid = plungeLeadInSchema.safeParse({
        plunge_feed: 500,
        center_cutting_required: true,
      });
      expect(valid.success).toBe(true);

      const tooHigh = plungeLeadInSchema.safeParse({
        plunge_feed: 10001,
        center_cutting_required: false,
      });
      expect(tooHigh.success).toBe(false);
    });

    it("pre_drill_depth is optional", () => {
      const withoutPreDrill = plungeLeadInSchema.safeParse({
        plunge_feed: 200,
        center_cutting_required: true,
      });
      expect(withoutPreDrill.success).toBe(true);

      const withPreDrill = plungeLeadInSchema.safeParse({
        plunge_feed: 200,
        center_cutting_required: false,
        pre_drill_depth: 15,
      });
      expect(withPreDrill.success).toBe(true);
    });
  });

  // ── Ramp Lead-In ─────────────────────────────────────────────────────────────

  describe("Ramp Lead-In schema", () => {
    it("validates ramp_angle range 0.5..45", () => {
      const belowMin = rampLeadInSchema.safeParse({
        ramp_angle: 0.2,
        ramp_length: 50,
        zigzag: true,
        ramp_width: 10,
        max_depth_per_ramp: 2,
      });
      expect(belowMin.success).toBe(false);

      const valid = rampLeadInSchema.safeParse({
        ramp_angle: 3,
        ramp_length: 50,
        zigzag: true,
        ramp_width: 10,
        max_depth_per_ramp: 2,
      });
      expect(valid.success).toBe(true);
    });

    it("ramp_angle is DFM-critical", () => {
      const meta = LEAD_IN_OUT_METADATA.ramp_lead_in;
      expect(meta.dfmCriticalParams).toBeDefined();
      expect(meta.dfmCriticalParams).toContain("ramp_angle");
    });
  });

  // ── Line Lead-In ─────────────────────────────────────────────────────────────

  describe("Line Lead-In schema", () => {
    it("accepts valid line lead-in", () => {
      const result = lineLeadInSchema.safeParse({
        length: 10,
        angle: 0,
        perpendicular: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects length below 0.1", () => {
      const result = lineLeadInSchema.safeParse({
        length: 0,
        angle: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Lead-Out schemas ─────────────────────────────────────────────────────────

  describe("Arc Lead-Out schema", () => {
    it("accepts valid arc lead-out", () => {
      const result = arcLeadOutSchema.safeParse({
        radius: 5,
        arc_angle: 90,
        direction: "auto",
        tangential: true,
        extend_past: 0,
        height_lift: 2,
      });
      expect(result.success).toBe(true);
    });

    it("defaults arc_angle to 90", () => {
      const result = arcLeadOutSchema.safeParse({
        radius: 5,
        direction: "cw",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.arc_angle).toBe(90);
      }
    });
  });

  describe("Line Lead-Out schema", () => {
    it("accepts valid line lead-out", () => {
      const result = lineLeadOutSchema.safeParse({
        length: 10,
        angle: 0,
      });
      expect(result.success).toBe(true);
    });

    it("defaults perpendicular to true", () => {
      const result = lineLeadOutSchema.safeParse({
        length: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.perpendicular).toBe(true);
      }
    });
  });

  describe("Retract Lead-Out schema", () => {
    it("accepts valid retract lead-out", () => {
      const result = retractLeadOutSchema.safeParse({
        retract_type: "rapid",
        retract_distance: 5,
        retract_feed: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("validates retract_type enum values", () => {
      for (const validType of ["rapid", "feed", "controlled"]) {
        const result = retractLeadOutSchema.safeParse({
          retract_type: validType,
          retract_distance: 5,
          retract_feed: 1000,
        });
        expect(result.success).toBe(true);
      }

      const invalid = retractLeadOutSchema.safeParse({
        retract_type: "instant",
        retract_distance: 5,
        retract_feed: 1000,
      });
      expect(invalid.success).toBe(false);
    });

    it("defaults retract_to_clearance to true and decelerate to false", () => {
      const result = retractLeadOutSchema.safeParse({
        retract_type: "feed",
        retract_distance: 10,
        retract_feed: 500,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.retract_to_clearance).toBe(true);
        expect(result.data.decelerate).toBe(false);
      }
    });
  });
});
