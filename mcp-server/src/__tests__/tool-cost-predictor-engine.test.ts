import { describe, it, expect } from "vitest";
import { ToolCostPredictorEngine } from "../engines/ToolCostPredictorEngine.js";
import * as path from "path";

describe("ToolCostPredictorEngine", () => {
  const engine = new ToolCostPredictorEngine();

  describe("predict Read", () => {
    it("predicts cost for existing file", () => {
      const thisFile = path.resolve(__dirname, "tool-cost-predictor-engine.test.ts");
      const p = engine.predict("Read", { file_path: thisFile });
      expect(p.tool).toBe("Read");
      expect(p.estimatedTotal).toBeGreaterThan(0);
      expect(p.confidence).toBe("high");
    });

    it("returns low confidence for missing file", () => {
      const p = engine.predict("Read", { file_path: "/nonexistent.ts" });
      expect(p.confidence).toBe("low");
      expect(p.estimatedTotal).toBeGreaterThan(0);
    });

    it("reduces estimate with limit param", () => {
      const thisFile = path.resolve(__dirname, "tool-cost-predictor-engine.test.ts");
      const full = engine.predict("Read", { file_path: thisFile });
      const limited = engine.predict("Read", { file_path: thisFile, limit: 10 });
      expect(limited.estimatedOutputTokens).toBeLessThanOrEqual(full.estimatedOutputTokens);
    });
  });

  describe("predict Grep", () => {
    it("predicts content mode cost", () => {
      const p = engine.predict("Grep", { pattern: "foo", output_mode: "content", path: "/src" });
      expect(p.tool).toBe("Grep");
      expect(p.estimatedTotal).toBeGreaterThan(0);
    });

    it("predicts higher cost without path", () => {
      const scoped = engine.predict("Grep", { pattern: "foo", output_mode: "content", path: "/src" });
      const unscoped = engine.predict("Grep", { pattern: "foo", output_mode: "content" });
      expect(unscoped.estimatedOutputTokens).toBeGreaterThan(scoped.estimatedOutputTokens);
    });

    it("predicts count mode as cheap", () => {
      const p = engine.predict("Grep", { pattern: "foo", output_mode: "count" });
      expect(p.estimatedOutputTokens).toBeLessThan(200);
      expect(p.confidence).toBe("high");
    });
  });

  describe("predict Glob", () => {
    it("flags broad patterns", () => {
      const p = engine.predict("Glob", { pattern: "**/*" });
      expect(p.estimatedOutputTokens).toBeGreaterThan(1000);
    });

    it("reduces estimate with scoped path", () => {
      const broad = engine.predict("Glob", { pattern: "**/*.ts" });
      const scoped = engine.predict("Glob", { pattern: "**/*.ts", path: "/src" });
      expect(scoped.estimatedOutputTokens).toBeLessThanOrEqual(broad.estimatedOutputTokens);
    });
  });

  describe("predict Edit", () => {
    it("scales with content size", () => {
      const small = engine.predict("Edit", { old_string: "a", new_string: "b" });
      const large = engine.predict("Edit", { old_string: "a".repeat(1000), new_string: "b".repeat(1000) });
      expect(large.estimatedTotal).toBeGreaterThan(small.estimatedTotal);
    });
  });

  describe("predict Agent", () => {
    it("returns high estimates", () => {
      const p = engine.predict("Agent", { prompt: "Find all exported functions" });
      expect(p.estimatedTotal).toBeGreaterThan(2000);
      expect(p.confidence).toBe("low");
    });
  });

  describe("predict Bash", () => {
    it("detects piped output limiting", () => {
      const p = engine.predict("Bash", { command: "git log | head -5" });
      expect(p.confidence).toBe("high");
      expect(p.estimatedOutputTokens).toBeLessThan(500);
    });

    it("estimates git commands", () => {
      const p = engine.predict("Bash", { command: "git status" });
      expect(p.estimatedOutputTokens).toBe(500);
    });
  });

  describe("isAffordable", () => {
    it("returns true when budget allows", () => {
      const result = engine.isAffordable("Grep", { pattern: "foo" }, 50000);
      expect(result.affordable).toBe(true);
      expect(result.budgetAfter).toBeGreaterThan(0);
    });

    it("returns false when budget depleted", () => {
      const result = engine.isAffordable("Agent", { prompt: "big query" }, 100);
      expect(result.affordable).toBe(false);
    });
  });

  describe("oneLiner", () => {
    it("returns compact prediction", () => {
      const line = engine.oneLiner("Read", { file_path: "/nonexistent.ts" });
      expect(line).toContain("Read:");
      expect(line).toContain("tokens");
    });
  });

  describe("default prediction", () => {
    it("handles unknown tools", () => {
      const p = engine.predict("UnknownTool", {});
      expect(p.confidence).toBe("low");
      expect(p.estimatedTotal).toBeGreaterThan(0);
    });
  });
});
