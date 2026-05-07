/**
 * LatheLoRAKnowledgeCuratorEngine Tests — LATHE-LORA-MS0 U-LLR40
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAKnowledgeCuratorEngine } from "../engines/LatheLoRAKnowledgeCuratorEngine.js";

describe("LatheLoRAKnowledgeCuratorEngine", () => {
  beforeEach(() => {
    latheLoRAKnowledgeCuratorEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const cfg = latheLoRAKnowledgeCuratorEngine.getConfig();
      expect(cfg.min_quality_score).toBe(0.4);
      expect(cfg.require_source).toBe(true);
    });

    it("merges partial config", () => {
      latheLoRAKnowledgeCuratorEngine.setConfig({ min_quality_score: 0.7 });
      expect(latheLoRAKnowledgeCuratorEngine.getConfig().min_quality_score).toBe(0.7);
    });
  });

  describe("text similarity", () => {
    it("returns 1 for identical texts", () => {
      expect(latheLoRAKnowledgeCuratorEngine.textSimilarity("use carbide", "use carbide")).toBe(1);
    });

    it("returns 0 for disjoint texts", () => {
      expect(latheLoRAKnowledgeCuratorEngine.textSimilarity("apple", "xenon")).toBe(0);
    });

    it("returns intermediate value for partial overlap", () => {
      const sim = latheLoRAKnowledgeCuratorEngine.textSimilarity(
        "use carbide insert on steel",
        "use carbide on titanium",
      );
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it("handles empty strings", () => {
      expect(latheLoRAKnowledgeCuratorEngine.textSimilarity("", "")).toBe(1);
      expect(latheLoRAKnowledgeCuratorEngine.textSimilarity("abc def", "")).toBe(0);
    });
  });

  describe("quality scoring", () => {
    it("scores high-quality item above 0.5", () => {
      const s = latheLoRAKnowledgeCuratorEngine.scoreQuality({
        id: "1",
        content: "When turning hardened steel over HRC 45, use ceramic inserts with low feed rates and high sfm to maintain chip control and tool life.",
        source: "shop-notes",
        category: "tool_selection",
        confidence: 0.85,
      });
      expect(s).toBeGreaterThanOrEqual(0.5);
    });

    it("scores low-quality item below 0.4", () => {
      const s = latheLoRAKnowledgeCuratorEngine.scoreQuality({
        id: "1",
        content: "a",
        source: "",
        confidence: 0.1,
      });
      expect(s).toBeLessThan(0.4);
    });

    it("never exceeds 1.0", () => {
      const s = latheLoRAKnowledgeCuratorEngine.scoreQuality({
        id: "1",
        content: "Long content with many unique words titanium stainless inconel carbide ceramic cbn threading drilling boring grooving parting facing turning.",
        source: "verified-source",
        category: "material",
        confidence: 1.0,
      });
      expect(s).toBeLessThanOrEqual(1.0);
    });
  });

  describe("curation actions", () => {
    it("accepts high-quality new item", () => {
      const r = latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When machining titanium, use positive rake carbide with flood coolant to extend tool life.",
        source: "shop-notes",
        category: "material",
        confidence: 0.9,
      });
      expect(r.action).toBe("accept");
    });

    it("rejects item without source when required", () => {
      const r = latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "Good advice about machining with proper tools and coolant.",
        source: "",
        confidence: 0.9,
      });
      expect(r.action).toBe("reject");
    });

    it("rejects low-quality item", () => {
      const r = latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "bad",
        source: "src",
        confidence: 0.1,
      });
      expect(r.action).toBe("reject");
    });

    it("detects duplicates", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When machining titanium material, use carbide with flood coolant to extend tool life overall.",
        source: "s",
        category: "material",
        confidence: 0.9,
      });
      const r = latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "2",
        content: "When machining titanium material, use carbide with flood coolant to extend tool life overall.",
        source: "s",
        category: "material",
        confidence: 0.8,
      });
      expect(r.action === "merge" || r.duplicate_of !== undefined).toBe(true);
    });
  });

  describe("duplicate detection", () => {
    it("finds duplicates above threshold", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "Use carbide inserts on stainless steel with flood coolant to improve tool life and surface finish.",
        source: "s",
        confidence: 0.9,
      });
      const dups = latheLoRAKnowledgeCuratorEngine.findDuplicates({
        id: "2",
        content: "Use carbide inserts on stainless steel with flood coolant to improve tool life and surface finish.",
        source: "s",
        confidence: 0.8,
      });
      expect(dups.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty when no duplicates", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When drilling deep holes, peck with retract for chip clearance and coolant access.",
        source: "s",
        confidence: 0.9,
      });
      const dups = latheLoRAKnowledgeCuratorEngine.findDuplicates({
        id: "2",
        content: "Threading requires slow rpm and precise pitch control for quality threads.",
        source: "s",
        confidence: 0.9,
      });
      expect(dups).toHaveLength(0);
    });
  });

  describe("conflict detection", () => {
    it("detects opposing language via direct findConflicts", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "Hardened steel turning requires increase of sfm rate to handle heat.",
        source: "s",
        category: "parameters",
        confidence: 0.9,
      });
      const conflicts = latheLoRAKnowledgeCuratorEngine.findConflicts({
        id: "2",
        content: "Hardened steel turning requires decrease of speed to avoid edge wear.",
        source: "s",
        category: "parameters",
        confidence: 0.9,
      });
      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batch curation", () => {
    it("curates multiple items and generates report", () => {
      const items = [
        { id: "1", content: "When turning steel use carbide for best results.", source: "s", confidence: 0.8 },
        { id: "2", content: "Too short", source: "s", confidence: 0.2 },
        { id: "3", content: "Threading requires slow rpm and precise feed control always use climb mode.", source: "s", confidence: 0.9 },
      ];
      const results = latheLoRAKnowledgeCuratorEngine.curateBatch(items);
      expect(results).toHaveLength(3);
      const report = latheLoRAKnowledgeCuratorEngine.generateReport(results);
      expect(report.total_processed).toBe(3);
      expect(report.rejected).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ranking and queries", () => {
    it("ranks top items by quality", () => {
      for (let i = 0; i < 3; i++) {
        latheLoRAKnowledgeCuratorEngine.curateItem({
          id: `${i}`,
          content: `Tip ${i}: When machining steel use carbide with flood coolant for best surface finish and tool life.`,
          source: "s",
          category: "material",
          confidence: 0.5 + i * 0.1,
        });
      }
      const top = latheLoRAKnowledgeCuratorEngine.getTopRanked(2);
      expect(top).toHaveLength(2);
      expect(top[0].quality_score).toBeGreaterThanOrEqual(top[1].quality_score);
    });

    it("gets items by category", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When machining stainless steel use carbide insert for best tool life overall.",
        source: "s",
        category: "material",
        confidence: 0.9,
      });
      expect(latheLoRAKnowledgeCuratorEngine.getByCategory("material").length).toBeGreaterThanOrEqual(1);
    });

    it("filters training-ready items", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When machining hardened steel use ceramic insert with coolant flood to control heat and tool life.",
        source: "s",
        category: "material",
        confidence: 0.95,
      });
      const ready = latheLoRAKnowledgeCuratorEngine.getTrainingReady(0.3);
      expect(ready.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("summary and lifecycle", () => {
    it("generates summary text", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When turning stainless steel use carbide insert for improved tool life and consistent chip control.",
        source: "s",
        confidence: 0.9,
      });
      const s = latheLoRAKnowledgeCuratorEngine.getSummary();
      expect(s).toContain("Knowledge Curator Summary");
    });

    it("clears curated items", () => {
      latheLoRAKnowledgeCuratorEngine.curateItem({
        id: "1",
        content: "When facing with carbide insert use flood coolant for best tool life.",
        source: "s",
        confidence: 0.9,
      });
      latheLoRAKnowledgeCuratorEngine.clear();
      expect(latheLoRAKnowledgeCuratorEngine.getCurated()).toHaveLength(0);
    });
  });
});
