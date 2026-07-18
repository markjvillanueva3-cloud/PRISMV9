/**
 * PRISM Canonical Physics Constants
 *
 * ALL physics calculations MUST import from this file.
 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
 *
 * Sources:
 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989), Sato et al. (1990)
 * - Wire: Manufacturer spec sheets (Bedra, Thermocompact, GF)
 */

// Registry-derived extended material data (pure data, zero imports -> no cycle).
// Flattened from MaterialRegistry (2,746 materials) by
// scripts/generate-sfc-extended-material-db.ts. Consumed by EXTENDED_MATERIAL_DB
// below; kc1.1/mc are derived here via buildMaterialPhysics, NOT stored there.
import { EXTENDED_RAW_MATERIAL_DB } from "./material-db-extended.generated.js";

// ============================================================================
// ISO MATERIAL GROUP TYPE
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ============================================================================
// KIENZLE CUTTING FORCE MODEL
// ============================================================================

/**
 * Kienzle specific cutting force formula:
 *   Fc = kc1.1 * ap * fz^(1-mc)
 *
 * where:
 *   kc1.1 = specific cutting force at h=1mm [N/mm²]
 *   mc = material exponent (typically 0.20-0.30)
 *   ap = depth of cut [mm]
 *   fz = feed per tooth [mm]
 */
export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },  // Carbon/alloy steel, cast steel
  M: { kc1_1: 2100, mc: 0.25 },  // Austenitic, duplex, precipitation hardening SS
  K: { kc1_1: 1100, mc: 0.28 },  // Gray iron, nodular iron, CGI
  N: { kc1_1: 700, mc: 0.22 },   // Aluminum, copper, brass
  S: { kc1_1: 2800, mc: 0.27 },  // Inconel, Ti-6Al-4V, Waspaloy
  H: { kc1_1: 3200, mc: 0.30 },  // HRC 45-65, hardened tool steel
} as const;

// ============================================================================
// TAYLOR TOOL LIFE MODEL
// ============================================================================

/**
 * Taylor tool life equation:
 *   T = (C / Vc)^(1/n)
 *
 * where:
 *   T = tool life [min]
 *   C = Taylor constant (speed for 1-min life) [m/min]
 *   Vc = cutting speed [m/min]
 *   n = Taylor exponent
 */
export const CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }> = {
  P: { C: 350, n: 0.25 },  // Steel (carbide)
  M: { C: 200, n: 0.20 },  // Stainless steel (carbide)
  K: { C: 250, n: 0.25 },  // Cast iron (carbide)
  N: { C: 600, n: 0.40 },  // Aluminum (carbide)
  S: { C: 150, n: 0.18 },  // Superalloys (carbide)
  H: { C: 120, n: 0.15 },  // Hardened steel (CBN/ceramic)
} as const;

export const TAYLOR_DEFAULTS = CANONICAL_TAYLOR;

// ============================================================================
// LINEAR THERMAL EXPANSION (workpiece thermal-growth compensation)
// ============================================================================

/**
 * Coefficient of linear thermal expansion alpha [1/degC], by ISO material group.
 * Drives workpiece thermal-growth compensation: a part machined hot is oversize by
 * dD = alpha * D * dT and shrinks to nominal as it cools, so the finish pass must cut to
 * (D - dD) at temperature. Canonical single source (ThermalExpansionEngine +
 * ThermalGrowthCompensationEngine inline their own tables and should migrate to this).
 * Source: ASM Handbook Vol.1 (typical near-room-temperature values). S is Ti-6Al-4V-biased
 * conservative-low (the group spans Ti ~8.6e-6 to Inconel ~13e-6 -- override per grade when known).
 */
export const CTE_LINEAR_BY_ISO: Record<ISOGroup, number> = {
  P: 11.7e-6,  // carbon/alloy steel
  M: 16.0e-6,  // austenitic stainless
  K: 10.5e-6,  // gray/nodular cast iron
  N: 23.1e-6,  // aluminum (non-ferrous, Al-dominant)
  S: 9.0e-6,   // superalloy / Ti (Ti-6Al-4V-biased, conservative-low)
  H: 11.0e-6,  // hardened tool steel
} as const;

/** Linear CTE [1/degC] for an ISO group; defaults to steel (P) for an unknown/empty group. */
export function getCTEByISO(iso: string | undefined): number {
  const key = (iso ?? "").toUpperCase() as ISOGroup;
  return CTE_LINEAR_BY_ISO[key] ?? CTE_LINEAR_BY_ISO.P;
}

/**
 * Taylor tool-life PARAMETER uncertainty (coefficient of variation, %), for FOSM / Monte-Carlo
 * propagation of tool-life scatter into a reported confidence band. The 1/n exponent in
 * T = (C/V)^(1/n) AMPLIFIES the Taylor-constant scatter, so low-n materials (hardened, superalloy)
 * correctly report WIDER life bands -- which is the real physics, not a defect. Consumed by
 * stochasticToolWearEngine.fosmTaylorLife() -> a report-only life band, never a point-estimate change.
 *
 * Source: ISO 3685:1993 single-point tool-life testing (round-robin life scatter ~15-35% CV);
 * Taylor (1907) constant-fit uncertainty; ASM Handbook Vol. 16 (Machining) life-data scatter.
 * Values are intentionally conservative parameter-fit CVs; the 1/n amplification yields a realistic
 * ~25-55% life-CV band across ISO groups (widest for low-n hardened/superalloy).
 */
export const CANONICAL_TAYLOR_LIFE_CV = {
  V_cv: 3,   // cutting-speed control (CNC closed-loop) -- tight
  n_cv: 5,   // Taylor exponent fit uncertainty
  C_cv: 8,   // Taylor constant fit + tool/material batch scatter (dominant, 1/n-amplified term)
} as const;

/**
 * Spindle DRIVE efficiency (eta_drive): the fraction of motor-shaft power that
 * reaches the cutting edge after belt/gear/bearing drivetrain losses. The cutting
 * power Pc = Fc*Vc/60000 is delivered AT THE TOOL, so the spindle motor must supply
 * P_motor = Pc / eta_drive. A cut is feasible only if P_motor <= the machine's rated
 * spindle (motor-output) power. Comparing the RAW cutting power Pc to the spindle
 * rating (omitting this division) is ~1/eta_drive too LENIENT and under-protects
 * against stall -- a cut at 95% cutting-power is actually drawing ~112% of spindle.
 *
 * Value 0.85: typical belt/geared VMC drivetrain. Matches HSMAdvisor's default
 * machine efficiency (0.85) and sits inside G-Wizard's 0.80-0.90 band. Direct-drive
 * spindles run higher (~0.92-0.95); 0.85 is the conservative shop default.
 * Source: HSMAdvisor machine-efficiency default; ASM Handbook Vol.16 (Machining)
 * spindle-drive loss; Smid, "CNC Programming Handbook," spindle power budgeting.
 */
export const SPINDLE_DRIVE_EFFICIENCY = 0.85;

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

/**
 * Canonical material database entry.
 *
 * Extends MaterialPhysics so every CANONICAL_MATERIAL_DB record IS a complete,
 * runtime-safe MaterialPhysics — the speed/feed, cost and post-processor
 * engines can consume DB entries directly without an undefined/NaN hazard.
 *
 * Legacy thermal field names (thermal_conductivity_W_mK, specific_heat_J_kgK)
 * are retained alongside the MaterialPhysics-canonical names (k_thermal,
 * cp_J_kgK) for the 30+ EDM/ceramics/grinding consumers that still read them.
 */
export interface MaterialEntry extends MaterialPhysics {
  name: string;
  iso_group: ISOGroup;
  density_kg_m3: number;
  /** Legacy alias of k_thermal — thermal conductivity [W/(m*K)]. */
  thermal_conductivity_W_mK: number;
  /** Legacy alias of cp_J_kgK — specific heat [J/(kg*K)]. */
  specific_heat_J_kgK: number;
  melting_point_C: number;
  hardness_HRC?: number;
  /** Taylor tool-life constant C [m/min]. Denormalised from CANONICAL_TAYLOR[iso_group]. */
  taylor_C: number;
  /** Taylor tool-life exponent n. Denormalised from CANONICAL_TAYLOR[iso_group]. */
  taylor_n: number;
  tensile_strength_MPa?: number;
}

/**
 * Raw material records — the hand-maintained source values. The exported
 * CANONICAL_MATERIAL_DB is built from this by buildMaterialPhysics() once the
 * per-ISO physics tables (CANONICAL_TURNING_SPEEDS etc.) are in scope; that
 * enrichment fills the MaterialPhysics cutting-physics fields (kc1_1, mc,
 * vc_base_*, machinability_factor, E_GPa, sigma_y_MPa, hardness_HB ...) so
 * every DB entry is a complete, runtime-safe MaterialPhysics.
 *
 * hardness_HB here is the per-material Brinell value when known; for the
 * HRC-rated tool steels / carbide it is omitted and derived from hardness_HRC.
 */
interface RawMaterialEntry {
  name: string;
  iso_group: ISOGroup;
  density_kg_m3: number;
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK: number;
  melting_point_C: number;
  taylor_C: number;
  taylor_n: number;
  hardness_HRC?: number;
  hardness_HB?: number;
  tensile_strength_MPa?: number;
}

const _RAW_MATERIAL_DB: Record<string, RawMaterialEntry> = {
  "1018": { name: "AISI 1018 Mild Steel", iso_group: "P", density_kg_m3: 7870, thermal_conductivity_W_mK: 51.9, specific_heat_J_kgK: 486, melting_point_C: 1510, tensile_strength_MPa: 440, hardness_HB: 126, taylor_C: 350, taylor_n: 0.25 },
  "1045": { name: "AISI 1045 Carbon Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 49.8, specific_heat_J_kgK: 486, melting_point_C: 1495, tensile_strength_MPa: 585, hardness_HB: 170, taylor_C: 350, taylor_n: 0.25 },
  "4140": { name: "AISI 4140 Alloy Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 42.7, specific_heat_J_kgK: 473, melting_point_C: 1425, tensile_strength_MPa: 655, hardness_HB: 197, taylor_C: 350, taylor_n: 0.25 },
  // AISI 4340 Ni-Cr-Mo alloy steel (annealed) -- a mainstream JM-Die grade that was
  // UNREACHABLE: real per-material coefficients live in AISI_CUTTING_COEFFICIENTS["4340"]
  // (kc1_1 2000 / mc 0.26, ~11% above the P-generic 1800) but no _RAW entry existed, so
  // calculate({material:"4340"}) hard-failed (no iso_group given) or silently under-predicted
  // force ~10% via iso_group_fallback -> Generic ISO P. kc1_1/mc resolve from
  // AISI_CUTTING_COEFFICIENTS["4340"] via the record key; taylor_C(310)/n(0.23) set here to
  // survive the CANONICAL_MATERIAL_DB raw taylor re-override (constants.ts:1508-1509).
  // Refs: ASM Handbook Vol.1 (Properties of Carbon & Alloy Steels); MatWeb AISI 4340 annealed.
  "4340": { name: "AISI 4340 Alloy Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 44.5, specific_heat_J_kgK: 475, melting_point_C: 1427, tensile_strength_MPa: 745, hardness_HB: 217, taylor_C: 310, taylor_n: 0.23 },
  "304": { name: "AISI 304 Stainless", iso_group: "M", density_kg_m3: 8000, thermal_conductivity_W_mK: 16.2, specific_heat_J_kgK: 500, melting_point_C: 1450, tensile_strength_MPa: 515, hardness_HB: 170, taylor_C: 200, taylor_n: 0.2 },
  "316": { name: "AISI 316 Stainless", iso_group: "M", density_kg_m3: 8000, thermal_conductivity_W_mK: 16.3, specific_heat_J_kgK: 500, melting_point_C: 1375, tensile_strength_MPa: 515, hardness_HB: 180, taylor_C: 200, taylor_n: 0.2 },
  // 17-4 PH (AISI 630 / UNS S17400) precipitation-hardening martensitic stainless -- distinct
  // from austenitic 304/316: harder (H900 ~363 HB / ~38 HRC), stronger (~1170 MPa), higher kc.
  // kc1.1(2200)/mc(0.26) resolve from AISI_CUTTING_COEFFICIENTS["17-4PH"] via the record key.
  // Refs: ASM Specialty Handbook (Stainless Steels); AK Steel 17-4 PH product data (H900).
  "17-4PH": { name: "17-4 PH (AISI 630) Stainless", iso_group: "M", density_kg_m3: 7780, thermal_conductivity_W_mK: 18.3, specific_heat_J_kgK: 460, melting_point_C: 1440, tensile_strength_MPa: 1170, hardness_HB: 363, taylor_C: 180, taylor_n: 0.19 },
  "6061": { name: "Aluminum 6061-T6", iso_group: "N", density_kg_m3: 2700, thermal_conductivity_W_mK: 167, specific_heat_J_kgK: 896, melting_point_C: 652, tensile_strength_MPa: 310, hardness_HB: 95, taylor_C: 600, taylor_n: 0.4 },
  "7075": { name: "Aluminum 7075-T6", iso_group: "N", density_kg_m3: 2810, thermal_conductivity_W_mK: 130, specific_heat_J_kgK: 960, melting_point_C: 635, tensile_strength_MPa: 572, hardness_HB: 150, taylor_C: 600, taylor_n: 0.4 },
  "Ti-6Al-4V": { name: "Titanium 6Al-4V", iso_group: "S", density_kg_m3: 4430, thermal_conductivity_W_mK: 6.7, specific_heat_J_kgK: 526, melting_point_C: 1660, tensile_strength_MPa: 900, hardness_HB: 334, taylor_C: 150, taylor_n: 0.18 },
  "Inconel 718": { name: "Inconel 718", iso_group: "S", density_kg_m3: 8190, thermal_conductivity_W_mK: 11.4, specific_heat_J_kgK: 435, melting_point_C: 1336, tensile_strength_MPa: 1240, hardness_HB: 331, taylor_C: 150, taylor_n: 0.18 },
  // Waspaloy (Ni-Cr-Co age-hardenable superalloy, ISO S) -- harder to cut than Inconel 718.
  // No AISI_CUTTING_COEFFICIENTS entry, so kc1_1/mc resolve to the canonical S default
  // (2800 / 0.27), consistent with how Inconel 718 resolves. Refs: ASM Specialty Handbook
  // (Heat-Resistant Materials); Special Metals Waspaloy datasheet (solution+aged, ~38 HRC).
  "Waspaloy": { name: "Waspaloy", iso_group: "S", density_kg_m3: 8190, thermal_conductivity_W_mK: 11.6, specific_heat_J_kgK: 520, melting_point_C: 1330, tensile_strength_MPa: 1280, hardness_HB: 363, taylor_C: 130, taylor_n: 0.17 },
  // Ti-5553 (Ti-5Al-5V-5Mo-3Cr near-beta titanium, ISO S) -- higher strength and lower
  // conductivity than Ti-6Al-4V; no AISI entry so S-default kc1_1 (2800 / 0.27). Refs: Boyer &
  // Briggs (2005) "The use of beta titanium alloys in the aerospace industry"; MatWeb Ti-5553 STA.
  "Ti-5553": { name: "Titanium Ti-5553 (Ti-5Al-5V-5Mo-3Cr)", iso_group: "S", density_kg_m3: 4650, thermal_conductivity_W_mK: 7.5, specific_heat_J_kgK: 500, melting_point_C: 1650, tensile_strength_MPa: 1250, hardness_HB: 350, taylor_C: 120, taylor_n: 0.16 },
  // Tool-steel / carbide hardness_HB from ASTM E140-12b conversion of the
  // hardness_HRC rating (D2 HRC62 ~ 688 HB, A2 HRC60 ~ 654 HB) and ASM Handbook
  // Vol.2 for cemented carbide (WC-Co ~ 1500 HB equivalent).
  "D2": { name: "AISI D2 Tool Steel", iso_group: "H", density_kg_m3: 7700, thermal_conductivity_W_mK: 20.5, specific_heat_J_kgK: 460, melting_point_C: 1420, hardness_HRC: 62, hardness_HB: 688, tensile_strength_MPa: 2200, taylor_C: 120, taylor_n: 0.15 },
  "A2": { name: "AISI A2 Tool Steel", iso_group: "H", density_kg_m3: 7860, thermal_conductivity_W_mK: 28.6, specific_heat_J_kgK: 460, melting_point_C: 1425, hardness_HRC: 60, hardness_HB: 654, tensile_strength_MPa: 2070, taylor_C: 120, taylor_n: 0.15 },
  "tungsten_carbide": { name: "Tungsten Carbide (WC-Co)", iso_group: "H", density_kg_m3: 15000, thermal_conductivity_W_mK: 84, specific_heat_J_kgK: 210, melting_point_C: 2870, hardness_HRC: 75, hardness_HB: 1500, tensile_strength_MPa: 3450, taylor_C: 120, taylor_n: 0.15 },
  "gray_iron": { name: "Gray Cast Iron", iso_group: "K", density_kg_m3: 7200, thermal_conductivity_W_mK: 46, specific_heat_J_kgK: 490, melting_point_C: 1200, tensile_strength_MPa: 250, hardness_HB: 200, taylor_C: 250, taylor_n: 0.25 },
  // Ductile/nodular iron (EN-GJS-500, HB~220) -- spheroidal graphite makes it tougher to cut than
  // gray iron, so its specific cutting force is ABOVE the K-group default. Without this canonical
  // entry, the engines' sync maps (ductile_iron -> "ductile_iron") fell through to the K-group 1100,
  // under-predicting force ~18% (unconservative). Source: Sandvik/Kienzle nodular-iron range 1250-1350 N/mm^2.
  "ductile_iron": { name: "Ductile (Nodular) Iron", iso_group: "K", density_kg_m3: 7100, thermal_conductivity_W_mK: 36, specific_heat_J_kgK: 460, melting_point_C: 1180, tensile_strength_MPa: 500, hardness_HB: 220, taylor_C: 300, taylor_n: 0.25 },
  // Cu/brass added 2026-05-17 (TSC-FIX/U-TSC-WIRE-EDM-TEST scrutiny arm-B blocker):
  // WireEDMSettingsEngine was substituting Al6061 for copper/brass workpieces — a
  // ~3x volumetric-energy error reaching generated WEDM G-code. Real thermophysical
  // values: ASM Metals Handbook Vol.2 + Touloukian Thermophysical Properties (1970).
  "C11000": { name: "C11000 ETP Copper", iso_group: "N", density_kg_m3: 8960, thermal_conductivity_W_mK: 391, specific_heat_J_kgK: 385, melting_point_C: 1085, tensile_strength_MPa: 220, hardness_HB: 87, taylor_C: 600, taylor_n: 0.4 },
  "C26000": { name: "C26000 Cartridge Brass (70/30)", iso_group: "N", density_kg_m3: 8530, thermal_conductivity_W_mK: 120, specific_heat_J_kgK: 375, melting_point_C: 930, tensile_strength_MPa: 350, hardness_HB: 75, taylor_C: 600, taylor_n: 0.4 },
};

// ============================================================================
// MATERIAL ALIASES
// ============================================================================

export const AISI_ALIAS: Record<string, string> = {
  "steel": "1045",
  "carbon_steel": "1045",
  "mild_steel": "1018",
  "alloy_steel": "4140",
  "stainless": "304",
  "stainless_steel": "304",
  "ss304": "304",
  "ss316": "316",
  "stainless_304": "304",
  "stainless_316": "316",
  "17-4": "17-4PH",
  "17-4 PH": "17-4PH",
  "630": "17-4PH",
  "S17400": "17-4PH",
  "stainless_17_4ph": "17-4PH",
  "aluminum": "6061",
  "aluminium": "6061",
  "al6061": "6061",
  "al7075": "7075",
  "aluminum_6061": "6061",
  "aluminum_7075": "7075",
  "titanium": "Ti-6Al-4V",
  "ti64": "Ti-6Al-4V",
  "titanium_gr5": "Ti-6Al-4V",
  "inconel": "Inconel 718",
  "inconel_718": "Inconel 718",
  "tool_steel": "D2",
  "hardened_steel": "D2",
  "carbide": "tungsten_carbide",
  "wc": "tungsten_carbide",
  "cast_iron": "gray_iron",
  "GG25": "gray_iron",
  "gg25": "gray_iron",
  "en-gjl-250": "gray_iron",
  "copper": "C11000",
  "cu": "C11000",
  "c11000": "C11000",
  "brass": "C26000",
  "c26000": "C26000",
} as const;

// ============================================================================
// EDM PHYSICS CONSTANTS
// ============================================================================

/**
 * Wire EDM and Sinker EDM physics constants.
 *
 * Sources:
 * - Klocke "Fertigungsverfahren Band 3: Abtragen, Generieren, Lasermaterialbearbeitung"
 * - DiBitonto et al. (1989) "Theoretical models of the electrical discharge machining process"
 * - Sato et al. (1990) "Study of EDM" JSME Int. Journal
 * - Ho & Newman (2003) "State of the art electrical discharge machining"
 * - Mitsubishi, Sodick, Makino, AgieCharmilles machine manuals
 */
export const EDM_PHYSICS = {
  // ──────────────────────────────────────────────────────────────────────────
  // SPARK EROSION MODEL (DiBitonto-Sato hybrid)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * DiBitonto thermal model parameters for crater formation.
   * Energy balance: E_spark = k * I^a * t_on^b (empirical fit)
   *
   * Source: DiBitonto et al. ASME J. Eng. Ind. 111(2), 1989
   */
  spark_erosion: {
    /** Dimensional constant for crater diameter [µm], Dc = C_d * I^0.43 * t_on^0.44 */
    C_d: 2.1,
    /** Current exponent for crater diameter */
    current_exp_d: 0.43,
    /** Pulse-on exponent for crater diameter */
    ton_exp_d: 0.44,

    /** Dimensional constant for crater depth [µm], Dp = C_p * I^0.38 * t_on^0.38 */
    C_p: 0.54,
    /** Current exponent for crater depth */
    current_exp_p: 0.38,
    /** Pulse-on exponent for crater depth */
    ton_exp_p: 0.38,

    /** MRR model: MRR = C_mrr * I^alpha * t_on^beta * (t_on/(t_on+t_off))^gamma */
    C_mrr: 0.0085, // mm³/min base constant
    mrr_current_exp: 1.2,
    mrr_ton_exp: 0.65,
    mrr_duty_exp: 0.8,

    /** Energy per spark [mJ] = I * V * t_on / 1000 (assumes average arc voltage) */
    typical_arc_voltage_V: 25,

    /** Material removal efficiency: fraction of crater volume actually removed */
    removal_efficiency: {
      steel: 0.65,
      stainless: 0.60,
      titanium: 0.55,
      inconel: 0.50,
      tungsten_carbide: 0.35,
      aluminum: 0.75,
      copper: 0.70,
    },

    source: "DiBitonto et al. ASME J. Eng. Ind. 111(2) 1989; Sato et al. JSME Int. J. 33(4) 1990",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // KUNIEDA VOLUMETRIC REMOVAL EFFICIENCY (eta)
  // ──────────────────────────────────────────────────────────────────────────
  // Fraction of spark energy that converts to material removal vs. heat/recast/debris.
  // Kunieda et al. CIRP Annals 54(2) 2005, Fig. 8 + Table 2.

  kunieda: {
    /** Mild + tool steel — most common WEDM workpiece */
    eta_steel: 0.30,
    /** Aluminum — highest energy-coupling efficiency */
    eta_aluminum: 0.45,
    /** Titanium — low thermal conductivity + high melting point */
    eta_titanium: 0.20,
    /** Inconel + nickel superalloys */
    eta_inconel: 0.18,
    /** Tungsten carbide — grain pull-out dominates over melting */
    eta_carbide: 0.12,
    source: "Kunieda et al. CIRP Annals 54(2) 2005, Fig. 8 + Table 2",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GAP VOLTAGE AND DISCHARGE PHYSICS
  // ──────────────────────────────────────────────────────────────────────────

  gap_voltage: {
    /** Open-circuit voltage by machine class [V] */
    open_circuit_V: {
      standard: 80,
      high_speed: 100,
      precision: 70,
    },
    /** Typical arc voltage during discharge [V] */
    arc_voltage_V: 25,
    /** Gap voltage at stable machining [V] */
    stable_gap_V: { min: 35, max: 55 },
    /** Servo target voltage [V] */
    servo_target_V: 45,
    /** Gap distance vs gap voltage coefficient [µm/V] */
    gap_per_volt_um: 0.4,
    /** Minimum stable gap [µm] */
    min_gap_um: 10,
    /** Maximum gap before arc extinction [µm] */
    max_gap_um: 80,
    source: "Mitsubishi MV-R series manual; Sodick LN2W manual",
  },

  /**
   * Debris concentration and short-circuit behavior
   */
  debris_short_circuit: {
    /** Coefficient k for SC ratio: SC_ratio = k * debris_mg_cm3 / (V_flush_m_s * gap_mm) */
    coefficient_k: 0.00012,
    /** Nominal gap distance [mm] */
    nominal_gap_mm: 0.025,
    /** SC ratio thresholds (dimensionless) — Cetin et al. 2003 */
    thresholds: {
      safe: 0.001,
      warning: 0.003,
      critical: 0.008,
    },
    /** PPM-scale debris concentration thresholds for operator-facing validation. */
    ppm_thresholds: {
      safe: 50,
      warning: 200,
      critical: 500,
    },
    source: "Klocke 'Fertigungsverfahren Band 3' §5.2.3; Cetin et al. 2003",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WIRE SAFETY LIMITS
  // ──────────────────────────────────────────────────────────────────────────

  wire_safety: {
    /** Maximum current density [A/mm²] by wire material */
    max_current_density_brass: 500,
    max_current_density_coated: 600,
    max_current_density_moly: 300,
    max_current_density_tungsten: 250,

    /** Maximum wire tension [N] by diameter */
    max_tension_0_20mm: 12,
    max_tension_0_25mm: 18,
    max_tension_0_30mm: 24,

    /** Wire break warning threshold: fraction of max current density */
    warning_threshold: 0.85,

    /**
     * Maximum duty cycle (t_on / (t_on + t_off)) for roughing mode.
     * Above this, thermal energy stacks faster than the dielectric can flush,
     * pushing the wire into the break envelope. Mitsubishi MV/MX series data.
     */
    max_duty_rough: 0.55,
    /** Roughing limit relaxes for skim passes (lower I_peak, lower thermal load) */
    max_duty_skim: 0.70,

    source: "Bedra wire catalog; Thermocompact technical guide; Mitsubishi MV/MX series operator manual",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TOENSHOFF SKIM-PASS ENERGY CASCADE (gamma)
  // ──────────────────────────────────────────────────────────────────────────
  // Per-skim energy reduction coefficient. Each skim pass reduces spark energy
  // by factor gamma, with material-specific values (harder/tougher materials
  // require steeper energy cascade to reach the same Ra target).
  // Source: Toenshoff & Hillmann-Apmann, "Diamonds for the EDM Process",
  // CIRP Annals 51(1) 2002; Schumacher 2004 review.

  toenshoff: {
    /** Energy-cascade factor per skim pass, by material key */
    gamma: {
      steel: 0.30,
      tool_steel: 0.28,
      hardened_steel: 0.25,
      stainless: 0.27,
      aluminum: 0.40,
      copper: 0.38,
      titanium: 0.22,
      inconel: 0.20,
      carbide: 0.18,
    },
    source: "Toenshoff & Hillmann-Apmann CIRP Annals 51(1) 2002",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CORNER PHYSICS
  // ──────────────────────────────────────────────────────────────────────────

  wire_corner: {
    /** Wire lag coefficient for direction changes */
    lag_coefficient: 0.15, // mm lag per mm/min feed at 90° corner
    /** Inside corner overcut factor */
    inside_overcut_factor: 1.08,
    /** Outside corner undercut factor */
    outside_undercut_factor: 0.95,
    source: "Ho & Newman 2003; Mitsubishi corner control white paper",
  },

  corner_lag: {
    /** Response time by tension level AND wire material [ms] */
    response_time_ms: {
      // Tension bands (legacy)
      low: 25,
      medium: 18,
      high: 12,
      // Wire-material keyed (Dekeyser & Snoeys 1989)
      brass: 2.5,
      brass_cuzn37: 2.5,
      brass_cuzn40: 2.4,
      coated: 2.3,
      coated_brass: 2.3,
      zinc_coated: 2.3,
      molybdenum: 1.5,
      moly: 1.5,
      tungsten: 1.2,
    } as Record<string, number>,
    /** Maximum acceptable lag [mm] for precision work */
    max_acceptable_lag_mm: 0.008,
    source: "Sodick corner control algorithm; Mitsubishi E-tables; Dekeyser & Snoeys 1989",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // KERF WIDTH PHYSICS
  // ──────────────────────────────────────────────────────────────────────────

  kerf_overcut: {
    /** Base overcut coefficient: overcut = C * I^a * t_on^b */
    base_coefficient: 2.5, // µm base
    current_exponent: 0.35,
    ton_exponent: 0.30,
    /** Minimum overcut (even at lowest power) [µm] */
    min_overcut_um: 8,
    /** Kerf width = wire_diameter + 2 * (spark_gap + overcut) */
    source: "Klocke §5.3; Rajurkar & Wang 1991",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // THIN WIRE DERATING
  // ──────────────────────────────────────────────────────────────────────────

  thin_wire_derate: {
    /** Reference diameter for derating curves [mm] */
    reference_diameter_mm: 0.25,
    /** Current derate: I_max = I_ref * (d/d_ref)^exp */
    current_exponent: 1.8,
    /** Pulse-on derate: t_on_max = t_on_ref * (d/d_ref)^exp */
    ton_exponent: 1.5,
    /** Speed derate factor for thin wire */
    speed_factor: {
      "0.10": 0.35,
      "0.15": 0.55,
      "0.20": 0.75,
      "0.25": 1.00,
      "0.30": 1.15,
    },
    source: "GF Machining Solutions thin wire guide",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WIRE JOULE HEATING
  // ──────────────────────────────────────────────────────────────────────────

  wire_joule_heating: {
    /** Electrical resistivity [Ω·mm²/m] */
    resistivity: {
      brass_cuzn37: 0.067,
      brass_cuzn40: 0.065,
      coated_brass: 0.070,
      molybdenum: 0.053,
      tungsten: 0.055,
    } as Record<string, number>,
    /** Specific heat [J/kg·K] */
    specific_heat: {
      brass_cuzn37: 377,
      brass_cuzn40: 380,
      coated_brass: 385,
      molybdenum: 251,
      tungsten: 134,
    } as Record<string, number>,
    /** Density [kg/m³] */
    density: {
      brass_cuzn37: 8400,
      brass_cuzn40: 8450,
      coated_brass: 8500,
      molybdenum: 10200,
      tungsten: 19300,
    } as Record<string, number>,
    /** Maximum allowable temperature rise [K] before softening */
    max_temp_rise_K: 150,
    source: "Wire manufacturer datasheets; CES EduPack",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SKIM PASS SURFACE FINISH CASCADE
  // ──────────────────────────────────────────────────────────────────────────

  skim_ra_cascade: {
    /** Ra reduction factor per skim pass (Ra_n+1 = Ra_n * rho) — material + transition keys */
    rho: {
      // Pass-transition keys (legacy)
      rough_to_semi: 0.50,
      semi_to_finish: 0.40,
      finish_to_precision: 0.35,
      // Material-keyed (Klocke 2013 §8.3)
      steel: 0.55,
      stainless: 0.58,
      titanium: 0.60,
      tungsten_carbide: 0.70,
      carbide: 0.70,
      aluminum: 0.45,
      inconel: 0.62,
      copper: 0.50,
      pcd: 0.65,
    } as Record<string, number>,
    /** Minimum achievable Ra by material [µm] */
    min_ra_um: {
      steel: 0.15,
      stainless: 0.18,
      titanium: 0.25,
      tungsten_carbide: 0.10,
      carbide: 0.10,
      aluminum: 0.20,
      inconel: 0.22,
      copper: 0.20,
    } as Record<string, number>,
    source: "Klocke Table 5.8; Mitsubishi finish data",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // KLOCKE Ra MODELS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Klocke surface roughness model:
   *   Ra = A * I^a * t_on^b
   *
   * Published values from "Fertigungsverfahren Band 3" Table 5.7
   */
  klocke: {
    ra_models: {
      steel:            { A: 0.52, a: 0.38, b: 0.45, min_ra_um: 0.15, k_ra: 0.52, alpha: 0.38, beta: 0.45, source: "Klocke" },
      stainless:        { A: 0.58, a: 0.40, b: 0.48, min_ra_um: 0.18, k_ra: 0.58, alpha: 0.40, beta: 0.48, source: "Klocke" },
      tool_steel:       { A: 0.48, a: 0.36, b: 0.42, min_ra_um: 0.12, k_ra: 0.48, alpha: 0.36, beta: 0.42, source: "Klocke" },
      titanium:         { A: 0.65, a: 0.42, b: 0.50, min_ra_um: 0.25, k_ra: 0.65, alpha: 0.42, beta: 0.50, source: "Klocke" },
      inconel:          { A: 0.62, a: 0.41, b: 0.48, min_ra_um: 0.22, k_ra: 0.62, alpha: 0.41, beta: 0.48, source: "Klocke" },
      tungsten_carbide: { A: 0.35, a: 0.30, b: 0.38, min_ra_um: 0.08, k_ra: 0.35, alpha: 0.30, beta: 0.38, source: "Klocke" },
      carbide:          { A: 0.35, a: 0.30, b: 0.38, min_ra_um: 0.08, k_ra: 0.35, alpha: 0.30, beta: 0.38, source: "alias for tungsten_carbide" },
      aluminum:         { A: 0.70, a: 0.45, b: 0.52, min_ra_um: 0.20, k_ra: 0.70, alpha: 0.45, beta: 0.52, source: "Klocke" },
      copper:           { A: 0.75, a: 0.48, b: 0.55, min_ra_um: 0.22, k_ra: 0.75, alpha: 0.48, beta: 0.55, source: "Klocke" },
    } as const,
    source: "Klocke 'Fertigungsverfahren Band 3' Table 5.7",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WIRE POWER DENSITY
  // ──────────────────────────────────────────────────────────────────────────

  wire_power_density: {
    /** Arc length factor: effective_arc_length = wire_diameter * factor */
    arc_length_factor: 0.8,
    /** Maximum power density [W/mm²] by wire type */
    max_power_density: {
      brass: 4500,
      brass_cuzn37: 4500,
      brass_cuzn40: 4600,
      coated: 5500,
      coated_brass: 5500,
      zinc_coated: 5500,
      moly: 7500,
      molybdenum: 7500,
      tungsten: 8000,
    } as Record<string, number>,
    /** Maximum safe peak current [A] by wire diameter × material (0.25 mm reference) */
    max_safe_current_A: {
      brass_cuzn37: 5,
      brass_cuzn40: 5,
      coated_brass: 6,
      zinc_coated: 6,
      molybdenum: 8,
      tungsten: 10,
    } as Record<string, number>,
    source: "Bedra application notes; GF power density guidelines",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SERVO VOLTAGE CONTROL
  // ──────────────────────────────────────────────────────────────────────────

  servo_voltage: {
    /** Open-circuit voltage by machine class [V] */
    open_circuit_V: {
      standard: 100,
      high_speed: 120,
      fine_finish: 60,
      precision: 60,
    } as Record<string, number>,
    /** Arc resistance [Ω] */
    arc_resistance_ohm: {
      typical: 2.5,
      low: 1.5,
      high: 4.0,
    } as Record<string, number>,
    /** Stable machining voltage range [V] */
    stable_range: { min: 35, max: 55 },
    source: "Sodick servo control manual; Mitsubishi SV500S",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COATED WIRE LIMITS
  // ──────────────────────────────────────────────────────────────────────────

  coated_wire_limits: {
    /** Maximum current density by coating type [A/mm²] */
    max_current_density: {
      uncoated_brass: 500,
      brass: 500,
      brass_cuzn37: 500,
      brass_cuzn40: 500,
      zinc_coated: 550,
      brass_core_zinc: 580,
      coated_brass: 580,
      diffusion_annealed: 600,
      gamma_phase: 650,
      gamma: 650,
      molybdenum: 800,
      tungsten: 900,
    } as Record<string, number>,
    /** Maximum duty cycle by coating type */
    max_duty_cycle: {
      uncoated_brass: 0.30,
      brass: 0.30,
      brass_cuzn37: 0.30,
      brass_cuzn40: 0.30,
      zinc_coated: 0.35,
      brass_core_zinc: 0.38,
      coated_brass: 0.38,
      diffusion_annealed: 0.42,
      gamma_phase: 0.45,
      gamma: 0.45,
      molybdenum: 0.35,
      tungsten: 0.35,
    } as Record<string, number>,
    source: "Thermocompact coated wire specifications",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SINKER EDM SPARK GAP (side gap / overcut per electrode material + operation)
  // ──────────────────────────────────────────────────────────────────────────
  // Total lateral spark gap (electrode side to workpiece wall, each side) [mm].
  // Gap scales with discharge energy: finish uses minimum energy -> tightest gap;
  // rough uses maximum energy -> widest gap. Values are conservative mid-range
  // figures for tool-steel workpieces at standard dielectric (EDM oil).
  //
  // Source: Jameson, "Electrical Discharge Machining", SME 2001, Ch. 4 Table 4-2
  //         (spark gap vs. electrode material x operation regime);
  //         Klocke "Fertigungsverfahren Band 3" 4th ed. §5.3.1 Table 5.4 (2015)
  //         (Uebergangsaufmass / side gap ranges for graphite/copper on steel).

  sinker_spark_gap: {
    /** Finish-pass lateral spark gap [mm] — lowest discharge energy */
    finish_mm: {
      /** EDM graphite electrode (most common sinker material) */
      graphite:        0.025,
      /** Electrolytic copper electrode */
      copper:          0.020,
      /** Copper-tungsten electrode (carbide / hard-steel applications) */
      copper_tungsten: 0.018,
    } as Record<string, number>,

    /** Semi-finish-pass lateral spark gap [mm] — intermediate discharge energy */
    semi_mm: {
      graphite:        0.060,
      copper:          0.050,
      copper_tungsten: 0.045,
    } as Record<string, number>,

    /** Roughing-pass lateral spark gap [mm] — maximum discharge energy */
    rough_mm: {
      graphite:        0.125,
      copper:          0.100,
      copper_tungsten: 0.090,
    } as Record<string, number>,

    source: "Jameson SME 2001 Ch.4 Table 4-2; Klocke §5.3.1 Table 5.4 (2015)",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SINKER EDM DUTY CYCLE (typical on-time fraction for sinker operations)
  // ──────────────────────────────────────────────────────────────────────────
  // duty_cycle = t_on / (t_on + t_off). Sinker EDM operates at lower duty
  // cycles than wire EDM because debris flushing is less effective in a cavity.
  // Typical production range: 0.20-0.45; conservative reference value: 0.30.
  //
  // Source: Jameson SME 2001 Ch. 3 §3.4 (pulse parameters and duty cycle
  //         recommended ranges for die-sinking); McGeough "Micromachining of
  //         Engineering Materials" Marcel Dekker 2002, §2.3 Table 2.1.

  /** Typical sinker-EDM duty cycle (t_on fraction), conservative reference value */
  sinker_duty_cycle: 0.30,

    // ──────────────────────────────────────────────────────────────────────────
  // FLUSH/DIELECTRIC DEFLECTION
  // ──────────────────────────────────────────────────────────────────────────

  flush_deflection: {
    /** Pressure conversion: 1 bar = 0.1 N/mm² */
    bar_to_N_per_mm2: 0.1,
    /** Typical flush pressure range [bar] */
    typical_pressure_bar: { min: 0.5, max: 8.0 },
    /** Wire deflection coefficient: delta = C * P * L² / T */
    deflection_coefficient: 0.012, // mm deflection per bar·mm²/N
    source: "Makino flushing guide; Sodick UH650L manual",
  },

} as const;

// ============================================================================
// KIENZLE ALIASES (compatibility)
// ============================================================================

export const KIENZLE_BY_ISO = CANONICAL_KIENZLE;

// ============================================================================
// COMPATIBILITY SHIMS - restored exports relied on by 60+ engines
// All formulas back onto canonical tables above. No inline physics constants.
// ============================================================================

/** Tool material classification used by deflection / wear / stiffness models. */
export type ToolMaterial = "carbide" | "cermet" | "ceramic" | "cbn" | "pcd" | "hss" | "diamond";

/**
 * Tool-substrate elastic modulus [MPa = N/mm^2]. Used by Euler-Bernoulli
 * cantilever-deflection models for boring bars, end mills, drills.
 * Source: Sandvik Tooling Handbook 2024; Kennametal materials data;
 * ASM Handbook Vol. 2 (Properties and Selection: Carbides) - moduli at 20 C.
 */
export const CANONICAL_TOOL_MODULUS: Record<ToolMaterial, number> = {
  carbide: 600000,
  cermet:  450000,
  ceramic: 380000,
  cbn:     680000,
  pcd:     800000,
  hss:     210000,
  diamond: 1050000,
};

export function getToolModulus(material: string): number {
  const key = material.toLowerCase() as ToolMaterial;
  return CANONICAL_TOOL_MODULUS[key] ?? CANONICAL_TOOL_MODULUS.carbide;
}

/**
 * Tool-material cutting-speed multiplier, relative to CARBIDE (= 1.0).
 *
 * The SFC base cutting speeds (CANONICAL_TURNING_SPEEDS / the SFC CUTTING_PARAMS
 * lookup) are CARBIDE-anchored. This factor scales the base Vc to the selected
 * cutting-tool material — the first-order effect a real speed/feed calc applies
 * (HSMAdvisor / FSWizard do the same): carbide vs HSS is ~3x regardless of
 * workpiece. The fine tool<->workpiece feasibility coupling (PCD only on
 * non-ferrous, CBN on hardened) is a tool-SELECTION concern, not the
 * speed-multiplier concern.
 *
 * Values: Machinery's Handbook 31st ed. (speed tables per tool material);
 * Sandvik Coromant + Kennametal turning/milling catalogs. Conservative within
 * each published range.
 *   hss 0.35  — HSS runs ~1/3 of carbide (the dominant, safety-relevant case:
 *               anchoring HSS to the carbide speed OVER-speeds it ~3x).
 *   cermet 1.15 — modest premium over carbide in steel finishing.
 *   ceramic/cbn/pcd/diamond 2.5 — high-speed regimes (published 2.5-4x; conservative).
 *
 * SAFETY: factor > 1 makes PRISM MORE aggressive than the carbide base (the
 * un-safe-leaning direction) — the downstream machine-RPM cap + S(x) safety gate
 * remain the backstop. factor < 1 (HSS) is strictly safer. Unknown material
 * falls back to carbide (1.0), never a wild value.
 */
export const CANONICAL_TOOL_MATERIAL_SPEED_FACTOR: Record<ToolMaterial, number> = {
  carbide: 1.0,
  cermet:  1.15,
  ceramic: 2.5,
  cbn:     2.5,
  pcd:     2.5,
  hss:     0.35,
  diamond: 2.5,
};

/** Conservative clamp band for the applied tool-material speed multiplier. */
export const TOOL_MATERIAL_SPEED_FACTOR_MIN = 0.3;
export const TOOL_MATERIAL_SPEED_FACTOR_MAX = 3.0;

/**
 * Resolve the tool-material cutting-speed multiplier, clamped to the safe band.
 * Unknown / unmapped / empty material → carbide (1.0), never a wild value.
 *
 * @param material tool material name (case-insensitive, e.g. "HSS", "carbide")
 * @returns multiplier in [TOOL_MATERIAL_SPEED_FACTOR_MIN, TOOL_MATERIAL_SPEED_FACTOR_MAX]
 */
export function getToolMaterialSpeedFactor(material: string | undefined | null): number {
  if (!material) return CANONICAL_TOOL_MATERIAL_SPEED_FACTOR.carbide;
  const key = String(material).toLowerCase() as ToolMaterial;
  const raw = CANONICAL_TOOL_MATERIAL_SPEED_FACTOR[key] ?? CANONICAL_TOOL_MATERIAL_SPEED_FACTOR.carbide;
  return Math.min(TOOL_MATERIAL_SPEED_FACTOR_MAX, Math.max(TOOL_MATERIAL_SPEED_FACTOR_MIN, raw));
}

/** Machine-rigidity levels for the cutting-speed backoff factor (OSCAR-SFC-9AXIS-MS0/U-OSC-RIGIDITY-VC). */
export type MachineRigidity = "low" | "medium" | "high";

/**
 * Machine-rigidity → cutting-speed backoff factor — OSCAR-SFC-9AXIS-MS0/U-OSC-RIGIDITY-VC.
 *
 * De-inlines the factor previously HARDCODED at UltimateSpeedFeedEngine.ts:2629
 * (`machine_rigidity === "low" ? 0.7 : "high" ? 1.1 : 1.0`) — an inline-physics-constant
 * violation. A low-rigidity setup (worn ways, long overhang, light/benchtop machine) backs
 * the speed off to stay under the chatter threshold; a rigid box-way machine tolerates a
 * modest premium. This is the OPERATIONAL Vc backoff (matches the rigidity slider in
 * G-Wizard / HSMAdvisor). The rigorous chatter-free DEPTH-of-cut effect (machine rigidity →
 * stability-lobe effective stiffness → critical_depth_mm) is a SEPARATE, physics-reviewer-
 * gated unit (U-OSC-RIGIDITY-DOC, TODO) — not double-counted here.
 *
 * Values PRESERVE the prior inline behavior (low 0.7 / medium 1.0 / high 1.1) — this is a
 * behaviour-preserving de-inline, not a tuning change. Conservative; low is strictly safer
 * (slower), and the downstream machine-RPM cap + S(x) safety gate remain the backstop.
 * Source: commercial speed-feed convention (rigidity backoff) + the engine's prior values.
 */
export const CANONICAL_MACHINE_RIGIDITY_VC_FACTOR: Record<MachineRigidity, number> = {
  low:    0.7,
  medium: 1.0,
  high:   1.1,
};

/**
 * Resolve the machine-rigidity cutting-speed factor. Unknown / unmapped / empty / null
 * rigidity → medium (1.0, neutral) — byte-identical to the prior inline `: 1.0` fallback.
 *
 * @param rigidity machine-rigidity level (case-insensitive: "low" | "medium" | "high")
 * @returns multiplier (0.7 / 1.0 / 1.1)
 */
export function getMachineRigidityVcFactor(rigidity: string | undefined | null): number {
  if (!rigidity) return CANONICAL_MACHINE_RIGIDITY_VC_FACTOR.medium;
  const key = String(rigidity).toLowerCase() as MachineRigidity;
  return CANONICAL_MACHINE_RIGIDITY_VC_FACTOR[key] ?? CANONICAL_MACHINE_RIGIDITY_VC_FACTOR.medium;
}

export const EPS_MACHINE = 2.220446049250313e-16;
export const EPS_EIGEN = 1e-10;
export const EPS_RANK = 1e-12;
export const EPS_SVD = 1e-12;

/**
 * Rich cutting-physics material descriptor consumed by the speed/feed,
 * cost, post-processor and turning engines.
 *
 * Field provenance:
 * - kc1_1 / mc            : CANONICAL_KIENZLE[iso_group] (Sandvik Coromant)
 * - taylor_C / taylor_n   : CANONICAL_TAYLOR[iso_group]  (ISO 3685:1993)
 * - vc_base_roughing/_finishing : CANONICAL_TURNING_SPEEDS[iso_group] (m/min,
 *                           carbide; Sandvik/Kennametal turning catalogs)
 * - machinability_factor  : MACHINABILITY_FACTOR_BY_ISO[iso_group]
 * - E_GPa                 : WORKPIECE_ELASTIC_MODULUS_GPA[iso_group]
 * - k_thermal             : thermal conductivity W/(m*K)
 * - cp_J_kgK              : specific heat J/(kg*K)
 * - sigma_y_MPa           : yield strength (Re); tensile * YIELD_TO_TENSILE_RATIO
 * - hardness_HB           : Brinell hardness
 * - melting_point_C       : solidus/melting temperature
 *
 * Required fields are non-optional because consumer engines read them in
 * bare arithmetic (e.g. `material.vc_base_roughing * 0.6`); leaving them
 * optional would let `number | undefined` propagate to NaN at runtime.
 * Use buildMaterialPhysics() to obtain a complete, runtime-safe instance.
 */
export interface MaterialPhysics {
  iso_group: ISOGroup;
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
  /** Base roughing cutting speed [m/min], carbide. */
  vc_base_roughing: number;
  /** Base finishing cutting speed [m/min], carbide. */
  vc_base_finishing: number;
  /** Relative machinability factor (1.0 = free-machining P-steel baseline). */
  machinability_factor: number;
  /** Thermal conductivity [W/(m*K)]. */
  k_thermal: number;
  /** Specific heat [J/(kg*K)]. */
  cp_J_kgK: number;
  /** Workpiece elastic modulus [GPa]. */
  E_GPa: number;
  /** Yield strength Re [MPa]. */
  sigma_y_MPa: number;
  /** Brinell hardness [HB]. */
  hardness_HB: number;
  /** Density [kg/m^3]. */
  density_kg_m3: number;
  /** Melting / solidus temperature [degC]. */
  melting_point_C: number;
  name: string;
  /** Alias of vc_base_roughing — typical cutting speed [m/min]. */
  Vc_typical: number;
  /** Alias of vc_base_finishing — upper-bound cutting speed [m/min]. */
  Vc_max: number;
  thermal_conductivity_W_mK?: number;
  specific_heat_J_kgK?: number;
  hardness_HRC?: number;
  tensile_strength_MPa?: number;
  yield_strength_MPa?: number;
  elastic_modulus_MPa?: number;
}

const _MATERIAL_KEYWORD_TO_ISO: Record<string, ISOGroup> = {
  steel: "P", carbon_steel: "P", alloy_steel: "P", mild_steel: "P",
  stainless: "M", stainless_steel: "M", ss: "M",
  cast_iron: "K", gray_iron: "K", nodular_iron: "K", cgi: "K",
  aluminum: "N", aluminium: "N", brass: "N", copper: "N", bronze: "N",
  titanium: "S", inconel: "S", waspaloy: "S", superalloy: "S", hastelloy: "S",
  tool_steel: "H", hardened: "H", carbide: "H", tungsten_carbide: "H",
};

/**
 * EXTENDED material lookup (registry-derived, 2,746 materials). `key` is the
 * already-lowercased material string; a whitespace-collapsed form is also tried
 * so "17-4  PH" and "17-4 ph" both hit. Returns undefined when no registry
 * material matches, so callers keep their existing canonical/keyword fallback.
 */
function _resolveExtended(key: string): MaterialEntry | undefined {
  return EXTENDED_MATERIAL_DB[key] ?? EXTENDED_MATERIAL_DB[key.trim().replace(/\s+/g, " ")];
}

function _resolveISO(material: string): ISOGroup {
  if (!material) return "P";
  const direct = CANONICAL_MATERIAL_DB[material];
  if (direct) return direct.iso_group;
  const lower = material.toLowerCase();
  const aliasKey = AISI_ALIAS[lower];
  if (aliasKey && CANONICAL_MATERIAL_DB[aliasKey]) return CANONICAL_MATERIAL_DB[aliasKey].iso_group;
  const lowerDirect = CANONICAL_MATERIAL_DB[lower];
  if (lowerDirect) return lowerDirect.iso_group;
  // EXTENDED registry layer (2,746 materials) BEFORE the keyword/default-P
  // fallback: this is the fix for the silent-wrong "unknown -> P" default
  // (e.g. Inconel 625 -> S not P, a 1800 -> 2800 kc1.1 correction). Canonical +
  // alias + keyword resolution above are unchanged.
  const ext = _resolveExtended(lower);
  if (ext) return ext.iso_group;
  return _MATERIAL_KEYWORD_TO_ISO[lower] ?? "P";
}

export function resolveMaterial(name: string): MaterialEntry | undefined {
  if (!name) return undefined;
  const direct = CANONICAL_MATERIAL_DB[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  const aliasKey = AISI_ALIAS[lower];
  if (aliasKey && CANONICAL_MATERIAL_DB[aliasKey]) return CANONICAL_MATERIAL_DB[aliasKey];
  const canonLower = CANONICAL_MATERIAL_DB[lower];
  if (canonLower) return canonLower;
  // EXTENDED registry layer: replaces the prior "undefined -> caller defaults to
  // ISO P" silent fallback with real per-material physics (e.g. Inconel 625 -> S).
  // Canonical + alias resolution above is byte-identical.
  return _resolveExtended(lower);
}

export function getKienzle(material: string): { kc1_1: number; mc: number } {
  return CANONICAL_KIENZLE[_resolveISO(material)];
}

export function getTaylor(material: string): { C: number; n: number } {
  return CANONICAL_TAYLOR[_resolveISO(material)];
}

/** Reference: Kienzle (1957). Fc = kc1_1 * ap * fz^(1-mc) */
export function kienzleForce(kc1_1: number, mc: number, ap: number, fz: number): number {
  return kc1_1 * ap * Math.pow(Math.max(fz, 1e-9), 1 - mc);
}

/** Reference: Taylor (1907); ISO 3685:1993. T = (C/Vc)^(1/n) */
export function taylorLife(C: number, n: number, Vc: number): number {
  if (Vc <= 0 || n <= 0) return 0;
  return Math.pow(C / Vc, 1 / n);
}

/** P[kW] = Fc[N] * Vc[m/min] / 60000 */
export function cuttingPower(Fc: number, Vc: number): number {
  return (Fc * Vc) / 60000;
}

/** T[N*m] = Fc[N] * D[mm] / 2000 */
export function spindleTorque(Fc: number, D: number): number {
  return (Fc * D) / 2000;
}

/** Brammertz: Ra[um] = fz^2 / (32*r) * 1000 */
export function predictedRa(fz: number, r: number): number {
  if (r <= 0) return 0;
  return ((fz * fz) / (32 * r)) * 1000;
}

/** ISO 3002-1: n = 1000 * Vc / (pi * D) */
export function rpmFromVc(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return (1000 * Vc) / (Math.PI * D);
}

/** MRR[mm^3/min] = ap * ae * Vf */
export function mrr(ap: number, ae: number, Vf: number): number {
  return ap * ae * Vf;
}

/** Euler-Bernoulli cantilever: delta = F*L^3 / (3*E*I), I = pi*D^4/64 */
export function toolDeflection(F: number, L: number, D: number, E: number = CANONICAL_TOOL_MODULUS.carbide): number {
  if (D <= 0 || E <= 0) return 0;
  const I = (Math.PI * Math.pow(D, 4)) / 64;
  return (F * Math.pow(L, 3)) / (3 * E * I);
}

/**
 * Tool-substrate Poisson's ratio (dimensionless). Used by the Timoshenko shear-
 * deflection term. Source: ASM Handbook Vol. 2 (carbides/ceramics moduli + ratios);
 * Sandvik Tooling Handbook 2024; Kennametal materials data (20 C).
 */
export const CANONICAL_TOOL_POISSON: Record<ToolMaterial, number> = {
  carbide: 0.22,
  cermet:  0.22,
  ceramic: 0.23,
  cbn:     0.13,
  pcd:     0.07,
  hss:     0.29,
  diamond: 0.07,
};

export function getToolPoisson(material: string): number {
  const key = material.toLowerCase() as ToolMaterial;
  return CANONICAL_TOOL_POISSON[key] ?? CANONICAL_TOOL_POISSON.carbide;
}

/**
 * Direct cutting-zone temperature-reduction factor by coolant delivery (multiplies the
 * coolant-agnostic Jaeger/Loewen-Shaw interface temperature). Captures the DIRECT heat
 * extraction the temperature field omits -- distinct from coolant's INDIRECT effect via Vc.
 * Cryogenic (LN2/CO2) removes ~20-40% of cutting-zone heat on Ti/Ni alloys; flood ~10-15%;
 * through-tool (high-pressure) more; MQL/mist intermediate; dry = 1.0 (baseline).
 * Source: Hong & Ding (2001), Int. J. Mach. Tools Manuf. (cryogenic); Shokrani et al. (2012);
 * Boothroyd & Knight, Fundamentals of Machining.
 */
export const CANONICAL_COOLANT_TEMP_FACTOR: Record<string, number> = {
  dry: 1.0,
  air_blast: 0.97,
  mist: 0.95,
  mql: 0.92,
  flood: 0.88,
  through_tool: 0.82,
  cryogenic: 0.65,
};

/** Coolant temperature-reduction multiplier; undefined/unknown coolant -> 1.0 (no direct reduction). */
export function getCoolantTempFactor(coolant?: string): number {
  if (!coolant) return 1.0;
  return CANONICAL_COOLANT_TEMP_FACTOR[coolant.toLowerCase()] ?? 1.0;
}

/**
 * Timoshenko cantilever tip deflection = bending + shear (mm):
 *   delta_bending = F*L^3 / (3*E*I),   I = pi*D^4/64        (Euler-Bernoulli)
 *   delta_shear   = F*L / (kappa*G*A), G = E/(2(1+nu)), A = pi*D^2/4
 *   kappa = 6(1+nu)/(7+6nu)            (Cowper shear coefficient, solid circle)
 * Closed form: delta_shear/delta_bending = ((7+6nu)/16)*(D/L)^2 -- negligible for
 * slender tools but ~+50% at L/D=1, which the bending-only Euler-Bernoulli model
 * under-predicts (stubby end mills / boring bars). Always >= toolDeflection().
 * Source: Timoshenko & Gere, Mechanics of Materials; Cowper (1966), J. Appl. Mech. 33.
 * @param F resultant force [N]
 * @param L overhang / stickout [mm]
 * @param D tool diameter [mm]
 * @param E elastic modulus [N/mm^2]
 * @param nu Poisson's ratio (default carbide 0.22)
 * @returns tip deflection [mm]
 */
export function toolDeflectionTimoshenko(
  F: number,
  L: number,
  D: number,
  E: number = CANONICAL_TOOL_MODULUS.carbide,
  nu: number = CANONICAL_TOOL_POISSON.carbide,
): number {
  if (D <= 0 || E <= 0) return 0;
  const safeNu = Number.isFinite(nu) && nu > -1 && nu < 0.5 ? nu : CANONICAL_TOOL_POISSON.carbide;
  const I = (Math.PI * Math.pow(D, 4)) / 64;
  const A = (Math.PI * D * D) / 4;
  const G = E / (2 * (1 + safeNu));
  const kappa = (6 * (1 + safeNu)) / (7 + 6 * safeNu);
  const bending = (F * Math.pow(L, 3)) / (3 * E * I);
  const shear = (F * L) / (kappa * G * A);
  return bending + shear;
}

// ============================================================================
// HEAT-TREATMENT REGIME -- canonical machining modifiers + expected hardness bands
// (U-SFC-HEATTREAT-REGIME, 2026-06-20). Single canonical home for the regime physics
// table: HeatTreatmentAwareSpeedFeedEngine (flat-modifier path) AND UltimateSpeedFeedEngine
// (regime -> expected-hardness -> hardnessSpeedFactor derate) both import from here, so the
// regime constants are NOT inlined in any engine (physics-reviewer R-2, 2026-06-20).
// Reference: Machinery's Handbook 31st ed sec 6 (heat-treat machining factors);
//   Sandvik Coromant Application Guide sec C-2 (hardened-material machining);
//   ASM Handbook Vol 16 sec 6; Kennametal Hard-Turn application guide.
// ============================================================================
export type HeatTreatRegime =
  | "annealed" | "normalized" | "quenched_tempered" | "through_hardened"
  | "precip_hardened" | "nitrided" | "case_hardened";

export interface HeatTreatRegimeSpec {
  /** Speed/feed multiplier vs the annealed (1.0) baseline. */
  modifier: number;
  /** Expected hardness band for the regime (drives estimation + cross-check). */
  expected: { min_hrc?: number; max_hrc?: number; min_hrb?: number; max_hrb?: number };
}

export const CANONICAL_HEAT_TREAT_REGIME: Record<HeatTreatRegime, HeatTreatRegimeSpec> = {
  annealed:          { modifier: 1.00, expected: { max_hrb: 90 } },
  normalized:        { modifier: 0.85, expected: { max_hrb: 100 } },
  quenched_tempered: { modifier: 0.55, expected: { min_hrc: 28, max_hrc: 45 } },
  through_hardened:  { modifier: 0.35, expected: { min_hrc: 50, max_hrc: 65 } },
  precip_hardened:   { modifier: 0.45, expected: { min_hrc: 38, max_hrc: 48 } },
  nitrided:          { modifier: 0.30, expected: { min_hrc: 55, max_hrc: 70 } },
  case_hardened:     { modifier: 0.40, expected: { min_hrc: 58, max_hrc: 64 } },
};

/**
 * Brinell hardness from Rockwell C. ASTM E140 steel approximation, clamped to the
 * validated span (HRC 20 -> 226 HB, HRC 68 -> 940 HB).
 * @param hrc Rockwell C hardness
 * @returns approximate Brinell hardness (HB)
 */
export function hrcToHb(hrc: number): number {
  if (hrc <= 20) return 226;
  if (hrc >= 68) return 940;
  return Math.round(3.18 * hrc * hrc * 0.01 + 6.23 * hrc + 96.7);
}

/**
 * Hardness-deviation exponent for the Kienzle specific cutting force.
 * Published kc1.1 values are referenced to the material's as-published (annealed/
 * typical) hardness; when the ACTUAL workpiece hardness deviates (heat treatment,
 * work hardening, soft-annealed stock) the specific force scales sub-linearly:
 *   kc_adjusted = kc1_1 * (HB_actual / HB_ref)^KC_HARDNESS_EXPONENT
 * 0.4 is the empirical sensitivity already field-proven in
 * SpeedFeedOrchestratorEngine.resolveMaterialInputs (kc hardness adjust) and
 * TransferLearningEngine (HB^0.4 tool-life scaling); consistent with Sandvik
 * hardness-addition guidance (kc grows slower than HB). Canonical home
 * (U-OSC-SFC-HARDNESS-KC-PARITY, 2026-07-01) so no engine inlines the exponent.
 *
 * KNOWN LIMITATION (physics-review P2, 2026-07-01): above ~HB 500 / HRC 50 the grade
 * should RE-CLASSIFY to ISO H (kc1_1=3200) rather than scale off its softer group
 * baseline -- HB^0.4 from a P base reaches only ~83% of the canonical H kc at 55 HRC.
 * Still strictly conservative-increasing vs the unadjusted kc; reclassification is a
 * queued follow-up unit.
 */
export const KC_HARDNESS_EXPONENT = 0.4;

/**
 * Kienzle kc1.1 hardness correction factor: (HB_actual / HB_ref)^0.4.
 * Fail-neutral guards: a non-finite or non-positive hardness on either side
 * returns 1.0 -- a missing/garbage hardness must never NaN or zero a force calc.
 * @param hbActual measured/user workpiece Brinell hardness
 * @param hbRef    the material record's reference Brinell hardness (the state its kc1.1 was published for)
 * @returns multiplicative kc correction (1.0 when hbActual == hbRef or inputs invalid)
 */
export function kcHardnessFactor(hbActual: number, hbRef: number): number {
  if (!Number.isFinite(hbActual) || !Number.isFinite(hbRef) || hbActual <= 0 || hbRef <= 0) return 1;
  return Math.pow(hbActual / hbRef, KC_HARDNESS_EXPONENT);
}

/**
 * Conservative (upper-bound) expected Brinell hardness for a heat-treat regime, used to
 * drive a SINGLE Vc derate when no measured hardness is supplied. Returns the HB equivalent
 * of the regime's MAX expected HRC -- a safety gate leans to the harder estimate. Returns
 * null for soft HRB-only regimes (annealed/normalized): there is no defensible HRB->HB
 * conversion in the soft range, so the caller falls back to the material's typical hardness
 * (no fabricated derate) (physics-reviewer R-3/R-5, 2026-06-20).
 * @param regime heat-treatment regime
 * @returns conservative expected HB, or null for HRB-only regimes
 */
export function regimeExpectedHardnessHb(regime: HeatTreatRegime): number | null {
  const spec = CANONICAL_HEAT_TREAT_REGIME[regime];
  if (!spec) return null;
  if (spec.expected.max_hrc !== undefined) return hrcToHb(spec.expected.max_hrc);
  return null;
}

/** Reference: ISO 3685:1993 Annex C; Kronenberg (1966). */
const _EXTENDED_TAYLOR_EXPONENTS: Record<ISOGroup, { a: number; b: number }> = {
  P: { a: 0.30, b: 0.20 },
  M: { a: 0.35, b: 0.22 },
  K: { a: 0.28, b: 0.18 },
  N: { a: 0.20, b: 0.15 },
  S: { a: 0.40, b: 0.25 },
  H: { a: 0.45, b: 0.28 },
};

export function extendedTaylorExponents(iso_group: ISOGroup): { a: number; b: number } {
  return _EXTENDED_TAYLOR_EXPONENTS[iso_group];
}

/** T = (C / (V * f^a * d^b))^(1/n) — ISO 3685 Annex C */
export function extendedTaylorLife(
  V: number, f: number, d: number,
  n: number, C: number, a: number, b: number,
): number {
  if (V <= 0 || n <= 0) return 0;
  const f_term = a > 0 ? Math.pow(Math.max(f, 1e-9), a) : 1;
  const d_term = b > 0 ? Math.pow(Math.max(d, 1e-9), b) : 1;
  const denom = V * f_term * d_term;
  if (denom <= 0) return 0;
  return Math.pow(C / denom, 1 / n);
}

/** Source: Sandvik Coromant General Turning Handbook (2024). */
// Workpiece elastic modulus by ISO group [GPa]. Textbook values (ASM Metals
// Handbook Vol.2): P/M/H steels ~210, K cast iron ~110, N Al/Cu ~70-120 (Al-
// dominant 70), S Ni-superalloy/Ti ~200/114 (Ni-dominant 205). Used by the
// pipeline material-context resolver for deflection/stiffness terms.
export const WORKPIECE_ELASTIC_MODULUS_GPA: Record<ISOGroup, number> = {
  P: 210, M: 200, K: 110, N: 70, S: 205, H: 215,
} as const;

// Yield-to-tensile ratio by ISO group (Re/Rm). Engineering-handbook typical:
// ductile carbon steel ~0.6, alloy/SS ~0.65, cast iron ~0.9 (brittle, low
// ductility), Al/Cu wrought ~0.85, Ni/Ti superalloy ~0.85, hardened ~0.9.
// Source: Shigley Mechanical Engineering Design, Table A-20 ranges.
export const YIELD_TO_TENSILE_RATIO: Record<ISOGroup, number> = {
  P: 0.60, M: 0.65, K: 0.90, N: 0.85, S: 0.85, H: 0.90,
} as const;

// Machinability factor by ISO group (1.0 = free-machining P-steel baseline).
// Inverse of relative cutting difficulty; aligns with CANONICAL_KIENZLE kc1_1
// ordering (higher kc1_1 -> lower machinability). Sandvik Coromant turning
// machinability index, normalised to ISO-P = 1.0.
export const MACHINABILITY_FACTOR_BY_ISO: Record<ISOGroup, number> = {
  P: 1.00, M: 0.55, K: 0.80, N: 2.50, S: 0.30, H: 0.25,
} as const;

export const CANONICAL_TURNING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 220, finish: 320 },
  M: { rough: 150, finish: 220 },
  K: { rough: 180, finish: 280 },
  N: { rough: 400, finish: 600 },
  S: { rough: 35,  finish: 70  },
  H: { rough: 80,  finish: 130 },
};

export const CANONICAL_TURNING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 0.30, finish: 0.12 },
  M: { rough: 0.25, finish: 0.10 },
  K: { rough: 0.35, finish: 0.15 },
  N: { rough: 0.30, finish: 0.12 },
  S: { rough: 0.18, finish: 0.08 },
  H: { rough: 0.15, finish: 0.06 },
};

export const CANONICAL_MILLING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 200, finish: 280 },
  M: { rough: 130, finish: 200 },
  K: { rough: 160, finish: 240 },
  N: { rough: 500, finish: 800 },
  S: { rough: 40,  finish: 70  },
  H: { rough: 60,  finish: 100 },
};

export const CANONICAL_MILLING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 0.15, finish: 0.08 },
  M: { rough: 0.12, finish: 0.06 },
  K: { rough: 0.18, finish: 0.10 },
  N: { rough: 0.20, finish: 0.10 },
  S: { rough: 0.08, finish: 0.04 },
  H: { rough: 0.06, finish: 0.03 },
};

export interface WhiteLayerThreshold {
  threshold_C: number;
  source: string;
}

/** Reference: Klocke 'Manufacturing Processes 2'; Boothroyd (1963). */
export const WHITE_LAYER_THRESHOLDS: Record<string, WhiteLayerThreshold> = {
  hardened_steel: { threshold_C: 700, source: "Klocke - austenitization onset" },
  steel:          { threshold_C: 850, source: "Klocke" },
  stainless:      { threshold_C: 650, source: "Klocke" },
  titanium:       { threshold_C: 750, source: "Boothroyd 1963; Ti alpha/beta transition" },
  nickel_alloy:   { threshold_C: 800, source: "Klocke - gamma' precipitation" },
  inconel:        { threshold_C: 800, source: "Klocke" },
};

export interface AISICuttingCoefficients {
  iso_group: ISOGroup;
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
}

/** Reference: Machinery's Handbook 32nd ed.; Kennametal Application Engineering Materials Cross-Reference (2023). */
export const AISI_CUTTING_COEFFICIENTS: Record<string, AISICuttingCoefficients> = {
  "1018":   { iso_group: "P", kc1_1: 1700, mc: 0.25, taylor_C: 360, taylor_n: 0.26 },
  "1045":   { iso_group: "P", kc1_1: 1800, mc: 0.25, taylor_C: 350, taylor_n: 0.25 },
  "1144":   { iso_group: "P", kc1_1: 1850, mc: 0.25, taylor_C: 345, taylor_n: 0.25 },
  "4140":   { iso_group: "P", kc1_1: 1950, mc: 0.26, taylor_C: 320, taylor_n: 0.24 },
  "4340":   { iso_group: "P", kc1_1: 2000, mc: 0.26, taylor_C: 310, taylor_n: 0.23 },
  "303":    { iso_group: "M", kc1_1: 2000, mc: 0.25, taylor_C: 220, taylor_n: 0.21 },
  "304":    { iso_group: "M", kc1_1: 2100, mc: 0.25, taylor_C: 200, taylor_n: 0.20 },
  "316":    { iso_group: "M", kc1_1: 2150, mc: 0.25, taylor_C: 190, taylor_n: 0.19 },
  "17-4PH": { iso_group: "M", kc1_1: 2200, mc: 0.26, taylor_C: 180, taylor_n: 0.19 },
  gray_iron:        { iso_group: "K", kc1_1: 1100, mc: 0.28, taylor_C: 250, taylor_n: 0.25 },
  ductile_iron:     { iso_group: "K", kc1_1: 1300, mc: 0.28, taylor_C: 300, taylor_n: 0.25 },  // nodular/SG iron -- specific kc above the K-group gray-iron default (spheroidal graphite -> tougher); Sandvik/Kienzle GJS-500 1250-1350 N/mm^2
  "6061":   { iso_group: "N", kc1_1: 700,  mc: 0.22, taylor_C: 600, taylor_n: 0.40 },
  "7075":   { iso_group: "N", kc1_1: 750,  mc: 0.22, taylor_C: 580, taylor_n: 0.38 },
  "Ti-6Al-4V":   { iso_group: "S", kc1_1: 2800, mc: 0.27, taylor_C: 150, taylor_n: 0.18 },
  "Inconel 718": { iso_group: "S", kc1_1: 3200, mc: 0.30, taylor_C: 120, taylor_n: 0.15 },
  "D2": { iso_group: "H", kc1_1: 3200, mc: 0.30, taylor_C: 120, taylor_n: 0.15 },
  "A2": { iso_group: "H", kc1_1: 3000, mc: 0.29, taylor_C: 130, taylor_n: 0.16 },
};

// ============================================================================
// MATERIAL PHYSICS BUILDER
// ============================================================================

/**
 * Build a complete, runtime-safe MaterialPhysics from a partial material
 * record. Every cutting-physics field is populated from the canonical per-ISO
 * tables (CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_TURNING_SPEEDS,
 * MACHINABILITY_FACTOR_BY_ISO, WORKPIECE_ELASTIC_MODULUS_GPA,
 * YIELD_TO_TENSILE_RATIO) — never left undefined, so consumer arithmetic
 * cannot produce NaN.
 *
 * Per-material kc1_1/mc from AISI_CUTTING_COEFFICIENTS take precedence over the
 * per-ISO CANONICAL_KIENZLE fallback when an entry exists. AISI_CUTTING_COEFFICIENTS
 * is keyed by SHORT material code ("4140", "Ti-6Al-4V"), NOT the descriptive
 * `name` ("AISI 4140 Alloy Steel") — so the override is resolved by `aisiKey`
 * first (CANONICAL_MATERIAL_DB passes its short-code record key), falling back to
 * a name-direct hit only for callers that pass a bare code as the name.
 *
 * @param partial  Source record (RawMaterialEntry / MaterialEntry / loose).
 * @param isoOverride  Force the ISO group (used by the generic-ISO fallback path).
 * @param aisiKey  Short AISI_CUTTING_COEFFICIENTS key ("4140", "316", "Ti-6Al-4V")
 *                 for the per-material kc1_1/mc override. The DB builder passes its
 *                 record key here; omit for loose external partials.
 */
export function buildMaterialPhysics(
  partial: Partial<MaterialEntry> & { iso_group?: ISOGroup; name?: string },
  isoOverride?: ISOGroup,
  aisiKey?: string,
): MaterialPhysics {
  const iso: ISOGroup = isoOverride ?? partial.iso_group ?? "P";
  const kienzle = CANONICAL_KIENZLE[iso];
  const taylor = CANONICAL_TAYLOR[iso];
  const turning = CANONICAL_TURNING_SPEEDS[iso];
  // AISI per-material override: prefer the explicit short-code key, then a
  // name-direct hit (caller passed a bare code as `name`). The prior single
  // `AISI_CUTTING_COEFFICIENTS[partial.name]` lookup was DEAD for every DB
  // material — the table is keyed "4140" but the names are "AISI 4140 Alloy
  // Steel" — so the documented per-material precedence above never fired and
  // every material silently used the per-ISO CANONICAL_KIENZLE default.
  const aisi =
    (aisiKey !== undefined ? AISI_CUTTING_COEFFICIENTS[aisiKey] : undefined) ??
    (partial.name !== undefined ? AISI_CUTTING_COEFFICIENTS[partial.name] : undefined);

  const kc1_1 = partial.kc1_1 ?? aisi?.kc1_1 ?? kienzle.kc1_1;
  const mc = partial.mc ?? aisi?.mc ?? kienzle.mc;
  const taylor_C = partial.taylor_C ?? aisi?.taylor_C ?? taylor.C;
  const taylor_n = partial.taylor_n ?? aisi?.taylor_n ?? taylor.n;

  const vc_base_roughing = partial.vc_base_roughing ?? partial.Vc_typical ?? turning.rough;
  const vc_base_finishing = partial.vc_base_finishing ?? partial.Vc_max ?? turning.finish;

  // Yield strength: explicit -> derived from tensile via ISO Re/Rm ratio.
  const tensile = partial.tensile_strength_MPa;
  const sigma_y_MPa =
    partial.sigma_y_MPa ??
    partial.yield_strength_MPa ??
    (tensile !== undefined ? Math.round(tensile * YIELD_TO_TENSILE_RATIO[iso]) : Math.round(kc1_1 * 0.25));

  // Brinell hardness: explicit -> estimated from yield strength. The
  // Re ~ 3.45*HB Tabor-class relation (Re in MPa) holds for steel-family
  // metals; reference: Tabor, "The Hardness of Metals" (1951). All
  // CANONICAL_MATERIAL_DB entries carry an explicit hardness_HB, so this
  // estimate only applies to loose external partials.
  const HB_FROM_YIELD = 3.45; // MPa per HB unit (Tabor steel-class relation)
  const hardness_HB =
    partial.hardness_HB ??
    Math.max(20, Math.round(sigma_y_MPa / HB_FROM_YIELD));

  const k_thermal = partial.k_thermal ?? partial.thermal_conductivity_W_mK ?? 30;
  const cp_J_kgK = partial.cp_J_kgK ?? partial.specific_heat_J_kgK ?? 480;
  const density_kg_m3 = partial.density_kg_m3 ?? 7850;
  const melting_point_C = partial.melting_point_C ?? 1450;
  const E_GPa = partial.E_GPa ?? (partial.elastic_modulus_MPa !== undefined ? partial.elastic_modulus_MPa / 1000 : WORKPIECE_ELASTIC_MODULUS_GPA[iso]);
  const machinability_factor = partial.machinability_factor ?? MACHINABILITY_FACTOR_BY_ISO[iso];

  return {
    name: partial.name ?? `Generic ISO ${iso}`,
    iso_group: iso,
    kc1_1, mc, taylor_C, taylor_n,
    vc_base_roughing, vc_base_finishing,
    Vc_typical: vc_base_roughing,
    Vc_max: vc_base_finishing,
    machinability_factor,
    k_thermal, cp_J_kgK, E_GPa,
    sigma_y_MPa, hardness_HB,
    density_kg_m3, melting_point_C,
    // Legacy aliases retained for the 30+ EDM/ceramics/grinding consumers.
    thermal_conductivity_W_mK: k_thermal,
    specific_heat_J_kgK: cp_J_kgK,
    tensile_strength_MPa: tensile,
    hardness_HRC: partial.hardness_HRC,
    yield_strength_MPa: sigma_y_MPa,
    elastic_modulus_MPa: E_GPa * 1000,
  };
}

/**
 * Canonical material database — each entry is a complete MaterialEntry
 * (== MaterialPhysics + legacy fields), built from _RAW_MATERIAL_DB by
 * enriching it with the per-ISO canonical physics tables.
 */
export const CANONICAL_MATERIAL_DB: Record<string, MaterialEntry> = Object.fromEntries(
  Object.entries(_RAW_MATERIAL_DB).map(([key, raw]) => {
    // Pass the record key as the AISI short-code so the per-material kc1_1/mc
    // override resolves (the key IS the AISI_CUTTING_COEFFICIENTS key).
    const phys = buildMaterialPhysics(raw, undefined, key);
    const entry: MaterialEntry = {
      ...phys,
      name: raw.name,
      iso_group: raw.iso_group,
      density_kg_m3: raw.density_kg_m3,
      thermal_conductivity_W_mK: raw.thermal_conductivity_W_mK,
      specific_heat_J_kgK: raw.specific_heat_J_kgK,
      melting_point_C: raw.melting_point_C,
      taylor_C: raw.taylor_C,
      taylor_n: raw.taylor_n,
      hardness_HRC: raw.hardness_HRC,
      tensile_strength_MPa: raw.tensile_strength_MPa,
    };
    return [key, entry];
  }),
);

// Descriptive-name aliases onto the canonical DB (NON-ENUMERABLE). Many consumers
// -- and the U-ARCH3 spec -- access materials by descriptive name
// (CANONICAL_MATERIAL_DB.steel, MATERIAL_DB.carbide) instead of the AISI short-code
// record key. Production fallbacks like `... || CANONICAL_MATERIAL_DB.steel`
// previously resolved to undefined because the DB is keyed "1045", not "steel".
// Defining each AISI_ALIAS name as a non-enumerable pointer to the SAME MaterialEntry
// makes direct/bracket access resolve, while Object.keys/entries/values still
// enumerate ONLY the 15 canonical materials (the length===15 + per-material
// iteration invariants are unchanged). Pure reference aliasing -- it introduces
// zero new physics values; every alias points at an existing canonical entry.
for (const [aliasName, targetKey] of Object.entries(AISI_ALIAS)) {
  // Never shadow a real material record key (own-property check, prototype-safe).
  if (Object.prototype.hasOwnProperty.call(CANONICAL_MATERIAL_DB, aliasName)) continue;
  const target = CANONICAL_MATERIAL_DB[targetKey];
  if (target === undefined) continue;
  Object.defineProperty(CANONICAL_MATERIAL_DB, aliasName, {
    value: target,
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/**
 * EXTENDED_MATERIAL_DB -- registry-derived material physics (2,746 materials),
 * built from the generated EXTENDED_RAW_MATERIAL_DB via the SAME
 * buildMaterialPhysics() pipeline as CANONICAL_MATERIAL_DB above, so kc1.1/mc
 * stay single-sourced (canonical per-ISO + AISI override) and are NEVER inlined.
 * Consulted by resolveMaterial / _resolveISO AFTER the curated 16-entry core,
 * replacing the prior silent "unknown material -> ISO P default" fallback with
 * real per-material physics. Regenerate: scripts/generate-sfc-extended-material-db.ts.
 */
export const EXTENDED_MATERIAL_DB: Record<string, MaterialEntry> = Object.fromEntries(
  Object.entries(EXTENDED_RAW_MATERIAL_DB).map(([key, raw]) => {
    const phys = buildMaterialPhysics(raw, raw.iso_group, raw.aisiKey);
    const entry: MaterialEntry = {
      ...phys,
      name: raw.name,
      iso_group: raw.iso_group,
      density_kg_m3: raw.density_kg_m3,
      thermal_conductivity_W_mK: raw.thermal_conductivity_W_mK,
      specific_heat_J_kgK: raw.specific_heat_J_kgK ?? phys.cp_J_kgK,
      melting_point_C: raw.melting_point_C ?? phys.melting_point_C,
      taylor_C: raw.taylor_C ?? phys.taylor_C,
      taylor_n: raw.taylor_n ?? phys.taylor_n,
      hardness_HRC: raw.hardness_HRC,
      tensile_strength_MPa: raw.tensile_strength_MPa,
    };
    return [key, entry];
  }),
);

export const MATERIAL_DB = CANONICAL_MATERIAL_DB;

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export default {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  TAYLOR_DEFAULTS,
  CANONICAL_MATERIAL_DB,
  AISI_ALIAS,
  EDM_PHYSICS,
  KIENZLE_BY_ISO,
};
