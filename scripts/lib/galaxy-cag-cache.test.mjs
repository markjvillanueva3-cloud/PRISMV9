/**
 * Tests for galaxy-cag-cache.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-CAG).
 * The load-bearing test: a doctrine-content edit changes the corpus fingerprint and
 * INVALIDATES the cached answer (the never-stale guarantee, R12). Run:
 *   node --test scripts/lib/galaxy-cag-cache.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuery,
  cagKey,
  corpusFingerprint,
  normalizeForFingerprint,
  isFresh,
  getCached,
  putCached,
  pruneEntries,
} from "./galaxy-cag-cache.mjs";

// --- normalizeQuery / cagKey ---
test("normalizeQuery: collapses whitespace + case so trivial variants share a slot", () => {
  assert.equal(normalizeQuery("  How   does\tMILL  work? "), "how does mill work?");
  assert.equal(normalizeQuery(null), "");
});

test("cagKey: same galaxy+model+normalized query -> same key; different query -> different", () => {
  const k1 = cagKey("mill", "qwen2.5-coder:32b", "What is mill?");
  const k2 = cagKey("mill", "qwen2.5-coder:32b", "what is   MILL?"); // normalizes equal
  const k3 = cagKey("mill", "qwen2.5-coder:32b", "what is lathe?");
  const k4 = cagKey("lathe", "qwen2.5-coder:32b", "What is mill?"); // different galaxy
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
  assert.notEqual(k1, k4);
  assert.ok(k1.startsWith("mill::qwen2.5-coder:32b::"));
});

// --- corpusFingerprint + the never-stale guarantee ---
test("corpusFingerprint: order-independent, content-sensitive", () => {
  const a = [{ source: "CLAUDE.md", text: "alpha" }, { source: "MEMORY.md", text: "beta" }];
  const b = [{ source: "MEMORY.md", text: "beta" }, { source: "CLAUDE.md", text: "alpha" }];
  assert.equal(corpusFingerprint(a), corpusFingerprint(b)); // order-independent
  const c = [{ source: "CLAUDE.md", text: "alpha EDITED" }, { source: "MEMORY.md", text: "beta" }];
  assert.notEqual(corpusFingerprint(a), corpusFingerprint(c)); // content edit -> new fp
  assert.equal(corpusFingerprint([]), corpusFingerprint(null)); // empty stable
});

test("LOAD-BEARING: a doctrine edit INVALIDATES the cached answer (never-stale)", () => {
  const docsV1 = [{ source: "mill/CLAUDE.md", text: "mill does milling" }];
  const fpV1 = corpusFingerprint(docsV1);
  const key = cagKey("mill", "m", "what does mill do?");
  let cache = putCached({}, key, { answer: "milling", corpusHash: fpV1, ts: 1 }, {});
  // same corpus -> HIT
  assert.ok(getCached(cache, key, fpV1));
  // doctrine edited -> fingerprint changes -> cached entry is STALE -> MISS (forces re-reason)
  const fpV2 = corpusFingerprint([{ source: "mill/CLAUDE.md", text: "mill does milling AND turning now" }]);
  assert.equal(getCached(cache, key, fpV2), null);
  assert.equal(isFresh({ answer: "x", corpusHash: fpV1 }, fpV2), false);
});

// --- normalizeForFingerprint: the doctrine-fingerprint denoise (CAG warm-rate fix) ---
test("corpusFingerprint: timestamp/session-only churn does NOT invalidate (recoverable churn fix)", () => {
  // Two regenerations of the SAME doctrine differing ONLY in volatile metadata (fresh
  // timestamp, session id, relative-time) MUST fingerprint identically -> cache HIT, not bust.
  const v1 = [{ source: "alpha/AWARENESS.md", text: "rule: route before grep. generated 2026-06-27T17:23:44.111Z session claude-09b8fb0f, audit 3.1h old" }];
  const v2 = [{ source: "alpha/AWARENESS.md", text: "rule: route before grep. generated 2026-06-27T19:01:02.999Z session claude-deadbeef, audit 0.2h old" }];
  assert.equal(corpusFingerprint(v1), corpusFingerprint(v2));
});

test("corpusFingerprint: a REAL doctrine edit still invalidates even with identical timestamps (never-stale preserved)", () => {
  const base = [{ source: "alpha/CLAUDE.md", text: "route before grep at 2026-06-27T00:00:00Z" }];
  const edited = [{ source: "alpha/CLAUDE.md", text: "grep before route at 2026-06-27T00:00:00Z" }]; // same ts, real text change
  assert.notEqual(corpusFingerprint(base), corpusFingerprint(edited));
});

test("normalizeForFingerprint: bare numbers/counts are NOT stripped (a count can be doctrine)", () => {
  // A threshold/count change MUST still invalidate -- we strip only timestamps/ids, never numbers.
  assert.notEqual(normalizeForFingerprint("threshold 26 slots"), normalizeForFingerprint("threshold 27 slots"));
});

test("normalizeForFingerprint: strips uuid + relative-time; pure on empty/null", () => {
  assert.equal(
    normalizeForFingerprint("id 09b8fb0f-8ff3-49cb-9bf7-b3854eadb760 x"),
    normalizeForFingerprint("id 11111111-2222-3333-4444-555555555555 x"),
  );
  assert.equal(normalizeForFingerprint("seen 27h ago"), normalizeForFingerprint("seen 2d ago"));
  assert.equal(normalizeForFingerprint(null), "");
  assert.equal(normalizeForFingerprint(""), "");
});

// --- getCached / putCached / prune ---
test("getCached: miss on unknown key or stale fingerprint -> null", () => {
  assert.equal(getCached({ entries: {} }, "nope", "fp"), null);
  assert.equal(getCached(null, "k", "fp"), null);
});

test("putCached: returns a NEW cache, does not mutate input", () => {
  const orig = { entries: {} };
  const next = putCached(orig, "k", { answer: "a", corpusHash: "fp", ts: 1 }, {});
  assert.deepEqual(orig.entries, {}); // input untouched
  assert.ok(next.entries.k);
  assert.equal(next.schemaVersion, "1.0.0");
});

test("pruneEntries: drops OLDEST by ts beyond maxEntries", () => {
  const entries = { a: { ts: 1 }, b: { ts: 2 }, c: { ts: 3 } };
  const kept = pruneEntries(entries, 2);
  assert.deepEqual(Object.keys(kept).sort(), ["b", "c"]); // 'a' (oldest) dropped
  assert.deepEqual(Object.keys(pruneEntries(entries, 5)).sort(), ["a", "b", "c"]); // under cap -> all
});

test("putCached: enforces maxEntries via prune", () => {
  let cache = { entries: {} };
  for (let i = 0; i < 5; i++) cache = putCached(cache, `k${i}`, { answer: i, corpusHash: "fp", ts: i }, { maxEntries: 3 });
  assert.equal(Object.keys(cache.entries).length, 3);
  assert.ok(cache.entries.k4 && cache.entries.k3 && cache.entries.k2); // newest 3 kept
  assert.ok(!cache.entries.k0); // oldest pruned
});
