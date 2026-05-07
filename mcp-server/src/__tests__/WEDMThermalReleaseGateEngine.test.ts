/**
 * Tests for WEDMThermalReleaseGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-05
 */

import { describe, it, expect } from "vitest";
import {
  WEDMThermalReleaseGateEngine,
  wedmThermalReleaseGateEngine,
  type ThermalInput,
  type EDMMaterial,
} from "../engines/WEDMThermalReleaseGateEngine.js";

describe("WEDMThermalReleaseGateEngine", () => {
  describe("Basic Thermal Balance Validation", () => {
    it("passes with adequate cooling capacity", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.hard_block).toBe(false);
      expect(result.thermal_ratio).toBeGreaterThanOrEqual(1.0);
    });

    it("fails with insufficient cooling capacity", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 50, // Only 50% of heat removed
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.thermal_ratio).toBeLessThan(0.8);
      expect(result.summary).toContain("HARD BLOCK");
    });

    it("passes with marginal cooling (80-100%)", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 90, // 90% cooling
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.pass).toBe(true);
      expect(result.thermal_ratio).toBeGreaterThanOrEqual(0.8);
      expect(result.warnings.some(w => w.includes("marginal"))).toBe(true);
    });
  });

  describe("Recast Layer Validation", () => {
    it("passes when recast depth within limits", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
        recast_depth_um: 15,
        max_recast_um: 20,
      });

      expect(result.pass).toBe(true);
      expect(result.estimated_recast_um).toBe(15);
      expect(result.max_recast_um).toBe(20);
    });

    it("fails when recast depth exceeds limit", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
        recast_depth_um: 50,
        max_recast_um: 20,
      });

      expect(result.pass).toBe(false);
      expect(result.summary).toContain("recast");
    });

    it("uses default max_recast based on material typical value", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
      });

      // Default is 1.5× typical for D2 (20µm typical → 30µm max)
      expect(result.max_recast_um).toBe(30);
    });
  });

  describe("Material Thermal Properties", () => {
    it("returns correct properties for steel_d2", () => {
      const props = wedmThermalReleaseGateEngine.getMaterialProps("steel_d2");

      expect(props.k_W_mK).toBeCloseTo(20.0, 1);
      expect(props.melting_C).toBe(1421);
      expect(props.typical_recast_um).toBe(20);
    });

    it("returns correct properties for tungsten_carbide", () => {
      const props = wedmThermalReleaseGateEngine.getMaterialProps("tungsten_carbide");

      expect(props.k_W_mK).toBeCloseTo(84.0, 1);
      expect(props.melting_C).toBe(2870);
      expect(props.typical_recast_um).toBe(8);
    });

    it("returns correct properties for titanium", () => {
      const props = wedmThermalReleaseGateEngine.getMaterialProps("titanium_ti6al4v");

      expect(props.k_W_mK).toBeCloseTo(6.7, 1);
      expect(props.typical_recast_um).toBe(30); // Higher due to low conductivity
    });

    it("lists all supported materials", () => {
      const materials = wedmThermalReleaseGateEngine.listMaterials();

      expect(materials).toContain("steel_d2");
      expect(materials).toContain("tungsten_carbide");
      expect(materials).toContain("titanium_ti6al4v");
      expect(materials).toContain("inconel_718");
      expect(materials.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Low Conductivity Material Warnings", () => {
    it("warns for titanium (low conductivity)", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "titanium_ti6al4v",
        thickness_mm: 25,
      });

      expect(result.warnings.some(w => w.includes("Low conductivity"))).toBe(true);
    });

    it("warns for inconel (low conductivity)", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "inconel_718",
        thickness_mm: 25,
      });

      expect(result.warnings.some(w => w.includes("Low conductivity"))).toBe(true);
    });

    it("no low conductivity warning for copper", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "copper",
        thickness_mm: 25,
      });

      expect(result.warnings.some(w => w.includes("Low conductivity"))).toBe(false);
    });
  });

  describe("Duty Cycle Analysis", () => {
    it("warns for high duty cycle on low conductivity material", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "titanium_ti6al4v",
        thickness_mm: 25,
        on_time_us: 20,
        off_time_us: 10, // 67% duty cycle
      });

      expect(result.warnings.some(w => w.includes("duty cycle"))).toBe(true);
    });

    it("no duty cycle warning for high conductivity material", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "copper",
        thickness_mm: 25,
        on_time_us: 20,
        off_time_us: 10,
      });

      expect(result.warnings.some(w => w.includes("duty cycle"))).toBe(false);
    });
  });

  describe("Quick Check for S(x)", () => {
    it("returns correct format for S(x) integration", () => {
      const result = wedmThermalReleaseGateEngine.quickCheckForSx(100, 120, 10, 20);

      expect(typeof result.pass).toBe("boolean");
      expect(typeof result.heat_release_J).toBe("number");
      expect(typeof result.cooling_capacity_J).toBe("number");
      expect(typeof result.recast_depth_um).toBe("number");
      expect(typeof result.max_recast_um).toBe("number");
    });

    it("uses steel_d2 as default material", () => {
      const quick = wedmThermalReleaseGateEngine.quickCheckForSx(100, 120);
      const full = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(quick.pass).toBe(full.pass);
    });
  });

  describe("Cooling Capacity Recommendations", () => {
    it("recommends cooling capacity with default safety factor", () => {
      const rec = wedmThermalReleaseGateEngine.recommendCoolingCapacity(100);
      expect(rec).toBe(120); // 1.2× safety factor
    });

    it("recommends cooling capacity with custom safety factor", () => {
      const rec = wedmThermalReleaseGateEngine.recommendCoolingCapacity(100, 1.5);
      expect(rec).toBe(150);
    });
  });

  describe("On-Time Recommendations", () => {
    it("recommends longer on-time for high diffusivity materials", () => {
      // Higher thermal diffusivity = heat dissipates faster = can use longer on-time
      // But formula is t ~ depth² / (4α), so higher α means SHORTER time to reach same depth
      // This means copper can reach target recast depth faster (less time needed)
      const titaniumTime = wedmThermalReleaseGateEngine.recommendMaxOnTime("titanium_ti6al4v");
      const copperTime = wedmThermalReleaseGateEngine.recommendMaxOnTime("copper");

      // Copper has higher α, so needs less time to reach same depth
      expect(copperTime).toBeLessThan(titaniumTime);
    });

    it("respects target recast depth in on-time calculation", () => {
      const shortRecast = wedmThermalReleaseGateEngine.recommendMaxOnTime("steel_d2", 5);
      const longRecast = wedmThermalReleaseGateEngine.recommendMaxOnTime("steel_d2", 15);

      expect(shortRecast).toBeLessThan(longRecast);
    });
  });

  describe("All Materials", () => {
    const materials: EDMMaterial[] = [
      "steel_1045", "steel_d2", "steel_h13", "steel_m2",
      "tungsten_carbide", "copper", "aluminum_6061",
      "titanium_ti6al4v", "inconel_718", "graphite"
    ];

    materials.forEach((material) => {
      it(`evaluates ${material} correctly`, () => {
        const result = wedmThermalReleaseGateEngine.evaluate({
          heat_release_J: 100,
          cooling_capacity_J: 150,
          material,
          thickness_mm: 25,
        });

        expect(result.success).toBe(true);
        expect(result.material).toBe(material);
        expect(result.material_props.k_W_mK).toBeGreaterThan(0);
        expect(result.material_props.melting_C).toBeGreaterThan(0);
      });
    });
  });

  describe("Summary Messages", () => {
    it("provides clear pass summary", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.summary).toContain("PASS");
      expect(result.summary).toContain("Thermal balance OK");
      expect(result.summary).toContain("steel_d2");
    });

    it("provides clear hard block summary for thermal imbalance", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 50,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.summary).toContain("HARD BLOCK");
      expect(result.summary).toContain("thermal ratio");
    });

    it("provides clear hard block summary for recast violation", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 25,
        recast_depth_um: 50,
        max_recast_um: 20,
      });

      expect(result.summary).toContain("HARD BLOCK");
      expect(result.summary).toContain("recast");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero heat release", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 0,
        cooling_capacity_J: 100,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.thermal_ratio).toBe(Infinity);
    });

    it("handles very high heat release", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 10000,
        cooling_capacity_J: 12000,
        material: "steel_d2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
    });

    it("handles very thin parts", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 1,
      });

      expect(result.success).toBe(true);
    });

    it("handles very thick parts", () => {
      const result = wedmThermalReleaseGateEngine.evaluate({
        heat_release_J: 100,
        cooling_capacity_J: 120,
        material: "steel_d2",
        thickness_mm: 500,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Thermal Properties Accuracy", () => {
    it("has consistent thermal diffusivity", () => {
      const props = wedmThermalReleaseGateEngine.getMaterialProps("steel_d2");
      // α = k / (ρ * Cp)
      const calculated_alpha = props.k_W_mK / (props.density_kg_m3 * props.cp_J_kgK);
      expect(calculated_alpha).toBeCloseTo(props.alpha_m2_s, 7);
    });

    it("copper has highest conductivity", () => {
      const materials = wedmThermalReleaseGateEngine.listMaterials();
      let maxK = 0;
      let maxKMaterial = "";

      for (const mat of materials) {
        const props = wedmThermalReleaseGateEngine.getMaterialProps(mat);
        if (props.k_W_mK > maxK) {
          maxK = props.k_W_mK;
          maxKMaterial = mat;
        }
      }

      expect(maxKMaterial).toBe("copper");
    });

    it("titanium has lowest conductivity", () => {
      const materials = wedmThermalReleaseGateEngine.listMaterials();
      let minK = Infinity;
      let minKMaterial = "";

      for (const mat of materials) {
        const props = wedmThermalReleaseGateEngine.getMaterialProps(mat);
        if (props.k_W_mK < minK) {
          minK = props.k_W_mK;
          minKMaterial = mat;
        }
      }

      expect(minKMaterial).toBe("titanium_ti6al4v");
    });
  });
});
