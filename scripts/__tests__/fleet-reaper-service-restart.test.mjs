/**
 * fleet-reaper-service-restart.test.mjs — FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART.
 *
 * Verifies the critical-pressure service-restart layer: the pure
 * `serviceRestartAction` state machine + the fail-soft, advisory-by-default,
 * one-shot-latched `restartWedgedServices` shell.
 *
 * Coverage floor:
 *   - every serviceRestartAction branch (noop ×4 / advise / restart)
 *   - the safety invariant: the Docker DAEMON is NEVER an auto-restart target
 *     (advise-only — auto would kill every container)
 *   - advisory-by-default: restartEnabled=false → advise, never restart
 *   - >= 3 failure modes (no health, malformed health, docker restart throws)
 *   - >= 2 adversarial (empty services, services not an object, partial fail)
 *   - one-shot latch: advised OR attempted → never re-acts that process
 *   - actionsAllowed=false (status/dry-run) suppresses the real restart
 *
 * Real reference values; the docker CLI is fully injected (`runDockerRestart`)
 * — no test ever shells out. Run: node --test <thisfile>
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  serviceRestartAction,
  restartWedgedServices,
  readDockerHealth,
  __resetServiceRestartForTest,
} from "../fleet-reaper-sweep.mjs";

beforeEach(() => __resetServiceRestartForTest());

const HEALTH = (over = {}) => ({
  available: true,
  services: {
    docker: { up: true }, ollama: { up: true },
    postgres: { up: true }, qdrant: { up: true }, prometheus: { up: true },
    ...over,
  },
});

// ── pure serviceRestartAction ───────────────────────────────────────────────

test("noop: not critical", () => {
  const r = serviceRestartAction({ pressureTier: "warn", dockerHealth: HEALTH({ qdrant: { up: false } }), restartEnabled: true, acted: false });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "not-critical");
});

test("noop: already acted (one-shot latch in the pure layer)", () => {
  const r = serviceRestartAction({ pressureTier: "critical", dockerHealth: HEALTH({ qdrant: { up: false } }), restartEnabled: true, acted: true });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "already-acted-this-process");
});

test("noop: no usable docker-health (null / empty / non-object)", () => {
  for (const dh of [null, undefined, {}, { services: {} }, { services: null }, { services: 7 }, "x"]) {
    const r = serviceRestartAction({ pressureTier: "critical", dockerHealth: dh, restartEnabled: true, acted: false });
    assert.equal(r.action, "noop", JSON.stringify(dh));
    assert.equal(r.reason, "no-service-health");
  }
});

test("noop: critical but nothing restartable is down", () => {
  const r = serviceRestartAction({ pressureTier: "critical", dockerHealth: HEALTH(), restartEnabled: true, acted: false });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "no-restartable-service-down");
});

test("SAFETY INVARIANT: docker daemon down → advise only, NEVER a restart target", () => {
  const r = serviceRestartAction({
    pressureTier: "critical",
    dockerHealth: HEALTH({ docker: { up: false }, qdrant: { up: false }, postgres: { up: false } }),
    restartEnabled: true, acted: false,
  });
  assert.equal(r.action, "advise");
  assert.deepEqual(r.restartTargets, []); // never auto when daemon is down
  assert.ok(r.adviseTargets.includes("docker"));
  assert.ok(r.adviseTargets.includes("qdrant") && r.adviseTargets.includes("postgres"));
  assert.match(r.reason, /docker-daemon-down/);
});

test("advise: restartable down + docker up + restart DISABLED → advise-only (default)", () => {
  const r = serviceRestartAction({
    pressureTier: "critical",
    dockerHealth: HEALTH({ qdrant: { up: false }, prometheus: { up: false } }),
    restartEnabled: false, acted: false,
  });
  assert.equal(r.action, "advise");
  assert.deepEqual(r.restartTargets, []);
  assert.deepEqual(r.adviseTargets.sort(), ["prometheus", "qdrant"]);
  assert.match(r.reason, /PRISM_FLEET_REAPER_SERVICE_RESTART=1/);
});

test("restart: restartable down + docker up + restart ENABLED → restart targets", () => {
  const r = serviceRestartAction({
    pressureTier: "critical",
    dockerHealth: HEALTH({ postgres: { up: false } }),
    restartEnabled: true, acted: false,
  });
  assert.equal(r.action, "restart");
  assert.deepEqual(r.restartTargets, ["postgres"]);
  assert.deepEqual(r.adviseTargets, []);
});

// ── imperative restartWedgedServices (docker injected) ──────────────────────

test("shell: advisory-by-default does NOT call docker, but latches one-shot", () => {
  let calls = 0;
  const r = restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
    restartEnabled: false, actionsAllowed: true,
    runDockerRestart: () => { calls++; },
  });
  assert.equal(r.state, "advised");
  assert.equal(calls, 0, "advise must not shell out");
  assert.deepEqual(r.advise, ["qdrant"]);
  // one-shot: a second sweep is inert even though the service is still down
  const r2 = restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
    restartEnabled: false, actionsAllowed: true, runDockerRestart: () => { calls++; },
  });
  assert.equal(r2.state, "noop");
  assert.equal(r2.reason, "already-acted-this-process");
  assert.equal(calls, 0);
});

test("shell: enabled + actionsAllowed → docker restart called per down container", () => {
  const restarted = [];
  const r = restartWedgedServices(
    HEALTH({ qdrant: { up: false }, prometheus: { up: false } }), "critical",
    { restartEnabled: true, actionsAllowed: true, runDockerRestart: (c) => restarted.push(c) },
  );
  assert.equal(r.state, "restarted");
  assert.deepEqual(restarted.sort(), ["prometheus", "qdrant"]); // mapped container names
  assert.deepEqual(r.succeeded.sort(), ["prometheus", "qdrant"]);
  assert.deepEqual(r.failed, []);
});

test("shell: postgres maps to the real container name postgres-prism", () => {
  const restarted = [];
  restartWedgedServices(HEALTH({ postgres: { up: false } }), "critical", {
    restartEnabled: true, actionsAllowed: true, runDockerRestart: (c) => restarted.push(c),
  });
  assert.deepEqual(restarted, ["postgres-prism"]);
});

test("FAILURE MODE: a docker restart that throws is surfaced, never thrown, partial-OK", () => {
  const r = restartWedgedServices(
    HEALTH({ qdrant: { up: false }, postgres: { up: false } }), "critical",
    {
      restartEnabled: true, actionsAllowed: true,
      runDockerRestart: (c) => { if (c === "qdrant") throw new Error("daemon refused"); },
    },
  );
  assert.equal(r.state, "restarted-partial");
  assert.deepEqual(r.succeeded, ["postgres"]);
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].name, "qdrant");
  assert.match(r.failed[0].error, /daemon refused/);
});

test("FAILURE MODE: every restart fails → state restart-failed, still no throw", () => {
  const r = restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
    restartEnabled: true, actionsAllowed: true,
    runDockerRestart: () => { throw new Error("boom"); },
  });
  assert.equal(r.state, "restart-failed");
  assert.deepEqual(r.succeeded, []);
  assert.equal(r.failed[0].name, "qdrant");
});

test("actionsAllowed=false (status/dry-run): restart suppressed → advised, no docker call", () => {
  let calls = 0;
  const r = restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
    restartEnabled: true, actionsAllowed: false, runDockerRestart: () => { calls++; },
  });
  assert.equal(r.state, "advised");
  assert.equal(calls, 0);
  assert.match(r.reason, /suppressed/);
});

test("ADVERSARIAL: docker daemon down + enabled still advise-only (no destructive auto)", () => {
  let calls = 0;
  const r = restartWedgedServices(
    HEALTH({ docker: { up: false }, qdrant: { up: false } }), "critical",
    { restartEnabled: true, actionsAllowed: true, runDockerRestart: () => { calls++; } },
  );
  assert.equal(r.state, "advised");
  assert.equal(calls, 0, "daemon-down must never trigger docker restart");
  assert.ok(r.advise.includes("docker"));
});

test("ADVERSARIAL: non-critical never acts even with everything down + enabled", () => {
  let calls = 0;
  const r = restartWedgedServices(
    HEALTH({ qdrant: { up: false }, postgres: { up: false }, prometheus: { up: false } }), "normal",
    { restartEnabled: true, actionsAllowed: true, runDockerRestart: () => { calls++; } },
  );
  assert.equal(r.state, "noop");
  assert.equal(r.reason, "not-critical");
  assert.equal(calls, 0);
});

// ── REAL-PRODUCER-SHAPE E2E (the regression oracle the hermetic suite lacked) ─
// ollama-docker-health.mjs emits `docker` + `ollama` as TOP-LEVEL keys; only
// {qdrant,postgres,prometheus} live under `services`. A prior version of these
// tests fabricated `services.docker`, a shape the real probe never produces —
// so the daemon-down safety invariant was untested against production wiring.
// This drives the FULL chain readDockerHealth → serviceRestartAction.

const REAL_PROBE = (over = {}) => JSON.stringify({
  schemaVersion: 1,
  probedAt: "2026-05-17T00:00:00.000Z",
  ollama: { up: true, count: 2 },
  docker: { up: true, containerCount: 4 },
  services: { qdrant: { up: true }, postgres: { up: true }, prometheus: { up: true } },
  ...over,
});

test("E2E: real probe shape — readDockerHealth folds top-level docker into services", () => {
  const dh = readDockerHealth({ runHealthProbe: () => REAL_PROBE() });
  assert.equal(dh.available, true, "available must reflect the top-level docker.up");
  assert.ok(dh.services.docker, "services.docker must be populated from top-level");
  assert.equal(dh.services.docker.up, true);
  assert.ok(dh.services.ollama, "services.ollama folded too");
  assert.equal(dh.services.qdrant.up, true);
});

test("E2E SAFETY INVARIANT: real daemon-down payload → advise[docker], NEVER restart", () => {
  // The exact compounding-failure scenario this layer exists for.
  const dh = readDockerHealth({
    runHealthProbe: () => REAL_PROBE({
      docker: { up: false, detail: "daemon HTTP 500" },
      services: { qdrant: { up: false }, postgres: { up: false }, prometheus: { up: true } },
    }),
  });
  assert.equal(dh.available, false);
  assert.equal(dh.services.docker.up, false, "daemon-down must be visible to the consumer");
  // restartEnabled TRUE — the dangerous path. Must still be advise-only.
  const decision = serviceRestartAction({
    pressureTier: "critical", dockerHealth: dh, restartEnabled: true, acted: false,
  });
  assert.equal(decision.action, "advise");
  assert.deepEqual(decision.restartTargets, [], "NEVER auto-restart with a dead daemon");
  assert.ok(decision.adviseTargets.includes("docker"));
  assert.ok(decision.adviseTargets.includes("qdrant") && decision.adviseTargets.includes("postgres"));
  assert.match(decision.reason, /docker-daemon-down/);
  // and the shell must not shell out
  let calls = 0;
  const r = restartWedgedServices(dh, "critical", {
    restartEnabled: true, actionsAllowed: true, runDockerRestart: () => { calls++; },
  });
  assert.equal(r.state, "advised");
  assert.equal(calls, 0, "dead daemon must never trigger docker restart in production shape");
});

test("E2E: real payload, daemon UP + qdrant down + restart enabled → restarts qdrant only", () => {
  const dh = readDockerHealth({
    runHealthProbe: () => REAL_PROBE({ services: { qdrant: { up: false }, postgres: { up: true }, prometheus: { up: true } } }),
  });
  assert.equal(dh.services.docker.up, true);
  const restarted = [];
  const r = restartWedgedServices(dh, "critical", {
    restartEnabled: true, actionsAllowed: true, runDockerRestart: (c) => restarted.push(c),
  });
  assert.equal(r.state, "restarted");
  assert.deepEqual(restarted, ["qdrant"]);
});

test("__resetServiceRestartForTest clears the one-shot latch", () => {
  restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
    restartEnabled: false, actionsAllowed: true, runDockerRestart: () => {},
  });
  // latched now → noop
  assert.equal(
    restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
      restartEnabled: false, actionsAllowed: true, runDockerRestart: () => {},
    }).state, "noop",
  );
  __resetServiceRestartForTest();
  // fresh — advises again
  assert.equal(
    restartWedgedServices(HEALTH({ qdrant: { up: false } }), "critical", {
      restartEnabled: false, actionsAllowed: true, runDockerRestart: () => {},
    }).state, "advised",
  );
});
