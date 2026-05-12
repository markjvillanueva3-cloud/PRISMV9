/**
 * WireEDMUnifiedScienceEngine Tests
 * =================================
 * Tests PhD-level unified science engine integrating physics, chemistry,
 * metallurgy, thermodynamics for Wire EDM decision making.
 *
 * @milestone WEDM-SCIENCE-MS0
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMUnifiedScienceEngine,
  wireEDMUnifiedScienceEngine,
  WEDM_PHYSICAL_CONSTANTS,
  MATERIAL_DATABASE,
  type ScienceAnalysisInput,
  type UnifiedScienceAnalysis,
} from "../engines/WireEDMUnifiedScienceEngine.js";

describe("WireEDMUnifiedScienceEngine", () => {
  // ========================================================================
  // Singleton Pattern
  // ========================================================================
  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = WireEDMUnifiedScienceEngine.getInstance();
      const instance2 = WireEDMUnifiedScienceEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should export a singleton", () => {
      expect(wireEDMUnifiedScienceEngine).toBeInstanceOf(WireEDMUnifiedScienceEngine);
    });
  });

  // ========================================================================
  // Physical Constants
  // ========================================================================
  describe("Physical Constants", () => {
    it("should have plasma temperature at 12000K", () => {
      expect(WEDM_PHYSICAL_CONSTANTS.PLASMA_TEMPERATURE_K).toBe(12000);
    });

    it("should have correct heat partition coefficients summing to 1.0", () => {
      const total =
        WEDM_PHYSICAL_CONSTANTS.HEAT_PARTITION_ANODE +
        WEDM_PHYSICAL_CONSTANTS.HEAT_PARTITION_CATHODE +
        WEDM_PHYSICAL_CONSTANTS.HEAT_PARTITION_DIELECTRIC;
      expect(total).toBe(1.0);
    });

    it("should have spark channel diameter in microns", () => {
      expect(WEDM_PHYSICAL_CONSTANTS.SPARK_CHANNEL_DIAMETER_UM).toBe(50);
    });

    it("should have Stefan-Boltzmann constant", () => {
      expect(WEDM_PHYSICAL_CONSTANTS.STEFAN_BOLTZMANN).toBeCloseTo(5.67e-8, 10);
    });
  });

  // ========================================================================
  // Material Database
  // ========================================================================
  describe("Material Database", () => {
    it("should contain 10 materials", () => {
      expect(Object.keys(MATERIAL_DATABASE).length).toBe(10);
    });

    it("should contain D2 tool steel", () => {
      expect(MATERIAL_DATABASE.D2).toBeDefined();
      expect(MATERIAL_DATABASE.D2.name).toBe("D2 Tool Steel");
      expect(MATERIAL_DATABASE.D2.iso_group).toBe("H");
    });

    it("should contain tungsten carbide", () => {
      expect(MATERIAL_DATABASE.WC_CO).toBeDefined();
      expect(MATERIAL_DATABASE.WC_CO.edm_machinability).toBe(0.45);
    });

    it("should contain titanium alloy", () => {
      expect(MATERIAL_DATABASE.TI6AL4V).toBeDefined();
      expect(MATERIAL_DATABASE.TI6AL4V.iso_group).toBe("S");
    });

    it("should have valid thermal diffusivity for all materials", () => {
      for (const [name, mat] of Object.entries(MATERIAL_DATABASE)) {
        expect(mat.thermal_diffusivity_m2_s).toBeGreaterThan(0);
        expect(mat.melting_point_K).toBeGreaterThan(mat.thermal_conductivity_W_mK);
      }
    });

    it("should have edm_machinability in valid range (0-1)", () => {
      for (const mat of Object.values(MATERIAL_DATABASE)) {
        expect(mat.edm_machinability).toBeGreaterThan(0);
        expect(mat.edm_machinability).toBeLessThanOrEqual(1);
      }
    });
  });

  // ========================================================================
  // Full Unified Analysis
  // ========================================================================
  describe("analyze() - Full Unified Science", () => {
    const engine = wireEDMUnifiedScienceEngine;

    const standardInput: ScienceAnalysisInput = {
      material: "D2",
      thickness_mm: 25,
      peak_current_A: 15,
      pulse_on_us: 5,
      pulse_off_us: 10,
      gap_voltage_V: 25,
      wire_diameter_mm: 0.25,
      flush_pressure_bar: 6,
      submerged: true,
    };

    it("should return complete UnifiedScienceAnalysis", () => {
      const result = engine.analyze(standardInput);

      // Check all sections are present
      expect(result.material).toBe("D2");
      expect(result.thickness_mm).toBe(25);
      expect(result.spark).toBeDefined();
      expect(result.crater).toBeDefined();
      expect(result.thermal).toBeDefined();
      expect(result.metallurgy).toBeDefined();
      expect(result.electrochemistry).toBeDefined();
      expect(result.fluid).toBeDefined();
      expect(result.removal).toBeDefined();
      expect(result.feasibility_score).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should calculate spark discharge physics", () => {
      const result = engine.analyze(standardInput);

      expect(result.spark.energy_per_pulse_J).toBeGreaterThan(0);
      expect(result.spark.peak_power_W).toBe(25 * 15); // V × I
      expect(result.spark.plasma_temperature_K).toBe(12000);
      expect(result.spark.plasma_radius_um).toBeGreaterThan(0);
    });

    it("should calculate crater geometry", () => {
      const result = engine.analyze(standardInput);

      expect(result.crater.diameter_um).toBeGreaterThan(0);
      expect(result.crater.depth_um).toBeGreaterThan(0);
      expect(result.crater.volume_um3).toBeGreaterThan(0);
      expect(result.crater.depth_um).toBeLessThan(result.crater.diameter_um);
    });

    it("should calculate thermal analysis", () => {
      const result = engine.analyze(standardInput);

      // Heat partition should sum correctly
      const totalHeat =
        result.thermal.heat_to_workpiece_J +
        result.thermal.heat_to_wire_J +
        result.thermal.heat_to_dielectric_J;
      expect(totalHeat).toBeCloseTo(result.spark.energy_per_pulse_J, 5);

      expect(result.thermal.recast_layer_um).toBeGreaterThan(0);
      expect(result.thermal.haz_depth_um).toBeGreaterThan(result.thermal.recast_layer_um);
    });

    it("should calculate metallurgical effects", () => {
      const result = engine.analyze(standardInput);

      expect(result.metallurgy.surface_integrity_score).toBeLessThanOrEqual(100);
      expect(result.metallurgy.surface_integrity_score).toBeGreaterThanOrEqual(0);
      expect(result.metallurgy.residual_stress.type).toBe("tensile");
    });

    it("should calculate fluid dynamics", () => {
      const result = engine.analyze(standardInput);

      expect(result.fluid.reynolds_number).toBeGreaterThan(0);
      expect(["laminar", "transitional", "turbulent"]).toContain(result.fluid.flow_regime);
      expect(result.fluid.debris_evacuation_efficiency).toBeLessThanOrEqual(1);
      expect(result.fluid.cooling_effectiveness).toBe(0.85); // Submerged
    });

    it("should calculate material removal rate", () => {
      const result = engine.analyze(standardInput);

      expect(result.removal.mrr_kunieda_mm3_min).toBeGreaterThan(0);
      expect(result.removal.mrr_snoeys_mm3_min).toBeGreaterThan(0);
      expect(["melting", "vaporization", "spalling", "mixed"]).toContain(result.removal.mechanism);
    });

    it("should generate warnings for high recast layer", () => {
      const highPowerInput: ScienceAnalysisInput = {
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 40, // High current
        pulse_on_us: 15, // Long pulse
        pulse_off_us: 10,
      };

      const result = engine.analyze(highPowerInput);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should have high confidence for tool steels", () => {
      const result = engine.analyze(standardInput);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should handle unknown material by defaulting to D2", () => {
      const unknownInput: ScienceAnalysisInput = {
        material: "UNKNOWN_ALLOY",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      };

      const result = engine.analyze(unknownInput);
      expect(result).toBeDefined();
      expect(result.feasibility_score).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Material-Specific Analysis
  // ========================================================================
  describe("Material-Specific Behavior", () => {
    const engine = wireEDMUnifiedScienceEngine;

    it("should show lower machinability for tungsten carbide", () => {
      const d2Result = engine.analyze({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      const wcResult = engine.analyze({
        material: "WC_CO",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      expect(wcResult.removal.mrr_kunieda_mm3_min).toBeLessThan(d2Result.removal.mrr_kunieda_mm3_min);
    });

    it("should handle titanium with special recommendations", () => {
      const result = engine.analyze({
        material: "TI6AL4V",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      expect(result.recommendations.some(r => r.includes("Superalloy") || r.includes("wire"))).toBe(true);
    });

    it("should handle stainless steel", () => {
      const result = engine.analyze({
        material: "SS_304",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      expect(result.electrochemistry.electrolysis.corrosion_risk).toBe("medium");
    });
  });

  // ========================================================================
  // Quick Calculation Methods
  // ========================================================================
  describe("Quick Calculations", () => {
    const engine = wireEDMUnifiedScienceEngine;

    describe("quickMRR()", () => {
      it("should calculate MRR using Kunieda model", () => {
        const result = engine.quickMRR({
          material: "D2",
          thickness_mm: 25,
          peak_current_A: 15,
          pulse_on_us: 5,
        });

        expect(result.mrr_mm3_min).toBeGreaterThan(0);
        expect(result.confidence).toBe(0.88);
      });

      it("should return lower MRR for harder materials", () => {
        const d2 = engine.quickMRR({
          material: "D2",
          thickness_mm: 25,
          peak_current_A: 15,
          pulse_on_us: 5,
        });

        const wc = engine.quickMRR({
          material: "WC_CO",
          thickness_mm: 25,
          peak_current_A: 15,
          pulse_on_us: 5,
        });

        expect(wc.mrr_mm3_min).toBeLessThan(d2.mrr_mm3_min);
      });
    });

    describe("quickRa()", () => {
      it("should estimate surface roughness", () => {
        const result = engine.quickRa({
          peak_current_A: 15,
          pulse_on_us: 5,
        });

        expect(result.ra_um).toBeGreaterThan(0);
        expect(result.confidence).toBe(0.85);
      });

      it("should show higher Ra for higher current", () => {
        const low = engine.quickRa({ peak_current_A: 5, pulse_on_us: 2 });
        const high = engine.quickRa({ peak_current_A: 20, pulse_on_us: 8 });

        expect(high.ra_um).toBeGreaterThan(low.ra_um);
      });
    });

    describe("predictRecastLayer()", () => {
      it("should predict recast layer thickness", () => {
        const result = engine.predictRecastLayer({
          material: "D2",
          peak_current_A: 15,
          pulse_on_us: 5,
        });

        expect(result.thickness_um).toBeGreaterThan(0);
        expect(result.confidence).toBe(0.82);
      });

      it("should show thicker recast for higher current", () => {
        const low = engine.predictRecastLayer({
          material: "D2",
          peak_current_A: 5,
          pulse_on_us: 2,
        });

        const high = engine.predictRecastLayer({
          material: "D2",
          peak_current_A: 30,
          pulse_on_us: 10,
        });

        expect(high.thickness_um).toBeGreaterThan(low.thickness_um);
      });
    });
  });

  // ========================================================================
  // Utility Methods
  // ========================================================================
  describe("Utility Methods", () => {
    const engine = wireEDMUnifiedScienceEngine;

    describe("getMaterialProperties()", () => {
      it("should return properties for valid material", () => {
        const props = engine.getMaterialProperties("D2");
        expect(props).toBeDefined();
        expect(props?.name).toBe("D2 Tool Steel");
      });

      it("should be case-insensitive", () => {
        const upper = engine.getMaterialProperties("D2");
        const lower = engine.getMaterialProperties("d2");
        expect(upper).toEqual(lower);
      });

      it("should return undefined for unknown material", () => {
        const props = engine.getMaterialProperties("UNOBTAINIUM");
        expect(props).toBeUndefined();
      });
    });

    describe("listMaterials()", () => {
      it("should return array of material keys", () => {
        const materials = engine.listMaterials();
        expect(Array.isArray(materials)).toBe(true);
        expect(materials.length).toBe(10);
        expect(materials).toContain("D2");
        expect(materials).toContain("WC_CO");
        expect(materials).toContain("TI6AL4V");
      });
    });

    describe("getPhysicalConstants()", () => {
      it("should return physical constants object", () => {
        const constants = engine.getPhysicalConstants();
        expect(constants.PLASMA_TEMPERATURE_K).toBe(12000);
        expect(constants.HEAT_PARTITION_ANODE).toBe(0.18);
      });
    });
  });

  // ========================================================================
  // Edge Cases & Validation
  // ========================================================================
  describe("Edge Cases", () => {
    const engine = wireEDMUnifiedScienceEngine;

    it("should handle minimum thickness", () => {
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 0.5,
        peak_current_A: 5,
        pulse_on_us: 1,
        pulse_off_us: 5,
      });

      expect(result.feasibility_score).toBeGreaterThan(0);
    });

    it("should handle maximum thickness with warnings", () => {
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 100,
        peak_current_A: 20,
        pulse_on_us: 8,
        pulse_off_us: 12,
        submerged: false,
      });

      expect(result.warnings.some(w => w.includes("Thick section"))).toBe(true);
    });

    it("should handle very low current", () => {
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 1,
        pulse_on_us: 1,
        pulse_off_us: 20,
      });

      expect(result.removal.mrr_kunieda_mm3_min).toBeGreaterThan(0);
      expect(result.thermal.recast_layer_um).toBeLessThan(5);
    });

    it("should handle non-submerged cutting", () => {
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
        submerged: false,
      });

      expect(result.fluid.cooling_effectiveness).toBe(0.5);
    });
  });

  // ========================================================================
  // Scientific Model Validation
  // ========================================================================
  describe("Scientific Model Validation", () => {
    const engine = wireEDMUnifiedScienceEngine;

    it("should follow Kunieda MRR model: MRR ∝ Ip^1.2 × Ton^0.8 / H^0.3", () => {
      const base = engine.quickMRR({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 10,
        pulse_on_us: 5,
      });

      // Double current, MRR should increase by ~2^1.2 = 2.3
      const doubleCurrent = engine.quickMRR({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 20,
        pulse_on_us: 5,
      });

      const ratio = doubleCurrent.mrr_mm3_min / base.mrr_mm3_min;
      expect(ratio).toBeCloseTo(Math.pow(2, 1.2), 1);
    });

    it("should have correct heat partition (18% anode, 8% cathode, 74% dielectric)", () => {
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      const totalEnergy = result.spark.energy_per_pulse_J;
      expect(result.thermal.heat_to_workpiece_J).toBeCloseTo(totalEnergy * 0.18, 8);
      expect(result.thermal.heat_to_wire_J).toBeCloseTo(totalEnergy * 0.08, 8);
      expect(result.thermal.heat_to_dielectric_J).toBeCloseTo(totalEnergy * 0.74, 8);
    });

    it("should calculate plasma radius from DiBitonto model", () => {
      // r = k × I^0.43 × t^0.44
      const result = engine.analyze({
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      });

      const expectedRadius = 0.788 * Math.pow(15, 0.43) * Math.pow(5, 0.44);
      expect(result.spark.plasma_radius_um).toBeCloseTo(expectedRadius, 1);
    });
  });

  // ========================================================================
  // Integration Readiness
  // ========================================================================
  describe("Integration Readiness", () => {
    it("should export all required types", () => {
      // Type imports should work (compile-time check)
      const input: ScienceAnalysisInput = {
        material: "D2",
        thickness_mm: 25,
        peak_current_A: 15,
        pulse_on_us: 5,
        pulse_off_us: 10,
      };

      const result: UnifiedScienceAnalysis = wireEDMUnifiedScienceEngine.analyze(input);
      expect(result).toBeDefined();
    });

    it("should be ready for AGI orchestrator integration", () => {
      const engine = wireEDMUnifiedScienceEngine;

      // Check all methods exist
      expect(typeof engine.analyze).toBe("function");
      expect(typeof engine.quickMRR).toBe("function");
      expect(typeof engine.quickRa).toBe("function");
      expect(typeof engine.predictRecastLayer).toBe("function");
      expect(typeof engine.getMaterialProperties).toBe("function");
      expect(typeof engine.listMaterials).toBe("function");
      expect(typeof engine.getPhysicalConstants).toBe("function");
    });
  });
});
