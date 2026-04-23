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
    it("should have all 19 request types registered (7 original + 12 P1-U10)", () => {
      const types = millMasterOrchestratorFacadeEngine.getRequestTypes();
      expect(types).toHaveLength(19);
      // Original 7
      expect(types).toContain("print_to_program");
      expect(types).toContain("scientific");
      expect(types).toContain("agi");
      expect(types).toContain("validate");
      expect(types).toContain("quick");
      expect(types).toContain("wisdom");
      expect(types).toContain("adaptive");
      // P1-U10 additions
      expect(types).toContain("ai_learning");
      expect(types).toContain("mill_turn");
      expect(types).toContain("five_axis");
      expect(types).toContain("multi_axis");
      expect(types).toContain("tribal_writeback");
      expect(types).toContain("pattern_sync");
      expect(types).toContain("blueprint_bridge");
      expect(types).toContain("model_load");
      expect(types).toContain("hive_sync");
      expect(types).toContain("customer_learn");
      expect(types).toContain("outcome_replan");
      expect(types).toContain("jmdie_refresh");
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
        // P1-U10 extensions
        ai_learning: "MillingAILearningOrchestratorEngine",
        mill_turn: "MillTurnOrchestrationEngine",
        five_axis: "FiveAxisAggregatorEngine",
        multi_axis: "MultiAxisAggregatorEngine",
        tribal_writeback: "TribalKnowledgeAdvisor",
        pattern_sync: "MillPatternMinerEngine",
        blueprint_bridge: "MillPrintToProgramEngine",
        model_load: "MillDeepLearningEngine",
        hive_sync: "HiveSyncCoordinator",
        customer_learn: "MillingMetaLearningEngine",
        outcome_replan: "MillMasterOrchestratorFacadeEngine",
        jmdie_refresh: "PRISMSelfAwarenessEngine",
      };

      for (const [type, name] of Object.entries(expectedNames)) {
        const subOrch = millMasterOrchestratorFacadeEngine.getSubOrchestrator(type as MillOrchRequestType);
        expect(subOrch, `Missing sub-orchestrator for ${type}`).toBeDefined();
        expect(subOrch!.name).toBe(name);
      }
    });
  });

  describe("print_to_program routing", () => {
    it("should route print_to_program and return program details", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "print_to_program",
        material: "6061-T6",
        iso_group: "N",
        features: [{ id: "F1", type: "pocket" }],
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      expect(response.request_type).toBe("print_to_program");
      expect(response.result).toHaveProperty("program_number");
      expect(response.result).toHaveProperty("cycle_time_min");
      expect(response.provenance.engines_invoked).toContain("MillP2POrchestrator");
    });

    it("should stamp provenance with processing time", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "print_to_program",
      };

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

  describe("agi routing", () => {
    it("should return reasoning chain for AGI request", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "agi",
        intent: "Machine a 50x30x15mm pocket in 7075-T6 aluminum",
        reasoning_mode: "chain_of_thought",
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      expect(response.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
      const result = response.result as any;
      expect(result.reasoning_steps).toBeDefined();
      expect(result.reasoning_steps.length).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
    });
  });

  describe("validate routing", () => {
    it("should validate program and return safety score", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "validate",
        gcode: "G0 X0 Y0 Z50\nG1 Z-10 F500\nM30",
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.valid).toBe(true);
      expect(result.safety_score).toBeGreaterThanOrEqual(0);
      expect(result.safety_score).toBeLessThanOrEqual(1);
      expect(result.checks_performed).toContain("collision");
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
      expect(result.sfm).toBeGreaterThan(0);
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

  describe("wisdom routing", () => {
    it("should return tribal knowledge tips for roughing query", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "wisdom",
        query: "roughing",
        domain: "milling",
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      expect(response.provenance.engines_invoked).toContain("TribalKnowledgeAdvisor");
      const result = response.result as any;
      expect(result.tips).toBeDefined();
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.sources).toBeDefined();
    });
  });

  describe("adaptive routing", () => {
    it("should return adaptive toolpath parameters", async () => {
      const request: MillOrchestrationRequest = {
        request_type: "adaptive",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4 },
      };

      const response = await millMasterOrchestratorFacadeEngine.orchestrate(request);

      expect(response.success).toBe(true);
      expect(response.provenance.engines_invoked).toContain("AdaptiveToolpathRouter");
      const result = response.result as any;
      expect(result.strategy).toBe("prism_forces");
      expect(result.engagement_percent).toBeGreaterThan(0);
      expect(result.chip_load_constant).toBe(true);
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
    it("recognizeFeatures should return feature array with confidence", async () => {
      const result = await millMasterOrchestratorFacadeEngine.recognizeFeatures({});

      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("planProcess should return operations and sequence", async () => {
      const result = await millMasterOrchestratorFacadeEngine.planProcess({});

      expect(result.operations).toBeDefined();
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.sequence).toBeDefined();
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
