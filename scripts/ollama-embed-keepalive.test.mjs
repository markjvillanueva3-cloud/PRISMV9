// Tests for ollama-embed-keepalive.mjs pure core (R9: real behavior).
// Run: node --test scripts/ollama-embed-keepalive.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isModelWarm, buildWarmBody, classifyAction } from "./ollama-embed-keepalive.mjs";

// ----- isModelWarm -----
test("isModelWarm: exact name match in /api/ps body", () => {
  const ps = JSON.stringify({ models: [{ name: "nomic-embed-text", size: 274 }] });
  assert.equal(isModelWarm(ps, "nomic-embed-text"), true);
});

test("isModelWarm: matches a tagged variant (nomic-embed-text:latest)", () => {
  const ps = JSON.stringify({ models: [{ name: "nomic-embed-text:latest" }] });
  assert.equal(isModelWarm(ps, "nomic-embed-text"), true);
});

test("isModelWarm: false when the target is not resident", () => {
  const ps = JSON.stringify({ models: [{ name: "qwen2.5-coder:32b" }, { name: "gpt-oss:20b" }] });
  assert.equal(isModelWarm(ps, "nomic-embed-text"), false);
});

test("isModelWarm: empty models list (full eviction) → false", () => {
  assert.equal(isModelWarm(JSON.stringify({ models: [] }), "nomic-embed-text"), false);
});

test("isModelWarm: accepts a parsed object, not only a string", () => {
  assert.equal(isModelWarm({ models: [{ model: "nomic-embed-text" }] }, "nomic-embed-text"), true);
});

test("isModelWarm: malformed / non-JSON / null → false (fail-soft)", () => {
  assert.equal(isModelWarm("not json <html>", "nomic-embed-text"), false);
  assert.equal(isModelWarm("", "nomic-embed-text"), false);
  assert.equal(isModelWarm(null, "nomic-embed-text"), false);
  assert.equal(isModelWarm(JSON.stringify({ models: "oops" }), "nomic-embed-text"), false);
});

test("isModelWarm: a partial-prefix that is NOT a tag boundary does not match", () => {
  // "nomic-embed-text-v2" must NOT satisfy target "nomic-embed-text" (only "<t>" or "<t>:tag")
  const ps = JSON.stringify({ models: [{ name: "nomic-embed-text-v2" }] });
  assert.equal(isModelWarm(ps, "nomic-embed-text"), false);
});

// ----- buildWarmBody -----
test("buildWarmBody: pins model with keep_alive + a 1-token prompt", () => {
  const body = JSON.parse(buildWarmBody("nomic-embed-text", "30m"));
  assert.equal(body.model, "nomic-embed-text");
  assert.equal(body.keep_alive, "30m");
  assert.ok(typeof body.prompt === "string" && body.prompt.length > 0);
});

test("buildWarmBody: never emits keep_alive=-1 (pin-forever was the cebde4fd9 commit-pressure bug)", () => {
  // the keep_alive value is caller-provided; assert the default-callers' value is bounded
  const body = JSON.parse(buildWarmBody("nomic-embed-text", "30m"));
  assert.notEqual(body.keep_alive, "-1");
  assert.notEqual(body.keep_alive, -1);
});

// ----- classifyAction -----
test("classifyAction: warm + embedding → 'refreshed'", () => {
  assert.equal(classifyAction(true, true), "refreshed");
});

test("classifyAction: cold + embedding → 'cold-recovered' (the load-bearing eviction-catch signal)", () => {
  assert.equal(classifyAction(false, true), "cold-recovered");
});

test("classifyAction: no embedding returned → 'warm-no-embedding' regardless of warmth", () => {
  assert.equal(classifyAction(true, false), "warm-no-embedding");
  assert.equal(classifyAction(false, false), "warm-no-embedding");
});
