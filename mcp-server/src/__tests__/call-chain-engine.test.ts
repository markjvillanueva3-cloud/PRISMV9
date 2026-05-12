import { describe, it, expect, beforeEach } from "vitest";
import { CallChainEngine } from "../engines/CallChainEngine.js";

describe("CallChainEngine", () => {
  let engine: CallChainEngine;

  beforeEach(() => {
    engine = new CallChainEngine();
  });

  describe("add and anti-pattern detection", () => {
    it("detects read-edit-read pattern", () => {
      engine.add("Read", "/src/foo.ts");
      engine.add("Edit", "/src/foo.ts");
      const result = engine.add("Read", "/src/foo.ts");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("read-edit-read");
    });

    it("ignores read-edit-read on different files", () => {
      engine.add("Read", "/src/a.ts");
      engine.add("Edit", "/src/a.ts");
      const result = engine.add("Read", "/src/b.ts");
      expect(result).toBeNull();
    });

    it("detects glob-read-grep pattern", () => {
      engine.add("Glob", "**/*.ts");
      engine.add("Read", "/src/foo.ts");
      const result = engine.add("Grep", "export");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("glob-read-grep");
    });

    it("detects triple-read pattern", () => {
      engine.add("Read", "/a.ts");
      engine.add("Read", "/b.ts");
      const result = engine.add("Read", "/c.ts");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("read-read-read");
    });

    it("detects toolsearch-toolsearch pattern", () => {
      engine.add("ToolSearch", "select:Read");
      const result = engine.add("ToolSearch", "select:Grep");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("toolsearch-toolsearch");
    });

    it("returns null for no pattern match", () => {
      engine.add("Read", "/a.ts");
      const result = engine.add("Edit", "/b.ts");
      expect(result).toBeNull();
    });
  });

  describe("getDetected", () => {
    it("accumulates detected patterns", () => {
      engine.add("Read", "/a.ts");
      engine.add("Read", "/b.ts");
      engine.add("Read", "/c.ts");
      expect(engine.getDetected().length).toBe(1);
    });
  });

  describe("getChainString", () => {
    it("returns tool sequence", () => {
      engine.add("Read");
      engine.add("Grep");
      engine.add("Edit");
      expect(engine.getChainString()).toBe("Read → Grep → Edit");
    });

    it("respects last parameter", () => {
      engine.add("A");
      engine.add("B");
      engine.add("C");
      engine.add("D");
      expect(engine.getChainString(2)).toBe("C → D");
    });
  });

  describe("getSummary", () => {
    it("returns empty message for clean chains", () => {
      engine.add("Read");
      engine.add("Edit");
      expect(engine.getSummary()).toContain("No anti-patterns");
    });

    it("returns pattern summary", () => {
      engine.add("Glob");
      engine.add("Read");
      engine.add("Grep");
      expect(engine.getSummary()).toContain("anti-pattern");
      expect(engine.getSummary()).toContain("tokens wasted");
    });
  });

  describe("suggest", () => {
    it("suggests for high Read count", () => {
      for (let i = 0; i < 4; i++) engine.add("Read", `/file${i}.ts`);
      const suggestions = engine.suggest();
      expect(suggestions.some(s => s.includes("Read"))).toBe(true);
    });

    it("returns empty for balanced chains", () => {
      engine.add("Read");
      engine.add("Edit");
      expect(engine.suggest().length).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears chain and detected", () => {
      engine.add("Read");
      engine.add("Read");
      engine.add("Read");
      engine.reset();
      expect(engine.getDetected().length).toBe(0);
      expect(engine.getChainString()).toBe("");
    });
  });
});
