#!/usr/bin/env node
/**
 * Hermetic suite for tribal-index-guarded-io.mjs -- the shared shard-safe,
 * clobber-guarded read/write pair all tribal-index embedders route through
 * (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10). Because the 3 sibling
 * embedders (engines / knowledge-store / cited-tips) now delegate their index
 * I/O here, THIS suite is the proof of their shard-safety: the forced-shard
 * read regression below is the exact failure that destroyed the brain
 * (29,723 -> ~11,500) on 2026-06-10 -- it FAILS against a monolith-only reader.
 *
 * No Ollama, no network -- pure tmp-dir I/O.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  manifestPathFor,
  readTribalIndexGuarded,
  writeTribalIndexGuarded,
} from "./tribal-index-guarded-io.mjs";
import { writeTribalIndex } from "./write-tribal-index.mjs";

const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), "tigio-"));
after(() => { try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { /* best-effort */ } });

let seq = 0;
function freshIdxPath() {
  return path.join(TMPDIR, `idx-${seq++}.json`);
}
function idxOf(entries) {
  return { schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: 768, generatedAt: "x", entries };
}
function mkEntries(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "e" + i, source: "x", domain: "general", text: "t", hash: "h", embedding: [0] }));
}

// ── manifestPathFor ─────────────────────────────────────────────────────────
test("manifestPathFor maps .json -> .manifest.json", () => {
  assert.equal(manifestPathFor("/a/b/tribal-embed-index.json"), "/a/b/tribal-embed-index.manifest.json");
  assert.equal(manifestPathFor("C:/x/tribal-embed-index.JSON"), "C:/x/tribal-embed-index.manifest.json");
});

// ── readTribalIndexGuarded ──────────────────────────────────────────────────
test("read: genuinely-absent index returns an empty bootstrap base", () => {
  const p = freshIdxPath();
  const r = readTribalIndexGuarded(p);
  assert.equal(r.entries.length, 0);
  assert.equal(r.generatedAt, null);
  assert.equal(r.model, "nomic-embed-text:latest");
});

test("read: emptyHead override is applied on a genuine first run", () => {
  const p = freshIdxPath();
  const r = readTribalIndexGuarded(p, { emptyHead: { dim: 384, model: "custom" } });
  assert.equal(r.dim, 384);
  assert.equal(r.model, "custom");
  assert.equal(r.entries.length, 0);
});

test("read: a valid monolith loads intact", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(7))));
  assert.equal(readTribalIndexGuarded(p).entries.length, 7);
});

test("read: FAILS LOUD when the index EXISTS but cannot be parsed (no fail-open clobber)", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, "{ this is not valid json ");
  assert.throws(() => readTribalIndexGuarded(p), /refusing to start fresh|failed to load/);
});

test("read: a SHARDED index (no monolith .json) reads NON-EMPTY [clobber regression]", () => {
  // The 2026-06-10 incident: writeTribalIndex with a tiny threshold writes
  // <idx>.manifest.json + shards and REMOVES the monolith .json. A monolith-only
  // reader returns an EMPTY base here -> the next write drops the brain. The
  // guarded reader is manifest-aware and MUST read the shards.
  const p = freshIdxPath();
  writeTribalIndex(idxOf(mkEntries(40)), p, { shardThresholdBytes: 2000 });
  assert.ok(!fs.existsSync(p), "precondition: a sharded layout has NO monolith .json");
  assert.ok(fs.existsSync(manifestPathFor(p)), "precondition: manifest present");
  const r = readTribalIndexGuarded(p);
  assert.equal(r.entries.length, 40, "MUST read the shards, not an empty base (the clobber)");
});

// ── writeTribalIndexGuarded ─────────────────────────────────────────────────
test("write: monolith round-trips below the shard threshold", () => {
  const p = freshIdxPath();
  const res = writeTribalIndexGuarded(idxOf(mkEntries(10)), p);
  assert.equal(res.sharded, false);
  assert.equal(readTribalIndexGuarded(p).entries.length, 10);
});

test("write: shrink clobber-guard refuses a >50% loss over a populated index", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(200))));
  assert.throws(() => writeTribalIndexGuarded(idxOf(mkEntries(1)), p), /refusing to write|>50% loss/);
  // the on-disk index must be UNTOUCHED (still 200) -- the throw happened pre-write
  assert.equal(readTribalIndexGuarded(p).entries.length, 200);
});

test("write: shrink-guard fires over a SHARDED prior too (the shrink the monolith-only guard silently missed)", () => {
  const p = freshIdxPath();
  writeTribalIndex(idxOf(mkEntries(150)), p, { shardThresholdBytes: 2000 }); // sharded, no monolith
  assert.ok(!fs.existsSync(p), "precondition: no monolith .json (sharded)");
  assert.throws(() => writeTribalIndexGuarded(idxOf(mkEntries(1)), p), /refusing to write|>50% loss/);
});

test("write: growth and small mutations are allowed", () => {
  const p = freshIdxPath();
  writeTribalIndexGuarded(idxOf(mkEntries(200)), p);
  writeTribalIndexGuarded(idxOf(mkEntries(205)), p);          // grow
  assert.equal(readTribalIndexGuarded(p).entries.length, 205);
  writeTribalIndexGuarded(idxOf(mkEntries(180)), p);          // small shrink (>50% retained)
  assert.equal(readTribalIndexGuarded(p).entries.length, 180);
});

test("write: shrink-guard bypassable via PRISM_TRIBAL_ALLOW_SHRINK", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(200))));
  process.env.PRISM_TRIBAL_ALLOW_SHRINK = "1";
  try { writeTribalIndexGuarded(idxOf(mkEntries(1)), p); }
  finally { delete process.env.PRISM_TRIBAL_ALLOW_SHRINK; }
  assert.equal(readTribalIndexGuarded(p).entries.length, 1);
});

test("write: shrink-guard bypassable via opts.allowShrink", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(200))));
  writeTribalIndexGuarded(idxOf(mkEntries(1)), p, { allowShrink: true });
  assert.equal(readTribalIndexGuarded(p).entries.length, 1);
});

test("write: a small base (<=100 entries) can shrink freely (guard inactive)", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(50))));
  writeTribalIndexGuarded(idxOf(mkEntries(1)), p); // 50 <= 100 -> guard inactive
  assert.equal(readTribalIndexGuarded(p).entries.length, 1);
});

test("write: prevCount hint avoids the re-read and the guard uses it", () => {
  const p = freshIdxPath();
  fs.writeFileSync(p, JSON.stringify(idxOf(mkEntries(200))));
  // Hint a populated prior of 200 -> a 1-entry write must still be refused even
  // though the helper does not itself re-read (caller-supplied prevCount path).
  assert.throws(() => writeTribalIndexGuarded(idxOf(mkEntries(1)), p, { prevCount: 200 }), /refusing to write|>50% loss/);
  // A growth write with the same hint is allowed.
  writeTribalIndexGuarded(idxOf(mkEntries(260)), p, { prevCount: 200 });
  assert.equal(readTribalIndexGuarded(p).entries.length, 260);
});

test("write: monolith -> shard transition retires the monolith; read still whole", () => {
  const p = freshIdxPath();
  writeTribalIndexGuarded(idxOf(mkEntries(20)), p);                          // monolith
  assert.ok(fs.existsSync(p));
  const res = writeTribalIndexGuarded(idxOf(mkEntries(120)), p, { shardThresholdBytes: 2000, prevCount: 20 });
  assert.equal(res.sharded, true, "above the tiny threshold -> sharded");
  assert.ok(!fs.existsSync(p), "monolith retired on the shard transition");
  assert.ok(fs.existsSync(manifestPathFor(p)));
  assert.equal(readTribalIndexGuarded(p).entries.length, 120, "read merges the shards");
});
