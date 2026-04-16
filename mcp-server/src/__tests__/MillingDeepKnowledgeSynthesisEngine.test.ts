/**
 * Tests for MillingDeepKnowledgeSynthesisEngine
 * Validates unified knowledge synthesis from 12 sources.
 */
import { describe, it, expect } from "vitest";
import {
  MillingDeepKnowledgeSynthesisEngine,
  millingDeepKnowledgeSynthesisEngine,
  type SynthesisRequest,
} from "../engines/MillingDeepKnowledgeSynthesisEngine.js";

describe("MillingDeepKnowledgeSynthesisEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingDeepKnowledgeSynthesisEngine).toBeDefined();
      expect(millingDeepKnowledgeSynthesisEngine).toBeInstanceOf(MillingDeepKnowledgeSynthesisEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingDeepKnowledgeSynthesisEngine();
      expect(engine).toBeInstanceOf(MillingDeepKnowledgeSynthesisEngine);
    });
  });

  // ============================================================================
  // SYNTHESIZE METHOD
  // ============================================================================

  describe("synthesize()", () => {
    it("returns complete SynthesisResult", async () => {
      const request: SynthesisRequest = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.request_id).toMatch(/^SYNTH-/);
      expect(result.timestamp).toBeDefined();
      expect(result.parameters).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.operation_sequence).toBeDefined();
      expect(result.tool_recommendation).toBeDefined();
    });

    it("synthesizes RPM from multiple sources", async () => {
      const request: SynthesisRequest = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 60,
        operation: "finishing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.parameters.rpm).toBeDefined();
      expect(result.parameters.rpm.value).toBeGreaterThan(0);
      expect(result.parameters.rpm.sources.length).toBeGreaterThan(2);
      expect(result.parameters.rpm.final_confidence).toBeGreaterThan(0.7);
      expect(result.parameters.rpm.unit).toBe("rev/min");
    });

    it("synthesizes feed rate from multiple sources", async () => {
      const request: SynthesisRequest = {
        material: "Inconel 718",
        material_iso: "S",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.parameters.feed_mm_min).toBeDefined();
      expect(result.parameters.feed_mm_min.value).toBeGreaterThan(0);
      expect(result.parameters.feed_mm_min.sources.length).toBeGreaterThan(2);
    });

    it("synthesizes DOC from multiple sources", async () => {
      const request: SynthesisRequest = {
        material: "6061-T6",
        material_iso: "N",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.parameters.doc_mm).toBeDefined();
      expect(result.parameters.doc_mm.value).toBeGreaterThan(0);
      expect(result.parameters.doc_mm.value).toBeLessThan(50);
    });

    it("includes strategy recommendation", async () => {
      const request: SynthesisRequest = {
        material: "316 Stainless",
        material_iso: "M",
        operation: "roughing",
        feature_type: "slot",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.strategy.name).toBeDefined();
      expect(result.strategy.confidence).toBeGreaterThan(0.5);
      expect(result.strategy.sources.length).toBeGreaterThan(0);
    });

    it("includes operation sequence", async () => {
      const request: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "roughing",
        tolerance_mm: 0.02,
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.operation_sequence.sequence.length).toBeGreaterThan(2);
      expect(result.operation_sequence.sequence).toContain("Face");
      expect(result.operation_sequence.confidence).toBeGreaterThan(0.7);
    });

    it("includes tool recommendation", async () => {
      const request: SynthesisRequest = {
        material: "Ti-6Al-4V",
        material_iso: "S",
        operation: "roughing",
        tool_diameter_mm: 12,
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.tool_recommendation.type).toBeDefined();
      expect(result.tool_recommendation.diameter_mm).toBe(12);
      expect(result.tool_recommendation.flutes).toBeGreaterThan(0);
      expect(result.tool_recommendation.coating).toBeDefined();
    });

    it("includes tribal tips", async () => {
      const request: SynthesisRequest = {
        material: "Stainless",
        material_iso: "M",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.tribal_tips.length).toBeGreaterThan(0);
      // Should have stainless-specific tips
      expect(result.tribal_tips.some(t => t.toLowerCase().includes("work hardening") || t.toLowerCase().includes("climb"))).toBe(true);
    });

    it("includes playbook rules", async () => {
      const request: SynthesisRequest = {
        material: "Aluminum",
        material_iso: "N",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.playbook_rules.length).toBeGreaterThan(0);
    });

    it("reports sources consulted", async () => {
      const request: SynthesisRequest = {
        material: "Cast Iron",
        material_iso: "K",
        operation: "facing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.sources_consulted.length).toBeGreaterThan(5);
      expect(result.total_entries_searched).toBeGreaterThan(1000);
    });

    it("resolves conflicts between sources", async () => {
      const request: SynthesisRequest = {
        material: "H13",
        material_iso: "H",
        hardness_hrc: 52,
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.conflicts_found).toBeGreaterThanOrEqual(0);
      expect(result.conflicts_resolved).toBe(result.conflicts_found);
    });

    it("calculates overall confidence", async () => {
      const request: SynthesisRequest = {
        material: "4340",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.overall_confidence).toBeGreaterThan(0.5);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("calculates knowledge coverage", async () => {
      const request: SynthesisRequest = {
        material: "A2",
        material_iso: "H",
        operation: "finishing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.knowledge_coverage).toBeGreaterThan(0.5);
    });

    it("tracks computation time", async () => {
      const request: SynthesisRequest = {
        material: "Brass",
        material_iso: "N",
        operation: "finishing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.computation_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC SYNTHESIS
  // ============================================================================

  describe("material-specific synthesis", () => {
    it("reduces parameters for superalloys (S)", async () => {
      const steelReq: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "roughing",
      };

      const inconelReq: SynthesisRequest = {
        material: "Inconel 718",
        material_iso: "S",
        operation: "roughing",
      };

      const steelResult = await millingDeepKnowledgeSynthesisEngine.synthesize(steelReq);
      const inconelResult = await millingDeepKnowledgeSynthesisEngine.synthesize(inconelReq);

      // Superalloys should have lower speeds
      expect(inconelResult.parameters.rpm.value).toBeLessThan(steelResult.parameters.rpm.value);
      expect(inconelResult.parameters.feed_mm_min.value).toBeLessThan(steelResult.parameters.feed_mm_min.value);
    });

    it("increases parameters for aluminum (N)", async () => {
      const steelReq: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "roughing",
      };

      const aluReq: SynthesisRequest = {
        material: "6061-T6",
        material_iso: "N",
        operation: "roughing",
      };

      const steelResult = await millingDeepKnowledgeSynthesisEngine.synthesize(steelReq);
      const aluResult = await millingDeepKnowledgeSynthesisEngine.synthesize(aluReq);

      // Aluminum should have higher speeds
      expect(aluResult.parameters.rpm.value).toBeGreaterThan(steelResult.parameters.rpm.value);
    });

    it("applies hardness corrections for H class", async () => {
      const request: SynthesisRequest = {
        material: "D2",
        material_iso: "H",
        hardness_hrc: 62,
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      // Should be conservative for hard material
      expect(result.parameters.doc_mm.value).toBeLessThan(4);
    });

    it("recommends appropriate coating per material", async () => {
      const tiRequest: SynthesisRequest = {
        material: "Ti-6Al-4V",
        material_iso: "S",
        operation: "roughing",
      };

      const aluRequest: SynthesisRequest = {
        material: "6061",
        material_iso: "N",
        operation: "roughing",
      };

      const tiResult = await millingDeepKnowledgeSynthesisEngine.synthesize(tiRequest);
      const aluResult = await millingDeepKnowledgeSynthesisEngine.synthesize(aluRequest);

      // Titanium needs AlTiN
      expect(tiResult.tool_recommendation.coating.toLowerCase()).toContain("altin");
      // Aluminum prefers uncoated or DLC
      expect(aluResult.tool_recommendation.coating.toLowerCase()).toMatch(/uncoated|dlc/);
    });
  });

  // ============================================================================
  // STRATEGY SELECTION
  // ============================================================================

  describe("strategy selection", () => {
    it("selects trochoidal for slots in hard materials", async () => {
      const request: SynthesisRequest = {
        material: "D2",
        material_iso: "H",
        operation: "roughing",
        feature_type: "slot",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.strategy.name).toBe("trochoidal");
    });

    it("selects HSM for pockets in aluminum", async () => {
      const request: SynthesisRequest = {
        material: "7075",
        material_iso: "N",
        operation: "roughing",
        feature_type: "pocket",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.strategy.name).toBe("hsm");
    });

    it("selects conventional as fallback", async () => {
      const request: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "facing",
        feature_type: "face",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.strategy.name).toBe("conventional");
    });
  });

  // ============================================================================
  // QUICK SYNTHESIZE
  // ============================================================================

  describe("quickSynthesize()", () => {
    it("returns quick recommendations", () => {
      const request: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingDeepKnowledgeSynthesisEngine.quickSynthesize(request);

      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed).toBeGreaterThan(0);
      expect(result.doc).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      expect(result.top_tip).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("adjusts for aluminum", () => {
      const steelResult = millingDeepKnowledgeSynthesisEngine.quickSynthesize({
        material: "4140",
        material_iso: "P",
        operation: "roughing",
      });

      const aluResult = millingDeepKnowledgeSynthesisEngine.quickSynthesize({
        material: "6061",
        material_iso: "N",
        operation: "roughing",
      });

      expect(aluResult.rpm).toBeGreaterThan(steelResult.rpm);
    });

    it("is very fast", () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        millingDeepKnowledgeSynthesisEngine.quickSynthesize({
          material: "4140",
          material_iso: "P",
          operation: "roughing",
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // 1000 calls in <100ms
    });
  });

  // ============================================================================
  // GET SOURCE STATS
  // ============================================================================

  describe("getSourceStats()", () => {
    it("returns all knowledge sources", () => {
      const stats = millingDeepKnowledgeSynthesisEngine.getSourceStats();

      expect(stats.sources.length).toBe(12);
      expect(stats.total_entries).toBeGreaterThan(10000);
      expect(stats.average_credibility).toBeGreaterThan(0.8);
    });

    it("includes source details", () => {
      const stats = millingDeepKnowledgeSynthesisEngine.getSourceStats();

      for (const source of stats.sources) {
        expect(source.id).toBeDefined();
        expect(source.name).toBeDefined();
        expect(source.entries).toBeGreaterThan(0);
        expect(source.credibility).toBeGreaterThan(0);
        expect(source.credibility).toBeLessThanOrEqual(1);
        expect(source.recency).toBeGreaterThan(0);
        expect(source.specificity).toBeGreaterThan(0);
      }
    });

    it("includes key knowledge sources", () => {
      const stats = millingDeepKnowledgeSynthesisEngine.getSourceStats();
      const sourceIds = stats.sources.map(s => s.id);

      expect(sourceIds).toContain("jmdie_programs");
      expect(sourceIds).toContain("hypermill_automation");
      expect(sourceIds).toContain("tribal_knowledge");
      expect(sourceIds).toContain("physics_formulas");
      expect(sourceIds).toContain("playbook_rules");
    });
  });

  // ============================================================================
  // SEARCH KNOWLEDGE
  // ============================================================================

  describe("searchKnowledge()", () => {
    it("finds material-related knowledge", () => {
      const result = millingDeepKnowledgeSynthesisEngine.searchKnowledge("coolant");

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.query).toBe("coolant");
    });

    it("finds strategy-related knowledge", () => {
      const result = millingDeepKnowledgeSynthesisEngine.searchKnowledge("trochoidal");

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.some(r => r.match.toLowerCase().includes("trochoidal"))).toBe(true);
    });

    it("includes relevance scores", () => {
      const result = millingDeepKnowledgeSynthesisEngine.searchKnowledge("coolant");

      for (const item of result.results) {
        expect(item.source).toBeDefined();
        expect(item.match).toBeDefined();
        expect(item.relevance).toBeGreaterThan(0);
        expect(item.relevance).toBeLessThanOrEqual(1);
      }
    });

    it("limits results to 10", () => {
      const result = millingDeepKnowledgeSynthesisEngine.searchKnowledge("a");

      expect(result.results.length).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // CUSTOMER CONTEXT
  // ============================================================================

  describe("customer context handling", () => {
    it("boosts JM Die source for customer queries", async () => {
      const request: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "roughing",
        customer: "FONTANA",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      // Should have consulted customer-specific sources
      expect(result.sources_consulted.some(s => s.id === "jmdie_programs")).toBe(true);
      expect(result.sources_consulted.some(s => s.id === "customer_experience")).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unknown material gracefully", async () => {
      const request: SynthesisRequest = {
        material: "Unknown Material XYZ",
        material_iso: "P", // Default to steel
        operation: "roughing",
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.parameters.rpm.value).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeGreaterThan(0.5);
    });

    it("handles missing optional fields", async () => {
      const request: SynthesisRequest = {
        material: "Steel",
        material_iso: "P",
        operation: "roughing",
        // No optional fields
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      expect(result.parameters).toBeDefined();
      expect(result.strategy).toBeDefined();
    });

    it("handles very small tolerances", async () => {
      const request: SynthesisRequest = {
        material: "4140",
        material_iso: "P",
        operation: "finishing",
        tolerance_mm: 0.001,
      };

      const result = await millingDeepKnowledgeSynthesisEngine.synthesize(request);

      // Should include semi-finish in sequence for tight tolerances
      expect(result.operation_sequence.sequence).toContain("Semi-Finish");
    });
  });
});
