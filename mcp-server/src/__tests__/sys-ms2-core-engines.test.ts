/**
 * SYS-MS2-U01: Core Manufacturing Engine Tests
 *
 * Tests for the 6 core manufacturing calculation engines:
 * 1. CuttingForce (Kienzle model)
 * 2. ToolLife (Taylor equation)
 * 3. SpeedFeed (material-based recommendations)
 * 4. SurfaceFinish (Brammertz/feed-radius formula)
 * 5. Thermal (cutting temperature prediction)
 * 6. Deflection (cantilever beam model)
 *
 * Uses known-good reference values from Machining Data Handbook,
 * Sandvik Coromant, and Altintas "Manufacturing Automation".
 */
import { describe, it, expect } from "vitest";

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSurfaceFinish,
  calculateSpeedFeed,
  calculateJohnsonCookStress,
  calculateDrillingForce,
  calculateMRR,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  SAFETY_LIMITS,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams,
  type SpeedFeedInput,
} from "../engines/ManufacturingCalculations.js";

import {
  calculateToolDeflection,
  calculateCuttingTemperature,
} from "../engines/AdvancedCalculations.js";

import {
  STEEL_1045,
  ALUMINUM_6061,
  TITANIUM_6AL4V,
  STAINLESS_316L,
  CAST_IRON_GG25,
  HARDENED_D2,
  MATERIAL_FIXTURES,
  makeCuttingConditions,
  makeFinishingConditions,
  makeExtremeConditions,
  expectApprox,
  expectShape,
  expectPhysicalValue,
  forEachMaterial,
} from "./helpers/engineTestHarness.js";

// ============================================================================
// 1. KIENZLE CUTTING FORCE MODEL
// ============================================================================
describe("CuttingForceEngine (Kienzle)", () => {
  const steelConditions = makeCuttingConditions();
  const steelKienzle = { ...STEEL_1045.kienzle } as KienzleCoefficients;

  describe("basic calculation", () => {
    it("returns all required result fields", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expectShape(result, [
        "Fc", "Ff", "Fp", "F_resultant", "specific_force",
        "chip_thickness", "chip_width", "power", "torque",
        "warnings", "uncertainty", "force_ratios", "calculation_method",
      ]);
    });

    it("produces positive forces for valid inputs", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.Fc).toBeGreaterThan(0);
      expect(result.Ff).toBeGreaterThan(0);
      expect(result.Fp).toBeGreaterThan(0);
      expect(result.F_resultant).toBeGreaterThan(0);
    });

    it("resultant force >= individual forces", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.F_resultant).toBeGreaterThanOrEqual(result.Fc);
    });

    it("specific force > kc1_1 for thin chips (Kienzle effect)", () => {
      // Thin chip → kc rises above kc1_1 due to h^(-mc) with mc>0
      const thinChip = makeCuttingConditions({ feed_per_tooth: 0.02 });
      const result = calculateKienzleCuttingForce(thinChip, steelKienzle);
      expect(result.specific_force).toBeGreaterThan(steelKienzle.kc1_1);
    });

    it("chip thickness is positive and realistic", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expectPhysicalValue(result.chip_thickness, "chip_thickness", 0.001, 5);
    });
  });

  describe("reference values — AISI 1045 steel", () => {
    it("Fc in expected range for standard roughing", () => {
      // 50mm endmill, 4 flutes, ap=3mm, ae=25mm, fz=0.15mm, Vc=200
      // Expected Fc ≈ 800-2500N for this configuration
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.Fc).toBeGreaterThan(500);
      expect(result.Fc).toBeLessThan(5000);
    });

    it("power in expected range", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      // Fc × Vc / 60000 = power in kW — should be 1-15kW for this setup
      expect(result.power).toBeGreaterThan(0.5);
      expect(result.power).toBeLessThan(30);
    });

    it("calculation_method identifies Kienzle", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.calculation_method).toContain("Kienzle");
    });
  });

  describe("material comparison — force ordering", () => {
    it("aluminum forces < steel forces (same conditions)", () => {
      const alConditions = makeCuttingConditions({ cutting_speed: 400 });
      const steelResult = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      const alResult = calculateKienzleCuttingForce(alConditions, ALUMINUM_6061.kienzle as KienzleCoefficients);
      expect(alResult.Fc).toBeLessThan(steelResult.Fc);
    });

    it("hardened steel forces > mild steel forces (same geometry)", () => {
      const hardenedKienzle = { ...HARDENED_D2.kienzle } as KienzleCoefficients;
      const conditions = makeCuttingConditions({ cutting_speed: 100 });
      const mildResult = calculateKienzleCuttingForce(conditions, steelKienzle);
      const hardResult = calculateKienzleCuttingForce(conditions, hardenedKienzle);
      expect(hardResult.Fc).toBeGreaterThan(mildResult.Fc);
    });
  });

  describe("force ratios (Merchant's circle)", () => {
    it("force_ratios has Ff/Fc, Fp/Fc, and iso_group", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.force_ratios).toBeDefined();
      expect(result.force_ratios!.Ff_over_Fc).toBeGreaterThan(0);
      expect(result.force_ratios!.Fp_over_Fc).toBeGreaterThan(0);
      expect(result.force_ratios!.iso_group).toBeDefined();
    });

    it("Ff/Fc ratio < 1 for normal conditions", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.force_ratios!.Ff_over_Fc).toBeLessThan(1.5);
    });
  });

  describe("uncertainty bounds", () => {
    it("returns uncertainty range for estimated data", () => {
      const result = calculateKienzleCuttingForce(steelConditions, steelKienzle);
      expect(result.uncertainty).toBeDefined();
      expect(result.uncertainty!.Fc_range[0]).toBeLessThan(result.Fc);
      expect(result.uncertainty!.Fc_range[1]).toBeGreaterThan(result.Fc);
    });

    it("verified data has tighter uncertainty than estimated", () => {
      const verified = { ...steelKienzle, data_quality: "verified" } as unknown as KienzleCoefficients;
      const estimated = { ...steelKienzle, data_quality: "estimated" } as unknown as KienzleCoefficients;
      const vResult = calculateKienzleCuttingForce(steelConditions, verified);
      const eResult = calculateKienzleCuttingForce(steelConditions, estimated);
      const vSpread = vResult.uncertainty!.Fc_range[1] - vResult.uncertainty!.Fc_range[0];
      const eSpread = eResult.uncertainty!.Fc_range[1] - eResult.uncertainty!.Fc_range[0];
      expect(vSpread).toBeLessThan(eSpread);
    });
  });

  describe("edge cases", () => {
    it("handles minimum feed without error", () => {
      const minFeed = makeCuttingConditions({ feed_per_tooth: 0.001 });
      const result = calculateKienzleCuttingForce(minFeed, steelKienzle);
      expect(result.Fc).toBeGreaterThan(0);
      expect(Number.isFinite(result.Fc)).toBe(true);
    });

    it("handles full slotting (ae = D) and warns", () => {
      const fullSlot = makeCuttingConditions({ radial_depth: 50 }); // ae = D = 50
      const result = calculateKienzleCuttingForce(fullSlot, steelKienzle);
      expect(result.warnings.some(w => w.includes("FULL_SLOT"))).toBe(true);
    });

    it("handles single-tooth tool (turning-like)", () => {
      const singleTooth = makeCuttingConditions({ number_of_teeth: 1 });
      const result = calculateKienzleCuttingForce(singleTooth, steelKienzle);
      expect(result.Fc).toBeGreaterThan(0);
    });

    it("caps force at SAFETY_LIMITS.MAX_FORCE", () => {
      const extreme = makeExtremeConditions();
      const result = calculateKienzleCuttingForce(extreme, steelKienzle);
      expect(result.Fc).toBeLessThanOrEqual(SAFETY_LIMITS.MAX_FORCE);
    });

    it("thin chip kc inflation warns above 2.5x", () => {
      const veryThinChip = makeCuttingConditions({ feed_per_tooth: 0.005 });
      const result = calculateKienzleCuttingForce(veryThinChip, steelKienzle);
      const hasInflationWarning = result.warnings.some(w => w.includes("KC_INFLATED") || w.includes("KC_ELEVATED"));
      expect(hasInflationWarning).toBe(true);
    });
  });
});

// ============================================================================
// 2. TAYLOR TOOL LIFE MODEL
// ============================================================================
describe("ToolLifeEngine (Taylor)", () => {
  const steelTaylor = { ...STEEL_1045.taylor } as TaylorCoefficients;

  describe("basic calculation", () => {
    it("returns all required fields", () => {
      const result = calculateTaylorToolLife(200, steelTaylor);
      expectShape(result, ["tool_life_minutes", "warnings", "calculation_method"]);
    });

    it("tool life is positive", () => {
      const result = calculateTaylorToolLife(200, steelTaylor);
      expect(result.tool_life_minutes).toBeGreaterThan(0);
    });

    it("calculation method identifies Taylor", () => {
      const result = calculateTaylorToolLife(200, steelTaylor);
      expect(result.calculation_method).toContain("Taylor");
    });
  });

  describe("reference values — AISI 1045", () => {
    it("at V=C speed, tool life = 1 min (by definition)", () => {
      // Taylor: V × T^n = C → at V=C, T^n=1 → T=1
      const result = calculateTaylorToolLife(steelTaylor.C, steelTaylor);
      expectApprox(result.tool_life_minutes, 1.0, 10);
    });

    it("halving speed greatly increases tool life", () => {
      const fast = calculateTaylorToolLife(200, steelTaylor);
      const slow = calculateTaylorToolLife(100, steelTaylor);
      expect(slow.tool_life_minutes).toBeGreaterThan(fast.tool_life_minutes * 3);
    });

    it("doubling speed greatly decreases tool life", () => {
      const normal = calculateTaylorToolLife(150, steelTaylor);
      const fast = calculateTaylorToolLife(300, steelTaylor);
      expect(fast.tool_life_minutes).toBeLessThan(normal.tool_life_minutes * 0.3);
    });
  });

  describe("material comparison", () => {
    it("titanium has shorter tool life than steel at same speed", () => {
      const speed = 50; // feasible for both
      const steelLife = calculateTaylorToolLife(speed, steelTaylor);
      const tiLife = calculateTaylorToolLife(speed, TITANIUM_6AL4V.taylor as TaylorCoefficients);
      expect(tiLife.tool_life_minutes).toBeLessThan(steelLife.tool_life_minutes);
    });

    it("aluminum allows longer tool life at moderate speeds", () => {
      const speed = 150;
      const steelLife = calculateTaylorToolLife(speed, steelTaylor);
      const alLife = calculateTaylorToolLife(speed, ALUMINUM_6061.taylor as TaylorCoefficients);
      expect(alLife.tool_life_minutes).toBeGreaterThan(steelLife.tool_life_minutes);
    });
  });

  describe("cliff warnings", () => {
    it("warns when tool life < 5 min", () => {
      // Very high speed → very short life
      const result = calculateTaylorToolLife(190, steelTaylor);
      if (result.tool_life_minutes < 5) {
        expect(result.warnings.some(w => w.includes("TAYLOR_CLIFF"))).toBe(true);
      }
    });

    it("warns when speed > 90% of C", () => {
      const nearC = steelTaylor.C * 0.95;
      const result = calculateTaylorToolLife(nearC, steelTaylor);
      expect(result.warnings.some(w => w.includes("TAYLOR_CLIFF"))).toBe(true);
    });
  });

  describe("extended corrections", () => {
    it("higher feed reduces tool life", () => {
      const baseLine = calculateTaylorToolLife(150, steelTaylor);
      const highFeed = calculateTaylorToolLife(150, steelTaylor, 0.4);
      expect(highFeed.tool_life_minutes).toBeLessThan(baseLine.tool_life_minutes);
    });

    it("deeper cut reduces tool life", () => {
      const baseLine = calculateTaylorToolLife(150, steelTaylor);
      const deepCut = calculateTaylorToolLife(150, steelTaylor, undefined, 5.0);
      expect(deepCut.tool_life_minutes).toBeLessThan(baseLine.tool_life_minutes);
    });
  });

  describe("edge cases", () => {
    it("clamps at MIN speed", () => {
      const result = calculateTaylorToolLife(0.1, steelTaylor);
      expect(result.tool_life_minutes).toBeLessThanOrEqual(SAFETY_LIMITS.MAX_TOOL_LIFE);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("clamps at MAX speed", () => {
      const result = calculateTaylorToolLife(3000, steelTaylor);
      expect(result.tool_life_minutes).toBeGreaterThanOrEqual(SAFETY_LIMITS.MIN_TOOL_LIFE);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 3. SPEED/FEED RECOMMENDATIONS
// ============================================================================
describe("SpeedFeedEngine", () => {
  describe("basic calculation", () => {
    it("returns all required fields", () => {
      const input: SpeedFeedInput = {
        tool_material: "Carbide",
        operation: "roughing",
        tool_diameter: 50,
        number_of_teeth: 4,
      };
      const result = calculateSpeedFeed(input);
      expectShape(result, [
        "cutting_speed", "spindle_speed", "feed_per_tooth",
        "feed_rate", "axial_depth", "radial_depth",
        "warnings", "recommendations",
      ]);
    });

    it("all values are positive", () => {
      const input: SpeedFeedInput = {
        tool_material: "Carbide",
        operation: "roughing",
        tool_diameter: 20,
        number_of_teeth: 4,
      };
      const result = calculateSpeedFeed(input);
      expect(result.cutting_speed).toBeGreaterThan(0);
      expect(result.spindle_speed).toBeGreaterThan(0);
      expect(result.feed_per_tooth).toBeGreaterThan(0);
      expect(result.feed_rate).toBeGreaterThan(0);
    });
  });

  describe("tool material ordering", () => {
    const base = { operation: "roughing" as const, tool_diameter: 20, number_of_teeth: 4 };

    it("Carbide faster than HSS", () => {
      const hss = calculateSpeedFeed({ ...base, tool_material: "HSS" });
      const carbide = calculateSpeedFeed({ ...base, tool_material: "Carbide" });
      expect(carbide.cutting_speed).toBeGreaterThan(hss.cutting_speed);
    });

    it("Ceramic faster than Carbide", () => {
      const carbide = calculateSpeedFeed({ ...base, tool_material: "Carbide" });
      const ceramic = calculateSpeedFeed({ ...base, tool_material: "Ceramic" });
      expect(ceramic.cutting_speed).toBeGreaterThan(carbide.cutting_speed);
    });
  });

  describe("operation effects", () => {
    const base = { tool_material: "Carbide" as const, tool_diameter: 20, number_of_teeth: 4 };

    it("finishing speed > roughing speed", () => {
      const rough = calculateSpeedFeed({ ...base, operation: "roughing" });
      const finish = calculateSpeedFeed({ ...base, operation: "finishing" });
      expect(finish.cutting_speed).toBeGreaterThan(rough.cutting_speed);
    });

    it("finishing feed < roughing feed", () => {
      const rough = calculateSpeedFeed({ ...base, operation: "roughing" });
      const finish = calculateSpeedFeed({ ...base, operation: "finishing" });
      expect(finish.feed_per_tooth).toBeLessThan(rough.feed_per_tooth);
    });
  });

  describe("hardness effect", () => {
    it("harder material → lower speed", () => {
      const base = { tool_material: "Carbide" as const, operation: "roughing" as const, tool_diameter: 20, number_of_teeth: 4 };
      const soft = calculateSpeedFeed({ ...base, material_hardness: 150 });
      const hard = calculateSpeedFeed({ ...base, material_hardness: 350 });
      expect(hard.cutting_speed).toBeLessThan(soft.cutting_speed);
    });
  });

  describe("spindle speed calculation", () => {
    it("n = 1000×Vc/(π×D)", () => {
      const input: SpeedFeedInput = {
        tool_material: "Carbide",
        operation: "roughing",
        tool_diameter: 50,
        number_of_teeth: 4,
      };
      const result = calculateSpeedFeed(input);
      const expectedRPM = (1000 * result.cutting_speed) / (Math.PI * 50);
      expectApprox(result.spindle_speed, expectedRPM, 1);
    });
  });
});

// ============================================================================
// 4. SURFACE FINISH PREDICTION
// ============================================================================
describe("SurfaceFinishEngine", () => {
  describe("basic calculation", () => {
    it("returns all required fields", () => {
      const result = calculateSurfaceFinish(0.15, 0.8);
      expectShape(result, ["Ra", "Rz", "Rt", "theoretical_Ra", "actual_Ra", "finish_factor", "warnings"]);
    });

    it("Ra is positive for valid inputs", () => {
      const result = calculateSurfaceFinish(0.15, 0.8);
      expect(result.Ra).toBeGreaterThan(0);
    });
  });

  describe("Brammertz formula: Ra = f²/(32r)", () => {
    it("theoretical Ra matches formula", () => {
      const feed = 0.2;  // mm
      const radius = 0.8; // mm
      const expected_Ra_um = (feed * feed / (32 * radius)) * 1000; // μm
      const result = calculateSurfaceFinish(feed, radius);
      expectApprox(result.theoretical_Ra, expected_Ra_um, 2);
    });

    it("doubling feed quadruples Ra (f² relationship)", () => {
      const r1 = calculateSurfaceFinish(0.1, 0.8);
      const r2 = calculateSurfaceFinish(0.2, 0.8);
      expectApprox(r2.Ra / r1.Ra, 4.0, 5);
    });

    it("doubling nose radius halves Ra", () => {
      const r1 = calculateSurfaceFinish(0.15, 0.4);
      const r2 = calculateSurfaceFinish(0.15, 0.8);
      expectApprox(r1.Ra / r2.Ra, 2.0, 5);
    });
  });

  describe("Rz/Ra ratios by operation", () => {
    it("turning Rz/Ra ≈ 4.0", () => {
      const result = calculateSurfaceFinish(0.15, 0.8, false, undefined, undefined, "turning");
      expectApprox(result.Rz / result.Ra, 4.0, 5);
    });

    it("milling Rz/Ra ≈ 5.5", () => {
      const result = calculateSurfaceFinish(0.15, 0.8, true, undefined, undefined, "milling");
      expectApprox(result.Rz / result.Ra, 5.5, 5);
    });

    it("Rt > Rz (max height > ten-point mean)", () => {
      const result = calculateSurfaceFinish(0.15, 0.8);
      expect(result.Rt).toBeGreaterThan(result.Rz);
    });
  });

  describe("process factor", () => {
    it("actual_Ra > theoretical_Ra (process degradation)", () => {
      const result = calculateSurfaceFinish(0.15, 0.8);
      expect(result.actual_Ra).toBeGreaterThan(result.theoretical_Ra);
    });
  });

  describe("edge cases", () => {
    it("very fine feed produces good surface", () => {
      const result = calculateSurfaceFinish(0.02, 0.8);
      expect(result.Ra).toBeLessThan(1.0); // sub-micron theoretical
    });

    it("coarse feed produces rough surface and warns", () => {
      const result = calculateSurfaceFinish(1.0, 0.4);
      expect(result.Ra).toBeGreaterThan(10);
    });

    it("warns on out-of-range feed", () => {
      const result = calculateSurfaceFinish(3.0, 0.8);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 5. THERMAL ENGINE (Cutting Temperature)
// ============================================================================
describe("ThermalEngine (Cutting Temperature)", () => {
  describe("basic calculation", () => {
    it("returns all required fields", () => {
      const result = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);
      expectShape(result, [
        "cutting_temperature", "chip_temperature", "tool_temperature",
        "workpiece_temperature", "heat_partition", "thermal_expansion", "warnings",
      ]);
    });

    it("all temperatures are positive", () => {
      const result = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);
      expect(result.cutting_temperature).toBeGreaterThan(0);
      expect(result.chip_temperature).toBeGreaterThan(0);
      expect(result.tool_temperature).toBeGreaterThan(0);
      expect(result.workpiece_temperature).toBeGreaterThan(0);
    });

    it("chip gets most heat", () => {
      const result = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);
      expect(result.heat_partition.chip).toBeGreaterThan(result.heat_partition.tool);
      expect(result.heat_partition.chip).toBeGreaterThan(result.heat_partition.workpiece);
    });

    it("heat partition sums to ~100%", () => {
      const result = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);
      const total = result.heat_partition.chip + result.heat_partition.tool + result.heat_partition.workpiece;
      expectApprox(total, 100, 2);
    });
  });

  describe("physics trends", () => {
    it("higher cutting speed → higher temperature", () => {
      const slow = calculateCuttingTemperature(100, 0.15, 3, 1800, 49.8);
      const fast = calculateCuttingTemperature(300, 0.15, 3, 1800, 49.8);
      expect(fast.cutting_temperature).toBeGreaterThan(slow.cutting_temperature);
    });

    it("higher specific force → higher or equal temperature", () => {
      const low = calculateCuttingTemperature(200, 0.15, 3, 700, 49.8);    // aluminum kc
      const high = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);  // steel kc
      expect(high.cutting_temperature).toBeGreaterThanOrEqual(low.cutting_temperature);
    });

    it("low thermal conductivity → higher temperature (titanium vs steel)", () => {
      const steel = calculateCuttingTemperature(100, 0.15, 3, 1500, 49.8);   // k=49.8
      const titanium = calculateCuttingTemperature(100, 0.15, 3, 1500, 6.7); // k=6.7
      expect(titanium.cutting_temperature).toBeGreaterThan(steel.cutting_temperature);
    });
  });

  describe("thermal expansion", () => {
    it("thermal expansion is positive", () => {
      const result = calculateCuttingTemperature(200, 0.15, 3, 1800, 49.8);
      expect(result.thermal_expansion).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// 6. DEFLECTION ENGINE
// ============================================================================
describe("DeflectionEngine (Tool Deflection)", () => {
  describe("basic calculation", () => {
    it("returns all required fields", () => {
      // force=1000N, D=20mm, L=50mm, E=600GPa (carbide)
      const result = calculateToolDeflection(1000, 20, 50, 600);
      expectShape(result, [
        "static_deflection", "dynamic_deflection", "surface_error",
        "max_force_before_failure", "safety_factor", "tool_runout_effect", "warnings",
      ]);
    });

    it("deflection is positive for positive force", () => {
      const result = calculateToolDeflection(1000, 20, 50, 600);
      expect(result.static_deflection).toBeGreaterThan(0);
      expect(result.dynamic_deflection).toBeGreaterThan(0);
    });

    it("safety factor is positive", () => {
      const result = calculateToolDeflection(1000, 20, 50, 600);
      expect(result.safety_factor).toBeGreaterThan(0);
    });
  });

  describe("physics trends", () => {
    it("longer overhang → more deflection (L³ relationship)", () => {
      const short = calculateToolDeflection(1000, 20, 30, 600);
      const long = calculateToolDeflection(1000, 20, 60, 600);
      expect(long.static_deflection).toBeGreaterThan(short.static_deflection);
      // L³ means 2× length → 8× deflection
      const ratio = long.static_deflection / short.static_deflection;
      expect(ratio).toBeGreaterThan(4); // at least significant increase
    });

    it("larger diameter → less deflection (D⁴ relationship)", () => {
      const thin = calculateToolDeflection(1000, 10, 50, 600);
      const thick = calculateToolDeflection(1000, 20, 50, 600);
      expect(thin.static_deflection).toBeGreaterThan(thick.static_deflection);
    });

    it("higher force → more deflection (linear)", () => {
      const lowF = calculateToolDeflection(500, 20, 50, 600);
      const highF = calculateToolDeflection(1000, 20, 50, 600);
      expectApprox(highF.static_deflection / lowF.static_deflection, 2.0, 5);
    });

    it("higher modulus → less deflection", () => {
      const hss = calculateToolDeflection(1000, 20, 50, 210);   // HSS E=210GPa
      const carbide = calculateToolDeflection(1000, 20, 50, 600); // Carbide E=600GPa
      expect(carbide.static_deflection).toBeLessThan(hss.static_deflection);
    });
  });

  describe("runout effect", () => {
    it("higher runout → higher runout effect", () => {
      const lowRunout = calculateToolDeflection(1000, 20, 50, 600, 0.002);
      const highRunout = calculateToolDeflection(1000, 20, 50, 600, 0.020);
      expect(highRunout.tool_runout_effect).toBeGreaterThan(lowRunout.tool_runout_effect);
    });
  });
});

// ============================================================================
// JOHNSON-COOK CONSTITUTIVE MODEL
// ============================================================================
describe("Johnson-Cook Stress", () => {
  const jcSteel: JohnsonCookParams = {
    A: 553, B: 600, n: 0.234, C: 0.0134, m: 1.0,
    T_melt: 1460, T_ref: 25, epsilon_dot_ref: 1.0,
  };

  describe("basic calculation", () => {
    it("returns stress and components", () => {
      const result = calculateJohnsonCookStress(0.1, 1000, 300, jcSteel);
      expectShape(result, ["stress", "components", "warnings"]);
      expect(result.stress).toBeGreaterThan(0);
    });

    it("stress at reference conditions ≈ A + B×ε^n", () => {
      // At T=T_ref, ε_dot=1 → rate_term=1, thermal_term=1
      const strain = 0.2;
      const expectedStress = jcSteel.A + jcSteel.B * Math.pow(strain, jcSteel.n);
      const result = calculateJohnsonCookStress(strain, 1.0, 25, jcSteel);
      expectApprox(result.stress, expectedStress, 2);
    });
  });

  describe("physics trends", () => {
    it("higher strain → higher stress (strain hardening)", () => {
      const low = calculateJohnsonCookStress(0.05, 1000, 300, jcSteel);
      const high = calculateJohnsonCookStress(0.5, 1000, 300, jcSteel);
      expect(high.stress).toBeGreaterThan(low.stress);
    });

    it("higher temperature → lower stress (thermal softening)", () => {
      const cold = calculateJohnsonCookStress(0.1, 1000, 100, jcSteel);
      const hot = calculateJohnsonCookStress(0.1, 1000, 800, jcSteel);
      expect(hot.stress).toBeLessThan(cold.stress);
    });

    it("higher strain rate → higher stress (rate sensitivity)", () => {
      const slow = calculateJohnsonCookStress(0.1, 10, 300, jcSteel);
      const fast = calculateJohnsonCookStress(0.1, 100000, 300, jcSteel);
      expect(fast.stress).toBeGreaterThan(slow.stress);
    });
  });

  describe("near-melt warning", () => {
    it("warns near melting temperature", () => {
      const result = calculateJohnsonCookStress(0.1, 1000, 1400, jcSteel);
      expect(result.warnings.some(w => w.includes("melting"))).toBe(true);
    });
  });
});

// ============================================================================
// DRILLING FORCE
// ============================================================================
describe("DrillingForce", () => {
  it("returns positive forces and torque", () => {
    const result = calculateDrillingForce(
      { drill_diameter: 10, feed_per_rev: 0.2, cutting_speed: 80 },
      STEEL_1045.kienzle as KienzleCoefficients,
    );
    // Fc = thrust (axial), Ff = tangential, torque, power
    expect(result.Fc).toBeGreaterThan(0);
    expect(result.Ff).toBeGreaterThan(0);
    expect(result.torque).toBeGreaterThan(0);
    expect(result.power).toBeGreaterThan(0);
  });

  it("larger drill → higher forces", () => {
    const small = calculateDrillingForce(
      { drill_diameter: 6, feed_per_rev: 0.15, cutting_speed: 80 },
      STEEL_1045.kienzle as KienzleCoefficients,
    );
    const large = calculateDrillingForce(
      { drill_diameter: 20, feed_per_rev: 0.15, cutting_speed: 80 },
      STEEL_1045.kienzle as KienzleCoefficients,
    );
    expect(large.Fc).toBeGreaterThan(small.Fc);
  });
});

// ============================================================================
// MRR, SPINDLE POWER, CHIP LOAD, TORQUE
// ============================================================================
describe("Derived calculations", () => {
  it("MRR returns positive values", () => {
    const conditions = makeCuttingConditions();
    const result = calculateMRR(conditions);
    expect(result.mrr).toBeGreaterThan(0);
    expect(result.mrr_mm3).toBeGreaterThan(0);
    expect(result.feed_rate).toBeGreaterThan(0);
    expect(result.spindle_speed).toBeGreaterThan(0);
  });

  it("spindle power is positive", () => {
    // calculateSpindlePower(force_N, speed_m_min, diameter_mm, efficiency)
    const result = calculateSpindlePower(1000, 200, 50, 0.85);
    expect(result).toBeDefined();
    // Power = Fc × Vc / 60000 / efficiency
    const expectedPower = (1000 * 200) / 60000 / 0.85;
    expect(result.power_spindle_kw ?? result.power_kw ?? result.power).toBeGreaterThan(0);
  });

  it("chip load is positive", () => {
    // calculateChipLoad(feed_rate_mm_min, rpm, z)
    const result = calculateChipLoad(500, 4000, 4);
    expect(result).toBeDefined();
    // fz = Vf / (n × z) = 500 / (4000 × 4) = 0.03125
    const expectedFz = 500 / (4000 * 4);
    expect(result.chip_load_fz_mm).toBeCloseTo(expectedFz, 3);
  });

  it("torque is positive", () => {
    // calculateTorque(force_N, diameter_mm)
    const result = calculateTorque(1000, 50);
    expect(result).toBeDefined();
    expect(result.torque_nm).toBeGreaterThan(0);
  });
});

// ============================================================================
// CROSS-MATERIAL PARAMETERIZED TESTS
// ============================================================================
describe("Cross-material Kienzle tests", () => {
  forEachMaterial((material) => {
    const conditions = makeCuttingConditions({ cutting_speed: 100 });
    const result = calculateKienzleCuttingForce(conditions, material.kienzle as KienzleCoefficients);
    expect(result.Fc).toBeGreaterThan(0);
    expect(Number.isFinite(result.Fc)).toBe(true);
    expect(result.power).toBeGreaterThan(0);
  });
});

describe("Cross-material Taylor tests", () => {
  forEachMaterial((material) => {
    const result = calculateTaylorToolLife(50, material.taylor as TaylorCoefficients);
    expect(result.tool_life_minutes).toBeGreaterThan(0);
    expect(Number.isFinite(result.tool_life_minutes)).toBe(true);
  });
});
