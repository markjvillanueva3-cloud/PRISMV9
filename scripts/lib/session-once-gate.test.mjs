// session-once-gate.test.mjs
// ----------------------------
// R9 tests for the reusable per-session fire-once sentinel. These pin the
// behaviour the gating consumers (pre-tool-savings-multi node nudge, future
// migrations of the mcp-route-suggest inline gates) depend on: fire once per
// (session,key), independent keys/sessions, window expiry, and FAIL-SOFT (never
// throw, absent session → disengaged so the nudge fires as before).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seenThisSession, markSeenThisSession, DEFAULT_WINDOW_MS } from "./session-once-gate.mjs";

function tmpRate() {
  const dir = mkdtempSync(join(tmpdir(), "session-once-"));
  return { rate: join(dir, "seen.json"), dir, clean: () => rmSync(dir, { recursive: true, force: true }) };
}

test("fresh (session,key) is NOT seen; after mark it IS seen (fire-once core)", () => {
  const { rate, clean } = tmpRate();
  try {
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), false, "fresh → not seen → nudge fires");
    markSeenThisSession(rate, "sid-1", "node-nudge");
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), true, "after mark → seen → nudge suppressed");
    assert.equal(existsSync(rate), true, "rate file persisted");
  } finally { clean(); }
});

test("distinct keys gate INDEPENDENTLY within one session", () => {
  const { rate, clean } = tmpRate();
  try {
    markSeenThisSession(rate, "sid-1", "node-nudge");
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), true, "marked key seen");
    assert.equal(seenThisSession(rate, "sid-1", "git-nudge"), false, "different key NOT consumed by the first");
  } finally { clean(); }
});

test("distinct sessions are independent (a fresh session re-fires)", () => {
  const { rate, clean } = tmpRate();
  try {
    markSeenThisSession(rate, "sid-A", "node-nudge");
    assert.equal(seenThisSession(rate, "sid-A", "node-nudge"), true, "session A seen");
    assert.equal(seenThisSession(rate, "sid-B", "node-nudge"), false, "session B (different session) re-fires");
  } finally { clean(); }
});

test("a mark older than the window is NOT seen (expiry → nudge re-fires)", () => {
  const { rate, clean } = tmpRate();
  try {
    // Write a stale timestamp directly (older than DEFAULT_WINDOW_MS).
    const stale = Date.now() - (DEFAULT_WINDOW_MS + 60_000);
    writeFileSync(rate, JSON.stringify({ "sid-1:node-nudge": stale }));
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), false, "expired mark → not seen");
    // A tighter custom window also expires a recent-but-outside mark.
    writeFileSync(rate, JSON.stringify({ "sid-1:node-nudge": Date.now() - 5000 }));
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge", 1000), false, "outside the 1s window → not seen");
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge", 60_000), true, "inside a 60s window → seen");
  } finally { clean(); }
});

test("empty sessionId or key → disengaged (false; nudge fires) and mark is a no-op", () => {
  const { rate, clean } = tmpRate();
  try {
    assert.equal(seenThisSession(rate, "", "node-nudge"), false, "empty session → disengaged");
    assert.equal(seenThisSession(rate, "sid-1", ""), false, "empty key → disengaged");
    markSeenThisSession(rate, "", "node-nudge"); // no-op
    markSeenThisSession(rate, "sid-1", "");       // no-op
    assert.equal(existsSync(rate), false, "no rate file written for empty inputs");
  } finally { clean(); }
});

test("FAIL-SOFT: unreadable/corrupt rate file → not seen, never throws", () => {
  const { rate, clean } = tmpRate();
  try {
    writeFileSync(rate, "{ this is : not json");
    assert.doesNotThrow(() => seenThisSession(rate, "sid-1", "node-nudge"));
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), false, "corrupt store → not seen (nudge fires)");
    // A subsequent mark recovers the store (overwrites the corrupt content).
    assert.doesNotThrow(() => markSeenThisSession(rate, "sid-1", "node-nudge"));
    assert.equal(seenThisSession(rate, "sid-1", "node-nudge"), true, "store recovered after mark");
  } finally { clean(); }
});

test("prune: marks older than 2×window are dropped on the next mark (bounded store)", () => {
  const { rate, clean } = tmpRate();
  try {
    const ancient = Date.now() - (3 * DEFAULT_WINDOW_MS);
    writeFileSync(rate, JSON.stringify({ "old-sid:k": ancient, "keep-sid:k": Date.now() }));
    markSeenThisSession(rate, "new-sid", "k"); // triggers prune of entries < now-2×window
    const state = JSON.parse(readFileSync(rate, "utf8"));
    assert.equal("old-sid:k" in state, false, "ancient entry pruned");
    assert.equal("keep-sid:k" in state, true, "recent entry kept");
    assert.equal("new-sid:k" in state, true, "new entry present");
  } finally { clean(); }
});
