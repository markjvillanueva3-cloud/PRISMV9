/**
 * Tests for U-HKC25: Turning Cycle Parameter Schemas
 *
 * Validates 18 turning cycle Zod schemas, metadata, DFM-critical params,
 * AC Python setter naming, and total parameter counts.
 *
 * @milestone HM-KC-MS4/U-HKC25
 */

import { describe, it, expect } from "vitest";
import {
  TURNING_SCHEMA_MAP,
  TURNING_METADATA,
  TURNING_TOTAL_PARAM_COUNT,
  turningBaseSchema,
  odRoughSchema,
  odFinishSchema,
  odGrooveSchema,
  odThreadSchema,
  idThreadSchema,
  partingSchema,
  profilingSchema,
  boringCycleSchema,
  millTurnFaceSchema,
  type TurningCycleType,
  type TurningCycleMeta,
} from "../schemas/hypermill/cam/turningSchemas.js";

// ── Helper: minimal valid turning base data ───────────────────────────────────

function makeTurningBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    spindle_speed: 1200,
    surface_speed: 200,
    css_mode: "g96_css",
    s_max_clamp: 4000,
    feed_rate: 0.3,
    rapid_feed: 15000,
    coolant_mode: "flood",
    nose_radius: 0.8,
    approach_angle: 95,
    insert_type: "C",
    chipbreaker: "medium",
    tool_orientation: 3,
    ...overrides,
  };
}

function makeOdRough(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeTurningBase({
    depth_of_cut: 2.5,
    stepover_mode: "constant",
    multiple_passes: true,
    lead_angle: 0,
    stock_allowance: 0.3,
    rough_direction: "longitudinal",
    retract_clearance: 2,
    ...overrides,
  });
}

function makeOdGroove(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeTurningBase({
    groove_width: 3.0,
    groove_depth: 10,
    peck_depth: 2,
    peck_dwell: 0.5,
    groove_shape: "square",
    side_feed_rate: 0.15,
    chamfer_width: 0.3,
    groove_bottom_radius: 0.5,
    ...overrides,
  });
}

function makeOdThread(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeTurningBase({
    pitch: 1.5,
    starts: 1,
    infeed_method: "compound",
    pass_count: 8,
    spring_passes: 2,
    lead_in_threads: 1.5,
    thread_form: "iso_metric",
    thread_depth: 0.92,
    chamfer_at_start: true,
    ...overrides,
  });
}

describe("U-HKC25: Turning Cycle Parameter Schemas", () => {
  // ── Schema Map completeness ───────────────────────────────────────────────

  it("should contain exactly 18 turning cycle types in TURNING_SCHEMA_MAP", () => {
    const keys = Object.keys(TURNING_SCHEMA_MAP);
    expect(keys).toHaveLength(18);
    expect(keys).toEqual([
      "od_rough",
      "od_finish",
      "id_rough",
      "id_finish",
      "face",
      "od_groove",
      "id_groove",
      "face_groove",
      "od_thread",
      "id_thread",
      "parting",
      "recessing",
      "boring_cycle",
      "profiling",
      "contour_turning",
      "mill_turn_face",
      "mill_turn_radial",
      "mill_turn_axial",
    ]);
  });

  // ── Total param count ─────────────────────────────────────────────────────

  it("should have TURNING_TOTAL_PARAM_COUNT >= 340", () => {
    expect(TURNING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(340);
    expect(TURNING_TOTAL_PARAM_COUNT).toBe(340);
  });

  // ── CSS mode enum ─────────────────────────────────────────────────────────

  it("should validate css_mode enum with g96_css and g97_rpm values", () => {
    const validCSS = turningBaseSchema.safeParse(makeTurningBase({ css_mode: "g96_css" }));
    expect(validCSS.success).toBe(true);

    const validRPM = turningBaseSchema.safeParse(makeTurningBase({ css_mode: "g97_rpm" }));
    expect(validRPM.success).toBe(true);

    const invalid = turningBaseSchema.safeParse(makeTurningBase({ css_mode: "g95_fpr" }));
    expect(invalid.success).toBe(false);
  });

  // ── OD groove width validates range ───────────────────────────────────────

  it("should validate OD groove width range 0.5..100", () => {
    const tooSmall = odGrooveSchema.safeParse(makeOdGroove({ groove_width: 0.1 }));
    expect(tooSmall.success).toBe(false);

    const tooLarge = odGrooveSchema.safeParse(makeOdGroove({ groove_width: 150 }));
    expect(tooLarge.success).toBe(false);

    const validMin = odGrooveSchema.safeParse(makeOdGroove({ groove_width: 0.5 }));
    expect(validMin.success).toBe(true);

    const validMax = odGrooveSchema.safeParse(makeOdGroove({ groove_width: 100 }));
    expect(validMax.success).toBe(true);
  });

  // ── Thread infeed_method enum values ──────────────────────────────────────

  it("should validate thread infeed_method enum: compound/flank/modified/alternating", () => {
    for (const method of ["compound", "flank", "modified", "alternating"]) {
      const result = odThreadSchema.safeParse(makeOdThread({ infeed_method: method }));
      expect(result.success).toBe(true);
    }

    const invalid = odThreadSchema.safeParse(makeOdThread({ infeed_method: "radial" }));
    expect(invalid.success).toBe(false);
  });

  // ── S_max_clamp DFM-critical in metadata ─────────────────────────────────

  it("should list s_max_clamp as DFM-critical in all cycle metadata", () => {
    for (const [key, meta] of Object.entries(TURNING_METADATA)) {
      expect(
        meta.dfmCriticalParams,
        `${key} should have dfmCriticalParams`,
      ).toBeDefined();
      expect(
        meta.dfmCriticalParams!.includes("s_max_clamp"),
        `${key} should include s_max_clamp in dfmCriticalParams`,
      ).toBe(true);
    }
  });

  // ── All setters use hm.turning.* prefix ───────────────────────────────────

  it("should use hm.turning.* prefix for all AC Python setters", () => {
    for (const [key, meta] of Object.entries(TURNING_METADATA)) {
      expect(
        meta.acPythonSetter.startsWith("hm.turning."),
        `${key} setter should start with hm.turning.`,
      ).toBe(true);
    }
  });

  // ── Metadata keys match schema map ────────────────────────────────────────

  it("should have matching keys between TURNING_SCHEMA_MAP and TURNING_METADATA", () => {
    const schemaKeys = Object.keys(TURNING_SCHEMA_MAP).sort();
    const metaKeys = Object.keys(TURNING_METADATA).sort();
    expect(schemaKeys).toEqual(metaKeys);
  });

  // ── OD rough depth_of_cut validation ──────────────────────────────────────

  it("should validate OD rough depth_of_cut range 0.1..25", () => {
    const tooSmall = odRoughSchema.safeParse(makeOdRough({ depth_of_cut: 0 }));
    expect(tooSmall.success).toBe(false);

    const tooLarge = odRoughSchema.safeParse(makeOdRough({ depth_of_cut: 30 }));
    expect(tooLarge.success).toBe(false);

    const valid = odRoughSchema.safeParse(makeOdRough({ depth_of_cut: 3 }));
    expect(valid.success).toBe(true);
  });

  // ── Nose radius DFM-critical range ────────────────────────────────────────

  it("should validate nose_radius DFM range 0.1..12.7", () => {
    const tooSmall = turningBaseSchema.safeParse(makeTurningBase({ nose_radius: 0.05 }));
    expect(tooSmall.success).toBe(false);

    const tooLarge = turningBaseSchema.safeParse(makeTurningBase({ nose_radius: 15 }));
    expect(tooLarge.success).toBe(false);

    const valid = turningBaseSchema.safeParse(makeTurningBase({ nose_radius: 0.8 }));
    expect(valid.success).toBe(true);
  });

  // ── s_max_clamp range 0..15000 ────────────────────────────────────────────

  it("should validate s_max_clamp range 0..15000", () => {
    const tooLarge = turningBaseSchema.safeParse(makeTurningBase({ s_max_clamp: 16000 }));
    expect(tooLarge.success).toBe(false);

    const validZero = turningBaseSchema.safeParse(makeTurningBase({ s_max_clamp: 0 }));
    expect(validZero.success).toBe(true);

    const validMax = turningBaseSchema.safeParse(makeTurningBase({ s_max_clamp: 15000 }));
    expect(validMax.success).toBe(true);
  });

  // ── Tool orientation int 1..9 ─────────────────────────────────────────────

  it("should validate tool_orientation as integer 1..9", () => {
    const tooLow = turningBaseSchema.safeParse(makeTurningBase({ tool_orientation: 0 }));
    expect(tooLow.success).toBe(false);

    const tooHigh = turningBaseSchema.safeParse(makeTurningBase({ tool_orientation: 10 }));
    expect(tooHigh.success).toBe(false);

    const notInt = turningBaseSchema.safeParse(makeTurningBase({ tool_orientation: 3.5 }));
    expect(notInt.success).toBe(false);

    const valid = turningBaseSchema.safeParse(makeTurningBase({ tool_orientation: 5 }));
    expect(valid.success).toBe(true);
  });

  // ── Insert type enum ──────────────────────────────────────────────────────

  it("should validate insert_type enum C/D/R/S/T/V/W", () => {
    for (const t of ["C", "D", "R", "S", "T", "V", "W"]) {
      const result = turningBaseSchema.safeParse(makeTurningBase({ insert_type: t }));
      expect(result.success).toBe(true);
    }

    const invalid = turningBaseSchema.safeParse(makeTurningBase({ insert_type: "X" }));
    expect(invalid.success).toBe(false);
  });

  // ── OD thread pitch DFM-critical ──────────────────────────────────────────

  it("should list pitch as DFM-critical for OD thread", () => {
    expect(TURNING_METADATA.od_thread.dfmCriticalParams).toContain("pitch");
  });

  // ── OD thread infeed_method DFM-critical ──────────────────────────────────

  it("should list infeed_method as DFM-critical for OD thread", () => {
    expect(TURNING_METADATA.od_thread.dfmCriticalParams).toContain("infeed_method");
  });

  // ── Boring cycle type enum ────────────────────────────────────────────────

  it("should validate boring_type enum rough/fine/back", () => {
    const base = makeTurningBase({
      boring_type: "rough",
      bar_orientation: 180,
      retract_orient: true,
      bore_diameter: 50,
      bore_depth: 100,
      fine_boring_shift: 0.1,
    });

    const valid = boringCycleSchema.safeParse(base);
    expect(valid.success).toBe(true);

    const invalid = boringCycleSchema.safeParse({ ...base, boring_type: "semi" });
    expect(invalid.success).toBe(false);
  });

  // ── Profiling contour_approach enum ───────────────────────────────────────

  it("should validate profiling contour_approach enum tangent/direct/arc", () => {
    const base = makeTurningBase({
      contour_approach: "tangent",
      contour_direction: "longitudinal",
      finish_allowance: 0.1,
      contour_tolerance: 0.01,
      arc_radius: 5,
      retract_method: "arc",
    });

    for (const approach of ["tangent", "direct", "arc"]) {
      const result = profilingSchema.safeParse({ ...base, contour_approach: approach });
      expect(result.success).toBe(true);
    }
  });

  // ── Thread form enum values ───────────────────────────────────────────────

  it("should validate thread_form enum iso_metric/unc/unf/acme/buttress", () => {
    for (const form of ["iso_metric", "unc", "unf", "acme", "buttress"]) {
      const result = odThreadSchema.safeParse(makeOdThread({ thread_form: form }));
      expect(result.success).toBe(true);
    }
  });

  // ── Coolant mode enum ─────────────────────────────────────────────────────

  it("should validate coolant_mode enum off/flood/mist/through_tool/high_pressure", () => {
    for (const mode of ["off", "flood", "mist", "through_tool", "high_pressure"]) {
      const result = turningBaseSchema.safeParse(makeTurningBase({ coolant_mode: mode }));
      expect(result.success).toBe(true);
    }
  });

  // ── Each metadata paramCount matches schema shape ─────────────────────────

  it("should have paramCount matching actual Zod schema shape key count", () => {
    for (const [key, schema] of Object.entries(TURNING_SCHEMA_MAP)) {
      const actualCount = Object.keys(schema.shape).length;
      const declared = TURNING_METADATA[key as TurningCycleType].paramCount;
      expect(actualCount, `${key}: actual ${actualCount} !== declared ${declared}`).toBe(declared);
    }
  });

  // ── OD groove DFM-critical includes groove_width ──────────────────────────

  it("should list groove_width as DFM-critical for OD groove", () => {
    expect(TURNING_METADATA.od_groove.dfmCriticalParams).toContain("groove_width");
  });

  // ── Mill-turn face c_axis_lock field present ──────────────────────────────

  it("should include c_axis_lock in mill_turn_face schema", () => {
    const base = makeTurningBase({
      c_axis_lock: true,
      spindle_orient_angle: 90,
      live_tool_speed: 3000,
      milling_feed: 500,
      milling_depth: 5,
      stepover_width: 10,
    });
    const result = millTurnFaceSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});
