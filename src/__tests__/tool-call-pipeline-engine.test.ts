import { describe, it, expect } from "vitest";
import { ToolCallPipelineEngine } from "../engines/ToolCallPipelineEngine.js";
import type { PipelineResult } from "../engines/ToolCallPipelineEngine.js";

describe("ToolCallPipelineEngine", () => {
  describe("built-in pipelines", () => {
    it("has read-edit-verify pipeline", () => {
      const engine = new ToolCallPipelineEngine();
      const pipeline = engine.get("read-edit-verify");
      expect(pipeline).toBeDefined();
      expect(pipeline!.steps.length).toBe(2);
    });

    it("has search-then-read pipeline", () => {
      const engine = new ToolCallPipelineEngine();
      expect(engine.get("search-then-read")).toBeDefined();
    });

    it("lists all pipelines", () => {
      const engine = new ToolCallPipelineEngine();
      const list = engine.list();
      expect(list.length).toBeGreaterThanOrEqual(3);
      expect(list).toContain("read-edit-verify");
    });
  });

  describe("register", () => {
    it("registers custom pipelines", () => {
      const engine = new ToolCallPipelineEngine();
      engine.register({
        name: "custom",
        steps: [{ name: "step1", tool: "Bash", params: { command: "echo hi" } }],
      });
      expect(engine.get("custom")).toBeDefined();
      expect(engine.list()).toContain("custom");
    });
  });

  describe("dryRun", () => {
    it("estimates token cost of pipeline", () => {
      const engine = new ToolCallPipelineEngine();
      const result = engine.dryRun("read-edit-verify");
      expect(result).toBeDefined();
      expect(result!.steps.length).toBe(2);
      expect(result!.estimatedTokens).toBe(800); // Read 500 + Edit 300
    });

    it("returns undefined for unknown pipeline", () => {
      const engine = new ToolCallPipelineEngine();
      expect(engine.dryRun("nonexistent")).toBeUndefined();
    });
  });

  describe("recordExecution and stats", () => {
    it("tracks execution results", () => {
      const engine = new ToolCallPipelineEngine();
      const result: PipelineResult = {
        success: true,
        stepsRun: 2,
        stepsSkipped: 0,
        totalTokens: 800,
        durationMs: 1500,
        results: new Map(),
        errors: [],
      };
      engine.recordExecution("read-edit-verify", result);
      const stats = engine.stats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.avgTokens).toBe(800);
    });

    it("calculates success rate correctly", () => {
      const engine = new ToolCallPipelineEngine();
      engine.recordExecution("p1", {
        success: true, stepsRun: 1, stepsSkipped: 0,
        totalTokens: 500, durationMs: 100, results: new Map(), errors: [],
      });
      engine.recordExecution("p1", {
        success: false, stepsRun: 0, stepsSkipped: 0,
        totalTokens: 100, durationMs: 50, results: new Map(), errors: ["fail"],
      });
      const stats = engine.stats();
      expect(stats.successRate).toBe(50);
      expect(stats.topPipelines[0].name).toBe("p1");
      expect(stats.topPipelines[0].count).toBe(2);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ToolCallPipelineEngine();
      const line = engine.oneLiner();
      expect(line).toContain("3 registered");
      expect(line).toContain("0 executed");
    });
  });

  describe("reset", () => {
    it("clears execution log", () => {
      const engine = new ToolCallPipelineEngine();
      engine.recordExecution("p1", {
        success: true, stepsRun: 1, stepsSkipped: 0,
        totalTokens: 500, durationMs: 100, results: new Map(), errors: [],
      });
      engine.reset();
      expect(engine.stats().totalExecutions).toBe(0);
    });
  });
});
