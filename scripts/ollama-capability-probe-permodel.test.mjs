// Tests for ollama-capability-probe-permodel.mjs (U-ALPHA-OLLAMA-PROBE-PERMODEL, slot:alpha 2026-06-25).
// R9: the merge must (a) union every child's single-model matrix into one, (b) treat a model whose
// child FAILED (no report) as UNMEASURED -- contributing NO cell, never a false-0 -- which is the
// whole point of the per-model isolation (one bad model can't zero the rest). runOneModel is tested
// with an injected spawn so no real child process / Ollama is needed.
// Run: node scripts/ollama-capability-probe-permodel.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeProbeMatrices, runOneModel } from "./ollama-capability-probe-permodel.mjs";

// A single-model probe report (the shape ollama-capability-probe.mjs --json emits for one model).
const rep = (model, taskRates) => ({
  models: [model],
  matrix: Object.fromEntries(Object.entries(taskRates).map(([tid, rate]) => [
    tid, { category: "c", models: { [model]: { pass: Math.round(rate * 3), total: 3, rate } } },
  ])),
});

test("mergeProbeMatrices unions per-model reports into one matrix keyed by task", () => {
  const merged = mergeProbeMatrices([
    rep("qwen2.5-coder:7b", { classify: 1.0, extract: 1.0 }),
    rep("gpt-oss:20b", { classify: 1.0, extract: 0.5 }),
  ]);
  assert.deepEqual(merged.models.sort(), ["gpt-oss:20b", "qwen2.5-coder:7b"]);
  // both models' cells present under each task
  assert.equal(merged.matrix.classify.models["qwen2.5-coder:7b"].rate, 1.0);
  assert.equal(merged.matrix.classify.models["gpt-oss:20b"].rate, 1.0);
  assert.equal(merged.matrix.extract.models["gpt-oss:20b"].rate, 0.5);
});

test("a FAILED child (null report, filtered out by the caller) contributes NO cell -- unmeasured, not false-0", () => {
  // the caller passes only successful reports; a model whose child crashed is simply absent.
  // This is the isolation guarantee: gpt-oss:20b failing does NOT zero qwen2.5-coder:7b.
  const merged = mergeProbeMatrices([
    rep("qwen2.5-coder:7b", { classify: 1.0 }),
    // gpt-oss:20b's child failed -> not in the list at all
  ]);
  assert.deepEqual(merged.models, ["qwen2.5-coder:7b"]);
  assert.ok(!("gpt-oss:20b" in merged.matrix.classify.models), "a failed-child model must contribute NO cell (not a 0)");
});

test("mergeProbeMatrices de-dupes a model that somehow appears twice (first wins)", () => {
  const merged = mergeProbeMatrices([
    rep("qwen2.5-coder:7b", { a: 1.0 }),
    rep("qwen2.5-coder:7b", { a: 0.0 }), // duplicate -> ignored
  ]);
  assert.deepEqual(merged.models, ["qwen2.5-coder:7b"]);
  assert.equal(merged.matrix.a.models["qwen2.5-coder:7b"].rate, 1.0, "first report wins");
});

test("mergeProbeMatrices skips a malformed report (no matrix / no models) without throwing", () => {
  const merged = mergeProbeMatrices([
    rep("qwen2.5-coder:7b", { a: 1.0 }),
    { models: ["x:7b"] },              // no matrix
    { matrix: { a: { models: {} } } }, // no models[0]
    null,
  ]);
  assert.deepEqual(merged.models, ["qwen2.5-coder:7b"]);
});

test("mergeProbeMatrices: empty / null input -> empty result, no throw", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(mergeProbeMatrices(null).models, []);
    assert.deepEqual(mergeProbeMatrices([]).models, []);
  });
});

test("runOneModel returns the parsed report on a clean child (status 0 + JSON stdout)", () => {
  const fakeReport = rep("gpt-oss:20b", { classify: 1.0 });
  const spawnImpl = () => ({ status: 0, stdout: JSON.stringify(fakeReport) });
  const r = runOneModel("gpt-oss:20b", { spawnImpl });
  assert.deepEqual(r.models, ["gpt-oss:20b"]);
});

test("runOneModel returns null on a non-zero exit (crash) -> the model is treated as unmeasured", () => {
  const spawnImpl = () => ({ status: 1, stdout: "" });
  assert.equal(runOneModel("gpt-oss:120b", { spawnImpl }), null);
});

test("runOneModel returns null on bad JSON stdout (does not throw)", () => {
  const spawnImpl = () => ({ status: 0, stdout: "not json {{{" });
  assert.equal(runOneModel("x:7b", { spawnImpl }), null);
});

test("runOneModel returns null when spawn yields no result object", () => {
  assert.equal(runOneModel("x:7b", { spawnImpl: () => null }), null);
});

// The child-exclusion aggregation is in main()'s flow, but its PURE core is the union expression
// reports.flatMap(r => r.excludedNoSignal). Test that shape directly so the R12 transparency
// (a child-self-excluded reasoner is surfaced, not vanished) is pinned without spawning a process.
test("child excludedNoSignal aggregation: a reasoner self-excluded by its child IS surfaced (R12)", () => {
  // deepseek-r1:14b's child scored it all-0 -> the child's OWN excludeNoSignalModels emitted
  // models:[] + excludedNoSignal:["deepseek-r1:14b"]. mergeProbeMatrices skips the empty-models
  // report (no cell), so without aggregation r1 would VANISH. The union recovers it.
  const reports = [
    rep("qwen2.5-coder:7b", { a: 1.0 }),
    { models: [], matrix: {}, excludedNoSignal: ["deepseek-r1:14b"] }, // child self-excluded its only model
    { models: [], matrix: {}, excludedNoSignal: ["deepseek-r1:32b"] },
  ];
  const merged = mergeProbeMatrices(reports);
  assert.deepEqual(merged.models, ["qwen2.5-coder:7b"], "self-excluded reasoners contribute no cell");
  // the aggregation main() performs:
  const childExcluded = reports.flatMap((r) => (Array.isArray(r.excludedNoSignal) ? r.excludedNoSignal : []));
  assert.deepEqual([...new Set(childExcluded)].sort(), ["deepseek-r1:14b", "deepseek-r1:32b"]);
});
