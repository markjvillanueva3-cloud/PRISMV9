/**
 * Drilling Cycle Parameter Schemas — hyperMILL CAM Drilling
 *
 * U-HKC16: Zod schemas for 15 drilling cycle types used in hyperMILL CAM.
 * Each cycle schema composes shared base sub-schemas (cutting data, geometry,
 * heights) with cycle-specific parameters. DFM-critical parameters are tagged
 * in metadata for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.drill.peck_drill(spindle_speed=3000, feed_rate=250, first_peck_depth=5, ...)
 *
 * @domain CAM-Drilling
 * @milestone HM-KC-MS3/U-HKC16
 */

import { z } from "zod";

// ── Shared Drilling Base Sub-Schemas ────────────────────────────────────────

/** Cutting data parameters shared by all 15 drilling cycle types (8 params) */
export const drillingCuttingDataSchema = z.object({
  spindle_speed: z
    .number()
    .min(1)
    .max(60000)
    .describe("Spindle rotational speed, RPM"),
  feed_rate: z
    .number()
    .min(0.1)
    .max(50000)
    .describe("Axial feed rate during cutting, mm/min"),
  plunge_feed: z
    .number()
    .min(0.1)
    .max(50000)
    .describe("Feed rate during initial plunge into material, mm/min"),
  retract_feed: z
    .number()
    .min(0.1)
    .max(100000)
    .describe("Feed rate during retract moves, mm/min"),
  dwell_time: z
    .number()
    .min(0)
    .max(30)
    .default(0)
    .describe("Bottom-of-hole dwell time for chip clearing and surface finish, sec"),
  coolant_mode: z
    .enum(["flood", "mist", "through_spindle", "air_blast", "mql", "dry", "high_pressure"])
    .describe("Coolant delivery mode for the drilling cycle"),
  spindle_direction: z
    .enum(["cw", "ccw"])
    .default("cw")
    .describe("Spindle rotation direction: clockwise or counter-clockwise"),
  cutting_speed: z
    .number()
    .min(0.1)
    .max(2000)
    .describe("Surface cutting speed at drill periphery, m/min"),
});

export type DrillingCuttingData = z.infer<typeof drillingCuttingDataSchema>;

/** Hole geometry parameters shared by all 15 drilling cycle types (6 params) */
export const drillingGeometrySchema = z.object({
  hole_diameter: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Nominal hole diameter, mm"),
  hole_depth: z
    .number()
    .min(0.1)
    .max(5000)
    .describe("Total hole depth from top of part, mm"),
  start_depth: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Starting depth offset from top of part (0 = part surface), mm"),
  tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Hole diameter tolerance, mm"),
  bottom_type: z
    .enum(["flat", "conical", "through"])
    .default("conical")
    .describe("Hole bottom geometry: flat (endmill/insert), conical (twist drill), or through hole"),
  surface_finish_target: z
    .number()
    .min(0.1)
    .max(50)
    .default(3.2)
    .describe("Target surface roughness Ra for hole wall, micrometers"),
});

export type DrillingGeometry = z.infer<typeof drillingGeometrySchema>;

/** Height/plane parameters shared by all 15 drilling cycle types (6 params) */
export const drillingHeightsSchema = z.object({
  clearance_plane: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Clearance plane height for rapid traverse above part, mm"),
  retract_height: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Retract height between pecks or cycles, mm"),
  feed_height: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Height at which feed rate engages (rapid-to-feed transition), mm"),
  top_of_part: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Z-height of the top of part surface, mm"),
  safety_distance: z
    .number()
    .min(0.5)
    .max(100)
    .default(2)
    .describe("Safety distance above part surface for approach moves, mm"),
  incremental_heights: z
    .boolean()
    .default(false)
    .describe("Interpret heights as incremental from WCS origin rather than absolute"),
});

export type DrillingHeights = z.infer<typeof drillingHeightsSchema>;

/** Merge helper: combine base sub-schemas into a single base for .merge() (20 base params) */
const drillingBaseSchema = drillingCuttingDataSchema
  .merge(drillingGeometrySchema)
  .merge(drillingHeightsSchema);

// ── 1. Spot Drill (25 params: 20 base + 5 specific) ────────────────────────

export const spotDrillSchema = drillingBaseSchema.extend({
  spot_angle: z
    .enum(["60", "90", "118", "120", "140"])
    .describe("Spot drill included angle, degrees"),
  spot_depth_mode: z
    .enum(["diameter", "depth", "angle"])
    .describe("Method for controlling spot drill depth: by resulting diameter, absolute depth, or angle"),
  spot_target_value: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Target value for spot depth (diameter in mm, depth in mm, or angle in degrees depending on mode)"),
  center_drill_first: z
    .boolean()
    .default(false)
    .describe("Execute a center drill operation before the spot drill"),
  deburr_pass: z
    .boolean()
    .default(false)
    .describe("Add a light deburr pass at the top of the spot after drilling"),
});

export type SpotDrill = z.infer<typeof spotDrillSchema>;

// ── 2. Peck Drill (28 params: 20 base + 8 specific) ────────────────────────

export const peckDrillSchema = drillingBaseSchema.extend({
  first_peck_depth: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Depth of first peck increment, mm (DFM-critical: typically 1-3x drill diameter)"),
  peck_reduction: z
    .number()
    .min(0)
    .max(100)
    .describe("Amount each successive peck depth decreases, mm"),
  min_peck: z
    .number()
    .min(0.05)
    .max(100)
    .describe("Minimum peck depth after reduction, mm"),
  chip_break: z
    .boolean()
    .default(false)
    .describe("Enable chip-break mode: partial retract instead of full retract between pecks"),
  retract_amount: z
    .number()
    .min(0.1)
    .max(500)
    .default(1)
    .describe("Retract distance between pecks (full retract or chip-break distance), mm"),
  peck_dwell: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Dwell at bottom of each peck before retract, sec"),
  rapid_to_previous: z
    .boolean()
    .default(true)
    .describe("Rapid traverse to previous peck depth before resuming feed"),
  peck_count_limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(100)
    .describe("Maximum number of pecks before cycle abort (safety limit)"),
});

export type PeckDrill = z.infer<typeof peckDrillSchema>;

// ── 3. Deep Hole Drill (28 params: 20 base + 8 specific) ───────────────────

export const deepHoleDrillSchema = drillingBaseSchema.extend({
  ld_ratio_limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Maximum L/D ratio before requiring peck cycle (DFM-critical: blocks > 10 without peck)"),
  peck_type: z
    .enum(["full_retract", "chip_break", "progressive"])
    .describe("Deep hole peck strategy: full retract, chip-break, or progressive depth reduction"),
  coolant_pressure: z
    .number()
    .min(1)
    .max(300)
    .describe("Coolant pressure for chip evacuation in deep holes, bar"),
  pilot_depth_ratio: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe("Pilot hole depth as ratio of drill diameter"),
  chip_evacuation_frequency: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(5)
    .describe("Full retract for chip evacuation every N pecks"),
  progressive_reduction_pct: z
    .number()
    .min(0)
    .max(80)
    .default(20)
    .describe("Percentage reduction per successive peck in progressive mode, %"),
  tool_wear_compensation: z
    .boolean()
    .default(false)
    .describe("Enable automatic tool wear compensation for long deep-hole operations"),
  vibration_monitoring: z
    .boolean()
    .default(false)
    .describe("Enable vibration monitoring and adaptive feed for deep hole stability"),
});

export type DeepHoleDrill = z.infer<typeof deepHoleDrillSchema>;

// ── 4. Gun Drill (27 params: 20 base + 7 specific) ─────────────────────────

export const gunDrillSchema = drillingBaseSchema.extend({
  pilot_hole_depth: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Depth of pilot hole required before gun drill engagement, mm"),
  guide_bush: z
    .boolean()
    .default(true)
    .describe("Whether a guide bush is used for initial drill alignment"),
  minimum_diameter: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Minimum hole diameter for gun drilling operation, mm"),
  bush_clearance: z
    .number()
    .min(0.005)
    .max(0.5)
    .default(0.02)
    .describe("Clearance between drill and guide bush bore, mm"),
  counter_rotation: z
    .boolean()
    .default(false)
    .describe("Enable workpiece counter-rotation for improved straightness"),
  oil_pressure: z
    .number()
    .min(5)
    .max(200)
    .default(70)
    .describe("Internal oil pressure for chip evacuation, bar"),
  max_hole_length: z
    .number()
    .min(10)
    .max(10000)
    .describe("Maximum hole length for gun drilling operation, mm"),
});

export type GunDrill = z.infer<typeof gunDrillSchema>;

// ── 5. Boring (27 params: 20 base + 7 specific) ────────────────────────────

export const boringSchema = drillingBaseSchema.extend({
  boring_type: z
    .enum(["rough", "fine", "back"])
    .describe("Boring operation type: roughing, fine finishing, or back boring"),
  bar_orientation: z
    .number()
    .min(0)
    .max(360)
    .describe("Angular orientation of the boring bar for single-point operations, degrees"),
  spring_pass: z
    .boolean()
    .default(false)
    .describe("Execute a spring pass (repeat at final depth) for improved roundness"),
  retract_orient: z
    .boolean()
    .default(true)
    .describe("Orient spindle before retract to clear bore surface (fine boring)"),
  radial_depth_of_cut: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Radial depth of cut per pass, mm"),
  bar_overhang: z
    .number()
    .min(10)
    .max(1000)
    .describe("Boring bar overhang length from holder, mm (affects deflection)"),
  damped_bar: z
    .boolean()
    .default(false)
    .describe("Using vibration-damped boring bar for long overhang operations"),
});

export type Boring = z.infer<typeof boringSchema>;

// ── 6. Reaming (27 params: 20 base + 7 specific) ───────────────────────────

export const reamingSchema = drillingBaseSchema.extend({
  ream_allowance: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Stock allowance left for the reaming operation, mm"),
  floating_holder: z
    .boolean()
    .default(false)
    .describe("Whether a floating holder is used to allow self-centering of the reamer"),
  speed_reduction_pct: z
    .number()
    .min(0)
    .max(90)
    .default(30)
    .describe("Percentage reduction of spindle speed compared to drilling, %"),
  exit_dwell: z
    .number()
    .min(0)
    .max(30)
    .default(0.5)
    .describe("Dwell time at hole bottom before reamer retraction, sec"),
  reamer_type: z
    .enum(["straight_flute", "helical_flute", "carbide_tipped", "adjustable"])
    .describe("Reamer type affecting cutting parameters and surface finish"),
  hand_of_cut: z
    .enum(["right", "left"])
    .default("right")
    .describe("Reamer hand of cut for flute direction"),
  pilot_bore_required: z
    .boolean()
    .default(true)
    .describe("Whether a pilot bore is required before reaming"),
});

export type Reaming = z.infer<typeof reamingSchema>;

// ── 7. Tapping (28 params: 20 base + 8 specific) ───────────────────────────

export const tappingSchema = drillingBaseSchema.extend({
  thread_pitch: z
    .number()
    .min(0.2)
    .max(25)
    .describe("Thread pitch, mm (DFM-critical: feed must equal pitch x RPM for rigid tapping)"),
  tap_type: z
    .enum(["cut", "form", "roll"])
    .describe("Tap cutting method: cutting (chip-producing), forming, or rolling"),
  rigid_tapping: z
    .boolean()
    .default(true)
    .describe("Enable rigid/synchronous tapping mode (requires synchronized spindle)"),
  peck_tapping: z
    .boolean()
    .default(false)
    .describe("Enable peck tapping for deep or difficult-to-tap holes"),
  reverse_speed_factor: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe("Multiplier for reverse (retraction) spindle speed relative to forward speed"),
  thread_percentage: z
    .number()
    .min(50)
    .max(100)
    .default(75)
    .describe("Thread engagement percentage (DFM-critical: 65-75% typical, 100% risks tap breakage)"),
  tap_peck_depth: z
    .number()
    .min(0.5)
    .max(100)
    .optional()
    .describe("Peck depth for peck tapping mode, mm"),
  length_of_engagement: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Thread engagement length (thread depth), mm"),
});

export type Tapping = z.infer<typeof tappingSchema>;

// ── 8. Thread Milling (28 params: 20 base + 8 specific) ────────────────────

export const threadMillingSchema = drillingBaseSchema.extend({
  thread_pitch: z
    .number()
    .min(0.2)
    .max(25)
    .describe("Thread pitch for milling, mm"),
  passes: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(1)
    .describe("Number of radial passes for thread milling"),
  crest_clearance: z
    .number()
    .min(0)
    .max(5)
    .default(0.1)
    .describe("Radial clearance from thread crest for approach/exit, mm"),
  thread_direction: z
    .enum(["right", "left"])
    .default("right")
    .describe("Thread hand direction: right-hand or left-hand"),
  approach_arc: z
    .boolean()
    .default(true)
    .describe("Use helical arc approach into thread (vs. radial plunge)"),
  climb_conventional: z
    .enum(["climb", "conventional"])
    .default("climb")
    .describe("Milling direction: climb (down) or conventional (up)"),
  thread_form: z
    .enum(["metric", "unc", "unf", "bsp", "npt", "acme"])
    .describe("Thread form standard for pitch and profile validation"),
  single_tooth: z
    .boolean()
    .default(false)
    .describe("Use single-tooth thread mill for large pitches or non-standard forms"),
});

export type ThreadMilling = z.infer<typeof threadMillingSchema>;

// ── 9. Countersink (26 params: 20 base + 6 specific) ───────────────────────

export const countersinkSchema = drillingBaseSchema.extend({
  cs_angle: z
    .number()
    .min(30)
    .max(120)
    .describe("Countersink included angle, degrees (DFM-critical: must match fastener spec)"),
  cs_diameter: z
    .number()
    .min(1)
    .max(200)
    .describe("Target countersink diameter at part surface, mm"),
  depth_control: z
    .enum(["diameter", "depth"])
    .describe("Countersink depth control method: by resulting diameter or absolute depth"),
  deburr_only: z
    .boolean()
    .default(false)
    .describe("Deburr-only mode: light pass for edge break without full countersink"),
  multi_flute_count: z
    .number()
    .int()
    .min(1)
    .max(12)
    .default(3)
    .describe("Number of cutting flutes on countersink tool"),
  back_countersink: z
    .boolean()
    .default(false)
    .describe("Countersink from the back side of the part through an existing hole"),
});

export type Countersink = z.infer<typeof countersinkSchema>;

// ── 10. Counterbore (26 params: 20 base + 6 specific) ──────────────────────

export const counterboreSchema = drillingBaseSchema.extend({
  cb_diameter: z
    .number()
    .min(1)
    .max(500)
    .describe("Counterbore diameter, mm"),
  cb_depth: z
    .number()
    .min(0.1)
    .max(200)
    .describe("Counterbore depth, mm"),
  spot_face: z
    .boolean()
    .default(false)
    .describe("Spot face mode: minimal-depth counterbore for surface cleanup only"),
  corner_radius: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Corner radius at bottom of counterbore, mm"),
  pilot_diameter: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Pilot diameter for guided counterbore tool, mm"),
  multi_step: z
    .boolean()
    .default(false)
    .describe("Multi-step counterbore with roughing and finishing passes"),
});

export type Counterbore = z.infer<typeof counterboreSchema>;

// ── 11. Back Spot Face (26 params: 20 base + 6 specific) ───────────────────

export const backSpotFaceSchema = drillingBaseSchema.extend({
  bsf_diameter: z
    .number()
    .min(1)
    .max(500)
    .describe("Back spot face diameter, mm"),
  bsf_depth: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Back spot face depth (material removal from back side), mm"),
  retract_through_hole: z
    .boolean()
    .default(true)
    .describe("Retract tool through the existing hole after back spot face operation"),
  through_hole_diameter: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Diameter of existing through hole for tool insertion, mm"),
  blade_deployment: z
    .enum(["spring", "coolant_actuated", "manual"])
    .default("spring")
    .describe("Cutting blade deployment mechanism for back spot face tool"),
  approach_feed_pct: z
    .number()
    .min(10)
    .max(100)
    .default(50)
    .describe("Feed rate during blade deployment approach as percentage of cutting feed, %"),
});

export type BackSpotFace = z.infer<typeof backSpotFaceSchema>;

// ── 12. Helical Bore (27 params: 20 base + 7 specific) ─────────────────────

export const helicalBoreSchema = drillingBaseSchema.extend({
  helix_pitch: z
    .number()
    .min(0.05)
    .max(50)
    .describe("Axial advance per helical revolution, mm"),
  helix_diameter: z
    .number()
    .min(1)
    .max(1000)
    .describe("Target bore diameter for helical interpolation, mm"),
  roughing_passes: z
    .number()
    .int()
    .min(0)
    .max(50)
    .default(1)
    .describe("Number of roughing passes before finishing"),
  finishing_pass: z
    .boolean()
    .default(true)
    .describe("Execute a finishing pass at final diameter"),
  radial_stepover: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Radial stepover between roughing passes, mm"),
  ramp_type: z
    .enum(["helical", "zigzag", "plunge"])
    .default("helical")
    .describe("Ramp entry type for helical bore milling"),
  finishing_allowance: z
    .number()
    .min(0)
    .max(5)
    .default(0.1)
    .describe("Stock left for finishing pass, mm"),
});

export type HelicalBore = z.infer<typeof helicalBoreSchema>;

// ── 13. Circular Pocket Drill (27 params: 20 base + 7 specific) ────────────

export const circularPocketDrillSchema = drillingBaseSchema.extend({
  pocket_diameter: z
    .number()
    .min(1)
    .max(1000)
    .describe("Target circular pocket diameter, mm"),
  stepover_pct: z
    .number()
    .min(1)
    .max(95)
    .describe("Radial stepover as percentage of tool diameter, %"),
  ramp_angle: z
    .number()
    .min(0.5)
    .max(45)
    .describe("Helical ramp-down angle for pocket entry, degrees"),
  pocket_depth: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Circular pocket depth, mm"),
  axial_stepdown: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Axial depth of cut per level, mm"),
  floor_finish_pass: z
    .boolean()
    .default(true)
    .describe("Execute a separate finishing pass on the pocket floor"),
  wall_finish_pass: z
    .boolean()
    .default(true)
    .describe("Execute a separate finishing pass on the pocket wall"),
});

export type CircularPocketDrill = z.infer<typeof circularPocketDrillSchema>;

// ── 14. Chamfer Drill (26 params: 20 base + 6 specific) ────────────────────

export const chamferDrillSchema = drillingBaseSchema.extend({
  chamfer_width: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Chamfer width measured along the edge, mm"),
  chamfer_angle: z
    .enum(["45", "60", "90"])
    .describe("Chamfer included angle, degrees"),
  depth_from_edge: z
    .number()
    .min(0)
    .max(50)
    .describe("Depth offset measured from hole edge for chamfer start, mm"),
  tip_compensation: z
    .boolean()
    .default(true)
    .describe("Enable tool tip diameter compensation for accurate chamfer width"),
  multi_pass: z
    .boolean()
    .default(false)
    .describe("Use multiple passes for large chamfers to avoid excessive engagement"),
  orbital_chamfer: z
    .boolean()
    .default(false)
    .describe("Use orbital (helical) motion instead of plunge for chamfer creation"),
});

export type ChamferDrill = z.infer<typeof chamferDrillSchema>;

// ── 15. Combined Cycle (27 params: 20 base + 7 specific) ───────────────────

export const combinedCycleSchema = drillingBaseSchema.extend({
  sub_cycles: z
    .array(
      z.enum([
        "spot_drill",
        "peck_drill",
        "deep_hole_drill",
        "gun_drill",
        "boring",
        "reaming",
        "tapping",
        "thread_milling",
        "countersink",
        "counterbore",
        "back_spot_face",
        "helical_bore",
        "circular_pocket_drill",
        "chamfer_drill",
      ]),
    )
    .min(2)
    .max(10)
    .describe("Ordered list of sub-cycle types to execute in sequence"),
  sequence_mode: z
    .enum(["sequential", "optimized"])
    .default("sequential")
    .describe("Execution order: sequential (as listed) or optimized (tool-change minimized)"),
  tool_change_strategy: z
    .enum(["minimize_changes", "minimize_time", "group_by_tool"])
    .default("minimize_changes")
    .describe("Strategy for ordering tool changes within combined cycle"),
  inter_cycle_retract: z
    .boolean()
    .default(true)
    .describe("Retract to clearance plane between sub-cycles"),
  shared_pilot: z
    .boolean()
    .default(false)
    .describe("Share pilot hole across sub-cycles that require one"),
  cycle_repeat_count: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .describe("Number of times to repeat the entire combined cycle sequence"),
  abort_on_error: z
    .boolean()
    .default(true)
    .describe("Abort remaining sub-cycles if any sub-cycle encounters an error"),
});

export type CombinedCycle = z.infer<typeof combinedCycleSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 15 drilling cycle schemas keyed by cycle type */
export const DRILLING_SCHEMA_MAP = {
  spot_drill: spotDrillSchema,
  peck_drill: peckDrillSchema,
  deep_hole_drill: deepHoleDrillSchema,
  gun_drill: gunDrillSchema,
  boring: boringSchema,
  reaming: reamingSchema,
  tapping: tappingSchema,
  thread_milling: threadMillingSchema,
  countersink: countersinkSchema,
  counterbore: counterboreSchema,
  back_spot_face: backSpotFaceSchema,
  helical_bore: helicalBoreSchema,
  circular_pocket_drill: circularPocketDrillSchema,
  chamfer_drill: chamferDrillSchema,
  combined_cycle: combinedCycleSchema,
} as const;

export type DrillingCycleType = keyof typeof DRILLING_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata record for every drilling cycle type */
export interface DrillingCycleMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each drilling cycle type with AC Python setter references */
export const DRILLING_METADATA: Record<DrillingCycleType, DrillingCycleMeta> = {
  spot_drill: {
    paramCount: 25,
    acPythonSetter: "hm.drill.spot_drill",
    description: "Spot drilling for hole location and chamfer preparation with angle-controlled depth",
  },
  peck_drill: {
    paramCount: 28,
    acPythonSetter: "hm.drill.peck_drill",
    description: "Peck drilling with progressive depth reduction for chip evacuation",
    dfmCriticalParams: ["first_peck_depth", "min_peck"],
  },
  deep_hole_drill: {
    paramCount: 28,
    acPythonSetter: "hm.drill.deep_hole_drill",
    description: "Deep hole drilling with L/D ratio monitoring and high-pressure coolant",
    dfmCriticalParams: ["ld_ratio_limit", "coolant_pressure"],
  },
  gun_drill: {
    paramCount: 27,
    acPythonSetter: "hm.drill.gun_drill",
    description: "Gun drilling for very deep holes with pilot hole and guide bush support",
  },
  boring: {
    paramCount: 27,
    acPythonSetter: "hm.drill.boring",
    description: "Boring cycle for precision hole finishing with bar orientation control",
  },
  reaming: {
    paramCount: 27,
    acPythonSetter: "hm.drill.reaming",
    description: "Reaming for tight-tolerance hole finishing with floating holder support",
  },
  tapping: {
    paramCount: 28,
    acPythonSetter: "hm.drill.tapping",
    description: "Tapping cycle with rigid/synchronous mode and pitch-feed synchronization",
    dfmCriticalParams: ["thread_pitch", "rigid_tapping"],
  },
  thread_milling: {
    paramCount: 28,
    acPythonSetter: "hm.drill.thread_milling",
    description: "Thread milling with helical interpolation for internal/external threads",
  },
  countersink: {
    paramCount: 26,
    acPythonSetter: "hm.drill.countersink",
    description: "Countersinking for fastener head seating with angle and diameter control",
    dfmCriticalParams: ["cs_angle"],
  },
  counterbore: {
    paramCount: 26,
    acPythonSetter: "hm.drill.counterbore",
    description: "Counterboring for socket-head cap screw seating or spot facing",
  },
  back_spot_face: {
    paramCount: 26,
    acPythonSetter: "hm.drill.back_spot_face",
    description: "Back spot facing through existing hole for rear-surface preparation",
  },
  helical_bore: {
    paramCount: 27,
    acPythonSetter: "hm.drill.helical_bore",
    description: "Helical bore milling for precision bores larger than available drills",
  },
  circular_pocket_drill: {
    paramCount: 27,
    acPythonSetter: "hm.drill.circular_pocket_drill",
    description: "Circular pocket drilling with helical ramp entry and radial stepover",
  },
  chamfer_drill: {
    paramCount: 26,
    acPythonSetter: "hm.drill.chamfer_drill",
    description: "Chamfer drilling for edge break and deburr with controlled angle and width",
  },
  combined_cycle: {
    paramCount: 27,
    acPythonSetter: "hm.drill.combined_cycle",
    description: "Combined multi-operation cycle sequencing multiple drill types per hole feature",
  },
};

// ── Computed Totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 15 drilling cycle schemas */
export const DRILLING_TOTAL_PARAM_COUNT = Object.values(DRILLING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
