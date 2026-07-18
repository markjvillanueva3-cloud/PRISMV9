/**
 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
 *
 * Extracted from real production programs:
 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
 *   - NOZE TEST.NC (SS taper, 5-pass UV)
 *   - CHOCTAW DEFENSE 38 CAL CANNELURE (D2, 5-pass heavy)
 *   - FIOCCHI 38 CAL CANNELURE (D2, 5-pass heavy)
 *
 * Also validated against Mastercam X8 Mitsubishi FA-Series 4X Wire (TECH).pst
 * Source: data/posts/jm-die-wedm-technology.json
 * Source: data/posts/mastercam-wedm-verified.json
 *
 * These tables are the GROUND TRUTH for JM Die's machine. When generating
 * programs for the Mitsubishi FA-10S, use these E-codes and offsets instead
 * of generic computed values.
 *
 * @module data/jm-die-wedm-tech-tables
 */

import { findFASRecord } from "./mitsubishi-fa-s-extracted.js";

// ============================================================================
// E-CODE FAMILIES — Mitsubishi FA-10S at JM Die
// ============================================================================

export interface ECodeFamily {
  /** Family ID (e.g., "E12xx_standard") */
  id: string;
  /** Description */
  description: string;
  /** Number of axes (2 = XY straight, 4 = XY+UV taper) */
  axes: 2 | 4;
  /** Number of passes in this family */
  num_passes: number;
  /** Per-pass E-codes */
  passes: ECodePass[];
  /** Material applicability */
  materials: string[];
  /** H175 master offset used (style 1) */
  uses_h175_master: boolean;
}

export interface ECodePass {
  /** Pass number (1 = rough) */
  pass_number: number;
  /** E-code (e.g., "E1221") */
  e_code: string;
  /** Feed rate in inches/min (null = operator-entered) */
  feed_ipm: number | null;
  /** Feed rate in mm/min (converted from ipm) */
  feed_mm_min: number | null;
  /** H-register variable name */
  h_register: string;
  /** Wire offset in inches (from H-variable declarations) */
  offset_inches: number;
  /** Wire offset in mm */
  offset_mm: number;
  /** Pass type */
  type: "rough" | "skim";
}

/** Standard 2-axis, 4-pass family — ITW SHAKEPROOF pattern */
const E12XX_STANDARD_4PASS: ECodeFamily = {
  id: "E12xx_standard_4pass",
  description: "Standard 2-axis, 4-pass (rough + 3 skim) — ITW SHAKEPROOF pattern",
  axes: 2,
  num_passes: 4,
  materials: ["D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: true,
  passes: [
    { pass_number: 1, e_code: "E1221", feed_ipm: 0.12, feed_mm_min: 3.05, h_register: "H1", offset_inches: 0.0085, offset_mm: 0.2159, type: "rough" },
    { pass_number: 2, e_code: "E1222", feed_ipm: 0.24, feed_mm_min: 6.10, h_register: "H2", offset_inches: 0.0064, offset_mm: 0.1626, type: "skim" },
    { pass_number: 3, e_code: "E1223", feed_ipm: 0.21, feed_mm_min: 5.33, h_register: "H3", offset_inches: 0.0058, offset_mm: 0.1473, type: "skim" },
    { pass_number: 4, e_code: "E1224", feed_ipm: 0.20, feed_mm_min: 5.08, h_register: "H4", offset_inches: 0.0053, offset_mm: 0.1346, type: "skim" },
  ],
};

/** Heavy-duty 2-axis, 5-pass family — CANNELURE pattern */
const E12XX_HEAVY_5PASS: ECodeFamily = {
  id: "E12xx_heavy_5pass",
  description: "Heavy-duty 2-axis, 5-pass (rough + 4 skim) — cannelure/thick stock pattern",
  axes: 2,
  num_passes: 5,
  materials: ["D2", "A2", "S7", "M2", "H13"],
  uses_h175_master: true,
  passes: [
    { pass_number: 1, e_code: "E1281", feed_ipm: 0.06, feed_mm_min: 1.52, h_register: "H1", offset_inches: 0.00995, offset_mm: 0.2527, type: "rough" },
    { pass_number: 2, e_code: "E1282", feed_ipm: 0.15, feed_mm_min: 3.81, h_register: "H2", offset_inches: 0.00725, offset_mm: 0.1842, type: "skim" },
    { pass_number: 3, e_code: "E1283", feed_ipm: 0.12, feed_mm_min: 3.05, h_register: "H3", offset_inches: 0.00585, offset_mm: 0.1486, type: "skim" },
    { pass_number: 4, e_code: "E1284", feed_ipm: 0.16, feed_mm_min: 4.06, h_register: "H4", offset_inches: 0.00535, offset_mm: 0.1359, type: "skim" },
    { pass_number: 5, e_code: "E1285", feed_ipm: 0.13, feed_mm_min: 3.30, h_register: "H5", offset_inches: 0.0052,  offset_mm: 0.1321, type: "skim" },
  ],
};

/** 4-axis UV taper, 5-pass family — NOZE TEST pattern */
const E28XX_TAPER_5PASS: ECodeFamily = {
  id: "E28xx_taper_5pass",
  description: "4-axis UV taper, 5-pass — stainless/taper die pattern",
  axes: 4,
  num_passes: 5,
  materials: ["stainless", "304", "316", "D2", "A2", "S7", "M2", "H13"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "E2821", feed_ipm: 0.16, feed_mm_min: 4.06, h_register: "H1", offset_inches: 0, offset_mm: 0, type: "rough" },
    { pass_number: 2, e_code: "E2822", feed_ipm: 0.23, feed_mm_min: 5.84, h_register: "H2", offset_inches: 0, offset_mm: 0, type: "skim" },
    { pass_number: 3, e_code: "E2823", feed_ipm: 0.26, feed_mm_min: 6.60, h_register: "H3", offset_inches: 0, offset_mm: 0, type: "skim" },
    { pass_number: 4, e_code: "E2824", feed_ipm: 0.30, feed_mm_min: 7.62, h_register: "H4", offset_inches: 0, offset_mm: 0, type: "skim" },
    { pass_number: 5, e_code: "E2825", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0, offset_mm: 0, type: "skim" },
  ],
};

/**
 * ACU (Accuracy-priority) 7-pass families — built from the REAL Mastercam FA-S
 * tech-file extraction (`mitsubishi-fa-s-extracted.ts`), NOT hand-typed. Single
 * source of truth: the 12-record thickness table (0.50"–6.00"). We surface the
 * two canonical anchors the shop selects between — thin (0.50") and thick (1.00").
 *
 * Restores the 2 families that `wedm-acu-7pass.test.ts` + `WEDMProgramOptimizerEngine`
 * (`.find(f => f.id.includes("acu"))`) already reference but were missing from this
 * registry (regression: 3 of 5 families present).
 */
const IN_TO_MM = 25.4;

function buildAcuFamilyFromFAS(thicknessInch: number, id: string): ECodeFamily {
  const record = findFASRecord(thicknessInch);
  if (!record) {
    throw new Error(
      `buildAcuFamilyFromFAS: no Mitsubishi FA-S record for ${thicknessInch}" — extracted tech data missing`,
    );
  }
  // The deepest configuration carries the full per-pass list for an N-pass cut.
  const cfg = record.passes.find((p) => p.passNum === record.maxPasses) ?? record.passes[record.passes.length - 1];

  // Source-of-truth alignment — VERIFIED against the raw FA-S `.tech` XML (record 1, pass num="7",
  // `<approach>Y</approach>`): `offsets`/`registers` carry exactly ONE entry per real CUT pass,
  // while `epac`/`feed` carry a LEADING APPROACH code (e.g. 952 + feed 0.040 for the 0.50" thin
  // record). The N cut passes are therefore the TRAILING `nCuts` epac/feed entries,
  // register/offset-aligned (cut codes 5601..5607 ↔ registers 1..7 ↔ offsets[0..6]).
  // `952` is the lead-in approach condition, NOT a numbered cut pass — emitting it as pass 1 (and
  // dropping the finest skim E5607) was a real bug caught by adversarial review 2026-06-02.
  const nCuts = cfg.offsets.length;
  const approachCount = cfg.epac.length - nCuts;
  if (approachCount < 0 || cfg.registers.length !== nCuts || cfg.feed.length !== cfg.epac.length) {
    throw new Error(
      `buildAcuFamilyFromFAS(${thicknessInch}"): malformed FA-S record — epac=${cfg.epac.length} feed=${cfg.feed.length} offsets=${nCuts} registers=${cfg.registers.length}; cannot align cut passes`,
    );
  }
  const cutEpac = cfg.epac.slice(approachCount); // drop leading approach code(s)
  const cutFeed = cfg.feed.slice(approachCount); // drop the approach feed (epac-aligned)
  const approachECode = approachCount > 0 ? `E${cfg.epac[0]}` : null;

  const passes: ECodePass[] = [];
  for (let i = 0; i < nCuts; i++) {
    const feed_ipm = cutFeed[i] ?? null;
    const offset_inches = cfg.offsets[i];
    passes.push({
      pass_number: i + 1,
      e_code: `E${cutEpac[i]}`,
      feed_ipm,
      feed_mm_min: feed_ipm != null ? +(feed_ipm * IN_TO_MM).toFixed(2) : null,
      h_register: `H${cfg.registers[i]}`,
      offset_inches,
      offset_mm: +(offset_inches * IN_TO_MM).toFixed(4),
      type: i === 0 ? "rough" : "skim",
    });
  }
  return {
    id,
    description: `ACU ${nCuts}-pass accuracy-priority — ${thicknessInch.toFixed(2)}" (${+(thicknessInch * IN_TO_MM).toFixed(1)}mm) STEEL, Mitsubishi FA-S validated, final Ra ${cfg.ra} µin${approachECode ? ` (approach ${approachECode})` : ""}`,
    axes: 2,
    num_passes: nCuts,
    materials: ["D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
    uses_h175_master: false,
    passes,
  };
}

/** ACU 7-pass thin (0.50" steel) — E952 approach + E560x skim series */
const E952_ACU_7PASS_THIN: ECodeFamily = buildAcuFamilyFromFAS(0.5, "E952_acu_7pass_thin");

/** ACU 7-pass thick (1.00"+ steel) — E561x series */
const E56XX_ACU_7PASS_THICK: ECodeFamily = buildAcuFamilyFromFAS(1.0, "E56xx_acu_7pass_thick");

/** All known E-code families for JM Die's Mitsubishi FA-10S / FA-S */
export const JM_DIE_ECODE_FAMILIES: ECodeFamily[] = [
  E12XX_STANDARD_4PASS,
  E12XX_HEAVY_5PASS,
  E28XX_TAPER_5PASS,
  E952_ACU_7PASS_THIN,
  E56XX_ACU_7PASS_THICK,
];

// ============================================================================
// TECHNOLOGY TABLE LOOKUP
// ============================================================================

/**
 * Select the best E-code family for given job parameters.
 *
 * Decision logic (from JM Die shop practice):
 * - Taper > 0° → E28xx (4-axis UV)
 * - Tight tolerance (< 0.005mm) or target Ra < 0.5µm → E12xx heavy 5-pass
 * - Standard work → E12xx standard 4-pass
 *
 * @returns The matched family, or null if no shop-calibrated family exists
 */
export function selectECodeFamily(params: {
  material: string;
  taper_angle_deg?: number;
  tolerance_mm?: number;
  target_ra_um?: number;
  thickness_mm?: number;
}): ECodeFamily | null {
  const mat = params.material.toLowerCase().trim();
  const isTaper = (params.taper_angle_deg ?? 0) > 0;

  // Check if material is in any JM Die family's applicability list
  const matMatchesFamily = (family: ECodeFamily): boolean =>
    family.materials.some(m => mat.includes(m.toLowerCase()) || m.toLowerCase().includes(mat));

  if (isTaper) {
    // Only use E28xx if material is applicable
    if (matMatchesFamily(E28XX_TAPER_5PASS)) return E28XX_TAPER_5PASS;
    return null; // fall back to generic E-codes for non-matching materials
  }

  // ACU (accuracy-priority) 7-pass: ultra-fine finish (Ra < 0.2 µm ≈ 7.9 µin) or
  // ultra-tight tolerance (< 0.003 mm). Thin (≤15 mm ≈ 0.6") → E952 series; thick → E56xx.
  const acuRequired =
    (params.target_ra_um != null && params.target_ra_um < 0.2) ||
    (params.tolerance_mm != null && params.tolerance_mm < 0.003);
  if (acuRequired) {
    if (!matMatchesFamily(E952_ACU_7PASS_THIN)) return null; // material not FA-S-calibrated
    return (params.thickness_mm ?? 0) <= 15 ? E952_ACU_7PASS_THIN : E56XX_ACU_7PASS_THICK;
  }

  // Check if material matches any 2-axis family
  if (!matMatchesFamily(E12XX_STANDARD_4PASS) && !matMatchesFamily(E12XX_HEAVY_5PASS)) {
    return null; // material not in JM Die's tech tables — use generic E-codes
  }

  const needsHeavy =
    (params.tolerance_mm != null && params.tolerance_mm < 0.005) ||
    (params.target_ra_um != null && params.target_ra_um < 0.5) ||
    (params.thickness_mm != null && params.thickness_mm > 50);

  if (needsHeavy) {
    return E12XX_HEAVY_5PASS;
  }

  return E12XX_STANDARD_4PASS;
}

/**
 * Get the E-code for a specific pass number from a family.
 *
 * @param family The E-code family
 * @param passNumber 1-based pass number
 * @returns E-code string (e.g., "E1221") or generic fallback
 */
export function getECodeForPass(family: ECodeFamily, passNumber: number): string {
  const pass = family.passes.find(p => p.pass_number === passNumber);
  return pass?.e_code ?? `E${family.passes[0].e_code.charAt(1)}${family.passes[0].e_code.charAt(2)}0${passNumber}`;
}

/**
 * Get the shop-calibrated feed rate for a specific pass.
 * Returns null if not available (operator must enter at machine).
 */
export function getShopFeedForPass(family: ECodeFamily, passNumber: number): number | null {
  const pass = family.passes.find(p => p.pass_number === passNumber);
  return pass?.feed_mm_min ?? null;
}

/**
 * Get the shop-calibrated H-offset for a specific pass.
 * Returns 0 if not available (UV taper programs typically have zero offsets).
 */
export function getShopOffsetForPass(family: ECodeFamily, passNumber: number): number {
  const pass = family.passes.find(p => p.pass_number === passNumber);
  return pass?.offset_mm ?? 0;
}

// ============================================================================
// M-CODE SEQUENCE — JM Die Mitsubishi FA-10S
// ============================================================================

/** Standard M-code sequence observed across all 4 JM Die programs */
export const JM_DIE_MCODE_SEQUENCE = {
  /** Start-of-cut sequence (before each cutout) */
  start_sequence: ["M91", "M20", "M78", "M80", "M82", "M84", "M90"] as const,
  /** End-of-cut sequence */
  end_sequence: ["M85", "M83", "M81", "M21", "M58"] as const,
  /** Glue stop between cutouts */
  glue_stop: "M01" as const,
  /** Program end */
  program_end: "M02" as const,
  /** Tank fill is ALWAYS double M78 M78 */
  double_tank_fill: true,
  /** Adaptive control: M90 on for rough, M91 off for skims */
  adaptive_rough_only: true,
};

/** H175 master offset (used with style 1 H-register format) */
export const H175_MASTER_OFFSET = 0.0000; // Set by operator at machine
