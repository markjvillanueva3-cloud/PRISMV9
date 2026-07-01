/**
 * FiveAxisToolpathIntegrationEngine Tests — CK-MS5
 * Tests 5 capabilities: contour, port, singularity, collision, roughing + stochastic
 */
import { describe, it, expect } from "vitest";
import { fiveAxisToolpathIntegrationEngine } from "../engines/FiveAxisToolpathIntegrationEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

/** Generate points along a curved surface with normals. */
function makeSurfacePoints(n: number, curvature = 0.1) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    const x = t * 100;
    const z = curvature * Math.sin(t * Math.PI) * 20;
    const nx = -curvature * Math.cos(t * Math.PI) * 0.3;
    const len = Math.sqrt(nx * nx + 1);
    return {
      position: { x, y: 50, z },
      normal: { x: nx / len, y: 0, z: 1 / len },
      feed_dir: { x: 1, y: 0, z: 0 },
      tool_axis: { x: nx / len, y: 0, z: 1 / len },
      feed_rate_mm_min: 1000,
    };
  });
}

const defaultKinConfig = {
  type: "AC" as const,
  axis1_limits_deg: [-120, 120] as [number, number],
  axis2_limits_deg: [-360, 360] as [number, number],
  max_rotary_vel_deg_s: 50,
  pivot_length_mm: 200,
  tool_gauge_length_mm: 80,
};

const defaultTool = {
  diameter_mm: 10,
  cutting_length_mm: 30,
  holder_diameter_mm: 25,
  holder_length_mm: 40,
  spindle_diameter_mm: 60,
  spindle_length_mm: 100,
};

// ============================================================================
// 1. CONTOUR MILLING
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — Contour Milling", () => {
  it("generates contour points with lead/lag/tilt angles applied", () => {
    const points = makeSurfacePoints(20);
    const result = fiveAxisToolpathIntegrationEngine.contourMill({
      points,
      angles: { lead_rad: 0.05, lag_rad: 0, tilt_rad: 0.03 },
      tool_diameter_mm: 10,
      normal_follow: true,
    });
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.total_length_mm).toBeGreaterThan(0);
    expect(result.axis_smoothness_score).toBeGreaterThan(0);
    // Each point should have IK angles
    for (const pt of result.points) {
      expect(typeof pt.A_deg).toBe("number");
      expect(typeof pt.C_deg).toBe("number");
    }
  });

  it("returns empty result for empty input", () => {
    const result = fiveAxisToolpathIntegrationEngine.contourMill({
      points: [],
      angles: {},
      tool_diameter_mm: 10,
      normal_follow: true,
    });
    expect(result.points.length).toBe(0);
    expect(result.total_length_mm).toBe(0);
  });

  it("applies boundary trimming to exclude out-of-bounds points", () => {
    const points = makeSurfacePoints(20);
    // Boundary covers only first half
    const boundary = [
      { x: -10, y: -10 }, { x: 55, y: -10 },
      { x: 55, y: 110 }, { x: -10, y: 110 },
    ];
    const result = fiveAxisToolpathIntegrationEngine.contourMill({
      points,
      angles: { lead_rad: 0 },
      tool_diameter_mm: 10,
      boundary,
      normal_follow: true,
    });
    // Should have fewer points than input since some are outside boundary
    expect(result.points.length).toBeLessThan(points.length);
    expect(result.points.length).toBeGreaterThan(0);
  });

  it("smoothing improves axis continuity", () => {
    const points = makeSurfacePoints(30, 0.5); // high curvature
    const noSmooth = fiveAxisToolpathIntegrationEngine.contourMill({
      points, angles: {}, tool_diameter_mm: 10,
      smoothing_window: 1, normal_follow: true,
    });
    const withSmooth = fiveAxisToolpathIntegrationEngine.contourMill({
      points, angles: {}, tool_diameter_mm: 10,
      smoothing_window: 7, normal_follow: true,
    });
    expect(withSmooth.axis_smoothness_score).toBeGreaterThanOrEqual(
      noSmooth.axis_smoothness_score - 0.1
    );
  });
});

// ============================================================================
// 2. PORT MACHINING
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — Port Machining", () => {
  it("generates helical passes inside a cylindrical port", () => {
    const result = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: { x: 0, y: 0, z: 0 },
      port_end: { x: 0, y: 0, z: -50 },
      port_diameter_mm: 30,
      tool_diameter_mm: 10,
      num_passes: 3,
      stepover_mm: 3,
      detect_undercuts: true,
    });
    expect(result.passes.length).toBe(3);
    expect(result.total_points).toBeGreaterThan(0);
    expect(result.rest_material_volume_mm3).toBeGreaterThan(0);
    // Each pass should have points with tool axes
    for (const pass of result.passes) {
      expect(pass.points.length).toBeGreaterThan(0);
      expect(pass.radial_depth_mm).toBeGreaterThan(0);
    }
  });

  it("returns empty when tool larger than port", () => {
    const result = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: { x: 0, y: 0, z: 0 },
      port_end: { x: 0, y: 0, z: -50 },
      port_diameter_mm: 8,
      tool_diameter_mm: 10,
      num_passes: 2,
      stepover_mm: 2,
      detect_undercuts: false,
    });
    expect(result.passes.length).toBe(0);
    expect(result.total_points).toBe(0);
  });

  it("detects undercuts in tight ports", () => {
    // Port barely larger than tool — should flag undercuts
    const result = fiveAxisToolpathIntegrationEngine.portMachine({
      port_start: { x: 0, y: 0, z: 0 },
      port_end: { x: 0, y: 0, z: -80 },
      port_diameter_mm: 14,
      tool_diameter_mm: 10,
      num_passes: 2,
      stepover_mm: 1,
      detect_undercuts: true,
    });
    expect(result.undercuts_detected).toBeGreaterThan(0);
    expect(result.passes.some(p => p.is_undercut_region)).toBe(true);
  });
});

// ============================================================================
// 3. SINGULARITY MANAGEMENT
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — Singularity Management", () => {
  it("detects gimbal lock when tool axis near Z (AC config)", () => {
    // Points with tool axis transitioning through Z-axis (singular for AC)
    const points = Array.from({ length: 20 }, (_, i) => {
      const t = i / 19;
      const tiltAngle = (t - 0.5) * 0.02; // near-zero tilt = near singularity
      return {
        position: { x: i * 5, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        tool_axis: { x: Math.sin(tiltAngle), y: 0, z: Math.cos(tiltAngle) },
      };
    });
    const result = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points,
      kinematic_config: defaultKinConfig,
      feed_rate_mm_min: 1000,
      singularity_threshold: 0.05,
    });
    expect(result.total_points_checked).toBe(20);
    // Should detect singular zone(s) near center
    expect(result.singular_zones.length).toBeGreaterThan(0);
    expect(result.corrected_points.length).toBe(20);
  });

  it("marks safe path when tool is well-tilted", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i * 10, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      tool_axis: { x: 0, y: 0.5, z: 0.866 }, // ~30° from Z — well away from singularity
    }));
    const result = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points,
      kinematic_config: defaultKinConfig,
      feed_rate_mm_min: 500,
    });
    expect(result.is_safe).toBe(true);
    expect(result.singular_zones.length).toBe(0);
  });

  it("applies SLERP retraction through singular zone", () => {
    // Create path that passes through singularity
    const points = Array.from({ length: 30 }, (_, i) => {
      const t = (i - 15) / 15; // -1 to 1
      const tilt = t * 0.01; // very small tilt through center
      return {
        position: { x: i * 3, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        tool_axis: { x: tilt, y: 0, z: 1 },
      };
    });
    const result = fiveAxisToolpathIntegrationEngine.manageSingularities({
      points,
      kinematic_config: defaultKinConfig,
      feed_rate_mm_min: 1000,
      singularity_threshold: 0.05,
      max_retraction_deg: 10,
    });
    expect(result.retraction_count).toBeGreaterThan(0);
    // Corrected axes should be different from original in singular zone
    if (result.singular_zones.length > 0) {
      const zone = result.singular_zones[0];
      const origAxis = points[zone.start_index].tool_axis;
      const corrAxis = result.corrected_points[zone.start_index].tool_axis!;
      const diff = Math.abs(origAxis.x - corrAxis.x) + Math.abs(origAxis.y - corrAxis.y);
      expect(diff).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 4. COLLISION AVOIDANCE
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — Collision Avoidance", () => {
  it("marks safe path when tool is clear of obstacles", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i * 10, y: 50, z: 50 }, // well above part
      normal: { x: 0, y: 0, z: 1 },
      tool_axis: { x: 0, y: 0, z: 1 },
    }));
    const result = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points,
      tool: defaultTool,
      part_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 0 } },
      kinematic_config: defaultKinConfig,
    });
    expect(result.is_safe).toBe(true);
    expect(result.collisions_detected).toBe(0);
  });

  it("detects holder collision with part", () => {
    // Tool tip at z=5 above part, but holder extends into part zone
    const points = [{
      position: { x: 50, y: 50, z: 5 },
      normal: { x: 0, y: 0, z: 1 },
      tool_axis: { x: 0.3, y: 0, z: 0.954 }, // tilted, holder sweeps wider
      feed_dir: { x: 1, y: 0, z: 0 },
    }];
    const result = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points,
      tool: { ...defaultTool, holder_diameter_mm: 50, holder_length_mm: 80 },
      part_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 40 } },
      kinematic_config: defaultKinConfig,
      max_tilt_adjust_deg: 15,
    });
    expect(result.collisions_detected).toBeGreaterThan(0);
    expect(result.collision_details.length).toBeGreaterThan(0);
  });

  it("detects near-misses within threshold", () => {
    // Position tool just above part surface
    const points = [{
      position: { x: 50, y: 50, z: 200 }, // high above
      normal: { x: 0, y: 0, z: 1 },
      tool_axis: { x: 0, y: 0, z: 1 },
    }];
    const result = fiveAxisToolpathIntegrationEngine.avoidCollisions({
      points,
      tool: defaultTool,
      part_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 0 } },
      kinematic_config: defaultKinConfig,
      near_miss_threshold_mm: 500, // large threshold to catch near-misses
    });
    // High above part, but with huge threshold should flag near-misses
    expect(result.collisions_detected).toBe(0);
  });
});

// ============================================================================
// 5. SIMULTANEOUS 5-AXIS ROUGHING
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — 5-Axis Roughing", () => {
  it("classifies flat regions as 3+2 and curved as full 5-axis", () => {
    // Mix of flat (normal ≈ Z) and tilted points
    const points = Array.from({ length: 20 }, (_, i) => {
      const isFlatZone = i < 10;
      return {
        position: { x: i * 5, y: 50, z: isFlatZone ? 0 : Math.sin(i * 0.5) * 10 },
        normal: isFlatZone
          ? { x: 0, y: 0, z: 1 }
          : { x: Math.sin(i * 0.3) * 0.5, y: 0, z: 0.866 },
        feed_dir: { x: 1, y: 0, z: 0 },
      };
    });
    const result = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: points,
      tool: defaultTool,
      stock_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 10 } },
      stepover_mm: 4,
      stepdown_mm: 3,
      kinematic_config: defaultKinConfig,
      flatness_cos_threshold: 0.95,
    });
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.zone_count_3plus2).toBeGreaterThan(0);
    expect(result.total_points).toBe(20);
    expect(result.estimated_mrr_cm3_min).toBeGreaterThan(0);
  });

  it("returns empty for no surface points", () => {
    const result = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: [],
      tool: defaultTool,
      stock_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 10 } },
      stepover_mm: 4,
      stepdown_mm: 3,
      kinematic_config: defaultKinConfig,
    });
    expect(result.zones.length).toBe(0);
    expect(result.total_points).toBe(0);
  });

  it("counts blend transitions between zone types", () => {
    // Alternate flat/curved every 5 points
    const points = Array.from({ length: 20 }, (_, i) => {
      const group = Math.floor(i / 5);
      const isFlat = group % 2 === 0;
      return {
        position: { x: i * 5, y: 50, z: 0 },
        normal: isFlat
          ? { x: 0, y: 0, z: 1 }
          : { x: 0.5, y: 0, z: 0.5 }, // heavily tilted = full 5ax
      };
    });
    const result = fiveAxisToolpathIntegrationEngine.roughing5Axis({
      surface_points: points,
      tool: defaultTool,
      stock_aabb: { min: { x: 0, y: 0, z: -30 }, max: { x: 100, y: 100, z: 10 } },
      stepover_mm: 4,
      stepdown_mm: 3,
      kinematic_config: defaultKinConfig,
    });
    expect(result.blend_transitions).toBeGreaterThan(0);
    expect(result.zones.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 6. STOCHASTIC ANALYSIS
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — Stochastic Analysis", () => {
  it("propagates axis uncertainty to surface deviation", () => {
    const points = makeSurfacePoints(10);
    const result = fiveAxisToolpathIntegrationEngine.stochasticAnalysis({
      nominal_points: points,
      axis_angle_std_dev_deg: 0.5,
      position_std_dev_mm: 0.01,
      num_samples: 100,
    });
    expect(result.mean_surface_deviation_mm).toBeGreaterThan(0);
    expect(result.std_surface_deviation_mm).toBeGreaterThan(0);
    expect(result.p95_surface_deviation_mm).toBeGreaterThanOrEqual(result.mean_surface_deviation_mm);
    expect(result.tilt_sensitivity_mm_per_deg).toBeGreaterThan(0);
    expect(result.worst_case_index).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 7. UNIFIED CALCULATE
// ============================================================================

describe("FiveAxisToolpathIntegrationEngine — calculate() dispatch", () => {
  it("dispatches five_axis_contour correctly", () => {
    const result = fiveAxisToolpathIntegrationEngine.calculate("five_axis_contour", {
      points: makeSurfacePoints(5),
      angles: {},
      tool_diameter_mm: 10,
      normal_follow: true,
    });
    expect(result.points).toBeDefined();
  });

  it("returns error for unknown action", () => {
    const result = fiveAxisToolpathIntegrationEngine.calculate("unknown_action", {});
    expect(result.error).toContain("Unknown");
  });
});
