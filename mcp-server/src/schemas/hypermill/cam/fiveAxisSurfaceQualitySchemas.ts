/**
 * 5-Axis Surface Quality Profile Parameter Schemas — hyperMILL CAM 5-Axis
 *
 * U-HKC24: Zod schemas for 7 surface quality profile types used in hyperMILL
 * 5-axis simultaneous machining. Each profile schema defines tolerance,
 * distribution, and quality parameters for controlling surface finish on
 * complex freeform and turbomachinery surfaces. DFM-critical parameters
 * are tagged in metadata for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.5x.quality.scallop_control(target_height=0.01, computation_method="cusp", ...)
 *
 * @domain CAM-5Axis-SurfaceQuality
 * @milestone HM-KC-MS4/U-HKC24
 */

import { z } from "zod";

// ── 1. Scallop Control (14 params) ────────────────────────────────────────

export const scallopControlSchema = z.object({
  target_height: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Target scallop height for surface quality control (DFM-critical), mm"),
  computation_method: z
    .enum(["chord", "cusp", "geometric"])
    .describe("Method for computing scallop height: chord deviation, cusp height, or geometric"),
  min_stepover: z
    .number()
    .min(0.001)
    .max(50)
    .describe("Minimum stepover distance to prevent excessive machining time, mm"),
  max_stepover: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Maximum stepover distance to ensure surface quality, mm"),
  adaptive: z
    .boolean()
    .describe("Enable adaptive stepover that varies based on local surface curvature"),
  surface_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Overall surface tolerance for scallop computation, mm"),
  curvature_factor: z
    .number()
    .min(0.1)
    .max(10)
    .default(1)
    .describe("Multiplier for curvature-based stepover adjustment"),
  overlap_pct: z
    .number()
    .min(0)
    .max(50)
    .default(5)
    .describe("Overlap percentage between adjacent passes for consistent scallop, %"),
  direction_lock: z
    .boolean()
    .default(false)
    .describe("Lock scallop computation direction to tool axis"),
  boundary_extension: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .describe("Extension of scallop computation beyond surface boundary, mm"),
  steep_threshold: z
    .number()
    .min(0)
    .max(89)
    .default(45)
    .describe("Angle threshold for switching between steep and shallow strategies, degrees"),
  shallow_threshold: z
    .number()
    .min(0)
    .max(89)
    .default(30)
    .describe("Angle threshold for shallow area detection, degrees"),
  corner_refinement: z
    .boolean()
    .default(true)
    .describe("Enable additional passes in corner regions for improved scallop quality"),
  smoothing_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(0)
    .describe("Number of additional smoothing passes after primary scallop control"),
});

export type ScallopControl = z.infer<typeof scallopControlSchema>;

// ── 2. Point Distribution (14 params) ─────────────────────────────────────

export const pointDistributionSchema = z.object({
  mode: z
    .enum(["constant_step", "chord_length", "curvature_based"])
    .describe("Point distribution mode: constant step, chord length, or curvature-based"),
  step_distance: z
    .number()
    .min(0.001)
    .max(100)
    .describe("Distance between consecutive toolpath points, mm"),
  min_points_per_curve: z
    .number()
    .int()
    .min(2)
    .max(10000)
    .describe("Minimum number of points per curve segment"),
  smooth_distribution: z
    .boolean()
    .describe("Smooth point spacing for improved surface quality"),
  reduce_points: z
    .boolean()
    .describe("Enable point reduction to minimize file size without quality loss"),
  reduction_tolerance: z
    .number()
    .min(0.0001)
    .max(1)
    .describe("Tolerance for point reduction algorithm, mm"),
  max_chord_error: z
    .number()
    .min(0.0001)
    .max(1)
    .default(0.01)
    .describe("Maximum allowable chord error between points, mm"),
  arc_fitting: z
    .boolean()
    .default(false)
    .describe("Enable arc fitting to replace collinear point sequences with arcs"),
  arc_tolerance: z
    .number()
    .min(0.0001)
    .max(0.5)
    .default(0.005)
    .describe("Tolerance for arc fitting approximation, mm"),
  feedrate_smoothing: z
    .boolean()
    .default(true)
    .describe("Smooth feedrate transitions between point segments"),
  corner_slow_down: z
    .boolean()
    .default(true)
    .describe("Reduce feed at sharp corners for surface quality"),
  corner_angle_threshold: z
    .number()
    .min(1)
    .max(90)
    .default(15)
    .describe("Angle threshold for corner detection and slowdown, degrees"),
  max_segment_length: z
    .number()
    .min(0.1)
    .max(1000)
    .default(50)
    .describe("Maximum segment length between points, mm"),
  interpolation_type: z
    .enum(["linear", "spline", "nurbs"])
    .default("linear")
    .describe("Interpolation type between computed points"),
});

export type PointDistribution = z.infer<typeof pointDistributionSchema>;

// ── 3. UV Direction (14 params) ───────────────────────────────────────────

export const uvDirectionSchema = z.object({
  u_count: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .describe("Number of iso-parametric curves in U direction"),
  v_count: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .describe("Number of iso-parametric curves in V direction"),
  uv_mode: z
    .enum(["u_direction", "v_direction", "diagonal", "auto"])
    .describe("Primary machining direction relative to UV surface parameterization"),
  iso_angle: z
    .number()
    .min(-180)
    .max(180)
    .describe("Rotation angle of iso-parametric direction from natural UV, degrees"),
  trim_to_boundary: z
    .boolean()
    .describe("Trim UV curves to the actual surface boundary"),
  reverse_u: z
    .boolean()
    .default(false)
    .describe("Reverse the U direction for alternating pass strategies"),
  reverse_v: z
    .boolean()
    .default(false)
    .describe("Reverse the V direction for alternating pass strategies"),
  u_stepover: z
    .number()
    .min(0.01)
    .max(100)
    .default(1)
    .describe("Stepover between U-direction passes, mm"),
  v_stepover: z
    .number()
    .min(0.01)
    .max(100)
    .default(1)
    .describe("Stepover between V-direction passes, mm"),
  extend_u: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .describe("Extension of toolpath beyond surface in U direction, mm"),
  extend_v: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .describe("Extension of toolpath beyond surface in V direction, mm"),
  zigzag: z
    .boolean()
    .default(true)
    .describe("Alternate pass direction for bidirectional machining"),
  surface_normal_check: z
    .boolean()
    .default(true)
    .describe("Verify tool axis alignment with surface normal during UV machining"),
  parametric_tolerance: z
    .number()
    .min(0.0001)
    .max(0.5)
    .default(0.01)
    .describe("Tolerance for parametric space calculations, mm"),
});

export type UvDirection = z.infer<typeof uvDirectionSchema>;

// ── 4. Surface Tolerance (14 params) ──────────────────────────────────────

export const surfaceToleranceSchema = z.object({
  machining_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .describe("Primary machining tolerance for toolpath generation, mm"),
  chord_tolerance: z
    .number()
    .min(0.0001)
    .max(1)
    .describe("Maximum chord deviation from true surface, mm"),
  angular_tolerance: z
    .number()
    .min(0.01)
    .max(45)
    .describe("Maximum angular deviation between surface normal and tool axis, degrees"),
  feature_size_min: z
    .number()
    .min(0.001)
    .max(100)
    .describe("Minimum feature size to be recognized and machined, mm"),
  inner_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .default(0.01)
    .describe("Tolerance for inner (concave) surface regions, mm"),
  outer_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .default(0.01)
    .describe("Tolerance for outer (convex) surface regions, mm"),
  gouge_check: z
    .boolean()
    .default(true)
    .describe("Enable gouge checking against tolerance boundaries"),
  overcut_limit: z
    .number()
    .min(0)
    .max(0.5)
    .default(0)
    .describe("Maximum allowed overcut beyond tolerance, mm"),
  undercut_limit: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe("Maximum allowed undercut (remaining stock) beyond tolerance, mm"),
  smoothing_tolerance: z
    .number()
    .min(0.0001)
    .max(0.5)
    .default(0.005)
    .describe("Tolerance for toolpath smoothing operations, mm"),
  tessellation_quality: z
    .enum(["low", "medium", "high", "ultra"])
    .default("high")
    .describe("Surface tessellation quality for tolerance computation"),
  cusp_height_limit: z
    .number()
    .min(0.0005)
    .max(0.5)
    .default(0.01)
    .describe("Maximum allowable cusp height on finished surface, mm"),
  edge_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .default(0.01)
    .describe("Tolerance for sharp edge and corner features, mm"),
  blend_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .default(0.01)
    .describe("Tolerance for blended/filleted transition zones, mm"),
});

export type SurfaceTolerance = z.infer<typeof surfaceToleranceSchema>;

// ── 5. Curvature Analysis (14 params) ─────────────────────────────────────

export const curvatureAnalysisSchema = z.object({
  min_radius_detect: z
    .number()
    .min(0.01)
    .max(1000)
    .describe("Minimum radius threshold for curvature detection (DFM-critical: tool selection), mm"),
  max_curvature_display: z
    .number()
    .min(0.001)
    .max(1000)
    .describe("Maximum curvature value for display/analysis, 1/mm"),
  gaussian_display: z
    .boolean()
    .describe("Display Gaussian curvature map on surface"),
  color_map: z
    .boolean()
    .describe("Display color-coded curvature map for visual analysis"),
  mean_curvature: z
    .boolean()
    .default(true)
    .describe("Compute and display mean curvature"),
  principal_curvature: z
    .boolean()
    .default(true)
    .describe("Compute and display principal curvatures (k1, k2)"),
  curvature_comb: z
    .boolean()
    .default(false)
    .describe("Display curvature comb for edge quality assessment"),
  sample_density: z
    .number()
    .int()
    .min(10)
    .max(10000)
    .default(500)
    .describe("Number of sample points for curvature analysis"),
  smooth_iterations: z
    .number()
    .int()
    .min(0)
    .max(50)
    .default(3)
    .describe("Number of smoothing iterations for curvature computation"),
  inflection_detect: z
    .boolean()
    .default(true)
    .describe("Detect inflection points where curvature changes sign"),
  saddle_detect: z
    .boolean()
    .default(true)
    .describe("Detect saddle points (negative Gaussian curvature)"),
  flat_region_threshold: z
    .number()
    .min(0.0001)
    .max(10)
    .default(0.001)
    .describe("Curvature threshold below which region is considered flat, 1/mm"),
  steep_region_detect: z
    .boolean()
    .default(true)
    .describe("Detect steep regions requiring special machining strategies"),
  report_export: z
    .boolean()
    .default(false)
    .describe("Export curvature analysis report for documentation"),
});

export type CurvatureAnalysis = z.infer<typeof curvatureAnalysisSchema>;

// ── 6. Contact Point Control (14 params) ──────────────────────────────────

export const contactPointControlSchema = z.object({
  contact_type: z
    .enum(["tip", "full_radius", "side", "calculated"])
    .describe("Tool contact point type for surface-following toolpath generation"),
  contact_angle: z
    .number()
    .min(-90)
    .max(90)
    .describe("Contact angle between tool and surface at contact point, degrees"),
  tool_radius_comp: z
    .boolean()
    .describe("Enable tool radius compensation for accurate surface contact"),
  ball_end_optimize: z
    .boolean()
    .describe("Optimize contact point for ball-end mills to avoid tip cutting"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Lead angle (tilt forward/backward in feed direction), degrees"),
  tilt_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Tilt angle (lean left/right perpendicular to feed), degrees"),
  contact_tracking: z
    .boolean()
    .default(true)
    .describe("Enable continuous contact point tracking along surface"),
  effective_radius_min: z
    .number()
    .min(0.1)
    .max(500)
    .default(1)
    .describe("Minimum effective cutting radius at contact point, mm"),
  gouge_avoidance: z
    .boolean()
    .default(true)
    .describe("Enable automatic gouge avoidance at contact point"),
  cutter_comp_mode: z
    .enum(["left", "right", "center", "auto"])
    .default("auto")
    .describe("Cutter compensation mode relative to toolpath"),
  surface_offset: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Offset from nominal surface at contact point, mm"),
  tool_axis_smooth: z
    .boolean()
    .default(true)
    .describe("Smooth tool axis transitions between contact points"),
  max_axis_change: z
    .number()
    .min(0.1)
    .max(30)
    .default(5)
    .describe("Maximum tool axis angular change per step, degrees"),
  contact_validation: z
    .boolean()
    .default(true)
    .describe("Validate contact point accuracy against surface geometry"),
});

export type ContactPointControl = z.infer<typeof contactPointControlSchema>;

// ── 7. Finish Quality (14 params) ─────────────────────────────────────────

export const finishQualitySchema = z.object({
  target_ra: z
    .enum(["Ra_0_1", "Ra_0_2", "Ra_0_4", "Ra_0_8", "Ra_1_6", "Ra_3_2"])
    .describe("Target surface roughness grade (Ra value in micrometers)"),
  burnish_pass: z
    .boolean()
    .describe("Execute a burnishing pass for improved surface finish"),
  dwell_at_corners: z
    .boolean()
    .describe("Dwell at corner transitions for consistent surface quality"),
  corner_radius_limit: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Minimum corner radius requiring special finishing treatment, mm"),
  lead_in_quality: z
    .enum(["match", "reduced"])
    .describe("Lead-in surface quality: match main surface or accept reduced quality"),
  spring_pass: z
    .boolean()
    .default(false)
    .describe("Execute a spring pass (repeat at final depth) for finish improvement"),
  feed_reduction_pct: z
    .number()
    .min(0)
    .max(80)
    .default(0)
    .describe("Feed rate reduction percentage for finish passes, %"),
  spindle_speed_increase_pct: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Spindle speed increase percentage for finish passes, %"),
  radial_depth_limit: z
    .number()
    .min(0.001)
    .max(10)
    .default(0.1)
    .describe("Maximum radial depth of cut for finishing, mm"),
  axial_depth_limit: z
    .number()
    .min(0.001)
    .max(10)
    .default(0.5)
    .describe("Maximum axial depth of cut for finishing, mm"),
  coolant_for_finish: z
    .enum(["flood", "mist", "air_blast", "mql", "dry"])
    .default("mist")
    .describe("Coolant delivery mode for finish passes"),
  wiper_insert: z
    .boolean()
    .default(false)
    .describe("Use wiper insert geometry for improved Ra without feed reduction"),
  polishing_mode: z
    .boolean()
    .default(false)
    .describe("Enable polishing mode with ultra-fine stepover and low engagement"),
  surface_inspection: z
    .boolean()
    .default(false)
    .describe("Flag for post-machining surface inspection requirement"),
});

export type FinishQuality = z.infer<typeof finishQualitySchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 7 surface quality profile schemas keyed by profile type */
export const FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP = {
  scallop_control: scallopControlSchema,
  point_distribution: pointDistributionSchema,
  uv_direction: uvDirectionSchema,
  surface_tolerance: surfaceToleranceSchema,
  curvature_analysis: curvatureAnalysisSchema,
  contact_point_control: contactPointControlSchema,
  finish_quality: finishQualitySchema,
} as const;

export type FiveAxisSurfaceQualityType = keyof typeof FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata record for every surface quality profile type */
export interface FiveAxisSurfaceQualityMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each surface quality profile type with AC Python setter references */
export const FIVE_AXIS_SURFACE_QUALITY_METADATA: Record<
  FiveAxisSurfaceQualityType,
  FiveAxisSurfaceQualityMeta
> = {
  scallop_control: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.scallop_control",
    description: "Scallop height control with adaptive stepover and curvature-based computation",
    dfmCriticalParams: ["target_height", "computation_method"],
  },
  point_distribution: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.point_distribution",
    description: "Toolpath point distribution control with reduction and arc fitting optimization",
  },
  uv_direction: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.uv_direction",
    description: "UV iso-parametric direction control for surface-aligned machining passes",
  },
  surface_tolerance: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.surface_tolerance",
    description: "Multi-zone surface tolerance with chord, angular, and feature size controls",
  },
  curvature_analysis: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.curvature_analysis",
    description: "Surface curvature analysis with Gaussian, mean, and principal curvature computation",
    dfmCriticalParams: ["min_radius_detect"],
  },
  contact_point_control: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.contact_point_control",
    description: "Tool-surface contact point control with lead/tilt angle and gouge avoidance",
  },
  finish_quality: {
    paramCount: 14,
    acPythonSetter: "hm.5x.quality.finish_quality",
    description: "Finish quality profile with Ra target, burnish pass, and polishing mode",
  },
};

// ── Computed Totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 7 surface quality profile schemas */
export const FIVE_AXIS_SURFACE_QUALITY_TOTAL_PARAM_COUNT = Object.values(
  FIVE_AXIS_SURFACE_QUALITY_METADATA,
).reduce((sum, meta) => sum + meta.paramCount, 0);
