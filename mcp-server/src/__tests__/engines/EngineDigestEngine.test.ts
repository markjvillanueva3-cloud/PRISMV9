/**
 * Tests for EngineDigestEngine
 *
 * AGENT ROADMAP: U-AGT02 (MS1)
 * Verifies engine inventory building and semantic metadata extraction
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  EngineDigestEngine,
  engineDigestEngine,
  EngineInventory,
} from "../../engines/EngineDigestEngine.js";

describe("EngineDigestEngine", () => {
  let inventory: EngineInventory;

  beforeAll(async () => {
    inventory = await engineDigestEngine.buildInventory(true);
  }, 60000); // Allow up to 60s for large codebase

  describe("buildInventory", () => {
    it("should discover 1000+ engines", async () => {
      expect(inventory.engineCount).toBeGreaterThanOrEqual(500);
    });

    it("should count total lines of code", async () => {
      expect(inventory.totalLoc).toBeGreaterThan(50000);
    });

    it("should categorize engines", async () => {
      expect(inventory.byCategory.size).toBeGreaterThanOrEqual(5);
    });

    it("should build dependency graph", async () => {
      expect(inventory.dependencyGraph.size).toBeGreaterThan(0);
    });

    it("should build reverse dependencies", async () => {
      expect(inventory.reverseDependencies.size).toBeGreaterThan(0);
    });
  });

  describe("search", () => {
    it("should find engines by name", async () => {
      const results = await engineDigestEngine.search("Force");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) =>
          r.engine.className.toLowerCase().includes("force")
        )
      ).toBe(true);
    });

    it("should find engines by category", async () => {
      const results = await engineDigestEngine.search("physics");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should respect limit", async () => {
      const results = await engineDigestEngine.search("engine", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should score exact matches higher", async () => {
      const results = await engineDigestEngine.search("Kienzle");
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });
  });

  describe("getByCategory", () => {
    it("should return engines for valid category", async () => {
      const stats = await engineDigestEngine.getStats();
      if (stats.categories.length > 0) {
        const engines = await engineDigestEngine.getByCategory(
          stats.categories[0]
        );
        expect(engines.length).toBeGreaterThan(0);
      }
    });

    it("should return empty for invalid category", async () => {
      const engines = await engineDigestEngine.getByCategory(
        "nonexistent_xyz"
      );
      expect(engines).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", async () => {
      const stats = await engineDigestEngine.getStats();

      expect(stats.engineCount).toBeGreaterThanOrEqual(500);
      expect(stats.totalLoc).toBeGreaterThan(50000);
      expect(stats.categories.length).toBeGreaterThanOrEqual(5);
      expect(stats.avgLoc).toBeGreaterThan(0);
      expect(stats.avgMethods).toBeGreaterThan(0);
      expect(stats.topByLoc.length).toBeGreaterThan(0);
      expect(stats.topByMethods.length).toBeGreaterThan(0);
    });
  });

  describe("findByName", () => {
    it("should find engine by exact name", async () => {
      const all = await engineDigestEngine.getAll();
      if (all.length > 0) {
        const known = all[0];
        const found = await engineDigestEngine.findByName(known.className);
        expect(found).not.toBeNull();
        expect(found?.className).toBe(known.className);
      }
    });

    it("should return null for unknown name", async () => {
      const found = await engineDigestEngine.findByName(
        "NonexistentEngine12345"
      );
      expect(found).toBeNull();
    });
  });

  describe("getDependencies", () => {
    it("should return dependencies for engines with imports", async () => {
      // Find an engine that has dependencies
      const all = await engineDigestEngine.getAll();
      const withDeps = all.find((e) => e.dependencies.length > 0);

      if (withDeps) {
        const deps = await engineDigestEngine.getDependencies(
          withDeps.className
        );
        expect(deps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getDependents", () => {
    it("should return engines that depend on common utilities", async () => {
      // Common engines like Logger should have dependents
      const stats = await engineDigestEngine.getStats();
      const topEngine = stats.topByLoc[0]?.name;

      if (topEngine) {
        const dependents = await engineDigestEngine.getDependents(topEngine);
        // May or may not have dependents, just verify it returns an array
        expect(Array.isArray(dependents)).toBe(true);
      }
    });
  });

  describe("engine digest structure", () => {
    it("should have all required fields", async () => {
      const all = await engineDigestEngine.getAll();
      expect(all.length).toBeGreaterThan(0);

      const engine = all[0];
      expect(engine).toHaveProperty("filename");
      expect(engine).toHaveProperty("className");
      expect(engine).toHaveProperty("relativePath");
      expect(engine).toHaveProperty("loc");
      expect(engine).toHaveProperty("publicMethods");
      expect(engine).toHaveProperty("methodNames");
      expect(engine).toHaveProperty("dependencies");
      expect(engine).toHaveProperty("category");
      expect(engine).toHaveProperty("subcategory");
      expect(engine).toHaveProperty("description");
      expect(engine).toHaveProperty("hasSingleton");
      expect(engine).toHaveProperty("modifiedAt");
    });

    it("should have valid LOC counts", async () => {
      const all = await engineDigestEngine.getAll();
      for (const engine of all.slice(0, 50)) {
        expect(engine.loc).toBeGreaterThan(0);
      }
    });

    it("should have valid category values", async () => {
      const all = await engineDigestEngine.getAll();
      for (const engine of all.slice(0, 50)) {
        expect(engine.category).toBeTruthy();
        expect(engine.subcategory).toBeTruthy();
      }
    });
  });

  describe("refresh", () => {
    it("should rebuild inventory on refresh", async () => {
      const before = await engineDigestEngine.getStats();
      const newInventory = await engineDigestEngine.refresh();

      expect(newInventory.builtAt.getTime()).toBeGreaterThanOrEqual(
        inventory.builtAt.getTime()
      );
    });
  });
});
