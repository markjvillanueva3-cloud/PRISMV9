/**
 * MicroMillingSizeEffectEngine — MILL-AGI-P2/MILL-MS7-05
 *
 * Size effect physics for micro-scale cutting (tool diameter < 1mm or uncut chip
 * thickness comparable to tool edge radius). In micro-milling, classical Kienzle
 * force models break down due to:
 *   - Minimum chip thickness effect (ploughing vs cutting transition)
 *   - Edge radius dominance (r_edge >> uncut chip thickness)
 *   - Grain size effects (chip thickness ~ grain diameter)
 *   - Specific cutting force increase at small scales
 *   - Elastic recovery of workpiece material
 *
 * This engine provides corrected force and specific cutting pressure calculations
 * for sub-millimeter scale machining, essential for:
 *   - Micro-molds and micro-fluidics
 *   - Medical device features
 *   - Electronics and semiconductor components
 *   - Precision watch components
 *   - Miniature aerospace parts
 *
 * Literature: Aramcharoen & Mativenga 2009, Liu & Melkote 2006, Vogler et al. 2004,
 * Câmara et al. 2012, Cheng & Huo 2013
 *
 * @module MicroMillingSizeEffectEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES AND SCHEMAS
// ============================================================================

export const MicroToolSchema = z.object({
  diameter_mm: z.number().positive().max(3),
  edge_radius_um: z.number().positive().describe("Cutting edge radius in micrometers"),
  flute_count: z.number().int().positive(),
  helix_angle_deg: z.number().min(0).max(60).optional(),
  rake_angle_deg: z.number().min(-20).max(30).optional(),
  coating: z.enum(["uncoated", "tin", "tialn", "alcrn", "dlc", "cbn", "pcd"]).optional(),
});

export type MicroTool = z.infer<typeof MicroToolSchema>;

export const MicroCutSchema = z.object({
  feed_per_tooth_um: z.number().positive().describe("Feed per tooth in micrometers"),
  axial_depth_mm: z.number().positive(),
  radial_depth_mm: z.number().positive(),
  cutting_speed_m_min: z.number().positive(),
  spindle_rpm: z.number().positive().optional(),
});

export type MicroCut = z.infer<typeof MicroCutSchema>;

export const MicroMaterialSchema = z.object({
  name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  kc1_1_base: z.number().positive().describe("Base specific cutting force at 1mm chip thickness"),
  mc: z.number().min(0).max(1).describe("Kienzle exponent"),
  grain_size_um: z.number().positive().optional().describe("Average grain size in micrometers"),
  hardness_hrc: z.number().optional(),
  elastic_modulus_gpa: z.number().positive().optional(),
});

export type MicroMaterial = z.infer<typeof MicroMaterialSchema>;

export interface SizeEffectResult {
  effective_kc_N_mm2: number;
  size_effect_factor: number;
  minimum_chip_thickness_um: number;
  ploughing_ratio: number;
  cutting_force_N: number;
  thrust_force_N: number;
  radial_force_N: number;
  specific_energy_J_mm3: number;
  elastic_recovery_um: number;
  regime: "cutting" | "transition" | "ploughing";
  warnings: string[];
  physics_trace: {
    formulas: string[];
    assumptions: string[];
    intermediate_values: Record<string, number>;
    confidence: number;
  };
}

export interface ChipFormationAnalysis {
  uncut_chip_thickness_um: number;
  actual_chip_thickness_um: number;
  chip_compression_ratio: number;
  shear_angle_deg: number;
  ploughing_force_ratio: number;
  cutting_regime: "continuous" | "segmented" | "ploughing_dominant";
  grain_size_ratio: number;
  edge_radius_ratio: number;
}

export interface MicroMillingRecommendation {
  optimal_fz_um: number;
  recommended_rpm: number;
  expected_force_N: number;
  expected_roughness_um: number;
  tool_life_factor: number;
  process_stability: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_CHIP_THICKNESS_FACTOR = 0.2; // h_min ~ 0.2 * r_edge (Aramcharoen 2009)
const PLOUGHING_TRANSITION_FACTOR = 0.35; // Transition at h ~ 0.35 * r_edge
const ELASTIC_RECOVERY_FACTOR = 0.1; // 10% elastic springback typical
const GRAIN_SIZE_EFFECT_THRESHOLD = 3; // Size effect when chip < 3x grain size

// Size effect exponent (kc increases as chip thickness decreases)
const SIZE_EFFECT_EXPONENT = -0.25; // Empirical from Câmara et al.

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MicroMillingSizeEffectEngine {
  /**
   * Calculate size effect corrected cutting forces for micro-milling.
   *
   * @param tool - Micro-tool geometry
   * @param cut - Cutting parameters
   * @param material - Workpiece material properties
   * @returns Size effect analysis with corrected forces
   */
  static calculateSizeEffect(
    tool: MicroTool,
    cut: MicroCut,
    material: MicroMaterial,
  ): SizeEffectResult {
    const formulas: string[] = [];
    const assumptions: string[] = [];
    const intermediates: Record<string, number> = {};
    const warnings: string[] = [];

    // Convert units
    const fzMm = cut.feed_per_tooth_um / 1000;
    const edgeRadiusMm = tool.edge_radius_um / 1000;
    intermediates.fz_mm = fzMm;
    intermediates.edge_radius_mm = edgeRadiusMm;

    // Calculate uncut chip thickness (average for end milling)
    const ae = cut.radial_depth_mm;
    const d = tool.diameter_mm;
    const engagementAngle = Math.acos(1 - 2 * ae / d);
    const avgChipThickness = fzMm * Math.sin(engagementAngle / 2) * (2 * ae / d);
    intermediates.avg_chip_thickness_mm = avgChipThickness;
    formulas.push("h_avg = fz * sin(theta/2) * (2*ae/d)");

    // Minimum chip thickness (Aramcharoen model)
    const hMin = MIN_CHIP_THICKNESS_FACTOR * edgeRadiusMm;
    intermediates.h_min_mm = hMin;
    formulas.push("h_min = 0.2 * r_edge (Aramcharoen 2009)");

    // Determine cutting regime
    const edgeRadiusRatio = avgChipThickness / edgeRadiusMm;
    intermediates.edge_radius_ratio = edgeRadiusRatio;

    let regime: "cutting" | "transition" | "ploughing";
    if (edgeRadiusRatio > 1.0) {
      regime = "cutting";
    } else if (edgeRadiusRatio > PLOUGHING_TRANSITION_FACTOR) {
      regime = "transition";
    } else {
      regime = "ploughing";
      warnings.push("Chip thickness below minimum - primarily ploughing forces");
    }

    // Ploughing ratio (fraction of material ploughed vs cut)
    const ploughingRatio = Math.min(1, Math.max(0, 1 - (edgeRadiusRatio / PLOUGHING_TRANSITION_FACTOR)));
    intermediates.ploughing_ratio = ploughingRatio;
    formulas.push("ploughing_ratio = 1 - (h/r_edge) / 0.35");

    // Size effect on specific cutting pressure
    // kc_eff = kc1.1 * (h/h_ref)^SIZE_EFFECT_EXPONENT
    const hRef = 1.0; // Reference chip thickness = 1mm
    const sizeEffectFactor = Math.pow(avgChipThickness / hRef, SIZE_EFFECT_EXPONENT);
    intermediates.size_effect_factor = sizeEffectFactor;
    formulas.push("size_effect = (h/h_ref)^(-0.25) (Câmara 2012)");

    // Edge radius effect (additional increase in kc)
    const edgeRadiusEffect = 1 + (edgeRadiusMm / avgChipThickness) * 0.15;
    intermediates.edge_radius_effect = edgeRadiusEffect;
    formulas.push("edge_effect = 1 + (r_edge/h) * 0.15");

    // Grain size effect
    let grainSizeEffect = 1.0;
    if (material.grain_size_um) {
      const grainSizeMm = material.grain_size_um / 1000;
      const grainRatio = avgChipThickness / grainSizeMm;
      if (grainRatio < GRAIN_SIZE_EFFECT_THRESHOLD) {
        grainSizeEffect = 1 + 0.2 * (1 - grainRatio / GRAIN_SIZE_EFFECT_THRESHOLD);
        intermediates.grain_size_effect = grainSizeEffect;
        warnings.push("Grain size comparable to chip thickness - increased variability expected");
        formulas.push("grain_effect = 1 + 0.2*(1 - h/3*d_grain)");
        assumptions.push("Polycrystalline material behavior assumed");
      }
    }

    // Effective specific cutting pressure
    const kcEffective = material.kc1_1_base * sizeEffectFactor * edgeRadiusEffect * grainSizeEffect;
    intermediates.kc_effective = kcEffective;

    // Cross-sectional area of chip
    const chipArea = avgChipThickness * cut.axial_depth_mm;
    intermediates.chip_area_mm2 = chipArea;

    // Cutting force (tangential)
    const cuttingForce = kcEffective * chipArea;
    intermediates.cutting_force_N = cuttingForce;
    formulas.push("Fc = kc_eff * A_chip");

    // Thrust force (ploughing component significant at micro-scale)
    // Ft/Fc ratio increases with ploughing
    const thrustRatio = 0.3 + 0.7 * ploughingRatio;
    const thrustForce = cuttingForce * thrustRatio;
    intermediates.thrust_force_N = thrustForce;
    formulas.push("Ft = Fc * (0.3 + 0.7 * ploughing_ratio)");

    // Radial force
    const radialRatio = 0.2 + 0.3 * (ae / d);
    const radialForce = cuttingForce * radialRatio;
    intermediates.radial_force_N = radialForce;

    // Specific energy
    const mrr = ae * cut.axial_depth_mm * fzMm * tool.flute_count * (cut.spindle_rpm ?? cut.cutting_speed_m_min * 1000 / (Math.PI * d));
    const specificEnergy = cuttingForce * (cut.cutting_speed_m_min / 60 * 1000) / (mrr * 1e9);
    intermediates.specific_energy_J_mm3 = specificEnergy;

    // Elastic recovery
    const elasticRecovery = avgChipThickness * 1000 * ELASTIC_RECOVERY_FACTOR;
    intermediates.elastic_recovery_um = elasticRecovery;
    formulas.push("h_elastic = h * 0.10 (typical springback)");

    // Confidence based on regime and available data
    let confidence = 0.85;
    if (regime === "ploughing") confidence -= 0.15;
    if (regime === "transition") confidence -= 0.08;
    if (!material.grain_size_um) confidence -= 0.05;
    if (tool.edge_radius_um < 1) {
      confidence -= 0.10;
      warnings.push("Edge radius < 1um may not be accurate - manufacturing tolerance uncertain");
    }

    return {
      effective_kc_N_mm2: Math.round(kcEffective),
      size_effect_factor: Math.round(sizeEffectFactor * 1000) / 1000,
      minimum_chip_thickness_um: Math.round(hMin * 1000 * 100) / 100,
      ploughing_ratio: Math.round(ploughingRatio * 1000) / 1000,
      cutting_force_N: Math.round(cuttingForce * 1000) / 1000,
      thrust_force_N: Math.round(thrustForce * 1000) / 1000,
      radial_force_N: Math.round(radialForce * 1000) / 1000,
      specific_energy_J_mm3: Math.round(specificEnergy * 1000) / 1000,
      elastic_recovery_um: Math.round(elasticRecovery * 100) / 100,
      regime,
      warnings,
      physics_trace: {
        formulas,
        assumptions,
        intermediate_values: intermediates,
        confidence: Math.max(0.5, Math.round(confidence * 100) / 100),
      },
    };
  }

  /**
   * Analyze chip formation mechanics at micro-scale.
   *
   * @param tool - Micro-tool geometry
   * @param cut - Cutting parameters
   * @param material - Material properties
   * @returns Chip formation analysis
   */
  static analyzeChipFormation(
    tool: MicroTool,
    cut: MicroCut,
    material: MicroMaterial,
  ): ChipFormationAnalysis {
    const fzMm = cut.feed_per_tooth_um / 1000;
    const edgeRadiusMm = tool.edge_radius_um / 1000;
    const ae = cut.radial_depth_mm;
    const d = tool.diameter_mm;

    // Uncut chip thickness
    const engagementAngle = Math.acos(1 - 2 * ae / d);
    const unchipThickness = fzMm * Math.sin(engagementAngle / 2) * (2 * ae / d);

    // Shear angle (Merchant's equation modified for size effect)
    const rakeAngle = (tool.rake_angle_deg ?? 10) * Math.PI / 180;
    const frictionAngle = Math.atan(0.5); // typical friction coefficient
    let shearAngle = Math.PI / 4 - frictionAngle / 2 + rakeAngle / 2;

    // Size effect reduces shear angle
    const edgeRatio = unchipThickness / edgeRadiusMm;
    if (edgeRatio < 1) {
      shearAngle *= Math.sqrt(edgeRatio);
    }

    // Chip compression ratio
    const chipCompressionRatio = Math.cos(shearAngle - rakeAngle) / Math.sin(shearAngle);

    // Actual chip thickness
    const actualChipThickness = unchipThickness * chipCompressionRatio;

    // Ploughing force contribution
    const ploughingForceRatio = Math.max(0, 1 - edgeRatio) * 0.6;

    // Grain size ratio
    let grainSizeRatio = 0;
    if (material.grain_size_um) {
      grainSizeRatio = unchipThickness / (material.grain_size_um / 1000);
    }

    // Determine cutting regime
    let cuttingRegime: "continuous" | "segmented" | "ploughing_dominant";
    if (ploughingForceRatio > 0.5) {
      cuttingRegime = "ploughing_dominant";
    } else if (material.hardness_hrc && material.hardness_hrc > 45) {
      cuttingRegime = "segmented";
    } else {
      cuttingRegime = "continuous";
    }

    return {
      uncut_chip_thickness_um: Math.round(unchipThickness * 1000 * 100) / 100,
      actual_chip_thickness_um: Math.round(actualChipThickness * 1000 * 100) / 100,
      chip_compression_ratio: Math.round(chipCompressionRatio * 100) / 100,
      shear_angle_deg: Math.round(shearAngle * 180 / Math.PI * 10) / 10,
      ploughing_force_ratio: Math.round(ploughingForceRatio * 1000) / 1000,
      cutting_regime: cuttingRegime,
      grain_size_ratio: Math.round(grainSizeRatio * 100) / 100,
      edge_radius_ratio: Math.round(edgeRatio * 1000) / 1000,
    };
  }

  /**
   * Generate recommendations for micro-milling parameters.
   *
   * @param tool - Micro-tool geometry
   * @param material - Material properties
   * @param targetRoughness - Target surface roughness in um
   * @returns Process recommendations
   */
  static recommend(
    tool: MicroTool,
    material: MicroMaterial,
    targetRoughness: number = 0.4,
  ): MicroMillingRecommendation {
    const edgeRadiusMm = tool.edge_radius_um / 1000;
    const recommendations: string[] = [];

    // Optimal feed should be 1-3x minimum chip thickness
    const hMin = MIN_CHIP_THICKNESS_FACTOR * edgeRadiusMm * 1000; // um
    const optimalFz = Math.max(hMin * 2, Math.min(hMin * 3, targetRoughness * 2));

    // Recommended spindle speed
    const sfm = this.getRecommendedSFM(material, tool);
    const recommendedRpm = Math.round((sfm * 1000) / (Math.PI * tool.diameter_mm));

    // Expected force at optimal parameters
    const testCut: MicroCut = {
      feed_per_tooth_um: optimalFz,
      axial_depth_mm: tool.diameter_mm * 0.1,
      radial_depth_mm: tool.diameter_mm * 0.5,
      cutting_speed_m_min: sfm,
      spindle_rpm: recommendedRpm,
    };
    const forceResult = this.calculateSizeEffect(tool, testCut, material);

    // Expected roughness (theoretical + size effect)
    const expectedRoughness = optimalFz * 0.3 + edgeRadiusMm * 1000 * 0.1;

    // Tool life factor (smaller tools wear faster)
    const toolLifeFactor = Math.pow(tool.diameter_mm, 0.5);

    // Process stability (smaller tools more susceptible to runout)
    const processStability = Math.min(1, tool.diameter_mm / 0.5);

    // Generate recommendations
    if (optimalFz < hMin * 1.5) {
      recommendations.push("Feed at lower bound - consider larger tool if possible");
    }
    if (recommendedRpm > 60000) {
      recommendations.push("High spindle speed required - verify machine capability");
    }
    if (forceResult.regime === "transition") {
      recommendations.push("Operating in transition regime - monitor for process variability");
    }
    if (processStability < 0.7) {
      recommendations.push("Small tool diameter - ensure excellent spindle runout (<1um)");
    }
    if (tool.coating === "uncoated" && material.iso_group !== "N") {
      recommendations.push("Consider coated tool for non-aluminum materials");
    }

    return {
      optimal_fz_um: Math.round(optimalFz * 100) / 100,
      recommended_rpm: recommendedRpm,
      expected_force_N: forceResult.cutting_force_N,
      expected_roughness_um: Math.round(expectedRoughness * 100) / 100,
      tool_life_factor: Math.round(toolLifeFactor * 100) / 100,
      process_stability: Math.round(processStability * 100) / 100,
      recommendations,
    };
  }

  /**
   * Get recommended surface feet per minute for micro-milling.
   */
  private static getRecommendedSFM(material: MicroMaterial, tool: MicroTool): number {
    const baseMap: Record<string, number> = {
      P: 150, // Steel
      M: 100, // Stainless
      K: 250, // Cast iron
      N: 400, // Aluminum
      S: 50,  // Superalloys
      H: 80,  // Hardened
    };

    let sfm = baseMap[material.iso_group] ?? 100;

    // Coating bonus
    const coatingFactor: Record<string, number> = {
      uncoated: 1.0,
      tin: 1.1,
      tialn: 1.3,
      alcrn: 1.4,
      dlc: 1.5,
      cbn: 1.6,
      pcd: 2.0,
    };
    sfm *= coatingFactor[tool.coating ?? "uncoated"] ?? 1.0;

    return sfm;
  }
}

export const microMillingSizeEffectEngine = MicroMillingSizeEffectEngine;
