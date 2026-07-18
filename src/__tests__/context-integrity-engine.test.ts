import { describe, it, expect, beforeEach } from "vitest";
import { ContextIntegrityEngine } from "../engines/ContextIntegrityEngine.js";

describe("ContextIntegrityEngine", () => {
  let engine: ContextIntegrityEngine;

  beforeEach(() => {
    engine = new ContextIntegrityEngine();
  });

  describe("file tracking", () => {
    it("records reads and allows edits to recently read files", () => {
      engine.recordRead("C:/PRISM/mcp-server/src/index.ts");
      const alert = engine.checkEdit("C:/PRISM/mcp-server/src/index.ts");
      expect(alert).toBeNull();
    });

    it("blocks edits to files never read", () => {
      const alert = engine.checkEdit("C:/PRISM/mcp-server/src/unknown.ts");
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("edit-without-read");
      expect(alert!.severity).toBe("block");
    });

    it("warns about editing files modified since last read", () => {
      engine.recordRead("C:/foo.ts");
      engine.recordEdit("C:/foo.ts");
      const alert = engine.checkEdit("C:/foo.ts");
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("stale-context");
    });

    it("normalizes paths (backslashes and case)", () => {
      engine.recordRead("C:\\PRISM\\mcp-server\\src\\Index.ts");
      const alert = engine.checkEdit("C:/PRISM/mcp-server/src/index.ts");
      expect(alert).toBeNull();
    });

    it("warns when file read is stale (many calls ago)", () => {
      engine.recordRead("C:/foo.ts");
      // Simulate 35 tool calls
      for (let i = 0; i < 35; i++) engine.tick();
      const alert = engine.checkEdit("C:/foo.ts");
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("stale-context");
      expect(alert!.detail).toContain("35 calls");
    });
  });

  describe("agent tracking", () => {
    it("records agent launch and successful completion", () => {
      engine.recordAgentLaunch("a1", "Fix types", ["src/a.ts", "src/b.ts"]);
      const alert = engine.recordAgentCompletion("a1", "All done", ["src/a.ts", "src/b.ts"]);
      expect(alert).toBeNull();
    });

    it("detects agent silent failure (usage limit)", () => {
      engine.recordAgentLaunch("a2", "Fix tests", ["src/test.ts"]);
      const alert = engine.recordAgentCompletion("a2", "Out of extra usage", []);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("agent-silent-fail");
      expect(alert!.detail).toContain("hit an error");
    });

    it("detects agent that made no changes", () => {
      engine.recordAgentLaunch("a3", "Refactor code", ["src/engine.ts"]);
      const alert = engine.recordAgentCompletion("a3", "Completed successfully", []);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("agent-silent-fail");
      expect(alert!.detail).toContain("no file changes");
    });

    it("detects agent that missed some target files", () => {
      engine.recordAgentLaunch("a4", "Fix 3 files", ["src/a.ts", "src/b.ts", "src/c.ts"]);
      const alert = engine.recordAgentCompletion("a4", "Done", ["src/a.ts"]);
      expect(alert).not.toBeNull();
      expect(alert!.detail).toContain("missed 2/3");
    });

    it("returns null for unknown agent completion", () => {
      const alert = engine.recordAgentCompletion("unknown", "Done", []);
      expect(alert).toBeNull();
    });
  });

  describe("compaction tracking", () => {
    it("records compaction and marks reads as stale", () => {
      engine.recordRead("C:/foo.ts");
      engine.recordCompaction(["task: fix types", "file: foo.ts"]);
      const alert = engine.checkEdit("C:/foo.ts");
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe("stale-context");
    });

    it("generates compaction survival facts for running agents", () => {
      engine.recordAgentLaunch("a1", "Fix tests", ["src/test.ts"]);
      const facts = engine.getCompactionSurvivalFacts();
      expect(facts.length).toBeGreaterThan(0);
      expect(facts[0]).toContain("AGENT RUNNING");
    });

    it("includes recently edited files in survival facts", () => {
      engine.recordRead("C:/foo.ts");
      engine.recordEdit("C:/foo.ts");
      const facts = engine.getCompactionSurvivalFacts();
      expect(facts.some(f => f.includes("RECENTLY EDITED"))).toBe(true);
    });
  });

  describe("report", () => {
    it("generates healthy report with no issues", () => {
      engine.recordRead("C:/foo.ts");
      const report = engine.report();
      expect(report.healthScore).toBe(100);
      expect(report.filesTracked).toBe(1);
      expect(report.staleFiles).toBe(0);
      expect(report.alerts).toHaveLength(0);
    });

    it("degrades health score for stale files", () => {
      engine.recordRead("C:/foo.ts");
      for (let i = 0; i < 35; i++) engine.tick();
      const report = engine.report();
      expect(report.staleFiles).toBe(1);
      expect(report.healthScore).toBeLessThan(100);
    });

    it("degrades health score for compactions", () => {
      engine.recordCompaction(["fact1"]);
      const report = engine.report();
      expect(report.healthScore).toBeLessThan(100);
    });

    it("reports empty state correctly", () => {
      const report = engine.report();
      expect(report.filesTracked).toBe(0);
      expect(report.healthScore).toBe(100);
    });
  });

  describe("reset", () => {
    it("clears all tracking state", () => {
      engine.recordRead("C:/foo.ts");
      engine.recordAgentLaunch("a1", "Test", ["src/a.ts"]);
      engine.recordCompaction(["fact"]);
      engine.reset();
      const report = engine.report();
      expect(report.filesTracked).toBe(0);
      expect(report.agentTasks).toHaveLength(0);
      expect(report.healthScore).toBe(100);
    });
  });
});
