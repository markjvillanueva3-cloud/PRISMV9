#!/usr/bin/env node
/**
 * graphsage-model.mjs — GraphSAGE forward pass + model construction.
 * The model half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
 * training half (backprop + loss + negative sampling) lives in the sibling
 * graphsage-trainer.mjs, and U5's link predictor consumes this forward pass
 * directly with frozen weights.
 *
 * Architecture — 2-layer GraphSAGE (Hamilton, Ying & Leskovec, NeurIPS 2017)
 * with the MEAN aggregator (parameter-free, robust):
 *   h^0_v = x_v                                          (input features)
 *   layer k:  agg   = mean( h^{k-1}_u : u in neighbours(v) )
 *             pre   = W^k . concat( h^{k-1}_v , agg )
 *             act   = ReLU(pre)
 *             h^k_v = act / ||act||                       (L2-normalized)
 *   z_v = h^2_v                                          (the node embedding)
 * Link score for an edge (u,v) is sigmoid(z_u . z_v) — since the z's are
 * L2-normalized, z_u.z_v is their cosine similarity.
 *
 * `forward` returns the embeddings AND an activation cache (per layer: concat
 * / act / normInv / h / degree, plus the in-batch neighbour map and input
 * features) — everything graphsage-trainer.mjs needs for backprop. Pure
 * inference callers pass { buildCache:false } to skip it.
 *
 * SCALE CAVEAT (honest): a full-cache forward over the whole 372k-node graph
 * materializes ~7 GB of activations and will OOM. The trainer and the U4
 * training script mini-batch — sample a batch of edges, induce their K-hop
 * neighbourhood, forward+backward only that subgraph. `forward` itself is
 * node-set-agnostic: it processes exactly the nodes `features` covers and
 * treats any neighbour absent from `features` as outside the batch.
 *
 * Pure + seeded-deterministic (mulberry32 reused from graph-random-walk.mjs).
 * Float64 throughout — backprop accumulates, Float32 would lose gradient
 * signal. Consistent with the U3 scripts/lib/*.mjs + node:test convention.
 */

import { mulberry32 } from "./graph-random-walk.mjs";

export const MODEL_DEFAULTS = Object.freeze({
  hiddenDim: 256, // layer-1 output width
  embedDim: 128,  // layer-2 output width = final embedding dimension
  seed: 1,
});

const NORM_EPS = 1e-12; // below this an activation norm is treated as zero

/** Numerically-stable logistic sigmoid. */
export function sigmoid(x) {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Dot product of two equal-length numeric vectors; 0 on a length mismatch. */
export function dot(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Glorot/Xavier uniform half-range for a (fanIn,fanOut) weight matrix. */
export function glorotLimit(fanIn, fanOut) {
  return Math.sqrt(6 / (fanIn + fanOut));
}

function validateDims(name, v) {
  if (!Number.isInteger(v) || v < 1) {
    throw new RangeError(`graphsage-model: ${name} must be an integer >= 1 (got ${v})`);
  }
}

/**
 * Construct a 2-layer GraphSAGE model. Weights are Glorot-uniform initialized
 * from a seeded PRNG (deterministic). Each layer's W is a flat Float64Array,
 * row-major [outDim x inDim] where inDim is the concat width 2*(layer input).
 * Returns { config, k, layers:[{W,rows,cols}] }; W is mutable in place so the
 * trainer can apply gradient updates and the checkpoint loader can persist it.
 */
export function createModel(opts = {}) {
  const inputDim = opts.inputDim;
  const hiddenDim = opts.hiddenDim ?? MODEL_DEFAULTS.hiddenDim;
  const embedDim = opts.embedDim ?? MODEL_DEFAULTS.embedDim;
  const seed = Number.isFinite(opts.seed) ? opts.seed : MODEL_DEFAULTS.seed;
  validateDims("inputDim", inputDim);
  validateDims("hiddenDim", hiddenDim);
  validateDims("embedDim", embedDim);

  const rng = mulberry32(seed);
  const layerSpec = [
    { rows: hiddenDim, cols: 2 * inputDim },  // layer 1: concat(x, agg) -> hidden
    { rows: embedDim, cols: 2 * hiddenDim },  // layer 2: concat(h1, agg) -> embed
  ];
  const layers = layerSpec.map(({ rows, cols }) => {
    // fanIn = concat width (cols), fanOut = rows.
    const limit = glorotLimit(cols, rows);
    const W = new Float64Array(rows * cols);
    for (let i = 0; i < W.length; i++) W[i] = (rng() * 2 - 1) * limit;
    return { W, rows, cols };
  });
  return { config: { inputDim, hiddenDim, embedDim, seed }, k: 2, layers };
}

/** pre[o] = sum_i W[o*cols+i] * vec[i]  (W row-major [rows x cols]). */
function matVec(W, rows, cols, vec) {
  const out = new Float64Array(rows);
  for (let o = 0; o < rows; o++) {
    const base = o * cols;
    let s = 0;
    for (let i = 0; i < cols; i++) s += W[base + i] * vec[i];
    out[o] = s;
  }
  return out;
}

/**
 * One GraphSAGE layer over every node in `hPrev`.
 * `hPrev` is Map<id, Float64Array> of the previous layer's representations;
 * a neighbour absent from `hPrev` is outside the batch and skipped (its
 * absence shrinks the mean's denominator — see SCALE CAVEAT).
 * Returns { h, concat, act, normInv, degree } maps for the layer.
 */
function forwardLayer(layer, nodeIds, adjacency, hPrev, inDim) {
  const { W, rows, cols } = layer;
  const h = new Map();
  const concatM = new Map();
  const actM = new Map();
  const normInvM = new Map();
  const degreeM = new Map();

  for (const v of nodeIds) {
    const self = hPrev.get(v);
    const nbrs = adjacency.get(v) || [];
    const agg = new Float64Array(inDim);
    let deg = 0;
    for (const u of nbrs) {
      const hu = hPrev.get(u);
      if (!hu) continue; // neighbour outside this batch's node set
      for (let i = 0; i < inDim; i++) agg[i] += hu[i];
      deg++;
    }
    if (deg > 0) {
      for (let i = 0; i < inDim; i++) agg[i] /= deg;
    }
    // concat( self , agg )  -> width 2*inDim == cols
    const concat = new Float64Array(cols);
    for (let i = 0; i < inDim; i++) {
      concat[i] = self[i];
      concat[inDim + i] = agg[i];
    }
    const pre = matVec(W, rows, cols, concat);
    const act = new Float64Array(rows);
    let sq = 0;
    for (let o = 0; o < rows; o++) {
      const a = pre[o] > 0 ? pre[o] : 0; // ReLU
      act[o] = a;
      sq += a * a;
    }
    const norm = Math.sqrt(sq);
    const normInv = norm > NORM_EPS ? 1 / norm : 0;
    const hv = new Float64Array(rows);
    for (let o = 0; o < rows; o++) hv[o] = act[o] * normInv;

    h.set(v, hv);
    concatM.set(v, concat);
    actM.set(v, act);
    normInvM.set(v, normInv);
    degreeM.set(v, deg);
  }
  return { h, concat: concatM, act: actM, normInv: normInvM, degree: degreeM };
}

/**
 * GraphSAGE forward pass. Returns { embeddings, cache }.
 *   - model: from createModel.
 *   - adjacency: Map<id, id[]> neighbour lists (e.g. buildAdjacency(...).adj).
 *   - features: Map<id, number[]|Float64Array> input vectors, each length
 *     model.config.inputDim. The node SET processed is exactly features.keys().
 *   - opts.buildCache (default true): when false, cache is null (inference).
 *
 * embeddings: Map<id, Float64Array(embedDim)>, L2-normalized (a node whose
 * layer-2 activation is all-zero gets an all-zero embedding — honest, not NaN).
 * cache (training): { inputFeatures, nodeIds, neighbors, layers:[{concat,act,
 * normInv,h,degree}, ...] }. `neighbors` is the in-batch-filtered adjacency
 * (Map<id,id[]>) — the trainer reads it to distribute the neighbour-mean
 * gradient with the exact denominator the forward pass used. `inputFeatures`
 * holds private copies, so a later mutation of the caller's vectors cannot
 * corrupt the cache.
 */
export function forward(model, adjacency, features, opts = {}) {
  if (!model || !Array.isArray(model.layers) || model.layers.length !== 2) {
    throw new TypeError("graphsage-model: forward expects a 2-layer model from createModel");
  }
  const buildCache = opts.buildCache !== false;
  const adj = adjacency instanceof Map ? adjacency : new Map();
  const feat = features instanceof Map ? features : new Map();
  const inputDim = model.config.inputDim;

  // Layer-0 representation = input features. Each vector is copied into a
  // fresh Float64Array: this normalizes the element type AND decouples the
  // activation cache from any later mutation of the caller's source arrays
  // (the cache would otherwise hold live references, silently corrupting the
  // layer-1 gradient). Non-finite entries are rejected loudly — a single NaN
  // feature would poison every downstream activation and gradient (R12).
  const h0 = new Map();
  const nodeIds = [];
  for (const [id, x] of feat) {
    if (!x || x.length !== inputDim) {
      throw new RangeError(
        `graphsage-model: feature for node ${id} must have length ${inputDim} (got ${x ? x.length : "none"})`
      );
    }
    const copy = new Float64Array(inputDim);
    for (let i = 0; i < inputDim; i++) {
      const xi = x[i];
      if (!Number.isFinite(xi)) {
        throw new RangeError(
          `graphsage-model: feature for node ${id} has a non-finite value at index ${i} (got ${xi})`
        );
      }
      copy[i] = xi;
    }
    h0.set(id, copy);
    nodeIds.push(id);
  }

  // Restrict adjacency to in-batch neighbours ONCE. Both layers aggregate the
  // identical in-batch set (layer 2's hPrev keys == nodeIds == layer 1's), so
  // one filtered map serves both — and it is cached so the trainer distributes
  // the neighbour-mean gradient over the exact set the forward pass meaned,
  // never re-deriving (a fresh unfiltered list paired with the cached degree
  // would divide by the wrong denominator).
  const batchAdj = new Map();
  for (const v of nodeIds) {
    const nbrs = adj.get(v) || [];
    const inBatch = [];
    for (const u of nbrs) if (h0.has(u)) inBatch.push(u);
    batchAdj.set(v, inBatch);
  }

  const l1 = forwardLayer(model.layers[0], nodeIds, batchAdj, h0, inputDim);
  const l2 = forwardLayer(model.layers[1], nodeIds, batchAdj, l1.h, model.config.hiddenDim);

  const cache = buildCache
    ? {
        inputFeatures: h0,
        nodeIds,
        neighbors: batchAdj,
        layers: [
          { concat: l1.concat, act: l1.act, normInv: l1.normInv, h: l1.h, degree: l1.degree },
          { concat: l2.concat, act: l2.act, normInv: l2.normInv, h: l2.h, degree: l2.degree },
        ],
      }
    : null;

  return { embeddings: l2.h, cache };
}

/**
 * Link-prediction score for an edge between two node embeddings:
 * sigmoid(z_u . z_v). With L2-normalized embeddings the dot product is the
 * cosine similarity, so the score is sigmoid(cosine) in (sigmoid(-1),
 * sigmoid(1)) for unit vectors, wider if either embedding is degenerate-zero.
 */
export function linkScore(embA, embB) {
  return sigmoid(dot(embA, embB));
}

export { MODEL_DEFAULTS as DEFAULTS };
