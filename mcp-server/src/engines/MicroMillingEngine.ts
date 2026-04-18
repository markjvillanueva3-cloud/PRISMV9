/**
 * MicroMillingEngine — Micro-Milling Physics for Sub-mm Tools
 *
 * MILL-AGI Phase 2 (MILL-MS7): Physics Hardening — Micro-Scale Cutting
 *
 * Adapts standard milling physics for micro-end mills (D < 1mm) where:
 *   - Size effects cause cutting edge radius to matter (r_e / h_c ratio)
 *   - Minimum chip thickness h_min dominates (ploughing vs shearing)
 *   - Burr formation is proportional (burr/feature ratio increases)
 *   - Tool runout becomes critical (TIR / D ratio)
 *   - Effective rake becomes negative when h_c < r_e
 *
 * Key Physics:
 *   - Minimum chip thickness: h_min = λ × r_e (λ ≈ 0.2-0.4)
 *   - Size effect on specific cutting force: k_c = k_c1 × (h_c)^(-m_c)
 *   - Ploughing force: F_p = τ_s × A_p where A_p = r_e² × (θ - sin(θ)cos(θ))
 *   - Effective rake: α_eff = atan(h_c / r_e) - π/2 for h_c < r_e
 *   - Tool deflection: δ ∝ L³/D⁴ (very sensitive at micro scale)
 *
 * References:
 *   [1] Dornfeld et al. (2006) "Recent Advances in Mechanical Micromachining"
 *       Annals of CIRP 55(2)
 *   [2] Aramcharoen & Mativenga (2009) "Size effect and tool geometry in
 *       micromilling" Precision Engineering 33(4)
 *   [3] Liu et al. (2004) "The Mechanics of Machining at the Micro-Scale"
 *       Int. J. Mach. Tools Manuf.
 *   [4] MIT 2.008 Lecture Notes — Micro-scale effects
 *
 * @module engines/MicroMillingEngine
 * @milestone MILL-AGI-P2/MILL-MS7-02
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MicroToolGeometry {
  diameter_mm: number;
  flute_count: number;
  cutting_edge_radius_um: number;
  helix_angle_deg: number;
  rake_angle_deg: number;
  flute_length_mm: number;
  overall_length_mm: number;
  shank_diameter_mm: number;
  tool_material: "carbide" | "cbn" | "pcd" | "diamond";
  coating?: "uncoated" | "TiAlN" | "DLC" | "diamond";
}

export interface MicroCuttingConditions {
  spindle_rpm: number;
  feed_per_tooth_um: number;
  axial_depth_um: number;
  radial_depth_um?: number;
  tool_runout_um: number;
  material: {
    name: string;
    shear_strength_mpa: number;
    hardness_hv?: number;
    ductility: "brittle" | "ductile" | "semi_ductile";
  };
  coolant: "dry" | "mql" | "flood";
}

export interface MicroMillingResult {
  cutting_regime: "ploughing" | "transition" | "shearing";
  minimum_chip_thickness_um: number;
  actual_chip_thickness_um: number;
  chip_formation_ratio: number;

  effective_rake_deg: number;
  size_effect_factor: number;
  specific_cutting_force_n_per_mm2: number;

  forces: {
    tangential_n: number;
    radial_n: number;
    axial_n: number;
    ploughing_n: number;
    total_n: number;
  };

  tool_deflection_um: number;
  deflection_to_tolerance_ratio: number;

  surface_quality: {
    predicted_ra_um: number;
    burr_height_um: number;
    burr_risk: "low" | "medium" | "high";
  };

  tool_life: {
    predicted_cuts: number;
    dominant_wear: "flank" | "crater" | "edge_rounding" | "chipping";
  };

  warnings: string[];
  recommendations: string[];
  confidence: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LAMBDA_MIN_CHIP = 0.3;
const SIZE_EFFECT_EXPONENT = 0.25;
const BASE_KC1_STEEL = 1800;
const PLOUGHING_COEFFICIENT = 0.15;

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MicroMillingEngine {
  /**
   * Analyze micro-milling operation with size effect corrections.
   */
  analyze(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions
  ): MicroMillingResult {
    const startTime = performance.now();

    if (tool.diameter_mm > 1.0) {
      log.warn(`[MicroMilling] Tool diameter ${tool.diameter_mm}mm may not require micro corrections`);
    }

    const hMin = this.computeMinimumChipThickness(tool);
    const hActual = conditions.feed_per_tooth_um;
    const chipRatio = hActual / hMin;

    const regime = this.determineCuttingRegime(chipRatio);

    const effectiveRake = this.computeEffectiveRake(
      tool.rake_angle_deg,
      hActual,
      tool.cutting_edge_radius_um
    );

    const sizeEffectFactor = this.computeSizeEffectFactor(hActual, tool.cutting_edge_radius_um);

    const kc = this.computeSpecificCuttingForce(
      conditions.material.shear_strength_mpa,
      hActual,
      sizeEffectFactor
    );

    const forces = this.computeForces(
      tool,
      conditions,
      kc,
      regime,
      effectiveRake
    );

    const deflection = this.computeToolDeflection(tool, forces.total_n);

    const surfaceQuality = this.predictSurfaceQuality(
      tool,
      conditions,
      regime,
      deflection
    );

    const toolLife = this.predictToolLife(tool, conditions, regime, forces);

    const warnings = this.generateWarnings(tool, conditions, regime, deflection, chipRatio);
    const recommendations = this.generateRecommendations(
      tool,
      conditions,
      regime,
      chipRatio,
      deflection
    );

    const confidence = this.computeConfidence(tool, conditions, regime);

    const duration = performance.now() - startTime;
    log.debug(
      `[MicroMilling] D=${tool.diameter_mm}mm, h=${hActual}µm, regime=${regime}, δ=${deflection.toFixed(2)}µm in ${duration.toFixed(1)}ms`
    );

    return {
      cutting_regime: regime,
      minimum_chip_thickness_um: hMin,
      actual_chip_thickness_um: hActual,
      chip_formation_ratio: chipRatio,
      effective_rake_deg: effectiveRake,
      size_effect_factor: sizeEffectFactor,
      specific_cutting_force_n_per_mm2: kc,
      forces,
      tool_deflection_um: deflection,
      deflection_to_tolerance_ratio: deflection / 5,
      surface_quality: surfaceQuality,
      tool_life: toolLife,
      warnings,
      recommendations,
      confidence,
    };
  }

  /**
   * Compute minimum chip thickness based on edge radius.
   * h_min = λ × r_e where λ ≈ 0.2-0.4 (material dependent)
   */
  computeMinimumChipThickness(tool: MicroToolGeometry): number {
    return LAMBDA_MIN_CHIP * tool.cutting_edge_radius_um;
  }

  /**
   * Determine cutting regime based on chip thickness ratio.
   */
  determineCuttingRegime(chipRatio: number): "ploughing" | "transition" | "shearing" {
    if (chipRatio < 0.5) return "ploughing";
    if (chipRatio < 1.5) return "transition";
    return "shearing";
  }

  /**
   * Compute effective rake angle considering size effects.
   * When h_c < r_e, rake becomes effectively negative.
   */
  computeEffectiveRake(
    nominalRake: number,
    chipThickness: number,
    edgeRadius: number
  ): number {
    if (chipThickness >= edgeRadius * 2) {
      return nominalRake;
    }

    const geometricRake = (Math.atan(chipThickness / edgeRadius) * 180) / Math.PI - 90;
    return Math.max(geometricRake, -60);
  }

  /**
   * Compute size effect factor for specific cutting force increase.
   * k_c scales with (h_c)^(-m_c) at micro scale.
   */
  computeSizeEffectFactor(chipThickness: number, edgeRadius: number): number {
    const normalizedThickness = chipThickness / edgeRadius;
    if (normalizedThickness >= 3) return 1.0;

    return Math.pow(3 / Math.max(normalizedThickness, 0.1), SIZE_EFFECT_EXPONENT);
  }

  /**
   * Compute specific cutting force with size effect correction.
   */
  computeSpecificCuttingForce(
    shearStrength: number,
    chipThickness: number,
    sizeEffectFactor: number
  ): number {
    const kc1 = shearStrength * 3.5;
    return kc1 * sizeEffectFactor;
  }

  /**
   * Compute cutting forces including ploughing component.
   */
  computeForces(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    kc: number,
    regime: "ploughing" | "transition" | "shearing",
    effectiveRake: number
  ): MicroMillingResult["forces"] {
    const ap = conditions.axial_depth_um / 1000;
    const fz = conditions.feed_per_tooth_um / 1000;

    const Ac = ap * fz;

    let Ft = kc * Ac;

    let Fp = 0;
    if (regime === "ploughing" || regime === "transition") {
      const re = tool.cutting_edge_radius_um / 1000;
      const ploughingArea = re * re * Math.PI * PLOUGHING_COEFFICIENT;
      Fp = conditions.material.shear_strength_mpa * ploughingArea * 1e6;

      if (regime === "ploughing") {
        Fp *= 2.0;
        Ft *= 0.3;
      }
    }

    const rakeRad = (effectiveRake * Math.PI) / 180;
    const Fr = Ft * Math.tan(Math.abs(rakeRad) + 0.2);
    const Fa = Ft * 0.3 * Math.tan((tool.helix_angle_deg * Math.PI) / 180);

    const runoutEffect = 1 + conditions.tool_runout_um / (tool.diameter_mm * 1000) * 2;

    return {
      tangential_n: Ft * runoutEffect,
      radial_n: Fr * runoutEffect,
      axial_n: Fa,
      ploughing_n: Fp,
      total_n: Math.sqrt((Ft + Fp) ** 2 + Fr ** 2 + Fa ** 2) * runoutEffect,
    };
  }

  /**
   * Compute tool deflection using beam theory.
   * δ = F × L³ / (3 × E × I) where I = π × D⁴ / 64
   */
  computeToolDeflection(tool: MicroToolGeometry, force: number): number {
    const E = tool.tool_material === "carbide" ? 600e9 : 1000e9;
    const D = tool.diameter_mm / 1000;
    const L = tool.flute_length_mm / 1000;

    const I = (Math.PI * Math.pow(D, 4)) / 64;
    const deflection_m = (force * Math.pow(L, 3)) / (3 * E * I);

    return deflection_m * 1e6;
  }

  /**
   * Predict surface quality parameters.
   */
  predictSurfaceQuality(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    regime: "ploughing" | "transition" | "shearing",
    deflection: number
  ): MicroMillingResult["surface_quality"] {
    const fz = conditions.feed_per_tooth_um;
    const R = (tool.diameter_mm * 1000) / 2;

    let Ra = (fz * fz) / (32 * R) + tool.cutting_edge_radius_um / 4;

    if (regime === "ploughing") {
      Ra *= 2.5;
    } else if (regime === "transition") {
      Ra *= 1.5;
    }

    Ra += deflection * 0.2;

    const burrHeight = fz * 0.3 + tool.cutting_edge_radius_um * 0.5;

    const burrRisk =
      conditions.material.ductility === "ductile"
        ? "high"
        : conditions.material.ductility === "semi_ductile"
          ? "medium"
          : "low";

    return {
      predicted_ra_um: Ra,
      burr_height_um: burrHeight,
      burr_risk: burrRisk,
    };
  }

  /**
   * Predict tool life in number of cuts.
   */
  predictToolLife(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    regime: "ploughing" | "transition" | "shearing",
    forces: MicroMillingResult["forces"]
  ): MicroMillingResult["tool_life"] {
    let baseCuts = 50000;

    if (regime === "ploughing") baseCuts *= 0.3;
    else if (regime === "transition") baseCuts *= 0.6;

    if (tool.coating === "DLC") baseCuts *= 1.5;
    else if (tool.coating === "diamond") baseCuts *= 2.0;
    else if (tool.coating === "uncoated") baseCuts *= 0.5;

    const stressFactor = forces.total_n / (tool.diameter_mm * 0.1);
    baseCuts *= Math.max(0.1, 1 - stressFactor * 0.01);

    const dominantWear: MicroMillingResult["tool_life"]["dominant_wear"] =
      regime === "ploughing"
        ? "edge_rounding"
        : conditions.material.hardness_hv && conditions.material.hardness_hv > 400
          ? "crater"
          : "flank";

    return {
      predicted_cuts: Math.round(baseCuts),
      dominant_wear: dominantWear,
    };
  }

  /**
   * Generate warnings for problematic conditions.
   */
  generateWarnings(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    regime: "ploughing" | "transition" | "shearing",
    deflection: number,
    chipRatio: number
  ): string[] {
    const warnings: string[] = [];

    if (regime === "ploughing") {
      warnings.push("Ploughing regime: increase feed to exceed minimum chip thickness");
    }

    if (deflection > 5) {
      warnings.push(`Tool deflection ${deflection.toFixed(1)}µm exceeds typical tolerance`);
    }

    if (conditions.tool_runout_um > tool.diameter_mm * 50) {
      warnings.push("Runout exceeds 5% of diameter — uneven tooth loads");
    }

    const aspectRatio = tool.overall_length_mm / tool.diameter_mm;
    if (aspectRatio > 10) {
      warnings.push(`High L/D ratio (${aspectRatio.toFixed(0)}) — chatter risk`);
    }

    if (chipRatio > 0.3 && chipRatio < 1.0 && conditions.material.ductility === "ductile") {
      warnings.push("Transition regime with ductile material — burr formation likely");
    }

    return warnings;
  }

  /**
   * Generate recommendations to improve operation.
   */
  generateRecommendations(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    regime: "ploughing" | "transition" | "shearing",
    chipRatio: number,
    deflection: number
  ): string[] {
    const recs: string[] = [];

    if (regime === "ploughing") {
      const targetFeed = tool.cutting_edge_radius_um * LAMBDA_MIN_CHIP * 2;
      recs.push(`Increase feed to ≥${targetFeed.toFixed(1)}µm to enter shearing regime`);
    }

    if (deflection > 3 && tool.flute_length_mm > tool.diameter_mm * 3) {
      recs.push("Reduce flute length or use larger diameter to reduce deflection");
    }

    if (conditions.tool_runout_um > 2 && tool.diameter_mm < 0.5) {
      recs.push("Use air-bearing spindle or precision collet for sub-0.5mm tools");
    }

    if (tool.coating === "uncoated" && conditions.material.shear_strength_mpa > 400) {
      recs.push("Consider DLC or diamond coating for hard material");
    }

    if (conditions.coolant === "dry" && tool.diameter_mm < 0.3) {
      recs.push("Use MQL for improved chip evacuation in micro-milling");
    }

    return recs;
  }

  /**
   * Compute confidence in predictions.
   */
  computeConfidence(
    tool: MicroToolGeometry,
    conditions: MicroCuttingConditions,
    regime: "ploughing" | "transition" | "shearing"
  ): number {
    let confidence = 0.85;

    if (tool.diameter_mm < 0.1) confidence -= 0.15;
    else if (tool.diameter_mm < 0.3) confidence -= 0.05;

    if (regime === "ploughing") confidence -= 0.1;
    else if (regime === "transition") confidence -= 0.05;

    if (conditions.material.ductility === "brittle") confidence += 0.05;

    return Math.max(Math.min(confidence, 0.95), 0.5);
  }

  /**
   * Get optimal feed for given tool to operate in shearing regime.
   */
  getOptimalFeed(tool: MicroToolGeometry): { min_um: number; optimal_um: number; max_um: number } {
    const hMin = this.computeMinimumChipThickness(tool);
    return {
      min_um: hMin * 1.2,
      optimal_um: hMin * 2.5,
      max_um: tool.diameter_mm * 50,
    };
  }

  /**
   * Get critical edge radius for given chip thickness.
   */
  getCriticalEdgeRadius(chipThickness_um: number): number {
    return chipThickness_um / LAMBDA_MIN_CHIP;
  }

  /**
   * Validate tool geometry for micro-milling.
   */
  validateTool(tool: MicroToolGeometry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (tool.diameter_mm <= 0) errors.push("Diameter must be positive");
    if (tool.diameter_mm > 2) errors.push("Diameter > 2mm is not micro-milling");
    if (tool.cutting_edge_radius_um <= 0) errors.push("Edge radius must be positive");
    if (tool.cutting_edge_radius_um > tool.diameter_mm * 100) {
      errors.push("Edge radius too large relative to diameter");
    }
    if (tool.flute_count < 1) errors.push("Must have at least 1 flute");
    if (tool.overall_length_mm < tool.diameter_mm) {
      errors.push("Overall length cannot be less than diameter");
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const microMillingEngine = new MicroMillingEngine();
