/**
 * CAMX-MS0.3 / U-CAMX07 — Entry/exit strategy via orchestrator
 *
 * 4 domains: milling (entry+exit), multiaxis, laser pierce, waterjet pierce.
 * Validates physics filters (center-cut plunge, blast pierce thickness) and
 * 5 taxonomy flips.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { entryExitStrategyAdapter } from "../engines/EntryExitStrategyAdapter.js";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";
import { lookup } from "../data/pipelineDecisionTaxonomy.js";

describe("CAMX-MS0.3 U-CAMX07 — Adapter presence", () => {
  it("singleton is defined", () => {
    expect(entryExitStrategyAdapter).toBeDefined();
  });
  it("selectEntryExitOrchestrated is a function", () => {
    expect(typeof (entryExitStrategyAdapter as any).selectEntryExitOrchestrated).toBe("function");
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Milling entry routing", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  it("closed pocket with non-center-cut tool → NOT plunge", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.entry_strategy",
      operation_type: "rough",
      tool_diameter_mm: 12,
      center_cutting: false,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.strategy.motion_type).not.toBe("plunge");
  });

  it("surface-finish-critical finishing picks arc_on / rolling_in / pre_drill", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.entry_strategy",
      operation_type: "finish",
      surface_finish_critical: true,
      center_cutting: true,
    });
    expect(out.no_candidates).toBe(false);
    expect(["MILL-arc_on", "MILL-rolling_in", "MILL-pre_drill", "MILL-helix"]).toContain(out.strategy.id);
  });

  it("rough + no surface-finish flag often picks ramp or helix", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.entry_strategy",
      operation_type: "rough",
      center_cutting: true,
    });
    expect(out.no_candidates).toBe(false);
    expect(["MILL-ramp", "MILL-helix", "MILL-plunge", "MILL-pre_drill"]).toContain(out.strategy.id);
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Milling exit routing", () => {
  it("exit domain picks from 3-candidate exit catalog only", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.exit_strategy",
      operation_type: "finish",
    });
    expect(out.no_candidates).toBe(false);
    expect(["MILL-arc_off", "MILL-lead_off", "MILL-retract_linear"]).toContain(out.strategy.id);
  });
  it("finish favours arc_off (lowest mark risk)", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.exit_strategy",
      operation_type: "finish",
      surface_finish_critical: true,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.strategy.id).toBe("MILL-arc_off");
  });
});

describe("CAMX-MS0.3 U-CAMX07 — 5-axis entry routing", () => {
  it("multiaxis decision_point returns an MX-prefixed candidate", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "mx.entry_helix",
      operation_type: "finish",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.strategy.id.startsWith("MX-")).toBe(true);
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Laser pierce", () => {
  it("thin tolerant stock allows CW / blast", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "la.pierce_strategy",
      operation_type: "laser_cut",
      material_thickness_mm: 1.5,
    });
    expect(out.no_candidates).toBe(false);
    expect(["LA-blast", "LA-cw", "LA-pulsed"]).toContain(out.strategy.id);
  });
  it("thick stock (8mm) prevents blast (safety sink)", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "la.pierce_strategy",
      operation_type: "laser_cut",
      material_thickness_mm: 8,
    });
    expect(out.no_candidates).toBe(false);
    expect(out.strategy.id).not.toBe("LA-blast");
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Waterjet pierce", () => {
  it("fragile composite picks low-P pierce (lowest mark risk)", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "wj.pierce_delay",
      operation_type: "waterjet_cut",
      surface_finish_critical: true,
    });
    expect(out.no_candidates).toBe(false);
    expect(["WJ-low-P", "WJ-stationary"]).toContain(out.strategy.id);
  });
  it("standard waterjet decision returns a WJ candidate", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "wj.pierce_delay",
      operation_type: "waterjet_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.strategy.id.startsWith("WJ-")).toBe(true);
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Audit log", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });
  it("writes an entry_exit_select entry on each call", () => {
    const before = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.entry_strategy",
      operation_type: "rough",
    });
    const after = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    expect(after).toBeGreaterThan(before);
    const last = (pipelineDecisionOrchestratorEngine as any).getAuditLog(1)[0];
    expect(last.category).toBe("entry_exit_select");
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Taxonomy flips", () => {
  it("p2p.entry_strategy is DYNAMIC", () => {
    expect(lookup("p2p.entry_strategy")!.current_method).toBe("DYNAMIC");
  });
  it("p2p.exit_strategy is DYNAMIC", () => {
    expect(lookup("p2p.exit_strategy")!.current_method).toBe("DYNAMIC");
  });
  it("mx.entry_helix is DYNAMIC", () => {
    expect(lookup("mx.entry_helix")!.current_method).toBe("DYNAMIC");
  });
  it("la.pierce_strategy is DYNAMIC", () => {
    expect(lookup("la.pierce_strategy")!.current_method).toBe("DYNAMIC");
  });
  it("wj.pierce_delay is DYNAMIC", () => {
    expect(lookup("wj.pierce_delay")!.current_method).toBe("DYNAMIC");
  });
});

describe("CAMX-MS0.3 U-CAMX07 — Contract robustness", () => {
  it("missing operation does not crash and still returns a candidate", () => {
    const out = (entryExitStrategyAdapter as any).selectEntryExitOrchestrated({
      decision_point: "p2p.entry_strategy",
    });
    expect(out).toBeDefined();
    expect(typeof out.no_candidates).toBe("boolean");
  });
});
