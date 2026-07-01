/**
 * 3D Core Cycle Parameter Schemas -- hyperMILL CAM 3D Finishing/Roughing
 *
 * U-HKC19: Zod schemas for 4 primary 3D cycle families (Z-Level, Parallel,
 * Scallop, Pencil). Each composes a shared 3D base (~20 params) with
 * cycle-specific parameters. DFM-critical parameters are tagged in metadata.
 *
 * AC Python call pattern:
 *   hm.3d.z_level(spindle_speed=8000, stepdown=0.5, ...)
 *
 * @domain CAM-3D
 * @milestone HM-KC-MS3/U-HKC19
 */

import { z } from "zod";

// ── Shared 3D Base Schema (20 params) ─────────────────────────────────────────

/** Cutting data, geometry, and machining parameters shared by all 3D cycle families */
export const threeDBaseSchema = z.object({
  spindle_speed: z
    .number()
    .min(100)
    .max(99999)
    .describe("Spindle rotational speed, RPM"),
  feed_rate: z
    .number()
    .min(1)
    .max(50000)
    .describe("Cutting feed rate, mm/min"),
  plunge_feed: z
    .number()
    .min(1)
    .max(50000)
    .describe("Feed rate during plunge/ramp moves into material, mm/min"),
  finishing_feed: z
    .number()
    .min(1)
    .max(50000)
    .describe("Feed rate for finishing passes, mm/min"),
  coolant_mode: z
    .enum(["flood", "mist", "through_tool", "air_blast", "off"])
    .describe("Coolant delivery mode for the 3D cycle"),
  tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Toolpath chordal tolerance for surface approximation, mm"),
  surface_tolerance: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Surface deviation tolerance for finish quality, mm"),
  clearance_plane: z
    .number()
    .describe("Clearance plane height for rapid traverse above part, mm"),
  retract_height: z
    .number()
    .describe("Retract height between passes, mm"),
  feed_height: z
    .number()
    .describe("Height at which feed rate engages (rapid-to-feed transition), mm"),
  top_surface: z
    .number()
    .describe("Z-height of the top machining boundary, mm"),
  bottom_surface: z
    .number()
    .describe("Z-height of the bottom machining boundary, mm"),
  boundary_mode: z
    .enum(["silhouette", "selected", "stock"])
    .describe("Boundary definition method: silhouette projection, selected curves, or stock boundary"),
  boundary_offset: z
    .number()
    .describe("Offset distance from boundary for toolpath extension or retraction, mm"),
  tool_comp: z
    .enum(["none", "computer", "wear"])
    .describe("Tool compensation mode: none, computer-calculated, or wear-based"),
  comp_direction: z
    .enum(["left", "right"])
    .describe("Compensation direction relative to toolpath travel"),
  stock_allowance_wall: z
    .number()
    .min(-1)
    .max(50)
    .default(0)
    .describe("Stock allowance on vertical/near-vertical walls, mm (negative = overcut)"),
  stock_allowance_floor: z
    .number()
    .min(-1)
    .max(50)
    .default(0)
    .describe("Stock allowance on horizontal/near-horizontal floors, mm (negative = overcut)"),
  rest_machining: z
    .boolean()
    .default(false)
    .describe("Enable rest machining to cut only material left by a previous larger tool"),
  rest_source: z
    .enum(["from_previous", "ipw", "stock_model"])
    .describe("Rest machining reference: previous toolpath, in-process workpiece, or stock model"),
});

export type ThreeDBase = z.infer<typeof threeDBaseSchema>;

// ── 1. Z-Level (20 base + 45 specific = 65 total) ────────────────────────────

export const zLevelSchema = threeDBaseSchema.extend({
  // Core stepdown
  stepdown: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Axial depth of cut per Z-level slice, mm (DFM-critical: affects tool load and surface finish)"),
  stepdown_mode: z
    .enum(["constant", "adaptive", "optimized"])
    .describe("Stepdown strategy: constant spacing, adaptive to geometry, or optimized for tool load"),
  // Angle thresholds
  steep_threshold_angle: z
    .number()
    .min(0)
    .max(90)
    .default(45)
    .describe("Surface angle threshold above which geometry is classified as steep, degrees"),
  shallow_threshold_angle: z
    .number()
    .min(0)
    .max(90)
    .default(15)
    .describe("Surface angle threshold below which geometry is classified as shallow, degrees"),
  // Finish passes
  wall_finish_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(0)
    .describe("Number of additional finishing passes on steep walls"),
  floor_finish_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(0)
    .describe("Number of additional finishing passes on shallow floors"),
  wall_finish_allowance: z
    .number()
    .min(0)
    .max(10)
    .describe("Stock allowance for wall finishing passes, mm"),
  floor_finish_allowance: z
    .number()
    .min(0)
    .max(10)
    .describe("Stock allowance for floor finishing passes, mm"),
  // Direction
  direction: z
    .enum(["climb", "conventional", "auto"])
    .describe("Cutting direction: climb (down milling), conventional (up milling), or auto-selected"),
  corner_radius: z
    .number()
    .min(0)
    .max(100)
    .describe("Corner rounding radius for toolpath smoothing at sharp transitions, mm"),
  area_selection: z
    .enum(["all", "steep_only", "shallow_only", "between_angles"])
    .describe("Which surface areas to machine based on slope angle classification"),
  // Helical entry
  helical_stepdown: z
    .boolean()
    .default(false)
    .describe("Use helical ramp for Z-level transitions instead of plunge"),
  helix_diameter_pct: z
    .number()
    .min(5)
    .max(95)
    .describe("Helix diameter as percentage of tool diameter, %"),
  ramp_angle: z
    .number()
    .min(0.5)
    .max(45)
    .describe("Ramp-down angle for helical or linear entry, degrees"),
  // Multiple slicing
  multiple_slicing: z
    .boolean()
    .default(false)
    .describe("Enable multiple slicing planes for complex multi-body geometry"),
  slice_overlap: z
    .number()
    .min(0)
    .max(50)
    .describe("Overlap distance between adjacent slicing regions, mm"),
  smooth_z_steps: z
    .boolean()
    .default(false)
    .describe("Smooth Z-step transitions to reduce witness marks between levels"),
  merge_tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Tolerance for merging adjacent Z-level contours, mm"),
  // Linking
  link_type: z
    .enum(["direct", "retract", "clearance", "along_surface"])
    .describe("Linking move type between Z-level contours"),
  link_height: z
    .number()
    .min(0)
    .max(500)
    .describe("Height for linking moves between contours, mm"),
  link_max_distance: z
    .number()
    .min(0)
    .max(1000)
    .describe("Maximum direct link distance before switching to retract, mm"),
  // Approach / retract
  approach_type: z
    .enum(["tangent", "arc", "direct", "helix"])
    .describe("Approach move type into each Z-level contour"),
  approach_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Approach distance for tangent or arc entry, mm"),
  retract_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Retract move type out of each Z-level contour"),
  retract_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Retract distance for tangent or arc exit, mm"),
  // Contour options
  contour_direction: z
    .enum(["cw", "ccw", "auto"])
    .default("auto")
    .describe("Contour traversal direction: clockwise, counter-clockwise, or automatic"),
  open_contour_extension: z
    .number()
    .min(0)
    .max(100)
    .describe("Extension distance at open contour endpoints, mm"),
  min_contour_length: z
    .number()
    .min(0)
    .max(500)
    .describe("Minimum contour length to include in toolpath, mm"),
  // Roughing extensions
  roughing_stepover: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Radial stepover for Z-level roughing mode, mm"),
  roughing_mode: z
    .boolean()
    .default(false)
    .describe("Enable Z-level roughing mode with area clearance between contours"),
  pocket_milling: z
    .boolean()
    .default(false)
    .describe("Enable pocket milling between Z-level contours for full area clearance"),
  pocket_overlap_pct: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe("Overlap percentage for pocket milling passes, %"),
  // Island handling
  island_detection: z
    .boolean()
    .default(true)
    .describe("Automatically detect and avoid island features within Z-level boundaries"),
  island_offset: z
    .number()
    .min(0)
    .max(50)
    .describe("Offset distance around detected islands, mm"),
  // Optimization
  optimize_contour_order: z
    .boolean()
    .default(true)
    .describe("Optimize contour machining order to minimize rapid traverse distance"),
  minimize_lifts: z
    .boolean()
    .default(true)
    .describe("Minimize tool lifts between adjacent contours on the same Z-level"),
  path_smoothing: z
    .boolean()
    .default(false)
    .describe("Apply path smoothing to reduce sharp direction changes"),
  smoothing_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Maximum deviation allowed during path smoothing, mm"),
  arc_fitting: z
    .boolean()
    .default(true)
    .describe("Fit arcs to linear segments for smoother machine motion"),
  arc_fitting_tolerance: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Maximum deviation for arc fitting, mm"),
  // Trochoidal
  trochoidal_milling: z
    .boolean()
    .default(false)
    .describe("Enable trochoidal milling within Z-level contours for reduced engagement"),
  trochoidal_stepover: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Trochoidal loop stepover distance, mm"),
  trochoidal_diameter: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Trochoidal loop diameter, mm"),
  // Safety
  max_engagement_angle: z
    .number()
    .min(10)
    .max(180)
    .default(90)
    .describe("Maximum tool engagement angle for load control, degrees"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking against fixture and stock model"),
});

export type ZLevel = z.infer<typeof zLevelSchema>;

// ── 2. Parallel (20 base + 35 specific = 55 total) ───────────────────────────

export const parallelSchema = threeDBaseSchema.extend({
  // Core stepover
  stepover: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Lateral step distance between parallel passes, mm (DFM-critical: governs scallop height)"),
  stepover_mode: z
    .enum(["constant", "scallop_height", "adaptive"])
    .describe("Stepover strategy: constant spacing, scallop-height-driven, or adaptive to curvature"),
  // Angle control
  cutting_angle: z
    .number()
    .min(-180)
    .max(180)
    .default(0)
    .describe("Toolpath orientation angle relative to X-axis, degrees"),
  angle_mode: z
    .enum(["fixed", "optimized", "along_surface"])
    .describe("Angle control: fixed user value, optimized for minimal scallop, or along surface flow"),
  // Direction
  bidirectional: z
    .boolean()
    .default(true)
    .describe("Enable bidirectional (zigzag) cutting for reduced non-cutting time"),
  direction_lock: z
    .boolean()
    .default(false)
    .describe("Lock cutting direction to prevent reversal on return passes"),
  // Extension
  overlap_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Extension distance beyond boundary for complete edge coverage, mm"),
  path_extension: z
    .number()
    .min(0)
    .max(100)
    .describe("Path extension at start and end of each pass for smooth entry/exit, mm"),
  // Angle limits
  steep_limit: z
    .number()
    .min(0)
    .max(90)
    .default(75)
    .describe("Maximum surface angle for parallel finishing (steeper areas excluded), degrees"),
  shallow_limit: z
    .number()
    .min(0)
    .max(90)
    .default(15)
    .describe("Minimum surface angle for parallel finishing (flatter areas excluded), degrees"),
  // Linking
  link_type: z
    .enum(["direct", "retract", "clearance"])
    .describe("Linking move type between passes: direct traverse, retract-and-plunge, or via clearance plane"),
  link_height: z
    .number()
    .min(0)
    .max(500)
    .describe("Height for linking moves between passes, mm"),
  // Scallop
  cusp_height: z
    .number()
    .min(0.001)
    .max(1.0)
    .describe("Resulting cusp (scallop) height computed from stepover and tool radius, mm"),
  scallop_height_target: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Target scallop height for scallop-height-driven stepover mode, mm"),
  // Approach / retract
  approach_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Approach move type into each parallel pass"),
  approach_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Approach distance for tangent or arc entry, mm"),
  retract_type_pass: z
    .enum(["tangent", "arc", "direct"])
    .describe("Retract move type out of each parallel pass"),
  retract_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Retract distance for tangent or arc exit, mm"),
  // Multi-angle
  multi_angle: z
    .boolean()
    .default(false)
    .describe("Enable multi-angle parallel finishing with multiple cutting angles"),
  second_cutting_angle: z
    .number()
    .min(-180)
    .max(180)
    .describe("Second cutting angle for multi-angle mode, degrees"),
  cross_hatch: z
    .boolean()
    .default(false)
    .describe("Enable cross-hatch pattern by combining two perpendicular angle passes"),
  // Path control
  path_sorting: z
    .enum(["sequential", "optimized", "shortest_path"])
    .default("optimized")
    .describe("Pass ordering strategy for minimizing non-cutting moves"),
  max_pass_length: z
    .number()
    .min(1)
    .max(10000)
    .describe("Maximum single pass length before forced retract, mm"),
  min_pass_length: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Minimum pass length to include in toolpath (eliminates short fragments), mm"),
  // Smoothing
  path_smoothing: z
    .boolean()
    .default(false)
    .describe("Apply path smoothing to reduce sharp direction changes at pass ends"),
  smoothing_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Maximum deviation allowed during path smoothing, mm"),
  arc_fitting: z
    .boolean()
    .default(true)
    .describe("Fit arcs to linear segments for smoother machine motion"),
  // Rest machining extensions
  rest_roughing_tool_dia: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Previous roughing tool diameter for rest material calculation, mm"),
  rest_corner_cleanup: z
    .boolean()
    .default(false)
    .describe("Enable corner cleanup passes where previous tool left material"),
  // Surface quality
  lead_in_angle: z
    .number()
    .min(0)
    .max(90)
    .describe("Lead-in arc angle at pass start for smooth surface entry, degrees"),
  lead_out_angle: z
    .number()
    .min(0)
    .max(90)
    .describe("Lead-out arc angle at pass end for smooth surface exit, degrees"),
  // Safety
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking against fixture and stock model"),
  max_engagement_angle: z
    .number()
    .min(10)
    .max(180)
    .default(90)
    .describe("Maximum tool engagement angle for load control, degrees"),
  gouge_check: z
    .boolean()
    .default(true)
    .describe("Enable gouge checking to prevent tool from cutting into part surface"),
});

export type Parallel = z.infer<typeof parallelSchema>;

// ── 3. Scallop (20 base + 25 specific = 45 total) ────────────────────────────

export const scallopSchema = threeDBaseSchema.extend({
  // Core cusp
  cusp_height_target: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Target cusp height for uniform surface finish across varying curvature, mm (DFM-critical)"),
  cusp_mode: z
    .enum(["constant", "adaptive"])
    .describe("Cusp height strategy: constant target everywhere, or adaptive to local curvature"),
  // Stepover control
  adaptive_stepover: z
    .boolean()
    .default(true)
    .describe("Enable adaptive stepover that varies with surface curvature to maintain target cusp height"),
  min_stepover: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Minimum stepover distance for highly curved regions, mm"),
  max_stepover: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Maximum stepover distance for flat regions, mm"),
  // Curvature
  curvature_driven: z
    .boolean()
    .default(false)
    .describe("Enable curvature-driven path generation for optimal surface quality on complex shapes"),
  curvature_factor: z
    .number()
    .min(0.1)
    .max(10)
    .describe("Curvature sensitivity multiplier: higher values tighten stepover on curved regions"),
  // Spiral
  spiral_mode: z
    .boolean()
    .default(false)
    .describe("Generate spiral toolpath from center outward or boundary inward"),
  spiral_start: z
    .enum(["center", "boundary"])
    .describe("Spiral starting position: center of region or outer boundary"),
  // Overlap and smoothing
  overlap_pct: z
    .number()
    .min(0)
    .max(50)
    .describe("Overlap between adjacent passes as percentage of stepover, %"),
  path_smoothing: z
    .boolean()
    .default(false)
    .describe("Apply path smoothing to reduce sharp direction changes and improve surface finish"),
  smoothing_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Maximum deviation allowed during path smoothing, mm"),
  // Angle limits
  steep_limit: z
    .number()
    .min(0)
    .max(90)
    .describe("Maximum surface angle for scallop machining, degrees"),
  shallow_limit: z
    .number()
    .min(0)
    .max(90)
    .describe("Minimum surface angle for scallop machining, degrees"),
  // Linking
  link_type: z
    .enum(["direct", "retract", "clearance", "along_surface"])
    .describe("Linking move type between scallop passes"),
  link_height: z
    .number()
    .min(0)
    .max(500)
    .describe("Height for linking moves between scallop passes, mm"),
  // Approach / retract
  approach_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Approach move type into each scallop pass"),
  retract_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Retract move type out of each scallop pass"),
  approach_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Approach distance for tangent or arc entry, mm"),
  retract_distance: z
    .number()
    .min(0)
    .max(100)
    .describe("Retract distance for tangent or arc exit, mm"),
  // Offset control
  offset_mode: z
    .enum(["from_surface", "from_boundary", "from_center"])
    .describe("Offset reference for scallop pass generation"),
  boundary_smoothing: z
    .boolean()
    .default(true)
    .describe("Smooth boundary transitions to prevent sharp toolpath changes at edges"),
  // Safety
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking against fixture and stock model"),
  gouge_check: z
    .boolean()
    .default(true)
    .describe("Enable gouge checking to prevent tool from cutting into part surface"),
  arc_fitting: z
    .boolean()
    .default(true)
    .describe("Fit arcs to linear segments for smoother machine motion"),
});

export type Scallop = z.infer<typeof scallopSchema>;

// ── 4. Pencil (20 base + 15 specific = 35 total) ─────────────────────────────

export const pencilSchema = threeDBaseSchema.extend({
  // Corner detection
  corner_radius_detect: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Maximum fillet/corner radius to detect for pencil tracing, mm (DFM-critical)"),
  min_radius: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Minimum corner radius to include in pencil trace detection, mm"),
  max_radius: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Maximum corner radius to include in pencil trace detection, mm"),
  // Blending
  blend_radius: z
    .number()
    .min(0)
    .max(50)
    .describe("Blend radius for smoothing transitions between pencil passes, mm"),
  blend_mode: z
    .enum(["arc", "smooth", "sharp"])
    .describe("Blend transition type at pass connections: arc tangent, smooth spline, or sharp corner"),
  // Passes
  multiple_passes: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(1)
    .describe("Number of pencil passes offset from the detected corner line"),
  pass_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance between multiple pencil passes, mm"),
  // Detection
  detection_method: z
    .enum(["auto", "toolpath_based", "geometry_based"])
    .describe("Corner detection method: automatic, based on previous toolpath residuals, or direct geometry analysis"),
  include_fillets: z
    .boolean()
    .default(true)
    .describe("Include fillet radius regions in pencil trace detection"),
  include_corners: z
    .boolean()
    .default(true)
    .describe("Include sharp/blended corner regions in pencil trace detection"),
  include_pockets: z
    .boolean()
    .default(false)
    .describe("Include pocket floor-to-wall transitions in pencil trace detection"),
  // Approach / retract
  approach_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Approach move type into pencil trace region"),
  retract_type: z
    .enum(["tangent", "arc", "direct"])
    .describe("Retract move type out of pencil trace region"),
  // Safety
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking against fixture and stock model"),
  gouge_check: z
    .boolean()
    .default(true)
    .describe("Enable gouge checking to prevent tool from cutting below detected corner line"),
});

export type Pencil = z.infer<typeof pencilSchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 4 3D core cycle schemas keyed by cycle type */
export const THREE_D_CORE_SCHEMA_MAP = {
  z_level: zLevelSchema,
  parallel: parallelSchema,
  scallop: scallopSchema,
  pencil: pencilSchema,
} as const;

export type ThreeDCoreType = keyof typeof THREE_D_CORE_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every 3D core cycle type */
export interface ThreeDCoreMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each 3D core cycle type with AC Python setter references */
export const THREE_D_CORE_METADATA: Record<ThreeDCoreType, ThreeDCoreMeta> = {
  z_level: {
    paramCount: 65,
    acPythonSetter: "hm.3d.z_level",
    description:
      "Z-level contouring with constant/adaptive stepdown for steep wall finishing and roughing",
    dfmCriticalParams: ["stepdown"],
  },
  parallel: {
    paramCount: 55,
    acPythonSetter: "hm.3d.parallel",
    description:
      "Parallel finishing with planar passes at a fixed angle for shallow-to-moderate surfaces",
    dfmCriticalParams: ["stepover"],
  },
  scallop: {
    paramCount: 45,
    acPythonSetter: "hm.3d.scallop",
    description:
      "Scallop-height-driven finishing with adaptive stepover for uniform cusp height on complex geometry",
    dfmCriticalParams: ["cusp_height_target"],
  },
  pencil: {
    paramCount: 35,
    acPythonSetter: "hm.3d.pencil",
    description:
      "Pencil tracing along detected corners and fillets for rest material cleanup in concave regions",
    dfmCriticalParams: ["corner_radius_detect"],
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 4 3D core cycle schemas */
export const THREE_D_CORE_TOTAL_PARAM_COUNT = Object.values(THREE_D_CORE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
