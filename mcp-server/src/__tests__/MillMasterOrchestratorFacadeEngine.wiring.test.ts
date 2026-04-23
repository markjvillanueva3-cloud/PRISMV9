/**
 * MillMasterOrchestratorFacadeEngine Wiring Tests
 * MILL-MASTER/P1-U02-FACADE-WIRE
 *
 * Verifies route reachability for all 7 MillOrchRequestTypes:
 * print_to_program, scientific, agi, validate, quick, wisdom, adaptive
 *
 * ≥14 tests covering: routing, provenance stamping, error handling, edge cases.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  millMasterOrchestratorFacadeEngine,
  MillOrchRequestType,
  MillOrchestrationRequest,
} from "../engines/MillMasterOrchestratorFacadeEngine.js";

describe("MillMasterOrchestratorFacadeEngine wiring", () => {
  describe("route registration", () => {
    it("should have all 7 request types registered", () => {
      const types = millMasterOrchestratorFacadeEngine.getRequestTypes();
      expect(types).toHaveLength(7);
      expect(types).toContain("print_to_program");
      expect(types).toContain("scientific");
      expect(types).toContain("agi");
      expect(types).toContain("validate");
      expect(types).toContain("quick");
      expect(types).toContain("wisdom");
      expect(types).toContain("adaptive");
    });

    it("should have named sub-orchestrators for each type", () => {
      const expectedNames: Record<MillOrchRequestType, string> = {
        print_to_program: "MillP2POrchestrator",
        scientific: "MillScientificOrchestrator",
        agi: "MillingAGIMasterEngine",
        validate: "MillValidationOrchestrator",
        quick: "MillQuickHelpers",
        wisdom: "TribalKnowledgeAdvisor",
        adaptive: "AdaptiveToolpathRouter",
      };

      for (const [type, name] of Object.entries(expectedNames)) {
        const subOrch = millMasterOrchestratorFacadeEngine.getSubOrchestrator(type as MillOrchRequestType);
        expect(subOrch, `Missing sub-orchestrator for ${type}`).toBeDefined();
        expect(subOrch!.name).toBe(name);
      }
    });
  });

  describe("print_to_program routing — unwired, throws NotWiredError", () => {
    it("returns success=false with null result (no fake program output)", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "print_to_program",
        material: "6061-T6",
        iso_group: "N",
        features: [{ id: "F1", type: "pocket" }],
      };
      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);
      expect(response.success).toBe(false);
      expect(response.request_type).toBe("print_to_program");
      expect(response.result).toBeNull();
      expect(response.provenance.engines_invoked).toContain("MillP2POrchestrator");
    });

    it("provenance still stamps processing time on failure", async () => {
      const request: MillOrchestrationRequest = { request_type: "print_to_program" };
      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);
      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.provenance.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("scientific routing", () => {
    it("should calculate cutting forces for aluminum (ISO N)", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "scientific",
        iso_group: "N",
        tool: { diameter_mm: 12, flutes: 3 },
        params: { rpm: 10000, feed_mmpm: 2000, doc_mm: 3, woc_mm: 1.2 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      expect(response.result).toHaveProperty("Fc_N");
      expect(response.result).toHaveProperty("power_kW");
      expect((response.result as any).Fc_N).toBeGreaterThan(0);
    });

    it("should calculate cutting forces for steel (ISO P)", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "scientific",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4 },
        params: { rpm: 5000, feed_mmpm: 800, doc_mm: 2, woc_mm: 1 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.Fc_N).toBeGreaterThan(0);
      expect(result.formulas_used).toContain("kienzle_force");
    });
  });

  describe("agi routing — delegates to MillingAGIMasterEngine.reason()", () => {
    it("returns reasoning chain from real AGI engine", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "agi",
        intent: "Machine a 50x30x15mm pocket in 7075-T6 aluminum",
        reasoning_mode: "chain_of_thought",
      };
      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);
      expect(response.success).toBe(true);
      expect(response.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
      const result = response.result as any;
      expect(Array.isArray(result.reasoning_steps)).toBe(true);
      expect(result.reasoning_mode).toBe("chain_of_thought");
      expect(result.intent).toBe("Machine a 50x30x15mm pocket in 7075-T6 aluminum");
    });
  });

  describe("validate routing — unwired, no fabricated safety score", () => {
    it("returns success=false (validation engine not yet built)", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "validate",
        gcode: "G0 X0 Y0 Z50\nG1 Z-10 F500\nM30",
      };
      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);
      expect(response.success).toBe(false);
      expect(response.result).toBeNull();
      expect(response.warnings.join(" ")).toMatch(/ProgramAnalyzer|CollisionEngine|not yet/i);
    });
  });

  describe("quick routing", () => {
    it("should calculate quick speed/feed for aluminum", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "quick",
        iso_group: "N",
        tool: { diameter_mm: 12, flutes: 3 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed_mmpm).toBeGreaterThan(0);
      expect(result.vc_mpm).toBeGreaterThan(0);
      expect(result.formulas_used).toContain("cutting_speed_to_rpm");
    });

    it("should calculate quick speed/feed for steel", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "quick",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.rpm).toBeLessThan(10000); // Steel runs slower than aluminum
      expect(result.fz_mm).toBeLessThan(0.1); // Smaller chip load for steel
    });
  });

  describe("wisdom routing — unwired, no fabricated tips", () => {
    it("returns success=false and points callers to prism_knowledge:tribal_search", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "wisdom",
        query: "roughing",
        domain: "milling",
      };
      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);
      expect(response.success).toBe(false);
      expect(response.result).toBeNull();
      expect(response.warnings.join(" ")).toMatch(/tribal_search|TribalKnowledge|not yet/i);
    });
  });

  describe("adaptive routing — unwired, no fabricated toolpath", () => {
    it("returns success=false (AdaptiveToolpathRouterEngine not yet built)", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "adaptive",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(false);
      expect(response.result).toBeNull();
      expect(response.provenance.engines_invoked).toContain("AdaptiveToolpathRouter");
      expect(response.warnings.join(" ")).toMatch(/not wired|not yet built|AdaptiveToolpathRouter/i);
    });
  });

  describe("error handling", () => {
    it("should handle unknown request type gracefully", async () => {
      const request = {
        request_type: "unknown_type" as MillOrchRequestType,
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(false);
      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.warnings[0]).toContain("Unknown request type");
    });
  });

  describe("helper methods", () => {
    it("recognizeFeatures returns feature array with confidence", async () => {
      // recognizeFeatures is a helper stub that fabricates fixture features —
      // keeping it for now as it's only called internally and returns
      // documented placeholder shape. Callers should use a real recognizer.
      const result = await millMasterOrchestratorFacadeEngine.recognizeFeatures({});
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("planProcess returns operations and sequence", async () => {
      const result = await millMasterOrchestratorFacadeEngine.planProcess({});
      expect(Array.isArray(result.operations)).toBe(true);
      expect(result.operations.length).toBeGreaterThan(0);
      expect(Array.isArray(result.sequence)).toBe(true);
      expect(result.sequence.length).toBe(result.operations.length);
    });

    it("getStats should track invocation counts", async () => {
      // Make a few calls
      await millMasterOrchestratorFacadeEngine.orchestrate({ request_type: "quick" });
      await millMasterOrchestratorFacadeEngine.orchestrate({ request_type: "quick" });

      const stats = millMasterOrchestratorFacadeEngine.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType.quick).toBeGreaterThan(0);
      expect(stats.avgDuration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("provenance tracking", () => {
    it("should include all required provenance fields", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "scientific",
        iso_group: "N",
      });

      const prov = response.provenance;
      expect(prov.request_type).toBe("scientific");
      expect(prov.engines_invoked).toBeDefined();
      expect(prov.engines_invoked.length).toBeGreaterThan(0);
      expect(prov.formulas_used).toBeDefined();
      expect(prov.tribal_sources).toBeDefined();
      expect(prov.confidence).toBeGreaterThanOrEqual(0);
      expect(prov.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(prov.ts).toBeDefined();
    });
  });
});
