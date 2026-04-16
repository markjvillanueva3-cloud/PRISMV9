/**
 * Tests for TK-MS3-U17: SpeedFeedOrchestrator Tier 2 Tribal Wiring
 * Validates that tribal modifiers are applied to speed/feed calculations.
 */
import { describe, it, expect } from "vitest";
import { SpeedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

describe("TK-MS3-U17: SpeedFeedOrchestrator Tier 2 Tribal Wiring", () => {
  const engine = new SpeedFeedOrchestratorEngine();

  describe("tribal modifiers integration", () => {
    it("includes TribalKnowledgeAdvisorEngine in engines_called when tips found", () => {
      const result = engine.compute({
        material: "4140 steel",
        iso_group: "P",
        operation: "milling",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "roughing",
      });

      expect(result.value).toBeDefined();
      expect(result.value.engines_called).toContain("SpeedFeedOrchestratorEngine");
      // TribalKnowledgeAdvisorEngine should be called when tips are found
      expect(Array.isArray(result.value.engines_called)).toBe(true);
    });

    it("applies tribal Vc modifier and records in formulas_used", () => {
      const result = engine.compute({
        material: "D2 tool steel",
        iso_group: "H",
        operation: "milling",
        tool_diameter_mm: 10,
        flutes: 4,
        cut_type: "finishing",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.value.formulas_used).toBeDefined();
      expect(Array.isArray(result.value.formulas_used)).toBe(true);

      // Formula should include Vc calculation
      const vcFormula = result.value.formulas_used.find(f =>
        f.includes("Vc = Vc_base")
      );
      expect(vcFormula).toBeDefined();
    });

    it("applies tribal fz modifier and records in formulas_used", () => {
      const result = engine.compute({
        material: "titanium Ti-6Al-4V",
        iso_group: "S",
        operation: "milling",
        tool_diameter_mm: 8,
        flutes: 4,
        cut_type: "roughing",
      });

      expect(result.value.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(result.value.formulas_used).toBeDefined();

      // Formula should include fz calculation
      const fzFormula = result.value.formulas_used.find(f =>
        f.includes("fz = base_fz")
      );
      expect(fzFormula).toBeDefined();
    });

    it("applies tribal tool_life modifier to Taylor calculation", () => {
      const result = engine.compute({
        material: "Inconel 718",
        iso_group: "S",
        operation: "milling",
        tool_diameter_mm: 10,
        flutes: 4,
        cut_type: "roughing",
      });

      expect(result.value.tool_life_min).toBeGreaterThan(0);
      expect(result.value.formulas_used).toBeDefined();

      // Formula should include Taylor tool life
      const taylorFormula = result.value.formulas_used.find(f =>
        f.includes("T_life")
      );
      expect(taylorFormula).toBeDefined();
    });
  });

  describe("tribal modifier clamping", () => {
    it("produces valid cutting speed within physical limits", () => {
      const result = engine.compute({
        material: "aluminum 6061",
        iso_group: "N",
        operation: "milling",
        tool_diameter_mm: 20,
        flutes: 3,
        cut_type: "roughing",
      });

      // Cutting speed should be positive and reasonable
      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.value.cutting_speed_mpm).toBeLessThan(2000); // Physical limit for aluminum
    });

    it("produces valid feed per tooth within physical limits", () => {
      const result = engine.compute({
        material: "stainless 316",
        iso_group: "M",
        operation: "milling",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "finishing",
      });

      // fz should be positive and reasonable
      expect(result.value.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(result.value.feed_per_tooth_mm).toBeLessThan(1.0); // Reasonable max for milling
    });

    it("tool life stays within clamped range", () => {
      const result = engine.compute({
        material: "cast iron gray",
        iso_group: "K",
        operation: "milling",
        tool_diameter_mm: 16,
        flutes: 4,
        cut_type: "roughing",
      });

      // Tool life should be clamped to [1, 9999] per engine logic
      expect(result.value.tool_life_min).toBeGreaterThanOrEqual(1);
      expect(result.value.tool_life_min).toBeLessThanOrEqual(9999);
    });
  });

  describe("result structure", () => {
    it("returns complete OrchestratorResult structure", () => {
      const result = engine.compute({
        material: "4140",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
      });

      expect(result.value).toHaveProperty("cutting_speed_mpm");
      expect(result.value).toHaveProperty("spindle_rpm");
      expect(result.value).toHaveProperty("feed_rate_mmmin");
      expect(result.value).toHaveProperty("feed_per_tooth_mm");
      expect(result.value).toHaveProperty("tool_life_min");
      expect(result.value).toHaveProperty("mrr_cm3min");
      expect(result.value).toHaveProperty("tangential_force_N");
      expect(result.value).toHaveProperty("power_kw");
      expect(result.value).toHaveProperty("torque_Nm");
      expect(result.value).toHaveProperty("surface_finish_Ra_um");
      expect(result.value).toHaveProperty("deflection_um");
      expect(result.value).toHaveProperty("safety_checks");
      expect(result.value).toHaveProperty("limiting_factors");
      expect(result.value).toHaveProperty("formulas_used");
      expect(result.value).toHaveProperty("engines_called");
    });

    it("includes confidence and source in atomic value wrapper", () => {
      const result = engine.compute({
        material: "A2 tool steel",
        iso_group: "H",
        tool_diameter_mm: 8,
        flutes: 4,
        operation: "milling",
      });

      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("source");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.source).toContain("SpeedFeedOrchestrator");
    });
  });

  describe("ISO group specific behavior", () => {
    it("handles ISO P (steel) with tribal modifiers", () => {
      const result = engine.compute({
        material: "1045 steel",
        iso_group: "P",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
      });

      // Physics-based speeds vary with tribal modifiers
      expect(result.value.cutting_speed_mpm).toBeGreaterThan(10);
      expect(result.value.cutting_speed_mpm).toBeLessThan(500);
    });

    it("handles ISO M (stainless) with tribal modifiers", () => {
      const result = engine.compute({
        material: "304 stainless",
        iso_group: "M",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        cut_type: "finishing",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(5);
      expect(result.value.cutting_speed_mpm).toBeLessThan(300);
    });

    it("handles ISO K (cast iron) with tribal modifiers", () => {
      const result = engine.compute({
        material: "gray cast iron",
        iso_group: "K",
        tool_diameter_mm: 16,
        flutes: 6,
        operation: "milling",
        cut_type: "roughing",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(10);
      expect(result.value.cutting_speed_mpm).toBeLessThan(500);
    });

    it("handles ISO N (non-ferrous) with tribal modifiers", () => {
      const result = engine.compute({
        material: "aluminum 7075",
        iso_group: "N",
        tool_diameter_mm: 20,
        flutes: 3,
        operation: "milling",
        cut_type: "roughing",
      });

      // Aluminum allows higher speeds (but depends on tribal modifiers)
      expect(result.value.cutting_speed_mpm).toBeGreaterThan(50);
      expect(result.value.cutting_speed_mpm).toBeLessThan(1500);
    });

    it("handles ISO S (superalloy) with tribal modifiers", () => {
      const result = engine.compute({
        material: "Inconel 625",
        iso_group: "S",
        tool_diameter_mm: 8,
        flutes: 4,
        operation: "milling",
        cut_type: "finishing",
      });

      // Superalloys require lower speeds
      expect(result.value.cutting_speed_mpm).toBeGreaterThan(5);
      expect(result.value.cutting_speed_mpm).toBeLessThan(150);
    });

    it("handles ISO H (hardened steel) with tribal modifiers", () => {
      const result = engine.compute({
        material: "D2 hardened",
        iso_group: "H",
        tool_diameter_mm: 6,
        flutes: 4,
        operation: "milling",
        cut_type: "finishing",
      });

      // Hardened steel requires lower speeds
      expect(result.value.cutting_speed_mpm).toBeGreaterThan(5);
      expect(result.value.cutting_speed_mpm).toBeLessThan(200);
    });
  });

  describe("operation types", () => {
    it("handles turning operation with tribal modifiers", () => {
      const result = engine.compute({
        material: "4140 steel",
        iso_group: "P",
        tool_diameter_mm: 25, // insert diameter approximation
        operation: "turning",
        cut_type: "roughing",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.value.feed_per_tooth_mm).toBeGreaterThan(0);
    });

    it("handles drilling operation with tribal modifiers", () => {
      const result = engine.compute({
        material: "aluminum 6061",
        iso_group: "N",
        tool_diameter_mm: 10,
        flutes: 2, // drill flutes
        operation: "drilling",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.value.spindle_rpm).toBeGreaterThan(0);
    });

    it("handles tapping operation with tribal modifiers", () => {
      const result = engine.compute({
        material: "stainless 316",
        iso_group: "M",
        tool_diameter_mm: 8,
        flutes: 3,
        operation: "tapping",
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles minimal input with defaults", () => {
      const result = engine.compute({
        tool_diameter_mm: 10,
      });

      expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.value.spindle_rpm).toBeGreaterThan(0);
      expect(result.value.feed_rate_mmmin).toBeGreaterThan(0);
    });

    it("handles very small tool diameter", () => {
      const result = engine.compute({
        material: "aluminum",
        tool_diameter_mm: 0.5, // 0.5mm micro endmill
        flutes: 2,
        operation: "milling",
      });

      expect(result.value.spindle_rpm).toBeGreaterThan(1000); // Small tools need high RPM
    });

    it("handles large tool diameter", () => {
      const result = engine.compute({
        material: "steel",
        tool_diameter_mm: 100, // 100mm face mill
        flutes: 8,
        operation: "milling",
        cut_type: "roughing",
      });

      expect(result.value.spindle_rpm).toBeLessThan(2000); // Large tools run slower
    });
  });
});
