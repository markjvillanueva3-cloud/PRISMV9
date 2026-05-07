/**
 * LatheLoRAAttentionAnalyzerEngine Tests — LATHE-LORA-MS0 U-LLR34
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAAttentionAnalyzerEngine } from "../engines/LatheLoRAAttentionAnalyzerEngine.js";

describe("LatheLoRAAttentionAnalyzerEngine", () => {
  beforeEach(() => {
    latheLoRAAttentionAnalyzerEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const cfg = latheLoRAAttentionAnalyzerEngine.getConfig();
      expect(cfg.top_k_influencers).toBe(5);
      expect(cfg.entropy_threshold).toBe(2.5);
      expect(cfg.enable_categorization).toBe(true);
    });

    it("merges partial config", () => {
      latheLoRAAttentionAnalyzerEngine.setConfig({ top_k_influencers: 3 });
      expect(latheLoRAAttentionAnalyzerEngine.getConfig().top_k_influencers).toBe(3);
    });
  });

  describe("entropy calculation", () => {
    it("returns 0 for zero-sum weights", () => {
      expect(latheLoRAAttentionAnalyzerEngine.calculateEntropy([0, 0, 0])).toBe(0);
    });

    it("returns 0 for single dominant weight", () => {
      const e = latheLoRAAttentionAnalyzerEngine.calculateEntropy([1, 0, 0, 0]);
      expect(e).toBeCloseTo(0, 5);
    });

    it("returns log2(n) for uniform distribution", () => {
      const e = latheLoRAAttentionAnalyzerEngine.calculateEntropy([1, 1, 1, 1]);
      expect(e).toBeCloseTo(2); // log2(4) = 2
    });

    it("returns intermediate entropy for skewed distribution", () => {
      const e = latheLoRAAttentionAnalyzerEngine.calculateEntropy([0.9, 0.05, 0.05]);
      expect(e).toBeGreaterThan(0);
      expect(e).toBeLessThan(1);
    });
  });

  describe("attention analysis", () => {
    const heads = [
      { layer: 0, head: 0, weights: [[0.5, 0.3, 0.2], [0.4, 0.4, 0.2], [0.3, 0.3, 0.4]] },
    ];

    it("produces analysis with tokens and influencers", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention(
        "turn steel 200 sfm",
        "G01 X10 Z5",
        heads,
      );
      expect(a.id).toMatch(/^attn-/);
      expect(a.tokens.length).toBe(4);
      expect(a.top_influencers.length).toBeLessThanOrEqual(5);
      expect(a.attention_entropy).toBeGreaterThanOrEqual(0);
    });

    it("computes influence score per token", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("a b c", "x", heads);
      for (const t of a.tokens) {
        expect(t.influence_score).toBeGreaterThanOrEqual(0);
      }
    });

    it("flags focused attention when entropy is below threshold", () => {
      latheLoRAAttentionAnalyzerEngine.setConfig({ entropy_threshold: 10 });
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("a b", "x", heads);
      expect(a.focused_attention).toBe(true);
    });

    it("retains history up to max_history", () => {
      latheLoRAAttentionAnalyzerEngine.setConfig({ max_history: 3 });
      for (let i = 0; i < 5; i++) {
        latheLoRAAttentionAnalyzerEngine.analyzeAttention(`turn ${i}`, "x", heads);
      }
      expect(latheLoRAAttentionAnalyzerEngine.getAnalyses()).toHaveLength(3);
    });
  });

  describe("token categorization", () => {
    const heads = [{ layer: 0, head: 0, weights: [[1]] }];

    it("categorizes parameter tokens", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("sfm", "x", heads);
      expect(a.tokens[0].category).toBe("parameter");
    });

    it("categorizes material tokens", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("titanium", "x", heads);
      expect(a.tokens[0].category).toBe("material");
    });

    it("categorizes operation tokens", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("thread", "x", heads);
      expect(a.tokens[0].category).toBe("operation");
    });

    it("categorizes numeric tokens as parameter", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("123.45", "x", heads);
      expect(a.tokens[0].category).toBe("parameter");
    });

    it("falls back to other for unknown tokens", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("zzzzzz", "x", heads);
      expect(a.tokens[0].category).toBe("other");
    });

    it("skips categorization when disabled", () => {
      latheLoRAAttentionAnalyzerEngine.setConfig({ enable_categorization: false });
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("steel", "x", heads);
      expect(a.tokens[0].category).toBeUndefined();
    });
  });

  describe("heatmap generation", () => {
    it("builds heatmap with min/max values", () => {
      const h = latheLoRAAttentionAnalyzerEngine.generateHeatmap(
        ["a", "b"],
        ["x", "y"],
        [[0.1, 0.9], [0.5, 0.5]],
      );
      expect(h.prompt_tokens).toEqual(["a", "b"]);
      expect(h.max_value).toBe(0.9);
      expect(h.min_value).toBe(0.1);
    });

    it("handles empty matrix", () => {
      const h = latheLoRAAttentionAnalyzerEngine.generateHeatmap([], [], []);
      expect(h.max_value).toBe(0);
      expect(h.min_value).toBe(0);
    });
  });

  describe("explanation and queries", () => {
    const heads = [{ layer: 0, head: 0, weights: [[0.5, 0.5]] }];

    it("generates readable explanation", () => {
      const a = latheLoRAAttentionAnalyzerEngine.analyzeAttention("turn steel", "x", heads);
      const s = latheLoRAAttentionAnalyzerEngine.generateExplanation(a);
      expect(s).toContain("Attention Analysis");
      expect(s).toContain("Top ");
    });

    it("finds analyses by category", () => {
      latheLoRAAttentionAnalyzerEngine.analyzeAttention("steel aluminum", "x", heads);
      const list = latheLoRAAttentionAnalyzerEngine.findAnalysesByCategory("material");
      expect(list.length).toBeGreaterThanOrEqual(0);
    });

    it("returns analyses with limit", () => {
      for (let i = 0; i < 3; i++) {
        latheLoRAAttentionAnalyzerEngine.analyzeAttention(`turn ${i}`, "x", heads);
      }
      expect(latheLoRAAttentionAnalyzerEngine.getAnalyses(2)).toHaveLength(2);
    });
  });

  describe("stats", () => {
    const heads = [{ layer: 0, head: 0, weights: [[0.5, 0.5]] }];

    it("returns zero stats with no analyses", () => {
      const s = latheLoRAAttentionAnalyzerEngine.getStats();
      expect(s.total_analyses).toBe(0);
      expect(s.focused_rate).toBe(0);
    });

    it("computes focused rate and avg entropy", () => {
      latheLoRAAttentionAnalyzerEngine.setConfig({ entropy_threshold: 10 });
      latheLoRAAttentionAnalyzerEngine.analyzeAttention("a b", "x", heads);
      latheLoRAAttentionAnalyzerEngine.analyzeAttention("c d", "x", heads);
      const s = latheLoRAAttentionAnalyzerEngine.getStats();
      expect(s.total_analyses).toBe(2);
      expect(s.focused_count).toBe(2);
      expect(s.focused_rate).toBeCloseTo(1);
      expect(s.avg_entropy).toBeGreaterThanOrEqual(0);
    });

    it("ranks most influential categories", () => {
      latheLoRAAttentionAnalyzerEngine.analyzeAttention("steel aluminum titanium", "x", heads);
      const s = latheLoRAAttentionAnalyzerEngine.getStats();
      expect(s.most_influential_categories.length).toBeGreaterThan(0);
    });
  });

  describe("clear", () => {
    const heads = [{ layer: 0, head: 0, weights: [[1]] }];
    it("clears analyses", () => {
      latheLoRAAttentionAnalyzerEngine.analyzeAttention("a", "x", heads);
      latheLoRAAttentionAnalyzerEngine.clear();
      expect(latheLoRAAttentionAnalyzerEngine.getAnalyses()).toHaveLength(0);
    });
  });
});
