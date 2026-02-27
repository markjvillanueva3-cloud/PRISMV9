/**
 * AnodizeAllowanceEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates dimensional allowances for anodizing aluminum parts.
 * Type II (sulfuric) grows ~50% into metal, 50% builds up.
 * Type III (hard anodize) grows ~67% into metal, 33% builds up.
 *
 * Critical for precision fits — anodize can close bore tolerances
 * and grow OD tolerances out of spec if not compensated.
 *
 * Actions: anodize_allowance, anodize_tolerance, anodize_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type AnodizeType = "type_I_chromic" | "type_II_sulfuric" | "type_IIB_thin" | "type_III_hard";

export interface AnodizeAllowanceInput {
  anodize_type: AnodizeType;
  target_thickness_um: number;
  alloy: string;                       // e.g., "6061-T6", "7075-T73", "2024-T3"
  dimension_type: "od" | "id" | "flat";
  nominal_dimension_mm: number;
  tolerance_mm: number;
  is_dyed: boolean;
  seal_type: "hot_water" | "nickel_acetate" | "dichromate" | "none";
}

export interface AnodizeAllowanceResult {
  machine_to_mm: number;
  buildup_per_side_um: number;
  penetration_per_side_um: number;
  total_coating_um: number;
  final_dimension_mm: number;
  dimension_change_mm: number;
  hardness_HV: number;
  max_achievable_thickness_um: number;
  color_uniformity: "excellent" | "good" | "fair";
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ANODIZE_DATA: Record<AnodizeType, {
  buildup_ratio: number;        // fraction that builds up (vs penetrates)
  hardness_HV: number;
  max_thickness_um: number;
  typical_thickness_um: number;
}> = {
  type_I_chromic: { buildup_ratio: 0.50, hardness_HV: 300, max_thickness_um: 8, typical_thickness_um: 3 },
  type_II_sulfuric: { buildup_ratio: 0.50, hardness_HV: 350, max_thickness_um: 25, typical_thickness_um: 15 },
  type_IIB_thin: { buildup_ratio: 0.50, hardness_HV: 300, max_thickness_um: 10, typical_thickness_um: 5 },
  type_III_hard: { buildup_ratio: 0.33, hardness_HV: 500, max_thickness_um: 75, typical_thickness_um: 50 },
};

// Alloy anodize response (some alloys anodize differently)
const ALLOY_FACTOR: Record<string, number> = {
  "6061": 1.0, "7075": 0.95, "2024": 0.85, "5052": 1.05, "356": 0.80, "380": 0.70,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AnodizeAllowanceEngine {
  calculate(input: AnodizeAllowanceInput): AnodizeAllowanceResult {
    const data = ANODIZE_DATA[input.anodize_type];

    // Buildup and penetration
    const buildupPerSide = input.target_thickness_um * data.buildup_ratio;
    const penetrationPerSide = input.target_thickness_um * (1 - data.buildup_ratio);

    const buildupMm = buildupPerSide / 1000;

    // Machine-to dimension
    let machineTo: number;
    if (input.dimension_type === "od") {
      machineTo = input.nominal_dimension_mm - 2 * buildupMm;
    } else if (input.dimension_type === "id") {
      machineTo = input.nominal_dimension_mm + 2 * buildupMm;
    } else {
      machineTo = input.nominal_dimension_mm - buildupMm;
    }

    // Final dimension (should equal nominal)
    const dimChange = input.dimension_type === "od" ? 2 * buildupMm
      : input.dimension_type === "id" ? -2 * buildupMm
      : buildupMm;
    const finalDim = machineTo + dimChange;

    // Alloy factor
    const alloyKey = input.alloy.split("-")[0];
    const alFactor = ALLOY_FACTOR[alloyKey] || 0.9;

    // Effective hardness and max thickness
    const hardness = Math.round(data.hardness_HV * alFactor);
    const maxThickness = Math.round(data.max_thickness_um * alFactor);

    // Color uniformity
    const colorUniformity: AnodizeAllowanceResult["color_uniformity"] =
      alFactor >= 0.95 && input.is_dyed ? "excellent"
      : alFactor >= 0.85 ? "good"
      : "fair";

    const recs: string[] = [];
    if (input.target_thickness_um > maxThickness) {
      recs.push(`Target ${input.target_thickness_um}µm exceeds max achievable ${maxThickness}µm for ${input.alloy}`);
    }
    if (input.anodize_type === "type_III_hard" && input.is_dyed) {
      recs.push("Hard anodize dyeing produces limited colors (black/dark only) — verify color requirement");
    }
    if (Math.abs(dimChange) > input.tolerance_mm * 0.5) {
      recs.push(`Dimensional change ${(dimChange * 1000).toFixed(0)}µm uses >50% of tolerance — verify fit`);
    }
    if (input.alloy.includes("2024") || input.alloy.includes("7075")) {
      recs.push(`${input.alloy} high-copper alloy — may have softer, less uniform anodize layer`);
    }
    if (recs.length === 0) recs.push("Anodize allowance calculated — proceed");

    return {
      machine_to_mm: Math.round(machineTo * 10000) / 10000,
      buildup_per_side_um: Math.round(buildupPerSide * 10) / 10,
      penetration_per_side_um: Math.round(penetrationPerSide * 10) / 10,
      total_coating_um: input.target_thickness_um,
      final_dimension_mm: Math.round(finalDim * 10000) / 10000,
      dimension_change_mm: Math.round(dimChange * 10000) / 10000,
      hardness_HV: hardness,
      max_achievable_thickness_um: maxThickness,
      color_uniformity: colorUniformity,
      recommendations: recs,
    };
  }
}

export const anodizeAllowanceEngine = new AnodizeAllowanceEngine();
