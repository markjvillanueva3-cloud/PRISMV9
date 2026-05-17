/**
 * HyperMillStrategyKnowledgeEngine — Comprehensive hyperMILL Strategy Knowledge Base
 *
 * Encodes ALL hyperMILL strategies with detailed best practices, common mistakes,
 * and JM Die-specific recommendations. Powers PRISM's CAM intelligence layer.
 *
 * Strategy Categories:
 *   - 2D Milling: Pocket, Contour, Face, Slot, Chamfer, Thread, Rest, Plunge
 *   - 3D Milling: Z-Level, Equidistant, Optimised Roughing, Pencil, Rest, Profile
 *   - 5-Axis: Swarf, Point, Tangent, Contour, Impeller, Geodesic, Tube
 *   - MAXX: Barrel cutter roughing/finishing
 *   - Drilling: Standard, Deep Hole, Boring, Reaming, Tapping
 *   - Turning: Roughing, Finishing, Groove, Thread, Parting
 *   - Mill-Turn: Live tool, C-axis, B-axis operations
 *   - Advanced: HPC/Trochoidal, Electrode, Deburring, Probing
 *
 * Knowledge Sources:
 *   - hyperMILL Manual Parts 1-5 (6000+ pages)
 *   - AUTOMATION Center Manual
 *   - SQL Tool Database Manual
 *   - VIRTUAL Machining Center Manual
 *   - JM Die tribal knowledge (3,700+ tips)
 *
 * @module engines/HyperMillStrategyKnowledgeEngine
 * @milestone HYPERMILL-STRATEGY-KB-MS1
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES — Strategy Knowledge Base
// ============================================================================

/** Geometry type for strategy matching */
export type GeometryType =
  // 2D features
  | "pocket_2d" | "pocket_open" | "contour_2d" | "face" | "slot" | "t_slot"
  | "chamfer" | "thread_hole" | "thread_external"
  // 3D features
  | "freeform_3d" | "steep_wall" | "flat_area" | "groove" | "rib" | "corner"
  | "deep_cavity" | "undercut" | "ruled_surface"
  // Holes
  | "hole_through" | "hole_blind" | "hole_threaded" | "counterbore" | "countersink"
  // Impeller/Turbine
  | "impeller_blade" | "blisk" | "turbine_blade"
  // Turning
  | "od_profile" | "id_profile" | "od_groove" | "id_groove" | "face_groove"
  | "od_thread" | "id_thread" | "parting" | "bore"
  // Mill-turn
  | "cross_hole" | "cross_slot" | "off_center" | "polygon"
  // Electrode
  | "electrode_graphite" | "electrode_copper";

/** Strategy category */
export type StrategyCategory =
  | "2d" | "3d" | "5axis" | "5axis_indexed" | "maxx"
  | "drilling" | "turning" | "mill_turn" | "hpc" | "electrode" | "deburring" | "probing";

/** Operation goal */
export type OperationGoal = "roughing" | "semi_finishing" | "finishing" | "rest_machining";

/** Machine kinematics requirement */
export type MachineKinematics =
  | "3axis" | "4axis" | "5axis_indexed" | "5axis_simultaneous" | "mill_turn";

/** Strategy parameter definition */
export interface StrategyParameter {
  name: string;
  description: string;
  typical_value: string;
  unit: string;
  physics_basis: string;
  jm_die_recommendation?: string;
}

/** Comprehensive hyperMILL strategy definition */
export interface HyperMillStrategy {
  /** Unique strategy identifier */
  id: string;
  /** hyperMILL cycle name (exact from manual) */
  name: string;
  /** Strategy category */
  category: StrategyCategory;
  /** Geometry types this strategy is suitable for */
  suitable_for: GeometryType[];
  /** Operation goals this strategy serves */
  goals: OperationGoal[];
  /** Required machine kinematics */
  required_kinematics: MachineKinematics[];
  /** ISO material groups suitable for */
  suitable_materials: ISOGroup[];
  /** Key parameters */
  parameters: StrategyParameter[];
  /** Best practices from manual and tribal knowledge */
  best_practices: string[];
  /** Common mistakes to avoid */
  common_mistakes: string[];
  /** JM Die specific recommendations */
  jm_die_recommendation: string;
  /** Manual reference section */
  manual_ref: string;
  /** Manual page range */
  manual_pages: string;
  /** Advantages list */
  advantages: string[];
  /** Limitations and watch-outs */
  limitations: string[];
  /** Typical ap factor (fraction of tool diameter) */
  ap_factor: number | null;
  /** Typical ae factor (fraction of tool diameter) */
  ae_factor: number | null;
  /** Priority ranking (higher = prefer first) */
  priority: number;
  /** JM Die relevance score (0-100) */
  jm_die_relevance: number;
}

/** Strategy recommendation result */
export interface StrategyRecommendation {
  strategy: HyperMillStrategy;
  confidence: number;
  reasoning: string;
  alternatives: HyperMillStrategy[];
  warnings: string[];
  parameter_suggestions: Record<string, string>;
}

/** CAM setup analysis input */
export interface CAMSetup {
  geometry_type: GeometryType;
  material_group: ISOGroup;
  tool_diameter_mm: number;
  tool_type: "endmill" | "ball" | "bull" | "drill" | "insert" | "barrel";
  machine_kinematics: MachineKinematics;
  operation_goal: OperationGoal;
  current_strategy?: string;
  ap_mm?: number;
  ae_mm?: number;
  vc_m_min?: number;
  fz_mm?: number;
  coolant?: "flood" | "mist" | "air" | "through_tool" | "none";
  has_previous_roughing?: boolean;
  wall_angle_deg?: number;
  depth_mm?: number;
  tolerance_mm?: number;
}

/** CAM setup analysis result */
export interface SetupAnalysis {
  valid: boolean;
  safety_score: number;
  issues: Array<{ severity: "error" | "warning" | "info"; message: string; fix: string }>;
  strategy_match: boolean;
  recommended_strategy: HyperMillStrategy | null;
  parameter_analysis: Record<string, { current: string; recommended: string; status: "ok" | "low" | "high" }>;
}

/** Optimization suggestion */
export interface Optimization {
  category: "cycle_time" | "tool_life" | "surface_finish" | "safety" | "cost";
  description: string;
  expected_improvement: string;
  implementation: string;
  risk_level: "low" | "medium" | "high";
}

// ============================================================================
// STRATEGY KNOWLEDGE BASE — 60+ Strategies
// ============================================================================

const STRATEGIES: HyperMillStrategy[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 2D MILLING STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-2d-pocket",
    name: "Pocket Milling",
    category: "2d",
    suitable_for: ["pocket_2d", "pocket_open"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "stepover", description: "Radial step as % of tool diameter", typical_value: "50-70%", unit: "%", physics_basis: "Chip load distribution", jm_die_recommendation: "60% for D2/H13 tool steel" },
      { name: "stepdown", description: "Axial depth per pass", typical_value: "1.0×D for roughing", unit: "mm", physics_basis: "Tool deflection limit", jm_die_recommendation: "0.5×D for hardened inserts" },
      { name: "entry_type", description: "Plunge entry method", typical_value: "Helical or Ramp", unit: "-", physics_basis: "Axial force reduction", jm_die_recommendation: "Helical 2°-3° for deep pockets in D2" },
      { name: "corner_radius", description: "Internal corner treatment", typical_value: "Loop or Arc", unit: "-", physics_basis: "Engagement angle control", jm_die_recommendation: "Arc entry with 15% oversized radius" },
    ],
    best_practices: [
      "Use helical entry for depths > 2×D to reduce axial shock",
      "Enable rest material calculation for multi-tool sequences",
      "Apply climb milling direction for better surface finish",
      "Set overlap to 10-15% to prevent witness marks at pass boundaries",
      "Use stock model for accurate air-cut elimination",
      "For islands, ensure adequate clearance (min 1.5×D between island and wall)",
      "Enable automatic island recognition for complex pocket geometries",
    ],
    common_mistakes: [
      "Plunging directly into material — causes tool breakage in hard materials",
      "Stepover > 70% — leads to excessive tool deflection and chatter",
      "Ignoring corner slowdown — full engagement at corners causes overload",
      "Not accounting for stock allowance — leaves excess material for finishing",
      "Using same parameters for roughing and finishing passes",
      "Forgetting to enable collision checking against islands",
    ],
    jm_die_recommendation: "For JM Die's D2/H13 die work, use 50% stepover with AlCrN-coated carbide. Helical entry at 2° helix angle. Rest machining with 6mm ball end mill after 12mm roughing.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Pocket Milling",
    manual_pages: "pp. 45-110",
    advantages: ["Automatic island recognition", "Helical/ramp entry", "Rest material calculation", "Stock model support"],
    limitations: ["2D geometry only", "Deep pockets may need plunge milling first"],
    ap_factor: 1.0,
    ae_factor: 0.5,
    priority: 12,
    jm_die_relevance: 95,
  },
  {
    id: "hm-2d-contour",
    name: "Contour Milling",
    category: "2d",
    suitable_for: ["contour_2d", "pocket_2d", "pocket_open"],
    goals: ["finishing", "semi_finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "lead_in", description: "Approach type", typical_value: "Tangent arc", unit: "-", physics_basis: "Gradual engagement", jm_die_recommendation: "Arc lead-in at 45° for D2 finishing" },
      { name: "lead_out", description: "Retract type", typical_value: "Tangent arc", unit: "-", physics_basis: "Prevents witness mark", jm_die_recommendation: "Match lead-in geometry" },
      { name: "cutter_comp", description: "G41/G42 compensation", typical_value: "Enabled", unit: "-", physics_basis: "Dimensional accuracy", jm_die_recommendation: "Always enable for tolerance < 0.02mm" },
      { name: "stock_allowance", description: "Material left for finish", typical_value: "0.1-0.3mm", unit: "mm", physics_basis: "Spring pass margin", jm_die_recommendation: "0.15mm for D2, 0.1mm for aluminum" },
    ],
    best_practices: [
      "Always use tangent lead-in/out for surface finish quality",
      "Enable G41/G42 cutter compensation for dimensional accuracy",
      "Use multiple passes for stock > 0.5mm to prevent tool deflection",
      "Apply spring pass (zero-stock pass) for critical dimensions",
      "Set approach distance > 2×D for smooth acceleration",
      "Match lead-in and lead-out geometry to prevent mismatch marks",
    ],
    common_mistakes: [
      "Direct perpendicular entry — leaves witness mark on part",
      "Disabling cutter compensation — causes dimensional errors from tool wear",
      "Single pass with excessive stock — deflects tool and ruins geometry",
      "Insufficient lead-in distance — tool enters at wrong angle",
      "Forgetting to verify contour direction (CW/CCW) matches cutter comp",
    ],
    jm_die_recommendation: "For JM Die precision die contours, use arc lead-in at 45° with 5mm radius. Enable G42 compensation. Spring pass at 0.0mm stock for h6 tolerance fits.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Contour Milling",
    manual_pages: "pp. 111-145",
    advantages: ["Tangent lead-in/out", "G41/G42 compensation", "Variable stepover per pass"],
    limitations: ["2D profiles only", "Sharp corners need path smoothing"],
    ap_factor: 1.0,
    ae_factor: 0.3,
    priority: 10,
    jm_die_relevance: 90,
  },
  {
    id: "hm-2d-face",
    name: "Face Milling",
    category: "2d",
    suitable_for: ["face", "flat_area"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "stepover", description: "Radial step", typical_value: "70-80%", unit: "%", physics_basis: "Face mill engagement", jm_die_recommendation: "75% for insert face mills on D2" },
      { name: "direction", description: "Cutting direction", typical_value: "Zigzag", unit: "-", physics_basis: "Cycle time optimization", jm_die_recommendation: "Unidirectional for Ra < 1.6" },
      { name: "overlap", description: "Edge overlap", typical_value: "20%", unit: "%", physics_basis: "Complete coverage", jm_die_recommendation: "25% for uneven stock" },
    ],
    best_practices: [
      "Position face mill to engage 70-80% of diameter for optimal chip load",
      "Use high-feed inserts for roughing to maximize MRR",
      "Zigzag pattern for roughing, unidirectional for finishing",
      "Set boundary offset to prevent edge thinning at part perimeter",
      "Apply coolant flood for consistent chip evacuation",
    ],
    common_mistakes: [
      "100% engagement — causes insert chipping and chatter",
      "Insufficient overlap — leaves ridges between passes",
      "Face milling with end mill — wrong tool selection, slow and poor finish",
      "Ignoring insert grade for material — causes rapid wear or chipping",
    ],
    jm_die_recommendation: "For JM Die die blocks, use 80mm face mill with 6 inserts. 75% stepover, zigzag for roughing. Switch to 50mm 2-flute high-feed for semi-finish.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Face Milling",
    manual_pages: "pp. 146-165",
    advantages: ["Fast stock removal", "High-feed insert compatible"],
    limitations: ["Flat surfaces only", "Requires face mill cutter"],
    ap_factor: 0.5,
    ae_factor: 0.7,
    priority: 10,
    jm_die_relevance: 85,
  },
  {
    id: "hm-2d-slot",
    name: "Slot Milling",
    category: "2d",
    suitable_for: ["slot", "t_slot"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "width_ratio", description: "Slot width vs tool diameter", typical_value: "1.0-1.5×D", unit: "-", physics_basis: "Chip evacuation", jm_die_recommendation: "Use 80% tool diameter for through-slots" },
      { name: "peck_depth", description: "Axial step for deep slots", typical_value: "0.5-1.0×D", unit: "mm", physics_basis: "Re-cutting prevention", jm_die_recommendation: "0.5×D for H13 slots" },
    ],
    best_practices: [
      "Use slot mill or end mill at 80-100% width engagement",
      "Enable pecking for deep slots (depth > 2×D)",
      "Apply through-tool coolant for chip evacuation in blind slots",
      "Ramp entry preferred over plunge for slot start",
      "For T-slots, rough with slot mill then finish with T-slot cutter",
    ],
    common_mistakes: [
      "Full-width slotting without reduced feed — causes tool breakage",
      "No pecking in deep slots — chips re-cut and damage surface",
      "Using standard end mill for full-slot cutting — use slot drill instead",
      "Ignoring slot width tolerance — slot mills cut oversized",
    ],
    jm_die_recommendation: "For JM Die keyways, use carbide slot drill at 100% width. Peck at 0.5×D. Through-tool coolant essential for blind keyways in D2.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Slot Milling",
    manual_pages: "pp. 166-180",
    advantages: ["Full-width cutting capability", "Peck cycle support"],
    limitations: ["High radial force in full-slot", "Chip evacuation critical"],
    ap_factor: 0.5,
    ae_factor: 1.0,
    priority: 8,
    jm_die_relevance: 80,
  },
  {
    id: "hm-2d-chamfer",
    name: "Chamfer Milling",
    category: "2d",
    suitable_for: ["chamfer"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed", "5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "chamfer_angle", description: "Edge break angle", typical_value: "45°", unit: "deg", physics_basis: "Geometry requirement", jm_die_recommendation: "45° standard, 30° for delicate edges" },
      { name: "chamfer_width", description: "Break dimension", typical_value: "0.3-1.0mm", unit: "mm", physics_basis: "Edge protection", jm_die_recommendation: "0.5mm for die edges" },
    ],
    best_practices: [
      "Use dedicated chamfer tool for consistent angle",
      "Apply deburr mode for sharp edge detection from model",
      "Lollipop tool for back-chamfer (inaccessible from above)",
      "Constant engagement along edge for uniform chamfer",
      "Match chamfer feed to prevent vibration on thin edges",
    ],
    common_mistakes: [
      "Using ball end mill at angle — inconsistent chamfer width",
      "Too aggressive feed on thin edges — causes chatter",
      "Forgetting back-side chamfers — requires lollipop or 5-axis",
      "Not accounting for edge geometry changes — chamfer varies at corners",
    ],
    jm_die_recommendation: "For JM Die parts, use 90° chamfer mill for 45° edges. Lollipop tool for back-chamfer on through-features. 0.5mm break standard.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Chamfer Milling",
    manual_pages: "pp. 181-195",
    advantages: ["Auto edge detection", "Lollipop tool support", "Deburr mode"],
    limitations: ["Clean edge geometry required in model"],
    ap_factor: null,
    ae_factor: null,
    priority: 9,
    jm_die_relevance: 75,
  },
  {
    id: "hm-2d-thread-mill",
    name: "Thread Milling",
    category: "2d",
    suitable_for: ["thread_hole", "thread_external"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "thread_pitch", description: "Thread pitch", typical_value: "Per standard", unit: "mm", physics_basis: "Thread geometry", jm_die_recommendation: "Use single-point for large pitch in D2" },
      { name: "thread_starts", description: "Number of starts", typical_value: "1", unit: "-", physics_basis: "Multi-start threads", jm_die_recommendation: "Single start for standard fasteners" },
      { name: "radial_passes", description: "Finish passes", typical_value: "1-2", unit: "-", physics_basis: "Thread accuracy", jm_die_recommendation: "2 passes for class 2B fit" },
    ],
    best_practices: [
      "Use climb milling for better thread finish",
      "Helical entry at pitch height above thread start",
      "Single-point mill for large threads (> M20) or odd pitches",
      "Multi-tooth mill for high-volume standard threads",
      "Enable G41/G42 for thread size compensation",
      "Spring pass for precision thread fits (2B/6H)",
    ],
    common_mistakes: [
      "Wrong helix direction — produces opposite-hand thread",
      "Incorrect pitch programming — thread will not mate",
      "Entry at wrong Z height — damages first thread crest",
      "Using damaged thread mill — produces wavy thread flanks",
      "Conventional milling direction — poor thread finish",
    ],
    jm_die_recommendation: "For JM Die threaded die components, use single-point carbide thread mill for M16+ in D2. Two radial passes for class 2B. Climb milling always.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Thread Milling",
    manual_pages: "pp. 226-250",
    advantages: ["One tool for multiple sizes", "Interrupted chip", "Climb entry"],
    limitations: ["Slower than tapping for small threads", "Requires rigid machine"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 85,
  },
  {
    id: "hm-2d-rest",
    name: "Rest Machining 2D",
    category: "2d",
    suitable_for: ["pocket_2d", "pocket_open", "contour_2d", "corner"],
    goals: ["rest_machining"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "reference_tool", description: "Previous tool diameter", typical_value: "From job list", unit: "mm", physics_basis: "Rest area calculation", jm_die_recommendation: "Auto-detect from stock model" },
      { name: "min_rest_area", description: "Minimum area to machine", typical_value: "1mm²", unit: "mm²", physics_basis: "Air cut elimination", jm_die_recommendation: "0.5mm² for die corners" },
    ],
    best_practices: [
      "Always reference previous roughing tool diameter accurately",
      "Use stock model for precise rest area detection",
      "Apply smaller stepover (30-40%) for rest passes",
      "Enable collision checking — rest areas often near walls",
      "Consider ball end mill for corner rest in 3D geometry",
    ],
    common_mistakes: [
      "Wrong reference tool diameter — misses rest material or air cuts",
      "Not using stock model — inaccurate rest calculation",
      "Same parameters as roughing — causes tool overload in corners",
      "Skipping rest machining — finish tool encounters excessive stock",
    ],
    jm_die_recommendation: "For JM Die pockets, use 6mm ball end mill rest after 12mm roughing. Stock model mandatory. 40% stepover in corners.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Rest Machining 2D",
    manual_pages: "pp. 196-210",
    advantages: ["Eliminates air cuts", "Automatic rest detection"],
    limitations: ["Requires prior roughing job", "Stock model recommended"],
    ap_factor: 0.5,
    ae_factor: 0.3,
    priority: 10,
    jm_die_relevance: 90,
  },
  {
    id: "hm-2d-plunge",
    name: "Plunge Milling",
    category: "2d",
    suitable_for: ["pocket_2d", "deep_cavity"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "plunge_feed", description: "Axial feed rate", typical_value: "50-100% of side feed", unit: "mm/min", physics_basis: "Axial chip load", jm_die_recommendation: "60% for long-reach tools" },
      { name: "lateral_step", description: "Step between plunges", typical_value: "50-70% of D", unit: "%", physics_basis: "Material removal coverage", jm_die_recommendation: "60% for slender tools" },
    ],
    best_practices: [
      "Use for deep cavities (depth > 4×D) where radial forces cause deflection",
      "Apply stock model for efficient plunge positioning",
      "Enable chip break cycle for deep plunges (> 3×D per plunge)",
      "Select tools with strong Z-direction geometry (center cutting)",
      "Reduce lateral step for slender tools to prevent deflection",
    ],
    common_mistakes: [
      "Using non-center-cutting end mill — tool crashes on plunge",
      "Lateral step > tool diameter — leaves material between plunges",
      "No chip break in deep plunges — chip packing breaks tool",
      "Using plunge milling where trochoidal would be faster",
    ],
    jm_die_recommendation: "For JM Die deep die cavities in D2, use 16mm center-cutting carbide. Plunge at 60% feed. 60% lateral step. Essential for depth > 60mm.",
    manual_ref: "hyperMILL Manual Part 3 — 2D Milling, §Plunge Milling",
    manual_pages: "pp. 211-225",
    advantages: ["Minimal radial force", "Ideal for slender tools", "Deep cavity capable"],
    limitations: ["Slower MRR than trochoidal", "Requires strong Z-axis machine"],
    ap_factor: null,
    ae_factor: 0.5,
    priority: 8,
    jm_die_relevance: 85,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D MILLING STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-3d-opt-rough",
    name: "Optimised Roughing",
    category: "3d",
    suitable_for: ["freeform_3d", "pocket_2d", "deep_cavity"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "stepdown", description: "Z-level step", typical_value: "1.0×D", unit: "mm", physics_basis: "Full flute engagement", jm_die_recommendation: "0.8×D for H13 roughing" },
      { name: "stepover", description: "Radial step", typical_value: "40%", unit: "%", physics_basis: "Constant chip load", jm_die_recommendation: "35% for hardened material" },
      { name: "entry_type", description: "Material entry", typical_value: "Helical/Ramp", unit: "-", physics_basis: "Gradual engagement", jm_die_recommendation: "Helical at 2° for D2" },
    ],
    best_practices: [
      "Enable constant chip load calculation for HSC optimization",
      "Use stock model for accurate toolpath — eliminates air cuts",
      "Apply helical or ramp entry — never direct plunge",
      "Set corner slowdown factor (0.5-0.7) for engagement peaks",
      "Enable rest roughing for multi-tool sequences",
      "Use full flute depth (ap = 1.0×D) with reduced ae for efficiency",
    ],
    common_mistakes: [
      "Direct plunge entry — tool breakage in hard materials",
      "Ignoring corner engagement — overload causes chatter/breakage",
      "Not using stock model — excessive air cutting",
      "Same parameters for steep and shallow areas",
      "Forgetting to update stock model after roughing",
    ],
    jm_die_recommendation: "For JM Die mold cavities in H13, use 12mm carbide, ap=10mm, ae=4mm. Helical entry. Stock model mandatory. Corner slowdown 0.6. Rest rough with 8mm.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Optimised Roughing",
    manual_pages: "pp. 45-90",
    advantages: ["Constant chip load", "HSC optimized", "Stock model support"],
    limitations: ["Higher computation time than Z-level"],
    ap_factor: 1.0,
    ae_factor: 0.4,
    priority: 14,
    jm_die_relevance: 95,
  },
  {
    id: "hm-3d-zlevel",
    name: "Z Level Finishing",
    category: "3d",
    suitable_for: ["freeform_3d", "steep_wall", "deep_cavity"],
    goals: ["finishing", "semi_finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "stepdown", description: "Z step between levels", typical_value: "0.1-0.3mm", unit: "mm", physics_basis: "Scallop height control", jm_die_recommendation: "0.15mm for Ra 1.6 on D2" },
      { name: "slope_limit", description: "Steep angle threshold", typical_value: "> 45°", unit: "deg", physics_basis: "Strategy suitability", jm_die_recommendation: "Use > 50° for Z-level" },
    ],
    best_practices: [
      "Apply to steep walls (> 45°) where Z-level provides best scallop control",
      "Enable slope-dependent machining to transition to equidistant on flats",
      "Use ball end mill for curved surfaces",
      "Set proper collision avoidance for deep cavities",
      "Match stepdown to required Ra — smaller step = better finish",
    ],
    common_mistakes: [
      "Using Z-level on flat areas — produces poor finish (stair-stepping)",
      "Stepdown too large for finish Ra requirement",
      "Not enabling slope transition — miss-matches at steep/flat boundaries",
      "Ignoring holder collision in deep cavities",
    ],
    jm_die_recommendation: "For JM Die steep cavity walls in H13, use 8mm ball end mill, stepdown 0.15mm for Ra 1.6. Enable slope limit 50° to transition to equidistant.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Z Level Finishing",
    manual_pages: "pp. 111-150",
    advantages: ["Best scallop on steep walls", "Slope-adaptive", "Deep cavity capable"],
    limitations: ["Poor on flat areas", "Combine with Plane Machining"],
    ap_factor: 0.1,
    ae_factor: null,
    priority: 12,
    jm_die_relevance: 90,
  },
  {
    id: "hm-3d-equidistant",
    name: "Equidistant Finishing",
    category: "3d",
    suitable_for: ["freeform_3d", "flat_area"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "stepover", description: "Constant scallop step", typical_value: "0.1-0.2mm", unit: "mm", physics_basis: "Uniform scallop height", jm_die_recommendation: "0.12mm for Ra 0.8 on mold surfaces" },
    ],
    best_practices: [
      "Apply to shallow/near-flat surfaces (< 45° slope)",
      "Produces truly constant scallop height regardless of slope",
      "HSM optimized with smooth path curvature",
      "Excellent for complex mold surfaces requiring uniform finish",
      "Combine with Z-Level for complete surface coverage",
    ],
    common_mistakes: [
      "Using on steep walls — produces very slow feeds near vertical",
      "Stepover calculation error — actual scallop varies with curvature",
      "Not combining with Z-Level — leaves steep areas with poor finish",
    ],
    jm_die_recommendation: "For JM Die mold surfaces in P20, use 6mm ball end mill, 0.12mm stepover for Ra 0.8. Combine with Z-Level at 45° slope boundary.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Equidistant Finishing",
    manual_pages: "pp. 151-185",
    advantages: ["Constant scallop height", "HSM optimized", "Uniform surface quality"],
    limitations: ["Longer computation", "Slow on steep areas"],
    ap_factor: null,
    ae_factor: 0.1,
    priority: 11,
    jm_die_relevance: 85,
  },
  {
    id: "hm-3d-profile",
    name: "Profile Finishing",
    category: "3d",
    suitable_for: ["freeform_3d", "steep_wall", "ruled_surface"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "guide_curve", description: "Path reference curve", typical_value: "User defined", unit: "-", physics_basis: "Path direction control", jm_die_recommendation: "Use parting line as guide for mold halves" },
      { name: "stepover", description: "Cross-feed step", typical_value: "0.15mm", unit: "mm", physics_basis: "Surface coverage", jm_die_recommendation: "0.1mm for critical mold surfaces" },
    ],
    best_practices: [
      "Define guide curves to control toolpath direction",
      "Enables slope-dependent machining transitions",
      "Full collision avoidance against machine model",
      "Excellent for complex multi-surface finishing",
      "Use for parting line and shut-off surfaces on molds",
    ],
    common_mistakes: [
      "Poor guide curve definition — produces erratic toolpaths",
      "Not verifying collision clearance in deep areas",
      "Missing boundary trimming — path extends beyond required area",
    ],
    jm_die_recommendation: "For JM Die mold parting lines, use guide curve along parting edge. 6mm ball, 0.1mm stepover. Critical for shut-off surface quality.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Profile Finishing",
    manual_pages: "pp. 186-220",
    advantages: ["Guide curve control", "Collision avoidance", "Multi-surface capable"],
    limitations: ["Requires clean guide curve geometry"],
    ap_factor: null,
    ae_factor: 0.15,
    priority: 10,
    jm_die_relevance: 80,
  },
  {
    id: "hm-3d-complete",
    name: "Complete Finishing",
    category: "3d",
    suitable_for: ["freeform_3d", "flat_area"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "flat_detection", description: "Auto flat area threshold", typical_value: "5°", unit: "deg", physics_basis: "Strategy selection", jm_die_recommendation: "3° for precision mold work" },
    ],
    best_practices: [
      "Single job handles both steep and flat regions automatically",
      "Detects flat areas and applies pocket-style machining",
      "Steep areas receive Z-Level finishing",
      "Reduces programming time for complex parts",
      "Verify flat threshold matches part requirements",
    ],
    common_mistakes: [
      "Flat detection threshold too high — misses near-flat surfaces",
      "Not reviewing combined toolpath — may produce suboptimal ordering",
    ],
    jm_die_recommendation: "For JM Die general mold finish, use 6mm ball. Auto flat detection at 3°. Good for initial finish pass before polishing.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Complete Finishing",
    manual_pages: "pp. 221-250",
    advantages: ["Single job for all slopes", "Auto flat detection", "Time-saving"],
    limitations: ["Less control than separate strategies"],
    ap_factor: 0.1,
    ae_factor: 0.15,
    priority: 11,
    jm_die_relevance: 85,
  },
  {
    id: "hm-3d-pencil",
    name: "Pencil Milling",
    category: "3d",
    suitable_for: ["freeform_3d", "groove", "corner"],
    goals: ["finishing", "rest_machining"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "detection_angle", description: "Groove detection angle", typical_value: "< 90°", unit: "deg", physics_basis: "Concave line finding", jm_die_recommendation: "< 85° for die groove detection" },
    ],
    best_practices: [
      "Automatically detects and finishes concave groove intersections",
      "Ball end mill follows groove tangentially",
      "Multiple passes for deeper grooves",
      "Excellent for mold parting lines and fillet blends",
      "Verify groove detection captures all required areas",
    ],
    common_mistakes: [
      "Tool radius larger than groove radius — tool cannot reach",
      "Insufficient detection sensitivity — misses shallow grooves",
      "Not running after Z-Level — leaves rest material in grooves",
    ],
    jm_die_recommendation: "For JM Die mold parting line grooves, use 3mm ball end mill. Run after Z-Level finishing. Essential for Class A mold surfaces.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Pencil Milling",
    manual_pages: "pp. 281-295",
    advantages: ["Auto groove detection", "Tangent ball contact", "Parting line finishing"],
    limitations: ["Ball end mill only", "Radius limited by groove geometry"],
    ap_factor: null,
    ae_factor: null,
    priority: 9,
    jm_die_relevance: 85,
  },
  {
    id: "hm-3d-rest",
    name: "Automatic Rest Machining",
    category: "3d",
    suitable_for: ["freeform_3d", "corner", "pocket_2d"],
    goals: ["rest_machining"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "reference_tool", description: "Previous tool diameter", typical_value: "Auto from stock", unit: "mm", physics_basis: "Rest calculation", jm_die_recommendation: "Use stock model always" },
    ],
    best_practices: [
      "Uses stock model to detect uncut areas precisely",
      "Only machines rest areas — no air cutting",
      "Run after each tool change in multi-tool sequence",
      "Z-Level and equidistant modes available",
      "Essential for corner cleanup before finish",
    ],
    common_mistakes: [
      "Not using stock model — rest areas calculated incorrectly",
      "Wrong reference tool size — misses material or air cuts",
      "Skipping rest machining — finish tool overloaded in corners",
    ],
    jm_die_recommendation: "For JM Die multi-tool mold machining, rest machine after each roughing tool. Stock model mandatory. 4mm ball after 8mm finish for corners.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Automatic Rest Machining",
    manual_pages: "pp. 251-280",
    advantages: ["No air cuts", "Auto detection", "Stock model precision"],
    limitations: ["Requires prior job", "Stock model essential"],
    ap_factor: 0.3,
    ae_factor: 0.2,
    priority: 11,
    jm_die_relevance: 90,
  },
  {
    id: "hm-3d-corner-rest",
    name: "Corner Rest Machining",
    category: "3d",
    suitable_for: ["corner", "pocket_2d", "freeform_3d"],
    goals: ["rest_machining"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "corner_radius", description: "Detect corners smaller than", typical_value: "Previous tool radius + 2mm", unit: "mm", physics_basis: "Rest area targeting", jm_die_recommendation: "Roughing tool radius + 1mm" },
    ],
    best_practices: [
      "Targets vertical corners and floor junctions specifically",
      "Generates optimized path along corner intersections",
      "Use after pocket roughing, before finish",
      "Reduce stepover for precision corner finish",
    ],
    common_mistakes: [
      "Tool larger than corner radius — cannot reach",
      "Running before roughing complete — material not exposed",
    ],
    jm_die_recommendation: "For JM Die pocket corners, use 4mm ball after 12mm roughing. Target corners < 8mm radius. Essential for die block pockets.",
    manual_ref: "hyperMILL Manual Part 4 — 3D Milling, §Corner Rest Machining",
    manual_pages: "pp. 296-310",
    advantages: ["Precise corner targeting", "Optimized path"],
    limitations: ["Corner geometry dependent"],
    ap_factor: 0.3,
    ae_factor: 0.15,
    priority: 12,
    jm_die_relevance: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5-AXIS STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-5ax-swarf",
    name: "5-Axis Swarf Milling",
    category: "5axis",
    suitable_for: ["ruled_surface", "steep_wall"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "tilt_limit", description: "Max tool tilt from vertical", typical_value: "30°", unit: "deg", physics_basis: "Machine limit", jm_die_recommendation: "25° for Roku-Roku 5-axis" },
      { name: "surface_type", description: "Surface requirement", typical_value: "Ruled/Developable", unit: "-", physics_basis: "Swarf contact geometry", jm_die_recommendation: "Verify ruled surface before selecting" },
    ],
    best_practices: [
      "Apply only to ruled/developable surfaces (draft walls, tapers)",
      "Tool flute engages full surface in single pass — 5-10× faster",
      "hyperMILL auto-tilts for holder collision avoidance",
      "Verify surface is truly ruled — gouge on doubly-curved",
      "Use for large draft walls and taper features",
    ],
    common_mistakes: [
      "Applying to non-ruled surface — causes gouging",
      "Exceeding machine tilt limits — axis alarm",
      "Not checking holder collision — tool body hits part",
      "Using on small features — setup overhead not justified",
    ],
    jm_die_recommendation: "For JM Die draft walls on large dies, verify ruled surface first. Use on Roku-Roku 5-axis only. Limit tilt to 25°. 5× faster than Z-Level.",
    manual_ref: "hyperMILL Manual Part 5 — 5-Axis, §Swarf Milling",
    manual_pages: "pp. 45-85",
    advantages: ["5-10× faster than Z-Level", "Full flute contact", "Single pass"],
    limitations: ["Ruled surfaces only", "Gouge risk on curves"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 65,
  },
  {
    id: "hm-5ax-point",
    name: "5-Axis Point Milling",
    category: "5axis",
    suitable_for: ["freeform_3d", "deep_cavity", "undercut"],
    goals: ["finishing"],
    required_kinematics: ["5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "lead_angle", description: "Tool lead/lag angle", typical_value: "3-15°", unit: "deg", physics_basis: "Chip thinning angle", jm_die_recommendation: "5° lead for H13 molds" },
      { name: "tilt_angle", description: "Tool side tilt", typical_value: "3-10°", unit: "deg", physics_basis: "Collision avoidance", jm_die_recommendation: "5° for deep cavity access" },
    ],
    best_practices: [
      "Most flexible 5-axis mode — reaches deep cavities and undercuts",
      "Continuous tilt for collision avoidance and chip thinning",
      "Apply lead angle for better chip formation at ball tip",
      "Verify RTCP (G43.4/TCPM) is enabled on controller",
      "Use for complex freeform surfaces where 3-axis cannot reach",
    ],
    common_mistakes: [
      "Zero lead/tilt — ball tip cuts at zero velocity (poor finish)",
      "Excessive tilt — causes axis reversals and vibration",
      "Not enabling RTCP — tool tip wanders from programmed path",
      "Using where indexed 5-axis would suffice — slower and more complex",
    ],
    jm_die_recommendation: "For JM Die deep mold cavities on Roku-Roku, use 5° lead, 5° tilt. Essential for undercuts. Verify RTCP active (G43.4).",
    manual_ref: "hyperMILL Manual Part 5 — 5-Axis, §Point Milling",
    manual_pages: "pp. 156-200",
    advantages: ["Maximum reach", "Collision avoidance", "Undercut capable"],
    limitations: ["Slower than swarf", "RTCP required"],
    ap_factor: null,
    ae_factor: 0.08,
    priority: 12,
    jm_die_relevance: 75,
  },
  {
    id: "hm-5ax-contour",
    name: "5-Axis Contour Milling",
    category: "5axis",
    suitable_for: ["undercut", "freeform_3d"],
    goals: ["finishing"],
    required_kinematics: ["5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "tilt_interpolation", description: "Tilt smoothing", typical_value: "Smooth", unit: "-", physics_basis: "Axis motion quality", jm_die_recommendation: "Enable smooth interpolation" },
    ],
    best_practices: [
      "Full 5-axis for contours unreachable from fixed orientations",
      "Tilt interpolation between surface normals for smooth motion",
      "Essential for turbine disc and impeller blade roots",
      "Verify machine kinematics support continuous rotation",
    ],
    common_mistakes: [
      "Sharp tilt transitions — causes axis jerk and vibration",
      "Not verifying kinematic reach — axis singularity crash",
    ],
    jm_die_recommendation: "For JM Die complex undercut features, essential when 3+2 cannot reach. Verify Roku-Roku kinematic envelope.",
    manual_ref: "hyperMILL Manual Part 5 — 5-Axis, §Contour Milling",
    manual_pages: "pp. 116-155",
    advantages: ["Undercut access", "Smooth tilt", "Complex geometry"],
    limitations: ["RTCP required", "Machine kinematics limited"],
    ap_factor: null,
    ae_factor: 0.1,
    priority: 10,
    jm_die_relevance: 70,
  },
  {
    id: "hm-5ax-indexed-pocket",
    name: "5-Axis Indexed Pocket Milling",
    category: "5axis_indexed",
    suitable_for: ["pocket_2d", "pocket_open", "hole_through", "hole_blind"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["5axis_indexed", "4axis"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "work_plane", description: "Tilted WCS angle", typical_value: "Per feature", unit: "deg", physics_basis: "Feature orientation", jm_die_recommendation: "Use feature normal for WCS" },
    ],
    best_practices: [
      "3+2 indexed machining — table tilts, then 2D/3D strategy runs",
      "One setup for multi-face parts",
      "Full 2D capability at each indexed orientation",
      "hyperMILL manages WCS rotation and G-code output",
      "Collision check against fixture at each orientation",
    ],
    common_mistakes: [
      "Not verifying fixture clearance at tilted positions",
      "Wrong WCS definition — feature machined at wrong angle",
      "Exceeding table tilt limits — axis alarm",
    ],
    jm_die_recommendation: "For JM Die multi-face die blocks, use 3+2 on Roku-Roku. Reduces setups from 6 to 1. Verify fixture clearance at each angle.",
    manual_ref: "hyperMILL Manual Part 5 — 5-Axis Indexed, §Indexed Strategies",
    manual_pages: "pp. 15-44",
    advantages: ["One setup for all faces", "Full 2D/3D capability", "Simpler than simultaneous"],
    limitations: ["Discrete orientations only", "Table tilt limits apply"],
    ap_factor: 1.0,
    ae_factor: 0.5,
    priority: 12,
    jm_die_relevance: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAXX MACHINING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-maxx-rough",
    name: "MAXX Roughing",
    category: "maxx",
    suitable_for: ["freeform_3d", "flat_area"],
    goals: ["roughing"],
    required_kinematics: ["5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "barrel_radius", description: "Barrel tool radius", typical_value: "Per tool", unit: "mm", physics_basis: "Contact width", jm_die_recommendation: "200mm barrel radius typical" },
    ],
    best_practices: [
      "Barrel cutter enables 3-5× wider stepover at same scallop",
      "Auto-tilt maintains barrel contact zone",
      "Collision avoidance against machine model essential",
      "60-80% cycle time reduction over ball end mill",
      "Verify barrel geometry matches programmed tool",
    ],
    common_mistakes: [
      "Wrong barrel radius in program — gouge or no contact",
      "Incorrect tilt — barrel does not contact surface properly",
      "Not verifying in simulation — crash risk from geometry error",
    ],
    jm_die_recommendation: "For JM Die large mold surfaces, MAXX provides 70% cycle reduction. Requires barrel cutter investment. Verify on Roku-Roku simulation first.",
    manual_ref: "hyperMILL Manual Part 5 — MAXX Machining, §MAXX Roughing",
    manual_pages: "pp. 290-320",
    advantages: ["3-5× wider stepover", "60-80% cycle reduction", "Superior tool life"],
    limitations: ["Special barrel tooling required", "Gouging risk if wrong"],
    ap_factor: null,
    ae_factor: null,
    priority: 13,
    jm_die_relevance: 75,
  },
  {
    id: "hm-maxx-finish",
    name: "MAXX Finishing",
    category: "maxx",
    suitable_for: ["freeform_3d", "flat_area"],
    goals: ["finishing"],
    required_kinematics: ["5axis_simultaneous"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "scallop_height", description: "Target scallop", typical_value: "0.01-0.05mm", unit: "mm", physics_basis: "Surface finish", jm_die_recommendation: "0.02mm for mold finish" },
    ],
    best_practices: [
      "Conical barrel for planar and near-planar surfaces",
      "5-10× wider stepover than ball end mill",
      "Auto-detects suitable flat regions",
      "Excellent for automotive dies and large mold surfaces",
      "Not for highly concave areas",
    ],
    common_mistakes: [
      "Using on concave surfaces — barrel cannot contact",
      "Wrong tool definition — produces wrong geometry",
    ],
    jm_die_recommendation: "For JM Die large flat die surfaces, MAXX finish at 0.02mm scallop. 5× faster than ball end. Not for small concave features.",
    manual_ref: "hyperMILL Manual Part 5 — MAXX Machining, §MAXX Finishing",
    manual_pages: "pp. 321-355",
    advantages: ["5-10× faster", "Auto flat detection", "Excellent surface"],
    limitations: ["Not for concave", "Conical barrel required"],
    ap_factor: null,
    ae_factor: null,
    priority: 12,
    jm_die_relevance: 70,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HPC / TROCHOIDAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-hpc-rough",
    name: "HPC Roughing",
    category: "hpc",
    suitable_for: ["pocket_2d", "pocket_open", "slot"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "engagement_angle", description: "Max radial engagement", typical_value: "40-60°", unit: "deg", physics_basis: "Constant chip load", jm_die_recommendation: "50° for D2 tool steel" },
      { name: "stepdown", description: "Axial depth", typical_value: "1.5-2.0×D", unit: "mm", physics_basis: "Full flute use", jm_die_recommendation: "1.5×D for H13" },
    ],
    best_practices: [
      "Trochoidal path maintains constant radial engagement",
      "3-4× higher feed than conventional at same tool diameter",
      "Full depth of cut (ap = 1.5-2×D) with low ae",
      "Excellent for hard materials and long-reach tools",
      "Machine must support high-speed circular interpolation",
    ],
    common_mistakes: [
      "Too high engagement angle — tool overload",
      "Feed not increased — loses trochoidal advantage",
      "Using on machine without smooth arc capability — jerky motion",
      "Not enabling HSM toolpath smoothing — corners cause deceleration",
    ],
    jm_die_recommendation: "For JM Die D2/H13 roughing, HPC at 50° engagement, 1.5×D depth, 4× feed. Essential for hard material productivity.",
    manual_ref: "hyperMILL Manual Part 3 — High Performance Cutting, §HPC Roughing",
    manual_pages: "pp. 260-295",
    advantages: ["3-4× higher feed", "Constant chip load", "Extended tool life"],
    limitations: ["HSM machine required", "Arc interpolation needed"],
    ap_factor: 1.5,
    ae_factor: 0.1,
    priority: 13,
    jm_die_relevance: 95,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DRILLING STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-drill-basic",
    name: "Drilling",
    category: "drilling",
    suitable_for: ["hole_through", "hole_blind", "counterbore", "countersink"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "peck_depth", description: "Peck increment", typical_value: "1-3×D", unit: "mm", physics_basis: "Chip evacuation", jm_die_recommendation: "1×D for D2 deep holes" },
      { name: "dwell", description: "Dwell at bottom", typical_value: "0-0.5s", unit: "s", physics_basis: "Hole sizing", jm_die_recommendation: "0.3s for blind holes" },
    ],
    best_practices: [
      "Enable pecking for depth > 3×D to evacuate chips",
      "Through-tool coolant for deep holes and hard materials",
      "Auto cycle selection based on L/D ratio",
      "Use pilot hole for large drill diameters (> 12mm)",
      "Dwell at bottom for accurate depth in blind holes",
    ],
    common_mistakes: [
      "No pecking in deep holes — chip packing breaks drill",
      "Wrong cycle type for blind vs through holes",
      "Excessive feed at breakthrough — drill grabs",
      "Not using pilot for large drills — wander",
    ],
    jm_die_recommendation: "For JM Die D2 die blocks, peck at 1×D. Through-tool coolant mandatory. Pilot drill for > 10mm. G83 peck cycle standard.",
    manual_ref: "hyperMILL Manual Part 1 — Drilling, §Drilling Cycles",
    manual_pages: "pp. 15-60",
    advantages: ["All standard cycles", "Auto cycle selection", "Peck support"],
    limitations: ["Deep holes (L/D > 10) need specialized strategy"],
    ap_factor: null,
    ae_factor: null,
    priority: 12,
    jm_die_relevance: 95,
  },
  {
    id: "hm-drill-deep",
    name: "Deep Hole Drilling",
    category: "drilling",
    suitable_for: ["hole_through", "hole_blind"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "peck_ratio", description: "Peck as % of diameter", typical_value: "50-100%", unit: "%", physics_basis: "Chip breaking", jm_die_recommendation: "50% for L/D > 15" },
    ],
    best_practices: [
      "Specialized for L/D > 15:1 deep holes",
      "Programmable peck distance based on L/D ratio",
      "High-pressure coolant flush cycle",
      "Gun drill or BTA tool support",
      "Chip accumulation monitoring",
    ],
    common_mistakes: [
      "Peck too deep — chip packing",
      "Insufficient coolant pressure — heat buildup",
      "Not using specialized deep drill geometry",
    ],
    jm_die_recommendation: "For JM Die ejector pin holes in D2, use gun drill with high-pressure coolant. Peck at 50% diameter. Critical for L/D > 15.",
    manual_ref: "hyperMILL Manual Part 1 — Drilling, §Deep Hole Drilling",
    manual_pages: "pp. 61-80",
    advantages: ["L/D > 15 capable", "Chip management", "Gun drill support"],
    limitations: ["High-pressure coolant required", "Specialized tooling"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 80,
  },
  {
    id: "hm-drill-bore",
    name: "Boring",
    category: "drilling",
    suitable_for: ["hole_through", "hole_blind", "bore"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "boring_type", description: "Boring cycle type", typical_value: "G85/G86/G76", unit: "-", physics_basis: "Retract method", jm_die_recommendation: "G76 for precision H6 bores" },
    ],
    best_practices: [
      "Use for precision ID tolerances (H6/H7)",
      "G76 fine boring with spindle stop and backbore",
      "Control feed rate for Ra requirement",
      "Avoid L/D > 5:1 without support",
    ],
    common_mistakes: [
      "Excessive L/D — boring bar deflection",
      "Wrong retract cycle — marks hole wall",
      "Insufficient rigidity — chatter",
    ],
    jm_die_recommendation: "For JM Die dowel holes in die blocks, G76 fine boring for H6. Use anti-vibration boring bar for L/D > 4.",
    manual_ref: "hyperMILL Manual Part 1 — Drilling, §Boring Cycles",
    manual_pages: "pp. 81-100",
    advantages: ["H6/H7 tolerance", "Backbore option", "Precision capable"],
    limitations: ["Rigid setup required", "L/D limit"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 90,
  },
  {
    id: "hm-drill-tap",
    name: "Tapping",
    category: "drilling",
    suitable_for: ["hole_threaded"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S"],
    parameters: [
      { name: "tap_cycle", description: "Tap type", typical_value: "G84 (RH) / G74 (LH)", unit: "-", physics_basis: "Thread hand", jm_die_recommendation: "G84 for standard RH threads" },
    ],
    best_practices: [
      "Rigid tapping with synchronized spindle/feed",
      "Floating tap holder for minor pitch compensation",
      "Verify thread depth for blind holes",
      "Through-tool coolant for chip evacuation",
    ],
    common_mistakes: [
      "Wrong pitch programming — thread will not mate",
      "Insufficient depth in blind hole — incomplete thread",
      "No chip evacuation — tap breaks",
    ],
    jm_die_recommendation: "For JM Die die block threads, rigid tap G84. Through-tool coolant. Verify blind depth allows full thread engagement.",
    manual_ref: "hyperMILL Manual Part 1 — Drilling, §Tapping",
    manual_pages: "pp. 116-130",
    advantages: ["Fast and accurate", "Synchronized feed"],
    limitations: ["Chip evacuation critical in blind holes"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TURNING STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-turn-rough",
    name: "Turning Roughing",
    category: "turning",
    suitable_for: ["od_profile", "id_profile"],
    goals: ["roughing"],
    required_kinematics: ["mill_turn"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "css_mode", description: "Speed mode", typical_value: "G96", unit: "-", physics_basis: "Constant surface speed", jm_die_recommendation: "G96 always for turning" },
      { name: "depth_of_cut", description: "Radial depth", typical_value: "2-4mm", unit: "mm", physics_basis: "Insert strength", jm_die_recommendation: "3mm for CNMG inserts in D2" },
    ],
    best_practices: [
      "Use G96 CSS for consistent chip formation across diameters",
      "Set RPM limits to prevent spindle overspeed at small diameters",
      "Stock model update for multi-pass sequences",
      "Ascending or constant infeed strategy for most materials",
      "Verify clearance angle for OD vs ID tooling",
    ],
    common_mistakes: [
      "Using G97 for OD turning — inconsistent surface speed",
      "No RPM limit at small diameter — spindle alarm",
      "Wrong tool orientation for ID vs OD",
      "Depth of cut exceeds insert recommendation",
    ],
    jm_die_recommendation: "For JM Die turned components, G96 at 150 m/min for D2. CNMG insert, 3mm DOC. RPM limit 2000 for small diameters.",
    manual_ref: "hyperMILL Manual Part 2 — Turning, §Turning Roughing",
    manual_pages: "pp. 15-60",
    advantages: ["G96 CSS support", "Multi-pass stock model"],
    limitations: ["Mill-turn machine required"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 70,
  },
  {
    id: "hm-turn-finish",
    name: "Turning Finishing",
    category: "turning",
    suitable_for: ["od_profile", "id_profile"],
    goals: ["finishing"],
    required_kinematics: ["mill_turn"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "tnrc", description: "Tool nose compensation", typical_value: "G41/G42", unit: "-", physics_basis: "Dimensional accuracy", jm_die_recommendation: "Always enable for h6/js6" },
      { name: "feed", description: "Finish feed rate", typical_value: "0.1-0.15 mm/rev", unit: "mm/rev", physics_basis: "Ra requirement", jm_die_recommendation: "0.1 mm/rev for Ra 1.6" },
    ],
    best_practices: [
      "G96 CSS essential for consistent Ra across diameters",
      "G41/G42 TNRC mandatory for dimensional accuracy < ±0.01mm",
      "Spring pass option for critical dimensions",
      "Match feed to Ra requirement",
      "Use G97 only for facing to center (D→0 singularity)",
    ],
    common_mistakes: [
      "No TNRC — dimension error from nose radius",
      "G96 to center on facing — RPM runaway",
      "Feed too high for Ra requirement",
      "Skipping spring pass on critical fits",
    ],
    jm_die_recommendation: "For JM Die precision turned features, G96 with G42 TNRC. 0.1 mm/rev feed for Ra 1.6. Spring pass for h6 shaft fits.",
    manual_ref: "hyperMILL Manual Part 2 — Turning, §Turning Finishing",
    manual_pages: "pp. 61-100",
    advantages: ["TNRC support", "CSS consistency"],
    limitations: ["G97 required at D=0"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 70,
  },
  {
    id: "hm-turn-groove",
    name: "Groove Turning",
    category: "turning",
    suitable_for: ["od_groove", "id_groove", "face_groove"],
    goals: ["roughing", "finishing"],
    required_kinematics: ["mill_turn"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "groove_width", description: "Groove insert width", typical_value: "Match insert", unit: "mm", physics_basis: "Insert geometry", jm_die_recommendation: "Use correct width insert" },
    ],
    best_practices: [
      "Use grooving insert width matching or smaller than groove",
      "Multi-pass plunge for wide grooves",
      "G97 at groove center for consistent chip formation",
      "TNRC for groove wall/floor dimensional accuracy",
    ],
    common_mistakes: [
      "Insert wider than groove — cannot enter",
      "Single plunge on wide groove — excessive force",
      "Wrong groove type (OD vs face vs ID)",
    ],
    jm_die_recommendation: "For JM Die O-ring grooves, use precision ground grooving insert. Multi-pass for width > insert. TNRC for groove dimensions.",
    manual_ref: "hyperMILL Manual Part 2 — Turning, §Groove Turning",
    manual_pages: "pp. 101-125",
    advantages: ["OD/ID/face groove support", "Multi-pass capable"],
    limitations: ["Insert geometry specific"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 65,
  },
  {
    id: "hm-turn-thread",
    name: "Thread Turning",
    category: "turning",
    suitable_for: ["od_thread", "id_thread"],
    goals: ["finishing"],
    required_kinematics: ["mill_turn"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "infeed_type", description: "Thread infeed method", typical_value: "Modified flank", unit: "-", physics_basis: "Chip control", jm_die_recommendation: "Modified flank for D2" },
      { name: "passes", description: "Number of passes", typical_value: "6-12", unit: "-", physics_basis: "Thread depth", jm_die_recommendation: "8 passes for 1.5mm pitch" },
    ],
    best_practices: [
      "G97 mandatory — spindle must sync to pitch",
      "TNRC off during threading",
      "Modified flank infeed for better chip control",
      "Constant chip section or constant X infeed",
      "Spring passes at end for thread accuracy",
    ],
    common_mistakes: [
      "Using G96 CSS — thread pitch destroyed",
      "TNRC active — thread geometry wrong",
      "Insufficient passes — thread overloads",
      "Wrong infeed angle for thread type",
    ],
    jm_die_recommendation: "For JM Die threaded die components, G97 always. Modified flank infeed. 8+ passes for standard metric. No TNRC during threading.",
    manual_ref: "hyperMILL Manual Part 2 — Turning, §Thread Turning",
    manual_pages: "pp. 126-160",
    advantages: ["G97 sync", "Multi-pass control", "All thread types"],
    limitations: ["G97 mandatory", "No TNRC"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 75,
  },
  {
    id: "hm-turn-parting",
    name: "Parting",
    category: "turning",
    suitable_for: ["parting"],
    goals: ["finishing"],
    required_kinematics: ["mill_turn"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "css_mode", description: "Speed mode", typical_value: "G97", unit: "-", physics_basis: "D→0 safety", jm_die_recommendation: "G97 always for parting" },
    ],
    best_practices: [
      "G97 mandatory — CSS forbidden (D→0 runaway)",
      "Set RPM based on OD starting diameter",
      "Reduce feed at center approach",
      "High-pressure coolant recommended",
      "Part catcher or sub-spindle for small parts",
    ],
    common_mistakes: [
      "Using G96 CSS — RPM runaway as D→0 causes crash",
      "Constant feed to center — part breaks off rough",
      "No coolant — insert burns at center",
    ],
    jm_die_recommendation: "For JM Die parting, G97 at RPM for OD. Reduce feed 50% at center. High-pressure coolant. Part catcher for small work.",
    manual_ref: "hyperMILL Manual Part 2 — Turning, §Parting",
    manual_pages: "pp. 161-180",
    advantages: ["Safe D→0 handling", "Feed control"],
    limitations: ["G97 mandatory"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 60,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELECTRODE MACHINING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-electrode-rough",
    name: "Electrode Roughing",
    category: "electrode",
    suitable_for: ["electrode_graphite", "electrode_copper"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["K"],
    parameters: [
      { name: "edm_undersize", description: "Spark gap allowance", typical_value: "0.1-0.3mm per side", unit: "mm", physics_basis: "EDM gap geometry", jm_die_recommendation: "0.15mm for roughing, 0.05mm for finish" },
    ],
    best_practices: [
      "Apply EDM undersize to all electrode surfaces",
      "Air blast coolant only — flood damages graphite",
      "Use graphite-grade carbide or diamond-coated tools",
      "Enable dust extraction for graphite health safety",
      "Leave stock for finish pass",
    ],
    common_mistakes: [
      "Using flood coolant on graphite — destroys material",
      "Wrong EDM undersize — electrode burns wrong gap",
      "No dust extraction — health hazard",
      "Standard end mill instead of graphite grade — rapid wear",
    ],
    jm_die_recommendation: "For JM Die graphite electrodes, air blast only. Diamond-coated end mills. 0.15mm EDM undersize for roughing. Dust extraction mandatory.",
    manual_ref: "hyperMILL Manual Part 4 — Electrode Machining, §Electrode Roughing",
    manual_pages: "pp. 420-445",
    advantages: ["EDM undersize auto-applied", "Electrode coordinate management"],
    limitations: ["Air blast only", "Special tooling"],
    ap_factor: 0.8,
    ae_factor: 0.4,
    priority: 12,
    jm_die_relevance: 95,
  },
  {
    id: "hm-electrode-finish",
    name: "Electrode Finishing",
    category: "electrode",
    suitable_for: ["electrode_graphite", "electrode_copper"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["K"],
    parameters: [
      { name: "finish_undersize", description: "Final EDM gap", typical_value: "0.03-0.1mm", unit: "mm", physics_basis: "Finish EDM gap", jm_die_recommendation: "0.05mm for standard, 0.03mm for precision" },
    ],
    best_practices: [
      "Fine finishing with tight undersize tolerance (±0.003mm)",
      "Z-Level finishing adapted for electrode geometry",
      "Auto-generate electrode inspection path",
      "Use premium graphite grade (ISO-63 or better)",
    ],
    common_mistakes: [
      "Wrong undersize — electrode produces wrong cavity size",
      "Low-grade graphite — poor surface transfer to workpiece",
      "Skipping inspection path — electrode geometry not verified",
    ],
    jm_die_recommendation: "For JM Die precision electrodes, 0.05mm undersize standard, 0.03mm for fine detail. Verify on CMM before EDM.",
    manual_ref: "hyperMILL Manual Part 4 — Electrode Machining, §Electrode Finishing",
    manual_pages: "pp. 446-470",
    advantages: ["±0.003mm EDM gap accuracy", "Inspection path auto-generated"],
    limitations: ["Premium graphite required"],
    ap_factor: 0.05,
    ae_factor: 0.05,
    priority: 13,
    jm_die_relevance: 95,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROBING / INSPECTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "hm-probe-wcs",
    name: "Probing — WCS Setup",
    category: "probing",
    suitable_for: ["pocket_2d", "hole_through", "face"],
    goals: ["roughing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "probe_type", description: "Probing routine", typical_value: "Corner/Edge/Bore/Boss", unit: "-", physics_basis: "Datum type", jm_die_recommendation: "Bore center for precision" },
    ],
    best_practices: [
      "Eliminates manual edge-finding — faster setup",
      "Automatic WCS offset update (G54-G59)",
      "Rotation correction for angular misalignment",
      "Skew correction available",
      "Calibrate probe before production",
    ],
    common_mistakes: [
      "Uncalibrated probe — offset errors",
      "Wrong probe routine for datum type",
      "Not verifying WCS update took effect",
    ],
    jm_die_recommendation: "For JM Die die block setup, probe bore center for precision. Verify G54 update. Calibrate probe weekly.",
    manual_ref: "hyperMILL Manual Part 1 — Probing, §WCS Probing",
    manual_pages: "pp. 150-185",
    advantages: ["Auto WCS setup", "Rotation correction", "Fast setup"],
    limitations: ["Calibrated probe required"],
    ap_factor: null,
    ae_factor: null,
    priority: 11,
    jm_die_relevance: 90,
  },
  {
    id: "hm-probe-inspect",
    name: "Probing — In-Process Inspection",
    category: "probing",
    suitable_for: ["face", "pocket_2d", "hole_through", "hole_blind"],
    goals: ["finishing"],
    required_kinematics: ["3axis", "4axis", "5axis_indexed"],
    suitable_materials: ["P", "M", "K", "N", "S", "H"],
    parameters: [
      { name: "tolerance", description: "Pass/fail tolerance", typical_value: "Per drawing", unit: "mm", physics_basis: "Acceptance criterion", jm_die_recommendation: "Drawing tolerance / 2 for warning" },
    ],
    best_practices: [
      "Measure critical dimensions before removing from machine",
      "Auto-compensate tool wear offset if out of tolerance",
      "Reports pass/fail for key features",
      "Saves CMM time for simple features",
      "Not a CMM replacement for tight tolerances",
    ],
    common_mistakes: [
      "Relying solely on probe for CMM-level accuracy",
      "Not setting proper pass/fail limits",
      "Probing with chips still on part",
    ],
    jm_die_recommendation: "For JM Die, probe critical bore diameters after boring. Auto-compensate if < 50% tolerance consumed. Verify on CMM for final.",
    manual_ref: "hyperMILL Manual Part 1 — Probing, §In-Process Inspection",
    manual_pages: "pp. 186-210",
    advantages: ["Catch errors on machine", "Tool wear compensation"],
    limitations: ["Not CMM replacement"],
    ap_factor: null,
    ae_factor: null,
    priority: 10,
    jm_die_relevance: 85,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * HyperMillStrategyKnowledgeEngine — Comprehensive hyperMILL Strategy Knowledge Base
 *
 * Provides complete knowledge of all hyperMILL strategies with:
 * - Best practices and common mistakes
 * - JM Die specific recommendations
 * - Strategy recommendation based on geometry/material
 * - CAM setup analysis and optimization suggestions
 */
export class HyperMillStrategyKnowledgeEngine {
  private strategies: Map<string, HyperMillStrategy>;
  private calcCount = 0;

  constructor() {
    this.strategies = new Map(STRATEGIES.map((s) => [s.id, s]));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Core Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get all available strategies
   */
  getAllStrategies(): HyperMillStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategies by category
   */
  getStrategiesByCategory(category: StrategyCategory): HyperMillStrategy[] {
    return this.getAllStrategies().filter((s) => s.category === category);
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): HyperMillStrategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get strategy details by name (fuzzy match)
   */
  getStrategyDetails(name: string): HyperMillStrategy | undefined {
    const lower = name.toLowerCase();
    return this.getAllStrategies().find(
      (s) => s.name.toLowerCase().includes(lower) || s.id.toLowerCase().includes(lower)
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Recommendation Engine
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Recommend strategy based on geometry and material
   */
  recommendStrategy(
    geometry: GeometryType,
    material: ISOGroup,
    goal: OperationGoal = "roughing",
    kinematics: MachineKinematics = "3axis"
  ): StrategyRecommendation {
    this.calcCount++;

    // Filter strategies by suitability
    const candidates = this.getAllStrategies().filter((s) => {
      const geomMatch = s.suitable_for.includes(geometry);
      const goalMatch = s.goals.includes(goal);
      const matMatch = s.suitable_materials.includes(material);
      const kinMatch = s.required_kinematics.includes(kinematics) ||
        s.required_kinematics.some((k) => this.kinematicsCompatible(kinematics, k));
      return geomMatch && goalMatch && matMatch && kinMatch;
    });

    if (candidates.length === 0) {
      // Fallback: find any strategy that matches geometry
      const fallback = this.getAllStrategies().find((s) => s.suitable_for.includes(geometry));
      if (fallback) {
        return {
          strategy: fallback,
          confidence: 0.5,
          reasoning: `No exact match found. Fallback to ${fallback.name} based on geometry type.`,
          alternatives: [],
          warnings: ["No optimal strategy found — verify machine capabilities and material suitability"],
          parameter_suggestions: this.getParameterSuggestions(fallback, material, goal),
        };
      }
      // Ultimate fallback
      return {
        strategy: STRATEGIES[0],
        confidence: 0.3,
        reasoning: "No matching strategy found. Using default Pocket Milling.",
        alternatives: [],
        warnings: ["Strategy match failed — manual selection required"],
        parameter_suggestions: {},
      };
    }

    // Sort by priority and JM Die relevance
    candidates.sort((a, b) => {
      const scoreA = a.priority * 0.6 + a.jm_die_relevance * 0.4;
      const scoreB = b.priority * 0.6 + b.jm_die_relevance * 0.4;
      return scoreB - scoreA;
    });

    const best = candidates[0];
    const alternatives = candidates.slice(1, 4);
    const confidence = this.calculateConfidence(best, geometry, material, goal, kinematics);
    const warnings = this.generateWarnings(best, material, goal);

    return {
      strategy: best,
      confidence,
      reasoning: this.generateReasoning(best, geometry, material, goal),
      alternatives,
      warnings,
      parameter_suggestions: this.getParameterSuggestions(best, material, goal),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAM Setup Analysis
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Analyze CAM setup for issues and recommendations
   */
  analyzeCAMSetup(setup: CAMSetup): SetupAnalysis {
    this.calcCount++;

    const issues: Array<{ severity: "error" | "warning" | "info"; message: string; fix: string }> = [];
    const parameterAnalysis: Record<string, { current: string; recommended: string; status: "ok" | "low" | "high" }> = {};

    // Get recommended strategy
    const rec = this.recommendStrategy(
      setup.geometry_type,
      setup.material_group,
      setup.operation_goal,
      setup.machine_kinematics
    );

    // Check strategy match
    const strategyMatch = !setup.current_strategy ||
      setup.current_strategy.toLowerCase().includes(rec.strategy.name.toLowerCase().split(" ")[0]);

    if (!strategyMatch) {
      issues.push({
        severity: "warning",
        message: `Current strategy "${setup.current_strategy}" may not be optimal`,
        fix: `Consider using "${rec.strategy.name}" for this geometry/material combination`,
      });
    }

    // Analyze cutting parameters
    if (setup.ap_mm && rec.strategy.ap_factor) {
      const recommendedAp = setup.tool_diameter_mm * rec.strategy.ap_factor;
      const apRatio = setup.ap_mm / recommendedAp;
      if (apRatio > 1.3) {
        issues.push({
          severity: "warning",
          message: `Axial depth (${setup.ap_mm}mm) exceeds recommended (${recommendedAp.toFixed(1)}mm)`,
          fix: `Reduce ap to ${recommendedAp.toFixed(1)}mm or less for tool life`,
        });
        parameterAnalysis["ap"] = { current: `${setup.ap_mm}mm`, recommended: `${recommendedAp.toFixed(1)}mm`, status: "high" };
      } else if (apRatio < 0.5) {
        issues.push({
          severity: "info",
          message: `Axial depth (${setup.ap_mm}mm) is conservative`,
          fix: `Can increase ap to ${recommendedAp.toFixed(1)}mm for productivity`,
        });
        parameterAnalysis["ap"] = { current: `${setup.ap_mm}mm`, recommended: `${recommendedAp.toFixed(1)}mm`, status: "low" };
      } else {
        parameterAnalysis["ap"] = { current: `${setup.ap_mm}mm`, recommended: `${recommendedAp.toFixed(1)}mm`, status: "ok" };
      }
    }

    if (setup.ae_mm && rec.strategy.ae_factor) {
      const recommendedAe = setup.tool_diameter_mm * rec.strategy.ae_factor;
      const aeRatio = setup.ae_mm / recommendedAe;
      if (aeRatio > 1.5) {
        issues.push({
          severity: "error",
          message: `Radial depth (${setup.ae_mm}mm) significantly exceeds recommended (${recommendedAe.toFixed(1)}mm)`,
          fix: `Reduce ae to ${recommendedAe.toFixed(1)}mm to prevent tool overload`,
        });
        parameterAnalysis["ae"] = { current: `${setup.ae_mm}mm`, recommended: `${recommendedAe.toFixed(1)}mm`, status: "high" };
      } else if (aeRatio < 0.4) {
        issues.push({
          severity: "info",
          message: `Radial depth (${setup.ae_mm}mm) is conservative`,
          fix: `Can increase ae to ${recommendedAe.toFixed(1)}mm for productivity`,
        });
        parameterAnalysis["ae"] = { current: `${setup.ae_mm}mm`, recommended: `${recommendedAe.toFixed(1)}mm`, status: "low" };
      } else {
        parameterAnalysis["ae"] = { current: `${setup.ae_mm}mm`, recommended: `${recommendedAe.toFixed(1)}mm`, status: "ok" };
      }
    }

    // Material-specific checks
    if (setup.material_group === "S" && (!setup.coolant || setup.coolant === "none")) {
      issues.push({
        severity: "error",
        message: "Superalloy (ISO S) requires coolant",
        fix: "Enable flood or through-tool coolant for titanium/nickel alloys",
      });
    }

    if (setup.material_group === "H" && setup.operation_goal === "roughing" && (!setup.ap_mm || setup.ap_mm > setup.tool_diameter_mm)) {
      issues.push({
        severity: "warning",
        message: "Hardened steel roughing may require reduced depth",
        fix: "Consider ap < 0.5×D for hardened material roughing",
      });
    }

    // Rest machining check
    if (setup.operation_goal === "rest_machining" && !setup.has_previous_roughing) {
      issues.push({
        severity: "error",
        message: "Rest machining requires previous roughing operation",
        fix: "Complete roughing with larger tool before rest machining",
      });
    }

    // Calculate safety score
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const safetyScore = Math.max(0, 1 - errorCount * 0.25 - warningCount * 0.1);

    return {
      valid: errorCount === 0,
      safety_score: safetyScore,
      issues,
      strategy_match: strategyMatch,
      recommended_strategy: rec.strategy,
      parameter_analysis: parameterAnalysis,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Optimization Suggestions
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Suggest optimizations for current CAM setup
   */
  suggestOptimizations(setup: CAMSetup): Optimization[] {
    this.calcCount++;
    const optimizations: Optimization[] = [];

    // HPC optimization
    if (
      !setup.current_strategy?.toLowerCase().includes("hpc") &&
      ["pocket_2d", "pocket_open", "slot"].includes(setup.geometry_type) &&
      setup.operation_goal === "roughing" &&
      ["P", "M", "H"].includes(setup.material_group)
    ) {
      optimizations.push({
        category: "cycle_time",
        description: "Switch to HPC (trochoidal) roughing for 3-4× higher feed rates",
        expected_improvement: "50-70% cycle time reduction",
        implementation: "Use HPC Roughing strategy with full depth and 10% stepover",
        risk_level: "low",
      });
    }

    // 5-axis indexed optimization
    if (
      setup.machine_kinematics === "3axis" &&
      ["pocket_2d", "hole_through"].includes(setup.geometry_type)
    ) {
      optimizations.push({
        category: "cycle_time",
        description: "Consider 5-axis indexed (3+2) for multi-face parts",
        expected_improvement: "Reduced setups from 6 to 1",
        implementation: "Use 5-Axis Indexed Pocket Milling if machine capable",
        risk_level: "low",
      });
    }

    // Rest machining optimization
    if (
      setup.operation_goal === "finishing" &&
      setup.has_previous_roughing &&
      ["freeform_3d", "pocket_2d"].includes(setup.geometry_type)
    ) {
      optimizations.push({
        category: "tool_life",
        description: "Add rest machining pass before finishing",
        expected_improvement: "25% reduction in finish tool load",
        implementation: "Run Automatic Rest Machining after roughing, before finish",
        risk_level: "low",
      });
    }

    // MAXX optimization for 5-axis
    if (
      setup.machine_kinematics === "5axis_simultaneous" &&
      ["freeform_3d", "flat_area"].includes(setup.geometry_type) &&
      setup.operation_goal === "finishing"
    ) {
      optimizations.push({
        category: "cycle_time",
        description: "Consider MAXX Finishing with barrel cutter",
        expected_improvement: "5-10× wider stepover, 60-80% cycle reduction",
        implementation: "Use conical barrel cutter with MAXX Finishing strategy",
        risk_level: "medium",
      });
    }

    // Tool life optimization for hard materials
    if (setup.material_group === "H" && setup.tool_type === "endmill") {
      optimizations.push({
        category: "tool_life",
        description: "Use AlCrN or TiSiN coated carbide for hardened steel",
        expected_improvement: "2-3× tool life improvement",
        implementation: "Select hardened steel grade insert with appropriate coating",
        risk_level: "low",
      });
    }

    // Surface finish optimization
    if (setup.operation_goal === "finishing" && setup.tool_type === "ball") {
      optimizations.push({
        category: "surface_finish",
        description: "Add spring pass for critical surface requirements",
        expected_improvement: "20-30% better Ra",
        implementation: "Run zero-stock finishing pass after main finish",
        risk_level: "low",
      });
    }

    // Cost optimization
    if (setup.operation_goal === "roughing" && setup.tool_type === "endmill" && setup.tool_diameter_mm > 16) {
      optimizations.push({
        category: "cost",
        description: "Consider indexable insert end mill for roughing",
        expected_improvement: "Lower cost per edge, faster insert replacement",
        implementation: "Use indexable insert cutter with appropriate grade",
        risk_level: "low",
      });
    }

    return optimizations;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Search & Query
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search strategies by keyword
   */
  searchStrategies(keyword: string): HyperMillStrategy[] {
    const lower = keyword.toLowerCase();
    return this.getAllStrategies().filter((s) =>
      s.name.toLowerCase().includes(lower) ||
      s.id.toLowerCase().includes(lower) ||
      s.suitable_for.some((g) => g.toLowerCase().includes(lower)) ||
      s.best_practices.some((bp) => bp.toLowerCase().includes(lower)) ||
      s.jm_die_recommendation.toLowerCase().includes(lower)
    );
  }

  /**
   * Get strategies for specific geometry type
   */
  getStrategiesForGeometry(geometry: GeometryType): HyperMillStrategy[] {
    return this.getAllStrategies()
      .filter((s) => s.suitable_for.includes(geometry))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get JM Die relevant strategies (relevance > 80)
   */
  getJMDieStrategies(): HyperMillStrategy[] {
    return this.getAllStrategies()
      .filter((s) => s.jm_die_relevance >= 80)
      .sort((a, b) => b.jm_die_relevance - a.jm_die_relevance);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Statistics
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get engine statistics
   */
  stats(): { strategyCount: number; calculations: number; categoryCounts: Record<string, number> } {
    const categoryCounts: Record<string, number> = {};
    for (const s of this.getAllStrategies()) {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }
    return {
      strategyCount: this.strategies.size,
      calculations: this.calcCount,
      categoryCounts,
    };
  }

  /**
   * Clear calculation counter
   */
  clear(): void {
    this.calcCount = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private kinematicsCompatible(actual: MachineKinematics, required: MachineKinematics): boolean {
    const hierarchy: Record<MachineKinematics, number> = {
      "3axis": 1,
      "4axis": 2,
      "5axis_indexed": 3,
      "5axis_simultaneous": 4,
      "mill_turn": 5,
    };
    // Higher capability machines can run lower-requirement strategies
    return hierarchy[actual] >= hierarchy[required];
  }

  private calculateConfidence(
    strategy: HyperMillStrategy,
    geometry: GeometryType,
    material: ISOGroup,
    goal: OperationGoal,
    kinematics: MachineKinematics
  ): number {
    let confidence = 0.7; // Base confidence

    // Exact geometry match bonus
    if (strategy.suitable_for[0] === geometry) confidence += 0.1;

    // Goal priority match
    if (strategy.goals[0] === goal) confidence += 0.05;

    // Material specialty (some strategies excel in specific materials)
    if (strategy.category === "hpc" && ["P", "M", "H"].includes(material)) confidence += 0.05;
    if (strategy.category === "electrode" && material === "K") confidence += 0.1;

    // High JM Die relevance
    if (strategy.jm_die_relevance >= 90) confidence += 0.05;

    return Math.min(confidence, 0.98);
  }

  private generateReasoning(
    strategy: HyperMillStrategy,
    geometry: GeometryType,
    material: ISOGroup,
    goal: OperationGoal
  ): string {
    const geomMatch = strategy.suitable_for.includes(geometry) ? "exact" : "compatible";
    const matNote = CANONICAL_KIENZLE[material] ? `(kc1.1=${CANONICAL_KIENZLE[material].kc1_1} N/mm²)` : "";

    return `Selected "${strategy.name}" for ${geometry} ${goal}. ` +
      `Geometry match: ${geomMatch}. Material: ISO ${material} ${matNote}. ` +
      `Priority: ${strategy.priority}/14, JM Die relevance: ${strategy.jm_die_relevance}%. ` +
      `Key advantage: ${strategy.advantages[0]}.`;
  }

  private generateWarnings(strategy: HyperMillStrategy, material: ISOGroup, goal: OperationGoal): string[] {
    const warnings: string[] = [];

    // Material-specific warnings
    if (material === "S") {
      warnings.push("Superalloy (ISO S): Use reduced cutting speed and high-pressure coolant");
    }
    if (material === "H") {
      warnings.push("Hardened steel (ISO H): CBN or ceramic tooling recommended for finishing");
    }

    // Strategy-specific limitations
    for (const limitation of strategy.limitations.slice(0, 2)) {
      warnings.push(limitation);
    }

    return warnings;
  }

  private getParameterSuggestions(
    strategy: HyperMillStrategy,
    material: ISOGroup,
    goal: OperationGoal
  ): Record<string, string> {
    const suggestions: Record<string, string> = {};

    for (const param of strategy.parameters) {
      if (param.jm_die_recommendation) {
        suggestions[param.name] = param.jm_die_recommendation;
      } else {
        suggestions[param.name] = param.typical_value;
      }
    }

    // Add ap/ae suggestions based on factors
    if (strategy.ap_factor) {
      const apNote = goal === "roughing" ? `${strategy.ap_factor}×D` : `${strategy.ap_factor * 0.5}×D`;
      suggestions["ap"] = apNote;
    }
    if (strategy.ae_factor) {
      suggestions["ae"] = `${(strategy.ae_factor * 100).toFixed(0)}% of tool diameter`;
    }

    return suggestions;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hyperMillStrategyKnowledgeEngine = new HyperMillStrategyKnowledgeEngine();
