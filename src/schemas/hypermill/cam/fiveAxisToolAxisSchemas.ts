/**
 * 5-Axis Tool Axis Control Schemas — hyperMILL CAM
 *
 * U-HKC23: Zod schemas for 13 five-axis cycle types with tool axis
 * control parameters. Each cycle defines orientation, tilt, lead/lag,
 * and axis interpolation modes specific to its machining strategy.
 *
 * AC Python call pattern:
 *   hm.5x.swarf(tilt_angle=15, lead_angle=3, tool_axis_mode="lead_lag", ...)
 *
 * @domain CAM-5Axis-ToolAxis
 * @milestone HM-KC-MS4/U-HKC23
 */

import { z } from "zod";

// ── 1. Swarf Cutting (10 params) ─────────────────────────────────────────────

export const swarfCuttingToolAxisSchema = z.object({
  tilt_angle: z
    .number()
    .min(-90)
    .max(90)
    .describe("Tool tilt angle relative to surface normal for flank engagement, degrees"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Lead angle in feed direction for chip thinning control, degrees"),
  lag_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Lag angle opposite to feed direction for exit control, degrees"),
  lean_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Lean angle perpendicular to feed direction for side engagement, degrees"),
  tilt_direction: z
    .enum(["normal", "along_path", "to_point"])
    .describe("Reference direction for tilt angle measurement"),
  tool_axis_mode: z
    .enum(["fixed", "lead_lag", "interpolated", "4axis_wrap"])
    .describe("Tool axis control strategy for multi-axis motion"),
  projection_surface: z
    .string()
    .min(1)
    .max(256)
    .default("auto")
    .describe("Reference surface name or ID for axis projection calculation"),
  axis_limit_check: z
    .boolean()
    .default(true)
    .describe("Enable kinematic axis limit validation before toolpath output"),
  axis_smoothing: z
    .boolean()
    .default(true)
    .describe("Enable smooth axis interpolation to avoid jerky rotary motion"),
  max_axis_change_rate: z
    .number()
    .min(0.1)
    .max(90)
    .default(15)
    .describe("Maximum allowable axis orientation change per step, degrees/mm"),
});

export type SwarfCuttingToolAxis = z.infer<typeof swarfCuttingToolAxisSchema>;

// ── 2. Point Milling (10 params) ─────────────────────────────────────────────

export const pointMillingToolAxisSchema = z.object({
  tool_orientation: z
    .enum(["normal", "to_line", "to_point", "tilted_fixed"])
    .describe("Tool orientation strategy relative to surface geometry"),
  lead: z
    .number()
    .min(-60)
    .max(60)
    .default(0)
    .describe("Lead angle for point contact control in feed direction, degrees"),
  lag: z
    .number()
    .min(-60)
    .max(60)
    .default(0)
    .describe("Lag angle for trailing edge engagement control, degrees"),
  tilt_min: z
    .number()
    .min(0)
    .max(90)
    .default(0)
    .describe("Minimum allowed tilt angle for DFM collision clearance, degrees (DFM-critical)"),
  tilt_max: z
    .number()
    .min(0)
    .max(90)
    .default(45)
    .describe("Maximum allowed tilt angle for DFM axis travel limits, degrees (DFM-critical)"),
  smooth_axis_change: z
    .boolean()
    .default(true)
    .describe("Enable gradual axis orientation transitions between passes"),
  axis_interpolation_mode: z
    .enum(["linear", "spline", "minimum_rotation"])
    .default("spline")
    .describe("Interpolation method for tool axis between control points"),
  contact_point_offset: z
    .number()
    .min(-50)
    .max(50)
    .default(0)
    .describe("Offset of effective contact point from tool tip along axis, mm"),
  reference_direction_x: z
    .number()
    .min(-1)
    .max(1)
    .default(0)
    .describe("X-component of reference direction vector for tilted_fixed mode"),
  reference_direction_z: z
    .number()
    .min(-1)
    .max(1)
    .default(1)
    .describe("Z-component of reference direction vector for tilted_fixed mode"),
});

export type PointMillingToolAxis = z.infer<typeof pointMillingToolAxisSchema>;

// ── 3. Contour 5X (10 params) ────────────────────────────────────────────────

export const contour5xToolAxisSchema = z.object({
  side_tilt: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Side tilt angle perpendicular to contour path, degrees"),
  forward_tilt: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Forward tilt angle along contour path direction, degrees"),
  comp_normal: z
    .boolean()
    .default(true)
    .describe("Compensate tool axis to maintain normal contact with varying curvature"),
  constant_contact: z
    .boolean()
    .default(false)
    .describe("Maintain constant tool-to-surface contact angle along contour"),
  axis_lock: z
    .enum(["none", "a_axis", "b_axis", "c_axis"])
    .default("none")
    .describe("Lock a specific rotary axis during contour following"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Lead angle relative to contour feed direction, degrees"),
  tilt_smoothing_radius: z
    .number()
    .min(0)
    .max(100)
    .default(5)
    .describe("Smoothing radius for tilt angle transitions at corners, mm"),
  max_angular_step: z
    .number()
    .min(0.01)
    .max(30)
    .default(5)
    .describe("Maximum angular step size between interpolation points, degrees"),
  wall_offset: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Lateral offset from contour wall for tool clearance, mm"),
  bottom_offset: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Vertical offset from contour floor for depth control, mm"),
});

export type Contour5xToolAxis = z.infer<typeof contour5xToolAxisSchema>;

// ── 4. Pocket 5X (10 params) ─────────────────────────────────────────────────

export const pocket5xToolAxisSchema = z.object({
  axis_strategy: z
    .enum(["normal", "vertical", "tilted"])
    .describe("Primary axis orientation strategy for pocket machining"),
  max_tilt: z
    .number()
    .min(0)
    .max(90)
    .default(30)
    .describe("Maximum tilt angle from vertical for auto-tilt mode, degrees"),
  auto_collision_tilt: z
    .boolean()
    .default(true)
    .describe("Automatically tilt tool axis to avoid holder-to-wall collision"),
  tilt_step_angle: z
    .number()
    .min(0.5)
    .max(15)
    .default(2)
    .describe("Angular step size for collision tilt search algorithm, degrees"),
  floor_normal_align: z
    .boolean()
    .default(false)
    .describe("Align tool axis to pocket floor surface normal instead of Z-axis"),
  wall_clearance_angle: z
    .number()
    .min(0)
    .max(30)
    .default(3)
    .describe("Additional clearance angle from pocket walls for safe motion, degrees"),
  axis_transition_mode: z
    .enum(["linear", "smooth", "rapid"])
    .default("smooth")
    .describe("Transition mode when axis changes between pocket regions"),
  lead_in_axis: z
    .enum(["vertical", "tilted", "tangent"])
    .default("vertical")
    .describe("Tool axis orientation during lead-in approach move"),
  min_effective_diameter: z
    .number()
    .min(0.1)
    .max(100)
    .default(1)
    .describe("Minimum effective cutting diameter when tilted from vertical, mm"),
  depth_per_tilt_level: z
    .number()
    .min(0.1)
    .max(50)
    .default(5)
    .describe("Axial depth increment per tilt level change, mm"),
});

export type Pocket5xToolAxis = z.infer<typeof pocket5xToolAxisSchema>;

// ── 5. Profile 5X (10 params) ────────────────────────────────────────────────

export const profile5xToolAxisSchema = z.object({
  lead_angle: z
    .number()
    .min(-60)
    .max(60)
    .default(0)
    .describe("Lead angle relative to profile feed direction, degrees"),
  lean_angle: z
    .number()
    .min(-60)
    .max(60)
    .default(0)
    .describe("Lean angle perpendicular to profile path, degrees"),
  tool_reach: z
    .number()
    .min(0)
    .max(500)
    .describe("Effective tool reach from gauge line to tip for deep profile access, mm"),
  gauge_compensation: z
    .boolean()
    .default(false)
    .describe("Apply gauge length compensation for tool deflection at extended reach"),
  tilt_to_profile: z
    .boolean()
    .default(true)
    .describe("Tilt tool axis to follow profile wall angle changes"),
  profile_normal_offset: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Normal offset from profile surface for finish stock, mm"),
  axis_lock_angle: z
    .number()
    .min(0)
    .max(90)
    .default(0)
    .describe("Fixed axis lock angle when tilt_to_profile is disabled, degrees"),
  smooth_transitions: z
    .boolean()
    .default(true)
    .describe("Smooth axis orientation transitions at profile corners and direction changes"),
  max_reach_tilt: z
    .number()
    .min(0)
    .max(60)
    .default(30)
    .describe("Maximum tilt angle allowed at full tool reach for stability, degrees"),
  contact_width: z
    .number()
    .min(0.01)
    .max(100)
    .default(5)
    .describe("Desired tool-to-profile contact width for consistent cutting, mm"),
});

export type Profile5xToolAxis = z.infer<typeof profile5xToolAxisSchema>;

// ── 6. Blade Roughing (10 params) ────────────────────────────────────────────

export const bladeRoughingToolAxisSchema = z.object({
  hub_tilt: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Tilt angle relative to hub surface for root clearance, degrees"),
  blade_lead: z
    .number()
    .min(-30)
    .max(30)
    .default(0)
    .describe("Lead angle along blade span direction for chip flow, degrees"),
  blade_lag: z
    .number()
    .min(-30)
    .max(30)
    .default(0)
    .describe("Lag angle along blade span for exit chip thickness control, degrees"),
  entry_axis_mode: z
    .enum(["normal", "tangent"])
    .describe("Tool axis orientation during entry plunge into blade channel"),
  blade_surface_follow: z
    .boolean()
    .default(true)
    .describe("Follow blade surface curvature for uniform stock removal"),
  channel_width_adapt: z
    .boolean()
    .default(true)
    .describe("Adapt tool axis to varying channel width between adjacent blades"),
  fillet_radius_offset: z
    .number()
    .min(0)
    .max(20)
    .default(0)
    .describe("Additional offset at blade root fillet for stock allowance, mm"),
  max_plunge_angle: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .describe("Maximum plunge angle during entry for safe material engagement, degrees"),
  radial_depth_control: z
    .boolean()
    .default(true)
    .describe("Control radial depth of cut to maintain consistent chip load"),
  step_over_mode: z
    .enum(["constant", "adaptive", "curvature_based"])
    .default("constant")
    .describe("Step-over calculation method between adjacent passes"),
});

export type BladeRoughingToolAxis = z.infer<typeof bladeRoughingToolAxisSchema>;

// ── 7. Blade Finishing (10 params) ───────────────────────────────────────────

export const bladeFinishingToolAxisSchema = z.object({
  cusp_control: z
    .boolean()
    .default(true)
    .describe("Enable cusp height control for consistent surface finish across blade"),
  axis_smooth: z
    .boolean()
    .default(true)
    .describe("Apply axis smoothing filter to prevent vibration marks on blade surface"),
  scallop_axis_mode: z
    .enum(["constant", "adaptive"])
    .describe("Scallop height control mode: constant step-over vs adaptive curvature"),
  max_cusp_height: z
    .number()
    .min(0.001)
    .max(1)
    .default(0.01)
    .describe("Maximum allowable cusp height on blade surface, mm"),
  blade_tip_extension: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe("Tool path extension beyond blade tip for complete coverage, mm"),
  root_fillet_mode: z
    .enum(["follow", "blend", "separate_pass"])
    .default("follow")
    .describe("Machining strategy at blade root fillet transition"),
  surface_quality_target: z
    .number()
    .min(0.1)
    .max(25)
    .default(1.6)
    .describe("Target surface roughness Ra on blade surface, micrometers"),
  lead_edge_priority: z
    .boolean()
    .default(false)
    .describe("Prioritize leading edge finish over trailing edge in pass ordering"),
  axis_reversal_limit: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe("Maximum allowed axis reversals per pass for mark prevention"),
  tangent_extension: z
    .number()
    .min(0)
    .max(30)
    .default(5)
    .describe("Tangent extension at blade edges for smooth entry/exit, mm"),
});

export type BladeFinishingToolAxis = z.infer<typeof bladeFinishingToolAxisSchema>;

// ── 8. Impeller Roughing (10 params) ─────────────────────────────────────────

export const impellerRoughingToolAxisSchema = z.object({
  channel_axis: z
    .enum(["hub_normal", "shroud_normal", "bisector"])
    .describe("Tool axis reference surface within impeller flow channel"),
  plunge_axis_mode: z
    .enum(["vertical", "channel_aligned", "radial"])
    .default("channel_aligned")
    .describe("Tool axis during plunge moves into channel material"),
  cut_direction_lock: z
    .boolean()
    .default(false)
    .describe("Lock cutting direction to prevent tool axis flip in narrow channels"),
  hub_offset: z
    .number()
    .min(0)
    .max(20)
    .default(0.5)
    .describe("Stock allowance offset from hub surface, mm"),
  shroud_offset: z
    .number()
    .min(0)
    .max(20)
    .default(0.5)
    .describe("Stock allowance offset from shroud surface, mm"),
  blade_offset: z
    .number()
    .min(0)
    .max(20)
    .default(0.5)
    .describe("Stock allowance offset from blade surfaces, mm"),
  max_channel_tilt: z
    .number()
    .min(0)
    .max(60)
    .default(30)
    .describe("Maximum tool tilt angle within channel for clearance, degrees"),
  split_pass_threshold: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Channel width threshold below which passes split for access, mm"),
  entry_retract_height: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Retract height above stock for safe entry repositioning, mm"),
  roughing_direction: z
    .enum(["hub_to_shroud", "shroud_to_hub", "alternating"])
    .default("hub_to_shroud")
    .describe("Primary roughing pass direction within impeller channel"),
});

export type ImpellerRoughingToolAxis = z.infer<typeof impellerRoughingToolAxisSchema>;

// ── 9. Impeller Finishing (10 params) ────────────────────────────────────────

export const impellerFinishingToolAxisSchema = z.object({
  hub_contact: z
    .boolean()
    .default(true)
    .describe("Enable hub surface contact machining with axis normal to hub"),
  shroud_contact: z
    .boolean()
    .default(true)
    .describe("Enable shroud surface contact machining with axis normal to shroud"),
  blend_axis: z
    .boolean()
    .default(true)
    .describe("Blend tool axis smoothly between hub and shroud normal orientations"),
  uv_distribution_mode: z
    .enum(["uniform", "chord_length"])
    .describe("UV parameter distribution for toolpath point spacing on surfaces"),
  blend_factor: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Hub-to-shroud blend weighting factor (0=hub, 1=shroud)"),
  cusp_height_target: z
    .number()
    .min(0.001)
    .max(0.5)
    .default(0.01)
    .describe("Target cusp height for step-over calculation, mm"),
  flow_line_follow: z
    .boolean()
    .default(true)
    .describe("Follow aerodynamic flow lines for optimal surface finish direction"),
  edge_extension: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe("Toolpath extension beyond blade edges for complete coverage, mm"),
  spiral_mode: z
    .boolean()
    .default(false)
    .describe("Use spiral toolpath within channel instead of zig-zag passes"),
  axis_continuity_order: z
    .number()
    .int()
    .min(0)
    .max(3)
    .default(2)
    .describe("Geometric continuity order for axis transitions (0=C0, 1=C1, 2=C2)"),
});

export type ImpellerFinishingToolAxis = z.infer<typeof impellerFinishingToolAxisSchema>;

// ── 10. Tube Milling (10 params) ─────────────────────────────────────────────

export const tubeMillingToolAxisSchema = z.object({
  tube_axis_mode: z
    .enum(["follow_tube", "fixed_tilt"])
    .describe("Tool axis behavior relative to tube centerline"),
  tube_diameter_ref: z
    .number()
    .min(0.5)
    .max(5000)
    .describe("Reference tube outer diameter for axis calculation, mm"),
  wrap_angle: z
    .number()
    .min(0)
    .max(360)
    .default(360)
    .describe("Angular wrap coverage around tube circumference, degrees"),
  helix_pitch: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Helical advance per revolution for spiral milling on tube, mm"),
  fixed_tilt_angle: z
    .number()
    .min(0)
    .max(90)
    .default(0)
    .describe("Fixed tilt angle from tube normal in fixed_tilt mode, degrees"),
  start_angle: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe("Starting angular position on tube circumference, degrees"),
  tube_wall_thickness: z
    .number()
    .min(0.1)
    .max(200)
    .default(5)
    .describe("Tube wall thickness for depth-of-cut limitation, mm"),
  inner_surface: z
    .boolean()
    .default(false)
    .describe("Machine inner tube surface instead of outer surface"),
  axis_lead_on_curve: z
    .number()
    .min(-30)
    .max(30)
    .default(0)
    .describe("Lead angle along tube curve for chip direction, degrees"),
  rotary_axis_assignment: z
    .enum(["a", "b", "c", "auto"])
    .default("auto")
    .describe("Machine rotary axis assignment for tube rotation"),
});

export type TubeMillingToolAxis = z.infer<typeof tubeMillingToolAxisSchema>;

// ── 11. Dental (10 params) ───────────────────────────────────────────────────

export const dentalToolAxisSchema = z.object({
  dental_axis: z
    .enum(["insert_direction", "minimum_tilt"])
    .describe("Primary axis strategy for dental prosthetic machining"),
  undercut_avoidance: z
    .boolean()
    .default(true)
    .describe("Automatically avoid undercut regions inaccessible from insertion direction"),
  min_access_angle: z
    .number()
    .min(0)
    .max(90)
    .default(5)
    .describe("Minimum angular access for tool entry into cavity features, degrees"),
  margin_line_follow: z
    .boolean()
    .default(true)
    .describe("Follow dental margin line contour for precise fit at crown edge"),
  occlusal_priority: z
    .boolean()
    .default(true)
    .describe("Prioritize occlusal surface finish quality over cycle time"),
  pontic_mode: z
    .boolean()
    .default(false)
    .describe("Enable pontic-specific toolpath for bridge framework machining"),
  abutment_axis_align: z
    .boolean()
    .default(true)
    .describe("Align tool axis to abutment screw channel direction"),
  material_block_offset: z
    .number()
    .min(0)
    .max(5)
    .default(0.3)
    .describe("Offset from blank block boundary for holding pin clearance, mm"),
  sprue_avoidance: z
    .boolean()
    .default(true)
    .describe("Avoid sprue/connection pin locations during finishing passes"),
  max_nesting_tilt: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .describe("Maximum tilt when multiple restorations are nested in one block, degrees"),
});

export type DentalToolAxis = z.infer<typeof dentalToolAxisSchema>;

// ── 12. Cavity (10 params) ───────────────────────────────────────────────────

export const cavityToolAxisSchema = z.object({
  cavity_tilt_strategy: z
    .enum(["auto", "fixed", "interpolated"])
    .describe("Tilt strategy for accessing cavity undercuts and deep features"),
  max_undercut_angle: z
    .number()
    .min(0)
    .max(90)
    .default(15)
    .describe("Maximum undercut angle the tool can reach via tilting, degrees"),
  approach_axis: z
    .enum(["z", "tool_normal", "custom"])
    .describe("Tool approach direction for initial cavity entry"),
  draft_angle_follow: z
    .boolean()
    .default(true)
    .describe("Follow cavity draft angles with matching tool axis orientation"),
  parting_line_priority: z
    .boolean()
    .default(true)
    .describe("Prioritize surface quality along mold parting line"),
  core_side_offset: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Normal offset for core side of cavity for electrode gap, mm"),
  rib_access_mode: z
    .enum(["direct", "tilted", "multi_pass"])
    .default("direct")
    .describe("Access strategy for deep narrow ribs within cavity"),
  depth_limit: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe("Maximum machining depth from cavity opening, mm"),
  axis_retract_clearance: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Clearance height for axis reorientation retract moves, mm"),
  electrode_mode: z
    .boolean()
    .default(false)
    .describe("Enable electrode-specific axis control for EDM electrode machining"),
});

export type CavityToolAxis = z.infer<typeof cavityToolAxisSchema>;

// ── 13. Multi-Surface (10 params) ────────────────────────────────────────────

export const multiSurfaceToolAxisSchema = z.object({
  surface_group_axis: z
    .enum(["average_normal", "dominant", "interpolated"])
    .describe("Axis calculation method across grouped surfaces"),
  axis_blend_factor: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Blend weighting between surface group normals (0..1)"),
  boundary_transition: z
    .enum(["sharp", "smooth", "tangent"])
    .default("smooth")
    .describe("Axis transition behavior at surface group boundaries"),
  group_priority_order: z
    .enum(["area", "curvature", "user_defined"])
    .default("area")
    .describe("Priority ordering for surface groups when calculating dominant normal"),
  normal_averaging_radius: z
    .number()
    .min(0.1)
    .max(100)
    .default(10)
    .describe("Radius for surface normal averaging at each toolpath point, mm"),
  max_axis_deviation: z
    .number()
    .min(0.1)
    .max(45)
    .default(15)
    .describe("Maximum deviation from average normal before splitting pass, degrees"),
  overlap_handling: z
    .enum(["merge", "trim", "priority"])
    .default("merge")
    .describe("Handling mode for overlapping surface group boundaries"),
  surface_extension: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe("Extension distance beyond surface boundaries for complete coverage, mm"),
  curvature_adapt: z
    .boolean()
    .default(true)
    .describe("Adapt axis orientation based on local surface curvature changes"),
  tangent_continuity: z
    .boolean()
    .default(true)
    .describe("Maintain tangent continuity of tool axis across surface group joins"),
});

export type MultiSurfaceToolAxis = z.infer<typeof multiSurfaceToolAxisSchema>;

// ── Schema Map ───────────────────────────────────────────────────────────────

/** All 13 five-axis tool axis control schemas keyed by cycle type */
export const FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP = {
  swarf_cutting: swarfCuttingToolAxisSchema,
  point_milling: pointMillingToolAxisSchema,
  contour_5x: contour5xToolAxisSchema,
  pocket_5x: pocket5xToolAxisSchema,
  profile_5x: profile5xToolAxisSchema,
  blade_roughing: bladeRoughingToolAxisSchema,
  blade_finishing: bladeFinishingToolAxisSchema,
  impeller_roughing: impellerRoughingToolAxisSchema,
  impeller_finishing: impellerFinishingToolAxisSchema,
  tube_milling: tubeMillingToolAxisSchema,
  dental: dentalToolAxisSchema,
  cavity: cavityToolAxisSchema,
  multi_surface: multiSurfaceToolAxisSchema,
} as const;

export type FiveAxisToolAxisCycleType = keyof typeof FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP;

// ── Metadata ─────────────────────────────────────────────────────────────────

/** Metadata record for every 5-axis tool axis cycle type */
export interface FiveAxisToolAxisMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each 5-axis tool axis cycle type with AC Python setter references */
export const FIVE_AXIS_TOOL_AXIS_METADATA: Record<FiveAxisToolAxisCycleType, FiveAxisToolAxisMeta> = {
  swarf_cutting: {
    paramCount: 10,
    acPythonSetter: "hm.5x.swarf",
    description: "Swarf (flank) cutting with controlled tilt, lead/lag, and axis interpolation",
    dfmCriticalParams: ["tilt_angle", "axis_limit_check"],
  },
  point_milling: {
    paramCount: 10,
    acPythonSetter: "hm.5x.point_milling",
    description: "Point milling with surface-normal or fixed orientation and tilt limits",
    dfmCriticalParams: ["tilt_min", "tilt_max"],
  },
  contour_5x: {
    paramCount: 10,
    acPythonSetter: "hm.5x.contour",
    description: "5-axis contouring with side/forward tilt and constant contact control",
  },
  pocket_5x: {
    paramCount: 10,
    acPythonSetter: "hm.5x.pocket",
    description: "5-axis pocket milling with auto collision tilt and axis strategy selection",
    dfmCriticalParams: ["max_tilt", "auto_collision_tilt"],
  },
  profile_5x: {
    paramCount: 10,
    acPythonSetter: "hm.5x.profile",
    description: "5-axis profile milling with lead/lean angles and gauge compensation",
    dfmCriticalParams: ["tool_reach", "gauge_compensation"],
  },
  blade_roughing: {
    paramCount: 10,
    acPythonSetter: "hm.5x.blade_rough",
    description: "Blade roughing with hub tilt, lead/lag, and channel-adaptive axis control",
  },
  blade_finishing: {
    paramCount: 10,
    acPythonSetter: "hm.5x.blade_finish",
    description: "Blade finishing with cusp control and adaptive scallop axis mode",
  },
  impeller_roughing: {
    paramCount: 10,
    acPythonSetter: "hm.5x.impeller_rough",
    description: "Impeller roughing with hub/shroud/bisector axis and channel access control",
  },
  impeller_finishing: {
    paramCount: 10,
    acPythonSetter: "hm.5x.impeller_finish",
    description: "Impeller finishing with hub/shroud contact blending and UV distribution",
  },
  tube_milling: {
    paramCount: 10,
    acPythonSetter: "hm.5x.tube",
    description: "Tube milling with follow-tube or fixed-tilt axis and wrap angle control",
  },
  dental: {
    paramCount: 10,
    acPythonSetter: "hm.5x.dental",
    description: "Dental prosthetic milling with insert direction axis and undercut avoidance",
  },
  cavity: {
    paramCount: 10,
    acPythonSetter: "hm.5x.cavity",
    description: "Cavity/mold milling with auto/fixed/interpolated tilt and undercut access",
    dfmCriticalParams: ["max_undercut_angle", "cavity_tilt_strategy"],
  },
  multi_surface: {
    paramCount: 10,
    acPythonSetter: "hm.5x.multi_surface",
    description: "Multi-surface group milling with blended average/dominant/interpolated axis",
  },
};

// ── Computed Totals ──────────────────────────────────────────────────────────

/** Total parameter count across all 13 five-axis tool axis schemas */
export const FIVE_AXIS_TOOL_AXIS_TOTAL_PARAM_COUNT = Object.values(FIVE_AXIS_TOOL_AXIS_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
