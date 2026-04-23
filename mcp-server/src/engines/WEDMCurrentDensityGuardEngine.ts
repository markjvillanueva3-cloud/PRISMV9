/**
 * WEDMCurrentDensityGuardEngine — Wire Break Prevention via Current Density Validation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-01
 *
 * Runtime validation of current density against wire cross-section.
 * Formula: J = I / (π × (d/2)²) must be ≤ max_current_density_A_mm2 from wire specs.
 * Blocks discharge if current density exceeds safe limits.
 *
 * Physics basis:
 * - Current density J (A/mm²) determines wire heating rate
 * - Exceeding max J causes thermal runaway → wire break
 * - Safety margin of 85% applied for production use
 *
 * @module engines/WEDMCurrentDensityGuardEngine
 */

import { WIRE_SPEC_CATALOG, type WireSpecification } from "../data/wire-spec-sheets.js";
import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CurrentDensityInput {
  /** Discharge current in Amps */
  current_A: number;
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Wire material type (optional - for lookup) */
  wire_material?: string;
  /** Wire spec ID (optional - for direct lookup) */
  wire_spec_id?: string;
  /** Safety margin factor (default 0.85 = 85% of max) */
  safety_margin?: number;
}

export interface CurrentDensityResult {
  /** Whether the current density is safe */
  safe: boolean;
  /** Calculated current density in A/mm² */
  current_density_A_mm2: number;
  /** Maximum allowed current density (from wire spec or default) */
  max_allowed_A_mm2: number;
  /** Effective limit after safety margin */
  effective_limit_A_mm2: number;
  /** Utilization percentage (J / max) */
  utilization_pct: number;
  /** Safety margin applied */
  safety_margin: number;
  /** Wire cross-sectional area in mm² */
  wire_area_mm2: number;
  /** Source of max current density value */
  source: string;
  /** Warning message if approaching limit */
  warning?: string;
  /** Block reason if unsafe */
  block_reason?: string;
}

export interface CurrentDensityGuardConfig {
  /** Default safety margin (0.85 = 85%) */
  default_safety_margin: number;
  /** Warning threshold as fraction of limit (0.70 = warn at 70%) */
  warning_threshold: number;
  /** Whether to use wire spec database */
  use_wire_specs: boolean;
  /** Fallback max current density if wire not found */
  fallback_max_A_mm2: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CurrentDensityGuardConfig = {
  default_safety_margin: 0.85,
  warning_threshold: 0.70,
  use_wire_specs: true,
  fallback_max_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_brass,
};

// Material-specific fallbacks when wire spec not found
const MATERIAL_FALLBACKS: Record<string, number> = {
  brass: EDM_PHYSICS.wire_safety.max_current_density_brass,
  brass_cuzn37: EDM_PHYSICS.wire_safety.max_current_density_brass,
  brass_cuzn40: EDM_PHYSICS.wire_safety.max_current_density_brass,
  zinc_coated_brass: 300,
  gamma_coated_brass: 350,
  diffusion_annealed: 320,
  molybdenum: EDM_PHYSICS.wire_safety.max_current_density_moly,
  moly: EDM_PHYSICS.wire_safety.max_current_density_moly,
  tungsten: EDM_PHYSICS.wire_safety.max_current_density_tungsten,
  copper: 200,
  steel_core_brass: 280,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMCurrentDensityGuardEngine {
  private config: CurrentDensityGuardConfig;

  constructor(config: Partial<CurrentDensityGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate wire cross-sectional area from diameter.
   * Formula: A = π × (d/2)²
   */
  calculateWireArea(diameter_mm: number): number {
    if (diameter_mm <= 0) {
      throw new Error(`Invalid wire diameter: ${diameter_mm}mm. Must be positive.`);
    }
    const radius = diameter_mm / 2;
    return Math.PI * radius * radius;
  }

  /**
   * Calculate current density from current and wire diameter.
   * Formula: J = I / A = I / (π × (d/2)²)
   */
  calculateCurrentDensity(current_A: number, diameter_mm: number): number {
    if (current_A < 0) {
      throw new Error(`Invalid current: ${current_A}A. Must be non-negative.`);
    }
    const area = this.calculateWireArea(diameter_mm);
    return current_A / area;
  }

  /**
   * Find wire specification from database.
   */
  findWireSpec(input: CurrentDensityInput): WireSpecification | null {
    if (!this.config.use_wire_specs) return null;

    // Try by spec ID first
    if (input.wire_spec_id) {
      const spec = WIRE_SPEC_CATALOG.find(s => s.id === input.wire_spec_id);
      if (spec) return spec;
    }

    // Try by material and diameter
    if (input.wire_material) {
      const matches = WIRE_SPEC_CATALOG.filter(s =>
        s.material.toLowerCase().includes(input.wire_material!.toLowerCase()) &&
        Math.abs(s.diameter_mm.value - input.wire_diameter_mm) < 0.01
      );
      if (matches.length > 0) return matches[0];
    }

    // Try by diameter only (closest match)
    const byDiameter = WIRE_SPEC_CATALOG.filter(s =>
      Math.abs(s.diameter_mm.value - input.wire_diameter_mm) < 0.01
    );
    if (byDiameter.length > 0) return byDiameter[0];

    return null;
  }

  /**
   * Get maximum current density for a wire configuration.
   */
  getMaxCurrentDensity(input: CurrentDensityInput): { max: number; source: string } {
    // Try wire spec database
    const spec = this.findWireSpec(input);
    if (spec) {
      return {
        max: spec.max_current_density_A_mm2.value,
        source: spec.max_current_density_A_mm2.source,
      };
    }

    // Try material fallback
    if (input.wire_material) {
      const material = input.wire_material.toLowerCase().replace(/[- ]/g, "_");
      if (material in MATERIAL_FALLBACKS) {
        return {
          max: MATERIAL_FALLBACKS[material],
          source: `Material fallback for ${input.wire_material}`,
        };
      }
    }

    // Use default fallback
    return {
      max: this.config.fallback_max_A_mm2,
      source: "Default fallback (brass assumption)",
    };
  }

  /**
   * Validate current density against safety limits.
   * Main entry point for the guard.
   */
  validate(input: CurrentDensityInput): CurrentDensityResult {
    // Validate inputs
    if (input.current_A < 0) {
      return {
        safe: false,
        current_density_A_mm2: 0,
        max_allowed_A_mm2: 0,
        effective_limit_A_mm2: 0,
        utilization_pct: 0,
        safety_margin: 0,
        wire_area_mm2: 0,
        source: "N/A",
        block_reason: `Invalid current: ${input.current_A}A. Must be non-negative.`,
      };
    }

    if (input.wire_diameter_mm <= 0) {
      return {
        safe: false,
        current_density_A_mm2: 0,
        max_allowed_A_mm2: 0,
        effective_limit_A_mm2: 0,
        utilization_pct: 0,
        safety_margin: 0,
        wire_area_mm2: 0,
        source: "N/A",
        block_reason: `Invalid wire diameter: ${input.wire_diameter_mm}mm. Must be positive.`,
      };
    }

    // Calculate values
    const safetyMargin = input.safety_margin ?? this.config.default_safety_margin;
    const wireArea = this.calculateWireArea(input.wire_diameter_mm);
    const currentDensity = this.calculateCurrentDensity(input.current_A, input.wire_diameter_mm);
    const { max, source } = this.getMaxCurrentDensity(input);
    const effectiveLimit = max * safetyMargin;
    const utilization = (currentDensity / max) * 100;

    // Check safety
    const safe = currentDensity <= effectiveLimit;

    // Build result
    const result: CurrentDensityResult = {
      safe,
      current_density_A_mm2: Math.round(currentDensity * 100) / 100,
      max_allowed_A_mm2: max,
      effective_limit_A_mm2: Math.round(effectiveLimit * 100) / 100,
      utilization_pct: Math.round(utilization * 10) / 10,
      safety_margin: safetyMargin,
      wire_area_mm2: Math.round(wireArea * 10000) / 10000,
      source,
    };

    // Add warning if approaching limit
    if (utilization >= this.config.warning_threshold * 100 && safe) {
      result.warning = `Current density at ${result.utilization_pct}% of maximum. ` +
        `Consider reducing current for longer wire life.`;
    }

    // Add block reason if unsafe
    if (!safe) {
      result.block_reason = `Current density ${result.current_density_A_mm2} A/mm² exceeds ` +
        `safe limit of ${result.effective_limit_A_mm2} A/mm² ` +
        `(${safetyMargin * 100}% of max ${max} A/mm²). ` +
        `Reduce current from ${input.current_A}A to max ${this.calculateSafeCurrent(input.wire_diameter_mm, effectiveLimit).toFixed(1)}A.`;
    }

    return result;
  }

  /**
   * Calculate maximum safe current for a given wire configuration.
   */
  calculateSafeCurrent(wire_diameter_mm: number, max_density_A_mm2: number): number {
    const area = this.calculateWireArea(wire_diameter_mm);
    return area * max_density_A_mm2;
  }

  /**
   * Calculate safe current for a wire spec with safety margin applied.
   */
  getSafeCurrentLimit(input: Omit<CurrentDensityInput, "current_A">): number {
    const safetyMargin = input.safety_margin ?? this.config.default_safety_margin;
    const { max } = this.getMaxCurrentDensity({ ...input, current_A: 0 });
    const effectiveLimit = max * safetyMargin;
    return this.calculateSafeCurrent(input.wire_diameter_mm, effectiveLimit);
  }

  /**
   * Batch validate multiple current/diameter combinations.
   */
  validateBatch(inputs: CurrentDensityInput[]): CurrentDensityResult[] {
    return inputs.map(input => this.validate(input));
  }

  /**
   * Check if a proposed parameter change would exceed limits.
   */
  wouldExceedLimit(
    current_A: number,
    proposed_current_A: number,
    wire_diameter_mm: number,
    wire_material?: string
  ): { would_exceed: boolean; current_result: CurrentDensityResult; proposed_result: CurrentDensityResult } {
    const current_result = this.validate({ current_A, wire_diameter_mm, wire_material });
    const proposed_result = this.validate({ current_A: proposed_current_A, wire_diameter_mm, wire_material });

    return {
      would_exceed: !proposed_result.safe,
      current_result,
      proposed_result,
    };
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<CurrentDensityGuardConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): CurrentDensityGuardConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmCurrentDensityGuardEngine = new WEDMCurrentDensityGuardEngine();
export { WEDMCurrentDensityGuardEngine };
