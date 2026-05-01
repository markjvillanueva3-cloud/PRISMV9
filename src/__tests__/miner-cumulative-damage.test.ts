/**
 * Tests for MinerCumulativeDamageEngine
 *
 * Covers: Palmgren-Miner rule, Basquin S-N curve, Marin factors,
 * tool fatigue, machine component fatigue, sequence effects, rainflow counting.
 */

import { describe, it, expect } from "vitest";
import { minerCumulativeDamageEngine } from "../engines/MinerCumulativeDamageEngine.js";

describe("MinerCumulativeDamageEngine", () => {
  // =========================================================================
  // Basic Miner's Rule
  // =========================================================================

  describe("calculateCumulativeDamage", () => {
    it("D=0.5+0.5=1.0 → failure predicted", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 300, cycles_applied: 50000, cycles_to_failure: 100000 },
          { stress_amplitude: 250, cycles_applied: 100000, cycles_to_failure: 200000 },
        ],
      });
      expect(result.total_damage_D).toBeCloseTo(1.0, 6);
      expect(result.predicted_failure).toBe(true);
      expect(result.safety_factor).toBeCloseTo(1.0, 6);
    });

    it("D=0.3+0.3=0.6 → no failure, remaining life = 0.4", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 300, cycles_applied: 30000, cycles_to_failure: 100000 },
          { stress_amplitude: 250, cycles_applied: 60000, cycles_to_failure: 200000 },
        ],
      });
      expect(result.total_damage_D).toBeCloseTo(0.6, 6);
      expect(result.predicted_failure).toBe(false);
      expect(result.remaining_life_fraction).toBeCloseTo(0.4, 6);
      expect(result.safety_factor).toBeCloseTo(1 / 0.6, 4);
    });

    it("single stress level: n/N=0.7 → D=0.7", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 400, cycles_applied: 70000, cycles_to_failure: 100000 },
        ],
      });
      expect(result.total_damage_D).toBeCloseTo(0.7, 6);
      expect(result.predicted_failure).toBe(false);
      expect(result.dominant_stress_level).toBe(400);
    });

    it("zero cycles → D=0", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 300, cycles_applied: 0, cycles_to_failure: 100000 },
        ],
      });
      expect(result.total_damage_D).toBe(0);
      expect(result.predicted_failure).toBe(false);
      expect(result.remaining_life_fraction).toBe(1.0);
    });

    it("empty stress_levels → D=0", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [],
      });
      expect(result.total_damage_D).toBe(0);
      expect(result.safety_factor).toBe(Infinity);
    });

    it("multiple stress levels summing to exactly 1.0", () => {
      const result = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 400, cycles_applied: 25000, cycles_to_failure: 100000 }, // 0.25
          { stress_amplitude: 350, cycles_applied: 37500, cycles_to_failure: 150000 }, // 0.25
          { stress_amplitude: 300, cycles_applied: 100000, cycles_to_failure: 200000 }, // 0.50
        ],
      });
      expect(result.total_damage_D).toBeCloseTo(1.0, 6);
      expect(result.predicted_failure).toBe(true);
      expect(result.dominant_stress_level).toBe(300); // highest individual damage
    });
  });

  // =========================================================================
  // S-N Curve / Basquin
  // =========================================================================

  describe("buildSNcurve", () => {
    it("steel Sut=600MPa → Se≈300MPa", () => {
      const result = minerCumulativeDamageEngine.buildSNcurve({ Sut_MPa: 600 });
      expect(result.endurance_limit).toBeCloseTo(300, 0);
    });

    it("Basquin equation: verify σa at known Nf", () => {
      // Use a high stress that is well above endurance limit to test round-trip
      const result = minerCumulativeDamageEngine.buildSNcurve({
        Sut_MPa: 600,
        sigma_f_prime: 945,
        basquin_b: -0.085,
      });
      // At Nf=1000: σa = 945 × (2×1000)^(-0.085)
      const expected_sigma = 945 * Math.pow(2000, -0.085);
      // This should be well above Se≈300 MPa
      expect(expected_sigma).toBeGreaterThan(result.corrected_endurance_limit);
      const Nf_computed = result.cycles_to_failure_fn(expected_sigma);
      // Should give back ~1000
      expect(Nf_computed).toBeCloseTo(1000, -1); // within ~10
    });

    it("Marin surface finish reduces Se", () => {
      const base = minerCumulativeDamageEngine.buildSNcurve({ Sut_MPa: 600 });
      const with_finish = minerCumulativeDamageEngine.buildSNcurve(
        { Sut_MPa: 600 },
        { surface_finish: "hot_rolled", Sut_MPa: 600 }
      );
      expect(with_finish.corrected_endurance_limit).toBeLessThan(base.corrected_endurance_limit);
      expect(with_finish.marin_factors.ka).toBeLessThan(1.0);
    });

    it("size factor: larger diameter → lower kb", () => {
      const small = minerCumulativeDamageEngine.buildSNcurve(
        { Sut_MPa: 600 },
        { surface_finish: "ground", Sut_MPa: 600, diameter_mm: 10 }
      );
      const large = minerCumulativeDamageEngine.buildSNcurve(
        { Sut_MPa: 600 },
        { surface_finish: "ground", Sut_MPa: 600, diameter_mm: 50 }
      );
      expect(large.marin_factors.kb).toBeLessThan(small.marin_factors.kb);
    });

    it("reliability factor: 99% < 90%", () => {
      const r90 = minerCumulativeDamageEngine.buildSNcurve(
        { Sut_MPa: 600 },
        { surface_finish: "ground", Sut_MPa: 600, reliability: 0.9 }
      );
      const r99 = minerCumulativeDamageEngine.buildSNcurve(
        { Sut_MPa: 600 },
        { surface_finish: "ground", Sut_MPa: 600, reliability: 0.99 }
      );
      expect(r99.marin_factors.kc).toBeLessThan(r90.marin_factors.kc);
      expect(r99.corrected_endurance_limit).toBeLessThan(r90.corrected_endurance_limit);
    });

    it("stress below endurance limit → infinite life (D=0)", () => {
      const result = minerCumulativeDamageEngine.buildSNcurve({ Sut_MPa: 600 });
      // 100 MPa is well below Se≈300 MPa
      const Nf = result.cycles_to_failure_fn(100);
      expect(Nf).toBe(Infinity);

      // Confirm via cumulative damage
      const damage = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [{ stress_amplitude: 100, cycles_applied: 1e9 }],
        sn_curve: result.sn_curve,
      });
      expect(damage.total_damage_D).toBe(0);
    });

    it("very high stress → few cycles to failure", () => {
      const result = minerCumulativeDamageEngine.buildSNcurve({
        Sut_MPa: 600,
        sigma_f_prime: 945,
        basquin_b: -0.085,
      });
      // Stress near σf' should give very few cycles
      const Nf = result.cycles_to_failure_fn(900);
      expect(Nf).toBeLessThan(1000);
      expect(Nf).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Tool Fatigue Damage
  // =========================================================================

  describe("calculateToolFatigueDamage", () => {
    it("3 mixed operations: verify cumulative damage", () => {
      const result = minerCumulativeDamageEngine.calculateToolFatigueDamage({
        operations: [
          { material: "steel", cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 2, duration_minutes: 10 },
          { material: "aluminum", cutting_speed_m_min: 400, feed_mm_rev: 0.3, depth_of_cut_mm: 3, duration_minutes: 5 },
          { material: "titanium", cutting_speed_m_min: 60, feed_mm_rev: 0.1, depth_of_cut_mm: 1, duration_minutes: 15 },
        ],
      });
      expect(result.operations_damage).toHaveLength(3);
      expect(result.total_damage_D).toBeGreaterThan(0);
      // Each operation should contribute positive damage
      for (const op of result.operations_damage) {
        expect(op.damage_fraction).toBeGreaterThan(0);
        expect(op.taylor_life_minutes).toBeGreaterThan(0);
        expect(op.equivalent_stress_MPa).toBeGreaterThan(0);
      }
      // Damage fractions should sum to total
      const sum = result.operations_damage.reduce((s, o) => s + o.damage_fraction, 0);
      expect(sum).toBeCloseTo(result.total_damage_D, 6);
    });
  });

  // =========================================================================
  // Machine Fatigue Damage
  // =========================================================================

  describe("calculateMachineFatigueDamage", () => {
    it("bearing L10: C/P=5 → known result", () => {
      // L10 = (C/P)^3 × 10^6 = 125 × 10^6 = 1.25e8 revolutions
      // At 1000 rpm → life = 1.25e8 / (1000 × 60) = 2083.3 hours
      const result = minerCumulativeDamageEngine.calculateMachineFatigueDamage([
        {
          component: "bearing",
          load_N: 10000,
          speed_rpm: 1000,
          duration_hours: 100,
          bearing_C_rating: 50000,
          bearing_type: "ball",
        },
      ]);

      const bearingComp = result.components.bearing;
      expect(bearingComp).toBeDefined();
      const life = bearingComp.load_cases[0].life_hours;
      expect(life).toBeCloseTo(2083.33, 0);
      expect(bearingComp.total_damage_D).toBeCloseTo(100 / 2083.33, 3);
      expect(bearingComp.predicted_failure).toBe(false);
    });

    it("identifies most critical component", () => {
      const result = minerCumulativeDamageEngine.calculateMachineFatigueDamage([
        {
          component: "bearing",
          load_N: 10000,
          speed_rpm: 1000,
          duration_hours: 100,
          bearing_C_rating: 50000,
          bearing_type: "ball",
        },
        {
          component: "ballscrew",
          load_N: 40000,
          speed_rpm: 1000,
          duration_hours: 100,
          ballscrew_Ca: 80000,
        },
      ]);
      // Both should have damage; the one with higher D is most critical
      expect(result.most_critical_component).toBeDefined();
      expect(result.overall_damage).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Sequence Effects
  // =========================================================================

  describe("calculateSequenceEffect", () => {
    it("high→low loading: D_failure < 1.0 (damage accelerated)", () => {
      const result = minerCumulativeDamageEngine.calculateSequenceEffect({
        stress_levels: [
          { stress_amplitude: 400, cycles_applied: 30000, cycles_to_failure: 100000 },
          { stress_amplitude: 200, cycles_applied: 60000, cycles_to_failure: 200000 },
        ],
        loading_order: "high_to_low",
      });
      expect(result.predicted_D_at_failure).toBeLessThan(1.0);
      expect(result.linear_damage_D).toBeCloseTo(0.6, 6);
    });

    it("low→high loading: D_failure > 1.0 (beneficial)", () => {
      const result = minerCumulativeDamageEngine.calculateSequenceEffect({
        stress_levels: [
          { stress_amplitude: 200, cycles_applied: 60000, cycles_to_failure: 200000 },
          { stress_amplitude: 400, cycles_applied: 30000, cycles_to_failure: 100000 },
        ],
        loading_order: "low_to_high",
      });
      expect(result.predicted_D_at_failure).toBeGreaterThan(1.0);
      expect(result.linear_damage_D).toBeCloseTo(0.6, 6);
    });
  });

  // =========================================================================
  // Rainflow Damage
  // =========================================================================

  describe("calculateRainflowDamage", () => {
    it("simple load history: known cycle count", () => {
      // Simple symmetric loading: should extract recognizable cycles
      const loadHistory = [0, 100, -50, 80, -30, 60, 0];
      const result = minerCumulativeDamageEngine.calculateRainflowDamage({
        load_history: loadHistory,
        sn_curve: { sigma_f_prime: 945, basquin_b: -0.085, endurance_limit: 50 },
      });
      expect(result.cycles_counted.length).toBeGreaterThan(0);
      expect(result.total_damage).toBeGreaterThan(0);
      // Total count should be reasonable for this history
      const totalCount = result.cycles_counted.reduce((s, c) => s + c.count, 0);
      expect(totalCount).toBeGreaterThan(0);
      expect(totalCount).toBeLessThanOrEqual(loadHistory.length);
    });

    it("Goodman correction: mean stress reduces allowable amplitude", () => {
      const loadHistory = [0, 300, 100, 300, 100, 300, 0];
      const sn = { sigma_f_prime: 945, basquin_b: -0.085, endurance_limit: 50 };

      const without = minerCumulativeDamageEngine.calculateRainflowDamage({
        load_history: loadHistory,
        sn_curve: sn,
        use_goodman: false,
      });
      const withGoodman = minerCumulativeDamageEngine.calculateRainflowDamage({
        load_history: loadHistory,
        sn_curve: sn,
        Sut_MPa: 600,
        use_goodman: true,
      });
      // Goodman correction with positive mean stress should increase damage
      expect(withGoodman.total_damage).toBeGreaterThanOrEqual(without.total_damage);
    });
  });

  // =========================================================================
  // Integration: S-N curve fed into cumulative damage
  // =========================================================================

  describe("integration", () => {
    it("S-N curve used to compute Ni in cumulative damage", () => {
      const snResult = minerCumulativeDamageEngine.buildSNcurve({
        Sut_MPa: 600,
        sigma_f_prime: 945,
        basquin_b: -0.085,
      });

      const damage = minerCumulativeDamageEngine.calculateCumulativeDamage({
        stress_levels: [
          { stress_amplitude: 400, cycles_applied: 10000 },
          { stress_amplitude: 350, cycles_applied: 50000 },
        ],
        sn_curve: snResult.sn_curve,
      });

      expect(damage.total_damage_D).toBeGreaterThan(0);
      expect(damage.damage_per_level).toHaveLength(2);
      // Both levels are above Se so both contribute damage
      for (const level of damage.damage_per_level) {
        expect(level.cycles_to_failure).toBeGreaterThan(0);
        expect(level.cycles_to_failure).toBeLessThan(Infinity);
        expect(level.damage_fraction).toBeGreaterThan(0);
      }
    });
  });
});
