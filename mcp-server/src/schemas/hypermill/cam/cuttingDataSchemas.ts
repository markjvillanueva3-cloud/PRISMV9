/**
 * Cross-Cycle Cutting Data Parameter Schemas — hyperMILL CAM
 *
 * U-HKC21: Zod schemas for 6 cutting data profile types shared across all
 * cycle families. Each profile represents a class of operations that share
 * similar speed/feed/engagement parameter needs. DFM-critical parameters are
 * tagged in metadata for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.cutting.roughing(spindle_speed=8000, feed_rate=3200, depth_of_cut=2.5, ...)
 *
 * @domain CAM-CuttingData
 * @milestone HM-KC-MS3/U-HKC21
 */

import { z } from "zod";

// ── 1. Roughing Cutting Data (30 params) ──────────────────────────────────────

export const roughingCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(50)
    .max(99999)
    .describe("Spindle rotational speed, RPM"),
  feed_rate: z
    .number()
    .min(1)
    .max(50000)
    .describe("Linear feed rate during cutting, mm/min"),
  feed_per_tooth: z
    .number()
    .min(0.001)
    .max(5.0)
    .describe("Feed per tooth (chip load), mm/tooth"),
  depth_of_cut: z
    .number()
    .min(0.01)
    .max(200)
    .describe("Axial depth of cut per pass, mm (DFM-critical: affects tool load and stability)"),
  width_of_cut: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Radial width of cut (stepover), mm (DFM-critical: governs chip thinning)"),
  plunge_feed: z
    .number()
    .min(0.1)
    .max(20000)
    .describe("Feed rate during axial plunge moves, mm/min"),
  ramp_feed: z
    .number()
    .min(0.1)
    .max(20000)
    .describe("Feed rate during helical or linear ramp entry, mm/min"),
  approach_feed: z
    .number()
    .min(0.1)
    .max(20000)
    .describe("Feed rate during approach moves to material, mm/min"),
  rapid_override: z
    .number()
    .min(1)
    .max(100)
    .default(100)
    .describe("Rapid traverse override percentage, %"),
  cutting_speed_vc: z
    .number()
    .min(1)
    .max(2000)
    .describe("Surface cutting speed at tool periphery, m/min"),
  chip_load_target: z
    .number()
    .min(0.001)
    .max(5.0)
    .describe("Target chip load per tooth for adaptive feed control, mm"),
  mrr_target: z
    .number()
    .min(0)
    .max(5000)
    .describe("Target material removal rate for cycle optimization, cm^3/min"),
  engagement_angle: z
    .number()
    .min(0)
    .max(360)
    .describe("Cutter engagement angle at radial stepover, degrees"),
  hsc_mode: z
    .boolean()
    .default(false)
    .describe("Enable high-speed cutting mode with trochoidal-like toolpath adaptation"),
  power_limit_pct: z
    .number()
    .min(1)
    .max(100)
    .default(80)
    .describe("Maximum spindle power utilization limit, %"),
  torque_limit_pct: z
    .number()
    .min(1)
    .max(100)
    .default(80)
    .describe("Maximum spindle torque utilization limit, %"),
  stepdown_mode: z
    .enum(["constant", "adaptive", "optimized"])
    .default("constant")
    .describe("Axial stepdown strategy: constant depth, adaptive, or CAM-optimized"),
  ramp_angle: z
    .number()
    .min(0.5)
    .max(45)
    .default(3)
    .describe("Helical ramp entry angle for plunge avoidance, degrees"),
  retract_feed: z
    .number()
    .min(0.1)
    .max(50000)
    .describe("Feed rate during retract moves from material, mm/min"),
  lead_in_distance: z
    .number()
    .min(0)
    .max(200)
    .default(5)
    .describe("Lead-in arc or line distance before engaging material, mm"),
  lead_out_distance: z
    .number()
    .min(0)
    .max(200)
    .default(5)
    .describe("Lead-out arc or line distance after disengaging material, mm"),
  stock_allowance: z
    .number()
    .min(0)
    .max(50)
    .default(0.3)
    .describe("Stock left on walls/floors for finishing passes, mm"),
  floor_stock: z
    .number()
    .min(0)
    .max(50)
    .default(0.3)
    .describe("Stock left on floor surfaces specifically, mm"),
  max_stepover_pct: z
    .number()
    .min(1)
    .max(100)
    .default(70)
    .describe("Maximum radial stepover as percentage of tool diameter, %"),
  min_stepover_pct: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Minimum radial stepover as percentage of tool diameter, %"),
  feed_reduction_at_corners: z
    .number()
    .min(0)
    .max(90)
    .default(0)
    .describe("Feed rate reduction percentage at sharp corners, %"),
  climb_milling: z
    .boolean()
    .default(true)
    .describe("Use climb (down) milling direction for better surface finish and tool life"),
  constant_engagement: z
    .boolean()
    .default(false)
    .describe("Maintain constant tool engagement angle throughout toolpath"),
  trochoidal_width: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Trochoidal slot width when trochoidal roughing is active, mm"),
  chip_thinning_factor: z
    .number()
    .min(1.0)
    .max(3.0)
    .default(1.0)
    .describe("Feed rate compensation factor for radial chip thinning"),
});

export type RoughingCuttingData = z.infer<typeof roughingCuttingDataSchema>;

// ── 2. Finishing Cutting Data (28 params) ─────────────────────────────────────

export const finishingCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(50)
    .max(99999)
    .describe("Spindle rotational speed for finishing, RPM"),
  feed_rate: z
    .number()
    .min(0.1)
    .max(50000)
    .describe("Linear feed rate during finishing cuts, mm/min"),
  cusp_height_target: z
    .number()
    .min(0.0001)
    .max(1.0)
    .describe("Target cusp (scallop) height between stepover passes, mm"),
  scallop_height: z
    .number()
    .min(0.0001)
    .max(1.0)
    .describe("Maximum allowable scallop height on machined surface, mm"),
  surface_speed_vc: z
    .number()
    .min(1)
    .max(2000)
    .describe("Surface cutting speed at tool periphery, m/min"),
  feed_per_rev: z
    .number()
    .min(0.001)
    .max(10)
    .describe("Feed per spindle revolution for turning-style finishing, mm/rev"),
  finishing_stepover: z
    .number()
    .min(0.001)
    .max(100)
    .describe("Radial stepover distance between finishing passes, mm"),
  finishing_allowance: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Stock remaining after finishing (should be 0 for final pass), mm"),
  spring_pass: z
    .boolean()
    .default(false)
    .describe("Execute a spring pass (re-cut at same depth) to relieve tool deflection"),
  spring_pass_count: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(0)
    .describe("Number of spring passes to execute after main finishing cut"),
  dwell_at_bottom: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Dwell time at bottom of finishing cut for improved surface, sec"),
  surface_quality_target: z
    .enum(["Ra_0_4", "Ra_0_8", "Ra_1_6", "Ra_3_2"])
    .describe("Target surface roughness class (Ra value in micrometers)"),
  corner_decel: z
    .boolean()
    .default(true)
    .describe("Enable automatic deceleration at sharp corners during finishing"),
  corner_feed_pct: z
    .number()
    .min(5)
    .max(100)
    .default(50)
    .describe("Feed rate at corners as percentage of nominal feed, %"),
  depth_of_cut: z
    .number()
    .min(0.001)
    .max(50)
    .describe("Axial depth of cut for finishing passes, mm"),
  lead_in_type: z
    .enum(["arc", "line", "tangent", "none"])
    .default("arc")
    .describe("Lead-in approach geometry type for finish passes"),
  lead_out_type: z
    .enum(["arc", "line", "tangent", "none"])
    .default("arc")
    .describe("Lead-out retract geometry type for finish passes"),
  lead_radius: z
    .number()
    .min(0.1)
    .max(100)
    .default(5)
    .describe("Radius of lead-in/lead-out arc moves, mm"),
  overlap_distance: z
    .number()
    .min(0)
    .max(50)
    .default(0.5)
    .describe("Overlap distance at start/end of closed contours, mm"),
  feed_per_tooth: z
    .number()
    .min(0.001)
    .max(2.0)
    .describe("Feed per tooth for ball-nose or bull-nose finishing, mm/tooth"),
  constant_z_step: z
    .boolean()
    .default(false)
    .describe("Use constant-Z stepdown for steep wall finishing"),
  z_step_value: z
    .number()
    .min(0.001)
    .max(50)
    .optional()
    .describe("Constant-Z step value when constant_z_step is true, mm"),
  boundary_offset: z
    .number()
    .min(-50)
    .max(50)
    .default(0)
    .describe("Offset from boundary for finishing pass containment, mm"),
  tool_tip_radius_comp: z
    .boolean()
    .default(true)
    .describe("Enable automatic tool tip radius compensation for surface accuracy"),
  smoothing_tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Toolpath smoothing tolerance for CNC controller, mm"),
  max_segment_length: z
    .number()
    .min(0.01)
    .max(100)
    .default(1.0)
    .describe("Maximum linear segment length in finishing toolpath, mm"),
  surface_tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.005)
    .describe("Surface deviation tolerance from nominal geometry, mm"),
  climb_milling: z
    .boolean()
    .default(true)
    .describe("Use climb milling for finishing to reduce burr formation"),
});

export type FinishingCuttingData = z.infer<typeof finishingCuttingDataSchema>;

// ── 3. Drilling Cutting Data (22 params) ──────────────────────────────────────

export const drillingCuttingDataProfileSchema = z.object({
  spindle_speed: z
    .number()
    .min(50)
    .max(60000)
    .describe("Spindle rotational speed for drilling, RPM"),
  feed_per_rev: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Axial feed per spindle revolution, mm/rev (DFM-critical: primary drilling feed)"),
  plunge_feed: z
    .number()
    .min(0.1)
    .max(20000)
    .describe("Computed plunge feed rate, mm/min"),
  retract_speed_pct: z
    .number()
    .min(10)
    .max(500)
    .default(100)
    .describe("Retract speed as percentage of plunge feed, %"),
  dwell_bottom: z
    .number()
    .min(0)
    .max(30)
    .default(0)
    .describe("Dwell time at hole bottom for chip clearing, sec"),
  dwell_top: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Dwell time at top of hole between pecks, sec"),
  peck_feed_reduction: z
    .number()
    .min(0)
    .max(80)
    .default(0)
    .describe("Feed rate reduction per successive peck increment, %"),
  chip_break_distance: z
    .number()
    .min(0.05)
    .max(50)
    .default(1)
    .describe("Partial retract distance for chip-break mode, mm"),
  pilot_speed_factor: z
    .number()
    .min(10)
    .max(200)
    .default(100)
    .describe("Speed factor for pilot portion of drill cycle, %"),
  through_coolant_pressure: z
    .number()
    .min(0)
    .max(300)
    .describe("Through-tool coolant pressure for chip evacuation, bar"),
  cutting_speed_vc: z
    .number()
    .min(1)
    .max(1000)
    .describe("Surface cutting speed at drill periphery, m/min"),
  peck_depth_first: z
    .number()
    .min(0.1)
    .max(500)
    .describe("First peck depth increment, mm"),
  peck_depth_min: z
    .number()
    .min(0.05)
    .max(100)
    .describe("Minimum peck depth after reduction, mm"),
  peck_depth_reduction: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .describe("Amount peck depth decreases each cycle, mm"),
  spot_dwell: z
    .number()
    .min(0)
    .max(10)
    .default(0.2)
    .describe("Dwell at spot drill depth before plunge begins, sec"),
  retract_mode: z
    .enum(["full", "chip_break", "incremental"])
    .default("full")
    .describe("Retract strategy between pecks"),
  spindle_direction: z
    .enum(["cw", "ccw"])
    .default("cw")
    .describe("Spindle rotation direction"),
  rapid_to_clearance: z
    .boolean()
    .default(true)
    .describe("Rapid to clearance plane between holes in multi-hole pattern"),
  approach_distance: z
    .number()
    .min(0.5)
    .max(100)
    .default(2)
    .describe("Safety approach distance above part surface, mm"),
  feed_at_breakthrough: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Feed reduction percentage at through-hole breakthrough, %"),
  max_ld_ratio: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum length-to-diameter ratio before requiring deep hole strategy (DFM-critical)"),
  vibration_damping: z
    .boolean()
    .default(false)
    .describe("Enable vibration damping feed modulation for deep drilling"),
});

export type DrillingCuttingDataProfile = z.infer<typeof drillingCuttingDataProfileSchema>;

// ── 4. Threading Cutting Data (22 params) ─────────────────────────────────────

export const threadingCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(10)
    .max(10000)
    .describe("Spindle rotational speed for threading, RPM"),
  pitch: z
    .number()
    .min(0.2)
    .max(25)
    .describe("Thread pitch, mm (DFM-critical: feed must synchronize with pitch x RPM)"),
  passes: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of threading passes for full thread depth"),
  depth_per_pass: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Radial depth of each threading pass, mm"),
  infeed_angle: z
    .number()
    .min(0)
    .max(30)
    .describe("Infeed angle for thread insert approach, degrees (0=radial, 29/30=modified flank)"),
  thread_direction: z
    .enum(["right", "left"])
    .default("right")
    .describe("Thread hand direction: right-hand or left-hand thread"),
  synchronization_mode: z
    .enum(["rigid", "floating"])
    .default("rigid")
    .describe("Spindle-feed synchronization mode for threading"),
  speed_override_retract: z
    .number()
    .min(50)
    .max(300)
    .default(100)
    .describe("Speed override during retract at thread end, %"),
  spring_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(1)
    .describe("Number of spring passes at final thread depth for cleanup"),
  thread_form: z
    .enum(["metric", "unc", "unf", "bsp", "npt", "acme", "buttress", "trapezoidal"])
    .describe("Thread form standard for profile validation"),
  thread_class: z
    .enum(["6g", "6h", "4g", "4h", "2A", "2B", "3A", "3B"])
    .optional()
    .describe("Thread tolerance class per ISO 965 or ASME B1.1"),
  cutting_speed_vc: z
    .number()
    .min(5)
    .max(500)
    .describe("Surface cutting speed for threading, m/min"),
  degressive_depth: z
    .boolean()
    .default(true)
    .describe("Use degressive (decreasing) depth per pass for constant chip area"),
  chamfer_at_start: z
    .boolean()
    .default(true)
    .describe("Apply chamfer at thread start for lead-in"),
  chamfer_at_end: z
    .boolean()
    .default(false)
    .describe("Apply chamfer at thread end for runout"),
  minimum_thread_length: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Minimum thread engagement length, mm"),
  thread_depth_total: z
    .number()
    .min(0.01)
    .max(10)
    .describe("Total thread depth from crest to root, mm"),
  thread_percentage: z
    .number()
    .min(50)
    .max(100)
    .default(75)
    .describe("Thread engagement percentage (DFM-critical: 65-75% typical)"),
  insert_nose_radius: z
    .number()
    .min(0.1)
    .max(2.0)
    .optional()
    .describe("Threading insert nose radius for profile accuracy, mm"),
  multi_start: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(1)
    .describe("Number of thread starts for multi-start threading"),
  lead_distance: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe("Acceleration distance before thread cut engagement, mm"),
  overrun_distance: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe("Deceleration distance after thread cut exit, mm"),
});

export type ThreadingCuttingData = z.infer<typeof threadingCuttingDataSchema>;

// ── 5. HSC/HPC Cutting Data (25 params) ───────────────────────────────────────

export const hscHpcCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(1000)
    .max(99999)
    .describe("Spindle speed for HSC/HPC operations (typically high RPM), RPM"),
  feed_rate: z
    .number()
    .min(1)
    .max(50000)
    .describe("Linear feed rate for HSC/HPC cutting, mm/min"),
  chip_thinning_comp: z
    .boolean()
    .default(true)
    .describe("Enable chip thinning compensation for reduced radial engagement"),
  radial_engagement_pct: z
    .number()
    .min(1)
    .max(100)
    .describe("Radial engagement as percentage of tool diameter, % (DFM-critical: governs chip thinning)"),
  axial_engagement_pct: z
    .number()
    .min(1)
    .max(100)
    .describe("Axial engagement as percentage of tool flute length, %"),
  constant_chip_load: z
    .boolean()
    .default(true)
    .describe("Maintain constant chip load by adjusting feed with engagement changes"),
  acceleration_limit: z
    .number()
    .min(0.1)
    .max(50)
    .default(10)
    .describe("Maximum allowed axis acceleration for toolpath segments, m/s^2"),
  jerk_limit: z
    .number()
    .min(0.1)
    .max(500)
    .default(50)
    .describe("Maximum allowed axis jerk for smooth motion, m/s^3"),
  look_ahead_distance: z
    .number()
    .min(1)
    .max(500)
    .default(50)
    .describe("CNC look-ahead buffer distance for velocity planning, mm"),
  minimum_arc_radius: z
    .number()
    .min(0.01)
    .max(50)
    .default(0.5)
    .describe("Minimum arc radius for toolpath smoothing and NURBS output, mm"),
  feed_limit_at_corners: z
    .number()
    .min(1)
    .max(50000)
    .describe("Maximum feed rate at sharp direction changes, mm/min"),
  cutting_speed_vc: z
    .number()
    .min(50)
    .max(5000)
    .describe("Surface cutting speed for HSC materials (can exceed conventional), m/min"),
  feed_per_tooth: z
    .number()
    .min(0.001)
    .max(2.0)
    .describe("Feed per tooth optimized for HSC chip formation, mm/tooth"),
  depth_of_cut: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Axial depth of cut for HPC (can be deep with low ae), mm"),
  width_of_cut: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Radial width of cut for HPC (low ae with full ap), mm"),
  smoothing_tolerance: z
    .number()
    .min(0.0001)
    .max(0.5)
    .default(0.005)
    .describe("Toolpath smoothing tolerance for HSC controllers, mm"),
  max_segment_length: z
    .number()
    .min(0.01)
    .max(10)
    .default(0.5)
    .describe("Maximum linear segment length for smooth HSC motion, mm"),
  corner_rounding: z
    .boolean()
    .default(true)
    .describe("Enable corner rounding for maintained feed rates at direction changes"),
  corner_radius_min: z
    .number()
    .min(0.01)
    .max(20)
    .default(0.2)
    .describe("Minimum corner rounding radius for sharp features, mm"),
  trochoidal_enabled: z
    .boolean()
    .default(false)
    .describe("Use trochoidal (adaptive) milling for full-slot HPC roughing"),
  trochoidal_stepover_pct: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Trochoidal stepover as percentage of tool diameter, %"),
  dynamic_feed_control: z
    .boolean()
    .default(true)
    .describe("Enable dynamic feed control based on instantaneous engagement"),
  spindle_warmup_time: z
    .number()
    .min(0)
    .max(600)
    .default(0)
    .describe("Spindle warmup dwell time before high-speed operation, sec"),
  coolant_mode: z
    .enum(["air_blast", "mist", "mql", "dry", "through_tool"])
    .default("air_blast")
    .describe("Coolant mode for HSC (flood typically avoided at high RPM)"),
  surface_speed_limit: z
    .number()
    .min(100)
    .max(10000)
    .default(5000)
    .describe("Maximum surface speed before tool coating degradation, m/min"),
});

export type HscHpcCuttingData = z.infer<typeof hscHpcCuttingDataSchema>;

// ── 6. Multi-Axis Cutting Data (22 params) ────────────────────────────────────

export const multiAxisCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(50)
    .max(99999)
    .describe("Spindle rotational speed for multi-axis operations, RPM"),
  feed_rate: z
    .number()
    .min(0.1)
    .max(50000)
    .describe("Linear feed rate along toolpath, mm/min"),
  tool_axis_mode: z
    .enum(["fixed", "lead_lag", "interpolated"])
    .describe("Tool axis orientation strategy for 5-axis motion"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Tool lead angle relative to surface normal (positive = forward tilt), degrees"),
  lag_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Tool lag angle relative to surface normal (positive = backward tilt), degrees"),
  tilt_angle: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Tool tilt angle relative to surface normal (lateral inclination), degrees"),
  swarf_angle: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Swarf cutting angle for flank milling operations, degrees"),
  surface_normal_offset: z
    .number()
    .min(-50)
    .max(50)
    .default(0)
    .describe("Offset distance along surface normal from contact point, mm"),
  gauge_length: z
    .number()
    .min(10)
    .max(500)
    .describe("Tool gauge length from spindle face to tool tip, mm"),
  pivot_distance: z
    .number()
    .min(0)
    .max(1000)
    .describe("Distance from rotary axis pivot point to tool tip, mm"),
  cutting_speed_vc: z
    .number()
    .min(1)
    .max(2000)
    .describe("Surface cutting speed for multi-axis, m/min"),
  feed_per_tooth: z
    .number()
    .min(0.001)
    .max(5.0)
    .describe("Feed per tooth for multi-axis operations, mm/tooth"),
  inverse_time_feed: z
    .boolean()
    .default(false)
    .describe("Use inverse time feed mode (G93) for simultaneous 5-axis motion"),
  tcp_feed_rate: z
    .number()
    .min(0.1)
    .max(50000)
    .optional()
    .describe("Tool center point feed rate when TCPM is active, mm/min"),
  collision_check_tolerance: z
    .number()
    .min(0.01)
    .max(10)
    .default(0.5)
    .describe("Minimum clearance for collision checking between tool/holder and part, mm"),
  rotary_feed_limit: z
    .number()
    .min(0.1)
    .max(1000)
    .default(100)
    .describe("Maximum rotary axis feed rate for smooth multi-axis motion, deg/sec"),
  singularity_avoidance: z
    .boolean()
    .default(true)
    .describe("Enable automatic singularity avoidance near rotary axis limits"),
  max_inclination: z
    .number()
    .min(0)
    .max(90)
    .default(45)
    .describe("Maximum tool inclination angle from vertical, degrees"),
  smoothing_mode: z
    .enum(["linear", "spline", "nurbs"])
    .default("linear")
    .describe("Toolpath interpolation mode for multi-axis segments"),
  approach_vector: z
    .enum(["normal", "tangent", "vertical", "custom"])
    .default("normal")
    .describe("Tool approach vector orientation relative to surface"),
  link_feed_pct: z
    .number()
    .min(10)
    .max(200)
    .default(100)
    .describe("Feed rate for linking moves between multi-axis passes as percentage, %"),
  retract_type: z
    .enum(["along_axis", "normal", "vertical", "clearance"])
    .default("along_axis")
    .describe("Retract motion type at end of multi-axis pass"),
});

export type MultiAxisCuttingData = z.infer<typeof multiAxisCuttingDataSchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 6 cutting data profile schemas keyed by profile type */
export const CUTTING_DATA_SCHEMA_MAP = {
  roughing: roughingCuttingDataSchema,
  finishing: finishingCuttingDataSchema,
  drilling: drillingCuttingDataProfileSchema,
  threading: threadingCuttingDataSchema,
  hsc_hpc: hscHpcCuttingDataSchema,
  multi_axis: multiAxisCuttingDataSchema,
} as const;

export type CuttingDataProfileType = keyof typeof CUTTING_DATA_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every cutting data profile type */
export interface CuttingDataMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each cutting data profile type with AC Python setter references */
export const CUTTING_DATA_METADATA: Record<CuttingDataProfileType, CuttingDataMeta> = {
  roughing: {
    paramCount: 30,
    acPythonSetter: "hm.cutting.roughing",
    description: "Roughing cutting data profile for aggressive material removal with chip load and MRR targets",
    dfmCriticalParams: ["depth_of_cut", "width_of_cut", "chip_load_target", "mrr_target"],
  },
  finishing: {
    paramCount: 28,
    acPythonSetter: "hm.cutting.finishing",
    description: "Finishing cutting data profile for surface quality with cusp height and Ra targets",
    dfmCriticalParams: ["cusp_height_target", "scallop_height", "surface_quality_target"],
  },
  drilling: {
    paramCount: 22,
    acPythonSetter: "hm.cutting.drilling",
    description: "Drilling cutting data profile for hole-making with peck and chip evacuation parameters",
    dfmCriticalParams: ["feed_per_rev", "max_ld_ratio", "through_coolant_pressure"],
  },
  threading: {
    paramCount: 22,
    acPythonSetter: "hm.cutting.threading",
    description: "Threading cutting data profile for synchronized thread cutting with pitch and infeed control",
    dfmCriticalParams: ["pitch", "infeed_angle", "thread_percentage"],
  },
  hsc_hpc: {
    paramCount: 25,
    acPythonSetter: "hm.cutting.hsc_hpc",
    description: "HSC/HPC cutting data profile for high-speed and high-performance machining with dynamic feed",
    dfmCriticalParams: ["radial_engagement_pct", "chip_thinning_comp", "acceleration_limit"],
  },
  multi_axis: {
    paramCount: 22,
    acPythonSetter: "hm.cutting.multi_axis",
    description: "Multi-axis cutting data profile for 5-axis simultaneous machining with tool axis orientation",
    dfmCriticalParams: ["gauge_length", "pivot_distance", "max_inclination"],
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 6 cutting data profile schemas */
export const CUTTING_DATA_TOTAL_PARAM_COUNT = Object.values(CUTTING_DATA_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
