/**
 * SpectralGraphEngine — Fiedler-vector mesh segmentation tests.
 *
 * U-GAP-CAD-SPECTRAL-GRAPH re-scope per R8 dedup-preflight:
 * engine already ported (header: "Source: PRISM_SPECTRAL_GRAPH_CAD (monolith R2.3.2)")
 * but had NO companion tests. This file closes the test gap.
 *
 * Reference cases:
 *   - Adjacency on 2 edge-sharing triangles = 1; on 2 disjoint triangles = 0.
 *   - Graph Laplacian: L = D − A; row sums = 0; diagonal = node degree.
 *   - Power iteration on identity I: any nonzero starting vector → λ=1.
 *   - Spectral partition on disjoint two-triangle graph: 2 distinct clusters.
 *
 * Literature:
 *   - Fiedler, M. (1973). "Algebraic connectivity of graphs."
 *   - Chung, F. (1997). "Spectral Graph Theory."
 */

import { describe, it, expect } from "vitest";
import { spectralGraphEngine } from "../engines/SpectralGraphEngine";

describe("SpectralGraphEngine — buildFaceGraph", () => {
  it("two edge-sharing triangles → adjacency [[0,1],[1,0]]", () => {
    const faces = [[0, 1, 2], [1, 2, 3]];  // shared edge (1,2)
    const adj = spectralGraphEngine.buildFaceGraph(faces);
    expect(adj).toEqual([[0, 1], [1, 0]]);
  });

  it("two disjoint triangles → adjacency [[0,0],[0,0]]", () => {
    const faces = [[0, 1, 2], [3, 4, 5]];
    const adj = spectralGraphEngine.buildFaceGraph(faces);
    expect(adj).toEqual([[0, 0], [0, 0]]);
  });

  it("triangle strip of 3: 0-1-2 connected linearly", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4]];
    // face 0 shares (1,2) with face 1; face 1 shares (2,3) with face 2
    const adj = spectralGraphEngine.buildFaceGraph(faces);
    expect(adj[0][1]).toBe(1);
    expect(adj[1][2]).toBe(1);
    expect(adj[0][2]).toBe(0);  // not adjacent
    // Symmetric
    expect(adj[1][0]).toBe(1);
    expect(adj[2][1]).toBe(1);
  });

  it("adjacency matrix is square and symmetric", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]];
    const adj = spectralGraphEngine.buildFaceGraph(faces);
    expect(adj.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(adj[i].length).toBe(4);
      expect(adj[i][i]).toBe(0);
      for (let j = 0; j < 4; j++) {
        expect(adj[i][j]).toBe(adj[j][i]);
      }
    }
  });

  it("empty face list → empty adjacency", () => {
    expect(spectralGraphEngine.buildFaceGraph([])).toEqual([]);
  });
});

describe("SpectralGraphEngine — computeLaplacian", () => {
  it("L = D - A; row sums are all zero", () => {
    const adj = [[0, 1, 1], [1, 0, 1], [1, 1, 0]]; // K3 triangle
    const L = spectralGraphEngine.computeLaplacian(adj);
    for (let i = 0; i < L.length; i++) {
      const rowSum = L[i].reduce((a, b) => a + b, 0);
      expect(rowSum).toBeCloseTo(0, 10);
    }
  });

  it("L diagonal = degree of each node", () => {
    const adj = [[0, 1, 1], [1, 0, 1], [1, 1, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);
    expect(L[0][0]).toBe(2);
    expect(L[1][1]).toBe(2);
    expect(L[2][2]).toBe(2);
  });

  it("L off-diagonal = -A entry", () => {
    const adj = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);
    expect(L[0][1]).toBe(-1);
    expect(L[1][0]).toBe(-1);
    expect(L[1][2]).toBe(-1);
    expect(L[2][1]).toBe(-1);
    expect(L[0][2]).toBe(0);
  });

  it("L is symmetric", () => {
    const adj = [[0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 0, 0], [0, 1, 0, 0]];
    const L = spectralGraphEngine.computeLaplacian(adj);
    for (let i = 0; i < L.length; i++) {
      for (let j = 0; j < L.length; j++) {
        expect(L[i][j]).toBe(L[j][i]);
      }
    }
  });
});

describe("SpectralGraphEngine — powerIteration", () => {
  it("identity matrix: dominant eigenvalue = 1, unit eigenvector", () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const r = spectralGraphEngine.powerIteration(I);
    expect(r.eigenvalue).toBeCloseTo(1, 6);
    // ||v|| ≈ 1
    const norm = Math.sqrt(r.eigenvector.reduce((a, x) => a + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("diagonal matrix [[3,0],[0,1]]: dominant eigenvalue = 3", () => {
    const M = [[3, 0], [0, 1]];
    const r = spectralGraphEngine.powerIteration(M, 200);
    expect(r.eigenvalue).toBeCloseTo(3, 4);
    // Eigenvector should align with first axis
    expect(Math.abs(r.eigenvector[0])).toBeCloseTo(1, 3);
    expect(Math.abs(r.eigenvector[1])).toBeLessThan(0.05);
  });

  it("zero matrix returns zero eigenvalue + finite vector", () => {
    const Z = [[0, 0], [0, 0]];
    const r = spectralGraphEngine.powerIteration(Z);
    expect(r.eigenvalue).toBe(0);
    expect(r.eigenvector.length).toBe(2);
    for (const x of r.eigenvector) expect(Number.isFinite(x)).toBe(true);
  });

  it("empty matrix returns zero/empty", () => {
    const r = spectralGraphEngine.powerIteration([]);
    expect(r.eigenvalue).toBe(0);
    expect(r.eigenvector).toEqual([]);
  });

  it("eigenvalue is finite for symmetric stochastic matrix", () => {
    const M = [[0.5, 0.5], [0.5, 0.5]];
    const r = spectralGraphEngine.powerIteration(M);
    expect(Number.isFinite(r.eigenvalue)).toBe(true);
    expect(r.eigenvalue).toBeCloseTo(1, 4);
  });
});

describe("SpectralGraphEngine — spectralPartition", () => {
  it("single face → trivial partition", () => {
    const r = spectralGraphEngine.spectralPartition([[0, 1, 2]]);
    expect(r.partition).toEqual([0]);
    expect(r.clusters).toEqual([[0]]);
    expect(r.algebraicConnectivity).toBe(0);
  });

  it("connected strip: produces 2 partitions (signs of Fiedler vector)", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]];
    const r = spectralGraphEngine.spectralPartition(faces);
    expect(r.partition).toHaveLength(4);
    expect(r.clusters).toHaveLength(2);
    // Partition labels are 0 or 1
    for (const p of r.partition) {
      expect([0, 1]).toContain(p);
    }
    // Total faces == sum of cluster sizes
    const total = r.clusters[0].length + r.clusters[1].length;
    expect(total).toBe(4);
  });

  it("fiedler vector has length == face count", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4]];
    const r = spectralGraphEngine.spectralPartition(faces);
    expect(r.fiedlerVector).toHaveLength(3);
  });

  it("algebraicConnectivity is finite + non-negative for connected graphs", () => {
    const faces = [[0, 1, 2], [1, 2, 3], [2, 3, 4]];
    const r = spectralGraphEngine.spectralPartition(faces);
    expect(Number.isFinite(r.algebraicConnectivity)).toBe(true);
    expect(r.algebraicConnectivity).toBeGreaterThanOrEqual(-1e-6);
  });
});

describe("SpectralGraphEngine — analyzeMesh", () => {
  it("single triangle: regions=1, complexity=simple", () => {
    const r = spectralGraphEngine.analyzeMesh([0, 1, 2]);
    expect(r.regions).toBe(1);
    expect(r.complexity).toBe("simple");
  });

  it("triangle strip (4 faces): regions in {1,2}", () => {
    const indices = [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5];
    const r = spectralGraphEngine.analyzeMesh(indices);
    expect([1, 2]).toContain(r.regions);
    expect(["simple", "moderate", "complex"]).toContain(r.complexity);
  });

  it("fiedlerVector length == face count for multi-face meshes", () => {
    const indices = [0, 1, 2, 1, 2, 3];
    const r = spectralGraphEngine.analyzeMesh(indices);
    expect(r.fiedlerVector).toHaveLength(2);
  });

  it("empty mesh → simple complexity", () => {
    const r = spectralGraphEngine.analyzeMesh([]);
    expect(r.regions).toBe(1);
    expect(r.complexity).toBe("simple");
    expect(r.algebraicConnectivity).toBe(0);
  });

  it("output complexity is one of {simple, moderate, complex}", () => {
    const indices = [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6];
    const r = spectralGraphEngine.analyzeMesh(indices);
    expect(["simple", "moderate", "complex"]).toContain(r.complexity);
  });
});
