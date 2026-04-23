/**
 * WEDMDielectricCorrectionEngine Tests
 * Dielectric-specific spark gap correction
 */

import { describe, it, expect } from "vitest";
import {
  wedmDielectricCorrectionEngine,
  WEDMDielectricCorrectionEngine,
} from "../engines/WEDMDielectricCorrectionEngine.js";

describe("WEDMDielectricCorrectionEngine", () => {
  describe("getDielectricProperties", () => {
    it("returns properties for DI water", () => {
      const props = wedmDielectricCorrectionEngine.getDielectricProperties("di_water");
      expect(props.type).toBe("di_water");
      expect(props.gap_factor).toBe(0.85);
      expect(props.dielectric_constant).toBe(80);
    });

    it("returns properties for oil", () => {
      const props = wedmDielectricCorrectionEngine.getDielectricProperties("oil");
      expect(props.type).toBe("oil");
      expect(props.gap_factor).toBe(1.0);
    });
  });

  describe("calculateTemperatureFactor", () => {
    it("returns 1.0 at reference temperature", () => {
      const factor = wedmDielectricCorrectionEngine.calculateTemperatureFactor(20);
      expect(factor).toBe(1.0);
    });

    it("increases gap at higher temperature", () => {
      const factor = wedmDielectricCorrectionEngine.calculateTemperatureFactor(30);
      expect(factor).toBeGreaterThan(1.0);
    });

    it("decreases gap at lower temperature", () => {
      const factor = wedmDielectricCorrectionEngine.calculateTemperatureFactor(10);
      expect(factor).toBeLessThan(1.0);
    });
  });

  describe("calculateConductivityFactor", () => {
    it("returns ~1.0 for expected conductivity", () => {
      const factor = wedmDielectricCorrectionEngine.calculateConductivityFactor(1, "di_water");
      expect(factor).toBeCloseTo(1.0, 1);
    });

    it("increases gap for high conductivity", () => {
      const factor = wedmDielectricCorrectionEngine.calculateConductivityFactor(20, "di_water");
      expect(factor).toBeGreaterThan(1.0);
    });
  });

  describe("getMaterialFactor", () => {
    it("returns 1.0 for steel", () => {
      const factor = wedmDielectricCorrectionEngine.getMaterialFactor("steel");
      expect(factor).toBe(1.0);
    });

    it("returns higher factor for aluminum", () => {
      const factor = wedmDielectricCorrectionEngine.getMaterialFactor("aluminum");
      expect(factor).toBe(1.15);
    });

    it("returns lower factor for carbide", () => {
      const factor = wedmDielectricCorrectionEngine.getMaterialFactor("tungsten_carbide");
      expect(factor).toBe(0.85);
    });
  });

  describe("calculateCorrectedGap", () => {
    it("reduces gap for DI water vs oil baseline", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
      });

      expect(result.corrected_gap_mm).toBeLessThan(0.03);
      expect(result.correction_factor).toBe(0.85);
    });

    it("maintains gap for oil", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "oil",
      });

      expect(result.corrected_gap_mm).toBe(0.03);
      expect(result.correction_factor).toBe(1.0);
    });

    it("applies temperature correction", () => {
      const cold = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        temperature_C: 10,
      });

      const hot = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        temperature_C: 35,
      });

      expect(hot.corrected_gap_mm).toBeGreaterThan(cold.corrected_gap_mm);
    });

    it("applies material correction", () => {
      const steel = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        workpiece_material: "steel",
      });

      const aluminum = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        workpiece_material: "aluminum",
      });

      expect(aluminum.corrected_gap_mm).toBeGreaterThan(steel.corrected_gap_mm);
    });

    it("calculates kerf adjustment", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
      });

      // Kerf adjustment = 2 × (corrected - base)
      const gapChange = result.corrected_gap_mm - 0.03;
      expect(result.kerf_adjustment_mm).toBeCloseTo(2 * gapChange, 4);
    });

    it("warns for high temperature", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        temperature_C: 40,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("temperature");
    });

    it("warns for high DI water conductivity", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        conductivity_uS_cm: 15,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("conductivity");
    });

    it("provides breakdown of correction factors", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_gap_mm: 0.03,
        dielectric_type: "di_water",
        temperature_C: 25,
        workpiece_material: "steel",
      });

      expect(result.correction_breakdown).toBeDefined();
      expect(result.correction_breakdown.dielectric_factor).toBeDefined();
      expect(result.correction_breakdown.temperature_factor).toBeDefined();
      expect(result.correction_breakdown.material_factor).toBeDefined();
    });
  });

  describe("compareDielectrics", () => {
    it("compares all dielectric types", () => {
      const comparison = wedmDielectricCorrectionEngine.compareDielectrics(0.03);

      expect(comparison.di_water).toBeDefined();
      expect(comparison.oil).toBeDefined();
      expect(comparison.kerosene).toBeDefined();
      expect(comparison.synthetic).toBeDefined();

      // DI water should have smallest gap
      expect(comparison.di_water.gap_mm).toBeLessThan(comparison.oil.gap_mm);
    });
  });

  describe("recommendDielectric", () => {
    it("recommends oil for graphite", () => {
      const rec = wedmDielectricCorrectionEngine.recommendDielectric("graphite");
      expect(rec.recommended).toBe("oil");
    });

    it("recommends DI water for carbide", () => {
      const rec = wedmDielectricCorrectionEngine.recommendDielectric("tungsten_carbide");
      expect(rec.recommended).toBe("di_water");
    });

    it("recommends DI water for steel", () => {
      const rec = wedmDielectricCorrectionEngine.recommendDielectric("steel");
      expect(rec.recommended).toBe("di_water");
    });

    it("includes reason and alternatives", () => {
      const rec = wedmDielectricCorrectionEngine.recommendDielectric("aluminum");
      expect(rec.reason).toBeDefined();
      expect(rec.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("getAvailableDielectrics", () => {
    it("returns all dielectric types", () => {
      const types = wedmDielectricCorrectionEngine.getAvailableDielectrics();
      expect(types).toContain("di_water");
      expect(types).toContain("oil");
      expect(types).toContain("kerosene");
      expect(types).toContain("synthetic");
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMDielectricCorrectionEngine();
      engine.configure({ reference_temp_C: 25 });
      expect(engine.getConfig().reference_temp_C).toBe(25);
    });
  });
});
