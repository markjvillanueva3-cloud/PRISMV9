#!/usr/bin/env node
/**
 * chat-slots-slot-truth.smoke.mjs — plain-node smoke test for U-SLOT-TRUTH.
 *
 * The full vitest suite at chat-slots.test.mjs can't run because the
 * helpers/ vitest config is broken (pre-existing infra bug, see
 * [[reference_fleet_reaper]] memory). This smoke covers the load-bearing
 * new behaviors so the U-SLOT-TRUTH ship is verifiable without vitest.
 *
 * Usage: node chat-slots-slot-truth.smoke.mjs
 * Expects: ALL 8 checks pass with "ok" prefix. Exit 0 = all pass.
 */
import { promises as fsp } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claimSlot, heartbeat, readSlots,
  CRASH_TTL_MS, LIVE_INHERIT_GUARD_MS, FORWARD_DATE_HEARTBEAT_CAP_MS,
} from "./chat-slots.mjs";

const SLOT_LIST = ["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett"];
let failures = 0;
let checks = 0;

function check(name, predicate, detail = "") {
  checks += 1;
  if (predicate) {
    console.log(`ok  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} — ${detail}`);
  }
}

function tmpPaths(tag) {
  const dir = join(tmpdir(), "prism-slot-truth-smoke");
  const id = `${tag}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { statePath: join(dir, `${id}.json`), lockPath: join(dir, `${id}.lock`) };
}

async function seedSlot(statePath, slot, chatId, ageMs, terminalWindowId) {
  const ts = new Date(Date.now() - ageMs).toISOString();
  const slots = {};
  SLOT_LIST.forEach(n => { slots[n] = null; });
  slots[slot] = {
    chatId, host: "smoke", pid: 1, claimedAt: ts, lastHeartbeat: ts,
    branch: null, topic: null, activity: null,
    terminalWindowId: terminalWindowId || null,
  };
  await fsp.mkdir(join(tmpdir(), "prism-slot-truth-smoke"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 2, lastUpdated: ts, slots }));
}

// ─── Check 1: safety invariant ──────────────────────────────────────────
check(
  "FORWARD_DATE_HEARTBEAT_CAP_MS < CRASH_TTL_MS (safety invariant)",
  FORWARD_DATE_HEARTBEAT_CAP_MS < CRASH_TTL_MS,
  `cap=${FORWARD_DATE_HEARTBEAT_CAP_MS} crash=${CRASH_TTL_MS}`,
);

// ─── Check 2: LIVE_INHERIT_GUARD_MS exported ────────────────────────────
check(
  "LIVE_INHERIT_GUARD_MS exported and positive",
  typeof LIVE_INHERIT_GUARD_MS === "number" && LIVE_INHERIT_GUARD_MS > 0,
  `value=${LIVE_INHERIT_GUARD_MS}`,
);

// ─── Check 3: live-collision guard fires + walks to fresh slot ──────────
{
  const { statePath, lockPath } = tmpPaths("collision");
  await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000, "tw-shared");
  const r = claimSlot({ chatId: "claude-BBB", terminalWindowId: "tw-shared" }, statePath, lockPath);
  check(
    "live-collision: chat B refused alpha, walked to bravo, windowCollision surfaced",
    r.ok && r.slot === "bravo" && r.windowCollision &&
    r.windowCollision.blockedSlot === "alpha" && r.windowCollision.finalSlot === "bravo",
    `r=${JSON.stringify(r).slice(0, 200)}`,
  );
  const post = readSlots(statePath);
  check(
    "live-collision: chat A still owns alpha (NOT overwritten)",
    post.slots.alpha && post.slots.alpha.chatId === "claude-AAA",
    `alpha.chatId=${post.slots.alpha?.chatId}`,
  );
  await fsp.rm(statePath, { force: true });
}

// ─── Check 4: stale heartbeat — inheritance proceeds ─────────────────────
{
  const { statePath, lockPath } = tmpPaths("stale-inherit");
  const staleMs = LIVE_INHERIT_GUARD_MS + 10 * 1000;
  await seedSlot(statePath, "alpha", "claude-AAA", staleMs, "tw-stale");
  const r = claimSlot({ chatId: "claude-BBB", terminalWindowId: "tw-stale" }, statePath, lockPath);
  check(
    "stale-heartbeat: chat B inherits alpha via terminal-pin (no collision)",
    r.ok && r.slot === "alpha" && r.terminalPinned === true && r.previousChatId === "claude-AAA" && r.windowCollision === undefined,
    `r=${JSON.stringify(r).slice(0, 200)}`,
  );
  await fsp.rm(statePath, { force: true });
}

// ─── Check 5: forwardDateMs cap enforced ─────────────────────────────────
{
  const { statePath, lockPath } = tmpPaths("fwd-cap");
  await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000, null);
  const before = Date.now();
  const r = heartbeat({ chatId: "claude-AAA", forwardDateMs: 60 * 60 * 1000 }, statePath, lockPath);
  const hbMs = Date.parse(r.state.lastHeartbeat);
  check(
    "forwardDateMs=1hr capped to FORWARD_DATE_HEARTBEAT_CAP_MS (9min)",
    r.ok && hbMs <= before + FORWARD_DATE_HEARTBEAT_CAP_MS + 1000 && hbMs > before + FORWARD_DATE_HEARTBEAT_CAP_MS - 5000,
    `hb=${hbMs} before=${before} cap=${FORWARD_DATE_HEARTBEAT_CAP_MS} diff=${hbMs - before}`,
  );
  await fsp.rm(statePath, { force: true });
}

// ─── Check 6: forwardDateMs=Infinity → rejected (treated as 0) ──────────
{
  const { statePath, lockPath } = tmpPaths("fwd-infinity");
  await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000, null);
  const before = Date.now();
  const r = heartbeat({ chatId: "claude-AAA", forwardDateMs: Infinity }, statePath, lockPath);
  const hbMs = Date.parse(r.state.lastHeartbeat);
  check(
    "forwardDateMs=Infinity rejected (lastHeartbeat ~= now)",
    r.ok && hbMs >= before && hbMs < before + 5000,
    `hb=${hbMs} before=${before} diff=${hbMs - before}`,
  );
  await fsp.rm(statePath, { force: true });
}

// ─── Check 7: forward-dated heartbeat survives concurrent claim ─────────
{
  const { statePath, lockPath } = tmpPaths("fwd-survival");
  await seedSlot(statePath, "alpha", "claude-AAA", 5 * 1000, null);
  const hbRes = heartbeat({ chatId: "claude-AAA", forwardDateMs: 5 * 60 * 1000 }, statePath, lockPath);
  if (!hbRes.ok) throw new Error("heartbeat failed in survival test");
  const r = claimSlot({ chatId: "claude-BBB" }, statePath, lockPath);
  const post = readSlots(statePath);
  check(
    "forward-dated slot survives: chat B walked to bravo, alpha still chat A",
    r.ok && r.slot === "bravo" && post.slots.alpha && post.slots.alpha.chatId === "claude-AAA",
    `r.slot=${r.slot} alpha.chatId=${post.slots.alpha?.chatId}`,
  );
  await fsp.rm(statePath, { force: true });
}

// ─── Check 8: fleet_full carries windowCollision ────────────────────────
{
  const { statePath, lockPath } = tmpPaths("fleet-full");
  const now = new Date().toISOString();
  const slots = {};
  SLOT_LIST.forEach((n, i) => {
    slots[n] = {
      chatId: `claude-${n.toUpperCase()}`, host: "smoke", pid: 100 + i,
      claimedAt: now, lastHeartbeat: now,
      branch: null, topic: null, activity: null,
      terminalWindowId: n === "alpha" ? "tw-shared-full" : `tw-${n}`,
    };
  });
  await fsp.mkdir(join(tmpdir(), "prism-slot-truth-smoke"), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify({ schemaVersion: 2, lastUpdated: now, slots }));
  const r = claimSlot({ chatId: "claude-NEW", terminalWindowId: "tw-shared-full" }, statePath, lockPath);
  check(
    "fleet_full: windowCollision still surfaced when no fresh slot found",
    !r.ok && r.error === "fleet_full" && r.windowCollision &&
    r.windowCollision.blockedSlot === "alpha" && r.windowCollision.finalSlot === null,
    `r=${JSON.stringify(r).slice(0, 200)}`,
  );
  await fsp.rm(statePath, { force: true });
}

console.log(`\n${checks - failures}/${checks} checks pass${failures > 0 ? ` — ${failures} FAILURE(S)` : ""}`);
process.exit(failures > 0 ? 1 : 0);
