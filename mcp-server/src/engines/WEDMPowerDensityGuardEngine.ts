/**
 * WEDMPowerDensityGuardEngine — Power Density Safety Validation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-03
 *
 * Validates power density at the cut front to prevent:
 * - Excessive material removal rate causing wire lag
 * - Thermal damage to workpiece surface
 * - Recast layer beyond acceptable limits
 *
 * Physics basis:
 * - Power density P/A = (Ip × Vg × D) / (kerf × thickness)
 * - Where D = duty cycle, kerf ≈ wire_dia + 2×overcut
 * - Typical overcut: 0.02-0.05mm per side
 *
 * @module engines/WEDMPowerDensityGuardEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PowerDensityInput {
  /** Peak discharge current in Amps */
  peak_current_A: number;
  /** Gap voltage in Volts (typical 60-80V) */
  gap_voltage_V?: number;
  /** Duty cycle (0-1) */
  duty_cycle: number;
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Overcut per side in mm (typically 0.02-0.05) */
  overcut_mm?: number;
  /** Workpiece thickness in mm */
  workpiece_thickness_mm: number;
  /** Workpiece material */
  workpiece_material?: string;
  /** Operation type */
  operation_type?: "roughing" | "finishing" | "skim";
}

export interface PowerDensityResult {
  /** Whether power density is safe */
  safe: boolean;
  /** Average power in Watts */
  avg_power_W: number;
  /** Kerf width in mm */
  kerf_width_mm: number;
  /** Cut front area in mm² */
  cut_front_area_mm2: number;
  /** Power density in W/mm² */
  power_density_W_mm2: number;
  /** Maximum allowed power density */
  max_power_density_W_mm2: number;
  /** Utilization percentage */
  utilization_pct: number;
  /** Estimated MRR in mm³/min */
  estimated_mrr_mm3_min: number;
  /** Warning if approaching limit */
  warning?: string;
  /** Block reason if unsafe */
  block_reason?: string;
}

export interface PowerDensityConfig {
  /** Default gap voltage */
  default_gap_voltage_V: number;
  /** Default overcut per side */
  default_overcut_mm: number;
  /** Max power density for roughing (W/mm²) */
  max_power_density_roughing: number;
  /** Max power density for finishing (W/mm²) */
  max_power_density_finishing: number;
  /** Warning threshold (fraction of max) */
  warning_threshold: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: PowerDensityConfig = {
  default_gap_voltage_V: 70,
  default_overcut_mm: 0.03,
  max_power_density_roughing: 50,
  max_power_density_finishing: 20,
  warning_threshold: 0.75,
};

// Material-specific power density multipliers (relative to steel baseline)
const MATERIAL_MULTIPLIERS: Record<string, number> = {
  steel: 1.0,
  tool_steel: 1.0,
  stainless: 0.9,
  aluminum: 1.3,
  copper: 0.8,
  brass: 0.9,
  titanium: 0.7,
  tungsten_carbide: 0.5,
  carbide: 0.5,
  inconel: 0.6,
  graphite: 1.5,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMPowerDensityGuardEngine {
  private config: PowerDensityConfig;

  constructor(config: Partial<PowerDensityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate kerf width from wire diameter and overcut.
   * Formula: kerf = wire_diameter + 2 × overcut
   */
  calculateKerfWidth(wire_diameter_mm: number, overcut_mm: number): number {
    return wire_diameter_mm + 2 * overcut_mm;
  }

  /**
   * Calculate cut front area.
   * Formula: A = kerf × thickness
   */
  calculateCutFrontArea(kerf_mm: number, thickness_mm: number): number {
    return kerf_mm * thickness_mm;
  }

  /**
   * Calculate average power.
   * Formula: P_avg = Ip × Vg × D
   */
  calculateAveragePower(
    peak_current_A: number,
    gap_voltage_V: number,
    duty_cycle: number
  ): number {
    return peak_current_A * gap_voltage_V * duty_cycle;
  }

  /**
   * Calculate power density at cut front.
   * Formula: P/A = P_avg / cut_front_area
   */
  calculatePowerDensity(avg_power_W: number, cut_front_area_mm2: number): number {
    if (cut_front_area_mm2 <= 0) {
      throw new Error("Cut front area must be positive");
    }
    return avg_power_W / cut_front_area_mm2;
  }

  /**
   * Get max power density for operation type and material.
   */
  getMaxPowerDensity(
    operation_type: "roughing" | "finishing" | "skim" = "roughing",
    material?: string
  ): number {
    let base: number;
    switch (operation_type) {
      case "finishing":
      case "skim":
        base = this.config.max_power_density_finishing;
        break;
      default:
        base = this.config.max_power_density_roughing;
    }

    // Apply material multiplier if specified
    if (material) {
      const mat = material.toLowerCase().replace(/[- ]/g, "_");
      const multiplier = MATERIAL_MULTIPLIERS[mat] ?? 1.0;
      return base * multiplier;
    }

    return base;
  }

  /**
   * Estimate MRR from power (empirical correlation).
   * Typical WEDM: MRR ≈ 0.5-2.0 mm³/min per 100W
   */
  estimateMRR(avg_power_W: number, operation_type: "roughing" | "finishing" | "skim" = "roughing"): number {
    const efficiency = operation_type === "roughing" ? 0.015 : 0.008; // mm³/min per W
    return avg_power_W * efficiency;
  }

  /**
   * Validate power density against safety limits.
   */
  validate(input: PowerDensityInput): PowerDensityResult {
    // Input validation
    if (input.peak_current_A <= 0) {
      return {
        safe: false,
        avg_power_W: 0,
        kerf_width_mm: 0,
        cut_front_area_mm2: 0,
        power_density_W_mm2: 0,
        max_power_density_W_mm2: 0,
        utilization_pct: 0,
        estimated_mrr_mm3_min: 0,
        block_reason: "Invalid peak current: must be positive",
      };
    }

    if (input.duty_cycle <= 0 || input.duty_cycle > 1) {
      return {
        safe: false,
        avg_power_W: 0,
        kerf_width_mm: 0,
        cut_front_area_mm2: 0,
        power_density_W_mm2: 0,
        max_power_density_W_mm2: 0,
        utilization_pct: 0,
        estimated_mrr_mm3_min: 0,
        block_reason: "Invalid duty cycle: must be between 0 and 1",
      };
    }

    if (input.workpiece_thickness_mm <= 0) {
      return {
        safe: false,
        avg_power_W: 0,
        kerf_width_mm: 0,
        cut_front_area_mm2: 0,
        power_density_W_mm2: 0,
        max_power_density_W_mm2: 0,
        utilization_pct: 0,
        estimated_mrr_mm3_min: 0,
        block_reason: "Invalid workpiece thickness: must be positive",
      };
    }

    // Calculate parameters
    const gapVoltage = input.gap_voltage_V ?? this.config.default_gap_voltage_V;
    const overcut = input.overcut_mm ?? this.config.default_overcut_mm;

    const kerfWidth = this.calculateKerfWidth(input.wire_diameter_mm, overcut);
    const cutFrontArea = this.calculateCutFrontArea(kerfWidth, input.workpiece_thickness_mm);
    const avgPower = this.calculateAveragePower(input.peak_current_A, gapVoltage, input.duty_cycle);
    const powerDensity = this.calculatePowerDensity(avgPower, cutFrontArea);
    const maxPowerDensity = this.getMaxPowerDensity(input.operation_type, input.workpiece_material);
    const utilization = (powerDensity / maxPowerDensity) * 100;
    const estimatedMRR = this.estimateMRR(avgPower, input.operation_type);

    // Check safety
    const safe = powerDensity <= maxPowerDensity;

    // Build result
    const result: PowerDensityResult = {
      safe,
      avg_power_W: Math.round(avgPower * 10) / 10,
      kerf_width_mm: Math.round(kerfWidth * 1000) / 1000,
      cut_front_area_mm2: Math.round(cutFrontArea * 100) / 100,
      power_density_W_mm2: Math.round(powerDensity * 10) / 10,
      max_power_density_W_mm2: maxPowerDensity,
      utilization_pct: Math.round(utilization * 10) / 10,
      estimated_mrr_mm3_min: Math.round(estimatedMRR * 100) / 100,
    };

    // Add warning if approaching limit
    if (utilization >= this.config.warning_threshold * 100 && safe) {
      result.warning = `Power density at ${result.utilization_pct}% of limit. Monitor for wire lag.`;
    }

    // Add block reason if unsafe
    if (!safe) {
      result.block_reason =
        `Power density ${result.power_density_W_mm2} W/mm² exceeds limit of ${maxPowerDensity} W/mm². ` +
        `Reduce current or increase toff.`;
    }

    return result;
  }

  /**
   * Calculate maximum safe current for given parameters.
   */
  calculateMaxSafeCurrent(
    wire_diameter_mm: number,
    workpiece_thickness_mm: number,
    duty_cycle: number,
    operation_type: "roughing" | "finishing" | "skim" = "roughing",
    material?: string
  ): number {
    const gapVoltage = this.config.default_gap_voltage_V;
    const overcut = this.config.default_overcut_mm;
    const kerfWidth = this.calculateKerfWidth(wire_diameter_mm, overcut);
    const cutFrontArea = this.calculateCutFrontArea(kerfWidth, workpiece_thickness_mm);
    const maxPowerDensity = this.getMaxPowerDensity(operation_type, material);

    // P_max = maxPowerDensity × cutFrontArea
    // P_avg = Ip × Vg × D
    // Ip_max = P_max / (Vg × D)
    const maxPower = maxPowerDensity * cutFrontArea;
    return maxPower / (gapVoltage * duty_cycle);
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<PowerDensityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): PowerDensityConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmPowerDensityGuardEngine = new WEDMPowerDensityGuardEngine();
export { WEDMPowerDensityGuardEngine };
