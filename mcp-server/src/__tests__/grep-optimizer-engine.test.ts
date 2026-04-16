import { describe, it, expect } from "vitest";
import { GrepOptimizerEngine } from "../engines/GrepOptimizerEngine.js";

describe("GrepOptimizerEngine", () => {
  const engine = new GrepOptimizerEngine();

  describe("optimize", () => {
    it("suggests path for pathless searches", () => {
      const result = engine.optimize({ pattern: "foo" });
      expect(result.suggestions.some((s) => s.includes("path"))).toBe(true);
    });

    it("adds head_limit for content mode", () => {
      const result = engine.optimize({
        pattern: "foo",
        output_mode: "content",
        path: "src/",
      });
      expect(result.optimized.head_limit).toBeDefined();
    });

    it("warns about short patterns", () => {
      const result = engine.optimize({ pattern: "x", path: "src/" });
      expect(result.suggestions.some((s) => s.includes("short"))).toBe(true);
    });

    it("returns zero savings for optimal params", () => {
      const result = engine.optimize({
        pattern: "specificFunction",
        path: "src/engines/",
        output_mode: "files_with_matches",
        type: "ts",
      });
      expect(result.estimatedSavings).toBe(0);
    });
  });

  describe("suggestMode", () => {
    it("suggests files_with_matches for finding", () => {
      expect(engine.suggestMode("which file has this")).toBe("files_with_matches");
    });

    it("suggests count for counting", () => {
      expect(engine.suggestMode("how many matches")).toBe("count");
    });

    it("suggests content for code viewing", () => {
      expect(engine.suggestMode("see the code around")).toBe("content");
    });
  });

  describe("isWasteful", () => {
    it("detects unbounded content search", () => {
      const result = engine.isWasteful({ pattern: "foo", output_mode: "content" });
      expect(result.wasteful).toBe(true);
    });

    it("detects match-everything pattern", () => {
      const result = engine.isWasteful({ pattern: ".", path: "src/" });
      expect(result.wasteful).toBe(true);
    });

    it("accepts targeted searches", () => {
      const result = engine.isWasteful({
        pattern: "ToolCostPredictor",
        path: "src/",
        output_mode: "files_with_matches",
      });
      expect(result.wasteful).toBe(false);
    });
  });

  describe("estimateCost", () => {
    it("estimates lower cost for count mode", () => {
      const count = engine.estimateCost({ pattern: "foo", output_mode: "count", path: "src/" });
      const content = engine.estimateCost({ pattern: "foo", output_mode: "content", path: "src/" });
      expect(count).toBeLessThan(content);
    });

    it("doubles cost for pathless searches", () => {
      const withPath = engine.estimateCost({ pattern: "foo", path: "src/" });
      const without = engine.estimateCost({ pattern: "foo" });
      expect(without).toBe(withPath * 2);
    });
  });
});
