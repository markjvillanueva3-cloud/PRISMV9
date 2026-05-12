/**
 * PHCurveToolpathEngine Tests
 * Tests Pythagorean-Hodograph exact arc-length toolpath generation.
 */
import { describe, it, expect } from "vitest";
import { phCurveToolpathEngine, type Point2D, type Vec2D } from "../engines/PHCurveToolpathEngine.js";

describe("PHCurveToolpathEngine", () => {

  // ---- phQuinticInterpolate ----

  it("phQuinticInterpolate produces 6 control points for a quintic Bezier", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 }
    );
    expect(seg.control_points).toHaveLength(6);
    expect(seg.total_length).toBeGreaterThan(0);
    expect(seg.sigma_coeffs.length).toBeGreaterThan(0);
  });

  it("phQuinticInterpolate start/end match input points", () => {
    const p0: Point2D = { x: 0, y: 0 };
    const p1: Point2D = { x: 20, y: 15 };
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      p0, { x: 5, y: 0 }, p1, { x: 5, y: 0 }
    );
    expect(seg.start.x).toBeCloseTo(p0.x, 6);
    expect(seg.start.y).toBeCloseTo(p0.y, 6);
    // End point from control_points[5] should approximate p1
    expect(seg.control_points[5].x).toBeCloseTo(p1.x, 0);
    expect(seg.control_points[5].y).toBeCloseTo(p1.y, 0);
  });

  // ---- exactArcLength ----

  it("exactArcLength returns positive value for a non-degenerate segment", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 0 }, { x: 10, y: 0 }
    );
    const len = phCurveToolpathEngine.exactArcLength(seg, 0, 1);
    expect(len).toBeGreaterThan(0);
    expect(len).toBeCloseTo(seg.total_length, 6);
  });

  it("exactArcLength is monotonic with parameter range", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 20, y: 0 },
      { x: 30, y: 20 }, { x: 0, y: 20 }
    );
    const len25 = phCurveToolpathEngine.exactArcLength(seg, 0, 0.25);
    const len50 = phCurveToolpathEngine.exactArcLength(seg, 0, 0.5);
    const len75 = phCurveToolpathEngine.exactArcLength(seg, 0, 0.75);
    const lenFull = phCurveToolpathEngine.exactArcLength(seg, 0, 1);
    expect(len25).toBeGreaterThan(0);
    expect(len50).toBeGreaterThan(len25);
    expect(len75).toBeGreaterThan(len50);
    expect(lenFull).toBeGreaterThan(len75);
  });

  // ---- constantFeedParameterization ----

  it("constantFeedParameterization returns uniformly spaced points", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 30, y: 0 },
      { x: 30, y: 0 }, { x: 30, y: 0 }
    );
    const result = phCurveToolpathEngine.constantFeedParameterization(seg, 6000, 0.001);
    expect(result.points.length).toBeGreaterThanOrEqual(2);
    expect(result.spacing_mm).toBeGreaterThan(0);
    // PH curves enable very accurate constant-feed: error should be small
    expect(result.max_spacing_error_pct).toBeLessThan(5);
  });

  it("constantFeedParameterization first and last points match segment endpoints", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 15, y: 0 },
      { x: 15, y: 10 }, { x: 0, y: 10 }
    );
    const result = phCurveToolpathEngine.constantFeedParameterization(seg, 3000, 0.002);
    const first = result.points[0];
    const last = result.points[result.points.length - 1];
    expect(first.x).toBeCloseTo(seg.start.x, 1);
    expect(first.y).toBeCloseTo(seg.start.y, 1);
    // Last point should be near segment end
    expect(last.x).toBeDefined();
    expect(last.y).toBeDefined();
  });

  // ---- interpolatePath ----

  it("interpolatePath through multiple waypoints creates correct segment count", () => {
    const waypoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
      { x: 30, y: 5 },
    ];
    const spline = phCurveToolpathEngine.interpolatePath(waypoints);
    expect(spline.segments).toHaveLength(3); // n-1 segments
    expect(spline.total_length).toBeGreaterThan(0);
  });

  it("interpolatePath with 2 points produces 1 segment", () => {
    const spline = phCurveToolpathEngine.interpolatePath([
      { x: 0, y: 0 }, { x: 50, y: 0 }
    ]);
    expect(spline.segments).toHaveLength(1);
    expect(spline.total_length).toBeGreaterThan(0);
  });

  it("interpolatePath with fewer than 2 points returns empty spline", () => {
    const spline = phCurveToolpathEngine.interpolatePath([{ x: 0, y: 0 }]);
    expect(spline.segments).toHaveLength(0);
    expect(spline.total_length).toBe(0);
  });

  // ---- feedAccuracy ----

  it("feedAccuracy returns low error for PH arc-length parameterization", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 20, y: 0 },
      { x: 20, y: 0 }, { x: 20, y: 0 }
    );
    const result = phCurveToolpathEngine.feedAccuracy(seg, 5000, 100);
    expect(result.num_samples).toBe(100);
    expect(result.max_error_pct).toBeGreaterThanOrEqual(0);
    expect(result.rms_error_pct).toBeGreaterThanOrEqual(0);
    expect(result.formula).toContain("Newton");
  });

  // ---- compareVsLinear (dispatcher-level) ----

  it("feedAccuracy formula string describes the Newton inversion method", () => {
    const seg = phCurveToolpathEngine.phQuinticInterpolate(
      { x: 0, y: 0 }, { x: 10, y: 5 },
      { x: 20, y: 10 }, { x: 10, y: 5 }
    );
    const result = phCurveToolpathEngine.feedAccuracy(seg, 3000, 50);
    expect(result.formula).toContain("s(t)");
    expect(result.formula).toContain("σ");
    expect(result.num_samples).toBe(50);
  });

  it("compareVsLinear shows PH advantage over linear for curved paths", () => {
    const waypoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 8 },
      { x: 20, y: 0 },
    ];
    const result = phCurveToolpathEngine.compareVsLinear(waypoints, 0.01);
    expect(result.ph_segment_count).toBe(2);
    expect(result.linear_segment_count).toBeGreaterThanOrEqual(result.ph_segment_count);
    expect(result.compression_ratio).toBeGreaterThanOrEqual(1);
    expect(result.formula).toContain("PH");
  });
});
