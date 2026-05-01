/**
 * Shared Klocke/Puertas&Luis surface roughness model for EDM processes.
 *
 * Ra = k_ra * I_p^alpha * t_on^beta
 *
 * Where:
 *   k_ra  = material-specific prefactor [um / (A^alpha * us^beta)]
 *   I_p   = peak discharge current [A]
 *   t_on  = pulse on-time [us]
 *   alpha = current exponent (material-specific, Puertas & Luis 2004)
 *   beta  = on-time exponent (material-specific, Puertas & Luis 2004)
 *
 * References:
 *   - Klocke (2013) Manufacturing Processes 4, Table 8.3 — canonical form
 *   - Puertas & Luis (2004) — material-specific exponents
 *   - WEDMCompleteOrchestrationEngine MATERIAL_RA_MODELS — canonical source
 *
 * Used by: StochasticEDMEngine, EDMParameterEngine, EDMWireEngine,
 *          EDMCuttingParamFlushEngine, EDMProgramAssemblerEngine
 */

/** Material-specific Ra model coefficients */
export interface KlockeRaModel {
  /** Prefactor [um / (A^alpha * us^beta)] */
  k_ra: number;
  /** Peak current exponent */
  alpha: number;
  /** Pulse on-time exponent */
  beta: number;
  /** Literature source */
  source: string;
}

/**
 * Material-specific Ra model coefficients.
 * Canonical source — all EDM engines must import from here.
 *
 * k_ra range for steel: 0.35-0.42 per Klocke 2013 Table 8.3
 * (NOT the old synthetic 0.13-0.23 values)
 */
export const MATERIAL_RA_MODELS: Record<string, KlockeRaModel> = {
  steel:        { k_ra: 0.38, alpha: 0.40, beta: 0.28, source: "Klocke 2013 Table 8.3; exponents: Klocke baseline" },
  tool_steel:   { k_ra: 0.36, alpha: 0.40, beta: 0.28, source: "Klocke 2013 Table 8.3; fitted to D2/H13 data" },
  stainless:    { k_ra: 0.42, alpha: 0.38, beta: 0.30, source: "Puertas & Luis 2004, 304SS; higher k_ra due to lower conductivity" },
  aluminum:     { k_ra: 0.30, alpha: 0.35, beta: 0.25, source: "Puertas & Luis 2004, 6061; lower exponents, faster energy dissipation" },
  carbide:      { k_ra: 0.45, alpha: 0.50, beta: 0.32, source: "Puertas & Luis 2004, WC-6%Co; higher I_p sensitivity" },
  titanium:     { k_ra: 0.44, alpha: 0.42, beta: 0.30, source: "Puertas & Luis 2004, Ti-6Al-4V; high recast tendency" },
  inconel:      { k_ra: 0.46, alpha: 0.41, beta: 0.29, source: "Puertas & Luis 2004, Inconel 718; low conductivity, high recast" },
  copper:       { k_ra: 0.28, alpha: 0.35, beta: 0.24, source: "Estimated from Klocke framework; high alpha dissipates energy quickly" },
};

/**
 * Normalize material name to model key.
 * Handles common aliases: "D2" → "tool_steel", "304SS" → "stainless", etc.
 */
export function normalizeMaterialKey(material: string): string {
  const m = material.toLowerCase().replace(/[\s-]/g, "_");
  const aliases: Record<string, string> = {
    d2: "tool_steel", a2: "tool_steel", s7: "tool_steel", m2: "tool_steel", h13: "tool_steel",
    "6061": "aluminum", "7075": "aluminum", "2024": "aluminum",
    "304ss": "stainless", "316ss": "stainless", "17_4ph": "stainless",
    wc: "carbide", tungsten_carbide: "carbide",
    "ti_6al_4v": "titanium",
    inconel_718: "inconel", hastelloy: "inconel",
    brass: "copper", beryllium_copper: "copper",
  };
  return aliases[m] ?? (m in MATERIAL_RA_MODELS ? m : "steel");
}

/**
 * Calculate surface roughness using Klocke/Puertas&Luis canonical model.
 *
 * Ra = k_ra * I_p^alpha * t_on^beta
 *
 * @param I_p_A - Peak discharge current [A]. Clamped to >= 0.1A.
 * @param t_on_us - Pulse on-time [microseconds]. Clamped to >= 0.05us.
 * @param material - Material name (normalized via aliases). Default: "steel"
 * @returns Surface roughness Ra [um]
 */
export function klockeRa(I_p_A: number, t_on_us: number, material?: string): number {
  const model = MATERIAL_RA_MODELS[normalizeMaterialKey(material ?? "steel")]
    ?? MATERIAL_RA_MODELS.steel;
  const ip = Math.max(0.1, I_p_A);
  const ton = Math.max(0.05, t_on_us);
  return model.k_ra * Math.pow(ip, model.alpha) * Math.pow(ton, model.beta);
}

/**
 * Calculate Ra from pulse energy (convenience for engines that use energy-based inputs).
 * Derives I_p from E = V_gap * I_p * t_on, then applies Klocke formula.
 *
 * @param energy_mJ - Discharge energy per pulse [mJ]
 * @param t_on_us - Pulse on-time [microseconds]
 * @param material - Material name
 * @param V_gap_V - Gap voltage [V]. Default: 45V (typical servo voltage)
 * @returns Surface roughness Ra [um]
 */
export function klockeRaFromEnergy(
  energy_mJ: number,
  t_on_us: number,
  material?: string,
  V_gap_V: number = 45,
): number {
  const t_on_s = Math.max(0.05e-6, t_on_us * 1e-6);
  const I_p = t_on_s > 0 ? (energy_mJ / 1000) / (V_gap_V * t_on_s) : 1;
  return klockeRa(I_p, t_on_us, material);
}

/**
 * Get the Ra model for a material. Useful for engines that need exponents directly.
 */
export function getRaModel(material: string): KlockeRaModel {
  return MATERIAL_RA_MODELS[normalizeMaterialKey(material)] ?? MATERIAL_RA_MODELS.steel;
}
