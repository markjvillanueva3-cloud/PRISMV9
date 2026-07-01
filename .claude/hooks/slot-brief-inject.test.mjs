// tier: T2
// Tests for .claude/hooks/slot-brief-inject.mjs
// (HERMES-MASTER-ORCHESTRATOR slot-brief channel; wired-but-untested -> covered 2026-06-10, slot:bravo).
//
// node:test -- the hook is already import-safe (invokedAsScript guard) and exports its
// pure helpers, so a static import is hermetic (no stdin/file I/O at module load). The
// security-critical assertion is resolveSlot's NATO-token guard: a corrupted/hand-edited
// chat-slots.json must NOT become an arbitrary file-move primitive downstream (path.join).
//
// Run: node --test H:/prism/.claude/hooks/slot-brief-inject.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSlot, briefHash, formatStamp, truncateBrief, buildBriefBlock } from "./slot-brief-inject.mjs";

test("resolveSlot: matches by exact chatId and by embedded short id", () => {
  const doc = { slots: { bravo: { chatId: "claude-001bd6c3" }, alpha: { chatId: "claude-deadbeef" } } };
  assert.equal(resolveSlot("claude-001bd6c3", doc), "bravo");           // exact
  assert.equal(resolveSlot("001bd6c3", doc), "bravo");                  // short id (claude- stripped)
  assert.equal(resolveSlot("some-session-001bd6c3-suffix", doc), "bravo"); // embedded
  assert.equal(resolveSlot("claude-deadbeef", doc), "alpha");
});

test("resolveSlot: SECURITY -- non-NATO slot keys are rejected (no path-injection primitive)", () => {
  // a corrupted slots file with a traversal/path key must be skipped, never resolved
  const evil = { slots: { "../../etc": { chatId: "claude-x" }, "a/b": { chatId: "claude-x" }, "GOLF": { chatId: "claude-x" } } };
  assert.equal(resolveSlot("claude-x", evil), null);   // all keys fail /^[a-z]+$/ -> none match
  // a legit lowercase key alongside the evil ones still resolves (and the evil ones never win)
  const mixed = { slots: { "../evil": { chatId: "claude-x" }, bravo: { chatId: "claude-x" } } };
  assert.equal(resolveSlot("claude-x", mixed), "bravo");
});

test("resolveSlot: null on missing/empty inputs", () => {
  assert.equal(resolveSlot("", { slots: { bravo: { chatId: "claude-x" } } }), null);
  assert.equal(resolveSlot("claude-x", null), null);
  assert.equal(resolveSlot("claude-x", {}), null);
  assert.equal(resolveSlot("claude-x", { slots: {} }), null);
});

test("briefHash: deterministic 8-hex, discriminating, empty -> 00000000", () => {
  assert.equal(briefHash("the brief body"), briefHash("the brief body"));
  assert.match(briefHash("the brief body"), /^[0-9a-f]{8}$/);
  assert.notEqual(briefHash("body A"), briefHash("body B"));
  assert.equal(briefHash(""), "00000000");
  assert.equal(briefHash(null), "00000000");
});

test("formatStamp: floors mtime + appends hash; non-finite mtime -> 0", () => {
  assert.equal(formatStamp(1234.9, "x"), `1234-${briefHash("x")}`);
  assert.equal(formatStamp(NaN, "x"), `0-${briefHash("x")}`);
  assert.equal(formatStamp(Infinity, "x"), `0-${briefHash("x")}`);
});

test("truncateBrief: under cap unchanged; over cap head-truncated with marker", () => {
  assert.equal(truncateBrief("short brief", 100), "short brief");
  const big = "x".repeat(50);
  const t = truncateBrief(big, 10);
  assert.equal(t.slice(0, 10), "xxxxxxxxxx");
  assert.match(t, /brief truncated at 10 bytes/);
});

test("buildBriefBlock: targeted header + body; verbose adds source footer; over-cap truncates", () => {
  const block = buildBriefBlock("bravo", "do the thing");
  assert.match(block, /Orchestrator brief/);
  assert.match(block, /bravo/);
  assert.match(block, /consume-once/);
  assert.match(block, /do the thing/);
  assert.doesNotMatch(block, /brief source/);   // no footer when not verbose
  const v = buildBriefBlock("bravo", "do X", { verbose: true, briefPath: "state/shared/slot-briefs/bravo.md" });
  assert.match(v, /brief source: state\/shared\/slot-briefs\/bravo\.md/);
  const over = buildBriefBlock("bravo", "y".repeat(20), { maxBytes: 8 });
  assert.match(over, /brief truncated at 8 bytes/);
});
