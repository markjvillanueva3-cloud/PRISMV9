/**
 * WEDMDielectricCorrectionEngine — Dielectric-Specific Spark Gap Correction
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-08
 *
 * Corrects spark gap calculations based on dielectric properties:
 * - DI water vs oil affects gap by 10-15%
 * - Conductivity impacts breakdown characteristics
 * - Temperature affects dielectric strength
 *
 * Integrates with kerf width and wire offset calculations.
 *
 * Physics basis:
 * - Breakdown voltage Vb = f(dielectric_strength, gap_distance)
 * - Gap = k × (Ip × ton)^0.5 × dielectric_factor
 * - DI water: lower dielectric constant → smaller gap
 * - Oil: higher dielectric constant → larger gap
 *
 * Reference: Kunieda et al., "Dielectric Properties in EDM" (2005)
 *
 * @module engines/WEDMDielectricCorrectionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type DielectricType = "di_water" | "oil" | "kerosene" | "synthetic";

export interface DielectricProperties {
  type: DielectricType;
  /** Dielectric constant (relative permittivity) */
  dielectric_constant: number;
  /** Dielectric strength in kV/mm */
  dielectric_strength_kV_mm: number;
  /** Electrical conductivity in μS/cm */
  conductivity_uS_cm: number;
  /** Thermal conductivity in W/(m·K) */
  thermal_conductivity: number;
  /** Gap correction factor (relative to baseline) */
  gap_factor: number;
  /** Flushing efficiency factor */
  flushing_efficiency: number;
  /** Wire corrosion rate factor */
  corrosion_factor: number;
}

export interface DielectricCorrectionInput {
  /** Base spark gap from power settings (mm) */
  base_gap_mm: number;
  /** Dielectric type */
  dielectric_type: DielectricType;
  /** Dielectric temperature in °C */
  temperature_C?: number;
  /** Measured conductivity in μS/cm (overrides default) */
  conductivity_uS_cm?: number;
  /** Workpiece material (affects gap) */
  workpiece_material?: string;
  /** Operation type */
  operation_type?: "roughing" | "finishing" | "skim";
}

export interface DielectricCorrectionResult {
  /** Corrected spark gap in mm */
  corrected_gap_mm: number;
  /** Correction factor applied */
  correction_factor: number;
  /** Components of correction */
  correction_breakdown: {
    dielectric_factor: number;
    temperature_factor: number;
    conductivity_factor: number;
    material_factor: number;
  };
  /** Recommended kerf adjustment in mm */
  kerf_adjustment_mm: number;
  /** Recommended wire offset adjustment in mm */
  offset_adjustment_mm: number;
  /** Dielectric properties used */
  dielectric_properties: DielectricProperties;
  /** Warnings */
  warnings: string[];
  /** Recommendations */
  recommendations: string[];
}

export interface DielectricCorrectionConfig {
  /** Reference temperature for baseline (°C) */
  reference_temp_C: number;
  /** Temperature coefficient (% change per °C) */
  temp_coefficient_per_C: number;
  /** Conductivity reference (μS/cm) */
  conductivity_reference_uS_cm: number;
  /** Conductivity sensitivity factor */
  conductivity_sensitivity: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: DielectricCorrectionConfig = {
  reference_temp_C: 20,
  temp_coefficient_per_C: 0.002, // 0.2% per °C
  conductivity_reference_uS_cm: 5,
  conductivity_sensitivity: 0.01, // 1% per μS/cm deviation
};

// Dielectric property database
const DIELECTRIC_DATABASE: Record<DielectricType, DielectricProperties> = {
  di_water: {
    type: "di_water",
    dielectric_constant: 80,
    dielectric_strength_kV_mm: 65,
    conductivity_uS_cm: 1,
    thermal_conductivity: 0.6,
    gap_factor: 0.85, // 15% smaller gap than oil
    flushing_efficiency: 1.2,
    corrosion_factor: 1.1,
  },
  oil: {
    type: "oil",
    dielectric_constant: 2.2,
    dielectric_strength_kV_mm: 15,
    conductivity_uS_cm: 0.001,
    thermal_conductivity: 0.15,
    gap_factor: 1.0, // Baseline
    flushing_efficiency: 0.8,
    corrosion_factor: 0.9,
  },
  kerosene: {
    type: "kerosene",
    dielectric_constant: 1.8,
    dielectric_strength_kV_mm: 12,
    conductivity_uS_cm: 0.0001,
    thermal_conductivity: 0.14,
    gap_factor: 0.95,
    flushing_efficiency: 0.85,
    corrosion_factor: 0.85,
  },
  synthetic: {
    type: "synthetic",
    dielectric_constant: 2.5,
    dielectric_strength_kV_mm: 18,
    conductivity_uS_cm: 0.001,
    thermal_conductivity: 0.17,
    gap_factor: 1.05,
    flushing_efficiency: 0.9,
    corrosion_factor: 0.8,
  },
};

// Material-specific gap adjustments
const MATERIAL_GAP_FACTORS: Record<string, number> = {
  steel: 1.0,
  tool_steel: 1.0,
  stainless: 1.05,
  aluminum: 1.15,
  copper: 1.1,
  brass: 1.08,
  titanium: 0.95,
  tungsten_carbide: 0.85,
  carbide: 0.85,
  inconel: 0.92,
  graphite: 1.25,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMDielectricCorrectionEngine {
  private config: DielectricCorrectionConfig;

  constructor(config: Partial<DielectricCorrectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get dielectric properties by type.
   */
  getDielectricProperties(type: DielectricType): DielectricProperties {
    return DIELECTRIC_DATABASE[type];
  }

  /**
   * Calculate temperature correction factor.
   * Gap increases slightly with temperature due to reduced dielectric strength.
   */
  calculateTemperatureFactor(temperature_C: number): number {
    const deltaT = temperature_C - this.config.reference_temp_C;
    // Gap increases with temperature
    return 1 + deltaT * this.config.temp_coefficient_per_C;
  }

  /**
   * Calculate conductivity correction factor.
   * Higher conductivity (contaminated dielectric) increases gap.
   */
  calculateConductivityFactor(
    measured_uS_cm: number,
    dielectric_type: DielectricType
  ): number {
    const props = this.getDielectricProperties(dielectric_type);
    const reference = props.conductivity_uS_cm;

    // Deviation from expected conductivity
    const deviation = measured_uS_cm - reference;
    return 1 + deviation * this.config.conductivity_sensitivity;
  }

  /**
   * Get material gap factor.
   */
  getMaterialFactor(material?: string): number {
    if (!material) return 1.0;
    const mat = material.toLowerCase().replace(/[- ]/g, "_");
    return MATERIAL_GAP_FACTORS[mat] ?? 1.0;
  }

  /**
   * Calculate corrected spark gap.
   */
  calculateCorrectedGap(input: DielectricCorrectionInput): DielectricCorrectionResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Get dielectric properties
    const props = this.getDielectricProperties(input.dielectric_type);

    // Calculate individual correction factors
    const dielectricFactor = props.gap_factor;

    const tempFactor = input.temperature_C !== undefined
      ? this.calculateTemperatureFactor(input.temperature_C)
      : 1.0;

    const conductivityFactor = input.conductivity_uS_cm !== undefined
      ? this.calculateConductivityFactor(input.conductivity_uS_cm, input.dielectric_type)
      : 1.0;

    const materialFactor = this.getMaterialFactor(input.workpiece_material);

    // Combined correction factor
    const totalFactor = dielectricFactor * tempFactor * conductivityFactor * materialFactor;

    // Apply to base gap
    const correctedGap = input.base_gap_mm * totalFactor;

    // Kerf adjustment = 2 × gap change (both sides)
    const gapChange = correctedGap - input.base_gap_mm;
    const kerfAdjustment = 2 * gapChange;

    // Offset adjustment = gap change (one side)
    const offsetAdjustment = gapChange;

    // Generate warnings
    if (input.temperature_C !== undefined && input.temperature_C > 35) {
      warnings.push(`High dielectric temperature (${input.temperature_C}°C) - monitor for drift`);
    }

    if (input.conductivity_uS_cm !== undefined) {
      const expected = props.conductivity_uS_cm;
      if (input.dielectric_type === "di_water" && input.conductivity_uS_cm > 10) {
        warnings.push(`High DI water conductivity (${input.conductivity_uS_cm} μS/cm) - consider replacement`);
        recommendations.push("Replace DI water when conductivity exceeds 10 μS/cm");
      }
    }

    if (input.workpiece_material === "graphite" && input.dielectric_type === "di_water") {
      warnings.push("Graphite cutting in DI water may cause excessive electrode wear");
      recommendations.push("Consider oil dielectric for graphite workpieces");
    }

    // Operation-specific recommendations
    if (input.operation_type === "finishing" && props.flushing_efficiency < 1.0) {
      recommendations.push(`${input.dielectric_type} has lower flushing efficiency - may affect surface finish`);
    }

    return {
      corrected_gap_mm: Math.round(correctedGap * 10000) / 10000,
      correction_factor: Math.round(totalFactor * 10000) / 10000,
      correction_breakdown: {
        dielectric_factor: Math.round(dielectricFactor * 10000) / 10000,
        temperature_factor: Math.round(tempFactor * 10000) / 10000,
        conductivity_factor: Math.round(conductivityFactor * 10000) / 10000,
        material_factor: Math.round(materialFactor * 10000) / 10000,
      },
      kerf_adjustment_mm: Math.round(kerfAdjustment * 10000) / 10000,
      offset_adjustment_mm: Math.round(offsetAdjustment * 10000) / 10000,
      dielectric_properties: props,
      warnings,
      recommendations,
    };
  }

  /**
   * Compare correction across dielectric types.
   */
  compareDielectrics(
    base_gap_mm: number,
    workpiece_material?: string
  ): Record<DielectricType, { gap_mm: number; factor: number }> {
    const result: Record<DielectricType, { gap_mm: number; factor: number }> = {} as any;

    for (const type of Object.keys(DIELECTRIC_DATABASE) as DielectricType[]) {
      const correction = this.calculateCorrectedGap({
        base_gap_mm,
        dielectric_type: type,
        workpiece_material,
      });
      result[type] = {
        gap_mm: correction.corrected_gap_mm,
        factor: correction.correction_factor,
      };
    }

    return result;
  }

  /**
   * Get optimal dielectric for material.
   */
  recommendDielectric(workpiece_material: string): {
    recommended: DielectricType;
    reason: string;
    alternatives: DielectricType[];
  } {
    const mat = workpiece_material.toLowerCase();

    if (mat.includes("graphite")) {
      return {
        recommended: "oil",
        reason: "Oil prevents electrode wear on graphite",
        alternatives: ["kerosene"],
      };
    }

    if (mat.includes("carbide") || mat.includes("tungsten")) {
      return {
        recommended: "di_water",
        reason: "DI water provides better flushing for hard materials",
        alternatives: ["synthetic"],
      };
    }

    if (mat.includes("aluminum") || mat.includes("copper")) {
      return {
        recommended: "di_water",
        reason: "DI water provides better surface finish on soft metals",
        alternatives: ["synthetic"],
      };
    }

    // Default: DI water for most metals
    return {
      recommended: "di_water",
      reason: "DI water is standard for steel and most metals",
      alternatives: ["synthetic", "oil"],
    };
  }

  /**
   * List available dielectric types.
   */
  getAvailableDielectrics(): DielectricType[] {
    return Object.keys(DIELECTRIC_DATABASE) as DielectricType[];
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<DielectricCorrectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): DielectricCorrectionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmDielectricCorrectionEngine = new WEDMDielectricCorrectionEngine();
export { WEDMDielectricCorrectionEngine };
