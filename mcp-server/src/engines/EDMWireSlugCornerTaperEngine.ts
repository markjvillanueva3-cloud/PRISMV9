/**
 * EDMWireSlugCornerTaperEngine — Corner Classification & Slug Drop Prediction
 *
 * Analyzes internal corners in WEDM profiles to:
 *   1. Classify corner type (sharp, filleted, chamfered)
 *   2. Predict slug drop behavior (clean_drop, stick, wedge, retained)
 *   3. Compute corner relief angles to prevent wire breakage
 *   4. Recommend corner strategies (lead-in/out, dwell, rounding)
 *
 * Physics Model — Wire Bow at Corners
 * ------------------------------------
 * At internal corners, the wire must change direction while maintaining tension.
 * The wire bows due to:
 *   - Side forces from spark erosion
 *   - Wire tension gradient
 *   - Corner entry angle
 *
 * Corner bow radius: R_bow ≈ (T × L) / (2 × F_side)
 *   where T = wire tension [N], L = span [mm], F_side = lateral spark force [N]
 *
 * Minimum corner radius: R_min = wire_dia/2 + spark_gap + bow_margin
 *
 * Slug Drop Classification
 * ------------------------
 * Slug behavior depends on:
 *   - Aspect ratio (perimeter / area)
 *   - Minimum internal corner angle
 *   - Presence of undercuts or hooks
 *   - Slug weight vs. retention force
 *
 * MS-P3-TIER6A/U-P3-T6A-01
 *
 * @see WEDMSlugTabRetentionEngine — computes tab safety factors
 * @see WEDMTier6GeomGateEngine — validates Tier 6 geometry constraints
 */

import { WEDM_TAPER_SPEC } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type CornerType = "sharp" | "fillet" | "chamfer" | "tangent";
export type SlugDropClass = "clean_drop" | "stick" | "wedge" | "retained" | "uncertain";
export type CornerStrategy = "standard" | "dwell" | "lead_out" | "corner_round" | "taper_relief";

export interface CornerPoint {
  /** Corner X coordinate [mm] */
  x: number;
  /** Corner Y coordinate [mm] */
  y: number;
  /** Internal angle at corner [degrees]. 90° = right angle, <90° = acute */
  angle_deg: number;
  /** Corner radius if filleted [mm]. 0 for sharp. */
  radius_mm: number;
  /** Whether this is an internal (concave) or external (convex) corner */
  is_internal: boolean;
}

export interface SlugGeometry {
  /** Planform area [mm²] */
  area_mm2: number;
  /** Perimeter length [mm] */
  perimeter_mm: number;
  /** Minimum internal corner angle [degrees] */
  min_internal_angle_deg: number;
  /** Maximum internal corner angle [degrees] */
  max_internal_angle_deg: number;
  /** Number of internal corners */
  internal_corner_count: number;
  /** Whether slug has any hook/undercut features */
  has_undercut: boolean;
  /** List of corner points */
  corners: CornerPoint[];
}

export interface CornerTaperInput {
  /** Wire diameter [mm]. Default 0.25. */
  wire_diameter_mm?: number;
  /** One-sided spark gap [mm]. Default 0.025. */
  spark_gap_mm?: number;
  /** Wire tension [N]. Default 12. */
  wire_tension_N?: number;
  /** Part thickness [mm]. Required for slug weight calculation. */
  thickness_mm: number;
  /** Material density [kg/m³]. Default 7850 (steel). */
  material_density_kg_m3?: number;
  /** Slug geometry to analyze. */
  slug: SlugGeometry;
  /** Number of planned retention tabs. Default 0. */
  tab_count?: number;
  /** Tab width [mm]. Default 0.3. */
  tab_width_mm?: number;
}

export interface CornerAnalysis {
  corner_index: number;
  corner: CornerPoint;
  corner_type: CornerType;
  min_radius_mm: number;
  actual_radius_mm: number;
  radius_adequate: boolean;
  recommended_strategy: CornerStrategy;
  wire_bow_mm: number;
  taper_relief_deg: number;
  warnings: string[];
}

export interface SlugDropPrediction {
  slug_class: SlugDropClass;
  confidence: number;
  aspect_ratio: number;
  compactness: number;
  hook_risk: boolean;
  estimated_weight_N: number;
  drop_probability: number;
  recommendations: string[];
}

export interface CornerTaperResult {
  success: boolean;
  corners: CornerAnalysis[];
  slug_prediction: SlugDropPrediction;
  all_corners_adequate: boolean;
  min_corner_radius_mm: number;
  required_min_radius_mm: number;
  total_warnings: string[];
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WIRE_DIA_MM = 0.25;
const DEFAULT_SPARK_GAP_MM = 0.025;
const DEFAULT_WIRE_TENSION_N = 12;
const DEFAULT_MATERIAL_DENSITY = 7850;
const GRAVITY_M_S2 = 9.81;

const CORNER_BOW_FACTOR = WEDM_TAPER_SPEC.wire_bow_per_deg_taper_um / 1000;

const SLUG_DROP_THRESHOLDS = {
  compact_aspect_ratio: 1.5,
  elongated_aspect_ratio: 4.0,
  acute_angle_deg: 60,
  hook_angle_deg: 30,
  min_drop_weight_N: 0.01,
  max_stick_weight_N: 0.5,
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class EDMWireSlugCornerTaperEngine {
  readonly name = "EDMWireSlugCornerTaperEngine";
  readonly version = "1.0.0";

  /**
   * Analyze corners and predict slug drop behavior.
   *
   * @param input corner and slug geometry parameters
   * @returns analysis with corner strategies and slug prediction
   */
  analyze(input: CornerTaperInput): CornerTaperResult {
    if (!this.validateInput(input)) {
      return this.buildInvalidResult("Invalid input parameters");
    }

    const {
      wire_diameter_mm = DEFAULT_WIRE_DIA_MM,
      spark_gap_mm = DEFAULT_SPARK_GAP_MM,
      wire_tension_N = DEFAULT_WIRE_TENSION_N,
      thickness_mm,
      material_density_kg_m3 = DEFAULT_MATERIAL_DENSITY,
      slug,
      tab_count = 0,
      tab_width_mm = 0.3,
    } = input;

    const requiredMinRadius = this.computeMinRadius(wire_diameter_mm, spark_gap_mm);
    const corners = this.analyzeCorners(slug.corners, wire_diameter_mm, spark_gap_mm, wire_tension_N);
    const slugPrediction = this.predictSlugDrop(
      slug,
      thickness_mm,
      material_density_kg_m3,
      tab_count,
      tab_width_mm
    );

    const allAdequate = corners.every(c => c.radius_adequate);
    const minActualRadius = Math.min(...corners.map(c => c.actual_radius_mm));
    const totalWarnings = corners.flatMap(c => c.warnings);

    if (!allAdequate) {
      totalWarnings.push(
        `${corners.filter(c => !c.radius_adequate).length} corner(s) below minimum radius ${requiredMinRadius.toFixed(3)}mm`
      );
    }

    if (slugPrediction.slug_class === "stick" || slugPrediction.slug_class === "wedge") {
      totalWarnings.push(`Slug predicted to ${slugPrediction.slug_class} — add retention tabs or corner relief`);
    }

    return {
      success: true,
      corners,
      slug_prediction: slugPrediction,
      all_corners_adequate: allAdequate,
      min_corner_radius_mm: minActualRadius,
      required_min_radius_mm: requiredMinRadius,
      total_warnings: totalWarnings,
      summary: this.buildSummary(corners, slugPrediction, allAdequate),
    };
  }

  /**
   * Compute minimum corner radius for wire clearance.
   * R_min = wire_dia/2 + spark_gap + margin
   */
  computeMinRadius(wire_dia_mm: number, spark_gap_mm: number): number {
    const margin = 0.02;
    return wire_dia_mm / 2 + spark_gap_mm + margin;
  }

  /**
   * Classify corner type from geometry.
   */
  classifyCorner(corner: CornerPoint): CornerType {
    if (corner.radius_mm > 0.01) {
      return "fillet";
    }
    if (corner.angle_deg > 170) {
      return "tangent";
    }
    return "sharp";
  }

  /**
   * Recommend strategy for a corner.
   */
  recommendStrategy(corner: CornerPoint, radiusAdequate: boolean, isInternal: boolean): CornerStrategy {
    if (!isInternal) return "standard";

    if (!radiusAdequate) {
      if (corner.angle_deg < 60) return "taper_relief";
      return "corner_round";
    }

    if (corner.angle_deg < 45) return "dwell";
    if (corner.angle_deg < 90) return "lead_out";
    return "standard";
  }

  /**
   * Compute wire bow at a corner.
   */
  computeWireBow(angle_deg: number, wire_tension_N: number, spark_gap_mm: number): number {
    const deflectionAngle = 180 - angle_deg;
    const bowFactor = Math.sin((deflectionAngle * Math.PI) / 180 / 2);
    return bowFactor * spark_gap_mm * 2 + CORNER_BOW_FACTOR * deflectionAngle;
  }

  /**
   * Compute taper relief angle needed for acute corners.
   */
  computeTaperRelief(angle_deg: number): number {
    if (angle_deg >= 90) return 0;
    return Math.min((90 - angle_deg) * 0.5, WEDM_TAPER_SPEC.standard_max_taper_deg);
  }

  private analyzeCorners(
    corners: CornerPoint[],
    wire_dia: number,
    spark_gap: number,
    wire_tension: number
  ): CornerAnalysis[] {
    const minRadius = this.computeMinRadius(wire_dia, spark_gap);

    return corners.map((corner, idx) => {
      const cornerType = this.classifyCorner(corner);
      const actualRadius = corner.radius_mm > 0 ? corner.radius_mm : 0;
      const effectiveRadius = corner.is_internal
        ? actualRadius
        : actualRadius + wire_dia / 2 + spark_gap;
      const radiusAdequate = !corner.is_internal || effectiveRadius >= minRadius;

      const wireBow = this.computeWireBow(corner.angle_deg, wire_tension, spark_gap);
      const taperRelief = this.computeTaperRelief(corner.angle_deg);
      const strategy = this.recommendStrategy(corner, radiusAdequate, corner.is_internal);

      const warnings: string[] = [];
      if (!radiusAdequate) {
        warnings.push(
          `Corner ${idx + 1}: radius ${effectiveRadius.toFixed(3)}mm < min ${minRadius.toFixed(3)}mm`
        );
      }
      if (corner.is_internal && corner.angle_deg < 45) {
        warnings.push(`Corner ${idx + 1}: acute ${corner.angle_deg.toFixed(1)}° — taper relief recommended`);
      }

      return {
        corner_index: idx,
        corner,
        corner_type: cornerType,
        min_radius_mm: minRadius,
        actual_radius_mm: effectiveRadius,
        radius_adequate: radiusAdequate,
        recommended_strategy: strategy,
        wire_bow_mm: Math.round(wireBow * 1000) / 1000,
        taper_relief_deg: taperRelief,
        warnings,
      };
    });
  }

  private predictSlugDrop(
    slug: SlugGeometry,
    thickness_mm: number,
    density_kg_m3: number,
    tab_count: number,
    tab_width_mm: number
  ): SlugDropPrediction {
    const volume_m3 = (slug.area_mm2 * thickness_mm) / 1e9;
    const mass_kg = volume_m3 * density_kg_m3;
    const weight_N = mass_kg * GRAVITY_M_S2;

    const aspectRatio = slug.perimeter_mm / Math.sqrt(slug.area_mm2);
    const compactness = (4 * Math.PI * slug.area_mm2) / (slug.perimeter_mm * slug.perimeter_mm);

    const hookRisk =
      slug.has_undercut || slug.min_internal_angle_deg < SLUG_DROP_THRESHOLDS.hook_angle_deg;

    let slugClass: SlugDropClass;
    let dropProb: number;
    const recommendations: string[] = [];

    if (tab_count > 0) {
      slugClass = "retained";
      dropProb = 0;
      recommendations.push(`${tab_count} retention tab(s) will hold slug`);
    } else if (hookRisk) {
      slugClass = "wedge";
      dropProb = 0.2;
      recommendations.push("Slug may wedge due to acute corners or undercut");
      recommendations.push("Add retention tabs or increase corner radii");
    } else if (weight_N < SLUG_DROP_THRESHOLDS.min_drop_weight_N) {
      slugClass = "stick";
      dropProb = 0.3;
      recommendations.push("Lightweight slug may stick due to surface tension");
      recommendations.push("Consider air blast or manual removal");
    } else if (weight_N > SLUG_DROP_THRESHOLDS.max_stick_weight_N && compactness > 0.7) {
      slugClass = "clean_drop";
      dropProb = 0.95;
      recommendations.push("Slug should drop cleanly under gravity");
    } else if (aspectRatio > SLUG_DROP_THRESHOLDS.elongated_aspect_ratio) {
      slugClass = "stick";
      dropProb = 0.4;
      recommendations.push("Elongated slug may bind — consider adding tabs");
    } else {
      slugClass = "uncertain";
      dropProb = 0.5;
      recommendations.push("Slug behavior uncertain — add tabs for safety");
    }

    const confidence = slugClass === "retained" ? 1.0 :
                       slugClass === "clean_drop" ? 0.9 :
                       slugClass === "uncertain" ? 0.3 : 0.6;

    return {
      slug_class: slugClass,
      confidence,
      aspect_ratio: Math.round(aspectRatio * 100) / 100,
      compactness: Math.round(compactness * 100) / 100,
      hook_risk: hookRisk,
      estimated_weight_N: Math.round(weight_N * 1000) / 1000,
      drop_probability: dropProb,
      recommendations,
    };
  }

  private buildSummary(
    corners: CornerAnalysis[],
    slug: SlugDropPrediction,
    allAdequate: boolean
  ): string {
    const cornerStatus = allAdequate
      ? `All ${corners.length} corners adequate`
      : `${corners.filter(c => !c.radius_adequate).length}/${corners.length} corners need relief`;
    const slugStatus = `Slug: ${slug.slug_class} (${(slug.drop_probability * 100).toFixed(0)}% drop prob)`;
    return `${cornerStatus}. ${slugStatus}`;
  }

  private validateInput(input: CornerTaperInput): boolean {
    if (!input.slug || !Array.isArray(input.slug.corners)) return false;
    if (typeof input.thickness_mm !== "number" || input.thickness_mm <= 0) return false;
    if (!Number.isFinite(input.slug.area_mm2) || input.slug.area_mm2 <= 0) return false;
    return true;
  }

  private buildInvalidResult(reason: string): CornerTaperResult {
    return {
      success: false,
      corners: [],
      slug_prediction: {
        slug_class: "uncertain",
        confidence: 0,
        aspect_ratio: 0,
        compactness: 0,
        hook_risk: false,
        estimated_weight_N: 0,
        drop_probability: 0,
        recommendations: [reason],
      },
      all_corners_adequate: false,
      min_corner_radius_mm: 0,
      required_min_radius_mm: 0,
      total_warnings: [reason],
      summary: `INVALID: ${reason}`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const edmWireSlugCornerTaperEngine = new EDMWireSlugCornerTaperEngine();
export default edmWireSlugCornerTaperEngine;
