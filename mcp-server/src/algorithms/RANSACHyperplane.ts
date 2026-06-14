/**
 * RANSACHyperplane — robust orthogonal-distance fit of a hyperplane to noisy
 * d-dimensional points, rejecting gross outliers (Fischler & Bolles 1981).
 *
 *   line in 2D · plane in 3D · hyperplane in N-D — ONE model: { n·x = c }, n unit.
 *
 * RANSAC loop: repeatedly draw the minimal sample (d points define a d-dim
 * hyperplane exactly), score how many of ALL points lie within `threshold`
 * orthogonal distance (the consensus set), and keep the model with the largest
 * consensus. A final total-least-squares refit on the best inlier set (smallest
 * eigenvector of the centered covariance, via a self-contained Jacobi
 * eigensolver) tightens the fit. Deterministic given `seed`.
 *
 * Why robust: ordinary least squares is wrecked by a single gross outlier (one
 * bad CMM probe touch, a reflection in a point cloud); RANSAC fits the inlier
 * majority and reports the outliers explicitly. High-leverage substrate for
 * metrology (flatness/straightness from CMM data), CAD planar-face extraction,
 * and robust trend lines over telemetry — the data domains delta/quality/oscar
 * own (this module is the algorithm; those galaxies own the domain wrappers).
 *
 * Why NEW (grep 2026-05-29): no RANSAC / robust-fit / total-least-squares /
 * hyperplane-fit / symmetric-eigen primitive exists in algorithms/ ("ransac"
 * matched only the substring "transaction").
 *
 * @module algorithms/RANSACHyperplane
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — robust geometric estimation
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface RANSACInput {
  /** Points [n × d] (n ≥ d; d ≥ 2). */
  points: number[][];
  /** Inlier orthogonal-distance threshold (> 0). */
  threshold: number;
  /** RANSAC iterations (default 100). */
  iterations?: number;
  /** Deterministic sample-selection seed (default 1). */
  seed?: number;
  /** Total-least-squares refit on the best inlier set (default true). */
  refit?: boolean;
}

export interface RANSACOutput {
  /** Unit normal of the fitted hyperplane (length d). */
  normal: number[];
  /** Offset c such that normal·x = c for x on the plane. */
  offset: number;
  /** Indices of inlier points (orthogonal distance ≤ threshold). */
  inliers: number[];
  /** Indices of outlier points. */
  outliers: number[];
  inlierCount: number;
  /** RMS orthogonal residual over the inliers. */
  inlierRMS: number;
  dimension: number;
  iterations: number;
  /** True if a TLS refit was applied to the inlier set. */
  refined: boolean;
  warnings: string[];
}

const EPS = 1e-12;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}
function dot(a: number[], b: number[]): number { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(a: number[]): number { return Math.sqrt(dot(a, a)); }

/** Deterministic LCG → k distinct indices in [0,n). */
function sampleIndices(n: number, k: number, state: { s: number }): number[] {
  const chosen = new Set<number>();
  let guard = 0;
  while (chosen.size < k && guard < n * 20) {
    state.s = (state.s * 1103515245 + 12345) & 0x7fffffff;
    chosen.add(state.s % n);
    guard++;
  }
  return [...chosen];
}

/**
 * Unit normal of the hyperplane through `sample` (d points in d-dim), via
 * Gram-Schmidt: orthonormalize the (d−1) edge vectors, then find a basis vector
 * with a non-trivial residual orthogonal to all of them. Returns null if the
 * sample is degenerate (points not in general position).
 */
function minimalNormal(sample: number[][]): number[] | null {
  const d = sample[0].length;
  const p0 = sample[0];
  const basis: number[][] = []; // orthonormal span of the hyperplane
  for (let i = 1; i < sample.length; i++) {
    let v = sample[i].map((x, j) => x - p0[j]);
    for (const u of basis) { const c = dot(v, u); v = v.map((x, j) => x - c * u[j]); }
    const nv = norm(v);
    if (nv < EPS) return null;            // collinear / coincident → degenerate
    basis.push(v.map((x) => x / nv));
  }
  // normal = first standard basis e_k with significant residual orthogonal to `basis`
  for (let k = 0; k < d; k++) {
    let e = new Array<number>(d).fill(0); e[k] = 1;
    for (const u of basis) { const c = dot(e, u); e = e.map((x, j) => x - c * u[j]); }
    const ne = norm(e);
    if (ne > 1e-6) return e.map((x) => x / ne);
  }
  return null;
}

/** Cyclic Jacobi eigen-decomposition of a symmetric d×d matrix. */
function jacobiEigen(A: number[][], sweeps = 100): { values: number[]; vectors: number[][] } {
  const d = A.length;
  const a = A.map((r) => r.slice());
  const V = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < d; p++) for (let q = p + 1; q < d; q++) off += a[p][q] * a[p][q];
    if (off < EPS) break;
    for (let p = 0; p < d; p++) {
      for (let q = p + 1; q < d; q++) {
        if (Math.abs(a[p][q]) < EPS) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let i = 0; i < d; i++) {
          const aip = a[i][p], aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[i][q] = s * aip + c * aiq;
        }
        for (let i = 0; i < d; i++) {
          const api = a[p][i], aqi = a[q][i];
          a[p][i] = c * api - s * aqi;
          a[q][i] = s * api + c * aqi;
        }
        for (let i = 0; i < d; i++) {
          const vip = V[i][p], viq = V[i][q];
          V[i][p] = c * vip - s * viq;
          V[i][q] = s * vip + c * viq;
        }
      }
    }
  }
  return { values: a.map((_, i) => a[i][i]), vectors: V };
}

/** TLS hyperplane normal of `pts` = eigenvector of the centered covariance with the smallest eigenvalue. */
function tlsNormal(pts: number[][], centroid: number[]): number[] {
  const d = centroid.length;
  const C = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (const p of pts) {
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (p[i] - centroid[i]) * (p[j] - centroid[j]);
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] /= pts.length;
  const { values, vectors } = jacobiEigen(C);
  let minIdx = 0;
  for (let i = 1; i < values.length; i++) if (values[i] < values[minIdx]) minIdx = i;
  const n = vectors.map((row) => row[minIdx]); // column minIdx
  const nn = norm(n) || 1;
  return n.map((x) => x / nn);
}

function residuals(points: number[][], normal: number[], offset: number): number[] {
  return points.map((p) => Math.abs(dot(normal, p) - offset));
}

export const RANSACHyperplane: Algorithm<RANSACInput, RANSACOutput> = {
  validate(input: RANSACInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { points, threshold } = input ?? ({} as RANSACInput);

    if (!isMatrix(points)) {
      issues.push({ field: "points", message: "points must be a non-empty [n × d] matrix (all rows same length).", severity: "error" });
    } else {
      const d = points[0].length;
      if (d < 2) issues.push({ field: "points", message: "dimension d must be ≥ 2.", severity: "error" });
      if (points.length < d) issues.push({ field: "points", message: `need at least d=${d} points to fit a hyperplane (got ${points.length}).`, severity: "error" });
      for (let i = 0; i < points.length; i++) {
        if (!points[i].every(isFiniteNumber)) { issues.push({ field: `points[${i}]`, message: "point values must be finite.", severity: "error" }); break; }
      }
    }
    if (!isFiniteNumber(threshold) || threshold <= 0) {
      issues.push({ field: "threshold", message: "threshold must be a positive finite number.", severity: "error" });
    }
    if (input?.iterations !== undefined && (!Number.isInteger(input.iterations) || input.iterations < 1)) {
      issues.push({ field: "iterations", message: "iterations must be an integer ≥ 1.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: RANSACInput): RANSACOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`RANSACHyperplane: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const points = input.points;
    const n = points.length;
    const d = points[0].length;
    const threshold = input.threshold;
    const iterations = input.iterations ?? 100;
    const refit = input.refit !== false;
    const state = { s: ((input.seed ?? 1) * 2654435761 + 1) & 0x7fffffff };

    let bestNormal: number[] | null = null;
    let bestOffset = 0;
    let bestInliers: number[] = [];
    let degenerateSamples = 0;

    for (let it = 0; it < iterations; it++) {
      const idx = sampleIndices(n, d, state);
      if (idx.length < d) { degenerateSamples++; continue; }
      const sample = idx.map((i) => points[i]);
      const normal = minimalNormal(sample);
      if (!normal) { degenerateSamples++; continue; }
      const offset = dot(normal, sample[0]);
      const res = residuals(points, normal, offset);
      const inliers: number[] = [];
      for (let i = 0; i < n; i++) if (res[i] <= threshold) inliers.push(i);
      if (inliers.length > bestInliers.length) {
        bestInliers = inliers; bestNormal = normal; bestOffset = offset;
      }
    }

    if (!bestNormal) {
      // every sample was degenerate (e.g. all points coincident/collinear in a way that defines no hyperplane)
      throw new Error("RANSACHyperplane: no valid hyperplane found — all minimal samples were degenerate (check for coincident/collinear points).");
    }
    if (degenerateSamples > 0) warnings.push(`${degenerateSamples}/${iterations} samples were degenerate (skipped).`);

    let refined = false;
    let normal = bestNormal;
    let offset = bestOffset;
    if (refit && bestInliers.length >= d) {
      const inPts = bestInliers.map((i) => points[i]);
      const centroid = new Array<number>(d).fill(0);
      for (const p of inPts) for (let j = 0; j < d; j++) centroid[j] += p[j];
      for (let j = 0; j < d; j++) centroid[j] /= inPts.length;
      const refNormal = tlsNormal(inPts, centroid);
      const refOffset = dot(refNormal, centroid);
      // recompute inliers with the refined model (refit can only keep or grow consensus on the inlier set)
      const res = residuals(points, refNormal, refOffset);
      const refInliers: number[] = [];
      for (let i = 0; i < n; i++) if (res[i] <= threshold) refInliers.push(i);
      if (refInliers.length >= bestInliers.length) {
        normal = refNormal; offset = refOffset; bestInliers = refInliers; refined = true;
      }
    }

    // canonical sign: make the largest-magnitude normal component positive (deterministic output)
    let maxAbs = 0, maxAt = 0;
    for (let i = 0; i < d; i++) if (Math.abs(normal[i]) > maxAbs) { maxAbs = Math.abs(normal[i]); maxAt = i; }
    if (normal[maxAt] < 0) { normal = normal.map((x) => -x); offset = -offset; }

    const inSet = new Set(bestInliers);
    const outliers: number[] = [];
    for (let i = 0; i < n; i++) if (!inSet.has(i)) outliers.push(i);
    const inRes = bestInliers.map((i) => Math.abs(dot(normal, points[i]) - offset));
    const inlierRMS = inRes.length ? Math.sqrt(inRes.reduce((s, r) => s + r * r, 0) / inRes.length) : 0;

    return {
      normal, offset, inliers: bestInliers, outliers,
      inlierCount: bestInliers.length, inlierRMS,
      dimension: d, iterations, refined, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "ransac_hyperplane",
      name: "RANSAC Hyperplane Fit",
      version: "1.0.0",
      domain: "spatial",
      category: "robust-estimation",
      description:
        "Robust orthogonal-distance hyperplane fit (line in 2D, plane in 3D, hyperplane in N-D) by RANSAC: keeps the model with the largest inlier consensus, rejecting gross outliers, then total-least-squares refits on the inlier set (smallest-eigenvector via Jacobi). Reports inliers, outliers, and RMS residual. Deterministic given seed.",
      equation_plain: "fit { n·x = c } maximizing |{ i : |n·x_i − c| ≤ threshold }|; refit n = argmin eig(cov(inliers))",
      assumptions: [
        "Inliers form the largest consistent subset (RANSAC majority assumption).",
        "n ≥ d points; d ≥ 2; a meaningful orthogonal-distance threshold is supplied.",
      ],
      limitations: [
        "Single hyperplane (not multi-model / not curved surfaces — circle/sphere need a different estimator).",
        "Iteration count must be large enough for the outlier ratio; pathological all-collinear data throws.",
      ],
      reference: "Fischler, M.A. & Bolles, R.C. (1981). Random Sample Consensus. Communications of the ACM 24(6).",
      inputs: {
        points: { type: "number[][]", description: "[n × d] points" },
        threshold: { type: "number", description: "inlier orthogonal-distance cutoff" },
        iterations: { type: "number", description: "RANSAC iterations (default 100)" },
        seed: { type: "number", description: "deterministic sample seed" },
        refit: { type: "boolean", description: "TLS refit on inliers (default true)" },
      },
      outputs: {
        normal: { type: "number[]", description: "unit hyperplane normal" },
        offset: { type: "number", description: "plane offset (n·x = c)" },
        inliers: { type: "number[]", description: "inlier indices" },
        outliers: { type: "number[]", description: "outlier indices" },
        inlierRMS: { type: "number", description: "RMS orthogonal residual over inliers" },
      },
      last_validated: "2026-05-29",
    };
  },
};
