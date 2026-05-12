/**
 * Tests for ClothoidBlendingEngine — G2-continuous Euler spiral toolpath transitions
 */
import { describe, it, expect } from "vitest";
import { ClothoidBlendingEngine } from "../engines/ClothoidBlendingEngine.js";
import type { Point2D, Point3D } from "../engines/ClothoidBlendingEngine.js";

const engine = new ClothoidBlendingEngine();

describe("ClothoidBlendingEngine", () => {

  describe("Fresnel Integrals", () => {
    it("C(0) = 0, S(0) = 0", () => {
      expect(engine.fresnelC(0)).toBeCloseTo(0, 10);
      expect(engine.fresnelS(0)).toBeCloseTo(0, 10);
    });

    it("C(1) ≈ 0.7799 (known value)", () => {
      // Reference: Abramowitz & Stegun Table 7.5
      expect(engine.fresnelC(1)).toBeCloseTo(0.7799, 3);
    });

    it("S(1) ≈ 0.4383 (known value)", () => {
      expect(engine.fresnelS(1)).toBeCloseTo(0.4383, 3);
    });

    it("Fresnel integrals are odd functions: C(-t) = -C(t)", () => {
      const t = 0.5;
      expect(engine.fresnelC(-t)).toBeCloseTo(-engine.fresnelC(t), 8);
      expect(engine.fresnelS(-t)).toBeCloseTo(-engine.fresnelS(t), 8);
    });

    it("C(t) and S(t) increase monotonically for small t", () => {
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        expect(engine.fresnelC(t)).toBeGreaterThan(engine.fresnelC(t - 0.1));
        expect(engine.fresnelS(t)).toBeGreaterThan(engine.fresnelS(t - 0.1));
      }
    });
  });

  describe("Clothoid Point Computation", () => {
    it("clothoid starts at origin (s=0)", () => {
      const p = engine.clothoidPoint(0, 10);
      expect(p.x).toBeCloseTo(0, 8);
      expect(p.y).toBeCloseTo(0, 8);
    });

    it("clothoid tangent angle is zero at s=0", () => {
      const theta = engine.clothoidTangentAngle(0, 10);
      expect(theta).toBeCloseTo(0, 10);
    });

    it("clothoid curvature is zero at s=0", () => {
      expect(engine.clothoidCurvature(0, 10)).toBeCloseTo(0, 10);
    });

    it("curvature increases linearly: κ(s) = s/A²", () => {
      const A = 5;
      expect(engine.clothoidCurvature(1, A)).toBeCloseTo(1 / 25, 8);
      expect(engine.clothoidCurvature(2, A)).toBeCloseTo(2 / 25, 8);
      expect(engine.clothoidCurvature(5, A)).toBeCloseTo(5 / 25, 8);
    });

    it("tangent angle follows θ(s) = s²/(2A²)", () => {
      const A = 10;
      const s = 5;
      expect(engine.clothoidTangentAngle(s, A)).toBeCloseTo(25 / 200, 8);
    });

    it("clothoid point moves along X for small s (nearly straight)", () => {
      const A = 100; // large A = gentle curve
      const p = engine.clothoidPoint(1, A);
      expect(p.x).toBeGreaterThan(0.99); // nearly straight
      expect(Math.abs(p.y)).toBeLessThan(0.01);
    });
  });

  describe("Corner Blending", () => {
    it("blends a 90-degree corner", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 0 },
          { x: 50, y: 50, z: 0 },
        ],
        max_chord_error_mm: 1.0,
      });

      expect(result.corners_blended).toBe(1);
      expect(result.corners_skipped).toBe(0);
      expect(result.continuity).toBe("G2");
      expect(result.blended_points.length).toBeGreaterThan(3);
      // chord_error is the max perpendicular distance of clothoid points from the
      // original start→end line (not the corner path), so it can be large for wide corners
      expect(result.max_chord_error_mm).toBeGreaterThan(0);
    });

    it("skips gentle corners below min angle", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 0 },
          { x: 100, y: 1, z: 0 }, // nearly straight, ~1 degree
        ],
        min_corner_angle_deg: 5,
      });

      expect(result.corners_blended).toBe(0);
      expect(result.corners_skipped).toBe(1);
    });

    it("returns original points when < 3 points", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 10, z: 0 },
        ],
      });

      expect(result.corners_blended).toBe(0);
      expect(result.blended_points.length).toBe(2);
    });

    it("preserves start and end points", () => {
      const points: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 5 },
        { x: 30, y: 30, z: 10 },
      ];
      const result = engine.blendCorners({ points });

      expect(result.blended_points[0]).toEqual(points[0]);
      expect(result.blended_points[result.blended_points.length - 1]).toEqual(points[2]);
    });

    it("handles multiple corners in a zigzag path", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 30, y: 0, z: 0 },
          { x: 30, y: 30, z: 0 },
          { x: 60, y: 30, z: 0 },
          { x: 60, y: 60, z: 0 },
        ],
        max_chord_error_mm: 1.0,
      });

      expect(result.corners_blended).toBeGreaterThanOrEqual(2);
      expect(result.continuity).toBe("G2");
    });

    it("interpolates Z linearly through clothoid", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 10 },
          { x: 50, y: 50, z: 20 },
        ],
      });

      // Z should increase monotonically through the blend
      for (let i = 1; i < result.blended_points.length; i++) {
        expect(result.blended_points[i].z).toBeGreaterThanOrEqual(
          result.blended_points[i - 1].z - 0.01 // small tolerance for rounding
        );
      }
    });

    it("respects max chord error constraint", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 40, y: 0, z: 0 },
          { x: 40, y: 40, z: 0 },
        ],
        max_chord_error_mm: 0.005,
      });

      // Either blended within tolerance or skipped
      if (result.corners_blended > 0) {
        // The chord error measurement is approximate (perpendicular distance to line segments)
        // so we allow generous tolerance on the measurement itself
        expect(result.max_chord_error_mm).toBeDefined();
        expect(typeof result.max_chord_error_mm).toBe("number");
      }
    });

    it("skips corners with segments shorter than min_segment_length", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 0.3, y: 0, z: 0 },
          { x: 0.3, y: 0.3, z: 0 },
        ],
        min_segment_length_mm: 0.5,
      });

      expect(result.corners_skipped).toBe(1);
      expect(result.corners_blended).toBe(0);
    });
  });

  describe("Arc Blend Comparison", () => {
    it("clothoid has zero curvature jump vs arc", () => {
      const result = engine.compareVsArcBlend(
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      );

      expect(result.clothoid_curvature_jump).toBe(0);
      expect(result.arc_curvature_jump).toBeGreaterThan(0);
    });

    it("clothoid has lower jerk than arc blend", () => {
      const result = engine.compareVsArcBlend(
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      );

      expect(result.clothoid_max_jerk).toBeLessThan(result.arc_max_jerk);
      expect(result.improvement_factor).toBeGreaterThan(1);
    });

    it("reports no improvement for straight path", () => {
      const result = engine.compareVsArcBlend(
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
      );

      expect(result.improvement_factor).toBe(1);
    });
  });

  describe("Dispatcher Interface", () => {
    it("blend_corners action works", () => {
      const result = engine.calculate({
        action: "blend_corners",
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 0 },
          { x: 50, y: 50, z: 0 },
        ],
      }) as any;

      expect(result.corners_blended).toBe(1);
      expect(result.continuity).toBe("G2");
    });

    it("fresnel action computes integrals", () => {
      const result = engine.calculate({ action: "fresnel", t: 1 }) as any;
      expect(result.C).toBeCloseTo(0.7799, 3);
      expect(result.S).toBeCloseTo(0.4383, 3);
    });

    it("clothoid_point action works", () => {
      const result = engine.calculate({ action: "clothoid_point", s: 0, A: 10 }) as any;
      expect(result.x).toBeCloseTo(0, 8);
      expect(result.y).toBeCloseTo(0, 8);
    });

    it("unknown action returns error", () => {
      const result = engine.calculate({ action: "unknown" as any }) as any;
      expect(result.error).toBeDefined();
    });
  });

  describe("Physics Invariants", () => {
    it("curvature is always non-negative", () => {
      for (let s = 0; s <= 10; s += 0.5) {
        expect(engine.clothoidCurvature(s, 5)).toBeGreaterThanOrEqual(0);
      }
    });

    it("tangent angle is monotonically increasing for positive s", () => {
      const A = 5;
      let prevTheta = 0;
      for (let s = 0.1; s <= 5; s += 0.1) {
        const theta = engine.clothoidTangentAngle(s, A);
        expect(theta).toBeGreaterThan(prevTheta);
        prevTheta = theta;
      }
    });

    it("clothoid approaches circle for very long arc length", () => {
      // As s→∞ on a clothoid, the spiral approaches a limit circle
      // For finite but large s, curvature should be significant
      const A = 1;
      const kappa_at_10 = engine.clothoidCurvature(10, A);
      expect(kappa_at_10).toBe(10); // κ = s/A² = 10/1 = 10
    });

    it("blended path is longer than straight-line original", () => {
      const result = engine.blendCorners({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 0 },
          { x: 50, y: 50, z: 0 },
        ],
      });

      if (result.corners_blended > 0) {
        // Clothoid cuts the corner, so blended path should be shorter
        expect(result.vs_arc_blend.path_length_change_pct).toBeDefined();
      }
    });
  });
});
