/**
 * Tests for SpatialIndexEngine — KD-Tree and Octree.
 * Round 11 reverse-engineering from PRISM v8.89 monolith.
 */
import { describe, it, expect } from "vitest";
import { kdTree, octree } from "../engines/SpatialIndexEngine.js";

// ============================================================================
// KD-Tree — Build
// ============================================================================

describe("KD-Tree — Build", () => {
  it("builds tree from 3D points", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 },
    ];
    const tree = kdTree.build(points);
    expect(tree).not.toBeNull();
    expect(tree!.point).toBeDefined();
  });

  it("returns null for empty points", () => {
    expect(kdTree.build([])).toBeNull();
  });

  it("single point becomes leaf", () => {
    const tree = kdTree.build([{ x: 5, y: 10, z: 15 }]);
    expect(tree).not.toBeNull();
    expect(tree!.left).toBeNull();
    expect(tree!.right).toBeNull();
    expect(tree!.point.x).toBe(5);
  });
});

// ============================================================================
// KD-Tree — Nearest Neighbor
// ============================================================================

describe("KD-Tree — Nearest Neighbor", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 5, y: 5, z: 0 },
    { x: 3, y: 3, z: 3 },
    { x: 8, y: 2, z: 1 },
  ];
  const tree = kdTree.build(points);

  it("finds exact match", () => {
    const result = kdTree.nearestNeighbor(tree, { x: 10, y: 0, z: 0 });
    expect(result).not.toBeNull();
    expect(result!.distance).toBeCloseTo(0, 10);
    expect(result!.point.x).toBe(10);
  });

  it("finds closest point to query", () => {
    const result = kdTree.nearestNeighbor(tree, { x: 4, y: 4, z: 3 });
    expect(result).not.toBeNull();
    // Should be { 3, 3, 3 } at distance sqrt(1+1+0) = sqrt(2) ≈ 1.41
    expect(result!.point.x).toBe(3);
    expect(result!.point.y).toBe(3);
    expect(result!.distance).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("returns null for null tree", () => {
    expect(kdTree.nearestNeighbor(null, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it("preserves original indices", () => {
    const result = kdTree.nearestNeighbor(tree, { x: 10, y: 0, z: 0 });
    expect(result!.index).toBe(1); // second point in original array
  });
});

// ============================================================================
// KD-Tree — K-Nearest Neighbors
// ============================================================================

describe("KD-Tree — K-Nearest Neighbors", () => {
  const points = Array.from({ length: 20 }, (_, i) => ({
    x: i * 2, y: i % 5, z: i % 3,
  }));
  const tree = kdTree.build(points);

  it("returns exactly k neighbors", () => {
    const results = kdTree.kNearestNeighbors(tree, { x: 10, y: 2, z: 1 }, 3);
    expect(results.length).toBe(3);
  });

  it("results are sorted by distance", () => {
    const results = kdTree.kNearestNeighbors(tree, { x: 10, y: 2, z: 1 }, 5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
    }
  });

  it("k=0 returns empty", () => {
    expect(kdTree.kNearestNeighbors(tree, { x: 0, y: 0, z: 0 }, 0)).toEqual([]);
  });

  it("k > n returns all points", () => {
    const smallTree = kdTree.build([{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }]);
    const results = kdTree.kNearestNeighbors(smallTree, { x: 0, y: 0, z: 0 }, 10);
    expect(results.length).toBe(2);
  });
});

// ============================================================================
// KD-Tree — Radius Search
// ============================================================================

describe("KD-Tree — Radius Search", () => {
  const grid = [];
  for (let x = 0; x < 5; x++)
    for (let y = 0; y < 5; y++)
      for (let z = 0; z < 5; z++)
        grid.push({ x, y, z });
  const tree = kdTree.build(grid);

  it("finds points within radius", () => {
    const results = kdTree.radiusSearch(tree, { x: 2, y: 2, z: 2 }, 1.1);
    // Should find center + 6 face neighbors
    expect(results.length).toBe(7); // center + ±x, ±y, ±z
  });

  it("radius=0 finds only exact matches", () => {
    const results = kdTree.radiusSearch(tree, { x: 2, y: 2, z: 2 }, 0);
    expect(results.length).toBe(1);
  });

  it("large radius finds all points", () => {
    const results = kdTree.radiusSearch(tree, { x: 2, y: 2, z: 2 }, 100);
    expect(results.length).toBe(125);
  });
});

// ============================================================================
// KD-Tree — Range Query
// ============================================================================

describe("KD-Tree — Range Query", () => {
  const points = [
    { x: 1, y: 1, z: 1 },
    { x: 2, y: 2, z: 2 },
    { x: 3, y: 3, z: 3 },
    { x: 10, y: 10, z: 10 },
  ];
  const tree = kdTree.build(points);

  it("finds points in bounding box", () => {
    const results = kdTree.rangeQuery(tree, { x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 });
    expect(results.length).toBe(3);
  });

  it("empty range returns nothing", () => {
    const results = kdTree.rangeQuery(tree, { x: 50, y: 50, z: 50 }, { x: 60, y: 60, z: 60 });
    expect(results.length).toBe(0);
  });
});

// ============================================================================
// Octree — Build
// ============================================================================

describe("Octree — Build", () => {
  it("builds from 3D points", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 10 },
      { x: 5, y: 5, z: 5 },
    ];
    const tree = octree.build(points);
    expect(tree).toBeDefined();
    expect(tree.bounds).toBeDefined();
    expect(tree.isLeaf).toBe(true); // 3 points < maxPoints(8)
    expect(tree.points.length).toBe(3);
  });

  it("subdivides when exceeding maxPoints", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
    }));
    const tree = octree.build(points, 10, 4);
    expect(tree.isLeaf).toBe(false);
    expect(tree.children).not.toBeNull();
  });
});

// ============================================================================
// Octree — Radius Search
// ============================================================================

describe("Octree — Radius Search", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 10, y: 10, z: 10 },
  ];
  const tree = octree.build(points);

  it("finds points within radius", () => {
    const results = octree.radiusSearch(tree, { x: 0, y: 0, z: 0 }, 1.5);
    expect(results.length).toBe(4); // origin + 3 neighbors, not (10,10,10)
  });

  it("returns empty for no matches", () => {
    const results = octree.radiusSearch(tree, { x: 50, y: 50, z: 50 }, 1);
    expect(results.length).toBe(0);
  });

  it("includes distance in results", () => {
    const results = octree.radiusSearch(tree, { x: 0, y: 0, z: 0 }, 2);
    for (const r of results) {
      expect(r.distance).toBeGreaterThanOrEqual(0);
      expect(r.index).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// Octree — Voxelize
// ============================================================================

describe("Octree — Voxelize", () => {
  it("voxelizes a single triangle", () => {
    const vertices = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
    ];
    const faces = [[0, 1, 2]];
    const result = octree.voxelize(vertices, faces, 10);
    expect(result.voxels.length).toBeGreaterThan(0);
    expect(result.resolution).toBe(10);
    expect(result.cellSize).toBeGreaterThan(0);
  });

  it("higher resolution gives more voxels", () => {
    const vertices = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
    ];
    const faces = [[0, 1, 2]];
    const low = octree.voxelize(vertices, faces, 5);
    const high = octree.voxelize(vertices, faces, 20);
    expect(high.voxels.length).toBeGreaterThan(low.voxels.length);
  });

  it("empty faces returns empty voxels", () => {
    const result = octree.voxelize([{ x: 0, y: 0, z: 0 }], [], 10);
    expect(result.voxels.length).toBe(0);
  });
});
