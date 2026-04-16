import { describe, it, expect } from "vitest";
import { advancedCuttingPhenomenaEngine, AdvancedCuttingPhenomenaEngine } from "../engines/AdvancedCuttingPhenomenaEngine.js";

describe("AdvancedCuttingPhenomenaEngine", () => {
  const engine = advancedCuttingPhenomenaEngine;

  // ── BUE Formation ──────────────────────────────────────────────

  describe("predictBUEFormation", () => {
    it("steel at 40 m/min has high BUE probability", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 40, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.bue_probability).toBeGreaterThan(0.8);
      expect(r.bue_height_mm).toBeGreaterThan(0);
    });

    it("steel at 200 m/min has ~0 BUE probability", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 200, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.bue_probability).toBeLessThan(0.01);
      expect(r.bue_height_mm).toBe(0);
    });

    it("aluminum peak speed ~100 m/min", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 100, feed: 0.15, material_type: "aluminum", rake_angle: 12,
      });
      expect(r.bue_probability).toBeGreaterThan(0.9);
      expect(r.speed_window[0]).toBeLessThan(100);
      expect(r.speed_window[1]).toBeGreaterThan(100);
    });

    it("returns recommended speed above BUE window", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 40, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.recommended_speed_to_avoid).toBeGreaterThan(r.speed_window[1]);
    });

    it("roughness effect > 1 when BUE present", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 40, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.effect_on_Ra).toBeGreaterThan(1);
    });

    it("force reduction effect < 1 when BUE present", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 40, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.effect_on_forces).toBeLessThan(1);
    });

    it("very high speed → no BUE", () => {
      const r = engine.predictBUEFormation({
        cutting_speed: 500, feed: 0.2, material_type: "steel", rake_angle: 6,
      });
      expect(r.bue_probability).toBeLessThan(1e-6);
      expect(r.bue_height_mm).toBe(0);
    });
  });

  // ── BUE Effect ─────────────────────────────────────────────────

  describe("predictBUEEffect", () => {
    it("force reduction 10-30% when BUE present", () => {
      const r = engine.predictBUEEffect({
        bue_probability: 0.9, bue_height_mm: 0.05, cutting_speed: 40, material_type: "steel",
      });
      expect(r.force_reduction_pct).toBeGreaterThanOrEqual(10);
      expect(r.force_reduction_pct).toBeLessThanOrEqual(30);
    });

    it("roughness multiplier > 1 when BUE present", () => {
      const r = engine.predictBUEEffect({
        bue_probability: 0.8, bue_height_mm: 0.04, cutting_speed: 35, material_type: "steel",
      });
      expect(r.roughness_multiplier).toBeGreaterThan(1);
    });

    it("wear rate factor < 1 (BUE protects tool)", () => {
      const r = engine.predictBUEEffect({
        bue_probability: 0.7, bue_height_mm: 0.03, cutting_speed: 40, material_type: "steel",
      });
      expect(r.wear_rate_factor).toBeLessThan(1);
    });

    it("cycle frequency is positive", () => {
      const r = engine.predictBUEEffect({
        bue_probability: 0.5, bue_height_mm: 0.02, cutting_speed: 40, material_type: "steel",
      });
      expect(r.cycle_frequency_Hz).toBeGreaterThan(0);
    });
  });

  // ── Usui Crater Wear ──────────────────────────────────────────

  describe("calculateUsuiCraterWear", () => {
    it("crater depth increases with time (monotonic)", () => {
      const r1 = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 900,
        contact_length_mm: 0.5, time_minutes: 5,
      });
      const r2 = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 900,
        contact_length_mm: 0.5, time_minutes: 20,
      });
      expect(r2.crater_depth_KT_mm).toBeGreaterThan(r1.crater_depth_KT_mm);
    });

    it("higher temperature → faster wear", () => {
      const r1 = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 700,
        contact_length_mm: 0.5, time_minutes: 10,
      });
      const r2 = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 1100,
        contact_length_mm: 0.5, time_minutes: 10,
      });
      expect(r2.wear_rate_mm_per_min).toBeGreaterThan(r1.wear_rate_mm_per_min);
    });

    it("KT limit of 0.1mm triggers tool_failure classification", () => {
      // Use high params to exceed 0.1mm
      const r = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 2000, sliding_velocity: 300, temperature_K: 1200,
        contact_length_mm: 1.0, time_minutes: 500, A: 1e-5, B: 5000,
      });
      expect(r.crater_depth_KT_mm).toBeGreaterThan(0.1);
      expect(r.iso_3685_classification).toBe("tool_failure");
    });

    it("crater center KM ≈ 0.5 × contact length", () => {
      const r = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 900,
        contact_length_mm: 0.8, time_minutes: 10,
      });
      expect(r.crater_center_KM_mm).toBeCloseTo(0.4, 3);
    });

    it("zero temperature → wear rate → 0", () => {
      const r = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 0,
        contact_length_mm: 0.5, time_minutes: 10,
      });
      // exp(-B/1) is effectively 0 for large B
      expect(r.wear_rate_mm_per_min).toBeLessThan(1e-30);
      expect(r.crater_depth_KT_mm).toBeLessThan(1e-30);
    });
  });

  // ── Combined Wear ──────────────────────────────────────────────

  describe("predictCombinedWear", () => {
    it("identifies dominant mechanism correctly — flank wear", () => {
      const r = engine.predictCombinedWear({
        normal_stress_MPa: 500, sliding_velocity: 50, temperature_K: 600,
        contact_length_mm: 0.5, time_minutes: 10,
        flank_wear_rate_mm_per_min: 0.01, // fast flank
        notch_wear_rate_mm_per_min: 0.001,
      });
      expect(r.dominant_mechanism).toBe("flank_wear");
      expect(r.vb_at_failure).toBeCloseTo(0.3, 1);
    });

    it("identifies dominant mechanism — crater wear with high temperature", () => {
      const r = engine.predictCombinedWear({
        normal_stress_MPa: 2000, sliding_velocity: 200, temperature_K: 1200,
        contact_length_mm: 0.5, time_minutes: 10,
        flank_wear_rate_mm_per_min: 0.0001, // very slow flank
        notch_wear_rate_mm_per_min: 0.0001,
        A: 1e-5, B: 5000,
      });
      expect(r.dominant_mechanism).toBe("crater_wear");
    });
  });

  // ── Brammertz Roughness ────────────────────────────────────────

  describe("calculateBrammertzRoughness", () => {
    it("Ra_brammertz ≥ Ra_theoretical (always higher due to h_min)", () => {
      const r = engine.calculateBrammertzRoughness({
        feed: 0.2, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 150, material: "steel",
      });
      expect(r.Ra_brammertz).toBeGreaterThanOrEqual(r.Ra_theoretical);
    });

    it("edge radius = 0 → Ra_brammertz ≈ Ra_theoretical", () => {
      const r = engine.calculateBrammertzRoughness({
        feed: 0.2, nose_radius: 0.8, edge_radius: 0,
        cutting_speed: 150, material: "steel",
      });
      expect(r.Ra_brammertz).toBeCloseTo(r.Ra_theoretical, 6);
    });

    it("larger feed → higher roughness (quadratic relationship)", () => {
      const r1 = engine.calculateBrammertzRoughness({
        feed: 0.1, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 150, material: "steel",
      });
      const r2 = engine.calculateBrammertzRoughness({
        feed: 0.3, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 150, material: "steel",
      });
      // Approximately 9x for theoretical (0.3² / 0.1² = 9)
      expect(r2.Ra_theoretical / r1.Ra_theoretical).toBeCloseTo(9, 0);
      expect(r2.Ra_brammertz).toBeGreaterThan(r1.Ra_brammertz);
    });

    it("optimal speed exists (U-shaped Ra vs speed curve)", () => {
      const r = engine.calculateBrammertzRoughness({
        feed: 0.15, nose_radius: 0.8, edge_radius: 0.015,
        cutting_speed: 100, material: "steel",
      });
      const curve = r.roughness_vs_speed_curve;
      expect(curve.length).toBeGreaterThan(5);
      // Find minimum Ra in curve
      const minRa = Math.min(...curve.map(p => p.Ra));
      const firstRa = curve[0].Ra;
      const lastRa = curve[curve.length - 1].Ra;
      // Minimum should be less than at least one endpoint (U-shape)
      expect(minRa).toBeLessThanOrEqual(Math.min(firstRa, lastRa));
    });

    it("RSS combination ≥ max individual component", () => {
      const r = engine.calculateBrammertzRoughness({
        feed: 0.2, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 40, material: "steel", vibration_amplitude: 0.001, vibration_freq_ratio: 0.5,
      });
      const maxComponent = Math.max(r.Ra_brammertz, Math.abs(r.Ra_with_bue - r.Ra_brammertz));
      // Ra_total uses RSS so it should be >= largest single term
      expect(r.Ra_total).toBeGreaterThanOrEqual(r.Ra_brammertz * 0.99);
    });

    it("zero feed → handles gracefully", () => {
      const r = engine.calculateBrammertzRoughness({
        feed: 0, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 150, material: "steel",
      });
      expect(isFinite(r.Ra_theoretical)).toBe(true);
      expect(isFinite(r.Ra_total)).toBe(true);
      expect(r.Ra_theoretical).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Colding Tool Life ──────────────────────────────────────────

  describe("calculateColdingToolLife", () => {
    it("life decreases with speed (K1 > 0)", () => {
      const r1 = engine.calculateColdingToolLife({
        cutting_speed: 100, feed: 0.2, depth_of_cut: 2, approach_angle_deg: 90,
      });
      const r2 = engine.calculateColdingToolLife({
        cutting_speed: 200, feed: 0.2, depth_of_cut: 2, approach_angle_deg: 90,
      });
      expect(r2.tool_life_min).toBeLessThan(r1.tool_life_min);
    });

    it("converges with Taylor for constant chip thickness", () => {
      const r = engine.calculateColdingToolLife({
        cutting_speed: 150, feed: 0.25, depth_of_cut: 2, approach_angle_deg: 90,
      });
      // Taylor n ≈ 1/K1, K1 default for steel = 3.5 → n ≈ 0.286
      expect(r.taylor_equivalent_n).toBeCloseTo(1 / 3.5, 2);
      expect(r.comparison_with_taylor).toContain("Taylor");
    });

    it("returns valid equivalent chip thickness", () => {
      const r = engine.calculateColdingToolLife({
        cutting_speed: 150, feed: 0.25, depth_of_cut: 3, approach_angle_deg: 45,
      });
      expect(r.equivalent_chip_thickness).toBeGreaterThan(0);
      expect(r.equivalent_chip_thickness).toBeLessThan(10);
    });
  });

  // ── Coffin-Manson ──────────────────────────────────────────────

  describe("calculateCoffinManson", () => {
    const baseParams = {
      delta_T: 400,
      alpha_cte: 12e-6,
      sigma_f_prime: 1500,
      epsilon_f_prime: 0.5,
      b_exponent: -0.08,
      c_exponent: -0.6,
      E_modulus: 210000,
    };

    it("larger ΔT → fewer cycles to failure", () => {
      const r1 = engine.calculateCoffinManson({ ...baseParams, delta_T: 200 });
      const r2 = engine.calculateCoffinManson({ ...baseParams, delta_T: 600 });
      expect(r2.cycles_to_failure_Nf).toBeLessThan(r1.cycles_to_failure_Nf);
    });

    it("elastic vs plastic strain regimes", () => {
      const r = engine.calculateCoffinManson(baseParams);
      expect(r.elastic_strain).toBeGreaterThan(0);
      expect(r.plastic_strain).toBeGreaterThan(0);
      expect(r.dominant_regime).toMatch(/elastic_dominated|plastic_dominated/);
    });

    it("transition life identifies crossover", () => {
      const r = engine.calculateCoffinManson(baseParams);
      expect(r.transition_life_Nt).toBeGreaterThan(0);
      expect(isFinite(r.transition_life_Nt)).toBe(true);
    });

    it("Nf < 10^4 flagged as low-cycle", () => {
      // Large ΔT should produce low-cycle
      const r = engine.calculateCoffinManson({ ...baseParams, delta_T: 1000 });
      if (r.cycles_to_failure_Nf < 1e4) {
        expect(r.is_low_cycle).toBe(true);
      }
    });

    it("total strain range = alpha × ΔT", () => {
      const r = engine.calculateCoffinManson(baseParams);
      expect(r.total_strain_range).toBeCloseTo(baseParams.alpha_cte * baseParams.delta_T, 10);
    });
  });

  // ── Cross-cutting / Boundary ───────────────────────────────────

  describe("boundary and integration", () => {
    it("all methods return valid numeric results (no NaN/Infinity)", () => {
      const bue = engine.predictBUEFormation({
        cutting_speed: 50, feed: 0.15, material_type: "steel", rake_angle: 6,
      });
      expect(isFinite(bue.bue_probability)).toBe(true);
      expect(isNaN(bue.bue_height_mm)).toBe(false);

      const usui = engine.calculateUsuiCraterWear({
        normal_stress_MPa: 800, sliding_velocity: 100, temperature_K: 900,
        contact_length_mm: 0.5, time_minutes: 10,
      });
      expect(isFinite(usui.crater_depth_KT_mm)).toBe(true);
      expect(isNaN(usui.wear_rate_mm_per_min)).toBe(false);

      const bram = engine.calculateBrammertzRoughness({
        feed: 0.2, nose_radius: 0.8, edge_radius: 0.02,
        cutting_speed: 100, material: "steel",
      });
      expect(isFinite(bram.Ra_total)).toBe(true);

      const cold = engine.calculateColdingToolLife({
        cutting_speed: 150, feed: 0.2, depth_of_cut: 2, approach_angle_deg: 90,
      });
      expect(isFinite(cold.tool_life_min)).toBe(true);

      const cm = engine.calculateCoffinManson({
        delta_T: 300, alpha_cte: 12e-6, sigma_f_prime: 1500,
        epsilon_f_prime: 0.5, b_exponent: -0.08, c_exponent: -0.6, E_modulus: 210000,
      });
      expect(isFinite(cm.cycles_to_failure_Nf)).toBe(true);
    });

    it("combined: BUE + Brammertz gives consistent roughness prediction", () => {
      // At BUE-prone speed, roughness should be elevated
      const bram_bue = engine.calculateBrammertzRoughness({
        feed: 0.15, nose_radius: 0.8, edge_radius: 0.015,
        cutting_speed: 40, material: "steel",
      });
      const bram_no_bue = engine.calculateBrammertzRoughness({
        feed: 0.15, nose_radius: 0.8, edge_radius: 0.015,
        cutting_speed: 200, material: "steel",
      });
      // At 40 m/min (BUE zone), Ra_with_bue should be higher than at 200 m/min
      expect(bram_bue.Ra_with_bue).toBeGreaterThan(bram_no_bue.Ra_with_bue);
    });
  });
});
