/**
 * MachineForceLimitValidationEngine Tests — MIO-MS0/U-MIO15
 */
import { describe, it, expect } from "vitest";
import { machineForceLimitValidationEngine } from "../engines/MachineForceLimitValidationEngine.js";

describe("MachineForceLimitValidationEngine", () => {
  const defaultSpecs = {
    spindle_power_continuous_kw: 15,
    spindle_power_30min_kw: 18,
    spindle_torque_max_nm: 120,
    spindle_max_rpm: 12000,
    spindle_base_rpm: 1500,
    axis_x_thrust_n: 8000,
    axis_y_thrust_n: 8000,
    axis_z_thrust_n: 10000,
    table_load_kg: 500,
    machine_name: "Test VMC",
  };

  describe("validate", () => {
    it("passes when all requirements are well within limits", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 30,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.overall_status).toBe("pass");
      expect(result.machine_suitable).toBe(true);
      expect(result.limiting_factor).toBeNull();
    });

    it("fails when power exceeds limit", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 20,
        torque_required_nm: 50,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.overall_status).toBe("fail");
      expect(result.machine_suitable).toBe(false);
      expect(result.limiting_factor).toBe("Spindle Power");
    });

    it("warns when power margin is low", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 13,
        torque_required_nm: 30,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.overall_status).toBe("warning");
      expect(result.machine_suitable).toBe(true);
    });

    it("fails when torque exceeds available at operating RPM", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 100,
        spindle_rpm: 6000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.checks.find(c => c.parameter === "Spindle Torque")).toBeDefined();
    });

    it("fails when axis thrust exceeds limit", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 30,
        spindle_rpm: 3000,
        force_x_n: 10000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.overall_status).toBe("fail");
      expect(result.limiting_factor).toBe("X-Axis Thrust");
    });

    it("checks table load when provided", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 50,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
        part_weight_kg: 100,
        fixture_weight_kg: 50,
      }, defaultSpecs);

      const tableCheck = result.checks.find(c => c.parameter === "Table Load");
      expect(tableCheck).toBeDefined();
      expect(tableCheck?.required).toBe(150);
    });

    it("provides recommendations for failures", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 20,
        torque_required_nm: 50,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("provides AI reasoning trace", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 50,
        spindle_rpm: 3000,
        force_x_n: 2000,
        force_y_n: 1500,
        force_z_n: 3000,
      }, defaultSpecs);

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[MACHINE-VALID]"))).toBe(true);
    });
  });

  describe("torque at RPM calculation", () => {
    it("returns max torque below base RPM", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 110,
        spindle_rpm: 1000,
        force_x_n: 0,
        force_y_n: 0,
        force_z_n: 0,
      }, defaultSpecs);

      const torqueCheck = result.checks.find(c => c.parameter === "Spindle Torque");
      expect(torqueCheck?.available).toBe(120);
    });

    it("reduces torque above base RPM (constant power)", () => {
      const result = machineForceLimitValidationEngine.validate({
        power_required_kw: 5,
        torque_required_nm: 20,
        spindle_rpm: 8000,
        force_x_n: 0,
        force_y_n: 0,
        force_z_n: 0,
      }, defaultSpecs);

      const torqueCheck = result.checks.find(c => c.parameter === "Spindle Torque");
      expect(torqueCheck?.available).toBeLessThan(120);
    });
  });

  describe("quickValidate", () => {
    it("returns suitability for simple check", () => {
      const result = machineForceLimitValidationEngine.quickValidate(5, 30, 3000, defaultSpecs);

      expect(result.suitable).toBe(true);
      expect(result.limiting_factor).toBeNull();
    });

    it("identifies limiting factor when not suitable", () => {
      const result = machineForceLimitValidationEngine.quickValidate(20, 50, 3000, defaultSpecs);

      expect(result.suitable).toBe(false);
      expect(result.limiting_factor).toBe("Spindle Power");
    });
  });
});
