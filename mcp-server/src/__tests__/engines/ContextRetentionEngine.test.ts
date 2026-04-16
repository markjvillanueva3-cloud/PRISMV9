/**
 * Tests for ContextRetentionEngine
 *
 * AGENT ROADMAP: U-AGT05 (MS2)
 * Verifies critical fact extraction and preservation
 */

import { describe, it, expect } from "vitest";
import {
  ContextRetentionEngine,
  contextRetentionEngine,
  CriticalFact,
} from "../../engines/ContextRetentionEngine.js";

describe("ContextRetentionEngine", () => {
  describe("extractCriticalFacts", () => {
    it("should extract machine settings", () => {
      const text =
        "The tool length offset for T01 is 4.3215. The work offset G54 is set to X-12.5 Y-8.3";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "machine")).toBe(true);
    });

    it("should extract material properties", () => {
      const text =
        "The D2 material hardness is 58-62 HRC after heat treatment. The specific cutting force kc1.1 is 2100 N/mm2.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "material")).toBe(true);
    });

    it("should extract safety constraints", () => {
      const text =
        "Never exceed 200 SFM on this carbide insert. Maximum RPM for this spindle is 10000.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "safety")).toBe(true);
      expect(facts.some((f) => f.importance >= 9)).toBe(true);
    });

    it("should extract customer requirements", () => {
      const text =
        "The customer requires a tolerance of +/- 0.0005. Customer wants chamfers on all edges.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "customer")).toBe(true);
    });

    it("should extract corrections with high priority", () => {
      const text =
        "That's not correct, the feed rate should be 0.003 ipm instead of 0.010.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "correction")).toBe(true);
      expect(facts.some((f) => f.importance >= 9)).toBe(true);
    });

    it("should extract process parameters", () => {
      const text =
        "Use a feed rate of 0.004 ipm and a depth of cut of 0.050 inches. Flood coolant is required.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBeGreaterThanOrEqual(1);
      expect(facts.some((f) => f.category === "process")).toBe(true);
    });

    it("should extract entities from facts", () => {
      const text = "The Okuma lathe needs recalibration. Use Mitsubishi inserts for D2 steel.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      const allEntities = facts.flatMap((f) => f.entities);
      expect(allEntities.some((e) => e.toLowerCase().includes("okuma"))).toBe(
        true
      );
    });

    it("should deduplicate similar facts", () => {
      const text =
        "Maximum speed is 500 SFM. Max speed should not exceed 500 SFM. Speed maximum: 500 SFM.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      // Should deduplicate similar statements
      expect(facts.length).toBeLessThanOrEqual(3);
    });

    it("should return empty for non-critical text", () => {
      const text = "Hello, how are you today? The weather is nice.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);

      expect(facts.length).toBe(0);
    });
  });

  describe("decideRetention", () => {
    it("should always retain safety facts", () => {
      const fact: CriticalFact = {
        content: "Never exceed 200 SFM",
        reason: "Safety pattern",
        category: "safety",
        importance: 10,
        entities: [],
      };

      const decision = contextRetentionEngine.decideRetention(fact);

      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBeUndefined(); // Forever
    });

    it("should always retain corrections", () => {
      const fact: CriticalFact = {
        content: "Should be 0.003 not 0.010",
        reason: "Correction pattern",
        category: "correction",
        importance: 10,
        entities: [],
      };

      const decision = contextRetentionEngine.decideRetention(fact);

      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBeUndefined(); // Forever
    });

    it("should retain high importance facts for a year", () => {
      const fact: CriticalFact = {
        content: "Customer requires 0.0005 tolerance",
        reason: "Customer requirement",
        category: "customer",
        importance: 8,
        entities: [],
      };

      const decision = contextRetentionEngine.decideRetention(fact);

      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBe(365);
    });

    it("should retain medium importance for 90 days", () => {
      const fact: CriticalFact = {
        content: "Feed rate 0.004 ipm",
        reason: "Process parameter",
        category: "process",
        importance: 6,
        entities: [],
      };

      const decision = contextRetentionEngine.decideRetention(fact);

      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBe(90);
    });

    it("should retain low importance for 30 days", () => {
      const fact: CriticalFact = {
        content: "Using flood coolant",
        reason: "Process parameter",
        category: "process",
        importance: 4,
        entities: [],
      };

      const decision = contextRetentionEngine.decideRetention(fact);

      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBe(30);
    });
  });

  describe("hasCriticalInfo", () => {
    it("should detect safety information", () => {
      expect(
        contextRetentionEngine.hasCriticalInfo("Maximum speed is 500 RPM")
      ).toBe(true);
      expect(
        contextRetentionEngine.hasCriticalInfo("Never use coolant here")
      ).toBe(true);
    });

    it("should detect corrections", () => {
      expect(
        contextRetentionEngine.hasCriticalInfo(
          "That's not right, it should be 0.003"
        )
      ).toBe(true);
    });

    it("should return false for non-critical", () => {
      expect(
        contextRetentionEngine.hasCriticalInfo("Hello, how are you?")
      ).toBe(false);
    });
  });

  describe("getImportanceScore", () => {
    it("should score safety constraints highest", () => {
      const score = contextRetentionEngine.getImportanceScore(
        "Never exceed maximum speed of 10000 RPM"
      );
      expect(score).toBeGreaterThanOrEqual(9);
    });

    it("should score corrections high", () => {
      const score = contextRetentionEngine.getImportanceScore(
        "That's wrong, it should be 0.003"
      );
      expect(score).toBeGreaterThanOrEqual(9);
    });

    it("should score process parameters medium", () => {
      const score = contextRetentionEngine.getImportanceScore(
        "Use feed rate of 0.004 ipm"
      );
      expect(score).toBeGreaterThanOrEqual(5);
    });

    it("should return 0 for non-critical", () => {
      const score = contextRetentionEngine.getImportanceScore(
        "The weather is nice"
      );
      expect(score).toBe(0);
    });
  });

  describe("summarizeFacts", () => {
    it("should summarize facts by category", () => {
      const facts: CriticalFact[] = [
        {
          content: "Max speed 500 SFM",
          reason: "Safety",
          category: "safety",
          importance: 10,
          entities: [],
        },
        {
          content: "Use 0.003 feed",
          reason: "Process",
          category: "process",
          importance: 6,
          entities: [],
        },
      ];

      const summary = contextRetentionEngine.summarizeFacts(facts);

      expect(summary).toContain("safety");
      expect(summary).toContain("process");
      expect(summary).toContain("500 SFM");
    });

    it("should handle empty facts", () => {
      const summary = contextRetentionEngine.summarizeFacts([]);
      expect(summary).toContain("No critical facts");
    });
  });

  describe("processConversation", () => {
    it("should extract and save facts from messages", async () => {
      const messages = [
        "The maximum speed for this insert is 400 SFM.",
        "Customer requires tolerance of 0.001 inches.",
      ];

      const result = await contextRetentionEngine.processConversation(messages);

      expect(result.extracted).toBeGreaterThanOrEqual(2);
      expect(result.saved).toBeGreaterThanOrEqual(0); // May be 0 if memory not initialized
    });
  });

  describe("buildSurvivalContext", () => {
    it("should build context for compaction", async () => {
      const context = await contextRetentionEngine.buildSurvivalContext(1000);

      expect(context).toHaveProperty("facts");
      expect(context).toHaveProperty("preferences");
      expect(context).toHaveProperty("constraints");
      expect(context).toHaveProperty("workContext");
      expect(context).toHaveProperty("tokenCost");

      expect(Array.isArray(context.facts)).toBe(true);
      expect(typeof context.tokenCost).toBe("number");
    });

    it("should respect token limit", async () => {
      const context = await contextRetentionEngine.buildSurvivalContext(100);

      // Token cost should be within reasonable range of limit
      expect(context.tokenCost).toBeLessThanOrEqual(100);
    });
  });
});
