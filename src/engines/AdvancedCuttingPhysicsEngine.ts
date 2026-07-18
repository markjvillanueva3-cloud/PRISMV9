/**
 * AdvancedCuttingPhysicsEngine — Six cutting mechanics models
 *
 * Models: Oxley predictive machining, oblique cutting (Stabler/Armarego),
 *         Backer-Marshall-Shaw size effect, Recht shear instability,
 *         Nakayama chip breaking, Altintas process damping
 * References: Oxley (1989), Armarego & Brown (1969), Shaw (2005),
 *             Recht (1964), Nakayama (1972), Altintas (2012)
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;
const TAYLOR_QUINNEY = 0.9; // fraction of plastic work → heat
const RHO_STEEL = 7800;     // kg/m^3 typical
const CP_STEEL = 500;       // J/(kg·K) typical

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Johnson-Cook material constants.
 * NOTE: Tm/Tr are in °C here. JohnsonCookEngine uses Kelvin.
 * The J-C ratio T* = (T-Tr)/(Tm-Tr) works in either unit system
 * as long as all temperatures use the SAME unit consistently.
 */
export interface JohnsonCookMaterial {
  A: number;   // yield strength (MPa)
  B: number;   // hardening modulus (MPa)
  C: number;   // strain-rate sensitivity
  n: number;   // hardening exponent
  m: number;   // thermal softening exponent
  Tm: number;  // melting temperature (°C) — NOT Kelvin
  Tr: number;  // reference temperature (°C) — typically 20-25°C
  rho?: number;  // density kg/m^3 (default 7800)
  cp?: number;   // specific heat J/(kg·K) (default 500)
}

export interface OxleyInput {
  rake_angle_deg: number;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  width_mm: number;
  material: JohnsonCookMaterial;
}

export interface OxleyOutput {
  shear_angle_deg: number;
  cutting_force_N: number;
  thrust_force_N: number;
  shear_zone_temp_C: number;
  chip_tool_temp_C: number;
  chip_thickness_mm: number;
  strain: number;
  strain_rate: number;
}

export interface ObliqueInput {
  Fc_orthogonal: number;
  Ft_orthogonal: number;
  inclination_angle_deg: number;
  normal_rake_deg: number;
}

export interface ObliqueOutput {
  Fc: number;
  Ff: number;
  Fr: number;
  chip_flow_angle_deg: number;
  effective_rake_deg: number;
  oblique_shear_angle_deg: number;
}

export interface SizeEffectInput {
  chip_thickness_mm: number;
  reference_chip_thickness_mm?: number;  // default 0.1
  reference_kc_N_mm2: number;
  size_exponent?: number;                // default 0.26
  edge_radius_mm?: number;              // for h_min calc
}

export interface SizeEffectOutput {
  specific_cutting_energy_N_mm2: number;
  force_correction_factor: number;
  minimum_chip_thickness_mm: number;
}

export interface RechtInput {
  material: JohnsonCookMaterial;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  rake_angle_deg: number;
  /** Friction coefficient μ at tool-chip interface (default: 0.5 steel-like) */
  friction_coefficient?: number;
}

export interface RechtOutput {
  is_segmented: boolean;
  instability_parameter: number;
  critical_speed_m_min: number;
  segmentation_frequency_Hz: number;
  shear_band_spacing_mm: number;
}

export interface ChipBreakingInput {
  chip_thickness_mm: number;
  shear_angle_deg: number;
  material_fracture_strain?: number;        // default 0.5
  chipbreaker_groove_width_mm?: number;     // optional
}

export interface ChipBreakingOutput {
  natural_curl_radius_mm: number;
  effective_curl_radius_mm: number;
  chip_strain: number;
  will_break: boolean;
  recommended_chipbreaker_width_mm: number;
}

export interface ProcessDampingInput {
  undamped_stability_limit_mm: number;
  tool_clearance_angle_deg: number;
  flank_wear_VB_mm: number;
  cutting_speed_m_min: number;
  natural_freq_Hz: number;
  damping_ratio: number;
  flank_contact_length_mm?: number;  // default derived from VB
}

export interface ProcessDampingOutput {
  damped_stability_limit_mm: number;
  improvement_factor: number;
  process_damping_coefficient: number;
  effective_speed_threshold_m_min: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

class AdvancedCuttingPhysicsEngineImpl {

  /**
   * Oxley's predictive machining theory.
   * Iteratively solves for shear angle from material flow stress (J-C model)
   * without empirical cutting coefficients.
   *
   * Sweeps phi 5-45 deg; at each phi computes strain, strain-rate, T via
   * Taylor-Quinney, J-C flow stress, shear force, and selects phi that
   * minimizes cutting power (energy criterion).
   * @ref Oxley, "The Mechanics of Machining" (1989)
   */
  oxleyPredictive(input: OxleyInput): OxleyOutput {
    const alpha = input.rake_angle_deg * DEG;
    const Vc = input.cutting_speed_m_min / 60; // m/s
    const t1 = input.feed_mm_rev / 1000;       // uncut chip thickness in m
    const w = input.width_mm / 1000;            // width in m
    const mat = input.material;
    const rho = mat.rho ?? RHO_STEEL;
    const cp = mat.cp ?? CP_STEEL;
    const eps0 = 1.0; // reference strain rate (1/s)

    let bestPhi = 25 * DEG;
    let bestPower = Infinity;
    let bestResult: { Fc: number; Ft: number; strain: number; strainRate: number; Ts: number } | null = null;

    // Shear zone thickness ~ 10 * feed (Oxley's approximation)
    const delta_s = Math.max(t1 * 10, 1e-6);

    for (let phiDeg = 5; phiDeg <= 45; phiDeg += 0.5) {
      const phi = phiDeg * DEG;
      const cosPmA = Math.cos(phi - alpha);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const cosAlpha = Math.cos(alpha);
      const sinAlpha = Math.sin(alpha);

      // Shear strain (Merchant)
      const strain = cosAlpha / (2 * cosPmA * sinPhi);
      // Shear strain rate
      const strainRate = Math.max((Vc * cosAlpha) / (delta_s * cosPmA), 1);

      // Shear zone area
      const As = (t1 * w) / sinPhi;

      // Adiabatic temperature rise in shear zone (Taylor-Quinney)
      // T_rise = (tau * gamma) / (rho * cp), but tau depends on T → use iterative
      let Ts = mat.Tr;
      for (let iter = 0; iter < 10; iter++) {
        const Tstar = Math.min(Math.max((Ts - mat.Tr) / (mat.Tm - mat.Tr), 0), 1);
        const strainRateTerm = strainRate > eps0 ? (1 + mat.C * Math.log(strainRate / eps0)) : 1;
        const sigma = (mat.A + mat.B * Math.pow(Math.max(strain, 0.01), mat.n))
          * strainRateTerm
          * (1 - Math.pow(Tstar, mat.m));
        const tau = Math.max(sigma / Math.sqrt(3), 1);
        const Trise = (TAYLOR_QUINNEY * tau * 1e6 * strain) / (rho * cp);
        Ts = mat.Tr + Trise;
        if (Ts >= mat.Tm) { Ts = mat.Tm - 1; break; }
      }

      // Final flow stress at converged temperature
      const Tstar = Math.min(Math.max((Ts - mat.Tr) / (mat.Tm - mat.Tr), 0), 0.999);
      const strainRateTerm = strainRate > eps0 ? (1 + mat.C * Math.log(strainRate / eps0)) : 1;
      const sigma = (mat.A + mat.B * Math.pow(Math.max(strain, 0.01), mat.n))
        * strainRateTerm
        * (1 - Math.pow(Tstar, mat.m));
      const tau = Math.max(sigma / Math.sqrt(3), 1);

      // Shear force
      const Fs = tau * 1e6 * As; // N

      // Friction angle beta from Oxley: approximate beta ≈ alpha + pi/4 - phi + delta
      // Use Merchant: beta = atan(Ft_trial/Fc_trial) resolved from force circle
      // Fc = Fs * cos(beta - alpha) / cos(phi + beta - alpha)
      // Ft = Fs * sin(beta - alpha) / cos(phi + beta - alpha)
      // For Oxley, assume friction angle ~ 25-35 deg, refine with energy min
      const beta = Math.atan(0.5) + alpha; // initial friction estimate ~26.6 deg + rake
      const denom = Math.cos(phi + beta - alpha);
      if (Math.abs(denom) < 1e-10) continue;

      const Fc = Fs * Math.cos(beta - alpha) / denom;
      const Ft = Fs * Math.sin(beta - alpha) / denom;
      const power = Fc * Vc;

      if (power > 0 && power < bestPower) {
        bestPower = power;
        bestPhi = phi;
        bestResult = { Fc, Ft, strain, strainRate, Ts };
      }
    }

    const r = bestResult!;
    const chipThickness = t1 * Math.cos(bestPhi - alpha) / Math.sin(bestPhi);
    // Chip-tool interface temp is higher than shear zone
    const chipToolTemp = r.Ts + (0.4 * r.Fc * Vc) / (rho * cp * t1 * w * Vc + 1e-12);

    const phiD = (bestPhi / DEG).toFixed(1);
    log.debug(`[AdvancedCuttingPhysics] Oxley: phi=${phiD} deg, Fc=${r.Fc.toFixed(0)} N, Ts=${r.Ts.toFixed(0)} C`);

    return {
      shear_angle_deg: +(bestPhi / DEG).toFixed(2),
      cutting_force_N: +r.Fc.toFixed(1),
      thrust_force_N: +r.Ft.toFixed(1),
      shear_zone_temp_C: +r.Ts.toFixed(1),
      chip_tool_temp_C: +Math.min(chipToolTemp, input.material.Tm).toFixed(1),
      chip_thickness_mm: +(chipThickness * 1000).toFixed(4),
      strain: +r.strain.toFixed(4),
      strain_rate: +r.strainRate.toFixed(0),
    };
  }

  /**
   * Oblique cutting model (Stabler + Armarego).
   * Converts 2D orthogonal cutting forces to 3D using inclination angle.
   *
   * Stabler's chip flow rule: eta_c ≈ i (chip flow angle ≈ inclination angle)
   * Effective rake:
   *   sin(alpha_e) = sin²(i)*sin(alpha_n)*cos(eta_c) + cos²(i)*sin(alpha_n)
   *   alpha_e ≈ arcsin(cos(i)*sin(alpha_n) + sin(i)*cos(alpha_n)*sin(eta_c))
   *
   * Force decomposition from Armarego & Brown (1969):
   *   Fc = Fc_orth (tangential, unchanged)
   *   Ff = Ft_orth * cos(i) + Fc_orth * sin(i) * tan(eta_c) — feed force
   *   Fr = Ft_orth * sin(i) - Fc_orth * cos(i) * tan(eta_c) — radial force (passive)
   *
   * @ref Armarego & Brown, "The Machining of Metals" (1969)
   */
  obliqueCutting(input: ObliqueInput): ObliqueOutput {
    const i = input.inclination_angle_deg * DEG;
    const alpN = input.normal_rake_deg * DEG;
    const Fco = input.Fc_orthogonal;
    const Fto = input.Ft_orthogonal;

    // Stabler's rule: chip flow angle ≈ inclination angle
    const etaC = i;

    // Effective rake angle for oblique cutting
    const sinAlphaE = Math.cos(i) * Math.sin(alpN) + Math.sin(i) * Math.cos(alpN) * Math.sin(etaC);
    const alphaE = Math.asin(Math.max(-1, Math.min(1, sinAlphaE)));

    // Oblique shear angle (Stabler approximation)
    // tan(phi_o) ≈ tan(phi_orth) * cos(eta_c)
    // where phi_orth from Merchant: phi = pi/4 - beta/2 + alpha/2
    const betaOrth = Math.atan2(Fto, Fco) + alpN;
    const phiOrth = Math.PI / 4 - betaOrth / 2 + alpN / 2;
    const phiOblique = Math.atan(Math.tan(Math.max(phiOrth, 5 * DEG)) * Math.cos(etaC));

    // Force decomposition (Armarego)
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);
    const tanEta = Math.tan(etaC);

    const Fc = Fco;
    const Ff = Fto * cosI + Fco * sinI * tanEta;
    const Fr = Fto * sinI - Fco * cosI * tanEta;

    const iDeg = input.inclination_angle_deg;
    log.debug(`[AdvancedCuttingPhysics] Oblique: i=${iDeg} deg, Fc=${Fc.toFixed(1)}, Ff=${Ff.toFixed(1)}, Fr=${Fr.toFixed(1)}`);

    return {
      Fc: +Fc.toFixed(2),
      Ff: +Ff.toFixed(2),
      Fr: +Fr.toFixed(2),
      chip_flow_angle_deg: +(etaC / DEG).toFixed(2),
      effective_rake_deg: +(alphaE / DEG).toFixed(2),
      oblique_shear_angle_deg: +(phiOblique / DEG).toFixed(2),
    };
  }

  /**
   * Backer-Marshall-Shaw size effect model.
   * Specific cutting energy increases as chip thickness decreases.
   *
   * kc = kc_ref * (h_ref / h)^p
   * where p = size effect exponent (0.2-0.4, typically 0.26 for steels)
   *
   * Minimum chip thickness: h_min ≈ 0.1-0.3 * edge_radius (Albrecht 1960)
   * Below h_min, ploughing dominates and cutting cannot occur.
   *
   * @ref Backer, Marshall & Shaw, "The Size Effect in Metal Cutting" (1952)
   */
  sizeEffect(input: SizeEffectInput): SizeEffectOutput {
    const h = Math.max(input.chip_thickness_mm, 1e-6);
    const href = input.reference_chip_thickness_mm ?? 0.1;
    const kcRef = input.reference_kc_N_mm2;
    const p = input.size_exponent ?? 0.26;
    const edgeR = input.edge_radius_mm ?? 0.02; // default 20 micron edge radius

    // Size effect law
    const ratio = href / h;
    const kc = kcRef * Math.pow(ratio, p);
    const correctionFactor = Math.pow(ratio, p);

    // Minimum chip thickness (Albrecht): h_min = k_ratio * r_edge
    // k_ratio depends on friction; typically 0.1 (sharp) to 0.3 (worn)
    const kRatio = 0.2;
    const hMin = kRatio * edgeR;

    log.debug(`[AdvancedCuttingPhysics] SizeEffect: h=${h.toFixed(4)} mm, kc=${kc.toFixed(0)} N/mm2, factor=${correctionFactor.toFixed(3)}`);

    return {
      specific_cutting_energy_N_mm2: +kc.toFixed(1),
      force_correction_factor: +correctionFactor.toFixed(4),
      minimum_chip_thickness_mm: +hMin.toFixed(5),
    };
  }

  /**
   * Recht's catastrophic shear instability model.
   * Predicts segmented (serrated) chip formation when thermal softening
   * exceeds strain hardening in the primary shear zone.
   *
   * Segmentation when thermal softening > strain hardening (chi > 1).
   * @ref Recht, "Catastrophic Thermoplastic Shear" (1964)
   */
  rechtShearInstability(input: RechtInput): RechtOutput {
    const alpha = input.rake_angle_deg * DEG;
    const Vc = input.cutting_speed_m_min / 60; // m/s
    const t1 = input.feed_mm_rev;               // mm
    const mat = input.material;
    const rho = mat.rho ?? RHO_STEEL;
    const cpMat = mat.cp ?? CP_STEEL;

    // Estimate friction angle β from material (Merchant: φ = π/4 - β/2 + γ/2)
    // Typical μ: steel 0.5-0.6 (β≈27-31°), aluminum 0.3-0.4 (β≈17-22°), titanium 0.5-0.6 (β≈27-31°)
    // Ref: Shaw "Metal Cutting Principles" 2nd ed., Table 4.1
    const mu = input.friction_coefficient ?? (
      (mat as any).friction_mu ?? 0.5 // default steel-like friction
    );
    const beta_deg = Math.atan(mu) * (180 / Math.PI);
    const phi = (45 - beta_deg / 2 + input.rake_angle_deg / 2) * DEG;
    const phiClamped = Math.max(phi, 5 * DEG);

    // Shear strain
    const cosAlpha = Math.cos(alpha);
    const sinPhi = Math.sin(phiClamped);
    const cosPmA = Math.cos(phiClamped - alpha);
    const gamma = cosAlpha / (sinPhi * cosPmA);

    // Representative strain and strain rate
    const eps = gamma / Math.sqrt(3);
    const delta_s = t1 * 0.01; // shear band width ~ 1% of feed (mm)
    const epsRate = Math.max((Vc * 1000 * cosAlpha) / (delta_s * cosPmA), 1);

    // Temperature in shear zone (adiabatic assumption at high speed)
    const tau0 = (mat.A + mat.B * Math.pow(eps, mat.n)) / Math.sqrt(3); // MPa
    const Trise = (TAYLOR_QUINNEY * tau0 * 1e6 * gamma) / (rho * cpMat);
    const T = mat.Tr + Math.min(Trise, mat.Tm - mat.Tr - 1);
    const Tstar = Math.max((T - mat.Tr) / (mat.Tm - mat.Tr), 1e-6);

    // Strain hardening rate: dσ/dε = B * n * ε^(n-1) * [rate] * [thermal]
    const rateTerm = 1 + mat.C * Math.log(Math.max(epsRate, 1));
    const thermalTerm = 1 - Math.pow(Tstar, mat.m);
    const strainHardening = mat.B * mat.n * Math.pow(Math.max(eps, 0.01), mat.n - 1)
      * rateTerm * Math.max(thermalTerm, 0.01);

    // Thermal softening rate: dσ/dT * dT/dε
    // dσ/dT = -(A + B*ε^n) * (1+C*ln(edot)) * m * T*^(m-1) / (Tm - Tr)
    const sigmaBase = (mat.A + mat.B * Math.pow(Math.max(eps, 0.01), mat.n)) * rateTerm;
    const dSigmaDT = sigmaBase * mat.m * Math.pow(Math.max(Tstar, 1e-6), mat.m - 1) / (mat.Tm - mat.Tr);
    // dT/dε = (Taylor-Quinney * sigma) / (rho * cp * sqrt(3))
    const dTdEps = (TAYLOR_QUINNEY * sigmaBase * 1e6) / (rho * cpMat * Math.sqrt(3));
    const thermalSoftening = dSigmaDT * dTdEps / 1e6; // back to MPa/strain

    // Instability parameter: chi = thermal_softening / strain_hardening
    const chi = thermalSoftening / Math.max(strainHardening, 1);

    // Critical speed estimation: solve for Vc where chi = 1
    // Approximately: higher speed → higher T → higher chi
    // Linearize: critical_speed ≈ current_speed / chi (rough)
    const critSpeed = chi > 0.01
      ? input.cutting_speed_m_min / chi
      : input.cutting_speed_m_min * 100;

    // Segmentation frequency and spacing
    const segSpacing = chi > 1
      ? t1 * 0.5 * (1 + 1 / Math.max(chi - 1, 0.1)) // empirical: spacing decreases with chi
      : t1 * 5; // no segmentation, hypothetical
    const segFreq = chi > 1
      ? (Vc * 1000) / Math.max(segSpacing, 0.001)
      : 0;

    log.debug(`[AdvancedCuttingPhysics] Recht: chi=${chi.toFixed(3)}, segmented=${chi > 1}, Vc_crit=${critSpeed.toFixed(0)} m/min`);

    return {
      is_segmented: chi > 1,
      instability_parameter: +chi.toFixed(4),
      critical_speed_m_min: +critSpeed.toFixed(1),
      segmentation_frequency_Hz: +segFreq.toFixed(0),
      shear_band_spacing_mm: +segSpacing.toFixed(4),
    };
  }

  /**
   * Nakayama chip breaking criterion.
   * Predicts whether chips will break based on curl radius vs fracture strain.
   *
   * Natural curl radius: R = h / (2 * sin²(phi))
   * With chipbreaker groove of width W: R_eff = W² / (8 * h) (parabolic curl)
   * Chip strain: ε_chip = h / (2 * R_eff)
   * Breaking when: ε_chip > ε_fracture
   *
   * @ref Nakayama, "A Study on Chip-Breaker" (1962, 1972)
   */
  chipBreakingCriterion(input: ChipBreakingInput): ChipBreakingOutput {
    const h = Math.max(input.chip_thickness_mm, 0.001);
    const phi = input.shear_angle_deg * DEG;
    const epsFrac = input.material_fracture_strain ?? 0.5;
    const sinPhi = Math.sin(phi);

    // Natural curl radius (Nakayama): R = h / (2 * sin²(phi))
    const Rnatural = h / (2 * sinPhi * sinPhi);

    // Effective curl radius (with chipbreaker)
    let Reff: number;
    if (input.chipbreaker_groove_width_mm != null && input.chipbreaker_groove_width_mm > 0) {
      const W = input.chipbreaker_groove_width_mm;
      // Chipbreaker forces tighter curl: R_eff = W^2 / (8*h)
      Reff = (W * W) / (8 * h);
      // Use the smaller of natural or forced curl
      Reff = Math.min(Rnatural, Reff);
    } else {
      Reff = Rnatural;
    }

    // Bending strain in chip outer surface
    const chipStrain = h / (2 * Math.max(Reff, 0.001));

    // Breaking criterion
    const willBreak = chipStrain > epsFrac;

    // Recommended chipbreaker width to achieve breaking
    // Need: h / (2*R) > eps_frac → R < h / (2*eps_frac)
    // R = W^2 / (8*h) < h / (2*eps_frac) → W < 2*h * sqrt(1/eps_frac)
    const Rreq = h / (2 * epsFrac);
    const Wrecommended = Math.sqrt(8 * h * Rreq);

    log.debug(`[AdvancedCuttingPhysics] ChipBreak: R_nat=${Rnatural.toFixed(2)} mm, R_eff=${Reff.toFixed(2)} mm, break=${willBreak}`);

    return {
      natural_curl_radius_mm: +Rnatural.toFixed(4),
      effective_curl_radius_mm: +Reff.toFixed(4),
      chip_strain: +chipStrain.toFixed(4),
      will_break: willBreak,
      recommended_chipbreaker_width_mm: +Wrecommended.toFixed(3),
    };
  }

  /**
   * Altintas process damping model.
   * Additional chatter stability at low cutting speeds from tool flank-workpiece
   * indentation contact during vibration.
   *
   * Process damping coefficient: C_pd = K_pd * V_b * L_f / V_c
   *   where K_pd ~ 1e9-1e11 N/m^3 (indentation constant)
   *   V_b = flank wear width, L_f = flank contact length
   *
   * Damped stability limit:
   *   a_lim_damped = a_lim * (1 + C_pd / (2 * zeta * omega_n * m))
   *   simplified: improvement = 1 + C_pd / (4 * pi * f * zeta * k_ratio)
   *
   * Effective speed threshold: damping becomes significant when
   *   V_c < V_threshold ≈ K_pd * V_b * L_f / (4 * pi * f * zeta * a_lim * Kc)
   *
   * @ref Altintas, Eynian & Onozuka, "Identification of Dynamic
   *      Cutting Force Coefficients and Chatter Stability
   *      with Process Damping" (2008)
   * @ref Altintas, "Manufacturing Automation" 2nd ed (2012), Ch. 4
   */
  processDamping(input: ProcessDampingInput): ProcessDampingOutput {
    const aLim = input.undamped_stability_limit_mm;
    const clearance = input.tool_clearance_angle_deg * DEG;
    const VB = input.flank_wear_VB_mm;
    const Vc = input.cutting_speed_m_min / 60; // m/s
    const fn = input.natural_freq_Hz;
    const zeta = input.damping_ratio;
    const omega = 2 * Math.PI * fn;

    // Flank contact length: from wear land geometry
    // L_f = VB / tan(clearance) for fresh tool; user can override
    const Lf = input.flank_contact_length_mm ?? VB / Math.tan(Math.max(clearance, 1 * DEG));

    // Indentation force constant (N/m^3), typical range 1e10-5e10
    const Kpd = 2e10;

    // Process damping coefficient (N·s/m per unit width)
    // C_pd = Kpd * VB * Lf / Vc (units: N·s/m per m of width)
    const VcSafe = Math.max(Vc, 0.01);
    const Cpd = (Kpd * (VB / 1000) * (Lf / 1000)) / VcSafe;

    // Improvement factor on stability limit
    // From Altintas: the process damping adds to structural damping
    // improvement = 1 + Cpd / (2 * m * omega * 2*zeta)
    // Approximate using: m*omega^2 = k, so m = k/omega^2
    // For unit-width formulation: improvement ≈ 1 + Cpd / (4*pi*fn*zeta * rho_factor)
    const dampingDenom = 4 * Math.PI * fn * zeta;
    const rhoFactor = 1e3; // effective mass per unit cutting width (kg/m)
    const improvement = 1 + Cpd / (dampingDenom * rhoFactor);

    const aLimDamped = aLim * improvement;

    // Speed threshold: process damping significant when Cpd contributes > 10%
    // Solve: Kpd*VB*Lf / Vc_thresh = 0.1 * dampingDenom * rhoFactor
    const VcThresh = (Kpd * (VB / 1000) * (Lf / 1000)) / (0.1 * dampingDenom * rhoFactor);
    const VcThreshMMin = VcThresh * 60;

    const impStr = improvement.toFixed(3);
    const thrStr = VcThreshMMin.toFixed(0);
    log.debug(`[AdvancedCuttingPhysics] ProcessDamping: improvement=${impStr}, a_lim=${aLimDamped.toFixed(2)} mm, threshold=${thrStr} m/min`);

    return {
      damped_stability_limit_mm: +aLimDamped.toFixed(3),
      improvement_factor: +improvement.toFixed(4),
      process_damping_coefficient: +Cpd.toFixed(2),
      effective_speed_threshold_m_min: +VcThreshMMin.toFixed(1),
    };
  }
}

/** Singleton instance of AdvancedCuttingPhysicsEngine. */
export const advancedCuttingPhysicsEngine = new AdvancedCuttingPhysicsEngineImpl();
