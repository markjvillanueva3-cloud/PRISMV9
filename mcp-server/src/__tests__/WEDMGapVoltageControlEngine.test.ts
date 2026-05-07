/**
 * WEDMGapVoltageControlEngine tests — U-WB02
 * Validates gap voltage dynamics, discharge probability, and servo optimization
 *
 * Physics validation:
 * - Gap voltage: V = V_arc + k × gap [Mitsubishi MV-R manual]
 * - Short-circuit probability: P_sc = k × debris_ppm / gap_mm [DiBitonto 1989]
 * - Discharge probability must sum with P_sc + P_open ≤ 1
 */

import { describe, it, expect } from "vitest";
import {
  wedmGapVoltageControlEngine,
  DielectricType,
  GapVoltageInput,
} from "../engines/WEDMGapVoltageControlEngine.js";
import { EDM_PHYSICS } from "../physics/constants.js";

describe("WEDMGapVoltageControlEngine", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // GAP VOLTAGE CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculate — gap voltage physics", () => {
    it("returns arc voltage at minimum gap", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: EDM_PHYSICS.gap_voltage.min_gap_um,
      });

      expect(result.effective_gap_voltage_V).toBeCloseTo(
        EDM_PHYSICS.gap_voltage.arc_voltage_V,
        1
      );
    });

    it("increases voltage linearly with gap distance", () => {
      const result1 = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 30,
      });
      const result2 = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 50,
      });

      // V = V_arc + k × (gap - min_gap), k ≈ 0.4 V/µm for DI water
      const expected_diff = 0.4 * (50 - 30);
      const actual_diff = result2.effective_gap_voltage_V - result1.effective_gap_voltage_V;

      expect(actual_diff).toBeCloseTo(expected_diff, 1);
    });

    it("clamps voltage to open-circuit limit", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 200, // Way beyond max
      });

      expect(result.effective_gap_voltage_V).toBeLessThanOrEqual(
        EDM_PHYSICS.gap_voltage.open_circuit_V.standard
      );
    });

    it("oil-based dielectric has lower gap coefficient", () => {
      const waterResult = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: 40,
      });
      const oilResult = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "oil_based",
        debris_ppm: 20,
        gap_distance_um: 40,
      });

      // Oil has k ≈ 0.25 vs water k ≈ 0.4
      expect(oilResult.effective_gap_voltage_V).toBeLessThan(
        waterResult.effective_gap_voltage_V
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISCHARGE PROBABILITY
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculate — discharge probability", () => {
    it("probabilities sum to 1.0 or less", () => {
      const testCases: GapVoltageInput[] = [
        { dielectric_type: "deionized_water", debris_ppm: 10, gap_distance_um: 30 },
        { dielectric_type: "deionized_water", debris_ppm: 100, gap_distance_um: 50 },
        { dielectric_type: "tap_water", debris_ppm: 50, gap_distance_um: 40 },
        { dielectric_type: "oil_based", debris_ppm: 20, gap_distance_um: 35 },
      ];

      for (const input of testCases) {
        const result = wedmGapVoltageControlEngine.calculate(input);
        const sum =
          result.discharge_probability +
          result.short_circuit_probability +
          result.open_circuit_probability;

        expect(sum).toBeLessThanOrEqual(1.001); // Small tolerance for rounding
        expect(sum).toBeGreaterThanOrEqual(0.999);
      }
    });

    it("short-circuit probability increases with debris", () => {
      const lowDebris = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 40,
      });
      const highDebris = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 200,
        gap_distance_um: 40,
      });

      expect(highDebris.short_circuit_probability).toBeGreaterThan(
        lowDebris.short_circuit_probability
      );
    });

    it("short-circuit probability decreases with larger gap", () => {
      const smallGap = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 50,
        gap_distance_um: 20,
      });
      const largeGap = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 50,
        gap_distance_um: 60,
      });

      expect(largeGap.short_circuit_probability).toBeLessThan(
        smallGap.short_circuit_probability
      );
    });

    it("open-circuit probability increases beyond characteristic gap", () => {
      const dielectric = wedmGapVoltageControlEngine.getDielectricProperties("deionized_water");
      const lambda = dielectric.characteristicGap_um;

      const atLambda = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: lambda,
      });
      const beyondLambda = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: lambda + 20,
      });

      expect(beyondLambda.open_circuit_probability).toBeGreaterThan(
        atLambda.open_circuit_probability
      );
    });

    it("maximum discharge probability around optimal gap", () => {
      const gaps = [20, 30, 40, 50, 60, 70, 80];
      const results = gaps.map((gap) =>
        wedmGapVoltageControlEngine.calculate({
          dielectric_type: "deionized_water",
          debris_ppm: 30,
          gap_distance_um: gap,
        })
      );

      const maxP = Math.max(...results.map((r) => r.discharge_probability));
      const maxIdx = results.findIndex((r) => r.discharge_probability === maxP);

      // Optimal should be somewhere in the middle, not at extremes
      expect(maxIdx).toBeGreaterThan(0);
      expect(maxIdx).toBeLessThan(gaps.length - 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STABILITY INDEX
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculate — stability index", () => {
    it("stability index is between 0 and 1", () => {
      const testCases: GapVoltageInput[] = [
        { dielectric_type: "deionized_water", debris_ppm: 10, gap_distance_um: 40 },
        { dielectric_type: "deionized_water", debris_ppm: 500, gap_distance_um: 15 },
        { dielectric_type: "oil_based", debris_ppm: 50, gap_distance_um: 70 },
      ];

      for (const input of testCases) {
        const result = wedmGapVoltageControlEngine.calculate(input);
        expect(result.stability_index).toBeGreaterThanOrEqual(0);
        expect(result.stability_index).toBeLessThanOrEqual(1);
      }
    });

    it("high discharge probability yields high stability", () => {
      // Find optimal gap for low debris
      const optimal = wedmGapVoltageControlEngine.findOptimalGap(
        20,
        wedmGapVoltageControlEngine.getDielectricProperties("deionized_water")
      );

      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: optimal,
      });

      expect(result.stability_index).toBeGreaterThan(0.8);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // WARNINGS AND RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculate — warnings", () => {
    it("warns when gap below minimum", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 5,
      });

      expect(result.warnings.some((w) => w.includes("below minimum"))).toBe(true);
    });

    it("warns when gap above maximum", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 10,
        gap_distance_um: 100,
      });

      expect(result.warnings.some((w) => w.includes("above maximum"))).toBe(true);
    });

    it("warns when debris exceeds critical threshold", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: EDM_PHYSICS.debris_short_circuit.thresholds.critical + 100,
        gap_distance_um: 40,
      });

      expect(result.warnings.some((w) => w.includes("critical"))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHYSICS OUTPUT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculate — physics outputs", () => {
    it("returns valid dielectric properties", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: 40,
      });

      expect(result.physics.dielectric.name).toBe("deionized_water");
      expect(result.physics.dielectric.conductivity_uS_cm).toBe(0.5);
      expect(result.physics.dielectric.gapCoefficient_V_per_um).toBe(0.4);
    });

    it("plasma channel radius follows Sato model", () => {
      // r_plasma ≈ 0.5 × I^0.4 × t_on^0.4
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: 40,
        peak_current_A: 10,
        pulse_on_us: 1.0,
      });

      const expected = 0.5 * Math.pow(10, 0.4) * Math.pow(1.0, 0.4);
      expect(result.physics.plasma_channel_radius_um).toBeCloseTo(expected, 1);
    });

    it("breakdown voltage scales with gap", () => {
      const result1 = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: 20,
      });
      const result2 = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 20,
        gap_distance_um: 40,
      });

      // Breakdown V ∝ gap for same dielectric
      expect(result2.physics.breakdown_voltage_V).toBeCloseTo(
        result1.physics.breakdown_voltage_V * 2,
        1
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SERVO OPTIMIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe("optimizeServo", () => {
    it("returns optimal gap within physical limits", () => {
      const result = wedmGapVoltageControlEngine.optimizeServo(
        0.85,
        "deionized_water",
        100
      );

      expect(result.optimal_gap_um).toBeGreaterThan(EDM_PHYSICS.gap_voltage.min_gap_um);
      expect(result.optimal_gap_um).toBeLessThan(EDM_PHYSICS.gap_voltage.max_gap_um);
    });

    it("optimal voltage is consistent with gap", () => {
      const result = wedmGapVoltageControlEngine.optimizeServo(
        0.85,
        "deionized_water",
        50
      );

      // Verify voltage calculation
      const V_arc = EDM_PHYSICS.gap_voltage.arc_voltage_V;
      const k = 0.4; // DI water coefficient
      const min_gap = EDM_PHYSICS.gap_voltage.min_gap_um;
      const expected_V = V_arc + k * Math.max(0, result.optimal_gap_um - min_gap);

      expect(result.optimal_voltage_V).toBeCloseTo(expected_V, 1);
    });

    it("safe debris limit decreases for higher target probability", () => {
      const low_target = wedmGapVoltageControlEngine.optimizeServo(
        0.70,
        "deionized_water",
        200
      );
      const high_target = wedmGapVoltageControlEngine.optimizeServo(
        0.90,
        "deionized_water",
        200
      );

      expect(high_target.safe_debris_limit_ppm).toBeLessThanOrEqual(
        low_target.safe_debris_limit_ppm
      );
    });

    it("provides sensitivity coefficients", () => {
      const result = wedmGapVoltageControlEngine.optimizeServo(
        0.85,
        "deionized_water",
        100
      );

      expect(result.sensitivity.gap_voltage_slope_V_per_um).toBeCloseTo(0.4, 2);
      expect(result.sensitivity.debris_sensitivity_per_ppm).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PARAMETER VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  describe("validateParameters", () => {
    it("valid parameters pass validation", () => {
      const result = wedmGapVoltageControlEngine.validateParameters({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: 40,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("gap below minimum fails validation", () => {
      const result = wedmGapVoltageControlEngine.validateParameters({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: 5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("too small"))).toBe(true);
      expect(result.suggested_corrections.gap_distance_um).toBeGreaterThan(5);
    });

    it("gap above maximum fails validation", () => {
      const result = wedmGapVoltageControlEngine.validateParameters({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("too large"))).toBe(true);
      expect(result.suggested_corrections.gap_distance_um).toBeLessThan(100);
    });

    it("critical debris fails validation", () => {
      const result = wedmGapVoltageControlEngine.validateParameters({
        dielectric_type: "deionized_water",
        debris_ppm: 600,
        gap_distance_um: 40,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("critical"))).toBe(true);
    });

    it("high debris warns but passes", () => {
      const thresholds = EDM_PHYSICS.debris_short_circuit.ppm_thresholds;
      const result = wedmGapVoltageControlEngine.validateParameters({
        dielectric_type: "deionized_water",
        debris_ppm: thresholds.warning + 10, // Above warning but below critical
        gap_distance_um: 40,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("high"))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DIELECTRIC UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  describe("getDielectricProperties", () => {
    it("returns properties for all valid types", () => {
      const types: DielectricType[] = [
        "deionized_water",
        "tap_water",
        "oil_based",
        "synthetic",
        "kerosene",
      ];

      for (const type of types) {
        const props = wedmGapVoltageControlEngine.getDielectricProperties(type);
        expect(props.name).toBe(type);
        expect(props.conductivity_uS_cm).toBeGreaterThan(0);
        expect(props.breakdownStrength_kV_mm).toBeGreaterThan(0);
        expect(props.gapCoefficient_V_per_um).toBeGreaterThan(0);
      }
    });

    it("throws for invalid dielectric type", () => {
      expect(() => {
        wedmGapVoltageControlEngine.getDielectricProperties(
          "invalid_type" as DielectricType
        );
      }).toThrow(/Unknown dielectric type/);
    });
  });

  describe("listDielectrics", () => {
    it("returns all 5 dielectric types", () => {
      const list = wedmGapVoltageControlEngine.listDielectrics();
      expect(list).toHaveLength(5);
      expect(list.map((d) => d.name)).toContain("deionized_water");
      expect(list.map((d) => d.name)).toContain("oil_based");
    });
  });

  describe("compareDielectrics", () => {
    it("compares all dielectrics for given conditions", () => {
      const comparison = wedmGapVoltageControlEngine.compareDielectrics(30, 40);

      expect(comparison).toHaveLength(5);
      for (const entry of comparison) {
        expect(entry.result.discharge_probability).toBeGreaterThan(0);
        expect(entry.result.discharge_probability).toBeLessThanOrEqual(1);
      }
    });

    it("deionized water has highest discharge probability at low debris", () => {
      const comparison = wedmGapVoltageControlEngine.compareDielectrics(20, 40);

      const diWater = comparison.find((c) => c.dielectric === "deionized_water");
      const others = comparison.filter((c) => c.dielectric !== "deionized_water");

      for (const other of others) {
        expect(diWater!.result.discharge_probability).toBeGreaterThanOrEqual(
          other.result.discharge_probability * 0.95 // Allow small tolerance
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles zero debris", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 0,
        gap_distance_um: 40,
      });

      expect(result.short_circuit_probability).toBe(0);
      expect(result.discharge_probability).toBeGreaterThan(0.9);
    });

    it("handles very high debris gracefully", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 1000,
        gap_distance_um: 40,
      });

      expect(result.short_circuit_probability).toBeLessThanOrEqual(1);
      expect(result.discharge_probability).toBeGreaterThanOrEqual(0);
    });

    it("handles minimum gap", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: EDM_PHYSICS.gap_voltage.min_gap_um,
      });

      expect(result.effective_gap_voltage_V).toBeGreaterThanOrEqual(
        EDM_PHYSICS.gap_voltage.arc_voltage_V
      );
    });

    it("handles maximum gap", () => {
      const result = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: EDM_PHYSICS.gap_voltage.max_gap_um,
      });

      expect(result.effective_gap_voltage_V).toBeLessThanOrEqual(
        EDM_PHYSICS.gap_voltage.open_circuit_V.standard
      );
      expect(result.open_circuit_probability).toBeGreaterThan(0);
    });

    it("handles optional parameters", () => {
      const withOptional = wedmGapVoltageControlEngine.calculate({
        dielectric_type: "deionized_water",
        debris_ppm: 30,
        gap_distance_um: 40,
        peak_current_A: 15,
        pulse_on_us: 2.0,
        workpiece_material: "steel",
      });

      expect(withOptional.physics.ionization_factor).toBeGreaterThan(1);
      expect(withOptional.physics.plasma_channel_radius_um).toBeGreaterThan(0);
    });
  });
});
