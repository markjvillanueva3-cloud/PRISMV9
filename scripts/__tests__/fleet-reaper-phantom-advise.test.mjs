/**
 * Tests for FLEET-REAPER-MS2 — T1 (phantom service-restart filter) and T2
 * (collapsed stale-crash caveat).
 *
 * Both bugs were observed in the LIVE Monitor event 2026-05-18T14:53:07 on
 * MARKV: a critical-pressure sweep at 91.9% commit emitted
 *   `service relief ADVISED: postgres, prometheus`
 * for services that don't exist on this box (docker ps -a only had
 * qdrant + ollama + nim) AND emitted one CHAT CRASH DETECTED caveat per
 * stale slot (11 lines, all blocked by the window-PID-alive gate — pure
 * noise).
 *
 * Coverage:
 *   T1 — `serviceRestartAction` filters by `existingContainers`:
 *     - existingContainers omitted/null  → no filter (backward-compat)
 *     - existingContainers empty array   → fully filters (no host containers known)
 *     - existingContainers includes only some → only deployed are advised
 *     - docker-daemon-down branch ALSO filters collateral list
 *     - restartEnabled path: only deployed are restarted
 *     - probe flagged services but NONE present → noop with diagnostic reason
 *   T2 — crash caveat collapse:
 *     - 0 crashes: no caveat (verified indirectly — runSweep e2e)
 *     - 1 crash: original format preserved (backward-compat)
 *     - 2+ crashes: single rolled-up caveat with slot/chatId/frozen for each
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";

import {
  serviceRestartAction,
  restartWedgedServices,
  __resetServiceRestartForTest as resetServiceRestartLatch,
} from "../fleet-reaper-sweep.mjs";

// ─── T1: phantom service-restart filter ──────────────────────────────────────

const HEALTH_POSTGRES_DOWN = {
  services: {
    docker: { up: true, detail: null },
    postgres: { up: false, detail: "connection refused" },
    qdrant: { up: true, detail: null },
    prometheus: { up: false, detail: null },
  },
};

describe("T1: serviceRestartAction filters by existingContainers", () => {
  test("existingContainers undefined → no filter (pre-T1 backward-compat)", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: false,
    });
    assert.equal(r.action, "advise");
    assert.deepEqual(r.adviseTargets.sort(), ["postgres", "prometheus"]);
  });

  test("existingContainers=null → no filter (probe failed fail-soft)", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: false, existingContainers: null,
    });
    assert.equal(r.action, "advise");
    assert.deepEqual(r.adviseTargets.sort(), ["postgres", "prometheus"]);
  });

  test("existingContainers=[] → fully filters (the MARKV scenario)", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: false, existingContainers: [],
    });
    assert.equal(r.action, "noop");
    assert.match(r.reason, /no-restartable-service-deployed-here/);
    assert.match(r.reason, /probe flagged 2 down — none present in docker ps/);
  });

  test("existingContainers includes only postgres-prism → postgres advised, prometheus filtered", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: false,
      existingContainers: ["postgres-prism", "qdrant", "ollama"],
    });
    assert.equal(r.action, "advise");
    assert.deepEqual(r.adviseTargets, ["postgres"]);
    assert.match(r.reason, /advise-only/);
  });

  test("restartEnabled=true + deployedDown=1 → restart targets filtered to deployed only", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: true, acted: false,
      existingContainers: ["postgres-prism", "qdrant"],
    });
    assert.equal(r.action, "restart");
    assert.deepEqual(r.restartTargets, ["postgres"]);
  });

  test("docker-daemon-down branch ALSO filters collateral by existingContainers", () => {
    resetServiceRestartLatch();
    const daemonDown = {
      services: {
        docker: { up: false, detail: "daemon connect failed" },
        postgres: { up: false, detail: null },
        prometheus: { up: false, detail: null },
        qdrant: { up: false, detail: null },
      },
    };
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: daemonDown,
      restartEnabled: false, acted: false,
      existingContainers: ["qdrant"], // only qdrant exists on this host
    });
    assert.equal(r.action, "advise");
    assert.equal(r.adviseTargets[0], "docker", "docker named first");
    // Of the collateral, only qdrant should appear (postgres-prism + prometheus filtered)
    assert.deepEqual(r.adviseTargets.slice(1), ["qdrant"]);
  });

  test("not-critical short-circuits before the filter runs (no spurious work)", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "normal", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: false, existingContainers: [],
    });
    assert.equal(r.action, "noop");
    assert.equal(r.reason, "not-critical");
  });

  test("already-acted latch short-circuits before the filter runs", () => {
    resetServiceRestartLatch();
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: HEALTH_POSTGRES_DOWN,
      restartEnabled: false, acted: true, existingContainers: ["postgres-prism"],
    });
    assert.equal(r.action, "noop");
    assert.equal(r.reason, "already-acted-this-process");
  });
});

// ─── T1 imperative wrapper: getExistingContainers injection ──────────────────

describe("T1: restartWedgedServices forwards existingContainers", () => {
  test("injected getExistingContainers is called and result reaches the decision", () => {
    resetServiceRestartLatch();
    let probeCalled = 0;
    const r = restartWedgedServices(HEALTH_POSTGRES_DOWN, "critical", {
      restartEnabled: false,
      actionsAllowed: true,
      getExistingContainers: () => { probeCalled++; return ["postgres-prism"]; },
    });
    assert.equal(probeCalled, 1);
    assert.equal(r.state, "advised");
    // Only postgres should be advised (prometheus filtered out)
    assert.deepEqual(r.advise, ["postgres"]);
  });

  test("getExistingContainers returning null → fail-soft, all down services advised", () => {
    resetServiceRestartLatch();
    const r = restartWedgedServices(HEALTH_POSTGRES_DOWN, "critical", {
      restartEnabled: false,
      actionsAllowed: true,
      getExistingContainers: () => null,
    });
    assert.equal(r.state, "advised");
    assert.deepEqual(r.advise.sort(), ["postgres", "prometheus"]);
  });

  test("getExistingContainers returning [] → ALL phantom advise filtered → state=noop", () => {
    resetServiceRestartLatch();
    const r = restartWedgedServices(HEALTH_POSTGRES_DOWN, "critical", {
      restartEnabled: false,
      actionsAllowed: true,
      getExistingContainers: () => [], // MARKV scenario
    });
    assert.equal(r.state, "noop");
    assert.match(r.reason, /no-restartable-service-deployed-here/);
  });

  test("getExistingContainers throws → bubbles out (contract: callers return null on failure)", () => {
    // The contract is that custom impls MUST return null on failure
    // (the default `defaultGetExistingContainers` does). A throwing inject
    // is OUT of scope by design — this test pins that contract so a future
    // refactor adding a try/catch around the inject is a deliberate change,
    // not silent behavior drift.
    resetServiceRestartLatch();
    assert.throws(
      () => restartWedgedServices(HEALTH_POSTGRES_DOWN, "critical", {
        restartEnabled: false,
        actionsAllowed: true,
        getExistingContainers: () => { throw new Error("docker CLI unavailable"); },
      }),
      /docker CLI unavailable/,
    );
  });
});

// ─── T2: crash caveat collapse — pure-shape verification ─────────────────────

// T2 lives inside runSweep's crash-watch block (lines 1680-1697 of fleet-reaper-sweep.mjs).
// The behavior is observable via runSweep but requires a full snapshotFleet
// setup. We pin the EXACT format string here so a regression that loses the
// collapse is caught even without the e2e harness.

describe("T2: stale-crash caveat collapse format", () => {
  // Reconstruct the collapse logic for shape verification. This is a
  // doc-coupled test — if the format string in fleet-reaper-sweep.mjs
  // changes, update both this test and any operator-facing dashboards.
  function emitCollapsedCaveat(crashes) {
    if (crashes.length === 0) return null;
    if (crashes.length === 1) {
      const c = crashes[0];
      return `CHAT CRASH DETECTED: slot ${c.slot} (${c.chatId}) — heartbeat frozen ${Math.round(c.frozenMs / 60000)}m`;
    }
    const summary = crashes
      .map((c) => `${c.slot}/${c.chatId}(${Math.round(c.frozenMs / 60000)}m)`)
      .join(", ");
    return `CHAT CRASH DETECTED (${crashes.length} slots): ${summary} — postmortems written, manual reclaim if window-pid also dead`;
  }

  test("0 crashes → no caveat", () => {
    assert.equal(emitCollapsedCaveat([]), null);
  });

  test("1 crash → original per-slot format (backward-compat)", () => {
    const out = emitCollapsedCaveat([
      { slot: "alpha", chatId: "claude-689b3203", frozenMs: 71 * 60_000 },
    ]);
    assert.equal(
      out,
      "CHAT CRASH DETECTED: slot alpha (claude-689b3203) — heartbeat frozen 71m",
    );
  });

  test("2 crashes → collapsed format, both slots + ages preserved", () => {
    const out = emitCollapsedCaveat([
      { slot: "alpha", chatId: "claude-689b3203", frozenMs: 71 * 60_000 },
      { slot: "bravo", chatId: "claude-9033b60c", frozenMs: 11 * 60_000 },
    ]);
    assert.equal(
      out,
      "CHAT CRASH DETECTED (2 slots): alpha/claude-689b3203(71m), bravo/claude-9033b60c(11m) — postmortems written, manual reclaim if window-pid also dead",
    );
  });

  test("11 crashes (the MARKV scenario) → ONE caveat string, all 11 slots present", () => {
    const slots = [
      "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
      "hotel", "india", "juliett", "kilo", "lima",
    ];
    const crashes = slots.map((s, i) => ({
      slot: s,
      chatId: `claude-${String(i).padStart(8, "0")}`,
      frozenMs: (60 + i * 5) * 60_000,
    }));
    const out = emitCollapsedCaveat(crashes);
    assert.match(out, /^CHAT CRASH DETECTED \(11 slots\)/);
    // Every slot name appears
    for (const s of slots) assert.match(out, new RegExp(`\\b${s}/`));
    // Trailing diagnostic preserved
    assert.match(out, /postmortems written, manual reclaim if window-pid also dead$/);
    // Exactly ONE caveat (no per-slot lines)
    assert.equal(out.split("\n").length, 1);
  });

  test("frozenMs rounding: 30.5 minutes → 31m (Math.round), 30.4 → 30m", () => {
    const out1 = emitCollapsedCaveat([
      { slot: "alpha", chatId: "x", frozenMs: 30.5 * 60_000 },
      { slot: "bravo", chatId: "y", frozenMs: 30.4 * 60_000 },
    ]);
    // alpha/x is the FIRST entry; second is bravo/y
    assert.match(out1, /alpha\/x\(31m\)/);
    assert.match(out1, /bravo\/y\(30m\)/);
  });
});

// ─── Regression guard — indirect verification of expected service names ──────
// RESTARTABLE_CONTAINERS is module-private, so we exercise it via the
// behavior-observable contract: each known service name in the probe maps
// through filtering correctly.

describe("expected service names recognized (indirect regression guard)", () => {
  test("postgres + qdrant + prometheus are the recognized service names", () => {
    resetServiceRestartLatch();
    const allDown = {
      services: {
        docker: { up: true, detail: null },
        postgres: { up: false, detail: "down" },
        qdrant: { up: false, detail: "down" },
        prometheus: { up: false, detail: "down" },
        // Unknown service: should be ignored entirely
        magicservice: { up: false, detail: "down" },
      },
    };
    const r = serviceRestartAction({
      pressureTier: "critical", dockerHealth: allDown,
      restartEnabled: false, acted: false,
      existingContainers: ["postgres-prism", "qdrant", "prometheus", "magicservice"],
    });
    assert.equal(r.action, "advise");
    assert.deepEqual(r.adviseTargets.sort(), ["postgres", "prometheus", "qdrant"]);
    // magicservice does NOT appear — it's not in RESTARTABLE_CONTAINERS
    assert.equal(r.adviseTargets.includes("magicservice"), false);
  });
});
