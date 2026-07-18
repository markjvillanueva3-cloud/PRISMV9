import { describe, it, expect } from "vitest";
import { StopConditionEngine, ContextState } from "../engines/StopConditionEngine.js";

describe("StopConditionEngine", () => {
  const engine = new StopConditionEngine();

  const baseCtx: ContextState = {
    totalTokensUsed: 50000,
    maxBudget: 150000,
    recentFiles: [],
    recentGreps: [],
    toolCallCount: 10,
    sessionAgeMinutes: 5,
  };

  describe("evaluate", () => {
    it("allows normal calls", () => {
      const result = engine.evaluate("Read", { file_path: "/new.ts" }, baseCtx);
      expect(result.decision).toBe("allow");
    });

    it("blocks at budget critical (95%+)", () => {
      const ctx = { ...baseCtx, totalTokensUsed: 145000 };
      const result = engine.evaluate("Read", { file_path: "/a.ts" }, ctx);
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("Budget");
    });

    it("warns at budget high (85%+)", () => {
      const ctx = { ...baseCtx, totalTokensUsed: 130000 };
      const result = engine.evaluate("Read", { file_path: "/a.ts" }, ctx);
      expect(result.decision).toBe("warn");
    });

    it("blocks redundant reads", () => {
      const ctx = { ...baseCtx, recentFiles: ["/src/foo.ts"] };
      const result = engine.evaluate("Read", { file_path: "/src/foo.ts" }, ctx);
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("already in context");
    });

    it("blocks redundant greps", () => {
      const ctx = { ...baseCtx, recentGreps: ["export|/src"] };
      const result = engine.evaluate("Grep", { pattern: "export", path: "/src" }, ctx);
      expect(result.decision).toBe("block");
    });

    it("warns on large unbounded reads", () => {
      const result = engine.evaluate("Read", { file_path: "/src/index.ts" }, baseCtx);
      expect(result.decision).toBe("warn");
      expect(result.reason).toContain("large file");
    });

    it("warns on short Agent queries", () => {
      const result = engine.evaluate("Agent", { prompt: "find foo" }, baseCtx);
      expect(result.decision).toBe("warn");
      expect(result.reason).toContain("Agent");
    });

    it("warns on GitHub blob fetches", () => {
      const result = engine.evaluate("WebFetch", {
        url: "https://github.com/user/repo/blob/main/file.ts"
      }, baseCtx);
      expect(result.decision).toBe("warn");
      expect(result.reason).toContain("GitHub blob");
    });
  });

  describe("shouldBlock", () => {
    it("returns true for blocked calls", () => {
      const ctx = { ...baseCtx, totalTokensUsed: 145000 };
      expect(engine.shouldBlock("Read", {}, ctx)).toBe(true);
    });

    it("returns false for allowed calls", () => {
      expect(engine.shouldBlock("Read", { file_path: "/new.ts" }, baseCtx)).toBe(false);
    });
  });

  describe("evaluateAll", () => {
    it("returns all matching rules", () => {
      const ctx = { ...baseCtx, totalTokensUsed: 145000, recentFiles: ["/a.ts"] };
      const results = engine.evaluateAll("Read", { file_path: "/a.ts" }, ctx);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getRuleNames", () => {
    it("returns all rule names", () => {
      const names = engine.getRuleNames();
      expect(names).toContain("budget-critical");
      expect(names).toContain("redundant-read");
      expect(names).toContain("wasteful-tools");
    });
  });

  describe("totalSavings", () => {
    it("sums savings", () => {
      const evals = [
        { decision: "block" as const, reason: "a", saving: 1000 },
        { decision: "warn" as const, reason: "b", saving: 500 },
      ];
      expect(engine.totalSavings(evals)).toBe(1500);
    });
  });
});
