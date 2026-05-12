/**
 * Tests for ToolExecutionEngine
 *
 * AGENT ROADMAP: U-AGT12 (MS4)
 * Verifies MCP tool invocation and execution
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolExecutionEngine,
  toolExecutionEngine,
  ToolExecutionRequest,
  ToolExecutionResult,
} from "../../engines/ToolExecutionEngine.js";

describe("ToolExecutionEngine", () => {
  let engine: ToolExecutionEngine;

  beforeEach(() => {
    engine = new ToolExecutionEngine();
  });

  describe("execute", () => {
    it("should execute valid speed_feed action", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: { material: "D2", hardness: 58 }
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.executionId).toMatch(/^exec_/);
      expect(result.dispatcher).toBe("prism_calc");
      expect(result.action).toBe("speed_feed");
      expect(result.result).toBeDefined();
      expect(result.metrics.durationMs).toBeGreaterThan(0);
    });

    it("should execute cutting_force action", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "cutting_force",
        parameters: { ap: 2, fz: 0.1, vc: 200 }
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty("force_n");
    });

    it("should execute quote_estimate action", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_business",
        action: "quote_estimate",
        parameters: { quantity: 100, complexity: "medium" }
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty("total_cost");
    });

    it("should execute machine_selection action", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_cam",
        action: "machine_selection",
        parameters: { operation: "turning", material: "D2" }
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty("recommended");
    });

    it("should fail for unknown dispatcher", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "nonexistent_dispatcher",
        action: "any_action",
        parameters: {}
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("DISPATCHER_NOT_FOUND");
      expect(result.error?.retryable).toBe(false);
      expect(result.error?.suggestion).toContain("prism_calc");
    });

    it("should fail for unknown action", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "nonexistent_action",
        parameters: {}
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("ACTION_NOT_FOUND");
      expect(result.error?.retryable).toBe(false);
      expect(result.error?.suggestion).toContain("speed_feed");
    });

    it("should fail for null parameters", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: null as unknown as Record<string, unknown>
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PARAMETER_VALIDATION_ERROR");
    });

    it("should include execution metrics", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      };

      const result = await engine.execute(request);

      expect(result.metrics.startTime).toBeDefined();
      expect(result.metrics.endTime).toBeDefined();
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.validationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.retryCount).toBe(0);
    });

    it("should include trace when enabled", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {},
        context: { traceEnabled: true }
      };

      const result = await engine.execute(request);

      expect(result.trace).toBeDefined();
      expect(result.trace?.steps.length).toBeGreaterThan(0);
      expect(result.trace?.steps[0].phase).toBe("validation");
    });

    it("should not include trace when disabled", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {},
        context: { traceEnabled: false }
      };

      const result = await engine.execute(request);

      expect(result.trace).toBeUndefined();
    });

    it("should execute within reasonable time", async () => {
      const request: ToolExecutionRequest = {
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      };

      const result = await engine.execute(request);

      expect(result.metrics.durationMs).toBeLessThan(500);
    });
  });

  describe("custom handler", () => {
    it("should use custom handler when registered", async () => {
      const customResult = { custom: "result", value: 42 };

      engine.registerDispatcher("custom_dispatcher", ["custom_action"], async () => {
        return customResult;
      });

      const request: ToolExecutionRequest = {
        dispatcher: "custom_dispatcher",
        action: "custom_action",
        parameters: {}
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(customResult);
    });

    it("should handle custom handler errors", async () => {
      engine.registerDispatcher("error_dispatcher", ["error_action"], async () => {
        throw new Error("Custom handler failed");
      });

      const request: ToolExecutionRequest = {
        dispatcher: "error_dispatcher",
        action: "error_action",
        parameters: {},
        retryCount: 0
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXECUTION_ERROR");
      expect(result.error?.message).toContain("Custom handler failed");
    });

    it("should retry on transient errors", async () => {
      let callCount = 0;

      engine.registerDispatcher("retry_dispatcher", ["retry_action"], async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error("timeout occurred");
          throw error;
        }
        return { success: true };
      });

      const request: ToolExecutionRequest = {
        dispatcher: "retry_dispatcher",
        action: "retry_action",
        parameters: {},
        retryCount: 3
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(true);
      expect(result.metrics.retryCount).toBe(2);
      expect(callCount).toBe(3);
    });

    it("should exhaust retries on persistent errors", async () => {
      engine.registerDispatcher("fail_dispatcher", ["fail_action"], async () => {
        throw new Error("timeout - always fails");
      });

      const request: ToolExecutionRequest = {
        dispatcher: "fail_dispatcher",
        action: "fail_action",
        parameters: {},
        retryCount: 2
      };

      const result = await engine.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RETRY_EXHAUSTED");
      expect(result.metrics.retryCount).toBe(2);
    });
  });

  describe("execution logging", () => {
    it("should log successful executions", async () => {
      await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });

      const log = engine.getExecutionLog();

      expect(log.length).toBe(1);
      expect(log[0].success).toBe(true);
      expect(log[0].dispatcher).toBe("prism_calc");
      expect(log[0].action).toBe("speed_feed");
    });

    it("should log failed executions", async () => {
      await engine.execute({
        dispatcher: "nonexistent",
        action: "test",
        parameters: {}
      });

      const log = engine.getExecutionLog();

      expect(log.length).toBe(1);
      expect(log[0].success).toBe(false);
      expect(log[0].error).toBeDefined();
    });

    it("should retrieve execution by ID", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });

      const entry = engine.getExecution(result.executionId);

      expect(entry).toBeDefined();
      expect(entry?.executionId).toBe(result.executionId);
    });

    it("should return undefined for unknown execution ID", () => {
      const entry = engine.getExecution("nonexistent_id");

      expect(entry).toBeUndefined();
    });

    it("should limit log retrieval", async () => {
      for (let i = 0; i < 10; i++) {
        await engine.execute({
          dispatcher: "prism_calc",
          action: "speed_feed",
          parameters: {}
        });
      }

      const log = engine.getExecutionLog(5);

      expect(log.length).toBe(5);
    });

    it("should clear execution log", async () => {
      await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });

      engine.clearLog();
      const log = engine.getExecutionLog();

      expect(log.length).toBe(0);
    });

    it("should include context in log", async () => {
      await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {},
        context: { sessionId: "test-session", userId: "user-123" }
      });

      const log = engine.getExecutionLog();

      expect(log[0].context?.sessionId).toBe("test-session");
      expect(log[0].context?.userId).toBe("user-123");
    });
  });

  describe("getStats", () => {
    it("should return empty stats for new engine", () => {
      const stats = engine.getStats();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.avgDurationMs).toBe(0);
    });

    it("should calculate stats after executions", async () => {
      await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });
      await engine.execute({
        dispatcher: "prism_business",
        action: "quote_estimate",
        parameters: {}
      });
      await engine.execute({
        dispatcher: "nonexistent",
        action: "test",
        parameters: {}
      });

      const stats = engine.getStats();

      expect(stats.totalExecutions).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
      expect(stats.avgDurationMs).toBeGreaterThan(0);
    });

    it("should calculate per-dispatcher stats", async () => {
      await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });
      await engine.execute({
        dispatcher: "prism_calc",
        action: "cutting_force",
        parameters: {}
      });
      await engine.execute({
        dispatcher: "prism_business",
        action: "quote_estimate",
        parameters: {}
      });

      const stats = engine.getStats();

      expect(stats.byDispatcher["prism_calc"]).toBeDefined();
      expect(stats.byDispatcher["prism_calc"].count).toBe(2);
      expect(stats.byDispatcher["prism_calc"].successRate).toBe(1);
      expect(stats.byDispatcher["prism_business"].count).toBe(1);
    });
  });

  describe("dispatcher discovery", () => {
    it("should list available dispatchers", () => {
      const dispatchers = engine.getDispatchers();

      expect(dispatchers).toContain("prism_calc");
      expect(dispatchers).toContain("prism_business");
      expect(dispatchers).toContain("prism_cam");
      expect(dispatchers).toContain("prism_data");
      expect(dispatchers).toContain("prism_validate");
      expect(dispatchers).toContain("prism_quality");
      expect(dispatchers).toContain("prism_safety");
      expect(dispatchers).toContain("prism_ai");
    });

    it("should list actions for dispatcher", () => {
      const actions = engine.getActions("prism_calc");

      expect(actions).toContain("speed_feed");
      expect(actions).toContain("cutting_force");
      expect(actions).toContain("tool_life");
      expect(actions).toContain("deflection");
    });

    it("should return empty array for unknown dispatcher", () => {
      const actions = engine.getActions("nonexistent");

      expect(actions).toEqual([]);
    });

    it("should check action existence", () => {
      expect(engine.hasAction("prism_calc", "speed_feed")).toBe(true);
      expect(engine.hasAction("prism_calc", "nonexistent")).toBe(false);
      expect(engine.hasAction("nonexistent", "test")).toBe(false);
    });
  });

  describe("batch execution", () => {
    it("should execute batch of requests in parallel", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} },
        { dispatcher: "prism_business", action: "quote_estimate", parameters: {} }
      ];

      const startTime = Date.now();
      const results = await engine.executeBatch(requests);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(300);
    });

    it("should handle mixed success/failure in batch", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "nonexistent", action: "test", parameters: {} },
        { dispatcher: "prism_business", action: "quote_estimate", parameters: {} }
      ];

      const results = await engine.executeBatch(requests);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe("sequential execution", () => {
    it("should execute requests sequentially", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_calc", action: "cutting_force", parameters: {} }
      ];

      const results = await engine.executeSequential(requests);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it("should preserve order in sequential execution", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "prism_business", action: "quote_estimate", parameters: {} },
        { dispatcher: "prism_cam", action: "machine_selection", parameters: {} }
      ];

      const results = await engine.executeSequential(requests);

      expect(results[0].action).toBe("speed_feed");
      expect(results[1].action).toBe("quote_estimate");
      expect(results[2].action).toBe("machine_selection");
    });

    it("should continue after failure in sequential", async () => {
      const requests: ToolExecutionRequest[] = [
        { dispatcher: "prism_calc", action: "speed_feed", parameters: {} },
        { dispatcher: "nonexistent", action: "test", parameters: {} },
        { dispatcher: "prism_business", action: "quote_estimate", parameters: {} }
      ];

      const results = await engine.executeSequential(requests);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe("registerDispatcher", () => {
    it("should register new dispatcher", () => {
      engine.registerDispatcher("test_dispatcher", ["action_a", "action_b"]);

      expect(engine.getDispatchers()).toContain("test_dispatcher");
      expect(engine.getActions("test_dispatcher")).toContain("action_a");
      expect(engine.getActions("test_dispatcher")).toContain("action_b");
    });

    it("should allow executing registered dispatcher", async () => {
      engine.registerDispatcher("new_dispatcher", ["new_action"]);

      const result = await engine.execute({
        dispatcher: "new_dispatcher",
        action: "new_action",
        parameters: { test: true }
      });

      expect(result.success).toBe(true);
    });

    it("should override existing dispatcher", () => {
      engine.registerDispatcher("prism_calc", ["only_action"]);

      const actions = engine.getActions("prism_calc");

      expect(actions).toEqual(["only_action"]);
      expect(actions).not.toContain("speed_feed");
    });
  });

  describe("timeout handling", () => {
    it("should respect custom timeout", async () => {
      const startTime = Date.now();

      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {},
        timeout: 5000
      });

      // Should complete before timeout
      expect(Date.now() - startTime).toBeLessThan(5000);
      expect(result.success).toBe(true);
    });
  });

  describe("mock results", () => {
    it("should return speed_feed mock with expected shape", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });

      expect(result.success).toBe(true);
      const data = result.result as Record<string, unknown>;
      expect(data.sfm).toBeDefined();
      expect(data.rpm).toBeDefined();
      expect(data.feed_ipr).toBeDefined();
      expect(data.confidence).toBeDefined();
    });

    it("should return cutting_force mock with expected shape", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "cutting_force",
        parameters: {}
      });

      expect(result.success).toBe(true);
      const data = result.result as Record<string, unknown>;
      expect(data.force_n).toBeDefined();
      expect(data.torque_nm).toBeDefined();
      expect(data.power_kw).toBeDefined();
    });

    it("should return tool_life mock with expected shape", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "tool_life",
        parameters: {}
      });

      expect(result.success).toBe(true);
      const data = result.result as Record<string, unknown>;
      expect(data.life_minutes).toBeDefined();
      expect(data.parts_per_edge).toBeDefined();
    });

    it("should return generic mock for unmapped actions", async () => {
      const result = await engine.execute({
        dispatcher: "prism_safety",
        action: "safety_check",
        parameters: { param: "value" }
      });

      expect(result.success).toBe(true);
      const data = result.result as Record<string, unknown>;
      expect(data.dispatcher).toBe("prism_safety");
      expect(data.action).toBe("safety_check");
      expect(data.status).toBe("executed");
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(toolExecutionEngine).toBeInstanceOf(ToolExecutionEngine);
    });
  });

  describe("error details", () => {
    it("should include available dispatchers in error", async () => {
      const result = await engine.execute({
        dispatcher: "unknown",
        action: "test",
        parameters: {}
      });

      expect(result.error?.details?.availableDispatchers).toBeDefined();
      expect(Array.isArray(result.error?.details?.availableDispatchers)).toBe(true);
    });

    it("should include available actions in error", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "unknown_action",
        parameters: {}
      });

      expect(result.error?.details?.availableActions).toBeDefined();
      expect(Array.isArray(result.error?.details?.availableActions)).toBe(true);
    });
  });

  describe("execution ID generation", () => {
    it("should generate unique execution IDs", async () => {
      const results = await Promise.all([
        engine.execute({ dispatcher: "prism_calc", action: "speed_feed", parameters: {} }),
        engine.execute({ dispatcher: "prism_calc", action: "speed_feed", parameters: {} }),
        engine.execute({ dispatcher: "prism_calc", action: "speed_feed", parameters: {} })
      ]);

      const ids = results.map(r => r.executionId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("should include timestamp in execution ID", async () => {
      const result = await engine.execute({
        dispatcher: "prism_calc",
        action: "speed_feed",
        parameters: {}
      });

      const parts = result.executionId.split("_");
      expect(parts[0]).toBe("exec");
      expect(Number(parts[1])).toBeGreaterThan(0);
    });
  });
});
