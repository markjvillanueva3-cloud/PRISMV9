import { describe, it, expect, beforeEach } from "vitest";
import { FrequentPathEngine } from "../engines/FrequentPathEngine.js";

describe("FrequentPathEngine", () => {
  let engine: FrequentPathEngine;

  beforeEach(() => {
    engine = new FrequentPathEngine();
    engine.clear();
  });

  describe("record and getFrequency", () => {
    it("records and retrieves frequency", () => {
      engine.record("engines/QuickCalcEngine.ts", "engine");
      engine.record("engines/QuickCalcEngine.ts", "engine");
      engine.record("engines/QuickCalcEngine.ts", "engine");
      expect(engine.getFrequency("engines/QuickCalcEngine.ts", "engine")).toBe(3);
    });

    it("returns 0 for unrecorded path", () => {
      expect(engine.getFrequency("nonexistent", "file")).toBe(0);
    });
  });

  describe("getTop", () => {
    it("returns top N by frequency", () => {
      engine.record("a", "file");
      engine.record("a", "file");
      engine.record("b", "file");
      engine.record("b", "file");
      engine.record("b", "file");
      engine.record("c", "file");

      const top = engine.getTop(2);
      expect(top[0].path).toBe("b");
      expect(top[0].count).toBe(3);
      expect(top.length).toBe(2);
    });

    it("filters by category", () => {
      engine.record("a", "engine");
      engine.record("b", "action");

      const engines = engine.getTop(10, "engine");
      expect(engines.length).toBe(1);
      expect(engines[0].category).toBe("engine");
    });
  });

  describe("getTopWeighted", () => {
    it("returns weighted scores", () => {
      engine.record("a", "file");
      engine.record("a", "file");
      const weighted = engine.getTopWeighted(5);
      expect(weighted.length).toBe(1);
      expect(weighted[0].score).toBeGreaterThan(0);
    });
  });

  describe("getCategories", () => {
    it("returns category counts", () => {
      engine.record("a", "engine");
      engine.record("b", "action");
      engine.record("c", "engine");

      const cats = engine.getCategories();
      expect(cats["engine"]).toBe(2);
      expect(cats["action"]).toBe(1);
    });
  });

  describe("getStats", () => {
    it("returns summary stats", () => {
      engine.record("a", "file");
      engine.record("a", "file");
      engine.record("b", "file");

      const stats = engine.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalAccesses).toBe(3);
    });
  });

  describe("clear", () => {
    it("clears all data", () => {
      engine.record("a", "file");
      engine.clear();
      expect(engine.getFrequency("a", "file")).toBe(0);
      expect(engine.getStats().totalEntries).toBe(0);
    });
  });
});
