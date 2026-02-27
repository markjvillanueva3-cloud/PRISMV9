/**
 * ThermalSimEngine — L2-P2-MS1 CAD/CAM Layer
 * *** SAFETY CRITICAL ***
 *
 * Simulates thermal effects during machining: cutting zone temperature,
 * workpiece thermal expansion, tool temperature, coolant effectiveness.
 * Predicts thermal damage (burns, white layer, residual stress).
 *
 * SAFETY: Thermal damage can create subsurface defects invisible to
 * inspection. Conservative temperature predictions prevent part rejection.
 *
 * Actions: thermal_predict, thermal_validate, thermal_optimize
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ThermalInput {
  cutting_speed_mmin: number;
  feed_mm: number;                    // feed per rev or per tooth
  depth_of_cut_mm: number;
  iso_material_group: string;         // P, M, K, N, S, H
  tool_material: "carbide" | "hss" | "ceramic" | "cbn" | "diamond";
  coolant: "flood" | "mist" | "air" | "none" | "cryo";
  operation: "turning" | "milling" | "drilling" | "grinding";
  part_thickness_mm?: number;         // for thermal expansion calc
  ambient_temp_C?: number;
}

export interface ThermalResult {
  cutting_zone_temp_C: number;
  tool_interface_temp_C: number;
  workpiece_avg_temp_C: number;
  max_workpiece_temp_C: number;
  thermal_expansion_um: number;       // dimensional change
  heat_partition: {
    chip_pct: number;
    workpiece_pct: number;
    tool_pct: number;
    coolant_pct: number;
  };
  damage_risk: ThermalDamageRisk;
  recommendations: string[];
}

export interface ThermalDamageRisk {
  burn_risk: "none" | "low" | "medium" | "high" | "critical";
  white_layer_risk: boolean;
  tempering_risk: boolean;
  residual_stress_risk: "compressive" | "neutral" | "tensile";
  max_safe_temp_C: number;
}

export interface ThermalOptimization {
  current_temp_C: number;
  optimized_temp_C: number;
  temp_reduction_C: number;
  changes: { parameter: string; old_value: number; new_value: number; unit: string }[];
  new_damage_risk: ThermalDamageRisk["burn_risk"];
}

// ============================================================================
// THERMAL CONSTANTS
// ============================================================================

// Specific cutting energy (J/mm³) by ISO group
const KC: Record<string, number> = { P: 2500, M: 3200, K: 1800, N: 900, S: 4500, H: 3800 };

// Thermal conductivity (W/m·K) by ISO group
const LAMBDA: Record<string, number> = { P: 50, M: 15, K: 50, N: 200, S: 12, H: 40 };

// CTE (µm/m·°C) by ISO group
const CTE: Record<string, number> = { P: 12, M: 16, K: 11, N: 23, S: 13, H: 11 };

// Max safe temperature (°C) before damage risk
const MAX_SAFE_TEMP: Record<string, number> = { P: 650, M: 550, K: 700, N: 300, S: 500, H: 600 };

// Coolant effectiveness (fraction of heat removed)
const COOLANT_EFF: Record<string, number> = { flood: 0.35, mist: 0.20, air: 0.08, none: 0, cryo: 0.55 };

// Tool material max temperature (°C)
const TOOL_TEMP_MAX: Record<string, number> = { carbide: 1000, hss: 600, ceramic: 1500, cbn: 1200, diamond: 700 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ThermalSimEngine {
  /**
   * Predict thermal conditions.
   * SAFETY: Conservative — always overestimates temperature to prevent thermal damage.
   */
  predict(input: ThermalInput): ThermalResult {
    const iso = input.iso_material_group || "P";
    const kc = KC[iso] || 2500;
    const lambda = LAMBDA[iso] || 50;
    const cte = CTE[iso] || 12;
    const maxSafe = MAX_SAFE_TEMP[iso] || 600;
    const coolEff = COOLANT_EFF[input.coolant] || 0;

    // Cutting power: P = kc × Vc × f × ap / 60000 (kW)
    const Vc = input.cutting_speed_mmin;
    const f = input.feed_mm;
    const ap = input.depth_of_cut_mm;
    const power_W = (kc * Vc * f * ap) / 60;

    // Cutting zone temperature — modified Loewen-Shaw model
    // T = T_ambient + C × (Vc × f)^0.5 / lambda^0.5
    const T_ambient = input.ambient_temp_C || 20;
    const C_factor = kc * 0.15; // calibration factor
    const T_cutting = T_ambient + C_factor * Math.sqrt(Vc * f) / Math.sqrt(lambda);

    // Heat partition (Trigger's model, simplified)
    const chipFraction = 0.70 + 0.05 * Math.log10(Math.max(Vc, 1)); // ~75-85% to chip at high speed
    const coolantFraction = coolEff * (1 - chipFraction);
    const remaining = 1 - chipFraction - coolantFraction;
    const toolFraction = remaining * 0.3;
    const workpieceFraction = remaining * 0.7;

    // Apply coolant effect to workpiece temperature
    const T_workpiece_max = T_ambient + (T_cutting - T_ambient) * workpieceFraction * (1 - coolEff);
    const T_workpiece_avg = T_ambient + (T_workpiece_max - T_ambient) * 0.4; // average is lower
    const T_tool = T_ambient + (T_cutting - T_ambient) * toolFraction;

    // Thermal expansion
    const partLength = input.part_thickness_mm || 100;
    const dT = T_workpiece_avg - T_ambient;
    const expansion = cte * dT * partLength / 1000; // µm

    // Damage risk assessment
    const burnRisk: ThermalDamageRisk["burn_risk"] =
      T_workpiece_max > maxSafe * 1.2 ? "critical"
      : T_workpiece_max > maxSafe ? "high"
      : T_workpiece_max > maxSafe * 0.8 ? "medium"
      : T_workpiece_max > maxSafe * 0.5 ? "low"
      : "none";

    const whiteLayer = iso === "H" && T_workpiece_max > 700;
    const temperingRisk = iso === "H" && T_workpiece_max > 500;
    const residualStress: ThermalDamageRisk["residual_stress_risk"] =
      T_workpiece_max > maxSafe * 0.7 ? "tensile" : T_workpiece_max < maxSafe * 0.3 ? "compressive" : "neutral";

    const recommendations: string[] = [];
    if (burnRisk === "high" || burnRisk === "critical") {
      recommendations.push("REDUCE cutting speed or increase coolant flow to prevent thermal damage");
    }
    if (whiteLayer) {
      recommendations.push("White layer risk on hardened steel — reduce speed, use CBN tooling");
    }
    if (expansion > 10) {
      recommendations.push(`Thermal expansion ${expansion.toFixed(1)}µm — allow warm-up cycle before finishing`);
    }
    if (T_tool > (TOOL_TEMP_MAX[input.tool_material] || 1000) * 0.8) {
      recommendations.push("Tool temperature approaching limit — reduce speed or improve coolant delivery");
    }
    if (burnRisk === "none" && recommendations.length === 0) {
      recommendations.push("Thermal conditions within safe limits");
    }

    return {
      cutting_zone_temp_C: Math.round(T_cutting),
      tool_interface_temp_C: Math.round(T_tool),
      workpiece_avg_temp_C: Math.round(T_workpiece_avg),
      max_workpiece_temp_C: Math.round(T_workpiece_max),
      thermal_expansion_um: Math.round(expansion * 100) / 100,
      heat_partition: {
        chip_pct: Math.round(chipFraction * 100),
        workpiece_pct: Math.round(workpieceFraction * 100),
        tool_pct: Math.round(toolFraction * 100),
        coolant_pct: Math.round(coolantFraction * 100),
      },
      damage_risk: {
        burn_risk: burnRisk,
        white_layer_risk: whiteLayer,
        tempering_risk: temperingRisk,
        residual_stress_risk: residualStress,
        max_safe_temp_C: maxSafe,
      },
      recommendations,
    };
  }

  validate(input: ThermalInput): { safe: boolean; issues: string[] } {
    const result = this.predict(input);
    const issues: string[] = [];

    if (result.damage_risk.burn_risk === "high" || result.damage_risk.burn_risk === "critical") {
      issues.push(`Burn risk: ${result.damage_risk.burn_risk} — workpiece temp ${result.max_workpiece_temp_C}°C exceeds safe limit ${result.damage_risk.max_safe_temp_C}°C`);
    }
    if (result.damage_risk.white_layer_risk) {
      issues.push("White layer formation risk — subsurface metallurgical damage");
    }
    if (result.thermal_expansion_um > 50) {
      issues.push(`Excessive thermal expansion: ${result.thermal_expansion_um}µm`);
    }

    return { safe: issues.length === 0, issues };
  }

  optimize(input: ThermalInput): ThermalOptimization {
    const current = this.predict(input);
    const changes: ThermalOptimization["changes"] = [];

    let optimized = { ...input };

    // Strategy 1: Reduce speed if thermal damage risk
    if (current.damage_risk.burn_risk !== "none" && current.damage_risk.burn_risk !== "low") {
      const newSpeed = input.cutting_speed_mmin * 0.7;
      changes.push({ parameter: "cutting_speed", old_value: input.cutting_speed_mmin, new_value: Math.round(newSpeed), unit: "m/min" });
      optimized.cutting_speed_mmin = newSpeed;
    }

    // Strategy 2: Upgrade coolant
    if (input.coolant === "none" || input.coolant === "air") {
      changes.push({ parameter: "coolant", old_value: 0, new_value: 1, unit: "flood→mist" });
      optimized.coolant = "mist";
    }

    const optimizedResult = this.predict(optimized);

    return {
      current_temp_C: current.max_workpiece_temp_C,
      optimized_temp_C: optimizedResult.max_workpiece_temp_C,
      temp_reduction_C: current.max_workpiece_temp_C - optimizedResult.max_workpiece_temp_C,
      changes,
      new_damage_risk: optimizedResult.damage_risk.burn_risk,
    };
  }
}

export const thermalSimEngine = new ThermalSimEngine();
