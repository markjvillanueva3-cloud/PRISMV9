/**
 * CoffinMansonFatigueEngine — Low-Cycle & High-Cycle Fatigue Analysis
 *
 * Coffin-Manson-Basquin combined strain-life fatigue modeling:
 *   - Strain-life analysis (Δε/2 = elastic + plastic)
 *   - S-N curve generation from fatigue constants
 *   - Cyclic stress-strain (Ramberg-Osgood)
 *   - Thermal fatigue (CTE-driven strain cycling)
 *   - Multiaxial fatigue (von Mises equivalent strain)
 *   - Machine component fatigue life estimation
 *
 * @module engines/CoffinMansonFatigueEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface FatigueConstants {
  sigma_f_prime: number;  // Fatigue strength coefficient (MPa)
  b: number;              // Fatigue strength exponent
  epsilon_f_prime: number; // Fatigue ductility coefficient
  c: number;              // Fatigue ductility exponent
  E_gpa: number;          // Young's modulus (GPa)
  UTS_mpa: number;        // Ultimate tensile strength (MPa)
  T_melt_c: number;       // Melting temperature (°C)
  k_T: number;            // Temperature degradation factor
  CTE: number;            // Coefficient of thermal expansion (1e-6 /°C)
}

const MATERIAL_DB: Record<string, FatigueConstants> = {
  steel_1045: {
    sigma_f_prime: 948, b: -0.092, epsilon_f_prime: 0.26, c: -0.445,
    E_gpa: 207, UTS_mpa: 621, T_melt_c: 1500, k_T: 0.5, CTE: 11.7,
  },
  steel_4340: {
    sigma_f_prime: 1758, b: -0.0977, epsilon_f_prime: 0.73, c: -0.636,
    E_gpa: 200, UTS_mpa: 1110, T_melt_c: 1430, k_T: 0.45, CTE: 12.3,
  },
  aluminum_6061: {
    sigma_f_prime: 535, b: -0.107, epsilon_f_prime: 0.69, c: -0.69,
    E_gpa: 69, UTS_mpa: 310, T_melt_c: 652, k_T: 0.6, CTE: 23.6,
  },
  aluminum_7075: {
    sigma_f_prime: 745, b: -0.083, epsilon_f_prime: 0.19, c: -0.52,
    E_gpa: 72, UTS_mpa: 572, T_melt_c: 635, k_T: 0.55, CTE: 23.4,
  },
  titanium_6al4v: {
    sigma_f_prime: 1470, b: -0.095, epsilon_f_prime: 0.35, c: -0.69,
    E_gpa: 114, UTS_mpa: 950, T_melt_c: 1660, k_T: 0.4, CTE: 8.6,
  },
  stainless_316: {
    sigma_f_prime: 1000, b: -0.114, epsilon_f_prime: 0.171, c: -0.402,
    E_gpa: 193, UTS_mpa: 580, T_melt_c: 1400, k_T: 0.5, CTE: 16.0,
  },
  inconel_718: {
    sigma_f_prime: 1640, b: -0.06, epsilon_f_prime: 0.89, c: -0.72,
    E_gpa: 205, UTS_mpa: 1240, T_melt_c: 1336, k_T: 0.3, CTE: 13.0,
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface StrainLifeInput {
  material: "steel_1045" | "steel_4340" | "aluminum_6061" | "aluminum_7075" |
            "titanium_6al4v" | "stainless_316" | "inconel_718" | "custom";
  strain_amplitude?: number;
  stress_amplitude_mpa?: number;
  temperature_c?: number;
  mean_stress_mpa?: number;
  custom_params?: {
    sigma_f_prime: number;
    b: number;
    epsilon_f_prime: number;
    c: number;
    E_gpa: number;
    UTS_mpa: number;
  };
}

export interface StrainLifeResult {
  fatigue_life_cycles: number;
  reversals_2Nf: number;
  elastic_strain: number;
  plastic_strain: number;
  total_strain: number;
  transition_life_2Nt: number;
  regime: "low_cycle" | "high_cycle" | "transition";
  mean_stress_correction: {
    morrow: number;
    swt: number;
    walker: number;
  };
  strain_life_curve: { strain: number; life: number }[];
}

export interface SNcurveInput {
  material: string;
  n_points?: number;
  stress_range?: [number, number];
  r_ratio?: number;
  custom_params?: {
    sigma_f_prime: number;
    b: number;
    epsilon_f_prime: number;
    c: number;
    E_gpa: number;
    UTS_mpa: number;
  };
}

export interface SNcurveResult {
  stress_amplitudes_mpa: number[];
  cycles_to_failure: number[];
  endurance_limit_mpa?: number;
  fatigue_strength_at_1e3: number;
  fatigue_strength_at_1e6: number;
}

export interface CyclicStressStrainInput {
  material: string;
  strain_amplitude: number;
  custom_params?: {
    sigma_f_prime: number;
    b: number;
    epsilon_f_prime: number;
    c: number;
    E_gpa: number;
    UTS_mpa: number;
  };
}

export interface CyclicStressStrainResult {
  stress_amplitude_mpa: number;
  elastic_strain: number;
  plastic_strain: number;
  cyclic_modulus_gpa: number;
  strain_hardening_exponent: number;
  hysteresis_energy_mj_per_m3: number;
}

export interface ThermalFatigueInput {
  material: string;
  temp_min_c: number;
  temp_max_c: number;
  constraint_factor: number;
  n_cycles_target?: number;
  custom_params?: {
    sigma_f_prime: number;
    b: number;
    epsilon_f_prime: number;
    c: number;
    E_gpa: number;
    UTS_mpa: number;
  };
}

export interface ThermalFatigueResult {
  thermal_strain_range: number;
  fatigue_life_cycles: number;
  safe_temperature_range_c: [number, number];
  dominant_damage: "mechanical" | "thermal" | "combined";
}

export interface MultiaxialFatigueInput {
  principal_strains: [number, number, number];
  material: string;
  custom_params?: {
    sigma_f_prime: number;
    b: number;
    epsilon_f_prime: number;
    c: number;
    E_gpa: number;
    UTS_mpa: number;
  };
}

export interface MultiaxialFatigueResult {
  equivalent_strain: number;
  fatigue_life: number;
  biaxiality_ratio: number;
  critical_plane_angle_deg?: number;
}

export interface MachineComponentFatigueInput {
  component: "spindle_shaft" | "ball_screw" | "tool_holder" | "chuck_jaw" | "custom";
  loading: {
    max_stress_mpa: number;
    min_stress_mpa: number;
    frequency_hz?: number;
    temperature_c?: number;
  };
  material?: string;
}

export interface MachineComponentFatigueResult {
  fatigue_life_hours: number;
  fatigue_life_cycles: number;
  safety_factor: number;
  replacement_interval_recommended_hours: number;
  limiting_factor: string;
}

// ============================================================================
// COMPONENT DEFAULTS
// ============================================================================

interface ComponentDefaults {
  material: string;
  Kt: number;    // Stress concentration factor
  surface_factor: number;
  description: string;
}

const COMPONENT_DB: Record<string, ComponentDefaults> = {
  spindle_shaft: {
    material: "steel_4340",
    Kt: 1.8,
    surface_factor: 0.85,
    description: "CNC spindle shaft with keyway",
  },
  ball_screw: {
    material: "steel_4340",
    Kt: 2.2,
    surface_factor: 0.9,
    description: "Ball screw with thread root stress concentration",
  },
  tool_holder: {
    material: "steel_4340",
    Kt: 1.5,
    surface_factor: 0.8,
    description: "BT/HSK tool holder with groove",
  },
  chuck_jaw: {
    material: "steel_1045",
    Kt: 2.0,
    surface_factor: 0.75,
    description: "Chuck jaw with serrations",
  },
  custom: {
    material: "steel_1045",
    Kt: 1.0,
    surface_factor: 1.0,
    description: "Custom component",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getConstants(material: string, customParams?: {
  sigma_f_prime: number; b: number; epsilon_f_prime: number; c: number;
  E_gpa: number; UTS_mpa: number;
}): FatigueConstants {
  if (material === "custom" && customParams) {
    return {
      ...customParams,
      T_melt_c: 1500,
      k_T: 0.5,
      CTE: 12.0,
    };
  }
  const mat = MATERIAL_DB[material];
  if (!mat) {
    throw new Error(`Unknown material: ${material}. Available: ${Object.keys(MATERIAL_DB).join(", ")}`);
  }
  return mat;
}

/**
 * Solve for Nf given strain amplitude using Newton-Raphson.
 * Δε/2 = (σ'f/E)(2Nf)^b + ε'f(2Nf)^c
 */
function solveStrainLife(
  strainAmp: number,
  mat: FatigueConstants,
  tempFactor = 1.0
): { Nf: number; elastic: number; plastic: number; reversals: number } {
  const E = mat.E_gpa * 1000; // MPa
  const sigF = mat.sigma_f_prime * tempFactor;
  const epsF = mat.epsilon_f_prime;
  const b = mat.b;
  const c = mat.c;

  // Newton-Raphson on log(2Nf)
  let log2Nf = 6; // Initial guess: 10^6 reversals
  for (let iter = 0; iter < 200; iter++) {
    const rev = Math.exp(log2Nf);
    const elastic = (sigF / E) * Math.pow(rev, b);
    const plastic = epsF * Math.pow(rev, c);
    const totalStrain = elastic + plastic;
    const f = totalStrain - strainAmp;

    // Derivative
    const dElastic = (sigF / E) * b * Math.pow(rev, b);
    const dPlastic = epsF * c * Math.pow(rev, c);
    const df = dElastic + dPlastic;

    if (Math.abs(df) < 1e-30) break;
    const step = f / df;
    log2Nf -= step;

    if (Math.abs(step) < 1e-10) break;
  }

  const reversals = Math.exp(log2Nf);
  const elastic = (sigF / E) * Math.pow(reversals, b);
  const plastic = epsF * Math.pow(reversals, c);

  return {
    Nf: reversals / 2,
    elastic,
    plastic,
    reversals,
  };
}

/**
 * Compute transition life 2Nt where elastic strain = plastic strain.
 * (σ'f/E)(2Nt)^b = ε'f(2Nt)^c
 * 2Nt = (ε'f × E / σ'f)^(1/(b-c))
 */
function transitionLife(mat: FatigueConstants): number {
  const E = mat.E_gpa * 1000;
  const ratio = (mat.epsilon_f_prime * E) / mat.sigma_f_prime;
  return Math.pow(ratio, 1 / (mat.b - mat.c));
}

/**
 * Ramberg-Osgood: solve for stress given strain amplitude.
 * Δε/2 = Δσ/(2E) + (Δσ/(2K'))^(1/n')
 * where n' = b/c, K' = σ'f / (ε'f)^n'
 */
function rambergOsgoodStress(strainAmp: number, mat: FatigueConstants): number {
  const E = mat.E_gpa * 1000;
  const nPrime = mat.b / mat.c;
  const KPrime = mat.sigma_f_prime / Math.pow(mat.epsilon_f_prime, nPrime);

  // Newton-Raphson for stress amplitude
  let sigma = strainAmp * E; // Initial guess (elastic)
  for (let iter = 0; iter < 100; iter++) {
    const elasticStrain = sigma / E;
    const plasticStrain = Math.pow(sigma / KPrime, 1 / nPrime);
    const totalStrain = elasticStrain + plasticStrain;
    const f = totalStrain - strainAmp;

    const dElastic = 1 / E;
    const dPlastic = (1 / (nPrime * KPrime)) * Math.pow(sigma / KPrime, 1 / nPrime - 1);
    const df = dElastic + dPlastic;

    if (Math.abs(df) < 1e-30) break;
    const step = f / df;
    sigma -= step;
    if (sigma < 0) sigma = 1;
    if (Math.abs(step) < 1e-8) break;
  }

  return sigma;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CoffinMansonFatigueEngine {
  /**
   * Coffin-Manson-Basquin combined strain-life analysis.
   */
  strainLifeAnalysis(params: StrainLifeInput): StrainLifeResult {
    const {
      material,
      strain_amplitude,
      stress_amplitude_mpa,
      temperature_c = 20,
      mean_stress_mpa = 0,
      custom_params,
    } = params;

    log.info("CoffinMansonFatigueEngine.strainLifeAnalysis", {
      material,
      strain_amplitude,
      stress_amplitude_mpa,
      temperature_c,
      mean_stress_mpa,
    });

    const mat = getConstants(material, custom_params);
    const E = mat.E_gpa * 1000; // MPa

    // Temperature effect
    const tempFactor = temperature_c <= 20
      ? 1.0
      : 1.0 - mat.k_T * (temperature_c - 20) / mat.T_melt_c;

    // Determine strain amplitude
    let strainAmp: number;
    if (strain_amplitude !== undefined) {
      strainAmp = strain_amplitude;
    } else if (stress_amplitude_mpa !== undefined) {
      // Convert stress to strain using Ramberg-Osgood inverse
      const nPrime = mat.b / mat.c;
      const KPrime = mat.sigma_f_prime / Math.pow(mat.epsilon_f_prime, nPrime);
      strainAmp =
        stress_amplitude_mpa / E +
        Math.pow(stress_amplitude_mpa / KPrime, 1 / nPrime);
    } else {
      throw new Error("Either strain_amplitude or stress_amplitude_mpa must be provided");
    }

    // Solve Coffin-Manson-Basquin
    const result = solveStrainLife(strainAmp, mat, tempFactor);
    const tLife = transitionLife(mat);

    // Determine regime
    let regime: "low_cycle" | "high_cycle" | "transition";
    if (result.reversals < tLife * 0.5) {
      regime = "low_cycle";
    } else if (result.reversals > tLife * 2) {
      regime = "high_cycle";
    } else {
      regime = "transition";
    }

    // Mean stress corrections
    const sigF = mat.sigma_f_prime * tempFactor;

    // Morrow: replace σ'f with (σ'f - σ_mean)
    const morrowResult = solveStrainLife(
      strainAmp,
      { ...mat, sigma_f_prime: sigF - mean_stress_mpa },
      1.0
    );

    // SWT: σ_max * ε_a = (σ'f²/E)(2Nf)^2b + σ'f*ε'f*(2Nf)^(b+c)
    // Simplified: life correction factor
    const stressAmp = rambergOsgoodStress(strainAmp, mat);
    const sigmaMax = stressAmp + mean_stress_mpa;
    const swtParam = sigmaMax > 0 ? sigmaMax * strainAmp : 0;

    // Walker: σ_eq = σ_max^(1-γ) * σ_a^γ, γ typically 0.5
    const gamma = 0.5;
    const walkerSigma = sigmaMax > 0
      ? Math.pow(sigmaMax, 1 - gamma) * Math.pow(stressAmp, gamma)
      : stressAmp;
    const walkerStrainAmp = walkerSigma / E +
      Math.pow(walkerSigma / (mat.sigma_f_prime / Math.pow(mat.epsilon_f_prime, mat.b / mat.c)), 1 / (mat.b / mat.c));
    const walkerResult = solveStrainLife(walkerStrainAmp, mat, tempFactor);

    // Generate strain-life curve (10 points)
    const curve: { strain: number; life: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const logLife = 1 + i * 0.7; // log10(2Nf) from 1 to ~7.3
      const rev = Math.pow(10, logLife);
      const elasticStrain = (sigF / E) * Math.pow(rev, mat.b);
      const plasticStrain = mat.epsilon_f_prime * Math.pow(rev, mat.c);
      curve.push({
        strain: elasticStrain + plasticStrain,
        life: rev / 2,
      });
    }

    return {
      fatigue_life_cycles: result.Nf,
      reversals_2Nf: result.reversals,
      elastic_strain: result.elastic,
      plastic_strain: result.plastic,
      total_strain: result.elastic + result.plastic,
      transition_life_2Nt: tLife,
      regime,
      mean_stress_correction: {
        morrow: morrowResult.Nf,
        swt: swtParam,
        walker: walkerResult.Nf,
      },
      strain_life_curve: curve,
    };
  }

  /**
   * Generate S-N curve from Coffin-Manson parameters.
   */
  snCurveGenerate(params: SNcurveInput): SNcurveResult {
    const {
      material,
      n_points = 20,
      stress_range,
      r_ratio = -1,
      custom_params,
    } = params;

    log.info("CoffinMansonFatigueEngine.snCurveGenerate", {
      material,
      n_points,
      r_ratio,
    });

    const mat = getConstants(material, custom_params);
    const E = mat.E_gpa * 1000;

    // Generate stress amplitudes
    const stresses: number[] = [];
    const cycles: number[] = [];

    let sMin: number, sMax: number;
    if (stress_range) {
      [sMin, sMax] = stress_range;
    } else {
      sMax = mat.UTS_mpa * 0.95;
      sMin = mat.UTS_mpa * 0.1;
    }

    for (let i = 0; i < n_points; i++) {
      const stressAmp = sMax - (i / (n_points - 1)) * (sMax - sMin);

      // Mean stress from R-ratio: R = σ_min/σ_max
      // σ_mean = σ_a * (1+R)/(1-R)
      const meanStress =
        r_ratio === -1 ? 0 : stressAmp * (1 + r_ratio) / (1 - r_ratio);

      // Convert stress amplitude to strain amplitude via Ramberg-Osgood
      const strainAmp = stressAmp / E +
        Math.pow(
          stressAmp /
            (mat.sigma_f_prime /
              Math.pow(mat.epsilon_f_prime, mat.b / mat.c)),
          1 / (mat.b / mat.c)
        );

      // Adjust for mean stress using Morrow
      const effSigF = mat.sigma_f_prime - meanStress;
      const adjMat = { ...mat, sigma_f_prime: Math.max(effSigF, 10) };
      const result = solveStrainLife(strainAmp, adjMat);

      stresses.push(stressAmp);
      cycles.push(Math.max(1, result.Nf));
    }

    // Endurance limit (steels typically have one around 10^6-10^7)
    let enduranceLimit: number | undefined;
    if (material.startsWith("steel") || material.startsWith("stainless")) {
      // Approximate endurance limit as stress at 10^7 cycles
      const strainAt1e7 =
        (mat.sigma_f_prime / E) * Math.pow(2e7, mat.b) +
        mat.epsilon_f_prime * Math.pow(2e7, mat.c);
      enduranceLimit = rambergOsgoodStress(strainAt1e7, mat);
    }

    // Fatigue strengths at specific lives
    const strainAt1e3 =
      (mat.sigma_f_prime / E) * Math.pow(2e3, mat.b) +
      mat.epsilon_f_prime * Math.pow(2e3, mat.c);
    const strainAt1e6 =
      (mat.sigma_f_prime / E) * Math.pow(2e6, mat.b) +
      mat.epsilon_f_prime * Math.pow(2e6, mat.c);

    return {
      stress_amplitudes_mpa: stresses,
      cycles_to_failure: cycles,
      endurance_limit_mpa: enduranceLimit,
      fatigue_strength_at_1e3: rambergOsgoodStress(strainAt1e3, mat),
      fatigue_strength_at_1e6: rambergOsgoodStress(strainAt1e6, mat),
    };
  }

  /**
   * Cyclic stress-strain curve using Ramberg-Osgood relation.
   */
  cyclicStressStrain(params: CyclicStressStrainInput): CyclicStressStrainResult {
    const { material, strain_amplitude, custom_params } = params;

    log.info("CoffinMansonFatigueEngine.cyclicStressStrain", {
      material,
      strain_amplitude,
    });

    const mat = getConstants(material, custom_params);
    const E = mat.E_gpa * 1000;
    const nPrime = mat.b / mat.c;
    const KPrime = mat.sigma_f_prime / Math.pow(mat.epsilon_f_prime, nPrime);

    const stressAmp = rambergOsgoodStress(strain_amplitude, mat);
    const elasticStrain = stressAmp / E;
    const plasticStrain = strain_amplitude - elasticStrain;

    // Hysteresis energy (area of hysteresis loop)
    // W = 4 * σ_a * ε_pa * (1 - n')/(1 + n') for Masing material
    // Units: MPa × strain = MJ/m³
    const hysteresisEnergy =
      plasticStrain > 0
        ? (4 * stressAmp * plasticStrain * (1 - nPrime)) / (1 + nPrime)
        : 0;

    return {
      stress_amplitude_mpa: stressAmp,
      elastic_strain: elasticStrain,
      plastic_strain: Math.max(0, plasticStrain),
      cyclic_modulus_gpa: mat.E_gpa,
      strain_hardening_exponent: nPrime,
      hysteresis_energy_mj_per_m3: Math.abs(hysteresisEnergy),
    };
  }

  /**
   * Thermal fatigue analysis using Coffin-Manson with CTE-driven strains.
   */
  thermalFatigue(params: ThermalFatigueInput): ThermalFatigueResult {
    const {
      material,
      temp_min_c,
      temp_max_c,
      constraint_factor,
      n_cycles_target,
      custom_params,
    } = params;

    log.info("CoffinMansonFatigueEngine.thermalFatigue", {
      material,
      temp_min_c,
      temp_max_c,
      constraint_factor,
    });

    const mat = getConstants(material, custom_params);
    const deltaT = Math.abs(temp_max_c - temp_min_c);

    // Thermal strain range: Δε = α × ΔT × constraint_factor
    const thermalStrainRange = mat.CTE * 1e-6 * deltaT * constraint_factor;

    // Fatigue life from thermal strain
    let fatigueLife: number;
    if (thermalStrainRange < 1e-12) {
      fatigueLife = Infinity;
    } else {
      const strainAmp = thermalStrainRange / 2;
      const avgTemp = (temp_min_c + temp_max_c) / 2;
      const tempFactor =
        avgTemp <= 20 ? 1.0 : 1.0 - mat.k_T * (avgTemp - 20) / mat.T_melt_c;
      const result = solveStrainLife(strainAmp, mat, tempFactor);
      fatigueLife = result.Nf;
    }

    // Safe temperature range for target cycles
    let safeRange: [number, number];
    if (n_cycles_target && constraint_factor > 0) {
      // Solve for max ΔT that gives at least n_cycles_target
      // Binary search
      let lo = 0, hi = 1000;
      for (let iter = 0; iter < 50; iter++) {
        const mid = (lo + hi) / 2;
        const testStrain = mat.CTE * 1e-6 * mid * constraint_factor / 2;
        if (testStrain < 1e-15) {
          lo = mid;
          continue;
        }
        const r = solveStrainLife(testStrain, mat);
        if (r.Nf > n_cycles_target) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const safeDeltaT = lo;
      const midTemp = (temp_min_c + temp_max_c) / 2;
      safeRange = [midTemp - safeDeltaT / 2, midTemp + safeDeltaT / 2];
    } else {
      safeRange = [temp_min_c, temp_max_c];
    }

    // Determine dominant damage mechanism
    const E = mat.E_gpa * 1000;
    const mechanicalLimit = mat.sigma_f_prime / E; // approximate elastic limit strain
    let dominant: "mechanical" | "thermal" | "combined";
    if (thermalStrainRange < mechanicalLimit * 0.1) {
      dominant = "mechanical";
    } else if (thermalStrainRange > mechanicalLimit * 0.5) {
      dominant = "thermal";
    } else {
      dominant = "combined";
    }

    return {
      thermal_strain_range: thermalStrainRange,
      fatigue_life_cycles: fatigueLife,
      safe_temperature_range_c: safeRange,
      dominant_damage: dominant,
    };
  }

  /**
   * Multiaxial fatigue using von Mises equivalent strain.
   */
  multiaxialFatigue(params: MultiaxialFatigueInput): MultiaxialFatigueResult {
    const { principal_strains, material, custom_params } = params;

    log.info("CoffinMansonFatigueEngine.multiaxialFatigue", {
      material,
      principal_strains,
    });

    const [e1, e2, e3] = principal_strains;

    // Von Mises equivalent strain
    const eqStrain =
      Math.sqrt(2) /
      3 *
      Math.sqrt(
        (e1 - e2) ** 2 + (e2 - e3) ** 2 + (e3 - e1) ** 2
      );

    // Biaxiality ratio (ε2/ε1)
    const biaxialityRatio = e1 !== 0 ? e2 / e1 : 0;

    // Solve for fatigue life using equivalent strain
    const mat = getConstants(material, custom_params);
    const result = solveStrainLife(eqStrain, mat);

    // Critical plane angle (simplified: max shear plane)
    // For principal strains, max shear is at 45° to max principal strain
    const criticalPlaneAngle = 45;

    return {
      equivalent_strain: eqStrain,
      fatigue_life: result.Nf,
      biaxiality_ratio: biaxialityRatio,
      critical_plane_angle_deg: criticalPlaneAngle,
    };
  }

  /**
   * Machine component fatigue life estimation with stress concentrations.
   */
  machineComponentFatigue(
    params: MachineComponentFatigueInput
  ): MachineComponentFatigueResult {
    const { component, loading, material: materialOverride } = params;

    log.info("CoffinMansonFatigueEngine.machineComponentFatigue", {
      component,
      max_stress: loading.max_stress_mpa,
      min_stress: loading.min_stress_mpa,
    });

    const compDefaults = COMPONENT_DB[component] || COMPONENT_DB.custom;
    const materialName = materialOverride || compDefaults.material;
    const mat = getConstants(materialName);

    const Kt = compDefaults.Kt;
    const surfaceFactor = compDefaults.surface_factor;

    // Apply stress concentration and surface factor
    const stressAmp =
      (Kt * (loading.max_stress_mpa - loading.min_stress_mpa)) / 2;
    const meanStress =
      (Kt * (loading.max_stress_mpa + loading.min_stress_mpa)) / 2;
    const effectiveStressAmp = stressAmp / surfaceFactor;

    const E = mat.E_gpa * 1000;

    // Convert to strain using Neuber's rule: (Kt*S)^2 / E = σ*ε
    // Simplified: local strain ≈ Kt * nominal strain for moderate Kt
    const nominalStrainAmp = effectiveStressAmp / E;
    const localStrainAmp = Kt * nominalStrainAmp;

    // Temperature correction
    const temp = loading.temperature_c || 20;
    const tempFactor =
      temp <= 20 ? 1.0 : 1.0 - mat.k_T * (temp - 20) / mat.T_melt_c;

    // Apply Morrow mean stress correction
    const effSigF = mat.sigma_f_prime * tempFactor - meanStress;
    const adjMat = {
      ...mat,
      sigma_f_prime: Math.max(effSigF, 10),
    };
    const result = solveStrainLife(localStrainAmp, adjMat, 1.0);

    const fatigueLifeCycles = result.Nf;
    const freq = loading.frequency_hz || 10; // Default 10 Hz for machine components
    const fatigueLifeHours = fatigueLifeCycles / (freq * 3600);

    // Safety factor: ratio of endurance strain to applied strain
    const enduranceStrain =
      (mat.sigma_f_prime * tempFactor / E) * Math.pow(2e7, mat.b) +
      mat.epsilon_f_prime * Math.pow(2e7, mat.c);
    const safetyFactor = enduranceStrain / localStrainAmp;

    // Recommended replacement (at 50% of predicted life for safety margin)
    const recommendedHours = fatigueLifeHours * 0.5;

    // Limiting factor
    let limitingFactor: string;
    if (temp > 200) {
      limitingFactor = "High temperature reduces fatigue strength";
    } else if (Kt > 2.0) {
      limitingFactor = `Stress concentration (Kt=${Kt}) at ${compDefaults.description}`;
    } else if (meanStress > mat.UTS_mpa * 0.5) {
      limitingFactor = "High mean stress reduces allowable alternating stress";
    } else {
      limitingFactor = "Cyclic strain amplitude";
    }

    return {
      fatigue_life_hours: fatigueLifeHours,
      fatigue_life_cycles: fatigueLifeCycles,
      safety_factor: safetyFactor,
      replacement_interval_recommended_hours: recommendedHours,
      limiting_factor: limitingFactor,
    };
  }
}

export const coffinMansonFatigueEngine = new CoffinMansonFatigueEngine();
