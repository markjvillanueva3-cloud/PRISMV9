import { describe, it, expect } from "vitest";
import { ParallelCallPlannerEngine } from "../engines/ParallelCallPlannerEngine.js";
import type { PlannedCall } from "../engines/ParallelCallPlannerEngine.js";

describe("ParallelCallPlannerEngine", () => {
  const engine = new ParallelCallPlannerEngine();

  describe("plan", () => {
    it("puts independent calls in one batch", () => {
      const calls: PlannedCall[] = [
        { id: "a", tool: "Read", params: { file_path: "a.ts" } },
        { id: "b", tool: "Read", params: { file_path: "b.ts" } },
        { id: "c", tool: "Grep", params: { pattern: "foo" } },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalBatches).toBe(1);
      expect(plan.savedRoundTrips).toBe(2);
    });

    it("sequences dependent calls", () => {
      const calls: PlannedCall[] = [
        { id: "read", tool: "Read", params: { file_path: "a.ts" } },
        { id: "edit", tool: "Edit", params: { file_path: "a.ts" }, dependsOn: ["read"] },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalBatches).toBe(2);
      expect(plan.batches[0].calls[0].id).toBe("read");
      expect(plan.batches[1].calls[0].id).toBe("edit");
    });

    it("handles empty input", () => {
      const plan = engine.plan([]);
      expect(plan.totalBatches).toBe(0);
      expect(plan.totalCalls).toBe(0);
    });

    it("handles chain dependencies", () => {
      const calls: PlannedCall[] = [
        { id: "a", tool: "Glob", params: {} },
        { id: "b", tool: "Read", params: {}, dependsOn: ["a"] },
        { id: "c", tool: "Edit", params: {}, dependsOn: ["b"] },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalBatches).toBe(3);
    });

    it("mixes parallel and sequential", () => {
      const calls: PlannedCall[] = [
        { id: "r1", tool: "Read", params: { file_path: "a.ts" } },
        { id: "r2", tool: "Read", params: { file_path: "b.ts" } },
        { id: "e1", tool: "Edit", params: { file_path: "a.ts" }, dependsOn: ["r1"] },
        { id: "e2", tool: "Edit", params: { file_path: "b.ts" }, dependsOn: ["r2"] },
      ];
      const plan = engine.plan(calls);
      expect(plan.totalBatches).toBe(2);
      expect(plan.batches[0].calls.length).toBe(2); // both reads parallel
      expect(plan.batches[1].calls.length).toBe(2); // both edits parallel
    });
  });

  describe("inferDependencies", () => {
    it("detects Edit depends on Read", () => {
      const calls = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "a.ts" } },
      ];
      const planned = engine.inferDependencies(calls);
      expect(planned[1].dependsOn).toContain("call-0");
    });

    it("detects git command chains", () => {
      const calls = [
        { tool: "Bash", params: { command: "git add a.ts" } },
        { tool: "Bash", params: { command: "git commit -m 'msg'" } },
      ];
      const planned = engine.inferDependencies(calls);
      expect(planned[1].dependsOn).toContain("call-0");
    });
  });

  describe("canParallel", () => {
    it("returns true for different read targets", () => {
      const calls = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "b.ts" } },
      ];
      expect(engine.canParallel(calls)).toBe(true);
    });

    it("returns false for same read target", () => {
      const calls = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Read", params: { file_path: "a.ts" } },
      ];
      expect(engine.canParallel(calls)).toBe(false);
    });

    it("returns false when writes are involved", () => {
      const calls = [
        { tool: "Read", params: { file_path: "a.ts" } },
        { tool: "Edit", params: { file_path: "b.ts" } },
      ];
      expect(engine.canParallel(calls)).toBe(false);
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const plan = engine.plan([
        { id: "a", tool: "Read", params: {} },
        { id: "b", tool: "Read", params: {} },
      ]);
      const line = engine.oneLiner(plan);
      expect(line).toContain("2 calls");
      expect(line).toContain("batch");
    });
  });
});
