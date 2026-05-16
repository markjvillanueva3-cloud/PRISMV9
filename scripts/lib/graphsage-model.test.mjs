#!/usr/bin/env node
/**
 * graphsage-model.test.mjs — node:test suite for the forward-pass half of
 * U4 (U-NNG-GRAPHSAGE-TRAIN) of NN-GRAPH-MS0.
 *
 * Load-bearing tests:
 *  - hand-computed forward passes with KNOWN weight matrices (select-self and
 *    select-aggregator) — verify the GraphSAGE math exactly, not just shapes;
 *  - the L2-normalization invariant (every embedding is unit-norm or zero);
 *  - structural equivariance (two nodes with identical features + identical
 *    neighbourhoods embed identically);
 *  - the cache is genuinely decoupled from later caller mutation.
 * Deterministic, no stubs (CLAUDE.md R9).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_DEFAULTS,
  DEFAULTS,
  sigmoid,
  dot,
  glorotLimit,
  createModel,
  forward,
  linkScore,
} from "./graphsage-model.mjs";

/** L2 norm of a vector. */
function norm(v) {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

/**
 * Hand-build a 2-layer model with chosen weights — lets a test compute the
 * exact expected forward output instead of only asserting shapes.
 */
function handModel(inputDim, hiddenDim, embedDim, W0, W1) {
  return {
    config: { inputDim, hiddenDim, embedDim, seed: 0 },
    k: 2,
    layers: [
      { W: Float64Array.from(W0), rows: hiddenDim, cols: 2 * inputDim },
      { W: Float64Array.from(W1), rows: embedDim, cols: 2 * hiddenDim },
    ],
  };
}

describe("MODEL_DEFAULTS", () => {
  it("is frozen with hiddenDim / embedDim / seed and DEFAULTS aliases it", () => {
    assert.equal(Object.isFrozen(MODEL_DEFAULTS), true);
    for (const k of ["hiddenDim", "embedDim", "seed"]) assert.ok(k in MODEL_DEFAULTS);
    assert.equal(DEFAULTS, MODEL_DEFAULTS);
  });
});

describe("sigmoid", () => {
  it("maps 0 to 0.5 and is bounded in (0,1)", () => {
    assert.equal(sigmoid(0), 0.5);
    assert.ok(sigmoid(10) > 0.99 && sigmoid(10) < 1);
    assert.ok(sigmoid(-10) > 0 && sigmoid(-10) < 0.01);
  });
  it("is symmetric: sigmoid(-x) === 1 - sigmoid(x)", () => {
    for (const x of [0.5, 3, 12]) {
      assert.ok(Math.abs(sigmoid(-x) - (1 - sigmoid(x))) < 1e-12);
    }
  });
  it("does not overflow for extreme magnitudes", () => {
    assert.ok(Number.isFinite(sigmoid(1000)) && sigmoid(1000) <= 1);
    assert.ok(Number.isFinite(sigmoid(-1000)) && sigmoid(-1000) >= 0);
  });
});

describe("dot", () => {
  it("computes the inner product", () => {
    assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
  });
  it("returns 0 for orthogonal vectors", () => {
    assert.equal(dot([1, 0], [0, 1]), 0);
  });
  it("returns 0 on a length mismatch or nullish input", () => {
    assert.equal(dot([1, 2], [1, 2, 3]), 0);
    assert.equal(dot(null, [1]), 0);
    assert.equal(dot([], []), 0);
  });
});

describe("glorotLimit", () => {
  it("computes sqrt(6 / (fanIn + fanOut))", () => {
    assert.ok(Math.abs(glorotLimit(4, 2) - Math.sqrt(6 / 6)) < 1e-12);
    assert.ok(Math.abs(glorotLimit(100, 100) - Math.sqrt(6 / 200)) < 1e-12);
  });
});

describe("createModel", () => {
  it("throws RangeError on missing / non-integer / sub-1 dimensions", () => {
    assert.throws(() => createModel({ hiddenDim: 4, embedDim: 2 }), /inputDim/);
    assert.throws(() => createModel({ inputDim: 0, hiddenDim: 4, embedDim: 2 }), /inputDim/);
    assert.throws(() => createModel({ inputDim: 4, hiddenDim: 1.5, embedDim: 2 }), /hiddenDim/);
    assert.throws(() => createModel({ inputDim: 4, hiddenDim: 4, embedDim: -1 }), /embedDim/);
  });
  it("builds two layers with the correct weight-matrix shapes", () => {
    const m = createModel({ inputDim: 8, hiddenDim: 16, embedDim: 4, seed: 1 });
    assert.equal(m.k, 2);
    assert.equal(m.layers[0].rows, 16);
    assert.equal(m.layers[0].cols, 16);          // 2 * inputDim
    assert.equal(m.layers[0].W.length, 16 * 16);
    assert.equal(m.layers[1].rows, 4);
    assert.equal(m.layers[1].cols, 32);          // 2 * hiddenDim
    assert.equal(m.layers[1].W.length, 4 * 32);
  });
  it("is deterministic for a fixed seed and varies with the seed", () => {
    const a = createModel({ inputDim: 6, hiddenDim: 8, embedDim: 4, seed: 7 });
    const b = createModel({ inputDim: 6, hiddenDim: 8, embedDim: 4, seed: 7 });
    const c = createModel({ inputDim: 6, hiddenDim: 8, embedDim: 4, seed: 8 });
    assert.deepEqual(Array.from(a.layers[0].W), Array.from(b.layers[0].W));
    assert.notDeepEqual(Array.from(a.layers[0].W), Array.from(c.layers[0].W));
  });
  it("initializes every weight within the Glorot range", () => {
    const m = createModel({ inputDim: 6, hiddenDim: 8, embedDim: 4, seed: 3 });
    for (const layer of m.layers) {
      const limit = glorotLimit(layer.cols, layer.rows);
      for (const w of layer.W) assert.ok(w >= -limit && w <= limit, `weight ${w} outside ±${limit}`);
    }
  });
});

describe("forward — hand-computed math", () => {
  it("select-self weights make z = normalize(normalize(ReLU(features)))", () => {
    // W0 / W1 row 0 = [1,0,0,0], row 1 = [0,1,0,0] -> pre = the self half of
    // concat, ignoring the aggregated neighbours entirely.
    const W = [1, 0, 0, 0, 0, 1, 0, 0];
    const model = handModel(2, 2, 2, W, W);
    const adj = new Map([["x", ["y"]], ["y", ["x"]]]);
    const feat = new Map([["x", [3, 4]], ["y", [10, 10]]]);
    const { embeddings } = forward(model, adj, feat);
    // x: ReLU([3,4]) -> /5 -> [0.6,0.8]; layer 2 same, already unit -> [0.6,0.8].
    const zx = embeddings.get("x");
    assert.ok(Math.abs(zx[0] - 0.6) < 1e-9 && Math.abs(zx[1] - 0.8) < 1e-9, `z_x = ${zx}`);
  });

  it("select-aggregator weights make layer-1 h = normalize(ReLU(neighbour mean))", () => {
    // W0 row 0 = [0,0,1,0], row 1 = [0,0,0,1] -> pre = the aggregated half.
    const W0 = [0, 0, 1, 0, 0, 0, 0, 1];
    const Wid = [1, 0, 0, 0, 0, 1, 0, 0];
    const model = handModel(2, 2, 2, W0, Wid);
    // b's neighbours a=[1,0], c=[3,0] -> mean [2,0]; b's own feature is ignored.
    const adj = new Map([["b", ["a", "c"]], ["a", ["b"]], ["c", ["b"]]]);
    const feat = new Map([["b", [9, 9]], ["a", [1, 0]], ["c", [3, 0]]]);
    const { cache } = forward(model, adj, feat);
    const h1b = cache.layers[0].h.get("b"); // ReLU([2,0]) -> /2 -> [1,0]
    assert.ok(Math.abs(h1b[0] - 1) < 1e-9 && Math.abs(h1b[1]) < 1e-9, `h1_b = ${h1b}`);
  });

  it("aggregates a zero vector for a node with no neighbours (no divide-by-zero)", () => {
    const W0 = [0, 0, 1, 0, 0, 0, 0, 1]; // select-aggregator
    const Wid = [1, 0, 0, 0, 0, 1, 0, 0];
    const model = handModel(2, 2, 2, W0, Wid);
    const { cache } = forward(model, new Map([["lone", []]]), new Map([["lone", [5, 7]]]));
    // agg is the zero vector -> pre [0,0] -> act [0,0] -> norm 0 -> h all zero.
    const h1 = cache.layers[0].h.get("lone");
    assert.ok(h1[0] === 0 && h1[1] === 0 && Number.isFinite(h1[0]));
    assert.equal(cache.layers[0].degree.get("lone"), 0);
  });
});

describe("forward — invariants on random models", () => {
  function ring(n, inputDim) {
    const adj = new Map();
    const feat = new Map();
    for (let i = 0; i < n; i++) {
      adj.set(`n${i}`, [`n${(i + 1) % n}`, `n${(i + n - 1) % n}`]);
      const v = [];
      for (let d = 0; d < inputDim; d++) v.push(((i * 7 + d * 3) % 11) / 11);
      feat.set(`n${i}`, v);
    }
    return { adj, feat };
  }

  it("emits one embedding per node, each of length embedDim", () => {
    const model = createModel({ inputDim: 5, hiddenDim: 9, embedDim: 4, seed: 2 });
    const { adj, feat } = ring(8, 5);
    const { embeddings } = forward(model, adj, feat);
    assert.equal(embeddings.size, 8);
    for (const z of embeddings.values()) assert.equal(z.length, 4);
  });

  it("L2-normalizes every embedding to unit norm, and does not collapse to zero", () => {
    const model = createModel({ inputDim: 6, hiddenDim: 12, embedDim: 5, seed: 4 });
    const { adj, feat } = ring(10, 6);
    const { embeddings } = forward(model, adj, feat);
    let nonZero = 0;
    for (const z of embeddings.values()) {
      const nz = norm(z);
      assert.ok(Math.abs(nz - 1) < 1e-9 || nz === 0, `embedding norm ${nz}`);
      if (nz > 0) nonZero++;
    }
    // The unit-OR-zero disjunction above is satisfied trivially by a forward
    // that emits only zeros (a ReLU-collapse / always-zero-normInv regression).
    // Require a healthy random model on positive-feature input to produce
    // actual non-zero embeddings — this is what makes the test load-bearing.
    assert.ok(nonZero > 0, "a healthy random model must emit non-zero embeddings");
  });

  it("is invariant to neighbour-list ordering (the mean aggregator commutes)", () => {
    const model = createModel({ inputDim: 4, hiddenDim: 8, embedDim: 4, seed: 11 });
    const feat = new Map([
      ["c", [1, 2, 3, 4]], ["x", [5, 0, 1, 2]], ["y", [0, 3, 1, 4]], ["z", [2, 2, 0, 1]],
    ]);
    const adjAsc = new Map([["c", ["x", "y", "z"]], ["x", ["c"]], ["y", ["c"]], ["z", ["c"]]]);
    const adjRev = new Map([["c", ["z", "y", "x"]], ["x", ["c"]], ["y", ["c"]], ["z", ["c"]]]);
    const a = forward(model, adjAsc, feat).embeddings.get("c");
    const b = forward(model, adjRev, feat).embeddings.get("c");
    // Tolerance, not exact: float addition is non-associative, so a reordered
    // sum may differ by ~1 ULP — but a non-commutative aggregator change would
    // differ by orders of magnitude more.
    for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) < 1e-12);
  });

  it("is deterministic — identical embeddings across runs", () => {
    const model = createModel({ inputDim: 4, hiddenDim: 7, embedDim: 3, seed: 5 });
    const { adj, feat } = ring(6, 4);
    const r1 = forward(model, adj, feat);
    const r2 = forward(model, adj, feat);
    for (const id of r1.embeddings.keys()) {
      assert.deepEqual(Array.from(r1.embeddings.get(id)), Array.from(r2.embeddings.get(id)));
    }
  });

  it("embeds two structurally-identical nodes identically (equivariance)", () => {
    // p and q each have the same feature and one neighbour with the same
    // feature — a pure (features, neighbourhood) function must tie them.
    const model = createModel({ inputDim: 3, hiddenDim: 6, embedDim: 3, seed: 9 });
    const adj = new Map([
      ["p", ["pn"]], ["pn", ["p"]],
      ["q", ["qn"]], ["qn", ["q"]],
    ]);
    const feat = new Map([
      ["p", [1, 2, 0]], ["pn", [5, 6, 1]],
      ["q", [1, 2, 0]], ["qn", [5, 6, 1]],
    ]);
    const { embeddings } = forward(model, adj, feat);
    assert.deepEqual(Array.from(embeddings.get("p")), Array.from(embeddings.get("q")));
  });
});

describe("forward — validation & edge cases", () => {
  const model = createModel({ inputDim: 3, hiddenDim: 5, embedDim: 2, seed: 1 });

  it("throws on a feature vector of the wrong length", () => {
    assert.throws(
      () => forward(model, new Map([["a", []]]), new Map([["a", [1, 2]]])),
      /length 3/
    );
  });
  it("throws on a non-finite feature value", () => {
    assert.throws(
      () => forward(model, new Map([["a", []]]), new Map([["a", [1, NaN, 3]]])),
      /non-finite/
    );
    assert.throws(
      () => forward(model, new Map([["a", []]]), new Map([["a", [1, Infinity, 3]]])),
      /non-finite/
    );
  });
  it("throws when the model is not 2-layer", () => {
    assert.throws(() => forward({ layers: [{}] }, new Map(), new Map()), /2-layer/);
    assert.throws(() => forward({ layers: [{}, {}, {}] }, new Map(), new Map()), /2-layer/);
  });
  it("returns empty embeddings for an empty feature map", () => {
    const { embeddings, cache } = forward(model, new Map(), new Map());
    assert.equal(embeddings.size, 0);
    assert.equal(cache.nodeIds.length, 0);
  });
  it("returns a null cache when buildCache is false", () => {
    const { embeddings, cache } = forward(
      model, new Map([["a", ["a"]]]), new Map([["a", [1, 2, 3]]]), { buildCache: false }
    );
    assert.equal(cache, null);
    assert.equal(embeddings.size, 1);
  });
});

describe("forward — cache structure", () => {
  const model = createModel({ inputDim: 2, hiddenDim: 4, embedDim: 2, seed: 1 });

  it("exposes inputFeatures, nodeIds, neighbors and both layers", () => {
    const adj = new Map([["a", ["b"]], ["b", ["a"]]]);
    const feat = new Map([["a", [1, 2]], ["b", [3, 4]]]);
    const { cache } = forward(model, adj, feat);
    assert.ok(cache.inputFeatures instanceof Map);
    assert.deepEqual(cache.nodeIds, ["a", "b"]);
    assert.ok(cache.neighbors instanceof Map);
    assert.equal(cache.layers.length, 2);
    for (const layer of cache.layers) {
      for (const k of ["concat", "act", "normInv", "h", "degree"]) {
        assert.ok(layer[k] instanceof Map, `layer missing ${k}`);
      }
    }
  });

  it("filters neighbours outside the batch from cache.neighbors and the mean", () => {
    // adjacency says a -> [b, c] but only a and b are in the feature batch.
    const adj = new Map([["a", ["b", "c"]], ["b", ["a"]]]);
    const feat = new Map([["a", [1, 2]], ["b", [3, 4]]]);
    const { cache } = forward(model, adj, feat);
    assert.deepEqual(cache.neighbors.get("a"), ["b"]);          // c excluded
    assert.equal(cache.layers[0].degree.get("a"), 1);           // mean over 1
    assert.equal(cache.neighbors.get("a").length, cache.layers[0].degree.get("a"));
  });

  it("decouples the cache from later mutation of the caller's feature arrays", () => {
    const feat = new Map([["a", [1, 2]], ["b", [3, 4]]]);
    const { cache } = forward(model, new Map([["a", ["b"]], ["b", ["a"]]]), feat);
    feat.get("a")[0] = 999; // mutate the caller's array AFTER forward returned
    assert.equal(cache.inputFeatures.get("a")[0], 1, "cache must hold a private copy");
  });
});

describe("linkScore", () => {
  it("scores identical unit embeddings as sigmoid(1)", () => {
    const u = [0.6, 0.8];
    assert.ok(Math.abs(linkScore(u, u) - sigmoid(1)) < 1e-12);
  });
  it("scores orthogonal embeddings as 0.5 and opposite ones as sigmoid(-1)", () => {
    assert.equal(linkScore([1, 0], [0, 1]), 0.5);
    assert.ok(Math.abs(linkScore([1, 0], [-1, 0]) - sigmoid(-1)) < 1e-12);
  });
});
