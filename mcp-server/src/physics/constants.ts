/**
 * PRISM Canonical Physics Constants — Single Source of Truth
 *
 * ALL engines MUST import from here instead of maintaining inline copies.
 * Values validated against Sandvik Coromant, Kennametal, and ISO 3685 references.
 *
 * QS-MS0: Created 2026-03-15
 */

// ── ISO Material Groups ──

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface MaterialPhysics {
  name: string;
  iso_group: ISOGroup;
  /** Kienzle specific cutting force at h=1mm [N/mm²] */
  kc1_1: number;
  /** Kienzle exponent (dimensionless, typically 0.14–0.40) */
  mc: number;
  /** Taylor tool life constant C [m/min] — Vc at T=1min */
  taylor_C: number;
  /** Taylor exponent n (dimensionless, typically 0.1–0.4) */
  taylor_n: number;
  /** Thermal conductivity [W/(m·K)] */
  k_thermal: number;
  /** Yield strength [MPa] */
  sigma_y_MPa: number;
  /** Density [kg/m³] */
  density_kg_m3: number;
  /** Brinell hardness */
  hardness_HB: number;
  /** Base cutting speed for roughing [m/min] — carbide, flood coolant */
  vc_base_roughing: number;
  /** Base cutting speed for finishing [m/min] */
  vc_base_finishing: number;
  /** Machinability factor (1.0 = reference steel) */
  machinability_factor: number;
  /** Specific heat capacity [J/(kg·K)] */
  cp_J_kgK: number;
  /** Elastic modulus [GPa] */
  E_GPa: number;

  // ── EDM Physics (optional — added for WEDM-100PCT-MS0) ──

  /** Melting point [°C] — required for EDM MRR calculation (Kunieda 2005) */
  melting_point_C?: number;
  /** Latent heat of melting [J/kg] — required for EDM MRR (Kunieda 2005) */
  latent_heat_J_kg?: number;
  /** Electrical resistivity [µΩ·cm] — required for EDM conductivity check */
  resistivity_uOhm_cm?: number;
  /** Thermal diffusivity [mm²/s] — computed: k/(ρ·cp)×1e6. Used for recast depth (Carslaw & Jaeger) */
  thermal_diffusivity_mm2s?: number;

  // ── Graphite Electrode Physics (optional — added for ELEC-PIPE-MS0) ──

  /** Flexural strength [MPa] — electrode structural integrity under flushing pressure */
  flexural_strength_MPa?: number;
  /** Average grain size [µm] — determines detail resolution and surface finish */
  grain_size_um?: number;
  /** Porosity [%] — affects dielectric absorption and electrode life */
  porosity_pct?: number;
  /** EDM wear ratio vs workpiece — lower = less electrode consumption */
  edm_wear_ratio?: number;

  // ── Johnson-Cook Flow Stress Model (optional — added for LATHE-MASTER U-LTH04b) ──
  // σ = [A + B·ε^n] · [1 + C·ln(ε̇/ε̇₀)] · [1 - ((T-T_room)/(T_melt-T_room))^m]
  // Source: Johnson & Cook (1983), "A constitutive model and data for metals"

  /** Johnson-Cook A parameter [MPa] — yield stress at reference conditions */
  jc_A?: number;
  /** Johnson-Cook B parameter [MPa] — strain hardening coefficient */
  jc_B?: number;
  /** Johnson-Cook n exponent — strain hardening exponent */
  jc_n?: number;
  /** Johnson-Cook C parameter — strain-rate sensitivity coefficient */
  jc_C?: number;
  /** Johnson-Cook m exponent — thermal softening exponent */
  jc_m?: number;

  // ── Chip Formation Physics (optional — added for LATHE-MASTER U-LTH04b) ──

  /** Friction coefficient — Coulomb friction at tool-chip interface */
  friction_coefficient?: number;
  /** Work hardening exponent — power law strain hardening (σ = K·ε^n) */
  work_hardening_n?: number;
}

/**
 * Canonical Kienzle constants per ISO group.
 * Source: Sandvik Coromant General Turning (2024), validated against
 * Altintas "Manufacturing Automation" Table 2.1, Kronenberg "Machining Science".
 *
 * kc1_1: Specific cutting force at h=1mm chip thickness [N/mm²]
 * mc: Kienzle exponent (chip thickness sensitivity)
 *
 * Note: kc1_1=1800 for steel (ISO P) is the validated Sandvik reference value.
 * Some engines previously used 2000 — that value corresponds to higher-carbon
 * steels (C45+). The canonical value represents medium carbon steel (C35).
 */
export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },   // Steel — Sandvik: 1500-2500, median 1800
  M: { kc1_1: 2100, mc: 0.25 },   // Stainless — Sandvik: 1800-2850, median 2100
  K: { kc1_1: 1100, mc: 0.28 },   // Cast iron — Sandvik: 790-1350, median 1100
  N: { kc1_1: 700, mc: 0.23 },    // Aluminum/Non-ferrous — Sandvik: 350-900, median 700
  S: { kc1_1: 2800, mc: 0.28 },   // Superalloys (Ti, Ni) — Sandvik: 2400-3100
  H: { kc1_1: 3200, mc: 0.30 },   // Hardened steel >45 HRC — Sandvik: 2800-4000
};

/**
 * Canonical Taylor tool life constants per ISO group.
 * Source: ISO 3685, Kronenberg, validated against Kennametal Grade Selection Guide.
 *
 * Taylor equation: T = (C / Vc)^(1/n)
 * where T = tool life [min], Vc = cutting speed [m/min]
 * C = Vc at T=1min (reference constant), n = Taylor exponent
 *
 * Higher C = more machinable. Higher n = flatter life curve (less speed-sensitive).
 */
export const CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }> = {
  P: { C: 350, n: 0.25 },    // Steel — moderate machinability
  M: { C: 250, n: 0.22 },    // Stainless — work hardening limits speed
  K: { C: 400, n: 0.28 },    // Cast iron — abrasive but predictable
  N: { C: 900, n: 0.35 },    // Aluminum — excellent machinability
  S: { C: 150, n: 0.18 },    // Superalloys — very limited speed range
  H: { C: 200, n: 0.20 },    // Hardened steel — CBN/ceramic required
};

/**
 * Full material physics database — 13 common engineering materials.
 * Every pipeline/engine should use these values instead of inline DBs.
 */
export const CANONICAL_MATERIAL_DB: Record<string, MaterialPhysics> = {
  // ISO P — Steels
  steel: {
    name: "Carbon Steel (C35-C45)", iso_group: "P",
    kc1_1: 1800, mc: 0.25, taylor_C: 350, taylor_n: 0.25,
    k_thermal: 50, sigma_y_MPa: 350, density_kg_m3: 7850, hardness_HB: 180,
    vc_base_roughing: 200, vc_base_finishing: 280, machinability_factor: 1.0,
    cp_J_kgK: 486, E_GPa: 210,
    melting_point_C: 1500, latent_heat_J_kg: 270000, resistivity_uOhm_cm: 15,
    thermal_diffusivity_mm2s: 13.1, // 50/(7850×486)×1e6
    // Johnson-Cook: AISI 1045 — Source: Jaspers & Dautzenberg (2002), Table 2
    jc_A: 553, jc_B: 600, jc_n: 0.234, jc_C: 0.0134, jc_m: 1.0,
    friction_coefficient: 0.5, work_hardening_n: 0.25,
  },
  alloy_steel: {
    name: "Alloy Steel (4140/4340)", iso_group: "P",
    kc1_1: 2100, mc: 0.25, taylor_C: 280, taylor_n: 0.22,
    k_thermal: 42, sigma_y_MPa: 550, density_kg_m3: 7850, hardness_HB: 280,
    vc_base_roughing: 150, vc_base_finishing: 220, machinability_factor: 0.7,
    cp_J_kgK: 477, E_GPa: 210,
    melting_point_C: 1430, latent_heat_J_kg: 270000, resistivity_uOhm_cm: 22,
    thermal_diffusivity_mm2s: 11.2, // 42/(7850×477)×1e6 — Source: MatWeb 4140
    // Johnson-Cook: AISI 4340 — Source: Lee & Yeh (1997), Int J Mech Sci
    jc_A: 792, jc_B: 510, jc_n: 0.26, jc_C: 0.014, jc_m: 1.03,
    friction_coefficient: 0.5, work_hardening_n: 0.26,
  },
  tool_steel: {
    name: "Tool Steel (D2/H13)", iso_group: "H",
    kc1_1: 3000, mc: 0.28, taylor_C: 200, taylor_n: 0.20,
    k_thermal: 25, sigma_y_MPa: 1200, density_kg_m3: 7800, hardness_HB: 500,
    vc_base_roughing: 80, vc_base_finishing: 120, machinability_factor: 0.35,
    cp_J_kgK: 460, E_GPa: 210,
    melting_point_C: 1421, latent_heat_J_kg: 270000, resistivity_uOhm_cm: 65,
    thermal_diffusivity_mm2s: 7.0, // 25/(7800×460)×1e6 — Source: ASM Handbook Vol 1
    // Johnson-Cook: H13 — Source: Umbrello et al. (2007), CIRP Annals
    jc_A: 715, jc_B: 329, jc_n: 0.28, jc_C: 0.03, jc_m: 1.0,
    friction_coefficient: 0.45, work_hardening_n: 0.28,
  },

  // ISO M — Stainless
  stainless_304: {
    name: "Stainless Steel 304", iso_group: "M",
    kc1_1: 2100, mc: 0.25, taylor_C: 250, taylor_n: 0.22,
    k_thermal: 16, sigma_y_MPa: 290, density_kg_m3: 7930, hardness_HB: 200,
    vc_base_roughing: 130, vc_base_finishing: 190, machinability_factor: 0.55,
    cp_J_kgK: 500, E_GPa: 193,
    melting_point_C: 1400, latent_heat_J_kg: 280000, resistivity_uOhm_cm: 72,
    thermal_diffusivity_mm2s: 4.0, // 16/(7930×500)×1e6 — Source: ASM Handbook
    // Johnson-Cook: 304L — Source: Tounsi et al. (2002), Int J Mach Tools Manuf
    jc_A: 310, jc_B: 1000, jc_n: 0.65, jc_C: 0.07, jc_m: 1.0,
    friction_coefficient: 0.6, work_hardening_n: 0.45,
  },
  stainless_316: {
    name: "Stainless Steel 316", iso_group: "M",
    kc1_1: 2200, mc: 0.26, taylor_C: 230, taylor_n: 0.21,
    k_thermal: 14, sigma_y_MPa: 310, density_kg_m3: 7960, hardness_HB: 215,
    vc_base_roughing: 120, vc_base_finishing: 170, machinability_factor: 0.50,
    cp_J_kgK: 500, E_GPa: 193,
    melting_point_C: 1375, latent_heat_J_kg: 280000, resistivity_uOhm_cm: 74,
    thermal_diffusivity_mm2s: 3.5, // 14/(7960×500)×1e6
    // Johnson-Cook: 316L — Source: Chandrasekaran et al. (1998)
    jc_A: 301, jc_B: 1472, jc_n: 0.807, jc_C: 0.0156, jc_m: 0.754,
    friction_coefficient: 0.6, work_hardening_n: 0.48,
  },
  stainless_17_4ph: {
    name: "Stainless Steel 17-4PH (H1025)", iso_group: "M",
    kc1_1: 2800, mc: 0.30, taylor_C: 180, taylor_n: 0.18,
    k_thermal: 18.4, sigma_y_MPa: 1070, density_kg_m3: 7800, hardness_HB: 340,
    vc_base_roughing: 80, vc_base_finishing: 120, machinability_factor: 0.35,
    cp_J_kgK: 460, E_GPa: 197,
    melting_point_C: 1400, latent_heat_J_kg: 280000, resistivity_uOhm_cm: 80,
    thermal_diffusivity_mm2s: 5.1, // 18.4/(7800×460)×1e6
    // Johnson-Cook: 17-4PH H1025 — Source: Callister (2007), estimated from precipitation hardening data
    jc_A: 1070, jc_B: 850, jc_n: 0.55, jc_C: 0.015, jc_m: 1.05,
    friction_coefficient: 0.55, work_hardening_n: 0.35,
  },

  // ISO K — Cast Iron
  cast_iron: {
    name: "Gray Cast Iron (GG25)", iso_group: "K",
    kc1_1: 1100, mc: 0.28, taylor_C: 400, taylor_n: 0.28,
    k_thermal: 48, sigma_y_MPa: 250, density_kg_m3: 7200, hardness_HB: 190,
    vc_base_roughing: 250, vc_base_finishing: 350, machinability_factor: 1.2,
    cp_J_kgK: 460, E_GPa: 100,
    // Johnson-Cook: Gray iron — discontinuous chip, JC approximation
    jc_A: 250, jc_B: 200, jc_n: 0.15, jc_C: 0.005, jc_m: 0.8,
    friction_coefficient: 0.4, work_hardening_n: 0.05,
  },
  ductile_iron: {
    name: "Ductile Iron (GGG50)", iso_group: "K",
    kc1_1: 1350, mc: 0.26, taylor_C: 350, taylor_n: 0.25,
    k_thermal: 36, sigma_y_MPa: 370, density_kg_m3: 7100, hardness_HB: 230,
    vc_base_roughing: 180, vc_base_finishing: 260, machinability_factor: 0.90,
    cp_J_kgK: 460, E_GPa: 170,
    // Johnson-Cook: Ductile iron — Source: Hosseinkhani & Ng (2013)
    jc_A: 370, jc_B: 280, jc_n: 0.2, jc_C: 0.01, jc_m: 0.9,
    friction_coefficient: 0.45, work_hardening_n: 0.10,
  },

  // ISO N — Non-Ferrous
  aluminum_6061: {
    name: "Aluminum 6061-T6", iso_group: "N",
    kc1_1: 700, mc: 0.23, taylor_C: 900, taylor_n: 0.35,
    k_thermal: 167, sigma_y_MPa: 276, density_kg_m3: 2700, hardness_HB: 95,
    vc_base_roughing: 500, vc_base_finishing: 700, machinability_factor: 3.0,
    cp_J_kgK: 896, E_GPa: 69,
    melting_point_C: 582, latent_heat_J_kg: 390000, resistivity_uOhm_cm: 2.65,
    thermal_diffusivity_mm2s: 69.0, // 167/(2700×896)×1e6 — Source: ASM
    // Johnson-Cook: 6061-T6 — Source: Lesuer (2000), LLNL Report
    jc_A: 324, jc_B: 114, jc_n: 0.42, jc_C: 0.002, jc_m: 1.34,
    friction_coefficient: 0.35, work_hardening_n: 0.15,
  },
  aluminum_7075: {
    name: "Aluminum 7075-T6", iso_group: "N",
    kc1_1: 800, mc: 0.23, taylor_C: 850, taylor_n: 0.33,
    k_thermal: 130, sigma_y_MPa: 503, density_kg_m3: 2810, hardness_HB: 150,
    vc_base_roughing: 400, vc_base_finishing: 600, machinability_factor: 2.5,
    cp_J_kgK: 960, E_GPa: 72,
    melting_point_C: 477, latent_heat_J_kg: 380000, resistivity_uOhm_cm: 5.15,
    thermal_diffusivity_mm2s: 48.2, // 130/(2810×960)×1e6
    // Johnson-Cook: 7075-T6 — Source: Brar et al. (2009), AIP Conf Proc
    jc_A: 546, jc_B: 678, jc_n: 0.71, jc_C: 0.024, jc_m: 1.56,
    friction_coefficient: 0.35, work_hardening_n: 0.18,
  },
  brass: {
    name: "Brass (CuZn39Pb3)", iso_group: "N",
    kc1_1: 600, mc: 0.20, taylor_C: 1000, taylor_n: 0.38,
    k_thermal: 120, sigma_y_MPa: 200, density_kg_m3: 8500, hardness_HB: 90,
    vc_base_roughing: 350, vc_base_finishing: 500, machinability_factor: 3.5,
    cp_J_kgK: 380, E_GPa: 100,
    // Johnson-Cook: Free-cutting brass — Source: estimated from copper alloy data
    jc_A: 112, jc_B: 505, jc_n: 0.42, jc_C: 0.009, jc_m: 1.68,
    friction_coefficient: 0.3, work_hardening_n: 0.12,
  },

  // ISO S — Superalloys
  titanium_gr5: {
    name: "Titanium Ti-6Al-4V (Grade 5)", iso_group: "S",
    kc1_1: 2800, mc: 0.28, taylor_C: 150, taylor_n: 0.18,
    k_thermal: 6.7, sigma_y_MPa: 880, density_kg_m3: 4430, hardness_HB: 334,
    vc_base_roughing: 50, vc_base_finishing: 80, machinability_factor: 0.25,
    cp_J_kgK: 526, E_GPa: 114,
    melting_point_C: 1660, latent_heat_J_kg: 295000, resistivity_uOhm_cm: 170,
    thermal_diffusivity_mm2s: 2.9, // 6.7/(4430×526)×1e6 — Source: ASM Ti handbook
    // Johnson-Cook: Ti-6Al-4V — Source: Lee & Lin (1998), J Mech Phys Solids
    jc_A: 1098, jc_B: 1092, jc_n: 0.93, jc_C: 0.014, jc_m: 1.1,
    friction_coefficient: 0.55, work_hardening_n: 0.12,
  },
  inconel_718: {
    name: "Inconel 718", iso_group: "S",
    kc1_1: 3000, mc: 0.30, taylor_C: 120, taylor_n: 0.16,
    k_thermal: 11.4, sigma_y_MPa: 1034, density_kg_m3: 8190, hardness_HB: 360,
    vc_base_roughing: 30, vc_base_finishing: 50, machinability_factor: 0.15,
    cp_J_kgK: 435, E_GPa: 205,
    melting_point_C: 1336, latent_heat_J_kg: 290000, resistivity_uOhm_cm: 125,
    thermal_diffusivity_mm2s: 3.2, // 11.4/(8190×435)×1e6 — Source: Special Metals Corp
    // Johnson-Cook: Inconel 718 — Source: Del Guercio et al. (2020)
    jc_A: 1241, jc_B: 622, jc_n: 0.65, jc_C: 0.017, jc_m: 1.3,
    friction_coefficient: 0.6, work_hardening_n: 0.35,
  },

  // ISO H — Hardened
  hardened_steel: {
    name: "Hardened Steel (52-58 HRC)", iso_group: "H",
    kc1_1: 3200, mc: 0.30, taylor_C: 200, taylor_n: 0.20,
    k_thermal: 30, sigma_y_MPa: 1600, density_kg_m3: 7800, hardness_HB: 550,
    vc_base_roughing: 60, vc_base_finishing: 100, machinability_factor: 0.20,
    cp_J_kgK: 450, E_GPa: 210,
    melting_point_C: 1450, latent_heat_J_kg: 270000, resistivity_uOhm_cm: 50,
    thermal_diffusivity_mm2s: 8.5, // 30/(7800×450)×1e6
    // Johnson-Cook: Hardened AISI 52100 — Source: Mabrouki & Rigal (2006)
    jc_A: 1500, jc_B: 400, jc_n: 0.08, jc_C: 0.01, jc_m: 0.9,
    friction_coefficient: 0.45, work_hardening_n: 0.08,
  },

  // ── EDM Workpiece Materials (added for WEDM-100PCT-MS0) ──

  tungsten_carbide: {
    name: "Tungsten Carbide (WC-6%Co)", iso_group: "H",
    kc1_1: 4000, mc: 0.35, taylor_C: 80, taylor_n: 0.12,
    k_thermal: 110, sigma_y_MPa: 4000, density_kg_m3: 15000, hardness_HB: 1500,
    vc_base_roughing: 20, vc_base_finishing: 40, machinability_factor: 0.10,
    cp_J_kgK: 300, E_GPa: 620,
    melting_point_C: 2870, latent_heat_J_kg: 200000, resistivity_uOhm_cm: 20,
    thermal_diffusivity_mm2s: 24.4, // 110/(15000×300)×1e6 — Source: ASM Handbook Vol 7
  },

  copper_c110: {
    name: "Copper C110 (ETP)", iso_group: "N",
    kc1_1: 500, mc: 0.20, taylor_C: 1200, taylor_n: 0.40,
    k_thermal: 390, sigma_y_MPa: 70, density_kg_m3: 8960, hardness_HB: 50,
    vc_base_roughing: 300, vc_base_finishing: 500, machinability_factor: 3.0,
    cp_J_kgK: 385, E_GPa: 117,
    melting_point_C: 1083, latent_heat_J_kg: 207000, resistivity_uOhm_cm: 1.7,
    thermal_diffusivity_mm2s: 113.1, // 390/(8960×385)×1e6 — Source: CDA
  },

  // ── Graphite EDM Electrode Materials (added for ELEC-PIPE-MS0) ──
  // Note: Graphite does NOT form chips — it fractures. Kienzle is approximate.
  // kc1.1 values corrected per Agent 2 scrutiny: 100-350 N/mm² (not 500-800)
  // Sources: Poco Graphite "EDM Technical Manual", Toyo Tanso "Electrode Selection Guide",
  //          Entegris (formerly SGL) technical data sheets

  graphite_edm200: {
    name: "Graphite EDM-200 (Coarse Grain, Roughing)", iso_group: "K",
    kc1_1: 150, mc: 0.20, taylor_C: 2000, taylor_n: 0.45,
    k_thermal: 85, sigma_y_MPa: 35, density_kg_m3: 1780, hardness_HB: 65,
    vc_base_roughing: 400, vc_base_finishing: 600, machinability_factor: 4.0,
    cp_J_kgK: 720, E_GPa: 11,
    // EDM electrode properties
    melting_point_C: 3650, // Sublimation temp (graphite doesn't melt at 1 atm)
    latent_heat_J_kg: 0,   // N/A — sublimation not melting
    resistivity_uOhm_cm: 1400, // High for rough electrodes, lower wear
    thermal_diffusivity_mm2s: 66.3, // 85/(1780×720)×1e6 — Source: Poco EDM-200 datasheet
    // Extended properties for electrode design
    flexural_strength_MPa: 35,
    grain_size_um: 15,
    porosity_pct: 20,
    edm_wear_ratio: 1.0, // Baseline — roughing electrodes accept higher wear
  },

  graphite_edm3: {
    name: "Graphite EDM-3 (Fine Grain, Semi-Finish)", iso_group: "K",
    kc1_1: 250, mc: 0.22, taylor_C: 1800, taylor_n: 0.42,
    k_thermal: 100, sigma_y_MPa: 55, density_kg_m3: 1820, hardness_HB: 75,
    vc_base_roughing: 350, vc_base_finishing: 550, machinability_factor: 3.5,
    cp_J_kgK: 720, E_GPa: 12,
    melting_point_C: 3650,
    latent_heat_J_kg: 0,
    resistivity_uOhm_cm: 1200,
    thermal_diffusivity_mm2s: 76.3, // 100/(1820×720)×1e6 — Source: Poco EDM-3 datasheet
    flexural_strength_MPa: 55,
    grain_size_um: 5,
    porosity_pct: 15,
    edm_wear_ratio: 0.5, // Lower wear for semi-finish
  },

  graphite_af5: {
    name: "Graphite POCO AF-5 (Ultra-Fine Grain, Finishing)", iso_group: "K",
    kc1_1: 350, mc: 0.25, taylor_C: 1500, taylor_n: 0.40,
    k_thermal: 120, sigma_y_MPa: 75, density_kg_m3: 1850, hardness_HB: 85,
    vc_base_roughing: 300, vc_base_finishing: 500, machinability_factor: 3.0,
    cp_J_kgK: 720, E_GPa: 14,
    melting_point_C: 3650,
    latent_heat_J_kg: 0,
    resistivity_uOhm_cm: 1000, // Lower resistivity for finish electrodes
    thermal_diffusivity_mm2s: 90.1, // 120/(1850×720)×1e6 — Source: Poco AF-5 datasheet
    flexural_strength_MPa: 75,
    grain_size_um: 1,
    porosity_pct: 10,
    edm_wear_ratio: 0.2, // Very low wear for finish electrodes
  },

  // Copper-tungsten EDM electrode (for carbide workpieces — NEVER use graphite on carbide)
  copper_tungsten_cuw70: {
    name: "Copper-Tungsten CuW70 (70% W, Carbide Electrode)", iso_group: "N",
    kc1_1: 800, mc: 0.25, taylor_C: 600, taylor_n: 0.30,
    k_thermal: 180, sigma_y_MPa: 600, density_kg_m3: 14500, hardness_HB: 240,
    vc_base_roughing: 100, vc_base_finishing: 150, machinability_factor: 0.8,
    cp_J_kgK: 200, E_GPa: 280,
    melting_point_C: 1083, // Copper matrix melts first
    latent_heat_J_kg: 207000,
    resistivity_uOhm_cm: 4.5, // Very low — excellent conductivity
    thermal_diffusivity_mm2s: 62.1, // 180/(14500×200)×1e6 — Source: Elmet CuW70 datasheet
    edm_wear_ratio: 0.1, // Extremely low wear
  },
};

/**
 * AISI designation alias map — maps AISI alloy codes to canonical material keys.
 * Use when engines have AISI-keyed material data that needs canonical lookup.
 *
 * Usage: const canonical = CANONICAL_MATERIAL_DB[AISI_ALIAS["4140"]]; // → alloy_steel
 *
 * Note: Alias provides approximate canonical mapping. Per-AISI precision (e.g.,
 * kc1_1 1700 for 1018 vs 2100 for 1045) is not preserved — use for generic calcs.
 * For alloy-specific precision, extend CANONICAL_MATERIAL_DB with specific entries.
 *
 * Added for LATHE-MASTER U-LTH04b — enables LatheTransferLearningEngine migration.
 */
export const AISI_ALIAS: Record<string, keyof typeof CANONICAL_MATERIAL_DB> = {
  // ISO P — Low-Carbon Steels (kc1_1 ~1700-1900)
  "1018": "steel",
  "1020": "steel",
  "1045": "steel",
  "12L14": "steel", // Free-machining

  // ISO P — Alloy Steels (kc1_1 ~2100-2400)
  "4130": "alloy_steel",
  "4140": "alloy_steel",
  "4340": "alloy_steel",
  "8620": "alloy_steel",
  "9310": "alloy_steel",

  // ISO H — Tool Steels (kc1_1 ~3000)
  "D2": "tool_steel",
  "H13": "tool_steel",
  "A2": "tool_steel",
  "M2": "tool_steel",
  "S7": "tool_steel",
  "O1": "tool_steel",

  // ISO M — Stainless Steels (kc1_1 ~2100-2800)
  "303": "stainless_304", // Free-machining, close to 304
  "304": "stainless_304",
  "304L": "stainless_304",
  "316": "stainless_316",
  "316L": "stainless_316",
  "410": "stainless_304", // Martensitic, approximate to 304
  "420": "stainless_304",
  "17-4PH": "stainless_17_4ph",
  "17-4": "stainless_17_4ph",
  "15-5PH": "stainless_17_4ph", // Similar precipitation hardening

  // ISO K — Cast Irons
  "gray_iron": "cast_iron",
  "ductile_iron": "ductile_iron",

  // ISO N — Aluminum Alloys
  "6061": "aluminum_6061",
  "6061-T6": "aluminum_6061",
  "7075": "aluminum_7075",
  "7075-T6": "aluminum_7075",
  "2024": "aluminum_7075", // Approximate — 2xxx is harder than 6061
  "2024-T3": "aluminum_7075",

  // ISO S — Superalloys
  "Ti-6Al-4V": "titanium_gr5",
  "Ti64": "titanium_gr5",
  "Grade5": "titanium_gr5",
  "IN718": "inconel_718",
  "Inconel718": "inconel_718",
  "Waspaloy": "inconel_718", // Approximate
};

// ════════════════════════════════════════════════════════════════════════════
// EDM PHYSICS CONSTANTS — WEDM-100PCT-MS0 Forge-Triple Canonical Source
// ════════════════════════════════════════════════════════════════════════════

/**
 * EDM canonical constants — ALL EDM engines MUST import from here.
 * The wedm-physics-constants-gate hook enforces this.
 *
 * Sources:
 *   - Klocke (2013) "Manufacturing Processes 4", Table 8.3
 *   - DiBitonto et al. (1989) "Theoretical models of the EDM process"
 *   - Kunieda et al. (2005) "Advancing EDM through fundamental insight", CIRP Annals
 *   - Puertas & Luis (2004) "A study of optimization for EDM", J. Mat. Proc. Tech.
 *   - Carslaw & Jaeger (1959) "Conduction of Heat in Solids"
 *   - Toenshoff et al. (2004) "Annals of the CIRP - EDM"
 *   - Sato (1985) cutting speed model for wire EDM
 */
export const EDM_PHYSICS = {
  /** Klocke Ra model: Ra = k_ra × I_p^alpha × t_on^beta
   *  k_ra range for steel: 0.35-0.42 (Klocke 2013 Table 8.3)
   *  Units: µm / (A^alpha × µs^beta) — LOCKED to amps and microseconds */
  klocke: {
    /** Material-specific Ra model coefficients (Puertas & Luis 2004) */
    ra_models: {
      steel:      { k_ra: 0.38, alpha: 0.40, beta: 0.28, source: "Klocke 2013 Table 8.3" },
      tool_steel: { k_ra: 0.36, alpha: 0.40, beta: 0.28, source: "Klocke 2013, fitted D2/H13" },
      stainless:  { k_ra: 0.42, alpha: 0.38, beta: 0.30, source: "Puertas & Luis 2004, 304SS" },
      aluminum:   { k_ra: 0.30, alpha: 0.35, beta: 0.25, source: "Puertas & Luis 2004, 6061" },
      carbide:    { k_ra: 0.45, alpha: 0.50, beta: 0.32, source: "Puertas & Luis 2004, WC-6%Co" },
      titanium:   { k_ra: 0.44, alpha: 0.42, beta: 0.30, source: "Puertas & Luis 2004, Ti-6Al-4V" },
      inconel:    { k_ra: 0.46, alpha: 0.41, beta: 0.29, source: "Puertas & Luis 2004, IN718" },
      copper:     { k_ra: 0.28, alpha: 0.35, beta: 0.24, source: "Estimated from Klocke framework" },
    },
  },

  /** DiBitonto crater model: d_crater = K1 × E^(1/3) [µm]
   *  Source: DiBitonto et al. (1989) */
  dibitonto: {
    K1_um_per_mJ_third: 4.8, // µm / (mJ)^(1/3) — metallic workpiece in DI water
    source: "DiBitonto et al. 1989, empirical constant for metallic cathode",
  },

  /** Kunieda MRR: MRR = eta × E × f / rho / (cp×dT + Lm)
   *  Source: Kunieda et al. CIRP Annals 2005 */
  kunieda: {
    eta_steel: 0.40,       // process efficiency for steel in DI water (narrowed from 0.3-0.5)
    eta_aluminum: 0.45,    // higher efficiency due to lower melting point
    eta_carbide: 0.30,     // lower efficiency — high melting point
    eta_titanium: 0.35,    // moderate — low conductivity
    eta_inconel: 0.32,     // low — refractory behavior
    // Sinker EDM with graphite electrodes (ELEC-PIPE-MS0)
    eta_graphite_rough: 0.50,  // High efficiency — graphite sublimation aids removal
    eta_graphite_finish: 0.45, // Slightly lower at finish settings
    eta_cuw_rough: 0.35,       // Copper-tungsten on carbide
    eta_cuw_finish: 0.30,
    source: "Kunieda et al. 2005, narrowed per Joshi & Pande 2009",
  },

  /** Sinker EDM electrode spark gaps — ELEC-PIPE-MS0
   *  Unified from ElectrodeDesignEngine stage-based values (per E18 scrutiny)
   *  Electrode is undersized by spark gap relative to cavity
   *  Source: Poco "EDM Technical Manual" Section 4.2; Mitsubishi EA12S programming guide */
  sinker_spark_gap: {
    /** Rough stage: high MRR, coarse finish */
    rough_mm: { graphite: 0.15, copper_tungsten: 0.12 },
    /** Semi-finish stage: balanced */
    semi_mm: { graphite: 0.08, copper_tungsten: 0.06 },
    /** Finish stage: fine detail, low Ra */
    finish_mm: { graphite: 0.03, copper_tungsten: 0.025 },
    /** Orbit allowance for finish passes [mm] */
    orbit_allowance_mm: 0.02,
    source: "Poco EDM Technical Manual + Mitsubishi FP80S operator manual",
  },

  /** Sinker EDM duty cycle by stage (P10 scrutiny fix)
   *  duty = t_on / (t_on + t_off)
   *  CRITICAL: Finish passes need pulseOff = 1.5-2.0 × pulseOn (duty 33-40%)
   *  The prior SinkerEDMCalculatorEngine used pulseOff = 0.8 × pulseOn (duty 56%) — TOO HOT for finish
   *  Source: Mitsubishi EA12S/EA12D E-table conditions; Poco electrode selection guide */
  sinker_duty_cycle: {
    rough: { min: 0.45, max: 0.55, typical: 0.50 },  // 50% duty — aggressive removal
    semi: { min: 0.40, max: 0.50, typical: 0.45 },   // 45% duty
    finish: { min: 0.33, max: 0.40, typical: 0.36 }, // 36% duty — CRITICAL: t_off = 1.8 × t_on
    super_finish: { min: 0.25, max: 0.33, typical: 0.28 }, // 28% duty for mirror finish
    source: "Mitsubishi FP80S/C30EA-2 E-table; corrected per Agent 2 P10 scrutiny",
  },

  /** Sinker EDM electrode polarity by material combination
   *  SAFETY: Wrong polarity destroys workpiece and electrode
   *  Graphite: typically negative polarity (electrode = cathode)
   *  CuW: typically positive polarity (electrode = anode) */
  sinker_polarity: {
    graphite_on_steel: "negative",     // Standard — graphite erodes workpiece
    graphite_on_tool_steel: "negative",
    graphite_on_aluminum: "negative",
    cuw_on_carbide: "positive",        // MANDATORY — never graphite on carbide
    cuw_on_steel: "positive",
    source: "Mitsubishi EA series programming guide; Poco electrode manual",
  },

  /** Toenshoff energy cascade: E_n = E_rough × gamma^(n-1)
   *  gamma is material-dependent (0.20-0.35)
   *  Source: Toenshoff et al. CIRP Annals 2004 */
  toenshoff: {
    gamma: {
      steel: 0.25,      // 75% reduction per skim
      tool_steel: 0.25,
      stainless: 0.22,   // 78% — needs more aggressive reduction
      aluminum: 0.30,    // 70% — tolerates higher skim energy
      carbide: 0.20,     // 80% — aggressive reduction needed
      titanium: 0.22,
      inconel: 0.20,
      copper: 0.30,
    },
    source: "Toenshoff 2004: 60-80% reduction per skim, material-dependent",
  },

  /** Wire break safety limits */
  wire_safety: {
    /** Max current density [A/mm²] before wire break risk escalates */
    max_current_density_brass: 500,
    max_current_density_moly: 300,
    max_current_density_tungsten: 250,
    /** Max duty cycle by pass type */
    max_duty_rough: 0.30,
    max_duty_skim: 0.20,
    source: "Rajurkar & Wang 1993; Sodick/Mitsubishi wire specifications",
  },

  /** Recast spec limits by industry [µm] */
  recast_specs: {
    aerospace:  { max_recast_um: 0,  max_haz_um: 25,  source: "AMS 2628" },
    medical:    { max_recast_um: 5,  max_haz_um: 50,  source: "ASTM F86 / ISO 10993" },
    precision:  { max_recast_um: 10, max_haz_um: 75,  source: "General precision practice" },
    general:    { max_recast_um: 25, max_haz_um: 150, source: "General machining" },
  },

  /** Controller-specific M-codes for wire threading */
  threading_mcodes: {
    mitsubishi:     { thread: "M20", cut: "M21" },
    sodick:         { thread: "M50", cut: "M51" },
    makino:         { thread: "M60", cut: "M61" },
    agiecharmilles: { thread: "M50", cut: "M51" },
    fanuc:          { thread: "M50", cut: "M60" },
  },
} as const;

/**
 * Elastic modulus by tool material [MPa].
 * Source: Sandvik Coromant, Kennametal tooling catalogs.
 */
export type ToolMaterial = "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";

export const CANONICAL_TOOL_MODULUS: Record<ToolMaterial, number> = {
  carbide: 600000,   // WC-Co: 550,000-650,000 MPa
  hss: 210000,       // M2/M42 HSS: 200,000-220,000 MPa
  cermet: 400000,    // TiCN-based: 380,000-420,000 MPa
  ceramic: 380000,   // Al2O3/Si3N4: 350,000-400,000 MPa
  cbn: 680000,       // Cubic boron nitride: 650,000-700,000 MPa
  pcd: 850000,       // Polycrystalline diamond: 800,000-900,000 MPa
};

// ── Canonical Physics Functions ──

/**
 * Kienzle cutting force model.
 * Fc = kc1.1 × b × h^(1 - mc)
 *
 * @param kc1_1 - Specific cutting force at h=1mm [N/mm²]
 * @param mc - Kienzle exponent (0.14–0.40)
 * @param ap - Axial depth of cut = chip width b [mm]
 * @param fz - Feed per tooth = chip thickness h [mm]
 * @returns Cutting force per tooth [N]
 *
 * Reference: Kienzle & Victor (1957), "Spezifische Schnittkräfte bei der Metallbearbeitung"
 */
export function kienzleForce(kc1_1: number, mc: number, ap: number, fz: number, edgePrep?: 'sharp' | 'light_hone' | 'heavy_hone' | 'chamfer' | 't_land'): number {
  if (fz <= 0 || ap <= 0) return 0;
  const h = Math.max(fz, 0.001); // Prevent division issues at very small feeds
  const kc = kc1_1 * Math.pow(h, -mc); // Specific cutting force [N/mm²]
  // Edge preparation correction: honed/chamfered edges increase Kc by 5-25%
  // Source: Seco Tools geometry guide + Denkena & Biermann (2014) "Cutting edge geometries" CIRP Annals
  const EDGE_PREP_FACTOR: Record<string, number> = {
    sharp: 1.0, light_hone: 1.07, heavy_hone: 1.12, chamfer: 1.18, t_land: 1.25,
  };
  const k_edge = EDGE_PREP_FACTOR[edgePrep ?? 'sharp'] ?? 1.0;
  return kc * ap * h * k_edge; // Fc = kc × b × h × k_edge [N]
}

/**
 * Taylor tool life equation.
 * T = (C / Vc)^(1/n)
 *
 * @param C - Taylor constant (Vc at T=1min) [m/min]
 * @param n - Taylor exponent (0.1–0.4)
 * @param Vc - Cutting speed [m/min]
 * @returns Tool life [minutes]
 *
 * Reference: F.W. Taylor (1907), "On the Art of Cutting Metals"
 * ISO 3685:1993 — Tool-life testing with single-point turning tools
 */
export function taylorLife(C: number, n: number, Vc: number, coating?: string): number {
  if (Vc <= 0 || C <= 0 || n <= 0) return 9999;
  // Coating performance multiplier — extends effective Taylor C constant
  // Source: Walter Tiger·tec Gold data + Sandvik/Kennametal coating studies
  const COATING_MULTIPLIER: Record<string, number> = {
    uncoated: 1.0, TiN: 1.3, TiCN: 1.4, TiAlN: 1.5, AlTiN: 1.6,
    AlCrN: 1.5, nACo: 1.7, CVD_Al2O3: 1.8, CVD_TiCN_Al2O3: 1.9,
    Tiger_tec_Gold: 2.0, PVD_multilayer: 1.4, DLC: 1.3, diamond: 3.0,
  };
  const k_coat = COATING_MULTIPLIER[coating ?? 'uncoated'] ?? 1.0;
  return Math.pow((C * k_coat) / Vc, 1 / n);
}

/**
 * Extended Taylor tool life equation with feed and depth exponents.
 * T = C / (Vc^n × f^p × ap^q)
 *
 * This generalized form accounts for the independent effects of:
 * - Cutting speed (strongest effect, n = 0.1–0.5)
 * - Feed rate (moderate effect, p = 0.2–0.4)
 * - Axial depth of cut (weakest effect, q = 0.1–0.25)
 *
 * @param C - Extended Taylor constant [min × (m/min)^n × (mm)^p × (mm)^q]
 * @param n - Speed exponent (0.1–0.5, carbide typically 0.2–0.3)
 * @param p - Feed exponent (0.2–0.4)
 * @param q - Depth exponent (0.1–0.25)
 * @param Vc - Cutting speed [m/min]
 * @param f - Feed rate [mm/rev or mm/tooth]
 * @param ap - Axial depth of cut [mm]
 * @param coating - Optional coating type for life extension
 * @returns Tool life [minutes]
 *
 * Reference: ISO 3685:1993 extended form
 * Reference: Kronenberg, M. "Machining Science and Application" (1966)
 * Reference: CIRP Annals tool life compilation data
 *
 * Typical exponents by material (ISO groups):
 *   P-steel:   n=0.25, p=0.30, q=0.15
 *   M-stainless: n=0.20, p=0.35, q=0.20
 *   K-cast iron: n=0.30, p=0.25, q=0.12
 *   N-aluminum:  n=0.40, p=0.20, q=0.10
 *   S-superalloy: n=0.15, p=0.40, q=0.25
 *   H-hardened:  n=0.12, p=0.35, q=0.20
 */
export function extendedTaylorLife(
  C: number,
  n: number,
  p: number,
  q: number,
  Vc: number,
  f: number,
  ap: number,
  coating?: string
): number {
  // Guard against invalid inputs
  if (Vc <= 0 || f <= 0 || ap <= 0 || C <= 0) return 9999;
  if (n <= 0 || p <= 0 || q <= 0) return 9999;

  // Coating performance multiplier (same as basic Taylor)
  const COATING_MULTIPLIER: Record<string, number> = {
    uncoated: 1.0, TiN: 1.3, TiCN: 1.4, TiAlN: 1.5, AlTiN: 1.6,
    AlCrN: 1.5, nACo: 1.7, CVD_Al2O3: 1.8, CVD_TiCN_Al2O3: 1.9,
    Tiger_tec_Gold: 2.0, PVD_multilayer: 1.4, DLC: 1.3, diamond: 3.0,
  };
  const k_coat = COATING_MULTIPLIER[coating ?? 'uncoated'] ?? 1.0;

  // T = C × k_coat / (Vc^n × f^p × ap^q)
  const denominator = Math.pow(Vc, n) * Math.pow(f, p) * Math.pow(ap, q);
  return (C * k_coat) / denominator;
}

/**
 * Extended Taylor exponent lookup by ISO material group.
 * Returns typical n, p, q exponents for the extended Taylor equation.
 *
 * @param isoGroup - ISO material group code (P, M, K, N, S, H)
 * @returns { n, p, q } exponent values
 *
 * Reference: CIRP Annals compilation, Sandvik technical data
 */
export function extendedTaylorExponents(isoGroup: string): { n: number; p: number; q: number } {
  const EXPONENTS: Record<string, { n: number; p: number; q: number }> = {
    P: { n: 0.25, p: 0.30, q: 0.15 },  // Steel
    M: { n: 0.20, p: 0.35, q: 0.20 },  // Stainless steel
    K: { n: 0.30, p: 0.25, q: 0.12 },  // Cast iron
    N: { n: 0.40, p: 0.20, q: 0.10 },  // Non-ferrous (aluminum, brass)
    S: { n: 0.15, p: 0.40, q: 0.25 },  // Superalloys (Inconel, Ti)
    H: { n: 0.12, p: 0.35, q: 0.20 },  // Hardened steel (>45 HRC)
  };
  return EXPONENTS[isoGroup.toUpperCase()] ?? EXPONENTS.P;
}

/**
 * Cantilever beam tool deflection.
 * delta = F × L³ / (3 × E × I)
 * I = π × d⁴ / 64
 *
 * @param F - Resultant cutting force [N]
 * @param L - Tool stickout / overhang [mm]
 * @param d - Tool shank diameter [mm]
 * @param E - Elastic modulus [MPa] (default: carbide = 600,000)
 * @returns Deflection at tool tip [mm]
 *
 * Reference: Euler-Bernoulli beam theory, standard mechanics of materials
 */
export function toolDeflection(F: number, L: number, d: number, E: number = 600000): number {
  if (d <= 0 || L <= 0) return 0;
  const I = (Math.PI * Math.pow(d, 4)) / 64; // Second moment of area [mm⁴]
  return (F * Math.pow(L, 3)) / (3 * E * I);  // [mm]
}

/**
 * Predicted arithmetic surface roughness.
 * Ra ≈ fz² / (32 × r_e) × 1000 [µm]
 *
 * @param fz - Feed per tooth [mm]
 * @param r_e - Tool corner/nose radius [mm]
 * @returns Predicted Ra [µm]
 *
 * Reference: Brammertz kinematic roughness model
 * Valid for: single-point tools, end mills (approximation)
 */
export function predictedRa(fz: number, r_e: number): number {
  if (r_e <= 0 || fz <= 0) return 0;
  return (fz * fz * 1000) / (32 * r_e);
}

/**
 * RPM from cutting speed and tool diameter.
 * N = (1000 × Vc) / (π × D)
 */
export function rpmFromVc(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return Math.round((1000 * Vc) / (Math.PI * D));
}

/**
 * Material removal rate.
 * MRR = ap × ae × Vf / 1000 [cm³/min]
 */
export function mrr(ap: number, ae: number, Vf: number): number {
  return (ap * ae * Vf) / 1000;
}

/**
 * White layer formation temperature thresholds by material class.
 *
 * White layer (untempered martensite + amorphous layer) forms when the cutting
 * zone temperature exceeds the austenitizing temperature. Once formed, white layer
 * causes subsurface microcracks that reduce fatigue life by 20–60%.
 *
 * This is a HARD BLOCK threshold: exceeding it is a manufacturing defect.
 *
 * Sources:
 *   - Brinksmeier et al. (1999) CIRP Annals 48/2 — "Residual stresses in machining"
 *   - Thiele & Melkote (1999) J. Manuf. Sci. Eng. 121(1) — hard turning white layers
 *   - Sharman et al. (2004) Int. J. Mach. Tools Manuf. 44(9) — Inconel 718
 *   - El-Wardany et al. (1996) Wear 195(1-2) — hardened steel thresholds
 *   - Shah et al. (2012) Procedia CIRP 1 — titanium alloy thermally affected zones
 */
export interface WhiteLayerThreshold {
  /** Minimum cutting zone temperature for white layer formation [°C] */
  threshold_C: number;
  /** Material class description */
  description: string;
  /** ISO material group */
  isoGroup: string;
  /** Maximum safe cutting speed at typical chip load [m/min] */
  maxSafeVc_m_min: number;
}

export const WHITE_LAYER_THRESHOLDS: Record<string, WhiteLayerThreshold> = {
  // Hardened steel (>45 HRC) — austenitizing temp of martensite ~700°C
  hardened_steel: {
    threshold_C: 700,
    description: "Hardened steel (>45 HRC) — untempered martensite white layer",
    isoGroup: "H",
    maxSafeVc_m_min: 150,
  },
  // Tool steel / die steel (35–45 HRC) — slightly higher threshold
  tool_steel: {
    threshold_C: 720,
    description: "Tool steel (35–45 HRC) — tempered martensite sensitive to rehardening",
    isoGroup: "H",
    maxSafeVc_m_min: 180,
  },
  // Nickel superalloys (Inconel 718, Waspaloy) — gamma prime dissolution ~800°C
  nickel_alloy: {
    threshold_C: 800,
    description: "Nickel superalloy — γ′ dissolution and oxidation-induced white layer",
    isoGroup: "S",
    maxSafeVc_m_min: 60,
  },
  // Titanium alloys — phase transformation (α→β) ~882°C, practical gate ~750°C
  titanium: {
    threshold_C: 750,
    description: "Titanium alloy — α→β phase transformation and oxygen diffusion layer",
    isoGroup: "S",
    maxSafeVc_m_min: 80,
  },
  // Medium carbon steel / low alloy (unhardened) — less sensitive, but still a risk
  steel: {
    threshold_C: 850,
    description: "Carbon / low-alloy steel — austenite formation above Ac1",
    isoGroup: "P",
    maxSafeVc_m_min: 300,
  },
  // Stainless steel — sensitization of grain boundaries ~650°C for 304/316
  stainless: {
    threshold_C: 650,
    description: "Austenitic stainless — sensitization + sigma-phase precipitation",
    isoGroup: "M",
    maxSafeVc_m_min: 200,
  },
};

/**
 * Scalar white layer temperature thresholds for the most safety-critical materials.
 *
 * These mirror the values in WHITE_LAYER_THRESHOLDS and are exported as named
 * constants so that hooks and gate logic can reference them without a table lookup.
 *
 * Sources:
 *   - Steel (carbon/low-alloy): austenite formation Ac1 ≈ 700°C
 *     El-Wardany et al. (1996) Wear 195(1-2):229-244
 *   - Inconel 718 (nickel superalloy): γ′ dissolution ~800°C
 *     Sharman et al. (2004) Int. J. Mach. Tools Manuf. 44(9):989-1000
 */
/** Minimum cutting-zone temperature that triggers white layer in plain/low-alloy steel [°C] */
export const WHITE_LAYER_THRESHOLD_STEEL_C = 700;

/** Minimum cutting-zone temperature that triggers white layer in Inconel / nickel superalloys [°C] */
export const WHITE_LAYER_THRESHOLD_INCONEL_C = 800;

/**
 * Cutting power from force and speed.
 * P = Fc × Vc / 60000 [kW]
 */
export function cuttingPower(Fc: number, Vc: number): number {
  return (Fc * Vc) / 60000;
}

/**
 * Spindle torque from force and diameter.
 * T = Fc × D / 2000 [Nm]
 */
export function spindleTorque(Fc: number, D: number): number {
  return (Fc * D) / 2000;
}

// ── Seeded Pseudo-Random Number Generator ──

/**
 * Box-Muller transform for normal distribution sampling.
 * Uses seeded xorshift128 PRNG for reproducible Monte Carlo simulations.
 *
 * @param seed - Seed value for reproducibility (default: Date.now())
 * @returns Function that generates N(0,1) samples
 *
 * Reference: Box & Muller (1958), "A Note on the Generation of Random Normal Deviates"
 */
export function seededNormalRNG(seed: number = 42): () => number {
  // xorshift128 state
  let s0 = seed | 0 || 1;
  let s1 = (seed * 1664525 + 1013904223) | 0;

  function nextUniform(): number {
    let t = s0;
    const s = s1;
    s0 = s;
    t ^= t << 23;
    t ^= t >> 17;
    t ^= s ^ (s >> 26);
    s1 = t;
    return ((t + s) >>> 0) / 4294967296; // [0, 1)
  }

  let hasSpare = false;
  let spare = 0;

  return function normalSample(): number {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    // Box-Muller
    let u: number, v: number, s: number;
    do {
      u = nextUniform() * 2 - 1;
      v = nextUniform() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    hasSpare = true;
    return u * mul;
  };
}

// ── Lookup Helpers ──

/**
 * Resolve material by name or ISO group.
 * Fuzzy-matches common names: "aluminum" → aluminum_6061, "steel" → steel, etc.
 */
export function resolveMaterial(nameOrIso: string): MaterialPhysics {
  const key = nameOrIso.toLowerCase().replace(/[\s-]/g, "_");

  // Direct match
  if (CANONICAL_MATERIAL_DB[key]) return CANONICAL_MATERIAL_DB[key];

  // Fuzzy match by prefix
  const fuzzy = Object.entries(CANONICAL_MATERIAL_DB).find(
    ([k, v]) => k.startsWith(key) || v.name.toLowerCase().includes(key)
  );
  if (fuzzy) return fuzzy[1];

  // ISO group match — return representative material
  const iso = nameOrIso.toUpperCase() as ISOGroup;
  const isoMatch = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === iso);
  if (isoMatch) return isoMatch;

  // Default to steel
  return CANONICAL_MATERIAL_DB.steel;
}

/**
 * Get Kienzle constants for a material (by name, ISO group, or material key).
 */
export function getKienzle(material: string): { kc1_1: number; mc: number } {
  const mat = resolveMaterial(material);
  return { kc1_1: mat.kc1_1, mc: mat.mc };
}

/**
 * Get Taylor constants for a material.
 */
export function getTaylor(material: string): { C: number; n: number } {
  const mat = resolveMaterial(material);
  return { C: mat.taylor_C, n: mat.taylor_n };
}

/**
 * Get tool elastic modulus by material type.
 */
export function getToolModulus(toolMaterial: string): number {
  const key = toolMaterial.toLowerCase() as ToolMaterial;
  return CANONICAL_TOOL_MODULUS[key] ?? CANONICAL_TOOL_MODULUS.carbide;
}

// ── Canonical Speed/Feed Ranges ──

/**
 * Canonical milling speed ranges per ISO group [m/min], carbide inserts, flood coolant.
 * Source: Sandvik Coromant General Milling (2024), cross-referenced with Kennametal.
 */
export const CANONICAL_MILLING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 200, finish: 280 },
  M: { rough: 130, finish: 190 },
  K: { rough: 250, finish: 350 },
  N: { rough: 500, finish: 700 },
  S: { rough: 50, finish: 80 },
  H: { rough: 60, finish: 100 },
};

/**
 * Canonical milling feed per tooth ranges per ISO group [mm/tooth], carbide inserts.
 * Source: Sandvik Coromant General Milling (2024), Kennametal Milling Handbook.
 */
export const CANONICAL_MILLING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 0.15, finish: 0.08 },
  M: { rough: 0.12, finish: 0.06 },
  K: { rough: 0.18, finish: 0.10 },
  N: { rough: 0.20, finish: 0.10 },
  S: { rough: 0.08, finish: 0.04 },
  H: { rough: 0.06, finish: 0.03 },
};

/**
 * Canonical turning speed ranges per ISO group [m/min], carbide inserts, flood coolant.
 * Source: Sandvik Coromant General Turning (2024), cross-referenced with Kennametal.
 * Note: Turning speeds differ from milling (single-point inserts, continuous cut).
 */
export const CANONICAL_TURNING_SPEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 220, finish: 320 },
  M: { rough: 130, finish: 200 },
  K: { rough: 260, finish: 380 },
  N: { rough: 600, finish: 900 },
  S: { rough: 35, finish: 55 },
  H: { rough: 70, finish: 110 },
};

/**
 * Canonical turning feed per revolution ranges per ISO group [mm/rev], carbide inserts.
 * Source: Sandvik Coromant General Turning (2024), Kennametal Turning Handbook.
 */
export const CANONICAL_TURNING_FEEDS: Record<ISOGroup, { rough: number; finish: number }> = {
  P: { rough: 0.30, finish: 0.12 },
  M: { rough: 0.25, finish: 0.10 },
  K: { rough: 0.35, finish: 0.15 },
  N: { rough: 0.40, finish: 0.15 },
  S: { rough: 0.15, finish: 0.06 },
  H: { rough: 0.12, finish: 0.05 },
};

// ============================================================================
// AISI GRADE-SPECIFIC CUTTING COEFFICIENTS (U-AWR16)
// ============================================================================
// Per-AISI-grade Kienzle and Taylor coefficients for precision machining.
// Refactored from MaterialDatabaseEngine to establish single source of truth.
// Sources: Altintas "Manufacturing Automation", ASM Handbook Vol 16,
//          Sandvik Coromant General Turning, Kennametal Grade Selection Guide.

export interface AISICuttingCoefficients {
  kc1_1: number;  // Specific cutting force at h=1mm [N/mm²]
  mc: number;     // Kienzle exponent (dimensionless)
  taylor_C: number; // Taylor constant [m/min at T=1min]
  taylor_n: number; // Taylor exponent (dimensionless)
  iso_group: ISOGroup;
}

/**
 * Canonical cutting coefficients per AISI grade.
 * ALL engines needing grade-specific Kienzle/Taylor MUST import from here.
 * MaterialDatabaseEngine is the primary consumer.
 *
 * Note: These differ from CANONICAL_KIENZLE/CANONICAL_TAYLOR which are ISO-group
 * averages. Per-grade coefficients account for alloy-specific variations.
 */
export const AISI_CUTTING_COEFFICIENTS: Record<string, AISICuttingCoefficients> = {
  // ── Carbon Steels (ISO P) ──
  "1018": { kc1_1: 1780, mc: 0.18, taylor_C: 350, taylor_n: 0.25, iso_group: "P" },
  "1045": { kc1_1: 2220, mc: 0.26, taylor_C: 300, taylor_n: 0.23, iso_group: "P" },
  "12L14": { kc1_1: 1580, mc: 0.15, taylor_C: 450, taylor_n: 0.28, iso_group: "P" },

  // ── Alloy Steels (ISO P) ──
  "4140": { kc1_1: 2500, mc: 0.26, taylor_C: 280, taylor_n: 0.22, iso_group: "P" },
  "4340": { kc1_1: 2180, mc: 0.23, taylor_C: 240, taylor_n: 0.20, iso_group: "P" },
  "8620": { kc1_1: 1850, mc: 0.19, taylor_C: 300, taylor_n: 0.23, iso_group: "P" },

  // ── Tool Steels (ISO H) ──
  "D2": { kc1_1: 2850, mc: 0.28, taylor_C: 150, taylor_n: 0.15, iso_group: "H" },
  "A2": { kc1_1: 2650, mc: 0.26, taylor_C: 170, taylor_n: 0.16, iso_group: "H" },
  "H13": { kc1_1: 2550, mc: 0.25, taylor_C: 180, taylor_n: 0.17, iso_group: "H" },
  "S7": { kc1_1: 2400, mc: 0.24, taylor_C: 190, taylor_n: 0.18, iso_group: "H" },
  "M2": { kc1_1: 3100, mc: 0.30, taylor_C: 120, taylor_n: 0.12, iso_group: "H" },

  // ── Stainless Steels (ISO M) ──
  "303": { kc1_1: 2100, mc: 0.22, taylor_C: 200, taylor_n: 0.18, iso_group: "M" },
  "304": { kc1_1: 2350, mc: 0.24, taylor_C: 160, taylor_n: 0.15, iso_group: "M" },
  "316": { kc1_1: 2000, mc: 0.25, taylor_C: 150, taylor_n: 0.14, iso_group: "M" },
  "17-4": { kc1_1: 2680, mc: 0.27, taylor_C: 130, taylor_n: 0.13, iso_group: "M" },

  // ── Aluminum Alloys (ISO N) ──
  "6061-T6": { kc1_1: 790, mc: 0.15, taylor_C: 900, taylor_n: 0.35, iso_group: "N" },
  "7075-T6": { kc1_1: 870, mc: 0.16, taylor_C: 850, taylor_n: 0.33, iso_group: "N" },
  "2024-T3": { kc1_1: 820, mc: 0.15, taylor_C: 870, taylor_n: 0.34, iso_group: "N" },

  // ── Titanium Alloys (ISO S) ──
  "Ti-6Al-4V": { kc1_1: 1970, mc: 0.21, taylor_C: 190, taylor_n: 0.20, iso_group: "S" },

  // ── Nickel Alloys (ISO S) ──
  "Inconel 718": { kc1_1: 2700, mc: 0.25, taylor_C: 55, taylor_n: 0.15, iso_group: "S" },
  "Hastelloy C276": { kc1_1: 3100, mc: 0.31, taylor_C: 55, taylor_n: 0.11, iso_group: "S" },

  // ── Copper Alloys (ISO N) ──
  "C360": { kc1_1: 680, mc: 0.14, taylor_C: 800, taylor_n: 0.32, iso_group: "N" },
  "C110": { kc1_1: 720, mc: 0.15, taylor_C: 700, taylor_n: 0.30, iso_group: "N" },

  // ── Cast Irons (ISO K) ──
  "Gray Iron Class 30": { kc1_1: 1150, mc: 0.18, taylor_C: 250, taylor_n: 0.20, iso_group: "K" },
  "Ductile Iron 65-45-12": { kc1_1: 1450, mc: 0.20, taylor_C: 220, taylor_n: 0.18, iso_group: "K" },

  // ── Plastics (ISO N — approximate) ──
  "Delrin": { kc1_1: 180, mc: 0.10, taylor_C: 2000, taylor_n: 0.45, iso_group: "N" },
  "UHMW": { kc1_1: 120, mc: 0.08, taylor_C: 2500, taylor_n: 0.50, iso_group: "N" },
};

// ============================================================================
// NUMERICAL LINEAR ALGEBRA TOLERANCES (SCIMATH-MS0)
// ============================================================================
// Canonical tolerances for matrix decompositions and iterative solvers.
// Reference: Golub & Van Loan, "Matrix Computations" 4th ed., Chapter 2

/** IEEE 754 float64 machine epsilon: 2^{-52} */
export const EPS_MACHINE = 2.220446049250313e-16;

/** SVD convergence: stop Jacobi sweeps when off-diagonal < EPS_SVD * diagonal energy */
export const EPS_SVD = 1e-14;

/** Cholesky: diagonal element below this → not positive definite */
export const EPS_CHOLESKY = 1e-12;

/** Eigenvalue convergence: off-diagonal < EPS_EIGEN * diagonal */
export const EPS_EIGEN = 1e-12;

/** Iterative solver (CG/GMRES/BiCGSTAB) relative residual convergence */
export const EPS_ITERATIVE = 1e-10;

/** Rank determination: singular value < EPS_RANK * sigma_max → numerically zero */
export const EPS_RANK = 1e-10;

/** Condition number warning threshold: κ > this triggers stability warning */
export const CONDITION_WARNING_THRESHOLD = 1e12;
