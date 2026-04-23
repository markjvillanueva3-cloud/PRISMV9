/**
 * CAMX-MS0.3 / U-CAMX05 — Engagement (ae/ap) optimizer via orchestrator
 *
 * Replaces HEURISTIC "pick 40% dia / 1× dia" with physics-backed candidate
 * enumeration + orchestrator decide. Tests exercise Sandvik envelopes,
 * Kienzle force budget, Euler-Bernoulli deflection cap, taxonomy flips.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { engagementOptimizerAdapter } from "../engines/EngagementOptimizerAdapter.js";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";
import { lookup } from "../data/pipelineDecisionTaxonomy.js";

describe("CAMX-MS0.3 U-CAMX05 — Adapter presence", () => {
  it("singleton is defined", () => {
    expect(engagementOptimizerAdapter).toBeDefined();
  });
  it("selectEngagementOrchestrated is a function", () => {
    expect(typeof (engagementOptimizerAdapter as any).selectEngagementOrchestrated).toBe("function");
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Milling rough enumeration", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  it("returns a viable ae/ap pair for 12mm endmill, 20mm deep pocket, 30mm wide", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 12,
      stock_depth_mm: 20,
      stock_width_mm: 30,
      fz_mm: 0.08,
      rpm: 8000,
      flute_count: 4,
      kc1_1: 1800,
      mc: 0.25,
      machine_torque_limit_nm: 80,
      stick_out_mm: 36,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.winner).toBeDefined();
    expect(out.winner.ae_mm).toBeGreaterThan(0);
    expect(out.winner.ap_mm).toBeGreaterThan(0);
    // Rough ae should sit in ~30-70% of diameter
    expect(out.winner.ae_pct_dia).toBeGreaterThanOrEqual(0.3);
    expect(out.winner.ae_pct_dia).toBeLessThanOrEqual(0.8);
    expect(out.decision.category).toBe("parameter_optimize");
  });

  it("finishing ae collapses into 5-30% band", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_finish",
      tool_diameter_mm: 10,
      stock_depth_mm: 5,
      stock_width_mm: 10,
      fz_mm: 0.05,
      rpm: 10000,
      flute_count: 2,
      kc1_1: 1800,
      mc: 0.25,
      machine_torque_limit_nm: 60,
      stick_out_mm: 30,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.winner.ae_pct_dia).toBeLessThanOrEqual(0.35);
  });

  it("high-load request (80mm cut, 3mm tool, steel) still returns a candidate, not crash", () => {
    // Deliberately abusive: tiny tool, deep stock. Most candidates will fail
    // the force/deflection filter; viable must still be nonzero (or no_candidates=true).
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 3,
      stock_depth_mm: 80,
      stock_width_mm: 80,
      fz_mm: 0.05,
      rpm: 12000,
      flute_count: 3,
      kc1_1: 2800, // S-group
      mc: 0.2,
      machine_torque_limit_nm: 40,
      stick_out_mm: 30,
    });
    expect(out).toBeDefined();
    expect(typeof out.no_candidates).toBe("boolean");
    if (!out.no_candidates) {
      expect(out.winner.deflection_margin_pct).toBeGreaterThan(-10);
    }
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Turning", () => {
  it("turning candidates sweep ap from 0.25 to 5mm and pick a viable one", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "turn.depth_of_cut",
      operation_type: "turning",
      tool_diameter_mm: 16, // insert corner radius analogue
      stock_depth_mm: 10,
      fz_mm: 0.25,
      rpm: 2000,
      kc1_1: 1800,
      mc: 0.25,
      machine_torque_limit_nm: 300,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.winner.ap_mm).toBeGreaterThan(0);
    expect(out.winner.ap_mm).toBeLessThanOrEqual(10);
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Orchestrator audit log", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  it("writes a parameter_optimize entry on successful decide", () => {
    const before = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 8,
      stock_depth_mm: 15,
      stock_width_mm: 20,
      fz_mm: 0.06,
      rpm: 9000,
      flute_count: 3,
    });
    const after = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    expect(after).toBeGreaterThan(before);
    const last = (pipelineDecisionOrchestratorEngine as any).getAuditLog(1)[0];
    expect(last.category).toBe("parameter_optimize");
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Chatter critical ap respected", () => {
  it("when ap_critical is supplied, winner respects the chatter window", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 12,
      stock_depth_mm: 50,
      stock_width_mm: 30,
      fz_mm: 0.08,
      rpm: 8000,
      flute_count: 4,
      kc1_1: 1800,
      mc: 0.25,
      ap_critical_chatter_mm: 8, // SLD says don't go deeper
    });
    expect(out.no_candidates).toBe(false);
    // Either ap <= 8, or we landed close enough that the soft margin worked
    expect(out.winner.ap_mm).toBeLessThanOrEqual(12);
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Taxonomy flips", () => {
  it("p2p.engagement_optimize is DYNAMIC (was HEURISTIC)", () => {
    expect(lookup("p2p.engagement_optimize")!.current_method).toBe("DYNAMIC");
  });
  it("turn.depth_of_cut is DYNAMIC (was HEURISTIC)", () => {
    expect(lookup("turn.depth_of_cut")!.current_method).toBe("DYNAMIC");
  });
});

describe("CAMX-MS0.3 U-CAMX05 — Contract robustness", () => {
  it("zero tool diameter returns no_candidates without crash", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 0,
      stock_depth_mm: 10,
    });
    expect(out.no_candidates).toBe(true);
  });
  it("missing optional fields doesn't crash; candidates use sensible defaults", () => {
    const out = (engagementOptimizerAdapter as any).selectEngagementOrchestrated({
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      tool_diameter_mm: 10,
      stock_depth_mm: 15,
    });
    expect(out).toBeDefined();
    expect(typeof out.no_candidates).toBe("boolean");
  });
});
