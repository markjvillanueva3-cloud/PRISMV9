/**
 * Tests for hermes-escalation.mjs (HERMES-ESCALATION-LADDER-MS0). Real reference-value assertions.
 * Run: node scripts/lib/hermes-escalation.test.mjs
 * NOTE: test "keys" below are the literal string "present" -- placeholder truthy values, never real secrets.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveEscalationTarget, resolveNvidiaModel, isReasoningModel, resolveKey,
  buildChatBody, buildAnthropicBody, extractAnswer,
  CLAUDE_MODEL, NVIDIA_ENDPOINT, NVIDIA_MODELS, FRONTIER_PROVIDERS, VALID_TIERS,
} from "./hermes-escalation.mjs";

const PRESENT = "present"; // placeholder truthy key value for keyPresent assertions (NOT a secret)

test("claude tier: subscription lane, opus id WITHOUT the [1m] suffix, no key needed", () => {
  const t = resolveEscalationTarget("claude");
  assert.equal(t.error, undefined);
  assert.equal(t.backend, "claude-cli");
  assert.equal(t.model, "claude-opus-4-8");
  assert.ok(!t.model.includes("[1m]"), "the [1m] suffix breaks the headless claude path");
  assert.equal(t.keyEnv, undefined, "subscription lane needs no API key");
});

test("codex tier: ChatGPT-subscription CLI lane, no API key (OAuth via ~/.codex)", () => {
  const t = resolveEscalationTarget("codex");
  assert.equal(t.error, undefined);
  assert.equal(t.backend, "codex-cli");
  assert.equal(t.model, "gpt-5.5");
  assert.equal(t.keyEnv, undefined, "codex uses ChatGPT-account OAuth, not an API key");
  assert.match(t.note, /ChatGPT subscription/);
});

test("nvidia tier: real endpoint + REAL vetted model + reads NVIDIA_API_KEY", () => {
  const t = resolveEscalationTarget("nvidia", { env: { NVIDIA_API_KEY: PRESENT } });
  assert.equal(t.error, undefined);
  assert.equal(t.backend, "http");
  assert.equal(t.wire, "openai");
  assert.equal(t.endpoint, NVIDIA_ENDPOINT);
  assert.equal(t.model, "qwen/qwen3-next-80b-a3b-instruct"); // confirmed live 2026-06-30, NOT fabricated
  assert.equal(t.keyEnv, "NVIDIA_API_KEY");
  assert.equal(t.keyPresent, true);
});

test("nvidia tier: missing key -> graceful {error}, NOT a throw", () => {
  const t = resolveEscalationTarget("nvidia", { env: {} });
  assert.equal(t.keyPresent, false);
  assert.match(t.error, /NVIDIA_API_KEY not set/);
  // still returns the resolved target so the caller can report precisely
  assert.equal(t.model, "qwen/qwen3-next-80b-a3b-instruct");
});

test("nvidia tier: alias resolution (heavy -> real 675B id) + raw id passthrough", () => {
  const heavy = resolveEscalationTarget("nvidia", { env: { NVIDIA_API_KEY: PRESENT }, model: "heavy" });
  assert.equal(heavy.model, "mistralai/mistral-large-3-675b-instruct-2512");
  const raw = resolveEscalationTarget("nvidia", { env: { NVIDIA_API_KEY: PRESENT }, model: "meta/llama-3.1-70b-instruct" });
  assert.equal(raw.model, "meta/llama-3.1-70b-instruct");
  assert.equal(resolveNvidiaModel("default"), "qwen/qwen3-next-80b-a3b-instruct");
  assert.equal(resolveNvidiaModel(undefined), "qwen/qwen3-next-80b-a3b-instruct");
});

test("frontier tier: resolves provider registry + reads that provider's key env", () => {
  const anth = resolveEscalationTarget("frontier", { provider: "anthropic", env: { ANTHROPIC_API_KEY: PRESENT } });
  assert.equal(anth.error, undefined);
  assert.equal(anth.wire, "anthropic");
  assert.equal(anth.endpoint, "https://api.anthropic.com/v1/messages");
  assert.equal(anth.keyEnv, "ANTHROPIC_API_KEY");
  assert.equal(anth.headerName, "x-api-key");
  assert.equal(anth.extraHeaders["anthropic-version"], "2023-06-01");
  assert.equal(anth.keyPresent, true);

  const oai = resolveEscalationTarget("frontier", { provider: "openai", env: { OPENAI_API_KEY: PRESENT } });
  assert.equal(oai.wire, "openai");
  assert.equal(oai.headerName, "authorization");
  assert.equal(oai.keyPresent, true);
});

test("frontier tier: unknown/absent provider -> graceful {error} naming the env var to set", () => {
  const none = resolveEscalationTarget("frontier", { env: {} });
  assert.match(none.error, /PRISM_HERMES_FRONTIER_PROVIDER/);
  const bad = resolveEscalationTarget("frontier", { provider: "bogus", env: {} });
  assert.match(bad.error, /frontier provider not configured/);
  // provider set but key missing -> different, precise error
  const noKey = resolveEscalationTarget("frontier", { provider: "openai", env: {} });
  assert.equal(noKey.keyPresent, false);
  assert.match(noKey.error, /OPENAI_API_KEY not set/);
});

test("frontier tier: a reasoning-model OVERRIDE is flagged (symmetry with nvidia tier)", () => {
  const r = resolveEscalationTarget("frontier", { provider: "openai", model: "o3-mini", env: { OPENAI_API_KEY: PRESENT } });
  assert.match(r.note, /reasoning model/);
  // a normal instruct override is NOT flagged
  const ok = resolveEscalationTarget("frontier", { provider: "openai", model: "gpt-5.5", env: { OPENAI_API_KEY: PRESENT } });
  assert.equal(ok.note, undefined);
});

test("unknown tier -> {error}, never throws", () => {
  assert.match(resolveEscalationTarget("grok").error, /unknown tier 'grok'/);
  assert.match(resolveEscalationTarget("").error, /unknown tier/);
  assert.match(resolveEscalationTarget(undefined).error, /unknown tier/);
});

test("SAFETY: every default/aliased NVIDIA model is NON-reasoning (clean tool output)", () => {
  for (const [alias, id] of Object.entries(NVIDIA_MODELS)) {
    assert.ok(!isReasoningModel(id), `NVIDIA alias ${alias} -> ${id} must not be a reasoning model`);
  }
  assert.equal(isReasoningModel("qwen/qwen3-next-80b-a3b-instruct"), false);
});

test("isReasoningModel: flags the hang-prone families", () => {
  assert.equal(isReasoningModel("deepseek-ai/deepseek-r1"), true);
  assert.equal(isReasoningModel("qwen/qwq-32b"), true);
  assert.equal(isReasoningModel("nvidia/llama-3.1-nemotron-ultra-253b-reasoning"), true);
  assert.equal(isReasoningModel("some-reasoner"), true);
  assert.equal(isReasoningModel(""), false);
  assert.equal(isReasoningModel(null), false);
  // the INSTRUCT nemotron is NOT flagged (it's a normal instruct model)
  assert.equal(isReasoningModel("nvidia/llama-3.1-nemotron-70b-instruct"), false);
});

test("resolveKey: reads present key, null on absent/blank, never coerces junk", () => {
  assert.equal(resolveKey("K", { K: "abc" }), "abc");
  assert.equal(resolveKey("K", { K: "  " }), null);
  assert.equal(resolveKey("K", {}), null);
  assert.equal(resolveKey(undefined, { K: "abc" }), null);
});

test("buildChatBody: OpenAI-compatible shape (NVIDIA/OpenAI) with a single user turn", () => {
  const b = buildChatBody("m", "hello", { maxTokens: 100 });
  assert.equal(b.model, "m");
  assert.equal(b.stream, false);
  assert.equal(b.max_tokens, 100);
  assert.deepEqual(b.messages, [{ role: "user", content: "hello" }]);
  // non-string prompt coerced (no throw)
  assert.equal(buildChatBody("m", 123).messages[0].content, "123");
});

test("buildAnthropicBody: Messages API shape (max_tokens required by Anthropic)", () => {
  const b = buildAnthropicBody("claude-sonnet-5", "hi", { maxTokens: 50 });
  assert.equal(b.model, "claude-sonnet-5");
  assert.equal(b.max_tokens, 50);
  assert.deepEqual(b.messages, [{ role: "user", content: "hi" }]);
});

test("extractAnswer: per-wire parsing (openai/anthropic/gemini) + safe on garbage", () => {
  assert.equal(extractAnswer("openai", { choices: [{ message: { content: " hi " } }] }), "hi");
  assert.equal(extractAnswer("anthropic", { content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }), "ab");
  assert.equal(extractAnswer("gemini", { candidates: [{ content: { parts: [{ text: "g" }] } }] }), "g");
  assert.equal(extractAnswer("openai", null), "");
  assert.equal(extractAnswer("openai", {}), "");
  assert.equal(extractAnswer("anthropic", { content: "notarray" }), "");
});

test("registry invariants: tiers + frontier providers well-formed", () => {
  assert.deepEqual(VALID_TIERS, ["claude", "codex", "nvidia", "frontier"]);
  assert.equal(CLAUDE_MODEL, "claude-opus-4-8");
  for (const [name, p] of Object.entries(FRONTIER_PROVIDERS)) {
    assert.ok(p.endpoint && p.model && p.keyEnv && p.wire, `frontier ${name} complete`);
    assert.match(p.endpoint, /^https:\/\//, `frontier ${name} endpoint is https`);
  }
});
