/**
 * FundamentalPhysicsCompletionEngine — Foundational physics models closing last gaps
 *
 * Models: Archard adhesive wear (1953), Merchant shear angle & force circle (1945),
 *         Single-grit grinding mechanics & Jaeger thermal model,
 *         Hertz contact mechanics for tool-work interface
 * References: Archard (1953), Merchant (1945), Lee & Shaffer (1951),
 *             Malkin & Guo (2008), Jaeger (1942), Hertz (1882)
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;

/** Archard wear coefficients for common material pairs. */
const WEAR_COEFFICIENTS: Record<string, number> = {
  carbide_steel: 1e-6,
  hss_steel: 5e-5,
  ceramic_steel: 5e-7,
  cbn_hardened_steel: 1e-7,
  carbide_titanium: 3e-6,
  carbide_aluminum: 2e-6,
};

/** Typical tool hardness values (MPa). */
const TOOL_HARDNESS_MPA: Record<string, number> = {
  carbide: 15000,
  hss: 7500,
  ceramic: 20000,
  cbn: 45000,
};

/** Material-specific friction coefficient ranges (midpoints). */
const MATERIAL_FRICTION: Record<string, number> = {
  steel: 0.65,
  aluminum: 0.4,
  titanium: 0.55,
  stainless: 0.7,
  cast_iron: 0.45,
};

// ─── Types ──────────────────────────────────────────────────────────

export interface ArchardWearInput {
  normal_force_N: number;
  sliding_distance_mm: number;
  hardness_mpa: number;
  wear_coefficient_K?: number;
  material_pair?: "carbide_steel" | "hss_steel" | "ceramic_steel" | "cbn_hardened_steel" | "carbide_titanium" | "carbide_aluminum";
  contact_area_mm2?: number;
}

export interface ArchardWearResult {
  wear_volume_mm3: number;
  wear_depth_mm: number;
  specific_wear_rate: number;
  wear_coefficient_K: number;
  sliding_velocity_effect: number;
  regime: "mild" | "severe";
  flank_wear_equivalent_vb_mm: number;
}

export interface ArchardToolWearInput {
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  depth_mm: number;
  material_hardness_HB: number;
  tool_material: "carbide" | "hss" | "ceramic" | "cbn";
  cutting_time_min: number;
}

export interface ArchardToolWearResult {
  predicted_vb_mm: number;
  time_to_vb_limit_min: number;
  wear_rate_mm_per_min: number;
  archard_vs_taylor_comparison: { archard_vb: number; taylor_vb_trend: string };
}

export interface MerchantShearInput {
  rake_angle_deg: number;
  friction_coefficient: number;
  material_type?: "steel" | "aluminum" | "titanium" | "stainless" | "cast_iron";
}

export interface MerchantShearResult {
  merchant_phi_deg: number;
  lee_shaffer_phi_deg: number;
  chip_compression_ratio: number;
  chip_thickness_ratio: number;
  shear_strain: number;
  shear_velocity_ratio: number;
  chip_velocity_ratio: number;
}

export interface MerchantForceInput {
  shear_strength_mpa: number;
  chip_width_mm: number;
  uncut_chip_thickness_mm: number;
  rake_angle_deg: number;
  friction_coefficient: number;
  cutting_speed_mpm?: number;
}

export interface MerchantForceResult {
  shear_force_N: number;
  cutting_force_N: number;
  thrust_force_N: number;
  friction_force_N: number;
  normal_force_N: number;
  resultant_force_N: number;
  shear_angle_deg: number;
  friction_angle_deg: number;
  specific_cutting_energy_j_mm3: number;
  power_kw: number;
}

export interface SingleGritInput {
  grit_size_mesh: number;
  wheel_speed_mps: number;
  workspeed_mpm: number;
  depth_of_cut_mm: number;
  wheel_diameter_mm: number;
  material_hardness_HB: number;
}

export interface SingleGritResult {
  max_chip_thickness_um: number;
  active_grits_per_mm2: number;
  force_per_grit_N: number;
  contact_arc_length_mm: number;
  material_removal_per_grit_mm3: number;
  specific_grinding_energy_j_mm3: number;
  grinding_ratio_G: number;
}

export interface GrindingThermalInput {
  specific_energy_j_mm3: number;
  workspeed_mpm: number;
  depth_of_cut_mm: number;
  contact_length_mm: number;
  thermal_conductivity_w_mk: number;
  thermal_diffusivity_m2s: number;
  coolant_htc_w_m2k?: number;
}

export interface GrindingThermalResult {
  max_surface_temp_C: number;
  burn_threshold_C: number;
  burn_risk: boolean;
  energy_partition_workpiece: number;
  temper_color_prediction: string;
  safe_mrr_limit_mm3_per_mm_s: number;
}

export interface HertzContactInput {
  normal_force_N: number;
  radius_1_mm: number;
  radius_2_mm?: number;
  E1_gpa: number;
  E2_gpa: number;
  nu1?: number;
  nu2?: number;
}

export interface HertzContactResult {
  contact_radius_mm: number;
  contact_area_mm2: number;
  max_pressure_mpa: number;
  mean_pressure_mpa: number;
  max_shear_stress_mpa: number;
  subsurface_depth_of_max_shear_mm: number;
  deformation_mm: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

class FundamentalPhysicsCompletionEngineImpl {

  // ── Model 1a: Archard Wear ──────────────────────────────────────

  archardWear(params: ArchardWearInput): ArchardWearResult {
    const { normal_force_N, sliding_distance_mm, hardness_mpa } = params;

    // Determine wear coefficient
    let K = params.wear_coefficient_K ?? WEAR_COEFFICIENTS[params.material_pair ?? "carbide_steel"] ?? 1e-6;

    // V = K × F_n × s / H
    const V = (K * normal_force_N * sliding_distance_mm) / hardness_mpa;

    // Specific wear rate k = K / H  (mm³/N·mm)
    const k = K / hardness_mpa;

    // Wear depth from contact area
    const area = params.contact_area_mm2 ?? 1.0;
    const h = V / area;

    // Regime classification: mild if K < 1e-3, severe otherwise
    const regime: "mild" | "severe" = K < 1e-3 ? "mild" : "severe";

    // Sliding velocity effect: approximate as log10-scaled influence
    // In practice, velocity shifts K; here we return a multiplier placeholder
    const slidingVelEffect = 1.0;

    // Flank wear equivalent: approximate as depth over typical flank contact width (~0.5mm)
    const vb = h * Math.min(area, 1.0);

    log.debug(`[FundPhysics] Archard wear: V=${V.toFixed(6)} mm³, K=${K}, regime=${regime}`);

    return {
      wear_volume_mm3: +V.toFixed(8),
      wear_depth_mm: +h.toFixed(6),
      specific_wear_rate: +k.toExponential(4),
      wear_coefficient_K: K,
      sliding_velocity_effect: slidingVelEffect,
      regime,
      flank_wear_equivalent_vb_mm: +vb.toFixed(6),
    };
  }

  // ── Model 1b: Archard Tool Wear ─────────────────────────────────

  archardToolWear(params: ArchardToolWearInput): ArchardToolWearResult {
    const { cutting_speed_mpm, feed_mm_rev, depth_mm, material_hardness_HB, tool_material, cutting_time_min } = params;

    // Tool hardness
    const H_tool = TOOL_HARDNESS_MPA[tool_material] ?? 15000;

    // Material pair key
    const pairKey = tool_material === "cbn" ? "cbn_hardened_steel" : `${tool_material}_steel`;
    const K = WEAR_COEFFICIENTS[pairKey] ?? 1e-6;

    // Specific cutting pressure from hardness (approximate Kienzle: kc ≈ 3.5 × HB)
    const kc = 3.5 * material_hardness_HB;

    // Normal stress on flank face (≈ kc for orthogonal approximation)
    const sigma_n = kc;

    // Sliding distance = Vc × t (convert m/min × min → mm)
    const s = cutting_speed_mpm * 1000 * cutting_time_min;

    // VB ≈ K × σ_n × s / H_tool (simplified Archard flank wear)
    const VB = (K * sigma_n * s) / H_tool;

    // Wear rate
    const wearRate = cutting_time_min > 0 ? VB / cutting_time_min : 0;

    // Time to VB = 0.3 mm
    const timeToLimit = wearRate > 0 ? 0.3 / wearRate : Infinity;

    log.debug(`[FundPhysics] Archard tool wear: VB=${VB.toFixed(4)} mm at t=${cutting_time_min} min`);

    return {
      predicted_vb_mm: +VB.toFixed(6),
      time_to_vb_limit_min: +timeToLimit.toFixed(2),
      wear_rate_mm_per_min: +wearRate.toFixed(8),
      archard_vs_taylor_comparison: {
        archard_vb: +VB.toFixed(6),
        taylor_vb_trend: VB < 0.3 ? "within_steady_state" : "accelerated_wear",
      },
    };
  }

  // ── Model 2a: Merchant Shear Angle ──────────────────────────────

  merchantShearAngle(params: MerchantShearInput): MerchantShearResult {
    const mu = params.friction_coefficient > 0
      ? params.friction_coefficient
      : MATERIAL_FRICTION[params.material_type ?? "steel"] ?? 0.5;
    const gamma = params.rake_angle_deg * DEG; // rake angle in rad
    const beta = Math.atan(mu); // friction angle

    // Merchant: φ = π/4 - β/2 + γ/2
    const phiMerchant = Math.PI / 4 - beta / 2 + gamma / 2;

    // Lee-Shaffer: φ = π/4 - β + γ
    const phiLS = Math.PI / 4 - beta + gamma;

    // Chip compression ratio: r_c = cos(φ - γ) / sin(φ)  (ratio > 1 means chip thicker)
    const rc = Math.cos(phiMerchant - gamma) / Math.sin(phiMerchant);

    // Chip thickness ratio: h_c/h = 1/r_c... actually r_c = sin(φ)/cos(φ-γ) = t/tc
    // chip compression = tc/t = cos(φ-γ)/sin(φ), so chip_thickness_ratio = tc/t
    const chipThicknessRatio = rc;

    // Shear strain: γ_s = cos(γ) / (sin(φ)·cos(φ - γ))
    const shearStrain = Math.cos(gamma) / (Math.sin(phiMerchant) * Math.cos(phiMerchant - gamma));

    // Velocity ratios
    // Shear velocity ratio: Vs/Vc = cos(γ) / cos(φ - γ)
    const shearVelRatio = Math.cos(gamma) / Math.cos(phiMerchant - gamma);

    // Chip velocity ratio: Vchip/Vc = sin(φ) / cos(φ - γ)
    const chipVelRatio = Math.sin(phiMerchant) / Math.cos(phiMerchant - gamma);

    log.debug(`[FundPhysics] Merchant φ=${(phiMerchant / DEG).toFixed(2)}°, Lee-Shaffer φ=${(phiLS / DEG).toFixed(2)}°`);

    return {
      merchant_phi_deg: +(phiMerchant / DEG).toFixed(4),
      lee_shaffer_phi_deg: +(phiLS / DEG).toFixed(4),
      chip_compression_ratio: +rc.toFixed(4),
      chip_thickness_ratio: +chipThicknessRatio.toFixed(4),
      shear_strain: +shearStrain.toFixed(4),
      shear_velocity_ratio: +shearVelRatio.toFixed(4),
      chip_velocity_ratio: +chipVelRatio.toFixed(4),
    };
  }

  // ── Model 2b: Merchant Force Circle ─────────────────────────────

  merchantForceCircle(params: MerchantForceInput): MerchantForceResult {
    const { shear_strength_mpa, chip_width_mm, uncut_chip_thickness_mm, friction_coefficient } = params;
    const gamma = params.rake_angle_deg * DEG;
    const beta = Math.atan(friction_coefficient);
    const phi = Math.PI / 4 - beta / 2 + gamma / 2;

    // Shear plane area: As = b × h / sin(φ)
    const As = (chip_width_mm * uncut_chip_thickness_mm) / Math.sin(phi);

    // Shear force
    const Fs = shear_strength_mpa * As;

    // Cutting force: Fc = Fs × cos(β - γ) / cos(φ + β - γ)
    const Fc = (Fs * Math.cos(beta - gamma)) / Math.cos(phi + beta - gamma);

    // Thrust force: Ft = Fs × sin(β - γ) / cos(φ + β - γ)
    const Ft = (Fs * Math.sin(beta - gamma)) / Math.cos(phi + beta - gamma);

    // Friction force: F = Fc × sin(γ) + Ft × cos(γ)
    const Ff = Fc * Math.sin(gamma) + Ft * Math.cos(gamma);

    // Normal force on rake: N = Fc × cos(γ) - Ft × sin(γ)
    const Nf = Fc * Math.cos(gamma) - Ft * Math.sin(gamma);

    // Resultant
    const R = Math.sqrt(Fc * Fc + Ft * Ft);

    // Specific cutting energy: u = Fc / (b × h)
    const u = Fc / (chip_width_mm * uncut_chip_thickness_mm);

    // Power: P = Fc × Vc / 60000 (kW), Vc in m/min
    const Vc = params.cutting_speed_mpm ?? 100;
    const P = (Fc * Vc) / 60000;

    log.debug(`[FundPhysics] Merchant forces: Fc=${Fc.toFixed(1)} N, Ft=${Ft.toFixed(1)} N`);

    return {
      shear_force_N: +Fs.toFixed(2),
      cutting_force_N: +Fc.toFixed(2),
      thrust_force_N: +Ft.toFixed(2),
      friction_force_N: +Ff.toFixed(2),
      normal_force_N: +Nf.toFixed(2),
      resultant_force_N: +R.toFixed(2),
      shear_angle_deg: +(phi / DEG).toFixed(4),
      friction_angle_deg: +(beta / DEG).toFixed(4),
      specific_cutting_energy_j_mm3: +u.toFixed(2),
      power_kw: +P.toFixed(4),
    };
  }

  // ── Model 3a: Single Grit Mechanics ─────────────────────────────

  singleGritMechanics(params: SingleGritInput): SingleGritResult {
    const { grit_size_mesh, wheel_speed_mps, workspeed_mpm, depth_of_cut_mm, wheel_diameter_mm, material_hardness_HB } = params;

    // Convert workspeed to m/s
    const Vw = workspeed_mpm / 60;
    const Vs = wheel_speed_mps;
    const ae = depth_of_cut_mm;
    const ds = wheel_diameter_mm;

    // Active grit density: C ≈ 4 × (grit_number)^1.5 per mm²
    // (simplified; finer grits have more active points)
    const C = 4 * Math.pow(grit_size_mesh, 1.5);

    // Chip width-to-thickness ratio (typical r ≈ 10-20, use 15)
    const r = 15;

    // Contact arc length: lc = √(ae × ds)
    const lc = Math.sqrt(ae * ds);

    // Maximum undeformed chip thickness:
    // h_max = (4Vw / (Vs × C × r))^0.5 × (ae/ds)^0.25
    const hMax = Math.sqrt((4 * Vw) / (Vs * C * r)) * Math.pow(ae / ds, 0.25);
    const hMaxUm = hMax * 1000; // to μm

    // Specific cutting energy for grinding (empirical, hardness-dependent)
    // u ≈ (30 + 0.08 × HB) J/mm³ typical range 10-100
    const u = 30 + 0.08 * material_hardness_HB;

    // Approximate chip cross-section per grit: A_chip ≈ hMax × hMax × r / 2
    const aChip = (hMax * hMax * r) / 2;

    // Force per grit: Fg = u × A_chip (simplified energy balance)
    const Fg = u * aChip;

    // Material removal per grit
    const mrrPerGrit = aChip * Vs * 1000; // mm³/s ... per single pass
    // Per revolution contribution
    const removalPerGrit = aChip * lc;

    // Grinding ratio G (typical: 5-80 for conventional, 1000+ for CBN)
    // Approximate from hardness: harder materials wear wheel faster
    const G = 5000 / (material_hardness_HB / 200 + 1);

    log.debug(`[FundPhysics] Grit: h_max=${hMaxUm.toFixed(3)} μm, C=${C.toFixed(1)} grits/mm²`);

    return {
      max_chip_thickness_um: +hMaxUm.toFixed(4),
      active_grits_per_mm2: +C.toFixed(2),
      force_per_grit_N: +Fg.toFixed(6),
      contact_arc_length_mm: +lc.toFixed(4),
      material_removal_per_grit_mm3: +removalPerGrit.toFixed(10),
      specific_grinding_energy_j_mm3: +u.toFixed(2),
      grinding_ratio_G: +G.toFixed(2),
    };
  }

  // ── Model 3b: Grinding Thermal (Jaeger) ─────────────────────────

  grindingThermalModel(params: GrindingThermalInput): GrindingThermalResult {
    const { specific_energy_j_mm3, workspeed_mpm, depth_of_cut_mm, contact_length_mm,
            thermal_conductivity_w_mk, thermal_diffusivity_m2s } = params;

    // Convert units
    const Vw = workspeed_mpm / 60; // m/s
    const ae = depth_of_cut_mm / 1000; // m
    const a = contact_length_mm / 1000; // m (half-width of heat source = contact length / 2)
    const halfA = a / 2;
    const k = thermal_conductivity_w_mk;
    const alpha = thermal_diffusivity_m2s;

    // Heat flux: q = u × ae × Vw (W/m² on contact length basis)
    // q = specific_energy × depth × workspeed (J/mm³ × mm × m/s → need consistent units)
    // q in W/mm² = u(J/mm³) × ae(mm) × Vw(mm/s)
    const VwMmS = Vw * 1000;
    const aeMm = depth_of_cut_mm;
    const qFlux = specific_energy_j_mm3 * aeMm * VwMmS; // W/mm²

    // Energy partition to workpiece (simplified Rowe model):
    // ε ≈ 1 / (1 + (k_grain/k_work) × sqrt(Vw × a / (Vs × L)))
    // Simplified: assume ε ≈ 0.6-0.85 for dry, 0.3-0.5 with coolant
    const hasCoolant = params.coolant_htc_w_m2k !== undefined && params.coolant_htc_w_m2k > 0;
    // Peclet number based estimate
    const Pe = (Vw * contact_length_mm / 1000) / (4 * alpha);
    // Higher Peclet → less time for heat to penetrate → lower ε
    let epsilon = 0.85 - 0.1 * Math.min(Pe / 10, 3);
    if (hasCoolant) {
      // Coolant reduces partition
      const hc = params.coolant_htc_w_m2k!;
      const coolantReduction = Math.min(hc / 50000, 0.4);
      epsilon -= coolantReduction;
    }
    epsilon = Math.max(0.1, Math.min(epsilon, 0.95));

    // Max surface temperature (Jaeger moving heat source):
    // θ_max = (2 × q × a) / (π × k) × √(π × α / (4 × Vw × a))
    // Using consistent SI units
    const qSI = qFlux * 1e6; // W/m²
    const aSI = contact_length_mm / 1000; // m
    const thetaMax = epsilon * (2 * qSI * aSI) / (Math.PI * k) *
                     Math.sqrt((Math.PI * alpha) / (4 * Vw * aSI));

    // Burn threshold (steel typical)
    const burnThreshold = 750; // °C for most steels

    // Temper color prediction
    let temperColor = "none";
    if (thetaMax > 600) temperColor = "blue (>600°C)";
    else if (thetaMax > 400) temperColor = "purple (400-600°C)";
    else if (thetaMax > 300) temperColor = "straw/gold (300-400°C)";
    else if (thetaMax > 200) temperColor = "light straw (200-300°C)";

    // Safe MRR limit: find MRR where temp = burnThreshold
    // θ ∝ q ∝ MRR, so safe_MRR = actual_MRR × (burnThreshold / θ_max)
    const actualMRR = aeMm * VwMmS; // mm³/mm·s (per unit width)
    const safeMRR = thetaMax > 0 ? actualMRR * (burnThreshold / thetaMax) : actualMRR * 10;

    log.debug(`[FundPhysics] Grinding thermal: θ_max=${thetaMax.toFixed(1)}°C, ε=${epsilon.toFixed(3)}`);

    return {
      max_surface_temp_C: +thetaMax.toFixed(2),
      burn_threshold_C: burnThreshold,
      burn_risk: thetaMax > burnThreshold,
      energy_partition_workpiece: +epsilon.toFixed(4),
      temper_color_prediction: temperColor,
      safe_mrr_limit_mm3_per_mm_s: +safeMRR.toFixed(4),
    };
  }

  // ── Model 4: Hertz Contact Mechanics ────────────────────────────

  hertzContact(params: HertzContactInput): HertzContactResult {
    const { normal_force_N, radius_1_mm, E1_gpa, E2_gpa } = params;
    const R2 = params.radius_2_mm ?? 1e9; // default to flat (very large radius)
    const nu1 = params.nu1 ?? 0.22; // carbide default
    const nu2 = params.nu2 ?? 0.3;  // steel default

    // Convert GPa to MPa
    const E1 = E1_gpa * 1000;
    const E2 = E2_gpa * 1000;

    // Equivalent radius: 1/R* = 1/R1 + 1/R2
    const Rstar = 1 / (1 / radius_1_mm + 1 / R2);

    // Equivalent modulus: 1/E* = (1-ν1²)/E1 + (1-ν2²)/E2
    const Estar = 1 / ((1 - nu1 * nu1) / E1 + (1 - nu2 * nu2) / E2);

    // Contact radius: a = (3FR*/4E*)^(1/3)
    const aContact = Math.pow((3 * normal_force_N * Rstar) / (4 * Estar), 1 / 3);

    // Contact area
    const contactArea = Math.PI * aContact * aContact;

    // Max pressure (at center): p0 = 3F/(2πa²)
    const p0 = (3 * normal_force_N) / (2 * Math.PI * aContact * aContact);

    // Mean pressure: p_mean = F/(πa²)
    const pMean = normal_force_N / (Math.PI * aContact * aContact);

    // Max shear stress: τ_max ≈ 0.31 × p0, at depth ≈ 0.48a
    const tauMax = 0.31 * p0;
    const depthMaxShear = 0.48 * aContact;

    // Deformation (approach of centers): δ = a²/R* = (9F²/(16R*E*²))^(1/3)
    const delta = Math.pow((9 * normal_force_N * normal_force_N) / (16 * Rstar * Estar * Estar), 1 / 3);

    log.debug(`[FundPhysics] Hertz: a=${aContact.toFixed(4)} mm, p0=${p0.toFixed(1)} MPa`);

    return {
      contact_radius_mm: +aContact.toFixed(6),
      contact_area_mm2: +contactArea.toFixed(8),
      max_pressure_mpa: +p0.toFixed(2),
      mean_pressure_mpa: +pMean.toFixed(2),
      max_shear_stress_mpa: +tauMax.toFixed(2),
      subsurface_depth_of_max_shear_mm: +depthMaxShear.toFixed(6),
      deformation_mm: +delta.toFixed(8),
    };
  }
}

/** Singleton instance of FundamentalPhysicsCompletionEngine. */
export const fundamentalPhysicsCompletionEngine = new FundamentalPhysicsCompletionEngineImpl();
