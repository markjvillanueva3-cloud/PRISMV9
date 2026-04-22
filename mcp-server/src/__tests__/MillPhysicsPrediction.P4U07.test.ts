/**
 * Mill Physics Prediction Tests — P4-U07-PHYS
 * =============================================
 *
 * Tests for direct engine wiring of physics prediction actions:
 *   - mill_thermal_predict → CuttingThermalEngine
 *   - mill_wear_predict → ToolWearRateEngine
 *   - mill_surface_predict → SurfaceFinishPredictorEngine
 *
 * Coverage:
 *   - Shear plane temperature (Trigger-Chao model)
 *   - Tool-chip interface temperature (Jaeger heat source)
 *   - Heat partition (Shaw effusivity model)
 *   - Taylor tool life equation with extended model
 *   - Brammertz kinematic roughness
 *   - Scallop height models for ball/flat/barrel endmills
 *   - Edge cases and physics invariants
 *
 * @module __tests__/MillPhysicsPrediction.P4U07.test
 * @milestone MILL-MASTER-P4/U07-PHYS
 */

import { describe, it, expect } from "vitest";
import { cuttingThermalEngine } from "../engines/CuttingThermalEngine.js";
import { toolWearRateEngine } from "../engines/ToolWearRateEngine.js";
import { surfaceFinishPredictorEngine } from "../engines/SurfaceFinishPredictorEngine.js";

describe("CuttingThermalEngine P4-U07-PHYS", () => {
  describe("shearPlaneTemperature", () => {
    it("computes shear zone temperature for steel machining", () => {
      const result = cuttingThermalEngine.shearPlaneTemperature({
        cuttingSpeed: 150,
        feed: 0.2,
        shearStrength: 400,
        shearAngle: 25 * Math.PI / 180,
        rakeAngle: 6 * Math.PI / 180,
      });
      expect(result.temperatureRise_C).toBeGreaterThan(0);
      expect(result.shearZoneTemp_C).toBeGreaterThan(25);
      expect(result.thermalNumber).toBeGreaterThan(0);
      expect(result.shearVelocity_mps).toBeGreaterThan(0);
      expect(["high_speed", "low_speed"]).toContain(result.heatRegime);
    });

    it("higher cutting speed increases temperature rise", () => {
      const params = {
        feed: 0.15,
        shearStrength: 400,
        shearAngle: 25 * Math.PI / 180,
      };
      const slow = cuttingThermalEngine.shearPlaneTemperature({ ...params, cuttingSpeed: 50 });
      const fast = cuttingThermalEngine.shearPlaneTemperature({ ...params, cuttingSpeed: 200 });
      expect(fast.temperatureRise_C).toBeGreaterThanOrEqual(slow.temperatureRise_C);
    });

    it("higher shear strength increases temperature", () => {
      const params = {
        cuttingSpeed: 100,
        feed: 0.15,
        shearAngle: 25 * Math.PI / 180,
      };
      const soft = cuttingThermalEngine.shearPlaneTemperature({ ...params, shearStrength: 200 });
      const hard = cuttingThermalEngine.shearPlaneTemperature({ ...params, shearStrength: 600 });
      expect(hard.temperatureRise_C).toBeGreaterThan(soft.temperatureRise_C);
    });

    it("material thermal properties affect heat regime", () => {
      const base = {
        cuttingSpeed: 100,
        feed: 0.15,
        shearStrength: 400,
        shearAngle: 25 * Math.PI / 180,
      };
      const steel = cuttingThermalEngine.shearPlaneTemperature({
        ...base,
        material: { density: 7850, specificHeat: 500, thermalConductivity: 50 },
      });
      const aluminum = cuttingThermalEngine.shearPlaneTemperature({
        ...base,
        material: { density: 2700, specificHeat: 900, thermalConductivity: 205 },
      });
      expect(steel.thermalNumber).not.toBe(aluminum.thermalNumber);
    });

    it("ambient temperature is added to rise", () => {
      const result = cuttingThermalEngine.shearPlaneTemperature({
        cuttingSpeed: 100,
        feed: 0.15,
        shearStrength: 400,
        shearAngle: 25 * Math.PI / 180,
        material: { ambientTemp: 50 },
      });
      expect(result.shearZoneTemp_C).toBeGreaterThan(50);
    });
  });

  describe("toolChipInterfaceTemp", () => {
    it("computes interface temperature for roughing cut", () => {
      const result = cuttingThermalEngine.toolChipInterfaceTemp({
        cuttingSpeed: 150,
        feed: 0.25,
        depthOfCut: 3,
        specificCuttingEnergy: 3.5,
      });
      expect(result.interfaceTemperature_C).toBeGreaterThan(100);
      expect(result.toolAverageTemp_C).toBeGreaterThan(25);
      expect(result.heatPartitionToTool).toBeGreaterThan(0);
      expect(result.heatPartitionToTool).toBeLessThan(1);
      expect(result.heatPartitionToChip).toBeGreaterThan(0);
      expect(result.pecletNumber).toBeGreaterThan(0);
      expect(result.contactLength_mm).toBeGreaterThan(0);
      expect(result.heatFlux_W_m2).toBeGreaterThan(0);
      expect(result.cuttingPower_W).toBeGreaterThan(0);
    });

    it("higher MRR increases cutting power", () => {
      const base = { specificCuttingEnergy: 3.5 };
      const light = cuttingThermalEngine.toolChipInterfaceTemp({
        ...base, cuttingSpeed: 100, feed: 0.1, depthOfCut: 1,
      });
      const heavy = cuttingThermalEngine.toolChipInterfaceTemp({
        ...base, cuttingSpeed: 150, feed: 0.25, depthOfCut: 3,
      });
      expect(heavy.cuttingPower_W).toBeGreaterThan(light.cuttingPower_W);
    });

    it("heat partition sums to 1", () => {
      const result = cuttingThermalEngine.toolChipInterfaceTemp({
        cuttingSpeed: 100,
        feed: 0.15,
        depthOfCut: 2,
        specificCuttingEnergy: 3.0,
      });
      const sum = result.heatPartitionToTool + result.heatPartitionToChip;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe("heatPartition", () => {
    it("returns partition percentages summing to ~100%", () => {
      const result = cuttingThermalEngine.heatPartition({
        cuttingSpeed: 100,
        workMaterial: "steel",
        toolMaterial: "carbide",
      });
      const total = result.toChip_percent + result.toTool_percent + result.toWorkpiece_percent;
      expect(total).toBeCloseTo(100, 0);
    });

    it("chip takes majority of heat at high speed", () => {
      const result = cuttingThermalEngine.heatPartition({
        cuttingSpeed: 200,
        workMaterial: "steel",
        toolMaterial: "carbide",
      });
      expect(result.toChip_percent).toBeGreaterThan(50);
    });

    it("aluminum has different partition than steel due to effusivity", () => {
      const steel = cuttingThermalEngine.heatPartition({
        cuttingSpeed: 100, workMaterial: "steel", toolMaterial: "carbide",
      });
      const aluminum = cuttingThermalEngine.heatPartition({
        cuttingSpeed: 100, workMaterial: "aluminum", toolMaterial: "carbide",
      });
      expect(steel.effusivityWork).not.toBe(aluminum.effusivityWork);
    });

    it("defaults to steel/carbide for unknown materials", () => {
      const result = cuttingThermalEngine.heatPartition({
        cuttingSpeed: 100,
        workMaterial: "unobtainium",
        toolMaterial: "adamantium",
      });
      expect(result.effusivityWork).toBeGreaterThan(0);
      expect(result.effusivityTool).toBeGreaterThan(0);
    });
  });
});

describe("ToolWearRateEngine P4-U07-PHYS", () => {
  describe("calculate", () => {
    it("computes tool life for steel with carbide", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 150,
        feed_mm: 0.15,
        depth_of_cut_mm: 2,
        tool_material: "carbide",
        work_material: "steel",
      });
      expect(result.predicted_tool_life.value).toBeGreaterThan(0);
      expect(result.taylor_constant.value).toBe(300);
      expect(result.taylor_exponent.value).toBe(0.25);
      expect(result.flank_wear_rate.value).toBeGreaterThan(0);
      expect(result.time_to_max_wear.value).toBeGreaterThan(0);
    });

    it("higher speed reduces tool life (Taylor relationship)", () => {
      const base = {
        feed_mm: 0.15,
        depth_of_cut_mm: 1,
        tool_material: "carbide" as const,
        work_material: "steel" as const,
      };
      const slow = toolWearRateEngine.calculate({ ...base, cutting_speed_mpm: 100 });
      const fast = toolWearRateEngine.calculate({ ...base, cutting_speed_mpm: 250 });
      expect(slow.predicted_tool_life.value).toBeGreaterThan(fast.predicted_tool_life.value);
    });

    it("different tool materials have different Taylor exponents", () => {
      const base = {
        cutting_speed_mpm: 150,
        feed_mm: 0.15,
        depth_of_cut_mm: 1,
        work_material: "steel" as const,
      };
      const hss = toolWearRateEngine.calculate({ ...base, tool_material: "hss" });
      const carbide = toolWearRateEngine.calculate({ ...base, tool_material: "carbide" });
      const ceramic = toolWearRateEngine.calculate({ ...base, tool_material: "ceramic" });
      expect(hss.taylor_exponent.value).toBeLessThan(carbide.taylor_exponent.value);
      expect(carbide.taylor_exponent.value).toBeLessThan(ceramic.taylor_exponent.value);
    });

    it("calculates remaining life from current wear", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 150,
        feed_mm: 0.15,
        tool_material: "carbide",
        work_material: "steel",
        current_flank_wear_mm: 0.15,
        max_flank_wear_mm: 0.3,
      });
      expect(result.remaining_life.value).toBeGreaterThan(0);
      expect(result.remaining_life.value).toBeLessThan(result.predicted_tool_life.value);
    });

    it("warns when speed exceeds Taylor constant", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 350,
        feed_mm: 0.15,
        tool_material: "carbide",
        work_material: "steel",
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("exceeds Taylor constant"))).toBe(true);
    });

    it("warns for HSS at high speed", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 120,
        feed_mm: 0.15,
        tool_material: "hss",
        work_material: "steel",
      });
      expect(result.warnings.some(w => w.includes("HSS at high speed"))).toBe(true);
    });

    it("warns for HSS on Inconel", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 30,
        feed_mm: 0.1,
        tool_material: "hss",
        work_material: "inconel",
      });
      expect(result.warnings.some(w => w.includes("HSS on Inconel"))).toBe(true);
    });

    it("crater wear risk increases with speed", () => {
      const base = {
        feed_mm: 0.15,
        tool_material: "carbide" as const,
        work_material: "steel" as const,
      };
      const slow = toolWearRateEngine.calculate({ ...base, cutting_speed_mpm: 100 });
      const fast = toolWearRateEngine.calculate({ ...base, cutting_speed_mpm: 280 });
      expect(fast.crater_wear_risk.value).toBeGreaterThanOrEqual(slow.crater_wear_risk.value);
    });

    it("provides cost and productivity optimized speeds", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 150,
        feed_mm: 0.15,
        tool_material: "carbide",
        work_material: "steel",
      });
      expect(result.optimal_speed_cost.value).toBeGreaterThan(0);
      expect(result.optimal_speed_productivity.value).toBeGreaterThan(0);
      expect(result.optimal_speed_productivity.value).toBeGreaterThan(result.optimal_speed_cost.value);
    });

    it("returns AtomicValue structure with units and sources", () => {
      const result = toolWearRateEngine.calculate({
        cutting_speed_mpm: 150,
        tool_material: "carbide",
        work_material: "steel",
      });
      expect(result.predicted_tool_life.unit).toBe("min");
      expect(result.flank_wear_rate.unit).toBe("mm/min");
      expect(result.taylor_constant.source).toContain("carbide");
    });
  });

  describe("material coverage", () => {
    const materials: Array<"steel" | "aluminum" | "titanium" | "stainless" | "cast_iron" | "inconel"> =
      ["steel", "aluminum", "titanium", "stainless", "cast_iron", "inconel"];
    const tools: Array<"hss" | "carbide" | "cermet" | "ceramic" | "cbn" | "pcd"> =
      ["hss", "carbide", "cermet", "ceramic", "cbn", "pcd"];

    for (const work of materials) {
      for (const tool of tools) {
        it(`computes valid result for ${tool} on ${work}`, () => {
          // HSS requires much lower speed on difficult materials
          const speed = tool === "hss" && ["titanium", "stainless", "inconel"].includes(work)
            ? 20  // HSS on difficult materials
            : tool === "hss" ? 50 : 100;  // HSS on easy materials vs carbide+
          const result = toolWearRateEngine.calculate({
            cutting_speed_mpm: speed,
            tool_material: tool,
            work_material: work,
          });
          expect(result.predicted_tool_life.value).toBeGreaterThanOrEqual(0);
          expect(result.taylor_exponent.value).toBeGreaterThan(0);
          expect(result.taylor_constant.value).toBeGreaterThan(0);
        });
      }
    }
  });
});

describe("SurfaceFinishPredictorEngine P4-U07-PHYS", () => {
  describe("brammertzRa", () => {
    it("computes Ra for standard finishing parameters", () => {
      const result = surfaceFinishPredictorEngine.brammertzRa(0.1, 5, 10);
      expect(result.ra_um).toBeGreaterThan(0);
      expect(result.rt_um).toBeGreaterThan(result.ra_um);
    });

    it("Ra increases with feed squared relationship", () => {
      // Brammertz: Rt = f²/(8R) + re/2, Ra ≈ Rt/4
      // Due to constant edge radius term, ratio isn't exactly f₂²/f₁²
      const low = surfaceFinishPredictorEngine.brammertzRa(0.05, 5, 10);
      const high = surfaceFinishPredictorEngine.brammertzRa(0.2, 5, 10);
      // 4× feed should give significantly higher Ra (but not 16× due to re term)
      expect(high.ra_um).toBeGreaterThan(low.ra_um);
      expect(high.ra_um / low.ra_um).toBeGreaterThan(1);
      // With zero edge radius, would be exactly (0.2/0.05)² = 16
      const lowZero = surfaceFinishPredictorEngine.brammertzRa(0.05, 5, 0);
      const highZero = surfaceFinishPredictorEngine.brammertzRa(0.2, 5, 0);
      expect(highZero.ra_um / lowZero.ra_um).toBeCloseTo(16, 0);
    });

    it("Ra decreases with larger nose radius", () => {
      const small = surfaceFinishPredictorEngine.brammertzRa(0.1, 2, 10);
      const large = surfaceFinishPredictorEngine.brammertzRa(0.1, 8, 10);
      expect(small.ra_um).toBeGreaterThan(large.ra_um);
    });

    it("returns near-zero for zero feed", () => {
      const result = surfaceFinishPredictorEngine.brammertzRa(0, 5, 10);
      expect(result.ra_um).toBe(0);
    });
  });

  describe("scallopHeight", () => {
    it("computes scallop for ball endmill", () => {
      const scallop = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "ball",
        diameter_mm: 10,
      });
      expect(scallop).toBeGreaterThan(0);
      expect(scallop).toBeLessThan(100);
    });

    it("ball endmill scallop follows h = R - sqrt(R² - (ae/2)²)", () => {
      const ae = 2.0;
      const D = 20;
      const R = D / 2;
      const expected = (R - Math.sqrt(R * R - (ae / 2) ** 2)) * 1000;
      const actual = surfaceFinishPredictorEngine.scallopHeight(ae, {
        type: "ball",
        diameter_mm: D,
      });
      expect(actual).toBeCloseTo(expected, 1);
    });

    it("larger stepover increases scallop height", () => {
      const tool = { type: "ball" as const, diameter_mm: 10 };
      const small = surfaceFinishPredictorEngine.scallopHeight(0.5, tool);
      const large = surfaceFinishPredictorEngine.scallopHeight(2.0, tool);
      expect(large).toBeGreaterThan(small);
    });

    it("flat endmill has lower scallop than ball on same stepover", () => {
      const ae = 1.0;
      const D = 10;
      const ball = surfaceFinishPredictorEngine.scallopHeight(ae, { type: "ball", diameter_mm: D });
      const flat = surfaceFinishPredictorEngine.scallopHeight(ae, { type: "flat", diameter_mm: D });
      expect(flat).toBeLessThan(ball);
    });

    it("barrel endmill uses barrel radius", () => {
      const scallop = surfaceFinishPredictorEngine.scallopHeight(1.0, {
        type: "barrel",
        diameter_mm: 10,
        barrel_radius_mm: 250,
      });
      expect(scallop).toBeGreaterThan(0);
      expect(scallop).toBeLessThan(10);
    });

    it("bull_nose uses corner radius", () => {
      const scallop = surfaceFinishPredictorEngine.scallopHeight(0.5, {
        type: "bull_nose",
        diameter_mm: 10,
        corner_radius_mm: 2,
      });
      expect(scallop).toBeGreaterThan(0);
    });

    it("returns 0 for zero stepover", () => {
      const scallop = surfaceFinishPredictorEngine.scallopHeight(0, {
        type: "ball",
        diameter_mm: 10,
      });
      expect(scallop).toBe(0);
    });
  });

  describe("predict", () => {
    it("predicts surface finish for single segment", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [{
          x: 0, y: 0, z: 0,
          ae_mm: 1.0,
          ap_mm: 2.0,
          rpm: 10000,
          feed_mmmin: 1000,
        }],
        tool: { type: "flat", diameter_mm: 10, flute_count: 4 },
        target_ra_um: 1.6,
      });
      expect(result.points.length).toBe(1);
      expect(result.summary.mean_ra_um).toBeGreaterThan(0);
      expect(result.target_ra_um).toBe(1.6);
    });

    it("computes summary statistics for multiple segments", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [
          { x: 0, y: 0, z: 0, ae_mm: 0.5, ap_mm: 1, rpm: 10000, feed_mmmin: 500 },
          { x: 10, y: 0, z: 0, ae_mm: 1.0, ap_mm: 2, rpm: 8000, feed_mmmin: 800 },
          { x: 20, y: 0, z: 0, ae_mm: 1.5, ap_mm: 3, rpm: 6000, feed_mmmin: 1200 },
        ],
        tool: { type: "ball", diameter_mm: 8, flute_count: 2 },
        target_ra_um: 1.6,
      });
      expect(result.points.length).toBe(3);
      expect(result.summary.max_ra_um).toBeGreaterThanOrEqual(result.summary.mean_ra_um);
      expect(result.summary.min_ra_um).toBeLessThanOrEqual(result.summary.mean_ra_um);
      expect(result.summary.pct_meeting_target).toBeGreaterThanOrEqual(0);
      expect(result.summary.pct_meeting_target).toBeLessThanOrEqual(100);
    });

    it("material correction factor affects Ra", () => {
      const base = {
        segments: [{ x: 0, y: 0, z: 0, ae_mm: 1, ap_mm: 2, rpm: 10000, feed_mmmin: 1000 }],
        tool: { type: "flat" as const, diameter_mm: 10, flute_count: 4 },
        target_ra_um: 1.6,
      };
      const aluminum = surfaceFinishPredictorEngine.predict({ ...base, material: "aluminum" });
      const titanium = surfaceFinishPredictorEngine.predict({ ...base, material: "titanium" });
      expect(titanium.summary.mean_ra_um).toBeGreaterThan(aluminum.summary.mean_ra_um);
    });

    it("coolant correction factor affects Ra", () => {
      const base = {
        segments: [{ x: 0, y: 0, z: 0, ae_mm: 1, ap_mm: 2, rpm: 10000, feed_mmmin: 1000 }],
        tool: { type: "flat" as const, diameter_mm: 10, flute_count: 4 },
        target_ra_um: 1.6,
      };
      const dry = surfaceFinishPredictorEngine.predict({ ...base, coolant: "dry" });
      const flood = surfaceFinishPredictorEngine.predict({ ...base, coolant: "flood" });
      expect(dry.summary.mean_ra_um).toBeGreaterThan(flood.summary.mean_ra_um);
    });

    it("algorithm effects are applied", () => {
      const base = {
        segments: [{ x: 0, y: 0, z: 0, ae_mm: 1, ap_mm: 2, rpm: 10000, feed_mmmin: 1000 }],
        tool: { type: "flat" as const, diameter_mm: 10, flute_count: 4 },
        target_ra_um: 1.6,
      };
      const standard = surfaceFinishPredictorEngine.predict(base);
      const hraf = surfaceFinishPredictorEngine.predict({ ...base, algorithm: "HRAF" });
      expect(hraf.algorithm_effects.length).toBeGreaterThan(0);
      expect(hraf.summary.mean_ra_um).toBeLessThan(standard.summary.mean_ra_um);
    });

    it("returns empty result for empty segments", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [],
        tool: { type: "flat", diameter_mm: 10 },
      });
      expect(result.points.length).toBe(0);
      expect(result.summary.pct_meeting_target).toBe(100);
    });

    it("generates recommendations for poor surface finish", () => {
      const result = surfaceFinishPredictorEngine.predict({
        segments: [{ x: 0, y: 0, z: 0, ae_mm: 3, ap_mm: 5, rpm: 5000, feed_mmmin: 2000 }],
        tool: { type: "ball", diameter_mm: 6, flute_count: 2 },
        target_ra_um: 0.8,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("quickPredict", () => {
    it("returns summary without per-point data", () => {
      const result = surfaceFinishPredictorEngine.quickPredict({
        segments: [{ x: 0, y: 0, z: 0, ae_mm: 1, ap_mm: 2, rpm: 10000, feed_mmmin: 1000 }],
        tool: { type: "flat", diameter_mm: 10, flute_count: 4 },
        target_ra_um: 1.6,
      });
      expect(result.mean_ra_um).toBeGreaterThan(0);
      expect(result.max_ra_um).toBeGreaterThan(0);
      expect(result.mean_scallop_um).toBeGreaterThanOrEqual(0);
      expect(typeof result.recommendation).toBe("string");
    });
  });

  describe("optimalFeedForRa", () => {
    it("computes feed for target Ra", () => {
      const fz = surfaceFinishPredictorEngine.optimalFeedForRa(1.6, 5, 10);
      expect(fz).toBeGreaterThan(0);
    });

    it("lower Ra target requires lower feed", () => {
      const fine = surfaceFinishPredictorEngine.optimalFeedForRa(0.4, 5, 10);
      const coarse = surfaceFinishPredictorEngine.optimalFeedForRa(3.2, 5, 10);
      expect(fine).toBeLessThan(coarse);
    });

    it("larger nose radius allows higher feed for same Ra", () => {
      const small = surfaceFinishPredictorEngine.optimalFeedForRa(1.6, 2, 10);
      const large = surfaceFinishPredictorEngine.optimalFeedForRa(1.6, 8, 10);
      expect(large).toBeGreaterThan(small);
    });
  });

  describe("optimalStepoverForScallop", () => {
    it("computes stepover for target scallop with ball endmill", () => {
      const ae = surfaceFinishPredictorEngine.optimalStepoverForScallop(10, {
        type: "ball",
        diameter_mm: 10,
      });
      expect(ae).toBeGreaterThan(0);
    });

    it("lower scallop target requires smaller stepover", () => {
      const tool = { type: "ball" as const, diameter_mm: 10 };
      const fine = surfaceFinishPredictorEngine.optimalStepoverForScallop(5, tool);
      const coarse = surfaceFinishPredictorEngine.optimalStepoverForScallop(20, tool);
      expect(fine).toBeLessThan(coarse);
    });

    it("larger diameter allows larger stepover for same scallop", () => {
      const small = surfaceFinishPredictorEngine.optimalStepoverForScallop(10, {
        type: "ball", diameter_mm: 6,
      });
      const large = surfaceFinishPredictorEngine.optimalStepoverForScallop(10, {
        type: "ball", diameter_mm: 20,
      });
      expect(large).toBeGreaterThan(small);
    });
  });
});

describe("millDispatcher physics wiring integration", () => {
  it("thermal engine exports singleton", async () => {
    const { cuttingThermalEngine } = await import("../engines/CuttingThermalEngine.js");
    expect(typeof cuttingThermalEngine.shearPlaneTemperature).toBe("function");
    expect(typeof cuttingThermalEngine.toolChipInterfaceTemp).toBe("function");
    expect(typeof cuttingThermalEngine.heatPartition).toBe("function");
  });

  it("wear engine exports singleton", async () => {
    const { toolWearRateEngine } = await import("../engines/ToolWearRateEngine.js");
    expect(typeof toolWearRateEngine.calculate).toBe("function");
    expect(typeof toolWearRateEngine.extendedToolLife).toBe("function");
  });

  it("surface engine exports singleton", async () => {
    const { surfaceFinishPredictorEngine } = await import("../engines/SurfaceFinishPredictorEngine.js");
    expect(typeof surfaceFinishPredictorEngine.predict).toBe("function");
    expect(typeof surfaceFinishPredictorEngine.quickPredict).toBe("function");
    expect(typeof surfaceFinishPredictorEngine.brammertzRa).toBe("function");
    expect(typeof surfaceFinishPredictorEngine.scallopHeight).toBe("function");
  });
});

describe("millDispatcher action equivalence tests", () => {
  it("mill_thermal_predict equivalent: thermal analysis with dispatcher params", () => {
    // Tests the exact call pattern millDispatcher uses for mill_thermal_predict
    const Vc = 150;
    const f = 0.15;
    const ap = 2;
    const shearResult = cuttingThermalEngine.shearPlaneTemperature({
      cuttingSpeed: Vc,
      feed: f,
      shearStrength: 400,
      shearAngle: 25 * Math.PI / 180,
      rakeAngle: 6 * Math.PI / 180,
    });
    const interfaceResult = cuttingThermalEngine.toolChipInterfaceTemp({
      cuttingSpeed: Vc,
      feed: f,
      depthOfCut: ap,
      specificCuttingEnergy: 3.5,
    });
    const partitionResult = cuttingThermalEngine.heatPartition({
      cuttingSpeed: Vc,
      workMaterial: "steel",
      toolMaterial: "carbide",
    });
    // Dispatcher returns combined result
    const result = {
      shear_zone: shearResult,
      interface: interfaceResult,
      heat_partition: partitionResult,
      summary: {
        peak_temperature_c: Math.max(shearResult.shearZoneTemp_C, interfaceResult.interfaceTemperature_C),
        tool_average_temp_c: interfaceResult.toolAverageTemp_C,
        heat_to_chip_pct: partitionResult.toChip_percent,
        heat_regime: shearResult.heatRegime,
      },
    };
    expect(result.summary.peak_temperature_c).toBeGreaterThan(100);
    expect(result.summary.heat_to_chip_pct).toBeGreaterThan(0);
    expect(["high_speed", "low_speed"]).toContain(result.summary.heat_regime);
  });

  it("mill_wear_predict equivalent: Taylor tool life with dispatcher params", () => {
    // Tests the exact call pattern millDispatcher uses for mill_wear_predict
    const result = toolWearRateEngine.calculate({
      cutting_speed_mpm: 150,
      feed_mm: 0.15,
      depth_of_cut_mm: 2,
      tool_material: "carbide",
      work_material: "steel",
    });
    expect(result.predicted_tool_life.value).toBeGreaterThan(0);
    expect(result.predicted_tool_life.unit).toBe("min");
    expect(result.taylor_exponent.value).toBe(0.25);
  });

  it("mill_surface_predict equivalent: Brammertz finish with dispatcher params", () => {
    // Tests the exact call pattern millDispatcher uses for mill_surface_predict
    const segments = [{
      x: 0, y: 0, z: 0,
      ae_mm: 1.0,
      ap_mm: 2,
      rpm: 10000,
      feed_mmmin: 1000,
    }];
    const tool = {
      type: "flat" as const,
      diameter_mm: 10,
      flute_count: 4,
      edge_radius_um: 5,
    };
    const result = surfaceFinishPredictorEngine.predict({
      segments,
      tool,
      target_ra_um: 1.6,
      material: "aluminum",
      coolant: "flood",
    });
    expect(result.points.length).toBe(1);
    expect(result.summary.mean_ra_um).toBeGreaterThan(0);
    expect(result.summary.pct_meeting_target).toBeGreaterThanOrEqual(0);
  });

  it("mill_thermal_predict equivalent: handles defaults gracefully", () => {
    // Dispatcher defaults when optional params missing
    const shearResult = cuttingThermalEngine.shearPlaneTemperature({
      cuttingSpeed: 100,
      feed: 0.1,
      shearStrength: 400,
      shearAngle: 25 * Math.PI / 180,
    });
    expect(shearResult.shearZoneTemp_C).toBeGreaterThan(0);
    expect(shearResult.thermalNumber).toBeGreaterThan(0);
  });

  it("mill_wear_predict equivalent: warns for excessive speed", () => {
    const result = toolWearRateEngine.calculate({
      cutting_speed_mpm: 400,
      tool_material: "carbide",
      work_material: "steel",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w: string) => w.includes("exceeds Taylor constant"))).toBe(true);
  });

  it("mill_surface_predict equivalent: algorithm correction applied", () => {
    const segments = [{
      x: 0, y: 0, z: 0,
      ae_mm: 0.5,
      ap_mm: 1,
      rpm: 12000,
      feed_mmmin: 800,
    }];
    const tool = {
      type: "ball" as const,
      diameter_mm: 10,
      flute_count: 2,
    };
    const result = surfaceFinishPredictorEngine.predict({
      segments,
      tool,
      target_ra_um: 0.8,
      algorithm: "HBCF",
    });
    expect(result.algorithm_effects.length).toBeGreaterThan(0);
    expect(result.algorithm_effects[0].algorithm).toBe("HBCF");
    expect(result.algorithm_effects[0].ra_correction_factor).toBeLessThan(1);
  });
});
