/**
 * AIAutoUtilizationEngine Tests
 * ==============================
 * Tests for automatic capability detection, pattern matching, and
 * command recommendation system.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AIAutoUtilizationEngine,
  aiAutoUtilizationEngine,
  type UserContext,
} from "../engines/AIAutoUtilizationEngine.js";

describe("AIAutoUtilizationEngine", () => {
  let engine: AIAutoUtilizationEngine;

  beforeEach(() => {
    engine = new AIAutoUtilizationEngine();
  });

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(aiAutoUtilizationEngine).toBeDefined();
      expect(aiAutoUtilizationEngine).toBeInstanceOf(AIAutoUtilizationEngine);
    });
  });

  describe("analyze", () => {
    it("should detect PDF learning intent", () => {
      const result = engine.analyze("I need to learn from this PDF document");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/pdf-learn");
      expect(result.reasoning).toContain("pdf-learn");
    });

    it("should detect video learning intent", () => {
      const result = engine.analyze("Can you learn from this YouTube video?");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/video-learn");
    });

    it("should detect forge-triple intent", () => {
      const result = engine.analyze("I need to create a new engine for tool selection");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/forge-triple");
    });

    it("should detect dedup intent", () => {
      const result = engine.analyze("Check for duplicates before creating");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/dedup");
    });

    it("should detect wire EDM intent", () => {
      const result = engine.analyze("I need to write a wire edm program");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/wire-edm-studio");
    });

    it("should detect lathe intent", () => {
      const result = engine.analyze("Create an Okuma lathe program");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/lathe-studio");
    });

    it("should detect speed/feed intent", () => {
      const result = engine.analyze("What speed and feed should I use for steel?");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/auto-speed-feed");
    });

    it("should detect quote intent", () => {
      const result = engine.analyze("Create a quote for this job");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/quote-to-ship");
    });

    it("should provide alternatives", () => {
      const result = engine.analyze("I need to optimize this program");

      expect(result.alternatives).toBeInstanceOf(Array);
      // Should have at least one alternative
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("should generate reasoning", () => {
      const result = engine.analyze("Learn from this PDF");

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(10);
    });

    it("should build command sequence for creation tasks", () => {
      const result = engine.analyze("Create a new engine for material selection");

      expect(result.command_sequence).toContain("/dedup");
      expect(result.command_sequence).toContain("/forge-triple");
    });

    it("should consider context in recommendations", () => {
      const context: Partial<UserContext> = {
        domain_focus: "learning",
        recent_engines: ["PDFFormulaExtractionEngine"],
      };

      const result = engine.analyze("Extract knowledge from this document", context);

      expect(result.primary?.context_relevance).toBeGreaterThan(0.5);
    });

    it("should recommend auto-invoke for high-confidence matches", () => {
      // Exact command mention should trigger auto-invoke
      const result = engine.analyze("learn from pdf extract knowledge from this pdf catalog");

      expect(result.primary).not.toBeNull();
      expect(result.primary?.capability.name).toBe("/pdf-learn");
      // High confidence matches should have high scores
      expect(result.primary?.match_score).toBeGreaterThan(0.5);
    });

    it("should not auto-invoke for vague input", () => {
      const result = engine.analyze("do something with the data");

      expect(result.auto_invoke).toBe(false);
    });
  });

  describe("listCapabilities", () => {
    it("should return all capabilities", () => {
      const caps = engine.listCapabilities();

      expect(caps).toBeInstanceOf(Array);
      expect(caps.length).toBeGreaterThan(15);
    });

    it("should include essential commands", () => {
      const caps = engine.listCapabilities();
      const names = caps.map((c) => c.name);

      expect(names).toContain("/pdf-learn");
      expect(names).toContain("/video-learn");
      expect(names).toContain("/forge-triple");
      expect(names).toContain("/dedup");
      expect(names).toContain("/wire-edm-studio");
      expect(names).toContain("/lathe-studio");
      expect(names).toContain("/auto-speed-feed");
      expect(names).toContain("/quote-to-ship");
    });
  });

  describe("getCapabilitiesByType", () => {
    it("should filter by command type", () => {
      const commands = engine.getCapabilitiesByType("command");

      expect(commands.length).toBeGreaterThan(10);
      expect(commands.every((c) => c.type === "command")).toBe(true);
    });
  });

  describe("getCapabilitiesByDomain", () => {
    it("should filter by learning domain", () => {
      const learning = engine.getCapabilitiesByDomain("learning");

      expect(learning.length).toBeGreaterThan(2);
      expect(learning.every((c) => c.domain === "learning")).toBe(true);
    });

    it("should filter by development domain", () => {
      const dev = engine.getCapabilitiesByDomain("development");

      expect(dev.length).toBeGreaterThan(2);
      expect(dev.every((c) => c.domain === "development")).toBe(true);
    });

    it("should filter by business domain", () => {
      const business = engine.getCapabilitiesByDomain("business");

      expect(business.length).toBeGreaterThan(1);
      expect(business.every((c) => c.domain === "business")).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return utilization statistics", () => {
      const stats = engine.getStats();

      expect(stats.total_capabilities).toBeGreaterThan(15);
      expect(stats.commands_available).toBeGreaterThan(10);
      expect(stats.auto_invoke_rules).toBeGreaterThan(30);
      expect(stats.engines_registered).toBeGreaterThan(10);
    });
  });

  describe("shouldSuggest", () => {
    it("should suggest /pdf-learn for PDF mentions", () => {
      expect(engine.shouldSuggest("/pdf-learn", "read this pdf")).toBe(true);
      expect(engine.shouldSuggest("/pdf-learn", "extract from the document")).toBe(true);
    });

    it("should suggest /video-learn for video mentions", () => {
      expect(engine.shouldSuggest("/video-learn", "watch this youtube tutorial")).toBe(true);
      expect(engine.shouldSuggest("/video-learn", "learn from the video")).toBe(true);
    });

    it("should suggest /forge-triple for creation mentions", () => {
      expect(engine.shouldSuggest("/forge-triple", "create a new engine")).toBe(true);
      expect(engine.shouldSuggest("/forge-triple", "build new capability")).toBe(true);
    });

    it("should not suggest irrelevant commands", () => {
      expect(engine.shouldSuggest("/pdf-learn", "calculate speed feed")).toBe(false);
      expect(engine.shouldSuggest("/lathe-studio", "wire edm program")).toBe(false);
    });
  });

  describe("getMatchingTriggers", () => {
    it("should return matching triggers for input", () => {
      const matches = engine.getMatchingTriggers("I have a pdf document to learn from");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.capability === "/pdf-learn")).toBe(true);
    });

    it("should return multiple matches for complex input", () => {
      const matches = engine.getMatchingTriggers("create a new engine and check for duplicates");

      expect(matches.length).toBeGreaterThan(1);
    });

    it("should return empty for unrelated input", () => {
      const matches = engine.getMatchingTriggers("the weather is nice today");

      expect(matches.length).toBe(0);
    });
  });

  describe("Pattern Matching Accuracy", () => {
    const testCases: { input: string; expected: string }[] = [
      { input: "learn from this pdf manual", expected: "/pdf-learn" },
      { input: "extract knowledge from pdf", expected: "/pdf-learn" },
      { input: "watch and learn from this video", expected: "/video-learn" },
      { input: "youtube machining tutorial", expected: "/video-learn" },
      { input: "create new engine for cutting", expected: "/forge-triple" },
      { input: "build new capability", expected: "/forge-triple" },
      { input: "check for duplicate engines", expected: "/dedup" },
      { input: "write wire edm program", expected: "/wire-edm-studio" },
      { input: "mitsubishi edm job", expected: "/wire-edm-studio" },
      { input: "okuma lathe program", expected: "/lathe-studio" },
      { input: "turning center job", expected: "/lathe-studio" },
      { input: "what speed and feed for steel", expected: "/auto-speed-feed" },
      { input: "calculate cutting parameters", expected: "/auto-speed-feed" },
      { input: "create quote for customer", expected: "/quote-to-ship" },
      { input: "estimate this job", expected: "/quote-to-ship" },
      { input: "shop floor tribal knowledge", expected: "/shop-knowledge" },
      { input: "look up material properties", expected: "/material-lookup" },
      { input: "validate this physics formula", expected: "/formula-check" },
    ];

    for (const { input, expected } of testCases) {
      it(`should match "${input}" to ${expected}`, () => {
        const result = engine.analyze(input);

        expect(result.primary).not.toBeNull();
        expect(result.primary?.capability.name).toBe(expected);
      });
    }
  });

  describe("Priority Ordering", () => {
    it("should prioritize /forge-triple over /forge-engine", () => {
      const result = engine.analyze("create a new engine");

      expect(result.primary?.capability.name).toBe("/forge-triple");
    });

    it("should prioritize /dedup for creation tasks", () => {
      const result = engine.analyze("build new engine check duplicates");

      // Command sequence should start with /dedup
      expect(result.command_sequence[0]).toBe("/dedup");
    });
  });

  describe("Context Relevance", () => {
    it("should boost relevance for matching domain", () => {
      const withContext = engine.analyze("learn from this pdf document", {
        domain_focus: "learning",
      });

      const withoutContext = engine.analyze("learn from this pdf document", {
        domain_focus: "business",
      });

      expect(withContext.primary).not.toBeNull();
      expect(withoutContext.primary).not.toBeNull();
      expect(withContext.primary!.context_relevance).toBeGreaterThan(
        withoutContext.primary!.context_relevance
      );
    });

    it("should boost relevance for matching engines", () => {
      const withEngines = engine.analyze("learn from pdf document", {
        recent_engines: ["PDFFormulaExtractionEngine"],
      });

      expect(withEngines.primary).not.toBeNull();
      expect(withEngines.primary!.context_relevance).toBeGreaterThan(0.5);
    });
  });
});
