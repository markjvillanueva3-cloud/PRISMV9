/**
 * CuttingDataLookupEngine — Comprehensive Cutting Parameter Recommendations
 *
 * Provides speed/feed/DOC recommendations by:
 *   - ISO material group (P/M/K/N/S/H)
 *   - Operation type (milling, turning, drilling, tapping, threading)
 *   - Tool type (endmill, face_mill, ball_nose, drill, tap, insert)
 *   - Tool diameter
 *   - Coating and substrate
 *
 * Data sources: Tungaloy GC 2023-2024, Sandvik Coromant general recommendations,
 *   Machinery's Handbook, Metalmorphosis 2021, industry standard practices.
 *
 * All values are STARTING POINTS — adjust based on machine rigidity, setup,
 * coolant, tool condition, and specific material grade.
 *
 * Source: pdf-learn pipeline (H:/prism/CATALOGS/GC_2023-2024_US_*.pdf,
 *         Metalmorphosis-2021, domain knowledge)
 */

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type CuttingOperation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
export type ToolType = "endmill" | "face_mill" | "ball_nose" | "bull_nose" | "drill" | "tap" | "reamer" | "insert_turn" | "insert_mill";
export type CutType = "roughing" | "finishing" | "semi_finishing";

export interface CuttingRecommendation {
  iso_group: ISOGroup;
  material_examples: string[];
  operation: CuttingOperation;
  tool_type: ToolType;
  cut_type: CutType;
  vc_sfm: { low: number; recommended: number; high: number };
  vc_mmin: { low: number; recommended: number; high: number };
  fz_ipt: { low: number; recommended: number; high: number };  // per tooth/per rev
  ap_mm: { low: number; recommended: number; high: number };    // axial DOC
  ae_pct: { low: number; recommended: number; high: number };   // radial engagement %
  notes: string[];
  coolant: "flood" | "mist" | "air_blast" | "dry" | "mql";
  coating_recommended: string[];
  confidence: number;
  source: string;
}

export interface SpeedFeedQuery {
  material?: string;
  iso_group?: ISOGroup;
  operation?: CuttingOperation;
  tool_type?: ToolType;
  tool_diameter_mm?: number;
  cut_type?: CutType;
  hardness_hb?: number;
}

export interface SpeedFeedResult {
  recommendations: CuttingRecommendation[];
  rpm?: number;
  feed_mmmin?: number;
  query_resolved: {
    iso_group: ISOGroup;
    operation: CuttingOperation;
    tool_type: ToolType;
    cut_type: CutType;
  };
}

// ============================================================================
// MATERIAL MAPPING
// ============================================================================

const MATERIAL_TO_ISO: Record<string, ISOGroup> = {
  // P - Steel
  "steel": "P", "carbon_steel": "P", "alloy_steel": "P", "low_carbon_steel": "P",
  "medium_carbon_steel": "P", "high_carbon_steel": "P", "aisi_1018": "P", "aisi_1045": "P",
  "aisi_4140": "P", "aisi_4340": "P", "aisi_8620": "P", "aisi_1020": "P",
  "structural_steel": "P", "mild_steel": "P", "spring_steel": "P",

  // M - Stainless Steel
  "stainless_steel": "M", "stainless": "M", "304_stainless": "M", "316_stainless": "M",
  "303_stainless": "M", "17_4ph": "M", "duplex": "M", "austenitic": "M",
  "martensitic_stainless": "M", "ferritic_stainless": "M",

  // K - Cast Iron
  "cast_iron": "K", "gray_iron": "K", "ductile_iron": "K", "nodular_iron": "K",
  "malleable_iron": "K", "cgi": "K", "compacted_graphite": "K",

  // N - Non-ferrous
  "aluminum": "N", "aluminium": "N", "6061": "N", "7075": "N", "2024": "N",
  "copper": "N", "brass": "N", "bronze": "N", "plastic": "N", "acetal": "N",
  "nylon": "N", "peek": "N", "delrin": "N", "magnesium": "N", "zinc": "N",

  // S - Super alloys & Titanium
  "titanium": "S", "ti_6al_4v": "S", "inconel": "S", "inconel_718": "S",
  "hastelloy": "S", "waspaloy": "S", "nimonic": "S", "monel": "S",
  "stellite": "S", "rene": "S", "mp35n": "S", "l605": "S",

  // H - Hardened Steel
  "hardened_steel": "H", "tool_steel": "H", "d2": "H", "h13": "H",
  "a2": "H", "m2": "H", "s7": "H", "o1": "H", "cpm": "H",
};

// ============================================================================
// CUTTING DATA TABLES — By ISO Group × Operation × Cut Type
// ============================================================================
// ROLE: a CONSERVATIVE vendor-style REFERENCE lookup keyed by ISO group x operation x cut type
// -- a safe "starting point" a programmer dials up. This is DELIBERATELY DISTINCT from
// UltimateSpeedFeedEngine.CUTTING_PARAMS (the canonical PHYSICS-optimized SFC: per-tool /
// per-machine, hardness+strategy+tool+coolant factors, Kienzle forces, goal blending incl.
// shop_recommended). The two tables are NOT meant to be byte-identical and must NOT be
// force-synced (R7 surface-don't-average): this one is the conservative reference floor, that one
// is the physics-optimized recommendation -- values here run conservative vs modern coated-carbide
// catalog BY DESIGN. (Confirmed intentional 2026-06-19: AutoSpeedFeedEngine orchestrates BOTH
// engines in distinct roles; this engine's tests assert internal consistency, not parity with the
// physics calc. Cross-ref reference_oscar_sfc_shop_recommended_2026_06_19.)
// SFM values (Imperial); multiply by 0.3048 for m/min
// fz = feed per tooth (inches) for milling/drilling; fn = feed per rev for turning

interface CuttingRow {
  vc_sfm: [number, number, number]; // low, rec, high
  fz_ipt: [number, number, number]; // low, rec, high (varies by dia, base = 1/2" endmill)
  ap_mm: [number, number, number];  // low, rec, high
  ae_pct: [number, number, number]; // low, rec, high
  coolant: "flood" | "mist" | "air_blast" | "dry" | "mql";
  coatings: string[];
  notes: string[];
}

type DataKey = `${ISOGroup}_${CuttingOperation}_${CutType}`;

const CUTTING_DATA: Partial<Record<DataKey, CuttingRow>> = {
  // ============ P - STEEL (Carbon & Alloy) ============
  P_milling_roughing: {
    vc_sfm: [300, 450, 600], fz_ipt: [0.003, 0.005, 0.007],
    ap_mm: [3, 8, 15], ae_pct: [25, 40, 65],
    coolant: "flood", coatings: ["AlTiN", "TiAlN", "AlCrN"],
    notes: ["Adaptive/trochoidal: SFM×1.5, ae 8-15%", "Reduce SFM 20% for >35 HRC"],
  },
  P_milling_finishing: {
    vc_sfm: [400, 550, 700], fz_ipt: [0.002, 0.003, 0.005],
    ap_mm: [0.2, 0.5, 2], ae_pct: [50, 75, 100],
    coolant: "flood", coatings: ["AlTiN", "TiAlN"],
    notes: ["Use ball nose for 3D surfaces", "Climb milling preferred"],
  },
  P_milling_semi_finishing: {
    vc_sfm: [350, 500, 650], fz_ipt: [0.002, 0.004, 0.006],
    ap_mm: [1, 3, 5], ae_pct: [30, 50, 70],
    coolant: "flood", coatings: ["AlTiN", "TiAlN"],
    notes: ["Leave 0.3-0.5mm stock for finish pass"],
  },
  P_turning_roughing: {
    vc_sfm: [400, 600, 800], fz_ipt: [0.008, 0.012, 0.020],
    ap_mm: [1.5, 3, 6], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["CVD TiCN+Al2O3", "PVD TiAlN"],
    notes: ["fn = feed per rev (IPR)", "Use CNMG for general purpose"],
  },
  P_turning_finishing: {
    vc_sfm: [500, 700, 900], fz_ipt: [0.003, 0.006, 0.010],
    ap_mm: [0.2, 0.5, 1.5], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["PVD TiAlN", "cermet"],
    notes: ["fn = feed per rev (IPR)", "Use DNMG/VNMG for finish"],
  },
  P_drilling_roughing: {
    vc_sfm: [200, 350, 500], fz_ipt: [0.004, 0.007, 0.012],
    ap_mm: [0, 0, 0], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["TiAlN", "AlCrN"],
    notes: ["fn = feed per rev", "Peck at 3×D depth", "Through-tool coolant above 3×D"],
  },
  P_tapping_roughing: {
    vc_sfm: [40, 70, 100], fz_ipt: [0, 0, 0],
    ap_mm: [0, 0, 0], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["TiN", "TiCN"],
    notes: ["Feed = pitch (auto)", "75% thread engagement typical", "Spiral flute for blind holes"],
  },

  // ============ M - STAINLESS STEEL ============
  M_milling_roughing: {
    vc_sfm: [200, 325, 450], fz_ipt: [0.003, 0.004, 0.006],
    ap_mm: [2, 5, 10], ae_pct: [20, 35, 50],
    coolant: "flood", coatings: ["AlTiN", "AlCrN", "nACo"],
    notes: ["Avoid dwelling — work hardens", "Maintain chip load, never rub", "Adaptive: SFM×1.3, ae 8-12%"],
  },
  M_milling_finishing: {
    vc_sfm: [250, 400, 500], fz_ipt: [0.002, 0.003, 0.004],
    ap_mm: [0.2, 0.5, 1.5], ae_pct: [50, 75, 100],
    coolant: "flood", coatings: ["AlTiN", "AlCrN"],
    notes: ["Climb milling critical", "Sharp edges essential"],
  },
  M_turning_roughing: {
    vc_sfm: [300, 475, 650], fz_ipt: [0.006, 0.010, 0.016],
    ap_mm: [1, 2.5, 5], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["PVD TiAlN", "CVD Al2O3"],
    notes: ["Constant feed — work hardens on dwell", "Positive rake geometry"],
  },
  M_drilling_roughing: {
    vc_sfm: [130, 220, 350], fz_ipt: [0.003, 0.006, 0.010],
    ap_mm: [0, 0, 0], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["AlCrN", "TiAlN"],
    notes: ["Through-tool coolant essential", "Reduce peck interval for 304/316"],
  },

  // ============ K - CAST IRON ============
  K_milling_roughing: {
    vc_sfm: [350, 550, 800], fz_ipt: [0.004, 0.007, 0.010],
    ap_mm: [3, 6, 12], ae_pct: [30, 50, 75],
    coolant: "dry", coatings: ["Al2O3", "AlTiN", "SiAlON"],
    notes: ["Dry cutting preferred (thermal shock)", "Ceramic inserts above 600 SFM"],
  },
  K_milling_finishing: {
    vc_sfm: [400, 650, 1000], fz_ipt: [0.002, 0.004, 0.006],
    ap_mm: [0.2, 0.5, 2], ae_pct: [50, 75, 100],
    coolant: "air_blast", coatings: ["CBN", "Al2O3", "AlTiN"],
    notes: ["CBN for gray iron above 800 SFM"],
  },
  K_turning_roughing: {
    vc_sfm: [400, 650, 1000], fz_ipt: [0.006, 0.010, 0.018],
    ap_mm: [1.5, 3, 8], ae_pct: [100, 100, 100],
    coolant: "dry", coatings: ["CVD Al2O3", "SiAlON"],
    notes: ["Ceramic at high speed, carbide for interrupted"],
  },

  // ============ N - NON-FERROUS (Aluminum, Brass, Plastic) ============
  N_milling_roughing: {
    vc_sfm: [800, 1200, 2500], fz_ipt: [0.004, 0.007, 0.012],
    ap_mm: [5, 15, 25], ae_pct: [25, 50, 100],
    coolant: "flood", coatings: ["uncoated", "ZrN", "DLC"],
    notes: ["Polished flutes, 2-3 flute preferred", "HSM: 15000+ RPM, light DOC, full slot OK"],
  },
  N_milling_finishing: {
    vc_sfm: [1000, 1500, 3000], fz_ipt: [0.002, 0.004, 0.006],
    ap_mm: [0.1, 0.3, 1], ae_pct: [50, 75, 100],
    coolant: "mist", coatings: ["uncoated", "DLC"],
    notes: ["Single flute for mirror finish", "PCD for long production runs"],
  },
  N_turning_roughing: {
    vc_sfm: [800, 1200, 3000], fz_ipt: [0.005, 0.010, 0.020],
    ap_mm: [1, 3, 8], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["uncoated", "PCD"],
    notes: ["Sharp positive rake", "Avoid BUE: increase speed or use PCD"],
  },
  N_drilling_roughing: {
    vc_sfm: [300, 600, 1000], fz_ipt: [0.005, 0.008, 0.015],
    ap_mm: [0, 0, 0], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["uncoated", "TiN"],
    notes: ["135° point angle", "Chip evacuation critical in deep holes"],
  },

  // ============ S - SUPERALLOYS & TITANIUM ============
  S_milling_roughing: {
    vc_sfm: [80, 150, 250], fz_ipt: [0.002, 0.004, 0.006],
    ap_mm: [1, 3, 6], ae_pct: [15, 25, 40],
    coolant: "flood", coatings: ["AlTiN", "AlCrN", "nACRo"],
    notes: ["NEVER machine titanium dry — fire risk", "Trochoidal essential: SFM×1.5, ae 5-10%",
            "Maintain chip load — rubbing causes work hardening"],
  },
  S_milling_finishing: {
    vc_sfm: [120, 200, 300], fz_ipt: [0.001, 0.003, 0.004],
    ap_mm: [0.2, 0.5, 1.5], ae_pct: [30, 50, 75],
    coolant: "flood", coatings: ["AlTiN", "AlCrN"],
    notes: ["Round inserts for finishing", "Climb milling only"],
  },
  S_turning_roughing: {
    vc_sfm: [100, 175, 275], fz_ipt: [0.004, 0.008, 0.012],
    ap_mm: [0.5, 2, 4], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["PVD AlTiN", "uncoated carbide"],
    notes: ["High-pressure coolant (70+ bar) recommended", "Sharp positive geometry essential"],
  },
  S_drilling_roughing: {
    vc_sfm: [50, 100, 180], fz_ipt: [0.002, 0.004, 0.008],
    ap_mm: [0, 0, 0], ae_pct: [100, 100, 100],
    coolant: "flood", coatings: ["AlTiN", "AlCrN"],
    notes: ["Through-coolant mandatory", "Max 2×D without peck", "Reduce feed 50% at entry"],
  },

  // ============ H - HARDENED STEEL (>45 HRC) ============
  H_milling_roughing: {
    vc_sfm: [150, 250, 400], fz_ipt: [0.001, 0.003, 0.005],
    ap_mm: [0.5, 1.5, 3], ae_pct: [10, 20, 35],
    coolant: "air_blast", coatings: ["AlTiSiN", "AlCrN", "CBN"],
    notes: ["Light DOC, light ae — hard milling strategy", "CBN inserts above 55 HRC",
            "Avoid flood coolant — thermal shock cracking"],
  },
  H_milling_finishing: {
    vc_sfm: [200, 350, 500], fz_ipt: [0.001, 0.002, 0.003],
    ap_mm: [0.05, 0.2, 0.5], ae_pct: [20, 40, 60],
    coolant: "air_blast", coatings: ["AlTiSiN", "CBN"],
    notes: ["Can replace grinding in many applications", "Ballnose for 3D die/mold finishing"],
  },
  H_turning_roughing: {
    vc_sfm: [200, 350, 500], fz_ipt: [0.003, 0.006, 0.010],
    ap_mm: [0.3, 1, 2], ae_pct: [100, 100, 100],
    coolant: "dry", coatings: ["CBN", "ceramic"],
    notes: ["CBN for continuous, ceramic for light interrupted", "Dry cutting preferred"],
  },
};

// ============================================================================
// FEED DIAMETER ADJUSTMENT TABLE
// ============================================================================
// fz scales with tool diameter: base values are for 1/2" (12.7mm) endmill
// Multiply base fz by this factor for other diameters

const DIAMETER_FZ_FACTOR: Record<string, number> = {
  "2": 0.3,    // 2mm
  "3": 0.4,
  "4": 0.5,
  "5": 0.55,
  "6": 0.6,
  "8": 0.7,
  "10": 0.8,
  "12": 0.95,
  "16": 1.1,
  "20": 1.2,
  "25": 1.3,
  "32": 1.4,
  "40": 1.5,
  "50": 1.6,
  "63": 1.7,
  "80": 1.8,
  "100": 1.9,
  "125": 2.0,
};

function getDiaFactor(dia_mm: number): number {
  const keys = Object.keys(DIAMETER_FZ_FACTOR).map(Number).sort((a, b) => a - b);
  // Find closest
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - dia_mm) < Math.abs(closest - dia_mm)) closest = k;
  }
  return DIAMETER_FZ_FACTOR[String(closest)] ?? 1.0;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CuttingDataLookupEngine {
  /**
   * Get cutting recommendations for given parameters
   */
  recommend(query: SpeedFeedQuery): SpeedFeedResult {
    // Resolve ISO group from material name
    const iso = query.iso_group ?? this.resolveISOGroup(query.material ?? "steel", query.hardness_hb);
    const operation = query.operation ?? "milling";
    const toolType = query.tool_type ?? "endmill";
    const cutType = query.cut_type ?? "roughing";

    const key: DataKey = `${iso}_${operation}_${cutType}`;
    const data = CUTTING_DATA[key];

    if (!data) {
      // Fallback: try roughing if requested type not found
      const fallbackKey: DataKey = `${iso}_${operation}_roughing`;
      const fallback = CUTTING_DATA[fallbackKey];
      if (!fallback) {
        return {
          recommendations: [],
          query_resolved: { iso_group: iso, operation, tool_type: toolType, cut_type: cutType },
        };
      }
    }

    const row = data ?? CUTTING_DATA[`${iso}_${operation}_roughing`]!;
    const diaFactor = query.tool_diameter_mm ? getDiaFactor(query.tool_diameter_mm) : 1.0;

    const rec: CuttingRecommendation = {
      iso_group: iso,
      material_examples: this.getMaterialExamples(iso),
      operation,
      tool_type: toolType,
      cut_type: cutType,
      vc_sfm: { low: row.vc_sfm[0], recommended: row.vc_sfm[1], high: row.vc_sfm[2] },
      vc_mmin: {
        low: Math.round(row.vc_sfm[0] * 0.3048),
        recommended: Math.round(row.vc_sfm[1] * 0.3048),
        high: Math.round(row.vc_sfm[2] * 0.3048),
      },
      fz_ipt: {
        low: Math.round(row.fz_ipt[0] * diaFactor * 10000) / 10000,
        recommended: Math.round(row.fz_ipt[1] * diaFactor * 10000) / 10000,
        high: Math.round(row.fz_ipt[2] * diaFactor * 10000) / 10000,
      },
      ap_mm: { low: row.ap_mm[0], recommended: row.ap_mm[1], high: row.ap_mm[2] },
      ae_pct: { low: row.ae_pct[0], recommended: row.ae_pct[1], high: row.ae_pct[2] },
      notes: [...row.notes],
      coolant: row.coolant,
      coating_recommended: row.coatings,
      confidence: 0.85,
      source: "Tungaloy GC 2023-2024 + industry standard",
    };

    // Hardness adjustment
    if (query.hardness_hb && query.hardness_hb > 300 && iso === "P") {
      const factor = query.hardness_hb > 400 ? 0.6 : 0.8;
      rec.vc_sfm.low = Math.round(rec.vc_sfm.low * factor);
      rec.vc_sfm.recommended = Math.round(rec.vc_sfm.recommended * factor);
      rec.vc_sfm.high = Math.round(rec.vc_sfm.high * factor);
      rec.vc_mmin.low = Math.round(rec.vc_sfm.low * 0.3048);
      rec.vc_mmin.recommended = Math.round(rec.vc_sfm.recommended * 0.3048);
      rec.vc_mmin.high = Math.round(rec.vc_sfm.high * 0.3048);
      rec.notes.push(`Hardness adjustment: ${query.hardness_hb} HB → SFM reduced ${Math.round((1-factor)*100)}%`);
    }

    // Calculate RPM and feed if diameter given
    let rpm: number | undefined;
    let feedMmMin: number | undefined;
    if (query.tool_diameter_mm && query.tool_diameter_mm > 0) {
      const vcMmin = rec.vc_mmin.recommended;
      rpm = Math.round((vcMmin * 1000) / (Math.PI * query.tool_diameter_mm));
      const fzMm = rec.fz_ipt.recommended * 25.4; // convert IPT to mm/tooth
      const flutes = this.estimateFlutes(toolType, query.tool_diameter_mm);
      feedMmMin = Math.round(rpm * fzMm * flutes);
    }

    return {
      recommendations: [rec],
      rpm,
      feed_mmmin: feedMmMin,
      query_resolved: { iso_group: iso, operation, tool_type: toolType, cut_type: cutType },
    };
  }

  /**
   * Resolve material name to ISO group
   */
  resolveISOGroup(material: string, hardnessHb?: number): ISOGroup {
    const key = material.toLowerCase().replace(/[\s-]/g, "_").replace(/[^a-z0-9_]/g, "");
    if (MATERIAL_TO_ISO[key]) return MATERIAL_TO_ISO[key];

    // Fuzzy match
    for (const [matKey, iso] of Object.entries(MATERIAL_TO_ISO)) {
      if (key.includes(matKey) || matKey.includes(key)) return iso;
    }

    // Hardness-based fallback
    if (hardnessHb) {
      if (hardnessHb >= 450) return "H";
      if (hardnessHb >= 200) return "P";
    }

    return "P"; // default to steel
  }

  /**
   * List all supported ISO groups with material examples
   */
  listGroups(): { group: ISOGroup; name: string; examples: string[]; color: string }[] {
    return [
      { group: "P", name: "Steel", examples: ["Carbon steel", "Alloy steel", "Tool steel (<45HRC)"], color: "Blue" },
      { group: "M", name: "Stainless Steel", examples: ["304", "316", "17-4PH", "Duplex"], color: "Yellow" },
      { group: "K", name: "Cast Iron", examples: ["Gray iron", "Ductile iron", "CGI"], color: "Red" },
      { group: "N", name: "Non-ferrous", examples: ["Aluminum", "Copper", "Brass", "Plastic"], color: "Green" },
      { group: "S", name: "Superalloys & Titanium", examples: ["Ti-6Al-4V", "Inconel 718", "Hastelloy"], color: "Brown" },
      { group: "H", name: "Hardened Steel", examples: ["Tool steel >45HRC", "D2", "H13 hardened"], color: "Gray" },
    ];
  }

  /**
   * Get all available cutting data keys
   */
  listAvailableData(): string[] {
    return Object.keys(CUTTING_DATA);
  }

  /**
   * Get material examples for ISO group
   */
  private getMaterialExamples(iso: ISOGroup): string[] {
    const examples: Record<ISOGroup, string[]> = {
      P: ["AISI 1045", "AISI 4140", "AISI 4340", "AISI 8620"],
      M: ["304 SS", "316 SS", "17-4PH", "Duplex 2205"],
      K: ["Gray iron FC250", "Ductile FCD500", "CGI"],
      N: ["6061-T6", "7075-T6", "C360 Brass", "Delrin"],
      S: ["Ti-6Al-4V", "Inconel 718", "Hastelloy X", "Waspaloy"],
      H: ["D2 (60 HRC)", "H13 (48 HRC)", "S7 (55 HRC)", "CPM 10V"],
    };
    return examples[iso] ?? [];
  }

  /**
   * Estimate flute count from tool type and diameter
   */
  private estimateFlutes(toolType: ToolType, dia_mm: number): number {
    if (toolType === "drill" || toolType === "tap" || toolType === "reamer") return 2;
    if (toolType === "ball_nose") return 2;
    if (toolType === "face_mill" || toolType === "insert_mill") {
      return Math.max(4, Math.round(dia_mm / 15)); // ~1 insert per 15mm
    }
    // Endmill: 2F for <6mm, 3F for 6-12mm, 4F for >12mm (aluminum: always 2-3F)
    if (dia_mm < 6) return 2;
    if (dia_mm < 12) return 3;
    return 4;
  }
}

export const cuttingDataLookupEngine = new CuttingDataLookupEngine();
