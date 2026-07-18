// tier: T4
// Tests for scripts/lib/ollama-ps-probe.mjs -- the shared sync Ollama liveness +
// resident-model probe (U-OLLAMA-PS-PROBE-DEDUP, slot:alpha 2026-06-20).
//
// node:test -- hermetic: spawnImpl is injected, so NO real curl/Ollama is touched.
// Run: node H:/prism/scripts/lib/ollama-ps-probe.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isOllamaUpSync,
  readWarmModelsSync,
  DEFAULT_OLLAMA_URL,
  DEFAULT_PROBE_TIMEOUT_SEC,
} from "./ollama-ps-probe.mjs";

// A spawnImpl that records the curl args it was called with and returns a canned result.
const spawnReturning = (result, sink) => (cmd, args, opts) => {
  if (sink) sink.push({ cmd, args, opts });
  return result;
};

// ── isOllamaUpSync ───────────────────────────────────────────────────────────

test("isOllamaUpSync: curl exit 0 -> up (true)", () => {
  assert.equal(isOllamaUpSync({ spawnImpl: spawnReturning({ status: 0, stdout: "{}" }) }), true);
});

test("isOllamaUpSync: curl non-zero exit -> down (false)", () => {
  assert.equal(isOllamaUpSync({ spawnImpl: spawnReturning({ status: 7, stdout: "" }) }), false);
});

test("isOllamaUpSync: spawn error (status null, e.g. curl missing) -> down (false)", () => {
  assert.equal(isOllamaUpSync({ spawnImpl: spawnReturning({ status: null, error: new Error("ENOENT") }) }), false);
});

test("isOllamaUpSync: spawnImpl throws -> down (false), never propagates", () => {
  assert.equal(isOllamaUpSync({ spawnImpl: () => { throw new Error("spawn blew up"); } }), false);
});

test("isOllamaUpSync: probes /api/tags with the timeout budget and url", () => {
  const calls = [];
  isOllamaUpSync({ spawnImpl: spawnReturning({ status: 0 }, calls), ollamaUrl: "http://h:9", timeoutSec: 4 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, "curl");
  assert.deepEqual(calls[0].args, ["-fsS", "-m", "4", "http://h:9/api/tags"]);
  assert.equal(calls[0].opts.timeout, 5000); // (timeoutSec + 1) * 1000 backstop
});

// ── readWarmModelsSync ───────────────────────────────────────────────────────

test("readWarmModelsSync: parses /api/ps models -> names (name field, model fallback)", () => {
  const stdout = JSON.stringify({ models: [{ name: "gpt-oss:120b" }, { model: "qwen2.5-coder:32b" }] });
  const r = readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout }) });
  assert.deepEqual(r, ["gpt-oss:120b", "qwen2.5-coder:32b"]);
});

test("readWarmModelsSync: name takes PRECEDENCE over model when an entry has BOTH (matches ask-ollama name||model)", () => {
  // Real /api/ps entries carry both `name` and `model`; `name` is canonical. This pins the
  // `name||model` order (a flip to `model||name` would return the wrong tag and fail here).
  const stdout = JSON.stringify({ models: [{ name: "qwen2.5-coder:32b", model: "qwen2.5-coder:32b-q4_K_M" }] });
  const r = readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout }) });
  assert.deepEqual(r, ["qwen2.5-coder:32b"]);
});

test("readWarmModelsSync: drops null entries and blank names (robust, does not throw)", () => {
  const stdout = JSON.stringify({ models: [{ name: "qwen3-coder:30b" }, null, { name: "" }, { foo: "bar" }] });
  const r = readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout }) });
  assert.deepEqual(r, ["qwen3-coder:30b"]); // null + blank + no-name entries filtered, the valid one survives
});

test("readWarmModelsSync: empty models array -> []", () => {
  const r = readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout: '{"models":[]}' }) });
  assert.deepEqual(r, []);
});

test("readWarmModelsSync: curl non-zero exit -> [] (fail-soft)", () => {
  assert.deepEqual(readWarmModelsSync({ spawnImpl: spawnReturning({ status: 1, stdout: "" }) }), []);
});

test("readWarmModelsSync: malformed JSON -> [] (fail-soft, never throws)", () => {
  assert.deepEqual(readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout: "not json{" }) }), []);
});

test("readWarmModelsSync: body without a models array -> []", () => {
  assert.deepEqual(readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout: '{"unexpected":true}' }) }), []);
});

test("readWarmModelsSync: spawnImpl throws -> [] (never propagates into the hook)", () => {
  assert.deepEqual(readWarmModelsSync({ spawnImpl: () => { throw new Error("boom"); } }), []);
});

test("readWarmModelsSync: probes /api/ps with the timeout budget and url", () => {
  const calls = [];
  readWarmModelsSync({ spawnImpl: spawnReturning({ status: 0, stdout: '{"models":[]}' }, calls), ollamaUrl: "http://x:1", timeoutSec: 2 });
  assert.deepEqual(calls[0].args, ["-fsS", "-m", "2", "http://x:1/api/ps"]);
  assert.equal(calls[0].opts.timeout, 3000);
});

// ── defaults match the consumer hooks' constants (no behavior drift on adoption) ──

test("defaults: DEFAULT_PROBE_TIMEOUT_SEC is 2 and DEFAULT_OLLAMA_URL points at the local daemon", () => {
  assert.equal(DEFAULT_PROBE_TIMEOUT_SEC, 2);
  assert.match(DEFAULT_OLLAMA_URL, /:11434$/); // 127.0.0.1:11434 unless OLLAMA_URL overrides
});
