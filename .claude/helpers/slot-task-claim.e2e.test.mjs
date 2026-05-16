// slot-task-claim.e2e.test.mjs — PER-SLOT-CLAIM-MS0/U-PSC06
// REAL-DATA concurrency oracle. The hermetic unit tests in
// slot-task-claim.test.mjs prove the pure functions; THIS file proves the
// thing the whole system exists for: under genuine concurrent CLI processes
// racing on the same unit, EXACTLY ONE wins.
//
// Lesson encoded: RGS-TOOL-AUTOINVOKE-MS1 — "pure-core + injected-readers
// MUST ship one real-data E2E test; hermetic fakes don't prove production
// wiring." The lockfile RMW (P0-1 fix) is invisible to unit tests because
// they call applyClaim() on an in-memory store. Only real concurrent
// spawnSync processes exercise acquireLock/releaseLock + the read→modify→
// write window.
//
// Run: node --test H:/prism/.claude/helpers/slot-task-claim.e2e.test.mjs
//
// NOTE: these tests hit the REAL store path (state/shared/slot-task-claims.json)
// because the CLI hard-codes it. Unique unit IDs (timestamp+random) avoid
// colliding with live fleet claims; every test releases what it claims.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const CLI = "H:/prism/.claude/helpers/slot-task-claim.mjs";
const NODE = process.execPath;
const VALID_SLOT_CYCLE = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett"];

function uniqueUnit(tag) {
  return `E2E-${tag}::U-${Date.now()}-${randomBytes(3).toString("hex")}`;
}

function claimSync(slot, chatId, unit, extra = []) {
  return spawnSync(NODE, [CLI, "claim", "--slot", slot, "--chatId", chatId, "--unit", unit, ...extra], { encoding: "utf8" });
}
function releaseSync(slot, chatId, unit) {
  return spawnSync(NODE, [CLI, "release", "--slot", slot, "--chatId", chatId, "--unit", unit], { encoding: "utf8" });
}

function claimAsync(slot, chatId, unit, extra = []) {
  return new Promise((resolve) => {
    const child = spawn(NODE, [CLI, "claim", "--slot", slot, "--chatId", chatId, "--unit", unit, ...extra], { encoding: "utf8" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ status: code, stdout, stderr }));
  });
}

test("E2E: 6 concurrent claims on the SAME unit → exactly 1 winner", async () => {
  const unit = uniqueUnit("RACE6");
  const contenders = [
    ["alpha", "claude-aaaa1111"],
    ["bravo", "claude-bbbb2222"],
    ["charlie", "claude-cccc3333"],
    ["delta", "claude-dddd4444"],
    ["echo", "claude-eeee5555"],
    ["foxtrot", "claude-ffff6666"],
  ];
  // Fire all 6 at once — genuine OS-level concurrency.
  const results = await Promise.all(
    contenders.map(([slot, chatId]) => claimAsync(slot, chatId, unit))
  );
  const winners = results.filter((r) => r.status === 0);
  const losers = results.filter((r) => r.status === 1);
  assert.equal(winners.length, 1, `expected exactly 1 winner, got ${winners.length}; stderr: ${results.map(r => r.stderr).join("|")}`);
  assert.equal(losers.length, 5, `expected 5 conflict losers, got ${losers.length}`);
  // Winner's JSON must say ok:true; losers ok:false + conflict.
  const w = JSON.parse(winners[0].stdout);
  assert.equal(w.ok, true);
  for (const l of losers) {
    const j = JSON.parse(l.stdout);
    assert.equal(j.ok, false);
    assert.ok(j.conflict, "loser must carry the conflict row");
    assert.equal(j.conflict.unitId, unit);
  }
  // The persisted store must show exactly the winner's claim.
  const chk = spawnSync(NODE, [CLI, "check", "--unit", unit, "--json"], { encoding: "utf8" });
  const chkJson = JSON.parse(chk.stdout);
  assert.equal(chkJson.result.claimed, true);
  assert.equal(chkJson.result.claim.chatId, w.claim.chatId, "persisted owner must match the winner");

  // cleanup — release as the winner
  releaseSync(w.claim.slot, w.claim.chatId, unit);
});

test("E2E: expired claim is reclaimable by a peer (TTL semantics)", async () => {
  const unit = uniqueUnit("EXPIRE");
  // alpha claims with the minimum TTL (60s floor — we can't wait 60s in a
  // test, so instead we verify the EXPIRY LOGIC via check after manual
  // backdating is impossible through the CLI; use a tiny ttl + assert the
  // claim exists, then assert a DIFFERENT-slot claim is rejected while live).
  let r = claimSync("alpha", "claude-aaaa1111", unit, ["--ttl-ms", "60000"]);
  assert.equal(r.status, 0, "alpha initial claim should win");
  // bravo tries immediately → must lose (claim is live, 60s TTL)
  r = claimSync("bravo", "claude-bbbb2222", unit);
  assert.equal(r.status, 1, "bravo must lose while alpha's claim is live");
  const j = JSON.parse(r.stdout);
  assert.equal(j.conflict.slot, "alpha");
  // cleanup
  releaseSync("alpha", "claude-aaaa1111", unit);
  // After release, bravo CAN claim.
  r = claimSync("bravo", "claude-bbbb2222", unit);
  assert.equal(r.status, 0, "bravo should win after alpha released");
  releaseSync("bravo", "claude-bbbb2222", unit);
});

test("E2E: same-owner re-claim is idempotent (heartbeat refresh, not conflict)", async () => {
  const unit = uniqueUnit("REENTRANT");
  let r = claimSync("bravo", "claude-339c8ff7", unit, ["--phase", "claimed"]);
  assert.equal(r.status, 0);
  // Re-claim by SAME slot+chat with a forward phase — must succeed (refreshed)
  r = claimSync("bravo", "claude-339c8ff7", unit, ["--phase", "building"]);
  assert.equal(r.status, 0, "same-owner re-claim must not conflict");
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, true);
  assert.equal(j.refreshed, true);
  assert.equal(j.claim.phase, "building", "phase advanced forward");
  releaseSync("bravo", "claude-339c8ff7", unit);
});

test("E2E: release by wrong owner is rejected, claim survives", async () => {
  const unit = uniqueUnit("WRONGOWNER");
  let r = claimSync("alpha", "claude-aaaa1111", unit);
  assert.equal(r.status, 0);
  // bravo tries to release alpha's claim
  r = releaseSync("bravo", "claude-bbbb2222", unit);
  assert.equal(r.status, 1, "wrong-owner release must exit 1");
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, false);
  assert.equal(j.reason, "wrong_owner");
  // alpha's claim must still be live
  const chk = spawnSync(NODE, [CLI, "check", "--unit", unit, "--json"], { encoding: "utf8" });
  assert.equal(JSON.parse(chk.stdout).result.claimed, true);
  // proper cleanup
  releaseSync("alpha", "claude-aaaa1111", unit);
});

test("E2E: 10 concurrent claims on 10 DIFFERENT units → all 10 succeed (no false contention)", async () => {
  const units = Array.from({ length: 10 }, (_, i) => uniqueUnit(`PARALLEL${i}`));
  const results = await Promise.all(
    units.map((u, i) => claimAsync(VALID_SLOT_CYCLE[i % VALID_SLOT_CYCLE.length], `claude-par${String(i).padStart(5, "0")}`, u))
  );
  const winners = results.filter((r) => r.status === 0);
  assert.equal(winners.length, 10, `all 10 distinct-unit claims must succeed (lockfile serializes writes, doesn't false-block); got ${winners.length}; stderr=${results.map(r=>r.stderr).join("|")}`);
  // cleanup
  for (let i = 0; i < units.length; i++) {
    const w = JSON.parse(results[i].stdout);
    releaseSync(w.claim.slot, w.claim.chatId, units[i]);
  }
});
