#!/usr/bin/env node
/**
 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
 *
 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
 * (embeddingStaleness / staleFooterNote / the embStale wiring through
 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
 * the guard edits can't silently break the happy path.
 *
 * Run: node --test H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs
 *
 * The hook reads its index paths from PRISM_WIKI_* env vars at import time, so
 * the fixture dir + env are set up BEFORE the dynamic import below.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, utimesSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";

const HOUR = 3600 * 1000;

// ── fixture (built before the hook module is imported) ───────────────────────
const FIX = mkdtempSync(join(tmpdir(), "wpi-test-"));
const P = {
  index: join(FIX, "index.md"),
  leaf: join(FIX, "_leaf-index.jsonl"),
  emb: join(FIX, "_embeddings.jsonl"),
  misses: join(FIX, "misses.jsonl"),
  cache: join(FIX, "cache"),
  tele: join(FIX, "tele.jsonl"),
};
// index.md — one entry; plain English so a nonsense prompt cannot BM25-match it.
writeFileSync(P.index, "- [[Cutting Force Reference]] — notes on cutting force fundamentals\n", "utf8");
// _leaf-index.jsonl — one plain entry + one boost_keywords entry for the matched-path test.
writeFileSync(P.leaf, [
  JSON.stringify({ name: "Cutting Force Reference", type: "architecture", title: "cutting force", desc: "fundamentals", path: "wiki/x.md" }),
  JSON.stringify({ name: "Frobnicate Widget Engine", type: "engine", title: "frobnicate widget", desc: "does the thing", path: "engines/FrobnicateWidget.ts", boost_keywords: ["frobnicate widget"] }),
].join("\n") + "\n", "utf8");
// _embeddings.jsonl — header + one 4-d vector. 4-d deliberately mismatches the
// 768-d nomic-embed-text query vector, so cosineAgainstCorpus yields zero hits
// regardless of whether Ollama is reachable → the semantic path is a clean miss.
writeFileSync(P.emb, [
  JSON.stringify({ __meta: true, model: "nomic-embed-text", dim: 768, count: 1, generatedAt: "2026-05-10T00:00:00.000Z" }),
  JSON.stringify({ n: "Cutting Force Reference", t: "architecture", q: [10, 20, 30, 40], s: 0.01 }),
].join("\n") + "\n", "utf8");

process.env.PRISM_WIKI_INDEX = P.index;
process.env.PRISM_WIKI_LEAF_INDEX = P.leaf;
process.env.PRISM_WIKI_EMB_INDEX = P.emb;
process.env.PRISM_WIKI_MISSES_LOG = P.misses;
process.env.PRISM_WIKI_CACHE_DIR = P.cache;
process.env.PRISM_WIKI_TELEMETRY = P.tele;
delete process.env.PRISM_WIKI_PRECHECK;            // ensure not disabled
delete process.env.PRISM_WIKI_EMB_STALE_HOURS;     // use the default 24h threshold
delete process.env.PRISM_WIKI_DOMAIN_BIAS_DISABLE; // irrelevant — no chatId in fixtures
process.env.PRISM_WIKI_PREWARM_DISABLE = "1";      // prewarm spawns detached procs — off by default; prewarm tests toggle it

const { embeddingStaleness, staleFooterNote, prewarmEmbedModel, main, applyLexicalRerank, qdrantRankWiki } = await import("./wiki-precheck-inject.mjs");

const PREWARM_STAMP_PATH = join(P.cache, "nomic-prewarm.stamp");

after(() => { try { rmSync(FIX, { recursive: true, force: true }); } catch {} });

// Read the last JSON object appended to the misses ledger.
function lastMiss() {
  const lines = readFileSync(P.misses, "utf8").split(/\r?\n/).filter((l) => l.trim());
  return lines.length ? JSON.parse(lines[lines.length - 1]) : null;
}

// ── embeddingStaleness — pure staleness verdict ──────────────────────────────
test("embeddingStaleness: embeddings newer than leaf index → not stale", () => {
  const r = embeddingStaleness(2000 * HOUR, 1000 * HOUR);
  assert.equal(r.stale, false);
  assert.equal(r.staleHours, 0);
});

test("embeddingStaleness: identical mtimes → not stale", () => {
  const r = embeddingStaleness(5000 * HOUR, 5000 * HOUR);
  assert.equal(r.stale, false);
  assert.equal(r.staleHours, 0);
});

test("embeddingStaleness: 1h lag → not stale (below 24h threshold)", () => {
  const r = embeddingStaleness(1000 * HOUR, 1001 * HOUR);
  assert.equal(r.stale, false);
  assert.equal(Math.round(r.staleHours), 1);
});

test("embeddingStaleness: 23h lag → not stale (just below threshold)", () => {
  const r = embeddingStaleness(1000 * HOUR, 1023 * HOUR);
  assert.equal(r.stale, false);
});

test("embeddingStaleness: exactly 24h lag → stale (threshold is inclusive)", () => {
  const r = embeddingStaleness(1000 * HOUR, 1024 * HOUR);
  assert.equal(r.stale, true);
  assert.equal(Math.round(r.staleHours), 24);
});

test("embeddingStaleness: 100h lag → stale with correct hours", () => {
  const r = embeddingStaleness(1000 * HOUR, 1100 * HOUR);
  assert.equal(r.stale, true);
  assert.equal(Math.round(r.staleHours), 100);
});

test("embeddingStaleness: NaN embeddings mtime → not stale (no false alarm)", () => {
  assert.deepEqual(embeddingStaleness(NaN, 1000 * HOUR), { staleHours: 0, stale: false });
});

test("embeddingStaleness: NaN leaf mtime → not stale", () => {
  assert.deepEqual(embeddingStaleness(1000 * HOUR, NaN), { staleHours: 0, stale: false });
});

test("embeddingStaleness: undefined/null inputs → not stale", () => {
  assert.equal(embeddingStaleness(undefined, 1000 * HOUR).stale, false);
  assert.equal(embeddingStaleness(1000 * HOUR, null).stale, false);
  assert.equal(embeddingStaleness(Infinity, 1000 * HOUR).stale, false);
});

// ── staleFooterNote — the surfaced warning string ────────────────────────────
test("staleFooterNote: includes hours, vector count, date, regen command", () => {
  const note = staleFooterNote(72.4, 14738, "2026-05-15T03:24:23.096Z");
  assert.match(note, /^\n/);                                  // newline-prefixed (appends to footer)
  assert.match(note, /72h stale/);                            // Math.round(72.4) = 72
  assert.match(note, /14738 vectors/);
  assert.match(note, /generated 2026-05-15/);                 // date sliced to 10 chars
  assert.match(note, /build-wiki-embeddings\.mjs/);           // actionable regen command
});

test("staleFooterNote: rounds fractional hours", () => {
  assert.match(staleFooterNote(23.6, 100, ""), /24h stale/);
});

test("staleFooterNote: empty generatedAt → no 'generated' clause", () => {
  const note = staleFooterNote(48, 100, "");
  assert.doesNotMatch(note, /generated/);
  assert.match(note, /48h stale/);
  assert.match(note, /100 vectors/);
});

test("staleFooterNote: falsy headerCount → '?' placeholder, never 'undefined'", () => {
  const note = staleFooterNote(30, 0, "");
  assert.match(note, /\? vectors/);
  assert.doesNotMatch(note, /undefined/);
});

// ── main() integration — staleness reaches the miss ledger ───────────────────
test("main(): stale embeddings → miss record carries embStale:true", async () => {
  // emb 100h older than leaf → computeEmbStaleness() → stale.
  const now = Date.now() / 1000;
  utimesSync(P.leaf, now, now);
  utimesSync(P.emb, now - 100 * 3600, now - 100 * 3600);
  const result = await main({ prompt: "zzzqqq xylophone wibblewobble grobnik" });
  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined, "nonsense prompt must be a no-op injection");
  const miss = lastMiss();
  assert.ok(miss, "a miss record must be appended");
  assert.equal(miss.embStale, true, "miss must record that the semantic index was stale");
  // Ollama up → "no_hits" (4-d vector mismatch); Ollama down → "ollama_down". Both valid.
  assert.ok(["no_hits", "ollama_down"].includes(miss.sem), `unexpected sem reason: ${miss.sem}`);
});

test("main(): fresh embeddings → miss record carries embStale:false", async () => {
  // emb 1h NEWER than leaf → not stale.
  const now = Date.now() / 1000;
  utimesSync(P.leaf, now, now);
  utimesSync(P.emb, now + 3600, now + 3600);
  await main({ prompt: "zzzqqq xylophone wibblewobble grobnik" });
  const miss = lastMiss();
  assert.equal(miss.embStale, false, "fresh embeddings must not flag a stale miss");
});

test("main(): boost_keywords prompt still injects matched entries (happy path intact)", async () => {
  const result = await main({ prompt: "please frobnicate widget now for the build" });
  assert.equal(result.continue, true);
  assert.ok(result.hookSpecificOutput, "a boost-keyword match must produce an injection");
  const ctx = result.hookSpecificOutput.additionalContext || "";
  assert.match(ctx, /relevant entries already known/);
  assert.match(ctx, /\[\[Frobnicate Widget Engine\]\]/);
});

// ── prewarmEmbedModel — keep the semantic-fallback model resident ────────────
// A fake spawn (records calls, never launches a real process) is injected so
// the suite never spawns detached node children. recordingSpawn() returns a
// fresh recorder per test.
function recordingSpawn() {
  const calls = [];
  const fn = (...a) => { calls.push(a); return { unref() {} }; };
  fn.calls = calls;
  return fn;
}
// Run fn with the prewarm gate ENABLED, ALWAYS restoring it in a finally — a
// failing assertion can never leak an enabled-prewarm env into a later test.
function withPrewarmEnabled(fn) {
  delete process.env.PRISM_WIKI_PREWARM_DISABLE;
  try { fn(); } finally { process.env.PRISM_WIKI_PREWARM_DISABLE = "1"; }
}

test("prewarmEmbedModel: disabled env → no spawn, returns false", () => {
  process.env.PRISM_WIKI_PREWARM_DISABLE = "1"; // already the suite default; explicit for clarity
  const spawn = recordingSpawn();
  assert.equal(prewarmEmbedModel(spawn), false);
  assert.equal(spawn.calls.length, 0);
});

test("prewarmEmbedModel: enabled, no recent stamp → spawns detached, writes stamp", () => {
  withPrewarmEnabled(() => {
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    const spawn = recordingSpawn();
    const r = prewarmEmbedModel(spawn);
    assert.equal(r, true);
    assert.equal(spawn.calls.length, 1);
    const [cmd, args, opts] = spawn.calls[0];
    assert.equal(cmd, process.execPath, "must spawn node");
    assert.equal(args[0], "-e");
    assert.match(args[1], /api\/embeddings/, "warm-up must hit the embeddings endpoint");
    assert.match(args[1], /nomic-embed-text/, "must warm the embed model");
    assert.match(args[1], /keep_alive/, "must extend model residency");
    // compile-only (node:vm Script parses, never runs) — a syntax error in the
    // generated -e payload would otherwise pass every other assertion silently.
    assert.doesNotThrow(() => new Script(args[1]), "the spawned -e payload must be syntactically valid JS");
    assert.equal(opts.detached, true, "warm-up must outlive the hook process");
    assert.equal(opts.stdio, "ignore");
    assert.ok(existsSync(PREWARM_STAMP_PATH), "a throttle stamp must be written");
  });
});

test("prewarmEmbedModel: fresh stamp → throttled, no second spawn", () => {
  withPrewarmEnabled(() => {
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    assert.equal(prewarmEmbedModel(recordingSpawn()), true, "first call (no stamp) must spawn");
    const spawn = recordingSpawn();
    assert.equal(prewarmEmbedModel(spawn), false, "a fresh stamp must throttle the next call");
    assert.equal(spawn.calls.length, 0);
  });
});

test("prewarmEmbedModel: stamp older than the throttle window → re-warms", () => {
  withPrewarmEnabled(() => {
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    prewarmEmbedModel(recordingSpawn());                       // writes a fresh stamp
    const old = Date.now() / 1000 - 3600;                       // 1h ago — past the 20-min default throttle
    utimesSync(PREWARM_STAMP_PATH, old, old);
    const spawn = recordingSpawn();
    assert.equal(prewarmEmbedModel(spawn), true, "an expired stamp must allow a re-warm");
    assert.equal(spawn.calls.length, 1);
  });
});

test("prewarmEmbedModel: no embeddings corpus on disk → returns false, no spawn", () => {
  withPrewarmEnabled(() => {
    const saved = readFileSync(P.emb, "utf8");
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    rmSync(P.emb, { force: true });                             // simulate a missing _embeddings.jsonl
    try {
      const spawn = recordingSpawn();
      assert.equal(prewarmEmbedModel(spawn), false, "no embeddings corpus → prewarm is pointless");
      assert.equal(spawn.calls.length, 0);
    } finally {
      writeFileSync(P.emb, saved, "utf8");                      // restore — later tests need it
    }
  });
});

test("prewarmEmbedModel: a successful warm-up records prewarm_fired telemetry", () => {
  withPrewarmEnabled(() => {
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    const before = existsSync(P.tele) ? readFileSync(P.tele, "utf8") : "";
    prewarmEmbedModel(recordingSpawn());
    const after = readFileSync(P.tele, "utf8");
    assert.ok(after.length > before.length, "telemetry must grow");
    assert.match(after.slice(before.length), /prewarm_fired/, "must record a prewarm_fired event");
  });
});

test("prewarmEmbedModel: a throwing spawn is swallowed (fail-safe, never breaks the hook)", () => {
  withPrewarmEnabled(() => {
    try { rmSync(PREWARM_STAMP_PATH, { force: true }); } catch {}
    let r;
    assert.doesNotThrow(() => { r = prewarmEmbedModel(() => { throw new Error("spawn boom"); }); });
    assert.equal(r, false, "a spawn failure must return false, never throw");
  });
});

// ── U-RAG-2 stage-2 lexical rerank (RAG-UPGRADE-MS0) ─────────────────────────
// applyLexicalRerank is pure — tested in isolation with hand-built candidate
// objects ({e,s,matches,leaf,boosted,...}), no fixture needed.

test("applyLexicalRerank: non-array → []", () => {
  assert.deepEqual(applyLexicalRerank("q", null, 3), []);
  assert.deepEqual(applyLexicalRerank("q", undefined, 3), []);
  assert.deepEqual(applyLexicalRerank("q", "not-array", 3), []);
  assert.deepEqual(applyLexicalRerank("q", 42, 3), []);
});

test("applyLexicalRerank: empty list → []", () => {
  assert.deepEqual(applyLexicalRerank("q", [], 5), []);
});

test("applyLexicalRerank: single hit passes through unmodified (no synth fields)", () => {
  const items = [{ e: { name: "Solo Entry", desc: "solo body" }, s: 6, matches: 2, leaf: false }];
  const out = applyLexicalRerank("anything", items, 3);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.name, "Solo Entry");
  assert.equal(out[0].text, undefined);
  assert.equal(out[0].label, undefined);
});

test("applyLexicalRerank: narrows to topK + strips synthesized text/label/score", () => {
  const items = [
    { e: { name: "Alpha Cutting Force", desc: "cutting force notes" }, s: 9, matches: 2, leaf: false },
    { e: { name: "Beta Reference", desc: "beta unrelated" }, s: 6, matches: 2, leaf: true },
    { e: { name: "Gamma Notes", desc: "gamma stuff" }, s: 5, matches: 2, leaf: true },
    { e: { name: "Delta Thing", desc: "delta" }, s: 4, matches: 2, leaf: false },
  ];
  const out = applyLexicalRerank("cutting force", items, 2);
  assert.equal(out.length, 2, "narrowed to topK");
  for (const h of out) {
    assert.equal(typeof h.e.name, "string");
    assert.equal(typeof h.s, "number");
    // synthesized scoring inputs MUST be stripped — the renderer + telemetry
    // read {e,s,matches,leaf,boosted,...}, never text/label/score.
    assert.equal(h.text, undefined, "synthesized `text` must be stripped");
    assert.equal(h.label, undefined, "synthesized `label` must be stripped");
    assert.equal(h.score, undefined, "synthesized `score` must be stripped");
  }
});

test("applyLexicalRerank: a curated boost hit is PINNED at the head even when lexically irrelevant", () => {
  // boost_keywords exist for queries with weak token overlap — the reranker
  // must never demote a deliberate curation. The boosted entry shares NO
  // tokens with the query; two non-boosted entries match it strongly.
  const items = [
    { e: { name: "Zzz Quux Widget", desc: "unrelated frobnication" }, s: 12, matches: 2, leaf: true, boosted: true, boostHits: ["zzz quux"] },
    { e: { name: "Cutting Force Engine", desc: "computes cutting force" }, s: 8, matches: 2, leaf: false },
    { e: { name: "Cutting Force Reference", desc: "cutting force fundamentals" }, s: 7, matches: 2, leaf: true },
  ];
  const out = applyLexicalRerank("cutting force", items, 3);
  assert.equal(out.length, 3);
  assert.equal(out[0].boosted, true, "curated boost hit must stay at the head");
  assert.equal(out[0].e.name, "Zzz Quux Widget");
});

test("applyLexicalRerank: multiple boosted hits keep their incoming (curated) order", () => {
  const items = [
    { e: { name: "Boost A", desc: "aaa" }, s: 18, matches: 2, leaf: true, boosted: true, boostHits: ["a", "b"] },
    { e: { name: "Boost B", desc: "bbb" }, s: 12, matches: 2, leaf: true, boosted: true, boostHits: ["c"] },
    { e: { name: "Plain C", desc: "ccc" }, s: 6, matches: 2, leaf: false },
  ];
  const out = applyLexicalRerank("nothing here matches", items, 3);
  assert.equal(out[0].e.name, "Boost A");
  assert.equal(out[1].e.name, "Boost B");
});

test("applyLexicalRerank: non-boosted pool is reranked by lexical relevance, not raw stage-1 score", () => {
  const items = [
    // higher stage-1 `s`, but the body is irrelevant to the query
    { e: { name: "Irrelevant Thing", desc: "talks about pottery and weather" }, s: 9, matches: 2, leaf: false },
    // lower stage-1 `s`, but the body matches the query verbatim
    { e: { name: "Adaptive Toolpath Engine", desc: "adaptive toolpath clearing strategy" }, s: 5, matches: 2, leaf: true },
  ];
  const out = applyLexicalRerank("adaptive toolpath", items, 2);
  assert.equal(out[0].e.name, "Adaptive Toolpath Engine", "lexical relevance must override raw stage-1 score");
});

test("applyLexicalRerank: original `s` score flows through unchanged (telemetry reads ranked[0].s)", () => {
  const items = [
    { e: { name: "Alpha", desc: "alpha body" }, s: 7.3, matches: 2, leaf: false },
    { e: { name: "Beta", desc: "beta body" }, s: 4.1, matches: 2, leaf: true },
  ];
  const out = applyLexicalRerank("alpha", items, 2);
  const byName = Object.fromEntries(out.map((h) => [h.e.name, h.s]));
  assert.equal(byName.Alpha, 7.3, "raw stage-1 score `s` must survive verbatim");
  assert.equal(byName.Beta, 4.1);
});

test("applyLexicalRerank: a candidate missing `e` doesn't crash", () => {
  const items = [
    { s: 5, matches: 2, leaf: false },                       // malformed — no `e`
    { e: { name: "Real One", desc: "real body" }, s: 4, matches: 2, leaf: true },
  ];
  const out = applyLexicalRerank("real", items, 2);
  assert.ok(Array.isArray(out));
});

test("applyLexicalRerank: topK=0 returns []", () => {
  const items = [
    { e: { name: "A", desc: "a" }, s: 2 },
    { e: { name: "B", desc: "b" }, s: 1 },
  ];
  assert.deepEqual(applyLexicalRerank("q", items, 0), []);
});

// ── structural regression guard — fail-on-revert oracle ──────────────────────
test("source wiring: staleness guard + prewarm are actually wired into the inject path", () => {
  const src = readFileSync(new URL("./wiki-precheck-inject.mjs", import.meta.url), "utf8");
  assert.match(src, /const stale = computeEmbStaleness\(\)/, "semanticFallback must compute staleness");
  assert.match(src, /footer \+= staleFooterNote\(/, "main must append the stale footer note");
  assert.match(src, /logMiss\(promptToks, semReason, embStale\)/, "logMiss must receive the embStale flag");
  assert.match(src, /emb_stale_h:/, "telemetry must carry the staleness signal");
  assert.match(src, /embStale: !!embStale/, "the miss ledger record must include embStale");
  assert.match(src, /prewarmEmbedModel\(\);/, "main must call the embed-model prewarm");
  assert.match(src, /keep_alive: EMB_KEEP_ALIVE/, "the semantic query must extend model residency");
  // U-RAG-2: the two-stage rerank must stay wired into the inject path.
  assert.match(src, /\.slice\(0, STAGE1_K\)/, "stage-1 recall must be widened to STAGE1_K");
  assert.match(src, /applyLexicalRerank\(prompt, stage1, TOP_K\)/, "main must rerank stage-1 down to TOP_K");
});

// ── HMEMV09: Qdrant ANN primary dense path ───────────────────────────────────
const SEM_FLOOR = 0.62; // mirrors SEM_MIN_COSINE in the hook
const fakeFetch = (body, { ok = true } = {}) => async () => ({ ok, json: async () => body });

test("qdrantRankWiki maps Qdrant result -> [{n,t,cos}] from payload.node_id + score", async () => {
  const captured = {};
  const fetchImpl = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); return { ok: true, json: async () => ({ result: [
    { id: 1, score: 0.84, payload: { node_id: "kienzle-force-model" } },
    { id: 2, score: 0.71, payload: { node_id: "tribal-teb-141" } },
  ] }) }; };
  const r = await qdrantRankWiki([0.1, 0.2, 0.3], 5, { fetchImpl });
  assert.deepEqual(r.hits, [
    { n: "kienzle-force-model", t: "", cos: 0.84 },
    { n: "tribal-teb-141", t: "", cos: 0.71 },
  ]);
  // request shape: correct endpoint + the SEM_MIN_COSINE floor applied server-side
  assert.match(captured.url, /\/collections\/prism_wiki\/points\/search$/);
  assert.equal(captured.body.limit, 5);
  assert.equal(captured.body.with_payload, true);
  assert.equal(captured.body.score_threshold, SEM_FLOOR, "the 0.62 floor is enforced by Qdrant, identical to the linear path");
  assert.deepEqual(captured.body.vector, [0.1, 0.2, 0.3]);
});

test("qdrantRankWiki returns {hits:[]} on an empty (genuine-miss) answer -- NOT null (no slow-scan fallthrough)", async () => {
  const r = await qdrantRankWiki([0.1, 0.2], 5, { fetchImpl: fakeFetch({ result: [] }) });
  assert.notEqual(r, null, "Qdrant answered -> object, even if empty");
  assert.deepEqual(r.hits, []);
});

test("qdrantRankWiki returns null on an empty/invalid query vector (no fetch)", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, json: async () => ({ result: [] }) }; };
  assert.equal(await qdrantRankWiki([], 5, { fetchImpl }), null);
  assert.equal(await qdrantRankWiki(null, 5, { fetchImpl }), null);
  assert.equal(called, false, "a bad query vector must never hit the network");
});

test("qdrantRankWiki returns null when Qdrant is down (-> caller falls through to linear scan)", async () => {
  assert.equal(await qdrantRankWiki([0.1], 5, { fetchImpl: fakeFetch({}, { ok: false }) }), null, "non-ok response -> null");
  const thrower = async () => { throw new Error("ECONNREFUSED"); };
  assert.equal(await qdrantRankWiki([0.1], 5, { fetchImpl: thrower }), null, "fetch throw (down/timeout) -> null, never throws");
  assert.equal(await qdrantRankWiki([0.1], 5, { fetchImpl: fakeFetch({ result: "not-an-array" }) }), null, "malformed result -> null");
});

test("qdrantRankWiki dedups by node_id and skips entries missing a payload node_id", async () => {
  const body = { result: [
    { score: 0.9, payload: { node_id: "dup" } },
    { score: 0.8, payload: { node_id: "dup" } },          // duplicate id
    { score: 0.7, payload: {} },                          // no node_id
    { score: 0.6 },                                        // no payload
    { score: 0.5, payload: { node_id: "keep" } },
  ] };
  const r = await qdrantRankWiki([0.1], 10, { fetchImpl: fakeFetch(body) });
  assert.deepEqual(r.hits.map((h) => h.n), ["dup", "keep"], "first dup kept, second dropped, payload-less skipped");
});

test("source wiring: semanticFallback uses the Qdrant ANN primary with a linear fail-soft", () => {
  const src = readFileSync(new URL("./wiki-precheck-inject.mjs", import.meta.url), "utf8");
  assert.match(src, /if \(WIKI_QDRANT_ENABLED\)/, "Qdrant path is gated by the revert knob");
  assert.match(src, /const ann = await qdrantRankWiki\(qvec, TOP_K\)/, "ANN query is wired into semanticFallback");
  assert.match(src, /return linearSemanticFallback\(prompt, stale, qvec\)/, "Qdrant-down path reuses qvec + falls through to linear scan");
  assert.match(src, /PRISM_WIKI_QDRANT_DISABLE/, "a documented revert knob exists");
});
