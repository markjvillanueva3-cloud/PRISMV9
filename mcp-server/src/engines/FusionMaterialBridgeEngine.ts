/**
 * FusionMaterialBridgeEngine — Bridge Fusion 360 material database to ISO groups
 *
 * Maps Fusion 360 / HSMWorks material specifications to:
 *   - ISO material groups (P, M, K, N, S, H)
 *   - PRISM-compatible material properties
 *   - Cutting parameter recommendations
 *
 * Fusion 360 Material Library Categories:
 *   - Metals (Steel, Stainless, Aluminum, Titanium, etc.)
 *   - Plastics (ABS, Nylon, Delrin, etc.)
 *   - Composites (Carbon fiber, Fiberglass, etc.)
 *   - Wood (Hardwood, Softwood, Plywood, MDF)
 *
 * @module engines/FusionMaterialBridgeEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP06
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Fusion 360 material category */
export type FusionMaterialCategory =
  | "Steel"
  | "Stainless Steel"
  | "Cast Iron"
  | "Aluminum"
  | "Copper"
  | "Brass"
  | "Bronze"
  | "Titanium"
  | "Nickel Alloy"
  | "Tool Steel"
  | "Hardened Steel"
  | "Plastic"
  | "Composite"
  | "Wood"
  | "Graphite"
  | "Magnesium";

export interface FusionMaterial {
  id: string;
  name: string;
  fusion_category: FusionMaterialCategory;
  fusion_library: string;       // Fusion 360 material library name
  iso_group: ISOGroup;
  hardness_hrc?: number;
  hardness_hb?: number;
  density_kg_m3: number;
  tensile_strength_mpa: number;
  yield_strength_mpa: number;
  elongation_pct: number;
  machinability_index: number;  // 0-1, relative to free-cutting steel
}

export interface FusionMaterialMapping {
  fusion_name_pattern: string;      // Regex or substring match
  iso_group: ISOGroup;
  speed_factor: number;              // Multiplier on base speed
  feed_factor: number;               // Multiplier on base feed
  coolant_recommendation: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" | "mql";
}

export interface FusionCuttingRecommendation {
  material: FusionMaterial;
  iso_group: ISOGroup;
  base_speed_m_min: number;
  base_feed_mm_tooth: number;
  depth_factor: number;
  width_factor: number;
  coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" | "mql";
  tool_coating: string;
  notes: string[];
}

// ============================================================================
// MATERIAL DATABASE — Fusion 360 Common Materials
// ============================================================================

const FUSION_MATERIALS: FusionMaterial[] = [
  // === ISO P - Steel ===
  { id: "fusion-1018", name: "AISI 1018 Steel", fusion_category: "Steel", fusion_library: "Autodesk Material Library", iso_group: "P", hardness_hb: 130, density_kg_m3: 7870, tensile_strength_mpa: 440, yield_strength_mpa: 370, elongation_pct: 25, machinability_index: 0.75 },
  { id: "fusion-1045", name: "AISI 1045 Steel", fusion_category: "Steel", fusion_library: "Autodesk Material Library", iso_group: "P", hardness_hb: 200, density_kg_m3: 7870, tensile_strength_mpa: 620, yield_strength_mpa: 530, elongation_pct: 16, machinability_index: 0.65 },
  { id: "fusion-4140", name: "AISI 4140 Steel", fusion_category: "Steel", fusion_library: "Autodesk Material Library", iso_group: "P", hardness_hb: 280, density_kg_m3: 7850, tensile_strength_mpa: 950, yield_strength_mpa: 850, elongation_pct: 12, machinability_index: 0.55 },
  { id: "fusion-4340", name: "AISI 4340 Steel", fusion_category: "Steel", fusion_library: "Autodesk Material Library", iso_group: "P", hardness_hb: 320, density_kg_m3: 7850, tensile_strength_mpa: 1100, yield_strength_mpa: 950, elongation_pct: 10, machinability_index: 0.50 },
  { id: "fusion-a36", name: "A36 Structural Steel", fusion_category: "Steel", fusion_library: "Autodesk Material Library", iso_group: "P", hardness_hb: 120, density_kg_m3: 7850, tensile_strength_mpa: 400, yield_strength_mpa: 250, elongation_pct: 20, machinability_index: 0.72 },

  // === ISO M - Stainless ===
  { id: "fusion-304", name: "AISI 304 Stainless Steel", fusion_category: "Stainless Steel", fusion_library: "Autodesk Material Library", iso_group: "M", hardness_hb: 170, density_kg_m3: 8000, tensile_strength_mpa: 515, yield_strength_mpa: 205, elongation_pct: 40, machinability_index: 0.45 },
  { id: "fusion-316", name: "AISI 316 Stainless Steel", fusion_category: "Stainless Steel", fusion_library: "Autodesk Material Library", iso_group: "M", hardness_hb: 180, density_kg_m3: 8000, tensile_strength_mpa: 580, yield_strength_mpa: 290, elongation_pct: 40, machinability_index: 0.40 },
  { id: "fusion-17-4ph", name: "17-4 PH Stainless Steel", fusion_category: "Stainless Steel", fusion_library: "Autodesk Material Library", iso_group: "M", hardness_hrc: 35, density_kg_m3: 7780, tensile_strength_mpa: 1100, yield_strength_mpa: 1000, elongation_pct: 10, machinability_index: 0.35 },
  { id: "fusion-410", name: "AISI 410 Stainless Steel", fusion_category: "Stainless Steel", fusion_library: "Autodesk Material Library", iso_group: "M", hardness_hb: 220, density_kg_m3: 7800, tensile_strength_mpa: 480, yield_strength_mpa: 275, elongation_pct: 25, machinability_index: 0.50 },
  { id: "fusion-303", name: "AISI 303 Stainless Steel", fusion_category: "Stainless Steel", fusion_library: "Autodesk Material Library", iso_group: "M", hardness_hb: 160, density_kg_m3: 8000, tensile_strength_mpa: 620, yield_strength_mpa: 240, elongation_pct: 50, machinability_index: 0.55 },

  // === ISO K - Cast Iron ===
  { id: "fusion-gray-iron", name: "Gray Cast Iron", fusion_category: "Cast Iron", fusion_library: "Autodesk Material Library", iso_group: "K", hardness_hb: 200, density_kg_m3: 7200, tensile_strength_mpa: 220, yield_strength_mpa: 180, elongation_pct: 0.5, machinability_index: 0.80 },
  { id: "fusion-ductile-iron", name: "Ductile Cast Iron", fusion_category: "Cast Iron", fusion_library: "Autodesk Material Library", iso_group: "K", hardness_hb: 220, density_kg_m3: 7100, tensile_strength_mpa: 450, yield_strength_mpa: 310, elongation_pct: 10, machinability_index: 0.70 },
  { id: "fusion-malleable-iron", name: "Malleable Cast Iron", fusion_category: "Cast Iron", fusion_library: "Autodesk Material Library", iso_group: "K", hardness_hb: 180, density_kg_m3: 7300, tensile_strength_mpa: 350, yield_strength_mpa: 220, elongation_pct: 12, machinability_index: 0.75 },

  // === ISO N - Aluminum/Non-ferrous ===
  { id: "fusion-6061", name: "Aluminum 6061-T6", fusion_category: "Aluminum", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 95, density_kg_m3: 2700, tensile_strength_mpa: 310, yield_strength_mpa: 276, elongation_pct: 12, machinability_index: 1.0 },
  { id: "fusion-7075", name: "Aluminum 7075-T6", fusion_category: "Aluminum", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 150, density_kg_m3: 2810, tensile_strength_mpa: 572, yield_strength_mpa: 503, elongation_pct: 11, machinability_index: 0.90 },
  { id: "fusion-2024", name: "Aluminum 2024-T3", fusion_category: "Aluminum", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 120, density_kg_m3: 2780, tensile_strength_mpa: 485, yield_strength_mpa: 345, elongation_pct: 18, machinability_index: 0.85 },
  { id: "fusion-a380", name: "Aluminum A380 Cast", fusion_category: "Aluminum", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 80, density_kg_m3: 2710, tensile_strength_mpa: 320, yield_strength_mpa: 160, elongation_pct: 3.5, machinability_index: 0.95 },
  { id: "fusion-c360-brass", name: "C360 Free-Cutting Brass", fusion_category: "Brass", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 80, density_kg_m3: 8500, tensile_strength_mpa: 390, yield_strength_mpa: 140, elongation_pct: 25, machinability_index: 1.0 },
  { id: "fusion-c110-copper", name: "C110 Copper", fusion_category: "Copper", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 45, density_kg_m3: 8940, tensile_strength_mpa: 220, yield_strength_mpa: 70, elongation_pct: 45, machinability_index: 0.70 },
  { id: "fusion-bronze", name: "C932 Bearing Bronze", fusion_category: "Bronze", fusion_library: "Autodesk Material Library", iso_group: "N", hardness_hb: 65, density_kg_m3: 8800, tensile_strength_mpa: 240, yield_strength_mpa: 125, elongation_pct: 10, machinability_index: 0.80 },

  // === ISO S - Superalloys/Titanium ===
  { id: "fusion-ti6al4v", name: "Titanium Ti-6Al-4V", fusion_category: "Titanium", fusion_library: "Autodesk Material Library", iso_group: "S", hardness_hrc: 36, density_kg_m3: 4430, tensile_strength_mpa: 950, yield_strength_mpa: 880, elongation_pct: 14, machinability_index: 0.22 },
  { id: "fusion-ti-cp", name: "Titanium Grade 2 (CP)", fusion_category: "Titanium", fusion_library: "Autodesk Material Library", iso_group: "S", hardness_hb: 160, density_kg_m3: 4510, tensile_strength_mpa: 345, yield_strength_mpa: 275, elongation_pct: 20, machinability_index: 0.30 },
  { id: "fusion-inconel718", name: "Inconel 718", fusion_category: "Nickel Alloy", fusion_library: "Autodesk Material Library", iso_group: "S", hardness_hrc: 40, density_kg_m3: 8190, tensile_strength_mpa: 1375, yield_strength_mpa: 1100, elongation_pct: 21, machinability_index: 0.15 },
  { id: "fusion-inconel625", name: "Inconel 625", fusion_category: "Nickel Alloy", fusion_library: "Autodesk Material Library", iso_group: "S", hardness_hb: 200, density_kg_m3: 8440, tensile_strength_mpa: 900, yield_strength_mpa: 500, elongation_pct: 50, machinability_index: 0.18 },
  { id: "fusion-hastelloy", name: "Hastelloy C-276", fusion_category: "Nickel Alloy", fusion_library: "Autodesk Material Library", iso_group: "S", hardness_hb: 200, density_kg_m3: 8890, tensile_strength_mpa: 790, yield_strength_mpa: 365, elongation_pct: 60, machinability_index: 0.17 },

  // === ISO H - Hardened Steel ===
  { id: "fusion-d2-hard", name: "D2 Tool Steel (Hardened)", fusion_category: "Hardened Steel", fusion_library: "Autodesk Material Library", iso_group: "H", hardness_hrc: 60, density_kg_m3: 7700, tensile_strength_mpa: 2000, yield_strength_mpa: 1800, elongation_pct: 1, machinability_index: 0.12 },
  { id: "fusion-m2-hard", name: "M2 HSS (Hardened)", fusion_category: "Hardened Steel", fusion_library: "Autodesk Material Library", iso_group: "H", hardness_hrc: 65, density_kg_m3: 8160, tensile_strength_mpa: 2200, yield_strength_mpa: 2000, elongation_pct: 0.5, machinability_index: 0.10 },
  { id: "fusion-h13-hard", name: "H13 Tool Steel (Hardened)", fusion_category: "Hardened Steel", fusion_library: "Autodesk Material Library", iso_group: "H", hardness_hrc: 52, density_kg_m3: 7800, tensile_strength_mpa: 1700, yield_strength_mpa: 1500, elongation_pct: 2, machinability_index: 0.18 },
  { id: "fusion-s7-hard", name: "S7 Tool Steel (Hardened)", fusion_category: "Hardened Steel", fusion_library: "Autodesk Material Library", iso_group: "H", hardness_hrc: 58, density_kg_m3: 7800, tensile_strength_mpa: 1900, yield_strength_mpa: 1700, elongation_pct: 1.5, machinability_index: 0.14 },
  { id: "fusion-a2-hard", name: "A2 Tool Steel (Hardened)", fusion_category: "Hardened Steel", fusion_library: "Autodesk Material Library", iso_group: "H", hardness_hrc: 60, density_kg_m3: 7860, tensile_strength_mpa: 1950, yield_strength_mpa: 1750, elongation_pct: 1, machinability_index: 0.13 },

  // === Graphite (EDM electrode) ===
  { id: "fusion-graphite-edm", name: "Graphite (EDM Grade)", fusion_category: "Graphite", fusion_library: "Autodesk Material Library", iso_group: "K", hardness_hb: 70, density_kg_m3: 1750, tensile_strength_mpa: 45, yield_strength_mpa: 30, elongation_pct: 0, machinability_index: 1.2 }
];

// Pattern-based mapping for automatic classification
const FUSION_MATERIAL_MAPPINGS: FusionMaterialMapping[] = [
  { fusion_name_pattern: "hardened|tempered|hrc.*5[0-9]|hrc.*6[0-5]", iso_group: "H", speed_factor: 0.4, feed_factor: 0.5, coolant_recommendation: "mist" },
  { fusion_name_pattern: "titanium|ti-6al|ti6al", iso_group: "S", speed_factor: 0.25, feed_factor: 0.4, coolant_recommendation: "high_pressure" },
  { fusion_name_pattern: "inconel|hastelloy|waspaloy|rene|nimonic", iso_group: "S", speed_factor: 0.2, feed_factor: 0.35, coolant_recommendation: "high_pressure" },
  { fusion_name_pattern: "stainless|inox|304|316|17-4|410|303", iso_group: "M", speed_factor: 0.6, feed_factor: 0.7, coolant_recommendation: "flood" },
  { fusion_name_pattern: "cast.*iron|ductile|gray.*iron|malleable", iso_group: "K", speed_factor: 0.9, feed_factor: 1.0, coolant_recommendation: "dry" },
  { fusion_name_pattern: "aluminum|aluminium|6061|7075|2024|a380", iso_group: "N", speed_factor: 2.0, feed_factor: 1.2, coolant_recommendation: "mist" },
  { fusion_name_pattern: "brass|bronze|copper", iso_group: "N", speed_factor: 1.5, feed_factor: 1.0, coolant_recommendation: "mist" },
  { fusion_name_pattern: "steel|1018|1045|4140|4340|a36", iso_group: "P", speed_factor: 1.0, feed_factor: 1.0, coolant_recommendation: "flood" },
  { fusion_name_pattern: "graphite|edm.*grade", iso_group: "K", speed_factor: 1.5, feed_factor: 1.2, coolant_recommendation: "dry" }
];

// ISO Group base cutting parameters
const ISO_BASE_PARAMS: Record<ISOGroup, { Vc: number; fz: number; ap: number; ae: number; coating: string }> = {
  P: { Vc: 200, fz: 0.15, ap: 5, ae: 10, coating: "TiAlN" },
  M: { Vc: 120, fz: 0.12, ap: 4, ae: 8, coating: "TiAlN" },
  K: { Vc: 180, fz: 0.18, ap: 5, ae: 12, coating: "TiCN" },
  N: { Vc: 400, fz: 0.20, ap: 8, ae: 15, coating: "Uncoated/DLC" },
  S: { Vc: 45, fz: 0.08, ap: 2, ae: 4, coating: "AlTiN" },
  H: { Vc: 80, fz: 0.06, ap: 1.5, ae: 3, coating: "CBN/AlTiN" }
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FusionMaterialBridgeEngine {
  private materials: FusionMaterial[] = [...FUSION_MATERIALS];

  /**
   * Look up material by Fusion ID or name
   */
  findMaterial(query: string): FusionMaterial | null {
    const q = query.toLowerCase();
    return this.materials.find(m =>
      m.id.toLowerCase() === q ||
      m.name.toLowerCase().includes(q) ||
      m.fusion_category.toLowerCase().includes(q)
    ) || null;
  }

  /**
   * Map Fusion 360 material name to ISO group using pattern matching
   */
  mapToISO(fusionMaterialName: string): ISOGroup {
    const name = fusionMaterialName.toLowerCase();

    for (const mapping of FUSION_MATERIAL_MAPPINGS) {
      const regex = new RegExp(mapping.fusion_name_pattern, "i");
      if (regex.test(name)) {
        return mapping.iso_group;
      }
    }

    // Default to steel (P) if no match
    return "P";
  }

  /**
   * Get cutting recommendation for a Fusion 360 material
   */
  getCuttingRecommendation(materialId: string): FusionCuttingRecommendation | null {
    const material = this.findMaterial(materialId);
    if (!material) return null;

    const iso = material.iso_group;
    const baseParams = ISO_BASE_PARAMS[iso];

    // Find matching pattern for coolant recommendation
    let coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry" | "mql" = "flood";
    for (const mapping of FUSION_MATERIAL_MAPPINGS) {
      const regex = new RegExp(mapping.fusion_name_pattern, "i");
      if (regex.test(material.name)) {
        coolant = mapping.coolant_recommendation;
        break;
      }
    }

    const notes: string[] = [];
    if (iso === "H") notes.push("Use ceramic or CBN inserts for hardened steel");
    if (iso === "S") notes.push("High-pressure coolant recommended for chip evacuation");
    if (iso === "M") notes.push("Work hardening - avoid dwelling");
    if (iso === "N") notes.push("High speeds possible - watch for built-up edge");
    if (iso === "K") notes.push("Dry machining preferred - watch for graphite dust");

    return {
      material,
      iso_group: iso,
      base_speed_m_min: baseParams.Vc,
      base_feed_mm_tooth: baseParams.fz,
      depth_factor: 1.0,
      width_factor: 1.0,
      coolant,
      tool_coating: baseParams.coating,
      notes
    };
  }

  /**
   * Get all materials by ISO group
   */
  listByISO(iso: ISOGroup): FusionMaterial[] {
    return this.materials.filter(m => m.iso_group === iso);
  }

  /**
   * Get all materials by Fusion category
   */
  listByCategory(category: FusionMaterialCategory): FusionMaterial[] {
    return this.materials.filter(m => m.fusion_category === category);
  }

  /**
   * List all materials
   */
  listMaterials(): FusionMaterial[] {
    return [...this.materials];
  }

  /**
   * Add custom material
   */
  addMaterial(material: FusionMaterial): void {
    this.materials.push(material);
    log.info(`[FusionMaterialBridge] Added material: ${material.name}`);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    total_materials: number;
    by_iso_group: Record<ISOGroup, number>;
    by_category: Record<string, number>;
  } {
    const byIso: Record<ISOGroup, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
    const byCategory: Record<string, number> = {};

    for (const m of this.materials) {
      byIso[m.iso_group]++;
      byCategory[m.fusion_category] = (byCategory[m.fusion_category] || 0) + 1;
    }

    return {
      total_materials: this.materials.length,
      by_iso_group: byIso,
      by_category: byCategory
    };
  }
}

// Singleton export
export const fusionMaterialBridgeEngine = new FusionMaterialBridgeEngine();
