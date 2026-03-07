import { describe, it, expect } from "vitest";
import { CompactionStrategyEngine } from "../engines/CompactionStrategyEngine.js";
import type { ContentBlock } from "../engines/CompactionStrategyEngine.js";

describe("CompactionStrategyEngine", () => {
  const engine = new CompactionStrategyEngine();

  describe("plan", () => {
    it("keeps everything within budget", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "active-edit", tokens: 100, age: 0, importance: 5 },
        { id: "2", category: "recent-read", tokens: 100, age: 0, importance: 3 },
      ];
      const plan = engine.plan(blocks, 1000);
      expect(plan.keep.length).toBe(2);
      expect(plan.drop.length).toBe(0);
    });

    it("drops low-priority content when over budget", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "active-edit", tokens: 300, age: 0, importance: 5 },
        { id: "2", category: "stale-read", tokens: 500, age: 3000, importance: 0 },
        { id: "3", category: "tool-output", tokens: 500, age: 1000, importance: 0 },
      ];
      const plan = engine.plan(blocks, 800);
      expect(plan.keep.length).toBeGreaterThan(0);
      expect(plan.drop.length).toBeGreaterThan(0);
      expect(plan.keep.some((b) => b.id === "1")).toBe(true);
    });

    it("compresses medium-priority content", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "active-edit", tokens: 400, age: 0, importance: 5 },
        { id: "2", category: "recent-read", tokens: 400, age: 60, importance: 3 },
        { id: "3", category: "error-context", tokens: 400, age: 30, importance: 4 },
      ];
      const plan = engine.plan(blocks, 800);
      expect(plan.compress.length).toBeGreaterThan(0);
    });

    it("calculates saved tokens", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "stale-read", tokens: 1000, age: 3600, importance: 0 },
      ];
      const plan = engine.plan(blocks, 100);
      expect(plan.savedTokens).toBeGreaterThan(0);
    });
  });

  describe("categorize", () => {
    it("categorizes Edit as active-edit", () => {
      expect(engine.categorize("content", "Edit")).toBe("active-edit");
    });

    it("categorizes fresh Read as recent-read", () => {
      expect(engine.categorize("content", "Read", 60)).toBe("recent-read");
    });

    it("categorizes old Read as stale-read", () => {
      expect(engine.categorize("content", "Read", 600)).toBe("stale-read");
    });

    it("categorizes Bash as tool-output", () => {
      expect(engine.categorize("content", "Bash")).toBe("tool-output");
    });

    it("detects error context", () => {
      expect(engine.categorize("Error: something failed")).toBe("error-context");
    });
  });

  describe("estimateSavings", () => {
    it("estimates potential savings", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "active-edit", tokens: 500, age: 0, importance: 5 },
        { id: "2", category: "stale-read", tokens: 5000, age: 3600, importance: 0 },
      ];
      const savings = engine.estimateSavings(blocks, 1000);
      expect(savings.canSave).toBeGreaterThan(0);
      expect(savings.percent).toBeGreaterThan(0);
    });
  });

  describe("recommend", () => {
    it("produces compact recommendation", () => {
      const blocks: ContentBlock[] = [
        { id: "1", category: "active-edit", tokens: 200, age: 0, importance: 5 },
      ];
      const rec = engine.recommend(blocks, 1000);
      expect(rec).toContain("Compaction");
      expect(rec).toContain("keep");
    });
  });
});
