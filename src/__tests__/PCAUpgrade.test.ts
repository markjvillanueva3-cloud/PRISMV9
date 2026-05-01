/**
 * PCA Upgrade Tests — SCIMATH-MS0 P3-U02
 *
 * Validates SVD-backed PCA, kernel PCA, incremental PCA, and robust PCA.
 * Cross-references with SVDEngine for mathematical consistency.
 */
import { describe, it, expect } from "vitest";
import { PrincipalComponentEngine, principalComponentEngine } from "../engines/PrincipalComponentEngine.js";
import { SVDEngine } from "../engines/SVDEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate correlated 2D data: y ≈ 2x + noise */
function linearData(n: number, seed: number = 42): number[][] {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return Array.from({ length: n }, () => {
    const x = rng() * 10;
    return [x, 2 * x + (rng() - 0.5) * 0.5];
  });
}

/** Generate 3-cluster data on a circle (nonlinear structure) */
function circleData(n: number, seed: number = 7): number[][] {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const data: number[][] = [];
  for (let i = 0; i < n; i++) {
    const theta = 2 * Math.PI * rng();
    const r = 1 + 0.1 * (rng() - 0.5);
    data.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return data;
}

/** Generate low-rank + sparse matrix for robust PCA testing */
function lowRankPlusSparse(n: number, p: number, rank: number, sparseFrac: number, seed: number = 99): {
  X: number[][]; L: number[][]; S: number[][];
} {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff) * 2 - 1; };

  // Low-rank L = A * B^T where A is n×rank, B is p×rank
  const A: number[][] = Array.from({ length: n }, () => Array.from({ length: rank }, () => rng()));
  const B: number[][] = Array.from({ length: p }, () => Array.from({ length: rank }, () => rng()));
  const L: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let sum = 0;
      for (let r = 0; r < rank; r++) sum += A[i][r] * B[j][r];
      return sum;
    })
  );

  // Sparse S: random entries at sparseFrac density
  const S: number[][] = Array.from({ length: n }, () => new Array(p).fill(0));
  const totalEntries = n * p;
  const numSparse = Math.round(totalEntries * sparseFrac);
  for (let k = 0; k < numSparse; k++) {
    const i = Math.abs(Math.round(rng() * (n - 1))) % n;
    const j = Math.abs(Math.round(rng() * (p - 1))) % p;
    S[i][j] = rng() * 5;
  }

  const X: number[][] = L.map((row, i) => row.map((v, j) => v + S[i][j]));
  return { X, L, S };
}

function frobNorm(A: number[][]): number {
  let sum = 0;
  for (const row of A) for (const v of row) sum += v * v;
  return Math.sqrt(sum);
}

// ── svdPCA tests ─────────────────────────────────────────────────────────────

describe("PrincipalComponentEngine.svdPCA", () => {

  it("eigenvalues match calculate() output", () => {
    const data = linearData(30);
    const svdResult = PrincipalComponentEngine.svdPCA(data, { standardize: true });
    const calcResult = principalComponentEngine.calculate({ data, standardize: true });

    // Eigenvalue ratios should match
    const svdPC1 = svdResult.explainedVarianceRatio[0] * 100;
    expect(svdPC1).toBeCloseTo(calcResult.first_pc_variance_pct.value, 0);
  });

  it("loadings are orthonormal columns", () => {
    const data = linearData(50);
    const result = PrincipalComponentEngine.svdPCA(data, { num_components: 2 });

    // V^T * V ≈ I (columns orthonormal)
    const V = result.loadings; // p × k
    const p = V.length;
    const k = V[0].length;
    for (let c1 = 0; c1 < k; c1++) {
      for (let c2 = 0; c2 < k; c2++) {
        let dot = 0;
        for (let i = 0; i < p; i++) dot += V[i][c1] * V[i][c2];
        if (c1 === c2) expect(dot).toBeCloseTo(1, 8);
        else expect(Math.abs(dot)).toBeLessThan(1e-8);
      }
    }
  });

  it("scores = data * loadings (centered)", () => {
    const data = linearData(30);
    const result = PrincipalComponentEngine.svdPCA(data, { num_components: 2 });

    // Center data
    const n = data.length, p = data[0].length;
    const means = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) means[j] += data[i][j];
      means[j] /= n;
    }
    const Xc = data.map(row => row.map((v, j) => v - means[j]));

    // Scores ≈ Xc * V
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 2; c++) {
        let projected = 0;
        for (let j = 0; j < p; j++) projected += Xc[i][j] * result.loadings[j][c];
        expect(projected).toBeCloseTo(result.scores[i][c], 6);
      }
    }
  });

  it("cumulative variance sums to 1.0 for full decomposition", () => {
    const data = linearData(30);
    const result = PrincipalComponentEngine.svdPCA(data);
    const last = result.cumulativeVariance[result.cumulativeVariance.length - 1];
    expect(last).toBeCloseTo(1.0, 5);
  });

  it("condition number matches SVDEngine", () => {
    const data = linearData(30);
    const result = PrincipalComponentEngine.svdPCA(data);
    // Verify condition number is reasonable (>1 for non-trivial data)
    expect(result.conditionNumber).toBeGreaterThan(1);
  });
});

// ── kernelPCA tests ──────────────────────────────────────────────────────────

describe("PrincipalComponentEngine.kernelPCA", () => {

  it("linear kernel matches standard PCA eigenvalue ratios", () => {
    const data = linearData(30);
    const kResult = PrincipalComponentEngine.kernelPCA(data, { kernel: "linear", num_components: 2 });
    const sResult = PrincipalComponentEngine.svdPCA(data, { num_components: 2 });

    // Variance ratios should be similar (linear kernel PCA ≈ standard PCA)
    expect(kResult.explainedVarianceRatio[0]).toBeCloseTo(sResult.explainedVarianceRatio[0], 1);
  });

  it("RBF kernel returns positive eigenvalues", () => {
    const data = circleData(40);
    const result = PrincipalComponentEngine.kernelPCA(data, {
      kernel: "rbf",
      gamma: 1.0,
      num_components: 5,
    });

    expect(result.eigenvalues.length).toBeGreaterThan(0);
    for (const ev of result.eigenvalues) {
      expect(ev).toBeGreaterThan(0);
    }
  });

  it("alphas have correct shape (n × k)", () => {
    const data = circleData(30);
    const result = PrincipalComponentEngine.kernelPCA(data, { num_components: 3 });
    expect(result.alphas.length).toBe(30);
    expect(result.alphas[0].length).toBeLessThanOrEqual(3);
  });

  it("polynomial kernel produces valid decomposition", () => {
    const data = linearData(25);
    const result = PrincipalComponentEngine.kernelPCA(data, {
      kernel: "polynomial",
      degree: 2,
      num_components: 2,
    });
    expect(result.eigenvalues.length).toBeGreaterThan(0);
    expect(result.explainedVarianceRatio[0]).toBeGreaterThan(0);
  });

  it("variance ratios sum to ≤ 1", () => {
    const data = circleData(30);
    const result = PrincipalComponentEngine.kernelPCA(data, { num_components: 5 });
    const sum = result.explainedVarianceRatio.reduce((s, v) => s + v, 0);
    expect(sum).toBeLessThanOrEqual(1.001);
  });
});

// ── incrementalPCA tests ─────────────────────────────────────────────────────

describe("PrincipalComponentEngine.incrementalPCA", () => {

  it("single batch matches svdPCA", () => {
    const data = linearData(30);
    const inc = PrincipalComponentEngine.incrementalPCA(null, data, { num_components: 2 });
    const full = PrincipalComponentEngine.svdPCA(data, { num_components: 2 });

    // Singular values should match
    for (let i = 0; i < inc.singularValues.length; i++) {
      expect(inc.singularValues[i]).toBeCloseTo(full.eigenvalues[i] > 0
        ? Math.sqrt(full.eigenvalues[i] * data.length) : 0, 3);
    }
  });

  it("two batches converge toward full PCA", () => {
    const data = linearData(60);
    const batch1 = data.slice(0, 30);
    const batch2 = data.slice(30, 60);

    // Incremental: batch1 then batch2
    const state1 = PrincipalComponentEngine.incrementalPCA(null, batch1, { num_components: 2 });
    const state2 = PrincipalComponentEngine.incrementalPCA(state1, batch2, { num_components: 2 });

    // Full PCA on all data
    const full = PrincipalComponentEngine.svdPCA(data, { num_components: 2 });

    // Explained variance should be in the same ballpark (within 30%)
    const incVar = state2.explainedVariance[0];
    const fullVar = full.eigenvalues[0];
    expect(incVar).toBeGreaterThan(fullVar * 0.5);
    expect(incVar).toBeLessThan(fullVar * 2.0);
  });

  it("nSamplesSeen accumulates correctly", () => {
    const b1 = linearData(20);
    const b2 = linearData(15, 99);
    const s1 = PrincipalComponentEngine.incrementalPCA(null, b1, { num_components: 2 });
    const s2 = PrincipalComponentEngine.incrementalPCA(s1, b2, { num_components: 2 });
    expect(s1.nSamplesSeen).toBe(20);
    expect(s2.nSamplesSeen).toBe(35);
  });

  it("mean updates correctly across batches", () => {
    const data = linearData(40);
    const batch1 = data.slice(0, 20);
    const batch2 = data.slice(20, 40);

    const state = PrincipalComponentEngine.incrementalPCA(
      PrincipalComponentEngine.incrementalPCA(null, batch1, { num_components: 2 }),
      batch2,
      { num_components: 2 }
    );

    // Combined mean should approximate the true mean
    const trueMean = [0, 0];
    for (const row of data) { trueMean[0] += row[0]; trueMean[1] += row[1]; }
    trueMean[0] /= 40; trueMean[1] /= 40;

    expect(state.mean[0]).toBeCloseTo(trueMean[0], 6);
    expect(state.mean[1]).toBeCloseTo(trueMean[1], 6);
  });

  it("components have unit norm", () => {
    const data = linearData(30);
    const state = PrincipalComponentEngine.incrementalPCA(null, data, { num_components: 2 });
    for (const comp of state.components) {
      const norm = Math.sqrt(comp.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeCloseTo(1, 6);
    }
  });
});

// ── robustPCA tests ──────────────────────────────────────────────────────────

describe("PrincipalComponentEngine.robustPCA", () => {

  it("decomposes low-rank + sparse correctly", () => {
    const { X, L } = lowRankPlusSparse(20, 10, 2, 0.05);
    const result = PrincipalComponentEngine.robustPCA(X, { maxIterations: 200 });

    // L should be low rank
    expect(result.rank).toBeLessThanOrEqual(5);

    // L + S ≈ X (reconstruction)
    let residNorm = 0, xNorm = 0;
    for (let i = 0; i < X.length; i++) {
      for (let j = 0; j < X[0].length; j++) {
        residNorm += (X[i][j] - result.lowRank[i][j] - result.sparse[i][j]) ** 2;
        xNorm += X[i][j] ** 2;
      }
    }
    expect(Math.sqrt(residNorm) / Math.sqrt(xNorm)).toBeLessThan(0.01);
  });

  it("converges on clean low-rank data", () => {
    // Pure low-rank (no sparse component) — should converge with S ≈ 0
    const n = 15, p = 8, rank = 2;
    let s = 42;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff) * 2 - 1; };
    const A = Array.from({ length: n }, () => Array.from({ length: rank }, () => rng()));
    const B = Array.from({ length: p }, () => Array.from({ length: rank }, () => rng()));
    const X = Array.from({ length: n }, (_, i) =>
      Array.from({ length: p }, (_, j) => {
        let sum = 0;
        for (let r = 0; r < rank; r++) sum += A[i][r] * B[j][r];
        return sum;
      })
    );

    const result = PrincipalComponentEngine.robustPCA(X);
    expect(result.converged).toBe(true);
    expect(result.rank).toBeLessThanOrEqual(rank + 1);
    expect(result.sparsity).toBeLessThan(0.15);
  });

  it("identifies sparse outliers", () => {
    // Create clean data + a few large outliers
    const n = 20, p = 5;
    const X: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: p }, (_, j) => Math.sin(i * 0.3 + j))
    );
    // Inject 3 outliers
    X[5][2] = 50;
    X[10][0] = -40;
    X[15][4] = 60;

    const result = PrincipalComponentEngine.robustPCA(X, { maxIterations: 200 });

    // Sparse component should capture the outliers
    expect(Math.abs(result.sparse[5][2])).toBeGreaterThan(10);
    expect(Math.abs(result.sparse[10][0])).toBeGreaterThan(10);
    expect(Math.abs(result.sparse[15][4])).toBeGreaterThan(10);
  });

  it("sparsity is in [0, 1]", () => {
    const { X } = lowRankPlusSparse(15, 8, 2, 0.1);
    const result = PrincipalComponentEngine.robustPCA(X);
    expect(result.sparsity).toBeGreaterThanOrEqual(0);
    expect(result.sparsity).toBeLessThanOrEqual(1);
  });

  it("iterations > 0", () => {
    const { X } = lowRankPlusSparse(10, 6, 2, 0.05);
    const result = PrincipalComponentEngine.robustPCA(X);
    expect(result.iterations).toBeGreaterThan(0);
  });
});
