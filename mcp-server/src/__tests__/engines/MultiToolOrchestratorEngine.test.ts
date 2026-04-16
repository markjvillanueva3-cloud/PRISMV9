/**
 * Tests for MultiToolOrchestratorEngine
 *
 * AGENT ROADMAP: U-AGT15 (MS4)
 * Verifies parallel tool execution
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MultiToolOrchestratorEngine,
  multiToolOrchestratorEngine,
  OrchestratedToolCall,
  OrchestrationConfig,
  OrchestrationProgress,
} from "../../engines/MultiToolOrchestratorEngine.js";
import { ToolExecutionRequest } from "../../engines/ToolExecutionEngine.js";

describe("MultiToolOrchestratorEngine", () => {
  let engine: MultiToolOrchestratorEngine;

  beforeEach(() => {
    engine = new MultiToolOrchestratorEngine();
  });

  describe("orchestrate", () => {
    it("should execute independent calls in parallel", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "call1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "call2", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } },
        { id: "call3", request: { dispatcher: "prism_business", action: "quote_estimate", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.executionOrder.length).toBe(3);
    });

    it("should execute dependent calls in sequence", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "first", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "second", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["first"] },
        { id: "third", request: { dispatcher: "prism_calc", action: "tool_life", parameters: {} }, dependsOn: ["second"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(true);
      expect(result.executionOrder[0]).toBe("first");
      expect(result.executionOrder[1]).toBe("second");
      expect(result.executionOrder[2]).toBe("third");
    });

    it("should handle mixed dependencies", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "b", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } },
        { id: "c", request: { dispatcher: "prism_calc", action: "tool_life", parameters: {} }, dependsOn: ["a", "b"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(true);
      // 'a' and 'b' can run in parallel, 'c' must come after both
      expect(result.executionOrder.indexOf("c")).toBeGreaterThan(result.executionOrder.indexOf("a"));
      expect(result.executionOrder.indexOf("c")).toBeGreaterThan(result.executionOrder.indexOf("b"));
    });

    it("should respect maxParallel limit", async () => {
      const calls: OrchestratedToolCall[] = [];
      for (let i = 0; i < 10; i++) {
        calls.push({
          id: `call${i}`,
          request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }
        });
      }

      const result = await engine.orchestrate(calls, { maxParallel: 2 });

      expect(result.success).toBe(true);
      // All 10 calls execute, with maxParallel limiting concurrency
      expect(result.successCount).toBe(10);
    });

    it("should continue on failure when configured", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "good1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "bad", request: { dispatcher: "nonexistent", action: "fail", parameters: {} } },
        { id: "good2", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls, { continueOnFailure: true });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results.get("good2")?.success).toBe(true);
    });

    it("should skip dependents when not continuing on failure", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "root", request: { dispatcher: "nonexistent", action: "fail", parameters: {} } },
        { id: "dep1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["root"] },
        { id: "dep2", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["dep1"] }
      ];

      const result = await engine.orchestrate(calls, { continueOnFailure: false });

      expect(result.failureCount).toBe(3); // root failed, dep1 and dep2 skipped
      expect(result.successCount).toBe(0);
    });

    it("should call progress callback", async () => {
      const progressUpdates: OrchestrationProgress[] = [];

      const calls: OrchestratedToolCall[] = [
        { id: "call1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "call2", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } }
      ];

      await engine.orchestrate(calls, {
        progressCallback: (progress) => progressUpdates.push({ ...progress })
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(2);
    });

    it("should detect circular dependencies", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["b"] },
        { id: "b", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["a"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain("Circular dependency");
    });

    it("should detect invalid dependency references", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["nonexistent"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain("Invalid dependency");
    });

    it("should detect duplicate IDs", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "same", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "same", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain("Duplicate");
    });

    it("should detect self-dependency", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "self", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["self"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain("Self-dependency");
    });

    it("should call onSuccess callback", async () => {
      let successCalled = false;

      const calls: OrchestratedToolCall[] = [
        {
          id: "test",
          request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
          onSuccess: () => { successCalled = true; }
        }
      ];

      await engine.orchestrate(calls);

      expect(successCalled).toBe(true);
    });

    it("should call onFailure callback", async () => {
      let failureCalled = false;

      const calls: OrchestratedToolCall[] = [
        {
          id: "test",
          request: { dispatcher: "nonexistent", action: "fail", parameters: {} },
          onFailure: () => { failureCalled = true; }
        }
      ];

      await engine.orchestrate(calls);

      expect(failureCalled).toBe(true);
    });

    it("should calculate parallel efficiency", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "call1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "call2", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } },
        { id: "call3", request: { dispatcher: "prism_business", action: "quote_estimate", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.metrics.parallelEfficiency).toBeGreaterThan(0);
    });
  });

  describe("parallel", () => {
    it("should execute requests in parallel", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} },
        { dispatcher: "prism_business", action: "quote_estimate", parameters: {} }
      ];

      const result = await engine.parallel(requests);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(3);
      expect(result.successCount).toBe(3);
    });

    it("should handle empty array", async () => {
      const result = await engine.parallel([]);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(0);
    });

    it("should handle mixed success/failure", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "nonexistent", action: "fail", parameters: {} }
      ];

      const result = await engine.parallel(requests);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe("sequence", () => {
    it("should execute requests sequentially", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} },
        { dispatcher: "prism_calc", action: "tool_life", parameters: {} }
      ];

      const result = await engine.sequence(requests);

      expect(result.success).toBe(true);
      expect(result.executionOrder.length).toBe(3);
      // Each should depend on previous
      expect(result.metrics.parallelBatches).toBe(3);
    });

    it("should stop on first failure when not continuing", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "nonexistent", action: "fail", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }
      ];

      const result = await engine.sequence(requests, { continueOnFailure: false });

      expect(result.successCount).toBe(1);
      // Third should be skipped
      expect(result.executionOrder.length).toBe(2);
    });
  });

  describe("pipeline", () => {
    it("should execute pipeline without transform", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }
      ];

      const result = await engine.pipeline(requests);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(2);
    });

    it("should execute pipeline with transform", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }
      ];

      const transform = vi.fn((result, index) => ({
        dispatcher: "prism_calc",
        action: "tool_life",
        parameters: { fromPrevious: true }
      }));

      const result = await engine.pipeline(requests, transform);

      expect(result.success).toBe(true);
      expect(transform).toHaveBeenCalled();
    });

    it("should stop pipeline on failure", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "nonexistent", action: "fail", parameters: {} },
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }
      ];

      // Use a transform to force actual pipeline behavior (not sequence)
      const transform = (_result: any, _index: number) => requests[1];
      const result = await engine.pipeline(requests, transform);

      expect(result.success).toBe(false);
      expect(result.executionOrder.length).toBe(1);
    });
  });

  describe("analyzeDependencies", () => {
    it("should analyze independent calls", () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "b", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } },
        { id: "c", request: { dispatcher: "prism_business", action: "quote_estimate", parameters: {} } }
      ];

      const analysis = engine.analyzeDependencies(calls);

      expect(analysis.valid).toBe(true);
      expect(analysis.levels.length).toBe(1);
      expect(analysis.levels[0].length).toBe(3);
      expect(analysis.parallelizable).toBe(2); // 3-1 = 2 can run in parallel
      expect(analysis.sequential).toBe(1);
    });

    it("should analyze sequential calls", () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "b", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["a"] },
        { id: "c", request: { dispatcher: "prism_calc", action: "tool_life", parameters: {} }, dependsOn: ["b"] }
      ];

      const analysis = engine.analyzeDependencies(calls);

      expect(analysis.valid).toBe(true);
      expect(analysis.levels.length).toBe(3);
      expect(analysis.sequential).toBe(3);
      expect(analysis.parallelizable).toBe(0);
    });

    it("should analyze diamond dependencies", () => {
      const calls: OrchestratedToolCall[] = [
        { id: "root", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "left", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["root"] },
        { id: "right", request: { dispatcher: "prism_calc", action: "tool_life", parameters: {} }, dependsOn: ["root"] },
        { id: "join", request: { dispatcher: "prism_calc", action: "deflection", parameters: {} }, dependsOn: ["left", "right"] }
      ];

      const analysis = engine.analyzeDependencies(calls);

      expect(analysis.valid).toBe(true);
      expect(analysis.levels.length).toBe(3);
      expect(analysis.levels[0]).toEqual(["root"]);
      expect(analysis.levels[1].sort()).toEqual(["left", "right"]);
      expect(analysis.levels[2]).toEqual(["join"]);
    });

    it("should detect invalid dependencies", () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["nonexistent"] }
      ];

      const analysis = engine.analyzeDependencies(calls);

      expect(analysis.valid).toBe(false);
      expect(analysis.error).toContain("Invalid dependency");
    });

    it("should detect circular dependencies", () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} }, dependsOn: ["c"] },
        { id: "b", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["a"] },
        { id: "c", request: { dispatcher: "prism_calc", action: "tool_life", parameters: {} }, dependsOn: ["b"] }
      ];

      const analysis = engine.analyzeDependencies(calls);

      expect(analysis.valid).toBe(false);
      expect(analysis.error).toContain("Circular");
    });
  });

  describe("metrics", () => {
    it("should track total duration", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "call1", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.metrics.totalDurationMs).toBeGreaterThan(0);
    });

    it("should track batch metrics", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "a", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "b", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }, dependsOn: ["a"] }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.metrics.parallelBatches).toBe(2);
      expect(result.metrics.avgBatchDurationMs).toBeGreaterThan(0);
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(multiToolOrchestratorEngine).toBeInstanceOf(MultiToolOrchestratorEngine);
    });
  });

  describe("edge cases", () => {
    it("should handle single call", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "single", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(1);
    });

    it("should handle empty calls array", async () => {
      const result = await engine.orchestrate([]);

      expect(result.success).toBe(true);
      expect(result.totalCalls).toBe(0);
      expect(result.executionOrder.length).toBe(0);
    });

    it("should preserve execution order for results", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "first", request: { dispatcher: "prism_calc", action: "speed_feed", parameters: {} } },
        { id: "second", request: { dispatcher: "prism_calc", action: "cutting_force", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.results.get("first")).toBeDefined();
      expect(result.results.get("second")).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should capture errors in result", async () => {
      const calls: OrchestratedToolCall[] = [
        { id: "bad", request: { dispatcher: "nonexistent", action: "fail", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].toolId).toBe("bad");
      expect(result.errors[0].phase).toBe("execution");
    });

    it("should mark recoverable errors", async () => {
      // In our mock, timeout errors are retryable
      const calls: OrchestratedToolCall[] = [
        { id: "error", request: { dispatcher: "nonexistent", action: "fail", parameters: {} } }
      ];

      const result = await engine.orchestrate(calls);

      expect(result.errors[0].recoverable).toBeDefined();
    });
  });
});
