/**
 * WEDMKerfWidthEngine — Kerf Width Prediction and Validation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-04
 *
 * Predicts kerf width based on discharge parameters for:
 * - Accurate offset compensation
 * - Tolerance verification
 * - Multi-pass planning
 *
 * Physics basis:
 * - Kerf = wire_diameter + 2 × overcut
 * - Overcut depends on: Ip, ton, gap voltage, dielectric conductivity
 * - Empirical: overcut ≈ k × Ip^a × ton^b (material-dependent)
 *
 * Reference: Klocke et al., "EDM in Mold Making" (2017)
 *
 * @module engines/WEDMKerfWidthEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface KerfWidthInput {
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Peak discharge current in Amps */
  peak_current_A: number;
  /** Pulse on-time in microseconds */
  ton_us: number;
  /** Gap voltage in Volts */
  gap_voltage_V?: number;
  /** Workpiece material */
  material?: string;
  /** Operation type */
  operation_type?: "roughing" | "finishing" | "skim";
  /** Pass number (affects surface quality) */
  pass_number?: number;
}

export interface KerfWidthResult {
  /** Predicted kerf width in mm */
  kerf_width_mm: number;
  /** Predicted overcut per side in mm */
  overcut_mm: number;
  /** Wire offset required for compensation */
  wire_offset_mm: number;
  /** Confidence interval (±) in mm */
  uncertainty_mm: number;
  /** Surface roughness estimate Ra in μm */
  estimated_Ra_um: number;
  /** Recast layer thickness estimate in μm */
  recast_layer_um: number;
  /** Achievable tolerance class */
  tolerance_class: "IT6" | "IT7" | "IT8" | "IT9" | "IT10" | "IT11" | "IT12";
  /** Warning if tolerance may not be achievable */
  warning?: string;
}

export interface KerfWidthConfig {
  /** Default gap voltage */
  default_gap_voltage_V: number;
  /** Base overcut coefficient */
  base_overcut_coefficient: number;
  /** Current exponent for overcut model */
  current_exponent: number;
  /** Ton exponent for overcut model */
  ton_exponent: number;
  /** Minimum achievable overcut (μm) */
  min_overcut_um: number;
}

// ============================================================================
// CONSTANTS (from canonical EDM_PHYSICS)
// ============================================================================

const DEFAULT_CONFIG: KerfWidthConfig = {
  default_gap_voltage_V: 70,
  base_overcut_coefficient: EDM_PHYSICS.kerf_overcut.base_coefficient,
  current_exponent: EDM_PHYSICS.kerf_overcut.current_exponent,
  ton_exponent: EDM_PHYSICS.kerf_overcut.ton_exponent,
  min_overcut_um: EDM_PHYSICS.kerf_overcut.min_overcut_um,
};

// Material-specific overcut multipliers
const MATERIAL_OVERCUT_MULTIPLIERS: Record<string, number> = {
  steel: 1.0,
  tool_steel: 0.95,
  stainless: 1.05,
  aluminum: 1.4,
  copper: 1.3,
  brass: 1.2,
  titanium: 0.85,
  tungsten_carbide: 0.6,
  carbide: 0.6,
  inconel: 0.8,
  graphite: 1.8,
};

// Operation-specific factors
const OPERATION_FACTORS: Record<string, { overcut_mult: number; Ra_mult: number }> = {
  roughing: { overcut_mult: 1.2, Ra_mult: 1.0 },
  finishing: { overcut_mult: 0.8, Ra_mult: 0.5 },
  skim: { overcut_mult: 0.6, Ra_mult: 0.3 },
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMKerfWidthEngine {
  private config: KerfWidthConfig;

  constructor(config: Partial<KerfWidthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate overcut using empirical model.
   * Formula: overcut = k × Ip^a × ton^b × material_mult × operation_mult
   */
  calculateOvercut(
    peak_current_A: number,
    ton_us: number,
    material?: string,
    operation_type?: "roughing" | "finishing" | "skim"
  ): number {
    if (peak_current_A <= 0 || ton_us <= 0) {
      throw new Error("Current and ton must be positive");
    }

    // Base overcut calculation — base_coefficient is in µm, convert result to mm
    let overcut_um =
      this.config.base_overcut_coefficient *
      Math.pow(peak_current_A, this.config.current_exponent) *
      Math.pow(ton_us, this.config.ton_exponent);
    let overcut = overcut_um / 1000; // µm → mm

    // Apply material multiplier
    if (material) {
      const mat = material.toLowerCase().replace(/[- ]/g, "_");
      overcut *= MATERIAL_OVERCUT_MULTIPLIERS[mat] ?? 1.0;
    }

    // Apply operation multiplier
    const opType = operation_type || "roughing";
    overcut *= OPERATION_FACTORS[opType].overcut_mult;

    // Enforce minimum (physics limit)
    const minOvercut = this.config.min_overcut_um / 1000; // Convert to mm
    return Math.max(overcut, minOvercut);
  }

  /**
   * Calculate kerf width from wire diameter and overcut.
   */
  calculateKerfWidth(wire_diameter_mm: number, overcut_mm: number): number {
    return wire_diameter_mm + 2 * overcut_mm;
  }

  /**
   * Estimate surface roughness Ra based on parameters.
   * Empirical: Ra ≈ k × Ip^0.4 × ton^0.3 (Klocke model)
   */
  estimateSurfaceRoughness(
    peak_current_A: number,
    ton_us: number,
    operation_type?: "roughing" | "finishing" | "skim"
  ): number {
    // Base Ra in μm (empirical coefficients from Klocke 2017)
    let Ra = 0.5 * Math.pow(peak_current_A, 0.4) * Math.pow(ton_us, 0.3);

    // Apply operation factor
    const opType = operation_type || "roughing";
    Ra *= OPERATION_FACTORS[opType].Ra_mult;

    // Minimum achievable Ra (0.2 μm for best finishing)
    return Math.max(Ra, 0.2);
  }

  /**
   * Estimate recast layer thickness.
   * Empirical: recast ≈ 2-3 × Ra for typical conditions
   */
  estimateRecastLayer(Ra_um: number): number {
    return Ra_um * 2.5;
  }

  /**
   * Determine achievable tolerance class based on process capability.
   */
  determineToleranceClass(
    overcut_uncertainty_mm: number,
    operation_type?: "roughing" | "finishing" | "skim"
  ): "IT6" | "IT7" | "IT8" | "IT9" | "IT10" | "IT11" | "IT12" {
    // Convert to μm for easier comparison
    const uncertainty_um = overcut_uncertainty_mm * 1000;

    // Map uncertainty to IT grades (for ~25mm nominal)
    if (uncertainty_um <= 2) return "IT6";
    if (uncertainty_um <= 4) return "IT7";
    if (uncertainty_um <= 6) return "IT8";
    if (uncertainty_um <= 10) return "IT9";
    if (uncertainty_um <= 15) return "IT10";
    if (uncertainty_um <= 25) return "IT11";
    return "IT12";
  }

  /**
   * Predict kerf width and associated parameters.
   */
  predict(input: KerfWidthInput): KerfWidthResult {
    // Input validation
    if (input.wire_diameter_mm <= 0) {
      throw new Error("Wire diameter must be positive");
    }
    if (input.peak_current_A <= 0) {
      throw new Error("Peak current must be positive");
    }
    if (input.ton_us <= 0) {
      throw new Error("Pulse on-time must be positive");
    }

    // Calculate overcut
    const overcut = this.calculateOvercut(
      input.peak_current_A,
      input.ton_us,
      input.material,
      input.operation_type
    );

    // Calculate kerf width
    const kerfWidth = this.calculateKerfWidth(input.wire_diameter_mm, overcut);

    // Wire offset is half the total overcut (kerf - wire diameter) / 2 = overcut
    const wireOffset = overcut;

    // Uncertainty estimation (empirical: ±10-20% of overcut)
    const uncertaintyFactor = input.operation_type === "skim" ? 0.1 :
                              input.operation_type === "finishing" ? 0.15 : 0.2;
    const uncertainty = overcut * uncertaintyFactor;

    // Surface roughness estimation
    const Ra = this.estimateSurfaceRoughness(
      input.peak_current_A,
      input.ton_us,
      input.operation_type
    );

    // Recast layer estimation
    const recastLayer = this.estimateRecastLayer(Ra);

    // Tolerance class
    const toleranceClass = this.determineToleranceClass(uncertainty, input.operation_type);

    // Build result
    const result: KerfWidthResult = {
      kerf_width_mm: Math.round(kerfWidth * 10000) / 10000,
      overcut_mm: Math.round(overcut * 10000) / 10000,
      wire_offset_mm: Math.round(wireOffset * 10000) / 10000,
      uncertainty_mm: Math.round(uncertainty * 10000) / 10000,
      estimated_Ra_um: Math.round(Ra * 10) / 10,
      recast_layer_um: Math.round(recastLayer * 10) / 10,
      tolerance_class: toleranceClass,
    };

    // Add warning for tight tolerances with roughing parameters
    if (input.operation_type === "roughing" && parseInt(toleranceClass.slice(2)) < 9) {
      result.warning = `Roughing parameters may not achieve ${toleranceClass}. Consider finishing pass.`;
    }

    return result;
  }

  /**
   * Calculate required parameters to achieve target kerf.
   */
  calculateForTargetKerf(
    target_kerf_mm: number,
    wire_diameter_mm: number,
    material?: string
  ): { peak_current_A: number; ton_us: number } | null {
    // Target overcut
    const targetOvercut = (target_kerf_mm - wire_diameter_mm) / 2;

    if (targetOvercut < this.config.min_overcut_um / 1000) {
      return null; // Physically impossible
    }

    // Reverse solve empirical model (approximate)
    // overcut = k × Ip^a × ton^b × mult
    // Assume standard finishing conditions
    const mult = MATERIAL_OVERCUT_MULTIPLIERS[material?.toLowerCase() ?? "steel"] ?? 1.0;
    const opMult = OPERATION_FACTORS.finishing.overcut_mult;

    // Assume ton = 5us (typical finishing), solve for Ip
    const ton = 5;
    const k = this.config.base_overcut_coefficient;
    const a = this.config.current_exponent;
    const b = this.config.ton_exponent;

    // overcut = k × Ip^a × ton^b × mult × opMult
    // Ip = (overcut / (k × ton^b × mult × opMult))^(1/a)
    const denominator = k * Math.pow(ton, b) * mult * opMult;
    const Ip = Math.pow(targetOvercut / denominator, 1 / a);

    if (Ip < 1 || Ip > 50) {
      return null; // Unrealistic current
    }

    return {
      peak_current_A: Math.round(Ip * 10) / 10,
      ton_us: ton,
    };
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<KerfWidthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): KerfWidthConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmKerfWidthEngine = new WEDMKerfWidthEngine();
export { WEDMKerfWidthEngine };
