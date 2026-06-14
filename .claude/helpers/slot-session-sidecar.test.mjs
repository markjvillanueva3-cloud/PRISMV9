#!/usr/bin/env node
/**
 * slot-session-sidecar.test.mjs — tests for the .mjs writer-side helper
 *
 * SLOT-RECOVERY-MS0/U-SR02..U-SR04 tests (2026-05-25, slot:golf)
 * Run: node --test .claude/helpers/slot-session-sidecar.test.mjs
 *
 * Verifies the writer-side helper produces JSONL that matches the schema
 * the TS engine (SlotSessionHistoryEngine) reads. Both sides MUST agree on
 * the wire format — this test is the writer-side half of the contract.
 *
 * Discipline: every assertion checks a specific value from real behavior.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Override the base dir BEFORE import so the helper picks it up.
const tmpBase = mkdtempSync(join(tmpdir(), "slot-session-helper-test-"));
process.env.PRISM_SLOT_SESSION_BASE_DIR = tmpBase;

const helper = await import("./slot-session-sidecar.mjs");
const {
  recordSessionStart,
  recordHeartbeat,
  recordSessionEnd,
  readAll,
  isDisabled,
  resolveSlotForChatId,
  resolveTranscriptPath,
  SCHEMA_VERSION,
} = helper;

function cleanSlotFile(slot) {
  const f = join(tmpBase, `${slot}.jsonl`);
  if (existsSync(f)) rmSync(f);
}

test("SCHEMA_VERSION is 1.0.0", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

test("isDisabled returns true only when env knob is exactly '1'", () => {
  delete process.env.PRISM_SLOT_SESSION_SIDECAR_DISABLE;
  assert.equal(isDisabled(), false);
  process.env.PRISM_SLOT_SESSION_SIDECAR_DISABLE = "0";
  assert.equal(isDisabled(), false);
  process.env.PRISM_SLOT_SESSION_SIDECAR_DISABLE = "1";
  assert.equal(isDisabled(), true);
  delete process.env.PRISM_SLOT_SESSION_SIDECAR_DISABLE;
});

test("recordSessionStart persists every input field with schemaVersion stamped", () => {
  cleanSlotFile("alpha");
  const r = recordSessionStart({
    slot: "alpha",
    sessionId: "sid-1",
    chatId: "claude-abc",
    terminalWindowId: "tw-wt-x",
    branch: "slot/alpha",
    topic: "alpha-work",
    directive: "ship U-SR02",
    transcriptPath: "/tmp/sid-1.jsonl",
  });
  assert.equal(r.ok, true);
  assert.equal(r.crashInferred, false);

  const raw = readFileSync(join(tmpBase, "alpha.jsonl"), "utf-8");
  const parsed = JSON.parse(raw.trim());
  assert.equal(parsed.eventType, "session-start");
  assert.equal(parsed.sessionId, "sid-1");
  assert.equal(parsed.chatId, "claude-abc");
  assert.equal(parsed.terminalWindowId, "tw-wt-x");
  assert.equal(parsed.branch, "slot/alpha");
  assert.equal(parsed.topic, "alpha-work");
  assert.equal(parsed.directive, "ship U-SR02");
  assert.equal(parsed.transcriptPath, "/tmp/sid-1.jsonl");
  assert.equal(parsed.schemaVersion, "1.0.0");
});

test("recordSessionStart rejects unknown slot with specific error", () => {
  const r = recordSessionStart({ slot: "bogus", sessionId: "s", chatId: "c" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "unknown slot: bogus");
});

test("recordSessionStart rejects empty sessionId", () => {
  const r = recordSessionStart({ slot: "alpha", sessionId: "", chatId: "c" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "sessionId required");
});

test("recordSessionStart rejects empty chatId", () => {
  const r = recordSessionStart({ slot: "alpha", sessionId: "s", chatId: "" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "chatId required");
});

test("recordHeartbeat persists every loop-state field with exitState=running", () => {
  cleanSlotFile("bravo");
  recordSessionStart({ slot: "bravo", sessionId: "sid-2", chatId: "c" });
  const r = recordHeartbeat({
    slot: "bravo",
    sessionId: "sid-2",
    directive: "d",
    currentGoal: "g",
    transcriptSizeBytes: 100,
    transcriptMtimeMs: 1234567890,
    loopIter: 2,
    loopTarget: 10,
  });
  assert.equal(r.ok, true);

  const lines = readFileSync(join(tmpBase, "bravo.jsonl"), "utf-8")
    .split("\n").filter((l) => l.length > 0);
  assert.equal(lines.length, 2);
  const beat = JSON.parse(lines[1]);
  assert.equal(beat.eventType, "heartbeat");
  assert.equal(beat.exitState, "running");
  assert.equal(beat.directive, "d");
  assert.equal(beat.currentGoal, "g");
  assert.equal(beat.transcriptSizeBytes, 100);
  assert.equal(beat.transcriptMtimeMs, 1234567890);
  assert.equal(beat.loopIter, 2);
  assert.equal(beat.loopTarget, 10);
});

test("recordSessionEnd accepts all 4 valid exitStates", () => {
  for (const exitState of ["clean", "precompact", "stop", "crash-inferred"]) {
    cleanSlotFile("charlie");
    recordSessionStart({ slot: "charlie", sessionId: `sid-${exitState}`, chatId: "c" });
    const r = recordSessionEnd({ slot: "charlie", sessionId: `sid-${exitState}`, exitState });
    assert.equal(r.ok, true);
    const entries = readAll("charlie");
    assert.equal(entries[entries.length - 1].exitState, exitState);
  }
});

test("recordSessionEnd truncates finalResume to exactly 500 chars", () => {
  cleanSlotFile("delta");
  recordSessionStart({ slot: "delta", sessionId: "sid-trunc", chatId: "c" });
  recordSessionEnd({
    slot: "delta",
    sessionId: "sid-trunc",
    exitState: "stop",
    finalResume: "z".repeat(2000),
  });
  const entries = readAll("delta");
  const end = entries[entries.length - 1];
  assert.equal(end.finalResume.length, 500);
  assert.equal(end.finalResume, "z".repeat(500));
});

test("recordSessionEnd rejects invalid exitState", () => {
  const r = recordSessionEnd({ slot: "alpha", sessionId: "s", exitState: "weird" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid exitState: weird");
});

test("crash-inferred: heartbeat tail then new session-start synthesizes a close for the prior session", () => {
  cleanSlotFile("echo");
  recordSessionStart({ slot: "echo", sessionId: "sid-A", chatId: "claude-A" });
  recordHeartbeat({
    slot: "echo",
    sessionId: "sid-A",
    directive: "Building X",
    loopIter: 3,
    loopTarget: 10,
    transcriptSizeBytes: 555,
  });
  const r = recordSessionStart({ slot: "echo", sessionId: "sid-B", chatId: "claude-B" });
  assert.equal(r.ok, true);
  assert.equal(r.crashInferred, true);

  const entries = readAll("echo");
  assert.equal(entries.length, 4);
  assert.equal(entries[2].eventType, "session-end");
  assert.equal(entries[2].exitState, "crash-inferred");
  assert.equal(entries[2].sessionId, "sid-A");
  assert.equal(entries[2].directive, "Building X");
  assert.equal(entries[2].loopIter, 3);
  assert.equal(entries[2].loopTarget, 10);
  assert.equal(entries[2].transcriptSizeBytes, 555);
});

test("crash-inferred: clean session-end tail then new session-start does NOT synthesize a close", () => {
  cleanSlotFile("foxtrot");
  recordSessionStart({ slot: "foxtrot", sessionId: "sid-A", chatId: "claude-A" });
  recordSessionEnd({ slot: "foxtrot", sessionId: "sid-A", exitState: "clean" });
  const r = recordSessionStart({ slot: "foxtrot", sessionId: "sid-B", chatId: "claude-B" });
  assert.equal(r.ok, true);
  assert.equal(r.crashInferred, false);
  const entries = readAll("foxtrot");
  assert.equal(entries.length, 3);
  assert.equal(entries[0].eventType, "session-start");
  assert.equal(entries[1].eventType, "session-end");
  assert.equal(entries[2].eventType, "session-start");
});

test("crash-inferred: duplicate session-start with SAME sessionId does NOT fire crash-inferred", () => {
  cleanSlotFile("golf");
  recordSessionStart({ slot: "golf", sessionId: "sid-dup", chatId: "c" });
  const r = recordSessionStart({ slot: "golf", sessionId: "sid-dup", chatId: "c" });
  assert.equal(r.ok, true);
  assert.equal(r.crashInferred, false);
  const entries = readAll("golf");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].eventType, "session-start");
  assert.equal(entries[1].eventType, "session-start");
});

test("readAll filters corrupt lines and entries with wrong slot field", () => {
  cleanSlotFile("hotel");
  recordSessionStart({ slot: "hotel", sessionId: "sid-good", chatId: "c" });
  const file = join(tmpBase, "hotel.jsonl");
  appendFileSync(file, "this is not json\n");
  appendFileSync(file, JSON.stringify({
    schemaVersion: "1.0.0",
    eventType: "heartbeat",
    ts: new Date().toISOString(),
    slot: "not-a-slot",
    sessionId: "sid-wrong",
    exitState: "running",
  }) + "\n");
  const entries = readAll("hotel");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sessionId, "sid-good");
});

test("readAll returns [] for unknown slot name", () => {
  assert.deepEqual(readAll("imaginaryslot"), []);
});

test("retention prunes after over-limit appends", () => {
  process.env.PRISM_SLOT_SESSION_RETENTION = "5";
  cleanSlotFile("india");
  for (let i = 0; i < 12; i++) {
    recordHeartbeat({ slot: "india", sessionId: `sid-${i}` });
  }
  const entries = readAll("india");
  assert.equal(entries.length, 5);
  assert.equal(entries[0].sessionId, "sid-7");
  assert.equal(entries[4].sessionId, "sid-11");
  delete process.env.PRISM_SLOT_SESSION_RETENTION;
});

test("resolveSlotForChatId returns the slot name when chat-slots.json maps it", () => {
  const csPath = join(tmpBase, "chat-slots-test.json");
  writeFileSync(csPath, JSON.stringify({
    schemaVersion: 2,
    slots: {
      alpha: { chatId: "claude-aaa", lastHeartbeat: new Date().toISOString() },
      bravo: { chatId: "claude-bbb", lastHeartbeat: new Date().toISOString() },
      golf: null,
    },
  }));
  assert.equal(resolveSlotForChatId("claude-aaa", csPath), "alpha");
  assert.equal(resolveSlotForChatId("claude-bbb", csPath), "bravo");
  assert.equal(resolveSlotForChatId("claude-zzz", csPath), null);
  assert.equal(resolveSlotForChatId("", csPath), null);
});

test("resolveSlotForChatId returns null when file is missing or malformed", () => {
  assert.equal(resolveSlotForChatId("claude-x", "/tmp/does/not/exist"), null);
  const badPath = join(tmpBase, "bad-slots.json");
  writeFileSync(badPath, "not json {");
  assert.equal(resolveSlotForChatId("claude-x", badPath), null);
});

test("resolveTranscriptPath builds the H--prism projects path from session-id", () => {
  const p = resolveTranscriptPath("abc12345-uuid");
  assert.ok(p);
  assert.ok(p.includes(".claude/projects/H--prism/"));
  assert.ok(p.endsWith("/abc12345-uuid.jsonl"));
});

test("resolveTranscriptPath returns null on empty input", () => {
  assert.equal(resolveTranscriptPath(""), null);
  assert.equal(resolveTranscriptPath(null), null);
});

// Cleanup
test("cleanup tmp dir", () => {
  try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* gc */ }
  delete process.env.PRISM_SLOT_SESSION_BASE_DIR;
});
