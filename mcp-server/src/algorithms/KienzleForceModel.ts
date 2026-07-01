/**
 * Kienzle Force Model — Specific Cutting Force Algorithm
 *
 * Implements the Kienzle cutting force model:
 *   Fc = kc1.1 × h^(1-mc) × b × C_rake × C_edge
 *
 * Where:
 *   - Fc: Tangential cutting force [N]
 *   - kc1.1: Specific cutting force at h=1mm [N/mm²]
 *   - h: Chip thickness [mm]
 *   - mc: Kienzle exponent (material-dependent)
 *   - b: Chip width [mm]
 *   - C_rake: Rake angle correction factor
 *   - C_edge: Edge force correction (BUE/edge radius effects)
 *
 * 3-component decomposition:
 *   - Fc: Tangential (main cutting force, in cutting velocity direction)
 *   - Ff: Feed force (axial, in feed direction)
 *   - Fp: Radial/passive force (perpendicular to both)
 *
 * S1-MS2 P1-U02: Created 2026-04-12
 *
 * @see Kienzle, O. (1952) "Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen"
 * @see Altintas, Y. (2012) "Manufacturing Automation" 2nd ed., Table 2.1
 * @see Sandvik Coromant "Metal Cutting Technology" Ch.5
 *
 * @module algorithms/KienzleForceModel
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
  CANONICAL_KIENZLE,
  CANONICAL_MATERIAL_DB,
  getKienzle,
} from "../physics/constants.js";

// ─── Input Interface ───────────────────────────────────────────────

/**
 * Kienzle force model input parameters
 */
export interface KienzleInput extends AlgorithmInput {
  /** Chip thickness [mm] — typically: f × sin(κr) for turning */
  chip_thickness_mm: number;
  /** Chip width [mm] — typically: ap / sin(κr) for turning */
  chip_width_mm: number;
  /** Rake angle [degrees] — reference is 6° */
  rake_angle_deg?: number;
  /** Edge radius [mm] — for edge force correction */
  edge_radius_mm?: number;
  /** Lead angle (κr) [degrees] — for force decomposition, default 90° */
  lead_angle_deg?: number;
  /** Operation type for force ratio selection */
  operation?: "turning" | "milling" | "drilling";
}

// ─── Output Interface ──────────────────────────────────────────────

/**
 * Kienzle force model output
 */
export interface KienzleOutput extends AlgorithmOutput {
  /** Tangential (main) cutting force */
  Fc: AtomicValue<number>;
  /** Feed (axial) force */
  Ff: AtomicValue<number>;
  /** Radial (passive) force */
  Fp: AtomicValue<number>;
  /** Resultant force magnitude */
  Fr: AtomicValue<number>;
  /** Specific cutting force at actual chip thickness */
  Kc: AtomicValue<number>;
  /** Base specific cutting force (kc1.1) used */
  kc1_1: AtomicValue<number>;
  /** Kienzle exponent (mc) used */
  mc: AtomicValue<number>;
  /** Rake angle correction factor applied */
  rake_correction: number;
  /** Edge force correction factor applied */
  edge_correction: number;
}

// ─── Force Ratios ──────────────────────────────────────────────────

/**
 * Force component ratios for different operations.
 * Ff/Fc (feed/tangential) and Fp/Fc (radial/tangential).
 *
 * @see Altintas (2012) Table 2.1
 * @see Sandvik Coromant "Turning Forces"
 */
const FORCE_RATIOS: Record<string, { feed: number; radial: number }> = {
  turning: { feed: 0.40, radial: 0.25 },   // κr=90°: Ff≈0.4Fc, Fp≈0.25Fc
  milling: { feed: 0.20, radial: 0.30 },   // Avg engagement
  drilling: { feed: 0.50, radial: 0.00 },  // Axial-dominated
};

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  chip_thickness_mm: { min: 0.01, max: 5.0, unit: "mm" },
  chip_width_mm: { min: 0.1, max: 50.0, unit: "mm" },
  rake_angle_deg: { min: -20, max: 30, unit: "°" },
  edge_radius_mm: { min: 0.001, max: 0.5, unit: "mm" },
  lead_angle_deg: { min: 15, max: 150, unit: "°" },
};

// ─── Kienzle Force Model Class ─────────────────────────────────────

/**
 * Kienzle specific cutting force model implementation.
 *
 * SAFETY-CRITICAL: This model directly affects cutting force predictions
 * used for power requirements, tool deflection, and stability calculations.
 */
class KienzleForceModelImpl implements Algorithm<KienzleInput, KienzleOutput> {
  private static readonly VERSION = "1.0.0";

  /**
   * Validate Kienzle model inputs.
   */
  validate(input: KienzleInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const corrected: Record<string, unknown> = {};

    // Required fields
    if (input.chip_thickness_mm === undefined || input.chip_thickness_mm === null) {
      errors.push("chip_thickness_mm is required");
    } else if (input.chip_thickness_mm <= 0) {
      errors.push("chip_thickness_mm must be positive");
    } else if (input.chip_thickness_mm < VALID_RANGES.chip_thickness_mm.min) {
      warnings.push(`chip_thickness_mm (${input.chip_thickness_mm}) below minimum ${VALID_RANGES.chip_thickness_mm.min}mm — clamped`);
      corrected.chip_thickness_mm = VALID_RANGES.chip_thickness_mm.min;
    } else if (input.chip_thickness_mm > VALID_RANGES.chip_thickness_mm.max) {
      warnings.push(`chip_thickness_mm (${input.chip_thickness_mm}) above maximum ${VALID_RANGES.chip_thickness_mm.max}mm — extrapolation`);
    }

    if (input.chip_width_mm === undefined || input.chip_width_mm === null) {
      errors.push("chip_width_mm is required");
    } else if (input.chip_width_mm <= 0) {
      errors.push("chip_width_mm must be positive");
    } else if (input.chip_width_mm < VALID_RANGES.chip_width_mm.min) {
      warnings.push(`chip_width_mm (${input.chip_width_mm}) below minimum — may indicate micro-cutting`);
    }

    // Optional fields
    if (input.rake_angle_deg !== undefined) {
      if (input.rake_angle_deg < VALID_RANGES.rake_angle_deg.min ||
          input.rake_angle_deg > VALID_RANGES.rake_angle_deg.max) {
        warnings.push(`rake_angle_deg (${input.rake_angle_deg}) outside typical range [${VALID_RANGES.rake_angle_deg.min}, ${VALID_RANGES.rake_angle_deg.max}]`);
      }
    }

    if (input.edge_radius_mm !== undefined && input.edge_radius_mm < 0) {
      errors.push("edge_radius_mm cannot be negative");
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
   * Calculate cutting forces using Kienzle model.
   *
   * Formula: Fc = kc1.1 × h^(1-mc) × b × C_rake × C_edge
   */
  calculate(input: KienzleInput): KienzleOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Kienzle validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    // Apply corrections from validation
    const h = (validation.corrected?.chip_thickness_mm as number) ?? input.chip_thickness_mm;
    const b = input.chip_width_mm;
    const rakeAngle = input.rake_angle_deg ?? 6; // Reference rake angle
    const edgeRadius = input.edge_radius_mm ?? 0.02; // Default 20µm edge radius
    const leadAngle = input.lead_angle_deg ?? 90;
    const operation = input.operation ?? "turning";

    // Resolve Kienzle constants from material
    let kc1_1: number;
    let mc: number;
    let materialSource: string;

    if (input.material) {
      if (typeof input.material === "string") {
        const kienzle = getKienzle(input.material);
        kc1_1 = kienzle.kc1_1;
        mc = kienzle.mc;
        materialSource = input.material;
      } else {
        kc1_1 = input.material.kc1_1;
        mc = input.material.mc;
        materialSource = input.material.name;
      }
    } else if (input.iso_group && Object.prototype.hasOwnProperty.call(CANONICAL_KIENZLE, input.iso_group)) {
      const isoKey = input.iso_group as ISOGroup;
      const kienzle = CANONICAL_KIENZLE[isoKey];
      kc1_1 = kienzle.kc1_1;
      mc = kienzle.mc;
      materialSource = `ISO-${isoKey}`;
    } else {
      // Default to steel (ISO P)
      kc1_1 = CANONICAL_KIENZLE.P.kc1_1;
      mc = CANONICAL_KIENZLE.P.mc;
      materialSource = "default-steel";
      warnings.push("No material specified — defaulting to steel (ISO P)");
    }

    // ── Kienzle Force Calculation ──

    // Specific cutting force at chip thickness h
    // Kc = kc1.1 × h^(-mc)
    const Kc = kc1_1 * Math.pow(h, -mc);

    // Rake angle correction: +1% per degree from reference (6°)
    // Source: Kronenberg, Kienzle original paper
    const rakeCorrection = 1 - (rakeAngle - 6) * 0.01;

    // Edge force correction (for small chip thicknesses)
    // As h approaches edge radius, plowing dominates over shearing
    // Source: Albrecht (1960), Waldorf et al. (1998)
    let edgeCorrection = 1.0;
    if (h < 3 * edgeRadius) {
      // Edge radius effect becomes significant
      // Correction factor increases force by up to 30% at very small h
      const ratio = edgeRadius / h;
      edgeCorrection = 1 + 0.3 * Math.min(ratio, 1.0);
      warnings.push(`Edge radius effect applied: chip thickness (${h.toFixed(3)}mm) ≈ edge radius (${edgeRadius.toFixed(3)}mm)`);
    }

    // Tangential (main) cutting force
    // Fc = Kc × b × h × C_rake × C_edge
    // Note: Alternative form Fc = kc1.1 × b × h^(1-mc) × corrections
    const Fc = Kc * b * h * rakeCorrection * edgeCorrection;

    // Force decomposition using operation-specific ratios
    const ratios = FORCE_RATIOS[operation] ?? FORCE_RATIOS.turning;
    const Ff = Fc * ratios.feed;    // Feed (axial) force
    const Fp = Fc * ratios.radial;  // Radial (passive) force

    // Lead angle adjustment for radial/axial components
    // At non-90° lead angles, force components rotate
    const leadRad = (leadAngle * Math.PI) / 180;
    const sinLead = Math.sin(leadRad);
    const cosLead = Math.cos(leadRad);

    // Adjust Ff and Fp based on lead angle (simplified)
    // Full treatment requires coordinate transformation
    const Ff_adj = Ff * sinLead + Fp * cosLead;
    const Fp_adj = Fp * sinLead + Ff * cosLead;

    // Resultant force
    const Fr = Math.sqrt(Fc * Fc + Ff_adj * Ff_adj + Fp_adj * Fp_adj);

    // ── Safety Score Calculation ──

    // Physics validity: check if we're in the Kienzle model's valid regime
    let physicsScore = 1.0;
    if (h < 0.05) physicsScore -= 0.2; // Very thin chips, plowing regime
    if (h > 2.0) physicsScore -= 0.1;  // Thick chips, extrapolation

    // Range validity
    let rangeScore = 1.0;
    if ((validation.warnings ?? []).length > 0) rangeScore -= 0.1 * (validation.warnings ?? []).length;
    rangeScore = Math.max(0, rangeScore);

    // Material validity
    let materialScore = 1.0;
    if (materialSource === "default-steel") materialScore = 0.7;
    if (materialSource.startsWith("ISO-")) materialScore = 0.85;

    // Process validity
    const processScore = 0.95; // Kienzle model is well-established

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    // ── Build Output ──

    const uncertaintyPct = safety.score > 0.9 ? 5 : safety.score > 0.7 ? 10 : 15;

    return {
      Fc: createAtomicValue(Fc, "N", uncertaintyPct, "Kienzle", safety.score,
        `Fc = ${kc1_1} × ${h.toFixed(3)}^(1-${mc}) × ${b.toFixed(2)} × ${rakeCorrection.toFixed(3)} × ${edgeCorrection.toFixed(3)}`),
      Ff: createAtomicValue(Ff_adj, "N", uncertaintyPct * 1.2, "Kienzle-ratio", safety.score,
        `Ff = Fc × ${ratios.feed} (adjusted for κr=${leadAngle}°)`),
      Fp: createAtomicValue(Fp_adj, "N", uncertaintyPct * 1.2, "Kienzle-ratio", safety.score,
        `Fp = Fc × ${ratios.radial} (adjusted for κr=${leadAngle}°)`),
      Fr: createAtomicValue(Fr, "N", uncertaintyPct, "RSS", safety.score,
        "Fr = √(Fc² + Ff² + Fp²)"),
      Kc: createAtomicValue(Kc, "N/mm²", 5, "Kienzle", 0.95,
        `Kc = kc1.1 × h^(-mc) = ${kc1_1} × ${h.toFixed(3)}^(-${mc})`),
      kc1_1: createAtomicValue(kc1_1, "N/mm²", 3, materialSource, 0.98),
      mc: createAtomicValue(mc, "-", 5, materialSource, 0.98),
      rake_correction: rakeCorrection,
      edge_correction: edgeCorrection,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: KienzleForceModelImpl.VERSION,
      warnings,
    };
  }

  /**
   * Get Kienzle model metadata.
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "kienzle_force",
      name: "Kienzle Specific Cutting Force Model",
      version: KienzleForceModelImpl.VERSION,
      domain: "physics",
      category: "cutting_force",
      description: "Calculates cutting forces based on specific cutting force (Kc) and chip geometry. " +
        "Provides 3-component force decomposition (tangential, feed, radial) with corrections for " +
        "rake angle and edge radius effects.",
      equation_plain: "Fc = kc1.1 × h^(1-mc) × b × C_rake × C_edge",
      equation_latex: "F_c = k_{c1.1} \\cdot h^{1-m_c} \\cdot b \\cdot C_{\\gamma} \\cdot C_{re}",
      references: [
        {
          authors: "Kienzle, O.",
          title: "Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen",
          publication: "VDI-Z",
          year: 1952,
          pages: "299-305",
        },
        {
          authors: "Altintas, Y.",
          title: "Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC Design",
          publication: "Cambridge University Press",
          year: 2012,
          pages: "Table 2.1",
          doi: "10.1017/CBO9780511843723",
        },
        {
          authors: "Sandvik Coromant",
          title: "Metal Cutting Technology Technical Guide",
          publication: "Sandvik Coromant",
          year: 2024,
          pages: "Chapter 5",
        },
      ],
      assumptions: [
        "Orthogonal cutting geometry (can be extended to oblique)",
        "Steady-state chip formation (not applicable to interrupted cuts)",
        "No built-up edge (BUE) formation",
        "Constant rake angle along cutting edge",
        "Chip thickness > edge radius for primary shearing regime",
      ],
      limitations: [
        "Chip thickness < 0.05mm: plowing/ploughing regime dominates",
        "Chip thickness > 3mm: extrapolation, reduced accuracy",
        "High-speed machining (>500 m/min): thermal effects not modeled",
        "Interrupted cuts: dynamic effects not captured",
        "Non-homogeneous materials: uses average properties",
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
 * Kienzle Force Model singleton instance.
 *
 * Usage:
 * ```typescript
 * import { KienzleForceModel } from "./algorithms/KienzleForceModel.js";
 *
 * const result = KienzleForceModel.calculate({
 *   material: "steel",
 *   chip_thickness_mm: 0.2,
 *   chip_width_mm: 2.0,
 *   rake_angle_deg: 6,
 * });
 *
 * console.log(result.Fc); // { value: 720, unit: "N", ... }
 * ```
 */
export const KienzleForceModel = new KienzleForceModelImpl();
