/**
 * HeatTreatmentResponseEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Predicts material property changes from heat treatment processes.
 * Models hardening, tempering, annealing, normalizing, and case hardening
 * with temperature-time-transformation (TTT) based approach.
 *
 * Calculates: expected hardness, tensile strength, distortion risk,
 * required quench severity, and tempering curve data.
 *
 * Actions: heat_treat_predict, heat_treat_temper_curve, heat_treat_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type HeatTreatProcess =
  | "through_harden" | "temper" | "anneal" | "normalize"
  | "case_harden" | "carburize" | "nitride" | "induction_harden";

export type QuenchMedium = "water" | "oil" | "polymer" | "air" | "salt_bath" | "gas";

export interface HeatTreatInput {
  process: HeatTreatProcess;
  material: string;                    // e.g., "4140", "D2", "316L"
  carbon_pct: number;
  alloy_elements?: Record<string, number>;  // e.g., { Cr: 1.0, Mo: 0.2 }
  austenitize_temp_C: number;
  hold_time_min: number;
  quench_medium: QuenchMedium;
  temper_temp_C?: number;              // if tempering
  temper_time_min?: number;
  section_thickness_mm: number;        // affects cooling rate and through-hardening
  prior_hardness_HRC?: number;
}

export interface HeatTreatResult {
  predicted_surface_hardness_HRC: number;
  predicted_core_hardness_HRC: number;
  predicted_tensile_MPa: number;
  hardenability_DI_mm: number;         // ideal critical diameter
  distortion_risk: "low" | "moderate" | "high";
  retained_austenite_pct: number;
  grain_size_change: "coarsen" | "refine" | "no_change";
  recommendations: string[];
}

export interface TemperCurvePoint {
  temp_C: number;
  hardness_HRC: number;
  tensile_MPa: number;
  toughness_relative: number;   // 0-1 normalized
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Grossmann quench severity factors (H-value)
const QUENCH_SEVERITY: Record<QuenchMedium, number> = {
  water: 1.0, oil: 0.35, polymer: 0.5, air: 0.02, salt_bath: 0.25, gas: 0.08,
};

// Jominy multipliers for common alloying elements (hardenability)
const ALLOY_DI_MULTIPLIER: Record<string, (pct: number) => number> = {
  Mn: (p) => 1 + 3.33 * p,
  Cr: (p) => 1 + 2.16 * p,
  Mo: (p) => 1 + 3.0 * p,
  Ni: (p) => 1 + 0.7 * p,
  Si: (p) => 1 + 0.7 * p,
  V: (p) => 1 + 1.73 * p,
};

// Max achievable martensite hardness vs carbon (Hodge-Orehoski)
const MAX_MARTENSITE_HRC = (c: number): number =>
  Math.min(67, 20 + c * 100 - c * c * 50);

// Tempering reduction: Hollomon-Jaffe parameter approach (simplified)
const TEMPER_REDUCTION = (tempC: number, timeMin: number): number => {
  if (tempC <= 100) return 0;
  // HP = T(K) * (20 + log10(time_hr))
  const Tk = tempC + 273;
  const timeHr = Math.max(0.01, timeMin / 60);
  const HP = Tk * (20 + Math.log10(timeHr));
  // Map HP to hardness drop (empirical for medium carbon steel)
  return Math.max(0, (HP - 12000) * 0.003);
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HeatTreatmentResponseEngine {
  predict(input: HeatTreatInput): HeatTreatResult {
    // Base carbon martensite hardness
    const maxHRC = MAX_MARTENSITE_HRC(input.carbon_pct);

    // Ideal critical diameter (hardenability)
    let DI = 25.4 * (0.54 * input.carbon_pct + 0.14); // base DI from carbon
    if (input.alloy_elements) {
      for (const [el, pct] of Object.entries(input.alloy_elements)) {
        const fn = ALLOY_DI_MULTIPLIER[el];
        if (fn) DI *= fn(pct);
      }
    }

    // Effective quench severity considering section size
    const H = QUENCH_SEVERITY[input.quench_medium] || 0.35;
    const criticalRatio = DI / (input.section_thickness_mm / 2);

    // Surface hardness: full martensite if criticalRatio > 1
    let surfaceHRC: number;
    if (criticalRatio >= 1.5) {
      surfaceHRC = maxHRC;
    } else if (criticalRatio >= 0.5) {
      surfaceHRC = maxHRC * (0.5 + criticalRatio * 0.33);
    } else {
      surfaceHRC = maxHRC * criticalRatio * 0.8;
    }

    // Core hardness drops with distance
    const coreRatio = criticalRatio * H * 2;
    let coreHRC = coreRatio >= 1.0 ? surfaceHRC * 0.95 : surfaceHRC * coreRatio * 0.7;

    // Process-specific adjustments
    if (input.process === "anneal") {
      surfaceHRC = Math.min(25, input.carbon_pct * 30 + 5);
      coreHRC = surfaceHRC;
    } else if (input.process === "normalize") {
      surfaceHRC = Math.min(35, input.carbon_pct * 40 + 10);
      coreHRC = surfaceHRC * 0.95;
    } else if (input.process === "case_harden" || input.process === "carburize") {
      // Surface gets extra carbon
      surfaceHRC = MAX_MARTENSITE_HRC(Math.min(0.9, input.carbon_pct + 0.4));
      coreHRC = Math.min(coreHRC, 35); // core stays softer
    } else if (input.process === "nitride") {
      surfaceHRC = Math.min(70, surfaceHRC + 10); // very hard case
      // core unchanged
    } else if (input.process === "induction_harden") {
      // Surface only, core stays at prior hardness
      coreHRC = input.prior_hardness_HRC || 25;
    }

    // Tempering reduction
    if (input.temper_temp_C && input.temper_time_min) {
      const reduction = TEMPER_REDUCTION(input.temper_temp_C, input.temper_time_min);
      surfaceHRC = Math.max(15, surfaceHRC - reduction);
      coreHRC = Math.max(15, coreHRC - reduction * 0.8);
    }

    // Tensile strength estimate (MPa ≈ HRC * 34 + 240 for steels)
    const tensile = Math.round(surfaceHRC * 34 + 240);

    // Retained austenite (high carbon + alloying = more RA)
    const RA = input.carbon_pct > 0.6 ? Math.min(25, (input.carbon_pct - 0.6) * 50) : 0;

    // Distortion risk
    const severityScore = (QUENCH_SEVERITY[input.quench_medium] || 0.35) * (surfaceHRC / 40) * (input.section_thickness_mm > 50 ? 1.5 : 1.0);
    const distortion: HeatTreatResult["distortion_risk"] =
      severityScore > 1.2 ? "high" : severityScore > 0.5 ? "moderate" : "low";

    // Grain size
    const grainChange: HeatTreatResult["grain_size_change"] =
      input.austenitize_temp_C > 950 || input.hold_time_min > 120 ? "coarsen"
      : input.process === "normalize" ? "refine"
      : "no_change";

    // Recommendations
    const recs: string[] = [];
    if (distortion === "high") recs.push("High distortion risk — consider oil quench or interrupted quench instead of water");
    if (RA > 10) recs.push(`${RA.toFixed(0)}% retained austenite expected — consider sub-zero treatment (-80°C) to transform`);
    if (grainChange === "coarsen") recs.push("Grain coarsening expected — reduce austenitize temp or hold time");
    if (criticalRatio < 0.5) recs.push("Section too thick for through-hardening — consider case hardening process instead");
    if (surfaceHRC < 50 && input.process === "through_harden") recs.push("Target hardness may not be achievable — verify steel grade hardenability");
    if (recs.length === 0) recs.push("Heat treatment parameters within normal range — proceed");

    return {
      predicted_surface_hardness_HRC: Math.round(surfaceHRC * 10) / 10,
      predicted_core_hardness_HRC: Math.round(coreHRC * 10) / 10,
      predicted_tensile_MPa: tensile,
      hardenability_DI_mm: Math.round(DI * 10) / 10,
      distortion_risk: distortion,
      retained_austenite_pct: Math.round(RA * 10) / 10,
      grain_size_change: grainChange,
      recommendations: recs,
    };
  }

  temperCurve(carbon_pct: number, startHRC: number): TemperCurvePoint[] {
    const points: TemperCurvePoint[] = [];
    for (let t = 100; t <= 700; t += 50) {
      const reduction = TEMPER_REDUCTION(t, 60); // 1 hour soak
      const hrc = Math.max(15, startHRC - reduction);
      const tensile = Math.round(hrc * 34 + 240);
      // Toughness inversely correlates with hardness (simplified)
      const toughness = Math.min(1.0, Math.max(0.1, (700 - t * 0.5) < hrc * 10 ? 0.3 : 1.0 - hrc / 80));
      points.push({ temp_C: t, hardness_HRC: Math.round(hrc * 10) / 10, tensile_MPa: tensile, toughness_relative: Math.round(toughness * 100) / 100 });
    }
    return points;
  }

  recommend(material: string, target_hardness_HRC: number, section_mm: number): {
    process: HeatTreatProcess; austenitize_C: number; quench: QuenchMedium; temper_C: number; notes: string;
  } {
    // Simple recommendation based on target
    const austenitize = target_hardness_HRC > 58 ? 1050 : target_hardness_HRC > 45 ? 860 : 830;
    const quench: QuenchMedium = section_mm > 75 ? "water" : section_mm > 25 ? "oil" : "oil";
    const temper = Math.max(150, 700 - target_hardness_HRC * 8);
    const process: HeatTreatProcess = target_hardness_HRC > 60 ? "case_harden" : "through_harden";
    const notes = `Austenitize at ${austenitize}°C for ${Math.max(30, section_mm)}min, ${quench} quench, temper at ${Math.round(temper)}°C for 1hr`;

    return { process, austenitize_C: austenitize, quench, temper_C: Math.round(temper), notes };
  }
}

export const heatTreatmentResponseEngine = new HeatTreatmentResponseEngine();
