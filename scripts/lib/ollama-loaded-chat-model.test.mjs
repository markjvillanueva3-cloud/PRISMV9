/**
 * ollama-loaded-chat-model.test.mjs -- reference-value oracle for the loaded-chat-model picker
 * (slot:alpha 2026-06-19). Reference values are the REAL 17-model install set on the live
 * Blackwell host (`/api/tags` 2026-06-19), so a wrong family/vision regex is caught against
 * actual names, not invented ones.
 *
 * node:test.  Run: node H:/prism/scripts/lib/ollama-loaded-chat-model.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isChatCapable, pickLoadedChatModel } from "./ollama-loaded-chat-model.mjs";

// The live install set, split by ground truth.
const TEXT_MODELS = [
  "deepseek-r1:32b", "qwen3-coder:30b", "qwen2.5-coder:1.5b", "gpt-oss:120b", "gpt-oss:20b",
  "qwen2.5-coder:14b", "deepseek-r1:14b", "qwen2.5-coder:32b", "qwen2.5-coder:7b",
];
const NON_CHAT_MODELS = [
  "qwen3-vl:32b", "qwen2.5vl:7b", "qwen3-vl:8b-instruct", "qwen2.5vl:32b", "qwen3-vl:8b",
  "moondream:1.8b", "llama3.2-vision:11b", "nomic-embed-text:latest",
];
const PREFERENCE = ["qwen2.5-coder:32b", "qwen2.5-coder:1.5b", "llama3.1:70b"];

test("isChatCapable: every real text-gen model is chat-capable (gpt-oss + deepseek recognized)", () => {
  for (const m of TEXT_MODELS) assert.equal(isChatCapable(m), true, `${m} must be chat-capable`);
});

test("isChatCapable: every vision/embed model is NOT chat-capable (qwen2.5vl/llama-vision excluded despite family token)", () => {
  for (const m of NON_CHAT_MODELS) assert.equal(isChatCapable(m), false, `${m} must NOT be chat-capable`);
});

test("isChatCapable: codestral (Mistral coder) is recognized; a hypothetical vision variant is still excluded (precedence)", () => {
  assert.equal(isChatCapable("codestral:22b"), true);
  // NON_CHAT_RE precedence: even a chat-family name with a vision marker is excluded
  assert.equal(isChatCapable("dolphin-vision:7b"), false);
  assert.equal(isChatCapable("llava:13b"), false);
});

test("isChatCapable: empty / null / undefined -> false", () => {
  assert.equal(isChatCapable(""), false);
  assert.equal(isChatCapable(null), false);
  assert.equal(isChatCapable(undefined), false);
});

test("pickLoadedChatModel: LIVE BUG -- gpt-oss loaded (no coder loaded) -> gpt-oss, was null", () => {
  // the exact /api/ps state observed 2026-06-19 that made the rewriter report no-model
  const loaded = ["gpt-oss:120b", "qwen2.5vl:7b", "qwen3-vl:8b-instruct"];
  assert.equal(pickLoadedChatModel(loaded, PREFERENCE), "gpt-oss:120b");
});

test("pickLoadedChatModel: a loaded preference wins over a loaded non-preferred chat model", () => {
  assert.equal(pickLoadedChatModel(["gpt-oss:120b", "qwen2.5-coder:32b"], PREFERENCE), "qwen2.5-coder:32b");
});

test("pickLoadedChatModel: deepseek recognized as the fallback chat model", () => {
  assert.equal(pickLoadedChatModel(["deepseek-r1:32b"], PREFERENCE), "deepseek-r1:32b");
});

test("pickLoadedChatModel: only vision+embed loaded -> null (old code WRONGLY returned the vision model)", () => {
  assert.equal(pickLoadedChatModel(["qwen2.5vl:7b", "nomic-embed-text:latest"], PREFERENCE), null);
});

test("pickLoadedChatModel: a single loaded vision model -> null (adversarial: 'llama'/'qwen' token must not leak)", () => {
  assert.equal(pickLoadedChatModel(["llama3.2-vision:11b"], PREFERENCE), null);
  assert.equal(pickLoadedChatModel(["qwen3-vl:8b-instruct"], PREFERENCE), null);
});

test("pickLoadedChatModel: skips a vision model at index 0 to reach a loaded coder (scans all, not just [0])", () => {
  // old code tested only ps.models[0] -> would return the vision model qwen3-vl
  assert.equal(pickLoadedChatModel(["qwen3-vl:8b-instruct", "qwen2.5-coder:7b"], PREFERENCE), "qwen2.5-coder:7b");
});

test("pickLoadedChatModel: empty / non-array -> null", () => {
  assert.equal(pickLoadedChatModel([], PREFERENCE), null);
  assert.equal(pickLoadedChatModel(null, PREFERENCE), null);
  assert.equal(pickLoadedChatModel(undefined), null);
});

test("pickLoadedChatModel: preference not loaded, but a loaded chat model exists -> that loaded chat model", () => {
  assert.equal(pickLoadedChatModel(["gpt-oss:20b"], PREFERENCE), "gpt-oss:20b");
});

// ── strict option (U-ASK-OLLAMA-LOADED-FIRST) ────────────────────────────────
// strict:true is the quality-sensitive offload gate -- a loaded model is acceptable
// ONLY if it is in the caller's preference; otherwise return null so the caller can
// cold-load its best-installed pick instead of running on an arbitrary warm model.

test("strict:true -- a preference member loaded -> returned (no change vs non-strict for a hit)", () => {
  // PREFERENCE[0] = qwen2.5-coder:32b is a real preference member -> strict returns it.
  assert.equal(pickLoadedChatModel(["qwen2.5-coder:32b"], PREFERENCE, { strict: true }), "qwen2.5-coder:32b");
});

test("strict:true -- only a NON-preferred chat model loaded -> null (quality gate; fall through to resolver)", () => {
  // qwen2.5-coder:7b is chat-capable but NOT in PREFERENCE -> strict refuses it.
  assert.equal(pickLoadedChatModel(["qwen2.5-coder:7b"], PREFERENCE, { strict: true }), null);
});

test("strict:false (default) -- same non-preferred chat model loaded -> returned (any-loaded policy)", () => {
  // The contrast that proves strict is what changes behavior, not some other factor.
  assert.equal(pickLoadedChatModel(["qwen2.5-coder:7b"], PREFERENCE), "qwen2.5-coder:7b");
  assert.equal(pickLoadedChatModel(["qwen2.5-coder:7b"], PREFERENCE, { strict: false }), "qwen2.5-coder:7b");
});

test("strict:true -- still excludes vision even if (hypothetically) in a stray preference (exclusion-first holds)", () => {
  // A vision model is never returned regardless of strict, and a non-preferred vision
  // model under strict is doubly excluded.
  assert.equal(pickLoadedChatModel(["qwen3-vl:8b-instruct"], PREFERENCE, { strict: true }), null);
});

test("strict:true -- best PREFERRED warm model wins by order even when a lesser preferred one is also loaded", () => {
  // gpt-oss:120b precedes gpt-oss:20b in PREFERENCE order test below.
  const pref = ["gpt-oss:120b", "gpt-oss:20b"];
  assert.equal(pickLoadedChatModel(["gpt-oss:20b", "gpt-oss:120b"], pref, { strict: true }), "gpt-oss:120b");
});
