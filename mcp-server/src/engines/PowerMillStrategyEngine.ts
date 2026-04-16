/**
 * PowerMillStrategyEngine — Autodesk PowerMill Strategy Recommendation Engine
 *
 * Dedicated strategy selector and parameter advisor for Autodesk PowerMill 2024+.
 * PowerMill is the premium high-end 5-axis CAM dominant in aerospace, mold & die,
 * and large-part machining. Covers 25+ strategies across roughing, finishing,
 * drilling, and multi-axis operations.
 *
 * Unique PowerMill features modeled:
 *   - Vortex: constant tool engagement (trochoidal-like) for HSM roughing
 *   - ViewMill: integrated stock simulation for verification
 *   - Automatic collision avoidance with tool axis tilting
 *   - Steep & Shallow: automatic split of steep vs shallow surface regions
 *   - Swarf Finishing: side-of-tool 5-axis for ruled/developable surfaces
 *   - Race Line: topology-following finishing for complex freeform
 *
 * Methods:
 *   recommend(input) — ranked strategy recommendations with parameters
 *   getParameters(strategy_name) — default cutting parameters for a named strategy
 *   vortexDetails() — Vortex roughing technology details
 *   steepShallowDetails() — Steep & Shallow auto-split details
 *   listStrategies(category?) — all strategies, optionally filtered by category
 *
 * @engine PowerMillStrategyEngine
 * @shortcode E1105
 * @dispatcher camDispatcher
 * @actions pm_recommend, pm_parameters, pm_vortex_details, pm_steep_shallow_details, pm_list_strategies
 * @milestone CAMX-MS6/U01
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PMStrategyCategory =
  | "roughing"
  | "finishing"
  | "drilling"
  | "multi_axis";

export type PMFeatureType =
  | "pocket"
  | "cavity"
  | "contour"
  | "face"
  | "slot"
  | "bore"
  | "freeform"
  | "steep_wall"
  | "flat_area"
  | "rib"
  | "corner"
  | "blend_radius"
  | "impeller"
  | "blade"
  | "port"
  | "ruled_surface"
  | "wing_spar"
  | "bulkhead"
  | "mold_core"
  | "mold_cavity";

export type PMMaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type PMMachineType =
  | "3_axis"
  | "3_plus_2"
  | "4_axis"
  | "5_axis_continuous"
  | "mill_turn";

export type PMPriority =
  | "speed"
  | "quality"
  | "tool_life"
  | "cost"
  | "balanced";

export interface PMRecommendInput {
  feature_type: PMFeatureType;
  material_group?: PMMaterialGroup;
  machine_type?: PMMachineType;
  tool_diameter_mm?: number;
  wall_angle_deg?: number;        // 0=flat, 90=vertical
  pocket_depth_mm?: number;
  has_previous_roughing?: boolean;
  tolerance_mm?: number;
  priority?: PMPriority;
  enable_viewmill?: boolean;      // request ViewMill simulation note
}

export interface PMStrategyRecommendation {
  rank: number;
  strategy_name: string;
  pm_operation_type: string;
  category: PMStrategyCategory;
  description: string;
  ae_factor: number | null;       // stepover as fraction of tool diameter
  ap_factor: number | null;       // stepdown as fraction of tool diameter
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral" | "flowline";
  speed_multiplier: number;       // relative to baseline feed
  axis_requirement: "3" | "3+2" | "4" | "5" | "any";
  collision_avoidance: boolean;   // automatic tool axis tilting available
  viewmill_supported: boolean;
  confidence: number;
  warnings: string[];
}

export interface PMStrategyParameters {
  strategy_name: string;
  ae_pct_of_diameter: number;
  ap_pct_of_diameter: number;
  fz_range_mm: [number, number];
  vc_range_m_min: [number, number];
  coolant: "flood" | "mist" | "air_blast" | "through_tool" | "dry";
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral" | "flowline";
  engagement_constant: boolean;   // true = Vortex/constant-engagement
  lead_angle_deg: number | null;
  tilt_angle_deg: number | null;
  notes: string[];
}

export interface PMVortexDetails {
  technology: string;
  description: string;
  engagement_angle_deg: number;
  ae_range_pct: [number, number];
  speed_multiplier: number;
  benefits: string[];
  ideal_applications: string[];
  limitations: string[];
  parameters: {
    name: string;
    description: string;
    typical_value: string;
  }[];
}

export interface PMSteepShallowDetails {
  technology: string;
  description: string;
  steep_threshold_deg: number;
  steep_strategy: string;
  shallow_strategy: string;
  transition_handling: string;
  benefits: string[];
  parameters: {
    name: string;
    description: string;
    typical_value: string;
  }[];
}

// ─── Internal Strategy Database ───────────────────────────────────────────────

interface StrategyEntry {
  name: string;
  pm_operation: string;
  category: PMStrategyCategory;
  description: string;
  ae_factor: number | null;
  ap_factor: number | null;
  cutting_mode: "climb" | "conventional" | "zigzag" | "spiral" | "flowline";
  speed_mult: number;
  axis_req: "3" | "3+2" | "4" | "5" | "any";
  collision_avoidance: boolean;
  viewmill_supported: boolean;
  suitable_features: PMFeatureType[];
  priority_boost: PMPriority[];
  priority_score: number;
  ae_pct: number;
  ap_pct: number;
  fz_range: [number, number];
  vc_range: [number, number];
  coolant: "flood" | "mist" | "air_blast" | "through_tool" | "dry";
  engagement_constant: boolean;
  lead_deg: number | null;
  tilt_deg: number | null;
  notes: string[];
}

const PM_STRATEGIES: StrategyEntry[] = [
  // ── ROUGHING ────────────────────────────────────────────────────────────────

  {
    name: "Vortex",
    pm_operation: "roughing/vortex",
    category: "roughing",
    description:
      "PowerMill flagship HSM roughing. Maintains constant tool engagement angle " +
      "with trochoidal-style repositioning arcs. Reduces heat and load spikes, " +
      "enabling 2× speed vs conventional offset roughing. Ideal for hard alloys " +
      "and deep pockets where thermal control is critical.",
    ae_factor: 0.10, ap_factor: 1.5,
    cutting_mode: "climb", speed_mult: 2.0,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["pocket", "cavity", "slot", "freeform", "wing_spar", "bulkhead", "mold_core", "mold_cavity"],
    priority_boost: ["speed", "tool_life"],
    priority_score: 15,
    ae_pct: 10, ap_pct: 150,
    fz_range: [0.04, 0.15], vc_range: [120, 400],
    coolant: "through_tool",
    engagement_constant: true,
    lead_deg: null, tilt_deg: null,
    notes: [
      "ae typically 8–12% of tool diameter for constant engagement",
      "Full-depth passes (ap up to 1.5×D) are achievable with engagement control",
      "Requires PowerMill Vortex license module",
      "Use with solid carbide end mills; avoid long-reach tools without dampening",
    ],
  },

  {
    name: "Model Area Clearance",
    pm_operation: "roughing/model_area_clearance",
    category: "roughing",
    description:
      "Traditional Z-level offset roughing. Generates concentric contour-parallel " +
      "passes at each Z depth. Robust, widely applicable, best for simpler geometries " +
      "where Vortex engagement control is not required.",
    ae_factor: 0.65, ap_factor: 0.5,
    cutting_mode: "climb", speed_mult: 1.0,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["pocket", "cavity", "slot", "face", "mold_core", "mold_cavity"],
    priority_boost: ["balanced", "cost"],
    priority_score: 10,
    ae_pct: 65, ap_pct: 50,
    fz_range: [0.06, 0.20], vc_range: [80, 250],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "ae 50–75% of tool diameter is typical",
      "Use stock model to drive efficient material removal",
      "Suitable for 3-axis machines without HSM requirements",
    ],
  },

  {
    name: "Plunge Roughing",
    pm_operation: "roughing/plunge_roughing",
    category: "roughing",
    description:
      "Axial plunge milling for deep slots and pockets. The tool plunges on the Z " +
      "axis, stepping over by the drill diameter each cycle. Exceptionally stable " +
      "because axial cutting forces are along the spindle axis, enabling deep " +
      "material removal in vibration-prone setups.",
    ae_factor: 1.0, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 0.7,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["slot", "pocket", "cavity", "wing_spar"],
    priority_boost: ["tool_life"],
    priority_score: 8,
    ae_pct: 100, ap_pct: 100,
    fz_range: [0.05, 0.20], vc_range: [60, 180],
    coolant: "through_tool",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "ap = full depth per plunge (tool length limited)",
      "ae = drill diameter (step-over equals tool diameter)",
      "Best for L/D > 4; use indexable plunge mills for economy",
      "Minimal radial forces — ideal for thin-wall or vibration-prone parts",
    ],
  },

  {
    name: "Rest Roughing",
    pm_operation: "roughing/rest_roughing",
    category: "roughing",
    description:
      "IPW-based rest material removal. Uses the In-Process Workpiece stock model " +
      "from the prior roughing operation to identify and machine only the remaining " +
      "material, typically with a smaller tool. Efficient and avoids air cuts.",
    ae_factor: 0.4, ap_factor: 0.5,
    cutting_mode: "climb", speed_mult: 0.85,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["corner", "pocket", "cavity", "slot", "mold_core", "mold_cavity"],
    priority_boost: ["quality", "balanced"],
    priority_score: 9,
    ae_pct: 40, ap_pct: 50,
    fz_range: [0.04, 0.12], vc_range: [80, 220],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Requires a completed prior roughing toolpath for IPW reference",
      "Smaller tool diameter compared to initial roughing tool",
      "PowerMill automatically detects rest material regions from stock model",
    ],
  },

  // ── FINISHING ───────────────────────────────────────────────────────────────

  {
    name: "Raster Finishing",
    pm_operation: "finishing/raster",
    category: "finishing",
    description:
      "Linear parallel passes across the model at a configurable angle. Simple " +
      "and reliable for relatively flat surfaces. Stepover controls scallop height. " +
      "The machining angle can be set to minimize cusp on dominant slopes.",
    ae_factor: 0.10, ap_factor: null,
    cutting_mode: "zigzag", speed_mult: 1.0,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["face", "flat_area", "mold_core", "mold_cavity", "freeform"],
    priority_boost: ["speed", "balanced"],
    priority_score: 9,
    ae_pct: 10, ap_pct: 0,
    fz_range: [0.03, 0.12], vc_range: [100, 350],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Set raster angle to align with dominant surface slope for best surface finish",
      "Combine with Steep & Shallow to restrict raster to flat regions only",
      "Scallop height = ae² / (8R) where R is ball nose radius",
    ],
  },

  {
    name: "3D Offset Finishing",
    pm_operation: "finishing/3d_offset",
    category: "finishing",
    description:
      "Constant-stepover offset toolpath derived from part boundary. Maintains " +
      "uniform cusp height across varied surface curvature. Ideal for complex " +
      "freeform surfaces in mold & die where consistent Ra is required.",
    ae_factor: 0.08, ap_factor: null,
    cutting_mode: "spiral", speed_mult: 1.05,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["freeform", "mold_core", "mold_cavity", "flat_area"],
    priority_boost: ["quality", "balanced"],
    priority_score: 11,
    ae_pct: 8, ap_pct: 0,
    fz_range: [0.02, 0.10], vc_range: [100, 400],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Boundary-driven offset ensures uniform stepover regardless of surface shape",
      "Preferred for mold cavities and cores requiring Ra < 0.8 µm",
      "Works best with ball nose or radius end mills",
    ],
  },

  {
    name: "Constant-Z Finishing",
    pm_operation: "finishing/constant_z",
    category: "finishing",
    description:
      "Waterline (Z-level) finishing. Cuts horizontal slices of the model, " +
      "progressing downward. Delivers the best surface quality on steep walls " +
      "because the tool always contacts at the same axial depth.",
    ae_factor: null, ap_factor: 0.08,
    cutting_mode: "climb", speed_mult: 1.0,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["steep_wall", "mold_core", "mold_cavity", "contour", "freeform"],
    priority_boost: ["quality"],
    priority_score: 11,
    ae_pct: 0, ap_pct: 8,
    fz_range: [0.03, 0.12], vc_range: [100, 350],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "ap (Z stepdown) controls scallop on steep walls",
      "Use when wall angle > 45°; combine with raster for flat regions",
      "Climb milling strongly preferred for surface finish consistency",
    ],
  },

  {
    name: "Steep and Shallow Finishing",
    pm_operation: "finishing/steep_and_shallow",
    category: "finishing",
    description:
      "Automatically splits the part into steep and shallow regions based on a " +
      "configurable angle threshold. Steep regions receive Constant-Z waterline " +
      "passes; shallow regions receive raster or 3D offset passes. Eliminates " +
      "manual boundary creation for combined finishing.",
    ae_factor: 0.08, ap_factor: 0.08,
    cutting_mode: "climb", speed_mult: 1.0,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["freeform", "mold_core", "mold_cavity", "steep_wall", "flat_area"],
    priority_boost: ["balanced", "quality"],
    priority_score: 14,
    ae_pct: 8, ap_pct: 8,
    fz_range: [0.02, 0.10], vc_range: [100, 400],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Default steep/shallow threshold is typically 30–45°",
      "Eliminates need to manually define boundary curves between steep and flat areas",
      "PowerMill automatically blends transition zones for smooth overlap",
      "Single setup covers the entire part — recommended for complex mold finishing",
    ],
  },

  {
    name: "Pattern Finishing",
    pm_operation: "finishing/pattern",
    category: "finishing",
    description:
      "Applies a user-defined or preset pattern (spiral, radial, custom curve) " +
      "to the surface. Useful for decorative or functionally patterned surfaces " +
      "and for following design intent on aerodynamic forms.",
    ae_factor: 0.08, ap_factor: null,
    cutting_mode: "spiral", speed_mult: 0.95,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["freeform", "face", "flat_area"],
    priority_boost: ["quality"],
    priority_score: 7,
    ae_pct: 8, ap_pct: 0,
    fz_range: [0.02, 0.10], vc_range: [100, 350],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Spiral pattern minimizes tool lifts for efficient finishing",
      "Radial pattern suits circular or rotationally symmetric parts",
      "Custom curve patterns follow imported reference geometry",
    ],
  },

  {
    name: "Pencil Finishing",
    pm_operation: "finishing/pencil",
    category: "finishing",
    description:
      "Corner cleanup along blend radii and internal concave regions. Automatically " +
      "detects areas where the previous tool left material in corners and generates " +
      "cleanup passes with a smaller tool, following the natural edge of the blend.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.8,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["corner", "blend_radius", "mold_core", "mold_cavity"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 0, ap_pct: 0,
    fz_range: [0.01, 0.06], vc_range: [80, 280],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Tool must fit within the blend radius; D_tool ≤ 2× blend_radius",
      "Multiple passes may be required for deep corner blends",
      "Often run as a cleanup after 3D Offset or Steep & Shallow finishing",
    ],
  },

  {
    name: "Flowline Finishing",
    pm_operation: "finishing/flowline",
    category: "finishing",
    description:
      "Follows the UV surface flow lines (iso-parameter curves) of the underlying " +
      "CAD surface. Produces extremely smooth surface finish along the natural " +
      "surface direction. Best for single-patch or skinned surfaces.",
    ae_factor: 0.08, ap_factor: null,
    cutting_mode: "flowline", speed_mult: 1.05,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["freeform", "blade", "impeller", "port", "mold_core"],
    priority_boost: ["quality"],
    priority_score: 10,
    ae_pct: 8, ap_pct: 0,
    fz_range: [0.02, 0.08], vc_range: [100, 380],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Requires well-defined UV parameterization on the CAD surface",
      "Degeneracy at surface poles can cause toolpath crowding — check with ViewMill",
      "Ideal for turbine blades and aerodynamic surfaces",
    ],
  },

  {
    name: "Rib Machining",
    pm_operation: "finishing/rib_machining",
    category: "finishing",
    description:
      "Specialized finishing for thin ribs. Generates side-milling passes along " +
      "rib walls and floor passes at the base, respecting rib thickness to avoid " +
      "deflection. Includes approach and retract moves that minimize rib bending.",
    ae_factor: 0.3, ap_factor: 1.0,
    cutting_mode: "climb", speed_mult: 0.75,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["rib"],
    priority_boost: ["quality", "tool_life"],
    priority_score: 10,
    ae_pct: 30, ap_pct: 100,
    fz_range: [0.02, 0.08], vc_range: [80, 250],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Use radial depth of cut ≤ 30% D to minimize radial force on thin ribs",
      "Multiple light finishing passes preferred over single heavy pass",
      "Consider fixture damping or low-vibration toolholders for L/D > 5",
    ],
  },

  {
    name: "Stitch Corner Finishing",
    pm_operation: "finishing/stitch_corner",
    category: "finishing",
    description:
      "Micro-corner finishing that stitches together adjacent surface patches " +
      "at their intersection edges. Removes residual material from corner junctions " +
      "that pencil finishing cannot reach due to blend geometry constraints.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 0.7,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["corner", "blend_radius"],
    priority_boost: ["quality"],
    priority_score: 7,
    ae_pct: 0, ap_pct: 0,
    fz_range: [0.01, 0.04], vc_range: [80, 250],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Very small tool required — typically D ≤ 3 mm",
      "Used as final cleanup operation after pencil finishing",
      "Short cycle time but high precision requirement on tool runout",
    ],
  },

  {
    name: "Race Line Finishing",
    pm_operation: "finishing/race_line",
    category: "finishing",
    description:
      "Optimized finishing that follows the natural topology of the surface, " +
      "analogous to a racing line on a circuit. Minimizes direction changes and " +
      "approach/retract moves by conforming to surface curvature. Produces " +
      "efficient, consistent toolpaths on complex organic forms.",
    ae_factor: 0.07, ap_factor: null,
    cutting_mode: "spiral", speed_mult: 1.1,
    axis_req: "3", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["freeform", "mold_core", "mold_cavity", "port"],
    priority_boost: ["speed", "quality"],
    priority_score: 9,
    ae_pct: 7, ap_pct: 0,
    fz_range: [0.02, 0.10], vc_range: [100, 400],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Especially effective on sinuous freeform mold surfaces",
      "Reduces machining time vs raster by minimizing tool lifts",
      "Requires PowerMill 2020 or later for full Race Line algorithm",
    ],
  },

  {
    name: "Swarf Finishing",
    pm_operation: "finishing/swarf",
    category: "finishing",
    description:
      "Side-of-tool (flank) 5-axis finishing for ruled or developable surfaces. " +
      "The tool side face contacts the surface instead of the ball tip, producing " +
      "a superior finish on aerodynamic panels, impeller blades, and draft walls " +
      "in a single pass per zone.",
    ae_factor: null, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.2,
    axis_req: "5", collision_avoidance: true, viewmill_supported: true,
    suitable_features: ["ruled_surface", "blade", "impeller", "wing_spar", "contour"],
    priority_boost: ["quality", "speed"],
    priority_score: 13,
    ae_pct: 0, ap_pct: 0,
    fz_range: [0.03, 0.15], vc_range: [80, 300],
    coolant: "through_tool",
    engagement_constant: false,
    lead_deg: 10, tilt_deg: 5,
    notes: [
      "Surface must be ruled (straight line between two guide curves) for true swarf milling",
      "Tool axis is tilted to lie along the surface ruling direction",
      "Automatic collision avoidance tilts tool axis to avoid fixture or part interference",
      "Single swarf pass can replace multiple ball-nose finishing passes",
      "Requires 5-axis continuous machine",
    ],
  },

  // ── DRILLING ─────────────────────────────────────────────────────────────────

  {
    name: "Drilling",
    pm_operation: "drilling/drilling",
    category: "drilling",
    description:
      "Standard hole-making with peck drilling and chip-breaking cycles. " +
      "Supports through holes, blind holes, and peck sequences for deep holes " +
      "(L/D > 3). Retract strategies and feed reduction at breakthrough are " +
      "configurable.",
    ae_factor: 1.0, ap_factor: null,
    cutting_mode: "conventional", speed_mult: 1.0,
    axis_req: "any", collision_avoidance: false, viewmill_supported: false,
    suitable_features: ["bore"],
    priority_boost: ["balanced", "speed"],
    priority_score: 10,
    ae_pct: 100, ap_pct: 100,
    fz_range: [0.05, 0.30], vc_range: [30, 150],
    coolant: "through_tool",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Peck cycle recommended for L/D > 3 to aid chip evacuation",
      "Break chip cycle (partial retract) for deeper holes or stringy materials",
      "Feed rate reduction of 30% at breakthrough prevents delamination in composites",
    ],
  },

  // ── MULTI-AXIS ───────────────────────────────────────────────────────────────

  {
    name: "5-Axis Finishing",
    pm_operation: "multi_axis/5axis_finishing",
    category: "multi_axis",
    description:
      "Full simultaneous 5-axis finishing with automatic collision avoidance. " +
      "The tool axis continuously tilts to maintain optimal contact angle and " +
      "avoid collisions with the part and fixtures. Best-in-class for aerospace " +
      "wing spars, bulkheads, and complex turbine components.",
    ae_factor: 0.08, ap_factor: null,
    cutting_mode: "climb", speed_mult: 1.15,
    axis_req: "5", collision_avoidance: true, viewmill_supported: true,
    suitable_features: ["impeller", "blade", "port", "wing_spar", "bulkhead", "freeform"],
    priority_boost: ["quality", "balanced"],
    priority_score: 15,
    ae_pct: 8, ap_pct: 0,
    fz_range: [0.02, 0.10], vc_range: [80, 350],
    coolant: "through_tool",
    engagement_constant: false,
    lead_deg: 15, tilt_deg: 10,
    notes: [
      "Automatic tool axis tilting avoids collisions without manual axis definition",
      "Lead/lag angle (15° lead typical) prevents ball-tip cutting at zero velocity",
      "ViewMill simulation strongly recommended before first run on aerospace parts",
      "Requires 5-axis simultaneous post-processor",
    ],
  },

  {
    name: "3+2 Indexed Machining",
    pm_operation: "multi_axis/3plus2",
    category: "multi_axis",
    description:
      "Indexed multi-axis machining. The rotary axes position the part or head at " +
      "a fixed angle while standard 3-axis toolpaths execute. Enables undercut " +
      "access and optimal tool presentation without continuous 5-axis motion. " +
      "Lower machine complexity vs full 5-axis.",
    ae_factor: 0.65, ap_factor: 0.5,
    cutting_mode: "climb", speed_mult: 1.0,
    axis_req: "3+2", collision_avoidance: false, viewmill_supported: true,
    suitable_features: ["bulkhead", "wing_spar", "pocket", "contour", "freeform"],
    priority_boost: ["balanced", "cost"],
    priority_score: 11,
    ae_pct: 65, ap_pct: 50,
    fz_range: [0.04, 0.18], vc_range: [80, 300],
    coolant: "flood",
    engagement_constant: false,
    lead_deg: null, tilt_deg: null,
    notes: [
      "Rotary axes lock before cutting — check table load and torque limits",
      "Ideal for parts requiring access from 4–6 faces without full 5-axis",
      "Lower programming complexity than continuous 5-axis",
      "Post-processor must support TCPC (Tool Centre Point Control)",
    ],
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

/** PowerMillStrategyEngine — strategy recommendation and parameter lookup
 * for Autodesk PowerMill 2024+ CAM system.
 */
export class PowerMillStrategyEngine {
  private calcCount = 0;
  private lastInput: PMRecommendInput | null = null;

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Recommend ranked PowerMill strategies for a given feature, material, and machine.
   * Returns top 5 strategies ordered by suitability with confidence scores.
   */
  recommend(input: PMRecommendInput): PMStrategyRecommendation[] {
    this.calcCount++;
    this.lastInput = input;

    const {
      feature_type,
      material_group,
      machine_type = "3_axis",
      wall_angle_deg,
      pocket_depth_mm,
      has_previous_roughing = false,
      tolerance_mm,
      priority = "balanced",
    } = input;

    let candidates = [...PM_STRATEGIES];

    // Filter by feature type
    candidates = candidates.filter((s) =>
      s.suitable_features.includes(feature_type),
    );

    // Filter by machine axis capability
    candidates = candidates.filter((s) => {
      if (s.axis_req === "any") return true;
      if (s.axis_req === "5") return machine_type === "5_axis_continuous" || machine_type === "mill_turn";
      if (s.axis_req === "3+2") return machine_type !== "3_axis";
      if (s.axis_req === "4") return machine_type === "4_axis" || machine_type === "5_axis_continuous" || machine_type === "mill_turn";
      return true; // "3" works on any machine
    });

    // Rest roughing requires previous roughing
    if (!has_previous_roughing) {
      candidates = candidates.filter((s) => s.name !== "Rest Roughing");
    }

    // Wall angle adjustments for finishing strategies
    if (wall_angle_deg !== undefined) {
      candidates.sort((a, b) => {
        let scoreA = a.priority_score;
        let scoreB = b.priority_score;

        if (wall_angle_deg > 45) {
          // Steep: boost Constant-Z, Swarf, 5-axis
          if (a.name === "Constant-Z Finishing" || a.name === "Swarf Finishing" || a.name === "5-Axis Finishing") scoreA += 4;
          if (b.name === "Constant-Z Finishing" || b.name === "Swarf Finishing" || b.name === "5-Axis Finishing") scoreB += 4;
          // Demote raster on steep walls
          if (a.name === "Raster Finishing") scoreA -= 3;
          if (b.name === "Raster Finishing") scoreB -= 3;
        } else if (wall_angle_deg < 20) {
          // Flat: boost Raster, 3D Offset, Race Line
          if (a.name === "Raster Finishing" || a.name === "3D Offset Finishing" || a.name === "Race Line Finishing") scoreA += 3;
          if (b.name === "Raster Finishing" || b.name === "3D Offset Finishing" || b.name === "Race Line Finishing") scoreB += 3;
          // Demote Constant-Z on flat areas
          if (a.name === "Constant-Z Finishing") scoreA -= 3;
          if (b.name === "Constant-Z Finishing") scoreB -= 3;
        }
        return scoreB - scoreA;
      });
    }

    // Priority boosts
    candidates.sort((a, b) => {
      const aBoost = a.priority_boost.includes(priority) ? 2 : 0;
      const bBoost = b.priority_boost.includes(priority) ? 2 : 0;
      return (b.priority_score + bBoost) - (a.priority_score + aBoost);
    });

    // Pocket depth: deep pockets favor Plunge Roughing and Vortex
    if (pocket_depth_mm !== undefined && pocket_depth_mm > 50) {
      const pboost = (s: StrategyEntry) =>
        s.name === "Plunge Roughing" || s.name === "Vortex" ? 3 : 0;
      candidates.sort((a, b) => (b.priority_score + pboost(b)) - (a.priority_score + pboost(a)));
    }

    // Tight tolerance: boost finishing strategies with constant engagement or constant stepover
    if (tolerance_mm !== undefined && tolerance_mm < 0.05) {
      candidates.sort((a, b) => {
        const aQ = a.category === "finishing" ? 2 : 0;
        const bQ = b.category === "finishing" ? 2 : 0;
        return (b.priority_score + bQ) - (a.priority_score + aQ);
      });
    }

    // Material-specific adjustments
    const matWarnings = this._materialWarnings(material_group);

    // Build result — top 5
    return candidates.slice(0, 5).map((s, idx) => {
      const warnings: string[] = [...matWarnings];

      if (s.name === "Rest Roughing" && !has_previous_roughing) {
        warnings.push("Rest Roughing requires a completed prior roughing operation");
      }
      if (s.axis_req === "5" && machine_type !== "5_axis_continuous") {
        warnings.push(`${s.name} requires 5-axis continuous machine; current config is ${machine_type}`);
      }
      if (s.name === "Vortex") {
        warnings.push("Vortex requires PowerMill Vortex license module");
      }
      if (s.viewmill_supported && input.enable_viewmill) {
        warnings.push("ViewMill simulation enabled — verify toolpath before first cut");
      }
      if (material_group === "S" && s.category === "roughing") {
        warnings.push("Superalloy: reduce ae to lower end of range; verify temperature management");
      }

      const confidence = this._confidence(s, input, warnings.length);

      return {
        rank: idx + 1,
        strategy_name: s.name,
        pm_operation_type: s.pm_operation,
        category: s.category,
        description: s.description,
        ae_factor: s.ae_factor,
        ap_factor: s.ap_factor,
        cutting_mode: s.cutting_mode,
        speed_multiplier: s.speed_mult,
        axis_requirement: s.axis_req,
        collision_avoidance: s.collision_avoidance,
        viewmill_supported: s.viewmill_supported,
        confidence,
        warnings,
      };
    });
  }

  /**
   * Get default cutting parameters for a named PowerMill strategy.
   * Case-insensitive match by strategy name.
   */
  getParameters(strategy_name: string): PMStrategyParameters | { error: string } {
    const key = strategy_name.toLowerCase().trim();
    const entry = PM_STRATEGIES.find(
      (s) => s.name.toLowerCase() === key || s.pm_operation.toLowerCase().includes(key),
    );

    if (!entry) {
      const available = PM_STRATEGIES.map((s) => s.name).join(", ");
      return {
        error: `Strategy '${strategy_name}' not found. Available: ${available}`,
      };
    }

    return {
      strategy_name: entry.name,
      ae_pct_of_diameter: entry.ae_pct,
      ap_pct_of_diameter: entry.ap_pct,
      fz_range_mm: entry.fz_range,
      vc_range_m_min: entry.vc_range,
      coolant: entry.coolant,
      cutting_mode: entry.cutting_mode,
      engagement_constant: entry.engagement_constant,
      lead_angle_deg: entry.lead_deg,
      tilt_angle_deg: entry.tilt_deg,
      notes: entry.notes,
    };
  }

  /**
   * Return Vortex roughing technology details including parameters, benefits,
   * applications, and limitations.
   */
  vortexDetails(): PMVortexDetails {
    return {
      technology: "PowerMill Vortex Roughing",
      description:
        "Vortex is Autodesk PowerMill's proprietary high-speed roughing technology. " +
        "It maintains a constant tool engagement angle throughout the entire toolpath, " +
        "including corners and tight geometries. When the engagement would increase " +
        "(e.g. inside corners), the tool repositions via a trochoidal arc to avoid " +
        "the excess material before re-entering. This keeps chip load, heat, and " +
        "cutting force constant, enabling significantly higher feed rates and full-depth " +
        "axial cuts compared to conventional offset roughing.",
      engagement_angle_deg: 30,
      ae_range_pct: [8, 12],
      speed_multiplier: 2.0,
      benefits: [
        "Constant tool load eliminates shock loading in corners",
        "2× or greater feed rate vs conventional offset roughing",
        "Full-depth axial cuts (ap up to 1.5×D) reduce number of Z levels",
        "Reduced heat generation extends tool life, especially in titanium and Inconel",
        "Lower cutting forces enable use of long-reach tools in deep cavities",
        "ViewMill simulation verifies engagement before first cut",
      ],
      ideal_applications: [
        "Aerospace structural parts — titanium wing spars and bulkheads",
        "Mold & die roughing in P20 and H13 tool steel",
        "Deep pocket roughing in aluminum where chatter limits conventional strategy",
        "Nickel superalloy (Inconel 718, Waspaloy) roughing where thermal management is critical",
        "Large-part machining where tool life economics are paramount",
      ],
      limitations: [
        "Requires PowerMill Vortex license (additional cost)",
        "Not suitable for very small features where trochoidal arcs cannot fit",
        "Toolpath planning time is longer than offset roughing",
        "Less effective on very shallow pockets (ap < 0.5×D)",
        "Tool must be rated for full-depth engagement — check manufacturer specs",
      ],
      parameters: [
        {
          name: "Engagement Angle",
          description: "Maximum contact arc angle between tool and material (degrees). Vortex holds this constant.",
          typical_value: "30°",
        },
        {
          name: "Radial Stepover (ae)",
          description: "Lateral stepover as percentage of tool diameter. Kept small to maintain constant engagement.",
          typical_value: "8–12% D",
        },
        {
          name: "Axial Depth (ap)",
          description: "Depth of cut per Z level. Vortex enables full-flute engagement.",
          typical_value: "100–150% D",
        },
        {
          name: "Arc Radius",
          description: "Radius of trochoidal repositioning arc when engagement would exceed limit.",
          typical_value: "Auto-calculated by PowerMill based on ae and geometry",
        },
        {
          name: "Minimum Arc Radius",
          description: "Smallest trochoidal arc allowed before algorithm falls back to conventional move.",
          typical_value: "50% of tool radius",
        },
      ],
    };
  }

  /**
   * Return Steep & Shallow finishing technology details.
   */
  steepShallowDetails(): PMSteepShallowDetails {
    return {
      technology: "PowerMill Steep and Shallow Finishing",
      description:
        "Steep and Shallow is PowerMill's integrated finishing strategy that " +
        "automatically divides the part surface into steep and shallow regions " +
        "based on a configurable angle threshold. Steep regions (above threshold) " +
        "receive Constant-Z waterline passes for optimal surface finish on near-vertical " +
        "walls. Shallow regions (below threshold) receive raster or 3D offset passes " +
        "for optimal finish on near-horizontal areas. PowerMill automatically manages " +
        "the boundary between regions and blends toolpath transitions, eliminating " +
        "the need for the programmer to manually define boundary curves.",
      steep_threshold_deg: 30,
      steep_strategy: "Constant-Z (waterline) — horizontal Z-level passes",
      shallow_strategy: "Raster or 3D Offset — parallel or constant-stepover passes",
      transition_handling:
        "PowerMill generates a smooth overlap zone at the boundary. " +
        "Both strategies extend slightly past the threshold angle and are " +
        "trimmed to avoid double-cutting while ensuring no uncovered regions.",
      benefits: [
        "Single strategy covers entire part — no manual boundary curves required",
        "Optimal finishing method applied to each surface region automatically",
        "Smooth transition between steep and shallow areas eliminates witness marks",
        "Configurable threshold angle (typically 30–45°) suits different part families",
        "Works with all finishing tool types (ball nose, radius, taper ball)",
        "Compatible with ViewMill simulation for full toolpath verification",
      ],
      parameters: [
        {
          name: "Steep/Shallow Angle Threshold",
          description: "Angle above which regions are classified as steep and receive Constant-Z passes.",
          typical_value: "30° (range: 20–60°)",
        },
        {
          name: "Steep Stepdown",
          description: "Z-level spacing for the Constant-Z passes in steep regions.",
          typical_value: "0.1–0.2 mm for mold finishing",
        },
        {
          name: "Shallow Stepover",
          description: "Lateral stepover for raster/3D offset passes in shallow regions.",
          typical_value: "0.1–0.3 mm for mold finishing",
        },
        {
          name: "Overlap",
          description: "Distance both strategies extend past the threshold boundary to avoid gaps.",
          typical_value: "Equal to one stepover or stepdown",
        },
        {
          name: "Raster Angle",
          description: "Angle of raster passes in shallow regions (degrees from X-axis).",
          typical_value: "45° or aligned to dominant surface slope",
        },
      ],
    };
  }

  /**
   * List all available PowerMill strategies, optionally filtered by category.
   */
  listStrategies(category?: PMStrategyCategory): Array<{
    name: string;
    category: PMStrategyCategory;
    pm_operation: string;
    suitable_features: PMFeatureType[];
    axis_requirement: string;
    speed_multiplier: number;
    engagement_constant: boolean;
    collision_avoidance: boolean;
  }> {
    const entries = category
      ? PM_STRATEGIES.filter((s) => s.category === category)
      : PM_STRATEGIES;

    return entries.map((s) => ({
      name: s.name,
      category: s.category,
      pm_operation: s.pm_operation,
      suitable_features: s.suitable_features,
      axis_requirement: s.axis_req,
      speed_multiplier: s.speed_mult,
      engagement_constant: s.engagement_constant,
      collision_avoidance: s.collision_avoidance,
    }));
  }

  /** Engine stats. */
  stats(): { calculations: number; lastInput: PMRecommendInput | null } {
    return { calculations: this.calcCount, lastInput: this.lastInput };
  }

  /** Reset counters. */
  clear(): void {
    this.calcCount = 0;
    this.lastInput = null;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private _materialWarnings(material_group?: PMMaterialGroup): string[] {
    const w: string[] = [];
    switch (material_group) {
      case "S":
        w.push("Superalloy (ISO S): use minimum ae, through-tool coolant, monitor tool wear every 10 minutes");
        break;
      case "H":
        w.push("Hardened steel (ISO H): use small ap/ae, high Vc with CBN or fine-grain carbide, dry or MQL");
        break;
      case "M":
        w.push("Stainless steel (ISO M): climb milling only, through-tool coolant, watch work-hardening on re-cuts");
        break;
      case "K":
        w.push("Cast iron (ISO K): dry machining acceptable with coated carbide; use air blast for chip evacuation");
        break;
      case "N":
        w.push("Non-ferrous (ISO N): high Vc and fz acceptable; sharp uncoated or DLC-coated tools preferred for aluminum");
        break;
      default:
        break;
    }
    return w;
  }

  private _confidence(
    entry: StrategyEntry,
    input: PMRecommendInput,
    warningCount: number,
  ): number {
    let conf = 0.85;
    // Boost when priority matches
    if (entry.priority_boost.includes(input.priority ?? "balanced")) conf += 0.07;
    // Penalise warnings
    conf -= warningCount * 0.04;
    // Boost for exact feature match
    if (entry.suitable_features.includes(input.feature_type)) conf += 0.05;
    return Math.max(0.30, Math.min(0.97, conf));
  }
}

/** Singleton instance — import this in dispatchers and indexes. */
export const powerMillStrategyEngine = new PowerMillStrategyEngine();
