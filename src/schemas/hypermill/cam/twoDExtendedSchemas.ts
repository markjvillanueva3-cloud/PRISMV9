/**
 * 2D Extended Cycle Parameter Schemas — hyperMILL 2D Specialty Cycles
 *
 * U-HKC18: Zod schemas for 6 additional 2D cycle types: Slot Mill, Chamfer 2D,
 * T-Slot, Plunge Rough, Rest 2D, and Engrave. Each schema embeds the shared 2D
 * base (cutting data, geometry, heights) plus type-specific parameters.
 *
 * AC Python call pattern:
 *   hm.2d.slot_mill(slot_width=8.0, slot_depth=10.0, ...)
 *
 * @domain CAM-2D
 * @milestone HM-KC-MS3/U-HKC18
 */

import { z } from "zod";

// ── Shared enums ────────────────────────────────────────────────────────────

const boundaryModeEnum = z.enum(["open", "closed", "auto"]);
const offsetSideEnum = z.enum(["left", "right", "on"]);
const coolantModeEnum = z.enum(["flood", "mist", "through_tool", "air_blast", "off"]);
const directionEnum = z.enum(["climb", "conventional", "auto"]);
const stockToLeaveMode = z.enum(["none", "radial_only", "axial_only", "both"]);
const retractModeEnum = z.enum(["rapid", "feed", "clearance"]);
const linkingModeEnum = z.enum(["direct", "skim", "clearance"]);
const cornerModeEnum = z.enum(["sharp", "round", "loop", "chamfer"]);

// ── Metadata type ───────────────────────────────────────────────────────────

/** Metadata record for every 2D extended cycle type */
export interface TwoDExtendedMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Slot Mill (38 params) ────────────────────────────────────────────────

export const twoDSlotMillSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("closed").describe("Slot boundary interpretation"),
  offset_side: offsetSideEnum.default("on").describe("Tool offset side for slot milling"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth of slot, mm"),

  // -- Safety margins (shared base) --
  stock_to_leave_mode: stockToLeaveMode.default("both").describe("Stock-to-leave application mode"),
  stock_to_leave_radial: z.number().min(0).max(10).default(0).describe("Radial stock to leave, mm"),

  // -- Slot mill-specific --
  slot_width: z.number().min(0.5).max(200).describe("Target slot width, mm"),
  slot_depth: z.number().min(0.1).max(200).describe("Target slot depth, mm"),
  single_pass: z.boolean().default(false).describe("Machine slot in a single pass (width = tool diameter)"),
  helical_entry: z.boolean().default(true).describe("Use helical entry into slot"),
  entry_angle: z.number().min(0.5).max(45).default(3).describe("Helical/ramp entry angle, degrees"),
  plunge_mode: z.enum(["center", "side"]).default("center").describe("Plunge position within slot"),
  stepdown: z.number().min(0.05).max(100).default(2.0).describe("Depth per pass, mm — DFM critical"),
  floor_finish: z.boolean().default(true).describe("Enable floor finishing pass"),
  wall_finish: z.boolean().default(true).describe("Enable wall finishing pass"),
  direction: directionEnum.default("climb").describe("Cutting direction strategy"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("skim").describe("Linking between depth levels"),
  corner_mode: cornerModeEnum.default("round").describe("Corner handling at slot ends"),
  finishing_passes: z.number().int().min(0).max(10).default(1).describe("Number of finishing passes"),
  finishing_allowance: z.number().min(0).max(5).default(0).describe("Finishing stock allowance, mm"),
  ramp_type: z.enum(["linear", "helical", "plunge"]).default("helical").describe("Ramp entry type"),
  open_slot: z.boolean().default(false).describe("Slot is open on one or both ends"),
  overlap_at_ends: z.number().min(0).max(20).default(0).describe("Overcut at slot ends, mm"),
  dwell_at_bottom: z.number().min(0).max(10).default(0).describe("Dwell time at slot bottom, seconds"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for floor accuracy"),
  approach_distance: z.number().min(0).max(50).default(5).describe("Approach distance to slot, mm"),
});

export type TwoDSlotMill = z.infer<typeof twoDSlotMillSchema>;

// ── 2. Chamfer 2D (35 params) ───────────────────────────────────────────────

export const twoDChamferSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("mist").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Chamfer boundary interpretation"),
  offset_side: offsetSideEnum.default("on").describe("Tool offset side for chamfer"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom reference depth, mm"),

  // -- Chamfer-specific --
  chamfer_width: z.number().min(0.1).max(20).describe("Chamfer width measured along edge, mm"),
  chamfer_angle: z.enum(["45", "60", "90"]).default("45").describe("Chamfer angle, degrees"),
  custom_angle: z.number().min(1).max(89).optional().describe("Custom chamfer angle if not standard, degrees"),
  tip_offset: z.number().min(-5).max(5).default(0).describe("Tool tip offset from calculated depth, mm"),
  depth_from_edge: z.number().min(0.05).max(20).describe("Depth measured from edge, mm"),
  multiple_passes: z.boolean().default(false).describe("Use multiple passes for large chamfers"),
  pass_count: z.number().int().min(1).max(10).default(1).describe("Number of chamfer passes"),
  entry_mode: z.enum(["direct", "tangent", "ramp"]).default("tangent").describe("Approach strategy"),
  lead_in_radius: z.number().min(0).max(50).default(3).describe("Lead-in arc radius, mm"),
  lead_out_radius: z.number().min(0).max(50).default(3).describe("Lead-out arc radius, mm"),
  direction: directionEnum.default("climb").describe("Cutting direction"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  corner_slowdown: z.boolean().default(true).describe("Slow down at corners"),
  corner_feed_pct: z.number().min(10).max(100).default(70).describe("Feed rate % at corners"),
  deburr_mode: z.boolean().default(false).describe("Deburring mode — light touch, no depth control"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for finish quality"),
  overcut_distance: z.number().min(0).max(20).default(0).describe("Overcut beyond chamfer end, mm"),
  stock_to_leave: z.number().min(0).max(2).default(0).describe("Stock to leave on chamfer surface, mm"),
});

export type TwoDChamfer = z.infer<typeof twoDChamferSchema>;

// ── 3. T-Slot (38 params) ───────────────────────────────────────────────────

export const twoDTSlotSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("closed").describe("T-slot boundary interpretation"),
  offset_side: offsetSideEnum.default("on").describe("Tool offset side for T-slot"),
  tolerance: z.number().min(0.001).max(1.0).default(0.005).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom of T-slot, mm"),

  // -- T-Slot-specific --
  neck_width: z.number().min(1).max(100).describe("Neck (narrow) slot width, mm"),
  head_width: z.number().min(2).max(200).describe("Head (wide) undercut width, mm"),
  total_depth: z.number().min(1).max(200).describe("Total T-slot depth, mm"),
  approach_side: z.enum(["left", "right"]).default("left").describe("Side from which tool approaches"),
  neck_depth: z.number().min(0.5).max(150).describe("Depth of neck portion, mm"),
  head_height: z.number().min(0.5).max(100).describe("Height of undercut head, mm"),
  retract_strategy: z.enum(["full", "partial", "none"]).default("full").describe("Retract strategy between passes"),
  stepdown: z.number().min(0.05).max(50).default(1.0).describe("Depth per pass, mm"),
  stepover: z.number().min(0.1).max(50).default(1.0).describe("Lateral step for undercut, mm"),
  direction: directionEnum.default("climb").describe("Cutting direction"),
  roughing_passes: z.number().int().min(1).max(20).default(2).describe("Number of roughing passes"),
  finishing_passes: z.number().int().min(0).max(10).default(1).describe("Number of finishing passes"),
  finishing_allowance: z.number().min(0).max(3).default(0.1).describe("Finishing stock allowance, mm"),
  retract_mode: retractModeEnum.default("feed").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("direct").describe("Linking strategy"),
  corner_mode: cornerModeEnum.default("round").describe("Corner handling"),
  pre_slot_required: z.boolean().default(true).describe("Require pre-machined neck slot before T-slot"),
  dwell_at_undercut: z.number().min(0).max(5).default(0).describe("Dwell at undercut transition, seconds"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass"),
  safe_z_above_neck: z.number().min(0).max(50).default(2).describe("Safe Z clearance above neck, mm"),
  coolant_pressure: z.enum(["standard", "high", "ultra_high"]).default("high").describe("Coolant pressure for chip evacuation"),
});

export type TwoDTSlot = z.infer<typeof twoDTSlotSchema>;

// ── 4. Plunge Rough (35 params) ─────────────────────────────────────────────

export const twoDPlungeRoughSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min — primary cutting motion"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Plunge region boundary"),
  offset_side: offsetSideEnum.default("right").describe("Tool offset side"),
  tolerance: z.number().min(0.001).max(1.0).default(0.01).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height above part, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth, mm"),

  // -- Plunge rough-specific --
  retract_height: z.number().min(0.5).max(100).default(2).describe("Retract height between plunges, mm"),
  overlap_pct: z.number().min(5).max(80).default(30).describe("Plunge overlap percentage, %"),
  stepover: z.number().min(0.1).max(100).describe("Stepover between plunge rows, mm"),
  plunge_depth: z.number().min(0.5).max(200).describe("Maximum plunge depth per cycle, mm"),
  rapid_retract: z.boolean().default(true).describe("Use rapid motion for retract"),
  spiral_order: z.boolean().default(false).describe("Spiral plunge order (vs. row-by-row)"),
  plunge_pattern: z.enum(["grid", "offset", "boundary_follow"]).default("grid").describe("Plunge point distribution pattern"),
  direction: directionEnum.default("auto").describe("Plunge sequence direction"),
  stock_to_leave_radial: z.number().min(0).max(10).default(0.5).describe("Radial stock to leave, mm"),
  stock_to_leave_axial: z.number().min(0).max(10).default(0.3).describe("Axial stock to leave, mm"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("clearance").describe("Linking between plunge positions"),
  dwell_at_bottom: z.number().min(0).max(5).default(0).describe("Dwell at plunge bottom, seconds"),
  pecking: z.boolean().default(false).describe("Enable pecking for deep plunges"),
  peck_depth: z.number().min(0.1).max(50).optional().describe("Pecking depth per cycle, mm"),
  chip_break_retract: z.number().min(0).max(10).default(0.5).describe("Chip break retract distance, mm"),
  avoid_re_plunge: z.boolean().default(true).describe("Avoid plunging into previously machined areas"),
  boundary_offset: z.number().min(0).max(20).default(1).describe("Offset from boundary for first plunge row, mm"),
  min_plunge_depth: z.number().min(0.1).max(50).default(0.5).describe("Minimum plunge depth to execute, mm"),
});

export type TwoDPlungeRough = z.infer<typeof twoDPlungeRoughSchema>;

// ── 5. Rest 2D (33 params) ──────────────────────────────────────────────────

export const twoDRestSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("flood").describe("Coolant delivery mode"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("auto").describe("Rest region boundary interpretation"),
  offset_side: offsetSideEnum.default("right").describe("Tool offset side"),
  tolerance: z.number().min(0.001).max(1.0).default(0.005).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom depth, mm"),

  // -- Rest 2D-specific --
  previous_tool_diameter: z.number().min(0.5).max(200).describe("Previous operation tool diameter, mm"),
  stock_source: z.enum(["from_previous", "ipw", "stock_model"]).default("from_previous").describe("Source for remaining stock calculation"),
  min_rest_width: z.number().min(0.05).max(50).default(0.5).describe("Minimum rest material width to machine, mm"),
  overlap: z.number().min(0).max(20).default(1).describe("Overlap into previously machined areas, mm"),
  detect_corners: z.boolean().default(true).describe("Detect and clean internal corners"),
  corner_radius_threshold: z.number().min(0.1).max(50).default(5).describe("Corner radius threshold for detection, mm"),
  stepdown: z.number().min(0.05).max(100).default(1.0).describe("Depth per pass, mm"),
  stepover_pct: z.number().min(5).max(90).default(40).describe("Stepover as % of tool diameter"),
  direction: directionEnum.default("climb").describe("Cutting direction"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("skim").describe("Linking between rest regions"),
  corner_mode: cornerModeEnum.default("round").describe("Corner handling"),
  ramp_entry: z.boolean().default(true).describe("Use ramp entry into rest areas"),
  ramp_angle: z.number().min(0.5).max(30).default(3).describe("Ramp angle, degrees"),
  finishing_passes: z.number().int().min(0).max(10).default(1).describe("Number of finishing passes"),
  finishing_allowance: z.number().min(0).max(3).default(0).describe("Finishing stock allowance, mm"),
  ipw_tolerance: z.number().min(0.001).max(1).default(0.01).describe("In-process workpiece tolerance, mm"),
});

export type TwoDRest = z.infer<typeof twoDRestSchema>;

// ── 6. Engrave (32 params) ──────────────────────────────────────────────────

export const twoDEngraveSchema = z.object({
  // -- Cutting data (shared base) --
  spindle_speed: z.number().min(10).max(80000).describe("Spindle speed, RPM"),
  feed_rate: z.number().min(1).max(50000).describe("Cutting feed rate, mm/min"),
  plunge_feed: z.number().min(0.5).max(10000).describe("Plunge feed rate, mm/min"),
  ramp_feed: z.number().min(0.5).max(10000).describe("Ramp feed rate, mm/min"),
  finishing_feed: z.number().min(1).max(50000).describe("Finishing pass feed rate, mm/min"),
  coolant_mode: coolantModeEnum.default("air_blast").describe("Coolant delivery mode — typically air for engraving"),

  // -- Geometry (shared base) --
  boundary_mode: boundaryModeEnum.default("closed").describe("Engrave boundary interpretation"),
  offset_side: offsetSideEnum.default("on").describe("Tool offset side for engraving"),
  tolerance: z.number().min(0.001).max(0.5).default(0.005).describe("Geometric tolerance, mm"),
  z_start: z.number().describe("Z-axis start height, mm"),
  z_end: z.number().describe("Z-axis end depth, mm"),

  // -- Heights (shared base) --
  clearance: z.number().min(0).default(50).describe("Clearance plane height, mm"),
  retract: z.number().min(0).default(5).describe("Retract height, mm"),
  feed_height: z.number().min(0).default(2).describe("Feed engage height, mm"),
  top: z.number().default(0).describe("Top of stock reference, mm"),
  bottom: z.number().describe("Bottom of engrave, mm"),

  // -- Engrave-specific --
  engrave_depth: z.number().min(0.01).max(10).describe("Engraving depth, mm"),
  character_spacing: z.number().min(0).max(20).default(0).describe("Additional spacing between characters, mm"),
  line_spacing: z.number().min(0).max(50).default(2).describe("Spacing between text lines, mm"),
  text_angle: z.number().min(0).max(360).default(0).describe("Text rotation angle, degrees"),
  font_name: z.string().default("sans-serif").describe("Font name for text engraving"),
  single_line: z.boolean().default(false).describe("Use single-line (stroke) font"),
  v_bit_angle: z.number().min(10).max(120).default(60).describe("V-bit included angle, degrees"),
  depth_per_pass: z.number().min(0.01).max(5).default(0.1).describe("Depth per engraving pass, mm"),
  multiple_passes: z.boolean().default(false).describe("Use multiple depth passes"),
  direction: directionEnum.default("auto").describe("Engraving direction"),
  retract_mode: retractModeEnum.default("rapid").describe("Retract motion type"),
  linking_mode: linkingModeEnum.default("direct").describe("Linking between characters/segments"),
  optimize_path: z.boolean().default(true).describe("Optimize travel between engrave segments"),
  mirror_text: z.boolean().default(false).describe("Mirror text for stamp/mold engraving"),
  text_height: z.number().min(0.5).max(200).default(5).describe("Text character height, mm"),
  spring_pass: z.boolean().default(false).describe("Additional spring pass for surface quality"),
});

export type TwoDEngrave = z.infer<typeof twoDEngraveSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 2D extended schemas keyed by cycle type */
export const TWO_D_EXTENDED_SCHEMA_MAP = {
  slot_mill: twoDSlotMillSchema,
  chamfer: twoDChamferSchema,
  t_slot: twoDTSlotSchema,
  plunge_rough: twoDPlungeRoughSchema,
  rest_2d: twoDRestSchema,
  engrave: twoDEngraveSchema,
} as const;

export type TwoDExtendedType = keyof typeof TWO_D_EXTENDED_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each 2D extended cycle type with AC Python setter references */
export const TWO_D_EXTENDED_METADATA: Record<TwoDExtendedType, TwoDExtendedMeta> = {
  slot_mill: {
    paramCount: Object.keys(twoDSlotMillSchema.shape).length,
    acPythonSetter: "hm.2d.slot_mill",
    description: "2D slot milling with helical entry, wall/floor finishing, and open-slot support",
    dfmCriticalParams: ["slot_width", "stepdown", "entry_angle"],
  },
  chamfer: {
    paramCount: Object.keys(twoDChamferSchema.shape).length,
    acPythonSetter: "hm.2d.chamfer",
    description: "2D chamfer milling with configurable angle, multi-pass, and deburr mode",
    dfmCriticalParams: ["chamfer_width", "chamfer_angle", "depth_from_edge"],
  },
  t_slot: {
    paramCount: Object.keys(twoDTSlotSchema.shape).length,
    acPythonSetter: "hm.2d.t_slot",
    description: "T-slot milling with neck/head geometry, undercut control, and high-pressure coolant",
    dfmCriticalParams: ["neck_width", "head_width", "total_depth", "neck_depth"],
  },
  plunge_rough: {
    paramCount: Object.keys(twoDPlungeRoughSchema.shape).length,
    acPythonSetter: "hm.2d.plunge_rough",
    description: "Plunge roughing with grid/spiral patterns, pecking, and re-plunge avoidance",
    dfmCriticalParams: ["plunge_depth", "stepover", "overlap_pct"],
  },
  rest_2d: {
    paramCount: Object.keys(twoDRestSchema.shape).length,
    acPythonSetter: "hm.2d.rest_2d",
    description: "2D rest machining from previous tool with corner detection and IPW support",
    dfmCriticalParams: ["previous_tool_diameter", "min_rest_width"],
  },
  engrave: {
    paramCount: Object.keys(twoDEngraveSchema.shape).length,
    acPythonSetter: "hm.2d.engrave",
    description: "2D text/geometry engraving with V-bit angle control and path optimization",
    dfmCriticalParams: ["engrave_depth", "v_bit_angle"],
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 6 extended 2D cycle schemas */
export const TWO_D_EXTENDED_TOTAL_PARAM_COUNT = Object.values(TWO_D_EXTENDED_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
