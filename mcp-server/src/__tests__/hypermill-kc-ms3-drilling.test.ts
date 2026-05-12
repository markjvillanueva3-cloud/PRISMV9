/**
 * Tests for U-HKC16: Drilling Cycle Parameter Schemas
 *
 * Validates 15 drilling cycle Zod schemas, metadata, DFM-critical params,
 * AC Python setter naming, and total parameter counts.
 *
 * @milestone HM-KC-MS3/U-HKC16
 */

import { describe, it, expect } from "vitest";
import {
  DRILLING_SCHEMA_MAP,
  DRILLING_METADATA,
  DRILLING_TOTAL_PARAM_COUNT,
  spotDrillSchema,
  peckDrillSchema,
  deepHoleDrillSchema,
  tappingSchema,
  chamferDrillSchema,
  type DrillingCycleType,
  type DrillingCycleMeta,
} from "../schemas/hypermill/cam/drillingSchemas.js";

describe("U-HKC16: Drilling Cycle Parameter Schemas", () => {
  // ── Schema Map completeness ───────────────────────────────────────────────

  it("should contain exactly 15 drilling cycle types in DRILLING_SCHEMA_MAP", () => {
    const keys = Object.keys(DRILLING_SCHEMA_MAP);
    expect(keys).toHaveLength(15);
    expect(keys).toEqual([
      "spot_drill",
      "peck_drill",
      "deep_hole_drill",
      "gun_drill",
      "boring",
      "reaming",
      "tapping",
      "thread_milling",
      "countersink",
      "counterbore",
      "back_spot_face",
      "helical_bore",
      "circular_pocket_drill",
      "chamfer_drill",
      "combined_cycle",
    ]);
  });

  // ── Total param count ─────────────────────────────────────────────────────

  it("should have DRILLING_TOTAL_PARAM_COUNT >= 400", () => {
    expect(DRILLING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(400);
    // Exact expected value: 403
    expect(DRILLING_TOTAL_PARAM_COUNT).toBe(403);
  });

  // ── Peck drill first_peck_depth validation ────────────────────────────────

  it("should validate peck drill first_peck_depth range 0.1..500", () => {
    const tooSmall = peckDrillSchema.safeParse(makePeckDrill({ first_peck_depth: 0 }));
    expect(tooSmall.success).toBe(false);

    const tooLarge = peckDrillSchema.safeParse(makePeckDrill({ first_peck_depth: 501 }));
    expect(tooLarge.success).toBe(false);

    const valid = peckDrillSchema.safeParse(makePeckDrill({ first_peck_depth: 5 }));
    expect(valid.success).toBe(true);
  });

  // ── Tapping thread_pitch required ─────────────────────────────────────────

  it("should require thread_pitch on tapping schema", () => {
    const withoutPitch = makeTapping({});
    delete (withoutPitch as Record<string, unknown>)["thread_pitch"];
    const result = tappingSchema.safeParse(withoutPitch);
    expect(result.success).toBe(false);
  });

  // ── AC Python setter naming ───────────────────────────────────────────────

  it("should have all AC Python setters containing 'hm.drill.'", () => {
    const entries = Object.entries(DRILLING_METADATA) as [DrillingCycleType, DrillingCycleMeta][];
    expect(entries).toHaveLength(15);
    for (const [key, meta] of entries) {
      expect(meta.acPythonSetter).toMatch(/^hm\.drill\./);
      expect(meta.acPythonSetter).toBe(`hm.drill.${key}`);
    }
  });

  // ── DFM-critical metadata for peck_drill, deep_hole_drill, tapping ──────

  it("should have DFM-critical metadata for peck_drill", () => {
    const meta = DRILLING_METADATA.peck_drill;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("first_peck_depth");
    expect(meta.dfmCriticalParams).toContain("min_peck");
  });

  it("should have DFM-critical metadata for deep_hole_drill", () => {
    const meta = DRILLING_METADATA.deep_hole_drill;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("ld_ratio_limit");
  });

  it("should have DFM-critical metadata for tapping", () => {
    const meta = DRILLING_METADATA.tapping;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("thread_pitch");
  });

  // ── Spot drill angle enum values ──────────────────────────────────────────

  it("should validate spot drill angle enum values 60/90/118/120/140", () => {
    const validAngles = ["60", "90", "118", "120", "140"];
    for (const angle of validAngles) {
      const result = spotDrillSchema.safeParse(makeSpotDrill({ spot_angle: angle }));
      expect(result.success).toBe(true);
    }

    const invalidAngle = spotDrillSchema.safeParse(makeSpotDrill({ spot_angle: "100" }));
    expect(invalidAngle.success).toBe(false);
  });

  // ── Chamfer drill angle enum values ───────────────────────────────────────

  it("should validate chamfer drill angle enum values 45/60/90", () => {
    const validAngles = ["45", "60", "90"];
    for (const angle of validAngles) {
      const result = chamferDrillSchema.safeParse(makeChamferDrill({ chamfer_angle: angle }));
      expect(result.success).toBe(true);
    }

    const invalidAngle = chamferDrillSchema.safeParse(makeChamferDrill({ chamfer_angle: "30" }));
    expect(invalidAngle.success).toBe(false);
  });

  // ── Deep hole L/D ratio is integer ────────────────────────────────────────

  it("should require ld_ratio_limit to be an integer", () => {
    const floatRatio = deepHoleDrillSchema.safeParse(makeDeepHole({ ld_ratio_limit: 10.5 }));
    expect(floatRatio.success).toBe(false);

    const intRatio = deepHoleDrillSchema.safeParse(makeDeepHole({ ld_ratio_limit: 10 }));
    expect(intRatio.success).toBe(true);
  });
});

// ── Test Helpers ──────────────────────────────────────────────────────────────

/** Base params valid for all drilling cycles */
function makeBase() {
  return {
    spindle_speed: 3000,
    feed_rate: 250,
    plunge_feed: 200,
    retract_feed: 5000,
    dwell_time: 0,
    coolant_mode: "flood" as const,
    spindle_direction: "cw" as const,
    cutting_speed: 100,
    hole_diameter: 10,
    hole_depth: 30,
    start_depth: 0,
    tolerance: 0.05,
    bottom_type: "conical" as const,
    surface_finish_target: 3.2,
    clearance_plane: 50,
    retract_height: 5,
    feed_height: 2,
    top_of_part: 0,
    safety_distance: 2,
    incremental_heights: false,
  };
}

function makeSpotDrill(overrides: Record<string, unknown> = {}) {
  return {
    ...makeBase(),
    spot_angle: "90",
    spot_depth_mode: "diameter",
    spot_target_value: 12,
    center_drill_first: false,
    deburr_pass: false,
    ...overrides,
  };
}

function makePeckDrill(overrides: Record<string, unknown> = {}) {
  return {
    ...makeBase(),
    first_peck_depth: 5,
    peck_reduction: 1,
    min_peck: 0.5,
    chip_break: false,
    retract_amount: 1,
    peck_dwell: 0,
    rapid_to_previous: true,
    peck_count_limit: 100,
    ...overrides,
  };
}

function makeDeepHole(overrides: Record<string, unknown> = {}) {
  return {
    ...makeBase(),
    ld_ratio_limit: 10,
    peck_type: "full_retract",
    coolant_pressure: 70,
    pilot_depth_ratio: 1.5,
    chip_evacuation_frequency: 5,
    progressive_reduction_pct: 20,
    tool_wear_compensation: false,
    vibration_monitoring: false,
    ...overrides,
  };
}

function makeTapping(overrides: Record<string, unknown> = {}) {
  return {
    ...makeBase(),
    thread_pitch: 1.5,
    tap_type: "cut",
    rigid_tapping: true,
    peck_tapping: false,
    reverse_speed_factor: 1,
    thread_percentage: 75,
    length_of_engagement: 15,
    ...overrides,
  };
}

function makeChamferDrill(overrides: Record<string, unknown> = {}) {
  return {
    ...makeBase(),
    chamfer_width: 1,
    chamfer_angle: "45",
    depth_from_edge: 0,
    tip_compensation: true,
    multi_pass: false,
    orbital_chamfer: false,
    ...overrides,
  };
}
