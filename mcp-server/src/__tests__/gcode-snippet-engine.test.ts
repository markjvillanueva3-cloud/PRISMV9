import { describe, it, expect } from "vitest";
import { GCodeSnippetEngine } from "../engines/GCodeSnippetEngine.js";

describe("GCodeSnippetEngine", () => {
  const engine = new GCodeSnippetEngine();

  describe("get", () => {
    it("returns snippet by ID", () => {
      const s = engine.get("tool_change");
      expect(s).not.toBeNull();
      expect(s!.id).toBe("tool_change");
      expect(s!.code).toContain("M6");
    });

    it("returns null for unknown ID", () => {
      expect(engine.get("nonexistent")).toBeNull();
    });
  });

  describe("fill", () => {
    it("fills snippet with params", () => {
      const code = engine.fill("tool_change", { tool_number: 5, rpm: 8000 });
      expect(code).not.toBeNull();
      expect(code).toContain("T5 M6");
      expect(code).toContain("S8000");
    });

    it("fills drill cycle", () => {
      const code = engine.fill("drill_peck", {
        x: 1.0, y: 2.0, depth: -0.75, peck_depth: 0.1,
        retract: 0.1, clearance: 1.0, feed: 5, tool_number: 3,
      });
      expect(code).toContain("G83");
      expect(code).toContain("Q0.1");
    });

    it("returns null for unknown snippet", () => {
      expect(engine.fill("nonexistent", {})).toBeNull();
    });
  });

  describe("list", () => {
    it("lists all snippets", () => {
      const list = engine.list();
      expect(list.length).toBeGreaterThan(5);
    });
  });

  describe("search", () => {
    it("finds snippets by keyword", () => {
      const results = engine.search("drill");
      expect(results.length).toBeGreaterThan(0);
    });

    it("finds by category", () => {
      const results = engine.search("setup");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("byCategory", () => {
    it("filters by category", () => {
      const setup = engine.byCategory("setup");
      expect(setup.length).toBeGreaterThan(0);
      setup.forEach(s => expect(s.category).toBe("setup"));
    });
  });

  describe("categories", () => {
    it("returns unique categories", () => {
      const cats = engine.categories();
      expect(cats.length).toBeGreaterThan(2);
      expect(cats).toContain("setup");
      expect(cats).toContain("milling");
    });
  });

  describe("getStats", () => {
    it("returns counts", () => {
      const stats = engine.getStats();
      expect(stats.total).toBeGreaterThan(5);
      expect(stats.categories).toBeGreaterThan(2);
    });
  });
});
