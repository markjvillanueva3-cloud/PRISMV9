/**
 * WEDMGapVoltageControlEngine — Real-time gap voltage dynamics
 * @milestone WEDM-BIZ-MS0
 * @unit U-WB02
 *
 * Models gap voltage as function of debris concentration, dielectric conductivity,
 * and wire-workpiece gap distance. Predicts discharge probability and recommends
 * optimal servo gap for stable machining.
 *
 * Physics basis:
 * - Gap voltage: V_gap = V_arc + k_gap × (gap_um - min_gap_um)
 *   where k_gap ≈ 0.25-0.4 V/µm depending on dielectric (Mitsubishi MV-R manual)
 * - Short-circuit probability: P_sc = k × debris_ppm / gap_mm
 *   (DiBitonto & Eubank 1989; Rajurkar 1991)
 * - Discharge probability: P_d = 1 - P_sc - P_open
 *   where P_open = exp(-gap_um / λ) and λ ≈ 60µm for deionized water
 *
 * @see src/physics/constants.ts — EDM_PHYSICS.gap_voltage, debris_short_circuit
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DielectricType =
  | "deionized_water"
  | "tap_water"
  | "oil_based"
  | "synthetic"
  | "kerosene";

export interface DielectricProperties {
  name: DielectricType;
  conductivity_uS_cm: number;       // Electrical conductivity
  breakdownStrength_kV_mm: number;  // Dielectric strength
  viscosity_cSt: number;            // Kinematic viscosity at 25°C
  coolingCapacity: number;          // Relative cooling capacity (1.0 = water)
  gapCoefficient_V_per_um: number;  // Gap voltage coefficient
  characteristicGap_um: number;     // λ for open-circuit probability
}

export interface GapVoltageInput {
  dielectric_type: DielectricType;
  debris_ppm: number;               // Debris concentration in ppm
  gap_distance_um: number;          // Wire-workpiece gap in µm
  peak_current_A?: number;          // Peak current (affects ionization)
  pulse_on_us?: number;             // Pulse on-time (affects plasma channel)
  workpiece_material?: string;      // Material affects debris behavior
}

export interface GapVoltageResult {
  effective_gap_voltage_V: number;
  discharge_probability: number;
  short_circuit_probability: number;
  open_circuit_probability: number;
  recommended_gap_um: number;
  servo_voltage_target_V: number;
  stability_index: number;          // 0-1 (1 = optimal)
  warnings: string[];
  recommendations: string[];
  physics: {
    dielectric: DielectricProperties;
    ionization_factor: number;
    plasma_channel_radius_um: number;
    breakdown_voltage_V: number;
  };
}

export interface ServoOptimizationResult {
  optimal_gap_um: number;
  optimal_voltage_V: number;
  max_discharge_probability: number;
  safe_debris_limit_ppm: number;
  sensitivity: {
    gap_voltage_slope_V_per_um: number;
    debris_sensitivity_per_ppm: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIELECTRIC DATABASE
// ─────────────────────────────────────────────────────────────────────────────

const DIELECTRIC_PROPERTIES: Record<DielectricType, DielectricProperties> = {
  deionized_water: {
    name: "deionized_water",
    conductivity_uS_cm: 0.5,          // <5 µS/cm typical
    breakdownStrength_kV_mm: 65,      // High dielectric strength
    viscosity_cSt: 1.0,
    coolingCapacity: 1.0,             // Reference
    gapCoefficient_V_per_um: 0.4,     // From Mitsubishi data
    characteristicGap_um: 60,         // λ for arc extinction
  },
  tap_water: {
    name: "tap_water",
    conductivity_uS_cm: 300,          // 200-500 µS/cm typical
    breakdownStrength_kV_mm: 30,      // Reduced due to ions
    viscosity_cSt: 1.0,
    coolingCapacity: 1.0,
    gapCoefficient_V_per_um: 0.35,    // Slightly lower
    characteristicGap_um: 50,         // Easier arc maintenance
  },
  oil_based: {
    name: "oil_based",
    conductivity_uS_cm: 0.01,         // Very low conductivity
    breakdownStrength_kV_mm: 25,      // Lower than water
    viscosity_cSt: 5.0,               // Higher viscosity
    coolingCapacity: 0.45,            // Poor cooling vs water
    gapCoefficient_V_per_um: 0.25,    // Lower coefficient
    characteristicGap_um: 45,
  },
  synthetic: {
    name: "synthetic",
    conductivity_uS_cm: 0.1,
    breakdownStrength_kV_mm: 40,
    viscosity_cSt: 3.0,
    coolingCapacity: 0.7,
    gapCoefficient_V_per_um: 0.32,
    characteristicGap_um: 52,
  },
  kerosene: {
    name: "kerosene",
    conductivity_uS_cm: 0.001,        // Near-insulator
    breakdownStrength_kV_mm: 20,
    viscosity_cSt: 2.5,
    coolingCapacity: 0.35,
    gapCoefficient_V_per_um: 0.22,
    characteristicGap_um: 40,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

class WEDMGapVoltageControlEngine {
  /**
   * Calculate effective gap voltage and discharge probability
   * @param input Gap voltage calculation parameters
   * @returns Complete gap voltage analysis with servo recommendation
   */
  calculate(input: GapVoltageInput): GapVoltageResult {
    const dielectric = this.getDielectricProperties(input.dielectric_type);
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate inputs
    if (input.gap_distance_um < EDM_PHYSICS.gap_voltage.min_gap_um) {
      warnings.push(
        `Gap ${input.gap_distance_um}µm below minimum ${EDM_PHYSICS.gap_voltage.min_gap_um}µm — short circuit likely`
      );
    }
    if (input.gap_distance_um > EDM_PHYSICS.gap_voltage.max_gap_um) {
      warnings.push(
        `Gap ${input.gap_distance_um}µm above maximum ${EDM_PHYSICS.gap_voltage.max_gap_um}µm — arc extinction likely`
      );
    }

    // Debris warnings from constants
    const { thresholds } = EDM_PHYSICS.debris_short_circuit;
    if (input.debris_ppm > thresholds.critical) {
      warnings.push(`Debris ${input.debris_ppm}ppm exceeds critical threshold — flush immediately`);
    } else if (input.debris_ppm > thresholds.warning) {
      warnings.push(`Debris ${input.debris_ppm}ppm is high — increase flushing`);
    }

    // Calculate effective gap voltage
    // V_gap = V_arc + k × (gap_um - min_gap_um), clamped to [V_arc, V_open]
    const V_arc = EDM_PHYSICS.gap_voltage.arc_voltage_V;
    const V_open = EDM_PHYSICS.gap_voltage.open_circuit_V.standard;
    const k_gap = dielectric.gapCoefficient_V_per_um;
    const min_gap = EDM_PHYSICS.gap_voltage.min_gap_um;

    let V_gap = V_arc + k_gap * Math.max(0, input.gap_distance_um - min_gap);
    V_gap = Math.min(Math.max(V_gap, V_arc), V_open);

    // Calculate ionization factor (affects plasma channel)
    const current = input.peak_current_A ?? 10;
    const t_on = input.pulse_on_us ?? 1.0;
    const ionization_factor = 1 + 0.05 * Math.log10(1 + current * t_on / 10);

    // Plasma channel radius (Sato model approximation)
    // r_plasma ≈ 0.5 × I^0.4 × t_on^0.4 [µm] for typical WEDM
    const plasma_radius_um = 0.5 * Math.pow(current, 0.4) * Math.pow(t_on, 0.4);

    // Calculate breakdown voltage
    const breakdown_V = dielectric.breakdownStrength_kV_mm * (input.gap_distance_um / 1000);

    // Short-circuit probability: P_sc = k × debris_ppm / gap_mm
    const gap_mm = input.gap_distance_um / 1000;
    const k_debris = EDM_PHYSICS.debris_short_circuit.coefficient_k;
    let P_short = k_debris * input.debris_ppm / Math.max(gap_mm, 0.005);
    P_short = Math.min(P_short, 1.0);

    // Open-circuit probability: P_open = exp(-gap_um / λ)
    // When gap is very large, arc cannot maintain — probability increases
    const lambda = dielectric.characteristicGap_um;
    const gap_ratio = input.gap_distance_um / lambda;
    // P_open increases when gap > optimal (around λ)
    let P_open = 0;
    if (input.gap_distance_um > lambda) {
      P_open = 1 - Math.exp(-(input.gap_distance_um - lambda) / lambda);
    }
    P_open = Math.min(P_open, 1.0 - P_short);

    // Discharge probability (normal spark)
    const P_discharge = Math.max(0, 1 - P_short - P_open);

    // Stability index: optimal around P_discharge ≈ 0.85-0.95
    const stability = P_discharge > 0.95 ? 2 - P_discharge / 0.5 :
                      P_discharge > 0.7 ? P_discharge / 0.95 :
                      P_discharge / 0.7 * 0.7;

    // Recommended gap for maximum discharge probability
    const optimal_gap = this.findOptimalGap(input.debris_ppm, dielectric);
    const servo_target = EDM_PHYSICS.gap_voltage.servo_target_V;

    // Recommendations based on analysis
    if (P_short > 0.1) {
      recommendations.push(
        `Reduce debris or increase gap: current short-circuit risk ${(P_short * 100).toFixed(1)}%`
      );
    }
    if (P_open > 0.1) {
      recommendations.push(
        `Decrease gap: current open-circuit risk ${(P_open * 100).toFixed(1)}%`
      );
    }
    if (Math.abs(input.gap_distance_um - optimal_gap) > 10) {
      recommendations.push(
        `Adjust gap from ${input.gap_distance_um}µm to ${optimal_gap.toFixed(0)}µm for optimal discharge`
      );
    }
    if (dielectric.name === "tap_water" && input.debris_ppm > 50) {
      recommendations.push("Consider deionized water for better debris tolerance");
    }

    return {
      effective_gap_voltage_V: Math.round(V_gap * 100) / 100,
      discharge_probability: Math.round(P_discharge * 10000) / 10000,
      short_circuit_probability: Math.round(P_short * 10000) / 10000,
      open_circuit_probability: Math.round(P_open * 10000) / 10000,
      recommended_gap_um: Math.round(optimal_gap * 10) / 10,
      servo_voltage_target_V: servo_target,
      stability_index: Math.round(stability * 1000) / 1000,
      warnings,
      recommendations,
      physics: {
        dielectric,
        ionization_factor: Math.round(ionization_factor * 1000) / 1000,
        plasma_channel_radius_um: Math.round(plasma_radius_um * 100) / 100,
        breakdown_voltage_V: Math.round(breakdown_V * 100) / 100,
      },
    };
  }

  /**
   * Find optimal servo gap for given debris concentration
   * Maximizes discharge probability
   */
  findOptimalGap(debris_ppm: number, dielectric: DielectricProperties): number {
    // Optimal gap balances short-circuit (lower gap) vs open-circuit (higher gap)
    // Derivative of P_discharge = 0 gives optimal point
    // Approximate: optimal_gap ≈ λ × (1 - k × debris_ppm × λ / 1000)
    const lambda = dielectric.characteristicGap_um;
    const k = EDM_PHYSICS.debris_short_circuit.coefficient_k;

    // For high debris, need larger gap to avoid shorts
    const debris_correction = 1 + k * debris_ppm * 2;
    let optimal = lambda * (0.7 + 0.2 * Math.tanh(debris_ppm / 100));

    // Clamp to physical limits
    const min = EDM_PHYSICS.gap_voltage.min_gap_um + 5;
    const max = EDM_PHYSICS.gap_voltage.max_gap_um - 10;

    return Math.max(min, Math.min(optimal, max));
  }

  /**
   * Optimize servo parameters for target discharge probability
   */
  optimizeServo(
    target_discharge_probability: number,
    dielectric_type: DielectricType,
    max_debris_ppm: number = 100
  ): ServoOptimizationResult {
    const dielectric = this.getDielectricProperties(dielectric_type);

    // Binary search for optimal gap at given debris
    let low: number = EDM_PHYSICS.gap_voltage.min_gap_um;
    let high: number = EDM_PHYSICS.gap_voltage.max_gap_um;
    let optimal_gap = (low + high) / 2;
    let max_P_d = 0;

    for (let iter = 0; iter < 20; iter++) {
      const mid = (low + high) / 2;
      const result = this.calculate({
        dielectric_type,
        debris_ppm: max_debris_ppm / 2,
        gap_distance_um: mid,
      });

      if (result.discharge_probability > max_P_d) {
        max_P_d = result.discharge_probability;
        optimal_gap = mid;
      }

      // Gradient search
      const delta = (high - low) / 4;
      const r_low = this.calculate({
        dielectric_type,
        debris_ppm: max_debris_ppm / 2,
        gap_distance_um: mid - delta,
      });
      const r_high = this.calculate({
        dielectric_type,
        debris_ppm: max_debris_ppm / 2,
        gap_distance_um: mid + delta,
      });

      if (r_low.discharge_probability > r_high.discharge_probability) {
        high = mid;
      } else {
        low = mid;
      }
    }

    // Calculate voltage at optimal gap
    const V_arc = EDM_PHYSICS.gap_voltage.arc_voltage_V;
    const min_gap = EDM_PHYSICS.gap_voltage.min_gap_um;
    const optimal_voltage = V_arc + dielectric.gapCoefficient_V_per_um *
      Math.max(0, optimal_gap - min_gap);

    // Find safe debris limit at optimal gap
    let safe_debris = 0;
    for (let debris = 0; debris <= 500; debris += 10) {
      const result = this.calculate({
        dielectric_type,
        debris_ppm: debris,
        gap_distance_um: optimal_gap,
      });
      if (result.discharge_probability >= target_discharge_probability) {
        safe_debris = debris;
      } else {
        break;
      }
    }

    // Sensitivity analysis
    const gap_slope = dielectric.gapCoefficient_V_per_um;
    const k = EDM_PHYSICS.debris_short_circuit.coefficient_k;
    const debris_sensitivity = k / (optimal_gap / 1000);

    return {
      optimal_gap_um: Math.round(optimal_gap * 10) / 10,
      optimal_voltage_V: Math.round(optimal_voltage * 100) / 100,
      max_discharge_probability: Math.round(max_P_d * 10000) / 10000,
      safe_debris_limit_ppm: safe_debris,
      sensitivity: {
        gap_voltage_slope_V_per_um: gap_slope,
        debris_sensitivity_per_ppm: Math.round(debris_sensitivity * 100000) / 100000,
      },
    };
  }

  /**
   * Validate machining parameters for stable gap control
   */
  validateParameters(input: GapVoltageInput): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggested_corrections: Record<string, number>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggested_corrections: Record<string, number> = {};

    const dielectric = this.getDielectricProperties(input.dielectric_type);
    const result = this.calculate(input);

    // Check gap limits
    if (input.gap_distance_um < EDM_PHYSICS.gap_voltage.min_gap_um) {
      errors.push(`Gap too small: ${input.gap_distance_um}µm < ${EDM_PHYSICS.gap_voltage.min_gap_um}µm`);
      suggested_corrections.gap_distance_um = EDM_PHYSICS.gap_voltage.min_gap_um + 5;
    }
    if (input.gap_distance_um > EDM_PHYSICS.gap_voltage.max_gap_um) {
      errors.push(`Gap too large: ${input.gap_distance_um}µm > ${EDM_PHYSICS.gap_voltage.max_gap_um}µm`);
      suggested_corrections.gap_distance_um = EDM_PHYSICS.gap_voltage.max_gap_um - 10;
    }

    // Check debris (PPM thresholds, distinct from SC_ratio thresholds)
    const thresholds = EDM_PHYSICS.debris_short_circuit.ppm_thresholds;
    if (input.debris_ppm > thresholds.critical) {
      errors.push(`Debris critical: ${input.debris_ppm}ppm > ${thresholds.critical}ppm`);
    } else if (input.debris_ppm > thresholds.warning) {
      warnings.push(`Debris high: ${input.debris_ppm}ppm — recommend increased flushing`);
    }

    // Check discharge probability
    if (result.discharge_probability < 0.5) {
      warnings.push(`Low discharge probability: ${(result.discharge_probability * 100).toFixed(1)}%`);
      suggested_corrections.gap_distance_um = result.recommended_gap_um;
    }

    // Check dielectric suitability
    if (input.debris_ppm > 100 && dielectric.name === "tap_water") {
      warnings.push("High debris with tap water — consider deionized water");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [...warnings, ...result.warnings],
      suggested_corrections,
    };
  }

  /**
   * Get dielectric properties by type
   */
  getDielectricProperties(type: DielectricType): DielectricProperties {
    const props = DIELECTRIC_PROPERTIES[type];
    if (!props) {
      throw new Error(`Unknown dielectric type: ${type}. Valid types: ${Object.keys(DIELECTRIC_PROPERTIES).join(", ")}`);
    }
    return props;
  }

  /**
   * List all available dielectric types with properties
   */
  listDielectrics(): DielectricProperties[] {
    return Object.values(DIELECTRIC_PROPERTIES);
  }

  /**
   * Compare discharge probability across dielectric types
   */
  compareDielectrics(
    debris_ppm: number,
    gap_distance_um: number
  ): Array<{ dielectric: DielectricType; result: GapVoltageResult }> {
    return Object.keys(DIELECTRIC_PROPERTIES).map((type) => ({
      dielectric: type as DielectricType,
      result: this.calculate({
        dielectric_type: type as DielectricType,
        debris_ppm,
        gap_distance_um,
      }),
    }));
  }
}

export const wedmGapVoltageControlEngine = new WEDMGapVoltageControlEngine();
export { WEDMGapVoltageControlEngine };
