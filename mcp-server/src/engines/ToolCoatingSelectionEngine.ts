/**
 * ToolCoatingSelectionEngine — Optimal cutting tool coating selection
 *
 * Models: Temperature-based coating suitability, material-coating compatibility,
 *         friction coefficient estimation, speed range mapping
 * References: Sandvik Coromant (2023), Kennametal Coating Guide, Oerlikon Balzers
 * Extends: Fills tooling gap — no existing engine maps material+operation → coating
 */

// ─── Types ─────────────────────────────────────────────────────────

export type CoatingType =
  | "TiN"        // Titanium Nitride — general purpose, gold color
  | "TiCN"       // Titanium CarboNitride — harder, better wear
  | "TiAlN"      // Titanium Aluminum Nitride — high temp, dry/MQL
  | "AlTiN"      // Aluminum Titanium Nitride — extreme heat, aerospace
  | "AlCrN"      // Aluminum Chromium Nitride — stainless, gummy materials
  | "DLC"        // Diamond-Like Carbon — aluminum, non-ferrous, low friction
  | "CVD_diamond" // Chemical Vapor Deposition diamond — graphite, CFRP, MMC
  | "uncoated"   // HSS or carbide without coating
  | "nACo"       // nanocomposite AlCrN — universal hard coating
  | "ZrN";       // Zirconium Nitride — non-ferrous, medical

/** Material Class type definition.
 */
export type MaterialClass =
  | "carbon_steel"
  | "alloy_steel"
  | "stainless_steel"
  | "tool_steel"
  | "cast_iron"
  | "aluminum"
  | "copper"
  | "titanium"
  | "nickel_alloy"
  | "cobalt_alloy"
  | "hardened_steel"
  | "cfrp"
  | "gfrp"
  | "mmc"
  | "graphite"
  | "plastic";

/** Operation Type type definition.
 */
export type OperationType =
  | "roughing"
  | "finishing"
  | "semi_finishing"
  | "slotting"
  | "drilling"
  | "tapping"
  | "reaming"
  | "threading";

/** Coolant Strategy type definition.
 */
export type CoolantStrategy = "flood" | "mql" | "dry" | "cryogenic";

/** Tool Coating Input configuration/data structure.
 */
export interface ToolCoatingInput {
  material_class: MaterialClass;
  operation_type: OperationType;
  cutting_speed_m_min?: number;       // Vc — if known, refines selection
  coolant_strategy?: CoolantStrategy; // default based on material
  workpiece_hardness_hrc?: number;
  tool_substrate?: "carbide" | "hss" | "cermet" | "cbn" | "pcd";
  is_interrupted_cut?: boolean;
  requires_re_grind?: boolean;        // uncoated may be preferred for regrinding
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Coating Recommendation configuration/data structure.
 */
export interface CoatingRecommendation {
  coating: CoatingType;
  score: number;               // 0–1 suitability score
  reason: string;
}

/** Tool Coating Result configuration/data structure.
 */
export interface ToolCoatingResult {
  primary_recommendation: CoatingType;
  suitability_score: AtomicValue;
  max_service_temperature_C: AtomicValue;
  friction_coefficient: AtomicValue;
  coating_hardness_HV: AtomicValue;
  speed_multiplier: AtomicValue;       // vs uncoated baseline
  ranked_alternatives: CoatingRecommendation[];
  coolant_recommendation: CoolantStrategy;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Coating properties — manufacturer data composites */
interface CoatingProperties {
  max_temp_C: number;
  hardness_HV: number;
  friction_coeff: number;
  speed_multiplier: number;     // vs uncoated
  layer_thickness_um: [number, number]; // min/max
}

const COATING_PROPERTIES: Record<CoatingType, CoatingProperties> = {
  TiN:         { max_temp_C: 600,  hardness_HV: 2300, friction_coeff: 0.40, speed_multiplier: 1.2, layer_thickness_um: [1, 5] },
  TiCN:        { max_temp_C: 750,  hardness_HV: 3000, friction_coeff: 0.35, speed_multiplier: 1.4, layer_thickness_um: [1, 4] },
  TiAlN:       { max_temp_C: 900,  hardness_HV: 3300, friction_coeff: 0.30, speed_multiplier: 1.8, layer_thickness_um: [1, 5] },
  AlTiN:       { max_temp_C: 1000, hardness_HV: 3500, friction_coeff: 0.28, speed_multiplier: 2.0, layer_thickness_um: [1, 4] },
  AlCrN:       { max_temp_C: 1100, hardness_HV: 3200, friction_coeff: 0.35, speed_multiplier: 1.6, layer_thickness_um: [2, 6] },
  DLC:         { max_temp_C: 350,  hardness_HV: 5000, friction_coeff: 0.10, speed_multiplier: 1.5, layer_thickness_um: [0.5, 3] },
  CVD_diamond: { max_temp_C: 700,  hardness_HV: 10000, friction_coeff: 0.05, speed_multiplier: 3.0, layer_thickness_um: [5, 25] },
  uncoated:    { max_temp_C: 400,  hardness_HV: 1800, friction_coeff: 0.50, speed_multiplier: 1.0, layer_thickness_um: [0, 0] },
  nACo:        { max_temp_C: 1200, hardness_HV: 4500, friction_coeff: 0.25, speed_multiplier: 2.2, layer_thickness_um: [1, 4] },
  ZrN:         { max_temp_C: 550,  hardness_HV: 2800, friction_coeff: 0.30, speed_multiplier: 1.3, layer_thickness_um: [1, 4] },
};

/**
 * Material → coating compatibility matrix.
 * Score 0–1: 1 = ideal match, 0 = incompatible.
 * Based on Sandvik, Kennametal, Oerlikon application guides.
 */
const COMPATIBILITY: Record<MaterialClass, Partial<Record<CoatingType, number>>> = {
  carbon_steel:    { TiN: 0.7, TiCN: 0.85, TiAlN: 0.95, AlTiN: 0.80, AlCrN: 0.70, nACo: 0.85, uncoated: 0.50 },
  alloy_steel:     { TiN: 0.6, TiCN: 0.80, TiAlN: 0.95, AlTiN: 0.90, AlCrN: 0.75, nACo: 0.90, uncoated: 0.40 },
  stainless_steel: { TiN: 0.5, TiCN: 0.60, TiAlN: 0.80, AlTiN: 0.75, AlCrN: 0.95, nACo: 0.85, ZrN: 0.70, uncoated: 0.30 },
  tool_steel:      { TiN: 0.5, TiCN: 0.70, TiAlN: 0.90, AlTiN: 0.95, AlCrN: 0.80, nACo: 0.90, uncoated: 0.35 },
  cast_iron:       { TiN: 0.8, TiCN: 0.85, TiAlN: 0.80, AlCrN: 0.70, nACo: 0.75, uncoated: 0.60 },
  aluminum:        { DLC: 0.95, ZrN: 0.80, TiN: 0.40, uncoated: 0.70, CVD_diamond: 0.60 },
  copper:          { DLC: 0.90, ZrN: 0.85, TiN: 0.50, uncoated: 0.65 },
  titanium:        { AlTiN: 0.90, TiAlN: 0.85, AlCrN: 0.80, nACo: 0.95, uncoated: 0.30 },
  nickel_alloy:    { AlTiN: 0.85, AlCrN: 0.90, nACo: 0.95, TiAlN: 0.80, uncoated: 0.25 },
  cobalt_alloy:    { AlTiN: 0.80, AlCrN: 0.85, nACo: 0.95, TiAlN: 0.75, uncoated: 0.20 },
  hardened_steel:  { AlTiN: 0.95, TiAlN: 0.90, nACo: 0.95, AlCrN: 0.80, TiCN: 0.60, uncoated: 0.20 },
  cfrp:            { CVD_diamond: 0.95, DLC: 0.75, uncoated: 0.50 },
  gfrp:            { CVD_diamond: 0.90, DLC: 0.80, TiAlN: 0.50, uncoated: 0.55 },
  mmc:             { CVD_diamond: 0.95, DLC: 0.60, uncoated: 0.30 },
  graphite:        { CVD_diamond: 0.95, DLC: 0.85, TiAlN: 0.50, uncoated: 0.40 },
  plastic:         { DLC: 0.90, ZrN: 0.85, uncoated: 0.80, TiN: 0.50 },
};

/** Default coolant strategy by material */
const DEFAULT_COOLANT: Record<MaterialClass, CoolantStrategy> = {
  carbon_steel: "flood", alloy_steel: "flood", stainless_steel: "flood",
  tool_steel: "flood", cast_iron: "dry", aluminum: "flood",
  copper: "mql", titanium: "flood", nickel_alloy: "flood",
  cobalt_alloy: "flood", hardened_steel: "mql", cfrp: "mql",
  gfrp: "mql", mmc: "flood", graphite: "dry", plastic: "dry",
};

/** Coating suitability adjustments for dry/MQL machining */
const DRY_MACHINING_BONUS: Partial<Record<CoatingType, number>> = {
  TiAlN: 0.10, AlTiN: 0.15, AlCrN: 0.10, nACo: 0.15,
  DLC: -0.10, TiN: -0.15, uncoated: -0.25,
};

/** Interrupted cut adjustments — favor tough coatings */
const INTERRUPTED_CUT_BONUS: Partial<Record<CoatingType, number>> = {
  TiAlN: 0.05, AlCrN: 0.10, nACo: 0.10,
  CVD_diamond: -0.30, DLC: -0.15, // brittle coatings fail in interrupted cuts
};

// ─── Engine ────────────────────────────────────────────────────────

/** Tool Coating Selection Engine engine/manager.
 */
export class ToolCoatingSelectionEngine {
  /**
   * Select optimal tool coating for given material, operation, and conditions.
   *
   * Scoring model:
   *   S = compatibility × operation_factor × coolant_factor × interruption_factor
   * Ranked by composite score, top 3 alternatives returned.
   */
  calculate(input: ToolCoatingInput): ToolCoatingResult {
    const recommendations: string[] = [];
    let isSafe = true;

    const material = input.material_class;
    const operation = input.operation_type;
    const coolant = input.coolant_strategy ?? DEFAULT_COOLANT[material];
    const substrate = input.tool_substrate ?? "carbide";

    // ── Score each coating ──
    const scores: { coating: CoatingType; score: number; reason: string }[] = [];
    const compatMap = COMPATIBILITY[material] ?? {};

    const allCoatings = Object.keys(COATING_PROPERTIES) as CoatingType[];
    /** For.
     * @param const - const
     * @returns void
     */
    for (const coating of allCoatings) {
      let score = compatMap[coating] ?? 0.1; // low default if not in matrix
      let reasons: string[] = [];

      // Operation adjustments
      /** If.
       * @param operation - operation
       * @returns void
       */
      if (operation === "finishing" && COATING_PROPERTIES[coating].friction_coeff < 0.30) {
        score += 0.05;
        reasons.push("low friction for finishing");
      }
      /** If.
       * @param operation - operation
       * @returns void
       */
      if (operation === "roughing" && COATING_PROPERTIES[coating].max_temp_C >= 800) {
        score += 0.05;
        reasons.push("high temp tolerance for roughing");
      }
      /** If.
       * @param operation - operation
       * @returns void
       */
      if (operation === "tapping") {
        // Tapping needs low friction + toughness
        if (coating === "TiCN" || coating === "TiN") score += 0.10;
        if (coating === "CVD_diamond") score -= 0.30; // brittle, no tapping
        reasons.push("tapping suitability");
      }

      // Dry/MQL machining bonus
      /** If.
       * @param coolant - coolant
       * @returns void
       */
      if (coolant === "dry" || coolant === "mql") {
        score += DRY_MACHINING_BONUS[coating] ?? 0;
      }

      // Interrupted cut
      /** If.
       * @param input.is_interrupted_cut - input.is_interrupted_cut
       * @returns void
       */
      if (input.is_interrupted_cut) {
        score += INTERRUPTED_CUT_BONUS[coating] ?? 0;
      }

      // Hardness-based adjustments
      /** If.
       * @param input.workpiece_hardness_hrc - input.workpiece_hardness_hrc
       * @returns void
       */
      if (input.workpiece_hardness_hrc !== undefined) {
        /** If.
         * @param input.workpiece_hardness_hrc - input.workpiece_hardness_hrc
         * @returns void
         */
        if (input.workpiece_hardness_hrc >= 50 && COATING_PROPERTIES[coating].hardness_HV >= 3500) {
          score += 0.05;
          reasons.push("hard coating for hard material");
        }
        /** If.
         * @param input.workpiece_hardness_hrc - input.workpiece_hardness_hrc
         * @returns void
         */
        if (input.workpiece_hardness_hrc >= 55 && coating === "uncoated") {
          score -= 0.20;
          reasons.push("uncoated inadequate for hardened steel");
        }
      }

      // Substrate compatibility
      /** If.
       * @param substrate - substrate
       * @returns void
       */
      if (substrate === "hss") {
        /** If.
         * @param coating - coating
         * @returns void
         */
        if (coating === "CVD_diamond" || coating === "nACo") {
          score -= 0.30; // not suitable for HSS substrate
          reasons.push("not compatible with HSS");
        }
        /** If.
         * @param coating - coating
         * @returns void
         */
        if (coating === "TiN" || coating === "TiCN") {
          score += 0.05;
          reasons.push("good HSS coating");
        }
      }
      /** If.
       * @param substrate - substrate
       * @returns void
       */
      if (substrate === "pcd" || substrate === "cbn") {
        // These substrates are typically uncoated — coating adhesion is poor
        if (coating === "uncoated") score += 0.40;
        else score *= 0.3;
      }

      // Regrinding preference
      /** If.
       * @param input.requires_re_grind - input.requires_re_grind
       * @returns void
       */
      if (input.requires_re_grind && coating !== "uncoated" && coating !== "TiN") {
        score -= 0.10; // thick/hard coatings complicate regrinding
        reasons.push("regrind penalty");
      }

      // Clamp score to [0, 1]
      score = Math.max(0, Math.min(1, score));
      scores.push({ coating, score, reason: reasons.join(", ") || "base compatibility" });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const bestProps = COATING_PROPERTIES[best.coating];

    // ── Safety checks ──
    /** If.
     * @param best.score - best.score
     * @returns void
     */
    if (best.score < 0.3) {
      recommendations.push("Low confidence in coating selection — verify with tooling supplier.");
      isSafe = false;
    }

    // Check cutting speed vs coating temp limit
    /** If.
     * @param input.cutting_speed_m_min - input.cutting_speed_m_min
     * @returns void
     */
    if (input.cutting_speed_m_min !== undefined) {
      // Rough temperature estimation: T ≈ Vc × material_factor
      const tempFactors: Partial<Record<MaterialClass, number>> = {
        titanium: 8, nickel_alloy: 9, cobalt_alloy: 9,
        hardened_steel: 6, stainless_steel: 5, alloy_steel: 4,
        carbon_steel: 3, cast_iron: 3, aluminum: 1.5,
      };
      const tempFactor = tempFactors[material] ?? 3;
      const estTemp = input.cutting_speed_m_min * tempFactor;
      /** If.
       * @param estTemp - est temp
       * @returns void
       */
      if (estTemp > bestProps.max_temp_C * 0.9) {
        recommendations.push(
          `Estimated cutting temperature ~${Math.round(estTemp)}°C approaches ${best.coating} limit of ${bestProps.max_temp_C}°C. ` +
          `Consider reducing speed or using ${scores[1]?.coating ?? "a higher-temp coating"}.`
        );
      }
    }

    // DLC + ferrous warning
    if (best.coating === "DLC" && ["carbon_steel", "alloy_steel", "stainless_steel", "tool_steel", "hardened_steel"].includes(material)) {
      recommendations.push("WARNING: DLC has chemical affinity with iron — avoid for ferrous materials.");
      isSafe = false;
    }

    // CVD diamond + ferrous warning
    if (best.coating === "CVD_diamond" && ["carbon_steel", "alloy_steel", "stainless_steel", "tool_steel", "hardened_steel", "titanium", "nickel_alloy"].includes(material)) {
      recommendations.push("WARNING: CVD diamond dissolves in contact with ferrous metals and titanium at cutting temperatures.");
      isSafe = false;
    }

    // Coolant recommendation
    let coolantRec: CoolantStrategy = coolant;
    /** If.
     * @param bestProps.max_temp_C - best props.max_temp_ c
     * @returns void
     */
    if (bestProps.max_temp_C >= 900 && coolant === "flood") {
      coolantRec = "mql"; // high-temp coatings benefit from MQL or dry
      recommendations.push(`${best.coating} performs well with MQL or dry machining — flood coolant can cause thermal shock.`);
    }

    // ── Build result ──
    const uncertaintyBase = 1 - best.score; // lower score = higher uncertainty
    const ranked = scores.slice(1, 4).map(s => ({
      coating: s.coating,
      score: Math.round(s.score * 100) / 100,
      reason: s.reason,
    }));

    return {
      primary_recommendation: best.coating,
      suitability_score: {
        value: Math.round(best.score * 100) / 100,
        unit: "ratio",
        uncertainty: Math.round(uncertaintyBase * 0.2 * 100) / 100,
        source: `Material-coating compatibility × operation/coolant/interruption factors — ${best.reason}`,
      },
      max_service_temperature_C: {
        value: bestProps.max_temp_C,
        unit: "°C",
        uncertainty: bestProps.max_temp_C * 0.05,
        source: "Manufacturer composite data (Sandvik, Kennametal, Oerlikon Balzers)",
      },
      friction_coefficient: {
        value: bestProps.friction_coeff,
        unit: "dimensionless",
        uncertainty: bestProps.friction_coeff * 0.15,
        source: "Ball-on-disc tribology data — coating manufacturer specs",
      },
      coating_hardness_HV: {
        value: bestProps.hardness_HV,
        unit: "HV",
        uncertainty: bestProps.hardness_HV * 0.10,
        source: "Nanoindentation measurement — manufacturer data sheets",
      },
      speed_multiplier: {
        value: bestProps.speed_multiplier,
        unit: "ratio",
        uncertainty: bestProps.speed_multiplier * 0.10,
        source: "Cutting speed increase vs uncoated — Sandvik/Kennametal application guides",
      },
      ranked_alternatives: ranked,
      coolant_recommendation: coolantRec,
      is_safe: isSafe,
      recommendations,
    };
  }
}

/** Tool Coating Selection Engine constant.
 */
export const toolCoatingSelectionEngine = new ToolCoatingSelectionEngine();
