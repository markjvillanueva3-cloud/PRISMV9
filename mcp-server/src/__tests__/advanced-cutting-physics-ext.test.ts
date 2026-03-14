/**
 * Tests for AdvancedCuttingPhysicsExtEngine
 * 25+ tests covering BUE, Usui crater wear, Brammertz roughness, Colding tool life
 */

import { describe, it, expect } from "vitest";
import { advancedCuttingPhysicsExtEngine as engine } from "../engines/AdvancedCuttingPhysicsExtEngine.js";

describe("AdvancedCuttingPhysicsExtEngine", () => {
  // ── BUE Tests ──────────────────────────────────────────────────

  describe("predictBUE", () => {
    it("1: high BUE probability at low speed (30 m/min) for steel", () => {
      const r = engine.predictBUE({
        cutting_speed_mpm: 30,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 200,
        material_type: "steel",
      });
      expect(r.bue_probability).toBeGreaterThan(0.3);
      expect(r.bue_height_mm).toBeGreaterThan(0);
    });

    it("2: BUE probability near zero at high speed (200 m/min)", () => {
      const r = engine.predictBUE({
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 200,
        material_type: "steel",
      });
      expect(r.bue_probability).toBeLessThan(0.05);
      expect(r.bue_height_mm).toBeLessThan(0.001);
    });

    it("3: TiN coating reduces BUE height vs uncoated", () => {
      const base = {
        cutting_speed_mpm: 40,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 200,
        material_type: "steel" as const,
      };
      const uncoated = engine.predictBUE({ ...base, tool_coating: "uncoated" });
      const coated = engine.predictBUE({ ...base, tool_coating: "TiN" });
      expect(coated.bue_height_mm).toBeLessThan(uncoated.bue_height_mm);
    });

    it("6: force modification factor < 1 (BUE increases effective rake)", () => {
      const r = engine.predictBUE({
        cutting_speed_mpm: 40,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 180,
        material_type: "steel",
      });
      expect(r.force_modification_factor).toBeLessThan(1);
    });

    it("7: Ra degradation factor > 1 when BUE present", () => {
      const r = engine.predictBUE({
        cutting_speed_mpm: 40,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 180,
        material_type: "steel",
      });
      expect(r.ra_degradation_factor).toBeGreaterThan(1);
    });
  });

  describe("bueSpeedMap", () => {
    it("4: identifies correct BUE zone", () => {
      const r = engine.bueSpeedMap({
        speed_range: [10, 200],
        n_points: 20,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 200,
        material_type: "steel",
      });
      expect(r.bue_zone[0]).toBeLessThan(50);
      expect(r.bue_zone[1]).toBeGreaterThan(30);
      expect(r.optimal_speed_mpm).toBeGreaterThan(r.bue_zone[1]);
    });

    it("5: aluminum shows wider BUE zone than steel", () => {
      const base = {
        speed_range: [10, 200] as [number, number],
        n_points: 20,
        feed_mm_rev: 0.2,
        rake_angle_deg: 6,
        material_hardness_HB: 100,
      };
      const steel = engine.bueSpeedMap({
        ...base, material_type: "steel",
        material_hardness_HB: 200,
      });
      const alum = engine.bueSpeedMap({
        ...base, material_type: "aluminum",
      });
      const steelWidth = steel.bue_zone[1] - steel.bue_zone[0];
      const alumWidth = alum.bue_zone[1] - alum.bue_zone[0];
      expect(alumWidth).toBeGreaterThan(steelWidth);
    });
  });

  // ── Usui Crater Wear Tests ────────────────────────────────────

  describe("usaiCraterWear", () => {
    const baseUsui = {
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2,
      material_type: "steel" as const,
      tool_material: "carbide" as const,
      cutting_time_min: 10,
    };

    it("8: crater depth increases with cutting time (monotonic)", () => {
      const r5 = engine.usaiCraterWear({ ...baseUsui, cutting_time_min: 5 });
      const r10 = engine.usaiCraterWear({ ...baseUsui, cutting_time_min: 10 });
      const r20 = engine.usaiCraterWear({ ...baseUsui, cutting_time_min: 20 });
      expect(r10.crater_depth_KT_mm).toBeGreaterThan(r5.crater_depth_KT_mm);
      expect(r20.crater_depth_KT_mm).toBeGreaterThan(r10.crater_depth_KT_mm);
    });

    it("9: higher speed gives faster crater wear", () => {
      const slow = engine.usaiCraterWear({
        ...baseUsui, cutting_speed_mpm: 100,
      });
      const fast = engine.usaiCraterWear({
        ...baseUsui, cutting_speed_mpm: 300,
      });
      expect(fast.wear_rate_mm_per_min).toBeGreaterThan(
        slow.wear_rate_mm_per_min
      );
    });

    it("10: ceramic tool has lower crater rate than carbide", () => {
      const carbide = engine.usaiCraterWear({
        ...baseUsui, tool_material: "carbide",
      });
      const ceramic = engine.usaiCraterWear({
        ...baseUsui, tool_material: "ceramic",
      });
      expect(ceramic.wear_rate_mm_per_min).toBeLessThan(
        carbide.wear_rate_mm_per_min
      );
    });

    it("11: time to KT limit is positive and finite", () => {
      const r = engine.usaiCraterWear(baseUsui);
      expect(r.time_to_KT_limit_min).toBeGreaterThan(0);
      expect(r.time_to_KT_limit_min).toBeLessThan(1e6);
    });
  });

  describe("combinedWear", () => {
    it("12: identifies dominant mechanism correctly", () => {
      const r = engine.combinedWear({
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
        material_type: "steel",
        tool_material: "carbide",
        cutting_time_min: 15,
      });
      expect(["flank", "crater", "balanced"]).toContain(
        r.dominant_mechanism
      );
      expect(r.tool_life_min).toBeGreaterThan(0);
    });

    it("13: KT/VB ratio increases with speed (crater dominates at high speed)", () => {
      const lo = engine.combinedWear({
        cutting_speed_mpm: 100,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
        material_type: "steel",
        tool_material: "carbide",
        cutting_time_min: 10,
      });
      const hi = engine.combinedWear({
        cutting_speed_mpm: 300,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
        material_type: "steel",
        tool_material: "carbide",
        cutting_time_min: 10,
      });
      expect(hi.wear_ratio_kt_vb).toBeGreaterThan(lo.wear_ratio_kt_vb);
    });
  });

  // ── Brammertz Roughness Tests ─────────────────────────────────

  describe("brammertzRoughness", () => {
    const baseBram = {
      feed_mm_rev: 0.2,
      nose_radius_mm: 0.8,
      cutting_speed_mpm: 200,
      approach_angle_deg: 90,
      edge_radius_um: 20,
      material_hardness_HB: 220,
    };

    it("14: Ra_theoretical = f^2/(32*r) for classic formula", () => {
      const r = engine.brammertzRoughness(baseBram);
      const expected = (0.2 ** 2) / (32 * 0.8) * 1000; // um
      expect(r.ra_theoretical_um).toBeCloseTo(expected, 2);
    });

    it("15: Brammertz correction increases Ra at low feeds", () => {
      const r = engine.brammertzRoughness({
        ...baseBram, feed_mm_rev: 0.02,
      });
      expect(r.ra_brammertz_um).toBeGreaterThan(r.ra_theoretical_um);
    });

    it("16: speed correction significant below 50 m/min", () => {
      const fast = engine.brammertzRoughness({
        ...baseBram, cutting_speed_mpm: 200,
      });
      const slow = engine.brammertzRoughness({
        ...baseBram, cutting_speed_mpm: 30,
      });
      expect(slow.ra_with_speed_um).toBeGreaterThan(fast.ra_with_speed_um);
    });

    it("17: optimal feed exists (neither too low nor too high)", () => {
      const r = engine.brammertzRoughness(baseBram);
      expect(r.optimal_feed_mm_rev).toBeGreaterThan(0.01);
      expect(r.optimal_feed_mm_rev).toBeLessThan(0.5);
    });
  });

  describe("surfaceRoughnessDecomposition", () => {
    it("18: kinematic dominant at high feed", () => {
      const r = engine.surfaceRoughnessDecomposition({
        feed_mm_rev: 0.4,
        nose_radius_mm: 0.8,
        cutting_speed_mpm: 200,
        approach_angle_deg: 90,
        edge_radius_um: 20,
      });
      expect(r.dominant_factor).toBe("kinematic");
    });

    it("19: ploughing dominant at very low feed", () => {
      const r = engine.surfaceRoughnessDecomposition({
        feed_mm_rev: 0.01,
        nose_radius_mm: 0.8,
        cutting_speed_mpm: 200,
        approach_angle_deg: 90,
        edge_radius_um: 30,
      });
      expect(r.dominant_factor).toBe("ploughing");
    });

    it("20: larger edge radius increases ploughing component", () => {
      const small = engine.surfaceRoughnessDecomposition({
        feed_mm_rev: 0.1,
        nose_radius_mm: 0.8,
        cutting_speed_mpm: 200,
        approach_angle_deg: 90,
        edge_radius_um: 10,
      });
      const large = engine.surfaceRoughnessDecomposition({
        feed_mm_rev: 0.1,
        nose_radius_mm: 0.8,
        cutting_speed_mpm: 200,
        approach_angle_deg: 90,
        edge_radius_um: 50,
      });
      expect(large.components.ploughing).toBeGreaterThan(
        small.components.ploughing
      );
    });
  });

  // ── Colding Tool Life Tests ───────────────────────────────────

  describe("coldingToolLife", () => {
    const baseColding = {
      operation: "turning" as const,
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      approach_angle_deg: 90,
      material_type: "steel" as const,
      hardness_HB: 200,
    };

    it("21: predicts finite positive tool life", () => {
      const r = engine.coldingToolLife(baseColding);
      expect(r.tool_life_min).toBeGreaterThan(0);
      expect(r.tool_life_min).toBeLessThan(1e6);
    });

    it("22: equivalent chip thickness correct for turning", () => {
      const r = engine.coldingToolLife(baseColding);
      // h_eq = f * sin(kappa) = 0.2 * sin(90deg) = 0.2
      expect(r.equivalent_chip_thickness_mm).toBeCloseTo(0.2, 3);
    });

    it("23: higher speed gives shorter life (monotonic)", () => {
      const slow = engine.coldingToolLife({
        ...baseColding, cutting_speed_mpm: 100,
      });
      const fast = engine.coldingToolLife({
        ...baseColding, cutting_speed_mpm: 300,
      });
      expect(fast.tool_life_min).toBeLessThan(slow.tool_life_min);
    });

    it("24: Colding vs Taylor agree within 20% in mid-range", () => {
      const r = engine.coldingToolLife({
        ...baseColding, cutting_speed_mpm: 180,
      });
      expect(r.colding_vs_taylor_error_pct).toBeLessThan(20);
    });

    it("25: speed has highest sensitivity", () => {
      const r = engine.coldingToolLife(baseColding);
      expect(r.sensitivity.to_speed).toBeGreaterThan(r.sensitivity.to_feed);
      expect(r.sensitivity.to_speed).toBeGreaterThan(r.sensitivity.to_depth);
    });
  });

  describe("compareTaylorColding", () => {
    it("26: returns both model curves with correct lengths", () => {
      const r = engine.compareTaylorColding({
        speed_range: [80, 300],
        n_points: 10,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        material_type: "steel",
        hardness_HB: 200,
      });
      expect(r.models).toHaveLength(2);
      expect(r.models[0].tool_life_curve).toHaveLength(10);
      expect(r.models[1].tool_life_curve).toHaveLength(10);
      expect(r.models[0].model_name).toContain("Taylor");
      expect(r.models[1].model_name).toContain("Colding");
    });

    it("27: tool life decreases with speed for both models", () => {
      const r = engine.compareTaylorColding({
        speed_range: [80, 300],
        n_points: 5,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        material_type: "steel",
        hardness_HB: 200,
      });
      for (const model of r.models) {
        const curve = model.tool_life_curve;
        for (let i = 1; i < curve.length; i++) {
          expect(curve[i].life).toBeLessThan(curve[i - 1].life);
        }
      }
    });
  });
});
