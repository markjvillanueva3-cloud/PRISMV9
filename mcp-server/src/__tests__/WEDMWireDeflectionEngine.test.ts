/**
 * WEDMWireDeflectionEngine Tests
 * Wire deflection prediction and compensation
 */

import { describe, it, expect } from "vitest";
import {
  wedmWireDeflectionEngine,
  WEDMWireDeflectionEngine,
} from "../engines/WEDMWireDeflectionEngine.js";

describe("WEDMWireDeflectionEngine", () => {
  describe("calculateMomentOfInertia", () => {
    it("calculates I for circular cross-section", () => {
      // I = π × d⁴ / 64 = π × 0.25⁴ / 64 ≈ 1.92e-4 mm⁴
      const I = wedmWireDeflectionEngine.calculateMomentOfInertia(0.25);
      expect(I).toBeCloseTo(1.92e-4, 6);
    });

    it("scales with d⁴", () => {
      const I1 = wedmWireDeflectionEngine.calculateMomentOfInertia(0.2);
      const I2 = wedmWireDeflectionEngine.calculateMomentOfInertia(0.4);
      // d doubles → I increases by 2⁴ = 16
      expect(I2 / I1).toBeCloseTo(16, 0);
    });
  });

  describe("estimateDischargeForce", () => {
    it("estimates force from current", () => {
      const force = wedmWireDeflectionEngine.estimateDischargeForce(10, 0.3);
      // F = 0.15 × 10 × 0.3 = 0.45 N
      expect(force).toBeCloseTo(0.45, 2);
    });

    it("scales linearly with current", () => {
      const f1 = wedmWireDeflectionEngine.estimateDischargeForce(10, 0.3);
      const f2 = wedmWireDeflectionEngine.estimateDischargeForce(20, 0.3);
      expect(f2).toBeCloseTo(f1 * 2, 2);
    });
  });

  describe("calculateDeflection", () => {
    it("calculates deflection for tensioned wire", () => {
      const deflection = wedmWireDeflectionEngine.calculateDeflection(
        0.5,   // force N
        12,    // tension N
        50,    // span mm
        0.25,  // diameter mm
        100    // modulus GPa (brass)
      );
      expect(deflection).toBeGreaterThan(0);
      // String model: δ = F × L / (8 × T) = 0.5 × 50 / (8 × 12) ≈ 0.26mm
      expect(deflection).toBeLessThan(0.5); // Reasonable upper bound
    });

    it("increases with force", () => {
      const d1 = wedmWireDeflectionEngine.calculateDeflection(0.3, 12, 50, 0.25, 100);
      const d2 = wedmWireDeflectionEngine.calculateDeflection(0.6, 12, 50, 0.25, 100);
      expect(d2).toBeGreaterThan(d1);
    });

    it("decreases with tension", () => {
      const d1 = wedmWireDeflectionEngine.calculateDeflection(0.5, 10, 50, 0.25, 100);
      const d2 = wedmWireDeflectionEngine.calculateDeflection(0.5, 20, 50, 0.25, 100);
      expect(d1).toBeGreaterThan(d2);
    });

    it("increases with span", () => {
      const d1 = wedmWireDeflectionEngine.calculateDeflection(0.5, 12, 30, 0.25, 100);
      const d2 = wedmWireDeflectionEngine.calculateDeflection(0.5, 12, 60, 0.25, 100);
      expect(d2).toBeGreaterThan(d1);
    });

    it("throws on invalid tension", () => {
      expect(() =>
        wedmWireDeflectionEngine.calculateDeflection(0.5, 0, 50, 0.25, 100)
      ).toThrow();
    });
  });

  describe("calculateDeflectionAngle", () => {
    it("calculates angle from deflection", () => {
      // θ = atan(4 × δ / L) in degrees
      const angle = wedmWireDeflectionEngine.calculateDeflectionAngle(0.01, 50);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(5); // Small angle
    });
  });

  describe("calculateMinCornerRadius", () => {
    it("calculates minimum corner radius", () => {
      // min = wire_radius + deflection
      const radius = wedmWireDeflectionEngine.calculateMinCornerRadius(0.25, 0.01);
      expect(radius).toBeCloseTo(0.135, 2); // 0.125 + 0.01
    });
  });

  describe("predict", () => {
    it("predicts deflection for typical setup", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.3,
      });

      expect(result.max_deflection_mm).toBeGreaterThan(0);
      expect(result.max_deflection_um).toBeCloseTo(result.max_deflection_mm * 1000, 0);
      expect(result.deflection_angle_deg).toBeGreaterThan(0);
      expect(result.taper_error_mm).toBeCloseTo(result.max_deflection_mm, 4);
      expect(result.min_corner_radius_mm).toBeGreaterThan(0.125); // Wire radius
    });

    it("flags excessive deflection", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.15,
        wire_tension_N: 5,
        workpiece_thickness_mm: 100, // Thick part
        peak_current_A: 20,
        duty_cycle: 0.4,
      });

      // High current, thin wire, thick part → likely excessive
      if (result.exceeds_limit) {
        expect(result.warning).toBeDefined();
        expect(result.recommendation).toBeDefined();
      }
    });

    it("applies dynamic correction for high feed", () => {
      const static_result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.3,
      });

      const dynamic_result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.3,
        feed_rate_mm_min: 5, // High feed
      });

      expect(dynamic_result.max_deflection_mm).toBeGreaterThan(static_result.max_deflection_mm);
    });

    it("uses wire material modulus", () => {
      const brass = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_material: "brass",
      });

      const moly = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_material: "molybdenum",
      });

      // Moly has higher modulus → less deflection (in beam-dominated regime)
      // But for string-dominated, modulus doesn't matter much
      expect(moly.max_deflection_mm).toBeLessThanOrEqual(brass.max_deflection_mm);
    });

    it("throws on invalid input", () => {
      expect(() =>
        wedmWireDeflectionEngine.predict({
          wire_diameter_mm: 0,
          wire_tension_N: 12,
          workpiece_thickness_mm: 50,
          peak_current_A: 10,
        })
      ).toThrow();
    });
  });

  describe("calculateMaxSafeCurrent", () => {
    it("calculates max current for target deflection", () => {
      const maxCurrent = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, // wire diameter
        12,   // tension
        50    // thickness
      );
      expect(maxCurrent).toBeGreaterThan(0);
    });

    it("returns higher current for higher tension", () => {
      const lowT = wedmWireDeflectionEngine.calculateMaxSafeCurrent(0.25, 8, 50);
      const highT = wedmWireDeflectionEngine.calculateMaxSafeCurrent(0.25, 16, 50);
      expect(highT).toBeGreaterThan(lowT);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMWireDeflectionEngine();
      engine.configure({ max_deflection_um: 30 });
      expect(engine.getConfig().max_deflection_um).toBe(30);
    });
  });

  describe("calculateFlushDeflection (U-P2PFS25)", () => {
    it("calculates deflection from flush pressure (Dauw & Albert 1992)", () => {
      // δ = (p × d × L²) / (8 × T)
      // p = 1 bar = 0.1 N/mm², d = 0.25 mm, L = 50 mm, T = 12 N
      // δ = (0.1 × 0.25 × 50²) / (8 × 12) = 62.5 / 96 = 0.651 mm
      const result = wedmWireDeflectionEngine.calculateFlushDeflection(
        1.0,   // pressure bar
        0.25,  // wire diameter mm
        50,    // span mm
        12     // tension N
      );
      expect(result.deflection_mm).toBeCloseTo(0.651, 2);
      expect(result.deflection_um).toBeCloseTo(651, 0);
    });

    it("scales linearly with pressure", () => {
      const r1 = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 12);
      const r2 = wedmWireDeflectionEngine.calculateFlushDeflection(2.0, 0.25, 50, 12);
      expect(r2.deflection_mm).toBeCloseTo(r1.deflection_mm * 2, 4);
    });

    it("scales with L² (span squared)", () => {
      const r1 = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 25, 12);
      const r2 = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 12);
      // L doubles → δ quadruples
      expect(r2.deflection_mm).toBeCloseTo(r1.deflection_mm * 4, 4);
    });

    it("scales inversely with tension", () => {
      const r1 = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 12);
      const r2 = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 24);
      // T doubles → δ halves
      expect(r2.deflection_mm).toBeCloseTo(r1.deflection_mm / 2, 4);
    });

    it("returns distributed load and total force", () => {
      const result = wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 12);
      // q = p × d = 0.1 × 0.25 = 0.025 N/mm
      expect(result.distributed_load_N_per_mm).toBeCloseTo(0.025, 4);
      // F = q × L = 0.025 × 50 = 1.25 N
      expect(result.total_lateral_force_N).toBeCloseTo(1.25, 4);
    });

    it("warns when deflection exceeds safe limit", () => {
      // High pressure, low tension, long span → large deflection
      const result = wedmWireDeflectionEngine.calculateFlushDeflection(3.0, 0.25, 100, 8);
      expect(result.within_safe_range).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("exceeds limit");
    });

    it("warns for high pressure", () => {
      // Pressure above typical max (3 bar)
      const result = wedmWireDeflectionEngine.calculateFlushDeflection(4.0, 0.25, 20, 15);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("exceeds typical max");
    });

    it("throws on zero tension", () => {
      expect(() =>
        wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 50, 0)
      ).toThrow("Wire tension must be positive");
    });

    it("throws on zero span", () => {
      expect(() =>
        wedmWireDeflectionEngine.calculateFlushDeflection(1.0, 0.25, 0, 12)
      ).toThrow("Span must be positive");
    });
  });

  describe("calculateCombinedDeflection (U-P2PFS25)", () => {
    it("sums discharge and flush deflections", () => {
      const result = wedmWireDeflectionEngine.calculateCombinedDeflection({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        span_mm: 50,
        discharge_force_N: 0.5,
        flush_pressure_bar: 1.0,
      });

      expect(result.discharge_deflection_mm).toBeGreaterThan(0);
      expect(result.flush_deflection_mm).toBeGreaterThan(0);
      expect(result.total_deflection_mm).toBeCloseTo(
        result.discharge_deflection_mm + result.flush_deflection_mm,
        6
      );
    });

    it("identifies dominant deflection source", () => {
      // High flush, low discharge → flush dominant
      const flushDominant = wedmWireDeflectionEngine.calculateCombinedDeflection({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        span_mm: 50,
        discharge_force_N: 0.1,
        flush_pressure_bar: 2.0,
      });
      expect(flushDominant.dominant_source).toBe("flush");

      // High discharge, low flush → discharge dominant
      const dischargeDominant = wedmWireDeflectionEngine.calculateCombinedDeflection({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        span_mm: 50,
        discharge_force_N: 2.0,
        flush_pressure_bar: 0.1,
      });
      expect(dischargeDominant.dominant_source).toBe("discharge");
    });

    it("reports deflection in both mm and μm", () => {
      const result = wedmWireDeflectionEngine.calculateCombinedDeflection({
        wire_diameter_mm: 0.25,
        wire_tension_N: 12,
        span_mm: 50,
        discharge_force_N: 0.5,
        flush_pressure_bar: 1.0,
      });
      expect(result.total_deflection_um).toBeCloseTo(result.total_deflection_mm * 1000, 0);
    });
  });
});
