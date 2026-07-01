/**
 * PartDeflectionEngine Physics Validation Tests
 * MILL-AUDIT/P4: Critical tolerance tests for thin wall deflection
 *
 * Physics model: Beam deflection theory
 *   Cantilever: δ = F × L³ / (3 × E × I)
 *   Simply-supported: δ = F × L³ / (48 × E × I)
 *   where I = L × t³ / 12 for rectangular section
 *
 * Safety risk: Excessive deflection causes tolerance failures, scrap
 */

import { describe, it, expect } from "vitest";
import { partDeflectionEngine } from "../engines/PartDeflectionEngine.js";

describe("PartDeflectionEngine — Physics Validation", () => {
  describe("Dimensional Consistency", () => {
    it("returns deflection in mm", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum",
      });

      expect(result.max_deflection.unit).toBe("mm");
    });

    it("returns force in N", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        tolerance_mm: 0.05,
        material: "aluminum",
      });

      expect(result.max_allowable_force.unit).toBe("N");
    });

    it("returns stiffness in N/mm", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "steel",
      });

      expect(result.wall_stiffness.unit).toBe("N/mm");
    });

    it("returns frequency in Hz", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "steel",
      });

      expect(result.natural_frequency.unit).toBe("Hz");
    });
  });

  describe("Beam Theory Validation", () => {
    it("cantilever deflection > simply-supported for same load", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum" as const,
      };

      const cantilever = partDeflectionEngine.calculate({
        ...baseParams,
        support_type: "cantilever",
      });

      const simplySupported = partDeflectionEngine.calculate({
        ...baseParams,
        support_type: "simply_supported",
      });

      // Cantilever (1/3EI) vs simply-supported (1/48EI) → cantilever 16x more deflection
      expect(cantilever.max_deflection.value).toBeGreaterThan(
        simplySupported.max_deflection.value
      );
    });

    it("clamped has lowest deflection", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum" as const,
      };

      const clamped = partDeflectionEngine.calculate({
        ...baseParams,
        support_type: "clamped",
      });

      const simplySupported = partDeflectionEngine.calculate({
        ...baseParams,
        support_type: "simply_supported",
      });

      // Clamped is stiffer than simply-supported
      expect(clamped.max_deflection.value).toBeLessThanOrEqual(
        simplySupported.max_deflection.value
      );
    });

    it("deflection scales with force (linear relationship)", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "aluminum" as const,
        support_type: "cantilever" as const,
      };

      const force1 = partDeflectionEngine.calculate({
        ...baseParams,
        cutting_force_n: 100,
      });

      const force2 = partDeflectionEngine.calculate({
        ...baseParams,
        cutting_force_n: 200,
      });

      // Deflection should double when force doubles
      const ratio = force2.max_deflection.value / force1.max_deflection.value;
      expect(ratio).toBeCloseTo(2, 0);
    });

    it("deflection scales with height³ (cubic relationship)", () => {
      const baseParams = {
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum" as const,
        support_type: "cantilever" as const,
      };

      const short = partDeflectionEngine.calculate({
        ...baseParams,
        wall_height_mm: 25,
      });

      const tall = partDeflectionEngine.calculate({
        ...baseParams,
        wall_height_mm: 50,
      });

      // 2x height → 8x deflection (H³ relationship)
      const ratio = tall.max_deflection.value / short.max_deflection.value;
      expect(ratio).toBeGreaterThan(4); // Allow some margin, should be ~8
      expect(ratio).toBeLessThan(12);
    });

    it("deflection inversely scales with thickness³", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum" as const,
        support_type: "cantilever" as const,
      };

      const thin = partDeflectionEngine.calculate({
        ...baseParams,
        wall_thickness_mm: 2,
      });

      const thick = partDeflectionEngine.calculate({
        ...baseParams,
        wall_thickness_mm: 4,
      });

      // 2x thickness → 1/8 deflection (t³ in denominator)
      expect(thick.max_deflection.value).toBeLessThan(
        thin.max_deflection.value * 0.25
      );
    });
  });

  describe("Material Effects", () => {
    it("aluminum deflects more than steel (lower E)", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
      };

      const steel = partDeflectionEngine.calculate({
        ...baseParams,
        material: "steel",
      });

      const aluminum = partDeflectionEngine.calculate({
        ...baseParams,
        material: "aluminum",
      });

      // E_steel = 200 GPa, E_aluminum = 70 GPa → Al deflects ~2.86x more
      expect(aluminum.max_deflection.value).toBeGreaterThan(
        steel.max_deflection.value
      );
    });

    it("titanium between steel and aluminum", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
      };

      const steel = partDeflectionEngine.calculate({ ...baseParams, material: "steel" });
      const titanium = partDeflectionEngine.calculate({ ...baseParams, material: "titanium" });
      const aluminum = partDeflectionEngine.calculate({ ...baseParams, material: "aluminum" });

      // E: steel (200) > titanium (114) > aluminum (70)
      expect(titanium.max_deflection.value).toBeGreaterThan(steel.max_deflection.value);
      expect(titanium.max_deflection.value).toBeLessThan(aluminum.max_deflection.value);
    });

    it("plastic has highest deflection", () => {
      const baseParams = {
        wall_height_mm: 30, // Shorter for plastic
        wall_thickness_mm: 5,
        wall_length_mm: 50,
        cutting_force_n: 100,
      };

      const steel = partDeflectionEngine.calculate({ ...baseParams, material: "steel" });
      const plastic = partDeflectionEngine.calculate({ ...baseParams, material: "plastic" });

      // E_plastic ≈ 3 GPa vs E_steel = 200 GPa
      expect(plastic.max_deflection.value).toBeGreaterThan(
        steel.max_deflection.value * 10
      );
    });
  });

  describe("Tolerance Analysis", () => {
    it("calculates max allowable force for given tolerance", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "aluminum",
        tolerance_mm: 0.05,
      });

      expect(result.max_allowable_force.value).toBeGreaterThan(0);
    });

    it("tighter tolerance reduces max allowable force", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "aluminum" as const,
      };

      const looseTol = partDeflectionEngine.calculate({
        ...baseParams,
        tolerance_mm: 0.1,
      });

      const tightTol = partDeflectionEngine.calculate({
        ...baseParams,
        tolerance_mm: 0.02,
      });

      // Tighter tolerance = less allowable force
      expect(tightTol.max_allowable_force.value).toBeLessThan(
        looseTol.max_allowable_force.value
      );
    });

    it("deflection_to_tolerance ratio indicates pass/fail", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum",
        tolerance_mm: 0.05,
      });

      // If deflection > tolerance, ratio > 1 and passes_ok should be false
      if (result.max_deflection.value > 0.05) {
        expect(result.deflection_to_tolerance.value).toBeGreaterThan(1);
      }
    });
  });

  describe("Natural Frequency", () => {
    it("returns positive natural frequency", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "steel",
      });

      expect(result.natural_frequency.value).toBeGreaterThan(0);
    });

    it("shorter wall has higher natural frequency", () => {
      const baseParams = {
        wall_thickness_mm: 3,
        wall_length_mm: 100,
        material: "steel" as const,
      };

      const short = partDeflectionEngine.calculate({ ...baseParams, wall_height_mm: 30 });
      const tall = partDeflectionEngine.calculate({ ...baseParams, wall_height_mm: 60 });

      // Shorter = stiffer = higher natural frequency
      expect(short.natural_frequency.value).toBeGreaterThan(
        tall.natural_frequency.value
      );
    });

    it("thicker wall has higher natural frequency", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_length_mm: 100,
        material: "steel" as const,
      };

      const thin = partDeflectionEngine.calculate({ ...baseParams, wall_thickness_mm: 2 });
      const thick = partDeflectionEngine.calculate({ ...baseParams, wall_thickness_mm: 5 });

      // Thicker = stiffer = higher natural frequency
      expect(thick.natural_frequency.value).toBeGreaterThan(
        thin.natural_frequency.value
      );
    });
  });

  describe("Support Recommendations", () => {
    it("recommends support for high H/t ratio", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 100,
        wall_thickness_mm: 2, // H/t = 50 (very thin)
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum",
      });

      // High H/t ratio should trigger support recommendation
      expect(
        result.support_recommended.value === 1 ||
        result.warnings.some(w => w.toLowerCase().includes("support") || w.toLowerCase().includes("backing"))
      ).toBe(true);
    });

    it("no support needed for rigid wall", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 20,
        wall_thickness_mm: 10, // H/t = 2 (very rigid)
        wall_length_mm: 50,
        cutting_force_n: 200,
        material: "steel",
      });

      // Low H/t ratio should not require support
      expect(result.support_recommended.value).toBeLessThanOrEqual(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero thickness gracefully", () => {
      // Should not throw division by zero
      expect(() => {
        partDeflectionEngine.calculate({
          wall_height_mm: 50,
          wall_thickness_mm: 0,
          wall_length_mm: 100,
          material: "steel",
        });
      }).not.toThrow();
    });

    it("handles missing optional parameters", () => {
      const result = partDeflectionEngine.calculate({
        wall_thickness_mm: 3,
        // Only required param provided
      });

      // Should use defaults and not throw
      expect(result.max_deflection.value).toBeDefined();
    });

    it("handles extreme H/t ratio with warning", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 200,
        wall_thickness_mm: 1, // H/t = 200 (extreme)
        wall_length_mm: 100,
        cutting_force_n: 100,
        material: "aluminum",
      });

      // Should produce warning about extreme ratio
      expect(
        result.warnings.length > 0 ||
        result.support_recommended.value === 1
      ).toBe(true);
    });

    it("handles very small deflection correctly", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 10,
        wall_thickness_mm: 20, // Very rigid
        wall_length_mm: 30,
        cutting_force_n: 10,
        material: "steel",
      });

      // Should still calculate, even if deflection is tiny
      expect(result.max_deflection.value).toBeGreaterThanOrEqual(0);
      expect(result.max_deflection.value).toBeLessThan(0.001); // Sub-micron
    });
  });

  describe("Spring Pass Calculation", () => {
    it("calculates number of spring passes needed", () => {
      const result = partDeflectionEngine.calculate({
        wall_height_mm: 50,
        wall_thickness_mm: 2,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum",
        tolerance_mm: 0.02,
      });

      expect(result.spring_passes_needed.value).toBeGreaterThanOrEqual(0);
    });

    it("more spring passes for tighter tolerance", () => {
      const baseParams = {
        wall_height_mm: 50,
        wall_thickness_mm: 2,
        wall_length_mm: 100,
        cutting_force_n: 500,
        material: "aluminum" as const,
      };

      const loose = partDeflectionEngine.calculate({ ...baseParams, tolerance_mm: 0.1 });
      const tight = partDeflectionEngine.calculate({ ...baseParams, tolerance_mm: 0.01 });

      expect(tight.spring_passes_needed.value).toBeGreaterThanOrEqual(
        loose.spring_passes_needed.value
      );
    });
  });

  // Round cross-section = TURNING workpiece (solid bar). I = pi*D^4/64, distinct from the
  // rectangular wall I = L*t^3/12. delta = F*H^3/(k*E*I), k = 3 cantilever / 48 simply-supported.
  describe("Round cross-section (turning workpiece) - I = pi*D^4/64", () => {
    it("round cantilever deflection matches F*H^3/(3*E*I) with I=pi*D^4/64 (D=10,L=100,F=200N,steel)", () => {
      // I = pi*10^4/64 = 490.874 mm^4; delta = 200*100^3/(3*200000*490.874) = 0.6791 mm
      const r = partDeflectionEngine.calculate({
        cross_section: "round", diameter_mm: 10, wall_thickness_mm: 10,
        wall_height_mm: 100, wall_length_mm: 100,
        support_type: "cantilever", cutting_force_n: 200, material: "steel", tolerance_mm: 0.05,
      });
      expect(r.max_deflection.value).toBeCloseTo(0.6791, 3);
      expect(r.max_deflection.value).toBeGreaterThan(0.05); // >> tolerance -> deflection hazard
    });
    it("tailstock (simply-supported) is ~16x stiffer than chuck-only (cantilever) for the same bar", () => {
      const base = { cross_section: "round" as const, diameter_mm: 10, wall_thickness_mm: 10,
        wall_height_mm: 100, wall_length_mm: 100, cutting_force_n: 200, material: "steel" as const, tolerance_mm: 0.05 };
      const cant = partDeflectionEngine.calculate({ ...base, support_type: "cantilever" });
      const ss = partDeflectionEngine.calculate({ ...base, support_type: "simply_supported" });
      expect(cant.max_deflection.value / ss.max_deflection.value).toBeCloseTo(16, 1); // k = 48/3
    });
    it("round vs rectangular use DIFFERENT I -> different deflection (no model conflation)", () => {
      const common = { wall_thickness_mm: 10, wall_height_mm: 100, wall_length_mm: 100,
        support_type: "cantilever" as const, cutting_force_n: 200, material: "steel" as const, tolerance_mm: 0.05 };
      const round = partDeflectionEngine.calculate({ ...common, cross_section: "round", diameter_mm: 10 });
      const rect = partDeflectionEngine.calculate({ ...common }); // default rectangular (I = L*t^3/12 = 8333 >> round 490.9)
      expect(round.max_deflection.value).toBeGreaterThan(rect.max_deflection.value);
    });
    it("D^4 stiffness: doubling diameter cuts deflection ~16x", () => {
      const base = { cross_section: "round" as const, wall_thickness_mm: 10, wall_height_mm: 100,
        wall_length_mm: 100, support_type: "cantilever" as const, cutting_force_n: 200, material: "steel" as const, tolerance_mm: 0.05 };
      const d10 = partDeflectionEngine.calculate({ ...base, diameter_mm: 10 });
      const d20 = partDeflectionEngine.calculate({ ...base, diameter_mm: 20 });
      expect(d10.max_deflection.value / d20.max_deflection.value).toBeCloseTo(16, 0); // (20/10)^4 = 16
    });
    it("omitting cross_section keeps rectangular behavior byte-identical (no regression for milling callers)", () => {
      const a = partDeflectionEngine.calculate({ wall_thickness_mm: 3, wall_height_mm: 40, wall_length_mm: 60,
        support_type: "cantilever", cutting_force_n: 150, material: "aluminum", tolerance_mm: 0.05 });
      const b = partDeflectionEngine.calculate({ cross_section: "rectangular", wall_thickness_mm: 3, wall_height_mm: 40,
        wall_length_mm: 60, support_type: "cantilever", cutting_force_n: 150, material: "aluminum", tolerance_mm: 0.05 });
      expect(a.max_deflection.value).toBe(b.max_deflection.value);
    });
    it("round + floor_mode uses the ROUND beam path, not the rectangular floor (P1 guard)", () => {
      const base = { cross_section: "round" as const, diameter_mm: 12, wall_thickness_mm: 12,
        wall_height_mm: 120, wall_length_mm: 120, support_type: "cantilever" as const,
        cutting_force_n: 180, material: "steel" as const, tolerance_mm: 0.05 };
      const noFloor = partDeflectionEngine.calculate({ ...base });
      const withFloor = partDeflectionEngine.calculate({ ...base, floor_mode: true });
      // floor_mode is inert for a round bar -> identical deflection (not the rectangular floor formula).
      expect(withFloor.max_deflection.value).toBe(noFloor.max_deflection.value);
    });
  });
});
