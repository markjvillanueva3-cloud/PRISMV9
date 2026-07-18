/**
 * Tests for charlie-quoting-awareness-inject.mjs — the charlie-gate + headline extraction.
 * Real-value assertions + adversarial inputs (null/non-string/parse-error/wrong-slot).
 * Run: node --test .claude/hooks/charlie-quoting-awareness-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCharlieSession, extractHeadline } from "./charlie-quoting-awareness-inject.mjs";

const SID = "e75608b8-bc3f-46c7-914d-bf132701e6f7";
const slots = (charlieChatId) =>
  JSON.stringify({ slots: { charlie: charlieChatId == null ? {} : { chatId: charlieChatId }, mike: { chatId: "claude-deadbeef" } } });

test("isCharlieSession: TRUE only when charlie.chatId matches claude-<sid8>", () => {
  assert.equal(isCharlieSession(SID, slots("claude-e75608b8")), true, "short-id match");
  assert.equal(isCharlieSession(SID, slots(SID)), true, "full-uuid stored");
  assert.equal(isCharlieSession(SID, slots("claude-" + SID)), true, "claude-<full-uuid> stored");
});

test("isCharlieSession: FALSE (fail-closed) on wrong slot / unbound / bad input", () => {
  assert.equal(isCharlieSession(SID, slots("claude-deadbeef")), false, "charlie bound to another chat");
  assert.equal(isCharlieSession(SID, slots(null)), false, "charlie present but no chatId");
  assert.equal(isCharlieSession(SID, JSON.stringify({ slots: { mike: { chatId: "x" } } })), false, "no charlie slot");
  assert.equal(isCharlieSession(SID, "{not json"), false, "parse-error → fail-closed");
  assert.equal(isCharlieSession(SID, ""), false, "empty slots text");
  assert.equal(isCharlieSession("", slots("claude-")), false, "empty session id");
  assert.equal(isCharlieSession(null, slots("claude-e75608b8")), false, "null session id");
  assert.equal(isCharlieSession("short", slots("claude-short")), false, "session id < 8 chars");
});

test("extractHeadline: pulls the ## Headline block up to the next ## section", () => {
  const md = "# Title\n\n## Headline\n- line one\n- line two\n\n## Engine surface\n- not this";
  const h = extractHeadline(md);
  assert.ok(h.startsWith("## Headline"));
  assert.ok(h.includes("line one") && h.includes("line two"));
  assert.ok(!h.includes("not this"), "stops at the next ## section");
});

test("extractHeadline: last-section case (no trailing ##) returns to EOF", () => {
  const md = "# T\n## Headline\n- only block to EOF";
  assert.ok(extractHeadline(md).includes("only block to EOF"));
});

test("extractHeadline: defensive on non-string / no-header / empty", () => {
  assert.equal(extractHeadline(null), "");
  assert.equal(extractHeadline(undefined), "");
  assert.equal(extractHeadline(42), "");
  assert.equal(extractHeadline("no header anywhere"), "");
  assert.equal(extractHeadline(""), "");
});
