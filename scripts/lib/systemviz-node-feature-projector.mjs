#!/usr/bin/env node
/**
 * systemviz-node-feature-projector.mjs — projects a PRISM system-viz graph
 * node into a fixed 8-dimensional numeric feature vector. Unit U3c of
 * NN-GRAPH-MS0 (U-NNG-NODE2VEC-TOPOLOGY).
 *
 * Where this fits: U3a generates biased random walks, U3b learns a *topology*
 * embedding from those walks (structural identity). U3c is the complement —
 * a node's *intrinsic* attributes. GraphSAGE (U4) combines a node's own
 * features with aggregated neighbour features; this projector produces those
 * per-node input features. Topology (U3b) answers "where does this node sit
 * in the graph"; features (U3c) answer "what kind of node is it".
 *
 * The 8 features (FEATURE_NAMES, in output order), all squashed to [0,1]:
 *   0 layer        — architectural band (L0..L13, Lgit) as a normalized ordinal
 *   1 tier         — build tier 0..5, normalized
 *   2 svi          — awareness.svi (system verification index, already 0..1)
 *   3 coverage     — awareness.coverage (test coverage, already 0..1)
 *   4 complexity   — awareness.complexity, log1p-compressed + percentile-scaled
 *   5 actionCount  — awareness.actionCount, log1p-compressed + percentile-scaled
 *   6 status       — built→1 · unwired/needs-wiring→0.5 · ghost/planned/stub→0
 *   7 roi          — businessValue.roi: high→1 · medium→0.5 · low/unknown→0
 *
 * Normalization is fit/transform (sklearn-style): `computeFeatureStats(graph)`
 * does ONE pass to find the P99 of the heavy-tailed fields (complexity,
 * actionCount); `projectNodeFeatures(node, stats)` is then pure per node. A
 * caller may fit on a training graph and transform another graph by passing
 * `opts.stats` — keeps train/test normalization consistent. P99 (not max)
 * resists a single outlier squashing every other node toward zero.
 *
 * Missing-field policy (deliberate, fail-soft — a GNN tolerates neutral
 * features): any absent field projects to 0, NOT to its canonical default —
 * e.g. a node lacking `awareness` gets svi 0, not the live graph's usual
 * 0.875. So a degraded input graph stays *observable*, `computeFeatureStats`
 * reports `missingAwareness` / `missingBusinessValue` node counts in its
 * stats — U4 / callers should check these before trusting the projection.
 *
 * Node schema (sampled from state/shared/system-viz/system-graph-normalized.json,
 * schemaVersion 2.29.0): { id, layer, subgroup, label, info, status, size,
 * tier, awareness:{svi,testCount,complexity,coverage,actionCount,registryEntries},
 * businessValue:{tags,roi,rationale} }. Every field is treated as optional —
 * a missing field projects to a neutral 0, never throws.
 *
 * Pure + deterministic. Consistent with the U1/U2/U3a/U3b scripts/lib/*.mjs
 * + node:test convention.
 */

export const FEATURE_DIM = 8;

/** Feature vector layout — index === position in the Float32Array. */
export const FEATURE_NAMES = Object.freeze([
  "layer", "tier", "svi", "coverage", "complexity", "actionCount", "status", "roi",
]);

/** Canonical layer ordering; the projector normalizes a node's layer by its index here. */
export const LAYER_ORDER = Object.freeze([
  "L0", "L1", "L2", "L3", "L4", "L4a", "L5", "L6", "L7", "L8",
  "L9", "L10", "L11", "L12", "L13", "Lgit",
]);

const TIER_MAX = 5;                 // system-viz tiers run 0..5
const DEFAULT_PERCENTILE = 0.99;    // robust scale point for heavy-tailed fields
const LAYER_MAX_INDEX = LAYER_ORDER.length - 1;

/** Stats used when a graph is empty / unusable — every scale is a safe 1. */
const DEFAULT_STATS = Object.freeze({
  complexityScale: 1, actionCountScale: 1, percentile: DEFAULT_PERCENTILE,
  nodeCount: 0, missingAwareness: 0, missingBusinessValue: 0,
});

/** Clamp to [0,1]; NaN and non-numbers fall through the `x > 0` test to 0. */
function clamp01(x) {
  return x > 0 ? (x < 1 ? x : 1) : 0;
}

/** Coerce to a finite number, else 0. */
function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map a layer string to a normalized ordinal in [0,1]. Exact match against
 * LAYER_ORDER wins; an unrecognized `L<digits>` form falls back to its parsed
 * number (clamped); anything else → 0.
 */
export function parseLayerOrdinal(layer) {
  if (typeof layer !== "string" || layer.length === 0) return 0;
  const idx = LAYER_ORDER.indexOf(layer);
  if (idx >= 0) return idx / LAYER_MAX_INDEX;
  const m = layer.match(/^L(\d+)/i);
  if (m) {
    const n = Math.min(LAYER_MAX_INDEX, Math.max(0, parseInt(m[1], 10)));
    return n / LAYER_MAX_INDEX;
  }
  return 0;
}

/** Wiring state → scalar: built/wired→1 · unwired/needs-wiring→0.5 · else→0. */
export function statusScore(status) {
  const s = String(status || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (s === "built" || s === "wired") return 1;
  if (s === "unwired" || s === "needswiring" || s === "needswire") return 0.5;
  return 0;
}

/** Business ROI → scalar: high→1 · medium→0.5 · low/unknown→0. */
export function roiScore(roi) {
  const r = String(roi || "").toLowerCase();
  if (r === "high") return 1;
  if (r === "medium" || r === "med") return 0.5;
  return 0;
}

/**
 * Nearest-rank percentile of a numeric array (ascending sort, no interpolation).
 * Empty array → 0.
 */
function percentileValue(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil(p * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

/** log1p of a field's P99 — the divisor that maps a P99-magnitude node to ~1.0. */
function log1pPercentileScale(values, p) {
  const pv = percentileValue(values, p);
  const scale = Math.log1p(Math.max(0, pv));
  return scale > 0 ? scale : 1; // all-zero field → divide by 1 (every node → 0)
}

/**
 * Fit pass: derive normalization stats for the heavy-tailed fields from a
 * graph. Pure — same graph in, same stats out. `opts.percentile` overrides
 * the default 0.99; an explicitly-provided percentile outside (0,1] is a
 * caller error and throws RangeError (sibling-consistent strictness) —
 * omitting it entirely is fine and falls back to the default.
 * Also reports `missingAwareness` / `missingBusinessValue` diagnostic counts.
 */
export function computeFeatureStats(graph, opts = {}) {
  let percentile = DEFAULT_PERCENTILE;
  if (opts.percentile !== undefined) {
    const p = Number(opts.percentile);
    if (!Number.isFinite(p) || p <= 0 || p > 1) {
      throw new RangeError(
        `systemviz-node-feature-projector: percentile must be in (0,1] (got ${opts.percentile})`);
    }
    percentile = p;
  }
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const complexities = [];
  const actionCounts = [];
  let missingAwareness = 0;
  let missingBusinessValue = 0;
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const hasAwareness = n.awareness && typeof n.awareness === "object";
    if (!hasAwareness) missingAwareness++;
    if (!(n.businessValue && typeof n.businessValue === "object")) missingBusinessValue++;
    const a = hasAwareness ? n.awareness : {};
    complexities.push(Math.max(0, safeNum(a.complexity)));
    actionCounts.push(Math.max(0, safeNum(a.actionCount)));
  }
  return {
    complexityScale: log1pPercentileScale(complexities, percentile),
    actionCountScale: log1pPercentileScale(actionCounts, percentile),
    percentile,
    nodeCount: nodes.length,
    missingAwareness,
    missingBusinessValue,
  };
}

/**
 * Project ONE node to its 8-d Float32Array feature vector. Pure. `stats` is
 * the output of computeFeatureStats; if omitted, DEFAULT_STATS is used (raw
 * log1p with no percentile scaling — fine for a single node, but for a graph
 * always pass fitted stats). A null / non-object node → an all-zero vector.
 */
export function projectNodeFeatures(node, stats = DEFAULT_STATS) {
  const f = new Float32Array(FEATURE_DIM);
  if (!node || typeof node !== "object") return f;
  const s = stats && typeof stats === "object" ? stats : DEFAULT_STATS;
  const a = node.awareness && typeof node.awareness === "object" ? node.awareness : {};
  const bv = node.businessValue && typeof node.businessValue === "object" ? node.businessValue : {};
  const cScale = s.complexityScale > 0 ? s.complexityScale : 1;
  const aScale = s.actionCountScale > 0 ? s.actionCountScale : 1;

  f[0] = parseLayerOrdinal(node.layer);
  f[1] = clamp01(safeNum(node.tier) / TIER_MAX);
  f[2] = clamp01(safeNum(a.svi));
  f[3] = clamp01(safeNum(a.coverage));
  f[4] = clamp01(Math.log1p(Math.max(0, safeNum(a.complexity))) / cScale);
  f[5] = clamp01(Math.log1p(Math.max(0, safeNum(a.actionCount))) / aScale);
  f[6] = statusScore(node.status);
  f[7] = roiScore(bv.roi);
  return f;
}

/**
 * Fit + transform a whole graph. Returns
 * { features: Map<id, Float32Array>, stats, dim, nodeCount }.
 * Pass `opts.stats` to reuse normalization fitted elsewhere (train/test split);
 * pass `opts.percentile` to tune the fit. Nodes without an `id` are skipped;
 * a duplicate id keeps the last node (Map semantics).
 */
export function projectGraphFeatures(graph, opts = {}) {
  if (!graph || typeof graph !== "object") {
    return { features: new Map(), stats: DEFAULT_STATS, dim: FEATURE_DIM, nodeCount: 0 };
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const stats = opts.stats && typeof opts.stats === "object"
    ? opts.stats
    : computeFeatureStats(graph, opts);
  const features = new Map();
  for (const n of nodes) {
    if (!n || typeof n !== "object" || n.id == null) continue;
    features.set(String(n.id), projectNodeFeatures(n, stats));
  }
  return { features, stats, dim: FEATURE_DIM, nodeCount: features.size };
}

export { FEATURE_DIM as DIM, DEFAULT_PERCENTILE };
