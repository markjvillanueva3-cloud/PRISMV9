/**
 * TensileToMachinabilityEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Converts material tensile test data to machinability parameters.
 * Maps UTS, yield strength, elongation, and hardness to recommended
 * cutting speeds, specific cutting force, and tool selection.
 *
 * Uses AISI machinability rating system (AISI 1212 = 100%) as baseline.
 *
 * Actions: tensile_to_machinability, machinability_compare, machinability_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TensileData {
  ultimate_tensile_MPa: number;
  yield_strength_MPa: number;
  elongation_pct: number;
  hardness_HBW: number;
  material_class: "carbon_steel" | "alloy_steel" | "stainless" | "aluminum" | "titanium" | "nickel_alloy" | "cast_iron";
  condition?: string;                  // e.g., "annealed", "quenched & tempered"
}

export interface MachinabilityResult {
  machinability_rating_pct: number;    // AISI scale (1212 = 100%)
  recommended_speed_factor: number;    // multiply by base speed
  specific_cutting_force_N_mm2: number;
  chip_type: "continuous" | "segmented" | "discontinuous" | "built_up_edge";
  tool_recommendation: string;
  coolant_recommendation: string;
  feed_range_mm_per_rev: { min: number; max: number };
  work_hardening_tendency: "low" | "moderate" | "high";
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TensileToMachinabilityEngine {
  convert(input: TensileData): MachinabilityResult {
    // Base machinability rating (AISI 1212 free-machining = 100%)
    let rating: number;
    const uts = input.ultimate_tensile_MPa;
    const elong = input.elongation_pct;

    switch (input.material_class) {
      case "carbon_steel":
        // Low carbon is harder to machine (gummy), medium is best
        rating = uts < 400 ? 70 : uts < 600 ? 85 : uts < 800 ? 65 : 45;
        break;
      case "alloy_steel":
        rating = uts < 700 ? 60 : uts < 1000 ? 45 : 30;
        break;
      case "stainless":
        rating = uts < 600 ? 50 : uts < 800 ? 40 : 30;
        break;
      case "aluminum":
        rating = 300; // aluminum is very machinable
        break;
      case "titanium":
        rating = 25;
        break;
      case "nickel_alloy":
        rating = 15;
        break;
      case "cast_iron":
        rating = uts < 300 ? 80 : uts < 500 ? 60 : 40;
        break;
      default:
        rating = 50;
    }

    // Adjust for elongation (ductile materials = BUE risk)
    if (elong > 30 && input.material_class !== "aluminum") rating *= 0.85;

    // Speed factor (rating / 100)
    const speedFactor = rating / 100;

    // Specific cutting force (Kienzle model approximation)
    const kc = 0.7 * uts + 300; // approximate for steels

    // Chip type
    const chipType: MachinabilityResult["chip_type"] =
      input.material_class === "cast_iron" ? "discontinuous"
      : elong > 25 && uts < 500 ? "built_up_edge"
      : elong < 10 ? "segmented"
      : "continuous";

    // Tool recommendation
    const toolRec = uts > 1200 ? "CBN or ceramic inserts"
      : uts > 800 ? "Coated carbide (CVD Al2O3+TiCN)"
      : input.material_class === "aluminum" ? "Uncoated carbide or PCD"
      : input.material_class === "stainless" ? "Coated carbide (PVD TiAlN) with chipbreaker"
      : input.material_class === "titanium" ? "Uncoated WC-Co with sharp edge"
      : "Coated carbide general purpose";

    // Coolant
    const coolantRec = input.material_class === "cast_iron" ? "Dry or air blast preferred"
      : input.material_class === "aluminum" ? "Flood coolant (water-soluble, non-staining)"
      : input.material_class === "titanium" ? "High-pressure coolant (70+ bar) through-tool"
      : "Flood coolant with EP additives";

    // Feed range
    const feedMin = uts > 1000 ? 0.05 : 0.08;
    const feedMax = uts > 1000 ? 0.20 : input.material_class === "aluminum" ? 0.40 : 0.30;

    // Work hardening
    const workHard: MachinabilityResult["work_hardening_tendency"] =
      input.material_class === "stainless" || input.material_class === "nickel_alloy" ? "high"
      : input.material_class === "titanium" ? "moderate"
      : "low";

    const recs: string[] = [];
    if (rating < 30) recs.push("Difficult to machine — use rigid setup, sharp tools, and conservative parameters");
    if (chipType === "built_up_edge") recs.push("BUE risk — increase speed or use coated tool with low friction");
    if (workHard === "high") recs.push("High work hardening — maintain positive feed, never dwell in cut");
    if (recs.length === 0) recs.push("Standard machinability — use recommended parameters");

    return {
      machinability_rating_pct: Math.round(rating),
      recommended_speed_factor: Math.round(speedFactor * 100) / 100,
      specific_cutting_force_N_mm2: Math.round(kc),
      chip_type: chipType,
      tool_recommendation: toolRec,
      coolant_recommendation: coolantRec,
      feed_range_mm_per_rev: { min: feedMin, max: feedMax },
      work_hardening_tendency: workHard,
      recommendations: recs,
    };
  }
}

export const tensileToMachinabilityEngine = new TensileToMachinabilityEngine();
