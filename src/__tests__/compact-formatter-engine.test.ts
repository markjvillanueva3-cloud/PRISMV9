import { describe, it, expect } from "vitest";
import { CompactFormatterEngine } from "../engines/CompactFormatterEngine.js";

describe("CompactFormatterEngine", () => {
  const engine = new CompactFormatterEngine();

  describe("table", () => {
    it("formats array of records as compact table", () => {
      const data = [
        { name: "Foo", count: 5 },
        { name: "Bar", count: 3 },
        { name: "Baz", count: 1 }
      ];
      expect(engine.table(data, "name", "count")).toBe("Foo:5 | Bar:3 | Baz:1");
    });

    it("handles custom separator", () => {
      const data = [{ k: "a", v: 1 }, { k: "b", v: 2 }];
      expect(engine.table(data, "k", "v", ", ")).toBe("a:1, b:2");
    });
  });

  describe("kvPairs", () => {
    it("formats inline key=value pairs", () => {
      const result = engine.kvPairs({ engines: 375, dispatchers: 54, actions: 1670 });
      expect(result).toBe("engines=375 dispatchers=54 actions=1670");
    });

    it("formats multiline key=value pairs", () => {
      const result = engine.kvPairs({ a: 1, b: 2 }, false);
      expect(result).toBe("a=1\nb=2");
    });

    it("skips null and undefined values", () => {
      const result = engine.kvPairs({ a: 1, b: null, c: undefined, d: 4 });
      expect(result).toBe("a=1 d=4");
    });
  });

  describe("summarizeArray", () => {
    it("shows all items if under limit", () => {
      expect(engine.summarizeArray([1, 2, 3])).toBe("1, 2, 3");
    });

    it("truncates with count when over limit", () => {
      const result = engine.summarizeArray([1, 2, 3, 4, 5, 6, 7, 8], 3);
      expect(result).toBe("1, 2, 3 ...+5 more");
    });

    it("supports custom formatter", () => {
      const result = engine.summarizeArray(["foo", "bar"], 5, s => s.toUpperCase());
      expect(result).toBe("FOO, BAR");
    });
  });

  describe("compact", () => {
    it("compacts nested objects", () => {
      const data = { a: { b: { c: "deep" } }, x: [1, 2, 3] };
      const result = engine.compact(data);
      expect(result).toContain("a:");
      expect(result).toContain("x:");
    });

    it("respects maxChars", () => {
      const data = { longKey: "x".repeat(5000) };
      const result = engine.compact(data, { maxChars: 100 });
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it("minimal level collapses deeply", () => {
      const data = { a: { b: { c: "deep" } } };
      const minimal = engine.compact(data, { level: "minimal" });
      expect(minimal).toContain("{1 keys}");
    });
  });

  describe("systemLine", () => {
    it("formats counts with abbreviations", () => {
      const result = engine.systemLine({ engines: 375, dispatchers: 54, actions: 1670 });
      expect(result).toBe("375E/54D/1670A");
    });
  });

  describe("compactTestResult", () => {
    it("formats passing tests", () => {
      expect(engine.compactTestResult(5848, 0)).toBe("5848✓");
    });

    it("formats mixed results", () => {
      expect(engine.compactTestResult(5848, 1, 11)).toBe("5848✓ 1✗ 11⊘");
    });
  });

  describe("truncate", () => {
    it("returns short strings unchanged", () => {
      expect(engine.truncate("hello", 100)).toBe("hello");
    });

    it("truncates at word boundary", () => {
      const result = engine.truncate("the quick brown fox jumps over the lazy dog", 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain("...");
    });
  });

  describe("compactDiffStat", () => {
    it("compacts a multi-file diff", () => {
      const stat = `file1.ts | 10 +
file2.ts | 5 -
file3.ts | 20 +-
3 files changed, 25 insertions(+), 5 deletions(-)`;
      const result = engine.compactDiffStat(stat);
      expect(result).toContain("file1.ts");
      expect(result).toContain("3 files changed");
    });
  });
});
