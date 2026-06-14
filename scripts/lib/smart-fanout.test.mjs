/**
 * smart-fanout.test.mjs -- hermetic (no live Ollama; the fan-out impl is injected) coverage for the
 * AUTO-router. R9: each case encodes WHY a task lands local vs Claude -- the routing decision IS the
 * value (mechanical -> $0 local, judgment/safety -> Claude). Reference strings are the REAL classifier
 * triggers from local-llm-task-router.mjs CLASS_PATTERNS/SAFETY_PATTERNS (verified 2026-06-12).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { laneFor, partitionTasks, smartFanout, MECHANICAL_CLASSES } from "./smart-fanout.mjs";

// A fan-out spy: records the batch it was handed + returns a deterministic local result shape.
function spyFanout() {
  const calls = [];
  const impl = async (tasks, opts) => {
    calls.push({ tasks, opts });
    return {
      results: tasks.map((t) => ({ id: t.id, ok: true, text: `local:${t.id}` })),
      peakConcurrency: Math.min(3, tasks.length),
      total: tasks.length,
      okCount: tasks.length,
    };
  };
  return { calls, impl };
}

test("laneFor: mechanical work routes to local Ollama", () => {
  // Each string hits a distinct mechanical CLASS_PATTERN -> the $0 local lane.
  assert.equal(laneFor({ prompt: "summarize this changelog" }), "ollama");       // summarize
  assert.equal(laneFor({ prompt: "extract the fields from the log" }), "ollama"); // extract
  assert.equal(laneFor({ prompt: "classify these tickets into buckets" }), "ollama"); // classify
  assert.equal(laneFor({ prompt: "convert this to json" }), "ollama");            // format
  assert.equal(laneFor({ prompt: "explain what this function does" }), "ollama"); // explain
  assert.equal(laneFor({ prompt: "write the jsdoc for this" }), "ollama");        // document
  assert.equal(laneFor({ prompt: "git log summary for the release" }), "ollama"); // git_summary
  assert.equal(laneFor({ prompt: "qwertyuiop zxcv" }), "ollama");                 // unknown -> mechanical default
});

test("laneFor: judgment work stays on Claude", () => {
  assert.equal(laneFor({ prompt: "reason about why the deploy gate fails" }), "claude"); // reason
  assert.equal(laneFor({ prompt: "design the architecture for the router" }), "claude"); // reason (design/architect)
  assert.equal(laneFor({ prompt: "synthesize the findings into one verdict" }), "claude"); // synthesize
  assert.equal(laneFor({ prompt: "write a function to parse the NC file" }), "claude");  // codegen
});

test("laneFor: explicit per-task lane override wins over the classifier", () => {
  // A mechanical prompt forced to Claude, and a judgment prompt forced local -- the caller knows best.
  assert.equal(laneFor({ prompt: "summarize this", lane: "claude" }), "claude");
  assert.equal(laneFor({ prompt: "reason about the tradeoffs", lane: "ollama" }), "ollama");
  assert.equal(laneFor({ prompt: "summarize this", lane: "OLLAMA" }), "ollama"); // case-insensitive
});

test("laneFor: safety-critical work NEVER goes local even when it looks mechanical", () => {
  // "summarize" is mechanical, but a spindle-rpm reading gates machine motion -> must be Claude.
  assert.equal(laneFor({ prompt: "summarize the spindle rpm readings" }), "claude");
  assert.equal(laneFor({ prompt: "classify these feed rate values" }), "claude");
  assert.equal(laneFor({ prompt: "extract the toolpath g-code blocks" }), "claude");
});

test("laneFor: SAFETY-NEVER-LOCAL -- an explicit lane:'ollama' override CANNOT route safety work local", () => {
  // The load-bearing invariant (reviewer-C N1): a caller that force-sets lane:"ollama" on a batch
  // containing a safety-critical prompt must NOT leak it to the local model. Safety wins over the
  // override. A claude override on safety is moot (same result). Non-safety overrides still honored.
  assert.equal(laneFor({ prompt: "summarize the spindle rpm readings", lane: "ollama" }), "claude");
  assert.equal(laneFor({ prompt: "extract the feed rate from this g-code", lane: "ollama" }), "claude");
  assert.equal(laneFor({ prompt: "summarize the spindle rpm readings", lane: "claude" }), "claude");
  // non-safety override remains honored (regression guard for the reorder)
  assert.equal(laneFor({ prompt: "reason about the tradeoffs", lane: "ollama" }), "ollama");
});

test("partitionTasks: splits a mixed batch, preserves ids + bare strings", () => {
  const { ollamaTasks, claudeTasks } = partitionTasks([
    { id: "a", prompt: "summarize the spec" },        // ollama
    { id: "b", prompt: "synthesize the conclusions" }, // claude
    "extract the numbers",                              // bare string, index id 2 -> ollama
    { id: "d", prompt: "check the feed rate is safe" },// safety -> claude
  ]);
  assert.deepEqual(ollamaTasks.map((t) => t.id), ["a", 2]);
  assert.deepEqual(claudeTasks.map((t) => t.id), ["b", "d"]);
});

test("partitionTasks: adversarial empty/null/undefined -> empty lanes, no throw", () => {
  for (const bad of [[], null, undefined, 42, "string", {}]) {
    const { ollamaTasks, claudeTasks } = partitionTasks(bad);
    assert.equal(ollamaTasks.length, 0);
    assert.equal(claudeTasks.length, 0);
  }
});

test("partitionTasks: object without prompt -> unknown class -> local lane", () => {
  const { ollamaTasks } = partitionTasks([{ id: "x" }]); // no prompt -> "" -> unknown -> ollama
  assert.deepEqual(ollamaTasks.map((t) => t.id), ["x"]);
});

test("smartFanout: executes ONLY the mechanical lane locally; returns judgment for Claude", async () => {
  const { calls, impl } = spyFanout();
  const out = await smartFanout(
    [
      { id: "m1", prompt: "summarize the report" },
      { id: "j1", prompt: "design the new pipeline" },
      { id: "m2", prompt: "extract the dims" },
      { id: "s1", prompt: "summarize the cutting speed" }, // safety -> Claude
    ],
    { fanoutImpl: impl },
  );
  // The local fan-out received EXACTLY the mechanical tasks (m1, m2) -- the auto-invocation.
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].tasks.map((t) => t.id), ["m1", "m2"]);
  assert.equal(out.ollamaResults.okCount, 2);
  // Judgment + safety stayed for Claude.
  assert.deepEqual(out.claudeTasks.map((t) => t.id), ["j1", "s1"]);
  assert.deepEqual(out.routing, { total: 4, ollama: 2, claude: 2 });
});

test("smartFanout: no mechanical tasks -> local fan-out is NOT called", async () => {
  const { calls, impl } = spyFanout();
  const out = await smartFanout([{ id: "j", prompt: "synthesize everything" }], { fanoutImpl: impl });
  assert.equal(calls.length, 0); // never paid for a local call
  assert.deepEqual(out.ollamaResults, { results: [], peakConcurrency: 0, total: 0, okCount: 0 });
  assert.deepEqual(out.routing, { total: 1, ollama: 0, claude: 1 });
});

test("smartFanout: surfaces the Ollama-down fallback signal from the fan-out", async () => {
  const fallback = { needed: true, lane: "sonnet", tasks: [{ id: "m1", prompt: "summarize the report" }] };
  const impl = async (tasks) => ({
    results: tasks.map((t) => ({ id: t.id, ok: false, error: "ECONNREFUSED" })),
    peakConcurrency: 1, total: tasks.length, okCount: 0, fallback,
  });
  const out = await smartFanout([{ id: "m1", prompt: "summarize the report" }], { fanoutImpl: impl });
  assert.equal(out.fallback.needed, true);
  assert.equal(out.fallback.lane, "sonnet");
  assert.deepEqual(out.fallback.tasks.map((t) => t.id), ["m1"]);
});

test("smartFanout: adversarial empty input -> no call, zero routing", async () => {
  const { calls, impl } = spyFanout();
  const out = await smartFanout([], { fanoutImpl: impl });
  assert.equal(calls.length, 0);
  assert.deepEqual(out.routing, { total: 0, ollama: 0, claude: 0 });
});

test("MECHANICAL_CLASSES is a frozen guard set", () => {
  assert.equal(Object.isFrozen(MECHANICAL_CLASSES), true);
  for (const c of ["summarize", "extract", "classify", "format", "explain", "document", "git_summary", "unknown"]) {
    assert.equal(MECHANICAL_CLASSES.has(c), true);
  }
  for (const c of ["reason", "synthesize", "codegen", "audit"]) {
    assert.equal(MECHANICAL_CLASSES.has(c), false);
  }
});
