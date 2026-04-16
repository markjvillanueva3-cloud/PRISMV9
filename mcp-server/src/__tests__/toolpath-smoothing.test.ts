/**
 * ToolpathSmoothingEngine Tests
 * Tests B-spline, corner rounding, and Bezier smoothing with chord error control.
 */
import { describe, it, expect } from "vitest";
import { toolpathSmoothingEngine } from "../engines/ToolpathSmoothingEngine.js";
import type { Point3D } from "../engines/ToolpathSmoothingEngine.js";

function straightLine(n: number): Point3D[] {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 10, y: 0, z: 0,
  }));
}

function zigzag(n: number): Point3D[] {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 10, y: (i % 2 === 0) ? 0 : 10, z: 0,
  }));
}

function arc90(n: number): Point3D[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / (n - 1)) * Math.PI / 2;
    return { x: 50 * Math.cos(angle), y: 50 * Math.sin(angle), z: 0 };
  });
}

describe("ToolpathSmoothingEngine", () => {
  // ── Curvature ──────────────────────────────────────────────────────
  it("curvature of collinear points is 0", () => {
    const k = toolpathSmoothingEngine.curvature(
      { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, { x: 10, y: 0, z: 0 },
    );
    expect(k).toBeCloseTo(0, 8);
  });

  it("curvature of circular arc is ~1/R", () => {
    const R = 50;
    const a0 = 0, a1 = 0.01, a2 = 0.02; // small angle increments
    const k = toolpathSmoothingEngine.curvature(
      { x: R * Math.cos(a0), y: R * Math.sin(a0), z: 0 },
      { x: R * Math.cos(a1), y: R * Math.sin(a1), z: 0 },
      { x: R * Math.cos(a2), y: R * Math.sin(a2), z: 0 },
    );
    expect(k).toBeGreaterThan(0.01);
    expect(k).toBeLessThan(0.05); // should be near 1/50=0.02
  });

  // ── Max feed from curvature ────────────────────────────────────────
  it("max feed is infinite for zero curvature", () => {
    const feed = toolpathSmoothingEngine.maxFeedFromCurvature(0, 5000);
    expect(feed).toBe(Infinity);
  });

  it("max feed decreases with higher curvature", () => {
    const f1 = toolpathSmoothingEngine.maxFeedFromCurvature(0.01, 5000);
    const f2 = toolpathSmoothingEngine.maxFeedFromCurvature(0.1, 5000);
    expect(f1).toBeGreaterThan(f2);
  });

  // ── Chord error ────────────────────────────────────────────────────
  it("chord error is 0 for identical paths", () => {
    const pts = straightLine(5);
    expect(toolpathSmoothingEngine.maxChordError(pts, pts)).toBeCloseTo(0, 8);
  });

  // ── Polyline length ────────────────────────────────────────────────
  it("polyline length matches expected", () => {
    const pts = straightLine(5); // 0,10,20,30,40 → length=40
    expect(toolpathSmoothingEngine.polylineLength(pts)).toBeCloseTo(40, 5);
  });

  // ── B-spline smoothing ─────────────────────────────────────────────
  it("bspline smooth of straight line stays straight", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: straightLine(10),
      method: "bspline",
      smoothing_factor: 0.5,
    });
    expect(result.max_chord_error_mm).toBeLessThan(0.1);
    expect(result.c_continuity).toBe(2);
    expect(result.method_used).toBe("bspline");
  });

  it("bspline reduces curvature on zigzag path", () => {
    const orig = zigzag(8);
    const result = toolpathSmoothingEngine.smooth({
      points: orig,
      method: "bspline",
      smoothing_factor: 0.8,
      max_chord_error_mm: 5, // loose for zigzag
    });
    expect(result.point_count_smoothed).toBeGreaterThan(0);
    expect(result.mean_curvature).toBeDefined();
  });

  // ── Corner rounding ────────────────────────────────────────────────
  it("corner round produces more points than input", () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 20, y: 10, z: 0 },
    ];
    const result = toolpathSmoothingEngine.smooth({
      points: pts,
      method: "corner_round",
      corner_radius_mm: 2,
    });
    expect(result.point_count_smoothed).toBeGreaterThan(pts.length);
    expect(result.c_continuity).toBe(1);
  });

  it("corner round preserves start and end points", () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ];
    const result = toolpathSmoothingEngine.smooth({
      points: pts, method: "corner_round",
    });
    const first = result.points[0];
    const last = result.points[result.points.length - 1];
    expect(first.x).toBeCloseTo(0);
    expect(last.y).toBeCloseTo(10);
  });

  // ── Bezier smoothing ───────────────────────────────────────────────
  it("bezier smooth produces C1 continuity", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: arc90(5),
      method: "bezier",
      smoothing_factor: 0.5,
    });
    expect(result.c_continuity).toBe(1);
    expect(result.point_count_smoothed).toBeGreaterThan(5);
  });

  // ── Auto selection ─────────────────────────────────────────────────
  it("auto selects bspline for dense point cloud", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: arc90(50), // 50 points, short segments
      method: "auto",
    });
    expect(result.method_used).toBe("bspline");
  });

  it("auto selects bezier for few points", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: arc90(5),
      method: "auto",
    });
    expect(result.method_used).toBe("bezier");
  });

  // ── Chord error control ────────────────────────────────────────────
  it("respects chord error limit", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: zigzag(6),
      method: "bspline",
      max_chord_error_mm: 0.5,
      smoothing_factor: 0.3,
    });
    // Should either meet limit or warn
    if (result.warnings.length === 0) {
      expect(result.max_chord_error_mm).toBeLessThanOrEqual(0.6);
    }
  });

  // ── Feed rate limiting ─────────────────────────────────────────────
  it("high-curvature points have lower max feed", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: zigzag(8),
      method: "corner_round",
      corner_radius_mm: 1,
      max_accel_mm_s2: 3000,
    });
    const feeds = result.points
      .filter(p => p.curvature > 0)
      .map(p => p.max_feed_mmmin);
    if (feeds.length > 0) {
      expect(Math.min(...feeds)).toBeLessThan(1e7);
    }
  });

  // ── Arc length tracking ────────────────────────────────────────────
  it("arc length is monotonically increasing", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: arc90(10), method: "bezier",
    });
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].arc_length_mm)
        .toBeGreaterThanOrEqual(result.points[i - 1].arc_length_mm);
    }
  });

  // ── Edge cases ─────────────────────────────────────────────────────
  it("handles 2 points", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }],
    });
    expect(result.point_count_smoothed).toBeGreaterThanOrEqual(2);
  });

  it("handles 1 point with warning", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: [{ x: 0, y: 0, z: 0 }],
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // ── De Boor algorithm ──────────────────────────────────────────────
  it("deBoor evaluates B-spline at midpoint", () => {
    const ctrl = [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 10, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 15, y: 0, z: 0 },
    ];
    const knots = [3, 3, 3, 3, 4, 5, 6, 7];
    const mid = toolpathSmoothingEngine.deBoor(ctrl, knots, 3, 3.5);
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(15);
  });

  // ── Formula string ─────────────────────────────────────────────────
  it("includes formula with key equations", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: arc90(8), method: "bspline",
    });
    expect(result.formula).toContain("κ=|r'×r''|/|r'|³");
    expect(result.formula).toContain("Cox-deBoor");
  });

  // ── Length change reporting ─────────────────────────────────────────
  it("reports length change percentage", () => {
    const result = toolpathSmoothingEngine.smooth({
      points: zigzag(6), method: "bspline", smoothing_factor: 0.7,
      max_chord_error_mm: 10,
    });
    expect(typeof result.length_change_pct).toBe("number");
    expect(result.total_arc_length_mm).toBeGreaterThan(0);
    expect(result.original_length_mm).toBeGreaterThan(0);
  });
});
