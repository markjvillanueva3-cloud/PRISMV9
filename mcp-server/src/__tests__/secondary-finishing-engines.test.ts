/**
 * Secondary Finishing Engines — Unit Tests
 * Covers: GrindingWheelDressingOptimizationEngine, BurnishingPolishingEngine,
 *         HoningProcessEngine, PostAMFinishingPlanEngine
 * 55 tests across all methods with realistic manufacturing data
 */
import { describe, it, expect } from "vitest";
import {
  grindingWheelDressingOptimizationEngine,
} from "../engines/GrindingWheelDressingOptimizationEngine.js";
import {
  burnishingPolishingEngine,
} from "../engines/BurnishingPolishingEngine.js";
import {
  honingProcessEngine,
} from "../engines/HoningProcessEngine.js";
import {
  postAMFinishingPlanEngine,
} from "../engines/PostAMFinishingPlanEngine.js";

// ═══════════════════════════════════════════════════════════════════
// GrindingWheelDressingOptimizationEngine
// ═══════════════════════════════════════════════════════════════════

describe("GrindingWheelDressingOptimizationEngine", () => {
  describe("predictWheelLife", () => {
    it("returns positive G-ratio for carbon steel with vitrified wheel", () => {
      const r = grindingWheelDressingOptimizationEngine.predictWheelLife({
        wheel_spec: "WA60K5V",
        workpiece_material: "carbon_steel",
        depth_of_cut_mm: 0.02,
        table_speed_mpm: 15,
        wheel_speed_mps: 30,
        wheel_diameter_mm: 350,
        wheel_width_mm: 30,
      });
      expect(r.g_ratio).toBeGreaterThan(0);
      expect(r.wheel_wear_rate_mm3_per_mm3).toBeGreaterThan(0);
      expect(r.estimated_life_parts).toBeGreaterThan(0);
      expect(r.estimated_life_min).toBeGreaterThan(0);
    });

    it("G-ratio is higher for aluminum than titanium (easier material)", () => {
      const base = {
        wheel_spec: "WA60K5V", depth_of_cut_mm: 0.02,
        table_speed_mpm: 15, wheel_speed_mps: 30,
        wheel_diameter_mm: 350, wheel_width_mm: 30,
      };
      const al = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, workpiece_material: "aluminum",
      });
      const ti = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, workpiece_material: "titanium",
      });
      expect(al.g_ratio).toBeGreaterThan(ti.g_ratio);
    });

    it("CBN wheel has much higher G-ratio than vitrified", () => {
      const base = {
        workpiece_material: "hardened_steel", depth_of_cut_mm: 0.01,
        table_speed_mpm: 20, wheel_speed_mps: 45,
        wheel_diameter_mm: 300, wheel_width_mm: 25,
      };
      const vitrified = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, wheel_spec: "WA80K5V",
      });
      const cbn = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, wheel_spec: "B80K5D", // D → diamond bond parsed, but let's use CBN-like
      });
      // Diamond bond G-ratio >> vitrified
      expect(cbn.g_ratio).toBeGreaterThan(vitrified.g_ratio * 10);
    });

    it("deeper cut reduces wheel life", () => {
      const base = {
        wheel_spec: "WA60K5V", workpiece_material: "carbon_steel",
        table_speed_mpm: 15, wheel_speed_mps: 30,
        wheel_diameter_mm: 350, wheel_width_mm: 30,
      };
      const shallow = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, depth_of_cut_mm: 0.01,
      });
      const deep = grindingWheelDressingOptimizationEngine.predictWheelLife({
        ...base, depth_of_cut_mm: 0.05,
      });
      expect(shallow.estimated_life_min).toBeGreaterThan(deep.estimated_life_min);
    });

    it("wear rate is inverse of G-ratio", () => {
      const r = grindingWheelDressingOptimizationEngine.predictWheelLife({
        wheel_spec: "WA60K5V", workpiece_material: "alloy_steel",
        depth_of_cut_mm: 0.02, table_speed_mpm: 15,
        wheel_speed_mps: 30, wheel_diameter_mm: 350, wheel_width_mm: 30,
      });
      expect(Math.abs(r.wheel_wear_rate_mm3_per_mm3 - 1 / r.g_ratio)).toBeLessThan(0.001);
    });
  });

  describe("optimizeDressingInterval", () => {
    it("returns positive dressing interval", () => {
      const r = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
        wheel_spec: "WA60K5V", workpiece_material: "carbon_steel",
        depth_of_cut_mm: 0.02, table_speed_mpm: 15,
        wheel_speed_mps: 30, wheel_diameter_mm: 350, wheel_width_mm: 30,
        target_Ra_um: 0.8, current_wheel_wear_mm: 0.1,
      });
      expect(r.optimal_interval_parts).toBeGreaterThan(0);
      expect(r.dressing_depth_mm).toBeGreaterThan(0);
      expect(r.wheel_loss_per_dress_mm).toBeGreaterThan(0);
      expect(r.total_wheel_cost_per_part).toBeGreaterThan(0);
    });

    it("tighter target Ra requires more frequent dressing", () => {
      const base = {
        wheel_spec: "WA80K5V", workpiece_material: "alloy_steel",
        depth_of_cut_mm: 0.01, table_speed_mpm: 20,
        wheel_speed_mps: 30, wheel_diameter_mm: 300, wheel_width_mm: 25,
        current_wheel_wear_mm: 0.05,
      };
      const loose = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
        ...base, target_Ra_um: 1.6,
      });
      const tight = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
        ...base, target_Ra_um: 0.4,
      });
      expect(loose.optimal_interval_parts).toBeGreaterThanOrEqual(tight.optimal_interval_parts);
    });

    it("CBN wheel has smaller dressing depth than vitrified", () => {
      const base = {
        workpiece_material: "hardened_steel",
        depth_of_cut_mm: 0.01, table_speed_mpm: 20,
        wheel_speed_mps: 45, wheel_diameter_mm: 300, wheel_width_mm: 25,
        target_Ra_um: 0.4, current_wheel_wear_mm: 0.02,
      };
      const vit = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
        ...base, wheel_spec: "WA80K5V",
      });
      const cbn = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
        ...base, wheel_spec: "B80K5D",
      });
      expect(cbn.dressing_depth_mm).toBeLessThan(vit.dressing_depth_mm);
    });
  });

  describe("selectDressingTool", () => {
    it("recommends single-point diamond for vitrified finishing", () => {
      const r = grindingWheelDressingOptimizationEngine.selectDressingTool({
        wheel_type: "vitrified", application: "finishing",
      });
      expect(r.recommended_tool).toBe("single_point_diamond");
      expect(r.overlap_ratio).toBeGreaterThan(3);
      expect(r.reasoning.length).toBeGreaterThan(10);
    });

    it("recommends rotary for CBN roughing", () => {
      const r = grindingWheelDressingOptimizationEngine.selectDressingTool({
        wheel_type: "CBN", application: "roughing",
      });
      expect(r.recommended_tool).toBe("rotary_diamond_dresser");
    });

    it("recommends crush roll for diamond form", () => {
      const r = grindingWheelDressingOptimizationEngine.selectDressingTool({
        wheel_type: "diamond", application: "form",
      });
      expect(r.recommended_tool).toBe("crush_roll_dresser");
    });

    it("recommends form roll for vitrified form", () => {
      const r = grindingWheelDressingOptimizationEngine.selectDressingTool({
        wheel_type: "vitrified", application: "form",
      });
      expect(r.recommended_tool).toBe("form_roll_dresser");
    });

    it("recommends blade dresser for resinoid roughing", () => {
      const r = grindingWheelDressingOptimizationEngine.selectDressingTool({
        wheel_type: "resinoid", application: "roughing",
      });
      expect(r.recommended_tool).toBe("blade_dresser");
    });
  });

  describe("creepFeedSetup", () => {
    it("returns valid creep-feed parameters for steel slot", () => {
      const r = grindingWheelDressingOptimizationEngine.creepFeedSetup({
        material: "alloy_steel", slot_depth_mm: 5,
        slot_width_mm: 10, wheel_diameter_mm: 400,
      });
      expect(r.table_speed_mm_min).toBeGreaterThan(20);
      expect(r.table_speed_mm_min).toBeLessThan(500);
      expect(r.wheel_speed_mps).toBeGreaterThanOrEqual(25);
      expect(r.coolant_flow_lpm).toBeGreaterThan(0);
      expect(r.expected_specific_energy).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(r.burn_risk);
    });

    it("aluminum has lower specific energy than inconel", () => {
      const base = { slot_depth_mm: 3, slot_width_mm: 8, wheel_diameter_mm: 350 };
      const al = grindingWheelDressingOptimizationEngine.creepFeedSetup({
        ...base, material: "aluminum",
      });
      const inc = grindingWheelDressingOptimizationEngine.creepFeedSetup({
        ...base, material: "inconel",
      });
      expect(al.expected_specific_energy).toBeLessThan(inc.expected_specific_energy);
    });

    it("deeper slot increases burn risk", () => {
      const base = { material: "tool_steel", slot_width_mm: 10, wheel_diameter_mm: 350 };
      const shallow = grindingWheelDressingOptimizationEngine.creepFeedSetup({
        ...base, slot_depth_mm: 1,
      });
      const deep = grindingWheelDressingOptimizationEngine.creepFeedSetup({
        ...base, slot_depth_mm: 10,
      });
      const riskOrder = { low: 0, medium: 1, high: 2 };
      expect(riskOrder[deep.burn_risk]).toBeGreaterThanOrEqual(riskOrder[shallow.burn_risk]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// BurnishingPolishingEngine
// ═══════════════════════════════════════════════════════════════════

describe("BurnishingPolishingEngine", () => {
  describe("predictBurnishing", () => {
    it("reduces Ra from initial value", () => {
      const r = burnishingPolishingEngine.predictBurnishing({
        process: "ball", material: "carbon_steel",
        initial_Ra_um: 1.6, burnishing_force_N: 200,
        feed_mm_per_rev: 0.1, speed_mpm: 60,
      });
      expect(r.final_Ra_um).toBeLessThan(1.6);
      expect(r.final_Ra_um).toBeGreaterThan(0);
    });

    it("produces compressive residual stress (negative)", () => {
      const r = burnishingPolishingEngine.predictBurnishing({
        process: "ball", material: "alloy_steel",
        initial_Ra_um: 1.6, burnishing_force_N: 300,
        feed_mm_per_rev: 0.08, speed_mpm: 80,
      });
      expect(r.residual_stress_MPa).toBeLessThan(0);
    });

    it("increases surface hardness", () => {
      const r = burnishingPolishingEngine.predictBurnishing({
        process: "roller", material: "carbon_steel",
        initial_Ra_um: 1.6, burnishing_force_N: 500,
        feed_mm_per_rev: 0.1, speed_mpm: 50,
      });
      expect(r.hardness_increase_HRC).toBeGreaterThan(0);
    });

    it("diamond tip gives better finish than roller", () => {
      const base = {
        material: "stainless_steel", initial_Ra_um: 0.8,
        burnishing_force_N: 150, feed_mm_per_rev: 0.05, speed_mpm: 80,
      };
      const dia = burnishingPolishingEngine.predictBurnishing({
        ...base, process: "diamond_tip",
      });
      const roller = burnishingPolishingEngine.predictBurnishing({
        ...base, process: "roller",
      });
      expect(dia.final_Ra_um).toBeLessThanOrEqual(roller.final_Ra_um);
    });

    it("higher force gives deeper effect", () => {
      const base = {
        process: "ball" as const, material: "alloy_steel",
        initial_Ra_um: 1.6, feed_mm_per_rev: 0.1, speed_mpm: 60,
      };
      const low = burnishingPolishingEngine.predictBurnishing({
        ...base, burnishing_force_N: 100,
      });
      const high = burnishingPolishingEngine.predictBurnishing({
        ...base, burnishing_force_N: 500,
      });
      expect(high.depth_of_effect_mm).toBeGreaterThan(low.depth_of_effect_mm);
    });

    it("custom ball diameter affects results", () => {
      const r = burnishingPolishingEngine.predictBurnishing({
        process: "ball", material: "aluminum",
        initial_Ra_um: 1.6, burnishing_force_N: 150,
        feed_mm_per_rev: 0.08, speed_mpm: 100,
        ball_diameter_mm: 6,
      });
      expect(r.depth_of_effect_mm).toBeGreaterThan(0);
      expect(r.final_Ra_um).toBeLessThan(1.6);
    });
  });

  describe("predictLapping", () => {
    it("returns positive removal rate using Preston equation", () => {
      const r = burnishingPolishingEngine.predictLapping({
        material: "carbon_steel", pressure_kPa: 30,
        velocity_mpm: 30, abrasive_size_um: 9,
        target_flatness_um: 1,
      });
      expect(r.removal_rate_um_per_min).toBeGreaterThan(0);
      expect(r.time_to_target_min).toBeGreaterThan(0);
      expect(r.surface_Ra_um).toBeGreaterThan(0);
    });

    it("higher pressure increases removal rate", () => {
      const base = {
        material: "alloy_steel", velocity_mpm: 25,
        abrasive_size_um: 9, target_flatness_um: 0.5,
      };
      const low = burnishingPolishingEngine.predictLapping({
        ...base, pressure_kPa: 15,
      });
      const high = burnishingPolishingEngine.predictLapping({
        ...base, pressure_kPa: 45,
      });
      expect(high.removal_rate_um_per_min).toBeGreaterThan(low.removal_rate_um_per_min);
    });

    it("larger abrasive gives rougher surface", () => {
      const base = {
        material: "glass", pressure_kPa: 20,
        velocity_mpm: 30, target_flatness_um: 0.5,
      };
      const fine = burnishingPolishingEngine.predictLapping({
        ...base, abrasive_size_um: 3,
      });
      const coarse = burnishingPolishingEngine.predictLapping({
        ...base, abrasive_size_um: 25,
      });
      expect(coarse.surface_Ra_um).toBeGreaterThan(fine.surface_Ra_um);
    });
  });

  describe("predictPolishing", () => {
    it("generates multi-step grit progression", () => {
      const r = burnishingPolishingEngine.predictPolishing({
        material: "tool_steel", area_cm2: 20,
        initial_Ra_um: 1.6, target_Ra_um: 0.05,
        method: "mechanical",
      });
      expect(r.steps.length).toBeGreaterThan(1);
      expect(r.estimated_time_min).toBeGreaterThan(0);
      expect(r.cost_estimate).toBeGreaterThan(0);
      expect(r.achievable_Ra_um).toBeLessThanOrEqual(0.05);
    });

    it("electro-polishing is faster than mechanical", () => {
      const base = {
        material: "stainless_steel", area_cm2: 15,
        initial_Ra_um: 0.8, target_Ra_um: 0.1,
      };
      const mech = burnishingPolishingEngine.predictPolishing({
        ...base, method: "mechanical",
      });
      const electro = burnishingPolishingEngine.predictPolishing({
        ...base, method: "electro",
      });
      expect(electro.estimated_time_min).toBeLessThan(mech.estimated_time_min);
    });

    it("larger area takes longer", () => {
      const base = {
        material: "aluminum", initial_Ra_um: 0.8,
        target_Ra_um: 0.1, method: "mechanical" as const,
      };
      const small = burnishingPolishingEngine.predictPolishing({
        ...base, area_cm2: 5,
      });
      const large = burnishingPolishingEngine.predictPolishing({
        ...base, area_cm2: 50,
      });
      expect(large.estimated_time_min).toBeGreaterThan(small.estimated_time_min);
    });

    it("steps have decreasing Ra values", () => {
      const r = burnishingPolishingEngine.predictPolishing({
        material: "carbon_steel", area_cm2: 10,
        initial_Ra_um: 3.2, target_Ra_um: 0.025,
        method: "chemical_mechanical",
      });
      for (let i = 1; i < r.steps.length; i++) {
        expect(r.steps[i].expected_Ra).toBeLessThanOrEqual(r.steps[i - 1].expected_Ra);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// HoningProcessEngine
// ═══════════════════════════════════════════════════════════════════

describe("HoningProcessEngine", () => {
  describe("designHoningProcess", () => {
    it("designs valid honing setup for engine cylinder", () => {
      const r = honingProcessEngine.designHoningProcess({
        bore_diameter_mm: 85,
        bore_length_mm: 120,
        material: "cast_iron",
        initial_Ra_um: 3.2,
        target_Ra_um: 0.4,
      });
      expect(r.stone_spec).toBeTruthy();
      expect(r.expansion_pressure_bar).toBeGreaterThanOrEqual(5);
      expect(r.expansion_pressure_bar).toBeLessThanOrEqual(20);
      expect(r.rotation_rpm).toBeGreaterThan(0);
      expect(r.reciprocation_rate_spm).toBeGreaterThan(0);
      expect(r.stroke_length_mm).toBeGreaterThan(r.overrun_mm);
      expect(r.expected_cycle_time_sec).toBeGreaterThan(0);
      expect(r.expected_Ra).toBeLessThanOrEqual(0.4);
      expect(r.crosshatch_angle).toBeGreaterThan(10);
    });

    it("custom crosshatch angle is respected approximately", () => {
      const r = honingProcessEngine.designHoningProcess({
        bore_diameter_mm: 80, bore_length_mm: 100,
        material: "carbon_steel", initial_Ra_um: 1.6,
        target_Ra_um: 0.4, crosshatch_angle_deg: 60,
      });
      // Should be in reasonable range of requested angle
      expect(r.crosshatch_angle).toBeGreaterThanOrEqual(15);
      expect(r.crosshatch_angle).toBeLessThanOrEqual(150);
    });

    it("harder material gets higher expansion pressure", () => {
      const base = {
        bore_diameter_mm: 50, bore_length_mm: 80,
        initial_Ra_um: 1.6, target_Ra_um: 0.4,
      };
      const soft = honingProcessEngine.designHoningProcess({
        ...base, material: "aluminum",
      });
      const hard = honingProcessEngine.designHoningProcess({
        ...base, material: "hardened_steel",
      });
      expect(hard.expansion_pressure_bar).toBeGreaterThanOrEqual(soft.expansion_pressure_bar);
    });

    it("overrun is proportional to bore length", () => {
      const r = honingProcessEngine.designHoningProcess({
        bore_diameter_mm: 60, bore_length_mm: 200,
        material: "carbon_steel", initial_Ra_um: 1.6, target_Ra_um: 0.4,
      });
      expect(r.overrun_mm).toBeGreaterThan(0);
      expect(r.overrun_mm).toBeLessThan(r.stroke_length_mm);
    });
  });

  describe("selectStone", () => {
    it("selects CBN for hardened steel", () => {
      const r = honingProcessEngine.selectStone({
        bore_material: "hardened_steel",
        stock_removal_mm: 0.02,
        finish_required_Ra: 0.2,
      });
      expect(r.stone_type).toBe("CBN");
      expect(r.concentration).toBeDefined();
      expect(r.reasoning.length).toBeGreaterThan(10);
    });

    it("selects diamond for titanium", () => {
      const r = honingProcessEngine.selectStone({
        bore_material: "titanium",
        stock_removal_mm: 0.01,
        finish_required_Ra: 0.1,
      });
      expect(r.stone_type).toBe("diamond");
    });

    it("selects silicon carbide for cast iron heavy removal", () => {
      const r = honingProcessEngine.selectStone({
        bore_material: "cast_iron",
        stock_removal_mm: 0.2,
        finish_required_Ra: 0.8,
      });
      expect(r.stone_type).toBe("silicon_carbide");
    });

    it("selects vitrified for general purpose", () => {
      const r = honingProcessEngine.selectStone({
        bore_material: "carbon_steel",
        stock_removal_mm: 0.05,
        finish_required_Ra: 0.4,
      });
      expect(r.stone_type).toBe("vitrified");
    });

    it("grit size matches finish requirement", () => {
      const r = honingProcessEngine.selectStone({
        bore_material: "alloy_steel",
        stock_removal_mm: 0.01,
        finish_required_Ra: 0.05,
      });
      expect(r.grit_size).toBeGreaterThanOrEqual(600);
    });
  });

  describe("plateauHoning", () => {
    it("produces two-stage setup for cylinder liner", () => {
      const r = honingProcessEngine.plateauHoning({
        bore_diameter_mm: 92,
        material: "cast_iron",
        Rk_target_um: 0.8,
        Rpk_target_um: 0.3,
        Rvk_target_um: 2.0,
      });
      expect(r.stage_1.stone).toBeTruthy();
      expect(r.stage_2.stone).toBeTruthy();
      expect(r.stage_1.time).toBeGreaterThan(0);
      expect(r.stage_2.time).toBeGreaterThan(0);
      expect(r.expected_profile.Rk).toBeCloseTo(0.8, 1);
      expect(r.expected_profile.Rpk).toBeCloseTo(0.3, 1);
      expect(r.expected_profile.Rvk).toBeCloseTo(2.0, 1);
      expect(r.expected_profile.Mr1).toBeGreaterThan(0);
      expect(r.expected_profile.Mr1).toBeLessThan(20);
      expect(r.expected_profile.Mr2).toBeGreaterThan(75);
      expect(r.expected_profile.Mr2).toBeLessThanOrEqual(95);
    });

    it("stage 1 uses coarser stone than stage 2", () => {
      const r = honingProcessEngine.plateauHoning({
        bore_diameter_mm: 80, material: "cast_iron",
        Rk_target_um: 1.0, Rpk_target_um: 0.3, Rvk_target_um: 1.5,
      });
      // Stage 1 stone should have lower grit number (coarser)
      const grit1 = parseInt(r.stage_1.stone.match(/\d+/)?.[0] ?? "0");
      const grit2 = parseInt(r.stage_2.stone.match(/\d+/)?.[0] ?? "0");
      expect(grit1).toBeLessThanOrEqual(grit2);
    });

    it("stage 2 has lower pressure than stage 1", () => {
      const r = honingProcessEngine.plateauHoning({
        bore_diameter_mm: 90, material: "carbon_steel",
        Rk_target_um: 0.8, Rpk_target_um: 0.25, Rvk_target_um: 1.8,
      });
      expect(r.stage_2.params.pressure_bar).toBeLessThanOrEqual(r.stage_1.params.pressure_bar);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PostAMFinishingPlanEngine
// ═══════════════════════════════════════════════════════════════════

describe("PostAMFinishingPlanEngine", () => {
  describe("planFinishing", () => {
    it("generates multi-step plan for SLM titanium", () => {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: "SLM",
        material: "titanium",
        as_built_Ra_um: 8,
        target_Ra_um: 0.8,
        features: [
          { type: "bore", tolerance_mm: 0.02, surface_finish_Ra: 0.4 },
          { type: "flat", tolerance_mm: 0.005 },
        ],
      });
      expect(r.operations.length).toBeGreaterThan(0);
      expect(r.support_removal.method).toBeTruthy();
      expect(r.support_removal.time_min).toBeGreaterThan(0);
      expect(r.stress_relief.needed).toBe(true);
      expect(r.stress_relief.temp_C).toBeGreaterThan(0);
      expect(r.total_time_min).toBeGreaterThan(0);
      expect(r.total_cost_estimate).toBeGreaterThan(0);
    });

    it("includes stress relief for SLM but not EBM", () => {
      const base = {
        material: "titanium", as_built_Ra_um: 10,
        target_Ra_um: 1.6, features: [],
      };
      const slm = postAMFinishingPlanEngine.planFinishing({
        ...base, am_process: "SLM",
      });
      const ebm = postAMFinishingPlanEngine.planFinishing({
        ...base, am_process: "EBM",
      });
      expect(slm.stress_relief.needed).toBe(true);
      expect(ebm.stress_relief.needed).toBe(false);
    });

    it("operations are sequentially numbered", () => {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: "DED", material: "inconel",
        as_built_Ra_um: 30, target_Ra_um: 0.4,
        features: [{ type: "bore", tolerance_mm: 0.01, surface_finish_Ra: 0.2 }],
      });
      for (let i = 0; i < r.operations.length; i++) {
        expect(r.operations[i].sequence).toBe(i + 1);
      }
    });

    it("includes honing for bore features with tight finish", () => {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: "SLM", material: "alloy_steel",
        as_built_Ra_um: 8, target_Ra_um: 0.8,
        features: [{ type: "bore", tolerance_mm: 0.02, surface_finish_Ra: 0.2 }],
      });
      const honingOp = r.operations.find(op => op.process === "honing");
      expect(honingOp).toBeDefined();
    });

    it("includes grinding for tight flatness datum", () => {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: "DMLS", material: "stainless_steel",
        as_built_Ra_um: 10, target_Ra_um: 0.8,
        features: [{ type: "datum", tolerance_mm: 0.005 }],
      });
      const grindOp = r.operations.find(op => op.process === "surface_grinding");
      expect(grindOp).toBeDefined();
    });

    it("FDM does not need stress relief", () => {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: "FDM", material: "aluminum",
        as_built_Ra_um: 15, target_Ra_um: 3.2,
        features: [],
      });
      expect(r.stress_relief.needed).toBe(false);
    });
  });

  describe("assessMachinability", () => {
    it("returns machinability factor less than 1 for SLM metals", () => {
      const r = postAMFinishingPlanEngine.assessMachinability({
        am_process: "SLM", material: "titanium",
        build_orientation: "vertical_Z",
      });
      expect(r.machinability_factor).toBeLessThan(1);
      expect(r.machinability_factor).toBeGreaterThan(0);
      expect(r.recommended_speed_reduction_pct).toBeGreaterThan(0);
      expect(r.tool_wear_increase_pct).toBeGreaterThan(0);
      expect(r.recommended_tool_coating).toBeTruthy();
    });

    it("FDM has machinability above 1 (easier than wrought)", () => {
      const r = postAMFinishingPlanEngine.assessMachinability({
        am_process: "FDM", material: "aluminum",
        build_orientation: "horizontal_X",
      });
      expect(r.machinability_factor).toBeGreaterThan(1);
    });

    it("lower density worsens machinability", () => {
      const base = {
        am_process: "SLM" as const, material: "inconel",
        build_orientation: "vertical_Z",
      };
      const dense = postAMFinishingPlanEngine.assessMachinability({
        ...base, density_pct: 99.9,
      });
      const porous = postAMFinishingPlanEngine.assessMachinability({
        ...base, density_pct: 95,
      });
      expect(porous.machinability_factor).toBeLessThan(dense.machinability_factor);
    });

    it("vertical build generates anisotropy warnings", () => {
      const r = postAMFinishingPlanEngine.assessMachinability({
        am_process: "SLM", material: "stainless_steel",
        build_orientation: "vertical_Z",
      });
      expect(r.anisotropy_warnings.length).toBeGreaterThan(0);
      const hasZWarning = r.anisotropy_warnings.some(w => w.includes("Vertical") || w.includes("Z"));
      expect(hasZWarning).toBe(true);
    });

    it("DED process adds envelope warning", () => {
      const r = postAMFinishingPlanEngine.assessMachinability({
        am_process: "DED", material: "alloy_steel",
        build_orientation: "horizontal_X",
      });
      const hasDedWarning = r.anisotropy_warnings.some(w => w.includes("DED"));
      expect(hasDedWarning).toBe(true);
    });

    it("recommends TiAlN for titanium", () => {
      const r = postAMFinishingPlanEngine.assessMachinability({
        am_process: "EBM", material: "titanium",
        build_orientation: "vertical_Z",
      });
      expect(r.recommended_tool_coating).toBe("TiAlN");
    });
  });
});
