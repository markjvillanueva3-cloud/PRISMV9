// scripts/lib/exclusive-file-lock.test.mjs — BRAIN-UPGRADE rank 12 (2026-05-30 slot:alpha).
//
// Unit tests + a REAL cross-process concurrent oracle. The oracle is the
// fail-on-revert proof that O_EXCL acquire SERIALIZES contending writers with no
// lost update — the exact scenario that exposed system-graph-write-lock.mjs's
// read-decide-write TOCTOU (4 hammering writers → 3 survived). A hermetic mock
// cannot prove cross-process atomicity (the RGS-MS1 / FLEET-REAPER lesson), so
// this drives the lock across real PIDs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  acquireExclusiveLock,
  releaseExclusiveLock,
  withExclusiveLock,
  DEFAULTS,
} from "./exclusive-file-lock.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_URL = pathToFileURL(path.join(__dirname, "exclusive-file-lock.mjs")).href;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "excl-lock-test-"));

test("acquire on a free path creates the lock file stamped with our pid", () => {
  const lp = path.join(tmpDir(), "x.lock");
  const lk = acquireExclusiveLock(lp, { selfPid: 111 });
  assert.equal(lk.acquired, true);
  assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, 111);
});

test("a fresh held lock blocks acquire within the retry window (defer)", () => {
  const lp = path.join(tmpDir(), "x.lock");
  assert.equal(acquireExclusiveLock(lp, { selfPid: 1 }).acquired, true);
  // second acquirer, short window, lock is fresh → cannot get it
  const lk2 = acquireExclusiveLock(lp, { selfPid: 2, retries: 3, retryMs: 5, staleMs: 60_000 });
  assert.equal(lk2.acquired, false);
});

test("release removes ONLY our own lock; a peer's lock is left intact", () => {
  const lp = path.join(tmpDir(), "x.lock");
  acquireExclusiveLock(lp, { selfPid: 1 });
  releaseExclusiveLock(lp, { selfPid: 2 }); // not owner → must NOT remove
  assert.equal(fs.existsSync(lp), true);
  releaseExclusiveLock(lp, { selfPid: 1 }); // owner → removed
  assert.equal(fs.existsSync(lp), false);
});

test("a stale lock (mtime older than staleMs) is stolen", () => {
  const lp = path.join(tmpDir(), "x.lock");
  acquireExclusiveLock(lp, { selfPid: 999 });
  // backdate mtime 10 minutes
  const old = new Date(Date.now() - 10 * 60_000);
  fs.utimesSync(lp, old, old);
  const lk = acquireExclusiveLock(lp, { selfPid: 1000, staleMs: 1000, retries: 3, retryMs: 5 });
  assert.equal(lk.acquired, true);
  assert.equal(lk.stolenStale, true);
  assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, 1000);
});

test("withExclusiveLock runs fn under the lock and releases after", () => {
  const lp = path.join(tmpDir(), "x.lock");
  let ranWith;
  const r = withExclusiveLock(lp, () => { ranWith = fs.existsSync(lp); return 42; }, { selfPid: 7 });
  assert.equal(r.ran, true);
  assert.equal(r.value, 42);
  assert.equal(ranWith, true, "lock file existed during fn");
  assert.equal(fs.existsSync(lp), false, "released after fn");
});

test("withExclusiveLock returns {ran:false} without calling fn when held", () => {
  const lp = path.join(tmpDir(), "x.lock");
  acquireExclusiveLock(lp, { selfPid: 1 });
  let called = false;
  const r = withExclusiveLock(lp, () => { called = true; }, { selfPid: 2, retries: 2, retryMs: 5, staleMs: 60_000 });
  assert.equal(r.ran, false);
  assert.equal(called, false);
});

test("DEFAULTS are frozen and sane", () => {
  assert.equal(Object.isFrozen(DEFAULTS), true);
  assert.equal(DEFAULTS.retries, 50);
  assert.equal(DEFAULTS.staleMs, 30_000);
});

// ── Cross-process oracle ────────────────────────────────────────────────────
function workerSource() {
  return `
import fs from "node:fs";
import { acquireExclusiveLock, releaseExclusiveLock } from ${JSON.stringify(MODULE_URL)};
const [, , dataPath, lockPath, id, sleepMs, deadlineMs] = process.argv;
const SLEEP = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => Atomics.wait(SLEEP, 0, 0, Math.max(0, ms | 0));
const start = Date.now();
while (Date.now() - start < Number(deadlineMs)) {
  const lk = acquireExclusiveLock(lockPath, { retries: 200, retryMs: 25, staleMs: 60000, selfPid: process.pid });
  if (lk.acquired) {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      sleep(Number(sleepMs));                  // widen the RMW window — a non-atomic lock loses updates here
      data.entries.push({ id: "w" + id });
      const tmp = dataPath + ".tmp." + process.pid;
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, dataPath);
    } finally {
      releaseExclusiveLock(lockPath, { selfPid: process.pid });
    }
    process.exit(0);
  }
  sleep(20);
}
process.exit(7);
`;
}

function spawnWorker(workerPath, dataPath, lockPath, id, sleepMs, deadlineMs) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [workerPath, dataPath, lockPath, String(id), String(sleepMs), String(deadlineMs)],
      { stdio: "ignore" },
    );
    child.on("exit", (code) => resolve(code));
    child.on("error", () => resolve(-1));
  });
}

test("CROSS-PROCESS: O_EXCL serializes concurrent RMW — every append survives", async () => {
  const dir = tmpDir();
  const dataPath = path.join(dir, "data.json");
  const lockPath = path.join(dir, "data.json.lock");
  fs.writeFileSync(dataPath, JSON.stringify({ entries: [] }));
  const workerPath = path.join(dir, "worker.mjs");
  fs.writeFileSync(workerPath, workerSource());

  const N = 5;
  const codes = await Promise.all(
    Array.from({ length: N }, (_, i) => spawnWorker(workerPath, dataPath, lockPath, i, 50, 20000)),
  );
  // Every worker must acquire + commit (exit 0). Spawn failure (host wedged) →
  // FAIL LOUD (codes contain -1/7), never a silent pass (R12).
  assert.deepEqual(codes.slice().sort(), Array(N).fill(0), `worker exit codes: ${codes}`);

  const final = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  assert.equal(final.entries.length, N, "no append lost under concurrent contention");
  const ids = new Set(final.entries.map((e) => e.id));
  for (let i = 0; i < N; i++) assert.ok(ids.has("w" + i), `entry w${i} present`);
});

test("CROSS-PROCESS STALE-STEAL: simultaneous stealers of one stale lock still serialize", async () => {
  // Stale-steal SERIALIZATION oracle (per-file scrutiny P1, 2026-05-30): pre-seed ONE
  // stale lock (old mtime), launch N workers together so they ALL see it stale at
  // startup and race to steal it. The atomic rename-steal gives single-winner
  // semantics → every append survives.
  // R12 honesty (scrutiny arm B, empirical): this proves stealers SERIALIZE under
  // concurrent steal (liveness) — it is NOT a strict fail-on-revert proof of the
  // blind-unlink bug. On Windows the lock fd closes immediately and the stat→unlink
  // window is sub-microsecond, so a reverted blind-unlink form could not be made to
  // lose an append across 90+ race iterations. The rename-steal's correctness is
  // by-construction (rename atomicity: exactly one stealer wins, the loser ENOENTs),
  // not merely empirical. The plain-RMW oracle above IS load-bearing fail-on-revert
  // (a no-op/absent lock loses appends there).
  const dir = tmpDir();
  const dataPath = path.join(dir, "data.json");
  const lockPath = path.join(dir, "data.json.lock");
  fs.writeFileSync(dataPath, JSON.stringify({ entries: [] }));
  // seed a stale lock owned by a dead-ish pid, mtime 10 min old (> the worker's 60s staleMs)
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 424242, acquiredAt: "2000-01-01T00:00:00.000Z" }));
  const old = new Date(Date.now() - 10 * 60_000);
  fs.utimesSync(lockPath, old, old);
  const workerPath = path.join(dir, "worker.mjs");
  fs.writeFileSync(workerPath, workerSource()); // workerSource uses staleMs:60000 → the 10-min lock is stale

  const N = 5;
  const codes = await Promise.all(
    Array.from({ length: N }, (_, i) => spawnWorker(workerPath, dataPath, lockPath, i, 50, 20000)),
  );
  assert.deepEqual(codes.slice().sort(), Array(N).fill(0), `worker exit codes: ${codes}`);
  const final = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  assert.equal(final.entries.length, N, "no append lost while concurrently stealing a stale lock");
});

test("release on a garbage/unparseable lock is a no-op (does not remove it)", () => {
  const lp = path.join(tmpDir(), "x.lock");
  fs.writeFileSync(lp, "not json at all");
  releaseExclusiveLock(lp, { selfPid: 1 }); // unparseable → must not throw, must not remove
  assert.equal(fs.existsSync(lp), true, "garbage lock left for staleMs self-heal, not blindly removed");
});

test("withExclusiveLock releases synchronously (the sync-fn contract)", () => {
  // Documents/pins the footgun the docstring warns about: the lock is released the
  // instant fn() RETURNS. With an async fn, that is BEFORE the promise settles —
  // so async critical sections must use acquire/release directly, not this helper.
  const lp = path.join(tmpDir(), "x.lock");
  const r = withExclusiveLock(lp, () => Promise.resolve("async-ish"), { selfPid: 5 });
  assert.equal(r.ran, true);
  assert.equal(fs.existsSync(lp), false, "lock already released when withExclusiveLock returned (sync release)");
});
