import { describe, it, expect, beforeEach } from "vitest";
import { EngineRegistryEngine } from "../engines/EngineRegistryEngine.js";

describe("EngineRegistryEngine", () => {
  let engine: EngineRegistryEngine;

  beforeEach(() => {
    engine = new EngineRegistryEngine();
  });

  describe("getAll", () => {
    it("returns all engines sorted by name", () => {
      const all = engine.getAll();
      expect(all.length).toBeGreaterThan(100);
      for (let i = 1; i < all.length; i++) {
        expect(all[i - 1].name.localeCompare(all[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it("each entry has required fields", () => {
      const all = engine.getAll();
      const first = all[0];
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("file");
      expect(first).toHaveProperty("description");
      expect(first).toHaveProperty("methods");
      expect(first).toHaveProperty("category");
    });
  });

  describe("get", () => {
    it("finds engine by exact name", () => {
      const entry = engine.get("QuickCalcEngine");
      expect(entry).not.toBeNull();
      expect(entry!.name).toBe("QuickCalcEngine");
    });

    it("finds engine by partial name", () => {
      const entry = engine.get("QuickCalc");
      expect(entry).not.toBeNull();
    });

    it("returns null for unknown engine", () => {
      expect(engine.get("ZzzNonexistentEngine")).toBeNull();
    });
  });

  describe("search", () => {
    it("finds engines by keyword", () => {
      const results = engine.search("material");
      expect(results.length).toBeGreaterThan(0);
    });

    it("searches methods too", () => {
      const results = engine.search("rpm");
      expect(results.length).toBeGreaterThan(0);
    });

    it("respects max limit", () => {
      const results = engine.search("engine", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getCategories", () => {
    it("returns categories with counts", () => {
      const cats = engine.getCategories();
      expect(Object.keys(cats).length).toBeGreaterThan(5);
    });
  });

  describe("getCompactList", () => {
    it("returns compact string listing", () => {
      const list = engine.getCompactList();
      expect(typeof list).toBe("string");
      expect(list.length).toBeGreaterThan(500);
    });
  });

  describe("getStats", () => {
    it("returns engine counts", () => {
      const stats = engine.getStats();
      expect(stats.total).toBeGreaterThan(100);
      expect(stats.categories).toBeGreaterThan(5);
      expect(stats.withMethods).toBeGreaterThan(50);
    });
  });
});
