// memo-embed-lib.test.mjs
// ------------------------
// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3) — unit tests for the shared
// semantic-recall helpers. Pure functions are exhaustively tested; embedText's
// network failure path is verified fail-soft (returns null, never throws).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { salientSlice, cosine, semanticTopK, loadEmbedCache, embedText, embedTextBatch } from "./memo-embed-lib.mjs";

// ---------- salientSlice ----------
test("salientSlice extracts frontmatter description + title + opening", () => {
  const md = `---
name: foo
description: A memo about cutting force
metadata:
  type: reference
---

# Cutting Force Notes

The Kienzle model relates specific cutting force to chip thickness.

Second paragraph ignored.`;
  const s = salientSlice(md);
  assert.ok(s.includes("A memo about cutting force"), "has description");
  assert.ok(s.includes("Cutting Force Notes"), "has title");
  assert.ok(s.includes("Kienzle model"), "has opening paragraph");
  assert.ok(!s.includes("Second paragraph"), "stops at first paragraph");
});

test("salientSlice handles no-frontmatter and caps length", () => {
  assert.equal(salientSlice(""), "");
  assert.equal(salientSlice(null), "");
  assert.equal(salientSlice(undefined), "");
  const long = "# T\n\n" + "x".repeat(5000);
  assert.ok(salientSlice(long).length <= 800, "capped at 800 chars");
});

test("salientSlice strips quotes from description", () => {
  const md = `---
description: "quoted desc"
---

# Title

Body.`;
  const s = salientSlice(md);
  assert.ok(s.includes("quoted desc"));
  assert.ok(!s.includes('"quoted desc"'), "surrounding quotes stripped");
});

// ---------- cosine ----------
test("cosine: identical vectors = 1, orthogonal = 0", () => {
  assert.equal(cosine([1, 0, 0], [1, 0, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.ok(Math.abs(cosine([1, 1], [1, 1]) - 1) < 1e-9);
});

test("cosine: safe defaults (mismatched length, zero-norm, non-array) = 0, never NaN", () => {
  assert.equal(cosine([1, 2, 3], [1, 2]), 0, "length mismatch");
  assert.equal(cosine([0, 0], [1, 1]), 0, "zero norm");
  assert.equal(cosine(null, [1]), 0);
  assert.equal(cosine([1], "nope"), 0);
  assert.equal(cosine([], []), 0);
  assert.ok(!Number.isNaN(cosine([0, 0], [0, 0])), "never NaN");
});

test("cosine: known intermediate value", () => {
  // [1,1] vs [1,0]: dot=1, |a|=√2, |b|=1 → 1/√2 ≈ 0.7071
  assert.ok(Math.abs(cosine([1, 1], [1, 0]) - 0.70710678) < 1e-6);
});

// ---------- semanticTopK ----------
test("semanticTopK ranks by cosine desc, respects k and minScore", () => {
  const q = [1, 0, 0];
  const cache = new Map([
    ["a.md", { vec: [1, 0, 0] }],     // cos 1.0
    ["b.md", { vec: [0.9, 0.1, 0] }], // high
    ["c.md", { vec: [0, 1, 0] }],     // cos 0 — gated out by minScore
  ]);
  const out = semanticTopK(q, cache, { k: 5, minScore: 0.5 });
  assert.equal(out.length, 2, "c gated by minScore");
  assert.equal(out[0].name, "a.md", "best first");
  assert.ok(out[0].score >= out[1].score, "descending");
});

test("semanticTopK respects k cap and excludeNames", () => {
  const q = [1, 0];
  const cache = new Map([
    ["a.md", { vec: [1, 0] }],
    ["b.md", { vec: [1, 0] }],
    ["c.md", { vec: [1, 0] }],
  ]);
  assert.equal(semanticTopK(q, cache, { k: 2, minScore: 0.1 }).length, 2, "k cap");
  const ex = semanticTopK(q, cache, { k: 5, minScore: 0.1, excludeNames: new Set(["a.md"]) });
  assert.ok(!ex.some((x) => x.name === "a.md"), "excluded name absent");
});

test("semanticTopK empty/guard inputs → []", () => {
  assert.deepEqual(semanticTopK([], new Map([["a", { vec: [1] }]]), {}), []);
  assert.deepEqual(semanticTopK([1], new Map(), {}), []);
  assert.deepEqual(semanticTopK([1], null, {}), []);
});

// ---------- loadEmbedCache ----------
test("loadEmbedCache parses JSONL, skips malformed, null on absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "memo-cache-"));
  try {
    const p = join(dir, "c.jsonl");
    writeFileSync(p, [
      JSON.stringify({ name: "a.md", vec: [1, 2, 3], hash: "h1" }),
      "{ this is not json",
      "",
      JSON.stringify({ name: "b.md", vec: [4, 5, 6] }),       // no hash → hash:""
      JSON.stringify({ name: "noVec.md" }),                    // no vec → skipped
      JSON.stringify({ vec: [1] }),                            // no name → skipped
    ].join("\n"), "utf8");
    const m = loadEmbedCache(p);
    assert.equal(m.size, 2, "2 valid entries (malformed/no-vec/no-name skipped)");
    assert.deepEqual(m.get("a.md").vec, [1, 2, 3]);
    assert.equal(m.get("a.md").hash, "h1");
    assert.equal(m.get("b.md").hash, "", "missing hash defaults to empty string");
    assert.equal(loadEmbedCache(join(dir, "nope.jsonl")), null, "absent file → null");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------- embedText fail-soft ----------
test("embedText returns null on empty text without a network call", async () => {
  assert.equal(await embedText(""), null);
  assert.equal(await embedText("   "), null);
  assert.equal(await embedText(null), null);
});

test("embedText fail-soft: unreachable host → null (never throws), bounded by timeout", async () => {
  const t0 = Date.now();
  const r = await embedText("hello", { url: "http://127.0.0.1:1", timeoutMs: 800 });
  assert.equal(r, null, "unreachable → null");
  assert.ok(Date.now() - t0 < 3000, "returns promptly (immediate refuse or within timeout)");
});

// ---------- embedTextBatch (#7) ----------
test("embedTextBatch returns [] for empty/non-array input (no network call)", async () => {
  assert.deepEqual(await embedTextBatch([]), []);
  assert.deepEqual(await embedTextBatch(null), []);
  assert.deepEqual(await embedTextBatch("not-an-array"), []);
});

test("embedTextBatch all-empty-strings → array of nulls without a network call", async () => {
  const out = await embedTextBatch(["", "   ", null], { url: "http://127.0.0.1:1", timeoutMs: 500 });
  assert.deepEqual(out, [null, null, null], "no embeddable text → per-slot null, no fetch");
});

test("embedTextBatch fail-soft: unreachable host → null (caller falls back), bounded time", async () => {
  const t0 = Date.now();
  const r = await embedTextBatch(["a", "b", "c"], { url: "http://127.0.0.1:1", timeoutMs: 800 });
  assert.equal(r, null, "unreachable → null (signals caller to per-item fallback)");
  assert.ok(Date.now() - t0 < 3000, "returns promptly");
});

// ---------- U-OBS-GALAXY-BRAIN-RECALL: explicit `path` plumb-through ----------
// The 34 per-galaxy MEMORY.md brains live OUTSIDE MEMORY_DIR, so cache entries
// carry an explicit `path`; the recall hook reads `s.path || MEMORY_DIR/name`.
// These pin the contract end-to-end (loadEmbedCache → semanticTopK → consumer).
test("loadEmbedCache carries an explicit `path` when present, omits it otherwise (backward-compat)", () => {
  const dir = mkdtempSync(join(tmpdir(), "memo-cache-path-"));
  try {
    const p = join(dir, "c.jsonl");
    const galPath = "H:/prism/mcp-server/src/engines/mill/MEMORY.md";
    writeFileSync(p, [
      JSON.stringify({ name: "flat.md", vec: [1, 0], hash: "h" }),                 // no path
      JSON.stringify({ name: "galaxy/mill", vec: [0, 1], hash: "g", path: galPath }),
      JSON.stringify({ name: "emptyPath.md", vec: [1, 1], hash: "e", path: "" }),   // empty → absent
    ].join("\n"), "utf8");
    const m = loadEmbedCache(p);
    assert.equal(m.get("flat.md").path, undefined, "flat memo entry has no path (back-compat)");
    assert.equal(m.get("galaxy/mill").path, galPath, "galaxy entry preserves its resolvable path");
    assert.equal(m.get("emptyPath.md").path, undefined, "empty-string path treated as absent");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("semanticTopK surfaces `path` for entries that carry it, omits it for flat memos", () => {
  const q = [1, 0];
  const galPath = "H:/prism/mcp-server/src/engines/mill/MEMORY.md";
  const cache = new Map([
    ["flat.md", { vec: [1, 0], hash: "h" }],                       // no path
    ["galaxy/mill", { vec: [1, 0], hash: "g", path: galPath }],
  ]);
  const out = semanticTopK(q, cache, { k: 5, minScore: 0.5 });
  const flat = out.find((x) => x.name === "flat.md");
  const gal = out.find((x) => x.name === "galaxy/mill");
  assert.equal(flat.path, undefined, "flat-memo hit carries no path → consumer falls back to MEMORY_DIR/name");
  assert.equal(gal.path, galPath, "galaxy hit carries the path the consumer reads directly");
});

test("semanticTopK nameFilter restricts the pass to matching entries (galaxy-tier floor)", () => {
  const q = [1, 0];
  const cache = new Map([
    ["flat.md", { vec: [1, 0], hash: "f" }],
    ["galaxy/mill", { vec: [1, 0], hash: "m", path: "H:/prism/mcp-server/src/engines/mill/MEMORY.md" }],
    ["galaxy/lathe", { vec: [0.95, 0.05], hash: "l", path: "H:/prism/mcp-server/src/engines/lathe/MEMORY.md" }],
  ]);
  // No filter → all entries eligible (flat memo ranks too).
  const all = semanticTopK(q, cache, { k: 5, minScore: 0.1 });
  assert.ok(all.some((x) => x.name === "flat.md"), "no filter: flat memo included");
  // galaxy-only filter → flat memo excluded; k=1 returns the single best galaxy.
  const gal = semanticTopK(q, cache, { k: 1, minScore: 0.1, nameFilter: (n) => n.startsWith("galaxy/") });
  assert.equal(gal.length, 1, "k=1 → exactly one galaxy hit");
  assert.equal(gal[0].name, "galaxy/mill", "best galaxy first, flat memo filtered out");
  assert.ok(gal.every((x) => x.name.startsWith("galaxy/")), "filter excludes every non-galaxy entry");
});
