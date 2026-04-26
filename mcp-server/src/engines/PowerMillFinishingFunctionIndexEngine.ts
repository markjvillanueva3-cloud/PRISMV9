/**
 * PowerMillFinishingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM44
 *
 * PowerMill 2024 Finishing Strategies catalog: 12 operations across 4 categories.
 *   surface_driven  : raster_finishing, offset_3d_finishing, steep_shallow_finishing, surface_finishing
 *   boundary_driven : constant_z_finishing
 *   corner_focused  : pencil_finishing, corner_finishing, along_corner_finishing
 *   specialized     : pattern_finishing, flowline_finishing, swarf_finishing, between_surfaces_finishing
 *
 * Helpers (real classification/selection logic):
 *   - recommendByFeature(intent) → routing to best finishing strategy
 *   - scalllopHeightCalc(stepover_mm, ball_dia_mm) → theoretical scallop height
 *   - steepShallowThresholdCheck(angle_deg) → which sub-strategy applies
 *   - pencilCoverageEstimate(ref_tool_dia, pencil_dia, corner_radius) → coverage %
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;
function loadCatalog(): any {
  if (_catalog) return _catalog;
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/powermill/finishing.json"),
    path.resolve(__dirname, "../data/cam-functions/powermill/finishing.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("PowerMillFinishingFunctionIndexEngine: finishing.json not found");
}

export type PMFinishingIntent =
  | "general_surface_finish"
  | "steep_walls_waterline"
  | "shallow_flats_raster"
  | "mixed_steep_shallow"
  | "internal_corners_pencil"
  | "fillet_cleanup"
  | "turbine_blade_flowline"
  | "ruled_wall_swarf"
  | "blade_channel_morph"
  | "decorative_pattern"
  | "edge_trace";

export interface PMFinishingRecommendation {
  operation_id: string;
  display_name: string;
  reason: string;
  scallop_note?: string;
  alternatives: string[];
}

export interface PMScallopResult {
  stepover_mm: number;
  ball_diameter_mm: number;
  scallop_height_mm: number;
  formula: string;
  surface_finish_ra_estimate_um: number;
}

export interface PMSteepShallowZone {
  angle_deg: number;
  zone: "steep" | "shallow" | "transition";
  recommended_strategy: string;
  threshold_used_deg: number;
}

export interface PMPencilCoverage {
  reference_tool_dia_mm: number;
  pencil_tool_dia_mm: number;
  corner_radius_mm: number;
  coverage_pct: number;
  effective: boolean;
  recommendation: string;
}

export class PowerMillFinishingFunctionIndexEngine {
  /**
   * Get the full finishing catalog
   */
  static getCatalog(): any {
    return loadCatalog();
  }

  /**
   * List all operation IDs
   */
  static listOperations(): string[] {
    const c = loadCatalog();
    return Object.keys(c.operations);
  }

  /**
   * Get a specific operation's full definition
   */
  static getOperation(operation_id: string): any | null {
    const c = loadCatalog();
    return c.operations[operation_id] ?? null;
  }

  /**
   * List operations by category
   */
  static listByCategory(category: string): string[] {
    const c = loadCatalog();
    return Object.entries(c.operations)
      .filter(([_, op]: [string, any]) => op.category === category)
      .map(([id]) => id);
  }

  /**
   * Get all categories
   */
  static getCategories(): string[] {
    const c = loadCatalog();
    return c.categories ?? [];
  }

  /**
   * Recommend finishing strategy based on intent
   */
  static recommendByFeature(intent: PMFinishingIntent): PMFinishingRecommendation {
    const rules: Record<PMFinishingIntent, { op: string; reason: string; alts: string[] }> = {
      general_surface_finish: {
        op: "raster_finishing",
        reason: "Raster finishing is the workhorse 3D finish — predictable scallop, easy to control.",
        alts: ["offset_3d_finishing", "steep_shallow_finishing"],
      },
      steep_walls_waterline: {
        op: "constant_z_finishing",
        reason: "Constant-Z waterline optimal for steep walls (>45°) — scallop = stepdown.",
        alts: ["steep_shallow_finishing"],
      },
      shallow_flats_raster: {
        op: "raster_finishing",
        reason: "Raster or 3D offset best for shallow surfaces (<45°) — cusp height controlled by stepover.",
        alts: ["offset_3d_finishing"],
      },
      mixed_steep_shallow: {
        op: "steep_shallow_finishing",
        reason: "Steep-and-Shallow handles mixed geometry in one operation — no manual region splitting.",
        alts: ["constant_z_finishing", "raster_finishing"],
      },
      internal_corners_pencil: {
        op: "pencil_finishing",
        reason: "Pencil traces concave corners that larger tools missed — rest machining for fillets.",
        alts: ["corner_finishing"],
      },
      fillet_cleanup: {
        op: "corner_finishing",
        reason: "Corner finishing handles larger fillet regions with multi-pass stepdown.",
        alts: ["pencil_finishing"],
      },
      turbine_blade_flowline: {
        op: "flowline_finishing",
        reason: "Flowline follows surface iso-curves — ideal for turbine blades, impellers.",
        alts: ["surface_finishing", "between_surfaces_finishing"],
      },
      ruled_wall_swarf: {
        op: "swarf_finishing",
        reason: "Swarf (flank) milling uses side of cutter on ruled walls — 5-axis required.",
        alts: ["constant_z_finishing"],
      },
      blade_channel_morph: {
        op: "between_surfaces_finishing",
        reason: "Between-surfaces morphs toolpath across two drive surfaces — blade channels, tapers.",
        alts: ["flowline_finishing"],
      },
      decorative_pattern: {
        op: "pattern_finishing",
        reason: "Pattern finishing projects custom curves onto surface — logos, textures.",
        alts: ["raster_finishing"],
      },
      edge_trace: {
        op: "along_corner_finishing",
        reason: "Along-corner traces the intersection line of two surfaces — single-pass edge cleanup.",
        alts: ["pencil_finishing"],
      },
    };

    const rule = rules[intent];
    if (!rule) {
      return {
        operation_id: "raster_finishing",
        display_name: "Raster Finishing",
        reason: `Unknown intent '${intent}' — defaulting to raster finishing.`,
        alternatives: ["offset_3d_finishing", "steep_shallow_finishing"],
      };
    }

    const op = this.getOperation(rule.op);
    return {
      operation_id: rule.op,
      display_name: op?.display_name ?? rule.op,
      reason: rule.reason,
      alternatives: rule.alts,
    };
  }

  /**
   * Calculate theoretical scallop height for ball-nose finishing
   * Formula: h = R - sqrt(R² - (s/2)²) where R = ball radius, s = stepover
   * Simplified for small stepover: h ≈ s²/(8R)
   */
  static scallopHeightCalc(stepover_mm: number, ball_diameter_mm: number): PMScallopResult {
    if (stepover_mm <= 0 || ball_diameter_mm <= 0) {
      return {
        stepover_mm,
        ball_diameter_mm,
        scallop_height_mm: 0,
        formula: "invalid input",
        surface_finish_ra_estimate_um: 0,
      };
    }

    const R = ball_diameter_mm / 2;
    const s = stepover_mm;

    // Exact formula: h = R - sqrt(R² - (s/2)²)
    const halfS = s / 2;
    if (halfS >= R) {
      // Stepover too large — scallop is entire radius
      return {
        stepover_mm,
        ball_diameter_mm,
        scallop_height_mm: R,
        formula: "h = R (stepover exceeds ball radius)",
        surface_finish_ra_estimate_um: R * 1000,
      };
    }

    const h = R - Math.sqrt(R * R - halfS * halfS);
    // Ra estimate: roughly 0.25 * scallop height for typical finishing
    const ra_um = h * 1000 * 0.25;

    return {
      stepover_mm,
      ball_diameter_mm,
      scallop_height_mm: Math.round(h * 10000) / 10000,
      formula: "h = R - √(R² - (s/2)²)",
      surface_finish_ra_estimate_um: Math.round(ra_um * 100) / 100,
    };
  }

  /**
   * Determine steep/shallow zone based on surface angle
   * Default threshold: 45° (configurable)
   */
  static steepShallowThresholdCheck(
    angle_deg: number,
    threshold_deg = 45,
  ): PMSteepShallowZone {
    const transition_band = 5; // ±5° around threshold is "transition"

    if (angle_deg >= threshold_deg + transition_band) {
      return {
        angle_deg,
        zone: "steep",
        recommended_strategy: "constant_z_finishing",
        threshold_used_deg: threshold_deg,
      };
    } else if (angle_deg <= threshold_deg - transition_band) {
      return {
        angle_deg,
        zone: "shallow",
        recommended_strategy: "raster_finishing",
        threshold_used_deg: threshold_deg,
      };
    } else {
      return {
        angle_deg,
        zone: "transition",
        recommended_strategy: "steep_shallow_finishing",
        threshold_used_deg: threshold_deg,
      };
    }
  }

  /**
   * Estimate pencil finishing coverage effectiveness
   * Rule: pencil effective when pencil_dia < 0.5 * corner_radius AND pencil_dia < ref_tool_dia
   */
  static pencilCoverageEstimate(
    reference_tool_dia_mm: number,
    pencil_tool_dia_mm: number,
    corner_radius_mm: number,
  ): PMPencilCoverage {
    if (pencil_tool_dia_mm <= 0 || reference_tool_dia_mm <= 0 || corner_radius_mm <= 0) {
      return {
        reference_tool_dia_mm,
        pencil_tool_dia_mm,
        corner_radius_mm,
        coverage_pct: 0,
        effective: false,
        recommendation: "Invalid input — all values must be positive.",
      };
    }

    // Pencil must be smaller than reference tool
    const ratio_to_ref = pencil_tool_dia_mm / reference_tool_dia_mm;
    // Pencil should fit in the corner left by reference tool
    const fits_corner = pencil_tool_dia_mm < corner_radius_mm;
    // Ideal: pencil is ≤ 50% of corner radius for good coverage
    const ratio_to_corner = pencil_tool_dia_mm / corner_radius_mm;

    // Coverage estimate: if pencil fits, coverage ≈ (1 - ratio_to_corner) * 100
    const coverage_pct = fits_corner
      ? Math.min(100, Math.round((1 - ratio_to_corner) * 100))
      : 0;

    const effective = fits_corner && ratio_to_ref < 0.8;

    let recommendation: string;
    if (!fits_corner) {
      recommendation = `Pencil tool (Ø${pencil_tool_dia_mm}mm) too large for corner (R${corner_radius_mm}mm). Use smaller tool.`;
    } else if (ratio_to_ref >= 0.8) {
      recommendation = `Pencil tool nearly same size as reference (${Math.round(ratio_to_ref * 100)}%). Minimal material removal. Consider smaller pencil.`;
    } else if (coverage_pct > 70) {
      recommendation = `Excellent pencil coverage (${coverage_pct}%). Tool will clean most residual.`;
    } else if (coverage_pct > 40) {
      recommendation = `Good pencil coverage (${coverage_pct}%). May need additional pass with smaller tool.`;
    } else {
      recommendation = `Limited pencil coverage (${coverage_pct}%). Consider intermediate tool size.`;
    }

    return {
      reference_tool_dia_mm,
      pencil_tool_dia_mm,
      corner_radius_mm,
      coverage_pct,
      effective,
      recommendation,
    };
  }

  /**
   * Validate consistency of the catalog
   */
  static validateConsistency(): {
    is_consistent: boolean;
    expected_operations: number;
    actual_operations: number;
    expected_parameters: number;
    actual_parameters: number;
    issues: string[];
  } {
    const c = loadCatalog();
    const ops = Object.keys(c.operations);
    const actualOps = ops.length;
    const actualParams = ops.reduce((sum, op) => sum + (c.operations[op].parameter_count ?? 0), 0);

    const issues: string[] = [];
    if (actualOps !== c.total_operations) {
      issues.push(`Operation count mismatch: expected ${c.total_operations}, found ${actualOps}`);
    }
    if (actualParams !== c.total_parameters) {
      issues.push(`Parameter count mismatch: expected ${c.total_parameters}, found ${actualParams}`);
    }

    // Check each operation has required fields
    for (const [opId, op] of Object.entries(c.operations) as [string, any][]) {
      if (!op.category) issues.push(`${opId}: missing category`);
      if (!op.display_name) issues.push(`${opId}: missing display_name`);
      if (!op.parameters) issues.push(`${opId}: missing parameters`);
    }

    return {
      is_consistent: issues.length === 0,
      expected_operations: c.total_operations,
      actual_operations: actualOps,
      expected_parameters: c.total_parameters,
      actual_parameters: actualParams,
      issues,
    };
  }
}

export const powerMillFinishingFunctionIndexEngine = PowerMillFinishingFunctionIndexEngine;
