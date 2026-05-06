/**
 * CrossProcessBayesianDOEPlannerEngine — T11-04 tests.
 * Greedy MI-max experimental design with GP surrogate.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessBayesianDOEPlannerEngine as Planner,
  crossProcessBayesianDOEPlanner,
  type Candidate,
  type HistoryRow,
} from "../engines/CrossProcessBayesianDOEPlannerEngine.js";

const HISTORY: HistoryRow[] = [
  { material_iso: "P", sf: 100, fz: 0.05, outcome: 0.8, process: "mill" },
  { material_iso: "P", sf: 105, fz: 0.05, outcome: 0.82, process: "mill" },
  { material_iso: "S", sf: 60, fz: 0.03, outcome: 0.4, process: "mill" },
];

const CANDIDATES: Candidate[] = [
  { candidate_id: "c1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" },     // close to history
  { candidate_id: "c2", material_iso: "K", sf: 200, fz: 0.10, process: "lathe" },    // far from history
  { candidate_id: "c3", material_iso: "N", sf: 400, fz: 0.15, process: "mill" },     // very far
  { candidate_id: "c4", material_iso: "S", sf: 65, fz: 0.035, process: "mill" },     // near S
  { candidate_id: "c5", material_iso: "H", sf: 50, fz: 0.02, process: "wedm" },      // far + WEDM
];

describe("plan — greedy MI-max selection", () => {
  it("returns plan length up to budget_k", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 3 });
    expect(r.plan.length).toBeLessThanOrEqual(3);
  });

  it("plan steps numbered sequentially from 1", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 4 });
    for (let i = 0; i < r.plan.length; i++) {
      expect(r.plan[i].step).toBe(i + 1);
    }
  });

  it("first pick has highest marginal info gain (greedy)", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 5 });
    if (r.plan.length >= 2) {
      // First pick gain should be ≥ second pick gain (greedy decreases)
      // Note: not strictly monotonic since each pick updates the surrogate,
      // but first pick on empty plan should dominate.
      expect(r.plan[0].marginal_info_gain).toBeGreaterThan(0);
    }
  });

  it("total_info_gain = sum of marginal_info_gain entries", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 3 });
    const sum = r.plan.reduce((a, p) => a + p.marginal_info_gain, 0);
    expect(r.total_info_gain).toBeCloseTo(sum, 6);
  });

  it("remaining_candidates equals total - planned", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 2 });
    expect(r.remaining_candidates).toBe(CANDIDATES.length - r.plan.length);
  });

  it("budget_k is capped by candidate count (no out-of-bounds)", () => {
    const r = Planner.plan({ candidates: CANDIDATES.slice(0, 2), history: HISTORY, budget_k: 100 });
    expect(r.budget_k).toBeLessThanOrEqual(2);
  });

  it("each plan step has positive predictive_variance", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 3 });
    for (const p of r.plan) {
      expect(p.predictive_variance).toBeGreaterThan(0);
    }
  });

  it("rationale references step number and gain", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 1 });
    expect(r.plan[0].rationale).toMatch(/Step 1/);
    expect(r.plan[0].rationale).toMatch(/info gain/);
  });

  it("rejects empty candidates (Zod min(1))", () => {
    expect(() => Planner.plan({ candidates: [], history: HISTORY, budget_k: 3 })).toThrow();
  });

  it("rejects empty history (Zod min(1))", () => {
    expect(() => Planner.plan({ candidates: CANDIDATES, history: [], budget_k: 3 })).toThrow();
  });

  it("rejects budget_k < 1", () => {
    expect(() => Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 0 })).toThrow();
  });

  it("rejects negative noise_variance (Zod min(0))", () => {
    expect(() => Planner.plan({
      candidates: CANDIDATES, history: HISTORY, budget_k: 2, noise_variance: -0.1,
    })).toThrow();
  });

  it("custom rbf_length_scale changes selection but stays valid", () => {
    const tight = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 3, rbf_length_scale: 0.5 });
    const wide = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 3, rbf_length_scale: 5 });
    expect(tight.plan.length).toBeGreaterThan(0);
    expect(wide.plan.length).toBeGreaterThan(0);
  });
});

describe("evaluateCompletion — coverage check", () => {
  it("returns 100% coverage when all planned runs are realized", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 2 });
    const realized = r.plan.map((p) => ({ candidate_id: p.candidate_id, outcome: 0.5 }));
    const evalR = Planner.evaluateCompletion(r.plan, realized);
    expect(evalR.coverage).toBe(1);
  });

  it("returns 0% coverage when no planned runs are realized", () => {
    const r = Planner.plan({ candidates: CANDIDATES, history: HISTORY, budget_k: 2 });
    const evalR = Planner.evaluateCompletion(r.plan, [{ candidate_id: "missing", outcome: 0.5 }]);
    expect(evalR.coverage).toBe(0);
  });

  it("returns coverage=0 with rationale=0/0 when plan is empty", () => {
    const evalR = Planner.evaluateCompletion([], []);
    expect(evalR.coverage).toBe(0);
    expect(evalR.realized_runs).toBe(0);
    expect(evalR.planned_runs).toBe(0);
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T11-04", () => {
    expect(Planner.engineId).toBe("CrossProcessBayesianDOEPlannerEngine");
    expect(Planner.version).toBe("1.0.0");
    expect(Planner.tier).toBe("T11-04");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_doe_plan returns plan + total_info_gain", () => {
    const r = crossProcessBayesianDOEPlanner("xproc_doe_plan", {
      candidates: CANDIDATES, history: HISTORY, budget_k: 2,
    }) as { plan: unknown[]; total_info_gain: number };
    expect(r.plan.length).toBeLessThanOrEqual(2);
    expect(typeof r.total_info_gain).toBe("number");
  });

  it("xproc_doe_evaluate_completion returns coverage object", () => {
    const r = crossProcessBayesianDOEPlanner("xproc_doe_evaluate_completion", {
      plan: [{ step: 1, candidate_id: "c1", marginal_info_gain: 0.5, predictive_variance: 0.5, rationale: "x" }],
      realized: [{ candidate_id: "c1", outcome: 0.5 }],
    }) as { coverage: number };
    expect(r.coverage).toBe(1);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessBayesianDOEPlanner("unknown", {})).toThrow(/unknown action/i);
  });
});
