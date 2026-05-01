/**
 * Batch 12 Engines — Unit Tests
 * NURBSEngine + CurvatureAnalysisEngine
 * @milestone AUDIT-FT-B12
 */
import { describe, it, expect } from "vitest";
import { nurbsEngine } from "../engines/NURBSEngine.js";
import { curvatureAnalysisEngine } from "../engines/CurvatureAnalysisEngine.js";

// ============================================================================
// NURBSEngine
// ============================================================================

describe("NURBSEngine", () => {
  // Simple quadratic B-spline (degree 2, 4 control points)
  const simpleCurve = {
    degree: 2,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 10, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 15, y: 0, z: 0 },
    ],
    knots: [0, 0, 0, 0.5, 1, 1, 1],
  };

  describe("basisFunction", () => {
    it("partition of unity at interior knot", () => {
      const knots = [0, 0, 0, 0.5, 1, 1, 1];
      const u = 0.3;
      let sum = 0;
      for (let i = 0; i < 4; i++) sum += nurbsEngine.basisFunction(i, 2, u, knots);
      expect(sum).toBeCloseTo(1, 8);
    });

    it("zero-degree basis is indicator function", () => {
      const knots = [0, 0.25, 0.5, 0.75, 1];
      expect(nurbsEngine.basisFunction(1, 0, 0.3, knots)).toBe(1);
      expect(nurbsEngine.basisFunction(1, 0, 0.6, knots)).toBe(0);
    });
  });

  describe("basisFunctions (efficient)", () => {
    it("returns correct span and partition of unity", () => {
      const knots = [0, 0, 0, 0.5, 1, 1, 1];
      const { span, values } = nurbsEngine.basisFunctions(0.3, 2, knots);
      expect(span).toBe(2);
      const sum = values.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 8);
    });
  });

  describe("curve operations", () => {
    it("evaluates endpoints correctly", () => {
      const p0 = nurbsEngine.curveEvaluate(simpleCurve, 0);
      const p1 = nurbsEngine.curveEvaluate(simpleCurve, 1);
      expect(p0.x).toBeCloseTo(0, 1);
      expect(p0.y).toBeCloseTo(0, 1);
      expect(p1.x).toBeCloseTo(15, 1);
      expect(p1.y).toBeCloseTo(0, 1);
    });

    it("midpoint is elevated above baseline", () => {
      const mid = nurbsEngine.curveEvaluate(simpleCurve, 0.5);
      expect(mid.y).toBeGreaterThan(0);
    });

    it("tangent is unit vector", () => {
      const t = nurbsEngine.curveTangent(simpleCurve, 0.5);
      const len = Math.sqrt(t.x * t.x + t.y * t.y + t.z * t.z);
      expect(len).toBeCloseTo(1, 4);
    });

    it("curvature is non-negative", () => {
      const k = nurbsEngine.curveCurvature(simpleCurve, 0.5);
      expect(k).toBeGreaterThanOrEqual(0);
    });

    it("tessellate returns correct number of points", () => {
      const pts = nurbsEngine.curveTessellate(simpleCurve, 10);
      expect(pts.length).toBe(11);
      expect(pts[0].u).toBe(0);
      expect(pts[10].u).toBe(1);
    });
  });

  describe("circle", () => {
    it("creates a rational circle that evaluates on the circle", () => {
      const circle = nurbsEngine.createCircle({ x: 0, y: 0, z: 0 }, 5);
      expect(circle.degree).toBe(2);
      expect(circle.controlPoints.length).toBe(9);
      // Evaluate at u=0 — should be on the circle at (5, 0)
      const p0 = nurbsEngine.curveEvaluate(circle, 0);
      expect(p0.x).toBeCloseTo(5, 1);
      expect(p0.y).toBeCloseTo(0, 1);
      // u=0.25 should be near (0, 5)
      const p25 = nurbsEngine.curveEvaluate(circle, 0.25);
      const r25 = Math.sqrt(p25.x * p25.x + p25.y * p25.y);
      expect(r25).toBeCloseTo(5, 0);
    });
  });

  describe("uniformKnots", () => {
    it("generates clamped knot vector", () => {
      const knots = nurbsEngine.uniformKnots(5, 2);
      // First degree+1 should be 0, last degree+1 should be 1
      expect(knots[0]).toBe(0);
      expect(knots[1]).toBe(0);
      expect(knots[2]).toBe(0);
      expect(knots[knots.length - 1]).toBe(1);
      expect(knots[knots.length - 2]).toBe(1);
      expect(knots[knots.length - 3]).toBe(1);
    });
  });

  describe("surface operations", () => {
    // Bilinear patch (degree 1×1, 2×2 control points)
    const bilinearPatch = {
      degreeU: 1,
      degreeV: 1,
      controlPoints: [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }],
        [{ x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 5 }],
      ],
      knotsU: [0, 0, 1, 1],
      knotsV: [0, 0, 1, 1],
    };

    it("evaluates corners of bilinear patch", () => {
      const p00 = nurbsEngine.surfaceEvaluate(bilinearPatch, 0, 0);
      const p11 = nurbsEngine.surfaceEvaluate(bilinearPatch, 1, 1);
      expect(p00.x).toBeCloseTo(0, 1);
      expect(p00.z).toBeCloseTo(0, 1);
      expect(p11.x).toBeCloseTo(10, 1);
      expect(p11.z).toBeCloseTo(5, 1);
    });

    it("normal points upward for nearly flat patch", () => {
      const n = nurbsEngine.surfaceNormal(bilinearPatch, 0.5, 0.5);
      // z-component should be positive (patch rises in z)
      expect(n.z).toBeGreaterThan(0);
    });

    it("tessellate produces expected vertex count", () => {
      const tess = nurbsEngine.surfaceTessellate(bilinearPatch, 4, 4);
      expect(tess.vertices.length).toBe(25); // (4+1)*(4+1)
      expect(tess.indices.length).toBe(4 * 4 * 6); // 4*4 quads * 2 tris * 3 indices
    });

    it("closest point finds the point itself on surface", () => {
      const target = nurbsEngine.surfaceEvaluate(bilinearPatch, 0.3, 0.7);
      const result = nurbsEngine.surfaceClosestPoint(bilinearPatch, target);
      expect(result.point.x).toBeCloseTo(target.x, 1);
      expect(result.point.y).toBeCloseTo(target.y, 1);
      expect(result.point.z).toBeCloseTo(target.z, 1);
    });
  });
});

// ============================================================================
// CurvatureAnalysisEngine
// ============================================================================

describe("CurvatureAnalysisEngine", () => {
  // Unit tetrahedron mesh (4 vertices, 4 triangles)
  const tetrahedron = {
    vertices: [
      1, 1, 1,    // v0
      -1, -1, 1,  // v1
      -1, 1, -1,  // v2
      1, -1, -1,  // v3
    ],
    indices: [
      0, 1, 2,
      0, 1, 3,
      0, 2, 3,
      1, 2, 3,
    ],
  };

  // Flat quad (2 triangles, all vertices coplanar in z=0)
  const flatQuad = {
    vertices: [
      0, 0, 0,
      10, 0, 0,
      10, 10, 0,
      0, 10, 0,
      5, 5, 0, // center vertex
    ],
    indices: [
      4, 0, 1,
      4, 1, 2,
      4, 2, 3,
      4, 3, 0,
    ],
  };

  describe("computeGaussian", () => {
    it("returns one value per vertex", () => {
      const g = curvatureAnalysisEngine.computeGaussian(tetrahedron);
      expect(g.length).toBe(4);
    });

    it("flat surface has near-zero Gaussian curvature at interior vertex", () => {
      const g = curvatureAnalysisEngine.computeGaussian(flatQuad);
      // Vertex 4 is interior — angle defect = 2π - 2π = 0
      expect(Math.abs(g[4])).toBeLessThan(0.01);
    });

    it("tetrahedron vertices have positive Gaussian curvature", () => {
      const g = curvatureAnalysisEngine.computeGaussian(tetrahedron);
      for (const val of g) expect(val).toBeGreaterThan(0);
    });
  });

  describe("computeMean", () => {
    it("returns one value per vertex", () => {
      const m = curvatureAnalysisEngine.computeMean(tetrahedron);
      expect(m.length).toBe(4);
    });

    it("flat interior vertex has near-zero mean curvature", () => {
      const m = curvatureAnalysisEngine.computeMean(flatQuad);
      expect(Math.abs(m[4])).toBeLessThan(0.01);
    });
  });

  describe("computeAll", () => {
    it("returns all curvature fields", () => {
      const r = curvatureAnalysisEngine.computeAll(tetrahedron);
      expect(r.gaussian.length).toBe(4);
      expect(r.mean.length).toBe(4);
      expect(r.principalMax.length).toBe(4);
      expect(r.principalMin.length).toBe(4);
      expect(r.shapeIndex.length).toBe(4);
      expect(r.curvedness.length).toBe(4);
    });

    it("principal max >= principal min", () => {
      const r = curvatureAnalysisEngine.computeAll(tetrahedron);
      for (let i = 0; i < 4; i++) {
        expect(r.principalMax[i]).toBeGreaterThanOrEqual(r.principalMin[i]);
      }
    });
  });

  describe("classifySurface", () => {
    it("classifies flat vertices as planar", () => {
      const r = curvatureAnalysisEngine.computeAll(flatQuad);
      const cls = curvatureAnalysisEngine.classifySurface(r);
      expect(cls[4].type).toBe("planar");
    });

    it("classifies convex vertex as elliptic_convex", () => {
      const r = curvatureAnalysisEngine.computeAll(tetrahedron);
      const cls = curvatureAnalysisEngine.classifySurface(r);
      // Tetrahedron vertices have positive K and positive H
      for (const c of cls) {
        expect(["elliptic_convex", "unknown"]).toContain(c.type);
      }
    });

    it("returns correct fields per vertex", () => {
      const r = curvatureAnalysisEngine.computeAll(tetrahedron);
      const cls = curvatureAnalysisEngine.classifySurface(r);
      expect(cls[0]).toHaveProperty("type");
      expect(cls[0]).toHaveProperty("gaussian");
      expect(cls[0]).toHaveProperty("mean");
      expect(cls[0]).toHaveProperty("shapeIndex");
    });
  });
});
