import { describe, it, expect } from "vitest";
import { EditPlannerEngine } from "../engines/EditPlannerEngine.js";

describe("EditPlannerEngine", () => {
  const engine = new EditPlannerEngine();

  describe("findMinimalContext", () => {
    it("finds unique single line", () => {
      const content = "line 1\nunique target line\nline 3";
      const result = engine.findMinimalContext(content, "unique target");
      expect(result.unique).toBe(true);
      expect(result.contextLines).toBe(0);
    });

    it("expands context for non-unique lines", () => {
      const content = "const x = 1;\nreturn x;\nconst y = 2;\nreturn x;\nconst z = 3;";
      const result = engine.findMinimalContext(content, "return x");
      expect(result.contextLines).toBeGreaterThan(0);
    });

    it("returns non-unique for missing target", () => {
      const content = "line 1\nline 2";
      const result = engine.findMinimalContext(content, "nonexistent");
      expect(result.unique).toBe(false);
    });
  });

  describe("planBatch", () => {
    it("plans a batch of edits", () => {
      const batch = engine.planBatch("src/a.ts", [
        { filePath: "src/a.ts", oldText: "old1", newText: "new1", line: 10 },
        { filePath: "src/a.ts", oldText: "old2", newText: "new2", line: 11 },
      ]);
      expect(batch.edits.length).toBe(2);
      expect(batch.totalTokenCost).toBeGreaterThan(0);
    });

    it("detects combinable adjacent edits", () => {
      const batch = engine.planBatch("src/a.ts", [
        { filePath: "src/a.ts", oldText: "line1", newText: "new1", line: 5 },
        { filePath: "src/a.ts", oldText: "line2", newText: "new2", line: 6 },
      ]);
      expect(batch.canCombine).toBe(true);
      expect(batch.combinedEdit).toBeDefined();
    });

    it("rejects non-adjacent edits for combining", () => {
      const batch = engine.planBatch("src/a.ts", [
        { filePath: "src/a.ts", oldText: "line1", newText: "new1", line: 5 },
        { filePath: "src/a.ts", oldText: "line2", newText: "new2", line: 50 },
      ]);
      expect(batch.canCombine).toBe(false);
    });
  });

  describe("estimateSavings", () => {
    it("calculates token savings", () => {
      const full = "x".repeat(200);
      const minimal = "x".repeat(50);
      const savings = engine.estimateSavings(full, minimal);
      expect(savings).toBeGreaterThan(0);
    });
  });

  describe("suggestTool", () => {
    it("suggests Edit for small changes", () => {
      const result = engine.suggestTool(10000, 100);
      expect(result.tool).toBe("Edit");
    });

    it("suggests Write for large changes", () => {
      const result = engine.suggestTool(1000, 800);
      expect(result.tool).toBe("Write");
    });
  });
});
