/**
 * NXCAMStrategyEngine — Siemens NX CAM Strategy Recommendation Engine
 *
 * Dedicated strategy selector and parameter advisor for Siemens NX CAM 2306/2312.
 * Covers 30 strategies across milling, roughing, finishing, multi-axis, and turning.
 *
 * Unique NX features modeled:
 *   - IPW (In-Process Workpiece): stock tracking through every operation
 *   - Feature-Based Machining (FBM): auto-recognize → auto-assign strategy
 *   - Machining Knowledge Editor (MKE): store/reuse proven recipes
 *   - Machine simulation integration for optimized toolpaths
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority) — ranked strategies
 *   getParameters(strategy_name) — default cutting parameters
 *   ipwCapabilities() — IPW feature details
 *   fbmMapping(feature_type) — auto-assigned strategy for recognized features
 *   listStrategies(category?) — all strategies, optionally filtered
 *
 * @engine NXCAMStrategyEngine
 * @shortcode E1104
 * @dispatcher camDispatcher
 * @actions nx_cam_recommend, nx_cam_parameters, nx_cam_ipw, nx_cam_fbm, nx_cam_list_strategies
 * @milestone CAMX-MS5/U01
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NXStrategyCategory =
  | "milling"
  | "roughing"
  | "finishing"
  | "multi_axis"
  | "turning"
  | "hole_making";

export type NXFeatureType =
  | "pocket"
  | "contour"
  | "face"
  | "slot"
  | "bore"
  | "thread"
  | "cavity"
  | "freeform"
  | "steep_wall"
  | "flat_area"
  | "rib"
  | "impeller"
  | "blade"
  | "port"
  | "tube"
  | "edge_deburr"
  | "external_turning"
  | "internal_turning"
  | "groove_turning"
  | "thread_turning";

export type NXMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type NXMachineType =
  | "3_axis"
  | "4_axis"
  | "5_axis"
  | "mill_turn"
  | "lathe";

export type NXPriority =
  | "speed"
  | "quality"
  | "tool_life"
  | "cost"
  | "balanced";

export interface NXRecommendInput {
  feature_type: NXFeatureType;
  material_group?: NXMaterialGroup;
  machine_type?: NXMachineType;
  tool_diameter_mm?: number;
  wall_angle_deg?: number;
  pocket_depth_mm?: number;
  has_previous_roughing?: boolean;
  tolerance_mm?: number;
  priority?: NXPriority;
}

export interface NXStrategyRecommendation {
  rank: number;
  strategy_name: string;
  nx_operation_type: string;
  category: NXStrategyCategory;
  description: string;
  ae_factor: number | null;
  ap_factor: number | null;
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral";
  speed_multiplier: number;
  ipw_required: boolean;
  axis_requirement: "3" | "3+2" | "4" | "5" | "lathe";
  confidence: number;
  warnings: string[];
  nx_version: string;
}

export interface NXStrategyParameters {
  strategy_name: string;
  ae_pct_of_diameter: number;
  ap_pct_of_diameter: number;
  fz_range_mm: [number, number];
  vc_range_m_min: [number, number];
  spindle_speed_range_rpm: [number, number] | null;
  coolant: "flood" | "mist" | "air_blast" | "through_tool" | "dry";
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral";
  engagement_control: boolean;
  ipw_tracking: boolean;
  lead_angle_deg: number | null;
  tilt_angle_deg: number | null;
  notes: string[];
}

export interface NXIPWCapability {
  name: string;
  description: string;
  supported_operations: string[];
  benefits: string[];
  requirements: string[];
  nx_version: string;
}

export interface NXFBMMapping {
  feature_type: string;
  recognized_by_fbm: boolean;
  auto_assigned_strategy: string | null;
  operation_sequence: string[];
  mke_template_available: boolean;
  notes: string;
}

// ─── Strategy Database ────────────────────────────────────────────────────────

interface StrategyEntry {
  name: string;
  nx_operation: string;
  category: NXStrategyCategory;
  description: string;
  ae_factor: number | null;
  ap_factor: number | null;
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral";
  speed_mult: number;
  ipw_required: boolean;
  axis_req: "3" | "3+2" | "4" | "5" | "lathe";
  suitable_features: NXFeatureType[];
  priority_boost: NXPriority[];
  priority_score: number;
  ae_pct: number;
  ap_pct: number;
  fz_range: [number, number];
  vc_range: [number, number];
  coolant: "flood" | "mist" | "air_blast" | "through_tool" | "dry";
  engagement_ctrl: boolean;
  lead_deg: number | null;
  tilt_deg: number | null;
  notes: string[];
}

const NX_STRATEGIES: StrategyEntry[] = [
  // ── MILLING ─────────────────────────────────────────────────────────────────
  {
    name: "Cavity Mill",
    nx_operation: "mill_planar/cavity_mill",
    category: "milling",
    description: "2.5D roughing with IPW tracking. The workhorse NX milling strategy for pockets and cavities. Supports follow-periphery and follow-part patterns with automatic IPW updates.",
    ae_factor: 0.65, ap_factor: 1.0,
    cutting_mode: "climb", speed_mult: 1.0,
    ipw_required: true, axis_req: "3",
    suitable_features: ["pocket", "cavity", "slot", "face"],
    priority_boost: ["speed", "balanced"],
    priority_score: 12,
    ae_pct: 65, ap_pct: 100, fz_range: [0.08, 0.25],
    vc_range: [80, 250], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["ae=50-75%D typical", "Workhorse 2.5D roughing", "IPW tracks stock automatically"],
  },
  {
    name: "Adaptive Milling",
    nx_operation: "mill_planar/adaptive_milling",
    category: "milling",
    description: "Constant-engagement trochoidal-style roughing. Maintains constant chip load through varying radial engagement. Similar to Mastercam Dynamic Motion. ae=10%D with 1.8x speed multiplier.",
    ae_factor: 0.10, ap_factor: 2.0,
    cutting_mode: "climb", speed_mult: 1.8,
    ipw_required: true, axis_req: "3",
    suitable_features: ["pocket", "cavity", "slot", "contour"],
    priority_boost: ["speed", "tool_life"],
    priority_score: 14,
    ae_pct: 10, ap_pct: 200, fz_range: [0.08, 0.20],
    vc_range: [120, 400], coolant: "flood",
    engagement_ctrl: true, lead_deg: null, tilt_deg: null,
    notes: ["ae=10%D, full flute length ap", "Constant chip load path", "Speed x1.8 vs conventional", "Similar to Mastercam Dynamic"],
  },
  {
    name: "Planar Mill",
    nx_operation: "mill_planar/planar_mill",
    category: "milling",
    description: "2.5D profiling and pocketing with floor and wall finishing capability. Supports inward and outward cutting patterns for both roughing and finishing passes.",
    ae_factor: 0.40, ap_factor: 1.0,
    cutting_mode: "climb", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["pocket", "contour", "face", "slot"],
    priority_boost: ["quality", "balanced"],
    priority_score: 10,
    ae_pct: 40, ap_pct: 100, fz_range: [0.05, 0.20],
    vc_range: [80, 250], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Floor and wall finishing", "Inward/outward patterns"],
  },
  {
    name: "Face Milling",
    nx_operation: "mill_planar/face_milling",
    category: "milling",
    description: "Face mill operations for top surfaces. Uses large-diameter face mills for efficient stock removal across flat surfaces. Supports zigzag and one-direction patterns.",
    ae_factor: 0.70, ap_factor: 0.5,
    cutting_mode: "zigzag", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["face", "flat_area"],
    priority_boost: ["speed"],
    priority_score: 10,
    ae_pct: 70, ap_pct: 50, fz_range: [0.10, 0.35],
    vc_range: [100, 300], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Large face mill operations", "Zigzag or one-direction"],
  },
  {
    name: "Z-Level Profile",
    nx_operation: "mill_contour/zlevel_profile",
    category: "milling",
    description: "Constant-Z waterline roughing and finishing. Ideal for steep walls (>60 deg). Automatic step-down with variable Z-levels for optimal surface quality.",
    ae_factor: null, ap_factor: 0.10,
    cutting_mode: "climb", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["steep_wall", "contour", "freeform", "cavity"],
    priority_boost: ["quality"],
    priority_score: 11,
    ae_pct: 15, ap_pct: 10, fz_range: [0.05, 0.15],
    vc_range: [100, 300], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Best for steep walls >60 deg", "Constant-Z waterline paths", "Variable step-down support"],
  },
  {
    name: "Contour Area",
    nx_operation: "mill_contour/contour_area",
    category: "milling",
    description: "3D area-based finishing with cut-area control. Machines selected surface areas with contour-following tool paths. Supports slope-dependent step-over.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["freeform", "flat_area", "cavity"],
    priority_boost: ["quality", "balanced"],
    priority_score: 9,
    ae_pct: 15, ap_pct: 10, fz_range: [0.03, 0.12],
    vc_range: [100, 300], coolant: "mist",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Area-based finishing", "Slope-dependent stepover"],
  },
  {
    name: "Fixed Contour",
    nx_operation: "mill_contour/fixed_contour",
    category: "milling",
    description: "Drive-surface following with tool-axis control. Follows a drive surface or set of curves with fixed tool orientation. Used for 3+2 and indexed machining.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.0,
    ipw_required: false, axis_req: "3+2",
    suitable_features: ["freeform", "contour", "flat_area"],
    priority_boost: ["quality"],
    priority_score: 8,
    ae_pct: 10, ap_pct: 8, fz_range: [0.03, 0.10],
    vc_range: [100, 280], coolant: "mist",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Drive surface following", "Fixed tool orientation", "3+2 axis positioning"],
  },
  {
    name: "Variable Contour",
    nx_operation: "mill_multi_axis/variable_contour",
    category: "milling",
    description: "Most flexible NX operation — full simultaneous 5-axis control. Supports swarf cutting, tool-axis interpolation, and complex surface following with lead/tilt control.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.9,
    ipw_required: false, axis_req: "5",
    suitable_features: ["freeform", "impeller", "blade", "port", "contour"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 10, ap_pct: 8, fz_range: [0.03, 0.10],
    vc_range: [80, 250], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: 5, tilt_deg: 3,
    notes: ["Full 5-axis simultaneous", "Swarf cutting support", "Lead/tilt interpolation", "Most flexible NX operation"],
  },
  {
    name: "Sequential Mill",
    nx_operation: "mill_contour/sequential_mill",
    category: "milling",
    description: "Point-to-point manual control for complex or non-standard operations. User defines each cut pass manually. Used for specialized finishing or areas where automatic paths fail.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.8,
    ipw_required: false, axis_req: "3",
    suitable_features: ["freeform", "contour"],
    priority_boost: [],
    priority_score: 3,
    ae_pct: 10, ap_pct: 10, fz_range: [0.03, 0.10],
    vc_range: [80, 200], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Manual point-to-point control", "Use when auto-paths fail"],
  },
  {
    name: "Thread Milling",
    nx_operation: "mill_planar/thread_milling",
    category: "milling",
    description: "Helical thread interpolation for internal and external threads. Uses single-point or multi-form thread mills with helical interpolation (G2/G3 + Z feed).",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.6,
    ipw_required: false, axis_req: "3",
    suitable_features: ["thread"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.03, 0.08],
    vc_range: [50, 150], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Helical interpolation G2/G3+Z", "Internal and external threads", "Single or multi-form mills"],
  },
  {
    name: "Hole Making",
    nx_operation: "hole_making/drill",
    category: "hole_making",
    description: "Integrated drill, tap, ream, and bore cycles. Supports peck drilling (G73/G83), tapping (G84), reaming, and precision boring (G76). Automatic cycle selection from hole feature.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["bore", "thread"],
    priority_boost: ["speed", "balanced"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.05, 0.30],
    vc_range: [40, 120], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["G73/G83 peck drill", "G84 tapping", "G76 precision bore", "Auto-cycle from FBM"],
  },

  // ── ROUGHING-SPECIFIC ───────────────────────────────────────────────────────
  {
    name: "Rest Milling",
    nx_operation: "mill_contour/rest_milling",
    category: "roughing",
    description: "IPW-based rest material removal. Identifies and machines only material left by previous larger tools. Requires IPW from prior operations for accurate stock computation.",
    ae_factor: 0.40, ap_factor: 0.80,
    cutting_mode: "climb", speed_mult: 0.9,
    ipw_required: true, axis_req: "3",
    suitable_features: ["pocket", "cavity", "contour", "freeform"],
    priority_boost: ["quality", "balanced"],
    priority_score: 10,
    ae_pct: 40, ap_pct: 80, fz_range: [0.05, 0.15],
    vc_range: [80, 220], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Requires IPW from prior ops", "Smaller tool for rest areas", "Automatic rest detection"],
  },
  {
    name: "Plunge Milling",
    nx_operation: "mill_planar/plunge_milling",
    category: "roughing",
    description: "Axial plunge roughing for deep cavities and hard materials. Cutting force is primarily axial (along spindle), reducing deflection in long-reach situations. ae=50% overlap.",
    ae_factor: 0.50, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 0.7,
    ipw_required: false, axis_req: "3",
    suitable_features: ["cavity", "pocket", "slot"],
    priority_boost: ["tool_life"],
    priority_score: 8,
    ae_pct: 50, ap_pct: 100, fz_range: [0.05, 0.15],
    vc_range: [40, 120], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Axial cutting force", "Good for deep cavities", "Reduced deflection vs radial", "ae=50% tool diameter overlap"],
  },

  // ── FINISHING-SPECIFIC ──────────────────────────────────────────────────────
  {
    name: "Flow Cut",
    nx_operation: "mill_contour/flow_cut",
    category: "finishing",
    description: "UV-based finishing following natural surface flow lines. Generates paths that follow the surface UV parameterization for smooth, uniform coverage. Ideal for organic and sculpted shapes.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.1,
    ipw_required: false, axis_req: "3",
    suitable_features: ["freeform", "flat_area"],
    priority_boost: ["quality"],
    priority_score: 11,
    ae_pct: 8, ap_pct: 5, fz_range: [0.03, 0.10],
    vc_range: [120, 350], coolant: "mist",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["UV surface flow following", "Organic/sculpted shapes", "Uniform coverage"],
  },
  {
    name: "Streamline",
    nx_operation: "mill_contour/streamline",
    category: "finishing",
    description: "Optimized finish paths for smooth surfaces. Generates tool paths that follow surface topology for minimum cusps. Produces superior finish on complex curved geometry.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.1,
    ipw_required: false, axis_req: "3",
    suitable_features: ["freeform", "cavity"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 8, ap_pct: 5, fz_range: [0.02, 0.08],
    vc_range: [120, 350], coolant: "mist",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Surface-topology following", "Minimum cusp height", "Superior curved finish"],
  },
  {
    name: "Surface Contouring",
    nx_operation: "mill_contour/surface_contour",
    category: "finishing",
    description: "Parallel finishing with scallop height control. Generates parallel-cut finishing paths with step-over computed from target scallop height. Supports both linear and circular patterns.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "zigzag", speed_mult: 1.0,
    ipw_required: false, axis_req: "3",
    suitable_features: ["freeform", "flat_area", "cavity"],
    priority_boost: ["quality", "balanced"],
    priority_score: 9,
    ae_pct: 12, ap_pct: 8, fz_range: [0.03, 0.10],
    vc_range: [100, 300], coolant: "mist",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Scallop height control", "Parallel cut finishing", "Linear/circular patterns"],
  },

  // ── MULTI-AXIS ──────────────────────────────────────────────────────────────
  {
    name: "Multi-Axis Deburring",
    nx_operation: "mill_multi_axis/deburring",
    category: "multi_axis",
    description: "5-axis edge deburring with automatic edge detection. Tool follows part edges maintaining normal orientation for consistent chamfer/break. Supports variable edge radius.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.8,
    ipw_required: false, axis_req: "5",
    suitable_features: ["edge_deburr", "contour"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.03, 0.08],
    vc_range: [60, 180], coolant: "air_blast",
    engagement_ctrl: false, lead_deg: 0, tilt_deg: 0,
    notes: ["Auto edge detection", "Normal orientation tracking", "Variable edge radius support"],
  },
  {
    name: "Tube Milling",
    nx_operation: "mill_multi_axis/tube_milling",
    category: "multi_axis",
    description: "Pipe and tube interior machining. 5-axis milling of internal bore surfaces following tube centerline with radial tool engagement. Used for exhaust, manifold, and pipe components.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.7,
    ipw_required: false, axis_req: "5",
    suitable_features: ["tube", "bore"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 8, ap_pct: 5, fz_range: [0.02, 0.06],
    vc_range: [50, 150], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: 0, tilt_deg: 0,
    notes: ["Follows tube centerline", "Radial tool engagement", "Exhaust/manifold/pipe parts"],
  },
  {
    name: "Blade Milling",
    nx_operation: "mill_multi_axis/blade_milling",
    category: "multi_axis",
    description: "Dedicated turbomachinery blade machining. Automated blade roughing and finishing with hub avoidance. Supports splitter blades and variable-radius fillets.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.8,
    ipw_required: true, axis_req: "5",
    suitable_features: ["blade", "impeller"],
    priority_boost: ["quality", "tool_life"],
    priority_score: 12,
    ae_pct: 8, ap_pct: 10, fz_range: [0.02, 0.08],
    vc_range: [40, 120], coolant: "through_tool",
    engagement_ctrl: true, lead_deg: 5, tilt_deg: 3,
    notes: ["Hub avoidance built-in", "Splitter blade support", "Variable-radius fillets", "Dedicated turbomachinery"],
  },
  {
    name: "Impeller Milling",
    nx_operation: "mill_multi_axis/impeller_milling",
    category: "multi_axis",
    description: "Dedicated impeller roughing and finishing. Automated channel roughing with hub and blade avoidance, plus multi-pass blade finishing with lead/tilt control.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.8,
    ipw_required: true, axis_req: "5",
    suitable_features: ["impeller", "blade"],
    priority_boost: ["quality", "tool_life"],
    priority_score: 13,
    ae_pct: 8, ap_pct: 10, fz_range: [0.02, 0.06],
    vc_range: [35, 100], coolant: "through_tool",
    engagement_ctrl: true, lead_deg: 5, tilt_deg: 3,
    notes: ["Channel roughing + blade finishing", "Hub/blade avoidance", "Lead/tilt interpolation"],
  },
  {
    name: "Port Machining",
    nx_operation: "mill_multi_axis/port_machining",
    category: "multi_axis",
    description: "Intake and exhaust port finishing. 5-axis machining of internal port geometry with collision-free tool paths. Supports variable cross-section ports and blended surfaces.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.7,
    ipw_required: false, axis_req: "5",
    suitable_features: ["port", "tube"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 8, ap_pct: 5, fz_range: [0.02, 0.06],
    vc_range: [40, 120], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: 3, tilt_deg: 2,
    notes: ["Variable cross-section support", "Collision-free paths", "Blended surface handling"],
  },

  // ── TURNING (NX Mill-Turn) ──────────────────────────────────────────────────
  {
    name: "Rough Turning",
    nx_operation: "turning/rough_turning",
    category: "turning",
    description: "OD/ID rough turning with constant or variable depth of cut. Supports facing, longitudinal, and profiling rough cuts. Multiple infeed strategies: constant, ascending, descending.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 1.0,
    ipw_required: false, axis_req: "lathe",
    suitable_features: ["external_turning", "internal_turning"],
    priority_boost: ["speed", "balanced"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.15, 0.50],
    vc_range: [100, 350], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["OD/ID roughing", "Constant/variable DOC", "Facing and longitudinal"],
  },
  {
    name: "Finish Turning",
    nx_operation: "turning/finish_turning",
    category: "turning",
    description: "Profile-following finish turning. Generates contour-parallel finishing passes with nose-radius compensation. Supports both OD and ID finishing.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 1.0,
    ipw_required: false, axis_req: "lathe",
    suitable_features: ["external_turning", "internal_turning"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.05, 0.20],
    vc_range: [120, 400], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Contour-parallel finish", "Nose radius compensation", "OD and ID finishing"],
  },
  {
    name: "Groove Turning",
    nx_operation: "turning/groove_turning",
    category: "turning",
    description: "Groove and undercut turning operations. Supports axial and radial grooving, face grooving, and full-radius undercuts. Plunge + side-cut combinations.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 0.8,
    ipw_required: false, axis_req: "lathe",
    suitable_features: ["groove_turning"],
    priority_boost: ["balanced"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.05, 0.15],
    vc_range: [60, 200], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Axial/radial/face grooving", "Full-radius undercuts", "Plunge + side-cut combos"],
  },
  {
    name: "Thread Turning",
    nx_operation: "turning/thread_turning",
    category: "turning",
    description: "Single-point thread turning (G76/G92). Supports constant chip-section infeed, modified flank infeed, or alternating flank. Internal and external threads, single or multi-start.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 0.6,
    ipw_required: false, axis_req: "lathe",
    suitable_features: ["thread_turning"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100, fz_range: [0.05, 0.10],
    vc_range: [60, 180], coolant: "flood",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["G76/G92 thread cycles", "Constant/modified/alternating infeed", "Single and multi-start"],
  },
  {
    name: "Centerline Drilling",
    nx_operation: "turning/centerline_drilling",
    category: "turning",
    description: "Centerline drilling/boring on lathe spindle. Uses drill, center drill, or boring bar on the lathe spindle axis. Supports peck drilling for deep holes.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 1.0,
    ipw_required: false, axis_req: "lathe",
    suitable_features: ["bore", "internal_turning"],
    priority_boost: ["speed"],
    priority_score: 8,
    ae_pct: 100, ap_pct: 100, fz_range: [0.05, 0.25],
    vc_range: [40, 120], coolant: "through_tool",
    engagement_ctrl: false, lead_deg: null, tilt_deg: null,
    notes: ["Lathe spindle drilling", "Peck drilling support", "Center drill / boring bar"],
  },
];

// ─── IPW Database ─────────────────────────────────────────────────────────────

const IPW_CAPABILITIES: NXIPWCapability[] = [
  {
    name: "3D IPW Tracking",
    description: "Maintains a 3D facet model of remaining stock through every operation. Each operation reads the current IPW and writes an updated IPW for the next operation.",
    supported_operations: ["Cavity Mill", "Adaptive Milling", "Rest Milling", "Z-Level Profile", "Planar Mill", "Face Milling"],
    benefits: [
      "Eliminates air cutting — tool only engages material that exists",
      "Enables accurate rest milling with smaller tools",
      "Automatic stock allowance management between ops",
      "Simulation-ready output for machine verification",
    ],
    requirements: [
      "Initial blank/stock definition (box, cylinder, or STL)",
      "Operations must be ordered sequentially",
      "Each op must reference the correct IPW from the prior op",
    ],
    nx_version: "NX CAM 2306+",
  },
  {
    name: "IPW Display & Sectioning",
    description: "Visual display of remaining stock at any point in the operation sequence. Supports cross-section views and color-coded deviation mapping vs part model.",
    supported_operations: ["All milling operations", "Turning operations"],
    benefits: [
      "Visual verification of stock at any stage",
      "Deviation mapping for quality validation",
      "Cross-section analysis for internal features",
    ],
    requirements: ["At least one prior operation with IPW output"],
    nx_version: "NX CAM 2306+",
  },
  {
    name: "Collision-Free IPW",
    description: "Machine-level simulation using IPW data. Checks tool holder, spindle head, and fixture collisions against current stock shape (not just final part). Prevents gouging and crashes.",
    supported_operations: ["All operations with IPW enabled"],
    benefits: [
      "Detects tool holder / spindle head collisions with stock",
      "Prevents gouging on intermediate stock shapes",
      "Fixture interference checking against current stock",
      "Safety verification before sending to machine",
    ],
    requirements: [
      "Machine model loaded in NX",
      "Tool assembly with holder geometry",
      "IPW chain configured through operation sequence",
    ],
    nx_version: "NX CAM 2312+",
  },
  {
    name: "IPW for Multi-Axis",
    description: "Full 5-axis IPW support including tool axis orientation tracking. Stock shape updates account for tool tilt and lead angles throughout simultaneous 5-axis motion.",
    supported_operations: ["Variable Contour", "Blade Milling", "Impeller Milling", "Multi-Axis Deburring"],
    benefits: [
      "Accurate 5-axis stock tracking",
      "Rest milling after multi-axis roughing",
      "Tool axis considered in stock computation",
    ],
    requirements: [
      "5-axis machine model",
      "Tool assembly with full geometry",
    ],
    nx_version: "NX CAM 2312+",
  },
];

// ─── FBM Database ─────────────────────────────────────────────────────────────

const FBM_MAPPINGS: Record<string, NXFBMMapping> = {
  pocket: {
    feature_type: "pocket",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Cavity Mill",
    operation_sequence: ["Face Milling (if open top)", "Cavity Mill (roughing)", "Planar Mill (finishing)"],
    mke_template_available: true,
    notes: "FBM auto-detects pocket floor level, island geometry, and corner radii. MKE template applies proven ae/ap/fz per material.",
  },
  bore: {
    feature_type: "bore",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Hole Making",
    operation_sequence: ["Center Drill", "Drill (peck if L/D > 3)", "Ream or Bore (if tolerance < 0.025mm)"],
    mke_template_available: true,
    notes: "FBM reads hole diameter, depth, and tolerance to select drill vs ream vs bore cycle. Peck auto-enabled for L/D > 3.",
  },
  thread: {
    feature_type: "thread",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Thread Milling",
    operation_sequence: ["Drill pilot hole", "Thread Mill or Tap (based on size/quantity)"],
    mke_template_available: true,
    notes: "FBM recognizes thread callouts. Tapping preferred for high-volume M3-M20; thread milling for larger or fewer holes.",
  },
  slot: {
    feature_type: "slot",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Planar Mill",
    operation_sequence: ["Cavity Mill (rough, if deep)", "Planar Mill (finish walls and floor)"],
    mke_template_available: true,
    notes: "FBM detects slot width and depth. If width < 1.5x tool diameter, single-pass strategy selected.",
  },
  face: {
    feature_type: "face",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Face Milling",
    operation_sequence: ["Face Milling"],
    mke_template_available: true,
    notes: "FBM detects planar faces needing surfacing. Auto-selects largest available face mill.",
  },
  contour: {
    feature_type: "contour",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Planar Mill",
    operation_sequence: ["Planar Mill (profiling)"],
    mke_template_available: false,
    notes: "FBM recognizes open and closed contour profiles. Step-down determined by feature depth.",
  },
  freeform: {
    feature_type: "freeform",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Freeform/sculpted surfaces not auto-recognized by FBM. Requires manual strategy selection (Flow Cut, Streamline, or Variable Contour).",
  },
  cavity: {
    feature_type: "cavity",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Cavity Mill",
    operation_sequence: ["Cavity Mill (roughing)", "Rest Milling (corners)", "Z-Level Profile or Contour Area (finishing)"],
    mke_template_available: true,
    notes: "FBM detects 3D cavities. Full roughing-to-finish sequence auto-generated with IPW tracking.",
  },
  steep_wall: {
    feature_type: "steep_wall",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Steep walls not auto-recognized. Use Z-Level Profile for walls >60 deg or Contour Area for walls 30-60 deg.",
  },
  impeller: {
    feature_type: "impeller",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Turbomachinery requires dedicated Impeller Milling or Blade Milling modules. Not available through FBM.",
  },
  blade: {
    feature_type: "blade",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Blade features require dedicated Blade Milling module. Manual setup with lead/tilt configuration.",
  },
  port: {
    feature_type: "port",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Port geometry requires Port Machining module. Manual centerline and cross-section definition.",
  },
  tube: {
    feature_type: "tube",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Tube interior machining requires Tube Milling module. Manual centerline definition.",
  },
  edge_deburr: {
    feature_type: "edge_deburr",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Edge deburring requires Multi-Axis Deburring module. FBM cannot auto-detect deburr requirements.",
  },
  external_turning: {
    feature_type: "external_turning",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Rough Turning",
    operation_sequence: ["Rough Turning", "Finish Turning"],
    mke_template_available: true,
    notes: "FBM detects OD profiles. Auto-sequences roughing and finishing with correct stock allowance.",
  },
  internal_turning: {
    feature_type: "internal_turning",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Rough Turning",
    operation_sequence: ["Centerline Drilling (pilot)", "Rough Turning (ID)", "Finish Turning (ID)"],
    mke_template_available: true,
    notes: "FBM detects ID bores. Auto-adds pilot hole if no existing bore.",
  },
  groove_turning: {
    feature_type: "groove_turning",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Groove Turning",
    operation_sequence: ["Groove Turning"],
    mke_template_available: true,
    notes: "FBM detects groove width and depth. Auto-selects appropriate grooving tool.",
  },
  thread_turning: {
    feature_type: "thread_turning",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Thread Turning",
    operation_sequence: ["Rough Turning (to minor dia)", "Thread Turning"],
    mke_template_available: true,
    notes: "FBM reads thread pitch and class. Auto-selects constant chip-section infeed.",
  },
  rib: {
    feature_type: "rib",
    recognized_by_fbm: false,
    auto_assigned_strategy: null,
    operation_sequence: [],
    mke_template_available: false,
    notes: "Rib features not auto-recognized. Use Cavity Mill (roughing) + Z-Level Profile (finishing) manually.",
  },
  flat_area: {
    feature_type: "flat_area",
    recognized_by_fbm: true,
    auto_assigned_strategy: "Face Milling",
    operation_sequence: ["Face Milling"],
    mke_template_available: true,
    notes: "FBM detects planar faces. Treated same as face features.",
  },
};

// ─── Material Adjustments ─────────────────────────────────────────────────────

interface MaterialAdjustment {
  speed_factor: number;
  feed_factor: number;
  warnings: string[];
}

const MATERIAL_ADJUSTMENTS: Record<NXMaterialGroup, MaterialAdjustment> = {
  P: { speed_factor: 1.0, feed_factor: 1.0, warnings: [] },
  M: { speed_factor: 0.8, feed_factor: 0.9, warnings: ["Stainless (ISO M): reduce speed 20%, watch BUE at low speeds"] },
  K: { speed_factor: 1.2, feed_factor: 1.1, warnings: ["Cast iron (ISO K): higher speeds OK, use dry cutting if possible"] },
  N: { speed_factor: 2.0, feed_factor: 1.3, warnings: ["Non-ferrous (ISO N): high speed capability, watch for BUE with aluminum"] },
  S: { speed_factor: 0.4, feed_factor: 0.7, warnings: ["Superalloy (ISO S): reduce speed 60%, use through-tool coolant, constant engagement critical"] },
  H: { speed_factor: 0.6, feed_factor: 0.6, warnings: ["Hardened steel (ISO H): use small ae/ap, high speed, low fz, CBN or ceramic inserts recommended"] },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

class NXCAMStrategyEngine {
  private calcCount = 0;

  /**
   * Recommend ranked NX CAM strategies for a given feature, material, and machine configuration.
   *
   * Scoring logic:
   *   - Base priority_score from strategy database
   *   - +3 if priority matches strategy's priority_boost list
   *   - +2 for steep walls (>60 deg) with Z-Level strategies
   *   - +2 for flat areas (<20 deg) with face/contour area strategies
   *   - -2 if machine axis capability is below strategy requirement
   *   - Material speed/feed adjustments applied to parameters
   *
   * Returns top 5 ranked recommendations.
   */
  recommend(input: NXRecommendInput): NXStrategyRecommendation[] {
    this.calcCount++;

    const {
      feature_type,
      material_group,
      machine_type = "3_axis",
      wall_angle_deg,
      has_previous_roughing,
      tolerance_mm,
      priority = "balanced",
    } = input;

    // Filter strategies that support this feature type
    let candidates = NX_STRATEGIES.filter(s =>
      s.suitable_features.includes(feature_type)
    );

    // Fallback: if no match, use all strategies and warn
    const fallback = candidates.length === 0;
    if (fallback) {
      candidates = [...NX_STRATEGIES];
    }

    // Score and rank
    const scored = candidates.map(s => {
      let score = s.priority_score;
      const warnings: string[] = [];

      // Priority boost
      if (s.priority_boost.includes(priority)) {
        score += 3;
      }

      // Slope-dependent boost
      if (wall_angle_deg !== undefined) {
        if (wall_angle_deg > 60 && s.name.includes("Z-Level")) {
          score += 2;
          warnings.push("Steep wall detected (>60 deg) — Z-Level strategy boosted");
        }
        if (wall_angle_deg < 20 && (s.name.includes("Face") || s.name.includes("Contour Area"))) {
          score += 2;
          warnings.push("Flat area detected (<20 deg) — planar strategy boosted");
        }
      }

      // Machine axis compatibility check
      const axisMap: Record<string, number> = {
        "3": 3, "3+2": 3.5, "4": 4, "5": 5, "lathe": 2,
      };
      const machineAxes: Record<NXMachineType, number> = {
        "3_axis": 3, "4_axis": 4, "5_axis": 5, "mill_turn": 5, "lathe": 2,
      };
      const reqAxis = axisMap[s.axis_req] ?? 3;
      const haveAxis = machineAxes[machine_type] ?? 3;

      if (reqAxis > haveAxis && s.axis_req !== "lathe") {
        score -= 5;
        warnings.push(`Strategy requires ${s.axis_req}-axis but machine is ${machine_type}`);
      }
      if (s.axis_req === "lathe" && machine_type !== "lathe" && machine_type !== "mill_turn") {
        score -= 5;
        warnings.push("Turning strategy requires lathe or mill-turn machine");
      }

      // Rest milling without previous roughing
      if (s.name === "Rest Milling" && !has_previous_roughing) {
        score -= 2;
        warnings.push("Rest Milling requires prior roughing operation with IPW");
      }

      // Tight tolerance boost for finishing strategies
      if (tolerance_mm !== undefined && tolerance_mm < 0.02 && s.category === "finishing") {
        score += 2;
      }

      // Material warnings
      if (material_group) {
        const adj = MATERIAL_ADJUSTMENTS[material_group];
        if (adj) {
          warnings.push(...adj.warnings);
        }
      }

      // Fallback warning
      if (fallback) {
        warnings.push(`No exact match for feature '${feature_type}' — showing closest strategies`);
      }

      // Confidence calculation
      let confidence = 0.90;
      if (fallback) confidence -= 0.20;
      if (warnings.length > 1) confidence -= 0.05 * Math.min(warnings.length - 1, 3);
      if (reqAxis > haveAxis) confidence -= 0.15;
      confidence = Math.max(0.30, confidence);

      return { strategy: s, score, warnings, confidence };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Return top 5
    return scored.slice(0, 5).map((item, idx) => {
      const s = item.strategy;
      const matAdj = material_group ? MATERIAL_ADJUSTMENTS[material_group] : null;
      const speedMult = s.speed_mult * (matAdj?.speed_factor ?? 1.0);

      return {
        rank: idx + 1,
        strategy_name: s.name,
        nx_operation_type: s.nx_operation,
        category: s.category,
        description: s.description,
        ae_factor: s.ae_factor,
        ap_factor: s.ap_factor,
        cutting_mode: s.cutting_mode,
        speed_multiplier: parseFloat(speedMult.toFixed(2)),
        ipw_required: s.ipw_required,
        axis_requirement: s.axis_req,
        confidence: parseFloat(item.confidence.toFixed(2)),
        warnings: item.warnings,
        nx_version: "NX CAM 2306/2312",
      };
    });
  }

  /**
   * Get default cutting parameters for a named NX CAM strategy.
   * Returns null if strategy not found.
   */
  getParameters(strategy_name: string): NXStrategyParameters | null {
    const s = NX_STRATEGIES.find(
      st => st.name.toLowerCase() === strategy_name.toLowerCase()
    );
    if (!s) return null;

    return {
      strategy_name: s.name,
      ae_pct_of_diameter: s.ae_pct,
      ap_pct_of_diameter: s.ap_pct,
      fz_range_mm: s.fz_range,
      vc_range_m_min: s.vc_range,
      spindle_speed_range_rpm: null,
      coolant: s.coolant,
      cutting_mode: s.cutting_mode,
      engagement_control: s.engagement_ctrl,
      ipw_tracking: s.ipw_required,
      lead_angle_deg: s.lead_deg,
      tilt_angle_deg: s.tilt_deg,
      notes: s.notes,
    };
  }

  /**
   * Return all IPW (In-Process Workpiece) capabilities and details.
   */
  ipwCapabilities(): NXIPWCapability[] {
    return IPW_CAPABILITIES.map(c => ({ ...c }));
  }

  /**
   * Get the FBM (Feature-Based Machining) mapping for a given feature type.
   * Returns the auto-assigned strategy, operation sequence, and MKE availability.
   */
  fbmMapping(feature_type: string): NXFBMMapping {
    const mapping = FBM_MAPPINGS[feature_type.toLowerCase()];
    if (!mapping) {
      return {
        feature_type,
        recognized_by_fbm: false,
        auto_assigned_strategy: null,
        operation_sequence: [],
        mke_template_available: false,
        notes: `Feature type '${feature_type}' not found in NX FBM database. Use manual strategy selection.`,
      };
    }
    return { ...mapping };
  }

  /**
   * List all available NX CAM strategies, optionally filtered by category.
   */
  listStrategies(category?: NXStrategyCategory): Array<{
    name: string;
    nx_operation: string;
    category: NXStrategyCategory;
    description: string;
    axis_requirement: string;
    ipw_required: boolean;
  }> {
    let strategies = NX_STRATEGIES;
    if (category) {
      strategies = strategies.filter(s => s.category === category);
    }
    return strategies.map(s => ({
      name: s.name,
      nx_operation: s.nx_operation,
      category: s.category,
      description: s.description,
      axis_requirement: s.axis_req,
      ipw_required: s.ipw_required,
    }));
  }

  /** Return engine stats. */
  stats(): { calculations: number } {
    return { calculations: this.calcCount };
  }

  /** Reset calculation counter. */
  clear(): void {
    this.calcCount = 0;
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const nxCAMStrategyEngine = new NXCAMStrategyEngine();
export { NXCAMStrategyEngine };
