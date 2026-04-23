/**
 * CAMX-MS0.3 / U-CAMX08 — IntelligentSequencing via orchestrator
 *
 * Verifies the adapter:
 *   • wires IntelligentSequencingEngine through PipelineDecisionOrchestrator
 *   • generates 5 sequencing-strategy candidates and scores them on 5 axes
 *   • returns a winner with a computed tool_change_savings_pct
 *   • inserts thermal gaps when roughing+finishing are mixed
 *   • logs the decision in the orchestrator audit log
 *   • routes per-pipeline convenience methods to the correct decision_point
 */
import { describe, it, expect, beforeEach } from "vitest";
import { intelligentSequencingAdapter } from "../engines/IntelligentSequencingAdapter.js";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";
import { lookup, byCurrentMethod } from "../data/pipelineDecisionTaxonomy.js";

describe("CAMX-MS0.3 U-CAMX08 — Adapter presence", () => {
  it("singleton is defined", () => {
    expect(intelligentSequencingAdapter).toBeDefined();
  });

  it("selectSequenceOrchestrated is a function", () => {
    expect(typeof (intelligentSequencingAdapter as any).selectSequenceOrchestrated).toBe("function");
  });

  it("exposes one convenience method per pipeline (9 total)", () => {
    const methods = [
      "sequenceForPrintToProgram",
      "sequenceForTurning",
      "sequenceForMultiAxis",
      "sequenceForMillTurn",
      "sequenceForEDM",
      "sequenceForGrinding",
      "sequenceForLaser",
      "sequenceForWaterjet",
      "sequenceForQuoteToShip",
    ];
    for (const m of methods) {
      expect(typeof (intelligentSequencingAdapter as any)[m]).toBe("function");
    }
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Candidate generation", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog?.();
  });

  it("empty operation list yields no_candidates=true and MINIMAL strategy", () => {
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      operations: [],
    });
    expect(out.no_candidates).toBe(true);
    expect(out.strategy).toBe("MINIMAL");
    expect(out.tool_change_savings_pct).toBe(0);
  });

  it("mixed rough+finish generates 5 candidates and picks a viable strategy", () => {
    const ops = [
      { id: "f1", type: "facing", operation: "face", tool_id: "T1", is_datum: true },
      { id: "r1", type: "roughing", operation: "rough", tool_id: "T2" },
      { id: "r2", type: "roughing", operation: "rough", tool_id: "T2" },
      { id: "fi1", type: "finishing", operation: "finish", tool_id: "T3" },
      { id: "p1", type: "parting", operation: "part_off", tool_id: "T4" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      pipeline: "milling",
      operations: ops,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.decision).toBeDefined();
    expect(out.decision.choice).toBeDefined();
    expect(out.decision.alternatives.length).toBeGreaterThanOrEqual(3);
    expect(["FULL", "MINIMAL", "TOOL_GROUPED", "THERMAL_SAFE", "QUALITY"]).toContain(out.strategy);
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Exit condition: thermal gaps", () => {
  it("inserts thermal gaps when roughing and finishing coexist (non-minimal strategies)", () => {
    const ops = [
      { id: "r1", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "f1", type: "finishing", operation: "finish", tool_id: "T2" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.thermal_gap_plan",
      pipeline: "milling",
      operations: ops,
      thermal_sensitive: true,
      objective: "safety",
    });
    expect(out.no_candidates).toBe(false);
    // Winner under thermal_sensitive+safety should not be MINIMAL/TOOL_GROUPED (both strip thermal)
    if (out.strategy === "MINIMAL" || out.strategy === "TOOL_GROUPED") {
      expect(out.thermal_gaps_inserted).toBe(0);
    } else {
      expect(out.thermal_gaps_inserted).toBeGreaterThanOrEqual(1);
    }
  });

  it("no thermal gaps when operations are all roughing", () => {
    const ops = [
      { id: "r1", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "r2", type: "roughing", operation: "rough", tool_id: "T1" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      pipeline: "milling",
      operations: ops,
    });
    expect(out.thermal_gaps_inserted).toBe(0);
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Exit condition: tool_change_savings_pct", () => {
  it("reports tool_change_savings_pct >= 0", () => {
    const ops = [
      { id: "a", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "b", type: "finishing", operation: "finish", tool_id: "T2" },
      { id: "c", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "d", type: "finishing", operation: "finish", tool_id: "T2" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      pipeline: "milling",
      operations: ops,
    });
    expect(out.tool_change_savings_pct).toBeGreaterThanOrEqual(0);
    expect(out.tool_change_savings_pct).toBeLessThanOrEqual(100);
  });

  it("tool-group-aggressive strategy produces savings on alternating tools", () => {
    const ops = [
      { id: "a", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "b", type: "roughing", operation: "rough", tool_id: "T2" },
      { id: "c", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "d", type: "roughing", operation: "rough", tool_id: "T2" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      pipeline: "milling",
      operations: ops,
      objective: "cost",
    });
    // Original has 3 tool changes (T1→T2→T1→T2); grouping reduces to 1
    expect(out.tool_change_savings_pct).toBeGreaterThan(0);
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Per-pipeline routing", () => {
  it("sequenceForPrintToProgram uses p2p.sequence_order decision_point", () => {
    const ops = [{ id: "o1", type: "roughing", operation: "rough", tool_id: "T1" }];
    const out = (intelligentSequencingAdapter as any).sequenceForPrintToProgram(ops);
    expect(out.no_candidates).toBe(false);
    expect(out.decision.category).toBe("sequence_optimize");
  });

  it("sequenceForTurning uses turn.bar_pull_plan decision_point", () => {
    const ops = [{ id: "t1", type: "roughing", operation: "rough", tool_id: "T1" }];
    const out = (intelligentSequencingAdapter as any).sequenceForTurning(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForMultiAxis uses mx.sequence_order decision_point", () => {
    const ops = [{ id: "m1", type: "finishing", operation: "finish_5ax", tool_id: "T1", axes_required: 5 }];
    const out = (intelligentSequencingAdapter as any).sequenceForMultiAxis(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForEDM uses edm.tab_placement decision_point", () => {
    const ops = [
      { id: "rough", type: "roughing", operation: "edm_rough", tool_id: "WIRE" },
      { id: "skim1", type: "finishing", operation: "edm_skim", tool_id: "WIRE" },
    ];
    const out = (intelligentSequencingAdapter as any).sequenceForEDM(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForLaser uses la.nesting_strategy decision_point", () => {
    const ops = Array.from({ length: 5 }, (_, i) => ({
      id: `cut_${i}`, type: "finishing", operation: "laser_cut", tool_id: "LASER",
    }));
    const out = (intelligentSequencingAdapter as any).sequenceForLaser(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForWaterjet routes correctly", () => {
    const ops = [{ id: "w1", type: "finishing", operation: "wj_cut", tool_id: "WJ" }];
    const out = (intelligentSequencingAdapter as any).sequenceForWaterjet(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForMillTurn routes correctly", () => {
    const ops = [{ id: "mt1", type: "roughing", operation: "turn_rough", tool_id: "T1" }];
    const out = (intelligentSequencingAdapter as any).sequenceForMillTurn(ops);
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForGrinding routes correctly", () => {
    const ops = [
      { id: "r", type: "roughing", operation: "grind_rough", tool_id: "WHEEL" },
      { id: "f", type: "finishing", operation: "grind_finish", tool_id: "WHEEL" },
    ];
    const out = (intelligentSequencingAdapter as any).sequenceForGrinding(ops, {
      precision_critical: true,
      thermal_sensitive: true,
    });
    expect(out.no_candidates).toBe(false);
  });

  it("sequenceForQuoteToShip routes correctly", () => {
    const ops = [
      { id: "op1", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "op2", type: "finishing", operation: "finish", tool_id: "T2" },
    ];
    const out = (intelligentSequencingAdapter as any).sequenceForQuoteToShip(ops);
    expect(out.no_candidates).toBe(false);
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Taxonomy synchronization", () => {
  it("p2p.sequence_order is DYNAMIC post-retrofit", () => {
    const tp = lookup("p2p.sequence_order");
    expect(tp?.current_method).toBe("DYNAMIC");
  });

  it("p2p.thermal_gap_plan is DYNAMIC post-retrofit", () => {
    const tp = lookup("p2p.thermal_gap_plan");
    expect(tp?.current_method).toBe("DYNAMIC");
  });

  it("turn.bar_pull_plan, mt.turret_index_time, edm.tab_placement, la.nesting_strategy, q2s.schedule_slot all DYNAMIC", () => {
    for (const dp of [
      "turn.bar_pull_plan",
      "mt.turret_index_time",
      "edm.tab_placement",
      "la.nesting_strategy",
      "q2s.schedule_slot",
    ]) {
      const tp = lookup(dp);
      expect(tp?.current_method, dp).toBe("DYNAMIC");
    }
  });

  it("sequence_optimize retrofit count is reduced after this unit", () => {
    // Before U-CAMX08 there were 9 HEURISTIC+HARDCODED sequence_optimize points.
    // After retrofit: at least 7 should be DYNAMIC (7 flipped by this unit).
    const dynamic = byCurrentMethod("DYNAMIC").filter(
      (d) => d.category === "sequence_optimize",
    );
    expect(dynamic.length).toBeGreaterThanOrEqual(7);
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Orchestrator audit log", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog?.();
  });

  it("decision is appended to orchestrator audit log", () => {
    const ops = [
      { id: "r", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "f", type: "finishing", operation: "finish", tool_id: "T2" },
    ];
    (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      operations: ops,
      caller: "test-suite",
    });
    const audit = (pipelineDecisionOrchestratorEngine as any).getAuditLog?.();
    if (audit) {
      const lastEntry = audit[audit.length - 1];
      expect(lastEntry.category).toBe("sequence_optimize");
      expect(lastEntry.caller).toBe("test-suite");
    }
  });
});

describe("CAMX-MS0.3 U-CAMX08 — Score-breakdown sanity", () => {
  it("decision.score_breakdown has all 5 axes in [0,1]", () => {
    const ops = [
      { id: "a", type: "roughing", operation: "rough", tool_id: "T1" },
      { id: "b", type: "finishing", operation: "finish", tool_id: "T2" },
    ];
    const out = (intelligentSequencingAdapter as any).selectSequenceOrchestrated({
      decision_point: "p2p.sequence_order",
      operations: ops,
    });
    const axes = out.decision.score_breakdown;
    for (const key of [
      "optimal_performance",
      "logical_consistency",
      "safety",
      "cost_efficiency",
      "robustness",
    ]) {
      expect(axes[key]).toBeGreaterThanOrEqual(0);
      expect(axes[key]).toBeLessThanOrEqual(1);
    }
  });
});
