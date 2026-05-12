import { describe, it, expect } from "vitest";
import { RepetitionDetectorEngine } from "../engines/RepetitionDetectorEngine.js";

describe("RepetitionDetectorEngine", () => {
  const engine = new RepetitionDetectorEngine();

  describe("analyze", () => {
    it("reports no duplicates for unique lines", () => {
      const text = "line 1\nline 2\nline 3";
      const r = engine.analyze(text);
      expect(r.duplicateCount).toBe(0);
      expect(r.duplicatePercent).toBe(0);
      expect(r.compressible).toBe(false);
    });

    it("detects duplicate lines", () => {
      const text = Array.from({ length: 20 }, () => "PASS test").join("\n");
      const r = engine.analyze(text);
      expect(r.totalLines).toBe(20);
      expect(r.uniqueLines).toBe(1);
      expect(r.duplicateCount).toBe(19);
      expect(r.compressible).toBe(true);
    });

    it("reports top repeats", () => {
      const text = "a\na\na\nb\nb\nc";
      const r = engine.analyze(text);
      expect(r.topRepeats[0].line).toBe("a");
      expect(r.topRepeats[0].count).toBe(3);
    });

    it("estimates savings", () => {
      const text = Array.from({ length: 50 }, () => "repeated line content here").join("\n");
      const r = engine.analyze(text);
      expect(r.estimatedSavings).toBeGreaterThan(100);
    });

    it("handles empty text", () => {
      const r = engine.analyze("");
      expect(r.totalLines).toBe(0);
      expect(r.duplicatePercent).toBe(0);
    });
  });

  describe("compress", () => {
    it("adds repeat markers", () => {
      const text = Array.from({ length: 5 }, () => "same line").join("\n");
      const result = engine.compress(text, 3);
      expect(result).toContain("[×5]");
      expect(result.split("\n").length).toBe(1);
    });

    it("preserves unique lines", () => {
      const text = "unique1\nunique2\nunique3";
      const result = engine.compress(text);
      expect(result).toBe(text);
    });

    it("respects minRepeats threshold", () => {
      const text = "a\na\nb";
      const result = engine.compress(text, 3);
      expect(result).not.toContain("×");
    });
  });

  describe("detectBlocks", () => {
    it("finds repeated blocks", () => {
      const block = "header\ndata\nfooter";
      const text = `${block}\n${block}\nextra`;
      const blocks = engine.detectBlocks(text, 3);
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].count).toBeGreaterThanOrEqual(2);
    });

    it("returns empty for short text", () => {
      const blocks = engine.detectBlocks("a\nb", 3);
      expect(blocks).toEqual([]);
    });
  });

  describe("oneLiner", () => {
    it("reports compressible text", () => {
      const text = Array.from({ length: 20 }, () => "repeated").join("\n");
      const line = engine.oneLiner(text);
      expect(line).toContain("dup");
      expect(line).toContain("saveable");
    });

    it("reports non-compressible text", () => {
      const text = "unique1\nunique2\nunique3";
      const line = engine.oneLiner(text);
      expect(line).toContain("not worth");
    });
  });
});
