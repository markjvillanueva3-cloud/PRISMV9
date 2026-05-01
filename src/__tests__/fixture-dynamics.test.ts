/**
 * Dedicated tests for FixtureDynamicsEngine
 * Methods: vacuumHold, chuckSpeedEffect, adaptiveClamping, clampLayout321
 */
import { describe, it, expect } from "vitest";
import { fixtureDynamicsEngine } from "../engines/FixtureDynamicsEngine.js";

describe("FixtureDynamicsEngine", () => {
  describe("vacuumHold", () => {
    it("should compute vacuum holding force F = dP * A * eta", () => {
      const r = fixtureDynamicsEngine.vacuumHold({
        vacuum_pressure_kpa: 80,
        contact_area_mm2: 10000,
        seal_efficiency: 0.85,
      });
      expect(r.holding_force_N).toBeGreaterThan(0);
      expect(r.safe_cutting_force_N).toBeGreaterThan(0);
      expect(r.safe_cutting_force_N).toBeLessThan(r.holding_force_N);
      expect(r.formula).toContain("F");
    });

    it("should reduce safe force with higher safety factor", () => {
      const r1 = fixtureDynamicsEngine.vacuumHold({
        vacuum_pressure_kpa: 80,
        contact_area_mm2: 10000,
        safety_factor: 2.0,
      });
      const r2 = fixtureDynamicsEngine.vacuumHold({
        vacuum_pressure_kpa: 80,
        contact_area_mm2: 10000,
        safety_factor: 3.0,
      });
      expect(r2.safe_cutting_force_N).toBeLessThan(r1.safe_cutting_force_N);
    });
  });

  describe("chuckSpeedEffect", () => {
    it("should compute centrifugal grip loss at speed", () => {
      const r = fixtureDynamicsEngine.chuckSpeedEffect({
        grip_force_N: 5000,
        jaw_mass_kg: 0.5,
        grip_radius_mm: 100,
        spindle_rpm: 3000,
      });
      expect(r.centrifugal_force_N).toBeGreaterThan(0);
      expect(r.effective_grip_N).toBeLessThan(5000);
      expect(r.critical_rpm).toBeGreaterThan(0);
      expect(r.omega_rad_s).toBeCloseTo(3000 * 2 * Math.PI / 60, 0);
    });

    it("should report critical RPM where grip reaches zero", () => {
      const r = fixtureDynamicsEngine.chuckSpeedEffect({
        grip_force_N: 2000,
        jaw_mass_kg: 1.0,
        grip_radius_mm: 150,
        spindle_rpm: 100,
      });
      expect(r.critical_rpm).toBeGreaterThan(100);
      expect(r.effective_grip_N).toBeGreaterThan(0);
    });
  });

  describe("adaptiveClamping", () => {
    it("should modulate force based on cutting load ratio", () => {
      const r = fixtureDynamicsEngine.adaptiveClamping({
        base_force_N: 1000,
        cutting_force_N: 500,
        max_cutting_force_N: 1000,
        alpha: 0.5,
      });
      // F = 1000 * (1 + 0.5 * 500/1000) = 1250
      expect(r.adaptive_force_N).toBeCloseTo(1250, 0);
      expect(r.force_ratio).toBeCloseTo(0.5, 2);
    });

    it("should clamp to max force when specified", () => {
      const r = fixtureDynamicsEngine.adaptiveClamping({
        base_force_N: 1000,
        cutting_force_N: 900,
        max_cutting_force_N: 1000,
        alpha: 1.0,
        max_force_N: 1500,
      });
      expect(r.adaptive_force_N).toBeLessThanOrEqual(1500);
    });
  });

  describe("clampLayout321", () => {
    it("should validate correct 3-2-1 locating scheme", () => {
      const r = fixtureDynamicsEngine.clampLayout321({
        primary_locators: 3,
        secondary_locators: 2,
        tertiary_locators: 1,
      });
      expect(r.is_valid_321).toBe(true);
      expect(r.dof_constrained).toBe(6);
      expect(r.overconstrained).toBe(false);
      expect(r.underconstrained).toBe(false);
    });

    it("should detect underconstrained layout", () => {
      const r = fixtureDynamicsEngine.clampLayout321({
        primary_locators: 2,
        secondary_locators: 1,
        tertiary_locators: 1,
      });
      expect(r.is_valid_321).toBe(false);
      expect(r.underconstrained).toBe(true);
      expect(r.dof_constrained).toBeLessThan(6);
    });

    it("should detect overconstrained layout", () => {
      const r = fixtureDynamicsEngine.clampLayout321({
        primary_locators: 4,
        secondary_locators: 3,
        tertiary_locators: 2,
      });
      expect(r.overconstrained).toBe(true);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });
});
