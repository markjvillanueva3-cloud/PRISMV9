/**
 * FeatureToStrategyBridgeEngine — Feature Recognition Results → Strategy Recommendations (E1163)
 *
 * Maps recognized geometric features (pocket, hole, boss, slot, freeform, channel, etc.)
 * to recommended hyperMILL machining strategies from HyperMillStrategyEngine.
 *
 * Feature geometry (depth, width, draft angle, surface area) drives selection of the
 * optimal cycle type and operation goal.
 *
 * Supports 10+ feature types:
 *   pocket, hole, boss, slot, freeform, channel, rib, face, thread, contour,
 *   groove, corner, freeform_surface
 *
 * @engine FeatureToStrategyBridgeEngine
 * @shortcode E1163
 * @dispatcher camDispatcher
 * @actions cam_feature_to_strategy
 * @milestone HM-REV-MS0 / U-HMR04
 */

import {
  hyperMillStrategyEngine,
  type StrategyRecommendation,
  type GeometryType,
  type OperationGoal,
} from "./HyperMillStrategyEngine.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Recognized feature types from a CAD feature recognition analysis */
export type RecognizedFeatureType =
  | "pocket"
  | "hole"
  | "boss"
  | "slot"
  | "freeform"
  | "freeform_surface"
  | "channel"
  | "rib"
  | "face"
  | "thread"
  | "contour"
  | "groove"
  | "corner"
  | "chamfer";

/** A recognized geometric feature from CAD analysis */
export interface RecognizedFeature {
  /** Feature type */
  type: RecognizedFeatureType;
  /** Feature depth in mm (pocket depth, hole depth, etc.) */
  depth_mm?: number;
  /** Feature width or diameter in mm */
  width_mm?: number;
  /** Draft angle on walls in degrees (0 = vertical) */
  draft_angle_deg?: number;
  /** Surface area in mm² */
  surface_area_mm2?: number;
  /** Whether the feature has been previously roughed */
  previously_roughed?: boolean;
  /** Part tolerance in mm (tighter = prefer finishing over semi-finishing) */
  part_tolerance_mm?: number;
  /** ISO material group for speed/feed physics */
  material_group?: string;
  /** Feature label/ID from CAD recognition output */
  feature_id?: string;
}

/** Strategy recommendation enriched with feature context */
export interface FeatureStrategyRecommendation {
  /** Original feature */
  feature: RecognizedFeature;
  /** Mapped hyperMILL geometry type */
  hypermill_geometry_type: GeometryType;
  /** Mapped operation goal */
  operation_goal: OperationGoal;
  /** Full strategy recommendation from HyperMillStrategyEngine */
  strategy: StrategyRecommendation;
  /** Recommended hyperMILL cycle name */
  cycle_name: string;
  /** Human-readable rationale for this recommendation */
  rationale: string;
  /** Suggested operation sequence (e.g. roughing → semi-finish → finish) */
  suggested_sequence: OperationGoal[];
  /** Confidence 0–1 */
  confidence: number;
}

/** Bridge input: list of recognized features + global settings */
export interface BridgeInput {
  /** Recognized features from CAD analysis */
  features: RecognizedFeature[];
  /** Default material ISO group if not per-feature */
  default_material_group?: string;
  /** Default part tolerance if not per-feature */
  default_tolerance_mm?: number;
}

/** Bridge output: per-feature strategy recommendations */
export interface BridgeOutput {
  /** Strategy recommendation for each feature */
  recommendations: FeatureStrategyRecommendation[];
  /** Total features processed */
  feature_count: number;
  /** Warnings */
  warnings: string[];
}

// ─── Feature → HyperMILL Geometry Type Mapping ─────────────────────────────

/**
 * Maps a recognized feature type to the closest hyperMILL geometry type.
 * Used to select the right strategy from HyperMillStrategyEngine's STRATEGIES table.
 */
const FEATURE_TO_GEOMETRY: Record<RecognizedFeatureType, GeometryType> = {
  pocket:         "pocket_2d",
  hole:           "pocket_2d",      // holes use pocket strategy (drilling cycle for deep holes)
  boss:           "contour_2d",     // bosses use contour strategy
  slot:           "groove",          // slots map to groove geometry
  freeform:       "freeform_3d",
  freeform_surface: "freeform_3d",
  channel:        "groove",
  rib:            "rib",
  face:           "face",
  thread:         "thread",
  contour:        "contour_2d",
  groove:         "groove",
  corner:         "corner",
  chamfer:        "contour_2d",
};

/**
 * Determines the optimal operation goal for a feature based on geometry.
 * Considers depth-to-width ratio, tolerance, and previous roughing.
 */
function determineGoal(feature: RecognizedFeature): OperationGoal {
  const tol = feature.part_tolerance_mm;
  const depth = feature.depth_mm ?? 0;
  const width = feature.width_mm ?? 1;
  const depthToWidth = width > 0 ? depth / width : 0;

  // Tight tolerance → finishing
  if (tol !== undefined && tol < 0.05) return "finishing";

  // Previously roughed → semi-finishing or finishing
  if (feature.previously_roughed) {
    return tol !== undefined && tol < 0.1 ? "finishing" : "semi_finishing";
  }

  // Deep-to-narrow features → roughing first
  if (depthToWidth > 2.0) return "roughing";

  // Shallow → finishing
  if (depth < 2.0 && depth > 0) return "finishing";

  // Default: roughing for most features
  return "roughing";
}

/**
 * Generate a rationale string explaining the strategy recommendation.
 */
function buildRationale(
  feature: RecognizedFeature,
  geometryType: GeometryType,
  goal: OperationGoal,
  cycleName: string,
): string {
  const parts: string[] = [
    `Feature type "${feature.type}" maps to hyperMILL geometry "${geometryType}".`,
  ];

  if (feature.depth_mm !== undefined) {
    parts.push(`Depth: ${feature.depth_mm}mm.`);
  }
  if (feature.width_mm !== undefined) {
    parts.push(`Width/Diameter: ${feature.width_mm}mm.`);
  }
  if (feature.previously_roughed) {
    parts.push("Previously roughed — selected semi-finish/finish strategy.");
  }
  if (feature.part_tolerance_mm !== undefined) {
    parts.push(`Tolerance: ±${feature.part_tolerance_mm}mm → ${goal} approach.`);
  }
  if (feature.draft_angle_deg !== undefined && feature.draft_angle_deg > 0) {
    parts.push(`Wall draft: ${feature.draft_angle_deg}°.`);
  }

  parts.push(`Recommended cycle: "${cycleName}".`);
  return parts.join(" ");
}

/**
 * Determine the suggested operation sequence for a feature.
 */
function buildSequence(feature: RecognizedFeature, primaryGoal: OperationGoal): OperationGoal[] {
  const depth = feature.depth_mm ?? 0;
  const tol = feature.part_tolerance_mm;

  // Simple features: one pass
  if (depth < 5 && (tol === undefined || tol >= 0.1)) {
    return [primaryGoal];
  }

  // Complex: roughing → finishing
  if (primaryGoal === "roughing") {
    if (tol !== undefined && tol < 0.05) {
      return ["roughing", "semi_finishing", "finishing"];
    }
    return ["roughing", "finishing"];
  }

  return [primaryGoal];
}

// ─── Engine Class ──────────────────────────────────────────────────────────────

/**
 * FeatureToStrategyBridgeEngine — maps 10+ CAD feature types to hyperMILL strategies.
 *
 * Uses HyperMillStrategyEngine internally for strategy selection.
 * Returns full recommendation including cycle name, rationale, and sequence.
 */
export class FeatureToStrategyBridgeEngine {
  private processCount = 0;

  /**
   * Map a single recognized feature to its optimal hyperMILL strategy.
   *
   * @param feature - Recognized geometric feature from CAD analysis
   * @param defaultMaterialGroup - Fallback ISO group if not in feature
   * @param defaultToleranceMm - Fallback tolerance if not in feature
   * @returns FeatureStrategyRecommendation
   */
  mapFeature(
    feature: RecognizedFeature,
    defaultMaterialGroup?: string,
    defaultToleranceMm?: number,
  ): FeatureStrategyRecommendation {
    this.processCount++;

    const geometryType = FEATURE_TO_GEOMETRY[feature.type];
    const goal = determineGoal({
      ...feature,
      part_tolerance_mm: feature.part_tolerance_mm ?? defaultToleranceMm,
    });
    const materialGroup = feature.material_group ?? defaultMaterialGroup ?? "P";

    // Call HyperMillStrategyEngine for the actual recommendation
    const strategy = hyperMillStrategyEngine.calculate({
      geometryType,
      operationGoal: goal,
      materialGroup,
      toolDiameterMm: feature.width_mm ? feature.width_mm * 0.8 : undefined,
      wallAngleDeg: feature.draft_angle_deg,
      hasPreviousRoughing: feature.previously_roughed,
      pocketDepthMm: feature.depth_mm,
      partToleranceMm: feature.part_tolerance_mm ?? defaultToleranceMm,
    });

    const cycleName = strategy.hyperMillCycle;
    const rationale = buildRationale(feature, geometryType, goal, cycleName);
    const sequence = buildSequence(feature, goal);

    return {
      feature,
      hypermill_geometry_type: geometryType,
      operation_goal: goal,
      strategy,
      cycle_name: cycleName,
      rationale,
      suggested_sequence: sequence,
      confidence: strategy.confidence,
    };
  }

  /**
   * Process a batch of recognized features and return all recommendations.
   *
   * @param input - BridgeInput with features array and defaults
   * @returns BridgeOutput with per-feature recommendations
   */
  processFeatures(input: BridgeInput): BridgeOutput {
    const warnings: string[] = [];
    const recommendations: FeatureStrategyRecommendation[] = [];

    if (!input.features || input.features.length === 0) {
      warnings.push("No features provided — empty recommendation set");
      return { recommendations, feature_count: 0, warnings };
    }

    for (const feature of input.features) {
      if (!FEATURE_TO_GEOMETRY[feature.type]) {
        warnings.push(`Unknown feature type "${feature.type}" — skipping`);
        continue;
      }
      try {
        const rec = this.mapFeature(
          feature,
          input.default_material_group,
          input.default_tolerance_mm,
        );
        recommendations.push(rec);
      } catch (err) {
        warnings.push(`Failed to map feature "${feature.type}": ${String(err)}`);
      }
    }

    return {
      recommendations,
      feature_count: recommendations.length,
      warnings,
    };
  }

  /** Get supported feature types */
  getSupportedFeatureTypes(): RecognizedFeatureType[] {
    return Object.keys(FEATURE_TO_GEOMETRY) as RecognizedFeatureType[];
  }

  /** Get process count */
  getProcessCount(): number {
    return this.processCount;
  }
}

/** Singleton export */
export const featureToStrategyBridgeEngine = new FeatureToStrategyBridgeEngine();
