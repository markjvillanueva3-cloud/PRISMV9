/**
 * 2D Cycle Parameter Schemas — hyperMILL 2D Core Cycle Families
 *
 * U-HKC17: Zod schemas for the 3 primary 2D cycle families: Pocket, Contour,
 * and Face Mill. Each schema embeds the shared 2D base (cutting data, geometry,
 * heights) plus type-specific parameters for comprehensive cycle configuration.
 *
 * AC Python call pattern:
 *   hm.2d.pocket(stepdown=2.0, stepover=5.0, direction="climb", ...)
 *
 * @domain CAM-2D
 * @milestone HM-KC-MS3/U-HKC17
 */

import { z } from "zod";

// ── Shared enums ────────────────────────────────────────────────────────────

const boundaryModeEnum = z.enum(["open", "closed", "auto"]);
const offsetSideEnum = z.enum(["left", "right", "on"]);
const coolantModeEnum = z.enum(["flood", "mist", "through_tool", "air_blast", "off"]);
const directionEnum = z.enum(["climb", "conventional", "auto"]);
const rampTypeEnum = z.enum(["linear", "helical", "plunge"]);
const entryPointEnum = z.enum(["center", "edge", "predrill"]);
const approachTypeEnum = z.enum(["direct", "arc", "tangent", "ramp"]);
const leadTypeEnum = z.enum(["arc", "line", "none"]);
const contourDirectionEnum = z.enum(["climb", "conventional"]);
const faceDirEnum = z.enum(["zigzag", "one_way", "spiral"]);
const stepPatternEnum = z.enum(["parallel", "perpendicular", "angle"]);
const engageTypeEnum = z.enum(["direct", "roll_on", "pre_position"]);
const stockToLeaveMode = z.enum(["none", "radial_only", "axial_only", "both"]);
const cornerModeEnum = z.enum(["sharp", "round", "loop", "chamfer"]);
const retractModeEnum = z.enum(["rapid", "feed", "clearance"]);
const linkingModeEnum = z.enum(["direct", "skim", "clearance"]);

// ── Metadata type ───────────────────────────────────────────────────────────

/** Metadata record for every 2D core cycle type */
export interface TwoDCoreMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Pocket 2D (55 params) ────────────────────────────────────────────────

export const twoDPocketSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Pocket boundary interpretation mode"),
  offset_side: offsetSideEnum.default("right").describe("Tool offset side relative to boundary"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height above top, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth of pocket, mm"),

  // -- Safety margins (shared base) --
  stock_to_leave_mode: stockToLeaveMode.default("both").describe("Stock-to-leave application mode"),
  stock_to_leave_radial: z.number().min(0).max(10).default(0).describe("Radial stock to leave, mm"),
  stock_to_leave_axial: z.number().min(0).max(10).default(0).describe("Axial stock to leave, mm"),

  // -- Pocket-specific --
  stepdown: z.number().min(0.05).max(100).default(2.0).describe("Depth of cut per pass, mm — DFM critical"),
  stepover: z.number().min(0.1).max(200).describe("Lateral step between passes, mm"),
  stepover_pct: z.number().min(1).max(100).default(50).describe("Stepover as percentage of tool diameter, %"),
  direction: directionEnum.default("climb").describe("Cutting direction strategy"),
  ramp_angle: z.number().min(0.5).max(90).default(3).describe("Ramp entry angle, degrees"),
  ramp_type: rampTypeEnum.default("helical").describe("Ramp entry strategy"),
  rest_machining: z.boolean().default(false).describe("Enable rest machining from previous operation"),
  island_detection: z.boolean().default(true).describe("Automatic island/boss detection"),
  island_offset: z.number().min(0).max(50).default(0).describe("Additional offset around islands, mm"),
  multiple_depths: z.boolean().default(true).describe("Enable multiple depth passes"),
  roughing_passes: z.number().int().min(0).max(100).default(1).describe("Number of roughing passes"),
  finishing_passes: z.number().int().min(0).max(20).default(1).describe("Number of finishing passes"),
  floor_finish: z.boolean().default(true).describe("Enable floor finishing pass"),
  wall_finish: z.boolean().default(true).describe("Enable wall finishing pass"),
  corner_rounding: z.number().min(0).max(50).default(0).describe("Internal corner rounding radius, mm"),
  entry_point: entryPointEnum.default("center").describe("Tool entry point strategy"),
  open_pocket: z.boolean().default(false).describe("Treat as open pocket (at least one open side)"),
  smooth_overlap: z.number().min(0).max(20).default(0.5).describe("Overlap distance for smooth transitions, mm"),
  corner_mode: cornerModeEnum.default("round").describe("Internal corner handling strategy"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type between passes"),
  linking_mode: linkingModeEnum.default("skim").describe("Linking strategy between passes"),
  high_speed_mode: z.boolean().default(false).describe("Enable HSM-optimized trochoidal path generation"),
  trochoidal_stepover: z.number().min(0.1).max(50).optional().describe("Trochoidal stepover if HSM mode active, mm"),
  trochoidal_diameter: z.number().min(0.5).max(100).optional().describe("Trochoidal loop diameter, mm"),
  thin_wall_mode: z.boolean().default(false).describe("Enable thin wall protection mode"),
  thin_wall_thickness: z.number().min(0.1).max(50).optional().describe("Minimum thin wall thickness for protection, mm"),
  pecking_enabled: z.boolean().default(false).describe("Enable pecking for deep pockets"),
  peck_depth: z.number().min(0.1).max(50).optional().describe("Pecking depth per cycle, mm"),
  dwell_at_bottom: z.number().min(0).max(10).default(0).describe("Dwell time at pocket bottom, seconds"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for floor accuracy"),
  max_engagement_angle: z.number().min(10).max(180).default(90).describe("Maximum tool engagement angle, degrees"),
  min_cutting_length: z.number().min(0).max(50).default(0).describe("Minimum cutting length before retract, mm"),
  approach_distance: z.number().min(0).max(100).default(5).describe("Approach distance to first cut, mm"),
  spiral_from_center: z.boolean().default(true).describe("Spiral outward from center (true) or inward from boundary (false)"),
  radial_finishing_allowance: z.number().min(0).max(5).default(0).describe("Radial finishing allowance, mm"),
  axial_finishing_allowance: z.number().min(0).max(5).default(0).describe("Axial finishing allowance, mm"),
});

export type TwoDPocket = z.infer<typeof twoDPocketSchema>;

// ── 2. Contour 2D (50 params) ───────────────────────────────────────────────

export const twoDContourSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Contour boundary interpretation"),
  offset_side: offsetSideEnum.default("left").describe("Tool offset side relative to contour"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth of contour, mm"),

  // -- Safety margins (shared base) --
  stock_to_leave_mode: stockToLeaveMode.default("both").describe("Stock-to-leave application mode"),
  stock_to_leave_radial: z.number().min(0).max(10).default(0).describe("Radial stock to leave, mm"),
  stock_to_leave_axial: z.number().min(0).max(10).default(0).describe("Axial stock to leave, mm"),

  // -- Contour-specific --
  offset_distance: z.number().min(-50).max(50).default(0).describe("Contour offset distance, mm"),
  approach_type: approachTypeEnum.default("tangent").describe("Approach motion type to contour"),
  lead_in_type: leadTypeEnum.default("arc").describe("Lead-in motion type"),
  lead_in_radius: z.number().min(0.1).max(100).default(5).describe("Lead-in arc radius, mm"),
  lead_in_angle: z.number().min(0).max(180).default(90).describe("Lead-in sweep angle, degrees"),
  lead_out_type: leadTypeEnum.default("arc").describe("Lead-out motion type"),
  lead_out_radius: z.number().min(0.1).max(100).default(5).describe("Lead-out arc radius, mm"),
  lead_out_angle: z.number().min(0).max(180).default(90).describe("Lead-out sweep angle, degrees"),
  overcut_distance: z.number().min(0).max(50).default(0).describe("Overcut extension beyond contour end, mm"),
  multiple_passes: z.number().int().min(1).max(50).default(1).describe("Number of passes along contour"),
  pass_overlap: z.number().min(0).max(20).default(0).describe("Overlap distance between passes, mm"),
  contour_direction: contourDirectionEnum.default("climb").describe("Cutting direction along contour"),
  corner_slowdown: z.boolean().default(true).describe("Reduce feed at internal corners"),
  corner_feed_pct: z.number().min(10).max(100).default(60).describe("Feed rate percentage at corners, %"),
  open_contour: z.boolean().default(false).describe("Contour is open (not closed loop)"),
  tab_machining: z.boolean().default(false).describe("Enable holding tabs along contour"),
  tab_width: z.number().min(0.5).max(50).default(5).describe("Tab width, mm"),
  tab_height: z.number().min(0.2).max(20).default(1).describe("Tab height from bottom, mm"),
  tab_count: z.number().int().min(0).max(50).default(4).describe("Number of tabs along contour"),
  stepdown: z.number().min(0.05).max(100).default(2.0).describe("Depth per pass, mm"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("direct").describe("Linking between depth levels"),
  corner_mode: cornerModeEnum.default("round").describe("Corner handling strategy"),
  extend_start: z.number().min(0).max(50).default(0).describe("Extend contour at start, mm"),
  extend_end: z.number().min(0).max(50).default(0).describe("Extend contour at end, mm"),
  ramp_entry: z.boolean().default(false).describe("Use ramp entry instead of plunge"),
  ramp_angle: z.number().min(0.5).max(45).default(3).describe("Ramp entry angle, degrees"),
  lead_in_overlap: z.number().min(0).max(20).default(0).describe("Overlap distance after lead-in, mm"),
  finishing_passes: z.number().int().min(0).max(10).default(0).describe("Number of finishing passes"),
  finishing_allowance: z.number().min(0).max(5).default(0).describe("Finishing stock allowance, mm"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass at final depth"),
});

export type TwoDContour = z.infer<typeof twoDContourSchema>;

// ── 3. Face Mill 2D (48 params) ─────────────────────────────────────────────

export const twoDFaceMillSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Face boundary interpretation"),
  offset_side: offsetSideEnum.default("right").describe("Tool offset side for face milling"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth, mm"),

  // -- Safety margins (shared base) --
  stock_to_leave_mode: stockToLeaveMode.default("axial_only").describe("Stock-to-leave mode for facing"),
  stock_to_leave_radial: z.number().min(0).max(10).default(0).describe("Radial stock to leave, mm"),
  stock_to_leave_axial: z.number().min(0).max(10).default(0).describe("Axial stock to leave, mm"),

  // -- Face mill-specific --
  width_of_cut: z.number().min(0.5).max(500).describe("Width of cut per pass, mm"),
  overlap_pct: z.number().min(5).max(95).default(70).describe("Overlap between passes, %"),
  direction: faceDirEnum.default("zigzag").describe("Face milling pass direction strategy"),
  step_pattern: stepPatternEnum.default("parallel").describe("Step pattern orientation"),
  cutting_angle: z.number().min(0).max(360).default(0).describe("Cutting pass angle, degrees"),
  bidirectional: z.boolean().default(true).describe("Bidirectional cutting (zigzag)"),
  boundary_extension: z.number().min(0).max(100).default(10).describe("Extend beyond part boundary, mm"),
  engage_type: engageTypeEnum.default("roll_on").describe("Tool engagement strategy"),
  multiple_depths: z.boolean().default(false).describe("Enable multiple depth passes"),
  max_depth_per_pass: z.number().min(0.1).max(50).default(2).describe("Maximum depth per pass, mm"),
  finishing_pass: z.boolean().default(true).describe("Enable finishing pass"),
  finishing_allowance: z.number().min(0).max(5).default(0.1).describe("Finishing allowance, mm"),
  avoid_islands: z.boolean().default(true).describe("Avoid machining over islands/bosses"),
  island_safety_distance: z.number().min(0).max(50).default(2).describe("Safety distance around islands, mm"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("skim").describe("Linking between passes"),
  corner_mode: cornerModeEnum.default("sharp").describe("Corner handling at pass ends"),
  lead_in_distance: z.number().min(0).max(100).default(10).describe("Lead-in approach distance, mm"),
  lead_out_distance: z.number().min(0).max(100).default(10).describe("Lead-out exit distance, mm"),
  clean_between_passes: z.boolean().default(false).describe("Clean (air) pass between depth levels"),
  face_stock_offset: z.number().min(0).max(20).default(0).describe("Additional stock offset for face, mm"),
  maintain_contact: z.boolean().default(true).describe("Maintain tool contact during direction changes"),
  partial_retract_height: z.number().min(0).max(50).default(1).describe("Partial retract between passes, mm"),
  ramp_entry: z.boolean().default(false).describe("Use ramp entry for first engagement"),
  ramp_angle: z.number().min(0.5).max(45).default(5).describe("Ramp entry angle, degrees"),
  dwell_at_corners: z.number().min(0).max(5).default(0).describe("Dwell time at corners, seconds"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for flatness"),
  first_pass_offset: z.number().min(0).max(20).default(0).describe("Offset of first pass from boundary, mm"),
  max_width_of_cut_pct: z.number().min(10).max(100).default(80).describe("Maximum width of cut as % of tool diameter"),
});

export type TwoDFaceMill = z.infer<typeof twoDFaceMillSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 2D core schemas keyed by cycle type */
export const TWO_D_CORE_SCHEMA_MAP = {
  pocket: twoDPocketSchema,
  contour: twoDContourSchema,
  face_mill: twoDFaceMillSchema,
} as const;

export type TwoDCoreType = keyof typeof TWO_D_CORE_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each 2D core cycle type with AC Python setter references */
export const TWO_D_CORE_METADATA: Record<TwoDCoreType, TwoDCoreMeta> = {
  pocket: {
    paramCount: Object.keys(twoDPocketSchema.shape).length,
    acPythonSetter: "hm.2d.pocket",
    description: "2D pocket milling with roughing/finishing, island detection, and HSM trochoidal support",
    dfmCriticalParams: ["stepdown", "stepover", "ramp_angle", "max_engagement_angle"],
  },
  contour: {
    paramCount: Object.keys(twoDContourSchema.shape).length,
    acPythonSetter: "hm.2d.contour",
    description: "2D contour milling with lead-in/out arcs, tabs, corner slowdown, and multi-pass depth control",
    dfmCriticalParams: ["lead_in_radius", "stepdown", "corner_feed_pct"],
  },
  face_mill: {
    paramCount: Object.keys(twoDFaceMillSchema.shape).length,
    acPythonSetter: "hm.2d.face_mill",
    description: "2D face milling with zigzag/spiral patterns, island avoidance, and spring pass for flatness",
    dfmCriticalParams: ["max_depth_per_pass", "width_of_cut", "overlap_pct"],
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 3 core 2D cycle schemas */
export const TWO_D_CORE_TOTAL_PARAM_COUNT = Object.values(TWO_D_CORE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
