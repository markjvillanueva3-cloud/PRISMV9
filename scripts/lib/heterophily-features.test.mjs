// scripts/lib/heterophily-features.test.mjs — node:test for the H2GCN .mjs port.
// Reference values hand-computed on a path graph (means are exact integers → deepStrictEqual,
// no float tolerance). Mirrors the TS source-of-truth contract
// (mcp-server/src/algorithms/HeterophilyAwareAggregator.ts). No stubs — every assertion
// fails if the ego/neighbour-separation or exactly-k-hop math regresses (R9).
// NOTE: warning-string assertions use DELIBERATELY LOOSE regex (/self-loop/ etc.) — they match
// INTENT, not the verbatim TS wording. The TS (HeterophilyAwareAggregator.ts) is the canonical
// warning text; if it rewords, re-sync the .mjs per the lib header's "keep in sync" note — the
// loose regex will not flag that drift on its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MAX_HOPS,
  validateInput,
  buildAdjacency,
  hopBuckets,
  heterophilyAggregate,
  heterophilyAggregateMap,
} from "./heterophily-features.mjs";

// ── primitives: buildAdjacency / hopBuckets ──────────────────────────────────
test("buildAdjacency: undirected sets, no warning when clean", () => {
  const w = [];
  const adj = buildAdjacency(3, [[0, 1], [1, 2]], w);
  assert.deepEqual([...adj[0]], [1]);
  assert.deepEqual([...adj[1]].sort(), [0, 2]);
  assert.deepEqual([...adj[2]], [1]);
  assert.equal(w.length, 0);
});

test("buildAdjacency: drops self-loops + warns", () => {
  const w = [];
  const adj = buildAdjacency(2, [[0, 0], [0, 1]], w);
  assert.deepEqual([...adj[0]], [1]);
  assert.equal(adj[0].has(0), false);
  assert.ok(w.some((m) => /self-loop/.test(m)));
});

test("hopBuckets: exact-distance buckets on a path 0-1-2-3", () => {
  const w = [];
  const adj = buildAdjacency(4, [[0, 1], [1, 2], [2, 3]], w);
  const b = hopBuckets(adj, 0, 3);
  assert.deepEqual(b[0], [1]); // dist 1
  assert.deepEqual(b[1], [2]); // dist 2
  assert.deepEqual(b[2], [3]); // dist 3
});

// ── heterophilyAggregate: reference values on a path graph ────────────────────
// path 0-1-2-3, features [[1],[2],[3],[4]], maxHops=2, mean.
// node0: ego1 | N1{1}=2 | N2{2}=3            → [1,2,3]
// node1: ego2 | N1{0,2}=mean(1,3)=2 | N2{3}=4 → [2,2,4]
// node2: ego3 | N1{1,3}=mean(2,4)=3 | N2{0}=1 → [3,3,1]
// node3: ego4 | N1{2}=3 | N2{1}=2            → [4,3,2]
test("path graph, 1-d features, mean, maxHops=2 → exact reference embeddings", () => {
  const r = heterophilyAggregate({
    features: [[1], [2], [3], [4]],
    edges: [[0, 1], [1, 2], [2, 3]],
    maxHops: 2,
    normalize: "mean",
  });
  assert.equal(r.embeddingDim, 3);
  assert.equal(r.egoDim, 1);
  assert.deepStrictEqual(r.embeddings, [[1, 2, 3], [2, 2, 4], [3, 3, 1], [4, 3, 2]]);
  assert.deepStrictEqual(r.hopNeighborCounts, [[1, 1], [2, 1], [2, 1], [1, 1]]);
  assert.deepEqual(r.isolatedNodes, []);
});

test("sum mode aggregates without dividing (node1 N1 sum(1,3)=4)", () => {
  const r = heterophilyAggregate({
    features: [[1], [2], [3], [4]],
    edges: [[0, 1], [1, 2], [2, 3]],
    maxHops: 2,
    normalize: "sum",
  });
  // node1: ego2 | N1 sum(1,3)=4 | N2 sum(4)=4
  assert.deepStrictEqual(r.embeddings[1], [2, 4, 4]);
});

test("2-d features, maxHops=1 → ego ‖ hop1 concat keeps blocks separate", () => {
  const r = heterophilyAggregate({
    features: [[1, 0], [0, 1]],
    edges: [[0, 1]],
    maxHops: 1,
    normalize: "mean",
  });
  assert.equal(r.embeddingDim, 4);
  assert.equal(r.egoDim, 2);
  assert.deepStrictEqual(r.embeddings, [[1, 0, 0, 1], [0, 1, 1, 0]]);
});

test("default maxHops is 2", () => {
  const r = heterophilyAggregate({ features: [[1], [2]], edges: [[0, 1]] });
  assert.equal(r.maxHops, DEFAULT_MAX_HOPS);
  assert.equal(r.embeddingDim, 3); // 1 * (1 + 2)
});

// ── edge cases: isolated, self-loop, dup ─────────────────────────────────────
test("isolated node → ego-only (zero neighbour blocks) + surfaced, never silent", () => {
  const r = heterophilyAggregate({
    features: [[5], [6], [7]],
    edges: [[0, 1]], // node 2 isolated
    maxHops: 2,
    normalize: "mean",
  });
  assert.deepStrictEqual(r.embeddings[2], [7, 0, 0]);
  assert.deepEqual(r.hopNeighborCounts[2], [0, 0]);
  assert.deepEqual(r.isolatedNodes, [2]);
  assert.ok(r.warnings.some((m) => /no 1-hop neighbour/.test(m)));
});

test("duplicate undirected edge → deduped + warned", () => {
  const r = heterophilyAggregate({
    features: [[1], [2]],
    edges: [[0, 1], [1, 0]], // same undirected edge
    maxHops: 1,
  });
  assert.ok(r.warnings.some((m) => /Deduplicated 1 duplicate/.test(m)));
  assert.deepStrictEqual(r.embeddings, [[1, 2], [2, 1]]);
});

test("self-loop dropped from aggregation + warned", () => {
  const r = heterophilyAggregate({
    features: [[1], [2]],
    edges: [[0, 0], [0, 1]],
    maxHops: 1,
  });
  assert.ok(r.warnings.some((m) => /self-loop/.test(m)));
  assert.deepEqual(r.hopNeighborCounts[0], [1]); // only node 1, not self
});

// ── validation (fail-loud) ───────────────────────────────────────────────────
test("validateInput rejects empty / ragged / NaN features", () => {
  assert.equal(validateInput({ features: [], edges: [] }).valid, false);
  assert.equal(validateInput({ features: [[1], [2, 3]], edges: [] }).valid, false);
  assert.equal(validateInput({ features: [[NaN]], edges: [] }).valid, false);
  assert.equal(validateInput({ features: [[Infinity]], edges: [] }).valid, false);
});

test("validateInput rejects out-of-range edge / bad maxHops / bad normalize", () => {
  assert.equal(validateInput({ features: [[1], [2]], edges: [[0, 5]] }).valid, false);
  assert.equal(validateInput({ features: [[1]], edges: [], maxHops: 0 }).valid, false);
  assert.equal(validateInput({ features: [[1]], edges: [], normalize: "avg" }).valid, false);
});

test("maxHops > MAX_REASONABLE_HOPS warns but stays valid", () => {
  const v = validateInput({ features: [[1], [2]], edges: [[0, 1]], maxHops: 17 });
  assert.equal(v.valid, true);
  assert.ok(v.warnings.some((m) => /maxHops 17/.test(m)));
});

test("heterophilyAggregate THROWS on invalid input (fail-loud)", () => {
  assert.throws(() => heterophilyAggregate({ features: [], edges: [] }), /invalid input/);
  assert.throws(() => heterophilyAggregate({ features: [[1], [2]], edges: [[0, 9]] }), /invalid input/);
});

// ── Map adapter (pipeline surface) ───────────────────────────────────────────
test("heterophilyAggregateMap: string-keyed path graph matches index reference", () => {
  const fm = new Map([["a", [1]], ["b", [2]], ["c", [3]], ["d", [4]]]);
  const r = heterophilyAggregateMap(fm, [["a", "b"], ["b", "c"], ["c", "d"]], { maxHops: 2, normalize: "mean" });
  assert.equal(r.embeddingDim, 3);
  assert.deepStrictEqual(r.features.get("a"), [1, 2, 3]);
  assert.deepStrictEqual(r.features.get("b"), [2, 2, 4]);
  assert.deepStrictEqual(r.features.get("c"), [3, 3, 1]);
  assert.deepStrictEqual(r.features.get("d"), [4, 3, 2]);
  assert.equal(r.droppedEdges, 0);
  assert.equal(r.keptEdges, 3);
});

test("heterophilyAggregateMap: edges to unknown nodes dropped + counted, never silent", () => {
  const fm = new Map([["a", [1]], ["b", [2]]]);
  const r = heterophilyAggregateMap(fm, [["a", "b"], ["b", "z"]], { maxHops: 1 });
  assert.equal(r.droppedEdges, 1);
  assert.equal(r.keptEdges, 1);
  assert.ok(r.warnings.some((m) => /outside the feature set/.test(m)));
  assert.deepStrictEqual(r.features.get("a"), [1, 2]);
});

test("heterophilyAggregateMap: accepts {u,v} and {source,target} edge shapes", () => {
  const fm = new Map([["a", [1]], ["b", [2]]]);
  const r1 = heterophilyAggregateMap(fm, [{ u: "a", v: "b" }], { maxHops: 1 });
  const r2 = heterophilyAggregateMap(fm, [{ source: "a", target: "b" }], { maxHops: 1 });
  assert.deepStrictEqual(r1.features.get("a"), [1, 2]);
  assert.deepStrictEqual(r2.features.get("a"), [1, 2]);
});

test("heterophilyAggregateMap: accepts Float64Array rows (GraphSAGE pipeline shape)", () => {
  // projectGraphFeatures yields Float64Array vectors; the adapter must Array.from them
  // (the pure core's validateInput uses Array.isArray, which rejects typed arrays).
  const fm = new Map([["a", Float64Array.from([1, 0])], ["b", Float64Array.from([0, 1])]]);
  const r = heterophilyAggregateMap(fm, [["a", "b"]], { maxHops: 1, normalize: "mean" });
  assert.equal(r.embeddingDim, 4);
  assert.deepStrictEqual(r.features.get("a"), [1, 0, 0, 1]);
  assert.deepStrictEqual(r.features.get("b"), [0, 1, 1, 0]);
});

test("heterophilyAggregateMap: isolated node id surfaced; throws on empty/non-Map", () => {
  const fm = new Map([["a", [1]], ["b", [2]], ["iso", [9]]]);
  const r = heterophilyAggregateMap(fm, [["a", "b"]], { maxHops: 1 });
  assert.deepEqual(r.isolatedNodes, ["iso"]);
  assert.throws(() => heterophilyAggregateMap(new Map(), []), /non-empty Map/);
  assert.throws(() => heterophilyAggregateMap([], []), /non-empty Map/);
});

// ── maxHops≥3: lock the per-hop stride (base = d*(h+1)) for the 3rd+ block ─────
// path 0-1-2-3-4, features [[1],[2],[3],[4],[5]], maxHops=3, mean.
// node0: ego1 | N1{1}=2 | N2{2}=3 | N3{3}=4              → [1,2,3,4]  (node4 is dist 4, beyond cap)
// node2: ego3 | N1{1,3}=mean(2,4)=3 | N2{0,4}=mean(1,5)=3 | N3{}=0 → [3,3,3,0] (dist-3 empty → zero block)
test("maxHops=3 → 4 blocks, exact stride incl. empty higher-hop zero block", () => {
  const r = heterophilyAggregate({
    features: [[1], [2], [3], [4], [5]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    maxHops: 3,
    normalize: "mean",
  });
  assert.equal(r.embeddingDim, 4); // 1 * (1 + 3)
  assert.deepStrictEqual(r.embeddings[0], [1, 2, 3, 4]);
  assert.deepStrictEqual(r.hopNeighborCounts[0], [1, 1, 1]); // node4 (dist 4) excluded by cap
  assert.deepStrictEqual(r.embeddings[2], [3, 3, 3, 0]); // dist-3 empty → trailing zero block
  assert.deepStrictEqual(r.hopNeighborCounts[2], [2, 2, 0]);
  assert.deepEqual(r.isolatedNodes, []);
});

// ── adapter output Map iteration order == featuresMap insertion order (contract) ──
test("heterophilyAggregateMap: output Map preserves featuresMap insertion order", () => {
  const fm = new Map([["z", [1]], ["a", [2]], ["m", [3]]]); // non-alphabetical insertion
  const r = heterophilyAggregateMap(fm, [["z", "a"], ["a", "m"]], { maxHops: 1 });
  assert.deepEqual([...r.features.keys()], ["z", "a", "m"]);
});
