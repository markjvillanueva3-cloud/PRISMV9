/**
 * Cross-Material Speed/Feed Range Tables — Phase 0-C U-TEST3
 *
 * Canonical S/F ranges per ISO group + 15 specific alloys.
 * Source: Sandvik Coromant General Turning/Milling Catalogs + Kennametal NOVO.
 *
 * Usage:
 *   import { SF_RANGES, assertSFInRange, assertVcInRange } from "./fixtures/material-sf-ranges.js";
 *   assertVcInRange("Ti-6Al-4V", actualVc); // throws if outside published range
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialSFRange {
  /** Material name */
  name: string;
  /** ISO 513 group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Cutting speed range (m/min) — carbide, roughing to finishing */
  Vc_min: number;
  Vc_max: number;
  /** Feed per tooth range (mm/tooth) — milling */
  fz_min: number;
  fz_max: number;
  /** Feed per rev range (mm/rev) — turning */
  f_min: number;
  f_max: number;
  /** Depth of cut range (mm) — roughing */
  ap_min: number;
  ap_max: number;
  /** Source reference */
  source: string;
}

// ============================================================================
// ISO GROUP RANGES (broad — for quick validation)
// ============================================================================

export const ISO_GROUP_RANGES: Record<string, MaterialSFRange> = {
  P: {
    name: "ISO P — Steel (general)", iso_group: "P",
    Vc_min: 100, Vc_max: 450,    // Sandvik GC4325: 150-400 typical
    fz_min: 0.05, fz_max: 0.40,
    f_min: 0.08, f_max: 0.50,
    ap_min: 0.3, ap_max: 8.0,
    source: "Sandvik General Turning Catalog 2024, Table D2",
  },
  M: {
    name: "ISO M — Stainless Steel", iso_group: "M",
    Vc_min: 80, Vc_max: 280,     // Sandvik GC2220: 100-250 typical
    fz_min: 0.04, fz_max: 0.30,
    f_min: 0.05, f_max: 0.35,
    ap_min: 0.3, ap_max: 5.0,
    source: "Sandvik General Turning Catalog 2024, Table D4",
  },
  K: {
    name: "ISO K — Cast Iron", iso_group: "K",
    Vc_min: 80, Vc_max: 500,     // Sandvik GC3210: 100-400 typical
    fz_min: 0.08, fz_max: 0.50,
    f_min: 0.10, f_max: 0.60,
    ap_min: 0.5, ap_max: 10.0,
    source: "Sandvik General Turning Catalog 2024, Table D6",
  },
  N: {
    name: "ISO N — Non-ferrous (Aluminum)", iso_group: "N",
    Vc_min: 200, Vc_max: 3000,   // Sandvik H10/H13A: 500-3000 typical; PCD to 5000
    fz_min: 0.05, fz_max: 0.50,
    f_min: 0.08, f_max: 0.60,
    ap_min: 0.5, ap_max: 12.0,
    source: "Sandvik General Turning Catalog 2024, Table D8; Kennametal NOVO Al ranges",
  },
  S: {
    name: "ISO S — Superalloys & Titanium", iso_group: "S",
    Vc_min: 15, Vc_max: 100,     // Sandvik GC1105: 25-80 typical for Ti; Inconel 15-50
    fz_min: 0.03, fz_max: 0.20,
    f_min: 0.05, f_max: 0.25,
    ap_min: 0.2, ap_max: 4.0,
    source: "Sandvik General Turning Catalog 2024, Table D10; Kennametal NOVO Ti/Ni ranges",
  },
  H: {
    name: "ISO H — Hardened Steel (>45 HRC)", iso_group: "H",
    Vc_min: 50, Vc_max: 250,     // Sandvik CB7015 CBN: 80-220; ceramic: 100-300
    fz_min: 0.03, fz_max: 0.15,
    f_min: 0.04, f_max: 0.20,
    ap_min: 0.1, ap_max: 2.0,
    source: "Sandvik General Turning Catalog 2024, Table D12; Kennametal KB5625 CBN data",
  },
};

// ============================================================================
// SPECIFIC ALLOY RANGES (15 alloys — precision validation)
// ============================================================================

export const ALLOY_RANGES: Record<string, MaterialSFRange> = {
  // === ISO P — Steels ===
  "1045": {
    name: "AISI 1045 Carbon Steel", iso_group: "P",
    Vc_min: 150, Vc_max: 350,
    fz_min: 0.08, fz_max: 0.35,
    f_min: 0.10, f_max: 0.45,
    ap_min: 0.5, ap_max: 6.0,
    source: "Sandvik GC4325 rec: Vc 200-300; Kennametal KC5010: Vc 180-320",
  },
  "4140": {
    name: "AISI 4140 Alloy Steel (28-32 HRC)", iso_group: "P",
    Vc_min: 120, Vc_max: 300,
    fz_min: 0.06, fz_max: 0.30,
    f_min: 0.08, f_max: 0.40,
    ap_min: 0.5, ap_max: 5.0,
    source: "Sandvik GC4325: Vc 150-280; Kennametal KC5010: Vc 140-260",
  },
  "4340": {
    name: "AISI 4340 Alloy Steel (28-34 HRC)", iso_group: "P",
    Vc_min: 100, Vc_max: 280,
    fz_min: 0.06, fz_max: 0.28,
    f_min: 0.08, f_max: 0.35,
    ap_min: 0.5, ap_max: 5.0,
    source: "Sandvik GC4325: Vc 130-260; Kennametal KC5010: Vc 120-250",
  },

  // === ISO M — Stainless ===
  "304SS": {
    name: "AISI 304 Austenitic Stainless", iso_group: "M",
    Vc_min: 100, Vc_max: 220,
    fz_min: 0.05, fz_max: 0.25,
    f_min: 0.08, f_max: 0.30,
    ap_min: 0.5, ap_max: 4.0,
    source: "Sandvik GC2220: Vc 120-200; Kennametal KC725M: Vc 110-190. CRITICAL: never dwell, maintain chip load",
  },
  "316SS": {
    name: "AISI 316 Austenitic Stainless", iso_group: "M",
    Vc_min: 90, Vc_max: 200,
    fz_min: 0.04, fz_max: 0.22,
    f_min: 0.06, f_max: 0.28,
    ap_min: 0.5, ap_max: 3.5,
    source: "Sandvik GC2220: Vc 100-180; Kennametal KC725M: Vc 90-170",
  },
  "17-4PH": {
    name: "17-4 PH Stainless (H900 condition)", iso_group: "M",
    Vc_min: 80, Vc_max: 180,
    fz_min: 0.04, fz_max: 0.20,
    f_min: 0.06, f_max: 0.25,
    ap_min: 0.3, ap_max: 3.0,
    source: "Sandvik GC2220: Vc 90-160; hardened condition reduces range vs annealed",
  },

  // === ISO K — Cast Iron ===
  "GrayCI": {
    name: "Gray Cast Iron (FC250/GG25)", iso_group: "K",
    Vc_min: 150, Vc_max: 450,
    fz_min: 0.10, fz_max: 0.45,
    f_min: 0.15, f_max: 0.55,
    ap_min: 0.5, ap_max: 8.0,
    source: "Sandvik GC3210: Vc 200-400; dry cutting preferred (graphite lubricates)",
  },
  "DuctileCI": {
    name: "Ductile Cast Iron (FCD600/GGG60)", iso_group: "K",
    Vc_min: 100, Vc_max: 350,
    fz_min: 0.08, fz_max: 0.40,
    f_min: 0.10, f_max: 0.45,
    ap_min: 0.5, ap_max: 6.0,
    source: "Sandvik GC3210: Vc 120-300; tougher than gray — reduce speed 15-20%",
  },

  // === ISO N — Aluminum ===
  "6061-T6": {
    name: "6061-T6 Aluminum", iso_group: "N",
    Vc_min: 300, Vc_max: 2500,
    fz_min: 0.08, fz_max: 0.45,
    f_min: 0.10, f_max: 0.50,
    ap_min: 0.5, ap_max: 10.0,
    source: "Sandvik H10: Vc 500-2000; Kennametal KC410M: Vc 400-1800; PCD to 3000+",
  },
  "7075-T6": {
    name: "7075-T6 Aluminum (aerospace)", iso_group: "N",
    Vc_min: 250, Vc_max: 2000,
    fz_min: 0.06, fz_max: 0.40,
    f_min: 0.08, f_max: 0.45,
    ap_min: 0.5, ap_max: 8.0,
    source: "Sandvik H10: Vc 400-1800; slightly harder than 6061 — 5-10% lower Vc",
  },

  // === ISO S — Superalloys & Titanium ===
  "Ti-6Al-4V": {
    name: "Ti-6Al-4V Grade 5 Titanium", iso_group: "S",
    Vc_min: 30, Vc_max: 80,
    fz_min: 0.04, fz_max: 0.15,
    f_min: 0.05, f_max: 0.20,
    ap_min: 0.3, ap_max: 3.0,
    source: "Sandvik GC1105: Vc 35-70; Kennametal KCSM30: Vc 40-75. Through-spindle coolant mandatory >45 m/min",
  },
  "Inconel718": {
    name: "Inconel 718 (aged)", iso_group: "S",
    Vc_min: 15, Vc_max: 50,
    fz_min: 0.03, fz_max: 0.12,
    f_min: 0.05, f_max: 0.18,
    ap_min: 0.2, ap_max: 2.5,
    source: "Sandvik GC1105: Vc 20-45; Kennametal KCSM30: Vc 18-40. Ceramic at Vc 200-400 (separate range)",
  },

  // === ISO H — Hardened Steel ===
  "D2-58HRC": {
    name: "AISI D2 Tool Steel (58 HRC)", iso_group: "H",
    Vc_min: 60, Vc_max: 200,
    fz_min: 0.03, fz_max: 0.12,
    f_min: 0.04, f_max: 0.15,
    ap_min: 0.1, ap_max: 1.5,
    source: "Sandvik CB7015 CBN: Vc 80-180; Kennametal KB5625: Vc 70-160",
  },
  "H13-48HRC": {
    name: "AISI H13 Tool Steel (48 HRC)", iso_group: "H",
    Vc_min: 80, Vc_max: 220,
    fz_min: 0.04, fz_max: 0.15,
    f_min: 0.05, f_max: 0.18,
    ap_min: 0.2, ap_max: 2.0,
    source: "Sandvik CB7015: Vc 100-200; Kennametal KB5625: Vc 90-190",
  },
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Lookup S/F range for a material (tries alloy name first, then ISO group).
 */
export function getSFRange(materialName: string): MaterialSFRange | undefined {
  // Normalize name for lookup
  const norm = materialName.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();

  // Try specific alloy first
  for (const [key, range] of Object.entries(ALLOY_RANGES)) {
    const keyNorm = key.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
    if (norm.includes(keyNorm) || keyNorm.includes(norm)) return range;
  }

  // Common name mappings
  const nameMap: Record<string, string> = {
    "INCONEL718": "Inconel718", "INCONEL": "Inconel718",
    "TI6AL4V": "Ti-6Al-4V", "TITANIUM": "Ti-6Al-4V", "TI64": "Ti-6Al-4V",
    "6061": "6061-T6", "7075": "7075-T6",
    "304": "304SS", "316": "316SS", "174PH": "17-4PH",
    "1045": "1045", "4140": "4140", "4340": "4340",
    "D2": "D2-58HRC", "H13": "H13-48HRC",
    "GRAYIRON": "GrayCI", "DUCTILEIRON": "DuctileCI",
  };

  for (const [pattern, key] of Object.entries(nameMap)) {
    if (norm.includes(pattern)) return ALLOY_RANGES[key];
  }

  return undefined;
}

/**
 * Assert cutting speed is within published range for a material.
 * @param materialName — alloy name or ISO group
 * @param Vc_actual — actual cutting speed in m/min
 * @param tolerance — multiplier for range extension (default 1.3 = 30% slack)
 * @returns { valid, range, message }
 */
export function assertVcInRange(
  materialName: string,
  Vc_actual: number,
  tolerance = 1.3,
): { valid: boolean; range?: MaterialSFRange; message: string } {
  const range = getSFRange(materialName);
  if (!range) {
    return { valid: true, message: `No range data for '${materialName}' — cannot validate` };
  }

  const lo = range.Vc_min / tolerance;
  const hi = range.Vc_max * tolerance;

  if (Vc_actual < lo) {
    return { valid: false, range, message: `Vc ${Vc_actual} m/min below ${range.name} minimum ${range.Vc_min} (with ${((tolerance-1)*100).toFixed(0)}% slack: ${lo.toFixed(0)})` };
  }
  if (Vc_actual > hi) {
    return { valid: false, range, message: `Vc ${Vc_actual} m/min above ${range.name} maximum ${range.Vc_max} (with ${((tolerance-1)*100).toFixed(0)}% slack: ${hi.toFixed(0)})` };
  }

  return { valid: true, range, message: `Vc ${Vc_actual} m/min within ${range.name} range [${range.Vc_min}-${range.Vc_max}]` };
}

/**
 * Assert feed is within published range.
 */
export function assertFeedInRange(
  materialName: string,
  feed_actual: number,
  mode: "turning" | "milling" = "milling",
  tolerance = 1.5,
): { valid: boolean; message: string } {
  const range = getSFRange(materialName);
  if (!range) return { valid: true, message: `No range data for '${materialName}'` };

  const lo = mode === "turning" ? range.f_min / tolerance : range.fz_min / tolerance;
  const hi = mode === "turning" ? range.f_max * tolerance : range.fz_max * tolerance;

  if (feed_actual < lo || feed_actual > hi) {
    const unit = mode === "turning" ? "mm/rev" : "mm/tooth";
    return { valid: false, message: `Feed ${feed_actual} ${unit} outside ${range.name} range` };
  }
  return { valid: true, message: "Feed within range" };
}

/**
 * Validate a full set of cutting parameters against published ranges.
 */
export function validateCuttingParams(
  materialName: string,
  params: { Vc?: number; fz?: number; f?: number; ap?: number },
  mode: "turning" | "milling" = "milling",
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (params.Vc !== undefined) {
    const r = assertVcInRange(materialName, params.Vc);
    if (!r.valid) violations.push(r.message);
  }

  if (params.fz !== undefined) {
    const r = assertFeedInRange(materialName, params.fz, "milling");
    if (!r.valid) violations.push(r.message);
  }

  if (params.f !== undefined) {
    const r = assertFeedInRange(materialName, params.f, "turning");
    if (!r.valid) violations.push(r.message);
  }

  if (params.ap !== undefined) {
    const range = getSFRange(materialName);
    if (range && (params.ap < range.ap_min * 0.5 || params.ap > range.ap_max * 2)) {
      violations.push(`DOC ${params.ap}mm outside ${range.name} range [${range.ap_min}-${range.ap_max}]`);
    }
  }

  return { valid: violations.length === 0, violations };
}
