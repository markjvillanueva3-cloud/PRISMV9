#!/usr/bin/env node
// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
// is side-effect-free (isMain is false under the test runner, so main() never
// runs and no network call is made).
// Run: node --test scripts/ask-hermes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  systemPromptFor,
  buildChatBody,
  parseChatResponse,
  shouldFallback,
  parseArgs,
} from "./ask-hermes.mjs";

// --- systemPromptFor ---
test("systemPromptFor: each mode yields a distinct non-empty prompt", () => {
  const modes = ["ask", "summarize", "explain", "triage", "classify"];
  const seen = new Set();
  for (const m of modes) {
    const p = systemPromptFor(m);
    assert.equal(typeof p, "string");
    assert.ok(p.length > 0, `${m} prompt empty`);
    seen.add(p);
  }
  assert.equal(seen.size, modes.length, "prompts should be distinct per mode");
});

test("systemPromptFor: unknown mode falls back to the ask prompt", () => {
  assert.equal(systemPromptFor("bogus"), systemPromptFor("ask"));
});

// --- buildChatBody ---
test("buildChatBody: builds a valid OpenAI chat body (system+user, no stream)", () => {
  const b = buildChatBody({ mode: "ask", input: "hello", model: "grok-x", maxTokens: 50 });
  assert.equal(b.model, "grok-x");
  assert.equal(b.stream, false);
  assert.equal(b.max_tokens, 50);
  assert.equal(b.messages.length, 2);
  assert.equal(b.messages[0].role, "system");
  assert.equal(b.messages[1].role, "user");
  assert.equal(b.messages[1].content, "hello");
});

test("buildChatBody: non-positive/NaN maxTokens falls back to 1024", () => {
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m", maxTokens: 0 }).max_tokens, 1024);
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m", maxTokens: NaN }).max_tokens, 1024);
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m" }).max_tokens, 1024);
});

test("buildChatBody: null input coerces to empty string (no crash)", () => {
  const b = buildChatBody({ mode: "ask", input: null, model: "m" });
  assert.equal(b.messages[1].content, "");
});

// --- parseChatResponse ---
test("parseChatResponse: happy path returns the assistant text", () => {
  const r = parseChatResponse({ choices: [{ message: { content: "PRISM_OK" }, finish_reason: "stop" }] });
  assert.deepEqual(r, { ok: true, content: "PRISM_OK" });
});

test("parseChatResponse: upstream error envelope -> ok:false with message", () => {
  const r = parseChatResponse({ error: { message: "extra usage required", type: "invalid_request_error" } });
  assert.equal(r.ok, false);
  assert.match(r.error, /extra usage required/);
});

test("parseChatResponse: string error field -> ok:false", () => {
  const r = parseChatResponse({ error: "boom" });
  assert.equal(r.ok, false);
  assert.match(r.error, /boom/);
});

test("parseChatResponse: refusal stop_reason -> ok:false", () => {
  const r = parseChatResponse({ choices: [{ finish_reason: "refusal", message: { refusal: "declined" } }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /declined|refus/i);
});

test("parseChatResponse: empty choices -> ok:false", () => {
  assert.equal(parseChatResponse({ choices: [] }).ok, false);
});

test("parseChatResponse: missing/empty content -> ok:false", () => {
  assert.equal(parseChatResponse({ choices: [{ message: { content: "" } }] }).ok, false);
  assert.equal(parseChatResponse({ choices: [{ message: {} }] }).ok, false);
});

test("parseChatResponse: non-object / null -> ok:false", () => {
  assert.equal(parseChatResponse(null).ok, false);
  assert.equal(parseChatResponse(42).ok, false);
  assert.equal(parseChatResponse(undefined).ok, false);
});

// --- shouldFallback ---
test("shouldFallback: network/timeout/http all permit fallback (token economy)", () => {
  assert.equal(shouldFallback({ kind: "network" }), true);
  assert.equal(shouldFallback({ kind: "timeout" }), true);
  assert.equal(shouldFallback({ kind: "http", status: 400 }), true);
  assert.equal(shouldFallback({ kind: "http", status: 500 }), true);
});

test("shouldFallback: undefined descriptor still returns a boolean (no crash)", () => {
  assert.equal(typeof shouldFallback(undefined), "boolean");
  assert.equal(typeof shouldFallback({}), "boolean");
});

// --- parseArgs ---
test("parseArgs: ask mode with literal question", () => {
  const a = parseArgs(["ask", "what", "is", "2+2"]);
  assert.equal(a.error, null);
  assert.equal(a.mode, "ask");
  assert.equal(a.rawInput, "what is 2+2");
  assert.equal(a.fallback, true);
  assert.equal(a.json, false);
});

test("parseArgs: flags parse (model/json/no-fallback/timeout/max-tokens/url)", () => {
  const a = parseArgs(["summarize", "file.txt", "--model", "grok-y", "--json", "--no-fallback", "--timeout", "5000", "--max-tokens", "256", "--url", "http://x/v1"]);
  assert.equal(a.mode, "summarize");
  assert.equal(a.rawInput, "file.txt");
  assert.equal(a.model, "grok-y");
  assert.equal(a.json, true);
  assert.equal(a.fallback, false);
  assert.equal(a.timeout, 5000);
  assert.equal(a.maxTokens, 256);
  assert.equal(a.url, "http://x/v1");
});

test("parseArgs: missing mode -> error", () => {
  assert.match(parseArgs([]).error, /mode must be one of/);
});

test("parseArgs: invalid mode -> error", () => {
  assert.match(parseArgs(["frobnicate", "x"]).error, /mode must be one of/);
});

test("parseArgs: unknown flag -> error", () => {
  assert.match(parseArgs(["ask", "--bogus"]).error, /unknown flag/);
});

test("parseArgs: bad numeric flag values fall back to defaults", () => {
  const a = parseArgs(["ask", "q", "--timeout", "abc", "--max-tokens", "xyz"]);
  assert.equal(a.timeout, 120000);
  assert.equal(a.maxTokens, 1024);
});
