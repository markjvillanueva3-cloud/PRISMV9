// Tests for stress-frontier-report.mjs (U-ALPHA-OLLAMA-STRESS-FRONTIER, slot:alpha 2026-06-25).
// R9: real fixtures encoding the merge's load-bearing invariants -- the load-failed exclusion
// (the guard that stopped the all-0% gpt-oss:120b/deepseek-r1:32b from poisoning the frontier),
// cheapest-by-cost frontier selection, NONE-local detection, and the per-model ceiling count.
// Run: node scripts/stress-frontier-report.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeFrontier, renderReport } from "./stress-frontier-report.mjs";

// One per-model report in the ollama-stress-expanded-run --json shape.
const mk = (model, taskRates) => ({
  models: [model],
  perTask: Object.entries(taskRates).map(([task, passRate]) => ({
    task, category: "cat", perModel: [{ model, passRate }],
  })),
});

test("LOAD-FAILED exclusion: an all-0% model is excluded from the frontier, reported separately", () => {
  const reports = [
    mk("qwen2.5-coder:1.5b", { a: 1.0, b: 0.5 }),
    mk("qwen2.5-coder:7b", { a: 1.0, b: 1.0 }),
    mk("gpt-oss:120b", { a: 0, b: 0 }), // never loaded -> all 0% -> load-failed
  ];
  const m = mergeFrontier(reports);
  assert.deepEqual(m.loadFailed, ["gpt-oss:120b"]);
  assert.ok(!m.models.includes("gpt-oss:120b"), "load-failed model must not be in valid models");
  // and it must NOT win any frontier pick despite being 'present'
  for (const f of Object.values(m.taskFrontier)) assert.notEqual(f.cheapest100, "gpt-oss:120b");
});

test("a model that is merely WEAK (some >0%, never 100%) is NOT load-failed -- it is kept (deepseek-r1:14b case)", () => {
  // deepseek-r1:14b got partial credit on tasks but never 100% -> valid-but-low, not excluded.
  const reports = [
    mk("qwen2.5-coder:7b", { a: 1.0, b: 1.0 }),
    mk("deepseek-r1:14b", { a: 0.5, b: 0.17 }), // weak, never 100%, but >0% somewhere
  ];
  const m = mergeFrontier(reports);
  assert.deepEqual(m.loadFailed, [], "a >0% model is not load-failed");
  assert.ok(m.models.includes("deepseek-r1:14b"));
  assert.equal(m.modelCeiling["deepseek-r1:14b"].count, 0, "weak model clears 0 tasks at 100%");
});

test("cheapest-by-cost frontier: among 100% models the smallest param wins", () => {
  const reports = [
    mk("qwen2.5-coder:32b", { hard: 1.0, easy: 1.0 }),
    mk("qwen2.5-coder:1.5b", { hard: 0.3, easy: 1.0 }),
    mk("qwen2.5-coder:7b", { hard: 1.0, easy: 1.0 }),
  ];
  const m = mergeFrontier(reports);
  assert.equal(m.taskFrontier.easy.cheapest100, "qwen2.5-coder:1.5b"); // all pass -> cheapest
  assert.equal(m.taskFrontier.hard.cheapest100, "qwen2.5-coder:7b");   // 1.5b fails -> next cheapest proven
});

test("NONE-local: a task no valid model clears at 100% -> cheapest100 null (route to Claude/RAG)", () => {
  const reports = [
    mk("qwen2.5-coder:7b", { iso: 0.17 }),
    mk("qwen2.5-coder:32b", { iso: 0.17 }),
  ];
  const m = mergeFrontier(reports);
  assert.equal(m.taskFrontier.iso.cheapest100, null);
  assert.deepEqual(m.taskFrontier.iso.passingModels, []);
});

test("full model tags are preserved -- deepseek-r1:14b and qwen2.5-coder:14b do NOT collide", () => {
  const reports = [
    mk("qwen2.5-coder:14b", { x: 1.0 }),
    mk("deepseek-r1:14b", { x: 0.2 }),
  ];
  const m = mergeFrontier(reports);
  // both present, distinct
  assert.ok(m.models.includes("qwen2.5-coder:14b"));
  assert.ok(m.models.includes("deepseek-r1:14b"));
  // the coder (100%) wins the frontier, not the reasoner -- but a same-rank tie must resolve to a 100% one
  assert.equal(m.taskFrontier.x.cheapest100, "qwen2.5-coder:14b");
});

test("per-model ceiling counts tasks-cleared-at-100% over measured", () => {
  const reports = [
    mk("qwen2.5-coder:7b", { a: 1.0, b: 1.0, c: 0.5 }),
  ];
  const m = mergeFrontier(reports);
  assert.equal(m.modelCeiling["qwen2.5-coder:7b"].count, 2);
  assert.equal(m.modelCeiling["qwen2.5-coder:7b"].totalMeasured, 3);
});

test("adversarial: empty / null / malformed input -> no throw, empty result", () => {
  assert.doesNotThrow(() => {
    const a = mergeFrontier(null);
    assert.deepEqual(a.models, []);
    assert.deepEqual(a.loadFailed, []);
    const b = mergeFrontier([]);
    assert.deepEqual(b.models, []);
    const c = mergeFrontier([{ models: [], perTask: null }, { foo: 1 }]);
    assert.deepEqual(c.models, []);
  });
});

test("renderReport produces ASCII markdown with the load-failed note + NONE-local marker", () => {
  const reports = [
    mk("qwen2.5-coder:1.5b", { easy: 1.0, hard: 0.2 }),
    mk("gpt-oss:120b", { easy: 0, hard: 0 }),
  ];
  const md = renderReport(mergeFrontier(reports), { generatedAt: "TEST" });
  assert.match(md, /load-failed/);
  assert.match(md, /gpt-oss:120b/);          // named in the excluded line
  assert.match(md, /NONE-local/);            // 'hard' has no 100% model
  // ASCII-only output: build the forbidden smart-punctuation set from codepoints so THIS source
  // stays ASCII (em/en dash, curly single/double quotes -- the chars the ascii-guard rejects).
  const forbidden = [0x2014, 0x2013, 0x2018, 0x2019, 0x201c, 0x201d].map((c) => String.fromCharCode(c));
  for (const ch of forbidden) assert.ok(!md.includes(ch), `report must not contain U+${ch.charCodeAt(0).toString(16)}`);
});
