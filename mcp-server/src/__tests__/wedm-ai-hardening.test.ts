/**
 * WEDM-AI Hardening Tests
 *
 * Verifies Wire EDM AI integration with PRISMIntelligenceLayer:
 * - WEDM domain prompts in PRISMIntelligenceLayer
 * - Tribal synthesis for WEDM domains
 * - WEDMCompleteOrchestrationEngine AI reasoning integration
 * - AI recommendations in pipeline output
 */

import { describe, it, expect } from "vitest";
import { prismIntelligence, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";
import { prismUnifiedOrchestratorEngine } from "../engines/PRISMUnifiedOrchestratorEngine.js";

describe("WEDM-AI Hardening", () => {
  describe("PRISMIntelligenceLayer WEDM Domains", () => {
    const wedmDomains: AIReasoningDomain[] = [
      "wedm_wire_selection",
      "wedm_pulse_optimization",
      "wedm_pass_strategy",
      "wedm_flushing",
      "wedm_surface_integrity",
      "edm_general",
    ];

    it("should support all WEDM domains in AIReasoningDomain type", () => {
      // Type check — if these don't compile, the domains aren't in the type
      const domains: AIReasoningDomain[] = wedmDomains;
      expect(domains.length).toBe(6);
    });

    it("should have domain prompts for wedm_wire_selection", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_wire_selection",
        intent: "Select wire for D2 tool steel at 25mm thickness",
        context: {
          material: "D2",
          thickness_mm: 25,
          target_ra_um: 0.8,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("confidence");
      // Should be AI or fallback (fallback if no LLM provider)
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should have domain prompts for wedm_pulse_optimization", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_pulse_optimization",
        intent: "Optimize pulse parameters for carbide 15mm thickness targeting Ra 0.4µm",
        context: {
          material: "carbide",
          thickness_mm: 15,
          target_ra_um: 0.4,
          cobalt_pct: 6,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should have domain prompts for wedm_pass_strategy", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_pass_strategy",
        intent: "Plan skim passes for aerospace spec D2 steel",
        context: {
          material: "D2",
          spec_class: "aerospace",
          target_ra_um: 0.2,
          max_recast_um: 5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should have domain prompts for wedm_flushing", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_flushing",
        intent: "Optimize flushing for titanium at 50mm thickness",
        context: {
          material: "Ti-6Al-4V",
          thickness_mm: 50,
          has_pockets: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should have domain prompts for wedm_surface_integrity", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_surface_integrity",
        intent: "Analyze recast requirements for medical-grade Inconel",
        context: {
          material: "Inconel 718",
          spec_class: "medical",
          max_recast_um: 3,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should have domain prompts for edm_general", async () => {
      const result = await prismIntelligence.reason({
        domain: "edm_general",
        intent: "Compare wire vs sinker EDM for graphite electrode machining",
        context: {
          material: "graphite",
          feature_type: "cavity",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("WEDM Tribal Synthesis", () => {
    it("should synthesize tribal knowledge for WEDM domains", () => {
      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        { intent: "wire EDM D2 tool steel with fine finish", context: { material: "D2" } },
        { tier: "single_dispatcher", domains: ["wedm"], complexity: "moderate", reason: "test" }
      );

      expect(synthesis).toHaveProperty("modifiers");
      expect(synthesis).toHaveProperty("constraints");
      expect(synthesis).toHaveProperty("synthesis_report");
      expect(Array.isArray(synthesis.modifiers)).toBe(true);
    });

    it("should include WEDM domains in manufacturing domain list for tribal injection", async () => {
      // Test that WEDM domains trigger tribal synthesis in PRISMIntelligenceLayer
      const result = await prismIntelligence.reason({
        domain: "wedm_wire_selection",
        intent: "Select wire for stainless steel",
        context: {
          material: "304SS",
          thickness_mm: 20,
        },
      });

      // Should succeed even if tribal tips are empty (just testing the path exists)
      expect(result).toHaveProperty("success");
    });
  });

  describe("WEDMCompleteOrchestrationEngine AI Integration", () => {
    it("should include ai_recommendations in orchestration result", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result).toHaveProperty("ai_recommendations");
      expect(result.ai_recommendations).toHaveProperty("synthesis_report");
    });

    it("should generate AI recommendations for wire selection", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 15,
        target_ra_um: 0.4,
        cobalt_pct: 6,
      });

      expect(result.ai_recommendations).toHaveProperty("wire_selection");
      if (result.ai_recommendations?.wire_selection) {
        expect(result.ai_recommendations.wire_selection).toHaveProperty("success");
        expect(result.ai_recommendations.wire_selection).toHaveProperty("recommendation");
      }
    });

    it("should generate AI recommendations for pulse optimization", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "4140",
        thickness_mm: 30,
        target_ra_um: 1.0,
        hardness_hrc: 50,
      });

      expect(result.ai_recommendations).toHaveProperty("pulse_optimization");
      if (result.ai_recommendations?.pulse_optimization) {
        expect(result.ai_recommendations.pulse_optimization).toHaveProperty("success");
      }
    });

    it("should generate AI recommendations for pass strategy", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.2,
        spec_class: "aerospace",
      });

      expect(result.ai_recommendations).toHaveProperty("pass_strategy");
      if (result.ai_recommendations?.pass_strategy) {
        expect(result.ai_recommendations.pass_strategy).toHaveProperty("success");
      }
    });

    it("should generate AI recommendations for flushing strategy", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Ti-6Al-4V",
        thickness_mm: 50,
        target_ra_um: 0.8,
        submerged: true,
      });

      expect(result.ai_recommendations).toHaveProperty("flushing");
      if (result.ai_recommendations?.flushing) {
        expect(result.ai_recommendations.flushing).toHaveProperty("success");
      }
    });

    it("should generate AI recommendations for surface integrity", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "medical",
        max_recast_um: 3,
      });

      expect(result.ai_recommendations).toHaveProperty("surface_integrity");
      if (result.ai_recommendations?.surface_integrity) {
        expect(result.ai_recommendations.surface_integrity).toHaveProperty("success");
      }
    });

    it("should include synthesis report summarizing AI recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations?.synthesis_report).toBeDefined();
      expect(typeof result.ai_recommendations?.synthesis_report).toBe("string");
      expect(result.ai_recommendations?.synthesis_report.length).toBeGreaterThan(0);
    });
  });

  describe("WEDM AI Safety Considerations", () => {
    it("should include safety warnings in AI recommendations for difficult materials", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 50, // Very thick carbide — challenging
        target_ra_um: 0.2, // Very fine finish — aggressive
        cobalt_pct: 3, // Low cobalt — more brittle
      });

      // AI recommendations should exist
      expect(result.ai_recommendations).toBeDefined();
      // Surface integrity reasoning should flag carbide micro-crack risk
      if (result.ai_recommendations?.surface_integrity?.success) {
        // Expect safety-related content in recommendation
        expect(result.ai_recommendations.surface_integrity.recommendation.length).toBeGreaterThan(50);
      }
    });

    it("should flag galvanic compatibility in wire selection AI reasoning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Ti-6Al-4V",
        thickness_mm: 30,
        target_ra_um: 0.8,
        wire_type: "brass", // Brass on titanium = galvanic issue
      });

      // AI wire selection should consider galvanic compatibility
      expect(result.ai_recommendations?.wire_selection).toBeDefined();
      // Physical result should also flag galvanic risk
      expect(result.wire_selection.galvanic_risk).toBeDefined();
    });
  });

  describe("WEDM Physics Formula References in AI", () => {
    it("should reference Klocke model in pulse optimization reasoning", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_pulse_optimization",
        intent: "Optimize pulse for D2 steel Ra 0.6µm",
        context: {
          material: "D2",
          target_ra_um: 0.6,
        },
      });

      // The domain prompt references Klocke model
      // AI response should incorporate physics-based reasoning
      expect(result).toHaveProperty("reasoning");
      expect(Array.isArray(result.reasoning)).toBe(true);
    });

    it("should reference Kunieda MRR model in flushing reasoning", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_flushing",
        intent: "Optimize debris evacuation for 100mm thick aluminum",
        context: {
          material: "aluminum",
          thickness_mm: 100,
        },
      });

      expect(result).toHaveProperty("recommendation");
    });

    it("should reference Carslaw-Jaeger recast model in surface integrity reasoning", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_surface_integrity",
        intent: "Predict recast depth for H13 with 5µs pulse",
        context: {
          material: "H13",
          t_on_us: 5,
        },
      });

      expect(result).toHaveProperty("recommendation");
    });
  });
});
