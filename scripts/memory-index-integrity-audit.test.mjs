#!/usr/bin/env node
/**
 * Tests for memory-index-integrity-audit.mjs (/goal synergy iter 19, echo).
 *
 * Run: node --test scripts/memory-index-integrity-audit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseIndexLinks,
  audit,
  collectMemoryFiles,
  SCHEMA_VERSION,
  MAX_LIST,
  NON_ORPHAN_BASENAMES,
} from "./memory-index-integrity-audit.mjs";

// ───────────────────────── exports ─────────────────────────

test("exports + constants stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.equal(MAX_LIST, 50);
  assert.ok(NON_ORPHAN_BASENAMES.has("MEMORY.md"));
  assert.ok(NON_ORPHAN_BASENAMES.has("MEMORY-ARCHIVE.md"));
});

// ───────────────────────── parseIndexLinks ─────────────────────────

test("parseIndexLinks: extracts [title](target.md) pairs", () => {
  const md = `# Index
- [Slot query](feedback_slot_query.md) — desc
- [Auto build](feedback_always_build.md) — desc`;
  const r = parseIndexLinks(md);
  assert.equal(r.length, 2);
  assert.equal(r[0].title, "Slot query");
  assert.equal(r[0].target, "feedback_slot_query.md");
  assert.equal(r[1].target, "feedback_always_build.md");
});

test("parseIndexLinks: only .md targets, skips URLs and non-md", () => {
  const md = `[ext](https://example.com/x.md) [png](image.png) [ok](real_memo.md)`;
  const r = parseIndexLinks(md);
  assert.equal(r.length, 1, "URL .md and .png both skipped");
  assert.equal(r[0].target, "real_memo.md");
});

test("parseIndexLinks: empty / null / no-links → empty array", () => {
  assert.deepEqual(parseIndexLinks(""), []);
  assert.deepEqual(parseIndexLinks(null), []);
  assert.deepEqual(parseIndexLinks("no links here at all"), []);
});

test("parseIndexLinks: relative-prefixed target preserved verbatim", () => {
  const r = parseIndexLinks("[x](../reference/reference_foo.md)");
  assert.equal(r.length, 1);
  assert.equal(r[0].target, "../reference/reference_foo.md");
});

// ───────────────────────── audit ─────────────────────────

test("audit: all pointers resolve, no orphans → clean", () => {
  const links = [
    { title: "A", target: "feedback_a.md" },
    { title: "B", target: "feedback_b.md" },
  ];
  const files = new Set(["feedback_a.md", "feedback_b.md", "MEMORY.md"]);
  const r = audit(links, files);
  assert.equal(r.stats.brokenPointers, 0);
  assert.equal(r.stats.orphans, 0, "MEMORY.md excluded from orphans");
  assert.equal(r.stats.indexLinks, 2);
  assert.equal(r.stats.memoryFiles, 3);
  assert.equal(r.stats.coverage, 1);
});

test("audit: broken pointer detected", () => {
  const links = [
    { title: "Live", target: "feedback_live.md" },
    { title: "Dead", target: "feedback_renamed_away.md" },
  ];
  const files = new Set(["feedback_live.md"]);
  const r = audit(links, files);
  assert.equal(r.stats.brokenPointers, 1);
  assert.equal(r.brokenPointers[0].target, "feedback_renamed_away.md");
  assert.equal(r.brokenPointers[0].title, "Dead");
});

test("audit: orphan memory detected", () => {
  const links = [{ title: "Indexed", target: "reference_indexed.md" }];
  const files = new Set(["reference_indexed.md", "reference_orphan.md", "feedback_orphan2.md"]);
  const r = audit(links, files);
  assert.equal(r.stats.orphans, 2);
  assert.deepEqual(r.orphans, ["feedback_orphan2.md", "reference_orphan.md"], "sorted asc");
});

test("audit: index files (MEMORY.md etc) never counted as orphans", () => {
  const links = [];
  const files = new Set(["MEMORY.md", "MEMORY-ARCHIVE.md", "README.md", "reference_real.md"]);
  const r = audit(links, files);
  assert.equal(r.stats.orphans, 1, "only reference_real.md is an orphan");
  assert.deepEqual(r.orphans, ["reference_real.md"]);
});

test("audit: link target with relative prefix resolves by basename", () => {
  // The index sometimes writes ../reference/foo.md — resolution is by basename.
  const links = [{ title: "X", target: "../reference/reference_foo.md" }];
  const files = new Set(["reference_foo.md"]);
  const r = audit(links, files);
  assert.equal(r.stats.brokenPointers, 0, "basename resolution handles relative prefix");
});

test("audit: coverage computed correctly", () => {
  const links = [{ title: "A", target: "a.md" }];
  const files = new Set(["a.md", "b.md", "c.md", "d.md"]); // 1 reachable, 3 orphan
  const r = audit(links, files);
  assert.equal(r.stats.orphans, 3);
  assert.equal(r.stats.coverage, 0.25, "(4-3)/4");
});

test("audit: empty inputs → zero stats, no divide-by-zero", () => {
  const r = audit([], new Set());
  assert.equal(r.stats.indexLinks, 0);
  assert.equal(r.stats.memoryFiles, 0);
  assert.equal(r.stats.brokenPointers, 0);
  assert.equal(r.stats.orphans, 0);
  assert.equal(r.stats.coverage, 0);
});

test("audit: null/array inputs → fail-soft", () => {
  const r1 = audit(null, null);
  assert.equal(r1.stats.indexLinks, 0);
  const r2 = audit([{ title: "X", target: "x.md" }], ["x.md"]); // array form
  assert.equal(r2.stats.brokenPointers, 0);
  assert.equal(r2.stats.memoryFiles, 1);
});

test("audit: broken/orphan lists capped at MAX_LIST", () => {
  const links = Array.from({ length: MAX_LIST + 20 }, (_, i) => ({ title: `T${i}`, target: `missing_${i}.md` }));
  const files = new Set(Array.from({ length: MAX_LIST + 20 }, (_, i) => `orphan_${i}.md`));
  const r = audit(links, files);
  assert.equal(r.stats.brokenPointers, MAX_LIST + 20, "stat counts all");
  assert.equal(r.brokenPointers.length, MAX_LIST, "list capped");
  assert.equal(r.stats.orphans, MAX_LIST + 20);
  assert.equal(r.orphans.length, MAX_LIST, "list capped");
});

test("audit: deterministic — same input twice → identical (sans generatedAt)", () => {
  const links = [{ title: "A", target: "a.md" }];
  const files = new Set(["a.md", "z.md"]);
  const a = audit(links, files);
  const b = audit(links, files);
  delete a.generatedAt;
  delete b.generatedAt;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

// ───────────────────────── collectMemoryFiles ─────────────────────────

test("collectMemoryFiles: recursive .md basename collection", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mem-"));
  mkdirSync(path.join(root, "feedback"), { recursive: true });
  mkdirSync(path.join(root, "reference"), { recursive: true });
  writeFileSync(path.join(root, "feedback", "feedback_x.md"), "x");
  writeFileSync(path.join(root, "reference", "reference_y.md"), "y");
  writeFileSync(path.join(root, "notes.txt"), "ignored");
  const r = collectMemoryFiles(root);
  assert.ok(r.has("feedback_x.md"));
  assert.ok(r.has("reference_y.md"));
  assert.ok(!r.has("notes.txt"));
  assert.equal(r.size, 2);
  rmSync(root, { recursive: true, force: true });
});

test("collectMemoryFiles: missing/null dir → empty set", () => {
  assert.equal(collectMemoryFiles(null).size, 0);
  assert.equal(collectMemoryFiles("/no/such/dir").size, 0);
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live memory vault + index → audit shape correct", () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
    "..",
  );
  const indexPath = path.join(root, "knowledge/memories/_index/MEMORY.md");
  const memRoot = path.join(root, "knowledge/memories");
  if (!existsSync(indexPath) || !existsSync(memRoot)) {
    console.log("  SKIP: live memory vault missing");
    return;
  }
  const indexContent = readFileSync(indexPath, "utf8");
  const links = parseIndexLinks(indexContent);
  const files = collectMemoryFiles(memRoot);
  const r = audit(links, files);
  assert.equal(r.schemaVersion, SCHEMA_VERSION);
  assert.ok(r.stats.memoryFiles >= 1, "live vault has memory files");
  assert.ok(r.stats.coverage >= 0 && r.stats.coverage <= 1, "coverage in [0,1]");
});
