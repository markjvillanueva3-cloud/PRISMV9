/**
 * CryogenicTreatmentEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Models deep cryogenic treatment (DCT) and shallow cryogenic treatment (SCT)
 * effects on tool steels, HSS, and carbide tooling.
 *
 * Deep cryo (-196°C liquid nitrogen): converts retained austenite → martensite,
 * precipitates ultra-fine eta-carbides, relieves residual stress.
 * Improves wear resistance 30-300% depending on material.
 *
 * Actions: cryo_predict, cryo_recommend, cryo_roi
 */

// ============================================================================
// TYPES
// ============================================================================

export type CryoLevel = "shallow" | "deep" | "ultra_deep";

export interface CryoTreatmentInput {
  material_type: "HSS" | "carbide" | "tool_steel" | "bearing_steel" | "stainless";
  material_grade?: string;             // e.g., "M2", "D2", "WC-6Co"
  carbon_pct: number;
  cobalt_pct?: number;                 // for carbide grades
  retained_austenite_pct: number;      // before treatment
  prior_hardness_HRC: number;
  cryo_level: CryoLevel;
  soak_time_hr: number;               // time at cryogenic temperature
  ramp_rate_C_per_min?: number;        // cooling rate (default 1°C/min)
  post_temper_temp_C?: number;         // optional post-cryo temper
}

export interface CryoTreatmentResult {
  predicted_hardness_HRC: number;
  hardness_gain_HRC: number;
  retained_austenite_after_pct: number;
  wear_improvement_pct: number;
  toughness_change_pct: number;        // negative = loss
  dimensional_change_um_per_mm: number;
  eta_carbide_precipitation: boolean;
  thermal_cycle_benefit: boolean;
  recommendations: string[];
}

export interface CryoROI {
  tool_life_multiplier: number;
  cost_per_treatment_usd: number;
  payback_tools: number;               // number of tools before ROI positive
  annual_savings_usd: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CRYO_TEMP: Record<CryoLevel, number> = {
  shallow: -80,       // dry ice range
  deep: -196,         // liquid nitrogen
  ultra_deep: -196,   // LN2 with extended soak
};

// RA transformation efficiency by cryo level
const RA_TRANSFORM_PCT: Record<CryoLevel, number> = {
  shallow: 0.50,   // converts ~50% of retained austenite
  deep: 0.85,      // converts ~85%
  ultra_deep: 0.95, // converts ~95%
};

// Wear improvement by material (DCT, baseline at 24hr soak)
const WEAR_IMPROVEMENT_BASE: Record<string, number> = {
  HSS: 110,          // 110% improvement (2.1x life)
  carbide: 40,       // 40% improvement
  tool_steel: 85,    // 85% improvement
  bearing_steel: 50, // 50% improvement
  stainless: 25,     // 25% improvement
};

// Soak time effectiveness (diminishing returns after 24hr)
const SOAK_EFFECTIVENESS = (hours: number): number => {
  if (hours <= 0) return 0;
  if (hours <= 24) return hours / 24;
  if (hours <= 48) return 1.0 + (hours - 24) / 48 * 0.15;
  return 1.15; // cap at 48+ hours
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CryogenicTreatmentEngine {
  predict(input: CryoTreatmentInput): CryoTreatmentResult {
    const cryoTemp = CRYO_TEMP[input.cryo_level];
    const raTransform = RA_TRANSFORM_PCT[input.cryo_level];
    const soakEff = SOAK_EFFECTIVENESS(input.soak_time_hr);

    // Retained austenite transformation
    const raConverted = input.retained_austenite_pct * raTransform * soakEff;
    const raAfter = Math.max(0, input.retained_austenite_pct - raConverted);

    // Hardness gain from RA → martensite conversion
    // ~1 HRC per 3% RA converted (approximate)
    const hardnessFromRA = raConverted / 3;

    // Eta-carbide precipitation (only at deep/ultra_deep with sufficient soak)
    const etaCarbides = input.cryo_level !== "shallow" && input.soak_time_hr >= 12 && input.carbon_pct >= 0.4;
    const hardnessFromCarbides = etaCarbides ? 1.5 : 0;

    const hardnessGain = Math.round((hardnessFromRA + hardnessFromCarbides) * 10) / 10;
    const predictedHRC = Math.min(70, input.prior_hardness_HRC + hardnessGain);

    // Wear improvement
    const baseImprovement = WEAR_IMPROVEMENT_BASE[input.material_type] || 40;
    const wearImprovement = Math.round(baseImprovement * soakEff * (input.cryo_level === "shallow" ? 0.4 : 1.0));

    // Toughness change: slight decrease from more martensite, but post-temper helps
    let toughnessChange = -5 - raConverted * 0.3; // slight loss
    if (input.post_temper_temp_C && input.post_temper_temp_C >= 150) {
      toughnessChange += 8; // post-cryo temper recovers toughness
    }
    if (etaCarbides) toughnessChange += 3; // fine carbides help toughness

    // Dimensional change (RA→martensite expansion: ~0.01% per 1% RA converted)
    const dimChange = raConverted * 0.1; // µm per mm

    // Thermal cycle benefit (ramp rate matters)
    const rampRate = input.ramp_rate_C_per_min || 1.0;
    const thermalBenefit = rampRate <= 2.0; // slow cooling avoids thermal shock

    // Recommendations
    const recs: string[] = [];
    if (input.cryo_level === "shallow" && input.retained_austenite_pct > 10) {
      recs.push("Shallow cryo insufficient for high RA — switch to deep cryogenic treatment");
    }
    if (input.soak_time_hr < 12) {
      recs.push("Minimum 12hr soak recommended for eta-carbide precipitation");
    }
    if (!input.post_temper_temp_C) {
      recs.push("Add post-cryo temper (150-200°C, 2hr) to relieve transformation stress and recover toughness");
    }
    if (rampRate > 3) {
      recs.push("Reduce cooling rate to ≤2°C/min to prevent thermal shock cracking");
    }
    if (input.material_type === "carbide" && input.cryo_level === "deep") {
      recs.push("Carbide benefits mainly from stress relief and cobalt phase refinement, not RA conversion");
    }
    if (recs.length === 0) {
      recs.push("Cryogenic treatment parameters are optimal — proceed");
    }

    return {
      predicted_hardness_HRC: Math.round(predictedHRC * 10) / 10,
      hardness_gain_HRC: hardnessGain,
      retained_austenite_after_pct: Math.round(raAfter * 10) / 10,
      wear_improvement_pct: wearImprovement,
      toughness_change_pct: Math.round(toughnessChange * 10) / 10,
      dimensional_change_um_per_mm: Math.round(dimChange * 100) / 100,
      eta_carbide_precipitation: etaCarbides,
      thermal_cycle_benefit: thermalBenefit,
      recommendations: recs,
    };
  }

  recommend(material_type: string, ra_pct: number): {
    cryo_level: CryoLevel; soak_hr: number; post_temper_C: number; notes: string;
  } {
    const level: CryoLevel = ra_pct > 15 ? "deep" : ra_pct > 5 ? "deep" : "shallow";
    const soak = level === "deep" ? 24 : 8;
    const temper = material_type === "HSS" ? 180 : 150;
    return {
      cryo_level: level,
      soak_hr: soak,
      post_temper_C: temper,
      notes: `${level === "deep" ? "LN2 (-196°C)" : "Dry ice (-80°C)"} for ${soak}hr, ramp ≤1°C/min, post-temper at ${temper}°C for 2hr`,
    };
  }

  calculateROI(input: CryoTreatmentInput, toolCost_usd: number, toolsPerYear: number): CryoROI {
    const result = this.predict(input);
    const lifeMultiplier = 1 + result.wear_improvement_pct / 100;

    // Treatment cost estimate
    const costPerTool = input.cryo_level === "shallow" ? 15 : input.cryo_level === "deep" ? 35 : 50;

    // Tools saved per year
    const currentTools = toolsPerYear;
    const treatedTools = Math.ceil(toolsPerYear / lifeMultiplier);
    const toolsSaved = currentTools - treatedTools;

    // Cost analysis
    const savingsFromTools = toolsSaved * toolCost_usd;
    const treatmentCost = treatedTools * costPerTool;
    const annualSavings = savingsFromTools - treatmentCost;

    // Payback: how many tools until treatment cost is recovered
    const savingsPerTool = toolCost_usd * (1 - 1 / lifeMultiplier) - costPerTool;
    const payback = savingsPerTool > 0 ? Math.ceil(costPerTool / savingsPerTool * lifeMultiplier) : Infinity;

    return {
      tool_life_multiplier: Math.round(lifeMultiplier * 100) / 100,
      cost_per_treatment_usd: costPerTool,
      payback_tools: payback === Infinity ? 999 : payback,
      annual_savings_usd: Math.round(annualSavings),
    };
  }
}

export const cryogenicTreatmentEngine = new CryogenicTreatmentEngine();
