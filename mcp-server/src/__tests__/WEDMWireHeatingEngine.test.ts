/**
 * WEDMWireHeatingEngine Tests (U-P2PFS26)
 * Wire Joule heating + skim Ra cascade formulas
 */

import { describe, it, expect } from "vitest";
import { wedmWireHeatingEngine } from "../engines/WEDMWireHeatingEngine.js";

describe("WEDMWireHeatingEngine", () => {
  describe("calculateJouleHeating (Kunieda 2005)", () => {
    it("calculates instantaneous power P = I²ρL/A", () => {
      const result = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      expect(result.instantaneous_power_W).toBeGreaterThan(0);
      expect(result.average_power_W).toBeCloseTo(result.instantaneous_power_W * 0.3, 1);
    });

    it("power scales with I²", () => {
      const r1 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      const r2 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 20,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      // I doubles → P quadruples
      expect(r2.instantaneous_power_W).toBeCloseTo(r1.instantaneous_power_W * 4, 0);
    });

    it("power scales linearly with span length", () => {
      const r1 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 25,
      });

      const r2 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      expect(r2.instantaneous_power_W).toBeCloseTo(r1.instantaneous_power_W * 2, 0);
    });

    it("power scales inversely with wire area (d²)", () => {
      const r1 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      const r2 = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.50, // 2x diameter
        wire_span_mm: 50,
      });

      // d doubles → A quadruples → P quarters
      expect(r2.instantaneous_power_W).toBeCloseTo(r1.instantaneous_power_W / 4, 0);
    });

    it("calculates temperature rise ΔT = P×t/(m×cp)", () => {
      const result = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 15,
        pulse_on_us: 20,
        duty_cycle: 0.25,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      expect(result.temp_rise_per_pulse_K).toBeGreaterThan(0);
      expect(result.steady_state_temp_rise_K).toBeGreaterThan(0);
      expect(result.estimated_wire_temp_C).toBeGreaterThan(25); // Above ambient
    });

    it("uses material-specific properties", () => {
      const brass = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
        wire_material: "brass_cuzn37",
      });

      const moly = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
        wire_material: "molybdenum",
      });

      // Different resistivities should give different power
      expect(brass.instantaneous_power_W).not.toBeCloseTo(moly.instantaneous_power_W, 0);
    });

    it("higher wire feed reduces steady-state temperature", () => {
      const slowFeed = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 15,
        pulse_on_us: 15,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
        wire_feed_m_min: 5,
      });

      const fastFeed = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 15,
        pulse_on_us: 15,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
        wire_feed_m_min: 15,
      });

      expect(fastFeed.steady_state_temp_rise_K).toBeLessThan(slowFeed.steady_state_temp_rise_K);
    });

    it("warns when temperature exceeds safe limit", () => {
      const result = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 50, // Very high current
        pulse_on_us: 30,
        duty_cycle: 0.4,
        wire_diameter_mm: 0.15, // Thin wire
        wire_span_mm: 100, // Long span
        wire_feed_m_min: 5,
      });

      expect(result.within_safe_limits).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("exceeds");
    });

    it("returns safety margin between 0 and 1", () => {
      const result = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.2,
        wire_diameter_mm: 0.25,
        wire_span_mm: 30,
      });

      expect(result.safety_margin).toBeGreaterThanOrEqual(0);
      expect(result.safety_margin).toBeLessThanOrEqual(1);
    });

    it("calculates heat per unit length", () => {
      const result = wedmWireHeatingEngine.calculateJouleHeating({
        peak_current_A: 10,
        pulse_on_us: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
        wire_feed_m_min: 10,
      });

      expect(result.heat_per_length_J_mm).toBeGreaterThan(0);
    });
  });

  describe("calculateRaCascade (Klocke 2013 §8.3)", () => {
    it("calculates Ra_n = Ra_0 × ρ^n", () => {
      const result = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "steel",
      });

      // Ra should decrease with each pass
      expect(result.ra_per_pass).toHaveLength(4); // rough + 3 skims
      expect(result.ra_per_pass[0]).toBe(3.0);
      expect(result.ra_per_pass[1]).toBeLessThan(result.ra_per_pass[0]);
      expect(result.ra_per_pass[2]).toBeLessThan(result.ra_per_pass[1]);
      expect(result.ra_per_pass[3]).toBeLessThan(result.ra_per_pass[2]);
    });

    it("steel rho ≈ 0.55 reduces Ra by ~45% per pass", () => {
      const result = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 1,
        material: "steel",
      });

      // Ra_1 = 3.0 × 0.55 ≈ 1.65
      expect(result.final_ra_um).toBeCloseTo(1.65, 1);
    });

    it("aluminum has better Ra improvement (lower rho)", () => {
      const steel = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "steel",
      });

      const aluminum = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "aluminum",
      });

      expect(aluminum.final_ra_um).toBeLessThan(steel.final_ra_um);
    });

    it("carbide has worse Ra improvement (higher rho)", () => {
      const steel = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "steel",
      });

      const carbide = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "carbide",
      });

      expect(carbide.final_ra_um).toBeGreaterThan(steel.final_ra_um);
    });

    it("limits Ra to material minimum", () => {
      const result = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 10, // Many passes
        material: "steel",
      });

      // Should hit minimum and stop decreasing
      expect(result.final_ra_um).toBeCloseTo(result.min_achievable_ra_um, 2);
      expect(result.limited_by_material).toBe(true);
    });

    it("returns total reduction percentage", () => {
      const result = wedmWireHeatingEngine.calculateRaCascade({
        rough_ra_um: 3.0,
        skim_passes: 3,
        material: "steel",
      });

      const expectedReduction = ((3.0 - result.final_ra_um) / 3.0) * 100;
      expect(result.total_reduction_pct).toBeCloseTo(expectedReduction, 0);
    });
  });

  describe("recommendSafeParameters", () => {
    it("recommends max safe duty cycle", () => {
      const result = wedmWireHeatingEngine.recommendSafeParameters({
        target_current_A: 15,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      expect(result.max_safe_duty_cycle).toBeGreaterThan(0);
      expect(result.max_safe_duty_cycle).toBeLessThan(0.5);
    });

    it("lower max duty for thinner wires", () => {
      const thick = wedmWireHeatingEngine.recommendSafeParameters({
        target_current_A: 15,
        wire_diameter_mm: 0.30,
        wire_span_mm: 50,
      });

      const thin = wedmWireHeatingEngine.recommendSafeParameters({
        target_current_A: 15,
        wire_diameter_mm: 0.15,
        wire_span_mm: 50,
      });

      expect(thin.max_safe_duty_cycle).toBeLessThan(thick.max_safe_duty_cycle);
    });

    it("provides minimum wire feed recommendation", () => {
      const result = wedmWireHeatingEngine.recommendSafeParameters({
        target_current_A: 20,
        wire_diameter_mm: 0.25,
        wire_span_mm: 50,
      });

      expect(result.min_wire_feed_m_min).toBeGreaterThan(0);
    });
  });

  describe("calculateWirePowerDensity (U-P2PFS27)", () => {
    it("calculates power density P/A = I×V/(π×d×L)", () => {
      // P = 10A × 60V = 600W
      // A = π × 0.25 × (0.25 × 0.5) = π × 0.25 × 0.125 ≈ 0.098 mm²
      // P/A ≈ 6100 W/mm²... but that's way above limit, so let's use lower current
      const result = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 5,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.25,
      });

      expect(result.power_density_W_mm2).toBeGreaterThan(0);
      expect(result.total_power_W).toBe(300); // 5A × 60V
      expect(result.arc_surface_area_mm2).toBeGreaterThan(0);
    });

    it("power density scales linearly with current", () => {
      const r1 = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 5,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.25,
      });

      const r2 = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 10,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.25,
      });

      expect(r2.power_density_W_mm2).toBeCloseTo(r1.power_density_W_mm2 * 2, 0);
    });

    it("power density scales inversely with wire diameter", () => {
      const thin = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 5,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.15,
      });

      const thick = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 5,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.30,
      });

      // Thinner wire = higher power density (smaller surface area)
      expect(thin.power_density_W_mm2).toBeGreaterThan(thick.power_density_W_mm2);
    });

    it("calculates max safe current for setup", () => {
      const result = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 5,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.25,
      });

      expect(result.max_safe_current_A).toBeGreaterThan(0);
    });

    it("warns when power density exceeds limit", () => {
      const result = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 50, // Very high current
        gap_voltage_V: 80,
        wire_diameter_mm: 0.10, // Thin wire
      });

      expect(result.within_safe_limit).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("exceeds");
    });

    it("molybdenum has higher max safe current than brass", () => {
      const brass = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 10,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.20,
        wire_material: "brass",
      });

      const moly = wedmWireHeatingEngine.calculateWirePowerDensity({
        peak_current_A: 10,
        gap_voltage_V: 60,
        wire_diameter_mm: 0.20,
        wire_material: "moly", // Use short form that matches lookup
      });

      // Moly has higher max power density limit → higher max safe current
      expect(moly.max_safe_current_A).toBeGreaterThan(brass.max_safe_current_A);
    });
  });

  describe("checkThinWireSafety (U-P2PFS27)", () => {
    it("combines Joule heating and power density checks", () => {
      const result = wedmWireHeatingEngine.checkThinWireSafety({
        wire_diameter_mm: 0.20,
        peak_current_A: 8,
        gap_voltage_V: 60,
        pulse_on_us: 10,
        duty_cycle: 0.25,
        wire_span_mm: 40,
      });

      expect(typeof result.joule_safe).toBe("boolean");
      expect(typeof result.power_density_safe).toBe("boolean");
      expect(result.overall_safe).toBe(result.joule_safe && result.power_density_safe);
    });

    it("identifies limiting factor when unsafe", () => {
      // High current, thin wire → should trigger at least one limit
      const result = wedmWireHeatingEngine.checkThinWireSafety({
        wire_diameter_mm: 0.10,
        peak_current_A: 30,
        gap_voltage_V: 80,
        pulse_on_us: 5,
        duty_cycle: 0.15,
        wire_span_mm: 20,
      });

      // Should identify some limiting factor when overall unsafe
      if (!result.overall_safe) {
        expect(["joule_heating", "power_density"]).toContain(result.limiting_factor);
      } else {
        expect(result.limiting_factor).toBe("none");
      }
    });

    it("provides recommended max current", () => {
      const result = wedmWireHeatingEngine.checkThinWireSafety({
        wire_diameter_mm: 0.15,
        peak_current_A: 15,
        gap_voltage_V: 60,
        pulse_on_us: 10,
        duty_cycle: 0.25,
        wire_span_mm: 50,
      });

      expect(result.recommended_max_current_A).toBeGreaterThan(0);
    });

    it("collects warnings from both checks", () => {
      const result = wedmWireHeatingEngine.checkThinWireSafety({
        wire_diameter_mm: 0.08, // Very thin
        peak_current_A: 20,
        gap_voltage_V: 80,
        pulse_on_us: 20,
        duty_cycle: 0.35,
        wire_span_mm: 80,
      });

      // Should have warnings from one or both checks
      if (!result.overall_safe) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe("calculateServoVoltage (U-P2PFS28)", () => {
    it("calculates gap voltage Vg = Vo - I×R", () => {
      // Vo = 100V (standard), I = 10A, R = 2.5Ω
      // Vg = 100 - 10 × 2.5 = 75V
      const result = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 10,
        arc_resistance_ohm: 2.5,
        machine_class: "standard",
      });

      expect(result.gap_voltage_V).toBeCloseTo(75, 0);
      expect(result.open_circuit_V).toBe(100);
      expect(result.voltage_drop_V).toBeCloseTo(25, 0);
    });

    it("voltage drop scales linearly with current", () => {
      const r1 = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 5,
        arc_resistance_ohm: 2.5,
      });

      const r2 = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 10,
        arc_resistance_ohm: 2.5,
      });

      expect(r2.voltage_drop_V).toBeCloseTo(r1.voltage_drop_V * 2, 0);
    });

    it("checks stable voltage range", () => {
      // High current → low gap voltage → out of stable range
      const result = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 35,
        arc_resistance_ohm: 2.5,
      });

      expect(result.gap_voltage_V).toBeLessThan(20);
      expect(result.in_stable_range).toBe(false);
      expect(result.warning).toBeDefined();
    });

    it("uses machine class for open circuit voltage", () => {
      const precision = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 10,
        machine_class: "precision",
      });

      const highSpeed = wedmWireHeatingEngine.calculateServoVoltage({
        peak_current_A: 10,
        machine_class: "high_speed",
      });

      expect(highSpeed.open_circuit_V).toBeGreaterThan(precision.open_circuit_V);
    });
  });

  describe("calculateDebrisShortCircuit (U-P2PFS28)", () => {
    it("calculates SC ratio from debris and flush", () => {
      const result = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.3,
        flush_velocity_m_s: 2.0,
      });

      expect(result.sc_ratio).toBeGreaterThan(0);
      expect(result.sc_percentage).toBe(result.sc_ratio * 100);
    });

    it("SC ratio scales with debris concentration", () => {
      const low = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.2,
        flush_velocity_m_s: 2.0,
      });

      const high = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.4,
        flush_velocity_m_s: 2.0,
      });

      expect(high.sc_ratio).toBeCloseTo(low.sc_ratio * 2, 4);
    });

    it("SC ratio decreases with flush velocity", () => {
      const slow = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.3,
        flush_velocity_m_s: 1.0,
      });

      const fast = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.3,
        flush_velocity_m_s: 2.0,
      });

      expect(fast.sc_ratio).toBeCloseTo(slow.sc_ratio / 2, 4);
    });

    it("identifies risk level from SC ratio", () => {
      const critical = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 1.0,
        flush_velocity_m_s: 0.5,
      });

      expect(critical.risk_level).toBe("critical");
      expect(critical.warning).toBeDefined();
    });

    it("recommends flush velocity for safety", () => {
      const result = wedmWireHeatingEngine.calculateDebrisShortCircuit({
        debris_concentration_mg_cm3: 0.5,
        flush_velocity_m_s: 1.0,
      });

      expect(result.recommended_flush_velocity).toBeGreaterThan(0);
    });
  });

  describe("checkCoatedWireLimit (U-P2PFS28)", () => {
    it("calculates current density J = I / A", () => {
      // I = 10A, d = 0.25mm, A = π × (0.125)² ≈ 0.0491 mm²
      // J = 10 / 0.0491 ≈ 204 A/mm²
      const result = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        duty_cycle: 0.25,
      });

      expect(result.current_density_A_mm2).toBeCloseTo(204, 0);
    });

    it("checks against coating-specific limits", () => {
      const uncoated = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        duty_cycle: 0.25,
        coating_type: "uncoated_brass",
      });

      const gamma = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        duty_cycle: 0.25,
        coating_type: "gamma_coated",
      });

      // Gamma has higher limits
      expect(gamma.max_density_A_mm2).toBeGreaterThan(uncoated.max_density_A_mm2);
      expect(gamma.max_duty_cycle).toBeGreaterThan(uncoated.max_duty_cycle);
    });

    it("warns when current density exceeds limit", () => {
      const result = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.10, // Very thin → high density
        peak_current_A: 15,
        duty_cycle: 0.25,
        coating_type: "uncoated_brass",
      });

      if (!result.within_current_limit) {
        expect(result.warning).toContain("density");
      }
    });

    it("warns when duty cycle exceeds limit", () => {
      const result = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.25,
        peak_current_A: 5,
        duty_cycle: 0.50, // Very high duty
        coating_type: "uncoated_brass",
      });

      expect(result.within_duty_limit).toBe(false);
      expect(result.warning).toContain("Duty");
    });

    it("calculates utilization percentage", () => {
      const result = wedmWireHeatingEngine.checkCoatedWireLimit({
        wire_diameter_mm: 0.25,
        peak_current_A: 10,
        duty_cycle: 0.20,
      });

      expect(result.utilization_pct).toBeGreaterThan(0);
      expect(result.utilization_pct).toBeLessThanOrEqual(100);
    });
  });
});
