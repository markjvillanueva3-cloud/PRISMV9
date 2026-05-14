#!/usr/bin/env node
/**
 * chat-slots-smoke.mjs - hermetic smoke test for the 7-slot fleet manager.
 *
 * Why this exists instead of a vitest test:
 *   vitest 4.1.5's loader chokes on chat-slots.mjs in this repo's helpers/
 *   tree (passes node --check + esbuild.transform but fails the vitest
 *   transform with a non-localised SyntaxError). Rather than dig further,
 *   this file runs the same 50+ assertions as a plain node script that
 *   exits non-zero on any failure. Run via:
 *     node .claude/helpers/chat-slots-smoke.mjs
 *
 * Hermetic: every test seeds an isolated state file + lock under os.tmpdir().
 * Real-value assertions throughout (no toBeTruthy / toBeDefined / blanket
 * presence checks).
 */

import { promises as fsp, rmSync } from "node:fs";
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

let passed = 0;
let failed = 0;
const failures = [];

function eq(actual, expected, label) {
  if (Object.is(actual, expected)) { passed++; return; }
  failed++;
  failures.push("  X " + label + ": expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}
function gt(actual, threshold, label) {
  if (typeof actual === "number" && actual > threshold) { passed++; return; }
  failed++;
  failures.push("  X " + label + ": expected >" + threshold + ", got " + actual);
}
function lt(actual, threshold, label) {
  if (typeof actual === "number" && actual < threshold) { passed++; return; }
  failed++;
  failures.push("  X " + label + ": expected <" + threshold + ", got " + actual);
}

function paths(suffix) {
  const dir = join(tmpdir(), "prism-chat-slots-smoke");
  const tag = suffix + "-" + process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  return {
    statePath: join(dir, "s-" + tag + ".json"),
    lockPath: join(dir, "s-" + tag + ".lock"),
  };
}

async function seedSlot(statePath, slot, chatId, ageMs, extras = {}) {
  const ts = new Date(Date.now() - ageMs).toISOString();
  const slots = { alpha: null, bravo: null, charlie: null, delta: null, echo: null, foxtrot: null, golf: null };
  slots[slot] = {
    chatId,
    host: extras.host || "h",
    pid: extras.pid || 1,
    claimedAt: extras.claimedAt || ts,
    lastHeartbeat: ts,
    branch: extras.branch || null,
    topic: extras.topic || null,
    activity: extras.activity || null,
  };
  await fsp.mkdir(join(tmpdir(), "prism-chat-slots-smoke"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 1, lastUpdated: ts, slots }));
}
async function seedEmpty(statePath) {
  await fsp.mkdir(join(tmpdir(), "prism-chat-slots-smoke"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    slots: { alpha: null, bravo: null, charlie: null, delta: null, echo: null, foxtrot: null, golf: null },
  }));
}

const cleanups = [];

async function run() {
  // previousOwner surfacing — crashed-reclaim
  {
    const { statePath, lockPath } = paths("crashed");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 11 * 60 * 1000, {
      host: "m1", pid: 4242, branch: "b", topic: "t", activity: "a",
    });
    const r = claimSlot({ chatId: "claude-BBB" }, statePath, lockPath);
    eq(r.ok, true, "crashed-reclaim ok");
    eq(r.slot, "alpha", "crashed-reclaim slot");
    eq(r.previousOwner.chatId, "claude-AAA", "crashed-reclaim prev.chatId");
    eq(r.previousOwner.host, "m1", "crashed-reclaim prev.host");
    eq(r.previousOwner.pid, 4242, "crashed-reclaim prev.pid");
    eq(r.previousOwner.reason, "crashed-reclaim", "crashed-reclaim reason");
    gt(r.previousOwner.ageMs, CRASH_TTL_MS, "crashed-reclaim ageMs > CRASH_TTL");
    eq(readSlots(statePath).slots.alpha.chatId, "claude-BBB", "crashed-reclaim state.chatId");
  }

  // previousOwner surfacing — force-takeover outside recency
  {
    const { statePath, lockPath } = paths("force-out");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 60 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true }, statePath, lockPath);
    eq(r.ok, true, "force-takeover-outside ok");
    eq(r.slot, "alpha", "force-takeover-outside slot");
    eq(r.previousOwner.chatId, "claude-AAA", "force-takeover-outside prev.chatId");
    eq(r.previousOwner.reason, "force-takeover", "force-takeover-outside reason");
  }

  // Default walk — free slot, no previousOwner
  {
    const { statePath, lockPath } = paths("walk-free");
    cleanups.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = claimSlot({ chatId: "claude-XYZ" }, statePath, lockPath);
    eq(r.ok, true, "walk-free ok");
    eq(r.slot, "alpha", "walk-free slot");
    eq(r.previousOwner, undefined, "walk-free no prev");
  }

  // Idempotent re-claim
  {
    const { statePath, lockPath } = paths("idempotent");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 2 * 60 * 1000);
    const before = readSlots(statePath);
    await new Promise((res) => setTimeout(res, 5));
    const r = claimSlot({ chatId: "claude-AAA" }, statePath, lockPath);
    eq(r.ok, true, "idempotent ok");
    eq(r.alreadyOwned, true, "idempotent alreadyOwned");
    const after = readSlots(statePath);
    gt(Date.parse(after.slots.alpha.lastHeartbeat), Date.parse(before.slots.alpha.lastHeartbeat), "idempotent hb advanced");
    eq(after.slots.alpha.claimedAt, before.slots.alpha.claimedAt, "idempotent claimedAt unchanged");
  }

  // Recency guard — refused
  {
    const { statePath, lockPath } = paths("recent-refused");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 10 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true }, statePath, lockPath);
    eq(r.ok, false, "recent-refused ok=false");
    eq(r.error, "slot_recently_claimed", "recent-refused error code");
    eq(r.details.slot, "alpha", "recent-refused details.slot");
    eq(r.details.blockedBy.chatId, "claude-AAA", "recent-refused blocker");
    lt(r.details.ageMs, RECENT_CLAIM_GUARD_MS, "recent-refused ageMs<guard");
    eq(readSlots(statePath).slots.alpha.chatId, "claude-AAA", "recent-refused state unchanged");
  }

  // Recency guard — confirmed override
  {
    const { statePath, lockPath } = paths("recent-confirmed");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 10 * 1000);
    const r = claimSlot({ chatId: "claude-BBB", preferSlot: "alpha", force: true, confirmRecent: true }, statePath, lockPath);
    eq(r.ok, true, "recent-confirmed ok");
    eq(r.slot, "alpha", "recent-confirmed slot");
    eq(r.previousOwner.chatId, "claude-AAA", "recent-confirmed prev");
    eq(readSlots(statePath).slots.alpha.chatId, "claude-BBB", "recent-confirmed state.chatId");
  }

  // Default walk past alive slot is NOT subject to recency guard
  {
    const { statePath, lockPath } = paths("walk-no-guard");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000);
    const r = claimSlot({ chatId: "claude-BBB" }, statePath, lockPath);
    eq(r.ok, true, "walk-no-guard ok");
    eq(r.slot, "bravo", "walk-no-guard picks bravo");
    eq(r.previousOwner, undefined, "walk-no-guard no prev");
    eq(readSlots(statePath).slots.alpha.chatId, "claude-AAA", "walk-no-guard alpha unchanged");
    eq(readSlots(statePath).slots.bravo.chatId, "claude-BBB", "walk-no-guard bravo set");
  }

  // BLOCKER #4 fix (arm-C scrutiny 2026-05-14): decoupled timestamps —
  // claimedAt recent (<30s) but lastHeartbeat stale (>10min). This is the
  // "chat just claimed alpha then immediately died" pathology. Default walk
  // sweeps alpha as crashed, then the new walk-recency-guard refuses to
  // silently reclaim it. Operator must force --confirmRecent.
  {
    const { statePath, lockPath } = paths("decoupled-ts");
    cleanups.push(statePath, lockPath);
    const recentClaim = new Date(Date.now() - 10 * 1000).toISOString();
    const staleHb = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    await fsp.mkdir(join(tmpdir(), "prism-chat-slots-smoke"), { recursive: true });
    await fsp.writeFile(statePath, JSON.stringify({
      schemaVersion: 1,
      lastUpdated: staleHb,
      slots: {
        alpha: { chatId: "claude-DIED-FAST", host: "h", pid: 1, claimedAt: recentClaim, lastHeartbeat: staleHb, branch: null, topic: null, activity: null },
        bravo: null, charlie: null, delta: null, echo: null, foxtrot: null, golf: null,
      },
    }));
    const r = claimSlot({ chatId: "claude-NEWCOMER" }, statePath, lockPath);
    // alpha is BOTH crashed (sweep removes) AND recently-claimed (guard fires).
    // Expected: walk skips alpha (guarded), picks bravo. previousOwner not surfaced
    // for bravo (no prior owner there).
    eq(r.ok, true, "decoupled-ts ok");
    eq(r.slot, "bravo", "decoupled-ts walks past alpha to bravo");
    eq(r.previousOwner, undefined, "decoupled-ts no prev on bravo");
    // alpha is now null (swept) but NOT reassigned
    eq(readSlots(statePath).slots.alpha, null, "decoupled-ts alpha left null (guarded)");
    eq(readSlots(statePath).slots.bravo.chatId, "claude-NEWCOMER", "decoupled-ts bravo claimed");
  }

  // BLOCKER #4 boundary case: decoupled timestamps with ALL slots guarded —
  // should return all_slots_recently_claimed
  {
    const { statePath, lockPath } = paths("all-guarded");
    cleanups.push(statePath, lockPath);
    const recentClaim = new Date(Date.now() - 10 * 1000).toISOString();
    const staleHb = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    await fsp.mkdir(join(tmpdir(), "prism-chat-slots-smoke"), { recursive: true });
    const names = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];
    const slots = {};
    for (const n of names) {
      slots[n] = { chatId: "claude-DEAD-" + n, host: "h", pid: 1, claimedAt: recentClaim, lastHeartbeat: staleHb, branch: null, topic: null, activity: null };
    }
    await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 1, lastUpdated: staleHb, slots }));
    const r = claimSlot({ chatId: "claude-LATECOMER" }, statePath, lockPath);
    eq(r.ok, false, "all-guarded ok=false");
    eq(r.error, "all_slots_recently_claimed", "all-guarded error");
    eq(r.details.guardedSlots.length, 7, "all-guarded 7 slots");
    eq(r.details.guardMs, RECENT_CLAIM_GUARD_MS, "all-guarded guardMs");
  }

  // fleet_full
  {
    const { statePath, lockPath } = paths("full");
    cleanups.push(statePath, lockPath);
    const now = new Date().toISOString();
    await fsp.mkdir(join(tmpdir(), "prism-chat-slots-smoke"), { recursive: true });
    const slots = {};
    const names = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];
    for (const n of names) {
      slots[n] = { chatId: "claude-" + n, host: "h", pid: 1, claimedAt: now, lastHeartbeat: now, branch: null, topic: null, activity: null };
    }
    await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 1, lastUpdated: now, slots }));
    const r = claimSlot({ chatId: "claude-INTRUDER" }, statePath, lockPath);
    eq(r.ok, false, "fleet_full ok=false");
    eq(r.error, "fleet_full", "fleet_full error");
  }

  // invalid_input
  {
    const r = claimSlot({}, "ignored", "ignored");
    eq(r.ok, false, "invalid_input ok=false");
    eq(r.error, "invalid_input", "invalid_input error");
    eq(r.message, "chatId required", "invalid_input message");
  }

  // heartbeat refresh
  {
    const { statePath, lockPath } = paths("hb-refresh");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-AAA", 5 * 60 * 1000);
    const before = readSlots(statePath);
    eq(classifySlot(before.slots.alpha), "stale", "hb-refresh pre-class stale");
    const r = heartbeat({ chatId: "claude-AAA", activity: "still working" }, statePath, lockPath);
    eq(r.ok, true, "hb-refresh ok");
    eq(r.slot, "alpha", "hb-refresh slot");
    const after = readSlots(statePath);
    eq(classifySlot(after.slots.alpha), "alive", "hb-refresh post-class alive");
    eq(after.slots.alpha.activity, "still working", "hb-refresh activity update");
    eq(after.slots.alpha.claimedAt, before.slots.alpha.claimedAt, "hb-refresh claimedAt stable");
  }

  // heartbeat refused for non-owner
  {
    const { statePath, lockPath } = paths("hb-orphan");
    cleanups.push(statePath, lockPath);
    await seedEmpty(statePath);
    const r = heartbeat({ chatId: "claude-NOBODY" }, statePath, lockPath);
    eq(r.ok, false, "hb-orphan ok=false");
    eq(r.error, "no_slot_owned", "hb-orphan error");
  }

  // find
  {
    const { statePath } = paths("find");
    cleanups.push(statePath);
    await seedSlot(statePath, "charlie", "claude-FINDME", 30 * 1000);
    const r = findSlotForChat("claude-FINDME", statePath);
    eq(r.slot, "charlie", "find slot");
    eq(r.state.chatId, "claude-FINDME", "find chatId");
    eq(findSlotForChat("claude-NOBODY", statePath), null, "find null for missing");
  }

  // reclaim crashed
  {
    const { statePath, lockPath } = paths("sweep");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "alpha", "claude-DEAD", 12 * 60 * 1000);
    const r = reclaimCrashed(statePath, lockPath);
    eq(r.ok, true, "sweep ok");
    eq(r.reclaimed.length, 1, "sweep count");
    eq(r.reclaimed[0].slot, "alpha", "sweep slot");
    eq(r.reclaimed[0].chatId, "claude-DEAD", "sweep chatId");
    eq(readSlots(statePath).slots.alpha, null, "sweep state cleared");
  }

  // release
  {
    const { statePath, lockPath } = paths("release");
    cleanups.push(statePath, lockPath);
    await seedSlot(statePath, "bravo", "claude-EXIT", 30 * 1000);
    const r = releaseSlot({ chatId: "claude-EXIT" }, statePath, lockPath);
    eq(r.ok, true, "release ok");
    eq(r.slot, "bravo", "release slot");
    eq(readSlots(statePath).slots.bravo, null, "release state cleared");
  }

  // classifySlot boundaries
  eq(classifySlot(null), "idle", "classify null = idle");
  eq(classifySlot({ lastHeartbeat: new Date(Date.now() - 30 * 1000).toISOString() }), "alive", "classify 30s = alive");
  eq(classifySlot({ lastHeartbeat: new Date(Date.now() - (STALE_TTL_MS + 60 * 1000)).toISOString() }), "stale", "classify mid = stale");
  eq(classifySlot({ lastHeartbeat: new Date(Date.now() - (CRASH_TTL_MS + 60 * 1000)).toISOString() }), "crashed", "classify old = crashed");
  eq(classifySlot({ lastHeartbeat: "not-a-date" }), "crashed", "classify nan = crashed");

  // getStatus summary
  {
    const { statePath } = paths("status");
    cleanups.push(statePath);
    await seedSlot(statePath, "alpha", "claude-AAA", 30 * 1000);
    const r = getStatus(statePath);
    eq(r.ok, true, "status ok");
    eq(r.slots.length, 7, "status 7 slots");
    eq(r.summary.alive, 1, "status alive=1");
    eq(r.summary.idle, 6, "status idle=6");
    eq(r.summary.stale, 0, "status stale=0");
    eq(r.summary.crashed, 0, "status crashed=0");
  }
}

run()
  .then(() => {
    for (const p of cleanups) {
      try { rmSync(p, { force: true }); } catch {}
    }
    console.log("");
    console.log("chat-slots-smoke: " + passed + " passed, " + failed + " failed");
    if (failed > 0) {
      console.log("");
      for (const f of failures) console.log(f);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error("smoke runner threw:", e && e.stack ? e.stack : e);
    process.exit(2);
  });
