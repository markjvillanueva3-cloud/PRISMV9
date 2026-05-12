import { describe, it, expect } from "vitest";
import {
  strategyWorstCaseSelectorEngine,
  StrategyWorstCaseSelectorEngine,
  type RobustCandidate,
  type UncertaintyScenario,
} from "../engines/StrategyWorstCaseSelectorEngine.js";

const SCENARIOS: UncertaintyScenario[] = [
  { id: "nominal", factors: { material_strength: 1.0, tool_dia: 1.0 } },
  { id: "soft_mat", factors: { material_strength: 0.85, tool_dia: 1.0 } },
  { id: "hard_mat", factors: { material_strength: 1.15, tool_dia: 1.0 } },
  { id: "oversize_tool", factors: { material_strength: 1.0, tool_dia: 1.02 } },
];

const C_AGGRESSIVE: RobustCandidate = {
  strategy_id: "aggressive",
  utility_nominal: 0.90,
  sensitivity: { material_strength: -2.0, tool_dia: -0.8 },
};

const C_CONSERVATIVE: RobustCandidate = {
  strategy_id: "conservative",
  utility_nominal: 0.75,
  sensitivity: { material_strength: -0.1, tool_dia: -0.05 },
};

const C_MODERATE: RobustCandidate = {
  strategy_id: "moderate",
  utility_nominal: 0.82,
  sensitivity: { material_strength: -0.4, tool_dia: -0.15 },
};

describe("StrategyWorstCaseSelectorEngine", () => {
  it("exports a singleton", () => {
    expect(strategyWorstCaseSelectorEngine).toBeInstanceOf(StrategyWorstCaseSelectorEngine);
  });

  it("worstCase finds the lowest-utility scenario", () => {
    const r = strategyWorstCaseSelectorEngine.worstCase(C_AGGRESSIVE, SCENARIOS);
    // aggressive has strong negative sensitivity to material_strength;
    // scenario "hard_mat" (1.15) hurts it most
    expect(r.worst_case_scenario).toBe("hard_mat");
  });

  it("worstCase reports nominal utility unchanged", () => {
    const r = strategyWorstCaseSelectorEngine.worstCase(C_CONSERVATIVE, SCENARIOS);
    expect(r.nominal_utility).toBe(0.75);
  });

  it("worstCase computes robustness_ratio = worst/nominal", () => {
    const r = strategyWorstCaseSelectorEngine.worstCase(C_CONSERVATIVE, SCENARIOS);
    expect(r.robustness_ratio).toBeCloseTo(r.worst_case_utility / r.nominal_utility, 3);
  });

  it("worstCase returns one utility per scenario", () => {
    const r = strategyWorstCaseSelectorEngine.worstCase(C_AGGRESSIVE, SCENARIOS);
    expect(r.scenario_utilities).toHaveLength(SCENARIOS.length);
  });

  it("worstCase: conservative retains more of nominal than aggressive", () => {
    const a = strategyWorstCaseSelectorEngine.worstCase(C_AGGRESSIVE, SCENARIOS);
    const c = strategyWorstCaseSelectorEngine.worstCase(C_CONSERVATIVE, SCENARIOS);
    expect(c.robustness_ratio).toBeGreaterThan(a.robustness_ratio);
  });

  it("worstCase throws on empty scenarios", () => {
    expect(() => strategyWorstCaseSelectorEngine.worstCase(C_AGGRESSIVE, [])).toThrow();
  });

  it("robustSelect returns result per candidate", () => {
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_AGGRESSIVE, C_CONSERVATIVE, C_MODERATE],
      SCENARIOS,
    );
    expect(r.results).toHaveLength(3);
  });

  it("robustSelect nominal_winner_id = argmax(utility_nominal)", () => {
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_AGGRESSIVE, C_CONSERVATIVE, C_MODERATE],
      SCENARIOS,
    );
    expect(r.nominal_winner_id).toBe("aggressive");
  });

  it("robustSelect robust_winner may differ from nominal when uncertainty is high", () => {
    // Aggressive: 0.90 with -2.0 material sensitivity; under hard_mat (1.15): 0.90·(1 - 2.0·0.15) = 0.90·0.7 = 0.63
    // Moderate: 0.82 with -0.4 material; under hard_mat: 0.82·0.94 = 0.771
    // Conservative: 0.75 with -0.1 material; under hard_mat: 0.75·0.985 = 0.739
    // → moderate wins worst-case at 0.771, while aggressive won nominal at 0.90.
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_AGGRESSIVE, C_CONSERVATIVE, C_MODERATE],
      SCENARIOS,
    );
    expect(r.robust_winner_id).toBe("moderate");
    expect(r.selection_changed).toBe(true);
  });

  it("robustSelect: if nominal also most robust, selection_changed=false", () => {
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_CONSERVATIVE],
      SCENARIOS,
    );
    expect(r.selection_changed).toBe(false);
  });

  it("winner matches robust_winner_id", () => {
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_AGGRESSIVE, C_CONSERVATIVE],
      SCENARIOS,
    );
    expect(r.winner.strategy_id).toBe(r.robust_winner_id);
  });

  it("scenarios round-tripped through selection", () => {
    const r = strategyWorstCaseSelectorEngine.robustSelect(
      [C_CONSERVATIVE, C_MODERATE],
      SCENARIOS,
    );
    expect(r.scenarios).toEqual(SCENARIOS);
  });

  it("throws on empty candidates", () => {
    expect(() => strategyWorstCaseSelectorEngine.robustSelect([], SCENARIOS)).toThrow();
  });

  it("throws on empty scenarios in robustSelect", () => {
    expect(() => strategyWorstCaseSelectorEngine.robustSelect([C_CONSERVATIVE], [])).toThrow();
  });

  it("missing sensitivity key treated as zero (no impact)", () => {
    const insensitive: RobustCandidate = {
      strategy_id: "flat",
      utility_nominal: 0.80,
      sensitivity: {}, // no keys
    };
    const r = strategyWorstCaseSelectorEngine.worstCase(insensitive, SCENARIOS);
    // All scenario utilities should equal nominal since no sensitivity
    expect(r.worst_case_utility).toBeCloseTo(0.80, 3);
    expect(r.robustness_ratio).toBeCloseTo(1.0, 3);
  });

  it("preserves meta through worstCase", () => {
    const with_meta: RobustCandidate = { ...C_CONSERVATIVE, meta: { priority: "safety" } };
    const r = strategyWorstCaseSelectorEngine.worstCase(with_meta, SCENARIOS);
    expect(r.meta).toEqual({ priority: "safety" });
  });

  it("utility never goes negative even with extreme factors", () => {
    const extreme: UncertaintyScenario[] = [
      { id: "catastrophic", factors: { material_strength: 10.0 } },
    ];
    const r = strategyWorstCaseSelectorEngine.worstCase(C_AGGRESSIVE, extreme);
    expect(r.worst_case_utility).toBeGreaterThanOrEqual(0);
  });
});
