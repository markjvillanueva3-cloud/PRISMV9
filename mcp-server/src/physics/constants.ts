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
// MATERIAL DATABASE
// ============================================================================

export interface MaterialEntry {
  name: string;
  iso_group: ISOGroup;
  density_kg_m3: number;
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK: number;
  melting_point_C: number;
  hardness_HRC?: number;
  tensile_strength_MPa?: number;
}

export const CANONICAL_MATERIAL_DB: Record<string, MaterialEntry> = {
  "1018": { name: "AISI 1018 Mild Steel", iso_group: "P", density_kg_m3: 7870, thermal_conductivity_W_mK: 51.9, specific_heat_J_kgK: 486, melting_point_C: 1510, tensile_strength_MPa: 440 },
  "1045": { name: "AISI 1045 Carbon Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 49.8, specific_heat_J_kgK: 486, melting_point_C: 1495, tensile_strength_MPa: 585 },
  "4140": { name: "AISI 4140 Alloy Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 42.7, specific_heat_J_kgK: 473, melting_point_C: 1425, tensile_strength_MPa: 655 },
  "304": { name: "AISI 304 Stainless", iso_group: "M", density_kg_m3: 8000, thermal_conductivity_W_mK: 16.2, specific_heat_J_kgK: 500, melting_point_C: 1450, tensile_strength_MPa: 515 },
  "316": { name: "AISI 316 Stainless", iso_group: "M", density_kg_m3: 8000, thermal_conductivity_W_mK: 16.3, specific_heat_J_kgK: 500, melting_point_C: 1375, tensile_strength_MPa: 515 },
  "6061": { name: "Aluminum 6061-T6", iso_group: "N", density_kg_m3: 2700, thermal_conductivity_W_mK: 167, specific_heat_J_kgK: 896, melting_point_C: 652, tensile_strength_MPa: 310 },
  "7075": { name: "Aluminum 7075-T6", iso_group: "N", density_kg_m3: 2810, thermal_conductivity_W_mK: 130, specific_heat_J_kgK: 960, melting_point_C: 635, tensile_strength_MPa: 572 },
  "Ti-6Al-4V": { name: "Titanium 6Al-4V", iso_group: "S", density_kg_m3: 4430, thermal_conductivity_W_mK: 6.7, specific_heat_J_kgK: 526, melting_point_C: 1660, tensile_strength_MPa: 900 },
  "Inconel 718": { name: "Inconel 718", iso_group: "S", density_kg_m3: 8190, thermal_conductivity_W_mK: 11.4, specific_heat_J_kgK: 435, melting_point_C: 1336, tensile_strength_MPa: 1240 },
  "D2": { name: "AISI D2 Tool Steel", iso_group: "H", density_kg_m3: 7700, thermal_conductivity_W_mK: 20.5, specific_heat_J_kgK: 460, melting_point_C: 1420, hardness_HRC: 62 },
  "A2": { name: "AISI A2 Tool Steel", iso_group: "H", density_kg_m3: 7860, thermal_conductivity_W_mK: 28.6, specific_heat_J_kgK: 460, melting_point_C: 1425, hardness_HRC: 60 },
  "tungsten_carbide": { name: "Tungsten Carbide (WC-Co)", iso_group: "H", density_kg_m3: 15000, thermal_conductivity_W_mK: 84, specific_heat_J_kgK: 210, melting_point_C: 2870, hardness_HRC: 75 },
  "gray_iron": { name: "Gray Cast Iron", iso_group: "K", density_kg_m3: 7200, thermal_conductivity_W_mK: 46, specific_heat_J_kgK: 490, melting_point_C: 1200 },
} as const;

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
  "aluminum": "6061",
  "aluminium": "6061",
  "al6061": "6061",
  "al7075": "7075",
  "titanium": "Ti-6Al-4V",
  "ti64": "Ti-6Al-4V",
  "inconel": "Inconel 718",
  "tool_steel": "D2",
  "carbide": "tungsten_carbide",
  "wc": "tungsten_carbide",
  "cast_iron": "gray_iron",
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

    source: "Bedra wire catalog; Thermocompact technical guide",
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
      steel: { A: 0.52, a: 0.38, b: 0.45, min_ra_um: 0.15 },
      stainless: { A: 0.58, a: 0.40, b: 0.48, min_ra_um: 0.18 },
      tool_steel: { A: 0.48, a: 0.36, b: 0.42, min_ra_um: 0.12 },
      titanium: { A: 0.65, a: 0.42, b: 0.50, min_ra_um: 0.25 },
      inconel: { A: 0.62, a: 0.41, b: 0.48, min_ra_um: 0.22 },
      tungsten_carbide: { A: 0.35, a: 0.30, b: 0.38, min_ra_um: 0.08 },
      aluminum: { A: 0.70, a: 0.45, b: 0.52, min_ra_um: 0.20 },
      copper: { A: 0.75, a: 0.48, b: 0.55, min_ra_um: 0.22 },
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
