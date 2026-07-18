import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCleanness, shouldSkipHook, DEFAULT_SKIP_ELIGIBLE } from "../lib/stop-skip-when-clean.mjs";

test("classifyCleanness: all-false probe → clean", () => {
  const v = classifyCleanness({ hasEdits: false, hasUntracked: false, hasCommits: false });
  assert.equal(v.clean, true);
  assert.ok(v.reason.includes("no-edits"));
});
test("classifyCleanness: any-true → dirty", () => {
  assert.equal(classifyCleanness({ hasEdits: true }).clean, false);
  assert.equal(classifyCleanness({ hasUntracked: true }).clean, false);
  assert.equal(classifyCleanness({ hasCommits: true }).clean, false);
});
test("classifyCleanness: dirty reason names sources", () => {
  const v = classifyCleanness({ hasEdits: true, hasUntracked: true });
  assert.ok(v.reason.includes("edits"));
  assert.ok(v.reason.includes("untracked"));
});
test("classifyCleanness: null probe → not clean", () => {
  assert.equal(classifyCleanness(null).clean, false);
});

test("shouldSkipHook: dirty session → never skip", () => {
  const v = { clean: false };
  assert.equal(shouldSkipHook("stop-session-spend-summary", v, DEFAULT_SKIP_ELIGIBLE).skip, false);
});
test("shouldSkipHook: clean + eligible → skip", () => {
  const v = { clean: true, reason: "no-edits" };
  const r = shouldSkipHook("stop-session-spend-summary", v, DEFAULT_SKIP_ELIGIBLE);
  assert.equal(r.skip, true);
});
test("shouldSkipHook: clean + non-eligible → don't skip", () => {
  const v = { clean: true };
  assert.equal(shouldSkipHook("scrutinize-before-stop", v, DEFAULT_SKIP_ELIGIBLE).skip, false);
});
test("shouldSkipHook: array eligibility also works", () => {
  const v = { clean: true };
  assert.equal(shouldSkipHook("h1", v, ["h1", "h2"]).skip, true);
  assert.equal(shouldSkipHook("h3", v, ["h1", "h2"]).skip, false);
});
test("DEFAULT_SKIP_ELIGIBLE contains expected hooks", () => {
  assert.ok(DEFAULT_SKIP_ELIGIBLE.has("stop-session-spend-summary"));
  assert.ok(DEFAULT_SKIP_ELIGIBLE.has("stop-defer-queue-drain"));
  assert.ok(DEFAULT_SKIP_ELIGIBLE.has("stop-obsidian-memory-feed"));
});
