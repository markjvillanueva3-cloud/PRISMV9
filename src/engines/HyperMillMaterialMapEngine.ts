/**
 * HyperMillMaterialMapEngine — hyperMILL Material Taxonomy Mapper
 *
 * Maps hyperMILL's 10-group, 57-subgroup, 190-quality-grade material
 * database to ISO material groups (P/M/K/N/S/H) and PRISM material IDs.
 * Also maps cutter material codes to standard designations.
 *
 * Source: H:/prism/HYPERMILL/Tool Database/31.0/english/materials_db.loc
 *         H:/prism/HYPERMILL/Tool Database/31.0/english/cutter_material_list.loc
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HyperMillMaterialGroup {
  id: number;
  name: string;
  isoGroup: string; // P, M, K, N, S, H, or special
  subgroups: HyperMillSubgroup[];
}

export interface HyperMillSubgroup {
  id: string; // e.g. "1_2" for group 1 subgroup 2
  name: string;
  qualities: HyperMillQuality[];
}

export interface HyperMillQuality {
  id: string; // e.g. "1_2_3"
  name: string;
  strengthRange?: string; // e.g. "< 500 N/mm²"
  hardnessRange?: string; // e.g. "48-52 HRC"
}

export interface CutterMaterial {
  code: string;
  name: string;
  isoCode?: string;
}

export interface MaterialMapResult {
  hyperMillGroup: string;
  hyperMillSubgroup: string;
  hyperMillQuality: string;
  isoGroup: string;
  isoGroupName: string;
  suggestedCutterMaterials: string[];
  warnings: string[];
}

// ============================================================================
// CUTTER MATERIAL DATABASE
// ============================================================================

export const CUTTER_MATERIALS: CutterMaterial[] = [
  { code: "Carbide", name: "Carbide", isoCode: "HM" },
  { code: "SolidCarbide", name: "Solid carbide", isoCode: "VHM" },
  { code: "Ceramic", name: "Ceramic", isoCode: "CC" },
  { code: "Cermet", name: "Cermet", isoCode: "CM" },
  { code: "HSS", name: "HSS", isoCode: "HSS" },
  { code: "HSSCo", name: "HSS-Co", isoCode: "HSS-E" },
  { code: "PCD", name: "Polycrystalline Diamond (PCD)", isoCode: "DP" },
  { code: "PCBN", name: "Polycrystalline Cubic Boron Nitride (PCBN)",
    isoCode: "BN" },
  { code: "Undefined", name: "Undefined" },
];

// ============================================================================
// MATERIAL GROUP DATABASE (from materials_db.loc)
// ============================================================================

const MATERIAL_GROUPS: HyperMillMaterialGroup[] = [
  {
    id: 1, name: "Steel", isoGroup: "P",
    subgroups: [
      { id: "1_1", name: "Free cutting-steel", qualities: [
        { id: "1_1_1", name: "< 500 N/mm²", strengthRange: "< 500 N/mm²" },
        { id: "1_1_2", name: "> 500 N/mm²", strengthRange: "> 500 N/mm²" },
      ]},
      { id: "1_2", name: "Structural steel", qualities: [
        { id: "1_2_1", name: "non-alloyed < 500 N/mm²",
          strengthRange: "< 500 N/mm²" },
        { id: "1_2_2", name: "non-alloyed > 500 N/mm²",
          strengthRange: "> 500 N/mm²" },
        { id: "1_2_3", name: "Special structural steels, alloyed" },
        { id: "1_2_4", name: "Wear resistant steels" },
      ]},
      { id: "1_3", name: "Spring steel", qualities: [
        { id: "1_3_1", name: "annealed < 250 HB",
          hardnessRange: "< 250 HB" },
        { id: "1_3_2", name: "naturally hard" },
        { id: "1_3_3", name: "spring hard" },
      ]},
      { id: "1_4", name: "Case hardening steel", qualities: [
        { id: "1_4_1", name: "< 500 N/mm²", strengthRange: "< 500 N/mm²" },
        { id: "1_4_2", name: "500-850 N/mm²",
          strengthRange: "500-850 N/mm²" },
      ]},
      { id: "1_5", name: "Nitriding steel", qualities: [
        { id: "1_5_1", name: "< 1100 N/mm²",
          strengthRange: "< 1100 N/mm²" },
        { id: "1_5_2", name: "> 1100 N/mm²",
          strengthRange: "> 1100 N/mm²" },
      ]},
      { id: "1_6", name: "Heat-treatable steel", qualities: [
        { id: "1_6_1", name: "non-alloyed < 850 N/mm²",
          strengthRange: "< 850 N/mm²" },
        { id: "1_6_2", name: "non-alloyed 850-1100 N/mm²",
          strengthRange: "850-1100 N/mm²" },
        { id: "1_6_3", name: "alloyed < 850 N/mm²",
          strengthRange: "< 850 N/mm²" },
        { id: "1_6_4", name: "alloyed 850-1100 N/mm²",
          strengthRange: "850-1100 N/mm²" },
        { id: "1_6_5", name: "alloyed 1100-1300 N/mm²",
          strengthRange: "1100-1300 N/mm²" },
        { id: "1_6_6", name: "alloyed 1300-1700 N/mm²",
          strengthRange: "1300-1700 N/mm²" },
      ]},
      { id: "1_7", name: "Carbon tool steels", qualities: [
        { id: "1_7_1", name: "generally" },
      ]},
      { id: "1_8", name: "Cold work tool steel", qualities: [
        { id: "1_8_1", name: "low alloyed annealed" },
        { id: "1_8_2", name: "high alloyed annealed" },
      ]},
      { id: "1_9", name: "Hot work tool steel", qualities: [
        { id: "1_9_1", name: "low alloyed 850-1100 N/mm²",
          strengthRange: "850-1100 N/mm²" },
        { id: "1_9_2", name: "low alloyed tempered 1100-1300 N/mm²",
          strengthRange: "1100-1300 N/mm²" },
        { id: "1_9_3", name: "low alloyed tempered 1300-1700 N/mm²",
          strengthRange: "1300-1700 N/mm²" },
        { id: "1_9_4", name: "high alloyed after annealing" },
        { id: "1_9_5", name: "high alloyed tempered 1100-1300 N/mm²",
          strengthRange: "1100-1300 N/mm²" },
        { id: "1_9_6", name: "high alloyed tempered 1300-1700 N/mm²",
          strengthRange: "1300-1700 N/mm²" },
      ]},
      { id: "1_10", name: "Hardened tool-steel", qualities: [
        { id: "1_10_1", name: "hardened 48-52 HRC",
          hardnessRange: "48-52 HRC" },
        { id: "1_10_2", name: "hardened 52-56 HRC",
          hardnessRange: "52-56 HRC" },
        { id: "1_10_3", name: "hardened 56-60 HRC",
          hardnessRange: "56-60 HRC" },
        { id: "1_10_4", name: "hardened > 60 HRC",
          hardnessRange: "> 60 HRC" },
      ]},
      { id: "1_11", name: "High-speed steel", qualities: [
        { id: "1_11_1", name: "annealed" },
        { id: "1_11_2", name: "hardened" },
      ]},
    ],
  },
  {
    id: 2, name: "Stainless and heat-resisting steel", isoGroup: "M",
    subgroups: [
      { id: "2_1", name: "Stainless steel", qualities: [
        { id: "2_1_1", name: "Stainless steel" },
      ]},
      { id: "2_2", name: "Heat-resisting steels", qualities: [
        { id: "2_2_1", name: "Heat-resisting steel" },
      ]},
      { id: "2_3", name: "High-temperature resisting steel", qualities: [
        { id: "2_3_1", name: "High temperature steel" },
      ]},
    ],
  },
  {
    id: 3, name: "Nickel - Cobalt - Chromium", isoGroup: "S",
    subgroups: [
      { id: "3_1", name: "Nickel", qualities: [
        { id: "3_1_1", name: "Nickel" },
      ]},
      { id: "3_2", name: "Nickel alloys", qualities: [
        { id: "3_2_1", name: "Nickel alloys" },
      ]},
      { id: "3_3", name: "Nickel-iron-alloys", qualities: [
        { id: "3_3_1", name: "Nickel-iron-alloys" },
      ]},
      { id: "3_4", name: "Nickel-cobalt alloys", qualities: [
        { id: "3_4_1", name: "Nickel-cobalt alloys annealed" },
        { id: "3_4_2", name: "precipitation hardened" },
      ]},
      { id: "3_5", name: "Cobalt-chromium alloys", qualities: [
        { id: "3_5_1", name: "Cobalt-chromium alloys" },
      ]},
      { id: "3_6", name: "Nickel-chromium alloys", qualities: [
        { id: "3_6_1", name: "Nickel-chromium alloys" },
      ]},
      { id: "3_7", name: "High temperature alloys", qualities: [
        { id: "3_7_1", name: "High temperature alloys" },
      ]},
    ],
  },
  {
    id: 4, name: "Cast steels - Cast iron", isoGroup: "K",
    subgroups: [
      { id: "4_1", name: "Conv. steel castings", qualities: [
        { id: "4_1_1", name: "non-alloyed" },
        { id: "4_1_2", name: "low alloyed" },
        { id: "4_1_3", name: "high alloyed" },
      ]},
      { id: "4_2", name: "Stainless steel castings", qualities: [
        { id: "4_2_1", name: "Stainless steel castings" },
      ]},
      { id: "4_3", name: "Heat-resisting steel castings", qualities: [
        { id: "4_3_1", name: "Heat-resisting steel castings" },
      ]},
      { id: "4_4", name: "Gray cast iron (with lamellar graphite)",
        qualities: [
          { id: "4_4_1", name: "non-alloyed < 180 HB",
            hardnessRange: "< 180 HB" },
          { id: "4_4_2", name: "non-alloyed > 180 HB",
            hardnessRange: "> 180 HB" },
          { id: "4_4_3", name: "alloyed" },
          { id: "4_4_4", name: "high alloyed" },
      ]},
      { id: "4_5", name: "Nodular graphite cast iron", qualities: [
        { id: "4_5_1", name: "non-alloyed < 180 HB",
          hardnessRange: "< 180 HB" },
        { id: "4_5_2", name: "non-alloyed > 180 HB",
          hardnessRange: "> 180 HB" },
        { id: "4_5_3", name: "alloyed" },
      ]},
      { id: "4_6", name: "Compacted graphite iron", qualities: [
        { id: "4_6_1", name: "non-alloyed" },
      ]},
    ],
  },
  {
    id: 5, name: "Aluminium", isoGroup: "N",
    subgroups: [
      { id: "5_1", name: "Aluminium", qualities: [
        { id: "5_1_1", name: "non-alloyed 20-50 HB",
          hardnessRange: "20-50 HB" },
        { id: "5_1_2", name: "wrought alloys non-hardened 30-80 HB",
          hardnessRange: "30-80 HB" },
        { id: "5_1_3", name: "wrought alloys hardened 70-150 HB",
          hardnessRange: "70-150 HB" },
        { id: "5_1_4", name: "cast mat. < 6% Si" },
        { id: "5_1_5", name: "cast mat. 6-12% Si" },
        { id: "5_1_6", name: "> 12% Si" },
      ]},
      { id: "5_2", name: "Aluminium magnesium", qualities: [
        { id: "5_2_1", name: "wrought alloys" },
        { id: "5_2_2", name: "cast mat." },
      ]},
      { id: "5_3", name: "Magnesium alloys", qualities: [
        { id: "5_3_1", name: "cast mat." },
      ]},
    ],
  },
  {
    id: 6, name: "Non ferrous materials", isoGroup: "N",
    subgroups: [
      { id: "6_1", name: "Copper", qualities: [
        { id: "6_1_1", name: "non-alloyed" },
        { id: "6_1_2", name: "wrought alloys non-hardened" },
        { id: "6_1_3", name: "wrought alloys hardened" },
        { id: "6_1_4", name: "CuNi-alloys" },
        { id: "6_1_5", name: "CuNiZn alloys short chips" },
      ]},
      { id: "6_2", name: "CuZn (brass)", qualities: [
        { id: "6_2_1", name: "long chips" },
        { id: "6_2_2", name: "short chips" },
      ]},
      { id: "6_3", name: "CuSn (bronze)", qualities: [
        { id: "6_3_1", name: "long chips" },
      ]},
      { id: "6_4", name: "CuAlFe (Ampco)", qualities: [
        { id: "6_4_1", name: "short chips" },
        { id: "6_4_2", name: "long chips" },
      ]},
    ],
  },
  {
    id: 7, name: "Titanium", isoGroup: "S",
    subgroups: [
      { id: "7_1", name: "Titanium", qualities: [
        { id: "7_1_1", name: "non-alloyed" },
        { id: "7_1_2", name: "modified" },
        { id: "7_1_3", name: "Alpha alloy" },
        { id: "7_1_4", name: "Alpha-Beta alloy" },
        { id: "7_1_5", name: "Beta alloy" },
      ]},
    ],
  },
  {
    id: 8, name: "Graphite", isoGroup: "N",
    subgroups: [
      { id: "8_1", name: "Graphite", qualities: [
        { id: "8_1_1", name: "Graphite standard" },
        { id: "8_1_2", name: "Wear resistant" },
      ]},
    ],
  },
  {
    id: 9, name: "Plastics", isoGroup: "N",
    subgroups: [
      { id: "9_1", name: "Thermoplast", qualities: [
        { id: "9_1_1", name: "Polyethylene" },
        { id: "9_1_2", name: "Polypropylene" },
        { id: "9_1_3", name: "Polyvinyl chloride" },
        { id: "9_1_4", name: "Polystyrene" },
        { id: "9_1_5", name: "Polymethylmethacrylate" },
        { id: "9_1_6", name: "Polytetrafluoroethylene" },
        { id: "9_1_7", name: "Polyamide" },
        { id: "9_1_8", name: "Polycarbonate" },
        { id: "9_1_9", name: "Polyamide thermoplastic" },
        { id: "9_1_10", name: "Polyetheretherketone" },
        { id: "9_1_11", name: "Polyacetal / Polyformaldehyde" },
      ]},
      { id: "9_2", name: "Duroplast", qualities: [
        { id: "9_2_1", name: "Phenol-formaldehyde" },
        { id: "9_2_2", name: "Melamine formaldehyde" },
        { id: "9_2_3", name: "Urea-formaldehyde" },
        { id: "9_2_4", name: "Polyurethane resin" },
        { id: "9_2_5", name: "Polyurethane" },
        { id: "9_2_6", name: "Silicone resin" },
        { id: "9_2_7", name: "Polyamide duroplastic" },
        { id: "9_2_8", name: "Unsaturated polyester resin" },
        { id: "9_2_9", name: "Epoxy resin" },
      ]},
      { id: "9_3", name: "Fiber reinforced plastics", qualities: [
        { id: "9_3_1", name: "Aramid fiber reinforced" },
        { id: "9_3_2", name: "Polyamid fiber reinforced" },
        { id: "9_3_3", name: "Boron fiber reinforced" },
        { id: "9_3_4", name: "Carbon fiber reinforced" },
        { id: "9_3_5", name: "Carbon fiber reinforced Composites" },
        { id: "9_3_6", name: "Vectran fiber reinforced" },
        { id: "9_3_7", name: "Glass fiber reinforced" },
        { id: "9_3_8", name: "Synthetic fiber reinforced" },
      ]},
    ],
  },
  {
    id: 10, name: "Special Materials", isoGroup: "S",
    subgroups: [
      { id: "10_1", name: "Tungsten and Tungsten alloys", qualities: [
        { id: "10_1_1", name: "Tungsten" },
        { id: "10_1_2", name: "Tungsten alloys" },
      ]},
      { id: "10_2", name: "Molybdenum and Molybdenum alloys", qualities: [
        { id: "10_2_1", name: "Molybdenum" },
        { id: "10_2_2", name: "Molybdenum alloys" },
      ]},
      { id: "10_3", name: "Tantalum and Niobium", qualities: [
        { id: "10_3_1", name: "Tantalum" },
        { id: "10_3_2", name: "Niobium" },
      ]},
      { id: "10_4", name: "Metal Matrix Composites (MMC)", qualities: [
        { id: "10_4_1", name: "TiC Titanium carbide materials" },
      ]},
      { id: "10_5", name: "Noble metals", qualities: [
        { id: "10_5_1", name: "Gold" },
        { id: "10_5_2", name: "Platinum" },
        { id: "10_5_3", name: "Silver" },
      ]},
      { id: "10_6", name: "Silicate ceramic", qualities: [
        { id: "10_6_1", name: "Alkali-Aluminium silicate" },
        { id: "10_6_2", name: "Magnesium silicate" },
        { id: "10_6_3", name: "Aluminium silicate and zirconium" },
        { id: "10_6_4", name: "Magnesium-Aluminium silicate" },
        { id: "10_6_5", name: "Mullit-ceramic" },
      ]},
      { id: "10_7", name: "Oxide ceramic", qualities: [
        { id: "10_7_1", name: "Titanate" },
        { id: "10_7_2", name: "Aluminium oxide" },
        { id: "10_7_3", name: "Oxide ceramic" },
      ]},
      { id: "10_8", name: "Medicinal Technology", qualities: [
        { id: "10_8_1", name: "Implant" },
        { id: "10_8_2", name: "Dental" },
        { id: "10_8_3", name: "Instrument" },
      ]},
    ],
  },
];

// ISO group names
const ISO_GROUP_NAMES: Record<string, string> = {
  P: "Steel",
  M: "Stainless Steel",
  K: "Cast Iron",
  N: "Non-Ferrous",
  S: "Super Alloys / Titanium",
  H: "Hardened Steel",
};

// Cutter material recommendations by ISO group
const CUTTER_RECOMMENDATIONS: Record<string, string[]> = {
  P: ["SolidCarbide", "Carbide", "Cermet", "HSS"],
  M: ["SolidCarbide", "Carbide", "Cermet"],
  K: ["SolidCarbide", "Carbide", "Ceramic", "PCBN"],
  N: ["SolidCarbide", "PCD", "HSS"],
  S: ["SolidCarbide", "Carbide", "Ceramic"],
  H: ["PCBN", "Ceramic", "SolidCarbide"],
};

// ============================================================================
// ENGINE
// ============================================================================

export class HyperMillMaterialMapEngine {
  /**
   * Look up a hyperMILL material by quality ID (e.g. "1_6_4").
   */
  lookupByQualityId(
    qualityId: string,
  ): MaterialMapResult | null {
    for (const group of MATERIAL_GROUPS) {
      for (const sub of group.subgroups) {
        for (const q of sub.qualities) {
          if (q.id === qualityId) {
            return {
              hyperMillGroup: group.name,
              hyperMillSubgroup: sub.name,
              hyperMillQuality: q.name,
              isoGroup: group.isoGroup,
              isoGroupName: ISO_GROUP_NAMES[group.isoGroup] ?? "Unknown",
              suggestedCutterMaterials:
                CUTTER_RECOMMENDATIONS[group.isoGroup] ?? [],
              warnings: this.getWarnings(group, q),
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Search materials by name substring (case-insensitive).
   */
  searchByName(query: string): MaterialMapResult[] {
    const lower = query.toLowerCase();
    const results: MaterialMapResult[] = [];

    for (const group of MATERIAL_GROUPS) {
      for (const sub of group.subgroups) {
        for (const q of sub.qualities) {
          if (
            group.name.toLowerCase().includes(lower) ||
            sub.name.toLowerCase().includes(lower) ||
            q.name.toLowerCase().includes(lower)
          ) {
            results.push({
              hyperMillGroup: group.name,
              hyperMillSubgroup: sub.name,
              hyperMillQuality: q.name,
              isoGroup: group.isoGroup,
              isoGroupName:
                ISO_GROUP_NAMES[group.isoGroup] ?? "Unknown",
              suggestedCutterMaterials:
                CUTTER_RECOMMENDATIONS[group.isoGroup] ?? [],
              warnings: this.getWarnings(group, q),
            });
          }
        }
      }
    }
    return results;
  }

  /**
   * Map an ISO group code to all hyperMILL materials in that group.
   */
  getByIsoGroup(iso: string): MaterialMapResult[] {
    const results: MaterialMapResult[] = [];
    for (const group of MATERIAL_GROUPS) {
      if (group.isoGroup !== iso) continue;
      for (const sub of group.subgroups) {
        for (const q of sub.qualities) {
          results.push({
            hyperMillGroup: group.name,
            hyperMillSubgroup: sub.name,
            hyperMillQuality: q.name,
            isoGroup: group.isoGroup,
            isoGroupName:
              ISO_GROUP_NAMES[group.isoGroup] ?? "Unknown",
            suggestedCutterMaterials:
              CUTTER_RECOMMENDATIONS[group.isoGroup] ?? [],
            warnings: this.getWarnings(group, q),
          });
        }
      }
    }
    return results;
  }

  /** Get all material groups with counts. */
  listGroups(): Array<{
    id: number;
    name: string;
    isoGroup: string;
    subgroupCount: number;
    qualityCount: number;
  }> {
    return MATERIAL_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      isoGroup: g.isoGroup,
      subgroupCount: g.subgroups.length,
      qualityCount: g.subgroups.reduce(
        (sum, s) => sum + s.qualities.length, 0,
      ),
    }));
  }

  /** Get all cutter materials. */
  listCutterMaterials(): CutterMaterial[] {
    return [...CUTTER_MATERIALS];
  }

  /** Get total quality count. */
  totalQualities(): number {
    return MATERIAL_GROUPS.reduce(
      (sum, g) =>
        sum + g.subgroups.reduce(
          (s2, sub) => s2 + sub.qualities.length, 0,
        ),
      0,
    );
  }

  private getWarnings(
    group: HyperMillMaterialGroup,
    quality: HyperMillQuality,
  ): string[] {
    const warnings: string[] = [];
    if (group.id === 7) {
      warnings.push(
        "Titanium: use flood coolant, reduce cutting speed 40-60%",
      );
    }
    if (group.id === 3) {
      warnings.push(
        "Superalloy: work hardening risk, use sharp tools, avoid dwelling",
      );
    }
    if (quality.hardnessRange?.includes("> 60 HRC")) {
      warnings.push(
        "Extreme hardness > 60 HRC: PCBN or ceramic tooling required",
      );
    }
    if (quality.name.includes("fiber reinforced")) {
      warnings.push(
        "FRP: use PCD or diamond-coated tools, watch for delamination",
      );
    }
    if (group.id === 8) {
      warnings.push(
        "Graphite: use diamond-coated carbide or PCD, abrasive dust requires extraction, dry machining only",
      );
    }
    return warnings;
  }
}

export const hyperMillMaterialMapEngine = new HyperMillMaterialMapEngine();
