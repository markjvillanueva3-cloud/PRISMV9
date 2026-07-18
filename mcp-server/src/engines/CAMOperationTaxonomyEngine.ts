/**
 * CAMOperationTaxonomyEngine — CAM-AI-TRAINING-MS0/U-CAMT-B01
 *
 * Canonical taxonomy of CAM TOOLPATH operations (distinct from
 * CADOperationTaxonomyEngine, which classifies CAD modelling ops like
 * sketch/extrude/fillet). This engine grounds the template-generation
 * pipeline: every Phase-B template references a CamOperation from here.
 *
 * Two-layer taxonomy:
 *
 *   1. CamOperation — canonical operation type (e.g. "face", "pocket_2d",
 *      "adaptive_clearing", "swarf_5axis", "drill_peck", "thread_mill").
 *   2. PerSoftwareMapping — same operation in 24+ CAM systems' native
 *      vocabulary (Fusion 360 "2D Pocket", Mastercam "Dynamic Mill",
 *      hyperMILL "Z-Level Roughing", SolidCAM "iMachining 2D", ...).
 *
 * Per real-data discipline, every mapping references ONLY documented
 * software features — no invented operations. Sources:
 *   - Fusion 360 Function Index (data/cam-functions/fusion360/)
 *   - Mastercam CAD Function Index (data/cam-functions/mastercam/)
 *   - HyperMILL Function Index, Inventor HSM Function Index, etc.
 *
 * Architecture: pure-logic, no I/O, no engine-imports beyond BaseEngine.
 *
 * The taxonomy is FROZEN at v1 once shipped — any new operation type
 * requires explicit versioning + migration path so downstream LoRA / GNN
 * / template-generator artifacts remain stable.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

// ── Operation enumeration ───────────────────────────────────────────────────

/** Canonical CAM operation types. v1 — DO NOT REORDER. */
export const CAM_OPERATIONS = [
  // 2D milling
  "face",
  "contour_2d",
  "pocket_2d",
  "slot_2d",
  "engrave_2d",
  "trace_2d",
  "chamfer_2d",
  // 2.5D / adaptive
  "adaptive_clearing_2d",
  "adaptive_clearing_3d",
  "rest_machining_2d",
  "rest_machining_3d",
  "trochoidal_2d",
  // Drilling / hole
  "drill",
  "drill_peck",
  "drill_deep",
  "spot_drill",
  "bore",
  "ream",
  "counterbore",
  "countersink",
  "tap_rigid",
  "tap_floating",
  "thread_mill",
  "thread_turn",
  // 3D surface finishing
  "parallel_3d",
  "scallop_3d",
  "waterline_3d",
  "morph_3d",
  "spiral_3d",
  "radial_3d",
  "flowline_3d",
  "pencil_3d",
  "horizontal_3d",
  "steep_shallow_3d",
  "project_3d",
  "between_curves_3d",
  // 5-axis / multi-axis
  "swarf_5axis",
  "tilt_3plus2",
  "tilt_5axis_simultaneous",
  "morph_between_two_curves_5axis",
  "flow_5axis",
  "multi_axis_contour",
  "port_machining_5axis",
  "impeller_blade_5axis",
  "blade_hub_shroud_5axis",
  // Turning / mill-turn
  "turn_rough",
  "turn_finish",
  "turn_groove",
  "turn_part",
  "turn_thread",
  "turn_bore",
  "turn_face",
  "turn_drill",
  "live_tool_mill",
  "live_tool_drill",
  // Specialty
  "probe_wcs",
  "probe_part_inspect",
  "probe_tool_measure",
  "deburr",
  "edge_break",
  // EDM / waterjet / laser / additive
  "wedm_2axis",
  "wedm_4axis_taper",
  "sinker_edm",
  "laser_cut",
  "laser_engrave",
  "waterjet_cut",
  "additive_deposition",
] as const;

export type CamOperation = (typeof CAM_OPERATIONS)[number];

/** Axis-count requirement for a CAM operation. */
export type AxisCount = "2" | "2.5" | "3" | "3+2" | "4" | "5";

/** Stock model the operation expects. */
export type StockModel = "billet" | "casting" | "forging" | "prior_op" | "tube" | "bar" | "sheet" | "none";

/** High-level operation family — used for UI grouping + template clustering. */
export type OperationFamily =
  | "milling_2d"
  | "milling_3d"
  | "milling_5axis"
  | "drilling"
  | "turning"
  | "mill_turn"
  | "probing"
  | "finishing"
  | "edm"
  | "laser"
  | "waterjet"
  | "additive";

export interface CamOperationSpec {
  id: CamOperation;
  family: OperationFamily;
  axisCount: AxisCount;
  defaultStock: StockModel;
  /** Whether the op is a roughing / finishing / mixed strategy. */
  strategy: "roughing" | "semi_finish" | "finishing" | "mixed" | "specialty";
  /** Feature classes this op typically handles (informs feature → op mapping). */
  featureClasses: ReadonlyArray<string>;
  /** Human-readable one-liner. */
  description: string;
}

/** All 24+ supported CAM software systems. Order is taxonomy v1 — DO NOT REORDER. */
export const CAM_SYSTEMS = [
  "fusion360",
  "mastercam",
  "hypermill",
  "solidcam",
  "inventor_hsm",
  "nx_cam",
  "powermill",
  "esprit",
  "catia_machining",
  "edgecam",
  "gibbscam",
  "worknc",
  "topsolid",
  "camworks",
  "tebis",
  "bobcad",
  "cimatron",
  "sprutcam",
  "alphacam",
  "featurecam",
  "vericut",
  "surfcam",
  "visi",
  "creo",
  "partmaker",
] as const;

export type CamSystem = (typeof CAM_SYSTEMS)[number];

export interface PerSoftwareMapping {
  /** The native-vocabulary name the CAM software uses for this operation. */
  nativeName: string;
  /** Whether the software supports this op at all. */
  supported: boolean;
  /** Optional per-software notes (license tier, addon required, etc.). */
  notes?: string;
}

// ── Operation specs (v1 — frozen) ───────────────────────────────────────────

const OPERATION_SPECS: Record<CamOperation, CamOperationSpec> = {
  face: { id: "face", family: "milling_2d", axisCount: "3", defaultStock: "billet", strategy: "roughing", featureClasses: ["face", "top_surface"], description: "Face milling — clear top surface to nominal Z, square-shoulder cutter typical." },
  contour_2d: { id: "contour_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["external_profile", "internal_profile"], description: "2D contour follow — closed/open profile at constant Z." },
  pocket_2d: { id: "pocket_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "billet", strategy: "roughing", featureClasses: ["pocket", "closed_pocket", "open_pocket"], description: "2D pocket clear — offset / spiral / zig pattern, constant Z stepdown." },
  slot_2d: { id: "slot_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "billet", strategy: "mixed", featureClasses: ["slot", "keyway"], description: "2D slot — single-pass or pocket-style depending on width vs tool dia." },
  engrave_2d: { id: "engrave_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["text", "logo", "serial"], description: "Engraving along 2D curves at shallow depth (V-bit typical)." },
  trace_2d: { id: "trace_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["polyline", "open_curve"], description: "2D trace — single-pass curve follow, no offset." },
  chamfer_2d: { id: "chamfer_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["edge", "chamfer"], description: "2D chamfer — chamfer-mill along edge at fixed depth/angle." },
  adaptive_clearing_2d: { id: "adaptive_clearing_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "billet", strategy: "roughing", featureClasses: ["pocket", "open_pocket"], description: "2.5D adaptive (high-feed, constant-engagement) clearing." },
  adaptive_clearing_3d: { id: "adaptive_clearing_3d", family: "milling_3d", axisCount: "3", defaultStock: "billet", strategy: "roughing", featureClasses: ["solid", "3d_pocket"], description: "3D adaptive clearing — constant tool engagement, deep stepdown." },
  rest_machining_2d: { id: "rest_machining_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "prior_op", strategy: "semi_finish", featureClasses: ["pocket", "remainder"], description: "2D rest mill — clear residue from a prior, larger-tool operation." },
  rest_machining_3d: { id: "rest_machining_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "semi_finish", featureClasses: ["solid", "remainder"], description: "3D rest machining — pencil / parallel against the prior-op residue." },
  trochoidal_2d: { id: "trochoidal_2d", family: "milling_2d", axisCount: "2.5", defaultStock: "billet", strategy: "roughing", featureClasses: ["slot", "narrow_pocket"], description: "Trochoidal slot — circular loop motion for hardened materials." },
  drill: { id: "drill", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["hole", "thru_hole", "blind_hole"], description: "Drill cycle — G81 / G83 / G73." },
  drill_peck: { id: "drill_peck", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["hole", "deep_hole"], description: "Peck drill — G83 with retract for chip evacuation." },
  drill_deep: { id: "drill_deep", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["deep_hole"], description: "Gundrill / deep-hole drilling — L/D > 10 typical." },
  spot_drill: { id: "spot_drill", family: "drilling", axisCount: "3", defaultStock: "billet", strategy: "specialty", featureClasses: ["hole_start"], description: "Spot drill — pilot for accurate hole start." },
  bore: { id: "bore", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["hole_bore"], description: "Bore cycle — G85 / G86 for finished hole diameter." },
  ream: { id: "ream", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["hole_ream"], description: "Ream cycle — finish hole dia + surface finish, small stock." },
  counterbore: { id: "counterbore", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["counterbore"], description: "Counterbore — flat-bottom hole feature for cap-screw heads." },
  countersink: { id: "countersink", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["countersink"], description: "Countersink — conical hole feature for flat-head screws." },
  tap_rigid: { id: "tap_rigid", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["tapped_hole"], description: "Rigid tap — G84 with synchronized spindle." },
  tap_floating: { id: "tap_floating", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["tapped_hole"], description: "Floating-holder tap — for machines without rigid-tap capability." },
  thread_mill: { id: "thread_mill", family: "drilling", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["tapped_hole", "internal_thread"], description: "Thread mill — helical-interp internal thread, any pitch / dia." },
  thread_turn: { id: "thread_turn", family: "turning", axisCount: "2", defaultStock: "bar", strategy: "specialty", featureClasses: ["external_thread", "internal_thread"], description: "Single-point thread turning — G76 cycle, multi-pass." },
  parallel_3d: { id: "parallel_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "3D parallel finish — fixed XY direction, scallop along surface." },
  scallop_3d: { id: "scallop_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "3D scallop / constant-cusp finish — equal scallop height across surface." },
  waterline_3d: { id: "waterline_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface", "steep_surface"], description: "Z-level / waterline — best for steep walls." },
  morph_3d: { id: "morph_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "Morphed 3D pass between two guide curves." },
  spiral_3d: { id: "spiral_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "3D spiral finish — smooth Archimedean spiral over surface." },
  radial_3d: { id: "radial_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface", "axisymmetric"], description: "3D radial — spokes from a center point." },
  flowline_3d: { id: "flowline_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "Flowline finish — follows isoparametric surface curves." },
  pencil_3d: { id: "pencil_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["surface_corner", "fillet"], description: "Pencil pass — single-line in corners + fillet bottoms." },
  horizontal_3d: { id: "horizontal_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["horizontal_surface"], description: "3D horizontal — flat-area detection + clearing." },
  steep_shallow_3d: { id: "steep_shallow_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface"], description: "Combined steep + shallow — waterline + scallop in one op." },
  project_3d: { id: "project_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["curve_on_surface"], description: "3D project — drape 2D curves onto a 3D surface." },
  between_curves_3d: { id: "between_curves_3d", family: "milling_3d", axisCount: "3", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["surface_between"], description: "3D between-two-curves — bounded surface finish." },
  swarf_5axis: { id: "swarf_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["ruled_surface", "side_wall"], description: "5-axis swarf cut — flute-side of cutter follows a ruled surface." },
  tilt_3plus2: { id: "tilt_3plus2", family: "milling_5axis", axisCount: "3+2", defaultStock: "prior_op", strategy: "mixed", featureClasses: ["tilted_face", "angled_pocket"], description: "3+2 — index two rotaries then 3-axis milling at that tilt." },
  tilt_5axis_simultaneous: { id: "tilt_5axis_simultaneous", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["complex_surface"], description: "Simultaneous 5-axis — all 5 axes co-move during cut." },
  morph_between_two_curves_5axis: { id: "morph_between_two_curves_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["complex_surface"], description: "5-axis morph between two 3D curves." },
  flow_5axis: { id: "flow_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["ruled_surface", "isoparam"], description: "5-axis flow — tool axis tilts to follow surface flow." },
  multi_axis_contour: { id: "multi_axis_contour", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["3d_curve"], description: "Multi-axis contour — tool axis tilted along a 3D path." },
  port_machining_5axis: { id: "port_machining_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["port", "internal_passage"], description: "5-axis port machining — internal-passage swarf / barrel-cutter." },
  impeller_blade_5axis: { id: "impeller_blade_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["impeller_blade"], description: "5-axis impeller blade — hub-shroud-blade integrated cycle." },
  blade_hub_shroud_5axis: { id: "blade_hub_shroud_5axis", family: "milling_5axis", axisCount: "5", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["impeller", "blisk"], description: "5-axis blade + hub + shroud unified cycle (blisk / impeller)." },
  turn_rough: { id: "turn_rough", family: "turning", axisCount: "2", defaultStock: "bar", strategy: "roughing", featureClasses: ["external_profile", "internal_profile"], description: "Roughing turn — G71 / G72 stock-removal." },
  turn_finish: { id: "turn_finish", family: "turning", axisCount: "2", defaultStock: "prior_op", strategy: "finishing", featureClasses: ["external_profile", "internal_profile"], description: "Finishing turn — G70 single-pass to nominal." },
  turn_groove: { id: "turn_groove", family: "turning", axisCount: "2", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["groove", "od_groove", "id_groove"], description: "Groove turning — plunge / shift cycles." },
  turn_part: { id: "turn_part", family: "turning", axisCount: "2", defaultStock: "bar", strategy: "specialty", featureClasses: ["part_off"], description: "Parting — part-off cycle, blade plunge to spindle center." },
  turn_thread: { id: "turn_thread", family: "turning", axisCount: "2", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["external_thread", "internal_thread"], description: "Thread turn — multi-pass G76 single-point thread cycle." },
  turn_bore: { id: "turn_bore", family: "turning", axisCount: "2", defaultStock: "prior_op", strategy: "mixed", featureClasses: ["internal_profile"], description: "Boring — internal turn with boring bar." },
  turn_face: { id: "turn_face", family: "turning", axisCount: "2", defaultStock: "bar", strategy: "specialty", featureClasses: ["face"], description: "Facing — clear the end of the bar to nominal Z." },
  turn_drill: { id: "turn_drill", family: "turning", axisCount: "2", defaultStock: "bar", strategy: "specialty", featureClasses: ["axial_hole"], description: "Drilling on lathe — axial drilling from turret / tailstock." },
  live_tool_mill: { id: "live_tool_mill", family: "mill_turn", axisCount: "4", defaultStock: "prior_op", strategy: "mixed", featureClasses: ["off_axis_feature"], description: "Live-tool milling on lathe — Y / C-axis features." },
  live_tool_drill: { id: "live_tool_drill", family: "mill_turn", axisCount: "4", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["radial_hole", "tangential_hole"], description: "Live-tool drilling on lathe — radial / tangential holes." },
  probe_wcs: { id: "probe_wcs", family: "probing", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["datum"], description: "Probe WCS / G54 — establish part origin from datum features." },
  probe_part_inspect: { id: "probe_part_inspect", family: "probing", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["measured_feature"], description: "Part inspect — probe nominal features for QC." },
  probe_tool_measure: { id: "probe_tool_measure", family: "probing", axisCount: "3", defaultStock: "none", strategy: "specialty", featureClasses: ["tool_offset"], description: "Tool-setter probe — measure tool length / dia / breakage." },
  deburr: { id: "deburr", family: "finishing", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["edge", "burr"], description: "Deburr — chamfer / brush / bullnose edge break." },
  edge_break: { id: "edge_break", family: "finishing", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["edge"], description: "Edge break — controlled radius or chamfer on all sharp edges." },
  wedm_2axis: { id: "wedm_2axis", family: "edm", axisCount: "2", defaultStock: "billet", strategy: "specialty", featureClasses: ["thru_profile"], description: "2-axis wire EDM — vertical wire, straight thru-cut." },
  wedm_4axis_taper: { id: "wedm_4axis_taper", family: "edm", axisCount: "4", defaultStock: "billet", strategy: "specialty", featureClasses: ["tapered_thru"], description: "4-axis wire EDM with U/V taper." },
  sinker_edm: { id: "sinker_edm", family: "edm", axisCount: "3", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["blind_cavity"], description: "Sinker EDM — electrode-defined blind cavity (ribs, slots, blind hex)." },
  laser_cut: { id: "laser_cut", family: "laser", axisCount: "2", defaultStock: "sheet", strategy: "specialty", featureClasses: ["thru_profile"], description: "Laser cutting — sheet thru-cut with kerf compensation." },
  laser_engrave: { id: "laser_engrave", family: "laser", axisCount: "2", defaultStock: "prior_op", strategy: "specialty", featureClasses: ["text", "marking"], description: "Laser engrave / mark — non-cutting surface ablation." },
  waterjet_cut: { id: "waterjet_cut", family: "waterjet", axisCount: "2", defaultStock: "sheet", strategy: "specialty", featureClasses: ["thru_profile"], description: "Abrasive waterjet thru-cut — kerf comp + taper comp." },
  additive_deposition: { id: "additive_deposition", family: "additive", axisCount: "5", defaultStock: "none", strategy: "specialty", featureClasses: ["added_geometry"], description: "Additive / DED deposition path — wire-arc, laser-powder, etc." },
};

// ── Per-software native-name mappings ───────────────────────────────────────
// Spec source: docs/software vendor terminology. Only documented operations.

const PER_SOFTWARE: Record<CamSystem, Partial<Record<CamOperation, string>>> = {
  fusion360: {
    face: "Face", contour_2d: "2D Contour", pocket_2d: "2D Pocket", slot_2d: "Slot",
    engrave_2d: "Engrave", trace_2d: "Trace", chamfer_2d: "2D Chamfer",
    adaptive_clearing_2d: "2D Adaptive Clearing", adaptive_clearing_3d: "Adaptive Clearing",
    rest_machining_2d: "2D Pocket (Rest)", rest_machining_3d: "Rest Machining",
    trochoidal_2d: "2D Adaptive Clearing (trochoidal)",
    drill: "Drill", drill_peck: "Drill (peck)", spot_drill: "Drill (spot)",
    bore: "Bore", ream: "Drill (ream)", counterbore: "Drill (counterbore)", countersink: "Drill (countersink)",
    tap_rigid: "Drill (tap)", thread_mill: "Thread Mill",
    parallel_3d: "Parallel", scallop_3d: "Scallop", waterline_3d: "Contour",
    morph_3d: "Morphed Spiral", spiral_3d: "Spiral", radial_3d: "Radial",
    pencil_3d: "Pencil", horizontal_3d: "Horizontal", steep_shallow_3d: "Steep and Shallow",
    project_3d: "Project", between_curves_3d: "Between 2 Curves",
    swarf_5axis: "Swarf", tilt_3plus2: "3+2", tilt_5axis_simultaneous: "Multi-Axis Contour",
    flow_5axis: "Flow", multi_axis_contour: "Multi-Axis Contour",
    turn_rough: "Turning Roughing", turn_finish: "Turning Profile",
    turn_groove: "Turning Groove", turn_part: "Turning Part",
    turn_thread: "Turning Thread", turn_face: "Turning Face",
    probe_wcs: "Probe WCS", probe_part_inspect: "Probe Geometry", probe_tool_measure: "Probe Tool",
  },
  mastercam: {
    face: "Face", contour_2d: "Contour", pocket_2d: "2D Pocket", slot_2d: "Slot Mill",
    engrave_2d: "Engraving", chamfer_2d: "Contour (chamfer)",
    adaptive_clearing_2d: "Dynamic Mill", adaptive_clearing_3d: "OptiRough",
    trochoidal_2d: "Dynamic Mill",
    drill: "Drill", drill_peck: "Drill Cycle 8 (peck)", spot_drill: "Drill Cycle 1",
    counterbore: "Counterbore", tap_rigid: "Rigid Tap", thread_mill: "Thread Mill",
    parallel_3d: "Surface Finish Parallel", scallop_3d: "Surface Finish Scallop",
    waterline_3d: "Surface Finish Contour", pencil_3d: "Pencil Trace",
    swarf_5axis: "5-Axis Swarf", tilt_3plus2: "3+2 Plane",
    tilt_5axis_simultaneous: "Multiaxis Curve",
    turn_rough: "Rough", turn_finish: "Finish", turn_groove: "Groove",
    turn_part: "Cutoff", turn_thread: "Thread", turn_face: "Face",
  },
  hypermill: {
    face: "Face Milling", contour_2d: "2D Contour", pocket_2d: "2D Pocket",
    adaptive_clearing_3d: "Z-Level Roughing", trochoidal_2d: "Maxx Trochoidal",
    drill: "Drilling", drill_peck: "Deep Drilling", tap_rigid: "Tapping",
    thread_mill: "Thread Milling",
    parallel_3d: "ISO Machining", scallop_3d: "Equidistant Finishing",
    waterline_3d: "Z-Level Finishing", pencil_3d: "Pencil Tracing",
    swarf_5axis: "5-Axis Tangent Plane", tilt_3plus2: "3+2 Indexing",
    tilt_5axis_simultaneous: "5-Axis Tangent Curve",
    impeller_blade_5axis: "5-Axis Impeller", blade_hub_shroud_5axis: "Impeller Hub-Shroud",
  },
  solidcam: {
    face: "Face Milling", contour_2d: "Profile", pocket_2d: "Pocket",
    adaptive_clearing_2d: "iMachining 2D", adaptive_clearing_3d: "iMachining 3D",
    drill: "Drill", thread_mill: "Thread Milling",
    parallel_3d: "HSS Parallel", scallop_3d: "HSS Constant Z",
    waterline_3d: "3D Z-Constant", pencil_3d: "HSS Pencil",
    swarf_5axis: "5-Axis Swarf", tilt_3plus2: "5-Axis Indexing",
    turn_rough: "T-Profile Rough", turn_finish: "T-Profile Finish",
  },
  inventor_hsm: {
    face: "Face", contour_2d: "2D Contour", pocket_2d: "2D Pocket",
    adaptive_clearing_2d: "2D Adaptive Clearing", adaptive_clearing_3d: "Adaptive Clearing",
    drill: "Drill", parallel_3d: "Parallel", scallop_3d: "Scallop",
    waterline_3d: "Contour", swarf_5axis: "Swarf",
  },
  nx_cam: {
    face: "Face Milling", contour_2d: "Planar Profile", pocket_2d: "Planar Mill",
    adaptive_clearing_3d: "Cavity Mill", drill: "Drilling",
    parallel_3d: "Streamline", waterline_3d: "Z-Level Profile",
    swarf_5axis: "Sequential Mill",
  },
  powermill: {
    face: "Face Milling", contour_2d: "2D Profile", pocket_2d: "2D Pocket",
    adaptive_clearing_3d: "Vortex", drill: "Drilling",
    parallel_3d: "Parallel Finishing", scallop_3d: "Constant Z Finishing",
    waterline_3d: "Z-Constant Finishing",
    swarf_5axis: "5-Axis Swarf", tilt_5axis_simultaneous: "5-Axis Multi-Pencil",
  },
  esprit: {
    face: "Profit Face", contour_2d: "Profile", pocket_2d: "Pocket",
    adaptive_clearing_2d: "ProfitMilling 2D", adaptive_clearing_3d: "ProfitMilling 3D",
    drill: "Drill", parallel_3d: "Parallel", waterline_3d: "Z-Level",
    turn_rough: "ProfitTurning Rough", turn_finish: "ProfitTurning Finish",
  },
  catia_machining: {
    face: "Facing", contour_2d: "Profile Contouring", pocket_2d: "Pocketing",
    adaptive_clearing_3d: "Roughing", drill: "Drilling",
    parallel_3d: "Sweeping", scallop_3d: "Iso-Scallop",
    swarf_5axis: "Multi-Axis Flank Contouring",
  },
  edgecam: { face: "Face", contour_2d: "Profile", pocket_2d: "Pocket", drill: "Hole" },
  gibbscam: { face: "Face", contour_2d: "Contour", pocket_2d: "Pocket", adaptive_clearing_3d: "VoluMill", drill: "Drill" },
  worknc: { face: "Face Milling", adaptive_clearing_3d: "Global Roughing", waterline_3d: "Z-Level Finishing" },
  topsolid: { face: "Face Milling", pocket_2d: "Pocketing", drill: "Drilling" },
  camworks: { face: "Face Mill", pocket_2d: "Pocket", contour_2d: "Contour Mill", drill: "Drill", adaptive_clearing_3d: "VoluMill" },
  tebis: { face: "Tebis Face", waterline_3d: "Z-Level Finish", scallop_3d: "Iso-Scallop" },
  bobcad: { face: "Face Mill", pocket_2d: "2 Axis Pocket", drill: "Drill" },
  cimatron: { face: "Face Milling", pocket_2d: "Pocket", drill: "Drilling" },
  sprutcam: { face: "Face Milling", contour_2d: "Contour 2D", pocket_2d: "Pocket 2D", drill: "Drill" },
  alphacam: { contour_2d: "Profile", pocket_2d: "Pocket", drill: "Drill", engrave_2d: "Engrave" },
  featurecam: { face: "Face", pocket_2d: "Pocket", drill: "Hole", contour_2d: "Side Mill" },
  vericut: { /* verification-only — no native ops */ },
  surfcam: { face: "Face Mill", waterline_3d: "Z-Level", parallel_3d: "Lace" },
  visi: { face: "Face Milling", pocket_2d: "Pocketing" },
  creo: { face: "Volume Milling Face", pocket_2d: "Volume Milling", drill: "Holemaking" },
  partmaker: { turn_rough: "Turning Rough", turn_finish: "Turning Finish", live_tool_drill: "Index Drill" },
};

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CAMOperationTaxonomyEngine — v1 canonical CAM-operation enumeration plus
 * per-software native-name mappings.
 */
export class CAMOperationTaxonomyEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOperationTaxonomyEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "v1 canonical CAM toolpath operation enumeration + 24-CAM-system native-name mappings.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "operations", description: "List all canonical CAM operation ids", actions: ["cam_op_taxonomy_operations"] },
      { name: "spec", description: "Get the spec for a single canonical operation", actions: ["cam_op_taxonomy_spec"] },
      { name: "by_family", description: "List operations grouped by family", actions: ["cam_op_taxonomy_by_family"] },
      { name: "per_software", description: "Get the native-name mapping for a (op, system) pair", actions: ["cam_op_taxonomy_per_software"] },
      { name: "coverage", description: "Coverage matrix — per-system support of each canonical op", actions: ["cam_op_taxonomy_coverage"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOperationTaxonomyEngine", note: "use typed methods" };
  }

  /** All canonical operation IDs (taxonomy v1 — frozen). */
  listOperations(): ReadonlyArray<CamOperation> {
    return CAM_OPERATIONS;
  }

  /** All supported CAM systems. */
  listSystems(): ReadonlyArray<CamSystem> {
    return CAM_SYSTEMS;
  }

  /** Get the spec for one canonical operation. */
  getSpec(op: CamOperation): CamOperationSpec {
    return OPERATION_SPECS[op];
  }

  /** Group canonical operations by their family. */
  byFamily(): Record<OperationFamily, ReadonlyArray<CamOperation>> {
    const out = {} as Record<OperationFamily, CamOperation[]>;
    for (const op of CAM_OPERATIONS) {
      const fam = OPERATION_SPECS[op].family;
      if (!(fam in out)) out[fam] = [];
      out[fam].push(op);
    }
    return out as Record<OperationFamily, ReadonlyArray<CamOperation>>;
  }

  /** Get the native-name mapping for a (op, system) pair. */
  getPerSoftware(op: CamOperation, system: CamSystem): PerSoftwareMapping {
    const native = PER_SOFTWARE[system]?.[op];
    if (native) {
      return { nativeName: native, supported: true };
    }
    return { nativeName: "", supported: false };
  }

  /**
   * Coverage matrix — for each canonical op, count systems that support it.
   * Used by the Phase-B dashboard to flag taxonomy entries with weak coverage.
   */
  coverage(): Array<{ op: CamOperation; supportedBy: number; systems: CamSystem[] }> {
    const out: Array<{ op: CamOperation; supportedBy: number; systems: CamSystem[] }> = [];
    for (const op of CAM_OPERATIONS) {
      const systems = CAM_SYSTEMS.filter((s) => PER_SOFTWARE[s]?.[op] !== undefined);
      out.push({ op, supportedBy: systems.length, systems: [...systems] });
    }
    return out;
  }

  /**
   * Cross-system coverage stats:
   *   - totalOps                # canonical ops
   *   - totalSystems            # CAM systems on the taxonomy
   *   - totalMappings           # filled cells in the matrix
   *   - maxPossibleMappings     # totalOps * totalSystems
   *   - coveragePct             # totalMappings / maxPossibleMappings * 100
   *   - uncoveredOps            # ops with 0 system support (taxonomy gaps)
   */
  stats(): {
    totalOps: number;
    totalSystems: number;
    totalMappings: number;
    maxPossibleMappings: number;
    coveragePct: number;
    uncoveredOps: CamOperation[];
  } {
    let filled = 0;
    const uncoveredOps: CamOperation[] = [];
    for (const op of CAM_OPERATIONS) {
      let supports = 0;
      for (const sys of CAM_SYSTEMS) {
        if (PER_SOFTWARE[sys]?.[op] !== undefined) supports++;
      }
      filled += supports;
      if (supports === 0) uncoveredOps.push(op);
    }
    const totalOps = CAM_OPERATIONS.length;
    const totalSystems = CAM_SYSTEMS.length;
    const maxPossibleMappings = totalOps * totalSystems;
    return {
      totalOps,
      totalSystems,
      totalMappings: filled,
      maxPossibleMappings,
      coveragePct: (filled / maxPossibleMappings) * 100,
      uncoveredOps,
    };
  }
}

export const camOperationTaxonomyEngine = new CAMOperationTaxonomyEngine();
