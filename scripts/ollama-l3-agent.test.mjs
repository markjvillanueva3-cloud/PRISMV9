/**
 * ollama-l3-agent.test.mjs — U-OE-L3
 *
 * Hermetic tests for the L3 sustained agent loop. Inject mock `runStep`
 * and `isDoneImpl` deps to exercise the loop logic without hitting Ollama.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildStepQuestion,
  compactTranscript,
  isGoalSatisfied,
  runL3,
  renderL3Digest,
} from "./ollama-l3-agent.mjs";

describe("buildStepQuestion", () => {
  it("emits a step-1 prompt with no prior steps", () => {
    const q = buildStepQuestion("test goal", []);
    assert.match(q, /GOAL: test goal/);
    assert.match(q, /This is step 1/);
  });

  it("includes a compacted transcript on step N>1", () => {
    const q = buildStepQuestion("goal X", [
      { question: "what is A?", answer: "A = 42" },
      { question: "what is B?", answer: "B = 7" },
    ]);
    assert.match(q, /step 3/);
    assert.match(q, /A = 42|B = 7/);
  });

  it("handles null/undefined goal safely", () => {
    const q = buildStepQuestion(null, []);
    assert.match(q, /GOAL:/);
  });
});

describe("compactTranscript", () => {
  it("returns a placeholder for empty input", () => {
    assert.equal(compactTranscript([]), "(no prior steps)");
  });

  it("includes the most recent steps when under the cap", () => {
    const out = compactTranscript([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    assert.match(out, /Q1: Q1/);
    assert.match(out, /Q2: Q2/);
  });

  it("drops oldest steps when over the cap (newest-first preserved)", () => {
    const steps = [];
    for (let i = 0; i < 50; i++) steps.push({ question: `Q${i}`.repeat(20), answer: `A${i}`.repeat(50) });
    const out = compactTranscript(steps, 1000);
    assert.ok(out.length <= 1200, `expected <= 1200 chars, got ${out.length}`);
    // Newest step (index 49) must be present.
    assert.match(out, /Q50:/);
  });
});

describe("isGoalSatisfied", () => {
  it("returns false on zero prior steps (no judgment to make)", async () => {
    const r = await isGoalSatisfied("goal", []);
    assert.equal(r.done, false);
  });

  it("returns done:true when the model says 'yes'", async () => {
    const chatImpl = async () => ({ ok: true, message: { content: "yes" } });
    const r = await isGoalSatisfied("goal", [{ question: "Q", answer: "A" }], { chatImpl });
    assert.equal(r.done, true);
  });

  it("returns done:false when the model says 'no'", async () => {
    const chatImpl = async () => ({ ok: true, message: { content: "no, more analysis needed" } });
    const r = await isGoalSatisfied("goal", [{ question: "Q", answer: "A" }], { chatImpl });
    assert.equal(r.done, false);
  });

  it("matches 'done' / 'complete' / 'satisfied' synonyms", async () => {
    for (const w of ["done", "complete", "satisfied", "DONE", "Yes."]) {
      const chatImpl = async () => ({ ok: true, message: { content: w } });
      const r = await isGoalSatisfied("g", [{ question: "Q", answer: "A" }], { chatImpl });
      assert.equal(r.done, true, `expected '${w}' to be affirmative`);
    }
  });

  it("returns done:false on chat error (conservative — keep looping)", async () => {
    const chatImpl = async () => ({ ok: false, error: "ollama timeout" });
    const r = await isGoalSatisfied("g", [{ question: "Q", answer: "A" }], { chatImpl });
    assert.equal(r.done, false);
    assert.match(r.error, /ollama timeout/);
  });

  it("returns done:false when chat throws", async () => {
    const chatImpl = async () => { throw new Error("boom"); };
    const r = await isGoalSatisfied("g", [{ question: "Q", answer: "A" }], { chatImpl });
    assert.equal(r.done, false);
    assert.match(r.error, /boom/);
  });
});

describe("runL3 — orchestration", () => {
  function mockRunStep(answer = "step answer", ok = true) {
    return async () => ({ ok, answer, iterations: 1, toolCalls: [], capped: false, error: ok ? null : "step error" });
  }

  it("rejects empty goal with doneReason='empty-goal'", async () => {
    const r = await runL3({ goal: "  " });
    assert.equal(r.ok, false);
    assert.equal(r.doneReason, "empty-goal");
  });

  it("runs maxSteps when continuation gate always says no", async () => {
    const r = await runL3({
      goal: "investigate something",
      maxSteps: 3,
      deps: {
        runStep: mockRunStep("partial answer"),
        isDoneImpl: async () => ({ done: false, raw: "no" }),
        now: () => 0,
      },
    });
    assert.equal(r.ok, true);
    assert.equal(r.steps.length, 3);
    assert.equal(r.doneReason, "max-steps");
  });

  it("stops early when continuation gate says done", async () => {
    let calls = 0;
    const r = await runL3({
      goal: "investigate",
      maxSteps: 5,
      deps: {
        runStep: mockRunStep("partial"),
        isDoneImpl: async () => {
          calls++;
          return { done: calls >= 2, raw: calls >= 2 ? "yes" : "no" };
        },
        now: () => 0,
      },
    });
    assert.equal(r.doneReason, "goal-satisfied");
    assert.equal(r.steps.length, 2);
  });

  it("records step-error and stops on L2 failure", async () => {
    const r = await runL3({
      goal: "investigate",
      maxSteps: 3,
      deps: {
        runStep: mockRunStep("err", false),
        isDoneImpl: async () => ({ done: false, raw: "no" }),
        now: () => 0,
      },
    });
    assert.equal(r.ok, false);
    assert.equal(r.doneReason, "step-error");
    assert.equal(r.steps.length, 1);
    assert.equal(r.steps[0].ok, false);
  });

  it("honors wallTimeoutMs by halting before the next step", async () => {
    let t = 0;
    const r = await runL3({
      goal: "investigate",
      maxSteps: 10,
      wallTimeoutMs: 100,
      deps: {
        runStep: mockRunStep("partial"),
        isDoneImpl: async () => ({ done: false, raw: "no" }),
        now: () => { t += 60; return t; },
      },
    });
    assert.equal(r.doneReason, "wall-timeout");
    assert.ok(r.steps.length < 10);
  });

  it("returns a frozen result with the documented shape", async () => {
    const r = await runL3({
      goal: "g",
      maxSteps: 1,
      deps: {
        runStep: mockRunStep("done"),
        isDoneImpl: async () => ({ done: false, raw: "no" }),
        now: () => 0,
      },
    });
    assert.equal(Object.isFrozen(r), true);
    assert.equal(Object.isFrozen(r.steps), true);
    assert.equal(typeof r.durationMs, "number");
    assert.equal(typeof r.totalToolCalls, "number");
  });

  it("aggregates totalToolCalls across steps", async () => {
    let n = 0;
    const runStep = async () => ({ ok: true, answer: "ans", iterations: 1, toolCalls: [{}, {}, {}], capped: false });
    const r = await runL3({
      goal: "g",
      maxSteps: 3,
      deps: {
        runStep,
        isDoneImpl: async () => ({ done: false, raw: "no" }),
        now: () => ++n * 10,
      },
    });
    assert.equal(r.totalToolCalls, 9); // 3 steps × 3 tool calls
  });
});

describe("renderL3Digest", () => {
  it("produces a multi-line operator-readable digest", () => {
    const fake = Object.freeze({
      ok: true, goal: "test goal", model: "qwen", durationMs: 1234, totalToolCalls: 5,
      doneReason: "goal-satisfied",
      steps: Object.freeze([
        { stepNumber: 1, question: "Q1", answer: "A1", ok: true, iterations: 1, toolCalls: 2, capped: false, error: null },
        { stepNumber: 2, question: "Q2", answer: "A2 final", ok: true, iterations: 1, toolCalls: 3, capped: false, error: null },
      ]),
    });
    const d = renderL3Digest(fake);
    assert.match(d, /goal-satisfied/);
    assert.match(d, /test goal/);
    assert.match(d, /Step 1/);
    assert.match(d, /Step 2/);
    assert.match(d, /A1/);
    assert.match(d, /A2 final/);
  });

  it("surfaces step errors in the digest", () => {
    const fake = Object.freeze({
      ok: false, goal: "g", model: "m", durationMs: 100, totalToolCalls: 0,
      doneReason: "step-error",
      steps: Object.freeze([
        { stepNumber: 1, question: "Q", answer: "", ok: false, iterations: 0, toolCalls: 0, capped: false, error: "ollama down" },
      ]),
    });
    const d = renderL3Digest(fake);
    assert.match(d, /ERROR: ollama down/);
  });
});
