#!/usr/bin/env node
/**
 * Tests for agent-watchdog.mjs — pure-function units.
 * Run: node --test .claude/hooks/agent-watchdog.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

const { detectStalledAgents, shouldAlert, renderAlertContext } =
  await import("./agent-watchdog.mjs");

// ---------- detectStalledAgents ----------

test("detectStalledAgents returns [] on null/undefined input", () => {
  assert.deepEqual(detectStalledAgents(null), []);
  assert.deepEqual(detectStalledAgents(undefined), []);
  assert.deepEqual(detectStalledAgents("not-an-object"), []);
});

test("detectStalledAgents returns [] when no slots are populated", () => {
  assert.deepEqual(detectStalledAgents({}), []);
});

test("detectStalledAgents ignores empty / idle slots (no chatId)", () => {
  const slots = {
    alpha: {},
    bravo: { chatId: null, lastHeartbeat: "2026-05-15T00:00:00.000Z" },
    charlie: { chatId: "claude-x", lastHeartbeat: null },
  };
  assert.deepEqual(detectStalledAgents(slots, Date.now(), 10), []);
});

test("detectStalledAgents flags slots with heartbeat older than threshold", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const slots = {
    alpha: { chatId: "claude-a", lastHeartbeat: "2026-05-15T11:30:00.000Z" }, // 30 min stale
    bravo: { chatId: "claude-b", lastHeartbeat: "2026-05-15T11:58:00.000Z" }, // 2 min stale (not stalled)
  };
  const stalls = detectStalledAgents(slots, now, 10);
  assert.equal(stalls.length, 1);
  assert.equal(stalls[0].chatId, "claude-a");
  assert.equal(stalls[0].slot, "alpha");
  assert.equal(stalls[0].ageMin, 30);
});

test("detectStalledAgents preserves topic + activity metadata", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const slots = {
    delta: {
      chatId: "claude-d", lastHeartbeat: "2026-05-15T11:00:00.000Z",
      branch: "work/x", topic: "x-topic", activity: "build",
    },
  };
  const stalls = detectStalledAgents(slots, now, 10);
  assert.equal(stalls.length, 1);
  assert.equal(stalls[0].branch, "work/x");
  assert.equal(stalls[0].topic, "x-topic");
  assert.equal(stalls[0].activity, "build");
});

test("detectStalledAgents respects custom stallMinMin", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const slots = {
    alpha: { chatId: "claude-a", lastHeartbeat: "2026-05-15T11:55:00.000Z" }, // 5 min
  };
  // 10-min threshold → not stalled
  assert.deepEqual(detectStalledAgents(slots, now, 10), []);
  // 2-min threshold → stalled
  assert.equal(detectStalledAgents(slots, now, 2).length, 1);
});

test("detectStalledAgents tolerates unparseable lastHeartbeat", () => {
  const slots = { alpha: { chatId: "claude-a", lastHeartbeat: "not-a-date" } };
  assert.deepEqual(detectStalledAgents(slots, Date.now(), 10), []);
});

// ---------- shouldAlert ----------

test("shouldAlert returns false for empty / null chatId", () => {
  assert.equal(shouldAlert("", []), false);
  assert.equal(shouldAlert(null, []), false);
});

test("shouldAlert returns true when no prior alerts", () => {
  assert.equal(shouldAlert("claude-a", []), true);
});

test("shouldAlert returns false within cooldown window", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const alerts = [{ chatId: "claude-a", alertedAt: "2026-05-15T11:50:00.000Z" }]; // 10 min ago
  assert.equal(shouldAlert("claude-a", alerts, now, 3600), false);
});

test("shouldAlert returns true past cooldown window", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const alerts = [{ chatId: "claude-a", alertedAt: "2026-05-15T10:00:00.000Z" }]; // 2 hr ago
  assert.equal(shouldAlert("claude-a", alerts, now, 3600), true);
});

test("shouldAlert is per-agent (different chatId resets cooldown)", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const alerts = [{ chatId: "claude-a", alertedAt: "2026-05-15T11:55:00.000Z" }];
  assert.equal(shouldAlert("claude-b", alerts, now, 3600), true);
});

test("shouldAlert tolerates malformed alert records", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const alerts = [
    null,
    { chatId: "claude-a" },                              // no alertedAt
    { chatId: "claude-a", alertedAt: "garbage" },        // unparseable
  ];
  assert.equal(shouldAlert("claude-a", alerts, now, 3600), true);
});

// ---------- renderAlertContext ----------

test("renderAlertContext returns empty for null / empty input", () => {
  assert.equal(renderAlertContext(null), "");
  assert.equal(renderAlertContext([]), "");
});

test("renderAlertContext surfaces stall count + per-agent line", () => {
  const stalls = [
    { slot: "alpha", chatId: "claude-a", ageMin: 30, topic: "x", activity: "build" },
    { slot: "bravo", chatId: "claude-b", ageMin: 15, topic: null, activity: null },
  ];
  const out = renderAlertContext(stalls);
  assert.ok(out.includes("2 stalled"));
  assert.ok(out.includes("[alpha] claude-a"));
  assert.ok(out.includes("30 min"));
  assert.ok(out.includes("[bravo] claude-b"));
  assert.ok(out.includes("/reap-zombies"));
});

test("renderAlertContext handles single stall", () => {
  const stalls = [{ slot: "delta", chatId: "claude-d", ageMin: 12, topic: "y", activity: "test" }];
  const out = renderAlertContext(stalls);
  assert.ok(out.includes("1 stalled"));
  assert.ok(out.includes("[delta] claude-d stalled 12 min"));
});
