// scripts/lib/edge-predict.mjs
//
// BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india) — PURE CORE.
//
// Link-prediction scoring core for surfacing MISSING wiring edges from GraphSAGE
// node embeddings. This file is the graph-INDEPENDENT half: given embeddings and
// a candidate edge list, it L2-normalizes + scores + ranks. The graph-COUPLED
// half (candidate generation from the live wiring graph + the engine wrapper +
// `prism_dev:infer_missing_wiring`) consumes this core — built as the next unit so
// the verifiable core lands on a proven foundation first (R13 logical order).
//
// REUSES the canonical link-pred primitive from graphsage-model.mjs (sigmoid/dot/
// linkScore) — does NOT re-derive it. The score is `sigmoid(z_u . z_v)`; with the
// L2-normalized embeddings this lib produces, the dot product is the cosine
// similarity, so the score is `sigmoid(cosine)` (graphsage-model.mjs:272-280).
//
// QUANTIZATION NOTE: the live embeddings file stores `q` as an int[768] (quantized,
// e.g. [2,-1,-21,0]). Cosine similarity is SCALE-INVARIANT — L2-normalization
// divides out any uniform quantization scale — so we normalize the raw int vectors
// directly and never need the dequant scale. (Non-uniform quantization would shift
// cosine slightly; the GraphSAGE bridge writes a uniform per-vector quantization,
// so this holds. See reference_gnn_edge_predict_foundation_2026_06_08.)
//
// Karpathy 5-step edge cases handled from line 1: empty/missing vector, dim
// mismatch (dot() guards → 0 → sigmoid(0)=0.5), zero-norm (degenerate) vector,
// absent candidate node, self-pair (u===v), empty candidate list, NaN component.

import { readFileSync } from "node:fs";
import { linkScore, dot } from "./graphsage-model.mjs";

const NORM_EPS = 1e-12; // matches graphsage-model NORM_EPS — below this, norm is zero

/**
 * L2-normalize a numeric vector to a unit vector. A degenerate vector (zero / near-
 * zero norm, empty, or non-array) returns an all-zero vector of the same length
 * (or [] for non-arrays) — a zero vector scores cosine 0 against anything, which is
 * the honest "no signal" answer rather than a divide-by-zero NaN. Any NON-FINITE
 * norm — NaN OR ±Infinity, e.g. from a `NaN` or `1e400` component — also yields the
 * all-zero (signal-less) vector via the Number.isFinite guard, so no NaN/Infinity
 * ever leaks into a downstream score or corrupts the rank sort.
 * @param {number[]} vec
 * @returns {number[]}
 */
export function l2normalize(vec) {
  if (!Array.isArray(vec) || vec.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  // Guard catches three degenerate cases → all-zero "no signal": zero/near-zero
  // norm (!(norm > EPS)), NaN norm (NaN > EPS is false), and ±Infinity norm
  // (Number.isFinite false — the case a bare `norm > EPS` check would let through,
  // leaking Infinity/Infinity = NaN into the score; reviewer arm-C P1).
  if (!(norm > NORM_EPS) || !Number.isFinite(norm)) return new Array(vec.length).fill(0);
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/**
 * Link-prediction score for two ALREADY-L2-NORMALIZED embeddings, in (0,1).
 * Thin alias over the canonical graphsage-model.mjs primitive so callers import
 * one name; a dim mismatch yields dot()=0 → 0.5 (graceful, not a throw).
 * @param {number[]} normU @param {number[]} normV @returns {number}
 */
export function scoreEdge(normU, normV) {
  return linkScore(normU, normV);
}

/**
 * Load a GraphSAGE node-embeddings JSONL into a Map<nodeId, l2NormalizedVector>.
 * File shape (state/shared/nn-graph/node-embeddings-768d.jsonl): line 1 is a
 * `{__meta,...}` header (SKIPPED); each subsequent line is `{ n: nodeId, q: int[] }`.
 * Vectors are L2-normalized on load so downstream scoreEdge() is pure cosine.
 * Fail-soft per line: a malformed line or a record missing `n`/`q` is skipped and
 * counted, never throws — so one bad row can't lose the whole corpus (the silent-
 * total-loss class). Returns { embeddings, meta, count, skipped }.
 * @param {string} path
 * @param {(p:string,enc:string)=>string} [readFile] injectable for tests
 */
export function loadEmbeddings(path, readFile = readFileSync) {
  const raw = readFile(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const embeddings = new Map();
  let meta = null;
  let skipped = 0;
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (rec && rec.__meta !== undefined) {
      meta = rec;
      continue;
    }
    const id = rec?.n;
    const q = rec?.q;
    if (typeof id !== "string" || !Array.isArray(q) || q.length === 0) {
      skipped++;
      continue;
    }
    embeddings.set(id, l2normalize(q));
  }
  return { embeddings, meta, count: embeddings.size, skipped };
}

/**
 * Score + rank a list of candidate edges against an embeddings Map.
 * Each candidate is `{ u, v }` or `[u, v]` (node ids). For each, looks up both
 * normalized embeddings and emits `{ u, v, score }`; results are sorted by score
 * DESCENDING (most-likely missing edge first). Candidates whose node is absent
 * from the map, or self-pairs (u===v), are SKIPPED and counted (never silently
 * dropped — R12): the caller can see `skipped.absent` / `skipped.selfPair`.
 * @param {Map<string, number[]>} embeddings
 * @param {Array<{u:string,v:string}|[string,string]>} candidatePairs
 * @param {{topK?: number}} [opts]
 * @returns {{ ranked: Array<{u:string,v:string,score:number}>, skipped: {absent:number, selfPair:number} }}
 */
export function rankEdges(embeddings, candidatePairs, opts = {}) {
  const topK = opts.topK ?? Infinity;
  const ranked = [];
  const skipped = { absent: 0, selfPair: 0 };
  if (!(embeddings instanceof Map) || !Array.isArray(candidatePairs)) {
    return { ranked, skipped };
  }
  for (const pair of candidatePairs) {
    const u = Array.isArray(pair) ? pair[0] : pair?.u;
    const v = Array.isArray(pair) ? pair[1] : pair?.v;
    if (typeof u !== "string" || typeof v !== "string") {
      skipped.absent++;
      continue;
    }
    if (u === v) {
      skipped.selfPair++;
      continue;
    }
    const zu = embeddings.get(u);
    const zv = embeddings.get(v);
    if (!zu || !zv) {
      skipped.absent++;
      continue;
    }
    ranked.push({ u, v, score: scoreEdge(zu, zv) });
  }
  ranked.sort((a, b) => b.score - a.score);
  return {
    ranked: Number.isFinite(topK) ? ranked.slice(0, Math.max(0, topK)) : ranked,
    skipped,
  };
}

// Re-export the primitives so a consumer imports one module.
export { linkScore, dot };
