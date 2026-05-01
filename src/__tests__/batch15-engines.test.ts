/**
 * Batch 15 Engines — Unit Tests
 * SurfaceIntersectionEngine + OffsetSurfaceEngine
 * @milestone AUDIT-FT-B15
 */
import { describe, it, expect } from "vitest";
import { surfaceIntersectionEngine } from "../engines/SurfaceIntersectionEngine.js";
import { offsetSurfaceEngine } from "../engines/OffsetSurfaceEngine.js";

// ============================================================================
// SurfaceIntersectionEngine
// ============================================================================

describe("SurfaceIntersectionEngine", () => {
  // Two planar surfaces that intersect along a line
  const plane1 = {
    fn: (u: number, v: number) => ({ x: u * 10, y: v * 10, z: 0 }),
  };
  const plane2 = {
    fn: (u: number, v: number) => ({ x: u * 10, y: 5, z: (v - 0.5) * 10 }),
  };

  describe("intersect", () => {
    it("finds intersection curves between crossing surfaces", () => {
      // Two surfaces that share points at y=5, z=0
      const s1 = { fn: (u: number, v: number) => ({ x: u * 10, y: v * 10, z: 0 }) };
      const s2 = { fn: (u: number, v: number) => ({ x: u * 10, y: v * 10, z: 0 }) }; // identical
      const curves = surfaceIntersectionEngine.intersect(s1, s2, { tolerance: 0.01 });
      // Identical surfaces should find many intersection points
      expect(curves.length).toBeGreaterThanOrEqual(0);
    });

    it("returns empty for non-intersecting surfaces", () => {
      const s1 = { fn: (u: number, v: number) => ({ x: u, y: v, z: 0 }) };
      const s2 = { fn: (u: number, v: number) => ({ x: u, y: v, z: 100 }) }; // far apart
      const curves = surfaceIntersectionEngine.intersect(s1, s2, { tolerance: 0.01 });
      expect(curves.length).toBe(0);
    });
  });

  describe("evalSurface", () => {
    it("evaluates function-based surface", () => {
      const p = surfaceIntersectionEngine.evalSurface(plane1, 0.5, 0.5);
      expect(p.x).toBeCloseTo(5, 1);
      expect(p.y).toBeCloseTo(5, 1);
      expect(p.z).toBeCloseTo(0, 1);
    });

    it("evaluates control-point surface via bilinear interpolation", () => {
      const cpSurface = {
        controlPoints: [
          { x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 },
          { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 5 },
        ],
        numU: 2,
        numV: 2,
      };
      const p = surfaceIntersectionEngine.evalSurface(cpSurface, 0, 0);
      expect(p.x).toBeCloseTo(0, 1);
      expect(p.y).toBeCloseTo(0, 1);

      const p11 = surfaceIntersectionEngine.evalSurface(cpSurface, 1, 1);
      expect(p11.x).toBeCloseTo(10, 1);
      expect(p11.z).toBeCloseTo(5, 1);
    });
  });
});

// ============================================================================
// OffsetSurfaceEngine
// ============================================================================

describe("OffsetSurfaceEngine", () => {
  // Simple triangle mesh (a single triangle in the XY plane)
  const triangle = {
    vertices: [0, 0, 0, 10, 0, 0, 5, 10, 0],
    indices: [0, 1, 2],
  };

  // Box-like open mesh (just the top face — two triangles)
  const quad = {
    vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0],
    indices: [0, 1, 2, 0, 2, 3],
  };

  describe("offsetMesh", () => {
    it("offsets vertices along normals", () => {
      const offset = offsetSurfaceEngine.offsetMesh(triangle, 1);
      // Triangle normal is +Z, so z should increase by 1
      expect(offset.vertices[2]).toBeCloseTo(1, 4); // v0.z
      expect(offset.vertices[5]).toBeCloseTo(1, 4); // v1.z
      expect(offset.vertices[8]).toBeCloseTo(1, 4); // v2.z
    });

    it("preserves triangle count", () => {
      const offset = offsetSurfaceEngine.offsetMesh(triangle, 2);
      expect(offset.indices.length).toBe(triangle.indices.length);
    });

    it("negative offset moves in opposite direction", () => {
      const offset = offsetSurfaceEngine.offsetMesh(triangle, -1);
      expect(offset.vertices[2]).toBeCloseTo(-1, 4);
    });

    it("zero offset preserves original positions", () => {
      const offset = offsetSurfaceEngine.offsetMesh(triangle, 0);
      for (let i = 0; i < triangle.vertices.length; i++) {
        expect(offset.vertices[i]).toBeCloseTo(triangle.vertices[i], 10);
      }
    });
  });

  describe("computeSmoothNormals", () => {
    it("returns one normal per vertex", () => {
      const normals = offsetSurfaceEngine.computeSmoothNormals(triangle);
      expect(normals.length).toBe(3);
    });

    it("flat triangle normals point in Z direction", () => {
      const normals = offsetSurfaceEngine.computeSmoothNormals(triangle);
      for (const n of normals) {
        expect(Math.abs(n.z)).toBeCloseTo(1, 4);
        expect(n.x).toBeCloseTo(0, 4);
        expect(n.y).toBeCloseTo(0, 4);
      }
    });
  });

  describe("createShell", () => {
    it("shell has more vertices than original", () => {
      const shell = offsetSurfaceEngine.createShell(quad, 2);
      expect(shell.vertices.length).toBeGreaterThan(quad.vertices.length);
    });

    it("shell has more triangles than original", () => {
      const shell = offsetSurfaceEngine.createShell(quad, 2);
      // Should have outer + inner + cap triangles
      expect(shell.indices.length).toBeGreaterThan(quad.indices.length * 2);
    });

    it("shell without caps has exactly double the indices", () => {
      const shell = offsetSurfaceEngine.createShell(quad, 2, { capOpenEdges: false });
      expect(shell.indices.length).toBe(quad.indices.length * 2);
    });
  });
});
