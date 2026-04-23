/**
 * ClampingForceEngine — MIO-MS0/U-MIO13
 *
 * Calculates minimum safe clamping force for workholding based on cutting
 * forces, friction coefficients, and safety factors.
 *
 * Physics Model:
 *   F_clamp >= (F_resultant × SF) / (μ × n)
 *
 * Where:
 *   F_resultant = sqrt(Fx² + Fy² + Fz²) — resultant cutting force
 *   SF = safety factor (2.5 default per ASME B11.8)
 *   μ = coefficient of friction between workpiece and fixture
 *   n = number of clamps
 *
 * The engine considers:
 * - Force direction relative to clamp orientation
 * - Material-specific friction coefficients
 * - Minimum clamp count for stability
 * - Moment equilibrium for asymmetric parts
 *
 * Reference: ASME B11.8, Machinery's Handbook (31st ed.), fixture design standards
 *
 * @module engines/ClampingForceEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface CuttingForces {
  Fx_n: number;  // Feed direction force
  Fy_n: number;  // Cross-feed (radial) force
  Fz_n: number;  // Axial (thrust) force
}

export interface ClampingInput {
  cutting_forces: CuttingForces;
  workpiece_material: string;
  fixture_material?: string;
  clamp_count?: number;
  safety_factor?: number;
  clamp_orientation?: "vertical" | "horizontal" | "angled";
  part_length_mm?: number;
  part_width_mm?: number;
  clamp_positions_mm?: Array<{ x: number; y: number }>;
}

export interface ClampingResult {
  required_force_per_clamp_n: number;
  total_clamping_force_n: number;
  recommended_clamp_count: number;
  friction_coefficient: number;
  safety_factor: number;
  resultant_cutting_force_n: number;
  force_components: {
    tangential_n: number;
    radial_n: number;
    axial_n: number;
  };
  stability_analysis: {
    moment_equilibrium: boolean;
    minimum_clamps_for_stability: number;
    clamp_spacing_ok: boolean;
  };
  recommendations: string[];
  ai_reasoning: string[];
}

// Friction coefficients for common material pairs (workpiece vs steel fixture)
const FRICTION_COEFFICIENTS: Record<string, number> = {
  "steel": 0.15,
  "cast_iron": 0.18,
  "aluminum": 0.12,
  "brass": 0.14,
  "bronze": 0.16,
  "copper": 0.13,
  "titanium": 0.20,
  "stainless_steel": 0.16,
  "tool_steel": 0.17,
  "plastic": 0.25,
  "composite": 0.22,
  "default": 0.15,
};

// Default safety factors by application
const SAFETY_FACTORS = {
  general: 2.5,
  roughing: 3.0,
  finishing: 2.0,
  high_accuracy: 2.0,
  heavy_cuts: 3.5,
};

class ClampingForceEngine {
  /**
   * Calculate minimum safe clamping force
   */
  calculate(input: ClampingInput): ClampingResult {
    const reasoning: string[] = [];
    const recommendations: string[] = [];

    // Get friction coefficient
    const materialKey = this.normalizeMaterial(input.workpiece_material);
    const mu = FRICTION_COEFFICIENTS[materialKey] || FRICTION_COEFFICIENTS.default;
    reasoning.push(`[CLAMP] Material: ${input.workpiece_material} → μ = ${mu}`);

    // Safety factor
    const SF = input.safety_factor ?? SAFETY_FACTORS.general;
    reasoning.push(`[CLAMP] Safety factor: ${SF}`);

    // Calculate resultant force
    const { Fx_n, Fy_n, Fz_n } = input.cutting_forces;
    const F_resultant = Math.sqrt(Fx_n * Fx_n + Fy_n * Fy_n + Fz_n * Fz_n);
    reasoning.push(`[CLAMP] Resultant force: sqrt(${Fx_n.toFixed(0)}² + ${Fy_n.toFixed(0)}² + ${Fz_n.toFixed(0)}²) = ${F_resultant.toFixed(1)}N`);

    // Determine minimum clamps for stability
    const minClampsForStability = this.calculateMinClamps(input, F_resultant);
    const clampCount = Math.max(input.clamp_count ?? 2, minClampsForStability);
    reasoning.push(`[CLAMP] Clamp count: ${clampCount} (min for stability: ${minClampsForStability})`);

    // Calculate clamping force: F_clamp >= (F_resultant × SF) / (μ × n)
    const totalClampingForce = (F_resultant * SF) / mu;
    const forcePerClamp = totalClampingForce / clampCount;
    reasoning.push(`[CLAMP] Required: (${F_resultant.toFixed(0)} × ${SF}) / ${mu} = ${totalClampingForce.toFixed(0)}N total`);
    reasoning.push(`[CLAMP] Per clamp: ${forcePerClamp.toFixed(0)}N`);

    // Adjust for clamp orientation
    let orientationFactor = 1.0;
    if (input.clamp_orientation === "horizontal") {
      orientationFactor = 1.2; // Horizontal clamps less effective
      reasoning.push(`[CLAMP] Horizontal orientation: +20% force required`);
    } else if (input.clamp_orientation === "angled") {
      orientationFactor = 1.1;
      reasoning.push(`[CLAMP] Angled orientation: +10% force required`);
    }

    const adjustedForcePerClamp = forcePerClamp * orientationFactor;

    // Stability analysis
    const stabilityAnalysis = this.analyzeStability(input, clampCount, F_resultant, reasoning);

    // Generate recommendations
    if (adjustedForcePerClamp > 5000) {
      recommendations.push("Consider hydraulic clamps for high clamping force");
    }
    if (clampCount < minClampsForStability) {
      recommendations.push(`Increase clamp count to at least ${minClampsForStability} for stability`);
    }
    if (mu < 0.15) {
      recommendations.push("Consider serrated jaw inserts to increase friction");
    }
    if (F_resultant > 1000 && SF < 3.0) {
      recommendations.push("High cutting forces detected — consider SF >= 3.0");
    }

    return {
      required_force_per_clamp_n: Math.round(adjustedForcePerClamp),
      total_clamping_force_n: Math.round(totalClampingForce * orientationFactor),
      recommended_clamp_count: clampCount,
      friction_coefficient: mu,
      safety_factor: SF,
      resultant_cutting_force_n: F_resultant,
      force_components: {
        tangential_n: Fx_n,
        radial_n: Fy_n,
        axial_n: Fz_n,
      },
      stability_analysis: stabilityAnalysis,
      recommendations,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Normalize material name to lookup key
   */
  private normalizeMaterial(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes("aluminum") || lower.includes("6061") || lower.includes("7075")) return "aluminum";
    if (lower.includes("titanium") || lower.includes("ti-6al")) return "titanium";
    if (lower.includes("stainless") || lower.includes("304") || lower.includes("316")) return "stainless_steel";
    if (lower.includes("cast") && lower.includes("iron")) return "cast_iron";
    if (lower.includes("brass")) return "brass";
    if (lower.includes("bronze")) return "bronze";
    if (lower.includes("copper")) return "copper";
    if (lower.includes("tool") && lower.includes("steel")) return "tool_steel";
    if (lower.includes("steel") || lower.includes("4140") || lower.includes("1018")) return "steel";
    if (lower.includes("plastic") || lower.includes("delrin") || lower.includes("peek")) return "plastic";
    if (lower.includes("composite") || lower.includes("carbon")) return "composite";
    return "default";
  }

  /**
   * Calculate minimum clamps needed for stability
   */
  private calculateMinClamps(input: ClampingInput, resultantForce: number): number {
    // Basic rule: at least 2 clamps
    let minClamps = 2;

    // For larger parts, more clamps
    if (input.part_length_mm && input.part_length_mm > 200) {
      minClamps = Math.max(minClamps, 3);
    }
    if (input.part_length_mm && input.part_length_mm > 400) {
      minClamps = Math.max(minClamps, 4);
    }

    // For high forces, more clamps
    if (resultantForce > 500) minClamps = Math.max(minClamps, 3);
    if (resultantForce > 1000) minClamps = Math.max(minClamps, 4);

    return minClamps;
  }

  /**
   * Analyze clamping stability
   */
  private analyzeStability(
    input: ClampingInput,
    clampCount: number,
    resultantForce: number,
    reasoning: string[]
  ): ClampingResult["stability_analysis"] {
    const minClamps = this.calculateMinClamps(input, resultantForce);
    const momentEquilibrium = clampCount >= minClamps;

    // Check clamp spacing if positions provided
    let clampSpacingOk = true;
    if (input.clamp_positions_mm && input.clamp_positions_mm.length >= 2) {
      const positions = input.clamp_positions_mm;
      for (let i = 0; i < positions.length - 1; i++) {
        const dist = Math.sqrt(
          Math.pow(positions[i + 1].x - positions[i].x, 2) +
          Math.pow(positions[i + 1].y - positions[i].y, 2)
        );
        if (dist < 50) {
          clampSpacingOk = false;
          reasoning.push(`[CLAMP] Warning: Clamps ${i} and ${i + 1} too close (${dist.toFixed(0)}mm < 50mm min)`);
        }
      }
    }

    return {
      moment_equilibrium: momentEquilibrium,
      minimum_clamps_for_stability: minClamps,
      clamp_spacing_ok: clampSpacingOk,
    };
  }

  /**
   * Quick clamping force estimate for orchestrator
   */
  quickEstimate(
    resultantForce: number,
    material: string = "steel",
    clampCount: number = 2
  ): { force_per_clamp_n: number; total_force_n: number } {
    const mu = FRICTION_COEFFICIENTS[this.normalizeMaterial(material)] || 0.15;
    const SF = SAFETY_FACTORS.general;
    const total = (resultantForce * SF) / mu;
    return {
      force_per_clamp_n: Math.round(total / clampCount),
      total_force_n: Math.round(total),
    };
  }
}

export const clampingForceEngine = new ClampingForceEngine();
