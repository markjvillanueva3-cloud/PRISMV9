/**
 * DynamicTimeWarping — optimal elastic alignment of two (possibly different-length,
 * possibly speed-warped) time series, with the minimum-cost warping distance.
 *
 *   D(i,j) = dist(aᵢ, bⱼ) + min{ D(i−1,j), D(i,j−1), D(i−1,j−1) }
 *   DTW    = D(T_a, T_b) ,  path = backtrace of the argmin from (T_a, T_b)
 *
 * Exact dynamic program — O(T_a·T_b·d), no iteration / convergence / precision
 * tolerance. Unlike Euclidean distance it tolerates time shifts and local
 * speed differences, which is exactly what comparing two machine runs / sensor
 * streams / tool-wear signatures / cycle-time traces requires:
 *   • match a live spindle-load trace against a known-good reference run
 *   • cluster/retrieve similar telemetry episodes (k-NN with DTW distance)
 *   • align quoted vs actual cycle-time curves for reconciliation
 *
 * Sequences are number[][] — each row is a timestep's feature vector (use d=1,
 * i.e. [[x],[y],…], for a scalar series). Both series must share the feature
 * dimension d. An optional Sakoe-Chiba band caps the warp to ±window.
 *
 * Why NEW (grep 2026-05-29): no DTW / sequence-alignment primitive exists in the
 * 119-file algorithms/ directory.
 *
 * @module algorithms/DynamicTimeWarping
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — cross-domain time-series primitive
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export type DTWMetric = "euclidean" | "manhattan" | "sqeuclidean";

export interface DTWInput {
  /** First series [T_a × d] (each row a timestep vector). */
  a: number[][];
  /** Second series [T_b × d] (same d as a). */
  b: number[][];
  /** Per-step distance metric (default "euclidean"). */
  metric?: DTWMetric;
  /** Sakoe-Chiba band half-width: |i−j| ≤ window. Omit/≤0 = unconstrained. */
  window?: number;
}

export interface DTWOutput {
  /** Total DTW warping distance D(T_a, T_b). */
  distance: number;
  /** distance / pathLength — comparable across different sequence lengths. */
  normalizedDistance: number;
  /** Optimal warping path as [i, j] index pairs (a-index, b-index), in order. */
  path: Array<[number, number]>;
  lenA: number;
  lenB: number;
  dim: number;
  metric: DTWMetric;
  /** Effective Sakoe-Chiba window (0 = unconstrained). */
  window: number;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isSeries(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

function stepDist(x: number[], y: number[], metric: DTWMetric): number {
  let s = 0;
  if (metric === "manhattan") {
    for (let k = 0; k < x.length; k++) s += Math.abs(x[k] - y[k]);
    return s;
  }
  for (let k = 0; k < x.length; k++) {
    const dlt = x[k] - y[k];
    s += dlt * dlt;
  }
  return metric === "sqeuclidean" ? s : Math.sqrt(s);
}

export const DynamicTimeWarping: Algorithm<DTWInput, DTWOutput> = {
  validate(input: DTWInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { a, b } = input ?? ({} as DTWInput);

    for (const [name, m] of [["a", a], ["b", b]] as const) {
      if (!isSeries(m)) {
        issues.push({ field: name, message: `${name} must be a non-empty [T × d] series (each row a timestep vector).`, severity: "error" });
      } else {
        for (let i = 0; i < m.length; i++) {
          for (let k = 0; k < m[i].length; k++) {
            if (!isFiniteNumber(m[i][k])) {
              issues.push({ field: `${name}[${i}][${k}]`, message: `${name} values must be finite.`, severity: "error" });
              break;
            }
          }
        }
      }
    }
    if (isSeries(a) && isSeries(b) && a[0].length !== b[0].length) {
      issues.push({ field: "b", message: `feature dim mismatch: a has d=${a[0].length}, b has d=${b[0].length}.`, severity: "error" });
    }
    if (input?.window !== undefined && (!Number.isInteger(input.window) || input.window < 0)) {
      issues.push({ field: "window", message: "window must be a non-negative integer.", severity: "error" });
    }
    if (input?.metric !== undefined && !["euclidean", "manhattan", "sqeuclidean"].includes(input.metric)) {
      issues.push({ field: "metric", message: 'metric must be "euclidean" | "manhattan" | "sqeuclidean".', severity: "error" });
    }
    // window must still admit a path corner-to-corner: |Ta-Tb| <= window (if windowed)
    if (isSeries(a) && isSeries(b) && input?.window !== undefined && input.window > 0) {
      if (Math.abs(a.length - b.length) > input.window) {
        issues.push({ field: "window", message: `window ${input.window} < |Ta−Tb|=${Math.abs(a.length - b.length)}; no warping path can span both endpoints.`, severity: "error" });
      }
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: DTWInput): DTWOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`DynamicTimeWarping: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const { a, b } = input;
    const metric = input.metric ?? "euclidean";
    const Ta = a.length;
    const Tb = b.length;
    const dim = a[0].length;
    const window = input.window && input.window > 0 ? input.window : 0;

    // D is (Ta+1)×(Tb+1) with D[0][0]=0, edges = +Infinity
    const D: number[][] = Array.from({ length: Ta + 1 }, () => new Array<number>(Tb + 1).fill(Infinity));
    D[0][0] = 0;

    for (let i = 1; i <= Ta; i++) {
      let jLo = 1;
      let jHi = Tb;
      if (window > 0) {
        jLo = Math.max(1, i - window);
        jHi = Math.min(Tb, i + window);
      }
      for (let j = jLo; j <= jHi; j++) {
        const cost = stepDist(a[i - 1], b[j - 1], metric);
        const best = Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
        D[i][j] = cost + best;
      }
    }

    const distance = D[Ta][Tb];

    // backtrace the optimal warping path
    const path: Array<[number, number]> = [];
    let i = Ta;
    let j = Tb;
    while (i > 0 && j > 0) {
      path.push([i - 1, j - 1]);
      const diag = D[i - 1][j - 1];
      const up = D[i - 1][j];
      const left = D[i][j - 1];
      const m = Math.min(diag, up, left);
      if (m === diag) { i--; j--; }
      else if (m === up) { i--; }
      else { j--; }
    }
    path.reverse();

    const normalizedDistance = path.length > 0 ? distance / path.length : 0;

    return {
      distance,
      normalizedDistance,
      path,
      lenA: Ta,
      lenB: Tb,
      dim,
      metric,
      window,
      warnings: [],
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "dynamic_time_warping",
      name: "Dynamic Time Warping",
      version: "1.0.0",
      domain: "ml",
      category: "sequence-alignment",
      description:
        "Optimal elastic alignment + warping distance between two time series via dynamic programming. Tolerates time shifts / local speed differences. Multivariate; optional Sakoe-Chiba band. O(Ta·Tb·d).",
      equation_plain: "D(i,j) = dist(a_i,b_j) + min{D(i-1,j), D(i,j-1), D(i-1,j-1)}; DTW = D(Ta,Tb)",
      assumptions: [
        "Both endpoints aligned (classic DTW boundary conditions).",
        "Both series share feature dimension d.",
      ],
      limitations: [
        "O(Ta·Tb) memory/time — use the window band for long series.",
        "Not a metric (triangle inequality can fail) — fine for nearest-neighbour retrieval, not for metric-tree indexing.",
      ],
      reference: "Sakoe, H. & Chiba, S. (1978). Dynamic programming algorithm optimization for spoken word recognition. IEEE Trans. ASSP.",
      inputs: {
        a: { type: "number[][]", description: "[Ta × d] series" },
        b: { type: "number[][]", description: "[Tb × d] series" },
        metric: { type: '"euclidean"|"manhattan"|"sqeuclidean"', description: "per-step distance" },
        window: { type: "number", description: "Sakoe-Chiba band half-width (0 = unconstrained)" },
      },
      outputs: {
        distance: { type: "number", description: "DTW warping distance" },
        path: { type: "[number,number][]", description: "optimal alignment index pairs" },
      },
      last_validated: "2026-05-29",
    };
  },
};
