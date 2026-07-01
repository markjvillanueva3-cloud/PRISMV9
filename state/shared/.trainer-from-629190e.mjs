#!/usr/bin/env node
/**
 * graphsage-trainer.mjs — link-prediction training for the GraphSAGE model.
 * The training half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
 * forward half is graphsage-model.mjs.
 *
 * Objective — supervised link prediction. A positive sample is a real edge,
 * a negative sample a sampled non-edge. The score for a pair (u,v) is
 * sigmoid(z_u . z_v) and the loss is binary cross-entropy. Training pulls
 * the embeddings of linked nodes together and pushes unlinked ones apart.
 *
 * Backprop — hand-written reverse-mode through the 2-layer model, using the
 * activation cache graphsage-model.forward() returns. Gradient chain:
 *   dL/dz       = (s - label)/N . (the other node's z)   [BCE+sigmoid+dot]
 *   dL/dact     = normInv . (dz - z.(dz.z))               [L2-norm jacobian]
 *   dL/dpre     = dL/dact masked by (act>0) at a ReLU layer; dL/dact passes
 *                through unmasked at the linear output layer
 *   dL/dW       += dpre (outer) concat                    [the layer's W grad]
 *   dL/dconcat  = Wᵀ . dpre  -> split [self ‖ agg]
 *   the agg half flows to each in-batch neighbour's dH by 1/degree
 * Layer-1 input features are frozen (not trained), so dL/dconcat1's feature
 * half is discarded. Correctness is pinned by a numerical gradient check in
 * the test suite — the load-bearing R9 test for any hand-written backprop.
 *
 * Pure where it can be: computeLossAndGradients never mutates the model;
 * `train` mutates model.layers[].W in place (SGD) and is seed-deterministic
 * (mulberry32). For the 372k-node graph the U4 training SCRIPT mini-batches
 * (sample edges, induce the 2-hop neighbourhood); this lib forwards whatever
 * node set it is given — small graphs whole, large graphs per batch.
 *
 * Consistent with the U3/U4 scripts/lib/*.mjs + node:test convention.
 */

import { mulberry32 } from "./graph-random-walk.mjs";
import { forward, sigmoid, dot } from "./graphsage-model.mjs";

export const TRAIN_DEFAULTS = Object.freeze({
  epochs: 50,
  batchSize: 16,        // positive edges sampled per step
  negRatio: 1,          // negative samples drawn per positive
  learningRate: 0.05,
  minLearningRate: 0.001,
  seed: 1,
});

const NEG_SAMPLE_ATTEMPT_FACTOR = 40; // rejection-sampling attempt budget multiplier
const EDGE_KEY_SEP = String.fromCharCode(0);        // NUL — cannot occur in a node id, so no key collision
const BCE_EPS = 1e-12;                // bceLoss score clamp — keeps log() finite for an exact 0/1

/** Undirected edge key — (a,b) and (b,a) collapse to one string. */
function edgeKey(a, b) {
  return a < b ? a + EDGE_KEY_SEP + b : b + EDGE_KEY_SEP + a;
}

/**
 * Binary cross-entropy of one (score, label) pair. The score is clamped to
 * [BCE_EPS, 1-BCE_EPS] before the logs, so an exactly-0 or -1 score from an
 * external caller yields a large-but-finite loss instead of Infinity. (The
 * trainer's own loss is computed inline in computeLossAndGradients on
 * L2-normalized embeddings — its score is always in ~(0.27,0.73) and never
 * needs the clamp, so the numerical gradient check stays exact.)
 */
export function bceLoss(score, label) {
  let s = Number(score);
  if (s < BCE_EPS) s = BCE_EPS;
  else if (s > 1 - BCE_EPS) s = 1 - BCE_EPS;
  const y = Number(label);
  return -(y * Math.log(s) + (1 - y) * Math.log(1 - s));
}

/**
 * ROC AUC via the rank-based (Mann-Whitney U) formula with average-rank tie
 * handling. AUC is P(score of a random positive > score of a random negative).
 * Returns NaN when one class is absent (AUC is then undefined).
 */
export function rocAuc(scores, labels) {
  if (!Array.isArray(scores) || !Array.isArray(labels) || scores.length !== labels.length) {
    throw new RangeError("graphsage-trainer: rocAuc needs equal-length scores and labels");
  }
  const n = scores.length;
  if (n === 0) return NaN;
  const order = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);

  // Average ranks (1-based), resolving ties to their mean rank.
  const rank = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && scores[order[j + 1]] === scores[order[i]]) j++;
    const avg = (i + j) / 2 + 1; // mean of 1-based ranks i+1..j+1
    for (let k = i; k <= j; k++) rank[order[k]] = avg;
    i = j + 1;
  }

  let nPos = 0;
  let sumRankPos = 0;
  for (let k = 0; k < n; k++) {
    if (labels[k] > 0.5) { nPos++; sumRankPos += rank[k]; }
  }
  const nNeg = n - nPos;
  if (nPos === 0 || nNeg === 0) return NaN;
  return (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/**
 * Draw `count` negative edges — pairs (u,v), u != v, not present in `edgeSet`
 * (which holds undirected edgeKey strings). Rejection sampling with a bounded
 * attempt budget; on a near-complete graph it returns fewer than `count`
 * rather than looping forever. Deterministic given `rng`.
 */
export function sampleNegativeEdges(nodeIds, edgeSet, count, rng) {
  const out = [];
  const n = Array.isArray(nodeIds) ? nodeIds.length : 0;
  if (n < 2 || count <= 0) return out;
  const seen = new Set();
  const maxAttempts = count * NEG_SAMPLE_ATTEMPT_FACTOR;
  let attempts = 0;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const a = nodeIds[Math.floor(rng() * n)];
    const b = nodeIds[Math.floor(rng() * n)];
    if (a === b) continue;
    const key = edgeKey(a, b);
    if (edgeSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ u: a, v: b });
  }
  return out;
}

/**
 * U-NN-TRAINER-EXPORT-FIX: per-type positive-edge marginal.
 *
 * Counts how many positive-edge ENDPOINTS belong to each node type. Each
 * undirected edge contributes 2 endpoints; an endpoint with no type in
 * `nodeType` is skipped. The returned `Map<type, count>` is the sampling
 * weight the stratified negative sampler uses — drawing negatives whose
 * type distribution matches the positives keeps the train/eval contract
 * honest (otherwise AUROC reads a distribution the model never trained on).
 *
 * Raw counts, not normalized — `sampleStratifiedNegativeEdges` normalizes
 * via its running `totalAny`/`totalHard` sums, so a count map is sufficient
 * and avoids a divide that could introduce float drift.
 *
 * PURE. Consumes no rng. `trainEdges` may be `[[u,v],...]` or `[{u,v},...]`
 * (both shapes occur across callers — the trainer's internal `edges` are
 * `[u,v]` arrays, the pipeline passes the same). A non-array `trainEdges`
 * or non-Map `nodeType` yields an empty Map (fail-soft, R12 — the caller's
 * `marginal.size > 0` guard then routes to the uniform sampler).
 *
 * @param {Array<[*,*]|{u:*,v:*}>} trainEdges positive (training) edges
 * @param {Map<*,*>} nodeType per-node stratum label
 * @returns {Map<*, number>} per-type endpoint count
 */
export function positiveTypeMarginal(trainEdges, nodeType) {
  const marginal = new Map();
  if (!Array.isArray(trainEdges) || !(nodeType instanceof Map)) return marginal;
  for (const e of trainEdges) {
    let a;
    let b;
    if (Array.isArray(e)) {
      if (e.length < 2) continue;
      a = e[0];
      b = e[1];
    } else if (e && typeof e === "object") {
      a = e.u;
      b = e.v;
    } else {
      continue;
    }
    for (const endpoint of [a, b]) {
      const t = nodeType.get(endpoint);
      if (t === undefined || t === null) continue;
      marginal.set(t, (marginal.get(t) || 0) + 1);
    }
  }
  return marginal;
}

/**
 * U-NN-TRAINER-EXPORT-FIX: stratified negative-edge sampler.
 *
 * Draws `count` negative (non-)edges whose type distribution matches the
 * positive marginal. With probability `pHard` a negative is drawn INTRA-type
 * (both endpoints same stratum — the "hard" negatives a uniform sampler
 * almost never produces); otherwise both endpoints are drawn from the
 * marginal-weighted bucket set independently. Mirrors the eval-side
 * `sampleStratifiedEvalNegatives` in graphsage-train-pipeline.mjs so the
 * train + eval negative distributions are identical — the property that
 * makes the held-out AUROC measure what it claims.
 *
 * STRICTLY SAFE — drop-in for `sampleNegativeEdges`:
 *   - No usable type info (null/empty `nodeType` or `typeMarginal`) → returns
 *     `sampleNegativeEdges(...)` byte-for-byte (same rng draws, same result).
 *     This is the legacy path: a caller that omits `opts.nodeType` is
 *     completely unaffected.
 *   - Bounded rejection sampling (`NEG_SAMPLE_ATTEMPT_FACTOR` budget) — never
 *     loops forever; a saturated same-type bucket returns fewer than `count`
 *     rather than substituting a real edge (honest, R12).
 *   - Rejects any pair already in `edgeSet` (real edges) — keys via the
 *     trainer's own NUL-separated `edgeKey`, identical to `sampleNegativeEdges`.
 *
 * Returns `[{u,v},...]` — the same shape `sampleNegativeEdges` returns, so
 * `train()` can swap one for the other with no downstream change.
 *
 * @param {Array<*>} nodeIds candidate node ids
 * @param {Set<string>} edgeSet real edges (NUL-keyed) to reject
 * @param {number} count desired negative count
 * @param {() => number} rng mulberry32-style PRNG in [0,1)
 * @param {object} [opts]
 * @param {Map<*,*>} [opts.nodeType] per-node stratum label
 * @param {Map<*,number>} [opts.typeMarginal] per-type weight (positive marginal)
 * @param {number} [opts.pHard] fraction drawn intra-type, clamped to [0,1]
 * @returns {Array<{u:*,v:*}>}
 */
export function sampleStratifiedNegativeEdges(nodeIds, edgeSet, count, rng, opts = {}) {
  const ids = Array.isArray(nodeIds) ? nodeIds : [];
  const nodeType = opts && opts.nodeType instanceof Map && opts.nodeType.size > 0
    ? opts.nodeType : null;
  const marginal = opts && opts.typeMarginal instanceof Map && opts.typeMarginal.size > 0
    ? opts.typeMarginal : null;
  // No usable type info -> behave EXACTLY like the uniform sampler (legacy path).
  if (!nodeType || !marginal) return sampleNegativeEdges(ids, edgeSet, count, rng);

  const pHard = opts && typeof opts.pHard === "number" && Number.isFinite(opts.pHard)
    ? Math.min(Math.max(opts.pHard, 0), 1)
    : 0.7;

  // Bucket candidate ids by type.
  const buckets = new Map();
  for (const id of ids) {
    const t = nodeType.get(id);
    if (t === undefined) continue;
    let arr = buckets.get(t);
    if (!arr) { arr = []; buckets.set(t, arr); }
    arr.push(id);
  }
  if (buckets.size === 0) return sampleNegativeEdges(ids, edgeSet, count, rng);

  // Weighted bucket list — marginal-mass weights. `canHard` flags buckets
  // with >= 2 ids (an intra-type pair needs two distinct candidates).
  const weighted = [];
  let totalAny = 0;
  let totalHard = 0;
  for (const [t, arr] of buckets) {
    const mw = marginal.get(t);
    const w = Number.isFinite(mw) && mw > 0 ? mw : 0;
    if (w <= 0) continue;
    const canHard = arr.length >= 2;
    weighted.push({ t, arr, w, canHard });
    totalAny += w;
    if (canHard) totalHard += w;
  }
  if (totalAny === 0) return sampleNegativeEdges(ids, edgeSet, count, rng);

  const pickBucket = (total, hardOnly) => {
    let r = rng() * total;
    let last = null;
    for (const e of weighted) {
      if (hardOnly && !e.canHard) continue;
      last = e;
      r -= e.w;
      if (r <= 0) return e;
    }
    return last;
  };

  const out = [];
  const seen = new Set();
  const want = Math.max(0, Math.floor(count));
  const maxAttempts = want * NEG_SAMPLE_ATTEMPT_FACTOR + 100;
  let attempts = 0;
  while (out.length < want && attempts < maxAttempts) {
    attempts++;
    let a;
    let b;
    if (totalHard > 0 && rng() < pHard) {
      const e = pickBucket(totalHard, true);
      if (!e) continue;
      a = e.arr[Math.floor(rng() * e.arr.length)];
      b = e.arr[Math.floor(rng() * e.arr.length)];
    } else {
      const ea = pickBucket(totalAny, false);
      const eb = pickBucket(totalAny, false);
      if (!ea || !eb) continue;
      a = ea.arr[Math.floor(rng() * ea.arr.length)];
      b = eb.arr[Math.floor(rng() * eb.arr.length)];
    }
    if (a === b) continue;
    const key = edgeKey(a, b);
    if (edgeSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ u: a, v: b });
  }
  return out;
}

function validateTrainOpts(opt) {
  for (const [name, v] of [["epochs", opt.epochs], ["batchSize", opt.batchSize]]) {
    if (!Number.isInteger(v) || v < 1) {
      throw new RangeError(`graphsage-trainer: ${name} must be an integer >= 1 (got ${v})`);
    }
  }
  if (typeof opt.negRatio !== "number" || !Number.isFinite(opt.negRatio) || opt.negRatio < 0) {
    throw new RangeError(`graphsage-trainer: negRatio must be a finite number >= 0 (got ${opt.negRatio})`);
  }
  if (typeof opt.learningRate !== "number" || !Number.isFinite(opt.learningRate) || opt.learningRate <= 0) {
    throw new RangeError(`graphsage-trainer: learningRate must be a finite number > 0 (got ${opt.learningRate})`);
  }
  if (typeof opt.minLearningRate !== "number" || !Number.isFinite(opt.minLearningRate) ||
      opt.minLearningRate < 0 || opt.minLearningRate > opt.learningRate) {
    throw new RangeError(
      `graphsage-trainer: minLearningRate must be in [0, learningRate] (got ${opt.minLearningRate})`);
  }
}

/**
 * L2-normalization backward: given upstream gradient `dz` and the layer's
 * normalized output `z`, returns dL/dact. dAct = normInv*(dz - z*(dz.z)).
 */
function l2NormBackward(dz, z, normInv, dim) {
  let dzz = 0;
  for (let i = 0; i < dim; i++) dzz += dz[i] * z[i];
  const dAct = new Float64Array(dim);
  for (let i = 0; i < dim; i++) dAct[i] = normInv * (dz[i] - z[i] * dzz);
  return dAct;
}

/**
 * Compute the mean BCE loss and the analytic gradients dW1 / dW2 for a batch
 * of labeled `pairs` ([{u,v,label}]). PURE — does not mutate `model`. The
 * forward pass + activation cache are built internally.
 * Returns { loss, gradW1, gradW2, scores }.
 */
export function computeLossAndGradients(model, adjacency, features, pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new RangeError("graphsage-trainer: computeLossAndGradients needs a non-empty pairs array");
  }
  const { embeddings, cache } = forward(model, adjacency, features, { buildCache: true });
  const W1 = model.layers[0];
  const W2 = model.layers[1];
  const { hiddenDim, embedDim } = model.config;
  const N = pairs.length;

  // --- forward loss + upstream gradient dZ per node ---
  const dZ = new Map();
  const ensure = (map, id, dim) => {
    let g = map.get(id);
    if (!g) { g = new Float64Array(dim); map.set(id, g); }
    return g;
  };
  let loss = 0;
  const scores = [];
  for (const pair of pairs) {
    const zu = embeddings.get(pair.u);
    const zv = embeddings.get(pair.v);
    if (!zu || !zv) {
      throw new RangeError(
        `graphsage-trainer: pair node not in the feature set (${pair.u}, ${pair.v})`);
    }
    const label = pair.label > 0.5 ? 1 : 0;
    const s = sigmoid(dot(zu, zv));
    scores.push(s);
    // Embeddings are L2-normalized so dot in [-1,1] and s in (0.27,0.73) —
    // log(s) / log(1-s) are always finite, no clamp needed.
    loss += -(label * Math.log(s) + (1 - label) * Math.log(1 - s));
    // BCE+sigmoid: dL/d(dot) = s - label; /N folds in the mean.
    const gDot = (s - label) / N;
    const gu = ensure(dZ, pair.u, embedDim);
    const gv = ensure(dZ, pair.v, embedDim);
    for (let i = 0; i < embedDim; i++) {
      gu[i] += gDot * zv[i];
      gv[i] += gDot * zu[i];
    }
  }
  loss /= N;

  // --- layer-2 backward: dZ -> gradW2, dH1 ---
  const gradW2 = new Float64Array(W2.W.length);
  const dH1 = new Map();
  const L2 = cache.layers[1];
  const cols2 = W2.cols; // 2 * hiddenDim
  for (const [id, dz] of dZ) {
    const act = L2.act.get(id);
    const normInv = L2.normInv.get(id);
    const z = L2.h.get(id);
    const concat = L2.concat.get(id);
    const dAct = l2NormBackward(dz, z, normInv, embedDim);
    // ReLU mask on a hidden layer; the linear output layer passes dAct through.
    const relu2 = W2.activation === "relu";
    const dPre = new Float64Array(embedDim);
    for (let o = 0; o < embedDim; o++) dPre[o] = relu2 && act[o] <= 0 ? 0 : dAct[o];
    const dConcat = new Float64Array(cols2);
    for (let o = 0; o < embedDim; o++) {
      const dpo = dPre[o];
      if (dpo === 0) continue;
      const base = o * cols2;
      for (let i = 0; i < cols2; i++) {
        gradW2[base + i] += dpo * concat[i];
        dConcat[i] += dpo * W2.W[base + i];
      }
    }
    // concat2 = [h1_self ‖ agg2]; self half -> dH1[id], agg half -> neighbours.
    const dSelf = ensure(dH1, id, hiddenDim);
    for (let i = 0; i < hiddenDim; i++) dSelf[i] += dConcat[i];
    const nbrs = cache.neighbors.get(id) || [];
    if (nbrs.length > 0) {
      const inv = 1 / nbrs.length;
      for (const u of nbrs) {
        const dNbr = ensure(dH1, u, hiddenDim);
        for (let i = 0; i < hiddenDim; i++) dNbr[i] += inv * dConcat[hiddenDim + i];
      }
    }
  }

  // --- layer-1 backward: dH1 -> gradW1 (input features are frozen) ---
  const gradW1 = new Float64Array(W1.W.length);
  const L1 = cache.layers[0];
  const cols1 = W1.cols; // 2 * inputDim
  for (const [id, dh1] of dH1) {
    const act = L1.act.get(id);
    const normInv = L1.normInv.get(id);
    const h = L1.h.get(id);
    const concat = L1.concat.get(id);
    const dAct = l2NormBackward(dh1, h, normInv, hiddenDim);
    // ReLU mask on a hidden layer; a linear layer passes dAct through.
    const relu1 = W1.activation === "relu";
    const dPre = new Float64Array(hiddenDim);
    for (let o = 0; o < hiddenDim; o++) dPre[o] = relu1 && act[o] <= 0 ? 0 : dAct[o];
    for (let o = 0; o < hiddenDim; o++) {
      const dpo = dPre[o];
      if (dpo === 0) continue;
      const base = o * cols1;
      for (let i = 0; i < cols1; i++) gradW1[base + i] += dpo * concat[i];
    }
  }

  return { loss, gradW1, gradW2, scores };
}

/** SGD update: W -= lr * grad, in place. */
function applyGradient(W, grad, lr) {
  for (let i = 0; i < W.length; i++) W[i] -= lr * grad[i];
}

/**
 * Train the model in place by SGD link prediction. Each epoch samples
 * `batchSize` positive edges + round(batchSize*negRatio) negative non-edges,
 * computes the gradient and applies it with a linearly-decayed learning rate.
 * Seed-deterministic. Returns { lossHistory, finalLoss, epochs, trained }.
 * A graph with no usable edges returns trained:false (link prediction is
 * undefined without edges) rather than throwing.
 *
 * options.excludeEdges — optional iterable of [u,v] pairs whose canonical
 * edgeKey is added to the negative-sampling rejection set BEFORE epoch 1.
 * The caller passes additional real edges (typically held-out test edges
 * or any edges absent from `adjacency` but still real in the full graph)
 * so the trainer never neg-samples them. Backward compatible — omit and the
 * trainer behaves exactly as before. Pairs with a missing/equal endpoint
 * are skipped silently; non-iterable values are ignored.
 *
 * options.nodeType — optional `Map<id, type>` enabling stratified negative
 * sampling (U-NN-TRAINER-EXPORT-FIX). When supplied AND non-empty, the
 * trainer derives the positive type marginal from its OWN training edges
 * and draws negatives type-matched (see `sampleStratifiedNegativeEdges`).
 * options.negPHard — fraction of negatives drawn intra-type, clamped [0,1],
 * default 0.7; ignored when `nodeType` is absent. CRITICAL: omitting
 * `nodeType` (or passing an empty Map / `undefined`) keeps the legacy
 * uniform sampler with a BYTE-IDENTICAL rng sequence — every pre-existing
 * caller is unaffected.
 */
export function train(model, adjacency, features, options = {}) {
  const opt = { ...TRAIN_DEFAULTS, ...options };
  validateTrainOpts(opt);
  const adj = adjacency instanceof Map ? adjacency : new Map();
  const feat = features instanceof Map ? features : new Map();

  // Collect undirected positive edges whose BOTH endpoints are in the batch.
  const edges = [];
  const edgeSet = new Set();
  for (const [v, nbrs] of adj) {
    if (!feat.has(v) || !Array.isArray(nbrs)) continue;
    for (const u of nbrs) {
      if (u === v || !feat.has(u)) continue;
      const key = edgeKey(v, u);
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([v, u]);
    }
  }
  if (edges.length === 0) {
    return { lossHistory: [], finalLoss: NaN, epochs: 0, trained: false };
  }

  // Optional rejection-set augment: real edges the caller knows about but
  // that aren't in `adj` (e.g. held-out test edges from a leakage-safe split).
  // Adds to edgeSet only — never adds to `edges` (these are NOT trained on).
  // Iterates safely: non-iterable -> ignored; malformed entry -> skipped.
  const exclude = opt.excludeEdges;
  if (exclude != null && typeof exclude[Symbol.iterator] === "function") {
    for (const pair of exclude) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const a = pair[0];
      const b = pair[1];
      if (a == null || b == null || a === b) continue;
      edgeSet.add(edgeKey(a, b));
    }
  }

  const nodeIds = [...feat.keys()];
  const rng = mulberry32(opt.seed);
  const negCount = Math.round(opt.batchSize * opt.negRatio);
  const lossHistory = [];

  // U-NN-TRAINER-EXPORT-FIX: opt-in stratified negative sampling. The type
  // marginal is derived from the trainer's OWN positive `edges` (== the
  // pipeline's trainEdges), so train + eval samplers see the same marginal.
  // `positiveTypeMarginal` is pure (no rng), so computing it here never
  // perturbs the legacy rng sequence. When `nodeType` is absent the guard
  // below leaves `stratActive` false and the uniform sampler runs unchanged.
  const stratNodeType = opt.nodeType instanceof Map && opt.nodeType.size > 0
    ? opt.nodeType : null;
  const stratMarginal = stratNodeType ? positiveTypeMarginal(edges, stratNodeType) : null;
  const stratActive = !!(stratNodeType && stratMarginal && stratMarginal.size > 0);
  const stratPHard = typeof opt.negPHard === "number" && Number.isFinite(opt.negPHard)
    ? opt.negPHard : 0.7;

  for (let epoch = 0; epoch < opt.epochs; epoch++) {
    const frac = opt.epochs > 1 ? epoch / opt.epochs : 0;
    const lr = Math.max(opt.minLearningRate, opt.learningRate * (1 - frac));

    const pairs = [];
    for (let b = 0; b < opt.batchSize; b++) {
      const e = edges[Math.floor(rng() * edges.length)];
      pairs.push({ u: e[0], v: e[1], label: 1 });
    }
    const negs = stratActive
      ? sampleStratifiedNegativeEdges(nodeIds, edgeSet, negCount, rng, {
          nodeType: stratNodeType,
          typeMarginal: stratMarginal,
          pHard: stratPHard,
        })
      : sampleNegativeEdges(nodeIds, edgeSet, negCount, rng);
    for (const neg of negs) {
      pairs.push({ u: neg.u, v: neg.v, label: 0 });
    }

    const { loss, gradW1, gradW2 } = computeLossAndGradients(model, adj, feat, pairs);
    applyGradient(model.layers[0].W, gradW1, lr);
    applyGradient(model.layers[1].W, gradW2, lr);
    lossHistory.push(loss);
  }

  return {
    lossHistory,
    finalLoss: lossHistory[lossHistory.length - 1],
    epochs: opt.epochs,
    trained: true,
  };
}

export { TRAIN_DEFAULTS as DEFAULTS };
