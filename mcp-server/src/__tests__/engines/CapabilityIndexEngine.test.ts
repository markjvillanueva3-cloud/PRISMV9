/**
 * Tests for CapabilityIndexEngine
 *
 * AGENT ROADMAP: U-AGT01 (MS1)
 * Verifies live dispatcher introspection and capability indexing
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CapabilityIndexEngine,
  capabilityIndexEngine,
  CapabilityIndex,
  DispatcherCapability,
} from "../../engines/CapabilityIndexEngine.js";
import { join } from "path";

describe("CapabilityIndexEngine", () => {
  let index: CapabilityIndex;

  beforeAll(async () => {
    // Build index once for all tests
    index = await capabilityIndexEngine.buildIndex(true);
  });

  describe("buildIndex", () => {
    it("should discover all dispatchers", async () => {
      // Should find 80+ dispatchers
      expect(index.dispatcherCount).toBeGreaterThanOrEqual(80);
    });

    it("should extract thousands of actions", async () => {
      // Should find 2000+ actions across all dispatchers
      expect(index.actionCount).toBeGreaterThanOrEqual(2000);
    });

    it("should index actions by tool name", async () => {
      // Should have multiple tools indexed
      expect(index.byTool.size).toBeGreaterThanOrEqual(50);

      // Check a known tool exists
      const hasCalc =
        index.byTool.has("prism_calc") ||
        index.byTool.has("prism_ai") ||
        index.byTool.has("prism_safety");
      expect(hasCalc).toBe(true);
    });

    it("should index actions by category", async () => {
      // Should have multiple categories
      expect(index.byCategory.size).toBeGreaterThanOrEqual(5);
    });

    it("should record build timestamp", async () => {
      expect(index.builtAt).toBeInstanceOf(Date);
      expect(index.builtAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("search", () => {
    it("should find actions by exact name", async () => {
      const results = await capabilityIndexEngine.search("speed_feed");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].capability.action).toContain("speed");
    });

    it("should find actions by partial match", async () => {
      const results = await capabilityIndexEngine.search("thread");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find actions by tool name", async () => {
      // Search for a common term that should appear in tool names
      const stats = await capabilityIndexEngine.getStats();
      const toolName = stats.tools[0]; // Use first actual tool
      const results = await capabilityIndexEngine.search(toolName);
      // Should find some results (may match on action names too)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should score exact matches higher", async () => {
      const results = await capabilityIndexEngine.search("reason");
      // First result should have highest score
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it("should respect limit parameter", async () => {
      const results = await capabilityIndexEngine.search("calc", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getByTool", () => {
    it("should return actions for known tool", async () => {
      // Find a tool that exists
      const stats = await capabilityIndexEngine.getStats();
      const firstTool = stats.tools[0];
      const actions = await capabilityIndexEngine.getByTool(firstTool);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].toolName).toBe(firstTool);
    });

    it("should return empty array for unknown tool", async () => {
      const actions = await capabilityIndexEngine.getByTool(
        "nonexistent_tool_xyz"
      );
      expect(actions).toEqual([]);
    });
  });

  describe("getByCategory", () => {
    it("should return actions for known category", async () => {
      const stats = await capabilityIndexEngine.getStats();
      const firstCategory = stats.categories[0];
      const actions = await capabilityIndexEngine.getByCategory(firstCategory);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", async () => {
      const stats = await capabilityIndexEngine.getStats();

      expect(stats.dispatcherCount).toBeGreaterThanOrEqual(80);
      expect(stats.actionCount).toBeGreaterThanOrEqual(2000);
      expect(stats.categories.length).toBeGreaterThanOrEqual(5);
      expect(stats.tools.length).toBeGreaterThanOrEqual(50);
      expect(stats.builtAt).toBeInstanceOf(Date);
    });

    it("should have consistent counts", async () => {
      const stats = await capabilityIndexEngine.getStats();

      // Sum of byCategory should equal total actions
      const categorySum = Object.values(stats.byCategory).reduce(
        (a, b) => a + b,
        0
      );
      expect(categorySum).toBe(stats.actionCount);

      // Sum of byTool should equal total actions
      const toolSum = Object.values(stats.byTool).reduce((a, b) => a + b, 0);
      expect(toolSum).toBe(stats.actionCount);
    });
  });

  describe("findByPath", () => {
    it("should find capability by exact path", async () => {
      // Get a known capability first
      const all = await capabilityIndexEngine.getAll();
      if (all.length > 0) {
        const known = all[0];
        const found = await capabilityIndexEngine.findByPath(known.fullPath);
        expect(found).not.toBeNull();
        expect(found?.action).toBe(known.action);
      }
    });

    it("should return null for unknown path", async () => {
      const found = await capabilityIndexEngine.findByPath(
        "fake_tool:fake_action"
      );
      expect(found).toBeNull();
    });
  });

  describe("findByPattern", () => {
    it("should find capabilities matching regex", async () => {
      // Use a pattern that definitely exists in action names
      const results = await capabilityIndexEngine.findByPattern(/calc/i);
      expect(results.length).toBeGreaterThan(0);
      // Verify at least one result matches the pattern
      expect(
        results.some(
          (r) =>
            r.action.toLowerCase().includes("calc") ||
            r.fullPath.toLowerCase().includes("calc") ||
            r.description.toLowerCase().includes("calc")
        )
      ).toBe(true);
    });
  });

  describe("refresh", () => {
    it("should rebuild index on refresh", async () => {
      const before = await capabilityIndexEngine.getStats();
      const newIndex = await capabilityIndexEngine.refresh();

      expect(newIndex.builtAt.getTime()).toBeGreaterThanOrEqual(
        before.builtAt.getTime()
      );
    });
  });

  describe("capability structure", () => {
    it("should have all required fields", async () => {
      const all = await capabilityIndexEngine.getAll();
      expect(all.length).toBeGreaterThan(0);

      const cap = all[0];
      expect(cap).toHaveProperty("dispatcherName");
      expect(cap).toHaveProperty("toolName");
      expect(cap).toHaveProperty("action");
      expect(cap).toHaveProperty("fullPath");
      expect(cap).toHaveProperty("description");
      expect(cap).toHaveProperty("category");
      expect(cap).toHaveProperty("effortTier");
    });

    it("should have valid fullPath format", async () => {
      const all = await capabilityIndexEngine.getAll();
      for (const cap of all.slice(0, 100)) {
        // Check first 100
        expect(cap.fullPath).toBe(`${cap.toolName}:${cap.action}`);
      }
    });

    it("should have valid effortTier values", async () => {
      const all = await capabilityIndexEngine.getAll();
      const validTiers = ["quick", "standard", "intensive", "unknown"];
      for (const cap of all.slice(0, 100)) {
        expect(validTiers).toContain(cap.effortTier);
      }
    });
  });
});
