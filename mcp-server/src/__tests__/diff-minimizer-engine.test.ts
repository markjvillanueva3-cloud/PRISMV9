import { describe, it, expect } from "vitest";
import { DiffMinimizerEngine } from "../engines/DiffMinimizerEngine.js";

describe("DiffMinimizerEngine", () => {
  const engine = new DiffMinimizerEngine();

  describe("minimize", () => {
    it("uses target line when unique", () => {
      const content = "line 1\nline 2\nline 3";
      const result = engine.minimize(content, "line 2", "changed 2");
      expect(result.isUnique).toBe(true);
      expect(result.oldString).toBe("line 2");
    });

    it("adds context when target is not unique", () => {
      const content = "header\nvalue\nfooter\nsection2\nvalue\nend";
      const result = engine.minimize(content, "value", "new value", 1);
      expect(result.isUnique).toBe(true);
      expect(result.oldString).toContain("value");
    });

    it("falls back to line above for disambiguation", () => {
      const content = "a\ndup\nb\ndup";
      const result = engine.minimize(content, "dup", "changed");
      expect(result.oldString).toContain("a");
    });
  });

  describe("analyzeEdits", () => {
    it("calculates edit statistics", () => {
      const edits = [
        { oldString: "short", newString: "new" },
        { oldString: "a".repeat(300), newString: "b".repeat(50) },
      ];
      const a = engine.analyzeEdits(edits);
      expect(a.totalEdits).toBe(2);
      expect(a.canOptimize).toBe(1);
      expect(a.estimatedTokens).toBeGreaterThan(0);
    });

    it("reports token estimate", () => {
      const edits = [{ oldString: "x".repeat(400), newString: "y".repeat(100) }];
      const a = engine.analyzeEdits(edits);
      expect(a.estimatedTokens).toBe(Math.ceil(500 / 4));
    });
  });

  describe("canCombine", () => {
    it("finds adjacent edits in same file", () => {
      const edits = [
        { file: "a.ts", lineNumber: 10 },
        { file: "a.ts", lineNumber: 12 },
        { file: "a.ts", lineNumber: 15 },
      ];
      const suggestions = engine.canCombine(edits);
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].lines.length).toBe(3);
    });

    it("does not combine distant edits", () => {
      const edits = [
        { file: "a.ts", lineNumber: 10 },
        { file: "a.ts", lineNumber: 100 },
      ];
      const suggestions = engine.canCombine(edits);
      expect(suggestions.length).toBe(0);
    });

    it("separates by file", () => {
      const edits = [
        { file: "a.ts", lineNumber: 10 },
        { file: "b.ts", lineNumber: 10 },
      ];
      const suggestions = engine.canCombine(edits);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const edits = [
        { oldString: "old1", newString: "new1" },
        { oldString: "old2", newString: "new2" },
      ];
      const line = engine.oneLiner(edits);
      expect(line).toContain("2 edits");
    });
  });
});
