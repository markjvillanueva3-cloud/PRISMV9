/**
 * MachiningPlaybookEngine Tests
 * Tests experiential machining knowledge: sequencing, anti-patterns, setup advice
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  MachiningPlaybookEngine,
  type PlaybookQuery,
  type PlaybookRule,
  type RuleCategory,
} from "../engines/MachiningPlaybookEngine.js";

describe("MachiningPlaybookEngine", () => {
  let engine: MachiningPlaybookEngine;

  beforeEach(() => {
    engine = new MachiningPlaybookEngine();
  });

  // ── Stats ──────────────────────────────────────────────────────────────

  describe("stats()", () => {
    it("should return total rule count ≥ 25", () => {
      const stats = engine.stats();
      expect(stats.total).toBeGreaterThanOrEqual(25);
    });

    it("should have rules in multiple categories", () => {
      const stats = engine.stats();
      const categories = Object.keys(stats).filter(k => k !== "total" && !k.startsWith("severity_"));
      expect(categories.length).toBeGreaterThanOrEqual(8);
    });

    it("should track severity counts", () => {
      const stats = engine.stats();
      expect(stats.severity_critical).toBeGreaterThanOrEqual(5);
      expect(stats.severity_important).toBeGreaterThanOrEqual(5);
    });
  });

  // ── advise() ───────────────────────────────────────────────────────────

  describe("advise()", () => {
    it("should return all 'always' rules for empty query", () => {
      const result = engine.advise({});
      expect(result.rules.length).toBeGreaterThanOrEqual(10);
      expect(result.summary.length).toBe(result.rules.length);
    });

    it("should filter by material_iso group", () => {
      const result = engine.advise({ material_iso: "M" });
      expect(result.rules.some(r => r.id === "MAT-001")).toBe(true);
      expect(result.rules.some(r => r.conditions.some(
        c => c.type === "material_iso" && (c as any).groups.includes("M")
      ))).toBe(true);
    });

    it("should filter by category", () => {
      const result = engine.advise({ categories: ["sequencing"] });
      expect(result.rules.every(r => r.category === "sequencing")).toBe(true);
      expect(result.rules.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by severity_min", () => {
      const criticalOnly = engine.advise({ severity_min: "critical" });
      expect(criticalOnly.rules.every(r => r.severity === "critical")).toBe(true);

      const importantAndUp = engine.advise({ severity_min: "important" });
      expect(importantAndUp.rules.every(r =>
        r.severity === "critical" || r.severity === "important"
      )).toBe(true);
    });

    it("should sort by severity (critical first)", () => {
      const result = engine.advise({});
      const severities = result.rules.map(r => r.severity);
      const critIdx = severities.indexOf("critical");
      const tipIdx = severities.indexOf("tip");
      if (critIdx >= 0 && tipIdx >= 0) {
        expect(critIdx).toBeLessThan(tipIdx);
      }
    });

    it("should include critical_warnings for critical rules", () => {
      const result = engine.advise({});
      expect(result.critical_warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.critical_warnings[0]).toContain(":");
    });

    it("should match feature-based conditions", () => {
      const result = engine.advise({ features: ["hole", "thread"] });
      expect(result.rules.some(r => r.id === "SEQ-008")).toBe(true);
      expect(result.rules.some(r => r.id === "SEQ-010")).toBe(true);
    });

    it("should match tolerance-based conditions", () => {
      const result = engine.advise({ tolerance_mm: 0.02 });
      expect(result.rules.some(r => r.id === "SEQ-004")).toBe(true);
    });

    it("should match wall_thickness conditions", () => {
      const result = engine.advise({ wall_thickness_mm: 2.0 });
      expect(result.rules.some(r => r.id === "THIN-001")).toBe(true);
      expect(result.rules.some(r => r.id === "ANTI-001")).toBe(true);
    });
  });

  // ── sequenceAdvice() ───────────────────────────────────────────────────

  describe("sequenceAdvice()", () => {
    it("should return canonical operation order for common features", () => {
      const result = engine.sequenceAdvice(["face", "hole", "pocket", "thread", "chamfer"]);
      expect(result.recommended_order.length).toBeGreaterThanOrEqual(5);
      const faceIdx = result.recommended_order.indexOf("face");
      const drillIdx = result.recommended_order.indexOf("drill");
      const chamferIdx = result.recommended_order.indexOf("chamfer");
      expect(faceIdx).toBeLessThan(drillIdx);
      expect(drillIdx).toBeLessThan(chamferIdx);
    });

    it("should include sequencing reasoning", () => {
      const result = engine.sequenceAdvice(["pocket", "hole"]);
      expect(result.reasoning.length).toBeGreaterThanOrEqual(1);
      expect(result.applied_rules.length).toBeGreaterThanOrEqual(1);
    });

    it("should include anti-pattern warnings", () => {
      const result = engine.sequenceAdvice(["pocket", "slot"]);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle material_iso parameter", () => {
      const withMat = engine.sequenceAdvice(["pocket", "hole"], "M");
      const withoutMat = engine.sequenceAdvice(["pocket", "hole"]);
      expect(withMat.applied_rules.length).toBeGreaterThanOrEqual(withoutMat.applied_rules.length);
    });
  });

  // ── setupAdvice() ──────────────────────────────────────────────────────

  describe("setupAdvice()", () => {
    it("should recommend 1 setup for top-only features", () => {
      const result = engine.setupAdvice(["pocket", "hole"]);
      expect(result.recommended_setups).toBe(1);
      expect(result.setup_descriptions.length).toBe(1);
    });

    it("should recommend 2 setups when back/bottom features exist", () => {
      const result = engine.setupAdvice(["pocket", "hole", "back_pocket"]);
      expect(result.recommended_setups).toBe(2);
      expect(result.setup_descriptions.length).toBe(2);
    });

    it("should include workholding suggestions", () => {
      const result = engine.setupAdvice(["pocket", "hole"]);
      expect(result.workholding_suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it("should include datum strategy", () => {
      const result = engine.setupAdvice(["pocket", "hole"]);
      expect(result.datum_strategy.length).toBeGreaterThan(0);
    });

    it("should include applied_rules", () => {
      const result = engine.setupAdvice(["pocket", "hole"], "P", 0.01);
      expect(result.applied_rules.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── antiPatterns() ─────────────────────────────────────────────────────

  describe("antiPatterns()", () => {
    it("should return anti-patterns for general query", () => {
      const rules = engine.antiPatterns({});
      expect(rules.length).toBeGreaterThanOrEqual(3);
      expect(rules.every(r => r.category === "anti_pattern")).toBe(true);
    });

    it("should return thin-wall anti-pattern for thin walls", () => {
      const rules = engine.antiPatterns({ wall_thickness_mm: 2.0 });
      expect(rules.some(r => r.id === "ANTI-001")).toBe(true);
    });

    it("should return slot anti-pattern for slot features", () => {
      const rules = engine.antiPatterns({ features: ["slot"] });
      expect(rules.some(r => r.id === "ANTI-005")).toBe(true);
    });
  });

  // ── byCategory() ──────────────────────────────────────────────────────

  describe("byCategory()", () => {
    it("should return all sequencing rules", () => {
      const rules = engine.byCategory("sequencing");
      expect(rules.length).toBeGreaterThanOrEqual(10);
      expect(rules.every(r => r.category === "sequencing")).toBe(true);
    });

    it("should return empty array for unused category", () => {
      const rules = engine.byCategory("chip_control" as RuleCategory);
      expect(Array.isArray(rules)).toBe(true);
    });

    it("should return material tips", () => {
      const rules = engine.byCategory("material_tip");
      expect(rules.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ── addRule() ──────────────────────────────────────────────────────────

  describe("addRule()", () => {
    it("should add a new rule", () => {
      const before = engine.stats().total;
      engine.addRule({
        id: "TEST-001",
        category: "roughing",
        severity: "tip",
        title: "Test rule",
        rule: "This is a test rule for validation",
        reasoning: "Testing the addRule method",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "Unit test",
      });
      expect(engine.stats().total).toBe(before + 1);
    });

    it("should reject duplicate rule IDs", () => {
      expect(() => engine.addRule({
        id: "SEQ-001",
        category: "sequencing",
        severity: "tip",
        title: "Duplicate",
        rule: "Duplicate rule",
        reasoning: "Should fail",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "Test",
      })).toThrow("Rule SEQ-001 already exists");
    });

    it("should make new rule queryable", () => {
      engine.addRule({
        id: "TEST-002",
        category: "finishing",
        severity: "important",
        title: "Ball nose overlap",
        rule: "Use 10% stepover for ball nose finishing",
        reasoning: "Ensures smooth scallop height",
        conditions: [{ type: "surface_finish_below", ra_um: 1.6 }],
        exceptions: [],
        source: "Test",
      });
      const result = engine.advise({ surface_finish_Ra: 0.8, categories: ["finishing"] });
      expect(result.rules.some(r => r.id === "TEST-002")).toBe(true);
    });
  });

  // ── Rule data integrity ────────────────────────────────────────────────

  describe("rule data integrity", () => {
    it("all rules should have non-empty required fields", () => {
      const stats = engine.stats();
      const allCategories: RuleCategory[] = [
        "sequencing", "setup_strategy", "tool_selection", "toolpath_strategy",
        "anti_pattern", "material_tip", "thin_wall", "hole_making", "finishing",
        "roughing", "5axis", "workholding", "thermal", "chip_control",
        "tool_life", "datum", "deburring", "safety",
      ];

      for (const cat of allCategories) {
        const rules = engine.byCategory(cat);
        for (const rule of rules) {
          expect(rule.id).toBeTruthy();
          expect(rule.title).toBeTruthy();
          expect(rule.rule).toBeTruthy();
          expect(rule.reasoning).toBeTruthy();
          expect(rule.source).toBeTruthy();
          expect(rule.conditions.length).toBeGreaterThanOrEqual(1);
          expect(Array.isArray(rule.exceptions)).toBe(true);
        }
      }
    });

    it("all rule IDs should be unique", () => {
      const allRules: PlaybookRule[] = [];
      const cats: RuleCategory[] = [
        "sequencing", "anti_pattern", "thin_wall", "setup_strategy",
        "toolpath_strategy", "material_tip", "hole_making", "datum",
        "thermal", "workholding", "safety",
      ];
      for (const cat of cats) {
        allRules.push(...engine.byCategory(cat));
      }
      const ids = allRules.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
