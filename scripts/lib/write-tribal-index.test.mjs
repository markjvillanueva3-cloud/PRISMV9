#!/usr/bin/env node
/**
 * write-tribal-index.test.mjs -- hermetic suite for the shard-aware tribal
 * index writer + its reader integration. Run: `node --test write-tribal-index.test.mjs`
 *
 * The V8 512 MiB cap cannot be reproduced with a real fixture (too large/slow),
 * so sharding is forced by a tiny `shardThresholdBytes` override -- the same
 * partition/stream/manifest code path that runs at 480 MiB in production.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  writeTribalIndex,
  partitionEntriesByBytes,
  manifestPathFor,
  shardPathFor,
  DEFAULT_SHARD_THRESHOLD,
} from "./write-tribal-index.mjs";
import { loadTribalIndex, loadShardedIndex } from "./load-tribal-index.mjs";

const V8_CAP = 0x1fffffe8; // 536,870,888 -- the limit the writer must stay under
const SHARD_WRAP_BYTES = 13; // {"entries":[]} -- per-shard base, mirrors the lib

function tmpIndex() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tribal-shard-test-"));
  return path.join(dir, "tribal-embed-index.json");
}

// A representative index head (matches the live schema).
const HEAD = {
  schemaVersion: "1.0.0",
  model: "nomic-embed-text:latest",
  dim: 768,
  generatedAt: "2026-06-09T00:00:00.000Z",
  wikiEmbeddedAt: "2026-06-08T00:00:00.000Z",
  wikiEmbeddedCount: 4162,
};

// Build n entries each ~`pad` bytes. Adversarial text exercises the streaming
// per-entry JSON.stringify (braces/quotes/brackets/backslash/newline/tab in a
// string value must never confuse shard boundaries or the reader).
function makeEntries(n, pad = 0) {
  const adv = 'has }brace "quote [bracket \\back\nnewline \ttab end';
  return Array.from({ length: n }, (_, i) => ({
    key: `tip-${i}`,
    path: `C:\\\\win\\\\path\\\\f${i}.md`,
    text: `entry ${i} :: ${adv} :: ${"x".repeat(pad)}`,
    vec: [i * 0.001, (i + 1) * 0.002, (i + 2) * 0.003],
  }));
}

test("monolith path: small index writes a single file, no manifest, round-trips byte-equal", () => {
  const p = tmpIndex();
  const idx = { ...HEAD, entries: makeEntries(5) };
  const res = writeTribalIndex(idx, p);
  assert.equal(res.sharded, false);
  assert.equal(fs.existsSync(p), true);
  assert.equal(fs.existsSync(manifestPathFor(p)), false, "no manifest in monolith mode");
  // Byte-identical to the prior `JSON.stringify(idx)` write.
  assert.equal(fs.readFileSync(p, "utf8"), JSON.stringify(idx));
  const loaded = loadTribalIndex(p);
  assert.deepEqual(loaded, idx);
});

test("sharded path: low threshold forces multiple shards + manifest, merge is lossless + ordered", () => {
  const p = tmpIndex();
  const entries = makeEntries(40, 200); // ~each >200B; tiny budget -> many shards
  const idx = { ...HEAD, entries };
  const res = writeTribalIndex(idx, p, { shardThresholdBytes: 600 });
  assert.equal(res.sharded, true);
  assert.ok(res.shardCount > 1, `expected >1 shard, got ${res.shardCount}`);
  assert.equal(res.totalEntries, 40);
  assert.equal(fs.existsSync(manifestPathFor(p)), true);
  // shard files exist and are named as advertised
  assert.equal(fs.existsSync(shardPathFor(p, 0)), true);
  // reader merges identically (order + content + head all preserved)
  const loaded = loadTribalIndex(p);
  assert.deepEqual(loaded.entries, entries, "merged entries must equal input exactly");
  assert.equal(loaded.schemaVersion, HEAD.schemaVersion);
  assert.equal(loaded.model, HEAD.model);
  assert.equal(loaded.dim, HEAD.dim);
  assert.equal(loaded.wikiEmbeddedCount, HEAD.wikiEmbeddedCount);
  assert.equal(loaded.sharded, undefined, "sharded flag must not leak into the head");
});

test("adversarial: entries with brace/quote/bracket/backslash/newline/tab round-trip exactly through shards", () => {
  const p = tmpIndex();
  const entries = makeEntries(12, 100);
  const idx = { ...HEAD, entries };
  writeTribalIndex(idx, p, { shardThresholdBytes: 400 });
  const loaded = loadTribalIndex(p);
  // every original entry recovered exactly (the adversarial chars are inside text)
  assert.deepEqual(loaded.entries, entries);
  assert.ok(loaded.entries[3].text.includes('}brace "quote [bracket'));
});

test("no-data-loss invariant: every entry in == entry out across many shards", () => {
  const p = tmpIndex();
  const entries = makeEntries(101, 50);
  writeTribalIndex({ ...HEAD, entries }, p, { shardThresholdBytes: 300 });
  const loaded = loadTribalIndex(p);
  assert.equal(loaded.entries.length, 101);
  const keysIn = entries.map((e) => e.key).sort();
  const keysOut = loaded.entries.map((e) => e.key).sort();
  assert.deepEqual(keysOut, keysIn);
});

test("monolith -> shard transition at same path: manifest appears, reader switches to shards", () => {
  const p = tmpIndex();
  writeTribalIndex({ ...HEAD, entries: makeEntries(3) }, p); // monolith first
  assert.equal(fs.existsSync(manifestPathFor(p)), false);
  const big = makeEntries(30, 200);
  const res = writeTribalIndex({ ...HEAD, entries: big }, p, { shardThresholdBytes: 600 });
  assert.equal(res.sharded, true);
  assert.equal(fs.existsSync(manifestPathFor(p)), true);
  const loaded = loadTribalIndex(p); // manifest present -> reads shards, not the stale monolith
  assert.equal(loaded.entries.length, 30);
  assert.deepEqual(loaded.entries, big);
});

test("shard -> monolith transition: manifest + shards removed, reader returns the monolith", () => {
  const p = tmpIndex();
  const big = makeEntries(30, 200);
  writeTribalIndex({ ...HEAD, entries: big }, p, { shardThresholdBytes: 600 });
  const shard0 = shardPathFor(p, 0);
  assert.equal(fs.existsSync(shard0), true);
  // now write small -> back to monolith; the sharded layout must be retired
  const small = makeEntries(4);
  const res = writeTribalIndex({ ...HEAD, entries: small }, p);
  assert.equal(res.sharded, false);
  assert.equal(fs.existsSync(manifestPathFor(p)), false, "manifest must be removed");
  assert.equal(fs.existsSync(shard0), false, "stale shard must be removed");
  const loaded = loadTribalIndex(p);
  assert.deepEqual(loaded.entries, small);
});

test("cleanup: monolith -> shard transition removes the now-stale monolith file", () => {
  const p = tmpIndex();
  writeTribalIndex({ ...HEAD, entries: makeEntries(3) }, p); // monolith
  assert.equal(fs.existsSync(p), true);
  writeTribalIndex({ ...HEAD, entries: makeEntries(30, 200) }, p, { shardThresholdBytes: 600 }); // -> shards
  assert.equal(fs.existsSync(manifestPathFor(p)), true);
  assert.equal(fs.existsSync(p), false, "stale monolith must be retired once sharded");
  // and the read still returns the full sharded set
  assert.equal(loadTribalIndex(p).entries.length, 30);
});

test("cleanup: sharded -> fewer-shards rewrite removes orphaned higher-index shard files", () => {
  const p = tmpIndex();
  // first write: many shards (tiny budget)
  const r1 = writeTribalIndex({ ...HEAD, entries: makeEntries(40, 200) }, p, { shardThresholdBytes: 400 });
  assert.ok(r1.shardCount >= 4, `setup needs several shards, got ${r1.shardCount}`);
  const dir = path.dirname(p);
  const shardCountBefore = fs.readdirSync(dir).filter((n) => /\.shard-\d+\.json$/.test(n)).length;
  // second write: fewer shards (larger budget) -> orphans must be pruned
  const r2 = writeTribalIndex({ ...HEAD, entries: makeEntries(40, 200) }, p, { shardThresholdBytes: 4000 });
  assert.ok(r2.shardCount < r1.shardCount, `expected fewer shards, ${r2.shardCount} vs ${r1.shardCount}`);
  const shardFilesAfter = fs.readdirSync(dir).filter((n) => /\.shard-\d+\.json$/.test(n));
  assert.equal(shardFilesAfter.length, r2.shardCount, "no orphaned shard files left on disk");
  assert.ok(shardFilesAfter.length < shardCountBefore, "orphans actually removed");
  // read integrity preserved across the shrink
  assert.equal(loadTribalIndex(p).entries.length, 40);
});

test("fail-loud (R12): a manifest claiming more entries than the shards hold throws (no partial brain)", () => {
  const p = tmpIndex();
  writeTribalIndex({ ...HEAD, entries: makeEntries(20, 200) }, p, { shardThresholdBytes: 500 });
  const mp = manifestPathFor(p);
  const manifest = JSON.parse(fs.readFileSync(mp, "utf8"));
  manifest.totalEntries = 9999; // corrupt the count
  fs.writeFileSync(mp, JSON.stringify(manifest));
  assert.throws(() => loadTribalIndex(p), /shard set incomplete|partial brain/i);
});

test("fail-loud (R12): a torn shard (count mismatch) throws rather than returning fewer entries", () => {
  const p = tmpIndex();
  writeTribalIndex({ ...HEAD, entries: makeEntries(20, 200) }, p, { shardThresholdBytes: 500 });
  const mp = manifestPathFor(p);
  const manifest = JSON.parse(fs.readFileSync(mp, "utf8"));
  // truncate the first shard's entries on disk but leave its manifest count
  const dir = path.dirname(p);
  const sp = path.join(dir, manifest.shards[0].file);
  const obj = JSON.parse(fs.readFileSync(sp, "utf8"));
  obj.entries = obj.entries.slice(0, Math.max(0, obj.entries.length - 1));
  fs.writeFileSync(sp, JSON.stringify(obj));
  assert.throws(() => loadTribalIndex(p), /torn|corrupt|partial brain/i);
});

test("partitionEntriesByBytes: every entry placed exactly once; each shard under budget (except a lone oversize entry)", () => {
  const entries = makeEntries(50, 80);
  const budget = 500;
  const groups = partitionEntriesByBytes(entries, budget);
  const flat = groups.flat();
  assert.equal(flat.length, 50, "no entry dropped or duplicated");
  assert.deepEqual(flat.map((e) => e.key), entries.map((e) => e.key), "order preserved");
  for (const g of groups) {
    const bytes = SHARD_WRAP_BYTES + g.reduce((s, e) => s + Buffer.byteLength(JSON.stringify(e), "utf8") + 1, 0);
    // a shard may exceed budget only if it is a single oversize entry
    assert.ok(bytes <= budget || g.length === 1, `shard ${bytes}B > budget ${budget} with ${g.length} entries`);
  }
});

test("empty index round-trips (monolith) and head-only fields survive", () => {
  const p = tmpIndex();
  const idx = { ...HEAD, entries: [] };
  const res = writeTribalIndex(idx, p);
  assert.equal(res.sharded, false);
  assert.deepEqual(loadTribalIndex(p), idx);
});

test("loadShardedIndex directly returns the merged head+entries", () => {
  const p = tmpIndex();
  const entries = makeEntries(15, 200);
  writeTribalIndex({ ...HEAD, entries }, p, { shardThresholdBytes: 600 });
  const merged = loadShardedIndex(manifestPathFor(p), p);
  assert.equal(merged.entries.length, 15);
  assert.equal(merged.model, HEAD.model);
});

test("helpers: manifest + shard path derivation; default threshold under the V8 cap", () => {
  const p = "/x/y/tribal-embed-index.json";
  assert.equal(manifestPathFor(p), "/x/y/tribal-embed-index.manifest.json");
  assert.equal(shardPathFor(p, 7), "/x/y/tribal-embed-index.shard-007.json");
  assert.equal(shardPathFor(p, 123), "/x/y/tribal-embed-index.shard-123.json");
  assert.ok(DEFAULT_SHARD_THRESHOLD < V8_CAP, "threshold must be under the V8 cap");
});
