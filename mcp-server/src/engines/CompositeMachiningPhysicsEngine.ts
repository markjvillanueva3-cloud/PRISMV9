/**
 * CompositeMachiningPhysicsEngine — Composite material machining physics
 *
 * Models: Hocheng-Dharan delamination, Koplev fiber orientation cutting,
 *         delamination factor prediction, thermal damage (Tg threshold),
 *         abrasive tool wear, composite surface roughness,
 *         Koplev-Lystrup chip formation classification,
 *         rule-of-mixtures specific cutting energy
 *
 * Materials: CFRP (T300/T700/T800), GFRP (E-glass/S-glass),
 *            MMC (Al-SiC), Ceramic (Al2O3-SiCw), Aramid (Kevlar-49)
 *
 * References:
 *   Hocheng & Dharan (1990) — delamination onset in drilling composites
 *   Koplev, Lystrup & Vorm (1983) — fiber cutting mechanics
 *   Chen (1997) — delamination factor Fd = Dmax/Dnom
 *   Davim & Reis (2003) — thermal damage in CFRP machining
 *   Rawat & Attia (2009) — abrasive wear in composite cutting
 *   Palanikumar (2007) — surface roughness modeling for composites
 *   Wang, Ramulu & Arola (1995) — chip formation classification
 *   Hintze & Hartmann (2013) — specific cutting energy for FRP
 *
 * @module CompositeMachiningPhysicsEngine
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;

// ─── Material Database ──────────────────────────────────────────────

/** Properties for a composite material preset. */
export interface CompositeMaterialPreset {
  /** Human-readable name */
  name: string;
  /** Material class */
  type: "CFRP" | "GFRP" | "MMC" | "CMC" | "AFRP";
  /** Critical strain energy release rate, mode I (J/m²) */
  GIc: number;
  /** Longitudinal elastic modulus (Pa) */
  E: number;
  /** Poisson's ratio */
  nu: number;
  /** Glass transition temperature (°C) — null for MMC/CMC */
  Tg: number | null;
  /** Fiber diameter (m) */
  fiber_diameter_m: number;
  /** Fiber volume fraction (0-1) */
  Vf: number;
  /** Density (kg/m³) */
  rho: number;
  /** Specific heat capacity (J/(kg·K)) */
  cp: number;
  /** Fiber specific cutting energy (J/m³) */
  kc_fiber: number;
  /** Matrix specific cutting energy (J/m³) */
  kc_matrix: number;
  /** Interface contribution to cutting energy (J/m³) */
  kc_interface: number;
  /** Abrasive wear coefficient K */
  wear_K: number;
  /** Wear speed exponent a */
  wear_a: number;
  /** Wear feed exponent b */
  wear_b: number;
  /** Wear length exponent c */
  wear_c: number;
}

/**
 * Eight built-in composite material presets with realistic properties
 * sourced from published data (Hocheng 1990, Davim 2003, ASM Handbook Vol 21).
 */
export const COMPOSITE_MATERIAL_DB: Record<string, CompositeMaterialPreset> = {
  "CFRP-T300": {
    name: "CFRP T300/Epoxy",
    type: "CFRP",
    GIc: 250,            // J/m² — mode I, typical epoxy/CF
    E: 135e9,            // Pa — longitudinal
    nu: 0.30,
    Tg: 180,             // °C
    fiber_diameter_m: 7e-6,
    Vf: 0.60,
    rho: 1580,
    cp: 900,
    kc_fiber: 1200e6,    // J/m³
    kc_matrix: 150e6,
    kc_interface: 80e6,
    wear_K: 2.5e-6,
    wear_a: 1.2,
    wear_b: 0.8,
    wear_c: 0.6,
  },
  "CFRP-T700": {
    name: "CFRP T700/Epoxy",
    type: "CFRP",
    GIc: 280,
    E: 150e9,
    nu: 0.29,
    Tg: 175,
    fiber_diameter_m: 7e-6,
    Vf: 0.62,
    rho: 1560,
    cp: 920,
    kc_fiber: 1350e6,
    kc_matrix: 150e6,
    kc_interface: 90e6,
    wear_K: 2.8e-6,
    wear_a: 1.25,
    wear_b: 0.82,
    wear_c: 0.62,
  },
  "CFRP-T800": {
    name: "CFRP T800/Epoxy",
    type: "CFRP",
    GIc: 310,
    E: 165e9,
    nu: 0.28,
    Tg: 190,
    fiber_diameter_m: 5e-6,
    Vf: 0.65,
    rho: 1600,
    cp: 880,
    kc_fiber: 1500e6,
    kc_matrix: 160e6,
    kc_interface: 100e6,
    wear_K: 3.2e-6,
    wear_a: 1.3,
    wear_b: 0.85,
    wear_c: 0.65,
  },
  "GFRP-E-glass": {
    name: "GFRP E-glass/Epoxy",
    type: "GFRP",
    GIc: 800,
    E: 40e9,
    nu: 0.28,
    Tg: 130,
    fiber_diameter_m: 15e-6,
    Vf: 0.55,
    rho: 2000,
    cp: 1050,
    kc_fiber: 600e6,
    kc_matrix: 150e6,
    kc_interface: 50e6,
    wear_K: 1.5e-6,
    wear_a: 1.0,
    wear_b: 0.7,
    wear_c: 0.5,
  },
  "GFRP-S-glass": {
    name: "GFRP S-glass/Epoxy",
    type: "GFRP",
    GIc: 900,
    E: 50e9,
    nu: 0.27,
    Tg: 140,
    fiber_diameter_m: 10e-6,
    Vf: 0.58,
    rho: 1950,
    cp: 1000,
    kc_fiber: 750e6,
    kc_matrix: 150e6,
    kc_interface: 60e6,
    wear_K: 1.8e-6,
    wear_a: 1.05,
    wear_b: 0.72,
    wear_c: 0.52,
  },
  "MMC-Al-SiC": {
    name: "MMC Al/SiC (20% vol)",
    type: "MMC",
    GIc: 5000,
    E: 110e9,
    nu: 0.30,
    Tg: null,            // no Tg for metal matrix
    fiber_diameter_m: 15e-6,  // SiC particle diameter
    Vf: 0.20,
    rho: 2850,
    cp: 850,
    kc_fiber: 3500e6,    // SiC particles very hard
    kc_matrix: 800e6,
    kc_interface: 200e6,
    wear_K: 8.0e-6,      // very abrasive
    wear_a: 1.5,
    wear_b: 0.9,
    wear_c: 0.7,
  },
  "CMC-Al2O3-SiCw": {
    name: "CMC Al₂O₃/SiC whisker",
    type: "CMC",
    GIc: 120,
    E: 380e9,
    nu: 0.24,
    Tg: null,
    fiber_diameter_m: 0.5e-6,  // whisker diameter
    Vf: 0.30,
    rho: 3700,
    cp: 780,
    kc_fiber: 5000e6,
    kc_matrix: 4000e6,
    kc_interface: 300e6,
    wear_K: 12.0e-6,
    wear_a: 1.6,
    wear_b: 0.95,
    wear_c: 0.75,
  },
  "AFRP-Kevlar49": {
    name: "AFRP Kevlar-49/Epoxy",
    type: "AFRP",
    GIc: 600,
    E: 80e9,
    nu: 0.34,
    Tg: 150,
    fiber_diameter_m: 12e-6,
    Vf: 0.55,
    rho: 1380,
    cp: 1100,
    kc_fiber: 400e6,
    kc_matrix: 150e6,
    kc_interface: 40e6,
    wear_K: 1.0e-6,
    wear_a: 0.9,
    wear_b: 0.65,
    wear_c: 0.45,
  },
};

// ─── Input/Output Types ─────────────────────────────────────────────

/** Input for Hocheng-Dharan delamination model. */
export interface DelaminationInput {
  /** Critical strain energy release rate, mode I (J/m²) */
  GIc: number;
  /** Elastic modulus (Pa) */
  E: number;
  /** Uncut thickness below drill (m) */
  h: number;
  /** Poisson's ratio */
  nu: number;
}

/** Output from Hocheng-Dharan delamination model. */
export interface DelaminationOutput {
  /** Critical thrust force for delamination onset (N) */
  Fc_N: number;
  /** Stiffness parameter D = E*h³/(12*(1-ν²)) (N·m) */
  D_Nm: number;
}

/** Input for fiber orientation cutting force model. */
export interface FiberOrientationInput {
  /** Fiber angle relative to cutting direction (degrees) */
  theta_deg: number;
  /** Base cutting force at 0° (N) */
  Fc0_N: number;
  /** Coefficient for sin(2θ) term (default 0.25) */
  k1?: number;
  /** Coefficient for cos(4θ) term (default 0.15) */
  k2?: number;
}

/** Output from fiber orientation cutting force model. */
export interface FiberOrientationOutput {
  /** Predicted cutting force (N) */
  Fc_N: number;
  /** Force ratio Fc/Fc0 */
  force_ratio: number;
  /** Cutting regime description */
  regime: "clean_cut" | "fiber_bending" | "fiber_bouncing";
  /** Regime angle boundaries used */
  regime_bounds_deg: [number, number];
  /** Chip formation type (I-IV) */
  chip_type: "I_deformation" | "II_shearing" | "III_bending" | "IV_macro_fracture";
}

/** Input for delamination factor prediction. */
export interface DelaminationFactorInput {
  /** Feed rate (mm/rev) */
  feed_mm_rev: number;
  /** Spindle speed (rpm) */
  speed_rpm: number;
  /** Drill diameter (mm) */
  drill_diameter_mm: number;
  /** Point angle of drill (degrees, default 118) */
  point_angle_deg?: number;
  /** Number of plies */
  num_plies?: number;
  /** Ply thickness (mm, default 0.125) */
  ply_thickness_mm?: number;
  /** Material preset key (optional, provides material-dependent coefficients) */
  material_key?: string;
}

/** Output from delamination factor prediction. */
export interface DelaminationFactorOutput {
  /** Delamination factor Fd = Dmax / Dnom */
  Fd: number;
  /** Maximum damaged diameter (mm) */
  Dmax_mm: number;
  /** Nominal diameter (mm) */
  Dnom_mm: number;
  /** Predicted thrust force (N) */
  thrust_force_N: number;
  /** Critical thrust force for onset (N) */
  critical_thrust_N: number;
  /** Whether delamination is predicted */
  delamination_predicted: boolean;
}

/** Input for thermal damage model. */
export interface ThermalDamageInput {
  /** Cutting force (N) */
  Fc_N: number;
  /** Cutting speed (m/min) */
  Vc_m_min: number;
  /** Density of workpiece (kg/m³) */
  rho: number;
  /** Specific heat capacity (J/(kg·K)) */
  cp: number;
  /** Chip cross-section area (m²) */
  chip_area_m2: number;
  /** Heat partition ratio to workpiece (0-1, default 0.4) */
  eta?: number;
  /** Glass transition temperature (°C, default 180) */
  Tg: number;
  /** Ambient temperature (°C, default 25) */
  T_ambient?: number;
}

/** Output from thermal damage model. */
export interface ThermalDamageOutput {
  /** Temperature rise in cutting zone (°C) */
  delta_T_C: number;
  /** Predicted max temperature (°C) */
  T_max_C: number;
  /** Glass transition temperature (°C) */
  Tg_C: number;
  /** Whether thermal damage is predicted */
  thermal_damage: boolean;
  /** Thermal damage margin (Tg - T_max), negative = damage */
  margin_C: number;
  /** Heat flux into workpiece (W) */
  heat_flux_W: number;
}

/** Input for composite tool wear model. */
export interface CompositeToolWearInput {
  /** Cutting speed (m/min) */
  Vc_m_min: number;
  /** Feed rate (mm/rev) */
  feed_mm_rev: number;
  /** Cutting length (m) */
  cutting_length_m: number;
  /** Wear coefficient K */
  K: number;
  /** Speed exponent a */
  a: number;
  /** Feed exponent b */
  b: number;
  /** Length exponent c */
  c: number;
}

/** Output from composite tool wear model. */
export interface CompositeToolWearOutput {
  /** Flank wear VB (mm) */
  VB_mm: number;
  /** Tool life criterion met (VB > 0.3 mm) */
  end_of_life: boolean;
  /** Estimated remaining life as fraction (0-1) */
  remaining_life_fraction: number;
}

/** Input for composite surface roughness model. */
export interface CompositeSurfaceRoughnessInput {
  /** Feed rate (mm/rev) */
  feed_mm_rev: number;
  /** Cutting speed (m/min) */
  speed_m_min: number;
  /** Fiber angle (degrees) */
  fiber_angle_deg: number;
  /** Current tool wear VB (mm, default 0) */
  tool_wear_VB_mm?: number;
  /** Tool nose radius (mm, default 0.8) */
  nose_radius_mm?: number;
}

/** Output from composite surface roughness model. */
export interface CompositeSurfaceRoughnessOutput {
  /** Arithmetic mean roughness Ra (μm) */
  Ra_um: number;
  /** Roughness contributions breakdown */
  contributions: {
    /** Geometric/kinematic component (μm) */
    geometric: number;
    /** Fiber pull-out component (μm) */
    fiber_pullout: number;
    /** Matrix smearing component (μm) */
    matrix_smearing: number;
    /** Tool wear degradation component (μm) */
    tool_wear_effect: number;
  };
}

/** Input for chip formation classification. */
export interface ChipFormationInput {
  /** Fiber angle relative to cutting direction (degrees) */
  fiber_angle_deg: number;
  /** Depth of cut (mm) */
  depth_of_cut_mm: number;
  /** Fiber diameter (m) */
  fiber_diameter_m: number;
}

/** Output from chip formation classification. */
export interface ChipFormationOutput {
  /** Chip type classification */
  chip_type: "I_deformation" | "II_shearing" | "III_bending" | "IV_macro_fracture";
  /** Descriptive mechanism */
  mechanism: string;
  /** Expected chip morphology */
  morphology: string;
  /** Expected subsurface damage severity (0-1 scale) */
  subsurface_damage_severity: number;
  /** Recommended cutting strategy */
  recommendation: string;
}

/** Input for specific cutting energy calculation. */
export interface SpecificCuttingEnergyInput {
  /** Fiber volume fraction (0-1) */
  Vf: number;
  /** Fiber specific cutting energy (J/m³ or Pa) */
  kc_fiber: number;
  /** Matrix specific cutting energy (J/m³ or Pa) */
  kc_matrix: number;
  /** Interface contribution to cutting energy (J/m³ or Pa) */
  kc_interface: number;
}

/** Output from specific cutting energy calculation. */
export interface SpecificCuttingEnergyOutput {
  /** Total specific cutting energy for composite (J/m³) */
  kc_composite: number;
  /** Fiber contribution fraction */
  fiber_fraction: number;
  /** Matrix contribution fraction */
  matrix_fraction: number;
  /** Interface contribution fraction */
  interface_fraction: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * CompositeMachiningPhysicsEngine — Physics models for machining
 * composite materials (CFRP, GFRP, MMC, CMC, AFRP).
 *
 * Eight fully-implemented models covering delamination, fiber orientation
 * effects, thermal damage, tool wear, surface quality, chip formation,
 * and cutting energy for fiber-reinforced composites.
 */
export class CompositeMachiningPhysicsEngine {
  /**
   * Retrieve a material preset from the built-in database.
   * @param key - Material key (e.g. "CFRP-T300", "GFRP-E-glass")
   * @returns Material preset or undefined if not found
   */
  getMaterialPreset(key: string): CompositeMaterialPreset | undefined {
    return COMPOSITE_MATERIAL_DB[key];
  }

  /**
   * List all available material preset keys.
   */
  listMaterials(): string[] {
    return Object.keys(COMPOSITE_MATERIAL_DB);
  }

  // ─── Model 1: Hocheng-Dharan Delamination ──────────────────────

  /**
   * Hocheng-Dharan delamination model — critical thrust force for
   * delamination onset during drilling of composite laminates.
   *
   * Based on linear elastic fracture mechanics (LEFM) applied to
   * circular plate bending. The uncut plies beneath the drill act
   * as a clamped circular plate; delamination initiates when the
   * strain energy release rate reaches GIc.
   *
   * Formula: Fc = π × √(8 × GIc × E × h³ / (3 × (1 - ν²)))
   *
   * Reference: Hocheng H, Dharan CKH (1990) "Delamination during
   *   drilling in composite laminates." J Eng Ind 112(3):236-239.
   *
   * @param input - Delamination parameters
   * @returns Critical thrust force and plate stiffness
   */
  hochengDharanDelamination(input: DelaminationInput): DelaminationOutput {
    const { GIc, E, h, nu } = input;

    // Validate inputs
    if (GIc <= 0) throw new Error("GIc must be positive");
    if (E <= 0) throw new Error("Elastic modulus E must be positive");
    if (h <= 0) throw new Error("Uncut thickness h must be positive");
    if (nu < 0 || nu >= 0.5) throw new Error("Poisson's ratio must be in [0, 0.5)");

    // Plate stiffness D = E*h³ / (12*(1-ν²))
    const D = (E * Math.pow(h, 3)) / (12 * (1 - nu * nu));

    // Critical thrust force
    // Fc = π × √(8 × GIc × E × h³ / (3 × (1 - ν²)))
    const Fc = Math.PI * Math.sqrt(
      (8 * GIc * E * Math.pow(h, 3)) / (3 * (1 - nu * nu))
    );

    log.debug(`[CompositeMachiningPhysics] Hocheng-Dharan: Fc=${Fc.toFixed(2)} N, D=${D.toExponential(3)} N·m`);

    return { Fc_N: Fc, D_Nm: D };
  }

  // ─── Model 2: Fiber Orientation Cutting Force ──────────────────

  /**
   * Fiber orientation cutting force model — force variation with
   * fiber angle θ based on Koplev's fiber cutting mechanics.
   *
   * The cutting force for unidirectional composites depends strongly
   * on the angle between the fiber direction and the cutting velocity.
   * Three distinct regimes exist:
   * - θ < 75°: Clean fiber cutting — shear along fiber/matrix interface
   * - 75° < θ < 105°: Fiber bending — fibers bend before fracture
   * - θ > 105°: Fiber bouncing/pulling — fibers spring back, pull-out
   *
   * Force model: Fc(θ) = Fc0 × (1 + k1×sin(2θ) + k2×cos(4θ))
   *
   * Reference: Koplev A, Lystrup A, Vorm T (1983) "The cutting process,
   *   chips, and cutting forces in machining CFRP." Composites 14(4):371-376.
   *
   * @param input - Fiber orientation parameters
   * @returns Cutting force, regime classification, and chip type
   */
  fiberOrientationForce(input: FiberOrientationInput): FiberOrientationOutput {
    const { theta_deg, Fc0_N, k1 = 0.25, k2 = 0.15 } = input;

    if (Fc0_N <= 0) throw new Error("Base cutting force Fc0 must be positive");

    // Normalize angle to [0, 360)
    let theta = ((theta_deg % 360) + 360) % 360;
    // Use symmetry: only need [0, 180] for unidirectional composites
    if (theta > 180) theta = 360 - theta;

    const theta_rad = theta * DEG;

    // Force model: Fc(θ) = Fc0 × (1 + k1×sin(2θ) + k2×cos(4θ))
    const force_ratio = 1 + k1 * Math.sin(2 * theta_rad) + k2 * Math.cos(4 * theta_rad);
    const Fc = Fc0_N * force_ratio;

    // Determine cutting regime
    let regime: FiberOrientationOutput["regime"];
    let regime_bounds: [number, number];
    if (theta < 75) {
      regime = "clean_cut";
      regime_bounds = [0, 75];
    } else if (theta <= 105) {
      regime = "fiber_bending";
      regime_bounds = [75, 105];
    } else {
      regime = "fiber_bouncing";
      regime_bounds = [105, 180];
    }

    // Chip formation type (Wang et al. 1995 classification)
    const chip_type = this._classifyChipType(theta);

    log.debug(`[CompositeMachiningPhysics] FiberOrientation: θ=${theta.toFixed(1)}°, Fc=${Fc.toFixed(2)} N, regime=${regime}`);

    return {
      Fc_N: Fc,
      force_ratio,
      regime,
      regime_bounds_deg: regime_bounds,
      chip_type,
    };
  }

  // ─── Model 3: Delamination Factor Prediction ──────────────────

  /**
   * Delamination factor prediction — Fd = Dmax / Dnom.
   *
   * Predicts the delamination factor based on drilling parameters
   * and composite layup. Combines the Hocheng-Dharan critical force
   * with an empirical thrust force model to predict whether
   * delamination occurs and its severity.
   *
   * Thrust force model: Ft = Kt × d^α × f^β × N^γ
   * where d = drill diameter, f = feed, N = speed.
   *
   * Delamination factor: Fd = 1 + Cd × max(0, Ft/Fc_crit - 1)^n_d
   * where Cd and n_d are empirical constants.
   *
   * Reference: Chen WC (1997) "Some experimental investigations in
   *   the drilling of carbon fiber-reinforced plastic composite
   *   laminates." Int J Mach Tools Manuf 37(8):1097-1108.
   *
   * @param input - Drilling parameters
   * @returns Delamination factor and related metrics
   */
  delaminationFactor(input: DelaminationFactorInput): DelaminationFactorOutput {
    const {
      feed_mm_rev,
      speed_rpm,
      drill_diameter_mm,
      point_angle_deg = 118,
      num_plies = 24,
      ply_thickness_mm = 0.125,
      material_key,
    } = input;

    if (feed_mm_rev <= 0) throw new Error("Feed rate must be positive");
    if (speed_rpm <= 0) throw new Error("Spindle speed must be positive");
    if (drill_diameter_mm <= 0) throw new Error("Drill diameter must be positive");

    // Get material properties (defaults to CFRP-T300)
    const mat = material_key
      ? COMPOSITE_MATERIAL_DB[material_key] ?? COMPOSITE_MATERIAL_DB["CFRP-T300"]
      : COMPOSITE_MATERIAL_DB["CFRP-T300"];

    // Uncut thickness = remaining plies × ply thickness (last ply scenario)
    const h_m = ply_thickness_mm * 1e-3; // single ply for exit delamination

    // Critical thrust force from Hocheng-Dharan
    const { Fc_N: Fc_crit } = this.hochengDharanDelamination({
      GIc: mat.GIc,
      E: mat.E,
      h: h_m,
      nu: mat.nu,
    });

    // Empirical thrust force model for drilling composites
    // Ft = Kt × d^0.85 × f^0.95 × N^(-0.05)
    // Kt depends on material type and point angle
    const point_factor = Math.sin((point_angle_deg / 2) * DEG);
    let Kt: number;
    switch (mat.type) {
      case "CFRP": Kt = 120; break;
      case "GFRP": Kt = 80; break;
      case "MMC": Kt = 250; break;
      case "CMC": Kt = 300; break;
      case "AFRP": Kt = 60; break;
      default: Kt = 120;
    }

    const Ft = Kt * point_factor
      * Math.pow(drill_diameter_mm, 0.85)
      * Math.pow(feed_mm_rev, 0.95)
      * Math.pow(speed_rpm, -0.05);

    // Delamination factor model
    // Fd = 1 + Cd × max(0, Ft/Fc_crit - 1)^n_d
    // Cd ~ 0.4-0.8 depending on layup, n_d ~ 0.5
    const Cd = 0.5 + 0.01 * num_plies;  // more plies → more constraint
    const n_d = 0.5;
    const force_ratio = Ft / Fc_crit;
    const delamination_predicted = force_ratio > 1.0;
    const Fd = 1.0 + Cd * Math.pow(Math.max(0, force_ratio - 1), n_d);

    const Dnom = drill_diameter_mm;
    const Dmax = Fd * Dnom;

    log.debug(`[CompositeMachiningPhysics] DelaminationFactor: Fd=${Fd.toFixed(3)}, Ft=${Ft.toFixed(2)} N, Fc_crit=${Fc_crit.toFixed(2)} N`);

    return {
      Fd,
      Dmax_mm: Dmax,
      Dnom_mm: Dnom,
      thrust_force_N: Ft,
      critical_thrust_N: Fc_crit,
      delamination_predicted,
    };
  }

  // ─── Model 4: Thermal Damage ───────────────────────────────────

  /**
   * Thermal damage model — predicts temperature rise and Tg exceedance.
   *
   * In polymer-matrix composites (CFRP, GFRP, AFRP), exceeding the
   * glass transition temperature Tg causes matrix degradation,
   * delamination, and loss of structural integrity. The model computes
   * the heat partition into the workpiece and the resulting temperature.
   *
   * Temperature rise: ΔT = η × Fc × Vc / (ρ × cp × Q)
   * where Q = chip cross-section volume flow rate = A_chip × Vc
   * Simplification: ΔT = η × Fc / (ρ × cp × A_chip)
   *
   * Reference: Davim JP, Reis P (2003) "Drilling carbon fiber reinforced
   *   plastics manufactured by autoclave — experimental and statistical
   *   study." Mater Des 24(5):315-324.
   *
   * @param input - Thermal parameters
   * @returns Temperature rise and damage prediction
   */
  thermalDamage(input: ThermalDamageInput): ThermalDamageOutput {
    const {
      Fc_N,
      Vc_m_min,
      rho,
      cp,
      chip_area_m2,
      eta = 0.4,
      Tg,
      T_ambient = 25,
    } = input;

    if (Fc_N < 0) throw new Error("Cutting force must be non-negative");
    if (Vc_m_min < 0) throw new Error("Cutting speed must be non-negative");
    if (rho <= 0) throw new Error("Density must be positive");
    if (cp <= 0) throw new Error("Specific heat must be positive");
    if (chip_area_m2 <= 0) throw new Error("Chip area must be positive");
    if (eta < 0 || eta > 1) throw new Error("Heat partition ratio must be in [0, 1]");

    // Convert cutting speed to m/s
    const Vc_ms = Vc_m_min / 60;

    // Heat flux into workpiece (W)
    const heat_flux = eta * Fc_N * Vc_ms;

    // Volume flow rate of material being removed (m³/s)
    const Q_vol = chip_area_m2 * Vc_ms;

    // Temperature rise: ΔT = heat_flux / (ρ × cp × Q_vol)
    // = η × Fc × Vc / (ρ × cp × A_chip × Vc) = η × Fc / (ρ × cp × A_chip)
    let delta_T: number;
    if (Vc_ms === 0 || Q_vol === 0) {
      delta_T = 0;
    } else {
      delta_T = heat_flux / (rho * cp * Q_vol);
    }

    const T_max = T_ambient + delta_T;
    const thermal_damage = T_max > Tg;
    const margin = Tg - T_max;

    log.debug(`[CompositeMachiningPhysics] ThermalDamage: ΔT=${delta_T.toFixed(1)}°C, T_max=${T_max.toFixed(1)}°C, Tg=${Tg}°C, damage=${thermal_damage}`);

    return {
      delta_T_C: delta_T,
      T_max_C: T_max,
      Tg_C: Tg,
      thermal_damage,
      margin_C: margin,
      heat_flux_W: heat_flux,
    };
  }

  // ─── Model 5: Tool Wear for Composites ─────────────────────────

  /**
   * Tool wear model for composite machining — abrasive wear dominance.
   *
   * Composite materials (especially CFRP and MMC) cause predominantly
   * abrasive tool wear due to hard fibers/particles. Flank wear VB
   * follows a power-law model with cutting speed, feed, and cutting length.
   *
   * VB = K × Vc^a × f^b × L^c
   *
   * Tool life criterion: VB > 0.3 mm (ISO 3685 convention for composites).
   *
   * Reference: Rawat S, Attia H (2009) "Wear mechanisms and tool life
   *   management of WC-Co tools for cutting CFRP." Wear 267(5-8):1022-1030.
   *
   * @param input - Tool wear parameters
   * @returns Flank wear and tool life status
   */
  compositeToolWear(input: CompositeToolWearInput): CompositeToolWearOutput {
    const { Vc_m_min, feed_mm_rev, cutting_length_m, K, a, b, c } = input;

    if (Vc_m_min < 0) throw new Error("Cutting speed must be non-negative");
    if (feed_mm_rev < 0) throw new Error("Feed rate must be non-negative");
    if (cutting_length_m < 0) throw new Error("Cutting length must be non-negative");
    if (K <= 0) throw new Error("Wear coefficient K must be positive");

    // Handle zero inputs gracefully
    if (Vc_m_min === 0 || feed_mm_rev === 0 || cutting_length_m === 0) {
      return { VB_mm: 0, end_of_life: false, remaining_life_fraction: 1.0 };
    }

    // VB = K × Vc^a × f^b × L^c
    const VB = K * Math.pow(Vc_m_min, a) * Math.pow(feed_mm_rev, b) * Math.pow(cutting_length_m, c);

    const VB_limit = 0.3; // mm — ISO 3685 end-of-life criterion
    const end_of_life = VB >= VB_limit;
    const remaining_life_fraction = Math.max(0, Math.min(1, 1 - VB / VB_limit));

    log.debug(`[CompositeMachiningPhysics] ToolWear: VB=${VB.toFixed(4)} mm, EOL=${end_of_life}`);

    return { VB_mm: VB, end_of_life, remaining_life_fraction };
  }

  // ─── Model 6: Surface Roughness for Composites ─────────────────

  /**
   * Surface roughness model for composite machining.
   *
   * Surface quality in composites is governed by four mechanisms:
   * 1. Geometric/kinematic component (feed marks): Ra_geom = f²/(32×r)
   * 2. Fiber pull-out: depends on fiber angle — worst near 90°-135°
   * 3. Matrix smearing: increases at high speed
   * 4. Tool wear degradation: higher VB → worse surface
   *
   * Total: Ra = Ra_geom + Ra_pullout + Ra_smear + Ra_wear
   *
   * Reference: Palanikumar K (2007) "Modeling and analysis for surface
   *   roughness in machining glass fibre reinforced plastics."
   *   J Mater Process Technol 197(1-3):55-63.
   *
   * @param input - Surface roughness parameters
   * @returns Ra value and contribution breakdown
   */
  compositeSurfaceRoughness(input: CompositeSurfaceRoughnessInput): CompositeSurfaceRoughnessOutput {
    const {
      feed_mm_rev,
      speed_m_min,
      fiber_angle_deg,
      tool_wear_VB_mm = 0,
      nose_radius_mm = 0.8,
    } = input;

    if (feed_mm_rev < 0) throw new Error("Feed rate must be non-negative");
    if (speed_m_min < 0) throw new Error("Cutting speed must be non-negative");
    if (nose_radius_mm <= 0) throw new Error("Nose radius must be positive");

    // 1. Geometric component: Ra_geom = f² / (32 × r) (mm → μm conversion)
    const Ra_geom = (feed_mm_rev * feed_mm_rev) / (32 * nose_radius_mm) * 1000; // μm

    // 2. Fiber pull-out component
    // Pull-out is worst at 90°-135° where fibers bend/bounce rather than shear cleanly
    const theta = ((fiber_angle_deg % 180) + 180) % 180; // normalize to [0, 180)
    const theta_rad = theta * DEG;
    // Bell-shaped function peaking near 110°
    const pullout_factor = Math.exp(-Math.pow((theta - 110) / 40, 2));
    const Ra_pullout = 2.5 * pullout_factor; // μm — peak ~2.5 μm for bad angles

    // 3. Matrix smearing — increases with speed (thermal softening of matrix)
    const Ra_smear = 0.3 * Math.pow(speed_m_min / 100, 0.5); // μm

    // 4. Tool wear effect — linear degradation with VB
    const Ra_wear = 5.0 * tool_wear_VB_mm; // μm per mm of VB

    const Ra = Ra_geom + Ra_pullout + Ra_smear + Ra_wear;

    log.debug(`[CompositeMachiningPhysics] SurfaceRoughness: Ra=${Ra.toFixed(3)} μm (geom=${Ra_geom.toFixed(3)}, pullout=${Ra_pullout.toFixed(3)}, smear=${Ra_smear.toFixed(3)}, wear=${Ra_wear.toFixed(3)})`);

    return {
      Ra_um: Ra,
      contributions: {
        geometric: Ra_geom,
        fiber_pullout: Ra_pullout,
        matrix_smearing: Ra_smear,
        tool_wear_effect: Ra_wear,
      },
    };
  }

  // ─── Model 7: Chip Formation Classification ───────────────────

  /**
   * Chip formation classification for composites — four types
   * based on fiber orientation angle.
   *
   * - Type I (θ < 15°): Deformation — fibers deform by micro-buckling,
   *   continuous chip formation
   * - Type II (15° ≤ θ < 75°): Shearing — fibers fracture by shear,
   *   discontinuous chips
   * - Type III (75° ≤ θ < 105°): Bending — fibers bend before fracture,
   *   fracture propagates ahead of tool
   * - Type IV (θ ≥ 105°): Macro-fracture — fibers bounce back,
   *   subsurface damage and delamination
   *
   * Reference: Wang DH, Ramulu M, Arola D (1995) "Orthogonal cutting
   *   mechanisms of graphite/epoxy composite." Int J Mach Tools Manuf
   *   35(12):1623-1638.
   *
   * @param input - Fiber angle and cutting geometry
   * @returns Chip type classification and recommendations
   */
  chipFormation(input: ChipFormationInput): ChipFormationOutput {
    const { fiber_angle_deg, depth_of_cut_mm, fiber_diameter_m } = input;

    if (depth_of_cut_mm <= 0) throw new Error("Depth of cut must be positive");
    if (fiber_diameter_m <= 0) throw new Error("Fiber diameter must be positive");

    // Normalize angle to [0, 180]
    let theta = ((fiber_angle_deg % 180) + 180) % 180;

    const chip_type = this._classifyChipType(theta);

    // Depth-to-fiber-diameter ratio affects severity
    const depth_ratio = (depth_of_cut_mm * 1e-3) / fiber_diameter_m;

    let mechanism: string;
    let morphology: string;
    let severity: number;
    let recommendation: string;

    switch (chip_type) {
      case "I_deformation":
        mechanism = "Fiber micro-buckling and compressive failure; matrix crazing";
        morphology = "Continuous ribbon-like chips with intact fiber fragments";
        severity = 0.1 + 0.05 * Math.min(depth_ratio / 100, 1);
        recommendation = "Optimal cutting zone — use sharp tools with positive rake angle";
        break;
      case "II_shearing":
        mechanism = "Fiber shear fracture along fiber/matrix interface; chip segments form by inter-laminar shear";
        morphology = "Discontinuous block-shaped chips with angled fracture surfaces";
        severity = 0.25 + 0.1 * Math.sin(theta * DEG);
        recommendation = "Moderate zone — maintain sharp edge, use moderate feed to avoid delamination";
        break;
      case "III_bending":
        mechanism = "Fibers bend under cutting load, fracture by tensile stress on far side; crack propagates below surface";
        morphology = "Fragmented, powder-like chips mixed with bent fiber bundles";
        severity = 0.55 + 0.15 * Math.min(depth_ratio / 50, 1);
        recommendation = "Challenging zone — reduce depth of cut, use backup support to minimize delamination";
        break;
      case "IV_macro_fracture":
        mechanism = "Fibers spring back (elastic recovery), pull-out from matrix; macro-fracture propagates well below cutting plane";
        morphology = "Large irregular chip fragments with extensive fiber pull-out and matrix crumbling";
        severity = 0.75 + 0.15 * Math.min(depth_ratio / 30, 1);
        recommendation = "Worst zone — minimize material removal, consider reverse-direction cutting or climb milling";
        break;
    }

    log.debug(`[CompositeMachiningPhysics] ChipFormation: θ=${theta.toFixed(1)}°, type=${chip_type}, severity=${severity.toFixed(2)}`);

    return {
      chip_type,
      mechanism,
      morphology,
      subsurface_damage_severity: Math.min(severity, 1.0),
      recommendation,
    };
  }

  // ─── Model 8: Specific Cutting Energy ──────────────────────────

  /**
   * Specific cutting energy for composites — rule-of-mixtures model.
   *
   * The total specific cutting energy of a composite is the
   * weighted sum of fiber, matrix, and interface contributions:
   *
   * kc_composite = Vf × kc_fiber + (1-Vf) × kc_matrix + kc_interface
   *
   * The interface term accounts for fiber/matrix debonding energy
   * and is independent of volume fraction (proportional to
   * interfacial area which scales differently).
   *
   * Reference: Hintze W, Hartmann D (2013) "Modeling of delamination
   *   during milling of unidirectional CFRP." Procedia CIRP 8:444-449.
   *
   * @param input - Volume fractions and component cutting energies
   * @returns Total specific cutting energy and breakdown
   */
  specificCuttingEnergy(input: SpecificCuttingEnergyInput): SpecificCuttingEnergyOutput {
    const { Vf, kc_fiber, kc_matrix, kc_interface } = input;

    if (Vf < 0 || Vf > 1) throw new Error("Fiber volume fraction must be in [0, 1]");
    if (kc_fiber < 0) throw new Error("Fiber cutting energy must be non-negative");
    if (kc_matrix < 0) throw new Error("Matrix cutting energy must be non-negative");
    if (kc_interface < 0) throw new Error("Interface cutting energy must be non-negative");

    const fiber_contribution = Vf * kc_fiber;
    const matrix_contribution = (1 - Vf) * kc_matrix;
    const kc_composite = fiber_contribution + matrix_contribution + kc_interface;

    // Fraction breakdown
    const total = kc_composite || 1; // avoid division by zero
    const fiber_fraction = fiber_contribution / total;
    const matrix_fraction = matrix_contribution / total;
    const interface_fraction = kc_interface / total;

    log.debug(`[CompositeMachiningPhysics] SpecificCuttingEnergy: kc=${(kc_composite / 1e6).toFixed(1)} MPa (fiber=${(fiber_fraction * 100).toFixed(1)}%, matrix=${(matrix_fraction * 100).toFixed(1)}%, interface=${(interface_fraction * 100).toFixed(1)}%)`);

    return {
      kc_composite,
      fiber_fraction,
      matrix_fraction,
      interface_fraction,
    };
  }

  // ─── Internal Helpers ──────────────────────────────────────────

  /**
   * Classify chip formation type from fiber angle.
   * @internal
   */
  private _classifyChipType(theta_deg: number): ChipFormationOutput["chip_type"] {
    // Normalize to [0, 180]
    const theta = ((theta_deg % 180) + 180) % 180;

    if (theta < 15) return "I_deformation";
    if (theta < 75) return "II_shearing";
    if (theta < 105) return "III_bending";
    return "IV_macro_fracture";
  }
}
