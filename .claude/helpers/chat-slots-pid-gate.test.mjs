// SLOT-DRIFT-FIX-MS0/U-SDF02 — window-PID liveness gate tests
// Run: node --test H:/prism/.claude/helpers/chat-slots-pid-gate.test.mjs
//
// User-reported 2026-05-17 (bravo claude-339c8ff7):
//   "did you fix the issue of terminal chats exiting out of their designated
//    slot. can we tie it to the window pid so that pid stays locked into that
//    chat slot as long as its open"
//
// The U-SDF01 fix (parser regex + writer empty-slot) stopped the cosmetic
// drift-warning cascade, but a deeper bug remained: when a chat went idle
// (user think-time, long /compact, wedged on a long tool call), the
// heartbeat aged past CRASH_TTL_MS and the NEXT chat's auto-sweep released
// the slot — even though the original PowerShell window was still wide open.
// A peer chat would then claim the slot and the original chat came back to
// find itself slotless.
//
// U-SDF02 adds a same-host PID-liveness check: if the owning window's PID
// (encoded in the terminalWindowId as tw-pp-<pid> / tw-ps-<pid> / tw-pa-<pid>)
// is still alive on this host, the slot is NOT released by automatic reclaim
// even if the heartbeat lapsed. The slot stays bound for the lifetime of the
// window. The `--force --confirmRecent` operator override is a separate
// codepath that bypasses this gate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWindowPid, isWindowAlive, shouldKeepSlotAlive } from "./chat-slots.mjs";
import { hostname } from "node:os";

const HOST = hostname();
const ALIVE_PID = process.pid; // this test process — guaranteed alive
const DEAD_PID = 999999;       // very unlikely to be a real PID

// ─── extractWindowPid ───────────────────────────────────────────────────────

test("extractWindowPid: REFUSES tw-pp-<pid> (tier 1 — PID is transient on Claude Bash)", () => {
  // Tier-1 PIDs are the immediate parent of whatever invoked the resolver.
  // For Claude's Bash tool that's the bash subprocess which dies in seconds.
  // Live evidence: bravo twid tw-pp-46708 -> PID 46708 was dead by next sweep.
  assert.equal(extractWindowPid("tw-pp-46708"), null);
});

test("extractWindowPid: parses tw-ps-<pid> (tier 3 — PowerShell PID, stable)", () => {
  assert.equal(extractWindowPid("tw-ps-52456"), 52456);
});

test("extractWindowPid: parses tw-pa-<pid> (tier 2 — non-shell ancestor PID, stable)", () => {
  assert.equal(extractWindowPid("tw-pa-7968"), 7968);
});

test("extractWindowPid: returns null for tw-wt-<guid> (no PID encoded)", () => {
  assert.equal(extractWindowPid("tw-wt-abc123def-4567-8901-2345-67890abcdef0"), null);
});

test("extractWindowPid: returns null for unparseable forms", () => {
  assert.equal(extractWindowPid(""), null);
  assert.equal(extractWindowPid("tw-pp-"), null);
  assert.equal(extractWindowPid("not-a-twid"), null);
  assert.equal(extractWindowPid("tw-XX-1234"), null); // unknown tier
});

test("extractWindowPid: returns null for non-string input (defensive)", () => {
  assert.equal(extractWindowPid(null), null);
  assert.equal(extractWindowPid(undefined), null);
  assert.equal(extractWindowPid(46708), null); // number, not string
  assert.equal(extractWindowPid({}), null);
});

test("extractWindowPid: refuses zero/negative PIDs (PID must be positive)", () => {
  assert.equal(extractWindowPid("tw-pp-0"), null);
  // "tw-pp--1" is not matched by the regex (leading -) — also null:
  assert.equal(extractWindowPid("tw-pp--1"), null);
});

// ─── isWindowAlive ──────────────────────────────────────────────────────────

test("isWindowAlive: true for same-host slot whose tier-2 window PID is alive", () => {
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // tier 2 — stable
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), true);
});

test("isWindowAlive: true for same-host slot whose tier-3 window PID is alive", () => {
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-ps-${ALIVE_PID}`, // tier 3 — stable
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), true);
});

test("isWindowAlive: false for same-host slot whose tier-2 window PID is dead", () => {
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pa-${DEAD_PID}`,
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: false for tier-1 twid even when PID happens to be alive (transient-tier refusal)", () => {
  // Tier-1 PIDs are unreliable on Claude Bash subprocesses — refusing them
  // forces fallback to pure heartbeat reclaim, the pre-U-SDF02 behavior.
  // No regression for tier-1-stuck slots.
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pp-${ALIVE_PID}`, // tier 1 — refused
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false,
    "tier-1 PIDs must be refused — gate falls through to heartbeat reclaim");
});

test("isWindowAlive: false for cross-host slot (cannot probe remote PIDs)", () => {
  const slot = {
    chatId: "claude-test",
    host: "OTHER-MACHINE",   // not our host
    pid: 12345,
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // even if PID would be alive locally
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: false when TWID encodes no PID (tw-wt form)", () => {
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: ALIVE_PID,                            // even if slot.pid is alive,
    terminalWindowId: "tw-wt-some-guid-here",  // we can't extract a PID
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: false when TWID is null/missing entirely", () => {
  const slot = {
    chatId: "claude-test",
    host: HOST,
    pid: ALIVE_PID,
    terminalWindowId: null,
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: false for null/undefined slot", () => {
  assert.equal(isWindowAlive(null), false);
  assert.equal(isWindowAlive(undefined), false);
});

// ─── shouldKeepSlotAlive (env-knob wrapper) ─────────────────────────────────

test("shouldKeepSlotAlive: identical to isWindowAlive when knob unset", () => {
  delete process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE;
  const slot = {
    chatId: "claude-test",
    host: HOST,
    terminalWindowId: `tw-pa-${ALIVE_PID}`,
    lastHeartbeat: new Date().toISOString(),
  };
  assert.equal(shouldKeepSlotAlive(slot), true);
  const deadSlot = { ...slot, terminalWindowId: `tw-pa-${DEAD_PID}` };
  assert.equal(shouldKeepSlotAlive(deadSlot), false);
});

test("shouldKeepSlotAlive: returns false when PRISM_SLOT_PID_ALIVE_CHECK_DISABLE=1 (escape hatch)", () => {
  process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE = "1";
  const slot = {
    chatId: "claude-test",
    host: HOST,
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // would otherwise return true
    lastHeartbeat: new Date().toISOString(),
  };
  assert.equal(shouldKeepSlotAlive(slot), false,
    "knob must force fallback to old pure-heartbeat reclaim behavior");
  // Cleanup so other tests don't see the disabled state
  delete process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE;
});

test("shouldKeepSlotAlive: any non-'1' value treats the knob as not-set", () => {
  process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE = "0";
  const slot = {
    chatId: "claude-test",
    host: HOST,
    terminalWindowId: `tw-pa-${ALIVE_PID}`,
    lastHeartbeat: new Date().toISOString(),
  };
  assert.equal(shouldKeepSlotAlive(slot), true, "knob='0' must NOT disable the gate");
  process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE = "true";
  assert.equal(shouldKeepSlotAlive(slot), true, "knob='true' must NOT disable the gate (only literal '1')");
  delete process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE;
});

// ─── E2E: the actual reported symptom ───────────────────────────────────────

test("E2E: a slot held by an alive window survives a heartbeat-crashed classification", async () => {
  const { classifySlot } = await import("./chat-slots.mjs");
  const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const slot = {
    chatId: "claude-bravo-test",
    host: HOST,
    pid: 12345, // helper PID — useless for liveness
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // BUT window PID alive
    lastHeartbeat: tenMinutesAgo, // > CRASH_TTL_MS (10min) → would be reclaimed pre-U-SDF02
    branch: null, topic: null, activity: "idle",
    claimedAt: tenMinutesAgo,
  };
  // Pure heartbeat says "crashed":
  assert.equal(classifySlot(slot), "crashed",
    "the slot's heartbeat IS old enough to classify as crashed");
  // But the window-PID gate says "keep it":
  assert.equal(shouldKeepSlotAlive(slot), true,
    "U-SDF02 gate must save this slot from auto-reclaim — exactly the user's reported bug");
});

test("E2E: a slot from a closed window does NOT escape reclaim (correct release semantics)", async () => {
  const { classifySlot } = await import("./chat-slots.mjs");
  const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const slot = {
    chatId: "claude-dead-window",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pa-${DEAD_PID}`, // window CLOSED → PID dead
    lastHeartbeat: tenMinutesAgo,
    branch: null, topic: null, activity: "idle",
    claimedAt: tenMinutesAgo,
  };
  assert.equal(classifySlot(slot), "crashed");
  assert.equal(shouldKeepSlotAlive(slot), false,
    "closed-window slots MUST be reclaimable — that's the inverse of the user's request");
});
