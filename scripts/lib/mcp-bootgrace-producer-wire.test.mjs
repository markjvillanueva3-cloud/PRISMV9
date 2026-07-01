#!/usr/bin/env node
// scripts/lib/mcp-bootgrace-producer-wire.test.mjs
// MCP-ALWAYS-CONNECTED / U-BOOTGRACE-PRODUCER-WIRE (golf 2026-06-04)
//
// Proves the producer→consumer contract the spawners now satisfy. Before this unit, NO spawner
// wrote bootStartedAt, so the FIX4/6 boot-grace (decideRestart + watchdog BOOTGUARD) was dormant
// with zero producers → the ~50s cold boot was unprotected → MCP :3100 flapped (restarter kills a
// booting server, resetting the boot clock).
//
// The fix wired writePortLock({bootStartedAt}) into BOTH spawners:
//   • scripts/mcp-server-supervisor.mjs spawnChild()   (canonical — watchdog + scheduled task)
//   • .claude/helpers/mcp-server-daemon.mjs start()    (the reconnect-hook's spawn path)
//
// These tests exercise the EXACT stamp shape those spawners write, round-trip it through
// readPortLock, and drive decideRestart through every state — so co-enabling BOOTGUARD with this
// stamp present provably DEFERS a kill during cold boot (no flap) while still restarting a dead/
// wedged server (no deadlock). Hermetic: injected write/read/mkdir impls, no real fs, no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  writePortLock,
  readPortLock,
  decideRestart,
  BOOT_GRACE_MS,
  bootGuardEnabled,
} from "./mcp-reconnect-action.mjs";

const LOCK_PATH = "/fake/state/shared/.mcp-server-3100.lock";

// ── MCP-RESILIENCE FIX-3: bootGuardEnabled is DEFAULT-ON (off ONLY via =0) ──
// Load-bearing: under the OLD `=== "1"` default-off semantics, the unset case returned
// false — so test 1 fails if the flip is reverted. Proves the watchdog now boot-defers
// by default (closing the cold-boot flap the U-BOOTGRACE producer made safe to enable).
test("bootGuardEnabled: DEFAULT-ON when PRISM_MCP_WATCHDOG_BOOTGUARD is unset", () => {
  assert.equal(bootGuardEnabled({}), true);
});
test("bootGuardEnabled: OFF only when explicitly '0'", () => {
  assert.equal(bootGuardEnabled({ PRISM_MCP_WATCHDOG_BOOTGUARD: "0" }), false);
});
test("bootGuardEnabled: ON for '1', empty string, and any other value", () => {
  assert.equal(bootGuardEnabled({ PRISM_MCP_WATCHDOG_BOOTGUARD: "1" }), true);
  assert.equal(bootGuardEnabled({ PRISM_MCP_WATCHDOG_BOOTGUARD: "" }), true);
  assert.equal(bootGuardEnabled({ PRISM_MCP_WATCHDOG_BOOTGUARD: "yes" }), true);
});

// ── producer: the spawner's stamp round-trips with a finite bootStartedAt ──
test("producer: writePortLock stamps a finite bootStartedAt that readPortLock returns intact", () => {
  let stored = null;
  const now = 1_000_000;
  const ok = writePortLock(
    { pid: 4242, startedAt: now, bootStartedAt: now, reason: "supervisor-spawn", role: "supervisor" },
    LOCK_PATH,
    { writeImpl: (_p, d) => { stored = d; }, mkdirImpl: () => {} },
  );
  assert.equal(ok, true);
  const lock = readPortLock(LOCK_PATH, { readImpl: () => stored });
  assert.ok(lock, "lock parses back");
  assert.equal(Number.isFinite(lock.bootStartedAt), true);
  assert.equal(lock.bootStartedAt, now);
  assert.equal(lock.pid, 4242);
  assert.equal(lock.role, "supervisor");
});

// ── consumer: the stamp drives decideRestart correctly (the wiring's whole point) ──
test("consumer: stamped lock within grace + live owner → BOOTING (defer, no kill) — ends the flap", () => {
  const bootAt = 5_000_000;
  const d = decideRestart({ healthUp: false, lock: { bootStartedAt: bootAt, pid: 4242 }, now: bootAt + 10_000, ownerAlive: true });
  assert.equal(d.state, "booting");
  assert.equal(d.shouldRestart, false);
  assert.equal(d.reason, "peer-booting");
});

test("consumer: stamped lock within grace + DEAD owner → restart (don't wait on a corpse)", () => {
  const bootAt = 5_000_000;
  const d = decideRestart({ healthUp: false, lock: { bootStartedAt: bootAt, pid: 4242 }, now: bootAt + 10_000, ownerAlive: false });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "owner-dead-in-grace");
});

test("consumer: grace exhausted (boot wedged > 90s) → restart (bounded, no deadlock)", () => {
  const bootAt = 5_000_000;
  const d = decideRestart({ healthUp: false, lock: { bootStartedAt: bootAt, pid: 4242 }, now: bootAt + BOOT_GRACE_MS + 1, ownerAlive: true });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "boot-grace-exhausted");
});

test("consumer: healthy server → never restart regardless of a stale stamp", () => {
  const d = decideRestart({ healthUp: true, lock: { bootStartedAt: 1, pid: 4242 }, now: 9_999_999, ownerAlive: true });
  assert.equal(d.state, "healthy");
  assert.equal(d.shouldRestart, false);
});

// ── adversarial: a missing/garbage stamp must NEVER silently defer forever ──
test("adversarial: no boot stamp in lock → DEAD/restart (never defer on an unprovable boot)", () => {
  const d = decideRestart({ healthUp: false, lock: { pid: 4242 }, now: 9_999_999, ownerAlive: true });
  assert.equal(d.state, "dead");
  assert.equal(d.shouldRestart, true);
  assert.equal(d.reason, "no-boot-stamp");
});

test("adversarial: future-dated bootStartedAt (clock skew) → BOOTING defer, never a negative-age kill", () => {
  const now = 5_000_000;
  const d = decideRestart({ healthUp: false, lock: { bootStartedAt: now + 60_000, pid: 4242 }, now, ownerAlive: true });
  assert.equal(d.state, "booting");
  assert.equal(d.shouldRestart, false);
  assert.equal(d.reason, "peer-booting-clockskew");
});
