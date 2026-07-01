// U-PSN-WEBSEARCH-SUMMARIZE (gap-B5, 2026-05-23, slot:alpha)
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWebSearchNudge } from "../posttool-websearch-summarize-nudge.mjs";

test("formatWebSearchNudge: WebSearch with query emits nudge", () => {
  const n = formatWebSearchNudge("WebSearch", "latest react docs");
  assert.ok(n !== null);
  assert.ok(n.includes("prism_dev:ollama_hook_query"));
  assert.ok(n.includes("latest react docs"));
});

test("formatWebSearchNudge: long query truncated in preview", () => {
  const long = "a".repeat(200);
  const n = formatWebSearchNudge("WebSearch", long);
  assert.ok(n !== null);
  assert.ok(n.includes("..."));
  assert.ok(!n.includes("a".repeat(150)));
});

test("formatWebSearchNudge: non-WebSearch tool → null", () => {
  assert.equal(formatWebSearchNudge("Read", "x"), null);
  assert.equal(formatWebSearchNudge("Bash", "x"), null);
  assert.equal(formatWebSearchNudge("WebFetch", "x"), null);
});

test("formatWebSearchNudge: empty query → null", () => {
  assert.equal(formatWebSearchNudge("WebSearch", ""), null);
  assert.equal(formatWebSearchNudge("WebSearch", null), null);
  assert.equal(formatWebSearchNudge("WebSearch", undefined), null);
});

test("formatWebSearchNudge: whitespace-only query → null", () => {
  assert.equal(formatWebSearchNudge("WebSearch", "   "), null);
});

test("formatWebSearchNudge: includes /ollama-bridge fallback", () => {
  const n = formatWebSearchNudge("WebSearch", "test query");
  assert.ok(n.includes("/ollama-bridge"));
});

test("formatWebSearchNudge: includes kill-switch", () => {
  const n = formatWebSearchNudge("WebSearch", "x");
  assert.ok(n.includes("PRISM_WEBSEARCH_SUMMARIZE_DISABLE"));
});

test("formatWebSearchNudge: hookType is 'general' (verified real action)", () => {
  // Per iter5 R12 fix audit, prism_dev:ollama_hook_query accepts hookType
  // 'general' as a valid enum value. NOT prism_intelligence:* (fake namespace).
  const n = formatWebSearchNudge("WebSearch", "x");
  assert.ok(n.includes("general"));
  assert.ok(!n.includes("prism_intelligence"));
});
