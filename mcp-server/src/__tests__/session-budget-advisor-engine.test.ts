import { describe, it, expect } from "vitest";
import { SessionBudgetAdvisorEngine, SessionMetrics } from "../engines/SessionBudgetAdvisorEngine.js";

describe("SessionBudgetAdvisorEngine", () => {
  const engine = new SessionBudgetAdvisorEngine();

  const baseMetrics: SessionMetrics = {
    budgetMax: 150000,
    tokensUsed: 30000,
    hookSaves: 500,
    hookBlocks: 3,
    antiPatterns: [],
    topExpensiveTool: "Read",
    topExpensiveTokens: 2000,
    toolCallCount: 15,
    efficiencyScore: 80,
  };

  describe("advise", () => {
    it("returns healthy for low usage", () => {
      const advisory = engine.advise(baseMetrics);
      expect(advisory.status).toBe("healthy");
      expect(advisory.percentUsed).toBe(20);
      expect(advisory.tokensRemaining).toBe(120000);
    });

    it("returns caution at 60%+", () => {
      const advisory = engine.advise({ ...baseMetrics, tokensUsed: 110000 });
      expect(advisory.status).toBe("caution");
      expect(advisory.recommendations.some(r => r.includes("/slim"))).toBe(true);
    });

    it("returns critical at 85%+", () => {
      const advisory = engine.advise({ ...baseMetrics, tokensUsed: 140000 });
      expect(advisory.status).toBe("critical");
      expect(advisory.recommendations.some(r => r.includes("/compact"))).toBe(true);
    });

    it("flags low efficiency", () => {
      const advisory = engine.advise({ ...baseMetrics, efficiencyScore: 40 });
      expect(advisory.recommendations.some(r => r.includes("efficiency"))).toBe(true);
    });

    it("flags anti-patterns", () => {
      const advisory = engine.advise({ ...baseMetrics, antiPatterns: ["read-edit-read", "glob-read-grep"] });
      expect(advisory.antiPatterns).toBe(2);
      expect(advisory.recommendations.some(r => r.includes("anti-pattern"))).toBe(true);
    });

    it("includes hook savings", () => {
      const advisory = engine.advise({ ...baseMetrics, hookSaves: 5000, hookBlocks: 10 });
      expect(advisory.tokensSavedByHooks).toBe(5000);
      expect(advisory.recommendations.some(r => r.includes("Hooks saved"))).toBe(true);
    });

    it("produces compact summary", () => {
      const advisory = engine.advise(baseMetrics);
      expect(advisory.compactSummary).toContain("HEALTHY");
      expect(advisory.compactSummary).toContain("20%");
    });

    it("flags expensive tools", () => {
      const advisory = engine.advise({ ...baseMetrics, topExpensiveTool: "Agent", topExpensiveTokens: 8000 });
      expect(advisory.recommendations.some(r => r.includes("Agent"))).toBe(true);
    });
  });

  describe("oneLiner", () => {
    it("returns compact status", () => {
      const line = engine.oneLiner(baseMetrics);
      expect(line).toContain("20%");
      expect(line).toContain("15 calls");
    });
  });

  describe("shouldCompact", () => {
    it("returns false for healthy", () => {
      expect(engine.shouldCompact(baseMetrics)).toBe(false);
    });

    it("returns true at 85%+", () => {
      expect(engine.shouldCompact({ ...baseMetrics, tokensUsed: 130000 })).toBe(true);
    });
  });

  describe("estimateCapacity", () => {
    it("estimates remaining operations", () => {
      const cap = engine.estimateCapacity(100000);
      expect(cap.reads).toBe(50);
      expect(cap.greps).toBe(200);
      expect(cap.agents).toBe(20);
    });
  });
});
