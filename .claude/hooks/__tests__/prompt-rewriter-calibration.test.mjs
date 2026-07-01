import { test } from "node:test";
import assert from "node:assert/strict";
import { calibrateConfidence } from "../prompt-rewriter-ollama.mjs";

const okRewrite = {
  confidence: 0.85,
  goal: "fix the prompt rewriter system that is broken",
  acceptance_criteria: ["rewrite emits", "log shows non-null rewrite"],
  implicit_constraints: ["don't break existing tests", "follow conventions"],
  variability_axes: [],
};

test("calibrate: well-formed rewrite preserves confidence (with testable + verbatim boosts)", () => {
  // okRewrite.acceptance_criteria contains "emits" + "shows" → +testable-acceptance
  // okRewrite.goal is a verbatim ≥3-word prefix of the raw prompt → +verbatim-grounding (U-PRF06)
  const r = calibrateConfidence(okRewrite, "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart");
  assert.ok(Math.abs(r.confidence - 0.95) < 1e-6, `expected 0.95, got ${r.confidence}`); // 0.85 + 0.05 testable + 0.05 verbatim
  assert.deepEqual(r.penalties.sort(), ["+testable-acceptance", "+verbatim-grounding"]);
});

test("calibrate: hallucinated goal (no shared content word) → -0.30", () => {
  const r = calibrateConfidence(
    { ...okRewrite, goal: "build a quantum spaceship rocket" },
    "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart"
  );
  // 0.85 - 0.30 + 0.05 (testable boost still applies) = 0.60
  assert.ok(r.confidence <= 0.60 + 1e-9, `expected ≤0.60, got ${r.confidence}`);
  assert.ok(r.penalties.some((p) => p.includes("no-content-word")));
});

test("calibrate: < 2 acceptance criteria → -0.20", () => {
  const r = calibrateConfidence({ ...okRewrite, acceptance_criteria: ["one"] }, "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart");
  // 0.85 - 0.20 (ac<2, no testable boost) + 0.05 (verbatim) = 0.70
  assert.ok(Math.abs(r.confidence - 0.70) < 1e-6, `expected ~0.70, got ${r.confidence}`);
  assert.ok(r.penalties.some((p) => p.includes("acceptance-criteria")));
});

test("calibrate: empty implicit_constraints on long prompt → -0.10", () => {
  const longPrompt = "fix the prompt rewriter system that is broken across the fleet right now and verify it works again";
  const r = calibrateConfidence({ ...okRewrite, implicit_constraints: [] }, longPrompt);
  // 0.85 - 0.10 (no IC) + 0.05 (testable) + 0.05 (verbatim) = 0.85
  assert.ok(Math.abs(r.confidence - 0.85) < 1e-6, `expected ~0.85, got ${r.confidence}`);
});

test("calibrate: goal-too-long → -0.15", () => {
  const r = calibrateConfidence(
    { ...okRewrite, goal: "x".repeat(200) + " rewriter system" },
    "fix rewriter system"
  );
  assert.ok(r.penalties.some((p) => p.includes("goal-too-long")));
  assert.ok(r.confidence < okRewrite.confidence);
});

test("calibrate: fabricated variability axis → -0.05", () => {
  const r = calibrateConfidence(
    { ...okRewrite, variability_axes: ["titanium"] },
    "fix the prompt rewriter system that is broken across the fleet"
  );
  assert.ok(r.penalties.some((p) => p.startsWith("fabricated-axis")));
});

test("calibrate: penalties stack", () => {
  const r = calibrateConfidence(
    { confidence: 0.95, goal: "quantum spaceship", acceptance_criteria: [], implicit_constraints: [], variability_axes: [] },
    "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart"
  );
  // -0.30 (no-content-word) -0.20 (ac<2) -0.10 (no-ic on long prompt) -0 (goal short) -0 (no fabricated axis)
  // = 0.95 - 0.60 = 0.35
  assert.ok(r.confidence <= 0.35 + 1e-9);
  assert.ok(r.penalties.length >= 3);
});

test("calibrate: clamped to [0,1]", () => {
  const r = calibrateConfidence({ confidence: 0.10, goal: "alien", acceptance_criteria: [], implicit_constraints: [], variability_axes: [] }, "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart");
  assert.ok(r.confidence >= 0);
  assert.ok(r.confidence <= 1);
});

test("calibrate: missing rewrite → 0", () => {
  const r = calibrateConfidence(null, "anything");
  assert.equal(r.confidence, 0);
});

test("calibrate: rewrite with no confidence field → 0", () => {
  const r = calibrateConfidence({ goal: "x" }, "x");
  assert.equal(r.confidence, 0);
});

// U-PRF04 — positive boosts.
test("calibrate: grounded PRISM file path → +0.05", () => {
  const r = calibrateConfidence({
    ...okRewrite,
    file_paths: [".claude/hooks/prompt-rewriter-ollama.mjs"],
  }, "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart");
  assert.ok(r.penalties.includes("+grounded-file-path"));
  assert.ok(r.confidence >= okRewrite.confidence);
});

test("calibrate: testable-verb acceptance → +0.05", () => {
  const r = calibrateConfidence({
    ...okRewrite,
    acceptance_criteria: ["test for emit", "verify log shows non-null rewrite"],
  }, "fix the prompt rewriter system that is broken across the fleet right now after the daemon restart");
  assert.ok(r.penalties.includes("+testable-acceptance"));
  assert.ok(r.confidence >= okRewrite.confidence);
});

test("calibrate: slot-anchored goal+raw → +0.05", () => {
  const r = calibrateConfidence({
    ...okRewrite,
    goal: "fix the prompt rewriter system on alpha slot worktree right now",
  }, "fix the prompt rewriter system that is broken on alpha worktree across the fleet right now");
  assert.ok(r.penalties.some((p) => p.startsWith("+slot-anchored:alpha")));
});

test("calibrate: 5 boosts compound (perfect rewrite reaches 1.00 from 0.75 self-rate)", () => {
  const r = calibrateConfidence({
    confidence: 0.75, // even a conservative self-rate hits 1.00 with 5/5 boosts
    goal: "fix the prompt rewriter system on alpha worktree across the fleet",
    acceptance_criteria: ["test for emit", "verify rewrite is non-null"],
    // U-PRF05: includes a DOCTRINE_TERMS match → +0.05
    implicit_constraints: ["follow scrutiny gate, dedup before creating new asset"],
    variability_axes: [],
    file_paths: [".claude/hooks/prompt-rewriter-ollama.mjs", "scripts/lib/injection-dedup.mjs"],
  }, "fix the prompt rewriter system on alpha worktree across the fleet right now after the daemon restart");
  // +0.05 grounded-path +0.05 testable-acceptance +0.05 slot-anchored +0.05 doctrine-aware +0.05 verbatim-grounding = +0.25
  // 0.75 + 0.25 = 1.00 (clamped)
  assert.ok(r.confidence >= 0.999, `expected 1.00, got ${r.confidence}`);
  assert.equal(r.penalties.filter((p) => p.startsWith("+")).length, 5);
});

// U-PRF06 — verbatim-grounding boost.
test("calibrate: verbatim-grounding (+0.05) when goal contains ≥3-word raw substring", () => {
  const r = calibrateConfidence({
    confidence: 0.80,
    goal: "the rewriter system fix is critical",
    acceptance_criteria: ["one passes", "two passes"],
    implicit_constraints: ["don't break tests"],
    file_paths: [],
  }, "fix the rewriter system across the fleet right now");
  assert.ok(r.penalties.includes("+verbatim-grounding"), `penalties=${r.penalties.join(",")}`);
});

test("calibrate: no verbatim grounding when goal is purely paraphrased", () => {
  const r = calibrateConfidence({
    confidence: 0.80,
    goal: "address issues with the language model output transformer",
    acceptance_criteria: ["one passes", "two passes"],
    implicit_constraints: ["don't break tests"],
    file_paths: [],
  }, "fix the rewriter system across the fleet right now");
  assert.ok(!r.penalties.includes("+verbatim-grounding"));
});

// U-PRF05 — doctrine-term boost.
test("calibrate: doctrine-aware boost (+0.05) for PRISM-doctrine terms in implicit_constraints", () => {
  const r = calibrateConfidence({
    confidence: 0.80,
    goal: "fix the prompt rewriter system",
    acceptance_criteria: ["one passes", "two passes"],
    implicit_constraints: ["never inline Kienzle constants", "use ENGINE_DIGEST.md for dedup"],
    file_paths: [],
  }, "fix the prompt rewriter system across the fleet right now after the daemon restart");
  assert.ok(r.penalties.includes("+doctrine-aware"), `penalties=${r.penalties.join(",")}`);
});

test("calibrate: generic constraints (no doctrine terms) → no doctrine boost", () => {
  const r = calibrateConfidence({
    confidence: 0.80,
    goal: "fix the prompt rewriter system",
    acceptance_criteria: ["one passes", "two passes"],
    implicit_constraints: ["don't break things", "follow conventions"],
    file_paths: [],
  }, "fix the prompt rewriter system across the fleet right now after the daemon restart");
  assert.ok(!r.penalties.includes("+doctrine-aware"));
});
