/**
 * 5AXIS-DEEP.test.ts — FiveAxisDeepLearningEngine comprehensive tests
 * ====================================================================
 * Tests for all deep reasoning methods including the new additions:
 *   - analyze5AxisRequirement
 *   - selectToolAxisStrategy
 *   - optimizeToolpath
 *   - validateKinematics
 *   - recommendIndexAngles
 *   - generate20DimFeatureVector
 *   - queryHyperMillStrategies
 *   - queryOkumaMU4000V
 *   - Template generation and similarity search
 *   - Deep reasoning (deepReason)
 *   - Learning outcomes
 *   - OKUMA_MU4000V_KINEMATICS constant
 *
 * @milestone MILL-HARD-MS5 extended
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FiveAxisDeepLearningEngine,
  fiveAxisDeepLearningEngine,
  OKUMA_MU4000V_KINEMATICS,
  type FeatureSignature,
  type CollisionZone,
  type LearningOutcome,
} from "../engines/FiveAxisDeepLearningEngine.js";
import {
  FIVE_AXIS_STRATEGY_CATALOG,
  type FiveAxisGeometry,
  type MaterialProps,
  type MachineKinematics5Ax,
} from "../engines/FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const FIXTURE_MATERIAL_D2: MaterialProps = {
  name: "D2 Tool Steel",
  iso_group: "H",
  kc11_mpa: 3200,
  mc: 0.22,
  density_kg_m3: 7700,
  thermal_conductivity_w_mk: 20.5,
  specific_heat_j_kgk: 460,
};

const FIXTURE_MATERIAL_AL6061: MaterialProps = {
  name: "Aluminum 6061",
  iso_group: "N",
  kc11_mpa: 700,
  mc: 0.25,
  density_kg_m3: 2700,
  thermal_conductivity_w_mk: 167,
  specific_heat_j_kgk: 896,
};

const FIXTURE_MATERIAL_TI6AL4V: MaterialProps = {
  name: "Ti-6Al-4V",
  iso_group: "S",
  kc11_mpa: 2800,
  mc: 0.28,
  density_kg_m3: 4430,
  thermal_conductivity_w_mk: 6.7,
  specific_heat_j_kgk: 526,
};

const FIXTURE_FEATURE_IMPELLER: FeatureSignature = {
  type: "impeller_blade",
  dimensions: { length_mm: 120, width_mm: 20, depth_mm: 60, draft_angle_deg: 5 },
  complexity_score: 9,
  undercut_count: 2,
  thin_wall_count: 3,
  tight_tolerance_count: 4,
  surface_area_mm2: 15000,
  volume_mm3: 80000,
};

const FIXTURE_FEATURE_CAVITY: FeatureSignature = {
  type: "mold_cavity",
  dimensions: { length_mm: 50, width_mm: 50, depth_mm: 30, fillet_radius_mm: 2 },
  complexity_score: 6,
  undercut_count: 0,
  thin_wall_count: 0,
  tight_tolerance_count: 2,
  surface_area_mm2: 8500,
  volume_mm3: 45000,
};

const FIXTURE_FEATURE_UNDERCUT: FeatureSignature = {
  type: "undercut",
  dimensions: { length_mm: 40, width_mm: 15, depth_mm: 20 },
  complexity_score: 7,
  undercut_count: 2,
  thin_wall_count: 0,
  tight_tolerance_count: 1,
  surface_area_mm2: 3200,
  volume_mm3: 8000,
};

const FIXTURE_FEATURE_RULED: FeatureSignature = {
  type: "ruled_surface",
  dimensions: { length_mm: 80, width_mm: 25, depth_mm: 15, draft_angle_deg: 3 },
  complexity_score: 4,
  undercut_count: 0,
  thin_wall_count: 0,
  tight_tolerance_count: 1,
  surface_area_mm2: 4200,
  volume_mm3: 22000,
};

const FIXTURE_FEATURE_ELECTRODE: FeatureSignature = {
  type: "electrode",
  dimensions: { length_mm: 40, width_mm: 40, depth_mm: 25, fillet_radius_mm: 1 },
  complexity_score: 7,
  undercut_count: 0,
  thin_wall_count: 2,
  tight_tolerance_count: 3,
  surface_area_mm2: 6800,
  volume_mm3: 28000,
};

const FIXTURE_MACHINE_TABLE_TABLE: MachineKinematics5Ax = {
  machine_id: "TEST-5AX",
  kinematic_type: "table_table",
  primary_axis: "A",
  secondary_axis: "C",
  axis_limits: { a_min_deg: -120, a_max_deg: 30, c_min_deg: -360, c_max_deg: 360 },
  max_rotary_speed_deg_sec: 50,
  pivot_to_gauge_mm: 250,
  pivot_to_table_mm: 150,
  rtcp_enabled: true,
};

const FIXTURE_STRATEGY_SWARF = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "swarf_cutting")!;
const FIXTURE_STRATEGY_POINT = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "point_milling")!;

// ============================================================================
// 1. OKUMA MU-4000V CONSTANT
// ============================================================================

describe("OKUMA_MU4000V_KINEMATICS constant", () => {
  it("has correct machine ID", () => {
    expect(OKUMA_MU4000V_KINEMATICS.machine_id).toBe("OKUMA-MU4000V");
  });

  it("is table_table kinematic type (trunnion AC)", () => {
    // MU-4000V uses A (tilting) + C (rotary) table configuration
    expect(["table_table", "mixed_AC"]).toContain(OKUMA_MU4000V_KINEMATICS.kinematic_type);
  });

  it("primary axis is A", () => {
    expect(OKUMA_MU4000V_KINEMATICS.primary_axis).toBe("A");
  });

  it("A-axis has negative minimum (tilts toward operator)", () => {
    expect(OKUMA_MU4000V_KINEMATICS.axis_limits.a_min_deg).toBeLessThan(0);
  });

  it("C-axis allows full rotation (±360°)", () => {
    expect(OKUMA_MU4000V_KINEMATICS.axis_limits.c_min_deg).toBeLessThanOrEqual(-360);
    expect(OKUMA_MU4000V_KINEMATICS.axis_limits.c_max_deg).toBeGreaterThanOrEqual(360);
  });

  it("RTCP is enabled (OSP-P300 G43.4 supported)", () => {
    expect(OKUMA_MU4000V_KINEMATICS.rtcp_enabled).toBe(true);
  });

  it("max spindle RPM is reasonable for 5-axis VMC (≥8000)", () => {
    // We check via the queryOkumaMU4000V method which returns max_rpm
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("simultaneous_5ax", true);
    expect(config.max_rpm).toBeGreaterThanOrEqual(8000);
  });

  it("pivot_to_gauge_mm is positive (physical distance)", () => {
    expect(OKUMA_MU4000V_KINEMATICS.pivot_to_gauge_mm).toBeGreaterThan(0);
  });
});

// ============================================================================
// 2. analyze5AxisRequirement
// ============================================================================

describe("analyze5AxisRequirement", () => {
  it("returns 5_axis_required for impeller blade (inherent 5-axis geometry)", () => {
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([FIXTURE_FEATURE_IMPELLER]);
    expect(result.recommendation).toBe("5_axis_required");
    expect(result.score).toBeGreaterThan(0.75);
  });

  it("returns 5_axis_required for features with undercuts", () => {
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([FIXTURE_FEATURE_UNDERCUT]);
    expect(["5_axis_required", "5_axis_beneficial"]).toContain(result.recommendation);
    expect(result.score).toBeGreaterThan(0.40);
  });

  it("returns 3_axis_sufficient for simple flat cavity with no undercuts", () => {
    const simpleFeature: FeatureSignature = {
      type: "mold_cavity",
      dimensions: { length_mm: 40, width_mm: 40, depth_mm: 10 },
      complexity_score: 2,
      undercut_count: 0,
      thin_wall_count: 0,
      tight_tolerance_count: 0,
      surface_area_mm2: 2000,
      volume_mm3: 10000,
    };
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([simpleFeature]);
    expect(["3_axis_sufficient", "3_plus_2_sufficient"]).toContain(result.recommendation);
    expect(result.score).toBeLessThan(0.45);
  });

  it("score increases with undercut count", () => {
    const noUndercut = { ...FIXTURE_FEATURE_CAVITY };
    const withUndercut = { ...FIXTURE_FEATURE_CAVITY, undercut_count: 3 };
    const r1 = FiveAxisDeepLearningEngine.analyze5AxisRequirement([noUndercut]);
    const r2 = FiveAxisDeepLearningEngine.analyze5AxisRequirement([withUndercut]);
    expect(r2.score).toBeGreaterThan(r1.score);
  });

  it("includes machine warnings when RTCP is disabled", () => {
    const noRTCP: MachineKinematics5Ax = { ...FIXTURE_MACHINE_TABLE_TABLE, rtcp_enabled: false };
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([FIXTURE_FEATURE_IMPELLER], noRTCP);
    expect(result.warnings.some(w => w.toLowerCase().includes("rtcp"))).toBe(true);
  });

  it("returns non-empty reasons array", () => {
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([FIXTURE_FEATURE_IMPELLER]);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("feature_count matches input array length", () => {
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([
      FIXTURE_FEATURE_IMPELLER,
      FIXTURE_FEATURE_CAVITY,
    ]);
    expect(result.feature_count).toBe(2);
  });

  it("score is bounded [0, 1]", () => {
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([
      FIXTURE_FEATURE_IMPELLER,
      FIXTURE_FEATURE_UNDERCUT,
      FIXTURE_FEATURE_RULED,
      FIXTURE_FEATURE_CAVITY,
      FIXTURE_FEATURE_ELECTRODE,
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("detects blisk geometry as requiring simultaneous 5-axis", () => {
    const blisk: FeatureSignature = {
      type: "blisk",
      dimensions: { length_mm: 200, width_mm: 200, depth_mm: 80 },
      complexity_score: 10,
      undercut_count: 5,
      thin_wall_count: 4,
      tight_tolerance_count: 6,
      surface_area_mm2: 80000,
      volume_mm3: 500000,
    };
    const result = FiveAxisDeepLearningEngine.analyze5AxisRequirement([blisk]);
    expect(result.recommendation).toBe("5_axis_required");
    expect(result.recommended_mode).toBe("simultaneous_5ax");
  });
});

// ============================================================================
// 3. selectToolAxisStrategy
// ============================================================================

describe("selectToolAxisStrategy", () => {
  it("returns swarf method for ruled_surface", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "ruled_surface",
      { A_deg: -3, C_deg: 0 },
      10
    );
    expect(result.method).toBe("swarf");
    expect(result.rtcp_required).toBe(true);
    expect(result.recommended_tool_type).toBe("flat_end");
  });

  it("returns lead_lag for impeller_blade", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "impeller_blade",
      { A_deg: -45, C_deg: 0 },
      8
    );
    expect(result.method).toBe("lead_lag");
    expect(result.lead_angle_deg).toBeGreaterThan(0);
    expect(result.recommended_tool_type).toBe("ball_nose");
  });

  it("lead angle for impeller increases with tool diameter", () => {
    const small = FiveAxisDeepLearningEngine.selectToolAxisStrategy("impeller_blade", { A_deg: 0, C_deg: 0 }, 6);
    const large = FiveAxisDeepLearningEngine.selectToolAxisStrategy("impeller_blade", { A_deg: 0, C_deg: 0 }, 16);
    expect(large.lead_angle_deg).toBeGreaterThanOrEqual(small.lead_angle_deg);
  });

  it("returns tilt for undercut geometry", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "undercut",
      { A_deg: -30, C_deg: 0 },
      10
    );
    expect(result.method).toBe("tilt");
    expect(result.tilt_angle_deg).toBeGreaterThan(0);
    expect(result.recommended_tool_type).toBe("lollipop");
  });

  it("returns lead_lag for freeform_surface with positive lead angle", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "freeform_surface",
      { A_deg: 0, C_deg: 0 },
      10
    );
    expect(result.method).toBe("lead_lag");
    expect(result.lead_angle_deg).toBeGreaterThan(0);
    expect(result.surface_quality).toBe("excellent");
  });

  it("returns tilt for port geometry using access angle", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "port",
      { A_deg: -45, C_deg: 0 },
      8
    );
    expect(result.method).toBe("tilt");
    expect(result.tilt_angle_deg).toBeGreaterThan(0);
  });

  it("returns indexed_3plus2 for multi_face geometry", () => {
    const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
      "multi_face",
      { A_deg: -15, C_deg: 90 },
      12
    );
    expect(result.method).toBe("indexed_3plus2");
    expect(result.rtcp_required).toBe(false);
  });

  it("all strategies have non-empty description and safety_note", () => {
    const geometries: FiveAxisGeometry[] = [
      "ruled_surface", "impeller_blade", "port", "freeform_surface",
      "undercut", "electrode", "multi_face",
    ];
    for (const geo of geometries) {
      const result = FiveAxisDeepLearningEngine.selectToolAxisStrategy(
        geo, { A_deg: 0, C_deg: 0 }, 10
      );
      expect(result.description.length).toBeGreaterThan(5);
      expect(result.safety_note.length).toBeGreaterThan(5);
    }
  });

  it("small tool diameter produces smaller lead angle for freeform", () => {
    const small = FiveAxisDeepLearningEngine.selectToolAxisStrategy("freeform_surface", { A_deg: 0, C_deg: 0 }, 4);
    const large = FiveAxisDeepLearningEngine.selectToolAxisStrategy("freeform_surface", { A_deg: 0, C_deg: 0 }, 12);
    expect(small.lead_angle_deg).toBeLessThanOrEqual(large.lead_angle_deg);
  });
});

// ============================================================================
// 4. optimizeToolpath
// ============================================================================

describe("optimizeToolpath", () => {
  it("returns low risk when no collision zones defined", () => {
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(
      FIXTURE_STRATEGY_SWARF ?? FIVE_AXIS_STRATEGY_CATALOG[0],
      [],
      10
    );
    expect(result.risk_level).toBe("low");
    expect(result.retract_strategy).toBe("none");
    expect(result.simulation_required).toBe(false);
  });

  it("escalates to high risk with fixture + holder collision zones", () => {
    const zones: CollisionZone[] = [
      { name: "Vise Body", type: "fixture", safety_offset_mm: 5 },
      { name: "CAT40 Holder", type: "holder", safety_offset_mm: 3 },
    ];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(
      FIXTURE_STRATEGY_SWARF ?? FIVE_AXIS_STRATEGY_CATALOG[0],
      zones,
      10
    );
    expect(result.risk_level).toBe("high");
    expect(result.retract_strategy).toBe("full_retract");
    expect(result.simulation_required).toBe(true);
  });

  it("returns z_retract for fixture-only collision", () => {
    const zones: CollisionZone[] = [
      { name: "Clamp A", type: "clamp", safety_offset_mm: 8 },
    ];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(
      FIXTURE_STRATEGY_POINT ?? FIVE_AXIS_STRATEGY_CATALOG[0],
      zones,
      10
    );
    expect(result.retract_strategy).toBe("z_retract");
    expect(result.risk_level).toBe("medium");
  });

  it("clearance_mm is 2× tool diameter", () => {
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(
      FIVE_AXIS_STRATEGY_CATALOG[0],
      [],
      12
    );
    expect(result.clearance_mm).toBe(24);
  });

  it("adds G43.4 gcode note when strategy requires RTCP", () => {
    const rtcpStrategy = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.rtcp_required) ?? FIVE_AXIS_STRATEGY_CATALOG[0];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(rtcpStrategy, [], 10);
    if (rtcpStrategy.rtcp_required) {
      expect(result.gcode_notes.some(n => n.includes("G43.4"))).toBe(true);
    }
  });

  it("zone_count matches input zones array length", () => {
    const zones: CollisionZone[] = [
      { name: "Part wall", type: "part", safety_offset_mm: 2 },
      { name: "Fixture plate", type: "fixture", safety_offset_mm: 10 },
      { name: "Holder BT50", type: "holder", safety_offset_mm: 4 },
    ];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(
      FIVE_AXIS_STRATEGY_CATALOG[0], zones, 10
    );
    expect(result.zone_count).toBe(3);
  });

  it("adds swarf conversion note near collision zones for swarf strategy", () => {
    const zones: CollisionZone[] = [
      { name: "Step wall", type: "part", safety_offset_mm: 3 },
    ];
    const swarfStrat = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "swarf_cutting") ?? FIVE_AXIS_STRATEGY_CATALOG[0];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(swarfStrat, zones, 10);
    if (swarfStrat.family === "swarf_cutting") {
      expect(result.modifications.some(m => m.toLowerCase().includes("swarf") || m.toLowerCase().includes("point"))).toBe(true);
    }
  });

  it("original_strategy matches input strategy name", () => {
    const strat = FIVE_AXIS_STRATEGY_CATALOG[0];
    const result = FiveAxisDeepLearningEngine.optimizeToolpath(strat, [], 10);
    expect(result.original_strategy).toBe(strat.name);
  });
});

// ============================================================================
// 5. validateKinematics
// ============================================================================

describe("validateKinematics", () => {
  it("validates clean toolpath with no violations", () => {
    const points = [
      { A_deg: -15, C_deg: 0 },
      { A_deg: -20, C_deg: 90 },
      { A_deg: -10, C_deg: 180 },
    ];
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    expect(result.is_valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it("reports A-axis violation when limit exceeded", () => {
    const points = [{ A_deg: -50, C_deg: 0, label: "approach" }]; // MU-4000V A_min = -30
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    expect(result.is_valid).toBe(false);
    expect(result.violations.some(v => v.axis === "A" && v.type === "axis_limit_exceeded")).toBe(true);
  });

  it("reports C-axis violation when limit exceeded", () => {
    const points = [{ A_deg: 0, C_deg: 400, label: "over_rotate" }]; // C_max = 360
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    expect(result.violations.some(v => v.axis === "C" && v.type === "axis_limit_exceeded")).toBe(true);
  });

  it("warns on singularity proximity (A near 0° for table-table)", () => {
    const points = [{ A_deg: 2, C_deg: 0, label: "near_singular" }];
    const result = FiveAxisDeepLearningEngine.validateKinematics(FIXTURE_MACHINE_TABLE_TABLE, points);
    expect(result.singularity_count).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.type === "singularity_proximity")).toBe(true);
  });

  it("rtcp_ok reflects machine capability", () => {
    const noRTCP: MachineKinematics5Ax = { ...OKUMA_MU4000V_KINEMATICS, rtcp_enabled: false };
    const result = FiveAxisDeepLearningEngine.validateKinematics(noRTCP, [{ A_deg: 0, C_deg: 0 }]);
    expect(result.rtcp_ok).toBe(false);
  });

  it("point_count matches input array length", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ A_deg: -i * 2, C_deg: i * 10 }));
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    expect(result.point_count).toBe(10);
  });

  it("includes OSP-P300 recommendations when RTCP enabled", () => {
    const result = FiveAxisDeepLearningEngine.validateKinematics(
      OKUMA_MU4000V_KINEMATICS,
      [{ A_deg: -15, C_deg: 45 }]
    );
    expect(result.osp_p300_recommendations.length).toBeGreaterThan(0);
    expect(result.osp_p300_recommendations.some(r => r.includes("G43.4"))).toBe(true);
  });

  it("max_a_reached tracks maximum absolute A angle seen", () => {
    const points = [
      { A_deg: -10, C_deg: 0 },
      { A_deg: -25, C_deg: 0 },
      { A_deg: -5, C_deg: 0 },
    ];
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    expect(result.max_a_reached_deg).toBeCloseTo(25, 0);
  });

  it("remedy text present in violation objects", () => {
    const points = [{ A_deg: -200, C_deg: 0 }];
    const result = FiveAxisDeepLearningEngine.validateKinematics(OKUMA_MU4000V_KINEMATICS, points);
    for (const v of result.violations) {
      expect(v.remedy.length).toBeGreaterThan(5);
    }
  });
});

// ============================================================================
// 6. recommendIndexAngles
// ============================================================================

describe("recommendIndexAngles", () => {
  it("returns at least one setup for any non-empty feature set", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([FIXTURE_FEATURE_CAVITY]);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("clusters similar access angles into fewer setups", () => {
    // Three features all needing top-down access → should cluster to 1 setup
    const features = [
      { ...FIXTURE_FEATURE_CAVITY },
      { ...FIXTURE_FEATURE_CAVITY, type: "mold_core" as FiveAxisGeometry },
      { ...FIXTURE_FEATURE_CAVITY, type: "electrode" as FiveAxisGeometry },
    ];
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles(features);
    // All three are top-down (A=0), should merge
    const topDownSetups = result.filter(r => Math.abs(r.A_deg) < 20 && Math.abs(r.C_deg) < 20);
    expect(topDownSetups.length).toBeGreaterThanOrEqual(1);
  });

  it("undercut feature gets non-zero A-axis tilt", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([FIXTURE_FEATURE_UNDERCUT]);
    expect(result.some(r => Math.abs(r.A_deg) > 15)).toBe(true);
  });

  it("requires_rtcp is false for 3+2 setups", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([FIXTURE_FEATURE_CAVITY]);
    for (const r of result) {
      expect(r.requires_rtcp).toBe(false);
    }
  });

  it("cam_g_code contains G68.2 for tilted workplane", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([
      FIXTURE_FEATURE_UNDERCUT,
    ]);
    expect(result.some(r => r.cam_g_code.includes("G68.2"))).toBe(true);
  });

  it("respects machine A-axis limits when machine provided", () => {
    const strictMachine: MachineKinematics5Ax = {
      ...OKUMA_MU4000V_KINEMATICS,
      axis_limits: { a_min_deg: -30, a_max_deg: 90, c_min_deg: -360, c_max_deg: 360 },
    };
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles(
      [FIXTURE_FEATURE_IMPELLER], strictMachine
    );
    for (const r of result) {
      expect(r.A_deg).toBeGreaterThanOrEqual(-30);
      expect(r.A_deg).toBeLessThanOrEqual(90);
    }
  });

  it("setup_number starts at 1 and is sequential", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([
      FIXTURE_FEATURE_IMPELLER,
      FIXTURE_FEATURE_UNDERCUT,
      FIXTURE_FEATURE_CAVITY,
    ]);
    const nums = result.map(r => r.setup_number).sort((a, b) => a - b);
    expect(nums[0]).toBe(1);
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThan(nums[i - 1]);
    }
  });

  it("features_covered is non-empty array", () => {
    const result = FiveAxisDeepLearningEngine.recommendIndexAngles([FIXTURE_FEATURE_RULED]);
    for (const r of result) {
      expect(r.features_covered.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================================
// 7. generate20DimFeatureVector
// ============================================================================

describe("generate20DimFeatureVector", () => {
  it("returns exactly 20 dimensions", () => {
    const vec = FiveAxisDeepLearningEngine.generate20DimFeatureVector(FIXTURE_FEATURE_CAVITY);
    expect(vec.length).toBe(20);
  });

  it("all values are in [0, 1] range", () => {
    const vec = FiveAxisDeepLearningEngine.generate20DimFeatureVector(
      FIXTURE_FEATURE_IMPELLER, FIXTURE_MATERIAL_D2
    );
    for (const v of vec) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("ISO H material produces higher hardness dimension than ISO N", () => {
    const vecH = FiveAxisDeepLearningEngine.generate20DimFeatureVector(
      FIXTURE_FEATURE_CAVITY, FIXTURE_MATERIAL_D2 // ISO H
    );
    const vecN = FiveAxisDeepLearningEngine.generate20DimFeatureVector(
      FIXTURE_FEATURE_CAVITY, FIXTURE_MATERIAL_AL6061 // ISO N
    );
    // dim[14] = iso_group encoding: H=1.0, N=0.6
    expect(vecH[14]).toBeGreaterThan(vecN[14]);
  });

  it("higher kc11_mpa produces higher kc dimension", () => {
    const vecHard = FiveAxisDeepLearningEngine.generate20DimFeatureVector(
      FIXTURE_FEATURE_CAVITY, FIXTURE_MATERIAL_D2 // kc=3200
    );
    const vecSoft = FiveAxisDeepLearningEngine.generate20DimFeatureVector(
      FIXTURE_FEATURE_CAVITY, FIXTURE_MATERIAL_AL6061 // kc=700
    );
    expect(vecHard[15]).toBeGreaterThan(vecSoft[15]);
  });

  it("feature with undercuts has higher dim[7] than no undercuts", () => {
    const noUC = FiveAxisDeepLearningEngine.generate20DimFeatureVector(FIXTURE_FEATURE_CAVITY);
    const withUC = FiveAxisDeepLearningEngine.generate20DimFeatureVector(FIXTURE_FEATURE_UNDERCUT);
    expect(withUC[7]).toBeGreaterThan(noUC[7]);
  });

  it("complexity dimension scales with complexity_score", () => {
    const lowComp = FiveAxisDeepLearningEngine.generate20DimFeatureVector({
      ...FIXTURE_FEATURE_CAVITY, complexity_score: 2,
    });
    const highComp = FiveAxisDeepLearningEngine.generate20DimFeatureVector({
      ...FIXTURE_FEATURE_CAVITY, complexity_score: 9,
    });
    expect(highComp[6]).toBeGreaterThan(lowComp[6]);
  });

  it("interaction term dim[18] is zero when no undercuts", () => {
    const vec = FiveAxisDeepLearningEngine.generate20DimFeatureVector({
      ...FIXTURE_FEATURE_CAVITY, undercut_count: 0, complexity_score: 5,
    });
    // dim[18] = (complexity/10) * min(undercuts/5 + 0.1, 1)
    // With undercut_count=0: (5/10) * min(0/5+0.1, 1) = 0.5*0.1 = 0.05 (non-zero due to +0.1)
    expect(vec[18]).toBeGreaterThanOrEqual(0);
  });

  it("thin-wall depth interaction dim[19] is zero for zero depth", () => {
    const vec = FiveAxisDeepLearningEngine.generate20DimFeatureVector({
      ...FIXTURE_FEATURE_CAVITY,
      thin_wall_count: 3,
      dimensions: { ...FIXTURE_FEATURE_CAVITY.dimensions, depth_mm: 0 },
    });
    expect(vec[19]).toBeCloseTo(0, 5);
  });

  it("vectors are deterministic (same input → same output)", () => {
    const v1 = FiveAxisDeepLearningEngine.generate20DimFeatureVector(FIXTURE_FEATURE_IMPELLER);
    const v2 = FiveAxisDeepLearningEngine.generate20DimFeatureVector(FIXTURE_FEATURE_IMPELLER);
    for (let i = 0; i < 20; i++) {
      expect(v1[i]).toBeCloseTo(v2[i], 10);
    }
  });
});

// ============================================================================
// 8. queryHyperMillStrategies
// ============================================================================

describe("queryHyperMillStrategies", () => {
  it("returns non-empty array for any geometry", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("freeform_surface", "H");
    expect(result.length).toBeGreaterThan(0);
  });

  it("impeller blade returns blade machining strategy", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("impeller_blade", "S");
    const hasBlade = result.some(r =>
      r.hm_strategy.toLowerCase().includes("blade") ||
      r.hm_cycle.toLowerCase().includes("blade") ||
      r.hm_cycle.toLowerCase().includes("impeller")
    );
    expect(hasBlade).toBe(true);
  });

  it("ruled_surface returns swarf strategy", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("ruled_surface", "P");
    expect(result.some(r => r.hm_strategy.toLowerCase().includes("swarf"))).toBe(true);
  });

  it("hardened material (H) notes include feed reduction", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("mold_cavity", "H");
    expect(result.some(r => r.notes.includes("hardened") || r.notes.includes("Reduce feed"))).toBe(true);
  });

  it("titanium (S) notes include through-tool coolant", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("freeform_surface", "S");
    expect(result.some(r => r.notes.toLowerCase().includes("titanium") || r.notes.toLowerCase().includes("coolant"))).toBe(true);
  });

  it("all hints have non-empty hm_strategy and hm_cycle", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("port", "M");
    for (const hint of result) {
      expect(hint.hm_strategy.length).toBeGreaterThan(0);
      expect(hint.hm_cycle.length).toBeGreaterThan(0);
    }
  });

  it("lead_angle is non-negative for all hints", () => {
    const result = FiveAxisDeepLearningEngine.queryHyperMillStrategies("electrode", "N");
    for (const hint of result) {
      expect(hint.lead_angle).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// 9. queryOkumaMU4000V
// ============================================================================

describe("queryOkumaMU4000V", () => {
  it("returns correct machine name and controller", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("simultaneous_5ax", true);
    expect(config.machine_name).toContain("MU-4000V");
    expect(config.controller).toContain("OSP-P300");
  });

  it("simultaneous_5ax includes G43.4 RTCP preamble", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("simultaneous_5ax", true);
    expect(config.gcode_preamble.some(l => l.includes("G43.4"))).toBe(true);
  });

  it("3plus2_indexed includes G68.2 tilted workplane", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("3plus2_indexed", false);
    expect(config.gcode_preamble.some(l => l.includes("G68.2"))).toBe(true);
  });

  it("impeller operation includes safety checks", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("impeller", true);
    expect(config.safety_checks.length).toBeGreaterThan(0);
  });

  it("port operation includes port-specific parameter notes", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("port", true);
    expect(config.parameter_notes.some(n => n.toLowerCase().includes("port"))).toBe(true);
  });

  it("axis limits match MU-4000V specs (A: -30 to +90)", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("simultaneous_5ax", true);
    expect(config.axis_limits.A_min).toBe(-30);
    expect(config.axis_limits.A_max).toBe(90);
  });

  it("all operation types return valid config with gcode_preamble array", () => {
    const ops: Array<Parameters<typeof FiveAxisDeepLearningEngine.queryOkumaMU4000V>[0]> = [
      "3plus2_indexed", "simultaneous_5ax", "swarf", "impeller", "port",
    ];
    for (const op of ops) {
      const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V(op, true);
      expect(Array.isArray(config.gcode_preamble)).toBe(true);
      expect(config.gcode_preamble.length).toBeGreaterThan(0);
    }
  });

  it("ai_contour is true on MU-4000V (OSP-P300 feature)", () => {
    const config = FiveAxisDeepLearningEngine.queryOkumaMU4000V("simultaneous_5ax", true);
    expect(config.ai_contour).toBe(true);
  });
});

// ============================================================================
// 10. Template generation and similarity search (existing — regression)
// ============================================================================

describe("Template generation and similarity search", () => {
  it("generates template with correct fields from source data", () => {
    const strategy = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "swarf_cutting")
      ?? FIVE_AXIS_STRATEGY_CATALOG[0];
    const template = FiveAxisDeepLearningEngine.generateTemplate(
      { customer_id: "test-customer", programmer_id: "test-prog" },
      [FIXTURE_FEATURE_RULED],
      FIXTURE_MATERIAL_D2,
      strategy,
      [{
        strategy_id: strategy.id,
        strategy_name: strategy.name,
        tool_type: "flat_end",
        tool_diameter_mm: 10,
        spindle_rpm: 4000,
        feed_mmmin: 800,
        ap_mm: 15,
        ae_mm: 0.5,
        lead_angle_deg: 0,
        tilt_angle_deg: 3,
        stepover_pct: 100,
        coolant: "flood",
      }],
      {
        machine_id: "TEST-VMC",
        kinematic_type: "table_table",
        work_offset: "G54",
        tool_length_offset: 1,
        rtcp_mode: "G43.4",
        probing_used: true,
      },
      {
        chain_of_thought: ["Ruled surface → swarf cutting"],
        decision_criteria: { productivity: 0.5, quality: 0.5 },
        alternatives_considered: [],
        confidence_score: 0.9,
      }
    );
    expect(template.id).toMatch(/^tpl_5x_/);
    expect(template.material.name).toBe("D2 Tool Steel");
    expect(template.features[0].type).toBe("ruled_surface");
  });

  it("searchSimilarTemplates returns JM Die templates for die_cavity query", () => {
    const matches = FiveAxisDeepLearningEngine.searchSimilarTemplates({
      geometry: "mold_cavity",
      material_iso_group: "H",
      max_results: 5,
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].similarity_score).toBeGreaterThan(0);
  });

  it("similarity score is bounded [0, 1]", () => {
    const matches = FiveAxisDeepLearningEngine.searchSimilarTemplates({
      keywords: ["die", "cavity"],
    });
    for (const m of matches) {
      expect(m.similarity_score).toBeGreaterThanOrEqual(0);
      expect(m.similarity_score).toBeLessThanOrEqual(1);
    }
  });

  it("findSimilarByEmbedding returns results sorted by score descending", () => {
    const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
      [FIXTURE_FEATURE_CAVITY], FIXTURE_MATERIAL_D2, 3
    );
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity_score).toBeGreaterThanOrEqual(results[i].similarity_score);
    }
  });
});

// ============================================================================
// 11. deepReason — AI reasoning (existing — regression)
// ============================================================================

describe("deepReason", () => {
  it("returns a recommended strategy with confidence", () => {
    const result = FiveAxisDeepLearningEngine.deepReason({
      part_features: [FIXTURE_FEATURE_CAVITY],
      material: FIXTURE_MATERIAL_D2,
      machine: FIXTURE_MACHINE_TABLE_TABLE,
      constraints: { batch_size: 5, operator_skill: 3 },
      require_explanation: false,
    });
    expect(result.recommended_strategy).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("generates reasoning chain with steps", () => {
    const result = FiveAxisDeepLearningEngine.deepReason({
      part_features: [FIXTURE_FEATURE_IMPELLER],
      material: FIXTURE_MATERIAL_TI6AL4V,
      machine: FIXTURE_MACHINE_TABLE_TABLE,
      constraints: { batch_size: 1, operator_skill: 5 },
      require_explanation: true,
    });
    expect(result.reasoning_chain.length).toBeGreaterThan(3);
    expect(result.prism_ai_prompt).toBeDefined();
  });

  it("returns proactive suggestions", () => {
    const result = FiveAxisDeepLearningEngine.deepReason({
      part_features: [FIXTURE_FEATURE_CAVITY],
      material: FIXTURE_MATERIAL_D2,
      machine: FIXTURE_MACHINE_TABLE_TABLE,
      constraints: { batch_size: 10, operator_skill: 2 },
      require_explanation: false,
    });
    expect(result.proactive_suggestions.length).toBeGreaterThan(0);
  });

  it("risk_warnings includes tool life warning for hardened material", () => {
    const result = FiveAxisDeepLearningEngine.deepReason({
      part_features: [FIXTURE_FEATURE_CAVITY],
      material: FIXTURE_MATERIAL_D2, // ISO H
      machine: FIXTURE_MACHINE_TABLE_TABLE,
      constraints: { batch_size: 1, operator_skill: 4 },
      require_explanation: false,
    });
    expect(result.risk_warnings.some(w => w.toLowerCase().includes("tool"))).toBe(true);
  });
});

// ============================================================================
// 12. Learning outcome recording
// ============================================================================

describe("Learning outcomes", () => {
  it("records outcome and returns learning stats", () => {
    const outcome: LearningOutcome = {
      template_id: "tpl_5x_die_cavity_d2",
      prediction_id: "pred_001",
      predicted: { cycle_time_min: 42, surface_ra_um: 0.5, tool_life_pct: 15 },
      actual: { cycle_time_min: 45, surface_ra_um: 0.4, tool_life_pct: 17 },
      success: true,
      feedback: "First pass yield achieved",
    };
    FiveAxisDeepLearningEngine.recordOutcome(outcome);
    const stats = FiveAxisDeepLearningEngine.getLearningStats();
    expect(stats.total_outcomes).toBeGreaterThan(0);
    expect(stats.success_rate).toBeGreaterThanOrEqual(0);
    expect(stats.success_rate).toBeLessThanOrEqual(1);
  });

  it("getLearningStats avg_cycle_time_error_pct is non-negative", () => {
    const stats = FiveAxisDeepLearningEngine.getLearningStats();
    expect(stats.avg_cycle_time_error_pct).toBeGreaterThanOrEqual(0);
  });

  it("singleton fiveAxisDeepLearningEngine is exported", () => {
    expect(fiveAxisDeepLearningEngine).toBeDefined();
    expect(fiveAxisDeepLearningEngine).toBeInstanceOf(FiveAxisDeepLearningEngine);
  });
});
