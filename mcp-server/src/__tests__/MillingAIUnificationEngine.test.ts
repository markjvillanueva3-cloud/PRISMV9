/**
 * Tests for MillingAIUnificationEngine
 * Validates complete AI system integration for milling.
 */
import { describe, it, expect } from "vitest";
import {
  MillingAIUnificationEngine,
  millingAIUnificationEngine,
  type UnifiedMillingRequest,
  type SystemInventory,
} from "../engines/MillingAIUnificationEngine.js";

describe("MillingAIUnificationEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingAIUnificationEngine).toBeDefined();
      expect(millingAIUnificationEngine).toBeInstanceOf(MillingAIUnificationEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingAIUnificationEngine();
      expect(engine).toBeInstanceOf(MillingAIUnificationEngine);
    });
  });

  // ============================================================================
  // SYSTEM INVENTORY
  // ============================================================================

  describe("getSystemInventory()", () => {
    it("returns complete system inventory", () => {
      const inventory = millingAIUnificationEngine.getSystemInventory();

      expect(inventory.databases.length).toBeGreaterThan(5);
      expect(inventory.engines.length).toBeGreaterThan(10);
      expect(inventory.formulas.length).toBeGreaterThan(5);
      expect(inventory.algorithms.length).toBeGreaterThan(5);
      expect(inventory.tribal_tips).toBeGreaterThan(3000);
      expect(inventory.playbook_rules).toBeGreaterThan(200);
      expect(inventory.hooks).toBeGreaterThan(100);
      expect(inventory.skills).toBeGreaterThan(50);
      expect(inventory.scripts).toBeGreaterThan(40);
    });

    it("includes JM Die databases", () => {
      const inventory = millingAIUnificationEngine.getSystemInventory();

      expect(inventory.databases.some(d => d.name.includes("JM Die"))).toBe(true);
      expect(inventory.databases.some(d => d.name.includes("PROVEN"))).toBe(true);
    });

    it("includes HyperMill and WinMax knowledge", () => {
      const inventory = millingAIUnificationEngine.getSystemInventory();

      expect(inventory.databases.some(d => d.name.includes("HyperMill"))).toBe(true);
      expect(inventory.databases.some(d => d.name.includes("WinMax"))).toBe(true);
    });

    it("includes key milling engines", () => {
      const inventory = millingAIUnificationEngine.getSystemInventory();

      expect(inventory.engines.some(e => e.name.includes("Ultimate"))).toBe(true);
      expect(inventory.engines.some(e => e.name.includes("Neural"))).toBe(true);
      expect(inventory.engines.some(e => e.name.includes("Kienzle"))).toBe(true);
    });

    it("includes essential formulas", () => {
      const inventory = millingAIUnificationEngine.getSystemInventory();

      expect(inventory.formulas.some(f => f.name.includes("Kienzle"))).toBe(true);
      expect(inventory.formulas.some(f => f.name.includes("Taylor"))).toBe(true);
      expect(inventory.formulas.some(f => f.name.includes("Surface"))).toBe(true);
    });
  });

  // ============================================================================
  // RECOMMEND METHOD
  // ============================================================================

  describe("recommend()", () => {
    it("returns complete UnifiedMillingResponse", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.request_id).toMatch(/^UNIFIED-/);
      expect(response.timestamp).toBeDefined();
      expect(response.parameters.rpm).toBeGreaterThan(0);
      expect(response.parameters.feed_mm_min).toBeGreaterThan(0);
      expect(response.parameters.doc_mm).toBeGreaterThan(0);
      expect(response.strategy).toBeDefined();
      expect(response.operation_sequence.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
    });

    it("tracks sources used", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        customer: "FONTANA",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.sources_used.databases.length).toBeGreaterThan(0);
      expect(response.sources_used.engines.length).toBeGreaterThan(0);
      expect(response.sources_used.formulas.length).toBeGreaterThan(0);
      expect(response.sources_used.databases.some(d => d.includes("JM Die"))).toBe(true);
    });

    it("applies tribal knowledge", async () => {
      const request: UnifiedMillingRequest = {
        material: "D2 Tool Steel",
        material_iso: "H",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.tribal_tips_applied.length).toBeGreaterThan(0);
      expect(response.tribal_tips_applied.some(t => t.toLowerCase().includes("d2"))).toBe(true);
    });

    it("validates physics", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        tool_diameter_mm: 10,
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(typeof response.physics_validated).toBe("boolean");
      expect(Array.isArray(response.warnings)).toBe(true);
    });

    it("recommends appropriate tool", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "finishing",
        surface_finish_ra: 0.8,
        tool_diameter_mm: 10,
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.tool_recommendation.type).toBeDefined();
      expect(response.tool_recommendation.diameter_mm).toBe(10);
      expect(response.tool_recommendation.flutes).toBeGreaterThan(0);
      expect(response.tool_recommendation.coating).toBeDefined();
    });

    it("generates operation sequence", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        feature_type: "deep_pocket",
        depth_mm: 50,
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.operation_sequence).toContain("Face");
      expect(response.operation_sequence).toContain("Rough");
      expect(response.operation_sequence.some(op => op.includes("Rest"))).toBe(true);
    });

    it("builds reasoning chain", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.reasoning_chain.length).toBeGreaterThan(0);
      expect(response.reasoning_chain.some(r => r.includes("Material"))).toBe(true);
      expect(response.reasoning_chain.some(r => r.includes("Strategy"))).toBe(true);
    });

    it("calculates metrics", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response.knowledge_coverage).toBeGreaterThan(0);
      expect(response.system_utilization).toBeGreaterThan(0);
      // computation_time_ms can be 0 if operation completes within same millisecond
      expect(response.computation_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("adjusts for hard materials (H group)", async () => {
      const softRequest: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const hardRequest: UnifiedMillingRequest = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        operation: "roughing",
      };

      const softResponse = await millingAIUnificationEngine.recommend(softRequest);
      const hardResponse = await millingAIUnificationEngine.recommend(hardRequest);

      expect(hardResponse.parameters.rpm).toBeLessThan(softResponse.parameters.rpm);
      expect(hardResponse.parameters.feed_mm_min).toBeLessThan(softResponse.parameters.feed_mm_min);
    });

    it("adjusts for aluminum (N group)", async () => {
      const steelRequest: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const aluminumRequest: UnifiedMillingRequest = {
        material: "6061 Aluminum",
        material_iso: "N",
        operation: "roughing",
      };

      const steelResponse = await millingAIUnificationEngine.recommend(steelRequest);
      const aluminumResponse = await millingAIUnificationEngine.recommend(aluminumRequest);

      expect(aluminumResponse.parameters.rpm).toBeGreaterThan(steelResponse.parameters.rpm);
      expect(aluminumResponse.tool_recommendation.flutes).toBe(2);
    });

    it("provides titanium-specific tips (S group)", async () => {
      const request: UnifiedMillingRequest = {
        material: "Titanium Ti-6Al-4V",
        material_iso: "S",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      // Should get titanium-specific tips (speed reduction, high pressure coolant, etc.)
      expect(response.tribal_tips_applied.length).toBeGreaterThan(0);
      expect(response.tribal_tips_applied.some(t =>
        t.toLowerCase().includes("titanium") || t.toLowerCase().includes("speed")
      )).toBe(true);
    });
  });

  // ============================================================================
  // QUICK RECOMMEND
  // ============================================================================

  describe("quickRecommend()", () => {
    it("returns quick result", () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingAIUnificationEngine.quickRecommend(request);

      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed).toBeGreaterThan(0);
      expect(result.doc).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("includes top tribal tip", () => {
      const request: UnifiedMillingRequest = {
        material: "D2 Tool Steel",
        material_iso: "H",
        operation: "roughing",
      };

      const result = millingAIUnificationEngine.quickRecommend(request);

      expect(result.top_tip.toLowerCase()).toContain("d2");
    });
  });

  // ============================================================================
  // UTILIZATION REPORT
  // ============================================================================

  describe("getUtilizationReport()", () => {
    it("returns utilization statistics", () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        customer: "FONTANA",
      };

      const report = millingAIUnificationEngine.getUtilizationReport(request);

      expect(report.databases_used.length).toBeGreaterThan(0);
      expect(report.databases_available.length).toBeGreaterThan(5);
      expect(report.engines_used.length).toBeGreaterThan(0);
      expect(report.engines_available.length).toBeGreaterThan(10);
      expect(report.formulas_used.length).toBeGreaterThan(0);
      expect(report.algorithms_used.length).toBeGreaterThan(0);
      expect(report.coverage_pct).toBeGreaterThan(0);
    });

    it("includes customer-specific databases", () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        customer: "FONTANA",
      };

      const report = millingAIUnificationEngine.getUtilizationReport(request);

      expect(report.databases_used.some(d => d.includes("JM Die"))).toBe(true);
      expect(report.databases_used.some(d => d.includes("PROVEN"))).toBe(true);
    });

    it("includes WinMax for Hurco machines", () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        machine: "Hurco VM10",
        controller: "WinMax",
      };

      const report = millingAIUnificationEngine.getUtilizationReport(request);

      expect(report.databases_used.some(d => d.includes("WinMax"))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal request", async () => {
      const request: UnifiedMillingRequest = {
        material: "steel",
        material_iso: "P",
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response).toBeDefined();
      expect(response.parameters.rpm).toBeGreaterThan(0);
    });

    it("handles unknown material ISO gracefully", async () => {
      const request: UnifiedMillingRequest = {
        material: "Unknown Material",
        material_iso: "X" as any,
        operation: "roughing",
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response).toBeDefined();
      // Falls back to P group factors
      expect(response.parameters.rpm).toBeGreaterThan(0);
    });

    it("handles disabled options", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        use_neural: false,
        use_tribal: false,
        use_physics: false,
      };

      const response = await millingAIUnificationEngine.recommend(request);

      expect(response).toBeDefined();
      expect(response.tribal_tips_applied.length).toBe(0);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("recommend completes quickly", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const start = Date.now();
      const response = await millingAIUnificationEngine.recommend(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(response.computation_time_ms).toBeLessThan(100);
    });

    it("quickRecommend is very fast", () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingAIUnificationEngine.quickRecommend(request);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("recommend returns consistent results", async () => {
      const request: UnifiedMillingRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const response1 = await millingAIUnificationEngine.recommend(request);
      const response2 = await millingAIUnificationEngine.recommend(request);

      expect(response1.parameters.rpm).toBe(response2.parameters.rpm);
      expect(response1.parameters.feed_mm_min).toBe(response2.parameters.feed_mm_min);
      expect(response1.strategy).toBe(response2.strategy);
    });
  });
});
