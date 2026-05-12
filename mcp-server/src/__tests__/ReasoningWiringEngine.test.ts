import { describe, it, expect, beforeEach } from "vitest";
import { ReasoningWiringEngine, reasoningWiringEngine } from "../engines/ReasoningWiringEngine.js";

describe("ReasoningWiringEngine", () => {
  describe("initialization", () => {
    it("should export singleton instance", () => {
      expect(reasoningWiringEngine).toBeInstanceOf(ReasoningWiringEngine);
    });
    it("should have engines loaded", () => {
      expect(reasoningWiringEngine.listEngines().length).toBeGreaterThan(30);
    });
  });

  describe("listEngines", () => {
    it("should list all engines", () => {
      expect(reasoningWiringEngine.listEngines().length).toBe(32);
    });
    it("should filter by category", () => {
      const decision = reasoningWiringEngine.listEngines("decision_making");
      expect(decision.length).toBeGreaterThan(3);
      expect(decision.every(e => e.category === "decision_making")).toBe(true);
    });
    it("should filter by domain", () => {
      const turning = reasoningWiringEngine.listEngines(undefined, "turning");
      expect(turning.length).toBeGreaterThan(2);
      expect(turning.every(e => e.domain === "turning")).toBe(true);
    });
  });

  describe("getEngine", () => {
    it("should get engine by name", () => {
      const e = reasoningWiringEngine.getEngine("PRISMCreativeReasoningEngine");
      expect(e?.name).toBe("PRISMCreativeReasoningEngine");
      expect(e?.category).toBe("creative");
    });
    it("should return undefined for unknown", () => {
      expect(reasoningWiringEngine.getEngine("Unknown")).toBeUndefined();
    });
  });

  describe("wiring functionality", () => {
    it("should list orphaned engines", () => {
      expect(reasoningWiringEngine.listOrphanedEngines().length).toBeGreaterThan(0);
    });
    it("should list wired engines", () => {
      expect(reasoningWiringEngine.listWiredEngines().length).toBeGreaterThan(10);
    });
    it("should get wirings for engine", () => {
      const w = reasoningWiringEngine.getWirings("PRISMCreativeReasoningEngine");
      expect(w.length).toBeGreaterThan(0);
      expect(w[0]).toHaveProperty("dispatcher");
    });
    it("should get engines for dispatcher", () => {
      const engines = reasoningWiringEngine.getEnginesForDispatcher("aiReasoningDispatcher");
      expect(engines.length).toBeGreaterThan(3);
    });
  });

  describe("wiring report", () => {
    it("should generate report", () => {
      const r = reasoningWiringEngine.getWiringReport();
      expect(r.totalEngines).toBe(32);
      expect(r.wiredCount).toBeGreaterThan(0);
      expect(r.coverage).toBeGreaterThan(0);
    });
    it("should include category breakdown", () => {
      const r = reasoningWiringEngine.getWiringReport();
      expect(r.byCategory.length).toBeGreaterThan(5);
    });
  });

  describe("findByCapability", () => {
    it("should find by capability", () => {
      const engines = reasoningWiringEngine.findByCapability("optimization");
      expect(engines.length).toBeGreaterThan(0);
    });
  });

  describe("recommendEngines", () => {
    it("should recommend for decision task", () => {
      const e = reasoningWiringEngine.recommendEngines("decision");
      expect(e.length).toBeGreaterThan(3);
    });
    it("should recommend for creative task", () => {
      const e = reasoningWiringEngine.recommendEngines("creative");
      expect(e.length).toBeGreaterThan(1);
    });
  });

  describe("wireEngine", () => {
    it("should wire engine manually", () => {
      const e = new ReasoningWiringEngine();
      const orphans = e.listOrphanedEngines();
      if (orphans.length > 0) {
        const result = e.wireEngine(orphans[0], {
          dispatcher: "test_dispatcher", action: "test_action", reason: "test", priority: "medium"
        });
        expect(result).toBe(true);
      }
    });
    it("should return false for unknown engine", () => {
      const e = new ReasoningWiringEngine();
      expect(e.wireEngine("Unknown", { dispatcher: "t", action: "a", reason: "r", priority: "low" })).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return stats", () => {
      const s = reasoningWiringEngine.getStats();
      expect(s.totalEngines).toBe(32);
      expect(s.byCategory.length).toBeGreaterThan(5);
      expect(s.byDomain.length).toBeGreaterThan(5);
      expect(s.byComplexity.length).toBeGreaterThan(2);
    });
  });
});
