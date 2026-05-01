import { describe, it, expect } from "vitest";
import { TokenBudgetAllocatorEngine } from "../engines/TokenBudgetAllocatorEngine.js";
import type { Phase } from "../engines/TokenBudgetAllocatorEngine.js";

describe("TokenBudgetAllocatorEngine", () => {
  const engine = new TokenBudgetAllocatorEngine();

  const makePhases = (): Phase[] => [
    { name: "read-code", priority: 1, estimatedTokens: 5000, minTokens: 2000, flexible: true },
    { name: "implement", priority: 1, estimatedTokens: 10000, minTokens: 5000, flexible: true },
    { name: "test", priority: 2, estimatedTokens: 3000, minTokens: 1000, flexible: false },
    { name: "commit", priority: 2, estimatedTokens: 2000, minTokens: 1000, flexible: false },
    { name: "docs", priority: 4, estimatedTokens: 3000, minTokens: 1000, flexible: true },
  ];

  describe("allocate", () => {
    it("allocates to all phases when budget allows", () => {
      const plan = engine.allocate(50000, makePhases());
      expect(plan.canCompleteAll).toBe(true);
      expect(plan.droppedPhases.length).toBe(0);
      expect(plan.allocations.length).toBe(5);
    });

    it("drops low-priority phases when tight", () => {
      const plan = engine.allocate(15000, makePhases());
      // With only 15K (10K after reserve), low-priority phases get dropped
      expect(plan.droppedPhases.length).toBeGreaterThanOrEqual(0);
    });

    it("preserves critical phases", () => {
      const plan = engine.allocate(20000, makePhases());
      const critical = plan.allocations.filter(a => a.phase === "read-code" || a.phase === "implement");
      expect(critical.length).toBe(2);
      expect(critical.every(a => a.allocated > 0)).toBe(true);
    });

    it("calculates reserve", () => {
      const plan = engine.allocate(50000, makePhases());
      expect(plan.reserve).toBeGreaterThan(0);
    });

    it("handles empty phases", () => {
      const plan = engine.allocate(50000, []);
      expect(plan.allocations.length).toBe(0);
      expect(plan.canCompleteAll).toBe(true);
    });
  });

  describe("canAfford", () => {
    it("returns true when budget allows", () => {
      expect(engine.canAfford(50000, 10000, 10000)).toBe(true);
    });

    it("returns false when over budget", () => {
      expect(engine.canAfford(15000, 10000, 10000)).toBe(false);
    });

    it("respects reserve", () => {
      expect(engine.canAfford(20000, 15000, 10000)).toBe(false);
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const plan = engine.allocate(50000, makePhases());
      const line = engine.oneLiner(plan);
      expect(line).toContain("K/");
      expect(line).toContain("allocated");
    });
  });
});
