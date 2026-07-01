#!/usr/bin/env node
// tier: T0
/**
 * system-graph-write-lock.test.mjs — pure-core + injected-fs coverage for
 * the F11 cross-lock (U-VIZ-F11-CROSS-LOCK).
 *
 * Sibling convention: scripts/lib/graphsage-*.mjs `.mjs`+`.test.mjs`, node:test.
 *
 * Covers every decision branch the reviewers asked to pin with fail-on-
 * revert oracles: stale-dead reclaim, self-pid idempotent re-entry,
 * live-other refusal, unparseable/absent → proceed, PID-reuse phantom,
 * OFF escape hatch, path resolution + env override, release-only-if-owner,
 * exit-handler unsubscribe, withGraphWriteLock scoped run / held-skip.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import realFs from "node:fs";
import { execFileSync } from "node:child_process";

const SUBPROCESS_TIMEOUT_MS = 15000;

import {
  graphWriteLockPath,
  decideAcquire,
  decideActive,
  acquireGraphWriteLock,
  releaseGraphWriteLock,
  isGraphWriteLockActive,
  installGraphWriteLockReleaseOnExit,
  withGraphWriteLock,
  lockTtlMs,
  DEFAULT_LOCK_TTL_MS,
} from "./system-graph-write-lock.mjs";

// ─── in-memory fs fake (the ops the lib uses) ────────────────────────────
// Tracks per-path mtime so the U-GO-B2 TTL backstop is exercisable: writes
// stamp mtime=now, initial-store entries default to now, and `backdate(p,
// ageMs)` lets a test age a lock. `statSync` surfaces the mtime to the
// lib's readLockAgeMs. (Pre-U-GO-B2 the fake had no statSync — the TTL
// check was then correctly skipped; existing fresh-lock tests are
// unaffected because age≈0 < TTL.)
function makeFakeFs(initial = {}) {
  const store = new Map(Object.entries(initial));
  const mtimes = new Map();
  const now0 = Date.now();
  for (const k of store.keys()) mtimes.set(k, now0);
  return {
    store,
    mtimes,
    mkdirSync() {},
    readFileSync(p) {
      if (!store.has(p)) {
        const e = new Error(`ENOENT: ${p}`);
        e.code = "ENOENT";
        throw e;
      }
      return store.get(p);
    },
    writeFileSync(p, data) {
      store.set(p, String(data));
      mtimes.set(p, Date.now());
    },
    unlinkSync(p) {
      if (!store.has(p)) {
        const e = new Error(`ENOENT: ${p}`);
        e.code = "ENOENT";
        throw e;
      }
      store.delete(p);
      mtimes.delete(p);
    },
    statSync(p) {
      if (!store.has(p)) {
        const e = new Error(`ENOENT: ${p}`);
        e.code = "ENOENT";
        throw e;
      }
      return { mtimeMs: mtimes.get(p) ?? Date.now() };
    },
    /** test helper: age a lock by backdating its mtime by ageMs */
    backdate(p, ageMs) {
      mtimes.set(p, Date.now() - ageMs);
    },
  };
}

// Liveness probe fakes. defaultKillProbe throws on a DEAD pid.
const aliveProbe = () => {};                       // every pid "alive"
const deadProbe = () => { throw new Error("ESRCH"); }; // every pid "dead"
const livePidSet = (set) => (pid) => {
  if (!set.has(pid)) throw new Error("ESRCH");
};

const LOCK = "/tmp/.system-graph-write.pid";

// ─── decideAcquire ───────────────────────────────────────────────────────

test("decideAcquire: absent (null) → acquire, heldBy null", () => {
  assert.deepEqual(decideAcquire(null, 100, aliveProbe), { acquire: true, heldBy: null });
});

test("decideAcquire: unparseable / non-positive → acquire", () => {
  assert.equal(decideAcquire("garbage", 100, aliveProbe).acquire, true);
  assert.equal(decideAcquire("0", 100, aliveProbe).acquire, true);
  assert.equal(decideAcquire("-5", 100, aliveProbe).acquire, true);
  assert.equal(decideAcquire("", 100, aliveProbe).acquire, true);
});

test("decideAcquire: own pid → acquire (idempotent re-entry), heldBy self", () => {
  assert.deepEqual(decideAcquire("100", 100, aliveProbe), { acquire: true, heldBy: 100 });
});

test("decideAcquire: different LIVE pid → refuse, heldBy that pid", () => {
  const r = decideAcquire("4320", 100, aliveProbe);
  assert.equal(r.acquire, false);
  assert.equal(r.heldBy, 4320);
  assert.equal(r.reason, "live");
});

test("decideAcquire: different DEAD pid → reclaim (acquire)", () => {
  // Crash-safe stale reclaim — the load-bearing self-heal property.
  assert.deepEqual(decideAcquire("4320", 100, deadProbe), { acquire: true, heldBy: null });
});

test("decideAcquire: whitespace around pid tolerated", () => {
  assert.equal(decideAcquire("  4320\n", 100, aliveProbe).acquire, false);
});

// ─── decideActive (the DEFER predicate) ──────────────────────────────────

test("decideActive: absent → false (safe to proceed)", () => {
  assert.equal(decideActive(null, 200, aliveProbe), false);
});

test("decideActive: own pid → false (own lock never blocks self)", () => {
  assert.equal(decideActive("200", 200, aliveProbe), false);
});

test("decideActive: different LIVE pid → true (active → caller DEFERS)", () => {
  assert.equal(decideActive("4320", 200, aliveProbe), true);
});

test("decideActive: different DEAD pid → false (stale, not active)", () => {
  assert.equal(decideActive("4320", 200, deadProbe), false);
});

test("decideActive: unparseable / non-positive → false", () => {
  assert.equal(decideActive("nope", 200, aliveProbe), false);
  assert.equal(decideActive("0", 200, aliveProbe), false);
});

// ─── acquire / release round-trip via injected fs ────────────────────────

test("acquire then release round-trips and is owner-gated", () => {
  const fs = makeFakeFs();
  const a = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe });
  assert.equal(a.acquired, true);
  assert.equal(fs.store.get(LOCK), "111");

  // A different live process must NOT be able to acquire.
  const b = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 222, killProbe: aliveProbe });
  assert.equal(b.acquired, false);
  assert.equal(b.heldBy, 111);

  // releaseGraphWriteLock from a non-owner must NOT unlink owner's lock.
  releaseGraphWriteLock({ fs, pidPath: LOCK, selfPid: 222 });
  assert.equal(fs.store.has(LOCK), true, "non-owner must not release peer lock");

  // Owner releases cleanly; idempotent second release is a no-op.
  releaseGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111 });
  assert.equal(fs.store.has(LOCK), false);
  releaseGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111 }); // no throw
});

test("acquire reclaims a stale DEAD-holder lock (self-heal across hard kill)", () => {
  const fs = makeFakeFs({ [LOCK]: "9999" }); // orphaned by an OOM-killed regen
  const a = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111, killProbe: deadProbe });
  assert.equal(a.acquired, true);
  assert.equal(fs.store.get(LOCK), "111");
});

test("acquire is idempotent for the same pid (re-entry)", () => {
  const fs = makeFakeFs({ [LOCK]: "111" });
  const a = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe });
  assert.equal(a.acquired, true);
});

// ─── isGraphWriteLockActive (regen holds → add-node defers) ──────────────

test("isGraphWriteLockActive: regen(pid A) held, add-node(pid B) probes → true", () => {
  const fs = makeFakeFs();
  acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 4320, killProbe: aliveProbe });
  // add-node is a different process; only 4320 is alive.
  const active = isGraphWriteLockActive({
    fs, pidPath: LOCK, selfPid: 777, killProbe: livePidSet(new Set([4320])),
  });
  assert.equal(active, true, "add-node must DEFER while regen holds the lock");
});

test("isGraphWriteLockActive: stale dead holder → false (add-node proceeds, no permanent wedge)", () => {
  const fs = makeFakeFs({ [LOCK]: "4320" });
  const active = isGraphWriteLockActive({ fs, pidPath: LOCK, selfPid: 777, killProbe: deadProbe });
  assert.equal(active, false);
});

test("isGraphWriteLockActive: PID-reuse phantom is 'active' (documented accepted tradeoff)", () => {
  // 4320 = dead regen, but OS recycled 4320 to an unrelated live process.
  const fs = makeFakeFs({ [LOCK]: "4320" });
  const active = isGraphWriteLockActive({
    fs, pidPath: LOCK, selfPid: 777, killProbe: livePidSet(new Set([4320])),
  });
  // Pins the KNOWN tradeoff so a future "fix" that silently changes it fails here.
  assert.equal(active, true);
});

// ─── path resolution + env override ──────────────────────────────────────

test("graphWriteLockPath: default resolves under repo root, ends with .system-graph-write.pid", () => {
  const before = process.env.PRISM_SYSTEM_GRAPH_WRITE_PID;
  delete process.env.PRISM_SYSTEM_GRAPH_WRITE_PID;
  try {
    const p = graphWriteLockPath();
    assert.equal(path.basename(p), ".system-graph-write.pid");
    assert.equal(path.isAbsolute(p), true);
  } finally {
    if (before !== undefined) process.env.PRISM_SYSTEM_GRAPH_WRITE_PID = before;
  }
});

test("graphWriteLockPath: PRISM_SYSTEM_GRAPH_WRITE_PID override wins (absolute-resolved)", () => {
  const before = process.env.PRISM_SYSTEM_GRAPH_WRITE_PID;
  const target = path.join(os.tmpdir(), `f11-test-${process.pid}.pid`);
  process.env.PRISM_SYSTEM_GRAPH_WRITE_PID = target;
  try {
    assert.equal(graphWriteLockPath(), path.resolve(target));
  } finally {
    if (before === undefined) delete process.env.PRISM_SYSTEM_GRAPH_WRITE_PID;
    else process.env.PRISM_SYSTEM_GRAPH_WRITE_PID = before;
  }
});

// ─── withGraphWriteLock scoped helper ────────────────────────────────────

test("withGraphWriteLock: runs fn, releases after (even on throw)", () => {
  const fs = makeFakeFs();
  let ran = false;
  const r = withGraphWriteLock(() => { ran = true; return 42; },
    { fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe });
  assert.equal(ran, true);
  assert.equal(r.ran, true);
  assert.equal(r.value, 42);
  assert.equal(fs.store.has(LOCK), false, "lock released after scope");

  // Throwing fn still releases.
  assert.throws(() => withGraphWriteLock(() => { throw new Error("boom"); },
    { fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe }));
  assert.equal(fs.store.has(LOCK), false, "lock released even when fn throws");
});

test("withGraphWriteLock: held by live other → fn NOT run, ran:false + heldBy", () => {
  const fs = makeFakeFs({ [LOCK]: "4320" });
  let ran = false;
  const r = withGraphWriteLock(() => { ran = true; },
    { fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe });
  assert.equal(ran, false);
  assert.equal(r.ran, false);
  assert.equal(r.heldBy, 4320);
});

// ─── installGraphWriteLockReleaseOnExit unsubscribe ──────────────────────

test("installGraphWriteLockReleaseOnExit: returns working unsubscribe (no handler leak)", () => {
  const fs = makeFakeFs({ [LOCK]: "111" });
  const beforeExit = process.listenerCount("exit");
  const beforeInt = process.listenerCount("SIGINT");
  const unsub = installGraphWriteLockReleaseOnExit({ fs, pidPath: LOCK, selfPid: 111 });
  assert.equal(process.listenerCount("exit"), beforeExit + 1);
  assert.equal(process.listenerCount("SIGINT"), beforeInt + 1);
  unsub();
  assert.equal(process.listenerCount("exit"), beforeExit, "exit handler removed");
  assert.equal(process.listenerCount("SIGINT"), beforeInt, "SIGINT handler removed");
});

// ─── OFF escape hatch (pre-F11 behavior) ─────────────────────────────────
// DISABLED is read at module-load, so it can't be toggled per-test in THIS
// process without a fresh import. The OFF=1 branch is the documented wedge-
// recovery lever (acquire → no-op success {disabled:true}; isActive →
// always false), so it MUST have an executing oracle, not a forward-
// reference. We exercise it in a child process with the env set (the
// module's own documented remedy) rather than asserting the knob is unset.
test("OFF knob unset (this process) — normal behavior holds", () => {
  assert.equal(process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF !== "1", true);
  const fs = makeFakeFs();
  assert.equal(
    acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 1, killProbe: aliveProbe }).acquired,
    true,
  );
});

test("OFF=1 escape hatch (subprocess): acquire is no-op success + isActive always false", () => {
  const modUrl = new URL("./system-graph-write-lock.mjs", import.meta.url).href;
  // Even with a LIVE foreign holder in the pid file, OFF=1 must: acquire→
  // {acquired:true,disabled:true} and isGraphWriteLockActive→false (the
  // pre-F11 unguarded behavior — nothing acquires meaningfully, nothing defers).
  const probe = path.join(os.tmpdir(), `f11-off-${process.pid}-${Date.now()}.pid`);
  realFs.writeFileSync(probe, String(process.pid)); // a real LIVE pid
  const script =
    `import('${modUrl}').then(m=>{` +
    `const a=m.acquireGraphWriteLock({pidPath:${JSON.stringify(probe)},selfPid:424242});` +
    `const act=m.isGraphWriteLockActive({pidPath:${JSON.stringify(probe)},selfPid:424242});` +
    `process.stdout.write(JSON.stringify({acquired:a.acquired,disabled:!!a.disabled,active:act}));});`;
  try {
    const r = execFileSync(
      process.execPath, ["--input-type=module", "-e", script],
      { env: { ...process.env, PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF: "1" }, encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS },
    );
    const out = JSON.parse(r);
    assert.equal(out.acquired, true, "OFF=1 acquire must succeed (no-op)");
    assert.equal(out.disabled, true, "OFF=1 acquire must flag disabled:true");
    assert.equal(out.active, false, "OFF=1 isGraphWriteLockActive must be false even vs a live holder");
  } finally {
    try { realFs.unlinkSync(probe); } catch { /* already gone */ }
  }
});

// ─── U-GO-B2 TTL backstop: stale-lock reclaim defeats PID-reuse phantom ──
// Production wedge (2026-05-22): a crashed regen (pid 24784) left
// .system-graph-write.pid holding 24784; the OS recycled that pid number
// to an unrelated live process, so process.kill(24784,0) read "alive" and
// every system-viz-on-commit run skipped for 9.5h. The TTL backstop
// reclaims any lock older than ttlMs regardless of the (lying) pid probe.

const TTL = 30 * 60 * 1000;       // explicit per-test TTL
const OLD = TTL + 60_000;         // 31 min — past TTL
const YOUNG = 60_000;             // 1 min — well within TTL

test("lockTtlMs: default is 30 min when no env override", () => {
  const before = process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS;
  delete process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS;
  try {
    assert.equal(lockTtlMs(), 30 * 60 * 1000);
    assert.equal(DEFAULT_LOCK_TTL_MS, 30 * 60 * 1000);
  } finally {
    if (before !== undefined) process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS = before;
  }
});

test("lockTtlMs: positive env override wins; 0/negative/NaN fall back to default", () => {
  const before = process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS;
  try {
    process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS = "5000";
    assert.equal(lockTtlMs(), 5000);
    for (const bad of ["0", "-1", "nope", ""]) {
      process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS = bad;
      assert.equal(lockTtlMs(), DEFAULT_LOCK_TTL_MS, `bad override ${JSON.stringify(bad)} → default`);
    }
  } finally {
    if (before === undefined) delete process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS;
    else process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS = before;
  }
});

test("decideAcquire: lock past TTL + LIVE phantom → reclaim (reason stale-ttl)", () => {
  const r = decideAcquire("24784", 100, aliveProbe, OLD, TTL);
  assert.equal(r.acquire, true);
  assert.equal(r.heldBy, null);
  assert.equal(r.reason, "stale-ttl");
});

test("decideAcquire: lock within TTL + LIVE pid → still refuse (no early over-reclaim)", () => {
  const r = decideAcquire("24784", 100, aliveProbe, YOUNG, TTL);
  assert.equal(r.acquire, false);
  assert.equal(r.reason, "live");
});

test("decideAcquire: lockAgeMs null (mtime unavailable) → TTL skipped, pure pid probe", () => {
  assert.equal(decideAcquire("24784", 100, aliveProbe, null, TTL).acquire, false);
  assert.equal(decideAcquire("24784", 100, deadProbe, null, TTL).acquire, true);
});

test("decideActive: lock past TTL + LIVE phantom → false (no permanent wedge)", () => {
  assert.equal(decideActive("24784", 200, aliveProbe, OLD, TTL), false);
});

test("decideActive: lock within TTL + LIVE pid → true (still defers)", () => {
  assert.equal(decideActive("24784", 200, aliveProbe, YOUNG, TTL), true);
});

test("acquireGraphWriteLock: reclaims a stale-by-TTL lock even when the probe says alive", () => {
  // End-to-end reproduction of the production wedge through the impure wrapper.
  const fs = makeFakeFs({ [LOCK]: "24784" });
  fs.backdate(LOCK, OLD);
  const a = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe, ttlMs: TTL });
  assert.equal(a.acquired, true, "stale-by-TTL lock must be reclaimable despite a live phantom");
  assert.equal(a.reclaimedStale, true);
  assert.equal(fs.store.get(LOCK), "111");
});

test("acquireGraphWriteLock: a FRESH live peer-held lock is still respected", () => {
  const fs = makeFakeFs();
  acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 4320, killProbe: aliveProbe, ttlMs: TTL });
  const b = acquireGraphWriteLock({ fs, pidPath: LOCK, selfPid: 111, killProbe: aliveProbe, ttlMs: TTL });
  assert.equal(b.acquired, false, "a fresh, live, peer-held lock must NOT be over-reclaimed");
  assert.equal(b.heldBy, 4320);
});

test("isGraphWriteLockActive: stale-by-TTL phantom → false (add-node no longer wedges)", () => {
  const fs = makeFakeFs({ [LOCK]: "24784" });
  fs.backdate(LOCK, OLD);
  const active = isGraphWriteLockActive({ fs, pidPath: LOCK, selfPid: 777, killProbe: aliveProbe, ttlMs: TTL });
  assert.equal(active, false, "a wedged phantom past TTL must not defer add-node forever");
});

// ─── real-fs E2E (the "hermetic fakes don't prove wiring" oracle) ────────
test("E2E real-fs: acquire writes real pid file, release unlinks it", () => {
  const target = path.join(os.tmpdir(), `f11-e2e-${process.pid}-${Date.now()}.pid`);
  try {
    const a = acquireGraphWriteLock({ pidPath: target, selfPid: process.pid });
    assert.equal(a.acquired, true);
    assert.equal(realFs.readFileSync(target, "utf8").trim(), String(process.pid));
    // A second acquire from a simulated different live pid (this process is
    // alive) must refuse.
    const b = acquireGraphWriteLock({ pidPath: target, selfPid: process.pid + 1, killProbe: () => {} });
    assert.equal(b.acquired, false);
    releaseGraphWriteLock({ pidPath: target, selfPid: process.pid });
    assert.equal(realFs.existsSync(target), false);
  } finally {
    try { realFs.unlinkSync(target); } catch { /* already gone */ }
  }
});
