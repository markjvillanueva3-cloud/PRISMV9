// Tests for hermes-control-bridge.mjs (HERMES-CONTROL-MS0).
//
// Two layers:
//   1. PURE: deepMerge -- the clobber-prevention logic. A bug here would WIPE the
//      operator's Hermes config (PUT /api/config REPLACES the full body.config), so
//      this is the highest-value unit under test (R9: the test fails if a merge
//      regression lets a sibling key drop).
//   2. INTEGRATION: drive httpCall/call/setConfig against a REAL mock HTTP server
//      (node:http) that records every request, asserting:
//        - the session token is sent on protected paths but NOT on /api/status (public)
//        - setConfig does a READ-then-PUT, and the PUT body is {config: <FULL merged>}
//          (preserving keys the patch never touched -- the live-validated behavior)
//        - call() throws on a non-2xx (R12 fail-loud)
//
// The mock answers GET /api/status 200 so ensureBackend REUSES it (allowSpawn:false,
// explicit port+token) -- no Python backend, fully hermetic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

// Hermeticity (R9 + repo 2026-06-17 test-hermeticity rule): ensureBackend WRITES the sidecar, so
// isolate it from the LIVE production file. sidecarPath() reads PRISM_HERMES_BRIDGE_SIDECAR
// dynamically, so setting it here (before any test calls ensureBackend) keeps the whole suite
// from clobbering the operator's real adopted token.
process.env.PRISM_HERMES_BRIDGE_SIDECAR = join(tmpdir(), `hermes-control-bridge-test-${process.pid}.json`);

import { deepMerge, httpCall, setConfig, getConfig, call, ensureBackend, resolveServedToken, extractInjectedDashboardToken } from "./hermes-control-bridge.mjs";

// ---- PURE: deepMerge ----
test("deepMerge: nested patch preserves sibling keys (clobber-prevention)", () => {
  const base = { model: "gpt-oss:120b", agent: { max_turns: 200, service_tier: "fast" }, toolsets: ["hermes-cli"] };
  const out = deepMerge(base, { agent: { max_turns: 201 } });
  assert.equal(out.agent.max_turns, 201);
  assert.equal(out.agent.service_tier, "fast", "sibling key must survive");
  assert.equal(out.model, "gpt-oss:120b", "top-level sibling must survive");
  assert.deepEqual(out.toolsets, ["hermes-cli"]);
});

test("deepMerge: arrays REPLACE (not merge)", () => {
  const out = deepMerge({ a: [1, 2, 3] }, { a: [9] });
  assert.deepEqual(out.a, [9]);
});

test("deepMerge: scalar/null patch replaces the node", () => {
  assert.equal(deepMerge({ a: 1 }, 5), 5);
  assert.equal(deepMerge({ a: 1 }, null), null);
  assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: null }), { a: null });
});

test("deepMerge: does NOT mutate base or patch", () => {
  const base = { agent: { max_turns: 200 } };
  const patch = { agent: { max_turns: 201 } };
  const out = deepMerge(base, patch);
  assert.equal(base.agent.max_turns, 200, "base unchanged");
  assert.equal(patch.agent.max_turns, 201, "patch unchanged");
  assert.notEqual(out.agent, base.agent, "nested object is a fresh copy");
});

test("deepMerge: adds new nested keys", () => {
  const out = deepMerge({ agent: { a: 1 } }, { agent: { b: 2 }, model: "x" });
  assert.deepEqual(out, { agent: { a: 1, b: 2 }, model: "x" });
});

// ---- INTEGRATION: mock server records requests ----
function startMock() {
  const reqs = [];
  let cfg = { model: "gpt-oss:120b", agent: { max_turns: 200, service_tier: "fast" }, toolsets: ["hermes-cli"] };
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      reqs.push({ method: req.method, path: req.url, headers: req.headers, body: body || null });
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.url === "/api/status") return send(200, { version: "test", ok: true });
      if (req.url === "/api/config" && req.method === "GET") return send(200, cfg);
      if (req.url === "/api/config" && req.method === "PUT") {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed.config !== "object") return send(422, { detail: "config field required" });
        cfg = parsed.config; // server REPLACES (mirrors save_config)
        return send(200, { ok: true });
      }
      if (req.url === "/api/boom") return send(500, { detail: "kaboom" });
      return send(404, { detail: "not found" });
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, reqs, getCfg: () => cfg }));
  });
}

test("httpCall: omits the token on /api/status (public) but sends it elsewhere", async () => {
  const m = await startMock();
  try {
    await httpCall("GET", "/api/status", { port: m.port, token: "T0K" });
    await httpCall("GET", "/api/config", { port: m.port, token: "T0K" });
    const statusReq = m.reqs.find((r) => r.path === "/api/status");
    const cfgReq = m.reqs.find((r) => r.path === "/api/config");
    assert.equal(statusReq.headers["x-hermes-session-token"], undefined, "no token on public /api/status");
    assert.equal(cfgReq.headers["x-hermes-session-token"], "T0K", "token sent on protected /api/config");
    assert.equal(cfgReq.headers["authorization"], "Bearer T0K");
  } finally { m.server.close(); }
});

test("setConfig: READ-then-PUT sends the FULL merged config (preserves unset keys)", async () => {
  const m = await startMock();
  try {
    await setConfig({ agent: { max_turns: 201 } }, { port: m.port, token: "T0K", allowSpawn: false });
    const put = m.reqs.find((r) => r.method === "PUT" && r.path === "/api/config");
    assert.ok(put, "a PUT was issued");
    const sent = JSON.parse(put.body);
    assert.ok(sent.config, "body wrapped as {config}");
    assert.equal(sent.config.agent.max_turns, 201, "patched key applied");
    assert.equal(sent.config.agent.service_tier, "fast", "untouched sibling preserved");
    assert.equal(sent.config.model, "gpt-oss:120b", "untouched top-level preserved (no clobber)");
    assert.equal(m.getCfg().agent.max_turns, 201);
    assert.equal(m.getCfg().model, "gpt-oss:120b");
  } finally { m.server.close(); }
});

test("getConfig: returns the live config object", async () => {
  const m = await startMock();
  try {
    const c = await getConfig({ port: m.port, token: "T0K", allowSpawn: false });
    assert.equal(c.model, "gpt-oss:120b");
    assert.equal(c.agent.max_turns, 200);
  } finally { m.server.close(); }
});

test("call: throws (fail-loud) on a non-2xx response", async () => {
  const m = await startMock();
  try {
    await assert.rejects(
      () => call("GET", "/api/boom", { port: m.port, token: "T0K", allowSpawn: false }),
      /HTTP 500/,
    );
  } finally { m.server.close(); }
});

test("httpCall: a non-2xx never silently passes (kaboom surfaces with status+body)", async () => {
  const m = await startMock();
  try {
    const r = await httpCall("GET", "/api/boom", { port: m.port, token: "T0K" });
    assert.equal(r.status, 500);
    assert.equal(r.json.detail, "kaboom");
  } finally { m.server.close(); }
});

// ---- ADOPT-RUNNING-TOKEN (U-BRIDGE-ADOPT-RUNNING-TOKEN) ----
// The realistic case: a Hermes dashboard is ALREADY running (operator's desktop / a prior
// launch) and the bridge holds no matching token. ensureBackend recovers the token the
// dashboard injects into its index (window.__HERMES_SESSION_TOKEN__) and adopts it -- but
// ONLY after that token authorizes a PROTECTED route, so a squatter is refused (R12).
// fx() builds obviously-synthetic, low-entropy fixture values -- NOT real credentials.
const fx = (label) => `fx-${label}`;

// ---- PURE: extractInjectedDashboardToken ----
test("extractInjectedDashboardToken: pulls the JSON-quoted value from the index", () => {
  const v = fx("plain");
  const html = `<!doctype html><script>window.__HERMES_SESSION_TOKEN__ = ${JSON.stringify(v)};</script>`;
  assert.equal(extractInjectedDashboardToken(html), v);
});
test("extractInjectedDashboardToken: null when absent / unparseable / nullish", () => {
  assert.equal(extractInjectedDashboardToken("<html>nothing injected here</html>"), null);
  assert.equal(extractInjectedDashboardToken(""), null);
  assert.equal(extractInjectedDashboardToken(null), null);
});
test("extractInjectedDashboardToken: handles an embedded escaped quote (JSON round-trip)", () => {
  const raw = 'a"b';
  const html = `window.__HERMES_SESSION_TOKEN__ = ${JSON.stringify(raw)}`;
  assert.equal(extractInjectedDashboardToken(html), raw);
});

// Mock that mimics a RUNNING dashboard the bridge did not spawn:
//  - GET /api/status public (200, no token)            -> bare probe sees "something is up"
//  - GET /  serves the index with the injected value   -> resolveServedToken recovers it
//  - GET /api/config requires the matching header, else 401 (the protected gate)
function startRunningDashboard({ servedValue, requiredValue }) {
  const reqs = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      reqs.push({ method: req.method, path: req.url, authz: req.headers["authorization"], xtok: req.headers["x-hermes-session-token"] });
      const sendJson = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.url === "/api/status") return sendJson(200, { version: "test", ok: true }); // public
      if (req.url === "/") {
        const html = servedValue
          ? `<!doctype html><script>window.__HERMES_SESSION_TOKEN__ = ${JSON.stringify(servedValue)};</script>`
          : `<!doctype html><body>no value injected</body>`;
        res.writeHead(200, { "Content-Type": "text/html" }); return res.end(html);
      }
      if (req.url === "/api/config" && req.method === "GET") {
        if (req.headers["x-hermes-session-token"] !== requiredValue) return sendJson(401, { detail: "Unauthorized" });
        return sendJson(200, { model: "gpt-oss:120b", agent: { max_turns: 200 } });
      }
      return sendJson(404, { detail: "not found" });
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, reqs }));
  });
}

test("resolveServedToken: recovers the value a running dashboard serves; null when none", async () => {
  const a = await startRunningDashboard({ servedValue: fx("served"), requiredValue: fx("served") });
  try { assert.equal(await resolveServedToken(a.port), fx("served")); } finally { a.server.close(); }
  const b = await startRunningDashboard({ servedValue: null, requiredValue: fx("x") });
  try { assert.equal(await resolveServedToken(b.port), null); } finally { b.server.close(); }
});

test("ensureBackend: ADOPTS a running backend's served value (no spawn) and call() then works", async () => {
  const v = fx("adopt");
  const m = await startRunningDashboard({ servedValue: v, requiredValue: v });
  try {
    const be = await ensureBackend({ port: m.port, allowSpawn: false });
    assert.equal(be.reused, true);
    assert.equal(be.adopted, true, "adopted the running backend (did not spawn)");
    assert.equal(be.token, v, "adopted the SERVED value");
    assert.equal(be.pid, null, "pid null -- bridge did not spawn it");
    const cfg = await call("GET", "/api/config", { port: m.port, allowSpawn: false });
    assert.equal(cfg.model, "gpt-oss:120b", "adopted value authorizes the protected route end-to-end");
    const cfgReq = m.reqs.find((r) => r.method === "GET" && r.path === "/api/config" && r.xtok === v);
    assert.ok(cfgReq, "protected GET carried the adopted value as X-Hermes-Session-Token");
    assert.equal(cfgReq.authz, `Bearer ${v}`, "and as Authorization: Bearer (both header forms the server accepts)");
  } finally { m.server.close(); }
});

test("ensureBackend: REFUSES a squatter whose served value fails the protected route (R12 fail-loud)", async () => {
  const m = await startRunningDashboard({ servedValue: fx("squat"), requiredValue: fx("real") });
  try {
    await assert.rejects(
      () => ensureBackend({ port: m.port, allowSpawn: false }),
      /could not be recovered\+verified/,
      "must not adopt a value that fails the protected surface",
    );
  } finally { m.server.close(); }
});

test("ensureBackend: PRISM_HERMES_NO_ADOPT_TOKEN=1 opts out even when a valid value is served", async () => {
  const v = fx("optout");
  const m = await startRunningDashboard({ servedValue: v, requiredValue: v });
  const prev = process.env.PRISM_HERMES_NO_ADOPT_TOKEN;
  process.env.PRISM_HERMES_NO_ADOPT_TOKEN = "1";
  try {
    await assert.rejects(() => ensureBackend({ port: m.port, allowSpawn: false }), /could not be recovered\+verified/);
  } finally {
    if (prev === undefined) delete process.env.PRISM_HERMES_NO_ADOPT_TOKEN; else process.env.PRISM_HERMES_NO_ADOPT_TOKEN = prev;
    m.server.close();
  }
});

test("ensureBackend: REFUSES a non-Hermes backend that serves no value at all", async () => {
  const m = await startRunningDashboard({ servedValue: null, requiredValue: fx("na") });
  try {
    await assert.rejects(() => ensureBackend({ port: m.port, allowSpawn: false }), /could not be recovered\+verified/);
  } finally { m.server.close(); }
});

test("ensureBackend: the adopted flag SURVIVES reuse (sticky -- so `stop` never kills a foreign backend)", async () => {
  // Reproduces the live gap: 1st call adopts (writes sidecar adopted:true), 2nd call hits the
  // REUSE path (sidecar token works) -- which must PRESERVE adopted:true, not drop it.
  const v = fx("sticky");
  const m = await startRunningDashboard({ servedValue: v, requiredValue: v });
  try {
    const first = await ensureBackend({ port: m.port, allowSpawn: false });
    assert.equal(first.adopted, true, "1st call adopts");
    const second = await ensureBackend({ port: m.port, allowSpawn: false });
    assert.equal(second.reused, true);
    assert.equal(second.adopted, true, "2nd (reuse) call must KEEP adopted:true (not drop it)");
  } finally { m.server.close(); }
});

test("ensureBackend: a STALE same-port sidecar token does NOT short-circuit adoption (re-recovers, no 401)", async () => {
  // Reviewer-A gap: when a backend restarts its session token changes; a stale sidecar for the same
  // port must NOT be reused with a dead token (which then 401s the first real call). The reuse loop
  // validates against the PROTECTED route, so a dead token falls through to served-token recovery.
  const fresh = fx("fresh");
  const m = await startRunningDashboard({ servedValue: fresh, requiredValue: fresh });
  // Seed a stale sidecar for THIS port carrying a now-dead token (simulates a post-restart drift).
  writeFileSync(process.env.PRISM_HERMES_BRIDGE_SIDECAR, JSON.stringify({ port: m.port, token: fx("dead"), pid: null, adopted: true, at: "x" }));
  try {
    const be = await ensureBackend({ port: m.port, allowSpawn: false });
    assert.equal(be.token, fresh, "must RE-RECOVER the served value, not reuse the stale dead one");
    assert.equal(be.adopted, true);
    const cfg = await call("GET", "/api/config", { port: m.port, allowSpawn: false });
    assert.equal(cfg.model, "gpt-oss:120b", "fresh value authorizes the protected route -- no 401");
  } finally { m.server.close(); }
});
