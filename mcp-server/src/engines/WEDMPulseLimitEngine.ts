/**
 * WEDMPulseLimitEngine — Pulse Parameter Safety Validation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-02
 *
 * Validates pulse timing (ton, toff) and duty cycle to prevent:
 * - Wire overheating from excessive on-time
 * - Poor flushing from insufficient off-time
 * - Recast layer buildup from high duty cycle
 *
 * Physics basis:
 * - Duty cycle = ton / (ton + toff)
 * - Higher duty cycle = more heat input = more wire stress
 * - ton max limited by wire thermal capacity
 * - toff min limited by dielectric recovery time
 *
 * @module engines/WEDMPulseLimitEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PulseLimitInput {
  /** Pulse on-time in microseconds */
  ton_us: number;
  /** Pulse off-time in microseconds */
  toff_us: number;
  /** Peak current in Amps */
  peak_current_A: number;
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Wire material (for thermal limits) */
  wire_material?: string;
  /** Workpiece thickness in mm (affects flushing requirements) */
  workpiece_thickness_mm?: number;
  /** Operation type */
  operation_type?: "roughing" | "finishing" | "skim";
}

export interface PulseLimitResult {
  /** Whether pulse parameters are safe */
  safe: boolean;
  /** Calculated duty cycle (0-1) */
  duty_cycle: number;
  /** Maximum recommended duty cycle */
  max_duty_cycle: number;
  /** Current pulse frequency in Hz */
  frequency_Hz: number;
  /** Average power factor */
  avg_power_factor: number;
  /** Energy per pulse in mJ */
  energy_per_pulse_mJ: number;
  /** Validation status for each parameter */
  validations: PulseValidation[];
  /** Warnings (safe but approaching limits) */
  warnings: string[];
  /** Block reason if unsafe */
  block_reason?: string;
}

export interface PulseValidation {
  parameter: string;
  value: number;
  limit: number;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface PulseLimitConfig {
  /** Maximum ton for roughing (us) */
  max_ton_roughing_us: number;
  /** Maximum ton for finishing (us) */
  max_ton_finishing_us: number;
  /** Minimum toff (us) */
  min_toff_us: number;
  /** Maximum duty cycle */
  max_duty_cycle: number;
  /** Warning threshold for duty cycle */
  duty_cycle_warn: number;
  /** Minimum toff/ton ratio for thick parts */
  min_toff_ton_ratio_thick: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: PulseLimitConfig = {
  max_ton_roughing_us: 50,
  max_ton_finishing_us: 10,
  min_toff_us: 8,
  max_duty_cycle: 0.45,
  duty_cycle_warn: 0.35,
  min_toff_ton_ratio_thick: 2.0,
};

// Wire material thermal limits (max energy per unit area per pulse)
const WIRE_THERMAL_LIMITS: Record<string, number> = {
  brass: 0.8,
  brass_cuzn37: 0.8,
  brass_cuzn40: 0.75,
  zinc_coated_brass: 1.0,
  gamma_coated_brass: 1.2,
  diffusion_annealed: 1.1,
  molybdenum: 1.5,
  tungsten: 2.0,
  copper: 0.6,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMPulseLimitEngine {
  private config: PulseLimitConfig;

  constructor(config: Partial<PulseLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate duty cycle from pulse timing.
   * Formula: D = ton / (ton + toff)
   */
  calculateDutyCycle(ton_us: number, toff_us: number): number {
    if (ton_us <= 0 || toff_us <= 0) {
      throw new Error("Pulse times must be positive");
    }
    return ton_us / (ton_us + toff_us);
  }

  /**
   * Calculate pulse frequency.
   * Formula: f = 1 / (ton + toff) [converted from us to Hz]
   */
  calculateFrequency(ton_us: number, toff_us: number): number {
    const period_s = (ton_us + toff_us) / 1_000_000;
    return 1 / period_s;
  }

  /**
   * Calculate energy per pulse.
   * Formula: E = Ip × ton × Vg (simplified, assuming constant gap voltage)
   * Gap voltage typically 60-80V for WEDM
   */
  calculatePulseEnergy(
    peak_current_A: number,
    ton_us: number,
    gap_voltage_V: number = 70
  ): number {
    const ton_s = ton_us / 1_000_000;
    const energy_J = peak_current_A * gap_voltage_V * ton_s;
    return energy_J * 1000; // Convert to mJ
  }

  /**
   * Get maximum ton for operation type.
   */
  getMaxTon(operation_type: "roughing" | "finishing" | "skim" = "roughing"): number {
    switch (operation_type) {
      case "finishing":
      case "skim":
        return this.config.max_ton_finishing_us;
      default:
        return this.config.max_ton_roughing_us;
    }
  }

  /**
   * Validate pulse parameters against safety limits.
   */
  validate(input: PulseLimitInput): PulseLimitResult {
    const validations: PulseValidation[] = [];
    const warnings: string[] = [];
    let safe = true;
    let block_reason: string | undefined;

    // Input validation
    if (input.ton_us <= 0) {
      return {
        safe: false,
        duty_cycle: 0,
        max_duty_cycle: this.config.max_duty_cycle,
        frequency_Hz: 0,
        avg_power_factor: 0,
        energy_per_pulse_mJ: 0,
        validations: [],
        warnings: [],
        block_reason: "Invalid ton: must be positive",
      };
    }

    if (input.toff_us <= 0) {
      return {
        safe: false,
        duty_cycle: 0,
        max_duty_cycle: this.config.max_duty_cycle,
        frequency_Hz: 0,
        avg_power_factor: 0,
        energy_per_pulse_mJ: 0,
        validations: [],
        warnings: [],
        block_reason: "Invalid toff: must be positive",
      };
    }

    // Calculate parameters
    const dutyCycle = this.calculateDutyCycle(input.ton_us, input.toff_us);
    const frequency = this.calculateFrequency(input.ton_us, input.toff_us);
    const pulseEnergy = this.calculatePulseEnergy(input.peak_current_A, input.ton_us);
    const avgPowerFactor = dutyCycle; // Simplified power factor

    // Validate ton against max
    const maxTon = this.getMaxTon(input.operation_type);
    if (input.ton_us > maxTon) {
      validations.push({
        parameter: "ton",
        value: input.ton_us,
        limit: maxTon,
        status: "fail",
        message: `ton ${input.ton_us}μs exceeds max ${maxTon}μs for ${input.operation_type || "roughing"}`,
      });
      safe = false;
      block_reason = `ton exceeds maximum for ${input.operation_type || "roughing"} operations`;
    } else if (input.ton_us > maxTon * 0.8) {
      validations.push({
        parameter: "ton",
        value: input.ton_us,
        limit: maxTon,
        status: "warn",
        message: `ton approaching limit (${Math.round((input.ton_us / maxTon) * 100)}%)`,
      });
      warnings.push(`ton at ${Math.round((input.ton_us / maxTon) * 100)}% of limit`);
    } else {
      validations.push({
        parameter: "ton",
        value: input.ton_us,
        limit: maxTon,
        status: "pass",
        message: "ton within limits",
      });
    }

    // Validate toff against min
    if (input.toff_us < this.config.min_toff_us) {
      validations.push({
        parameter: "toff",
        value: input.toff_us,
        limit: this.config.min_toff_us,
        status: "fail",
        message: `toff ${input.toff_us}μs below minimum ${this.config.min_toff_us}μs`,
      });
      safe = false;
      block_reason = block_reason || "toff too short for dielectric recovery";
    } else {
      validations.push({
        parameter: "toff",
        value: input.toff_us,
        limit: this.config.min_toff_us,
        status: "pass",
        message: "toff within limits",
      });
    }

    // Validate duty cycle
    if (dutyCycle > this.config.max_duty_cycle) {
      validations.push({
        parameter: "duty_cycle",
        value: dutyCycle,
        limit: this.config.max_duty_cycle,
        status: "fail",
        message: `Duty cycle ${(dutyCycle * 100).toFixed(1)}% exceeds max ${this.config.max_duty_cycle * 100}%`,
      });
      safe = false;
      block_reason = block_reason || "Duty cycle too high - risk of wire overheating";
    } else if (dutyCycle > this.config.duty_cycle_warn) {
      validations.push({
        parameter: "duty_cycle",
        value: dutyCycle,
        limit: this.config.max_duty_cycle,
        status: "warn",
        message: `Duty cycle ${(dutyCycle * 100).toFixed(1)}% approaching limit`,
      });
      warnings.push("High duty cycle - monitor wire condition");
    } else {
      validations.push({
        parameter: "duty_cycle",
        value: dutyCycle,
        limit: this.config.max_duty_cycle,
        status: "pass",
        message: "Duty cycle within limits",
      });
    }

    // Check toff/ton ratio for thick workpieces
    if (input.workpiece_thickness_mm && input.workpiece_thickness_mm > 50) {
      const toffTonRatio = input.toff_us / input.ton_us;
      if (toffTonRatio < this.config.min_toff_ton_ratio_thick) {
        validations.push({
          parameter: "toff_ton_ratio",
          value: toffTonRatio,
          limit: this.config.min_toff_ton_ratio_thick,
          status: "warn",
          message: `Thick workpiece (${input.workpiece_thickness_mm}mm) may need higher toff/ton ratio`,
        });
        warnings.push("Consider increasing toff for better flushing on thick part");
      }
    }

    return {
      safe,
      duty_cycle: Math.round(dutyCycle * 1000) / 1000,
      max_duty_cycle: this.config.max_duty_cycle,
      frequency_Hz: Math.round(frequency),
      avg_power_factor: Math.round(avgPowerFactor * 1000) / 1000,
      energy_per_pulse_mJ: Math.round(pulseEnergy * 100) / 100,
      validations,
      warnings,
      block_reason,
    };
  }

  /**
   * Calculate safe pulse parameters given constraints.
   */
  calculateSafePulse(
    target_mrr: "high" | "medium" | "low",
    wire_diameter_mm: number,
    operation_type: "roughing" | "finishing" | "skim" = "roughing"
  ): { ton_us: number; toff_us: number; peak_current_A: number } {
    const maxTon = this.getMaxTon(operation_type);

    switch (target_mrr) {
      case "high":
        return {
          ton_us: maxTon * 0.8,
          toff_us: maxTon * 1.5,
          peak_current_A: wire_diameter_mm * 40,
        };
      case "medium":
        return {
          ton_us: maxTon * 0.5,
          toff_us: maxTon * 2.0,
          peak_current_A: wire_diameter_mm * 30,
        };
      case "low":
      default:
        return {
          ton_us: maxTon * 0.3,
          toff_us: maxTon * 3.0,
          peak_current_A: wire_diameter_mm * 20,
        };
    }
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<PulseLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): PulseLimitConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmPulseLimitEngine = new WEDMPulseLimitEngine();
export { WEDMPulseLimitEngine };
