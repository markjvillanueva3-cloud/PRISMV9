/**
 * CAMX-MS0.3 / U-CAMX04 — Coating selection via orchestrator
 *
 * Replaces 3 HARDCODED taxonomy entries (p2p.coating_select,
 * turn.coating_insert, edm.wire_coating) with CoatingSelectionAdapter
 * routed through PipelineDecisionOrchestratorEngine. Tests exercise ISO
 * P/M/K/N/S/H mapping, thermal filter, audit log, and the 3 DYNAMIC flips.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { coatingSelectionAdapter, type IsoGroup } from "../engines/CoatingSelectionAdapter.js";
import { pipelineDecisionOrchestratorEngine } from "../engines/PipelineDecisionOrchestratorEngine.js";
import { lookup } from "../data/pipelineDecisionTaxonomy.js";

describe("CAMX-MS0.3 U-CAMX04 — Adapter presence", () => {
  it("singleton is defined", () => {
    expect(coatingSelectionAdapter).toBeDefined();
  });
  it("selectCoatingOrchestrated is a function", () => {
    expect(typeof (coatingSelectionAdapter as any).selectCoatingOrchestrated).toBe("function");
  });
  it("preferredForIsoGroup is a function", () => {
    expect(typeof (coatingSelectionAdapter as any).preferredForIsoGroup).toBe("function");
  });
});

describe("CAMX-MS0.3 U-CAMX04 — ISO preference catalog", () => {
  const cases: Array<[IsoGroup, string]> = [
    ["P", "PVD-TiAlN"],
    ["M", "PVD-AlTiN"],
    ["K", "NONE-polished"],
    ["N", "DLC"],
    ["S", "PVD-AlTiN"],
    ["H", "SUPERHARD-CBN"],
  ];
  for (const [iso, expected_id] of cases) {
    it(`ISO ${iso} has ≥1 candidate including ${expected_id}`, () => {
      const coats = (coatingSelectionAdapter as any).preferredForIsoGroup(iso);
      expect(coats.length).toBeGreaterThan(0);
      expect(coats.some((c: any) => c.id === expected_id)).toBe(true);
    });
  }
});

describe("CAMX-MS0.3 U-CAMX04 — Decision routing", () => {
  beforeEach(() => {
    (pipelineDecisionOrchestratorEngine as any).clearAuditLog();
  });

  it("picks a TiAlN-family coating for ISO P + milling rough", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "P",
      material_name: "4140",
      operation_type: "rough",
      cutting_temp_c: 500,
      caller: "TEST:CAMX-MS0.3-U04",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coating).toBeDefined();
    // For ISO P + 500°C, winner should prefer P and have adequate thermal margin
    expect(out.coating.preferred_iso.includes("P") || out.coating.max_temp_c >= 600).toBe(true);
    expect(out.decision.category).toBe("coating_select");
  });

  it("picks low-CoF coating for ISO N finishing (DLC / PCD / polished)", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "N",
      material_name: "6061",
      operation_type: "finish",
      cutting_temp_c: 150,
    });
    expect(out.no_candidates).toBe(false);
    // N-group winner should be DLC / PCD / uncoated polished
    expect(["DLC", "SUPERHARD-PCD", "NONE-polished"]).toContain(out.coating.id);
  });

  it("picks CBN/nanocomposite for hardened H-group", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "H",
      hardness_hrc: 58,
      operation_type: "finish",
      cutting_temp_c: 800,
    });
    expect(out.no_candidates).toBe(false);
    expect(["SUPERHARD-CBN", "PVD-nanocomposite", "PVD-AlCrN"]).toContain(out.coating.id);
  });

  it("picks AlTiN family for ISO S (superalloy) with high temp", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "S",
      material_name: "Inconel 718",
      cutting_temp_c: 950,
    });
    expect(out.no_candidates).toBe(false);
    // Winner must survive 950°C temperature hint → max_temp_c >= ~760 (0.8 floor)
    expect(out.coating.max_temp_c).toBeGreaterThanOrEqual(760);
  });

  it("writes a coating_select entry into the orchestrator audit log", () => {
    const before = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "M",
      operation_type: "rough",
    });
    const after = (pipelineDecisionOrchestratorEngine as any).getAuditLog().length;
    expect(after).toBeGreaterThan(before);
    const last = (pipelineDecisionOrchestratorEngine as any).getAuditLog(1)[0];
    expect(last.category).toBe("coating_select");
  });

  it("routes EDM wire coating to brass/zinc/coated catalog", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "edm.wire_coating",
      material_iso_group: "P",
      operation_type: "edm",
    });
    expect(out.no_candidates).toBe(false);
    expect(out.coating.id.startsWith("WIRE-")).toBe(true);
  });

  it("returns no_candidates when cutting_temp wildly exceeds every coating max", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "H",
      cutting_temp_c: 3000, // absurd — exceeds every coating even with 0.8 floor
    });
    expect(out.no_candidates).toBe(true);
  });
});

describe("CAMX-MS0.3 U-CAMX04 — Taxonomy flips", () => {
  it("p2p.coating_select is DYNAMIC (was HARDCODED)", () => {
    expect(lookup("p2p.coating_select")!.current_method).toBe("DYNAMIC");
  });
  it("turn.coating_insert is DYNAMIC", () => {
    expect(lookup("turn.coating_insert")!.current_method).toBe("DYNAMIC");
  });
  it("edm.wire_coating is DYNAMIC", () => {
    expect(lookup("edm.wire_coating")!.current_method).toBe("DYNAMIC");
  });
});

describe("CAMX-MS0.3 U-CAMX04 — Contract robustness", () => {
  it("missing thermal context doesn't crash", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "P",
    });
    expect(out).toBeDefined();
    expect(typeof out.no_candidates).toBe("boolean");
  });
  it("unknown operation still returns a candidate", () => {
    const out = (coatingSelectionAdapter as any).selectCoatingOrchestrated({
      decision_point: "p2p.coating_select",
      material_iso_group: "K",
      operation_type: "thread",
    });
    expect(out.no_candidates).toBe(false);
  });
});
