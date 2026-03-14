/**
 * HyperMillMaterialBridgeEngine — Bridges hyperMILL's 2,544-material database
 * into PRISM's speed/feed pipeline with machinability correction factors.
 *
 * Features:
 *   - Multi-standard lookup: DIN Werkstoff, AISI, JIS, UNS, AFNOR, BS, UNI, GOST
 *   - Fuzzy matching with Levenshtein distance
 *   - Machinability correction factors per operation type (milling/drilling/insert)
 *   - Hardness range and tensile strength data
 *   - Chipping class → ISO group mapping
 *   - Diameter-dependent Vc/fz lookup from hyperMILL Intelligent Macro DB
 *
 * Data sources:
 *   - hypermill-materials-catalog.ts: 2,544 materials from hyperMILL v33.0
 *   - hypermill-speed-feed-catalog.ts: 102 diameter-dependent Vc/fz entries
 */

import { log } from "../utils/Logger.js";
import {
  HYPERMILL_MATERIALS,
  HYPERMILL_CHIPPING_CLASSES,
  type HyperMillMaterial,
} from "../data/hypermill-materials-catalog.js";
import {
  HYPERMILL_MAT_TECHS,
  type HyperMillSpeedFeedEntry,
} from "../data/hypermill-speed-feed-catalog.js";

// ============================================================================
// Types
// ============================================================================

export interface MaterialLookupResult {
  found: boolean;
  material: HyperMillMaterial | null;
  match_field: string;
  match_value: string;
  confidence: number;
  iso_group: string;
  chipping_class_name: string;
}

export interface MachinabilityFactors {
  operation: "milling" | "drilling" | "insert";
  factor_vc: number;
  factor_fz: number;
  factor_ae: number;
  factor_ap: number;
  chipping_class: number;
  chipping_class_name: string;
}

export interface DiameterSpeedFeed {
  material: string;
  cutting_material: string;
  diameter_mm: number;
  vc_m_min: number;
  fz_mm: number;
  drilling_feed_mm_rev: number;
  interpolated: boolean;
}

export interface MaterialSearchResult {
  materials: Array<{
    material_no: string | null;
    names: HyperMillMaterial["names"];
    group: string;
    subgroup: string;
    hardness_hb: string;
    rm_range: string;
    iso_group: string;
  }>;
  total: number;
}

// ============================================================================
// Chipping class → ISO group mapping
// ============================================================================

const CHIPPING_CLASS_TO_ISO: Record<number, string> = {
  1: "P", 2: "P", 3: "P", 4: "P", 5: "H",  // Steel grades
  6: "H", 7: "H", 8: "H", 9: "H",           // Hardened
  10: "P", 11: "P",                            // Cold/hot work tool steel
  12: "M", 13: "M", 14: "M", 15: "M",        // Stainless
  16: "S",                                      // Nickel alloys
  17: "K",                                      // Cast iron
  18: "S", 19: "S",                             // Titanium
  20: "N", 21: "N",                             // Aluminum
  22: "N", 23: "N", 24: "N",                   // Copper/bronze/brass
  25: "N",                                      // Graphite
  26: "N", 27: "N",                             // Plastics
  28: "H",                                      // HSS hardened
  1000: "P",                                    // User defined
};

// ============================================================================
// Lookup index (built once on first use)
// ============================================================================

interface LookupIndex {
  byWerkstoff: Map<string, number>;   // "1.0711" → index
  byAISI: Map<string, number>;        // "1212" → index
  byJIS: Map<string, number>;
  byUNS: Map<string, number>;
  byDIN: Map<string, number>;
  byDINEN: Map<string, number>;
  byAFNOR: Map<string, number>;
  byBS: Map<string, number>;
  byUNI: Map<string, number>;
  byGOST: Map<string, number>;
  allNames: Map<string, { idx: number; field: string }>;
}

let _index: LookupIndex | null = null;

function getIndex(): LookupIndex {
  if (_index) return _index;

  const idx: LookupIndex = {
    byWerkstoff: new Map(),
    byAISI: new Map(),
    byJIS: new Map(),
    byUNS: new Map(),
    byDIN: new Map(),
    byDINEN: new Map(),
    byAFNOR: new Map(),
    byBS: new Map(),
    byUNI: new Map(),
    byGOST: new Map(),
    allNames: new Map(),
  };

  for (let i = 0; i < HYPERMILL_MATERIALS.length; i++) {
    const m = HYPERMILL_MATERIALS[i];
    const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

    if (m.material_no) {
      idx.byWerkstoff.set(norm(m.material_no), i);
      idx.allNames.set(norm(m.material_no), { idx: i, field: "werkstoff" });
    }
    const fieldMap: Array<[keyof typeof m.names, Map<string, number>, string]> = [
      ["aisi", idx.byAISI, "aisi"],
      ["jis", idx.byJIS, "jis"],
      ["uns", idx.byUNS, "uns"],
      ["din", idx.byDIN, "din"],
      ["din_en", idx.byDINEN, "din_en"],
      ["afnor", idx.byAFNOR, "afnor"],
      ["bs", idx.byBS, "bs"],
      ["uni", idx.byUNI, "uni"],
      ["gost", idx.byGOST, "gost"],
    ];

    for (const [key, map, field] of fieldMap) {
      const val = m.names[key];
      if (val) {
        const n = norm(val);
        map.set(n, i);
        idx.allNames.set(n, { idx: i, field });
      }
    }
  }

  _index = idx;
  return idx;
}

// ============================================================================
// Engine
// ============================================================================

export class HyperMillMaterialBridgeEngine {
  /**
   * Look up a material by any standard name or Werkstoff number.
   * Tries exact match first, then fuzzy match within edit distance 2.
   */
  lookupMaterial(query: string): MaterialLookupResult {
    const idx = getIndex();
    const norm = query.toLowerCase().trim().replace(/\s+/g, " ");

    // Exact match
    const exact = idx.allNames.get(norm);
    if (exact) {
      const mat = HYPERMILL_MATERIALS[exact.idx];
      const cc = mat.milling.chipping_class;
      return {
        found: true,
        material: mat,
        match_field: exact.field,
        match_value: query,
        confidence: 1.0,
        iso_group: CHIPPING_CLASS_TO_ISO[cc] ?? "P",
        chipping_class_name: this.getChippingClassName(cc),
      };
    }

    // Try with common prefixes stripped
    const stripped = norm
      .replace(/^aisi\s*/i, "")
      .replace(/^din\s*/i, "")
      .replace(/^jis\s*/i, "")
      .replace(/^uns\s*/i, "");

    if (stripped !== norm) {
      const exact2 = idx.allNames.get(stripped);
      if (exact2) {
        const mat = HYPERMILL_MATERIALS[exact2.idx];
        const cc = mat.milling.chipping_class;
        return {
          found: true,
          material: mat,
          match_field: exact2.field,
          match_value: stripped,
          confidence: 0.95,
          iso_group: CHIPPING_CLASS_TO_ISO[cc] ?? "P",
          chipping_class_name: this.getChippingClassName(cc),
        };
      }
    }

    // Fuzzy match: check all names within Levenshtein distance 2
    let bestDist = 3;
    let bestEntry: { idx: number; field: string } | null = null;
    let bestKey = "";

    for (const [key, entry] of idx.allNames) {
      if (Math.abs(key.length - norm.length) > 2) continue;
      const d = levenshtein(norm, key);
      if (d < bestDist) {
        bestDist = d;
        bestEntry = entry;
        bestKey = key;
        if (d === 0) break;
      }
    }

    if (bestEntry && bestDist <= 2) {
      const mat = HYPERMILL_MATERIALS[bestEntry.idx];
      const cc = mat.milling.chipping_class;
      const confidence = bestDist === 1 ? 0.85 : 0.7;
      return {
        found: true,
        material: mat,
        match_field: bestEntry.field,
        match_value: bestKey,
        confidence,
        iso_group: CHIPPING_CLASS_TO_ISO[cc] ?? "P",
        chipping_class_name: this.getChippingClassName(cc),
      };
    }

    return {
      found: false,
      material: null,
      match_field: "",
      match_value: query,
      confidence: 0,
      iso_group: "P",
      chipping_class_name: "Unknown",
    };
  }

  /**
   * Get machinability correction factors for a material and operation.
   */
  getMachinabilityFactors(
    query: string,
    operation: "milling" | "drilling" | "insert" = "milling"
  ): MachinabilityFactors | null {
    const result = this.lookupMaterial(query);
    if (!result.found || !result.material) return null;

    const m = result.material;
    const op = operation === "milling" ? m.milling
      : operation === "drilling"
        ? { ...m.drilling, factor_ae: 1.0, factor_ap: 1.0 }
        : m.insert;

    return {
      operation,
      factor_vc: op.factor_vc,
      factor_fz: op.factor_fz,
      factor_ae: "factor_ae" in op ? op.factor_ae : 1.0,
      factor_ap: "factor_ap" in op ? op.factor_ap : 1.0,
      chipping_class: operation === "milling" ? m.milling.chipping_class
        : operation === "drilling" ? m.drilling.chipping_class
          : m.insert.chipping_class,
      chipping_class_name: this.getChippingClassName(
        operation === "milling" ? m.milling.chipping_class
          : operation === "drilling" ? m.drilling.chipping_class
            : m.insert.chipping_class
      ),
    };
  }

  /**
   * Diameter-dependent speed/feed lookup from hyperMILL Intelligent Macro DB.
   * Interpolates between diameter brackets.
   */
  lookupDiameterSpeedFeed(
    material: "steel" | "aluminum" | "stainless",
    cuttingMaterial: string,
    diameter_mm: number
  ): DiameterSpeedFeed | null {
    const matMap: Record<string, string> = {
      steel: "16MnCr5",
      aluminum: "AlZnMg",
      stainless: "VA",
    };
    const matName = matMap[material];
    if (!matName) return null;

    // Find matching mat_tech
    const cmNorm = cuttingMaterial.toLowerCase().replace(/[_\s-]/g, "");
    const mt = HYPERMILL_MAT_TECHS.find(
      (t) =>
        t.material === matName &&
        t.cutting_material.toLowerCase().replace(/[_\s-]/g, "").includes(cmNorm)
    );

    if (!mt || mt.items.length === 0) return null;

    // Find bracket
    const sorted = [...mt.items].sort(
      (a, b) => a.limiting_diameter - b.limiting_diameter
    );

    // Below smallest bracket
    if (diameter_mm <= sorted[0].limiting_diameter) {
      const item = sorted[0];
      return {
        material: matName,
        cutting_material: mt.cutting_material,
        diameter_mm,
        vc_m_min: item.cutting_speed,
        fz_mm: item.feedrate_per_edge,
        drilling_feed_mm_rev: item.drilling_feedrate,
        interpolated: false,
      };
    }

    // Find bracket and interpolate
    for (let i = 0; i < sorted.length - 1; i++) {
      if (
        diameter_mm > sorted[i].limiting_diameter &&
        diameter_mm <= sorted[i + 1].limiting_diameter
      ) {
        const lo = sorted[i];
        const hi = sorted[i + 1];
        const t =
          (diameter_mm - lo.limiting_diameter) /
          (hi.limiting_diameter - lo.limiting_diameter);

        return {
          material: matName,
          cutting_material: mt.cutting_material,
          diameter_mm,
          vc_m_min: lo.cutting_speed + t * (hi.cutting_speed - lo.cutting_speed),
          fz_mm:
            lo.feedrate_per_edge +
            t * (hi.feedrate_per_edge - lo.feedrate_per_edge),
          drilling_feed_mm_rev:
            lo.drilling_feedrate +
            t * (hi.drilling_feedrate - lo.drilling_feedrate),
          interpolated: true,
        };
      }
    }

    // Above largest bracket — use last entry
    const last = sorted[sorted.length - 1];
    return {
      material: matName,
      cutting_material: mt.cutting_material,
      diameter_mm,
      vc_m_min: last.cutting_speed,
      fz_mm: last.feedrate_per_edge,
      drilling_feed_mm_rev: last.drilling_feedrate,
      interpolated: false,
    };
  }

  /**
   * Search materials by group, subgroup, hardness range, or tensile strength.
   */
  searchMaterials(opts: {
    group?: string;
    subgroup?: string;
    hb_min?: number;
    hb_max?: number;
    hrc_min?: number;
    hrc_max?: number;
    rm_min?: number;
    rm_max?: number;
    iso_group?: string;
    limit?: number;
  }): MaterialSearchResult {
    const limit = opts.limit ?? 50;
    const results: MaterialSearchResult["materials"] = [];

    for (const m of HYPERMILL_MATERIALS) {
      if (results.length >= limit) break;

      if (opts.group && !m.group.toLowerCase().includes(opts.group.toLowerCase())) continue;
      if (opts.subgroup && !m.subgroup.toLowerCase().includes(opts.subgroup.toLowerCase())) continue;

      if (opts.hb_min !== undefined && m.hardness.hb_max > 0 && m.hardness.hb_max < opts.hb_min) continue;
      if (opts.hb_max !== undefined && m.hardness.hb_min > opts.hb_max) continue;

      if (opts.hrc_min !== undefined && m.hardness.hrc_max > 0 && m.hardness.hrc_max < opts.hrc_min) continue;
      if (opts.hrc_max !== undefined && m.hardness.hrc_min > opts.hrc_max) continue;

      if (opts.rm_min !== undefined && m.rm_max > 0 && m.rm_max < opts.rm_min) continue;
      if (opts.rm_max !== undefined && m.rm_min > opts.rm_max) continue;

      if (opts.iso_group) {
        const cc = m.milling.chipping_class;
        const iso = CHIPPING_CLASS_TO_ISO[cc] ?? "P";
        if (iso !== opts.iso_group) continue;
      }

      results.push({
        material_no: m.material_no,
        names: m.names,
        group: m.group,
        subgroup: m.subgroup,
        hardness_hb: m.hardness.hb_min > 0 ? `${m.hardness.hb_min}-${m.hardness.hb_max} HB` : "N/A",
        rm_range: m.rm_min > 0 ? `${m.rm_min}-${m.rm_max} N/mm²` : "N/A",
        iso_group: CHIPPING_CLASS_TO_ISO[m.milling.chipping_class] ?? "P",
      });
    }

    return { materials: results, total: results.length };
  }

  /**
   * Get catalog statistics.
   */
  getStats(): {
    total_materials: number;
    with_aisi: number;
    with_hardness: number;
    with_correction_factors: number;
    chipping_classes: number;
    speed_feed_entries: number;
    groups: Record<string, number>;
  } {
    let withAISI = 0;
    let withHardness = 0;
    let withFactors = 0;
    const groups: Record<string, number> = {};

    for (const m of HYPERMILL_MATERIALS) {
      if (m.names.aisi) withAISI++;
      if (m.hardness.hb_min > 0) withHardness++;
      const factors = [
        m.milling.factor_vc, m.milling.factor_fz,
        m.drilling.factor_vc, m.drilling.factor_fz,
        m.insert.factor_vc, m.insert.factor_fz,
      ];
      if (factors.some((f) => f !== 1.0)) withFactors++;
      groups[m.group] = (groups[m.group] ?? 0) + 1;
    }

    let sfEntries = 0;
    for (const mt of HYPERMILL_MAT_TECHS) {
      sfEntries += mt.items.length;
    }

    return {
      total_materials: HYPERMILL_MATERIALS.length,
      with_aisi: withAISI,
      with_hardness: withHardness,
      with_correction_factors: withFactors,
      chipping_classes: HYPERMILL_CHIPPING_CLASSES.length,
      speed_feed_entries: sfEntries,
      groups,
    };
  }

  private getChippingClassName(id: number): string {
    const cc = HYPERMILL_CHIPPING_CLASSES.find((c) => c.id === id);
    return cc ? cc.name : `Class ${id}`;
  }
}

// ============================================================================
// Utility: Levenshtein distance (bounded)
// ============================================================================

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const maxDist = 3; // early exit
  if (Math.abs(a.length - b.length) >= maxDist) return maxDist;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (rowMin >= maxDist) return maxDist;

    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return curr[b.length];
}

export default HyperMillMaterialBridgeEngine;
