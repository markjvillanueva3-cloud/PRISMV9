/**
 * WEDMTribalRuntimeEngine tests — MS-P0.5-COORD U-P0.5-COORD-05
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmTribalRuntimeEngine } from "../engines/WEDMTribalRuntimeEngine.js";

describe("WEDMTribalRuntimeEngine", () => {
  beforeEach(() => {
    wedmTribalRuntimeEngine.resetForTests();
  });

  describe("tip corpus loading", () => {
    it("loads >100 tips from the curated WEDM_KNOWLEDGE_TIPS corpus", () => {
      const stats = wedmTribalRuntimeEngine.getStats();
      expect(stats.totalTipsLoaded).toBeGreaterThanOrEqual(100);
    });

    it("exposes getTipById for specific lookups", () => {
      const tip = wedmTribalRuntimeEngine.getTipById("wedm-kb-001");
      expect(tip).not.toBeNull();
      expect(tip?.title).toContain("Wire breakage");
    });

    it("listByCategory filters by category", () => {
      const trouble = wedmTribalRuntimeEngine.listByCategory("troubleshooting");
      expect(trouble.length).toBeGreaterThan(0);
      expect(trouble.every((t) => t.category === "troubleshooting")).toBe(true);
    });
  });

  describe("select", () => {
    it("returns up to maxResults scored tips", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire", "break"],
        maxResults: 3,
      });
      expect(r.tips.length).toBeLessThanOrEqual(3);
    });

    it("defaults to 5 results", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire"],
      });
      expect(r.tips.length).toBeLessThanOrEqual(5);
    });

    it("keyword matches increase score vs pure baseline", () => {
      const matched = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire", "break", "corner"],
        maxResults: 3,
      });
      expect(matched.tips.length).toBeGreaterThan(0);
      expect(matched.tips[0].score).toBeGreaterThan(0);
    });

    it("orders results by descending score", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire", "break"],
        maxResults: 5,
      });
      for (let i = 1; i < r.tips.length; i++) {
        expect(r.tips[i - 1].score).toBeGreaterThanOrEqual(r.tips[i].score);
      }
    });

    it("returns considered count equal to loaded tips", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire"],
      });
      const stats = wedmTribalRuntimeEngine.getStats();
      expect(r.considered).toBe(stats.totalTipsLoaded);
    });

    it("records matched keywords on each ScoredTip", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire"],
        maxResults: 2,
      });
      expect(r.tips[0].matchedKeywords.length).toBeGreaterThan(0);
    });

    it("returns latencyMs in the response", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire"],
      });
      expect(r.latencyMs).toBeGreaterThanOrEqual(0);
      expect(r.latencyMs).toBeLessThan(200);
    });

    it("filters out tips whose operation_types do not match requested operation", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire"],
        operation: "nonexistent_operation_xyz",
        maxResults: 20,
      });
      expect(r.tips.length).toBe(0);
    });

    it("includes tips whose operation_types match wire_edm", () => {
      const r = wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire", "break"],
        operation: "wire_edm",
        maxResults: 5,
      });
      expect(r.tips.length).toBeGreaterThan(0);
    });
  });

  describe("usage tracking & feedback", () => {
    it("increments usage on served tips", () => {
      const before = wedmTribalRuntimeEngine.getStats().totalServed;
      wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire"],
        maxResults: 3,
      });
      const after = wedmTribalRuntimeEngine.getStats().totalServed;
      expect(after - before).toBeGreaterThanOrEqual(1);
    });

    it("totalSelections increments each call", () => {
      const before = wedmTribalRuntimeEngine.getStats().totalSelections;
      wedmTribalRuntimeEngine.select({ dispatcher: "edm", action: "a", keywords: ["x"] });
      wedmTribalRuntimeEngine.select({ dispatcher: "edm", action: "b", keywords: ["x"] });
      const after = wedmTribalRuntimeEngine.getStats().totalSelections;
      expect(after - before).toBe(2);
    });

    it("uniqueActionsSeen grows with distinct action pairs", () => {
      wedmTribalRuntimeEngine.select({ dispatcher: "edm", action: "a", keywords: ["wire"] });
      wedmTribalRuntimeEngine.select({ dispatcher: "edm", action: "a", keywords: ["wire"] });
      wedmTribalRuntimeEngine.select({ dispatcher: "cam", action: "b", keywords: ["edm"] });
      const s = wedmTribalRuntimeEngine.getStats();
      expect(s.uniqueActionsSeen).toBe(2);
    });

    it("topTipsByUse reflects served tips", () => {
      wedmTribalRuntimeEngine.select({
        dispatcher: "edm",
        action: "a",
        keywords: ["wire", "break", "corner"],
        maxResults: 1,
      });
      const s = wedmTribalRuntimeEngine.getStats();
      const topWithUses = s.topTipsByUse.filter((t) => t.count > 0);
      expect(topWithUses.length).toBeGreaterThan(0);
    });
  });
});
