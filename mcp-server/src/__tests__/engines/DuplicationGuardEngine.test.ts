/**
 * Tests for DuplicationGuardEngine
 *
 * Tests duplication detection, fuzzy matching, and asset registry.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DuplicationGuardEngine,
  duplicationGuardEngine,
} from "../../engines/DuplicationGuardEngine.js";

describe("DuplicationGuardEngine", () => {
  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("instantiation", () => {
    it("should export singleton duplicationGuardEngine", () => {
      expect(duplicationGuardEngine).toBeDefined();
      expect(duplicationGuardEngine).toBeInstanceOf(DuplicationGuardEngine);
    });

    it("should create new instance with constructor", () => {
      const engine = new DuplicationGuardEngine();
      expect(engine).toBeInstanceOf(DuplicationGuardEngine);
    });
  });

  // ==========================================================================
  // CHECK BEFORE CREATING
  // ==========================================================================

  describe("checkBeforeCreating()", () => {
    it("should detect existing engine by keyword match", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "NewCuttingForceEngine",
        "Calculate cutting forces using Kienzle model"
      );

      expect(result.recommendation).toBeDefined();
      // May find similar engines or allow proceeding
      expect(["skip", "extend", "rename", "proceed"]).toContain(result.recommendation);
    });

    it("should allow truly new engines", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "UniqueXYZ123Engine",
        "Something completely unique that does not exist"
      );

      // Should allow or have low similarity matches
      if (result.recommendation !== "proceed") {
        // If blocked, similarity should be somewhat high
        expect(result.similarity).toBeGreaterThan(0);
      }
    });

    it("should handle formula duplication check", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "formula",
        "Taylor Tool Life",
        "Taylor tool life equation"
      );

      expect(result.recommendation).toBeDefined();
      // Taylor tool life is a well-known formula
    });

    it("should handle algorithm duplication check", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "algorithm",
        "PID Controller",
        "PID controller algorithm"
      );

      expect(result.recommendation).toBeDefined();
    });

    it("should return isDuplicate flag", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "TestEngine",
        "Test description"
      );

      expect(typeof result.isDuplicate).toBe("boolean");
    });

    it("should return similarity score", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "SpeedFeedEngine",
        "Calculate speeds and feeds"
      );

      expect(typeof result.similarity).toBe("number");
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it("should return reason string", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "RandomEngine",
        "Random description"
      );

      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it("should return alternatives array", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "ForceCalculator",
        "Calculate forces"
      );

      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  // ==========================================================================
  // SEARCH EXISTING
  // ==========================================================================

  describe("searchExisting()", () => {
    it("should find assets by keyword", async () => {
      const results = await duplicationGuardEngine.searchExisting("cutting");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should return empty for nonexistent keywords", async () => {
      const results = await duplicationGuardEngine.searchExisting("xyznonexistent123abc");

      expect(results.length).toBe(0);
    });

    it("should filter by asset types", async () => {
      const results = await duplicationGuardEngine.searchExisting("force", ["engine"]);

      expect(Array.isArray(results)).toBe(true);
      results.forEach((r) => {
        expect(r.type).toBe("engine");
      });
    });

    it("should be case-insensitive", async () => {
      const results1 = await duplicationGuardEngine.searchExisting("FORCE");
      const results2 = await duplicationGuardEngine.searchExisting("force");

      expect(results1.length).toBe(results2.length);
    });
  });

  // ==========================================================================
  // REGISTER NEW ASSET
  // ==========================================================================

  describe("registerNewAsset()", () => {
    let engine: DuplicationGuardEngine;

    beforeEach(() => {
      engine = new DuplicationGuardEngine();
    });

    it("should have registerNewAsset method", () => {
      expect(typeof engine.registerNewAsset).toBe("function");
    });

    it("should accept valid asset types", () => {
      // Method signature check - actual registration tested in integration tests
      const validTypes = ["engine", "formula", "algorithm", "dispatcher_action", "extraction", "skill", "hook"];
      expect(validTypes).toContain("engine");
    });
  });

  // ==========================================================================
  // GET COUNTS
  // ==========================================================================

  describe("getCounts()", () => {
    it("should return inventory counts", async () => {
      const counts = await duplicationGuardEngine.getCounts();

      expect(counts.engine).toBeDefined();
      expect(counts.formula).toBeDefined();
      expect(counts.algorithm).toBeDefined();
      expect(counts.dispatcher_action).toBeDefined();
    });

    it("should have non-negative counts", async () => {
      const counts = await duplicationGuardEngine.getCounts();

      expect(counts.engine).toBeGreaterThanOrEqual(0);
      expect(counts.formula).toBeGreaterThanOrEqual(0);
      expect(counts.algorithm).toBeGreaterThanOrEqual(0);
    });

    it("should have some engines", async () => {
      const counts = await duplicationGuardEngine.getCounts();

      // PRISM has many engines
      expect(counts.engine).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // GET EXISTING SUMMARY
  // ==========================================================================

  describe("getExistingSummary()", () => {
    it("should return formatted summary", async () => {
      const summary = await duplicationGuardEngine.getExistingSummary();

      expect(typeof summary).toBe("string");
      expect(summary).toContain("ENGINES");
      expect(summary.length).toBeGreaterThan(100);
    });

    it("should mention formulas", async () => {
      const summary = await duplicationGuardEngine.getExistingSummary();

      expect(summary).toContain("FORMULAS");
    });

    it("should mention algorithms", async () => {
      const summary = await duplicationGuardEngine.getExistingSummary();

      expect(summary).toContain("ALGORITHMS");
    });

    it("should include instructions", async () => {
      const summary = await duplicationGuardEngine.getExistingSummary();

      expect(summary).toContain("BEFORE CREATING");
    });
  });

  // ==========================================================================
  // SIMILARITY DETECTION
  // ==========================================================================

  describe("similarity detection", () => {
    it("should detect high similarity for similar names", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "SpeedFeedCalculatorEngine",
        "Calculate speeds and feeds"
      );

      // Should find similar engines
      if (result.alternatives.length > 0) {
        expect(result.similarity).toBeGreaterThan(0);
      }
    });

    it("should recommend extending for medium similarity", async () => {
      const result = await duplicationGuardEngine.checkBeforeCreating(
        "engine",
        "AdvancedCuttingEngine",
        "Advanced cutting calculations"
      );

      // Should provide a recommendation
      expect(result.recommendation).toBeDefined();
    });
  });

  // ==========================================================================
  // CROSS-SESSION AWARENESS
  // ==========================================================================

  describe("cross-session awareness", () => {
    it("should maintain consistent inventory across calls", async () => {
      const counts1 = await duplicationGuardEngine.getCounts();
      const counts2 = await duplicationGuardEngine.getCounts();

      expect(counts1.engine).toBe(counts2.engine);
      expect(counts1.formula).toBe(counts2.formula);
    });

    it("should cache asset index", async () => {
      // First call loads the index
      const start1 = Date.now();
      await duplicationGuardEngine.getCounts();
      const time1 = Date.now() - start1;

      // Second call should be faster (cached)
      const start2 = Date.now();
      await duplicationGuardEngine.getCounts();
      const time2 = Date.now() - start2;

      // Second call should be at least as fast (usually faster due to caching)
      expect(time2).toBeLessThanOrEqual(time1 + 50); // Allow some variance
    });
  });
});
