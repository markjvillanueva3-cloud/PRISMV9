#!/usr/bin/env node
/**
 * Hermetic suite for tribal-embed-index.mjs's clobber-prevention I/O — the
 * fail-loud readIndex + the writeIndex shrink-guard. These guard against the
 * exact failure that destroyed the 537MB/33,639-entry tribal brain on
 * 2026-06-08: a fail-OPEN read (return empty on parse error) + a downstream
 * write that clobbered the real index with a near-empty stub.
 *
 * No Ollama — tests only the I/O guards against a tmp index. The env var is set
 * BEFORE the dynamic import so the module's INDEX_PATH captures the tmp path,
 * and the CLI main-guard keeps the import side-effect-free.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), "tei-"));
const IDX = path.join(TMPDIR, "tribal-embed-index.json");
process.env.PRISM_TRIBAL_INDEX_PATH = IDX;

const { readIndex, writeIndex, mergeStagedEntries } = await import("./tribal-embed-index.mjs");
const { writeTribalIndex } = await import("../../scripts/lib/write-tribal-index.mjs");

after(() => { try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best-effort */ } });

function writeRaw(obj) {
  fs.writeFileSync(IDX, typeof obj === "string" ? obj : JSON.stringify(obj));
}
function idxOf(entries) {
  return { schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: 768, generatedAt: "x", entries };
}
function mkEntries(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "e" + i, source: "x", domain: "general", text: "t", hash: "h", embedding: [0] }));
}

// ── readIndex ─────────────────────────────────────────────────────────────
test("readIndex returns empty ONLY for a genuinely-absent index (true bootstrap base)", () => {
  fs.rmSync(IDX, { force: true });
  const r = readIndex();
  assert.equal(r.entries.length, 0);
  assert.equal(r.generatedAt, null);
});

test("readIndex FAILS LOUD when the file EXISTS but cannot be loaded (no fail-open clobber)", () => {
  // The exact regression: a parse error must NOT return a fresh empty index,
  // because the caller would splice + write it and CLOBBER the real index.
  writeRaw("{ this is not valid json ");
  assert.throws(() => readIndex(), /failed to load|Refusing to start fresh/);
});

test("readIndex loads a valid existing index intact", () => {
  writeRaw(idxOf(mkEntries(5)));
  assert.equal(readIndex().entries.length, 5);
});

// ── writeIndex shrink-guard ────────────────────────────────────────────────
test("writeIndex CLOBBER-GUARD refuses a >50% shrink over a populated index", () => {
  writeRaw(idxOf(mkEntries(200)));
  assert.throws(() => writeIndex(idxOf(mkEntries(1))), /refusing to write|>50% loss/);
  // the on-disk index must be UNTOUCHED (still 200) — the throw happened pre-write
  assert.equal(JSON.parse(fs.readFileSync(IDX, "utf8")).entries.length, 200);
});

test("writeIndex allows growth and small mutations", () => {
  writeRaw(idxOf(mkEntries(200)));
  writeIndex(idxOf(mkEntries(205)));        // grow
  assert.equal(JSON.parse(fs.readFileSync(IDX, "utf8")).entries.length, 205);
  writeIndex(idxOf(mkEntries(180)));        // small shrink (>50% retained) — allowed
  assert.equal(JSON.parse(fs.readFileSync(IDX, "utf8")).entries.length, 180);
});

test("writeIndex shrink-guard is bypassable via PRISM_TRIBAL_ALLOW_SHRINK (intentional prune)", () => {
  writeRaw(idxOf(mkEntries(200)));
  process.env.PRISM_TRIBAL_ALLOW_SHRINK = "1";
  try { writeIndex(idxOf(mkEntries(1))); }
  finally { delete process.env.PRISM_TRIBAL_ALLOW_SHRINK; }
  assert.equal(JSON.parse(fs.readFileSync(IDX, "utf8")).entries.length, 1);
});

test("writeIndex does not guard a small base (<=100 entries can shrink freely)", () => {
  writeRaw(idxOf(mkEntries(50)));
  writeIndex(idxOf(mkEntries(1))); // 50 ≤ 100 → guard inactive
  assert.equal(JSON.parse(fs.readFileSync(IDX, "utf8")).entries.length, 1);
});

// ── mergeStagedEntries (U-TRIBAL-EMBED-LOCK concurrent-safe overlay) ─────────
// The lock-coordinated checkpoint re-reads the index INSIDE the lock and overlays
// only THIS batch's embeds (`staged`) -- so a concurrent writer's adds/updates
// (present on the fresh re-read, absent from staged) are never lost-updated.
const ent = (id, v) => ({ id, source: "x", domain: "general", text: "t", hash: id + ":" + v, embedding: [0] });
const byId = (arr) => Object.fromEntries(arr.map((e) => [e.id, e.hash]));

test("mergeStagedEntries: staged WINS for shared ids (our fresh embed overlays the on-disk one)", () => {
  const fresh = [ent("a", "old"), ent("b", "old")];
  const staged = new Map([["a", ent("a", "new")]]);
  const out = mergeStagedEntries(fresh, staged);
  assert.equal(byId(out).a, "a:new", "our staged re-embed must win");
  assert.equal(byId(out).b, "b:old", "untouched on-disk entry preserved");
  assert.equal(out.length, 2);
});

test("mergeStagedEntries: a peer add (on disk, NOT in staged) is PRESERVED -- no lost-update", () => {
  // Simulates: we read base {a}, embed our work, but a peer --add wrote {a,peer}
  // during our embed. The locked re-read sees {a,peer}; staged has only {a}. The
  // peer entry must survive (the lost-update the lock+merge exists to prevent).
  const fresh = [ent("a", "v"), ent("peer", "v")];
  const staged = new Map([["a", ent("a", "mine")]]);
  const out = mergeStagedEntries(fresh, staged);
  assert.ok(out.find((e) => e.id === "peer"), "concurrent peer add must NOT be dropped");
  assert.equal(byId(out).a, "a:mine");
  assert.equal(out.length, 2);
});

test("mergeStagedEntries: staged-only ids (brand-new embeds) are appended", () => {
  const out = mergeStagedEntries([ent("a", "v")], new Map([["b", ent("b", "v")], ["c", ent("c", "v")]]));
  assert.deepEqual(out.map((e) => e.id).sort(), ["a", "b", "c"]);
});

test("mergeStagedEntries: empty staged returns the fresh entries unchanged", () => {
  const fresh = [ent("a", "v"), ent("b", "v")];
  assert.deepEqual(mergeStagedEntries(fresh, new Map()), fresh);
});

test("mergeStagedEntries: empty/missing fresh tolerated (null-id entries skipped)", () => {
  assert.deepEqual(mergeStagedEntries(null, new Map([["a", ent("a", "v")]])).map((e) => e.id), ["a"]);
  // a malformed on-disk entry with no id must not crash the merge
  const out = mergeStagedEntries([{ nope: 1 }, ent("a", "v")], new Map([["a", ent("a", "new")]]));
  assert.equal(byId(out).a, "a:new");
});

// ── SHARD-TRANSITION clobber regression (U-TRIBAL-EMBED-SHARD-READ-FIX 2026-06-10) ──
// The live incident: when the index first crossed ~480MiB it SHARDED (the writer
// removes the monolith .json, leaving a sibling .manifest.json + shard files).
// readIndex's monolith-only existsSync then returned an EMPTY base -> the next
// merge wrote staged-only and writeIndex's removeShardLayout DELETED the shards =
// the 29,723-entry brain destroyed. These pin the manifest-aware fix.
test("readIndex reads a SHARDED index (no monolith .json) -- NOT an empty base [clobber regression]", () => {
  fs.rmSync(IDX, { force: true });
  // Tiny threshold forces a sharded layout: writes <IDX>.manifest.json + shards
  // and REMOVES the monolith IDX (exactly the on-disk shape after a real shard).
  writeTribalIndex(idxOf(mkEntries(40)), IDX, { shardThresholdBytes: 2000 });
  assert.ok(!fs.existsSync(IDX), "precondition: a sharded layout has NO monolith .json");
  assert.ok(fs.existsSync(IDX.replace(/\.json$/, "") + ".manifest.json"), "precondition: manifest present");
  const r = readIndex();
  assert.equal(r.entries.length, 40, "readIndex MUST read the shards, not return an empty base (the clobber)");
});

test("writeIndex clobber-guard RUNS over a SHARDED prior index (the shrink it silently missed) [clobber regression]", () => {
  fs.rmSync(IDX, { force: true });
  writeTribalIndex(idxOf(mkEntries(150)), IDX, { shardThresholdBytes: 2000 }); // sharded, no monolith
  assert.ok(!fs.existsSync(IDX), "precondition: no monolith .json (sharded)");
  // A near-empty write over the 150-entry SHARDED index must be REFUSED. Before the
  // fix the guard's monolith-only existsSync skipped entirely on a sharded index.
  assert.throws(() => writeIndex(idxOf(mkEntries(1))), /refusing to write|>50% loss/);
});
