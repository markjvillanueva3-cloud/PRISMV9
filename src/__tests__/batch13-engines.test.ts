/**
 * Batch 13 Engines — Unit Tests
 * SilhouetteEngine + IsosurfaceEngine
 * @milestone AUDIT-FT-B13
 */
import { describe, it, expect } from "vitest";
import { silhouetteEngine } from "../engines/SilhouetteEngine.js";
import { isosurfaceEngine } from "../engines/IsosurfaceEngine.js";

// ============================================================================
// SilhouetteEngine
// ============================================================================

describe("SilhouetteEngine", () => {
  // Simple box mesh (8 vertices, 12 triangles)
  const vertices = [
    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
    { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
    { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 },
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], // front (z=0)
    [4, 6, 5], [4, 7, 6], // back (z=1)
    [0, 4, 5], [0, 5, 1], // bottom (y=0)
    [2, 6, 7], [2, 7, 3], // top (y=1)
    [0, 3, 7], [0, 7, 4], // left (x=0)
    [1, 5, 6], [1, 6, 2], // right (x=1)
  ];

  describe("extractSilhouette", () => {
    it("finds silhouette edges from z-axis view", () => {
      const edges = silhouetteEngine.extractSilhouette(vertices, faces, { x: 0, y: 0, z: 1 });
      expect(edges.length).toBeGreaterThan(0);
    });

    it("returns edge pairs as [number, number]", () => {
      const edges = silhouetteEngine.extractSilhouette(vertices, faces, { x: 0, y: 0, z: 1 });
      for (const e of edges) {
        expect(e.length).toBe(2);
        expect(typeof e[0]).toBe("number");
        expect(typeof e[1]).toBe("number");
      }
    });
  });

  describe("extractCreaseEdges", () => {
    it("finds 90-degree crease edges on cube", () => {
      const crease = silhouetteEngine.extractCreaseEdges(vertices, faces, 45);
      // Cube has 12 edges, all at 90 degrees — all should be crease edges
      expect(crease.length).toBeGreaterThan(0);
      for (const c of crease) {
        expect(c.angle).toBeGreaterThan(45);
      }
    });

    it("no crease edges at 120-degree threshold on cube", () => {
      const crease = silhouetteEngine.extractCreaseEdges(vertices, faces, 120);
      // Cube edges are 90 degrees, threshold is 120 — no crease edges
      expect(crease.length).toBe(0);
    });
  });

  describe("extractAllEdges", () => {
    it("returns silhouette, crease, and boundary arrays", () => {
      const result = silhouetteEngine.extractAllEdges(vertices, faces, { x: 1, y: 0, z: 0 });
      expect(result).toHaveProperty("silhouette");
      expect(result).toHaveProperty("crease");
      expect(result).toHaveProperty("boundary");
      expect(Array.isArray(result.silhouette)).toBe(true);
      expect(Array.isArray(result.crease)).toBe(true);
    });

    it("closed mesh has no boundary edges", () => {
      const result = silhouetteEngine.extractAllEdges(vertices, faces, { x: 0, y: 0, z: 1 });
      expect(result.boundary.length).toBe(0);
    });
  });

  describe("generateEdgeMesh", () => {
    it("generates quad mesh from edges", () => {
      const edges: [number, number][] = [[0, 1], [1, 2]];
      const mesh = silhouetteEngine.generateEdgeMesh(vertices, edges, 0.1);
      expect(mesh.vertices.length).toBe(8); // 2 edges * 4 verts per quad
      expect(mesh.faces.length).toBe(4); // 2 edges * 2 tris per quad
    });

    it("skips zero-length edges", () => {
      const pts = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
      const mesh = silhouetteEngine.generateEdgeMesh(pts, [[0, 1]], 0.1);
      expect(mesh.vertices.length).toBe(0);
    });
  });
});

// ============================================================================
// IsosurfaceEngine
// ============================================================================

describe("IsosurfaceEngine", () => {
  describe("createImplicitGrid", () => {
    it("creates grid with correct dimensions", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1, // sphere r=1
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        4,
      );
      expect(grid.size.x).toBe(5);
      expect(grid.size.y).toBe(5);
      expect(grid.size.z).toBe(5);
      expect(grid.data.length).toBe(5);
      expect(grid.data[0].length).toBe(5);
      expect(grid.data[0][0].length).toBe(5);
    });

    it("center of sphere grid is negative (inside)", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1,
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        4,
      );
      // Center cell (2,2,2) should be at (0,0,0) → value = -1 (inside)
      expect(grid.data[2][2][2]).toBeCloseTo(-1, 4);
    });

    it("corner of sphere grid is positive (outside)", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1,
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        4,
      );
      // Corner (0,0,0) = (-2,-2,-2) → value = 12-1 = 11
      expect(grid.data[0][0][0]).toBeGreaterThan(0);
    });
  });

  describe("marchingCubes", () => {
    it("extracts isosurface from sphere", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1,
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        10,
      );
      const result = isosurfaceEngine.marchingCubes(grid, 0);
      expect(result.vertices.length).toBeGreaterThan(0);
      expect(result.faces.length).toBeGreaterThan(0);
    });

    it("sphere vertices are approximately at radius 1", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1,
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        10,
      );
      const result = isosurfaceEngine.marchingCubes(grid, 0);
      for (const v of result.vertices) {
        const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        expect(r).toBeCloseTo(1, 0); // within 0.5 of unit sphere
      }
    });

    it("empty field produces no faces", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        () => 1, // everything > 0, no crossing
        { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        3,
      );
      const result = isosurfaceEngine.marchingCubes(grid, 0);
      expect(result.faces.length).toBe(0);
    });

    it("faces reference valid vertex indices", () => {
      const grid = isosurfaceEngine.createImplicitGrid(
        (x, y, z) => x * x + y * y + z * z - 1,
        { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 2, z: 2 } },
        5,
      );
      const result = isosurfaceEngine.marchingCubes(grid, 0);
      for (const [a, b, c] of result.faces) {
        expect(a).toBeLessThan(result.vertices.length);
        expect(b).toBeLessThan(result.vertices.length);
        expect(c).toBeLessThan(result.vertices.length);
      }
    });
  });
});
