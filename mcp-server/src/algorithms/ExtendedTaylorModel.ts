/**
 * Extended Taylor Tool Life Model — Tool Wear Prediction Algorithm
 *
 * Implements the extended Taylor tool life equation:
 *   T = (C × k_coat × k_temp × k_hard) / (Vc^(1/n) × f^a × ap^b)
 *
 * Where:
 *   - T: Tool life [minutes]
 *   - C: Taylor constant (speed at T=1min) [m/min]
 *   - n: Taylor exponent (speed sensitivity)
 *   - Vc: Cutting speed [m/min]
 *   - f: Feed rate [mm/rev]
 *   - ap: Depth of cut [mm]
 *   - a, b: Feed and depth exponents (material-dependent)
 *   - k_coat: Coating multiplier
 *   - k_temp: Temperature correction (high-speed regime)
 *   - k_hard: Hardness correction
 *
 * S1-MS2 P1-U03: Created 2026-04-12
 *
 * @see Taylor, F.W. (1907) "On the Art of Cutting Metals", ASME Trans.
 * @see ISO 3685:1993 "Tool-life testing with single-point turning tools"
 * @see Kronenberg, M. "Machining Science and Application"
 * @see Altintas, Y. (2012) "Manufacturing Automation" §2.3
 *
 * @module algorithms/ExtendedTaylorModel
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

import {
  type ISOGroup,
  type MaterialPhysics,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
} from "../physics/constants.js";

// ─── Input Interface ───────────────────────────────────────────────

/**
 * Extended Taylor model input parameters
 */
export interface TaylorInput extends AlgorithmInput {
  /** Cutting speed [m/min] */
  Vc_m_min: number;
  /** Feed rate [mm/rev or mm/tooth] */
  f_mm: number;
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Workpiece hardness [HB] — for hardness correction */
  hardness_HB?: number;
  /** Reference hardness for material [HB] — typically catalog value */
  reference_hardness_HB?: number;
  /** Tool coating type */
  coating?: string;
  /** Cutting temperature [°C] — for high-speed regime correction */
  temperature_C?: number;
  /** Coolant type for temperature derating */
  coolant?: "dry" | "flood" | "mist" | "MQL" | "cryogenic";
}

// ─── Output Interface ──────────────────────────────────────────────

/**
 * Extended Taylor model output
 */
export interface TaylorOutput extends AlgorithmOutput {
  /** Predicted tool life [minutes] */
  tool_life_min: AtomicValue<number>;
  /** Basic Taylor life before extensions [minutes] */
  base_life_min: AtomicValue<number>;
  /** Taylor C constant used */
  taylor_C: AtomicValue<number>;
  /** Taylor n exponent used */
  taylor_n: AtomicValue<number>;
  /** Feed exponent (a) used */
  feed_exponent: number;
  /** Depth exponent (b) used */
  depth_exponent: number;
  /** Coating multiplier applied */
  coating_factor: number;
  /** Temperature correction factor */
  temperature_factor: number;
  /** Hardness correction factor */
  hardness_factor: number;
  /** Combined correction factor */
  total_correction: number;
  /** Estimated tool changes per hour at these parameters */
  changes_per_hour: AtomicValue<number>;
}

// ─── Extended Taylor Constants ─────────────────────────────────────

/**
 * Feed and depth exponents per ISO material group.
 * T_extended = T_base / (f^a × ap^b)
 *
 * @see Kronenberg "Machining Science"
 * @see Sandvik "Metalcutting Technical Guide"
 */
const EXTENDED_EXPONENTS: Record<ISOGroup, { a: number; b: number }> = {
  P: { a: 0.77, b: 0.37 }, // Steel: feed dominates
  M: { a: 0.82, b: 0.35 }, // Stainless: high feed sensitivity
  K: { a: 0.70, b: 0.40 }, // Cast iron: depth matters more
  N: { a: 0.60, b: 0.30 }, // Aluminum: low sensitivity
  S: { a: 0.85, b: 0.42 }, // Superalloys: very feed-sensitive
  H: { a: 0.80, b: 0.38 }, // Hardened: feed-sensitive
};

/**
 * Coating performance multipliers.
 * Extends effective Taylor C constant.
 *
 * @see Walter Tiger·tec Gold data
 * @see Sandvik/Kennametal coating studies
 */
const COATING_MULTIPLIERS: Record<string, number> = {
  uncoated: 1.0,
  TiN: 1.3,
  TiCN: 1.4,
  TiAlN: 1.5,
  AlTiN: 1.6,
  AlCrN: 1.5,
  nACo: 1.7,
  CVD_Al2O3: 1.8,
  CVD_TiCN_Al2O3: 1.9,
  Tiger_tec_Gold: 2.0,
  PVD_multilayer: 1.4,
  DLC: 1.3,
  diamond: 3.0,
  CBN: 2.5,
  ceramic: 1.8,
};

/**
 * Coolant multipliers for thermal management.
 */
const COOLANT_MULTIPLIERS: Record<string, number> = {
  dry: 0.70,       // Reduced life without cooling
  mist: 0.85,      // Minimal cooling
  MQL: 0.95,       // Effective lubrication
  flood: 1.00,     // Reference condition
  cryogenic: 1.25, // Extended life with cryo cooling
};

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  Vc_m_min: { min: 5, max: 2000, unit: "m/min" },
  f_mm: { min: 0.01, max: 2.0, unit: "mm" },
  ap_mm: { min: 0.1, max: 20.0, unit: "mm" },
  hardness_HB: { min: 50, max: 700, unit: "HB" },
  temperature_C: { min: 20, max: 1200, unit: "°C" },
};

// ─── Reference Values ──────────────────────────────────────────────

const REFERENCE_FEED = 0.30;  // mm/rev — standard reference
const REFERENCE_DEPTH = 2.0;  // mm — standard reference

// ─── Extended Taylor Model Class ───────────────────────────────────

/**
 * Extended Taylor tool life model implementation.
 *
 * SAFETY-CRITICAL: This model directly affects tool change decisions,
 * cost estimates, and prevents catastrophic tool failures.
 */
class ExtendedTaylorModelImpl implements Algorithm<TaylorInput, TaylorOutput> {
  private static readonly VERSION = "1.0.0";

  /**
   * Validate Taylor model inputs.
   */
  validate(input: TaylorInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const corrected: Record<string, unknown> = {};

    // Required fields
    if (input.Vc_m_min === undefined || input.Vc_m_min === null) {
      errors.push("Vc_m_min (cutting speed) is required");
    } else if (input.Vc_m_min <= 0) {
      errors.push("Vc_m_min must be positive");
    } else if (input.Vc_m_min < VALID_RANGES.Vc_m_min.min) {
      warnings.push(`Vc_m_min (${input.Vc_m_min}) below typical minimum — very slow machining`);
    } else if (input.Vc_m_min > VALID_RANGES.Vc_m_min.max) {
      warnings.push(`Vc_m_min (${input.Vc_m_min}) above maximum — ultra-high-speed regime, extrapolation`);
    }

    if (input.f_mm === undefined || input.f_mm === null) {
      errors.push("f_mm (feed rate) is required");
    } else if (input.f_mm <= 0) {
      errors.push("f_mm must be positive");
    } else if (input.f_mm < VALID_RANGES.f_mm.min) {
      warnings.push(`f_mm (${input.f_mm}) below minimum — may indicate finishing/polishing`);
    } else if (input.f_mm > VALID_RANGES.f_mm.max) {
      warnings.push(`f_mm (${input.f_mm}) above maximum — heavy roughing regime`);
    }

    if (input.ap_mm === undefined || input.ap_mm === null) {
      errors.push("ap_mm (depth of cut) is required");
    } else if (input.ap_mm <= 0) {
      errors.push("ap_mm must be positive");
    } else if (input.ap_mm > VALID_RANGES.ap_mm.max) {
      warnings.push(`ap_mm (${input.ap_mm}) above typical maximum — deep cut, verify machine capability`);
    }

    // Optional fields
    if (input.hardness_HB !== undefined) {
      if (input.hardness_HB < VALID_RANGES.hardness_HB.min ||
          input.hardness_HB > VALID_RANGES.hardness_HB.max) {
        warnings.push(`hardness_HB (${input.hardness_HB}) outside typical range`);
      }
    }

    if (input.temperature_C !== undefined) {
      if (input.temperature_C > 800) {
        warnings.push(`High cutting temperature (${input.temperature_C}°C) — tool coating may be compromised`);
      }
    }

    // Coating validation
    if (input.coating && !COATING_MULTIPLIERS[input.coating]) {
      warnings.push(`Unknown coating '${input.coating}' — using uncoated multiplier`);
    }

    // Material validation
    if (input.material) {
      const mat = typeof input.material === "string" ? input.material : input.material.name;
      if (typeof input.material === "string" && !CANONICAL_MATERIAL_DB[input.material]) {
        warnings.push(`Material '${input.material}' not in canonical DB — using ISO group lookup`);
      }
    }

    return createValidationResult(errors, warnings, Object.keys(corrected).length > 0 ? corrected : undefined);
  }

  /**
   * Calculate tool life using Extended Taylor model.
   *
   * Formula: T = (C × k_coat × k_temp × k_hard) / (Vc^(1/n) × f^a × ap^b)
   */
  calculate(input: TaylorInput): TaylorOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Taylor validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    const Vc = input.Vc_m_min;
    const f = input.f_mm;
    const ap = input.ap_mm;

    // Resolve Taylor constants from material
    let C: number;
    let n: number;
    let isoGroup: ISOGroup;
    let materialSource: string;

    if (input.material) {
      if (typeof input.material === "string") {
        const mat = CANONICAL_MATERIAL_DB[input.material];
        if (mat) {
          C = mat.taylor_C;
          n = mat.taylor_n;
          isoGroup = mat.iso_group;
          materialSource = input.material;
        } else {
          // Fallback to ISO group — input.iso_group is typed ISOGroup | string;
          // narrow to ISOGroup via cast (falls back to "P" when null).
          isoGroup = ((input.iso_group ?? "P") as ISOGroup);
          const taylor = CANONICAL_TAYLOR[isoGroup];
          C = taylor.C;
          n = taylor.n;
          materialSource = `ISO-${isoGroup}`;
        }
      } else {
        C = input.material.taylor_C;
        n = input.material.taylor_n;
        isoGroup = input.material.iso_group;
        materialSource = input.material.name ?? "custom";
      }
    } else if (input.iso_group) {
      isoGroup = input.iso_group as ISOGroup;
      const taylor = CANONICAL_TAYLOR[isoGroup];
      C = taylor.C;
      n = taylor.n;
      materialSource = `ISO-${isoGroup}`;
    } else {
      // Default to steel (ISO P)
      isoGroup = "P";
      C = CANONICAL_TAYLOR.P.C;
      n = CANONICAL_TAYLOR.P.n;
      materialSource = "default-steel";
      warnings.push("No material specified — defaulting to steel (ISO P)");
    }

    // ── Base Taylor Life ──
    // T_base = (C / Vc)^(1/n)
    const baseLife = Math.pow(C / Vc, 1 / n);

    // ── Coating Factor ──
    const coatingFactor = COATING_MULTIPLIERS[input.coating ?? "uncoated"] ?? 1.0;

    // ── Feed and Depth Factors ──
    const exponents = EXTENDED_EXPONENTS[isoGroup] ?? EXTENDED_EXPONENTS.P;
    const feedFactor = Math.pow(f / REFERENCE_FEED, exponents.a);
    const depthFactor = Math.pow(ap / REFERENCE_DEPTH, exponents.b);

    // ── Hardness Correction ──
    // Tool life decreases with increasing workpiece hardness
    // T ∝ (HB_ref / HB_actual)^0.5 approximately
    let hardnessFactor = 1.0;
    if (input.hardness_HB) {
      const refHardness = input.reference_hardness_HB ?? 180; // Default: mild steel
      hardnessFactor = Math.pow(refHardness / input.hardness_HB, 0.5);
      // Clamp to reasonable range
      hardnessFactor = Math.max(0.3, Math.min(2.0, hardnessFactor));
    }

    // ── Temperature Correction ──
    // High-speed machining generates heat that can accelerate wear
    // At T > 500°C, coatings may break down
    let temperatureFactor = 1.0;
    if (input.temperature_C) {
      if (input.temperature_C > 800) {
        // Severe thermal conditions
        temperatureFactor = 0.5;
        warnings.push("Very high cutting temperature — severe tool life reduction");
      } else if (input.temperature_C > 600) {
        // Coating breakdown zone
        temperatureFactor = 0.7;
        warnings.push("Temperature in coating breakdown range");
      } else if (input.temperature_C > 400) {
        // Moderate thermal effect
        temperatureFactor = 0.85;
      }
    }

    // Apply coolant factor to temperature effect
    const coolantFactor = COOLANT_MULTIPLIERS[input.coolant ?? "flood"] ?? 1.0;
    temperatureFactor *= coolantFactor;

    // ── Final Tool Life ──
    // T = (C × k_coat × k_temp × k_hard) / (Vc^(1/n) × f^a × ap^b)
    // Rearranged: T = T_base × k_coat × k_temp × k_hard / (feedFactor × depthFactor)
    const totalCorrection = (coatingFactor * temperatureFactor * hardnessFactor) / (feedFactor * depthFactor);
    const toolLife = baseLife * totalCorrection;

    // Tool changes per hour
    const changesPerHour = 60 / toolLife;

    // ── Safety Score Calculation ──

    // Physics validity
    let physicsScore = 1.0;
    if (Vc > 500) physicsScore -= 0.1; // High-speed regime
    if (f > 0.5) physicsScore -= 0.05; // Heavy feed
    if (toolLife < 1) physicsScore -= 0.2; // Very short life is risky

    // Range validity
    let rangeScore = 1.0;
    if ((validation.warnings ?? []).length > 0) rangeScore -= 0.08 * (validation.warnings ?? []).length;
    rangeScore = Math.max(0, rangeScore);

    // Material validity
    let materialScore = 1.0;
    if (materialSource === "default-steel") materialScore = 0.7;
    if (materialSource.startsWith("ISO-")) materialScore = 0.85;

    // Process validity
    let processScore = 0.95;
    if (input.coolant === "dry" && Vc > 200) processScore -= 0.1; // Risky dry machining

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    // Uncertainty increases at extreme parameters
    let uncertaintyPct = 10;
    if (safety.score < 0.9) uncertaintyPct = 15;
    if (safety.score < 0.7) uncertaintyPct = 25;

    return {
      tool_life_min: createAtomicValue(toolLife, "min", uncertaintyPct, "Extended-Taylor", safety.score,
        `T = (${C}/${Vc})^(1/${n}) × ${totalCorrection.toFixed(3)}`),
      base_life_min: createAtomicValue(baseLife, "min", 8, "Taylor", 0.95,
        `T_base = (${C}/${Vc})^(1/${n})`),
      taylor_C: createAtomicValue(C, "m/min", 5, materialSource, 0.98),
      taylor_n: createAtomicValue(n, "-", 5, materialSource, 0.98),
      feed_exponent: exponents.a,
      depth_exponent: exponents.b,
      coating_factor: coatingFactor,
      temperature_factor: temperatureFactor,
      hardness_factor: hardnessFactor,
      total_correction: totalCorrection,
      changes_per_hour: createAtomicValue(changesPerHour, "/hour", uncertaintyPct, "derived", safety.score,
        "60 / tool_life_min"),
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: ExtendedTaylorModelImpl.VERSION,
      warnings,
    };
  }

  /**
   * Get Taylor model metadata.
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "extended_taylor",
      name: "Extended Taylor Tool Life Model",
      version: ExtendedTaylorModelImpl.VERSION,
      domain: "physics",
      category: "tool_life",
      description: "Predicts tool life based on cutting parameters using the extended Taylor equation. " +
        "Includes feed and depth exponents, coating multipliers, temperature correction, and hardness adjustment.",
      equation_plain: "T = (C × k_coat × k_temp × k_hard) / (Vc^(1/n) × f^a × ap^b)",
      equation_latex: "T = \\frac{C \\cdot k_{coat} \\cdot k_{temp} \\cdot k_{hard}}{V_c^{1/n} \\cdot f^a \\cdot a_p^b}",
      references: [
        {
          authors: "Taylor, F.W.",
          title: "On the Art of Cutting Metals",
          publication: "ASME Transactions",
          year: 1907,
          pages: "1-248",
        },
        {
          authors: "ISO",
          title: "ISO 3685:1993 — Tool-life testing with single-point turning tools",
          publication: "International Organization for Standardization",
          year: 1993,
        },
        {
          authors: "Kronenberg, M.",
          title: "Machining Science and Application: Theory and Practice for Operation and Development of Machining Processes",
          publication: "Pergamon Press",
          year: 1966,
        },
        {
          authors: "Altintas, Y.",
          title: "Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC Design",
          publication: "Cambridge University Press",
          year: 2012,
          pages: "Section 2.3",
          doi: "10.1017/CBO9780511843723",
        },
      ],
      assumptions: [
        "Steady-state chip formation (not applicable to interrupted cuts)",
        "Uniform wear along flank face (single-point turning primary application)",
        "Constant cutting speed (not applicable to variable-speed turning)",
        "Tool failure criterion: 0.3mm flank wear (ISO 3685)",
        "Workpiece material is homogeneous",
      ],
      limitations: [
        "Very high speeds (>500 m/min): thermal effects dominate, extrapolation",
        "Interrupted cuts: fatigue effects not modeled",
        "Tool life < 1 min: model reliability decreases",
        "Cryogenic machining: limited validation data",
        "Non-standard tool geometries: may require coefficient adjustment",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: ["P", "M", "K", "N", "S", "H"],
      last_validated: "2026-04-12",
      validation_score: 0.99,
    };
  }
}

// ─── Export Singleton ──────────────────────────────────────────────

/**
 * Extended Taylor Tool Life Model singleton instance.
 *
 * Usage:
 * ```typescript
 * import { ExtendedTaylorModel } from "./algorithms/ExtendedTaylorModel.js";
 *
 * const result = ExtendedTaylorModel.calculate({
 *   material: "steel",
 *   Vc_m_min: 200,
 *   f_mm: 0.25,
 *   ap_mm: 2.0,
 *   coating: "TiAlN",
 * });
 *
 * console.log(result.tool_life_min); // { value: 18.5, unit: "min", ... }
 * ```
 */
export const ExtendedTaylorModel = new ExtendedTaylorModelImpl();
