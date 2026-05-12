/**
 * Tests for U-HKC24: 5-Axis Blade/Impeller + Surface Quality Schemas
 *
 * Validates 15 blade/impeller cycle Zod schemas, 7 surface quality profile
 * schemas, metadata, DFM-critical params, AC Python setter naming, enum
 * validation, range validation, and total parameter counts.
 *
 * @milestone HM-KC-MS4/U-HKC24
 */

import { describe, it, expect } from "vitest";
import {
  FIVE_AXIS_BLADE_SCHEMA_MAP,
  FIVE_AXIS_BLADE_METADATA,
  FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT,
  bladeRoughSchema,
  bladeFinishSchema,
  impellerRoughSchema,
  turbineBladeSchema,
  bliskRoughSchema,
  type FiveAxisBladeType,
  type FiveAxisBladeMeta,
} from "../schemas/hypermill/cam/fiveAxisBladeSchemas.js";
import {
  FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP,
  FIVE_AXIS_SURFACE_QUALITY_METADATA,
  FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT,
  scallopControlSchema,
  pointDistributionSchema,
  finishQualitySchema,
  type FiveAxisSurfaceQualityType,
  type FiveAxisSurfaceQualityMeta,
} from "../schemas/hypermill/cam/fiveAxisSurfaceQualitySchemas.js";

// ── Blade/Impeller Schema Tests ───────────────────────────────────────────

describe("U-HKC24: 5-Axis Blade/Impeller Schemas", () => {
  it("should contain exactly 15 blade/impeller cycle types in FIVE_AXIS_BLADE_SCHEMA_MAP", () => {
    const keys = Object.keys(FIVE_AXIS_BLADE_SCHEMA_MAP);
    expect(keys).toHaveLength(15);
    expect(keys).toEqual([
      "blade_rough",
      "blade_semi_finish",
      "blade_hub_finish",
      "blade_finish",
      "blade_leading_edge",
      "blade_trailing_edge",
      "impeller_rough",
      "impeller_semi_finish",
      "impeller_hub_finish",
      "impeller_blade_finish",
      "impeller_shroud_finish",
      "impeller_splitter",
      "turbine_blade",
      "blisk_rough",
      "blisk_finish",
    ]);
  });

  it("should have FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT >= 120", () => {
    expect(FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(120);
    // Exact expected: 133 (9+9+9+10+9+9+9+9+8+8+8+9+9+9+9)
    expect(FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT).toBe(133);
  });

  it("should validate channel_type enum on blade_rough: open|closed|semi_open", () => {
    const validOpen = bladeRoughSchema.safeParse(makeBladeRough({ channel_type: "open" }));
    expect(validOpen.success).toBe(true);

    const validClosed = bladeRoughSchema.safeParse(makeBladeRough({ channel_type: "closed" }));
    expect(validClosed.success).toBe(true);

    const validSemiOpen = bladeRoughSchema.safeParse(
      makeBladeRough({ channel_type: "semi_open" }),
    );
    expect(validSemiOpen.success).toBe(true);

    const invalid = bladeRoughSchema.safeParse(
      makeBladeRough({ channel_type: "invalid_type" as never }),
    );
    expect(invalid.success).toBe(false);
  });

  it("should validate blade_count range 2..200 on blade_rough", () => {
    const tooSmall = bladeRoughSchema.safeParse(makeBladeRough({ blade_count: 1 }));
    expect(tooSmall.success).toBe(false);

    const tooLarge = bladeRoughSchema.safeParse(makeBladeRough({ blade_count: 201 }));
    expect(tooLarge.success).toBe(false);

    const valid = bladeRoughSchema.safeParse(makeBladeRough({ blade_count: 12 }));
    expect(valid.success).toBe(true);
  });

  it("should validate blade_finish cusp_height range 0.0005..0.5", () => {
    const tooSmall = bladeFinishSchema.safeParse(
      makeBladeFinish({ blade_cusp_height: 0.0001 }),
    );
    expect(tooSmall.success).toBe(false);

    const tooLarge = bladeFinishSchema.safeParse(makeBladeFinish({ blade_cusp_height: 0.6 }));
    expect(tooLarge.success).toBe(false);

    const valid = bladeFinishSchema.safeParse(makeBladeFinish({ blade_cusp_height: 0.01 }));
    expect(valid.success).toBe(true);
  });

  it("should validate impeller_rough splitter_count range 0..10", () => {
    const tooLarge = impellerRoughSchema.safeParse(
      makeImpellerRough({ splitter_count: 11 }),
    );
    expect(tooLarge.success).toBe(false);

    const valid = impellerRoughSchema.safeParse(makeImpellerRough({ splitter_count: 3 }));
    expect(valid.success).toBe(true);
  });

  it("should validate turbine_blade root_form enum: fir_tree|dovetail|pin", () => {
    const validFir = turbineBladeSchema.safeParse(
      makeTurbineBlade({ root_form: "fir_tree" }),
    );
    expect(validFir.success).toBe(true);

    const validDovetail = turbineBladeSchema.safeParse(
      makeTurbineBlade({ root_form: "dovetail" }),
    );
    expect(validDovetail.success).toBe(true);

    const validPin = turbineBladeSchema.safeParse(makeTurbineBlade({ root_form: "pin" }));
    expect(validPin.success).toBe(true);

    const invalid = turbineBladeSchema.safeParse(
      makeTurbineBlade({ root_form: "bolt" as never }),
    );
    expect(invalid.success).toBe(false);
  });

  it("should validate blisk_rough sector_machining is boolean", () => {
    const valid = bliskRoughSchema.safeParse(makeBliskRough({ sector_machining: true }));
    expect(valid.success).toBe(true);

    const validFalse = bliskRoughSchema.safeParse(makeBliskRough({ sector_machining: false }));
    expect(validFalse.success).toBe(true);
  });

  it("should have all blade setters using hm.5x.blade.* namespace", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_BLADE_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.5x\.blade\./);
      expect(meta.acPythonSetter).toBe(`hm.5x.blade.${key}`);
    }
  });

  it("should have paramCount matching schema shape key count for each blade type", () => {
    for (const [key, schema] of Object.entries(FIVE_AXIS_BLADE_SCHEMA_MAP)) {
      const meta = FIVE_AXIS_BLADE_METADATA[key as FiveAxisBladeType];
      const shapeKeys = Object.keys(schema.shape);
      expect(meta.paramCount).toBe(shapeKeys.length);
    }
  });

  it("should tag DFM-critical params on blade_rough and blade_finish", () => {
    const roughMeta = FIVE_AXIS_BLADE_METADATA.blade_rough;
    expect(roughMeta.dfmCriticalParams).toContain("channel_type");
    expect(roughMeta.dfmCriticalParams).toContain("roughing_allowance");

    const finishMeta = FIVE_AXIS_BLADE_METADATA.blade_finish;
    expect(finishMeta.dfmCriticalParams).toContain("blade_cusp_height");
  });
});

// ── Surface Quality Schema Tests ──────────────────────────────────────────

describe("U-HKC24: 5-Axis Surface Quality Schemas", () => {
  it("should contain exactly 7 surface quality types in FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP", () => {
    const keys = Object.keys(FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP);
    expect(keys).toHaveLength(7);
    expect(keys).toEqual([
      "scallop_control",
      "point_distribution",
      "uv_direction",
      "surface_tolerance",
      "curvature_analysis",
      "contact_point_control",
      "finish_quality",
    ]);
  });

  it("should have FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT >= 95", () => {
    expect(FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(95);
    // Exact expected: 98 (14*7)
    expect(FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT).toBe(98);
  });

  it("should validate scallop_control target_height range 0.001..0.5", () => {
    const tooSmall = scallopControlSchema.safeParse(
      makeScallopControl({ target_height: 0.0001 }),
    );
    expect(tooSmall.success).toBe(false);

    const tooLarge = scallopControlSchema.safeParse(
      makeScallopControl({ target_height: 0.6 }),
    );
    expect(tooLarge.success).toBe(false);

    const validLow = scallopControlSchema.safeParse(
      makeScallopControl({ target_height: 0.001 }),
    );
    expect(validLow.success).toBe(true);

    const validHigh = scallopControlSchema.safeParse(
      makeScallopControl({ target_height: 0.5 }),
    );
    expect(validHigh.success).toBe(true);
  });

  it("should validate scallop_control computation_method enum", () => {
    const validChord = scallopControlSchema.safeParse(
      makeScallopControl({ computation_method: "chord" }),
    );
    expect(validChord.success).toBe(true);

    const validCusp = scallopControlSchema.safeParse(
      makeScallopControl({ computation_method: "cusp" }),
    );
    expect(validCusp.success).toBe(true);

    const invalid = scallopControlSchema.safeParse(
      makeScallopControl({ computation_method: "linear" as never }),
    );
    expect(invalid.success).toBe(false);
  });

  it("should validate point_distribution mode enum: constant_step|chord_length|curvature_based", () => {
    const valid = pointDistributionSchema.safeParse(
      makePointDistribution({ mode: "curvature_based" }),
    );
    expect(valid.success).toBe(true);

    const invalid = pointDistributionSchema.safeParse(
      makePointDistribution({ mode: "random" as never }),
    );
    expect(invalid.success).toBe(false);
  });

  it("should validate finish_quality target_ra enum values", () => {
    const validRa = finishQualitySchema.safeParse(
      makeFinishQuality({ target_ra: "Ra_0_1" }),
    );
    expect(validRa.success).toBe(true);

    const validRa32 = finishQualitySchema.safeParse(
      makeFinishQuality({ target_ra: "Ra_3_2" }),
    );
    expect(validRa32.success).toBe(true);

    const invalid = finishQualitySchema.safeParse(
      makeFinishQuality({ target_ra: "Ra_6_3" as never }),
    );
    expect(invalid.success).toBe(false);
  });

  it("should have all surface quality setters using hm.5x.quality.* namespace", () => {
    for (const [key, meta] of Object.entries(FIVE_AXIS_SURFACE_QUALITY_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.5x\.quality\./);
      expect(meta.acPythonSetter).toBe(`hm.5x.quality.${key}`);
    }
  });

  it("should have paramCount matching schema shape key count for each quality type", () => {
    for (const [key, schema] of Object.entries(FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP)) {
      const meta = FIVE_AXIS_SURFACE_QUALITY_METADATA[key as FiveAxisSurfaceQualityType];
      const shapeKeys = Object.keys(schema.shape);
      expect(meta.paramCount).toBe(shapeKeys.length);
    }
  });

  it("should tag DFM-critical params on scallop_control and curvature_analysis", () => {
    const scallopMeta = FIVE_AXIS_SURFACE_QUALITY_METADATA.scallop_control;
    expect(scallopMeta.dfmCriticalParams).toContain("target_height");

    const curvatureMeta = FIVE_AXIS_SURFACE_QUALITY_METADATA.curvature_analysis;
    expect(curvatureMeta.dfmCriticalParams).toContain("min_radius_detect");
  });
});

// ── Combined Tests ────────────────────────────────────────────────────────

describe("U-HKC24: Combined Blade + Surface Quality", () => {
  it("should have combined param count >= 215", () => {
    const combined = FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT + FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT;
    expect(combined).toBeGreaterThanOrEqual(215);
    // Exact: 133 + 98 = 231
    expect(combined).toBe(231);
  });
});

// ── Test Data Helpers ─────────────────────────────────────────────────────

function makeBladeRough(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hub_surface: "hub_1",
    shroud_surface: "shroud_1",
    blade_count: 12,
    channel_type: "open",
    roughing_allowance: 0.5,
    hub_offset: 0.1,
    shroud_offset: 0.1,
    multi_blade: false,
    cut_pattern: "zigzag",
    ...overrides,
  };
}

function makeBladeFinish(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hub_surface: "hub_1",
    shroud_surface: "shroud_1",
    blade_count: 12,
    blade_stepover: 0.5,
    blade_cusp_height: 0.01,
    tip_clearance: 0.5,
    root_blend: 1.0,
    channel_type: "open",
    cut_pattern: "zigzag",
    multi_blade: false,
    ...overrides,
  };
}

function makeImpellerRough(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hub_surface: "hub_1",
    shroud_surface: "shroud_1",
    channel_count: 8,
    splitter_flag: true,
    splitter_count: 1,
    approach_mode: "helical",
    roughing_allowance: 0.5,
    cut_pattern: "zigzag",
    multi_blade: false,
    ...overrides,
  };
}

function makeTurbineBlade(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hub_surface: "hub_1",
    shroud_surface: "shroud_1",
    blade_count: 60,
    twist_angle: 15,
    root_form: "fir_tree",
    tip_shroud: true,
    cut_pattern: "one_way",
    roughing_allowance: 0.3,
    multi_blade: false,
    ...overrides,
  };
}

function makeBliskRough(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hub_surface: "hub_1",
    shroud_surface: "shroud_1",
    blade_count: 24,
    disk_allowance: 0.5,
    fillet_blend: 2.0,
    sector_machining: true,
    cut_pattern: "zigzag",
    roughing_allowance: 0.5,
    multi_blade: false,
    ...overrides,
  };
}

function makeScallopControl(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    target_height: 0.01,
    computation_method: "cusp",
    min_stepover: 0.1,
    max_stepover: 5,
    adaptive: true,
    surface_tolerance: 0.01,
    curvature_factor: 1,
    overlap_pct: 5,
    direction_lock: false,
    boundary_extension: 0,
    steep_threshold: 45,
    shallow_threshold: 30,
    corner_refinement: true,
    smoothing_passes: 0,
    ...overrides,
  };
}

function makePointDistribution(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    mode: "constant_step",
    step_distance: 0.5,
    min_points_per_curve: 10,
    smooth_distribution: true,
    reduce_points: false,
    reduction_tolerance: 0.01,
    max_chord_error: 0.01,
    arc_fitting: false,
    arc_tolerance: 0.005,
    feedrate_smoothing: true,
    corner_slow_down: true,
    corner_angle_threshold: 15,
    max_segment_length: 50,
    interpolation_type: "linear",
    ...overrides,
  };
}

function makeFinishQuality(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    target_ra: "Ra_0_4",
    burnish_pass: false,
    dwell_at_corners: true,
    corner_radius_limit: 1,
    lead_in_quality: "match",
    spring_pass: false,
    feed_reduction_pct: 0,
    spindle_speed_increase_pct: 0,
    radial_depth_limit: 0.1,
    axial_depth_limit: 0.5,
    coolant_for_finish: "mist",
    wiper_insert: false,
    polishing_mode: false,
    surface_inspection: false,
    ...overrides,
  };
}
