#!/usr/bin/env node
// tier: test
// Tests for mcp-bridge-enforce.mjs -- the PreToolUse MCP-bridge ENFORCEMENT decision.
// Intent (R9): a CONFIDENT disconnect blocks ONCE per episode (no deadlock), a fleet
// outage also broadcasts, and NO no-signal verdict ever false-blocks.

import test from "node:test";
import assert from "node:assert/strict";
import {
  decideEnforcement,
  buildEnforceReason,
  buildBroadcastSignal,
  shouldWriteBroadcast,
  DEFAULT_THROTTLE_MS,
  DEFAULT_BROADCAST_TTL_SEC,
  BROADCAST_SCHEMA_VERSION,
} from "./mcp-bridge-enforce.mjs";

const T0 = 1_700_000_000_000; // fixed clock

// ---- HAPPY PATH: connected -> never block ----
test("connected bridge (verdict.alive) -> no block, kind=connected", () => {
  const d = decideEnforcement({
    verdict: { alive: true, reason: "ok", pid: 123, ageMs: 1000 },
    fleetBridges: { ok: true, bridges: 4, ageSec: 30 },
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, false);
  assert.equal(d.broadcast, false);
  assert.equal(d.kind, "connected");
  assert.equal(d.reason, null);
});

// ---- FAILURE MODE 1: per-chat pid-dead -> block, NO broadcast (local death) ----
test("pid-dead (first time) -> block, no broadcast, reason cites pid-dead", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 50992, ageMs: 5000 },
    fleetBridges: { ok: true, bridges: 3, ageSec: 20 }, // peers alive
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, true);
  assert.equal(d.kind, "per-chat");
  assert.equal(d.broadcast, false, "a per-chat death must NOT broadcast to the fleet");
  assert.match(d.reason, /pid-dead/);
  assert.match(d.reason, /50992/);
  assert.match(d.reason, /\/mcp/);
});

// ---- FAILURE MODE 2: stale-heartbeat -> block ----
test("stale-heartbeat (first time) -> block", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "stale-heartbeat", pid: 777, ageMs: 200000 },
    fleetBridges: null,
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, true);
  assert.equal(d.kind, "per-chat");
  assert.match(d.reason, /stale-heartbeat/);
});

// ---- FLEET-WIDE outage -> broadcast ONLY, NEVER a hard block (fleet staging safety) ----
test("fleet bridges===0 (no per-chat signal) -> NO hard block, broadcast only, kind=fleet-advisory", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "no-sentinel", pid: null, ageMs: null }, // no per-chat signal
    fleetBridges: { ok: true, bridges: 0, ageSec: 42 },
    lastEnforcedMs: 0,
    now: T0,
  });
  // operator 2026-06-16: a shared/stale fleet count must NOT hard-block (it fires in
  // every chat at once -> shared-tree git staging corruption). Broadcast only.
  assert.equal(d.block, false, "fleet-wide count must NOT hard-block");
  assert.equal(d.kind, "fleet-advisory");
  assert.equal(d.broadcast, true, "a fleet-wide outage still broadcasts the /mcp signal");
  assert.equal(d.reason, null);
});

// ---- U-MCP-FALSEPOS-SUPPRESS (golf 2026-06-17): serverUp gates the broadcast ----
// A fleet count of 0 transient bridges is the NORMAL IDLE state when :3100 is healthy
// (bridges are transient; 0-live is the resting value). With serverUp===true that is NOT
// an outage -> no /mcp reconnect broadcast. A real server-down (serverUp false/undefined)
// still broadcasts. The per-chat HARD-BLOCK decision is unaffected by serverUp.
test("serverUp:true + fleet-0 (no per-chat signal) -> broadcast SUPPRESSED (idle, not outage)", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "no-sentinel", pid: null, ageMs: null },
    fleetBridges: { ok: true, bridges: 0, ageSec: 12 },
    serverUp: true,
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, false, "fleet-0 still never hard-blocks");
  assert.equal(d.kind, "fleet-advisory");
  assert.equal(d.broadcast, false, "a HEALTHY server + 0 transient bridges is idle -> NO broadcast");
});

test("serverUp:false + fleet-0 -> broadcast STILL fires (genuine server outage)", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "no-sentinel", pid: null, ageMs: null },
    fleetBridges: { ok: true, bridges: 0, ageSec: 12 },
    serverUp: false,
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.broadcast, true, "server DOWN + 0 bridges is a real outage -> broadcast /mcp");
});

test("serverUp:true does NOT change the per-chat hard-block (only suppresses broadcast)", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 4242, ageMs: 1 },
    fleetBridges: { ok: true, bridges: 0, ageSec: 5 },
    serverUp: true,
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, true, "THIS chat's pid-dead bridge still hard-blocks regardless of server health");
  assert.match(d.reason, /pid-dead/);
  assert.equal(d.broadcast, false, "but the fleet broadcast is suppressed on a healthy server");
});

// ---- NO-FALSE-POSITIVE: no-signal verdicts never block ----
for (const reason of ["no-sentinel", "unknown-slot", "parse-error"]) {
  test(`no-signal verdict '${reason}' (no fleet outage) -> NEVER block`, () => {
    const d = decideEnforcement({
      verdict: { alive: false, reason, pid: null, ageMs: null },
      fleetBridges: { ok: false, reason: "no-cache" }, // no fleet evidence either
      lastEnforcedMs: 0,
      now: T0,
    });
    assert.equal(d.block, false, `${reason} must not block (pre-upgrade/shared-tree chat)`);
    assert.equal(d.kind, "no-signal");
  });
}

// ---- NO-FALSE-POSITIVE: a STALE/absent fleet cache is not an outage ----
test("fleet cache ok:false (stale/absent) -> NOT an outage, no block", () => {
  for (const fb of [
    { ok: false, reason: "stale-cache", ageSec: 1200 },
    { ok: false, reason: "no-cache" },
    null,
  ]) {
    const d = decideEnforcement({
      verdict: { alive: false, reason: "no-sentinel" },
      fleetBridges: fb,
      lastEnforcedMs: 0,
      now: T0,
    });
    assert.equal(d.block, false, `fleet=${JSON.stringify(fb)} must not be treated as outage`);
  }
});

// ---- NO-DEADLOCK: throttle suppresses re-block within the window ----
test("disconnected but within throttle window -> no re-block (no deadlock)", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 1, ageMs: 9999 },
    fleetBridges: { ok: true, bridges: 0, ageSec: 10 },
    lastEnforcedMs: T0 - 60_000, // blocked 60s ago, throttle is 180s
    now: T0,
  });
  assert.equal(d.block, false);
  assert.equal(d.kind, "throttled");
  assert.equal(d.broadcast, false, "no re-broadcast inside the throttle window");
});

test("throttle elapsed -> blocks again", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 1, ageMs: 9999 },
    fleetBridges: { ok: true, bridges: 3, ageSec: 10 },
    lastEnforcedMs: T0 - (DEFAULT_THROTTLE_MS + 1),
    now: T0,
  });
  assert.equal(d.block, true);
});

test("custom throttleMs=0 -> always allowed to re-block", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 1 },
    fleetBridges: null,
    lastEnforcedMs: T0 - 1,
    now: T0,
    throttleMs: 0,
  });
  assert.equal(d.block, true);
});

// ---- ADVERSARIAL 1: null/garbage inputs -> fail safe (no block) ----
test("adversarial: null verdict + null fleet -> no block, no throw", () => {
  const d = decideEnforcement({ verdict: null, fleetBridges: null, lastEnforcedMs: 0, now: T0 });
  assert.equal(d.block, false);
  assert.equal(d.kind, "no-signal");
});

test("adversarial: empty object args -> no block, no throw", () => {
  const d = decideEnforcement({});
  assert.equal(d.block, false);
});

test("adversarial: non-finite lastEnforcedMs/now coerce safely", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 2 },
    fleetBridges: null,
    lastEnforcedMs: NaN,
    now: NaN, // -> falls back to Date.now(); just must not throw and must block (first time)
  });
  assert.equal(d.block, true);
});

// ---- ADVERSARIAL 2: BOTH per-chat dead AND fleet outage -> block + broadcast + kind=both ----
test("adversarial: per-chat dead AND fleet outage -> kind=both, block+broadcast", () => {
  const d = decideEnforcement({
    verdict: { alive: false, reason: "pid-dead", pid: 999, ageMs: 1 },
    fleetBridges: { ok: true, bridges: 0, ageSec: 5 },
    lastEnforcedMs: 0,
    now: T0,
  });
  assert.equal(d.block, true);
  assert.equal(d.kind, "both");
  assert.equal(d.broadcast, true);
  assert.match(d.reason, /pid-dead/);
  assert.match(d.reason, /0 mcp-http-bridge/);
});

// ---- buildEnforceReason: directly exercised (public export) ----
test("buildEnforceReason: fleet-only outage omits per-chat pid line", () => {
  const r = buildEnforceReason({ verdict: { reason: "no-sentinel" }, fleetOut: true, fleet: { ageSec: 7 } });
  assert.match(r, /0 mcp-http-bridge/);
  assert.match(r, /7s old/);
  assert.doesNotMatch(r, /THIS chat's bridge is/);
  assert.match(r, /PRISM_MCP_ENFORCE_DISABLE=1/);
});

// ---- buildBroadcastSignal: schema parity with mcp-broadcast-reconnect-inject.mjs ----
test("buildBroadcastSignal: schema fields + TTL math correct", () => {
  const s = buildBroadcastSignal({ now: T0, pid: 4242, ttlSec: 900 });
  assert.equal(s.schemaVersion, BROADCAST_SCHEMA_VERSION);
  assert.equal(s.signaledAtMs, T0);
  assert.equal(s.signaledByPid, 4242);
  assert.equal(s.ttlSec, 900);
  assert.equal(s.expiresAtMs, T0 + 900 * 1000);
  assert.equal(s.signaledAt, new Date(T0).toISOString());
  // consumer reads signaledAtMs as a number + expiresAtMs for TTL
  assert.equal(typeof s.signaledAtMs, "number");
});

test("buildBroadcastSignal: default ttl + default reason", () => {
  const s = buildBroadcastSignal({ now: T0 });
  assert.equal(s.ttlSec, DEFAULT_BROADCAST_TTL_SEC);
  assert.match(s.reason, /\/mcp reconnect prism/);
});

// ---- shouldWriteBroadcast: dedup window ----
test("shouldWriteBroadcast: absent signal -> write", () => {
  assert.equal(shouldWriteBroadcast(null, T0), true);
  assert.equal(shouldWriteBroadcast(undefined, T0), true);
  assert.equal(shouldWriteBroadcast("garbage", T0), true);
});

test("shouldWriteBroadcast: fresh signal -> do NOT rewrite (dedup across 26 chats)", () => {
  const fresh = { expiresAtMs: T0 + 60_000 };
  assert.equal(shouldWriteBroadcast(fresh, T0), false);
});

test("shouldWriteBroadcast: expired signal -> write", () => {
  const expired = { expiresAtMs: T0 - 1 };
  assert.equal(shouldWriteBroadcast(expired, T0), true);
});

test("shouldWriteBroadcast: malformed expiresAtMs -> write (fail-open to re-signal)", () => {
  assert.equal(shouldWriteBroadcast({ expiresAtMs: "nope" }, T0), true);
  assert.equal(shouldWriteBroadcast({}, T0), true);
});
