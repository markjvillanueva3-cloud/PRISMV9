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
  },
  alloy_steel: {
    name: "Alloy Steel (4140/4340)", iso_group: "P",
    kc1_1: 2100, mc: 0.25, taylor_C: 280, taylor_n: 0.22,
    k_thermal: 42, sigma_y_MPa: 550, density_kg_m3: 7850, hardness_HB: 280,
    vc_base_roughing: 150, vc_base_finishing: 220, machinability_factor: 0.7,
    cp_J_kgK: 477, E_GPa: 210,
  },
  tool_steel: {
    name: "Tool Steel (D2/H13)", iso_group: "H",
    kc1_1: 3000, mc: 0.28, taylor_C: 200, taylor_n: 0.20,
    k_thermal: 25, sigma_y_MPa: 1200, density_kg_m3: 7800, hardness_HB: 500,
    vc_base_roughing: 80, vc_base_finishing: 120, machinability_factor: 0.35,
    cp_J_kgK: 460, E_GPa: 210,
  },

  // ISO M — Stainless
  stainless_304: {
    name: "Stainless Steel 304", iso_group: "M",
    kc1_1: 2100, mc: 0.25, taylor_C: 250, taylor_n: 0.22,
    k_thermal: 16, sigma_y_MPa: 290, density_kg_m3: 7930, hardness_HB: 200,
    vc_base_roughing: 130, vc_base_finishing: 190, machinability_factor: 0.55,
    cp_J_kgK: 500, E_GPa: 193,
  },
  stainless_316: {
    name: "Stainless Steel 316", iso_group: "M",
    kc1_1: 2200, mc: 0.26, taylor_C: 230, taylor_n: 0.21,
    k_thermal: 14, sigma_y_MPa: 310, density_kg_m3: 7960, hardness_HB: 215,
    vc_base_roughing: 120, vc_base_finishing: 170, machinability_factor: 0.50,
    cp_J_kgK: 500, E_GPa: 193,
  },

  // ISO K — Cast Iron
  cast_iron: {
    name: "Gray Cast Iron (GG25)", iso_group: "K",
    kc1_1: 1100, mc: 0.28, taylor_C: 400, taylor_n: 0.28,
    k_thermal: 48, sigma_y_MPa: 250, density_kg_m3: 7200, hardness_HB: 190,
    vc_base_roughing: 250, vc_base_finishing: 350, machinability_factor: 1.2,
    cp_J_kgK: 460, E_GPa: 100,
  },
  ductile_iron: {
    name: "Ductile Iron (GGG50)", iso_group: "K",
    kc1_1: 1350, mc: 0.26, taylor_C: 350, taylor_n: 0.25,
    k_thermal: 36, sigma_y_MPa: 370, density_kg_m3: 7100, hardness_HB: 230,
    vc_base_roughing: 180, vc_base_finishing: 260, machinability_factor: 0.90,
    cp_J_kgK: 460, E_GPa: 170,
  },

  // ISO N — Non-Ferrous
  aluminum_6061: {
    name: "Aluminum 6061-T6", iso_group: "N",
    kc1_1: 700, mc: 0.23, taylor_C: 900, taylor_n: 0.35,
    k_thermal: 167, sigma_y_MPa: 276, density_kg_m3: 2700, hardness_HB: 95,
    vc_base_roughing: 500, vc_base_finishing: 700, machinability_factor: 3.0,
    cp_J_kgK: 896, E_GPa: 69,
  },
  aluminum_7075: {
    name: "Aluminum 7075-T6", iso_group: "N",
    kc1_1: 800, mc: 0.23, taylor_C: 850, taylor_n: 0.33,
    k_thermal: 130, sigma_y_MPa: 503, density_kg_m3: 2810, hardness_HB: 150,
    vc_base_roughing: 400, vc_base_finishing: 600, machinability_factor: 2.5,
    cp_J_kgK: 960, E_GPa: 72,
  },
  brass: {
    name: "Brass (CuZn39Pb3)", iso_group: "N",
    kc1_1: 600, mc: 0.20, taylor_C: 1000, taylor_n: 0.38,
    k_thermal: 120, sigma_y_MPa: 200, density_kg_m3: 8500, hardness_HB: 90,
    vc_base_roughing: 350, vc_base_finishing: 500, machinability_factor: 3.5,
    cp_J_kgK: 380, E_GPa: 100,
  },

  // ISO S — Superalloys
  titanium_gr5: {
    name: "Titanium Ti-6Al-4V (Grade 5)", iso_group: "S",
    kc1_1: 2800, mc: 0.28, taylor_C: 150, taylor_n: 0.18,
    k_thermal: 6.7, sigma_y_MPa: 880, density_kg_m3: 4430, hardness_HB: 334,
    vc_base_roughing: 50, vc_base_finishing: 80, machinability_factor: 0.25,
    cp_J_kgK: 526, E_GPa: 114,
  },
  inconel_718: {
    name: "Inconel 718", iso_group: "S",
    kc1_1: 3000, mc: 0.30, taylor_C: 120, taylor_n: 0.16,
    k_thermal: 11.4, sigma_y_MPa: 1034, density_kg_m3: 8190, hardness_HB: 360,
    vc_base_roughing: 30, vc_base_finishing: 50, machinability_factor: 0.15,
    cp_J_kgK: 435, E_GPa: 205,
  },

  // ISO H — Hardened
  hardened_steel: {
    name: "Hardened Steel (52-58 HRC)", iso_group: "H",
    kc1_1: 3200, mc: 0.30, taylor_C: 200, taylor_n: 0.20,
    k_thermal: 30, sigma_y_MPa: 1600, density_kg_m3: 7800, hardness_HB: 550,
    vc_base_roughing: 60, vc_base_finishing: 100, machinability_factor: 0.20,
    cp_J_kgK: 450, E_GPa: 210,
  },
};

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
export function kienzleForce(kc1_1: number, mc: number, ap: number, fz: number): number {
  if (fz <= 0 || ap <= 0) return 0;
  const h = Math.max(fz, 0.001); // Prevent division issues at very small feeds
  const kc = kc1_1 * Math.pow(h, -mc); // Specific cutting force [N/mm²]
  return kc * ap * h; // Fc = kc × b × h = kc1.1 × b × h^(1-mc) [N]
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
export function taylorLife(C: number, n: number, Vc: number): number {
  if (Vc <= 0 || C <= 0 || n <= 0) return 9999;
  return Math.pow(C / Vc, 1 / n);
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
