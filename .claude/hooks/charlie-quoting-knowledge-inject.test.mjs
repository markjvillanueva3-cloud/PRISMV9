/**
 * Tests for charlie-quoting-knowledge-inject.mjs — charlie-gate + tokenize + keyword retrieval.
 * Real-value assertions + adversarial inputs. Run: node --test .claude/hooks/charlie-quoting-knowledge-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCharlieSession, tokenize, matchEntries } from "./charlie-quoting-knowledge-inject.mjs";

const SID = "e75608b8-bc3f-46c7-914d-bf132701e6f7";
const slots = (cid) => JSON.stringify({ slots: { charlie: cid == null ? {} : { chatId: cid }, mike: { chatId: "claude-deadbeef" } } });

const INDEX = {
  entries: [
    { id: "a", title: "Conservative customer match", summary: "anchor on segments", keywords: ["customer", "filter", "quote"], path: "wiki/a.md", source: "wiki" },
    { id: "b", title: "Data ceiling", summary: "docustrata inbound only", keywords: ["docustrata", "cost", "mape"], path: "mem/b.md", source: "memory" },
    { id: "c", title: "Drift freshness", summary: "pre-flight bootstrap", keywords: ["drift", "calibration"], path: "fb/c.md", source: "feedback" },
  ],
};

test("isCharlieSession: TRUE only when charlie.chatId matches; fail-closed otherwise", () => {
  assert.equal(isCharlieSession(SID, slots("claude-e75608b8")), true);
  assert.equal(isCharlieSession(SID, slots(SID)), true);
  assert.equal(isCharlieSession(SID, slots("claude-deadbeef")), false);
  assert.equal(isCharlieSession(SID, slots(null)), false);
  assert.equal(isCharlieSession(SID, "{bad json"), false);
  assert.equal(isCharlieSession("", slots("claude-")), false);
  assert.equal(isCharlieSession(null, slots("x")), false);
});

test("tokenize: lowercase words len>=4, deduped; defensive", () => {
  assert.deepEqual(tokenize("Quote the DocuStrata margin").sort(), ["docustrata", "margin", "quote"]);
  assert.deepEqual(tokenize("a in to of"), [], "short stopwords dropped");
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize(42), []);
});

test("matchEntries: keyword overlap → top-K, ranked", () => {
  assert.deepEqual(matchEntries(["docustrata", "revenue"], INDEX, 3).map((e) => e.id), ["b"]);
  assert.deepEqual(matchEntries(["quote", "drift"], INDEX, 3).map((e) => e.id).sort(), ["a", "c"]);
  // top-K cap
  assert.equal(matchEntries(["quote", "docustrata", "drift"], INDEX, 1).length, 1);
});

test("matchEntries: title-token bonus surfaces a title match even w/o keyword", () => {
  const hits = matchEntries(["ceiling"], INDEX, 3).map((e) => e.id);
  assert.deepEqual(hits, ["b"], "'ceiling' matches the 'Data ceiling' title");
});

test("matchEntries: no overlap → empty (the 'silent unless needed' path)", () => {
  assert.deepEqual(matchEntries(["unrelated", "topic"], INDEX, 3), []);
});

test("matchEntries: defensive on null/empty/non-array", () => {
  assert.deepEqual(matchEntries(null, INDEX), []);
  assert.deepEqual(matchEntries(["quote"], null), []);
  assert.deepEqual(matchEntries(["quote"], { entries: 42 }), []);
  assert.deepEqual(matchEntries([], INDEX), []);
});
