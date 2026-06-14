#!/usr/bin/env node
// Tests for stop-hook-aggregator-lib.mjs — node:test, hermetic.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldThrottle,
  buildLedgerEntry,
  serializeLedgerLine,
  parseGitStatusPorcelainZ,
  parseCommitsLastHour,
  readLastEntryAtMs,
  __test_constants,
} from "./stop-hook-aggregator-lib.mjs";

const NOW = Date.parse("2026-05-20T08:00:00Z");

// ---- shouldThrottle ----------------------------------------------------

test("shouldThrottle: returns false when no sessionId", () => {
  assert.equal(shouldThrottle({ sessionId: null, lastEntryAtMs: NOW - 1000, nowMs: NOW, throttleMs: 60000 }), false);
});

test("shouldThrottle: returns false when lastEntryAtMs is NaN", () => {
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NaN, nowMs: NOW, throttleMs: 60000 }), false);
});

test("shouldThrottle: returns false when nowMs is NaN", () => {
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 1000, nowMs: NaN, throttleMs: 60000 }), false);
});

test("shouldThrottle: returns true when within throttle window", () => {
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 5000, nowMs: NOW, throttleMs: 60000 }), true);
});

test("shouldThrottle: returns false when outside throttle window", () => {
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 70_000, nowMs: NOW, throttleMs: 60000 }), false);
});

test("shouldThrottle: future lastEntryAtMs (clock skew) is treated as stale", () => {
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW + 5000, nowMs: NOW, throttleMs: 60000 }), false);
});

test("shouldThrottle: negative throttleMs clamps to default", () => {
  // default is 60_000, so 10s elapsed should still throttle
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 10_000, nowMs: NOW, throttleMs: -1 }), true);
});

test("shouldThrottle: throttleMs below floor clamps to MIN_THROTTLE_MS", () => {
  // MIN is 1000ms; 500ms elapsed should throttle
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 500, nowMs: NOW, throttleMs: 100 }), true);
});

test("shouldThrottle: throttleMs above ceiling clamps to MAX_THROTTLE_MS", () => {
  const MAX = __test_constants.MAX_THROTTLE_MS;
  // 1ms elapsed under max → throttle. Well past max → no throttle.
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - 1, nowMs: NOW, throttleMs: MAX * 10 }), true);
  assert.equal(shouldThrottle({ sessionId: "s1", lastEntryAtMs: NOW - MAX - 1, nowMs: NOW, throttleMs: MAX * 10 }), false);
});

// ---- buildLedgerEntry --------------------------------------------------

test("buildLedgerEntry: returns valid v=1 entry with full inputs", () => {
  const entry = buildLedgerEntry({
    stopEvent: { session_id: "abc123", transcript_path: "/tmp/t.jsonl", cwd: "H:/prism", stop_hook_active: false },
    slotInfo: { slot: "echo", chatId: "claude-4278393c", branch: "main", topic: "echo-work" },
    gitStatus: { dirtyCount: 5, stagedCount: 2, untrackedCount: 1, commitsLastHour: 3 },
    nowMs: NOW,
  });
  assert.equal(entry.v, 1);
  assert.equal(entry.ts, "2026-05-20T08:00:00.000Z");
  assert.equal(entry.sessionId, "abc123");
  assert.equal(entry.slot, "echo");
  assert.equal(entry.chatId, "claude-4278393c");
  assert.equal(entry.branch, "main");
  assert.equal(entry.topic, "echo-work");
  assert.equal(entry.cwd, "H:/prism");
  assert.equal(entry.transcriptPath, "/tmp/t.jsonl");
  assert.equal(entry.stopHookActive, false);
  assert.deepEqual(entry.git, { dirtyCount: 5, stagedCount: 2, untrackedCount: 1, commitsLastHour: 3 });
});

test("buildLedgerEntry: null-safe with missing inputs", () => {
  const entry = buildLedgerEntry({});
  assert.equal(entry.v, 1);
  assert.equal(entry.sessionId, null);
  assert.equal(entry.slot, null);
  assert.equal(entry.chatId, null);
  assert.equal(entry.branch, null);
  assert.equal(entry.topic, null);
  assert.equal(entry.stopHookActive, false);
  assert.deepEqual(entry.git, { dirtyCount: 0, stagedCount: 0, untrackedCount: 0, commitsLastHour: 0 });
});

test("buildLedgerEntry: stop_hook_active flag is honored", () => {
  const entry = buildLedgerEntry({ stopEvent: { stop_hook_active: true } });
  assert.equal(entry.stopHookActive, true);
});

test("buildLedgerEntry: strips control chars from string fields", () => {
  const dirty = "echo\x00\x07-work\x1f";
  const entry = buildLedgerEntry({ slotInfo: { topic: dirty } });
  assert.equal(entry.topic, "echo-work");
});

test("buildLedgerEntry: truncates over-length fields", () => {
  const long = "x".repeat(500);
  const entry = buildLedgerEntry({
    slotInfo: { branch: long, topic: long },
    stopEvent: { cwd: long, transcript_path: long },
  });
  // branch max 96
  assert.equal(entry.branch.length, 96);
  assert.equal(entry.topic.length, 64);
  assert.equal(entry.cwd.length, 256);
  assert.equal(entry.transcriptPath.length, 256);
});

test("buildLedgerEntry: rejects non-finite + negative gitStatus counts", () => {
  const entry = buildLedgerEntry({ gitStatus: { dirtyCount: -3, stagedCount: NaN, untrackedCount: Infinity, commitsLastHour: 1.7 } });
  assert.deepEqual(entry.git, { dirtyCount: 0, stagedCount: 0, untrackedCount: 0, commitsLastHour: 1 });
});

test("buildLedgerEntry: empty-string fields normalize to null", () => {
  const entry = buildLedgerEntry({
    stopEvent: { session_id: "", cwd: "   " },
    slotInfo: { slot: "", branch: "" },
  });
  assert.equal(entry.sessionId, null);
  assert.equal(entry.cwd, null);
  assert.equal(entry.slot, null);
  assert.equal(entry.branch, null);
});

test("buildLedgerEntry: ts falls back to Date.now when nowMs missing", () => {
  const before = Date.now();
  const entry = buildLedgerEntry({});
  const after = Date.now();
  const t = Date.parse(entry.ts);
  assert.ok(t >= before && t <= after, `ts ${t} not in [${before}, ${after}]`);
});

// ---- serializeLedgerLine -----------------------------------------------

test("serializeLedgerLine: emits newline-terminated JSON", () => {
  const entry = buildLedgerEntry({ stopEvent: { session_id: "s1" }, nowMs: NOW });
  const line = serializeLedgerLine(entry);
  assert.ok(line.endsWith("\n"));
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.sessionId, "s1");
});

test("serializeLedgerLine: throws when result > 8KB", () => {
  const huge = { v: 1, blob: "x".repeat(10000) };
  assert.throws(() => serializeLedgerLine(huge), /too large/);
});

test("serializeLedgerLine: throws on embedded newline", () => {
  // Build a payload that JSON.stringify can't escape away (impossible with valid
  // strings) — instead inject a raw \n via a Symbol-keyed toJSON-style trick.
  // Easiest: pass a pre-built bad string via a custom toJSON returning a
  // newline-bearing literal (JSON.stringify escapes \n; we have to trip the
  // post-stringify guard another way). Skip with a manually crafted input.
  const bad = { __proto__: null, fake: "x" };
  Object.defineProperty(bad, "toJSON", { value: () => "\"a\\nb\"" });
  // toJSON returning a string that *parses* to itself bypasses the escape,
  // but JSON.stringify will re-quote the result. We can't easily construct
  // a passing input — verify the indexOf path defensively via a direct call
  // shape: pass a circular ref to trigger throw (alt assertion).
  // Instead, prove the guard exists by feeding a value that JSON.stringify
  // serializes to a literal containing newline-equivalent — use a getter on
  // a custom valueOf to force JSON to render a raw string we control.
  // Realistically the post-stringify guard is defensive; we assert it via
  // direct invocation of the serializer with a hand-crafted JSON string by
  // monkey-patching JSON.stringify temporarily.
  const origStringify = JSON.stringify;
  JSON.stringify = () => "ab\ncd";
  try {
    assert.throws(() => serializeLedgerLine({}), /newline/);
  } finally {
    JSON.stringify = origStringify;
  }
});

// ---- parseGitStatusPorcelainZ ------------------------------------------

test("parseGitStatusPorcelainZ: empty input returns zeros", () => {
  assert.deepEqual(parseGitStatusPorcelainZ(""), { dirtyCount: 0, stagedCount: 0, untrackedCount: 0 });
  assert.deepEqual(parseGitStatusPorcelainZ(null), { dirtyCount: 0, stagedCount: 0, untrackedCount: 0 });
});

test("parseGitStatusPorcelainZ: counts untracked", () => {
  const z = "?? file1.txt\x00?? file2.md\x00";
  const r = parseGitStatusPorcelainZ(z);
  assert.equal(r.untrackedCount, 2);
  assert.equal(r.dirtyCount, 2);
  assert.equal(r.stagedCount, 0);
});

test("parseGitStatusPorcelainZ: counts staged-only", () => {
  const z = "A  added.ts\x00M  modified.md\x00";
  const r = parseGitStatusPorcelainZ(z);
  assert.equal(r.stagedCount, 2);
  // Staged-but-clean-worktree files still count as session activity per impl.
  assert.equal(r.untrackedCount, 0);
});

test("parseGitStatusPorcelainZ: counts unstaged modifications", () => {
  const z = " M edited.ts\x00 D deleted.md\x00";
  const r = parseGitStatusPorcelainZ(z);
  assert.equal(r.stagedCount, 0);
  assert.equal(r.dirtyCount, 2);
});

test("parseGitStatusPorcelainZ: mixed staged + unstaged + untracked", () => {
  const z = "M  staged.ts\x00 M edited.md\x00?? new.json\x00";
  const r = parseGitStatusPorcelainZ(z);
  assert.equal(r.stagedCount, 1);
  assert.equal(r.untrackedCount, 1);
  assert.ok(r.dirtyCount >= 3);
});

test("parseGitStatusPorcelainZ: ignores too-short records", () => {
  const z = "X\x00\x00 M valid.ts\x00";
  const r = parseGitStatusPorcelainZ(z);
  assert.equal(r.dirtyCount, 1);
});

// ---- parseCommitsLastHour ----------------------------------------------

test("parseCommitsLastHour: empty input returns 0", () => {
  assert.equal(parseCommitsLastHour("", NOW), 0);
  assert.equal(parseCommitsLastHour(null, NOW), 0);
});

test("parseCommitsLastHour: counts only commits within last hour", () => {
  const nowSec = Math.floor(NOW / 1000);
  const within = nowSec - 100;
  const outside = nowSec - 4000;
  const stdout = `${within}\n${within - 200}\n${outside}\n`;
  assert.equal(parseCommitsLastHour(stdout, NOW), 2);
});

test("parseCommitsLastHour: skips garbage lines", () => {
  const nowSec = Math.floor(NOW / 1000);
  const stdout = `garbage\n${nowSec - 100}\n\nfoo\n${nowSec - 500}\n`;
  assert.equal(parseCommitsLastHour(stdout, NOW), 2);
});

test("parseCommitsLastHour: nowMs falls back to Date.now", () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const stdout = `${nowSec - 60}\n`;
  // Should count it as within last hour
  assert.equal(parseCommitsLastHour(stdout), 1);
});

// ---- readLastEntryAtMs -------------------------------------------------

test("readLastEntryAtMs: returns NaN on empty input", () => {
  assert.ok(Number.isNaN(readLastEntryAtMs("", "s1")));
  assert.ok(Number.isNaN(readLastEntryAtMs(null, "s1")));
});

test("readLastEntryAtMs: returns NaN without sessionId", () => {
  const j = JSON.stringify({ sessionId: "s1", ts: "2026-05-20T08:00:00Z" }) + "\n";
  assert.ok(Number.isNaN(readLastEntryAtMs(j, null)));
});

test("readLastEntryAtMs: finds matching session entry", () => {
  const lines = [
    JSON.stringify({ sessionId: "other", ts: "2026-05-20T07:00:00Z" }),
    JSON.stringify({ sessionId: "s1", ts: "2026-05-20T07:30:00Z" }),
    JSON.stringify({ sessionId: "other2", ts: "2026-05-20T08:00:00Z" }),
  ].join("\n") + "\n";
  const t = readLastEntryAtMs(lines, "s1");
  assert.equal(t, Date.parse("2026-05-20T07:30:00Z"));
});

test("readLastEntryAtMs: returns newest matching when multiple exist", () => {
  const lines = [
    JSON.stringify({ sessionId: "s1", ts: "2026-05-20T07:00:00Z" }),
    JSON.stringify({ sessionId: "s1", ts: "2026-05-20T07:30:00Z" }),
  ].join("\n") + "\n";
  const t = readLastEntryAtMs(lines, "s1");
  assert.equal(t, Date.parse("2026-05-20T07:30:00Z"));
});

test("readLastEntryAtMs: skips corrupt lines without throwing", () => {
  const lines = [
    "not-json",
    "{partial",
    JSON.stringify({ sessionId: "s1", ts: "2026-05-20T08:00:00Z" }),
  ].join("\n") + "\n";
  const t = readLastEntryAtMs(lines, "s1");
  assert.equal(t, Date.parse("2026-05-20T08:00:00Z"));
});

test("readLastEntryAtMs: returns NaN when no matching session", () => {
  const lines = JSON.stringify({ sessionId: "other", ts: "2026-05-20T08:00:00Z" }) + "\n";
  assert.ok(Number.isNaN(readLastEntryAtMs(lines, "s1")));
});

test("readLastEntryAtMs: returns NaN on invalid ts string", () => {
  const lines = JSON.stringify({ sessionId: "s1", ts: "not-a-date" }) + "\n";
  assert.ok(Number.isNaN(readLastEntryAtMs(lines, "s1")));
});
