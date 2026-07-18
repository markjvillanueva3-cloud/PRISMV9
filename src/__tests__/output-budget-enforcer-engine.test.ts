import { describe, it, expect } from "vitest";
import { OutputBudgetEnforcerEngine } from "../engines/OutputBudgetEnforcerEngine.js";

describe("OutputBudgetEnforcerEngine", () => {
  describe("enforce", () => {
    it("passes through small output within budget", () => {
      const engine = new OutputBudgetEnforcerEngine();
      const result = engine.enforce("Read", "short content");
      expect(result.withinBudget).toBe(true);
      expect(result.truncated).toBe("short content");
      expect(result.savedTokens).toBe(0);
    });

    it("truncates Bash output with tail strategy", () => {
      const engine = new OutputBudgetEnforcerEngine();
      const bigOutput = "x".repeat(20000); // 5000 tokens, budget is 2000
      const result = engine.enforce("Bash", bigOutput);
      expect(result.withinBudget).toBe(false);
      expect(result.truncated.length).toBeLessThan(bigOutput.length);
      expect(result.savedTokens).toBeGreaterThan(0);
      // Tail strategy: should end with the last chars
      expect(result.truncated).toContain("xxxx");
    });

    it("truncates Read output with headtail strategy", () => {
      const engine = new OutputBudgetEnforcerEngine();
      const lines = Array.from({ length: 500 }, (_, i) => "line " + (i + 1) + ": some content here that takes up space");
      const bigOutput = lines.join("\n");
      const result = engine.enforce("Read", bigOutput);
      expect(result.withinBudget).toBe(false);
      expect(result.truncated).toContain("line 1");
      expect(result.truncated).toContain("omitted");
    });

    it("truncates Grep with head strategy", () => {
      const engine = new OutputBudgetEnforcerEngine();
      const bigOutput = "match ".repeat(3000);
      const result = engine.enforce("Grep", bigOutput);
      expect(result.withinBudget).toBe(false);
      expect(result.truncated.startsWith("match")).toBe(true);
    });

    it("tracks statistics on enforcements", () => {
      const engine = new OutputBudgetEnforcerEngine();
      engine.enforce("Bash", "x".repeat(20000));
      engine.enforce("Bash", "y".repeat(20000));
      const stats = engine.getStats();
      expect(stats.totalEnforced).toBe(2);
      expect(stats.totalSaved).toBeGreaterThan(0);
      expect(stats.topOffenders[0].tool).toBe("Bash");
    });
  });

  describe("wouldExceed", () => {
    it("returns false for small output", () => {
      const engine = new OutputBudgetEnforcerEngine();
      expect(engine.wouldExceed("Read", 100)).toBe(false);
    });

    it("returns true for large output", () => {
      const engine = new OutputBudgetEnforcerEngine();
      expect(engine.wouldExceed("Grep", 100000)).toBe(true);
    });
  });

  describe("setRule", () => {
    it("allows custom budget rules", () => {
      const engine = new OutputBudgetEnforcerEngine();
      engine.setRule("Custom", 100, "head");
      const result = engine.enforce("Custom", "x".repeat(2000));
      expect(result.withinBudget).toBe(false);
      expect(result.budgetTokens).toBe(100);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new OutputBudgetEnforcerEngine();
      engine.enforce("Bash", "x".repeat(20000));
      const line = engine.oneLiner();
      expect(line).toContain("1 enforced");
      expect(line).toContain("Budget");
    });
  });

  describe("reset", () => {
    it("clears statistics", () => {
      const engine = new OutputBudgetEnforcerEngine();
      engine.enforce("Bash", "x".repeat(20000));
      engine.reset();
      const stats = engine.getStats();
      expect(stats.totalEnforced).toBe(0);
      expect(stats.totalSaved).toBe(0);
    });
  });

  describe("default budget for unknown tools", () => {
    it("uses default max tokens", () => {
      const engine = new OutputBudgetEnforcerEngine(500);
      const result = engine.enforce("UnknownTool", "x".repeat(10000));
      expect(result.withinBudget).toBe(false);
      expect(result.budgetTokens).toBe(500);
    });
  });
});
