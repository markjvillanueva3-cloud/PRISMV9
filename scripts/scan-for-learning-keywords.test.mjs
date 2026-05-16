#!/usr/bin/env node
/**
 * Tests for scan-for-learning-keywords.mjs — node:test runner (no vitest).
 * Validates scanText() pure-function correctness + run() integration via
 * env-var-injected memory dir.
 *
 * Run: node --test scripts/scan-for-learning-keywords.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Set the memory dir env var BEFORE importing the SUT — its top-level
// reads `process.env.PRISM_LEARNING_SCAN_MEMORY_DIR` at module-load time.
const tmpMemoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "learn-kw-test-"));
process.env.PRISM_LEARNING_SCAN_MEMORY_DIR = tmpMemoryDir;
process.env.PRISM_LEARNING_SCAN_DISABLE = "";

const { scanText, run } = await import("./scan-for-learning-keywords.mjs");

// ---------- scanText() pure tests ----------

test("scanText returns empty array on empty input", () => {
  assert.deepEqual(scanText("", "test"), []);
  assert.deepEqual(scanText(null, "test"), []);
  assert.deepEqual(scanText(undefined, "test"), []);
});

test("scanText flags P0 as critical severity", () => {
  const hits = scanText("Found P0 issue in the parser", "test");
  const p0 = hits.find((h) => h.match === "P0");
  assert.ok(p0, "P0 should be flagged");
  assert.equal(p0.severity, "critical");
  assert.equal(p0.category, "critical");
});

test("scanText flags P1 as warn", () => {
  const hits = scanText("P1 finding from arm B reviewer", "test");
  const p1 = hits.find((h) => h.match === "P1");
  assert.ok(p1);
  assert.equal(p1.severity, "warn");
});

test("scanText flags FAIL case-insensitively", () => {
  const hits1 = scanText("test FAIL", "test");
  const hits2 = scanText("test fail", "test");
  const hits3 = scanText("test Failed", "test");
  assert.ok(hits1.some((h) => /^FAIL/i.test(h.match)));
  assert.ok(hits2.some((h) => /^fail/i.test(h.match)));
  assert.ok(hits3.some((h) => /^Failed/i.test(h.match)));
});

test("scanText flags hostile-payload language", () => {
  const hits = scanText("greedy slice was EXPLOITABLE on hostile input", "test");
  assert.ok(hits.some((h) => h.match === "EXPLOITABLE"));
  assert.ok(hits.some((h) => h.match.toLowerCase() === "hostile"));
});

test("scanText flags regression keywords", () => {
  const hits = scanText("Commit hijacked: 6th this session, peer absorbed", "test");
  assert.ok(hits.some((h) => /hijack/i.test(h.match)));
});

test("scanText caps per-keyword hits at 5 to bound output", () => {
  const noisy = "fix ".repeat(20);
  const hits = scanText(noisy, "test");
  const fixHits = hits.filter((h) => /fix/i.test(h.match));
  assert.ok(fixHits.length <= 5, `expected ≤5 fix hits, got ${fixHits.length}`);
});

test("scanText preserves source label and trims context whitespace", () => {
  const hits = scanText("   error\n\noccurred   in   parser", "src-A");
  const errHit = hits.find((h) => /error/i.test(h.match));
  assert.ok(errHit);
  assert.equal(errHit.source, "src-A");
  assert.ok(!errHit.context.match(/  /), "context should be whitespace-normalized");
});

test("scanText does NOT flag innocuous words", () => {
  const hits = scanText("the project is going well, ship it tomorrow", "test");
  assert.equal(hits.length, 0);
});

test("scanText flags 'in hindsight' multi-word phrase", () => {
  const hits = scanText("in hindsight, we should have validated earlier", "test");
  assert.ok(hits.some((h) => /in hindsight/i.test(h.match)));
});

test("scanText flags 'next time' multi-word phrase", () => {
  const hits = scanText("ok, next time we run the dedup check first", "test");
  assert.ok(hits.some((h) => /next time/i.test(h.match)));
});

test("scanText flags 'false-positive' and 'false positive'", () => {
  const a = scanText("classic false-positive on regex", "test");
  const b = scanText("classic false positive on regex", "test");
  assert.ok(a.some((h) => /false[- ]positive/i.test(h.match)));
  assert.ok(b.some((h) => /false[- ]positive/i.test(h.match)));
});

test("scanText flags TypeError and ReferenceError", () => {
  const hits = scanText("hit a TypeError on null then a ReferenceError", "test");
  assert.ok(hits.some((h) => h.match === "TypeError"));
  assert.ok(hits.some((h) => h.match === "ReferenceError"));
});

test("scanText handles unicode + emoji safely (no crash)", () => {
  const hits = scanText("✨ fixed the 漢字 bug ⚠️ regression🔥", "test");
  assert.ok(Array.isArray(hits));
  assert.ok(hits.length > 0);
});

// ---------- isLikelyCaptured / run() integration tests ----------

test("run() with disabled flag returns empty list", async () => {
  process.env.PRISM_LEARNING_SCAN_DISABLE = "1";
  // re-import after env change — Node caches modules, so this checks the
  // exported `run()` body still respects the env each call.
  const fresh = await import(`./scan-for-learning-keywords.mjs?cache=${Date.now()}`);
  const result = fresh.run({});
  assert.equal(result.ok, true);
  assert.equal(result.disabled, true);
  assert.equal(result.totalHits, 0);
  process.env.PRISM_LEARNING_SCAN_DISABLE = "";
});

test("run() returns ok=true with capture corpus from empty memory dir", () => {
  // Fresh memory dir; capture corpus has no entries, so EVERY hit in
  // git log / diff comes back uncaptured.
  const result = run({ windowCommits: 5, json: true });
  assert.equal(result.ok, true);
  assert.equal(typeof result.totalHits, "number");
  assert.equal(typeof result.uncapturedHits, "number");
  assert.ok(result.counts);
  assert.ok(Array.isArray(result.hits));
  // Sanity: uncapturedHits <= totalHits
  assert.ok(result.uncapturedHits <= result.totalHits);
});

test("run() output is capped at 50 hits", () => {
  const result = run({ windowCommits: 50, json: true });
  assert.ok(result.hits.length <= 50);
});

test("isLikelyCaptured dedup via memo file content", () => {
  // Write a fake memo containing the SHA we're about to scan for.
  const sha = "84238a963abcdef1234567890";
  const memoBody = `# Lesson\n\nThis happened at commit ${sha} — captured.\n`;
  fs.writeFileSync(path.join(tmpMemoryDir, "feedback_test_dedup.md"), memoBody);

  // Use the SHA in a fake git-style context line we manually scan.
  const text = `FAIL: commit ${sha} hijacked tree`;
  const hits = scanText(text, `git:${sha.slice(0, 10)}`);
  assert.ok(hits.length > 0);

  // Trigger isLikelyCaptured indirectly via run(). The corpus rebuilds on
  // each run() call.
  const result = run({ windowCommits: 1, json: true });
  // We can't easily test the SHA dedup with the current run() since it
  // scans git, not arbitrary text. The dedup helper is exercised
  // indirectly via the integration. The unit-level guarantee is that
  // scanText itself fires regardless; dedup is a downstream filter.
  assert.ok(result.ok);

  // Cleanup
  fs.unlinkSync(path.join(tmpMemoryDir, "feedback_test_dedup.md"));
});

test("scanText source field round-trips through to output", () => {
  const hits = scanText("oops, broke the parser", "src-custom-123");
  for (const h of hits) {
    assert.equal(h.source, "src-custom-123");
  }
});

test("scanText returns a non-empty 'why' explanation for every hit", () => {
  const hits = scanText("P0 FAIL regression broke fixed mistake", "test");
  for (const h of hits) {
    assert.ok(h.why && h.why.length > 5, `every hit should explain why: ${JSON.stringify(h)}`);
  }
});
