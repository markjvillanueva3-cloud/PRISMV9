/**
 * 3D Advanced Cycle Parameter Schemas — hyperMILL 3D Specialty Cycles
 *
 * U-HKC20: Zod schemas for 8 advanced 3D cycle types: Rest Roughing 3D,
 * Rest Finishing 3D, MAXX Offset Roughing, MAXX HPC Roughing, Optimized
 * Roughing, Flowline, Geodesic, and Morphed. Each schema embeds the shared
 * 3D base (~20 fields) plus type-specific parameters.
 *
 * AC Python call pattern:
 *   hm.3d.rest_roughing(previous_tool_diameter=12.0, ...)
 *
 * @domain CAM-3D
 * @milestone HM-KC-MS3/U-HKC20
 */

import { z } from "zod";

// ── Shared enums ────────────────────────────────────────────────────────────

const coolantModeEnum = z.enum(["flood", "mist", "through_tool", "air_blast", "off"]);
const boundaryModeEnum = z.enum(["open", "closed", "auto"]);
const toolCompEnum = z.enum(["none", "wear", "inverse_wear"]);
const compDirectionEnum = z.enum(["left", "right", "off"]);
const restSourceEnum = z.enum(["from_previous", "ipw", "stock_model"]);

// ── Metadata type ───────────────────────────────────────────────────────────

/** Metadata record for every 3D advanced cycle type */
export interface ThreeDAdvancedMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── Shared 3D base field builder ────────────────────────────────────────────

/**
 * Creates the 20 shared 3D base fields common to all advanced 3D cycles.
 * Embedded directly into each schema (not extended) to keep schemas flat.
 */
function threeDBaseFields() {
  return {
    // -- Cutting data --
    spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
    feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
    plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
    finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
    coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

    // -- Tolerance --
    tolerance: z.number().min(0.0001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
    surface_tolerance: z.number().min(0.0001).max(1.0).default(0.005).describe("Surface quality tolerance, mm"),

    // -- Heights --
    clearance_plane: z.number().min(0).default(50).describe("Clearance plane height, mm"),
    retract_height: z.number().min(0).default(5).describe("Retract height above part, mm"),
    feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
    top_surface: z.number().default(0).describe("Top of stock reference, mm"),
    bottom_surface: z.number().describe("Bottom depth limit, mm"),

    // -- Boundary --
    boundary_mode: boundaryModeEnum.default("auto").describe("Boundary interpretation mode"),
    boundary_offset: z.number().min(-50).max(50).default(0).describe("Boundary offset distance, mm"),

    // -- Tool compensation --
    tool_comp: toolCompEnum.default("none").describe("Tool compensation mode"),
    comp_direction: compDirectionEnum.default("off").describe("Compensation direction"),

    // -- Stock allowance --
    stock_allowance_wall: z.number().min(-5).max(20).default(0).describe("Wall stock allowance, mm"),
    stock_allowance_floor: z.number().min(-5).max(20).default(0).describe("Floor stock allowance, mm"),

    // -- Rest machining base --
    rest_machining: z.boolean().default(false).describe("Enable rest machining from previous operation"),
    rest_source: restSourceEnum.default("from_previous").describe("Source for rest material calculation"),
  };
}

// ── 1. Rest Roughing 3D (28 params) ────────────────────────────────────────

export const threeDRestRoughingSchema = z.object({
  ...threeDBaseFields(),

  // -- Rest Roughing-specific --
  previous_tool_diameter: z.number().min(0.5).max(200).describe("Previous tool diameter for rest detection, mm — DFM critical"),
  previous_tool_corner_radius: z.number().min(0).max(50).default(0).describe("Previous tool corner radius, mm"),
  stock_source: restSourceEnum.default("from_previous").describe("Stock reference source for rest calculation"),
  detect_rest_areas: z.boolean().default(true).describe("Automatically detect rest material areas"),
  min_rest_width: z.number().min(0.01).max(50).default(0.5).describe("Minimum rest area width to machine, mm"),
  overlap: z.number().min(0).max(20).default(1.0).describe("Overlap with previous toolpath, mm"),
  multi_level: z.boolean().default(true).describe("Use multiple Z levels for rest roughing"),
  aggressive_rest: z.boolean().default(false).describe("Aggressive rest area detection for deep pockets"),
  stepdown: z.number().min(0.05).max(100).default(1.0).describe("Depth per pass, mm"),
  stepover: z.number().min(0.05).max(100).default(1.0).describe("Lateral step between passes, mm"),
  approach_mode: z.enum(["helical", "ramp", "plunge", "predrill"]).default("ramp").describe("Tool approach strategy"),
  approach_angle: z.number().min(0.5).max(45).default(3).describe("Approach ramp angle, degrees"),
  linking_mode: z.enum(["direct", "retract", "skim"]).default("retract").describe("Linking between passes"),
  corner_cleanup: z.boolean().default(true).describe("Additional passes in tight corners"),
  high_speed_mode: z.boolean().default(false).describe("Enable HSM smoothing for rest roughing"),
  spiral_rest: z.boolean().default(false).describe("Use spiral toolpath for rest areas"),
  optimize_order: z.boolean().default(true).describe("Optimize machining order across rest areas"),
  min_pocket_diameter: z.number().min(0.5).max(200).default(2.0).describe("Minimum pocket diameter to enter, mm"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance from stock, mm"),
  roughing_direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Roughing cutting direction"),
});

export type ThreeDRestRoughing = z.infer<typeof threeDRestRoughingSchema>;

// ── 2. Rest Finishing 3D (28 params) ───────────────────────────────────────

export const threeDRestFinishingSchema = z.object({
  ...threeDBaseFields(),

  // -- Rest Finishing-specific --
  previous_finish_tool: z.string().min(1).max(100).describe("Previous finishing tool identifier"),
  previous_tool_diameter: z.number().min(0.5).max(200).describe("Previous finish tool diameter, mm"),
  scallop_detection: z.boolean().default(true).describe("Detect and machine remaining scallop areas"),
  min_scallop_height: z.number().min(0.0001).max(1.0).default(0.005).describe("Minimum scallop height to address, mm"),
  corner_rest: z.boolean().default(true).describe("Machine rest material in corners"),
  fillet_rest: z.boolean().default(true).describe("Machine rest material in fillets"),
  blend_with_previous: z.boolean().default(true).describe("Blend toolpath with previous finish passes"),
  stepover: z.number().min(0.01).max(50).default(0.2).describe("Lateral step between passes, mm"),
  cusp_height: z.number().min(0.0001).max(1.0).default(0.005).describe("Target cusp height, mm"),
  approach_mode: z.enum(["tangent", "direct", "arc"]).default("tangent").describe("Tool approach strategy"),
  lead_in_radius: z.number().min(0).max(50).default(2).describe("Lead-in arc radius, mm"),
  lead_out_radius: z.number().min(0).max(50).default(2).describe("Lead-out arc radius, mm"),
  surface_extension: z.number().min(0).max(20).default(0).describe("Extend toolpath beyond surface edges, mm"),
  direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Finishing cutting direction"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for surface quality"),
  optimize_retract: z.boolean().default(true).describe("Minimize retract moves between rest areas"),
  smooth_connections: z.boolean().default(true).describe("Smooth arc connections between passes"),
  max_rest_width: z.number().min(0.1).max(100).default(20).describe("Maximum rest area width to process, mm"),
});

export type ThreeDRestFinishing = z.infer<typeof threeDRestFinishingSchema>;

// ── 3. MAXX Offset Roughing (32 params) ────────────────────────────────────

export const threeDMaxxOffsetRoughingSchema = z.object({
  ...threeDBaseFields(),

  // -- MAXX Offset-specific --
  engagement_angle: z.number().min(10).max(180).describe("Tool engagement angle, degrees — DFM critical"),
  max_engagement: z.number().min(10).max(180).default(90).describe("Maximum allowed engagement angle, degrees"),
  hsc_mode: z.boolean().default(true).describe("Enable high-speed cutting mode"),
  optimal_load: z.boolean().default(true).describe("Maintain optimal chip load throughout"),
  step_distribution: z.enum(["uniform", "adaptive"]).default("adaptive").describe("Stepover distribution strategy"),
  radial_depth: z.number().min(0.01).max(100).describe("Radial depth of cut, mm"),
  axial_depth: z.number().min(0.05).max(200).describe("Axial depth of cut, mm"),
  trochoidal: z.boolean().default(false).describe("Enable trochoidal milling segments"),
  trochoidal_width: z.number().min(0.1).max(100).default(5).describe("Trochoidal slot width, mm"),
  entry_type: z.enum(["helical", "ramp", "plunge"]).default("helical").describe("Entry movement type"),
  entry_angle: z.number().min(0.5).max(45).default(3).describe("Helical/ramp entry angle, degrees"),
  min_pocket_width: z.number().min(0.5).max(200).default(3).describe("Minimum pocket width to enter, mm"),
  corner_rounding: z.boolean().default(true).describe("Round internal corners for constant engagement"),
  corner_radius: z.number().min(0).max(50).default(1).describe("Internal corner rounding radius, mm"),
  smoothing: z.boolean().default(true).describe("Smooth toolpath for HSC compatibility"),
  stepdown_mode: z.enum(["constant", "adaptive"]).default("constant").describe("Depth stepping strategy"),
  rest_roughing_link: z.boolean().default(false).describe("Link to subsequent rest roughing operation"),
  chip_evacuation_retract: z.boolean().default(false).describe("Periodic retract for chip evacuation"),
  linking_mode: z.enum(["direct", "retract", "skim"]).default("skim").describe("Linking between passes"),
  spiral_approach: z.boolean().default(true).describe("Use spiral approach into material"),
  feed_ramp_pct: z.number().min(10).max(100).default(50).describe("Feed rate percentage during ramp, %"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
});

export type ThreeDMaxxOffsetRoughing = z.infer<typeof threeDMaxxOffsetRoughingSchema>;

// ── 4. MAXX HPC Roughing (30 params) ──────────────────────────────────────

export const threeDMaxxHpcRoughingSchema = z.object({
  ...threeDBaseFields(),

  // -- MAXX HPC-specific --
  radial_engagement_pct: z.number().min(5).max(100).describe("Radial engagement as percentage of tool diameter, % — DFM critical"),
  axial_depth: z.number().min(0.05).max(200).describe("Axial depth of cut, mm"),
  chip_thinning_compensation: z.boolean().default(true).describe("Compensate feed for chip thinning at low engagement"),
  lateral_entry: z.boolean().default(true).describe("Use lateral entry into material"),
  high_feed_mode: z.boolean().default(false).describe("Enable high-feed milling strategy"),
  tool_load_control: z.boolean().default(true).describe("Active tool load monitoring and control"),
  max_tool_load_pct: z.number().min(10).max(100).default(80).describe("Maximum allowed tool load, %"),
  corner_strategy: z.enum(["slow_down", "lift", "trochoidal"]).default("slow_down").describe("Corner engagement strategy"),
  corner_feed_pct: z.number().min(10).max(100).default(60).describe("Feed rate percentage at corners, %"),
  entry_type: z.enum(["helical", "ramp", "plunge"]).default("helical").describe("Entry movement type"),
  entry_angle: z.number().min(0.5).max(45).default(2).describe("Entry ramp/helix angle, degrees"),
  stepdown: z.number().min(0.05).max(200).default(2.0).describe("Depth per pass, mm"),
  smooth_transitions: z.boolean().default(true).describe("Smooth arc transitions between passes"),
  optimize_air_cuts: z.boolean().default(true).describe("Minimize air cutting movements"),
  min_pocket_diameter: z.number().min(0.5).max(200).default(3).describe("Minimum pocket diameter to enter, mm"),
  linking_mode: z.enum(["direct", "retract", "skim"]).default("skim").describe("Linking between depth levels"),
  spiral_out: z.boolean().default(false).describe("Spiral outward from center"),
  rest_roughing_link: z.boolean().default(false).describe("Link to subsequent rest roughing"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
  feed_ramp_pct: z.number().min(10).max(100).default(50).describe("Feed rate during ramp movements, %"),
});

export type ThreeDMaxxHpcRoughing = z.infer<typeof threeDMaxxHpcRoughingSchema>;

// ── 5. Optimized Roughing (28 params) ──────────────────────────────────────

export const threeDOptimizedRoughingSchema = z.object({
  ...threeDBaseFields(),

  // -- Optimized Roughing-specific --
  adaptive_stepover: z.boolean().default(true).describe("Dynamically adjust stepover based on engagement"),
  min_stepover_pct: z.number().min(5).max(100).default(25).describe("Minimum stepover as % of tool diameter"),
  max_stepover_pct: z.number().min(10).max(100).default(75).describe("Maximum stepover as % of tool diameter"),
  trochoidal_mode: z.boolean().default(false).describe("Enable trochoidal milling in tight areas"),
  trochoidal_width: z.number().min(0.1).max(100).default(5).describe("Trochoidal slot width, mm"),
  engage_angle_limit: z.number().min(10).max(180).default(90).describe("Maximum engagement angle limit, degrees"),
  smooth_transitions: z.boolean().default(true).describe("Smooth arc transitions for HSC"),
  avoid_full_width: z.boolean().default(true).describe("Avoid full-width slotting cuts"),
  stepdown: z.number().min(0.05).max(200).default(2.0).describe("Depth per pass, mm"),
  entry_type: z.enum(["helical", "ramp", "plunge"]).default("helical").describe("Entry movement type"),
  entry_angle: z.number().min(0.5).max(45).default(3).describe("Entry ramp/helix angle, degrees"),
  corner_rounding: z.boolean().default(true).describe("Round internal corners"),
  linking_mode: z.enum(["direct", "retract", "skim"]).default("skim").describe("Linking between passes"),
  direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Cutting direction"),
  optimize_order: z.boolean().default(true).describe("Optimize region machining order"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
  chip_evacuation_retract: z.boolean().default(false).describe("Periodic retract for chip evacuation"),
  spiral_approach: z.boolean().default(true).describe("Use spiral approach into pockets"),
});

export type ThreeDOptimizedRoughing = z.infer<typeof threeDOptimizedRoughingSchema>;

// ── 6. Flowline (26 params) ───────────────────────────────────────────────

export const threeDFlowlineSchema = z.object({
  ...threeDBaseFields(),

  // -- Flowline-specific --
  flow_direction: z.enum(["u", "v", "auto"]).default("auto").describe("Primary flow direction along surface"),
  distribution: z.enum(["uniform", "curvature_based"]).default("uniform").describe("Path distribution strategy"),
  count: z.number().int().min(2).max(1000).default(50).describe("Number of flowline passes"),
  reverse_direction: z.boolean().default(false).describe("Reverse flow direction"),
  extend_paths: z.boolean().default(false).describe("Extend toolpaths beyond surface boundary"),
  extension_distance: z.number().min(0).max(50).default(2).describe("Extension distance beyond boundary, mm"),
  stepover: z.number().min(0.01).max(50).default(0.3).describe("Lateral step between flowlines, mm"),
  cusp_height: z.number().min(0.0001).max(1.0).default(0.005).describe("Target cusp height, mm"),
  lead_in_radius: z.number().min(0).max(50).default(2).describe("Lead-in arc radius, mm"),
  lead_out_radius: z.number().min(0).max(50).default(2).describe("Lead-out arc radius, mm"),
  direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Cutting direction"),
  smooth_connections: z.boolean().default(true).describe("Smooth transitions between flowlines"),
  approach_mode: z.enum(["tangent", "direct", "arc"]).default("tangent").describe("Approach strategy"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
  optimize_retract: z.boolean().default(true).describe("Minimize retract movements"),
});

export type ThreeDFlowline = z.infer<typeof threeDFlowlineSchema>;

// ── 7. Geodesic (26 params) ───────────────────────────────────────────────

export const threeDGeodesicSchema = z.object({
  ...threeDBaseFields(),

  // -- Geodesic-specific --
  iso_direction: z.enum(["u", "v", "diagonal"]).default("u").describe("Iso-parametric direction"),
  stepover: z.number().min(0.01).max(50).default(0.3).describe("Stepover between geodesic passes, mm"),
  curvature_follow: z.boolean().default(true).describe("Follow surface curvature for uniform scallop"),
  max_deviation: z.number().min(0.0001).max(5).default(0.01).describe("Maximum deviation from true geodesic, mm"),
  path_smoothing: z.boolean().default(true).describe("Smooth geodesic paths for HSC compatibility"),
  avoid_singularities: z.boolean().default(true).describe("Detect and avoid surface singularities"),
  cusp_height: z.number().min(0.0001).max(1.0).default(0.005).describe("Target cusp height, mm"),
  lead_in_radius: z.number().min(0).max(50).default(2).describe("Lead-in arc radius, mm"),
  lead_out_radius: z.number().min(0).max(50).default(2).describe("Lead-out arc radius, mm"),
  direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Cutting direction"),
  smooth_connections: z.boolean().default(true).describe("Smooth transitions between passes"),
  approach_mode: z.enum(["tangent", "direct", "arc"]).default("tangent").describe("Approach strategy"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
});

export type ThreeDGeodesic = z.infer<typeof threeDGeodesicSchema>;

// ── 8. Morphed (25 params) ────────────────────────────────────────────────

export const threeDMorphedSchema = z.object({
  ...threeDBaseFields(),

  // -- Morphed-specific --
  drive_surface_mode: z.enum(["offset", "project", "wrap"]).default("offset").describe("Drive surface generation mode"),
  offset_value: z.number().min(-50).max(50).default(0).describe("Offset from drive surface, mm"),
  projection_direction: z.enum(["normal", "z_axis", "custom"]).default("normal").describe("Projection direction for toolpath"),
  wrap_method: z.enum(["conformal", "geodesic"]).default("conformal").describe("Surface wrapping method"),
  intermediate_surfaces: z.number().int().min(0).max(10).default(0).describe("Number of intermediate morphing surfaces"),
  stepover: z.number().min(0.01).max(50).default(0.3).describe("Lateral step between passes, mm"),
  cusp_height: z.number().min(0.0001).max(1.0).default(0.005).describe("Target cusp height, mm"),
  lead_in_radius: z.number().min(0).max(50).default(2).describe("Lead-in arc radius, mm"),
  lead_out_radius: z.number().min(0).max(50).default(2).describe("Lead-out arc radius, mm"),
  direction: z.enum(["climb", "conventional", "auto"]).default("climb").describe("Cutting direction"),
  smooth_connections: z.boolean().default(true).describe("Smooth transitions between passes"),
  approach_mode: z.enum(["tangent", "direct", "arc"]).default("tangent").describe("Approach strategy"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass"),
  safe_distance: z.number().min(0).max(50).default(1.0).describe("Safe distance above stock, mm"),
  blend_tolerance: z.number().min(0.0001).max(1.0).default(0.01).describe("Blending tolerance between morphed surfaces, mm"),
});

export type ThreeDMorphed = z.infer<typeof threeDMorphedSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 3D advanced schemas keyed by cycle type */
export const THREE_D_ADVANCED_SCHEMA_MAP = {
  rest_roughing: threeDRestRoughingSchema,
  rest_finishing: threeDRestFinishingSchema,
  maxx_offset: threeDMaxxOffsetRoughingSchema,
  maxx_hpc: threeDMaxxHpcRoughingSchema,
  optimized_roughing: threeDOptimizedRoughingSchema,
  flowline: threeDFlowlineSchema,
  geodesic: threeDGeodesicSchema,
  morphed: threeDMorphedSchema,
} as const;

export type ThreeDAdvancedType = keyof typeof THREE_D_ADVANCED_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each 3D advanced cycle type with AC Python setter references */
export const THREE_D_ADVANCED_METADATA: Record<ThreeDAdvancedType, ThreeDAdvancedMeta> = {
  rest_roughing: {
    paramCount: Object.keys(threeDRestRoughingSchema.shape).length,
    acPythonSetter: "hm.3d.rest_roughing",
    description: "3D rest roughing with previous tool detection, multi-level, and aggressive rest areas",
    dfmCriticalParams: ["previous_tool_diameter", "min_rest_width", "stepdown"],
  },
  rest_finishing: {
    paramCount: Object.keys(threeDRestFinishingSchema.shape).length,
    acPythonSetter: "hm.3d.rest_finishing",
    description: "3D rest finishing with scallop detection, corner/fillet rest, and blend support",
    dfmCriticalParams: ["previous_tool_diameter", "min_scallop_height"],
  },
  maxx_offset: {
    paramCount: Object.keys(threeDMaxxOffsetRoughingSchema.shape).length,
    acPythonSetter: "hm.3d.maxx_offset",
    description: "MAXX offset roughing with controlled engagement angle and trochoidal support",
    dfmCriticalParams: ["engagement_angle", "radial_depth", "axial_depth"],
  },
  maxx_hpc: {
    paramCount: Object.keys(threeDMaxxHpcRoughingSchema.shape).length,
    acPythonSetter: "hm.3d.maxx_hpc",
    description: "MAXX HPC roughing with radial engagement control and chip thinning compensation",
    dfmCriticalParams: ["radial_engagement_pct", "axial_depth", "max_tool_load_pct"],
  },
  optimized_roughing: {
    paramCount: Object.keys(threeDOptimizedRoughingSchema.shape).length,
    acPythonSetter: "hm.3d.optimized_roughing",
    description: "Optimized roughing with adaptive stepover, trochoidal mode, and full-width avoidance",
    dfmCriticalParams: ["engage_angle_limit", "max_stepover_pct"],
  },
  flowline: {
    paramCount: Object.keys(threeDFlowlineSchema.shape).length,
    acPythonSetter: "hm.3d.flowline",
    description: "Flowline finishing along surface UV directions with curvature-based distribution",
    dfmCriticalParams: ["count", "cusp_height"],
  },
  geodesic: {
    paramCount: Object.keys(threeDGeodesicSchema.shape).length,
    acPythonSetter: "hm.3d.geodesic",
    description: "Geodesic finishing following true surface geodesics with singularity avoidance",
    dfmCriticalParams: ["stepover", "max_deviation"],
  },
  morphed: {
    paramCount: Object.keys(threeDMorphedSchema.shape).length,
    acPythonSetter: "hm.3d.morphed",
    description: "Morphed machining between drive surfaces with conformal/geodesic wrapping",
    dfmCriticalParams: ["offset_value", "intermediate_surfaces"],
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 8 advanced 3D cycle schemas */
export const THREE_D_ADVANCED_TOTAL_PARAM_COUNT = Object.values(THREE_D_ADVANCED_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
