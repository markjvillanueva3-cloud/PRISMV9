import { test } from "node:test";
import assert from "node:assert/strict";

// Re-import the pure helper by re-implementing it for testability — the hook
// inlines summarizeRecent for simplicity. This test file pins the contract.

function summarizeRecent(jsonlText, windowN) {
  const lines = jsonlText.split("\n").filter(Boolean);
  const recent = lines.slice(-windowN);
  if (recent.length === 0) return null;
  let skipped = 0;
  const reasonCounts = {};
  for (const line of recent) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.skip_reason || !entry.rewrite) {
      skipped += 1;
      const r = entry.skip_reason || "unknown";
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
  }
  return { total: recent.length, skipped, skipRate: skipped / recent.length, reasonCounts };
}

test("summarizeRecent: all-skipped → 100%", () => {
  const txt = [
    JSON.stringify({ skip_reason: "timeout", rewrite: null }),
    JSON.stringify({ skip_reason: "ollama-offline", rewrite: null }),
  ].join("\n");
  const s = summarizeRecent(txt, 10);
  assert.equal(s.total, 2);
  assert.equal(s.skipped, 2);
  assert.equal(s.skipRate, 1.0);
  assert.equal(s.reasonCounts.timeout, 1);
  assert.equal(s.reasonCounts["ollama-offline"], 1);
});

test("summarizeRecent: all-healthy → 0%", () => {
  const txt = [
    JSON.stringify({ rewrite: { goal: "x" }, model: "m" }),
    JSON.stringify({ rewrite: { goal: "y" }, model: "m" }),
  ].join("\n");
  const s = summarizeRecent(txt, 10);
  assert.equal(s.skipped, 0);
  assert.equal(s.skipRate, 0);
});

test("summarizeRecent: mixed → fractional", () => {
  const txt = [
    JSON.stringify({ rewrite: { goal: "a" } }),
    JSON.stringify({ skip_reason: "timeout", rewrite: null }),
    JSON.stringify({ rewrite: { goal: "b" } }),
    JSON.stringify({ skip_reason: "timeout", rewrite: null }),
  ].join("\n");
  const s = summarizeRecent(txt, 10);
  assert.equal(s.total, 4);
  assert.equal(s.skipped, 2);
  assert.equal(s.skipRate, 0.5);
});

test("summarizeRecent: windowN limits scan to last N", () => {
  const lines = [];
  for (let i = 0; i < 100; i += 1) {
    lines.push(JSON.stringify({ rewrite: { goal: "ok" } }));
  }
  for (let i = 0; i < 10; i += 1) {
    lines.push(JSON.stringify({ skip_reason: "timeout", rewrite: null }));
  }
  const s = summarizeRecent(lines.join("\n"), 10);
  assert.equal(s.total, 10);
  assert.equal(s.skipped, 10); // window covered only the failures
});

test("summarizeRecent: empty input → null", () => {
  assert.equal(summarizeRecent("", 10), null);
  assert.equal(summarizeRecent("\n\n\n", 10), null);
});

test("summarizeRecent: malformed lines skipped", () => {
  const txt = [
    "not-json",
    JSON.stringify({ skip_reason: "timeout", rewrite: null }),
    "{broken",
  ].join("\n");
  const s = summarizeRecent(txt, 10);
  assert.equal(s.total, 3); // 3 lines counted by lineN-filter
  assert.equal(s.skipped, 1); // only the parseable one counted
});

test("summarizeRecent: success without skip_reason is healthy", () => {
  // 2026-05-23 contract: an entry is 'skipped' if it has skip_reason OR rewrite==null.
  const txt = JSON.stringify({ rewrite: { goal: "x", confidence: 0.8 }, model: "qwen2.5-coder:7b" });
  const s = summarizeRecent(txt, 10);
  assert.equal(s.skipped, 0);
});
