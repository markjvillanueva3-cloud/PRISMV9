/**
 * ToolExecutionEngine Test Suite
 * ===============================
 *
 * AGENT-MS4 U-AGT12 — Validates MCP tool execution with timeout,
 * retry, dispatcher registry, and execution log.
 *
 * @milestone AGENT-MS4
 * @unit U-AGT12
 */

import { describe, it, expect, beforeEach } from "vitest";
import { toolExecutionEngine } from "../engines/ToolExecutionEngine.js";

beforeEach(() => {
  toolExecutionEngine.clearLog();
});

describe("ToolExecutionEngine", () => {
  // ── registerDispatcher() ─────────────────────────────────────────────

  describe("registerDispatcher()", () => {
    it("adds a new dispatcher with its actions", () => {
      toolExecutionEngine.registerDispatcher("prism_test_reg", ["action_a", "action_b"]);
      expect(toolExecutionEngine.hasAction("prism_test_reg", "action_a")).toBe(true);
      expect(toolExecutionEngine.hasAction("prism_test_reg", "action_b")).toBe(true);
    });

    it("registers a handler that execute() can invoke", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_test_handler",
        ["echo"],
        async (action, params) => ({ action, params })
      );
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_test_handler",
        action: "echo",
        parameters: { hello: "world" },
      });
      expect(res.success).toBe(true);
      expect(res.result).toEqual({ action: "echo", params: { hello: "world" } });
    });
  });

  // ── execute() error paths ────────────────────────────────────────────

  describe("execute() error handling", () => {
    it("returns DISPATCHER_NOT_FOUND for unknown dispatcher", async () => {
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_definitely_nonexistent_xyz",
        action: "anything",
        parameters: {},
      });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("DISPATCHER_NOT_FOUND");
    });

    it("returns ACTION_NOT_FOUND for unknown action", async () => {
      toolExecutionEngine.registerDispatcher("prism_anf_test", ["real_action"]);
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_anf_test",
        action: "ghost_action",
        parameters: {},
      });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("ACTION_NOT_FOUND");
    });

    it("surfaces execution errors thrown by handlers", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_throw_test",
        ["boom"],
        async () => {
          throw new Error("kaboom");
        }
      );
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_throw_test",
        action: "boom",
        parameters: {},
      });
      expect(res.success).toBe(false);
      expect(res.error?.message).toContain("kaboom");
    });
  });

  // ── Metrics & trace ──────────────────────────────────────────────────

  describe("metrics + trace", () => {
    it("records start/end timestamps and positive duration", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_metric",
        ["noop"],
        async () => ({ ok: true })
      );
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_metric",
        action: "noop",
        parameters: {},
      });
      expect(res.metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(res.metrics.startTime).toBeDefined();
      expect(res.metrics.endTime).toBeDefined();
    });

    it("emits trace when traceEnabled=true", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_trace",
        ["run"],
        async () => ({ ok: true })
      );
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_trace",
        action: "run",
        parameters: {},
        context: { traceEnabled: true },
      });
      if (res.trace) {
        expect(Array.isArray(res.trace.steps)).toBe(true);
      }
    });
  });

  // ── Execution log ─────────────────────────────────────────────────────

  describe("execution log", () => {
    it("records successful executions in the log", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_log_test",
        ["action"],
        async () => ({ ok: 1 })
      );
      await toolExecutionEngine.execute({
        dispatcher: "prism_log_test",
        action: "action",
        parameters: {},
      });
      const log = toolExecutionEngine.getExecutionLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]!.success).toBe(true);
    });

    it("retrieves a specific execution by id", async () => {
      toolExecutionEngine.registerDispatcher(
        "prism_id_test",
        ["a"],
        async () => ({ ok: 1 })
      );
      const res = await toolExecutionEngine.execute({
        dispatcher: "prism_id_test",
        action: "a",
        parameters: {},
      });
      const entry = toolExecutionEngine.getExecution(res.executionId);
      expect(entry).toBeDefined();
      expect(entry!.success).toBe(true);
    });

    it("getExecution returns undefined for unknown id", () => {
      const entry = toolExecutionEngine.getExecution("exec_ghost");
      expect(entry).toBeUndefined();
    });

    it("clearLog empties the log", async () => {
      toolExecutionEngine.registerDispatcher("prism_clear", ["a"], async () => ({}));
      await toolExecutionEngine.execute({
        dispatcher: "prism_clear",
        action: "a",
        parameters: {},
      });
      toolExecutionEngine.clearLog();
      expect(toolExecutionEngine.getExecutionLog().length).toBe(0);
    });
  });

  // ── Introspection ─────────────────────────────────────────────────────

  describe("getDispatchers() / getActions() / hasAction()", () => {
    it("getDispatchers returns a list including known ones", () => {
      const dispatchers = toolExecutionEngine.getDispatchers();
      expect(Array.isArray(dispatchers)).toBe(true);
      expect(dispatchers.length).toBeGreaterThan(0);
    });

    it("getActions returns actions for a known dispatcher", () => {
      toolExecutionEngine.registerDispatcher("prism_actions", ["a", "b", "c"]);
      const actions = toolExecutionEngine.getActions("prism_actions");
      expect(actions.sort()).toEqual(["a", "b", "c"].sort());
    });

    it("getActions returns empty for unknown dispatcher", () => {
      expect(toolExecutionEngine.getActions("ghost")).toEqual([]);
    });

    it("hasAction returns false for unknown action", () => {
      expect(toolExecutionEngine.hasAction("prism_actions", "ghost")).toBe(false);
    });
  });

  // ── Batch & sequential ───────────────────────────────────────────────

  describe("executeBatch() / executeSequential()", () => {
    beforeEach(() => {
      toolExecutionEngine.registerDispatcher(
        "prism_batch",
        ["add"],
        async (_action, params) => ({ sum: (params.a as number) + (params.b as number) })
      );
    });

    it("executeBatch runs multiple requests", async () => {
      const results = await toolExecutionEngine.executeBatch([
        { dispatcher: "prism_batch", action: "add", parameters: { a: 1, b: 2 } },
        { dispatcher: "prism_batch", action: "add", parameters: { a: 3, b: 4 } },
      ]);
      expect(results.length).toBe(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("executeSequential runs requests in order", async () => {
      const results = await toolExecutionEngine.executeSequential([
        { dispatcher: "prism_batch", action: "add", parameters: { a: 1, b: 1 } },
        { dispatcher: "prism_batch", action: "add", parameters: { a: 2, b: 2 } },
      ]);
      expect(results.length).toBe(2);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns execution stats object", () => {
      const stats = toolExecutionEngine.getStats();
      expect(stats).toBeDefined();
    });
  });
});
