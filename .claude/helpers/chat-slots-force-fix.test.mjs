/**
 * chat-slots-force-fix.test.mjs — node:test suite for U-SLOT-FORCE-FIX.
 *
 * Verifies that `--preferSlot <other> --force=true` BEATS both inheritance
 * early-returns in claimSlot():
 *   1. the chatId-already-owns loop  (chat-slots.mjs:321-330)
 *   2. the terminal-window-pin loop  (chat-slots.mjs:336-361)
 *
 * Without the fix, the /checkin-<slot> NATO skills can only confirm an
 * unslotted chat — they cannot MOVE a chat already pinned to a different
 * slot, which is exactly what every post-/compact chat is (the SessionStart
 * terminal-pin hook inherits the window's prior slot before any /checkin
 * runs). Observed pathology this session: `/checkin-lima` resolved to slot
 * `charlie` because this chat already owned `charlie` via terminal-pin.
 *
 * Run: "H:/.claude/bin/portable-node" --test .claude/helpers/chat-slots-force-fix.test.mjs
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { claimSlot, SLOT_NAMES } from "./chat-slots.mjs";

// ---------------------------------------------------------------------------
// Hermetic test scaffolding
// ---------------------------------------------------------------------------

const tmpDirs = [];

function makeIsolatedPaths(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-slot-force-"));
  tmpDirs.push(dir);
  return {
    statePath: path.join(dir, `state-${tag}.json`),
    lockPath:  path.join(dir, `state-${tag}.lock`),
  };
}

function emptySlots() {
  const slots = {};
  for (const n of SLOT_NAMES) slots[n] = null;
  return slots;
}

function seedOwning(statePath, slot, chatId, extras = {}) {
  const ts = new Date().toISOString();
  const slots = emptySlots();
  slots[slot] = {
    chatId,
    host: "test-host",
    pid: 1234,
    claimedAt: ts,
    lastHeartbeat: ts,
    branch: extras.branch ?? null,
    topic: extras.topic ?? null,
    activity: extras.activity ?? null,
    terminalWindowId: extras.terminalWindowId ?? null,
  };
  fs.writeFileSync(
    statePath,
    JSON.stringify({ schemaVersion: 2, lastUpdated: ts, slots }, null, 2),
  );
}

after(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

// ---------------------------------------------------------------------------
// T1: chatId-owns + preferSlot=different + force → moves to preferSlot
//   (the bug this session — /checkin-lima silently returned charlie)
// ---------------------------------------------------------------------------

describe("U-SLOT-FORCE-FIX T1: chatId-owns + preferSlot=different + force → MOVES", () => {
  it("releases charlie and claims lima", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t1");
    seedOwning(statePath, "charlie", "claude-X");

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "lima", force: true, confirmRecent: true },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `claim failed: ${JSON.stringify(result)}`);
    assert.equal(
      result.slot, "lima",
      `expected lima, got '${result.slot}' — the chatId-owns early-return ignored --preferSlot --force`,
    );

    const file = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(file.slots.charlie, null, "charlie must be released");
    assert.ok(file.slots.lima, "lima must be set");
    assert.equal(file.slots.lima.chatId, "claude-X");
  });
});

// ---------------------------------------------------------------------------
// T2: chatId-owns + preferSlot===current → stays (no-op re-claim)
// ---------------------------------------------------------------------------

describe("U-SLOT-FORCE-FIX T2: chatId-owns + preferSlot=current → stays", () => {
  it("re-claiming the same slot is a no-op", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t2");
    seedOwning(statePath, "charlie", "claude-X");

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "charlie", force: true },
      statePath, lockPath,
    );

    assert.equal(result.slot, "charlie");
    assert.equal(result.alreadyOwned, true);
  });
});

// ---------------------------------------------------------------------------
// T3: chatId-owns + NO preferSlot → stays (plain /checkin must keep its slot)
// ---------------------------------------------------------------------------

describe("U-SLOT-FORCE-FIX T3: chatId-owns + no preferSlot → stays (re-claim)", () => {
  it("plain re-claim returns the current slot", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t3");
    seedOwning(statePath, "charlie", "claude-X");

    const result = claimSlot({ chatId: "claude-X" }, statePath, lockPath);

    assert.equal(result.slot, "charlie");
    assert.equal(result.alreadyOwned, true);
  });
});

// ---------------------------------------------------------------------------
// T4: chatId-owns + preferSlot=different + NO force → stays (force required)
//   This is the regression-guard: without --force the chat must NOT move.
// ---------------------------------------------------------------------------

describe("U-SLOT-FORCE-FIX T4: chatId-owns + preferSlot=different + NO force → stays", () => {
  it("preferSlot without --force does NOT move the chat", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t4");
    seedOwning(statePath, "charlie", "claude-X");

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "lima" }, // no force
      statePath, lockPath,
    );

    assert.equal(result.slot, "charlie", "must NOT move without --force");
    assert.equal(result.alreadyOwned, true);

    const file = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(file.slots.charlie.chatId, "claude-X");
    assert.equal(file.slots.lima, null);
  });
});

// ---------------------------------------------------------------------------
// T5: terminal-pin loop + preferSlot=different + force → MOVES
//   New chat in the SAME WINDOW asks for a different slot — the window's
//   prior pin must yield to the operator's explicit choice.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T6: recency-guard refuses force-take → the in-memory release MUST NOT
//   persist to disk (rebuts the "release-leak on failure path" concern).
//   The release happens inside withLock's closure; the recency-fail return
//   skips writeSlotsAtomic, so the disk stays at the pre-call state.
// ---------------------------------------------------------------------------

describe("U-SLOT-FORCE-FIX T6: recency-guard refuses → disk unchanged", () => {
  it("release is in-memory only — disk still shows chat owning original slot", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t6");

    // Charlie owned by claude-X. Lima ALSO seeded — claimed 5s ago by another
    // chat (well inside the recency window). force=true + confirmRecent=false
    // → preferSlot's recency guard refuses → function returns {ok:false}
    // WITHOUT calling writeSlotsAtomic.
    const ts = new Date().toISOString();
    const recentTs = new Date(Date.now() - 5_000).toISOString();
    fs.writeFileSync(
      statePath,
      JSON.stringify(
        {
          schemaVersion: 2,
          lastUpdated: ts,
          slots: {
            ...emptySlots(),
            charlie: {
              chatId: "claude-X", host: "test-host", pid: 1234,
              claimedAt: ts, lastHeartbeat: ts,
              branch: null, topic: null, activity: null, terminalWindowId: null,
            },
            lima: {
              chatId: "claude-OTHER", host: "test-host", pid: 5678,
              claimedAt: recentTs, lastHeartbeat: recentTs,
              branch: null, topic: null, activity: null, terminalWindowId: null,
            },
          },
        },
        null, 2,
      ),
    );

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "lima", force: true, confirmRecent: false },
      statePath, lockPath,
    );

    assert.equal(result.ok, false, "recency guard should refuse without confirmRecent");
    assert.equal(result.error, "slot_recently_claimed");

    // Critical assertion: disk MUST be unchanged. The in-memory release of
    // charlie cannot leak past the un-written failure return.
    const file = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.ok(file.slots.charlie, "charlie must still exist on disk");
    assert.equal(
      file.slots.charlie.chatId, "claude-X",
      "charlie's owner must be unchanged — the in-memory release did not persist",
    );
    assert.equal(file.slots.lima?.chatId, "claude-OTHER", "lima's owner must be unchanged");
  });
});

describe("U-SLOT-FORCE-FIX T5: terminal-pin + preferSlot=different + force → MOVES", () => {
  it("new chat in same window claims lima, releasing the window's old charlie pin", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t5");
    seedOwning(statePath, "charlie", "claude-OLD", { terminalWindowId: "tw-test-1" });

    const result = claimSlot(
      {
        chatId: "claude-NEW",
        terminalWindowId: "tw-test-1",
        preferSlot: "lima",
        force: true,
        confirmRecent: true,
      },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `claim failed: ${JSON.stringify(result)}`);
    assert.equal(
      result.slot, "lima",
      `expected lima, got '${result.slot}' — the terminal-pin early-return ignored --preferSlot --force`,
    );

    const file = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(file.slots.charlie, null, "charlie must be released");
    assert.ok(file.slots.lima, "lima must be set");
    assert.equal(file.slots.lima.chatId, "claude-NEW");
    assert.equal(
      file.slots.lima.terminalWindowId, "tw-test-1",
      "the window-pin must move with the operator's explicit choice",
    );
  });
});
