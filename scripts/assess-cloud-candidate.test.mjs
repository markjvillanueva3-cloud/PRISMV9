// assess-cloud-candidate.test.mjs
// Hermetic tests for the cloud-candidate assessment harness (slot:papa 2026-06-17). The
// runner takes an INJECTED caller, so no network. Real reference-value asserts (R9): pass
// counting, error-as-fail, cost/latency aggregation, dynamic plan size, cost estimate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRunPlan, estimatePlanCostUsd, runAssessment, renderReport,
} from "./assess-cloud-candidate.mjs";
import { TASK_BATTERY } from "./lib/ollama-capability-battery.mjs";

// A tiny fully-controlled battery so pass/fail is exact (decoupled from the real battery).
const MINI = [
  { id: "echo", category: "test",
    cases: [{ want: "ok" }, { want: "no" }],
    prompt: (c) => `say ${c.want}`,
    verify: (out, c) => String(out).trim() === c.want },
];

test("buildRunPlan: one item per (model, task, case); dynamic size, no brittle constant", () => {
  const casesPerModel = TASK_BATTERY.reduce((n, t) => n + t.cases.length, 0);
  const plan = buildRunPlan(["glm-5.2", "nemotron-super-free"]);
  assert.equal(plan.length, casesPerModel * 2);
  assert.deepEqual(plan[0], { model: "glm-5.2", taskId: TASK_BATTERY[0].id, category: TASK_BATTERY[0].category, caseIndex: 0 });
  assert.equal(buildRunPlan([]).length, 0);
  assert.equal(buildRunPlan(null).length, 0);
});

test("estimatePlanCostUsd: free model is $0; paid candidate is > $0 (and pricier)", () => {
  const e = estimatePlanCostUsd(["nemotron-super-free", "glm-5.2"]);
  assert.equal(e.perModel["nemotron-super-free"], 0);
  assert.ok(e.perModel["glm-5.2"] > 0, "paid glm-5.2 must cost > 0");
  assert.equal(Math.round(e.totalUsd * 1e6) / 1e6, Math.round(e.perModel["glm-5.2"] * 1e6) / 1e6);
});

test("runAssessment: correct caller -> 100% pass; cost/latency aggregated", async () => {
  // caller returns the exact answer the prompt asks for ("say X" -> "X") + a free-model usage.
  const callImpl = async ({ prompt }) => ({
    ok: true, text: prompt.replace(/^say /, ""), usage: { prompt_tokens: 10, completion_tokens: 2 }, durationMs: 100,
  });
  const out = await runAssessment({ models: ["nemotron-super-free"], callImpl, battery: MINI });
  const a = out.agg["nemotron-super-free"];
  assert.equal(a.total, 2);
  assert.equal(a.pass, 2);
  assert.equal(a.passRate, 1);
  assert.equal(a.errors, 0);
  assert.equal(a.avgLatencyMs, 100);
  assert.equal(a.costUsd, 0);               // free tier
  assert.equal(out.matrix.echo.models["nemotron-super-free"].rate, 1);
});

test("runAssessment: wrong caller -> 0% pass (verify is real correctness, not format)", async () => {
  const callImpl = async () => ({ ok: true, text: "WRONG", usage: { prompt_tokens: 5, completion_tokens: 1 }, durationMs: 50 });
  const out = await runAssessment({ models: ["m"], callImpl, battery: MINI });
  assert.equal(out.agg.m.pass, 0);
  assert.equal(out.agg.m.passRate, 0);
});

test("runAssessment: a failed/errored call counts as FAIL, not skipped (R12)", async () => {
  const callImpl = async () => ({ ok: false, error: "HTTP 429 rate limited" });
  const out = await runAssessment({ models: ["m"], callImpl, battery: MINI });
  assert.equal(out.agg.m.total, 2);
  assert.equal(out.agg.m.errors, 2);
  assert.equal(out.agg.m.pass, 0);
  assert.equal(out.agg.m.costUsd, 0);       // no cost charged for failed calls
});

test("runAssessment: a thrown caller is caught (never throws out) + counts as fail", async () => {
  const callImpl = async () => { throw new Error("boom"); };
  const out = await runAssessment({ models: ["m"], callImpl, battery: MINI });
  assert.equal(out.agg.m.errors, 2);
  assert.equal(out.agg.m.pass, 0);
});

test("runAssessment: paid model accrues cost from real usage", async () => {
  const callImpl = async () => ({ ok: true, text: "ok", usage: { prompt_tokens: 1e6, completion_tokens: 0 }, durationMs: 10 });
  const out = await runAssessment({ models: ["glm-5.2"], callImpl, battery: [{ id: "x", category: "t", cases: [{}], prompt: () => "p", verify: () => true }] });
  // 1M prompt tokens @ $1.40/M = $1.40
  assert.equal(out.agg["glm-5.2"].costUsd, 1.4);
});

test("renderReport: marks baseline + reports delta vs baseline", () => {
  const agg = {
    "glm-5.2": { pass: 18, total: 18, passRate: 1, avgLatencyMs: 800, costUsd: 0.002, errors: 0 },
    "nemotron-super-free": { pass: 16, total: 18, passRate: 0.89, avgLatencyMs: 1200, costUsd: 0, errors: 0 },
  };
  const r = renderReport({ agg, baseline: "nemotron-super-free" }, ["glm-5.2", "nemotron-super-free"]);
  assert.match(r, /nemotron-super-free \(baseline\)/);
  assert.match(r, /delta vs baseline/);
  assert.match(r, /glm-5\.2: rate \+0\.11/);
  assert.match(r, /Never default quality\/safety to it/);
});
