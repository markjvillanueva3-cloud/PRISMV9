import { describe, it, expect, beforeEach } from "vitest";
import { ToolCallBatchEngine } from "../engines/ToolCallBatchEngine.js";

describe("ToolCallBatchEngine", () => {
  let engine: ToolCallBatchEngine;

  beforeEach(() => {
    engine = new ToolCallBatchEngine();
  });

  describe("record and getStats", () => {
    it("tracks tool calls", () => {
      engine.record("Read", { file_path: "/a.ts" });
      engine.record("Grep", { pattern: "foo" });
      engine.record("Edit", { file_path: "/b.ts" });
      const stats = engine.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byTool["Read"]).toBe(1);
      expect(stats.byTool["Grep"]).toBe(1);
      expect(stats.byTool["Edit"]).toBe(1);
    });

    it("calculates parallel ratio", () => {
      engine.record("Read");
      engine.record("Grep");
      engine.record("Edit");
      engine.record("Glob");
      const stats = engine.getStats();
      // Read, Grep, Glob = parallel safe (3/4 = 75%)
      expect(stats.parallelRatio).toBe(75);
    });

    it("caps history at maxHistory", () => {
      for (let i = 0; i < 60; i++) {
        engine.record("Read", { file_path: `/file${i}.ts` });
      }
      expect(engine.getStats().total).toBe(50);
    });
  });

  describe("analyze", () => {
    it("detects multiple-reads pattern", () => {
      engine.record("Read", { file_path: "/a.ts" });
      engine.record("Read", { file_path: "/b.ts" });
      engine.record("Read", { file_path: "/c.ts" });
      const opps = engine.analyze();
      const readOpp = opps.find(o => o.reason.includes("multiple-reads"));
      expect(readOpp).toBeDefined();
      expect(readOpp!.calls.length).toBe(3);
    });

    it("detects multiple-globs same path", () => {
      engine.record("Glob", { pattern: "**/*.ts", path: "/src" });
      engine.record("Glob", { pattern: "**/*.js", path: "/src" });
      const opps = engine.analyze();
      const globOpp = opps.find(o => o.reason.includes("multiple-globs"));
      expect(globOpp).toBeDefined();
    });

    it("detects read-then-grep-same pattern", () => {
      engine.record("Read", { file_path: "/src/foo.ts" });
      engine.record("Grep", { pattern: "export", path: "/src/foo.ts" });
      const opps = engine.analyze();
      const rg = opps.find(o => o.reason.includes("read-then-grep-same"));
      expect(rg).toBeDefined();
    });

    it("returns empty for no patterns", () => {
      engine.record("Edit", { file_path: "/a.ts" });
      const opps = engine.analyze();
      // Edit alone shouldn't match any pattern
      expect(opps.length).toBe(0);
    });
  });

  describe("canBatch", () => {
    it("identifies parallel-safe tools as batchable", () => {
      engine.record("Read");
      const result = engine.canBatch("Grep");
      expect(result.batchable).toBe(true);
      expect(result.with).toContain("Read");
    });

    it("rejects sequential tools", () => {
      engine.record("Read");
      const result = engine.canBatch("Edit");
      expect(result.batchable).toBe(false);
    });
  });

  describe("getSummary", () => {
    it("returns no-opportunity message when clean", () => {
      engine.record("Edit", { file_path: "/a.ts" });
      expect(engine.getSummary()).toContain("No batching");
    });

    it("returns opportunity summary", () => {
      engine.record("Read", { file_path: "/a.ts" });
      engine.record("Read", { file_path: "/b.ts" });
      const summary = engine.getSummary();
      expect(summary).toContain("batching opportunities");
      expect(summary).toContain("tokens");
    });
  });

  describe("reset", () => {
    it("clears history", () => {
      engine.record("Read");
      engine.record("Grep");
      engine.reset();
      expect(engine.getStats().total).toBe(0);
    });
  });
});
