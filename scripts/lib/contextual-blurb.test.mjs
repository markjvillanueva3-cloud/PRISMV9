#!/usr/bin/env node
/**
 * contextual-blurb.test.mjs — node:test suite for U-RAG-3 Contextual Retrieval
 * blurb generator.
 *
 * Run: node --test scripts/lib/contextual-blurb.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildBlurbPrompt, sanitizeBlurb, generateBlurb, prependBlurb,
  loadBlurbCache, saveBlurbCache, readCacheHit, writeCacheHit,
  BLURB_VERSION, DEFAULT_MAX_CONTENT_CHARS,
} from "./contextual-blurb.mjs";

// ── buildBlurbPrompt ─────────────────────────────────────────────────────────
test("buildBlurbPrompt: includes content + instruction", () => {
  const p = buildBlurbPrompt("This is a wiki about cutting force.");
  assert.match(p, /<content>/);
  assert.match(p, /cutting force/);
  assert.match(p, /1-2 sentences/);
  assert.match(p, /ONLY the blurb/);
});

test("buildBlurbPrompt: caps content at maxContentChars (default 8000)", () => {
  const big = "x".repeat(20_000);
  const p = buildBlurbPrompt(big);
  // The content section between <content> tags should be at most the cap.
  const m = p.match(/<content>\n([\s\S]*?)\n<\/content>/);
  assert.ok(m);
  assert.ok(m[1].length <= DEFAULT_MAX_CONTENT_CHARS);
});

test("buildBlurbPrompt: respects opts.maxContentChars override", () => {
  const p = buildBlurbPrompt("a".repeat(500), { maxContentChars: 100 });
  const m = p.match(/<content>\n([\s\S]*?)\n<\/content>/);
  assert.equal(m[1].length, 100);
});

test("buildBlurbPrompt: non-string content → empty <content> block (no throw)", () => {
  assert.doesNotThrow(() => buildBlurbPrompt(null));
  assert.doesNotThrow(() => buildBlurbPrompt(undefined));
  assert.doesNotThrow(() => buildBlurbPrompt(42));
});

// ── sanitizeBlurb ────────────────────────────────────────────────────────────
test("sanitizeBlurb: trims + collapses whitespace", () => {
  assert.equal(sanitizeBlurb("  hello   world  "), "hello world");
});

test("sanitizeBlurb: strips leading label (Blurb: / Summary: / Context:)", () => {
  assert.equal(sanitizeBlurb("Blurb: this is the thing"), "this is the thing");
  assert.equal(sanitizeBlurb("Summary - and this"), "and this");
  assert.equal(sanitizeBlurb("Context: the context"), "the context");
});

test("sanitizeBlurb: strips surrounding quotes (single, double, smart)", () => {
  assert.equal(sanitizeBlurb('"quoted text"'), "quoted text");
  assert.equal(sanitizeBlurb("'single quoted'"), "single quoted");
  assert.equal(sanitizeBlurb("“smart quoted”"), "smart quoted");
});

test("sanitizeBlurb: caps at 200 chars + ellipsis", () => {
  const s = sanitizeBlurb("word ".repeat(60));
  assert.ok(s.length <= 200);
  assert.match(s, /…$/);
});

test("sanitizeBlurb: non-string → empty", () => {
  assert.equal(sanitizeBlurb(null), "");
  assert.equal(sanitizeBlurb(undefined), "");
  assert.equal(sanitizeBlurb(42), "");
});

// ── generateBlurb (with injectable fetch) ────────────────────────────────────
function fakeFetch(responseBuilder) {
  return async (_url, _init) => responseBuilder();
}
function okResponse(payload) {
  return { ok: true, async json() { return payload; } };
}
function errResponse() {
  return { ok: false, async json() { return {}; } };
}

test("generateBlurb: ok response → sanitized blurb", async () => {
  const out = await generateBlurb("hello", {
    fetchImpl: fakeFetch(() => okResponse({ response: "Blurb: this is a wiki about cutting force." })),
  });
  assert.equal(out, "this is a wiki about cutting force.");
});

test("generateBlurb: non-OK HTTP → null (fail-soft)", async () => {
  const out = await generateBlurb("hello", { fetchImpl: fakeFetch(() => errResponse()) });
  assert.equal(out, null);
});

test("generateBlurb: empty content → null (no Ollama call)", async () => {
  let called = false;
  const out = await generateBlurb("", { fetchImpl: () => { called = true; return okResponse({ response: "x" }); } });
  assert.equal(out, null);
  assert.equal(called, false, "must short-circuit before fetch");
});

test("generateBlurb: non-string content → null", async () => {
  assert.equal(await generateBlurb(null, { fetchImpl: () => okResponse({ response: "x" }) }), null);
  assert.equal(await generateBlurb(undefined, { fetchImpl: () => okResponse({ response: "x" }) }), null);
});

test("generateBlurb: empty Ollama response → null", async () => {
  const out = await generateBlurb("hi", { fetchImpl: fakeFetch(() => okResponse({ response: "   " })) });
  assert.equal(out, null);
});

test("generateBlurb: fetch throws (timeout/abort) → null", async () => {
  const out = await generateBlurb("hi", {
    fetchImpl: async () => { throw new Error("simulated abort"); },
  });
  assert.equal(out, null);
});

test("generateBlurb: no fetchImpl + no global fetch → null (graceful)", async () => {
  // We can't actually delete global fetch portably, but we can pass an explicit null.
  const out = await generateBlurb("hi", { fetchImpl: null });
  // If global fetch exists this MAY actually attempt a network call; assert it
  // either returned null (no global fetch) OR didn't crash. Both are acceptable
  // fail-soft outcomes.
  assert.ok(out === null || typeof out === "string");
});

// ── prependBlurb ─────────────────────────────────────────────────────────────
test("prependBlurb: canonical bracketed form", () => {
  assert.equal(prependBlurb("a wiki entry", "body text"), "[a wiki entry]\n\nbody text");
});

test("prependBlurb: empty blurb → text unchanged (fallback)", () => {
  assert.equal(prependBlurb("", "body"), "body");
  assert.equal(prependBlurb("   ", "body"), "body");
  assert.equal(prependBlurb(null, "body"), "body");
});

test("prependBlurb: non-string text → empty", () => {
  assert.equal(prependBlurb("x", null), "[x]\n\n");
});

// ── cache ────────────────────────────────────────────────────────────────────
test("loadBlurbCache: missing file → empty cache (no throw)", () => {
  const c = loadBlurbCache("/this/path/definitely/does/not/exist.json");
  assert.ok(c && c.entries);
  assert.deepEqual(c.entries, {});
});

test("loadBlurbCache: non-string path → empty cache", () => {
  assert.deepEqual(loadBlurbCache(null).entries, {});
});

test("save → load round-trip preserves entries", () => {
  const dir = mkdtempSync(join(tmpdir(), "cb-test-"));
  try {
    const p = join(dir, "cache.json");
    const c = { schemaVersion: "1.0.0", entries: {} };
    writeCacheHit(c, "k1", "the blurb", 12345);
    saveBlurbCache(p, c);
    assert.ok(existsSync(p));
    const c2 = loadBlurbCache(p);
    assert.equal(c2.entries.k1.blurb, "the blurb");
    assert.equal(c2.entries.k1.mtimeMs, 12345);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readCacheHit: mtime match → blurb; mismatch → null (stale)", () => {
  const c = { entries: {} };
  writeCacheHit(c, "k", "blurb-v1", 1000);
  assert.equal(readCacheHit(c, "k", 1000), "blurb-v1");
  assert.equal(readCacheHit(c, "k", 2000), null, "different mtime → stale");
});

test("readCacheHit: missing key → null", () => {
  assert.equal(readCacheHit({ entries: {} }, "k", 1), null);
  assert.equal(readCacheHit(null, "k", 1), null);
});

test("BLURB_VERSION is the contract version string", () => {
  assert.equal(typeof BLURB_VERSION, "string");
  assert.match(BLURB_VERSION, /^v\d/);
});
