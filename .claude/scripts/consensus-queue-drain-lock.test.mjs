#!/usr/bin/env node
// tier: test
// Concurrency guard for the consensus-queue-drain LOCK fix (slot:bravo, 2026-06-17).
//
// The drain fires on EVERY chat's Stop across the 26-slot fleet; before this fix it
// read the whole queue, processed N, then writeQueue(remaining) ONCE at the end with
// NO lock -- two concurrent drains clobbered each other (resurrected/lost entries +
// duplicate Ollama spend). claimNextEntry() now claims ONE entry atomically under the
// canonical exclusive-file-lock. This test spawns TWO real node processes that hammer
// claimNextEntry() against a shared seeded queue and asserts the INVARIANT that holds
// under ANY interleaving: every entry is claimed EXACTLY ONCE (disjoint sets, complete
// union). Remove the lock and two processes shift the same first entry -> the union is
// short + a hash appears twice -> this test fails. (R9: fails when the logic regresses.)

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { acquireDrainProcessLock, releaseDrainProcessLock } from "./consensus-queue-drain.mjs";

const DRAIN_URL = new URL("./consensus-queue-drain.mjs", import.meta.url).href;
const DRAIN_PATH = fileURLToPath(new URL("./consensus-queue-drain.mjs", import.meta.url));

function seedQueue(queuePath, n) {
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(JSON.stringify({ prompt_hash: `h${String(i).padStart(4, "0")}`, prompt: `p${i}`, task_type: "auto" }));
  }
  writeFileSync(queuePath, lines.join("\n") + "\n", "utf-8");
}
function readQueueHashes(queuePath) {
  if (!existsSync(queuePath)) return [];
  return readFileSync(queuePath, "utf-8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l).prompt_hash; } catch { return null; } })
    .filter(Boolean);
}

// --- Process-level overlap lock (the 26x-concurrent-Ollama herd fix, slot:bravo) ---
// The per-entry claim lock (below) guarantees exactly-once CLAIMS, but every slot's Stop still
// spun up a PARALLEL engine + Ollama call. The process lock makes a concurrent drain SKIP so
// only ONE drain runs at a time fleet-wide. R9: `held -> acquired:false` fails if the lock is
// removed (both drains would "run" -> the herd).
test("drain process-lock: free->acquire, held->SKIP, release->re-acquire (no parallel drains)", () => {
  const dir = mkdtempSync(join(tmpdir(), "cqd-plock-"));
  const lk = join(dir, "drain-process.lock");
  try {
    const a = acquireDrainProcessLock(lk);
    assert.equal(a.acquired, true, "first drain acquires the process lock");
    const b = acquireDrainProcessLock(lk);
    assert.equal(b.acquired, false, "a CONCURRENT drain SKIPS -- no 26x parallel Ollama herd");
    releaseDrainProcessLock(lk);
    const c = acquireDrainProcessLock(lk);
    assert.equal(c.acquired, true, "after release the next drain can run");
    releaseDrainProcessLock(lk);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// A worker process: import claimNextEntry, loop-claim with a tiny inter-claim sleep
// (forces interleaving so the no-lock failure mode is actually exercised), print the
// claimed prompt_hashes as JSON. NOT a drain (no engine.ask) -- pure claim logic.
const WORKER_SRC = `
import { claimNextEntry } from ${JSON.stringify(DRAIN_URL)};
function sleep(ms){ const b=new Int32Array(new SharedArrayBuffer(4)); Atomics.wait(b,0,0,ms); }
const claimed=[];
let r;
while ((r = claimNextEntry()) && r.entry) { claimed.push(r.entry.prompt_hash); sleep(2); }
process.stdout.write(JSON.stringify(claimed));
`;

function runWorker(workerPath, queuePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [workerPath], {
      env: { ...process.env, PRISM_CONSENSUS_QUEUE: queuePath },
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", () => { try { resolve(JSON.parse(out.trim() || "[]")); } catch { resolve([]); } });
  });
}

test("two concurrent claimers partition the queue: exactly-once (disjoint + complete)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-drainlock-"));
  const queuePath = join(dir, "consensus-queue.jsonl");
  const workerPath = join(dir, "claim-worker.mjs");
  try {
    const N = 30;
    seedQueue(queuePath, N);
    writeFileSync(workerPath, WORKER_SRC, "utf-8");

    const [a, b] = await Promise.all([runWorker(workerPath, queuePath), runWorker(workerPath, queuePath)]);
    const all = [...a, ...b];

    // No entry claimed twice (the lock prevents two procs shifting the same head).
    assert.equal(new Set(all).size, all.length, `duplicate claim detected: ${all.length} claims, ${new Set(all).size} unique`);
    // Every seeded entry was claimed exactly once (none lost to a clobbering write).
    assert.equal(all.length, N, `expected ${N} total claims, got ${all.length}`);
    // The queue file is fully drained.
    assert.equal(readQueueHashes(queuePath).length, 0, "queue should be empty after both workers drain it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("claimNextEntry removes the claimed entry from the queue (claim-by-remove / at-most-once)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-drainlock-"));
  const queuePath = join(dir, "consensus-queue.jsonl");
  try {
    seedQueue(queuePath, 3);
    // The module captures QUEUE_PATH from env at import, so spawn a single-claim
    // worker with PRISM_CONSENSUS_QUEUE pointed at the temp queue (env-clean).
    const workerPath = join(dir, "one-claim.mjs");
    writeFileSync(workerPath, `
import { claimNextEntry } from ${JSON.stringify(DRAIN_URL)};
const r = claimNextEntry();
process.stdout.write(JSON.stringify(r.entry ? r.entry.prompt_hash : null));
`, "utf-8");
    const got = await runWorker(workerPath, queuePath); // returns the parsed JSON (the hash string)
    assert.equal(got, "h0000", "first claim should be the head entry");
    const left = readQueueHashes(queuePath);
    assert.equal(left.length, 2, "exactly one entry removed");
    assert.ok(!left.includes("h0000"), "the claimed entry must be gone from the queue");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty queue -> {entry:null, locked:false} (no spurious claim)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-drainlock-"));
  const queuePath = join(dir, "consensus-queue.jsonl");
  try {
    writeFileSync(queuePath, "", "utf-8");
    const workerPath = join(dir, "empty.mjs");
    writeFileSync(workerPath, `
import { claimNextEntry } from ${JSON.stringify(DRAIN_URL)};
const r = claimNextEntry();
process.stdout.write(JSON.stringify({ entry: r.entry, locked: r.locked }));
`, "utf-8");
    const child = spawn(process.execPath, [workerPath], {
      env: { ...process.env, PRISM_CONSENSUS_QUEUE: queuePath },
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    await new Promise((res) => { child.stdout.on("data", (d) => { out += d; }); child.on("close", res); });
    const r = JSON.parse(out.trim() || "{}");
    assert.equal(r.entry, null, "empty queue yields no entry");
    assert.equal(r.locked, false, "empty queue is not a lock-contention stop");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  void DRAIN_PATH;
});
