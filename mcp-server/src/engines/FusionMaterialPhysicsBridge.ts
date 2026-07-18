/**
 * FusionMaterialPhysicsBridge — Connect Fusion 360 materials to PRISM physics
 *
 * Bridges Fusion 360 material database to PRISM's physics engines:
 *   - Kienzle cutting force model (kc1.1, mc coefficients)
 *   - Taylor tool life equation (C, n constants)
 *   - Johnson-Cook flow stress model (A, B, C, m, n parameters)
 *   - Thermal properties for temperature prediction
 *
 * Physics Integration:
 *   - Cutting force: Fc = kc1.1 * ap * fz^(1-mc)
 *   - Tool life: T = (C/Vc)^(1/n)
 *   - Flow stress: sigma = (A + B*eps^n)(1 + C*ln(eps_dot))(1 - T_star^m)
 *
 * @module engines/FusionMaterialPhysicsBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP06
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface KienzleCoefficients {
  kc1_1: number;      // Specific cutting force at 1mm² chip area [N/mm²]
  mc: number;         // Kienzle exponent (typically 0.2-0.3)
  source: string;
}

export interface JohnsonCookParams {
  A: number;          // Yield strength [MPa]
  B: number;          // Strain hardening coefficient [MPa]
  C: number;          // Strain rate sensitivity
  n: number;          // Strain hardening exponent
  m: number;          // Thermal softening exponent
  Tm: number;         // Melting temperature [K]
  Tr: number;         // Reference temperature [K]
  eps_dot_0: number;  // Reference strain rate [1/s]
  source: string;
}

export interface ThermalProperties {
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK: number;
  thermal_diffusivity_m2_s: number;
  melting_point_K: number;
}

export interface TaylorConstants {
  C: number;          // Taylor constant (speed at 1 min tool life) [m/min]
  n: number;          // Taylor exponent
  p?: number;         // Feed exponent (extended Taylor)
  q?: number;         // Depth exponent (extended Taylor)
  source: string;
}

export interface MaterialPhysicsProfile {
  fusion_id: string;
  name: string;
  iso_group: ISOGroup;
  kienzle: KienzleCoefficients;
  johnson_cook?: JohnsonCookParams;
  thermal: ThermalProperties;
  taylor: TaylorConstants;
  machinability_rating: number;  // 0-1, relative to free-cutting steel
  chip_breakability: "excellent" | "good" | "moderate" | "difficult";
  work_hardening_tendency: "none" | "low" | "moderate" | "high" | "severe";
  recommended_coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" | "mql";
}

export interface CuttingForceResult {
  force_N: number;
  specific_force_N_mm2: number;
  power_kW: number;
  torque_Nm: number;
  source: string;
}

export interface ToolLifeResult {
  life_min: number;
  life_at_target_speed_min?: number;
  optimal_speed_for_60min_m_min: number;
  source: string;
}

export interface FlowStressResult {
  flow_stress_MPa: number;
  strain: number;
  strain_rate: number;
  temperature_K: number;
  source: string;
}

// ============================================================================
// PHYSICS CONSTANTS — Canonical from PRISM physics/constants.ts
// ============================================================================

/**
 * ISO Group Kienzle coefficients
 * Source: ISO 3685 / Machinery's Handbook / Sandvik Coromant
 */
const KIENZLE_BY_ISO: Record<ISOGroup, KienzleCoefficients> = {
  P: { kc1_1: 1800, mc: 0.25, source: "ISO 3685 / Machinery's Handbook" },
  M: { kc1_1: 2100, mc: 0.25, source: "ISO 3685 / Sandvik" },
  K: { kc1_1: 1100, mc: 0.28, source: "ISO 3685 / Kennametal" },
  N: { kc1_1: 700, mc: 0.22, source: "ISO 3685 / ASM Handbook" },
  S: { kc1_1: 2800, mc: 0.25, source: "ISO 3685 / Aerospace specs" },
  H: { kc1_1: 3200, mc: 0.28, source: "ISO 3685 / Hard milling data" }
};

/**
 * ISO Group Taylor constants
 * Source: F.W. Taylor (1907) / Modern machining data
 */
const TAYLOR_BY_ISO: Record<ISOGroup, TaylorConstants> = {
  P: { C: 350, n: 0.25, p: 0.25, q: 0.15, source: "Taylor 1907 / Modern updates" },
  M: { C: 200, n: 0.22, p: 0.22, q: 0.12, source: "Stainless steel machining data" },
  K: { C: 400, n: 0.30, p: 0.28, q: 0.18, source: "Cast iron machining data" },
  N: { C: 600, n: 0.35, p: 0.30, q: 0.20, source: "Aluminum machining data" },
  S: { C: 100, n: 0.18, p: 0.18, q: 0.10, source: "Superalloy machining data" },
  H: { C: 80, n: 0.15, p: 0.15, q: 0.08, source: "Hard milling data" }
};

/**
 * ISO Group thermal properties
 * Source: ASM Handbook / MatWeb
 */
const THERMAL_BY_ISO: Record<ISOGroup, ThermalProperties> = {
  P: { thermal_conductivity_W_mK: 50, specific_heat_J_kgK: 490, thermal_diffusivity_m2_s: 13e-6, melting_point_K: 1800 },
  M: { thermal_conductivity_W_mK: 16, specific_heat_J_kgK: 500, thermal_diffusivity_m2_s: 4e-6, melting_point_K: 1700 },
  K: { thermal_conductivity_W_mK: 45, specific_heat_J_kgK: 460, thermal_diffusivity_m2_s: 14e-6, melting_point_K: 1450 },
  N: { thermal_conductivity_W_mK: 170, specific_heat_J_kgK: 900, thermal_diffusivity_m2_s: 70e-6, melting_point_K: 933 },
  S: { thermal_conductivity_W_mK: 7, specific_heat_J_kgK: 526, thermal_diffusivity_m2_s: 3e-6, melting_point_K: 1900 },
  H: { thermal_conductivity_W_mK: 25, specific_heat_J_kgK: 470, thermal_diffusivity_m2_s: 7e-6, melting_point_K: 1800 }
};

/**
 * Johnson-Cook parameters for common materials
 * Source: Literature surveys (Jaspers 2002, Umbrello 2007, etc.)
 */
const JOHNSON_COOK_DB: Record<string, JohnsonCookParams> = {
  "AISI 1045": { A: 553, B: 601, C: 0.0134, n: 0.234, m: 1.0, Tm: 1793, Tr: 293, eps_dot_0: 1, source: "Jaspers & Dautzenberg 2002" },
  "AISI 4140": { A: 595, B: 580, C: 0.023, n: 0.133, m: 1.03, Tm: 1793, Tr: 293, eps_dot_0: 1, source: "Gray et al. 1994" },
  "AISI 304": { A: 310, B: 1000, C: 0.064, n: 0.65, m: 1.0, Tm: 1700, Tr: 293, eps_dot_0: 1, source: "Lee & Lin 1998" },
  "Ti-6Al-4V": { A: 1098, B: 1092, C: 0.014, n: 0.93, m: 1.1, Tm: 1933, Tr: 293, eps_dot_0: 1, source: "Lee & Lin 1998" },
  "Inconel 718": { A: 1241, B: 622, C: 0.0134, n: 0.6522, m: 1.3, Tm: 1573, Tr: 293, eps_dot_0: 1, source: "Ozel et al. 2006" },
  "Aluminum 6061": { A: 324, B: 114, C: 0.002, n: 0.42, m: 1.34, Tm: 925, Tr: 293, eps_dot_0: 1, source: "Lesuer 2001" },
  "Aluminum 7075": { A: 546, B: 678, C: 0.024, n: 0.71, m: 1.56, Tm: 893, Tr: 293, eps_dot_0: 1, source: "Brar et al. 2009" }
};

// ============================================================================
// INPUT VALIDATION HELPERS (defensive guards — reject NaN/Infinity/out-of-range)
// ============================================================================

/** True only for a finite, strictly-positive number (rejects 0, negatives, NaN, +/-Infinity). */
function isPositiveFinite(x: number): boolean {
  return Number.isFinite(x) && x > 0;
}

/** True for a finite, non-negative number (allows 0 — e.g. plastic strain; rejects negatives, NaN, +/-Infinity). */
function isNonNegativeFinite(x: number): boolean {
  return Number.isFinite(x) && x >= 0;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FusionMaterialPhysicsBridge {
  private profiles: Map<string, MaterialPhysicsProfile> = new Map();

  constructor() {
    this.initializeProfiles();
  }

  /**
   * Initialize physics profiles from Fusion material definitions
   */
  private initializeProfiles(): void {
    // Steel (P group)
    this.addProfile("fusion-1018", "AISI 1018 Steel", "P", { chip: "excellent", hardening: "none" });
    this.addProfile("fusion-1045", "AISI 1045 Steel", "P", { chip: "excellent", hardening: "none", jc_key: "AISI 1045" });
    this.addProfile("fusion-4140", "AISI 4140 Steel", "P", { chip: "good", hardening: "low", jc_key: "AISI 4140" });
    this.addProfile("fusion-4340", "AISI 4340 Steel", "P", { chip: "good", hardening: "low" });

    // Stainless (M group)
    this.addProfile("fusion-304", "AISI 304 Stainless Steel", "M", { chip: "difficult", hardening: "severe", jc_key: "AISI 304" });
    this.addProfile("fusion-316", "AISI 316 Stainless Steel", "M", { chip: "difficult", hardening: "severe" });
    this.addProfile("fusion-17-4ph", "17-4 PH Stainless Steel", "M", { chip: "moderate", hardening: "high" });

    // Cast Iron (K group)
    this.addProfile("fusion-gray-iron", "Gray Cast Iron", "K", { chip: "excellent", hardening: "none" });
    this.addProfile("fusion-ductile-iron", "Ductile Cast Iron", "K", { chip: "good", hardening: "none" });

    // Aluminum (N group)
    this.addProfile("fusion-6061", "Aluminum 6061-T6", "N", { chip: "good", hardening: "none", jc_key: "Aluminum 6061" });
    this.addProfile("fusion-7075", "Aluminum 7075-T6", "N", { chip: "good", hardening: "none", jc_key: "Aluminum 7075" });
    this.addProfile("fusion-2024", "Aluminum 2024-T3", "N", { chip: "good", hardening: "none" });
    this.addProfile("fusion-c360-brass", "C360 Free-Cutting Brass", "N", { chip: "excellent", hardening: "none" });

    // Superalloys (S group)
    this.addProfile("fusion-ti6al4v", "Titanium Ti-6Al-4V", "S", { chip: "difficult", hardening: "moderate", jc_key: "Ti-6Al-4V" });
    this.addProfile("fusion-inconel718", "Inconel 718", "S", { chip: "difficult", hardening: "high", jc_key: "Inconel 718" });
    this.addProfile("fusion-hastelloy", "Hastelloy C-276", "S", { chip: "difficult", hardening: "high" });

    // Hardened (H group)
    this.addProfile("fusion-d2-hard", "D2 Tool Steel (Hardened)", "H", { chip: "moderate", hardening: "none" });
    this.addProfile("fusion-m2-hard", "M2 HSS (Hardened)", "H", { chip: "moderate", hardening: "none" });
    this.addProfile("fusion-h13-hard", "H13 Tool Steel (Hardened)", "H", { chip: "moderate", hardening: "none" });
  }

  /**
   * Add a physics profile for a Fusion material
   */
  private addProfile(
    fusionId: string,
    name: string,
    iso: ISOGroup,
    opts: {
      chip: "excellent" | "good" | "moderate" | "difficult";
      hardening: "none" | "low" | "moderate" | "high" | "severe";
      jc_key?: string;
    }
  ): void {
    const machinability: Record<ISOGroup, number> = { P: 0.6, M: 0.4, K: 0.7, N: 1.0, S: 0.2, H: 0.15 };
    const coolant: Record<ISOGroup, "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" | "mql"> = {
      P: "flood", M: "high_pressure", K: "dry", N: "mist", S: "high_pressure", H: "mist"
    };

    const profile: MaterialPhysicsProfile = {
      fusion_id: fusionId,
      name,
      iso_group: iso,
      kienzle: KIENZLE_BY_ISO[iso],
      johnson_cook: opts.jc_key ? JOHNSON_COOK_DB[opts.jc_key] : undefined,
      thermal: THERMAL_BY_ISO[iso],
      taylor: TAYLOR_BY_ISO[iso],
      machinability_rating: machinability[iso],
      chip_breakability: opts.chip,
      work_hardening_tendency: opts.hardening,
      recommended_coolant: coolant[iso]
    };

    this.profiles.set(fusionId, profile);
  }

  /**
   * Get physics profile for a Fusion material
   */
  getPhysicsProfile(fusionMaterialId: string): MaterialPhysicsProfile | null {
    return this.profiles.get(fusionMaterialId) || null;
  }

  /**
   * Calculate Kienzle cutting force
   * Fc = kc1.1 * ap * fz^(1-mc)
   *
   * @param fusionMaterialId - Fusion 360 material ID
   * @param axialDepth_mm - Axial depth of cut [mm]
   * @param feedPerTooth_mm - Feed per tooth [mm]
   * @param cuttingSpeed_m_min - Cutting speed [m/min]
   * @param toolDiameter_mm - Tool diameter [mm] (for power/torque)
   */
  calculateCuttingForce(
    fusionMaterialId: string,
    axialDepth_mm: number,
    feedPerTooth_mm: number,
    cuttingSpeed_m_min: number,
    toolDiameter_mm: number
  ): CuttingForceResult | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    if (!profile) return null;

    // Input guard: reject non-positive / non-finite geometry & kinematics.
    // (Prevents fz=0 -> Infinity specific-force & NaN cutting force, and
    //  fz<0 -> NaN from a fractional power of a negative base.)
    if (
      !isPositiveFinite(axialDepth_mm) ||
      !isPositiveFinite(feedPerTooth_mm) ||
      !isPositiveFinite(cuttingSpeed_m_min) ||
      !isPositiveFinite(toolDiameter_mm)
    ) {
      return null;
    }

    const { kc1_1, mc, source } = profile.kienzle;

    // Kienzle specific cutting force
    const kc = kc1_1 * Math.pow(feedPerTooth_mm, -mc);

    // Chip area
    const chipArea = axialDepth_mm * feedPerTooth_mm;

    // Cutting force
    const Fc = kc * chipArea;

    // Power [kW] = Fc [N] * Vc [m/min] / 60000
    const power = (Fc * cuttingSpeed_m_min) / 60000;

    // Torque [Nm] = Fc [N] * (D/2) / 1000
    const torque = (Fc * toolDiameter_mm / 2) / 1000;

    return {
      force_N: Math.round(Fc * 10) / 10,
      specific_force_N_mm2: Math.round(kc),
      power_kW: Math.round(power * 100) / 100,
      torque_Nm: Math.round(torque * 100) / 100,
      source: `Kienzle model - ${source}`
    };
  }

  /**
   * Estimate Taylor tool life
   * T = (C/Vc)^(1/n)
   *
   * @param fusionMaterialId - Fusion 360 material ID
   * @param cuttingSpeed_m_min - Cutting speed [m/min]
   * @param targetLife_min - Optional target tool life for reverse calculation
   */
  estimateToolLife(
    fusionMaterialId: string,
    cuttingSpeed_m_min: number,
    targetLife_min?: number
  ): ToolLifeResult | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    if (!profile) return null;

    // Input guard: cutting speed must be positive & finite (Vc<=0 -> Infinite life);
    // an optional target life, when supplied, must be positive & finite too.
    if (!isPositiveFinite(cuttingSpeed_m_min)) return null;
    if (targetLife_min !== undefined && !isPositiveFinite(targetLife_min)) return null;

    const { C, n, source } = profile.taylor;

    // Taylor equation: T = (C/Vc)^(1/n)
    const life = Math.pow(C / cuttingSpeed_m_min, 1 / n);

    // Optimal speed for 60 min life: Vc = C / 60^n
    const optimalSpeedFor60 = C / Math.pow(60, n);

    // Life at target speed (if provided)
    let lifeAtTarget: number | undefined;
    if (targetLife_min) {
      const targetSpeed = C / Math.pow(targetLife_min, n);
      lifeAtTarget = Math.pow(C / targetSpeed, 1 / n);
    }

    return {
      life_min: Math.round(life * 10) / 10,
      life_at_target_speed_min: lifeAtTarget ? Math.round(lifeAtTarget * 10) / 10 : undefined,
      optimal_speed_for_60min_m_min: Math.round(optimalSpeedFor60 * 10) / 10,
      source: `Taylor equation - ${source}`
    };
  }

  /**
   * Calculate Johnson-Cook flow stress
   * sigma = (A + B*eps^n)(1 + C*ln(eps_dot/eps_dot_0))(1 - T_star^m)
   * where T_star = (T - Tr)/(Tm - Tr)
   *
   * @param fusionMaterialId - Fusion 360 material ID
   * @param strain - Plastic strain
   * @param strainRate - Strain rate [1/s]
   * @param temperature_K - Temperature [K]
   */
  calculateFlowStress(
    fusionMaterialId: string,
    strain: number,
    strainRate: number,
    temperature_K: number
  ): FlowStressResult | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    if (!profile || !profile.johnson_cook) return null;

    // Input guard: strain must be finite & non-negative (strain<0 -> NaN from a
    // fractional power of a negative base; strain=0 is a valid quasi-static case);
    // strain rate and absolute temperature must be finite & positive.
    if (
      !isNonNegativeFinite(strain) ||
      !isPositiveFinite(strainRate) ||
      !isPositiveFinite(temperature_K)
    ) {
      return null;
    }

    const jc = profile.johnson_cook;

    // Strain hardening term
    const strainTerm = jc.A + jc.B * Math.pow(strain, jc.n);

    // Strain rate term (avoid log(0))
    const ratioEpsDot = Math.max(strainRate / jc.eps_dot_0, 1);
    const strainRateTerm = 1 + jc.C * Math.log(ratioEpsDot);

    // Thermal softening term
    let thermalTerm = 1;
    if (temperature_K > jc.Tr) {
      const T_star = (temperature_K - jc.Tr) / (jc.Tm - jc.Tr);
      thermalTerm = 1 - Math.pow(Math.min(T_star, 1), jc.m);
    }

    const flowStress = strainTerm * strainRateTerm * thermalTerm;

    return {
      flow_stress_MPa: Math.round(flowStress * 10) / 10,
      strain,
      strain_rate: strainRate,
      temperature_K,
      source: `Johnson-Cook model - ${jc.source}`
    };
  }

  /**
   * Get Kienzle coefficients for a Fusion material
   */
  getKienzleCoefficients(fusionMaterialId: string): KienzleCoefficients | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    return profile ? profile.kienzle : null;
  }

  /**
   * Get Taylor constants for a Fusion material
   */
  getTaylorConstants(fusionMaterialId: string): TaylorConstants | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    return profile ? profile.taylor : null;
  }

  /**
   * Get thermal properties for a Fusion material
   */
  getThermalProperties(fusionMaterialId: string): ThermalProperties | null {
    const profile = this.getPhysicsProfile(fusionMaterialId);
    return profile ? profile.thermal : null;
  }

  /**
   * List all materials with physics profiles
   */
  listMaterials(): { id: string; name: string; iso_group: ISOGroup }[] {
    return Array.from(this.profiles.values()).map(p => ({
      id: p.fusion_id,
      name: p.name,
      iso_group: p.iso_group
    }));
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    total_profiles: number;
    with_johnson_cook: number;
    by_iso_group: Record<ISOGroup, number>;
  } {
    const byIso: Record<ISOGroup, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
    let withJC = 0;

    for (const profile of this.profiles.values()) {
      byIso[profile.iso_group]++;
      if (profile.johnson_cook) withJC++;
    }

    return {
      total_profiles: this.profiles.size,
      with_johnson_cook: withJC,
      by_iso_group: byIso
    };
  }
}

// Singleton export
export const fusionMaterialPhysicsBridge = new FusionMaterialPhysicsBridge();
