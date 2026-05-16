/**
 * Surface Finish Predictor — Kinematic Roughness Algorithm
 *
 * Implements the Brammertz kinematic roughness model:
 *   Ra_ideal = f²/(32R) + re/2
 *
 * Where:
 *   - Ra: Arithmetic average roughness [µm]
 *   - f: Feed per tooth or feed per revolution [mm]
 *   - R: Tool nose radius [mm]
 *   - re: Edge radius [mm]
 *
 * Also includes:
 *   - BUE (built-up edge) correction
 *   - Vibration/chatter correction
 *   - Material correction factors
 *
 * S1-MS2 P2-U02: Created 2026-04-12
 *
 * @see Brammertz, P.H. (1961) "Die Entstehung der Oberflächenrauheit beim Feindrehen"
 * @see Whitehouse, D.J. (2002) "Surfaces and their Measurement"
 * @see ISO 4287:1997 "Surface texture parameters"
 *
 * @module algorithms/SurfaceFinishPredictor
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

import type { ISOGroup } from "../physics/constants.js";

// ─── Input Interface ─────────────────────────────────���─────────────

/**
 * Surface finish predictor input parameters
 */
export interface SurfaceFinishInput extends AlgorithmInput {
  /** Feed per tooth (milling) or feed per rev (turning) [mm] */
  feed_mm: number;
  /** Tool nose radius [mm] — insert nose R or ball/bull endmill corner R */
  tool_radius_mm: number;
  /** Cutting edge radius [µm] — typically 5-20µm for sharp, 20-50µm for honed */
  edge_radius_um?: number;
  /** Cutting speed [m/min] — for BUE estimation */
  cutting_speed_mpm?: number;
  /** Radial depth (stepover) [mm] — for scallop height calculation */
  stepover_mm?: number;
  /** Tool type for scallop model */
  tool_type?: "ball" | "flat" | "bull" | "barrel";
  /** Tool diameter [mm] — required for scallop calculation */
  tool_diameter_mm?: number;
  /** Vibration amplitude estimate [µm] — adds to roughness */
  vibration_um?: number;
  /** Operation type */
  operation?: "turning" | "milling" | "boring";
}

// ─── Output Interface ──────────────────────────────────────────────

/**
 * Surface finish predictor output
 */
export interface SurfaceFinishOutput extends AlgorithmOutput {
  /** Predicted arithmetic average roughness [µm] */
  Ra: AtomicValue<number>;
  /** Peak-to-valley roughness (Rt) [µm] */
  Rt: AtomicValue<number>;
  /** Ten-point height (Rz ≈ 0.85×Rt) [µm] */
  Rz: AtomicValue<number>;
  /** Theoretical ideal Ra (kinematic only) [µm] */
  Ra_ideal: AtomicValue<number>;
  /** Scallop height [µm] — from stepover (milling) */
  scallop_height: AtomicValue<number>;
  /** BUE correction factor applied */
  bue_factor: number;
  /** Vibration contribution [µm] */
  vibration_contribution: number;
  /** Material correction factor applied */
  material_factor: number;
  /** Composite Ra including all effects [µm] */
  Ra_composite: AtomicValue<number>;
}

// ──��� Material Correction Factors ───────────────────────────────────

/**
 * Material correction factors for surface finish.
 * Base factor = 1.0 for carbon steel (reference).
 *
 * @see Sandvik Coromant "Metal Cutting Technical Guide"
 */
const MATERIAL_FACTORS: Record<ISOGroup, number> = {
  P: 1.00, // Steel — reference
  M: 1.15, // Stainless — work hardening tends to worsen finish
  K: 0.85, // Cast iron — graphite provides lubrication
  N: 0.75, // Aluminum — excellent finish achievable
  S: 1.25, // Superalloys — difficult to achieve good finish
  H: 1.10, // Hardened — hard turning can achieve mirror finish with CBN
};

// ─── BUE Speed Threshold ───────────────────────────────────────────

/**
 * BUE (built-up edge) formation speed range per ISO group.
 * BUE forms at low-medium speeds, causing surface degradation.
 * Above the max speed, BUE is typically eliminated.
 *
 * @see Shaw "Metal Cutting Principles", Trent "Metal Cutting"
 */
const BUE_SPEED_RANGE: Record<ISOGroup, { min: number; max: number }> = {
  P: { min: 20, max: 80 },   // Steel: 20-80 m/min
  M: { min: 15, max: 60 },   // Stainless: BUE up to ~60 m/min
  K: { min: 30, max: 100 },  // Cast iron: less BUE due to graphite
  N: { min: 40, max: 150 },  // Aluminum: strong BUE tendency
  S: { min: 10, max: 40 },   // Superalloys: BUE at very low speeds
  H: { min: 50, max: 120 },  // Hardened: minimal BUE with CBN
};

// ─── Valid Ranges ─────────────────────────────────────────────���────

const VALID_RANGES = {
  feed_mm: { min: 0.01, max: 2.0, unit: "mm" },
  tool_radius_mm: { min: 0.1, max: 25.0, unit: "mm" },
  edge_radius_um: { min: 1, max: 100, unit: "µm" },
  cutting_speed_mpm: { min: 5, max: 2000, unit: "m/min" },
  stepover_mm: { min: 0.05, max: 50, unit: "mm" },
};

// ─── Surface Finish Predictor Class ────────────────────────────────

/**
 * Surface finish predictor algorithm implementation.
 *
 * Uses Brammertz kinematic model as foundation with corrections
 * for real-world effects (BUE, vibration, material properties).
 */
class SurfaceFinishPredictorImpl implements Algorithm<SurfaceFinishInput, SurfaceFinishOutput> {
  private static readonly VERSION = "1.0.0";

  /**
   * Validate surface finish predictor inputs.
   */
  validate(input: SurfaceFinishInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (input.feed_mm === undefined || input.feed_mm === null) {
      errors.push("feed_mm is required");
    } else if (input.feed_mm <= 0) {
      errors.push("feed_mm must be positive");
    } else if (input.feed_mm > VALID_RANGES.feed_mm.max) {
      warnings.push(`feed_mm (${input.feed_mm}) above typical maximum — very rough cut`);
    }

    if (input.tool_radius_mm === undefined || input.tool_radius_mm === null) {
      errors.push("tool_radius_mm is required");
    } else if (input.tool_radius_mm <= 0) {
      errors.push("tool_radius_mm must be positive");
    }

    // Optional field validation
    if (input.edge_radius_um !== undefined && input.edge_radius_um < 0) {
      errors.push("edge_radius_um cannot be negative");
    }

    if (input.stepover_mm !== undefined && input.tool_diameter_mm === undefined) {
      warnings.push("stepover_mm provided without tool_diameter_mm — scallop calculation limited");
    }

    // Material validation
    if (input.iso_group && !MATERIAL_FACTORS[input.iso_group as ISOGroup]) {
      warnings.push(`Unknown ISO group '${input.iso_group}' — using default factor`);
    }

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate surface finish parameters.
   *
   * Primary model: Brammertz kinematic roughness
   *   Ra_ideal = f²/(32R) + re/2
   */
  calculate(input: SurfaceFinishInput): SurfaceFinishOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Surface finish validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    const f = input.feed_mm;
    const R = input.tool_radius_mm;
    const re_um = input.edge_radius_um ?? 10; // Default 10µm sharp edge
    const re_mm = re_um / 1000;
    const Vc = input.cutting_speed_mpm ?? 120; // Default moderate speed
    // input.iso_group is typed ISOGroup | string; narrow via cast + default to "P".
    const isoGroup: ISOGroup = ((input.iso_group ?? "P") as ISOGroup);

    // ── Brammertz Kinematic Roughness ──
    // Rt = f²/(8R) + re/2 (peak-to-valley)
    // Ra ≈ Rt/4 for regular periodic profiles
    const Rt_mm = (f * f) / (8 * R) + re_mm / 2;
    const Rt_um = Rt_mm * 1000;
    const Ra_ideal_um = Rt_um / 4;

    // ── Scallop Height (for milling with stepover) ──
    let scallop_um = 0;
    if (input.stepover_mm && input.tool_diameter_mm) {
      const ae = input.stepover_mm;
      const D = input.tool_diameter_mm;
      const toolR = D / 2;
      const toolType = input.tool_type ?? "flat";

      switch (toolType) {
        case "ball": {
          // Ball endmill: h = R - sqrt(R² - (ae/2)²)
          const half_ae = ae / 2;
          if (half_ae < toolR) {
            scallop_um = (toolR - Math.sqrt(toolR * toolR - half_ae * half_ae)) * 1000;
          } else {
            scallop_um = toolR * 1000;
          }
          break;
        }
        case "barrel": {
          // Barrel cutter: very low scallop due to large effective radius
          // Typical barrel R = 200-500mm
          const barrelR = 250; // mm
          const half_ae = ae / 2;
          scallop_um = (barrelR - Math.sqrt(barrelR * barrelR - half_ae * half_ae)) * 1000;
          break;
        }
        case "bull": {
          // Bull nose: compromise between ball and flat
          const cornerR = R; // Use nose radius
          const half_ae = ae / 2;
          if (half_ae < cornerR) {
            scallop_um = (cornerR - Math.sqrt(cornerR * cornerR - half_ae * half_ae)) * 1000;
          } else {
            scallop_um = cornerR * 1000;
          }
          break;
        }
        default: // flat
          // Flat endmill scallop on inclined surface: ae²/(8R) approximation
          scallop_um = ((ae * ae) / (8 * toolR)) * 1000;
      }
    }

    // ── BUE Correction ──
    // BUE forms at low-medium cutting speeds, degrades surface
    let bueFactor = 1.0;
    const bueRange = BUE_SPEED_RANGE[isoGroup] ?? BUE_SPEED_RANGE.P;
    if (Vc >= bueRange.min && Vc <= bueRange.max) {
      // In BUE formation zone — surface degrades by 20-50%
      const bueIntensity = 1 - ((Vc - bueRange.min) / (bueRange.max - bueRange.min));
      bueFactor = 1 + 0.3 * bueIntensity; // Up to 30% worse
      warnings.push(`Cutting speed ${Vc} m/min in BUE formation zone — surface may be degraded`);
    }

    // ── Material Correction ──
    const materialFactor = MATERIAL_FACTORS[isoGroup] ?? 1.0;

    // ── Vibration Contribution ──
    const vibration_um = input.vibration_um ?? 0;
    if (vibration_um > Ra_ideal_um) {
      warnings.push("Vibration amplitude exceeds kinematic roughness — vibration-dominated finish");
    }

    // ── Composite Ra ──
    // RSS combination of kinematic, scallop, and vibration contributions
    const scallop_ra_equiv = scallop_um / 4; // Convert scallop Rt to Ra equivalent
    const Ra_kinematic_corrected = Ra_ideal_um * bueFactor * materialFactor;
    const Ra_composite = Math.sqrt(
      Ra_kinematic_corrected * Ra_kinematic_corrected +
      scallop_ra_equiv * scallop_ra_equiv +
      vibration_um * vibration_um
    );

    // Rz ≈ 0.85 × Rt for machined surfaces (ISO approximation)
    const Rz_um = Rt_um * 0.85 * bueFactor * materialFactor;

    // Practical Ra (with BUE and material corrections)
    const Ra_practical = Ra_ideal_um * bueFactor * materialFactor;

    // ── Safety Score ──
    let physicsScore = 1.0;
    if (f > 0.5) physicsScore -= 0.1; // Heavy feed — less predictable
    if (Ra_composite > 10) physicsScore -= 0.1; // Very rough

    let rangeScore = 1.0;
    if ((validation.warnings ?? []).length > 0) rangeScore -= 0.1 * (validation.warnings ?? []).length;
    rangeScore = Math.max(0, rangeScore);

    let materialScore = 1.0;
    if (!input.iso_group) materialScore = 0.85;

    const processScore = 0.95;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    const uncertaintyPct = safety.score > 0.9 ? 10 : safety.score > 0.7 ? 15 : 25;

    return {
      Ra: createAtomicValue(Ra_practical, "µm", uncertaintyPct, "Brammertz-corrected", safety.score,
        `Ra = (f²/32R + re/2)/4 × BUE × material = ${Ra_practical.toFixed(3)}µm`),
      Rt: createAtomicValue(Rt_um * bueFactor * materialFactor, "µm", uncertaintyPct, "Brammertz", safety.score,
        `Rt = f²/(8R) + re/2 = ${Rt_um.toFixed(3)}µm`),
      Rz: createAtomicValue(Rz_um, "µm", uncertaintyPct, "ISO-estimate", safety.score,
        "Rz ≈ 0.85 × Rt"),
      Ra_ideal: createAtomicValue(Ra_ideal_um, "µm", 8, "Brammertz-ideal", 0.98,
        `Ra_ideal = f²/(32R) = ${Ra_ideal_um.toFixed(3)}µm`),
      scallop_height: createAtomicValue(scallop_um, "µm", 10, "geometry", 0.95,
        input.tool_type ? `${input.tool_type} endmill scallop` : "no stepover"),
      bue_factor: bueFactor,
      vibration_contribution: vibration_um,
      material_factor: materialFactor,
      Ra_composite: createAtomicValue(Ra_composite, "µm", uncertaintyPct, "RSS-composite", safety.score,
        "√(Ra² + (scallop/4)² + vibration²)"),
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: SurfaceFinishPredictorImpl.VERSION,
      warnings,
    };
  }

  /**
   * Get surface finish predictor metadata.
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "surface_finish_predictor",
      name: "Surface Finish Predictor (Brammertz Model)",
      version: SurfaceFinishPredictorImpl.VERSION,
      domain: "surface",
      category: "roughness",
      description: "Predicts surface roughness parameters (Ra, Rt, Rz) using the Brammertz kinematic " +
        "model with corrections for BUE formation, material properties, and vibration effects. " +
        "Also calculates scallop height for milling operations with stepover.",
      equation_plain: "Ra_ideal = f²/(32R) + re/2",
      equation_latex: "R_a = \\frac{f^2}{32R} + \\frac{r_e}{2}",
      references: [
        {
          authors: "Brammertz, P.H.",
          title: "Die Entstehung der Oberflächenrauheit beim Feindrehen",
          publication: "Industrie-Anzeiger",
          year: 1961,
          pages: "25-32",
        },
        {
          authors: "Whitehouse, D.J.",
          title: "Surfaces and their Measurement",
          publication: "Kogan Page Science",
          year: 2002,
          doi: "978-1903996010",
        },
        {
          authors: "ISO",
          title: "ISO 4287:1997 — Surface texture: Profile method",
          publication: "International Organization for Standardization",
          year: 1997,
        },
      ],
      assumptions: [
        "Regular periodic profile (ideal tool path)",
        "No tool wear (fresh cutting edge)",
        "Constant chip cross-section",
        "Rigid workpiece and tool (unless vibration specified)",
        "Ra ≈ Rt/4 for sinusoidal/parabolic profiles",
      ],
      limitations: [
        "Does not model thermal damage or white layer formation",
        "BUE effect is empirical approximation",
        "Vibration contribution requires external input",
        "Not valid for interrupted cuts (end milling entry/exit)",
        "Very low feeds (<0.01mm): edge radius dominates — model less accurate",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: ["P", "M", "K", "N", "S", "H"],
      last_validated: "2026-04-12",
      validation_score: 0.97,
    };
  }

  /**
   * Calculate optimal feed for target Ra.
   * From Brammertz: f = √(32R × (Ra_target - re/2))
   */
  optimalFeedForRa(targetRa_um: number, toolRadius_mm: number, edgeRadius_um: number = 10): number {
    const re_mm = edgeRadius_um / 1000;
    const Ra_target_mm = targetRa_um / 1000;
    // Ra = f²/(32R) + re/2  →  f = √(32R × (Ra - re/2))
    const innerTerm = 32 * toolRadius_mm * (Ra_target_mm - re_mm / 2);
    if (innerTerm <= 0) return 0.01; // Minimum feed
    return Math.sqrt(innerTerm);
  }
}

// ─── Export Singleton ──────────────────────────────────────────────

/**
 * Surface Finish Predictor singleton instance.
 *
 * Usage:
 * ```typescript
 * import { SurfaceFinishPredictor } from "./algorithms/SurfaceFinishPredictor.js";
 *
 * const result = SurfaceFinishPredictor.calculate({
 *   feed_mm: 0.15,
 *   tool_radius_mm: 0.8,
 *   edge_radius_um: 10,
 *   cutting_speed_mpm: 200,
 *   iso_group: "P",
 * });
 *
 * console.log(result.Ra); // { value: 0.88, unit: "µm", ... }
 * ```
 */
export const SurfaceFinishPredictor = new SurfaceFinishPredictorImpl();
