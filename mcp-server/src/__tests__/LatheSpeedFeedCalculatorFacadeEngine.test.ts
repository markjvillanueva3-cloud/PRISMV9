/**
 * Tests for LatheSpeedFeedCalculatorFacadeEngine
 * LATHE-MASTER U-LTH07 — Phase P1: Speed & Feed Calculator
 *
 * Exit conditions: ≥12 tests, single-entry API, no duplication, build passes
 */
import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";

// Helper to build minimal valid input
const buildInput = (overrides: Partial<LatheSpeedFeedInput> = {}): LatheSpeedFeedInput => ({
  material: "4140",
  tool: {
    type: "turning_insert",
    diameter_mm: 12,
    nose_radius_mm: 0.8,
    ...overrides.tool,
  },
  operation: {
    type: "roughing",
    coolant: "flood",
    ...overrides.operation,
  },
  ...overrides,
});

describe("LatheSpeedFeedCalculatorFacadeEngine", () => {
  describe("calculate() — main entry point", () => {
    it("returns successful result for valid AISI material", () => {
      const input = buildInput({ material: "4140" });
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);

      expect(result.success).toBe(true);
      expect(result.recommendation.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.recommendation.rpm).toBeGreaterThan(0);
      expect(result.recommendation.feed_mm_rev).toBeGreaterThan(0);
      expect(result.recommendation.depth_of_cut_mm).toBeGreaterThan(0);
    });

    it("returns successful result for canonical material key", () => {
      const input = buildInput({ material: "alloy_steel" });
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);

      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("P");
    });

    it("returns failure for unknown material without ISO fallback", () => {
      const input = buildInput({ material: "unobtainium_xyz" });
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("not found");
    });

    it("uses ISO group fallback when specified", () => {
      const input = buildInput({ material: "custom_alloy", iso_group: "P" });
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);

      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("P");
    });
  });

  describe("material resolution", () => {
    it("resolves AISI 1018 to steel", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "1018" })
      );
      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("P");
    });

    it("resolves AISI 304 to stainless_304", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "304" })
      );
      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("M");
    });

    it("resolves Ti-6Al-4V to titanium_gr5", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "Ti-6Al-4V" })
      );
      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("S");
    });

    it("resolves 17-4PH to stainless_17_4ph", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "17-4PH" })
      );
      expect(result.success).toBe(true);
      expect(result.material_properties.iso_group).toBe("M");
    });
  });

  describe("operation type handling", () => {
    it("adjusts cutting speed for roughing vs finishing", () => {
      const roughing = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "roughing" } })
      );
      const finishing = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "finishing" } })
      );

      expect(finishing.recommendation.cutting_speed_m_min).toBeGreaterThan(
        roughing.recommendation.cutting_speed_m_min
      );
      expect(roughing.recommendation.feed_mm_rev).toBeGreaterThan(
        finishing.recommendation.feed_mm_rev
      );
    });

    it("handles threading operation", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "threading" } })
      );
      expect(result.success).toBe(true);
      expect(result.recommendation.feed_mm_rev).toBeLessThan(0.1);
    });

    it("handles parting operation with lower speeds", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "parting" } })
      );
      expect(result.success).toBe(true);
      // Parting has 0.6 factor
      expect(result.recommendation.cutting_speed_m_min).toBeLessThan(150);
    });
  });

  describe("strategy effects", () => {
    it("conservative strategy reduces parameters", () => {
      const balanced = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "balanced" })
      );
      const conservative = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "conservative" })
      );

      expect(conservative.recommendation.feed_mm_rev).toBeLessThan(
        balanced.recommendation.feed_mm_rev
      );
      expect(conservative.recommendation.depth_of_cut_mm).toBeLessThan(
        balanced.recommendation.depth_of_cut_mm
      );
    });

    it("aggressive strategy increases parameters", () => {
      const balanced = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "balanced" })
      );
      const aggressive = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "aggressive" })
      );

      expect(aggressive.recommendation.feed_mm_rev).toBeGreaterThan(
        balanced.recommendation.feed_mm_rev
      );
      expect(aggressive.recommendation.depth_of_cut_mm).toBeGreaterThan(
        balanced.recommendation.depth_of_cut_mm
      );
    });
  });

  describe("physics predictions", () => {
    it("calculates tool life using Taylor equation", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      expect(result.predicted_tool_life_min).toBeDefined();
      expect(result.predicted_tool_life_min).toBeGreaterThan(0);

      // Tool life depends on cutting speed via Taylor equation
      // Compare steel (lower speed) vs aluminum (higher speed)
      const steel = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "steel" })
      );
      const aluminum = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "aluminum_6061" })
      );
      // Aluminum has higher base cutting speed, so shorter tool life
      expect(aluminum.recommendation.cutting_speed_m_min).toBeGreaterThan(
        steel.recommendation.cutting_speed_m_min
      );
    });

    it("preserves sub-minute tool life instead of rounding to 0 (Taylor regression)", () => {
      // Regression guard for the lathe-wizard combinatorial-sweep finding (2026-07-02):
      // high-Vc stainless finishing yields a real sub-minute Taylor life (~0.46 min for
      // 304 @ Vc≈234 m/min). A plain Math.round() collapsed it to 0 min — a physically
      // impossible "instant tool failure" output. The fix keeps 3 significant figures
      // below 1 minute (life>=1 ? round : toPrecision(3)).
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({
          material: "304",
          operation: { type: "finishing", coolant: "high_pressure" },
          strategy: "aggressive",
          tool: { type: "turning_insert", nose_radius_mm: 0.4 },
        })
      );

      expect(result.success).toBe(true);
      // A genuine sub-minute value — proves the >0 assertion is load-bearing, not a
      // large-life vacuous pass.
      expect(result.predicted_tool_life_min!).toBeLessThan(1);
      // Never collapsed to exactly 0 (the pre-fix Math.round failure mode).
      expect(result.predicted_tool_life_min).toBeGreaterThan(0);
    });

    it("calculates cutting force using Kienzle model", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      expect(result.predicted_force_N).toBeDefined();
      expect(result.predicted_force_N).toBeGreaterThan(0);
    });

    it("calculates power requirement", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      expect(result.predicted_power_kw).toBeDefined();
      expect(result.predicted_power_kw).toBeGreaterThan(0);
    });

    it("calculates surface finish prediction", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "finishing" } })
      );

      expect(result.predicted_ra_um).toBeDefined();
      expect(result.predicted_ra_um).toBeGreaterThan(0);
    });

    it("warns when Ra exceeds target", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({
          operation: { type: "finishing", target_ra_um: 0.4 },
          tool: { type: "turning_insert", nose_radius_mm: 0.4 },
        })
      );

      // With small nose radius and target Ra of 0.4, likely to exceed
      if (result.predicted_ra_um! > 0.4) {
        expect(result.warnings.some((w) => w.includes("Ra"))).toBe(true);
      }
    });
  });

  describe("operating band", () => {
    it("returns valid operating band", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      expect(result.band.vc_min).toBeLessThan(result.recommendation.cutting_speed_m_min);
      expect(result.band.vc_max).toBeGreaterThan(result.recommendation.cutting_speed_m_min);
      expect(result.band.feed_min).toBeLessThan(result.recommendation.feed_mm_rev);
      expect(result.band.feed_max).toBeGreaterThan(result.recommendation.feed_mm_rev);
    });

    it("conservative strategy has narrower band", () => {
      const balanced = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "balanced" })
      );
      const conservative = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ strategy: "conservative" })
      );

      const balancedRange = balanced.band.vc_max - balanced.band.vc_min;
      const conservativeRange = conservative.band.vc_max - conservative.band.vc_min;

      expect(conservativeRange).toBeLessThan(balancedRange);
    });
  });

  describe("reasoning chain", () => {
    it("includes material resolution step", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      const matStep = result.reasoning.find((r) => r.step.includes("Material"));
      expect(matStep).toBeDefined();
    });

    it("includes cutting speed calculation step", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      const vcStep = result.reasoning.find((r) => r.step.includes("cutting speed"));
      expect(vcStep).toBeDefined();
      expect(vcStep?.method).toContain("Vc");
    });

    it("includes Kienzle force step", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      const forceStep = result.reasoning.find((r) => r.step.includes("Kienzle"));
      expect(forceStep).toBeDefined();
      expect(forceStep?.method).toContain("kc1.1");
    });

    it("includes Taylor tool life step", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      const lifeStep = result.reasoning.find((r) => r.step.includes("Taylor"));
      expect(lifeStep).toBeDefined();
      expect(lifeStep?.method).toContain("ISO 3685");
    });
  });

  describe("sources tracking", () => {
    it("lists consulted sources", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.sources.some((s) => s.name === "CANONICAL_MATERIAL_DB")).toBe(true);
    });

    it("sources have weights", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());

      for (const source of result.sources) {
        expect(source.weight).toBeGreaterThan(0);
        expect(source.weight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("confidence scoring", () => {
    it("has high confidence for direct canonical match", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "alloy_steel" })
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("has lower confidence for alias resolution", () => {
      const direct = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "alloy_steel" })
      );
      const alias = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ material: "4140" })
      );

      expect(alias.confidence).toBeLessThanOrEqual(direct.confidence);
    });

    it("reduces confidence with warnings", () => {
      const noWarnings = LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput());
      const withWarnings = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({
          operation: { type: "finishing", target_ra_um: 0.1 },
          tool: { type: "turning_insert", nose_radius_mm: 0.2 },
        })
      );

      if (withWarnings.warnings.length > noWarnings.warnings.length) {
        expect(withWarnings.confidence).toBeLessThan(noWarnings.confidence);
      }
    });
  });

  describe("machine constraints", () => {
    it("respects max RPM limit", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({
          machine: { max_rpm: 2000 },
          workpiece: { diameter_mm: 20 },
        })
      );

      expect(result.recommendation.rpm).toBeLessThanOrEqual(2000);
    });

    it("warns when power exceeds machine capacity", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({
          machine: { max_power_kw: 1 }, // Very low
          strategy: "aggressive",
        })
      );

      if (result.predicted_power_kw! > 0.9) {
        expect(result.warnings.some((w) => w.includes("power"))).toBe(true);
      }
    });

    it("adjusts for machine rigidity factor", () => {
      const rigid = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ machine: { rigidity_factor: 1.2 } })
      );
      const flexible = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ machine: { rigidity_factor: 0.7 } })
      );

      expect(rigid.recommendation.depth_of_cut_mm).toBeGreaterThan(
        flexible.recommendation.depth_of_cut_mm
      );
    });
  });

  describe("coolant effects", () => {
    it("dry cutting reduces speed", () => {
      const flood = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "roughing", coolant: "flood" } })
      );
      const dry = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "roughing", coolant: "dry" } })
      );

      expect(dry.recommendation.cutting_speed_m_min).toBeLessThan(
        flood.recommendation.cutting_speed_m_min
      );
    });

    it("high pressure coolant increases speed", () => {
      const flood = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "roughing", coolant: "flood" } })
      );
      const hp = LatheSpeedFeedCalculatorFacadeEngine.calculate(
        buildInput({ operation: { type: "roughing", coolant: "high_pressure" } })
      );

      expect(hp.recommendation.cutting_speed_m_min).toBeGreaterThan(
        flood.recommendation.cutting_speed_m_min
      );
    });
  });

  describe("utility methods", () => {
    it("getVersion returns version string", () => {
      const version = LatheSpeedFeedCalculatorFacadeEngine.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("listSupportedMaterials returns array of materials", () => {
      const materials = LatheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials();

      expect(Array.isArray(materials)).toBe(true);
      expect(materials.length).toBeGreaterThan(20); // AISI + canonical
      expect(materials).toContain("4140");
      expect(materials).toContain("alloy_steel");
      expect(materials).toContain("Ti-6Al-4V");
    });
  });
});
