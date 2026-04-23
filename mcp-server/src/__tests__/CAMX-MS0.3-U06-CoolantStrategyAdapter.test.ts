/**
 * CAMX-MS0.3 / U-CAMX06 — Coolant strategy via orchestrator
 *
 * Replaces HARDCODED/HEURISTIC coolant picks in PrintToProgram, Turning,
 * Grinding, and Laser. Routes through PipelineDecisionOrchestrator with
 * per-domain catalogs (machining / EDM / laser / grinding) and physics-
 * + ISO-group-aware scoring.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { coolantStrategyAdapter } from "../engines/CoolantStrategyAdapter.js";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";
import { lookup } from "../data/pipelineDecisionTaxonomy.js";

describe("CAMX-MS0.3 U-CAMX06 — Adapter presence", () => {
  it("singleton is defined", () => {
    expect(coolantStrategyAdapter).toBeDefined();
  });
  it("selectCoolantOrchestrated is a function", () => {
    expect(typeof (coolantStrategyAdapter as any).selectCoolantOrchestrated).toBe("function");
  });
});

describe("CAMX-MS0.3 U-CAMX06 — Domain routing", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  it("laser domain picks a gas candidate (not an emulsion)", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "la.gas_select",
      material_iso_group: "P",
      operation_type: "laser_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coolant.delivery).toBe("gas");
  });

  it("EDM domain picks a dielectric candidate", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "edm.flushing_pressure",
      material_iso_group: "H",
      operation_type: "edm_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coolant.delivery).toBe("dielectric");
  });

  it("grinding domain picks a grinding-specific coolant", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "gr.coolant_method",
      material_iso_group: "S",
      operation_type: "grind",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coolant.id.startsWith("GR-")).toBe(true);
  });

  it("machining domain picks from machining catalog", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "P",
      operation_type: "rough",
    });
    expect(out.no_candidates).toBe(false);
    // Should be flood/HPC/MQL/air/dry — not dielectric/gas
    expect(["flood", "hpc", "mql", "air", "dry"]).toContain(out.coolant.delivery);
  });
});

describe("CAMX-MS0.3 U-CAMX06 — ISO-group preference", () => {
  it("ISO N (aluminum) + finish prefers MQL / air / flood (not dry)", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "N",
      material_name: "6061",
      operation_type: "finish",
    });
    expect(out.no_candidates).toBe(false);
    expect(["MQL", "AIR", "FLOOD-water-soluble"]).toContain(out.coolant.id);
  });

  it("ISO K (cast iron) prefers dry or air", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "K",
      material_name: "GG25",
      operation_type: "finish",
    });
    expect(out.no_candidates).toBe(false);
    expect(["DRY", "AIR", "MQL"]).toContain(out.coolant.id);
  });

  it("HRSA flag + drilling avoids MQL (picks flood or HPC)", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "S",
      material_name: "Inconel 718",
      operation_type: "drill",
      depth_over_diameter: 8,
      hrsa_flag: true,
    });
    expect(out.no_candidates).toBe(false);
    expect(["FLOOD-water-soluble", "HPC-through-spindle"]).toContain(out.coolant.id);
  });

  it("Deep-hole drilling (L/D=10) on steel strongly prefers HPC", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "P",
      operation_type: "drill",
      depth_over_diameter: 10,
    });
    expect(out.no_candidates).toBe(false);
    expect(["HPC-through-spindle", "FLOOD-water-soluble"]).toContain(out.coolant.id);
  });
});

describe("CAMX-MS0.3 U-CAMX06 — Laser gas selection", () => {
  it("mild steel picks O2 (oxidation-assisted) or air", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "la.gas_select",
      material_iso_group: "P",
      operation_type: "laser_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(["GAS-O2", "GAS-air"]).toContain(out.coolant.id);
  });
  it("stainless picks N2 high-pressure", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "la.gas_select",
      material_iso_group: "M",
      operation_type: "laser_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coolant.id).toBe("GAS-N2-high-P");
  });
  it("titanium (S-group reactive) picks Ar", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "la.gas_select",
      material_iso_group: "S",
      operation_type: "laser_cut",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coolant.id).toBe("GAS-Ar");
  });
});

describe("CAMX-MS0.3 U-CAMX06 — Audit log", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });
  it("writes a coolant_select entry on each call", () => {
    const before = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "P",
      operation_type: "rough",
    });
    const after = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    expect(after).toBeGreaterThan(before);
    const last = (pipelineDecisionOrchestratorEngine as any).getAuditLog(1)[0];
    expect(last.category).toBe("coolant_select");
  });
});

describe("CAMX-MS0.3 U-CAMX06 — Taxonomy flips", () => {
  it("p2p.coolant_mode is DYNAMIC", () => {
    expect(lookup("p2p.coolant_mode")!.current_method).toBe("DYNAMIC");
  });
  it("turn.coolant_method is DYNAMIC", () => {
    expect(lookup("turn.coolant_method")!.current_method).toBe("DYNAMIC");
  });
  it("gr.coolant_method is DYNAMIC", () => {
    expect(lookup("gr.coolant_method")!.current_method).toBe("DYNAMIC");
  });
  it("la.gas_select is DYNAMIC", () => {
    expect(lookup("la.gas_select")!.current_method).toBe("DYNAMIC");
  });
});

describe("CAMX-MS0.3 U-CAMX06 — Contract robustness", () => {
  it("missing iso_group still returns a candidate", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      operation_type: "rough",
    });
    expect(out.no_candidates).toBe(false);
  });
  it("missing operation returns a candidate (no filter applied)", () => {
    const out = (coolantStrategyAdapter as any).selectCoolantOrchestrated({
      decision_point: "p2p.coolant_mode",
      material_iso_group: "P",
    });
    expect(out.no_candidates).toBe(false);
  });
});
