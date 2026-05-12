/**
 * MillResourceAwarenessEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  millResourceAwarenessEngine,
  MillResourceAwarenessEngine,
} from "../engines/MillResourceAwarenessEngine.js";

describe("MillResourceAwarenessEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton instance", () => {
      expect(millResourceAwarenessEngine).toBeDefined();
      expect(millResourceAwarenessEngine).toBeInstanceOf(MillResourceAwarenessEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "getSnapshot",
        "query",
        "getResourcePath",
        "getTotalFiles",
        "getCategoryCounts",
        "getAICapabilityMap",
        "getSelfAwareness",
        "rescan",
        "getStats",
      ];
      for (const m of methods) {
        expect(typeof (millResourceAwarenessEngine as any)[m]).toBe("function");
      }
    });
  });

  describe("getSnapshot", () => {
    it("should return structured snapshot", () => {
      const s = millResourceAwarenessEngine.getSnapshot();
      expect(s).toHaveProperty("haas_programs");
      expect(s).toHaveProperty("hypermill_training");
      expect(s).toHaveProperty("fusion_posts");
      expect(s).toHaveProperty("okuma_setups");
      expect(s).toHaveProperty("total_mill_files");
      expect(s).toHaveProperty("last_scanned");
    });

    it("should report correct total counts", () => {
      const s = millResourceAwarenessEngine.getSnapshot();
      expect(s.haas_programs.total).toBe(533);
      expect(s.haas_programs.customers).toBe(58);
      expect(s.hypermill_training.pdf_manuals).toBe(9);
      expect(s.total_mill_files).toBeGreaterThan(5000);
    });

    it("should include valid H-drive paths", () => {
      const s = millResourceAwarenessEngine.getSnapshot();
      expect(s.haas_programs.path).toContain("H:/PRISM");
      expect(s.jm_die_mill.path).toContain("JM DIE");
    });
  });

  describe("query", () => {
    it("should return all categories when no filter", () => {
      const r = millResourceAwarenessEngine.query({});
      expect(r.length).toBeGreaterThan(5);
    });

    it("should filter by category", () => {
      const r = millResourceAwarenessEngine.query({ category: "haas_programs" });
      expect(r.length).toBe(1);
      expect(r[0].category).toBe("haas_programs");
    });

    it("should boost relevance for matching material", () => {
      const r = millResourceAwarenessEngine.query({ material: "titanium" });
      expect(r.every((x) => x.relevance >= 0.5)).toBe(true);
    });

    it("should boost relevance for matching machine", () => {
      const haasResults = millResourceAwarenessEngine.query({ machine: "haas" });
      const haas = haasResults.find((x) => x.category === "haas_programs");
      expect(haas).toBeDefined();
      expect(haas!.relevance).toBeGreaterThan(0.5);
    });

    it("should sort by relevance descending", () => {
      const r = millResourceAwarenessEngine.query({ machine: "okuma" });
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].relevance).toBeGreaterThanOrEqual(r[i].relevance);
      }
    });
  });

  describe("getResourcePath", () => {
    it("should return path for known category", () => {
      const p = millResourceAwarenessEngine.getResourcePath("haas_programs");
      expect(p).toContain("H:/PRISM");
      expect(p).toContain("HAAS");
    });

    it("should return path for hypermill training", () => {
      const p = millResourceAwarenessEngine.getResourcePath("hypermill_training");
      expect(p).toContain("HYPERMILL");
    });

    it("should return null for invalid category", () => {
      const p = millResourceAwarenessEngine.getResourcePath("nonexistent" as any);
      expect(p).toBeNull();
    });
  });

  describe("getCategoryCounts", () => {
    it("should return counts for all 8 categories", () => {
      const counts = millResourceAwarenessEngine.getCategoryCounts();
      expect(Object.keys(counts).length).toBe(8);
      expect(counts.haas_programs).toBe(533);
      expect(counts.okuma_setups).toBe(3055);
      expect(counts.hypermill_training).toBe(1621);
    });
  });

  describe("getAICapabilityMap", () => {
    it("should list all orchestrator targets", () => {
      const m = millResourceAwarenessEngine.getAICapabilityMap();
      expect(m.orchestrator_targets).toContain("MillingAGIMasterEngine");
      expect(m.orchestrator_targets).toContain("MillingAGIOrchestrationEngine");
      expect(m.ai_ready).toBe(true);
      expect(m.coverage_fraction).toBeGreaterThan(0.9);
    });

    it("should list 8 resource categories", () => {
      const m = millResourceAwarenessEngine.getAICapabilityMap();
      expect(m.resource_categories.length).toBe(8);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return self-awareness with integration points", () => {
      const a = millResourceAwarenessEngine.getSelfAwareness();
      expect(a.engine_name).toBe("MillResourceAwarenessEngine");
      expect(a.integration_points).toContain("MillingAGIMasterEngine");
      expect(a.integration_points).toContain("ToolHolderRegistryEngine");
      expect(a.integration_points.length).toBeGreaterThan(4);
    });
  });

  describe("rescan", () => {
    it("should update last_scanned timestamp", () => {
      const before = millResourceAwarenessEngine.getSnapshot().last_scanned;
      const after = millResourceAwarenessEngine.rescan();
      expect(after.last_scanned).toBeDefined();
      expect(after.total_mill_files).toBeGreaterThan(0);
    });

    it("should preserve total counts after rescan", () => {
      const before = millResourceAwarenessEngine.getTotalFiles();
      millResourceAwarenessEngine.rescan();
      const after = millResourceAwarenessEngine.getTotalFiles();
      expect(after).toBe(before);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive stats", () => {
      const s = millResourceAwarenessEngine.getStats();
      expect(s.total_files).toBeGreaterThan(5000);
      expect(s.total_categories).toBe(8);
      expect(s.total_customers).toBe(58);
      expect(s.total_manuals).toBe(9);
      expect(s.coverage_pct).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty query", () => {
      const r = millResourceAwarenessEngine.query({});
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThan(0);
    });

    it("should handle unknown material gracefully", () => {
      const r = millResourceAwarenessEngine.query({ material: "unobtainium-9000" });
      expect(Array.isArray(r)).toBe(true);
    });

    it("should handle unknown machine gracefully", () => {
      const r = millResourceAwarenessEngine.query({ machine: "fictional-bot" });
      expect(Array.isArray(r)).toBe(true);
    });
  });
});
