/**
 * MastercamMaterialBridgeEngine — Bridge Mastercam material database to PRISM physics
 *
 * Maps Mastercam material specifications to:
 *   - ISO material groups (P, M, K, N, S, H)
 *   - Kienzle coefficients (kc1.1, mc)
 *   - Johnson-Cook flow stress parameters
 *   - Thermal properties for temperature prediction
 *   - Taylor tool life constants
 *
 * @module engines/MastercamMaterialBridgeEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface MastercamMaterial {
  id: string;
  name: string;
  mastercam_class: string;
  iso_group: ISOGroup;
  hardness_hrc?: number;
  hardness_hb?: number;
  density_kg_m3: number;
  tensile_strength_mpa: number;
  yield_strength_mpa: number;
  elongation_pct: number;
}

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
  source: string;
}

export interface ThermalProperties {
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK: number;
  thermal_diffusivity_m2_s: number;
}

export interface TaylorConstants {
  C: number;          // Taylor constant (speed at 1 min tool life)
  n: number;          // Taylor exponent
  p?: number;         // Feed exponent (extended Taylor)
  q?: number;         // Depth exponent (extended Taylor)
  source: string;
}

export interface MaterialPhysicsProfile {
  material: MastercamMaterial;
  kienzle: KienzleCoefficients;
  johnson_cook?: JohnsonCookParams;
  thermal: ThermalProperties;
  taylor: TaylorConstants;
  machinability_rating: number;  // 0-1, relative to free-cutting steel
  recommended_coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry";
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

const MASTERCAM_MATERIALS: MastercamMaterial[] = [
  // ISO P - Steel
  { id: "mc-1018", name: "1018 Low Carbon Steel", mastercam_class: "Steel - Low Carbon", iso_group: "P", hardness_hb: 130, density_kg_m3: 7870, tensile_strength_mpa: 440, yield_strength_mpa: 370, elongation_pct: 25 },
  { id: "mc-1045", name: "1045 Medium Carbon Steel", mastercam_class: "Steel - Medium Carbon", iso_group: "P", hardness_hb: 200, density_kg_m3: 7870, tensile_strength_mpa: 620, yield_strength_mpa: 530, elongation_pct: 16 },
  { id: "mc-4140", name: "4140 Alloy Steel", mastercam_class: "Steel - Alloy", iso_group: "P", hardness_hb: 280, density_kg_m3: 7850, tensile_strength_mpa: 950, yield_strength_mpa: 850, elongation_pct: 12 },
  { id: "mc-4340", name: "4340 High Strength Steel", mastercam_class: "Steel - Alloy", iso_group: "P", hardness_hb: 320, density_kg_m3: 7850, tensile_strength_mpa: 1100, yield_strength_mpa: 950, elongation_pct: 10 },

  // ISO M - Stainless
  { id: "mc-304", name: "304 Stainless Steel", mastercam_class: "Stainless Steel - Austenitic", iso_group: "M", hardness_hb: 170, density_kg_m3: 8000, tensile_strength_mpa: 515, yield_strength_mpa: 205, elongation_pct: 40 },
  { id: "mc-316", name: "316 Stainless Steel", mastercam_class: "Stainless Steel - Austenitic", iso_group: "M", hardness_hb: 180, density_kg_m3: 8000, tensile_strength_mpa: 580, yield_strength_mpa: 290, elongation_pct: 40 },
  { id: "mc-17-4ph", name: "17-4 PH Stainless", mastercam_class: "Stainless Steel - Precipitation Hardening", iso_group: "M", hardness_hrc: 35, density_kg_m3: 7780, tensile_strength_mpa: 1100, yield_strength_mpa: 1000, elongation_pct: 10 },

  // ISO K - Cast Iron
  { id: "mc-gray-cast", name: "Gray Cast Iron", mastercam_class: "Cast Iron - Gray", iso_group: "K", hardness_hb: 200, density_kg_m3: 7200, tensile_strength_mpa: 220, yield_strength_mpa: 180, elongation_pct: 0.5 },
  { id: "mc-ductile-cast", name: "Ductile Cast Iron", mastercam_class: "Cast Iron - Ductile", iso_group: "K", hardness_hb: 220, density_kg_m3: 7100, tensile_strength_mpa: 450, yield_strength_mpa: 310, elongation_pct: 10 },

  // ISO N - Aluminum
  { id: "mc-6061", name: "6061-T6 Aluminum", mastercam_class: "Aluminum - Wrought", iso_group: "N", hardness_hb: 95, density_kg_m3: 2700, tensile_strength_mpa: 310, yield_strength_mpa: 276, elongation_pct: 12 },
  { id: "mc-7075", name: "7075-T6 Aluminum", mastercam_class: "Aluminum - Wrought", iso_group: "N", hardness_hb: 150, density_kg_m3: 2810, tensile_strength_mpa: 572, yield_strength_mpa: 503, elongation_pct: 11 },
  { id: "mc-a380", name: "A380 Cast Aluminum", mastercam_class: "Aluminum - Cast", iso_group: "N", hardness_hb: 80, density_kg_m3: 2710, tensile_strength_mpa: 320, yield_strength_mpa: 160, elongation_pct: 3.5 },

  // ISO S - Superalloys/Titanium
  { id: "mc-ti6al4v", name: "Ti-6Al-4V", mastercam_class: "Titanium - Alpha-Beta", iso_group: "S", hardness_hrc: 36, density_kg_m3: 4430, tensile_strength_mpa: 950, yield_strength_mpa: 880, elongation_pct: 14 },
  { id: "mc-inconel718", name: "Inconel 718", mastercam_class: "Nickel Alloy", iso_group: "S", hardness_hrc: 40, density_kg_m3: 8190, tensile_strength_mpa: 1375, yield_strength_mpa: 1100, elongation_pct: 21 },
  { id: "mc-hastelloy", name: "Hastelloy C-276", mastercam_class: "Nickel Alloy", iso_group: "S", hardness_hb: 200, density_kg_m3: 8890, tensile_strength_mpa: 790, yield_strength_mpa: 365, elongation_pct: 60 },

  // ISO H - Hardened Steel
  { id: "mc-d2-hard", name: "D2 Tool Steel (Hardened)", mastercam_class: "Tool Steel - Hardened", iso_group: "H", hardness_hrc: 60, density_kg_m3: 7700, tensile_strength_mpa: 2000, yield_strength_mpa: 1800, elongation_pct: 1 },
  { id: "mc-m2-hard", name: "M2 HSS (Hardened)", mastercam_class: "Tool Steel - Hardened", iso_group: "H", hardness_hrc: 65, density_kg_m3: 8160, tensile_strength_mpa: 2200, yield_strength_mpa: 2000, elongation_pct: 0.5 },
  { id: "mc-h13-hard", name: "H13 Tool Steel (Hardened)", mastercam_class: "Tool Steel - Hardened", iso_group: "H", hardness_hrc: 52, density_kg_m3: 7800, tensile_strength_mpa: 1700, yield_strength_mpa: 1500, elongation_pct: 2 }
];

// ISO Group → Kienzle coefficients (from PRISM canonical constants)
const KIENZLE_BY_ISO: Record<ISOGroup, KienzleCoefficients> = {
  P: { kc1_1: 1800, mc: 0.25, source: "ISO 3685 / Machinery's Handbook" },
  M: { kc1_1: 2100, mc: 0.25, source: "ISO 3685 / Sandvik" },
  K: { kc1_1: 1100, mc: 0.28, source: "ISO 3685 / Kennametal" },
  N: { kc1_1: 700, mc: 0.22, source: "ISO 3685 / ASM Handbook" },
  S: { kc1_1: 2800, mc: 0.25, source: "ISO 3685 / Aerospace specs" },
  H: { kc1_1: 3200, mc: 0.28, source: "ISO 3685 / Hard milling data" }
};

// ISO Group → Taylor constants
const TAYLOR_BY_ISO: Record<ISOGroup, TaylorConstants> = {
  P: { C: 350, n: 0.25, p: 0.25, q: 0.15, source: "Taylor 1907 / Modern updates" },
  M: { C: 200, n: 0.22, p: 0.22, q: 0.12, source: "Stainless steel machining data" },
  K: { C: 400, n: 0.30, p: 0.28, q: 0.18, source: "Cast iron machining data" },
  N: { C: 600, n: 0.35, p: 0.30, q: 0.20, source: "Aluminum machining data" },
  S: { C: 100, n: 0.18, p: 0.18, q: 0.10, source: "Superalloy machining data" },
  H: { C: 80, n: 0.15, p: 0.15, q: 0.08, source: "Hard milling data" }
};

// ISO Group → Thermal properties
const THERMAL_BY_ISO: Record<ISOGroup, ThermalProperties> = {
  P: { thermal_conductivity_W_mK: 50, specific_heat_J_kgK: 490, thermal_diffusivity_m2_s: 13e-6 },
  M: { thermal_conductivity_W_mK: 16, specific_heat_J_kgK: 500, thermal_diffusivity_m2_s: 4e-6 },
  K: { thermal_conductivity_W_mK: 45, specific_heat_J_kgK: 460, thermal_diffusivity_m2_s: 14e-6 },
  N: { thermal_conductivity_W_mK: 170, specific_heat_J_kgK: 900, thermal_diffusivity_m2_s: 70e-6 },
  S: { thermal_conductivity_W_mK: 7, specific_heat_J_kgK: 526, thermal_diffusivity_m2_s: 3e-6 },
  H: { thermal_conductivity_W_mK: 25, specific_heat_J_kgK: 470, thermal_diffusivity_m2_s: 7e-6 }
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamMaterialBridgeEngine {
  private materials: MastercamMaterial[] = [...MASTERCAM_MATERIALS];

  /**
   * Look up material by Mastercam ID or name
   */
  findMaterial(query: string): MastercamMaterial | null {
    const q = query.toLowerCase();
    return this.materials.find(m =>
      m.id.toLowerCase() === q ||
      m.name.toLowerCase().includes(q) ||
      m.mastercam_class.toLowerCase().includes(q)
    ) || null;
  }

  /**
   * Get full physics profile for a material
   */
  getPhysicsProfile(materialId: string): MaterialPhysicsProfile | null {
    const material = this.findMaterial(materialId);
    if (!material) return null;

    const iso = material.iso_group;

    return {
      material,
      kienzle: KIENZLE_BY_ISO[iso],
      thermal: THERMAL_BY_ISO[iso],
      taylor: TAYLOR_BY_ISO[iso],
      machinability_rating: this.getMachinabilityRating(material),
      recommended_coolant: this.getRecommendedCoolant(iso)
    };
  }

  /**
   * Map Mastercam material class to ISO group
   */
  mapToISO(mastercamClass: string): ISOGroup {
    const c = mastercamClass.toLowerCase();

    if (c.includes("hardened") || c.includes("tool steel") && c.includes("hard")) return "H";
    if (c.includes("titanium") || c.includes("nickel") || c.includes("inconel")) return "S";
    if (c.includes("aluminum") || c.includes("brass") || c.includes("copper")) return "N";
    if (c.includes("cast iron")) return "K";
    if (c.includes("stainless")) return "M";
    return "P"; // Default to steel
  }

  /**
   * Get machinability rating (0-1, relative to 1212 free-cutting steel = 1.0)
   */
  private getMachinabilityRating(material: MastercamMaterial): number {
    const ratings: Record<ISOGroup, number> = {
      P: 0.6,
      M: 0.4,
      K: 0.7,
      N: 1.0,
      S: 0.2,
      H: 0.15
    };
    return ratings[material.iso_group];
  }

  /**
   * Get recommended coolant type
   */
  private getRecommendedCoolant(iso: ISOGroup): "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" {
    const coolants: Record<ISOGroup, "flood" | "mist" | "high_pressure" | "cryogenic" | "dry"> = {
      P: "flood",
      M: "high_pressure",
      K: "dry",
      N: "mist",
      S: "high_pressure",
      H: "mist"
    };
    return coolants[iso];
  }

  /**
   * Get Kienzle cutting force for specific chip conditions
   * Fc = kc1.1 * ap * fz^(1-mc)
   */
  calculateCuttingForce(
    materialId: string,
    axialDepth_mm: number,
    feedPerTooth_mm: number
  ): { force_N: number; specific_force_N_mm2: number; source: string } | null {
    const profile = this.getPhysicsProfile(materialId);
    if (!profile) return null;

    const { kc1_1, mc, source } = profile.kienzle;
    const chipArea = axialDepth_mm * feedPerTooth_mm;
    const kc = kc1_1 * Math.pow(feedPerTooth_mm, -mc);
    const force = kc * chipArea;

    return {
      force_N: Math.round(force * 10) / 10,
      specific_force_N_mm2: Math.round(kc),
      source
    };
  }

  /**
   * Get Taylor tool life estimate
   * T = (C/Vc)^(1/n)
   */
  estimateToolLife(
    materialId: string,
    cuttingSpeed_m_min: number
  ): { life_min: number; source: string } | null {
    const profile = this.getPhysicsProfile(materialId);
    if (!profile) return null;

    const { C, n, source } = profile.taylor;
    const life = Math.pow(C / cuttingSpeed_m_min, 1 / n);

    return {
      life_min: Math.round(life * 10) / 10,
      source
    };
  }

  /**
   * List all materials in database
   */
  listMaterials(): MastercamMaterial[] {
    return [...this.materials];
  }

  /**
   * List materials by ISO group
   */
  listByISO(iso: ISOGroup): MastercamMaterial[] {
    return this.materials.filter(m => m.iso_group === iso);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    total_materials: number;
    by_iso_group: Record<ISOGroup, number>;
  } {
    const byIso: Record<ISOGroup, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
    for (const m of this.materials) {
      byIso[m.iso_group]++;
    }
    return {
      total_materials: this.materials.length,
      by_iso_group: byIso
    };
  }
}

// Singleton export
export const mastercamMaterialBridgeEngine = new MastercamMaterialBridgeEngine();
