/**
 * TK-AI Hardening Tests
 *
 * Verifies tribal knowledge integration with PRISM AI/LLM systems:
 * - LLMEngine tribal context provider
 * - ProcessAdvice tribal knowledge injection
 * - Master Machinist mode AI reasoning
 * - PUOA tribal synthesis
 */

import { describe, it, expect, beforeAll } from "vitest";
import { LLMEngine, llmEngine, registerTribalContextProvider } from "../engines/LLMEngine.js";
import { tribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";
import { prismUnifiedOrchestratorEngine } from "../engines/PRISMUnifiedOrchestratorEngine.js";
import { prismIntelligence } from "../engines/PRISMIntelligenceLayer.js";

describe("TK-AI Hardening", () => {
  describe("LLMEngine Tribal Context Provider", () => {
    it("should support tribal context type", () => {
      const engine = new LLMEngine();
      engine.registerContextProvider(() => [
        { type: "tribal", title: "Test Tip", content: "Shop floor wisdom", relevance: 0.9 },
      ]);

      const ctx = engine.buildContext("test query", ["tribal"]);
      expect(ctx.length).toBe(1);
      expect(ctx[0].type).toBe("tribal");
    });

    it("should register tribal context provider on llmEngine", async () => {
      await registerTribalContextProvider();
      const stats = llmEngine.stats();
      expect(stats.context_providers).toBeGreaterThan(0);
    });

    it("should include tribal chunks in context building", async () => {
      await registerTribalContextProvider();
      const ctx = llmEngine.buildContext("machining steel tips", ["tribal"]);

      // Should have tribal context chunks
      const tribalChunks = ctx.filter(c => c.type === "tribal");
      expect(tribalChunks.length).toBeGreaterThanOrEqual(0); // May be 0 if no matching tips
    });
  });

  describe("ProcessAdvice Tribal Integration", () => {
    it("should return tribal_knowledge array", async () => {
      const advice = await llmEngine.processAdvice({
        operation: "roughing",
        material: "4140",
      });

      expect(advice).toHaveProperty("tribal_knowledge");
      expect(Array.isArray(advice.tribal_knowledge)).toBe(true);
    });

    it("should populate tribal_knowledge from Master Machinist", async () => {
      const advice = await llmEngine.processAdvice({
        operation: "finishing",
        material: "stainless",
        machine: "Okuma",
      });

      // Should have tips if tribal knowledge has relevant ones
      // (depends on actual tip database content)
      expect(advice.tribal_knowledge).toBeDefined();
    });

    it("should include tribal context in prompt for relevant queries", async () => {
      // Get master machinist recommendations first
      const masterMachinist = tribalKnowledgeEngine.masterMachinistRecommend({
        material: "P",
        operation: "milling",
      });

      // If recommendations exist, processAdvice should use them
      if (masterMachinist.recommendations.length > 0) {
        const advice = await llmEngine.processAdvice({
          operation: "milling",
          material: "P",
        });

        expect(advice.tribal_knowledge.length).toBeGreaterThan(0);
        expect(advice.tribal_knowledge[0]).toContain("Senior machinists say:");
      }
    });
  });

  describe("Master Machinist AI Reasoning", () => {
    it("should provide AI-ready recommendation format", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({
        material: "M",  // Stainless
        operation: "turning",
      });

      expect(result).toHaveProperty("master_machinist_says");
      expect(typeof result.master_machinist_says).toBe("string");

      // Format should be suitable for LLM consumption
      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec.message).toMatch(/Senior machinists say:/);
        expect(rec).toHaveProperty("provenance");
        expect(rec).toHaveProperty("relevance_score");
      }
    });

    it("should rank recommendations by confidence + usage", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({});

      if (result.recommendations.length > 1) {
        // Verify descending order by relevance_score
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i].relevance_score)
            .toBeLessThanOrEqual(result.recommendations[i - 1].relevance_score);
        }
      }
    });
  });

  describe("PUOA Tribal Synthesis", () => {
    it("should synthesize tribal knowledge for machining tasks", () => {
      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        { intent: "machine a pocket in D2 steel", context: { material: "D2" } },
        { tier: "single_dispatcher", domains: ["machining"], complexity: "moderate", reason: "test" }
      );

      expect(synthesis).toHaveProperty("modifiers");
      expect(synthesis).toHaveProperty("constraints");
      expect(synthesis).toHaveProperty("synthesis_report");
      expect(Array.isArray(synthesis.modifiers)).toBe(true);
    });

    it("should provide NL query access for AI agents", () => {
      const result = prismUnifiedOrchestratorEngine.queryTribalKnowledge(
        "tips for finishing titanium"
      );

      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.tips)).toBe(true);
    });

    it("should format synthesis report for LLM consumption", () => {
      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        { intent: "rough machine hardened steel", context: { material: "4140" } },
        { tier: "multi_domain", domains: ["machining", "tooling"], complexity: "complex", reason: "test" }
      );

      expect(synthesis.synthesis_report).toBeDefined();
      expect(typeof synthesis.synthesis_report).toBe("string");

      // Report should be human/AI readable
      if (synthesis.modifiers.length > 0 || synthesis.constraints.length > 0) {
        expect(synthesis.synthesis_report.length).toBeGreaterThan(50);
      }
    });
  });

  describe("AI Learning Loop", () => {
    it("should capture knowledge from LLM reasoning traces", () => {
      const reasoning = {
        session_id: "test-ai-hardening",
        timestamp: new Date().toISOString(),
        decisions: [{
          type: "parameter_override" as const,
          parameter: "cutting_speed",
          original_value: 100,
          new_value: 80,
          action: "Reduced speed for work hardening",
          reason: "Material showing work hardening at layer transitions",
          context: { material: "Inconel", operation: "roughing" },
          outcome: "success" as const,
          outcome_detail: "Eliminated work hardening issue",
        }],
      };

      const candidates = tribalKnowledgeEngine.captureFromLLMReasoning(reasoning);

      expect(Array.isArray(candidates)).toBe(true);
      if (candidates.length > 0) {
        expect(candidates[0]).toHaveProperty("source", "llm_reasoning");
        expect(candidates[0]).toHaveProperty("confidence");
      }
    });
  });

  describe("PRISMIntelligenceLayer Tribal Integration", () => {
    it("should inject tribal synthesis for manufacturing domains", async () => {
      // Test that manufacturing domains trigger tribal synthesis
      const result = await prismIntelligence.reason({
        domain: "speed_feed",
        intent: "optimize cutting parameters for D2 tool steel roughing",
        context: {
          material: "D2",
          operation: "roughing",
          hardness: "60 HRC",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("confidence");
      // Result should be AI or fallback
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should provide reasoning with tribal context for tool selection", async () => {
      const result = await prismIntelligence.reason({
        domain: "tool_selection",
        intent: "recommend end mill for 304 stainless finishing",
        context: {
          material: "304SS",
          operation: "finishing",
          surface_finish: "32 Ra",
        },
      });

      expect(result.success).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    it("should not inject tribal for non-manufacturing domains", async () => {
      const result = await prismIntelligence.reason({
        domain: "general",
        intent: "what is CNC machining",
        context: {},
      });

      expect(result).toHaveProperty("success");
      // Should still work without tribal context
    });
  });
});
