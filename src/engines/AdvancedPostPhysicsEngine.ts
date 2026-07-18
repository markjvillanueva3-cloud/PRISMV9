/**
 * PRISM Manufacturing Intelligence - Advanced Post-Physics Engine
 * POST-ULT-MS13: Advanced Physics Integration Engine
 *
 * Consolidates MS13 U01-U06:
 *   U01 ConstitutiveModelIntegration  — Johnson-Cook flow stress model
 *   U02 OxleyPredictiveIntegration    — Analytical chip formation / shear plane angle
 *   U03 ProcessDampingIntegration     — Low-speed process damping, stable-region extension
 *   U04 CrossPhysicsCoupling          — Force↔thermal↔wear↔deflection coupled iteration
 *   U05 StochasticForceModel          — Monte Carlo force / temp / wear uncertainty bands
 *   U06 SurfaceIntegrityPredictor     — Residual stress, white layer, work hardening
 *
 * References:
 *   Johnson & Cook (1983) "A constitutive model and data for metals"
 *   Oxley (1989) "Mechanics of Machining"
 *   Merchant (1945) "Mechanics of the Metal Cutting Process"
 *   Altintas & Budak (1995) "Analytical prediction of stability lobes"
 *   Tlusty & Ismail (1981) "Basic non-linearity in machining chatter"
 *   Sima & Özel (2010) modified JC for Ti-6Al-4V
 *
 * @version 1.0.0  POST-ULT-MS13
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Advanced Physics Input configuration/data structure. */
export interface AdvancedPhysicsInput {
  material: string;
  material_iso: string;
  hardness_hrc?: number;
  tool_diameter_mm: number;
  tool_flutes: number;
  rpm: number;
  feed_mmmin: number;
  doc_mm: number;
  woc_mm: number;
  tool_rake_deg?: number;
  tool_wear_vb_mm?: number;
  enable_jc?: boolean;
  enable_oxley?: boolean;
  enable_process_damping?: boolean;
  enable_coupling?: boolean;
  enable_stochastic?: boolean;
  enable_surface_integrity?: boolean;
  monte_carlo_n?: number;
  coupling_max_iterations?: number;
}

/** Advanced Physics Result configuration/data structure. */
export interface AdvancedPhysicsResult {
  johnson_cook?: {
    flow_stress_MPa: number;
    strain: number;
    strain_rate: number;
    temperature_ratio: number;
  };
  oxley?: {
    shear_angle_deg: number;
    cutting_force_N: number;
    thrust_force_N: number;
    chip_thickness_ratio: number;
  };
  process_damping?: {
    damping_coefficient: number;
    stability_extension_percent: number;
    stable_at_low_speed: boolean;
  };
  coupled?: CoupledResult;
  stochastic?: {
    force_mean: number;
    force_std: number;
    force_ci95: [number, number];
    temp_ci95: [number, number];
    wear_ci95: [number, number];
  };
  surface_integrity?: {
    residual_stress: "tensile" | "compressive" | "mixed";
    white_layer_risk: "none" | "low" | "medium" | "high";
    work_hardening_depth_um: number;
    recommendations: string[];
  };
  meta: {
    engine: string;
    version: string;
    units_computed: string[];
    warnings: string[];
  };
}

/** Coupled Result configuration/data structure (U04). */
export interface CoupledResult {
  iterations: number;
  converged: boolean;
  initial: { force_N: number; temp_C: number; wear_mm: number; deflection_mm: number };
  final: { force_N: number; temp_C: number; wear_mm: number; deflection_mm: number };
  force_increase_percent: number;
}

// ============================================================================
// JOHNSON-COOK MATERIAL DATABASE (U01)
// ============================================================================

interface JCParams {
  A: number;   // MPa — initial yield stress
  B: number;   // MPa — strain hardening coefficient
  n: number;   // strain hardening exponent
  C: number;   // strain rate sensitivity
  m: number;   // thermal softening exponent
  T_melt_C: number;
  T_ref_C: number;
  eps_dot_ref: number; // reference strain rate (s^-1)
}

const JC_DATABASE: Record<string, JCParams> = {
  // Titanium alloys
  "Ti-6Al-4V":   { A: 1098, B: 1092, n: 0.93, C: 0.014, m: 1.10, T_melt_C: 1660, T_ref_C: 25, eps_dot_ref: 1.0 },
  "Ti-6Al-4V-ELI": { A: 1098, B: 1092, n: 0.93, C: 0.014, m: 1.10, T_melt_C: 1660, T_ref_C: 25, eps_dot_ref: 1.0 },
  "Ti-5Al-2.5Sn": { A: 896,  B: 656,  n: 0.50, C: 0.028, m: 0.80, T_melt_C: 1650, T_ref_C: 25, eps_dot_ref: 1.0 },

  // Steels
  "AISI 4340":   { A: 792,  B: 510,  n: 0.26, C: 0.014, m: 1.03, T_melt_C: 1520, T_ref_C: 25, eps_dot_ref: 1.0 },
  "AISI 4140":   { A: 655,  B: 477,  n: 0.27, C: 0.012, m: 1.00, T_melt_C: 1510, T_ref_C: 25, eps_dot_ref: 1.0 },
  "AISI 1045":   { A: 553,  B: 600,  n: 0.23, C: 0.013, m: 1.00, T_melt_C: 1490, T_ref_C: 25, eps_dot_ref: 1.0 },
  "AISI 304":    { A: 310,  B: 1000, n: 0.65, C: 0.070, m: 1.00, T_melt_C: 1400, T_ref_C: 25, eps_dot_ref: 1.0 },
  "AISI 316L":   { A: 305,  B: 1161, n: 0.61, C: 0.010, m: 0.85, T_melt_C: 1375, T_ref_C: 25, eps_dot_ref: 1.0 },
  "H13":         { A: 1200, B: 700,  n: 0.20, C: 0.020, m: 1.00, T_melt_C: 1427, T_ref_C: 25, eps_dot_ref: 1.0 },
  "D2 Tool Steel": { A: 1400, B: 750, n: 0.22, C: 0.022, m: 1.05, T_melt_C: 1421, T_ref_C: 25, eps_dot_ref: 1.0 },

  // Aluminum alloys
  "6061-T6":     { A: 324,  B: 114,  n: 0.42, C: 0.002, m: 1.34, T_melt_C: 652,  T_ref_C: 25, eps_dot_ref: 1.0 },
  "7075-T6":     { A: 520,  B: 477,  n: 0.52, C: 0.001, m: 1.61, T_melt_C: 635,  T_ref_C: 25, eps_dot_ref: 1.0 },
  "2024-T351":   { A: 352,  B: 440,  n: 0.42, C: 0.0083,m: 1.70, T_melt_C: 638,  T_ref_C: 25, eps_dot_ref: 1.0 },
  "5052-H32":    { A: 193,  B: 204,  n: 0.36, C: 0.001, m: 1.50, T_melt_C: 649,  T_ref_C: 25, eps_dot_ref: 1.0 },
  "MIC-6":       { A: 280,  B: 120,  n: 0.40, C: 0.002, m: 1.30, T_melt_C: 640,  T_ref_C: 25, eps_dot_ref: 1.0 },

  // Nickel alloys
  "Inconel 718": { A: 1241, B: 622,  n: 0.652,C: 0.034, m: 1.30, T_melt_C: 1336, T_ref_C: 25, eps_dot_ref: 1.0 },
  "Inconel 625": { A: 775,  B: 828,  n: 0.706,C: 0.009, m: 1.09, T_melt_C: 1350, T_ref_C: 25, eps_dot_ref: 1.0 },
  "Hastelloy C-276": { A: 858, B: 1183, n: 0.70, C: 0.012, m: 1.25, T_melt_C: 1370, T_ref_C: 25, eps_dot_ref: 1.0 },
  "Waspaloy":    { A: 1006, B: 1130, n: 0.51, C: 0.020, m: 1.20, T_melt_C: 1330, T_ref_C: 25, eps_dot_ref: 1.0 },

  // Copper alloys
  "C10100":      { A: 90,   B: 292,  n: 0.31, C: 0.025, m: 1.09, T_melt_C: 1083, T_ref_C: 25, eps_dot_ref: 1.0 },
  "C36000":      { A: 195,  B: 264,  n: 0.34, C: 0.020, m: 1.05, T_melt_C: 900,  T_ref_C: 25, eps_dot_ref: 1.0 },
};

/** Kienzle specific cutting force constants by material group */
interface KienzleParams { kc11: number; mc: number; }
const KIENZLE_DB: Record<string, KienzleParams> = {
  aluminum:  { kc11: 700,  mc: 0.23 },
  steel:     { kc11: 1800, mc: 0.25 },
  stainless: { kc11: 2100, mc: 0.25 },
  titanium:  { kc11: 2800, mc: 0.28 },
  nickel:    { kc11: 2800, mc: 0.28 },
  cast_iron: { kc11: 1100, mc: 0.28 },
  copper:    { kc11: 900,  mc: 0.25 },
};

// ============================================================================
// HELPERS
// ============================================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Resolve JC params from material name, with fuzzy fallback. */
function resolveJC(material: string, material_iso: string): JCParams | null {
  const candidates = [material, material_iso];
  for (const c of candidates) {
    if (JC_DATABASE[c]) return JC_DATABASE[c];
    // Partial match
    const key = Object.keys(JC_DATABASE).find(k =>
      c.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(c.toLowerCase().split(" ")[0])
    );
    if (key) return JC_DATABASE[key];
  }
  return null;
}

/** Resolve Kienzle group from ISO material code. */
function resolveKienzle(material_iso: string): KienzleParams {
  const iso = material_iso.toUpperCase();
  if (iso.startsWith("N")) return KIENZLE_DB.nickel;
  if (iso.startsWith("S")) return KIENZLE_DB.stainless;
  if (iso.startsWith("P")) return KIENZLE_DB.steel;
  if (iso.startsWith("K")) return KIENZLE_DB.cast_iron;
  if (iso.startsWith("H")) return KIENZLE_DB.steel; // hardened steel
  if (iso.startsWith("M")) return KIENZLE_DB.stainless;
  if (iso.startsWith("O")) return KIENZLE_DB.copper;

  const mat = material_iso.toLowerCase();
  if (mat.includes("ti") || mat.includes("titan")) return KIENZLE_DB.titanium;
  if (mat.includes("al") || mat.includes("alum") || mat.includes("6061") || mat.includes("7075")) return KIENZLE_DB.aluminum;
  if (mat.includes("cu") || mat.includes("brass") || mat.includes("bronze")) return KIENZLE_DB.copper;
  return KIENZLE_DB.steel; // safe fallback
}

/** Compute cutting speed (m/min) from RPM and diameter. */
function vcFromRPM(rpm: number, diameter_mm: number): number {
  return (Math.PI * diameter_mm * rpm) / 1000;
}

/** Feed per tooth (mm/tooth). */
function fz(feed_mmmin: number, rpm: number, flutes: number): number {
  return feed_mmmin / (rpm * flutes);
}

/** Estimate average chip thickness for milling: fz * sqrt(ae/D) approximation. */
function avgChipThickness(fz_mm: number, ae_mm: number, D_mm: number): number {
  return fz_mm * Math.sqrt(ae_mm / D_mm);
}

/** Box-Muller normal sample. */
function randNorm(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * z;
}

/** Percentile from sorted array. */
function pct(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ============================================================================
// U01 — JOHNSON-COOK CONSTITUTIVE MODEL
// ============================================================================

/**
 * Computes Johnson-Cook flow stress:
 *   σ = (A + B·ε^n)(1 + C·ln(ε̇/ε̇₀))(1 - T*^m)
 *
 * Strain ε is estimated from chip geometry (primary shear zone).
 * Strain rate ε̇ estimated from cutting speed and shear zone thickness.
 * Temperature T* = (T_cut - T_ref)/(T_melt - T_ref) (homologous).
 */
function computeJohnsonCook(
  inp: AdvancedPhysicsInput,
  jc: JCParams,
  vc_mpm: number
): NonNullable<AdvancedPhysicsResult["johnson_cook"]> {
  const rake_rad = ((inp.tool_rake_deg ?? 6) * Math.PI) / 180;

  // Merchant shear plane angle estimate (used for strain calc)
  const friction_angle_rad = 0.436; // ~25 deg typical
  const phi = Math.PI / 4 - friction_angle_rad / 2 + rake_rad / 2;
  const phi_clamp = clamp(phi, 0.15, 1.1);

  // Primary shear strain: ε = cos(α)/[2·sin(φ)·cos(φ-α)]
  const alpha = rake_rad;
  const strain = Math.cos(alpha) / (2 * Math.sin(phi_clamp) * Math.cos(phi_clamp - alpha));
  const strain_clamped = clamp(strain, 0.5, 6.0);

  // Shear zone thickness ~ 0.025 × uncut chip thickness
  const t1_mm = fz(inp.feed_mmmin, inp.rpm, inp.tool_flutes); // uncut chip thickness approx
  const t1 = Math.max(t1_mm, 0.005);
  const h_shear_m = 0.025 * t1 * 1e-3; // shear zone thickness in meters

  // Shear velocity: Vs = Vc·cos(α)/cos(φ-α)
  const vc_ms = vc_mpm / 60;
  const Vs = vc_ms * Math.cos(alpha) / Math.cos(phi_clamp - alpha);

  // Strain rate: ε̇ = Vs / h_shear
  const strain_rate = clamp(Vs / Math.max(h_shear_m, 1e-6), 1e3, 1e8);

  // Temperature estimate: Loewen-Shaw simplified
  // T_cut ≈ 0.4 × Vc^0.44 × (kc / rho_cp)^0.56  [simplified]
  // Use empirical: T_cut ~ T_ref + 0.1 × Vc[m/min]^0.7 × kc1^0.4
  const kienzle = resolveKienzle(inp.material_iso);
  const T_cut_C = jc.T_ref_C + 0.12 * Math.pow(vc_mpm, 0.72) * Math.pow(kienzle.kc11, 0.38);
  const T_hom = clamp(
    (T_cut_C - jc.T_ref_C) / (jc.T_melt_C - jc.T_ref_C),
    0, 0.98
  );

  // Johnson-Cook: σ = (A + B·ε^n)(1 + C·ln(ε̇/ε̇₀))(1 - T*^m)
  const term1 = jc.A + jc.B * Math.pow(strain_clamped, jc.n);
  const sr_ratio = Math.max(strain_rate / jc.eps_dot_ref, 1.0);
  const term2 = 1 + jc.C * Math.log(sr_ratio);
  const term3 = 1 - Math.pow(T_hom, jc.m);
  const flow_stress = clamp(term1 * term2 * term3, 50, 4000);

  return {
    flow_stress_MPa: Math.round(flow_stress * 10) / 10,
    strain: Math.round(strain_clamped * 1000) / 1000,
    strain_rate: Math.round(strain_rate),
    temperature_ratio: Math.round(T_hom * 1000) / 1000,
  };
}

// ============================================================================
// U02 — OXLEY PREDICTIVE CHIP FORMATION
// ============================================================================

/**
 * Oxley's predictive machining theory.
 * Shear plane angle from Merchant minimum energy principle:
 *   φ = π/4 - β/2 + α/2
 *
 * Forces:
 *   Fs = τ_s × t1 × w / sin(φ)
 *   Fc = Fs × cos(β - α) / cos(φ + β - α)
 *   Ft = Fs × sin(β - α) / cos(φ + β - α)
 *
 * τ_s = flow_stress / √3 (von Mises)
 * Friction angle β from material empirics.
 */
function computeOxley(
  inp: AdvancedPhysicsInput,
  jc_result?: NonNullable<AdvancedPhysicsResult["johnson_cook"]>
): NonNullable<AdvancedPhysicsResult["oxley"]> {
  const rake_deg = inp.tool_rake_deg ?? 6;
  const alpha = (rake_deg * Math.PI) / 180;

  // Friction angle: empirical from material group
  // β = friction angle = atan(μ), typical μ: Ti~0.7, steel~0.6, Al~0.4
  const iso = inp.material_iso.toUpperCase();
  let mu = 0.55;
  if (iso.startsWith("N")) mu = 0.75;
  else if (iso.startsWith("S")) mu = 0.65;
  else if (iso.startsWith("P") || iso.startsWith("H")) mu = 0.58;
  else if (iso.startsWith("K")) mu = 0.50;
  else if (inp.material_iso.toLowerCase().includes("ti")) mu = 0.70;
  else if (inp.material_iso.toLowerCase().includes("al")) mu = 0.40;

  // Wear increases friction
  const vb = inp.tool_wear_vb_mm ?? 0;
  mu += vb * 0.15;
  mu = clamp(mu, 0.1, 1.0);

  const beta = Math.atan(mu);

  // Merchant shear angle
  const phi = Math.PI / 4 - beta / 2 + alpha / 2;
  const phi_clamped = clamp(phi, 0.15, Math.PI / 3);

  // Shear flow stress: use JC if available, else Kienzle estimate
  let tau_s_MPa: number;
  if (jc_result) {
    tau_s_MPa = jc_result.flow_stress_MPa / Math.sqrt(3);
  } else {
    const kienzle = resolveKienzle(inp.material_iso);
    tau_s_MPa = (kienzle.kc11 * 0.6) / Math.sqrt(3);
  }

  // Chip geometry
  const t1_mm = fz(inp.feed_mmmin, inp.rpm, inp.tool_flutes);
  const width_mm = inp.doc_mm; // axial depth = width for side milling approx
  const t1 = Math.max(t1_mm, 0.001);
  const w = Math.max(width_mm, 0.1);

  // Shear force
  const Fs_N = (tau_s_MPa * 1e6) * (t1 * 1e-3) * (w * 1e-3) / Math.sin(phi_clamped);

  // Cutting and thrust forces
  const denom = Math.cos(phi_clamped + beta - alpha);
  const Fc_N = denom > 0.01
    ? Fs_N * Math.cos(beta - alpha) / denom
    : Fs_N * 1.5;
  const Ft_N = denom > 0.01
    ? Fs_N * Math.sin(beta - alpha) / denom
    : Fs_N * 0.6;

  // Chip thickness ratio: r = t1/t2 = sin(φ)/cos(φ-α)
  const chip_ratio = Math.sin(phi_clamped) / Math.cos(phi_clamped - alpha);

  return {
    shear_angle_deg: Math.round(phi_clamped * (180 / Math.PI) * 10) / 10,
    cutting_force_N: Math.round(Math.max(Fc_N, 0) * 10) / 10,
    thrust_force_N: Math.round(Math.max(Ft_N, 0) * 10) / 10,
    chip_thickness_ratio: Math.round(chip_ratio * 1000) / 1000,
  };
}

// ============================================================================
// U03 — PROCESS DAMPING
// ============================================================================

/**
 * Process damping at low cutting speeds.
 *
 * Physics: At low Vc, the tool flank contacts the undulated workpiece surface,
 * generating a velocity-dependent force opposing vibration. This adds viscous
 * damping to the system, extending stable cutting depth below the 1st lobe.
 *
 * Damping coefficient: Cd = C_pd × w × (D_tool / Vc)
 * where C_pd ~ 1.5e-4 N/m (experimental, carbide/steel)
 *
 * Stability extension: Δb_lim = 2·ζ_pd·k_s / |Λ_R|
 * Simplified: stable_extension ≈ 40-80% below critical speed.
 *
 * Critical speed threshold: Vc_crit = π × D × n_lobe / (60 × z)
 * Typically Vc < 60 m/min for steel, < 150 m/min for aluminum.
 */
function computeProcessDamping(
  inp: AdvancedPhysicsInput,
  vc_mpm: number
): NonNullable<AdvancedPhysicsResult["process_damping"]> {
  // Low-speed threshold by material (m/min)
  const iso = inp.material_iso.toUpperCase();
  let vc_thresh = 60;
  if (iso.startsWith("N") || inp.material_iso.toLowerCase().includes("ti")) vc_thresh = 40;
  else if (inp.material_iso.toLowerCase().includes("al")) vc_thresh = 150;
  else if (iso.startsWith("K")) vc_thresh = 80;

  const in_damping_zone = vc_mpm < vc_thresh;
  const speed_ratio = vc_mpm / vc_thresh; // 0..1 = deeper in damping zone at 0

  // Damping coefficient: stronger at very low speed, decays as speed rises
  // Cd = Cd_max × (1 - Vc/Vc_crit)^1.5
  const C_pd_max = 1.8e-4; // N·s/mm
  const factor = in_damping_zone ? Math.pow(1 - speed_ratio, 1.5) : 0;
  const Cd = C_pd_max * factor;

  // Stability extension: 0-75%, higher at lower speed, also more benefit with larger diameter
  const diameter_factor = clamp(inp.tool_diameter_mm / 20, 0.5, 2.0);
  const extension_pct = in_damping_zone
    ? clamp(factor * 75 * diameter_factor, 0, 80)
    : 0;

  return {
    damping_coefficient: Math.round(Cd * 1e6) / 1e6, // N·s/mm
    stability_extension_percent: Math.round(extension_pct * 10) / 10,
    stable_at_low_speed: in_damping_zone && extension_pct > 10,
  };
}

// ============================================================================
// U04 — CROSS-PHYSICS COUPLING
// ============================================================================

/**
 * Coupled force↔thermal↔wear↔deflection iteration.
 *
 * Coupling chain:
 *   1. Fc from Kienzle/Oxley
 *   2. T_cut from Loewen-Shaw (depends on Fc, Vc)
 *   3. Wear from Taylor extended (depends on T_cut, Vc)  → increases kc by κ_w
 *   4. Deflection from cantilever beam (depends on Fc)
 *   5. Effective DOC = doc_mm + deflection → recalculate Fc
 *   Iterate until |ΔFc/Fc| < 0.01 (1%)
 *
 * Tool stiffness (cantilever): k = 3·E·I / L^3
 *   E_carbide = 620 GPa
 *   I = π·D^4 / 64 (circular cross-section)
 *   L = 3×D (assumed overhang = 3D)
 */
function computeCoupled(
  inp: AdvancedPhysicsInput,
  vc_mpm: number
): CoupledResult {
  const maxIter = inp.coupling_max_iterations ?? 10;
  const kienzle = resolveKienzle(inp.material_iso);

  // Tool stiffness
  const D_m = inp.tool_diameter_mm * 1e-3;
  const I_m4 = (Math.PI * Math.pow(D_m, 4)) / 64;
  const L_m = 3 * D_m; // overhang = 3D
  const E_carbide_Pa = 620e9;
  const k_tool_Npm = (3 * E_carbide_Pa * I_m4) / Math.pow(L_m, 3);
  const k_tool_Nmm = k_tool_Npm * 1e-3; // N/mm

  // Base feed per tooth and chip thickness
  const fz_mm = fz(inp.feed_mmmin, inp.rpm, inp.tool_flutes);
  const hm_mm = avgChipThickness(fz_mm, inp.woc_mm, inp.tool_diameter_mm);

  function calcForce(doc_eff: number): number {
    const kc = kienzle.kc11 * Math.pow(Math.max(hm_mm, 0.001), -kienzle.mc);
    return kc * hm_mm * doc_eff; // simplified: Fc = kc × hm × b
  }

  function calcTemp(Fc_N: number): number {
    // Loewen-Shaw empirical: T = C_t × (Fc × Vc / (w × t1 × rho_cp))^0.5
    // Simplified: T ≈ 0.25 × (Fc × Vc_mpm)^0.45
    return 25 + 0.28 * Math.pow(Math.max(Fc_N * vc_mpm, 1), 0.45);
  }

  function calcWear(T_C: number, t_min: number = 10): number {
    // Extended Taylor wear: Vb ≈ C_w × T_cut^2.0 × t^0.3 / Vc^0.7
    const C_w = 5e-8;
    return clamp(C_w * Math.pow(Math.max(T_C, 25), 2.0) * Math.pow(t_min, 0.3) / Math.pow(Math.max(vc_mpm, 1), 0.7), 0, 0.5);
  }

  function calcDeflection(Fc_N: number): number {
    return Fc_N / k_tool_Nmm; // mm
  }

  // Wear multiplier: worn tool → higher kc by ~20% per 0.1mm Vb
  function wearMultiplier(vb_mm: number): number {
    return 1 + vb_mm * 2.0;
  }

  let doc_eff = inp.doc_mm;
  let Fc = calcForce(doc_eff);
  const Fc_initial = Fc;
  let T = calcTemp(Fc);
  let vb = inp.tool_wear_vb_mm ?? calcWear(T);
  let defl = calcDeflection(Fc);

  const initial = {
    force_N: Math.round(Fc * 10) / 10,
    temp_C: Math.round(T * 10) / 10,
    wear_mm: Math.round(vb * 10000) / 10000,
    deflection_mm: Math.round(defl * 10000) / 10000,
  };

  let iterations = 0;
  let converged = false;

  for (let i = 0; i < maxIter; i++) {
    iterations++;
    const Fc_prev = Fc;

    // Update effective DOC with deflection (deflection increases apparent DOC)
    doc_eff = inp.doc_mm + defl * 0.5; // partial engagement correction

    // Recalculate force with wear multiplier
    const w_mult = wearMultiplier(vb);
    Fc = calcForce(doc_eff) * w_mult;

    // Update thermal, wear, deflection
    T = calcTemp(Fc);
    vb = Math.max(inp.tool_wear_vb_mm ?? 0, calcWear(T));
    defl = calcDeflection(Fc);

    const rel_change = Math.abs(Fc - Fc_prev) / Math.max(Fc_prev, 1);
    if (rel_change < 0.01) {
      converged = true;
      break;
    }
  }

  const force_increase_pct = ((Fc - Fc_initial) / Math.max(Fc_initial, 1)) * 100;

  return {
    iterations,
    converged,
    initial,
    final: {
      force_N: Math.round(Fc * 10) / 10,
      temp_C: Math.round(T * 10) / 10,
      wear_mm: Math.round(vb * 10000) / 10000,
      deflection_mm: Math.round(defl * 10000) / 10000,
    },
    force_increase_percent: Math.round(force_increase_pct * 10) / 10,
  };
}

// ============================================================================
// U05 — STOCHASTIC FORCE MODEL (MONTE CARLO)
// ============================================================================

/**
 * Monte Carlo force uncertainty propagation.
 *
 * Sources of scatter:
 *   - Material hardness ±5%  → kc1.1 scales as hardness^0.5
 *   - kc1.1 ±10% direct variation
 *   - Tool runout ±0.01mm → effective fz variation
 *   - Random walk component for realistic time-domain variance
 *
 * Outputs: mean, std, 95% CI for force, temperature, and wear.
 */
function computeStochastic(
  inp: AdvancedPhysicsInput,
  vc_mpm: number
): NonNullable<AdvancedPhysicsResult["stochastic"]> {
  const N = inp.monte_carlo_n ?? 200;
  const kienzle = resolveKienzle(inp.material_iso);
  const fz_mm = fz(inp.feed_mmmin, inp.rpm, inp.tool_flutes);
  const nominal_hm = avgChipThickness(fz_mm, inp.woc_mm, inp.tool_diameter_mm);

  const forces: number[] = [];
  const temps: number[] = [];
  const wears: number[] = [];

  for (let i = 0; i < N; i++) {
    // Hardness scatter → kc1.1 scatter
    const hardness_factor = randNorm(1.0, 0.025); // ±5% 2σ
    const kc11_scatter = randNorm(kienzle.kc11, kienzle.kc11 * 0.05) * hardness_factor;

    // Runout scatter on effective fz
    const runout_mm = Math.abs(randNorm(0, 0.005)); // ±0.01mm uniform approx
    const fz_eff = Math.max(nominal_hm + runout_mm, 0.001);

    const kc = kc11_scatter * Math.pow(Math.max(fz_eff, 0.001), -kienzle.mc);
    const Fc = kc * fz_eff * inp.doc_mm;

    // Temperature from Fc
    const T = 25 + randNorm(0.28, 0.015) * Math.pow(Math.max(Fc * vc_mpm, 1), 0.45);

    // Wear: C_w scatter ±20%
    const C_w = randNorm(5e-8, 1e-8);
    const vb = clamp(C_w * Math.pow(Math.max(T, 25), 2.0) * Math.pow(10, 0.3) / Math.pow(Math.max(vc_mpm, 1), 0.7), 0, 0.5);

    forces.push(Math.max(Fc, 0));
    temps.push(Math.max(T, 25));
    wears.push(vb);
  }

  forces.sort((a, b) => a - b);
  temps.sort((a, b) => a - b);
  wears.sort((a, b) => a - b);

  const force_mean = forces.reduce((a, b) => a + b, 0) / N;
  const force_variance = forces.reduce((a, b) => a + Math.pow(b - force_mean, 2), 0) / (N - 1);
  const force_std = Math.sqrt(force_variance);

  return {
    force_mean: Math.round(force_mean * 10) / 10,
    force_std: Math.round(force_std * 10) / 10,
    force_ci95: [Math.round(pct(forces, 2.5) * 10) / 10, Math.round(pct(forces, 97.5) * 10) / 10],
    temp_ci95: [Math.round(pct(temps, 2.5) * 10) / 10, Math.round(pct(temps, 97.5) * 10) / 10],
    wear_ci95: [Math.round(pct(wears, 2.5) * 100000) / 100000, Math.round(pct(wears, 97.5) * 100000) / 100000],
  };
}

// ============================================================================
// U06 — SURFACE INTEGRITY PREDICTOR
// ============================================================================

/**
 * Predicts surface integrity outcomes:
 *
 * 1. Residual stress sign:
 *    - Low speed + sharp tool → compressive (mechanical dominates)
 *    - High speed + worn tool → tensile (thermal dominates)
 *    - Threshold speed for balance: material-dependent
 *
 * 2. White layer risk (thermally-induced phase transformation):
 *    - High risk: Vc > 0.7 × Vc_burn AND Vb > 0.15mm
 *    - Burns depend on T_cut > T_austenitize (steel ~720°C, Ti ~800°C)
 *
 * 3. Work hardening depth:
 *    - WH_depth ≈ 5 × (Fc / (k_mat × DOC))^0.5 μm
 *    - Higher in austenitic SS and Ti (low thermal conductivity)
 *
 * References: Jawahir et al. (2011) CIRP Annals, Ulutan & Özel (2011)
 */
function computeSurfaceIntegrity(
  inp: AdvancedPhysicsInput,
  vc_mpm: number,
  jc_result?: NonNullable<AdvancedPhysicsResult["johnson_cook"]>
): NonNullable<AdvancedPhysicsResult["surface_integrity"]> {
  const vb = inp.tool_wear_vb_mm ?? 0;
  const iso = inp.material_iso.toUpperCase();
  const mat_lower = (inp.material + " " + inp.material_iso).toLowerCase();
  const recommendations: string[] = [];

  // Material burn thresholds (°C)
  let T_burn = 720; // steel austenitize
  if (mat_lower.includes("ti")) T_burn = 800;
  else if (mat_lower.includes("al")) T_burn = 400;
  else if (iso.startsWith("N")) T_burn = 900;
  else if (iso.startsWith("S")) T_burn = 700;

  // Estimated cutting temperature
  const kienzle = resolveKienzle(inp.material_iso);
  const fz_mm = fz(inp.feed_mmmin, inp.rpm, inp.tool_flutes);
  const hm = avgChipThickness(fz_mm, inp.woc_mm, inp.tool_diameter_mm);
  const kc = kienzle.kc11 * Math.pow(Math.max(hm, 0.001), -kienzle.mc);
  const Fc_base = kc * hm * inp.doc_mm * (1 + vb * 2.0);
  const T_est = 25 + 0.28 * Math.pow(Math.max(Fc_base * vc_mpm, 1), 0.45);

  // Critical speed for thermal dominance (m/min)
  let vc_thermal_thresh = 80;
  if (mat_lower.includes("ti")) vc_thermal_thresh = 40;
  else if (mat_lower.includes("al")) vc_thermal_thresh = 300;
  else if (iso.startsWith("N")) vc_thermal_thresh = 30;

  // Residual stress determination
  let residual_stress: "tensile" | "compressive" | "mixed";
  const thermal_dominance = vc_mpm / vc_thermal_thresh + vb * 5;
  if (thermal_dominance > 1.5) {
    residual_stress = "tensile";
    recommendations.push("Tensile residual stress detected — reduce Vc or replace worn tool before finishing passes.");
  } else if (thermal_dominance < 0.6) {
    residual_stress = "compressive";
    recommendations.push("Compressive residual stress — favorable for fatigue-critical surfaces.");
  } else {
    residual_stress = "mixed";
    recommendations.push("Mixed residual stress state — consider lower Vc or cryogenic cooling for compressive bias.");
  }

  // White layer risk
  let white_layer_risk: "none" | "low" | "medium" | "high";
  const T_ratio = T_est / T_burn;
  const is_ferrous = iso.startsWith("P") || iso.startsWith("M") || iso.startsWith("H") ||
    mat_lower.includes("steel") || mat_lower.includes("iron");

  if (!is_ferrous && !mat_lower.includes("ti") && !mat_lower.includes("ni")) {
    white_layer_risk = "none";
  } else if (T_ratio < 0.6 && vb < 0.1) {
    white_layer_risk = "none";
  } else if (T_ratio < 0.8 && vb < 0.15) {
    white_layer_risk = "low";
  } else if (T_ratio < 1.0 && vb < 0.25) {
    white_layer_risk = "medium";
    recommendations.push("Medium white layer risk — inspect tool wear, apply flood coolant.");
  } else {
    white_layer_risk = "high";
    recommendations.push("HIGH white layer risk — stop and replace tool immediately. Reduce Vc by 30%.");
    recommendations.push("White layer causes premature fatigue failure in aerospace/medical components.");
  }

  // Work hardening depth (μm)
  // WH_depth ~ 15 × (Fc × (1 + WH_susceptibility)) / (kc × Vc^0.3)
  // WH susceptibility: austenitic SS and Ti are high
  let wh_susceptibility = 1.0;
  if (mat_lower.includes("304") || mat_lower.includes("316") || mat_lower.includes("inconel")) wh_susceptibility = 2.5;
  else if (mat_lower.includes("ti")) wh_susceptibility = 2.0;
  else if (mat_lower.includes("al")) wh_susceptibility = 0.6;
  else if (mat_lower.includes("copper") || mat_lower.includes("brass")) wh_susceptibility = 0.5;

  const wh_depth_um = clamp(
    (15 * Fc_base * wh_susceptibility) / (Math.max(kc, 100) * Math.pow(Math.max(vc_mpm, 1), 0.3)),
    2, 500
  );

  if (wh_depth_um > 100) {
    recommendations.push(`Work hardening depth ${Math.round(wh_depth_um)}μm — may affect tolerances in subsequent operations.`);
  }

  // Aerospace/medical flag
  const is_critical = inp.hardness_hrc !== undefined && inp.hardness_hrc > 40;
  if (is_critical) {
    recommendations.push("Safety-critical part detected (HRC>40) — perform residual stress measurement (XRD) after machining.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Surface integrity within acceptable bounds for general machining.");
  }

  return {
    residual_stress,
    white_layer_risk,
    work_hardening_depth_um: Math.round(wh_depth_um),
    recommendations,
  };
}

// ============================================================================
// ENGINE DISPATCH
// ============================================================================

function buildMeta(units: string[], warnings: string[]) {
  return {
    engine: "AdvancedPostPhysicsEngine",
    version: "1.0.0",
    units_computed: units,
    warnings,
  };
}

/** Run all requested physics models and assemble result. */
function runFullAnalysis(inp: AdvancedPhysicsInput): AdvancedPhysicsResult {
  const warnings: string[] = [];
  const units: string[] = [];

  const vc_mpm = vcFromRPM(inp.rpm, inp.tool_diameter_mm);
  if (vc_mpm < 1) warnings.push("Cutting speed < 1 m/min — very low speed, process damping likely dominant.");
  if (inp.doc_mm <= 0) warnings.push("DOC is zero or negative — forces will be near zero.");

  const result: AdvancedPhysicsResult = { meta: buildMeta(units, warnings) };

  // Resolve JC params
  const jc_params = resolveJC(inp.material, inp.material_iso);
  if ((inp.enable_jc ?? true) && !jc_params) {
    warnings.push(`No Johnson-Cook data for '${inp.material}' — JC model skipped.`);
  }

  // U01 Johnson-Cook
  if ((inp.enable_jc ?? true) && jc_params) {
    result.johnson_cook = computeJohnsonCook(inp, jc_params, vc_mpm);
    units.push("U01:JohnsonCook");
  }

  // U02 Oxley
  if (inp.enable_oxley ?? true) {
    result.oxley = computeOxley(inp, result.johnson_cook);
    units.push("U02:Oxley");
  }

  // U03 Process Damping
  if (inp.enable_process_damping ?? true) {
    result.process_damping = computeProcessDamping(inp, vc_mpm);
    units.push("U03:ProcessDamping");
  }

  // U04 Coupled
  if (inp.enable_coupling ?? true) {
    result.coupled = computeCoupled(inp, vc_mpm);
    units.push("U04:CrossPhysicsCoupling");
    if (!result.coupled.converged) {
      warnings.push(`Coupled iteration did not converge in ${result.coupled.iterations} iterations — result is best estimate.`);
    }
  }

  // U05 Stochastic
  if (inp.enable_stochastic ?? true) {
    result.stochastic = computeStochastic(inp, vc_mpm);
    units.push(`U05:Stochastic(N=${inp.monte_carlo_n ?? 200})`);
  }

  // U06 Surface Integrity
  if (inp.enable_surface_integrity ?? true) {
    result.surface_integrity = computeSurfaceIntegrity(inp, vc_mpm, result.johnson_cook);
    units.push("U06:SurfaceIntegrity");
  }

  result.meta = buildMeta(units, warnings);
  return result;
}

/** Main engine handler */
function handle(action: string, params: Record<string, unknown>): unknown {
  const inp = params as unknown as AdvancedPhysicsInput;
  const vc_mpm = vcFromRPM(inp.rpm ?? 1000, inp.tool_diameter_mm ?? 10);

  switch (action) {
    case "full_analysis":
      return runFullAnalysis(inp);

    case "johnson_cook": {
      const jc = resolveJC(inp.material ?? "", inp.material_iso ?? "");
      if (!jc) return { error: `No Johnson-Cook data for material: ${inp.material}` };
      return {
        johnson_cook: computeJohnsonCook(inp, jc, vc_mpm),
        meta: buildMeta(["U01:JohnsonCook"], []),
      };
    }

    case "oxley": {
      const jc = resolveJC(inp.material ?? "", inp.material_iso ?? "");
      const jc_result = jc ? computeJohnsonCook(inp, jc, vc_mpm) : undefined;
      return {
        oxley: computeOxley(inp, jc_result),
        meta: buildMeta(["U02:Oxley"], []),
      };
    }

    case "process_damping":
      return {
        process_damping: computeProcessDamping(inp, vc_mpm),
        meta: buildMeta(["U03:ProcessDamping"], []),
      };

    case "coupled_analysis":
      return {
        coupled: computeCoupled(inp, vc_mpm),
        meta: buildMeta(["U04:CrossPhysicsCoupling"], []),
      };

    case "stochastic":
      return {
        stochastic: computeStochastic(inp, vc_mpm),
        meta: buildMeta([`U05:Stochastic(N=${inp.monte_carlo_n ?? 200})`], []),
      };

    case "surface_integrity": {
      const jc2 = resolveJC(inp.material ?? "", inp.material_iso ?? "");
      const jc2_result = jc2 ? computeJohnsonCook(inp, jc2, vc_mpm) : undefined;
      return {
        surface_integrity: computeSurfaceIntegrity(inp, vc_mpm, jc2_result),
        meta: buildMeta(["U06:SurfaceIntegrity"], []),
      };
    }

    default:
      return {
        error: `Unknown action: ${action}`,
        available_actions: ["full_analysis", "johnson_cook", "oxley", "process_damping", "coupled_analysis", "stochastic", "surface_integrity"],
      };
  }
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export const advancedPostPhysicsEngine = {
  name: "AdvancedPostPhysicsEngine",
  version: "1.0.0",
  milestone: "POST-ULT-MS13",
  description: "Advanced Physics Integration Engine: Johnson-Cook constitutive model, Oxley predictive chip formation, process damping, cross-physics coupling, Monte Carlo stochastic force, and surface integrity prediction.",
  actions: [
    "full_analysis",
    "johnson_cook",
    "oxley",
    "process_damping",
    "coupled_analysis",
    "stochastic",
    "surface_integrity",
  ] as const,

  handle(action: string, params: Record<string, unknown>): unknown {
    try {
      log.info(`[AdvancedPostPhysicsEngine] action=${action}`);
      return handle(action, params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`[AdvancedPostPhysicsEngine] ${action} failed: ${msg}`);
      return { error: msg, action };
    }
  },
};
