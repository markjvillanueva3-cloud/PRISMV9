#!/usr/bin/env node
/**
 * nn-graph-embedding-degeneracy.mjs — BLACKWELL-AI-MS0 / MS3 (slot:india).
 *
 * Characterizes the GraphSAGE node-embedding quality, motivated by the U-GNN-EDGE-PREDICT-VIZ
 * reviewer finding: edge-prediction scores SATURATE at sigmoid(1.0)=0.7311, i.e. the top-pair
 * cosines hit ~1.0 → suspected near-degenerate (collapsed) embeddings. This diagnostic answers,
 * with numbers on the LIVE embeddings (no GPU, no re-embed): ARE the embeddings collapsed?
 *
 * This is the R13-logical-order PREREQUISITE to path-B (engine→dispatcher inference): if the
 * embeddings are degenerate, a 644MB GPU re-embed with the SAME features is wasted spend — the
 * fix would be sharper features (H2GCN / richer node features), the same lever as the NN/GNN
 * deploy-gate. So this informs the operator's path-B GPU greenlight decision directly.
 *
 * Metrics (over the L2-normalized embeddings, so cosine == dot):
 *   - pairwise cosine distribution: mean / median / p99 / max + fracSaturated (|cos| > SAT_THRESH)
 *   - centroid collapse: ||mean-vector|| (→1 = all vectors point one way = collapsed; →0 = spread)
 *     + mean cosine of each vector to the (normalized) centroid
 *   A high mean-cosine / high centroid-norm / high fracSaturated ⇒ degenerate.
 *
 * Sibling convention: scripts/nn-graph-calibration-analysis.mjs (pure exported analyzers + JSON
 * main + pathToFileURL direct-run guard). R12 fail-loud: main() throws on an unreadable embeddings
 * file (a silent empty report would falsely read as "healthy").
 *
 * INPUT CONTRACT: the pure analyzers (pairwiseCosineStats/centroidCollapse/analyze) assume the
 * vectors are already L2-NORMALIZED + finite — which the live path guarantees via loadEmbeddings →
 * l2normalize (it zeroes any NaN/±Infinity-component vector at load, edge-predict.mjs). They do NOT
 * re-normalize or re-guard; a future caller passing raw/un-normalized vectors would get wrong
 * cosines (>1) or a NaN mean. (Note: meanCosToCentroid is algebraically identical to centroidNorm —
 * ⟨c, c/‖c‖⟩ = ‖c‖ — so it is reported as a cross-check, carrying no signal beyond centroidNorm.)
 *
 * Usage: node scripts/nn-graph-embedding-degeneracy.mjs [--embeddings <jsonl>] [--max-pairs N]
 *
 * @milestone BLACKWELL-AI-MS0/U-GNN-EMBEDDING-DEGENERACY
 * @slot india
 * @date 2026-06-09
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEmbeddings, dot } from "./lib/edge-predict.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || process.cwd();
export const EMB_DEFAULT = path.join(PRISM_ROOT, "state/shared/nn-graph/node-embeddings-768d.jsonl");
export const SAT_THRESH = 0.99; // |cosine| above this ⇒ "saturated" (near-identical) pair
export const DEFAULT_MAX_PAIRS = 2_000_000; // bound the O(n²) pairwise loop; 543 nodes → ~147K, far under

// Degeneracy grading thresholds. Random unit vectors in high dim are near-orthogonal (mean cos ≈ 0,
// centroid norm ≈ 0). Departures upward indicate collapse.
// N-SENSITIVITY: ||centroid|| of N spread unit vectors ≈ 1/√N, so the centroidNorm thresholds are
// calibrated for the live regime (N in the hundreds → baseline ≲ 0.07). For tiny N (< ~25) the
// baseline alone can exceed `centroidNormMild`, so on small inputs lean on meanCosine/fracSaturated,
// which are N-stable. The live use (543 nodes, centroidNorm 0.93 vs baseline ~0.043) is unambiguous.
export const GRADE = Object.freeze({
  meanCosDegenerate: 0.5,
  meanCosMild: 0.2,
  centroidNormDegenerate: 0.7,
  centroidNormMild: 0.4,
  fracSatDegenerate: 0.05,
});

function median(sortedAsc) {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = n >> 1;
  return n % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

/**
 * Pairwise cosine stats over an array of L2-normalized vectors (cosine == dot). Computes ALL
 * unordered pairs unless that exceeds `maxPairs`, in which case it deterministically strides over
 * the pair space (no RNG → reproducible) and reports `sampled:true`. Fail-soft: <2 vectors → zeros.
 * @param {number[][]} vectors @param {{maxPairs?:number}} [opts]
 */
export function pairwiseCosineStats(vectors, opts = {}) {
  const maxPairs = opts.maxPairs ?? DEFAULT_MAX_PAIRS;
  const empty = { pairs: 0, sampled: false, meanCosine: 0, medianCosine: 0, p99Cosine: 0, maxCosine: 0, fracSaturated: 0 };
  if (!Array.isArray(vectors) || vectors.length < 2) return empty;
  const n = vectors.length;
  const totalPairs = (n * (n - 1)) / 2;
  const sampled = totalPairs > maxPairs;
  // Stride so we visit ~maxPairs pairs evenly across the (i<j) space without RNG.
  const stride = sampled ? Math.ceil(totalPairs / maxPairs) : 1;
  const cosines = [];
  let k = 0;
  let sum = 0;
  let max = -Infinity;
  let saturated = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++, k++) {
      if (k % stride !== 0) continue;
      const c = dot(vectors[i], vectors[j]);
      cosines.push(c);
      sum += c;
      if (c > max) max = c;
      if (Math.abs(c) > SAT_THRESH) saturated++;
    }
  }
  if (cosines.length === 0) return empty;
  cosines.sort((a, b) => a - b);
  return {
    pairs: cosines.length,
    sampled,
    meanCosine: sum / cosines.length,
    medianCosine: median(cosines),
    p99Cosine: cosines[Math.min(cosines.length - 1, Math.floor(cosines.length * 0.99))],
    maxCosine: max,
    fracSaturated: saturated / cosines.length,
  };
}

/**
 * Centroid-collapse metric: the L2 norm of the mean vector (for unit inputs, ∈[0,1]; →1 means all
 * vectors point the same way = collapsed) + the mean cosine of each vector to the normalized
 * centroid. A near-zero centroid (no preferred direction) yields meanCosToCentroid 0.
 * @param {number[][]} vectors
 */
export function centroidCollapse(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) return { dim: 0, centroidNorm: 0, meanCosToCentroid: 0 };
  const dim = Array.isArray(vectors[0]) ? vectors[0].length : 0;
  if (dim === 0) return { dim: 0, centroidNorm: 0, meanCosToCentroid: 0 };
  const centroid = new Array(dim).fill(0);
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== dim) continue;
    for (let d = 0; d < dim; d++) centroid[d] += v[d];
  }
  for (let d = 0; d < dim; d++) centroid[d] /= vectors.length;
  let normSq = 0;
  for (let d = 0; d < dim; d++) normSq += centroid[d] * centroid[d];
  const centroidNorm = Math.sqrt(normSq);
  if (!(centroidNorm > 1e-12)) return { dim, centroidNorm: 0, meanCosToCentroid: 0 };
  const unitCentroid = centroid.map((x) => x / centroidNorm);
  let cosSum = 0;
  for (const v of vectors) {
    if (Array.isArray(v) && v.length === dim) cosSum += dot(v, unitCentroid);
  }
  return { dim, centroidNorm, meanCosToCentroid: cosSum / vectors.length };
}

/** Combine the metrics into a verdict + reasons. Pure. */
export function gradeDegeneracy({ meanCosine, centroidNorm, fracSaturated }) {
  const reasons = [];
  let verdict = "healthy";
  if (meanCosine >= GRADE.meanCosDegenerate) { verdict = "degenerate"; reasons.push(`meanCosine ${meanCosine.toFixed(3)} ≥ ${GRADE.meanCosDegenerate}`); }
  else if (meanCosine >= GRADE.meanCosMild && verdict === "healthy") { verdict = "mild"; reasons.push(`meanCosine ${meanCosine.toFixed(3)} ≥ ${GRADE.meanCosMild}`); }
  if (centroidNorm >= GRADE.centroidNormDegenerate) { verdict = "degenerate"; reasons.push(`centroidNorm ${centroidNorm.toFixed(3)} ≥ ${GRADE.centroidNormDegenerate}`); }
  else if (centroidNorm >= GRADE.centroidNormMild && verdict !== "degenerate") { verdict = verdict === "healthy" ? "mild" : verdict; reasons.push(`centroidNorm ${centroidNorm.toFixed(3)} ≥ ${GRADE.centroidNormMild}`); }
  if (fracSaturated >= GRADE.fracSatDegenerate) { verdict = "degenerate"; reasons.push(`fracSaturated ${fracSaturated.toFixed(3)} ≥ ${GRADE.fracSatDegenerate}`); }
  return { verdict, reasons };
}

/** Full analysis over a vectors[] (pure, no I/O) — used by main() and tests. */
export function analyze(vectors, opts = {}) {
  const cos = pairwiseCosineStats(vectors, opts);
  const cen = centroidCollapse(vectors);
  const grade = gradeDegeneracy({ meanCosine: cos.meanCosine, centroidNorm: cen.centroidNorm, fracSaturated: cos.fracSaturated });
  return { count: Array.isArray(vectors) ? vectors.length : 0, cosine: cos, centroid: cen, grade };
}

function parseArgs(argv) {
  const a = { embeddings: EMB_DEFAULT, maxPairs: DEFAULT_MAX_PAIRS };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--embeddings") a.embeddings = argv[++i] || a.embeddings;
    else if (argv[i] === "--max-pairs") { const n = Number.parseInt(argv[++i], 10); if (Number.isFinite(n) && n > 0) a.maxPairs = n; }
  }
  return a;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const { embeddings, count } = loadEmbeddings(a.embeddings); // throws on unreadable file (R12 fail-loud)
  const vectors = [...embeddings.values()];
  const result = analyze(vectors, { maxPairs: a.maxPairs });
  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "scripts/nn-graph-embedding-degeneracy.mjs",
    embeddingsFile: a.embeddings,
    nodes: count,
    ...result,
    interpretation:
      result.grade.verdict === "degenerate"
        ? "Embeddings are COLLAPSED — a re-embed with the SAME features (e.g. path-B) will NOT improve edge-prediction discrimination; needs sharper features (H2GCN / richer node features)."
        : result.grade.verdict === "mild"
          ? "Embeddings show MILD collapse — re-embed gains are limited; consider feature enrichment alongside any path-B re-embed."
          : "Embeddings are well-spread — score saturation (if any) reflects genuine high similarity, and a path-B re-embed over a fuller node set is worthwhile.",
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}

function isDirectRun() {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
}
if (isDirectRun()) main();
