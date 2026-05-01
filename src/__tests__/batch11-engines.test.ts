/**
 * Batch 11 Engines — Unit Tests
 * GeometryAlgorithmsEngine
 * @milestone AUDIT-FT-B11
 */
import { describe, it, expect } from "vitest";
import { geometryAlgorithmsEngine } from "../engines/GeometryAlgorithmsEngine.js";

describe("GeometryAlgorithmsEngine", () => {
  describe("delaunayTriangulate", () => {
    it("triangulates 4 points into 2 triangles", () => {
      const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      const r = geometryAlgorithmsEngine.delaunayTriangulate(pts);
      expect(r.triangles.length).toBe(2);
      expect(r.edges.length).toBe(5); // 4 outer + 1 diagonal
    });

    it("handles 3 points (single triangle)", () => {
      const pts = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 2.5, y: 5 }];
      const r = geometryAlgorithmsEngine.delaunayTriangulate(pts);
      expect(r.triangles.length).toBe(1);
      expect(r.edges.length).toBe(3);
    });

    it("returns empty for < 3 points", () => {
      const r = geometryAlgorithmsEngine.delaunayTriangulate([{ x: 0, y: 0 }]);
      expect(r.triangles.length).toBe(0);
    });

    it("circumcenter is equidistant from triangle vertices", () => {
      const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }];
      const r = geometryAlgorithmsEngine.delaunayTriangulate(pts);
      const tri = r.triangles[0];
      const cc = tri.circumcenter;
      const d0 = Math.hypot(pts[tri.vertices[0]].x - cc.x, pts[tri.vertices[0]].y - cc.y);
      const d1 = Math.hypot(pts[tri.vertices[1]].x - cc.x, pts[tri.vertices[1]].y - cc.y);
      const d2 = Math.hypot(pts[tri.vertices[2]].x - cc.x, pts[tri.vertices[2]].y - cc.y);
      expect(d0).toBeCloseTo(d1, 4);
      expect(d1).toBeCloseTo(d2, 4);
    });
  });

  describe("grahamScan", () => {
    it("finds convex hull of square", () => {
      const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      const hull = geometryAlgorithmsEngine.grahamScan(pts);
      expect(hull.length).toBe(4);
    });

    it("excludes interior points", () => {
      const pts = [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
        { x: 5, y: 5 }, // interior
      ];
      const hull = geometryAlgorithmsEngine.grahamScan(pts);
      expect(hull.length).toBe(4);
      expect(hull).not.toContain(4);
    });
  });

  describe("jarvisMarch", () => {
    it("finds same hull as Graham scan", () => {
      const pts = [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
        { x: 3, y: 4 }, { x: 7, y: 6 },
      ];
      const graham = new Set(geometryAlgorithmsEngine.grahamScan(pts));
      const jarvis = new Set(geometryAlgorithmsEngine.jarvisMarch(pts));
      expect(graham).toEqual(jarvis);
    });
  });

  describe("pointInConvexHull", () => {
    it("interior point is inside", () => {
      const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      const hull = geometryAlgorithmsEngine.grahamScan(pts);
      expect(geometryAlgorithmsEngine.pointInConvexHull(hull, pts, { x: 5, y: 5 })).toBe(true);
    });

    it("exterior point is outside", () => {
      const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      const hull = geometryAlgorithmsEngine.grahamScan(pts);
      expect(geometryAlgorithmsEngine.pointInConvexHull(hull, pts, { x: 15, y: 5 })).toBe(false);
    });
  });

  describe("polygon operations", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

    it("signed area is positive for CCW polygon", () => {
      expect(geometryAlgorithmsEngine.polygonSignedArea(square)).toBeCloseTo(100, 4);
    });

    it("polygonInfo returns area and centroid", () => {
      const info = geometryAlgorithmsEngine.polygonInfo(square);
      expect(info.area).toBeCloseTo(100, 4);
      expect(info.centroid.x).toBeCloseTo(5, 4);
      expect(info.centroid.y).toBeCloseTo(5, 4);
      expect(info.isClockwise).toBe(false);
    });

    it("point in polygon — inside", () => {
      expect(geometryAlgorithmsEngine.pointInPolygon(square, { x: 5, y: 5 })).toBe(true);
    });

    it("point in polygon — outside", () => {
      expect(geometryAlgorithmsEngine.pointInPolygon(square, { x: -1, y: 5 })).toBe(false);
    });

    it("polygon offset changes vertex positions", () => {
      const offset = geometryAlgorithmsEngine.polygonOffset(square, 1);
      expect(offset.length).toBe(4);
      // Vertices should have moved from originals
      const moved = offset.some((p, i) =>
        Math.abs(p.x - square[i].x) > 0.1 || Math.abs(p.y - square[i].y) > 0.1,
      );
      expect(moved).toBe(true);
    });

    it("opposite offsets produce different areas", () => {
      const pos = geometryAlgorithmsEngine.polygonOffset(square, 2);
      const neg = geometryAlgorithmsEngine.polygonOffset(square, -2);
      const areaPos = Math.abs(geometryAlgorithmsEngine.polygonSignedArea(pos));
      const areaNeg = Math.abs(geometryAlgorithmsEngine.polygonSignedArea(neg));
      expect(areaPos).not.toBeCloseTo(areaNeg, 0);
    });
  });

  describe("ccw", () => {
    it("positive for counter-clockwise turn", () => {
      expect(geometryAlgorithmsEngine.ccw(
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 },
      )).toBeGreaterThan(0);
    });

    it("negative for clockwise turn", () => {
      expect(geometryAlgorithmsEngine.ccw(
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 },
      )).toBeLessThan(0);
    });

    it("zero for collinear points", () => {
      expect(geometryAlgorithmsEngine.ccw(
        { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
      )).toBe(0);
    });
  });
});
