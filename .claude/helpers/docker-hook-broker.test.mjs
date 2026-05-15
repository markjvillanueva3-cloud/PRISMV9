// PRISM Docker hook-broker client tests — A1 deliverable.
// Run: node --test .claude/helpers/docker-hook-broker.test.mjs
// (uses node:test instead of vitest because helpers/ vitest config has a pre-existing
//  infra bug — see CLAUDE.md §Recent regressions reference re: mirror-c-to-h.test.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const TEST_PORT = 19876; // out of the way of any real broker on 9876

// Point the client at the mock server BEFORE importing the module.
process.env.PRISM_BROKER_HOST = "127.0.0.1";
process.env.PRISM_BROKER_PORT = String(TEST_PORT);
process.env.PRISM_BROKER_TIMEOUT_MS = "300";
process.env.PRISM_BROKER_HEALTH_TIMEOUT_MS = "150";

// Use a temp hooks dir + a temp portable-node so fallback subprocess is hermetic.
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-broker-test-"));
const tmpHooksDir = path.join(tmpRoot, "hooks");
await fs.mkdir(tmpHooksDir, { recursive: true });

// A real hook that simply echoes its stdin wrapped in JSON. Used by spawn-fallback tests.
const echoHookPath = path.join(tmpHooksDir, "echo-hook.mjs");
await fs.writeFile(echoHookPath, `
let buf = "";
process.stdin.setEncoding("utf8");
for await (const c of process.stdin) buf += c;
process.stdout.write(JSON.stringify({ ok: true, source: "spawn-fallback", echoed: buf }));
`);

process.env.PRISM_BROKER_HOOKS_DIR = tmpHooksDir;
process.env.PRISM_BROKER_FALLBACK_BIN = process.execPath; // use the running node binary

const { isBrokerHealthy, invokeHook } = await import("./docker-hook-broker.mjs");

function startMockServer(handler) {
  const srv = createServer(handler);
  return new Promise((resolve) => srv.listen(TEST_PORT, "127.0.0.1", () => resolve(srv)));
}
function stopServer(srv) { return new Promise((r) => srv.close(() => r())); }

test("isBrokerHealthy: returns true when /healthz returns 200", async () => {
  const srv = await startMockServer((req, res) => {
    assert.equal(req.url, "/healthz");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, loaded: 50 }));
  });
  try { assert.equal(await isBrokerHealthy(), true); }
  finally { await stopServer(srv); }
});

test("isBrokerHealthy: returns false when broker is down (ECONNREFUSED)", async () => {
  // No server. Connection refused should resolve false within timeout.
  assert.equal(await isBrokerHealthy(), false);
});

test("isBrokerHealthy: returns false on timeout", async () => {
  const srv = await startMockServer(() => { /* never respond */ });
  try { assert.equal(await isBrokerHealthy(), false); }
  finally { await stopServer(srv); }
});

test("invokeHook: routes via broker on 200 and returns body", async () => {
  const srv = await startMockServer((req, res) => {
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/hook/master-index-precheck-inject");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true,"continue":true}');
  });
  try {
    const r = await invokeHook({ name: "master-index-precheck-inject", stdin: '{"prompt":"x"}' });
    assert.equal(r.viaBroker, true);
    assert.equal(r.ok, true);
    assert.equal(r.status, 200);
    assert.ok(r.stdout.includes("continue"));
  } finally { await stopServer(srv); }
});

test("invokeHook: 501 from broker falls back to subprocess", async () => {
  const srv = await startMockServer((req, res) => {
    res.writeHead(501, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "legacy-stdio-hook-not-broker-eligible" }));
  });
  try {
    const r = await invokeHook({ name: "echo-hook", stdin: "payload-501" });
    assert.equal(r.viaBroker, false, "should have fallen back to subprocess");
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.source, "spawn-fallback");
    assert.equal(parsed.echoed, "payload-501");
  } finally { await stopServer(srv); }
});

test("invokeHook: network failure (no server) falls back to subprocess", async () => {
  const r = await invokeHook({ name: "echo-hook", stdin: "payload-no-server" });
  assert.equal(r.viaBroker, false);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.echoed, "payload-no-server");
});

test("invokeHook: 5xx (non-501) surfaces as broker error — no fallback masking", async () => {
  const srv = await startMockServer((req, res) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "hook-load-failed: SyntaxError" }));
  });
  try {
    const r = await invokeHook({ name: "broken-hook", stdin: "" });
    assert.equal(r.viaBroker, true, "5xx must NOT silently fall back — it's a broker bug to surface");
    assert.equal(r.ok, false);
    assert.equal(r.status, 500);
  } finally { await stopServer(srv); }
});

test("invokeHook: timeout falls back to subprocess", async () => {
  const srv = await startMockServer(() => { /* never respond — client times out at 300ms */ });
  try {
    const start = Date.now();
    const r = await invokeHook({ name: "echo-hook", stdin: "timeout-test" });
    const elapsed = Date.now() - start;
    assert.equal(r.viaBroker, false, "should have fallen back after timeout");
    assert.ok(elapsed < 3000, "fallback should have happened well before 3s; took " + elapsed + "ms");
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.echoed, "timeout-test");
  } finally { await stopServer(srv); }
});

test("invokeHook: missing name returns explicit error (no broker call)", async () => {
  const r = await invokeHook({ stdin: "" });
  assert.equal(r.ok, false);
  assert.equal(r.status, -1);
  assert.ok(r.stderr.includes("name-required"), "got: " + r.stderr);
});

test("invokeHook: rejects path-traversal name (../../etc/passwd)", async () => {
  const r = await invokeHook({ name: "../../etc/passwd", stdin: "x" });
  assert.equal(r.ok, false);
  assert.equal(r.status, -1);
  assert.ok(r.stderr.includes("invalid-hook-name"), "got: " + r.stderr);
});

test("invokeHook: rejects absolute path name", async () => {
  const r = await invokeHook({ name: "C:/Windows/System32/calc", stdin: "x" });
  assert.equal(r.ok, false);
  assert.ok(r.stderr.includes("invalid-hook-name"), "got: " + r.stderr);
});

test("invokeHook: rejects separators (forward + backslash)", async () => {
  for (const bad of ["foo/bar", "foo\\bar", "foo\0bar"]) {
    const r = await invokeHook({ name: bad, stdin: "x" });
    assert.equal(r.ok, false, "should reject: " + JSON.stringify(bad));
    assert.ok(r.stderr.includes("invalid-hook-name"), "got: " + r.stderr);
  }
});

test("invokeHook: large stdin payload completes without truncation (stdin.end backpressure)", async () => {
  // 256 KB payload — bigger than Windows default pipe buffer (~64 KB). Verifies stdin.end()
  // handles backpressure (the prior write+end split silently truncated).
  const big = "X".repeat(256 * 1024);
  const r = await invokeHook({ name: "echo-hook", stdin: big });
  assert.equal(r.viaBroker, false);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.echoed.length, big.length, "payload should arrive intact (no truncation)");
});

test("invokeHook: PRISM_BROKER_DISABLE=1 always falls back without HTTP call", async () => {
  // Need a fresh module import so the env-var is re-read at module top-level.
  process.env.PRISM_BROKER_DISABLE = "1";
  const cacheBuster = "?t=" + Date.now();
  const mod = await import("./docker-hook-broker.mjs" + cacheBuster);
  try {
    const r = await mod.invokeHook({ name: "echo-hook", stdin: "disabled-test" });
    assert.equal(r.viaBroker, false);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.echoed, "disabled-test");
  } finally {
    delete process.env.PRISM_BROKER_DISABLE;
  }
});

// Burn-in style: 50 sequential broker calls in <2s — sanity that the client itself
// doesn't leak handles or cap concurrency. (Real fork-storm test requires live Docker;
// this is the local upper bound the envelope's "50 rapid PreToolUse fires" gates against.)
test("invokeHook: 50 sequential calls complete without leak (broker-up path)", async () => {
  let calls = 0;
  const srv = await startMockServer((req, res) => {
    calls++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, call: calls }));
  });
  try {
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      const r = await invokeHook({ name: "burn-in", stdin: "x" });
      assert.equal(r.ok, true);
    }
    const elapsed = Date.now() - start;
    assert.equal(calls, 50);
    assert.ok(elapsed < 2000, "50 broker calls should fit in <2s on a quiet box; took " + elapsed + "ms");
  } finally { await stopServer(srv); }
});

// Cleanup
test.after?.(async () => {
  try { await fs.rm(tmpRoot, { recursive: true, force: true }); } catch {}
});
