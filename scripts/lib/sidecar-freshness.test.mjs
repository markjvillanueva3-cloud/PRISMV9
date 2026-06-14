#!/usr/bin/env node
/**
 * sidecar-freshness.test.mjs -- hermetic suite for the Stop-hook sidecar
 * refresh. Run: `node --test sidecar-freshness.test.mjs`
 *
 * Uses real fs in a tmp dir (controlled mtimes via utimesSync) for lock/stamp/
 * target files; mocks spawnImpl (records calls, never spawns a real process) and
 * ollamaProbe.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  isTargetStale,
  decideRefresh,
  acquireDecisionLock,
  releaseDecisionLock,
  runSidecarFreshness,
  DEFAULT_COOLDOWN_MS,
} from "./sidecar-freshness.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sidecar-fresh-"));
}
// write a file and force its mtime to `ms` epoch millis
function writeAt(p, ms) {
  fs.writeFileSync(p, "x");
  const s = ms / 1000;
  fs.utimesSync(p, s, s);
}
function mkTargets(dir, { srcMs, sideMs, srcMissing = false, sideMissing = false } = {}) {
  const source = path.join(dir, "src.json");
  const sidecar = path.join(dir, "side.json");
  if (!srcMissing) writeAt(source, srcMs);
  if (!sideMissing) writeAt(sidecar, sideMs);
  return { id: "t", source, sidecar, script: path.join(dir, "rebuild.mjs"), args: [], requiresOllama: false };
}

test("isTargetStale: sidecar missing => stale", () => {
  const d = tmpDir();
  const t = mkTargets(d, { srcMs: 1000, sideMissing: true });
  assert.equal(isTargetStale(t), true);
});

test("isTargetStale: source newer than sidecar => stale; sidecar newer => fresh", () => {
  const d = tmpDir();
  assert.equal(isTargetStale(mkTargets(d, { srcMs: 2000, sideMs: 1000 })), true);
  const d2 = tmpDir();
  assert.equal(isTargetStale(mkTargets(d2, { srcMs: 1000, sideMs: 2000 })), false);
});

test("isTargetStale: missing source => not stale (fail-safe, nothing to refresh)", () => {
  const d = tmpDir();
  const t = mkTargets(d, { srcMissing: true, sideMs: 1000 });
  assert.equal(isTargetStale(t), false);
});

test("decideRefresh: a fresh stamp cools down (no stale returned even if stale on disk)", () => {
  const d = tmpDir();
  const t = mkTargets(d, { srcMs: 2000, sideMs: 1000 }); // stale on disk
  const now = 10_000_000;
  const dec = decideRefresh({ targets: [t], now, stampTime: now - 1000, cooldownMs: DEFAULT_COOLDOWN_MS });
  assert.equal(dec.cooledDown, true);
  assert.equal(dec.stale.length, 0);
});

test("decideRefresh: past cooldown + stale => returns the stale target; all-fresh => empty", () => {
  const d = tmpDir();
  const stale = mkTargets(d, { srcMs: 2000, sideMs: 1000 });
  const now = 10_000_000;
  const dec = decideRefresh({ targets: [stale], now, stampTime: now - DEFAULT_COOLDOWN_MS - 1, cooldownMs: DEFAULT_COOLDOWN_MS });
  assert.equal(dec.cooledDown, false);
  assert.equal(dec.stale.length, 1);
  const d2 = tmpDir();
  const fresh = mkTargets(d2, { srcMs: 1000, sideMs: 2000 });
  const dec2 = decideRefresh({ targets: [fresh], now, stampTime: NaN, cooldownMs: DEFAULT_COOLDOWN_MS });
  assert.equal(dec2.stale.length, 0);
});

test("acquireDecisionLock: acquires when absent; blocks when held-fresh; reclaims when held-stale", () => {
  const d = tmpDir();
  const lock = path.join(d, "x.lock");
  const now = 5_000_000;
  assert.equal(acquireDecisionLock(lock, { now, ttlMs: 120000 }), true, "absent -> acquire");
  // held by the just-written lock, fresh -> blocked
  assert.equal(acquireDecisionLock(lock, { now: now + 1000, ttlMs: 120000 }), false, "held-fresh -> blocked");
  // ttl elapsed -> reclaim
  assert.equal(acquireDecisionLock(lock, { now: now + 200000, ttlMs: 120000 }), true, "held-stale -> reclaim");
  releaseDecisionLock(lock);
  assert.equal(fs.existsSync(lock), false);
});

test("acquireDecisionLock: a CORRUPT lock is held while fresh, reclaimed once stale by mtime (no permanent wedge)", () => {
  const d = tmpDir();
  const lock = path.join(d, "c.lock");
  fs.writeFileSync(lock, "{not json"); // torn/corrupt lock
  const freshMtime = fs.statSync(lock).mtimeMs;
  // fresh corrupt lock (mtime ~now) => treated as held, NOT acquired
  assert.equal(acquireDecisionLock(lock, { now: freshMtime + 1000, ttlMs: 120000 }), false, "corrupt+fresh -> held");
  // age the file mtime past ttl => reclaimed (mtime fallback, not a permanent wedge)
  const old = (freshMtime - 200000) / 1000;
  fs.utimesSync(lock, old, old);
  assert.equal(acquireDecisionLock(lock, { now: freshMtime, ttlMs: 120000 }), true, "corrupt+stale -> reclaim");
  releaseDecisionLock(lock);
});

test("runSidecarFreshness: ollamaProbe is called at most ONCE across multiple Ollama targets (cached)", async () => {
  const d = tmpDir();
  const e1 = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "embed-a", requiresOllama: true };
  const e2 = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "embed-b", requiresOllama: true };
  let probeCalls = 0;
  const h = harness(d, [e1, e2]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, ollamaProbe: async () => { probeCalls++; return true; } });
  assert.equal(probeCalls, 1, "probe must be cached, not called per-target");
  assert.deepEqual(res.spawned.sort(), ["embed-a", "embed-b"]);
});

function harness(dir, targets, { spawnThrows = false } = {}) {
  const calls = [];
  const spawnImpl = (script, args) => {
    if (spawnThrows) throw new Error("spawn-boom");
    calls.push({ script, args });
  };
  const { lockPath, stampPath } = {
    lockPath: path.join(dir, "h.lock"),
    stampPath: path.join(dir, "h.stamp.json"),
  };
  return { calls, spawnImpl, lockPath, stampPath, targets };
}

test("runSidecarFreshness: both stale + ollama up => spawns both, writes stamp", async () => {
  const d = tmpDir();
  const graph = mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }); graph.id = "master-index";
  const embed = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "memory-embed", requiresOllama: true };
  const h = harness(d, [graph, embed]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, cooldownMs: DEFAULT_COOLDOWN_MS, ollamaProbe: async () => true });
  assert.equal(res.ran, true);
  assert.deepEqual(res.spawned.sort(), ["master-index", "memory-embed"]);
  assert.equal(h.calls.length, 2);
  assert.equal(fs.existsSync(h.stampPath), true, "stamp written when spawned");
});

test("runSidecarFreshness: master stale + ollama DOWN => spawns graph only, embed skipped(ollama-down)", async () => {
  const d = tmpDir();
  const graph = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index", requiresOllama: false };
  const embed = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "memory-embed", requiresOllama: true };
  const h = harness(d, [graph, embed]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, ollamaProbe: async () => false });
  assert.deepEqual(res.spawned, ["master-index"]);
  assert.equal(res.skipped.find((s) => s.id === "memory-embed").reason, "ollama-down");
  assert.equal(h.calls.length, 1);
});

test("runSidecarFreshness: low free RAM => master-index (8GB-heap) spawn SKIPPED (no OOM-cascade)", async () => {
  const d = tmpDir();
  const graph = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index", requiresOllama: false, requiresFreeRamMB: 8192 };
  const h = harness(d, [graph]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, freeRamProbe: () => 2000 /* 2GB free < 8GB */ });
  assert.equal(res.ran, false);
  assert.equal(h.calls.length, 0, "must not spawn the 8GB rebuild under memory pressure");
  assert.match(res.skipped.find((s) => s.id === "master-index").reason, /low-ram/);
  assert.equal(fs.existsSync(h.stampPath), false, "no stamp when nothing spawned");
});

test("runSidecarFreshness: ample free RAM => master-index spawns; RAM probe is cached (called once)", async () => {
  const d = tmpDir();
  const g1 = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index", requiresFreeRamMB: 8192 };
  const g2 = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "graph-2", requiresFreeRamMB: 8192 };
  let ramCalls = 0;
  const h = harness(d, [g1, g2]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, freeRamProbe: () => { ramCalls++; return 32000; /* 32GB free */ } });
  assert.deepEqual(res.spawned.sort(), ["graph-2", "master-index"]);
  assert.equal(ramCalls, 1, "RAM probe must be cached, not called per-target");
});

test("runSidecarFreshness: all fresh => no spawn, NO stamp written", async () => {
  const d = tmpDir();
  const fresh = { ...mkTargets(tmpDir(), { srcMs: 1000, sideMs: 2000 }), id: "master-index" };
  const h = harness(d, [fresh]);
  const res = await runSidecarFreshness({ ...h, now: 9e9, ollamaProbe: async () => true });
  assert.equal(res.ran, false);
  assert.equal(h.calls.length, 0);
  assert.equal(fs.existsSync(h.stampPath), false, "no stamp when nothing spawned");
});

test("runSidecarFreshness: cooled down => no spawn", async () => {
  const d = tmpDir();
  const stale = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index" };
  const h = harness(d, [stale]);
  const now = 9e9;
  fs.writeFileSync(h.stampPath, JSON.stringify({ at: now - 1000 })); // fresh stamp
  const res = await runSidecarFreshness({ ...h, now, cooldownMs: DEFAULT_COOLDOWN_MS, ollamaProbe: async () => true });
  assert.equal(res.ran, false);
  assert.match(res.reason, /cooldown/);
  assert.equal(h.calls.length, 0);
});

test("runSidecarFreshness: lock held by a live peer => ran:false, no spawn", async () => {
  const d = tmpDir();
  const stale = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index" };
  const h = harness(d, [stale]);
  const now = 9e9;
  fs.writeFileSync(h.lockPath, JSON.stringify({ pid: 999999, at: now })); // fresh peer lock
  const res = await runSidecarFreshness({ ...h, now, lockTtlMs: 120000, ollamaProbe: async () => true });
  assert.equal(res.ran, false);
  assert.equal(res.reason, "lock-held");
  assert.equal(h.calls.length, 0);
});

test("runSidecarFreshness: spawn throws => skipped(spawn err), never propagates", async () => {
  const d = tmpDir();
  const stale = { ...mkTargets(tmpDir(), { srcMs: 2000, sideMs: 1000 }), id: "master-index" };
  const h = harness(d, [stale], { spawnThrows: true });
  const res = await runSidecarFreshness({ ...h, now: 9e9, ollamaProbe: async () => true });
  assert.equal(res.ran, false);
  assert.equal(res.spawned.length, 0);
  assert.equal(res.skipped[0].reason, "spawn-boom");
  assert.equal(fs.existsSync(h.stampPath), false, "no stamp when spawn failed");
});

test("runSidecarFreshness: lock released after run (next run can acquire)", async () => {
  const d = tmpDir();
  const fresh = { ...mkTargets(tmpDir(), { srcMs: 1000, sideMs: 2000 }), id: "master-index" };
  const h = harness(d, [fresh]);
  await runSidecarFreshness({ ...h, now: 9e9, ollamaProbe: async () => true });
  assert.equal(fs.existsSync(h.lockPath), false, "lock released after the decision window");
});
