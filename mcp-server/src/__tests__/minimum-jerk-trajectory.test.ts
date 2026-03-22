import { describe, it, expect } from "vitest";
import {
  minimumJerkTrajectoryEngine,
  Waypoint,
  MotionConstraints,
  TrajectoryPlan,
  ToolpathBlock,
} from "../engines/MinimumJerkTrajectoryEngine.js";

// ── Shared constants ───────────────────────────────────────────────────────

const defaultConstraints: MotionConstraints = {
  max_velocity_mm_s: 100,
  max_acceleration_mm_s2: 5000,
  max_jerk_mm_s3: 50000,
};

const simpleWaypoints: Waypoint[] = [
  { x: 0, y: 0, z: 0 },
  { x: 50, y: 0, z: 0 },
];

const threeWaypoints: Waypoint[] = [
  { x: 0, y: 0, z: 0 },
  { x: 50, y: 0, z: 0 },
  { x: 50, y: 50, z: 0 },
];

// ── minimumJerkSegment ─────────────────────────────────────────────────────

describe("MinimumJerkTrajectoryEngine", () => {
  describe("minimumJerkSegment", () => {
    it("should satisfy start boundary conditions (position, velocity, acceleration)", () => {
      const T = 1.0;
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(10, 5, 2, 50, 3, 1, T);
      const state = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, 0);

      expect(state.position).toBeCloseTo(10, 6);
      expect(state.velocity).toBeCloseTo(5, 6);
      expect(state.acceleration).toBeCloseTo(2, 6);
    });

    it("should satisfy end boundary conditions (position, velocity, acceleration)", () => {
      const T = 1.0;
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(10, 5, 2, 50, 3, 1, T);
      const state = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, T);

      expect(state.position).toBeCloseTo(50, 4);
      expect(state.velocity).toBeCloseTo(3, 4);
      expect(state.acceleration).toBeCloseTo(1, 4);
    });

    it("should return degenerate coefficients for zero duration", () => {
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(10, 5, 2, 50, 3, 1, 0);
      expect(coeffs[0]).toBe(10);
      expect(coeffs[1]).toBe(0);
    });

    it("should produce rest-to-rest trajectory (zero vel/acc boundaries)", () => {
      const T = 2.0;
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(0, 0, 0, 100, 0, 0, T);
      const start = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, 0);
      const end = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, T);

      expect(start.position).toBeCloseTo(0, 6);
      expect(start.velocity).toBeCloseTo(0, 6);
      expect(end.position).toBeCloseTo(100, 4);
      expect(end.velocity).toBeCloseTo(0, 4);
    });
  });

  // ── evaluateSegment ────────────────────────────────────────────────────

  describe("evaluateSegment", () => {
    it("should compute correct derivatives (velocity is d/dt of position)", () => {
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(0, 0, 0, 100, 0, 0, 1.0);
      const dt = 1e-6;
      const t = 0.5;
      const s1 = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, t);
      const s2 = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, t + dt);

      const numericalVel = (s2.position - s1.position) / dt;
      expect(s1.velocity).toBeCloseTo(numericalVel, 2);
    });

    it("should compute acceleration as derivative of velocity", () => {
      const coeffs = minimumJerkTrajectoryEngine.minimumJerkSegment(0, 0, 0, 100, 0, 0, 1.0);
      const dt = 1e-6;
      const t = 0.5;
      const s1 = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, t);
      const s2 = minimumJerkTrajectoryEngine.evaluateSegment(coeffs, t + dt);

      const numericalAcc = (s2.velocity - s1.velocity) / dt;
      expect(s1.acceleration).toBeCloseTo(numericalAcc, 1);
    });
  });

  // ── planTrajectory ─────────────────────────────────────────────────────

  describe("planTrajectory", () => {
    it("should produce segments connecting consecutive waypoints", () => {
      const plan = minimumJerkTrajectoryEngine.planTrajectory(threeWaypoints, defaultConstraints);

      expect(plan.segments).toHaveLength(2);
      expect(plan.segments[0].waypoint_start).toBe(0);
      expect(plan.segments[0].waypoint_end).toBe(1);
      expect(plan.segments[1].waypoint_start).toBe(1);
      expect(plan.segments[1].waypoint_end).toBe(2);
    });

    it("should have positive total time and distance", () => {
      const plan = minimumJerkTrajectoryEngine.planTrajectory(simpleWaypoints, defaultConstraints);

      expect(plan.total_time_s).toBeGreaterThan(0);
      expect(plan.total_distance_mm).toBeCloseTo(50, 2);
    });

    it("should return empty plan for fewer than 2 waypoints", () => {
      const plan = minimumJerkTrajectoryEngine.planTrajectory(
        [{ x: 0, y: 0, z: 0 }],
        defaultConstraints,
      );

      expect(plan.segments).toHaveLength(0);
      expect(plan.total_time_s).toBe(0);
    });

    it("should produce 3 axis coefficients per segment (x, y, z)", () => {
      const plan = minimumJerkTrajectoryEngine.planTrajectory(simpleWaypoints, defaultConstraints);

      for (const seg of plan.segments) {
        expect(seg.axes).toHaveLength(3);
        const axisNames = seg.axes.map(a => a.axis);
        expect(axisNames).toContain("x");
        expect(axisNames).toContain("y");
        expect(axisNames).toContain("z");
      }
    });
  });

  // ── computeJerkProfile ─────────────────────────────────────────────────

  describe("computeJerkProfile", () => {
    it("should return non-negative jerk statistics", () => {
      const plan = minimumJerkTrajectoryEngine.planTrajectory(simpleWaypoints, defaultConstraints);
      const profile = minimumJerkTrajectoryEngine.computeJerkProfile(plan);

      expect(profile.max_jerk).toBeGreaterThanOrEqual(0);
      expect(profile.rms_jerk).toBeGreaterThanOrEqual(0);
      expect(profile.jerk_integral).toBeGreaterThanOrEqual(0);
      expect(profile.samples).toBeGreaterThan(0);
    });

    it("should return zeros for empty plan", () => {
      const empty: TrajectoryPlan = { segments: [], total_time_s: 0, total_distance_mm: 0 };
      const profile = minimumJerkTrajectoryEngine.computeJerkProfile(empty);

      expect(profile.max_jerk).toBe(0);
      expect(profile.rms_jerk).toBe(0);
      expect(profile.samples).toBe(0);
    });
  });

  // ── compareVsSCurve ────────────────────────────────────────────────────

  describe("compareVsSCurve", () => {
    it("should show minimum-jerk has lower or equal RMS jerk than S-curve", () => {
      const comparison = minimumJerkTrajectoryEngine.compareVsSCurve(
        simpleWaypoints,
        defaultConstraints,
      );

      expect(comparison.min_jerk.rms_jerk).toBeLessThanOrEqual(comparison.s_curve.rms_jerk);
      expect(comparison.jerk_reduction_pct).toBeGreaterThanOrEqual(0);
    });

    it("should provide a recommendation string", () => {
      const comparison = minimumJerkTrajectoryEngine.compareVsSCurve(
        threeWaypoints,
        defaultConstraints,
      );

      expect(typeof comparison.recommendation).toBe("string");
      expect(comparison.recommendation.length).toBeGreaterThan(10);
    });
  });

  // ── optimizeFeedProfile ────────────────────────────────────────────────

  describe("optimizeFeedProfile", () => {
    it("should insert smooth transition points between blocks with different feeds", () => {
      const blocks: ToolpathBlock[] = [
        { x: 0, y: 0, z: 0, feed_mm_min: 1000 },
        { x: 10, y: 0, z: 0, feed_mm_min: 500 },
        { x: 20, y: 0, z: 0, feed_mm_min: 500 },
      ];
      const result = minimumJerkTrajectoryEngine.optimizeFeedProfile(blocks);

      // Transition points added between block 0 and block 1 (50% drop)
      expect(result.length).toBeGreaterThan(blocks.length);
      // First and last feeds should match originals
      expect(result[0].feed_mm_min).toBe(1000);
      expect(result[result.length - 1].feed_mm_min).toBe(500);
    });

    it("should not add transitions when feed change is < 10%", () => {
      const blocks: ToolpathBlock[] = [
        { x: 0, y: 0, z: 0, feed_mm_min: 1000 },
        { x: 10, y: 0, z: 0, feed_mm_min: 1050 },
      ];
      const result = minimumJerkTrajectoryEngine.optimizeFeedProfile(blocks);

      expect(result).toHaveLength(2);
    });

    it("should return copy for single block", () => {
      const blocks: ToolpathBlock[] = [{ x: 0, y: 0, z: 0, feed_mm_min: 1000 }];
      const result = minimumJerkTrajectoryEngine.optimizeFeedProfile(blocks);
      expect(result).toHaveLength(1);
    });
  });

  // ── Dispatcher calculate ───────────────────────────────────────────────

  describe("calculate dispatcher", () => {
    it("should dispatch plan_trajectory action", () => {
      const result = minimumJerkTrajectoryEngine.calculate("plan_trajectory", {
        waypoints: simpleWaypoints,
        max_velocity_mm_s: 100,
        max_acceleration_mm_s2: 5000,
        max_jerk_mm_s3: 50000,
      });

      expect(result.segments).toBeDefined();
      expect(result.total_time_s).toBeGreaterThan(0);
    });

    it("should throw on unknown action", () => {
      expect(() => minimumJerkTrajectoryEngine.calculate("bogus_action", {})).toThrow(
        "unknown action",
      );
    });
  });
});
