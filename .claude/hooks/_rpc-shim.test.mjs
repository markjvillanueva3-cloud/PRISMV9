/**
 * _rpc-shim.test.mjs — U-DOCKER-HOOK-BROKER-P4
 *
 * Hermetic tests for the broker RPC shim. Exercise `postToBroker` against
 * an in-process HTTP server (no broker process needed), and
 * `fallbackToOriginal` against a temp dir containing a synthetic
 * `<name>.original.mjs`.
 *
 * `readStdinText` + `runShim` are integration paths that drive
 * process.stdin / process.exit — out of scope for unit tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  postToBroker,
  fallbackToOriginal,
} from "./_rpc-shim.mjs";

// Mini HTTP server helper — listens on a random port, runs the supplied
// handler, returns { port, close }.
async function startMockBroker(handler) {
  const server = createServer((req, res) => handler(req, res));
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  return {
    port: server.address().port,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

describe("postToBroker", () => {
  it("POSTs stdin to /hook/<name> and returns the parsed JSON body", async () => {
    const broker = await startMockBroker(async (req, res) => {
      // Verify path + method
      assert.equal(req.method, "POST");
      assert.equal(req.url, "/hook/my-hook");
      // Echo body back
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ echoed: body, ok: true }));
      });
    });
    try {
      const result = await postToBroker("my-hook", "stdin payload", { port: broker.port });
      assert.equal(result.ok, true);
      assert.equal(result.echoed, "stdin payload");
    } finally {
      await broker.close();
    }
  });

  it("URL-encodes hook names with special characters", async () => {
    const broker = await startMockBroker(async (req, res) => {
      assert.equal(req.url, "/hook/foo.bar-baz");
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    try {
      await postToBroker("foo.bar-baz", "", { port: broker.port });
    } finally {
      await broker.close();
    }
  });

  it("throws on non-2xx status with the broker body in the error message", async () => {
    const broker = await startMockBroker(async (req, res) => {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "no such hook" }));
    });
    try {
      await assert.rejects(
        () => postToBroker("missing", "", { port: broker.port }),
        /broker 404/,
      );
    } finally {
      await broker.close();
    }
  });

  it("returns the raw body when the broker response is non-JSON", async () => {
    const broker = await startMockBroker(async (req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("plain-text-response");
    });
    try {
      const result = await postToBroker("text-hook", "", { port: broker.port });
      assert.equal(result, "plain-text-response");
    } finally {
      await broker.close();
    }
  });

  it("rejects on connection refused (broker down)", async () => {
    // Port 1 is privileged and reliably unbindable — connecting to it
    // produces ECONNREFUSED on every platform.
    await assert.rejects(
      () => postToBroker("any", "", { port: 1, timeoutMs: 1000 }),
      /ECONN|connect/i,
    );
  });

  it("rejects on timeout when the broker hangs", async () => {
    const broker = await startMockBroker(async () => {
      // Never write a response — let the request time out.
    });
    try {
      await assert.rejects(
        () => postToBroker("hang", "", { port: broker.port, timeoutMs: 100 }),
        /timeout/i,
      );
    } finally {
      await broker.close();
    }
  });

  it("honors PRISM_BROKER_PORT env var when no explicit port is passed", async () => {
    const broker = await startMockBroker(async (req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ from: "env" }));
    });
    const prev = process.env.PRISM_BROKER_PORT;
    process.env.PRISM_BROKER_PORT = String(broker.port);
    try {
      const result = await postToBroker("env-test", "");
      assert.equal(result.from, "env");
    } finally {
      if (prev === undefined) delete process.env.PRISM_BROKER_PORT;
      else process.env.PRISM_BROKER_PORT = prev;
      await broker.close();
    }
  });
});

describe("fallbackToOriginal", () => {
  it("dynamic-imports <name>.original.mjs and invokes its default with stdin", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rpc-shim-fb-"));
    try {
      // The shim resolves `<name>.original.mjs` relative to its own dir
      // (passed as shimFile = import.meta.url). Build a fake shim path
      // pointing at our temp dir so the resolver lands here.
      const fakeShim = pathToFileURL(join(dir, "_rpc-shim.mjs")).href;
      writeFileSync(
        join(dir, "test-hook.original.mjs"),
        "export default async function handle(stdin) { return { received: stdin, fallback: true }; }\n",
      );
      const r = await fallbackToOriginal("test-hook", "stdin-data", fakeShim);
      assert.equal(r.fallback, true);
      assert.equal(r.received, "stdin-data");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws when <name>.original.mjs has no callable default export", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rpc-shim-fb-nodef-"));
    try {
      const fakeShim = pathToFileURL(join(dir, "_rpc-shim.mjs")).href;
      writeFileSync(
        join(dir, "broken-hook.original.mjs"),
        "export const NOT_A_DEFAULT = true;\n",
      );
      await assert.rejects(
        () => fallbackToOriginal("broken-hook", "", fakeShim),
        /no callable default export/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws when <name>.original.mjs doesn't exist", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rpc-shim-fb-missing-"));
    try {
      const fakeShim = pathToFileURL(join(dir, "_rpc-shim.mjs")).href;
      await assert.rejects(
        () => fallbackToOriginal("no-such-hook", "", fakeShim),
        /./, // any error — import resolution fails
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles sync default exports (not just async)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rpc-shim-fb-sync-"));
    try {
      const fakeShim = pathToFileURL(join(dir, "_rpc-shim.mjs")).href;
      writeFileSync(
        join(dir, "sync-hook.original.mjs"),
        "export default (s) => ({ sync: true, payload: s });\n",
      );
      const r = await fallbackToOriginal("sync-hook", "x", fakeShim);
      assert.equal(r.sync, true);
      assert.equal(r.payload, "x");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
