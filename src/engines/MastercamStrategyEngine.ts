/**
 * MastercamStrategyEngine — Dedicated Mastercam Strategy Recommendation Engine
 *
 * Comprehensive Mastercam 2024/2025 toolpath strategy database covering 30+
 * strategies across roughing, finishing, drilling, turning, and multi-axis.
 * Each strategy includes physics-backed parameter defaults, performance
 * ratings, material notes, and unique advantages.
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority)  — ranked strategies
 *   getParameters(strategy_name)                           — default parameters
 *   dynamicMotionDetails()                                 — Dynamic Motion Technology deep-dive
 *   optiRoughDetails()                                     — OptiRough deep-dive
 *   profitTurningDetails()                                 — ProfitTurning deep-dive
 *   listStrategies(category?)                              — all strategies or filtered by category
 *
 * @engine MastercamStrategyEngine
 * @shortcode E1102
 * @dispatcher camDispatcher
 * @actions mastercam_strategy_recommend, mastercam_strategy_params, mastercam_strategy_dynamic_motion, mastercam_strategy_optirough, mastercam_strategy_profit_turning, mastercam_strategy_list
 * @milestone CAMX-MS3/U01
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MastercamCategory =
  | "roughing"
  | "finishing"
  | "drilling"
  | "turning"
  | "multi_axis";

export type MastercamPriority =
  | "cycle_time"
  | "tool_life"
  | "surface_finish"
  | "balanced";

export interface MastercamFeature {
  /** Feature type */
  type: "pocket" | "contour" | "slot" | "face" | "bore" | "freeform_3d" | "steep_wall" | "flat_area" | "groove" | "thread" | "turning_external" | "turning_internal" | "hole" | "impeller" | "ruled_surface";
  /** Depth in mm */
  depth_mm?: number;
  /** Wall angle in degrees (0 = flat, 90 = vertical) */
  wall_angle_deg?: number;
  /** Whether previous roughing has been done */
  has_previous_roughing?: boolean;
  /** Number of axes available */
  axis_count?: 3 | 4 | 5;
}

export interface MastercamMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC (optional, influences strategy selection) */
  hardness_hrc?: number;
  /** Material name for notes lookup */
  name?: string;
}

export interface MastercamMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "lathe" | "mill_turn";
  /** Spindle speed limit, RPM */
  max_rpm?: number;
  /** Spindle power, kW */
  spindle_kw?: number;
  /** Has high-pressure coolant */
  hpc?: boolean;
}

export interface MastercamTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Tool type */
  type: "endmill" | "ballnose" | "bullnose" | "face_mill" | "drill" | "tap" | "barrel" | "circle_segment" | "insert" | "turning_insert";
  /** Corner radius, mm */
  corner_radius_mm?: number;
}

export interface StrategyRating {
  /** 1-10 scale for surface finish quality */
  surface_finish: number;
  /** 1-10 scale for cycle time efficiency */
  cycle_time: number;
  /** 1-10 scale for tool life preservation */
  tool_life: number;
}

export interface MastercamStrategy {
  /** Strategy name */
  name: string;
  /** Display name for UI */
  display_name: string;
  /** Category */
  category: MastercamCategory;
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
  ratings: StrategyRating;
  /** Unique advantages */
  unique_advantages: string[];
  /** Material-specific notes keyed by ISO group */
  material_notes: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", string>>;
  /** Suitable feature types */
  suitable_features: MastercamFeature["type"][];
  /** Suitable machine types */
  suitable_machines: MastercamMachine["type"][];
  /** Suitable tool types */
  suitable_tools: MastercamTool["type"][];
}

export interface StrategyRecommendation {
  rank: number;
  strategy: MastercamStrategy;
  score: number;
  reasoning: string;
}

export interface DynamicMotionInfo {
  technology_name: string;
  description: string;
  key_principles: string[];
  engagement_control: string;
  retract_method: string;
  corner_treatment: string;
  speed_multiplier: string;
  supported_strategies: string[];
  benefits: string[];
  limitations: string[];
}

export interface OptiRoughInfo {
  technology_name: string;
  description: string;
  key_features: string[];
  stock_awareness: string;
  rest_machining: string;
  toolpath_type: string;
  benefits: string[];
  best_for: string[];
}

export interface ProfitTurningInfo {
  technology_name: string;
  description: string;
  key_features: string[];
  chip_load_control: string;
  engagement_angle: string;
  tool_life_improvement: string;
  benefits: string[];
  comparison_to_imachining: string;
}

// ─── Strategy Database ───────────────────────────────────────────────────────

const STRATEGIES: MastercamStrategy[] = [
  // ── ROUGHING ──────────────────────────────────────────────────────────────
  {
    name: "dynamic_mill",
    display_name: "Dynamic Mill",
    category: "roughing",
    description: "Constant tool engagement roughing with micro-lift retract and smooth corner transitions. Mastercam's flagship HSM roughing strategy using Dynamic Motion Technology.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 2.0,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "Constant radial engagement maintains consistent chip load",
      "Micro-lift retract prevents full-slot conditions",
      "Smooth corner transitions reduce shock loading",
      "Allows 2x normal cutting speed with extended tool life",
      "Dynamic Motion Technology avoids burying the tool",
    ],
    material_notes: {
      P: "ae 8-12%D, full flute depth, speed factor 2.0x. Excellent in carbon/alloy steels.",
      M: "ae 8-10%D, reduce speed factor to 1.6x for austenitic stainless. Watch BUE.",
      K: "ae 10-15%D, cast iron responds very well to dynamic milling. Dry cutting OK.",
      N: "ae 12-15%D, speed factor up to 2.5x in aluminum. Use polished flutes.",
      S: "ae 5-8%D, speed factor 1.3x max. HPC recommended for Ti/Ni alloys.",
      H: "ae 5-8%D, speed factor 1.2x. Hardened steels >45HRC. Use AlTiN coating.",
    },
    suitable_features: ["pocket", "contour", "slot", "face", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },
  {
    name: "optirough",
    display_name: "OptiRough",
    category: "roughing",
    description: "3D adaptive roughing with stock model awareness and rest-machining capability. Uses the stock model to generate efficient, gouge-free roughing passes on complex 3D geometry.",
    ae_pct: 15,
    ap_factor: 1.5,
    vc_multiplier: 1.5,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 4, cycle_time: 8, tool_life: 8 },
    unique_advantages: [
      "Stock-aware toolpath avoids air cutting",
      "Automatic rest-machining with smaller tools",
      "3D surface-following roughing",
      "Handles complex multi-surface pockets",
      "Smooth transitions between Z-levels",
    ],
    material_notes: {
      P: "ae 15%D, good for mold/die roughing in P20/H13.",
      M: "ae 12%D, use with through-spindle coolant.",
      K: "ae 15-20%D, excellent for cast iron mold bases.",
      N: "ae 20%D, aggressive parameters OK in aluminum.",
      S: "ae 8-12%D, stock awareness prevents overloading in titanium.",
      H: "ae 8-10%D, ideal for rough-before-hard-milling workflow.",
    },
    suitable_features: ["pocket", "freeform_3d", "contour", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose", "ballnose"],
  },
  {
    name: "area_mill",
    display_name: "Area Mill",
    category: "roughing",
    description: "Traditional pocket roughing with zigzag or spiral patterns. Reliable general-purpose roughing for prismatic parts.",
    ae_pct: 62.5,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 3, cycle_time: 5, tool_life: 4 },
    unique_advantages: [
      "Simple and predictable toolpath",
      "Good for prismatic features with uniform stock",
      "Wide range of cutting pattern options (zigzag, one-way, spiral)",
      "Works well with face mills and large endmills",
    ],
    material_notes: {
      P: "ae 50-75%D, standard speeds. Conventional roughing approach.",
      M: "ae 50-60%D, reduce feed at corners to manage load.",
      K: "ae 60-75%D, cast iron tolerates high engagement.",
      N: "ae 65-75%D, aluminum clears easily at high engagement.",
      S: "ae 40-50%D, reduce engagement for superalloys.",
      H: "Not recommended for hardened steels >45HRC. Use Dynamic Mill instead.",
    },
    suitable_features: ["pocket", "face", "slot", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "face_mill", "bullnose"],
  },
  {
    name: "peel_mill",
    display_name: "Peel Mill",
    category: "roughing",
    description: "Constant engagement peeling strategy with very light radial depth and full axial depth. Trochoidal-style milling for slots and narrow features.",
    ae_pct: 5,
    ap_factor: 3.0,
    vc_multiplier: 2.2,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 7, tool_life: 10 },
    unique_advantages: [
      "Extremely light radial load maximizes tool life",
      "Full flute-length cutting for maximum MRR per pass",
      "Ideal for deep slots and narrow channels",
      "Speed factor 2.2x baseline achievable",
      "Near-zero radial force reduces deflection",
    ],
    material_notes: {
      P: "ae 5%D, full depth. Ideal for deep narrow pockets in steel.",
      M: "ae 4-5%D, excellent for stainless deep slots. Minimal work hardening.",
      K: "ae 5-7%D, good for deep cast iron features.",
      N: "ae 5-8%D, excellent in aluminum with high speeds.",
      S: "ae 3-5%D, best strategy for deep titanium slots. HPC essential.",
      H: "ae 3-5%D, excellent for hardened steel slots. Minimal heat generation.",
    },
    suitable_features: ["slot", "pocket", "groove"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill"],
  },
  {
    name: "dynamic_optirough",
    display_name: "Dynamic OptiRough",
    category: "roughing",
    description: "Combines Dynamic Motion Technology with OptiRough's stock awareness. Best of both worlds: constant engagement on 3D geometry with stock model intelligence.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 1.8,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "Combines constant engagement with stock awareness",
      "No air cutting on complex 3D geometry",
      "Dynamic corner treatment on 3D surfaces",
      "Rest-machining capability with dynamic motion",
      "Highest MRR-to-tool-life ratio for 3D roughing",
    ],
    material_notes: {
      P: "ae 10%D, optimal for complex mold/die roughing.",
      M: "ae 8-10%D, excellent for surgical implant roughing.",
      K: "ae 10-12%D, cast iron mold bases benefit greatly.",
      N: "ae 12-15%D, aerospace aluminum structural parts.",
      S: "ae 6-8%D, best roughing strategy for Ti-6Al-4V aerospace.",
      H: "ae 5-8%D, pre-hardened mold steel roughing.",
    },
    suitable_features: ["pocket", "freeform_3d", "contour", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── FINISHING ─────────────────────────────────────────────────────────────
  {
    name: "scallop",
    display_name: "Scallop",
    category: "finishing",
    description: "Constant scallop height finishing. Adapts stepover based on local surface curvature to maintain uniform surface quality across complex 3D geometry.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Constant scallop height regardless of surface curvature",
      "Adaptive stepover — tighter on steep areas, wider on flats",
      "Best overall strategy for complex 3D surface finishing",
      "Uniform Ra across the entire part",
    ],
    material_notes: {
      P: "Stepover 0.1-0.3mm scallop. Ball nose or bullnose preferred.",
      M: "Use sharp tools to minimize BUE. Coolant recommended.",
      K: "Dry finishing OK. Good surface finish achievable.",
      N: "High speed finishing with polished flutes for mirror finish.",
      S: "Reduced speed, consistent engagement critical. HPC preferred.",
      H: "CBN or ceramic inserts for >55HRC. Small scallop height.",
    },
    suitable_features: ["freeform_3d", "contour", "pocket", "steep_wall", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
  },
  {
    name: "parallel",
    display_name: "Parallel",
    category: "finishing",
    description: "Linear parallel passes at a constant Z level. Simple, predictable finishing for gently curved or planar surfaces.",
    ae_pct: 10,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Simple, predictable toolpath pattern",
      "Good for gentle surfaces and shallow features",
      "Controllable cut direction for surface lay",
      "Fast calculation time",
    ],
    material_notes: {
      P: "Standard finishing parameters. Good general choice.",
      M: "Climb milling preferred to avoid work hardening.",
      K: "Excellent for flat cast iron surfaces.",
      N: "High speed possible. Mirror finish achievable on aluminum.",
      S: "Consistent engagement direction important.",
      H: "Acceptable for gently curved hardened surfaces.",
    },
    suitable_features: ["flat_area", "freeform_3d", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "waterline",
    display_name: "Waterline",
    category: "finishing",
    description: "Z-level contour finishing. Follows horizontal slices of the surface at constant Z increments. Excellent for steep walls.",
    ae_pct: 5,
    ap_factor: 0.1,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Excellent for steep walls (>45 deg)",
      "Constant Z-level gives consistent finish on walls",
      "Natural contour-following motion",
      "Good chip evacuation on vertical surfaces",
    ],
    material_notes: {
      P: "Standard Z-step 0.1-0.3mm. Climb milling on walls.",
      M: "Sharp tools required. Stainless walls benefit from waterline.",
      K: "Excellent for cast iron mold sidewalls.",
      N: "High speed waterline for aluminum mold walls.",
      S: "Reduced Z-step for titanium. HPC on deep walls.",
      H: "Critical for hardened steel mold walls. Small Z-step.",
    },
    suitable_features: ["steep_wall", "contour", "pocket", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "pencil",
    display_name: "Pencil",
    category: "finishing",
    description: "Corner cleanup strategy that traces along surface-to-surface intersections. Removes scallop remnants from concave corners and blends.",
    ae_pct: 3,
    ap_factor: 0.02,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 4, tool_life: 6 },
    unique_advantages: [
      "Targets only corner/fillet areas needing cleanup",
      "Removes scallop remnants from previous finishing passes",
      "Small tool access into tight corners",
      "Reduces need for hand polishing in corners",
    ],
    material_notes: {
      P: "Use small ball nose. Light cuts only.",
      M: "Sharp coated tools. Avoid work hardening corners.",
      K: "Good for cast iron corner cleanup.",
      N: "High speed pencil passes in aluminum.",
      S: "Reduced speed. Critical for aerospace fillet blends.",
      H: "Essential for hardened mold corner cleanup. CBN ball nose.",
    },
    suitable_features: ["freeform_3d", "pocket", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose"],
  },
  {
    name: "blend",
    display_name: "Blend",
    category: "finishing",
    description: "Morphed toolpath between two or more curves. Creates smooth transitions across ruled or blended surfaces.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Smooth morphing between boundary curves",
      "Excellent for ruled and developable surfaces",
      "User-defined toolpath density control",
      "Good for turbine blade and airfoil surfaces",
    ],
    material_notes: {
      P: "Standard finishing. Good for blended mold surfaces.",
      M: "Consistent cut direction across blend for best finish.",
      K: "Good for blended cast iron surfaces.",
      N: "High speed blending for aluminum aerospace surfaces.",
      S: "Critical for Ti/Ni airfoil blending. Careful engagement.",
      H: "Hardened die surfaces. Small stepover.",
    },
    suitable_features: ["freeform_3d", "ruled_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel"],
  },
  {
    name: "equal_scallop",
    display_name: "Equal Scallop",
    category: "finishing",
    description: "Adaptive stepover to maintain a mathematically uniform scallop height across the entire surface. More computationally expensive than Scallop but higher uniformity.",
    ae_pct: 7,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 10, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "Mathematically precise uniform scallop height",
      "Best possible surface uniformity",
      "Reduces polishing time significantly",
      "Ideal for Class-A surfaces and optical molds",
    ],
    material_notes: {
      P: "Premium finish for mold/die. Scallop height 0.005-0.02mm.",
      M: "Mirror-finish capable with correct tool/coolant.",
      K: "Good surface quality on cast iron optical mold inserts.",
      N: "Excellent for aluminum optical reflectors.",
      S: "Medical implant finishing. Biocompatible surface.",
      H: "Hardened mold finishing. CBN for best results.",
    },
    suitable_features: ["freeform_3d", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
  },
  {
    name: "accelerated_finishing",
    display_name: "Accelerated Finishing",
    category: "finishing",
    description: "Leverages barrel cutters and circle-segment tools for dramatically increased stepover while maintaining target scallop height. 3-5x faster than ball nose finishing.",
    ae_pct: 30,
    ap_factor: 0.1,
    vc_multiplier: 1.2,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 10, tool_life: 8 },
    unique_advantages: [
      "3-5x larger stepover vs ball nose at same scallop height",
      "Barrel/circle-segment cutter geometry enables wide effective radius",
      "Dramatically reduced finishing cycle time",
      "Excellent for large, gently curved surfaces",
      "Reduces number of passes by 60-80%",
    ],
    material_notes: {
      P: "Ideal for large mold/die surfaces. Barrel cutter R200+ mm effective.",
      M: "Good for stainless medical devices with large curved surfaces.",
      K: "Excellent for large cast iron surfaces. High MRR finishing.",
      N: "Aerospace aluminum skin panels. Major time savings.",
      S: "Titanium aerospace surfaces. Reduced passes = less heat.",
      H: "Hardened die surfaces. Circle-segment tools with CBN.",
    },
    suitable_features: ["freeform_3d", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "5axis"],
    suitable_tools: ["barrel", "circle_segment", "bullnose"],
  },

  // ── DRILLING ──────────────────────────────────────────────────────────────
  {
    name: "drill",
    display_name: "Drill",
    category: "drilling",
    description: "Standard drilling cycles including peck, chip-break, and deep-hole strategies. Supports G81/G83/G73 canned cycles.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 5, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Full canned cycle support (G81, G83, G73)",
      "Automatic peck depth calculation",
      "Chip-break and deep-hole cycle selection",
      "Multi-hole pattern support with optimized traversal",
    ],
    material_notes: {
      P: "Standard peck drilling. Through-coolant drills preferred.",
      M: "Peck drilling mandatory. Chip-break cycle for stainless.",
      K: "Cast iron drills well. Reduced peck depth.",
      N: "High speed drilling. Polished flute drills for aluminum.",
      S: "Deep peck with HPC mandatory for Ti/Ni. Reduced speed.",
      H: "Carbide drills or indexable for hardened steels. Short peck.",
    },
    suitable_features: ["hole", "bore"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "lathe", "mill_turn"],
    suitable_tools: ["drill"],
  },
  {
    name: "circle_mill",
    display_name: "Circle Mill",
    category: "drilling",
    description: "Helical hole milling for larger holes. Uses endmill in helical interpolation to create holes larger than the tool diameter.",
    ae_pct: 30,
    ap_factor: 0.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: true,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 5, tool_life: 8 },
    unique_advantages: [
      "One tool for multiple hole sizes",
      "Better surface finish than drilling",
      "Lower thrust force than conventional drilling",
      "Adjustable hole size via helical diameter",
      "Excellent for hardened materials where drilling is difficult",
    ],
    material_notes: {
      P: "Tool diameter 60-80% of hole. Helix angle per manufacturer.",
      M: "Good alternative to drilling stainless. Less work hardening.",
      K: "Excellent for cast iron bore finishing.",
      N: "High speed helical milling for aluminum.",
      S: "Preferred over drilling for titanium holes. Lower thrust.",
      H: "Critical for hardened steel holes >40HRC. Carbide endmill.",
    },
    suitable_features: ["hole", "bore"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "mill_turn"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── TURNING ───────────────────────────────────────────────────────────────
  {
    name: "profit_turning",
    display_name: "ProfitTurning",
    category: "turning",
    description: "Constant chip load turning strategy. Mastercam's equivalent to SolidCAM iMachining for lathe. Maintains consistent material removal rate with controlled engagement.",
    ae_pct: 15,
    ap_factor: 1.5,
    vc_multiplier: 1.5,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "Constant chip load maintains optimal cutting conditions",
      "2-3x tool life improvement over conventional roughing",
      "Controlled engagement angle prevents insert chipping",
      "Handles interrupted cuts and complex OD/ID profiles",
      "Automatic chip thickness compensation",
    ],
    material_notes: {
      P: "Excellent for carbon/alloy steel turning. 50-70% cycle time reduction.",
      M: "Outstanding for stainless. Constant chip load prevents work hardening.",
      K: "Good for cast iron. Consistent engagement prevents insert fracture.",
      N: "Fast aluminum turning with extended insert life.",
      S: "Best turning strategy for Ti-6Al-4V. Controlled heat generation.",
      H: "Hardened steel turning with CBN inserts. Controlled engagement.",
    },
    suitable_features: ["turning_external", "turning_internal", "groove"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "dynamic_turning",
    display_name: "Dynamic Turning",
    category: "turning",
    description: "Dynamic Motion Technology applied to lathe operations. Constant engagement angle turning with smooth transitions, similar to Dynamic Mill but for OD/ID profiles.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 1.8,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 10 },
    unique_advantages: [
      "Dynamic Motion Technology for turning",
      "Constant engagement angle control",
      "Smooth non-linear toolpath for complex profiles",
      "Reduced vibration on interrupted cuts",
      "Extended insert life through controlled chip load",
    ],
    material_notes: {
      P: "ae 10% depth, 2x speed. Excellent for steel shaft roughing.",
      M: "ae 8-10%, speed 1.5x. Reduces stainless work hardening.",
      K: "ae 10-12%, good for cast iron rough turning.",
      N: "ae 12-15%, high speed aluminum turning.",
      S: "ae 6-8%, controlled engagement for superalloy turning.",
      H: "ae 5-8%, hardened steel turning. CBN inserts recommended.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },

  // ── MULTI-AXIS ────────────────────────────────────────────────────────────
  {
    name: "multiaxis",
    display_name: "Multiaxis",
    category: "multi_axis",
    description: "4/5-axis simultaneous machining with multiple tool axis control modes (lead/lag, tilt, swarf, curve-relative). Full collision avoidance.",
    ae_pct: 10,
    ap_factor: 0.1,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 8 },
    unique_advantages: [
      "Full 5-axis simultaneous control",
      "Multiple tool axis control modes",
      "Collision avoidance with holder/spindle checking",
      "Optimal tool contact angle for surface quality",
      "Reach undercuts and deep cavities",
    ],
    material_notes: {
      P: "Standard 5-axis parameters. Lead/lag angle 5-15 deg.",
      M: "Consistent tool axis control for stainless parts.",
      K: "Good for complex cast iron components.",
      N: "High speed 5-axis for aluminum aerospace monoliths.",
      S: "Critical for Ti/Ni aerospace components. Controlled tilt.",
      H: "Hardened die finishing with 5-axis. Optimal contact angle.",
    },
    suitable_features: ["freeform_3d", "steep_wall", "impeller", "ruled_surface"],
    suitable_machines: ["5axis", "4axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "endmill", "circle_segment"],
  },
  {
    name: "swarf",
    display_name: "Swarf",
    category: "multi_axis",
    description: "Side-cutting with the tool following ruled surfaces. The tool flank cuts along the surface, using the full cutter length for maximum efficiency.",
    ae_pct: 5,
    ap_factor: 2.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Full flute-length cutting on ruled surfaces",
      "Single pass wall finishing possible",
      "Excellent for turbine blades and thin walls",
      "Natural surface generation from cutter geometry",
      "Minimal scallop on ruled geometry",
    ],
    material_notes: {
      P: "Good for ruled surface finishing in steel molds.",
      M: "Stainless impeller blades. Consistent engagement important.",
      K: "Cast iron pump impellers and housings.",
      N: "Aluminum structural ribs and thin walls.",
      S: "Ti/Ni turbine blades. Critical application. HPC essential.",
      H: "Hardened die walls. Circle-segment tools advantageous.",
    },
    suitable_features: ["ruled_surface", "steep_wall", "impeller"],
    suitable_machines: ["5axis"],
    suitable_tools: ["endmill", "bullnose", "barrel"],
  },
  {
    name: "morph",
    display_name: "Morph",
    category: "multi_axis",
    description: "5-axis morphed toolpath between multiple surfaces or curves. Creates smoothly interpolated passes across complex multi-surface regions.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Smooth morphing between multiple boundary surfaces",
      "Excellent for complex blended geometry",
      "User-controlled pass distribution",
      "Good for impeller channels and turbine passages",
    ],
    material_notes: {
      P: "Complex mold surface finishing with 5-axis morphing.",
      M: "Medical implant surfaces with complex blends.",
      K: "Cast iron pump passages.",
      N: "Aluminum aerospace impeller channels.",
      S: "Ti/Ni turbine passage finishing. Critical path control.",
      H: "Hardened die surfaces with complex blends.",
    },
    suitable_features: ["freeform_3d", "impeller", "ruled_surface"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
  },
  {
    name: "flow",
    display_name: "Flow",
    category: "multi_axis",
    description: "5-axis toolpath following UV flow lines of the surface parameterization. Natural surface-following motion for smooth, continuous passes.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Follows natural UV parameterization of surfaces",
      "Smooth continuous tool motion",
      "Minimal direction changes",
      "Excellent for organic shapes and freeform surfaces",
      "Good surface lay following surface curvature",
    ],
    material_notes: {
      P: "Mold/die freeform finishing with natural flow.",
      M: "Medical implant organic shapes.",
      K: "Cast iron artistic/organic components.",
      N: "Aluminum aerospace organic structures.",
      S: "Ti/Ni implant surfaces. Smooth continuous motion.",
      H: "Hardened die organic surfaces.",
    },
    suitable_features: ["freeform_3d", "impeller"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
  },

  // ── Additional Roughing ───────────────────────────────────────────────────
  {
    name: "dynamic_contour",
    display_name: "Dynamic Contour",
    category: "roughing",
    description: "Dynamic Motion Technology applied to contour/profile roughing. Constant engagement on open profiles and outside contours.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 2.0,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "Dynamic Motion on external profiles",
      "Constant engagement on contour roughing",
      "Smooth transitions around profile corners",
      "Reduced cycle time vs conventional contouring",
    ],
    material_notes: {
      P: "Ideal for steel profile roughing. ae 8-12%D.",
      M: "Stainless external profiles. Reduced work hardening.",
      K: "Cast iron external profiles.",
      N: "Aluminum external profiles at high speed.",
      S: "Titanium structural profiles. Controlled engagement.",
      H: "Hardened steel profiles. Reduced ae to 5-8%D.",
    },
    suitable_features: ["contour", "pocket"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── Additional Finishing ──────────────────────────────────────────────────
  {
    name: "contour_finishing",
    display_name: "Contour Finishing",
    category: "finishing",
    description: "2D profile finishing with spring passes, lead-in/lead-out arcs, and cutter compensation. Final profile pass for dimensional accuracy.",
    ae_pct: 2,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 8, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Final dimensional accuracy on profiles",
      "Spring pass capability for deflection compensation",
      "Lead-in/lead-out arcs prevent witness marks",
      "Cutter compensation (G41/G42) support",
    ],
    material_notes: {
      P: "Standard finishing. Spring pass recommended for tight tolerances.",
      M: "Sharp tools. Climb milling for best finish on stainless.",
      K: "Good surface finish on cast iron profiles.",
      N: "High speed contouring for aluminum. Mirror finish possible.",
      S: "Careful feed control for Ti/Ni profiles.",
      H: "Critical for hardened steel profiles. Multiple spring passes.",
    },
    suitable_features: ["contour", "pocket", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },
  {
    name: "hybrid_finishing",
    display_name: "Hybrid (Waterline+Scallop)",
    category: "finishing",
    description: "Combines waterline passes on steep areas with scallop passes on shallow areas. Automatic transition based on wall angle threshold.",
    ae_pct: 7,
    ap_factor: 0.08,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Best of waterline and scallop combined",
      "Automatic steep/shallow detection",
      "Uniform finish quality across varying wall angles",
      "Single operation replaces two separate finishing passes",
    ],
    material_notes: {
      P: "Ideal for complex molds with mixed steep/shallow regions.",
      M: "Good for medical devices with varying wall angles.",
      K: "Cast iron molds with mixed geometry.",
      N: "Aluminum molds. Reduced finishing operations.",
      S: "Titanium parts with mixed wall angles.",
      H: "Hardened dies with steep and shallow regions.",
    },
    suitable_features: ["freeform_3d", "steep_wall", "flat_area", "pocket"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose"],
  },
  {
    name: "flat_finishing",
    display_name: "Flat Area Finishing",
    category: "finishing",
    description: "Detects and finishes flat areas left by ball nose finishing passes. Uses flat-bottom endmill for true flat surfaces.",
    ae_pct: 50,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Automatically detects flat regions on 3D surfaces",
      "Eliminates ball nose scallop on flat areas",
      "True flat surface with endmill bottom",
      "Complementary to scallop/waterline finishing",
    ],
    material_notes: {
      P: "Essential after ball nose finishing on mold parting surfaces.",
      M: "Good for stainless flat datum surfaces.",
      K: "Cast iron flat lands and parting lines.",
      N: "Aluminum flat areas between contours.",
      S: "Titanium flat datum features.",
      H: "Hardened die flat areas and parting surfaces.",
    },
    suitable_features: ["flat_area", "freeform_3d", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── Additional Turning ────────────────────────────────────────────────────
  {
    name: "rough_turning",
    display_name: "Rough Turning",
    category: "turning",
    description: "Standard roughing cycle for OD/ID profiles. Conventional linear passes with Z-level increments.",
    ae_pct: 50,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 3, cycle_time: 6, tool_life: 5 },
    unique_advantages: [
      "Simple and predictable turning toolpath",
      "Good for uniform stock removal",
      "Wide range of insert grades supported",
      "Standard G-code cycles",
    ],
    material_notes: {
      P: "Standard DOC and feed. General purpose turning.",
      M: "Positive rake inserts for stainless. Reduce DOC.",
      K: "Cast iron turns well. Aggressive parameters OK.",
      N: "High speed aluminum turning. PCD inserts for finish.",
      S: "Reduced speed and DOC for superalloys. HPC essential.",
      H: "CBN inserts for hardened steel. Light DOC.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "finish_turning",
    display_name: "Finish Turning",
    category: "turning",
    description: "Final finishing pass on OD/ID profiles. Single pass at controlled feed for surface finish and dimensional accuracy.",
    ae_pct: 5,
    ap_factor: 0.2,
    vc_multiplier: 1.2,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Precise dimensional control",
      "Controlled surface finish via feed/nose radius",
      "Spring pass capability",
      "Tool nose radius compensation",
    ],
    material_notes: {
      P: "Standard finishing. Wiper insert for improved Ra.",
      M: "Sharp inserts. Positive rake for stainless finish.",
      K: "Good finish achievable on cast iron. Dry cutting OK.",
      N: "PCD inserts for mirror finish on aluminum.",
      S: "Careful feed control for Ti/Ni. HPC for chip control.",
      H: "CBN finishing inserts. Controlled feed for surface quality.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "groove_turning",
    display_name: "Groove Turning",
    category: "turning",
    description: "Grooving and parting operations. Supports plunge grooving, face grooving, and part-off cycles.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "Dedicated grooving cycle support",
      "Peck grooving for deep grooves",
      "Face grooving capability",
      "Part-off with controlled feed",
    ],
    material_notes: {
      P: "Standard grooving parameters. Through-coolant preferred.",
      M: "Reduced speed for stainless grooving. Peck cycle recommended.",
      K: "Cast iron grooves well. Standard parameters.",
      N: "High speed grooving in aluminum.",
      S: "Reduced speed. Peck mandatory for deep grooves in Ti/Ni.",
      H: "CBN grooving inserts for hardened steel.",
    },
    suitable_features: ["groove", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "thread_turning",
    display_name: "Thread Turning",
    category: "turning",
    description: "Single-point threading with multiple infeed strategies (radial, flank, modified flank, alternate flank). Supports metric, UNC, UNF, and custom thread forms.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 6, tool_life: 6 },
    unique_advantages: [
      "Multiple infeed strategies for chip control",
      "Automatic pass depth calculation (constant area)",
      "Spring passes for thread form accuracy",
      "Support for all standard thread forms",
    ],
    material_notes: {
      P: "Modified flank infeed for steel. 4-6 passes typical.",
      M: "Flank infeed for stainless to reduce BUE. More passes.",
      K: "Radial infeed OK for cast iron threads.",
      N: "High speed threading in aluminum. Fewer passes needed.",
      S: "Alternate flank for Ti. Many light passes. HPC critical.",
      H: "CBN inserts. Many very light passes for hardened threads.",
    },
    suitable_features: ["thread", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
];

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class MastercamStrategyEngine {
  private readonly strategies = STRATEGIES;

  /**
   * Recommend ranked strategies for a given feature/material/machine/tool combination.
   */
  recommend(
    feature: MastercamFeature,
    material: MastercamMaterial,
    machine: MastercamMachine,
    tool: MastercamTool,
    priority: MastercamPriority = "balanced",
  ): StrategyRecommendation[] {
    const candidates = this.strategies.filter((s) => {
      // Filter by feature suitability
      if (!s.suitable_features.includes(feature.type)) return false;
      // Filter by machine suitability
      if (!s.suitable_machines.includes(machine.type)) return false;
      // Filter by tool suitability
      if (!s.suitable_tools.includes(tool.type)) return false;
      // Filter by 5-axis requirement
      if (feature.axis_count === 5 && s.category === "multi_axis" && !s.five_axis_capable) return false;
      // Filter out 5-axis strategies for 3-axis machines
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

      // Engagement control bonus for hard materials
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

      // Chip thinning bonus for stainless (reduces work hardening)
      if (s.chip_thinning && material.iso_group === "M") {
        score += 3;
        reasons.push("Chip thinning compensation reduces stainless work hardening");
      }

      // 5-axis bonus when available
      if (s.five_axis_capable && feature.axis_count === 5) {
        score += 2;
        reasons.push("Leverages 5-axis capability");
      }

      // Wall angle bonuses
      if (feature.wall_angle_deg !== undefined) {
        if (feature.wall_angle_deg > 60 && s.name === "waterline") {
          score += 4;
          reasons.push("Waterline excels on steep walls (>60 deg)");
        }
        if (feature.wall_angle_deg < 30 && s.name === "parallel") {
          score += 3;
          reasons.push("Parallel ideal for gentle surfaces (<30 deg)");
        }
        if (feature.wall_angle_deg < 30 && s.name === "accelerated_finishing") {
          score += 4;
          reasons.push("Accelerated finishing best on gentle curved surfaces");
        }
      }

      // Feature-specific bonuses
      if (feature.type === "slot" && s.name === "peel_mill") {
        score += 5;
        reasons.push("Peel Mill is the optimal slot roughing strategy");
      }
      if (feature.type === "freeform_3d" && s.name === "scallop") {
        score += 3;
        reasons.push("Scallop is the default choice for complex 3D finishing");
      }
      if (feature.type === "impeller" && s.category === "multi_axis") {
        score += 4;
        reasons.push("Multi-axis strategy required for impeller geometry");
      }
      if (feature.type === "ruled_surface" && s.name === "swarf") {
        score += 5;
        reasons.push("Swarf cutting is purpose-built for ruled surfaces");
      }

      // Previous roughing check
      if (feature.has_previous_roughing && s.category === "roughing") {
        score -= 5;
        reasons.push("Roughing already completed — finishing preferred");
      }
      if (!feature.has_previous_roughing && s.category === "finishing") {
        score -= 3;
        reasons.push("No previous roughing — roughing should be done first");
      }

      // Hardness-based adjustments
      if (material.hardness_hrc !== undefined && material.hardness_hrc > 45) {
        if (s.engagement_control) {
          score += 3;
          reasons.push("Controlled engagement essential for >45HRC");
        }
        if (s.name === "area_mill") {
          score -= 5;
          reasons.push("Area Mill not recommended for hardened steel >45HRC");
        }
      }

      // Generate primary reasoning
      const primaryReasons = reasons.length > 0
        ? reasons.join("; ")
        : `${s.display_name} is suitable for ${feature.type} in ISO ${material.iso_group} material`;

      return { strategy: s, score, reasoning: primaryReasons };
    });

    // Sort by score descending
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
  getParameters(strategy_name: string): MastercamStrategy | { error: string } {
    const s = this.strategies.find((st) => st.name === strategy_name);
    if (!s) {
      return { error: `Unknown strategy: ${strategy_name}. Use listStrategies() for available names.` };
    }
    return s;
  }

  /**
   * Deep-dive on Dynamic Motion Technology.
   */
  dynamicMotionDetails(): DynamicMotionInfo {
    return {
      technology_name: "Dynamic Motion Technology",
      description:
        "Mastercam's proprietary toolpath engine that maintains a constant radial engagement angle " +
        "throughout the cutting motion. Instead of following traditional offset patterns that create " +
        "varying engagement at corners, Dynamic Motion continuously adjusts the toolpath to keep " +
        "the tool engagement angle below a user-defined maximum.",
      key_principles: [
        "Constant max engagement angle (typically 60-90 degrees of arc)",
        "Micro-lift retract: tool lifts slightly when engagement would exceed threshold",
        "Smooth corner transitions: arc-based motion instead of sharp direction changes",
        "Full axial depth utilization: ae is small but ap uses full flute length",
        "Chip thinning compensation: feed automatically adjusted for actual chip thickness",
      ],
      engagement_control:
        "The max engagement angle (MEA) controls how much of the tool circumference is in contact " +
        "with the workpiece at any point. Typical values: 60-77 degrees for steel, 80-90 degrees " +
        "for aluminum, 45-60 degrees for superalloys. Lower MEA = more conservative = longer tool life.",
      retract_method:
        "Micro-lift retract: when the toolpath would cause engagement to exceed MEA, the tool lifts " +
        "slightly (typically 0.05-0.1mm) and repositions. This prevents full-slot conditions and " +
        "maintains consistent chip load. The lift amount is automatically calculated.",
      corner_treatment:
        "At inside corners, where conventional toolpaths would double the engagement, Dynamic Motion " +
        "traces an arc that maintains the target MEA. This eliminates the shock loading that causes " +
        "chipping and premature tool failure at corners.",
      speed_multiplier:
        "Because engagement is controlled to a constant low value (typically 8-12% of diameter), " +
        "cutting speed can be increased 1.5-2.5x vs conventional toolpaths. The consistent chip " +
        "load means the tool operates in its optimal performance zone throughout the cut.",
      supported_strategies: [
        "Dynamic Mill (2D pocket/contour roughing)",
        "Dynamic Contour (profile roughing)",
        "Dynamic OptiRough (3D adaptive roughing)",
        "Dynamic Turning (lathe rough turning)",
      ],
      benefits: [
        "2-3x increase in cutting speed vs conventional",
        "3-5x increase in tool life vs conventional",
        "30-50% reduction in cycle time for most roughing operations",
        "Reduced vibration and chatter at corners",
        "Lower cutting forces enable use on less rigid machines",
        "Consistent surface finish on roughing passes",
        "Reduced heat generation in the cut zone",
      ],
      limitations: [
        "Requires Mastercam Dynamic Motion license",
        "Longer toolpath calculation time than conventional",
        "Not available for 5-axis simultaneous operations",
        "Micro-lift retracts add some non-cutting time",
        "Not optimal for very shallow pockets (ap < 0.5D)",
      ],
    };
  }

  /**
   * Deep-dive on OptiRough technology.
   */
  optiRoughDetails(): OptiRoughInfo {
    return {
      technology_name: "OptiRough",
      description:
        "Mastercam's 3D stock-aware roughing strategy that uses the actual stock model to generate " +
        "efficient roughing toolpaths. Unlike traditional Z-level roughing that assumes a bounding " +
        "box of stock, OptiRough knows the exact stock shape and avoids air cutting.",
      key_features: [
        "Uses actual stock model (from previous ops or raw stock shape)",
        "Adaptive engagement based on actual stock conditions",
        "Automatic rest-machining: detects remaining material from larger tools",
        "3D surface-following roughing (not just Z-level)",
        "Smooth transitions between Z-levels",
        "Supports tool holder collision checking during roughing",
      ],
      stock_awareness:
        "OptiRough maintains an internal voxel-based stock model that is updated after each pass. " +
        "This means the toolpath for each subsequent pass knows exactly where material remains, " +
        "eliminating air cutting and optimizing engagement. The stock model resolution is " +
        "typically 0.1-0.5mm depending on part size.",
      rest_machining:
        "When switching from a larger to a smaller tool, OptiRough automatically identifies the " +
        "remaining material (rest stock) and generates toolpaths only where the larger tool " +
        "could not reach. This eliminates redundant cutting and dramatically reduces cycle time " +
        "for multi-tool roughing sequences.",
      toolpath_type:
        "OptiRough generates a hybrid toolpath that combines Z-level slicing with 3D surface-following. " +
        "On steep walls, it behaves like waterline roughing. On shallow areas, it follows the surface " +
        "contour. Transitions between modes are smooth and gouge-free.",
      benefits: [
        "30-50% reduction in roughing cycle time vs conventional",
        "Eliminates air cutting on complex 3D geometry",
        "Automatic rest-machining reduces programming time",
        "Better tool life through consistent engagement",
        "Reduced stock left for finishing operations",
        "Handles near-net-shape stock (castings, forgings)",
      ],
      best_for: [
        "Complex 3D mold and die roughing",
        "Multi-tool roughing sequences",
        "Near-net-shape stock (castings, forgings)",
        "Rest-machining with progressively smaller tools",
        "5-axis roughing with holder collision avoidance",
      ],
    };
  }

  /**
   * Deep-dive on ProfitTurning technology.
   */
  profitTurningDetails(): ProfitTurningInfo {
    return {
      technology_name: "ProfitTurning",
      description:
        "Mastercam's constant chip load turning strategy that maintains a consistent material " +
        "removal rate throughout the turning operation. Similar in concept to SolidCAM's " +
        "iMachining for turning, it controls the engagement angle to prevent sudden load " +
        "changes that damage inserts.",
      key_features: [
        "Constant chip load control throughout the cut",
        "Controlled engagement angle prevents insert overload",
        "Automatic chip thickness compensation",
        "Handles interrupted cuts smoothly (ports, keyways, flats)",
        "Works for both OD and ID profiles",
        "Automatic depth-of-cut adjustment for complex profiles",
        "Support for both roughing and semi-finishing passes",
      ],
      chip_load_control:
        "ProfitTurning calculates the instantaneous chip area at every point along the toolpath " +
        "and adjusts the tool motion to maintain a target chip load. When the profile geometry " +
        "would cause a sudden increase in engagement (e.g., at a shoulder or groove entry), the " +
        "tool takes a modified path to keep the chip load constant.",
      engagement_angle:
        "The max engagement angle is typically set to 90-120 degrees for steel, 120-150 degrees " +
        "for cast iron, and 60-90 degrees for superalloys. This controls the arc of contact " +
        "between the insert and the workpiece. Lower angles = more conservative = longer tool life.",
      tool_life_improvement:
        "Typical tool life improvements vs conventional rough turning: " +
        "Carbon steel (P): 2-3x, Stainless (M): 3-4x, Cast iron (K): 2x, " +
        "Aluminum (N): 1.5x, Superalloys (S): 3-5x, Hardened (H): 2-3x. " +
        "The improvement is greatest for materials sensitive to engagement variation.",
      benefits: [
        "2-5x insert life improvement vs conventional turning",
        "30-50% cycle time reduction through higher speeds",
        "Consistent surface finish on roughing passes",
        "Reduced vibration on interrupted cuts",
        "Lower cutting forces enable use of lighter insert grades",
        "Handles complex OD/ID profiles without manual adjustments",
        "Reduces programming time for complex turning profiles",
      ],
      comparison_to_imachining:
        "ProfitTurning and SolidCAM iMachining Turning share the core concept of constant " +
        "engagement control. Key differences: ProfitTurning uses engagement angle control " +
        "while iMachining uses chip area control. ProfitTurning is fully integrated into " +
        "Mastercam's turning environment including stock model updates. Both achieve similar " +
        "performance improvements of 2-5x tool life and 30-50% cycle time reduction.",
    };
  }

  /**
   * List all strategies, optionally filtered by category.
   */
  listStrategies(category?: MastercamCategory): {
    strategies: Array<{
      name: string;
      display_name: string;
      category: MastercamCategory;
      description: string;
      ratings: StrategyRating;
    }>;
    total: number;
    categories: MastercamCategory[];
  } {
    const filtered = category
      ? this.strategies.filter((s) => s.category === category)
      : this.strategies;

    return {
      strategies: filtered.map((s) => ({
        name: s.name,
        display_name: s.display_name,
        category: s.category,
        description: s.description,
        ratings: s.ratings,
      })),
      total: filtered.length,
      categories: [...new Set(this.strategies.map((s) => s.category))].sort() as MastercamCategory[],
    };
  }
}

export const mastercamStrategyEngine = new MastercamStrategyEngine();
export { MastercamStrategyEngine as MastercamStrategyEngineClass };
