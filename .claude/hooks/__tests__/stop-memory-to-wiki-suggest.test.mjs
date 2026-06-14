// Tests for the per-session, per-MEMO dedup in stop-memory-to-wiki-suggest.mjs.
// The advisor fires every Stop; under a bulk mtime-touch the newest-N memo slice
// churns, so dedup is per memo NAME (each promotion shown once/session, capped).
// These assert the invariants that bound the token waste (R9 — each fails if the
// dedup logic regresses).
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterUnseenSuggestions } from "../stop-memory-to-wiki-suggest.mjs";

const sug = (...names) => names.map((n) => ({ memoryName: n, nearestWiki: [{ title: "w", score: 0.9 }] }));

test("filterUnseenSuggestions: all unseen → all emitted, recorded in newSeen", () => {
  const { toEmit, newSeen, capped } = filterUnseenSuggestions(sug("a", "b", "c"), []);
  assert.deepEqual(toEmit.map((s) => s.memoryName), ["a", "b", "c"]);
  assert.deepEqual(newSeen.sort(), ["a", "b", "c"]);
  assert.equal(capped, false);
});

test("filterUnseenSuggestions: already-seen memos are filtered out", () => {
  const { toEmit, newSeen } = filterUnseenSuggestions(sug("a", "b"), ["a"]);
  assert.deepEqual(toEmit.map((s) => s.memoryName), ["b"], "a suppressed, b emitted");
  assert.deepEqual(newSeen.sort(), ["a", "b"]);
});

test("filterUnseenSuggestions: all-seen → empty emit (idle Stop stays silent)", () => {
  const { toEmit } = filterUnseenSuggestions(sug("a", "b"), ["a", "b"]);
  assert.equal(toEmit.length, 0);
});

test("filterUnseenSuggestions: robust to slice CHURN — same memo, different position, still deduped", () => {
  // The real bug: the newest-N slice returns a churning subset; a memo seen in
  // one Stop must not re-emit when it reappears (reordered) in a later Stop.
  const { toEmit } = filterUnseenSuggestions(sug("b", "a"), ["a"]);
  assert.deepEqual(toEmit.map((s) => s.memoryName), ["b"], "a stays suppressed despite new position");
});

test("filterUnseenSuggestions: a genuinely NEW memo emits even after many seen", () => {
  const seen = Array.from({ length: 25 }, (_, i) => `m${i}`);
  const { toEmit } = filterUnseenSuggestions(sug("m5", "BRAND-NEW"), seen);
  assert.deepEqual(toEmit.map((s) => s.memoryName), ["BRAND-NEW"], "m5 seen, BRAND-NEW surfaces");
});

test("filterUnseenSuggestions: session cap bounds the per-fire emit to remaining budget", () => {
  const { toEmit, newSeen } = filterUnseenSuggestions(sug("a", "b", "c", "d"), ["x"], 3);
  assert.deepEqual(toEmit.map((s) => s.memoryName), ["a", "b"], "budget 3-1=2 → only 2 emitted");
  assert.equal(newSeen.length, 3);
});

test("filterUnseenSuggestions: cap reached → silent (the bulk-touch bound)", () => {
  const { toEmit, capped } = filterUnseenSuggestions(sug("a", "b"), ["x", "y", "z"], 3);
  assert.equal(toEmit.length, 0);
  assert.equal(capped, true, "session budget exhausted → no more emits this session");
});

test("filterUnseenSuggestions: malformed / empty inputs are safe", () => {
  assert.equal(filterUnseenSuggestions([], []).toEmit.length, 0);
  assert.equal(filterUnseenSuggestions(null, null).toEmit.length, 0);
  // a suggestion with no memoryName is skipped, not crashed on
  assert.equal(filterUnseenSuggestions([{ nearestWiki: [] }], []).toEmit.length, 0);
});
