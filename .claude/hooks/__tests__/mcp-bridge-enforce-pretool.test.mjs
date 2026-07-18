#!/usr/bin/env node
// tier: test
// Round-trip test for mcp-bridge-enforce-pretool.mjs: spawns the hook as a
// subprocess (as the harness does) with a controlled sentinel + enum-cache, and
// asserts the deny/allow decision end-to-end. Intent (R9/R15): prove the GATE
// actually blocks a dead bridge, never deadlocks, never false-positives, and
// auto-broadcasts on a fleet-wide outage -- through the dispatcher (the real
// stdin->stdout contract), not just the pure lib.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, hostname } from "node:os";
import { fileURLToPath } from "node:url";
import { cachedServerUpVerdict } from "../mcp-bridge-enforce-pretool.mjs";

const HOOK = fileURLToPath(new URL("../mcp-bridge-enforce-pretool.mjs", import.meta.url));
const STDIN = JSON.stringify({ tool_name: "Bash", session_id: "test-sess", cwd: "H:/prism" });

function setup() {
  const root = mkdtempSync(join(tmpdir(), "mcpenf-"));
  const live = join(root, "live");
  mkdirSync(live, { recursive: true });
  mkdirSync(join(root, "state", "shared"), { recursive: true });
  return { root, live };
}
function cleanup(root) { try { rmSync(root, { recursive: true, force: true }); } catch {} }

function writeSentinel(live, slot, pid) {
  const n = Date.now();
  writeFileSync(join(live, `${slot}.json`),
    JSON.stringify({ v: 1, slot, pid, bridgeId: "b", startedAt: n, lastBeatAt: n, cwd: "x", mcpUrl: "x" }));
}

function runHook(env, stdin = STDIN) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: stdin,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  let out = {};
  try { out = JSON.parse(r.stdout.trim()); } catch { out = { _raw: r.stdout, _err: r.stderr }; }
  return out;
}
const isDeny = (o) => o && o.hookSpecificOutput && o.hookSpecificOutput.permissionDecision === "deny";
const isAllow = (o) => o && o.continue === true;

test("pid-dead sentinel -> hook DENIES the tool call", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "denyslot", 999999); // 999999 -> ESRCH -> pid-dead
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "denyslot", PRISM_MCP_BRIDGE_LIVE_DIR: live });
    assert.ok(isDeny(o), `expected deny, got ${JSON.stringify(o)}`);
    assert.match(o.hookSpecificOutput.permissionDecisionReason, /ENFORCED CHECK/);
    assert.match(o.hookSpecificOutput.permissionDecisionReason, /\/mcp/);
  } finally { cleanup(root); }
});

test("second call (same slot, immediate) -> ALLOWS (throttle, no deadlock)", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "throttleslot", 999999);
    const env = { PRISM_ROOT: root, PRISM_BOOT_SLOT: "throttleslot", PRISM_MCP_BRIDGE_LIVE_DIR: live };
    const first = runHook(env);
    assert.ok(isDeny(first), "first call should deny");
    const second = runHook(env); // lastEnforcedMs just persisted -> within throttle
    assert.ok(isAllow(second), `second call should allow (no deadlock), got ${JSON.stringify(second)}`);
  } finally { cleanup(root); }
});

test("PRISM_MCP_ENFORCE_DISABLE=1 -> always ALLOWS even when dead", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "disslot", 999999);
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "disslot", PRISM_MCP_BRIDGE_LIVE_DIR: live, PRISM_MCP_ENFORCE_DISABLE: "1" });
    assert.ok(isAllow(o), `disabled knob must allow, got ${JSON.stringify(o)}`);
  } finally { cleanup(root); }
});

test("live-pid sentinel -> ALLOWS (no false-positive)", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "liveslot", process.pid); // this test process IS alive
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "liveslot", PRISM_MCP_BRIDGE_LIVE_DIR: live });
    assert.ok(isAllow(o), `live bridge must allow, got ${JSON.stringify(o)}`);
  } finally { cleanup(root); }
});

test("no sentinel + no fleet cache -> ALLOWS (no-signal never false-blocks)", () => {
  const { root, live } = setup();
  try {
    // no sentinel for this slot, no enum cache under temp ROOT
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "ghostslot", PRISM_MCP_BRIDGE_LIVE_DIR: live });
    assert.ok(isAllow(o), `no-signal must allow, got ${JSON.stringify(o)}`);
  } finally { cleanup(root); }
});

test("orchestration tool (Agent) -> EXEMPT, ALLOWS even when bridge is dead", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "exemptslot", 999999); // dead bridge
    const agentStdin = JSON.stringify({ tool_name: "Agent", session_id: "x", cwd: "H:/prism" });
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "exemptslot", PRISM_MCP_BRIDGE_LIVE_DIR: live }, agentStdin);
    assert.ok(isAllow(o), `Agent must be exempt (own subagent connectivity), got ${JSON.stringify(o)}`);
    // and a non-exempt tool with the SAME dead sentinel still denies (exemption is scoped)
    const o2 = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "exemptslot", PRISM_MCP_BRIDGE_LIVE_DIR: live },
      JSON.stringify({ tool_name: "Bash", session_id: "x", cwd: "H:/prism" }));
    assert.ok(isDeny(o2), `Bash on the same dead bridge must still deny, got ${JSON.stringify(o2)}`);
  } finally { cleanup(root); }
});

test("fleet enum-cache shows 0 bridges + server health UNKNOWN -> ALLOWS but auto-writes broadcast signal", () => {
  const { root, live } = setup();
  try {
    // fresh enum cache with zero mcp-http-bridge procs => fleet-wide outage candidate
    const cache = join(root, "state", "shared", `.fleet-reaper-enum-cache-${hostname()}.json`);
    writeFileSync(cache, JSON.stringify({ procs: [{ cmd: "node some-other-thing.mjs" }] }));
    // Point health cache at a non-existent file -> server health UNKNOWN -> broadcast still fires
    // (conservative: only a CONFIRMED-healthy server suppresses; unknown/down keeps broadcasting).
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "fleetslot", PRISM_MCP_BRIDGE_LIVE_DIR: live,
      PRISM_MCP_CONNECTIVITY_STATE_FILE: join(root, "no-health.json") });
    assert.ok(isAllow(o), `fleet-only outage must NOT hard-block (staging-safety), got ${JSON.stringify(o)}`);
    const signal = join(root, "state", "shared", "mcp-reconnect-signal.json");
    assert.ok(existsSync(signal), "fleet outage (server health unknown) must still auto-write the broadcast signal");
  } finally { cleanup(root); }
});

test("fleet enum-cache 0 bridges + server CONFIRMED HEALTHY -> NO broadcast (idle, U-MCP-FALSEPOS-SUPPRESS)", () => {
  const { root, live } = setup();
  try {
    // 0 transient bridges, but a fresh /health cache proving :3100 is UP -> idle, NOT an outage.
    const cache = join(root, "state", "shared", `.fleet-reaper-enum-cache-${hostname()}.json`);
    writeFileSync(cache, JSON.stringify({ procs: [{ cmd: "node some-other-thing.mjs" }] }));
    const healthFile = join(root, "health.json");
    writeFileSync(healthFile, JSON.stringify({ lastProbeAt: Date.now(), lastStatus: { ok: true } }));
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "fleetslot2", PRISM_MCP_BRIDGE_LIVE_DIR: live,
      PRISM_MCP_CONNECTIVITY_STATE_FILE: healthFile });
    assert.ok(isAllow(o), `still must not hard-block, got ${JSON.stringify(o)}`);
    const signal = join(root, "state", "shared", "mcp-reconnect-signal.json");
    assert.equal(existsSync(signal), false, "a HEALTHY server + 0 transient bridges is idle -> NO false broadcast");
  } finally { cleanup(root); }
});

test("git command on a dead per-chat bridge -> ALLOWS (never interrupt shared-tree staging)", () => {
  const { root, live } = setup();
  try {
    writeSentinel(live, "gitslot", 999999); // confirmed dead per-chat bridge
    const gitStdin = JSON.stringify({ tool_name: "Bash", session_id: "x", cwd: "H:/prism", tool_input: { command: "rtk git add foo.ts && rtk git commit -m x" } });
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "gitslot", PRISM_MCP_BRIDGE_LIVE_DIR: live }, gitStdin);
    assert.ok(isAllow(o), `git must be exempt (staging safety), got ${JSON.stringify(o)}`);
    // control: a non-git Bash on the SAME dead bridge still denies (exemption is git-scoped)
    const o2 = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "gitslot", PRISM_MCP_BRIDGE_LIVE_DIR: live },
      JSON.stringify({ tool_name: "Bash", session_id: "x", cwd: "H:/prism", tool_input: { command: "ls -la" } }));
    assert.ok(isDeny(o2), `non-git Bash on dead per-chat bridge still denies, got ${JSON.stringify(o2)}`);
  } finally { cleanup(root); }
});

// ── U-MCP-FALSEPOS-IDLE-BROADCAST (slot golf 2026-06-17) ──
// The confirmed-live root cause: long turns / idle gaps age the UserPromptSubmit health cache
// past 120s; readCachedServerUp returned undefined (stale->unknown) even though :3100 was
// HEALTHY (peak_inflight=1), so decideEnforcement(serverUp:undefined) fired the false fleet
// broadcast. cachedServerUpVerdict now treats a last-known-healthy probe within the 900s suppress
// window as "up" for broadcast SUPPRESSION (never hard-block; down is never suppressed past 120s).

test("cachedServerUpVerdict: fresh(<=120s)+ok -> true (suppress)", () => {
  assert.equal(cachedServerUpVerdict({ ok: true }, 0), true);
  assert.equal(cachedServerUpVerdict({ ok: true }, 119_000), true);
});

test("cachedServerUpVerdict: fresh(<=120s)+down -> undefined (real fresh outage still broadcasts)", () => {
  assert.equal(cachedServerUpVerdict({ ok: false }, 0), undefined);
  assert.equal(cachedServerUpVerdict({ ok: false }, 100_000), undefined);
});

test("cachedServerUpVerdict: stale-but-healthy in (120s,900s] -> true (THE live-bug fix: 191s+ok suppresses)", () => {
  assert.equal(cachedServerUpVerdict({ ok: true }, 191_000), true); // the exact live value
  assert.equal(cachedServerUpVerdict({ ok: true }, 300_000), true);
  assert.equal(cachedServerUpVerdict({ ok: true }, 899_000), true);
  assert.equal(cachedServerUpVerdict({ ok: true }, 900_000), true); // boundary inclusive
});

test("cachedServerUpVerdict: truly stale (>900s) -> undefined (legacy broadcast path re-enabled)", () => {
  assert.equal(cachedServerUpVerdict({ ok: true }, 900_001), undefined);
  assert.equal(cachedServerUpVerdict({ ok: true }, 5_000_000), undefined);
});

test("cachedServerUpVerdict: stale + last-known-DOWN -> undefined (never suppress on a stale down signal)", () => {
  assert.equal(cachedServerUpVerdict({ ok: false }, 300_000), undefined);
});

test("cachedServerUpVerdict: malformed/negative age + null status -> undefined (fail-safe, never suppress)", () => {
  assert.equal(cachedServerUpVerdict(null, 0), undefined);
  assert.equal(cachedServerUpVerdict({ ok: true }, NaN), undefined);
  assert.equal(cachedServerUpVerdict({ ok: true }, -5), undefined);
  assert.equal(cachedServerUpVerdict(undefined, 50_000), undefined);
});

test("cachedServerUpVerdict: env-tunable suppress window honored", () => {
  // explicit smaller window: a 200s-old healthy probe is now BEYOND the window -> undefined
  assert.equal(cachedServerUpVerdict({ ok: true }, 200_000, 150_000), undefined);
  // explicit larger window keeps it suppressed
  assert.equal(cachedServerUpVerdict({ ok: true }, 200_000, 1_200_000), true);
});

test("ROUND-TRIP: 0 bridges + STALE-but-healthy (191s) health cache -> NO false broadcast (live-bug repro)", () => {
  const { root, live } = setup();
  try {
    const cache = join(root, "state", "shared", `.fleet-reaper-enum-cache-${hostname()}.json`);
    writeFileSync(cache, JSON.stringify({ procs: [{ cmd: "node some-other-thing.mjs" }] }));
    // health cache that probed OK 191s ago -- past the 120s fresh window, the exact live state
    // that previously fired the false fleet broadcast.
    const healthFile = join(root, "health.json");
    writeFileSync(healthFile, JSON.stringify({ lastProbeAt: Date.now() - 191_000, lastStatus: { ok: true } }));
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "staleok", PRISM_MCP_BRIDGE_LIVE_DIR: live,
      PRISM_MCP_CONNECTIVITY_STATE_FILE: healthFile });
    assert.ok(isAllow(o), `must not hard-block, got ${JSON.stringify(o)}`);
    const signal = join(root, "state", "shared", "mcp-reconnect-signal.json");
    assert.equal(existsSync(signal), false, "stale-but-recently-healthy server + 0 transient bridges is idle -> NO false broadcast");
  } finally { cleanup(root); }
});

test("ROUND-TRIP: 0 bridges + truly-stale (>900s) healthy cache -> broadcast STILL fires (no over-suppression)", () => {
  const { root, live } = setup();
  try {
    const cache = join(root, "state", "shared", `.fleet-reaper-enum-cache-${hostname()}.json`);
    writeFileSync(cache, JSON.stringify({ procs: [{ cmd: "node some-other-thing.mjs" }] }));
    const healthFile = join(root, "health.json");
    writeFileSync(healthFile, JSON.stringify({ lastProbeAt: Date.now() - 1_000_000, lastStatus: { ok: true } }));
    const o = runHook({ PRISM_ROOT: root, PRISM_BOOT_SLOT: "veryStale", PRISM_MCP_BRIDGE_LIVE_DIR: live,
      PRISM_MCP_CONNECTIVITY_STATE_FILE: healthFile });
    assert.ok(isAllow(o), `must not hard-block, got ${JSON.stringify(o)}`);
    const signal = join(root, "state", "shared", "mcp-reconnect-signal.json");
    assert.equal(existsSync(signal), true, ">900s-stale health is unknown -> legacy broadcast path must still fire");
  } finally { cleanup(root); }
});
