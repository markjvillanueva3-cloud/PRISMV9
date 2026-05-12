/**
 * PPKnowledgeIndexEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPKnowledgeIndexEngine,
  ppKnowledgeIndexEngine,
} from "../engines/PPKnowledgeIndexEngine.js";

describe("PPKnowledgeIndexEngine", () => {
  it("exports singleton", () => {
    expect(ppKnowledgeIndexEngine).toBeInstanceOf(PPKnowledgeIndexEngine);
  });

  describe("getAllEntries", () => {
    it("returns entries across all domains", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.length).toBeGreaterThan(30); // many controllers + machines + materials + etc.
    });

    it("includes controllers", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "controller")).toBe(true);
    });

    it("includes machines", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "machine")).toBe(true);
    });

    it("includes materials", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "material")).toBe(true);
    });

    it("includes tools", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "tool")).toBe(true);
    });

    it("includes toolpaths", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "toolpath")).toBe(true);
    });

    it("includes templates", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      expect(all.some(e => e.domain === "template")).toBe(true);
    });

    it("all entries have required fields", () => {
      const engine = new PPKnowledgeIndexEngine();
      const all = engine.getAllEntries();
      for (const e of all.slice(0, 50)) {
        expect(e.id).toBeDefined();
        expect(e.label.length).toBeGreaterThan(0);
        expect(e.description.length).toBeGreaterThan(0);
        expect(Array.isArray(e.tags)).toBe(true);
      }
    });

    it("caches entries across calls", () => {
      const engine = new PPKnowledgeIndexEngine();
      const a = engine.getAllEntries();
      const b = engine.getAllEntries();
      expect(a).toBe(b); // same reference due to cache
    });
  });

  describe("search", () => {
    it("finds fanuc controllers", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("fanuc");
      expect(result.total_matches).toBeGreaterThan(0);
      expect(result.entries.some(e => e.domain === "controller")).toBe(true);
    });

    it("finds materials by name", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("steel");
      expect(result.entries.some(e => e.domain === "material")).toBe(true);
    });

    it("returns empty for no match", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("zzzzz_unknown_xyz_123");
      expect(result.total_matches).toBe(0);
    });

    it("returns empty for empty query", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("");
      expect(result.total_matches).toBe(0);
    });

    it("respects limit", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("fanuc", 3);
      expect(result.entries.length).toBeLessThanOrEqual(3);
    });

    it("preserves original query", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("FANUC");
      expect(result.query).toBe("FANUC");
    });

    it("results have scores", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("fanuc");
      for (const e of result.entries) {
        expect(typeof e.score).toBe("number");
        expect(e.score!).toBeGreaterThan(0);
      }
    });

    it("sorted by descending score", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.search("fanuc");
      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].score ?? 0)
          .toBeLessThanOrEqual(result.entries[i - 1].score ?? 0);
      }
    });
  });

  describe("getByDomain", () => {
    it("returns only controllers for controller domain", () => {
      const engine = new PPKnowledgeIndexEngine();
      const ctrls = engine.getByDomain("controller");
      expect(ctrls.every(e => e.domain === "controller")).toBe(true);
      expect(ctrls.length).toBeGreaterThan(0);
    });

    it("returns only materials for material domain", () => {
      const engine = new PPKnowledgeIndexEngine();
      const mats = engine.getByDomain("material");
      expect(mats.every(e => e.domain === "material")).toBe(true);
    });
  });

  describe("searchInDomain", () => {
    it("restricts search to one domain", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.searchInDomain("steel", "material");
      expect(result.entries.every(e => e.domain === "material")).toBe(true);
    });

    it("empty result for cross-domain query", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.searchInDomain("fanuc", "material");
      // Fanuc shouldn't appear in material domain
      expect(result.total_matches).toBe(0);
    });
  });

  describe("crossDomainSearch", () => {
    it("returns entries across multiple domains", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.crossDomainSearch("fanuc");
      expect(result.controllers.length).toBeGreaterThan(0);
    });

    it("each category respects limit", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.crossDomainSearch("steel", 2);
      expect(result.materials.length).toBeLessThanOrEqual(2);
    });

    it("has all 6 domain arrays", () => {
      const engine = new PPKnowledgeIndexEngine();
      const result = engine.crossDomainSearch("test");
      expect(Array.isArray(result.controllers)).toBe(true);
      expect(Array.isArray(result.machines)).toBe(true);
      expect(Array.isArray(result.materials)).toBe(true);
      expect(Array.isArray(result.tools)).toBe(true);
      expect(Array.isArray(result.toolpaths)).toBe(true);
      expect(Array.isArray(result.templates)).toBe(true);
    });
  });

  describe("coverage", () => {
    it("returns controller coverage", () => {
      const engine = new PPKnowledgeIndexEngine();
      const cov = engine.coverage("controller");
      expect(cov.domain).toBe("controller");
      expect(cov.total).toBeGreaterThan(0);
    });

    it("reports categories", () => {
      const engine = new PPKnowledgeIndexEngine();
      const cov = engine.coverage("material");
      expect(Object.keys(cov.by_category).length).toBeGreaterThan(0);
    });

    it("identifies gaps in material coverage", () => {
      const engine = new PPKnowledgeIndexEngine();
      const cov = engine.coverage("material");
      // Material target is 200+, we have ~93
      expect(cov.notable_gaps.length).toBeGreaterThan(0);
    });
  });

  describe("fullCoverage", () => {
    it("returns reports for all 6 domains", () => {
      const engine = new PPKnowledgeIndexEngine();
      const reports = engine.fullCoverage();
      expect(reports.length).toBe(6);
      const domains = reports.map(r => r.domain);
      expect(domains).toContain("controller");
      expect(domains).toContain("machine");
      expect(domains).toContain("material");
      expect(domains).toContain("tool");
      expect(domains).toContain("toolpath");
      expect(domains).toContain("template");
    });
  });

  describe("invalidate", () => {
    it("clears cache", () => {
      const engine = new PPKnowledgeIndexEngine();
      const a = engine.getAllEntries();
      engine.invalidate();
      const b = engine.getAllEntries();
      expect(a).not.toBe(b);
      expect(a.length).toBe(b.length);
    });
  });
});
