/**
 * ToolCallParallelizationEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ToolCallParallelizationEngine } from "../engines/ToolCallParallelizationEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("ToolCallParallelizationEngine", () => {
  let engine: ToolCallParallelizationEngine;
  const stateDir = "H:/prism/state/tool-call-parallelization";

  // Isolate this test file's state from other concurrent test files
  process.env.CLAUDE_SESSION_ID = "test-tool-call-parallel";

  beforeEach(() => {
    const stateFile = `${stateDir}/parallelization-test-tool-call-parallel.json`;
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new ToolCallParallelizationEngine();
  });

  describe("recordCall", () => {
    it("records tool call with auto-generated ID", () => {
      const call = engine.recordCall("Read", { file_path: "/a.ts" });
      expect(call.id).toMatch(/^tc_/);
      expect(call.tool).toBe("Read");
      expect(call.filesReferenced).toEqual(["/a.ts"]);
      expect(call.inParallelBatch).toBe(false);
    });

    it("extracts file references from various input shapes", () => {
      const c1 = engine.recordCall("Read", { file_path: "/a.ts" });
      const c2 = engine.recordCall("Bash", { path: "/b.sh" });
      const c3 = engine.recordCall("NotebookEdit", { notebook_path: "/c.ipynb" } as any);
      expect(c1.filesReferenced).toContain("/a.ts");
      expect(c2.filesReferenced).toContain("/b.sh");
      expect(c3.filesReferenced).toContain("/c.ipynb");
    });

    it("tracks parallel batch flag", () => {
      const call = engine.recordCall("Read", { file_path: "/a.ts" }, { inParallelBatch: true });
      expect(call.inParallelBatch).toBe(true);
    });
  });

  describe("analyze - sequential read detection", () => {
    it("flags 3 sequential reads of different files as parallelizable", () => {
      engine.recordCall("Read", { file_path: "/a.ts" });
      engine.recordCall("Read", { file_path: "/b.ts" });
      engine.recordCall("Read", { file_path: "/c.ts" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(1);
      expect(report.opportunities[0].wastedRoundTrips).toBe(2); // 3 calls - 1 batch
      expect(report.totalEstimatedTimeSavedMs).toBeGreaterThan(0);
    });

    it("does NOT flag parallel batch calls", () => {
      engine.recordCall("Read", { file_path: "/a.ts" }, { inParallelBatch: true });
      engine.recordCall("Read", { file_path: "/b.ts" }, { inParallelBatch: true });
      engine.recordCall("Read", { file_path: "/c.ts" }, { inParallelBatch: true });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(0);
      expect(report.parallelCalls).toBe(3);
    });

    it("does NOT flag a single read", () => {
      engine.recordCall("Read", { file_path: "/a.ts" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(0);
    });
  });

  describe("analyze - dependency detection", () => {
    it("does NOT flag Write→Read of same file as parallelizable", () => {
      engine.recordCall("Write", { file_path: "/x.ts", content: "..." });
      engine.recordCall("Read", { file_path: "/x.ts" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(0);
    });

    it("does NOT flag Edit→Edit on same file as parallelizable", () => {
      engine.recordCall("Edit", { file_path: "/x.ts", old_string: "a", new_string: "b" });
      engine.recordCall("Edit", { file_path: "/x.ts", old_string: "c", new_string: "d" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(0);
    });

    it("flags reads of different files as parallelizable even after a write", () => {
      engine.recordCall("Write", { file_path: "/x.ts", content: "..." });
      engine.recordCall("Read", { file_path: "/a.ts" });
      engine.recordCall("Read", { file_path: "/b.ts" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("analyze - mixed tool types", () => {
    it("flags Glob+Grep+Read as parallelizable (all read-only)", () => {
      engine.recordCall("Glob", { pattern: "**/*.ts" });
      engine.recordCall("Grep", { pattern: "TODO" });
      engine.recordCall("Read", { file_path: "/a.ts" });
      const report = engine.analyze();
      expect(report.opportunities.length).toBe(1);
    });

    it("does NOT flag mixed mutating tools without same-file dependency check coverage", () => {
      engine.recordCall("Bash", { command: "ls" });
      engine.recordCall("Write", { file_path: "/a.ts", content: "" });
      const report = engine.analyze();
      // Different tools, mutating - conservative, not parallelizable
      expect(report.opportunities.length).toBe(0);
    });
  });

  describe("analyze - report metrics", () => {
    it("computes parallelization rate correctly", () => {
      engine.recordCall("Read", { file_path: "/a.ts" }, { inParallelBatch: true });
      engine.recordCall("Read", { file_path: "/b.ts" }, { inParallelBatch: true });
      engine.recordCall("Read", { file_path: "/c.ts" });
      const report = engine.analyze();
      expect(report.totalCalls).toBe(3);
      expect(report.parallelCalls).toBe(2);
      expect(report.sequentialCalls).toBe(1);
      expect(report.parallelizationRate).toBeCloseTo(2 / 3, 2);
    });

    it("returns rate of 1.0 when no calls recorded", () => {
      const report = engine.analyze();
      expect(report.parallelizationRate).toBe(1);
      expect(report.totalCalls).toBe(0);
    });

    it("recommends batching when rate is low and many sequential calls", () => {
      for (let i = 0; i < 5; i++) {
        engine.recordCall("Read", { file_path: `/f${i}.ts` });
      }
      const report = engine.analyze();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => /parallel|batch/i.test(r))).toBe(true);
    });

    it("praises good parallelization discipline", () => {
      for (let i = 0; i < 5; i++) {
        engine.recordCall("Read", { file_path: `/f${i}.ts` }, { inParallelBatch: true });
      }
      const report = engine.analyze();
      expect(report.recommendations.some((r) => /good/i.test(r))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty inputs object", () => {
      const call = engine.recordCall("Bash", {});
      expect(call.filesReferenced).toEqual([]);
    });

    it("handles paths array input", () => {
      const call = engine.recordCall("Other", { paths: ["/a", "/b", "/c"] });
      expect(call.filesReferenced).toEqual(["/a", "/b", "/c"]);
    });

    it("prunes calls beyond MAX_CALLS limit", () => {
      for (let i = 0; i < 1100; i++) {
        engine.recordCall("Read", { file_path: `/f${i}.ts` });
      }
      const calls = engine.getCalls();
      expect(calls.length).toBeLessThanOrEqual(1000);
    });

    it("handles NaN/Infinity in token cost gracefully", () => {
      const call = engine.recordCall("Read", { file_path: "/a.ts" }, { tokenCost: NaN });
      // NaN should be coalesced or stored - engine should not crash
      expect(call).toBeTruthy();
      expect(typeof call.tokenCost).toBe("number");
    });
  });

  describe("reset and persistence", () => {
    it("persists calls across engine instances", () => {
      engine.recordCall("Read", { file_path: "/a.ts" });
      const engine2 = new ToolCallParallelizationEngine();
      expect(engine2.getCalls().length).toBe(1);
    });

    it("reset clears all state", () => {
      engine.recordCall("Read", { file_path: "/a.ts" });
      engine.recordCall("Read", { file_path: "/b.ts" });
      engine.reset();
      expect(engine.getCalls().length).toBe(0);
    });

    it("stores reports for historical analysis", () => {
      engine.recordCall("Read", { file_path: "/a.ts" });
      engine.recordCall("Read", { file_path: "/b.ts" });
      engine.analyze();
      engine.analyze();
      expect(engine.getReports().length).toBe(2);
    });
  });
});
