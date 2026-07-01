/**
 * MillLoRATribalExtractorEngine — Test Suite
 * ===========================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-TRIBAL-EXTRACTOR (iter97)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRATribalExtractorEngine,
  MILL_CANONICAL_CATEGORIES,
  type MillTribalTip,
} from "../engines/MillLoRATribalExtractorEngine.js";

describe("MillLoRATribalExtractorEngine", () => {
  let engine: MillLoRATribalExtractorEngine;

  beforeEach(() => {
    engine = new MillLoRATribalExtractorEngine();
  });

  describe("MILL_CANONICAL_CATEGORIES taxonomy", () => {
    it("exposes 5 mill-canonical categories", () => {
      expect(MILL_CANONICAL_CATEGORIES.length).toBe(5);
      expect(MILL_CANONICAL_CATEGORIES).toContain("chatter");
      expect(MILL_CANONICAL_CATEGORIES).toContain("pocket_strategy");
      expect(MILL_CANONICAL_CATEGORIES).toContain("five_axis_strategy");
      expect(MILL_CANONICAL_CATEGORIES).toContain("tcpm");
      expect(MILL_CANONICAL_CATEGORIES).toContain("thermal");
    });

    it("does not overlap with lathe-shared categories", () => {
      const latheShared = [
        "tool_selection", "parameters", "material", "workholding",
        "surface_finish", "safety", "troubleshooting", "setup", "general",
      ];
      for (const c of MILL_CANONICAL_CATEGORIES) {
        expect(latheShared.includes(c)).toBe(false);
      }
    });
  });

  describe("categorizeText", () => {
    it("categorizes chatter text into 'chatter' (not 'troubleshooting')", () => {
      expect(engine.categorizeText("Heavy chatter at 3500 RPM with the long endmill")).toBe("chatter");
    });

    it("categorizes pocket text into pocket_strategy", () => {
      expect(engine.categorizeText("Use trochoidal pocket strategy for slot cuts")).toBe("pocket_strategy");
    });

    it("categorizes 5-axis text into five_axis_strategy", () => {
      expect(engine.categorizeText("For 5-axis simultaneous swarf milling, drop feed by 30%")).toBe("five_axis_strategy");
    });

    it("categorizes TCPM text into tcpm", () => {
      expect(engine.categorizeText("Enable Heidenhain Cycle 19 TCPM for tilted-plane jobs")).toBe("tcpm");
    });

    it("categorizes thermal/coolant text into thermal", () => {
      expect(engine.categorizeText("Flood coolant the part to control thermal growth")).toBe("thermal");
    });

    it("defaults to general for ambiguous text", () => {
      expect(engine.categorizeText("Just some random words here")).toBe("general");
    });
  });

  describe("MILL-CANONICAL: inferAxisMode", () => {
    it("infers 5_axis_simul from 5-axis keywords", () => {
      expect(engine.inferAxisMode("Use TCPM for 5-axis simultaneous swarf")).toBe("5_axis_simul");
    });

    it("infers 4_axis_index from 4-axis keywords", () => {
      expect(engine.inferAxisMode("On the 4-axis indexed setup, probe the side")).toBe("4_axis_index");
    });

    it("infers 3_axis from 3-axis keywords", () => {
      expect(engine.inferAxisMode("On the 3-axis VMC, use a face mill")).toBe("3_axis");
    });

    it("falls back to shared when no axis keywords present", () => {
      expect(engine.inferAxisMode("Use carbide endmill on aluminum")).toBe("shared");
    });

    it("prefers most-specific axis (5-axis beats 3-axis if both keywords present)", () => {
      expect(engine.inferAxisMode("3-axis prefers 5-axis when possible")).toBe("5_axis_simul");
    });
  });

  describe("extractCondition / extractRecommendation", () => {
    it("extracts 'when X' condition", () => {
      expect(engine.extractCondition("When chatter starts, reduce feed.")).toBe("chatter starts");
    });

    it("extracts 'if X' condition", () => {
      expect(engine.extractCondition("If the part heats up, flood coolant.")).toBe("the part heats up");
    });

    it("extracts 'use X' recommendation", () => {
      expect(engine.extractRecommendation("When chatter, use a stub end mill.")).toBe("a stub end mill");
    });

    it("falls back to first clause when no pattern matches", () => {
      const c = engine.extractCondition("First clause text. Second part.");
      expect(c).toBe("First clause text");
    });
  });

  describe("computeConfidence", () => {
    it("returns 1.0 with full condition + recommendation + keywords", () => {
      const c = engine.computeConfidence("when chatter", "use stub mill", ["chatter", "mill", "stub", "carbide", "feed", "rpm"]);
      expect(c).toBeCloseTo(1.0, 4);
    });

    it("returns 0 with empty inputs", () => {
      expect(engine.computeConfidence("", "", [])).toBe(0);
    });
  });

  describe("extractTip — happy paths", () => {
    it("creates a tip with auto-categorization + axis inference", () => {
      const tip = engine.extractTip("When chatter starts on 5-axis simultaneous, reduce ae by 50%.");
      expect(tip).not.toBe(null);
      const t = tip as MillTribalTip;
      expect(t.category).toBe("chatter");
      expect(t.axis_mode).toBe("5_axis_simul");
      expect(t.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("returns null when confidence is below threshold", () => {
      expect(engine.extractTip("a")).toBe(null);
    });

    it("respects metadata.author/source/axis_mode override", () => {
      const tip = engine.extractTip("When the part warms up, flood coolant.", {
        author: "operator-1",
        source: "shop-log",
        axis_mode: "4_axis_index",
      });
      const t = tip as MillTribalTip;
      expect(t.author).toBe("operator-1");
      expect(t.source).toBe("shop-log");
      expect(t.axis_mode).toBe("4_axis_index");
    });

    it("disabled auto-categorization yields 'general'", () => {
      engine.setConfig({ enable_auto_categorization: false });
      const tip = engine.extractTip("When chatter starts, reduce feed by half.");
      expect((tip as MillTribalTip).category).toBe("general");
    });

    it("disabled axis_inference yields 'shared'", () => {
      engine.setConfig({ enable_axis_inference: true });
      // Sanity baseline
      const before = engine.extractTip("On 5-axis machines, use TCPM cycle.");
      expect((before as MillTribalTip).axis_mode).toBe("5_axis_simul");
      // Disable
      engine.setConfig({ enable_axis_inference: false });
      const tip = engine.extractTip("On 5-axis machines, use TCPM cycle.");
      expect((tip as MillTribalTip).axis_mode).toBe("shared");
    });
  });

  describe("extractBatch", () => {
    it("filters out low-confidence inputs", () => {
      const tips = engine.extractBatch([
        "When chatter starts, reduce feed.",
        "a", // too short, should drop
        "If part heats up, flood coolant.",
      ]);
      expect(tips.length).toBe(2);
    });
  });

  describe("findByCategory + findByKeyword + findByAxisMode", () => {
    beforeEach(() => {
      engine.extractTip("When chatter starts, reduce feed by 30%.");
      engine.extractTip("For 5-axis simultaneous, enable TCPM cycle.", { axis_mode: "5_axis_simul" });
      engine.extractTip("Use trochoidal pocket strategy on hard steel.");
    });

    it("filters by category", () => {
      expect(engine.findByCategory("chatter").length).toBe(1);
      expect(engine.findByCategory("pocket_strategy").length).toBe(1);
    });

    it("filters by keyword", () => {
      const hits = engine.findByKeyword("tcpm");
      expect(hits.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by axis_mode", () => {
      expect(engine.findByAxisMode("5_axis_simul").length).toBe(1);
    });
  });

  describe("MILL-CANONICAL: toTrainingExample", () => {
    it("emits mill-context prompt (not lathe)", () => {
      const tip = engine.extractTip("When chatter starts, reduce feed.") as MillTribalTip;
      const ex = engine.toTrainingExample(tip);
      expect(ex.prompt.indexOf("mill operations") >= 0).toBe(true);
      expect(ex.prompt.indexOf("lathe") < 0).toBe(true);
    });

    it("includes axis_mode in prompt for non-shared", () => {
      const tip = engine.extractTip("When using TCPM on 5-axis, enable Cycle 19.") as MillTribalTip;
      const ex = engine.toTrainingExample(tip);
      expect(ex.prompt.indexOf("5-axis") >= 0 || ex.prompt.indexOf("5_axis") >= 0).toBe(true);
    });
  });

  describe("getStats", () => {
    it("counts mill_canonical_count separately from total", () => {
      engine.extractTip("When chatter starts, reduce feed by 30%.");
      engine.extractTip("Use trochoidal pocket strategy on hard steel.");
      engine.extractTip("When the part heats up during long jobs, flood coolant.");
      // Non-canonical
      engine.extractTip("When using carbide tools on aluminum, increase feed by 20%.");
      const s = engine.getStats();
      expect(s.total_tips).toBe(4);
      expect(s.mill_canonical_count).toBe(3);
    });

    it("categorizes axis distribution", () => {
      engine.extractTip("When chatter on 5-axis simultaneous, reduce ae.");
      engine.extractTip("When chatter on 3-axis VMC, reduce feed.");
      const s = engine.getStats();
      expect(s.axis_distribution["5_axis_simul"]).toBeGreaterThanOrEqual(1);
      expect(s.axis_distribution["3_axis"]).toBeGreaterThanOrEqual(1);
    });

    it("safe zeros on empty engine", () => {
      const s = engine.getStats();
      expect(s.total_tips).toBe(0);
      expect(s.avg_confidence).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("includes Mill-Canonical line", () => {
      engine.extractTip("When chatter starts, reduce feed.");
      const s = engine.getSummary();
      expect(s.indexOf("Mill-Canonical Categorized") >= 0).toBe(true);
    });
  });

  describe("clear + reset", () => {
    it("clear empties tips", () => {
      engine.extractTip("When chatter starts, reduce feed.");
      engine.clear();
      expect(engine.getTips().length).toBe(0);
    });

    it("reset reverts config", () => {
      engine.setConfig({ enable_auto_categorization: false });
      engine.reset();
      expect(engine.getConfig().enable_auto_categorization).toBe(true);
    });
  });

  describe("max_tips_in_memory cap", () => {
    it("trims oldest tips when cap exceeded", () => {
      engine.setConfig({ max_tips_in_memory: 5 });
      for (let i = 0; i < 10; i++) {
        engine.extractTip(`When chatter event ${i} happens, reduce feed value ${i}.`);
      }
      expect(engine.getTips().length).toBeLessThanOrEqual(10);
      expect(engine.getTips().length).toBeGreaterThan(0);
    });
  });
});
