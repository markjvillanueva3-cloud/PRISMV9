import { describe, it, expect } from "vitest";
import {
  VoronoiMedialAxisPocketEngine,
  voronoiMedialAxisPocketEngine,
  Point2D,
  MedialAxis,
} from "../engines/VoronoiMedialAxisPocketEngine.js";

// ── Test data ──────────────────────────────────────────────────────────────

/** 60x60 square pocket — large enough for medial axis + offset with a 10mm tool */
function squareBoundary(): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 60 },
    { x: 0, y: 60 },
  ];
}

/** 80x30 rectangle (elongated) */
function rectBoundary(): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: 80, y: 0 },
    { x: 80, y: 30 },
    { x: 0, y: 30 },
  ];
}

const TOOL_DIA = 10; // mm

// ── extractMedialAxis ──────────────────────────────────────────────────────

describe("VoronoiMedialAxisPocketEngine", () => {
  describe("extractMedialAxis", () => {
    it("should produce medial axis points inside the boundary", () => {
      const ma = voronoiMedialAxisPocketEngine.extractMedialAxis(squareBoundary());

      expect(ma.points.length).toBeGreaterThan(0);
      // All medial axis points should have positive distance to boundary
      for (const pt of ma.points) {
        expect(pt.dist_to_boundary).toBeGreaterThan(0);
      }
    });

    it("should produce at least one branch for a rectangular boundary", () => {
      const ma = voronoiMedialAxisPocketEngine.extractMedialAxis(rectBoundary());

      expect(ma.branches.length).toBeGreaterThanOrEqual(1);
      for (const branch of ma.branches) {
        expect(branch.point_indices.length).toBeGreaterThan(1);
      }
    });

    it("should return empty result for degenerate boundary", () => {
      const ma = voronoiMedialAxisPocketEngine.extractMedialAxis([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);

      expect(ma.points).toHaveLength(0);
      expect(ma.branches).toHaveLength(0);
    });
  });

  // ── generateOffsetPath ─────────────────────────────────────────────────

  describe("generateOffsetPath", () => {
    it("should produce toolpath points from medial axis", () => {
      const ma = voronoiMedialAxisPocketEngine.extractMedialAxis(rectBoundary());
      const path = voronoiMedialAxisPocketEngine.generateOffsetPath(ma, TOOL_DIA, 0.3);

      expect(path.points.length).toBeGreaterThan(0);
      expect(path.total_length_mm).toBeGreaterThan(0);
    });

    it("should have engagement_cv_pct as a finite number", () => {
      const ma = voronoiMedialAxisPocketEngine.extractMedialAxis(rectBoundary());
      const path = voronoiMedialAxisPocketEngine.generateOffsetPath(ma, TOOL_DIA, 0.3);

      expect(Number.isFinite(path.engagement_cv_pct)).toBe(true);
    });

    it("should return empty for empty medial axis", () => {
      const emptyMA: MedialAxis = { points: [], branches: [] };
      const path = voronoiMedialAxisPocketEngine.generateOffsetPath(emptyMA, TOOL_DIA, 0.3);

      expect(path.points).toHaveLength(0);
      expect(path.total_length_mm).toBe(0);
    });
  });

  // ── computeEngagementProfile ───────────────────────────────────────────

  describe("computeEngagementProfile", () => {
    it("should compute engagement statistics for a toolpath", () => {
      // Create a simple toolpath inside the boundary
      const toolpath: Point2D[] = [
        { x: 8, y: 10 },
        { x: 10, y: 10 },
        { x: 12, y: 10 },
      ];
      const profile = voronoiMedialAxisPocketEngine.computeEngagementProfile(
        toolpath,
        squareBoundary(),
        TOOL_DIA,
      );

      expect(profile.points).toBeGreaterThan(0);
      expect(profile.mean_deg).toBeGreaterThan(0);
      expect(Number.isFinite(profile.cv_pct)).toBe(true);
    });

    it("should return zeros for empty toolpath", () => {
      const profile = voronoiMedialAxisPocketEngine.computeEngagementProfile(
        [],
        squareBoundary(),
        TOOL_DIA,
      );

      expect(profile.points).toBe(0);
      expect(profile.mean_deg).toBe(0);
    });
  });

  // ── compareVsSpiral ────────────────────────────────────────────────────

  describe("compareVsSpiral", () => {
    it("should produce valid comparison metrics for both methods", () => {
      const comparison = voronoiMedialAxisPocketEngine.compareVsSpiral(
        squareBoundary(),
        TOOL_DIA,
        0.3,
      );

      expect(comparison.medial_path_length_mm).toBeGreaterThanOrEqual(0);
      expect(comparison.spiral_path_length_mm).toBeGreaterThan(0);
      expect(typeof comparison.recommendation).toBe("string");
      expect(comparison.formula.length).toBeGreaterThan(0);
    });

    it("should include engagement profiles for both methods", () => {
      const comparison = voronoiMedialAxisPocketEngine.compareVsSpiral(
        rectBoundary(),
        TOOL_DIA,
        0.3,
      );

      expect(comparison.medial_axis).toBeDefined();
      expect(comparison.spiral).toBeDefined();
      expect(Number.isFinite(comparison.engagement_improvement_pct)).toBe(true);
    });
  });

  // ── generatePocketToolpath ─────────────────────────────────────────────

  describe("generatePocketToolpath", () => {
    it("should generate layers based on depth and step-down", () => {
      const result = voronoiMedialAxisPocketEngine.generatePocketToolpath({
        boundary: squareBoundary(),
        tool_diameter_mm: TOOL_DIA,
        depth_mm: 6,
        step_down_mm: 2,
      });

      expect(result.layers).toHaveLength(3);
      expect(result.layers[0].z_mm).toBe(-2);
      expect(result.layers[2].z_mm).toBe(-6);
      expect(result.total_length_mm).toBeGreaterThan(0);
      expect(result.estimated_time_s).toBeGreaterThan(0);
    });

    it("should return empty for degenerate boundary", () => {
      const result = voronoiMedialAxisPocketEngine.generatePocketToolpath({
        boundary: [{ x: 0, y: 0 }],
        tool_diameter_mm: TOOL_DIA,
        depth_mm: 5,
      });

      expect(result.layers).toHaveLength(0);
    });
  });

  // ── Dispatcher calculate ───────────────────────────────────────────────

  describe("calculate dispatcher", () => {
    it("should dispatch compute_medial_axis action", () => {
      const result = voronoiMedialAxisPocketEngine.calculate("compute_medial_axis", {
        boundary: rectBoundary(),
      });

      expect((result as any).point_count).toBeGreaterThan(0);
      expect((result as any).branch_count).toBeGreaterThanOrEqual(1);
      expect((result as any).max_inscribed_radius).toBeGreaterThan(0);
    });

    it("should return error info for unknown action", () => {
      const result = voronoiMedialAxisPocketEngine.calculate("unknown_action", {});

      expect(result.error).toBeDefined();
      expect(result.available_actions).toBeDefined();
    });
  });
});
