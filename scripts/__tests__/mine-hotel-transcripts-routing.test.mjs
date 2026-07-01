// mine-hotel-transcripts-routing.test.mjs -- LOCAL-LLM-MS1/U-NUMCTX-HOTEL-MINER-ROUTE
// Verifies the hotel transcript miner's `ollama` MCP overlay (the third + last live per-domain
// miner to get the proven india/galaxy routing -- completes the fleet-wide apply-to-all). When the
// gate is on it routes through prism_local local_generate (forwarding numCtx so the 32768-sized
// slices are not truncated) and FAILS SOFT to the direct /api/generate path on any MCP failure;
// the gate-OFF path is byte-identical to the legacy direct mine; the R12 empty-response fail-loud
// guard is preserved. Seams (mcpEnabled/callViaMcpImpl/fetchImpl) injected -- no network. This test
// also implicitly proves the new main-guard works: importing the miner does NOT run its CLI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ollama } from "../mine-hotel-transcripts.mjs";

test("ollama: MCP overlay ON routes via callViaMcp with numCtx=32768 + numPredict + timeoutMs (no direct fetch)", async () => {
  let mcpArgs = null;
  let fetchCalled = false;
  const callViaMcpImpl = async (model, prompt, opts) => { mcpArgs = { model, prompt, opts }; return { ok: true, text: "DIGEST-VIA-MCP" }; };
  const fetchImpl = async () => { fetchCalled = true; return { ok: true, json: async () => ({ response: "DIRECT" }) }; };
  const out = await ollama("slice text", "gpt-oss:20b", { mcpEnabled: true, callViaMcpImpl, fetchImpl });
  assert.equal(out, "DIGEST-VIA-MCP");
  assert.equal(fetchCalled, false); // MCP succeeded -> direct path not touched
  assert.equal(mcpArgs.opts.numCtx, 32768);      // NUM_CTX -- the truncation guard
  assert.equal(mcpArgs.opts.numPredict, 16384);  // MCP_NUM_PREDICT (ceiling; dense synthesis not output-truncated)
  assert.equal(mcpArgs.opts.timeoutMs, 240000);  // GEN_TIMEOUT_MS forwarded to the MCP envelope
  assert.equal(mcpArgs.model, "gpt-oss:20b");
  assert.equal(mcpArgs.prompt, "slice text");
});

test("ollama: MCP failure FAILS SOFT to the direct /api/generate path", async () => {
  let fetchCalled = false;
  const callViaMcpImpl = async () => ({ ok: false, error: "MCP down" });
  const fetchImpl = async () => { fetchCalled = true; return { ok: true, json: async () => ({ response: "DIRECT-FALLBACK" }) }; };
  const out = await ollama("p", "m", { mcpEnabled: true, callViaMcpImpl, fetchImpl });
  assert.equal(out, "DIRECT-FALLBACK");
  assert.equal(fetchCalled, true);
});

test("ollama: MCP ok-but-empty text falls through to direct (not a phantom-ok)", async () => {
  let fetchCalled = false;
  const callViaMcpImpl = async () => ({ ok: true, text: "   " }); // ok flag but no real content
  const fetchImpl = async () => { fetchCalled = true; return { ok: true, json: async () => ({ response: "RECOVERED" }) }; };
  const out = await ollama("p", "m", { mcpEnabled: true, callViaMcpImpl, fetchImpl });
  assert.equal(out, "RECOVERED");
  assert.equal(fetchCalled, true);
});

test("ollama: gate OFF uses the direct path only, never calls MCP, still sets num_ctx (byte-identical legacy)", async () => {
  let mcpCalled = false;
  const callViaMcpImpl = async () => { mcpCalled = true; return { ok: true, text: "x" }; };
  let bodyOptions = null;
  const fetchImpl = async (_url, init) => {
    bodyOptions = JSON.parse(init.body).options;
    return { ok: true, json: async () => ({ response: "DIRECT-ONLY" }) };
  };
  const out = await ollama("p", "m", { mcpEnabled: false, callViaMcpImpl, fetchImpl });
  assert.equal(out, "DIRECT-ONLY");
  assert.equal(mcpCalled, false);
  assert.equal(bodyOptions.num_ctx, 32768);   // direct path keeps the miner's num_ctx
  assert.equal(bodyOptions.temperature, 0.2);
});

test("ollama: direct-path empty 200-OK FAILS LOUD (R12 silent-data-loss guard preserved)", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ response: "   " }) });
  await assert.rejects(
    ollama("p", "m", { mcpEnabled: false, fetchImpl }),
    /empty response/,
  );
});

test("ollama: direct-path non-2xx FAILS LOUD with the HTTP status", async () => {
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(
    ollama("p", "m", { mcpEnabled: false, fetchImpl }),
    /ollama HTTP 503/,
  );
});
