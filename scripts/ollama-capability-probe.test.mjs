// Tests for ollama-capability-probe.mjs wedge-safety orchestration
// (U-ALPHA-OLLAMA-ROSTER-SYNC, slot:alpha 2026-06-25).
//
// The probe runs MODEL-OUTER: probe one model's whole battery, then UNLOAD it
// before the next, so big models (32b/30b/120b) never co-reside and thrash >96GB
// VRAM -- the measured wedge in reference_ollama_stress_capability_2026_06_24.
// These tests pin that contract: unload-once-per-model-after-its-tasks, scoring
// via injected verify, a small per-request num_ctx (the KV-cache wedge lever), and
// best-effort unload (a failed unload never aborts the probe).
//
// node:test auto-runs on import; invoke with `node scripts/ollama-capability-probe.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runProbe, NUM_CTX, DEFAULT_MODELS, excludeNoSignalModels } from "./ollama-capability-probe.mjs";

const oneCaseTask = (id, verify) => ({
  id,
  category: "c",
  cases: [{ n: 1 }],
  prompt: () => "p",
  verify,
});

test("runProbe unloads each model exactly once, AFTER its tasks, MODEL-OUTER", async () => {
  const battery = [oneCaseTask("t1", () => true), oneCaseTask("t2", () => true)];
  const events = [];
  const callFn = async (model) => { events.push(`call:${model}`); return "ok"; };
  const unloadFn = async (model) => { events.push(`unload:${model}`); };

  await runProbe({ models: ["m1", "m2"], callFn, unloadFn, battery });

  // m1's two task calls, THEN unload m1, THEN m2's calls, THEN unload m2.
  assert.deepEqual(events, [
    "call:m1", "call:m1", "unload:m1",
    "call:m2", "call:m2", "unload:m2",
  ]);
});

test("runProbe records pass/fail per (task,model) via injected verify", async () => {
  const battery = [
    oneCaseTask("good", (out) => out === "yes"),
    oneCaseTask("bad", (out) => out === "never"),
  ];
  const res = await runProbe({
    models: ["m"],
    callFn: async () => "yes",
    unloadFn: async () => {},
    battery,
  });
  assert.equal(res.find((r) => r.taskId === "good").pass, true);
  assert.equal(res.find((r) => r.taskId === "bad").pass, false);
});

test("a failing unloadFn does NOT abort the probe (best-effort unload)", async () => {
  const battery = [oneCaseTask("t", () => true)];
  const res = await runProbe({
    models: ["m1", "m2"],
    callFn: async () => "ok",
    unloadFn: async () => { throw new Error("daemon busy"); },
    battery,
  });
  // both models still fully probed despite every unload throwing
  assert.equal(res.length, 2);
  assert.ok(res.every((r) => r.model === "m1" || r.model === "m2"));
});

test("a throwing callFn scores fail, never crashes the probe", async () => {
  // verify depends on output, so the caught-throw empty "" output scores fail.
  const battery = [oneCaseTask("t", (out) => out === "ok")];
  const res = await runProbe({
    models: ["m"],
    callFn: async () => { throw new Error("timeout"); },
    unloadFn: async () => {},
    battery,
  });
  assert.equal(res.length, 1);
  assert.equal(res[0].pass, false); // callFn threw -> out="" -> verify("")===false
});

test("NUM_CTX reserves a SMALL per-request KV cache (wedge regression guard)", () => {
  // Battery prompts are short; 2048 is the floor that still holds them.
  assert.ok(NUM_CTX >= 2048, `NUM_CTX ${NUM_CTX} too small for the battery prompts`);
  // The wedge was caused by the global OLLAMA_CONTEXT_LENGTH=131072 reserving a
  // 54.7GB KV cache on a 32b. NUM_CTX must stay FAR below that or the probe wedges
  // the daemon on the big-model roster. 32768 is a generous safety ceiling.
  assert.ok(NUM_CTX <= 32768, `NUM_CTX ${NUM_CTX} too close to the 131072 global context that wedged the daemon`);
});

test("DEFAULT_MODELS covers the routing-decision roster (not just the old 3)", () => {
  // The blind-graph bug: the nightly probe measured only 3 models while the router
  // could pick qwen3-coder:30b + deepseek-r1. The default must now cover them.
  assert.ok(DEFAULT_MODELS.includes("qwen3-coder:30b"), "missing the router's PREFERRED coder");
  assert.ok(DEFAULT_MODELS.includes("qwen2.5-coder:32b"), "missing the prior held coder (head-to-head baseline)");
  assert.ok(DEFAULT_MODELS.some((m) => m.startsWith("deepseek-r1:")), "missing the reasoning models");
  // exclude vision/embed families the text battery cannot fairly score
  assert.ok(!DEFAULT_MODELS.some((m) => /vl|vision|moondream|embed/.test(m)), "vision/embed model leaked into the text roster");
});

// --- excludeNoSignalModels: the false-0 guard (U-ALPHA-OLLAMA-STRESS-FRONTIER follow-up) ---
// A scored matrix shaped like scoreMatrix() output: { taskId: { category, models: { model: {pass,total,rate} } } }.
const scored = (perModelRates) => {
  const m = {};
  for (const [tid, rates] of Object.entries(perModelRates)) {
    m[tid] = { category: "c", models: Object.fromEntries(Object.entries(rates).map(([mod, rate]) => [mod, { pass: Math.round(rate * 3), total: 3, rate }])) };
  }
  return m;
};

test("excludeNoSignalModels drops a model that is rate-0 on EVERY task (false-0 generation-fail)", () => {
  // the live bug: qwen2.5-coder:32b stored at rate:0 everywhere because it failed to generate.
  const mtx = scored({ extract: { "good:7b": 1.0, "fail:32b": 0 }, json: { "good:7b": 1.0, "fail:32b": 0 } });
  const r = excludeNoSignalModels(mtx, ["good:7b", "fail:32b"]);
  assert.deepEqual(r.excluded, ["fail:32b"]);
  assert.deepEqual(r.models, ["good:7b"]);
  // removed from EVERY task's models map (not just the list) -> a consumer can't read its false-0
  assert.ok(!("fail:32b" in r.matrix.extract.models));
  assert.ok(!("fail:32b" in r.matrix.json.models));
  assert.ok("good:7b" in r.matrix.extract.models);
});

test("excludeNoSignalModels KEEPS a model with ANY positive signal (one 100% task is enough)", () => {
  // a model that nails one task but fails another is genuinely-measured -> must NOT be dropped.
  const mtx = scored({ easy: { "m:14b": 1.0 }, hard: { "m:14b": 0 } });
  const r = excludeNoSignalModels(mtx, ["m:14b"]);
  assert.deepEqual(r.excluded, []);
  assert.deepEqual(r.models, ["m:14b"]);
  assert.equal(r.matrix.hard.models["m:14b"].rate, 0, "the real 0 on the hard task is preserved");
});

test("excludeNoSignalModels does NOT drop a model whose only tasks have total:0 (unmeasured != no-signal)", () => {
  // total:0 means the task never ran for that model -> not 'measured incapable'; must be kept untouched.
  const mtx = { t: { category: "c", models: { "m:7b": { pass: 0, total: 0, rate: 0 } } } };
  const r = excludeNoSignalModels(mtx, ["m:7b"]);
  assert.deepEqual(r.excluded, []);
  assert.deepEqual(r.models, ["m:7b"]);
});

test("excludeNoSignalModels is pure -- it never mutates the input matrix", () => {
  const mtx = scored({ a: { "good:7b": 1.0, "fail:32b": 0 } });
  const before = JSON.stringify(mtx);
  excludeNoSignalModels(mtx, ["good:7b", "fail:32b"]);
  assert.equal(JSON.stringify(mtx), before, "input matrix must be unchanged (returns a new matrix)");
});

test("excludeNoSignalModels: no exclusions -> returns the inputs unchanged (fast path)", () => {
  const mtx = scored({ a: { "good:7b": 1.0 } });
  const r = excludeNoSignalModels(mtx, ["good:7b"]);
  assert.deepEqual(r.excluded, []);
  assert.equal(r.matrix, mtx, "fast path returns the SAME matrix reference when nothing is excluded");
});

test("excludeNoSignalModels: empty/null matrix -> no throw, empty result", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(excludeNoSignalModels(null, null).excluded, []);
    assert.deepEqual(excludeNoSignalModels({}, []).excluded, []);
  });
});
