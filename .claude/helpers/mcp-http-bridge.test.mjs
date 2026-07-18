#!/usr/bin/env node
/**
 * Tests for mcp-http-bridge.mjs LOCAL-INIT-ANSWER pure core (MCP-COLD-CONNECT-FIX, slot:golf).
 * R9: each test encodes WHY the behavior matters -- a wrong cacheability verdict or a dropped
 * id would silence a real handshake bug (not a toBeDefined stub).
 *
 * Scope: (1) the pure decision helpers that gate the local-init answer; (2) the impure disk
 * cache round-trip (readCachedInit/writeCachedInit); and (3) an end-to-end INTEGRATION test that
 * spawns the real bridge against a DEAD backend with a seeded cache and asserts it answers
 * `initialize` locally (the actual cold-connect fix) -- so the fleet-critical impure path is
 * covered here, not by an external harness.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isCacheableInitResponse, buildInitResponseFromCache, readCachedInit, writeCachedInit } from "./mcp-http-bridge.mjs";

const BRIDGE_PATH = fileURLToPath(new URL("./mcp-http-bridge.mjs", import.meta.url));

const REAL_INIT = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "prism-mcp-server", version: "2.10.0" },
  },
};

// --- isCacheableInitResponse -------------------------------------------------
test("isCacheableInitResponse: a real init response with serverInfo -> true", () => {
  // WHY: only a genuine backend response may seed the cache; a bad one would make the bridge
  // replay garbage to every future cold-start client.
  assert.equal(isCacheableInitResponse(REAL_INIT), true);
});

test("isCacheableInitResponse: JSON-RPC error response -> false (never cache an error)", () => {
  assert.equal(isCacheableInitResponse({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "boom" } }), false);
});

test("isCacheableInitResponse: result without serverInfo -> false (not a real handshake)", () => {
  assert.equal(isCacheableInitResponse({ jsonrpc: "2.0", id: 1, result: { capabilities: {} } }), false);
});

test("isCacheableInitResponse: serverInfo without a string name -> false", () => {
  assert.equal(isCacheableInitResponse({ result: { serverInfo: { version: "1" } } }), false);
  assert.equal(isCacheableInitResponse({ result: { serverInfo: { name: 123 } } }), false);
});

test("isCacheableInitResponse: null / non-object / empty -> false (fail-safe, never throws)", () => {
  assert.equal(isCacheableInitResponse(null), false);
  assert.equal(isCacheableInitResponse(undefined), false);
  assert.equal(isCacheableInitResponse("nope"), false);
  assert.equal(isCacheableInitResponse({}), false);
});

// --- buildInitResponseFromCache ---------------------------------------------
test("buildInitResponseFromCache: replays the cached result, overriding ONLY the id", () => {
  // WHY: MCP correlates responses by JSON-RPC id. The cached response has a STALE id from a
  // prior client; the reply MUST carry THIS client's id or the client ignores it and drops prism.
  const cached = { jsonrpc: "2.0", result: REAL_INIT.result };
  const out = buildInitResponseFromCache(cached, { id: 42, method: "initialize" });
  assert.equal(out.id, 42);
  assert.equal(out.jsonrpc, "2.0");
  assert.deepEqual(out.result, REAL_INIT.result); // byte-identical capabilities/serverInfo
});

test("buildInitResponseFromCache: preserves serverInfo + capabilities verbatim (byte-identical replay)", () => {
  const out = buildInitResponseFromCache({ result: REAL_INIT.result }, { id: 9 });
  assert.equal(out.result.serverInfo.name, "prism-mcp-server");
  assert.equal(out.result.protocolVersion, "2024-11-05");
  assert.deepEqual(out.result.capabilities, { tools: {} });
});

test("buildInitResponseFromCache: unusable cache -> null (caller falls back to forwarding)", () => {
  assert.equal(buildInitResponseFromCache(null, { id: 1 }), null);
  assert.equal(buildInitResponseFromCache({ error: { code: -1 } }, { id: 1 }), null);
  assert.equal(buildInitResponseFromCache({ result: {} }, { id: 1 }), null);
});

test("buildInitResponseFromCache: missing request id -> null id (JSON-RPC-valid, never undefined)", () => {
  // A response with id:undefined would serialize WITHOUT an id field and read as a notification;
  // null is the JSON-RPC-correct 'unknown id' and keeps the message a response.
  const out = buildInitResponseFromCache({ result: REAL_INIT.result }, {});
  assert.equal(out.id, null);
  assert.ok("id" in out); // the id key is present (not dropped)
});

// --- disk cache round-trip (impure layer -- arm A P2 coverage gap) -----------
test("writeCachedInit + readCachedInit: round-trips a real response, id STRIPPED, rebuildable", () => {
  // WHY: the cold-connect fix replays this cache to real clients. A broken write/read (esp. the
  // Windows tmp+rename) would silently disable the whole optimization or replay garbage.
  const f = path.join(os.tmpdir(), `mcp-init-cache-rt-${process.pid}.json`);
  try {
    writeCachedInit(REAL_INIT, f);
    const read = readCachedInit(f);
    assert.equal(read.result.serverInfo.name, "prism-mcp-server");
    assert.ok(!("id" in read)); // the per-request id is stripped on write (only {jsonrpc,result})
    const built = buildInitResponseFromCache(read, { id: 99, method: "initialize" });
    assert.equal(built.id, 99);
    assert.deepEqual(built.result, REAL_INIT.result); // byte-identical after a full disk round-trip
  } finally { try { fs.unlinkSync(f); } catch { /* best-effort */ } }
});

test("writeCachedInit: refuses to persist an error/garbage response (no cache poisoning)", () => {
  const f = path.join(os.tmpdir(), `mcp-init-cache-bad-${process.pid}.json`);
  try {
    writeCachedInit({ jsonrpc: "2.0", error: { code: -1, message: "x" } }, f);
    assert.equal(fs.existsSync(f), false); // an error response is NEVER written
    writeCachedInit({ result: { capabilities: {} } }, f); // no serverInfo
    assert.equal(fs.existsSync(f), false);
  } finally { try { fs.unlinkSync(f); } catch { /* best-effort */ } }
});

test("readCachedInit: absent OR corrupt file -> null (fail-safe, never throws)", () => {
  const missing = path.join(os.tmpdir(), `mcp-init-cache-missing-${process.pid}.json`);
  assert.equal(readCachedInit(missing), null);
  const corrupt = path.join(os.tmpdir(), `mcp-init-cache-corrupt-${process.pid}.json`);
  try {
    fs.writeFileSync(corrupt, "{ not valid json", "utf8");
    assert.equal(readCachedInit(corrupt), null); // JSON.parse throw is swallowed -> null (fall through to forward)
  } finally { try { fs.unlinkSync(corrupt); } catch { /* best-effort */ } }
});

test("buildInitResponseFromCache: a STALE id embedded in the cached object is ignored (client id wins)", () => {
  // WHY (arm B P2): the cache stores {jsonrpc,result} without an id, but even if a stale id:999
  // leaked into the cached object, the reply MUST carry THIS client's id -- a stale id would make
  // the client ignore the response and drop prism.
  const staleCached = { jsonrpc: "2.0", id: 999, result: REAL_INIT.result };
  const out = buildInitResponseFromCache(staleCached, { id: 3, method: "initialize" });
  assert.equal(out.id, 3);            // client's id, not the stale 999
  assert.notEqual(out.id, 999);
});

// --- integration: the actual cold-connect fix, end-to-end (arm B P1) --------
test("integration: DEAD backend + seeded cache -> bridge answers initialize LOCALLY within a few s (was a 30s+ drop)", async () => {
  // Spawns the REAL bridge pointed at a dead port with a seeded temp cache and self-heal OFF, then
  // sends `initialize` and asserts a response with THIS client's id arrives fast (the cold-answer),
  // proving the fleet-critical impure path -- NOT an external harness (R15/R12).
  const cacheFile = path.join(os.tmpdir(), `mcp-init-int-${process.pid}.json`);
  writeCachedInit(REAL_INIT, cacheFile);
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [BRIDGE_PATH], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          MCP_HTTP_URL: "http://127.0.0.1:3196/mcp",     // dead port -> backend is "cold"
          PRISM_MCP_INIT_CACHE_FILE: cacheFile,           // inject the seeded temp cache
          PRISM_MCP_BRIDGE_SELF_HEAL: "0",                // do not spawn a real supervisor
          PRISM_MCP_LOCAL_INIT: "1",
        },
      });
      let out = "", done = false;
      const finish = (v) => { if (!done) { done = true; clearTimeout(to); try { child.kill(); } catch { /* gone */ } resolve(v); } };
      const to = setTimeout(() => finish({ timeout: true }), 12000);
      child.stdout.on("data", (d) => {
        out += d;
        for (const line of out.split("\n")) {
          if (line.includes('"id":7') && line.includes('"result"')) {
            let j = null; try { j = JSON.parse(line); } catch { /* partial line */ }
            if (j) finish({ resp: j });
          }
        }
      });
      child.on("error", () => finish({ spawnErr: true }));
      child.stdin.write(JSON.stringify({
        jsonrpc: "2.0", id: 7, method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "int-test", version: "1" } },
      }) + "\n");
    });
    assert.ok(result.resp, "bridge answered initialize despite a DEAD backend (local cold-answer, not a timeout drop)");
    assert.equal(result.resp.id, 7, "local answer carries the client's JSON-RPC id");
    assert.equal(result.resp.result.serverInfo.name, "prism-mcp-server", "local answer replays the cached real serverInfo");
  } finally { try { fs.unlinkSync(cacheFile); } catch { /* best-effort */ } }
});
