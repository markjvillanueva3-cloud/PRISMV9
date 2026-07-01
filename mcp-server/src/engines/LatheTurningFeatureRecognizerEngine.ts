/**
 * LatheTurningFeatureRecognizerEngine — U-LTH34 (LATHE-MASTER P4)
 *
 * Takes BlueprintIntake (from U-LTH33) and recognizes turning features:
 * - OD_turn, ID_bore, face, groove, thread, chamfer, radius, taper, knurl
 * - Extracts geometric params: diameter, length, depth, angle, pitch
 * - Associates tolerances, surface finish, GD&T
 *
 * @milestone LATHE-MASTER U-LTH34
 * @version 1.0.0
 */

import { z } from "zod";
import type {
  BlueprintIntake,
  Dimension,
  GDTCallout,
  SurfaceFinish,
  TurningFeature,
} from "./LathePrintIngestPipelineEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Feature type taxonomy — 20 standard turning feature types */
export const TURNING_FEATURE_TYPES = [
  "od_turn", "id_bore", "face", "groove_od", "groove_id", "groove_face",
  "thread_external", "thread_internal", "chamfer_od", "chamfer_id",
  "radius_od", "radius_id", "taper_od", "taper_id", "knurl",
  "undercut", "center_drill", "drill", "tap", "ream",
] as const;
export type TurningFeatureType = typeof TURNING_FEATURE_TYPES[number];

/** Extended feature with machining-ready parameters */
export const RecognizedFeatureSchema = z.object({
  id: z.string(),
  type: z.enum(TURNING_FEATURE_TYPES),

  // Geometry
  start_z_mm: z.number().optional(),
  end_z_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
  diameter_min_mm: z.number().optional(),
  diameter_max_mm: z.number().optional(),
  length_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  width_mm: z.number().optional(),
  angle_deg: z.number().optional(),
  pitch_mm: z.number().optional(),
  thread_class: z.string().optional(),
  chamfer_size_mm: z.number().optional(),
  radius_mm: z.number().optional(),
  taper_angle_deg: z.number().optional(),

  // Tolerances
  tolerance_plus_mm: z.number().optional(),
  tolerance_minus_mm: z.number().optional(),
  tolerance_class: z.string().optional(),

  // Surface
  surface_ra_um: z.number().optional(),
  surface_process: z.string().optional(),

  // GD&T
  gdt_requirements: z.array(z.object({
    symbol: z.string(),
    tolerance_mm: z.number(),
    datum_refs: z.array(z.string()),
  })).optional(),

  // Machining hints
  requires_finishing_pass: z.boolean().optional(),
  recommended_insert: z.string().optional(),
  critical_dimension: z.boolean().optional(),

  // Traceability
  source_dim_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});
export type RecognizedFeature = z.infer<typeof RecognizedFeatureSchema>;

/** Recognition result */
export const RecognitionResultSchema = z.object({
  features: z.array(RecognizedFeatureSchema),
  feature_count_by_type: z.record(z.string(), z.number()),
  unrecognized_dims: z.array(z.string()),
  overall_confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  recognition_timestamp: z.string(),
});
export type RecognitionResult = z.infer<typeof RecognitionResultSchema>;

// ============================================================================
// FEATURE CLASSIFICATION RULES
// ============================================================================

interface ClassificationRule {
  type: TurningFeatureType;
  match: (dim: Dimension, context: ClassificationContext) => boolean;
  extract: (dim: Dimension, context: ClassificationContext) => Partial<RecognizedFeature>;
  priority: number;
}

interface ClassificationContext {
  dimensions: Dimension[];
  gdtCallouts: GDTCallout[];
  surfaceFinishes: SurfaceFinish[];
  material?: { iso_group?: string };
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Thread detection (high priority)
  {
    type: "thread_external",
    priority: 100,
    match: (dim) => dim.type === "thread_pitch" && dim.nominal_mm > 0,
    extract: (dim) => ({
      diameter_mm: dim.nominal_mm,
      pitch_mm: dim.tolerance_plus_mm || 1.5, // Pitch often stored here
      thread_class: dim.tolerance_class || "6g",
      requires_finishing_pass: false,
    }),
  },
  {
    type: "thread_internal",
    priority: 100,
    match: (dim, ctx) =>
      dim.type === "thread_pitch" &&
      ctx.dimensions.some(d =>
        d.type === "diameter" && d.feature_ref === dim.feature_ref && d.nominal_mm < dim.nominal_mm
      ),
    extract: (dim) => ({
      diameter_mm: dim.nominal_mm,
      pitch_mm: dim.tolerance_plus_mm || 1.5,
      thread_class: dim.tolerance_class || "6H",
      requires_finishing_pass: false,
    }),
  },

  // Chamfer detection
  {
    type: "chamfer_od",
    priority: 90,
    match: (dim) => dim.type === "chamfer",
    extract: (dim) => ({
      chamfer_size_mm: dim.nominal_mm,
      angle_deg: 45, // Default chamfer angle
      requires_finishing_pass: false,
    }),
  },
  {
    type: "chamfer_id",
    priority: 90,
    match: (dim, ctx) =>
      dim.type === "chamfer" &&
      ctx.dimensions.some(d =>
        d.type === "diameter" && d.feature_ref === dim.feature_ref && d.nominal_mm < 20
      ),
    extract: (dim) => ({
      chamfer_size_mm: dim.nominal_mm,
      angle_deg: 45,
      requires_finishing_pass: false,
    }),
  },

  // Radius detection
  {
    type: "radius_od",
    priority: 85,
    match: (dim) => dim.type === "radius",
    extract: (dim) => ({
      radius_mm: dim.nominal_mm,
      requires_finishing_pass: dim.nominal_mm < 1,
    }),
  },
  {
    type: "radius_id",
    priority: 85,
    match: (dim, ctx) =>
      dim.type === "radius" &&
      ctx.dimensions.some(d =>
        d.type === "diameter" && d.feature_ref === dim.feature_ref && d.nominal_mm < 25
      ),
    extract: (dim) => ({
      radius_mm: dim.nominal_mm,
      requires_finishing_pass: true,
    }),
  },

  // Groove detection (width+depth indicators)
  {
    type: "groove_od",
    priority: 80,
    match: (dim) =>
      dim.type === "groove_width" || dim.type === "groove_depth",
    extract: (dim) => ({
      width_mm: dim.type === "groove_width" ? dim.nominal_mm : undefined,
      depth_mm: dim.type === "groove_depth" ? dim.nominal_mm : undefined,
      requires_finishing_pass: true,
    }),
  },

  // Angle/taper detection
  {
    type: "taper_od",
    priority: 75,
    match: (dim) => dim.type === "angle" && dim.nominal_mm !== 90,
    extract: (dim) => ({
      taper_angle_deg: dim.nominal_mm,
      requires_finishing_pass: true,
    }),
  },
  {
    type: "taper_id",
    priority: 75,
    match: (dim, ctx) =>
      dim.type === "angle" &&
      dim.nominal_mm !== 90 &&
      ctx.dimensions.some(d =>
        d.type === "diameter" && d.feature_ref === dim.feature_ref && d.nominal_mm < 30
      ),
    extract: (dim) => ({
      taper_angle_deg: dim.nominal_mm,
      requires_finishing_pass: true,
    }),
  },

  // Concentricity/runout → usually OD features
  {
    type: "od_turn",
    priority: 70,
    match: (dim, ctx) =>
      dim.type === "concentricity" || dim.type === "runout",
    extract: (dim, ctx) => {
      const relatedDia = ctx.dimensions.find(d =>
        d.type === "diameter" && d.feature_ref === dim.feature_ref
      );
      return {
        diameter_mm: relatedDia?.nominal_mm,
        tolerance_plus_mm: dim.tolerance_plus_mm,
        tolerance_minus_mm: dim.tolerance_minus_mm,
        critical_dimension: true,
        requires_finishing_pass: true,
      };
    },
  },

  // Standard diameter → OD or ID based on size heuristics
  {
    type: "od_turn",
    priority: 50,
    match: (dim) => dim.type === "diameter" && dim.nominal_mm >= 10,
    extract: (dim) => ({
      diameter_mm: dim.nominal_mm,
      tolerance_plus_mm: dim.tolerance_plus_mm,
      tolerance_minus_mm: dim.tolerance_minus_mm,
      tolerance_class: dim.tolerance_class,
      critical_dimension: hasTightTolerance(dim),
      requires_finishing_pass: hasTightTolerance(dim),
    }),
  },
  {
    type: "id_bore",
    priority: 50,
    match: (dim) =>
      dim.type === "diameter" &&
      dim.nominal_mm < 50 &&
      !!(dim.tolerance_class?.startsWith("H") || dim.tolerance_class?.startsWith("G")),
    extract: (dim) => ({
      diameter_mm: dim.nominal_mm,
      tolerance_plus_mm: dim.tolerance_plus_mm,
      tolerance_minus_mm: dim.tolerance_minus_mm,
      tolerance_class: dim.tolerance_class,
      critical_dimension: hasTightTolerance(dim),
      requires_finishing_pass: true,
    }),
  },

  // Face (length dimensions)
  {
    type: "face",
    priority: 40,
    match: (dim) => dim.type === "length",
    extract: (dim) => ({
      length_mm: dim.nominal_mm,
      tolerance_plus_mm: dim.tolerance_plus_mm,
      tolerance_minus_mm: dim.tolerance_minus_mm,
      requires_finishing_pass: hasTightTolerance(dim),
    }),
  },

  // Drilling operations
  {
    type: "drill",
    priority: 60,
    match: (dim, ctx) =>
      dim.type === "diameter" &&
      dim.nominal_mm < 30 &&
      ctx.dimensions.some(d =>
        d.type === "length" && d.feature_ref === dim.feature_ref
      ),
    extract: (dim, ctx) => {
      const depthDim = ctx.dimensions.find(d =>
        d.type === "length" && d.feature_ref === dim.feature_ref
      );
      return {
        diameter_mm: dim.nominal_mm,
        depth_mm: depthDim?.nominal_mm,
        requires_finishing_pass: false,
      };
    },
  },

  // Reaming (tight tolerance small holes only)
  {
    type: "ream",
    priority: 45,
    match: (dim) =>
      dim.type === "diameter" &&
      dim.nominal_mm <= 25 &&
      dim.tolerance_class?.match(/^H[67]$/) !== null &&
      (dim.feature_ref?.toLowerCase().includes("ream") ?? false),
    extract: (dim) => ({
      diameter_mm: dim.nominal_mm,
      tolerance_class: dim.tolerance_class,
      requires_finishing_pass: false,
    }),
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hasTightTolerance(dim: Dimension): boolean {
  const totalTol = Math.abs(dim.tolerance_plus_mm || 0) + Math.abs(dim.tolerance_minus_mm || 0);
  if (totalTol > 0 && totalTol < 0.05) return true;
  if (dim.tolerance_class?.match(/^[gfhH][67]$/)) return true;
  return false;
}

function generateFeatureId(type: TurningFeatureType, index: number): string {
  const prefix = type.toUpperCase().replace(/_/g, "-");
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function findRelatedGDT(dim: Dimension, gdtCallouts: GDTCallout[]): GDTCallout[] {
  return gdtCallouts.filter(g =>
    g.feature_ref === dim.feature_ref ||
    g.feature_ref === dim.id
  );
}

function findSurfaceFinish(dim: Dimension, surfaceFinishes: SurfaceFinish[]): SurfaceFinish | undefined {
  return surfaceFinishes.find(s =>
    s.feature_ref === dim.feature_ref ||
    s.feature_ref === dim.id
  );
}

function recommendInsert(feature: Partial<RecognizedFeature>, isoGroup?: string): string {
  const group = isoGroup || "P";

  switch (feature.type) {
    case "thread_external":
    case "thread_internal":
      return `${group}-class threading insert (full profile)`;
    case "groove_od":
    case "groove_id":
    case "groove_face":
      return `${group}-class grooving insert (3mm width)`;
    case "od_turn":
    case "id_bore":
      if (feature.requires_finishing_pass) {
        return `${group}-class finishing insert (0.4mm nose radius)`;
      }
      return `${group}-class roughing insert (0.8mm nose radius)`;
    case "face":
      return `${group}-class facing insert (CNMG style)`;
    case "chamfer_od":
    case "chamfer_id":
      return "Chamfer tool or turning insert at 45°";
    default:
      return `${group}-class general turning insert`;
  }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheTurningFeatureRecognizerEngine {
  private static instance: LatheTurningFeatureRecognizerEngine;

  private constructor() {}

  static getInstance(): LatheTurningFeatureRecognizerEngine {
    if (!LatheTurningFeatureRecognizerEngine.instance) {
      LatheTurningFeatureRecognizerEngine.instance = new LatheTurningFeatureRecognizerEngine();
    }
    return LatheTurningFeatureRecognizerEngine.instance;
  }

  /**
   * Recognize turning features from BlueprintIntake
   * @param intake BlueprintIntake from LathePrintIngestPipelineEngine
   * @returns RecognitionResult with classified features
   */
  recognize(intake: BlueprintIntake): RecognitionResult {
    const context: ClassificationContext = {
      dimensions: intake.dimensions,
      gdtCallouts: intake.gdt_callouts,
      surfaceFinishes: intake.surface_finishes,
      material: intake.material,
    };

    const recognizedFeatures: RecognizedFeature[] = [];
    const processedDimIds = new Set<string>();
    const featureCountByType: Record<string, number> = {};
    const warnings: string[] = [];

    // Sort rules by priority (highest first)
    const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => b.priority - a.priority);

    // Process each dimension
    for (const dim of intake.dimensions) {
      if (processedDimIds.has(dim.id)) continue;

      // Find matching rule
      for (const rule of sortedRules) {
        if (rule.match(dim, context)) {
          const extracted = rule.extract(dim, context);
          const relatedGDT = findRelatedGDT(dim, intake.gdt_callouts);
          const surfaceFinish = findSurfaceFinish(dim, intake.surface_finishes);

          // Count for ID generation
          const typeCount = featureCountByType[rule.type] || 0;
          featureCountByType[rule.type] = typeCount + 1;

          const feature: RecognizedFeature = {
            id: generateFeatureId(rule.type, typeCount),
            type: rule.type,
            ...extracted,
            surface_ra_um: surfaceFinish?.ra_um,
            surface_process: surfaceFinish?.process,
            gdt_requirements: relatedGDT.length > 0 ? relatedGDT.map(g => ({
              symbol: g.symbol,
              tolerance_mm: g.tolerance_mm,
              datum_refs: g.datum_refs,
            })) : undefined,
            recommended_insert: recommendInsert(
              { ...extracted, type: rule.type },
              intake.material?.iso_group
            ),
            source_dim_ids: [dim.id],
            confidence: Math.min(dim.confidence * (rule.priority / 100) + 0.3, 1),
          };

          recognizedFeatures.push(feature);
          processedDimIds.add(dim.id);
          break;
        }
      }
    }

    // Find unrecognized dimensions
    const unrecognizedDims = intake.dimensions
      .filter(d => !processedDimIds.has(d.id))
      .map(d => d.id);

    if (unrecognizedDims.length > 0) {
      warnings.push(`${unrecognizedDims.length} dimensions not classified: ${unrecognizedDims.join(", ")}`);
    }

    // Merge features from intake.features if available
    for (const existingFeature of intake.features) {
      if (!recognizedFeatures.some(f => f.id === existingFeature.id)) {
        const typeCount = featureCountByType[existingFeature.type] || 0;
        featureCountByType[existingFeature.type] = typeCount + 1;

        recognizedFeatures.push({
          id: existingFeature.id,
          type: existingFeature.type,
          start_z_mm: existingFeature.start_z_mm,
          end_z_mm: existingFeature.end_z_mm,
          diameter_mm: existingFeature.diameter_mm,
          depth_mm: existingFeature.depth_mm,
          source_dim_ids: existingFeature.related_dims,
          confidence: existingFeature.confidence,
        });
      }
    }

    // Calculate overall confidence
    const overallConfidence = recognizedFeatures.length > 0
      ? recognizedFeatures.reduce((sum, f) => sum + f.confidence, 0) / recognizedFeatures.length
      : 0;

    return {
      features: recognizedFeatures,
      feature_count_by_type: featureCountByType,
      unrecognized_dims: unrecognizedDims,
      overall_confidence: Math.round(overallConfidence * 1000) / 1000,
      warnings,
      recognition_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Batch recognize features from multiple intakes
   */
  batchRecognize(intakes: BlueprintIntake[]): RecognitionResult[] {
    return intakes.map(intake => this.recognize(intake));
  }

  /**
   * Get feature taxonomy — list all supported feature types with descriptions
   */
  getTaxonomy(): Array<{ type: TurningFeatureType; description: string; category: string }> {
    return [
      { type: "od_turn", description: "External cylindrical turning", category: "turning" },
      { type: "id_bore", description: "Internal boring operation", category: "turning" },
      { type: "face", description: "Face turning (perpendicular to axis)", category: "turning" },
      { type: "groove_od", description: "External groove/recess", category: "grooving" },
      { type: "groove_id", description: "Internal groove/recess", category: "grooving" },
      { type: "groove_face", description: "Face groove", category: "grooving" },
      { type: "thread_external", description: "External thread cutting", category: "threading" },
      { type: "thread_internal", description: "Internal thread cutting", category: "threading" },
      { type: "chamfer_od", description: "External chamfer", category: "secondary" },
      { type: "chamfer_id", description: "Internal chamfer", category: "secondary" },
      { type: "radius_od", description: "External radius/blend", category: "secondary" },
      { type: "radius_id", description: "Internal radius/blend", category: "secondary" },
      { type: "taper_od", description: "External taper", category: "turning" },
      { type: "taper_id", description: "Internal taper", category: "turning" },
      { type: "knurl", description: "Knurling pattern", category: "secondary" },
      { type: "undercut", description: "Thread relief undercut", category: "grooving" },
      { type: "center_drill", description: "Center drilling", category: "drilling" },
      { type: "drill", description: "Drilling operation", category: "drilling" },
      { type: "tap", description: "Tapping operation", category: "threading" },
      { type: "ream", description: "Reaming operation", category: "drilling" },
    ];
  }

  /**
   * Validate feature recognition against expected output
   */
  validateRecognition(
    result: RecognitionResult,
    expected: { min_features: number; required_types?: TurningFeatureType[] }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (result.features.length < expected.min_features) {
      errors.push(
        `Expected at least ${expected.min_features} features, got ${result.features.length}`
      );
    }

    if (expected.required_types) {
      const foundTypes = new Set(result.features.map(f => f.type));
      for (const reqType of expected.required_types) {
        if (!foundTypes.has(reqType)) {
          errors.push(`Missing required feature type: ${reqType}`);
        }
      }
    }

    if (result.overall_confidence < 0.7) {
      errors.push(`Low overall confidence: ${result.overall_confidence}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get statistics about feature recognition across multiple parts
   */
  getRecognitionStats(results: RecognitionResult[]): {
    total_parts: number;
    total_features: number;
    avg_features_per_part: number;
    type_distribution: Record<string, number>;
    avg_confidence: number;
    unrecognized_rate: number;
  } {
    const totalFeatures = results.reduce((sum, r) => sum + r.features.length, 0);
    const totalUnrecognized = results.reduce((sum, r) => sum + r.unrecognized_dims.length, 0);
    const totalDims = results.reduce(
      (sum, r) => sum + r.features.length + r.unrecognized_dims.length,
      0
    );

    const typeDistribution: Record<string, number> = {};
    for (const result of results) {
      for (const [type, count] of Object.entries(result.feature_count_by_type)) {
        typeDistribution[type] = (typeDistribution[type] || 0) + count;
      }
    }

    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.overall_confidence, 0) / results.length
      : 0;

    return {
      total_parts: results.length,
      total_features: totalFeatures,
      avg_features_per_part: results.length > 0 ? totalFeatures / results.length : 0,
      type_distribution: typeDistribution,
      avg_confidence: Math.round(avgConfidence * 1000) / 1000,
      unrecognized_rate: totalDims > 0 ? totalUnrecognized / totalDims : 0,
    };
  }
}

export const latheTurningFeatureRecognizerEngine = LatheTurningFeatureRecognizerEngine.getInstance();
