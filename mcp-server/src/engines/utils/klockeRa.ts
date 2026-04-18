/**
 * Shared Klocke Ra Surface Roughness Utility — U-W100-03a
 *
 * Canonical formula from Klocke (2013) "Manufacturing Processes 4":
 *   Ra = k_ra × I_p^α × t_on^β
 *
 * Material-specific coefficients from Puertas & Luis (2004):
 *   - Steel (D2, H13, A2, S7): k_ra=0.38, α=0.40, β=0.28
 *   - Stainless (304, 316):    k_ra=0.42, α=0.38, β=0.30
 *   - Aluminum (6061, 7075):   k_ra=0.35, α=0.42, β=0.25
 *   - Carbide (WC):            k_ra=0.32, α=0.35, β=0.32
 *   - Inconel/Titanium:        k_ra=0.45, α=0.38, β=0.30
 *   - Copper/Brass:            k_ra=0.40, α=0.40, β=0.26
 *
 * All engines must use this shared function to ensure formula consistency.
 */

export interface RaCoefficients {
  k_ra: number;
  alpha: number;
  beta: number;
}

export const MATERIAL_RA_COEFFICIENTS: Record<string, RaCoefficients> = {
  // Tool steels
  d2: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },
  h13: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },
  a2: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },
  s7: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },
  m2: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },
  tool_steel: { k_ra: 0.38, alpha: 0.40, beta: 0.28 },

  // Stainless steels
  "304": { k_ra: 0.42, alpha: 0.38, beta: 0.30 },
  "304ss": { k_ra: 0.42, alpha: 0.38, beta: 0.30 },
  "316": { k_ra: 0.42, alpha: 0.38, beta: 0.30 },
  "316ss": { k_ra: 0.42, alpha: 0.38, beta: 0.30 },
  stainless: { k_ra: 0.42, alpha: 0.38, beta: 0.30 },

  // Aluminum
  "6061": { k_ra: 0.35, alpha: 0.42, beta: 0.25 },
  "7075": { k_ra: 0.35, alpha: 0.42, beta: 0.25 },
  aluminum: { k_ra: 0.35, alpha: 0.42, beta: 0.25 },

  // Carbide
  wc: { k_ra: 0.32, alpha: 0.35, beta: 0.32 },
  carbide: { k_ra: 0.32, alpha: 0.35, beta: 0.32 },
  tungsten_carbide: { k_ra: 0.32, alpha: 0.35, beta: 0.32 },

  // Superalloys
  inconel: { k_ra: 0.45, alpha: 0.38, beta: 0.30 },
  "inconel_718": { k_ra: 0.45, alpha: 0.38, beta: 0.30 },
  titanium: { k_ra: 0.45, alpha: 0.38, beta: 0.30 },
  ti64: { k_ra: 0.45, alpha: 0.38, beta: 0.30 },

  // Copper alloys
  copper: { k_ra: 0.40, alpha: 0.40, beta: 0.26 },
  brass: { k_ra: 0.40, alpha: 0.40, beta: 0.26 },
};

const DEFAULT_COEFFICIENTS: RaCoefficients = { k_ra: 0.38, alpha: 0.40, beta: 0.28 };

/**
 * Get material-specific Ra coefficients.
 * Falls back to steel defaults if material not found.
 */
export function getRaCoefficients(material: string): RaCoefficients {
  const key = material.toLowerCase().replace(/[\s\-_]/g, "");
  return MATERIAL_RA_COEFFICIENTS[key] ?? DEFAULT_COEFFICIENTS;
}

/**
 * Calculate surface roughness using Klocke canonical formula.
 *
 * @param I_p - Peak current in Amperes
 * @param t_on - Pulse on-time in microseconds
 * @param material - Material name for coefficient lookup
 * @returns Ra in micrometers
 *
 * Source: Klocke (2013) Manufacturing Processes 4, Table 8.3
 *         Puertas & Luis (2004) material-specific exponents
 */
export function klockeRa(I_p: number, t_on: number, material = "tool_steel"): number {
  const { k_ra, alpha, beta } = getRaCoefficients(material);
  return k_ra * Math.pow(I_p, alpha) * Math.pow(t_on, beta);
}

/**
 * Calculate Ra from pulse energy (convenience wrapper).
 * Estimates I_p and t_on from energy using typical EDM parameters.
 *
 * @param E_pulse - Pulse energy in millijoules
 * @param material - Material name for coefficient lookup
 * @returns Ra in micrometers
 */
export function klockeRaFromEnergy(E_pulse: number, material = "tool_steel"): number {
  // Typical EDM: V_gap ≈ 25V, duty cycle ≈ 0.3
  // E = V × I × t_on × duty → I × t_on ≈ E / (V × duty) ≈ E / 7.5
  // Assume I_p ≈ 10A for 1mJ, t_on ≈ 10µs for 1mJ (empirical fit to published data)
  const I_p = Math.sqrt(E_pulse * 10); // Amperes
  const t_on = Math.sqrt(E_pulse * 10); // microseconds
  return klockeRa(I_p, t_on, material);
}

/**
 * Inverse: calculate required pulse energy to achieve target Ra.
 *
 * @param targetRa - Target Ra in micrometers
 * @param material - Material name
 * @returns Approximate pulse energy in millijoules
 */
export function energyForTargetRa(targetRa: number, material = "tool_steel"): number {
  const { k_ra, alpha, beta } = getRaCoefficients(material);
  // Ra = k_ra × (sqrt(E×10))^alpha × (sqrt(E×10))^beta = k_ra × (E×10)^((alpha+beta)/2)
  // E = (Ra / k_ra)^(2/(alpha+beta)) / 10
  const exponent = (alpha + beta) / 2;
  return Math.pow(targetRa / k_ra, 1 / exponent) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Puertas & Luis (2004) Model — Alternative empirical coefficients
// Used by EDMProgramAssemblerEngine for validated program generation.
// NOTE: These coefficients are 50-70% different from Klocke (2013) and
// produce different absolute Ra values. Both are valid empirical models;
// Klocke is from Table 8.3 of "Manufacturing Processes 4", while Puertas&Luis
// is from J. Materials Processing Technology 153-154.
// ─────────────────────────────────────────────────────────────────────────────

export interface PuertasLuisCoefficients {
  C_ra: number;
  alpha: number;
  beta: number;
}

/**
 * Puertas & Luis (2004) Ra calculation.
 * Ra = C_ra × I_peak^α × t_on^β
 *
 * @param I_p - Peak current in Amperes
 * @param t_on - Pulse on-time in microseconds
 * @param coeffs - Material-specific coefficients
 * @returns Ra in micrometers
 */
export function puertasLuisRa(
  I_p: number, t_on: number,
  coeffs: PuertasLuisCoefficients
): number {
  return coeffs.C_ra * Math.pow(I_p, coeffs.alpha) * Math.pow(t_on, coeffs.beta);
}

/**
 * Inverse Puertas&Luis: solve for I_p given target Ra and t_on.
 * I_p = (Ra / (C_ra × t_on^β))^(1/α)
 */
export function puertasLuisInverseI(
  targetRa: number, t_on: number,
  coeffs: PuertasLuisCoefficients
): number {
  const denominator = coeffs.C_ra * Math.pow(t_on, coeffs.beta);
  return Math.pow(targetRa / denominator, 1 / coeffs.alpha);
}
