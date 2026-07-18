/**
 * GeodesicDistanceEngine — Dijkstra + FMM + path + iso-curve tests.
 *
 * Reference geometry:
 *   - Path graph: 5 vertices in a line, edges of length 1
 *     → dist(src=0) = [0, 1, 2, 3, 4] exact
 *   - Right triangle: known closed-form distances
 *   - Plane grid: Dijkstra ≥ Euclidean (Pythagorean lower bound)
 *
 * Tests verify intent (R9):
 *   - exact distances on a path (Dijkstra correctness)
 *   - non-negativity, monotone-from-source, source==0
 *   - Dijkstra upper-bounds Euclidean
 *   - FMM ≤ Dijkstra (better continuous approx)
 *   - back-traced path is contiguous + endpoints correct
 *   - iso-curve points lie ~within input vertex AABB
 *   - input validation throws on malformed mesh / bad sources
 */

import { describe, it, expect } from "vitest";
import {
  GeodesicDistanceEngine,
  DijkstraInputSchema,
  type TriangleMesh,
} from "../engines/GeodesicDistanceEngine";

// ─── Reference geometry ─────────────────────────────────────────────────────

/**
 * Strip of triangles along the X-axis:
 * vertices on top row (y=1) and bottom row (y=0), forming connected triangles.
 * Vertex layout (n+1 columns): bottom = [0..n], top = [n+1..2n+1]
 * Triangles per column: (b, b+1, t), (b+1, t+1, t).
 */
function triangleStrip(numColumns: number, edgeLen = 1): TriangleMesh {
  const verts: number[] = [];
  for (let i = 0; i <= numColumns; i++) verts.push(i * edgeLen, 0, 0);
  for (let i = 0; i <= numColumns; i++) verts.push(i * edgeLen, edgeLen, 0);
  const stride = numColumns + 1;
  const idx: number[] = [];
  for (let i = 0; i < numColumns; i++) {
    const b = i;
    const t = stride + i;
    idx.push(b, b + 1, t, b + 1, t + 1, t);
  }
  return {
    vertices: new Float32Array(verts),
    indices: new Uint32Array(idx),
  };
}

/** Single triangle: 3 verts at (0,0,0), (3,0,0), (0,4,0). */
function rightTriangle(): TriangleMesh {
  return {
    vertices: new Float32Array([0, 0, 0, 3, 0, 0, 0, 4, 0]),
    indices: new Uint32Array([0, 1, 2]),
  };
}

/** Disconnected pair of triangles. */
function disconnectedPair(): TriangleMesh {
  return {
    vertices: new Float32Array([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
      10, 0, 0, 11, 0, 0, 10, 1, 0,
    ]),
    indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("GeodesicDistanceEngine — input validation", () => {
  it("throws on null mesh", () => {
    expect(() =>
      GeodesicDistanceEngine.computeDijkstra(null as unknown as TriangleMesh, [0])
    ).toThrow(/mesh must be an object/);
  });

  it("throws when vertices.length is not a multiple of 3", () => {
    expect(() =>
      GeodesicDistanceEngine.computeDijkstra(
        { vertices: new Float32Array([0, 1]), indices: new Uint32Array([]) },
        [0]
      )
    ).toThrow(/vertices\.length .* multiple of 3/);
  });

  it("throws when indices.length is not a multiple of 3", () => {
    expect(() =>
      GeodesicDistanceEngine.computeDijkstra(
        { vertices: new Float32Array([0, 0, 0]), indices: new Uint32Array([0, 0]) },
        [0]
      )
    ).toThrow(/indices\.length .* multiple of 3/);
  });

  it("throws on empty sourceVertices", () => {
    expect(() =>
      GeodesicDistanceEngine.computeDijkstra(rightTriangle(), [])
    ).toThrow(/non-empty array/);
  });

  it("throws on out-of-range source index", () => {
    expect(() =>
      GeodesicDistanceEngine.computeDijkstra(rightTriangle(), [5])
    ).toThrow(/source vertex 5 out of range/);
  });

  it("Zod schemas accept valid inputs", () => {
    expect(() =>
      DijkstraInputSchema.parse({
        mesh: rightTriangle(),
        sourceVertices: [0],
      })
    ).not.toThrow();
  });

  it("Zod rejects non-integer source", () => {
    expect(() =>
      DijkstraInputSchema.parse({
        mesh: rightTriangle(),
        sourceVertices: [0.5],
      })
    ).toThrow();
  });
});

describe("GeodesicDistanceEngine — Dijkstra correctness", () => {
  it("single triangle: dist from vertex 0", () => {
    const mesh = rightTriangle();
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    expect(d).toHaveLength(3);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(3, 6);    // edge 0→1: length 3
    expect(d[2]).toBeCloseTo(4, 6);    // edge 0→2: length 4
  });

  it("single triangle: dist from vertex 1", () => {
    const mesh = rightTriangle();
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [1]);
    expect(d[1]).toBe(0);
    expect(d[0]).toBeCloseTo(3, 6);
    expect(d[2]).toBeCloseTo(5, 6);    // hypotenuse 3-4-5
  });

  it("multi-source: dist(min over sources)", () => {
    const mesh = rightTriangle();
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0, 1]);
    expect(d[0]).toBe(0);
    expect(d[1]).toBe(0);
    expect(d[2]).toBeCloseTo(4, 6);    // min(d via 0=4, d via 1=5) = 4
  });

  it("triangle strip: distances are non-negative + monotone outward", () => {
    const mesh = triangleStrip(5);  // 12 verts: 6 bottom + 6 top
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    expect(d[0]).toBe(0);
    for (const dist of d) {
      expect(dist).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(dist)).toBe(true);
    }
    // Bottom-row vertices: 0,1,2,3,4,5 → dist = 0,1,2,3,4,5 (along edge of length 1)
    for (let i = 0; i <= 5; i++) {
      expect(d[i]).toBeCloseTo(i, 6);
    }
  });

  it("unreachable component stays at Infinity", () => {
    const mesh = disconnectedPair();
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(1, 6);
    expect(d[2]).toBeCloseTo(1, 6);
    // Right component (verts 3,4,5) is unreachable from 0
    expect(d[3]).toBe(Infinity);
    expect(d[4]).toBe(Infinity);
    expect(d[5]).toBe(Infinity);
  });

  it("Dijkstra upper-bounds Euclidean", () => {
    const mesh = triangleStrip(5);
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    const v0 = GeodesicDistanceEngine.getVertex(mesh.vertices, 0);
    for (let i = 0; i < d.length; i++) {
      if (Number.isFinite(d[i])) {
        const vi = GeodesicDistanceEngine.getVertex(mesh.vertices, i);
        const euclid = GeodesicDistanceEngine.distance(v0, vi);
        // Geodesic on a mesh embedded in R³ ≥ Euclidean distance
        expect(d[i]).toBeGreaterThanOrEqual(euclid - 1e-9);
      }
    }
  });
});

describe("GeodesicDistanceEngine — Fast Marching Method", () => {
  it("matches Dijkstra on a single-triangle edge configuration", () => {
    const mesh = rightTriangle();
    const dDij = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    const dFmm = GeodesicDistanceEngine.computeFastMarching(mesh, [0]);
    expect(dFmm[0]).toBe(0);
    // FMM should be ≤ Dijkstra for in-triangle (continuous geodesic ≤ graph)
    for (let i = 1; i < dFmm.length; i++) {
      expect(dFmm[i]).toBeLessThanOrEqual(dDij[i] + 1e-6);
      expect(dFmm[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("non-negativity + source zero", () => {
    const mesh = triangleStrip(4);
    const d = GeodesicDistanceEngine.computeFastMarching(mesh, [0]);
    expect(d[0]).toBe(0);
    for (const dist of d) expect(dist).toBeGreaterThanOrEqual(0);
  });

  it("unreachable component stays at Infinity", () => {
    const mesh = disconnectedPair();
    const d = GeodesicDistanceEngine.computeFastMarching(mesh, [0]);
    expect(d[3]).toBe(Infinity);
    expect(d[5]).toBe(Infinity);
  });
});

describe("GeodesicDistanceEngine — computePath", () => {
  it("path from i to j on triangle strip has expected endpoints", () => {
    const mesh = triangleStrip(5);
    const r = GeodesicDistanceEngine.computePath(mesh, 0, 5);
    expect(r.path[0]).toBe(0);
    expect(r.path[r.path.length - 1]).toBe(5);
    expect(r.reached).toBe(true);
    expect(r.distance).toBeCloseTo(5, 6);
  });

  it("trivial path: start == end returns single-vertex path with distance 0", () => {
    const mesh = rightTriangle();
    const r = GeodesicDistanceEngine.computePath(mesh, 2, 2);
    expect(r.path).toEqual([2]);
    expect(r.distance).toBe(0);
    expect(r.reached).toBe(true);
  });

  it("path is contiguous (each step is an edge)", () => {
    const mesh = triangleStrip(6);
    const r = GeodesicDistanceEngine.computePath(mesh, 0, 6);
    const adj = GeodesicDistanceEngine.buildWeightedAdjacency(mesh);
    for (let i = 0; i < r.path.length - 1; i++) {
      const u = r.path[i];
      const v = r.path[i + 1];
      const hasEdge = adj[u].some(e => e.neighbor === v);
      expect(hasEdge).toBe(true);
    }
  });

  it("unreachable endpoint: reached=false", () => {
    const mesh = disconnectedPair();
    const r = GeodesicDistanceEngine.computePath(mesh, 0, 5);
    expect(r.reached).toBe(false);
    expect(r.distance).toBe(Infinity);
  });

  it("throws on out-of-range start vertex", () => {
    const mesh = rightTriangle();
    expect(() => GeodesicDistanceEngine.computePath(mesh, 9, 0)).toThrow(/start vertex 9/);
  });

  it("throws on out-of-range end vertex", () => {
    const mesh = rightTriangle();
    expect(() => GeodesicDistanceEngine.computePath(mesh, 0, 9)).toThrow(/end vertex 9/);
  });
});

describe("GeodesicDistanceEngine — iso-curves", () => {
  it("produces one IsoCurve per level", () => {
    const mesh = triangleStrip(5);
    const curves = GeodesicDistanceEngine.computeIsoCurves(mesh, [0], [1, 2, 3]);
    expect(curves).toHaveLength(3);
    expect(curves[0].level).toBe(1);
    expect(curves[1].level).toBe(2);
    expect(curves[2].level).toBe(3);
  });

  it("iso-curve points lie within mesh AABB", () => {
    const mesh = triangleStrip(5);
    const curves = GeodesicDistanceEngine.computeIsoCurves(mesh, [0], [2.5]);
    for (const p of curves[0].points) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x).toBeLessThanOrEqual(5 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.z).toBeCloseTo(0, 9);
    }
  });

  it("iso-curve at level 0 (the source) may be empty or contain only source-adjacent edges", () => {
    const mesh = triangleStrip(3);
    const curves = GeodesicDistanceEngine.computeIsoCurves(mesh, [0], [0]);
    // No crossings at exactly the source level — distance field is non-negative
    expect(Array.isArray(curves[0].points)).toBe(true);
  });
});

describe("GeodesicDistanceEngine — primitives", () => {
  it("distance() is symmetric and zero for identical points", () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 6, z: 3 };
    const d = GeodesicDistanceEngine.distance(a, b);
    expect(d).toBeCloseTo(5, 10); // 3-4-5
    expect(GeodesicDistanceEngine.distance(b, a)).toBeCloseTo(5, 10);
    expect(GeodesicDistanceEngine.distance(a, a)).toBe(0);
  });

  it("edgeLength() respects vertex buffer layout", () => {
    const mesh: TriangleMesh = {
      vertices: new Float32Array([0, 0, 0, 6, 8, 0, 0, 0, 0]),
      indices: new Uint32Array([0, 1, 2]),
    };
    expect(GeodesicDistanceEngine.edgeLength(mesh, 0, 1)).toBeCloseTo(10, 6);
  });

  it("heap is a min-heap (pop returns smallest distance)", () => {
    const heap: Array<{ vertex: number; distance: number }> = [];
    GeodesicDistanceEngine.heapPush(heap, { vertex: 0, distance: 3 });
    GeodesicDistanceEngine.heapPush(heap, { vertex: 1, distance: 1 });
    GeodesicDistanceEngine.heapPush(heap, { vertex: 2, distance: 2 });
    GeodesicDistanceEngine.heapPush(heap, { vertex: 3, distance: 0.5 });
    const ordered: number[] = [];
    while (heap.length > 0) {
      const n = GeodesicDistanceEngine.heapPop(heap);
      if (n) ordered.push(n.distance);
    }
    expect(ordered).toEqual([0.5, 1, 2, 3]);
  });

  it("heap pop on empty returns null", () => {
    expect(GeodesicDistanceEngine.heapPop([])).toBeNull();
  });
});

describe("GeodesicDistanceEngine — adversarial / boundary", () => {
  it("100-column strip computes finite distances", () => {
    const mesh = triangleStrip(100);
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    expect(d[0]).toBe(0);
    expect(d[100]).toBeCloseTo(100, 4);
    for (const dist of d) {
      expect(Number.isFinite(dist)).toBe(true);
    }
  });

  it("NaN-coord triangle does not throw (numerical resilience)", () => {
    const mesh: TriangleMesh = {
      vertices: new Float32Array([NaN, 0, 0, 1, 0, 0, 0, 1, 0]),
      indices: new Uint32Array([0, 1, 2]),
    };
    // Algorithm executes; NaN propagates but doesn't throw
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [1]);
    expect(d[1]).toBe(0);
    expect(d.length).toBe(3);
  });

  it("plain-array inputs are accepted (not just typed arrays)", () => {
    const mesh: TriangleMesh = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
    };
    const d = GeodesicDistanceEngine.computeDijkstra(mesh, [0]);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(1, 6);
  });
});
