/**
 * WEDMThinWireDerateEngine — Parameter Derating for Thin Wires
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-06
 *
 * Automatically derates discharge parameters for thin wires (<0.20mm) to prevent:
 * - Wire breakage from thermal overload
 * - Excessive wire wear
 * - Unstable machining
 *
 * Physics basis:
 * - Thinner wire = smaller cross-section = lower thermal mass
 * - Heat input scales with I²×t, heat dissipation scales with surface area
 * - Surface/volume ratio increases as diameter decreases
 * - Derating factor roughly proportional to (d/d_ref)² for energy limits
 *
 * @module engines/WEDMThinWireDerateEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ThinWireDerateInput {
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Proposed peak current in Amps */
  proposed_current_A: number;
  /** Proposed pulse on-time in μs */
  proposed_ton_us: number;
  /** Proposed wire tension in N */
  proposed_tension_N?: number;
  /** Wire material */
  wire_material?: string;
  /** Operation type */
  operation_type?: "roughing" | "finishing" | "skim";
}

export interface ThinWireDerateResult {
  /** Whether derating was applied */
  derated: boolean;
  /** Original proposed current */
  original_current_A: number;
  /** Derated current (may be same as original) */
  derated_current_A: number;
  /** Original proposed ton */
  original_ton_us: number;
  /** Derated ton (may be same as original) */
  derated_ton_us: number;
  /** Current derating factor (0-1, 1 = no derating) */
  current_derate_factor: number;
  /** Ton derating factor (0-1, 1 = no derating) */
  ton_derate_factor: number;
  /** Wire diameter category */
  wire_category: "standard" | "thin" | "ultra_thin" | "micro";
  /** Recommended tension adjustment */
  tension_recommendation?: { min_N: number; max_N: number };
  /** Expected productivity impact (% reduction from standard) */
  productivity_impact_pct: number;
  /** Warning message */
  warning?: string;
  /** Detailed derating rationale */
  rationale: string;
}

export interface ThinWireDerateConfig {
  /** Reference diameter for standard parameters (mm) */
  reference_diameter_mm: number;
  /** Thin wire threshold (mm) */
  thin_threshold_mm: number;
  /** Ultra-thin wire threshold (mm) */
  ultra_thin_threshold_mm: number;
  /** Micro wire threshold (mm) */
  micro_threshold_mm: number;
  /** Current derating exponent (typically 1.5-2.0) */
  current_derate_exponent: number;
  /** Ton derating exponent (typically 1.0-1.5) */
  ton_derate_exponent: number;
  /** Minimum current for any wire (A) */
  min_current_A: number;
  /** Minimum ton for any wire (μs) */
  min_ton_us: number;
}

// ============================================================================
// CONSTANTS (from canonical EDM_PHYSICS)
// ============================================================================

const DEFAULT_CONFIG: ThinWireDerateConfig = {
  reference_diameter_mm: EDM_PHYSICS.thin_wire_derate.reference_diameter_mm,
  thin_threshold_mm: 0.20,
  ultra_thin_threshold_mm: 0.10,
  micro_threshold_mm: 0.05,
  current_derate_exponent: EDM_PHYSICS.thin_wire_derate.current_exponent,
  ton_derate_exponent: EDM_PHYSICS.thin_wire_derate.ton_exponent,
  min_current_A: 0.5,
  min_ton_us: 0.5,
};

// Wire material thermal capacity factors (relative to brass)
const WIRE_THERMAL_FACTORS: Record<string, number> = {
  brass: 1.0,
  brass_cuzn37: 1.0,
  brass_cuzn40: 0.95,
  zinc_coated_brass: 1.1,
  gamma_coated_brass: 1.2,
  diffusion_annealed: 1.15,
  molybdenum: 1.8,
  tungsten: 2.5,
  copper: 0.7,
};

// Tension recommendations by wire diameter category (N)
const TENSION_RECOMMENDATIONS: Record<string, { min: number; max: number }> = {
  standard: { min: 10, max: 20 },
  thin: { min: 6, max: 12 },
  ultra_thin: { min: 3, max: 7 },
  micro: { min: 1, max: 3 },
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMThinWireDerateEngine {
  private config: ThinWireDerateConfig;

  constructor(config: Partial<ThinWireDerateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Categorize wire by diameter.
   */
  categorizeWire(diameter_mm: number): "standard" | "thin" | "ultra_thin" | "micro" {
    if (diameter_mm < this.config.micro_threshold_mm) return "micro";
    if (diameter_mm < this.config.ultra_thin_threshold_mm) return "ultra_thin";
    if (diameter_mm < this.config.thin_threshold_mm) return "thin";
    return "standard";
  }

  /**
   * Calculate current derating factor.
   * Factor = (d / d_ref)^exponent, capped at 1.0
   */
  calculateCurrentDerateFactor(
    diameter_mm: number,
    wire_material?: string
  ): number {
    if (diameter_mm >= this.config.reference_diameter_mm) return 1.0;

    // Base derating from diameter ratio
    const ratio = diameter_mm / this.config.reference_diameter_mm;
    let factor = Math.pow(ratio, this.config.current_derate_exponent);

    // Adjust for wire material thermal capacity
    if (wire_material) {
      const mat = wire_material.toLowerCase().replace(/[- ]/g, "_");
      const thermalFactor = WIRE_THERMAL_FACTORS[mat] ?? 1.0;
      // Higher thermal capacity = less derating needed
      factor = Math.min(1.0, factor * Math.sqrt(thermalFactor));
    }

    return Math.max(factor, 0.1); // Never below 10%
  }

  /**
   * Calculate ton derating factor.
   * Less aggressive than current derating.
   */
  calculateTonDerateFactor(diameter_mm: number): number {
    if (diameter_mm >= this.config.reference_diameter_mm) return 1.0;

    const ratio = diameter_mm / this.config.reference_diameter_mm;
    const factor = Math.pow(ratio, this.config.ton_derate_exponent);

    return Math.max(factor, 0.2); // Never below 20%
  }

  /**
   * Calculate productivity impact from derating.
   * MRR roughly proportional to I × ton
   */
  calculateProductivityImpact(
    current_factor: number,
    ton_factor: number
  ): number {
    const mrrFactor = current_factor * ton_factor;
    return (1 - mrrFactor) * 100; // % reduction
  }

  /**
   * Get tension recommendation for wire category.
   */
  getTensionRecommendation(category: "standard" | "thin" | "ultra_thin" | "micro"): {
    min_N: number;
    max_N: number;
  } {
    const rec = TENSION_RECOMMENDATIONS[category];
    return { min_N: rec.min, max_N: rec.max };
  }

  /**
   * Apply derating to proposed parameters.
   */
  derate(input: ThinWireDerateInput): ThinWireDerateResult {
    // Input validation
    if (input.wire_diameter_mm <= 0) {
      throw new Error("Wire diameter must be positive");
    }
    if (input.proposed_current_A <= 0) {
      throw new Error("Proposed current must be positive");
    }
    if (input.proposed_ton_us <= 0) {
      throw new Error("Proposed ton must be positive");
    }

    // Categorize wire
    const wireCategory = this.categorizeWire(input.wire_diameter_mm);

    // Calculate derating factors
    const currentFactor = this.calculateCurrentDerateFactor(
      input.wire_diameter_mm,
      input.wire_material
    );
    const tonFactor = this.calculateTonDerateFactor(input.wire_diameter_mm);

    // Apply derating
    let deratedCurrent = input.proposed_current_A * currentFactor;
    let deratedTon = input.proposed_ton_us * tonFactor;

    // Enforce minimums
    deratedCurrent = Math.max(deratedCurrent, this.config.min_current_A);
    deratedTon = Math.max(deratedTon, this.config.min_ton_us);

    // Check if derating was actually applied
    const derated =
      deratedCurrent < input.proposed_current_A ||
      deratedTon < input.proposed_ton_us;

    // Calculate productivity impact
    const productivityImpact = this.calculateProductivityImpact(currentFactor, tonFactor);

    // Get tension recommendation
    const tensionRec = this.getTensionRecommendation(wireCategory);

    // Build rationale
    let rationale: string;
    if (!derated) {
      rationale = `Wire diameter ${input.wire_diameter_mm}mm is standard size. No derating required.`;
    } else {
      rationale =
        `Wire diameter ${input.wire_diameter_mm}mm (${wireCategory}) requires derating. ` +
        `Current reduced to ${Math.round(currentFactor * 100)}% of standard, ` +
        `ton reduced to ${Math.round(tonFactor * 100)}% of standard. ` +
        `Cross-sectional area is ${Math.round(Math.pow(input.wire_diameter_mm / this.config.reference_diameter_mm, 2) * 100)}% of reference wire.`;
    }

    // Build result
    const result: ThinWireDerateResult = {
      derated,
      original_current_A: input.proposed_current_A,
      derated_current_A: Math.round(deratedCurrent * 100) / 100,
      original_ton_us: input.proposed_ton_us,
      derated_ton_us: Math.round(deratedTon * 100) / 100,
      current_derate_factor: Math.round(currentFactor * 1000) / 1000,
      ton_derate_factor: Math.round(tonFactor * 1000) / 1000,
      wire_category: wireCategory,
      productivity_impact_pct: Math.round(productivityImpact * 10) / 10,
      rationale,
    };

    // Add tension recommendation if provided tension is outside range
    if (input.proposed_tension_N !== undefined) {
      if (input.proposed_tension_N < tensionRec.min_N ||
          input.proposed_tension_N > tensionRec.max_N) {
        result.tension_recommendation = tensionRec;
        result.warning =
          `Proposed tension ${input.proposed_tension_N}N is outside recommended range ` +
          `${tensionRec.min_N}-${tensionRec.max_N}N for ${wireCategory} wire.`;
      }
    } else {
      result.tension_recommendation = tensionRec;
    }

    // Add additional warnings for extreme cases
    if (wireCategory === "micro") {
      result.warning = (result.warning || "") +
        " Micro wire (<0.05mm) requires specialized handling. Verify flushing conditions.";
    }

    return result;
  }

  /**
   * Calculate maximum safe current for a wire diameter.
   */
  calculateMaxSafeCurrent(
    wire_diameter_mm: number,
    reference_max_current_A: number = 20,
    wire_material?: string
  ): number {
    const factor = this.calculateCurrentDerateFactor(wire_diameter_mm, wire_material);
    return Math.max(
      reference_max_current_A * factor,
      this.config.min_current_A
    );
  }

  /**
   * Get all derating factors for a diameter.
   */
  getDeratingSummary(wire_diameter_mm: number, wire_material?: string): {
    category: string;
    current_factor: number;
    ton_factor: number;
    combined_mrr_factor: number;
    tension_range: { min: number; max: number };
  } {
    const category = this.categorizeWire(wire_diameter_mm);
    const currentFactor = this.calculateCurrentDerateFactor(wire_diameter_mm, wire_material);
    const tonFactor = this.calculateTonDerateFactor(wire_diameter_mm);
    const tensionRange = this.getTensionRecommendation(category);

    const roundedCurrent = Math.round(currentFactor * 1000) / 1000;
    const roundedTon = Math.round(tonFactor * 1000) / 1000;
    return {
      category,
      current_factor: roundedCurrent,
      ton_factor: roundedTon,
      combined_mrr_factor: Math.round(roundedCurrent * roundedTon * 1000) / 1000,
      tension_range: { min: tensionRange.min_N, max: tensionRange.max_N },
    };
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<ThinWireDerateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ThinWireDerateConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmThinWireDerateEngine = new WEDMThinWireDerateEngine();
export { WEDMThinWireDerateEngine };
