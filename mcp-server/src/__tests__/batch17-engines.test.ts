/**
 * Batch 17 Engines -- Unit Tests
 * BSplineEngine + ConstructionGeometryEngine
 * @milestone AUDIT-FT-B17
 */
import { describe, it, expect } from "vitest";
import { bSplineEngine } from "../engines/BSplineEngine.js";
import { constructionGeometryEngine } from "../engines/ConstructionGeometryEngine.js";
import type { Plane } from "../engines/ConstructionGeometryEngine.js";

// ============================================================================
// BSplineEngine
// ============================================================================

describe("BSplineEngine", () => {
  // Cubic B-spline with clamped knot vector
  const cubic = {
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 0 },
      { x: 3, y: 2, z: 0 },
      { x: 4, y: 0, z: 0 },
    ],
    degree: 3,
    knots: [0, 0, 0, 0, 1, 1, 1, 1],
  };

  describe("findKnotSpan", () => {
    it("returns degree for t at start", () => {
      expect(bSplineEngine.findKnotSpan(3, 3, 0, cubic.knots)).toBe(3);
    });

    it("returns n for t at end", () => {
      expect(bSplineEngine.findKnotSpan(3, 3, 1, cubic.knots)).toBe(3);
    });
  });

  describe("basisFunctions", () => {
    it("returns degree+1 values that sum to 1", () => {
      const N = bSplineEngine.basisFunctions(3, 0.5, 3, cubic.knots);
      expect(N.length).toBe(4);
      const sum = N.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 8);
    });
  });

  describe("evaluateCurve", () => {
    it("interpolates first control point at t=0", () => {
      const p = bSplineEngine.evaluateCurve(cubic, 0);
      expect(p.x).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(0, 6);
    });

    it("interpolates last control point at t=1", () => {
      const p = bSplineEngine.evaluateCurve(cubic, 1);
      expect(p.x).toBeCloseTo(4, 6);
      expect(p.y).toBeCloseTo(0, 6);
    });

    it("midpoint is between control points", () => {
      const p = bSplineEngine.evaluateCurve(cubic, 0.5);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(4);
      expect(p.y).toBeGreaterThan(0);
    });
  });

  describe("evaluateNURBSCurve", () => {
    it("with uniform weights equals non-rational", () => {
      const nurbs = { ...cubic, weights: [1, 1, 1, 1] };
      const pN = bSplineEngine.evaluateNURBSCurve(nurbs, 0.5);
      const pB = bSplineEngine.evaluateCurve(cubic, 0.5);
      expect(pN.x).toBeCloseTo(pB.x, 8);
      expect(pN.y).toBeCloseTo(pB.y, 8);
    });

    it("falls back to non-rational when no weights", () => {
      const p = bSplineEngine.evaluateNURBSCurve(cubic, 0.5);
      expect(p.x).toBeGreaterThan(0);
    });
  });

  describe("evaluateSurface", () => {
    const bilinear = {
      controlGrid: [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }],
        [{ x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 5 }],
      ],
      degreeU: 1, degreeV: 1,
      knotsU: [0, 0, 1, 1], knotsV: [0, 0, 1, 1],
    };

    it("evaluates corners correctly", () => {
      const p00 = bSplineEngine.evaluateSurface(bilinear, 0, 0);
      expect(p00.x).toBeCloseTo(0, 4);
      const p11 = bSplineEngine.evaluateSurface(bilinear, 1, 1);
      expect(p11.x).toBeCloseTo(10, 4);
      expect(p11.z).toBeCloseTo(5, 4);
    });

    it("midpoint interpolates", () => {
      const p = bSplineEngine.evaluateSurface(bilinear, 0.5, 0.5);
      expect(p.x).toBeCloseTo(5, 4);
      expect(p.y).toBeCloseTo(5, 4);
    });
  });

  describe("uniformKnots", () => {
    it("generates correct length knot vector", () => {
      const k = bSplineEngine.uniformKnots(4, 3);
      expect(k.length).toBe(8); // n+degree+2 = 3+3+2
      expect(k[0]).toBe(0);
      expect(k[k.length - 1]).toBe(1);
    });
  });
});

// ============================================================================
// ConstructionGeometryEngine
// ============================================================================

describe("ConstructionGeometryEngine", () => {
  const xyPlane: Plane = { type: "plane", origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, construction: true };
  const xzPlane: Plane = { type: "plane", origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, construction: true };
  const yzPlane: Plane = { type: "plane", origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 }, construction: true };

  describe("createOffsetPlane", () => {
    it("offsets origin along normal", () => {
      const p = constructionGeometryEngine.createOffsetPlane(xyPlane, 5);
      expect(p.origin.z).toBeCloseTo(5, 8);
      expect(p.normal.z).toBeCloseTo(1, 8);
    });
  });

  describe("createMidplane", () => {
    it("midplane origin is average", () => {
      const p1: Plane = { ...xyPlane, origin: { x: 0, y: 0, z: 0 } };
      const p2: Plane = { ...xyPlane, origin: { x: 0, y: 0, z: 10 } };
      const mid = constructionGeometryEngine.createMidplane(p1, p2);
      expect(mid.origin.z).toBeCloseTo(5, 8);
    });
  });

  describe("createPlaneThroughThreePoints", () => {
    it("creates XY plane from 3 XY points", () => {
      const p = constructionGeometryEngine.createPlaneThroughThreePoints(
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      );
      expect(Math.abs(p.normal.z)).toBeCloseTo(1, 6);
    });
  });

  describe("createTangentPlane", () => {
    it("tangent point is on cylinder surface", () => {
      const cyl = { center: { x: 0, y: 0, z: 0 }, radius: 5 };
      const p = constructionGeometryEngine.createTangentPlane(cyl, 0);
      expect(p.origin.x).toBeCloseTo(5, 6);
      expect(p.normal.x).toBeCloseTo(1, 6);
    });
  });

  describe("axis construction", () => {
    it("axis through two points", () => {
      const a = constructionGeometryEngine.createAxisThroughTwoPoints(
        { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 },
      );
      expect(a.direction.z).toBeCloseTo(1, 6);
    });

    it("axis through cylinder", () => {
      const a = constructionGeometryEngine.createAxisThroughCylinder({ center: { x: 5, y: 5, z: 0 }, radius: 3 });
      expect(a.point.x).toBe(5);
      expect(a.direction.z).toBe(1);
    });

    it("axis through two planes", () => {
      const a = constructionGeometryEngine.createAxisThroughTwoPlanes(xyPlane, xzPlane);
      expect(a.type).toBe("axis");
      // Cross of Z and Y normals = X direction
      expect(Math.abs(a.direction.x)).toBeCloseTo(1, 4);
    });
  });

  describe("point construction", () => {
    it("point at vertex", () => {
      const p = constructionGeometryEngine.createPointAtVertex({ x: 3, y: 4, z: 5 });
      expect(p.x).toBe(3);
      expect(p.type).toBe("point");
    });

    it("point through three planes (origin)", () => {
      const p = constructionGeometryEngine.createPointThroughThreePlanes(xyPlane, xzPlane, yzPlane);
      expect(p).not.toBeNull();
      expect(p!.x).toBeCloseTo(0, 4);
      expect(p!.y).toBeCloseTo(0, 4);
      expect(p!.z).toBeCloseTo(0, 4);
    });

    it("point at edge-plane intersection", () => {
      const edge = { start: { x: 0, y: 0, z: -5 }, end: { x: 0, y: 0, z: 5 } };
      const p = constructionGeometryEngine.createPointAtEdgeAndPlane(edge, xyPlane);
      expect(p).not.toBeNull();
      expect(p!.z).toBeCloseTo(0, 6);
    });

    it("returns null for parallel edge-plane", () => {
      const edge = { start: { x: 0, y: 0, z: 5 }, end: { x: 10, y: 0, z: 5 } };
      const p = constructionGeometryEngine.createPointAtEdgeAndPlane(edge, xyPlane);
      expect(p).toBeNull();
    });
  });
});
