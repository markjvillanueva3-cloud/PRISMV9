#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE — tests for hybrid-retrieval.mjs
// Coverage: 4 export fns × happy + null + injection-failure + RRF math + ordering
// + per-source skip independence.

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  hitDocId,
  rrfMerge,
  episodeKeywordSearch,
  defaultEmbed,
  defaultQdrantSearch,
  hybridSearch,
  __test_constants,
} from "./hybrid-retrieval.mjs";

// --- hitDocId --------------------------------------------------------------

test("hitDocId: prefers explicit id", () => {
  assert.equal(hitDocId({ id: "alpha", name: "beta" }), "alpha");
});

test("hitDocId: falls back to name", () => {
  assert.equal(hitDocId({ name: "beta" }), "beta");
});

test("hitDocId: pulls payload.node_id (Qdrant shape)", () => {
  assert.equal(hitDocId({ payload: { node_id: "engine-x" }, score: 0.9 }), "engine-x");
});

test("hitDocId: pulls episode.id (episode shape)", () => {
  assert.equal(hitDocId({ episode: { id: "ep-abc" }, score: 3 }), "ep-abc");
});

test("hitDocId: falls back to file", () => {
  assert.equal(hitDocId({ file: "x.md" }), "x.md");
});

test("hitDocId: returns null for unidentifiable hits", () => {
  assert.equal(hitDocId({ score: 0.5 }), null);
  assert.equal(hitDocId(null), null);
  assert.equal(hitDocId(undefined), null);
  assert.equal(hitDocId("string"), null);
});

test("hitDocId: rejects empty strings", () => {
  assert.equal(hitDocId({ id: "", name: "" }), null);
});

// --- rrfMerge --------------------------------------------------------------

test("rrfMerge: single list returns docs in same order", () => {
  const out = rrfMerge([
    { source: "memory", hits: [{ id: "a" }, { id: "b" }, { id: "c" }] },
  ]);
  assert.deepEqual(out.map((e) => e.id), ["a", "b", "c"]);
});

test("rrfMerge: docs in multiple lists fuse with higher score", () => {
  const out = rrfMerge([
    { source: "memory", hits: [{ id: "a" }, { id: "b" }] },
    { source: "vector", hits: [{ id: "b" }, { id: "c" }] },
  ]);
  // 'b' is in both lists: 1/(60+2) + 1/(60+1) = ~0.0327
  // 'a' is only memory rank 1: 1/61 = ~0.0164
  // 'c' is only vector rank 2: 1/62 = ~0.0161
  assert.equal(out[0].id, "b");
  assert.equal(out[0].surfaces.memory, 2);
  assert.equal(out[0].surfaces.vector, 1);
  assert.ok(out[0].score > out[1].score);
});

test("rrfMerge: weights bias fused score", () => {
  const out = rrfMerge(
    [
      { source: "memory", hits: [{ id: "x" }] },
      { source: "vector", hits: [{ id: "y" }] },
    ],
    { weights: { memory: 10.0, vector: 0.1 } }
  );
  assert.equal(out[0].id, "x");
});

test("rrfMerge: custom k changes fusion strength", () => {
  const lo = rrfMerge([{ source: "memory", hits: [{ id: "a" }] }], { k: 1 });
  const hi = rrfMerge([{ source: "memory", hits: [{ id: "a" }] }], { k: 1000 });
  assert.ok(lo[0].score > hi[0].score);
});

test("rrfMerge: skips hits without identifiable doc id", () => {
  const out = rrfMerge([
    { source: "memory", hits: [{ id: "a" }, { score: 0.5 }, { id: "b" }] },
  ]);
  assert.deepEqual(out.map((e) => e.id), ["a", "b"]);
});

test("rrfMerge: empty / non-array input returns []", () => {
  assert.deepEqual(rrfMerge([]), []);
  assert.deepEqual(rrfMerge(null), []);
  assert.deepEqual(rrfMerge(undefined), []);
});

test("rrfMerge: surfaces map records rank per source", () => {
  const out = rrfMerge([
    { source: "master", hits: [{ id: "x" }, { id: "y" }] },
    { source: "episode", hits: [{ id: "y" }, { id: "x" }] },
  ]);
  const entryX = out.find((e) => e.id === "x");
  assert.equal(entryX.surfaces.master, 1);
  assert.equal(entryX.surfaces.episode, 2);
});

test("rrfMerge: ignores malformed list entries", () => {
  const out = rrfMerge([
    null,
    "garbage",
    { source: "memory", hits: [{ id: "ok" }] },
    { hits: "not-an-array" },
  ]);
  assert.deepEqual(out.map((e) => e.id), ["ok"]);
});

// --- episodeKeywordSearch --------------------------------------------------

const sampleStore = () => ({
  episodes: [
    { id: "ep-1", source: "git-commit", source_id: "abc123", body: "fix qdrant populate batch", entities: [{ name: "QdrantEngine" }] },
    { id: "ep-2", source: "scrutiny-ledger", source_id: null, body: "hybrid retrieval design", entities: [] },
    { id: "ep-3", source: "memory-write", source_id: null, body: "old episode that's been superseded", entities: [], valid_until: "2026-05-01T00:00:00Z" },
    { id: "ep-4", source: "git-commit", source_id: "xyz789", body: "wire hybrid retrieval to MCP", entities: [{ name: "HybridRetrieval" }] },
  ],
});

test("episodeKeywordSearch: returns highest-token-overlap first", () => {
  const out = episodeKeywordSearch(sampleStore(), ["hybrid", "retrieval"]);
  // Both ep-2 and ep-4 contain both tokens → score 2; tiebreak by id asc → ep-2 first
  assert.equal(out[0].id, "ep-2");
  assert.equal(out[0].score, 2);
  assert.equal(out[1].id, "ep-4");
  assert.equal(out[1].score, 2);
});

test("episodeKeywordSearch: skips superseded episodes", () => {
  const out = episodeKeywordSearch(sampleStore(), ["old"]);
  assert.deepEqual(out, []);
});

test("episodeKeywordSearch: matches entity names", () => {
  const out = episodeKeywordSearch(sampleStore(), ["qdrantengine"]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "ep-1");
});

test("episodeKeywordSearch: limit caps results", () => {
  const big = { episodes: Array.from({ length: 100 }, (_, i) => ({ id: `e-${i}`, body: "hybrid", source: "x" })) };
  const out = episodeKeywordSearch(big, ["hybrid"], { limit: 5 });
  assert.equal(out.length, 5);
});

test("episodeKeywordSearch: empty inputs return []", () => {
  assert.deepEqual(episodeKeywordSearch(null, ["x"]), []);
  assert.deepEqual(episodeKeywordSearch(sampleStore(), []), []);
  assert.deepEqual(episodeKeywordSearch(sampleStore(), null), []);
});

test("episodeKeywordSearch: deterministic tiebreak by id", () => {
  const store = { episodes: [
    { id: "ep-z", source: "git", body: "x" },
    { id: "ep-a", source: "git", body: "x" },
  ]};
  const out = episodeKeywordSearch(store, ["x"]);
  assert.equal(out[0].id, "ep-a");  // alphabetical tie-break
});

// --- defaultEmbed ----------------------------------------------------------

test("defaultEmbed: returns embedding on success", () => {
  const sendImpl = () => ({ status: 0, stdout: JSON.stringify({ embedding: [0.1, 0.2, 0.3] }) });
  const out = defaultEmbed("test query", { sendImpl });
  assert.deepEqual(out, [0.1, 0.2, 0.3]);
});

test("defaultEmbed: null on missing sendImpl", () => {
  assert.equal(defaultEmbed("query"), null);
});

test("defaultEmbed: null on subprocess failure", () => {
  const sendImpl = () => ({ status: 1, stderr: "connection refused" });
  assert.equal(defaultEmbed("q", { sendImpl }), null);
});

test("defaultEmbed: null on malformed JSON", () => {
  const sendImpl = () => ({ status: 0, stdout: "not json" });
  assert.equal(defaultEmbed("q", { sendImpl }), null);
});

test("defaultEmbed: null on missing embedding field", () => {
  const sendImpl = () => ({ status: 0, stdout: JSON.stringify({ other: "field" }) });
  assert.equal(defaultEmbed("q", { sendImpl }), null);
});

test("defaultEmbed: null on empty embedding", () => {
  const sendImpl = () => ({ status: 0, stdout: JSON.stringify({ embedding: [] }) });
  assert.equal(defaultEmbed("q", { sendImpl }), null);
});

test("defaultEmbed: null on empty query", () => {
  const sendImpl = () => ({ status: 0, stdout: JSON.stringify({ embedding: [0.1] }) });
  assert.equal(defaultEmbed("", { sendImpl }), null);
});

// --- defaultQdrantSearch ---------------------------------------------------

test("defaultQdrantSearch: normalizes hits with node_id payload", () => {
  const sendImpl = () => ({
    status: 0,
    stdout: JSON.stringify({ result: [
      { id: 1, score: 0.95, payload: { node_id: "engine-a" } },
      { id: 2, score: 0.88, payload: { node_id: "engine-b" } },
    ]}),
  });
  const out = defaultQdrantSearch({ vector: [0.1, 0.2], sendImpl });
  assert.equal(out.length, 2);
  assert.equal(out[0].id, "engine-a");
  assert.equal(out[0].score, 0.95);
});

test("defaultQdrantSearch: empty on no vector", () => {
  assert.deepEqual(defaultQdrantSearch({ vector: [], sendImpl: () => ({}) }), []);
});

test("defaultQdrantSearch: empty on subprocess failure", () => {
  const sendImpl = () => ({ status: 1 });
  assert.deepEqual(defaultQdrantSearch({ vector: [0.1], sendImpl }), []);
});

test("defaultQdrantSearch: empty on malformed JSON", () => {
  const sendImpl = () => ({ status: 0, stdout: "garbage" });
  assert.deepEqual(defaultQdrantSearch({ vector: [0.1], sendImpl }), []);
});

test("defaultQdrantSearch: fallback to point id when node_id missing", () => {
  const sendImpl = () => ({ status: 0, stdout: JSON.stringify({ result: [{ id: 42, score: 0.5 }] }) });
  const out = defaultQdrantSearch({ vector: [0.1], sendImpl });
  assert.equal(out[0].id, "42");
});

// --- hybridSearch (the fan-out) --------------------------------------------

test("hybridSearch: empty query → empty result with skip trace", () => {
  const out = hybridSearch("");
  assert.deepEqual(out.results, []);
  assert.equal(out.trace.skipped[0].reason, "empty-query");
});

test("hybridSearch: no impls → all 4 substrates skipped", () => {
  const out = hybridSearch("hello world");
  assert.equal(out.surfacesQueried, 0);
  assert.equal(out.trace.skipped.length, 4);
});

test("hybridSearch: fans out to all 4 substrates when injected", () => {
  const runMemoryIndexSearch = () => ({ hits: [{ id: "mem-1" }, { id: "shared" }], tokens: ["x"] });
  const runMasterIndexSearch = () => ({ hits: [{ id: "master-1" }, { id: "shared" }], tokens: ["x"] });
  const loadStore = () => ({ episodes: [{ id: "ep-shared", body: "x query", source: "git", source_id: "shared" }] });
  const embedImpl = () => [0.1, 0.2];
  const qdrantSearch = () => [{ id: "vec-1" }, { id: "shared" }];
  const out = hybridSearch("x query", { runMemoryIndexSearch, runMasterIndexSearch, loadStore, embedImpl, qdrantSearch });
  assert.equal(out.surfacesQueried, 4);
  assert.equal(out.results[0].id, "shared");  // appears in 3 substrates → highest fused
  assert.equal(Object.keys(out.results[0].surfaces).length, 3);
});

test("hybridSearch: failing substrate is recorded + others still run", () => {
  const runMemoryIndexSearch = () => { throw new Error("disk read fail"); };
  const runMasterIndexSearch = () => ({ hits: [{ id: "ok" }], tokens: [] });
  const out = hybridSearch("test", { runMemoryIndexSearch, runMasterIndexSearch, includeEpisode: false, includeVector: false });
  assert.equal(out.surfacesQueried, 1);
  assert.equal(out.trace.skipped.find((s) => s.source === "memory").error, "disk read fail");
  assert.equal(out.results[0].id, "ok");
});

test("hybridSearch: embed failure skips vector leg cleanly", () => {
  const embedImpl = () => null;
  const out = hybridSearch("test", { embedImpl, includeMemory: false, includeMaster: false, includeEpisode: false });
  assert.equal(out.surfacesQueried, 0);
  assert.equal(out.trace.skipped.find((s) => s.source === "vector").reason, "embed-failed");
});

test("hybridSearch: vector with no qdrantSearch is skipped", () => {
  const embedImpl = () => [0.1, 0.2];
  const out = hybridSearch("test", { embedImpl, includeMemory: false, includeMaster: false, includeEpisode: false });
  assert.equal(out.trace.skipped.find((s) => s.source === "vector").reason, "no-qdrant-impl");
});

test("hybridSearch: includeMemory=false drops the leg entirely", () => {
  const runMemoryIndexSearch = () => ({ hits: [{ id: "x" }], tokens: [] });
  const out = hybridSearch("test", { runMemoryIndexSearch, includeMemory: false, includeMaster: false, includeEpisode: false, includeVector: false });
  assert.equal(out.surfacesQueried, 0);
  assert.equal(out.trace.skipped.length, 0);
});

test("hybridSearch: topK limits final result count", () => {
  const runMemoryIndexSearch = () => ({ hits: Array.from({ length: 50 }, (_, i) => ({ id: `m-${i}` })), tokens: [] });
  const out = hybridSearch("test", { runMemoryIndexSearch, topK: 5, includeMaster: false, includeEpisode: false, includeVector: false });
  assert.equal(out.results.length, 5);
});

test("hybridSearch: trace.sources records vectorDim for vector leg", () => {
  const embedImpl = () => [0.1, 0.2, 0.3, 0.4];
  const qdrantSearch = () => [{ id: "v" }];
  const out = hybridSearch("test", { embedImpl, qdrantSearch, includeMemory: false, includeMaster: false, includeEpisode: false });
  assert.equal(out.trace.sources.find((s) => s.source === "vector").vectorDim, 4);
});

test("hybridSearch: result entries carry per-source raw hits for provenance", () => {
  const runMemoryIndexSearch = () => ({ hits: [{ id: "shared", file: "memo.md", score: 12 }], tokens: [] });
  const qdrantSearch = () => [{ id: "shared", score: 0.95, payload: { node_id: "shared" } }];
  const out = hybridSearch("test", {
    runMemoryIndexSearch,
    embedImpl: () => [0.1],
    qdrantSearch,
    includeMaster: false,
    includeEpisode: false,
  });
  assert.equal(out.results[0].hits.memory.file, "memo.md");
  assert.equal(out.results[0].hits.vector.score, 0.95);
});

test("__test_constants: exports tunables", () => {
  assert.equal(__test_constants.DEFAULT_RRF_K, 60);
  assert.equal(__test_constants.DEFAULT_TOP_K, 10);
  assert.equal(__test_constants.DEFAULT_QDRANT_COLLECTION, "prism_engines");
});
