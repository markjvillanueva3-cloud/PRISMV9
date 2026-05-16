import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody } from "../ollama-hook-bridge.mjs";

test("format forwarded when provided", () => {
  const b = buildRequestBody("p", { format: "json", maxTokens: 300, temperature: 0.2 });
  assert.equal(b.format, "json");
  assert.equal(b.options.num_predict, 300);
  assert.equal(b.options.temperature, 0.2);
});

test("format absent by default (backward compatible)", () => {
  const b = buildRequestBody("p", {});
  assert.equal("format" in b, false);
});

test("prompt is set in body", () => {
  assert.equal(buildRequestBody("hello", {}).prompt, "hello");
});
