/**
 * Z-Level Optimization Engine
 *
 * Optimal depth-of-cut and level transition strategies for pocket/3D milling.
 *
 * Features:
 * - Material-specific optimal step-down
 * - Variable step-down based on tool stiffness and stability
 * - Level transition path planning (ramp, helix, rapid)
 * - Rest machining level calculation
 * - Even/optimized Z-level distribution
 *
 * Sources:
 * - SolidCAM PRISM CAM Algorithms Roadmap Session 2.9
 * - Sandvik Coromant: Depth of Cut Recommendations
 * - Altintas, Y. "Manufacturing Automation" (2012) — stability-limited DOC
 *
 * @module engines/ZLevelOptimizationEngine
 */

import { log } from "../utils/Logger.js";

// ── Material step-down defaults (fraction of tool diameter) ──────
const MATERIAL_STEPDOWN: Record<string, {
  roughing_factor: number;    // ap as fraction of Dc
  finishing_factor: number;
  max_ap_mm: number;          // absolute max
  min_ap_mm: number;          // absolute min
}> = {
  aluminum:       { roughing_factor: 1.0,  finishing_factor: 0.1,  max_ap_mm: 50, min_ap_mm: 0.2 },
  brass:          { roughing_factor: 0.8,  finishing_factor: 0.08, max_ap_mm: 40, min_ap_mm: 0.2 },
  copper:         { roughing_factor: 0.7,  finishing_factor: 0.08, max_ap_mm: 35, min_ap_mm: 0.2 },
  cast_iron:      { roughing_factor: 0.7,  finishing_factor: 0.1,  max_ap_mm: 30, min_ap_mm: 0.3 },
  mild_steel:     { roughing_factor: 0.5,  finishing_factor: 0.05, max_ap_mm: 25, min_ap_mm: 0.3 },
  alloy_steel:    { roughing_factor: 0.4,  finishing_factor: 0.04, max_ap_mm: 20, min_ap_mm: 0.3 },
  stainless:      { roughing_factor: 0.35, finishing_factor: 0.03, max_ap_mm: 15, min_ap_mm: 0.2 },
  titanium:       { roughing_factor: 0.25, finishing_factor: 0.02, max_ap_mm: 10, min_ap_mm: 0.2 },
  inconel:        { roughing_factor: 0.15, finishing_factor: 0.015, max_ap_mm: 8, min_ap_mm: 0.1 },
  hardened_steel: { roughing_factor: 0.1,  finishing_factor: 0.01, max_ap_mm: 5, min_ap_mm: 0.1 },
};

// ── Types ─────────────────────────────────────────────────────────

export interface ZLevelInput {
  total_depth: number;                // mm
  tool_diameter: number;              // mm
  tool_flute_length?: number;         // mm (cutting length)
  material?: string;
  operation?: "roughing" | "finishing" | "semi_finishing";
  stock_to_leave?: number;            // mm (for roughing)
  stability_limited_ap?: number;      // mm (from chatter analysis)
  even_levels?: boolean;              // force even distribution (default true)
}

export interface ZLevelResult {
  z_levels: number[];                 // absolute Z positions (0 = top)
  step_downs: number[];               // ap per level
  optimal_ap: number;                 // recommended step-down
  number_of_levels: number;
  total_depth: number;
  remainder_mm: number;               // last partial step
  strategy: "even" | "variable" | "stability_limited";
  warnings: string[];
}

export interface RestMachiningInput {
  previous_tool_diameter: number;     // mm (larger tool)
  current_tool_diameter: number;      // mm (smaller rest tool)
  total_depth: number;                // mm
  corner_radius_prev?: number;        // mm
  material?: string;
}

export interface RestMachiningResult {
  rest_z_levels: number[];
  rest_step_down: number;
  overlap_depth: number;              // mm of overlap with prev tool
  estimated_volume_pct: number;       // % of volume that is rest material
  warnings: string[];
}

export interface LevelTransitionResult {
  method: "ramp" | "helix" | "rapid_plunge" | "interpolated";
  feed_factor: number;
  path_description: string;
}

// ── Engine ────────────────────────────────────────────────────────

export class ZLevelOptimizationEngine {

  /**
   * Calculate optimal Z-levels for a given depth.
   */
  calculateZLevels(input: ZLevelInput): ZLevelResult {
    const {
      total_depth,
      tool_diameter: Dc,
      tool_flute_length,
      material = "mild_steel",
      operation = "roughing",
      stock_to_leave = 0,
      stability_limited_ap,
      even_levels = true,
    } = input;

    const warnings: string[] = [];
    const matData = MATERIAL_STEPDOWN[material] ?? MATERIAL_STEPDOWN.mild_steel;

    // Calculate nominal ap
    const factor = operation === "finishing" ? matData.finishing_factor
      : operation === "semi_finishing" ? (matData.roughing_factor + matData.finishing_factor) / 2
      : matData.roughing_factor;

    let nominalAp = Dc * factor;
    nominalAp = Math.min(nominalAp, matData.max_ap_mm);
    nominalAp = Math.max(nominalAp, matData.min_ap_mm);

    // Flute length limit
    if (tool_flute_length != null && nominalAp > tool_flute_length * 0.95) {
      nominalAp = tool_flute_length * 0.95;
      warnings.push(`Step-down limited by flute length (${tool_flute_length}mm)`);
    }

    // Stability limit
    let strategy: ZLevelResult["strategy"] = "even";
    if (stability_limited_ap != null && stability_limited_ap < nominalAp) {
      nominalAp = stability_limited_ap;
      strategy = "stability_limited";
      warnings.push(`Step-down limited by stability to ${stability_limited_ap.toFixed(2)}mm`);
    }

    const effectiveDepth = total_depth - stock_to_leave;
    if (effectiveDepth <= 0) {
      return {
        z_levels: [0],
        step_downs: [],
        optimal_ap: nominalAp,
        number_of_levels: 1,
        total_depth,
        remainder_mm: 0,
        strategy,
        warnings: ["Stock to leave >= total depth — no cutting required"],
      };
    }

    // Calculate number of levels
    const rawLevels = effectiveDepth / nominalAp;
    const numLevels = even_levels ? Math.ceil(rawLevels) : Math.ceil(rawLevels);

    // Even distribution: adjust ap so all levels are equal
    const actualAp = even_levels ? effectiveDepth / numLevels : nominalAp;
    const remainder = even_levels ? 0 : effectiveDepth - Math.floor(rawLevels) * nominalAp;

    // Generate Z levels
    const zLevels: number[] = [0];
    const stepDowns: number[] = [];

    if (even_levels) {
      for (let i = 1; i <= numLevels; i++) {
        zLevels.push(Math.round(-actualAp * i * 1000) / 1000);
        stepDowns.push(Math.round(actualAp * 1000) / 1000);
      }
    } else {
      let currentZ = 0;
      for (let i = 0; i < Math.floor(rawLevels); i++) {
        currentZ -= nominalAp;
        zLevels.push(Math.round(currentZ * 1000) / 1000);
        stepDowns.push(Math.round(nominalAp * 1000) / 1000);
      }
      if (remainder > matData.min_ap_mm) {
        currentZ -= remainder;
        zLevels.push(Math.round(currentZ * 1000) / 1000);
        stepDowns.push(Math.round(remainder * 1000) / 1000);
        strategy = "variable";
      }
    }

    // Stickout warning
    if (total_depth > Dc * 4) {
      warnings.push(`Deep pocket (${total_depth}mm = ${(total_depth / Dc).toFixed(1)}×Dc) — check tool stiffness and holder clearance`);
    }

    log.debug(`[ZLevel] depth=${total_depth}, Dc=${Dc}, ap=${actualAp.toFixed(2)}, levels=${numLevels}, strategy=${strategy}`);

    return {
      z_levels: zLevels,
      step_downs: stepDowns,
      optimal_ap: Math.round(actualAp * 1000) / 1000,
      number_of_levels: numLevels,
      total_depth,
      remainder_mm: Math.round(remainder * 1000) / 1000,
      strategy,
      warnings,
    };
  }

  /**
   * Calculate Z-levels for rest machining with a smaller tool.
   */
  restMachiningLevels(input: RestMachiningInput): RestMachiningResult {
    const {
      previous_tool_diameter: prevDc,
      current_tool_diameter: currDc,
      total_depth,
      corner_radius_prev = 0,
      material = "mild_steel",
    } = input;

    const warnings: string[] = [];

    if (currDc >= prevDc) {
      warnings.push("Rest tool >= previous tool — no rest material in radial direction");
    }

    // Rest material exists where the previous tool couldn't reach
    // Overlap depth: machine slightly beyond previous Z-levels
    const overlapDepth = Math.max(0.5, currDc * 0.1);

    // Step-down for rest tool
    const matData = MATERIAL_STEPDOWN[material] ?? MATERIAL_STEPDOWN.mild_steel;
    const restAp = Math.min(
      currDc * matData.roughing_factor,
      matData.max_ap_mm,
    );

    const effectiveDepth = total_depth + overlapDepth;
    const numLevels = Math.ceil(effectiveDepth / restAp);

    const restZLevels: number[] = [];
    for (let i = 1; i <= numLevels; i++) {
      const z = -(restAp * i);
      if (z < -(total_depth + overlapDepth)) break;
      restZLevels.push(Math.round(z * 1000) / 1000);
    }

    // Estimated volume percentage (rough approximation)
    const prevR = prevDc / 2;
    const currR = currDc / 2;
    const radiusDiff = prevR - currR;
    const volumePct = radiusDiff > 0 ? Math.min((radiusDiff / prevR) * 100, 50) : 0;

    return {
      rest_z_levels: restZLevels,
      rest_step_down: Math.round(restAp * 1000) / 1000,
      overlap_depth: Math.round(overlapDepth * 1000) / 1000,
      estimated_volume_pct: Math.round(volumePct * 10) / 10,
      warnings,
    };
  }

  /**
   * Determine optimal transition method between Z-levels.
   */
  levelTransition(
    currentZ: number,
    nextZ: number,
    toolDiameter: number,
    availableWidth: number,
    material: string = "mild_steel",
  ): LevelTransitionResult {
    const zDrop = Math.abs(nextZ - currentZ);
    const matDefaults = MATERIAL_STEPDOWN[material] ?? MATERIAL_STEPDOWN.mild_steel;

    // If pocket is wide enough, helix down
    if (availableWidth >= toolDiameter * 0.8) {
      return {
        method: "helix",
        feed_factor: 0.6,
        path_description: `Helical interpolation from Z${currentZ} to Z${nextZ}, dia=${(toolDiameter * 0.7).toFixed(1)}mm`,
      };
    }

    // If there's room for a ramp
    if (availableWidth >= toolDiameter * 1.5) {
      return {
        method: "ramp",
        feed_factor: 0.5,
        path_description: `Linear ramp from Z${currentZ} to Z${nextZ}, length=${availableWidth.toFixed(1)}mm`,
      };
    }

    // Tight space — interpolated bore
    if (zDrop <= toolDiameter * 0.5) {
      return {
        method: "interpolated",
        feed_factor: 0.3,
        path_description: `Interpolated plunge from Z${currentZ} to Z${nextZ}`,
      };
    }

    // Last resort — rapid to clearance then re-enter
    return {
      method: "rapid_plunge",
      feed_factor: 0.3,
      path_description: `Rapid retract + re-enter at Z${nextZ}`,
    };
  }

  /**
   * Get material step-down defaults.
   */
  getMaterialDefaults(material: string): typeof MATERIAL_STEPDOWN[string] | null {
    return MATERIAL_STEPDOWN[material] ?? null;
  }

  /**
   * List supported materials.
   */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_STEPDOWN);
  }
}

export const zLevelOptimizationEngine = new ZLevelOptimizationEngine();
