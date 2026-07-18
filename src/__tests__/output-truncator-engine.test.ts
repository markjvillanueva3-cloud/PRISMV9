import { describe, it, expect } from "vitest";
import { OutputTruncatorEngine } from "../engines/OutputTruncatorEngine.js";

describe("OutputTruncatorEngine", () => {
  const engine = new OutputTruncatorEngine();

  describe("truncate", () => {
    it("returns short text unchanged", () => {
      expect(engine.truncate("hello", { maxChars: 100 })).toBe("hello");
    });

    it("preserves head and tail", () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1} ${"x".repeat(20)}`);
      const text = lines.join("\n");
      const result = engine.truncate(text, { maxChars: 800, preserveHead: 3, preserveTail: 2 });
      expect(result).toContain("line 1");
      expect(result).toContain("line 2");
      expect(result).toContain("line 3");
      expect(result).toContain("line 49");
      expect(result).toContain("line 50");
      expect(result).toContain("omitted");
    });

    it("adds marker by default", () => {
      const text = "a".repeat(5000);
      const result = engine.truncate(text, { maxChars: 100 });
      expect(result).toContain("[truncated]");
    });

    it("respects addMarker=false", () => {
      const text = "a".repeat(5000);
      const result = engine.truncate(text, { maxChars: 100, addMarker: false });
      expect(result).not.toContain("[truncated]");
    });
  });

  describe("truncateJson", () => {
    it("returns short JSON unchanged", () => {
      const data = { a: 1, b: 2 };
      const result = engine.truncateJson(data, 1000);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it("truncates arrays by reducing items", () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item ${i}` }));
      const result = engine.truncateJson(data, 500);
      expect(result).toContain("more items");
      expect(result.length).toBeLessThan(1000);
    });

    it("truncates objects by removing fields", () => {
      const data: Record<string, string> = {};
      for (let i = 0; i < 50; i++) data[`key${i}`] = `value ${i} - long text here`;
      const result = engine.truncateJson(data, 500);
      expect(result).toContain("more fields");
    });
  });

  describe("truncateFileList", () => {
    it("returns short lists unchanged", () => {
      const files = ["/a.ts", "/b.ts"];
      expect(engine.truncateFileList(files, 10)).toBe("/a.ts\n/b.ts");
    });

    it("truncates long lists", () => {
      const files = Array.from({ length: 50 }, (_, i) => `/file${i}.ts`);
      const result = engine.truncateFileList(files, 5);
      expect(result).toContain("/file0.ts");
      expect(result).toContain("/file4.ts");
      expect(result).toContain("45 more files");
    });
  });

  describe("truncateSearchResults", () => {
    it("returns short results unchanged", () => {
      const results = "match1\nmatch2\nmatch3";
      expect(engine.truncateSearchResults(results, 10)).toBe(results);
    });

    it("truncates long results", () => {
      const lines = Array.from({ length: 30 }, (_, i) => `result ${i}`);
      const result = engine.truncateSearchResults(lines.join("\n"), 5);
      expect(result).toContain("result 0");
      expect(result).toContain("25 more matches");
    });
  });

  describe("savings", () => {
    it("calculates savings correctly", () => {
      const text = "a".repeat(8000);
      const s = engine.savings(text, 2000);
      expect(s.saved).toBeGreaterThan(0);
      expect(s.percent).toBeGreaterThan(50);
    });

    it("returns zero savings for short text", () => {
      const s = engine.savings("hello", 1000);
      expect(s.saved).toBe(0);
      expect(s.percent).toBe(0);
    });
  });

  describe("auto", () => {
    it("detects and truncates JSON arrays", () => {
      const data = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const json = JSON.stringify(data, null, 2);
      const result = engine.auto(json, 500);
      expect(result).toContain("more items");
    });

    it("detects and truncates file lists", () => {
      const files = Array.from({ length: 50 }, (_, i) => `/src/file${i}.ts`).join("\n");
      const result = engine.auto(files, 500);
      expect(result).toContain("more files");
    });

    it("falls back to smart truncate", () => {
      const text = Array.from({ length: 50 }, (_, i) => `line ${i}:  some content here ${"y".repeat(30)}`).join("\n");
      const result = engine.auto(text, 2000);
      expect(result).toContain("omitted");
    });
  });
});
