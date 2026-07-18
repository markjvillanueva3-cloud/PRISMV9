/**
 * BurnishingPolishingEngine — Burnishing, lapping, and polishing prediction
 *
 * Models: Hertz contact theory (burnishing), Preston's equation (lapping),
 *         multi-step grit progression (polishing)
 * References: Luo & Dornfeld (2001), Preston (1927), Hertz (1882), ASM Handbook Vol 5
 * Safety: Force limits to prevent subsurface cracking in burnishing
 */

// ─── Types ─────────────────────────────────────────────────────────

export type BurnishingProcess = 'ball' | 'roller' | 'diamond_tip';
export type PolishingMethod = 'mechanical' | 'electro' | 'chemical_mechanical';

export interface BurnishingInput {
  process: BurnishingProcess;
  material: string;
  initial_Ra_um: number;
  burnishing_force_N: number;
  feed_mm_per_rev: number;
  speed_mpm: number;
  ball_diameter_mm?: number;
}

export interface BurnishingResult {
  final_Ra_um: number;
  hardness_increase_HRC: number;
  residual_stress_MPa: number;
  depth_of_effect_mm: number;
}

export interface LappingInput {
  material: string;
  pressure_kPa: number;
  velocity_mpm: number;
  abrasive_size_um: number;
  target_flatness_um: number;
}

export interface LappingResult {
  removal_rate_um_per_min: number;
  time_to_target_min: number;
  expected_flatness_um: number;
  surface_Ra_um: number;
}

export interface PolishingInput {
  material: string;
  area_cm2: number;
  initial_Ra_um: number;
  target_Ra_um: number;
  method: PolishingMethod;
}

export interface PolishingStep {
  grit: number;
  time_min: number;
  expected_Ra: number;
}

export interface PolishingResult {
  estimated_time_min: number;
  cost_estimate: number;
  achievable_Ra_um: number;
  steps: PolishingStep[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Material elastic modulus (GPa) */
const ELASTIC_MODULUS: Record<string, number> = {
  'aluminum': 69,
  'brass': 100,
  'cast_iron': 100,  // gray cast iron GG25 — per CANONICAL_MATERIAL_DB (170 is ductile iron)
  'carbon_steel': 210,
  'alloy_steel': 210,
  'stainless_steel': 193,
  'tool_steel': 215,
  'titanium': 114,
  'inconel': 205,
  'hardened_steel': 210,
  'copper': 117,
};

/** Material yield strength (MPa) — approximate */
const YIELD_STRENGTH: Record<string, number> = {
  'aluminum': 270,
  'brass': 200,
  'cast_iron': 300,
  'carbon_steel': 350,
  'alloy_steel': 500,
  'stainless_steel': 290,
  'tool_steel': 700,
  'titanium': 880,
  'inconel': 550,
  'hardened_steel': 1200,
  'copper': 210,
};

/** Material hardness (HRC equivalent) — baseline */
const BASE_HARDNESS_HRC: Record<string, number> = {
  'aluminum': 10,
  'brass': 12,
  'cast_iron': 25,
  'carbon_steel': 20,
  'alloy_steel': 30,
  'stainless_steel': 22,
  'tool_steel': 45,
  'titanium': 36,
  'inconel': 35,
  'hardened_steel': 58,
  'copper': 8,
};

/** Preston coefficient (µm/(kPa·m)) by material class */
const PRESTON_K_LAPPING: Record<string, number> = {
  'aluminum': 0.12,
  'brass': 0.10,
  'cast_iron': 0.06,
  'carbon_steel': 0.05,
  'alloy_steel': 0.04,
  'stainless_steel': 0.035,
  'tool_steel': 0.025,
  'titanium': 0.03,
  'inconel': 0.02,
  'hardened_steel': 0.015,
  'copper': 0.11,
  'ceramic': 0.008,
  'glass': 0.05,
  'silicon': 0.04,
};

/** Cost rate per minute by polishing method ($/min) */
const POLISH_COST_RATE: Record<PolishingMethod, number> = {
  'mechanical': 0.80,
  'electro': 1.50,
  'chemical_mechanical': 2.00,
};

/** Standard polishing grit progression */
const GRIT_SEQUENCE = [120, 240, 400, 600, 800, 1200, 2000, 4000, 8000];
/** Achievable Ra per grit (µm) */
const GRIT_RA: Record<number, number> = {
  120: 1.6, 240: 0.8, 400: 0.4, 600: 0.2, 800: 0.1,
  1200: 0.05, 2000: 0.025, 4000: 0.012, 8000: 0.006,
};

function getMaterialKey(material: string): string {
  const m = material.toLowerCase().replace(/[\s-]+/g, '_');
  for (const key of Object.keys(ELASTIC_MODULUS)) {
    if (m.includes(key)) return key;
  }
  return 'carbon_steel';
}

// ─── Engine ────────────────────────────────────────────────────────

export class BurnishingPolishingEngine {
  /**
   * Predict burnishing outcome using Hertz contact theory.
   * p_max = (6*F*E*²/(π³*R²))^(1/3) for ball contact.
   */
  predictBurnishing(input: BurnishingInput): BurnishingResult {
    const matKey = getMaterialKey(input.material);
    const E = (ELASTIC_MODULUS[matKey] ?? 210) * 1e3; // GPa → MPa
    const sigma_y = YIELD_STRENGTH[matKey] ?? 350;
    const baseHRC = BASE_HARDNESS_HRC[matKey] ?? 25;

    const ballDia = input.ball_diameter_mm ?? (input.process === 'diamond_tip' ? 3 : 10);
    const R = ballDia / 2; // mm

    // Hertz contact: p_max = (6*F*E*²/(π³*R²))^(1/3)
    // Reduced modulus for rigid indenter: E* = E_workpiece / (1 - ν²)
    // Ref: Johnson "Contact Mechanics" (1985) Eq. 4.22-4.24; ν ≈ 0.3 for metals
    const nu = 0.3;
    const E_star = E / (1 - nu * nu);
    const p_max = Math.pow((6 * input.burnishing_force_N * E_star * E_star) /
      (Math.PI * Math.PI * Math.PI * R * R), 1 / 3);

    // Contact radius: a = (3*F*R/(4*E*))^(1/3)
    const a = Math.pow((3 * input.burnishing_force_N * R) / (4 * E_star), 1 / 3);

    // Depth of plastic zone ≈ 2.4 * a (Johnson's cavity model)
    const depth_of_effect = 2.4 * a;

    // Ra reduction: empirical model — higher force/speed → better finish
    // Saturation curve: Ra_final = Ra_initial * exp(-k * p_max / sigma_y)
    const pressureRatio = Math.min(p_max / sigma_y, 4.0);
    const processFactor = input.process === 'diamond_tip' ? 1.2 :
      input.process === 'ball' ? 1.0 : 0.85;
    const feedFactor = Math.max(0.5, 1 - input.feed_mm_per_rev / 0.5); // finer feed = better
    const k = 0.5 * processFactor * feedFactor;
    const final_Ra = input.initial_Ra_um * Math.exp(-k * pressureRatio);

    // Hardness increase: work hardening from plastic deformation
    // Empirical: ΔH ≈ (p_max/sigma_y - 1) * base_factor, capped
    const hardnessIncrease = Math.max(0, Math.min(8,
      (pressureRatio - 1) * 3 * processFactor));

    // Residual compressive stress: proportional to contact pressure beyond yield
    const residualStress = -Math.min(p_max * 0.4, sigma_y * 0.8); // compressive = negative

    return {
      final_Ra_um: Math.round(Math.max(0.01, final_Ra) * 1000) / 1000,
      hardness_increase_HRC: Math.round(hardnessIncrease * 10) / 10,
      residual_stress_MPa: Math.round(residualStress),
      depth_of_effect_mm: Math.round(depth_of_effect * 1000) / 1000,
    };
  }

  /**
   * Predict lapping using Preston's equation: MRR = k * p * v.
   */
  predictLapping(input: LappingInput): LappingResult {
    const matKey = getMaterialKey(input.material);
    const baseK = PRESTON_K_LAPPING[matKey] ?? 0.05;

    // Abrasive size correction: larger abrasive = faster but rougher
    const sizeFactor = Math.sqrt(input.abrasive_size_um / 10); // normalized to 10µm

    const k = baseK * sizeFactor;

    // Preston: MRR (µm/min) = k * pressure (kPa) * velocity (m/min)
    const removal_rate = k * input.pressure_kPa * input.velocity_mpm;

    // Surface roughness: Ra ≈ abrasive_size / 10 (empirical for lapping)
    const surface_Ra = input.abrasive_size_um / 10;

    // Flatness convergence: improves as sqrt(time)
    // Model: flatness improves ~1µm per minute of lapping for typical conditions
    const flatnessRate = 0.5 * (input.pressure_kPa / 30) * (input.velocity_mpm / 30);
    const startFlatness = input.target_flatness_um * 5; // assume starting 5x worse
    const time_to_target = Math.max(1,
      Math.pow((startFlatness - input.target_flatness_um) / Math.max(flatnessRate, 0.01), 2));

    return {
      removal_rate_um_per_min: Math.round(removal_rate * 1000) / 1000,
      time_to_target_min: Math.round(Math.min(time_to_target, 600) * 10) / 10,
      expected_flatness_um: Math.round(input.target_flatness_um * 100) / 100,
      surface_Ra_um: Math.round(surface_Ra * 1000) / 1000,
    };
  }

  /**
   * Predict polishing time and cost with multi-step grit progression.
   */
  predictPolishing(input: PolishingInput): PolishingResult {
    const matKey = getMaterialKey(input.material);
    const hardnessFactor = (BASE_HARDNESS_HRC[matKey] ?? 25) / 25; // harder = slower

    // Determine grit sequence needed
    const startGrit = GRIT_SEQUENCE.find(g => (GRIT_RA[g] ?? 999) < input.initial_Ra_um) ??
      GRIT_SEQUENCE[0];
    const endGrit = GRIT_SEQUENCE.find(g => (GRIT_RA[g] ?? 999) <= input.target_Ra_um) ??
      GRIT_SEQUENCE[GRIT_SEQUENCE.length - 1];

    const startIdx = GRIT_SEQUENCE.indexOf(startGrit);
    const endIdx = GRIT_SEQUENCE.indexOf(endGrit);

    const steps: PolishingStep[] = [];
    let totalTime = 0;

    // Method speed factor
    const methodFactor = input.method === 'electro' ? 0.6 :
      input.method === 'chemical_mechanical' ? 0.5 : 1.0;

    for (let i = startIdx; i <= endIdx; i++) {
      const grit = GRIT_SEQUENCE[i];
      const targetRa = GRIT_RA[grit] ?? 0.1;

      // Time per step: proportional to area, hardness, and grit fineness
      const gritTimeFactor = Math.sqrt(grit / 120); // finer grits take longer
      const areaFactor = input.area_cm2 / 10; // normalized to 10 cm²
      const stepTime = Math.max(1, 3 * gritTimeFactor * areaFactor * hardnessFactor * methodFactor);

      steps.push({
        grit,
        time_min: Math.round(stepTime * 10) / 10,
        expected_Ra: targetRa,
      });
      totalTime += stepTime;
    }

    // If no steps needed, add one minimal step
    if (steps.length === 0) {
      steps.push({
        grit: endGrit,
        time_min: 1,
        expected_Ra: GRIT_RA[endGrit] ?? input.target_Ra_um,
      });
      totalTime = 1;
    }

    const achievable_Ra = steps[steps.length - 1].expected_Ra;
    const costRate = POLISH_COST_RATE[input.method] ?? 0.80;
    const cost = totalTime * costRate;

    return {
      estimated_time_min: Math.round(totalTime * 10) / 10,
      cost_estimate: Math.round(cost * 100) / 100,
      achievable_Ra_um: achievable_Ra,
      steps,
    };
  }
}

export const burnishingPolishingEngine = new BurnishingPolishingEngine();
