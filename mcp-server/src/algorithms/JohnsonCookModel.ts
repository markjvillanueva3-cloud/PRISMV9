/**
 * Johnson-Cook Constitutive Flow Stress Model
 *
 * Implements the Johnson-Cook model for material flow stress:
 *   σ = [A + B·ε^n]·[1 + C·ln(ε̇/ε̇₀)]·[1 - T*^m]
 *
 * Where:
 *   - σ: Flow stress [MPa]
 *   - A: Initial yield strength [MPa]
 *   - B: Hardening modulus [MPa]
 *   - n: Strain hardening exponent
 *   - C: Strain rate sensitivity coefficient
 *   - m: Thermal softening exponent
 *   - ε: Equivalent plastic strain (dimensionless)
 *   - ε̇: Strain rate [1/s]
 *   - ε̇₀: Reference strain rate (typically 1.0 /s)
 *   - T*: Homologous temperature = (T-T_room)/(T_melt-T_room)
 *
 * S1-MS2 P2-U01: Created 2026-04-12
 *
 * @see Johnson, G.R. & Cook, W.H. (1983) "A constitutive model and data for
 *      metals subjected to large strains, high strain rates and high temperatures"
 * @see Altintas, Y. (2012) "Manufacturing Automation" §2.4
 *
 * @module algorithms/JohnsonCookModel
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type AtomicValue,
  type ValidationResult,
  type SafetyScore,
  createAtomicValue,
  computeSafetyScore,
  createValidationResult,
} from "./types.js";

// ─── Types ─────────────────────────────────────────────────────────

/**
 * Johnson-Cook material parameters
 */
export interface JCParams {
  /** Initial yield strength [MPa] */
  A: number;
  /** Hardening modulus [MPa] */
  B: number;
  /** Strain hardening exponent */
  n: number;
  /** Strain rate sensitivity coefficient */
  C: number;
  /** Thermal softening exponent */
  m: number;
  /** Melting temperature [K] */
  T_melt: number;
}

/**
 * Johnson-Cook model input parameters
 */
export interface JohnsonCookInput extends AlgorithmInput {
  /** Material ID (e.g., "4140", "Ti6Al4V", "7075_T6") or direct params */
  material_id?: string;
  /** Direct J-C parameters (optional — overrides material_id lookup) */
  params?: JCParams;
  /** Equivalent plastic strain (dimensionless, typically 0-2) */
  strain: number;
  /** Strain rate [1/s] (machining: 10^3-10^5, impact: 10^5-10^6) */
  strain_rate: number;
  /** Temperature [K] (room temp ~293K, machining zone ~600-1000K) */
  temperature_K: number;
}

/**
 * Johnson-Cook model output
 */
export interface JohnsonCookOutput extends AlgorithmOutput {
  /** Flow stress [MPa] */
  flow_stress: AtomicValue<number>;
  /** Strain hardening term: [A + B·ε^n] */
  strain_term: AtomicValue<number>;
  /** Strain rate term: [1 + C·ln(ε̇/ε̇₀)] */
  rate_term: AtomicValue<number>;
  /** Thermal softening term: [1 - T*^m] */
  thermal_term: AtomicValue<number>;
  /** Homologous temperature T* */
  T_star: number;
  /** Johnson-Cook parameters used */
  params_used: JCParams;
  /** Material category (if looked up from DB) */
  category?: string;
}

// ─── Constants ─────────────────────────────────────────────────────

const T_ROOM = 293;       // Room temperature [K]
const EPS_DOT_REF = 1.0;  // Reference strain rate [1/s]

// ─── Material Database ─────────────────────────────────────────────

/**
 * Johnson-Cook parameters for common engineering materials.
 * Organized by category for easy lookup.
 *
 * @see Johnson & Cook (1983), Altintas (2012), ASM Handbook
 */
const JC_DATABASE: Record<string, Record<string, JCParams>> = {
  steels: {
    "1020":  { A: 310, B: 530, n: 0.26, C: 0.014, m: 0.9, T_melt: 1808 },
    "1045":  { A: 553, B: 601, n: 0.234, C: 0.0134, m: 1.0, T_melt: 1793 },
    "4140":  { A: 598, B: 768, n: 0.29, C: 0.014, m: 0.99, T_melt: 1793 },
    "4340":  { A: 792, B: 510, n: 0.26, C: 0.014, m: 1.03, T_melt: 1793 },
    "H13":   { A: 950, B: 750, n: 0.24, C: 0.010, m: 1.05, T_melt: 1700 },
    "D2":    { A: 1200, B: 850, n: 0.20, C: 0.007, m: 1.15, T_melt: 1695 },
  },
  stainless: {
    "304":   { A: 310, B: 1000, n: 0.65, C: 0.07, m: 1.0, T_melt: 1723 },
    "316":   { A: 305, B: 1161, n: 0.61, C: 0.01, m: 1.0, T_melt: 1673 },
    "17_4PH": { A: 650, B: 850, n: 0.38, C: 0.018, m: 1.08, T_melt: 1713 },
  },
  aluminum: {
    "2024_T351": { A: 369, B: 684, n: 0.73, C: 0.0083, m: 1.7, T_melt: 775 },
    "6061_T6":   { A: 324, B: 114, n: 0.42, C: 0.002, m: 1.34, T_melt: 855 },
    "7075_T6":   { A: 520, B: 477, n: 0.52, C: 0.001, m: 1.61, T_melt: 750 },
  },
  titanium: {
    "Ti_Grade2":  { A: 380, B: 550, n: 0.45, C: 0.032, m: 0.7, T_melt: 1941 },
    "Ti6Al4V":    { A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8, T_melt: 1878 },
    "Ti_6246":    { A: 920, B: 450, n: 0.38, C: 0.011, m: 0.85, T_melt: 1883 },
  },
  nickel: {
    "Inconel_625": { A: 1200, B: 1400, n: 0.65, C: 0.017, m: 1.3, T_melt: 1623 },
    "Inconel_718": { A: 1241, B: 622, n: 0.6522, C: 0.0134, m: 1.3, T_melt: 1609 },
    "Waspaloy":    { A: 1100, B: 600, n: 0.55, C: 0.015, m: 1.25, T_melt: 1603 },
  },
  copper: {
    "C10100": { A: 90, B: 292, n: 0.31, C: 0.025, m: 1.09, T_melt: 1356 },
    "C17200": { A: 350, B: 500, n: 0.35, C: 0.020, m: 1.0, T_melt: 1338 },
  },
};

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  strain: { min: 0, max: 5.0, unit: "-" },
  strain_rate: { min: 0.001, max: 1e7, unit: "1/s" },
  temperature_K: { min: 200, max: 2000, unit: "K" },
};

// ─── Helper Functions ──────────────────────────────────────────────

function findMaterial(materialId: string): { params: JCParams; category: string } | null {
  const normalizedId = materialId.replace(/-/g, "_").replace(/ /g, "_");
  for (const [cat, materials] of Object.entries(JC_DATABASE)) {
    for (const [id, params] of Object.entries(materials)) {
      if (id.toLowerCase() === normalizedId.toLowerCase() ||
          id.replace(/_/g, "").toLowerCase() === normalizedId.replace(/_/g, "").toLowerCase()) {
        return { params, category: cat };
      }
    }
  }
  return null;
}

// ─── Johnson-Cook Model Class ──────────────────────────────────────

/**
 * Johnson-Cook constitutive model implementation.
 *
 * Used for predicting material flow stress under high strain rates
 * and temperatures typical of machining processes.
 */
class JohnsonCookModelImpl implements Algorithm<JohnsonCookInput, JohnsonCookOutput> {
  private static readonly VERSION = "1.0.0";

  /**
   * Validate Johnson-Cook model inputs.
   */
  validate(input: JohnsonCookInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have either material_id or params
    if (!input.material_id && !input.params) {
      errors.push("Either material_id or params must be provided");
    }

    if (input.material_id && !input.params) {
      const lookup = findMaterial(input.material_id);
      if (!lookup) {
        errors.push(`Unknown material_id: '${input.material_id}'`);
      }
    }

    if (input.params) {
      // Validate J-C parameters
      if (input.params.A <= 0) errors.push("J-C parameter A must be positive");
      if (input.params.B < 0) errors.push("J-C parameter B cannot be negative");
      if (input.params.n < 0 || input.params.n > 1) warnings.push("J-C parameter n typically in [0, 1]");
      if (input.params.C < 0) warnings.push("J-C parameter C typically positive");
      if (input.params.m <= 0) errors.push("J-C parameter m must be positive");
      if (input.params.T_melt <= T_ROOM) errors.push("T_melt must be above room temperature");
    }

    // Strain validation
    if (input.strain === undefined || input.strain === null) {
      errors.push("strain is required");
    } else if (input.strain < 0) {
      errors.push("strain cannot be negative");
    } else if (input.strain > VALID_RANGES.strain.max) {
      warnings.push(`strain (${input.strain}) above typical maximum — extreme deformation`);
    }

    // Strain rate validation
    if (input.strain_rate === undefined || input.strain_rate === null) {
      errors.push("strain_rate is required");
    } else if (input.strain_rate <= 0) {
      errors.push("strain_rate must be positive");
    } else if (input.strain_rate > 1e6) {
      warnings.push(`strain_rate (${input.strain_rate.toExponential()}) very high — shock/impact regime`);
    }

    // Temperature validation
    if (input.temperature_K === undefined || input.temperature_K === null) {
      errors.push("temperature_K is required");
    } else if (input.temperature_K < VALID_RANGES.temperature_K.min) {
      warnings.push(`temperature_K (${input.temperature_K}) below typical minimum — cryogenic conditions`);
    }

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate flow stress using Johnson-Cook model.
   *
   * Formula: σ = [A + B·ε^n]·[1 + C·ln(ε̇/ε̇₀)]·[1 - T*^m]
   */
  calculate(input: JohnsonCookInput): JohnsonCookOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Johnson-Cook validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    // Resolve J-C parameters
    let params: JCParams;
    let category: string | undefined;

    if (input.params) {
      params = input.params;
    } else {
      const lookup = findMaterial(input.material_id!);
      if (!lookup) {
        throw new Error(`Material not found: ${input.material_id}`);
      }
      params = lookup.params;
      category = lookup.category;
    }

    const { A, B, n, C, m, T_melt } = params;
    const eps = Math.max(input.strain, 0.001); // Prevent log(0)
    const epsDot = input.strain_rate;
    const T = input.temperature_K;

    // ── Strain Hardening Term ──
    // [A + B·ε^n]
    const strainTerm = A + B * Math.pow(eps, n);

    // ── Strain Rate Term ──
    // [1 + C·ln(ε̇/ε̇₀)]
    // Clamp strain rate ratio to >= 1 to avoid negative term
    const rateTerm = 1 + C * Math.log(Math.max(epsDot / EPS_DOT_REF, 1));

    // ── Thermal Softening Term ──
    // T* = (T - T_room) / (T_melt - T_room)
    // Clamp T* to [0, 1]
    const T_star = Math.max(0, Math.min(1, (T - T_ROOM) / (T_melt - T_ROOM)));

    // [1 - T*^m]
    const thermalTerm = 1 - Math.pow(T_star, m);

    // ── Flow Stress ──
    const flowStress = strainTerm * rateTerm * thermalTerm;

    // ── Safety Score ──

    let physicsScore = 1.0;
    if (T_star > 0.9) physicsScore -= 0.2; // Near melting
    if (eps > 2.0) physicsScore -= 0.1; // Extreme strain
    if (epsDot > 1e5) physicsScore -= 0.1; // Very high strain rate

    let rangeScore = 1.0;
    if ((validation.warnings ?? []).length > 0) rangeScore -= 0.1 * (validation.warnings ?? []).length;
    rangeScore = Math.max(0, rangeScore);

    let materialScore = 1.0;
    if (input.params && !input.material_id) materialScore = 0.85; // Custom params

    const processScore = 0.95;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    const uncertaintyPct = safety.score > 0.9 ? 8 : safety.score > 0.7 ? 12 : 20;

    return {
      flow_stress: createAtomicValue(flowStress, "MPa", uncertaintyPct, "Johnson-Cook", safety.score,
        `σ = [${A}+${B}×ε^${n}]×[1+${C}×ln(ε̇/${EPS_DOT_REF})]×[1-T*^${m}]`),
      strain_term: createAtomicValue(strainTerm, "MPa", 5, "J-C strain", 0.98,
        `A + B×ε^n = ${A} + ${B}×${eps.toFixed(4)}^${n}`),
      rate_term: createAtomicValue(rateTerm, "-", 5, "J-C rate", 0.95,
        `1 + C×ln(ε̇/ε̇₀) = 1 + ${C}×ln(${epsDot}/${EPS_DOT_REF})`),
      thermal_term: createAtomicValue(thermalTerm, "-", 5, "J-C thermal", 0.95,
        `1 - T*^m = 1 - ${T_star.toFixed(4)}^${m}`),
      T_star,
      params_used: params,
      category,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: JohnsonCookModelImpl.VERSION,
      warnings,
    };
  }

  /**
   * Get Johnson-Cook model metadata.
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "johnson_cook",
      name: "Johnson-Cook Constitutive Flow Stress Model",
      version: JohnsonCookModelImpl.VERSION,
      domain: "constitutive",
      category: "flow_stress",
      description: "Calculates material flow stress under combined effects of strain hardening, " +
        "strain rate sensitivity, and thermal softening. Essential for machining FEM simulations " +
        "and understanding chip formation mechanics.",
      equation_plain: "σ = [A + B·ε^n]·[1 + C·ln(ε̇/ε̇₀)]·[1 - T*^m]",
      equation_latex: "\\sigma = \\left[A + B\\varepsilon^n\\right]\\left[1 + C\\ln\\frac{\\dot{\\varepsilon}}{\\dot{\\varepsilon}_0}\\right]\\left[1 - T^{*m}\\right]",
      references: [
        {
          authors: "Johnson, G.R. & Cook, W.H.",
          title: "A constitutive model and data for metals subjected to large strains, high strain rates and high temperatures",
          publication: "Proc. 7th Int. Symp. Ballistics",
          year: 1983,
          pages: "541-547",
        },
        {
          authors: "Altintas, Y.",
          title: "Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC Design",
          publication: "Cambridge University Press",
          year: 2012,
          pages: "Section 2.4",
          doi: "10.1017/CBO9780511843723",
        },
        {
          authors: "ASM International",
          title: "ASM Handbook Vol. 22B: Metals Process Simulation",
          publication: "ASM International",
          year: 2010,
        },
      ],
      assumptions: [
        "Isotropic material behavior",
        "Multiplicative decomposition of strain, rate, and thermal effects",
        "Reference strain rate ε̇₀ = 1.0 /s",
        "Room temperature T_room = 293 K (20°C)",
        "Homologous temperature T* clamped to [0, 1]",
        "No phase transformations during deformation",
      ],
      limitations: [
        "Does not capture softening at very high strains (damage mechanics)",
        "Rate term can become negative at ε̇ < ε̇₀ (clamped to 1)",
        "Near-melting (T* > 0.9): may need modified parameters",
        "Shock loading (ε̇ > 10^6): thermal effects may lag",
        "Strain localization (adiabatic shear bands) not modeled HERE -- it IS modeled by AdvancedCuttingPhysicsEngine.rechtShearInstability (Recht 1964 catastrophic thermoplastic shear: instability parameter chi, critical speed, segmentation spacing+frequency). Do NOT re-build a serrated-chip predictor -- that duplicate-build trap is exactly what misspecced UNIT-0005 as 'build' when the capability already exists (wired prism_cam:sci_recht_shear; UNIT-0005 is wire-only).",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: [], // All materials with J-C parameters
      last_validated: "2026-04-12",
      validation_score: 0.98,
    };
  }

  /**
   * List all available materials in the database.
   */
  listMaterials(): string[] {
    const materials: string[] = [];
    for (const category of Object.values(JC_DATABASE)) {
      materials.push(...Object.keys(category));
    }
    return materials;
  }

  /**
   * Get J-C parameters for a material.
   */
  getParams(materialId: string): JCParams | null {
    return findMaterial(materialId)?.params ?? null;
  }
}

// ─── Export Singleton ──────────────────────────────────────────────

/**
 * Johnson-Cook Model singleton instance.
 *
 * Usage:
 * ```typescript
 * import { JohnsonCookModel } from "./algorithms/JohnsonCookModel.js";
 *
 * const result = JohnsonCookModel.calculate({
 *   material_id: "4140",
 *   strain: 0.5,
 *   strain_rate: 1000,
 *   temperature_K: 600,
 * });
 *
 * console.log(result.flow_stress); // { value: 1050, unit: "MPa", ... }
 * ```
 */
export const JohnsonCookModel = new JohnsonCookModelImpl();
