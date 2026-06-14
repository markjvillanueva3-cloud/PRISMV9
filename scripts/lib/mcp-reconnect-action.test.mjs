#!/usr/bin/env node
// scripts/lib/mcp-reconnect-action.test.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
// Hermetic node:test for the single-flight reconnect action. Injected deps everywhere EXCEPT
// the real-fs O_EXCL lock round-trip + the CLI subprocess oracle (the two "hermetic fakes
// don't prove wiring" guards — the lock primitive and the main() path must be exercised live).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  decideReconnect,
  acquireReconnectLock,
  spawnDaemon,
  maybeReconnect,
  probeDaemon,
  renderReconnectLine,
  DEFAULT_LOCK_TTL_MS,
  // MCP-ALWAYS-CONNECTED FIX4/6 (golf 2026-06-02): BOOTING-aware restart predicate + unified port lock.
  decideRestart,
  resolveBootGraceMs,
  BOOT_GRACE_MS,
  DEFAULT_PORT_LOCK_PATH,
  readPortLock,
  writePortLock,
  isOwnerAlive,
} from "./mcp-reconnect-action.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "mcp-reconnect.mjs");

// ── decideReconnect (pure) ────────────────────────────────────────────────────
test("decideReconnect: up → never reconnect", () => {
  const d = decideReconnect({ up: true, now: 1000, lock: null, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, false);
  assert.equal(d.reason, "already-connected");
});

test("decideReconnect: down + no lock → reconnect", () => {
  const d = decideReconnect({ up: false, now: 1000, lock: null, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, true);
  assert.equal(d.reason, "no-lock");
});

test("decideReconnect: down + fresh lock → single-flight skip", () => {
  const d = decideReconnect({ up: false, now: 1000 + 5000, lock: { startedAt: 1000 }, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, false);
  assert.equal(d.reason, "reconnect-in-flight");
  assert.equal(d.lockAgeMs, 5000);
});

test("decideReconnect: down + stale lock → reclaim", () => {
  const d = decideReconnect({ up: false, now: 1000 + 61000, lock: { startedAt: 1000 }, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, true);
  assert.equal(d.reason, "stale-lock-reclaim");
  assert.ok(d.lockAgeMs >= 60000);
});

test("decideReconnect: future-dated lock (clock skew) → defer, never spawn", () => {
  const d = decideReconnect({ up: false, now: 1000, lock: { startedAt: 9999 }, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, false);
  assert.equal(d.reason, "reconnect-in-flight");
});

test("decideReconnect: lock without finite startedAt → treated as absent → reconnect", () => {
  const d = decideReconnect({ up: false, now: 1000, lock: { pid: 5 }, ttlMs: 60000 });
  assert.equal(d.shouldReconnect, true);
  assert.equal(d.reason, "no-lock");
});

// ── maybeReconnect (orchestrator, injected deps) ──────────────────────────────
function recorder() {
  const calls = [];
  return { calls, fn: (...a) => { calls.push(a); return undefined; } };
}

test("maybeReconnect: disabled knob → no-op", () => {
  let spawned = false;
  const r = maybeReconnect({
    up: false, env: { PRISM_MCP_AUTORECONNECT_DISABLE: "1" },
    spawnDaemonImpl: () => { spawned = true; return { spawned: true }; },
  });
  assert.equal(r.action, "disabled");
  assert.equal(spawned, false);
});

test("maybeReconnect: up=true → action none, never spawns", () => {
  let spawned = false;
  const r = maybeReconnect({
    up: true, env: {},
    spawnDaemonImpl: () => { spawned = true; return { spawned: true }; },
  });
  assert.equal(r.action, "none");
  assert.equal(r.connected, true);
  assert.equal(spawned, false);
});

test("maybeReconnect: down + no lock → acquires + spawns", () => {
  const acq = [];
  const spawns = [];
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000,
    readLockImpl: () => null,
    acquireImpl: (p, info, o) => { acq.push({ p, info, o }); return true; },
    spawnDaemonImpl: (helper) => { spawns.push(helper); return { spawned: true, pid: 4242, reason: "spawned" }; },
  });
  assert.equal(r.action, "spawned");
  assert.equal(r.pid, 4242);
  assert.equal(acq.length, 1);
  assert.equal(acq[0].o.reclaimStale, false); // no-lock path is not a reclaim
  assert.equal(spawns.length, 1);
});

test("maybeReconnect: down + fresh lock → skip, never spawns (single-flight)", () => {
  let spawned = false;
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000 + 5000, ttlMs: 60000,
    readLockImpl: () => ({ startedAt: 1000, pid: 99 }),
    acquireImpl: () => { throw new Error("must not acquire when in-flight"); },
    spawnDaemonImpl: () => { spawned = true; return { spawned: true }; },
  });
  assert.equal(r.action, "skip");
  assert.equal(r.reason, "reconnect-in-flight");
  assert.equal(spawned, false);
});

test("maybeReconnect: down + stale lock → reclaim + spawn", () => {
  let reclaimFlag = null;
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000 + 61000, ttlMs: 60000,
    readLockImpl: () => ({ startedAt: 1000 }),
    acquireImpl: (p, info, o) => { reclaimFlag = o.reclaimStale; return true; },
    spawnDaemonImpl: () => ({ spawned: true, pid: 7, reason: "spawned" }),
  });
  assert.equal(r.action, "spawned");
  assert.equal(reclaimFlag, true);
});

test("maybeReconnect: lost the acquire race → skip lock-race-lost", () => {
  let spawned = false;
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000,
    readLockImpl: () => null,
    acquireImpl: () => false,
    spawnDaemonImpl: () => { spawned = true; return { spawned: true }; },
  });
  assert.equal(r.action, "skip");
  assert.equal(r.reason, "lock-race-lost");
  assert.equal(spawned, false);
});

test("maybeReconnect: spawn fails → action spawn-failed (honest, R12)", () => {
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000,
    readLockImpl: () => null,
    acquireImpl: () => true,
    spawnDaemonImpl: () => ({ spawned: false, reason: "daemon-helper-missing" }),
  });
  assert.equal(r.action, "spawn-failed");
  assert.equal(r.reason, "daemon-helper-missing");
});

test("maybeReconnect: internal throw is caught (fail-soft never breaks a hook)", () => {
  const r = maybeReconnect({
    up: false, env: {}, now: () => 1000,
    readLockImpl: () => null,
    acquireImpl: () => { throw new Error("boom"); },
  });
  assert.equal(r.ok, false);
  assert.equal(r.action, "error");
  assert.match(r.reason, /boom/);
});

test("maybeReconnect: accepts `ok` alias (mcp-connectivity-check uses .ok, not .up)", () => {
  // The integration seam: the per-turn hook's probe result field is `ok`. { ok:true } must no-op.
  let spawned = false;
  const r1 = maybeReconnect({ ok: true, env: {}, spawnDaemonImpl: () => { spawned = true; return { spawned: true }; } });
  assert.equal(r1.action, "none");
  assert.equal(r1.connected, true);
  assert.equal(spawned, false);
  // { ok:false } must take the down path → spawn.
  const r2 = maybeReconnect({
    ok: false, env: {}, now: () => 1000,
    readLockImpl: () => null, acquireImpl: () => true,
    spawnDaemonImpl: () => ({ spawned: true, pid: 9, reason: "spawned" }),
  });
  assert.equal(r2.action, "spawned");
});

test("maybeReconnect: explicit up wins over ok", () => {
  const r = maybeReconnect({ up: true, ok: false, env: {}, spawnDaemonImpl: () => ({ spawned: true }) });
  assert.equal(r.action, "none"); // up:true respected, ok:false ignored
});

test("maybeReconnect: PRISM_MCP_AUTORECONNECT_TTL_MS env override is honored", () => {
  // tiny TTL → a 5s-old lock is already STALE → reclaim + spawn.
  let reclaimed = null;
  const r = maybeReconnect({
    ok: false, env: { PRISM_MCP_AUTORECONNECT_TTL_MS: "1000" }, now: () => 1000 + 5000,
    readLockImpl: () => ({ startedAt: 1000 }),
    acquireImpl: (p, info, o) => { reclaimed = o.reclaimStale; return true; },
    spawnDaemonImpl: () => ({ spawned: true, reason: "spawned" }),
  });
  assert.equal(r.action, "spawned");
  assert.equal(reclaimed, true); // 5000ms age > 1000ms TTL → stale
});

test("maybeReconnect: real-fs stale lock self-heals (no deadlock) end-to-end", () => {
  // Proves the prompt's worry — a stale/abandoned lock from a failed prior spawn CANNOT wedge
  // reconnect forever. Uses the REAL readLock + acquireReconnectLock (only spawn is faked) so the
  // stale-decision → reclaimStale:true → real unlink+rewrite wiring is exercised together.
  const dir = path.join(os.tmpdir(), `mcp-reconnect-e2e-${process.pid}-${Date.now()}`);
  const lockPath = path.join(dir, "x.lock");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999, startedAt: 1 })); // abandoned, ancient
    let spawnHelper = null;
    const r = maybeReconnect({
      ok: false, env: {}, ttlMs: DEFAULT_LOCK_TTL_MS,
      now: () => 1 + DEFAULT_LOCK_TTL_MS + 1000, // past the abandoned lock's TTL
      lockPath,
      spawnDaemonImpl: (helper) => { spawnHelper = helper; return { spawned: true, pid: 1, reason: "spawned" }; },
    });
    assert.equal(r.action, "spawned");                       // reclaimed → spawned, NOT deadlocked
    const held = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.equal(held.pid, process.pid);                     // WE now hold the rewritten lock
    assert.ok(spawnHelper);                                  // spawn actually fired
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  }
});

// ── spawnDaemon (injected) ────────────────────────────────────────────────────
test("spawnDaemon: missing helper → spawned:false, never spawns", () => {
  let called = false;
  const r = spawnDaemon("/no/such/helper.mjs", {
    existsImpl: () => false,
    spawnImpl: () => { called = true; return { pid: 1, unref() {} }; },
  });
  assert.equal(r.spawned, false);
  assert.equal(r.reason, "daemon-helper-missing");
  assert.equal(called, false);
});

test("spawnDaemon: present helper → detached `<helper> start`, returns pid", () => {
  let captured = null;
  const r = spawnDaemon("/fake/mcp-server-daemon.mjs", {
    existsImpl: () => true,
    spawnImpl: (cmd, args, o) => { captured = { cmd, args, o }; return { pid: 555, unref() {} }; },
  });
  assert.equal(r.spawned, true);
  assert.equal(r.pid, 555);
  assert.deepEqual(captured.args, ["/fake/mcp-server-daemon.mjs", "start"]);
  assert.equal(captured.o.detached, true);
  assert.equal(captured.o.stdio, "ignore");
});

test("spawnDaemon: spawn throws → spawned:false with reason", () => {
  const r = spawnDaemon("/fake/d.mjs", {
    existsImpl: () => true,
    spawnImpl: () => { throw new Error("ENOENT node"); },
  });
  assert.equal(r.spawned, false);
  assert.match(r.reason, /spawn-error/);
});

// ── acquireReconnectLock — REAL fs O_EXCL round-trip (wiring guard) ────────────
test("acquireReconnectLock: real O_EXCL single-flight + stale reclaim", () => {
  const dir = path.join(os.tmpdir(), `mcp-reconnect-test-${process.pid}-${Date.now()}`);
  const lockPath = path.join(dir, "x.lock");
  try {
    // first acquire wins
    assert.equal(acquireReconnectLock(lockPath, { pid: 1, startedAt: 1 }), true);
    assert.equal(fs.existsSync(lockPath), true);
    // second acquire WITHOUT reclaim loses (O_EXCL EEXIST)
    assert.equal(acquireReconnectLock(lockPath, { pid: 2, startedAt: 2 }), false);
    // with reclaimStale it unlinks + reacquires
    assert.equal(acquireReconnectLock(lockPath, { pid: 3, startedAt: 3 }, { reclaimStale: true }), true);
    const held = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.equal(held.pid, 3);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  }
});

// ── probeDaemon (injected httpClient) ─────────────────────────────────────────
function fakeHttp(behavior) {
  return {
    request(_opts, cb) {
      const handlers = {};
      const req = {
        on(ev, h) { handlers[ev] = h; return req; },
        end() {
          queueMicrotask(() => {
            if (behavior.type === "response") cb({ statusCode: behavior.status });
            else if (behavior.type === "error") handlers.error?.(Object.assign(new Error("x"), { code: behavior.code }));
            else if (behavior.type === "timeout") handlers.timeout?.();
          });
        },
        destroy() {},
      };
      return req;
    },
  };
}

test("probeDaemon: 200 → up", async () => {
  const r = await probeDaemon({ httpClient: fakeHttp({ type: "response", status: 200 }) });
  assert.equal(r.up, true);
  assert.equal(r.status, 200);
});

test("probeDaemon: 404 (listening) → up", async () => {
  const r = await probeDaemon({ httpClient: fakeHttp({ type: "response", status: 404 }) });
  assert.equal(r.up, true);
});

test("probeDaemon: 503 → down", async () => {
  const r = await probeDaemon({ httpClient: fakeHttp({ type: "response", status: 503 }) });
  assert.equal(r.up, false);
});

test("probeDaemon: ECONNREFUSED → down", async () => {
  const r = await probeDaemon({ httpClient: fakeHttp({ type: "error", code: "ECONNREFUSED" }) });
  assert.equal(r.up, false);
  assert.equal(r.error, "ECONNREFUSED");
});

test("probeDaemon: timeout → down", async () => {
  const r = await probeDaemon({ httpClient: fakeHttp({ type: "timeout" }) });
  assert.equal(r.up, false);
  assert.equal(r.error, "timeout");
});

// ── renderReconnectLine (pure) ────────────────────────────────────────────────
test("renderReconnectLine: shapes per action", () => {
  assert.match(renderReconnectLine({ action: "spawned", pid: 12 }), /auto-reconnect.*initiated.*12/);
  assert.match(renderReconnectLine({ action: "skip", reason: "reconnect-in-flight" }), /single-flight/);
  assert.match(renderReconnectLine({ action: "spawn-failed", reason: "daemon-helper-missing" }), /spawn failed/);
  assert.equal(renderReconnectLine({ action: "disabled" }), "");
  assert.equal(renderReconnectLine(null), "");
});

// ── CLI subprocess oracle (the main() path must be exercised live) ────────────
test("CLI --probe-only --json emits valid JSON with a boolean up field", () => {
  const res = spawnSync(process.execPath, [CLI, "--probe-only", "--json"], { encoding: "utf8", timeout: 15000 });
  assert.equal(res.status, 0, `CLI exit ${res.status}: ${res.stderr}`);
  const out = JSON.parse(res.stdout);
  assert.equal(typeof out.up, "boolean");
});

test("CLI default run is fail-soft (exit 0) and JSON-parseable with --json", () => {
  // PRISM_MCP_AUTORECONNECT_DISABLE=1 → action disabled, never spawns a real daemon in test.
  const res = spawnSync(process.execPath, [CLI, "--json"], {
    encoding: "utf8", timeout: 15000,
    env: { ...process.env, PRISM_MCP_AUTORECONNECT_DISABLE: "1" },
  });
  assert.equal(res.status, 0, `CLI exit ${res.status}: ${res.stderr}`);
  const out = JSON.parse(res.stdout);
  assert.equal(out.action, "disabled");
});

// ── decideRestart (pure, BOOTING-aware — FIX4/6 core) ─────────────────────────
test("decideRestart: healthUp → healthy, never restart", () => {
  const d = decideRestart({ healthUp: true, lock: null, now: 1000 });
  assert.equal(d.state, "healthy");
  assert.equal(d.shouldRestart, false);
});

test("decideRestart: down + fresh boot stamp + owner alive → BOOTING, defer (kills the flap)", () => {
  // bootStartedAt 30s ago, well inside the 90s grace; a live owner is mid-boot → leave alone.
  const d = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 70000, pid: 5 }, ownerAlive: true });
  assert.equal(d.state, "booting");
  assert.equal(d.shouldRestart, false);
  assert.equal(d.reason, "peer-booting");
  assert.equal(d.bootAgeMs, 30000);
});

test("decideRestart: down + fresh boot stamp + owner DEAD → restart (corpse short-circuits grace)", () => {
  // Within grace, but the owner PID is gone → a crash-during-boot must NOT be left to rot 90s.
  const d = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 70000, pid: 5 }, ownerAlive: false });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "owner-dead-in-grace");
});

test("decideRestart: down + boot stamp older than grace → restart (boot wedged, bounded — no deadlock)", () => {
  const d = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 1000, pid: 5 }, ownerAlive: true, bootGraceMs: 90000 });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "boot-grace-exhausted");
});

test("decideRestart: down + future-dated boot stamp (clock skew) → defer, never restart", () => {
  const d = decideRestart({ healthUp: false, now: 1000, lock: { bootStartedAt: 9999, pid: 5 }, ownerAlive: true });
  assert.equal(d.state, "booting");
  assert.equal(d.shouldRestart, false);
  assert.equal(d.reason, "peer-booting-clockskew");
});

test("decideRestart: down + no lock → restart (no-lock)", () => {
  const d = decideRestart({ healthUp: false, now: 1000, lock: null });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "no-lock");
});

test("decideRestart: down + lock WITHOUT boot stamp → restart (wedged server, watchdog territory)", () => {
  const d = decideRestart({ healthUp: false, now: 1000, lock: { pid: 5, startedAt: 1 }, ownerAlive: true });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "no-boot-stamp");
});

// ── ownerAlive UNDEFINED (uncheckable owner) — bounded-defer contract (P1-b/c) ──
test("decideRestart: down + fresh boot + ownerAlive UNDEFINED → BOOTING (bounded defer, not a deadlock)", () => {
  // A caller that omits ownerAlive (or isOwnerAlive returned undefined for a bad pid): within grace we
  // DEFER — but only until grace exhausts (proven bounded by the next test). Never force-kill an
  // un-checkable owner mid-boot.
  const d = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 70000 } });
  assert.equal(d.state, "booting");
  assert.equal(d.shouldRestart, false);
  assert.equal(d.reason, "peer-booting");
});

test("decideRestart: down + grace-exhausted + ownerAlive UNDEFINED → restart (defer IS bounded)", () => {
  // Same uncheckable owner, but the boot stamp is now older than grace → MUST restart regardless of
  // ownerAlive. This is the invariant that guarantees the undefined-ownerAlive defer can never wedge.
  const d = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 1000 } });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "boot-grace-exhausted");
});

test("decideRestart: PRISM_MCP_BOOT_GRACE_MS env knob is LIVE without explicit bootGraceMs (P1-a)", () => {
  // env grace = 5000ms; a boot 10s old is now PAST grace → restart. Without the env (default 90s) the
  // same input would be BOOTING. Proves the knob takes effect via `env` alone — no caller threading.
  const withKnob = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 90000 }, ownerAlive: true, env: { PRISM_MCP_BOOT_GRACE_MS: "5000" } });
  assert.equal(withKnob.shouldRestart, true);
  assert.equal(withKnob.reason, "boot-grace-exhausted");
  const noKnob = decideRestart({ healthUp: false, now: 100000, lock: { bootStartedAt: 90000 }, ownerAlive: true, env: {} });
  assert.equal(noKnob.shouldRestart, false); // default 90s grace → still booting
  assert.equal(noKnob.state, "booting");
});

// ── resolveBootGraceMs + BOOT_GRACE_MS (fat-finger guard — 8ms-typo precedent) ──
test("BOOT_GRACE_MS is the expected 90s default (regression guard against a fat-finger)", () => {
  assert.equal(BOOT_GRACE_MS, 90000);
});

test("resolveBootGraceMs: default when env unset", () => {
  assert.equal(resolveBootGraceMs({}), 90000);
});

test("resolveBootGraceMs: honors a sane override", () => {
  assert.equal(resolveBootGraceMs({ PRISM_MCP_BOOT_GRACE_MS: "120000" }), 120000);
});

test("resolveBootGraceMs: rejects a sub-1000ms value (the 8ms-typo class) → falls back to default", () => {
  assert.equal(resolveBootGraceMs({ PRISM_MCP_BOOT_GRACE_MS: "8" }), 90000);
  assert.equal(resolveBootGraceMs({ PRISM_MCP_BOOT_GRACE_MS: "0" }), 90000);
  assert.equal(resolveBootGraceMs({ PRISM_MCP_BOOT_GRACE_MS: "notanumber" }), 90000);
});

// ── isOwnerAlive (injected killImpl) ──────────────────────────────────────────
test("isOwnerAlive: live PID (signal 0 succeeds) → true", () => {
  assert.equal(isOwnerAlive(123, { killImpl: () => true }), true);
});

test("isOwnerAlive: dead PID (ESRCH) → false", () => {
  assert.equal(isOwnerAlive(123, { killImpl: () => { throw Object.assign(new Error("x"), { code: "ESRCH" }); } }), false);
});

test("isOwnerAlive: EPERM (exists but not ours) → true", () => {
  assert.equal(isOwnerAlive(123, { killImpl: () => { throw Object.assign(new Error("x"), { code: "EPERM" }); } }), true);
});

test("isOwnerAlive: non-int / non-positive pid → undefined (uncheckable)", () => {
  assert.equal(isOwnerAlive(0), undefined);
  assert.equal(isOwnerAlive(-1), undefined);
  assert.equal(isOwnerAlive(undefined), undefined);
  assert.equal(isOwnerAlive(3.5), undefined);
});

test("isOwnerAlive: REAL current process is alive (live syscall, not a fake)", () => {
  assert.equal(isOwnerAlive(process.pid), true);
});

// ── readPortLock / writePortLock — REAL fs round-trip (wiring guard) ───────────
test("readPortLock: missing file → null; garbage → null; valid JSON object → object", () => {
  const dir = path.join(os.tmpdir(), `mcp-portlock-r-${process.pid}-${Date.now()}`);
  const lp = path.join(dir, "p.lock");
  try {
    assert.equal(readPortLock(lp), null); // missing
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(lp, "not json {{");
    assert.equal(readPortLock(lp), null); // garbage
    fs.writeFileSync(lp, JSON.stringify({ pid: 7, bootStartedAt: 42 }));
    const o = readPortLock(lp);
    assert.equal(o.pid, 7);
    assert.equal(o.bootStartedAt, 42);
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } }
});

test("writePortLock → readPortLock round-trip preserves the canonical fields", () => {
  const dir = path.join(os.tmpdir(), `mcp-portlock-w-${process.pid}-${Date.now()}`);
  const lp = path.join(dir, "p.lock");
  try {
    const ok = writePortLock({ pid: 11, startedAt: 100, bootStartedAt: 100, reason: "spawn", role: "supervisor" }, lp);
    assert.equal(ok, true);
    const o = readPortLock(lp);
    assert.equal(o.pid, 11);
    assert.equal(o.bootStartedAt, 100);
    assert.equal(o.reason, "spawn");
    assert.equal(o.role, "supervisor");
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } }
});

test("writePortLock: fail-soft → false when the write impl throws (never breaks a restarter)", () => {
  const r = writePortLock({ pid: 1 }, "/x/y.lock", { mkdirImpl: () => {}, writeImpl: () => { throw new Error("EACCES"); } });
  assert.equal(r, false);
});

// decideRestart end-to-end with the REAL port lock + REAL liveness of THIS process: a fresh boot
// stamp owned by a live PID must classify BOOTING (proves readPortLock + isOwnerAlive + decideRestart
// compose, not just in isolation).
test("decideRestart: real port-lock + real live-owner → BOOTING (composition guard)", () => {
  const dir = path.join(os.tmpdir(), `mcp-portlock-e2e-${process.pid}-${Date.now()}`);
  const lp = path.join(dir, "p.lock");
  try {
    const FIXED_NOW = 1_000_000_000_000;
    writePortLock({ pid: process.pid, startedAt: FIXED_NOW, bootStartedAt: FIXED_NOW - 10000, reason: "spawn", role: "supervisor" }, lp);
    const lock = readPortLock(lp);
    const d = decideRestart({ healthUp: false, now: FIXED_NOW, lock, ownerAlive: isOwnerAlive(lock.pid) });
    assert.equal(d.state, "booting");
    assert.equal(d.shouldRestart, false);
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } }
});

test("DEFAULT_PORT_LOCK_PATH points at the shared state dir", () => {
  assert.match(DEFAULT_PORT_LOCK_PATH, /state[\\/]shared[\\/]\.mcp-server-3100\.lock$/);
});

assert.ok(DEFAULT_LOCK_TTL_MS > 0);
