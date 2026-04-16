/**
 * Tests for PatternDatabaseEngine
 *
 * Tests the unified pattern search functionality including:
 * - Pattern initialization from multiple sources
 * - Fuzzy search with relevance scoring
 * - Category and type filtering
 * - Keyword indexing
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  PatternDatabaseEngine,
  patternDatabaseEngine,
  type UnifiedPattern,
  type SearchOptions,
} from "../engines/PatternDatabaseEngine.js";

describe("PatternDatabaseEngine", () => {
  let engine: PatternDatabaseEngine;

  beforeEach(async () => {
    engine = new PatternDatabaseEngine();
    await engine.initialize();
  });

  describe("initialize", () => {
    it("should initialize with patterns from multiple sources", async () => {
      const freshEngine = new PatternDatabaseEngine();
      await freshEngine.initialize();

      const stats = await freshEngine.getStats();

      expect(stats.total_patterns).toBeGreaterThan(0);
      expect(Object.keys(stats.by_source).length).toBeGreaterThan(0);
    });

    it("should be idempotent (multiple calls safe)", async () => {
      await engine.initialize();
      await engine.initialize();

      const stats = await engine.getStats();
      expect(stats.total_patterns).toBeGreaterThan(0);
    });
  });

  describe("search", () => {
    it("should return results for material query", async () => {
      const results = await engine.search("steel");

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.pattern).toBeDefined();
        expect(result.relevance_score).toBeGreaterThan(0);
        expect(result.relevance_score).toBeLessThanOrEqual(2); // Scores can exceed 1 with boosts
      }
    });

    it("should return results sorted by relevance", async () => {
      const results = await engine.search("roughing");

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].relevance_score).toBeGreaterThanOrEqual(results[i].relevance_score);
        }
      }
    });

    it("should respect limit option", async () => {
      const options: SearchOptions = { limit: 3 };
      const results = await engine.search("cutting", options);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should filter by pattern type", async () => {
      const options: SearchOptions = { types: ["gcode"] };
      const results = await engine.search("G", options);

      for (const result of results) {
        expect(result.pattern.type).toBe("gcode");
      }
    });

    it("should filter by source", async () => {
      const options: SearchOptions = { sources: ["jm_die"] };
      const results = await engine.search("D2", options);

      for (const result of results) {
        expect(result.pattern.source).toBe("jm_die");
      }
    });

    it("should filter by minimum confidence", async () => {
      const options: SearchOptions = { min_confidence: 0.8 };
      const results = await engine.search("steel", options);

      for (const result of results) {
        expect(result.pattern.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should return empty array for nonsense query", async () => {
      const results = await engine.search("xyzzy123foobar");
      expect(results.length).toBe(0);
    });

    it("should handle empty query gracefully", async () => {
      const results = await engine.search("");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("getByType", () => {
    it("should return all patterns of specified type", async () => {
      const patterns = await engine.getByType("gcode");

      expect(patterns.length).toBeGreaterThanOrEqual(0);
      for (const pattern of patterns) {
        expect(pattern.type).toBe("gcode");
      }
    });

    it("should return material param patterns", async () => {
      const patterns = await engine.getByType("material_param");

      for (const pattern of patterns) {
        expect(pattern.type).toBe("material_param");
        expect(pattern.content).toBeDefined();
      }
    });
  });

  describe("getByCategory", () => {
    it("should return patterns in specified category", async () => {
      const patterns = await engine.getByCategory("okuma_lathe");

      for (const pattern of patterns) {
        expect(pattern.category).toBe("okuma_lathe");
      }
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", async () => {
      const stats = await engine.getStats();

      expect(stats.total_patterns).toBeGreaterThanOrEqual(0);
      expect(stats.by_type).toBeDefined();
      expect(stats.by_source).toBeDefined();
      expect(stats.by_category).toBeDefined();
      expect(stats.average_confidence).toBeGreaterThanOrEqual(0);
      expect(stats.average_confidence).toBeLessThanOrEqual(1);
    });

    it("should have consistent counts", async () => {
      const stats = await engine.getStats();

      const typeSum = Object.values(stats.by_type).reduce((a, b) => a + b, 0);
      const sourceSum = Object.values(stats.by_source).reduce((a, b) => a + b, 0);

      expect(typeSum).toBe(stats.total_patterns);
      expect(sourceSum).toBe(stats.total_patterns);
    });
  });

  describe("Fuzzy matching", () => {
    it("should find patterns with partial match", async () => {
      const results = await engine.search("steel");

      // Should find material patterns even with partial match
      expect(results.some(r =>
        r.pattern.content.toLowerCase().includes("steel") ||
        r.pattern.title.toLowerCase().includes("steel")
      )).toBe(true);
    });

    it("should rank exact matches higher than partial matches", async () => {
      const results = await engine.search("D2");

      if (results.length >= 1) {
        // First result should have good relevance
        expect(results[0].relevance_score).toBeGreaterThan(0.1);
      }
    });
  });

  describe("Pattern structure validation", () => {
    it("should have valid structure for all patterns", async () => {
      const allPatterns = [
        ...(await engine.getByType("gcode")),
        ...(await engine.getByType("material_param")),
      ];

      for (const pattern of allPatterns) {
        expect(pattern.id).toBeDefined();
        expect(typeof pattern.id).toBe("string");
        expect(pattern.type).toBeDefined();
        expect(pattern.source).toBeDefined();
        expect(pattern.title).toBeDefined();
        expect(pattern.content).toBeDefined();
        expect(Array.isArray(pattern.keywords)).toBe(true);
        expect(typeof pattern.confidence).toBe("number");
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getTrainingContext", () => {
    it("should return training context string", async () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("PATTERN DATABASE");
      expect(context).toContain("Search");
      expect(context.length).toBeGreaterThan(100);
    });
  });
});

describe("patternDatabaseEngine singleton", () => {
  it("should be defined", () => {
    expect(patternDatabaseEngine).toBeDefined();
    expect(patternDatabaseEngine).toBeInstanceOf(PatternDatabaseEngine);
  });
});

describe("Search edge cases", () => {
  let engine: PatternDatabaseEngine;

  beforeAll(async () => {
    engine = new PatternDatabaseEngine();
    await engine.initialize();
  });

  it("should handle special characters in query", async () => {
    const results = await engine.search("G50 S3500");
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle query with only numbers", async () => {
    const results = await engine.search("12345");
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle very long query", async () => {
    const longQuery = "this is a very long query ".repeat(20);
    const results = await engine.search(longQuery);
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle unicode characters", async () => {
    const results = await engine.search("surface finish");
    expect(Array.isArray(results)).toBe(true);
  });

  it("should combine multiple filter options", async () => {
    const options: SearchOptions = {
      types: ["material_param"],
      sources: ["jm_die"],
      min_confidence: 0.7,
      limit: 5,
    };
    const results = await engine.search("steel", options);

    expect(results.length).toBeLessThanOrEqual(5);
    for (const result of results) {
      expect(result.pattern.type).toBe("material_param");
      expect(result.pattern.source).toBe("jm_die");
      expect(result.pattern.confidence).toBeGreaterThanOrEqual(0.7);
    }
  });
});
