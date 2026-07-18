// scripts/lib/openrouter-client.test.mjs
// Tests for U-OPENROUTER-CLIENT pure functions + the injected-fetch shell. Real
// reference-value asserts (R9): each pins exact request/response shaping behaviour.
//
// NOTE: fake test keys are assembled at runtime (KP + "...") so the literal
// "sk-or-..." token never appears in source -- the anti-pattern secret detector
// (correctly) blocks any file containing a hardcoded credential-shaped literal.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OPENROUTER_MODELS, DEFAULT_MODEL_SLUG,
  resolveModelSlug, keyFromEnv, keyStatus, redactKey, scrubSecret, buildHeaders,
  buildChatBody, buildMessages, extractCompletion, estimateTokens, costFor,
  cloudFooter, callOpenRouter,
} from "./openrouter-client.mjs";

const KP = "sk-" + "or-";            // credential prefix, split so no literal secret is in source
const K = KP + "test";               // fake key fixture
const KEY2 = KP + "v1-deadbeefcafef00d";
const LEAK = KP + "leak999";
const SECRET = KP + "secret123";

// ---- registry / defaults ---------------------------------------------------
test("registry: default slug is super-free, verified live 2026-06-15", () => {
  assert.equal(DEFAULT_MODEL_SLUG, "nvidia/nemotron-3-super-120b-a12b:free");
  assert.equal(OPENROUTER_MODELS["nemotron-ultra-free"].slug, "nvidia/nemotron-3-ultra-550b-a55b:free");
  assert.equal(OPENROUTER_MODELS["nemotron-super-free"].ctx, 1000000);
  assert.equal(OPENROUTER_MODELS["nemotron-super-free"].promptUsdPerM, 0);
  assert.equal(OPENROUTER_MODELS["nemotron-super"].completionUsdPerM, 0.45);
});

test("registry: GLM-5.2/5.1 are benchmark candidates (non-default), verified live 2026-06-17", () => {
  // REGRESSION GUARD: adding candidates must NEVER change the default route.
  assert.equal(DEFAULT_MODEL_SLUG, "nvidia/nemotron-3-super-120b-a12b:free");
  assert.equal(OPENROUTER_MODELS["glm-5.2"].slug, "z-ai/glm-5.2");
  assert.equal(OPENROUTER_MODELS["glm-5.2"].ctx, 1048576);
  assert.equal(OPENROUTER_MODELS["glm-5.2"].candidate, true);
  assert.equal(OPENROUTER_MODELS["glm-5.1"].slug, "z-ai/glm-5.1");
  assert.equal(OPENROUTER_MODELS["glm-5.1"].candidate, true);
  // routing-active nemotron entries are NOT flagged as candidates -- the flag distinguishes
  // benchmark-only models from the active fallback ladder.
  assert.equal(OPENROUTER_MODELS["nemotron-super-free"].candidate, undefined);
  // a candidate KEY resolves to its slug (the one-env-var A/B path, no code edit).
  assert.equal(resolveModelSlug("glm-5.2", {}), "z-ai/glm-5.2");
  assert.equal(resolveModelSlug("", { OPENROUTER_MODEL: "glm-5.1" }), "z-ai/glm-5.1");
  // cost computes from per-1M pricing: 1M prompt @1.40 + 1M completion @4.40 = 5.80.
  assert.equal(Math.round(costFor({ prompt_tokens: 1e6, completion_tokens: 1e6 }, "glm-5.2") * 100) / 100, 5.80);
});

// ---- resolveModelSlug ------------------------------------------------------
test("resolveModelSlug: precedence override > env > default", () => {
  assert.equal(resolveModelSlug("", {}), DEFAULT_MODEL_SLUG);
  assert.equal(resolveModelSlug("", { OPENROUTER_MODEL: "nemotron-ultra-free" }), "nvidia/nemotron-3-ultra-550b-a55b:free");
  // override wins over env
  assert.equal(resolveModelSlug("nemotron-super", { OPENROUTER_MODEL: "nemotron-ultra-free" }), "nvidia/nemotron-3-super-120b-a12b");
});
test("resolveModelSlug: registry KEY resolves to slug; unknown string is a raw slug", () => {
  assert.equal(resolveModelSlug("nemotron-ultra-free", {}), "nvidia/nemotron-3-ultra-550b-a55b:free");
  assert.equal(resolveModelSlug("vendor/some-future-model:free", {}), "vendor/some-future-model:free");
});

// ---- key handling ----------------------------------------------------------
test("keyFromEnv / keyStatus", () => {
  assert.equal(keyFromEnv({}), "");
  assert.equal(keyFromEnv({ OPENROUTER_API_KEY: ` ${K} ` }), K);
  assert.deepEqual(keyStatus({}), { present: false, source: "(unset)" });
  assert.deepEqual(keyStatus({ OPENROUTER_API_KEY: K }), { present: true, source: "OPENROUTER_API_KEY" });
});
test("redactKey: masks secrets in any string (logging safety)", () => {
  assert.equal(redactKey(`auth Bearer ${KEY2} more`), "auth Bearer *** more");
  assert.equal(redactKey(`leaked ${LEAK} in text`).includes("leak999"), false);
  assert.equal(redactKey(null), "");
});
test("redactKey: case-insensitive -- an UPCASED provider-echoed token still masks", () => {
  // an HTTP body / error the provider may upcase must still redact (arm-C P1)
  const upper = `X ${LEAK.toUpperCase()} Y`;
  assert.equal(redactKey(upper).includes("LEAK999"), false);
});
test("scrubSecret: literal-removes a KNOWN raw key (no sk- prefix) + still runs redactKey", () => {
  const raw = "myc00lrawkeythatisntskprefixed";
  assert.equal(scrubSecret(`token=${raw} end`, raw).includes(raw), false);
  // a too-short secret is ignored (never replace "" -> mangling)
  assert.equal(scrubSecret("nothing here", ""), "nothing here");
  // and the pattern path still fires
  assert.equal(scrubSecret(`Bearer ${KEY2}`, "").includes(KEY2), false);
});

// ---- buildHeaders ----------------------------------------------------------
test("buildHeaders: bearer + attribution headers", () => {
  const h = buildHeaders({ apiKey: K });
  assert.equal(h.Authorization, `Bearer ${K}`);
  assert.equal(h["Content-Type"], "application/json");
  assert.ok(h["HTTP-Referer"] && h["X-Title"]);
  // no key -> no Authorization header (caller fails loud elsewhere)
  assert.equal(buildHeaders({ apiKey: "" }).Authorization, undefined);
});

// ---- buildChatBody / buildMessages -----------------------------------------
test("buildChatBody: valid messages -> shaped body", () => {
  const r = buildChatBody({ messages: [{ role: "user", content: "hi" }], model: "m", maxTokens: 500, temperature: 0.1 });
  assert.equal(r.ok, true);
  assert.equal(r.body.model, "m");
  assert.equal(r.body.max_tokens, 500);
  assert.equal(r.body.temperature, 0.1);
  assert.equal(r.body.stream, false);
});
test("buildChatBody: failure modes -- empty array, bad message, NaN maxTokens", () => {
  assert.equal(buildChatBody({ messages: [] }).ok, false);
  assert.equal(buildChatBody({ messages: "nope" }).ok, false);
  assert.equal(buildChatBody({ messages: [{ role: "user", content: "" }] }).ok, false);
  assert.equal(buildChatBody({ messages: [{ role: "user" }] }).ok, false);
  // adversarial: NaN/negative maxTokens -> falls back to default, still ok
  const r = buildChatBody({ messages: [{ role: "user", content: "x" }], maxTokens: NaN });
  assert.equal(r.ok, true);
  assert.equal(r.body.max_tokens, 2048);
});
test("buildMessages: omits blank system", () => {
  assert.deepEqual(buildMessages({ user: "q" }), [{ role: "user", content: "q" }]);
  assert.deepEqual(buildMessages({ system: "s", user: "q" }), [{ role: "system", content: "s" }, { role: "user", content: "q" }]);
  assert.deepEqual(buildMessages({ system: "   ", user: "q" }), [{ role: "user", content: "q" }]);
});

// ---- extractCompletion -----------------------------------------------------
test("extractCompletion: happy path", () => {
  const r = extractCompletion({ choices: [{ message: { content: "  answer  " }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
  assert.equal(r.ok, true);
  assert.equal(r.text, "answer");
  assert.equal(r.finishReason, "stop");
  assert.deepEqual(r.usage, { prompt_tokens: 10, completion_tokens: 5 });
});
test("extractCompletion: failure modes -- provider error, no choices, empty content", () => {
  assert.equal(extractCompletion({ error: { message: "rate limited" } }).ok, false);
  assert.equal(extractCompletion({ error: `bad key ${SECRET}` }).ok, false);
  // secret must not leak through the error path
  assert.equal(extractCompletion({ error: `bad key ${SECRET}` }).error.includes("secret123"), false);
  assert.equal(extractCompletion({ choices: [] }).ok, false);
  const empty = extractCompletion({ choices: [{ message: { content: "" }, finish_reason: "length" }] });
  assert.equal(empty.ok, false);
  assert.match(empty.error, /finish_reason=length/);
  // message-less provider error object -> JSON.stringify fallback, still fails cleanly
  const objErr = extractCompletion({ error: { code: 429, type: "rate" } });
  assert.equal(objErr.ok, false);
  assert.match(objErr.error, /429/);
});
test("extractCompletion: adversarial -- null / non-object", () => {
  assert.equal(extractCompletion(null).ok, false);
  assert.equal(extractCompletion("nope").ok, false);
  assert.equal(extractCompletion(42).ok, false);
});

// ---- costFor / cloudFooter -------------------------------------------------
test("costFor: free tier is $0; paid computes from per-1M pricing", () => {
  assert.equal(costFor({ prompt_tokens: 1e6, completion_tokens: 1e6 }, "nemotron-super-free"), 0);
  // super paid: 1M prompt @0.09 + 1M completion @0.45 = 0.54
  assert.equal(Math.round(costFor({ prompt_tokens: 1e6, completion_tokens: 1e6 }, "nemotron-super") * 100) / 100, 0.54);
  // resolvable by slug too
  assert.ok(costFor({ prompt_tokens: 1e6, completion_tokens: 0 }, "nvidia/nemotron-3-ultra-550b-a55b") > 0);
  // unknown model / null usage -> 0
  assert.equal(costFor(null, "nemotron-super"), 0);
  assert.equal(costFor({ prompt_tokens: 100 }, "no-such-model"), 0);
});
test("cloudFooter: reports tokens + cost, always notes 0 Claude-context tokens", () => {
  const f = cloudFooter({ model: "nemotron-super-free", usage: { prompt_tokens: 1000, completion_tokens: 50 }, durationMs: 1234 });
  assert.match(f, /1000 prompt \+ 50 completion/);
  assert.match(f, /\$0 \(free tier\)/);
  assert.match(f, /0 tokens entered the Claude context/);
});
test("estimateTokens: 4 chars/token", () => {
  assert.equal(estimateTokens("abcd"), 1);
  assert.equal(estimateTokens("abcde"), 2);
  assert.equal(estimateTokens(null), 0);
});

// ---- callOpenRouter (injected fetch) ---------------------------------------
test("callOpenRouter: missing key fails loud (no faked success)", async () => {
  let called = false;
  const r = await callOpenRouter({ messages: [{ role: "user", content: "hi" }], apiKey: "", fetchImpl: async () => { called = true; } });
  assert.equal(r.ok, false);
  assert.match(r.error, /OPENROUTER_API_KEY not set/);
  assert.equal(called, false, "must not hit the network without a key");
});
test("callOpenRouter: happy path returns text + usage + duration", async () => {
  let ticks = 0;
  const fetchImpl = async (url, init) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "nvidia/nemotron-3-super-120b-a12b:free");
    assert.equal(init.headers.Authorization, `Bearer ${K}`);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "pong" }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 1 } }) };
  };
  const r = await callOpenRouter({ messages: [{ role: "user", content: "ping" }], apiKey: K, fetchImpl, now: () => (ticks++ === 0 ? 1000 : 1450) });
  assert.equal(r.ok, true);
  assert.equal(r.text, "pong");
  assert.equal(r.durationMs, 450);
  assert.deepEqual(r.usage, { prompt_tokens: 3, completion_tokens: 1 });
});
test("callOpenRouter: HTTP error surfaces status + redacts body", async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => `rate limit; key ${LEAK}` });
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], apiKey: K, fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /HTTP 429/);
  assert.equal(r.error.includes("leak999"), false);
});
test("callOpenRouter: empty completion fails loud", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "length" }] }) });
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], apiKey: K, fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty completion/);
});
test("callOpenRouter: abort/timeout reported, never throws", async () => {
  // fetch that never resolves until the AbortController fires
  const fetchImpl = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => {
      const e = new Error("aborted"); e.name = "AbortError"; reject(e);
    });
  });
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], apiKey: K, fetchImpl, timeoutMs: 1000 });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out after 1000ms/);
});
test("callOpenRouter: invalid messages fails before network", async () => {
  let called = false;
  const r = await callOpenRouter({ messages: [], apiKey: K, fetchImpl: async () => { called = true; } });
  assert.equal(r.ok, false);
  assert.equal(called, false);
});
test("callOpenRouter: a registry KEY is resolved to its slug before the request (no 400 foot-gun)", async () => {
  let sentModel = null;
  const fetchImpl = async (_url, init) => {
    sentModel = JSON.parse(init.body).model;
    return { ok: true, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
  };
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], model: "nemotron-ultra-free", apiKey: K, fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(sentModel, "nvidia/nemotron-3-ultra-550b-a55b:free");  // KEY resolved to slug, not sent verbatim
  assert.equal(r.model, "nvidia/nemotron-3-ultra-550b-a55b:free");
});
test("callOpenRouter: the in-scope key is scrubbed from an HTTP-error body even if raw/echoed", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => `unauthorized: ${K} rejected` });
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], apiKey: K, fetchImpl });
  assert.equal(r.ok, false);
  assert.equal(r.error.includes(K), false);  // literal key scrubbed, not just pattern-masked
});
test("callOpenRouter: a RAW-shaped key echoed in a 200 provider-error body is scrubbed (3-of-3 arm-C P1)", async () => {
  // a key that does NOT match the sk-/sk-or-/Bearer pattern -- only the literal scrub catches it
  const rawKey = "myrawprovisioningkey1234567890";
  const fetchImpl = async () => ({ ok: true, json: async () => ({ error: { message: `invalid auth ${rawKey}` } }) });
  const r = await callOpenRouter({ messages: [{ role: "user", content: "x" }], apiKey: rawKey, fetchImpl });
  assert.equal(r.ok, false);
  assert.equal(r.error.includes(rawKey), false);  // provider-error path now scrubs the in-scope key
});
