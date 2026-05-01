/**
 * Tests for HM-KC-MS4 U-HKC23: 5-Axis Tool Axis + Collision Avoidance Schemas
 *
 * Validates parameter counts, DFM-critical ranges, schema constraints,
 * and AC Python setter namespace correctness across all 26 schemas
 * (13 tool axis + 13 collision avoidance).
 */

import { describe, it, expect } from "vitest";
import {
  FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP,
  FIVE_AXIS_TOOL_AXIS_METADATA,
  FIVE_AXIS_TOOL_AXIS_TOTAL_PARAM_COUNT,
  swarfCuttingToolAxisSchema,
  type FiveAxisToolAxisCycleType,
} from "../schemas/hypermill/cam/fiveAxisToolAxisSchemas.js";
import {
  FIVE_AXIS_COLLISION_SCHEMA_MAP,
  FIVE_AXIS_COLLISION_METADATA,
  FIVE_AXIS_COLLISION_TOTAL_PARAM_COUNT,
  swarfCuttingCollisionSchema,
} from "../schemas/hypermill/cam/fiveAxisCollisionSchemas.js";

// ── Tool Axis Schemas ────────────────────────────────────────────────────────

describe("5-Axis Tool Axis Schemas (13 cycle types)", () => {
  it("should have exactly 13 tool axis cycle types", () => {
    const keys = Object.keys(FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP);
    expect(keys).toHaveLength(13);
    expect(keys).toEqual(
      expect.arrayContaining([
        "swarf_cutting",
        "point_milling",
        "contour_5x",
        "pocket_5x",
        "profile_5x",
        "blade_roughing",
        "blade_finishing",
        "impeller_roughing",
        "impeller_finishing",
        "tube_milling",
        "dental",
        "cavity",
        "multi_surface",
      ]),
    );
  });

  it("should have >= 120 total tool axis params", () => {
    expect(FIVE_AXIS_TOOL_AXIS_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(120);
    // Exact: 13 types * 10 params = 130
    expect(FIVE_AXIS_TOOL_AXIS_TOTAL_PARAM_COUNT).toBe(130);
  });

  it("each tool axis type has 10 params per metadata", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_TOOL_AXIS_METADATA)) {
      expect(meta.paramCount).toBe(10);
    }
  });

  it("swarf tilt_angle accepts range -90..90", () => {
    const shape = swarfCuttingToolAxisSchema.shape;
    const validNeg = shape.tilt_angle.safeParse(-90);
    expect(validNeg.success).toBe(true);
    const validPos = shape.tilt_angle.safeParse(90);
    expect(validPos.success).toBe(true);
    const invalidLow = shape.tilt_angle.safeParse(-91);
    expect(invalidLow.success).toBe(false);
    const invalidHigh = shape.tilt_angle.safeParse(91);
    expect(invalidHigh.success).toBe(false);
  });

  it("swarf tool_axis_mode enum has 4 values", () => {
    const shape = swarfCuttingToolAxisSchema.shape;
    const fixed = shape.tool_axis_mode.safeParse("fixed");
    expect(fixed.success).toBe(true);
    const leadLag = shape.tool_axis_mode.safeParse("lead_lag");
    expect(leadLag.success).toBe(true);
    const interp = shape.tool_axis_mode.safeParse("interpolated");
    expect(interp.success).toBe(true);
    const wrap = shape.tool_axis_mode.safeParse("4axis_wrap");
    expect(wrap.success).toBe(true);
    const invalid = shape.tool_axis_mode.safeParse("unknown_mode");
    expect(invalid.success).toBe(false);
  });

  it("point_milling tilt_min/tilt_max DFM-critical in metadata", () => {
    const meta = FIVE_AXIS_TOOL_AXIS_METADATA.point_milling;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("tilt_min");
    expect(meta.dfmCriticalParams).toContain("tilt_max");
  });

  it("all tool axis setters contain 'hm.5x.'", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_TOOL_AXIS_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.5x\./);
    }
  });

  it("all tool axis setters do NOT contain 'collision'", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_TOOL_AXIS_METADATA)) {
      expect(meta.acPythonSetter).not.toContain("collision");
    }
  });

  it("pocket_5x auto_collision_tilt is DFM-critical", () => {
    const meta = FIVE_AXIS_TOOL_AXIS_METADATA.pocket_5x;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("auto_collision_tilt");
  });

  it("multi_surface axis_blend_factor validates 0..1", () => {
    const schema = FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP.multi_surface;
    const shape = schema.shape;
    const valid0 = shape.axis_blend_factor.safeParse(0);
    expect(valid0.success).toBe(true);
    const valid1 = shape.axis_blend_factor.safeParse(1);
    expect(valid1.success).toBe(true);
    const invalidNeg = shape.axis_blend_factor.safeParse(-0.1);
    expect(invalidNeg.success).toBe(false);
    const invalidHigh = shape.axis_blend_factor.safeParse(1.1);
    expect(invalidHigh.success).toBe(false);
  });
});

// ── Collision Avoidance Schemas ──────────────────────────────────────────────

describe("5-Axis Collision Avoidance Schemas (13 cycle types)", () => {
  it("should have exactly 13 collision cycle types", () => {
    const keys = Object.keys(FIVE_AXIS_COLLISION_SCHEMA_MAP);
    expect(keys).toHaveLength(13);
    expect(keys).toEqual(
      expect.arrayContaining([
        "swarf_cutting",
        "point_milling",
        "contour_5x",
        "pocket_5x",
        "profile_5x",
        "blade_roughing",
        "blade_finishing",
        "impeller_roughing",
        "impeller_finishing",
        "tube_milling",
        "dental",
        "cavity",
        "multi_surface",
      ]),
    );
  });

  it("should have >= 100 total collision params", () => {
    expect(FIVE_AXIS_COLLISION_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(100);
    // Exact: 13 types * 8 params = 104
    expect(FIVE_AXIS_COLLISION_TOTAL_PARAM_COUNT).toBe(104);
  });

  it("each collision type has 8 params per metadata", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_COLLISION_METADATA)) {
      expect(meta.paramCount).toBe(8);
    }
  });

  it("swarf collision_distance validates 0.1..100", () => {
    const shape = swarfCuttingCollisionSchema.shape;
    const validLow = shape.collision_distance.safeParse(0.1);
    expect(validLow.success).toBe(true);
    const validHigh = shape.collision_distance.safeParse(100);
    expect(validHigh.success).toBe(true);
    const invalidLow = shape.collision_distance.safeParse(0.05);
    expect(invalidLow.success).toBe(false);
    const invalidHigh = shape.collision_distance.safeParse(101);
    expect(invalidHigh.success).toBe(false);
  });

  it("all collision setters contain 'hm.5x.collision.'", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_COLLISION_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.5x\.collision\./);
    }
  });

  it("tilt_limit_min/max are DFM-critical for all collision types", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_COLLISION_METADATA)) {
      expect(meta.dfmCriticalParams).toContain("tilt_limit_min");
      expect(meta.dfmCriticalParams).toContain("tilt_limit_max");
      expect(meta.dfmCriticalParams).toContain("collision_distance");
    }
  });

  it("collision_model enum has 3 values", () => {
    const shape = swarfCuttingCollisionSchema.shape;
    const toolOnly = shape.collision_model.safeParse("tool_only");
    expect(toolOnly.success).toBe(true);
    const toolHolder = shape.collision_model.safeParse("tool_holder");
    expect(toolHolder.success).toBe(true);
    const full = shape.collision_model.safeParse("full_assembly");
    expect(full.success).toBe(true);
    const invalid = shape.collision_model.safeParse("none");
    expect(invalid.success).toBe(false);
  });

  it("tilt_limit_min rejects positive values", () => {
    const shape = swarfCuttingCollisionSchema.shape;
    const invalid = shape.tilt_limit_min.safeParse(5);
    expect(invalid.success).toBe(false);
    const valid = shape.tilt_limit_min.safeParse(-45);
    expect(valid.success).toBe(true);
  });

  it("tilt_limit_max rejects negative values", () => {
    const shape = swarfCuttingCollisionSchema.shape;
    const invalid = shape.tilt_limit_max.safeParse(-5);
    expect(invalid.success).toBe(false);
    const valid = shape.tilt_limit_max.safeParse(45);
    expect(valid.success).toBe(true);
  });
});

// ── Combined Totals ─────────────────────────────────────────────────────────

describe("Combined 5-Axis Schema Totals", () => {
  it("combined tool axis + collision >= 220 params", () => {
    const combined = FIVE_AXIS_TOOL_AXIS_TOTAL_PARAM_COUNT + FIVE_AXIS_COLLISION_TOTAL_PARAM_COUNT;
    expect(combined).toBeGreaterThanOrEqual(220);
    // Exact: 130 + 104 = 234
    expect(combined).toBe(234);
  });

  it("tool axis and collision schema maps have matching keys", () => {
    const toolAxisKeys = Object.keys(FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP).sort();
    const collisionKeys = Object.keys(FIVE_AXIS_COLLISION_SCHEMA_MAP).sort();
    expect(toolAxisKeys).toEqual(collisionKeys);
  });
});
