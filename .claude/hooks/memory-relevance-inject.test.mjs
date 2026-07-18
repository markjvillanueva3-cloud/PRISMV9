#!/usr/bin/env node
/**
 * memory-relevance-inject.test.mjs — hermetic tests for the U-RAG-2
 * stage-2 lexical rerank wiring (RAG-UPGRADE-MS0).
 *
 * Focus: the exported `applyLexicalRerank` helper. The hook's `main()` reads
 * stdin + the auto-memory directory, so an end-to-end test isn't hermetic —
 * these cover the integration helper in isolation, which IS the unit
 * U-RAG-2 ships into this hook.
 *
 * Run: node --test .claude/hooks/memory-relevance-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLexicalRerank } from "./memory-relevance-inject.mjs";

test("applyLexicalRerank: non-array → []", () => {
  assert.deepEqual(applyLexicalRerank("q", null, 3), []);
  assert.deepEqual(applyLexicalRerank("q", undefined, 3), []);
  assert.deepEqual(applyLexicalRerank("q", "not-array", 3), []);
  assert.deepEqual(applyLexicalRerank("q", 42, 3), []);
});

test("applyLexicalRerank: empty list → []", () => {
  assert.deepEqual(applyLexicalRerank("q", [], 5), []);
});

test("applyLexicalRerank: single hit passes through (no rerank needed)", () => {
  const items = [
    { name: "feedback_foo.md", path: "/m/feedback_foo.md", score: 4, body: "# Foo\n\nbody text" },
  ];
  const out = applyLexicalRerank("anything", items, 3);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "feedback_foo.md");
  // single-hit short-circuit must NOT inject the synthesized scoring fields.
  assert.equal(out[0].text, undefined);
  assert.equal(out[0].label, undefined);
});

test("applyLexicalRerank: narrows to topK + strips synthesized text/label", () => {
  const items = [
    { name: "feedback_alpha_engine.md", path: "/m/feedback_alpha_engine.md", score: 9,
      body: "# Alpha Engine rule\n\nThe alpha engine must never be edited without a test." },
    { name: "reference_beta.md", path: "/m/reference_beta.md", score: 6,
      body: "# Beta\n\nBeta reference notes about something unrelated." },
    { name: "feedback_gamma.md", path: "/m/feedback_gamma.md", score: 3,
      body: "# Gamma\n\nGamma feedback paragraph." },
    { name: "project_delta.md", path: "/m/project_delta.md", score: 2,
      body: "# Delta\n\nDelta project status." },
    { name: "user_epsilon.md", path: "/m/user_epsilon.md", score: 1,
      body: "# Epsilon\n\nEpsilon user profile." },
  ];
  const out = applyLexicalRerank("alpha engine", items, 2);
  assert.equal(out.length, 2, "narrowed to topK");
  for (const h of out) {
    assert.equal(typeof h.name, "string");
    assert.equal(typeof h.path, "string");
    assert.equal(typeof h.score, "number");
    assert.equal(typeof h.body, "string");
    // The synthesized scoring inputs MUST be stripped — the renderer reads
    // `name`/`score`/`body` only; leaking `text`/`label` bloats the inject
    // and pollutes the hit shape.
    assert.equal(h.text, undefined, "synthesized `text` must be stripped");
    assert.equal(h.label, undefined, "synthesized `label` must be stripped");
  }
});

test("applyLexicalRerank: original `score` flows through unchanged (renderer shows it)", () => {
  // The renderer prints `(score: ${hit.score})` — the raw term-frequency
  // score, NOT a reranker-normalized value. The helper must not overwrite it.
  const items = [
    { name: "feedback_one.md", path: "/m/feedback_one.md", score: 12,
      body: "# One\n\nfirst memo body about widgets and gadgets" },
    { name: "feedback_two.md", path: "/m/feedback_two.md", score: 7,
      body: "# Two\n\nsecond memo body about widgets" },
  ];
  const out = applyLexicalRerank("widgets", items, 2);
  const scores = out.map((h) => h.score).sort((a, b) => a - b);
  assert.deepEqual(scores, [7, 12], "raw stage-1 scores preserved verbatim");
});

test("applyLexicalRerank: hits with missing `body` don't crash (fallback to empty)", () => {
  const items = [
    { name: "feedback_a.md", path: "/m/a.md", score: 5 },
    { name: "feedback_b.md", path: "/m/b.md", score: 4 },
  ];
  const out = applyLexicalRerank("test", items, 5);
  assert.ok(Array.isArray(out));
  assert.ok(out.length <= 2);
});

test("applyLexicalRerank: hit missing `name` doesn't crash (fallback to empty string)", () => {
  const items = [
    { path: "/m/x.md", score: 3, body: "# X\n\nx body" },
    { name: "reference_real.md", path: "/m/real.md", score: 2, body: "# Real\n\nreal body" },
  ];
  const out = applyLexicalRerank("test", items, 2);
  assert.ok(Array.isArray(out));
  for (const h of out) {
    // name may be absent on a malformed hit; the helper must not throw.
    assert.ok(h.name === undefined || typeof h.name === "string");
  }
});

test("applyLexicalRerank: topK=0 returns []", () => {
  const items = [
    { name: "a.md", score: 1, body: "# A\n\na" },
    { name: "b.md", score: 1, body: "# B\n\nb" },
  ];
  const out = applyLexicalRerank("q", items, 0);
  assert.deepEqual(out, []);
});
