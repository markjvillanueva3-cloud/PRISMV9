/**
 * KNearestNeighbors — k-NN similarity search + classification + regression over
 * a dense vector corpus. The retrieval core of RAG (embed a query, return the
 * k most-similar corpus vectors) and a non-parametric predictor.
 *
 *   for each query q:
 *     score every corpus row by `metric` distance to q
 *     take the k nearest (smallest distance)
 *     task="search"   → return their indices + distances
 *     task="classify" → majority vote of their labels (ties → nearest wins)
 *     task="regress"  → mean of their (numeric) labels
 *
 * Pure, deterministic, exact (full scan — no ANN index), numerically safe.
 * Cosine distance is 1 − cosθ (zero-norm vectors → distance 1, flagged). Pairs
 * naturally with the other ALGO-SYNERGY primitives: reduce dimensionality with
 * `ml_pca` before retrieval, or use `ml_dtw` distances for time-series k-NN.
 *
 * Why PRISM needs it: RAG retrieval over india's embedded corpora, similar-job /
 * similar-part lookup for quoting, nearest-reference-run for telemetry triage,
 * and a baseline classifier/regressor anywhere a parametric model is overkill.
 *
 * Why NEW (grep 2026-05-29): no k-NN / nearest-neighbour / cosine-retrieval
 * primitive exists in the 121-file algorithms/ directory (DTW only mentions it).
 *
 * @module algorithms/KNearestNeighbors
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — RAG retrieval + ml baseline
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export type KNNMetric = "cosine" | "euclidean" | "manhattan";
export type KNNTask = "search" | "classify" | "regress";
export type KNNLabel = number | string;

export interface KNNInput {
  /** Query vectors [Q × d]. */
  queries: number[][];
  /** Corpus vectors [N × d] (same d as queries). */
  corpus: number[][];
  /** Number of neighbours (clamped to corpus size). */
  k: number;
  /** Distance metric (default "cosine" — the RAG default). */
  metric?: KNNMetric;
  /** Task (default "search"). classify/regress require `labels`. */
  task?: KNNTask;
  /** Per-corpus-row labels (length N). Required for classify/regress. */
  labels?: KNNLabel[];
  /** Distance-weight the vote/mean by 1/(distance+eps) (default false). */
  weighted?: boolean;
}

export interface KNNResult {
  /** Indices into corpus of the k nearest, nearest-first. */
  indices: number[];
  /** Distances to those neighbours, ascending. */
  distances: number[];
  /** classify → predicted label; regress → predicted number; search → undefined. */
  prediction?: KNNLabel;
}

export interface KNNOutput {
  results: KNNResult[];
  task: KNNTask;
  metric: KNNMetric;
  k: number;
  nQueries: number;
  nCorpus: number;
  dim: number;
  warnings: string[];
}

const WEIGHT_EPS = 1e-12;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

function distance(a: number[], b: number[], metric: KNNMetric): number {
  if (metric === "manhattan") {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s;
  }
  if (metric === "euclidean") {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  }
  // cosine distance = 1 − cosθ
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1; // zero-norm vector → maximally dissimilar (flagged in calculate)
  return 1 - dot / denom;
}

export const KNearestNeighbors: Algorithm<KNNInput, KNNOutput> = {
  validate(input: KNNInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { queries, corpus, k } = input ?? ({} as KNNInput);
    const task = input?.task ?? "search";

    for (const [name, m] of [["queries", queries], ["corpus", corpus]] as const) {
      if (!isMatrix(m)) {
        issues.push({ field: name, message: `${name} must be a non-empty [rows × d] matrix.`, severity: "error" });
      } else {
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[i].length; j++) {
            if (!isFiniteNumber(m[i][j])) {
              issues.push({ field: `${name}[${i}][${j}]`, message: `${name} values must be finite.`, severity: "error" });
              break;
            }
          }
        }
      }
    }
    if (isMatrix(queries) && isMatrix(corpus) && queries[0].length !== corpus[0].length) {
      issues.push({ field: "corpus", message: `dim mismatch: queries d=${queries[0].length} ≠ corpus d=${corpus[0].length}.`, severity: "error" });
    }
    if (!Number.isInteger(k) || k < 1) {
      issues.push({ field: "k", message: "k must be an integer ≥ 1.", severity: "error" });
    } else if (isMatrix(corpus) && k > corpus.length) {
      issues.push({ field: "k", message: `k ${k} > corpus size ${corpus.length}; will be clamped.`, severity: "warning" });
    }
    if (input?.metric !== undefined && !["cosine", "euclidean", "manhattan"].includes(input.metric)) {
      issues.push({ field: "metric", message: 'metric must be "cosine" | "euclidean" | "manhattan".', severity: "error" });
    }
    if (input?.task !== undefined && !["search", "classify", "regress"].includes(input.task)) {
      issues.push({ field: "task", message: 'task must be "search" | "classify" | "regress".', severity: "error" });
    }
    if (task === "classify" || task === "regress") {
      if (!Array.isArray(input?.labels) || (isMatrix(corpus) && input.labels.length !== corpus.length)) {
        issues.push({ field: "labels", message: `${task} requires labels of length = corpus size.`, severity: "error" });
      } else if (task === "regress" && !input.labels.every((l) => isFiniteNumber(l))) {
        issues.push({ field: "labels", message: "regress requires numeric labels.", severity: "error" });
      }
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: KNNInput): KNNOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`KNearestNeighbors: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [...(v0.warnings ?? [])];
    const { queries, corpus } = input;
    const metric = input.metric ?? "cosine";
    const task = input.task ?? "search";
    const weighted = input.weighted === true;
    const N = corpus.length;
    const k = Math.min(input.k, N);
    const dim = corpus[0].length;
    const labels = input.labels;

    if (metric === "cosine") {
      const zeroQ = queries.some((q) => q.every((x) => x === 0));
      const zeroC = corpus.some((c) => c.every((x) => x === 0));
      if (zeroQ || zeroC) warnings.push("zero-norm vector(s) present — cosine distance defaults to 1 (maximally dissimilar) for those.");
    }

    const results: KNNResult[] = queries.map((q) => {
      // distances to all corpus rows
      const scored = corpus.map((c, idx) => ({ idx, d: distance(q, c, metric) }));
      scored.sort((a, b) => a.d - b.d || a.idx - b.idx); // tie → lower index (deterministic)
      const top = scored.slice(0, k);
      const indices = top.map((t) => t.idx);
      const distances = top.map((t) => t.d);

      let prediction: KNNLabel | undefined;
      if (task === "classify" && labels) {
        const votes = new Map<KNNLabel, number>();
        for (const t of top) {
          const w = weighted ? 1 / (t.d + WEIGHT_EPS) : 1;
          votes.set(labels[t.idx], (votes.get(labels[t.idx]) ?? 0) + w);
        }
        // argmax vote; tie → label of the nearest neighbour (top[0])
        let best = labels[top[0].idx];
        let bestW = -Infinity;
        for (const [lab, w] of votes) { if (w > bestW) { bestW = w; best = lab; } }
        prediction = best;
      } else if (task === "regress" && labels) {
        let num = 0, den = 0;
        for (const t of top) {
          const w = weighted ? 1 / (t.d + WEIGHT_EPS) : 1;
          num += w * (labels[t.idx] as number);
          den += w;
        }
        prediction = den === 0 ? 0 : num / den;
      }
      return { indices, distances, prediction };
    });

    return { results, task, metric, k, nQueries: queries.length, nCorpus: N, dim, warnings };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "k_nearest_neighbors",
      name: "K-Nearest-Neighbors (search / classify / regress)",
      version: "1.0.0",
      domain: "ml",
      category: "retrieval",
      description:
        "Exact k-NN over a dense vector corpus: cosine/euclidean/manhattan top-k similarity search (RAG retrieval), majority-vote classification, or (distance-weighted) mean regression. Full-scan, deterministic.",
      equation_plain: "NN_k(q) = argmin_k dist(q, corpus_i); cosine dist = 1 − (q·c)/(‖q‖‖c‖)",
      assumptions: [
        "Dense, comparable feature vectors (reduce with PCA / normalize embeddings upstream).",
        "Corpus fits in memory (full scan — no approximate index).",
      ],
      limitations: [
        "O(Q·N·d) — for very large corpora use an ANN index (HNSW/IVF) upstream.",
        "Cosine on zero-norm vectors is undefined → defaults to distance 1 (flagged).",
      ],
      reference: "Cover, T. & Hart, P. (1967). Nearest neighbor pattern classification. IEEE Trans. Information Theory.",
      inputs: {
        queries: { type: "number[][]", description: "[Q × d] query vectors" },
        corpus: { type: "number[][]", description: "[N × d] corpus vectors" },
        k: { type: "number", description: "neighbours (clamped to N)" },
        metric: { type: '"cosine"|"euclidean"|"manhattan"', description: "distance (default cosine)" },
        task: { type: '"search"|"classify"|"regress"', description: "default search" },
        labels: { type: "(number|string)[]", description: "corpus labels (classify/regress)" },
      },
      outputs: {
        results: { type: "KNNResult[]", description: "per-query indices + distances (+ prediction)" },
      },
      last_validated: "2026-05-29",
    };
  },
};
