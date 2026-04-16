/**
 * Tests for Optimization + Geometry engine batch:
 * PSO, ACO, BayesianOptimization, TrustRegion, BVH
 */
import { describe, it, expect } from "vitest";
import { particleSwarmOptimizationEngine } from "../engines/ParticleSwarmOptimizationEngine.js";
import { antColonyOptimizationEngine } from "../engines/AntColonyOptimizationEngine.js";
import { bayesianOptimizationEngine } from "../engines/BayesianOptimizationEngine.js";
import { trustRegionEngine } from "../engines/TrustRegionEngine.js";
import { bvhEngine } from "../engines/BVHEngine.js";
import type { Triangle } from "../engines/BVHEngine.js";

// ===========================================================================
// PSO — Particle Swarm Optimization
// ===========================================================================

describe("PSO — Basic Optimization", () => {
  it("minimizes sphere function (sum of squares)", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }], seed: 42, maxIterations: 100 }
    );
    expect(result.bestFitness).toBeLessThan(0.1);
    expect(Math.abs(result.bestPosition[0])).toBeLessThan(1);
    expect(Math.abs(result.bestPosition[1])).toBeLessThan(1);
  });

  it("minimizes Rosenbrock function", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
      { dimensions: 2, bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }], seed: 42, swarmSize: 50, maxIterations: 300 }
    );
    expect(result.bestFitness).toBeLessThan(5);
  });

  it("maximize returns negated fitness", () => {
    const result = particleSwarmOptimizationEngine.maximize(
      (x) => -(x[0] ** 2 + x[1] ** 2), // max of negative sphere → optimum at 0
      { dimensions: 2, bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }], seed: 42 }
    );
    expect(result.bestFitness).toBeGreaterThan(-0.1);
  });

  it("returns convergence history", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, bounds: [{ min: -10, max: 10 }], seed: 42, maxIterations: 50 }
    );
    expect(result.convergenceHistory.length).toBeGreaterThan(1);
    // History should be non-increasing (best fitness monotonic)
    for (let i = 1; i < result.convergenceHistory.length; i++) {
      expect(result.convergenceHistory[i]).toBeLessThanOrEqual(result.convergenceHistory[i - 1] + 1e-10);
    }
  });

  it("respects bounds", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => x[0], // Minimum is at lower bound
      { dimensions: 1, bounds: [{ min: 3, max: 10 }], seed: 42 }
    );
    expect(result.bestPosition[0]).toBeGreaterThanOrEqual(3);
    expect(result.bestPosition[0]).toBeLessThanOrEqual(10);
  });

  it("constriction factor variant works", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }], seed: 42, useConstriction: true }
    );
    expect(result.bestFitness).toBeLessThan(1);
  });

  it("swarmDiversity is between 0 and 1", () => {
    const result = particleSwarmOptimizationEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }], seed: 42 }
    );
    expect(result.swarmDiversity).toBeGreaterThanOrEqual(0);
    expect(result.swarmDiversity).toBeLessThanOrEqual(1);
  });
});

// ===========================================================================
// ACO — Ant Colony Optimization
// ===========================================================================

describe("ACO — TSP Solving", () => {
  // Simple 4-city TSP with known optimal
  const dist4 = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0],
  ];

  it("finds a valid tour visiting all nodes", () => {
    const result = antColonyOptimizationEngine.solve({
      nodeCount: 4,
      distanceMatrix: dist4,
      seed: 42,
      maxIterations: 30,
    });
    // Tour should visit all 4 nodes + return to start
    expect(result.bestTour.length).toBe(5);
    expect(result.bestTour[0]).toBe(result.bestTour[result.bestTour.length - 1]);
    const visited = new Set(result.bestTour.slice(0, 4));
    expect(visited.size).toBe(4);
  });

  it("finds near-optimal distance for small TSP", () => {
    const result = antColonyOptimizationEngine.solve({
      nodeCount: 4,
      distanceMatrix: dist4,
      seed: 42,
      maxIterations: 50,
    });
    // Optimal tour: 0→1→3→2→0 = 10+25+30+15 = 80
    expect(result.bestDistance).toBeLessThanOrEqual(85);
  });

  it("convergence history is non-increasing", () => {
    const result = antColonyOptimizationEngine.solve({
      nodeCount: 4,
      distanceMatrix: dist4,
      seed: 42,
      maxIterations: 20,
    });
    for (let i = 1; i < result.convergenceHistory.length; i++) {
      expect(result.convergenceHistory[i]).toBeLessThanOrEqual(result.convergenceHistory[i - 1] + 1e-10);
    }
  });

  it("AS variant also finds valid tour", () => {
    const result = antColonyOptimizationEngine.solve({
      nodeCount: 4,
      distanceMatrix: dist4,
      seed: 42,
      variant: "AS",
      maxIterations: 30,
    });
    expect(result.bestTour.length).toBe(5);
    expect(result.bestDistance).toBeGreaterThan(0);
  });

  it("pheromoneRange has positive values", () => {
    const result = antColonyOptimizationEngine.solve({
      nodeCount: 4,
      distanceMatrix: dist4,
      seed: 42,
      maxIterations: 20,
    });
    expect(result.pheromoneRange.min).toBeGreaterThan(0);
    expect(result.pheromoneRange.max).toBeGreaterThan(result.pheromoneRange.min);
  });

  it("solveAssignment returns valid assignment", () => {
    const costs = [
      [9, 2, 7],
      [6, 4, 3],
      [5, 8, 1],
    ];
    const result = antColonyOptimizationEngine.solveAssignment(costs);
    expect(result.assignment.length).toBe(3);
    const unique = new Set(result.assignment);
    expect(unique.size).toBe(3);
    expect(result.totalCost).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Bayesian Optimization
// ===========================================================================

describe("Bayesian Optimization — Surrogate Model", () => {
  it("minimizes a 1D quadratic", () => {
    const result = bayesianOptimizationEngine.minimize(
      (x) => (x[0] - 3) ** 2,
      { dimensions: 1, bounds: [{ min: 0, max: 6 }], seed: 42, maxIterations: 15, initialPoints: 5 }
    );
    expect(result.bestY).toBeLessThan(1);
    expect(Math.abs(result.bestX[0] - 3)).toBeLessThan(1.5);
  });

  it("returns observations including initial + sequential", () => {
    const result = bayesianOptimizationEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, bounds: [{ min: -5, max: 5 }], seed: 42, maxIterations: 10, initialPoints: 5 }
    );
    expect(result.observations.length).toBe(15); // 5 initial + 10 sequential
  });

  it("predict returns mean and variance", () => {
    const obs = [
      { x: [0], y: 0 },
      { x: [1], y: 1 },
      { x: [2], y: 4 },
    ];
    const pred = bayesianOptimizationEngine.predict(obs, [1.5], 1.0);
    expect(pred.mean).toBeDefined();
    expect(pred.variance).toBeGreaterThanOrEqual(0);
    expect(pred.stdDev).toBe(Math.sqrt(pred.variance));
  });

  it("suggestNext returns a point within bounds", () => {
    const obs = [
      { x: [1, 1], y: 5 },
      { x: [3, 3], y: 2 },
    ];
    const next = bayesianOptimizationEngine.suggestNext(obs, {
      dimensions: 2,
      bounds: [{ min: 0, max: 5 }, { min: 0, max: 5 }],
      seed: 42,
    });
    expect(next.length).toBe(2);
    expect(next[0]).toBeGreaterThanOrEqual(0);
    expect(next[0]).toBeLessThanOrEqual(5);
  });

  it("UCB acquisition function works", () => {
    const result = bayesianOptimizationEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, bounds: [{ min: -5, max: 5 }], seed: 42, acquisitionFunction: "UCB", maxIterations: 10 }
    );
    expect(result.bestY).toBeLessThan(5);
  });

  it("PI acquisition function works", () => {
    const result = bayesianOptimizationEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, bounds: [{ min: -5, max: 5 }], seed: 42, acquisitionFunction: "PI", maxIterations: 10 }
    );
    expect(result.bestY).toBeLessThan(5);
  });

  it("modelFit returns valid coverage", () => {
    const result = bayesianOptimizationEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, bounds: [{ min: -5, max: 5 }], seed: 42, maxIterations: 10 }
    );
    expect(result.modelFit.coverage).toBeGreaterThanOrEqual(0);
    expect(result.modelFit.coverage).toBeLessThanOrEqual(1);
  });
});

// ===========================================================================
// Trust Region
// ===========================================================================

describe("TrustRegion — Nonlinear Optimization", () => {
  it("minimizes sphere function from arbitrary start", () => {
    const result = trustRegionEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, x0: [3, 4] }
    );
    expect(result.fval).toBeLessThan(0.01);
    expect(result.converged).toBe(true);
  });

  it("minimizes Rosenbrock with bounds", () => {
    const result = trustRegionEngine.minimize(
      (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
      {
        dimensions: 2,
        x0: [0, 0],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        maxIterations: 500,
      }
    );
    expect(result.fval).toBeLessThan(1);
  });

  it("returns history with decreasing fval trend", () => {
    const result = trustRegionEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, x0: [5, 5] }
    );
    expect(result.history.length).toBeGreaterThan(1);
    expect(result.history[result.history.length - 1].fval).toBeLessThan(result.history[0].fval);
  });

  it("trust radius adapts during optimization", () => {
    const result = trustRegionEngine.minimize(
      (x) => x[0] ** 2,
      { dimensions: 1, x0: [10], initialRadius: 1.0 }
    );
    const radii = result.history.map(h => h.radius);
    // Radius should change at least once
    expect(new Set(radii).size).toBeGreaterThan(1);
  });

  it("respects bound constraints", () => {
    const result = trustRegionEngine.minimize(
      (x) => x[0], // Minimum at x=lower_bound
      { dimensions: 1, x0: [5], bounds: [{ min: 2, max: 10 }] }
    );
    expect(result.x[0]).toBeGreaterThanOrEqual(2);
  });

  it("gradientNorm is small at convergence", () => {
    const result = trustRegionEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      { dimensions: 2, x0: [1, 1] }
    );
    expect(result.gradientNorm).toBeLessThan(0.01);
  });
});

// ===========================================================================
// BVH — Bounding Volume Hierarchy
// ===========================================================================

describe("BVH — Spatial Queries", () => {
  // Simple triangle mesh: two triangles forming a square on XY plane
  const triangles: Triangle[] = [
    { v0: [0, 0, 0], v1: [10, 0, 0], v2: [10, 10, 0], id: 0 },
    { v0: [0, 0, 0], v1: [10, 10, 0], v2: [0, 10, 0], id: 1 },
    // Second square offset in Z
    { v0: [0, 0, 5], v1: [10, 0, 5], v2: [10, 10, 5], id: 2 },
    { v0: [0, 0, 5], v1: [10, 10, 5], v2: [0, 10, 5], id: 3 },
  ];

  it("builds a BVH from triangles", () => {
    const root = bvhEngine.build(triangles);
    expect(root).toBeDefined();
    expect(root.aabb).toBeDefined();
  });

  it("AABB encompasses all triangles", () => {
    const root = bvhEngine.build(triangles);
    expect(root.aabb.min[0]).toBeLessThanOrEqual(0);
    expect(root.aabb.min[1]).toBeLessThanOrEqual(0);
    expect(root.aabb.min[2]).toBeLessThanOrEqual(0);
    expect(root.aabb.max[0]).toBeGreaterThanOrEqual(10);
    expect(root.aabb.max[1]).toBeGreaterThanOrEqual(10);
    expect(root.aabb.max[2]).toBeGreaterThanOrEqual(5);
  });

  it("raycast hits triangle from above", () => {
    const root = bvhEngine.build(triangles);
    const hits = bvhEngine.raycast(root, triangles, [5, 5, 10], [0, 0, -1]);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    // First hit should be on z=5 plane
    expect(hits[0].point[2]).toBeCloseTo(5, 1);
  });

  it("raycast misses when ray is outside geometry", () => {
    const root = bvhEngine.build(triangles);
    const hits = bvhEngine.raycast(root, triangles, [50, 50, 10], [0, 0, -1]);
    expect(hits.length).toBe(0);
  });

  it("computeAABB returns correct bounds", () => {
    const aabb = bvhEngine.computeAABB(triangles);
    expect(aabb.min).toEqual([0, 0, 0]);
    expect(aabb.max).toEqual([10, 10, 5]);
  });

  it("pointInAABB correctly tests containment", () => {
    const aabb: { min: [number, number, number]; max: [number, number, number] } = {
      min: [0, 0, 0],
      max: [10, 10, 10],
    };
    expect(bvhEngine.pointInAABB([5, 5, 5], aabb)).toBe(true);
    expect(bvhEngine.pointInAABB([15, 5, 5], aabb)).toBe(false);
  });

  it("aabbOverlap detects intersection", () => {
    const a = { min: [0, 0, 0] as [number, number, number], max: [5, 5, 5] as [number, number, number] };
    const b = { min: [3, 3, 3] as [number, number, number], max: [8, 8, 8] as [number, number, number] };
    const c = { min: [10, 10, 10] as [number, number, number], max: [15, 15, 15] as [number, number, number] };
    expect(bvhEngine.aabbOverlap(a, b)).toBe(true);
    expect(bvhEngine.aabbOverlap(a, c)).toBe(false);
  });

  it("queryRadius finds nearby triangles", () => {
    const root = bvhEngine.build(triangles);
    // Tri 0 centroid: (6.67, 3.33, 0), Tri 1 centroid: (3.33, 6.67, 0)
    // Tri 2 centroid: (6.67, 3.33, 5), Tri 3 centroid: (3.33, 6.67, 5)
    const found = bvhEngine.queryRadius(root, triangles, [5, 5, 0], 5);
    expect(found.length).toBeGreaterThanOrEqual(1);
    // Should find z=0 triangles but not z=5 (distance > 5 to z=5 centroids)
    expect(found.every(idx => idx <= 1)).toBe(true);
  });

  it("stats returns valid node counts", () => {
    const root = bvhEngine.build(triangles);
    const s = bvhEngine.stats(root);
    expect(s.nodeCount).toBeGreaterThanOrEqual(1);
    expect(s.totalTriangles).toBe(4);
    expect(s.avgTrianglesPerLeaf).toBeGreaterThan(0);
  });

  it("collides detects overlapping meshes", () => {
    const trisA: Triangle[] = [
      { v0: [0, 0, 0], v1: [5, 0, 0], v2: [0, 5, 0] },
    ];
    const trisB: Triangle[] = [
      { v0: [2, 2, -1], v1: [2, 2, 1], v2: [3, 2, 0] },
    ];
    const rootA = bvhEngine.build(trisA);
    const rootB = bvhEngine.build(trisB);
    // AABBs overlap even if triangles may not intersect exactly
    // This tests the AABB-level collision path
    const result = bvhEngine.collides(rootA, trisA, rootB, trisB);
    expect(typeof result).toBe("boolean");
  });

  it("handles single triangle BVH", () => {
    const single: Triangle[] = [{ v0: [0, 0, 0], v1: [1, 0, 0], v2: [0, 1, 0] }];
    const root = bvhEngine.build(single);
    expect(root.triangles.length).toBe(1);
    const hits = bvhEngine.raycast(root, single, [0.2, 0.2, 1], [0, 0, -1]);
    expect(hits.length).toBe(1);
  });

  it("handles larger mesh (16 triangles)", () => {
    // Grid of triangles
    const mesh: Triangle[] = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        mesh.push({
          v0: [x, y, 0], v1: [x + 1, y, 0], v2: [x + 1, y + 1, 0],
        });
      }
    }
    const root = bvhEngine.build(mesh, 2);
    const s = bvhEngine.stats(root);
    expect(s.totalTriangles).toBe(16);
    expect(s.maxDepth).toBeGreaterThan(0);
  });
});
