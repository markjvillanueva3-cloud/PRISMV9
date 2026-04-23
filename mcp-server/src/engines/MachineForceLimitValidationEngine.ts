/**
 * MachineForceLimitValidationEngine — MIO-MS0/U-MIO15
 *
 * Validates that planned cutting operations are within machine capabilities.
 * Checks spindle power/torque, axis thrust limits, and table load capacity.
 *
 * Validation Checks:
 * 1. Spindle power: P_required <= P_available (continuous or 30-min)
 * 2. Spindle torque: T_required <= T_available at operating RPM
 * 3. Axis thrust: F_axis <= F_max per axis (X, Y, Z)
 * 4. Table load: W_part + W_fixture <= W_max
 *
 * Margins:
 * - Power margin < 20%: warning
 * - Torque margin < 15%: warning
 * - Axis thrust margin < 10%: warning
 *
 * @module engines/MachineForceLimitValidationEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface CuttingRequirements {
  power_required_kw: number;
  torque_required_nm: number;
  spindle_rpm: number;
  force_x_n: number;
  force_y_n: number;
  force_z_n: number;
  part_weight_kg?: number;
  fixture_weight_kg?: number;
}

export interface MachineSpecs {
  spindle_power_continuous_kw: number;
  spindle_power_30min_kw?: number;
  spindle_torque_max_nm: number;
  spindle_max_rpm: number;
  spindle_base_rpm?: number;
  axis_x_thrust_n: number;
  axis_y_thrust_n: number;
  axis_z_thrust_n: number;
  table_load_kg: number;
  machine_name?: string;
}

export interface ValidationCheck {
  parameter: string;
  required: number;
  available: number;
  margin_pct: number;
  status: "pass" | "warning" | "fail";
  message: string;
}

export interface ValidationResult {
  overall_status: "pass" | "warning" | "fail";
  checks: ValidationCheck[];
  machine_suitable: boolean;
  limiting_factor: string | null;
  recommendations: string[];
  ai_reasoning: string[];
}

// Default machine specs (typical VMC)
const DEFAULT_MACHINE_SPECS: MachineSpecs = {
  spindle_power_continuous_kw: 15,
  spindle_power_30min_kw: 18,
  spindle_torque_max_nm: 120,
  spindle_max_rpm: 12000,
  spindle_base_rpm: 1500,
  axis_x_thrust_n: 8000,
  axis_y_thrust_n: 8000,
  axis_z_thrust_n: 10000,
  table_load_kg: 500,
  machine_name: "Generic VMC",
};

class MachineForceLimitValidationEngine {
  /**
   * Validate cutting requirements against machine capabilities
   */
  validate(
    requirements: CuttingRequirements,
    machineSpecs?: MachineSpecs
  ): ValidationResult {
    const specs = machineSpecs || DEFAULT_MACHINE_SPECS;
    const reasoning: string[] = [];
    const checks: ValidationCheck[] = [];
    const recommendations: string[] = [];

    reasoning.push(`[MACHINE-VALID] Validating against ${specs.machine_name || "machine"}`);

    // 1. Spindle power check
    const powerAvailable = specs.spindle_power_continuous_kw;
    const powerMargin = ((powerAvailable - requirements.power_required_kw) / powerAvailable) * 100;
    const powerStatus = this.checkMargin(powerMargin, 20, 10);

    checks.push({
      parameter: "Spindle Power",
      required: requirements.power_required_kw,
      available: powerAvailable,
      margin_pct: powerMargin,
      status: powerStatus,
      message: `${requirements.power_required_kw.toFixed(1)} / ${powerAvailable} kW (${powerMargin.toFixed(0)}% margin)`,
    });

    if (powerStatus !== "pass") {
      reasoning.push(`[MACHINE-VALID] Power: ${powerStatus.toUpperCase()} — ${powerMargin.toFixed(0)}% margin`);
      if (powerStatus === "fail") {
        recommendations.push("Reduce depth of cut or feedrate to lower power requirement");
      }
    }

    // 2. Spindle torque check (at operating RPM)
    const torqueAvailable = this.torqueAtRpm(requirements.spindle_rpm, specs);
    const torqueMargin = ((torqueAvailable - requirements.torque_required_nm) / torqueAvailable) * 100;
    const torqueStatus = this.checkMargin(torqueMargin, 15, 5);

    checks.push({
      parameter: "Spindle Torque",
      required: requirements.torque_required_nm,
      available: torqueAvailable,
      margin_pct: torqueMargin,
      status: torqueStatus,
      message: `${requirements.torque_required_nm.toFixed(1)} / ${torqueAvailable.toFixed(1)} Nm @ ${requirements.spindle_rpm} RPM (${torqueMargin.toFixed(0)}% margin)`,
    });

    if (torqueStatus !== "pass") {
      reasoning.push(`[MACHINE-VALID] Torque: ${torqueStatus.toUpperCase()} — ${torqueMargin.toFixed(0)}% margin at ${requirements.spindle_rpm} RPM`);
      if (torqueStatus === "fail") {
        recommendations.push("Increase spindle RPM to access more torque (constant power region)");
        recommendations.push("Or reduce chip load to lower torque requirement");
      }
    }

    // 3. Axis thrust checks
    const axisChecks = [
      { axis: "X", required: Math.abs(requirements.force_x_n), available: specs.axis_x_thrust_n },
      { axis: "Y", required: Math.abs(requirements.force_y_n), available: specs.axis_y_thrust_n },
      { axis: "Z", required: Math.abs(requirements.force_z_n), available: specs.axis_z_thrust_n },
    ];

    for (const { axis, required, available } of axisChecks) {
      const margin = ((available - required) / available) * 100;
      const status = this.checkMargin(margin, 10, 0);

      checks.push({
        parameter: `${axis}-Axis Thrust`,
        required,
        available,
        margin_pct: margin,
        status,
        message: `${required.toFixed(0)} / ${available} N (${margin.toFixed(0)}% margin)`,
      });

      if (status !== "pass") {
        reasoning.push(`[MACHINE-VALID] ${axis}-axis: ${status.toUpperCase()} — ${margin.toFixed(0)}% margin`);
      }
    }

    // 4. Table load check
    const totalWeight = (requirements.part_weight_kg || 0) + (requirements.fixture_weight_kg || 0);
    if (totalWeight > 0) {
      const loadMargin = ((specs.table_load_kg - totalWeight) / specs.table_load_kg) * 100;
      const loadStatus = this.checkMargin(loadMargin, 20, 5);

      checks.push({
        parameter: "Table Load",
        required: totalWeight,
        available: specs.table_load_kg,
        margin_pct: loadMargin,
        status: loadStatus,
        message: `${totalWeight.toFixed(0)} / ${specs.table_load_kg} kg (${loadMargin.toFixed(0)}% margin)`,
      });

      if (loadStatus !== "pass") {
        reasoning.push(`[MACHINE-VALID] Table load: ${loadStatus.toUpperCase()} — ${loadMargin.toFixed(0)}% margin`);
      }
    }

    // Determine overall status
    const failChecks = checks.filter(c => c.status === "fail");
    const warnChecks = checks.filter(c => c.status === "warning");

    let overallStatus: "pass" | "warning" | "fail" = "pass";
    let limitingFactor: string | null = null;

    if (failChecks.length > 0) {
      overallStatus = "fail";
      limitingFactor = failChecks[0].parameter;
    } else if (warnChecks.length > 0) {
      overallStatus = "warning";
      limitingFactor = warnChecks[0].parameter;
    }

    reasoning.push(`[MACHINE-VALID] Overall: ${overallStatus.toUpperCase()}${limitingFactor ? ` (limited by ${limitingFactor})` : ""}`);

    return {
      overall_status: overallStatus,
      checks,
      machine_suitable: overallStatus !== "fail",
      limiting_factor: limitingFactor,
      recommendations,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Calculate available torque at given RPM
   * Below base RPM: constant torque
   * Above base RPM: constant power (torque drops)
   */
  private torqueAtRpm(rpm: number, specs: MachineSpecs): number {
    const baseRpm = specs.spindle_base_rpm || specs.spindle_max_rpm * 0.125;

    if (rpm <= baseRpm) {
      return specs.spindle_torque_max_nm;
    }

    // Constant power region: T = P × 9549 / RPM
    const power = specs.spindle_power_continuous_kw;
    return (power * 9549) / rpm;
  }

  /**
   * Check margin and return status
   */
  private checkMargin(margin: number, warnThreshold: number, failThreshold: number): "pass" | "warning" | "fail" {
    if (margin < failThreshold) return "fail";
    if (margin < warnThreshold) return "warning";
    return "pass";
  }

  /**
   * Quick validation for orchestrator
   */
  quickValidate(
    powerKw: number,
    torqueNm: number,
    rpm: number,
    machineSpecs?: MachineSpecs
  ): { suitable: boolean; limiting_factor: string | null } {
    const result = this.validate({
      power_required_kw: powerKw,
      torque_required_nm: torqueNm,
      spindle_rpm: rpm,
      force_x_n: 0,
      force_y_n: 0,
      force_z_n: 0,
    }, machineSpecs);

    return {
      suitable: result.machine_suitable,
      limiting_factor: result.limiting_factor,
    };
  }
}

export const machineForceLimitValidationEngine = new MachineForceLimitValidationEngine();
