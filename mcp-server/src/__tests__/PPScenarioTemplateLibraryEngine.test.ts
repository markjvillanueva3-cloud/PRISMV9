/**
 * PPScenarioTemplateLibraryEngine Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PPScenarioTemplateLibraryEngine,
  type ScenarioTemplate,
} from "../engines/PPScenarioTemplateLibraryEngine.js";

describe("PPScenarioTemplateLibraryEngine", () => {
  let engine: PPScenarioTemplateLibraryEngine;

  beforeEach(() => {
    engine = new PPScenarioTemplateLibraryEngine();
  });

  describe("seed templates", () => {
    it("ships with seed templates", () => {
      const all = engine.getAllTemplates();
      expect(all.length).toBeGreaterThan(0);
    });

    it("seed templates have required fields", () => {
      const all = engine.getAllTemplates();
      for (const t of all) {
        expect(t.id).toBeDefined();
        expect(t.label).toBeDefined();
        expect(t.scenario).toBeDefined();
        expect(t.validation_source).toBeDefined();
        expect(Array.isArray(t.tags)).toBe(true);
      }
    });

    it("includes JM Die templates", () => {
      const jmDie = engine.getAllTemplates().filter(t => t.validation_source === "jm_die");
      expect(jmDie.length).toBeGreaterThan(0);
    });
  });

  describe("addTemplate / getTemplate", () => {
    it("adds a new template", () => {
      const tmpl: ScenarioTemplate = {
        id: "test_new",
        label: "Test Template",
        scenario: { controller_id: "fanuc_31i", machine_id: "haas-vf2", material_id: "1018" },
        validation_source: "community",
        tags: ["test"],
      };
      engine.addTemplate(tmpl);
      expect(engine.getTemplate("test_new")).toEqual(tmpl);
    });

    it("updates existing template on duplicate ID", () => {
      const tmpl: ScenarioTemplate = {
        id: "test_update", label: "Original",
        scenario: { controller_id: "fanuc_31i", machine_id: "haas-vf2", material_id: "1018" },
        validation_source: "community", tags: ["v1"],
      };
      engine.addTemplate(tmpl);
      engine.addTemplate({ ...tmpl, label: "Updated", tags: ["v2"] });
      expect(engine.getTemplate("test_update")?.label).toBe("Updated");
      expect(engine.getAllTemplates().filter(t => t.id === "test_update").length).toBe(1);
    });

    it("returns null for unknown ID", () => {
      expect(engine.getTemplate("nonexistent")).toBeNull();
    });
  });

  describe("filtering", () => {
    it("getByIndustry", () => {
      const fastener = engine.getByIndustry("fastener");
      expect(fastener.every(t => t.industry === "fastener")).toBe(true);
      expect(fastener.length).toBeGreaterThan(0);
    });

    it("getByPartType", () => {
      const dies = engine.getByPartType("die");
      expect(dies.every(t => t.part_type === "die")).toBe(true);
    });

    it("getByTag", () => {
      const adaptive = engine.getByTag("adaptive");
      expect(adaptive.every(t => t.tags.includes("adaptive"))).toBe(true);
      expect(adaptive.length).toBeGreaterThan(0);
    });

    it("getByTag is case insensitive", () => {
      const lower = engine.getByTag("d2");
      const upper = engine.getByTag("D2");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("search", () => {
    it("finds by label", () => {
      const results = engine.search("hurco");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label.toLowerCase()).toContain("hurco");
    });

    it("finds by tag", () => {
      const results = engine.search("adaptive");
      expect(results.length).toBeGreaterThan(0);
    });

    it("respects limit", () => {
      const results = engine.search("die", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("returns empty for no match", () => {
      const results = engine.search("zzz_nonexistent_xyz");
      expect(results.length).toBe(0);
    });
  });

  describe("findSimilar", () => {
    it("finds templates similar to a scenario", () => {
      const results = engine.findSimilar({
        controller_id: "hurco_max5", machine_id: "hurco-vmx30i", material_id: "D2",
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].template.id).toContain("jmdie_hurco");
    });

    it("sorts by descending similarity", () => {
      const results = engine.findSimilar({
        controller_id: "fanuc_31i", machine_id: "haas-vf2", material_id: "1018",
      }, 5);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
      }
    });

    it("includes match reason", () => {
      const results = engine.findSimilar({
        controller_id: "hurco_max5", machine_id: "hurco-vmx30i", material_id: "D2",
      });
      expect(results[0].match_reason).toBeDefined();
      expect(results[0].match_reason.length).toBeGreaterThan(0);
    });

    it("respects limit", () => {
      const results = engine.findSimilar({
        controller_id: "fanuc_31i", machine_id: "haas-vf2", material_id: "1018",
      }, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("findByToolpath", () => {
    it("finds templates with similar toolpath", () => {
      const results = engine.findByToolpath({
        operation_type: "pocket", dimension: "3d", phase: "roughing", adaptive: true,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it("all results have toolpath defined", () => {
      const results = engine.findByToolpath({
        operation_type: "pocket", dimension: "3d", phase: "roughing",
      });
      for (const r of results) {
        expect(r.template.toolpath).toBeDefined();
      }
    });
  });

  describe("findByTool", () => {
    it("finds templates with similar tool", () => {
      const results = engine.findByTool({
        tool_type: "endmill", diameter_mm: 10, substrate: "carbide", coating: "tialn",
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it("all results have tool defined", () => {
      const results = engine.findByTool({ tool_type: "endmill", diameter_mm: 10 });
      for (const r of results) {
        expect(r.template.tool).toBeDefined();
      }
    });
  });

  describe("getTopProven", () => {
    it("returns highest success rate first", () => {
      const top = engine.getTopProven(3);
      expect(top.length).toBeGreaterThan(0);
      expect(top.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < top.length; i++) {
        expect(top[i].performance?.success_rate ?? 0)
          .toBeLessThanOrEqual(top[i - 1].performance?.success_rate ?? 0);
      }
    });
  });

  describe("getStats", () => {
    it("returns library stats", () => {
      const stats = engine.getStats();
      expect(stats.total_templates).toBeGreaterThan(0);
      expect(stats.avg_success_rate).toBeGreaterThan(0);
    });

    it("tracks distribution by industry", () => {
      const stats = engine.getStats();
      expect(Object.keys(stats.by_industry).length).toBeGreaterThan(0);
    });

    it("tracks distribution by validation source", () => {
      const stats = engine.getStats();
      expect(Object.keys(stats.by_validation_source).length).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("restores to seed templates only", () => {
      const origCount = engine.getAllTemplates().length;
      engine.addTemplate({
        id: "extra", label: "Extra",
        scenario: { controller_id: "x", machine_id: "y", material_id: "z" },
        validation_source: "community", tags: [],
      });
      engine.reset();
      expect(engine.getAllTemplates().length).toBe(origCount);
    });
  });
});
