/**
 * KienzleForceModelEngine — Foundational Kienzle specific cutting force model
 *
 * Implements the complete Kienzle (1952) model for predicting cutting forces
 * in machining operations, including corrections for rake angle, tool wear,
 * speed (BUE region), and size effect at thin chips.
 *
 * Core equation: kc = kc1.1 * h^(-mc)
 *   where kc1.1 = specific cutting force at h=1mm, b=1mm [N/mm^2]
 *         mc    = Kienzle exponent (material-dependent, 0.14-0.40)
 *         h     = undeformed chip thickness [mm]
 *
 * Methods:
 *   - calculateSpecificCuttingForce: Full Kienzle with rake/wear/speed corrections
 *   - calculateForceComponents: Fc, Ff, Fp, resultant, torque, power
 *   - getKienzleCoefficientTable: ISO material group lookup (12 materials)
 *   - calculateSizeEffect: Thin-chip correction + ploughing force
 *   - calculateMillingForces: Instantaneous & average milling forces
 *   - predictFromMaterialHardness: Empirical HB-to-kc1.1 correlation
 *
 * Reference:
 *   Kienzle, O. (1952). "Die Bestimmung von Kraeften und Leistungen an
 *   spanenden Werkzeugen und Werkzeugmaschinen", VDI-Z, 94(11-12).
 *   Altintas, Y. (2012). "Manufacturing Automation", Ch. 2.
 *   Sandvik Coromant, "Metal Cutting Technology", Ch. 5.
 *
 * Actions: kienzle_specific_force, kienzle_force_components, kienzle_milling_forces
 */

import { RobustRegressionEngine } from "./RobustRegressionEngine.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;
const REFERENCE_RAKE_DEG = 6; // gamma_0: reference rake angle [deg]

// ─── Types ──────────────────────────────────────────────────────────

/** Kienzle coefficient pair for a material. */
export interface KienzleCoefficients {
  /** Specific cutting force at h=1mm, b=1mm [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent (dimensionless, typically 0.14-0.40) */
  mc: number;
  /** ISO material group: P, M, K, N, S, H */
  iso_group: string;
  /** Material description */
  description: string;
}

export interface SpecificCuttingForceInput {
  /** kc1.1 specific cutting force at h=1mm [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent mc (dimensionless) */
  mc: number;
  /** Feed per revolution (turning) or feed per tooth (milling) [mm] */
  feed_mm: number;
  /** Depth of cut (turning: ap) or axial depth (milling) [mm] */
  depth_of_cut_mm: number;
  /** Approach (lead) angle kappa_r [deg], default 90 */
  approach_angle_deg?: number;
  /** Actual rake angle gamma [deg], default 6 (reference) */
  rake_angle_deg?: number;
  /** Flank wear VB [mm], default 0 (sharp tool) */
  flank_wear_mm?: number;
  /** Cutting speed [m/min], used for speed correction & power calc */
  cutting_speed_mpm?: number;
  /** Tool diameter [mm], needed for torque calc */
  tool_diameter_mm?: number;
}

export interface SpecificCuttingForceResult {
  /** Uncorrected specific cutting force kc [N/mm^2] */
  kc: number;
  /** Corrected specific cutting force (rake + wear + speed) [N/mm^2] */
  kc_corrected: number;
  /** Undeformed chip thickness h [mm] */
  chip_thickness_h: number;
  /** Main cutting force Fc [N] */
  main_cutting_force_Fc: number;
  /** Feed force Ff [N] (approx 0.5*Fc) */
  feed_force_Ff: number;
  /** Passive (radial) force Fp [N] (approx 0.3*Fc) */
  passive_force_Fp: number;
  /** Cutting power Pc [kW] */
  cutting_power_Pc: number;
  /** Specific cutting energy [J/mm^3] */
  specific_energy: number;
  /** Applied correction factors */
  corrections: {
    rake_factor: number;
    wear_factor: number;
    speed_factor: number;
  };
  warnings: string[];
}

export interface ForceComponentsInput {
  /** Operation type */
  operation: "turning" | "milling";
  /** kc1.1 [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent */
  mc: number;
  /** Feed [mm/rev for turning, mm/tooth for milling] */
  feed_mm: number;
  /** Depth of cut ap [mm] */
  depth_of_cut_mm: number;
  /** Approach angle [deg], default 90 */
  approach_angle_deg?: number;
  /** Rake angle [deg], default 6 */
  rake_angle_deg?: number;
  /** Cutting speed [m/min] */
  cutting_speed_mpm?: number;
  /** Tool diameter [mm] */
  tool_diameter_mm?: number;
  /** Feed force ratio Ff/Fc (default 0.5) */
  feed_force_ratio?: number;
  /** Passive force ratio Fp/Fc (default 0.3) */
  passive_force_ratio?: number;
  /** Radial engagement ae [mm] (milling) */
  radial_engagement_mm?: number;
  /** Number of flutes (milling) */
  flutes?: number;
}

export interface ForceComponentsResult {
  /** Main cutting force Fc [N] */
  Fc: number;
  /** Feed force Ff [N] */
  Ff: number;
  /** Passive force Fp [N] */
  Fp: number;
  /** Resultant force Fr [N] = sqrt(Fc^2 + Ff^2 + Fp^2) */
  Fr: number;
  /** Torque M [Nm] */
  torque_Nm: number;
  /** Power Pc [kW] */
  power_kW: number;
  /** Specific cutting force used [N/mm^2] */
  kc: number;
  /** Chip thickness h [mm] */
  chip_thickness_h: number;
}

export interface SizeEffectInput {
  /** kc1.1 [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent */
  mc: number;
  /** Undeformed chip thickness h [mm] */
  chip_thickness_mm: number;
  /** Width of cut b [mm] */
  width_mm: number;
  /** Minimum chip thickness h_min [mm], default 0.02 */
  h_min_mm?: number;
  /** Ploughing coefficient kp [N/mm], default 20 */
  ploughing_coeff?: number;
  /** Size effect exponent p, default 0.5 */
  size_exponent?: number;
}

export interface SizeEffectResult {
  /** Corrected specific cutting force with size effect [N/mm^2] */
  kc_size: number;
  /** Base kc without size effect [N/mm^2] */
  kc_base: number;
  /** Cutting force contribution [N] */
  cutting_force: number;
  /** Ploughing force contribution [N] (only if h < h_min) */
  ploughing_force: number;
  /** Total force [N] */
  total_force: number;
  /** Size effect ratio kc_size/kc_base */
  size_effect_ratio: number;
  /** Whether ploughing is active */
  ploughing_active: boolean;
}

export interface MillingForceInput {
  /** kc1.1 [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent */
  mc: number;
  /** Feed per tooth fz [mm/tooth] */
  feed_per_tooth_mm: number;
  /** Axial depth of cut ap [mm] */
  axial_depth_mm: number;
  /** Radial depth of cut ae [mm] */
  radial_depth_mm: number;
  /** Tool diameter D [mm] */
  tool_diameter_mm: number;
  /** Number of flutes z */
  flutes: number;
  /** Approach angle [deg], default 90 */
  approach_angle_deg?: number;
  /** Milling type */
  milling_type: "up" | "down" | "slot";
  /** Spindle speed [RPM], for power calc */
  spindle_rpm?: number;
  /** Angular resolution for instantaneous force [deg], default 5 */
  angular_resolution_deg?: number;
}

export interface MillingForceResult {
  /** Average tangential force [N] */
  Fc_avg: number;
  /** Peak tangential force [N] */
  Fc_peak: number;
  /** Peak-to-average ratio */
  peak_to_avg_ratio: number;
  /** Average number of teeth in cut */
  avg_teeth_in_cut: number;
  /** Entry angle phi_start [deg] */
  entry_angle_deg: number;
  /** Exit angle phi_exit [deg] */
  exit_angle_deg: number;
  /** Engagement arc [deg] */
  engagement_arc_deg: number;
  /** Average torque [Nm] */
  avg_torque_Nm: number;
  /** Average power [kW] */
  avg_power_kW: number;
  /** Instantaneous force profile (phi_deg, Fc_N) */
  force_profile: Array<{ phi_deg: number; Fc_N: number }>;
}

export interface HardnessPredictionInput {
  /** Brinell hardness HB */
  hardness_HB: number;
  /** Material family hint (optional, improves accuracy) */
  material_family?: "steel" | "stainless" | "cast_iron" | "aluminum" | "titanium" | "nickel_alloy";
}

export interface HardnessPredictionResult {
  /** Predicted kc1.1 [N/mm^2] */
  predicted_kc1_1: number;
  /** Predicted mc */
  predicted_mc: number;
  /** Confidence note */
  confidence: string;
  /** Closest match from coefficient table */
  closest_table_match: KienzleCoefficients | null;
}

// ─── Coefficient Table ──────────────────────────────────────────────

/**
 * Kienzle coefficients for specific alloys (per-grade resolution).
 * kc1_1 in N/mm^2, mc dimensionless.
 * Sources: VDI 3321, Sandvik Orange Book, Kennametal catalogs.
 *
 * NOTE (F360-REV-MS1 U-SAF04): These are PER-ALLOY values that are MORE SPECIFIC
 * than the per-ISO-group values in physics/constants.ts (CANONICAL_KIENZLE).
 * Canonical ISO group averages: P=1800, M=2100, K=1100, N=700, S=2800, H=3200.
 * This table provides alloy-specific refinements (e.g., 304SS=2450, 316SS=2600)
 * that override the group average when a specific alloy is identified.
 * When only ISO group is known, use CANONICAL_KIENZLE from constants.ts.
 */
const KIENZLE_TABLE: KienzleCoefficients[] = [
  { kc1_1: 1780, mc: 0.26, iso_group: "P", description: "AISI 1045 (plain carbon steel)" },
  { kc1_1: 2100, mc: 0.25, iso_group: "P", description: "AISI 4140 (alloy steel)" },
  { kc1_1: 2450, mc: 0.21, iso_group: "M", description: "AISI 304 (austenitic stainless)" },
  { kc1_1: 2600, mc: 0.22, iso_group: "M", description: "AISI 316 (austenitic stainless)" },
  { kc1_1: 1150, mc: 0.28, iso_group: "K", description: "GG25 (gray cast iron)" },
  { kc1_1: 1350, mc: 0.24, iso_group: "K", description: "GGG50 (ductile cast iron)" },
  { kc1_1: 650,  mc: 0.23, iso_group: "N", description: "Aluminum 6061-T6" },
  { kc1_1: 750,  mc: 0.25, iso_group: "N", description: "Aluminum 7075-T6" },
  { kc1_1: 2800, mc: 0.28, iso_group: "S", description: "Ti-6Al-4V" },
  { kc1_1: 2800, mc: 0.28, iso_group: "S", description: "Inconel 718" },
  { kc1_1: 3200, mc: 0.30, iso_group: "H", description: "Hardened steel 55 HRC" },
  { kc1_1: 3200, mc: 0.30, iso_group: "H", description: "Hardened steel 62 HRC" },
];

// ─── Engine ─────────────────────────────────────────────────────────

/** Cached Ridge-fitted hardness→kc1.1 models per material family */
interface FittedModel {
  slope: number;
  intercept: number;
  r2: number;
  nSamples: number;
}
const _fittedKc11Models: Map<string, FittedModel> = new Map();
const _fittedMcModels: Map<string, FittedModel> = new Map();

export class KienzleForceModelEngine {

  /**
   * Fit data-driven hardness→kc1.1 and hardness→mc models via Ridge regression.
   * Call once with training data extracted from MaterialRegistry (materials
   * that have both hardness_HB and kienzle coefficients).
   *
   * Uses RobustRegressionEngine.ridge() for regularized fitting.
   *
   * @param data Training data: arrays of { hardness_HB, kc1_1, mc, family }
   * @param lambda Ridge regularization (default 0.1)
   * @returns Fitted model stats per family
   */
  fitCoefficientModel(
    data: Array<{ hardness_HB: number; kc1_1: number; mc: number; family: string }>,
    lambda = 0.1
  ): Record<string, { kc11: FittedModel; mc: FittedModel }> {
    // Group by material family
    const byFamily = new Map<string, typeof data>();
    for (const d of data) {
      const key = d.family || "steel";
      if (!byFamily.has(key)) byFamily.set(key, []);
      byFamily.get(key)!.push(d);
    }

    const results: Record<string, { kc11: FittedModel; mc: FittedModel }> = {};

    for (const [family, points] of byFamily) {
      if (points.length < 3) continue; // Need minimum 3 points for meaningful fit

      // kc1.1 = β0 + β1*HB (Ridge)
      const X = points.map(p => [p.hardness_HB]);
      const yKc = points.map(p => p.kc1_1);
      const yMc = points.map(p => p.mc);

      try {
        const kcFit = RobustRegressionEngine.ridge(X, yKc, { lambda, fitIntercept: true });
        const kcModel: FittedModel = {
          slope: kcFit.coefficients[0],
          intercept: kcFit.intercept,
          r2: kcFit.r2,
          nSamples: points.length,
        };
        _fittedKc11Models.set(family, kcModel);

        const mcFit = RobustRegressionEngine.ridge(X, yMc, { lambda, fitIntercept: true });
        const mcModel: FittedModel = {
          slope: mcFit.coefficients[0],
          intercept: mcFit.intercept,
          r2: mcFit.r2,
          nSamples: points.length,
        };
        _fittedMcModels.set(family, mcModel);

        results[family] = { kc11: kcModel, mc: mcModel };
      } catch { /* Ridge fit failed — family keeps hardcoded fallback */ }
    }

    return results;
  }

  /**
   * Calculate specific cutting force using the full Kienzle model with corrections.
   *
   * Core: kc = kc1.1 * h^(-mc)
   * Corrections: rake angle, flank wear, speed (BUE region).
   *
   * @param params - Cutting parameters including kc1.1, mc, feed, depth
   * @returns Specific cutting force, corrected kc, forces, power, and warnings
   */
  calculateSpecificCuttingForce(params: SpecificCuttingForceInput): SpecificCuttingForceResult {
    const {
      kc1_1,
      mc,
      feed_mm,
      depth_of_cut_mm,
      approach_angle_deg = 90,
      rake_angle_deg = REFERENCE_RAKE_DEG,
      flank_wear_mm = 0,
      cutting_speed_mpm = 100,
      tool_diameter_mm,
    } = params;

    const warnings: string[] = [];

    // ── Validate inputs ──
    if (feed_mm <= 0) {
      return this._zeroResult("Feed must be > 0", warnings);
    }
    if (depth_of_cut_mm <= 0) {
      return this._zeroResult("Depth of cut must be > 0", warnings);
    }
    if (kc1_1 <= 0) {
      return this._zeroResult("kc1.1 must be > 0", warnings);
    }

    // ── Chip thickness: h = f * sin(kappa_r) ──
    const kappa_r = approach_angle_deg * DEG;
    const sin_kappa = Math.sin(kappa_r);
    const h = feed_mm * sin_kappa;

    if (h <= 0) {
      return this._zeroResult("Chip thickness h <= 0 (check approach angle)", warnings);
    }

    if (h < 0.01) {
      warnings.push("Very thin chip (h < 0.01 mm): size effect may dominate; consider calculateSizeEffect()");
    }

    // ── Base Kienzle: kc = kc1.1 * h^(-mc) ──
    const kc = kc1_1 * Math.pow(h, -mc);

    // ── Rake angle correction ──
    // kc_corrected = kc * (1 - 0.01 * (gamma - gamma_0))
    // Positive rake → lower force; negative rake → higher force
    const rake_factor = 1 - 0.01 * (rake_angle_deg - REFERENCE_RAKE_DEG);

    // ── Wear correction ──
    // kc_worn = kc * (1 + VB/0.3 * 0.2)
    // VB=0.3mm → 20% increase
    let wear_factor = 1.0;
    if (flank_wear_mm > 0) {
      wear_factor = 1 + (flank_wear_mm / 0.3) * 0.2;
    }
    if (flank_wear_mm > 0.4) {
      warnings.push("Flank wear VB > 0.4 mm: tool should be replaced (ISO 3685 limit)");
    }

    // ── Speed correction (BUE region) ──
    // BUE typically forms at 20-60 m/min for steels, increases kc by up to 15%
    let speed_factor = 1.0;
    if (cutting_speed_mpm >= 20 && cutting_speed_mpm <= 60) {
      // Parabolic bump in BUE zone, peak at 40 m/min
      const x = (cutting_speed_mpm - 40) / 20;
      speed_factor = 1 + 0.15 * (1 - x * x);
    }

    const kc_corrected = kc * rake_factor * wear_factor * speed_factor;

    // ── Forces ──
    // Fc = kc_corrected * ap * f  (for turning with kappa_r=90, b=ap, h=f)
    // General: Fc = kc_corrected * b * h where b = ap / sin(kappa_r)
    const b = depth_of_cut_mm / sin_kappa; // width of cut
    const Fc = kc_corrected * b * h; // = kc_corrected * ap * f (when kappa_r=90)
    const Ff = 0.5 * Fc;  // feed force ratio
    const Fp = 0.3 * Fc;  // passive force ratio

    // ── Power: Pc = Fc * Vc / (60 * 1000) [kW] ──
    const Pc = (Fc * cutting_speed_mpm) / 60000;

    // ── Specific energy [J/mm^3] = kc_corrected [N/mm^2] (numerically equal) ──
    const specific_energy = kc_corrected;

    return {
      kc,
      kc_corrected,
      chip_thickness_h: h,
      main_cutting_force_Fc: Fc,
      feed_force_Ff: Ff,
      passive_force_Fp: Fp,
      cutting_power_Pc: Pc,
      specific_energy,
      corrections: {
        rake_factor,
        wear_factor,
        speed_factor,
      },
      warnings,
    };
  }

  /**
   * Calculate all three force components, resultant, torque, and power.
   *
   * Turning: Fc = kc * ap * f, Ff = ratio * Fc, Fp = ratio * Fc
   * Milling: Fc_avg uses average chip thickness over engagement arc.
   *
   * @param params - Operation type, Kienzle params, geometry
   * @returns Force components, resultant, torque [Nm], power [kW]
   */
  calculateForceComponents(params: ForceComponentsInput): ForceComponentsResult {
    const {
      operation,
      kc1_1,
      mc,
      feed_mm,
      depth_of_cut_mm,
      approach_angle_deg = 90,
      rake_angle_deg = REFERENCE_RAKE_DEG,
      cutting_speed_mpm = 100,
      tool_diameter_mm = 20,
      feed_force_ratio = 0.5,
      passive_force_ratio = 0.3,
      radial_engagement_mm,
      flutes = 4,
    } = params;

    const kappa_r = approach_angle_deg * DEG;
    const sin_kappa = Math.sin(kappa_r);
    let h: number;
    let kc: number;
    let Fc: number;

    if (operation === "turning") {
      h = feed_mm * sin_kappa;
      if (h <= 0) h = 1e-6;
      kc = kc1_1 * Math.pow(h, -mc);
      // Apply rake correction
      kc *= (1 - 0.01 * (rake_angle_deg - REFERENCE_RAKE_DEG));
      const b = depth_of_cut_mm / sin_kappa;
      Fc = kc * b * h;
    } else {
      // Milling: average chip thickness
      const ae = radial_engagement_mm ?? tool_diameter_mm * 0.5;
      const D = tool_diameter_mm;
      const R = D / 2;
      // Engagement angle
      const cos_engagement = 1 - ae / R;
      const engagement = Math.acos(Math.max(-1, Math.min(1, cos_engagement)));
      // Martellotti mean chip thickness: h_avg = fz * (1-cos(engagement))/engagement * sin(kappa_r)
      // Ref: Martellotti (1941), Altintas (2012) eq 2.32
      const h_avg = engagement > 1e-6
        ? feed_mm * ((1 - Math.cos(engagement)) / engagement) * sin_kappa
        : feed_mm * sin_kappa;
      h = Math.max(h_avg, 1e-6);
      kc = kc1_1 * Math.pow(h, -mc);
      kc *= (1 - 0.01 * (rake_angle_deg - REFERENCE_RAKE_DEG));
      // Fc_avg = kc * ap * h_avg * z * (engagement / (2*pi))
      const avg_teeth = flutes * engagement / (2 * Math.PI);
      Fc = kc * depth_of_cut_mm * h * avg_teeth;
    }

    const Ff = feed_force_ratio * Fc;
    const Fp = passive_force_ratio * Fc;
    const Fr = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);

    // Torque: M = Fc * D/2 [N*mm] → Nm
    const torque_Nm = (Fc * tool_diameter_mm / 2) / 1000;

    // Power: Pc = Fc * Vc / 60000 [kW]
    const power_kW = (Fc * cutting_speed_mpm) / 60000;

    return { Fc, Ff, Fp, Fr, torque_Nm, power_kW, kc, chip_thickness_h: h };
  }

  /**
   * Return the full Kienzle coefficient table for 12 ISO material groups.
   *
   * Covers groups P (steel), M (stainless), K (cast iron), N (aluminum),
   * S (heat-resistant alloys), H (hardened steel).
   *
   * @returns Array of KienzleCoefficients with kc1_1, mc, iso_group, description
   */
  getKienzleCoefficientTable(): KienzleCoefficients[] {
    return [...KIENZLE_TABLE];
  }

  /**
   * Calculate size effect correction for thin chips (h < ~0.05 mm).
   *
   * At very small chip thicknesses the specific cutting force rises sharply
   * beyond the Kienzle power-law prediction due to:
   *   1. Edge radius dominance (ploughing instead of cutting)
   *   2. Strain gradient plasticity (material strengthening at small scales)
   *
   * Model: kc_size = kc1.1 * h^(-mc) * (1 + (h_min/h)^p)
   * Ploughing: F_plough = kp * b  (when h < h_min)
   *
   * @param params - Chip thickness, material coefficients, size-effect params
   * @returns Corrected kc, cutting + ploughing forces, size effect ratio
   */
  calculateSizeEffect(params: SizeEffectInput): SizeEffectResult {
    const {
      kc1_1,
      mc,
      chip_thickness_mm,
      width_mm,
      h_min_mm = 0.02,
      ploughing_coeff = 20,
      size_exponent = 0.5,
    } = params;

    // Guard: h = 0 or negative → return zero forces, not NaN
    if (chip_thickness_mm <= 0) {
      return {
        kc_size: 0,
        kc_base: 0,
        cutting_force: 0,
        ploughing_force: ploughing_coeff * width_mm,
        total_force: ploughing_coeff * width_mm,
        size_effect_ratio: Infinity,
        ploughing_active: true,
      };
    }

    const h = chip_thickness_mm;
    const kc_base = kc1_1 * Math.pow(h, -mc);

    // Size effect amplification
    const size_amp = 1 + Math.pow(h_min_mm / h, size_exponent);
    const kc_size = kc_base * size_amp;

    const cutting_force = kc_size * width_mm * h;

    // Ploughing contribution (only when h < h_min)
    const ploughing_active = h < h_min_mm;
    const ploughing_force = ploughing_active ? ploughing_coeff * width_mm : 0;
    const total_force = cutting_force + ploughing_force;

    return {
      kc_size,
      kc_base,
      cutting_force,
      ploughing_force,
      total_force,
      size_effect_ratio: kc_size / kc_base,
      ploughing_active,
    };
  }

  /**
   * Calculate instantaneous and average milling forces using Kienzle model.
   *
   * Chip thickness varies with rotation angle:
   *   h(phi) = fz * sin(phi) * sin(kappa_r)
   *
   * Supports up-milling, down-milling, and slotting with correct entry/exit angles.
   *
   * @param params - Milling geometry, Kienzle coefficients, milling type
   * @returns Average/peak forces, force profile, engagement angles, power
   */
  calculateMillingForces(params: MillingForceInput): MillingForceResult {
    const {
      kc1_1,
      mc,
      feed_per_tooth_mm,
      axial_depth_mm,
      radial_depth_mm,
      tool_diameter_mm,
      flutes,
      approach_angle_deg = 90,
      milling_type,
      spindle_rpm = 1000,
      angular_resolution_deg = 5,
    } = params;

    const R = tool_diameter_mm / 2;
    const kappa_r = approach_angle_deg * DEG;
    const sin_kappa = Math.sin(kappa_r);
    const ae = Math.min(radial_depth_mm, tool_diameter_mm);

    // ── Engagement angles ──
    // cos(engagement_half) = (R - ae) / R = 1 - ae/R
    const cos_eng = Math.max(-1, Math.min(1, 1 - ae / R));
    const engagement_rad = Math.acos(cos_eng); // half-engagement for asymmetric

    let phi_start: number; // entry angle [rad]
    let phi_exit: number;  // exit angle [rad]

    if (milling_type === "up") {
      // Up-milling: cutter enters at phi=0, exits at engagement angle
      phi_start = 0;
      phi_exit = engagement_rad;
    } else if (milling_type === "down") {
      // Down-milling: cutter enters at (pi - engagement), exits at pi
      phi_start = Math.PI - engagement_rad;
      phi_exit = Math.PI;
    } else {
      // Slot: full engagement 0 to pi
      phi_start = 0;
      phi_exit = Math.PI;
    }

    const engagement_arc = phi_exit - phi_start;

    // ── Build instantaneous force profile ──
    const step = angular_resolution_deg * DEG;
    const force_profile: Array<{ phi_deg: number; Fc_N: number }> = [];
    let Fc_sum = 0;
    let Fc_peak = 0;
    let count = 0;

    // Sweep one full revolution (0-360) considering all flutes
    const tooth_spacing = (2 * Math.PI) / flutes;
    const nSteps = Math.ceil(360 / angular_resolution_deg);

    for (let i = 0; i <= nSteps; i++) {
      const phi_ref = i * step; // reference angle for flute 0
      let Fc_total = 0;

      for (let t = 0; t < flutes; t++) {
        let phi = phi_ref - t * tooth_spacing;
        // Normalize to [0, 2*pi)
        phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

        // Check if this tooth is in the engagement zone
        if (phi >= phi_start && phi <= phi_exit) {
          const sin_phi = Math.sin(phi);
          if (sin_phi > 0) {
            const h = feed_per_tooth_mm * sin_phi * sin_kappa;
            if (h > 0) {
              const kc = kc1_1 * Math.pow(h, -mc);
              const dFc = kc * axial_depth_mm * h;
              Fc_total += dFc;
            }
          }
        }
      }

      force_profile.push({
        phi_deg: (phi_ref / DEG) % 360,
        Fc_N: Fc_total,
      });

      Fc_sum += Fc_total;
      if (Fc_total > Fc_peak) Fc_peak = Fc_total;
      count++;
    }

    const Fc_avg = Fc_sum / count;
    const peak_to_avg = Fc_avg > 0 ? Fc_peak / Fc_avg : 0;

    // Average teeth in cut
    const avg_teeth_in_cut = flutes * engagement_arc / (2 * Math.PI);

    // Torque: M = Fc_avg * R / 1000 [Nm]
    const avg_torque_Nm = (Fc_avg * R) / 1000;

    // Power: P = M * omega = M * 2*pi*n/60 [W] → /1000 for kW
    const omega = (2 * Math.PI * spindle_rpm) / 60;
    const avg_power_kW = (avg_torque_Nm * omega) / 1000;

    return {
      Fc_avg,
      Fc_peak,
      peak_to_avg_ratio: peak_to_avg,
      avg_teeth_in_cut,
      entry_angle_deg: phi_start / DEG,
      exit_angle_deg: phi_exit / DEG,
      engagement_arc_deg: engagement_arc / DEG,
      avg_torque_Nm,
      avg_power_kW,
      force_profile,
    };
  }

  /**
   * Predict Kienzle coefficients from Brinell hardness.
   *
   * Empirical correlation (steels): kc1.1 ~ 3.5 * HB [N/mm^2]
   * mc is inversely correlated with hardness (harder → lower mc).
   *
   * @param params - Hardness HB and optional material family
   * @returns Predicted kc1.1, mc, confidence, closest table match
   */
  predictFromMaterialHardness(params: HardnessPredictionInput): HardnessPredictionResult {
    const { hardness_HB, material_family } = params;

    let predicted_kc1_1: number;
    let predicted_mc: number;
    let confidence: string;

    // Try Ridge-fitted model first (data-driven from MaterialRegistry)
    const family = material_family || "steel";
    const kcModel = _fittedKc11Models.get(family);
    const mcModel = _fittedMcModels.get(family);

    if (kcModel && mcModel && kcModel.nSamples >= 3) {
      predicted_kc1_1 = kcModel.intercept + kcModel.slope * hardness_HB;
      predicted_mc = mcModel.intercept + mcModel.slope * hardness_HB;
      confidence = `Ridge-fitted (${family}, n=${kcModel.nSamples}, R²_kc=${kcModel.r2.toFixed(2)}, R²_mc=${mcModel.r2.toFixed(2)})`;
    } else if (material_family === "aluminum") {
      // Hardcoded fallback: Aluminum correlation
      predicted_kc1_1 = 2.5 * hardness_HB + 400;
      predicted_mc = 0.24 - 0.0003 * hardness_HB;
      confidence = "moderate (aluminum correlation, R^2 ~ 0.80)";
    } else if (material_family === "cast_iron") {
      predicted_kc1_1 = 3.0 * hardness_HB + 500;
      predicted_mc = 0.30 - 0.0004 * hardness_HB;
      confidence = "moderate (cast iron correlation, R^2 ~ 0.82)";
    } else if (material_family === "stainless") {
      predicted_kc1_1 = 4.5 * hardness_HB + 1500;
      predicted_mc = 0.23 - 0.0002 * hardness_HB;
      confidence = "moderate (stainless correlation, R^2 ~ 0.78)";
    } else if (material_family === "titanium") {
      predicted_kc1_1 = 3.0 * hardness_HB + 700;
      predicted_mc = 0.20 - 0.0001 * hardness_HB;
      confidence = "low-moderate (titanium limited data, R^2 ~ 0.70)";
    } else if (material_family === "nickel_alloy") {
      predicted_kc1_1 = 5.0 * hardness_HB + 1200;
      predicted_mc = 0.19 - 0.0001 * hardness_HB;
      confidence = "low-moderate (nickel alloy limited data, R^2 ~ 0.72)";
    } else {
      // Default: steel correlation
      predicted_kc1_1 = 3.5 * hardness_HB;
      predicted_mc = 0.30 - 0.0005 * hardness_HB;
      confidence = "good for carbon/alloy steels (R^2 ~ 0.90)";
    }

    // Clamp mc to reasonable range
    predicted_mc = Math.max(0.10, Math.min(0.40, predicted_mc));

    // Find closest table match
    let closest: KienzleCoefficients | null = null;
    let minDist = Infinity;
    for (const entry of KIENZLE_TABLE) {
      const dist = Math.abs(entry.kc1_1 - predicted_kc1_1);
      if (dist < minDist) {
        minDist = dist;
        closest = entry;
      }
    }

    return {
      predicted_kc1_1,
      predicted_mc,
      confidence,
      closest_table_match: closest,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /** Return a zeroed result with an error warning. */
  private _zeroResult(msg: string, warnings: string[]): SpecificCuttingForceResult {
    warnings.push(msg);
    return {
      kc: 0,
      kc_corrected: 0,
      chip_thickness_h: 0,
      main_cutting_force_Fc: 0,
      feed_force_Ff: 0,
      passive_force_Fp: 0,
      cutting_power_Pc: 0,
      specific_energy: 0,
      corrections: { rake_factor: 1, wear_factor: 1, speed_factor: 1 },
      warnings,
    };
  }
}

// ─── Singleton Export ────────────────────────────────────────────────
export const kienzleForceModelEngine = new KienzleForceModelEngine();
