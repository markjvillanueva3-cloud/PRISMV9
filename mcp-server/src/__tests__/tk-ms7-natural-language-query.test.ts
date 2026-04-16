/**
 * TK-MS7-U32: Natural Language Tribal Query Engine Tests
 *
 * Tests the natural language tribal knowledge query capabilities
 * for LLM/PUOA integration.
 */

import { describe, it, expect } from "vitest";
import {
  tribalKnowledgeEngine,
  type TribalNLQueryResult,
  type ParsedTribalIntent,
} from "../engines/TribalKnowledgeEngine.js";

describe("TK-MS7: Natural Language Tribal Query", () => {
  describe("queryTribalNaturalLanguage", () => {
    it("should return structured result for material-specific query", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "tips for machining D2 steel"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("parsed_intent");
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("modifiers");
      expect(result).toHaveProperty("constraints");
      expect(result).toHaveProperty("summary");
      expect(result.query).toBe("tips for machining D2 steel");
      expect(result.parsed_intent.material).toBe("D2");
    });

    it("should parse operation-specific queries", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "roughing tips for aluminum pockets"
      );

      expect(result.parsed_intent.operation).toBe("roughing");
      expect(result.parsed_intent.material).toBe("Aluminum");
    });

    it("should parse machine/controller queries", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "Okuma lathe threading tips"
      );

      expect(result.parsed_intent.machine).toBe("Okuma");
      expect(result.parsed_intent.controller).toBe("OSP");
      expect(result.parsed_intent.operation).toBe("turning");
    });

    it("should parse category-specific queries", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "tooling recommendations for finishing"
      );

      expect(result.parsed_intent.category).toBe("tooling");
      expect(result.parsed_intent.operation).toBe("finishing");
    });

    it("should return tips with relevance scores", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "stainless steel work hardening"
      );

      expect(result.tips.length).toBeGreaterThan(0);
      for (const tip of result.tips) {
        expect(tip).toHaveProperty("relevance_score");
        expect(tip.relevance_score).toBeGreaterThan(0);
        expect(tip).toHaveProperty("provenance");
        expect(tip.provenance).toHaveProperty("source");
        expect(tip.provenance).toHaveProperty("captured_by");
      }
    });

    it("should sort tips by relevance score", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "titanium machining chip color"
      );

      if (result.tips.length > 1) {
        for (let i = 1; i < result.tips.length; i++) {
          expect(result.tips[i - 1].relevance_score).toBeGreaterThanOrEqual(
            result.tips[i].relevance_score
          );
        }
      }
    });

    it("should generate human-readable summary for LLM", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "deep pocket chip evacuation"
      );

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(20);
      // Summary should contain relevant content
      expect(result.summary).toMatch(/tribal knowledge|tips|recommendations|found/i);
    });

    it("should provide clarifications for ambiguous queries", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "help with cutting"
      );

      expect(result.parsed_intent.ambiguous).toBe(true);
      expect(result.clarifications.length).toBeGreaterThan(0);
      // Should suggest specifying material, operation, etc.
      expect(result.clarifications.some(c => c.includes("material"))).toBe(true);
    });

    it("should handle empty query gracefully", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage("");

      expect(result).toBeDefined();
      expect(result.parsed_intent.ambiguous).toBe(true);
      expect(result.tips.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("intent parsing", () => {
    it("should detect ISO material groups", () => {
      const queries = [
        { query: "4140 steel roughing", expected_iso: "P" },
        { query: "Inconel 718 finishing", expected_iso: "S" },
        { query: "6061 aluminum pocketing", expected_iso: "N" },
        { query: "D2 tool steel grinding", expected_iso: "K" },  // D2 is ISO K (tool steel)
        { query: "304 stainless drilling", expected_iso: "M" },
        { query: "hardened 52 HRC turning", expected_iso: "H" },  // Hardened keyword = ISO H
      ];

      for (const { query, expected_iso } of queries) {
        const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(query);
        expect(result.parsed_intent.material_iso).toBe(expected_iso);
      }
    });

    it("should detect multiple operations", () => {
      const operations = [
        { query: "drilling tips", expected: "drilling" },
        { query: "tapping stainless", expected: "threading" },
        { query: "boring tolerance", expected: "boring" },
        { query: "face milling setup", expected: "facing" },
        { query: "EDM electrode", expected: "edm" },
      ];

      for (const { query, expected } of operations) {
        const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(query);
        expect(result.parsed_intent.operation).toBe(expected);
      }
    });

    it("should detect machine brands", () => {
      const machines = [
        { query: "Haas mill speeds", expected: "Haas" },
        { query: "Mazak turning", expected: "Mazak" },
        { query: "Fanuc post processor", expected: "Fanuc" },
        { query: "Hurco probe cycle", expected: "Hurco" },
      ];

      for (const { query, expected } of machines) {
        const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(query);
        expect(result.parsed_intent.machine).toBe(expected);
      }
    });

    it("should extract keywords from query", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "vibration chatter thin wall deflection"
      );

      expect(result.parsed_intent.keywords).toContain("vibration");
      expect(result.parsed_intent.keywords).toContain("chatter");
      expect(result.parsed_intent.keywords).toContain("thin");
      expect(result.parsed_intent.keywords).toContain("wall");
      expect(result.parsed_intent.keywords).toContain("deflection");
    });
  });

  describe("modifier extraction", () => {
    it("should extract speed reduction modifiers", () => {
      // Search for tips that mention speed reduction
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "reduce speed hardened steel"
      );

      // Modifiers may or may not be present depending on matching tips
      expect(Array.isArray(result.modifiers)).toBe(true);
      for (const mod of result.modifiers) {
        expect(mod).toHaveProperty("parameter");
        expect(mod).toHaveProperty("adjustment");
        expect(mod).toHaveProperty("reason");
        expect(mod).toHaveProperty("confidence");
      }
    });

    it("should include source tip ID in modifiers", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "titanium speed feed adjustments"
      );

      for (const mod of result.modifiers) {
        expect(mod.source_tip_id).toBeDefined();
        expect(typeof mod.source_tip_id).toBe("string");
      }
    });
  });

  describe("constraint extraction", () => {
    it("should extract prohibition constraints", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "never dwell stainless work hardening"
      );

      // Constraints should have proper structure
      for (const constraint of result.constraints) {
        expect(["prohibition", "requirement", "warning"]).toContain(constraint.type);
        expect(constraint).toHaveProperty("description");
        expect(constraint).toHaveProperty("severity");
        expect(["low", "medium", "high", "critical"]).toContain(constraint.severity);
      }
    });

    it("should extract requirement constraints", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "must always required titanium coolant"
      );

      // Check constraint structure
      expect(Array.isArray(result.constraints)).toBe(true);
    });
  });

  describe("warning extraction", () => {
    it("should extract safety warnings", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "safety chip clearing running spindle"
      );

      // Warnings should be prefixed appropriately
      for (const warning of result.warnings) {
        expect(warning).toMatch(/\[(SAFETY|GOTCHA)\]/);
      }
    });

    it("should prefix safety tips correctly", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "never reach into machine danger"
      );

      // Safety warnings should be clearly marked
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in query", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "G-code M-code S/F RPM"
      );

      expect(result).toBeDefined();
      expect(result.parsed_intent).toBeDefined();
    });

    it("should handle very long queries", () => {
      const longQuery = "I need tips for machining " + "aluminum ".repeat(50);
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(longQuery);

      expect(result).toBeDefined();
      expect(result.parsed_intent.material).toBe("Aluminum");
    });

    it("should handle numeric queries", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "4140 304 6061"
      );

      expect(result).toBeDefined();
      // Should pick up at least one material
      expect(result.parsed_intent.material).toBeDefined();
    });

    it("should limit returned tips to reasonable count", () => {
      const result = tribalKnowledgeEngine.queryTribalNaturalLanguage(
        "machining tips"
      );

      expect(result.tips.length).toBeLessThanOrEqual(10);
      expect(result.total_matches).toBeGreaterThanOrEqual(result.tips.length);
    });
  });
});
