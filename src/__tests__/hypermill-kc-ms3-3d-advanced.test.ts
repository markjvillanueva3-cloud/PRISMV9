/**
 * HM-KC-MS3 3D Advanced Cycle Parameter Schema Tests
 *
 * U-HKC20: Validates 8 advanced 3D cycle schemas — param counts, DFM ranges,
 * AC Python setters, default parsing, and metadata completeness.
 */

import { describe, it, expect } from "vitest";
import {
  threeDRestRoughingSchema,
  threeDRestFinishingSchema,
  threeDMaxxOffsetRoughingSchema,
  threeDMaxxHpcRoughingSchema,
  threeDOptimizedRoughingSchema,
  threeDFlowlineSchema,
  threeDGeodesicSchema,
  threeDMorphedSchema,
  THREE_D_ADVANCED_SCHEMA_MAP,
  THREE_D_ADVANCED_METADATA,
  THREE_D_ADVANCED_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cam/threeDAdvancedSchemas.js";

describe("U-HKC20: 3D Advanced Cycle Schemas", () => {
  // ── Schema map completeness ──────────────────────────────────────────────

  it("exports exactly 8 cycle types in schema map", () => {
    const keys = Object.keys(THREE_D_ADVANCED_SCHEMA_MAP);
    expect(keys).toHaveLength(8);
    expect(keys).toContain("rest_roughing");
    expect(keys).toContain("rest_finishing");
    expect(keys).toContain("maxx_offset");
    expect(keys).toContain("maxx_hpc");
    expect(keys).toContain("optimized_roughing");
    expect(keys).toContain("flowline");
    expect(keys).toContain("geodesic");
    expect(keys).toContain("morphed");
  });

  it("total param count >= 300 across all 8 schemas", () => {
    expect(THREE_D_ADVANCED_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(300);
  });

  // ── Per-schema param counts ──────────────────────────────────────────────

  it("rest roughing schema has >= 28 params", () => {
    const count = Object.keys(threeDRestRoughingSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(28);
    expect(THREE_D_ADVANCED_METADATA.rest_roughing.paramCount).toBe(count);
  });

  it("rest finishing schema has >= 28 params", () => {
    const count = Object.keys(threeDRestFinishingSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(28);
    expect(THREE_D_ADVANCED_METADATA.rest_finishing.paramCount).toBe(count);
  });

  it("MAXX offset roughing schema has >= 30 params", () => {
    const count = Object.keys(threeDMaxxOffsetRoughingSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(30);
    expect(THREE_D_ADVANCED_METADATA.maxx_offset.paramCount).toBe(count);
  });

  it("MAXX HPC roughing schema has >= 30 params", () => {
    const count = Object.keys(threeDMaxxHpcRoughingSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(30);
    expect(THREE_D_ADVANCED_METADATA.maxx_hpc.paramCount).toBe(count);
  });

  it("optimized roughing schema has >= 28 params", () => {
    const count = Object.keys(threeDOptimizedRoughingSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(28);
    expect(THREE_D_ADVANCED_METADATA.optimized_roughing.paramCount).toBe(count);
  });

  it("flowline schema has >= 26 params", () => {
    const count = Object.keys(threeDFlowlineSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(26);
    expect(THREE_D_ADVANCED_METADATA.flowline.paramCount).toBe(count);
  });

  it("geodesic schema has >= 26 params", () => {
    const count = Object.keys(threeDGeodesicSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(26);
    expect(THREE_D_ADVANCED_METADATA.geodesic.paramCount).toBe(count);
  });

  it("morphed schema has >= 25 params", () => {
    const count = Object.keys(threeDMorphedSchema.shape).length;
    expect(count).toBeGreaterThanOrEqual(25);
    expect(THREE_D_ADVANCED_METADATA.morphed.paramCount).toBe(count);
  });

  // ── DFM-critical range validation: MAXX engagement_angle (10..180) ──────

  it("MAXX offset engagement_angle accepts 10 (min boundary)", () => {
    const result = threeDMaxxOffsetRoughingSchema.safeParse({
      spindle_speed: 5000, feed_rate: 1500, plunge_feed: 500, finishing_feed: 800,
      bottom_surface: -20, engagement_angle: 10, radial_depth: 5, axial_depth: 10,
    });
    expect(result.success).toBe(true);
  });

  it("MAXX offset engagement_angle accepts 180 (max boundary)", () => {
    const result = threeDMaxxOffsetRoughingSchema.safeParse({
      spindle_speed: 5000, feed_rate: 1500, plunge_feed: 500, finishing_feed: 800,
      bottom_surface: -20, engagement_angle: 180, radial_depth: 5, axial_depth: 10,
    });
    expect(result.success).toBe(true);
  });

  it("MAXX offset engagement_angle rejects 9 (below min)", () => {
    const result = threeDMaxxOffsetRoughingSchema.safeParse({
      spindle_speed: 5000, feed_rate: 1500, plunge_feed: 500, finishing_feed: 800,
      bottom_surface: -20, engagement_angle: 9, radial_depth: 5, axial_depth: 10,
    });
    expect(result.success).toBe(false);
  });

  it("MAXX offset engagement_angle rejects 181 (above max)", () => {
    const result = threeDMaxxOffsetRoughingSchema.safeParse({
      spindle_speed: 5000, feed_rate: 1500, plunge_feed: 500, finishing_feed: 800,
      bottom_surface: -20, engagement_angle: 181, radial_depth: 5, axial_depth: 10,
    });
    expect(result.success).toBe(false);
  });

  // ── DFM-critical range validation: MAXX HPC radial_engagement_pct (5..100) ──

  it("MAXX HPC radial_engagement_pct accepts 5 (min boundary)", () => {
    const result = threeDMaxxHpcRoughingSchema.safeParse({
      spindle_speed: 8000, feed_rate: 2000, plunge_feed: 600, finishing_feed: 1000,
      bottom_surface: -15, radial_engagement_pct: 5, axial_depth: 20,
    });
    expect(result.success).toBe(true);
  });

  it("MAXX HPC radial_engagement_pct accepts 100 (max boundary)", () => {
    const result = threeDMaxxHpcRoughingSchema.safeParse({
      spindle_speed: 8000, feed_rate: 2000, plunge_feed: 600, finishing_feed: 1000,
      bottom_surface: -15, radial_engagement_pct: 100, axial_depth: 20,
    });
    expect(result.success).toBe(true);
  });

  it("MAXX HPC radial_engagement_pct rejects 4 (below min)", () => {
    const result = threeDMaxxHpcRoughingSchema.safeParse({
      spindle_speed: 8000, feed_rate: 2000, plunge_feed: 600, finishing_feed: 1000,
      bottom_surface: -15, radial_engagement_pct: 4, axial_depth: 20,
    });
    expect(result.success).toBe(false);
  });

  it("MAXX HPC radial_engagement_pct rejects 101 (above max)", () => {
    const result = threeDMaxxHpcRoughingSchema.safeParse({
      spindle_speed: 8000, feed_rate: 2000, plunge_feed: 600, finishing_feed: 1000,
      bottom_surface: -15, radial_engagement_pct: 101, axial_depth: 20,
    });
    expect(result.success).toBe(false);
  });

  // ── Rest roughing default parsing ────────────────────────────────────────

  it("rest roughing parses with defaults for optional fields", () => {
    const result = threeDRestRoughingSchema.safeParse({
      spindle_speed: 6000,
      feed_rate: 1200,
      plunge_feed: 400,
      finishing_feed: 600,
      bottom_surface: -25,
      previous_tool_diameter: 12,
      previous_tool_corner_radius: 0.8,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coolant_mode).toBe("flood");
      expect(result.data.tolerance).toBe(0.01);
      expect(result.data.rest_machining).toBe(false);
      expect(result.data.detect_rest_areas).toBe(true);
      expect(result.data.multi_level).toBe(true);
      expect(result.data.aggressive_rest).toBe(false);
      expect(result.data.min_rest_width).toBe(0.5);
      expect(result.data.overlap).toBe(1.0);
      expect(result.data.stock_source).toBe("from_previous");
      expect(result.data.stock_allowance_wall).toBe(0);
      expect(result.data.stock_allowance_floor).toBe(0);
    }
  });

  // ── AC Python setter format ──────────────────────────────────────────────

  it("all setters contain 'hm.3d.' prefix", () => {
    for (const [key, meta] of Object.entries(THREE_D_ADVANCED_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.3d\./);
      expect(meta.acPythonSetter).toBe(`hm.3d.${key}`);
    }
  });

  // ── DFM-critical metadata presence ───────────────────────────────────────

  it("maxx_offset metadata lists engagement_angle as DFM-critical", () => {
    expect(THREE_D_ADVANCED_METADATA.maxx_offset.dfmCriticalParams).toBeDefined();
    expect(THREE_D_ADVANCED_METADATA.maxx_offset.dfmCriticalParams).toContain("engagement_angle");
  });

  it("maxx_hpc metadata lists radial_engagement_pct as DFM-critical", () => {
    expect(THREE_D_ADVANCED_METADATA.maxx_hpc.dfmCriticalParams).toBeDefined();
    expect(THREE_D_ADVANCED_METADATA.maxx_hpc.dfmCriticalParams).toContain("radial_engagement_pct");
  });

  it("rest_roughing metadata lists previous_tool_diameter as DFM-critical", () => {
    expect(THREE_D_ADVANCED_METADATA.rest_roughing.dfmCriticalParams).toBeDefined();
    expect(THREE_D_ADVANCED_METADATA.rest_roughing.dfmCriticalParams).toContain("previous_tool_diameter");
  });

  // ── Metadata completeness ──────────────────────────────────────────────

  it("all 8 metadata entries have non-empty descriptions", () => {
    for (const meta of Object.values(THREE_D_ADVANCED_METADATA)) {
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });

  it("all 8 metadata entries have paramCount > 0", () => {
    for (const meta of Object.values(THREE_D_ADVANCED_METADATA)) {
      expect(meta.paramCount).toBeGreaterThan(20);
    }
  });

  it("all 8 metadata entries have dfmCriticalParams array", () => {
    for (const meta of Object.values(THREE_D_ADVANCED_METADATA)) {
      expect(Array.isArray(meta.dfmCriticalParams)).toBe(true);
      expect(meta.dfmCriticalParams!.length).toBeGreaterThan(0);
    }
  });

  // ── Cross-schema shared base consistency ─────────────────────────────────

  it("all schemas include the 20 shared 3D base fields", () => {
    const baseFields = [
      "spindle_speed", "feed_rate", "plunge_feed", "finishing_feed",
      "coolant_mode", "tolerance", "surface_tolerance",
      "clearance_plane", "retract_height", "feed_height",
      "top_surface", "bottom_surface",
      "boundary_mode", "boundary_offset",
      "tool_comp", "comp_direction",
      "stock_allowance_wall", "stock_allowance_floor",
      "rest_machining", "rest_source",
    ];

    for (const [name, schema] of Object.entries(THREE_D_ADVANCED_SCHEMA_MAP)) {
      const keys = Object.keys(schema.shape);
      for (const field of baseFields) {
        expect(keys).toContain(field);
      }
    }
  });
});
