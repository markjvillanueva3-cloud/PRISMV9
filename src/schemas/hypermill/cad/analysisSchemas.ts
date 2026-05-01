/**
 * Analysis Tool Parameter Schemas — hyperCAD-S Analysis Operations
 *
 * U-HKC09: Zod schemas for 7 analysis tool types used in hyperCAD-S.
 * Each schema defines the parameter set the AC Python API accepts when
 * running a geometric or manufacturing analysis on a CAD body.
 *
 * AC Python call pattern:
 *   hm.analysis.draft(body_ref=<ref>, pull_direction='z', min_draft_angle=1.0, ...)
 *
 * @domain CAD-Analysis
 * @milestone HM-KC-MS1/U-HKC09
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every analysis tool type */
export interface AnalysisToolMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Draft Analysis ───────────────────────────────────────────────────────

export const draftAnalysisSchema = z.object({
  pull_direction: z
    .enum(["x", "y", "z", "custom"])
    .default("z")
    .describe("Mold pull direction axis for draft evaluation"),
  min_draft_angle: z
    .number()
    .min(0)
    .max(45)
    .default(1.0)
    .describe("Minimum acceptable draft angle for mold release, degrees (DFM: >= 1 for injection molding)"),
  color_map: z
    .boolean()
    .default(true)
    .describe("Display a color-mapped overlay showing draft angle distribution on faces"),
  threshold_angle: z
    .number()
    .min(0)
    .max(90)
    .default(3.0)
    .describe("Angle threshold below which faces are flagged as insufficient draft, degrees"),
  include_ribs: z
    .boolean()
    .default(true)
    .describe("Include rib features in the draft analysis (ribs often need steeper draft)"),
});

export type DraftAnalysis = z.infer<typeof draftAnalysisSchema>;

// ── 2. Undercut Analysis ────────────────────────────────────────────────────

export const undercutAnalysisSchema = z.object({
  detection_mode: z
    .enum(["static", "dynamic"])
    .default("static")
    .describe("Static = fixed pull direction; dynamic = evaluate multiple pull orientations"),
  pull_axis: z
    .enum(["x", "y", "z", "custom"])
    .default("z")
    .describe("Primary pull axis for undercut detection"),
  highlight_depth: z
    .boolean()
    .default(true)
    .describe("Color-code undercut regions by depth severity"),
  min_depth: z
    .number()
    .min(0)
    .max(1000)
    .default(0.1)
    .describe("Minimum undercut depth to flag as a manufacturing concern, mm"),
});

export type UndercutAnalysis = z.infer<typeof undercutAnalysisSchema>;

// ── 3. Curvature Analysis ───────────────────────────────────────────────────

export const curvatureAnalysisSchema = z.object({
  display_mode: z
    .enum(["gaussian", "mean", "min_radius", "max_radius"])
    .default("gaussian")
    .describe("Curvature metric to visualize on the surface"),
  scale_factor: z
    .number()
    .min(0.01)
    .max(1000)
    .default(1.0)
    .describe("Multiplier for the curvature display scale (higher = more contrast)"),
  color_range: z
    .enum(["auto", "symmetric", "positive_only", "custom"])
    .default("auto")
    .describe("Color map range mode for curvature visualization"),
  sample_density: z
    .number()
    .int()
    .min(10)
    .max(10000)
    .default(500)
    .describe("Number of sample points per surface for curvature evaluation"),
});

export type CurvatureAnalysis = z.infer<typeof curvatureAnalysisSchema>;

// ── 4. Wall Thickness ───────────────────────────────────────────────────────

export const wallThicknessSchema = z.object({
  min_thickness: z
    .number()
    .min(0.01)
    .max(500)
    .default(0.8)
    .describe("Minimum acceptable wall thickness, mm (DFM: >= 0.8 for injection, >= 1.0 for CNC)"),
  max_thickness: z
    .number()
    .min(0.1)
    .max(5000)
    .default(50)
    .describe("Maximum acceptable wall thickness before flagging sink marks or warpage risk, mm"),
  ray_count: z
    .number()
    .int()
    .min(100)
    .max(100000)
    .default(5000)
    .describe("Number of rays cast for thickness measurement (higher = more accurate, slower)"),
  display_sections: z
    .boolean()
    .default(true)
    .describe("Show cross-section views at critical thickness locations"),
  highlight_violations: z
    .boolean()
    .default(true)
    .describe("Color-code regions that violate min/max thickness thresholds"),
});

export type WallThickness = z.infer<typeof wallThicknessSchema>;

// ── 5. Spherical Analysis ───────────────────────────────────────────────────

export const sphericalAnalysisSchema = z.object({
  search_radius: z
    .number()
    .min(0.01)
    .max(10000)
    .default(10)
    .describe("Maximum radius to search when fitting spheres to local surface regions, mm"),
  fit_tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum deviation from a perfect sphere for a region to qualify, mm"),
  min_sphere_count: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .describe("Minimum number of spherical regions to detect before reporting results"),
  coverage_threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe("Minimum surface area fraction a spherical region must cover to be reported"),
});

export type SphericalAnalysis = z.infer<typeof sphericalAnalysisSchema>;

// ── 6. Feature Recognition ──────────────────────────────────────────────────

export const featureRecognitionSchema = z.object({
  recognize_holes: z
    .boolean()
    .default(true)
    .describe("Detect cylindrical hole features (through, blind, counterbored, countersunk)"),
  recognize_pockets: z
    .boolean()
    .default(true)
    .describe("Detect pocket features (open, closed, stepped)"),
  recognize_bosses: z
    .boolean()
    .default(true)
    .describe("Detect boss and pad features protruding from a face"),
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Geometric tolerance for feature boundary detection, mm"),
  max_features: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(500)
    .describe("Maximum number of features to detect (limits processing time on complex parts)"),
});

export type FeatureRecognition = z.infer<typeof featureRecognitionSchema>;

// ── 7. Compare Bodies ───────────────────────────────────────────────────────

export const compareBodiesSchema = z.object({
  deviation_tolerance: z
    .number()
    .min(0.0001)
    .max(10)
    .default(0.01)
    .describe("Deviation below which surfaces are considered identical, mm"),
  display_mode: z
    .enum(["color", "arrows", "both"])
    .default("color")
    .describe("Visualization mode: color map, deviation arrows, or both overlaid"),
  max_deviation_display: z
    .number()
    .min(0.001)
    .max(100)
    .default(1.0)
    .describe("Clamp the deviation color scale at this maximum value, mm"),
  compute_volume_diff: z
    .boolean()
    .default(true)
    .describe("Compute and report the volumetric difference between the two bodies"),
  align_bodies: z
    .boolean()
    .default(false)
    .describe("Auto-align bodies using best-fit registration before computing deviations"),
});

export type CompareBodies = z.infer<typeof compareBodiesSchema>;

// ── Analysis Tool Schema Map ────────────────────────────────────────────────

/** Union type of all analysis tool parameter objects */
export type AnalysisToolSchemas = {
  draft_analysis: DraftAnalysis;
  undercut_analysis: UndercutAnalysis;
  curvature_analysis: CurvatureAnalysis;
  wall_thickness: WallThickness;
  spherical_analysis: SphericalAnalysis;
  feature_recognition: FeatureRecognition;
  compare_bodies: CompareBodies;
};

/** Flat map from analysis tool name to its Zod schema */
export const ANALYSIS_TOOL_SCHEMA_MAP = {
  draft_analysis: draftAnalysisSchema,
  undercut_analysis: undercutAnalysisSchema,
  curvature_analysis: curvatureAnalysisSchema,
  wall_thickness: wallThicknessSchema,
  spherical_analysis: sphericalAnalysisSchema,
  feature_recognition: featureRecognitionSchema,
  compare_bodies: compareBodiesSchema,
} as const;

// ── Analysis Tool Metadata ──────────────────────────────────────────────────

/**
 * Per-tool metadata: param count, AC Python setter template, description.
 *
 * AC Python setter patterns follow the hyperMILL Automation Center 33.0 API.
 * Curly-brace tokens are replaced at runtime with the matching schema field value.
 */
export const ANALYSIS_TOOL_METADATA: Record<string, AnalysisToolMeta> = {
  draft_analysis: {
    paramCount: 5,
    acPythonSetter:
      "hm.analysis.draft(body_ref={body}, pull_dir='{pull_direction}', min_angle={min_draft_angle}, color_map={color_map}, threshold={threshold_angle}, include_ribs={include_ribs})",
    description: "Evaluates draft angles on all faces relative to the mold pull direction",
    dfmCriticalParams: ["min_draft_angle", "threshold_angle"],
  },
  undercut_analysis: {
    paramCount: 4,
    acPythonSetter:
      "hm.analysis.undercut(body_ref={body}, mode='{detection_mode}', pull_axis='{pull_axis}', highlight_depth={highlight_depth}, min_depth={min_depth})",
    description: "Detects undercut regions that prevent straight-pull mold release",
    dfmCriticalParams: ["min_depth"],
  },
  curvature_analysis: {
    paramCount: 4,
    acPythonSetter:
      "hm.analysis.curvature(surface_ref={surface}, display='{display_mode}', scale={scale_factor}, color_range='{color_range}', samples={sample_density})",
    description: "Visualizes surface curvature using Gaussian, mean, or principal radius metrics",
  },
  wall_thickness: {
    paramCount: 5,
    acPythonSetter:
      "hm.analysis.wall_thickness(body_ref={body}, min_t={min_thickness}, max_t={max_thickness}, rays={ray_count}, sections={display_sections}, highlight={highlight_violations})",
    description: "Measures wall thickness across the entire body and flags regions outside DFM limits",
    dfmCriticalParams: ["min_thickness", "max_thickness"],
  },
  spherical_analysis: {
    paramCount: 4,
    acPythonSetter:
      "hm.analysis.spherical(surface_ref={surface}, search_r={search_radius}, fit_tol={fit_tolerance}, min_count={min_sphere_count}, coverage={coverage_threshold})",
    description: "Identifies regions of a surface that approximate spherical geometry within tolerance",
  },
  feature_recognition: {
    paramCount: 5,
    acPythonSetter:
      "hm.analysis.feature_recognition(body_ref={body}, holes={recognize_holes}, pockets={recognize_pockets}, bosses={recognize_bosses}, tolerance={tolerance}, max_features={max_features})",
    description: "Automatically detects and classifies manufacturing features (holes, pockets, bosses)",
  },
  compare_bodies: {
    paramCount: 5,
    acPythonSetter:
      "hm.analysis.compare(body1={body1_ref}, body2={body2_ref}, dev_tol={deviation_tolerance}, display='{display_mode}', max_dev={max_deviation_display}, volume_diff={compute_volume_diff}, align={align_bodies})",
    description: "Computes surface deviation and volumetric difference between two solid bodies",
  },
};

/**
 * Total parameter count across all 7 analysis tool schemas.
 * Computed from ANALYSIS_TOOL_METADATA at module load time.
 */
export const ANALYSIS_TOTAL_PARAM_COUNT: number = Object.values(
  ANALYSIS_TOOL_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
