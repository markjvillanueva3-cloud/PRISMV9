#!/usr/bin/env node
/**
 * embed-all-wiki.test.mjs — hermetic tests for the U-RAG-1 batch driver.
 * Covers the pure logic added on top of embed-wiki-into-tribal-index.mjs:
 * collectMarkdown (recursive walk), inferDomain (path→domain), parseArgs,
 * atomicWriteJSON. No live Ollama, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectMarkdown, inferDomain, parseArgs, atomicWriteJSON,
  clampForEmbedding, MAX_EMBED_CHARS,
  evaluateContextualDegradation, DEGRADED_BLURB_FAILURE_THRESHOLD,
} from "./embed-all-wiki.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeTribalIndex } from "./lib/write-tribal-index.mjs";

const SCRIPT = fileURLToPath(new URL("./embed-all-wiki.mjs", import.meta.url));
function runCli(args, env = {}) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args],
      { encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}

// ── SHARD-TRANSITION manifest-aware gate regression (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10) ──
// embed-all-wiki's existence gate + planning read must accept a SHARDED index
// (monolith .json removed by the writer, leaving a .manifest.json + shards). A
// monolith-only existsSync would false-"index not found" (exit 2) on a perfectly
// good sharded brain; a monolith-only read would return an EMPTY base. --dry-run
// exercises the gate + readTribalIndexGuarded read with NO Ollama, and FAILS
// against the pre-fix monolith-only code. (Closes the achievable half of the
// reviewer A+C round-3 P2 coverage gap.)
test("main --dry-run accepts a SHARDED index (manifest-aware gate + read, no false 'index not found') [clobber regression]", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eaw-shard-"));
  try {
    const idxPath = path.join(dir, "tribal-embed-index.json");
    // Sharded layout: 40 ~100B entries over a tiny threshold -> manifest + shards,
    // monolith .json removed (exactly the real post-shard on-disk shape).
    writeTribalIndex(
      {
        schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: 8,
        entries: Array.from({ length: 40 }, (_, i) => ({
          id: "wiki:e" + i, source: "wiki", domain: "general",
          text: "padding text to push each entry past the shard threshold",
          hash: "h" + i, embedding: [0, 0, 0, 0, 0, 0, 0, 0],
        })),
      },
      idxPath, { shardThresholdBytes: 2000 },
    );
    assert.ok(!fs.existsSync(idxPath), "precondition: a sharded layout has NO monolith .json");
    assert.ok(fs.existsSync(idxPath.replace(/\.json$/, "") + ".manifest.json"), "precondition: manifest present");
    // a tiny wiki root with one fresh .md (absent from the index) so the plan is non-empty
    const wikiRoot = path.join(dir, "wiki", "concepts");
    fs.mkdirSync(wikiRoot, { recursive: true });
    fs.writeFileSync(path.join(wikiRoot, "fresh-note.md"), "# Fresh Note\n\nSome body text so the file is embeddable in plan.\n");
    const r = runCli(["--dry-run", "--json"], {
      PRISM_TRIBAL_INDEX_PATH: idxPath, PRISM_WIKI_ROOT: path.join(dir, "wiki"),
    });
    assert.equal(r.code, 0, "dry-run over a sharded index must exit 0, not the monolith-only exit-2 'index not found'");
    assert.ok(!/index not found/i.test(r.out), "manifest-aware gate must NOT false-'index not found' on a sharded layout");
    const j = JSON.parse(r.out);
    assert.equal(j.ok, true);
    assert.equal(j.indexEntriesBefore, 40, "readTribalIndexGuarded read the 40 sharded entries (not an empty base)");
    assert.ok(j.toEmbed >= 1, "the fresh wiki note is planned for embed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("clampForEmbedding — returns short text unchanged", () => {
  assert.equal(clampForEmbedding("hello world"), "hello world");
});

test("clampForEmbedding — truncates text longer than MAX_EMBED_CHARS", () => {
  const long = "x".repeat(MAX_EMBED_CHARS + 5000);
  assert.equal(clampForEmbedding(long).length, MAX_EMBED_CHARS);
});

test("clampForEmbedding — non-string input returns empty string", () => {
  assert.equal(clampForEmbedding(null), "");
  assert.equal(clampForEmbedding(undefined), "");
  assert.equal(clampForEmbedding(12345), "");
});

test("inferDomain — explicit domain path segments win", () => {
  assert.equal(inferDomain("H:/prism/knowledge/wiki/wedm/foo.md"), "wedm");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/wire-edm/foo.md"), "wedm");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/lathe/turn.md"), "lathe");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/milling/x.md"), "mill");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/mill/x.md"), "mill");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/cam/x.md"), "cam");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/cad/x.md"), "cad");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/code-tribal/x.md"), "backend-dev");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/software-engineering/x.md"), "backend-dev");
});

test("inferDomain — architecture/concepts fall back to general", () => {
  assert.equal(inferDomain("H:/prism/knowledge/wiki/architecture/session.md"), "general");
  assert.equal(inferDomain("H:/prism/knowledge/wiki/concepts/rag.md"), "general");
});

test("inferDomain — backslash Windows paths normalize", () => {
  assert.equal(inferDomain("H:\\prism\\knowledge\\wiki\\cad\\part.md"), "cad");
});

test("inferDomain — return value is always a valid tribal domain", () => {
  const valid = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);
  for (const p of ["wiki/x.md", "wiki/cam/y.md", "wiki/weird-dir/z.md", ""]) {
    assert.ok(valid.has(inferDomain(p)), `domain for ${p} must be valid`);
  }
});

test("parseArgs — defaults", () => {
  const o = parseArgs([]);
  assert.equal(o.apply, false);
  assert.equal(o.json, false);
  assert.equal(o.batch, 500);
  assert.equal(o.limit, 0);
});

test("parseArgs — flags parsed", () => {
  const o = parseArgs(["--apply", "--json", "--batch", "200", "--limit", "25"]);
  assert.equal(o.apply, true);
  assert.equal(o.json, true);
  assert.equal(o.batch, 200);
  assert.equal(o.limit, 25);
});

test("parseArgs — junk/zero/negative batch falls back to 500", () => {
  assert.equal(parseArgs(["--batch", "0"]).batch, 500);
  assert.equal(parseArgs(["--batch", "-5"]).batch, 500);
  assert.equal(parseArgs(["--batch", "abc"]).batch, 500);
  assert.equal(parseArgs(["--batch"]).batch, 500);
});

test("parseArgs — fractional batch floored", () => {
  assert.equal(parseArgs(["--batch", "300.7"]).batch, 300);
});

test("parseArgs — withContext defaults to false", () => {
  // Verifies the U-RAG-3-BATCH-CONTEXT-PLUMBING flag is a true opt-in: pre-
  // existing callers (CI, ad-hoc operator runs) that did not pass the flag
  // must continue to get the raw-chunk pipeline. A silent default-on would
  // double Ollama load on every existing invocation.
  assert.equal(parseArgs([]).withContext, false);
  assert.equal(parseArgs(["--apply"]).withContext, false);
  assert.equal(parseArgs(["--apply", "--json", "--limit", "10"]).withContext, false);
});

test("parseArgs — --with-context flips withContext true", () => {
  assert.equal(parseArgs(["--with-context"]).withContext, true);
  // Order-independent and composable with the other flags.
  const o = parseArgs(["--apply", "--with-context", "--limit", "100"]);
  assert.equal(o.withContext, true);
  assert.equal(o.apply, true);
  assert.equal(o.limit, 100);
});

test("parseArgs — --with-context does not consume a following positional", () => {
  // Boolean flag — must not greedy-consume `--apply` as a value, otherwise
  // `--with-context --apply` silently drops --apply.
  const o = parseArgs(["--with-context", "--apply"]);
  assert.equal(o.withContext, true);
  assert.equal(o.apply, true);
});

test("DEGRADED_BLURB_FAILURE_THRESHOLD — pinned at 0.5 (regression guard)", () => {
  // A silent bump of this constant changes the R12 signal semantics across
  // every operator invocation. Pin it; any future change must update the test.
  assert.equal(DEGRADED_BLURB_FAILURE_THRESHOLD, 0.5);
});

test("evaluateContextualDegradation — no attempts → not degraded", () => {
  // `--with-context` inactive path: zero counters everywhere.
  const v = evaluateContextualDegradation({ blurbHits: 0, blurbCacheHits: 0, blurbMisses: 0 });
  assert.equal(v.degraded, false);
  assert.equal(v.reason, null);
  assert.equal(v.attempted, 0);
});

test("evaluateContextualDegradation — all-success → not degraded", () => {
  const v = evaluateContextualDegradation({ blurbHits: 100, blurbCacheHits: 50, blurbMisses: 0 });
  assert.equal(v.degraded, false);
  assert.equal(v.failureRate, 0);
});

test("evaluateContextualDegradation — exactly at threshold → not degraded (>= guard)", () => {
  // 50/100 = 0.5 exactly. The check is strict-greater-than, so threshold-edge
  // does NOT trip — matches the per-file embedder's same edge behavior.
  const v = evaluateContextualDegradation({ blurbHits: 50, blurbCacheHits: 0, blurbMisses: 50 });
  assert.equal(v.degraded, false);
  assert.equal(v.failureRate, 0.5);
});

test("evaluateContextualDegradation — above threshold → degraded with reason", () => {
  // 60/100 misses = 60% failure. Must report degraded:true with operator hint.
  const v = evaluateContextualDegradation({ blurbHits: 40, blurbCacheHits: 0, blurbMisses: 60 });
  assert.equal(v.degraded, true);
  assert.ok(v.reason && v.reason.includes("60.0%"));
  assert.ok(v.reason.includes("Ollama"));      // operator-actionable hint
  assert.ok(v.reason.includes("qwen2.5-coder"));// names the upstream dep
});

test("evaluateContextualDegradation — cache hits count toward attempts (success)", () => {
  // The cache-hit path is success, NOT a miss. 200 cache hits + 10 misses
  // = 10/210 ~= 4.8% failure → not degraded.
  const v = evaluateContextualDegradation({ blurbHits: 0, blurbCacheHits: 200, blurbMisses: 10 });
  assert.equal(v.degraded, false);
  assert.ok(v.failureRate < 0.05);
});

test("evaluateContextualDegradation — custom threshold honored", () => {
  // 30% failures with a 25% threshold (operator tightens the bar) → degraded.
  const v = evaluateContextualDegradation({
    blurbHits: 70, blurbCacheHits: 0, blurbMisses: 30, threshold: 0.25,
  });
  assert.equal(v.degraded, true);
  assert.ok(v.reason.includes("25%"));
});

test("evaluateContextualDegradation — coerces non-finite/null inputs to 0", () => {
  // Hardening: caller-provided counters might be undefined under a refactor —
  // the helper must not return NaN failureRate or crash.
  const v = evaluateContextualDegradation({ blurbHits: undefined, blurbCacheHits: null, blurbMisses: "10" });
  assert.equal(v.attempted, 10);
  assert.equal(v.degraded, true);   // 10/10 = 100% failure
});

test("collectMarkdown — recursive, only .md, nested", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eaw-"));
  try {
    fs.writeFileSync(path.join(dir, "a.md"), "# a");
    fs.writeFileSync(path.join(dir, "b.txt"), "not md");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "c.MD"), "# c");   // case-insensitive
    fs.writeFileSync(path.join(dir, "sub", "d.json"), "{}");
    const found = collectMarkdown(dir).map((f) => path.basename(f)).sort();
    assert.deepEqual(found, ["a.md", "c.MD"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("collectMarkdown — missing directory returns [] (no throw)", () => {
  assert.deepEqual(collectMarkdown(path.join(os.tmpdir(), "eaw-does-not-exist-xyz")), []);
});

test("collectMarkdown — empty directory returns []", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eaw-empty-"));
  try {
    assert.deepEqual(collectMarkdown(dir), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("atomicWriteJSON — writes valid round-trippable JSON", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eaw-aw-"));
  try {
    const out = path.join(dir, "x.json");
    const obj = { schemaVersion: 1, entries: [{ id: "a", n: 42 }], dim: 768 };
    atomicWriteJSON(out, obj);
    assert.deepEqual(JSON.parse(fs.readFileSync(out, "utf8")), obj);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("atomicWriteJSON — overwrites an existing file atomically", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eaw-aw2-"));
  try {
    const out = path.join(dir, "y.json");
    atomicWriteJSON(out, { v: 1 });
    atomicWriteJSON(out, { v: 2 });
    assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).v, 2);
    // no leftover temp files
    assert.deepEqual(fs.readdirSync(dir), ["y.json"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
