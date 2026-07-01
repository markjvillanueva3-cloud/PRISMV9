/**
 * EDMDrawingInterpretationEngine — WEDM-P2P MS1: Drawing Interpretation for Wire EDM
 *
 * Consolidates MS1 U01–U06:
 *   U01  EDMFeatureClassifier       — classify features by EDM process type
 *   U02  GDTExtractionForEDM        — GD&T tolerance extraction for EDM context
 *   U03  ToleranceToPassMapper      — map tolerance/finish to pass count
 *   U04  MaterialCalloutParser      — material conductivity & machinability
 *   U05  PartThicknessAnalyzer      — thickness-based speed correction & risk
 *   U06  ProcessSelectionAdvisor    — wire vs sinker vs alternative recommendation
 *
 * References:
 *   - Handbook of Wire EDM (Sommer & Sommer, 2005)
 *   - ISO 4287 — Surface texture Ra parameters
 *   - Benedict (1987) — Electrical Discharge Machining
 *   - Jameson (2001) — EDM: Process, Technology & Applications
 *
 * Actions: interpret, classify_features, recommend_process, calculate_passes
 *
 * @module engines/EDMDrawingInterpretationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PartFeature {
  name: string;
  type: "profile" | "hole" | "slot" | "cavity" | "contour" | "pocket";
  is_through: boolean;
  dimensions_mm: {
    length?: number;
    width?: number;
    depth?: number;
    diameter?: number;
  };
  tolerance_mm?: number;
  surface_finish_ra_um?: number;
  min_corner_radius_mm?: number;
  taper_angle_deg?: number;
  profile_length_mm?: number;
}

export interface EDMDrawingInput {
  features: PartFeature[];
  material?: string;
  material_hardness_hrc?: number;
  carbon_content_percent?: number;
  overall_thickness_mm?: number;
  tolerance_mm?: number;
  target_ra_um?: number;
  is_through_feature?: boolean;
  min_corner_radius_mm?: number;
  max_taper_deg?: number;
}

export interface ClassifiedFeature {
  name: string;
  edm_process: "wire_edm" | "sinker_edm" | "hole_popper" | "micro_edm" | "not_edm";
  reason: string;
  confidence: number;
}

export interface ProcessRecommendation {
  primary: string;
  alternatives: Array<{ process: string; reason: string; tradeoff: string }>;
  edm_required: boolean;
  reason: string;
}

export interface PassRequirement {
  total_passes: number;
  rough: number;
  semi_finish: number;
  finish: number;
  super_finish: number;
  driven_by: "tolerance" | "surface_finish" | "both";
  tolerance_passes: number;
  finish_passes: number;
}

export interface MaterialCallout {
  material_name: string;
  is_conductive: boolean;
  edm_machinability: "excellent" | "good" | "fair" | "poor" | "not_possible";
  hardness_hrc: number;
  carbon_content_percent: number;
  notes: string[];
}

export interface ThicknessAnalysis {
  thickness_mm: number;
  speed_correction_factor: number;
  wire_tension_impact: string;
  flushing_difficulty: string;
  wire_break_risk: string;
}

export interface EDMDrawingResult {
  features_classified: ClassifiedFeature[];
  recommended_process: ProcessRecommendation;
  pass_requirements: PassRequirement;
  material_assessment: MaterialCallout;
  thickness_analysis: ThicknessAnalysis;
  feasibility_notes: string[];
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MaterialRecord {
  is_conductive: boolean;
  edm_machinability: "excellent" | "good" | "fair" | "poor" | "not_possible";
  default_hardness_hrc: number;
  default_carbon_pct: number;
  notes: string[];
}

const MATERIAL_DB: Record<string, MaterialRecord> = {
  // Tool steels — excellent EDM candidates
  "d2":           { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 60, default_carbon_pct: 1.5,  notes: ["High-carbon high-chrome tool steel", "Excellent EDM response hardened or annealed"] },
  "a2":           { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 60, default_carbon_pct: 1.0,  notes: ["Air-hardening tool steel", "Stable in wire EDM — minimal distortion"] },
  "s7":           { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 56, default_carbon_pct: 0.5,  notes: ["Shock-resistant tool steel"] },
  "m2":           { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 63, default_carbon_pct: 0.85, notes: ["HSS tool steel", "Very stable in EDM"] },
  "h13":          { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 50, default_carbon_pct: 0.4,  notes: ["Hot-work die steel", "Common EDM workpiece"] },
  "o1":           { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 62, default_carbon_pct: 0.9,  notes: ["Oil-hardening tool steel"] },
  "p20":          { is_conductive: true, edm_machinability: "excellent", default_hardness_hrc: 33, default_carbon_pct: 0.35, notes: ["Mold steel", "Pre-hardened, excellent EDM"] },

  // Carbon & alloy steels
  "1018":         { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 15, default_carbon_pct: 0.18, notes: ["Low-carbon steel", "May need stress relief after EDM"] },
  "1045":         { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 25, default_carbon_pct: 0.45, notes: ["Medium-carbon steel"] },
  "4140":         { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 30, default_carbon_pct: 0.4,  notes: ["Chrome-moly alloy steel"] },
  "4340":         { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 35, default_carbon_pct: 0.4,  notes: ["Ni-Cr-Mo alloy steel"] },

  // Stainless steels
  "304":          { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 20, default_carbon_pct: 0.08, notes: ["Austenitic stainless", "Slower EDM than tool steel"] },
  "316":          { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 20, default_carbon_pct: 0.08, notes: ["Marine-grade stainless"] },
  "17-4ph":       { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 40, default_carbon_pct: 0.07, notes: ["Precipitation-hardened stainless"] },
  "440c":         { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 58, default_carbon_pct: 1.0,  notes: ["High-carbon stainless", "Good EDM candidate when hardened"] },

  // Carbide & superhard
  "carbide":      { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 75, default_carbon_pct: 0.0,  notes: ["Tungsten carbide", "Requires low-energy settings", "Use brass wire preferred"] },
  "tungsten":     { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 70, default_carbon_pct: 0.0,  notes: ["Pure tungsten", "Very slow EDM cutting speed"] },

  // Copper & alloys
  "copper":       { is_conductive: true, edm_machinability: "good",      default_hardness_hrc: 10, default_carbon_pct: 0.0,  notes: ["High conductivity — fast flushing needed"] },
  "brass":        { is_conductive: true, edm_machinability: "excellent",  default_hardness_hrc: 12, default_carbon_pct: 0.0, notes: ["Excellent EDM machinability", "Often used as electrode material"] },
  "beryllium copper": { is_conductive: true, edm_machinability: "good",  default_hardness_hrc: 40, default_carbon_pct: 0.0,  notes: ["BeCu", "Good EDM response", "Toxic dust — EDM preferred over milling"] },

  // Aluminum
  "aluminum":     { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 8,  default_carbon_pct: 0.0,  notes: ["High conductivity reduces spark efficiency", "Milling often faster than EDM"] },
  "6061":         { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 10, default_carbon_pct: 0.0,  notes: ["Aluminum alloy", "EDM possible but milling preferred unless tight geometry"] },
  "7075":         { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 15, default_carbon_pct: 0.0,  notes: ["High-strength aluminum", "EDM feasible for complex geometries"] },

  // Titanium
  "titanium":     { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 36, default_carbon_pct: 0.0,  notes: ["Ti alloys machine slowly in EDM", "Watch for recast layer in aerospace"] },
  "ti-6al-4v":    { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 36, default_carbon_pct: 0.0,  notes: ["Grade 5 titanium", "Recast layer typically 5-15 µm"] },

  // Superalloys
  "inconel":      { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 40, default_carbon_pct: 0.04, notes: ["Nickel superalloy", "EDM often preferred — conventional machining very difficult"] },
  "inconel 718":  { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 44, default_carbon_pct: 0.04, notes: ["EDM strongly recommended for complex features"] },
  "hastelloy":    { is_conductive: true, edm_machinability: "fair",      default_hardness_hrc: 35, default_carbon_pct: 0.01, notes: ["Nickel alloy", "EDM preferred over milling for intricate shapes"] },

  // Non-conductive — NOT EDM candidates
  "ceramic":      { is_conductive: false, edm_machinability: "not_possible", default_hardness_hrc: 80, default_carbon_pct: 0.0, notes: ["Non-conductive", "Cannot be processed by EDM"] },
  "glass":        { is_conductive: false, edm_machinability: "not_possible", default_hardness_hrc: 60, default_carbon_pct: 0.0, notes: ["Non-conductive", "Laser or waterjet alternative"] },
  "plastic":      { is_conductive: false, edm_machinability: "not_possible", default_hardness_hrc: 0,  default_carbon_pct: 0.0, notes: ["Non-conductive", "Use CNC milling or injection molding"] },
  "delrin":       { is_conductive: false, edm_machinability: "not_possible", default_hardness_hrc: 0,  default_carbon_pct: 0.0, notes: ["Acetal polymer", "Non-conductive — mill instead"] },
  "peek":         { is_conductive: false, edm_machinability: "not_possible", default_hardness_hrc: 0,  default_carbon_pct: 0.0, notes: ["Non-conductive engineering plastic"] },
};

// ============================================================================
// ENGINE
// ============================================================================

export class EDMDrawingInterpretationEngine {
  // --------------------------------------------------------------------------
  // U01 — Feature Classification
  // --------------------------------------------------------------------------

  /**
   * Classify each feature by the most appropriate EDM process.
   *
   * Decision tree:
   *   1. Non-conductive material → not_edm
   *   2. Micro feature (any dimension < 0.5 mm) → micro_edm
   *   3. Small hole (diameter < 3 mm, through) → hole_popper
   *   4. Blind cavity/pocket → sinker_edm
   *   5. Through feature (profile/slot/hole/contour) → wire_edm
   *   6. Non-through non-cavity → sinker_edm
   */
  classifyFeatures(
    features: PartFeature[],
    materialConductive: boolean
  ): ClassifiedFeature[] {
    return features.map((f) => this.classifySingleFeature(f, materialConductive));
  }

  private classifySingleFeature(
    f: PartFeature,
    materialConductive: boolean
  ): ClassifiedFeature {
    // Non-conductive → not_edm regardless of geometry
    if (!materialConductive) {
      return {
        name: f.name,
        edm_process: "not_edm",
        reason: "Material is non-conductive — EDM not possible",
        confidence: 1.0,
      };
    }

    const dims = f.dimensions_mm;
    const minDim = Math.min(
      dims.length ?? Infinity,
      dims.width ?? Infinity,
      dims.depth ?? Infinity,
      dims.diameter ?? Infinity
    );

    // Micro features (< 0.5 mm any dimension)
    if (minDim < 0.5 && minDim !== Infinity) {
      return {
        name: f.name,
        edm_process: "micro_edm",
        reason: `Feature dimension ${minDim.toFixed(3)} mm < 0.5 mm — micro EDM required`,
        confidence: 0.9,
      };
    }

    // Small holes (through, diameter < 3 mm)
    if (
      (f.type === "hole") &&
      f.is_through &&
      dims.diameter !== undefined &&
      dims.diameter < 3
    ) {
      return {
        name: f.name,
        edm_process: "hole_popper",
        reason: `Through hole Ø${dims.diameter.toFixed(2)} mm < 3 mm — hole popper (fast-hole EDM)`,
        confidence: 0.85,
      };
    }

    // Blind cavities/pockets → sinker EDM
    if (!f.is_through && (f.type === "cavity" || f.type === "pocket")) {
      return {
        name: f.name,
        edm_process: "sinker_edm",
        reason: "Blind cavity/pocket — sinker EDM with shaped electrode",
        confidence: 0.9,
      };
    }

    // Through features → wire EDM
    if (f.is_through) {
      let confidence = 0.92;
      let reason = `Through ${f.type} — wire EDM suitable`;

      // Taper check
      if (f.taper_angle_deg !== undefined && f.taper_angle_deg > 0) {
        if (f.taper_angle_deg <= 30) {
          reason += ` (taper ${f.taper_angle_deg}° — UV axis capable)`;
          confidence = 0.88;
        } else {
          reason += ` (taper ${f.taper_angle_deg}° exceeds typical UV range — verify machine capability)`;
          confidence = 0.7;
        }
      }

      // Sharp internal corners concern
      if (f.min_corner_radius_mm !== undefined && f.min_corner_radius_mm < 0.1) {
        reason += ` — corner radius ${f.min_corner_radius_mm} mm near wire radius limit`;
        confidence -= 0.05;
      }

      return {
        name: f.name,
        edm_process: "wire_edm",
        reason,
        confidence: Math.max(confidence, 0.5),
      };
    }

    // Non-through, non-cavity features → sinker EDM
    return {
      name: f.name,
      edm_process: "sinker_edm",
      reason: `Non-through ${f.type} — sinker EDM with profiled electrode`,
      confidence: 0.75,
    };
  }

  // --------------------------------------------------------------------------
  // U02 — GD&T Extraction for EDM (tolerance context)
  // --------------------------------------------------------------------------

  /**
   * Extract the governing tolerance and surface finish for EDM pass planning.
   * Uses the tightest tolerance and finest finish across all features, or
   * falls back to part-level specs.
   */
  private extractGoverningSpecs(input: EDMDrawingInput): {
    governing_tolerance_mm: number;
    governing_ra_um: number;
  } {
    let tightest_tol = input.tolerance_mm ?? 0.1;
    let finest_ra = input.target_ra_um ?? 3.2;

    for (const f of input.features) {
      if (f.tolerance_mm !== undefined && f.tolerance_mm < tightest_tol) {
        tightest_tol = f.tolerance_mm;
      }
      if (f.surface_finish_ra_um !== undefined && f.surface_finish_ra_um < finest_ra) {
        finest_ra = f.surface_finish_ra_um;
      }
    }

    return {
      governing_tolerance_mm: tightest_tol,
      governing_ra_um: finest_ra,
    };
  }

  // --------------------------------------------------------------------------
  // U03 — Tolerance-to-Pass Mapper
  // --------------------------------------------------------------------------

  /**
   * Calculate the number of EDM passes required based on tolerance and
   * surface finish requirements.
   *
   * Pass count from Ra:
   *   >3.2 µm → 1 (rough only)
   *   1.6–3.2 → 2 (rough + 1 skim)
   *   0.8–1.6 → 3 (rough + 2 skims)
   *   0.4–0.8 → 4 (rough + semi + 2 finish)
   *   <0.4   → 5+ (rough + semi + finish + super-finish passes)
   *
   * Pass count from tolerance:
   *   >0.1 mm  → 1
   *   0.05–0.1 → 2
   *   0.025–0.05 → 3
   *   0.01–0.025 → 4
   *   <0.01    → 5
   *
   * Final pass count = max(tolerance-based, finish-based).
   */
  calculatePasses(tolerance_mm: number, ra_um: number): PassRequirement {
    // Tolerance-based passes
    let tolerance_passes: number;
    if (tolerance_mm > 0.1) {
      tolerance_passes = 1;
    } else if (tolerance_mm > 0.05) {
      tolerance_passes = 2;
    } else if (tolerance_mm > 0.025) {
      tolerance_passes = 3;
    } else if (tolerance_mm > 0.01) {
      tolerance_passes = 4;
    } else {
      tolerance_passes = 5;
    }

    // Surface-finish-based passes
    let finish_passes: number;
    if (ra_um > 3.2) {
      finish_passes = 1;
    } else if (ra_um > 1.6) {
      finish_passes = 2;
    } else if (ra_um > 0.8) {
      finish_passes = 3;
    } else if (ra_um > 0.4) {
      finish_passes = 4;
    } else {
      finish_passes = 5;
    }

    const total_passes = Math.max(tolerance_passes, finish_passes);

    // Distribute passes across categories
    let rough = 1;
    let semi_finish = 0;
    let finish = 0;
    let super_finish = 0;

    if (total_passes >= 2) {
      semi_finish = 1;
    }
    if (total_passes >= 3) {
      finish = 1;
    }
    if (total_passes >= 4) {
      finish = 2;
    }
    if (total_passes >= 5) {
      super_finish = total_passes - 4; // remaining passes are super-finish
      finish = 2;
    }

    // Determine driver
    let driven_by: "tolerance" | "surface_finish" | "both";
    if (tolerance_passes > finish_passes) {
      driven_by = "tolerance";
    } else if (finish_passes > tolerance_passes) {
      driven_by = "surface_finish";
    } else {
      driven_by = "both";
    }

    return {
      total_passes,
      rough,
      semi_finish,
      finish,
      super_finish,
      driven_by,
      tolerance_passes,
      finish_passes,
    };
  }

  // --------------------------------------------------------------------------
  // U04 — Material Callout Parser
  // --------------------------------------------------------------------------

  /**
   * Parse material callout and assess EDM machinability.
   */
  parseMaterial(input: EDMDrawingInput): MaterialCallout {
    const raw = (input.material ?? "unknown").toLowerCase().trim();

    // Try direct lookup, then partial match
    let record: MaterialRecord | undefined = MATERIAL_DB[raw];
    if (!record) {
      for (const [key, val] of Object.entries(MATERIAL_DB)) {
        if (raw.includes(key) || key.includes(raw)) {
          record = val;
          break;
        }
      }
    }

    if (record) {
      return {
        material_name: input.material ?? raw,
        is_conductive: record.is_conductive,
        edm_machinability: record.edm_machinability,
        hardness_hrc: input.material_hardness_hrc ?? record.default_hardness_hrc,
        carbon_content_percent: input.carbon_content_percent ?? record.default_carbon_pct,
        notes: [...record.notes],
      };
    }

    // Unknown material — assume conductive metal with caveats
    const notes: string[] = [
      `Material '${input.material ?? "unspecified"}' not in database — assuming conductive metal`,
    ];

    return {
      material_name: input.material ?? "unknown",
      is_conductive: true,
      edm_machinability: "good",
      hardness_hrc: input.material_hardness_hrc ?? 30,
      carbon_content_percent: input.carbon_content_percent ?? 0.3,
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // U05 — Part Thickness Analyzer
  // --------------------------------------------------------------------------

  /**
   * Analyze part thickness effects on wire EDM performance.
   *
   * Speed correction factor: sqrt(50 / thickness_mm)
   *   - 50 mm is the reference thickness (factor = 1.0)
   *   - Thinner parts → factor > 1.0 (faster)
   *   - Thicker parts → factor < 1.0 (slower)
   *
   * Also assesses wire tension, flushing, and break risk.
   */
  analyzeThickness(thickness_mm: number): ThicknessAnalysis {
    // Clamp to reasonable range
    const t = Math.max(0.5, Math.min(500, thickness_mm));

    const speed_correction_factor = Math.sqrt(50 / t);

    // Wire tension impact
    let wire_tension_impact: string;
    if (t < 10) {
      wire_tension_impact = "Low tension recommended — thin part prone to vibration and deflection";
    } else if (t < 30) {
      wire_tension_impact = "Standard tension — good stability";
    } else if (t < 80) {
      wire_tension_impact = "Standard to high tension — adequate wire guidance through thick section";
    } else if (t < 150) {
      wire_tension_impact = "High tension required — long wire span increases deflection risk";
    } else {
      wire_tension_impact = "Maximum tension — extreme thickness demands careful wire management";
    }

    // Flushing difficulty
    let flushing_difficulty: string;
    if (t < 15) {
      flushing_difficulty = "Easy — thin workpiece, effective flushing from both nozzles";
    } else if (t < 50) {
      flushing_difficulty = "Moderate — standard flushing adequate";
    } else if (t < 100) {
      flushing_difficulty = "Difficult — reduced flushing effectiveness at center of cut; increase pressure";
    } else if (t < 200) {
      flushing_difficulty = "Very difficult — consider submerged cutting, mid-section debris accumulation likely";
    } else {
      flushing_difficulty = "Extreme — submerged cutting mandatory, frequent wire breaks expected without careful parameter tuning";
    }

    // Wire break risk
    let wire_break_risk: string;
    if (t < 20) {
      wire_break_risk = "Low";
    } else if (t < 60) {
      wire_break_risk = "Low to moderate";
    } else if (t < 120) {
      wire_break_risk = "Moderate — reduce power and increase flushing pressure";
    } else if (t < 200) {
      wire_break_risk = "High — reduce feed rate, use anti-electrolysis power supply if available";
    } else {
      wire_break_risk = "Very high — maximum precautions required, consider sectioning the workpiece";
    }

    return {
      thickness_mm: t,
      speed_correction_factor: Math.round(speed_correction_factor * 1000) / 1000,
      wire_tension_impact,
      flushing_difficulty,
      wire_break_risk,
    };
  }

  // --------------------------------------------------------------------------
  // U06 — Process Selection Advisor
  // --------------------------------------------------------------------------

  /**
   * Recommend the optimal EDM process (or alternative) based on the full
   * drawing interpretation context.
   */
  recommendProcess(
    classified: ClassifiedFeature[],
    material: MaterialCallout,
    tolerance_mm: number,
    ra_um: number,
    is_through: boolean
  ): ProcessRecommendation {
    const alternatives: Array<{ process: string; reason: string; tradeoff: string }> = [];

    // Non-conductive → cannot EDM
    if (!material.is_conductive) {
      return {
        primary: "not_edm",
        alternatives: [
          { process: "laser_cutting", reason: "Non-conductive material", tradeoff: "Heat-affected zone, limited thickness" },
          { process: "waterjet", reason: "Non-conductive material, no HAZ", tradeoff: "Lower precision than wire EDM, taper on thick parts" },
          { process: "cnc_milling", reason: "Conventional removal if geometry permits", tradeoff: "Tool wear on hard non-metals" },
        ],
        edm_required: false,
        reason: `Material '${material.material_name}' is non-conductive — EDM not possible`,
      };
    }

    // Check if milling might be faster (loose tolerance AND coarse finish)
    const millingViable = tolerance_mm > 0.05 && ra_um > 1.6;

    // Count process types from classification
    const processCount: Record<string, number> = {};
    for (const c of classified) {
      processCount[c.edm_process] = (processCount[c.edm_process] ?? 0) + 1;
    }

    const wireCount = processCount["wire_edm"] ?? 0;
    const sinkerCount = processCount["sinker_edm"] ?? 0;
    const holePoppCount = processCount["hole_popper"] ?? 0;
    const microCount = processCount["micro_edm"] ?? 0;

    // Blind features → sinker EDM
    if (!is_through && sinkerCount > 0 && wireCount === 0) {
      const primary = "sinker_edm";
      alternatives.push({
        process: "wire_edm",
        reason: "Would require through-hole for threading wire — adds setup",
        tradeoff: "Better surface finish and accuracy, but needs start-hole drilling",
      });
      if (millingViable) {
        alternatives.push({
          process: "cnc_milling",
          reason: `Tolerance ${tolerance_mm} mm and Ra ${ra_um} µm achievable by milling`,
          tradeoff: "Faster cycle time, no electrode fabrication, but limited on hardened materials",
        });
      }

      return {
        primary,
        alternatives,
        edm_required: material.hardness_hrc > 45 || tolerance_mm < 0.025,
        reason: "Blind cavity geometry requires sinker EDM with shaped electrode",
      };
    }

    // Micro features dominate
    if (microCount > 0 && microCount >= wireCount && microCount >= sinkerCount) {
      return {
        primary: "micro_edm",
        alternatives: [
          { process: "wire_edm", reason: "If feature can accept larger minimum radius", tradeoff: "Faster but limited by wire diameter (typically ≥0.1 mm kerf)" },
          { process: "laser_micro_machining", reason: "Non-contact micro features", tradeoff: "HAZ, limited depth" },
        ],
        edm_required: true,
        reason: "Sub-0.5 mm features require micro EDM technology",
      };
    }

    // Default: wire EDM for through features
    if (is_through || wireCount > 0) {
      if (millingViable && material.hardness_hrc < 45) {
        alternatives.push({
          process: "cnc_milling",
          reason: `Tolerance ${tolerance_mm} mm and Ra ${ra_um} µm within milling capability`,
          tradeoff: "Faster cycle time on soft materials, but wire EDM achieves tighter corners",
        });
      }
      if (tolerance_mm > 0.1) {
        alternatives.push({
          process: "laser_cutting",
          reason: "Coarse tolerance permits laser cutting",
          tradeoff: "HAZ and taper, but much faster for simple profiles",
        });
      }
      if (sinkerCount > 0) {
        alternatives.push({
          process: "sinker_edm",
          reason: `${sinkerCount} blind feature(s) also present — may need sinker for those`,
          tradeoff: "Requires electrode fabrication",
        });
      }
      if (holePoppCount > 0) {
        alternatives.push({
          process: "hole_popper",
          reason: `${holePoppCount} small through-hole(s) — hole popper may be faster for start holes`,
          tradeoff: "Limited to round holes, rougher surface",
        });
      }

      const edmRequired =
        material.hardness_hrc > 45 ||
        tolerance_mm < 0.015 ||
        ra_um < 0.6 ||
        tolerance_mm < 0.025; // tight tolerance strongly favors EDM

      return {
        primary: "wire_edm",
        alternatives,
        edm_required: edmRequired,
        reason: is_through
          ? "Through-cut geometry ideal for wire EDM"
          : `${wireCount} feature(s) classified as wire EDM candidates`,
      };
    }

    // Fallback: sinker EDM
    return {
      primary: "sinker_edm",
      alternatives: millingViable
        ? [{ process: "cnc_milling", reason: "Achievable tolerance and finish", tradeoff: "Faster if material hardness permits" }]
        : [],
      edm_required: material.hardness_hrc > 45,
      reason: "Feature geometry requires sinker EDM approach",
    };
  }

  // --------------------------------------------------------------------------
  // COMPOSITE ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Full drawing interpretation — runs all six sub-engines and produces
   * the consolidated EDMDrawingResult.
   */
  interpret(input: EDMDrawingInput): EDMDrawingResult {
    const warnings: string[] = [];
    const feasibility_notes: string[] = [];

    // Validate input
    if (!input.features || input.features.length === 0) {
      warnings.push("No features provided — analysis based on part-level specs only");
      // Create a synthetic feature from part-level data
      input.features = [
        {
          name: "part_profile",
          type: "profile",
          is_through: input.is_through_feature ?? true,
          dimensions_mm: { depth: input.overall_thickness_mm },
          tolerance_mm: input.tolerance_mm,
          surface_finish_ra_um: input.target_ra_um,
          min_corner_radius_mm: input.min_corner_radius_mm,
          taper_angle_deg: input.max_taper_deg,
        },
      ];
    }

    // U04 — Material assessment
    const material_assessment = this.parseMaterial(input);
    if (material_assessment.edm_machinability === "not_possible") {
      warnings.push(`Material '${material_assessment.material_name}' is non-conductive — EDM not feasible`);
    }
    if (material_assessment.edm_machinability === "fair") {
      feasibility_notes.push(
        `Material '${material_assessment.material_name}' has fair EDM machinability — expect slower cutting speeds`
      );
    }

    // U01 — Feature classification
    const features_classified = this.classifyFeatures(
      input.features,
      material_assessment.is_conductive
    );

    // Log classifications
    for (const fc of features_classified) {
      log.info(
        `EDMDrawingInterp: Feature '${fc.name}' → ${fc.edm_process} (${(fc.confidence * 100).toFixed(0)}%) — ${fc.reason}`
      );
    }

    // U02 — Extract governing specs
    const { governing_tolerance_mm, governing_ra_um } = this.extractGoverningSpecs(input);

    // U03 — Pass requirements
    const pass_requirements = this.calculatePasses(governing_tolerance_mm, governing_ra_um);
    if (pass_requirements.total_passes >= 4) {
      feasibility_notes.push(
        `${pass_requirements.total_passes} passes required (driven by ${pass_requirements.driven_by}) — ` +
        `expect significant cycle time`
      );
    }

    // U05 — Thickness analysis
    const thickness_mm = input.overall_thickness_mm ?? this.estimateThickness(input.features);
    const thickness_analysis = this.analyzeThickness(thickness_mm);
    if (thickness_analysis.speed_correction_factor < 0.7) {
      warnings.push(
        `Thick workpiece (${thickness_mm} mm) — speed correction factor ${thickness_analysis.speed_correction_factor}x, ` +
        `expect significantly slower cutting`
      );
    }
    if (thickness_mm > 100) {
      feasibility_notes.push(
        `Part thickness ${thickness_mm} mm exceeds 100 mm — ${thickness_analysis.flushing_difficulty.toLowerCase()}`
      );
    }

    // U06 — Process recommendation
    const is_through = input.is_through_feature ?? input.features.some((f) => f.is_through);
    const recommended_process = this.recommendProcess(
      features_classified,
      material_assessment,
      governing_tolerance_mm,
      governing_ra_um,
      is_through
    );

    // Additional feasibility checks
    if (input.min_corner_radius_mm !== undefined && input.min_corner_radius_mm < 0.1) {
      feasibility_notes.push(
        `Minimum corner radius ${input.min_corner_radius_mm} mm — may need 0.1 mm or smaller wire diameter`
      );
    }
    if (input.max_taper_deg !== undefined && input.max_taper_deg > 30) {
      warnings.push(
        `Maximum taper ${input.max_taper_deg}° exceeds typical UV axis range (30°) — verify machine capability`
      );
    }
    if (material_assessment.hardness_hrc > 60) {
      feasibility_notes.push(
        `High hardness (${material_assessment.hardness_hrc} HRC) — EDM unaffected by hardness, strong advantage over milling`
      );
    }

    // Carbon content note for recast layer
    if (material_assessment.carbon_content_percent > 0.8) {
      feasibility_notes.push(
        `High carbon content (${material_assessment.carbon_content_percent}%) — recast layer may be harder than base metal, ` +
        `consider post-EDM polishing or additional skim passes`
      );
    }

    log.info(
      `EDMDrawingInterp: Complete — ${features_classified.length} features, ` +
      `process=${recommended_process.primary}, passes=${pass_requirements.total_passes}, ` +
      `thickness=${thickness_mm} mm (speed factor ${thickness_analysis.speed_correction_factor}x)`
    );

    return {
      features_classified,
      recommended_process,
      pass_requirements,
      material_assessment,
      thickness_analysis,
      feasibility_notes,
      warnings,
    };
  }

  /**
   * Estimate thickness from feature depths when overall_thickness_mm not provided.
   */
  private estimateThickness(features: PartFeature[]): number {
    let maxDepth = 0;
    for (const f of features) {
      const d = f.dimensions_mm.depth ?? 0;
      if (d > maxDepth) maxDepth = d;
    }
    // If no depth info found, assume a standard 25 mm workpiece
    return maxDepth > 0 ? maxDepth : 25;
  }

  // --------------------------------------------------------------------------
  // STANDALONE ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Classify features only (standalone action).
   */
  classifyFeaturesAction(input: EDMDrawingInput): {
    features_classified: ClassifiedFeature[];
    warnings: string[];
  } {
    const mat = this.parseMaterial(input);
    const classified = this.classifyFeatures(input.features, mat.is_conductive);
    const warnings: string[] = [];
    if (!mat.is_conductive) {
      warnings.push(`Material '${mat.material_name}' is non-conductive — all features classified as not_edm`);
    }
    return { features_classified: classified, warnings };
  }

  /**
   * Recommend process only (standalone action).
   */
  recommendProcessAction(input: EDMDrawingInput): {
    recommended_process: ProcessRecommendation;
    material_assessment: MaterialCallout;
  } {
    const material = this.parseMaterial(input);
    const classified = this.classifyFeatures(input.features, material.is_conductive);
    const { governing_tolerance_mm, governing_ra_um } = this.extractGoverningSpecs(input);
    const is_through = input.is_through_feature ?? input.features.some((f) => f.is_through);
    const recommended_process = this.recommendProcess(
      classified,
      material,
      governing_tolerance_mm,
      governing_ra_um,
      is_through
    );
    return { recommended_process, material_assessment: material };
  }

  /**
   * Calculate passes only (standalone action).
   */
  calculatePassesAction(input: EDMDrawingInput): PassRequirement {
    const { governing_tolerance_mm, governing_ra_um } = this.extractGoverningSpecs(input);
    return this.calculatePasses(governing_tolerance_mm, governing_ra_um);
  }

  /** Supported actions for this engine. */
  getSupportedActions(): string[] {
    return ["interpret", "classify_features", "recommend_process", "calculate_passes"];
  }
}

export const edmDrawingInterpretationEngine = new EDMDrawingInterpretationEngine();
