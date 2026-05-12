/**
 * TK-MS7-U33: PUOA Tribal Synthesis Tests
 *
 * Tests the tribal knowledge synthesis for PUOA task execution,
 * enabling LLM-level AI to automatically inject tribal knowledge
 * into machining task parameters.
 */

import { describe, it, expect } from "vitest";
import {
  prismUnifiedOrchestratorEngine,
  type PUOAInput,
  type TierRoutingResult,
  type TribalSynthesis,
} from "../engines/PRISMUnifiedOrchestratorEngine.js";

describe("TK-MS7: PUOA Tribal Synthesis", () => {
  describe("queryTribalKnowledge", () => {
    it("should provide direct NL query access on PUOA engine", () => {
      const result = prismUnifiedOrchestratorEngine.queryTribalKnowledge(
        "tips for roughing hardened steel"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("summary");
    });

    it("should return structured tips with provenance", () => {
      const result = prismUnifiedOrchestratorEngine.queryTribalKnowledge(
        "stainless steel work hardening"
      );

      expect(result.tips.length).toBeGreaterThan(0);
      for (const tip of result.tips) {
        expect(tip).toHaveProperty("provenance");
        expect(tip.provenance).toHaveProperty("source");
      }
    });
  });

  describe("synthesizeTribalForTask", () => {
    it("should synthesize tribal knowledge for machining task", () => {
      const input: PUOAInput = {
        intent: "rough machine a pocket in 4140 steel",
        context: {
          material: "4140",
          operation: "pocket",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining", "tooling"],
        complexity: "moderate",
        reason: "Standard machining task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis).toBeDefined();
      expect(synthesis).toHaveProperty("query_used");
      expect(synthesis).toHaveProperty("modifiers");
      expect(synthesis).toHaveProperty("constraints");
      expect(synthesis).toHaveProperty("warnings");
      expect(synthesis).toHaveProperty("synthesis_report");
    });

    it("should extract modifiers for parameter adjustment", () => {
      const input: PUOAInput = {
        intent: "finish machining titanium with slow speeds",
        context: {
          material: "Ti-6Al-4V",
        },
      };
      const routing: TierRoutingResult = {
        tier: "multi_domain",
        domains: ["machining", "materials"],
        complexity: "complex",
        reason: "Exotic material machining",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(Array.isArray(synthesis.modifiers)).toBe(true);
      for (const mod of synthesis.modifiers) {
        expect(mod).toHaveProperty("parameter");
        expect(mod).toHaveProperty("adjustment");
        expect(mod).toHaveProperty("reason");
        expect(mod).toHaveProperty("confidence");
        expect(["nl_query", "advisor"]).toContain(mod.source);
      }
    });

    it("should extract constraints for limit enforcement", () => {
      const input: PUOAInput = {
        intent: "drill holes in Inconel 718",
        context: {
          material: "Inconel 718",
          operation: "drilling",
        },
      };
      const routing: TierRoutingResult = {
        tier: "multi_domain",
        domains: ["machining", "tooling"],
        complexity: "complex",
        reason: "Superalloy drilling",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(Array.isArray(synthesis.constraints)).toBe(true);
      for (const con of synthesis.constraints) {
        expect(con).toHaveProperty("type");
        expect(con).toHaveProperty("description");
        expect(con).toHaveProperty("severity");
        expect(["prohibition", "requirement", "warning"]).toContain(con.type);
      }
    });

    it("should generate synthesis report for LLM", () => {
      const input: PUOAInput = {
        intent: "machine deep pocket in aluminum",
        context: {
          material: "6061-T6",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "moderate",
        reason: "Deep pocket operation",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis.synthesis_report).toBeDefined();
      expect(typeof synthesis.synthesis_report).toBe("string");
      expect(synthesis.synthesis_report.length).toBeGreaterThan(50);
      // Report should contain markdown formatting
      expect(synthesis.synthesis_report).toMatch(/##|###|\*\*/);
    });

    it("should return top tips with relevance scores", () => {
      const input: PUOAInput = {
        intent: "face mill cast iron without coolant",
        context: {
          material: "Gray Cast Iron",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "simple",
        reason: "Face milling task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis.top_tips.length).toBeLessThanOrEqual(5);
      for (const tip of synthesis.top_tips) {
        expect(tip).toHaveProperty("id");
        expect(tip).toHaveProperty("title");
        expect(tip).toHaveProperty("body");
        expect(tip).toHaveProperty("confidence");
        expect(tip).toHaveProperty("relevance_score");
      }
    });

    it("should indicate when modifiers should be auto-applied", () => {
      const input: PUOAInput = {
        intent: "thread mill in stainless steel",
        context: {
          material: "304SS",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "moderate",
        reason: "Threading operation",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(typeof synthesis.should_apply_modifiers).toBe("boolean");
      expect(typeof synthesis.confidence).toBe("number");
      expect(synthesis.confidence).toBeGreaterThanOrEqual(0);
      expect(synthesis.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe("tribal synthesis for non-machining tasks", () => {
    it("should handle non-machining domains gracefully", () => {
      const input: PUOAInput = {
        intent: "generate a quote for customer",
        context: {},
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["business", "quoting"],
        complexity: "simple",
        reason: "Business operation",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis).toBeDefined();
      // Non-machining tasks may have fewer or no tribal tips
    });
  });

  describe("query building", () => {
    it("should extract operation from intent", () => {
      const input: PUOAInput = {
        intent: "roughing operation for steel pocket",
        context: {},
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "moderate",
        reason: "Roughing task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      // Query should include extracted operation
      expect(synthesis.query_used).toMatch(/rough/i);
    });

    it("should include material from context", () => {
      const input: PUOAInput = {
        intent: "finish machining part",
        context: {
          material: "D2 Tool Steel",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "moderate",
        reason: "Finishing task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis.query_used).toContain("D2 Tool Steel");
    });

    it("should include machine from context", () => {
      const input: PUOAInput = {
        intent: "run milling operation",
        context: {
          machine: "Okuma MB-5000H",
        },
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "simple",
        reason: "Milling task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis.query_used).toContain("Okuma MB-5000H");
    });
  });

  describe("edge cases", () => {
    it("should handle empty intent", () => {
      const input: PUOAInput = {
        intent: "",
        context: {},
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "simple",
        reason: "Empty intent",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis).toBeDefined();
      expect(synthesis.synthesis_report).toBeDefined();
    });

    it("should handle missing context", () => {
      const input: PUOAInput = {
        intent: "machine a part",
        context: undefined,
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "simple",
        reason: "Basic task",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis).toBeDefined();
    });

    it("should handle very long intent", () => {
      const input: PUOAInput = {
        intent: "I need to " + "rough machine ".repeat(50) + "a pocket in steel",
        context: {},
      };
      const routing: TierRoutingResult = {
        tier: "single_dispatcher",
        domains: ["machining"],
        complexity: "simple",
        reason: "Long intent",
      };

      const synthesis = prismUnifiedOrchestratorEngine.synthesizeTribalForTask(
        input,
        routing
      );

      expect(synthesis).toBeDefined();
    });
  });
});
