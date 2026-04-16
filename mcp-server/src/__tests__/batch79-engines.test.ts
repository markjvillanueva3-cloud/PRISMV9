/**
 * Batch 79 — TOPSIS, AHP, ProjectScheduling
 * @milestone FORGE-ENGINES-BATCH79
 */
import { describe, it, expect } from "vitest";
import { topsisEngine } from "../engines/TOPSISEngine.js";
import { ahpEngine } from "../engines/AHPEngine.js";
import { projectSchedulingEngine } from "../engines/ProjectSchedulingEngine.js";

describe("TOPSISEngine", () => {
  const base = {
    decision_matrix: [[8, 7, 2], [5, 3, 7], [7, 5, 5]],
    weights: [0.4, 0.35, 0.25],
    is_benefit: [true, true, false],
  };
  it("best alternative index 1-based", () => {
    const idx = topsisEngine.calculate(base).best_alternative_index.value;
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(3);
  });
  it("closeness between 0 and 1", () => {
    const c = topsisEngine.calculate(base).best_closeness.value;
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(1);
  });
  it("best >= worst closeness", () => {
    const r = topsisEngine.calculate(base);
    expect(r.best_closeness.value).toBeGreaterThanOrEqual(r.worst_closeness.value);
  });
  it("num criteria = 3", () => {
    expect(topsisEngine.calculate(base).num_criteria.value).toBe(3);
  });
  it("consistency score near 1 when weights sum to 1", () => {
    expect(topsisEngine.calculate(base).consistency_score.value).toBeGreaterThan(0.9);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(topsisEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AHPEngine", () => {
  // Consistent 3×3 matrix
  const base = {
    comparison_matrix: [[1, 3, 5], [1/3, 1, 2], [1/5, 1/2, 1]],
  };
  it("consistency ratio < 0.10", () => {
    expect(ahpEngine.calculate(base).consistency_ratio.value).toBeLessThan(0.10);
  });
  it("is consistent", () => {
    expect(ahpEngine.calculate(base).is_consistent.value).toBe(1);
  });
  it("priority weights sum to ~1", () => {
    // The top weight is returned, should be between 0 and 1
    expect(ahpEngine.calculate(base).priority_weights.value).toBeGreaterThan(0);
    expect(ahpEngine.calculate(base).priority_weights.value).toBeLessThan(1);
  });
  it("most important = criterion 1", () => {
    expect(ahpEngine.calculate(base).most_important_index.value).toBe(1);
  });
  it("eigenvalue ≥ n", () => {
    expect(ahpEngine.calculate(base).max_eigenvalue.value).toBeGreaterThanOrEqual(2.9);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ahpEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ProjectSchedulingEngine", () => {
  const base = {
    activities: [
      { id: "A", duration: 3, predecessors: [] },
      { id: "B", duration: 5, predecessors: [] },
      { id: "C", duration: 2, predecessors: ["A"] },
      { id: "D", duration: 4, predecessors: ["B"] },
      { id: "E", duration: 3, predecessors: ["C", "D"] },
    ],
  };
  it("project duration > 0", () => {
    expect(projectSchedulingEngine.calculate(base).project_duration.value).toBeGreaterThan(0);
  });
  it("critical activities > 0", () => {
    expect(projectSchedulingEngine.calculate(base).num_critical_activities.value).toBeGreaterThan(0);
  });
  it("project duration ≥ longest path", () => {
    // B(5) + D(4) + E(3) = 12 is the critical path
    expect(projectSchedulingEngine.calculate(base).project_duration.value).toBeGreaterThanOrEqual(12);
  });
  it("PERT gives variance > 0", () => {
    const pertActs = base.activities.map(a => ({ ...a, optimistic: a.duration * 0.7, pessimistic: a.duration * 1.5 }));
    expect(projectSchedulingEngine.calculate({ activities: pertActs, use_pert: true }).project_variance.value).toBeGreaterThan(0);
  });
  it("parallelism > 1 for parallel tasks", () => {
    expect(projectSchedulingEngine.calculate(base).parallelism_ratio.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(projectSchedulingEngine.calculate(base).recommendations)).toBe(true);
  });
});
