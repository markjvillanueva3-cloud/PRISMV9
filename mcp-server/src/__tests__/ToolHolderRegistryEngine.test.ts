/**
 * ToolHolderRegistryEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  toolHolderRegistryEngine,
  ToolHolderRegistryEngine,
  type ToolHolder,
} from "../engines/ToolHolderRegistryEngine.js";

describe("ToolHolderRegistryEngine", () => {
  describe("Engine instantiation", () => {
    it("should export singleton", () => {
      expect(toolHolderRegistryEngine).toBeDefined();
      expect(toolHolderRegistryEngine).toBeInstanceOf(ToolHolderRegistryEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "register",
        "get",
        "query",
        "recommendForTool",
        "getByTaper",
        "getByType",
        "listAll",
        "getStats",
        "getSelfAwareness",
      ];
      for (const m of methods) {
        expect(typeof (toolHolderRegistryEngine as any)[m]).toBe("function");
      }
    });

    it("should seed catalog with multiple holders", () => {
      const all = toolHolderRegistryEngine.listAll();
      expect(all.length).toBeGreaterThan(10);
    });
  });

  describe("query", () => {
    it("should filter by taper", () => {
      const r = toolHolderRegistryEngine.query({ taper: "BT40" });
      expect(r.length).toBeGreaterThan(0);
      for (const h of r) expect(h.taper).toBe("BT40");
    });

    it("should filter by holder type", () => {
      const r = toolHolderRegistryEngine.query({ holder_type: "shrink_fit" });
      expect(r.length).toBeGreaterThan(0);
      for (const h of r) expect(h.type).toBe("shrink_fit");
    });

    it("should filter by shank diameter", () => {
      const r = toolHolderRegistryEngine.query({ shank_diameter_mm: 12 });
      expect(r.length).toBeGreaterThan(0);
      for (const h of r) expect(h.shank_diameter_mm).toBe(12);
    });

    it("should filter by min_rpm", () => {
      const r = toolHolderRegistryEngine.query({ min_rpm: 25000 });
      for (const h of r) expect(h.max_rpm).toBeGreaterThanOrEqual(25000);
    });

    it("should filter by max_runout_um", () => {
      const r = toolHolderRegistryEngine.query({ max_runout_um: 3 });
      for (const h of r) expect(h.runout_tir_um).toBeLessThanOrEqual(3);
    });

    it("should combine filters with AND logic", () => {
      const r = toolHolderRegistryEngine.query({
        taper: "BT40",
        holder_type: "shrink_fit",
        shank_diameter_mm: 12,
      });
      expect(r.length).toBeGreaterThan(0);
      for (const h of r) {
        expect(h.taper).toBe("BT40");
        expect(h.type).toBe("shrink_fit");
        expect(h.shank_diameter_mm).toBe(12);
      }
    });

    it("should sort by runout ascending", () => {
      const r = toolHolderRegistryEngine.query({ taper: "BT40" });
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].runout_tir_um).toBeLessThanOrEqual(r[i].runout_tir_um);
      }
    });
  });

  describe("recommendForTool", () => {
    it("should recommend shrink fit for finish work", () => {
      const h = toolHolderRegistryEngine.recommendForTool(12, "BT40", 20000, "finish");
      expect(h).not.toBeNull();
      expect(h!.runout_tir_um).toBeLessThanOrEqual(3);
    });

    it("should recommend holder meeting RPM requirement", () => {
      const h = toolHolderRegistryEngine.recommendForTool(10, "HSK63A", 30000, "finish");
      expect(h).not.toBeNull();
      expect(h!.max_rpm).toBeGreaterThanOrEqual(30000);
    });

    it("should allow higher runout for rough work", () => {
      const h = toolHolderRegistryEngine.recommendForTool(32, "CAT40", 10000, "rough");
      expect(h).not.toBeNull();
      expect(h!.runout_tir_um).toBeLessThanOrEqual(10);
    });

    it("should return null for impossible requirements", () => {
      const h = toolHolderRegistryEngine.recommendForTool(
        999, // No 999mm holder
        "BT40",
        50000,
        "finish"
      );
      expect(h).toBeNull();
    });
  });

  describe("register / get", () => {
    it("should register new holder and retrieve it", () => {
      const e = new ToolHolderRegistryEngine();
      const custom: ToolHolder = {
        id: "TEST-001",
        taper: "BT40",
        type: "shrink_fit",
        shank_diameter_mm: 14,
        gauge_length_mm: 100,
        max_rpm: 25000,
        runout_tir_um: 3,
        balance_grade: "G2.5-25000",
        coolant_through: true,
        manufacturer: "TestMfg",
        catalog_source: "test",
      };
      e.register(custom);
      expect(e.get("TEST-001")).toEqual(custom);
    });

    it("should return null for unknown id", () => {
      expect(toolHolderRegistryEngine.get("NOT-REAL-ID")).toBeNull();
    });
  });

  describe("getByTaper / getByType", () => {
    it("should return holders for known taper", () => {
      const r = toolHolderRegistryEngine.getByTaper("HSK63A");
      expect(r.length).toBeGreaterThan(0);
    });

    it("should return holders for known type", () => {
      const r = toolHolderRegistryEngine.getByType("shrink_fit");
      expect(r.length).toBeGreaterThan(3);
    });
  });

  describe("getStats", () => {
    it("should report catalog stats", () => {
      const s = toolHolderRegistryEngine.getStats();
      expect(s.total_holders).toBeGreaterThan(10);
      expect(s.manufacturers).toBeGreaterThan(2);
      expect(s.avg_max_rpm).toBeGreaterThan(5000);
      expect(s.min_runout_um).toBeGreaterThanOrEqual(2);
      expect(s.min_runout_um).toBeLessThan(10);
    });

    it("should count tapers and types", () => {
      const s = toolHolderRegistryEngine.getStats();
      expect(Object.keys(s.tapers).length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(s.types).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getSelfAwareness", () => {
    it("should list integration points", () => {
      const a = toolHolderRegistryEngine.getSelfAwareness();
      expect(a.engine_name).toBe("ToolHolderRegistryEngine");
      expect(a.integration_points).toContain("MillingAGIMasterEngine");
      expect(a.integration_points).toContain("ToolDeflectionEngine");
    });

    it("should list formula dependencies", () => {
      const a = toolHolderRegistryEngine.getSelfAwareness();
      expect(a.formula_dependencies.length).toBeGreaterThan(0);
      expect(a.formula_dependencies.join(" ")).toMatch(/runout|gauge|balance/i);
    });
  });

  describe("Physics validation", () => {
    it("should have G2.5 balance for high-RPM shrink fit", () => {
      const r = toolHolderRegistryEngine.query({
        taper: "BT40",
        holder_type: "shrink_fit",
      });
      for (const h of r) {
        expect(h.balance_grade).toMatch(/G2\.5/);
      }
    });

    it("should have lower runout for finer holders", () => {
      const sf = toolHolderRegistryEngine.query({ holder_type: "shrink_fit" });
      const er = toolHolderRegistryEngine.query({ holder_type: "er_collet" });
      const avgSf = sf.reduce((s, h) => s + h.runout_tir_um, 0) / sf.length;
      const avgEr = er.reduce((s, h) => s + h.runout_tir_um, 0) / er.length;
      expect(avgSf).toBeLessThan(avgEr);
    });
  });
});
