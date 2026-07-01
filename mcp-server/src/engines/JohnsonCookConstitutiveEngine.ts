// WIRE-EXEMPT: DUPLICATE of pre-existing JohnsonCookEngine (src/engines/JohnsonCookEngine.ts)
// which is wired into calcDispatcher.ts as jc_flow_stress / jc_params / jc_search / jc_list.
// This file was created during U-EXTRACT-JC-CONSTANTS (golf 2026-05-24) without a /dedup
// check — the existing engine has its own material table with values from different
// published sources (e.g. Ti6Al4V: existing A=850/B=350/m=0.82 vs this file A=862/B=331/m=0.80
// from MIT 3.22). Kept on disk per `feedback_never_delete_only_disable` so the constant-
// divergence can be audited; new code SHOULD use JohnsonCookEngine. A future
// `U-JC-CONSTANT-RECONCILE` unit will pick one canonical source per material.
/**
 * @deprecated Use {@link import("./JohnsonCookEngine.js").johnsonCookEngine} instead.
 *
 * JohnsonCookConstitutiveEngine — canonical 5-material Johnson-Cook flow-stress
 * table + accessor + stress evaluator.
 *
 * U-EXTRACT-JC-CONSTANTS (slot:golf 2026-05-24): extracted from
 * extracted_modules/physics_engines/PRISM_TAYLOR_ADVANCED.js. PRISM had 10+
 * engines referencing Johnson-Cook by name (MachiningPlaybookEngine,
 * UltimateSpeedFeedEngine, MillingPhysicsKernelEngine,
 * LatheThermodynamicsEngine, etc.) but the 5-parameter material constants
 * for AISI 1018 / AISI 4340 / Ti-6Al-4V / Al 2024-T3 / Inconel 718 were never
 * centralized in any single canonical location. This engine closes that gap.
 *
 * Why a new engine vs adding to physics/constants.ts:
 * constants.ts is shop-floor-safety-critical (guarded by `critical-file-guard`)
 * and requires explicit confirmation to edit. The JC table is canonical
 * physics but ADDITIVE, not a modification of existing Kienzle/Taylor values.
 * Lives here for now; a future operator with confirmCritical may relocate.
 *
 * Formula:
 *   σ = [A + B·ε^n] · [1 + C·ln(ε̇/ε̇₀)] · [1 - T*^m]
 *   T* = (T - T_room) / (T_melt - T_room)
 *
 * Reference: Johnson & Cook (1983), "A constitutive model and data for metals
 * subjected to large strains, high strain rates and high temperatures."
 * Constants sourced via MIT 3.22 Mechanical Behavior of Materials.
 */

export interface JohnsonCookParams {
  /** Initial yield stress [MPa] — quasi-static, room temperature */
  A: number;
  /** Strain hardening coefficient [MPa] */
  B: number;
  /** Strain hardening exponent [dimensionless, 0..1] */
  n: number;
  /** Strain rate hardening coefficient [dimensionless] */
  C: number;
  /** Thermal softening exponent [dimensionless] */
  m: number;
  /** Reference strain rate [1/s] */
  eps_dot_0: number;
  /** Melting temperature [K] */
  T_melt: number;
  /** Room (reference) temperature [K] */
  T_room: number;
}

/** Canonical-key enumeration of supported JC materials. */
export type JCMaterial = "AISI_1018" | "AISI_4340" | "Ti6Al4V" | "Al_2024_T3" | "Inconel_718";

export const JOHNSON_COOK_PARAMS: Record<JCMaterial, JohnsonCookParams> = {
  AISI_1018:   { A: 350,  B: 275, n: 0.36, C: 0.022,  m: 1.00, eps_dot_0: 1.0, T_melt: 1811, T_room: 293 },
  AISI_4340:   { A: 792,  B: 510, n: 0.26, C: 0.014,  m: 1.03, eps_dot_0: 1.0, T_melt: 1793, T_room: 293 },
  Ti6Al4V:     { A: 862,  B: 331, n: 0.34, C: 0.012,  m: 0.80, eps_dot_0: 1.0, T_melt: 1878, T_room: 293 },
  Al_2024_T3:  { A: 265,  B: 426, n: 0.34, C: 0.015,  m: 1.00, eps_dot_0: 1.0, T_melt:  775, T_room: 293 },
  Inconel_718: { A: 1241, B: 622, n: 0.65, C: 0.0134, m: 1.30, eps_dot_0: 1.0, T_melt: 1609, T_room: 293 },
};

/** Common-name aliases (lowercase + non-alphanumeric stripped). */
const _JC_ALIAS: Record<string, JCMaterial> = {
  "1018": "AISI_1018", "aisi1018": "AISI_1018",
  "4340": "AISI_4340", "aisi4340": "AISI_4340",
  "ti6al4v": "Ti6Al4V", "titanium": "Ti6Al4V",
  "2024": "Al_2024_T3", "2024t3": "Al_2024_T3", "al2024": "Al_2024_T3", "al2024t3": "Al_2024_T3",
  "inconel": "Inconel_718", "inconel718": "Inconel_718", "in718": "Inconel_718",
};

export class JohnsonCookConstitutiveEngine {
  /**
   * Resolve a material name (canonical key OR common alias) to its JC params.
   * Returns null if unknown — caller decides whether to fall back or fail-loud.
   */
  static getParams(material: string | JCMaterial): JohnsonCookParams | null {
    if (typeof material === "string" && material in JOHNSON_COOK_PARAMS) {
      return JOHNSON_COOK_PARAMS[material as JCMaterial];
    }
    const key = String(material).toLowerCase().replace(/[^a-z0-9]+/g, "");
    const canon = _JC_ALIAS[key];
    return canon ? JOHNSON_COOK_PARAMS[canon] : null;
  }

  /**
   * Johnson-Cook flow stress at (strain, strainRate, tempK). Returns σ [MPa].
   * Saturates T* to [0,1] (model is undefined outside [T_room, T_melt]).
   * Saturates strain to ≥1e-3 to keep ε^n finite at ε=0.
   */
  static stress(
    strain: number, strainRate: number, tempK: number, p: JohnsonCookParams,
  ): number {
    const eps = Math.max(strain, 1e-3);
    const epsRate = Math.max(strainRate, 1e-9);
    const term1 = p.A + p.B * Math.pow(eps, p.n);
    const term2 = 1 + p.C * Math.log(Math.max(epsRate / p.eps_dot_0, 1));
    const Tstar = Math.max(0, Math.min(1, (tempK - p.T_room) / (p.T_melt - p.T_room)));
    const term3 = 1 - Math.pow(Tstar, p.m);
    return term1 * term2 * term3;
  }

  /** List all supported canonical material keys. */
  static materials(): JCMaterial[] {
    return Object.keys(JOHNSON_COOK_PARAMS) as JCMaterial[];
  }
}

/** Singleton export per PRISM engine convention. */
export const johnsonCookConstitutiveEngine = JohnsonCookConstitutiveEngine;
