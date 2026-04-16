/**
 * AbrasiveJetMachiningEngine Tests
 *
 * Tests abrasive waterjet (AWJ) cutting physics:
 * - Finnie erosion model
 * - Kerf geometry (width, taper)
 * - MRR calculation
 * - Surface roughness prediction
 * - Parameter optimization
 * - Nozzle wear prediction
 * - Material and abrasive handling
 * - Warnings and edge cases
 *
 * References: Finnie 1960, Hashish 1989, Momber & Kovacevic 1998
 */

import { describe, it, expect } from "vitest";
import {
  AbrasiveJetMachiningEngine,
  type AJMCuttingInput,
  type AJMOptimizeInput,
  type AJMNozzleInput,
} from "../engines/AbrasiveJetMachiningEngine.js";

// Engine may export singleton or just class — handle both
let engine: AbrasiveJetMachiningEngine;

// Try to import singleton, fallback to new instance
try {
  const mod = await import("../engines/AbrasiveJetMachiningEngine.js");
  engine = (mod as any).abrasiveJetMachiningEngine ?? new AbrasiveJetMachiningEngine();
} catch {
  engine = new AbrasiveJetMachiningEngine();
}

const baseCuttingInput: AJMCuttingInput = {
  material: "mild_steel",
  abrasive: "garnet",
  pressure_MPa: 300,
  nozzle_diameter_mm: 0.75,
  standoff_distance_mm: 3,
  traverse_speed_mm_per_min: 200,
  material_thickness_mm: 25,
};

describe("AbrasiveJetMachiningEngine", () => {
  describe("predictCutting - basic", () => {
    it("returns positive kerf width", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.kerf_width_mm).toBeGreaterThan(0);
    });

    it("kerf width scales with nozzle diameter", () => {
      const result = engine.predictCutting(baseCuttingInput);
      // Kerf should be > nozzle diameter (typically 1.1-1.3×)
      expect(result.kerf_width_mm).toBeGreaterThan(baseCuttingInput.nozzle_diameter_mm);
      expect(result.kerf_width_mm).toBeLessThan(baseCuttingInput.nozzle_diameter_mm * 2);
    });

    it("returns positive taper angle", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.taper_angle_deg).toBeGreaterThan(0);
      expect(result.taper_angle_deg).toBeLessThanOrEqual(5);
    });

    it("returns positive MRR", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
    });

    it("returns positive surface roughness", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.surface_Ra_um).toBeGreaterThan(0);
    });

    it("returns positive predicted depth", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.predicted_depth_mm).toBeGreaterThan(0);
    });

    it("includes Finnie formula string", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.formula).toContain("Finnie");
      expect(result.formula).toContain("mm³/min");
    });
  });

  describe("predictCutting - material effects", () => {
    it("aluminum cuts faster than stainless steel", () => {
      const alum = engine.predictCutting({ ...baseCuttingInput, material: "aluminum" });
      const ss = engine.predictCutting({ ...baseCuttingInput, material: "stainless_steel" });
      expect(alum.predicted_depth_mm).toBeGreaterThan(ss.predicted_depth_mm);
    });

    it("glass (brittle) uses different erosion model than steel (ductile)", () => {
      const glass = engine.predictCutting({ ...baseCuttingInput, material: "glass" });
      const steel = engine.predictCutting({ ...baseCuttingInput, material: "mild_steel" });
      // Glass should have different characteristics (lower resistance)
      expect(glass.predicted_depth_mm).not.toBeCloseTo(steel.predicted_depth_mm, 0);
    });

    it("unknown material falls back to mild_steel", () => {
      const unknown = engine.predictCutting({ ...baseCuttingInput, material: "unobtanium" });
      const steel = engine.predictCutting({ ...baseCuttingInput, material: "mild_steel" });
      expect(unknown.kerf_width_mm).toBe(steel.kerf_width_mm);
    });
  });

  describe("predictCutting - pressure effects", () => {
    it("higher pressure increases predicted depth", () => {
      const low = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 200 });
      const high = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 400 });
      expect(high.predicted_depth_mm).toBeGreaterThan(low.predicted_depth_mm);
    });

    it("higher pressure reduces surface roughness", () => {
      const low = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 200 });
      const high = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 400 });
      expect(high.surface_Ra_um).toBeLessThan(low.surface_Ra_um);
    });

    it("warns on pressure below 100 MPa", () => {
      const result = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 80 });
      expect(result.warnings.some(w => w.includes("below 100 MPa"))).toBe(true);
    });

    it("warns on pressure above 600 MPa", () => {
      const result = engine.predictCutting({ ...baseCuttingInput, pressure_MPa: 650 });
      expect(result.warnings.some(w => w.includes("above 600 MPa"))).toBe(true);
    });
  });

  describe("predictCutting - speed effects", () => {
    it("faster traverse increases roughness", () => {
      const slow = engine.predictCutting({ ...baseCuttingInput, traverse_speed_mm_per_min: 100 });
      const fast = engine.predictCutting({ ...baseCuttingInput, traverse_speed_mm_per_min: 500 });
      expect(fast.surface_Ra_um).toBeGreaterThan(slow.surface_Ra_um);
    });

    it("faster traverse reduces predicted depth", () => {
      const slow = engine.predictCutting({ ...baseCuttingInput, traverse_speed_mm_per_min: 100 });
      const fast = engine.predictCutting({ ...baseCuttingInput, traverse_speed_mm_per_min: 500 });
      expect(fast.predicted_depth_mm).toBeLessThan(slow.predicted_depth_mm);
    });
  });

  describe("predictCutting - standoff effects", () => {
    it("larger standoff increases kerf width", () => {
      const close = engine.predictCutting({ ...baseCuttingInput, standoff_distance_mm: 1 });
      const far = engine.predictCutting({ ...baseCuttingInput, standoff_distance_mm: 8 });
      expect(far.kerf_width_mm).toBeGreaterThan(close.kerf_width_mm);
    });

    it("warns on standoff > 10 mm", () => {
      const result = engine.predictCutting({ ...baseCuttingInput, standoff_distance_mm: 12 });
      expect(result.warnings.some(w => w.includes("Standoff > 10"))).toBe(true);
    });

    it("warns on standoff < 0.5 mm", () => {
      const result = engine.predictCutting({ ...baseCuttingInput, standoff_distance_mm: 0.3 });
      expect(result.warnings.some(w => w.includes("Standoff < 0.5"))).toBe(true);
    });
  });

  describe("predictCutting - abrasive effects", () => {
    it("silicon carbide cuts faster than garnet", () => {
      const garnet = engine.predictCutting({ ...baseCuttingInput, abrasive: "garnet" });
      const sic = engine.predictCutting({ ...baseCuttingInput, abrasive: "silicon_carbide" });
      expect(sic.predicted_depth_mm).toBeGreaterThan(garnet.predicted_depth_mm);
    });

    it("alumina cuts faster than garnet", () => {
      const garnet = engine.predictCutting({ ...baseCuttingInput, abrasive: "garnet" });
      const alumina = engine.predictCutting({ ...baseCuttingInput, abrasive: "alumina" });
      expect(alumina.predicted_depth_mm).toBeGreaterThan(garnet.predicted_depth_mm);
    });
  });

  describe("predictCutting - through-cut warning", () => {
    it("warns when predicted depth < material thickness", () => {
      const result = engine.predictCutting({
        ...baseCuttingInput,
        material_thickness_mm: 200, // very thick
        traverse_speed_mm_per_min: 500, // very fast
      });
      if (result.predicted_depth_mm < 200) {
        expect(result.warnings.some(w => w.includes("may not cut through"))).toBe(true);
      }
    });
  });

  describe("optimizeParameters", () => {
    const baseOptimize: AJMOptimizeInput = {
      material: "mild_steel",
      thickness_mm: 25,
      target_quality: "medium",
      geometry: "straight",
    };

    it("returns valid pressure range", () => {
      const result = engine.optimizeParameters(baseOptimize);
      expect(result.pressure_MPa).toBeGreaterThanOrEqual(150);
      expect(result.pressure_MPa).toBeLessThanOrEqual(450);
    });

    it("returns positive traverse speed", () => {
      const result = engine.optimizeParameters(baseOptimize);
      expect(result.traverse_speed).toBeGreaterThan(0);
    });

    it("fine quality uses higher pressure than rough", () => {
      const fine = engine.optimizeParameters({ ...baseOptimize, target_quality: "fine" });
      const rough = engine.optimizeParameters({ ...baseOptimize, target_quality: "rough" });
      expect(fine.pressure_MPa).toBeGreaterThanOrEqual(rough.pressure_MPa);
    });

    it("fine quality uses slower traverse than rough", () => {
      const fine = engine.optimizeParameters({ ...baseOptimize, target_quality: "fine" });
      const rough = engine.optimizeParameters({ ...baseOptimize, target_quality: "rough" });
      expect(fine.traverse_speed).toBeLessThan(rough.traverse_speed);
    });

    it("fine quality has smaller standoff", () => {
      const fine = engine.optimizeParameters({ ...baseOptimize, target_quality: "fine" });
      const rough = engine.optimizeParameters({ ...baseOptimize, target_quality: "rough" });
      expect(fine.standoff_mm).toBeLessThan(rough.standoff_mm);
    });

    it("fine quality produces lower Ra", () => {
      const fine = engine.optimizeParameters({ ...baseOptimize, target_quality: "fine" });
      const rough = engine.optimizeParameters({ ...baseOptimize, target_quality: "rough" });
      expect(fine.expected_Ra).toBeLessThan(rough.expected_Ra);
    });

    it("corner geometry adds speed reduction", () => {
      const straight = engine.optimizeParameters({ ...baseOptimize, geometry: "straight" });
      const corner = engine.optimizeParameters({ ...baseOptimize, geometry: "corner" });
      expect(corner.corner_speed_reduction_pct).toBeGreaterThan(straight.corner_speed_reduction_pct);
    });

    it("curve geometry has intermediate speed reduction", () => {
      const straight = engine.optimizeParameters({ ...baseOptimize, geometry: "straight" });
      const curve = engine.optimizeParameters({ ...baseOptimize, geometry: "curve" });
      const corner = engine.optimizeParameters({ ...baseOptimize, geometry: "corner" });
      expect(curve.corner_speed_reduction_pct).toBeGreaterThan(straight.corner_speed_reduction_pct);
      expect(curve.corner_speed_reduction_pct).toBeLessThan(corner.corner_speed_reduction_pct);
    });

    it("straight geometry has zero speed reduction", () => {
      const result = engine.optimizeParameters(baseOptimize);
      expect(result.corner_speed_reduction_pct).toBe(0);
    });

    it("thicker material gets higher pressure", () => {
      const thin = engine.optimizeParameters({ ...baseOptimize, thickness_mm: 5 });
      const thick = engine.optimizeParameters({ ...baseOptimize, thickness_mm: 100 });
      expect(thick.pressure_MPa).toBeGreaterThanOrEqual(thin.pressure_MPa);
    });

    it("harder material gets higher pressure", () => {
      const aluminum = engine.optimizeParameters({ ...baseOptimize, material: "aluminum" });
      const titanium = engine.optimizeParameters({ ...baseOptimize, material: "titanium" });
      expect(titanium.pressure_MPa).toBeGreaterThanOrEqual(aluminum.pressure_MPa);
    });
  });

  describe("predictNozzleWear", () => {
    const baseNozzle: AJMNozzleInput = {
      nozzle_material: "tungsten_carbide",
      abrasive: "garnet",
      pressure_MPa: 300,
      operating_hours: 10,
    };

    it("returns positive wear rate", () => {
      const result = engine.predictNozzleWear(baseNozzle);
      expect(result.wear_rate_mm_per_hour).toBeGreaterThan(0);
    });

    it("returns positive remaining life", () => {
      const result = engine.predictNozzleWear(baseNozzle);
      expect(result.remaining_life_hours).toBeGreaterThan(0);
    });

    it("returns positive bore growth", () => {
      const result = engine.predictNozzleWear(baseNozzle);
      expect(result.bore_growth_pct).toBeGreaterThan(0);
    });

    it("diamond composite wears slowest", () => {
      const tc = engine.predictNozzleWear({ ...baseNozzle, nozzle_material: "tungsten_carbide" });
      const diamond = engine.predictNozzleWear({ ...baseNozzle, nozzle_material: "diamond_composite" });
      expect(diamond.wear_rate_mm_per_hour).toBeLessThan(tc.wear_rate_mm_per_hour);
    });

    it("sapphire wears slower than tungsten carbide", () => {
      const tc = engine.predictNozzleWear({ ...baseNozzle, nozzle_material: "tungsten_carbide" });
      const sapphire = engine.predictNozzleWear({ ...baseNozzle, nozzle_material: "sapphire" });
      expect(sapphire.wear_rate_mm_per_hour).toBeLessThan(tc.wear_rate_mm_per_hour);
    });

    it("silicon carbide causes more wear than garnet", () => {
      const garnet = engine.predictNozzleWear({ ...baseNozzle, abrasive: "garnet" });
      const sic = engine.predictNozzleWear({ ...baseNozzle, abrasive: "silicon_carbide" });
      expect(sic.wear_rate_mm_per_hour).toBeGreaterThan(garnet.wear_rate_mm_per_hour);
    });

    it("higher pressure increases wear rate", () => {
      const low = engine.predictNozzleWear({ ...baseNozzle, pressure_MPa: 200 });
      const high = engine.predictNozzleWear({ ...baseNozzle, pressure_MPa: 400 });
      expect(high.wear_rate_mm_per_hour).toBeGreaterThan(low.wear_rate_mm_per_hour);
    });

    it("more operating hours reduces remaining life", () => {
      const fresh = engine.predictNozzleWear({ ...baseNozzle, operating_hours: 0 });
      const used = engine.predictNozzleWear({ ...baseNozzle, operating_hours: 100 });
      expect(used.remaining_life_hours).toBeLessThan(fresh.remaining_life_hours);
    });

    it("worn-out nozzle has zero remaining life", () => {
      const result = engine.predictNozzleWear({ ...baseNozzle, operating_hours: 99999 });
      expect(result.remaining_life_hours).toBe(0);
    });

    it("replacement cost is positive", () => {
      const result = engine.predictNozzleWear(baseNozzle);
      expect(result.replacement_cost_estimate).toBeGreaterThan(0);
    });
  });

  describe("dimensional consistency", () => {
    it("kerf_width in mm, taper in degrees", () => {
      const result = engine.predictCutting(baseCuttingInput);
      // Kerf should be small (< 3mm typical)
      expect(result.kerf_width_mm).toBeLessThan(3);
      // Taper should be small angle
      expect(result.taper_angle_deg).toBeLessThan(10);
    });

    it("MRR in mm³/min (reasonable range)", () => {
      const result = engine.predictCutting(baseCuttingInput);
      // Typical AWJ MRR: 100-10000 mm³/min
      expect(result.mrr_mm3_per_min).toBeGreaterThan(10);
      expect(result.mrr_mm3_per_min).toBeLessThan(100000);
    });

    it("Ra in µm (reasonable range 0.5-20)", () => {
      const result = engine.predictCutting(baseCuttingInput);
      expect(result.surface_Ra_um).toBeGreaterThan(0.1);
      expect(result.surface_Ra_um).toBeLessThan(50);
    });
  });
});
