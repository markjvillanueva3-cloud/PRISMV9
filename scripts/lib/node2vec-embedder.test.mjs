#!/usr/bin/env node
/**
 * node2vec-embedder.test.mjs — node:test suite for U3b of NN-GRAPH-MS0.
 *
 * The load-bearing test is the community-separation invariant: node2vec's
 * defining property is that nodes in the same graph community embed closer
 * (cosine) than nodes across communities. That is asserted on a real 2-clique
 * graph fed through the U3a walk generator — a falsifiable check of intent,
 * not a stub (CLAUDE.md R9). Every test is seed-deterministic.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EMBED_DEFAULTS,
  DEFAULTS,
  buildVocab,
  buildNegativeSamplingTable,
  trainEmbeddings,
  cosineSimilarity,
  mostSimilar,
} from "./node2vec-embedder.mjs";
import { collectWalks } from "./graph-random-walk.mjs";

const mean = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;

/** Two 6-node cliques joined by a single bridge edge — clean community structure. */
function twoCommunityGraph() {
  const A = ["a0", "a1", "a2", "a3", "a4", "a5"];
  const B = ["b0", "b1", "b2", "b3", "b4", "b5"];
  const nodes = [...A, ...B].map((id) => ({ id }));
  const edges = [];
  for (const clique of [A, B]) {
    for (let i = 0; i < clique.length; i++) {
      for (let j = i + 1; j < clique.length; j++) {
        edges.push({ from: clique[i], to: clique[j] });
      }
    }
  }
  edges.push({ from: "a0", to: "b0" }); // the only inter-community edge
  return { graph: { nodes, edges }, A, B };
}

describe("EMBED_DEFAULTS", () => {
  it("is frozen and carries every training knob", () => {
    assert.equal(Object.isFrozen(EMBED_DEFAULTS), true);
    for (const k of ["dimensions", "window", "epochs", "negativeSamples",
      "learningRate", "minLearningRate", "unigramPower", "sigmoidClamp",
      "reducedWindow", "seed", "maxNegTableSize"]) {
      assert.ok(k in EMBED_DEFAULTS, `missing default: ${k}`);
    }
  });
  it("exports DEFAULTS as an alias of EMBED_DEFAULTS", () => {
    assert.equal(DEFAULTS, EMBED_DEFAULTS);
  });
});

describe("buildVocab", () => {
  it("counts occurrences and indexes ids in first-seen order", () => {
    const v = buildVocab([["x", "y", "x"], ["y", "z"]]);
    assert.deepEqual(v.ids, ["x", "y", "z"]);
    assert.equal(v.index.get("x"), 0);
    assert.equal(v.index.get("z"), 2);
    assert.deepEqual(v.counts, [2, 2, 1]);
  });
  it("returns an empty vocab for an empty corpus", () => {
    const v = buildVocab([]);
    assert.deepEqual(v.ids, []);
    assert.equal(v.index.size, 0);
  });
  it("handles a null/undefined corpus without throwing", () => {
    assert.equal(buildVocab(null).ids.length, 0);
    assert.equal(buildVocab(undefined).ids.length, 0);
  });
  it("skips non-array walk entries and null nodes", () => {
    const v = buildVocab([["a"], null, "nope", ["b", null, undefined, "a"]]);
    assert.deepEqual(v.ids, ["a", "b"]);
    assert.deepEqual(v.counts, [2, 1]);
  });
  it("stringifies numeric node ids consistently", () => {
    const v = buildVocab([[1, 2, 1]]);
    assert.deepEqual(v.ids, ["1", "2"]);
    assert.equal(v.index.get("1"), 0);
  });
});

describe("buildNegativeSamplingTable", () => {
  it("returns an empty Int32Array for empty counts", () => {
    const t = buildNegativeSamplingTable([]);
    assert.ok(t instanceof Int32Array);
    assert.equal(t.length, 0);
  });
  it("samples a frequent node far more often than a rare one", () => {
    const t = buildNegativeSamplingTable([100, 1], { unigramPower: 0.75 });
    let zero = 0;
    for (let i = 0; i < t.length; i++) if (t[i] === 0) zero++;
    // 100^0.75 / (100^0.75 + 1) ≈ 0.969 — node 0 should dominate the table.
    assert.ok(zero / t.length > 0.9, `node-0 table fraction ${zero / t.length}`);
  });
  it("caps the table at maxNegTableSize", () => {
    const counts = new Array(50000).fill(1); // 50000 * 100 = 5M would exceed the cap
    const t = buildNegativeSamplingTable(counts, { maxNegTableSize: 4096 });
    assert.equal(t.length, 4096);
  });
  it("only ever emits valid vocab indices", () => {
    const t = buildNegativeSamplingTable([3, 2, 1]);
    for (let i = 0; i < t.length; i++) {
      assert.ok(t[i] >= 0 && t[i] <= 2, `index ${t[i]} out of range`);
    }
  });
  it("handles a single-node vocabulary", () => {
    const t = buildNegativeSamplingTable([5]);
    assert.ok(t.length > 0);
    for (let i = 0; i < t.length; i++) assert.equal(t[i], 0);
  });
});

describe("trainEmbeddings — parameter validation", () => {
  const corpus = [["a", "b", "c"]];
  it("rejects non-integer / sub-range dimensions, window, epochs", () => {
    assert.throws(() => trainEmbeddings(corpus, { dimensions: 0 }), /dimensions/);
    assert.throws(() => trainEmbeddings(corpus, { dimensions: 1.5 }), /dimensions/);
    assert.throws(() => trainEmbeddings(corpus, { window: 0 }), /window/);
    assert.throws(() => trainEmbeddings(corpus, { epochs: -1 }), /epochs/);
  });
  it("allows negativeSamples = 0 but rejects negative values", () => {
    assert.doesNotThrow(() => trainEmbeddings(corpus, { negativeSamples: 0, epochs: 1, dimensions: 4 }));
    assert.throws(() => trainEmbeddings(corpus, { negativeSamples: -1 }), /negativeSamples/);
  });
  it("rejects a non-positive learningRate", () => {
    assert.throws(() => trainEmbeddings(corpus, { learningRate: 0 }), /learningRate/);
    assert.throws(() => trainEmbeddings(corpus, { learningRate: NaN }), /learningRate/);
  });
  it("rejects minLearningRate outside [0, learningRate]", () => {
    assert.throws(() => trainEmbeddings(corpus, { learningRate: 0.01, minLearningRate: 0.02 }), /minLearningRate/);
    assert.throws(() => trainEmbeddings(corpus, { minLearningRate: -0.001 }), /minLearningRate/);
  });
  it("rejects a non-positive unigramPower and sigmoidClamp", () => {
    assert.throws(() => trainEmbeddings(corpus, { unigramPower: 0 }), /unigramPower/);
    assert.throws(() => trainEmbeddings(corpus, { sigmoidClamp: -1 }), /sigmoidClamp/);
  });
});

describe("trainEmbeddings — corpus resolution", () => {
  it("accepts an array of walks", () => {
    const r = trainEmbeddings([["a", "b"], ["b", "c"]], { dimensions: 4, epochs: 1 });
    assert.equal(r.embeddings.size, 3);
  });
  it("accepts a factory function and re-iterates it across epochs", () => {
    let calls = 0;
    const factory = () => { calls++; return [["a", "b", "c"]]; };
    trainEmbeddings(factory, { dimensions: 4, epochs: 3 });
    assert.equal(calls, 4); // 1 vocab pass + 3 epochs
  });
  it("rejects a one-shot generator object with an actionable TypeError", () => {
    function* gen() { yield ["a", "b"]; }
    assert.throws(() => trainEmbeddings(gen(), { dimensions: 4 }), /factory|one-shot/i);
  });
  it("accepts a generator *function* as a valid factory", () => {
    function* gen() { yield ["a", "b", "c"]; }
    const r = trainEmbeddings(gen, { dimensions: 4, epochs: 2 });
    assert.equal(r.embeddings.size, 3);
  });
});

describe("trainEmbeddings — output shape & edge cases", () => {
  it("returns the documented result shape", () => {
    const r = trainEmbeddings([["a", "b", "c"]], { dimensions: 8, epochs: 2 });
    for (const k of ["embeddings", "vocab", "dimensions", "epochs", "pairsTrained", "corpusEmpty"]) {
      assert.ok(k in r, `missing result key: ${k}`);
    }
    assert.equal(r.dimensions, 8);
    assert.equal(r.epochs, 2);
    assert.equal(r.corpusEmpty, false);
    assert.ok(r.embeddings instanceof Map);
  });
  it("emits a Float32Array of `dimensions` length per node", () => {
    const r = trainEmbeddings([["a", "b", "c"]], { dimensions: 12, epochs: 1 });
    for (const vec of r.embeddings.values()) {
      assert.ok(vec instanceof Float32Array);
      assert.equal(vec.length, 12);
    }
  });
  it("gives every corpus node exactly one embedding", () => {
    const r = trainEmbeddings([["a", "b"], ["b", "c", "d"]], { dimensions: 4, epochs: 1 });
    for (const id of ["a", "b", "c", "d"]) assert.ok(r.embeddings.has(id));
    assert.equal(r.embeddings.size, 4);
  });
  it("treats an empty corpus as legitimate (corpusEmpty, no throw, onEmpty fires)", () => {
    let emptySeen = false;
    const r = trainEmbeddings([], { onEmpty: () => { emptySeen = true; } });
    assert.equal(r.corpusEmpty, true);
    assert.equal(r.epochs, 0);
    assert.equal(r.embeddings.size, 0);
    assert.equal(emptySeen, true);
  });
  it("handles a length-1 walk: node embedded, zero pairs trained", () => {
    const r = trainEmbeddings([["solo"]], { dimensions: 4, epochs: 3 });
    assert.equal(r.embeddings.size, 1);
    assert.equal(r.pairsTrained, 0);
    assert.equal(r.corpusEmpty, false);
  });
  it("does not crash when window exceeds walk length", () => {
    const r = trainEmbeddings([["a", "b"]], { dimensions: 4, window: 50, epochs: 2 });
    assert.equal(r.embeddings.size, 2);
    assert.ok(Number.isFinite(r.embeddings.get("a")[0]));
  });
  it("produces finite embeddings with negativeSamples = 0", () => {
    const r = trainEmbeddings([["a", "b", "c", "a"]], { dimensions: 4, negativeSamples: 0, epochs: 3 });
    for (const vec of r.embeddings.values()) {
      for (const x of vec) assert.ok(Number.isFinite(x));
    }
  });
  it("exposes a vocab usable by downstream units", () => {
    const r = trainEmbeddings([["a", "b", "a"]], { dimensions: 4, epochs: 1 });
    assert.deepEqual(r.vocab.ids, ["a", "b"]);
    assert.equal(r.vocab.index.get("a"), 0);
    assert.deepEqual(r.vocab.counts, [2, 1]);
  });
});

describe("trainEmbeddings — onEpoch callback & lr decay", () => {
  it("calls onEpoch once per epoch with {epoch, learningRate, pairsTrained}", () => {
    const seen = [];
    trainEmbeddings([["a", "b", "c"]], { dimensions: 4, epochs: 3, onEpoch: (e) => seen.push(e) });
    assert.equal(seen.length, 3);
    assert.deepEqual(seen.map((e) => e.epoch), [0, 1, 2]);
    for (const e of seen) {
      assert.ok(typeof e.learningRate === "number");
      assert.ok(typeof e.pairsTrained === "number");
    }
  });
  it("decays the learning rate strictly across epochs", () => {
    const lrs = [];
    trainEmbeddings([["a", "b", "c"]], { dimensions: 4, epochs: 5, onEpoch: (e) => lrs.push(e.learningRate) });
    for (let i = 1; i < lrs.length; i++) {
      assert.ok(lrs[i] < lrs[i - 1], `lr should decrease: ${lrs[i - 1]} -> ${lrs[i]}`);
    }
  });
  it("never decays below minLearningRate", () => {
    const lrs = [];
    trainEmbeddings([["a", "b"]], {
      dimensions: 4, epochs: 20, learningRate: 0.02, minLearningRate: 0.015,
      onEpoch: (e) => lrs.push(e.learningRate),
    });
    for (const lr of lrs) assert.ok(lr >= 0.015);
  });
});

describe("trainEmbeddings — determinism", () => {
  const corpus = [["a", "b", "c", "d"], ["d", "c", "b", "a"], ["a", "c", "a", "d"]];
  it("produces byte-identical embeddings for the same seed", () => {
    const opts = { dimensions: 16, epochs: 6, seed: 42 };
    const r1 = trainEmbeddings(corpus, opts);
    const r2 = trainEmbeddings(corpus, opts);
    for (const id of r1.vocab.ids) {
      const v1 = r1.embeddings.get(id), v2 = r2.embeddings.get(id);
      for (let d = 0; d < v1.length; d++) {
        assert.equal(v1[d], v2[d], `divergence at ${id}[${d}]`);
      }
    }
  });
  it("produces different embeddings for different seeds", () => {
    const r1 = trainEmbeddings(corpus, { dimensions: 16, epochs: 6, seed: 1 });
    const r2 = trainEmbeddings(corpus, { dimensions: 16, epochs: 6, seed: 2 });
    let differs = false;
    const v1 = r1.embeddings.get("a"), v2 = r2.embeddings.get("a");
    for (let d = 0; d < v1.length; d++) if (v1[d] !== v2[d]) differs = true;
    assert.equal(differs, true);
  });
});

describe("cosineSimilarity", () => {
  it("returns ~1 for identical vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
  });
  it("returns ~0 for orthogonal vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);
  });
  it("returns ~-1 for opposite vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) + 1) < 1e-9);
  });
  it("returns 0 for a zero vector (no divide-by-zero)", () => {
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  });
  it("returns 0 for mismatched lengths or empty / nullish input", () => {
    assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
    assert.equal(cosineSimilarity([], []), 0);
    assert.equal(cosineSimilarity(null, [1]), 0);
  });
  it("works on Float32Array vectors", () => {
    const a = Float32Array.from([1, 2, 3]);
    assert.ok(Math.abs(cosineSimilarity(a, a) - 1) < 1e-6);
  });
});

describe("mostSimilar", () => {
  const emb = new Map([
    ["a", Float32Array.from([1, 0, 0])],
    ["b", Float32Array.from([0.9, 0.1, 0])],
    ["c", Float32Array.from([0, 1, 0])],
    ["d", Float32Array.from([0, 0, 1])],
  ]);
  it("returns the top-k most similar nodes, descending, excluding self", () => {
    const r = mostSimilar(emb, "a", 2);
    assert.equal(r.length, 2);
    assert.equal(r[0].id, "b");
    assert.ok(r[0].score >= r[1].score);
    assert.ok(!r.some((x) => x.id === "a"));
  });
  it("returns [] for a missing id or a non-Map", () => {
    assert.deepEqual(mostSimilar(emb, "zzz", 3), []);
    assert.deepEqual(mostSimilar(null, "a", 3), []);
  });
  it("returns [] for k = 0 and caps at vocab size for large k", () => {
    assert.deepEqual(mostSimilar(emb, "a", 0), []);
    assert.equal(mostSimilar(emb, "a", 999).length, 3);
  });
  it("breaks score ties deterministically by id", () => {
    const tied = new Map([
      ["a", Float32Array.from([1, 0])],
      ["m", Float32Array.from([0, 1])],
      ["z", Float32Array.from([0, 1])],
    ]);
    const r = mostSimilar(tied, "a", 2);
    assert.deepEqual(r.map((x) => x.id), ["m", "z"]);
  });
});

describe("R9 invariant — community structure separates in cosine space", () => {
  // Train once at describe scope — both invariants below read the same seeded
  // embedding (the two assertions are independent views of one model run).
  const { graph, A, B } = twoCommunityGraph();
  const walks = collectWalks(graph, { walksPerNode: 25, walkLength: 25, seed: 7 });
  assert.ok(walks.length > 0, "U3a must yield a non-empty corpus");
  const { embeddings } = trainEmbeddings(walks, {
    dimensions: 24, window: 5, epochs: 15, negativeSamples: 5, seed: 7,
  });
  const community = (id) => id[0]; // 'a' or 'b'

  // Required separation margin. The observed intra−inter cosine gap on this
  // two-clique fixture is ≈0.15; requiring ≥0.05 keeps ~3× headroom yet still
  // fails loudly if a refactor collapses separation to a hair above zero
  // (a bare `mean(intra) > mean(inter)` would pass on a 0.0001 gap).
  const MIN_SEPARATION = 0.05;

  it("embeds same-community nodes closer than cross-community nodes", () => {
    const ids = [...A, ...B];
    const intra = [], inter = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const s = cosineSimilarity(embeddings.get(ids[i]), embeddings.get(ids[j]));
        (community(ids[i]) === community(ids[j]) ? intra : inter).push(s);
      }
    }
    assert.ok(
      mean(intra) > mean(inter) + MIN_SEPARATION,
      `intra-community cosine ${mean(intra).toFixed(4)} must exceed inter ` +
      `${mean(inter).toFixed(4)} by >= ${MIN_SEPARATION}`
    );
  });

  it("places each node's nearest neighbor in its own community (majority)", () => {
    let sameCommunity = 0;
    for (const id of [...A, ...B]) {
      const top = mostSimilar(embeddings, id, 1)[0];
      if (top && community(top.id) === community(id)) sameCommunity++;
    }
    // Threshold 10 of 12: tolerates at most 2 nodes whose nearest neighbour
    // lands in the opposite clique — SGNS has failed if >=3 nodes cross over.
    assert.ok(sameCommunity >= 10, `expected >=10/12 in-community nearest neighbours, got ${sameCommunity}`);
  });
});

describe("integration — U3a walk corpus feeds U3b directly", () => {
  it("trains over collectWalks output and embeds every reachable node", () => {
    const { graph } = twoCommunityGraph();
    const walks = collectWalks(graph, { walksPerNode: 6, walkLength: 12, seed: 3 });
    const r = trainEmbeddings(walks, { dimensions: 8, epochs: 3, seed: 3 });
    assert.equal(r.corpusEmpty, false);
    assert.equal(r.embeddings.size, 12); // all 12 nodes are reachable
    assert.ok(r.pairsTrained > 0);
  });
  it("ignores an isolated node — it never enters the corpus or the embedding map", () => {
    const { graph } = twoCommunityGraph();
    graph.nodes.push({ id: "island" }); // no edges
    const walks = collectWalks(graph, { walksPerNode: 6, walkLength: 12, seed: 3 });
    const r = trainEmbeddings(walks, { dimensions: 8, epochs: 2, seed: 3 });
    assert.equal(r.embeddings.has("island"), false);
  });
});
