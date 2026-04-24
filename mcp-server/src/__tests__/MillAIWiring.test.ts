/**
 * MillAIWiring tests — MILL-MASTER-AI-WIRING / U2-EXTRACT-HELPER
 *
 * Exercises each of the four entry points against REAL PRISM engines
 * (no mocks), per envelope global_contracts.test_legitimacy_rules.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U2-EXTRACT-HELPER)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  rankCandidatesBayesian,
  withPRISMReasoning,
  recordCapabilityUsage,
  budgetedAIPath,
  resetBudgetOverruns,
} from "../engines/MillAIWiring.js";
import { capabilityEffectivenessEngine } from "../engines/CapabilityEffectivenessEngine.js";

// ============================================================================
// rankCandidatesBayesian
// ============================================================================

describe("MillAIWiring.rankCandidatesBayesian", () => {
  it("ranks 3 candidates by posterior and returns them in monotone-non-increasing order", () => {
    const candidates = [
      { id: "A", quality: 0.2, controller_match: 20 },
      { id: "B", quality: 0.9, controller_match: 95 },
      { id: "C", quality: 0.55, controller_match: 60 },
    ];
    const { best, ranked } = rankCandidatesBayesian({
      problem: "select_best_of_ABC",
      candidates,
      statement: c => `${c.id} is the best candidate`,
      prior: c => c.quality,
      evidence: c => [
        {
          description: `controller_match=${c.controller_match}`,
          strength: c.controller_match / 100,
          reliability: 0.9,
          supports: c.controller_match >= 50,
          source: "controller_match",
        },
      ],
    });

    expect(ranked).toHaveLength(3);
    expect(best).not.toBeNull();
    expect(best!.id).toBe("B");
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].score).toBeLessThanOrEqual(ranked[i - 1].score);
    }
    // Ranks must be 1..N
    expect(ranked.map(r => r.rank)).toEqual([1, 2, 3]);
    // Every candidate preserved (no drops)
    expect(new Set(ranked.map(r => r.candidate.id))).toEqual(new Set(["A", "B", "C"]));
  });

  it("returns empty result for an empty candidate set", () => {
    const result = rankCandidatesBayesian({
      problem: "empty",
      candidates: [] as Array<{ id: string }>,
      statement: c => c.id,
      evidence: () => [],
    });
    expect(result.best).toBeNull();
    expect(result.ranked).toHaveLength(0);
  });

  it("clamps priors outside [0,1] instead of throwing", () => {
    const candidates = [{ id: "x" }, { id: "y" }];
    const { ranked } = rankCandidatesBayesian({
      problem: "clamp_test",
      candidates,
      statement: c => c.id,
      prior: () => 5,                      // out of range — should clamp to 1
      tribalAlignment: () => -2,           // out of range — should clamp to 0
      evidence: c => [
        { description: `ev_${c.id}`, strength: 99, reliability: 0.9, supports: true },
      ],
    });
    expect(ranked.length).toBe(2);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================================================
// withPRISMReasoning
// ============================================================================

describe("MillAIWiring.withPRISMReasoning", () => {
  it("returns a non-null result with branch_count >= 1 and tree_of_thought source", () => {
    const r = withPRISMReasoning({
      question: "choose the best roughing strategy for P20 steel",
      goal: "min_cycle_time",
      available_actions: ["trochoidal", "adaptive", "raster"],
    });
    expect(r).not.toBeNull();
    expect(r!.source).toBe("tree_of_thought");
    expect(r!.branch_count).toBeGreaterThanOrEqual(1);
    expect(r!.max_depth_reached).toBeGreaterThanOrEqual(0);
    expect(r!.confidence).toBeGreaterThanOrEqual(0);
    expect(r!.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(r!.reasoning_chain)).toBe(true);
  });

  it("handles an empty question string without throwing", () => {
    const r = withPRISMReasoning({ question: "" });
    expect(r).not.toBeNull();
    expect(r!.branch_count).toBeGreaterThanOrEqual(1);
  });

  it("respects depth/branches bounds", () => {
    const r = withPRISMReasoning({
      question: "bounded_exploration",
      depth: 2,
      branches: 2,
      beamWidth: 2,
    });
    expect(r).not.toBeNull();
    expect(r!.max_depth_reached).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// recordCapabilityUsage
// ============================================================================

describe("MillAIWiring.recordCapabilityUsage", () => {
  it("appends a success event to the effectiveness engine", () => {
    const cap = "mill_ai_wiring_test_success_" + Date.now();
    const before = capabilityEffectivenessEngine.scoreCapability(cap);
    expect(before.usage_count).toBe(0);

    recordCapabilityUsage({
      capabilityId: cap,
      pillar: "toolpath",
      useAI: "on",
      durationMs: 12.5,
      success: true,
      tokensConsumed: 42,
    });

    const after = capabilityEffectivenessEngine.scoreCapability(cap);
    expect(after.usage_count).toBe(1);
    expect(after.success_rate).toBeCloseTo(1.0, 6);
    expect(after.avg_tokens).toBeCloseTo(42, 6);
  });

  it("appends a failure event and drops success_rate below 1.0", () => {
    const cap = "mill_ai_wiring_test_failure_" + Date.now();
    recordCapabilityUsage({ capabilityId: cap, useAI: "on", durationMs: 5, success: true });
    recordCapabilityUsage({ capabilityId: cap, useAI: "on", durationMs: 5, success: false });

    const score = capabilityEffectivenessEngine.scoreCapability(cap);
    expect(score.usage_count).toBe(2);
    expect(score.success_rate).toBeCloseTo(0.5, 6);
  });
});

// ============================================================================
// budgetedAIPath
// ============================================================================

describe("MillAIWiring.budgetedAIPath", () => {
  beforeEach(() => resetBudgetOverruns());

  it("useAI='off' always calls legacy, never AI", () => {
    let aiCalls = 0;
    let legacyCalls = 0;
    const out = budgetedAIPath(
      "off",
      () => { legacyCalls++; return "LEGACY"; },
      () => { aiCalls++; return "AI"; },
    );
    expect(out).toBe("LEGACY");
    expect(legacyCalls).toBe(1);
    expect(aiCalls).toBe(0);
  });

  it("useAI='on' calls AI path and returns its result", () => {
    let aiCalls = 0;
    const out = budgetedAIPath(
      "on",
      () => "LEGACY",
      () => { aiCalls++; return "AI"; },
    );
    expect(out).toBe("AI");
    expect(aiCalls).toBe(1);
  });

  it("useAI='on' falls back to legacy when AI throws (fail-closed)", () => {
    let legacyCalls = 0;
    const out = budgetedAIPath<string>(
      "on",
      () => { legacyCalls++; return "LEGACY"; },
      () => { throw new Error("ai broke"); },
    );
    expect(out).toBe("LEGACY");
    expect(legacyCalls).toBe(1);
  });

  it("useAI='auto' takes AI first call, auto-downgrades the next call after an overrun", () => {
    const capId = "auto_downgrade_" + Date.now();
    let aiCalls = 0;
    let legacyCalls = 0;

    // First call: AI runs but exceeds the 1 ms budget — sets the overrun flag.
    const r1 = budgetedAIPath(
      "auto",
      () => { legacyCalls++; return "LEGACY"; },
      () => {
        aiCalls++;
        // Busy-wait ~5 ms to exceed the 1 ms budget
        const until = performance.now() + 5;
        while (performance.now() < until) { /* spin */ }
        return "AI";
      },
      { capabilityId: capId, budgetMs: 1 },
    );
    expect(r1).toBe("AI");
    expect(aiCalls).toBe(1);

    // Second call: same capability, should downgrade to legacy.
    const r2 = budgetedAIPath(
      "auto",
      () => { legacyCalls++; return "LEGACY"; },
      () => { aiCalls++; return "AI"; },
      { capabilityId: capId, budgetMs: 1 },
    );
    expect(r2).toBe("LEGACY");
    expect(legacyCalls).toBe(1);
    expect(aiCalls).toBe(1); // AI path NOT re-entered
  });

  it("resetBudgetOverruns clears the downgrade flag", () => {
    const capId = "reset_test_" + Date.now();
    // Trigger an overrun
    budgetedAIPath(
      "auto",
      () => "LEGACY",
      () => {
        const until = performance.now() + 5;
        while (performance.now() < until) { /* spin */ }
        return "AI";
      },
      { capabilityId: capId, budgetMs: 1 },
    );
    // Next would downgrade — reset and verify AI runs again.
    resetBudgetOverruns();
    let aiCalls = 0;
    const out = budgetedAIPath(
      "auto",
      () => "LEGACY",
      () => { aiCalls++; return "AI"; },
      { capabilityId: capId, budgetMs: 1000 },
    );
    expect(out).toBe("AI");
    expect(aiCalls).toBe(1);
  });
});
