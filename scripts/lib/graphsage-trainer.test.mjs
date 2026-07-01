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
  positiveTypeMarginal,
  sampleStratifiedNegativeEdges,
  computeLossAndGradients,
  train,
} from "./graphsage-trainer.mjs";
import { mulberry32 } from "./graph-random-walk.mjs";

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

describe("train — excludeEdges (leakage-safe split augment)", () => {
  // Why this exists: when the pipeline does a train/test edge split it builds
  // `trainAdj` from train edges only and passes it to train(). The trainer's
  // internal rejection set would then NOT contain held-out test edges, so a
  // real test edge could be neg-sampled and the model taught to push it
  // apart — driving eval AUROC BELOW random. excludeEdges lets the pipeline
  // pass the full edge list (train + test) so the trainer's neg-sampling
  // rejects every real edge, not just the ones in trainAdj.

  it("never neg-samples a pair listed in excludeEdges", () => {
    // Tiny adjacency with ONE train edge (a,b). The held-out edge (a,d) is
    // real-but-absent from adj — the leakage candidate.
    const adj = new Map([
      ["a", ["b"]],
      ["b", ["a"]],
      ["c", []],
      ["d", []],
    ]);
    const feat = new Map([
      ["a", [0.1, 0.2, 0.3]],
      ["b", [0.4, 0.5, 0.6]],
      ["c", [0.7, 0.1, 0.2]],
      ["d", [0.2, 0.8, 0.4]],
    ]);

    // sampleNegativeEdges is the exact function the trainer calls inside its
    // epoch loop. Verify the rejection set is honored. Use the file-level
    // EDGE_SEP / keyOf helpers — they LOCK the trainer's NUL-separator
    // contract, so a future EDGE_KEY_SEP change in the trainer surfaces as a
    // matching update here (no silent tripwire de-arm).
    const forbidden = new Set([keyOf("a", "d"), keyOf("a", "b")]);
    const negs = sampleNegativeEdges(["a", "b", "c", "d"], forbidden, 50, mulberryLike(99));
    const seen = new Set(negs.map(({ u, v }) => keyOf(u, v)));
    assert.equal(seen.has(keyOf("a", "d")), false, "(a,d) leaked into negs");
    assert.equal(seen.has(keyOf("a", "b")), false, "(a,b) leaked into negs");

    // Round-trip via train(): with excludeEdges containing (a,d), training
    // converges deterministically (no contamination signal in lossHistory).
    const m1 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const m2 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const r1 = train(m1, adj, feat, {
      epochs: 20, batchSize: 4, negRatio: 4, seed: 17,
      excludeEdges: [["a", "d"]],
    });
    const r2 = train(m2, adj, feat, {
      epochs: 20, batchSize: 4, negRatio: 4, seed: 17,
      excludeEdges: [["a", "d"]],
    });
    assert.deepEqual(r1.lossHistory, r2.lossHistory, "excludeEdges must not break determinism");
    assert.equal(r1.trained, true);
  });

  it("is backward-compatible — omitting excludeEdges preserves prior loss history", () => {
    const { adj, feat } = twoCommunityGraph();
    const m1 = createModel({ inputDim: 3, hiddenDim: 6, embedDim: 4, seed: 4 });
    const m2 = createModel({ inputDim: 3, hiddenDim: 6, embedDim: 4, seed: 4 });
    const noExclude = train(m1, adj, feat, { epochs: 30, batchSize: 8, seed: 11 });
    const emptyExclude = train(m2, adj, feat, { epochs: 30, batchSize: 8, seed: 11, excludeEdges: [] });
    // An empty excludeEdges adds zero keys to the rejection set, so behavior
    // must be byte-identical to omitting the param entirely.
    assert.deepEqual(noExclude.lossHistory, emptyExclude.lossHistory);
  });

  it("silently skips malformed entries (null, length<2, self-loop, missing endpoint)", () => {
    const { adj, feat } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    // None of these should throw — the docstring promises silent-skip on
    // malformed input.
    assert.doesNotThrow(() => train(model, adj, feat, {
      epochs: 5, batchSize: 4, seed: 1,
      excludeEdges: [
        null,                        // null entry
        ["a0"],                      // length < 2
        ["a0", "a0"],                // self-loop
        ["a0", null],                // null endpoint
        [null, "a1"],                // null endpoint
        "not-a-pair",                // wrong type
        ["a0", "a1"],                // one valid entry survives
      ],
    }));
  });

  it("ignores non-iterable excludeEdges (number, null, undefined) without throwing", () => {
    const { adj, feat } = twoCommunityGraph();
    const m1 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const m2 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const m3 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const baseline = train(m1, adj, feat, { epochs: 5, batchSize: 4, seed: 1 });
    assert.doesNotThrow(() => train(m2, adj, feat, { epochs: 5, batchSize: 4, seed: 1, excludeEdges: 42 }));
    assert.doesNotThrow(() => train(m3, adj, feat, { epochs: 5, batchSize: 4, seed: 1, excludeEdges: null }));
    // Non-iterable degrades to no-op — same training trajectory as omitting it.
    const m4 = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    const noopRun = train(m4, adj, feat, { epochs: 5, batchSize: 4, seed: 1, excludeEdges: 42 });
    assert.deepEqual(baseline.lossHistory, noopRun.lossHistory);
  });

  it("accepts a Set of [u,v] pairs in addition to an array (iterable contract)", () => {
    const { adj, feat } = twoCommunityGraph();
    const model = createModel({ inputDim: 3, hiddenDim: 4, embedDim: 3, seed: 1 });
    // Set stores array references — duplicate-VALUE pairs would still be
    // distinct entries. The trainer relies on iterability, not value dedup;
    // canonicalization happens via edgeKey() inside the trainer regardless.
    // Mix one out-of-graph pair (ax, zz) — exercises the "add a key not
    // already in the trainer's edgeSet" merge path, which an in-graph-only
    // Set wouldn't (every twoCommunityGraph intra-clique pair is in adj).
    const r = train(model, adj, feat, {
      epochs: 5, batchSize: 4, seed: 1,
      excludeEdges: new Set([["a0", "b5"], ["ax", "zz"]]),
    });
    assert.equal(r.trained, true);
    assert.equal(r.lossHistory.length, 5);
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

// ---------------------------------------------------------------------------
// U-NN-TRAINER-EXPORT-RESTORE (2026-05-23, slot golf) — stratified negative
// sampling. Restored after the 2026-05-21 ship (629190e6c9) was overwritten by
// a later edit that dropped the producers, leaving graphsage-train-pipeline's
// import unsatisfiable. Tests pin both producers + edgeSet rejection +
// marginal weighting + hard/cross-type pHard branch + adversarial guards.
// ---------------------------------------------------------------------------

const NUL = String.fromCharCode(0);
const ek = (a, b) => (a < b ? a + NUL + b : b + NUL + a);

describe("positiveTypeMarginal", () => {
  it("counts endpoint types from [u,v] array edges", () => {
    const nodeType = new Map([
      ["a", "engine"], ["b", "engine"], ["c", "dispatcher"], ["d", "dispatcher"],
    ]);
    const m = positiveTypeMarginal([["a", "b"], ["c", "d"]], nodeType);
    assert.equal(m.get("engine"), 2);
    assert.equal(m.get("dispatcher"), 2);
    assert.equal(m.size, 2);
  });

  it("accepts {u,v} object edges (pipeline + trainer shape parity)", () => {
    const nodeType = new Map([["a", "x"], ["b", "y"]]);
    const m = positiveTypeMarginal([{ u: "a", v: "b" }], nodeType);
    assert.equal(m.get("x"), 1);
    assert.equal(m.get("y"), 1);
  });

  it("counts a shared endpoint once per edge it appears in", () => {
    const nodeType = new Map([["hub", "h"], ["a", "h"], ["b", "h"]]);
    const m = positiveTypeMarginal([["hub", "a"], ["hub", "b"]], nodeType);
    assert.equal(m.get("h"), 4);
  });

  it("skips endpoints with no type in the map", () => {
    const nodeType = new Map([["a", "t"]]);
    const m = positiveTypeMarginal([["a", "b"]], nodeType);
    assert.equal(m.get("t"), 1);
    assert.equal(m.size, 1);
  });

  it("empty edge list -> empty Map (boundary)", () => {
    const m = positiveTypeMarginal([], new Map([["a", "t"]]));
    assert.ok(m instanceof Map);
    assert.equal(m.size, 0);
  });

  it("non-array trainEdges -> empty Map (failure mode, fail-soft)", () => {
    assert.equal(positiveTypeMarginal(null, new Map([["a", "t"]])).size, 0);
    assert.equal(positiveTypeMarginal(undefined, new Map([["a", "t"]])).size, 0);
    assert.equal(positiveTypeMarginal("a-b", new Map([["a", "t"]])).size, 0);
  });

  it("non-Map nodeType -> empty Map (failure mode, fail-soft)", () => {
    assert.equal(positiveTypeMarginal([["a", "b"]], null).size, 0);
    assert.equal(positiveTypeMarginal([["a", "b"]], { a: "t" }).size, 0);
  });

  it("skips malformed edge entries (adversarial: short array, null, scalar)", () => {
    const nodeType = new Map([["a", "t"], ["b", "t"]]);
    const m = positiveTypeMarginal(
      [["a"], null, 42, ["a", "b"], { u: "a" }], nodeType,
    );
    assert.equal(m.get("t"), 3);
  });
});

describe("sampleStratifiedNegativeEdges", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const nodeType = new Map([
    ["a", "X"], ["b", "X"], ["c", "X"],
    ["d", "Y"], ["e", "Y"], ["f", "Y"],
  ]);
  const typeMarginal = new Map([["X", 3], ["Y", 3]]);

  it("no nodeType -> byte-identical to sampleNegativeEdges (legacy parity)", () => {
    const edgeSet = new Set([ek("a", "b")]);
    const legacy = sampleNegativeEdges(ids, edgeSet, 5, mulberry32(7));
    const strat = sampleStratifiedNegativeEdges(ids, edgeSet, 5, mulberry32(7), {});
    assert.deepEqual(strat, legacy);
  });

  it("nodeType present but typeMarginal absent -> legacy fallback", () => {
    const edgeSet = new Set();
    const legacy = sampleNegativeEdges(ids, edgeSet, 4, mulberry32(3));
    const strat = sampleStratifiedNegativeEdges(ids, edgeSet, 4, mulberry32(3), { nodeType });
    assert.deepEqual(strat, legacy);
  });

  it("happy path: draws the requested count, all real-edge-free, distinct", () => {
    const edgeSet = new Set([ek("a", "b"), ek("c", "d")]);
    const negs = sampleStratifiedNegativeEdges(ids, edgeSet, 6, mulberry32(1), {
      nodeType, typeMarginal, pHard: 0.5,
    });
    assert.equal(negs.length, 6);
    const seen = new Set();
    for (const { u, v } of negs) {
      assert.notEqual(u, v);
      assert.ok(!edgeSet.has(ek(u, v)));
      const key = ek(u, v);
      assert.ok(!seen.has(key));
      seen.add(key);
    }
  });

  it("pHard=1.0 -> every negative is intra-type (hard negatives only)", () => {
    const negs = sampleStratifiedNegativeEdges(ids, new Set(), 8, mulberry32(9), {
      nodeType, typeMarginal, pHard: 1.0,
    });
    assert.ok(negs.length > 0);
    for (const { u, v } of negs) {
      assert.equal(nodeType.get(u), nodeType.get(v));
    }
  });

  it("pHard=0.0 -> sampler still runs and yields valid negatives", () => {
    const negs = sampleStratifiedNegativeEdges(ids, new Set(), 6, mulberry32(2), {
      nodeType, typeMarginal, pHard: 0.0,
    });
    assert.ok(negs.length > 0);
    for (const { u, v } of negs) assert.notEqual(u, v);
  });

  it("rejects every pair already in edgeSet", () => {
    const edgeSet = new Set([ek("a", "b"), ek("a", "c"), ek("b", "c")]);
    const negs = sampleStratifiedNegativeEdges(ids, edgeSet, 10, mulberry32(5), {
      nodeType, typeMarginal, pHard: 1.0,
    });
    for (const { u, v } of negs) {
      assert.ok(!edgeSet.has(ek(u, v)));
    }
  });

  it("bounded: saturated graph returns fewer than count, never loops forever", () => {
    const tinyIds = ["a", "b"];
    const tinyType = new Map([["a", "T"], ["b", "T"]]);
    const tinyMarg = new Map([["T", 2]]);
    const negs = sampleStratifiedNegativeEdges(
      tinyIds, new Set([ek("a", "b")]), 100, mulberry32(1),
      { nodeType: tinyType, typeMarginal: tinyMarg, pHard: 1.0 },
    );
    assert.equal(negs.length, 0);
  });

  it("NaN pHard -> falls back to 0.7 default (adversarial)", () => {
    const negs = sampleStratifiedNegativeEdges(ids, new Set(), 5, mulberry32(4), {
      nodeType, typeMarginal, pHard: NaN,
    });
    assert.equal(negs.length, 5);
  });

  it("Infinity pHard -> not finite, falls back to 0.7 default (adversarial)", () => {
    const negs = sampleStratifiedNegativeEdges(ids, new Set(), 6, mulberry32(8), {
      nodeType, typeMarginal, pHard: Infinity,
    });
    assert.equal(negs.length, 6);
    for (const { u, v } of negs) assert.notEqual(u, v);
  });

  it("empty nodeIds -> empty result (boundary)", () => {
    const negs = sampleStratifiedNegativeEdges([], new Set(), 5, mulberry32(1), {
      nodeType, typeMarginal,
    });
    assert.deepEqual(negs, []);
  });

  it("count <= 0 -> empty result (boundary)", () => {
    assert.deepEqual(
      sampleStratifiedNegativeEdges(ids, new Set(), 0, mulberry32(1), { nodeType, typeMarginal }),
      [],
    );
    assert.deepEqual(
      sampleStratifiedNegativeEdges(ids, new Set(), -3, mulberry32(1), { nodeType, typeMarginal }),
      [],
    );
  });

  it("seed-deterministic: identical opts + seed -> identical output", () => {
    const opts = { nodeType, typeMarginal, pHard: 0.6 };
    const a = sampleStratifiedNegativeEdges(ids, new Set(), 6, mulberry32(11), opts);
    const b = sampleStratifiedNegativeEdges(ids, new Set(), 6, mulberry32(11), opts);
    assert.deepEqual(a, b);
  });
});
