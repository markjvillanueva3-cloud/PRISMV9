// Tests for forge-queue-inject.mjs pure logic (EXTRACTION-FORGE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): drained (done) candidates are NOT re-surfaced; the surface is
// bounded to top-K; debounce stops per-prompt spam.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingCandidates, isDebounced } from "./forge-queue-inject.mjs";

const q = (sp) => ({ sourcePath: sp, kind: "algorithm", score: 0.6, forgeAction: `/forge-triple algorithm:${sp}` });

test("pendingCandidates: excludes done, bounds to K, dedups source paths", () => {
  const queue = [q("a.md"), q("b.md"), q("c.md"), q("d.md")];
  // b is drained -> not surfaced
  const r = pendingCandidates(queue, new Set(["b.md"]), 3).map((c) => c.sourcePath);
  assert.deepEqual(r, ["a.md", "c.md", "d.md"]);
  // K bounds the result
  assert.equal(pendingCandidates(queue, new Set(), 2).length, 2);
  // duplicate source path in the queue surfaces once
  const dup = [q("a.md"), q("a.md"), q("b.md")];
  assert.deepEqual(pendingCandidates(dup, new Set(), 5).map((c) => c.sourcePath), ["a.md", "b.md"]);
  // all done -> nothing pending
  assert.equal(pendingCandidates(queue, new Set(["a.md", "b.md", "c.md", "d.md"]), 3).length, 0);
  // accepts an array done-set; null queue safe
  assert.equal(pendingCandidates(queue, ["a.md"], 3).length, 3);
  assert.deepEqual(pendingCandidates(null, new Set(), 3), []);
});

test("isDebounced: suppresses within the 5-min window, fires outside", () => {
  const now = 10_000_000;
  const win = 300_000;
  assert.equal(isDebounced(now - 60_000, now, win), true);
  assert.equal(isDebounced(now - 300_000, now, win), false);
  assert.equal(isDebounced(0, now, win), false);
  assert.equal(isDebounced(NaN, now, win), false);
});
