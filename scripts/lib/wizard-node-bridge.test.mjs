/**
 * wizard-node-bridge.test.mjs — concrete-value tests for the unified
 * mill/lathe/wire-EDM wizard contract.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-WIZARD-NODE-BRIDGE
 * @slot echo · @iter 38 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WIZARD_CONTRACT_VERSION,
  WIZARD_DOMAINS,
  STEP_KINDS,
  STATUS_VALUES,
  createWizard,
  currentStep,
  canAdvance,
  advance,
  collectAnswers,
  emit,
  summarizeProgress,
  reset,
  jumpToStep,
  summarizeWizardShape,
} from "./wizard-node-bridge.mjs";

// Synthetic 3-step wizard fixture
function fixtureSteps() {
  return [
    { id: "material", kind: "question", prompt: "Material?", required: true },
    { id: "tool", kind: "question", prompt: "Tool diameter?", required: true,
      validator: (v) => Number.isFinite(v) && v > 0 },
    { id: "rpm", kind: "computation", prompt: "RPM (computed)", required: false },
  ];
}

describe("constants", () => {
  it("WIZARD_CONTRACT_VERSION = 1", () => {
    assert.equal(WIZARD_CONTRACT_VERSION, 1);
  });
  it("WIZARD_DOMAINS = ['mill','lathe','wire_edm']", () => {
    assert.deepEqual(WIZARD_DOMAINS, ["mill", "lathe", "wire_edm"]);
  });
  it("STEP_KINDS = ['question','computation','validation','emit']", () => {
    assert.deepEqual(STEP_KINDS, ["question", "computation", "validation", "emit"]);
  });
  it("STATUS_VALUES = ['in_progress','blocked','complete','errored']", () => {
    assert.deepEqual(STATUS_VALUES, ["in_progress", "blocked", "complete", "errored"]);
  });
});

describe("createWizard", () => {
  it("mill domain → wizard created with domain='mill'", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(w.domain, "mill");
  });
  it("lathe domain → accepted", () => {
    assert.equal(createWizard({ domain: "lathe", steps: fixtureSteps() }).domain, "lathe");
  });
  it("wire_edm domain → accepted", () => {
    assert.equal(createWizard({ domain: "wire_edm", steps: fixtureSteps() }).domain, "wire_edm");
  });
  it("unknown domain 'fusion' → null", () => {
    assert.equal(createWizard({ domain: "fusion", steps: fixtureSteps() }), null);
  });
  it("missing domain → null", () => {
    assert.equal(createWizard({ steps: fixtureSteps() }), null);
  });
  it("zero valid steps → null", () => {
    assert.equal(createWizard({ domain: "mill", steps: [] }), null);
  });
  it("invalid step kind filtered out", () => {
    const w = createWizard({
      domain: "mill",
      steps: [
        { id: "s1", kind: "question" },
        { id: "s2", kind: "fake_kind" },
      ],
    });
    assert.equal(w.steps.length, 1);
  });
  it("missing step id → filtered out", () => {
    const w = createWizard({
      domain: "mill",
      steps: [{ kind: "question" }, { id: "s2", kind: "question" }],
    });
    assert.equal(w.steps.length, 1);
  });
  it("starts at currentIndex=0", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(w.currentIndex, 0);
  });
  it("starts with empty answers", () => {
    assert.deepEqual(createWizard({ domain: "mill", steps: fixtureSteps() }).answers, {});
  });
  it("starts with status='in_progress'", () => {
    assert.equal(createWizard({ domain: "mill", steps: fixtureSteps() }).status, "in_progress");
  });
});

describe("currentStep", () => {
  it("step 0: returns first step (id='material')", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(currentStep(w).id, "material");
  });
  it("past end: returns null", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    const past = { ...w, currentIndex: 99 };
    assert.equal(currentStep(past), null);
  });
  it("null wizard → null", () => {
    assert.equal(currentStep(null), null);
  });
});

describe("canAdvance", () => {
  it("required step with no answer → false", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(canAdvance(w), false);
  });
  it("required step with valid answer → true", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = { ...w, answers: { material: "4140" } };
    assert.equal(canAdvance(w), true);
  });
  it("validator fails → false", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140"); // material → tool step
    w = { ...w, answers: { ...w.answers, tool: -5 } }; // validator wants > 0
    assert.equal(canAdvance(w), false);
  });
  it("validator passes → true", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = { ...w, answers: { ...w.answers, tool: 12.7 } };
    assert.equal(canAdvance(w), true);
  });
  it("validator throws → false", () => {
    const steps = [
      { id: "s1", kind: "question", required: true, validator: () => { throw new Error("boom"); } },
    ];
    let w = createWizard({ domain: "mill", steps });
    w = { ...w, answers: { s1: "x" } };
    assert.equal(canAdvance(w), false);
  });
  it("non-required step always advances", () => {
    const steps = [{ id: "s1", kind: "computation", required: false }];
    const w = createWizard({ domain: "mill", steps });
    assert.equal(canAdvance(w), true);
  });
});

describe("advance: immutable state machine", () => {
  it("first answer advances currentIndex 0→1", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = advance(w0, "4140");
    assert.equal(w1.currentIndex, 1);
  });
  it("immutable: original w0 unchanged after advance", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    advance(w0, "4140");
    assert.equal(w0.currentIndex, 0);
    assert.deepEqual(w0.answers, {});
  });
  it("answer stored under step id", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = advance(w0, "4140");
    assert.equal(w1.answers.material, "4140");
  });
  it("invalid answer → status='blocked', currentIndex unchanged", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140"); // pass step 0
    w = advance(w, -5);     // bad tool diameter (validator fails)
    assert.equal(w.status, "blocked");
    assert.equal(w.currentIndex, 1);
  });
  it("complete all 3 steps → status='complete'", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    w = advance(w); // step 2 is non-required, no answer needed
    assert.equal(w.status, "complete");
  });
});

describe("collectAnswers", () => {
  it("empty wizard → {}", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.deepEqual(collectAnswers(w), {});
  });
  it("after 2 answers → 2-key object", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    assert.deepEqual(collectAnswers(w), { material: "4140", tool: 12.7 });
  });
  it("returns a copy (mutating result does not affect wizard)", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    const copy = collectAnswers(w);
    copy.material = "MUTATED";
    assert.equal(w.answers.material, "4140");
  });
});

describe("emit", () => {
  it("incomplete wizard → null", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(emit(w), null);
  });
  it("complete wizard → emit object with domain + answers", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    w = advance(w);
    const out = emit(w);
    assert.equal(out.domain, "mill");
    assert.equal(out.answers.material, "4140");
    assert.equal(out.answers.tool, 12.7);
    assert.equal(out.stepCount, 3);
  });
  it("emit includes schemaVersion=1", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    w = advance(w);
    assert.equal(emit(w).schemaVersion, 1);
  });
});

describe("summarizeProgress", () => {
  it("fresh wizard: current=0, total=3, percentage=0", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    const p = summarizeProgress(w);
    assert.equal(p.current, 0);
    assert.equal(p.total, 3);
    assert.equal(p.percentage, 0);
  });
  it("after 1 step: current=1, percentage = 1/3", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    const p = summarizeProgress(w);
    assert.equal(p.current, 1);
    assert.equal(Math.abs(p.percentage - 1 / 3) < 1e-9, true);
  });
  it("after complete: percentage=1.0, status='complete'", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    w = advance(w);
    const p = summarizeProgress(w);
    assert.equal(p.percentage, 1.0);
    assert.equal(p.status, "complete");
  });
  it("null wizard → errored", () => {
    assert.equal(summarizeProgress(null).status, "errored");
  });
});

describe("reset", () => {
  it("rewinds to step 0", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = advance(w, 12.7);
    w = reset(w);
    assert.equal(w.currentIndex, 0);
  });
  it("clears answers", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = reset(w);
    assert.deepEqual(w.answers, {});
  });
  it("status returns to 'in_progress'", () => {
    let w = createWizard({ domain: "mill", steps: fixtureSteps() });
    w = advance(w, "4140");
    w = reset(w);
    assert.equal(w.status, "in_progress");
  });
});

describe("jumpToStep", () => {
  it("jump to index 2 → currentIndex=2", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = jumpToStep(w0, 2);
    assert.equal(w1.currentIndex, 2);
  });
  it("jump to end (index=length) → status='complete'", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = jumpToStep(w0, 3);
    assert.equal(w1.status, "complete");
  });
  it("jump out of bounds (negative) → wizard unchanged", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = jumpToStep(w0, -5);
    assert.equal(w1, w0);
  });
  it("jump out of bounds (over length) → wizard unchanged", () => {
    const w0 = createWizard({ domain: "mill", steps: fixtureSteps() });
    const w1 = jumpToStep(w0, 99);
    assert.equal(w1, w0);
  });
});

describe("summarizeWizardShape", () => {
  it("3-step fixture: totalSteps=3, byKind.question=2, byKind.computation=1", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    const s = summarizeWizardShape(w);
    assert.equal(s.totalSteps, 3);
    assert.equal(s.byKind.question, 2);
    assert.equal(s.byKind.computation, 1);
  });
  it("requiredCount = 2 (material + tool, NOT rpm)", () => {
    const w = createWizard({ domain: "mill", steps: fixtureSteps() });
    assert.equal(summarizeWizardShape(w).requiredCount, 2);
  });
  it("domain echoed", () => {
    const w = createWizard({ domain: "lathe", steps: fixtureSteps() });
    assert.equal(summarizeWizardShape(w).domain, "lathe");
  });
  it("null wizard → domain=null, totalSteps=0", () => {
    const s = summarizeWizardShape(null);
    assert.equal(s.domain, null);
    assert.equal(s.totalSteps, 0);
  });
});
