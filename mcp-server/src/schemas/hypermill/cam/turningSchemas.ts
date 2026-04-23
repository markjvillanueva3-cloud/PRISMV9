/**
 * Turning Cycle Parameter Schemas — hyperMILL CAM Turning
 *
 * U-HKC25: Zod schemas for 18 turning cycle types used in hyperMILL CAM.
 * Each cycle schema composes a shared turning base (12 params) with
 * cycle-specific parameters. DFM-critical parameters are tagged in
 * metadata for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.turning.od_rough(spindle_speed=1200, feed_rate=0.3, depth_of_cut=2.5, ...)
 *
 * @domain CAM-Turning
 * @milestone HM-KC-MS4/U-HKC25
 */

import { z } from "zod";

// ── Shared Turning Base Schema (12 params) ────────────────────────────────────

/** Turning base parameters shared by all 18 turning cycle types */
export const turningBaseSchema = z.object({
  spindle_speed: z
    .number()
    .min(1)
    .max(15000)
    .describe("Spindle rotational speed, RPM"),
  surface_speed: z
    .number()
    .min(1)
    .max(1500)
    .describe("Surface cutting speed at workpiece periphery, m/min"),
  css_mode: z
    .enum(["g96_css", "g97_rpm"])
    .describe("Constant surface speed mode: G96 CSS (speed varies with diameter) or G97 fixed RPM (DFM-critical)"),
  s_max_clamp: z
    .number()
    .min(0)
    .max(15000)
    .describe("Maximum spindle speed clamp for CSS mode — prevents overspeed at small diameters, RPM (DFM-critical)"),
  feed_rate: z
    .number()
    .min(0.01)
    .max(10)
    .describe("Cutting feed rate per revolution, mm/rev"),
  rapid_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Rapid traverse feed rate for non-cutting moves, mm/min"),
  coolant_mode: z
    .enum(["off", "flood", "mist", "through_tool", "high_pressure"])
    .describe("Coolant delivery mode for the turning cycle"),
  nose_radius: z
    .number()
    .min(0.1)
    .max(12.7)
    .describe("Tool nose radius — affects surface finish and TNRC compensation, mm (DFM-critical)"),
  approach_angle: z
    .number()
    .min(0)
    .max(180)
    .describe("Tool approach angle (lead angle) relative to workpiece axis, degrees"),
  insert_type: z
    .enum(["C", "D", "R", "S", "T", "V", "W"])
    .describe("ISO insert shape designation: C(rhombic 80), D(55), R(round), S(square), T(triangle), V(35), W(trigon 80)"),
  chipbreaker: z
    .enum(["none", "light", "medium", "heavy"])
    .describe("Chipbreaker geometry class for chip control"),
  tool_orientation: z
    .number()
    .int()
    .min(1)
    .max(9)
    .describe("Tool orientation code (1-9) per ISO 1832 — determines approach quadrant"),
});

export type TurningBase = z.infer<typeof turningBaseSchema>;

// ── 1. OD Rough (19 params: 12 base + 7 specific) ────────────────────────────

export const odRoughSchema = turningBaseSchema.extend({
  depth_of_cut: z
    .number()
    .min(0.1)
    .max(25)
    .describe("Radial depth of cut per pass, mm (DFM-critical: affects force, power, stability)"),
  stepover_mode: z
    .enum(["constant", "adaptive"])
    .describe("Roughing stepover strategy: constant depth or adaptive based on engagement angle"),
  multiple_passes: z
    .boolean()
    .describe("Enable multiple roughing passes to remove full stock allowance"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .describe("Lead-in angle for roughing approach, degrees"),
  stock_allowance: z
    .number()
    .min(0)
    .max(10)
    .describe("Radial stock allowance left for finish pass, mm"),
  rough_direction: z
    .enum(["longitudinal", "facing", "contour"])
    .describe("Primary roughing cut direction strategy"),
  retract_clearance: z
    .number()
    .min(0.5)
    .max(50)
    .describe("Clearance distance for retract moves between passes, mm"),
});

export type OdRough = z.infer<typeof odRoughSchema>;

// ── 2. OD Finish (18 params: 12 base + 6 specific) ───────────────────────────

export const odFinishSchema = turningBaseSchema.extend({
  finish_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Stock left for finish pass, mm"),
  spring_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe("Number of zero-depth spring passes for surface finish improvement"),
  burnish: z
    .boolean()
    .describe("Enable burnishing pass at reduced feed for mirror finish"),
  target_ra: z
    .number()
    .min(0.1)
    .max(25)
    .describe("Target surface roughness Ra, micrometers"),
  corner_rounding: z
    .boolean()
    .describe("Enable corner rounding at profile transitions for insert life"),
  dwell_at_shoulder: z
    .number()
    .min(0)
    .max(5)
    .describe("Dwell time at shoulder transitions for clean step, sec"),
});

export type OdFinish = z.infer<typeof odFinishSchema>;

// ── 3. ID Rough (18 params: 12 base + 6 specific) ────────────────────────────

export const idRoughSchema = turningBaseSchema.extend({
  min_bore_diameter: z
    .number()
    .min(1)
    .max(2000)
    .describe("Minimum bore diameter constraining boring bar selection, mm"),
  boring_bar_ratio: z
    .number()
    .min(1)
    .max(20)
    .describe("Boring bar length-to-diameter ratio (L/D) — drives deflection and chatter risk"),
  vibration_check: z
    .boolean()
    .describe("Enable vibration monitoring for deep bore stability assessment"),
  depth_of_cut: z
    .number()
    .min(0.1)
    .max(15)
    .describe("Radial depth of cut per internal roughing pass, mm"),
  stock_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Radial stock left on bore wall for finish pass, mm"),
  pecking_enabled: z
    .boolean()
    .describe("Enable peck cycle for deep bore chip evacuation"),
});

export type IdRough = z.infer<typeof idRoughSchema>;

// ── 4. ID Finish (17 params: 12 base + 5 specific) ───────────────────────────

export const idFinishSchema = turningBaseSchema.extend({
  finish_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Stock left for finish pass in bore, mm"),
  spring_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe("Number of zero-depth spring passes for bore finish improvement"),
  dwell_at_bottom: z
    .number()
    .min(0)
    .max(30)
    .describe("Dwell time at bore bottom before retract for surface quality, sec"),
  target_ra: z
    .number()
    .min(0.1)
    .max(25)
    .describe("Target bore surface roughness Ra, micrometers"),
  retract_at_speed: z
    .boolean()
    .describe("Retract at feed rate instead of rapid to prevent bore wall scoring"),
});

export type IdFinish = z.infer<typeof idFinishSchema>;

// ── 5. Face (20 params: 12 base + 8 specific) ────────────────────────────────

export const faceSchema = turningBaseSchema.extend({
  face_direction: z
    .enum(["od_to_center", "center_to_od"])
    .describe("Facing cut direction: outside-in or center-out"),
  face_depth: z
    .number()
    .min(0.05)
    .max(25)
    .describe("Depth of cut per facing pass, mm"),
  overlap: z
    .number()
    .min(0)
    .max(50)
    .describe("Tool overlap beyond workpiece center or OD for full face coverage, mm"),
  multiple_face_passes: z
    .boolean()
    .describe("Enable multiple facing passes for heavy stock removal"),
  face_stock_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Axial stock left on face for finish pass, mm"),
  start_diameter: z
    .number()
    .min(0)
    .max(2000)
    .describe("Starting diameter for facing cut (OD or center), mm"),
  end_diameter: z
    .number()
    .min(0)
    .max(2000)
    .describe("Ending diameter for facing cut, mm"),
  face_spring_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe("Number of zero-depth spring passes on face for flatness"),
});

export type Face = z.infer<typeof faceSchema>;

// ── 6. OD Groove (20 params: 12 base + 8 specific) ───────────────────────────

export const odGrooveSchema = turningBaseSchema.extend({
  groove_width: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Width of the groove to be cut, mm (DFM-critical: must match or be multiple of blade width)"),
  groove_depth: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Radial depth of groove from OD surface, mm"),
  peck_depth: z
    .number()
    .min(0.05)
    .max(50)
    .describe("Radial depth per peck increment during grooving, mm"),
  peck_dwell: z
    .number()
    .min(0)
    .max(10)
    .describe("Dwell time at each peck depth for chip clearing, sec"),
  groove_shape: z
    .enum(["square", "round", "v", "trapezoid"])
    .describe("Cross-sectional shape of the groove profile"),
  side_feed_rate: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Feed rate for side-wall finishing within groove, mm/rev"),
  chamfer_width: z
    .number()
    .min(0)
    .max(5)
    .describe("Chamfer width at groove entry edges, mm"),
  groove_bottom_radius: z
    .number()
    .min(0)
    .max(10)
    .describe("Corner radius at groove bottom — 0 for sharp, mm"),
});

export type OdGroove = z.infer<typeof odGrooveSchema>;

// ── 7. ID Groove (20 params: 12 base + 8 specific) ───────────────────────────

export const idGrooveSchema = turningBaseSchema.extend({
  groove_width: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Width of the internal groove, mm"),
  groove_depth: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Radial depth of internal groove from bore surface, mm"),
  peck_depth: z
    .number()
    .min(0.05)
    .max(50)
    .describe("Radial depth per peck increment during internal grooving, mm"),
  peck_dwell: z
    .number()
    .min(0)
    .max(10)
    .describe("Dwell time at each peck depth for chip clearing, sec"),
  groove_shape: z
    .enum(["square", "round", "v", "trapezoid"])
    .describe("Cross-sectional shape of the internal groove profile"),
  min_bore: z
    .number()
    .min(1)
    .max(2000)
    .describe("Minimum bore diameter for internal grooving tool access, mm"),
  side_feed_rate: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Feed rate for internal groove side-wall finishing, mm/rev"),
  groove_bottom_radius: z
    .number()
    .min(0)
    .max(10)
    .describe("Corner radius at internal groove bottom, mm"),
});

export type IdGroove = z.infer<typeof idGrooveSchema>;

// ── 8. Face Groove (20 params: 12 base + 8 specific) ─────────────────────────

export const faceGrooveSchema = turningBaseSchema.extend({
  groove_width: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Width of the face groove, mm"),
  groove_depth: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Axial depth of face groove from face surface, mm"),
  peck_depth: z
    .number()
    .min(0.05)
    .max(50)
    .describe("Axial depth per peck increment during face grooving, mm"),
  peck_dwell: z
    .number()
    .min(0)
    .max(10)
    .describe("Dwell time at each peck depth, sec"),
  groove_shape: z
    .enum(["square", "round", "v", "trapezoid"])
    .describe("Cross-sectional shape of the face groove profile"),
  face_position: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Axial position of the face groove on the workpiece face, mm"),
  side_feed_rate: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Feed rate for face groove side-wall finishing, mm/rev"),
  groove_bottom_radius: z
    .number()
    .min(0)
    .max(10)
    .describe("Corner radius at face groove bottom, mm"),
});

export type FaceGroove = z.infer<typeof faceGrooveSchema>;

// ── 9. OD Thread (21 params: 12 base + 9 specific) ───────────────────────────

export const odThreadSchema = turningBaseSchema.extend({
  pitch: z
    .number()
    .min(0.1)
    .max(25)
    .describe("Thread pitch (distance between crests), mm (DFM-critical: drives infeed and pass count)"),
  starts: z
    .number()
    .int()
    .min(1)
    .max(8)
    .describe("Number of thread starts for multi-start threads"),
  infeed_method: z
    .enum(["compound", "flank", "modified", "alternating"])
    .describe("Thread infeed strategy: compound (29.5 deg), flank (single side), modified (reduced rubbing), alternating (DFM-critical)"),
  pass_count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Total number of threading passes to reach full depth"),
  spring_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe("Zero-depth spring passes for thread finish improvement"),
  lead_in_threads: z
    .number()
    .min(0)
    .max(5)
    .describe("Number of incomplete lead-in threads before full engagement"),
  thread_form: z
    .enum(["iso_metric", "unc", "unf", "acme", "buttress"])
    .describe("Thread form standard defining profile geometry"),
  thread_depth: z
    .number()
    .min(0.05)
    .max(15)
    .describe("Total thread depth from crest to root, mm"),
  chamfer_at_start: z
    .boolean()
    .describe("Apply chamfer at thread start for lead-in"),
});

export type OdThread = z.infer<typeof odThreadSchema>;

// ── 10. ID Thread (22 params: 12 base + 10 specific) ─────────────────────────

export const idThreadSchema = turningBaseSchema.extend({
  pitch: z
    .number()
    .min(0.1)
    .max(25)
    .describe("Thread pitch for internal thread, mm"),
  starts: z
    .number()
    .int()
    .min(1)
    .max(8)
    .describe("Number of thread starts for multi-start internal threads"),
  infeed_method: z
    .enum(["compound", "flank", "modified", "alternating"])
    .describe("Thread infeed strategy for internal threading"),
  pass_count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Total number of internal threading passes"),
  spring_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .describe("Zero-depth spring passes for internal thread finish"),
  lead_in_threads: z
    .number()
    .min(0)
    .max(5)
    .describe("Lead-in threads before full engagement on internal thread"),
  thread_form: z
    .enum(["iso_metric", "unc", "unf", "acme", "buttress"])
    .describe("Internal thread form standard"),
  min_bore: z
    .number()
    .min(1)
    .max(2000)
    .describe("Minimum bore diameter for internal threading tool access, mm"),
  thread_depth: z
    .number()
    .min(0.05)
    .max(15)
    .describe("Total internal thread depth from crest to root, mm"),
  chamfer_at_start: z
    .boolean()
    .describe("Apply chamfer at internal thread start for lead-in"),
});

export type IdThread = z.infer<typeof idThreadSchema>;

// ── 11. Parting (19 params: 12 base + 7 specific) ────────────────────────────

export const partingSchema = turningBaseSchema.extend({
  blade_width: z
    .number()
    .min(0.5)
    .max(12)
    .describe("Parting blade width, mm"),
  feed_reduction_pct: z
    .number()
    .min(0)
    .max(90)
    .describe("Feed rate reduction percentage as tool approaches center, %"),
  center_coolant: z
    .boolean()
    .describe("Enable center-directed coolant jet during parting"),
  confirmed_diameter: z
    .number()
    .min(0.1)
    .max(2000)
    .describe("Confirmed workpiece diameter at parting location for feed sync, mm"),
  peck_parting: z
    .boolean()
    .describe("Enable peck cycle during parting for chip breaking"),
  peck_increment: z
    .number()
    .min(0.5)
    .max(50)
    .describe("Radial peck increment during peck parting, mm"),
  bar_puller: z
    .boolean()
    .describe("Activate bar puller after parting for bar-fed operations"),
});

export type Parting = z.infer<typeof partingSchema>;

// ── 12. Recessing (18 params: 12 base + 6 specific) ──────────────────────────

export const recessingSchema = turningBaseSchema.extend({
  recess_width: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Width of the recess to be machined, mm"),
  recess_depth: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Radial depth of the recess from workpiece surface, mm"),
  undercut_angle: z
    .number()
    .min(0)
    .max(90)
    .describe("Undercut angle for relief or clearance recesses, degrees"),
  recess_type: z
    .enum(["din_76", "din_509_e", "din_509_f", "custom"])
    .describe("Recess standard type: DIN 76 thread relief, DIN 509 E/F bearing relief, or custom"),
  peck_depth: z
    .number()
    .min(0.05)
    .max(25)
    .describe("Radial peck depth per increment for deep recesses, mm"),
  finish_pass: z
    .boolean()
    .describe("Execute a finish pass on recess walls after roughing"),
});

export type Recessing = z.infer<typeof recessingSchema>;

// ── 13. Boring Cycle (18 params: 12 base + 6 specific) ───────────────────────

export const boringCycleSchema = turningBaseSchema.extend({
  boring_type: z
    .enum(["rough", "fine", "back"])
    .describe("Boring operation type: rough enlargement, fine finishing, or back boring"),
  bar_orientation: z
    .number()
    .min(0)
    .max(360)
    .describe("Angular orientation of the boring bar in the turret, degrees"),
  retract_orient: z
    .boolean()
    .describe("Orient boring bar before retract to prevent drag marks on bore wall"),
  bore_diameter: z
    .number()
    .min(1)
    .max(2000)
    .describe("Target bore diameter after boring, mm"),
  bore_depth: z
    .number()
    .min(0.1)
    .max(5000)
    .describe("Total bore depth from face, mm"),
  fine_boring_shift: z
    .number()
    .min(0)
    .max(2)
    .describe("Radial shift amount for fine boring retract clearance, mm"),
});

export type BoringCycle = z.infer<typeof boringCycleSchema>;

// ── 14. Profiling (18 params: 12 base + 6 specific) ──────────────────────────

export const profilingSchema = turningBaseSchema.extend({
  contour_approach: z
    .enum(["tangent", "direct", "arc"])
    .describe("Approach strategy to the contour: tangent, direct plunge, or arc lead-in"),
  contour_direction: z
    .enum(["longitudinal", "facing"])
    .describe("Primary contour cut direction along workpiece axis or perpendicular"),
  finish_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Stock allowance on profile for subsequent finish pass, mm"),
  contour_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Contour following tolerance for interpolated moves, mm"),
  arc_radius: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Arc radius for arc-type approach/retract moves, mm"),
  retract_method: z
    .enum(["tangent", "direct", "arc"])
    .describe("Retract strategy from contour after profiling pass"),
});

export type Profiling = z.infer<typeof profilingSchema>;

// ── 15. Contour Turning (18 params: 12 base + 6 specific) ────────────────────

export const contourTurningSchema = turningBaseSchema.extend({
  stepover: z
    .number()
    .min(0.01)
    .max(25)
    .describe("Radial stepover between contour passes, mm"),
  steep_angle: z
    .number()
    .min(0)
    .max(90)
    .describe("Threshold angle for steep-region detection — triggers direction switch, degrees"),
  smooth_contour: z
    .boolean()
    .describe("Enable contour smoothing for blended tangential transitions between segments"),
  rest_machining: z
    .boolean()
    .describe("Enable rest-machining mode to clear material left by previous larger tool"),
  contour_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Contour following tolerance for smooth surface generation, mm"),
  wall_taper_angle: z
    .number()
    .min(-10)
    .max(10)
    .describe("Wall taper/draft angle applied to contour surfaces, degrees"),
});

export type ContourTurning = z.infer<typeof contourTurningSchema>;

// ── 16. Mill-Turn Face (18 params: 12 base + 6 specific) ─────────────────────

export const millTurnFaceSchema = turningBaseSchema.extend({
  c_axis_lock: z
    .boolean()
    .describe("Lock C-axis (spindle indexing) for milling on part face"),
  spindle_orient_angle: z
    .number()
    .min(0)
    .max(360)
    .describe("C-axis orientation angle for face milling feature alignment, degrees"),
  live_tool_speed: z
    .number()
    .min(1)
    .max(60000)
    .describe("Live (driven) tool rotational speed for face milling, RPM"),
  milling_feed: z
    .number()
    .min(1)
    .max(10000)
    .describe("Feed rate for face milling with live tool, mm/min"),
  milling_depth: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Axial depth of cut for face milling passes, mm"),
  stepover_width: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Radial stepover width for face milling passes, mm"),
});

export type MillTurnFace = z.infer<typeof millTurnFaceSchema>;

// ── 17. Mill-Turn Radial (18 params: 12 base + 6 specific) ───────────────────

export const millTurnRadialSchema = turningBaseSchema.extend({
  y_axis_offset: z
    .number()
    .min(-500)
    .max(500)
    .describe("Y-axis offset for off-center radial milling features, mm"),
  eccentric_turning: z
    .boolean()
    .describe("Enable eccentric turning mode using synchronized C-axis and Y-axis"),
  polygon_count: z
    .number()
    .int()
    .min(3)
    .max(12)
    .describe("Number of polygon sides for polygon turning operations"),
  live_tool_speed: z
    .number()
    .min(1)
    .max(60000)
    .describe("Live tool rotational speed for radial milling, RPM"),
  radial_depth: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Radial depth of cut for radial milling features, mm"),
  c_axis_index: z
    .number()
    .min(0)
    .max(360)
    .describe("C-axis index angle for radial feature positioning, degrees"),
});

export type MillTurnRadial = z.infer<typeof millTurnRadialSchema>;

// ── 18. Mill-Turn Axial (18 params: 12 base + 6 specific) ────────────────────

export const millTurnAxialSchema = turningBaseSchema.extend({
  axial_depth: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Axial depth of cut for axial milling operations, mm"),
  helical_interpolation: z
    .boolean()
    .describe("Enable helical interpolation for axial bore milling"),
  lead_angle: z
    .number()
    .min(-45)
    .max(45)
    .describe("Lead angle for helical entry into axial features, degrees"),
  live_tool_speed: z
    .number()
    .min(1)
    .max(60000)
    .describe("Live tool rotational speed for axial milling, RPM"),
  helix_pitch: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Helix pitch for helical interpolation entry, mm/rev"),
  plunge_feed: z
    .number()
    .min(1)
    .max(5000)
    .describe("Plunge feed rate for axial entry moves, mm/min"),
});

export type MillTurnAxial = z.infer<typeof millTurnAxialSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 18 turning cycle schemas keyed by cycle type */
export const TURNING_SCHEMA_MAP = {
  od_rough: odRoughSchema,
  od_finish: odFinishSchema,
  id_rough: idRoughSchema,
  id_finish: idFinishSchema,
  face: faceSchema,
  od_groove: odGrooveSchema,
  id_groove: idGrooveSchema,
  face_groove: faceGrooveSchema,
  od_thread: odThreadSchema,
  id_thread: idThreadSchema,
  parting: partingSchema,
  recessing: recessingSchema,
  boring_cycle: boringCycleSchema,
  profiling: profilingSchema,
  contour_turning: contourTurningSchema,
  mill_turn_face: millTurnFaceSchema,
  mill_turn_radial: millTurnRadialSchema,
  mill_turn_axial: millTurnAxialSchema,
} as const;

export type TurningCycleType = keyof typeof TURNING_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata record for every turning cycle type */
export interface TurningCycleMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each turning cycle type with AC Python setter references */
export const TURNING_METADATA: Record<TurningCycleType, TurningCycleMeta> = {
  od_rough: {
    paramCount: 19,
    acPythonSetter: "hm.turning.od_rough",
    description: "OD roughing with constant or adaptive depth-of-cut for stock removal",
    dfmCriticalParams: ["depth_of_cut", "s_max_clamp", "nose_radius"],
  },
  od_finish: {
    paramCount: 18,
    acPythonSetter: "hm.turning.od_finish",
    description: "OD finishing with spring passes and optional burnishing for surface quality",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  id_rough: {
    paramCount: 18,
    acPythonSetter: "hm.turning.id_rough",
    description: "Internal rough boring with L/D ratio monitoring and vibration check",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  id_finish: {
    paramCount: 17,
    acPythonSetter: "hm.turning.id_finish",
    description: "Internal finish boring with dwell-at-bottom for bore surface quality",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  face: {
    paramCount: 20,
    acPythonSetter: "hm.turning.face",
    description: "Facing cycle with direction control and overlap for complete face coverage",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  od_groove: {
    paramCount: 20,
    acPythonSetter: "hm.turning.od_groove",
    description: "OD grooving with peck cycle and configurable groove profile shape",
    dfmCriticalParams: ["groove_width", "s_max_clamp", "nose_radius"],
  },
  id_groove: {
    paramCount: 20,
    acPythonSetter: "hm.turning.id_groove",
    description: "Internal grooving with bore access check and peck cycle",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  face_groove: {
    paramCount: 20,
    acPythonSetter: "hm.turning.face_groove",
    description: "Face grooving at specified axial position with peck cycle",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  od_thread: {
    paramCount: 21,
    acPythonSetter: "hm.turning.od_thread",
    description: "External threading with configurable infeed method and thread form standard",
    dfmCriticalParams: ["pitch", "infeed_method", "s_max_clamp", "nose_radius"],
  },
  id_thread: {
    paramCount: 22,
    acPythonSetter: "hm.turning.id_thread",
    description: "Internal threading with bore access check and configurable infeed",
    dfmCriticalParams: ["pitch", "infeed_method", "s_max_clamp", "nose_radius"],
  },
  parting: {
    paramCount: 19,
    acPythonSetter: "hm.turning.parting",
    description: "Parting/cutoff cycle with feed reduction and center coolant control",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  recessing: {
    paramCount: 18,
    acPythonSetter: "hm.turning.recessing",
    description: "Recessing cycle for undercuts and relief grooves with angle control",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  boring_cycle: {
    paramCount: 18,
    acPythonSetter: "hm.turning.boring_cycle",
    description: "Boring cycle with bar orientation and retract-orient for finish quality",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  profiling: {
    paramCount: 18,
    acPythonSetter: "hm.turning.profiling",
    description: "Contour profiling with tangent/arc approach and longitudinal/facing direction",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  contour_turning: {
    paramCount: 18,
    acPythonSetter: "hm.turning.contour_turning",
    description: "Multi-pass contour turning with steep-angle detection and smoothing",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  mill_turn_face: {
    paramCount: 18,
    acPythonSetter: "hm.turning.mill_turn_face",
    description: "Mill-turn face milling with C-axis lock and live tool speed control",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  mill_turn_radial: {
    paramCount: 18,
    acPythonSetter: "hm.turning.mill_turn_radial",
    description: "Mill-turn radial milling with Y-axis offset and polygon turning",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
  mill_turn_axial: {
    paramCount: 18,
    acPythonSetter: "hm.turning.mill_turn_axial",
    description: "Mill-turn axial milling with helical interpolation for bore features",
    dfmCriticalParams: ["s_max_clamp", "nose_radius"],
  },
};

// ── Computed Totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 18 turning cycle schemas */
export const TURNING_TOTAL_PARAM_COUNT = Object.values(TURNING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
