/**
 * chat-slots.test.mjs - vitest suite for the 7-slot fleet manager.
 *
 * Every assertion is concrete-value (real strings/numbers/booleans).
 * Hermetic - each test seeds its own isolated state file + lock.
 */

import { afterEach, describe, expect, test } from "vitest";
import { promises as fsp } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  claimSlot,
  heartbeat,
  releaseSlot,
  reclaimCrashed,
  getStatus,
  findSlotForChat,
  readSlots,
  classifySlot,
  CRASH_TTL_MS,
  STALE_TTL_MS,
  RECENT_CLAIM_GUARD_MS,
} from "./chat-slots.mjs";

function makeIsolatedPaths(suffix) {
  const dir = join(tmpdir(), "prism-chat-slots-tests");
  const tag = suffix + "-" + process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  return {
    statePath: join(dir, "state-" + tag + ".json"),
    lockPath:  join(dir, "state-" + tag + ".lock"),
  };
}

async function seedSlot(statePath, slot, chatId, ageMs, extras) {
  extras = extras || {};
  const ts = new Date(Date.now() - ageMs).toISOString();
  const slots = {
    alpha: null, bravo: null, charlie: null,
    delta: null, echo: null, foxtrot: null, golf: null,
  };
  slots[slot] = {
    chatId: chatId,
    host: extras.host || "test-host",
    pid: extras.pid || 100,
    claimedAt: extras.claimedAt || ts,
    lastHeartbeat: ts,
    branch: extras.branch || null,
    topic: extras.topic || null,
    activity: extras.activity || null,
  };
  await fsp.mkdir(join(tmpdir(), "prism-chat-slots-tests"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({
    schemaVersion: 1,
    lastUpdated: ts,
    slots: slots,
  }, null, 2));
}

async function seedEmpty(statePath) {
  await fsp.mkdir(join(tmpdir(), "prism-chat-slots-tests"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({
    schemaVersion: 2,
    lastUpdated: new Date().toISOString(),
    slots: { alpha: null, bravo: null, charlie: null, delta: null, echo: null, foxtrot: null, golf: null, hotel: null, india: null, juliett: null },
  }));
}

const cleanupPaths = [];
async function cleanupAll() {
  for (const p of cleanupPaths.splice(0)) {
    try { await fsp.rm(p, { force: true }); } catch (e) { /* ignore */ }
  }
}

afterEach(cleanupAll);

describe("claimSlot - previousOwner surfacing", () => {
  test("crashed-reclaim surfaces previousOwner with reason crashed-reclaim", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("crashed");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 11 * 60 * 1000, {
      host: "machine-AAA", pid: 4242, branch: "work/AAA", topic: "topic-AAA", activity: "doing-AAA",
    });
    const r = claimSlot({ chatId: "claude-BBB" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.previousOwner.chatId).toBe("claude-AAA");
    expect(r.previousOwner.host).toBe("machine-AAA");
    expect(r.previousOwner.pid).toBe(4242);
    expect(r.previousOwner.branch).toBe("work/AAA");
    expect(r.previousOwner.topic).toBe("topic-AAA");
    expect(r.previousOwner.activity).toBe("doing-AAA");
    expect(r.previousOwner.reason).toBe("crashed-reclaim");
    expect(r.previousOwner.ageMs).toBeGreaterThan(CRASH_TTL_MS);
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-BBB");
  });

  test("force-takeover outside recency window surfaces reason force-takeover", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("force-takeover");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 60 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.previousOwner.chatId).toBe("claude-AAA");
    expect(r.previousOwner.reason).toBe("force-takeover");
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-BBB");
  });

  test("default walk to free slot does NOT carry previousOwner", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("walk-free");
    cleanupPaths.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = claimSlot({ chatId: "claude-XYZ" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.previousOwner).toBe(undefined);
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-XYZ");
  });

  test("idempotent re-claim refreshes heartbeat keeps claimedAt", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("idempotent");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 2 * 60 * 1000);
    const beforeFile = readSlots(statePath);
    const beforeHb = beforeFile.slots.alpha.lastHeartbeat;
    const beforeClaimed = beforeFile.slots.alpha.claimedAt;
    await new Promise((res) => setTimeout(res, 5));
    const r = claimSlot({ chatId: "claude-AAA" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.alreadyOwned).toBe(true);
    const afterFile = readSlots(statePath);
    expect(Date.parse(afterFile.slots.alpha.lastHeartbeat)).toBeGreaterThan(Date.parse(beforeHb));
    expect(afterFile.slots.alpha.claimedAt).toBe(beforeClaimed);
    expect(afterFile.slots.alpha.chatId).toBe("claude-AAA");
  });
});

describe("claimSlot - recency guard", () => {
  test("force-takeover within recency window is REFUSED without confirmRecent", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("recent-refused");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 10 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true }, statePath, lockPath);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("slot_recently_claimed");
    expect(r.details.slot).toBe("alpha");
    expect(r.details.blockedBy.chatId).toBe("claude-AAA");
    expect(r.details.ageMs).toBeLessThan(RECENT_CLAIM_GUARD_MS);
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-AAA");
  });

  test("force-takeover within recency window SUCCEEDS with confirmRecent", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("recent-confirmed");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 10 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true, confirmRecent: true }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.previousOwner.chatId).toBe("claude-AAA");
    expect(r.previousOwner.reason).toBe("force-takeover");
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-BBB");
  });

  test("force-takeover outside recency window does NOT require confirmRecent", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("recent-expired");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 60 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    expect(r.previousOwner.chatId).toBe("claude-AAA");
  });

  test("default walk no preferSlot is NOT subject to recency guard", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("walk-no-guard");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000);
    const r = claimSlot({ chatId: "claude-BBB" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("bravo");
    expect(r.previousOwner).toBe(undefined);
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-AAA");
    expect(readSlots(statePath).slots.bravo.chatId).toBe("claude-BBB");
  });
});

describe("claimSlot - boundary cases", () => {
  test("fleet_full when all slots alive and different chatIds", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("full");
    cleanupPaths.push(statePath, lockPath);
    const now = new Date().toISOString();
    await fsp.mkdir(join(tmpdir(), "prism-chat-slots-tests"), { recursive: true });
    const slots = {};
    const names = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett"];
    for (const n of names) {
      slots[n] = { chatId: "claude-" + n, host: "h", pid: 1, claimedAt: now, lastHeartbeat: now, branch: null, topic: null, activity: null };
    }
    await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 1, lastUpdated: now, slots: slots }));
    const r = claimSlot({ chatId: "claude-INTRUDER" }, statePath, lockPath);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("fleet_full");
    for (const n of names) {
      expect(readSlots(statePath).slots[n].chatId).toBe("claude-" + n);
    }
  });

  test("missing chatId returns invalid_input", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("invalid");
    cleanupPaths.push(statePath, lockPath);
    const r = claimSlot({}, statePath, lockPath);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_input");
    expect(r.message).toBe("chatId required");
  });

  test("preferSlot golf selects the golf slot specifically", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("golf");
    cleanupPaths.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = claimSlot({ chatId: "claude-HYGIENE", preferSlot: "golf" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("golf");
    expect(readSlots(statePath).slots.golf.chatId).toBe("claude-HYGIENE");
    for (const n of ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"]) {
      expect(readSlots(statePath).slots[n]).toBe(null);
    }
  });
});

describe("heartbeat - keeps slot alive past CRASH_TTL", () => {
  test("heartbeat refresh moves stale slot back to alive", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("heartbeat-refresh");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 5 * 60 * 1000);
    const before = readSlots(statePath);
    expect(classifySlot(before.slots.alpha)).toBe("stale");
    const beforeClaimed = before.slots.alpha.claimedAt;
    const r = heartbeat({ chatId: "claude-AAA", activity: "still working" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("alpha");
    const after = readSlots(statePath);
    expect(classifySlot(after.slots.alpha)).toBe("alive");
    expect(after.slots.alpha.activity).toBe("still working");
    expect(after.slots.alpha.claimedAt).toBe(beforeClaimed);
  });

  test("heartbeat refuses for chatId that owns no slot", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("heartbeat-orphan");
    cleanupPaths.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = heartbeat({ chatId: "claude-NOBODY" }, statePath, lockPath);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("no_slot_owned");
  });
});

describe("findSlotForChat - pure lookup", () => {
  test("returns the slot when chat owns one", async () => {
    const { statePath } = makeIsolatedPaths("find");
    cleanupPaths.push(statePath);
    await seedSlot(statePath, "charlie", "claude-FINDME", 30 * 1000);
    const r = findSlotForChat("claude-FINDME", statePath);
    expect(r.slot).toBe("charlie");
    expect(r.state.chatId).toBe("claude-FINDME");
  });

  test("returns null when chat owns no slot", async () => {
    const { statePath } = makeIsolatedPaths("find-null");
    cleanupPaths.push(statePath);
    await seedSlot(statePath, "alpha", "claude-AAA", 0);
    expect(findSlotForChat("claude-BBB", statePath)).toBe(null);
  });
});

describe("reclaimCrashed - auto-sweep", () => {
  test("reclaims slots older than CRASH_TTL_MS", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("sweep");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-DEAD", 12 * 60 * 1000);
    const r = reclaimCrashed(statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.reclaimed.length).toBe(1);
    expect(r.reclaimed[0].slot).toBe("alpha");
    expect(r.reclaimed[0].chatId).toBe("claude-DEAD");
    expect(readSlots(statePath).slots.alpha).toBe(null);
  });

  test("does NOT reclaim slots within CRASH_TTL", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("sweep-noop");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-STALE", 5 * 60 * 1000);
    const r = reclaimCrashed(statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.reclaimed.length).toBe(0);
    expect(readSlots(statePath).slots.alpha.chatId).toBe("claude-STALE");
  });
});

describe("releaseSlot - clean exit", () => {
  test("releases the slot owned by chatId", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("release");
    cleanupPaths.push(statePath, lockPath);
    await seedSlot(statePath, "bravo", "claude-EXITING", 30 * 1000);
    const r = releaseSlot({ chatId: "claude-EXITING" }, statePath, lockPath);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("bravo");
    expect(readSlots(statePath).slots.bravo).toBe(null);
  });

  test("refuses if chatId owns no slot", async () => {
    const { statePath, lockPath } = makeIsolatedPaths("release-noop");
    cleanupPaths.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = releaseSlot({ chatId: "claude-NOBODY" }, statePath, lockPath);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("no_slot_owned");
  });
});

describe("classifySlot - TTL boundaries", () => {
  test("null slot is idle", () => {
    expect(classifySlot(null)).toBe("idle");
  });
  test("30s-old heartbeat is alive", () => {
    const fresh = { lastHeartbeat: new Date(Date.now() - 30 * 1000).toISOString() };
    expect(classifySlot(fresh)).toBe("alive");
  });
  test("between STALE_TTL and CRASH_TTL is stale", () => {
    const between = { lastHeartbeat: new Date(Date.now() - (STALE_TTL_MS + 60 * 1000)).toISOString() };
    expect(classifySlot(between)).toBe("stale");
  });
  test("past CRASH_TTL is crashed", () => {
    const dead = { lastHeartbeat: new Date(Date.now() - (CRASH_TTL_MS + 60 * 1000)).toISOString() };
    expect(classifySlot(dead)).toBe("crashed");
  });
  test("unparseable heartbeat is crashed", () => {
    expect(classifySlot({ lastHeartbeat: "not-a-date" })).toBe("crashed");
  });
});

describe("getStatus - fleet snapshot", () => {
  test("returns all 7 slots with correctly classified status and summary", async () => {
    const { statePath } = makeIsolatedPaths("status");
    cleanupPaths.push(statePath);
    await seedSlot(statePath, "alpha", "claude-AAA", 30 * 1000);
    const r = getStatus(statePath);
    expect(r.ok).toBe(true);
    expect(r.slots.length).toBe(7);
    const alpha = r.slots.find((s) => s.slot === "alpha");
    expect(alpha.status).toBe("alive");
    expect(alpha.state.chatId).toBe("claude-AAA");
    expect(r.summary.alive).toBe(1);
    expect(r.summary.idle).toBe(6);
    expect(r.summary.stale).toBe(0);
    expect(r.summary.crashed).toBe(0);
  });
});
