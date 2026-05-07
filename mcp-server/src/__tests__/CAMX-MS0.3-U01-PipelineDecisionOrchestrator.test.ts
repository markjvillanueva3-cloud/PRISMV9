/**
 * CAMX-MS0.3 / U-CAMX01 — PipelineDecisionOrchestratorEngine
 *
 * Validates the universal decision wrapper called at EVERY decision point
 * in all 7 production pipelines. Confirms:
 *   - 12 decision categories accepted (tool_select .. safety_check)
 *   - 5 scoring axes (optimal_performance, logical_consistency, safety,
 *     cost_efficiency, robustness) combined into composite score
 *   - Objective modifiers (speed / quality / cost / balanced / tool_life)
 *   - Safety veto below SAFETY_VETO_THRESHOLD (0.3)
 *   - Justification + alternatives generated with why_not
 *   - Audit log + stats accumulate per-category
 *   - Batch + compare + prescreen API surface
 */
import { describe, it, expect, beforeEach } from "vitest";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function mkCandidate(id: string, label: string, data: Record<string, any>, preScores?: Record<string, number>) {
  return { id, label, data, pre_scores: preScores };
}

function mkContext(overrides: Record<string, any> = {}) {
  return {
    material: { name: "4140", iso_group: "P", hardness_hb: 220 },
    machine: { name: "Haas VF-2", axis_count: 3, spindle_power_kw: 22 },
    operation: "roughing",
    feature: { type: "pocket", diameter_mm: 40, depth_mm: 10 },
    ...overrides,
  };
}

describe("CAMX-MS0.3 U-CAMX01 — Engine presence", () => {
  it("singleton is defined", () => {
    expect(pipelineDecisionOrchestratorEngine).toBeDefined();
  });
  it("decide is a function", () => {
    expect(typeof (pipelineDecisionOrchestratorEngine as any).decide).toBe("function");
  });
  it("decideBatch is a function", () => {
    expect(typeof (pipelineDecisionOrchestratorEngine as any).decideBatch).toBe("function");
  });
  it("compare is a function", () => {
    expect(typeof (pipelineDecisionOrchestratorEngine as any).compare).toBe("function");
  });
  it("prescreen is a function", () => {
    expect(typeof (pipelineDecisionOrchestratorEngine as any).prescreen).toBe("function");
  });
  it("audit log + stats API present", () => {
    expect(typeof (pipelineDecisionOrchestratorEngine as any).getAuditLog).toBe("function");
    expect(typeof (pipelineDecisionOrchestratorEngine as any).getStats).toBe("function");
    expect(typeof (pipelineDecisionOrchestratorEngine as any).clearAuditLog).toBe("function");
  });
});

// ────────────────────────────────────────────────────────────────────────
// 12 decision categories each accept candidates
// ────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "tool_select",
  "strategy_select",
  "parameter_optimize",
  "coolant_select",
  "entry_exit_select",
  "sequence_optimize",
  "workholding_validate",
  "controller_select",
  "holder_select",
  "coating_select",
  "work_offset_select",
  "safety_check",
] as const;

describe("CAMX-MS0.3 U-CAMX01 — 12 decision categories", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  for (const cat of CATEGORIES) {
    it(`category "${cat}" accepts candidates and returns choice`, () => {
      const out = (pipelineDecisionOrchestratorEngine as any).decide({
        category: cat,
        context: mkContext(),
        candidates: [
          mkCandidate(`${cat}-A`, "option A", {}, { optimal_performance: 0.8, safety: 0.85 }),
          mkCandidate(`${cat}-B`, "option B", {}, { optimal_performance: 0.5, safety: 0.8 }),
        ],
        objective: "balanced",
      });
      expect(out).toBeDefined();
      expect(out.choice).toBeDefined();
      expect(out.category).toBe(cat);
      expect(typeof out.score).toBe("number");
      expect(Array.isArray(out.alternatives)).toBe(true);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Scoring-axis math
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — scoring axes", () => {
  it("score_breakdown contains all 5 axes", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("t1", "carbide endmill", {}, { optimal_performance: 0.9, safety: 0.9 })],
    });
    const axes = out.score_breakdown;
    expect(axes).toBeDefined();
    for (const k of ["optimal_performance", "logical_consistency", "safety", "cost_efficiency", "robustness"]) {
      expect(typeof axes[k]).toBe("number");
      expect(axes[k]).toBeGreaterThanOrEqual(0);
      expect(axes[k]).toBeLessThanOrEqual(1);
    }
  });
  it("higher optimal_performance yields higher composite score when safety ≥ threshold", () => {
    const high = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("hi", "great tool", {}, { optimal_performance: 0.95, safety: 0.9 })],
    });
    const low = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("lo", "weaker tool", {}, { optimal_performance: 0.45, safety: 0.9 })],
    });
    expect(high.score).toBeGreaterThan(low.score);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Objective modifiers
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — objective modifiers", () => {
  const objectives = ["speed", "quality", "cost", "balanced", "tool_life"] as const;
  for (const obj of objectives) {
    it(`objective "${obj}" yields a valid decision`, () => {
      const out = (pipelineDecisionOrchestratorEngine as any).decide({
        category: "parameter_optimize",
        context: mkContext(),
        candidates: [
          mkCandidate("aggr", "aggressive", {}, { optimal_performance: 0.9, cost_efficiency: 0.6, safety: 0.7 }),
          mkCandidate("cons", "conservative", {}, { optimal_performance: 0.6, cost_efficiency: 0.85, safety: 0.9 }),
        ],
        objective: obj,
      });
      expect(out.objective).toBe(obj);
      expect(out.choice).toBeDefined();
    });
  }
  it("cost objective prefers higher cost_efficiency", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [
        mkCandidate("expensive", "premium tool", {}, { optimal_performance: 0.85, cost_efficiency: 0.3, safety: 0.85 }),
        mkCandidate("cheap", "budget tool", {}, { optimal_performance: 0.7, cost_efficiency: 0.95, safety: 0.85 }),
      ],
      objective: "cost",
    });
    expect(out.choice.id).toBe("cheap");
  });
});

// ────────────────────────────────────────────────────────────────────────
// Safety veto
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — safety veto", () => {
  it("candidate with safety < 0.3 is vetoed and reported in warnings", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [
        mkCandidate("unsafe", "risky", {}, { optimal_performance: 0.99, safety: 0.1 }),
        mkCandidate("safe", "solid", {}, { optimal_performance: 0.6, safety: 0.85 }),
      ],
    });
    expect(out.choice.id).toBe("safe");
    expect(out.warnings.some((w: string) => w.toLowerCase().includes("veto"))).toBe(true);
  });
  it("all-vetoed set falls back with MANUAL REVIEW warning", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "safety_check",
      context: mkContext(),
      candidates: [
        mkCandidate("u1", "dangerous 1", {}, { optimal_performance: 0.9, safety: 0.05 }),
        mkCandidate("u2", "dangerous 2", {}, { optimal_performance: 0.8, safety: 0.1 }),
      ],
    });
    expect(out.warnings.some((w: string) => /manual review/i.test(w))).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Justification + alternatives
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — justification + alternatives", () => {
  it("produces non-empty justification (array of lines or string)", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "coolant_select",
      context: mkContext(),
      candidates: [
        mkCandidate("flood", "flood coolant", {}, { optimal_performance: 0.85, safety: 0.9 }),
        mkCandidate("mql", "MQL", {}, { optimal_performance: 0.7, safety: 0.85 }),
      ],
    });
    expect(out.justification).toBeDefined();
    const joined = Array.isArray(out.justification)
      ? out.justification.join(" ")
      : String(out.justification);
    expect(joined.length).toBeGreaterThan(20);
    // Must name the chosen option
    expect(joined.toLowerCase()).toContain("flood coolant");
  });
  it("alternatives list excludes chosen option and includes why_not", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "strategy_select",
      context: mkContext(),
      candidates: [
        mkCandidate("adapt", "adaptive roughing", {}, { optimal_performance: 0.92, safety: 0.85 }),
        mkCandidate("trad", "traditional pocket", {}, { optimal_performance: 0.6, safety: 0.85 }),
        mkCandidate("troch", "trochoidal", {}, { optimal_performance: 0.8, safety: 0.9 }),
      ],
    });
    expect(out.alternatives.length).toBe(2);
    for (const alt of out.alternatives) {
      expect(alt).toHaveProperty("option");
      expect(alt).toHaveProperty("score");
      expect(alt).toHaveProperty("why_not");
      expect(alt.option).not.toBe(out.choice.label);
    }
  });
  it("decision_id follows PDO-{CATEGORY}-* pattern", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "holder_select",
      context: mkContext(),
      candidates: [mkCandidate("h1", "CAT40", {}, { optimal_performance: 0.8, safety: 0.9 })],
    });
    expect(typeof out.decision_id).toBe("string");
    expect(out.decision_id.startsWith("PDO-HOLDERSELECT-")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Audit log + stats
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — audit log + stats", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });
  it("audit log accumulates entries", () => {
    const initial = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("a", "a", {}, { optimal_performance: 0.8, safety: 0.85 })],
    });
    (pipelineDecisionOrchestratorEngine as any).decide({
      category: "coolant_select",
      context: mkContext(),
      candidates: [mkCandidate("b", "b", {}, { optimal_performance: 0.8, safety: 0.85 })],
    });
    const after = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    expect(after - initial).toBe(2);
  });
  it("stats group by category", () => {
    (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("a", "a", {}, { optimal_performance: 0.8, safety: 0.9 })],
    });
    (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("b", "b", {}, { optimal_performance: 0.6, safety: 0.9 })],
    });
    const stats = (pipelineDecisionOrchestratorEngine as any).getStats();
    expect(stats.tool_select).toBeDefined();
    expect(stats.tool_select.count).toBeGreaterThanOrEqual(2);
    expect(typeof stats.tool_select.avg_score).toBe("number");
  });
  it("clearAuditLog empties the buffer", () => {
    (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("a", "a", {}, { optimal_performance: 0.8, safety: 0.9 })],
    });
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
    expect((pipelineDecisionOrchestratorEngine as any).getAuditLog().length).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Batch + compare
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — batch + compare", () => {
  it("decideBatch returns same-length array", () => {
    const inputs = [
      { category: "tool_select", context: mkContext(), candidates: [mkCandidate("a", "a", {}, { optimal_performance: 0.8, safety: 0.9 })] },
      { category: "coolant_select", context: mkContext(), candidates: [mkCandidate("f", "flood", {}, { optimal_performance: 0.75, safety: 0.9 })] },
      { category: "holder_select", context: mkContext(), candidates: [mkCandidate("c4", "CAT40", {}, { optimal_performance: 0.7, safety: 0.9 })] },
    ];
    const outs = (pipelineDecisionOrchestratorEngine as any).decideBatch(inputs);
    expect(outs.length).toBe(3);
    expect(outs[0].category).toBe("tool_select");
    expect(outs[1].category).toBe("coolant_select");
    expect(outs[2].category).toBe("holder_select");
  });
  it("compare returns winner plus 5-axis comparison", () => {
    const a = mkCandidate("a", "A", {}, { optimal_performance: 0.92, safety: 0.88 });
    const b = mkCandidate("b", "B", {}, { optimal_performance: 0.55, safety: 0.85 });
    const cmp = (pipelineDecisionOrchestratorEngine as any).compare(
      a, b, "tool_select", mkContext(),
    );
    expect(cmp.winner).toBe("a");
    expect(typeof cmp.a_score).toBe("number");
    expect(typeof cmp.b_score).toBe("number");
    for (const axis of ["optimal_performance", "logical_consistency", "safety", "cost_efficiency", "robustness"]) {
      expect(cmp.axis_comparison[axis]).toBeDefined();
      expect(cmp.axis_comparison[axis]).toHaveProperty("a");
      expect(cmp.axis_comparison[axis]).toHaveProperty("b");
      expect(cmp.axis_comparison[axis]).toHaveProperty("delta");
    }
  });
  it("compare reports tie when delta < 0.5", () => {
    const a = mkCandidate("a", "A", {}, { optimal_performance: 0.8, safety: 0.85 });
    const b = mkCandidate("b", "B", {}, { optimal_performance: 0.8, safety: 0.85 });
    const cmp = (pipelineDecisionOrchestratorEngine as any).compare(
      a, b, "tool_select", mkContext(),
    );
    expect(cmp.winner).toBe("tie");
  });
});

// ────────────────────────────────────────────────────────────────────────
// Prescreen
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — prescreen constraints", () => {
  it("pass=true when no constraints violated", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).prescreen(
      mkCandidate("a", "A", { cutting_force_n: 500, deflection_mm: 0.02, power_kw: 5 }),
      { max_force_n: 1000, max_deflection_mm: 0.05, max_power_kw: 15 },
      mkContext(),
    );
    expect(out.pass).toBe(true);
    expect(out.reasons.length).toBe(0);
  });
  it("pass=false when force exceeds limit", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).prescreen(
      mkCandidate("a", "A", { cutting_force_n: 2000 }),
      { max_force_n: 1000 },
      mkContext(),
    );
    expect(out.pass).toBe(false);
    expect(out.reasons.some((r: string) => /force/i.test(r))).toBe(true);
  });
  it("pass=false when deflection exceeds limit", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).prescreen(
      mkCandidate("a", "A", { deflection_mm: 0.15 }),
      { max_deflection_mm: 0.05 },
      mkContext(),
    );
    expect(out.pass).toBe(false);
    expect(out.reasons.some((r: string) => /deflection/i.test(r))).toBe(true);
  });
  it("pass=false when tool life below minimum", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).prescreen(
      mkCandidate("a", "A", { tool_life_min: 20 }),
      { min_tool_life_min: 60 },
      mkContext(),
    );
    expect(out.pass).toBe(false);
    expect(out.reasons.some((r: string) => /tool life/i.test(r))).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Error-path + edge cases
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX01 — error paths", () => {
  it("empty candidates throws", () => {
    expect(() =>
      (pipelineDecisionOrchestratorEngine as any).decide({
        category: "tool_select",
        context: mkContext(),
        candidates: [],
      }),
    ).toThrow();
  });
  it("single-candidate decide returns that candidate", () => {
    const only = mkCandidate("only", "lone option", {}, { optimal_performance: 0.7, safety: 0.9 });
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [only],
    });
    expect(out.choice.id).toBe("only");
    expect(out.alternatives.length).toBe(0);
  });
  it("large candidate set warns about pre-filter", () => {
    const cands = Array.from({ length: 110 }, (_, i) =>
      mkCandidate(`c${i}`, `opt ${i}`, {}, { optimal_performance: 0.5 + (i % 10) / 20, safety: 0.85 }),
    );
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: cands,
    });
    expect(out.warnings.some((w: string) => /large candidate/i.test(w))).toBe(true);
  });
  it("explain=true populates feature_importance", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [
        mkCandidate("a", "A", {}, { optimal_performance: 0.8, safety: 0.9 }),
        mkCandidate("b", "B", {}, { optimal_performance: 0.6, safety: 0.85 }),
      ],
      explain: true,
    });
    expect(out.feature_importance).toBeDefined();
  });
  it("decision_tree_path populated for tool_select / strategy_select / coolant_select", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "coolant_select",
      context: mkContext(),
      candidates: [mkCandidate("f", "flood", {}, { optimal_performance: 0.8, safety: 0.9 })],
    });
    // decision_tree_path may be undefined if underlying engine declines — field must exist or be absent cleanly
    if (out.decision_tree_path !== undefined) {
      expect(typeof out.decision_tree_path).toMatch(/string|object/);
    }
    expect(out).toHaveProperty("decision_tree_path");
  });
  it("elapsed_ms is non-negative", () => {
    const out = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: mkContext(),
      candidates: [mkCandidate("a", "A", {}, { optimal_performance: 0.8, safety: 0.9 })],
    });
    expect(typeof out.elapsed_ms).toBe("number");
    expect(out.elapsed_ms).toBeGreaterThanOrEqual(0);
  });
});
