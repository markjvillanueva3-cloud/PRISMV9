#!/usr/bin/env node
// commit-coordinator.test.mjs — COMMIT-COORD-MS0 verification.
// Covers rps-core.mjs (deterministic RPS math) + commit-coordinator.mjs
// (acquire / release / heartbeat / status / reap, RPS-arbitrated queue,
// stale reaping, corrupt-store fail-soft).
//
// Run: node --test .claude/helpers/commit-coordinator.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

// Isolated store — MUST be set before the coordinator module is imported.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "cc-test-"));
process.env.PRISM_COMMIT_COORD_STORE = path.join(TMP, "store.json");
process.env.PRISM_COMMIT_COORD_BUS = path.join(TMP, "bus.jsonl");

const { resolveWinner, deterministicTieBreak, rpsDuel, rpsTournament } = await import(
  "./lib/rps-core.mjs"
);
const { cmdAcquire, cmdRelease, cmdHeartbeat, cmdStatus, cmdReap, STORE_PATH } = await import(
  "./commit-coordinator.mjs"
);

function reset() {
  for (const p of [STORE_PATH, STORE_PATH + ".lock"]) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* ignore */
    }
  }
}

// ── rps-core ────────────────────────────────────────────────────────────────
test("resolveWinner — canonical RPS rules", () => {
  assert.equal(resolveWinner("r", "s"), 1);
  assert.equal(resolveWinner("p", "r"), 1);
  assert.equal(resolveWinner("s", "p"), 1);
  assert.equal(resolveWinner("s", "r"), 2);
  assert.equal(resolveWinner("r", "p"), 2);
  assert.equal(resolveWinner("p", "s"), 2);
  assert.equal(resolveWinner("r", "r"), 0);
});

test("deterministicTieBreak — stable + valid play", () => {
  const a = deterministicTieBreak("seed-x", 3);
  const b = deterministicTieBreak("seed-x", 3);
  assert.equal(a, b, "same seed+round must yield same play");
  assert.ok(["r", "p", "s"].includes(a));
});

test("rpsDuel — always yields a winner, never throws on distinct players", () => {
  for (let i = 0; i < 50; i += 1) {
    const d = rpsDuel(`chat-${i}`, `chat-${i + 100}`, `seed-${i}`);
    assert.ok(d.winner === `chat-${i}` || d.winner === `chat-${i + 100}`);
    assert.ok(d.loser !== d.winner);
    assert.ok(typeof d.resolution === "string" && d.resolution.length > 0);
  }
});

test("rpsDuel — deterministic + symmetric refusal of self-duel", () => {
  const a = rpsDuel("alpha", "bravo", "fixed-seed");
  const b = rpsDuel("alpha", "bravo", "fixed-seed");
  assert.equal(a.winner, b.winner);
  assert.throws(() => rpsDuel("same", "same", "seed"));
});

test("rpsTournament — total order over N participants, deterministic", () => {
  const ids = ["claude-aaaa", "claude-bbbb", "claude-cccc", "claude-dddd"];
  const t1 = rpsTournament(ids, "round-7");
  const t2 = rpsTournament(ids, "round-7");
  assert.deepEqual(t1.ranked, t2.ranked, "same seed → same ranking");
  assert.equal(t1.ranked.length, 4);
  assert.deepEqual([...t1.ranked].sort(), [...ids].sort(), "every participant ranked exactly once");
  assert.deepEqual(rpsTournament(["solo"], "s").ranked, ["solo"]);
  assert.deepEqual(rpsTournament([], "s").ranked, []);
});

// ── coordinator ─────────────────────────────────────────────────────────────
test("acquire — free lane grants + records holder", () => {
  reset();
  const r = cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  assert.equal(r.granted, true);
  assert.equal(r.holder.chatId, "claude-aaaaaaaa");
  assert.equal(r.queuePos, 0);
});

test("acquire — second chat queues behind holder", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  const r = cmdAcquire("claude-bbbbbbbb", "bravo", "commit");
  assert.equal(r.granted, false);
  assert.equal(r.holder.chatId, "claude-aaaaaaaa");
  assert.equal(r.queuePos, 1);
  assert.equal(r.queueLen, 1);
});

test("acquire — holder re-acquire refreshes, does not double-hold", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  const r = cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  assert.equal(r.granted, true);
  assert.equal(r.queueLen, 0);
});

test("release — single waiter is RPS-promoted to holder", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  cmdAcquire("claude-bbbbbbbb", "bravo", "commit");
  const rel = cmdRelease("claude-aaaaaaaa");
  assert.equal(rel.released, true);
  assert.equal(rel.nextHolder, "claude-bbbbbbbb");
  const st = cmdStatus();
  assert.equal(st.holder.chatId, "claude-bbbbbbbb");
  assert.equal(st.holder.promoted, true);
  assert.equal(st.queueLen, 0);
});

test("release — RPS picks next among multiple waiters, loser stays queued", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  cmdAcquire("claude-bbbbbbbb", "bravo", "commit");
  cmdAcquire("claude-cccccccc", "charlie", "commit");
  const rel = cmdRelease("claude-aaaaaaaa");
  assert.equal(rel.released, true);
  assert.ok(["claude-bbbbbbbb", "claude-cccccccc"].includes(rel.nextHolder));
  assert.equal(rel.rps.ranked.length, 2);
  const st = cmdStatus();
  assert.equal(st.holder.chatId, rel.nextHolder);
  assert.equal(st.queueLen, 1, "the RPS loser remains queued");
});

test("release — non-holder release is a safe no-op", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  const rel = cmdRelease("claude-zzzzzzzz");
  assert.equal(rel.released, false);
  assert.equal(rel.reason, "not-holder");
  assert.equal(cmdStatus().holder.chatId, "claude-aaaaaaaa", "real holder untouched");
});

test("heartbeat + status — holder lease refresh", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  const hb = cmdHeartbeat("claude-aaaaaaaa");
  assert.equal(hb.ok, true);
  assert.equal(hb.isHolder, true);
  const st = cmdStatus();
  assert.equal(st.holder.chatId, "claude-aaaaaaaa");
  assert.ok(st.holder.heartbeatAgeMs < 5000);
});

test("reap — a stale holder is dropped, next chat takes the lane", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  // age the holder heartbeat past HOLDER_STALE_MS (120s)
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  store.holder.heartbeat = new Date(Date.now() - 200 * 1000).toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  const r = cmdAcquire("claude-bbbbbbbb", "bravo", "commit");
  assert.equal(r.granted, true, "stale holder reaped → next chat acquires");
  assert.equal(r.holder.chatId, "claude-bbbbbbbb");
});

test("corrupt store — fail-soft recovery, acquire still works", () => {
  reset();
  fs.writeFileSync(STORE_PATH, "{ this is not json");
  const r = cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  assert.equal(r.granted, true, "corrupt store must not wedge the lane");
});

test("reap command — reports stale entries removed", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  store.holder.heartbeat = new Date(Date.now() - 300 * 1000).toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  const r = cmdReap();
  assert.equal(r.reapedHolder, "claude-aaaaaaaa");
  assert.equal(cmdStatus().holder, null);
});

test("acquire — invalid chatId is rejected by the regex contract", () => {
  reset();
  // cmdAcquire itself trusts the caller; the CLI guards chatId. Verify the
  // store layer drops a malformed holder on reload (defensive normalisation).
  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify({ schemaVersion: "1.0.0", holder: { chatId: "!!bad" }, queue: [] }),
  );
  const r = cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  assert.equal(r.granted, true, "malformed holder dropped → lane free");
});

test("heartbeat — strictly advances the holder lease, persists to store", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  // Age the holder heartbeat ~35s into the past — INSIDE the 45s stale window
  // so the holder is not reaped — then heartbeat and confirm the stored
  // timestamp ACTUALLY moved forward, not merely that ok===true.
  const stale = new Date(Date.now() - 35 * 1000).toISOString();
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  store.holder.heartbeat = stale;
  fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  const before = cmdStatus().holder.heartbeatAgeMs;
  assert.ok(before >= 30 * 1000, "precondition: lease aged ~35s, still un-reaped");
  const hb = cmdHeartbeat("claude-aaaaaaaa");
  assert.equal(hb.ok, true);
  const after = cmdStatus().holder.heartbeatAgeMs;
  assert.ok(after < 5 * 1000, "heartbeat reset the lease to ~now");
  assert.ok(after < before, "heartbeat STRICTLY advanced the lease");
  const persisted = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")).holder.heartbeat;
  assert.notEqual(persisted, stale, "advanced heartbeat is persisted to the store");
});

test("heartbeat — refreshes a queued waiter's lease (queue branch)", () => {
  reset();
  cmdAcquire("claude-aaaaaaaa", "alpha", "commit");
  cmdAcquire("claude-bbbbbbbb", "bravo", "commit"); // B queues behind holder A
  // Age B's queue-entry lease 60s into the past — inside QUEUE_STALE_MS (180s)
  // so the waiter is not reaped — then heartbeat B and confirm the non-holder
  // branch of cmdHeartbeat actually refreshes + persists the queue entry.
  const stale = new Date(Date.now() - 60 * 1000).toISOString();
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  const qb = store.queue.find((e) => e.chatId === "claude-bbbbbbbb");
  assert.ok(qb, "precondition: B is queued behind A");
  qb.heartbeat = stale;
  fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  const hb = cmdHeartbeat("claude-bbbbbbbb");
  assert.equal(hb.ok, true);
  assert.equal(hb.isHolder, false, "B is a waiter, not the holder");
  const after = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")).queue.find(
    (e) => e.chatId === "claude-bbbbbbbb",
  );
  assert.notEqual(after.heartbeat, stale, "queued waiter's lease was refreshed + persisted");
});

test("acquire — N concurrent child processes: exactly one wins, rest queue", async () => {
  // True concurrency: spawn N OS processes that race for one fresh lane.
  // The lockfile-guarded atomic RMW (60×50ms budget) must serialise them so
  // exactly one is granted and the rest queue cleanly — zero fail-opens.
  const concTmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-conc-"));
  const concStore = path.join(concTmp, "store.json");
  const coordinator = fileURLToPath(new URL("./commit-coordinator.mjs", import.meta.url));
  const childEnv = {
    ...process.env,
    PRISM_COMMIT_COORD_STORE: concStore,
    PRISM_COMMIT_COORD_BUS: path.join(concTmp, "bus.jsonl"),
  };
  const N = 6;
  const ids = Array.from({ length: N }, (_, i) => `claude-${String.fromCharCode(97 + i).repeat(8)}`);
  const results = await Promise.all(
    ids.map(
      (id) =>
        new Promise((resolve) => {
          execFile(
            process.execPath,
            [coordinator, "acquire", "--chatId", id, "--slot", "race"],
            { env: childEnv, timeout: 15000 },
            (_err, stdout) => {
              try {
                resolve(JSON.parse(String(stdout).trim().split("\n").pop()));
              } catch {
                resolve({ granted: false, parseError: true });
              }
            },
          );
        }),
    ),
  );
  assert.equal(results.filter((r) => r.parseError).length, 0, "every child emitted valid JSON");
  const winners = results.filter((r) => r.granted === true);
  assert.equal(winners.length, 1, `exactly one child wins the lane (got ${winners.length})`);
  assert.equal(winners[0].failOpen, undefined, "the winner won via the lock, not fail-open");
  assert.equal(
    results.filter((r) => r.granted === false).length,
    N - 1,
    "every other child queued — none crashed, none double-granted",
  );
});
