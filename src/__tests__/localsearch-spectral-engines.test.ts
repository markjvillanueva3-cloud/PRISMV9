/**
 * Tests for LocalSearchEngine and SpectralGraphEngine.
 * Rounds 8-9 reverse-engineering from PRISM v8.89 monolith.
 */
import { describe, it, expect } from "vitest";
import { localSearchEngine } from "../engines/LocalSearchEngine.js";
import { spectralGraphEngine } from "../engines/SpectralGraphEngine.js";

// ============================================================================
// LocalSearchEngine — Hill Climbing
// ============================================================================

describe("LocalSearchEngine — Hill Climbing", () => {
  it("finds minimum of simple 1D function", () => {
    // Minimize x^2 with integer neighbors
    const result = localSearchEngine.hillClimbing({
      initial: 10,
      evaluate: (x: number) => x * x,
      getNeighbors: (x: number) => [x - 1, x + 1].filter(n => n !== x),
      maxIterations: 100,
    });
    expect(result.solution).toBe(0);
    expect(result.value).toBe(0);
    expect(result.localOptimum).toBe(true);
  });

  it("finds maximum when maximize=true", () => {
    const result = localSearchEngine.hillClimbing({
      initial: 0,
      evaluate: (x: number) => -(x - 5) * (x - 5) + 25, // max at x=5
      getNeighbors: (x: number) => [x - 1, x + 1],
      maximize: true,
      maxIterations: 100,
    });
    expect(result.solution).toBe(5);
    expect(result.value).toBe(25);
  });

  it("stops at local optimum", () => {
    // f(x) = -|x-3| with neighbor ±2 → gets stuck at non-global optimum
    const result = localSearchEngine.hillClimbing({
      initial: 0,
      evaluate: (x: number) => -Math.abs(x - 3),
      getNeighbors: (x: number) => [x - 2, x + 2],
      maximize: true,
      maxIterations: 100,
    });
    expect(result.localOptimum).toBe(true);
  });
});

// ============================================================================
// LocalSearchEngine — Random Restarts
// ============================================================================

describe("LocalSearchEngine — Random Restarts", () => {
  it("finds better solution with restarts", () => {
    let callCount = 0;
    const result = localSearchEngine.hillClimbingRestarts({
      initial: 100,
      evaluate: (x: number) => x * x,
      getNeighbors: (x: number) => [x - 1, x + 1],
      randomState: () => { callCount++; return Math.floor(Math.random() * 20) - 10; },
      maxIterations: 50,
    }, 5);
    expect(result.value).toBe(0);
    expect(result.restarts).toBe(5);
  });
});

// ============================================================================
// LocalSearchEngine — Simulated Annealing
// ============================================================================

describe("LocalSearchEngine — Simulated Annealing", () => {
  it("minimizes quadratic function", () => {
    const result = localSearchEngine.simulatedAnnealing({
      problem: {
        initial: 50,
        evaluate: (x: number) => x * x,
        getNeighbors: (x: number) => [x - 1, x + 1, x - 3, x + 3],
      },
      initialTemp: 100,
      coolingRate: 0.99,
      minTemp: 0.001,
      maxIterations: 10000,
    });
    // SA should get close to 0
    expect(Math.abs(result.solution as number)).toBeLessThan(5);
    expect(result.energy).toBeLessThan(25);
  });

  it("records temperature history", () => {
    const result = localSearchEngine.simulatedAnnealing({
      problem: {
        initial: 10,
        evaluate: (x: number) => x * x,
        getNeighbors: (x: number) => [x - 1, x + 1],
      },
      maxIterations: 500,
    });
    expect(result.history.length).toBeGreaterThan(0);
    // Temperature should decrease
    if (result.history.length > 1) {
      expect(result.history[result.history.length - 1].temperature)
        .toBeLessThan(result.history[0].temperature);
    }
  });

  it("final temperature is below initial", () => {
    const result = localSearchEngine.simulatedAnnealing({
      problem: {
        initial: 0,
        evaluate: (x: number) => x * x,
        getNeighbors: (x: number) => [x - 1, x + 1],
      },
      initialTemp: 1000,
      maxIterations: 1000,
    });
    expect(result.finalTemp).toBeLessThan(1000);
  });
});

// ============================================================================
// LocalSearchEngine — Beam Search
// ============================================================================

describe("LocalSearchEngine — Beam Search", () => {
  it("finds minimum with multiple beams", () => {
    const result = localSearchEngine.localBeamSearch({
      initial: 50,
      evaluate: (x: number) => x * x,
      getNeighbors: (x: number) => [x - 1, x + 1],
      randomState: () => Math.floor(Math.random() * 100) - 50,
      maxIterations: 200,
    }, 3);
    expect(Math.abs(result.value)).toBeLessThan(10);
  });
});

// ============================================================================
// LocalSearchEngine — 2-Opt TSP
// ============================================================================

describe("LocalSearchEngine — 2-Opt", () => {
  it("improves a bad tour", () => {
    // 4 points in a square, bad initial tour crosses
    const dist = [
      [0, 1, Math.SQRT2, 1],
      [1, 0, 1, Math.SQRT2],
      [Math.SQRT2, 1, 0, 1],
      [1, Math.SQRT2, 1, 0],
    ];
    // Crossing tour: 0-2-1-3 (diagonal)
    const badTour = [0, 2, 1, 3];
    const result = localSearchEngine.twoOpt(badTour, dist);

    // Should uncross to get length 4 (perimeter)
    expect(result.length).toBeLessThanOrEqual(4 + 0.01);
  });

  it("keeps already optimal tour", () => {
    const dist = [
      [0, 1, 2],
      [1, 0, 1],
      [2, 1, 0],
    ];
    const tour = [0, 1, 2];
    const result = localSearchEngine.twoOpt(tour, dist);
    expect(result.tour.length).toBe(3);
  });

  it("returns valid tour", () => {
    const n = 5;
    const dist = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => Math.abs(i - j))
    );
    const tour = [0, 3, 1, 4, 2]; // random order
    const result = localSearchEngine.twoOpt(tour, dist);
    expect(new Set(result.tour).size).toBe(n);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// LocalSearchEngine — 3-Opt TSP
// ============================================================================

describe("LocalSearchEngine — 3-Opt", () => {
  it("improves tour on 6-point instance", () => {
    // 6 points in a circle
    const n = 6;
    const points = Array.from({ length: n }, (_, i) => ({
      x: 10 * Math.cos(2 * Math.PI * i / n),
      y: 10 * Math.sin(2 * Math.PI * i / n),
    }));
    const dist = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        Math.sqrt((points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2)
      )
    );

    const badTour = [0, 3, 1, 4, 2, 5]; // scrambled
    const result = localSearchEngine.threeOpt(badTour, dist, 100);
    expect(result.tour.length).toBe(n);

    // Optimal tour length for regular hexagon with R=10
    const optimalLength = n * 2 * 10 * Math.sin(Math.PI / n);
    expect(result.length).toBeLessThan(optimalLength * 1.5);
  });
});

// ============================================================================
// SpectralGraphEngine — Face Graph
// ============================================================================

describe("SpectralGraphEngine — Face Graph", () => {
  it("builds adjacency for 4 connected triangles", () => {
    // Chain: [0,1,2] shares edge [1,2] with [1,2,3], etc.
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]];
    const adj = spectralGraphEngine.buildFaceGraph(faces);

    expect(adj.length).toBe(4);
    expect(adj[0][1]).toBe(1); // face 0 and 1 share edge [1,2]
    expect(adj[1][2]).toBe(1); // face 1 and 2 share edge [2,3]
    expect(adj[0][2]).toBe(0); // face 0 and 2 don't share an edge
    expect(adj[0][3]).toBe(0); // face 0 and 3 don't share an edge
  });

  it("handles single face", () => {
    const adj = spectralGraphEngine.buildFaceGraph([[0, 1, 2]]);
    expect(adj.length).toBe(1);
    expect(adj[0][0]).toBe(0);
  });
});

// ============================================================================
// SpectralGraphEngine — Laplacian
// ============================================================================

describe("SpectralGraphEngine — Laplacian", () => {
  it("Laplacian row sums are zero", () => {
    const adj = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);

    for (let i = 0; i < L.length; i++) {
      const rowSum = L[i].reduce((s, v) => s + v, 0);
      expect(Math.abs(rowSum)).toBeLessThan(1e-10);
    }
  });

  it("Laplacian is symmetric", () => {
    const adj = [[0, 1, 1], [1, 0, 0], [1, 0, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);
    for (let i = 0; i < L.length; i++) {
      for (let j = 0; j < L.length; j++) {
        expect(L[i][j]).toBe(L[j][i]);
      }
    }
  });

  it("diagonal equals degree", () => {
    const adj = [[0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 0, 0], [0, 1, 0, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);
    expect(L[0][0]).toBe(2); // degree of node 0
    expect(L[1][1]).toBe(3); // degree of node 1
    expect(L[3][3]).toBe(1); // degree of node 3
  });
});

// ============================================================================
// SpectralGraphEngine — Power Iteration
// ============================================================================

describe("SpectralGraphEngine — Power Iteration", () => {
  it("finds dominant eigenvector of identity", () => {
    const result = spectralGraphEngine.powerIteration([[1, 0], [0, 1]]);
    expect(result.eigenvalue).toBeCloseTo(1, 4);
  });

  it("finds dominant eigenvector of 2x2 matrix", () => {
    // [[2,1],[1,2]] has eigenvalues 3 and 1
    const result = spectralGraphEngine.powerIteration([[2, 1], [1, 2]]);
    expect(result.eigenvalue).toBeCloseTo(3, 2);
    // Eigenvector should be proportional to [1,1]
    expect(Math.abs(result.eigenvector[0])).toBeCloseTo(Math.abs(result.eigenvector[1]), 2);
  });
});

// ============================================================================
// SpectralGraphEngine — Spectral Partition
// ============================================================================

describe("SpectralGraphEngine — Spectral Partition", () => {
  it("partitions chain mesh into clusters", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]];
    const result = spectralGraphEngine.spectralPartition(faces);

    expect(result.partition.length).toBe(4);
    expect(result.clusters.length).toBe(2);
    expect(result.fiedlerVector.length).toBe(4);
    // At least one cluster should have faces
    const totalFaces = result.clusters[0].length + result.clusters[1].length;
    expect(totalFaces).toBe(4);
  });

  it("handles single face", () => {
    const result = spectralGraphEngine.spectralPartition([[0, 1, 2]]);
    expect(result.partition).toEqual([0]);
  });
});

// ============================================================================
// SpectralGraphEngine — Mesh Analysis
// ============================================================================

describe("SpectralGraphEngine — Mesh Analysis", () => {
  it("analyzes simple mesh", () => {
    // 4 triangles as flat indices
    const indices = [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5];
    const result = spectralGraphEngine.analyzeMesh(indices);

    expect(result.regions).toBeGreaterThanOrEqual(1);
    expect(result.regions).toBeLessThanOrEqual(2);
    expect(["simple", "moderate"]).toContain(result.complexity);
  });

  it("single triangle is simple", () => {
    const result = spectralGraphEngine.analyzeMesh([0, 1, 2]);
    expect(result.regions).toBe(1);
    expect(result.complexity).toBe("simple");
  });

  it("empty mesh is simple", () => {
    const result = spectralGraphEngine.analyzeMesh([]);
    expect(result.regions).toBe(1);
    expect(result.complexity).toBe("simple");
  });
});
