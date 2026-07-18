import { test } from "node:test";
import assert from "node:assert/strict";
import { pruneTail, DEFAULT_SIZE_CAP_BYTES, DEFAULT_RETAIN_BYTES } from "../lib/jsonl-tail-prune.mjs";

test("pruneTail: under cap → not pruned", () => {
  const txt = "line1\nline2\n";
  const r = pruneTail(txt, 1000, 500);
  assert.equal(r.pruned, false);
  assert.equal(r.newText, txt);
  assert.equal(r.droppedBytes, 0);
});

test("pruneTail: over cap → pruned, retained bytes within retainBytes", () => {
  // Build a text larger than the cap with predictable line boundaries
  const line = "x".repeat(99) + "\n"; // 100 bytes incl. newline
  const txt = line.repeat(100); // 10000 bytes, 100 lines
  const r = pruneTail(txt, 1000, 500);
  assert.equal(r.pruned, true);
  assert.ok(r.retainedBytes <= 600); // <= retainBytes + one line slack
  assert.ok(r.droppedBytes > 0);
  assert.equal(r.droppedBytes + r.retainedBytes, txt.length);
  // newText must start at a record boundary (line content, no partial JSON)
  assert.ok(r.newText.startsWith("x"));
});

test("pruneTail: cuts on newline boundary (no mid-record split)", () => {
  const lines = ["{\"a\":1}", "{\"b\":2}", "{\"c\":3}", "{\"d\":4}"];
  const txt = lines.join("\n") + "\n";
  const r = pruneTail(txt, 16, 10); // force a prune
  if (r.pruned) {
    // Every line in newText must parse as valid JSON
    for (const line of r.newText.split("\n").filter(Boolean)) {
      JSON.parse(line); // throws if mid-split
    }
  }
});

test("pruneTail: non-string input → pruned:false, reason:non-string-input", () => {
  const r = pruneTail(null);
  assert.equal(r.pruned, false);
  assert.equal(r.reason, "non-string-input");
});

test("pruneTail: empty string → under-cap (no prune)", () => {
  const r = pruneTail("");
  assert.equal(r.pruned, false);
  assert.equal(r.retainedBytes, 0);
});

test("pruneTail: single huge line over cap (pathological) → no prune (reason:no-newline-after-cut)", () => {
  const txt = "x".repeat(2000); // no newlines
  const r = pruneTail(txt, 100, 50);
  assert.equal(r.pruned, false);
  assert.equal(r.reason, "no-newline-after-cut");
  // Important: never returns a truncated string that could corrupt JSON
  assert.equal(r.newText, txt);
});

test("pruneTail: defaults exported", () => {
  assert.equal(DEFAULT_SIZE_CAP_BYTES, 5 * 1024 * 1024);
  assert.equal(DEFAULT_RETAIN_BYTES, 1 * 1024 * 1024);
});

test("pruneTail: droppedLines + retainedLines sum to total", () => {
  const line = "{\"a\":1}\n";
  const txt = line.repeat(50); // 50 lines
  const r = pruneTail(txt, 100, 50);
  if (r.pruned) {
    assert.equal(r.droppedLines + r.retainedLines, 50);
  }
});
