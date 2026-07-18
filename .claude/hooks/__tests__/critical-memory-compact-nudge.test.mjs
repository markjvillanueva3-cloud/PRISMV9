/**
 * critical-memory-compact-nudge.test.mjs — behavioral test suite for the
 * critical-pressure /compact actuator hook (.claude/hooks/critical-memory-
 * compact-nudge.mjs).
 *
 * Covers the four pure exported functions with real-value assertions. Every
 * test encodes WHY the behavior matters; the suite fails loudly on a revert.
 *
 * KEY GUARD: decideNudge must fire in EXACTLY ONE chat per critical episode —
 * the named-largest tree — and stay silent for every other case (non-critical,
 * stale telemetry, unresolved slot, not-the-largest, within cooldown). A revert
 * that loosens any of those gates turns this from a targeted actuator into
 * fleet-wide every-prompt noise.
 *
 * Uses node:test (NOT vitest) — the .claude/ vitest config has a known
 * transform bug; node:test runs clean.
 *   Run: node --test H:/prism/.claude/hooks/__tests__/critical-memory-compact-nudge.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  stableIdFromPayload,
  slotForChatId,
  fmtBytes,
  decideNudge,
} from "../critical-memory-compact-nudge.mjs";

// ─── stableIdFromPayload ────────────────────────────────────────────────────

test("stableIdFromPayload: valid session_id → claude-<first 8 hex>", () => {
  assert.equal(
    stableIdFromPayload({ session_id: "9876118b-8887-4f9c-aac9-6c59c5f7cdd2" }),
    "claude-9876118b",
  );
});

test("stableIdFromPayload: missing / short / non-object → null", () => {
  assert.equal(stableIdFromPayload({}), null, "no session_id");
  assert.equal(stableIdFromPayload({ session_id: "abc" }), null, "shorter than 8 chars");
  assert.equal(stableIdFromPayload(null), null);
  assert.equal(stableIdFromPayload(undefined), null);
  assert.equal(stableIdFromPayload({ session_id: 12345678 }), null, "non-string session_id");
});

// ─── slotForChatId ──────────────────────────────────────────────────────────

test("slotForChatId: finds the slot in the {slots:{...}} schema", () => {
  const slots = {
    schemaVersion: 1,
    slots: {
      alpha: { chatId: "claude-aaaaaaaa" },
      mike: { chatId: "claude-9876118b" },
      bravo: null,
    },
  };
  assert.equal(slotForChatId(slots, "claude-9876118b"), "mike");
  assert.equal(slotForChatId(slots, "claude-aaaaaaaa"), "alpha");
});

test("slotForChatId: handles a flat (legacy) slots object", () => {
  const flat = { golf: { chatId: "claude-deadbeef" } };
  assert.equal(slotForChatId(flat, "claude-deadbeef"), "golf");
});

test("slotForChatId: chatId not held / null inputs → null", () => {
  const slots = { slots: { mike: { chatId: "claude-9876118b" } } };
  assert.equal(slotForChatId(slots, "claude-nothere"), null);
  assert.equal(slotForChatId(null, "claude-9876118b"), null);
  assert.equal(slotForChatId(slots, null), null);
  assert.equal(slotForChatId(slots, ""), null);
});

// ─── fmtBytes ───────────────────────────────────────────────────────────────

test("fmtBytes: normal values scale to KB/MB/GB", () => {
  assert.equal(fmtBytes(1024), "1.00KB");
  assert.equal(fmtBytes(900 * 1024 * 1024), "900MB");
  assert.equal(fmtBytes(2 * 1024 * 1024 * 1024), "2.00GB");
});

test("fmtBytes: zero / negative / NaN → \"0\"", () => {
  assert.equal(fmtBytes(0), "0");
  assert.equal(fmtBytes(-5), "0");
  assert.equal(fmtBytes(NaN), "0");
  assert.equal(fmtBytes(undefined), "0");
});

// ─── decideNudge ────────────────────────────────────────────────────────────

const NOW = Date.parse("2026-05-17T20:00:00.000Z");
const COOLDOWN_MS = 8 * 60 * 1000;
const FRESH_MS = 10 * 60 * 1000;

/** A fresh, critical telemetry row whose largest tree is slot "mike". */
const criticalRow = (over = {}) => ({
  ts: new Date(NOW).toISOString(),
  level: "critical",
  commitUsedPct: 97.9,
  physUsedPct: 80.1,
  largestTree: "mike",
  largestTreePid: 1234,
  largestRssBytes: 900 * 1024 * 1024,
  liveChatTrees: 13,
  ...over,
});

const call = (over) => decideNudge({
  row: criticalRow(),
  mySlot: "mike",
  nowMs: NOW,
  lastNudgeMs: NaN,
  cooldownMs: COOLDOWN_MS,
  freshMs: FRESH_MS,
  ...over,
});

test("decideNudge: no telemetry row → silent (no-telemetry)", () => {
  const r = call({ row: null });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "no-telemetry");
});

test("decideNudge: level warn or clean → silent (not-critical)", () => {
  assert.equal(call({ row: criticalRow({ level: "warn" }) }).reason, "not-critical");
  assert.equal(call({ row: criticalRow({ level: "clean" }) }).reason, "not-critical");
});

test("decideNudge: telemetry older than freshMs → silent (stale-telemetry)", () => {
  // ts 20min ago, freshMs 10min → stale.
  const r = call({ row: criticalRow({ ts: new Date(NOW - 20 * 60_000).toISOString() }) });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "stale-telemetry");
});

test("decideNudge: missing / unparseable ts → silent (stale-telemetry)", () => {
  assert.equal(call({ row: criticalRow({ ts: undefined }) }).reason, "stale-telemetry");
  assert.equal(call({ row: criticalRow({ ts: "not-a-date" }) }).reason, "stale-telemetry");
});

test("decideNudge: this chat has no resolved slot → silent (slot-unresolved)", () => {
  const r = call({ mySlot: null });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "slot-unresolved");
});

test("decideNudge: this chat is NOT the named largest tree → silent (not-largest)", () => {
  // The monitor named "bravo" the largest; this chat is "mike".
  const r = call({ row: criticalRow({ largestTree: "bravo" }) });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "not-largest");
});

test("decideNudge: unlabeled tree-PID largest → silent (graceful degradation)", () => {
  // When the monitor cannot map the largest tree to a slot it emits a
  // tree-PID; no slot name can equal it, so the hook correctly stays silent.
  const r = call({ row: criticalRow({ largestTree: "tree-9864" }) });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "not-largest");
});

test("decideNudge: within the per-chat cooldown → silent (cooldown)", () => {
  // Nudged 1min ago, cooldown 8min → suppressed.
  const r = call({ lastNudgeMs: NOW - 60_000 });
  assert.equal(r.nudge, false);
  assert.equal(r.reason, "cooldown");
});

test("decideNudge: critical + fresh + largest + no prior nudge → FIRES", () => {
  const r = call({ lastNudgeMs: NaN });
  assert.equal(r.nudge, true);
  assert.equal(r.reason, "critical-largest");
  assert.ok(typeof r.text === "string" && r.text.length > 0, "nudge text is non-empty");
});

test("decideNudge: fires again once the cooldown has elapsed", () => {
  // Last nudge 10min ago, cooldown 8min → cooled → fires.
  const r = call({ lastNudgeMs: NOW - 10 * 60_000 });
  assert.equal(r.nudge, true);
  assert.equal(r.reason, "critical-largest");
});

test("decideNudge: exactly at the cooldown boundary → fires (strict <)", () => {
  // (nowMs - lastNudgeMs) === cooldownMs. The cooldown check is `< cooldownMs`
  // (strict), so a nudge exactly cooldownMs ago is cooled → fires. A revert to
  // `<=` would flip this and wrongly suppress an on-boundary nudge.
  const r = call({ lastNudgeMs: NOW - COOLDOWN_MS });
  assert.equal(r.nudge, true);
  assert.equal(r.reason, "critical-largest");
});

test("decideNudge: the nudge text names /compact, the slot, and the commit %", () => {
  const r = call({ lastNudgeMs: NaN });
  assert.match(r.text, /\/compact/, "must direct the operator to /compact");
  assert.match(r.text, /\bmike\b/, "must name this chat's slot");
  assert.match(r.text, /97\.9%/, "must cite the commit-pressure figure");
});
