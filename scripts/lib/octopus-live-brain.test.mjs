// scripts/lib/octopus-live-brain.test.mjs
//
// Tests for U-FLEET-P2-LIVEBRAIN-SLOTCTX live-brain fetch lib.
// Run: node --test H:/prism/scripts/lib/octopus-live-brain.test.mjs
//
// Coverage contract (per build unit):
//   happy        — gate on + valid bridge response => normalized hits
//   cache hit    — second call within TTL does not re-fetch; flagged cached
//   cache expiry — call after TTL re-fetches
//   timeout      — fetcher rejects (timeout) => null fail-soft
//   :3100 down   — fetcher rejects (ECONNREFUSED) => null fail-soft
//   gate off     — env != 1 => null, fetcher NEVER called (zero behavior change)
//   adversarial  — garbage body, oversize body, MCP error envelope, ok:false,
//                  non-array data, empty data, secret-leaking filename redaction

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchLiveBrain,
  buildSearchRequest,
  parseSearchResponse,
  cacheKeyForPrompt,
  resolveMcpUrl,
  MAX_RESPONSE_BYTES,
  DEFAULT_MCP_URL,
  GATE_ENV,
} from "./octopus-live-brain.mjs";

// ── helpers ──────────────────────────────────────────────────────────────
const gateOn = () => true;
const gateOff = () => false;

/** Build a well-formed MCP envelope wrapping an obsidian_search result. */
function mcpEnvelope(dataArr) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: "live-brain",
    result: {
      content: [
        { type: "text", text: JSON.stringify({ success: true, result: { ok: true, data: dataArr } }) },
      ],
    },
  });
}

/** A fetcher that records calls and returns a fixed body. */
function recordingFetcher(body) {
  const calls = [];
  const fn = async (req, opts) => {
    calls.push({ req, opts });
    if (body instanceof Error) throw body;
    return body;
  };
  fn.calls = calls;
  return fn;
}

// ── buildSearchRequest contract ────────────────────────────────────────────
test("buildSearchRequest emits a JSON-RPC tools/call for prism_session:obsidian_search", () => {
  const r = buildSearchRequest("how do feeds work");
  assert.equal(r.jsonrpc, "2.0");
  assert.equal(r.method, "tools/call");
  assert.equal(r.params.name, "prism_session");
  assert.equal(r.params.arguments.action, "obsidian_search");
  assert.equal(r.params.arguments.query, "how do feeds work");
});

test("buildSearchRequest coerces null/undefined query to empty string (no throw)", () => {
  assert.equal(buildSearchRequest(null).params.arguments.query, "");
  assert.equal(buildSearchRequest(undefined).params.arguments.query, "");
});

// ── resolveMcpUrl (env honored, like the bridge) ────────────────────────────
test("resolveMcpUrl honors MCP_HTTP_URL when set, else the loopback default", () => {
  const saved = process.env.MCP_HTTP_URL;
  try {
    process.env.MCP_HTTP_URL = "http://127.0.0.1:9999/mcp";
    assert.equal(resolveMcpUrl(), "http://127.0.0.1:9999/mcp");
    delete process.env.MCP_HTTP_URL;
    assert.equal(resolveMcpUrl(), DEFAULT_MCP_URL);
    process.env.MCP_HTTP_URL = "   ";
    assert.equal(resolveMcpUrl(), DEFAULT_MCP_URL, "blank env => default (not the blank string)");
  } finally {
    if (saved === undefined) delete process.env.MCP_HTTP_URL;
    else process.env.MCP_HTTP_URL = saved;
  }
});

// ── cacheKeyForPrompt ──────────────────────────────────────────────────────
test("cacheKeyForPrompt normalizes whitespace + case and caps length", () => {
  assert.equal(cacheKeyForPrompt("  Hello   World  "), "hello world");
  assert.equal(cacheKeyForPrompt(null), "");
  assert.equal(cacheKeyForPrompt("x".repeat(500)).length, 200);
});

// ── HAPPY PATH ──────────────────────────────────────────────────────────────
test("happy: gate on + valid response => normalized hits, cached:false", async () => {
  const fetcher = recordingFetcher(
    mcpEnvelope([
      { filename: "knowledge/wiki/feeds.md", score: 0.91 },
      { filename: "memory/reference_feeds.md", score: 0.42 },
    ]),
  );
  const cache = new Map();
  const out = await fetchLiveBrain("feeds and speeds", { gate: gateOn, fetcher, cache, now: () => 1000 });
  assert.ok(out, "expected a non-null result");
  assert.equal(out.ok, true);
  assert.equal(out.cached, false);
  assert.equal(out.hits.length, 2);
  assert.equal(out.hits[0].filename, "knowledge/wiki/feeds.md");
  assert.equal(out.hits[0].score, 0.91);
  assert.equal(fetcher.calls.length, 1, "fetcher should have been called exactly once");
});

test("happy: maxHits caps the returned hit list", async () => {
  const big = Array.from({ length: 20 }, (_, i) => ({ filename: `f${i}.md`, score: i }));
  const out = await fetchLiveBrain("q", {
    gate: gateOn, fetcher: recordingFetcher(mcpEnvelope(big)), cache: new Map(), now: () => 1, maxHits: 3,
  });
  assert.equal(out.hits.length, 3);
});

// ── CACHE HIT ───────────────────────────────────────────────────────────────
test("cache hit: second call within TTL returns cached:true and does NOT re-fetch", async () => {
  const fetcher = recordingFetcher(mcpEnvelope([{ filename: "a.md", score: 1 }]));
  const cache = new Map();
  let clock = 1000;
  const now = () => clock;
  const first = await fetchLiveBrain("same prompt", { gate: gateOn, fetcher, cache, now, ttlMs: 30000 });
  assert.equal(first.cached, false);
  clock = 1000 + 10000; // within 30s TTL
  const second = await fetchLiveBrain("same prompt", { gate: gateOn, fetcher, cache, now, ttlMs: 30000 });
  assert.equal(second.cached, true);
  assert.deepEqual(second.hits, first.hits);
  assert.equal(fetcher.calls.length, 1, "only the first call should hit the bridge");
});

test("cache expiry: call after TTL re-fetches", async () => {
  const fetcher = recordingFetcher(mcpEnvelope([{ filename: "a.md" }]));
  const cache = new Map();
  let clock = 1000;
  const now = () => clock;
  await fetchLiveBrain("p", { gate: gateOn, fetcher, cache, now, ttlMs: 30000 });
  clock = 1000 + 30001; // past TTL
  await fetchLiveBrain("p", { gate: gateOn, fetcher, cache, now, ttlMs: 30000 });
  assert.equal(fetcher.calls.length, 2, "expired entry must re-fetch");
});

test("negative cache: a null result is cached and suppresses re-fetch within TTL", async () => {
  // garbage body -> parse returns null -> negative-cached.
  const fetcher = recordingFetcher("not json at all");
  const cache = new Map();
  let clock = 5;
  const now = () => clock;
  const first = await fetchLiveBrain("p", { gate: gateOn, fetcher, cache, now, ttlMs: 1000 });
  assert.equal(first, null);
  clock = 100; // still within TTL
  const second = await fetchLiveBrain("p", { gate: gateOn, fetcher, cache, now, ttlMs: 1000 });
  assert.equal(second, null);
  assert.equal(fetcher.calls.length, 1, "negative cache must suppress the second fetch");
});

// ── TIMEOUT FAIL-SOFT ────────────────────────────────────────────────────────
test("timeout: fetcher rejects with timeout => null (fail-soft)", async () => {
  const fetcher = recordingFetcher(new Error("timeout-1500ms"));
  const out = await fetchLiveBrain("q", { gate: gateOn, fetcher, cache: new Map(), now: () => 1 });
  assert.equal(out, null);
});

// ── :3100 DOWN FAIL-SOFT ──────────────────────────────────────────────────────
test(":3100 down: fetcher rejects ECONNREFUSED => null (fail-soft)", async () => {
  const err = new Error("connect ECONNREFUSED 127.0.0.1:3100");
  err.code = "ECONNREFUSED";
  const out = await fetchLiveBrain("q", { gate: gateOn, fetcher: recordingFetcher(err), cache: new Map(), now: () => 1 });
  assert.equal(out, null);
});

// ── GATE OFF — ZERO BEHAVIOR CHANGE ──────────────────────────────────────────
test("gate off: returns null and NEVER calls the fetcher", async () => {
  const fetcher = recordingFetcher(mcpEnvelope([{ filename: "a.md" }]));
  const out = await fetchLiveBrain("q", { gate: gateOff, fetcher, cache: new Map(), now: () => 1 });
  assert.equal(out, null);
  assert.equal(fetcher.calls.length, 0, "gate off must short-circuit before any I/O");
});

test("gate off via real env default (PRISM_OBSIDIAN_LIVE unset) => null, no fetch", async () => {
  const saved = process.env[GATE_ENV];
  delete process.env[GATE_ENV];
  try {
    const fetcher = recordingFetcher(mcpEnvelope([{ filename: "a.md" }]));
    const out = await fetchLiveBrain("q", { fetcher, cache: new Map(), now: () => 1 });
    assert.equal(out, null);
    assert.equal(fetcher.calls.length, 0);
  } finally {
    if (saved === undefined) delete process.env[GATE_ENV];
    else process.env[GATE_ENV] = saved;
  }
});

test("empty prompt: gate on but blank prompt => null, no fetch", async () => {
  const fetcher = recordingFetcher(mcpEnvelope([{ filename: "a.md" }]));
  const out = await fetchLiveBrain("   ", { gate: gateOn, fetcher, cache: new Map(), now: () => 1 });
  assert.equal(out, null);
  assert.equal(fetcher.calls.length, 0);
});

// ── ADVERSARIAL ───────────────────────────────────────────────────────────────
test("adversarial: garbage (non-JSON) body => null", () => {
  assert.equal(parseSearchResponse("<html>502 Bad Gateway</html>"), null);
  assert.equal(parseSearchResponse(""), null);
  assert.equal(parseSearchResponse("   "), null);
  assert.equal(parseSearchResponse(null), null);
});

test("adversarial: oversize body (> MAX_RESPONSE_BYTES) => null", () => {
  const huge = "x".repeat(MAX_RESPONSE_BYTES + 1);
  assert.equal(parseSearchResponse(huge), null);
});

test("adversarial: JSON-RPC error envelope => null", () => {
  const errEnv = JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "Bridge error" } });
  assert.equal(parseSearchResponse(errEnv), null);
});

test("adversarial: obsidian result ok:false (vault down / no-key) => null", () => {
  const env = JSON.stringify({
    result: { content: [{ type: "text", text: JSON.stringify({ success: true, result: { ok: false, reason: "no-key" } }) }] },
  });
  assert.equal(parseSearchResponse(env), null);
});

test("adversarial: data is not an array => null", () => {
  const env = JSON.stringify({
    result: { content: [{ type: "text", text: JSON.stringify({ result: { ok: true, data: { not: "array" } } }) }] },
  });
  assert.equal(parseSearchResponse(env), null);
});

test("adversarial: empty data array => null (nothing to inject)", () => {
  assert.equal(parseSearchResponse(mcpEnvelopeStr([])), null);
});

test("adversarial: hits with non-object/blank entries are skipped; secrets redacted", () => {
  const env = JSON.stringify({
    result: {
      content: [{
        type: "text",
        text: JSON.stringify({
          result: {
            ok: true,
            data: [
              null,
              42,
              { filename: "" },
              { filename: "secret: sk-ABCDEF1234567890ABCDEF1234567890 note.md", score: "bad-score" },
              { filename: "ok.md", score: 0.5 },
            ],
          },
        }),
      }],
    },
  });
  const out = parseSearchResponse(env);
  assert.ok(out, "should still produce hits from the valid entries");
  // null/42/blank-filename dropped => only the secret-bearing + ok.md remain.
  assert.equal(out.hits.length, 2);
  // secret-shaped token in the filename must be masked by redactSecrets.
  assert.ok(!/sk-ABCDEF1234567890ABCDEF1234567890/.test(out.hits[0].filename), "secret must be redacted");
  // non-numeric score must be dropped (no score key), not passed through.
  assert.equal("score" in out.hits[0], false);
  assert.equal(out.hits[1].filename, "ok.md");
  assert.equal(out.hits[1].score, 0.5);
});

test("adversarial: content present but no text node => null", () => {
  const env = JSON.stringify({ result: { content: [{ type: "image", data: "..." }] } });
  assert.equal(parseSearchResponse(env), null);
});

test("adversarial: text node holds non-JSON => null", () => {
  const env = JSON.stringify({ result: { content: [{ type: "text", text: "oops not json" }] } });
  assert.equal(parseSearchResponse(env), null);
});

// local helper used above (kept after the tests that need it is fine in node:test)
function mcpEnvelopeStr(dataArr) {
  return JSON.stringify({
    result: { content: [{ type: "text", text: JSON.stringify({ result: { ok: true, data: dataArr } }) }] },
  });
}
