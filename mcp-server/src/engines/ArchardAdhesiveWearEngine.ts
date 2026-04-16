/**
 * ArchardAdhesiveWearEngine — Archard (1953) Adhesive Wear Law Implementation
 *
 * Implements the Archard wear equation for predicting tool wear volume and flank
 * wear (VB) based on normal load, sliding distance, and material hardness.
 *
 * Archard Wear Equation (1953):
 *   V = K × W × L / H
 *
 * Where:
 *   V = wear volume (mm³)
 *   K = dimensionless wear coefficient (material pair dependent)
 *   W = normal load (N)
 *   L = sliding distance (mm)
 *   H = hardness of softer material (N/mm² or HV converted)
 *
 * Converting to flank wear (VB):
 *   VB = V / (contact_width × contact_length) ≈ V / A_contact
 *
 * Manufacturing applications:
 * - Tool flank wear prediction for turning, milling, drilling
 * - Insert selection and replacement scheduling
 * - Wear-based tool life optimization
 * - Process parameter adjustment for wear control
 *
 * References:
 *   [1] Archard, J.F. (1953). "Contact and Rubbing of Flat Surfaces."
 *       Journal of Applied Physics, 24(8), 981-988. doi:10.1063/1.1721448
 *   [2] Rabinowicz, E. (1965). "Friction and Wear of Materials."
 *       John Wiley & Sons, New York.
 *   [3] Childs, T.H.C., Maekawa, K., Obikawa, T., Yamane, Y. (2000).
 *       "Metal Machining: Theory and Applications." Arnold, London.
 *   [4] Trent, E.M. & Wright, P.K. (2000). "Metal Cutting." 4th ed.
 *       Butterworth-Heinemann.
 *
 * @module engines/ArchardAdhesiveWearEngine
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "../algorithms/types.js";

// ─── Types ─────────────────────────────────────────────────────────────────

/** Material pair identifier for wear coefficient lookup */
export type ToolMaterial = "HSS" | "COBALT_HSS" | "CARBIDE" | "CARBIDE_COATED" | "CERMET" | "CERAMIC" | "CBN" | "PCD";
export type WorkpieceMaterial = "STEEL_MILD" | "STEEL_MEDIUM" | "STEEL_HARDENED" | "STAINLESS" | "ALUMINUM" | "TITANIUM" | "INCONEL" | "CAST_IRON" | "COPPER";

/** Wear regime classification */
export type WearRegime = "mild" | "severe" | "catastrophic";

/** Input parameters for Archard wear calculation */
export interface ArchardWearInput {
  /** Normal force [N] — from Kienzle Ff component or measured */
  normalForce: number;
  /** Sliding distance [mm] — cutting length (Vc × time) */
  slidingDistance: number;
  /** Tool hardness [HV] — Vickers hardness of tool material */
  toolHardness: number;
  /** Workpiece hardness [HV] — Vickers hardness of workpiece */
  workpieceHardness: number;
  /** Wear coefficient K [dimensionless] — from material pair table if not provided */
  wearCoefficient?: number;
  /** Contact area [mm²] — tool-workpiece contact area for VB conversion */
  contactArea: number;
  /** Optional: Tool material type for automatic K lookup */
  toolMaterial?: ToolMaterial;
  /** Optional: Workpiece material type for automatic K lookup */
  workpieceMaterial?: WorkpieceMaterial;
  /** Optional: Lubrication factor (0.2-1.0, 1.0 = dry) */
  lubricationFactor?: number;
  /** Optional: Temperature [°C] for thermal softening correction */
  temperature?: number;
  /** Optional: VB flank wear limit [mm] for regime classification */
  vbLimit?: number;
}

/** Output results from Archard wear calculation */
export interface ArchardWearResult extends WithWarnings {
  /** Wear volume [mm³] */
  wearVolume: number;
  /** Flank wear VB [mm] */
  flankWear_VB: number;
  /** Wear rate [mm³/mm] — wear volume per unit sliding distance */
  wearRate: number;
  /** Specific wear rate [mm³/(N·mm)] — normalized by load */
  specificWearRate: number;
  /** Wear regime classification */
  wearRegime: WearRegime;
  /** Wear intensity factor (dimensionless) */
  wearIntensity: number;
  /** Estimated remaining life [mm sliding distance] to reach VB limit */
  remainingLife_mm: number;
  /** Estimated remaining life [%] */
  remainingLife_pct: number;
  /** Effective hardness used [HV] */
  effectiveHardness: number;
  /** Wear coefficient used */
  wearCoefficientUsed: number;
  /** Calculation method description */
  calculationMethod: string;
}

/** Comparison result between Archard and Usui models */
export interface ArchardUsuiComparison {
  /** Archard predicted wear [mm] */
  archard_vb: number;
  /** Usui predicted wear [mm] */
  usui_vb: number;
  /** Relative difference [%] */
  difference_pct: number;
  /** Which model predicts more wear */
  higherPrediction: "archard" | "usui" | "equal";
  /** Recommended model for this scenario */
  recommendedModel: "archard" | "usui" | "either";
  /** Reasoning for recommendation */
  reasoning: string;
}

// ─── Wear Coefficient Database ─────────────────────────────────────────────

/**
 * Archard wear coefficients (K) for common material pairs.
 * Values from literature [2][3] and experimental data.
 *
 * K ranges: 10^-8 to 10^-3 depending on material pair and conditions
 * - Dry sliding: K ≈ 10^-4 to 10^-3
 * - Lubricated: K ≈ 10^-7 to 10^-5
 * - Hard coatings: K ≈ 10^-8 to 10^-6
 */
const WEAR_COEFFICIENTS: Record<ToolMaterial, Partial<Record<WorkpieceMaterial, number>>> = {
  // HSS tools — relatively soft, high wear
  HSS: {
    STEEL_MILD: 5.0e-5,
    STEEL_MEDIUM: 8.0e-5,
    STEEL_HARDENED: 2.0e-4,
    STAINLESS: 1.2e-4,
    ALUMINUM: 2.0e-5,
    TITANIUM: 1.5e-4,
    INCONEL: 3.0e-4,
    CAST_IRON: 4.0e-5,
    COPPER: 1.5e-5,
  },
  // Cobalt HSS — improved hot hardness
  COBALT_HSS: {
    STEEL_MILD: 4.0e-5,
    STEEL_MEDIUM: 6.0e-5,
    STEEL_HARDENED: 1.5e-4,
    STAINLESS: 9.0e-5,
    ALUMINUM: 1.5e-5,
    TITANIUM: 1.2e-4,
    INCONEL: 2.5e-4,
    CAST_IRON: 3.0e-5,
    COPPER: 1.2e-5,
  },
  // Uncoated carbide — baseline for modern tooling
  CARBIDE: {
    STEEL_MILD: 1.0e-5,
    STEEL_MEDIUM: 2.0e-5,
    STEEL_HARDENED: 5.0e-5,
    STAINLESS: 3.0e-5,
    ALUMINUM: 5.0e-6,
    TITANIUM: 4.0e-5,
    INCONEL: 8.0e-5,
    CAST_IRON: 1.5e-5,
    COPPER: 4.0e-6,
  },
  // Coated carbide (TiN, TiCN, TiAlN, etc.) — reduced adhesion
  CARBIDE_COATED: {
    STEEL_MILD: 3.0e-6,
    STEEL_MEDIUM: 5.0e-6,
    STEEL_HARDENED: 1.5e-5,
    STAINLESS: 8.0e-6,
    ALUMINUM: 2.0e-6,
    TITANIUM: 1.2e-5,
    INCONEL: 2.5e-5,
    CAST_IRON: 4.0e-6,
    COPPER: 1.5e-6,
  },
  // Cermet — excellent for finishing steels
  CERMET: {
    STEEL_MILD: 2.5e-6,
    STEEL_MEDIUM: 4.0e-6,
    STEEL_HARDENED: 1.0e-5,
    STAINLESS: 6.0e-6,
    ALUMINUM: 1.5e-6,
    TITANIUM: 3.0e-5, // Poor for titanium
    INCONEL: 4.0e-5,
    CAST_IRON: 3.0e-6,
    COPPER: 1.2e-6,
  },
  // Ceramic (Al2O3, Si3N4) — high speed, hard materials
  CERAMIC: {
    STEEL_MILD: 1.5e-6,
    STEEL_MEDIUM: 2.5e-6,
    STEEL_HARDENED: 4.0e-6,
    STAINLESS: 5.0e-6,
    ALUMINUM: 3.0e-6, // Risk of built-up edge
    TITANIUM: 2.0e-5, // Chemical affinity issues
    INCONEL: 3.0e-5,
    CAST_IRON: 2.0e-6,
    COPPER: 2.5e-6,
  },
  // CBN — hard turning specialty
  CBN: {
    STEEL_MILD: 8.0e-7,
    STEEL_MEDIUM: 1.0e-6,
    STEEL_HARDENED: 2.0e-6, // Optimal application
    STAINLESS: 2.5e-6,
    ALUMINUM: 1.0e-6,
    TITANIUM: 8.0e-6,
    INCONEL: 1.5e-5,
    CAST_IRON: 1.5e-6,
    COPPER: 8.0e-7,
  },
  // PCD — non-ferrous specialty
  PCD: {
    STEEL_MILD: 5.0e-5, // Chemical wear with Fe
    STEEL_MEDIUM: 8.0e-5,
    STEEL_HARDENED: 1.5e-4,
    STAINLESS: 1.0e-4,
    ALUMINUM: 3.0e-7, // Optimal application
    TITANIUM: 2.0e-6,
    INCONEL: 5.0e-5,
    CAST_IRON: 1.0e-5,
    COPPER: 2.0e-7,
  },
};

/** Default wear coefficient when material pair not found */
const DEFAULT_WEAR_COEFFICIENT = 5.0e-5;

/** Hardness values for common tool materials [HV] */
const TOOL_HARDNESS: Record<ToolMaterial, number> = {
  HSS: 800,
  COBALT_HSS: 900,
  CARBIDE: 1600,
  CARBIDE_COATED: 2000,
  CERMET: 1800,
  CERAMIC: 2200,
  CBN: 4500,
  PCD: 8000,
};

/** Hardness values for common workpiece materials [HV] */
const WORKPIECE_HARDNESS: Record<WorkpieceMaterial, number> = {
  STEEL_MILD: 150,
  STEEL_MEDIUM: 250,
  STEEL_HARDENED: 600,
  STAINLESS: 200,
  ALUMINUM: 80,
  TITANIUM: 350,
  INCONEL: 400,
  CAST_IRON: 220,
  COPPER: 100,
};

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Convert Vickers hardness (HV) to pressure (N/mm² ≈ MPa)
 * HV is defined as load/indentation area, so HV ≈ 0.1 × σy
 * For wear calculations: H [N/mm²] ≈ HV × 9.81 (from kgf to N)
 */
function hvToHardnessPressure(hv: number): number {
  return hv * 9.81; // N/mm²
}

/**
 * Temperature correction factor for hardness.
 * Hardness decreases with temperature — empirical correlation.
 * H(T) = H(20°C) × (1 - α × (T - 20))
 * α ≈ 0.0005 to 0.001 depending on material
 */
function temperatureHardnessCorrection(baseHardness: number, tempC: number): number {
  if (tempC <= 20) return baseHardness;
  const alpha = 0.0007; // Average thermal softening coefficient
  const correction = 1 - alpha * (tempC - 20);
  return baseHardness * Math.max(0.3, correction); // Floor at 30% of room temp hardness
}

/**
 * Determine wear regime based on wear intensity.
 * Wear intensity = V / (W × L) normalized
 */
function classifyWearRegime(specificWearRate: number, vb: number, vbLimit: number): WearRegime {
  const vbRatio = vb / vbLimit;

  // Catastrophic: rapid wear, VB > 80% of limit
  if (vbRatio > 0.8 || specificWearRate > 1e-4) {
    return "catastrophic";
  }

  // Severe: moderate-high wear, 50-80% of limit or K > 1e-5
  if (vbRatio > 0.5 || specificWearRate > 1e-5) {
    return "severe";
  }

  // Mild: low wear, controlled process
  return "mild";
}

/**
 * Look up wear coefficient for material pair.
 * Falls back to default if pair not found.
 */
function lookupWearCoefficient(
  toolMaterial?: ToolMaterial,
  workpieceMaterial?: WorkpieceMaterial
): number {
  if (!toolMaterial || !workpieceMaterial) {
    return DEFAULT_WEAR_COEFFICIENT;
  }

  const toolCoeffs = WEAR_COEFFICIENTS[toolMaterial];
  if (!toolCoeffs) {
    return DEFAULT_WEAR_COEFFICIENT;
  }

  return toolCoeffs[workpieceMaterial] ?? DEFAULT_WEAR_COEFFICIENT;
}

// ─── Engine Implementation ─────────────────────────────────────────────────

/**
 * ArchardAdhesiveWearEngine — Implementation of Archard (1953) wear law.
 *
 * Calculates tool wear volume and flank wear (VB) based on normal load,
 * sliding distance, and material hardness. Includes material pair database
 * for wear coefficients and integration with Usui model for comparison.
 */
export class ArchardAdhesiveWearEngine implements Algorithm<ArchardWearInput, ArchardWearResult> {

  /**
   * Validate input parameters.
   * @param input Archard wear input parameters
   * @returns Validation result with any issues
   */
  validate(input: ArchardWearInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Normal force validation
    if (input.normalForce === undefined || input.normalForce === null) {
      issues.push({ field: "normalForce", message: "Normal force is required", severity: "error" });
    } else if (input.normalForce <= 0) {
      issues.push({ field: "normalForce", message: "Normal force must be > 0 N", severity: "error" });
    } else if (input.normalForce > 50000) {
      issues.push({ field: "normalForce", message: "Normal force > 50kN is unusually high — verify input", severity: "warning" });
    }

    // Sliding distance validation
    if (input.slidingDistance === undefined || input.slidingDistance === null) {
      issues.push({ field: "slidingDistance", message: "Sliding distance is required", severity: "error" });
    } else if (input.slidingDistance <= 0) {
      issues.push({ field: "slidingDistance", message: "Sliding distance must be > 0 mm", severity: "error" });
    } else if (input.slidingDistance > 1e9) {
      issues.push({ field: "slidingDistance", message: "Sliding distance > 1000 km is extreme — verify input", severity: "warning" });
    }

    // Tool hardness validation
    if (input.toolHardness === undefined || input.toolHardness === null) {
      issues.push({ field: "toolHardness", message: "Tool hardness is required", severity: "error" });
    } else if (input.toolHardness <= 0) {
      issues.push({ field: "toolHardness", message: "Tool hardness must be > 0 HV", severity: "error" });
    } else if (input.toolHardness < 100) {
      issues.push({ field: "toolHardness", message: "Tool hardness < 100 HV is unusually soft", severity: "warning" });
    }

    // Workpiece hardness validation
    if (input.workpieceHardness === undefined || input.workpieceHardness === null) {
      issues.push({ field: "workpieceHardness", message: "Workpiece hardness is required", severity: "error" });
    } else if (input.workpieceHardness <= 0) {
      issues.push({ field: "workpieceHardness", message: "Workpiece hardness must be > 0 HV", severity: "error" });
    }

    // Contact area validation
    if (input.contactArea === undefined || input.contactArea === null) {
      issues.push({ field: "contactArea", message: "Contact area is required", severity: "error" });
    } else if (input.contactArea <= 0) {
      issues.push({ field: "contactArea", message: "Contact area must be > 0 mm²", severity: "error" });
    } else if (input.contactArea < 0.001) {
      issues.push({ field: "contactArea", message: "Contact area < 0.001 mm² is extremely small", severity: "warning" });
    }

    // Wear coefficient validation (if provided)
    if (input.wearCoefficient !== undefined) {
      if (input.wearCoefficient <= 0) {
        issues.push({ field: "wearCoefficient", message: "Wear coefficient must be > 0", severity: "error" });
      } else if (input.wearCoefficient > 0.01) {
        issues.push({ field: "wearCoefficient", message: "Wear coefficient > 0.01 indicates extreme wear — verify", severity: "warning" });
      }
    }

    // Lubrication factor validation
    if (input.lubricationFactor !== undefined) {
      if (input.lubricationFactor < 0.1 || input.lubricationFactor > 1.0) {
        issues.push({ field: "lubricationFactor", message: "Lubrication factor should be 0.1-1.0", severity: "warning" });
      }
    }

    // Temperature validation
    if (input.temperature !== undefined) {
      if (input.temperature < -50 || input.temperature > 1500) {
        issues.push({ field: "temperature", message: "Temperature out of typical machining range (-50 to 1500°C)", severity: "warning" });
      }
    }

    // Tool vs workpiece hardness relationship
    if (input.toolHardness > 0 && input.workpieceHardness > 0) {
      if (input.workpieceHardness > input.toolHardness * 0.8) {
        issues.push({
          field: "hardness",
          message: `Workpiece hardness (${input.workpieceHardness} HV) is close to tool hardness (${input.toolHardness} HV) — rapid tool wear expected`,
          severity: "warning"
        });
      }
    }

    return {
      valid: issues.filter(i => i.severity === "error").length === 0,
      issues,
    };
  }

  /**
   * Calculate wear volume and flank wear using Archard equation.
   *
   * Archard Equation: V = K × W × L / H
   *
   * @param input Validated input parameters
   * @returns Wear calculation results
   */
  calculate(input: ArchardWearInput): ArchardWearResult {
    const warnings: string[] = [];

    // Extract inputs with defaults
    const W = input.normalForce; // N
    const L = input.slidingDistance; // mm
    const A = input.contactArea; // mm²
    const lubFactor = input.lubricationFactor ?? 1.0;
    const tempC = input.temperature ?? 20;
    const vbLimit = input.vbLimit ?? 0.3; // mm, ISO 3685 standard

    // Determine wear coefficient K
    let K: number;
    if (input.wearCoefficient !== undefined) {
      K = input.wearCoefficient;
    } else {
      K = lookupWearCoefficient(input.toolMaterial, input.workpieceMaterial);
      if (K === DEFAULT_WEAR_COEFFICIENT && (input.toolMaterial || input.workpieceMaterial)) {
        warnings.push(`Material pair not found in database — using default K=${K.toExponential(2)}`);
      }
    }

    // Apply lubrication factor (reduces wear)
    K = K * lubFactor;

    // Determine effective hardness (softer material wears)
    // For tool wear prediction, we use tool hardness with temperature correction
    let H_hv = Math.min(input.toolHardness, input.workpieceHardness);

    // Apply temperature correction
    if (tempC > 20) {
      const originalH = H_hv;
      H_hv = temperatureHardnessCorrection(H_hv, tempC);
      if (H_hv < originalH * 0.7) {
        warnings.push(`High temperature (${tempC}°C) significantly reduces effective hardness`);
      }
    }

    // Convert HV to pressure (N/mm²)
    const H = hvToHardnessPressure(H_hv);

    // Archard wear volume: V = K × W × L / H
    const V = (K * W * L) / H; // mm³

    // Convert to flank wear: VB = V / A_contact
    // This assumes uniform wear distribution over contact area
    const VB = V / A; // mm

    // Wear rate: dV/dL = K × W / H
    const wearRate = (K * W) / H; // mm³/mm

    // Specific wear rate: K / H (normalized)
    const specificWearRate = K / H; // mm³/(N·mm)

    // Wear intensity: dimensionless metric
    const wearIntensity = (V * H) / (W * L);

    // Classify wear regime
    const wearRegime = classifyWearRegime(specificWearRate, VB, vbLimit);

    // Remaining life estimation
    let remainingLife_mm = 0;
    let remainingLife_pct = 0;

    if (VB < vbLimit) {
      const remainingWear_mm3 = (vbLimit - VB) * A;
      remainingLife_mm = wearRate > 0 ? remainingWear_mm3 / wearRate : Infinity;
      remainingLife_pct = ((vbLimit - VB) / vbLimit) * 100;
    }

    // Generate warnings
    if (wearRegime === "catastrophic") {
      warnings.push(`CRITICAL: Catastrophic wear regime — VB=${VB.toFixed(4)}mm exceeds ${(vbLimit * 0.8).toFixed(2)}mm threshold`);
    } else if (wearRegime === "severe") {
      warnings.push(`WARNING: Severe wear regime — monitor tool closely`);
    }

    if (VB > vbLimit) {
      warnings.push(`Flank wear VB=${VB.toFixed(4)}mm exceeds ISO 3685 limit of ${vbLimit}mm`);
    }

    if (specificWearRate > 1e-4) {
      warnings.push(`Very high specific wear rate ${specificWearRate.toExponential(2)} — consider harder tool or reduced load`);
    }

    return {
      wearVolume: Math.round(V * 1e8) / 1e8, // 8 decimal places
      flankWear_VB: Math.round(VB * 1e6) / 1e6, // 6 decimal places (µm precision)
      wearRate: Math.round(wearRate * 1e10) / 1e10,
      specificWearRate,
      wearRegime,
      wearIntensity: Math.round(wearIntensity * 1e8) / 1e8,
      remainingLife_mm: remainingLife_mm === Infinity ? Infinity : Math.round(remainingLife_mm),
      remainingLife_pct: Math.round(remainingLife_pct * 10) / 10,
      effectiveHardness: Math.round(H_hv),
      wearCoefficientUsed: K,
      calculationMethod: `Archard (1953): V = K×W×L/H, K=${K.toExponential(2)}, H=${Math.round(H_hv)}HV, T=${tempC}°C`,
      warnings,
    };
  }

  /**
   * Get algorithm metadata.
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "archard-adhesive-wear",
      name: "Archard Adhesive Wear Model",
      description: "Predicts tool wear volume and flank wear using Archard's (1953) adhesive wear law",
      equation_plain: "V = K × W × L / H",
      equation_latex: "V = \\frac{K \\cdot W \\cdot L}{H}",
      domain: "tool_life",
      category: "wear",
      references: [
        {
          authors: "Archard, J.F.",
          title: "Contact and Rubbing of Flat Surfaces",
          publication: "Journal of Applied Physics",
          year: 1953,
          pages: "24(8), 981-988",
          doi: "10.1063/1.1721448",
        },
        {
          authors: "Rabinowicz, E.",
          title: "Friction and Wear of Materials",
          publication: "John Wiley & Sons, New York",
          year: 1965,
        },
      ],
      reference: "Archard, J.F. (1953). Contact and Rubbing of Flat Surfaces. J. Appl. Phys. 24(8), 981-988.",
      safety_class: "critical",
      assumptions: [
        "Sliding wear dominates (no fatigue or corrosive wear)",
        "Steady-state wear conditions",
        "Homogeneous material properties",
        "Constant contact area",
        "Linear relationship between wear and load",
      ],
      limitations: [
        "Does not account for diffusion wear at high temperatures",
        "May underpredict wear during running-in period",
        "K coefficient varies significantly with conditions",
        "Not suitable for abrasive or erosive wear mechanisms",
      ],
      valid_ranges: {
        normalForce: { min: 1, max: 50000, unit: "N" },
        slidingDistance: { min: 1, max: 1e9, unit: "mm" },
        toolHardness: { min: 100, max: 10000, unit: "HV" },
        workpieceHardness: { min: 10, max: 800, unit: "HV" },
        wearCoefficient: { min: 1e-10, max: 0.1, unit: "dimensionless" },
      },
      inputs: {
        normalForce: "Normal contact force [N]",
        slidingDistance: "Total sliding distance [mm]",
        toolHardness: "Tool Vickers hardness [HV]",
        workpieceHardness: "Workpiece Vickers hardness [HV]",
        contactArea: "Tool-workpiece contact area [mm²]",
        wearCoefficient: "Dimensionless wear coefficient K",
      },
      outputs: {
        wearVolume: "Total wear volume [mm³]",
        flankWear_VB: "Flank wear height [mm]",
        wearRate: "Wear rate [mm³/mm sliding]",
        wearRegime: "Wear regime classification",
      },
    };
  }

  // ─── Extended API ───────────────────────────────────────────────────────

  /**
   * Get wear coefficient for a material pair.
   * @param toolMaterial Tool material type
   * @param workpieceMaterial Workpiece material type
   * @returns Wear coefficient K
   */
  getWearCoefficient(toolMaterial: ToolMaterial, workpieceMaterial: WorkpieceMaterial): number {
    return lookupWearCoefficient(toolMaterial, workpieceMaterial);
  }

  /**
   * Get default hardness for a tool material.
   * @param material Tool material type
   * @returns Hardness [HV]
   */
  getToolHardness(material: ToolMaterial): number {
    return TOOL_HARDNESS[material] ?? 1600;
  }

  /**
   * Get default hardness for a workpiece material.
   * @param material Workpiece material type
   * @returns Hardness [HV]
   */
  getWorkpieceHardness(material: WorkpieceMaterial): number {
    return WORKPIECE_HARDNESS[material] ?? 200;
  }

  /**
   * Calculate wear from cutting parameters (convenience method).
   * Converts cutting parameters to Archard inputs.
   *
   * @param cuttingSpeed Cutting speed [m/min]
   * @param feed Feed rate [mm/rev]
   * @param depthOfCut Depth of cut [mm]
   * @param cuttingTime Cutting time [min]
   * @param toolMaterial Tool material type
   * @param workpieceMaterial Workpiece material type
   * @param specificCuttingForce Specific cutting force [N/mm²], default 2000
   * @returns Archard wear result
   */
  calculateFromCuttingParams(
    cuttingSpeed: number,
    feed: number,
    depthOfCut: number,
    cuttingTime: number,
    toolMaterial: ToolMaterial,
    workpieceMaterial: WorkpieceMaterial,
    specificCuttingForce = 2000
  ): ArchardWearResult {
    // Calculate sliding distance: L = Vc × t (converted to mm)
    const slidingDistance = cuttingSpeed * 1000 * cuttingTime; // mm

    // Estimate normal force from Kienzle: Ff ≈ 0.3 × Fc
    // Fc = kc × ap × f
    const Fc = specificCuttingForce * depthOfCut * feed;
    const Ff = 0.3 * Fc; // Normal force ≈ 30% of cutting force

    // Contact area ≈ feed × nose radius (simplified)
    // Using typical nose radius of 0.4mm
    const contactArea = feed * 0.4 + depthOfCut * 0.05; // mm²

    // Get hardness values
    const toolHardness = this.getToolHardness(toolMaterial);
    const workpieceHardness = this.getWorkpieceHardness(workpieceMaterial);

    // Estimate interface temperature (simplified correlation)
    const temperature = 200 + 3.5 * cuttingSpeed + 500 * feed;

    return this.calculate({
      normalForce: Ff,
      slidingDistance,
      toolHardness,
      workpieceHardness,
      contactArea: Math.max(contactArea, 0.01),
      toolMaterial,
      workpieceMaterial,
      temperature: Math.min(temperature, 1200),
    });
  }

  /**
   * Compare Archard prediction with Usui model.
   *
   * @param input Archard input parameters
   * @param usui_A Usui coefficient A (default 1e-5)
   * @param usui_B Usui activation energy B [K] (default 2000)
   * @param cuttingTime Cutting time [min] for Usui
   * @param interfaceTemp Interface temperature [°C] for Usui
   * @returns Comparison of both models
   */
  compareWithUsui(
    input: ArchardWearInput,
    usui_A = 1e-5,
    usui_B = 2000,
    cuttingTime: number,
    interfaceTemp: number
  ): ArchardUsuiComparison {
    // Calculate Archard wear
    const archardResult = this.calculate(input);
    const archard_vb = archardResult.flankWear_VB;

    // Calculate Usui wear
    // Usui: dVB/dt = A × σn × Vs × exp(-B/θ)
    // VB = A × σn × Vs × exp(-B/θ) × t
    const sigma_n = input.normalForce / input.contactArea; // Contact stress [MPa]
    const Vs = input.slidingDistance / (cuttingTime * 60); // Sliding velocity [mm/s]
    const theta_K = interfaceTemp + 273.15; // Temperature [K]

    const usui_rate = usui_A * sigma_n * Vs * Math.exp(-usui_B / theta_K);
    const usui_vb = usui_rate * cuttingTime * 60; // mm (rate is per second)

    // Calculate difference
    const diff = Math.abs(archard_vb - usui_vb);
    const avg = (archard_vb + usui_vb) / 2;
    const difference_pct = avg > 0 ? (diff / avg) * 100 : 0;

    // Determine higher prediction
    let higherPrediction: "archard" | "usui" | "equal" = "equal";
    if (archard_vb > usui_vb * 1.05) higherPrediction = "archard";
    else if (usui_vb > archard_vb * 1.05) higherPrediction = "usui";

    // Recommend model based on conditions
    let recommendedModel: "archard" | "usui" | "either" = "either";
    let reasoning = "Both models predict similar wear — either is acceptable";

    if (interfaceTemp > 700) {
      recommendedModel = "usui";
      reasoning = "High temperature (>700°C) — Usui diffusion model is more appropriate";
    } else if (interfaceTemp < 300 && input.normalForce > 500) {
      recommendedModel = "archard";
      reasoning = "Low temperature, high load — Archard adhesive model is more appropriate";
    } else if (difference_pct > 50) {
      // Large disagreement — recommend based on temperature
      recommendedModel = interfaceTemp > 500 ? "usui" : "archard";
      reasoning = `Large model disagreement (${difference_pct.toFixed(0)}%) — ${recommendedModel} recommended for ${interfaceTemp > 500 ? "high" : "low"} temperature conditions`;
    }

    return {
      archard_vb: Math.round(archard_vb * 1e6) / 1e6,
      usui_vb: Math.round(usui_vb * 1e6) / 1e6,
      difference_pct: Math.round(difference_pct * 10) / 10,
      higherPrediction,
      recommendedModel,
      reasoning,
    };
  }

  /**
   * Get all available tool materials.
   */
  getToolMaterials(): ToolMaterial[] {
    return Object.keys(TOOL_HARDNESS) as ToolMaterial[];
  }

  /**
   * Get all available workpiece materials.
   */
  getWorkpieceMaterials(): WorkpieceMaterial[] {
    return Object.keys(WORKPIECE_HARDNESS) as WorkpieceMaterial[];
  }

  /**
   * Get full wear coefficient table for a tool material.
   * @param toolMaterial Tool material type
   * @returns Map of workpiece materials to K values
   */
  getWearCoefficientTable(toolMaterial: ToolMaterial): Record<WorkpieceMaterial, number> {
    const result: Partial<Record<WorkpieceMaterial, number>> = {};
    for (const wp of this.getWorkpieceMaterials()) {
      result[wp] = lookupWearCoefficient(toolMaterial, wp);
    }
    return result as Record<WorkpieceMaterial, number>;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

/**
 * Singleton instance of ArchardAdhesiveWearEngine.
 */
export const archardAdhesiveWearEngine = new ArchardAdhesiveWearEngine();
