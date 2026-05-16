#!/usr/bin/env node
/**
 * graphsage-trainer.test.mjs — node:test suite for the training half of U4
 * (U-NNG-GRAPHSAGE-TRAIN) of NN-GRAPH-MS0.
 *
 * THE load-bearing test is the numerical gradient check: every weight's
 * analytic gradient from the hand-written backprop is compared to a central
 * finite-difference of the loss. If a single sign, factor, or index in the
 * backprop is wrong, the check fails — this is the only way to trust
 * hand-written reverse-mode (CLAUDE.md R9). The suite also verifies training
 * actually reduces the loss and that link prediction beats random AUC on a
 * 2-community graph. Deterministic, no stubs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createModel, forward, linkScore } from "./graphsage-model.mjs";
import {
  TRAIN_DEFAULTS,
  DEFAULTS,
  bceLoss,
  rocAuc,
  sampleNegativeEdges,
  computeLossAndGradients,
  train,
} from "./graphsage-trainer.mjs";

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

/** A small connected graph + features + labeled pairs for the gradient check. */
function tinySetup() {
  const model = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 5 });
  const adj = new Map([
    ["a", ["b", "c"]],
    ["b", ["a", "c"]],
    ["c", ["a", "b", "d"]],
    ["d", ["c", "e"]],
    ["e", ["d"]],
  ]);
  const feat = new Map([
    ["a", [0.5, 0.1, 0.9]],
    ["b", [0.2, 0.8, 0.3]],
    ["c", [0.7, 0.4, 0.1]],
    ["d", [0.1, 0.6, 0.5]],
    ["e", [0.9, 0.2, 0.4]],
  ]);
  const pairs = [
    { u: "a", v: "b", label: 1 },
    { u: "c", v: "d", label: 1 },
    { u: "a", v: "e", label: 0 },
    { u: "b", v: "d", label: 0 },
  ];
  return { model, adj, feat, pairs };
}

/** Two 6-node cliques joined by one bridge edge — a learnable link-pred graph. */
function twoCommunityGraph() {
  const A = ["a0", "a1", "a2", "a3", "a4", "a5"];
  const B = ["b0", "b1", "b2", "b3", "b4", "b5"];
  const adj = new Map();
  const addEdge = (x, y) => {
    if (!adj.has(x)) adj.set(x, []);
    if (!adj.has(y)) adj.set(y, []);
    adj.get(x).push(y);
    adj.get(y).push(x);
  };
  for (const clique of [A, B]) {
    for (let i = 0; i < clique.length; i++) {
      for (let j = i + 1; j < clique.length; j++) addEdge(clique[i], clique[j]);
    }
  }
  addEdge("a0", "b0");
  const feat = new Map();
  let k = 0;
  for (const id of [...A, ...B]) {
    // deterministic, distinct positive feature vectors
    feat.set(id, [((k * 7) % 11) / 11 + 0.1, ((k * 3) % 5) / 5 + 0.1, ((k * 5) % 7) / 7 + 0.1]);
    k++;
  }
  return { adj, feat, A, B };
}

describe("TRAIN_DEFAULTS", () => {
  it("is frozen with the training knobs and DEFAULTS aliases it", () => {
    assert.equal(Object.isFrozen(TRAIN_DEFAULTS), true);
    for (const key of ["epochs", "batchSize", "negRatio", "learningRate", "minLearningRate", "seed"]) {
      assert.ok(key in TRAIN_DEFAULTS);
    }
    assert.equal(DEFAULTS, TRAIN_DEFAULTS);
  });
});

describe("bceLoss", () => {
  it("is -log(score) for a positive and -log(1-score) for a negative", () => {
    assert.ok(Math.abs(bceLoss(0.8, 1) - -Math.log(0.8)) < 1e-12);
    assert.ok(Math.abs(bceLoss(0.3, 0) - -Math.log(0.7)) < 1e-12);
  });
  it("is near zero for a confident correct prediction", () => {
    assert.ok(bceLoss(0.999, 1) < 0.01);
    assert.ok(bceLoss(0.001, 0) < 0.01);
  });
  it("clamps an exact 0/1 score to a finite (not Infinity) loss", () => {
    assert.ok(Number.isFinite(bceLoss(0, 1)));
    assert.ok(Number.isFinite(bceLoss(1, 0)));
    assert.ok(bceLoss(0, 1) > 20); // large but finite
  });
  it("penalizes a wrong prediction more than a right one", () => {
    assert.ok(bceLoss(0.9, 1) < bceLoss(0.1, 1));
  });
});

describe("rocAuc", () => {
  it("is 1 for a perfectly-ranked split and 0 for a reversed one", () => {
    assert.equal(rocAuc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1);
    assert.equal(rocAuc([0.9, 0.8, 0.2, 0.1], [0, 0, 1, 1]), 0);
  });
  it("is 0.5 when every score ties", () => {
    assert.equal(rocAuc([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]), 0.5);
  });
  it("computes a partial-overlap AUC correctly", () => {
    // pos scores {0.6,0.4}, neg {0.5,0.3}: pairs pos>neg = (0.6>0.5,0.6>0.3,
    // 0.4>0.3) = 3 of 4 -> 0.75.
    assert.equal(rocAuc([0.6, 0.4, 0.5, 0.3], [1, 1, 0, 0]), 0.75);
  });
  it("returns NaN when a class is absent", () => {
    assert.ok(Number.isNaN(rocAuc([0.1, 0.2], [1, 1])));
    assert.ok(Number.isNaN(rocAuc([0.1, 0.2], [0, 0])));
  });
  it("throws on a length mismatch", () => {
    assert.throws(() => rocAuc([0.1], [1, 0]), /equal-length/);
  });
});

/** Reproduce the trainer's internal NUL-separated undirected edge key. */
const EDGE_SEP = String.fromCharCode(0);
const keyOf = (a, b) => (a < b ? a + EDGE_SEP + b : b + EDGE_SEP + a);

describe("sampleNegativeEdges", () => {
  const nodeIds = ["a", "b", "c", "d", "e"];

  it("draws distinct pairs (u != v), at most `count` of them", () => {
    const negs = sampleNegativeEdges(nodeIds, new Set(), 3, mulberryLike(1));
    assert.ok(negs.length <= 3);
    for (const { u, v } of negs) assert.notEqual(u, v);
  });
  it("never returns a pair present in the edge set", () => {
    const forbidden = new Set([keyOf("a", "b"), keyOf("c", "d"), keyOf("a", "c")]);
    const negs = sampleNegativeEdges(nodeIds, forbidden, 30, mulberryLike(5));
    assert.ok(negs.length > 0, "valid non-edges exist and should be found");
    for (const { u, v } of negs) {
      assert.ok(!forbidden.has(keyOf(u, v)), `returned a forbidden pair (${u}, ${v})`);
    }
  });
  it("returns [] for count <= 0 or fewer than 2 nodes", () => {
    assert.deepEqual(sampleNegativeEdges(nodeIds, new Set(), 0, mulberryLike(1)), []);
    assert.deepEqual(sampleNegativeEdges(["x"], new Set(), 5, mulberryLike(1)), []);
  });
  it("terminates and finds nothing when every pair is forbidden", () => {
    // 2 nodes -> the only non-self pair is (x,y); forbidding it leaves none.
    const negs = sampleNegativeEdges(["x", "y"], new Set([keyOf("x", "y")]), 10, mulberryLike(2));
    assert.deepEqual(negs, []); // terminated AND correctly excluded
  });
  it("is deterministic for a fixed rng stream", () => {
    const a = sampleNegativeEdges(nodeIds, new Set(), 3, mulberryLike(7));
    const b = sampleNegativeEdges(nodeIds, new Set(), 3, mulberryLike(7));
    assert.deepEqual(a, b);
  });
});

/** Local mulberry32 so the test does not depend on graph-random-walk internals. */
function mulberryLike(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("computeLossAndGradients", () => {
  it("returns { loss, gradW1, gradW2, scores } with correct shapes", () => {
    const { model, adj, feat, pairs } = tinySetup();
    const r = computeLossAndGradients(model, adj, feat, pairs);
    assert.ok(Number.isFinite(r.loss) && r.loss > 0);
    assert.equal(r.gradW1.length, model.layers[0].W.length);
    assert.equal(r.gradW2.length, model.layers[1].W.length);
    assert.equal(r.scores.length, pairs.length);
  });
  it("does not mutate the model's weights", () => {
    const { model, adj, feat, pairs } = tinySetup();
    const before1 = Array.from(model.layers[0].W);
    const before2 = Array.from(model.layers[1].W);
    computeLossAndGradients(model, adj, feat, pairs);
    assert.deepEqual(Array.from(model.layers[0].W), before1);
    assert.deepEqual(Array.from(model.layers[1].W), before2);
  });
  it("throws on empty pairs or a pair node absent from the features", () => {
    const { model, adj, feat } = tinySetup();
    assert.throws(() => computeLossAndGradients(model, adj, feat, []), /non-empty/);
    assert.throws(
      () => computeLossAndGradients(model, adj, feat, [{ u: "a", v: "ghost", label: 1 }]),
      /not in the feature set/
    );
  });
});

describe("R9 — numerical gradient check (hand-written backprop is correct)", () => {
  it("matches analytic gradients to central finite differences for every weight", () => {
    const { model, adj, feat, pairs } = tinySetup();
    const { gradW1, gradW2 } = computeLossAndGradients(model, adj, feat, pairs);
    const eps = 1e-6;
    const lossAt = () => computeLossAndGradients(model, adj, feat, pairs).loss;

    for (const [layerIdx, analytic] of [[0, gradW1], [1, gradW2]]) {
      const W = model.layers[layerIdx].W;
      let maxRelErr = 0;
      for (let i = 0; i < W.length; i++) {
        const orig = W[i];
        W[i] = orig + eps;
        const lossPlus = lossAt();
        W[i] = orig - eps;
        const lossMinus = lossAt();
        W[i] = orig; // restore exactly
        const numeric = (lossPlus - lossMinus) / (2 * eps);
        const a = analytic[i];
        // Combined absolute/relative tolerance — robust for near-zero grads.
        const relErr = Math.abs(a - numeric) / Math.max(1e-7, Math.abs(a) + Math.abs(numeric));
        if (relErr > maxRelErr) maxRelErr = relErr;
        assert.ok(
          relErr < 1e-4,
          `W${layerIdx + 1}[${i}]: analytic ${a}, numeric ${numeric}, relErr ${relErr}`
        );
      }
      assert.ok(maxRelErr < 1e-4, `layer ${layerIdx + 1} max relErr ${maxRelErr}`);
    }
  });
});

describe("train", () => {
  it("reduces the loss over training (last-10 epochs vs first-10)", () => {
    const { adj, feat } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 12, embedDim: 6, seed: 2 });
    const r = train(model, adj, feat, { epochs: 200, batchSize: 24, seed: 3, learningRate: 0.2 });
    assert.equal(r.trained, true);
    assert.equal(r.lossHistory.length, 200);
    assert.ok(
      mean(r.lossHistory.slice(-10)) < mean(r.lossHistory.slice(0, 10)),
      `loss did not fall: first10 ${mean(r.lossHistory.slice(0, 10))} last10 ${mean(r.lossHistory.slice(-10))}`
    );
  });
  it("is seed-deterministic — identical loss history across runs", () => {
    const { adj, feat } = twoCommunityGraph();
    const m1 = createModel({ inputDim: 3, hiddenDim: 8, embedDim: 4, seed: 2 });
    const m2 = createModel({ inputDim: 3, hiddenDim: 8, embedDim: 4, seed: 2 });
    const r1 = train(m1, adj, feat, { epochs: 30, seed: 9 });
    const r2 = train(m2, adj, feat, { epochs: 30, seed: 9 });
    assert.deepEqual(r1.lossHistory, r2.lossHistory);
  });
  it("mutates the model weights in place", () => {
    const { adj, feat } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 6, embedDim: 4, seed: 1 });
    const before = Array.from(model.layers[1].W);
    train(model, adj, feat, { epochs: 20, seed: 4 });
    assert.notDeepEqual(Array.from(model.layers[1].W), before);
  });
  it("returns trained:false for an edgeless graph instead of throwing", () => {
    const model = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const feat = new Map([["x", [1, 2, 3]], ["y", [4, 5, 6]]]);
    const r = train(model, new Map([["x", []], ["y", []]]), feat, { epochs: 10 });
    assert.equal(r.trained, false);
    assert.ok(Number.isNaN(r.finalLoss));
    assert.equal(r.epochs, 0);
  });
  it("throws RangeError on invalid training options", () => {
    const { adj, feat } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    assert.throws(() => train(model, adj, feat, { epochs: 0 }), /epochs/);
    assert.throws(() => train(model, adj, feat, { learningRate: -1 }), /learningRate/);
    assert.throws(() => train(model, adj, feat, { minLearningRate: 9 }), /minLearningRate/);
  });
});

describe("R9 — link prediction learns to separate edges from non-edges", () => {
  it("scores real edges above non-edges (AUC well above random) after training", () => {
    const { adj, feat, A, B } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 12, embedDim: 6, seed: 6 });
    const r = train(model, adj, feat, { epochs: 300, batchSize: 24, seed: 7, learningRate: 0.2 });
    assert.equal(r.trained, true);

    const { embeddings } = forward(model, adj, feat, { buildCache: false });
    // Positive = real intra-clique edges; negative = inter-clique non-edges.
    const scores = [];
    const labels = [];
    for (const clique of [A, B]) {
      for (let i = 0; i < clique.length; i++) {
        for (let j = i + 1; j < clique.length; j++) {
          scores.push(linkScore(embeddings.get(clique[i]), embeddings.get(clique[j])));
          labels.push(1);
        }
      }
    }
    for (const a of A) {
      for (const b of B) {
        if (a === "a0" && b === "b0") continue; // the one real bridge edge
        scores.push(linkScore(embeddings.get(a), embeddings.get(b)));
        labels.push(0);
      }
    }
    const auc = rocAuc(scores, labels);
    assert.ok(auc > 0.6, `post-training link-prediction AUC ${auc} must beat random (0.5)`);
  });
});
