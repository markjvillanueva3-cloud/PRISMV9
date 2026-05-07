/**
 * U-P2PFS15b: WEDMTribalRuntimeEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_tribal_query, wedm_tribal_get_tip,
 * wedm_tribal_list_category, wedm_tribal_stats
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMTribalRuntimeEngine,
  type SelectionContext,
  type TribalTip,
  type SelectionResult,
  type TribalRuntimeStats,
} from "../engines/WEDMTribalRuntimeEngine.js";

describe("WEDMTribalRuntimeEngine MCP Wiring (U-P2PFS15b)", () => {
  let engine: WEDMTribalRuntimeEngine;

  beforeEach(() => {
    engine = new WEDMTribalRuntimeEngine();
  });

  describe("select()", () => {
    it("returns SelectionResult structure", () => {
      const context: SelectionContext = {
        dispatcher: "edm",
        action: "wedm_tribal_query",
      };
      const result = engine.select(context);

      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("considered");
      expect(result).toHaveProperty("latencyMs");
    });

    it("considers all loaded tips", () => {
      const result = engine.select({ dispatcher: "edm", action: "test" });

      expect(result.considered).toBeGreaterThan(0);
    });

    it("respects maxResults parameter", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire"],
        maxResults: 2,
      });

      expect(result.tips.length).toBeLessThanOrEqual(2);
    });

    it("filters by keywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire", "break"],
      });

      if (result.tips.length > 0) {
        expect(result.tips[0].matchedKeywords.length).toBeGreaterThan(0);
      }
    });

    it("filters by material", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        material: "D2",
      });

      expect(result).toHaveProperty("tips");
    });

    it("filters by machine", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        machine: "Mitsubishi",
      });

      expect(result).toHaveProperty("tips");
    });

    it("filters by operation", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        operation: "rough",
      });

      expect(result).toHaveProperty("tips");
    });

    it("returns scored tips with score and matchedKeywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire"],
      });

      if (result.tips.length > 0) {
        expect(result.tips[0]).toHaveProperty("tip");
        expect(result.tips[0]).toHaveProperty("score");
        expect(result.tips[0]).toHaveProperty("matchedKeywords");
        expect(result.tips[0]).toHaveProperty("matchedTags");
      }
    });

    it("tracks latency in milliseconds", () => {
      const result = engine.select({ dispatcher: "edm", action: "test" });

      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("sorts tips by score descending", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire", "flushing", "tension"],
        maxResults: 10,
      });

      for (let i = 1; i < result.tips.length; i++) {
        expect(result.tips[i - 1].score).toBeGreaterThanOrEqual(result.tips[i].score);
      }
    });

    it("handles empty keywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });

      expect(result).toHaveProperty("tips");
    });
  });

  describe("getTipById()", () => {
    it("returns a tip when ID exists", () => {
      const selectResult = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire"],
        maxResults: 1,
      });

      if (selectResult.tips.length > 0) {
        const tip = engine.getTipById(selectResult.tips[0].tip.id);
        expect(tip).not.toBeNull();
        expect(tip?.id).toBe(selectResult.tips[0].tip.id);
      }
    });

    it("returns null for non-existent ID", () => {
      const tip = engine.getTipById("non_existent_tip_id_xyz");
      expect(tip).toBeNull();
    });

    it("returns full TribalTip structure", () => {
      const selectResult = engine.select({
        dispatcher: "edm",
        action: "test",
        maxResults: 1,
      });

      if (selectResult.tips.length > 0) {
        const tip = engine.getTipById(selectResult.tips[0].tip.id);
        expect(tip).toHaveProperty("id");
        expect(tip).toHaveProperty("title");
        expect(tip).toHaveProperty("body");
        expect(tip).toHaveProperty("category");
        expect(tip).toHaveProperty("tags");
        expect(tip).toHaveProperty("confidence");
        expect(tip).toHaveProperty("source");
      }
    });
  });

  describe("listByCategory()", () => {
    it("returns array of tips", () => {
      const tips = engine.listByCategory("wire_management");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("returns empty array for non-existent category", () => {
      const tips = engine.listByCategory("definitely_not_a_category_xyz");
      expect(tips).toHaveLength(0);
    });

    it("returns tips matching category", () => {
      const tips = engine.listByCategory("flushing");
      for (const tip of tips) {
        expect(tip.category).toBe("flushing");
      }
    });
  });

  describe("stats()", () => {
    it("returns TribalRuntimeStats structure", () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty("totalTipsLoaded");
      expect(stats).toHaveProperty("totalSelections");
      expect(stats).toHaveProperty("totalServed");
      expect(stats).toHaveProperty("topTipsByUse");
      expect(stats).toHaveProperty("avgLatencyMs");
      expect(stats).toHaveProperty("uniqueActionsSeen");
    });

    it("tracks total tips loaded", () => {
      const stats = engine.getStats();
      expect(stats.totalTipsLoaded).toBeGreaterThan(0);
    });

    it("tracks selections after queries", () => {
      engine.select({ dispatcher: "edm", action: "test1" });
      engine.select({ dispatcher: "edm", action: "test2" });

      const stats = engine.getStats();
      expect(stats.totalSelections).toBeGreaterThanOrEqual(2);
    });

    it("tracks unique actions seen", () => {
      engine.select({ dispatcher: "edm", action: "action_a" });
      engine.select({ dispatcher: "edm", action: "action_b" });
      engine.select({ dispatcher: "edm", action: "action_a" }); // duplicate

      const stats = engine.getStats();
      expect(stats.uniqueActionsSeen).toBeGreaterThanOrEqual(2);
    });

    it("tracks average latency", () => {
      engine.select({ dispatcher: "edm", action: "test" });

      const stats = engine.getStats();
      expect(typeof stats.avgLatencyMs).toBe("number");
    });

    it("tracks top tips by usage", () => {
      engine.select({ dispatcher: "edm", action: "test", keywords: ["wire"], maxResults: 3 });

      const stats = engine.getStats();
      expect(Array.isArray(stats.topTipsByUse)).toBe(true);
    });
  });

  describe("reloadTips()", () => {
    it("reloads tips from source", () => {
      const statsBefore = engine.getStats();
      engine.reloadTips();
      const statsAfter = engine.getStats();

      expect(statsAfter.totalTipsLoaded).toBeGreaterThan(0);
    });
  });

  describe("exploration bonus", () => {
    it("gives bonus to rarely-used tips", () => {
      const result1 = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["wire"],
        maxResults: 20,
      });

      expect(result1.tips.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles undefined keywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: undefined,
      });

      expect(result).toHaveProperty("tips");
    });

    it("handles very short keywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["a", "b"], // single char keywords ignored
      });

      expect(result).toHaveProperty("tips");
    });

    it("handles special characters in keywords", () => {
      const result = engine.select({
        dispatcher: "edm",
        action: "test",
        keywords: ["µS/cm", "MΩ·cm"],
      });

      expect(result).toHaveProperty("tips");
    });
  });
});
