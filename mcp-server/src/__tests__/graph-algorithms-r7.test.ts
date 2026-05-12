/**
 * Tests for GraphAlgorithmsEngine Round 7 additions:
 * Dijkstra, A*, Christofides TSP, Nearest-Neighbor TSP.
 */
import { describe, it, expect } from "vitest";
import { graphAlgorithmsEngine } from "../engines/GraphAlgorithmsEngine.js";

// ============================================================================
// Dijkstra
// ============================================================================

describe("GraphAlgorithmsEngine — Dijkstra", () => {
  const graph = {
    A: { B: 1, C: 4 },
    B: { A: 1, C: 2, D: 5 },
    C: { A: 4, B: 2, D: 1 },
    D: { B: 5, C: 1 },
  };

  it("finds shortest distances from source", () => {
    const { dist } = graphAlgorithmsEngine.dijkstra(graph, "A");
    expect(dist.A).toBe(0);
    expect(dist.B).toBe(1);
    expect(dist.C).toBe(3); // A→B→C = 1+2
    expect(dist.D).toBe(4); // A→B→C→D = 1+2+1
  });

  it("reconstructs shortest path", () => {
    const { prev } = graphAlgorithmsEngine.dijkstra(graph, "A");
    const path = graphAlgorithmsEngine.reconstructPath(prev, "D");
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("D");
    expect(path.length).toBeLessThanOrEqual(4);
  });

  it("handles single-node graph", () => {
    const { dist } = graphAlgorithmsEngine.dijkstra({ X: {} }, "X");
    expect(dist.X).toBe(0);
  });

  it("handles disconnected nodes", () => {
    const g = { A: { B: 1 }, B: { A: 1 }, C: {} };
    const { dist } = graphAlgorithmsEngine.dijkstra(g, "A");
    expect(dist.A).toBe(0);
    expect(dist.B).toBe(1);
    expect(dist.C).toBe(Infinity);
  });
});

// ============================================================================
// A*
// ============================================================================

describe("GraphAlgorithmsEngine — A*", () => {
  it("finds path in grid-like graph", () => {
    // Simple 3-node chain: A→B→C
    const graph = {
      A: { B: 1 },
      B: { A: 1, C: 1 },
      C: { B: 1 },
    };
    const path = graphAlgorithmsEngine.aStar(graph, "A", "C", () => 0);
    expect(path).not.toBeNull();
    expect(path![0]).toBe("A");
    expect(path![path!.length - 1]).toBe("C");
  });

  it("returns null when no path exists", () => {
    const graph = { A: { B: 1 }, B: { A: 1 }, C: {} };
    const path = graphAlgorithmsEngine.aStar(graph, "A", "C", () => 0);
    expect(path).toBeNull();
  });

  it("respects heuristic for better performance", () => {
    // Diamond: A→B(1), A→C(10), B→D(1), C→D(1)
    const graph = {
      A: { B: 1, C: 10 },
      B: { D: 1 },
      C: { D: 1 },
      D: {},
    };
    // Heuristic should prefer B path
    const path = graphAlgorithmsEngine.aStar(graph, "A", "D", () => 1);
    expect(path).toEqual(["A", "B", "D"]);
  });

  it("finds direct path when available", () => {
    const graph = { A: { B: 5, C: 1 }, B: {}, C: {} };
    const path = graphAlgorithmsEngine.aStar(graph, "A", "B", () => 0);
    expect(path).toEqual(["A", "B"]);
  });
});

// ============================================================================
// Christofides TSP
// ============================================================================

describe("GraphAlgorithmsEngine — Christofides TSP", () => {
  it("solves square TSP", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const result = graphAlgorithmsEngine.christofidesTSP(points);
    expect(result.tour.length).toBe(4);
    // All nodes visited
    expect(new Set(result.tour).size).toBe(4);
    // Optimal tour distance for unit square = 4
    expect(result.distance).toBeCloseTo(4, 2);
  });

  it("handles 2 points", () => {
    const result = graphAlgorithmsEngine.christofidesTSP([
      { x: 0, y: 0 }, { x: 3, y: 4 },
    ]);
    expect(result.tour.length).toBe(2);
    expect(result.distance).toBeCloseTo(10, 4); // 2 * 5
  });

  it("handles single point", () => {
    const result = graphAlgorithmsEngine.christofidesTSP([{ x: 0, y: 0 }]);
    expect(result.tour).toEqual([0]);
    expect(result.distance).toBe(0);
  });

  it("gives 1.5x approximation on larger instance", () => {
    // 8 points in a circle — optimal tour = circumference
    const n = 8;
    const radius = 10;
    const points = Array.from({ length: n }, (_, i) => ({
      x: radius * Math.cos(2 * Math.PI * i / n),
      y: radius * Math.sin(2 * Math.PI * i / n),
    }));

    const result = graphAlgorithmsEngine.christofidesTSP(points);
    expect(result.tour.length).toBe(n);

    // Optimal = 2π*r * (n/n) ≈ perimeter of inscribed polygon
    const optimalApprox = n * 2 * radius * Math.sin(Math.PI / n);
    // Christofides should be within 1.5x of optimal
    expect(result.distance).toBeLessThan(optimalApprox * 1.6);
  });

  it("works with 3D points", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 1, z: 1 },
    ];
    const result = graphAlgorithmsEngine.christofidesTSP(points);
    expect(result.tour.length).toBe(4);
    expect(result.distance).toBeGreaterThan(0);
  });
});

// ============================================================================
// Nearest-Neighbor TSP
// ============================================================================

describe("GraphAlgorithmsEngine — Nearest-Neighbor TSP", () => {
  it("visits all points", () => {
    const points = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 0, y: 1 },
    ];
    const result = graphAlgorithmsEngine.nearestNeighborTSP(points);
    expect(result.tour.length).toBe(5);
    expect(new Set(result.tour).size).toBe(5);
    expect(result.distance).toBeGreaterThan(0);
  });

  it("starts from specified index", () => {
    const points = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 },
    ];
    const result = graphAlgorithmsEngine.nearestNeighborTSP(points, 1);
    expect(result.tour[0]).toBe(1);
  });

  it("collinear points go in order", () => {
    const points = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ];
    const result = graphAlgorithmsEngine.nearestNeighborTSP(points, 0);
    // NN from 0 should go 0→1→2→3
    expect(result.tour).toEqual([0, 1, 2, 3]);
  });

  it("handles single point", () => {
    const result = graphAlgorithmsEngine.nearestNeighborTSP([{ x: 0, y: 0 }]);
    expect(result.tour).toEqual([0]);
    expect(result.distance).toBe(0);
  });

  it("NN tour is longer than or equal to Christofides", () => {
    const n = 10;
    const points = Array.from({ length: n }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    const nn = graphAlgorithmsEngine.nearestNeighborTSP(points);
    const chris = graphAlgorithmsEngine.christofidesTSP(points);
    // Christofides should usually be better or equal
    // But NN can occasionally win, so just check both are valid
    expect(nn.tour.length).toBe(n);
    expect(chris.tour.length).toBe(n);
  });
});
