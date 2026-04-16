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
 * Mastercam FA-S ACU (Accuracy Priority) 7-pass — Thin stock (0.50" / 12.7mm)
 * Source: Mastercam X8 Mitsubishi (FA-S).tech power table
 * Wire: .010 Brass, Material: STEEL, Method: Accuracy priority (ACU)
 * Ra progression: 50 → 38 → 36 → 34 → 12 → 9 → 7 μin
 */
const E952_ACU_7PASS_THIN: ECodeFamily = {
  id: "E952_acu_7pass_thin",
  description: "Mastercam ACU accuracy-priority 7-pass — 0.50\" steel, Ra 7 μin finish",
  axes: 2,
  num_passes: 7,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "E952",  feed_ipm: 0.040, feed_mm_min: 1.02, h_register: "H1", offset_inches: 0.00670, offset_mm: 0.1702, type: "rough" },
    { pass_number: 2, e_code: "E5601", feed_ipm: 0.160, feed_mm_min: 4.06, h_register: "H2", offset_inches: 0.00560, offset_mm: 0.1422, type: "skim" },
    { pass_number: 3, e_code: "E5602", feed_ipm: 0.200, feed_mm_min: 5.08, h_register: "H3", offset_inches: 0.00560, offset_mm: 0.1422, type: "skim" },
    { pass_number: 4, e_code: "E5603", feed_ipm: 0.180, feed_mm_min: 4.57, h_register: "H4", offset_inches: 0.00560, offset_mm: 0.1422, type: "skim" },
    { pass_number: 5, e_code: "E5604", feed_ipm: 0.170, feed_mm_min: 4.32, h_register: "H5", offset_inches: 0.00525, offset_mm: 0.1334, type: "skim" },
    { pass_number: 6, e_code: "E5605", feed_ipm: 0.200, feed_mm_min: 5.08, h_register: "H6", offset_inches: 0.00520, offset_mm: 0.1321, type: "skim" },
    { pass_number: 7, e_code: "E5606", feed_ipm: 0.180, feed_mm_min: 4.57, h_register: "H7", offset_inches: 0.00520, offset_mm: 0.1321, type: "skim" },
  ],
};

/**
 * Mastercam FA-S ACU (Accuracy Priority) 7-pass — Thick stock (1.00" / 25.4mm)
 * Source: Mastercam X8 Mitsubishi (FA-S).tech power table
 * Wire: .010 Brass, Material: STEEL, Method: Accuracy priority (ACU)
 * Ra progression: 60 → 46 → 42 → 38 → 12 → 9 → 7 μin
 */
const E56XX_ACU_7PASS_THICK: ECodeFamily = {
  id: "E56xx_acu_7pass_thick",
  description: "Mastercam ACU accuracy-priority 7-pass — 1.00\" steel, Ra 7 μin finish",
  axes: 2,
  num_passes: 7,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "E5611", feed_ipm: 0.120, feed_mm_min: 3.05, h_register: "H1", offset_inches: 0.00680, offset_mm: 0.1727, type: "rough" },
    { pass_number: 2, e_code: "E5612", feed_ipm: 0.180, feed_mm_min: 4.57, h_register: "H2", offset_inches: 0.00550, offset_mm: 0.1397, type: "skim" },
    { pass_number: 3, e_code: "E5613", feed_ipm: 0.160, feed_mm_min: 4.06, h_register: "H3", offset_inches: 0.00550, offset_mm: 0.1397, type: "skim" },
    { pass_number: 4, e_code: "E5614", feed_ipm: 0.150, feed_mm_min: 3.81, h_register: "H4", offset_inches: 0.00550, offset_mm: 0.1397, type: "skim" },
    { pass_number: 5, e_code: "E5615", feed_ipm: 0.180, feed_mm_min: 4.57, h_register: "H5", offset_inches: 0.00520, offset_mm: 0.1321, type: "skim" },
    { pass_number: 6, e_code: "E5616", feed_ipm: 0.160, feed_mm_min: 4.06, h_register: "H6", offset_inches: 0.00515, offset_mm: 0.1308, type: "skim" },
    { pass_number: 7, e_code: "E5617", feed_ipm: 0.140, feed_mm_min: 3.56, h_register: "H7", offset_inches: 0.00510, offset_mm: 0.1295, type: "skim" },
  ],
};

// ============================================================================
// MAKINO DUO43/DUO64 — E-CODE FAMILIES
// Source: Mastercam X8 "Makino DUO-Ver6-METRIC-V Guide.TECH"
//   Wire: 0.20mm BS (brass), Material: St (steel), Method: Both Away Precision
//   Units: Metric. Offsets are cumulative from spark gap (mm).
//   Feed values are 0.0 (Makino DUO uses adaptive servo — machine sets rate).
//   Ra values: midpoint of published range tags (µm).
// ============================================================================

/**
 * Makino DUO — steel, 0.20mm wire, 10mm thick, 5-pass Both Away Precision
 * Source: Mastercam X8 DUO-Ver6-METRIC.TECH, record=4 (thickness=10mm)
 * Ra progression: 18~20 → 12~14 → 6~8 → 3~3.5 → 2~2.5 µm
 */
const MAKINO_DUO_ST_020_10MM_5PASS: ECodeFamily = {
  id: "makino_duo_st_020_10mm_5pass",
  description: "Makino DUO43/DUO64 — steel, 0.20mm brass, 10mm thick, 5-pass Both Away Precision",
  axes: 2,
  num_passes: 5,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1036",  feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0049, offset_mm: 0.125, type: "rough" },
    { pass_number: 2, e_code: "E1535", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0041, offset_mm: 0.104, type: "skim" },
    { pass_number: 3, e_code: "E1536", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0042, offset_mm: 0.106, type: "skim" },
    { pass_number: 4, e_code: "E1537", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0041, offset_mm: 0.105, type: "skim" },
    { pass_number: 5, e_code: "E1538", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0042, offset_mm: 0.107, type: "skim" },
  ],
};

/**
 * Makino DUO — steel, 0.20mm wire, 25mm thick, 5-pass Both Away Precision
 * Source: Mastercam X8 DUO-Ver6-METRIC.TECH, record=7 (thickness=25mm)
 * Ra progression: 18~20 → 12~14 → 6~8 → 3~3.5 → 2~2.5 µm
 */
const MAKINO_DUO_ST_020_25MM_5PASS: ECodeFamily = {
  id: "makino_duo_st_020_25mm_5pass",
  description: "Makino DUO43/DUO64 — steel, 0.20mm brass, 25mm thick, 5-pass Both Away Precision",
  axes: 2,
  num_passes: 5,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1066",  feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0051, offset_mm: 0.130, type: "rough" },
    { pass_number: 2, e_code: "E1565", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0042, offset_mm: 0.106, type: "skim" },
    { pass_number: 3, e_code: "E1566", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0041, offset_mm: 0.104, type: "skim" },
    { pass_number: 4, e_code: "E1567", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0041, offset_mm: 0.105, type: "skim" },
    { pass_number: 5, e_code: "E1568", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0041, offset_mm: 0.105, type: "skim" },
  ],
};

/**
 * Makino DUO — tungsten carbide, 0.20mm wire, 10mm thick, 5-pass Both Away Precision
 * Source: Mastercam X8 DUO-Ver6-METRIC.TECH, record=2 (WC material, 10mm)
 * Ra progression: 9.5~10 → 8.5~9 → 5.5~6 → 2~2.5 → 1.5~2 µm
 * Note: WC E-codes use 5xxx series (different from St 1xxx series)
 */
const MAKINO_DUO_WC_020_10MM_5PASS: ECodeFamily = {
  id: "makino_duo_wc_020_10mm_5pass",
  description: "Makino DUO43/DUO64 — tungsten carbide, 0.20mm brass, 10mm thick, 5-pass Both Away Precision",
  axes: 2,
  num_passes: 5,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5036",  feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0052, offset_mm: 0.132, type: "rough" },
    { pass_number: 2, e_code: "E5535", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0042, offset_mm: 0.106, type: "skim" },
    { pass_number: 3, e_code: "E5536", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0042, offset_mm: 0.107, type: "skim" },
    { pass_number: 4, e_code: "E5537", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0044, offset_mm: 0.111, type: "skim" },
    { pass_number: 5, e_code: "E5538", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0042, offset_mm: 0.106, type: "skim" },
  ],
};

/**
 * Makino DUO — steel, 0.10mm wire (micro), 10mm thick, 5-pass Both Away Precision
 * Source: Mastercam X8 DUO-Ver6-METRIC.TECH, wire=0.1mm St, record=4 (10mm)
 * Ra progression: 12~13 → 9~10 → 9~9.5 → 3~3.5 → 2.5~3 µm
 * Use case: tight-radius intricate profiles, micro-dies
 */
const MAKINO_DUO_ST_010_10MM_5PASS: ECodeFamily = {
  id: "makino_duo_st_010_10mm_5pass",
  description: "Makino DUO43/DUO64 — steel, 0.10mm micro wire, 10mm thick, 5-pass Both Away Precision",
  axes: 2,
  num_passes: 5,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1036",  feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0027, offset_mm: 0.069, type: "rough" },
    { pass_number: 2, e_code: "E1535", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0023, offset_mm: 0.058, type: "skim" },
    { pass_number: 3, e_code: "E1536", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0021, offset_mm: 0.054, type: "skim" },
    { pass_number: 4, e_code: "E1537", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.055, type: "skim" },
    { pass_number: 5, e_code: "E1538", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0022, offset_mm: 0.055, type: "skim" },
  ],
};

/** All known E-code families for JM Die's Mitsubishi FA-10S */
export const JM_DIE_ECODE_FAMILIES: ECodeFamily[] = [
  E12XX_STANDARD_4PASS,
  E12XX_HEAVY_5PASS,
  E28XX_TAPER_5PASS,
  E952_ACU_7PASS_THIN,
  E56XX_ACU_7PASS_THICK,
];

/**
 * Makino DUO43/DUO64 E-code families — for shops running Makino DUO machines.
 * These are NOT used at JM Die (which has Mitsubishi FA-10S) but are included
 * for PRISM's multi-shop capability and quoting against Makino-equipped shops.
 */
export const MAKINO_DUO_ECODE_FAMILIES: ECodeFamily[] = [
  MAKINO_DUO_ST_020_10MM_5PASS,
  MAKINO_DUO_ST_020_25MM_5PASS,
  MAKINO_DUO_WC_020_10MM_5PASS,
  MAKINO_DUO_ST_010_10MM_5PASS,
];

// ============================================================================
// MAKINO SP43/SP64 — MGW-S CONTROL — E-PACK FAMILIES
// Source: Mastercam X8 "Makino (SP43,SP64).tech"
//   Machine: SP43 / SP64, Control: MGW-S
//   Wire: 0.004" BS (brass), Units: Inch
//   Feed values are 0.0 — SP43/SP64 uses adaptive servo (machine sets rate).
//   Ra values: µin (micro-inch) as specified in tech file.
//   Offsets: cumulative from nominal (inches), applied per pass register.
// ============================================================================

/**
 * Makino SP43/SP64 — copper (Cu), 0.004" wire, High Precision
 * Source: Mastercam X8 Makino (SP43,SP64).tech, Header #1
 * Wire: 0.004" BS, Material: Cu, Method: High Precision
 * Thickness range: 0.25" – 1.25" | Passes: 3 | Ra: 72 → 36 → 12 µin
 *
 * E-pack coding: 70XX (roughing) + 72XX skim passes.
 * The last digit of the roughing E-pack encodes the thickness tier (5=0.25",
 * 15=0.5", 25=0.75", 35=1.0", 45=1.25" per the MGW-S naming scheme).
 * Cu library is used when cutting copper electrodes or evaluating carbide insert
 * pockets with copper clamping fixtures — NOT for steel die cavities.
 */
const MAKINO_SP_CU_HP_3PASS_025: ECodeFamily = {
  id: "makino_sp_cu_hp_3pass_025in",
  description: "Makino SP43/SP64 MGW-S — copper, 0.004\" BS, 0.25\" thick, 3-pass High Precision, Ra 12 µin",
  axes: 2,
  num_passes: 3,
  materials: ["copper", "Cu", "brass"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "7025", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0031, offset_mm: 0.0787, type: "rough" },
    { pass_number: 2, e_code: "7221", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 3, e_code: "7222", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
  ],
};

const MAKINO_SP_CU_HP_3PASS_050: ECodeFamily = {
  id: "makino_sp_cu_hp_3pass_050in",
  description: "Makino SP43/SP64 MGW-S — copper, 0.004\" BS, 0.50\" thick, 3-pass High Precision, Ra 12 µin",
  axes: 2,
  num_passes: 3,
  materials: ["copper", "Cu", "brass"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "7035", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0032, offset_mm: 0.0813, type: "rough" },
    { pass_number: 2, e_code: "7231", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 3, e_code: "7232", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
  ],
};

const MAKINO_SP_CU_HP_3PASS_075: ECodeFamily = {
  id: "makino_sp_cu_hp_3pass_075in",
  description: "Makino SP43/SP64 MGW-S — copper, 0.004\" BS, 0.75\" thick, 3-pass High Precision, Ra 12 µin",
  axes: 2,
  num_passes: 3,
  materials: ["copper", "Cu", "brass"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "7045", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0034, offset_mm: 0.0864, type: "rough" },
    { pass_number: 2, e_code: "7241", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0025, offset_mm: 0.0635, type: "skim" },
    { pass_number: 3, e_code: "7242", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
  ],
};

const MAKINO_SP_CU_HP_3PASS_100: ECodeFamily = {
  id: "makino_sp_cu_hp_3pass_100in",
  description: "Makino SP43/SP64 MGW-S — copper, 0.004\" BS, 1.00\" thick, 3-pass High Precision, Ra 12 µin",
  axes: 2,
  num_passes: 3,
  materials: ["copper", "Cu", "brass"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "7055", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0034, offset_mm: 0.0864, type: "rough" },
    { pass_number: 2, e_code: "7251", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0026, offset_mm: 0.0660, type: "skim" },
    { pass_number: 3, e_code: "7252", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
  ],
};

const MAKINO_SP_CU_HP_3PASS_125: ECodeFamily = {
  id: "makino_sp_cu_hp_3pass_125in",
  description: "Makino SP43/SP64 MGW-S — copper, 0.004\" BS, 1.25\" thick, 3-pass High Precision, Ra 12 µin",
  axes: 2,
  num_passes: 3,
  materials: ["copper", "Cu", "brass"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "7065", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0034, offset_mm: 0.0864, type: "rough" },
    { pass_number: 2, e_code: "7261", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0026, offset_mm: 0.0660, type: "skim" },
    { pass_number: 3, e_code: "7262", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
  ],
};

/**
 * Makino SP43/SP64 — steel (St), 0.004" wire, Both Away method
 * Source: Mastercam X8 Makino (SP43,SP64).tech, Header #2
 * Wire: 0.004" BS, Material: St, Method: Both Away
 * Thickness range: 0.25" – 0.75" | Passes: 4 | Ra: 72 → 36 → 15 → 6 µin
 *
 * "Both Away" = roughing approaches from one side, each skim trims from alternating
 * directions, eliminating directional recast bias. Preferred over High Precision
 * when form accuracy matters more than absolute speed (die work, extrusion tooling).
 * E-pack series: 1026/1036/1046 rough + 14XX skim registers.
 */
const MAKINO_SP_ST_BA_4PASS_025: ECodeFamily = {
  id: "makino_sp_st_ba_4pass_025in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.25\" thick, 4-pass Both Away, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1026", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0025, offset_mm: 0.0635, type: "rough" },
    { pass_number: 2, e_code: "1421", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1422", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1423", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_ST_BA_4PASS_050: ECodeFamily = {
  id: "makino_sp_st_ba_4pass_050in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.50\" thick, 4-pass Both Away, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1036", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0026, offset_mm: 0.0660, type: "rough" },
    { pass_number: 2, e_code: "1431", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1432", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1433", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_ST_BA_4PASS_075: ECodeFamily = {
  id: "makino_sp_st_ba_4pass_075in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.75\" thick, 4-pass Both Away, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1046", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0029, offset_mm: 0.0737, type: "rough" },
    { pass_number: 2, e_code: "1441", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1442", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1443", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

/**
 * Makino SP43/SP64 — steel (St), 0.004" wire, High Precision method
 * Source: Mastercam X8 Makino (SP43,SP64).tech, Header #3
 * Wire: 0.004" BS, Material: St, Method: High Precision
 * Thickness range: 0.25" – 1.25" | Passes: 4–5 | Ra: 72 → 36 → 15 → (10 →) 6 µin
 *
 * This is the PRIMARY family for steel die and tooling work on SP43/SP64.
 * E-pack series: 102X/103X/104X/105X/106X rough + 12XX skim registers.
 * Thicker sections (1.0"–1.25") automatically add a 5th pass to achieve Ra 6 µin.
 * High Precision mode uses tighter spark gap control vs Both Away — preferred
 * when dimensional tolerance is critical (±0.0001" or better).
 */
const MAKINO_SP_ST_HP_4PASS_025: ECodeFamily = {
  id: "makino_sp_st_hp_4pass_025in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.25\" thick, 4-pass High Precision, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1025", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0027, offset_mm: 0.0686, type: "rough" },
    { pass_number: 2, e_code: "1221", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1222", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1223", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_ST_HP_4PASS_050: ECodeFamily = {
  id: "makino_sp_st_hp_4pass_050in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.50\" thick, 4-pass High Precision, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1035", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0028, offset_mm: 0.0711, type: "rough" },
    { pass_number: 2, e_code: "1231", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1232", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1233", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_ST_HP_4PASS_075: ECodeFamily = {
  id: "makino_sp_st_hp_4pass_075in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 0.75\" thick, 4-pass High Precision, Ra 6 µin",
  axes: 2,
  num_passes: 4,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1045", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0029, offset_mm: 0.0737, type: "rough" },
    { pass_number: 2, e_code: "1241", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "1242", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "1243", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

/** 5-pass for 1.00" thick — adds intermediate Ra 15 and Ra 10 passes */
const MAKINO_SP_ST_HP_5PASS_100: ECodeFamily = {
  id: "makino_sp_st_hp_5pass_100in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 1.00\" thick, 5-pass High Precision, Ra 6 µin",
  axes: 2,
  num_passes: 5,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1055", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0029, offset_mm: 0.0737, type: "rough" },
    { pass_number: 2, e_code: "1251", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0028, offset_mm: 0.0711, type: "skim" },
    { pass_number: 3, e_code: "1252", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 4, e_code: "1253", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 5, e_code: "1254", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
  ],
};

/** 5-pass for 1.25" thick — heaviest steel section in SP43/SP64 High Precision table */
const MAKINO_SP_ST_HP_5PASS_125: ECodeFamily = {
  id: "makino_sp_st_hp_5pass_125in",
  description: "Makino SP43/SP64 MGW-S — steel, 0.004\" BS, 1.25\" thick, 5-pass High Precision, Ra 6 µin",
  axes: 2,
  num_passes: 5,
  materials: ["steel", "D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "1065", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0030, offset_mm: 0.0762, type: "rough" },
    { pass_number: 2, e_code: "1261", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0029, offset_mm: 0.0737, type: "skim" },
    { pass_number: 3, e_code: "1262", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0025, offset_mm: 0.0635, type: "skim" },
    { pass_number: 4, e_code: "1263", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 5, e_code: "1264", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
  ],
};

/**
 * Makino SP43/SP64 — tungsten carbide (WC), 0.004" wire, High Precision method
 * Source: Mastercam X8 Makino (SP43,SP64).tech, Header #5
 * Wire: 0.004" BS, Material: WC, Method: High Precision
 * Thickness range: 0.25" – 1.25" | Passes: 4–5 | Ra: 51 → 36 → 10 → 4 µin
 *
 * WC series E-packs start with 5XXX (vs 1XXX for steel). Roughing Ra starts
 * at 51 µin (lower than steel's 72 µin) because carbide ablates more slowly —
 * less material removed per discharge allows tighter initial surface.
 * Final Ra of 4 µin (0.10 µm) is achievable on WC without additional polishing.
 * E-pack series: 502X/503X/504X/505X/506X rough + 52XX skim registers.
 */
const MAKINO_SP_WC_HP_4PASS_025: ECodeFamily = {
  id: "makino_sp_wc_hp_4pass_025in",
  description: "Makino SP43/SP64 MGW-S — WC carbide, 0.004\" BS, 0.25\" thick, 4-pass High Precision, Ra 4 µin",
  axes: 2,
  num_passes: 4,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5025", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0027, offset_mm: 0.0686, type: "rough" },
    { pass_number: 2, e_code: "5221", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "5222", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "5223", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_WC_HP_4PASS_050: ECodeFamily = {
  id: "makino_sp_wc_hp_4pass_050in",
  description: "Makino SP43/SP64 MGW-S — WC carbide, 0.004\" BS, 0.50\" thick, 4-pass High Precision, Ra 4 µin",
  axes: 2,
  num_passes: 4,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5035", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0028, offset_mm: 0.0711, type: "rough" },
    { pass_number: 2, e_code: "5231", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0027, offset_mm: 0.0686, type: "skim" },
    { pass_number: 3, e_code: "5232", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 4, e_code: "5233", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0022, offset_mm: 0.0559, type: "skim" },
  ],
};

const MAKINO_SP_WC_HP_4PASS_075: ECodeFamily = {
  id: "makino_sp_wc_hp_4pass_075in",
  description: "Makino SP43/SP64 MGW-S — WC carbide, 0.004\" BS, 0.75\" thick, 4-pass High Precision, Ra 4 µin",
  axes: 2,
  num_passes: 4,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5045", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0029, offset_mm: 0.0737, type: "rough" },
    { pass_number: 2, e_code: "5241", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0028, offset_mm: 0.0711, type: "skim" },
    { pass_number: 3, e_code: "5242", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 4, e_code: "5243", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
  ],
};

/** 5-pass for WC 1.00" thick — adds Ra 15 intermediate pass */
const MAKINO_SP_WC_HP_5PASS_100: ECodeFamily = {
  id: "makino_sp_wc_hp_5pass_100in",
  description: "Makino SP43/SP64 MGW-S — WC carbide, 0.004\" BS, 1.00\" thick, 5-pass High Precision, Ra 4 µin",
  axes: 2,
  num_passes: 5,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5055", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0029, offset_mm: 0.0737, type: "rough" },
    { pass_number: 2, e_code: "5251", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0028, offset_mm: 0.0711, type: "skim" },
    { pass_number: 3, e_code: "5252", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 4, e_code: "5253", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 5, e_code: "5254", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
  ],
};

/** 5-pass for WC 1.25" thick — heaviest carbide section */
const MAKINO_SP_WC_HP_5PASS_125: ECodeFamily = {
  id: "makino_sp_wc_hp_5pass_125in",
  description: "Makino SP43/SP64 MGW-S — WC carbide, 0.004\" BS, 1.25\" thick, 5-pass High Precision, Ra 4 µin",
  axes: 2,
  num_passes: 5,
  materials: ["tungsten carbide", "WC", "carbide", "WC-Co"],
  uses_h175_master: false,
  passes: [
    { pass_number: 1, e_code: "5065", feed_ipm: null, feed_mm_min: null, h_register: "H1", offset_inches: 0.0030, offset_mm: 0.0762, type: "rough" },
    { pass_number: 2, e_code: "5261", feed_ipm: null, feed_mm_min: null, h_register: "H2", offset_inches: 0.0028, offset_mm: 0.0711, type: "skim" },
    { pass_number: 3, e_code: "5262", feed_ipm: null, feed_mm_min: null, h_register: "H3", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
    { pass_number: 4, e_code: "5263", feed_ipm: null, feed_mm_min: null, h_register: "H4", offset_inches: 0.0023, offset_mm: 0.0584, type: "skim" },
    { pass_number: 5, e_code: "5264", feed_ipm: null, feed_mm_min: null, h_register: "H5", offset_inches: 0.0024, offset_mm: 0.0610, type: "skim" },
  ],
};

/**
 * All SP43/SP64 E-pack families, grouped by wire/material/method.
 *
 * Usage note: SP43/SP64 uses 0.004" wire (finer than Makino DUO's standard 0.20mm/0.008").
 * This enables tighter inside radii (min corner radius ~0.003") making it suitable
 * for intricate die profiles such as wire guide dies, extrusion nozzles, and
 * precision blanking punches in the 0.25"–1.25" thickness range.
 */

/** SP43/SP64 — Copper, High Precision, 3-pass (per-thickness families) */
export const MAKINO_SP_CU_HP_FAMILIES: ECodeFamily[] = [
  MAKINO_SP_CU_HP_3PASS_025,
  MAKINO_SP_CU_HP_3PASS_050,
  MAKINO_SP_CU_HP_3PASS_075,
  MAKINO_SP_CU_HP_3PASS_100,
  MAKINO_SP_CU_HP_3PASS_125,
];

/** SP43/SP64 — Steel, Both Away, 4-pass (per-thickness families) */
export const MAKINO_SP_ST_BA_FAMILIES: ECodeFamily[] = [
  MAKINO_SP_ST_BA_4PASS_025,
  MAKINO_SP_ST_BA_4PASS_050,
  MAKINO_SP_ST_BA_4PASS_075,
];

/** SP43/SP64 — Steel, High Precision, 4–5-pass (per-thickness families) */
export const MAKINO_SP_ST_HP_FAMILIES: ECodeFamily[] = [
  MAKINO_SP_ST_HP_4PASS_025,
  MAKINO_SP_ST_HP_4PASS_050,
  MAKINO_SP_ST_HP_4PASS_075,
  MAKINO_SP_ST_HP_5PASS_100,
  MAKINO_SP_ST_HP_5PASS_125,
];

/** SP43/SP64 — Tungsten Carbide, High Precision, 4–5-pass (per-thickness families) */
export const MAKINO_SP_WC_HP_FAMILIES: ECodeFamily[] = [
  MAKINO_SP_WC_HP_4PASS_025,
  MAKINO_SP_WC_HP_4PASS_050,
  MAKINO_SP_WC_HP_4PASS_075,
  MAKINO_SP_WC_HP_5PASS_100,
  MAKINO_SP_WC_HP_5PASS_125,
];

/** All SP43/SP64 E-pack families combined */
export const MAKINO_SPXX_ECODE_FAMILIES: ECodeFamily[] = [
  ...MAKINO_SP_CU_HP_FAMILIES,
  ...MAKINO_SP_ST_BA_FAMILIES,
  ...MAKINO_SP_ST_HP_FAMILIES,
  ...MAKINO_SP_WC_HP_FAMILIES,
];

/**
 * Select the best SP43/SP64 E-pack family for given job parameters.
 * Thickness is matched by finding the closest table entry >= actual thickness.
 *
 * @returns The matched family, or null if parameters are out of table range
 */
export function selectMakinoSPFamily(params: {
  material: string;
  method: "high_precision" | "both_away";
  thickness_inches: number;
}): ECodeFamily | null {
  const mat = params.material.toLowerCase().trim();
  const isWC = ["carbide", "wc", "tungsten carbide", "wc-co"].some(k => mat.includes(k));
  const isCu = ["copper", "cu", "brass"].some(k => mat.includes(k));
  const isHP = params.method === "high_precision";

  let candidatePool: ECodeFamily[];
  if (isWC) {
    candidatePool = isHP ? MAKINO_SP_WC_HP_FAMILIES : []; // No WC Both-Away in this table
  } else if (isCu) {
    candidatePool = MAKINO_SP_CU_HP_FAMILIES;             // Cu only available in High Precision
  } else {
    // Default: steel/tool-steel
    candidatePool = isHP ? MAKINO_SP_ST_HP_FAMILIES : MAKINO_SP_ST_BA_FAMILIES;
  }

  if (candidatePool.length === 0) return null;

  // Match by finding the family whose id contains the closest thickness tier
  // Thickness tiers: 025=0.25", 050=0.50", 075=0.75", 100=1.00", 125=1.25"
  const TIERS = [0.25, 0.50, 0.75, 1.00, 1.25];
  const t = params.thickness_inches;
  const tier = TIERS.find(t2 => t2 >= t) ?? TIERS[TIERS.length - 1];
  const tierStr = Math.round(tier * 100).toString().padStart(3, "0");
  const match = candidatePool.find(f => f.id.includes(`_${tierStr}in`));
  return match ?? candidatePool[candidatePool.length - 1];
}

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

  // Check if material matches any 2-axis family
  if (!matMatchesFamily(E12XX_STANDARD_4PASS) && !matMatchesFamily(E12XX_HEAVY_5PASS)) {
    return null; // material not in JM Die's tech tables — use generic E-codes
  }

  // Check if ultra-fine finish is required (Ra < 0.2 µm / 8 µin) — use ACU 7-pass
  const needsACU =
    (params.target_ra_um != null && params.target_ra_um < 0.2) ||
    (params.tolerance_mm != null && params.tolerance_mm < 0.003);

  if (needsACU) {
    // Select thin vs thick ACU based on thickness
    const isThick = (params.thickness_mm ?? 0) > 15; // 15mm ≈ 0.6"
    return isThick ? E56XX_ACU_7PASS_THICK : E952_ACU_7PASS_THIN;
  }

  // Check if heavy-duty is needed (tight tolerance or fine finish)
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
