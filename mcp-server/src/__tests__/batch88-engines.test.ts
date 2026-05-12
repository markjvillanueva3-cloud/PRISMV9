/**
 * Batch 88 — TransportationProblem, AssignmentProblem, MarkovDecision
 * @milestone FORGE-ENGINES-BATCH88
 */
import { describe, it, expect } from "vitest";
import { transportationProblemEngine } from "../engines/TransportationProblemEngine.js";
import { assignmentProblemEngine } from "../engines/AssignmentProblemEngine.js";
import { markovDecisionEngine } from "../engines/MarkovDecisionEngine.js";

describe("TransportationProblemEngine", () => {
  const base = {
    costs: [[2, 3, 1], [5, 4, 8], [5, 6, 8]],
    supply: [250, 350, 400],
    demand: [200, 300, 500],
  };
  it("total cost > 0", () => {
    expect(transportationProblemEngine.calculate(base).total_cost.value).toBeGreaterThan(0);
  });
  it("balanced problem detected", () => {
    expect(transportationProblemEngine.calculate(base).is_balanced.value).toBe(1);
  });
  it("num allocations ≥ m+n-1", () => {
    const r = transportationProblemEngine.calculate(base);
    expect(r.num_allocations.value).toBeGreaterThanOrEqual(
      r.num_sources.value + r.num_destinations.value - 1
    );
  });
  it("utilization near 100%", () => {
    expect(transportationProblemEngine.calculate(base).utilization_pct.value).toBeGreaterThan(90);
  });
  it("avg cost > 0", () => {
    expect(transportationProblemEngine.calculate(base).avg_cost_per_unit.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(transportationProblemEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AssignmentProblemEngine", () => {
  const base = {
    cost_matrix: [
      [9, 2, 7, 8],
      [6, 4, 3, 7],
      [5, 8, 1, 8],
      [7, 6, 9, 4],
    ],
  };
  it("optimal cost > 0", () => {
    expect(assignmentProblemEngine.calculate(base).optimal_cost.value).toBeGreaterThan(0);
  });
  it("all agents assigned", () => {
    expect(assignmentProblemEngine.calculate(base).num_assignments.value).toBe(4);
  });
  it("balanced detected for square matrix", () => {
    expect(assignmentProblemEngine.calculate(base).is_balanced.value).toBe(1);
  });
  it("optimal ≤ sum of row maxes", () => {
    const opt = assignmentProblemEngine.calculate(base).optimal_cost.value;
    const maxSum = base.cost_matrix.reduce((s, row) => s + Math.max(...row), 0);
    expect(opt).toBeLessThanOrEqual(maxSum);
  });
  it("efficiency > 0%", () => {
    expect(assignmentProblemEngine.calculate(base).efficiency_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(assignmentProblemEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("MarkovDecisionEngine", () => {
  // Simple 2-state, 2-action MDP
  const base = {
    num_states: 2,
    transition_probs: [
      [[0.7, 0.3], [0.4, 0.6]], // action 0
      [[0.5, 0.5], [0.2, 0.8]], // action 1
    ],
    rewards: [[5, 10], [2, 1]],
    discount_factor: 0.9,
  };
  it("converges", () => {
    expect(markovDecisionEngine.calculate(base).converged.value).toBe(1);
  });
  it("optimal value > 0 for positive rewards", () => {
    expect(markovDecisionEngine.calculate(base).optimal_value_avg.value).toBeGreaterThan(0);
  });
  it("iterations > 0", () => {
    expect(markovDecisionEngine.calculate(base).num_iterations.value).toBeGreaterThan(0);
  });
  it("higher gamma → higher values", () => {
    const v90 = markovDecisionEngine.calculate({ ...base, discount_factor: 0.9 }).optimal_value_avg.value;
    const v50 = markovDecisionEngine.calculate({ ...base, discount_factor: 0.5 }).optimal_value_avg.value;
    expect(v90).toBeGreaterThan(v50);
  });
  it("num_states matches input", () => {
    expect(markovDecisionEngine.calculate(base).num_states.value).toBe(2);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(markovDecisionEngine.calculate(base).recommendations)).toBe(true);
  });
});
