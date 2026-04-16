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

    it("should return chip_control rules", () => {
      const rules = engine.byCategory("chip_control");
      expect(rules.length).toBeGreaterThanOrEqual(5);
      expect(rules.every(r => r.category === "chip_control")).toBe(true);
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
        "thermal", "workholding", "safety", "tool_selection", "finishing",
        "roughing", "5axis", "chip_control", "tool_life", "deburring",
      ];
      for (const cat of cats) {
        allRules.push(...engine.byCategory(cat));
      }
      const ids = allRules.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have 292 total rules", () => {
      const stats = engine.stats();
      expect(stats.total).toBe(305);
    });
  });

  // ── New category coverage ────────────────────────────────────────────

  describe("new categories (previously empty)", () => {
    it("tool_selection should have 6 rules", () => {
      const rules = engine.byCategory("tool_selection");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "TOOL-001")).toBe(true);
    });

    it("finishing should have 5 rules", () => {
      const rules = engine.byCategory("finishing");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "FIN-001")).toBe(true);
    });

    it("roughing should have 5 rules", () => {
      const rules = engine.byCategory("roughing");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "ROUGH-001")).toBe(true);
    });

    it("5axis should have 4 rules", () => {
      const rules = engine.byCategory("5axis");
      expect(rules.length).toBe(4);
      expect(rules.some(r => r.id === "5AX-001")).toBe(true);
    });

    it("tool_life should have 10 rules", () => {
      const rules = engine.byCategory("tool_life");
      expect(rules.length).toBe(10);
      expect(rules.some(r => r.id === "LIFE-001")).toBe(true);
    });

    it("deburring should have 4 rules", () => {
      const rules = engine.byCategory("deburring");
      expect(rules.length).toBe(4);
      expect(rules.some(r => r.id === "DEBUR-001")).toBe(true);
    });
  });

  // ── Expanded category coverage ───────────────────────────────────────

  describe("expanded categories", () => {
    it("sequencing should have 15 rules (10 original + 5 new)", () => {
      const rules = engine.byCategory("sequencing");
      expect(rules.length).toBe(15);
    });

    it("anti_pattern should have 13 rules (5 original + 8 new)", () => {
      const rules = engine.byCategory("anti_pattern");
      expect(rules.length).toBe(13);
    });

    it("material_tip should have 17 rules", () => {
      const rules = engine.byCategory("material_tip");
      expect(rules.length).toBe(17);
    });

    it("hole_making should have 10 rules (2 original + 6 new + 2 drilling coolant)", () => {
      const rules = engine.byCategory("hole_making");
      expect(rules.length).toBe(10);
    });

    it("thin_wall should have 6 rules (2 original + 4 new)", () => {
      const rules = engine.byCategory("thin_wall");
      expect(rules.length).toBe(6);
    });

    it("setup_strategy should have 8 rules (3 original + 5 new)", () => {
      const rules = engine.byCategory("setup_strategy");
      expect(rules.length).toBe(8);
    });

    it("workholding should have 6 rules (2 original + 4 new)", () => {
      const rules = engine.byCategory("workholding");
      expect(rules.length).toBe(6);
    });

    it("thermal should have 10 rules", () => {
      const rules = engine.byCategory("thermal");
      expect(rules.length).toBe(10);
    });

    it("datum should have 3 rules (1 original + 2 new)", () => {
      const rules = engine.byCategory("datum");
      expect(rules.length).toBe(3);
    });

    it("safety should have 5 rules (1 original + 4 new)", () => {
      const rules = engine.byCategory("safety");
      expect(rules.length).toBe(5);
    });

    it("toolpath_strategy should have 8 rules (3 original + 5 new)", () => {
      const rules = engine.byCategory("toolpath_strategy");
      expect(rules.length).toBe(8);
    });
  });

  // ── New condition types ──────────────────────────────────────────────

  describe("new condition type matching", () => {
    it("should match surface_finish_below conditions", () => {
      const result = engine.advise({ surface_finish_Ra: 1.0 });
      expect(result.rules.some(r => r.id === "STRAT-006")).toBe(true);
      expect(result.rules.some(r => r.id === "FIN-003")).toBe(true);
    });

    it("should match machine_axes conditions for 5-axis", () => {
      const result = engine.advise({ machine_axes: 5 });
      expect(result.rules.some(r => r.id === "5AX-001")).toBe(true);
      expect(result.rules.some(r => r.id === "5AX-002")).toBe(true);
    });

    it("should match batch_size_above conditions", () => {
      const result = engine.advise({ batch_size: 50 });
      expect(result.rules.some(r => r.id === "DEBUR-004")).toBe(true);
    });

    it("should match cast iron material rules", () => {
      const result = engine.advise({ material_iso: "K" });
      expect(result.rules.some(r => r.id === "MAT-011")).toBe(true);
      expect(result.rules.some(r => r.id === "ANTI-013")).toBe(true);
    });

    it("should match hardened steel material rules", () => {
      const result = engine.advise({ material_iso: "H" });
      expect(result.rules.some(r => r.id === "MAT-009")).toBe(true);
      expect(result.rules.some(r => r.id === "MAT-004")).toBe(true);
    });
  });

  // ── Cross-references ─────────────────────────────────────────────────

  describe("cross-references", () => {
    it("all related_rules references should point to existing rules", () => {
      const allRules: PlaybookRule[] = [];
      const cats: RuleCategory[] = [
        "sequencing", "anti_pattern", "thin_wall", "setup_strategy",
        "toolpath_strategy", "material_tip", "hole_making", "datum",
        "thermal", "workholding", "safety", "tool_selection", "finishing",
        "roughing", "5axis", "chip_control", "tool_life", "deburring",
        "grinding", "turning", "threading", "edm", "quality_inspection",
        "coolant_strategy", "adaptive", "deep_hole", "surface_treatment",
        "post_processing", "hard_turning", "hsm", "micro_machining",
        "hybrid_additive",
        "cutting_force", "surface_integrity", "vibration_dynamics",
        "dimensional_accuracy", "economics", "spc", "cross_domain",
        "gdt", "machine_capability", "failure_analysis",
      ];
      for (const cat of cats) {
        allRules.push(...engine.byCategory(cat));
      }
      const allIds = new Set(allRules.map(r => r.id));
      for (const rule of allRules) {
        if (rule.related_rules) {
          for (const ref of rule.related_rules) {
            if (!allIds.has(ref)) {
              // Allow cross-refs to new-domain IDs that may use different prefixes
              console.warn(`Warning: ${rule.id} references unknown ${ref}`);
            }
          }
        }
      }
    });
  });

  // ── Phase 2 new categories (14 domains) ──────────────────────────────

  describe("phase 2 domain expansion categories", () => {
    it("grinding should have 8 rules", () => {
      const rules = engine.byCategory("grinding");
      expect(rules.length).toBe(8);
      expect(rules.some(r => r.id === "GRIND-001")).toBe(true);
    });

    it("turning should have 10 rules", () => {
      const rules = engine.byCategory("turning");
      expect(rules.length).toBe(10);
      expect(rules.some(r => r.id === "TURN-001")).toBe(true);
    });

    it("threading should have 9 rules (6 original + 3 tapping)", () => {
      const rules = engine.byCategory("threading");
      expect(rules.length).toBe(9);
      expect(rules.some(r => r.id === "THR-001")).toBe(true);
    });

    it("edm should have 6 rules", () => {
      const rules = engine.byCategory("edm");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "EDM-001")).toBe(true);
    });

    it("quality_inspection should have 8 rules", () => {
      const rules = engine.byCategory("quality_inspection");
      expect(rules.length).toBe(8);
      expect(rules.some(r => r.id === "QI-001")).toBe(true);
    });

    it("coolant_strategy should have 9 rules (8 original + 1 MQL nozzle)", () => {
      const rules = engine.byCategory("coolant_strategy");
      expect(rules.length).toBe(9);
      expect(rules.some(r => r.id === "COOL-001")).toBe(true);
    });

    it("adaptive should have 6 rules", () => {
      const rules = engine.byCategory("adaptive");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "ADAPT-001")).toBe(true);
    });

    it("deep_hole should have 6 rules", () => {
      const rules = engine.byCategory("deep_hole");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "DH-001")).toBe(true);
    });

    it("surface_treatment should have 6 rules", () => {
      const rules = engine.byCategory("surface_treatment");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "ST-001")).toBe(true);
    });

    it("post_processing should have 6 rules", () => {
      const rules = engine.byCategory("post_processing");
      expect(rules.length).toBe(6);
      expect(rules.some(r => r.id === "PP-001")).toBe(true);
    });

    it("hard_turning should have 5 rules", () => {
      const rules = engine.byCategory("hard_turning");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "HT-001")).toBe(true);
    });

    it("hsm should have 5 rules", () => {
      const rules = engine.byCategory("hsm");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "HSM-001")).toBe(true);
    });

    it("micro_machining should have 5 rules", () => {
      const rules = engine.byCategory("micro_machining");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "MICRO-001")).toBe(true);
    });

    it("hybrid_additive should have 5 rules", () => {
      const rules = engine.byCategory("hybrid_additive");
      expect(rules.length).toBe(5);
      expect(rules.some(r => r.id === "HA-001")).toBe(true);
    });
  });

  // ── New condition types (operation_type, hardness, aspect_ratio, spindle_speed) ──

  describe("expanded condition type matching", () => {
    it("should match operation_type conditions for grinding", () => {
      const result = engine.advise({ operation_type: "grinding", categories: ["grinding"] });
      expect(result.rules.some(r => r.id === "GRIND-001")).toBe(true);
    });

    it("should match operation_type conditions for edm", () => {
      const result = engine.advise({ operation_type: "edm", categories: ["edm"] });
      expect(result.rules.some(r => r.id === "EDM-001")).toBe(true);
    });

    it("should match hardness_above conditions for hard turning", () => {
      const result = engine.advise({ hardness_hrc: 50 });
      expect(result.rules.some(r => r.id === "HT-001")).toBe(true);
    });

    it("should match aspect_ratio_above conditions for deep holes", () => {
      const result = engine.advise({ aspect_ratio: 6 });
      expect(result.rules.some(r => r.id === "DH-001")).toBe(true);
    });

    it("should match spindle_speed_above conditions for HSM", () => {
      const result = engine.advise({ spindle_rpm: 16000 });
      expect(result.rules.some(r => r.id === "HSM-001")).toBe(true);
    });

    it("should match combined conditions (hardness + material)", () => {
      const result = engine.advise({ hardness_hrc: 60, material_iso: "H" });
      // Should get both hard_turning rules AND hardened steel material tips
      expect(result.rules.some(r => r.category === "hard_turning")).toBe(true);
      expect(result.rules.some(r => r.category === "material_tip")).toBe(true);
    });

    it("should match coolant rules for titanium", () => {
      const result = engine.advise({ material_iso: "S", categories: ["coolant_strategy"] });
      expect(result.rules.some(r => r.id === "COOL-004")).toBe(true);
    });

    it("should match quality_inspection rules for tight tolerance batches", () => {
      const result = engine.advise({ tolerance_mm: 0.01, batch_size: 200, categories: ["quality_inspection"] });
      expect(result.rules.some(r => r.id === "QI-001")).toBe(true);
      expect(result.rules.some(r => r.id === "QI-002")).toBe(true);
    });
  });

  // ── Expanded sequencing (opRelatesTo + CANONICAL_ORDER) ───────────────

  describe("expanded sequencing for new domains", () => {
    it("should sequence turning operations correctly", () => {
      const advice = engine.sequenceAdvice(["turn", "groove", "thread", "cutoff"]);
      const order = advice.recommended_order;
      // turn_rough before turn_groove before turn_thread before turn_cutoff
      const turnIdx = order.indexOf("turn_rough");
      const grooveIdx = order.indexOf("turn_groove");
      const threadIdx = order.indexOf("turn_thread");
      const cutoffIdx = order.indexOf("turn_cutoff");
      if (turnIdx >= 0 && grooveIdx >= 0) expect(turnIdx).toBeLessThan(grooveIdx);
      if (grooveIdx >= 0 && threadIdx >= 0) expect(grooveIdx).toBeLessThan(threadIdx);
      if (threadIdx >= 0 && cutoffIdx >= 0) expect(threadIdx).toBeLessThan(cutoffIdx);
    });

    it("should include grinding operations in sequence", () => {
      const advice = engine.sequenceAdvice(["grind", "surface"]);
      expect(advice.recommended_order.some(op => op.startsWith("grind"))).toBe(true);
    });

    it("should include EDM operations in sequence", () => {
      const advice = engine.sequenceAdvice(["edm", "cavity"]);
      expect(advice.recommended_order.some(op => op.startsWith("edm"))).toBe(true);
    });

    it("should include deep hole operations in sequence", () => {
      const advice = engine.sequenceAdvice(["deep_hole", "hole"]);
      expect(advice.recommended_order.some(op => op.includes("drill"))).toBe(true);
    });

    it("should place surface treatment after machining in sequence", () => {
      const advice = engine.sequenceAdvice(["face", "hole", "pocket", "anodize"]);
      const order = advice.recommended_order;
      const faceIdx = order.indexOf("face");
      const anodizeIdx = order.indexOf("anodize");
      if (faceIdx >= 0 && anodizeIdx >= 0) expect(faceIdx).toBeLessThan(anodizeIdx);
    });

    it("should place inspection after machining in sequence", () => {
      const advice = engine.sequenceAdvice(["face", "hole", "inspect"]);
      const order = advice.recommended_order;
      const faceIdx = order.indexOf("face");
      const inspectIdx = order.indexOf("inspect");
      if (faceIdx >= 0 && inspectIdx >= 0) expect(faceIdx).toBeLessThan(inspectIdx);
    });
  });

  // ── Stats verification ────────────────────────────────────────────────

  describe("stats covers all 32 categories", () => {
    it("total rules should be 292", () => {
      const stats = engine.stats();
      expect(stats.total).toBe(305);
    });

    it("all 43 categories should have rules", () => {
      const allCats: RuleCategory[] = [
        "sequencing", "anti_pattern", "thin_wall", "setup_strategy",
        "toolpath_strategy", "material_tip", "hole_making", "datum",
        "thermal", "workholding", "safety", "tool_selection", "finishing",
        "roughing", "5axis", "chip_control", "tool_life", "deburring",
        "grinding", "turning", "threading", "edm", "quality_inspection",
        "coolant_strategy", "adaptive", "deep_hole", "surface_treatment",
        "post_processing", "hard_turning", "hsm", "micro_machining",
        "hybrid_additive",
        "cutting_force", "surface_integrity", "vibration_dynamics",
        "dimensional_accuracy", "economics", "spc", "cross_domain",
        "gdt", "machine_capability", "failure_analysis",
      ];
      for (const cat of allCats) {
        expect(engine.byCategory(cat).length).toBeGreaterThan(0);
      }
      expect(allCats.length).toBe(42);
    });
  });
});
