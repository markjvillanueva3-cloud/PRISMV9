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

  for (let epoch = 0; epoch < opt.epochs; epoch++) {
    const frac = opt.epochs > 1 ? epoch / opt.epochs : 0;
    const lr = Math.max(opt.minLearningRate, opt.learningRate * (1 - frac));

    const pairs = [];
    for (let b = 0; b < opt.batchSize; b++) {
      const e = edges[Math.floor(rng() * edges.length)];
      pairs.push({ u: e[0], v: e[1], label: 1 });
    }
    for (const neg of sampleNegativeEdges(nodeIds, edgeSet, negCount, rng)) {
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
