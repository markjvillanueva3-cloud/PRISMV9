/**
 * MILL-MASTER-P1-U02-FACADE-WIRE — Wiring Contract Test
 *
 * Complements MillMasterOrchestratorFacadeEngine.test.ts. Where the baseline
 * test asserts RESULT SHAPE, this file asserts that the facade ACTUALLY REACHES
 * into the correct sub-orchestrator via spies. Catches regressions where a
 * refactor might return synthesized results without invoking the real engine.
 *
 * Contract:
 *   - Each MillOrchRequestType must invoke exactly its documented sub-orchestrator
 *   - Provenance must list the invoked engines in engines_invoked[]
 *   - routed_to field must match getRoutingMap()[type]
 *   - include_* flags must invoke the corresponding supplemental engine
 *   - Every response must carry a valid ISO timestamp + numeric confidence ∈ [0,1]
 *
 * Envelope target: ≥ 14 tests (this file ships 22).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { millMasterOrchestratorFacadeEngine } from "../engines/MillMasterOrchestratorFacadeEngine.js";
import { millingAGIMasterEngine } from "../engines/MillingAGIMasterEngine.js";
import { millingAGIOrchestrationEngine } from "../engines/MillingAGIOrchestrationEngine.js";
import { millingUnifiedScienceOrchestrationEngine } from "../engines/MillingUnifiedScienceOrchestrationEngine.js";
import { millingEndToEndOrchestrationEngine } from "../engines/MillingEndToEndOrchestrationEngine.js";
import { millResourceAwarenessEngine } from "../engines/MillResourceAwarenessEngine.js";
import { millTribalKnowledgeEngine } from "../engines/MillTribalKnowledgeEngine.js";
import { toolHolderRegistryEngine } from "../engines/ToolHolderRegistryEngine.js";

// ── Shared context — just enough to satisfy the schema path ────
const baseReq = {
  material: "4140",
  material_iso: "P" as const,
  operation: "roughing",
  tool_diameter_mm: 12,
  tool_flutes: 4,
  rpm: 3000,
  feed_mm_min: 500,
  cutting_speed_m_min: 100,
  feed_per_tooth_mm: 0.1,
  axial_depth_mm: 2,
  radial_depth_mm: 6,
};

describe("MILL-MASTER-P1-U02 · Facade wiring — print_to_program route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingEndToEndOrchestrationEngine.getWorkflowTemplate", () => {
    const spy = vi.spyOn(millingEndToEndOrchestrationEngine, "getWorkflowTemplate");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "print_to_program", ...baseReq });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("invokes validateRequest when a print payload is provided", () => {
    // Mock the implementation so we verify invocation without triggering
    // validateRequest's internal schema checks on the stub payload.
    const spy = vi
      .spyOn(millingEndToEndOrchestrationEngine, "validateRequest")
      .mockImplementation(() => ({ valid: true, warnings: [], errors: [] }) as any);
    millMasterOrchestratorFacadeEngine.orchestrate({
      type: "print_to_program",
      ...baseReq,
      print: { stub: true, material: "4140" } as any,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("skips validateRequest when no print payload provided", () => {
    const spy = vi.spyOn(millingEndToEndOrchestrationEngine, "validateRequest");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "print_to_program", ...baseReq });
    expect(spy).not.toHaveBeenCalled();
  });

  it("stamps routed_to with MillingEndToEndOrchestrationEngine", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "print_to_program", ...baseReq });
    expect(r.routed_to).toBe("MillingEndToEndOrchestrationEngine");
    expect(r.provenance.engines_invoked).toContain("MillingEndToEndOrchestrationEngine");
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — scientific route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingUnifiedScienceOrchestrationEngine.quickAnalyze", () => {
    const spy = vi.spyOn(millingUnifiedScienceOrchestrationEngine, "quickAnalyze");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "scientific", ...baseReq });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("passes positional arguments in the documented order (material, Vc, fz, ap, ae, D)", () => {
    const spy = vi.spyOn(millingUnifiedScienceOrchestrationEngine, "quickAnalyze");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "scientific", ...baseReq });
    const call = spy.mock.calls[0];
    expect(call?.[0]).toBe("4140"); // material
    expect(call?.[1]).toBe(100); // cutting_speed_m_min
    expect(call?.[2]).toBeCloseTo(0.1, 5); // feed_per_tooth_mm
    expect(call?.[3]).toBe(2); // axial_depth_mm
    expect(call?.[4]).toBe(6); // radial_depth_mm
    expect(call?.[5]).toBe(12); // tool_diameter_mm
  });

  it("stamps Kienzle + Taylor in formulas_touched", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "scientific", ...baseReq });
    expect(r.provenance.formulas_touched).toContain("Kienzle");
    expect(r.provenance.formulas_touched).toContain("Taylor");
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — agi route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingAGIOrchestrationEngine.analyzeWithAGI", () => {
    const spy = vi.spyOn(millingAGIOrchestrationEngine, "analyzeWithAGI");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "agi", ...baseReq });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("lists BOTH MillingAGIMasterEngine and MillingAGIOrchestrationEngine in engines_invoked", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "agi", ...baseReq });
    expect(r.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
    expect(r.provenance.engines_invoked).toContain("MillingAGIOrchestrationEngine");
  });

  it("stamps Johnson-Cook, Archard, Zorev in formulas_touched", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "agi", ...baseReq });
    expect(r.provenance.formulas_touched).toContain("Johnson-Cook");
    expect(r.provenance.formulas_touched).toContain("Archard");
    expect(r.provenance.formulas_touched).toContain("Zorev");
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — validate route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingAGIMasterEngine.validateApproach", () => {
    const spy = vi.spyOn(millingAGIMasterEngine, "validateApproach");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "validate", ...baseReq });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("maps dispatcher fields to validateApproach DTO (doc/tool_diameter/rpm/feed)", () => {
    const spy = vi.spyOn(millingAGIMasterEngine, "validateApproach");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "validate", ...baseReq });
    const dto = spy.mock.calls[0]?.[0];
    expect(dto?.material_iso).toBe("P");
    expect(dto?.operation).toBe("roughing");
    expect(dto?.rpm).toBe(3000);
    expect(dto?.feed).toBe(500); // feed_mm_min → feed
    expect(dto?.doc).toBe(2); // axial_depth_mm → doc
    expect(dto?.tool_diameter).toBe(12);
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — quick route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingUnifiedScienceOrchestrationEngine.quickAnalyze (same as scientific)", () => {
    const spy = vi.spyOn(millingUnifiedScienceOrchestrationEngine, "quickAnalyze");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "quick", ...baseReq });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("emits fixed 0.75 confidence (documented heuristic — no stability check)", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "quick", ...baseReq });
    expect(r.provenance.confidence).toBeCloseTo(0.75, 5);
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — wisdom route", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invokes MillingAGIMasterEngine.getMasterWisdom with the category", () => {
    const spy = vi.spyOn(millingAGIMasterEngine, "getMasterWisdom");
    millMasterOrchestratorFacadeEngine.orchestrate({
      type: "wisdom",
      ...baseReq,
      wisdom_category: "chatter",
    });
    expect(spy).toHaveBeenCalledWith("chatter");
  });

  it("defaults wisdom_category to 'general' when unspecified", () => {
    const spy = vi.spyOn(millingAGIMasterEngine, "getMasterWisdom");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "wisdom", ...baseReq });
    expect(spy).toHaveBeenCalledWith("general");
  });

  it("also invokes getWisdomCategories for the available list", () => {
    const spy = vi.spyOn(millingAGIMasterEngine, "getWisdomCategories");
    millMasterOrchestratorFacadeEngine.orchestrate({ type: "wisdom", ...baseReq });
    expect(spy).toHaveBeenCalled();
  });

  it("reports high confidence (≥ 0.9) — wisdom is curated, not derived", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "wisdom", ...baseReq });
    expect(r.provenance.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — supplemental engine wiring", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("include_resources=true invokes MillResourceAwarenessEngine.query + tags provenance", () => {
    const spy = vi.spyOn(millResourceAwarenessEngine, "query");
    const r = millMasterOrchestratorFacadeEngine.orchestrate({
      type: "scientific",
      ...baseReq,
      include_resources: true,
    });
    expect(spy).toHaveBeenCalled();
    expect(r.provenance.engines_invoked).toContain("MillResourceAwarenessEngine");
  });

  it("include_tribal=true invokes MillTribalKnowledgeEngine.query + tags provenance", () => {
    const spy = vi.spyOn(millTribalKnowledgeEngine, "query");
    const r = millMasterOrchestratorFacadeEngine.orchestrate({
      type: "scientific",
      ...baseReq,
      include_tribal: true,
    });
    expect(spy).toHaveBeenCalled();
    expect(r.provenance.engines_invoked).toContain("MillTribalKnowledgeEngine");
  });

  it("include_holder_rec=true invokes ToolHolderRegistryEngine.recommendForTool", () => {
    const spy = vi.spyOn(toolHolderRegistryEngine, "recommendForTool");
    const r = millMasterOrchestratorFacadeEngine.orchestrate({
      type: "scientific",
      ...baseReq,
      include_holder_rec: true,
    });
    expect(spy).toHaveBeenCalled();
    expect(r.provenance.engines_invoked).toContain("ToolHolderRegistryEngine");
  });

  it("include_tribal with min_confidence default 0.85 — tribal engine receives material filter", () => {
    const spy = vi.spyOn(millTribalKnowledgeEngine, "query");
    millMasterOrchestratorFacadeEngine.orchestrate({
      type: "scientific",
      ...baseReq,
      include_tribal: true,
    });
    const callArg = spy.mock.calls[0]?.[0] as any;
    expect(callArg?.material).toBe("4140");
    expect(callArg?.min_confidence).toBeCloseTo(0.85, 5);
  });

  it("include_holder_rec without rpm or tool_diameter_mm does NOT invoke holder engine", () => {
    const spy = vi.spyOn(toolHolderRegistryEngine, "recommendForTool");
    const req = { ...baseReq };
    delete (req as any).rpm;
    delete (req as any).tool_diameter_mm;
    millMasterOrchestratorFacadeEngine.orchestrate({
      type: "scientific",
      ...req,
      include_holder_rec: true,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — routing map consistency", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("routed_to field matches getRoutingMap() for every request type", () => {
    const map = millMasterOrchestratorFacadeEngine.getRoutingMap();
    for (const t of ["print_to_program", "scientific", "validate", "quick", "wisdom"] as const) {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: t, ...baseReq });
      // For scientific+quick+wisdom+validate+print_to_program the routed_to is the exact engine name
      // For agi the routing map annotates "(via AGIMaster)" so it's a substring check
      expect(map[t].startsWith(r.routed_to)).toBe(true);
    }
  });

  it("agi route: routing map annotation mentions AGIMaster delegation", () => {
    const map = millMasterOrchestratorFacadeEngine.getRoutingMap();
    expect(map.agi).toContain("AGIMaster");
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — response shape invariants", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("every response includes ISO-format ts", () => {
    for (const t of ["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"] as const) {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: t, ...baseReq });
      expect(r.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it("every response carries confidence in [0, 1]", () => {
    for (const t of ["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"] as const) {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: t, ...baseReq });
      expect(r.provenance.confidence).toBeGreaterThanOrEqual(0);
      expect(r.provenance.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("every response has non-empty engines_invoked", () => {
    for (const t of ["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"] as const) {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: t, ...baseReq });
      expect(r.provenance.engines_invoked.length).toBeGreaterThan(0);
    }
  });

  it("request_type is echoed back unchanged in response", () => {
    for (const t of ["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"] as const) {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: t, ...baseReq });
      expect(r.request_type).toBe(t);
    }
  });
});

describe("MILL-MASTER-P1-U02 · Facade wiring — provenance contract (anti-bypass)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("scientific response MUST list MillingUnifiedScienceOrchestrationEngine in engines_invoked (anti-synthesized-result regression)", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "scientific", ...baseReq });
    expect(r.provenance.engines_invoked).toContain("MillingUnifiedScienceOrchestrationEngine");
  });

  it("validate response MUST list MillingAGIMasterEngine in engines_invoked", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "validate", ...baseReq });
    expect(r.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
  });

  it("wisdom response MUST list MillingAGIMasterEngine in engines_invoked", () => {
    const r = millMasterOrchestratorFacadeEngine.orchestrate({ type: "wisdom", ...baseReq });
    expect(r.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
  });
});
