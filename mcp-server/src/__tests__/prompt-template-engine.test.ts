import { describe, it, expect } from "vitest";
import { PromptTemplateEngine } from "../engines/PromptTemplateEngine.js";

describe("PromptTemplateEngine", () => {
  const engine = new PromptTemplateEngine();

  describe("get", () => {
    it("returns template by ID", () => {
      const t = engine.get("engine_create");
      expect(t).not.toBeNull();
      expect(t!.id).toBe("engine_create");
    });

    it("returns null for unknown ID", () => {
      expect(engine.get("nonexistent")).toBeNull();
    });
  });

  describe("fill", () => {
    it("fills template with params", () => {
      const result = engine.fill("commit_message", {
        type: "feat",
        scope: "engines",
        summary: "add FooEngine",
        details: "New engine for foo operations",
      });
      expect(result).toContain("feat(engines)");
      expect(result).toContain("add FooEngine");
    });

    it("returns null for unknown template", () => {
      expect(engine.fill("nonexistent", {})).toBeNull();
    });

    it("replaces all occurrences of a param", () => {
      const result = engine.fill("engine_create", {
        name: "Foo",
        purpose: "test",
        name_lower: "foo",
      });
      expect(result).toContain("FooEngine");
      expect(result).toContain("foo-engine.test.ts");
    });
  });

  describe("list", () => {
    it("returns all templates", () => {
      const list = engine.list();
      expect(list.length).toBeGreaterThan(5);
      list.forEach(t => {
        expect(t).toHaveProperty("id");
        expect(t).toHaveProperty("name");
        expect(t).toHaveProperty("category");
      });
    });
  });

  describe("byCategory", () => {
    it("filters by category", () => {
      const forge = engine.byCategory("forge");
      expect(forge.length).toBeGreaterThan(0);
      forge.forEach(t => expect(t.category).toBe("forge"));
    });
  });

  describe("categories", () => {
    it("returns unique categories", () => {
      const cats = engine.categories();
      expect(cats.length).toBeGreaterThan(3);
      expect(new Set(cats).size).toBe(cats.length);
    });
  });

  describe("search", () => {
    it("finds templates by keyword", () => {
      const results = engine.search("engine");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for no match", () => {
      expect(engine.search("zzzzzzz")).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("returns counts", () => {
      const stats = engine.getStats();
      expect(stats.total).toBeGreaterThan(5);
      expect(stats.categories).toBeGreaterThan(3);
      expect(stats.avgTokens).toBeGreaterThan(0);
    });
  });
});
