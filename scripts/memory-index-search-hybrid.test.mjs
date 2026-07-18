/**
 * A6 — tests for the hybrid BM25+dense+RRF retrieval added to
 * memory-index-search-lib.mjs.  node --test scripts/memory-index-search-hybrid.test.mjs
 *
 * Covers: int8 pack/unpack round-trip + cosine, RRF fusion algebra, denseRankAll,
 * embeddings-sidecar load (+ corrupt/stale fail-soft), the sync ollama embedder
 * via injected exec, tryHybridFuse integration (circuit-breaker + fail-safe
 * gates), and the load-bearing fail-on-revert E2E: a dense-only (BM25-miss)
 * memory surfaces in HYBRID mode but NOT in BM25-only mode, and any dense/ollama
 * failure degrades to byte-identical BM25 output.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  packInt8, unpackInt8, cosineSimInt8, l2norm,
  reciprocalRankFusion, denseRankAll,
  tryLoadEmbeddingsSidecar, embedQueryViaOllamaSync, tryHybridFuse,
  recordKey, buildEmbedDocText, buildEmbedQueryText,
  runMemoryIndexSearch,
  EMBEDDINGS_SIDECAR_SCHEMA_VERSION, SIDECAR_SCHEMA_VERSION,
} from "./lib/memory-index-search-lib.mjs";

// ---------- int8 pack/unpack + cosine ----------
test("packInt8/unpackInt8 round-trip preserves direction (cosine ≈ 1)", () => {
  const v = [0.5, -0.25, 0.75, -1.0, 0.1];
  const p = packInt8(v);
  assert.ok(p && p.dim === 5 && p.norm > 0);
  const q = unpackInt8(p.b64);
  assert.equal(q.length, 5);
  const cos = cosineSimInt8(v, q, p.norm, l2norm(v));
  assert.ok(cos > 0.999, `expected ~1, got ${cos}`);
});

test("packInt8 edge cases: empty/zero vector + non-array", () => {
  assert.equal(packInt8([]), null);
  assert.equal(packInt8("nope"), null);
  const z = packInt8([0, 0, 0]);
  assert.ok(z && z.norm === 0); // all-zero → norm 0 (cosine guard returns 0)
});

test("cosineSimInt8: orthogonal → 0, guards zero norms", () => {
  const a = packInt8([1, 0, 0, 0]);
  const ai = unpackInt8(a.b64);
  assert.equal(cosineSimInt8([0, 1, 0, 0], ai, a.norm, 1), 0);
  assert.equal(cosineSimInt8([1, 0, 0, 0], ai, 0, 1), 0);   // zero doc norm
  assert.equal(cosineSimInt8([1, 0, 0, 0], ai, a.norm, 0), 0); // zero query norm
  assert.equal(cosineSimInt8(null, ai, 1, 1), 0);
});

test("unpackInt8 fail-soft on junk", () => {
  assert.equal(unpackInt8(""), null);
  assert.equal(unpackInt8(null), null);
});

// ---------- RRF ----------
test("reciprocalRankFusion: key in both lists outranks key in one", () => {
  // a: rank0 in both; b: rank0 dense only; c: rank1 bm25 only
  const fused = reciprocalRankFusion([["a", "c"], ["a", "b"]], { k: 60 });
  assert.equal(fused[0].key, "a");
  const keys = fused.map((f) => f.key);
  assert.ok(keys.includes("b") && keys.includes("c"), "single-list keys still surface");
  // a's score = 1/61 + 1/61; b = 1/61; c = 1/62 → b ranks above c
  assert.ok(fused.findIndex((f) => f.key === "b") < fused.findIndex((f) => f.key === "c"));
});

test("reciprocalRankFusion: fail-soft on empty / non-array / junk keys", () => {
  assert.deepEqual(reciprocalRankFusion([]), []);
  assert.deepEqual(reciprocalRankFusion(null), []);
  const fused = reciprocalRankFusion([["x", "", null, 5, "y"]], { k: 10 });
  assert.deepEqual(fused.map((f) => f.key), ["x", "y"]);
});

// ---------- denseRankAll ----------
function embRec(key, vec) {
  const p = packInt8(vec);
  return { key, _int8: unpackInt8(p.b64), norm: p.norm };
}
test("denseRankAll: ranks by cosine, applies topN, skips no-_int8 + query-zero", () => {
  const recs = [
    embRec("near", [1, 0, 0, 0]),       // cosine 1 with query
    embRec("mid", [2, 1, 0, 0]),        // cosine ~0.894
    embRec("orth", [0, 1, 0, 0]),       // cosine 0 → dropped (sim<=0)
    { key: "novec" },                    // no _int8 → skipped
  ];
  const ranked = denseRankAll(recs, [1, 0, 0, 0], { topN: 10 });
  assert.deepEqual(ranked.map((r) => r.key), ["near", "mid"]);
  assert.deepEqual(denseRankAll(recs, [1, 0, 0, 0], { topN: 1 }).map((r) => r.key), ["near"]);
  assert.deepEqual(denseRankAll(recs, [0, 0, 0, 0]), []); // zero query
  assert.deepEqual(denseRankAll(null, [1]), []);
});

// ---------- embeddings sidecar load ----------
function mkEmbSidecar(records, over = {}) {
  return JSON.stringify({
    schemaVersion: EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
    builtAt: "T", model: "nomic-embed-text", dim: 4, quant: "int8",
    count: records.length, records, ...over,
  });
}
function packedRec(key, name, namespace, vec) {
  const p = packInt8(vec);
  return { key, name, fileName: `${name}.md`, namespace, vec: p.b64, norm: p.norm };
}
test("tryLoadEmbeddingsSidecar: loads + decodes; null on missing/corrupt/schema/empty", () => {
  const json = mkEmbSidecar([packedRec("reference/a", "a", "reference", [1, 0, 0, 0])]);
  const loaded = tryLoadEmbeddingsSidecar({
    sidecarPath: "/emb.json",
    existsImpl: (p) => p === "/emb.json",
    readFileImpl: () => json,
  });
  assert.ok(loaded && loaded.records.length === 1 && loaded.records[0]._int8.length === 4);
  // missing
  assert.equal(tryLoadEmbeddingsSidecar({ existsImpl: () => false }), null);
  // unparseable
  assert.equal(tryLoadEmbeddingsSidecar({ existsImpl: () => true, readFileImpl: () => "{bad" }), null);
  // schema mismatch
  assert.equal(tryLoadEmbeddingsSidecar({
    existsImpl: () => true, readFileImpl: () => mkEmbSidecar([], { schemaVersion: "9.9.9" }),
  }), null);
  // empty records → null
  assert.equal(tryLoadEmbeddingsSidecar({ existsImpl: () => true, readFileImpl: () => mkEmbSidecar([]) }), null);
});

test("PRISM_MEMORY_HYBRID_DISABLE short-circuits sidecar load", () => {
  const prev = process.env.PRISM_MEMORY_HYBRID_DISABLE;
  process.env.PRISM_MEMORY_HYBRID_DISABLE = "1";
  try {
    assert.equal(tryLoadEmbeddingsSidecar({ existsImpl: () => true, readFileImpl: () => mkEmbSidecar([packedRec("x", "x", "y", [1, 0])]) }), null);
  } finally {
    if (prev === undefined) delete process.env.PRISM_MEMORY_HYBRID_DISABLE;
    else process.env.PRISM_MEMORY_HYBRID_DISABLE = prev;
  }
});

// ---------- sync ollama embedder (injected exec) ----------
test("embedQueryViaOllamaSync: parses embedding via injected exec; fail-soft", () => {
  const ok = embedQueryViaOllamaSync("hi", { execImpl: () => JSON.stringify({ embedding: [1, 2, 3] }) });
  assert.deepEqual(ok, [1, 2, 3]);
  assert.equal(embedQueryViaOllamaSync("hi", { execImpl: () => "{bad json" }), null);
  assert.equal(embedQueryViaOllamaSync("hi", { execImpl: () => JSON.stringify({ embedding: [] }) }), null);
  assert.equal(embedQueryViaOllamaSync("hi", { execImpl: () => { throw new Error("ENOENT curl"); } }), null);
});

test("text builders use nomic task prefixes", () => {
  assert.equal(buildEmbedQueryText("force"), "search_query: force");
  assert.match(buildEmbedDocText({ name: "n", description: "d", opening: "o" }), /^search_document: n\. d\. o$/);
  assert.equal(recordKey({ namespace: "reference", name: "x" }), "reference/x");
});

// ---------- tryHybridFuse integration ----------
function fsFor(files) {
  // dispatch fs impls by path; circuit-breaker path intentionally absent → not tripped
  return {
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileImpl: (p) => { if (!(p in files)) throw new Error(`ENOENT ${p}`); return files[p]; },
  };
}
test("tryHybridFuse: fuses BM25 + dense; surfaces a BM25-miss doc", () => {
  const emb = mkEmbSidecar([
    packedRec("reference/a", "a", "reference", [2, 1, 0, 0]), // also BM25 hit
    packedRec("feedback/c", "c", "feedback", [1, 0, 0, 0]),   // dense-only (query-aligned)
  ]);
  const { existsImpl, readFileImpl } = fsFor({ "/emb.json": emb });
  const bm25Ranked = [{ name: "a", fileName: "a.md", namespace: "reference", description: "force", opening: "", score: 5 }];
  const byKey = new Map([
    ["reference/a", { name: "a", fileName: "a.md", namespace: "reference", description: "force", opening: "" }],
    ["feedback/c", { name: "c", fileName: "c.md", namespace: "feedback", description: "semantic", opening: "" }],
  ]);
  const fused = tryHybridFuse({
    query: "cutting force", bm25Ranked, byKey,
    opts: {
      embeddingsSidecarPath: "/emb.json", existsImpl, readFileImpl,
      embedQueryImpl: () => [1, 0, 0, 0],
      writeFileImpl: () => {}, unlinkImpl: () => {}, now: 1000,
    },
  });
  assert.ok(Array.isArray(fused));
  const keys = fused.map(recordKey);
  assert.ok(keys.includes("feedback/c"), "dense-only doc must surface in hybrid");
  assert.ok(keys.includes("reference/a"));
});

test("tryHybridFuse: null (→BM25) when sidecar absent / hybrid disabled / circuit tripped / embed fails", () => {
  const base = { query: "q", bm25Ranked: [], byKey: new Map() };
  // no sidecar
  assert.equal(tryHybridFuse({ ...base, opts: { existsImpl: () => false } }), null);
  // hybrid:false
  assert.equal(tryHybridFuse({ ...base, opts: { hybrid: false } }), null);

  const emb = mkEmbSidecar([packedRec("reference/a", "a", "reference", [1, 0, 0, 0])]);
  // circuit OPEN: >= threshold (default 3) consecutive failures within the cooldown
  // window (U-BRAVO-EMBED-CIRCUIT-THRESHOLD -- a 1-strike stamp no longer trips).
  const circuit = JSON.stringify({ consecutiveFailures: 3, lastFailureMs: 1000 });
  const tripped = tryHybridFuse({
    ...base,
    opts: {
      embeddingsSidecarPath: "/emb.json", now: 1000,
      existsImpl: (p) => p === "/emb.json" || p === "H:/prism/state/shared/.memory-embed-circuit.json",
      readFileImpl: (p) => (p === "/emb.json" ? emb : circuit),
      embedQueryImpl: () => { throw new Error("should not be called when tripped"); },
      writeFileImpl: () => {}, unlinkImpl: () => {},
    },
  });
  assert.equal(tripped, null);

  // embed fails → trips circuit (writeFileImpl invoked) and returns null
  let wrote = false;
  const { existsImpl, readFileImpl } = fsFor({ "/emb.json": emb });
  const failed = tryHybridFuse({
    ...base,
    opts: {
      embeddingsSidecarPath: "/emb.json", existsImpl, readFileImpl, now: 2000,
      embedQueryImpl: () => null,
      writeFileImpl: () => { wrote = true; }, unlinkImpl: () => {},
    },
  });
  assert.equal(failed, null);
  assert.ok(wrote, "embed failure must open the circuit breaker");
});

test("tryHybridFuse: success CLOSES the circuit breaker (unlink invoked)", () => {
  // scrutiny P2: the close transition was untested — a dropped clearEmbedCircuit
  // would stick the breaker open forever and every other test would still pass.
  const emb = mkEmbSidecar([packedRec("reference/a", "a", "reference", [1, 0, 0, 0])]);
  let unlinked = null;
  tryHybridFuse({
    query: "q", bm25Ranked: [], byKey: new Map([["reference/a", { name: "a", fileName: "a.md", namespace: "reference", description: "", opening: "" }]]),
    opts: {
      // now=200000, stamp=1 → age 199999ms > 120000ms cooldown → NOT tripped,
      // so the embed runs, succeeds, and must unlink the (stale) breaker file.
      embeddingsSidecarPath: "/emb.json", now: 200000,
      existsImpl: (p) => p === "/emb.json" || p === "H:/prism/state/shared/.memory-embed-circuit.json",
      readFileImpl: (p) => (p === "/emb.json" ? emb : JSON.stringify({ lastFailureMs: 1 /* old, not tripped */ })),
      embedQueryImpl: () => [1, 0, 0, 0],
      writeFileImpl: () => {}, unlinkImpl: (p) => { unlinked = p; },
    },
  });
  assert.equal(unlinked, "H:/prism/state/shared/.memory-embed-circuit.json", "successful embed must clear the breaker");
});

test("tryHybridFuse: dim mismatch (model swap) degrades to BM25, not garbage ranks", () => {
  // scrutiny P1: sidecar dim=4 but query model returns dim=3 → must return null.
  const emb = mkEmbSidecar([packedRec("reference/a", "a", "reference", [1, 0, 0, 0])]); // dim 4
  const { existsImpl, readFileImpl } = fsFor({ "/emb.json": emb });
  const res = tryHybridFuse({
    query: "q", bm25Ranked: [], byKey: new Map(),
    opts: {
      embeddingsSidecarPath: "/emb.json", existsImpl, readFileImpl, now: 1,
      embedQueryImpl: () => [1, 0, 0], // dim 3 ≠ 4
      writeFileImpl: () => {}, unlinkImpl: () => {},
    },
  });
  assert.equal(res, null, "dim mismatch must degrade to BM25");
});

test("tryHybridFuse: zero dense candidates (all cosine ≤ 0) → null (BM25)", () => {
  const emb = mkEmbSidecar([packedRec("reference/a", "a", "reference", [0, 1, 0, 0])]); // orthogonal to query
  const { existsImpl, readFileImpl } = fsFor({ "/emb.json": emb });
  const res = tryHybridFuse({
    query: "q", bm25Ranked: [], byKey: new Map(),
    opts: {
      embeddingsSidecarPath: "/emb.json", existsImpl, readFileImpl, now: 1,
      embedQueryImpl: () => [1, 0, 0, 0],
      writeFileImpl: () => {}, unlinkImpl: () => {},
    },
  });
  assert.equal(res, null, "no positive-cosine candidate → BM25-only");
});

// ---------- E2E through runMemoryIndexSearch (fail-on-revert) ----------
function mkBm25Sidecar(records) {
  return JSON.stringify({
    schemaVersion: SIDECAR_SCHEMA_VERSION, builtAt: "T", vaultRoot: "/vault",
    namespaces: ["reference", "feedback"], sourceMtimeMs: 9e15,
    recordCount: records.length, records,
  });
}
function e2eOpts(extra = {}) {
  const bm25 = mkBm25Sidecar([
    { name: "a", fileName: "a.md", namespace: "reference", description: "cutting force kienzle", opening: "", aliases: [] },
    { name: "c", fileName: "c.md", namespace: "feedback", description: "wholly unrelated lexically", opening: "", aliases: [] },
  ]);
  const emb = mkEmbSidecar([
    packedRec("reference/a", "a", "reference", [2, 1, 0, 0]),
    packedRec("feedback/c", "c", "feedback", [1, 0, 0, 0]), // dense-aligned to query
  ]);
  const files = { "/bm25.json": bm25, "/emb.json": emb };
  return {
    sidecarPath: "/bm25.json", embeddingsSidecarPath: "/emb.json", vaultRoot: "/vault",
    topK: 5,
    existsImpl: (p) => p in files,
    readFileImpl: (p) => { if (!(p in files)) throw new Error(`ENOENT ${p}`); return files[p]; },
    statImpl: () => ({ mtimeMs: 1, size: 100 }),
    writeFileImpl: () => {}, unlinkImpl: () => {}, now: 1000,
    ...extra,
  };
}

test("E2E hybrid: dense-only memory 'c' surfaces; source=hybrid", () => {
  const res = runMemoryIndexSearch("cutting force", e2eOpts({ embedQueryImpl: () => [1, 0, 0, 0] }));
  assert.equal(res.source, "hybrid");
  const names = res.hits.map((h) => h.name);
  assert.ok(names.includes("c"), "hybrid must surface the BM25-miss memory 'c'");
  assert.ok(names.includes("a"));
});

test("REGRESSION (fail-on-revert): BM25-only does NOT surface 'c'; hybrid does", () => {
  // embed fails → degrade to BM25 → 'c' (no shared tokens) must be absent
  const bm25 = runMemoryIndexSearch("cutting force", e2eOpts({ embedQueryImpl: () => null }));
  assert.equal(bm25.source, "sidecar");
  assert.deepEqual(bm25.hits.map((h) => h.name), ["a"], "BM25-only sees only the lexical match");
  // hybrid surfaces 'c' — proves the dense path is load-bearing, not decorative
  const hyb = runMemoryIndexSearch("cutting force", e2eOpts({ embedQueryImpl: () => [1, 0, 0, 0] }));
  assert.ok(hyb.hits.map((h) => h.name).includes("c"));
});

test("E2E: PRISM_MEMORY_HYBRID_DISABLE forces BM25 byte-identical", () => {
  const prev = process.env.PRISM_MEMORY_HYBRID_DISABLE;
  process.env.PRISM_MEMORY_HYBRID_DISABLE = "1";
  try {
    const res = runMemoryIndexSearch("cutting force", e2eOpts({ embedQueryImpl: () => [1, 0, 0, 0] }));
    assert.equal(res.source, "sidecar");
    assert.deepEqual(res.hits.map((h) => h.name), ["a"]);
  } finally {
    if (prev === undefined) delete process.env.PRISM_MEMORY_HYBRID_DISABLE;
    else process.env.PRISM_MEMORY_HYBRID_DISABLE = prev;
  }
});
