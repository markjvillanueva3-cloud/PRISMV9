/**
 * MillMasterOrchestratorFacadeEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  millMasterOrchestratorFacadeEngine,
  MillMasterOrchestratorFacadeEngine,
} from "../engines/MillMasterOrchestratorFacadeEngine.js";

describe("MillMasterOrchestratorFacadeEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton", () => {
      expect(millMasterOrchestratorFacadeEngine).toBeDefined();
      expect(millMasterOrchestratorFacadeEngine).toBeInstanceOf(
        MillMasterOrchestratorFacadeEngine
      );
    });

    it("should have orchestrate method", () => {
      expect(typeof millMasterOrchestratorFacadeEngine.orchestrate).toBe("function");
    });

    it("facade records request_type on failure response", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
      });
      expect(response.request_type).toBe("print_to_program");
    });

    it("warnings mention the missing engine name", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
      });
      const joined = response.warnings.join(" ");
      expect(joined).toMatch(/MillPrintToProgramEngine|MillP2POrchestrator/);
    });

    it("warnings reference roadmap placeholder for follow-up", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
      });
      const joined = response.warnings.join(" ");
      expect(joined).toMatch(/P1-U13|not yet been created|roadmap/i);
    });
  });

  describe("orchestrate — routing", () => {
    it("should route scientific requests to UnifiedScience", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "scientific",
        material: "4140",
        cutting_speed_m_min: 120,
        feed_per_tooth_mm: 0.08,
        axial_depth_mm: 3,
        radial_depth_mm: 6,
        tool_diameter_mm: 12,
      });
      expect(r.routed_to).toBe("MillingUnifiedScienceOrchestrationEngine");
      expect(r.provenance.formulas_touched).toContain("Kienzle");
      expect(r.provenance.formulas_touched).toContain("Taylor");
      expect(r.provenance.confidence).toBeGreaterThan(0);
    });

    it("should route agi requests to AGIOrchestration via Master", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "agi",
        material: "4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        cutting_speed_m_min: 100,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 2,
        radial_depth_mm: 6,
        operation: "roughing",
      });
      expect(r.routed_to).toBe("MillingAGIOrchestrationEngine");
      expect(r.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
      expect(r.provenance.formulas_touched).toContain("Johnson-Cook");
    });

    it("should route validate requests to AGIMaster", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "validate",
        material: "4140",
        material_iso: "P",
        operation: "roughing",
        rpm: 3000,
        feed_mm_min: 500,
        axial_depth_mm: 2,
        tool_diameter_mm: 12,
      });
      expect(r.routed_to).toBe("MillingAGIMasterEngine");
      expect(r.primary_result).toHaveProperty("valid");
      expect(r.primary_result).toHaveProperty("physics_check");
    });

    it("should route wisdom requests to AGIMaster", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "wisdom",
        material: "4140",
        wisdom_category: "general",
      });
      expect(r.routed_to).toBe("MillingAGIMasterEngine");
      expect(r.primary_result).toHaveProperty("wisdom");
      expect(r.primary_result).toHaveProperty("available_categories");
      expect(r.provenance.confidence).toBeGreaterThan(0.9);
    });

    it("should route print_to_program to EndToEnd", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "print_to_program",
        material: "4140",
      });
      expect(r.routed_to).toBe("MillingEndToEndOrchestrationEngine");
      expect(r.primary_result).toHaveProperty("workflow");
    });

    it("should route quick to UnifiedScience", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "quick",
        material: "4140",
      });
      expect(r.routed_to).toBe("MillingUnifiedScienceOrchestrationEngine");
      expect(r.primary_result).toHaveProperty("force_N");
    });
  });

  describe("orchestrate — supplemental enrichment", () => {
    it("should include resources when requested", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "scientific",
        material: "4140",
        include_resources: true,
      });
      expect(r.supplemental.resources).toBeDefined();
      expect(r.provenance.engines_invoked).toContain("MillResourceAwarenessEngine");
    });

    it("should include tribal tips when requested", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "scientific",
        material: "Ti-6Al-4V",
        include_tribal: true,
      });
      expect(r.supplemental.tribal_tips).toBeDefined();
      expect(r.provenance.engines_invoked).toContain("MillTribalKnowledgeEngine");
    });

    it("should include holder recommendation when requested", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "scientific",
        material: "4140",
        tool_diameter_mm: 12,
        rpm: 20000,
        operation: "finish",
        include_holder_rec: true,
      });
      expect(r.supplemental.holder_recommendation).toBeDefined();
      expect(r.provenance.engines_invoked).toContain("ToolHolderRegistryEngine");
    });

    it("should combine all supplemental engines", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "scientific",
        material: "4140",
        tool_diameter_mm: 12,
        rpm: 20000,
        operation: "finish",
        include_resources: true,
        include_tribal: true,
        include_holder_rec: true,
      });
      expect(r.supplemental.resources).toBeDefined();
      expect(r.supplemental.tribal_tips).toBeDefined();
      expect(r.supplemental.holder_recommendation).toBeDefined();
    });
  });

  describe("getRoutingMap", () => {
    it("should expose all 6 route mappings", () => {
      const m = millMasterOrchestratorFacadeEngine.getRoutingMap();
      expect(Object.keys(m).length).toBe(6);
      expect(m.scientific).toContain("UnifiedScience");
      expect(m.agi).toContain("AGIOrchestration");
      expect(m.wisdom).toContain("AGIMaster");
    });
  });

  describe("getCoordinatedStats", () => {
    it("should aggregate stats from all 4 orchestrators", () => {
      const s = millMasterOrchestratorFacadeEngine.getCoordinatedStats();
      expect(s).toHaveProperty("agi_master");
      expect(s).toHaveProperty("unified_science");
      expect(s).toHaveProperty("end_to_end");
      expect(s).toHaveProperty("agi_orch");
      expect(s.total_engines).toBe(7);
    });
  });

  describe("getSelfAwareness", () => {
    it("should list all 4 sub-orchestrators", () => {
      const a = millMasterOrchestratorFacadeEngine.getSelfAwareness();
      expect(a.sub_orchestrators).toHaveLength(4);
      expect(a.sub_orchestrators).toContain("MillingAGIMasterEngine");
      expect(a.sub_orchestrators).toContain("MillingAGIOrchestrationEngine");
    });

    it("should list all 3 resource engines", () => {
      const a = millMasterOrchestratorFacadeEngine.getSelfAwareness();
      expect(a.resource_engines).toHaveLength(3);
      expect(a.resource_engines).toContain("MillResourceAwarenessEngine");
      expect(a.resource_engines).toContain("ToolHolderRegistryEngine");
      expect(a.resource_engines).toContain("MillTribalKnowledgeEngine");
    });

    it("should list canonical formula dependencies", () => {
      const a = millMasterOrchestratorFacadeEngine.getSelfAwareness();
      expect(a.formula_dependencies).toContain("Kienzle");
      expect(a.formula_dependencies).toContain("Taylor");
      expect(a.formula_dependencies).toContain("Johnson-Cook");
    });
  });

  describe("Response shape", () => {
    it("every orchestrate response should include provenance", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "quick",
        material: "6061-T6",
      });
      expect(r.provenance).toBeDefined();
      expect(Array.isArray(r.provenance.engines_invoked)).toBe(true);
      expect(Array.isArray(r.provenance.formulas_touched)).toBe(true);
      expect(typeof r.provenance.confidence).toBe("number");
    });

    it("every response should include ISO timestamp", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "quick",
        material: "4140",
      });
      expect(r.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing optional params with defaults", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "quick",
        material: "4140",
      });
      expect(r.primary_result).toBeDefined();
    });

    it("should handle unknown material gracefully", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "quick",
        material: "made_up_exotic_alloy",
      });
      expect(r.primary_result).toBeDefined();
    });

    it("should handle validate with invalid params producing issues", () => {
      const r = millMasterOrchestratorFacadeEngine.orchestrate({
        type: "validate",
        material: "4140",
        material_iso: "S",
        rpm: 25000,
        feed_mm_min: 5000,
        axial_depth_mm: 5,
        tool_diameter_mm: 12,
      });
      const result = r.primary_result as { valid: boolean; issues: string[] };
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });
});
