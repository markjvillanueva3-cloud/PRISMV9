/**
 * Thermal Partition + Power/Torque Model
 *
 * Combines three related calculations:
 *
 * 1. Shear Plane Temperature (Trigger-Chao):
 *    ΔT_shear = τ_s / (ρ·c) × f(R_t)
 *    where R_t = V_s·L / α is the thermal number
 *
 * 2. Cutting Power:
 *    P_cut = Fc × Vc / 60000  [kW]
 *    P_spindle = P_cut / η
 *
 * 3. Spindle Torque:
 *    M = P × 9549 / N  [Nm]
 *
 * References:
 * - Trigger, K.J. & Chao, B.T. (1951). "An Analytical Evaluation of
 *   Metal-Cutting Temperatures"
 * - Loewen, E.G. & Shaw, M.C. (1954). "On the Analysis of Cutting-Tool
 *   Temperatures"
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.3
 *
 * @module algorithms/ThermalPartitionModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface ThermalInput {
  /** Cutting force Fc [N]. */
  cutting_force: number;
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Tool diameter [mm] (for RPM and torque). */
  tool_diameter: number;
  /** Machine spindle efficiency (0.1-1.0, default 0.80). */
  efficiency?: number;
  /** Feed [mm/rev] (for thermal calculation). */
  feed?: number;
  /** Shear strength τ_s [MPa] (for thermal, default 400). */
  shear_strength?: number;
  /** Shear angle [radians] (default 0.52 ≈ 30°). */
  shear_angle?: number;
  /** Rake angle [radians] (default 0.1 ≈ 6°). */
  rake_angle?: number;
  /** Workpiece density [kg/m³] (default 7850 — steel). */
  density?: number;
  /** Workpiece specific heat [J/(kg·K)] (default 500). */
  specific_heat?: number;
  /** Workpiece thermal conductivity [W/(m·K)] (default 50). */
  thermal_conductivity?: number;
  /** Ambient temperature [°C] (default 25). */
  ambient_temp?: number;
}

export interface ThermalOutput extends WithWarnings {
  /** Net cutting power [kW]. */
  power_cutting_kw: number;
  /** Required spindle power [kW] (accounting for efficiency). */
  power_spindle_kw: number;
  /** Required spindle power [HP]. */
  power_spindle_hp: number;
  /** Spindle torque [Nm]. */
  torque_nm: number;
  /** Spindle RPM. */
  rpm: number;
  /** Efficiency used. */
  efficiency: number;
  /** Shear zone temperature rise [°C] (if feed provided). */
  shear_zone_temp_rise?: number;
  /** Estimated shear zone temperature [°C] (if feed provided). */
  shear_zone_temp?: number;
  /** Thermal number R_t [-] (if feed provided). */
  thermal_number?: number;
  /** Heat regime classification. */
  heat_regime?: "high_speed" | "low_speed";
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_POWER: 200,         // kW
  MAX_FORCE: 100000,      // N
  MAX_CUTTING_SPEED: 2000, // m/min
  MIN_CUTTING_SPEED: 0.1,
  MAX_TORQUE: 10000,      // Nm
  MAX_TEMP: 1500,         // °C
};

// ── Algorithm Implementation ────────────────────────────────────────

export class ThermalPartitionModel implements Algorithm<ThermalInput, ThermalOutput> {

  validate(input: ThermalInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.cutting_force || input.cutting_force <= 0 || input.cutting_force > LIMITS.MAX_FORCE) {
      issues.push({ field: "cutting_force", message: `Cutting force must be 0-${LIMITS.MAX_FORCE} N, got ${input.cutting_force}`, severity: "error" });
    }
    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_CUTTING_SPEED || input.cutting_speed > LIMITS.MAX_CUTTING_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_CUTTING_SPEED}-${LIMITS.MAX_CUTTING_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    if (!input.tool_diameter || input.tool_diameter <= 0) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be > 0, got ${input.tool_diameter}`, severity: "error" });
    }
    if (input.efficiency !== undefined && (input.efficiency < 0.1 || input.efficiency > 1.0)) {
      issues.push({ field: "efficiency", message: `Efficiency must be 0.1-1.0, got ${input.efficiency}`, severity: "error" });
    }
    if (input.feed !== undefined && (input.feed <= 0 || input.feed > 5)) {
      issues.push({ field: "feed", message: `Feed must be 0-5 mm, got ${input.feed}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ThermalInput): ThermalOutput {
    const warnings: string[] = [];
    const {
      cutting_force, cutting_speed, tool_diameter,
      efficiency = 0.80,
      feed,
      shear_strength = 400,
      shear_angle = 0.52,       // ~30°
      rake_angle = 0.1,         // ~6°
      density = 7850,
      specific_heat = 500,
      thermal_conductivity = 50,
      ambient_temp = 25,
    } = input;

    // ── Power calculation ──
    const power_cutting_kw = (cutting_force * cutting_speed) / 60000;
    let power_spindle_kw = power_cutting_kw / efficiency;

    // Safety cap
    if (power_spindle_kw > LIMITS.MAX_POWER) {
      warnings.push(`Spindle power ${power_spindle_kw.toFixed(1)} kW exceeds limit — verify machine rating`);
      power_spindle_kw = Math.min(power_spindle_kw, LIMITS.MAX_POWER);
    }

    const power_spindle_hp = power_spindle_kw * 1.341;

    // ── RPM and torque ──
    const rpm = tool_diameter > 0 ? (cutting_speed * 1000) / (Math.PI * tool_diameter) : 0;
    let torque_nm = rpm > 0 ? (power_spindle_kw * 9549) / rpm : 0;

    if (torque_nm > LIMITS.MAX_TORQUE) {
      warnings.push(`Torque ${torque_nm.toFixed(0)} Nm exceeds limit — verify spindle rating`);
    }

    // ── Thermal partition (Trigger-Chao model, if feed provided) ──
    let shear_zone_temp_rise: number | undefined;
    let shear_zone_temp: number | undefined;
    let thermal_number: number | undefined;
    let heat_regime: "high_speed" | "low_speed" | undefined;

    if (feed && feed > 0) {
      // Thermal diffusivity
      const alpha_th = thermal_conductivity / (density * specific_heat);

      // Cutting velocity in m/s
      const V_ms = cutting_speed / 60;

      // Shear velocity
      const V_s = V_ms * Math.cos(rake_angle) / Math.cos(shear_angle - rake_angle);

      // Chip thickness and shear plane length
      const t_1 = feed / 1000; // m
      const L = t_1 / Math.sin(shear_angle);

      // Thermal number
      const R_t = V_s * L / alpha_th;
      thermal_number = R_t;

      // Temperature rise
      let theta_s: number;
      if (R_t > 10) {
        // High speed: most heat goes to chip
        theta_s = 0.4 * shear_strength * 1e6 / (density * specific_heat);
        heat_regime = "high_speed";
      } else {
        // Low speed: heat shared between chip and workpiece
        theta_s = (shear_strength * 1e6 / (density * specific_heat)) * (1 / (1 + Math.sqrt(1 / Math.max(R_t, 0.001))));
        heat_regime = "low_speed";
      }

      shear_zone_temp_rise = theta_s;
      shear_zone_temp = ambient_temp + theta_s;

      // Clamp and warn
      if (shear_zone_temp > LIMITS.MAX_TEMP) {
        warnings.push(`Predicted shear zone temp ${shear_zone_temp.toFixed(0)}°C exceeds ${LIMITS.MAX_TEMP}°C — model may be inaccurate`);
        shear_zone_temp = LIMITS.MAX_TEMP;
        shear_zone_temp_rise = LIMITS.MAX_TEMP - ambient_temp;
      }
      if (shear_zone_temp > 700) {
        warnings.push(`High shear zone temperature (${shear_zone_temp.toFixed(0)}°C) — consider coolant or speed reduction`);
      }
    }

    // Power warnings
    if (power_cutting_kw > 50) {
      warnings.push(`High cutting power (${power_cutting_kw.toFixed(1)} kW) — verify machine capability`);
    }

    return {
      power_cutting_kw: Math.round(power_cutting_kw * 1000) / 1000,
      power_spindle_kw: Math.round(power_spindle_kw * 1000) / 1000,
      power_spindle_hp: Math.round(power_spindle_hp * 1000) / 1000,
      torque_nm: Math.round(torque_nm * 100) / 100,
      rpm: Math.round(rpm),
      efficiency,
      shear_zone_temp_rise: shear_zone_temp_rise !== undefined ? Math.round(shear_zone_temp_rise * 10) / 10 : undefined,
      shear_zone_temp: shear_zone_temp !== undefined ? Math.round(shear_zone_temp * 10) / 10 : undefined,
      thermal_number: thermal_number !== undefined ? Math.round(thermal_number * 100) / 100 : undefined,
      heat_regime,
      warnings,
      calculation_method: "Thermal Partition (Trigger-Chao) + Power/Torque (P = Fc·Vc/60000)",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "thermal-power",
      name: "Thermal Partition + Power/Torque Model",
      description: "Calculates cutting power, spindle torque, and shear zone temperature",
      formula: "P = Fc·Vc/60000; M = P·9549/N; ΔT = f(τ_s, R_t)",
      reference: "Trigger & Chao (1951); Loewen & Shaw (1954); Altintas (2012) Ch.3",
      safety_class: "standard",
      domain: "thermal",
      inputs: {
        cutting_force: "Cutting force Fc [N]",
        cutting_speed: "Cutting speed [m/min]",
        tool_diameter: "Tool diameter [mm]",
        efficiency: "Spindle efficiency [-]",
        feed: "Feed [mm/rev] (for thermal)",
      },
      outputs: {
        power_cutting_kw: "Net cutting power [kW]",
        power_spindle_kw: "Required spindle power [kW]",
        torque_nm: "Spindle torque [Nm]",
        shear_zone_temp: "Shear zone temperature [°C]",
      },
    };
  }
}
