// mcp-bridge-liveness.test.mjs -- pure-core tests with injected fs + clock + pid probe.
// Run: node --test H:/prism/scripts/lib/mcp-bridge-liveness.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STALE_MS,
  getLiveDir,
  getStaleMs,
  resolveSlotName,
  sentinelPath,
  buildSentinelRecord,
  defaultIsPidAlive,
  readBridgeLiveness,
  isConfidentlyDisconnected,
  writeSentinel,
  heartbeatSentinel,
  removeSentinel,
} from "./mcp-bridge-liveness.mjs";

// A tiny in-memory fs the side-effecting helpers can be driven against.
function memFs(seed = {}) {
  const store = { ...seed };
  const dirs = new Set();
  return {
    store,
    deps: {
      existsSync: (p) => p in store || dirs.has(p),
      readFileSync: (p) => {
        if (!(p in store)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        return store[p];
      },
      writeFileSync: (p, c) => { store[p] = String(c); },
      mkdirSync: (p) => { dirs.add(p); },
      rmSync: (p) => { delete store[p]; },
    },
  };
}

// -- resolveSlotName --

test("resolveSlotName: PRISM_BOOT_SLOT wins and lowercases", () => {
  assert.equal(resolveSlotName({ PRISM_BOOT_SLOT: "TANGO" }, "H:/prism"), "tango");
});

test("resolveSlotName: falls back to slot-worktree cwd", () => {
  assert.equal(resolveSlotName({}, "H:/prism-slot-foxtrot"), "foxtrot");
});

test("resolveSlotName: shared tree -> null", () => {
  assert.equal(resolveSlotName({}, "H:/prism"), null);
});

test("resolveSlotName: empty boot slot ignored, cwd used", () => {
  assert.equal(resolveSlotName({ PRISM_BOOT_SLOT: "  " }, "H:/prism-slot-mike"), "mike");
});

// -- getLiveDir / getStaleMs --

test("getLiveDir: default + env override", () => {
  assert.match(getLiveDir({}), /mcp-bridge-live$/);
  assert.equal(getLiveDir({ PRISM_MCP_BRIDGE_LIVE_DIR: "/x/y" }), "/x/y");
});

test("getStaleMs: default + valid override + rejects junk", () => {
  assert.equal(getStaleMs({}), DEFAULT_STALE_MS);
  assert.equal(getStaleMs({ PRISM_MCP_BRIDGE_STALE_MS: "5000" }), 5000);
  assert.equal(getStaleMs({ PRISM_MCP_BRIDGE_STALE_MS: "-1" }), DEFAULT_STALE_MS);
  assert.equal(getStaleMs({ PRISM_MCP_BRIDGE_STALE_MS: "abc" }), DEFAULT_STALE_MS);
});

// -- sentinelPath --

test("sentinelPath: sanitizes unsafe chars to underscore", () => {
  assert.match(sentinelPath("tan go!", "/live"), /tan_go_\.json$/);
});

// -- buildSentinelRecord --

test("buildSentinelRecord: stamps lastBeatAt = now, normalizes types", () => {
  const r = buildSentinelRecord({ slot: "TANGO", pid: 42, now: 1234, cwd: "H:/x", bridgeId: "b1" });
  assert.equal(r.slot, "tango");
  assert.equal(r.pid, 42);
  assert.equal(r.lastBeatAt, 1234);
  assert.equal(r.startedAt, 1234);
  assert.equal(r.v, 1);
});

test("buildSentinelRecord: non-finite pid -> null (never NaN)", () => {
  const r = buildSentinelRecord({ slot: "x", pid: NaN, now: 1 });
  assert.equal(r.pid, null);
});

// -- defaultIsPidAlive --

test("defaultIsPidAlive: own pid alive, absurd pid dead, junk dead", () => {
  assert.equal(defaultIsPidAlive(process.pid), true);
  assert.equal(defaultIsPidAlive(2147480000), false); // almost certainly not running
  assert.equal(defaultIsPidAlive(0), false);
  assert.equal(defaultIsPidAlive(-5), false);
  assert.equal(defaultIsPidAlive(NaN), false);
});

// -- readBridgeLiveness: every reason --

test("readBridgeLiveness: unknown-slot when slot falsy", () => {
  const v = readBridgeLiveness(null, { liveDir: "/live" });
  assert.equal(v.reason, "unknown-slot");
  assert.equal(v.alive, false);
});

test("readBridgeLiveness: no-sentinel when file missing", () => {
  const { deps } = memFs();
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 100 });
  assert.equal(v.reason, "no-sentinel");
  assert.equal(v.alive, false);
});

test("readBridgeLiveness: parse-error on corrupt JSON", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: "{not json" });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 100 });
  assert.equal(v.reason, "parse-error");
});

test("readBridgeLiveness: parse-error when pid missing/non-finite", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ slot: "tango", lastBeatAt: 100 }) });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 100 });
  assert.equal(v.reason, "parse-error");
});

test("readBridgeLiveness: ok when pid alive + fresh heartbeat", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ pid: 123, lastBeatAt: 1000 }) });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1500, isPidAlive: () => true });
  assert.equal(v.alive, true);
  assert.equal(v.reason, "ok");
  assert.equal(v.pid, 123);
  assert.equal(v.ageMs, 500);
});

test("readBridgeLiveness: pid-dead when heartbeat fresh but pid gone", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ pid: 123, lastBeatAt: 1000 }) });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1500, isPidAlive: () => false });
  assert.equal(v.alive, false);
  assert.equal(v.reason, "pid-dead");
  assert.equal(v.pid, 123);
});

test("readBridgeLiveness: stale-heartbeat takes precedence over pid check", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ pid: 123, lastBeatAt: 1000 }) });
  // now far past staleMs; isPidAlive would say alive but stale wins
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1000 + DEFAULT_STALE_MS + 1, isPidAlive: () => true });
  assert.equal(v.reason, "stale-heartbeat");
  assert.equal(v.alive, false);
});

test("readBridgeLiveness: never throws on read error", () => {
  const deps = { existsSync: () => true, readFileSync: () => { throw new Error("boom"); } };
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1 });
  assert.equal(v.reason, "no-sentinel"); // read failure degrades to no-sentinel, not a throw
});

// -- isConfidentlyDisconnected --

test("isConfidentlyDisconnected: only pid-dead + stale-heartbeat are confident", () => {
  assert.equal(isConfidentlyDisconnected({ reason: "pid-dead" }), true);
  assert.equal(isConfidentlyDisconnected({ reason: "stale-heartbeat" }), true);
  assert.equal(isConfidentlyDisconnected({ reason: "no-sentinel" }), false);
  assert.equal(isConfidentlyDisconnected({ reason: "unknown-slot" }), false);
  assert.equal(isConfidentlyDisconnected({ reason: "parse-error" }), false);
  assert.equal(isConfidentlyDisconnected({ reason: "ok" }), false);
  assert.equal(isConfidentlyDisconnected(null), false);
});

// -- write/heartbeat/remove round-trips --

test("writeSentinel + readBridgeLiveness round-trip via injected deps", () => {
  const { store, deps } = memFs();
  const ok = writeSentinel("tango", { pid: 555, now: 1000, cwd: "H:/prism-slot-tango" }, { ...deps, liveDir: "/live" });
  assert.equal(ok, true);
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1200, isPidAlive: () => true });
  assert.equal(v.alive, true);
  assert.equal(v.pid, 555);
  assert.ok(store[sentinelPath("tango", "/live")]);
});

test("writeSentinel: slot falsy -> false (fail-soft)", () => {
  assert.equal(writeSentinel(null, {}, {}), false);
});

test("writeSentinel: write throw -> false, never throws", () => {
  const deps = { liveDir: "/live", existsSync: () => true, writeFileSync: () => { throw new Error("EACCES"); }, mkdirSync: () => {} };
  assert.equal(writeSentinel("tango", { pid: 1 }, deps), false);
});

test("heartbeatSentinel: SUPERSEDE guard -- refuses to clobber a newer bridge's sentinel", () => {
  const { store, deps } = memFs();
  // Newer bridge (pid 200) owns the sentinel.
  writeSentinel("tango", { pid: 200, now: 5000 }, { ...deps, liveDir: "/live" });
  // Old bridge (pid 100) heartbeats -- must NOT overwrite pid 200 back to 100.
  const ok = heartbeatSentinel("tango", { pid: 100, now: 6000 }, { ...deps, liveDir: "/live" });
  assert.equal(ok, false, "old bridge heartbeat must be refused once superseded");
  const rec = JSON.parse(store[sentinelPath("tango", "/live")]);
  assert.equal(rec.pid, 200, "newer bridge's pid is preserved");
  assert.equal(rec.lastBeatAt, 5000, "newer bridge's heartbeat is preserved");
});

test("heartbeatSentinel: same-pid heartbeat is allowed", () => {
  const { store, deps } = memFs();
  writeSentinel("tango", { pid: 100, now: 5000 }, { ...deps, liveDir: "/live" });
  const ok = heartbeatSentinel("tango", { pid: 100, now: 6000 }, { ...deps, liveDir: "/live" });
  assert.equal(ok, true);
  assert.equal(JSON.parse(store[sentinelPath("tango", "/live")]).lastBeatAt, 6000);
});

test("heartbeatSentinel: advances lastBeatAt but preserves startedAt/pid", () => {
  const { deps } = memFs();
  writeSentinel("tango", { pid: 9, now: 1000, bridgeId: "b" }, { ...deps, liveDir: "/live" });
  const ok = heartbeatSentinel("tango", { now: 5000 }, { ...deps, liveDir: "/live" });
  assert.equal(ok, true);
  const rec = JSON.parse(deps.readFileSync(sentinelPath("tango", "/live")));
  assert.equal(rec.startedAt, 1000, "startedAt preserved across heartbeat");
  assert.equal(rec.lastBeatAt, 5000, "lastBeatAt advanced");
  assert.equal(rec.pid, 9, "pid preserved");
  assert.equal(rec.bridgeId, "b", "bridgeId preserved");
});

test("removeSentinel: pid-guarded -- refuses to delete another pid's sentinel", () => {
  const { store, deps } = memFs();
  writeSentinel("tango", { pid: 100, now: 1 }, { ...deps, liveDir: "/live" });
  // a different pid (a slow old bridge) must NOT clobber the new sentinel
  const refused = removeSentinel("tango", 999, { ...deps, liveDir: "/live" });
  assert.equal(refused, false);
  assert.ok(store[sentinelPath("tango", "/live")], "sentinel survives wrong-pid removal");
  // the owning pid may remove it
  const removed = removeSentinel("tango", 100, { ...deps, liveDir: "/live" });
  assert.equal(removed, true);
  assert.equal(store[sentinelPath("tango", "/live")], undefined);
});

test("removeSentinel: no pid filter removes unconditionally", () => {
  const { store, deps } = memFs();
  writeSentinel("tango", { pid: 100, now: 1 }, { ...deps, liveDir: "/live" });
  assert.equal(removeSentinel("tango", undefined, { ...deps, liveDir: "/live" }), true);
  assert.equal(store[sentinelPath("tango", "/live")], undefined);
});

test("removeSentinel: missing file -> false, never throws", () => {
  const { deps } = memFs();
  assert.equal(removeSentinel("tango", 1, { ...deps, liveDir: "/live" }), false);
});

// -- adversarial: oversize / weird inputs do not throw --

test("readBridgeLiveness: adversarial inputs never throw", () => {
  // JSON.stringify(Infinity) emits null, so the stored pid is null -> Number(null)=0
  // -> caught by the pid<=0 guard. Either way: not alive, no throw.
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ pid: Infinity, lastBeatAt: "NaN" }) });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1 });
  assert.equal(v.alive, false);
  assert.equal(v.reason, "parse-error");
});

test("readBridgeLiveness: oversize sentinel -> parse-error (no huge JSON.parse)", () => {
  const huge = '{"pid":1,"lastBeatAt":1,"x":"' + "A".repeat(70 * 1024) + '"}';
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: huge });
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1, isPidAlive: () => true });
  assert.equal(v.reason, "parse-error");
  assert.equal(v.alive, false);
});

// -- P1-B: bridge<->hook PARITY round-trip (the contract's load-bearing invariant) --
// The bridge resolves a slot from its env to WRITE the sentinel; the hook resolves
// from the SAME env to READ it. They must land on the same key. Drive both sides
// through resolveSlotName so a future precedence change can't silently de-sync them.

test("parity: bridge-side write + hook-side read agree on PRISM_BOOT_SLOT key", () => {
  const env = { PRISM_BOOT_SLOT: "TANGO" };
  const bridgeCwd = "H:/prism"; // bridges run from main tree per the live log; boot-slot still keys
  const hookCwd = "H:/prism-slot-tango"; // hook may run from the worktree -- different cwd...
  const writeSlot = resolveSlotName(env, bridgeCwd);
  const readSlot = resolveSlotName(env, hookCwd);
  assert.equal(writeSlot, readSlot, "BOOT_SLOT must dominate cwd so write/read keys match");
  const { deps } = memFs();
  writeSentinel(writeSlot, { pid: 4242, now: 1000 }, { ...deps, liveDir: "/live" });
  const v = readBridgeLiveness(readSlot, { liveDir: "/live", deps, now: 1200, isPidAlive: () => true });
  assert.equal(v.alive, true);
  assert.equal(v.pid, 4242);
});

test("parity: cwd-keyed write + read agree when both run in the slot worktree", () => {
  const cwd = "H:/prism-slot-mike";
  const writeSlot = resolveSlotName({}, cwd);
  const readSlot = resolveSlotName({}, cwd);
  assert.equal(writeSlot, "mike");
  assert.equal(readSlot, "mike");
});

// -- P2-1: explicit PID-reuse defense (the doc'd invariant: a recycled pid that
//    happens to be ALIVE must NOT fool us, because it isn't refreshing OUR beat) --

test("pid-reuse: recycled-but-alive pid with a stale beat -> stale-heartbeat (not fooled)", () => {
  const { deps } = memFs({ [sentinelPath("tango", "/live")]: JSON.stringify({ pid: 1234, lastBeatAt: 1000 }) });
  // The OS recycled pid 1234 to an unrelated live process; isPidAlive says true.
  // But the heartbeat is ancient -> stale-heartbeat wins, so we correctly report dead.
  const v = readBridgeLiveness("tango", { liveDir: "/live", deps, now: 1000 + DEFAULT_STALE_MS + 5000, isPidAlive: () => true });
  assert.equal(v.reason, "stale-heartbeat");
  assert.equal(v.alive, false);
});
