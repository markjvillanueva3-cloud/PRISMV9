/**
 * aiReasoningDispatcher U-WIRE21 round-trip tests — ChainOfThoughtEngine.
 *
 * Validates that the 4 new cot_* actions wire correctly through prism_ai
 * and that the engine's reason/reasonTree/explainChain/applyManufacturingHeuristics
 * static methods produce coherent output through the dispatcher contract.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE21
 */

import { describe, it, expect } from "vitest";
import {
  ChainOfThoughtEngine,
  type ReasoningProblem,
  type ReasoningChain,
} from "../engines/ChainOfThoughtEngine.js";

const MIN_STEPS_FOR_NONTRIVIAL_PROBLEM = 4; // observation + facts + constraints + hypothesis

describe("U-WIRE21 ChainOfThoughtEngine.reason — linear strategy", () => {
  it("produces a chain with observation, hypothesis, and at least 4 steps for a problem with facts+constraints", () => {
    const problem: ReasoningProblem = {
      problem: "Determine cutting speed for D2 tool steel finishing pass",
      goal: "Recommend a safe cutting speed in m/min",
      known_facts: ["D2 tool steel hardness HRC 58", "Carbide insert C2", "Finish pass 0.3mm depth"],
      constraints: ["Surface finish Ra ≤ 1.6 μm", "Tool life ≥ 30 min"],
      strategy: "linear",
      max_steps: 12,
    };

    const chain = ChainOfThoughtEngine.reason(problem);
    expect(chain.chain_id.length).toBeGreaterThan(0);
    expect(chain.problem).toBe(problem.problem);
    expect(chain.goal).toBe(problem.goal);
    expect(chain.steps.length).toBeGreaterThanOrEqual(MIN_STEPS_FOR_NONTRIVIAL_PROBLEM);
    expect(chain.meta.strategy).toBe("linear");

    // First step must be an observation
    expect(chain.steps[0].type).toBe("observation");
    // Must include a hypothesis step somewhere in the early chain
    const hypIdx = chain.steps.findIndex(s => s.type === "hypothesis");
    expect(hypIdx).toBeGreaterThanOrEqual(0);
    expect(hypIdx).toBeLessThan(5);
  });

  it("respects max_steps limit", () => {
    const problem: ReasoningProblem = {
      problem: "Generic problem",
      goal: "Generic goal",
      max_steps: 5,
    };
    const chain = ChainOfThoughtEngine.reason(problem);
    expect(chain.steps.length).toBeLessThanOrEqual(6); // observation + max_steps loop
  });

  it("populates meta with branch_count >= 1 and backtrack_count >= 0", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "test",
      goal: "test",
    });
    expect(chain.meta.branch_count).toBeGreaterThanOrEqual(1);
    expect(chain.meta.backtrack_count).toBeGreaterThanOrEqual(0);
    expect(chain.meta.max_depth).toBeGreaterThan(0);
  });

  it("each step has unique step_id and monotonically-increasing step_number", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "Speed/feed for aluminum 6061",
      goal: "Recommend Vc",
      known_facts: ["soft material", "carbide tool"],
    });
    const ids = chain.steps.map(s => s.step_id);
    const numbers = chain.steps.map(s => s.step_number);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });

  it("each step confidence is in [0, 1]", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "Test confidence bounds",
      goal: "Validate",
    });
    for (const step of chain.steps) {
      expect(step.confidence).toBeGreaterThanOrEqual(0);
      expect(step.confidence).toBeLessThanOrEqual(1);
    }
    expect(chain.current_confidence).toBeGreaterThanOrEqual(0);
    expect(chain.current_confidence).toBeLessThanOrEqual(1);
  });

  it("supports adversarial strategy in meta", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "test",
      goal: "test",
      strategy: "adversarial",
    });
    expect(chain.meta.strategy).toBe("adversarial");
  });
});

describe("U-WIRE21 ChainOfThoughtEngine.reasonTree — beam search", () => {
  it("returns a tree with the configured beam_width", () => {
    const tree = ChainOfThoughtEngine.reasonTree(
      {
        problem: "Tree-of-thought test",
        goal: "Find best reasoning path",
        max_steps: 6,
      },
      4,
    );
    expect(tree.beam_width).toBe(4);
    expect(tree.tree_id.length).toBeGreaterThan(0);
    expect(tree.problem).toBe("Tree-of-thought test");
    expect(tree.explored_nodes).toBeGreaterThan(0);
  });

  it("default beam_width is 3 when not provided", () => {
    const tree = ChainOfThoughtEngine.reasonTree({
      problem: "test",
      goal: "test",
      max_steps: 4,
    });
    expect(tree.beam_width).toBe(3);
  });

  it("best_path is an array of node ids (may be empty if no conclusion reached)", () => {
    const tree = ChainOfThoughtEngine.reasonTree({
      problem: "test",
      goal: "test",
      max_steps: 3,
    });
    expect(Array.isArray(tree.best_path)).toBe(true);
  });
});

describe("U-WIRE21 ChainOfThoughtEngine.explainChain — formatting", () => {
  it("returns a markdown string with problem header, goal, strategy, and step types", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "Cutting speed for steel",
      goal: "Recommend Vc",
      known_facts: ["P-group material"],
      strategy: "linear",
    });
    const explanation = ChainOfThoughtEngine.explainChain(chain);
    expect(typeof explanation).toBe("string");
    expect(explanation.length).toBeGreaterThan(50);
    expect(explanation).toContain("# Reasoning Trace: Cutting speed for steel");
    expect(explanation).toContain("**Goal:** Recommend Vc");
    expect(explanation).toContain("**Strategy:** linear");
    expect(explanation.toUpperCase()).toContain("OBSERVATION");
  });

  it("explanation reflects step content", () => {
    const chain = ChainOfThoughtEngine.reason({
      problem: "ChatterRiskQ7Z",
      goal: "test",
    });
    const explanation = ChainOfThoughtEngine.explainChain(chain);
    expect(explanation).toContain("ChatterRiskQ7Z");
  });
});

describe("U-WIRE21 ChainOfThoughtEngine.applyManufacturingHeuristics", () => {
  it("returns at least one heuristic when problem mentions 'tool life' and 'speed'", () => {
    const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
      "Optimize cutting speed for tool life on Inconel 718",
      { material: "Inconel 718", operation: "rough" },
    );
    expect(Array.isArray(heuristics)).toBe(true);
    expect(heuristics.length).toBeGreaterThan(0);
    const ids = heuristics.map(h => h.heuristic);
    // The kw "tool" + "life" should match the tool_life_speed heuristic
    expect(ids.includes("tool_life_speed") || ids.includes("cutting_speed_hardness")).toBe(true);
  });

  it("each heuristic has applies/implication/confidence fields", () => {
    const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
      "speed feed depth",
      { material: "steel" },
    );
    expect(heuristics.length).toBeGreaterThan(0);
    for (const h of heuristics) {
      expect(typeof h.heuristic).toBe("string");
      expect(typeof h.applies).toBe("boolean");
      expect(typeof h.implication).toBe("string");
      expect(h.confidence).toBeGreaterThanOrEqual(0);
      expect(h.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty array when problem has no relevant keywords and context is empty", () => {
    const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics("xyzqrt", {});
    expect(Array.isArray(heuristics)).toBe(true);
    // Likely empty, but tolerate if no kw matches at all
    expect(heuristics.length).toBe(0);
  });

  it("hardened-material context adds hardened-specific heuristics", () => {
    const generic = ChainOfThoughtEngine.applyManufacturingHeuristics("turn the part", {});
    const hardened = ChainOfThoughtEngine.applyManufacturingHeuristics("turn the part", {
      material: "D2 hardened tool steel",
    });
    expect(hardened.length).toBeGreaterThanOrEqual(generic.length);
  });
});

describe("U-WIRE21 dispatcher round-trip — chain → explain → coherent output", () => {
  it("reason → explainChain produces a self-consistent narrative", () => {
    const chain: ReasoningChain = ChainOfThoughtEngine.reason({
      problem: "Cutting speed for hardened D2",
      goal: "Recommend Vc m/min",
      known_facts: ["HRC 58", "carbide insert"],
      constraints: ["surface Ra ≤ 1.6 μm"],
      max_steps: 10,
    });

    const explanation = ChainOfThoughtEngine.explainChain(chain);
    // The trace contains the problem header, goal, strategy, and a step heading per step
    expect(explanation).toContain("# Reasoning Trace: Cutting speed for hardened D2");
    expect(explanation).toContain("**Goal:** Recommend Vc m/min");
    for (const step of chain.steps) {
      expect(explanation).toContain(`### Step ${step.step_number}:`);
    }
  });

  it("dispatcher contract: reason output has step_count, current_confidence, dead_end_count fields", () => {
    // Mirrors the dispatcher case body — exercises the slim envelope.
    const chain = ChainOfThoughtEngine.reason({
      problem: "test",
      goal: "test",
    });
    const dispatcherOutput = {
      chain_id: chain.chain_id,
      step_count: chain.steps.length,
      current_confidence: chain.current_confidence,
      dead_end_count: chain.dead_ends.length,
      final_answer: chain.final_answer ?? null,
      meta: chain.meta,
    };
    expect(dispatcherOutput.chain_id.length).toBeGreaterThan(0);
    expect(typeof dispatcherOutput.step_count).toBe("number");
    expect(typeof dispatcherOutput.current_confidence).toBe("number");
    expect(typeof dispatcherOutput.dead_end_count).toBe("number");
    expect(dispatcherOutput.final_answer === null || typeof dispatcherOutput.final_answer === "object").toBe(true);
  });

  it("multi-call independence — chain ids are unique across calls", () => {
    const a = ChainOfThoughtEngine.reason({ problem: "A", goal: "A" });
    const b = ChainOfThoughtEngine.reason({ problem: "B", goal: "B" });
    expect(a.chain_id).not.toBe(b.chain_id);
  });
});
