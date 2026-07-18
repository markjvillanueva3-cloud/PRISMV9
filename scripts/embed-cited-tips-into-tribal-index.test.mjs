#!/usr/bin/env node
/**
 * embed-cited-tips-into-tribal-index.test.mjs — node:test suite for pure
 * helpers of the cited-tips embedder. Mirrors the sister scripts'
 * (embed-engines-into-tribal-index.test.mjs) testing pattern.
 *
 * @milestone TRIBAL-OUTCOME-LOOP-MS0/U-TTOB-EMBED
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseTipsFromCatalog,
  tipToEmbeddingInput,
  hashInput,
  buildTipEntry,
  spliceTipEntries,
  loadIndex,
  saveIndex,
} from "./embed-cited-tips-into-tribal-index.mjs";
// Force a real sharded on-disk layout (manifest + shards, monolith removed) to
// pin the shard-read clobber regression below.
import { writeTribalIndex } from "./lib/write-tribal-index.mjs";

test("parseTipsFromCatalog parses a single canonical-schema tip", () => {
  const fragment = `
[
  {
    id: "MILL-TIP-EXAMPLE-FOO",
    operation: "face_milling",
    headline: "headline text",
    body: "body text",
    sourceId: "X-SRC",
    vendor: "Dapra",
    citation: "https://example.com/foo",
    tags: ["face_milling", "dapra", "video_extraction"],
  },
];
`;
  const tips = parseTipsFromCatalog(fragment, "MILL-TIP-");
  assert.equal(tips.length, 1);
  assert.equal(tips[0].id, "MILL-TIP-EXAMPLE-FOO");
  assert.equal(tips[0].operation, "face_milling");
  assert.equal(tips[0].headline, "headline text");
  assert.equal(tips[0].body, "body text");
  assert.equal(tips[0].vendor, "Dapra");
  assert.equal(tips[0].citation, "https://example.com/foo");
  assert.deepEqual(tips[0].tags, ["face_milling", "dapra", "video_extraction"]);
});

test("parseTipsFromCatalog parses multiple tips from one catalog text", () => {
  const fragment = `
[
  {
    id: "MILL-TIP-A",
    operation: "slotting",
    headline: "A headline",
    body: "A body",
    vendor: "Haas",
    citation: "url-a",
    tags: ["slotting"],
  },
  {
    id: "MILL-TIP-B",
    operation: "drilling",
    headline: "B headline",
    body: "B body",
    vendor: "Sandvik Coromant",
    citation: "url-b",
    tags: ["drilling", "carbide"],
  },
];
`;
  const tips = parseTipsFromCatalog(fragment, "MILL-TIP-");
  assert.equal(tips.length, 2);
  assert.deepEqual(tips.map((t) => t.id), ["MILL-TIP-A", "MILL-TIP-B"]);
  assert.deepEqual(tips[1].tags, ["drilling", "carbide"]);
});

test("parseTipsFromCatalog respects idPrefix and does not cross-match", () => {
  const fragment = `
  {
    id: "MILL-TIP-MIXED",
    operation: "face_milling",
    headline: "mill",
    body: "mill",
    vendor: "X",
    citation: "u",
    tags: [],
  },
  {
    id: "WEDM-TIP-MIXED",
    operation: "wedm_rough",
    headline: "wedm",
    body: "wedm",
    vendor: "Y",
    citation: "v",
    tags: [],
  },
`;
  const millTips = parseTipsFromCatalog(fragment, "MILL-TIP-");
  const wedmTips = parseTipsFromCatalog(fragment, "WEDM-TIP-");
  assert.deepEqual(millTips.map((t) => t.id), ["MILL-TIP-MIXED"]);
  assert.deepEqual(wedmTips.map((t) => t.id), ["WEDM-TIP-MIXED"]);
});

test("parseTipsFromCatalog returns empty array on empty input", () => {
  assert.deepEqual(parseTipsFromCatalog("", "MILL-TIP-"), []);
  assert.deepEqual(parseTipsFromCatalog("export const FOO = [];", "MILL-TIP-"), []);
});

test("tipToEmbeddingInput concatenates fields with newlines", () => {
  const input = tipToEmbeddingInput({
    id: "MILL-TIP-X",
    operation: "slotting",
    vendor: "Haas",
    headline: "H",
    body: "B",
    tags: ["t1", "t2"],
  });
  assert.match(input, /id: MILL-TIP-X/);
  assert.match(input, /operation: slotting/);
  assert.match(input, /vendor: Haas/);
  assert.match(input, /headline: H/);
  assert.match(input, /body: B/);
  assert.match(input, /tags: t1, t2/);
});

test("tipToEmbeddingInput truncates oversized bodies to MAX_INPUT_CHARS", () => {
  const longBody = "x".repeat(5000);
  const input = tipToEmbeddingInput({
    id: "MILL-TIP-LONG",
    operation: "x",
    vendor: "x",
    headline: "x",
    body: longBody,
    tags: [],
  });
  assert.equal(input.length, 3000);
});

test("tipToEmbeddingInput handles missing tags gracefully", () => {
  const input = tipToEmbeddingInput({
    id: "MILL-TIP-Y",
    operation: "x",
    vendor: "x",
    headline: "x",
    body: "x",
    tags: undefined,
  });
  assert.match(input, /tags: /);
});

test("hashInput returns a stable 16-char hex hash for identical inputs", () => {
  const h1 = hashInput("the same input");
  const h2 = hashInput("the same input");
  assert.equal(h1, h2);
  assert.equal(h1.length, 16);
  assert.match(h1, /^[a-f0-9]{16}$/);
});

test("hashInput returns different hashes for different inputs", () => {
  assert.notEqual(hashInput("input-a"), hashInput("input-b"));
});

// ── BLACKWELL-DB-GEN-MS0 array-shape fix (slot:juliett) ─────────────────────
// These pin the exact regression the rewrite fixes: the prior version wrote
// OBJECT-keyed entries that JSON.stringify silently dropped on an ARRAY index.

const SAMPLE_TIP = {
  id: "MILL-TIP-FACE-01",
  operation: "face_milling",
  vendor: "Dapra",
  headline: "Climb-mill thin walls to avoid deflection",
  body: "Use a 45° lead face mill and climb-cut",
  citation: "https://example.com/x",
  tags: ["face_milling", "dapra"],
};

test("buildTipEntry produces the CANONICAL array-entry shape tribal-rerank reads", () => {
  const vec = new Array(768).fill(0.01);
  const e = buildTipEntry(SAMPLE_TIP, "mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts", "mill", vec);
  // The exact fields tribal-rerank.mjs reads: id, embedding(array), domain, source, text, title.
  assert.equal(e.id, "tip:MILL-TIP-FACE-01"); // tip: namespace — no collision with wiki:/engine:/external:
  assert.equal(e.source, "tribal-tip");
  assert.equal(e.domain, "mill"); // a VALID_DOMAINS member → in-domain 2× boost fires
  assert.equal(e.title, SAMPLE_TIP.headline);
  assert.ok(Array.isArray(e.embedding) && e.embedding.length === 768);
  assert.ok(typeof e.text === "string" && e.text.length <= 400);
  assert.match(e.hash, /^[a-f0-9]{16}$/);
  // provenance fields preserved for audit
  assert.equal(e.tipId, "MILL-TIP-FACE-01");
  assert.equal(e.vendor, "Dapra");
});

test("buildTipEntry falls back to id for title when headline is empty", () => {
  const e = buildTipEntry({ ...SAMPLE_TIP, headline: "" }, "p.ts", "general", [0.1]);
  assert.equal(e.title, "MILL-TIP-FACE-01");
});

test("spliceTipEntries APPENDS new entries and keeps idIndexMap consistent", () => {
  const idx = { entries: [{ id: "wiki:existing", embedding: [0] }] };
  const map = new Map(idx.entries.map((e, i) => [e.id, i]));
  const a = buildTipEntry(SAMPLE_TIP, "p.ts", "mill", [0.1]);
  const r = spliceTipEntries(idx, [a], map);
  assert.deepEqual(r, { added: 1, replaced: 0 });
  assert.equal(idx.entries.length, 2);
  assert.equal(idx.entries[1].id, "tip:MILL-TIP-FACE-01");
  assert.equal(map.get("tip:MILL-TIP-FACE-01"), 1); // map points at the new slot
});

test("spliceTipEntries REPLACES in place by id (no duplicate on re-embed)", () => {
  const first = buildTipEntry(SAMPLE_TIP, "p.ts", "mill", [0.1]);
  const idx = { entries: [first] };
  const map = new Map([[first.id, 0]]);
  const second = buildTipEntry({ ...SAMPLE_TIP, body: "changed body" }, "p.ts", "mill", [0.9]);
  const r = spliceTipEntries(idx, [second], map);
  assert.deepEqual(r, { added: 0, replaced: 1 });
  assert.equal(idx.entries.length, 1); // replaced in place, NOT appended
  assert.deepEqual(idx.entries[0].embedding, [0.9]);
});

test("spliceTipEntries handles append-then-replace of the same id within one batch", () => {
  const idx = { entries: [] };
  const map = new Map();
  const v1 = buildTipEntry(SAMPLE_TIP, "p.ts", "mill", [0.1]);
  const v2 = buildTipEntry({ ...SAMPLE_TIP, body: "v2" }, "p.ts", "mill", [0.2]);
  const r = spliceTipEntries(idx, [v1, v2], map);
  assert.deepEqual(r, { added: 1, replaced: 1 });
  assert.equal(idx.entries.length, 1); // single id ⇒ one slot
  assert.deepEqual(idx.entries[0].embedding, [0.2]); // last wins
});

test("loadIndex REFUSES an object-shaped entries index (the exact prior bug)", () => {
  const tmp = path.join(os.tmpdir(), `cited-tips-objshape-${process.pid}-${Math.floor(performance.now())}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: "1.0.0", dim: 768, entries: { "tip:x": { embedding: [0] } } }));
  try {
    assert.throws(() => loadIndex(tmp), /must be an ARRAY/);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test("loadIndex accepts an array-shaped index and a round-trips through saveIndex", () => {
  const tmp = path.join(os.tmpdir(), `cited-tips-roundtrip-${process.pid}-${Math.floor(performance.now())}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: 768, entries: [{ id: "wiki:a", embedding: [0.5] }] }));
  try {
    const idx = loadIndex(tmp);
    assert.ok(Array.isArray(idx.entries));
    const e = buildTipEntry(SAMPLE_TIP, "p.ts", "mill", [0.3]);
    spliceTipEntries(idx, [e], new Map(idx.entries.map((x, i) => [x.id, i])));
    saveIndex(idx, tmp);
    // Re-read from disk: the tip entry SURVIVED (the prior object-shape write dropped it).
    const reloaded = loadIndex(tmp);
    assert.equal(reloaded.entries.length, 2);
    assert.ok(reloaded.entries.some((x) => x.id === "tip:MILL-TIP-FACE-01"));
    assert.equal(reloaded.model, "nomic-embed-text:latest"); // metadata preserved
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

// ── SHARD-TRANSITION clobber regression (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10) ──
// loadIndex's prior `!fs.existsSync(indexPath) -> empty shell` was the fail-OPEN
// that clobbered a SHARDED brain 1:1: once the index sharded (monolith .json
// removed by the writer, leaving a .manifest.json + shard files), loadIndex
// returned EMPTY, flush() spliced onto it, and saveIndex wrote a near-empty
// index. These pin the manifest-aware guarded-IO fix; they FAIL pre-fix.
function mkShardDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cited-tips-shard-"));
}
function shardedIndexAt(dir, n) {
  const p = path.join(dir, "tribal-embed-index.json");
  // Entries must be large enough that n of them exceed shardThresholdBytes, or
  // writeTribalIndex takes the monolith path and no shard layout forms. ~100 B
  // each (id + source + domain + text + hash + an 8-float embedding) x 40 ~ 4 KB
  // > the 2000 B threshold -> a real sharded layout (manifest + shards, monolith
  // removed). dim:8 matches the embedding length so loadIndex's shape stays valid.
  writeTribalIndex(
    {
      schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: 8,
      entries: Array.from({ length: n }, (_, i) => ({
        id: "wiki:e" + i, source: "wiki", domain: "general",
        text: "padding text to push each entry past the shard threshold",
        hash: "h" + i, embedding: [0, 0, 0, 0, 0, 0, 0, 0],
      })),
    },
    p, { shardThresholdBytes: 2000 },
  );
  return p;
}

test("loadIndex reads a SHARDED index (no monolith .json) NON-EMPTY [clobber regression]", () => {
  const dir = mkShardDir();
  try {
    const p = shardedIndexAt(dir, 40);
    assert.ok(!fs.existsSync(p), "precondition: a sharded layout has NO monolith .json");
    assert.ok(fs.existsSync(p.replace(/\.json$/, "") + ".manifest.json"), "precondition: manifest present");
    const idx = loadIndex(p);
    assert.equal(idx.entries.length, 40, "loadIndex MUST read the shards, not an empty base (the clobber)");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("saveIndex round-trips a new tip through a SHARDED layout: nothing dropped [clobber regression]", () => {
  const dir = mkShardDir();
  try {
    const p = shardedIndexAt(dir, 40);
    const idx = loadIndex(p);
    const e = buildTipEntry(SAMPLE_TIP, "p.ts", "mill", new Array(768).fill(0.3));
    spliceTipEntries(idx, [e], new Map(idx.entries.map((x, i) => [x.id, i])));
    saveIndex(idx, p);
    const reloaded = loadIndex(p);
    assert.equal(reloaded.entries.length, 41, "40 shard entries + 1 new tip -- none dropped (no clobber)");
    assert.ok(reloaded.entries.some((x) => x.id === "tip:MILL-TIP-FACE-01"), "the new tip survived the sharded write");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
