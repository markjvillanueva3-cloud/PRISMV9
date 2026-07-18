#!/usr/bin/env node
/**
 * embed-engines-into-tribal-index.test.mjs — node:test suite for the pure
 * helpers of the engine-wiki embedder.
 *
 * Pure-helper coverage only (scanEngineWiki, makeWikiId, buildEngineEntry).
 * The CLI main() does real Ollama I/O and a real fs scan of the engines
 * tree — those are exercised by the empirical retrain run, not unit tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { fileURLToPath } from "node:url";

import {
  scanEngineWiki,
  makeWikiId,
  buildEngineEntry,
  foldEngineResults,
} from "./embed-engines-into-tribal-index.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "embed-engines-"));
}

test("scanEngineWiki — recursive, .md only, skips underscore + hidden", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "cam"));
  fs.mkdirSync(path.join(root, "ai"));
  fs.writeFileSync(path.join(root, "cam", "fooengine.md"), "# foo");
  fs.writeFileSync(path.join(root, "cam", "barengine.md"), "# bar");
  fs.writeFileSync(path.join(root, "cam", "_INDEX.md"), "skip me");
  fs.writeFileSync(path.join(root, "cam", ".dotfile.md"), "skip me");
  fs.writeFileSync(path.join(root, "cam", "notes.txt"), "wrong ext");
  fs.writeFileSync(path.join(root, "ai", "bazengine.md"), "# baz");

  const found = scanEngineWiki(root);
  found.sort();
  assert.equal(found.length, 3);
  assert.match(found[0], /ai\/bazengine\.md$/);
  assert.match(found[1], /cam\/barengine\.md$/);
  assert.match(found[2], /cam\/fooengine\.md$/);

  fs.rmSync(root, { recursive: true, force: true });
});

test("scanEngineWiki — bounded depth, doesn't blow up on missing root", () => {
  const found = scanEngineWiki("/nonexistent-root-xyz");
  assert.deepEqual(found, []);
});

test("scanEngineWiki — depth ceiling truncates a deep recursive tree", () => {
  const root = tmpRoot();
  // Build a 6-deep tree: each level has 1 dir + 1 .md
  let cur = root;
  for (let i = 0; i < 6; i++) {
    fs.writeFileSync(path.join(cur, `level${i}.md`), `# level ${i}`);
    cur = path.join(cur, `level${i}`);
    fs.mkdirSync(cur);
  }
  fs.writeFileSync(path.join(cur, "deepest.md"), "# deepest");

  const found = scanEngineWiki(root);
  // MAX_RECURSION = 4 → levels 0,1,2,3,4 admitted; deeper truncated
  assert.ok(found.length <= 5, `expected ≤5 files (got ${found.length}: ${found.join(", ")})`);
  assert.ok(found.length >= 4, "depth ceiling must not be over-aggressive");

  fs.rmSync(root, { recursive: true, force: true });
});

test("makeWikiId — converts absolute paths to wiki:<rel-path> with POSIX separators", () => {
  // Use fileURLToPath so Windows drive letters are correctly resolved (a leading
  // slash from URL.pathname trips path.relative and produces ../H:/... ids).
  const here = path.dirname(fileURLToPath(import.meta.url));
  const PRISM_ROOT = path.resolve(here, "..");
  const abs = path.join(PRISM_ROOT, "knowledge", "wiki", "architecture", "engines", "cam", "foo.md").replace(/\\/g, "/");
  const id = makeWikiId(abs);
  assert.match(id, /^wiki:knowledge\/wiki\/architecture\/engines\/cam\/foo\.md$/);
});

test("buildEngineEntry — produces the canonical tribal-embed-index shape", () => {
  const root = tmpRoot();
  const filePath = path.join(root, "fooengine.md");
  const raw = "---\ntype: engine\n---\n# FooEngine\n\nDoes foo things.\n";
  fs.writeFileSync(filePath, raw);
  const fakeEmbedding = new Array(768).fill(0.1);
  const entry = buildEngineEntry(filePath, raw, fakeEmbedding);

  assert.equal(typeof entry.id, "string");
  assert.match(entry.id, /^wiki:/, "id MUST be the wiki:<rel-path> shape for bridge Path-1 + Path-2 compatibility");
  assert.equal(entry.source, "wiki");
  assert.equal(entry.domain, "engine-reference");
  assert.equal(entry.title, "fooengine");
  assert.equal(typeof entry.path, "string");
  assert.equal(entry.path.indexOf("\\"), -1, "path must be POSIX-separated");
  assert.equal(typeof entry.text, "string");
  assert.ok(entry.text.length > 0);
  assert.ok(entry.text.length <= 400);
  assert.equal(typeof entry.hash, "string");
  assert.equal(entry.hash.length, 16);
  assert.deepEqual(entry.embedding, fakeEmbedding);

  fs.rmSync(root, { recursive: true, force: true });
});

test("buildEngineEntry — text is frontmatter-stripped + whitespace-flattened", () => {
  const root = tmpRoot();
  const filePath = path.join(root, "barengine.md");
  const raw = "---\ntype: engine\nname: bar\n---\n\n# BarEngine\n\nLine 1.\n\n\nLine 2.\n";
  fs.writeFileSync(filePath, raw);
  const entry = buildEngineEntry(filePath, raw, new Array(768).fill(0));

  assert.equal(entry.text.indexOf("type: engine"), -1, "frontmatter must be stripped");
  assert.equal(entry.text.indexOf("---"), -1, "frontmatter delimiter must be stripped");
  assert.equal(entry.text.indexOf("\n\n"), -1, "double newlines must be flattened");

  fs.rmSync(root, { recursive: true, force: true });
});

// ── BLACKWELL-DB-GEN-MS0 foldEngineResults — the chunked-pool circuit breaker ──
// (slot:juliett). These pin the breaker semantics the GPU-pool rewrite depends on:
// in-order fold, INFRA-only breaker, stub never trips, success accumulation.

const ok = (id) => ({ ok: true, entry: { id } });
const infra = (path, reason = "ECONNREFUSED") => ({ ok: false, path, reason, kind: "infra" });
const stub = (path) => ({ ok: false, path, reason: "stub-or-empty", kind: "stub" });

test("foldEngineResults — all-success: every entry folded, no abort", () => {
  const added = [], failed = [];
  const aborted = foldEngineResults([ok("a"), ok("b"), ok("c")], added, failed);
  assert.equal(aborted, false);
  assert.deepEqual(added.map((e) => e.id), ["a", "b", "c"]);
  assert.equal(failed.length, 0);
});

test("foldEngineResults — 3 consecutive identical INFRA failures trip the breaker", () => {
  const added = [], failed = [];
  const aborted = foldEngineResults([infra("f1"), infra("f2"), infra("f3"), ok("never")], added, failed);
  assert.equal(aborted, true);
  assert.equal(added.length, 0, "the success AFTER the trip index must NOT be folded");
  assert.equal(failed.length, 3);
});

test("foldEngineResults — DIFFERENT infra reasons do NOT trip (only identical-3)", () => {
  const added = [], failed = [];
  const aborted = foldEngineResults([infra("f1", "A"), infra("f2", "B"), infra("f3", "C")], added, failed);
  assert.equal(aborted, false);
  assert.equal(failed.length, 3);
});

test("foldEngineResults — stub failures NEVER trip the breaker (break the identical chain)", () => {
  const added = [], failed = [];
  // 2 infra + a stub + an infra: at the last infra, slice(-3) = [infra(f2), stub, infra(f3)]
  // → reasons differ (the stub's "stub-or-empty" breaks the chain) → no trip.
  const aborted = foldEngineResults([infra("f1"), infra("f2"), stub("s1"), infra("f3"), ok("x")], added, failed);
  assert.equal(aborted, false);
  assert.deepEqual(added.map((e) => e.id), ["x"]);
  assert.equal(failed.length, 4); // 3 infra + 1 stub all recorded; none tripped the breaker
});

test("foldEngineResults — accumulates across calls (mirrors per-chunk folding)", () => {
  const added = [], failed = [];
  foldEngineResults([ok("a"), infra("f1")], added, failed); // chunk 1
  const aborted = foldEngineResults([infra("f2"), infra("f3")], added, failed); // chunk 2 → 3rd identical infra
  assert.equal(aborted, true, "breaker uses the GLOBAL failed[] so it trips across chunk boundaries");
  assert.deepEqual(added.map((e) => e.id), ["a"]);
  assert.equal(failed.length, 3);
});

test("foldEngineResults — a lone stub run never aborts and folds no successes", () => {
  const added = [], failed = [];
  const aborted = foldEngineResults([stub("s1"), stub("s2"), stub("s3"), stub("s4")], added, failed);
  assert.equal(aborted, false);
  assert.equal(added.length, 0);
  assert.equal(failed.length, 4);
});
