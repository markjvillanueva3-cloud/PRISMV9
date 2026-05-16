// Tests for stop-slot-task-claims-advisory — PER-SLOT-CLAIM-MS0/U-PSC05
// Run: node --test H:/prism/.claude/hooks/stop-slot-task-claims-advisory.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { identifyOwner, formatAdvisory } from "./stop-slot-task-claims-advisory.mjs";

const NOW = "2026-05-16T21:00:00Z";

test("identifyOwner: matches by session_id first-8-hex", () => {
  const slotsData = {
    slots: {
      alpha: { chatId: "claude-aaaa1111", lastHeartbeat: NOW },
      bravo: { chatId: "claude-339c8ff7", lastHeartbeat: NOW },
    },
  };
  const r = identifyOwner(slotsData, "339c8ff7-73f9-4ab2-9d68-2e10d32f5267");
  assert.equal(r.slot, "bravo");
  assert.equal(r.chatId, "claude-339c8ff7");
});

test("identifyOwner: falls back to most-recent heartbeat when no sessionId", () => {
  const slotsData = {
    slots: {
      alpha: { chatId: "claude-aaaa1111", lastHeartbeat: "2026-05-16T20:00:00Z" },
      bravo: { chatId: "claude-bbbb2222", lastHeartbeat: "2026-05-16T21:00:00Z" },
    },
  };
  const r = identifyOwner(slotsData, null);
  assert.equal(r.slot, "bravo", "should pick most-recent heartbeat");
});

test("identifyOwner: returns null on missing data", () => {
  assert.equal(identifyOwner(null, "abc"), null);
  assert.equal(identifyOwner({}, "abc"), null);
  assert.equal(identifyOwner({ slots: {} }, "abc"), null);
});

test("identifyOwner: ignores slots with no chatId or heartbeat", () => {
  const slotsData = {
    slots: {
      alpha: { chatId: null, lastHeartbeat: NOW },
      bravo: { chatId: "claude-bbbb2222", lastHeartbeat: NOW },
      charlie: { chatId: "claude-cccc3333" /* no heartbeat */ },
    },
  };
  const r = identifyOwner(slotsData, null);
  assert.equal(r.slot, "bravo");
});

test("formatAdvisory: returns null when owner has no claims", () => {
  const owner = { slot: "bravo", chatId: "claude-339c8ff7" };
  const claims = {
    "MS::U-1": { slot: "alpha", chatId: "claude-aaaa1111", unitId: "MS::U-1", expiresAt: "2026-05-16T22:00:00Z" },
  };
  assert.equal(formatAdvisory(owner, claims, NOW), null);
});

test("formatAdvisory: lists owner's claims with TTL categorization", () => {
  const owner = { slot: "bravo", chatId: "claude-339c8ff7" };
  const claims = {
    "MS-A::U-1": { slot: "bravo", chatId: "claude-339c8ff7", unitId: "MS-A::U-1", expiresAt: "2026-05-16T21:15:00Z" }, // 15min → expiring soon
    "MS-A::U-2": { slot: "bravo", chatId: "claude-339c8ff7", unitId: "MS-A::U-2", expiresAt: "2026-05-16T22:30:00Z" }, // 90min → long term
    "MS-B::U-3": { slot: "alpha", chatId: "claude-aaaa1111", unitId: "MS-B::U-3", expiresAt: "2026-05-16T22:00:00Z" }, // peer
  };
  const msg = formatAdvisory(owner, claims, NOW);
  assert.ok(msg);
  assert.match(msg, /bravo\/339c8ff7/);
  assert.match(msg, /holds 2 active/);
  assert.match(msg, /⏳ MS-A::U-1/, "expiring-soon marker on <30min TTL");
  assert.match(msg, /MS-A::U-2 — 90m/, "long-term TTL listed");
  assert.ok(!msg.includes("MS-B::U-3"), "peer claim should not appear");
});

test("formatAdvisory: caps long lists at 5 per bucket + total indicator", () => {
  const owner = { slot: "bravo", chatId: "claude-339c8ff7" };
  const claims = {};
  for (let i = 0; i < 15; i++) {
    claims[`MS::U-${i}`] = {
      slot: "bravo", chatId: "claude-339c8ff7", unitId: `MS::U-${i}`,
      expiresAt: new Date(Date.parse(NOW) + 60 * 60 * 1000).toISOString(),
    };
  }
  const msg = formatAdvisory(owner, claims, NOW);
  assert.match(msg, /holds 15 active/);
  assert.match(msg, /and 10 more|and 5 more/); // 5 shown + 10 hidden (or 5+5 if some are expiring)
});

test("formatAdvisory: includes release-command hint", () => {
  const owner = { slot: "bravo", chatId: "claude-339c8ff7" };
  const claims = {
    "MS::U-1": { slot: "bravo", chatId: "claude-339c8ff7", unitId: "MS::U-1", expiresAt: "2026-05-16T22:00:00Z" },
  };
  const msg = formatAdvisory(owner, claims, NOW);
  assert.match(msg, /Release manually/);
  assert.match(msg, /slot-task-claim\.mjs release/);
});
