import { describe, it, expect, beforeEach } from "vitest";
import { AlgorithmWiringEngine, algorithmWiringEngine } from "../engines/AlgorithmWiringEngine.js";

describe("AlgorithmWiringEngine", () => {
  describe("initialization", () => {
    it("should export singleton instance", () => {
      expect(algorithmWiringEngine).toBeInstanceOf(AlgorithmWiringEngine);
    });
    it("should have algorithms loaded", () => {
      expect(algorithmWiringEngine.listAlgorithms().length).toBeGreaterThan(40);
    });
  });

  describe("listAlgorithms", () => {
    it("should list all algorithms", () => {
      expect(algorithmWiringEngine.listAlgorithms().length).toBe(51);
    });
    it("should filter by category", () => {
      const opt = algorithmWiringEngine.listAlgorithms("optimization");
      expect(opt.length).toBeGreaterThan(5);
      expect(opt.every(a => a.category === "optimization")).toBe(true);
    });
  });

  describe("getAlgorithm", () => {
    it("should get algorithm by name", () => {
      const algo = algorithmWiringEngine.getAlgorithm("KienzleForceModel");
      expect(algo?.name).toBe("KienzleForceModel");
      expect(algo?.category).toBe("modeling");
    });
    it("should return undefined for unknown", () => {
      expect(algorithmWiringEngine.getAlgorithm("NonExistent")).toBeUndefined();
    });
  });

  describe("wiring functionality", () => {
    it("should list orphaned algorithms", () => {
      expect(algorithmWiringEngine.listOrphanedAlgorithms().length).toBeGreaterThan(0);
    });
    it("should list wired algorithms", () => {
      expect(algorithmWiringEngine.listWiredAlgorithms().length).toBeGreaterThan(15);
    });
    it("should get consumers for an algorithm", () => {
      const c = algorithmWiringEngine.getConsumers("BayesianOptimizer");
      expect(c.length).toBeGreaterThan(0);
      expect(c[0]).toHaveProperty("engineName");
    });
    it("should get algorithms for engine", () => {
      const a = algorithmWiringEngine.getAlgorithmsForEngine("SpeedFeedOptimizerEngine");
      expect(a).toContain("BayesianOptimizer");
    });
  });

  describe("wiring report", () => {
    it("should generate report", () => {
      const r = algorithmWiringEngine.getWiringReport();
      expect(r.totalAlgorithms).toBe(51);
      expect(r.wiredCount).toBeGreaterThan(0);
      expect(r.coverage).toBeGreaterThan(0);
    });
  });

  describe("findByUseCase", () => {
    it("should find by use case", () => {
      expect(algorithmWiringEngine.findByUseCase("chatter").length).toBeGreaterThan(0);
    });
  });

  describe("recommendAlgorithms", () => {
    it("should recommend for optimization", () => {
      const a = algorithmWiringEngine.recommendAlgorithms("optimization");
      expect(a.length).toBeGreaterThan(5);
    });
    it("should recommend for monitoring", () => {
      expect(algorithmWiringEngine.recommendAlgorithms("monitoring").length).toBeGreaterThan(2);
    });
  });

  describe("wireAlgorithm", () => {
    it("should wire algorithm to engine", () => {
      const e = new AlgorithmWiringEngine();
      const orphans = e.listOrphanedAlgorithms();
      if (orphans.length > 0) {
        const r = e.wireAlgorithm(orphans[0], { engineName: "Test", method: "t", reason: "test", confidence: 0.9 });
        expect(r).toBe(true);
      }
    });
    it("should return false for unknown", () => {
      const e = new AlgorithmWiringEngine();
      expect(e.wireAlgorithm("Unknown", { engineName: "T", method: "m", reason: "r", confidence: 0.5 })).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return stats", () => {
      const s = algorithmWiringEngine.getStats();
      expect(s.totalAlgorithms).toBe(51);
      expect(s.byCategory.length).toBeGreaterThan(8);
      expect(s.topUseCases.length).toBe(10);
    });
  });

  describe("data integrity", () => {
    it("should have valid complexity", () => {
      const valid = ["O(1)", "O(n)", "O(n log n)", "O(n^2)", "O(2^n)"];
      algorithmWiringEngine.listAlgorithms().forEach(a => expect(valid).toContain(a.complexity));
    });
    it("should have use cases for all", () => {
      algorithmWiringEngine.listAlgorithms().forEach(a => expect(a.useCases.length).toBeGreaterThan(0));
    });
  });
});
