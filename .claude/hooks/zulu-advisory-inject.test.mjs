// tier: T2
// Tests for .claude/hooks/zulu-advisory-inject.mjs
// (ZULU-ORCHESTRATOR-MS0/U-ZULU06; wired-but-untested -> covered 2026-06-10, slot:bravo).
//
// node:test -- the hook is import-safe (isDirect guard) and exports its pure helpers, so a
// static import is hermetic (main()'s `for await stdin` never runs). The keystone is
// normalizePressure: the pressureLevel->level / tokensEstimate->tokens boundary adapter
// whose absence made the hook silently no-op every prompt even when wired (its documented
// dormancy cause). These tests pin that fix.
//
// Run: node --test H:/prism/.claude/hooks/zulu-advisory-inject.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSlotFromSlotsFile, buildChatState, renderAdvisory, normalizePressure } from "./zulu-advisory-inject.mjs";

test("normalizePressure: maps CHO02 field names (pressureLevel->level, tokensEstimate->tokens)", () => {
  // the dormancy bug: readChatPressure returns {pressureLevel, tokensEstimate}; consumers
  // read {level, tokens}. Without this adapter main() read undefined and exited every prompt.
  const n = normalizePressure({ pressureLevel: "critical", tokensEstimate: 5000 });
  assert.equal(n.level, "critical");
  assert.equal(n.tokens, 5000);
  // tolerant: an already-normalized object passes through unchanged
  const already = normalizePressure({ level: "warning", tokens: 1200 });
  assert.equal(already.level, "warning");
  assert.equal(already.tokens, 1200);
  assert.equal(normalizePressure(null), null);            // R12 fail-safe
  assert.equal(normalizePressure(undefined), undefined);
});

test("resolveSlotFromSlotsFile: exact chatId + embedded short id; 'unknown' otherwise", () => {
  const doc = { slots: { bravo: { chatId: "claude-001bd6c3" }, alpha: { chatId: "claude-deadbeef" } } };
  assert.equal(resolveSlotFromSlotsFile("claude-001bd6c3", doc), "bravo");
  assert.equal(resolveSlotFromSlotsFile("term-001bd6c3-x", doc), "bravo"); // embedded short id
  assert.equal(resolveSlotFromSlotsFile("claude-deadbeef", doc), "alpha");
  assert.equal(resolveSlotFromSlotsFile("nomatch", doc), "unknown");
  assert.equal(resolveSlotFromSlotsFile("", doc), "unknown");
  assert.equal(resolveSlotFromSlotsFile("x", null), "unknown");
});

test("buildChatState: null pressure -> null; conservative preserve-continuity defaults", () => {
  assert.equal(buildChatState(null), null);
  const s = buildChatState({ level: "critical", tokens: 5000 }, { hasActiveLoop: true, hasHandoff: false });
  assert.equal(s.tokensEstimate, 5000);
  assert.equal(s.pressureLevel, "critical");
  assert.equal(s.hasActiveLoop, true);
  assert.equal(s.hasUnresolvedHandoff, false);
  // R12: default biases to PRESERVE (compact > clear) when uncommitted-work can't be cheaply determined
  assert.equal(s.hasUncommittedCriticalWork, true);
  // hasActiveLoop is strict-true only
  assert.equal(buildChatState({ level: "x", tokens: 1 }, {}).hasActiveLoop, false);
});

test("renderAdvisory: null/noop -> null; clear/compact/advise-only render the right recommendation", () => {
  assert.equal(renderAdvisory(null, "bravo", {}), null);
  assert.equal(renderAdvisory({ action: "noop" }, "bravo", { level: "low", tokens: 100 }), null);

  const compact = renderAdvisory({ action: "compact", reason: "high pressure" }, "bravo", { level: "critical", tokens: 5000 });
  assert.match(compact, /Zulu advisory/);
  assert.match(compact, /slot=`bravo`/);
  assert.match(compact, /critical/);
  assert.match(compact, /~5K tokens/);
  assert.match(compact, /\/compact\*\* recommended/);
  assert.match(compact, /high pressure/);

  assert.match(renderAdvisory({ action: "clear", reason: "r" }, "bravo", { level: "warning", tokens: 3000 }), /\/clear\*\* recommended/);
  assert.match(renderAdvisory({ action: "advise-only", reason: "r" }, "bravo", { level: "warning", tokens: 2000 }), /advise-only/);
  // no token measurement -> honest "(no measurement)" rather than a fake number
  assert.match(renderAdvisory({ action: "compact", reason: "r" }, "bravo", { level: "x", tokens: 0 }), /\(no measurement\)/);
});
