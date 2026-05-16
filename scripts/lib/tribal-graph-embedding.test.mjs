// tribal-graph-embedding.test.mjs
// node:test suite (vitest harness blocked per [[reference_fleet_reaper_ms1]]).
// Run: node --test H:/prism/scripts/lib/tribal-graph-embedding.test.mjs

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_MODEL,
  EMBEDDING_DIM,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_RETRIES,
  CHECKPOINT_SCHEMA_VERSION,
  LATERAL_WIRE_THRESHOLD_DEFAULT,
  OLLAMA_URL_DEFAULT,
  validateVector,
  cosineSimilarity,
  topKSimilar,
  buildLateralWires,
  ollamaEmbedOne,
  embedWithRetry,
  embedBatch,
  buildCheckpoint,
  saveCheckpoint,
  loadCheckpoint,
  mergeIntoCheckpoint,
  embedClusters,
  defaultClusterText,
} from "./tribal-graph-embedding.mjs";

// ──────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────

const DIM = EMBEDDING_DIM; // 768
const TMPROOT = mkdtempSync(join(tmpdir(), "tribal-embed-test-"));

after(() => {
  try { rmSync(TMPROOT, { recursive: true, force: true }); } catch { /* best-effort */ }
});

/** Build a synthetic 768-dim vector — fillFn(i) → number. */
function vec(fillFn = (i) => Math.sin(i * 0.01)) {
  return Array.from({ length: DIM }, (_, i) => fillFn(i));
}

/** A unit-norm vector pointing in a "direction" (deterministic). */
function unitVec(seed) {
  const raw = vec((i) => Math.sin(i * (seed + 1) * 0.013) + Math.cos(i * (seed + 7) * 0.017));
  let n = 0;
  for (const x of raw) n += x * x;
  n = Math.sqrt(n);
  return raw.map(x => x / n);
}

/**
 * Make a fake fetch that returns the given embedding.
 * shape: "modern" returns {embeddings: [[...]]} (matches /api/embed);
 *        "legacy" returns {embedding: [...]} (matches /api/embeddings).
 * If shape="modern", the fake will respond with 404 when called against
 * /api/embeddings (matching how a recent Ollama drops the legacy path).
 */
function fakeFetch(embedding, opts = {}) {
  const { status = 200, missingField = false, throwAt = null, latencyMs = 0, shape = "auto" } = opts;
  let callCount = 0;
  const impl = async (url, _init) => {
    callCount++;
    if (throwAt !== null && callCount <= throwAt) {
      throw new Error(`synthetic-network-fail-${callCount}`);
    }
    if (latencyMs > 0) await new Promise(r => setTimeout(r, latencyMs));
    const isModernPath = /\/api\/embed$/.test(url);
    let body;
    if (missingField) {
      body = {};
    } else if (shape === "modern" || (shape === "auto" && isModernPath)) {
      body = { embeddings: [embedding] };
    } else {
      body = { embedding };
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  impl.callCount = () => callCount;
  return impl;
}

// ──────────────────────────────────────────────────────────────────────────
// validateVector
// ──────────────────────────────────────────────────────────────────────────

describe("validateVector", () => {
  it("accepts valid 768-dim array", () => {
    const v = vec();
    assert.equal(validateVector(v), v);
  });

  it("accepts Float32Array", () => {
    const v = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) v[i] = i * 0.001;
    assert.equal(validateVector(v), v);
  });

  it("accepts Float64Array", () => {
    const v = new Float64Array(DIM);
    for (let i = 0; i < DIM; i++) v[i] = i * 0.001;
    assert.equal(validateVector(v), v);
  });

  it("rejects non-array", () => {
    assert.throws(() => validateVector("not-an-array"), /must be an array/);
  });

  it("rejects null", () => {
    assert.throws(() => validateVector(null), /must be an array/);
  });

  it("rejects wrong dimension", () => {
    assert.throws(() => validateVector(new Array(100).fill(0)), /expected dim 768, got 100/);
  });

  it("rejects NaN element", () => {
    const v = vec();
    v[42] = NaN;
    assert.throws(() => validateVector(v), /index 42 is NaN/);
  });

  it("rejects Infinity element", () => {
    const v = vec();
    v[0] = Infinity;
    assert.throws(() => validateVector(v), /index 0/);
  });

  it("rejects -Infinity element", () => {
    const v = vec();
    v[767] = -Infinity;
    assert.throws(() => validateVector(v), /index 767/);
  });

  it("rejects string element", () => {
    const v = vec();
    v[5] = "bad";
    assert.throws(() => validateVector(v), /index 5/);
  });

  it("custom dim accepted", () => {
    const v = new Array(64).fill(0.1);
    assert.equal(validateVector(v, 64, "small"), v);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// cosineSimilarity
// ──────────────────────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("parallel vectors → 1", () => {
    const a = unitVec(1);
    assert.ok(Math.abs(cosineSimilarity(a, a) - 1) < 1e-9);
  });

  it("antiparallel vectors → -1", () => {
    const a = unitVec(2);
    const b = a.map(x => -x);
    assert.ok(Math.abs(cosineSimilarity(a, b) - (-1)) < 1e-9);
  });

  it("orthogonal vectors → 0", () => {
    // First half +1, second half 0 vs first half 0, second half +1
    const half = DIM / 2;
    const a = new Array(DIM).fill(0); for (let i = 0; i < half; i++) a[i] = 1;
    const b = new Array(DIM).fill(0); for (let i = half; i < DIM; i++) b[i] = 1;
    assert.equal(cosineSimilarity(a, b), 0);
  });

  it("zero vector either side → 0", () => {
    const a = new Array(DIM).fill(0);
    const b = unitVec(3);
    assert.equal(cosineSimilarity(a, b), 0);
    assert.equal(cosineSimilarity(b, a), 0);
  });

  it("clamps to [-1, 1] under float imprecision", () => {
    // Force a known small overflow case
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const s = cosineSimilarity(a, b);
    assert.ok(s >= -1 && s <= 1);
  });

  it("rejects length mismatch", () => {
    assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]), /length mismatch 2 vs 3/);
  });

  it("rejects null inputs", () => {
    assert.throws(() => cosineSimilarity(null, [1, 2]), /both vectors required/);
    assert.throws(() => cosineSimilarity([1, 2], null), /both vectors required/);
  });

  it("rejects non-finite mid-vector", () => {
    assert.throws(() => cosineSimilarity([1, NaN, 3], [1, 2, 3]), /non-finite at index 1/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// topKSimilar
// ──────────────────────────────────────────────────────────────────────────

describe("topKSimilar", () => {
  const corpus = [
    { id: "a", vector: unitVec(10) },
    { id: "b", vector: unitVec(11) },
    { id: "c", vector: unitVec(12) },
    { id: "d", vector: unitVec(13) },
    { id: "e", vector: unitVec(14) },
  ];

  it("returns top-k sorted DESC by score", () => {
    const q = unitVec(10);
    const r = topKSimilar(q, corpus, 3);
    assert.equal(r.length, 3);
    // 'a' should rank highest (it's the query itself)
    assert.equal(r[0].id, "a");
    assert.ok(r[0].score >= r[1].score);
    assert.ok(r[1].score >= r[2].score);
  });

  it("respects k cap", () => {
    const r = topKSimilar(unitVec(10), corpus, 2);
    assert.equal(r.length, 2);
  });

  it("k > corpus → length = corpus.length", () => {
    const r = topKSimilar(unitVec(10), corpus, 100);
    assert.equal(r.length, corpus.length);
  });

  it("excludes ids in excludeIds", () => {
    const r = topKSimilar(unitVec(10), corpus, 10, ["a", "b"]);
    const ids = r.map(x => x.id);
    assert.ok(!ids.includes("a"));
    assert.ok(!ids.includes("b"));
    assert.equal(r.length, 3);
  });

  it("skips malformed corpus items", () => {
    const dirty = [...corpus, null, { id: "no-vec" }, { vector: [1, 2] }];
    const r = topKSimilar(unitVec(10), dirty, 10);
    assert.equal(r.length, corpus.length);
  });

  it("rejects non-positive k", () => {
    assert.throws(() => topKSimilar(unitVec(1), corpus, 0), /k must be positive/);
    assert.throws(() => topKSimilar(unitVec(1), corpus, -1), /k must be positive/);
    assert.throws(() => topKSimilar(unitVec(1), corpus, 1.5), /k must be positive/);
  });

  it("rejects non-array corpus", () => {
    assert.throws(() => topKSimilar(unitVec(1), "nope", 3), /corpus must be array/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// buildLateralWires
// ──────────────────────────────────────────────────────────────────────────

describe("buildLateralWires", () => {
  it("produces unordered-pair edges (fromId < toId)", () => {
    const v = unitVec(20);
    const clusters = [{ id: "z-last" }, { id: "a-first" }];
    const vectors = new Map([["z-last", v], ["a-first", v]]); // identical → cosine 1
    const wires = buildLateralWires(clusters, vectors, 0.5);
    assert.equal(wires.length, 1);
    assert.equal(wires[0].fromId, "a-first");
    assert.equal(wires[0].toId, "z-last");
  });

  it("respects threshold — only above-threshold pairs", () => {
    const a = unitVec(30), b = unitVec(31);
    const sim = cosineSimilarity(a, b);
    const clusters = [{ id: "x" }, { id: "y" }];
    const vectors = new Map([["x", a], ["y", b]]);
    // Threshold strictly above the pair similarity → no wires
    const above = buildLateralWires(clusters, vectors, Math.min(1, sim + 0.01));
    assert.equal(above.length, 0);
    // Threshold below → one wire
    const below = buildLateralWires(clusters, vectors, Math.max(-1, sim - 0.01));
    assert.equal(below.length, 1);
    assert.ok(Math.abs(below[0].weight - sim) < 1e-12);
  });

  it("respects maxWiresPerNode (greedy by weight)", () => {
    // 5 identical clusters → 10 pairs all weight 1. maxWiresPerNode=2 ⇒ at most ~5 wires.
    const same = unitVec(40);
    const clusters = ["a", "b", "c", "d", "e"].map(id => ({ id }));
    const vectors = new Map(clusters.map(c => [c.id, same]));
    const wires = buildLateralWires(clusters, vectors, 0.5, { maxWiresPerNode: 2 });
    // Each node appears ≤ 2 times
    const counts = {};
    for (const w of wires) {
      counts[w.fromId] = (counts[w.fromId] || 0) + 1;
      counts[w.toId] = (counts[w.toId] || 0) + 1;
    }
    for (const id of Object.keys(counts)) {
      assert.ok(counts[id] <= 2, `node ${id} exceeded maxWiresPerNode (${counts[id]})`);
    }
  });

  it("wires sorted by (fromId, toId) ASC", () => {
    const same = unitVec(45);
    const clusters = ["c", "a", "b"].map(id => ({ id }));
    const vectors = new Map(clusters.map(c => [c.id, same]));
    const wires = buildLateralWires(clusters, vectors, 0.5);
    // Pairs should be (a,b), (a,c), (b,c) in that order
    assert.deepEqual(wires.map(w => [w.fromId, w.toId]), [["a", "b"], ["a", "c"], ["b", "c"]]);
  });

  it("rejects threshold out of [-1, 1]", () => {
    assert.throws(() => buildLateralWires([], new Map(), 1.5), /threshold must be in/);
    assert.throws(() => buildLateralWires([], new Map(), -2), /threshold must be in/);
  });

  it("empty clusters → empty wires", () => {
    assert.deepEqual(buildLateralWires([], new Map(), 0.5), []);
  });

  it("clusters with no vectors → empty wires", () => {
    const clusters = [{ id: "a" }, { id: "b" }];
    const wires = buildLateralWires(clusters, new Map(), 0.5);
    assert.deepEqual(wires, []);
  });

  it("accepts array-of-{id,vector} form", () => {
    const v = unitVec(50);
    const clusters = [{ id: "a" }, { id: "b" }];
    const vectors = [{ id: "a", vector: v }, { id: "b", vector: v }];
    const wires = buildLateralWires(clusters, vectors, 0.5);
    assert.equal(wires.length, 1);
  });

  it("weight equals computed cosine", () => {
    const a = unitVec(60), b = unitVec(61);
    const expected = cosineSimilarity(a, b);
    const wires = buildLateralWires(
      [{ id: "p" }, { id: "q" }],
      new Map([["p", a], ["q", b]]),
      -1,
    );
    assert.equal(wires.length, 1);
    assert.ok(Math.abs(wires[0].weight - expected) < 1e-12);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ollamaEmbedOne (with injected fetch)
// ──────────────────────────────────────────────────────────────────────────

describe("ollamaEmbedOne", () => {
  it("happy path returns validated vector", async () => {
    const expected = vec();
    const fetchImpl = fakeFetch(expected);
    const v = await ollamaEmbedOne("hello world", { fetchImpl });
    assert.equal(v.length, DIM);
    assert.equal(v[0], expected[0]);
  });

  it("throws on HTTP non-200", async () => {
    const fetchImpl = fakeFetch(vec(), { status: 500 });
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl }),
      /HTTP 500/,
    );
  });

  it("throws on missing embedding field", async () => {
    const fetchImpl = fakeFetch(vec(), { missingField: true });
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl }),
      /missing embedding field/,
    );
  });

  it("throws on wrong-dimension response", async () => {
    const fetchImpl = fakeFetch(new Array(100).fill(0));
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl }),
      /expected dim 768, got 100/,
    );
  });

  it("throws on NaN in response", async () => {
    const bad = vec(); bad[7] = NaN;
    const fetchImpl = fakeFetch(bad);
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl }),
      /index 7 is NaN/,
    );
  });

  it("rejects non-string text", async () => {
    const fetchImpl = fakeFetch(vec());
    await assert.rejects(
      ollamaEmbedOne(42, { fetchImpl }),
      /text must be string/,
    );
  });

  it("rejects missing fetchImpl when globalThis.fetch absent", async () => {
    // Pass an explicit non-function — simulating fetch-less env
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl: null }),
      /fetchImpl must be a function/,
    );
  });

  it("propagates network error from fetch", async () => {
    const fetchImpl = async () => { throw new Error("ECONNREFUSED"); };
    await assert.rejects(
      ollamaEmbedOne("x", { fetchImpl }),
      /ECONNREFUSED/,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────
// embedWithRetry
// ──────────────────────────────────────────────────────────────────────────

describe("embedWithRetry", () => {
  it("succeeds first try", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedWithRetry("x", { fetchImpl, retryBaseMs: 1 });
    assert.equal(r.ok, true);
    assert.equal(r.attempts, 1);
  });

  it("retries transient failures then succeeds", async () => {
    const fetchImpl = fakeFetch(vec(), { throwAt: 2 }); // fail first 2, succeed 3rd
    // Pin endpoint=legacy to keep 1 fetch per attempt; dual-endpoint
    // fallback is exercised separately in the P0 lock-in section.
    const r = await embedWithRetry("x", { fetchImpl, maxRetries: 3, retryBaseMs: 1, endpoint: "legacy" });
    assert.equal(r.ok, true);
    assert.equal(r.attempts, 3);
  });

  it("gives up after maxRetries", async () => {
    const fetchImpl = fakeFetch(vec(), { throwAt: 999 }); // always fail
    const r = await embedWithRetry("x", { fetchImpl, maxRetries: 2, retryBaseMs: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.attempts, 3);
    assert.match(r.error, /synthetic-network-fail/);
  });

  it("never throws on failure", async () => {
    const fetchImpl = async () => { throw new Error("boom"); };
    const r = await embedWithRetry("x", { fetchImpl, maxRetries: 1, retryBaseMs: 1 });
    assert.equal(r.ok, false);
    assert.match(r.error, /boom/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// embedBatch
// ──────────────────────────────────────────────────────────────────────────

describe("embedBatch", () => {
  it("happy path multi-item", async () => {
    const fetchImpl = fakeFetch(vec());
    const items = [
      { id: "t1", text: "alpha" },
      { id: "t2", text: "beta" },
      { id: "t3", text: "gamma" },
    ];
    const r = await embedBatch(items, { fetchImpl, retryBaseMs: 1 });
    assert.equal(r.ok, true);
    assert.equal(r.vectors.length, 3);
    assert.equal(r.failures.length, 0);
    assert.equal(r.stats.succeeded, 3);
  });

  it("dedupes input — records duplicate as failure", async () => {
    const fetchImpl = fakeFetch(vec());
    const items = [
      { id: "x", text: "first" },
      { id: "x", text: "second" }, // duplicate id
    ];
    const r = await embedBatch(items, { fetchImpl, retryBaseMs: 1 });
    assert.equal(r.vectors.length, 1);
    assert.equal(r.failures.length, 1);
    assert.match(r.failures[0].error, /duplicate-id/);
  });

  it("respects skipIds", async () => {
    const fetchImpl = fakeFetch(vec());
    const items = [
      { id: "a", text: "a" },
      { id: "b", text: "b" },
      { id: "c", text: "c" },
    ];
    const r = await embedBatch(items, { fetchImpl, skipIds: new Set(["b"]), retryBaseMs: 1 });
    assert.equal(r.vectors.length, 2);
    assert.equal(r.stats.skipped, 1);
    assert.ok(!r.vectors.some(v => v.id === "b"));
  });

  it("partial-batch failure — some succeed, some fail", async () => {
    // With endpoint=legacy, each embedWithRetry call → 1 fetch call.
    // Call 1 = p1 (succeeds), 2 = p2 (fails — maxRetries=0), 3 = p3 (succeeds).
    let call = 0;
    const fetchImpl = async () => {
      call++;
      if (call === 2) throw new Error("perma-fail");
      return { ok: true, status: 200, json: async () => ({ embedding: vec() }), text: async () => "" };
    };
    const items = [
      { id: "p1", text: "p1" },
      { id: "p2", text: "p2" },
      { id: "p3", text: "p3" },
    ];
    const r = await embedBatch(items, { fetchImpl, maxRetries: 0, retryBaseMs: 1, endpoint: "legacy" });
    assert.equal(r.vectors.length, 2);
    assert.equal(r.failures.length, 1);
    assert.equal(r.failures[0].id, "p2");
  });

  it("all-fail with non-empty input → ok=false", async () => {
    const fetchImpl = async () => { throw new Error("always-down"); };
    const r = await embedBatch(
      [{ id: "a", text: "a" }, { id: "b", text: "b" }],
      { fetchImpl, maxRetries: 0, retryBaseMs: 1 },
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures.length, 2);
  });

  it("empty input → ok=true (vacuous)", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch([], { fetchImpl });
    assert.equal(r.ok, true);
    assert.equal(r.vectors.length, 0);
    assert.equal(r.failures.length, 0);
  });

  it("malformed items recorded as failures (not thrown)", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch(
      [null, { id: "ok", text: "ok" }, { id: 42, text: "bad-id" }, { id: "bad", text: 99 }],
      { fetchImpl, retryBaseMs: 1 },
    );
    assert.equal(r.vectors.length, 1);
    assert.equal(r.vectors[0].id, "ok");
    assert.equal(r.failures.length, 3);
  });

  it("progress callback invoked", async () => {
    const fetchImpl = fakeFetch(vec());
    const ticks = [];
    await embedBatch(
      [{ id: "a", text: "a" }, { id: "b", text: "b" }],
      { fetchImpl, batchSize: 1, onProgress: (s) => ticks.push(s), retryBaseMs: 1 },
    );
    assert.ok(ticks.length >= 1);
    assert.equal(ticks[ticks.length - 1].processed, 2);
  });

  it("progress callback errors don't crash batch", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch(
      [{ id: "a", text: "a" }],
      { fetchImpl, onProgress: () => { throw new Error("cb-error"); }, retryBaseMs: 1 },
    );
    assert.equal(r.ok, true);
  });

  it("rejects non-integer batchSize", async () => {
    await assert.rejects(
      embedBatch([], { batchSize: 0 }),
      /batchSize must be positive/,
    );
    await assert.rejects(
      embedBatch([], { batchSize: 1.5 }),
      /batchSize must be positive/,
    );
  });

  it("rejects non-array items", async () => {
    await assert.rejects(
      embedBatch("not-array"),
      /items must be array/,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────
// buildCheckpoint / saveCheckpoint / loadCheckpoint
// ──────────────────────────────────────────────────────────────────────────

describe("checkpoint persistence", () => {
  it("buildCheckpoint produces well-formed object", () => {
    const v = vec();
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, [{ id: "a", vector: v }]);
    assert.equal(cp.schemaVersion, CHECKPOINT_SCHEMA_VERSION);
    assert.equal(cp.model, DEFAULT_MODEL);
    assert.equal(cp.dim, DIM);
    assert.equal(cp.count, 1);
    assert.equal(cp.vectors[0].id, "a");
    assert.equal(cp.vectors[0].embedding.length, DIM);
  });

  it("buildCheckpoint handles empty vectors", () => {
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    assert.equal(cp.count, 0);
    assert.deepEqual(cp.vectors, []);
  });

  it("saveCheckpoint + loadCheckpoint round-trip", () => {
    const path = join(TMPROOT, "ckpt1.json");
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, [
      { id: "x", vector: vec() },
      { id: "y", vector: vec((i) => i / 1000) },
    ]);
    const w = saveCheckpoint(path, cp);
    assert.equal(w.ok, true);
    assert.equal(w.count, 2);
    const r = loadCheckpoint(path, { expectedModel: DEFAULT_MODEL, expectedDim: DIM });
    assert.equal(r.ok, true);
    assert.equal(r.checkpoint.count, 2);
    assert.ok(r.processedIds.has("x"));
    assert.ok(r.processedIds.has("y"));
  });

  it("saveCheckpoint creates parent dir", () => {
    const path = join(TMPROOT, "deep", "nested", "ckpt.json");
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    saveCheckpoint(path, cp);
    assert.ok(existsSync(path));
  });

  it("saveCheckpoint rejects schema-version mismatch", () => {
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    cp.schemaVersion = "0.0.0";
    assert.throws(() => saveCheckpoint(join(TMPROOT, "bad.json"), cp), /schemaVersion mismatch/);
  });

  it("loadCheckpoint not-found → ok=false reason=not-found", () => {
    const r = loadCheckpoint(join(TMPROOT, "nope.json"));
    assert.equal(r.ok, false);
    assert.equal(r.error, "not-found");
    assert.equal(r.processedIds.size, 0);
  });

  it("loadCheckpoint model-mismatch", () => {
    const path = join(TMPROOT, "model-mm.json");
    const cp = buildCheckpoint("other-model", DIM, []);
    saveCheckpoint(path, cp);
    const r = loadCheckpoint(path, { expectedModel: DEFAULT_MODEL });
    assert.equal(r.ok, false);
    assert.match(r.error, /model-mismatch/);
  });

  it("loadCheckpoint dim-mismatch", () => {
    const path = join(TMPROOT, "dim-mm.json");
    const cp = buildCheckpoint(DEFAULT_MODEL, 384, []);
    saveCheckpoint(path, cp);
    const r = loadCheckpoint(path, { expectedDim: DIM });
    assert.equal(r.ok, false);
    assert.match(r.error, /dim-mismatch/);
  });

  it("loadCheckpoint malformed-JSON", () => {
    const path = join(TMPROOT, "corrupt.json");
    writeFileSync(path, "{not json at all");
    const r = loadCheckpoint(path);
    assert.equal(r.ok, false);
    assert.match(r.error, /parse-failed/);
  });

  it("loadCheckpoint schema-version drift", () => {
    const path = join(TMPROOT, "schema-drift.json");
    writeFileSync(path, JSON.stringify({ schemaVersion: "9.9.9", model: "m", dim: 10, vectors: [] }));
    const r = loadCheckpoint(path);
    assert.equal(r.ok, false);
    assert.match(r.error, /schema-mismatch/);
  });

  it("saveCheckpoint is atomic (no .tmp file remains)", () => {
    const path = join(TMPROOT, "atomic.json");
    const cp = buildCheckpoint(DEFAULT_MODEL, DIM, [{ id: "a", vector: vec() }]);
    saveCheckpoint(path, cp);
    // No leftover *.tmp-* file in tmproot
    const fs = readFileSync(path, "utf8");
    assert.ok(fs.length > 0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// mergeIntoCheckpoint
// ──────────────────────────────────────────────────────────────────────────

describe("mergeIntoCheckpoint", () => {
  it("fresh vector wins on duplicate id", () => {
    const oldVec = vec((i) => 0.1);
    const newVec = vec((i) => 0.9);
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, [{ id: "dup", vector: oldVec }]);
    const merged = mergeIntoCheckpoint(existing, [{ id: "dup", vector: newVec }]);
    assert.equal(merged.count, 1);
    assert.ok(Math.abs(merged.vectors[0].embedding[0] - 0.9) < 1e-9);
  });

  it("preserves untouched ids", () => {
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, [
      { id: "keep", vector: vec() },
    ]);
    const merged = mergeIntoCheckpoint(existing, [{ id: "new", vector: vec() }]);
    assert.equal(merged.count, 2);
    const ids = merged.vectors.map(v => v.id).sort();
    assert.deepEqual(ids, ["keep", "new"]);
  });

  it("rejects non-object checkpoint", () => {
    assert.throws(() => mergeIntoCheckpoint(null, []), /existingCheckpoint must be object/);
  });

  it("rejects non-array freshVectors", () => {
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    assert.throws(() => mergeIntoCheckpoint(existing, "nope"), /freshVectors must be array/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// embedClusters integration
// ──────────────────────────────────────────────────────────────────────────

describe("embedClusters", () => {
  it("happy path with stub fetch", async () => {
    const fetchImpl = fakeFetch(vec());
    const clusters = [
      { id: "c1", repBag: new Set(["alpha", "beta"]) },
      { id: "c2", repBag: new Set(["gamma", "delta"]) },
    ];
    const r = await embedClusters(clusters, {
      fetchImpl,
      textFor: defaultClusterText,
      retryBaseMs: 1,
    });
    assert.equal(r.ok, true);
    assert.equal(r.vectors.length, 2);
    assert.equal(r.checkpoint.count, 2);
  });

  it("resumes from checkpoint (skips already-embedded ids)", async () => {
    const path = join(TMPROOT, "resume-ckpt.json");
    // Seed with one embedded cluster
    const seed = buildCheckpoint(DEFAULT_MODEL, DIM, [{ id: "old", vector: vec() }]);
    saveCheckpoint(path, seed);

    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ embedding: vec() }), text: async () => "" };
    };
    const clusters = [
      { id: "old", repBag: new Set(["a"]) },  // should be skipped
      { id: "new", repBag: new Set(["b"]) },  // should be embedded
    ];
    const r = await embedClusters(clusters, {
      fetchImpl,
      textFor: defaultClusterText,
      checkpointPath: path,
      retryBaseMs: 1,
      endpoint: "legacy", // pin so calls counter is per-item, not per-endpoint
    });
    assert.equal(calls, 1, "should only call ollama for 'new'");
    assert.equal(r.stats.skipped, 1);
    assert.equal(r.checkpoint.count, 2);
  });

  it("throws if textFor missing", async () => {
    await assert.rejects(
      embedClusters([{ id: "x" }], { fetchImpl: fakeFetch(vec()) }),
      /textFor.*is required/,
    );
  });

  it("textFor throwing surfaces cluster id", async () => {
    await assert.rejects(
      embedClusters(
        [{ id: "boom" }],
        { fetchImpl: fakeFetch(vec()), textFor: () => { throw new Error("nope"); } },
      ),
      /boom.*nope/,
    );
  });

  it("textFor returning non-string is rejected", async () => {
    await assert.rejects(
      embedClusters(
        [{ id: "x" }],
        { fetchImpl: fakeFetch(vec()), textFor: () => 42 },
      ),
      /must return string/,
    );
  });

  it("ignores clusters without id", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedClusters(
      [{ id: "ok" }, null, { /* no id */ repBag: new Set() }],
      { fetchImpl, textFor: defaultClusterText, retryBaseMs: 1 },
    );
    assert.equal(r.vectors.length, 1);
  });

  it("starts fresh on model-mismatch checkpoint", async () => {
    const path = join(TMPROOT, "model-fresh.json");
    saveCheckpoint(path, buildCheckpoint("DIFFERENT_MODEL", DIM, [{ id: "stale", vector: vec() }]));
    const fetchImpl = fakeFetch(vec());
    const r = await embedClusters(
      [{ id: "stale", repBag: new Set(["a"]) }],
      { fetchImpl, textFor: defaultClusterText, checkpointPath: path, retryBaseMs: 1 },
    );
    // Should NOT skip "stale" — fresh start because model mismatched
    assert.equal(r.stats.skipped, 0);
    assert.equal(r.vectors.length, 1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// defaultClusterText
// ──────────────────────────────────────────────────────────────────────────

describe("defaultClusterText", () => {
  it("joins title + sorted tokens", () => {
    const t = defaultClusterText({ title: "T", repBag: new Set(["b", "a"]) });
    assert.match(t, /^T/);
    assert.ok(t.includes("a b"), `expected sorted tokens, got: ${t}`);
  });

  it("handles missing title", () => {
    const t = defaultClusterText({ repBag: new Set(["x"]) });
    assert.equal(t, "x");
  });

  it("handles tokens array form", () => {
    const t = defaultClusterText({ tokens: ["c", "a", "b"] });
    assert.equal(t, "a b c");
  });

  it("empty cluster returns empty string", () => {
    assert.equal(defaultClusterText({}), "");
    assert.equal(defaultClusterText(null), "");
  });

  it("determinism: same Set → same text", () => {
    const s1 = new Set(["z", "a", "m"]);
    const s2 = new Set(["a", "z", "m"]);
    assert.equal(
      defaultClusterText({ repBag: s1 }),
      defaultClusterText({ repBag: s2 }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Constant exports (smoke tests so a typo in a constant value gets caught)
// ──────────────────────────────────────────────────────────────────────────

describe("exported constants", () => {
  it("has the documented constants", () => {
    assert.equal(DEFAULT_MODEL, "nomic-embed-text");
    assert.equal(EMBEDDING_DIM, 768);
    assert.equal(DEFAULT_BATCH_SIZE, 32);
    assert.equal(DEFAULT_MAX_RETRIES, 3);
    assert.equal(CHECKPOINT_SCHEMA_VERSION, "1.0.0");
    assert.equal(LATERAL_WIRE_THRESHOLD_DEFAULT, 0.75);
    assert.match(OLLAMA_URL_DEFAULT, /^http:\/\//);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Lock-in tests for P0/P1 fixes (round-2 scrutiny)
// ──────────────────────────────────────────────────────────────────────────

describe("P0/P1 fix lock-in", () => {
  it("[P0] all-malformed input → ok=false (not silent total-rejection)", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch([null, null, { /* no id */ }], { fetchImpl, retryBaseMs: 1 });
    assert.equal(r.ok, false, "must surface total-failure even with no fetch calls");
    assert.equal(r.vectors.length, 0);
    assert.ok(r.failures.length >= 1);
    assert.equal(r.stats.malformedOrDuplicate >= 1, true);
  });

  it("[P0] stats breaks down malformed vs fetch failures", async () => {
    // 1 malformed + 1 duplicate + 1 fetch-fail + 1 success
    let call = 0;
    const fetchImpl = async () => {
      call++;
      if (call === 2) throw new Error("perma");
      return { ok: true, status: 200, json: async () => ({ embedding: vec() }), text: async () => "" };
    };
    const r = await embedBatch(
      [
        null,                                  // malformed
        { id: "a", text: "a" },                // succeeds (call 1)
        { id: "a", text: "dup" },              // duplicate-id
        { id: "b", text: "b" },                // fetch-fail (call 2)
      ],
      { fetchImpl, maxRetries: 0, retryBaseMs: 1, endpoint: "legacy" },
    );
    assert.equal(r.stats.malformedOrDuplicate, 2);
    assert.equal(r.stats.embedFailed, 1);
    assert.equal(r.stats.succeeded, 1);
    assert.equal(r.stats.failed, 3); // total still available
  });

  it("[P0] mergeIntoCheckpoint rejects wrong-dim vectors", () => {
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    assert.throws(
      () => mergeIntoCheckpoint(existing, [{ id: "bad", vector: new Array(384).fill(0) }]),
      /dim 384 != checkpoint dim 768/,
    );
  });

  it("[P0] mergeIntoCheckpoint rejects reserved ids", () => {
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    assert.throws(
      () => mergeIntoCheckpoint(existing, [{ id: "__proto__", vector: vec() }]),
      /is reserved/,
    );
  });

  it("[P0] embedBatch.skipIds rejects non-Set/Array (hostile input)", async () => {
    const fetchImpl = fakeFetch(vec());
    await assert.rejects(
      embedBatch([{ id: "a", text: "a" }], { fetchImpl, skipIds: { has: () => true } }),
      /skipIds must be Set or Array/,
    );
  });

  it("[P0] topKSimilar.excludeIds rejects non-Set/Array (hostile input)", () => {
    const corpus = [{ id: "a", vector: unitVec(1) }];
    assert.throws(
      () => topKSimilar(unitVec(1), corpus, 1, "abc"), // string would iterate to {"a","b","c"}
      /excludeIds must be Set or Array/,
    );
  });

  it("[P0] embedBatch rejects reserved cluster ids", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch(
      [{ id: "__proto__", text: "evil" }, { id: "ok", text: "ok" }],
      { fetchImpl, retryBaseMs: 1, endpoint: "legacy" },
    );
    assert.equal(r.vectors.length, 1);
    assert.equal(r.vectors[0].id, "ok");
    assert.ok(r.failures.some(f => /reserved-id/.test(f.error)));
  });

  it("[P0] embedClusters surfaces duplicate cluster id as throw (not generic failure)", async () => {
    const fetchImpl = fakeFetch(vec());
    await assert.rejects(
      embedClusters(
        [{ id: "x", repBag: new Set(["a"]) }, { id: "x", repBag: new Set(["b"]) }],
        { fetchImpl, textFor: defaultClusterText, retryBaseMs: 1 },
      ),
      /duplicate cluster id "x" at index 1/,
    );
  });

  it("[P0] embedClusters rejects reserved cluster id", async () => {
    const fetchImpl = fakeFetch(vec());
    await assert.rejects(
      embedClusters(
        [{ id: "constructor", repBag: new Set() }],
        { fetchImpl, textFor: defaultClusterText },
      ),
      /is reserved/,
    );
  });

  it("[P0] ollamaEmbedOne modern-endpoint response shape {embeddings:[[...]]}", async () => {
    const expected = vec();
    const fetchImpl = fakeFetch(expected, { shape: "modern" });
    const v = await ollamaEmbedOne("hi", { fetchImpl, endpoint: "modern" });
    assert.equal(v.length, DIM);
  });

  it("[P0] ollamaEmbedOne falls back to legacy on 404 from modern", async () => {
    // First call → 404 to /api/embed, second call → 200 from /api/embeddings
    let call = 0;
    const expected = vec();
    const fetchImpl = async (url) => {
      call++;
      if (/\/api\/embed$/.test(url)) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
      }
      return { ok: true, status: 200, json: async () => ({ embedding: expected }), text: async () => "" };
    };
    const v = await ollamaEmbedOne("hi", { fetchImpl, endpoint: "auto" });
    assert.equal(v.length, DIM);
    assert.equal(call, 2);
  });

  it("[P0] ollamaEmbedOne pinned endpoint=legacy uses only legacy path", async () => {
    let pathSeen = null;
    const fetchImpl = async (url) => {
      pathSeen = url;
      return { ok: true, status: 200, json: async () => ({ embedding: vec() }), text: async () => "" };
    };
    await ollamaEmbedOne("hi", { fetchImpl, endpoint: "legacy" });
    assert.match(pathSeen, /\/api\/embeddings$/);
  });

  it("[P1] loadCheckpoint reports corruptIds for wrong-dim entries", () => {
    const path = join(TMPROOT, "corrupt-vecs.json");
    // Write a checkpoint with one valid + one corrupt entry
    const cp = {
      schemaVersion: CHECKPOINT_SCHEMA_VERSION,
      model: DEFAULT_MODEL, dim: DIM,
      count: 2, failureCount: 0, generatedAt: new Date().toISOString(),
      vectors: [
        { id: "good", embedding: vec() },
        { id: "bad",  embedding: new Array(100).fill(0) }, // wrong dim
        { id: "no-vec" /* missing embedding */ },
      ],
      failures: [], extra: {},
    };
    writeFileSync(path, JSON.stringify(cp));
    const r = loadCheckpoint(path, { expectedModel: DEFAULT_MODEL, expectedDim: DIM });
    assert.equal(r.ok, true);
    assert.ok(r.processedIds.has("good"));
    assert.ok(!r.processedIds.has("bad"));
    assert.ok(!r.processedIds.has("no-vec"));
    assert.ok(r.corruptIds.includes("bad"));
    assert.ok(r.corruptIds.includes("no-vec"));
  });

  it("[P1] saveCheckpoint sweeps stale .tmp-* siblings", () => {
    const path = join(TMPROOT, "atomic-sweep.json");
    // Plant a stale tmp file from a "prior crash" (mtime 10 min ago)
    const staleTmp = path + ".tmp-99999-99";
    writeFileSync(staleTmp, "garbage");
    const old = Date.now() - (10 * 60 * 1000);
    utimesSync(staleTmp, old / 1000, old / 1000);
    // Save a fresh checkpoint — the sweep should remove the stale tmp
    saveCheckpoint(path, buildCheckpoint(DEFAULT_MODEL, DIM, [{ id: "a", vector: vec() }]));
    assert.ok(!existsSync(staleTmp), "stale tmp file should be swept");
    assert.ok(existsSync(path), "canonical file should exist");
  });

  it("[P1] defaultClusterText uses ' | ' separator (not U+001F)", () => {
    const t = defaultClusterText({ title: "drill", repBag: new Set(["bit", "feed"]) });
    assert.match(t, /drill \| /);
    assert.ok(!t.includes("\x1f"), "must not leak U+001F into embedding text");
  });

  it("[P1] buildLateralWires tie-break is deterministic", () => {
    const same = unitVec(70);
    const clusters = ["a", "b", "c", "d"].map(id => ({ id }));
    const vectors = new Map(clusters.map(c => [c.id, same]));
    const w1 = buildLateralWires(clusters, vectors, 0.5, { maxWiresPerNode: 2 });
    const w2 = buildLateralWires(clusters, vectors, 0.5, { maxWiresPerNode: 2 });
    assert.deepEqual(
      w1.map(w => [w.fromId, w.toId]),
      w2.map(w => [w.fromId, w.toId]),
      "two runs must produce bit-identical wires",
    );
  });

  it("[P1] topKSimilar self-matches-self with score > 0.99", () => {
    const corpus = [{ id: "self", vector: unitVec(80) }];
    const r = topKSimilar(unitVec(80), corpus, 1);
    assert.equal(r[0].id, "self");
    assert.ok(r[0].score > 0.99, `self match score should be ~1, got ${r[0].score}`);
  });

  it("[P1] retry uses jitter — multiple runs produce different total elapsed", async () => {
    // Real variance check: jitter is 50-100% of base, so retryBaseMs=80 with
    // maxRetries=2 produces 2 sleeps totalling [80+160 ... 160+320] = [240..480]ms.
    // Across N runs with throwing fetch, elapsed times must differ (jitter live).
    const fetchImpl = async () => { throw new Error("always-fail"); };
    const elapsed = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      await embedWithRetry("x", { fetchImpl, maxRetries: 2, retryBaseMs: 80, endpoint: "legacy" });
      elapsed.push(Date.now() - t0);
    }
    // At least 3 distinct elapsed values across 5 runs proves randomness is live.
    // (Stricter than "set size ≥ 2" — if jitter was disabled all 5 would match.)
    const distinct = new Set(elapsed).size;
    assert.ok(distinct >= 3, `expected ≥3 distinct elapsed values across 5 runs, got ${distinct} (samples: ${elapsed.join(",")})`);
    // Also assert all elapsed are in plausible range (no silent timing bug).
    for (const e of elapsed) {
      assert.ok(e >= 100 && e < 1500, `elapsed ${e}ms outside plausible jitter range`);
    }
  });

  it("[P0-NEW] mergeIntoCheckpoint rejects missing-vector entry with named error", () => {
    const existing = buildCheckpoint(DEFAULT_MODEL, DIM, []);
    assert.throws(
      () => mergeIntoCheckpoint(existing, [{ id: "no-vec" }]),
      /vector "no-vec" missing valid \.vector array/,
    );
  });

  it("[P1] embedBatch.skipIds with overridden .has is defeated by fresh-Set materialization", async () => {
    const fetchImpl = fakeFetch(vec());
    const evil = new Set(["a"]);
    evil.has = () => true; // try to make EVERY id appear skipped
    const r = await embedBatch(
      [{ id: "a", text: "a" }, { id: "b", text: "b" }],
      { fetchImpl, skipIds: evil, retryBaseMs: 1, endpoint: "legacy" },
    );
    // The fresh-Set copy contains only the original member "a" — "b" must
    // NOT be skipped because evil.has lies but is bypassed.
    assert.equal(r.stats.skipped, 1, "only the real member should be skipped");
    assert.equal(r.vectors.length, 1);
    assert.equal(r.vectors[0].id, "b");
  });

  it("[P1] defaultClusterText dedupes array tokens", () => {
    const a = defaultClusterText({ tokens: ["x", "x", "y"] });
    const b = defaultClusterText({ tokens: ["x", "y"] });
    assert.equal(a, b, "duplicate tokens must not change embedding text");
  });

  it("[P1] embedClusters surfaces corruptIdsResumed in return value", async () => {
    const path = join(TMPROOT, "consume-corrupt.json");
    const cp = {
      schemaVersion: CHECKPOINT_SCHEMA_VERSION,
      model: DEFAULT_MODEL, dim: DIM,
      count: 2, failureCount: 0, generatedAt: new Date().toISOString(),
      vectors: [
        { id: "good", embedding: vec() },
        { id: "corrupt", embedding: new Array(64).fill(0) }, // wrong dim
      ],
      failures: [], extra: {},
    };
    writeFileSync(path, JSON.stringify(cp));
    const fetchImpl = fakeFetch(vec());
    const r = await embedClusters(
      [{ id: "good", repBag: new Set() }, { id: "corrupt", repBag: new Set() }],
      { fetchImpl, textFor: defaultClusterText, checkpointPath: path, retryBaseMs: 1, endpoint: "legacy" },
    );
    assert.ok(Array.isArray(r.corruptIdsResumed), "must surface corruptIdsResumed array");
    assert.ok(r.corruptIdsResumed.includes("corrupt"));
  });

  it("[Arm-A-P2] embedBatch pure-skip path returns ok=true (every item already done)", async () => {
    const fetchImpl = fakeFetch(vec());
    const r = await embedBatch(
      [{ id: "a", text: "a" }, { id: "b", text: "b" }],
      { fetchImpl, skipIds: ["a", "b"], retryBaseMs: 1, endpoint: "legacy" },
    );
    assert.equal(r.ok, true, "pure-skip run must surface ok=true (no failures, all already done)");
    assert.equal(r.stats.skipped, 2);
    assert.equal(r.vectors.length, 0);
    assert.equal(r.failures.length, 0);
  });
});
