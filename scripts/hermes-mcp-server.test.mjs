// Tests for hermes-mcp-server.mjs -- the standalone Hermes (:8645) MCP server (#2 of the
// HERMES->Claude-Code wiring ladder). Real coverage of the OpenAI-compatible proxy contract
// via an INJECTED mock fetch: happy + proxy-down + non-200 + empty-models + malformed-shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBase, healthUrl, fallbackModel, buildChatBody, extractAnswer,
  resolveModel, hermesAsk, hermesStatus, hermesModels, makeServer,
} from "./hermes-mcp-server.mjs";

// mock fetch: routes by url substring -> {ok,status,body|throw}. Mirrors a real Response (text()).
function mockFetch(routes) {
  return async (url) => {
    const key = url.includes("/chat/completions") ? "chat"
      : url.includes("/models") ? "models"
      : url.includes("/health") ? "health" : "other";
    const r = routes[key] || {};
    if (r.throw) throw new Error(r.throw);
    const body = typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {});
    return { ok: r.ok ?? true, status: r.status ?? 200, text: async () => body };
  };
}
const deps = (fetchImpl) => ({
  base: "http://127.0.0.1:8645/v1", health: "http://127.0.0.1:8645/health",
  fallback: "grok-fallback", timeoutMs: 5000, fetchImpl,
});

test("resolveBase: default, env override, trailing-slash strip", () => {
  assert.equal(resolveBase({}), "http://127.0.0.1:8645/v1");
  assert.equal(resolveBase({ PRISM_HERMES_PROXY_URL: "http://host:9/v1/" }), "http://host:9/v1");
  assert.equal(resolveBase({ PRISM_HERMES_PROXY_URL: "http://host:9/v1" }), "http://host:9/v1");
});

test("healthUrl: /health lives at the proxy ROOT (strips /v1)", () => {
  assert.equal(healthUrl("http://127.0.0.1:8645/v1"), "http://127.0.0.1:8645/health");
  assert.equal(healthUrl("http://h:9/v1"), "http://h:9/health");
});

test("fallbackModel: PRISM_HERMES_MODEL > FALLBACK_MODEL > 'default'", () => {
  assert.equal(fallbackModel({ PRISM_HERMES_MODEL: "a", PRISM_HERMES_FALLBACK_MODEL: "b" }), "a");
  assert.equal(fallbackModel({ PRISM_HERMES_FALLBACK_MODEL: "b" }), "b");
  assert.equal(fallbackModel({}), "default");
});

test("buildChatBody: system message only when present; user content always", () => {
  const withSys = buildChatBody({ prompt: "hi", model: "m", system: "be terse" });
  assert.deepEqual(withSys.messages, [{ role: "system", content: "be terse" }, { role: "user", content: "hi" }]);
  assert.equal(withSys.model, "m");
  assert.equal(withSys.stream, false);
  const noSys = buildChatBody({ prompt: "hi", model: "m" });
  assert.equal(noSys.messages.length, 1);
  assert.equal(noSys.messages[0].role, "user");
  // whitespace-only system is dropped (not a real system prompt)
  assert.equal(buildChatBody({ prompt: "hi", model: "m", system: "   " }).messages.length, 1);
});

test("extractAnswer: message.content, choice.text fallback, malformed -> JSON dump (never throws)", () => {
  assert.equal(extractAnswer({ choices: [{ message: { content: "the answer" } }] }), "the answer");
  assert.equal(extractAnswer({ choices: [{ text: "legacy text" }] }), "legacy text");
  // adversarial: no choices / empty / null -> a string dump, NOT a throw
  assert.equal(typeof extractAnswer({ weird: 1 }), "string");
  assert.equal(typeof extractAnswer(null), "string");
  assert.equal(extractAnswer("raw string body"), "raw string body");
});

test("resolveModel: explicit > HIGHEST-CAPABILITY of /v1/models > fallback (empty AND throw)", async () => {
  assert.equal(await resolveModel("explicit-m", deps(mockFetch({}))), "explicit-m");
  // a non-grok ('x') never out-ranks a grok -> grok-3 still wins here
  const listed = deps(mockFetch({ models: { body: { data: [{ id: "grok-3" }, { id: "x" }] } } }));
  assert.equal(await resolveModel(undefined, listed), "grok-3");
  // GROK-HIGHEST-CAPABILITY: grok-3 is FIRST but grok-4.3 is most capable -> grok-4.3 wins
  const ranked = deps(mockFetch({ models: { body: { data: [{ id: "grok-3" }, { id: "grok-4.3" }] } } }));
  assert.equal(await resolveModel(undefined, ranked), "grok-4.3");
  // empty list -> configured fallback
  assert.equal(await resolveModel(undefined, deps(mockFetch({ models: { body: { data: [] } } }))), "grok-fallback");
  // /v1/models throws -> configured fallback (never propagates)
  assert.equal(await resolveModel(undefined, deps(mockFetch({ models: { throw: "ECONNREFUSED" } }))), "grok-fallback");
});

test("hermesAsk: happy path returns the answer + resolved model", async () => {
  const d = deps(mockFetch({
    models: { body: { data: [{ id: "grok-3" }] } },
    chat: { body: { choices: [{ message: { content: "42" } }] } },
  }));
  const r = await hermesAsk({ prompt: "what is 6x7?" }, d);
  assert.equal(r.ok, true);
  assert.equal(r.text, "42");
  assert.equal(r.model, "grok-3");
});

test("hermesAsk: non-200 -> ok:false with the proxy error surfaced (NOT a silent empty answer)", async () => {
  const d = deps(mockFetch({
    models: { body: { data: [{ id: "m" }] } },
    chat: { ok: false, status: 503, body: "upstream busy" },
  }));
  const r = await hermesAsk({ prompt: "x" }, d);
  assert.equal(r.ok, false);
  assert.match(r.text, /proxy error 503/);
  assert.match(r.text, /upstream busy/);
});

test("hermesAsk: proxy unreachable (fetch throws) -> ok:false, names the down proxy (fail-loud)", async () => {
  const d = deps(mockFetch({ models: { body: { data: [{ id: "m" }] } }, chat: { throw: "ECONNREFUSED" } }));
  const r = await hermesAsk({ prompt: "x" }, d);
  assert.equal(r.ok, false);
  assert.match(r.text, /unreachable|:8645/);
});

test("hermesStatus: up parses health body; cloud lane (no /health) probes /models; down only when both fail", async () => {
  const up = await hermesStatus(deps(mockFetch({ health: { body: { status: "ok", authenticated: true } } })));
  assert.equal(up.ok, true);
  assert.match(up.text, /"up":true/);
  assert.match(up.text, /authenticated/);
  // HERMES-NVIDIA-LANE: a DIRECT OpenAI-compatible cloud lane (NVIDIA) has NO /health endpoint, so a
  // /health probe throws/404s. A 200 /models then means the lane CAN serve chat -> report UP (was a
  // false-DOWN before, which degraded the whole fleet to Ollama even though NVIDIA was serving).
  const cloud = await hermesStatus(deps(mockFetch({ health: { throw: "ECONNREFUSED" }, models: { body: { data: [{ id: "meta/llama-3.3-70b-instruct" }] } } })));
  assert.equal(cloud.ok, true);
  assert.match(cloud.text, /"up":true/);
  assert.match(cloud.text, /models-probe/);
  // Truly down: BOTH /health AND /models fail -> ok:false, names the failure.
  const down = await hermesStatus(deps(mockFetch({ health: { throw: "ECONNREFUSED" }, models: { throw: "ECONNREFUSED" } })));
  assert.equal(down.ok, false);
  assert.match(down.text, /"up":false/);
});

test("hermesModels: lists ids; empty list yields []", async () => {
  const r = await hermesModels(deps(mockFetch({ models: { body: { data: [{ id: "grok-3" }, { id: "grok-4" }] } } })));
  assert.equal(r.ok, true);
  assert.match(r.text, /grok-3/);
  assert.match(r.text, /grok-4/);
  const empty = await hermesModels(deps(mockFetch({ models: { body: { data: [] } } })));
  assert.match(empty.text, /"models":\[\]/);
});

test("makeServer: constructs an McpServer with the injected deps (no throw, real object)", () => {
  const server = makeServer(deps(mockFetch({})));
  assert.ok(server && typeof server === "object", "makeServer returns a server object");
  assert.equal(typeof server.connect, "function", "the server exposes connect() (real McpServer)");
});
