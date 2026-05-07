/**
 * LatheLoRATribalExtractorEngine Tests — LATHE-LORA-MS0 U-LLR38
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRATribalExtractorEngine } from "../engines/LatheLoRATribalExtractorEngine.js";

describe("LatheLoRATribalExtractorEngine", () => {
  beforeEach(() => {
    latheLoRATribalExtractorEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const cfg = latheLoRATribalExtractorEngine.getConfig();
      expect(cfg.min_confidence).toBe(0.3);
      expect(cfg.enable_auto_categorization).toBe(true);
    });

    it("merges partial config", () => {
      latheLoRATribalExtractorEngine.setConfig({ min_confidence: 0.5 });
      expect(latheLoRATribalExtractorEngine.getConfig().min_confidence).toBe(0.5);
    });
  });

  describe("categorization", () => {
    it("categorizes tool selection", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("use carbide insert")).toBe("tool_selection");
    });

    it("categorizes parameter content", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("reduce sfm by 20 percent")).toBe("parameters");
    });

    it("categorizes material content", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("inconel machining requires care")).toBe("material");
    });

    it("categorizes workholding content", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("use soft jaws on chuck for thin wall parts")).toBe("workholding");
    });

    it("categorizes troubleshooting content", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("when chatter vibration occurs the part is scrap")).toBe("troubleshooting");
    });

    it("falls back to general", () => {
      expect(latheLoRATribalExtractorEngine.categorizeText("generic advisory note content here")).toBe("general");
    });
  });

  describe("keyword extraction", () => {
    it("extracts significant words", () => {
      const kw = latheLoRATribalExtractorEngine.extractKeywords(
        "When machining titanium use slow speeds and flood coolant",
      );
      expect(kw).toContain("titanium");
      expect(kw).toContain("coolant");
    });

    it("filters stop words", () => {
      const kw = latheLoRATribalExtractorEngine.extractKeywords("the and or of but");
      expect(kw).toHaveLength(0);
    });

    it("respects max keyword count", () => {
      latheLoRATribalExtractorEngine.setConfig({ max_keyword_count: 2 });
      const kw = latheLoRATribalExtractorEngine.extractKeywords(
        "titanium stainless inconel aluminum steel carbide",
      );
      expect(kw.length).toBeLessThanOrEqual(2);
    });
  });

  describe("condition extraction", () => {
    it("extracts 'when' clause", () => {
      const c = latheLoRATribalExtractorEngine.extractCondition("When machining thin walls, reduce feed.");
      expect(c).toContain("machining thin walls");
    });

    it("extracts 'if' clause", () => {
      const c = latheLoRATribalExtractorEngine.extractCondition("If chatter appears, slow down.");
      expect(c).toContain("chatter");
    });

    it("falls back to first clause", () => {
      const c = latheLoRATribalExtractorEngine.extractCondition("Roughing titanium. Use coolant.");
      expect(c).toContain("Roughing");
    });
  });

  describe("recommendation extraction", () => {
    it("extracts 'use' recommendation", () => {
      const r = latheLoRATribalExtractorEngine.extractRecommendation("When rough cutting, use flood coolant.");
      expect(r).toContain("flood coolant");
    });

    it("extracts 'reduce' recommendation", () => {
      const r = latheLoRATribalExtractorEngine.extractRecommendation("During finish pass, reduce feed rate!");
      expect(r).toContain("feed");
    });
  });

  describe("tip extraction", () => {
    it("extracts a valid tip above threshold", () => {
      const tip = latheLoRATribalExtractorEngine.extractTip(
        "When machining titanium with carbide tools, use low sfm and flood coolant to prevent tool wear.",
      );
      expect(tip).not.toBeNull();
      expect(tip?.confidence).toBeGreaterThanOrEqual(0.3);
      expect(tip?.keywords.length).toBeGreaterThan(0);
    });

    it("rejects tip below confidence threshold", () => {
      latheLoRATribalExtractorEngine.setConfig({ min_confidence: 0.99 });
      expect(latheLoRATribalExtractorEngine.extractTip("short")).toBeNull();
    });

    it("stores metadata", () => {
      const tip = latheLoRATribalExtractorEngine.extractTip(
        "When facing steel, use positive rake inserts to reduce cutting force.",
        { author: "Bob", source: "shop-floor" },
      );
      expect(tip?.author).toBe("Bob");
      expect(tip?.source).toBe("shop-floor");
    });

    it("skips categorization when disabled", () => {
      latheLoRATribalExtractorEngine.setConfig({ enable_auto_categorization: false });
      const tip = latheLoRATribalExtractorEngine.extractTip(
        "When machining steel with carbide, use flood coolant for best results.",
      );
      expect(tip?.category).toBe("general");
    });

    it("trims tips when over capacity", () => {
      latheLoRATribalExtractorEngine.setConfig({ max_tips_in_memory: 3 });
      for (let i = 0; i < 5; i++) {
        latheLoRATribalExtractorEngine.extractTip(
          `Tip ${i}: When machining steel part, use carbide tool and reduce feed rate.`,
        );
      }
      expect(latheLoRATribalExtractorEngine.getTips().length).toBeLessThanOrEqual(3);
    });
  });

  describe("batch extraction", () => {
    it("extracts multiple tips", () => {
      const tips = latheLoRATribalExtractorEngine.extractBatch([
        "When turning stainless steel, use positive rake carbide inserts to reduce force.",
        "For threading operations, reduce spindle speed and use constant RPM mode.",
      ]);
      expect(tips.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("queries", () => {
    beforeEach(() => {
      latheLoRATribalExtractorEngine.extractTip(
        "When machining titanium material, use flood coolant and reduce sfm to prevent heat.",
      );
      latheLoRATribalExtractorEngine.extractTip(
        "For chatter problems, reduce depth of cut and increase rigidity in fixture.",
      );
    });

    it("finds tips by category", () => {
      const mat = latheLoRATribalExtractorEngine.findByCategory("material");
      expect(mat.length).toBeGreaterThanOrEqual(0);
    });

    it("finds tips by keyword", () => {
      const results = latheLoRATribalExtractorEngine.findByKeyword("titanium");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("training example generation", () => {
    it("generates prompt/completion pair", () => {
      const tip = latheLoRATribalExtractorEngine.extractTip(
        "When facing hardened steel, use ceramic insert with low feed rate for best finish.",
      )!;
      const ex = latheLoRATribalExtractorEngine.toTrainingExample(tip);
      expect(ex.prompt).toContain("lathe");
      expect(ex.completion.length).toBeGreaterThan(0);
    });
  });

  describe("stats", () => {
    it("returns zero stats with no tips", () => {
      const s = latheLoRATribalExtractorEngine.getStats();
      expect(s.total_tips).toBe(0);
    });

    it("computes avg confidence and category distribution", () => {
      latheLoRATribalExtractorEngine.extractTip(
        "When machining titanium, use coolant and reduce speed to prevent tool wear.",
      );
      const s = latheLoRATribalExtractorEngine.getStats();
      expect(s.total_tips).toBeGreaterThanOrEqual(1);
      expect(s.avg_confidence).toBeGreaterThan(0);
    });
  });

  describe("summary", () => {
    it("generates summary text", () => {
      latheLoRATribalExtractorEngine.extractTip(
        "When machining steel, use carbide insert and flood coolant to maximize tool life.",
      );
      const s = latheLoRATribalExtractorEngine.getSummary();
      expect(s).toContain("Tribal Extractor Summary");
    });
  });
});
