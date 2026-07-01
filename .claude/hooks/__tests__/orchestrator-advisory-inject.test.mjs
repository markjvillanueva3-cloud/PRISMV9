/**
 * orchestrator-advisory-inject.test.mjs — hermetic coverage for the 4 pure
 * exports from CHAT-ORCHESTRATOR-MS0/U-CHO06.
 *
 * Pure-function tests only — no stdin, no real filesystem, no spawn.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  stableIdFromPayload,
  slotForChatId,
  decideAdvisoryInject,
  formatAdvisoryText,
} from "../orchestrator-advisory-inject.mjs";

// ─── stableIdFromPayload ────────────────────────────────────────────────────

test("stableIdFromPayload: valid UUID → claude-<8hex>", () => {
  const r = stableIdFromPayload({ session_id: "9876118b-8887-4f9c-aac9-6c59c5f7cdd2" });
  assert.equal(r, "claude-9876118b");
});

test("stableIdFromPayload: shortest valid id (8 chars) → claude-<all 8>", () => {
  const r = stableIdFromPayload({ session_id: "abcdef12" });
  assert.equal(r, "claude-abcdef12");
});

test("stableIdFromPayload: null payload → null", () => {
  assert.equal(stableIdFromPayload(null), null);
});

test("stableIdFromPayload: missing session_id → null", () => {
  assert.equal(stableIdFromPayload({}), null);
});

test("stableIdFromPayload: non-string session_id → null", () => {
  assert.equal(stableIdFromPayload({ session_id: 12345 }), null);
});

test("stableIdFromPayload: too-short session_id (<8 chars) → null", () => {
  assert.equal(stableIdFromPayload({ session_id: "abc" }), null);
});

test("stableIdFromPayload: non-object payload → null", () => {
  assert.equal(stableIdFromPayload("not-an-object"), null);
  assert.equal(stableIdFromPayload(42), null);
});

// ─── slotForChatId ──────────────────────────────────────────────────────────

test("slotForChatId: nested .slots shape — match found", () => {
  const data = {
    slots: {
      alpha: { chatId: "claude-aaaa1111", state: "alive" },
      bravo: { chatId: "claude-bbbb2222", state: "alive" },
    },
  };
  assert.equal(slotForChatId(data, "claude-bbbb2222"), "bravo");
});

test("slotForChatId: flat shape (no .slots wrapper) — match found", () => {
  const data = {
    alpha: { chatId: "claude-aaaa1111" },
    bravo: { chatId: "claude-bbbb2222" },
  };
  assert.equal(slotForChatId(data, "claude-aaaa1111"), "alpha");
});

test("slotForChatId: chatId not held by any slot → null", () => {
  const data = { slots: { alpha: { chatId: "claude-aaaa1111" } } };
  assert.equal(slotForChatId(data, "claude-zzzz9999"), null);
});

test("slotForChatId: null slotsData → null", () => {
  assert.equal(slotForChatId(null, "claude-aaaa1111"), null);
});

test("slotForChatId: empty chatId → null", () => {
  assert.equal(slotForChatId({ slots: { a: { chatId: "x" } } }, ""), null);
});

test("slotForChatId: slot state is null → skipped, doesn't crash", () => {
  const data = {
    slots: {
      alpha: null,
      bravo: { chatId: "claude-bbbb2222" },
    },
  };
  assert.equal(slotForChatId(data, "claude-bbbb2222"), "bravo");
});

test("slotForChatId: golf slot match works (hygiene slot)", () => {
  const data = { slots: { golf: { chatId: "claude-gggg7777" } } };
  assert.equal(slotForChatId(data, "claude-gggg7777"), "golf");
});

// ─── formatAdvisoryText ─────────────────────────────────────────────────────

test("formatAdvisoryText: clear action → 'RUN /clear NOW'", () => {
  const t = formatAdvisoryText("clear", "context-pressure-92pct", "alpha");
  assert.match(t, /★ ORCHESTRATOR ADVISORY for slot `alpha`/);
  assert.match(t, /RUN \/clear NOW/);
  assert.match(t, /Why: context-pressure-92pct/);
});

test("formatAdvisoryText: compact action → 'RUN /compact NOW'", () => {
  const t = formatAdvisoryText("compact", "loop-active-uncommitted-work", "bravo");
  assert.match(t, /RUN \/compact NOW/);
  assert.match(t, /Why: loop-active-uncommitted-work/);
});

test("formatAdvisoryText: respawn action → orchestrator-respawn note", () => {
  const t = formatAdvisoryText("respawn", "crashed-slot-detected", "charlie");
  assert.match(t, /orchestrator will respawn this chat/);
});

test("formatAdvisoryText: unknown action → falls back to 'ACTION: <name>'", () => {
  const t = formatAdvisoryText("custom-thing", "reason-x", "delta");
  assert.match(t, /ACTION: custom-thing/);
});

test("formatAdvisoryText: includes opt-in disclosure", () => {
  const t = formatAdvisoryText("clear", "r", "echo");
  assert.match(t, /opt-in via state\/shared\/orchestrator-opt-in\.json/);
});

// ─── decideAdvisoryInject ───────────────────────────────────────────────────

const baseDirective = {
  action: "clear",
  reason: "pressure-92",
  advisoryId: "adv-abc-001",
  writtenAt: "2026-05-17T22:00:00.000Z",
};
const baseArgs = {
  mySlot: "alpha",
  optedIn: true,
  directive: baseDirective,
  ackedIds: new Set(),
  nowMs: Date.parse("2026-05-17T22:05:00.000Z"),
  lastAdvisoryMs: NaN,
  cooldownMs: 120_000,
};

test("decideAdvisoryInject: fresh + opted-in + new id → inject", () => {
  const r = decideAdvisoryInject(baseArgs);
  assert.equal(r.inject, true);
  assert.equal(r.reason, "fresh-directive");
  assert.equal(r.advisoryId, "adv-abc-001");
  assert.match(r.text, /RUN \/clear NOW/);
});

test("decideAdvisoryInject: mySlot=null → slot-unresolved", () => {
  const r = decideAdvisoryInject({ ...baseArgs, mySlot: null });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "slot-unresolved");
});

test("decideAdvisoryInject: optedIn=false → not-opted-in", () => {
  const r = decideAdvisoryInject({ ...baseArgs, optedIn: false });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "not-opted-in");
});

test("decideAdvisoryInject: directive=null → no-directive", () => {
  const r = decideAdvisoryInject({ ...baseArgs, directive: null });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "no-directive");
});

test("decideAdvisoryInject: directive missing action → directive-malformed-no-action", () => {
  const bad = { ...baseDirective, action: undefined };
  const r = decideAdvisoryInject({ ...baseArgs, directive: bad });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "directive-malformed-no-action");
});

test("decideAdvisoryInject: directive missing advisoryId → directive-malformed-no-id", () => {
  const bad = { ...baseDirective, advisoryId: undefined };
  const r = decideAdvisoryInject({ ...baseArgs, directive: bad });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "directive-malformed-no-id");
});

test("decideAdvisoryInject: expiresAt past nowMs → directive-expired", () => {
  const expired = { ...baseDirective, expiresAt: "2026-05-17T22:00:00.000Z" }; // 5min before nowMs
  const r = decideAdvisoryInject({ ...baseArgs, directive: expired });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "directive-expired");
});

test("decideAdvisoryInject: expiresAt future → still injects", () => {
  const future = { ...baseDirective, expiresAt: "2026-05-17T23:00:00.000Z" };
  const r = decideAdvisoryInject({ ...baseArgs, directive: future });
  assert.equal(r.inject, true);
});

test("decideAdvisoryInject: expiresAt malformed → tolerated (Number.isFinite gate)", () => {
  const malformed = { ...baseDirective, expiresAt: "not-a-date" };
  const r = decideAdvisoryInject({ ...baseArgs, directive: malformed });
  assert.equal(r.inject, true); // Date.parse → NaN → skips expiry check
});

test("decideAdvisoryInject: advisoryId already acked → already-acked (idempotent)", () => {
  const r = decideAdvisoryInject({
    ...baseArgs,
    ackedIds: new Set(["adv-abc-001"]),
  });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "already-acked");
});

test("decideAdvisoryInject: lastAdvisoryMs within cooldown → cooldown", () => {
  const r = decideAdvisoryInject({
    ...baseArgs,
    lastAdvisoryMs: baseArgs.nowMs - 60_000, // 60s ago, cooldown is 120s
  });
  assert.equal(r.inject, false);
  assert.equal(r.reason, "cooldown");
});

test("decideAdvisoryInject: lastAdvisoryMs past cooldown → still injects", () => {
  const r = decideAdvisoryInject({
    ...baseArgs,
    lastAdvisoryMs: baseArgs.nowMs - 200_000, // 200s ago > 120s cooldown
  });
  assert.equal(r.inject, true);
});

test("decideAdvisoryInject: NaN lastAdvisoryMs (never injected before) → injects", () => {
  const r = decideAdvisoryInject({ ...baseArgs, lastAdvisoryMs: NaN });
  assert.equal(r.inject, true);
});

test("decideAdvisoryInject: ackedIds not a Set → does not throw, treated as no-ack", () => {
  // Defensive: a non-Set should not crash via .has() lookup.
  const r = decideAdvisoryInject({ ...baseArgs, ackedIds: null });
  assert.equal(r.inject, true);
});

test("decideAdvisoryInject: text payload includes the slot name", () => {
  const r = decideAdvisoryInject({ ...baseArgs, mySlot: "foxtrot" });
  assert.equal(r.inject, true);
  assert.match(r.text, /slot `foxtrot`/);
});

test("decideAdvisoryInject: missing reason field on directive → '(no-reason)' in text", () => {
  const noReason = { ...baseDirective, reason: undefined };
  const r = decideAdvisoryInject({ ...baseArgs, directive: noReason });
  assert.equal(r.inject, true);
  assert.match(r.text, /Why: \(no-reason\)/);
});

test("decideAdvisoryInject: gate ORDER — slot-unresolved wins over not-opted-in", () => {
  // If both are bad, slot-unresolved is the most specific failure (others are dependent).
  const r = decideAdvisoryInject({ ...baseArgs, mySlot: null, optedIn: false });
  assert.equal(r.reason, "slot-unresolved");
});

test("decideAdvisoryInject: gate ORDER — already-acked wins over cooldown", () => {
  // If we've already acked this id, ack is more specific (we KNOW we injected it).
  const r = decideAdvisoryInject({
    ...baseArgs,
    ackedIds: new Set(["adv-abc-001"]),
    lastAdvisoryMs: baseArgs.nowMs - 60_000, // cooldown would also fail
  });
  assert.equal(r.reason, "already-acked");
});
