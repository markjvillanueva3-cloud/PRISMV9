import { describe, it, expect } from "vitest";
import { WasteDetectorEngine } from "../engines/WasteDetectorEngine.js";

describe("WasteDetectorEngine", () => {

  describe("checkRead", () => {
    it("flags duplicate reads within 60s", () => {
      const engine = new WasteDetectorEngine();
      engine.checkRead("a.ts", 500);
      const result = engine.checkRead("a.ts", 500);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("duplicate-fetch");
    });

    it("allows reads of different files", () => {
      const engine = new WasteDetectorEngine();
      engine.checkRead("a.ts", 500);
      const result = engine.checkRead("b.ts", 300);
      expect(result).toBeNull();
    });
  });

  describe("checkSearch", () => {
    it("flags empty searches", () => {
      const engine = new WasteDetectorEngine();
      const result = engine.checkSearch("nonexistent", 0, 100);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("empty-search");
    });

    it("flags duplicate search patterns", () => {
      const engine = new WasteDetectorEngine();
      engine.checkSearch("pattern", 5, 200);
      const result = engine.checkSearch("pattern", 3, 200);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("duplicate-fetch");
    });

    it("allows different patterns", () => {
      const engine = new WasteDetectorEngine();
      engine.checkSearch("foo", 3, 200);
      const result = engine.checkSearch("bar", 5, 200);
      expect(result).toBeNull();
    });
  });

  describe("checkOutputSize", () => {
    it("flags oversized output", () => {
      const engine = new WasteDetectorEngine();
      const result = engine.checkOutputSize("Read", 5000, 500);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("oversized-output");
    });

    it("allows normal output", () => {
      const engine = new WasteDetectorEngine();
      const result = engine.checkOutputSize("Read", 400, 500);
      expect(result).toBeNull();
    });
  });

  describe("report", () => {
    it("aggregates waste events", () => {
      const engine = new WasteDetectorEngine();
      engine.record("duplicate-fetch", "Read", "re-read a.ts", 500);
      engine.record("empty-search", "Grep", "no matches", 100);
      const r = engine.report();
      expect(r.events.length).toBe(2);
      expect(r.totalWaste).toBe(600);
      expect(r.topWasteType).toBe("duplicate-fetch");
    });

    it("generates recommendations", () => {
      const engine = new WasteDetectorEngine();
      engine.record("duplicate-fetch", "Read", "test", 500);
      engine.record("empty-search", "Grep", "test", 100);
      const r = engine.report();
      expect(r.recommendations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("oneLiner", () => {
    it("reports waste", () => {
      const engine = new WasteDetectorEngine();
      engine.record("duplicate-fetch", "Read", "test", 2000);
      const line = engine.oneLiner();
      expect(line).toContain("1 waste");
      expect(line).toContain("duplicate-fetch");
    });

    it("reports no waste", () => {
      const engine = new WasteDetectorEngine();
      expect(engine.oneLiner()).toBe("No waste detected");
    });
  });

  describe("reset", () => {
    it("clears all data", () => {
      const engine = new WasteDetectorEngine();
      engine.record("duplicate-fetch", "Read", "test", 500);
      engine.checkRead("a.ts", 100);
      engine.reset();
      expect(engine.report().events.length).toBe(0);
      // After reset, checkRead should not flag duplicate
      expect(engine.checkRead("a.ts", 100)).toBeNull();
    });
  });
});
