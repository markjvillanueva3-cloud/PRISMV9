/**
 * ollama-docker-launcher.test.mjs — hermetic coverage for the launcher's
 * pure-core helpers added by U-INFRA-DOCKER-FIX (delta, 2026-05-18).
 *
 * Focus: port-conflict filter — the impl that lets one host-bound port
 * (e.g. native PostgreSQL on :5432) NOT abort the whole compose-up.
 *
 * No docker, no real TCP. The probe is dep-injected for hermetic runs.
 * One LIVE test exercises the real probeHostPort against 127.0.0.1
 * with skip-loud when the port can't be tested.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import {
  parseArgs,
  SERVICE_PORTS,
  filterServicesByPortConflicts,
  probeHostPort,
  ensureNativeOllama,
} from "./ollama-docker-launcher.mjs";

// ── SERVICE_PORTS map ───────────────────────────────────────────────────

test("SERVICE_PORTS: contains all canonical compose services", () => {
  // KEEP-IN-SYNC reminder pinned at the source. If a service is added to
  // docker-compose.yml WITHOUT a SERVICE_PORTS entry, the port-conflict
  // filter silently skips probing it → conflicts re-emerge. This test is
  // the fail-on-revert oracle.
  for (const svc of ["postgres", "prometheus", "ollama", "qdrant", "prism-server"]) {
    assert.ok(svc in SERVICE_PORTS, `SERVICE_PORTS must include ${svc}`);
    assert.equal(typeof SERVICE_PORTS[svc], "number", `port for ${svc} must be a number`);
    assert.ok(SERVICE_PORTS[svc] > 0 && SERVICE_PORTS[svc] < 65536, `port for ${svc} must be a valid TCP port`);
  }
});

test("SERVICE_PORTS: frozen — protects against accidental mutation", () => {
  assert.throws(() => { SERVICE_PORTS.foo = 1234; }, "should be frozen");
});

test("SERVICE_PORTS: canonical port values match docker-compose.yml", () => {
  // Pins the host-port shape against compose. If the compose file ever
  // remaps a port (e.g. postgres → 5433), this test fires loudly.
  assert.equal(SERVICE_PORTS.postgres, 5432);
  assert.equal(SERVICE_PORTS.prometheus, 9090);
  assert.equal(SERVICE_PORTS.ollama, 11434);
  assert.equal(SERVICE_PORTS.qdrant, 6333);
  assert.equal(SERVICE_PORTS["prism-server"], 3000);
});

// ── filterServicesByPortConflicts ───────────────────────────────────────

test("filterServicesByPortConflicts: no conflicts — all services kept", async () => {
  const probe = async () => false; // every port is free
  const r = await filterServicesByPortConflicts(
    ["postgres", "ollama", "qdrant"],
    SERVICE_PORTS,
    probe,
  );
  assert.deepEqual(r.kept, ["postgres", "ollama", "qdrant"]);
  assert.deepEqual(r.skipped, []);
});

test("filterServicesByPortConflicts: postgres conflict — only postgres skipped, siblings kept", async () => {
  // The exact repro this unit was built to fix: host-native postgres
  // holds 5432; without the filter, compose-up of postgres+prometheus
  // fails for BOTH services. With the filter, prometheus still launches.
  const probe = async (port) => port === 5432;
  const r = await filterServicesByPortConflicts(
    ["postgres", "prometheus"],
    SERVICE_PORTS,
    probe,
  );
  assert.deepEqual(r.kept, ["prometheus"]);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].service, "postgres");
  assert.equal(r.skipped[0].port, 5432);
  assert.equal(r.skipped[0].reason, "host-port-in-use");
});

test("filterServicesByPortConflicts: all services conflicted — empty kept + full skipped", async () => {
  const probe = async () => true; // every port is bound
  const r = await filterServicesByPortConflicts(
    ["postgres", "prometheus", "qdrant"],
    SERVICE_PORTS,
    probe,
  );
  assert.deepEqual(r.kept, []);
  assert.equal(r.skipped.length, 3);
  assert.ok(r.skipped.every((s) => s.reason === "host-port-in-use"), "all skipped due to port-in-use");
});

test("filterServicesByPortConflicts: service with no port-map entry passes through", async () => {
  // R12 honesty: we cannot probe a service whose port we don't know.
  // The decision is to TRUST compose to surface the conflict (it will, just
  // with worse UX). The filter does NOT silently drop unknown services.
  const probe = async () => true;
  const r = await filterServicesByPortConflicts(
    ["unknown-service", "postgres"],
    SERVICE_PORTS,
    probe,
  );
  assert.ok(r.kept.includes("unknown-service"), "unknown service must NOT be filtered");
  assert.ok(!r.kept.includes("postgres"), "postgres still filtered by its known port");
});

test("filterServicesByPortConflicts: probe throws — service KEPT (R12 fail-loud), error recorded", async () => {
  // Probe failure ≠ silent skip. If we can't determine port state, the
  // safer default is to attempt launch (compose's own error is better UX
  // than us silently dropping a service the operator wanted).
  const probe = async () => { throw new Error("EHOSTUNREACH"); };
  const r = await filterServicesByPortConflicts(
    ["postgres"],
    SERVICE_PORTS,
    probe,
  );
  assert.deepEqual(r.kept, ["postgres"]);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].service, "postgres");
  assert.equal(r.skipped[0].reason, "probe-error-kept-anyway");
  assert.match(String(r.skipped[0].error), /EHOSTUNREACH/);
});

test("filterServicesByPortConflicts: empty services list — empty result", async () => {
  const probe = async () => false;
  const r = await filterServicesByPortConflicts([], SERVICE_PORTS, probe);
  assert.deepEqual(r.kept, []);
  assert.deepEqual(r.skipped, []);
});

test("filterServicesByPortConflicts: preserves caller's service order", async () => {
  const probe = async () => false;
  const r = await filterServicesByPortConflicts(
    ["qdrant", "postgres", "ollama"],
    SERVICE_PORTS,
    probe,
  );
  // Order matters: docker-compose deps + healthcheck wait can be order-sensitive.
  assert.deepEqual(r.kept, ["qdrant", "postgres", "ollama"]);
});

test("filterServicesByPortConflicts: probe is awaited (not just called)", async () => {
  // If the impl called probeImpl() without await, the promise would
  // resolve to a Promise<bool> the truthy check coerces to true — every
  // service would be skipped. This test pins the await contract.
  let resolveDeferred;
  const deferred = new Promise((r) => { resolveDeferred = r; });
  const probe = async (port) => {
    if (port === 5432) {
      await deferred;
      return false; // not in use
    }
    return false;
  };
  const filterPromise = filterServicesByPortConflicts(["postgres"], SERVICE_PORTS, probe);
  // If we don't resolve deferred, the filter should still be pending.
  // Race with a 50ms timer to prove it.
  const stillPending = await Promise.race([
    filterPromise.then(() => "resolved-early"),
    new Promise((r) => setTimeout(() => r("still-pending"), 50)),
  ]);
  assert.equal(stillPending, "still-pending", "filter must await the probe — not race past it");
  resolveDeferred();
  const r = await filterPromise;
  assert.deepEqual(r.kept, ["postgres"]);
  assert.deepEqual(r.skipped, []);
});

// ── ensureNativeOllama (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI05) ─────────────

test("ensureNativeOllama: already up -> already-running, runTask NOT called (idempotent)", async () => {
  let taskRan = false;
  const r = await ensureNativeOllama({
    probe: async () => ({ ok: true, models: ["qwen2.5-coder:32b"] }),
    runTask: () => { taskRan = true; return { ok: true }; },
  });
  assert.equal(r.status, "already-running");
  assert.equal(r.port, 11434);
  assert.deepEqual(r.models, ["qwen2.5-coder:32b"]);
  assert.equal(taskRan, false, "must NOT start the task when Ollama is already serving");
});

test("ensureNativeOllama: down + task starts ok -> started-via-scheduled-task", async () => {
  let taskRan = false;
  const r = await ensureNativeOllama({
    probe: async () => ({ ok: false, reason: "unreachable" }),
    runTask: () => { taskRan = true; return { ok: true, stdout: "SUCCESS: ran" }; },
  });
  assert.equal(taskRan, true, "must start the scheduled task when Ollama is down");
  assert.equal(r.status, "started-via-scheduled-task");
  assert.equal(r.task, "PRISM Ollama Serve");
  assert.equal(r.probeReason, "unreachable");
});

test("ensureNativeOllama: down + task fails -> start-failed (records stderr, fail-loud)", async () => {
  const r = await ensureNativeOllama({
    probe: async () => ({ ok: false, reason: "timeout" }),
    runTask: () => ({ ok: false, stderr: "ERROR: task not found" }),
  });
  assert.equal(r.status, "start-failed");
  assert.match(r.detail, /task not found/);
  assert.equal(r.probeReason, "timeout");
});

// ── parseArgs (existing CLI helper — also now exported) ────────────────

test("parseArgs: --k=v pairs and bare flags", () => {
  const a = parseArgs(["--services=postgres,ollama", "--skip-pull"]);
  assert.equal(a.services, "postgres,ollama");
  assert.equal(a["skip-pull"], true);
});

test("parseArgs: empty argv → empty object", () => {
  assert.deepEqual(parseArgs([]), {});
});

test("parseArgs: ignores non-flag positionals", () => {
  const a = parseArgs(["positional", "--dry-run", "more"]);
  assert.equal(a["dry-run"], true);
  assert.ok(!("positional" in a));
});

// ── probeHostPort — LIVE port probe against 127.0.0.1 ──────────────────

test("probeHostPort: a guaranteed-free random ephemeral port returns false", async () => {
  // Bind+close to get a port the OS just gave us — then probe it.
  // It will be free for at least a few seconds (TIME_WAIT aside).
  const srv = net.createServer();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  await new Promise((r) => srv.close(r));
  // Tiny wait to let the OS fully release the port.
  await new Promise((r) => setTimeout(r, 30));
  const inUse = await probeHostPort(port, { timeoutMs: 200 });
  assert.equal(inUse, false, `port ${port} should be free after close, probe said ${inUse}`);
});

test("probeHostPort: a bound port returns true (LIVE)", async () => {
  // Open a real listener and probe it.
  const srv = net.createServer();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  try {
    const inUse = await probeHostPort(port, { timeoutMs: 500 });
    assert.equal(inUse, true, `bound port ${port} should be detected as in-use`);
  } finally {
    await new Promise((r) => srv.close(r));
  }
});

test("probeHostPort: respects the timeout (returns false fast on filtered port)", async () => {
  // Port 1 is reserved (tcpmux) and typically firewalled — probe should
  // return false (refused or timed out) well within the timeout window.
  const t0 = Date.now();
  const inUse = await probeHostPort(1, { timeoutMs: 300 });
  const elapsed = Date.now() - t0;
  assert.equal(inUse, false, "reserved port should not be in use");
  assert.ok(elapsed < 1000, `probe took ${elapsed}ms — must respect timeout`);
});
