// Test -- generate-pdf-tribal-tips-hermes.mjs pure helpers (Hermes /learn tribal extraction).
// The model-call loop is impure (live Hermes/Ollama); these cover the deterministic
// parsing/selection that turns a node + a model reply into clean tribal tips.
// Run: node scripts/generate-pdf-tribal-tips-hermes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeText, buildUserPrompt, parseTips, worthExtracting } from "./generate-pdf-tribal-tips-hermes.mjs";

// ── nodeText ──
test("nodeText: reads .text, .content, or joins .pages[].text; empty on garbage", () => {
  assert.equal(nodeText({ text: "hello" }), "hello");
  assert.equal(nodeText({ content: "c" }), "c");
  assert.equal(nodeText({ pages: [{ text: "a" }, { text: "b" }] }), "a\nb");
  assert.equal(nodeText(null), "");
  assert.equal(nodeText({}), "");
  assert.equal(nodeText({ pages: [{}, null] }), "\n");
});

// ── buildUserPrompt ──
test("buildUserPrompt: includes domain + title + caps the text", () => {
  const p = buildUserPrompt({ domain: "cam", software: "hypermill", title: "Roughing", text: "X".repeat(20000) }, 8000);
  assert.match(p, /DOMAIN: cam\/hypermill/);
  assert.match(p, /TITLE: Roughing/);
  // 8000 text chars capped + the header, not the full 20000
  assert.ok(p.length < 8300, `expected capped (<8300), got ${p.length}`);
});
test("buildUserPrompt: falls back to relPath/source + generic domain when fields missing", () => {
  const p = buildUserPrompt({ relPath: "a/b.pdf", text: "t" });
  assert.match(p, /TITLE: a\/b\.pdf/);
  assert.match(p, /DOMAIN: manufacturing/);
});

// ── parseTips ──
test("parseTips: numbered list -> clean tip strings, numbering stripped", () => {
  const out = parseTips("1. Hold tolerance to plus or minus 0.03 inch.\n2. Use climb milling for the finish pass on aluminum.");
  assert.equal(out.length, 2);
  assert.equal(out[0], "Hold tolerance to plus or minus 0.03 inch.");
  assert.ok(out[1].startsWith("Use climb milling"));
});
test("parseTips: strips bullets/dashes too", () => {
  const out = parseTips("- First real machining tip here.\n* Second real machining tip here.");
  assert.equal(out.length, 2);
  assert.ok(!out[0].startsWith("-"));
});
test("parseTips: 'NONE' (no extractable knowledge) -> empty", () => {
  assert.deepEqual(parseTips("NONE"), []);
  assert.deepEqual(parseTips("  none  "), []);
});
test("parseTips: drops too-short lines + caps at 8", () => {
  const reply = ["short", ...Array.from({ length: 12 }, (_, i) => `${i + 1}. This is a sufficiently long tribal tip number ${i}.`)].join("\n");
  const out = parseTips(reply);
  assert.equal(out.length, 8);          // capped
  assert.ok(out.every((t) => t.length >= 12));
});
test("parseTips: tolerates non-string / empty (never throws)", () => {
  assert.deepEqual(parseTips(null), []);
  assert.deepEqual(parseTips(""), []);
  assert.deepEqual(parseTips(42), []);
});

// ── worthExtracting ──
test("worthExtracting: long text -> true, thin/empty -> false (skip license/UI pages)", () => {
  assert.equal(worthExtracting({ text: "x".repeat(500) }), true);
  assert.equal(worthExtracting({ text: "tiny" }), false);
  assert.equal(worthExtracting({}), false);
  assert.equal(worthExtracting(null), false);
});
