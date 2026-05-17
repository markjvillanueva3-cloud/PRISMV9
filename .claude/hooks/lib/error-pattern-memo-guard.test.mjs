// node:test for shouldSkipMemo — the pure decision core of
// error-pattern-promote's ledger-unchanged memoization.
// Run: node --test H:/prism/.claude/hooks/lib/error-pattern-memo-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldSkipMemo } from "./error-pattern-memo-guard.mjs";

const STAT = { size: 48256, mtimeMs: 1779036635129 };

test("cold start — no memo → full work (false)", () => {
  assert.equal(shouldSkipMemo(null, STAT), false);
});

test("stat unavailable → full work (false), never skip on doubt", () => {
  assert.equal(shouldSkipMemo({ ...STAT, decision: "noop_below_threshold" }, null), false);
});

test("warm, byte-identical, last decision no-op → SKIP (true)", () => {
  assert.equal(shouldSkipMemo({ ...STAT, decision: "noop_below_threshold" }, STAT), true);
  assert.equal(shouldSkipMemo({ ...STAT, decision: "noop_all_drafted" }, STAT), true);
  assert.equal(shouldSkipMemo({ ...STAT, decision: "noop_empty_ledger" }, STAT), true);
  assert.equal(shouldSkipMemo({ ...STAT, decision: "noop_unchanged_ledger" }, STAT), true);
});

test("file grew (size mismatch) → full work (false)", () => {
  assert.equal(shouldSkipMemo({ size: 48000, mtimeMs: STAT.mtimeMs, decision: "noop_below_threshold" }, STAT), false);
});

test("file touched (mtime mismatch) → full work (false)", () => {
  assert.equal(shouldSkipMemo({ size: STAT.size, mtimeMs: 1779036000000, decision: "noop_below_threshold" }, STAT), false);
});

test("last run drafted → re-evaluate (false), do NOT skip", () => {
  assert.equal(shouldSkipMemo({ ...STAT, decision: "drafted" }, STAT), false);
});

test("malformed memo (no decision string) → full work (false)", () => {
  assert.equal(shouldSkipMemo({ ...STAT }, STAT), false);
  assert.equal(shouldSkipMemo({ ...STAT, decision: 123 }, STAT), false);
  assert.equal(shouldSkipMemo({ ...STAT, decision: null }, STAT), false);
});

test("decision that merely contains 'noop' but doesn't start with it → false", () => {
  assert.equal(shouldSkipMemo({ ...STAT, decision: "drafted_then_noop" }, STAT), false);
});

test("disabled decision is not memo-skippable (doesn't start with noop)", () => {
  assert.equal(shouldSkipMemo({ ...STAT, decision: "disabled" }, STAT), false);
});
