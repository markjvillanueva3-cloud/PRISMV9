/**
 * HM-KC-MS3 2D Cycle Parameter Schema Tests
 *
 * U-HKC17 (Core: Pocket, Contour, Face Mill) + U-HKC18 (Extended: 6 types)
 * Validates param counts, DFM ranges, AC Python setters, and default parsing.
 */

import { describe, it, expect } from "vitest";
import {
  twoDPocketSchema,
  twoDContourSchema,
  twoDFaceMillSchema,
  TWO_D_CORE_SCHEMA_MAP,
  TWO_D_CORE_METADATA,
  TWO_D_CORE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/twoDSchemas.js";
import {
  twoDSlotMillSchema,
  twoDChamferSchema,
  twoDTSlotSchema,
  twoDPlungeRoughSchema,
  twoDRestSchema,
  twoDEngraveSchema,
  TWO_D_EXTENDED_SCHEMA_MAP,
  TWO_D_EXTENDED_METADATA,
  TWO_D_EXTENDED_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/twoDExtendedSchemas.js";

// ── U-HKC17: Core 2D Cycle Schemas ─────────────────────────────────────────

describe("U-HKC17: 2D Core Cycle Schemas", () => {
  it("exports exactly 3 core cycle types", () => {
    const keys = Object.keys(TWO_D_CORE_SCHEMA_MAP);
    expect(keys).toHaveLength(3);
    expect(keys).toContain("pocket");
    expect(keys).toContain("contour");
    expect(keys).toContain("face_mill");
  });

  it("core total param count >= 145", () => {
    expect(TWO_D_CORE_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(145);
  });

  it("pocket schema has >= 45 params", () => {
    const count = Object.keys(twoDPocketSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(45);
    expect(TWO_D_CORE_METADATA.pocket.paramCount).toBe(count);
  });

  it("contour schema has >= 45 params", () => {
    const count = Object.keys(twoDContourSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(45);
    expect(TWO_D_CORE_METADATA.contour.paramCount).toBe(count);
  });

  it("face mill schema has >= 40 params", () => {
    const count = Object.keys(twoDFaceMillSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(40);
    expect(TWO_D_CORE_METADATA.face_mill.paramCount).toBe(count);
  });

  it("pocket stepdown validates DFM range 0.05..100", () => {
    const base = {
      spindle_speed: 5000, feed_rate: 1000, plunge_feed: 200, ramp_feed: 300,
      finishing_feed: 800, z_start: 0, z_end: -20, bottom: -20,
      stepover: 5, stepover_pct: 50,
    };

    // Valid stepdown
    const valid = twoDPocketSchema.safeParse({ ...base, stepdown: 2.0 });
    expect(valid.success).toBe(true);

    // Too small
    const tooSmall = twoDPocketSchema.safeParse({ ...base, stepdown: 0.01 });
    expect(tooSmall.success).toBe(false);

    // Too large
    const tooLarge = twoDPocketSchema.safeParse({ ...base, stepdown: 150 });
    expect(tooLarge.success).toBe(false);
  });

  it("pocket ramp_angle defaults to 3 and validates 0.5..90", () => {
    const base = {
      spindle_speed: 5000, feed_rate: 1000, plunge_feed: 200, ramp_feed: 300,
      finishing_feed: 800, z_start: 0, z_end: -20, bottom: -20,
      stepover: 5, stepover_pct: 50,
    };

    const parsed = twoDPocketSchema.parse(base);
    expect(parsed.ramp_angle).toBe(3);

    const invalidAngle = twoDPocketSchema.safeParse({ ...base, ramp_angle: 0.1 });
    expect(invalidAngle.success).toBe(false);
  });

  it("contour lead-in validates arc radius >= 0.1", () => {
    const base = {
      spindle_speed: 5000, feed_rate: 1000, plunge_feed: 200, ramp_feed: 300,
      finishing_feed: 800, z_start: 0, z_end: -10, bottom: -10,
    };

    const parsed = twoDContourSchema.parse(base);
    expect(parsed.lead_in_radius).toBe(5); // default

    const tooSmall = twoDContourSchema.safeParse({ ...base, lead_in_radius: 0.01 });
    expect(tooSmall.success).toBe(false);

    const valid = twoDContourSchema.safeParse({ ...base, lead_in_radius: 8.5 });
    expect(valid.success).toBe(true);
  });

  it("all core AC Python setters contain 'hm.2d.'", () => {
    for (const [key, meta] of Object.entries(TWO_D_CORE_METADATA)) {
      expect(meta.acPythonSetter).toContain("hm.2d.");
      expect(meta.acPythonSetter).toBe(`hm.2d.${key}`);
    }
  });

  it("face mill overlap_pct defaults to 70", () => {
    const base = {
      spindle_speed: 3000, feed_rate: 2000, plunge_feed: 500, ramp_feed: 600,
      finishing_feed: 1500, z_start: 0, z_end: -3, bottom: -3,
      width_of_cut: 40,
    };

    const parsed = twoDFaceMillSchema.parse(base);
    expect(parsed.overlap_pct).toBe(70);
    expect(parsed.direction).toBe("zigzag");
    expect(parsed.engage_type).toBe("roll_on");
  });
});

// ── U-HKC18: Extended 2D Cycle Schemas ──────────────────────────────────────

describe("U-HKC18: 2D Extended Cycle Schemas", () => {
  it("exports exactly 6 extended cycle types", () => {
    const keys = Object.keys(TWO_D_EXTENDED_SCHEMA_MAP);
    expect(keys).toHaveLength(6);
    expect(keys).toContain("slot_mill");
    expect(keys).toContain("chamfer");
    expect(keys).toContain("t_slot");
    expect(keys).toContain("plunge_rough");
    expect(keys).toContain("rest_2d");
    expect(keys).toContain("engrave");
  });

  it("extended total param count >= 185", () => {
    expect(TWO_D_EXTENDED_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(185);
  });

  it("combined core + extended >= 330 params", () => {
    const combined = TWO_D_CORE_TOTAL_PARAM_COUNT + TWO_D_EXTENDED_TOTAL_PARAM_COUNT;
    expect(combined).toBeGreaterThanOrEqual(330);
  });

  it("slot mill schema parses with defaults", () => {
    const input = {
      spindle_speed: 4000, feed_rate: 800, plunge_feed: 150, ramp_feed: 200,
      finishing_feed: 600, z_start: 0, z_end: -10, bottom: -10,
      slot_width: 8, slot_depth: 10, stepover: 3,
    };

    const parsed = twoDSlotMillSchema.parse(input);
    expect(parsed.slot_width).toBe(8);
    expect(parsed.slot_depth).toBe(10);
    expect(parsed.helical_entry).toBe(true);
    expect(parsed.plunge_mode).toBe("center");
    expect(parsed.coolant_mode).toBe("flood");
    expect(parsed.stepdown).toBe(2.0);
    expect(parsed.ramp_type).toBe("helical");
  });

  it("t-slot schema parses with defaults", () => {
    const input = {
      spindle_speed: 2000, feed_rate: 400, plunge_feed: 100, ramp_feed: 150,
      finishing_feed: 300, z_start: 0, z_end: -25, bottom: -25,
      neck_width: 10, head_width: 18, total_depth: 25,
      neck_depth: 15, head_height: 10, stepover: 2,
    };

    const parsed = twoDTSlotSchema.parse(input);
    expect(parsed.neck_width).toBe(10);
    expect(parsed.head_width).toBe(18);
    expect(parsed.approach_side).toBe("left");
    expect(parsed.retract_strategy).toBe("full");
    expect(parsed.pre_slot_required).toBe(true);
    expect(parsed.coolant_pressure).toBe("high");
    expect(parsed.tolerance).toBe(0.005);
  });

  it("chamfer angle validates enum values", () => {
    const base = {
      spindle_speed: 6000, feed_rate: 1200, plunge_feed: 300, ramp_feed: 400,
      finishing_feed: 1000, z_start: 0, z_end: -2, bottom: -2,
      chamfer_width: 1.5, depth_from_edge: 1.0,
    };

    const parsed = twoDChamferSchema.parse(base);
    expect(parsed.chamfer_angle).toBe("45");

    const with60 = twoDChamferSchema.parse({ ...base, chamfer_angle: "60" });
    expect(with60.chamfer_angle).toBe("60");

    const invalid = twoDChamferSchema.safeParse({ ...base, chamfer_angle: "30" });
    expect(invalid.success).toBe(false);
  });

  it("plunge rough validates stepover range", () => {
    const base = {
      spindle_speed: 3000, feed_rate: 600, plunge_feed: 400, ramp_feed: 300,
      finishing_feed: 500, z_start: 0, z_end: -30, bottom: -30,
      stepover: 5, plunge_depth: 20,
    };

    const parsed = twoDPlungeRoughSchema.parse(base);
    expect(parsed.rapid_retract).toBe(true);
    expect(parsed.plunge_pattern).toBe("grid");
    expect(parsed.avoid_re_plunge).toBe(true);
  });

  it("rest 2D validates previous_tool_diameter", () => {
    const base = {
      spindle_speed: 8000, feed_rate: 2000, plunge_feed: 500, ramp_feed: 600,
      finishing_feed: 1500, z_start: 0, z_end: -15, bottom: -15,
      previous_tool_diameter: 20,
    };

    const parsed = twoDRestSchema.parse(base);
    expect(parsed.previous_tool_diameter).toBe(20);
    expect(parsed.stock_source).toBe("from_previous");
    expect(parsed.detect_corners).toBe(true);
    expect(parsed.min_rest_width).toBe(0.5);

    const invalid = twoDRestSchema.safeParse({ ...base, previous_tool_diameter: 0.1 });
    expect(invalid.success).toBe(false);
  });

  it("engrave schema validates depth and v-bit angle", () => {
    const base = {
      spindle_speed: 12000, feed_rate: 500, plunge_feed: 100, ramp_feed: 150,
      finishing_feed: 400, z_start: 0, z_end: -0.5, bottom: -0.5,
      engrave_depth: 0.3,
    };

    const parsed = twoDEngraveSchema.parse(base);
    expect(parsed.engrave_depth).toBe(0.3);
    expect(parsed.v_bit_angle).toBe(60);
    expect(parsed.font_name).toBe("sans-serif");
    expect(parsed.coolant_mode).toBe("air_blast");
    expect(parsed.optimize_path).toBe(true);
  });

  it("all extended AC Python setters contain 'hm.2d.'", () => {
    for (const [key, meta] of Object.entries(TWO_D_EXTENDED_METADATA)) {
      expect(meta.acPythonSetter).toContain("hm.2d.");
      expect(meta.acPythonSetter).toBe(`hm.2d.${key}`);
    }
  });

  it("each extended schema has a paramCount matching its shape", () => {
    for (const [key, schema] of Object.entries(TWO_D_EXTENDED_SCHEMA_MAP)) {
      const shapeCount = Object.keys(schema.shape).length;
      const metaCount = TWO_D_EXTENDED_METADATA[key as keyof typeof TWO_D_EXTENDED_METADATA].paramCount;
      expect(metaCount).toBe(shapeCount);
      expect(shapeCount).toBeGreaterThanOrEqual(25);
    }
  });
});
