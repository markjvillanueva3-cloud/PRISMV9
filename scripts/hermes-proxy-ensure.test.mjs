#!/usr/bin/env node
// Tests for hermes-proxy-ensure.mjs (HERMES-BRIDGE-MS0/U-PROXY-ENSURE).
// Pure functions + isProxyUp against a guaranteed-closed port. Importing the
// script is side-effect-free under the test runner (main() never fires).
// Run: node --test scripts/hermes-proxy-ensure.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEnsureArgs,
  resolveBaseUrl,
  buildProxyArgv,
  isProxyUp,
} from "./hermes-proxy-ensure.mjs";

// --- parseEnsureArgs ---
test("parseEnsureArgs: defaults are xai/8645/6000", () => {
  const a = parseEnsureArgs([]);
  assert.equal(a.error, null);
  assert.equal(a.provider, "xai");
  assert.equal(a.port, 8645);
  assert.equal(a.timeout, 6000);
  assert.equal(a.json, false);
});

test("parseEnsureArgs: flags parse", () => {
  const a = parseEnsureArgs(["--provider", "nous", "--port", "9000", "--timeout", "2000", "--json", "--url", "http://h/v1"]);
  assert.equal(a.provider, "nous");
  assert.equal(a.port, 9000);
  assert.equal(a.timeout, 2000);
  assert.equal(a.json, true);
  assert.equal(a.url, "http://h/v1");
});

test("parseEnsureArgs: invalid provider -> error", () => {
  assert.match(parseEnsureArgs(["--provider", "openai"]).error, /provider must be/);
});

test("parseEnsureArgs: unknown flag -> error", () => {
  assert.match(parseEnsureArgs(["--bogus"]).error, /unknown flag/);
});

test("parseEnsureArgs: non-numeric port/timeout fall back to defaults", () => {
  const a = parseEnsureArgs(["--port", "abc", "--timeout", "xyz"]);
  assert.equal(a.port, 8645);
  assert.equal(a.timeout, 6000);
});

// --- resolveBaseUrl ---
test("resolveBaseUrl: derives from port when no explicit url", () => {
  assert.equal(resolveBaseUrl({ port: 8645 }), "http://127.0.0.1:8645/v1");
  assert.equal(resolveBaseUrl({ port: 9001 }), "http://127.0.0.1:9001/v1");
});

test("resolveBaseUrl: explicit url wins and trailing slashes are trimmed", () => {
  assert.equal(resolveBaseUrl({ url: "http://x:1/v1/", port: 8645 }), "http://x:1/v1");
  assert.equal(resolveBaseUrl({ url: "http://x:1/v1///" }), "http://x:1/v1");
});

// --- buildProxyArgv ---
test("buildProxyArgv: produces the hermes proxy start argv", () => {
  const [cmd, argv] = buildProxyArgv("C:/py.exe", { provider: "xai", port: 8645 });
  assert.equal(cmd, "C:/py.exe");
  assert.deepEqual(argv, ["-m", "hermes_cli.main", "proxy", "start", "--provider", "xai", "--host", "127.0.0.1", "--port", "8645"]);
});

test("buildProxyArgv: provider + port are threaded through", () => {
  const [, argv] = buildProxyArgv("py", { provider: "nous", port: 9000 });
  assert.ok(argv.includes("nous"));
  assert.ok(argv.includes("9000"));
});

// --- isProxyUp ---
test("isProxyUp: guaranteed-closed port returns false (no throw)", async () => {
  // Port 1 is privileged/never our proxy; the fetch fails fast -> false.
  const up = await isProxyUp("http://127.0.0.1:1/v1", 1500);
  assert.equal(up, false);
});

test("isProxyUp: a tiny non-OK server returns false", async () => {
  const http = await import("node:http");
  const srv = http.createServer((req, res) => { res.statusCode = 503; res.end("nope"); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  try {
    const up = await isProxyUp(`http://127.0.0.1:${port}/v1`, 2000);
    assert.equal(up, false); // 503 is not ok
  } finally { srv.close(); }
});

test("isProxyUp: a 200 /models server returns true", async () => {
  const http = await import("node:http");
  const srv = http.createServer((req, res) => {
    if (req.url.endsWith("/models")) { res.statusCode = 200; res.end(JSON.stringify({ data: [{ id: "m" }] })); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  try {
    const up = await isProxyUp(`http://127.0.0.1:${port}/v1`, 2000);
    assert.equal(up, true);
  } finally { srv.close(); }
});
