import { describe, it, expect, beforeEach } from "vitest";
import { BatchQueryEngine } from "../engines/BatchQueryEngine.js";

describe("BatchQueryEngine", () => {
  let engine: BatchQueryEngine;

  beforeEach(() => {
    engine = new BatchQueryEngine();
  });

  describe("registerDispatcher", () => {
    it("registers a dispatcher handler", () => {
      engine.registerDispatcher("test_tool", async () => ({ result: "ok" }));
      expect(engine.getRegisteredDispatchers()).toContain("test_tool");
    });
  });

  describe("executeBatch", () => {
    it("executes multiple actions sequentially", async () => {
      engine.registerDispatcher("math", async (params) => {
        if (params.action === "add") return { content: [{ type: "text", text: JSON.stringify({ sum: 5 }) }] };
        if (params.action === "mul") return { content: [{ type: "text", text: JSON.stringify({ product: 12 }) }] };
        return {};
      });

      const response = await engine.executeBatch([
        { tool: "math", action: "add", params: { a: 2, b: 3 }, label: "addition" },
        { tool: "math", action: "mul", params: { a: 3, b: 4 }, label: "multiply" }
      ]);

      expect(response.passed).toBe(2);
      expect(response.failed).toBe(0);
      expect(response.results).toHaveLength(2);
      expect(response.results[0].label).toBe("addition");
      expect(response.results[0].ok).toBe(true);
      expect(response.results[0].data.sum).toBe(5);
      expect(response.results[1].data.product).toBe(12);
    });

    it("handles unknown dispatchers gracefully", async () => {
      const response = await engine.executeBatch([
        { tool: "nonexistent", action: "foo" }
      ]);

      expect(response.passed).toBe(0);
      expect(response.failed).toBe(1);
      expect(response.results[0].error).toContain("Unknown dispatcher");
    });

    it("handles action errors gracefully", async () => {
      engine.registerDispatcher("broken", async () => {
        throw new Error("Something went wrong");
      });

      const response = await engine.executeBatch([
        { tool: "broken", action: "fail" }
      ]);

      expect(response.failed).toBe(1);
      expect(response.results[0].error).toContain("Something went wrong");
    });

    it("mixed success and failure", async () => {
      engine.registerDispatcher("mixed", async (params) => {
        if (params.action === "ok") return { content: [{ type: "text", text: '"success"' }] };
        throw new Error("fail");
      });

      const response = await engine.executeBatch([
        { tool: "mixed", action: "ok" },
        { tool: "mixed", action: "bad" },
        { tool: "mixed", action: "ok" }
      ]);

      expect(response.passed).toBe(2);
      expect(response.failed).toBe(1);
      expect(response.summary).toContain("2/3 ok");
    });

    it("records execution time", async () => {
      engine.registerDispatcher("slow", async () => {
        await new Promise(r => setTimeout(r, 10));
        return {};
      });

      const response = await engine.executeBatch([
        { tool: "slow", action: "wait" }
      ]);

      expect(response.total_ms).toBeGreaterThanOrEqual(5);
      expect(response.results[0].ms).toBeGreaterThanOrEqual(5);
    });

    it("generates summary string", async () => {
      engine.registerDispatcher("t", async () => ({}));
      const response = await engine.executeBatch([{ tool: "t", action: "a" }]);
      expect(response.summary).toContain("1/1 ok");
    });
  });

  describe("executeBatchParallel", () => {
    it("executes actions in parallel", async () => {
      const callOrder: string[] = [];
      engine.registerDispatcher("parallel", async (params) => {
        callOrder.push(params.action);
        await new Promise(r => setTimeout(r, 5));
        return { content: [{ type: "text", text: `"${params.action}"` }] };
      });

      const response = await engine.executeBatchParallel([
        { tool: "parallel", action: "a" },
        { tool: "parallel", action: "b" },
        { tool: "parallel", action: "c" }
      ]);

      expect(response.passed).toBe(3);
      expect(response.results).toHaveLength(3);
      expect(response.summary).toContain("parallel");
    });
  });

  describe("getRegisteredDispatchers", () => {
    it("returns empty array initially", () => {
      expect(engine.getRegisteredDispatchers()).toEqual([]);
    });

    it("returns all registered names", () => {
      engine.registerDispatcher("a", async () => ({}));
      engine.registerDispatcher("b", async () => ({}));
      expect(engine.getRegisteredDispatchers()).toEqual(["a", "b"]);
    });
  });
});
