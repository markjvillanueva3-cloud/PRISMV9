/**
 * ResidualStressPredictionEngine — Machining-induced residual stress prediction
 *
 * Models:
 *   1. Hertzian contact mechanical stress (σ_mech)
 *   2. Thermal residual stress from cutting temperature gradients
 *   3. Combined mechanical + thermal depth profile (hook shape)
 *   4. Burnishing / severe plastic deformation from flank wear
 *   5. Phase transformation stress (austenite → martensite)
 *   6. Relaxation / fatigue life impact (Goodman correction)
 *   7. Process parameter sensitivity analysis
 *
 * References:
 *   - Johnson (1985) Contact Mechanics
 *   - Carslaw & Jaeger (1959) Heat Conduction in Solids
 *   - Brinksmeier et al. (1982) Residual Stresses in Machining
 *   - Jacobus et al. (2000) Machining-Induced Residual Stress
 *   - Sasahara (2005) Effect of Residual Stress on Fatigue Life
 *   - Goodman (1899) Mechanics Applied to Engineering
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const PI = Math.PI;

/**
 * Complementary error function (erfc) approximation.
 * Abramowitz & Stegun 7.1.26, max error 1.5e-7.
 */
function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-x * x);
}

// ─── Material Database ──────────────────────────────────────────────

/** Material properties for residual stress prediction. */
export interface ResidualStressMaterial {
  /** Material name */
  name: string;
  /** Young's modulus (GPa) */
  E_GPa: number;
  /** Poisson's ratio */
  nu: number;
  /** Coefficient of thermal expansion (1/K) */
  alpha: number;
  /** Thermal diffusivity (m²/s) */
  kappa: number;
  /** Yield strength (MPa) */
  sigma_y_MPa: number;
  /** Ultimate tensile strength (MPa) */
  sigma_UTS_MPa: number;
  /** Vickers hardness (HV) */
  hardness_HV: number;
  /** Density (kg/m³) */
  rho: number;
  /** Specific heat (J/(kg·K)) */
  cp: number;
  /** Whether phase transformation is applicable */
  phase_transform_applicable: boolean;
}

/** Built-in material database. */
const MATERIAL_DB: Record<string, ResidualStressMaterial> = {
  "AISI 4340": {
    name: "AISI 4340",
    E_GPa: 205,
    nu: 0.29,
    alpha: 11.2e-6,
    kappa: 11.9e-6,
    sigma_y_MPa: 860,
    sigma_UTS_MPa: 1080,
    hardness_HV: 350,
    rho: 7850,
    cp: 475,
    phase_transform_applicable: true,
  },
  "Ti-6Al-4V": {
    name: "Ti-6Al-4V",
    E_GPa: 113.8,
    nu: 0.342,
    alpha: 8.6e-6,
    kappa: 2.9e-6,
    sigma_y_MPa: 880,
    sigma_UTS_MPa: 950,
    hardness_HV: 349,
    rho: 4430,
    cp: 526,
    phase_transform_applicable: false,
  },
  IN718: {
    name: "IN718",
    E_GPa: 205,
    nu: 0.3,
    alpha: 13.0e-6,
    kappa: 3.19e-6,
    sigma_y_MPa: 1035,
    sigma_UTS_MPa: 1240,
    hardness_HV: 400,
    rho: 8190,
    cp: 435,
    phase_transform_applicable: false,
  },
  "AISI 316L": {
    name: "AISI 316L",
    E_GPa: 193,
    nu: 0.3,
    alpha: 16.0e-6,
    kappa: 3.95e-6,
    sigma_y_MPa: 290,
    sigma_UTS_MPa: 580,
    hardness_HV: 217,
    rho: 8000,
    cp: 500,
    phase_transform_applicable: false,
  },
  "Al7075-T6": {
    name: "Al7075-T6",
    E_GPa: 71.7,
    nu: 0.33,
    alpha: 23.6e-6,
    kappa: 56.0e-6,
    sigma_y_MPa: 503,
    sigma_UTS_MPa: 572,
    hardness_HV: 175,
    rho: 2810,
    cp: 960,
    phase_transform_applicable: false,
  },
  "AISI 52100": {
    name: "AISI 52100",
    E_GPa: 210,
    nu: 0.3,
    alpha: 11.5e-6,
    kappa: 12.0e-6,
    sigma_y_MPa: 1500,
    sigma_UTS_MPa: 2000,
    hardness_HV: 700,
    rho: 7810,
    cp: 475,
    phase_transform_applicable: true,
  },
};

// ─── Input / Output Interfaces ──────────────────────────────────────

/** Input for Hertzian mechanical residual stress. */
export interface HertzianStressInput {
  /** Cutting force (N) */
  cutting_force_N: number;
  /** Equivalent contact radius (mm) */
  contact_radius_mm: number;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
}

/** Output for Hertzian mechanical residual stress. */
export interface HertzianStressOutput {
  /** Hertzian contact pressure P₀ (MPa) */
  P0_MPa: number;
  /** Maximum compressive stress at surface (MPa, negative = compressive) */
  sigma_surface_MPa: number;
  /** Contact half-width a (mm) */
  contact_half_width_mm: number;
}

/** Input for thermal residual stress. */
export interface ThermalStressInput {
  /** Surface temperature rise (°C) */
  delta_T_surface: number;
  /** Contact time (s) — typically L_contact / V_cutting */
  contact_time_s: number;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
}

/** Output for thermal residual stress. */
export interface ThermalStressOutput {
  /** Thermal stress at surface (MPa, positive = tensile) */
  sigma_thermal_surface_MPa: number;
  /** Thermal penetration depth (mm) — where T drops to 1% */
  thermal_depth_mm: number;
}

/** Input for combined depth profile. */
export interface CombinedProfileInput {
  /** Cutting force (N) */
  cutting_force_N: number;
  /** Equivalent contact radius (mm) */
  contact_radius_mm: number;
  /** Surface temperature rise (°C) */
  delta_T_surface: number;
  /** Contact time (s) */
  contact_time_s: number;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
  /** Maximum depth to evaluate (mm), default 0.5 */
  max_depth_mm?: number;
  /** Number of depth points, default 50 */
  num_points?: number;
  /** Flank wear VB (mm), default 0 */
  flank_wear_mm?: number;
  /** Whether to include phase transformation, default false */
  include_phase_transform?: boolean;
  /** Volume fraction of retained austenite (0–1), default 0.1 */
  retained_austenite_fraction?: number;
}

/** A single point in the depth profile. */
export interface DepthProfilePoint {
  /** Depth below surface (mm) */
  depth_mm: number;
  /** Mechanical stress component (MPa) */
  sigma_mech_MPa: number;
  /** Thermal stress component (MPa) */
  sigma_thermal_MPa: number;
  /** Burnishing stress component (MPa) */
  sigma_burnish_MPa: number;
  /** Phase transformation stress component (MPa) */
  sigma_transform_MPa: number;
  /** Total residual stress (MPa) */
  sigma_total_MPa: number;
}

/** Output for combined depth profile. */
export interface CombinedProfileOutput {
  /** Depth profile points */
  profile: DepthProfilePoint[];
  /** Surface stress (MPa) */
  surface_stress_MPa: number;
  /** Maximum compressive stress (MPa, negative) */
  max_compressive_MPa: number;
  /** Depth of maximum compressive stress (mm) */
  depth_max_compressive_mm: number;
  /** Depth where stress returns to near-zero (mm) */
  affected_depth_mm: number;
  /** Whether hook shape is present (tensile surface → compressive subsurface) */
  hook_shape: boolean;
}

/** Input for burnishing stress calculation. */
export interface BurnishingInput {
  /** Flank wear VB (mm) */
  flank_wear_mm: number;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
  /** Reference VB for saturation (mm), default 0.3 */
  VB_ref_mm?: number;
}

/** Output for burnishing stress. */
export interface BurnishingOutput {
  /** Surface burnishing stress (MPa, negative = compressive) */
  sigma_burnish_surface_MPa: number;
  /** Burnishing depth (mm) */
  burnish_depth_mm: number;
  /** Burnishing factor (0–1) */
  burnish_factor: number;
}

/** Input for phase transformation stress. */
export interface PhaseTransformInput {
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
  /** Volume fraction of retained austenite transformed (0–1) */
  fraction_transformed: number;
  /** Volumetric strain ΔV/V for austenite→martensite, default 0.04 */
  delta_V_over_V?: number;
}

/** Output for phase transformation stress. */
export interface PhaseTransformOutput {
  /** Transformation stress (MPa, positive = compressive in surrounding matrix) */
  sigma_transform_MPa: number;
  /** Volumetric strain used */
  delta_V_over_V: number;
}

/** Input for fatigue life impact. */
export interface FatigueImpactInput {
  /** Applied stress amplitude (MPa) */
  sigma_applied_amplitude_MPa: number;
  /** Applied mean stress (MPa) */
  sigma_applied_mean_MPa: number;
  /** Residual stress at critical location (MPa) */
  sigma_residual_MPa: number;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
  /** Fatigue endurance limit (MPa), default 0.5×σ_UTS */
  sigma_fatigue_MPa?: number;
}

/** Output for fatigue life impact. */
export interface FatigueImpactOutput {
  /** Effective mean stress with residual (MPa) */
  sigma_eff_mean_MPa: number;
  /** Safety factor without residual stress (Goodman) */
  safety_factor_no_residual: number;
  /** Safety factor with residual stress (Goodman) */
  safety_factor_with_residual: number;
  /** Fatigue life ratio (with_residual / without_residual) */
  life_ratio: number;
  /** Whether residual stress is beneficial (compressive improves life) */
  beneficial: boolean;
}

/** Input for process parameter sensitivity. */
export interface ProcessParamInput {
  /** Cutting speed (m/min) */
  cutting_speed_m_min: number;
  /** Feed rate (mm/rev) */
  feed_mm_rev: number;
  /** Depth of cut (mm) */
  depth_of_cut_mm: number;
  /** Tool edge radius (mm), default 0.02 */
  edge_radius_mm?: number;
  /** Whether coolant is applied, default false */
  coolant: boolean;
  /** Material key or custom material */
  material: string | ResidualStressMaterial;
}

/** Output for process parameter sensitivity. */
export interface ProcessParamOutput {
  /** Estimated cutting force (N) */
  estimated_force_N: number;
  /** Estimated surface temperature rise (°C) */
  estimated_delta_T: number;
  /** Estimated contact time (s) */
  estimated_contact_time_s: number;
  /** Equivalent VB from edge radius effect (mm) */
  equivalent_VB_mm: number;
  /** Combined depth profile */
  profile: CombinedProfileOutput;
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Resolves a material from a key string or a custom material object.
 * @param mat - Material key or custom material
 * @returns Resolved material properties
 */
function resolveMaterial(mat: string | ResidualStressMaterial): ResidualStressMaterial {
  if (typeof mat === "string") {
    const m = MATERIAL_DB[mat];
    if (!m) {
      throw new Error(`Unknown material: "${mat}". Available: ${Object.keys(MATERIAL_DB).join(", ")}`);
    }
    return m;
  }
  return mat;
}

/**
 * ResidualStressPredictionEngine — predicts machining-induced residual stress
 * depth profiles using Hertzian contact mechanics, thermal diffusion,
 * burnishing, phase transformation, and Goodman fatigue correction.
 */
class ResidualStressPredictionEngine {
  readonly id = "ResidualStressPredictionEngine";
  readonly version = "1.0.0";

  /** Return available material keys. */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }

  /** Get material properties by key. */
  getMaterial(key: string): ResidualStressMaterial {
    return resolveMaterial(key);
  }

  // ── 1. Hertzian Mechanical Stress ────────────────────────────────

  /**
   * Compute Hertzian contact pressure and surface mechanical residual stress.
   *
   * P₀ = (6·Fc·E² / (π³·R²))^(1/3)
   * σ_mech = -P₀·(1 + 2ν)/3   (max compressive at surface)
   *
   * @param input - Hertzian stress input parameters
   * @returns Hertzian stress output
   */
  calcHertzianStress(input: HertzianStressInput): HertzianStressOutput {
    const mat = resolveMaterial(input.material);
    const Fc = Math.max(0, input.cutting_force_N);
    const R = input.contact_radius_mm * 1e-3; // convert to meters
    const E = mat.E_GPa * 1e3; // GPa → MPa (keep in MPa domain)
    const E_Pa = mat.E_GPa * 1e9; // Pa for contact calc
    const nu = mat.nu;

    if (Fc === 0) {
      return { P0_MPa: 0, sigma_surface_MPa: 0, contact_half_width_mm: 0 };
    }

    // Hertzian contact pressure: P₀ = (6·Fc·E²/(π³·R²))^(1/3)
    // Using effective modulus E* = E / (2·(1-ν²)) for same-material contact
    const Fc_N = Fc;
    const R_m = R;
    const P0_Pa = Math.pow(
      (6 * Fc_N * E_Pa * E_Pa) / (PI * PI * PI * R_m * R_m),
      1 / 3
    );
    const P0_MPa = P0_Pa / 1e6;

    // Contact half-width from Hertz theory: a = (3FR / (4E*))^(1/3)
    const E_star = E_Pa / (2 * (1 - nu * nu));
    const a_m = Math.pow((3 * Fc_N * R_m) / (4 * E_star), 1 / 3);

    // Surface compressive stress: σ = -P₀·(1+2ν)/3
    const sigma_surface = -P0_MPa * (1 + 2 * nu) / 3;

    log.debug(
      `[${this.id}] Hertzian: P0=${P0_MPa.toFixed(1)} MPa, σ_surface=${sigma_surface.toFixed(1)} MPa`
    );

    return {
      P0_MPa,
      sigma_surface_MPa: sigma_surface,
      contact_half_width_mm: a_m * 1e3,
    };
  }

  /**
   * Mechanical stress depth profile.
   * Decays exponentially: σ(z) = σ_surface · exp(-z / (0.5·a))
   * where a is the contact half-width.
   *
   * @param sigma_surface - Surface stress (MPa)
   * @param contact_half_width_mm - Contact half-width (mm)
   * @param depth_mm - Depth below surface (mm)
   * @returns Mechanical stress at given depth (MPa)
   */
  mechStressAtDepth(
    sigma_surface: number,
    contact_half_width_mm: number,
    depth_mm: number
  ): number {
    if (contact_half_width_mm <= 0) return 0;
    const decay_length = 0.5 * contact_half_width_mm;
    return sigma_surface * Math.exp(-depth_mm / decay_length);
  }

  // ── 2. Thermal Residual Stress ───────────────────────────────────

  /**
   * Compute thermal residual stress from cutting temperature gradient.
   *
   * σ_thermal = -E·α·ΔT / (1-ν)
   * T(z,t) = T_surface · erfc(z / (2·√(κ·t)))
   *
   * For machining: rapid heating creates tensile stress at surface
   * (material tries to expand but is constrained), which upon cooling
   * locks in as tensile residual stress.
   *
   * @param input - Thermal stress input parameters
   * @returns Thermal stress output
   */
  calcThermalStress(input: ThermalStressInput): ThermalStressOutput {
    const mat = resolveMaterial(input.material);
    const dT = input.delta_T_surface;
    const t = Math.max(1e-10, input.contact_time_s);
    const E = mat.E_GPa * 1e3; // MPa
    const alpha = mat.alpha;
    const nu = mat.nu;
    const kappa = mat.kappa;

    if (dT === 0) {
      return { sigma_thermal_surface_MPa: 0, thermal_depth_mm: 0 };
    }

    // Thermal stress (tensile at surface for positive ΔT in machining)
    // Sign convention: positive ΔT from cutting → tensile residual stress
    const sigma_th = (E * alpha * dT) / (1 - nu);

    // Thermal penetration depth where erfc(z/(2√(κt))) = 0.01
    // erfc(x) = 0.01 → x ≈ 1.82
    const pen_depth_m = 2 * 1.82 * Math.sqrt(kappa * t);
    const pen_depth_mm = pen_depth_m * 1e3;

    log.debug(
      `[${this.id}] Thermal: σ=${sigma_th.toFixed(1)} MPa, depth=${pen_depth_mm.toFixed(3)} mm`
    );

    return {
      sigma_thermal_surface_MPa: sigma_th,
      thermal_depth_mm: pen_depth_mm,
    };
  }

  /**
   * Thermal stress at a given depth.
   * Uses erfc temperature field: T(z) = ΔT · erfc(z / (2√(κt)))
   *
   * @param sigma_surface - Thermal stress at surface (MPa)
   * @param kappa - Thermal diffusivity (m²/s)
   * @param contact_time_s - Contact time (s)
   * @param depth_mm - Depth (mm)
   * @returns Thermal stress at depth (MPa)
   */
  thermalStressAtDepth(
    sigma_surface: number,
    kappa: number,
    contact_time_s: number,
    depth_mm: number
  ): number {
    const z = depth_mm * 1e-3; // mm → m
    const t = Math.max(1e-10, contact_time_s);
    const arg = z / (2 * Math.sqrt(kappa * t));
    return sigma_surface * erfc(arg);
  }

  // ── 3. Combined Profile ──────────────────────────────────────────

  /**
   * Compute combined mechanical + thermal + burnishing + phase transformation
   * residual stress depth profile.
   *
   * The characteristic "hook shape" emerges when:
   * - Surface: thermal tensile stress dominates
   * - Subsurface: mechanical compressive stress dominates
   * - Deep: all stresses decay to zero
   *
   * @param input - Combined profile input
   * @returns Combined profile output with depth points
   */
  calcCombinedProfile(input: CombinedProfileInput): CombinedProfileOutput {
    const mat = resolveMaterial(input.material);
    const maxDepth = input.max_depth_mm ?? 0.5;
    const numPoints = input.num_points ?? 50;
    const VB = input.flank_wear_mm ?? 0;
    const includePhase = input.include_phase_transform ?? false;
    const austeniteFrac = input.retained_austenite_fraction ?? 0.1;

    // Mechanical component
    const hertz = this.calcHertzianStress({
      cutting_force_N: input.cutting_force_N,
      contact_radius_mm: input.contact_radius_mm,
      material: mat,
    });

    // Thermal component
    const thermal = this.calcThermalStress({
      delta_T_surface: input.delta_T_surface,
      contact_time_s: input.contact_time_s,
      material: mat,
    });

    // Burnishing component
    const burnish = this.calcBurnishingStress({
      flank_wear_mm: VB,
      material: mat,
    });

    // Phase transformation component
    let sigma_transform = 0;
    let transform_depth_mm = 0;
    if (includePhase && mat.phase_transform_applicable) {
      const pt = this.calcPhaseTransformStress({
        material: mat,
        fraction_transformed: austeniteFrac,
      });
      // Transformation creates compressive stress in surrounding matrix
      sigma_transform = -Math.abs(pt.sigma_transform_MPa);
      // Transformation depth ~ thermal penetration depth
      transform_depth_mm = thermal.thermal_depth_mm * 0.5;
    }

    // Build profile
    const profile: DepthProfilePoint[] = [];
    let minStress = Infinity;
    let minStressDepth = 0;

    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * maxDepth;

      // Mechanical: compressive, decays with depth
      const sm = this.mechStressAtDepth(
        hertz.sigma_surface_MPa,
        hertz.contact_half_width_mm,
        z
      );

      // Thermal: tensile, decays via erfc
      const st = this.thermalStressAtDepth(
        thermal.sigma_thermal_surface_MPa,
        mat.kappa,
        input.contact_time_s,
        z
      );

      // Burnishing: compressive, decays exponentially
      let sb = 0;
      if (VB > 0 && burnish.burnish_depth_mm > 0) {
        sb =
          burnish.sigma_burnish_surface_MPa *
          Math.exp(-z / (0.3 * burnish.burnish_depth_mm));
      }

      // Phase transformation: compressive, localized near surface
      let sp = 0;
      if (sigma_transform !== 0 && transform_depth_mm > 0) {
        sp = sigma_transform * Math.exp(-z / (0.3 * transform_depth_mm));
      }

      const total = sm + st + sb + sp;

      profile.push({
        depth_mm: z,
        sigma_mech_MPa: sm,
        sigma_thermal_MPa: st,
        sigma_burnish_MPa: sb,
        sigma_transform_MPa: sp,
        sigma_total_MPa: total,
      });

      if (total < minStress) {
        minStress = total;
        minStressDepth = z;
      }
    }

    // Surface stress
    const surfaceStress = profile[0].sigma_total_MPa;

    // Find affected depth (where |σ| < 1% of peak magnitude)
    const peakMag = Math.max(Math.abs(surfaceStress), Math.abs(minStress));
    const threshold = peakMag * 0.01;
    let affectedDepth = maxDepth;
    for (let i = profile.length - 1; i >= 0; i--) {
      if (Math.abs(profile[i].sigma_total_MPa) > threshold) {
        affectedDepth = profile[i].depth_mm;
        break;
      }
    }

    // Hook shape: tensile at surface, compressive subsurface
    const hookShape = surfaceStress > 0 && minStress < 0;

    log.debug(
      `[${this.id}] Combined: surface=${surfaceStress.toFixed(1)} MPa, ` +
        `maxComp=${minStress.toFixed(1)} MPa at ${minStressDepth.toFixed(3)} mm, ` +
        `hook=${hookShape}`
    );

    return {
      profile,
      surface_stress_MPa: surfaceStress,
      max_compressive_MPa: minStress,
      depth_max_compressive_mm: minStressDepth,
      affected_depth_mm: affectedDepth,
      hook_shape: hookShape,
    };
  }

  // ── 4. Burnishing Stress ─────────────────────────────────────────

  /**
   * Compute burnishing / severe plastic deformation stress from flank wear.
   *
   * σ_burnish = -σ_y · (1 - exp(-VB / VB_ref))
   * Burnishing depth ∝ VB
   *
   * When tool flank wear increases, the contact area grows, creating
   * a deep compressive residual stress layer via plastic deformation.
   *
   * @param input - Burnishing input parameters
   * @returns Burnishing output
   */
  calcBurnishingStress(input: BurnishingInput): BurnishingOutput {
    const mat = resolveMaterial(input.material);
    const VB = Math.max(0, input.flank_wear_mm);
    const VB_ref = input.VB_ref_mm ?? 0.3;

    if (VB === 0) {
      return {
        sigma_burnish_surface_MPa: 0,
        burnish_depth_mm: 0,
        burnish_factor: 0,
      };
    }

    const factor = 1 - Math.exp(-VB / VB_ref);
    const sigma = -mat.sigma_y_MPa * factor;
    // Burnishing depth proportional to wear land: depth ≈ 2 × VB
    const depth = 2 * VB;

    log.debug(
      `[${this.id}] Burnish: VB=${VB.toFixed(3)} mm, σ=${sigma.toFixed(1)} MPa, depth=${depth.toFixed(3)} mm`
    );

    return {
      sigma_burnish_surface_MPa: sigma,
      burnish_depth_mm: depth,
      burnish_factor: factor,
    };
  }

  // ── 5. Phase Transformation Stress ───────────────────────────────

  /**
   * Compute phase transformation stress for hardened steels.
   *
   * Retained austenite → martensite from deformation or local heating:
   * σ_transform = E · (ΔV/V) · f_transformed
   * where ΔV/V ≈ 0.04 for γ→α' transformation
   *
   * @param input - Phase transformation input
   * @returns Phase transformation stress output
   */
  calcPhaseTransformStress(input: PhaseTransformInput): PhaseTransformOutput {
    const mat = resolveMaterial(input.material);
    const f = Math.max(0, Math.min(1, input.fraction_transformed));
    const dVV = input.delta_V_over_V ?? 0.04;
    const E = mat.E_GPa * 1e3; // MPa

    // Expansion creates compressive stress in surrounding matrix
    const sigma = E * dVV * f;

    log.debug(
      `[${this.id}] PhaseTransform: f=${f.toFixed(3)}, σ=${sigma.toFixed(1)} MPa`
    );

    return {
      sigma_transform_MPa: sigma,
      delta_V_over_V: dVV,
    };
  }

  // ── 6. Fatigue Life Impact ───────────────────────────────────────

  /**
   * Assess residual stress effect on fatigue life using Goodman correction.
   *
   * Effective mean stress: σ_m_eff = σ_applied_mean + σ_residual
   * Goodman criterion: σ_a / σ_f + σ_m / σ_UTS = 1
   *
   * Compressive residual stress reduces effective mean → improves life.
   * Tensile residual stress increases effective mean → reduces life.
   *
   * @param input - Fatigue impact input
   * @returns Fatigue life comparison
   */
  calcFatigueImpact(input: FatigueImpactInput): FatigueImpactOutput {
    const mat = resolveMaterial(input.material);
    const sigma_a = Math.abs(input.sigma_applied_amplitude_MPa);
    const sigma_m = input.sigma_applied_mean_MPa;
    const sigma_r = input.sigma_residual_MPa;
    const sigma_UTS = mat.sigma_UTS_MPa;
    const sigma_f = input.sigma_fatigue_MPa ?? 0.5 * sigma_UTS;

    const sigma_m_eff = sigma_m + sigma_r;

    // Goodman safety factor: n = 1 / (σ_a/σ_f + σ_m/σ_UTS)
    const goodman_no_res =
      sigma_a / sigma_f + Math.max(0, sigma_m) / sigma_UTS;
    const goodman_with_res =
      sigma_a / sigma_f + Math.max(0, sigma_m_eff) / sigma_UTS;

    const sf_no = goodman_no_res > 0 ? 1 / goodman_no_res : Infinity;
    const sf_with = goodman_with_res > 0 ? 1 / goodman_with_res : Infinity;

    // Life ratio approximation: life ∝ (safety_factor)^k, k ≈ 3 for steels
    const k = 3;
    const life_ratio =
      sf_no > 0 && isFinite(sf_no)
        ? Math.pow(sf_with / sf_no, k)
        : sf_with > sf_no
          ? 2
          : 0.5;

    const beneficial = sigma_r < 0; // compressive is beneficial

    log.debug(
      `[${this.id}] Fatigue: SF_no=${sf_no.toFixed(2)}, SF_with=${sf_with.toFixed(2)}, ` +
        `ratio=${life_ratio.toFixed(2)}, beneficial=${beneficial}`
    );

    return {
      sigma_eff_mean_MPa: sigma_m_eff,
      safety_factor_no_residual: sf_no,
      safety_factor_with_residual: sf_with,
      life_ratio,
      beneficial,
    };
  }

  // ── 7. Process Parameter Effects ─────────────────────────────────

  /**
   * Predict residual stress profile from process parameters.
   *
   * Empirical correlations:
   * - Cutting speed ↑ → ΔT ↑ → more tensile at surface
   * - Feed rate ↑ → Fc ↑ → deeper compressive layer
   * - Depth of cut ↑ → Fc ↑ (proportional)
   * - Edge radius ↑ → burnishing effect ↑ → compressive
   * - Coolant → reduces ΔT by ~40-60%
   *
   * Uses simplified Kienzle force model and Jaeger moving heat source.
   *
   * @param input - Process parameter input
   * @returns Profile from process parameters
   */
  calcProcessParamEffect(input: ProcessParamInput): ProcessParamOutput {
    const mat = resolveMaterial(input.material);
    const Vc = Math.max(1, input.cutting_speed_m_min);
    const f = Math.max(0.01, input.feed_mm_rev);
    const ap = Math.max(0.1, input.depth_of_cut_mm);
    const re = input.edge_radius_mm ?? 0.02;
    const coolant = input.coolant;

    // Simplified Kienzle force: Fc = kc1.1 · h^(1-mc) · ap
    // kc1.1 depends on material hardness
    const kc11 = 1.5 * mat.hardness_HV + 200; // N/mm²
    const mc = 0.25; // typical
    const h = f; // uncut chip thickness ≈ feed in turning
    const Fc = kc11 * Math.pow(h, 1 - mc) * ap;

    // Temperature rise: simplified Loewen-Shaw
    // ΔT ∝ Vc^0.5 · f^0.3 · kc / (ρ·cp·√κ)
    const Vc_ms = Vc / 60;
    const tempFactor =
      (0.4 * kc11 * Math.pow(Vc_ms, 0.5) * Math.pow(f, 0.3)) /
      (mat.rho * mat.cp * Math.sqrt(mat.kappa));
    let deltaT = tempFactor * 1e3; // scale to °C
    if (coolant) {
      deltaT *= 0.5; // coolant reduces thermal by ~50%
    }

    // Contact time: t = contact_length / Vc
    const contactLength_mm = Math.max(f, 0.5); // mm
    const contactTime = (contactLength_mm * 1e-3) / Vc_ms;

    // Edge radius contributes burnishing effect
    // Equivalent VB from ploughing under edge radius
    const equivalentVB = re * 0.5;

    // Contact radius ~ tool nose or edge engagement
    const contactRadius = Math.max(re, 0.1);

    const profile = this.calcCombinedProfile({
      cutting_force_N: Fc,
      contact_radius_mm: contactRadius,
      delta_T_surface: deltaT,
      contact_time_s: contactTime,
      material: mat,
      flank_wear_mm: equivalentVB,
      include_phase_transform: mat.phase_transform_applicable,
      retained_austenite_fraction: 0.05,
    });

    log.debug(
      `[${this.id}] ProcessParam: Vc=${Vc}, f=${f}, ap=${ap}, Fc=${Fc.toFixed(0)}N, ` +
        `ΔT=${deltaT.toFixed(0)}°C, t=${contactTime.toExponential(2)}s`
    );

    return {
      estimated_force_N: Fc,
      estimated_delta_T: deltaT,
      estimated_contact_time_s: contactTime,
      equivalent_VB_mm: equivalentVB,
      profile,
    };
  }
}

/** Singleton instance. */
export const residualStressPredictionEngine =
  new ResidualStressPredictionEngine();

export { ResidualStressPredictionEngine, MATERIAL_DB, erfc };
