/**
 * FiveAxisToolpathIntegrationEngine tests — CK-MS5
 * Covers contourMill, portMachine, manageSingularities, avoidCollisions,
 * roughing5Axis, stochasticAnalysis, and the calculate() dispatch.
 */

import { describe, expect, it } from "vitest";
import {
  fiveAxisToolpathIntegrationEngine,
  type FATIVec3,
  type FATIToolpathPoint,
  type FATIContourInput,
  type FATIPortInput,
  type FATIKinematicConfig,
  type FATIToolGeometry,
  type FATIAABB,
} from "../engines/FiveAxisToolpathIntegrationEngine.js";

const FLATNESS_COS_DEFAULT = 0.95;
const DEFAULT_MAX_ROTARY_VEL_DEG_S = 60;
const SINGULARITY_THRESHOLD_DEFAULT = 0.05;
const CRITICAL_MULTIPLIER = 0.2;
const MC_SAMPLES_DEFAULT = 200;

function vec(x: number, y: number, z: number): FATIVec3 {
  return { x, y, z };
}

function zUpPoint(x: number, y: number, z: number, feedX = 1, feedY = 0): FATIToolpathPoint {
  return {
    position: vec(x, y, z),
    normal: vec(0, 0, 1),
    feed_dir: vec(feedX, feedY, 0),
  };
}

function acConfig(overrides: Partial<FATIKinematicConfig> = {}): FATIKinematicConfig {
  return {
    type: "AC",
    axis1_limits_deg: [-120, 120],
    axis2_limits_deg: [-360, 360],
    max_rotary_vel_deg_s: DEFAULT_MAX_ROTARY_VEL_DEG_S,
    pivot_length_mm: 200,
    tool_gauge_length_mm: 100,
    ...overrides,
  };
}

function standardTool(): FATIToolGeometry {
  return {
    diameter_mm: 10,
    cutting_length_mm: 30,
    holder_diameter_mm: 30,
    holder_length_mm: 60,
    spindle_diameter_mm: 80,
    spindle_length_mm: 200,
  };
}

function farAwayAABB(): FATIAABB {
  return { min: vec(1000, 1000, 1000), max: vec(1010, 1010, 1010), id: "far_part" };
}

function coveringAABB(): FATIAABB {
  return { min: vec(-500, -500, -500), max: vec(500, 500, 500), id: "big_part" };
}

describe("FiveAxisToolpathIntegrationEngine.contourMill", () => {
  it("returns a zero-length result for empty input", () => {
    const input: FATIContourInput = {
      points: [],
      angles: {},
      tool_diameter_mm: 10,
      normal_follow: true,
    };
    const out = fiveAxisToolpathIntegrationEngine.contourMill(input);
    expect(out.points).toEqual([]);
    expect(out.total_length_mm).toBe(0);
    expect(out.max_surface_deviation_mm).toBe(0);
    expect(out.avg_tilt_deg).toBe(0);
    expect(out.axis_smoothness_score).toBe(1);
  });

  it("with normal_follow=false, IK for Z-up normal yields A≈0 and C≈0 per point", () => {
    const pts: FATIToolpathPoint[] = [
      zUpPoint(0, 0, 0),
      zUpPoint(10, 0, 0),
      zUpPoint(20, 0, 0),
    ];
    const out = fiveAxisToolpathIntegrationEngine.contourMill({
      points: pts,
      angles: { lead_rad: 0.5, lag_rad: 0.3, tilt_rad: 0.1 },
      tool_diameter_mm: 10,
      normal_follow: false,
    });
    expect(out.points).toHaveLength(3);
    for (const p of out.points) {
      expect(p.A_deg).toBeCloseTo(0, 3);
      expect(p.C_deg).toBeCloseTo(0, 3);
      expect(p.tool_axis.z).toBeCloseTo(1, 3);
    }
  });

  it("sums straight-line path length as Euclidean distance between points", () => {
    const pts: FATIToolpathPoint[] = [
      zUpPoint(0, 0, 0),
      zUpPoint(10, 0, 0),
      zUpPoint(10, 10, 0),
    ];
    const out = fiveAxisToolpathIntegrationEngine.contourMill({
      points: pts,
      angles: {},
      tool_diameter_mm: 6,
      normal_follow: false,
    });
    expect(out.total_length_mm).toBeCloseTo(20, 6);
  });

  it("trims points outside the boundary polygon", () => {
    const pts: FATIToolpathPoint[] = [
      zUpPoint(5, 5, 0),
      zUpPoint(50, 5, 0),
      zUpPoint(6, 5, 0),
    ];
    const boundary = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const out = fiveAxisToolpathIntegrationEngine.contourMill({
      points: pts,
      angles: {},
      tool_diameter_mm: 10,
      normal_follow: false,
      boundary,
    });
    expect(out.points.length).toBe(2);
  });

  it("surface deviation is non-negative and ≤ tool_radius for Z-up surface", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 5 }, (_, i) =>
      zUpPoint(i * 5, 0, 0));
    const TOOL_D = 12;
    const out = fiveAxisToolpathIntegrationEngine.contourMill({
      points: pts,
      angles: {},
      tool_diameter_mm: TOOL_D,
      normal_follow: false,
    });
    for (const p of out.points) {
      expect(p.surface_deviation_mm).toBeGreaterThanOrEqual(0);
      expect(p.surface_deviation_mm).toBeLessThanOrEqual(TOOL_D / 2);
    }
    expect(out.max_surface_deviation_mm).toBeLessThanOrEqual(TOOL_D / 2);
  });

  it("axis_smoothness_score is in [0, 1] for a straight path with constant normals", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 6 }, (_, i) =>
      zUpPoint(i * 3, 0, 0));
    const out = fiveAxisToolpathIntegrationEngine.contourMill({
      points: pts,
      angles: {},
      tool_diameter_mm: 8,
      normal_follow: false,
    });
    expect(out.axis_smoothness_score).toBeGreaterThanOrEqual(0);
    expect(out.axis_smoothness_score).toBeLessThanOrEqual(1);
    expect(out.axis_smoothness_score).toBeCloseTo(1, 3);
  });
});

describe("FiveAxisToolpathIntegrationEngine.portMachine", () => {
  it("returns empty result when port bore is smaller than the tool", () => {
    const input: FATIPortInput = {
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 50),
      port_diameter_mm: 5,
      tool_diameter_mm: 10,
      num_passes: 2,
      stepover_mm: 0.5,
      detect_undercuts: false,
    };
    const out = fiveAxisToolpathIntegrationEngine.portMachine(input);
    expect(out.passes).toEqual([]);
    expect(out.total_points).toBe(0);
    expect(out.undercuts_detected).toBe(0);
  });

  it("generates num_passes passes with descending helix radius and positive point counts", () => {
    const out = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 40),
      port_diameter_mm: 30,
      tool_diameter_mm: 8,
      num_passes: 3,
      stepover_mm: 1.5,
      detect_undercuts: false,
    });
    expect(out.passes).toHaveLength(3);
    for (let i = 1; i < out.passes.length; i++) {
      expect(out.passes[i].radial_depth_mm).toBeLessThanOrEqual(out.passes[i - 1].radial_depth_mm);
    }
    for (const pass of out.passes) {
      expect(pass.points.length).toBeGreaterThan(0);
    }
    expect(out.total_points).toBe(out.passes.reduce((s, p) => s + p.points.length, 0));
  });

  it("detects undercut passes when shank clearance is small", () => {
    const out = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 30),
      port_diameter_mm: 20,
      tool_diameter_mm: 15,
      num_passes: 1,
      stepover_mm: 0.5,
      detect_undercuts: true,
    });
    expect(out.undercuts_detected).toBeGreaterThan(0);
    expect(out.passes[0].is_undercut_region).toBe(true);
  });

  it("adds external rest-material AABB volume into the reported volume", () => {
    const REST_CUBE_SIDE = 10;
    const REST_CUBE_VOLUME = REST_CUBE_SIDE * REST_CUBE_SIDE * REST_CUBE_SIDE;
    const withRest = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 40),
      port_diameter_mm: 30,
      tool_diameter_mm: 8,
      num_passes: 2,
      stepover_mm: 1,
      detect_undercuts: false,
      rest_material_aabb: [{
        min: vec(0, 0, 0),
        max: vec(REST_CUBE_SIDE, REST_CUBE_SIDE, REST_CUBE_SIDE),
      }],
    });
    const withoutRest = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 40),
      port_diameter_mm: 30,
      tool_diameter_mm: 8,
      num_passes: 2,
      stepover_mm: 1,
      detect_undercuts: false,
    });
    expect(withRest.rest_material_volume_mm3 - withoutRest.rest_material_volume_mm3)
      .toBeCloseTo(REST_CUBE_VOLUME, 6);
  });

  it("handles non-Z-aligned port axis without throwing", () => {
    const out = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: vec(0, 0, 0),
      port_end: vec(20, 0, 0),
      port_diameter_mm: 20,
      tool_diameter_mm: 6,
      num_passes: 1,
      stepover_mm: 1,
      detect_undercuts: false,
    });
    expect(out.passes).toHaveLength(1);
    expect(out.passes[0].points.length).toBeGreaterThan(0);
  });
});

describe("FiveAxisToolpathIntegrationEngine.manageSingularities", () => {
  it("returns is_safe=true and zero zones for empty input", () => {
    const out = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points: [],
      kinematic_config: acConfig(),
      feed_rate_mm_min: 1000,
    });
    expect(out.singular_zones).toEqual([]);
    expect(out.total_points_checked).toBe(0);
    expect(out.is_safe).toBe(true);
    expect(out.retraction_count).toBe(0);
  });

  it("detects singular zones when tool axes are all aligned with Z (AC singularity at A=0)", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 5 }, (_, i) => ({
      position: vec(i * 2, 0, 0),
      normal: vec(0, 0, 1),
      tool_axis: vec(0, 0, 1),
      feed_dir: vec(1, 0, 0),
    }));
    const out = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points: pts,
      kinematic_config: acConfig(),
      feed_rate_mm_min: 600,
    });
    expect(out.singular_zones.length).toBeGreaterThan(0);
    const zone = out.singular_zones[0];
    expect(["gimbal_lock", "high_velocity"]).toContain(zone.type);
    expect(out.is_safe).toBe(false);
    expect(out.total_points_checked).toBe(5);
  });

  it("reports a non-singular path as safe with empty zones", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 5 }, (_, i) => ({
      position: vec(i * 5, 0, 0),
      normal: vec(0, 1, 1),
      tool_axis: vec(0, 1, 1),
      feed_dir: vec(1, 0, 0),
    }));
    const out = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points: pts,
      kinematic_config: acConfig(),
      feed_rate_mm_min: 1200,
    });
    expect(out.singular_zones).toEqual([]);
    expect(out.is_safe).toBe(true);
  });

  it("preserves total_points_checked equal to the input length", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 12 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
      tool_axis: vec(0, 0, 1),
      feed_dir: vec(1, 0, 0),
    }));
    const out = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points: pts,
      kinematic_config: acConfig(),
      feed_rate_mm_min: 1000,
    });
    expect(out.total_points_checked).toBe(pts.length);
    expect(out.corrected_points).toHaveLength(pts.length);
  });

  it("flags critical severity and gimbal_lock type when jacobian_det_min is below threshold × 0.2", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 5 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
      tool_axis: vec(0, 0, 1),
      feed_dir: vec(1, 0, 0),
    }));
    const out = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points: pts,
      kinematic_config: acConfig(),
      feed_rate_mm_min: 600,
      singularity_threshold: SINGULARITY_THRESHOLD_DEFAULT,
    });
    const critical = out.singular_zones.filter(z => z.severity === "critical");
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].jacobian_det_min).toBeLessThan(SINGULARITY_THRESHOLD_DEFAULT * CRITICAL_MULTIPLIER);
    expect(critical[0].type).toBe("gimbal_lock");
  });
});

describe("FiveAxisToolpathIntegrationEngine.avoidCollisions", () => {
  it("returns is_safe=true with no collisions for empty input", () => {
    const out = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points: [],
      tool: standardTool(),
      part_aabb: farAwayAABB(),
      kinematic_config: acConfig(),
    });
    expect(out.collisions_detected).toBe(0);
    expect(out.near_misses).toBe(0);
    expect(out.adjusted_points).toEqual([]);
    expect(out.is_safe).toBe(true);
  });

  it("detects collisions when the part AABB covers the tool position", () => {
    const pts: FATIToolpathPoint[] = [
      { position: vec(0, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
    ];
    const out = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points: pts,
      tool: standardTool(),
      part_aabb: coveringAABB(),
      kinematic_config: acConfig(),
    });
    expect(out.collisions_detected).toBeGreaterThan(0);
    expect(out.collision_details.length).toBe(out.collisions_detected);
    for (const d of out.collision_details) {
      expect(["tool", "holder", "spindle"]).toContain(d.component);
      expect(d.penetration_mm).toBeGreaterThan(0);
    }
  });

  it("reports is_safe=true when the part is far from the toolpath", () => {
    const pts: FATIToolpathPoint[] = [
      { position: vec(0, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
      { position: vec(5, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
    ];
    const out = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points: pts,
      tool: standardTool(),
      part_aabb: farAwayAABB(),
      kinematic_config: acConfig(),
    });
    expect(out.collisions_detected).toBe(0);
    expect(out.is_safe).toBe(true);
  });

  it("includes fixture AABBs as additional obstacles", () => {
    const pts: FATIToolpathPoint[] = [
      { position: vec(0, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
    ];
    const out = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points: pts,
      tool: standardTool(),
      part_aabb: farAwayAABB(),
      fixture_aabbs: [coveringAABB()],
      kinematic_config: acConfig(),
    });
    expect(out.collisions_detected).toBeGreaterThan(0);
  });

  it("tracks adjusted_points length equal to the input points length", () => {
    const pts: FATIToolpathPoint[] = [
      { position: vec(0, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
      { position: vec(5, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
      { position: vec(10, 0, 0), normal: vec(0, 0, 1), tool_axis: vec(0, 0, 1), feed_dir: vec(1, 0, 0) },
    ];
    const out = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points: pts,
      tool: standardTool(),
      part_aabb: farAwayAABB(),
      kinematic_config: acConfig(),
    });
    expect(out.adjusted_points).toHaveLength(pts.length);
  });
});

describe("FiveAxisToolpathIntegrationEngine.roughing5Axis", () => {
  it("returns an empty result for empty surface input", () => {
    const out = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: [],
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(100, 100, 100) },
      stepover_mm: 1,
      stepdown_mm: 0.5,
      kinematic_config: acConfig(),
    });
    expect(out.zones).toEqual([]);
    expect(out.total_points).toBe(0);
    expect(out.zone_count_3plus2).toBe(0);
    expect(out.zone_count_5ax).toBe(0);
  });

  it("classifies all-flat Z-up surfaces as a single 3+2 zone", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 6 }, (_, i) => ({
      position: vec(i * 2, 0, 0),
      normal: vec(0, 0, 1),
    }));
    const out = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: pts,
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(100, 100, 100) },
      stepover_mm: 1,
      stepdown_mm: 0.5,
      kinematic_config: acConfig(),
      flatness_cos_threshold: FLATNESS_COS_DEFAULT,
    });
    expect(out.zones.length).toBe(1);
    expect(out.zones[0].strategy).toBe("3plus2");
    expect(out.zone_count_3plus2).toBe(1);
    expect(out.zone_count_5ax).toBe(0);
    expect(out.blend_transitions).toBe(0);
    expect(out.total_points).toBe(pts.length);
  });

  it("classifies steep-normal surfaces as full_5ax zones", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 4 }, (_, i) => ({
      position: vec(i * 2, 0, 0),
      normal: vec(1, 0, 0),
    }));
    const out = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: pts,
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(100, 100, 100) },
      stepover_mm: 1,
      stepdown_mm: 0.5,
      kinematic_config: acConfig(),
    });
    expect(out.zone_count_5ax).toBeGreaterThan(0);
    expect(out.zone_count_3plus2).toBe(0);
  });

  it("produces blend_transitions when surface normals alternate between flat and freeform", () => {
    const pts: FATIToolpathPoint[] = [
      { position: vec(0, 0, 0), normal: vec(0, 0, 1) },
      { position: vec(1, 0, 0), normal: vec(1, 0, 0) },
      { position: vec(2, 0, 0), normal: vec(0, 0, 1) },
      { position: vec(3, 0, 0), normal: vec(1, 0, 0) },
    ];
    const EXPECTED_TRANSITIONS = 3;
    const EXPECTED_ZONE_COUNT = 4;
    const out = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: pts,
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(100, 100, 100) },
      stepover_mm: 1,
      stepdown_mm: 0.5,
      kinematic_config: acConfig(),
    });
    expect(out.blend_transitions).toBe(EXPECTED_TRANSITIONS);
    expect(out.zones.length).toBe(EXPECTED_ZONE_COUNT);
    expect(out.zone_count_3plus2 + out.zone_count_5ax).toBe(out.zones.length);
  });

  it("reports non-negative MRR and preserves total_points equal to the sum of zone point counts", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 10 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
    }));
    const out = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: pts,
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(100, 100, 100) },
      stepover_mm: 2,
      stepdown_mm: 1,
      kinematic_config: acConfig(),
    });
    expect(out.estimated_mrr_cm3_min).toBeGreaterThanOrEqual(0);
    expect(out.total_points).toBe(out.zones.reduce((s, z) => s + z.points.length, 0));
  });
});

describe("FiveAxisToolpathIntegrationEngine.stochasticAnalysis", () => {
  it("returns zero statistics for empty input", () => {
    const out = fiveAxisToolpathIntegrationEngine.stochasticAnalysis({
      nominal_points: [],
      axis_angle_std_dev_deg: 1,
      position_std_dev_mm: 0.01,
    });
    expect(out.mean_surface_deviation_mm).toBe(0);
    expect(out.std_surface_deviation_mm).toBe(0);
    expect(out.p95_surface_deviation_mm).toBe(0);
    expect(out.tilt_sensitivity_mm_per_deg).toBe(0);
    expect(out.worst_case_index).toBe(0);
  });

  it("returns near-zero deviations when both std devs are zero", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 3 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
    }));
    const out = fiveAxisToolpathIntegrationEngine.stochasticAnalysis({
      nominal_points: pts,
      axis_angle_std_dev_deg: 0,
      position_std_dev_mm: 0,
      num_samples: 50,
    });
    expect(out.mean_surface_deviation_mm).toBeCloseTo(0, 6);
    expect(out.std_surface_deviation_mm).toBeCloseTo(0, 6);
    expect(out.p95_surface_deviation_mm).toBeCloseTo(0, 6);
  });

  it("returns strictly positive mean deviation for non-zero std devs", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 3 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
    }));
    const out = fiveAxisToolpathIntegrationEngine.stochasticAnalysis({
      nominal_points: pts,
      axis_angle_std_dev_deg: 2,
      position_std_dev_mm: 0.05,
      num_samples: MC_SAMPLES_DEFAULT,
    });
    expect(out.mean_surface_deviation_mm).toBeGreaterThan(0);
    expect(out.std_surface_deviation_mm).toBeGreaterThanOrEqual(0);
    expect(out.p95_surface_deviation_mm).toBeGreaterThanOrEqual(out.mean_surface_deviation_mm);
  });

  it("reports worst_case_index within the valid input range", () => {
    const pts: FATIToolpathPoint[] = Array.from({ length: 7 }, (_, i) => ({
      position: vec(i, 0, 0),
      normal: vec(0, 0, 1),
    }));
    const out = fiveAxisToolpathIntegrationEngine.stochasticAnalysis({
      nominal_points: pts,
      axis_angle_std_dev_deg: 1,
      position_std_dev_mm: 0.01,
      num_samples: 100,
    });
    expect(out.worst_case_index).toBeGreaterThanOrEqual(0);
    expect(out.worst_case_index).toBeLessThan(pts.length);
  });
});

describe("FiveAxisToolpathIntegrationEngine.calculate", () => {
  it("routes five_axis_contour to contourMill", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_contour", {
      points: [zUpPoint(0, 0, 0), zUpPoint(5, 0, 0)],
      angles: {},
      tool_diameter_mm: 10,
      normal_follow: false,
    });
    expect(out.points).toHaveLength(2);
    expect(out.total_length_mm).toBeCloseTo(5, 6);
  });

  it("routes five_axis_port to portMachine", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_port", {
      port_start: vec(0, 0, 0),
      port_end: vec(0, 0, 20),
      port_diameter_mm: 20,
      tool_diameter_mm: 6,
      num_passes: 1,
      stepover_mm: 1,
      detect_undercuts: false,
    });
    expect(out.passes).toHaveLength(1);
  });

  it("routes five_axis_singularity_manage to manageSingularities", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_singularity_manage", {
      points: [],
      kinematic_config: acConfig(),
      feed_rate_mm_min: 1000,
    });
    expect(out.is_safe).toBe(true);
    expect(out.total_points_checked).toBe(0);
  });

  it("routes five_axis_collision_avoid to avoidCollisions", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_collision_avoid", {
      points: [],
      tool: standardTool(),
      part_aabb: farAwayAABB(),
      kinematic_config: acConfig(),
    });
    expect(out.collisions_detected).toBe(0);
    expect(out.is_safe).toBe(true);
  });

  it("routes five_axis_roughing to roughing5Axis", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_roughing", {
      surface_points: [],
      tool: standardTool(),
      stock_aabb: { min: vec(0, 0, 0), max: vec(10, 10, 10) },
      stepover_mm: 1,
      stepdown_mm: 0.5,
      kinematic_config: acConfig(),
    });
    expect(out.zones).toEqual([]);
  });

  it("routes five_axis_stochastic to stochasticAnalysis", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("five_axis_stochastic", {
      nominal_points: [],
      axis_angle_std_dev_deg: 1,
      position_std_dev_mm: 0.01,
    });
    expect(out.mean_surface_deviation_mm).toBe(0);
  });

  it("returns a structured error for unknown actions instead of throwing", () => {
    const out = fiveAxisToolpathIntegrationEngine.calculate("not_a_real_action", {});
    expect(out.error).toMatch(/Unknown five-axis integration action/);
    expect(out.error).toContain("not_a_real_action");
  });
});
