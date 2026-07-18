/**
 * server.test.mjs — U-DOCKER-HOOK-BROKER-P2
 *
 * Hermetic tests for the broker HTTP server. Builds synthetic hook files
 * in a temp dir, drives `loadHooks` + `invokeHook` directly, and stands
 * up a `createBrokerServer()` on a random port to verify the routes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";

import {
  discoverModuleSafeHookFiles,
  loadHooks,
  invokeHook,
  readBody,
  createBrokerServer,
  getBrokerState,
  resetBrokerState,
} from "./server.mjs";

// Helper: build a temp hook with a callable default export.
function tmpHook(dir, name, body) {
  const p = join(dir, `${name}.mjs`);
  writeFileSync(p, body, "utf8");
  return p.replace(/\\/g, "/");
}

// Helper: do an HTTP request and read JSON. When the connection is reset
// mid-upload (server destroys the socket on overrun), the returned promise
// resolves with status=null + body containing the error code so cap tests
// can distinguish a clean 413 response from a forcible reset.
function fetchJson(port, method, path, body) {
  return new Promise((resolveReq) => {
    const req = request({
      host: "127.0.0.1",
      port,
      path,
      method,
      headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {},
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try { resolveReq({ status: res.statusCode, body: JSON.parse(text) }); }
        catch { resolveReq({ status: res.statusCode, body: text }); }
      });
    });
    req.on("error", (err) => resolveReq({ status: null, body: { connError: err?.code || String(err) } }));
    if (body) req.write(body);
    req.end();
  });
}

describe("loadHooks", () => {
  it("loads a hook with a callable default export", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-"));
    try {
      const p = tmpHook(dir, "ok", "export default function handle(stdin){return {ok:true, echo: stdin};}\n");
      resetBrokerState();
      const r = await loadHooks([p]);
      assert.equal(r.loaded, 1);
      assert.equal(r.failed, 0);
      const state = getBrokerState();
      assert.ok(state.loadedNames.includes("ok"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records 'no-default-export' for hooks without a default", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-nodef-"));
    try {
      const p = tmpHook(dir, "nodef", "export const VERSION = '1';\n");
      resetBrokerState();
      const r = await loadHooks([p]);
      assert.equal(r.loaded, 0);
      assert.equal(r.failed, 1);
      const state = getBrokerState();
      assert.equal(state.failures[0].reason, "no-default-export");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records 'default-not-callable' when default is a non-function", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-nocallable-"));
    try {
      const p = tmpHook(dir, "nofn", "export default { not: 'callable' };\n");
      resetBrokerState();
      const r = await loadHooks([p]);
      assert.equal(r.failed, 1);
      assert.equal(getBrokerState().failures[0].reason, "default-not-callable");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records 'import-error: ...' for a hook with a syntax error", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-syntax-"));
    try {
      const p = tmpHook(dir, "bad", "export default function broken( {\n"); // syntax error
      resetBrokerState();
      const r = await loadHooks([p]);
      assert.equal(r.failed, 1);
      assert.match(getBrokerState().failures[0].reason, /^import-error:/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("isolates failures — one bad hook does not block the rest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-iso-"));
    try {
      const ok1 = tmpHook(dir, "ok1", "export default ()=>({a:1});\n");
      const bad = tmpHook(dir, "bad", "export default { nope: true };\n");
      const ok2 = tmpHook(dir, "ok2", "export default ()=>({b:2});\n");
      resetBrokerState();
      const r = await loadHooks([ok1, bad, ok2]);
      assert.equal(r.loaded, 2);
      assert.equal(r.failed, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("clears previous state on re-load (idempotent)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-load-reset-"));
    try {
      const a = tmpHook(dir, "alpha", "export default ()=>({});\n");
      const b = tmpHook(dir, "bravo", "export default ()=>({});\n");
      resetBrokerState();
      await loadHooks([a, b]);
      assert.equal(getBrokerState().loadedCount, 2);
      await loadHooks([a]); // only alpha this time
      assert.equal(getBrokerState().loadedCount, 1);
      assert.ok(getBrokerState().loadedNames.includes("alpha"));
      assert.ok(!getBrokerState().loadedNames.includes("bravo"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("invokeHook", () => {
  it("invokes a sync handler and returns its value", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-invoke-sync-"));
    try {
      const p = tmpHook(dir, "echo", "export default (s)=>({received: s});\n");
      resetBrokerState();
      await loadHooks([p]);
      const r = await invokeHook("echo", "hello");
      assert.equal(r.ok, true);
      assert.deepEqual(r.output, { received: "hello" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("invokes an async handler and awaits its result", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-invoke-async-"));
    try {
      const p = tmpHook(dir, "asy", "export default async (s)=>{await new Promise(r=>setTimeout(r,10));return {len:s.length};};\n");
      resetBrokerState();
      await loadHooks([p]);
      const r = await invokeHook("asy", "abcd");
      assert.equal(r.ok, true);
      assert.deepEqual(r.output, { len: 4 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns 404 for an unknown hook name", async () => {
    resetBrokerState();
    const r = await invokeHook("nope", "");
    assert.equal(r.ok, false);
    assert.equal(r.status, 404);
  });

  it("captures handler exceptions as ok:false (no crash)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-invoke-throw-"));
    try {
      const p = tmpHook(dir, "boom", "export default ()=>{throw new Error('handler boom');};\n");
      resetBrokerState();
      await loadHooks([p]);
      const r = await invokeHook("boom", "");
      assert.equal(r.ok, false);
      assert.match(r.error, /handler boom/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("clears timer on race-win-by-handler (no event-loop leak)", async () => {
    // P1-C (Reviewer B): the timer was leaking when the handler resolved
    // first — verify a quick handler doesn't keep a pending Timeout in the
    // event loop. We check by counting active handles via
    // process._getActiveHandles().length immediately before+after a quick
    // invocation. (Heuristic test — exact handle count varies by Node
    // version, so we just assert it doesn't grow by 10+ over 10 invokes.)
    const dir = mkdtempSync(join(tmpdir(), "broker-timer-clear-"));
    try {
      const p = tmpHook(dir, "quick", "export default ()=>({fast:true});\n");
      resetBrokerState();
      await loadHooks([p]);
      const baseline = process._getActiveHandles?.().length ?? 0;
      for (let i = 0; i < 10; i++) {
        const r = await invokeHook("quick", "x");
        assert.equal(r.ok, true);
      }
      const after = process._getActiveHandles?.().length ?? 0;
      assert.ok(after - baseline < 10,
        `timer leak: ${baseline} -> ${after} active handles after 10 invocations`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("createBrokerServer — HTTP routes", () => {
  it("GET /healthz returns ready=true after loading hooks", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-srv-healthz-"));
    try {
      const p = tmpHook(dir, "h1", "export default ()=>({ok:true});\n");
      resetBrokerState();
      await loadHooks([p]);
      const server = createBrokerServer();
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const port = server.address().port;
      try {
        const res = await fetchJson(port, "GET", "/healthz");
        assert.equal(res.status, 200);
        assert.equal(res.body.ready, true);
        assert.equal(res.body.loaded, 1);
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("POST /hook/<name> invokes the cached handler", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-srv-invoke-"));
    try {
      const p = tmpHook(dir, "echo", "export default (s)=>({received: s, upper: s.toUpperCase()});\n");
      resetBrokerState();
      await loadHooks([p]);
      const server = createBrokerServer();
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const port = server.address().port;
      try {
        const res = await fetchJson(port, "POST", "/hook/echo", "hello world");
        assert.equal(res.status, 200);
        assert.equal(res.body.received, "hello world");
        assert.equal(res.body.upper, "HELLO WORLD");
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("POST /hook/<unknown> returns 404", async () => {
    resetBrokerState();
    const server = createBrokerServer();
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const port = server.address().port;
    try {
      const res = await fetchJson(port, "POST", "/hook/nope", "");
      assert.equal(res.status, 404);
      assert.match(res.body.error, /no such hook/);
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  });

  it("POST /hook with path-traversal name returns 400", async () => {
    resetBrokerState();
    const server = createBrokerServer();
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const port = server.address().port;
    try {
      const res = await fetchJson(port, "POST", "/hook/..%2Fevil", "");
      assert.equal(res.status, 400);
      assert.match(res.body.error, /invalid hook name/);
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  });

  it("POST /hook rejects backslash, null-byte, empty, and overlong names (P1-B)", async () => {
    resetBrokerState();
    const server = createBrokerServer();
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const port = server.address().port;
    try {
      // Backslash (Windows path separator)
      const r1 = await fetchJson(port, "POST", "/hook/foo%5Cbar", "");
      assert.equal(r1.status, 400);
      // Null byte
      const r2 = await fetchJson(port, "POST", "/hook/foo%00bar", "");
      assert.equal(r2.status, 400);
      // Empty (just / after the prefix → not matching startsWith but covered by allowlist)
      const r3 = await fetchJson(port, "POST", "/hook/", "");
      assert.equal(r3.status, 400);
      // Overlong name (>128 chars)
      const long = "a".repeat(129);
      const r4 = await fetchJson(port, "POST", `/hook/${long}`, "");
      assert.equal(r4.status, 400);
      // Leading digit (allowlist requires leading letter)
      const r5 = await fetchJson(port, "POST", "/hook/9foo", "");
      assert.equal(r5.status, 400);
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  });

  it("GET /loaded lists currently-cached hooks", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-srv-loaded-"));
    try {
      const p1 = tmpHook(dir, "h1", "export default ()=>({});\n");
      const p2 = tmpHook(dir, "h2", "export default ()=>({});\n");
      resetBrokerState();
      await loadHooks([p1, p2]);
      const server = createBrokerServer();
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const port = server.address().port;
      try {
        const res = await fetchJson(port, "GET", "/loaded");
        assert.equal(res.status, 200);
        assert.equal(res.body.loaded.length, 2);
        const names = res.body.loaded.map((h) => h.name).sort();
        assert.deepEqual(names, ["h1", "h2"]);
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns 404 for an unknown route", async () => {
    resetBrokerState();
    const server = createBrokerServer();
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const port = server.address().port;
    try {
      const res = await fetchJson(port, "GET", "/unknown");
      assert.equal(res.status, 404);
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  });
});

describe("discoverModuleSafeHookFiles", () => {
  it("returns a {files, source} shape (compat-report or fs-scan)", () => {
    const r = discoverModuleSafeHookFiles();
    assert.ok(Array.isArray(r.files));
    assert.ok(typeof r.source === "string");
    assert.ok(r.source === "compat-report" || r.source === "fs-scan");
  });
});

describe("readBody body cap", () => {
  it("rejects bodies over the cap", async () => {
    const dir = mkdtempSync(join(tmpdir(), "broker-srv-cap-"));
    try {
      const p = tmpHook(dir, "echo", "export default (s)=>({len: s.length});\n");
      resetBrokerState();
      await loadHooks([p]);
      const server = createBrokerServer();
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const port = server.address().port;
      try {
        // 2 MB body — cap is 1 MB. The broker calls req.destroy() on
        // overrun, which on Windows surfaces as ECONNRESET to the client
        // before the 413 response can land. Either outcome is acceptable
        // evidence that the cap fired — the contract is "the broker MUST
        // NOT load the full 2 MB into a handler".
        const huge = "x".repeat(2 * 1024 * 1024);
        const res = await fetchJson(port, "POST", "/hook/echo", huge);
        const fired = res.status === 413 || res.body?.connError === "ECONNRESET" || res.body?.connError === "EPIPE";
        assert.equal(fired, true, `expected 413 or reset, got status=${res.status} body=${JSON.stringify(res.body)}`);
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
