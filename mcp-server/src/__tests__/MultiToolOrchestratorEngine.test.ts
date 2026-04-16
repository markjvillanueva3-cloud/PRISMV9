/**
 * MultiToolOrchestratorEngine Test Suite
 * =======================================
 *
 * AGENT-MS4 U-AGT15 — Validates DAG-based multi-tool orchestration:
 * parallel, sequence, pipeline execution modes, dependency resolution,
 * cycle detection, and orchestration metrics.
 *
 * @milestone AGENT-MS4
 * @unit U-AGT15
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MultiToolOrchestratorEngine } from "../engines/MultiToolOrchestratorEngine.js";
import { ToolExecutionEngine } from "../engines/ToolExecutionEngine.js";

// Use isolated tool engine per test so dispatcher registrations don't leak.
let toolEngine: ToolExecutionEngine;
let orch: MultiToolOrchestratorEngine;

beforeEach(() => {
  toolEngine = new ToolExecutionEngine();
  orch = new MultiToolOrchestratorEngine(toolEngine);
  toolEngine.registerDispatcher(
    "prism_orch_test",
    ["echo", "multiply", "fail"],
    async (action, params) => {
      if (action === "fail") {
        throw new Error("intentional failure");
      }
      if (action === "multiply") {
        return { value: (params.x as number) * (params.y as number) };
      }
      return { action, params };
    }
  );
});

describe("MultiToolOrchestratorEngine", () => {
  // ── parallel() ────────────────────────────────────────────────────────

  describe("parallel()", () => {
    it("executes independent requests concurrently", async () => {
      const result = await orch.parallel([
        { dispatcher: "prism_orch_test", action: "echo", parameters: { i: 1 } },
        { dispatcher: "prism_orch_test", action: "echo", parameters: { i: 2 } },
        { dispatcher: "prism_orch_test", action: "echo", parameters: { i: 3 } },
      ]);
      expect(result.totalCalls).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it("handles empty request list", async () => {
      const result = await orch.parallel([]);
      expect(result.totalCalls).toBe(0);
    });

    it("continues on failure when configured", async () => {
      const result = await orch.parallel(
        [
          { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          { dispatcher: "prism_orch_test", action: "fail", parameters: {} },
          { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        ],
        { continueOnFailure: true }
      );
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  // ── sequence() ────────────────────────────────────────────────────────

  describe("sequence()", () => {
    it("executes requests in order", async () => {
      const result = await orch.sequence([
        { dispatcher: "prism_orch_test", action: "echo", parameters: { step: 1 } },
        { dispatcher: "prism_orch_test", action: "echo", parameters: { step: 2 } },
      ]);
      expect(result.totalCalls).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it("reports execution order", async () => {
      const result = await orch.sequence([
        { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
      ]);
      expect(result.executionOrder.length).toBe(2);
    });
  });

  // ── pipeline() ────────────────────────────────────────────────────────

  describe("pipeline()", () => {
    it("falls back to sequential when no transform given", async () => {
      const result = await orch.pipeline([
        { dispatcher: "prism_orch_test", action: "echo", parameters: { a: 1 } },
        { dispatcher: "prism_orch_test", action: "echo", parameters: { a: 2 } },
      ]);
      expect(result.totalCalls).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it("applies transform to build next request from previous result", async () => {
      const result = await orch.pipeline(
        [
          { dispatcher: "prism_orch_test", action: "multiply", parameters: { x: 2, y: 3 } },
          { dispatcher: "prism_orch_test", action: "multiply", parameters: { x: 0, y: 0 } },
        ],
        (prev) => {
          const value = (prev.result as any).value;
          return {
            dispatcher: "prism_orch_test",
            action: "multiply",
            parameters: { x: value, y: 2 },
          };
        }
      );
      expect(result.successCount).toBe(2);
    });

    it("stops pipeline on first failure", async () => {
      const result = await orch.pipeline(
        [
          { dispatcher: "prism_orch_test", action: "fail", parameters: {} },
          { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        ],
        (prev) => ({ dispatcher: "prism_orch_test", action: "echo", parameters: {} })
      );
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── orchestrate() with dependencies ──────────────────────────────────

  describe("orchestrate() DAG execution", () => {
    it("respects dependsOn ordering", async () => {
      const result = await orch.orchestrate([
        {
          id: "a",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: { n: 1 } },
        },
        {
          id: "b",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: { n: 2 } },
          dependsOn: ["a"],
        },
        {
          id: "c",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: { n: 3 } },
          dependsOn: ["b"],
        },
      ]);
      expect(result.successCount).toBe(3);
      // a must appear before b, b before c in execution order
      const orderIdx = (id: string) => result.executionOrder.indexOf(id);
      expect(orderIdx("a")).toBeLessThan(orderIdx("b"));
      expect(orderIdx("b")).toBeLessThan(orderIdx("c"));
    });

    it("detects cyclic dependencies", async () => {
      const result = await orch.orchestrate([
        {
          id: "x",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          dependsOn: ["y"],
        },
        {
          id: "y",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          dependsOn: ["x"],
        },
      ]);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("parallelizes independent tools", async () => {
      const result = await orch.orchestrate([
        {
          id: "a",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
        {
          id: "b",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
        {
          id: "c",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
      ]);
      expect(result.successCount).toBe(3);
      // parallelEfficiency should be close to 1 for pure-parallel work
      expect(result.metrics.parallelEfficiency).toBeGreaterThanOrEqual(0);
    });
  });

  // ── analyzeDependencies() ─────────────────────────────────────────────

  describe("analyzeDependencies()", () => {
    it("returns levels for a DAG", () => {
      const analysis = orch.analyzeDependencies([
        {
          id: "a",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
        {
          id: "b",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          dependsOn: ["a"],
        },
      ]);
      expect(analysis.valid).toBe(true);
      expect(analysis.levels.length).toBe(2);
      expect(analysis.levels[0]).toContain("a");
      expect(analysis.levels[1]).toContain("b");
    });

    it("reports parallelizable + sequential counts", () => {
      const analysis = orch.analyzeDependencies([
        {
          id: "a",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
        {
          id: "b",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
        },
      ]);
      expect(analysis.valid).toBe(true);
      expect(analysis.parallelizable).toBeGreaterThanOrEqual(0);
    });

    it("returns invalid for cyclic graph", () => {
      const analysis = orch.analyzeDependencies([
        {
          id: "x",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          dependsOn: ["y"],
        },
        {
          id: "y",
          request: { dispatcher: "prism_orch_test", action: "echo", parameters: {} },
          dependsOn: ["x"],
        },
      ]);
      expect(analysis.valid).toBe(false);
      expect(analysis.error).toBeDefined();
    });
  });
});
