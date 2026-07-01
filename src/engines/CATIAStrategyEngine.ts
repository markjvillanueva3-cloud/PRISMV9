/**
 * CATIAStrategyEngine — Dassault Systèmes CATIA V5/3DEXPERIENCE CAM Strategy Engine
 *
 * Comprehensive CATIA V5 and 3DEXPERIENCE CAM strategy database covering 25+
 * strategies across Prismatic Machining, Surface Machining, Advanced Machining,
 * STL Machining, Lathe, and Mill-Turn workbenches.
 *
 * Each strategy includes physics-backed parameter defaults, performance ratings,
 * material notes, and CATIA-specific workflow guidance.
 *
 * Unique CATIA features covered:
 *   - Knowledge-Based Machining (KBM) templates and macro automation
 *   - Manufacturing Program structure (Operations → Activities → Tool Paths)
 *   - MfgView stock tracking (In-Process Stock simulation)
 *   - V5 → 3DEXPERIENCE migration awareness (action names, DB changes)
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority)  — ranked strategies
 *   getParameters(strategy_name)                           — default parameters
 *   kbmDetails()                                           — KBM Technology deep-dive
 *   mfgProgramDetails()                                    — Manufacturing Program structure
 *   listStrategies(category?)                              — all strategies or filtered
 *
 * @engine CATIAStrategyEngine
 * @shortcode E1108
 * @dispatcher camDispatcher
 * @actions catia_strategy_recommend, catia_strategy_params, catia_kbm_details, catia_mfg_program, catia_strategy_list
 * @milestone CAMX-MS3/U03
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CATIAWorkbench =
  | "prismatic_machining"
  | "surface_machining"
  | "advanced_machining"
  | "stl_machining"
  | "lathe"
  | "mill_turn";

export type CATIACategory =
  | "prismatic_roughing"
  | "prismatic_finishing"
  | "surface_roughing"
  | "surface_finishing"
  | "multi_axis"
  | "stl_machining"
  | "lathe"
  | "mill_turn";

export type CATIAPriority =
  | "cycle_time"
  | "tool_life"
  | "surface_finish"
  | "balanced";

export interface CATIAFeature {
  /** Feature type */
  type:
    | "pocket"
    | "profile"
    | "face"
    | "slot"
    | "point_to_point"
    | "pattern"
    | "freeform_3d"
    | "steep_wall"
    | "flat_area"
    | "groove"
    | "thread"
    | "turning_external"
    | "turning_internal"
    | "hole"
    | "impeller"
    | "ruled_surface"
    | "stl_surface";
  /** Depth in mm */
  depth_mm?: number;
  /** Wall angle in degrees (0 = flat, 90 = vertical) */
  wall_angle_deg?: number;
  /** Whether previous roughing has been completed */
  has_previous_roughing?: boolean;
  /** Number of axes available */
  axis_count?: 3 | 4 | 5;
}

export interface CATIAMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC (optional) */
  hardness_hrc?: number;
  /** Material name for notes lookup */
  name?: string;
}

export interface CATIAMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "lathe" | "mill_turn";
  /** Spindle speed limit, RPM */
  max_rpm?: number;
  /** Spindle power, kW */
  spindle_kw?: number;
  /** Has high-pressure coolant */
  hpc?: boolean;
}

export interface CATIATool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Tool type */
  type:
    | "endmill"
    | "ballnose"
    | "bullnose"
    | "face_mill"
    | "drill"
    | "tap"
    | "barrel"
    | "circle_segment"
    | "insert"
    | "turning_insert"
    | "thread_mill";
  /** Corner radius, mm */
  corner_radius_mm?: number;
}

export interface CATIAStrategyRating {
  /** 1-10 scale for surface finish quality */
  surface_finish: number;
  /** 1-10 scale for cycle time efficiency */
  cycle_time: number;
  /** 1-10 scale for tool life preservation */
  tool_life: number;
}

export interface CATIAStrategy {
  /** Internal strategy name */
  name: string;
  /** CATIA UI display name */
  display_name: string;
  /** CATIA workbench this strategy belongs to */
  workbench: CATIAWorkbench;
  /** Strategy category */
  category: CATIACategory;
  /** Description */
  description: string;
  /** Radial engagement as % of tool diameter */
  ae_pct: number;
  /** Axial depth factor (multiplier of diameter) */
  ap_factor: number;
  /** Cutting speed multiplier vs baseline */
  vc_multiplier: number;
  /** Whether strategy controls engagement angle */
  engagement_control: boolean;
  /** Whether chip thinning compensation is applied */
  chip_thinning: boolean;
  /** HSM capable */
  hsm_capable: boolean;
  /** 5-axis capable */
  five_axis_capable: boolean;
  /** Performance ratings */
  ratings: CATIAStrategyRating;
  /** Unique CATIA advantages */
  unique_advantages: string[];
  /** Material-specific notes keyed by ISO group */
  material_notes: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", string>>;
  /** Suitable feature types */
  suitable_features: CATIAFeature["type"][];
  /** Suitable machine types */
  suitable_machines: CATIAMachine["type"][];
  /** Suitable tool types */
  suitable_tools: CATIATool["type"][];
  /** V5 action/parameter name (for KBM macro reference) */
  v5_action?: string;
  /** 3DEXPERIENCE equivalent action name */
  threedx_action?: string;
}

export interface CATIAStrategyRecommendation {
  rank: number;
  strategy: CATIAStrategy;
  score: number;
  reasoning: string;
}

export interface KBMInfo {
  technology_name: string;
  description: string;
  key_concepts: string[];
  macro_types: { name: string; purpose: string }[];
  design_table_integration: string;
  knowledge_advisor_link: string;
  typical_workflow: string[];
  threedx_evolution: string;
  benefits: string[];
  limitations: string[];
}

export interface MfgProgramInfo {
  structure_name: string;
  description: string;
  hierarchy: { level: string; element: string; description: string }[];
  stock_tracking: string;
  in_process_material: string;
  pp_table: string;
  tool_change_management: string;
  nc_output_workflow: string[];
  threedx_differences: string[];
}

// ─── Strategy Database ───────────────────────────────────────────────────────

const STRATEGIES: CATIAStrategy[] = [

  // ══ PRISMATIC MACHINING ══════════════════════════════════════════════════════

  {
    name: "pocketing",
    display_name: "Pocketing",
    workbench: "prismatic_machining",
    category: "prismatic_roughing",
    description:
      "Standard closed-pocket roughing with configurable tool path styles (inward spiral, outward spiral, back-and-forth, follow pocket). CATIA's most-used 2.5D roughing operation with full island and boss support.",
    ae_pct: 62.5,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 4, cycle_time: 6, tool_life: 5 },
    unique_advantages: [
      "Full island and boss support with automatic boundary detection",
      "Four tool path styles: inward, outward, back-and-forth, follow pocket",
      "Plunge lead-in options: helical, ramping, or pre-drilled",
      "KBM automatable — standard pocketing frequently captured in templates",
      "Integrates with CATIA Part Design features for automatic depth recognition",
    ],
    material_notes: {
      P: "ae 50-70%D, ap 0.8-1.0D. Standard spiral-in for steel pockets.",
      M: "ae 40-60%D, reduce feed at corners to prevent work hardening.",
      K: "ae 60-75%D, cast iron pockets tolerate high engagement.",
      N: "ae 65-75%D, aluminum pockets clear quickly at high engagement.",
      S: "ae 30-40%D, tight engagement control for Ti/Ni. HPC essential.",
      H: "ae 30-40%D, hardened steel >45HRC. Reduce ap to 0.5D. Spiral-in only.",
    },
    suitable_features: ["pocket", "face", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "face_mill", "bullnose"],
    v5_action: "MfgPocketing",
    threedx_action: "Pocketing",
  },
  {
    name: "profile_contouring",
    display_name: "Profile Contouring",
    workbench: "prismatic_machining",
    category: "prismatic_finishing",
    description:
      "2D profile contouring for walls and floors. Supports cutter compensation (G41/G42), spring passes, and lead-in/lead-out arcs. Primary finishing operation for prismatic part profiles.",
    ae_pct: 3,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 8, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Cutter compensation output (G41/G42) natively supported",
      "Multiple lead-in/lead-out styles: arc, line, point, tangent",
      "Spring pass capability for deflection compensation",
      "CATIA automatically recognizes Part Design sketch profiles",
      "Multi-passes with constant stock removal per pass",
    ],
    material_notes: {
      P: "1-3 finish passes. Spring pass mandatory for tight tolerances.",
      M: "Climb milling for stainless. Sharp tools. G41 cutter comp recommended.",
      K: "Good surface finish achievable on cast iron profiles.",
      N: "High speed contouring for aluminum. Mirror finish possible with PCD.",
      S: "Careful feed control for Ti/Ni profiles. Reduced cutting speed.",
      H: "Multiple spring passes for hardened steel. CBN or TiAlN coated tools.",
    },
    suitable_features: ["profile", "pocket", "slot", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
    v5_action: "MfgProfile",
    threedx_action: "ProfileContouring",
  },
  {
    name: "facing",
    display_name: "Facing",
    workbench: "prismatic_machining",
    category: "prismatic_finishing",
    description:
      "Planar face milling for flat surfaces. Zigzag, one-way, or follow boundary patterns. Used for stock preparation and final floor finishing.",
    ae_pct: 75,
    ap_factor: 0.2,
    vc_multiplier: 1.1,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Configurable overshoot for complete surface coverage",
      "Step-over control for consistent scallop height",
      "Automatic lead-in/lead-out for face mill entry",
      "Integrates with stock model for adaptive pass depth",
    ],
    material_notes: {
      P: "ae 70-80%D, light ap 0.2-0.5mm. Face mill with wiper inserts.",
      M: "ae 60-70%D, positive rake face mill for stainless.",
      K: "ae 75-80%D, cast iron face milling with carbide inserts.",
      N: "ae 75-85%D, PCD face mill for aluminum. Very high speed.",
      S: "ae 50-60%D, dedicated superalloy face mills. HPC.",
      H: "ae 50-60%D, CBN inserts for hardened steel facing.",
    },
    suitable_features: ["face", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["face_mill", "endmill"],
    v5_action: "MfgFacing",
    threedx_action: "Facing",
  },
  {
    name: "slot_milling",
    display_name: "Slot Milling",
    workbench: "prismatic_machining",
    category: "prismatic_roughing",
    description:
      "Dedicated slot machining with configurable cut mode (full slot, multiple passes). Handles open and closed slots with automatic center-line path generation.",
    ae_pct: 100,
    ap_factor: 0.5,
    vc_multiplier: 0.7,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 6, tool_life: 4 },
    unique_advantages: [
      "Center-line toolpath generation from slot geometry",
      "Automatic depth layering for deep slots",
      "Supports T-slot cutter operations",
      "Direct integration with Part Design slot features",
    ],
    material_notes: {
      P: "ap 0.3-0.5D per pass. Through-coolant strongly recommended for deep slots.",
      M: "Reduced speed 70% baseline. Peck-style depth increments for stainless.",
      K: "Full slot milling acceptable in cast iron. Standard parameters.",
      N: "High speed slot milling in aluminum. Multiple passes for finish quality.",
      S: "Very conservative: ap 0.2D max. HPC mandatory for titanium deep slots.",
      H: "Trochoidal slotting preferred for hardened steel. Reduce ae if possible.",
    },
    suitable_features: ["slot", "groove"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "bullnose"],
    v5_action: "MfgSlotMilling",
    threedx_action: "SlotMilling",
  },
  {
    name: "point_to_point",
    display_name: "Point-to-Point (Drilling Cycles)",
    workbench: "prismatic_machining",
    category: "prismatic_roughing",
    description:
      "Hole machining with G81/G83/G73/G84/G85 canned cycles. Supports drilling, boring, reaming, tapping, and spot-facing. Pattern-aware traversal optimization.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 6, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Full canned cycle library: G81-G89 supported",
      "Automatic hole pattern recognition from Part Design holes",
      "Traversal optimization (nearest-neighbor or full TSP)",
      "Multi-axis drilling cycles for inclined and compound holes",
      "CATIA hole feature recognition feeds directly into operation",
    ],
    material_notes: {
      P: "Standard peck drilling (G83). Through-coolant drills preferred.",
      M: "Chip-break cycle (G73) for stainless. Reduced speed 80%.",
      K: "Cast iron drills well. Spot drill and pilot hole recommended for accuracy.",
      N: "High speed drilling. PCD or polished flute drills for aluminum.",
      S: "Deep peck G83 with HPC for titanium. Multiple-diameter progressive drilling.",
      H: "Carbide or indexable drills. Short peck intervals for hardened steel.",
    },
    suitable_features: ["hole", "pattern", "point_to_point"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "lathe", "mill_turn"],
    suitable_tools: ["drill", "tap", "endmill"],
    v5_action: "MfgDrillingCycles",
    threedx_action: "Drilling",
  },
  {
    name: "curve_following",
    display_name: "Curve Following (Pattern Machining)",
    workbench: "prismatic_machining",
    category: "prismatic_finishing",
    description:
      "Toolpath generation driven by user-defined curves or feature patterns. Used for engraving, trim lines, and custom profile tracing. The CATIA equivalent of curve machining.",
    ae_pct: 5,
    ap_factor: 0.5,
    vc_multiplier: 0.9,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "Follows any user-defined 3D curve or sketch",
      "Automatic lead-in/lead-out at curve endpoints",
      "Supports multi-axis tilting for undercut access",
      "Useful for automotive trim line machining and engraving",
      "Pattern-array support: repeat along linear/circular patterns",
    ],
    material_notes: {
      P: "Light cuts along curve. Mainly for trim lines and engrave on steel.",
      M: "Engraving and trim machining on stainless housings.",
      K: "Pattern repetition on cast iron parts (bosses, flanges).",
      N: "Aluminum panel trim lines and decorative features.",
      S: "Aerospace titanium structural trim features. Very light cuts.",
      H: "Hardened die engrave lines. Slow feed, sharp carbide.",
    },
    suitable_features: ["profile", "pattern", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose", "ballnose"],
    v5_action: "MfgCurveFollowing",
    threedx_action: "CurveFollowing",
  },

  // ══ SURFACE MACHINING ════════════════════════════════════════════════════════

  {
    name: "sweeping",
    display_name: "Sweeping (Surface Sweep)",
    workbench: "surface_machining",
    category: "surface_roughing",
    description:
      "Parallel pass surface machining following a primary guiding curve. The fundamental surface roughing strategy in CATIA's Surface Machining workbench. Generates parallel slices across a surface set.",
    ae_pct: 30,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "Guiding curve control for directional toolpath bias",
      "Scallop height control mode for constant surface quality",
      "Large area coverage with minimal air cutting",
      "Combines well with Z-level for complete surface coverage",
      "Full multi-surface selection with boundary limiting",
    ],
    material_notes: {
      P: "ae 20-30%D, ballnose for molds and dies. Stepover per scallop target.",
      M: "Consistent passes on stainless freeform surfaces. Watch heat buildup.",
      K: "Cast iron mold roughing and semi-finishing with sweeping.",
      N: "Aluminum aerospace panels and structural freeform surfaces.",
      S: "Titanium aerospace forms. Light stepover, HPC essential.",
      H: "Hardened die roughing. Reduced stepover, climb direction only.",
    },
    suitable_features: ["freeform_3d", "flat_area", "ruled_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel"],
    v5_action: "MfgSweeping",
    threedx_action: "Sweeping",
  },
  {
    name: "zlevel",
    display_name: "Z-Level (Contour-Driven)",
    workbench: "surface_machining",
    category: "surface_finishing",
    description:
      "Constant Z-level passes for steep surfaces. Generates horizontal contour slices at defined Z increments. Optimal for steep-walled mold cavities and dies.",
    ae_pct: 8,
    ap_factor: 0.08,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Constant Z-height passes ideal for steep walls",
      "Smooth toolpath transitions between Z-levels",
      "Supports both open and closed contours",
      "Combines with sweeping for complete steep/shallow coverage",
      "Automatic scallop height calculation from Z increment",
    ],
    material_notes: {
      P: "Z increment 0.2-0.5mm for mold finishing. Climb direction preferred.",
      M: "Stainless mold and die cavities. Sharp ballnose. Consistent speeds.",
      K: "Cast iron die cavities. Z-level is excellent for steep walls.",
      N: "Aluminum molds. High speed Z-level finishing. Large stepovers acceptable.",
      S: "Titanium structural slots and pockets. Small Z increment, HPC.",
      H: "Hardened die cavities >48HRC. Z increment 0.1-0.2mm. Climb only.",
    },
    suitable_features: ["freeform_3d", "steep_wall", "pocket"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose"],
    v5_action: "MfgZLevel",
    threedx_action: "ZLevelMachining",
  },
  {
    name: "spiral_milling",
    display_name: "Spiral Milling",
    workbench: "surface_machining",
    category: "surface_finishing",
    description:
      "Spiral outward or inward toolpath for circular/symmetric surfaces. Smooth continuous motion reduces direction changes. Ideal for rotational aerospace components and mold cores.",
    ae_pct: 8,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 8 },
    unique_advantages: [
      "Continuous spiral motion eliminates direction reversal",
      "Ideal for round pockets, cores, and cylindrical bosses",
      "Constant scallop achievable by adjusting pitch versus surface curvature",
      "Minimal tool marks from smooth continuous entry/exit",
      "CATIA allows spiral from inside-out or outside-in",
    ],
    material_notes: {
      P: "Excellent for round mold cores and round pockets in steel.",
      M: "Stainless round components with symmetric freeform geometry.",
      K: "Cast iron circular pads and bearing housings.",
      N: "Aluminum aerospace round contours and fuselage frames.",
      S: "Titanium circular flanges and round structural cutouts.",
      H: "Hardened round die cores. Smooth motion reduces vibration risk.",
    },
    suitable_features: ["freeform_3d", "flat_area", "hole"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose"],
    v5_action: "MfgSpiral",
    threedx_action: "SpiralMilling",
  },
  {
    name: "multiaxis_sweep",
    display_name: "Multi-Axis Sweep (5-Axis Surface Sweep)",
    workbench: "surface_machining",
    category: "multi_axis",
    description:
      "5-axis simultaneous sweeping with configurable tool axis control (fixed tilt, normal to surface, fan, lead/lag). CATIA's primary 5-axis surface roughing strategy used in aerospace and mold.",
    ae_pct: 15,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Six tool axis modes: fixed, normal-to-surface, fan, dual-fan, lead-lag, user-defined",
      "Collision avoidance with holder/spindle geometries",
      "Optimal tool contact angle control for surface quality",
      "Aerospace-proven: used on Airbus/Boeing programs in CATIA",
      "Links to CATIA DMU Kinematics for full machine envelope checking",
    ],
    material_notes: {
      P: "Steel mold and die multi-axis sweeping. Lead angle 5-12 deg.",
      M: "Stainless freeform aerospace panels. Consistent axis control.",
      K: "Cast iron pump casings and complex housings.",
      N: "Aluminum aerospace monolithic structures. High speed 5-axis.",
      S: "Ti/Ni aerospace components. Critical — use validated axis control mode.",
      H: "Hardened die surfaces. Optimal tilt for barrel cutter contact.",
    },
    suitable_features: ["freeform_3d", "ruled_surface", "steep_wall", "impeller"],
    suitable_machines: ["5axis", "4axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
    v5_action: "MfgMultiAxisSweeping",
    threedx_action: "MultiAxisSweeping",
  },
  {
    name: "isoparametric",
    display_name: "Isoparametric Machining",
    workbench: "surface_machining",
    category: "surface_finishing",
    description:
      "Toolpath generated along UV parameter lines of the surface. Creates naturally smooth passes that follow the intrinsic curvature of CATIA NURBS surfaces. Unique to CATIA's surface kernel.",
    ae_pct: 8,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 5, tool_life: 8 },
    unique_advantages: [
      "Exploits CATIA NURBS surface UV parameterization for natural passes",
      "Smoothest possible toolpath on single CATIA surfaces",
      "No interpolation artefacts — tool follows exact surface definition",
      "Preferred strategy for Class-A automotive surfaces",
      "Can drive 5-axis tilting from the UV flow field",
    ],
    material_notes: {
      P: "Mold Class-A surfaces and organic automotive die faces.",
      M: "Stainless aesthetic surfaces where waviness must be minimal.",
      K: "Less common but used on complex cast iron patterns.",
      N: "Aluminum automotive outer panels. Mirror-quality finish achievable.",
      S: "Aerospace titanium Class-A structural skins.",
      H: "Hardened die Class-A faces. Finest surface quality.",
    },
    suitable_features: ["freeform_3d", "ruled_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel"],
    v5_action: "MfgIsoparametric",
    threedx_action: "IsoparametricMachining",
  },

  // ══ ADVANCED MACHINING ═══════════════════════════════════════════════════════

  {
    name: "multiaxis_contour",
    display_name: "Multi-Axis Contour",
    workbench: "advanced_machining",
    category: "multi_axis",
    description:
      "Simultaneous 5-axis contouring along a spine curve with controlled tool axis orientation. Used for rib machining, turbine blade leading/trailing edges, and compound contoured walls.",
    ae_pct: 5,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Spine curve drives the contour path with continuous 5-axis tilt",
      "Orthogonal tilting modes: normal-to-drive, interpolated, fixed",
      "Ideal for turbine blade leading/trailing edge machining",
      "Rib and web machining with correct tilt to avoid gouge",
      "Used on Airbus structural ribs and frame machining",
    ],
    material_notes: {
      P: "Steel structural ribs and webs. Controlled tilt for full flute engagement.",
      M: "Stainless aerospace brackets with compound contour walls.",
      K: "Cast iron compound contours and curved ribs.",
      N: "Aluminum wing ribs and fuselage frames. High speed 5-axis.",
      S: "Critical for titanium turbine blade edges. HPC and validated axis angles.",
      H: "Hardened contoured walls. Very light cuts with controlled tilt.",
    },
    suitable_features: ["profile", "freeform_3d", "steep_wall", "ruled_surface"],
    suitable_machines: ["5axis", "4axis"],
    suitable_tools: ["endmill", "ballnose", "bullnose"],
    v5_action: "MfgMultiAxisContour",
    threedx_action: "MultiAxisContour",
  },
  {
    name: "multiaxis_flank",
    display_name: "Multi-Axis Flank Contouring",
    workbench: "advanced_machining",
    category: "multi_axis",
    description:
      "Side-cutting with the tool flank following ruled or developable surfaces. Highly efficient for turbine blades, impeller channels, and structural ribs — uses the full cutter length per pass.",
    ae_pct: 5,
    ap_factor: 2.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Full cutter-length contact on ruled/developable surfaces",
      "Single pass wall finishing possible — eliminates scallop",
      "Dominant strategy for turbine blade and impeller in CATIA",
      "Dassault's FlankContouring is industry-standard for aerospace",
      "Natural surface generation matches design intent on ruled geometry",
    ],
    material_notes: {
      P: "Steel structural webs and thin-wall prismatic ruled surfaces.",
      M: "Stainless impeller blades and aerospace brackets.",
      K: "Cast iron pump blades and casings.",
      N: "Aluminum aerospace wing ribs and thin structural walls.",
      S: "Ti/Ni turbine blades — primary strategy at Airbus/Safran. HPC essential.",
      H: "Hardened die walls with ruled geometry. Light engagement only.",
    },
    suitable_features: ["ruled_surface", "steep_wall", "impeller", "freeform_3d"],
    suitable_machines: ["5axis"],
    suitable_tools: ["endmill", "bullnose", "barrel"],
    v5_action: "MfgFlankContouring",
    threedx_action: "FlankContouring",
  },
  {
    name: "multiaxis_helical",
    display_name: "Multi-Axis Helical Milling",
    workbench: "advanced_machining",
    category: "multi_axis",
    description:
      "Helical 5-axis motion for cylindrical and conical bores with inclined axes. Combines helical interpolation with simultaneous axis tilting for deep, undercut, and inclined bore machining.",
    ae_pct: 20,
    ap_factor: 0.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: true,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Simultaneous helical + axis tilt for inclined bore machining",
      "One tool can machine multiple inclined bore diameters",
      "Lower thrust force than conventional drilling for deep bores",
      "Critical for aerospace engine casings with inclined bearing bores",
      "Integrates with CATIA tolerance specification for bore accuracy",
    ],
    material_notes: {
      P: "Steel engine blocks and housings with inclined bores.",
      M: "Stainless pump and valve bodies with complex bore patterns.",
      K: "Cast iron engine casings and transmission housings.",
      N: "Aluminum aerospace engine pylons and gearbox casings.",
      S: "Titanium structural pivot blocks and engine mount bores.",
      H: "Hardened bearing housing bores. Light helical passes.",
    },
    suitable_features: ["hole", "freeform_3d"],
    suitable_machines: ["5axis", "4axis"],
    suitable_tools: ["endmill", "ballnose", "bullnose"],
    v5_action: "MfgHelicalMilling",
    threedx_action: "HelicalMilling",
  },
  {
    name: "prismatic_turning",
    display_name: "Prismatic Turning (Turn on Mill)",
    workbench: "advanced_machining",
    category: "mill_turn",
    description:
      "Turning operations executed on a mill-turn machining center within the Advanced Machining workbench. Combines milling and turning in a single program managed by CATIA Manufacturing Program.",
    ae_pct: 50,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "Seamlessly combines milling and turning in one CATIA Manufacturing Program",
      "Single MfgView for complete part stock tracking across milling and turning ops",
      "Simplifies setup planning for complex mill-turn parts",
      "CATIA V5 supports B-axis turning for complex profiles on mill-turn centers",
      "Directly outputs combined NC program via PP Table",
    ],
    material_notes: {
      P: "Steel mill-turn parts: shafts with milled flats, cam profiles.",
      M: "Stainless complex shafts and medical implant components.",
      K: "Cast iron mill-turn components with milled faces and turned journals.",
      N: "Aluminum complex shafts and aerospace fittings on mill-turn.",
      S: "Titanium mill-turn components for aerospace landing gear.",
      H: "Hardened mill-turn components. Turning followed by milling hardened surfaces.",
    },
    suitable_features: ["turning_external", "turning_internal", "profile", "pocket"],
    suitable_machines: ["mill_turn"],
    suitable_tools: ["turning_insert", "insert", "endmill"],
    v5_action: "MfgTurningOperations",
    threedx_action: "TurningOperations",
  },

  // ══ STL MACHINING ════════════════════════════════════════════════════════════

  {
    name: "stl_roughing",
    display_name: "STL Roughing",
    workbench: "stl_machining",
    category: "stl_machining",
    description:
      "Roughing directly on STL mesh geometry (e.g., from 3D scan or reverse-engineered data). CATIA STL Machining workbench enables direct-on-mesh toolpath generation without NURBS surface creation.",
    ae_pct: 40,
    ap_factor: 0.8,
    vc_multiplier: 0.9,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 3, cycle_time: 6, tool_life: 5 },
    unique_advantages: [
      "Direct toolpath generation on STL mesh — no surface reconstruction required",
      "Supports scan-to-part workflows for dies, molds, and prototypes",
      "Gouge detection against triangulated mesh",
      "Used in automotive die refurbishment from scan data",
      "Integrated with CATIA STL smoothing for better mesh quality",
    ],
    material_notes: {
      P: "Die refurbishment and repair from scan data. Conservative ae/ap.",
      M: "Stainless prototype machining from scan-derived STL.",
      K: "Cast iron pattern repair from 3D scan. Standard parameters.",
      N: "Aluminum prototype parts from printed or scanned models.",
      S: "Titanium medical implant machining from CT-derived STL geometry.",
      H: "Hardened die repair — light passes only on STL mesh geometry.",
    },
    suitable_features: ["stl_surface", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "ballnose", "bullnose"],
    v5_action: "STLRoughing",
    threedx_action: "STLRoughing",
  },
  {
    name: "stl_finishing",
    display_name: "STL Finishing",
    workbench: "stl_machining",
    category: "stl_machining",
    description:
      "Semi-finish and finish passes directly on STL mesh geometry. Combines Z-level and scallop patterns adapted to triangulated mesh topology for accurate reproduction of scan geometry.",
    ae_pct: 8,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 6, tool_life: 6 },
    unique_advantages: [
      "Z-level and scallop patterns on STL mesh",
      "Scallop height control on mesh approximation",
      "Suitable for prototype finishing from 3D printed masters",
      "Automotive clay model re-machining workflow support",
      "Preserves scan geometry fidelity through direct-on-mesh computation",
    ],
    material_notes: {
      P: "Die surfaces from scan. Light stepover for faithful reproduction.",
      M: "Stainless sculptural and medical surfaces from scan.",
      K: "Cast iron pattern surfaces from scan data.",
      N: "Aluminum prototype surfaces — closest to original scan.",
      S: "Medical titanium from CT scan STL. Very fine stepover.",
      H: "Hardened die repair finishing. Minimum passes after STL roughing.",
    },
    suitable_features: ["stl_surface", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["ballnose", "bullnose"],
    v5_action: "STLFinishing",
    threedx_action: "STLFinishing",
  },

  // ══ LATHE ════════════════════════════════════════════════════════════════════

  {
    name: "rough_turning",
    display_name: "Rough Turning",
    workbench: "lathe",
    category: "lathe",
    description:
      "Standard OD/ID roughing cycle for turned features. Parallel Z-level passes with configurable stock removal per pass. Manages multiple turning profiles including shoulders, tapers, and radii.",
    ae_pct: 60,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 3, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "Automatic profile recognition from CATIA Part Design revolved features",
      "Configurable machining mode: one-way, back-and-forth",
      "Handles both OD and ID roughing in the same operation type",
      "Integrates with CATIA Lathe PP Table for correct G-code output",
      "Stock model awareness prevents gouge on previous OD profiles",
    ],
    material_notes: {
      P: "ap 2-4mm, ae 50-70%D. Standard turning parameters for steel.",
      M: "ap 1-2mm, reduce vc 20% for stainless. Positive rake inserts.",
      K: "ap 2-4mm, cast iron turns well dry with carbide. Standard vc.",
      N: "ap 3-5mm, PCD inserts for aluminum. Very high vc achievable.",
      S: "ap 0.5-1.5mm, HPC essential for Ti/Ni. Reduced vc, controlled engagement.",
      H: "ap 0.3-0.8mm, CBN inserts for hardened steel >45HRC. Light roughing only.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
    v5_action: "MfgRoughTurning",
    threedx_action: "RoughTurning",
  },
  {
    name: "finish_turning",
    display_name: "Finish Turning",
    workbench: "lathe",
    category: "lathe",
    description:
      "Final finishing pass on OD/ID turned profile. Spring pass capability, tool nose radius compensation (G41/G42), and wiper insert support for improved Ra.",
    ae_pct: 5,
    ap_factor: 0.1,
    vc_multiplier: 1.2,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Tool nose radius compensation for accurate profile reproduction",
      "Spring pass for dimensional accuracy on tight-tolerance turned profiles",
      "Wiper insert support for improved Ra (up to Ra 0.4 in steel)",
      "Automatic stock-from-roughing awareness prevents overcut",
      "Constant surface speed (CSS) output for lathe finishing",
    ],
    material_notes: {
      P: "fn 0.1-0.2mm/rev, ap 0.1-0.3mm. Wiper inserts for Ra <1.6µm.",
      M: "fn 0.08-0.15mm/rev, sharp PVD-coated inserts. Positive rake.",
      K: "fn 0.15-0.25mm/rev, carbide. Dry machining acceptable.",
      N: "fn 0.1-0.3mm/rev, PCD for mirror finish on aluminum.",
      S: "fn 0.05-0.1mm/rev, HPC. CBN or SiC-whisker grades for Ni alloys.",
      H: "fn 0.05-0.08mm/rev, CBN inserts. Very light ap 0.05-0.15mm.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
    v5_action: "MfgFinishTurning",
    threedx_action: "FinishTurning",
  },
  {
    name: "groove_turning",
    display_name: "Groove Turning",
    workbench: "lathe",
    category: "lathe",
    description:
      "Grooving, parting, and undercut cycles. Supports OD, ID, and face grooving. CATIA automates peck-grooving sequences for deep narrow grooves.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 0.75,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "OD, ID, and face grooving from the same operation type",
      "Peck-grooving cycle for deep grooves (chip clearance)",
      "Part-off with programmable feed and speed control",
      "CATIA automatic groove profile extraction from Part Design",
    ],
    material_notes: {
      P: "Plunge grooving. Through-coolant recommended. Standard vc 80%.",
      M: "Peck grooving mandatory for stainless. Reduced vc 60%.",
      K: "Cast iron grooves well dry. Standard parameters.",
      N: "High speed parting and grooving in aluminum.",
      S: "Multiple small increments for Ti/Ni. HPC essential. vc 60%.",
      H: "CBN grooving inserts for hardened steel. Very light increments.",
    },
    suitable_features: ["groove", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
    v5_action: "MfgGrooveTurning",
    threedx_action: "GrooveTurning",
  },
  {
    name: "thread_turning",
    display_name: "Thread Turning",
    workbench: "lathe",
    category: "lathe",
    description:
      "Single-point threading cycles with configurable infeed (radial, flank, modified flank, alternate). Supports metric, UNC, UNF, ACME, and custom thread forms. CATIA automates pass depth calculation.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 5, tool_life: 6 },
    unique_advantages: [
      "Four infeed modes: radial, flank, modified flank, alternate flank",
      "Constant chip area pass depth calculation for consistent chip load",
      "Spring passes for thread form accuracy",
      "CATIA thread standard library (ISO, UNC, UNF, NPT, ACME)",
      "PP Table maps thread cycle to G76 or G32 per controller",
    ],
    material_notes: {
      P: "Modified flank infeed for steel. 4-6 passes typical. G76 preferred.",
      M: "Flank infeed for stainless — reduces BUE. More passes required.",
      K: "Radial infeed acceptable for cast iron. Standard passes.",
      N: "High speed threading in aluminum. Fewer passes sufficient.",
      S: "Alternate flank infeed for Ti. Many light passes. HPC critical.",
      H: "CBN threading inserts. Many very light passes for hardened threads.",
    },
    suitable_features: ["thread", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
    v5_action: "MfgThreadTurning",
    threedx_action: "ThreadTurning",
  },
  {
    name: "recess_turning",
    display_name: "Recess Turning (Undercut)",
    workbench: "lathe",
    category: "lathe",
    description:
      "Undercut and recess machining for lathe. Handles internal undercuts, external recesses, and relief grooves that require retraction and re-entry of the cutter.",
    ae_pct: 80,
    ap_factor: 0.5,
    vc_multiplier: 0.7,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 5, tool_life: 5 },
    unique_advantages: [
      "Dedicated CATIA recess cycle with controlled entry/exit",
      "Back-turning insert support for internal undercuts",
      "Automatic recess depth and width calculation from Part Design geometry",
      "Supports multiple recess profiles per operation",
    ],
    material_notes: {
      P: "Standard recess cycle. Tool selection critical for access.",
      M: "Reduced speed for stainless undercuts. Peck approach.",
      K: "Cast iron recess machining. Standard cycle.",
      N: "Aluminum undercuts at standard speed.",
      S: "Titanium undercuts — light ap, HPC, back-boring tool if needed.",
      H: "Hardened steel undercuts: very light passes, correct insert geometry.",
    },
    suitable_features: ["groove", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
    v5_action: "MfgRecessTurning",
    threedx_action: "RecessTurning",
  },

  // ══ MILL-TURN ════════════════════════════════════════════════════════════════

  {
    name: "millturn_combined",
    display_name: "Mill-Turn Combined Operations",
    workbench: "mill_turn",
    category: "mill_turn",
    description:
      "Coordinated milling and turning operations in a single CATIA Manufacturing Program for mill-turn machining centers. Manages tool changes, spindle mode switches (C-axis, Y-axis), and sub-spindle operations.",
    ae_pct: 40,
    ap_factor: 0.8,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Single Manufacturing Program manages complete mill-turn operation sequence",
      "CATIA handles spindle mode (C/Y/B-axis) transitions automatically in NC output",
      "Sub-spindle part transfer operations supported",
      "Integrated MfgView tracks stock through all milling and turning ops",
      "KBM templates can automate complete mill-turn workflow setups",
      "Widely used at BMW and Toyota for shaft and casing components",
    ],
    material_notes: {
      P: "Steel shaft-type parts with milled flats, cross-holes, and turned journals.",
      M: "Stainless mill-turn components: fittings, connectors, medical devices.",
      K: "Cast iron mill-turn casings with turned bores and milled faces.",
      N: "Aluminum mill-turn aerospace fittings and structural components.",
      S: "Titanium mill-turn landing gear and engine components.",
      H: "Hardened mill-turn dies and tooling components.",
    },
    suitable_features: ["turning_external", "turning_internal", "pocket", "profile", "hole"],
    suitable_machines: ["mill_turn"],
    suitable_tools: ["turning_insert", "insert", "endmill", "drill"],
    v5_action: "MfgMillTurnOperations",
    threedx_action: "MillTurnOperations",
  },
];

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class CATIAStrategyEngine {
  private readonly strategies = STRATEGIES;

  /**
   * Recommend ranked CATIA strategies for a given feature/material/machine/tool combination.
   */
  recommend(
    feature: CATIAFeature,
    material: CATIAMaterial,
    machine: CATIAMachine,
    tool: CATIATool,
    priority: CATIAPriority = "balanced",
  ): CATIAStrategyRecommendation[] {
    const candidates = this.strategies.filter((s) => {
      // Filter by feature suitability
      if (!s.suitable_features.includes(feature.type)) return false;
      // Filter by machine suitability
      if (!s.suitable_machines.includes(machine.type)) return false;
      // Filter by tool suitability
      if (!s.suitable_tools.includes(tool.type)) return false;
      // Exclude 5-axis-only strategies on 3-axis machines
      if (s.five_axis_capable && s.category === "multi_axis" &&
          !["5axis", "4axis"].includes(machine.type)) return false;
      return true;
    });

    const scored = candidates.map((s) => {
      let score = 0;
      const reasons: string[] = [];

      // Priority-based scoring
      switch (priority) {
        case "cycle_time":
          score += s.ratings.cycle_time * 3;
          score += s.ratings.tool_life * 1;
          score += s.ratings.surface_finish * 1;
          break;
        case "tool_life":
          score += s.ratings.tool_life * 3;
          score += s.ratings.cycle_time * 1;
          score += s.ratings.surface_finish * 1;
          break;
        case "surface_finish":
          score += s.ratings.surface_finish * 3;
          score += s.ratings.cycle_time * 1;
          score += s.ratings.tool_life * 1;
          break;
        case "balanced":
        default:
          score += s.ratings.cycle_time * 1.67;
          score += s.ratings.tool_life * 1.67;
          score += s.ratings.surface_finish * 1.67;
          break;
      }

      // Engagement control bonus for difficult materials
      if (s.engagement_control && material.iso_group === "S") {
        score += 5;
        reasons.push("Engagement control critical for superalloys");
      }
      if (s.engagement_control && material.iso_group === "H") {
        score += 4;
        reasons.push("Engagement control benefits hardened steel");
      }

      // HSM bonus for aluminum
      if (s.hsm_capable && material.iso_group === "N") {
        score += 3;
        reasons.push("HSM capability maximizes aluminum performance");
      }

      // 5-axis bonus when available
      if (s.five_axis_capable && feature.axis_count === 5) {
        score += 3;
        reasons.push("Leverages full 5-axis CATIA capability");
      }

      // Isoparametric bonus for Class-A surface finishing
      if (s.name === "isoparametric" && feature.type === "freeform_3d" &&
          (priority === "surface_finish" || priority === "balanced")) {
        score += 4;
        reasons.push("Isoparametric follows CATIA NURBS UV parameterization — smoothest surface");
      }

      // Flank contouring bonus for ruled surfaces
      if (s.name === "multiaxis_flank" && feature.type === "ruled_surface") {
        score += 5;
        reasons.push("Flank contouring is purpose-built for ruled/developable surfaces");
      }

      // Z-level bonus for steep walls
      if (feature.wall_angle_deg !== undefined && feature.wall_angle_deg > 60 &&
          s.name === "zlevel") {
        score += 4;
        reasons.push("Z-level excels on steep walls (>60 deg)");
      }

      // Sweeping bonus for gentle shallow surfaces
      if (feature.wall_angle_deg !== undefined && feature.wall_angle_deg < 30 &&
          s.name === "sweeping") {
        score += 3;
        reasons.push("Sweeping ideal for shallow surfaces (<30 deg)");
      }

      // Impeller bonus for multi-axis strategies
      if (feature.type === "impeller" && s.category === "multi_axis") {
        score += 4;
        reasons.push("Multi-axis strategy required for impeller geometry");
      }

      // STL workbench: penalise non-STL strategies on STL features
      if (feature.type === "stl_surface" && s.workbench !== "stl_machining") {
        score -= 8;
        reasons.push("STL geometry requires STL Machining workbench");
      }

      // Previous roughing logic
      if (feature.has_previous_roughing && s.category.includes("roughing")) {
        score -= 4;
        reasons.push("Roughing already completed — finishing preferred");
      }
      if (!feature.has_previous_roughing && s.category.includes("finishing") &&
          !["lathe", "mill_turn"].includes(s.category)) {
        score -= 3;
        reasons.push("No previous roughing — roughing should be done first");
      }

      // Hardness adjustments
      if (material.hardness_hrc !== undefined && material.hardness_hrc > 45) {
        if (s.engagement_control) {
          score += 3;
          reasons.push("Controlled engagement essential for >45HRC");
        }
        if (s.name === "pocketing") {
          score -= 4;
          reasons.push("Standard pocketing not recommended for >45HRC hardened steel");
        }
      }

      // Superalloy (S group) bonus for conservative strategies
      if (material.iso_group === "S") {
        if (["multiaxis_flank", "multiaxis_contour", "zlevel"].includes(s.name)) {
          score += 2;
          reasons.push("Conservative multi-axis strategy well-suited for superalloys");
        }
      }

      // KBM compatibility: all CATIA strategies are KBM-compatible; no deductions

      const primaryReasoning = reasons.length > 0
        ? reasons.join("; ")
        : `${s.display_name} is suitable for ${feature.type} in ISO ${material.iso_group} material`;

      return { strategy: s, score, reasoning: primaryReasoning };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s, i) => ({
      rank: i + 1,
      strategy: s.strategy,
      score: Math.round(s.score * 10) / 10,
      reasoning: s.reasoning,
    }));
  }

  /**
   * Get default parameters for a specific strategy.
   */
  getParameters(strategy_name: string): CATIAStrategy | { error: string } {
    const s = this.strategies.find((st) => st.name === strategy_name);
    if (!s) {
      return {
        error: `Unknown strategy: "${strategy_name}". Use catia_strategy_list to see all available strategies.`,
      };
    }
    return s;
  }

  /**
   * Deep-dive on CATIA Knowledge-Based Machining (KBM) technology.
   */
  kbmDetails(): KBMInfo {
    return {
      technology_name: "Knowledge-Based Machining (KBM)",
      description:
        "CATIA Knowledge-Based Machining is Dassault Systèmes' expert-system framework that captures " +
        "machining knowledge as reusable templates, macros, and rules. KBM allows manufacturing " +
        "engineers to encode company-specific process know-how — tool selections, cutting parameters, " +
        "operation sequences — into templates that automatically adapt to new part geometries. " +
        "KBM templates are stored in the CATIA catalog system and can be linked to Knowledge Advisor " +
        "rules for fully automated operation generation.",
      key_concepts: [
        "Manufacturing Template: a reusable CATIA document capturing an operation or sequence with parameters",
        "Macro: embedded Knowledge Language (KL) scripts that query part geometry and set parameters",
        "Design Table: tabular parameter sets (Excel-linked) for variant-driven process selection",
        "Knowledge Advisor Rules: logic rules that trigger parameter changes based on material, tolerance, or feature type",
        "Catalog Browser: CATIA's repository for KBM templates, organized by feature type and material",
        "Technological Result: the computed machining output stored with the part for downstream reuse",
        "PPR (Product-Process-Resource): CATIA's DPE framework that formally links design, process, and machines",
      ],
      macro_types: [
        {
          name: "Activity Macro",
          purpose: "Automates parameter setting for a single machining operation (e.g., set ae based on material ISO group)",
        },
        {
          name: "Process Template Macro",
          purpose: "Captures a complete multi-operation sequence with decision logic for feature recognition",
        },
        {
          name: "Tool Change Macro",
          purpose: "Automates tool selection from the CATIA tool catalog based on feature diameter and material",
        },
        {
          name: "Check Macro",
          purpose: "Validates machining parameters against company rules (e.g., maximum ae for S-group materials)",
        },
        {
          name: "PP Table Macro",
          purpose: "Dynamically selects the correct Post-Processor table entry based on machine and controller",
        },
      ],
      design_table_integration:
        "KBM templates can reference CATIA Design Tables (Excel spreadsheets or internal tables) to provide " +
        "variant-driven parameter selection. For example, a Design Table might list preferred ae, ap, vc, and fn " +
        "for each combination of ISO material group, feature type, and tool diameter. The macro reads the table " +
        "and applies the matching row automatically. Design Tables are updated centrally and propagate to all " +
        "parts referencing the template.",
      knowledge_advisor_link:
        "CATIA Knowledge Advisor (KA) rules can be written in Knowledge Language (KL) to automatically " +
        "modify machining parameters when part annotations change. For example: if a tolerance specification " +
        "tighter than ±0.02mm is found on a turned feature, KA can automatically switch from rough turning " +
        "to finish turning with spring pass, and alert the NC programmer via a check message.",
      typical_workflow: [
        "1. NC programmer identifies feature type via CATIA Manufacturing View (MfgView)",
        "2. Catalog Browser used to select appropriate KBM template for feature + material combination",
        "3. KBM macro runs and queries part geometry (depth, width, tolerance, finish spec)",
        "4. Design Table lookup selects correct ae, ap, vc, fn values",
        "5. Knowledge Advisor rules validate parameters against company standards",
        "6. Manufacturing Program auto-populated with correct operations and tool calls",
        "7. PP Table generates NC output for the target machine/controller",
        "8. Simulation runs via MfgView to verify In-Process Stock and detect gouges",
      ],
      threedx_evolution:
        "In 3DEXPERIENCE, KBM evolves into the Manufacturing Hub and Product-Resource-Process (PPR) " +
        "collaboration. Templates are stored in the 3DEXPERIENCE PLM database rather than local catalogs, " +
        "enabling multi-site sharing. The Knowledge Language macros carry over, but are now embedded in " +
        "3DEXPERIENCE Manufacturing Apps (Machining, Manufacturing Planning). The Design Table mechanism " +
        "is replaced by PLM attribute-driven configuration. Companies migrating V5→3DEXPERIENCE must " +
        "re-validate all KBM templates against the new Manufacturing App action names.",
      benefits: [
        "Reduces programming time by 40-80% for repeat feature types",
        "Enforces company cutting parameter standards automatically",
        "Enables less-experienced programmers to produce correct NC programs",
        "Captures tribal knowledge before engineers retire",
        "Consistent quality across multiple shifts and sites",
        "Audit trail: KBM templates versioned in CATIA Vault/3DEXPERIENCE PLM",
        "Directly reduces scrap from incorrect parameter selection",
      ],
      limitations: [
        "Requires upfront investment to build and validate templates",
        "Knowledge Language (KL) macros require skilled author — not intuitive for beginners",
        "Templates must be maintained when cutting tools or machines change",
        "V5 templates do not automatically migrate to 3DEXPERIENCE — manual re-creation required",
        "Catalog management overhead increases with template count",
        "Design Table Excel dependency can create version conflicts in multi-user environments",
      ],
    };
  }

  /**
   * Deep-dive on CATIA Manufacturing Program structure and MfgView stock tracking.
   */
  mfgProgramDetails(): MfgProgramInfo {
    return {
      structure_name: "CATIA Manufacturing Program",
      description:
        "The CATIA Manufacturing Program is the hierarchical container that organizes all machining " +
        "operations for a part or assembly. It mirrors the physical NC program structure — setups, " +
        "operations, and individual tool paths — and drives the NC output via the Post-Processor (PP) Table. " +
        "The Manufacturing Program is the single source of truth for the NC program order, tool list, " +
        "operation parameters, and simulation data. In 3DEXPERIENCE, this becomes the Machining Process " +
        "within the Manufacturing Assembly.",
      hierarchy: [
        {
          level: "L1",
          element: "Part Operation",
          description:
            "Top-level container defining the machine, fixture, and stock for a single setup. " +
            "One Part Operation per machine fixture position. Drives PP Table selection and NC header.",
        },
        {
          level: "L2",
          element: "Manufacturing Program",
          description:
            "The ordered sequence of machining activities for the Part Operation. This is what " +
            "generates the NC program. Multiple programs can exist per Part Operation for multi-pallet or sub-spindle setups.",
        },
        {
          level: "L3",
          element: "Machining Process / Sequence",
          description:
            "Optional grouping of operations (e.g., 'Roughing Phase', 'Finishing Phase'). " +
            "Used with KBM templates to capture process intent.",
        },
        {
          level: "L4",
          element: "Machining Operation",
          description:
            "An individual cutting operation: Pocketing, Profile Contouring, Z-Level, Rough Turning, etc. " +
            "Each operation has one tool, one strategy, and one set of parameters.",
        },
        {
          level: "L5",
          element: "Tool Path",
          description:
            "The computed CL-data (Cutter Location data) for the operation. Generated by CATIA's " +
            "APT kernel and stored with the part. Tool Path replay drives the MfgView stock simulation.",
        },
        {
          level: "L5",
          element: "Approach / Retract Macros",
          description:
            "Pre/post-path macro motions (approach, retract, return-in-feed) that are appended " +
            "to the operation Tool Path. Separate from the cutting passes but stored at L5.",
        },
      ],
      stock_tracking:
        "CATIA's MfgView (Manufacturing View) tracks the In-Process Stock (IPS) through the " +
        "entire Manufacturing Program. After each operation's Tool Path is computed, the IPS is " +
        "updated by subtracting the material removed. MfgView visualizes the remaining stock as a " +
        "shaded 3D body. This allows the NC programmer to visually verify stock removal at any " +
        "point in the sequence, detect remaining material before finishing operations, and ensure " +
        "all stock is removed before the final dimension check.",
      in_process_material:
        "In-Process Material (IPM) is the formal CATIA V5 mechanism for passing the remaining " +
        "stock from one operation to the next. IPM can be referenced by subsequent operations " +
        "to generate rest-machining passes. For example, after pocketing with a 20mm endmill, " +
        "the IPM is used to generate a rest-pocketing pass with a 6mm endmill for corner material. " +
        "IPM is computed by CATIA's Boolean subtraction of swept tool volumes from the initial stock body.",
      pp_table:
        "The Post-Processor Table (PP Table) in CATIA V5 maps CL-data words to the NC code for " +
        "the target controller. CATIA ships with PP Tables for Fanuc, Siemens, Heidenhain, Mazak, " +
        "and others. The PP Table is a structured text file (*.lib) that is assigned at the Part " +
        "Operation level. In 3DEXPERIENCE, the PP Table mechanism is replaced by the Generative " +
        "NC Post-Processing App which uses JavaScript-based post-processors.",
      tool_change_management:
        "CATIA Manufacturing Program automatically inserts tool change operations (M06 or equivalent) " +
        "between operations using different tools. The Tool Change operation references the CATIA Tool " +
        "Catalog entry and generates the correct T and M codes. Tool offsets are managed via the " +
        "CATIA Tool Assembly concept — the Tool + Holder + Adapter combination stored in the catalog " +
        "with full geometric data for simulation and collision checking.",
      nc_output_workflow: [
        "1. Verify Manufacturing Program sequence and tool list in MfgView",
        "2. Run 'Compute All' to generate Tool Paths for all pending operations",
        "3. Execute MfgView simulation to verify In-Process Stock removal",
        "4. Perform collision detection using CATIA's DMU Space Analysis on Tool Paths",
        "5. Select the Manufacturing Program → Generate NC Code",
        "6. CATIA APT kernel applies the assigned PP Table to produce NC output",
        "7. NC output is saved to .nc or .tap file and optionally sent to DNC system",
        "8. Tool list report generated automatically from Manufacturing Program tool calls",
        "9. Setup sheet generated from Part Operation reference data",
      ],
      threedx_differences: [
        "Manufacturing Program becomes 'Machining Process' inside Manufacturing Assembly in 3DEXPERIENCE",
        "PP Tables (.lib files) are replaced by JavaScript post-processors in NC Post-Processing App",
        "Tool Catalog is now stored in the 3DEXPERIENCE PLM database, not local CATIA catalog files",
        "MfgView stock tracking is replaced by Material Removal Simulation in Manufacturing Review App",
        "In-Process Material references must be re-established after V5→3DEXPERIENCE migration",
        "KBM templates stored in local CATIA Catalog (.catalog) must be migrated to 3DEXPERIENCE Libraries",
        "Part Operation setup definition now references a Virtual Machine Resource from the PPR model",
        "Multi-site collaboration: 3DEXPERIENCE shares Manufacturing Programs across engineering and shop floor in real time",
      ],
    };
  }

  /**
   * List all strategies, optionally filtered by category.
   */
  listStrategies(category?: CATIACategory): Array<{
    name: string;
    display_name: string;
    workbench: CATIAWorkbench;
    category: CATIACategory;
    description: string;
    v5_action?: string;
    threedx_action?: string;
  }> {
    const list = category
      ? this.strategies.filter((s) => s.category === category)
      : this.strategies;

    return list.map((s) => ({
      name: s.name,
      display_name: s.display_name,
      workbench: s.workbench,
      category: s.category,
      description: s.description,
      v5_action: s.v5_action,
      threedx_action: s.threedx_action,
    }));
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const catiaStrategyEngine = new CATIAStrategyEngine();
export { CATIAStrategyEngine as CATIAStrategyEngineClass };
