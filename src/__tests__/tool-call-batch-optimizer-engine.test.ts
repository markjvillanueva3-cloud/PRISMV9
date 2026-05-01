import { describe, it, expect } from "vitest";
import { ToolCallBatchOptimizerEngine } from "../engines/ToolCallBatchOptimizerEngine.js";
import type { ToolCall } from "../engines/ToolCallBatchOptimizerEngine.js";

describe("ToolCallBatchOptimizerEngine", () => {
  const engine = new ToolCallBatchOptimizerEngine();

  describe("plan", () => {
    it("handles empty calls", () => {
      const plan = engine.plan([]);
      expect(plan.totalRounds).toBe(0);
      expect(plan.batches.length).toBe(0);
    });

    it("parallelizes independent reads", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "b.ts" } },
        { tool: "Read", params: { file_path: "c.ts" } },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalRounds).toBe(1);
      expect(plan.batches[0].length).toBe(3);
      expect(plan.savedRounds).toBe(2);
    });

    it("respects dependencies", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "a.ts" }, dependsOn: [0] },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalRounds).toBe(2);
    });

    it("prevents write conflicts in same batch", () => {
      const calls: ToolCall[] = [
        { tool: "Edit", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "a.ts" } },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalRounds).toBe(2);
    });

    it("allows parallel writes to different files", () => {
      const calls: ToolCall[] = [
        { tool: "Edit", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "b.ts" } },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalRounds).toBe(1);
    });
  });

  describe("analyze", () => {
    it("detects duplicate reads", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "a.ts" } },
      ];
      const analysis = engine.analyze(calls);
      expect(analysis.redundant).toBe(1);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it("detects parallelizable consecutive reads", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Grep", params: { pattern: "foo" } },
      ];
      const analysis = engine.analyze(calls);
      expect(analysis.parallelizable).toBe(1);
    });

    it("detects read-after-write", () => {
      const calls: ToolCall[] = [
        { tool: "Edit", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "a.ts" } },
      ];
      const analysis = engine.analyze(calls);
      expect(analysis.suggestions.some((s) => s.includes("Read after write"))).toBe(true);
    });

    it("reports no issues for clean sequences", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "a.ts" }, dependsOn: [0] },
      ];
      const analysis = engine.analyze(calls);
      expect(analysis.redundant).toBe(0);
    });
  });

  describe("estimateCost", () => {
    it("sums known tool costs", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: {} },
        { tool: "Grep", params: {} },
      ];
      const cost = engine.estimateCost(calls);
      expect(cost).toBe(700); // 500 + 200
    });

    it("uses default for unknown tools", () => {
      const calls: ToolCall[] = [{ tool: "Unknown", params: {} }];
      expect(engine.estimateCost(calls)).toBe(300);
    });
  });

  describe("summary", () => {
    it("produces compact summary", () => {
      const calls: ToolCall[] = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "b.ts" } },
        { tool: "Read", params: { file_path: "a.ts" } },
      ];
      const s = engine.summary(calls);
      expect(s).toContain("3 calls");
      expect(s).toContain("redundant");
    });
  });
});
