/**
 * WearForceCompensationEngine — Advanced Compensation Models
 *
 * Three physics models that cross-link existing PRISM engines:
 *
 * 1. Archard Abrasive Wear — complements Usui adhesive wear in ToolWearProgressionEngine
 *    dVB/dt_abrasive = K × H_wp/H_tool × σₙ × vₛ
 *    Dominates for: cast iron, composites, hardened steel, ceramics
 *    Ref: Archard (1953), Shaw "Metal Cutting Principles" (2005)
 *
 * 2. Flank Wear → Force Increase — links wear to cutting force correction
 *    F_corrected = F_fresh × (1 + C_w × VB)
 *    C_w ≈ 1.5 mm⁻¹ for carbide (Smithey et al., 2000)
 *    Accounts for: ploughing force on wear land, increased friction area
 *    Ref: Smithey, Kapoor, DeVor "A worn tool cutting force model" (2000)
 *
 * 3. Thermal-Compensated Deflection — adjusts Young's modulus for temperature
 *    E(T) = E₀ × (1 - α_E × (T - T_ref))
 *    α_E ≈ 3e-4 /°C for carbide, 4e-4 /°C for HSS
 *    δ_thermal = F × L³ / (3 × E(T) × I)
 *    Ref: Schmitz & Smith "Machining Dynamics" (2009)
 *
 * Actions: archard_wear, wear_force_correction, thermal_deflection
 */

// ============================================================================
// TYPES
// ============================================================================

export type AbrasiveMaterial = "cast_iron" | "composite" | "hardened_steel" | "ceramic_insert" | "cbn_insert" | "pcd_insert" | "general";

export interface ArchardWearInput {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  workpiece_hardness_HV: number;         // Vickers hardness of workpiece
  tool_hardness_HV: number;              // Vickers hardness of tool (coating surface)
  normal_stress_MPa?: number;            // estimated if not provided
  workpiece_type?: AbrasiveMaterial;     // adjusts K coefficient
  cutting_time_min?: number;             // elapsed time
}

export interface ArchardWearResult {
  abrasive_wear_rate_um_min: number;     // µm/min
  abrasive_vb_mm: number;               // accumulated VB from abrasion
  hardness_ratio: number;                // H_workpiece / H_tool
  archard_K: number;                     // dimensionless wear coefficient
  dominant_mechanism: "adhesive" | "abrasive" | "mixed";
  recommendations: string[];
}

export interface WearForceInput {
  fresh_force_N: number;                 // force with fresh tool
  flank_wear_vb_mm: number;             // current flank wear land width
  tool_material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  rake_angle_deg?: number;              // affects ploughing force coefficient
}

export interface WearForceResult {
  corrected_force_N: number;
  force_increase_pct: number;
  ploughing_force_N: number;             // additional force due to wear land
  wear_coefficient_Cw: number;           // mm⁻¹
  is_excessive: boolean;                 // force increase > 50%
  recommendations: string[];
}

export interface ThermalDeflectionInput {
  cutting_force_N: number;
  tool_diameter_mm: number;
  tool_overhang_mm: number;
  tool_material: "carbide" | "hss" | "ceramic" | "cermet" | "cbn" | "pcd";
  cutting_temperature_C: number;         // from ThermalSimEngine
  ambient_temperature_C?: number;        // default 20°C
  num_flutes?: number;
}

export interface ThermalDeflectionResult {
  cold_deflection_mm: number;            // at ambient temp
  hot_deflection_mm: number;             // at cutting temp
  deflection_increase_pct: number;
  effective_youngs_GPa: number;          // temperature-adjusted
  cold_youngs_GPa: number;
  temperature_rise_C: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Archard wear coefficient K by workpiece type (dimensionless, ×10⁻⁴) */
const ARCHARD_K: Record<AbrasiveMaterial, number> = {
  cast_iron: 8.0,          // high abrasive content (graphite + carbides)
  composite: 12.0,         // carbon/glass fibers are very abrasive
  hardened_steel: 5.0,     // carbide precipitates
  ceramic_insert: 2.0,     // tool ceramic = very hard
  cbn_insert: 1.0,         // CBN = extremely hard
  pcd_insert: 0.5,         // PCD = hardest
  general: 3.0,
};

/** Wear force coefficient Cw [mm⁻¹] by tool material
 *  F_worn = F_fresh × (1 + Cw × VB)
 *  Ref: Smithey, Kapoor, DeVor (2000) */
const WEAR_FORCE_CW: Record<string, number> = {
  carbide: 1.5,
  hss: 2.0,               // softer → higher ploughing
  ceramic: 1.2,
  cbn: 1.0,
  pcd: 0.8,
};

/** Young's modulus [GPa] and thermal coefficient α_E [/°C] */
const MODULUS_DATA: Record<string, { E0: number; alpha_E: number }> = {
  carbide: { E0: 600, alpha_E: 3.0e-4 }, // QA-MS3: canonical (was 580)
  hss: { E0: 210, alpha_E: 4.0e-4 },
  ceramic: { E0: 380, alpha_E: 2.0e-4 },
  cermet: { E0: 450, alpha_E: 2.5e-4 },
  cbn: { E0: 680, alpha_E: 1.5e-4 },
  pcd: { E0: 890, alpha_E: 1.0e-4 },
};

/** Flute correction for moment of inertia */
const FLUTE_CORRECTION: Record<number, number> = {
  1: 0.55, 2: 0.65, 3: 0.72, 4: 0.78, 5: 0.82, 6: 0.85,
};

// ============================================================================
// ENGINE
// ============================================================================

export class WearForceCompensationEngine {

  /**
   * Archard abrasive wear rate calculation.
   * Complements Usui adhesive wear — dominates for abrasive workpieces.
   */
  archardWear(input: ArchardWearInput): ArchardWearResult {
    const vs = input.cutting_speed_m_min / 60; // m/s → sliding velocity
    const hratio = input.workpiece_hardness_HV / input.tool_hardness_HV;
    const K = (ARCHARD_K[input.workpiece_type ?? "general"] ?? 3.0) * 1e-4;

    // Normal stress estimation (if not provided): empirical from feed & hardness
    const sigma = input.normal_stress_MPa ??
      (500 * Math.pow(input.feed_mm_rev, 0.4) * Math.pow(input.workpiece_hardness_HV / 300, 0.3));

    // Archard equation: wear volume rate = K × F_n × v_s / H_tool
    // Convert to flank wear rate:
    // dVB/dt = K × σₙ × vₛ × (H_wp/H_tool) / H_tool
    // Units: K [dimless] × σ [MPa=N/mm²] × v [mm/s] → [mm/s]
    const vs_mm_s = vs * 1000;
    const wearRate_mm_s = K * sigma * vs_mm_s * hratio / input.tool_hardness_HV;
    const wearRate_um_min = wearRate_mm_s * 1000 * 60; // µm/min

    // Accumulated abrasive wear
    const time = input.cutting_time_min ?? 0;
    const vb_mm = wearRate_mm_s * 60 * time; // mm

    // Compare with typical adhesive rate (~0.5-2 µm/min for carbide)
    const dominant = wearRate_um_min > 2.0 ? "abrasive"
      : wearRate_um_min < 0.5 ? "adhesive"
      : "mixed";

    const recs: string[] = [];
    if (dominant === "abrasive") {
      recs.push("Abrasive wear dominates — consider harder coating (AlTiN, nACo) or CBN/PCD insert");
    }
    if (hratio > 0.5) {
      recs.push(`High hardness ratio (${hratio.toFixed(2)}) — workpiece is attacking tool surface aggressively`);
    }
    if (input.workpiece_type === "composite") {
      recs.push("Composite machining: PCD or CVD diamond coating strongly recommended for tool life");
    }

    return {
      abrasive_wear_rate_um_min: Math.round(wearRate_um_min * 1000) / 1000,
      abrasive_vb_mm: Math.round(vb_mm * 10000) / 10000,
      hardness_ratio: Math.round(hratio * 1000) / 1000,
      archard_K: K,
      dominant_mechanism: dominant,
      recommendations: recs,
    };
  }

  /**
   * Flank wear → cutting force increase correction.
   * Worn tools generate additional ploughing force on the wear land.
   */
  wearForceCorrection(input: WearForceInput): WearForceResult {
    const Cw = WEAR_FORCE_CW[input.tool_material ?? "carbide"] ?? 1.5;
    const vb = input.flank_wear_vb_mm;

    // Rake angle adjustment: negative rake increases ploughing
    const rakeAdjust = input.rake_angle_deg !== undefined
      ? 1 + Math.max(0, -input.rake_angle_deg) * 0.02  // +2% per degree negative
      : 1.0;

    const adjustedCw = Cw * rakeAdjust;

    // F_corrected = F_fresh × (1 + Cw × VB)
    const forceFactor = 1 + adjustedCw * vb;
    const correctedForce = input.fresh_force_N * forceFactor;
    const ploughingForce = correctedForce - input.fresh_force_N;
    const increasePct = (forceFactor - 1) * 100;

    const isExcessive = increasePct > 50;

    const recs: string[] = [];
    if (isExcessive) {
      recs.push(`SAFETY: Force increase ${increasePct.toFixed(0)}% exceeds 50% threshold — tool change required`);
      recs.push("Excessive wear increases heat, deflection, and chatter risk simultaneously");
    } else if (increasePct > 25) {
      recs.push(`Force increase ${increasePct.toFixed(0)}% — approaching tool change threshold`);
    }
    if (vb > 0.3) {
      recs.push(`Flank wear VB=${vb}mm exceeds ISO 3685 limit (0.3mm) — immediate tool change recommended`);
    }

    return {
      corrected_force_N: Math.round(correctedForce * 10) / 10,
      force_increase_pct: Math.round(increasePct * 10) / 10,
      ploughing_force_N: Math.round(ploughingForce * 10) / 10,
      wear_coefficient_Cw: Math.round(adjustedCw * 1000) / 1000,
      is_excessive: isExcessive,
      recommendations: recs,
    };
  }

  /**
   * Thermal-compensated tool deflection.
   * Young's modulus decreases with temperature → deflection increases at cutting conditions.
   */
  thermalDeflection(input: ThermalDeflectionInput): ThermalDeflectionResult {
    const modData = MODULUS_DATA[input.tool_material] ?? MODULUS_DATA.carbide;
    const Tref = input.ambient_temperature_C ?? 20;
    const deltaT = input.cutting_temperature_C - Tref;

    // Temperature-adjusted Young's modulus
    // E(T) = E₀ × (1 - α_E × ΔT)
    const E_cold = modData.E0;
    const E_hot = E_cold * (1 - modData.alpha_E * Math.max(0, deltaT));
    const E_hot_safe = Math.max(E_hot, E_cold * 0.5); // never below 50% (physical limit)

    // Moment of inertia (with flute correction)
    const d = input.tool_diameter_mm;
    const fluteCorr = FLUTE_CORRECTION[input.num_flutes ?? 4] ?? 0.78;
    const I = (Math.PI * Math.pow(d, 4) / 64) * fluteCorr;

    // Cantilever deflection: δ = F × L³ / (3 × E × I)
    const L = input.tool_overhang_mm;
    const F = input.cutting_force_N;

    const delta_cold = (F * Math.pow(L, 3)) / (3 * E_cold * 1000 * I); // E in GPa → N/mm²: ×1000
    const delta_hot = (F * Math.pow(L, 3)) / (3 * E_hot_safe * 1000 * I);

    const increasePct = delta_cold > 0.0001
      ? ((delta_hot - delta_cold) / delta_cold) * 100
      : 0;

    const recs: string[] = [];
    if (increasePct > 15) {
      recs.push(`Thermal stiffness loss: deflection increases ${increasePct.toFixed(1)}% at ${input.cutting_temperature_C}°C`);
      recs.push("Consider coolant to reduce tool temperature, or shorter overhang");
    }
    if (deltaT > 400 && input.tool_material === "hss") {
      recs.push("WARNING: HSS tool at >400°C — risk of tempering and permanent stiffness loss");
    }
    if (delta_hot > 0.05) {
      recs.push(`Hot deflection ${delta_hot.toFixed(4)}mm may affect tolerance — verify against part spec`);
    }
    if (recs.length === 0) {
      recs.push("Thermal effect on deflection is within acceptable range");
    }

    return {
      cold_deflection_mm: Math.round(delta_cold * 10000) / 10000,
      hot_deflection_mm: Math.round(delta_hot * 10000) / 10000,
      deflection_increase_pct: Math.round(increasePct * 10) / 10,
      effective_youngs_GPa: Math.round(E_hot_safe * 10) / 10,
      cold_youngs_GPa: E_cold,
      temperature_rise_C: Math.max(0, deltaT),
      recommendations: recs,
    };
  }
}

export const wearForceCompensationEngine = new WearForceCompensationEngine();
