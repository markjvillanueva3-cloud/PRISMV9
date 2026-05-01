import { describe, it, expect } from "vitest";
import { ContextInventoryEngine } from "../engines/ContextInventoryEngine.js";

describe("ContextInventoryEngine", () => {

  describe("add and has", () => {
    it("registers and finds entries", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "src/index.ts", "Main entry point", 500);
      expect(engine.has("src/index.ts")).toBe(true);
      expect(engine.has("src/other.ts")).toBe(false);
    });

    it("retrieves entries", () => {
      const engine = new ContextInventoryEngine();
      engine.add("decision", "use-vitest", "Chose vitest over jest", 50);
      const entry = engine.get("use-vitest");
      expect(entry).toBeDefined();
      expect(entry!.type).toBe("decision");
    });
  });

  describe("markStale", () => {
    it("marks entries as stale", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file content", 300);
      engine.markStale("a.ts");
      expect(engine.staleEntries().length).toBe(1);
    });
  });

  describe("totalTokens", () => {
    it("sums all entry tokens", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file a", 500);
      engine.add("file", "b.ts", "file b", 300);
      expect(engine.totalTokens()).toBe(800);
    });
  });

  describe("byType", () => {
    it("filters by type", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file", 500);
      engine.add("decision", "d1", "decision", 50);
      engine.add("file", "b.ts", "file", 300);
      expect(engine.byType("file").length).toBe(2);
      expect(engine.byType("decision").length).toBe(1);
    });
  });

  describe("search", () => {
    it("finds entries by term", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "src/engines/FooEngine.ts", "Foo engine implementation", 500);
      engine.add("file", "src/utils/helper.ts", "Helper utilities", 200);
      const results = engine.search("engine");
      expect(results.length).toBe(1);
    });
  });

  describe("summary", () => {
    it("produces inventory summary", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file", 500);
      engine.add("decision", "d1", "decision", 50);
      const s = engine.summary();
      expect(s).toContain("Context:");
      expect(s).toContain("file:");
      expect(s).toContain("decision:");
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file", 500);
      const line = engine.oneLiner();
      expect(line).toContain("1 items");
    });

    it("shows stale count", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file", 500);
      engine.markStale("a.ts");
      expect(engine.oneLiner()).toContain("stale");
    });
  });

  describe("reset", () => {
    it("clears all entries", () => {
      const engine = new ContextInventoryEngine();
      engine.add("file", "a.ts", "file", 500);
      engine.reset();
      expect(engine.totalTokens()).toBe(0);
    });
  });
});
