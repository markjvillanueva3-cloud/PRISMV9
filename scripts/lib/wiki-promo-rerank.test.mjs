// Tests for wiki-promo-rerank.mjs — the local-LLM nomic rerank for the
// memory→wiki promotion advisor. Real assertions on cosine ORDER + cache reuse
// + fail-open (R9 — every test fails if the ranking/fallback logic regresses).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugToWords,
  ensureTitleEmbeddings,
  prepareNomicRerank,
  NOMIC_MIN_SCORE,
} from "./wiki-promo-rerank.mjs";

// ── slugToWords ─────────────────────────────────────────────────────────
test("slugToWords: kebab + underscore → space-separated words", () => {
  assert.equal(slugToWords("oom-bypasses-fail-soft-catch"), "oom bypasses fail soft catch");
  assert.equal(slugToWords("memo_semantic_recall_f3"), "memo semantic recall f3");
  assert.equal(slugToWords("mixed-snake_case-slug"), "mixed snake case slug");
});
test("slugToWords: empty / null / non-string → empty string (never throws)", () => {
  assert.equal(slugToWords(""), "");
  assert.equal(slugToWords(null), "");
  assert.equal(slugToWords(undefined), "");
  assert.equal(slugToWords(42), "42");
});

// ── ensureTitleEmbeddings: build + persist + reuse ─────────────────────────
function fakeVecFor(text) {
  // deterministic 3-d vec keyed off the first word so order is testable
  const w = text.split(" ")[0];
  if (w === "alpha") return [1, 0, 0];
  if (w === "bravo") return [0, 1, 0];
  if (w === "charlie") return [0.7071, 0.7071, 0];
  return [0, 0, 1];
}

test("ensureTitleEmbeddings: builds missing, persists JSONL, reuses cache (no re-embed)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-test-"));
  const cachePath = join(dir, "title-cache.jsonl");
  let calls = 0;
  const embedBatch = async (texts) => { calls++; return texts.map(fakeVecFor); };

  const map1 = await ensureTitleEmbeddings(["alpha-thing", "bravo-thing"], { cachePath, embedBatch });
  assert.equal(calls, 1, "first run embeds the missing titles");
  assert.equal(map1.size, 2);
  assert.deepEqual(map1.get("alpha-thing").vec, [1, 0, 0]);
  assert.ok(existsSync(cachePath), "cache file persisted");
  const lines = readFileSync(cachePath, "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).name, "alpha-thing");
  assert.equal(JSON.parse(lines[0]).hash, "nomic-embed-text", "model tag stored for stale-guard");

  // Second run with the SAME titles → all cached → embedBatch NOT called again.
  const map2 = await ensureTitleEmbeddings(["alpha-thing", "bravo-thing"], { cachePath, embedBatch });
  assert.equal(calls, 1, "cached titles are not re-embedded");
  assert.equal(map2.size, 2);

  // Adding a new title embeds ONLY the new one; the returned map is the LIVE
  // subset for THIS call (alpha-thing reused from cache + charlie-thing freshly
  // embedded). bravo-thing is not a candidate this call, so it is not returned.
  const map3 = await ensureTitleEmbeddings(["alpha-thing", "charlie-thing"], { cachePath, embedBatch });
  assert.equal(calls, 2, "only the new title triggers a batch");
  assert.equal(map3.size, 2, "returns the live subset for this call");
  assert.ok(map3.has("alpha-thing") && map3.has("charlie-thing"), "cached + new both present");
});

test("ensureTitleEmbeddings: null batch (Ollama down) → keeps prior cache, no throw", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-down-"));
  const cachePath = join(dir, "c.jsonl");
  const map = await ensureTitleEmbeddings(["x-y"], { cachePath, embedBatch: async () => null });
  assert.equal(map.size, 0, "no embeddings when service is down (caller fails open)");
  assert.equal(existsSync(cachePath), false, "no cache written on failed embed");
});

test("ensureTitleEmbeddings: chunks large sets (oversized single batch → null)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-chunk-"));
  const cachePath = join(dir, "c.jsonl");
  const batchSizes = [];
  const embedBatch = async (texts) => { batchSizes.push(texts.length); return texts.map(fakeVecFor); };
  const map = await ensureTitleEmbeddings(["alpha-1", "bravo-2", "charlie-3"], { cachePath, embedBatch, chunkSize: 1 });
  assert.deepEqual(batchSizes, [1, 1, 1], "embedded one-per-chunk");
  assert.equal(map.size, 3, "all chunks accumulated into the map");
});

test("ensureTitleEmbeddings: a failed chunk is skipped, others still cached", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-chunkfail-"));
  const cachePath = join(dir, "c.jsonl");
  let n = 0;
  // 2nd chunk returns null (transient Ollama error) → that title is skipped.
  const embedBatch = async (texts) => { n++; return n === 2 ? null : texts.map(fakeVecFor); };
  const map = await ensureTitleEmbeddings(["alpha-1", "bravo-2", "charlie-3"], { cachePath, embedBatch, chunkSize: 1 });
  assert.equal(map.size, 2, "partial coverage — failed chunk dropped, rest kept");
  assert.ok(map.has("alpha-1") && map.has("charlie-3"));
  assert.ok(!map.has("bravo-2"));
});

test("ensureTitleEmbeddings: maxEmbed bounds the per-run build", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-cap-"));
  const cachePath = join(dir, "c.jsonl");
  let embedded = 0;
  const embedBatch = async (texts) => { embedded += texts.length; return texts.map(fakeVecFor); };
  const map = await ensureTitleEmbeddings(["alpha-1", "bravo-2", "charlie-3"], { cachePath, embedBatch, maxEmbed: 2 });
  assert.equal(embedded, 2, "only maxEmbed titles embedded this run");
  assert.equal(map.size, 2);
});

test("ensureTitleEmbeddings: re-embeds entries cached under a stale model tag", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-stale-"));
  const cachePath = join(dir, "c.jsonl");
  // Seed a cache entry tagged with an OLD model (a different embedding space).
  writeFileSync(cachePath, JSON.stringify({ name: "alpha-x", vec: [9, 9, 9], hash: "old-model" }) + "\n");
  const embedded = [];
  const embedBatch = async (texts) => { embedded.push(...texts); return texts.map(fakeVecFor); };
  const map = await ensureTitleEmbeddings(["alpha-x"], { cachePath, embedBatch });
  assert.deepEqual(embedded, ["alpha x"], "stale-tagged title re-embedded (slug→words)");
  assert.deepEqual(map.get("alpha-x").vec, [1, 0, 0], "vector replaced with the current-model embedding");
  assert.equal(map.get("alpha-x").hash, "nomic-embed-text");
});

test("ensureTitleEmbeddings: prunes stale (deleted) titles from the cache", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-prune-"));
  const cachePath = join(dir, "c.jsonl");
  writeFileSync(cachePath,
    JSON.stringify({ name: "alpha-keep", vec: [1, 0, 0], hash: "nomic-embed-text" }) + "\n" +
    JSON.stringify({ name: "deleted-title", vec: [0, 1, 0], hash: "nomic-embed-text" }) + "\n");
  let called = false;
  const embedBatch = async (t) => { called = true; return t.map(fakeVecFor); };
  await ensureTitleEmbeddings(["alpha-keep"], { cachePath, embedBatch });
  assert.equal(called, false, "alpha-keep already cached with a fresh tag → no re-embed");
  const persisted = readFileSync(cachePath, "utf8").trim().split("\n").map((l) => JSON.parse(l).name);
  assert.deepEqual(persisted, ["alpha-keep"], "deleted-title pruned from the cache (bounded growth)");
});

test("ensureTitleEmbeddings: deadline stops the loop (time-bound, not just count)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wiki-promo-deadline-"));
  const cachePath = join(dir, "c.jsonl");
  let chunks = 0;
  const embedBatch = async (t) => { chunks++; return t.map(fakeVecFor); };
  // clock advances 6ms/call; deadline 10ms. start=0; iter0 check=6 (≤10 → 1 chunk);
  // iter1 check=12 (>10 → break). One chunk issued despite 3 titles.
  let t = -6;
  const now = () => (t += 6);
  const map = await ensureTitleEmbeddings(["alpha-1", "bravo-2", "charlie-3"], {
    cachePath, embedBatch, chunkSize: 1, deadlineMs: 10, now,
  });
  assert.equal(chunks, 1, "deadline halted the chunk loop after one chunk");
  assert.equal(map.size, 1, "only the first title embedded this run; rest warm next run");
});

// ── prepareNomicRerank: cosine ORDER + minScore floor + fail-open ──────────
test("prepareNomicRerank: ranks candidates by cosine to the query, applies floor", async () => {
  const titleMap = new Map([
    ["alpha-title", { vec: [1, 0, 0] }],     // cosine 1.000 with query
    ["bravo-title", { vec: [0, 1, 0] }],     // cosine 0.000 → below floor
    ["charlie-title", { vec: [0.7071, 0.7071, 0] }], // cosine 0.707
  ]);
  // query embeds to [1,0,0] (aligned with alpha-title)
  const embedBatch = async (texts) => texts.map(() => [1, 0, 0]);
  const { rerank, ready, reason } = await prepareNomicRerank({
    queries: ["out of memory crash"], titleMap, embedBatch,
  });
  assert.equal(ready, true);
  assert.equal(reason, "ok");
  const out = rerank("out of memory crash", ["alpha-title", "bravo-title", "charlie-title"], 3);
  assert.equal(out.length, 2, "bravo-title (cosine 0) cut by the 0.5 floor");
  assert.equal(out[0].candidate, "alpha-title", "highest cosine first");
  assert.ok(Math.abs(out[0].score - 1) < 1e-6);
  assert.equal(out[1].candidate, "charlie-title");
  assert.ok(out[1].score > NOMIC_MIN_SCORE && out[1].score < 0.99);
});

test("prepareNomicRerank: topK truncates after the floor", async () => {
  const titleMap = new Map([
    ["a", { vec: [1, 0, 0] }],
    ["b", { vec: [0.9, 0.1, 0] }],
    ["c", { vec: [0.8, 0.2, 0] }],
  ]);
  const { rerank } = await prepareNomicRerank({
    queries: ["q"], titleMap, embedBatch: async (t) => t.map(() => [1, 0, 0]),
  });
  const out = rerank("q", ["a", "b", "c"], 2);
  assert.equal(out.length, 2, "topK respected");
  assert.equal(out[0].candidate, "a");
});

test("prepareNomicRerank: unknown query → rerank returns null (advisor skips, never wrong)", async () => {
  const titleMap = new Map([["a", { vec: [1, 0, 0] }]]);
  const { rerank } = await prepareNomicRerank({
    queries: ["known"], titleMap, embedBatch: async (t) => t.map(() => [1, 0, 0]),
  });
  assert.equal(rerank("never-embedded", ["a"], 3), null);
});

test("prepareNomicRerank: fail-open paths return ready:false", async () => {
  const titleMap = new Map([["a", { vec: [1, 0, 0] }]]);
  // empty title map
  assert.equal((await prepareNomicRerank({ queries: ["q"], titleMap: new Map(), embedBatch: async (t) => t.map(() => [1, 0, 0]) })).ready, false);
  // no queries
  assert.equal((await prepareNomicRerank({ queries: [], titleMap, embedBatch: async (t) => t.map(() => [1, 0, 0]) })).ready, false);
  // ollama down (null batch)
  assert.equal((await prepareNomicRerank({ queries: ["q"], titleMap, embedBatch: async () => null })).ready, false);
  // batch returns all-null vectors
  assert.equal((await prepareNomicRerank({ queries: ["q"], titleMap, embedBatch: async (t) => t.map(() => null) })).ready, false);
});
