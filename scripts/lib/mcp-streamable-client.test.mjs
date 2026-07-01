// mcp-streamable-client.test.mjs -- LOCAL-LLM-MS1/U-LOCAL-GENERATE-CONSUMER
// Direct coverage at the new home for the MCP Streamable-HTTP client extracted
// from ollama-prism-bridge.mjs. parseMcpResponse is pure; mcpCallStreamable is
// the impure shell exercised through an injected fake fetch (never a real
// socket). The envelope-shape test is the load-bearing contract: the request
// MUST be { method:"tools/call", params:{ name:<dispatcher>,
// arguments:{ action, ...params } } } -- params SPREAD, not nested.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMcpResponse, mcpCallStreamable, MCP_URL, MCP_TIMEOUT_MS } from "./mcp-streamable-client.mjs";

// ── constants ────────────────────────────────────────────────────────────
test("MCP_URL defaults to the local server and strips a trailing slash", () => {
  // The lib reads PRISM_MCP_URL at import; with none set the default holds.
  assert.match(MCP_URL, /^http:\/\/127\.0\.0\.1:3100\/mcp$/);
  assert.equal(MCP_URL.endsWith("/"), false);
});
test("MCP_TIMEOUT_MS is the 8s warm/cold-init budget", () => {
  assert.equal(MCP_TIMEOUT_MS, 8000);
});

// ── parseMcpResponse (pure) ──────────────────────────────────────────────
test("parseMcpResponse: application/json body parses cleanly", () => {
  const r = parseMcpResponse("application/json", JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.envelope.result, { ok: true });
});

test("parseMcpResponse: text/event-stream picks the JSON-RPC response envelope", () => {
  const sse = [
    "data: {\"jsonrpc\":\"2.0\",\"method\":\"notifications/progress\"}",
    "data: {\"jsonrpc\":\"2.0\",\"id\":7,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}]}}",
    "data: [DONE]",
  ].join("\n");
  const r = parseMcpResponse("text/event-stream", sse);
  assert.equal(r.ok, true);
  assert.equal(r.envelope.id, 7);
  assert.equal(r.envelope.result.content[0].text, "ok");
});

test("parseMcpResponse: empty body is a fail-loud error, never an empty envelope", () => {
  const r = parseMcpResponse("application/json", "");
  assert.equal(r.ok, false);
  assert.match(r.error, /empty/i);
});

test("parseMcpResponse: malformed JSON is rejected with the parser error message", () => {
  const r = parseMcpResponse("application/json", "{not json}");
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/i);
});

test("parseMcpResponse: SSE stream with no response envelope is rejected loudly", () => {
  const r = parseMcpResponse("text/event-stream", "data: [DONE]\n\n");
  assert.equal(r.ok, false);
  assert.match(r.error, /no JSON-RPC response envelope/i);
});

test("parseMcpResponse: unknown content-type falls back to JSON, fails loud when not JSON", () => {
  const ok = parseMcpResponse("text/plain", JSON.stringify({ jsonrpc: "2.0", id: 1, result: "x" }));
  assert.equal(ok.ok, true);
  const bad = parseMcpResponse("text/plain", "just text");
  assert.equal(bad.ok, false);
  assert.match(bad.error, /unsupported Content-Type/i);
});

// ── mcpCallStreamable (impure shell, injected fake fetch) ─────────────────
function jsonRes(obj, { status = 200, ok = true, contentType = "application/json" } = {}) {
  return {
    ok,
    status,
    headers: { get: (h) => (h.toLowerCase() === "content-type" ? contentType : null) },
    text: async () => JSON.stringify(obj),
  };
}

test("mcpCallStreamable: builds the exact tools/call envelope (params SPREAD into arguments)", async () => {
  let captured = null;
  const fakeFetch = async (url, init) => {
    captured = { url, body: JSON.parse(init.body), headers: init.headers };
    return jsonRes({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "done" }] } });
  };
  const r = await mcpCallStreamable({
    dispatcher: "prism_local",
    action: "local_generate",
    params: { prompt: "hi", model: "gpt-oss:20b", maxTokens: 256 },
    fetchImpl: fakeFetch,
  });
  assert.equal(r.ok, true);
  assert.equal(captured.body.method, "tools/call");
  assert.equal(captured.body.params.name, "prism_local");
  // The contract: action + params spread together, NOT params:{...} nested.
  assert.equal(captured.body.params.arguments.action, "local_generate");
  assert.equal(captured.body.params.arguments.prompt, "hi");
  assert.equal(captured.body.params.arguments.model, "gpt-oss:20b");
  assert.equal(captured.body.params.arguments.maxTokens, 256);
  assert.equal(captured.body.params.arguments.params, undefined); // never nested
  // StreamableHTTPServerTransport requires both Accept types.
  assert.match(captured.headers.Accept, /application\/json/);
  assert.match(captured.headers.Accept, /text\/event-stream/);
});

test("mcpCallStreamable: happy-path JSON-RPC over JSON returns the result", async () => {
  const fakeFetch = async () => jsonRes({ jsonrpc: "2.0", id: 1, result: { value: 42 } });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: fakeFetch });
  assert.equal(r.ok, true);
  assert.deepEqual(r.result, { value: 42 });
});

test("mcpCallStreamable: text/event-stream branch extracts the response envelope", async () => {
  const sse = "data: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"v\":9}}\n";
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "text/event-stream" },
    text: async () => sse,
  });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: fakeFetch });
  assert.equal(r.ok, true);
  assert.deepEqual(r.result, { v: 9 });
});

test("mcpCallStreamable: HTTP non-2xx surfaces the body in a fail-loud error", async () => {
  const fakeFetch = async () => jsonRes({ msg: "boom" }, { ok: false, status: 503 });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "cutting_force", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /MCP HTTP 503/);
});

test("mcpCallStreamable: JSON-RPC error envelope is surfaced as fail-loud", async () => {
  const fakeFetch = async () => jsonRes({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "no such action" } });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "cutting_force", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /no such action/);
});

test("mcpCallStreamable: missing result field is fail-loud (not silently ok)", async () => {
  const fakeFetch = async () => jsonRes({ jsonrpc: "2.0", id: 1 });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /no 'result' field/);
});

test("mcpCallStreamable: fetch throwing a network error becomes fail-loud (not a crash)", async () => {
  const fakeFetch = async () => { throw new Error("ECONNREFUSED"); };
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /MCP unreachable/);
});

test("mcpCallStreamable: AbortError on timeout surfaces a helpful message", async () => {
  const fakeFetch = async () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    throw e;
  };
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", timeoutMs: 1234, fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out after 1234ms/);
});

test("mcpCallStreamable: a non-function fetchImpl is rejected, never invoked", async () => {
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: null });
  assert.equal(r.ok, false);
  assert.match(r.error, /no fetch impl/);
});
