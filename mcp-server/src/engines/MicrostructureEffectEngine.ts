/**
 * MicrostructureEffectEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Predicts how workpiece microstructure affects machinability and surface integrity.
 * Models grain size, phase composition, and hardness uniformity impacts on:
 * - Cutting forces and specific energy
 * - Tool wear rate
 * - Surface finish achievability
 * - Built-up edge tendency
 *
 * Uses Hall-Petch relationship for grain size effects and empirical
 * phase-composition machinability factors.
 *
 * Actions: microstructure_analyze, microstructure_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type GrainSizeASTM = number; // ASTM E112 grain size number (1-14)

export type PhaseType =
  | "ferrite" | "pearlite" | "martensite" | "bainite" | "austenite"
  | "cementite" | "alpha" | "beta" | "gamma_prime";

export interface PhaseComposition {
  phase: PhaseType;
  fraction_pct: number;   // volume fraction %
}

export interface MicrostructureInput {
  material_class: "steel" | "stainless" | "aluminum" | "titanium" | "nickel_alloy" | "cast_iron";
  grain_size_ASTM: GrainSizeASTM;
  hardness_HRC: number;
  phases: PhaseComposition[];
  prior_processing?: "hot_rolled" | "cold_drawn" | "forged" | "cast" | "annealed" | "normalized";
  inclusion_rating?: number;  // ASTM E45 inclusion rating (0=clean, higher=more inclusions)
}

export interface MicrostructureResult {
  machinability_index: number;          // 0-100, higher = more machinable
  force_multiplier: number;             // 1.0 = baseline, >1 harder to cut
  tool_wear_multiplier: number;         // 1.0 = baseline
  surface_finish_achievable_Ra_um: number;
  built_up_edge_risk: "none" | "low" | "moderate" | "high";
  work_hardening_tendency: "low" | "moderate" | "high";
  recommendations: string[];
  phase_effects: { phase: PhaseType; effect: string; impact: "positive" | "negative" | "neutral" }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Hall-Petch: yield stress increases with finer grain → harder to cut
// But finer grain gives better finish. Trade-off modeled here.
const GRAIN_FORCE_FACTOR = (astm: number): number => {
  // ASTM 5 = baseline. Finer (higher number) = higher force
  return 1.0 + (astm - 5) * 0.04;
};

const GRAIN_FINISH_FACTOR = (astm: number): number => {
  // Finer grain = better achievable finish
  return Math.max(0.2, 1.6 - astm * 0.1);
};

// Phase machinability factors (1.0 = neutral)
const PHASE_MACHINABILITY: Record<PhaseType, number> = {
  ferrite: 1.1,        // soft, gummy → BUE risk but low force
  pearlite: 1.0,       // baseline for steel
  martensite: 0.4,     // very hard, abrasive
  bainite: 0.7,        // moderate
  austenite: 0.6,      // work-hardens rapidly
  cementite: 0.3,      // extremely abrasive
  alpha: 0.9,          // Ti alpha phase
  beta: 0.5,           // Ti beta phase, gummy
  gamma_prime: 0.35,   // Ni-alloy strengthener, very tough
};

const PHASE_BUE_RISK: Record<PhaseType, number> = {
  ferrite: 0.8, pearlite: 0.3, martensite: 0.05, bainite: 0.2,
  austenite: 0.6, cementite: 0.05, alpha: 0.5, beta: 0.7, gamma_prime: 0.4,
};

const PROCESSING_FACTOR: Record<string, number> = {
  hot_rolled: 0.95, cold_drawn: 1.1, forged: 1.05,
  cast: 0.85, annealed: 1.15, normalized: 1.0,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MicrostructureEffectEngine {
  analyze(input: MicrostructureInput): MicrostructureResult {
    // Grain size effects
    const grainForce = GRAIN_FORCE_FACTOR(input.grain_size_ASTM);
    const grainFinish = GRAIN_FINISH_FACTOR(input.grain_size_ASTM);

    // Phase composition weighted machinability
    let phaseMach = 0;
    let phaseBUE = 0;
    let totalFraction = 0;
    const phaseEffects: MicrostructureResult["phase_effects"] = [];

    for (const p of input.phases) {
      const mf = PHASE_MACHINABILITY[p.phase] || 0.8;
      const bf = PHASE_BUE_RISK[p.phase] || 0.3;
      const w = p.fraction_pct / 100;
      phaseMach += mf * w;
      phaseBUE += bf * w;
      totalFraction += w;

      phaseEffects.push({
        phase: p.phase,
        effect: mf >= 1.0 ? "Improves machinability" : mf >= 0.6 ? "Moderate resistance" : "Severely hinders cutting",
        impact: mf >= 0.9 ? "positive" : mf >= 0.6 ? "neutral" : "negative",
      });
    }

    // Normalize if fractions don't sum to 100%
    if (totalFraction > 0 && Math.abs(totalFraction - 1.0) > 0.01) {
      phaseMach /= totalFraction;
      phaseBUE /= totalFraction;
    }

    // Processing factor
    const procFactor = input.prior_processing ? (PROCESSING_FACTOR[input.prior_processing] || 1.0) : 1.0;

    // Hardness effect (baseline HRC 25 for medium carbon steel)
    const hardnessFactor = input.hardness_HRC > 0 ? Math.max(0.3, 1.0 - (input.hardness_HRC - 25) * 0.015) : 1.0;

    // Inclusion effect — inclusions are abrasive but can assist chip breaking
    const inclusionWear = 1.0 + (input.inclusion_rating || 0) * 0.08;
    const inclusionMach = 1.0 + (input.inclusion_rating || 0) * 0.02; // slight positive for chip break

    // Composite machinability index (0-100 scale)
    const rawIndex = phaseMach * hardnessFactor * procFactor * inclusionMach * 100;
    const machinabilityIndex = Math.max(5, Math.min(100, Math.round(rawIndex)));

    // Force multiplier
    const forceMultiplier = Math.round((grainForce / phaseMach / hardnessFactor) * 100) / 100;

    // Tool wear multiplier
    const toolWearMultiplier = Math.round((inclusionWear / phaseMach / hardnessFactor) * 100) / 100;

    // Achievable surface finish (Ra in µm)
    const baseRa = 0.8; // achievable with sharp tool
    const achievableRa = Math.round(baseRa * grainFinish / phaseMach * 100) / 100;

    // BUE risk classification
    const bueRisk: MicrostructureResult["built_up_edge_risk"] =
      phaseBUE >= 0.6 ? "high" : phaseBUE >= 0.4 ? "moderate" : phaseBUE >= 0.2 ? "low" : "none";

    // Work hardening tendency
    const hasAustenite = input.phases.some(p => p.phase === "austenite" && p.fraction_pct > 20);
    const hasBeta = input.phases.some(p => p.phase === "beta" && p.fraction_pct > 15);
    const workHardening: MicrostructureResult["work_hardening_tendency"] =
      hasAustenite || hasBeta || input.material_class === "nickel_alloy" ? "high"
      : input.material_class === "stainless" || input.material_class === "titanium" ? "moderate"
      : "low";

    // Recommendations
    const recs: string[] = [];
    if (machinabilityIndex < 30) {
      recs.push("Difficult-to-machine microstructure — use CBN/ceramic tooling and reduced speeds");
    }
    if (bueRisk === "high") {
      recs.push("High BUE risk — increase cutting speed or use coated inserts with low-friction coating");
    }
    if (workHardening === "high") {
      recs.push("High work hardening — maintain feed above 0.1mm/rev to stay below hardened layer");
    }
    if (input.grain_size_ASTM <= 3) {
      recs.push("Coarse grain structure — expect rough surface finish; consider normalizing heat treatment");
    }
    if ((input.inclusion_rating || 0) > 3) {
      recs.push("High inclusion content — expect accelerated tool wear; use tougher grade inserts");
    }
    if (recs.length === 0) {
      recs.push("Microstructure favorable for machining — standard parameters acceptable");
    }

    return {
      machinability_index: machinabilityIndex,
      force_multiplier: forceMultiplier,
      tool_wear_multiplier: toolWearMultiplier,
      surface_finish_achievable_Ra_um: achievableRa,
      built_up_edge_risk: bueRisk,
      work_hardening_tendency: workHardening,
      recommendations: recs,
      phase_effects: phaseEffects,
    };
  }

  recommend(input: MicrostructureInput): { optimal_heat_treat: string; expected_improvement_pct: number } {
    const current = this.analyze(input);
    let treatment = "No heat treatment change recommended";
    let improvement = 0;

    if (current.machinability_index < 40 && input.material_class === "steel") {
      // Spheroidize annealing improves machinability of hard steels
      treatment = "Spheroidize anneal (700°C, slow cool) to break up cementite/martensite";
      improvement = Math.min(60, 100 - current.machinability_index);
    } else if (current.work_hardening_tendency === "high" && input.material_class === "stainless") {
      treatment = "Solution anneal (1050°C, water quench) to relieve cold work";
      improvement = 25;
    } else if (current.built_up_edge_risk === "high") {
      treatment = "Normalize (870°C, air cool) to refine grain and reduce ferrite banding";
      improvement = 15;
    }

    return { optimal_heat_treat: treatment, expected_improvement_pct: improvement };
  }
}

export const microstructureEffectEngine = new MicrostructureEffectEngine();
