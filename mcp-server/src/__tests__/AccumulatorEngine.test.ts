/**
 * AccumulatorEngine Tests
 *
 * Tests hydraulic accumulator sizing calculations including:
 * - Gas law calculations (isothermal/adiabatic/polytropic)
 * - Volume sizing from pressure requirements
 * - Stored energy calculations
 * - Safety checks and recommendations
 *
 * Reference: ISO 5765, Parker/Hydac accumulator selection guides
 */

import { describe, it, expect } from "vitest";
import {
  AccumulatorEngine,
  accumulatorEngine,
  type AccumulatorInput,
  type AccumulatorResult,
} from "../engines/AccumulatorEngine.js";

describe("AccumulatorEngine", () => {
  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(accumulatorEngine).toBeDefined();
      expect(accumulatorEngine).toBeInstanceOf(AccumulatorEngine);
    });

    it("exports class for custom instantiation", () => {
      const engine = new AccumulatorEngine();
      expect(engine).toBeInstanceOf(AccumulatorEngine);
    });
  });

  describe("calculate - basic functionality", () => {
    it("calculates accumulator sizing with minimal input", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);

      expect(result).toBeDefined();
      expect(result.total_volume_L.value).toBeGreaterThan(0);
      expect(result.precharge_pressure_bar.value).toBeGreaterThan(0);
      expect(result.is_safe).toBe(true);
    });

    it("returns all required AtomicValue fields", () => {
      const input: AccumulatorInput = {
        required_volume_L: 5,
        min_pressure_bar: 150,
        max_pressure_bar: 250,
      };

      const result = accumulatorEngine.calculate(input);

      // Check all AtomicValue properties exist
      const atomicFields = [
        "total_volume_L",
        "precharge_pressure_bar",
        "gas_volume_max_L",
        "gas_volume_min_L",
        "stored_energy_kJ",
        "flow_rate_lpm",
        "compression_ratio",
        "temperature_rise_C",
      ];

      for (const field of atomicFields) {
        const av = result[field as keyof AccumulatorResult];
        expect(av).toHaveProperty("value");
        expect(av).toHaveProperty("unit");
        expect(av).toHaveProperty("uncertainty");
        expect(av).toHaveProperty("source");
      }
    });

    it("calculates precharge pressure from min_pressure and ratio", () => {
      const input: AccumulatorInput = {
        required_volume_L: 3,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        precharge_ratio: 0.9,
      };

      const result = accumulatorEngine.calculate(input);

      // P0 = P1 * precharge_ratio = 100 * 0.9 = 90 bar
      expect(result.precharge_pressure_bar.value).toBeCloseTo(90, 0);
    });

    it("uses default precharge_ratio of 0.9", () => {
      const input: AccumulatorInput = {
        required_volume_L: 3,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);

      // Default ratio 0.9: P0 = 100 * 0.9 = 90 bar
      expect(result.precharge_pressure_bar.value).toBeCloseTo(90, 0);
    });
  });

  describe("gas processes", () => {
    const baseInput: AccumulatorInput = {
      required_volume_L: 2,
      min_pressure_bar: 100,
      max_pressure_bar: 200,
    };

    it("uses adiabatic process by default (n=1.4)", () => {
      const result = accumulatorEngine.calculate(baseInput);

      // Adiabatic should have higher temperature rise than isothermal
      expect(result.temperature_rise_C.value).toBeGreaterThan(0);
    });

    it("calculates isothermal process (n=1.0)", () => {
      const input: AccumulatorInput = {
        ...baseInput,
        gas_process: "isothermal",
      };

      const result = accumulatorEngine.calculate(input);

      // Isothermal: temperature rise should be 0 (n-1=0)
      expect(result.temperature_rise_C.value).toBeCloseTo(0, 1);
    });

    it("calculates polytropic process (n=1.2)", () => {
      const input: AccumulatorInput = {
        ...baseInput,
        gas_process: "polytropic",
      };

      const result = accumulatorEngine.calculate(input);

      // Polytropic is between isothermal and adiabatic
      const adiabaticResult = accumulatorEngine.calculate({
        ...baseInput,
        gas_process: "adiabatic",
      });

      expect(result.temperature_rise_C.value).toBeGreaterThan(0);
      expect(result.temperature_rise_C.value).toBeLessThan(
        adiabaticResult.temperature_rise_C.value
      );
    });

    it("gas process affects total volume sizing", () => {
      const isothermal = accumulatorEngine.calculate({
        ...baseInput,
        gas_process: "isothermal",
      });

      const adiabatic = accumulatorEngine.calculate({
        ...baseInput,
        gas_process: "adiabatic",
      });

      // Different gas laws produce different volume requirements
      expect(isothermal.total_volume_L.value).not.toBeCloseTo(
        adiabatic.total_volume_L.value,
        1
      );
    });
  });

  describe("accumulator types", () => {
    it("accepts bladder type (default)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        accumulator_type: "bladder",
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("accepts piston type", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        accumulator_type: "piston",
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("accepts diaphragm type", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        accumulator_type: "diaphragm",
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("accepts spring type", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        accumulator_type: "spring",
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("warns bladder type at high pressure (>350 bar)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 300,
        max_pressure_bar: 400,
        accumulator_type: "bladder",
      };

      const result = accumulatorEngine.calculate(input);
      const hasHighPressureWarning = result.recommendations.some((r) =>
        r.includes("Bladder type max")
      );
      expect(hasHighPressureWarning).toBe(true);
    });

    it("warns bladder type at high compression ratio (>4:1)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 50,
        max_pressure_bar: 250, // compression ratio ~5.5
        accumulator_type: "bladder",
      };

      const result = accumulatorEngine.calculate(input);
      const hasExtrusionWarning = result.recommendations.some((r) =>
        r.includes("bladder extrusion risk")
      );
      expect(hasExtrusionWarning).toBe(true);
    });
  });

  describe("flow rate calculation", () => {
    it("calculates flow rate from volume and response time", () => {
      const input: AccumulatorInput = {
        required_volume_L: 6,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        response_time_s: 1,
      };

      const result = accumulatorEngine.calculate(input);

      // Flow = dV / (t_response / 60) = 6 / (1/60) = 360 L/min
      expect(result.flow_rate_lpm.value).toBeCloseTo(360, 0);
    });

    it("uses default response time of 1 second", () => {
      const input: AccumulatorInput = {
        required_volume_L: 3,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);

      // Flow = 3 / (1/60) = 180 L/min
      expect(result.flow_rate_lpm.value).toBeCloseTo(180, 0);
    });

    it("slower response time reduces required flow rate", () => {
      const fast = accumulatorEngine.calculate({
        required_volume_L: 3,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        response_time_s: 0.5,
      });

      const slow = accumulatorEngine.calculate({
        required_volume_L: 3,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        response_time_s: 2,
      });

      expect(fast.flow_rate_lpm.value).toBeGreaterThan(
        slow.flow_rate_lpm.value
      );
    });
  });

  describe("stored energy calculation", () => {
    it("calculates stored energy from pressure and volume", () => {
      const input: AccumulatorInput = {
        required_volume_L: 5,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);

      // E = (P1 + P2) / 2 * 1e5 * dV / 1000 / 1000 kJ
      // E = (100 + 200) / 2 * 1e5 * 5 / 1e6 = 75 kJ
      expect(result.stored_energy_kJ.value).toBeCloseTo(75, 0);
    });

    it("higher pressure increases stored energy", () => {
      const low = accumulatorEngine.calculate({
        required_volume_L: 2,
        min_pressure_bar: 50,
        max_pressure_bar: 100,
      });

      const high = accumulatorEngine.calculate({
        required_volume_L: 2,
        min_pressure_bar: 200,
        max_pressure_bar: 350,
      });

      expect(high.stored_energy_kJ.value).toBeGreaterThan(
        low.stored_energy_kJ.value
      );
    });
  });

  describe("safety checks", () => {
    it("marks safe when within limits", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("marks unsafe at very high compression ratio (>8)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 20,
        max_pressure_bar: 200, // compression ratio would be ~10+
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(false);
    });

    it("marks unsafe at extreme pressure (>400 bar)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 350,
        max_pressure_bar: 450,
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.is_safe).toBe(false);
    });
  });

  describe("recommendations", () => {
    it("warns on high compression ratio (>4)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 50,
        max_pressure_bar: 250,
      };

      const result = accumulatorEngine.calculate(input);
      const hasCompressionWarning = result.recommendations.some((r) =>
        r.includes("High compression ratio")
      );
      expect(hasCompressionWarning).toBe(true);
    });

    it("warns on low precharge pressure", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        precharge_ratio: 0.7, // P0 = 70 bar, which is < 100 * 0.8
      };

      const result = accumulatorEngine.calculate(input);
      const hasPrechargeWarning = result.recommendations.some((r) =>
        r.includes("Low precharge")
      );
      expect(hasPrechargeWarning).toBe(true);
    });

    it("warns on high temperature rise (>50C)", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 50,
        max_pressure_bar: 300,
        gas_process: "adiabatic",
      };

      const result = accumulatorEngine.calculate(input);
      const hasTempWarning = result.recommendations.some((r) =>
        r.includes("Gas temp rise")
      );
      expect(hasTempWarning).toBe(true);
    });

    it("provides nominal recommendation when all OK", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 150,
        precharge_ratio: 0.9,
      };

      const result = accumulatorEngine.calculate(input);

      // With good parameters, should have nominal recommendation
      const hasNominal = result.recommendations.some((r) =>
        r.includes("Accumulator nominal")
      );
      expect(hasNominal).toBe(true);
    });
  });

  describe("uncertainty values", () => {
    it("provides uncertainty for all calculated values", () => {
      const input: AccumulatorInput = {
        required_volume_L: 5,
        min_pressure_bar: 150,
        max_pressure_bar: 250,
      };

      const result = accumulatorEngine.calculate(input);

      expect(result.total_volume_L.uncertainty).toBeGreaterThan(0);
      expect(result.precharge_pressure_bar.uncertainty).toBeGreaterThan(0);
      expect(result.gas_volume_max_L.uncertainty).toBeGreaterThan(0);
      expect(result.gas_volume_min_L.uncertainty).toBeGreaterThan(0);
      expect(result.stored_energy_kJ.uncertainty).toBeGreaterThan(0);
      expect(result.flow_rate_lpm.uncertainty).toBeGreaterThan(0);
      expect(result.compression_ratio.uncertainty).toBeGreaterThan(0);
      expect(result.temperature_rise_C.uncertainty).toBeGreaterThan(0);
    });

    it("uncertainty is proportional to calculated value", () => {
      const input: AccumulatorInput = {
        required_volume_L: 10,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);

      // Total volume uncertainty should be ~5% of value
      const expectedUncertainty = result.total_volume_L.value * 0.05;
      expect(result.total_volume_L.uncertainty).toBeCloseTo(
        expectedUncertainty,
        1
      );
    });
  });

  describe("temperature effects", () => {
    it("uses default temperature of 40C", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);
      // Temperature rise is calculated from base temp
      expect(result.temperature_rise_C.value).toBeGreaterThan(0);
    });

    it("higher base temperature affects temperature rise", () => {
      const cold = accumulatorEngine.calculate({
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        temperature_C: 20,
      });

      const hot = accumulatorEngine.calculate({
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        temperature_C: 60,
      });

      // Higher base temp should result in higher absolute temp rise
      expect(hot.temperature_rise_C.value).toBeGreaterThan(
        cold.temperature_rise_C.value
      );
    });
  });

  describe("edge cases", () => {
    it("handles small required volume", () => {
      const input: AccumulatorInput = {
        required_volume_L: 0.1,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.total_volume_L.value).toBeGreaterThan(0);
      expect(result.is_safe).toBe(true);
    });

    it("handles large required volume", () => {
      const input: AccumulatorInput = {
        required_volume_L: 100,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
      };

      const result = accumulatorEngine.calculate(input);
      expect(result.total_volume_L.value).toBeGreaterThan(100);
      expect(result.is_safe).toBe(true);
    });

    it("handles equal min and max pressure gracefully", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 100.1, // nearly equal
      };

      const result = accumulatorEngine.calculate(input);
      // Should not throw, may have large volume requirement
      expect(result.total_volume_L.value).toBeGreaterThan(0);
    });

    it("handles very short response time", () => {
      const input: AccumulatorInput = {
        required_volume_L: 2,
        min_pressure_bar: 100,
        max_pressure_bar: 200,
        response_time_s: 0.1,
      };

      const result = accumulatorEngine.calculate(input);
      // Very short time = very high flow rate
      expect(result.flow_rate_lpm.value).toBeGreaterThan(1000);
    });
  });
});
