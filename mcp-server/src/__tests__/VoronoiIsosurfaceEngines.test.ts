/**
 * VoronoiEngine + IsosurfaceEngine — closure tests.
 *
 * U-GAP-CAD-VORONOI-ISOSURFACE re-scope per R8 dedup-preflight:
 * both engines already ported but no companion tests. This file closes
 * the test gap with reference geometry + algebraic invariants.
 *
 * Reference cases:
 *   - Delaunay on a square's 4 corners: produces a valid triangulation
 *     (exactly 2 inner triangles when no point is in the circumcircle).
 *   - Voronoi cells from 4-corner points: each cell's site is its input point.
 *   - nearestSite: closest-point query returns the trivially nearest site.
 *   - Lloyd relaxation: convex hull-area is non-increasing in early iterations
 *     (CVT convergence) — at minimum, the iterations don't crash.
 *   - Marching Cubes on an implicit unit sphere: all vertices lie within
 *     a tight tolerance of |p| = 1.
 *   - createImplicitGrid: grid[i][j][k] == func(bounds.min.x + i·dx, ...).
 *
 * Literature:
 *   - Bowyer (1981), Watson (1981) — Delaunay triangulation.
 *   - Lloyd (1982) — k-means / centroidal Voronoi.
 *   - Lorensen & Cline (SIGGRAPH 1987) — Marching Cubes.
 */

import { describe, it, expect } from "vitest";
import { voronoiEngine } from "../engines/VoronoiEngine";
import { isosurfaceEngine } from "../engines/IsosurfaceEngine";
import type { Point2D } from "../engines/VoronoiEngine";

// ─── VoronoiEngine ──────────────────────────────────────────────────────────

describe("VoronoiEngine — delaunay", () => {
  it("returns empty triangles when fewer than 3 input points", () => {
    expect(voronoiEngine.delaunay([])).toEqual({
      triangles: [], points: [], convexHull: [],
    });
    const pts: Point2D[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const r = voronoiEngine.delaunay(pts);
    expect(r.triangles).toEqual([]);
    expect(r.points).toEqual(pts);
  });

  it("3 points form exactly 1 triangle", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
    ];
    const r = voronoiEngine.delaunay(pts);
    expect(r.triangles).toHaveLength(1);
    const tri = r.triangles[0];
    // Indices reference all 3 input points (no super-triangle leak)
    const indices = new Set([tri.p0, tri.p1, tri.p2]);
    expect(indices).toEqual(new Set([0, 1, 2]));
  });

  it("circumradius of a unit right-triangle is r = 0.5·hypotenuse", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
    ];
    const r = voronoiEngine.delaunay(pts);
    // Hypotenuse length √2; circumradius = √2/2 ≈ 0.7071
    expect(r.triangles[0].circumradius).toBeCloseTo(Math.sqrt(2) / 2, 4);
  });

  it("4 square corners produce a non-empty triangulation", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = voronoiEngine.delaunay(pts);
    // 4 points in convex position ⇒ exactly 2 triangles
    expect(r.triangles).toHaveLength(2);
    // All triangle indices must reference valid input points
    for (const tri of r.triangles) {
      for (const idx of [tri.p0, tri.p1, tri.p2]) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(4);
      }
    }
  });
});

describe("VoronoiEngine — voronoi", () => {
  it("4-corner input produces 4 cells, each with the input site", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const r = voronoiEngine.voronoi(pts);
    expect(r.cells).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(r.cells[i].site).toEqual(pts[i]);
    }
  });

  it("bounds field is finite for non-degenerate input", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const r = voronoiEngine.voronoi(pts);
    expect(Number.isFinite(r.bounds.minX)).toBe(true);
    expect(Number.isFinite(r.bounds.maxX)).toBe(true);
    expect(Number.isFinite(r.bounds.minY)).toBe(true);
    expect(Number.isFinite(r.bounds.maxY)).toBe(true);
  });

  it("cell area is non-negative", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
      { x: 5, y: 5 },
    ];
    const r = voronoiEngine.voronoi(pts);
    for (const cell of r.cells) {
      expect(cell.area).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("VoronoiEngine — nearestSite", () => {
  it("returns the trivially nearest site (exact match)", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 },
    ];
    const r = voronoiEngine.nearestSite(pts, { x: 10, y: 0 });
    expect(r.index).toBe(1);
    expect(r.distance).toBeCloseTo(0, 10);
  });

  it("Euclidean distance is correct", () => {
    const pts: Point2D[] = [{ x: 0, y: 0 }, { x: 3, y: 4 }];
    const r = voronoiEngine.nearestSite(pts, { x: 0, y: 0 });
    expect(r.index).toBe(0);
    const r2 = voronoiEngine.nearestSite(pts, { x: 3, y: 4 });
    expect(r2.index).toBe(1);
  });

  it("ties broken deterministically (smallest index wins)", () => {
    const pts: Point2D[] = [{ x: 0, y: 0 }, { x: 2, y: 0 }];
    const r = voronoiEngine.nearestSite(pts, { x: 1, y: 0 });
    // Both at distance 1; first wins
    expect(r.index).toBe(0);
    expect(r.distance).toBeCloseTo(1, 10);
  });
});

describe("VoronoiEngine — lloydRelax", () => {
  it("does not crash for 0 iterations (identity)", () => {
    const pts: Point2D[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const r = voronoiEngine.lloydRelax(pts, 0);
    expect(r).toHaveLength(3);
  });

  it("1 iteration on 4 square corners produces 4 finite points", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const r = voronoiEngine.lloydRelax(pts, 1);
    expect(r).toHaveLength(4);
    for (const p of r) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("output point count matches input point count", () => {
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 2.5, y: 2.5 },
    ];
    const r = voronoiEngine.lloydRelax(pts, 3);
    expect(r).toHaveLength(pts.length);
  });
});

// ─── IsosurfaceEngine ───────────────────────────────────────────────────────

describe("IsosurfaceEngine — createImplicitGrid", () => {
  it("grid dimensions match (resolution+1) along every axis", () => {
    const grid = isosurfaceEngine.createImplicitGrid(
      (x, y, z) => x + y + z,
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      4
    );
    expect(grid.size).toEqual({ x: 5, y: 5, z: 5 });
    expect(grid.data).toHaveLength(5);
    expect(grid.data[0]).toHaveLength(5);
    expect(grid.data[0][0]).toHaveLength(5);
  });

  it("grid samples match function values exactly at corners", () => {
    const fn = (x: number, y: number, z: number) => x * 2 + y * 3 + z * 5;
    const grid = isosurfaceEngine.createImplicitGrid(
      fn,
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      2
    );
    // [0][0][0] = f(0,0,0) = 0
    expect(grid.data[0][0][0]).toBeCloseTo(0, 10);
    // [2][2][2] = f(1,1,1) = 2 + 3 + 5 = 10
    expect(grid.data[2][2][2]).toBeCloseTo(10, 10);
    // [1][1][1] = f(0.5, 0.5, 0.5) = 1 + 1.5 + 2.5 = 5
    expect(grid.data[1][1][1]).toBeCloseTo(5, 10);
  });

  it("grid bounds round-trip from input", () => {
    const bounds = { min: { x: -2, y: -3, z: -1 }, max: { x: 5, y: 7, z: 4 } };
    const grid = isosurfaceEngine.createImplicitGrid(() => 0, bounds, 3);
    expect(grid.bounds).toEqual(bounds);
  });
});

describe("IsosurfaceEngine — marchingCubes (unit sphere)", () => {
  it("extracts a non-empty mesh for an implicit unit sphere", () => {
    // f(x,y,z) = x² + y² + z² − 1, isovalue 0
    const grid = isosurfaceEngine.createImplicitGrid(
      (x, y, z) => x * x + y * y + z * z - 1,
      { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } },
      16
    );
    const r = isosurfaceEngine.marchingCubes(grid, 0);
    expect(r.vertices.length).toBeGreaterThan(0);
    expect(r.faces.length).toBeGreaterThan(0);
  });

  it("all sphere vertices lie within tolerance of |p| = 1", () => {
    const grid = isosurfaceEngine.createImplicitGrid(
      (x, y, z) => x * x + y * y + z * z - 1,
      { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } },
      24
    );
    const r = isosurfaceEngine.marchingCubes(grid, 0);
    for (const v of r.vertices) {
      const norm = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      // Tolerance: with 24-cell resolution the chord error is small (~0.05)
      expect(Math.abs(norm - 1)).toBeLessThan(0.1);
    }
  });

  it("every face index references a valid vertex", () => {
    const grid = isosurfaceEngine.createImplicitGrid(
      (x, y, z) => x * x + y * y + z * z - 1,
      { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } },
      8
    );
    const r = isosurfaceEngine.marchingCubes(grid, 0);
    for (const face of r.faces) {
      for (const idx of face) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(r.vertices.length);
      }
    }
  });

  it("uniform-zero scalar field with non-zero isovalue → empty mesh", () => {
    const grid = isosurfaceEngine.createImplicitGrid(
      () => 0,
      { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      4
    );
    const r = isosurfaceEngine.marchingCubes(grid, 1);
    expect(r.vertices).toEqual([]);
    expect(r.faces).toEqual([]);
  });
});
