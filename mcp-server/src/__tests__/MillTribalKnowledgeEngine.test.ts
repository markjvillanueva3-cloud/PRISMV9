/**
 * MillTribalKnowledgeEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  millTribalKnowledgeEngine,
  MillTribalKnowledgeEngine,
  type TribalTip,
} from "../engines/MillTribalKnowledgeEngine.js";

describe("MillTribalKnowledgeEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton", () => {
      expect(millTribalKnowledgeEngine).toBeDefined();
      expect(millTribalKnowledgeEngine).toBeInstanceOf(MillTribalKnowledgeEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "add",
        "get",
        "query",
        "getCategories",
        "getAllTips",
        "countByCategory",
        "getStats",
        "getSelfAwareness",
      ];
      for (const m of methods) {
        expect(typeof (millTribalKnowledgeEngine as any)[m]).toBe("function");
      }
    });

    it("should seed with multiple tips", () => {
      const all = millTribalKnowledgeEngine.getAllTips();
      expect(all.length).toBeGreaterThan(25);
    });
  });

  describe("query", () => {
    it("should filter by category", () => {
      const r = millTribalKnowledgeEngine.query({ category: "chatter" });
      expect(r.length).toBeGreaterThan(0);
      for (const t of r) expect(t.category).toBe("chatter");
    });

    it("should filter by material", () => {
      const r = millTribalKnowledgeEngine.query({ material: "titanium" });
      expect(r.length).toBeGreaterThan(0);
    });

    it("should filter by machine", () => {
      const r = millTribalKnowledgeEngine.query({ machine: "haas" });
      expect(r.length).toBeGreaterThan(0);
    });

    it("should filter by cam system", () => {
      const r = millTribalKnowledgeEngine.query({ cam: "hypermill" });
      expect(r.length).toBeGreaterThan(0);
    });

    it("should filter by keyword", () => {
      const r = millTribalKnowledgeEngine.query({ keyword: "coolant" });
      expect(r.length).toBeGreaterThan(0);
    });

    it("should filter by min confidence", () => {
      const r = millTribalKnowledgeEngine.query({ min_confidence: 0.95 });
      for (const t of r) expect(t.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("should sort by confidence descending", () => {
      const r = millTribalKnowledgeEngine.query({});
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].confidence).toBeGreaterThanOrEqual(r[i].confidence);
      }
    });

    it("should combine filters with AND logic", () => {
      const r = millTribalKnowledgeEngine.query({
        material: "Ti-6Al-4V",
        category: "speed_feed",
      });
      expect(r.length).toBeGreaterThan(0);
      for (const t of r) {
        expect(t.category).toBe("speed_feed");
      }
    });

    it("should return empty for impossible filter", () => {
      const r = millTribalKnowledgeEngine.query({
        material: "unobtainium",
        machine: "imaginary_bot_9000",
      });
      expect(r.length).toBe(0);
    });
  });

  describe("add / get", () => {
    it("should add new tip and retrieve it", () => {
      const e = new MillTribalKnowledgeEngine();
      const tip: TribalTip = {
        id: "TT-TEST",
        category: "setup",
        rule: "Test rule",
        rationale: "Test rationale",
        source: "test",
        confidence: 0.8,
      };
      e.add(tip);
      expect(e.get("TT-TEST")).toEqual(tip);
    });

    it("should return null for missing id", () => {
      expect(millTribalKnowledgeEngine.get("NON-EXISTENT-ID")).toBeNull();
    });

    it("should overwrite existing tip with same id", () => {
      const e = new MillTribalKnowledgeEngine();
      const tip1: TribalTip = {
        id: "SAME-ID",
        category: "setup",
        rule: "v1",
        rationale: "r1",
        source: "s",
        confidence: 0.5,
      };
      const tip2: TribalTip = { ...tip1, rule: "v2", confidence: 0.9 };
      e.add(tip1);
      e.add(tip2);
      expect(e.get("SAME-ID")!.rule).toBe("v2");
      expect(e.get("SAME-ID")!.confidence).toBe(0.9);
    });
  });

  describe("getCategories / countByCategory", () => {
    it("should return distinct categories", () => {
      const cats = millTribalKnowledgeEngine.getCategories();
      expect(cats.length).toBeGreaterThan(5);
    });

    it("should count tips per category", () => {
      const counts = millTribalKnowledgeEngine.countByCategory();
      expect(Object.keys(counts).length).toBeGreaterThan(5);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(millTribalKnowledgeEngine.getAllTips().length);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive stats", () => {
      const s = millTribalKnowledgeEngine.getStats();
      expect(s.total_tips).toBeGreaterThan(25);
      expect(s.avg_confidence).toBeGreaterThan(0.8);
      expect(s.avg_confidence).toBeLessThanOrEqual(1.0);
      expect(s.high_confidence_count).toBeGreaterThan(10);
      expect(s.categories).toBeGreaterThan(5);
      expect(s.materials_covered).toBeGreaterThan(0);
      expect(s.machines_covered).toBeGreaterThan(0);
      expect(s.cam_systems_covered).toBeGreaterThan(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("should list integration points", () => {
      const a = millTribalKnowledgeEngine.getSelfAwareness();
      expect(a.engine_name).toBe("MillTribalKnowledgeEngine");
      expect(a.integration_points).toContain("MillingAGIMasterEngine");
      expect(a.integration_points).toContain("MillResourceAwarenessEngine");
      expect(a.integration_points).toContain("ToolHolderRegistryEngine");
    });

    it("should list formula dependencies", () => {
      const a = millTribalKnowledgeEngine.getSelfAwareness();
      expect(a.formula_dependencies).toContain("Kienzle cutting force (kc1.1)");
      expect(a.formula_dependencies).toContain("Taylor tool life (VcT^n = C)");
    });
  });

  describe("Content quality", () => {
    it("should have rules, rationale, source for every tip", () => {
      const tips = millTribalKnowledgeEngine.getAllTips();
      for (const t of tips) {
        expect(t.rule.length).toBeGreaterThan(10);
        expect(t.rationale.length).toBeGreaterThan(10);
        expect(t.source.length).toBeGreaterThan(3);
        expect(t.confidence).toBeGreaterThan(0);
        expect(t.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should cover titanium knowledge", () => {
      const r = millTribalKnowledgeEngine.query({ material: "Ti-6Al-4V" });
      expect(r.length).toBeGreaterThan(0);
    });

    it("should cover chatter knowledge", () => {
      const r = millTribalKnowledgeEngine.query({ category: "chatter" });
      expect(r.length).toBeGreaterThanOrEqual(2);
    });

    it("should cover HSM knowledge", () => {
      const r = millTribalKnowledgeEngine.query({ category: "hsm" });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });

    it("should cover thin wall knowledge", () => {
      const r = millTribalKnowledgeEngine.query({ category: "thin_wall" });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty query", () => {
      const r = millTribalKnowledgeEngine.query({});
      expect(r.length).toBeGreaterThan(0);
    });

    it("should handle undefined query fields", () => {
      const r = millTribalKnowledgeEngine.query({
        category: undefined,
        material: undefined,
      });
      expect(r.length).toBeGreaterThan(0);
    });
  });
});
