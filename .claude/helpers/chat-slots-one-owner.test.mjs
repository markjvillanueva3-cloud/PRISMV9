/**
 * chat-slots-one-owner.test.mjs -- node:test suite for U-SLOT-ONE-OWNER.
 *
 * ROOT CAUSE (operator-reported 2026-06-18, slot:alpha): "fix whatever is
 * forcing you to keep logging back into papa."
 *
 * claimSlot()'s chatId-owns reconciliation returned/broke on the FIRST slot a
 * chat owned. So a chat that transiently owned TWO slots -- a lingering
 * `/startup-papa` claim PLUS a later `/checkin-alpha` -- left the extra slot
 * dangling forever. The stale `papa` claim was then resolved by per-prompt
 * context injectors (slot-soul / galaxy-doctrine / slot-context-bundle) and
 * fleet tooling, so the chat kept presenting as `papa` even though
 * slot-bind-enforce authoritatively bound `alpha`.
 *
 * Invariant under test: a chat owns AT MOST ONE slot. Any claim reconciles
 * the chat to exactly one slot and releases every other slot it owned.
 *
 * Run: "H:/.claude/bin/portable-node" --test .claude/helpers/chat-slots-one-owner.test.mjs
 *  (in this env node --test runs 0 tests; run `node chat-slots-one-owner.test.mjs`
 *   directly -- node:test auto-runs on exit.)
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { claimSlot, findSlotForChat, heartbeat, setPipelineStep, reconcileOwnedSlots, SLOT_NAMES } from "./chat-slots.mjs";

const tmpDirs = [];

function makeIsolatedPaths(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-slot-oneowner-"));
  tmpDirs.push(dir);
  return {
    statePath: path.join(dir, `state-${tag}.json`),
    lockPath: path.join(dir, `state-${tag}.lock`),
  };
}

function emptySlots() {
  const slots = {};
  for (const n of SLOT_NAMES) slots[n] = null;
  return slots;
}

function record(chatId, extras = {}) {
  const ts = extras.ts ?? new Date().toISOString();
  return {
    chatId,
    host: "test-host",
    pid: extras.pid ?? 1234,
    claimedAt: extras.claimedAt ?? ts,
    lastHeartbeat: extras.lastHeartbeat ?? ts,
    branch: extras.branch ?? null,
    topic: extras.topic ?? null,
    activity: extras.activity ?? null,
    terminalWindowId: extras.terminalWindowId ?? null,
  };
}

/** Seed a chat-slots.json where one chatId owns MULTIPLE slots (the bug state). */
function seedDualOwned(statePath, slotRecords) {
  const slots = emptySlots();
  for (const [slot, rec] of Object.entries(slotRecords)) slots[slot] = rec;
  fs.writeFileSync(
    statePath,
    JSON.stringify({ schemaVersion: 2, lastUpdated: new Date().toISOString(), slots }, null, 2),
  );
}

function countOwnedBy(statePath, chatId) {
  const file = JSON.parse(fs.readFileSync(statePath, "utf8"));
  return SLOT_NAMES.filter((n) => file.slots[n] && file.slots[n].chatId === chatId);
}

after(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

// ---------------------------------------------------------------------------
// T1 (THE bug): chat owns alpha+papa, /checkin-alpha must leave ONLY alpha.
//   Pre-fix: claimSlot returns alpha (alreadyOwned) but LEAVES papa -> 2 owned.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T1: dual-owned alpha+papa, re-checkin alpha releases papa", () => {
  it("after /checkin-alpha the chat owns ONLY alpha (papa released)", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t1");
    seedDualOwned(statePath, {
      alpha: record("claude-X", { lastHeartbeat: new Date(Date.now() - 1000).toISOString() }),
      papa: record("claude-X", { lastHeartbeat: new Date(Date.now() - 60_000).toISOString() }),
    });

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "alpha", force: true, confirmRecent: true },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `claim failed: ${JSON.stringify(result)}`);
    assert.equal(result.slot, "alpha", `expected alpha, got '${result.slot}'`);

    const owned = countOwnedBy(statePath, "claude-X");
    assert.deepEqual(
      owned, ["alpha"],
      `one-chat-one-slot violated: chat still owns ${JSON.stringify(owned)} -- papa not released`,
    );
  });
});

// ---------------------------------------------------------------------------
// T2: dual-owned alpha+papa, force-move to a THIRD slot (lima) -> BOTH released.
//   Pre-fix: only the first-found owned slot was released, the other dangled.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T2: dual-owned, force-move to lima releases BOTH", () => {
  it("after /checkin-lima the chat owns ONLY lima", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t2");
    seedDualOwned(statePath, {
      alpha: record("claude-X"),
      papa: record("claude-X"),
    });

    const result = claimSlot(
      { chatId: "claude-X", preferSlot: "lima", force: true, confirmRecent: true },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `claim failed: ${JSON.stringify(result)}`);
    assert.equal(result.slot, "lima");
    assert.deepEqual(countOwnedBy(statePath, "claude-X"), ["lima"]);
  });
});

// ---------------------------------------------------------------------------
// T3: dual-owned, PLAIN re-claim (no preferSlot) dedupes to newest-heartbeat.
//   A heartbeat/terminal-pin without an explicit slot must still reconcile.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T3: dual-owned, plain re-claim keeps newest, releases other", () => {
  it("keeps the most-recently-heartbeated slot (alpha) and releases papa", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t3");
    seedDualOwned(statePath, {
      alpha: record("claude-X", { lastHeartbeat: new Date(Date.now() - 1000).toISOString() }),
      papa: record("claude-X", { lastHeartbeat: new Date(Date.now() - 90_000).toISOString() }),
    });

    const result = claimSlot({ chatId: "claude-X" }, statePath, lockPath);

    assert.equal(result.ok, true);
    assert.equal(result.slot, "alpha", "newest-heartbeat slot must win the dedupe");
    assert.equal(result.alreadyOwned, true);
    assert.deepEqual(countOwnedBy(statePath, "claude-X"), ["alpha"]);
  });
});

// ---------------------------------------------------------------------------
// T4: findSlotForChat agrees -- after reconciliation it returns the single slot.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T4: findSlotForChat returns the one reconciled slot", () => {
  it("after re-checkin alpha, findSlotForChat resolves alpha (no papa ambiguity)", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t4");
    seedDualOwned(statePath, {
      alpha: record("claude-X"),
      papa: record("claude-X"),
    });

    claimSlot(
      { chatId: "claude-X", preferSlot: "alpha", force: true, confirmRecent: true },
      statePath, lockPath,
    );

    const found = findSlotForChat("claude-X", statePath);
    assert.ok(found, "findSlotForChat must resolve a slot");
    assert.equal(found.slot, "alpha");
  });
});

// ---------------------------------------------------------------------------
// T5 (regression-guard): single-owned chat is behavior-IDENTICAL to before.
//   plain re-claim of the only slot -> alreadyOwned, slot unchanged.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T5: single-owned re-claim is unchanged (regression)", () => {
  it("chat owning only charlie, plain re-claim stays charlie alreadyOwned", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t5");
    seedDualOwned(statePath, { charlie: record("claude-Y") });

    const result = claimSlot({ chatId: "claude-Y" }, statePath, lockPath);
    assert.equal(result.slot, "charlie");
    assert.equal(result.alreadyOwned, true);
    assert.deepEqual(countOwnedBy(statePath, "claude-Y"), ["charlie"]);
  });
});

// ---------------------------------------------------------------------------
// T6 (adversarial): three slots owned by one chat, force-move to one of them
//   -> the other two are released, the named one is kept.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T6: triple-owned, force-checkin one of them keeps it, releases other two", () => {
  it("owns alpha+papa+zulu, /checkin-papa keeps papa releases alpha+zulu", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t6");
    seedDualOwned(statePath, {
      alpha: record("claude-Z"),
      papa: record("claude-Z"),
      zulu: record("claude-Z"),
    });

    const result = claimSlot(
      { chatId: "claude-Z", preferSlot: "papa", force: true, confirmRecent: true },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `claim failed: ${JSON.stringify(result)}`);
    assert.equal(result.slot, "papa");
    assert.deepEqual(countOwnedBy(statePath, "claude-Z"), ["papa"]);
  });
});

// ---------------------------------------------------------------------------
// T7: heartbeat self-heals a dual-owned state (U-SLOT-ONE-OWNER-HEARTBEAT).
//   The invariant must hold at EVERY mutator, not only claimSlot -- a pure
//   heartbeat (every PostToolUse) on a dual-owned chat reconciles to newest.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T7: heartbeat reconciles dual-owned to newest", () => {
  it("heartbeat keeps newest-heartbeat slot (alpha) and releases papa", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t7");
    seedDualOwned(statePath, {
      alpha: record("claude-X", { lastHeartbeat: new Date(Date.now() - 1000).toISOString() }),
      papa: record("claude-X", { lastHeartbeat: new Date(Date.now() - 120_000).toISOString() }),
    });

    const result = heartbeat({ chatId: "claude-X", activity: "tick" }, statePath, lockPath);

    assert.equal(result.ok, true, `heartbeat failed: ${JSON.stringify(result)}`);
    assert.equal(result.slot, "alpha", "heartbeat must keep newest-heartbeat slot");
    assert.deepEqual(
      countOwnedBy(statePath, "claude-X"), ["alpha"],
      "heartbeat must self-heal the dual-owned state, not leave papa dangling",
    );
  });
});

// ---------------------------------------------------------------------------
// T8: setPipelineStep self-heals a dual-owned state too.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T8: setPipelineStep reconciles dual-owned", () => {
  it("setPipelineStep keeps newest and releases the other", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t8");
    seedDualOwned(statePath, {
      papa: record("claude-X", { lastHeartbeat: new Date(Date.now() - 1000).toISOString() }),
      zulu: record("claude-X", { lastHeartbeat: new Date(Date.now() - 200_000).toISOString() }),
    });

    const result = setPipelineStep(
      { chatId: "claude-X", pipelineStep: "Step 12", pipelineIter: 3, pipelineTarget: 5 },
      statePath, lockPath,
    );

    assert.equal(result.ok, true, `setPipelineStep failed: ${JSON.stringify(result)}`);
    assert.equal(result.slot, "papa", "must keep newest-heartbeat slot (papa)");
    assert.deepEqual(countOwnedBy(statePath, "claude-X"), ["papa"]);
  });
});

// ---------------------------------------------------------------------------
// T9 (regression): heartbeat on a SINGLE-owned chat is unchanged.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T9: heartbeat single-owned unchanged (regression)", () => {
  it("heartbeat on a chat owning only charlie keeps charlie", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t9");
    seedDualOwned(statePath, { charlie: record("claude-Y") });

    const result = heartbeat({ chatId: "claude-Y", activity: "tick" }, statePath, lockPath);
    assert.equal(result.ok, true);
    assert.equal(result.slot, "charlie");
    assert.deepEqual(countOwnedBy(statePath, "claude-Y"), ["charlie"]);
  });
});

// ---------------------------------------------------------------------------
// T10 (regression): heartbeat for a chat owning NO slot still errors cleanly.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T10: heartbeat with no owned slot errors", () => {
  it("returns no_slot_owned when the chat owns nothing", () => {
    const { statePath, lockPath } = makeIsolatedPaths("t10");
    seedDualOwned(statePath, { charlie: record("claude-OTHER") });

    const result = heartbeat({ chatId: "claude-NOBODY" }, statePath, lockPath);
    assert.equal(result.ok, false);
    assert.equal(result.error, "no_slot_owned");
  });
});

// ---------------------------------------------------------------------------
// T11 (pure-fn): reconcileOwnedSlots -- empty / single / dual / NaN-heartbeat.
// ---------------------------------------------------------------------------
describe("U-SLOT-ONE-OWNER T11: reconcileOwnedSlots pure helper", () => {
  it("returns null when chat owns nothing; keeps single; dedupes dual to newest", () => {
    const mk = (chatId, hb) => ({ chatId, lastHeartbeat: hb });
    // empty
    let file = { slots: { alpha: null, papa: null } };
    assert.equal(reconcileOwnedSlots(file, "claude-X"), null);
    // single -> kept, nothing released
    file = { slots: { alpha: mk("claude-X", "2026-06-18T10:00:00Z"), papa: null } };
    assert.equal(reconcileOwnedSlots(file, "claude-X"), "alpha");
    assert.ok(file.slots.alpha);
    // dual -> newest kept, other nulled
    file = {
      slots: {
        alpha: mk("claude-X", "2026-06-18T10:00:00Z"),
        papa: mk("claude-X", "2026-06-18T09:00:00Z"),
      },
    };
    assert.equal(reconcileOwnedSlots(file, "claude-X"), "alpha");
    assert.equal(file.slots.papa, null, "older slot must be released");
    assert.ok(file.slots.alpha, "newer slot must be kept");
    // NaN/missing heartbeat must not throw and must lose to a valid one
    file = {
      slots: {
        alpha: mk("claude-X", undefined),
        papa: mk("claude-X", "2026-06-18T09:00:00Z"),
      },
    };
    assert.equal(reconcileOwnedSlots(file, "claude-X"), "papa", "valid heartbeat beats missing one");
    assert.equal(file.slots.alpha, null);
    // preferKeep owned -> kept even when it is NOT the newest-heartbeat slot
    file = {
      slots: {
        alpha: mk("claude-X", "2026-06-18T10:00:00Z"), // newer
        papa: mk("claude-X", "2026-06-18T09:00:00Z"),  // older but preferred
      },
    };
    assert.equal(reconcileOwnedSlots(file, "claude-X", "papa"), "papa", "preferKeep owned must win over newest");
    assert.equal(file.slots.alpha, null, "non-preferred owned slot released");
    // preferKeep NOT owned -> falls back to newest-heartbeat
    file = {
      slots: {
        alpha: mk("claude-X", "2026-06-18T10:00:00Z"),
        papa: mk("claude-X", "2026-06-18T09:00:00Z"),
      },
    };
    assert.equal(reconcileOwnedSlots(file, "claude-X", "zulu"), "alpha", "un-owned preferKeep falls to newest");
  });
});
