/**
 * Tests for vault-backlink-read.mjs — the REVERSE-edge reader.
 * node:test. Synthetic fixture (temp file) for deterministic cases + a real-data
 * smoke gated on the live index existing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIndex, clearCache, backlinksFor, backlinksWithCards } from "./vault-backlink-read.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const LIVE_INDEX = path.join(ROOT, "state", "shared", "system-viz", "vault-backlinks.json");

// ── synthetic fixture ────────────────────────────────────────────────────────
// A tiny index: one normal key, one capped key (total > nodeIds.length).
function writeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-"));
  const p = path.join(dir, "vault-backlinks.json");
  const obj = {
    schemaVersion: "1.0.0",
    nodeCap: 50,
    map: {
      "architecture/cheap-node-access-ms0": ["eng.alpha", "eng.beta", "ghost.x"],
      "feedback_psn_definition": ["eng.psn"],
      "architecture/hot-doc": ["eng.a", "eng.b"], // capped: real total is 99 (below)
    },
    truncated: { "architecture/hot-doc": 99 },
  };
  fs.writeFileSync(p, JSON.stringify(obj), "utf8");
  return p;
}

// ── loadIndex ────────────────────────────────────────────────────────────────

test("loadIndex: missing file → {index:null, error} (fail-soft, no throw)", () => {
  clearCache();
  const r = loadIndex(path.join(os.tmpdir(), "definitely-not-here-vbl.json"));
  assert.equal(r.index, null);
  assert.match(r.error, /not found/);
});

test("loadIndex: malformed (no .map) → {index:null, error}", () => {
  clearCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-bad-"));
  const p = path.join(dir, "bad.json");
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: "1.0.0" }), "utf8");
  const r = loadIndex(p);
  assert.equal(r.index, null);
  assert.match(r.error, /malformed/);
});

test("loadIndex: torn JSON → {index:null, error} not a thrown exception", () => {
  clearCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-torn-"));
  const p = path.join(dir, "torn.json");
  fs.writeFileSync(p, '{"map":{"a":["x"]', "utf8"); // truncated
  const r = loadIndex(p);
  assert.equal(r.index, null);
  assert.match(r.error, /read failed/);
});

test("loadIndex: valid fixture loads and is cached (second call same object)", () => {
  clearCache();
  const p = writeFixture();
  const a = loadIndex(p);
  const b = loadIndex(p);
  assert.ok(a.index && a.index.map);
  assert.equal(a.index, b.index, "cached — same reference on the second load");
});

// ── backlinksFor ─────────────────────────────────────────────────────────────

test("backlinksFor: exact wiki-path hit returns the node ids", () => {
  clearCache();
  const p = writeFixture();
  const r = backlinksFor("knowledge/wiki/architecture/cheap-node-access-ms0.md", { indexPath: p });
  assert.equal(r.found, true);
  assert.equal(r.key, "architecture/cheap-node-access-ms0");
  assert.deepEqual(r.nodeIds, ["eng.alpha", "eng.beta", "ghost.x"]);
  assert.equal(r.truncated, false);
  assert.equal(r.total, 3);
});

test("backlinksFor: human-friendly key (no prefix/suffix) hits the same record", () => {
  clearCache();
  const p = writeFixture();
  const r = backlinksFor("architecture/cheap-node-access-ms0", { indexPath: p });
  assert.equal(r.found, true);
  assert.deepEqual(r.nodeIds, ["eng.alpha", "eng.beta", "ghost.x"]);
});

test("backlinksFor: memory slug hit", () => {
  clearCache();
  const p = writeFixture();
  const r = backlinksFor("feedback_psn_definition", { indexPath: p });
  assert.equal(r.found, true);
  assert.deepEqual(r.nodeIds, ["eng.psn"]);
});

test("backlinksFor: capped key reports truncated + honest pre-cap total", () => {
  clearCache();
  const p = writeFixture();
  const r = backlinksFor("architecture/hot-doc", { indexPath: p });
  assert.equal(r.found, true);
  assert.equal(r.truncated, true);
  assert.equal(r.total, 99, "honest pre-cap total from the truncated map");
  assert.equal(r.nodeIds.length, 2, "but only the capped ids are carried");
});

test("backlinksFor: miss → found:false with basename suggestions", () => {
  clearCache();
  const p = writeFixture();
  // bare doc name that exists only under a dir — should be suggested
  const r = backlinksFor("cheap-node-access-ms0", { indexPath: p });
  assert.equal(r.found, false);
  assert.ok(r.suggestions.includes("architecture/cheap-node-access-ms0"));
});

test("backlinksFor: genuine miss → found:false, empty suggestions", () => {
  clearCache();
  const p = writeFixture();
  const r = backlinksFor("architecture/does-not-exist-anywhere", { indexPath: p });
  assert.equal(r.found, false);
  assert.deepEqual(r.suggestions, []);
});

test("backlinksFor: empty/garbage query → found:false, no crash", () => {
  clearCache();
  const p = writeFixture();
  assert.equal(backlinksFor("", { indexPath: p }).found, false);
  assert.equal(backlinksFor(null, { indexPath: p }).found, false);
  assert.deepEqual(backlinksFor("   ", { indexPath: p }).suggestions, []);
});

test("backlinksFor: index unavailable → unavailable:true, never throws", () => {
  clearCache();
  const r = backlinksFor("architecture/foo", { indexPath: path.join(os.tmpdir(), "nope-vbl.json") });
  assert.equal(r.found, false);
  assert.equal(r.unavailable, true);
  assert.match(r.error, /not found/);
});

test("backlinksFor: suggestLimit caps the suggestion list", () => {
  clearCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-many-"));
  const p = path.join(dir, "vault-backlinks.json");
  const map = {};
  for (let i = 0; i < 20; i++) map[`dir${i}/samebase`] = ["eng.x"];
  fs.writeFileSync(p, JSON.stringify({ map }), "utf8");
  const r = backlinksFor("samebase", { indexPath: p, suggestLimit: 5 });
  assert.equal(r.found, false);
  assert.equal(r.suggestions.length, 5, "capped at suggestLimit");
});

// ── backlinksWithCards ───────────────────────────────────────────────────────

test("backlinksWithCards: miss → cards is empty array", async () => {
  clearCache();
  const p = writeFixture();
  const r = await backlinksWithCards("architecture/does-not-exist", { indexPath: p });
  assert.equal(r.found, false);
  assert.deepEqual(r.cards, []);
});

// ── staleness (drift from the forward edge it inverts) ───────────────────────

test("loadIndex: index stamped AFTER its source mtime → NOT stale (real comparison branch)", () => {
  clearCache();
  // Real ROOT-relative source so computeStaleness resolves it (path.join(ROOT,rel)).
  const relSrc = "state/shared/system-viz/__vbl_fresh_test_src.jsonl";
  const absSrc = path.join(ROOT, relSrc);
  fs.writeFileSync(absSrc, '{"id":"eng.a"}\n', "utf8");
  try {
    const srcMs = Math.round(fs.statSync(absSrc).mtimeMs);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-fresh-"));
    const p = path.join(dir, "vault-backlinks.json");
    fs.writeFileSync(p, JSON.stringify({ map: { "a": ["eng.a"] }, builtFrom: relSrc, builtFromMtimeMs: srcMs + 60000 }), "utf8");
    const r = loadIndex(p);
    assert.equal(r.stale, false, "index stamped AFTER source mtime is fresh");
    assert.equal(r.staleReason, null);
  } finally {
    fs.rmSync(absSrc, { force: true });
  }
});

test("loadIndex: no builtFromMtimeMs stamp → not stale (don't cry wolf)", () => {
  clearCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-nostamp-"));
  const p = path.join(dir, "vault-backlinks.json");
  fs.writeFileSync(p, JSON.stringify({ map: { "a": ["eng.a"] } }), "utf8");
  const r = loadIndex(p);
  assert.equal(r.stale, false);
  assert.equal(r.staleReason, null);
});

test("loadIndex: source newer than the index stamp → STALE with reason", () => {
  clearCache();
  // Build a real source file under ROOT-relative path so computeStaleness resolves it.
  const relSrc = "state/shared/system-viz/__vbl_stale_test_src.jsonl";
  const absSrc = path.join(ROOT, relSrc);
  fs.writeFileSync(absSrc, '{"id":"eng.a"}\n', "utf8");
  try {
    const srcMs = Math.round(fs.statSync(absSrc).mtimeMs);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vbl-stale-"));
    const p = path.join(dir, "vault-backlinks.json");
    fs.writeFileSync(p, JSON.stringify({ map: { "a": ["eng.a"] }, builtFrom: relSrc, builtFromMtimeMs: srcMs - 600000 }), "utf8"); // stamped 10min BEFORE source
    const r = loadIndex(p);
    assert.equal(r.stale, true, "source newer than stamp ⇒ stale");
    assert.match(r.staleReason, /newer than this index/);
    // and the flag propagates into a backlinksFor result
    const b = backlinksFor("a", { indexPath: p });
    assert.equal(b.found, true);
    assert.equal(b.stale, true);
  } finally {
    fs.rmSync(absSrc, { force: true });
  }
});

// ── real-data smoke (gated on the live index existing) ────────────────────────

test("real-data smoke: live index resolves a known doc to non-empty node ids", { skip: !fs.existsSync(LIVE_INDEX) }, () => {
  clearCache();
  const { index } = loadIndex(LIVE_INDEX);
  assert.ok(index, "live index loads");
  assert.ok(index.keyCount > 1000, `live index has many keys (got ${index.keyCount})`);
  // pick the first real key from the live map and confirm it round-trips
  const firstKey = Object.keys(index.map)[0];
  const r = backlinksFor(firstKey, { indexPath: LIVE_INDEX });
  assert.equal(r.found, true, `live key '${firstKey}' resolves`);
  assert.ok(r.nodeIds.length > 0, "resolves to ≥1 node id");
  assert.ok(r.nodeIds.every((id) => typeof id === "string" && id.length > 0), "all ids are non-empty strings");
});
