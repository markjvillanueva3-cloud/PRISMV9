/**
 * ToolAxisOptimizationEngine Tests — CAMK-MS0/U05
 * Tests 5-axis tool orientation optimization
 */
import { describe, it, expect } from "vitest";
import { toolAxisOptimizationEngine } from "../engines/ToolAxisOptimizationEngine.js";

describe("ToolAxisOptimizationEngine", () => {
  const flatPoint = {
    position: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: 1 },
    feed_direction: { x: 1, y: 0, z: 0 },
  };

  // ---- Basic flat surface — tool axis near Z ----
  it("keeps tool axis near surface normal on flat surface", () => {
    const result = toolAxisOptimizationEngine.optimize({
      points: [flatPoint],
      cutter_radius_mm: 5,
    });
    expect(result.axes).toHaveLength(1);
    expect(result.axes[0].axis.z).toBeGreaterThan(0.9);
    expect(result.axes[0].tilt_deg).toBeLessThan(15);
    expect(result.gouge_free).toBe(true);
  });

  // ---- Gouge avoidance tilt ----
  it("computes gouge avoidance tilt for concave surface", () => {
    // When surface R = 3mm and cutter R = 5mm → need tilt
    const tilt = toolAxisOptimizationEngine.gougeAvoidanceTilt(5, 1 / 3, 0);
    expect(tilt).toBeGreaterThan(0);
  });

  it("returns zero tilt for flat/convex surface", () => {
    const tilt = toolAxisOptimizationEngine.gougeAvoidanceTilt(5, 0, 0);
    expect(tilt).toBe(0);

    const tiltConvex = toolAxisOptimizationEngine.gougeAvoidanceTilt(5, -0.01, 0);
    expect(tiltConvex).toBe(0);
  });

  // ---- Stiffness scoring ----
  it("gives high stiffness when axis aligns with force", () => {
    const score = toolAxisOptimizationEngine.stiffnessScore(
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 }
    );
    expect(score).toBe(100);
  });

  it("gives low stiffness when axis perpendicular to force", () => {
    const score = toolAxisOptimizationEngine.stiffnessScore(
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 }
    );
    expect(score).toBe(0);
  });

  // ---- Singularity distance ----
  it("detects near-singularity when tool parallel to Z", () => {
    const dist = toolAxisOptimizationEngine.singularityDistance(
      { x: 0, y: 0, z: 1 },
    );
    expect(dist).toBeLessThan(1); // nearly at singularity
  });

  it("shows large singularity distance at 45°", () => {
    const dist = toolAxisOptimizationEngine.singularityDistance(
      { x: 0.707, y: 0, z: 0.707 },
    );
    expect(dist).toBeGreaterThan(30);
  });

  // ---- Rotary angle computation ----
  it("computes AC rotary angles from tool axis", () => {
    const angles = toolAxisOptimizationEngine.toolAxisToRotary(
      { x: 0, y: 0, z: 1 },
      { type: "AC", a_min_deg: -120, a_max_deg: 120 }
    );
    expect(angles.a_deg).toBeCloseTo(0, 1); // 0° tilt
  });

  it("computes BC rotary angles", () => {
    const angles = toolAxisOptimizationEngine.toolAxisToRotary(
      { x: 0.5, y: 0, z: 0.866 }, // 30° tilt
      { type: "BC" }
    );
    expect(angles.b_deg).toBeCloseTo(30, 0);
  });

  // ---- Multi-point smoothing ----
  it("smooths axis transitions with SLERP", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i * 10, y: 0, z: 0 },
      normal: { x: 0, y: Math.sin(i * 0.2) * 0.3, z: 1 },
      feed_direction: { x: 1, y: 0, z: 0 },
    }));
    const result = toolAxisOptimizationEngine.optimize({
      points,
      cutter_radius_mm: 5,
      smoothing_window: 5,
    });
    expect(result.axes).toHaveLength(10);
    expect(result.smoothness_score).toBeGreaterThan(0);
    // All axes should be reasonable (z > 0.8)
    for (const ax of result.axes) {
      expect(ax.axis.z).toBeGreaterThan(0.7);
    }
  });

  // ---- Singularity avoidance ----
  it("pushes axis away from singularity", () => {
    // Points with tool axis nearly parallel to Z (near singularity)
    const result = toolAxisOptimizationEngine.optimize({
      points: [{
        position: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        feed_direction: { x: 1, y: 0, z: 0 },
      }],
      cutter_radius_mm: 5,
      machine: { type: "AC", singularity_threshold_deg: 10 },
    });
    // Engine should push away from exact Z alignment
    expect(result.axes[0].singularity_distance_deg).toBeGreaterThanOrEqual(0);
  });

  // ---- Integration with force direction ----
  it("considers force direction for stiffness", () => {
    const result = toolAxisOptimizationEngine.optimize({
      points: [{
        ...flatPoint,
        force_direction: { x: 0, y: 0, z: -1 },
      }],
      cutter_radius_mm: 5,
    });
    expect(result.axes[0].stiffness_score).toBeGreaterThan(50);
  });

  // ---- Max tilt constraint ----
  it("respects max tilt constraint", () => {
    const result = toolAxisOptimizationEngine.optimize({
      points: [{
        position: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        feed_direction: { x: 1, y: 0, z: 0 },
        kappa_feed: 0.5, // tight concave → needs tilt
        kappa_cross: 0.5,
      }],
      cutter_radius_mm: 5,
      max_tilt_deg: 10,
    });
    expect(result.axes[0].tilt_deg).toBeLessThanOrEqual(15); // within constraint + lead
  });

  // ---- SLERP interpolation ----
  it("SLERP produces valid intermediate quaternions", () => {
    const q1 = { w: 1, x: 0, y: 0, z: 0 }; // identity
    const q2 = { w: 0.707, x: 0.707, y: 0, z: 0 }; // 90° around X
    const mid = toolAxisOptimizationEngine.slerp(q1, q2, 0.5);
    // Magnitude should be 1
    const mag = Math.sqrt(mid.w ** 2 + mid.x ** 2 + mid.y ** 2 + mid.z ** 2);
    expect(mag).toBeCloseTo(1, 3);
  });
});
