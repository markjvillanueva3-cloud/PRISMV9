import { describe, it, expect } from "vitest";
import { ToolOutputSummarizerEngine } from "../engines/ToolOutputSummarizerEngine.js";

describe("ToolOutputSummarizerEngine", () => {
  const engine = new ToolOutputSummarizerEngine();

  describe("detect", () => {
    it("detects test results", () => {
      expect(engine.detect("Test Files  1 passed\nTests  5 passed\n✓ foo")).toBe("test-results");
    });

    it("detects build output", () => {
      expect(engine.detect("src/index.ts(5,3): error TS2339: Property does not exist")).toBe("build-output");
    });

    it("detects git status", () => {
      expect(engine.detect("M  src/index.ts\n?? new-file.ts\nD  old.ts")).toBe("git-status");
    });

    it("detects git log", () => {
      expect(engine.detect("abc1234 feat: add engine\ndef5678 fix: test")).toBe("git-log");
    });

    it("detects file list", () => {
      const files = Array.from({ length: 10 }, (_, i) => `file${i}.ts`).join("\n");
      expect(engine.detect(files)).toBe("file-list");
    });

    it("detects search results", () => {
      expect(engine.detect("src/a.ts:10: const foo\nsrc/b.ts:20: let bar")).toBe("search-results");
    });
  });

  describe("summarize", () => {
    it("summarizes test results", () => {
      const output = "✓ test1\n✓ test2\nTest Files  1 passed\nTests  2 passed";
      const r = engine.summarize(output);
      expect(r.type).toBe("test-results");
      expect(r.summary).toContain("passed");
    });

    it("summarizes build errors", () => {
      const errors = Array.from({ length: 10 }, (_, i) => `src/file${i}.ts(${i},1): error TS2339: oops`);
      const output = errors.join("\n");
      const r = engine.summarize(output);
      expect(r.type).toBe("build-output");
      expect(r.summary).toContain("10 errors");
    });

    it("summarizes git status", () => {
      const output = "M  a.ts\nM  b.ts\n?? c.ts\nD  d.ts";
      const r = engine.summarize(output);
      expect(r.summary).toContain("2 modified");
      expect(r.summary).toContain("1 added");
    });

    it("truncates long file lists", () => {
      const files = Array.from({ length: 50 }, (_, i) => `file${i}.ts`).join("\n");
      const r = engine.summarize(files, 5);
      expect(r.summary).toContain("more files");
      expect(r.savings).toBeGreaterThan(0);
    });

    it("handles generic output", () => {
      const lines = Array.from({ length: 30 }, (_, i) => `output line ${i}`).join("\n");
      const r = engine.summarize(lines, 6);
      expect(r.summary).toContain("omitted");
    });
  });

  describe("oneLiner", () => {
    it("produces compact summary", () => {
      const line = engine.oneLiner("✓ test\nTest Files  1 passed\nTests  1 passed");
      expect(line).toContain("test-results");
      expect(line).toContain("saved");
    });
  });
});
