/**
 * SolidCAMStrategyEngine — Dedicated SolidCAM Strategy Recommendation Engine
 *
 * Comprehensive SolidCAM 2024/2025 toolpath strategy database covering 35+
 * strategies across iMachining, HSR, HSS, 2.5D, Drilling, 5-Axis, and Turning.
 * Each strategy includes physics-backed parameter defaults, performance
 * ratings, material notes, and unique advantages.
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority)  — ranked strategies
 *   getParameters(strategy_name)                           — default parameters
 *   iMachiningDetails()                                    — iMachining Technology deep-dive
 *   hssDetails()                                           — HSS finishing deep-dive
 *   listStrategies(category?)                              — all strategies or filtered by category
 *
 * @engine SolidCAMStrategyEngine
 * @shortcode E1106
 * @dispatcher camDispatcher
 * @actions solidcam_strategy_recommend, solidcam_strategy_params, solidcam_imachining_details, solidcam_hss_details, solidcam_strategy_list
 * @milestone CAMX-MS3/U02
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SolidCAMCategory =
  | "imachining"
  | "hsr"
  | "hss"
  | "two_five_d"
  | "drilling"
  | "five_axis"
  | "turning";

export type SolidCAMPriority =
  | "cycle_time"
  | "tool_life"
  | "surface_finish"
  | "balanced";

export interface SolidCAMFeature {
  /** Feature type */
  type: "pocket" | "contour" | "slot" | "face" | "bore" | "freeform_3d" | "steep_wall" | "flat_area" | "groove" | "thread" | "turning_external" | "turning_internal" | "hole" | "impeller" | "ruled_surface" | "chamfer" | "engrave";
  /** Depth in mm */
  depth_mm?: number;
  /** Wall angle in degrees (0 = flat, 90 = vertical) */
  wall_angle_deg?: number;
  /** Whether previous roughing has been done */
  has_previous_roughing?: boolean;
  /** Number of axes available */
  axis_count?: 3 | 4 | 5;
}

export interface SolidCAMMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC (optional, influences strategy selection) */
  hardness_hrc?: number;
  /** Material name for notes lookup */
  name?: string;
}

export interface SolidCAMMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "lathe" | "mill_turn";
  /** Spindle speed limit, RPM */
  max_rpm?: number;
  /** Spindle power, kW */
  spindle_kw?: number;
  /** Has high-pressure coolant */
  hpc?: boolean;
}

export interface SolidCAMTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Tool type */
  type: "endmill" | "ballnose" | "bullnose" | "face_mill" | "drill" | "tap" | "barrel" | "circle_segment" | "insert" | "turning_insert" | "thread_mill" | "chamfer_mill";
  /** Corner radius, mm */
  corner_radius_mm?: number;
}

export interface SolidCAMStrategyRating {
  /** 1-10 scale for surface finish quality */
  surface_finish: number;
  /** 1-10 scale for cycle time efficiency */
  cycle_time: number;
  /** 1-10 scale for tool life preservation */
  tool_life: number;
}

export interface SolidCAMStrategy {
  /** Strategy name */
  name: string;
  /** Display name for UI */
  display_name: string;
  /** Category */
  category: SolidCAMCategory;
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
  ratings: SolidCAMStrategyRating;
  /** Unique advantages */
  unique_advantages: string[];
  /** Material-specific notes keyed by ISO group */
  material_notes: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", string>>;
  /** Suitable feature types */
  suitable_features: SolidCAMFeature["type"][];
  /** Suitable machine types */
  suitable_machines: SolidCAMMachine["type"][];
  /** Suitable tool types */
  suitable_tools: SolidCAMTool["type"][];
}

export interface SolidCAMStrategyRecommendation {
  rank: number;
  strategy: SolidCAMStrategy;
  score: number;
  reasoning: string;
}

export interface IMachiningInfo {
  technology_name: string;
  description: string;
  key_principles: string[];
  technology_wizard: string;
  morphing_spiral: string;
  engagement_control: string;
  speed_multiplier: string;
  supported_strategies: string[];
  benefits: string[];
  limitations: string[];
}

export interface HSSInfo {
  technology_name: string;
  description: string;
  strategy_variants: string[];
  surface_quality: string;
  toolpath_patterns: string;
  adaptive_parameters: string;
  benefits: string[];
  best_for: string[];
}

// ─── Strategy Database ───────────────────────────────────────────────────────

const STRATEGIES: SolidCAMStrategy[] = [
  // ── iMACHINING ─────────────────────────────────────────────────────────────
  {
    name: "imachining_2d",
    display_name: "iMachining 2D",
    category: "imachining",
    description: "SolidCAM's flagship patented morphing-spiral roughing with constant engagement angle control and Technology Wizard. Adapts toolpath geometry to maintain optimal chip load throughout the cut.",
    ae_pct: 8,
    ap_factor: 2.5,
    vc_multiplier: 2.5,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 10, tool_life: 10 },
    unique_advantages: [
      "Patented morphing-spiral toolpath maintains constant engagement angle",
      "Technology Wizard auto-calculates optimal parameters (8 levels)",
      "Up to 70% cycle time reduction vs conventional roughing",
      "Up to 5x tool life improvement through constant chip load",
      "Moat algorithm handles wide pockets with controlled engagement",
      "Adaptive feed rate compensation for engagement variations",
    ],
    material_notes: {
      P: "ae 6-10%D, full flute depth, speed factor 2.0-2.5x. Wizard level 4-6 for carbon steel.",
      M: "ae 6-8%D, speed factor 1.8x for austenitic stainless. Wizard level 3-5. Eliminates work hardening.",
      K: "ae 8-12%D, cast iron responds excellently. Wizard level 5-7. Dry cutting OK.",
      N: "ae 10-15%D, speed factor up to 3.0x in aluminum. Wizard level 6-8.",
      S: "ae 4-6%D, speed factor 1.3x max. Wizard level 2-4. HPC essential for Ti/Ni.",
      H: "ae 4-6%D, speed factor 1.2x. Wizard level 2-3 for >45HRC. AlTiN coating.",
    },
    suitable_features: ["pocket", "contour", "slot", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },
  {
    name: "imachining_3d",
    display_name: "iMachining 3D",
    category: "imachining",
    description: "Extends iMachining constant-engagement technology to 3D freeform surfaces. Stock-aware adaptive roughing with morphing-spiral logic on complex geometry.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 2.0,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 4, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "3D stock-aware constant engagement roughing",
      "Morphing-spiral extended to freeform surfaces",
      "Automatic rest-machining with smaller tools",
      "Stock model tracking eliminates air cutting",
      "Technology Wizard applied to 3D operations",
      "Handles near-net-shape stock (castings, forgings)",
    ],
    material_notes: {
      P: "ae 8-12%D, optimal for mold/die roughing in P20/H13.",
      M: "ae 8-10%D, use with through-spindle coolant for surgical implants.",
      K: "ae 10-15%D, excellent for cast iron mold bases. Dry OK.",
      N: "ae 12-18%D, aggressive parameters for aerospace aluminum structural.",
      S: "ae 5-8%D, stock awareness prevents overloading in Ti-6Al-4V.",
      H: "ae 5-8%D, ideal for rough-before-hard-milling workflow in H13.",
    },
    suitable_features: ["pocket", "freeform_3d", "contour", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose", "ballnose"],
  },

  // ── HSR (High Speed Roughing) ──────────────────────────────────────────────
  {
    name: "hsr_hatch",
    display_name: "HSR Hatch",
    category: "hsr",
    description: "High-speed 3D roughing with parallel hatch pattern. Zigzag or one-way passes with Z-level stepping for efficient material removal on 3D geometry.",
    ae_pct: 55,
    ap_factor: 1.0,
    vc_multiplier: 1.2,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 3, cycle_time: 7, tool_life: 5 },
    unique_advantages: [
      "Simple, predictable 3D roughing pattern",
      "Good for prismatic and gently curved surfaces",
      "Fast toolpath calculation",
      "Efficient for uniform stock conditions",
    ],
    material_notes: {
      P: "ae 50-60%D, standard 3D roughing approach for steel molds.",
      M: "ae 45-55%D, reduce feed at corners for stainless.",
      K: "ae 55-65%D, cast iron tolerates high engagement.",
      N: "ae 60-70%D, high speed hatch roughing for aluminum.",
      S: "ae 35-45%D, reduce engagement for superalloys. HPC essential.",
      H: "Not ideal for >45HRC. Consider iMachining instead.",
    },
    suitable_features: ["pocket", "freeform_3d", "face", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "bullnose", "face_mill"],
  },
  {
    name: "hsr_contour",
    display_name: "HSR Contour",
    category: "hsr",
    description: "Z-level contour roughing with offset-from-boundary passes. Follows the part contour at each Z-level for efficient stock removal on complex profiles.",
    ae_pct: 50,
    ap_factor: 1.0,
    vc_multiplier: 1.2,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 4, cycle_time: 7, tool_life: 5 },
    unique_advantages: [
      "Contour-following roughing at each Z-level",
      "Better wall quality than hatch roughing",
      "Good for complex profiles and cavities",
      "Reduced step marks on walls vs hatch pattern",
    ],
    material_notes: {
      P: "ae 45-55%D, good for mold cavity roughing.",
      M: "ae 40-50%D, climb milling on contours for stainless.",
      K: "ae 50-60%D, cast iron cavities.",
      N: "ae 55-65%D, aluminum mold roughing.",
      S: "ae 30-40%D, careful at tight corners for superalloys.",
      H: "ae 30-40%D, acceptable for moderate hardness (<45HRC).",
    },
    suitable_features: ["pocket", "freeform_3d", "contour", "steep_wall"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "bullnose"],
  },
  {
    name: "hsr_rest",
    display_name: "HSR Rest Roughing",
    category: "hsr",
    description: "Automatic rest-material roughing detecting and machining only the material remaining from a previous larger tool. Stock-model aware for efficient re-roughing.",
    ae_pct: 40,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 4, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Automatic rest-material detection from previous tool",
      "Eliminates air cutting on re-roughing passes",
      "Stock model tracking between tool changes",
      "Progressively smaller tools for tight corners",
    ],
    material_notes: {
      P: "Tool diameter 50-70% of previous. Reach tight radii in steel.",
      M: "Essential for stainless mold corners. Avoid recutting chips.",
      K: "Good for cast iron rest-roughing sequences.",
      N: "Fast re-roughing in aluminum with smaller tools.",
      S: "Critical for Ti/Ni — avoids redundant cutting in superalloys.",
      H: "Important step before hard-milling finishing passes.",
    },
    suitable_features: ["pocket", "freeform_3d", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "bullnose", "ballnose"],
  },
  {
    name: "hsr_hybrid_rib",
    display_name: "HSR Hybrid Rib",
    category: "hsr",
    description: "Specialized roughing for thin ribs and walls. Combines contour and level-based passes optimized for thin-wall stability and minimal deflection.",
    ae_pct: 30,
    ap_factor: 0.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Optimized for thin ribs and walls",
      "Alternating sides to balance cutting forces",
      "Reduced deflection through controlled pass sequence",
      "Level-based approach prevents thin-wall vibration",
    ],
    material_notes: {
      P: "Alternate sides every level. DOC < 0.5D for thin walls.",
      M: "Reduced feed for stainless thin walls. Sharp tools essential.",
      K: "Cast iron ribs — standard approach works well.",
      N: "Aluminum thin walls — high speed, light cuts for best results.",
      S: "Critical for Ti aerospace ribs. Minimal force essential.",
      H: "Pre-hardened thin walls — very light DOC.",
    },
    suitable_features: ["contour", "pocket", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── HSS (High Speed Surface Finishing) ─────────────────────────────────────
  {
    name: "hss_linear",
    display_name: "HSS Linear",
    category: "hss",
    description: "Linear parallel passes for 3D surface finishing. Constant stepover with predictable, simple toolpath pattern for gentle surfaces.",
    ae_pct: 10,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Simple, predictable linear pattern",
      "Controllable cut direction for surface lay",
      "Fast calculation time",
      "Good for gentle surfaces and shallow features",
    ],
    material_notes: {
      P: "Standard finishing parameters. Good general choice for steel.",
      M: "Climb milling preferred to avoid work hardening on stainless.",
      K: "Excellent for flat cast iron surfaces.",
      N: "High speed possible. Mirror finish achievable on aluminum.",
      S: "Consistent engagement direction important for superalloys.",
      H: "Acceptable for gently curved hardened surfaces. CBN tools.",
    },
    suitable_features: ["flat_area", "freeform_3d", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "hss_radial",
    display_name: "HSS Radial",
    category: "hss",
    description: "Radial passes emanating from a center point. Ideal for circular or near-circular features and boss-type geometry.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Natural pattern for circular/radial features",
      "Consistent surface lay radiating from center",
      "Good for dished or domed surfaces",
      "Reduced cusps at center vs linear pattern",
    ],
    material_notes: {
      P: "Good for circular steel mold features.",
      M: "Stainless dome/dish finishing with consistent lay.",
      K: "Cast iron circular features.",
      N: "Aluminum radial finishing at high speed.",
      S: "Controlled engagement for superalloy domed features.",
      H: "Hardened circular mold inserts.",
    },
    suitable_features: ["freeform_3d", "face", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose"],
  },
  {
    name: "hss_spiral",
    display_name: "HSS Spiral",
    category: "hss",
    description: "Continuous spiral toolpath from center to boundary (or vice versa). Zero retracts for smooth, uninterrupted surface finish.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 8 },
    unique_advantages: [
      "Continuous spiral — zero retracts for seamless finish",
      "No witness marks from tool entry/exit",
      "Optimal for lens-type and dished surfaces",
      "Constant stepover along spiral path",
    ],
    material_notes: {
      P: "Excellent for steel optical mold inserts. No entry marks.",
      M: "Stainless medical devices — seamless finish.",
      K: "Cast iron lens molds.",
      N: "Aluminum reflectors and optical components.",
      S: "Superalloy dome finishing with zero interruptions.",
      H: "Hardened optical mold inserts. CBN ball nose.",
    },
    suitable_features: ["freeform_3d", "flat_area", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose"],
  },
  {
    name: "hss_morphed",
    display_name: "HSS Morphed",
    category: "hss",
    description: "Morphed toolpath between two or more boundary curves. Creates smooth transitions across ruled or blended surfaces with user-controlled density.",
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
      P: "Good for blended mold surfaces in steel.",
      M: "Consistent cut direction across blend for stainless.",
      K: "Cast iron blended surface finishing.",
      N: "High speed blending for aluminum aerospace surfaces.",
      S: "Critical for Ti/Ni airfoil blending. Careful engagement.",
      H: "Hardened die surfaces. Small stepover.",
    },
    suitable_features: ["freeform_3d", "ruled_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel"],
  },
  {
    name: "hss_constant_z",
    display_name: "HSS Constant Z",
    category: "hss",
    description: "Z-level contour finishing following horizontal slices at constant Z increments. Excellent for steep walls where scallop height control is critical.",
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
      P: "Z-step 0.1-0.3mm. Climb milling on steep walls.",
      M: "Sharp tools required. Stainless walls benefit greatly.",
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
    name: "hss_helical",
    display_name: "HSS Helical",
    category: "hss",
    description: "Helical descent finishing with continuous downward spiral. Combines Z-level consistency with smooth continuous motion for cylindrical and near-cylindrical features.",
    ae_pct: 5,
    ap_factor: 0.08,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Continuous helical descent — no level marks",
      "Smooth Z-transition eliminates step marks",
      "Ideal for cylindrical bores and round cavities",
      "Consistent tool engagement throughout descent",
    ],
    material_notes: {
      P: "Good for steel bore finishing. Smooth Z transition.",
      M: "Stainless cylindrical features — no step marks.",
      K: "Cast iron bore finishing.",
      N: "Aluminum cylindrical cavities at high speed.",
      S: "Superalloy bore features with controlled descent.",
      H: "Hardened bore finishing. CBN tools recommended.",
    },
    suitable_features: ["bore", "contour", "pocket"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "hss_horizontal",
    display_name: "HSS Horizontal Area",
    category: "hss",
    description: "Detects and finishes flat/horizontal areas on 3D surfaces. Uses flat-bottom endmill to eliminate ball nose scallop on horizontal regions.",
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
      "Complementary to other HSS finishing strategies",
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
  {
    name: "hss_pencil",
    display_name: "HSS Pencil",
    category: "hss",
    description: "Corner cleanup strategy tracing surface-to-surface intersections. Removes scallop remnants from concave corners, fillets, and blend zones.",
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
      "Removes scallop remnants from previous finishing",
      "Small tool access into tight corners",
      "Reduces need for hand polishing in corners",
    ],
    material_notes: {
      P: "Use small ball nose. Light cuts only in steel.",
      M: "Sharp coated tools. Avoid work hardening stainless corners.",
      K: "Good for cast iron corner cleanup.",
      N: "High speed pencil passes in aluminum.",
      S: "Reduced speed. Critical for aerospace fillet blends.",
      H: "Essential for hardened mold corner cleanup. CBN ball nose.",
    },
    suitable_features: ["freeform_3d", "pocket", "contour"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ballnose"],
  },

  // ── 2.5D ───────────────────────────────────────────────────────────────────
  {
    name: "pocket_2_5d",
    display_name: "2.5D Pocket",
    category: "two_five_d",
    description: "Standard 2.5D pocket milling with zigzag, spiral, or contour patterns. Reliable general-purpose pocket roughing and finishing for prismatic parts.",
    ae_pct: 60,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 6, tool_life: 5 },
    unique_advantages: [
      "Simple and predictable 2.5D pocket toolpath",
      "Multiple pattern options (zigzag, spiral, contour)",
      "Good for prismatic parts with flat bottom pockets",
      "Island avoidance and multiple depth levels",
    ],
    material_notes: {
      P: "ae 50-65%D, standard speeds. Conventional pocket roughing.",
      M: "ae 45-55%D, reduce feed at corners for stainless.",
      K: "ae 55-65%D, cast iron pockets.",
      N: "ae 60-70%D, aluminum clears quickly.",
      S: "ae 35-45%D, reduce engagement for superalloys.",
      H: "Not recommended for >45HRC. Use iMachining 2D instead.",
    },
    suitable_features: ["pocket", "face", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "face_mill", "bullnose"],
  },
  {
    name: "profile_2_5d",
    display_name: "2.5D Profile",
    category: "two_five_d",
    description: "2.5D profile/contour milling with lead-in/out arcs, cutter compensation, and spring passes. Final profile finishing for dimensional accuracy.",
    ae_pct: 2,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 8, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Final dimensional accuracy on 2.5D profiles",
      "Spring pass for deflection compensation",
      "Lead-in/lead-out arcs prevent witness marks",
      "G41/G42 cutter compensation support",
    ],
    material_notes: {
      P: "Standard finishing. Spring pass for tight tolerances in steel.",
      M: "Sharp tools. Climb milling for best finish on stainless.",
      K: "Good surface finish on cast iron profiles.",
      N: "High speed contouring for aluminum.",
      S: "Careful feed control for superalloy profiles.",
      H: "Multiple spring passes for hardened steel profiles.",
    },
    suitable_features: ["contour", "pocket", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill", "bullnose"],
  },
  {
    name: "face_mill_2_5d",
    display_name: "2.5D Face Mill",
    category: "two_five_d",
    description: "Face milling with optimized passes for large flat surfaces. Supports zigzag and one-way patterns with automatic overlap calculation.",
    ae_pct: 70,
    ap_factor: 0.3,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Optimized face milling passes",
      "Automatic overlap calculation",
      "Multiple pattern options (zigzag, one-way)",
      "Good for large flat surface preparation",
    ],
    material_notes: {
      P: "Standard face milling for steel. Wiper insert for finish.",
      M: "Positive rake inserts for stainless face milling.",
      K: "Cast iron faces well. Aggressive parameters OK.",
      N: "High speed face milling aluminum. PCD inserts for finish.",
      S: "Reduced DOC for superalloy facing. Round inserts.",
      H: "CBN face mill for hardened steel surfaces.",
    },
    suitable_features: ["face", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["face_mill", "endmill"],
  },
  {
    name: "slot_2_5d",
    display_name: "2.5D Slot",
    category: "two_five_d",
    description: "Dedicated slot milling with plunge or ramping entry. Handles closed and open slots with automatic width detection.",
    ae_pct: 100,
    ap_factor: 0.5,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 6, cycle_time: 6, tool_life: 5 },
    unique_advantages: [
      "Dedicated slot milling toolpath",
      "Automatic slot width detection",
      "Ramping and plunge entry strategies",
      "Open and closed slot support",
    ],
    material_notes: {
      P: "Ramping entry preferred for steel slots.",
      M: "Helical ramp entry for stainless. Avoid full-slot plunge.",
      K: "Standard slot milling for cast iron.",
      N: "High speed slot milling in aluminum.",
      S: "Helical ramp essential for superalloy slots.",
      H: "Light DOC for hardened steel slots. Consider iMachining.",
    },
    suitable_features: ["slot", "groove"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill"],
  },
  {
    name: "thread_mill_2_5d",
    display_name: "2.5D Thread Mill",
    category: "two_five_d",
    description: "Thread milling for internal and external threads. Helical interpolation with single-point or multi-point thread mills.",
    ae_pct: 30,
    ap_factor: 1.0,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "One tool for multiple thread sizes",
      "Internal and external thread support",
      "Better thread quality than tapping in hard materials",
      "Adjustable thread depth and fit",
    ],
    material_notes: {
      P: "Standard thread milling for steel threads.",
      M: "Preferred over tapping for stainless threads.",
      K: "Good for cast iron threads.",
      N: "High speed thread milling in aluminum.",
      S: "Critical for superalloy threads — no tap breakage risk.",
      H: "Essential for hardened steel threads (>40HRC).",
    },
    suitable_features: ["thread", "hole", "bore"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["thread_mill", "endmill"],
  },
  {
    name: "chamfer_2_5d",
    display_name: "2.5D Chamfer",
    category: "two_five_d",
    description: "Chamfer milling on edges and holes. Automatic chamfer detection with controlled angle and depth.",
    ae_pct: 15,
    ap_factor: 0.3,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Automatic edge and hole chamfer detection",
      "Controlled chamfer angle and depth",
      "Single operation for multiple chamfers",
      "Support for 2D and 3D chamfer profiles",
    ],
    material_notes: {
      P: "Standard chamfer parameters for steel.",
      M: "Sharp chamfer mills for stainless.",
      K: "Cast iron chamfers cleanly.",
      N: "High speed chamfering in aluminum.",
      S: "Light cuts for superalloy chamfers.",
      H: "Carbide chamfer mills for hardened steel.",
    },
    suitable_features: ["chamfer", "contour", "hole"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["chamfer_mill", "endmill"],
  },
  {
    name: "engrave_2_5d",
    display_name: "2.5D Engrave",
    category: "two_five_d",
    description: "Text and logo engraving with V-bit or small endmill. Supports TrueType fonts and DXF artwork for part marking.",
    ae_pct: 5,
    ap_factor: 0.1,
    vc_multiplier: 0.6,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "TrueType font and DXF artwork support",
      "Controlled engraving depth",
      "Part marking and serial number engraving",
      "V-bit and small endmill support",
    ],
    material_notes: {
      P: "Standard engraving in steel. V-bit for text.",
      M: "Sharp tools for stainless engraving.",
      K: "Cast iron engraves cleanly.",
      N: "High speed engraving in aluminum.",
      S: "Light cuts. Carbide V-bit for superalloys.",
      H: "Carbide or PCD V-bit for hardened steel engraving.",
    },
    suitable_features: ["engrave", "face", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["endmill"],
  },

  // ── DRILLING ───────────────────────────────────────────────────────────────
  {
    name: "drilling",
    display_name: "Drilling",
    category: "drilling",
    description: "Standard drilling with peck, chip-break, and deep-hole strategies. Supports G81/G83/G73 canned cycles with pattern optimization.",
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
      "Pattern optimization for multi-hole operations",
      "Chip-break and deep-hole cycle selection",
    ],
    material_notes: {
      P: "Standard peck drilling. Through-coolant preferred for steel.",
      M: "Peck drilling mandatory for stainless. Chip-break cycle.",
      K: "Cast iron drills well. Reduced peck depth.",
      N: "High speed drilling in aluminum. Polished flute drills.",
      S: "Deep peck with HPC mandatory for Ti/Ni.",
      H: "Carbide drills for hardened steels. Short peck cycles.",
    },
    suitable_features: ["hole", "bore"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "lathe", "mill_turn"],
    suitable_tools: ["drill"],
  },

  // ── 5-AXIS ─────────────────────────────────────────────────────────────────
  {
    name: "sim5x_contour",
    display_name: "Sim5X Contour",
    category: "five_axis",
    description: "5-axis simultaneous contouring along curves with automatic tilt and lead/lag angle control. Full collision avoidance with holder and spindle checking.",
    ae_pct: 8,
    ap_factor: 0.1,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 8 },
    unique_advantages: [
      "Full 5-axis simultaneous contouring",
      "Automatic tilt and lead/lag angle control",
      "Collision avoidance with holder/spindle/fixture",
      "Optimal tool contact angle for surface quality",
    ],
    material_notes: {
      P: "Lead/lag 5-15 deg. Standard 5-axis finishing for steel.",
      M: "Consistent tool axis control for stainless parts.",
      K: "Good for complex cast iron components.",
      N: "High speed 5-axis for aluminum aerospace monoliths.",
      S: "Critical for Ti/Ni aerospace components. Controlled tilt.",
      H: "Hardened die finishing with optimal contact angle.",
    },
    suitable_features: ["freeform_3d", "steep_wall", "contour"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "sim5x_surface",
    display_name: "Sim5X Surface",
    category: "five_axis",
    description: "5-axis surface machining with UV-flow or isoparametric passes. Tool axis follows surface normal with controlled tilt offset.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "UV-flow surface following motion",
      "Tool axis tracks surface normal",
      "Excellent for organic and freeform shapes",
      "Minimal direction changes for smooth finish",
    ],
    material_notes: {
      P: "Complex mold freeform finishing with 5-axis.",
      M: "Medical implant organic shapes.",
      K: "Cast iron artistic/organic components.",
      N: "Aluminum aerospace organic structures.",
      S: "Ti/Ni implant surfaces. Smooth continuous motion.",
      H: "Hardened die organic surfaces. CBN tools.",
    },
    suitable_features: ["freeform_3d", "impeller"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel", "circle_segment"],
  },
  {
    name: "sim5x_impeller",
    display_name: "Sim5X Impeller",
    category: "five_axis",
    description: "Dedicated 5-axis impeller/blisk machining with blade and hub-specific toolpath logic. Handles splitter blades and variable geometry.",
    ae_pct: 10,
    ap_factor: 0.1,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Dedicated impeller/blisk machining logic",
      "Blade roughing and finishing strategies",
      "Hub finishing with collision avoidance",
      "Splitter blade and variable geometry support",
    ],
    material_notes: {
      P: "Steel pump impellers.",
      M: "Stainless impeller blades and hubs.",
      K: "Cast iron pump housings with impeller features.",
      N: "Aluminum fan and compressor impellers.",
      S: "Ti/Ni turbine blisks. Critical application. HPC essential.",
      H: "Hardened impeller components.",
    },
    suitable_features: ["impeller", "freeform_3d"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill", "barrel"],
  },
  {
    name: "sim5x_turbine",
    display_name: "Sim5X Turbine",
    category: "five_axis",
    description: "5-axis turbine blade machining with root-to-tip strategies. Handles twist, taper, and compound curvature of turbine blade geometry.",
    ae_pct: 8,
    ap_factor: 0.08,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Root-to-tip blade machining strategy",
      "Handles twist, taper, and compound curvature",
      "Pressure/suction side differentiation",
      "Leading/trailing edge treatment",
    ],
    material_notes: {
      P: "Steel turbine components.",
      M: "Stainless turbine blades.",
      K: "Cast turbine housings.",
      N: "Aluminum compressor blades.",
      S: "Ni-based superalloy turbine blades. Premium application.",
      H: "Hardened turbine components. CBN tools.",
    },
    suitable_features: ["impeller", "freeform_3d", "ruled_surface"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "barrel"],
  },
  {
    name: "sim5x_port",
    display_name: "Sim5X Port",
    category: "five_axis",
    description: "5-axis port and channel machining for intake/exhaust ports, manifolds, and internal passages. Handles split-line and multi-piece approach.",
    ae_pct: 15,
    ap_factor: 0.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "Dedicated port and channel machining",
      "Intake/exhaust port optimization",
      "Multi-piece split-line approach",
      "Internal passage finishing",
    ],
    material_notes: {
      P: "Steel manifold ports.",
      M: "Stainless exhaust manifold ports.",
      K: "Cast iron intake/exhaust ports. Primary application.",
      N: "Aluminum intake manifolds and cylinder heads.",
      S: "Superalloy exhaust components.",
      H: "Hardened port finishing.",
    },
    suitable_features: ["freeform_3d", "bore", "contour"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "bullnose", "endmill"],
  },
  {
    name: "sim5x_deburr",
    display_name: "Sim5X Deburr",
    category: "five_axis",
    description: "5-axis automatic deburring along edge intersections. Detects sharp edges and generates controlled deburring passes with tilt control.",
    ae_pct: 3,
    ap_factor: 0.02,
    vc_multiplier: 0.7,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "Automatic edge detection for deburring",
      "5-axis tilt for edge access",
      "Controlled chamfer/radius on edges",
      "Eliminates manual deburring operations",
    ],
    material_notes: {
      P: "Steel edge deburring. Controlled chamfer size.",
      M: "Stainless deburring — eliminates hand work.",
      K: "Cast iron deburring along parting lines.",
      N: "Aluminum edge deburring at high speed.",
      S: "Superalloy edge treatment. Light passes.",
      H: "Hardened edge deburring with CBN tools.",
    },
    suitable_features: ["contour", "freeform_3d"],
    suitable_machines: ["5axis"],
    suitable_tools: ["ballnose", "chamfer_mill", "endmill"],
  },
  {
    name: "swarf_plane",
    display_name: "SWARF Plane",
    category: "five_axis",
    description: "5-axis side-wall finish (SWARF) cutting with tool aligned to ruled surface planes. Full flute-length cutting for single-pass wall finishing.",
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
    ],
    material_notes: {
      P: "Good for ruled surface finishing in steel molds.",
      M: "Stainless impeller blades. Consistent engagement.",
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
    name: "swarf_surface",
    display_name: "SWARF Surface",
    category: "five_axis",
    description: "5-axis SWARF milling along a drive surface with tool flank tangent to the surface. Handles non-planar ruled surfaces and complex wall geometry.",
    ae_pct: 5,
    ap_factor: 2.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Tool flank tangent to non-planar surfaces",
      "Handles complex ruled surface geometry",
      "Superior wall finish vs point-contact tools",
      "Reduced number of passes for wall finishing",
    ],
    material_notes: {
      P: "Complex ruled surfaces in steel molds/dies.",
      M: "Stainless surgical instruments with ruled walls.",
      K: "Cast iron complex wall geometry.",
      N: "Aluminum aerospace structural walls.",
      S: "Superalloy turbine blade flanks.",
      H: "Hardened die complex walls.",
    },
    suitable_features: ["ruled_surface", "steep_wall", "freeform_3d"],
    suitable_machines: ["5axis"],
    suitable_tools: ["endmill", "bullnose", "barrel"],
  },
  {
    name: "swarf_between_surfaces",
    display_name: "SWARF Between Surfaces",
    category: "five_axis",
    description: "5-axis SWARF milling between two guide surfaces. Tool simultaneously contacts both surfaces for maximum accuracy on tapered or drafted walls.",
    ae_pct: 5,
    ap_factor: 2.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Simultaneous contact with two guide surfaces",
      "Maximum accuracy on tapered/drafted walls",
      "Ideal for core/cavity draft angle finishing",
      "Precise wall taper control",
    ],
    material_notes: {
      P: "Steel mold draft angle finishing.",
      M: "Stainless tapered wall finishing.",
      K: "Cast iron tapered features.",
      N: "Aluminum tapered structural walls.",
      S: "Superalloy tapered blade sections.",
      H: "Hardened die draft angle precision finishing.",
    },
    suitable_features: ["ruled_surface", "steep_wall"],
    suitable_machines: ["5axis"],
    suitable_tools: ["endmill", "bullnose"],
  },

  // ── TURNING ────────────────────────────────────────────────────────────────
  {
    name: "turning_rough",
    display_name: "Turning Rough",
    category: "turning",
    description: "Standard rough turning cycle for OD/ID profiles. Linear passes with Z-level or contour-following stock removal.",
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
      "Standard G-code turning cycles",
    ],
    material_notes: {
      P: "Standard DOC and feed. General purpose steel turning.",
      M: "Positive rake inserts for stainless. Reduce DOC.",
      K: "Cast iron turns well. Aggressive parameters OK.",
      N: "High speed aluminum turning. PCD for finish.",
      S: "Reduced speed and DOC for superalloys. HPC essential.",
      H: "CBN inserts for hardened steel. Light DOC.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "turning_finish",
    display_name: "Turning Finish",
    category: "turning",
    description: "Final finishing pass on OD/ID profiles. Single pass at controlled feed for surface finish and dimensional accuracy with nose radius compensation.",
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
      "Tool nose radius compensation (TNRC)",
    ],
    material_notes: {
      P: "Standard finishing. Wiper insert for improved Ra.",
      M: "Sharp inserts. Positive rake for stainless finish.",
      K: "Good finish on cast iron. Dry cutting OK.",
      N: "PCD inserts for mirror finish on aluminum.",
      S: "Careful feed control for Ti/Ni. HPC for chip control.",
      H: "CBN finishing inserts. Controlled feed for quality.",
    },
    suitable_features: ["turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "turning_groove",
    display_name: "Turning Groove",
    category: "turning",
    description: "Grooving and parting operations with peck and face grooving support. Handles OD, ID, and face grooves with controlled chip breaking.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 7, tool_life: 6 },
    unique_advantages: [
      "OD, ID, and face grooving support",
      "Peck grooving for deep grooves",
      "Part-off with controlled feed",
      "Multiple groove insert geometry support",
    ],
    material_notes: {
      P: "Standard grooving parameters. Through-coolant preferred.",
      M: "Reduced speed for stainless grooving. Peck cycle.",
      K: "Cast iron grooves well. Standard parameters.",
      N: "High speed grooving in aluminum.",
      S: "Reduced speed. Peck mandatory for superalloy grooves.",
      H: "CBN grooving inserts for hardened steel.",
    },
    suitable_features: ["groove", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "turning_thread",
    display_name: "Turning Thread",
    category: "turning",
    description: "Single-point threading with radial, flank, modified flank, and alternate flank infeed. Supports all standard thread forms with spring passes.",
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
      "Constant area pass depth calculation",
      "Spring passes for thread form accuracy",
      "All standard thread forms (metric, UNC, UNF, custom)",
    ],
    material_notes: {
      P: "Modified flank infeed for steel. 4-6 passes typical.",
      M: "Flank infeed for stainless to reduce BUE.",
      K: "Radial infeed OK for cast iron threads.",
      N: "High speed threading in aluminum.",
      S: "Alternate flank for Ti. Many light passes. HPC critical.",
      H: "CBN inserts. Many very light passes for hardened threads.",
    },
    suitable_features: ["thread", "turning_external", "turning_internal"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "turning_cutoff",
    display_name: "Turning Cut-Off",
    category: "turning",
    description: "Part cut-off/parting operation with controlled feed ramp-down and optional chip breaking pecks. Supports sub-spindle part catcher handoff.",
    ae_pct: 100,
    ap_factor: 1.0,
    vc_multiplier: 0.7,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 4, cycle_time: 7, tool_life: 5 },
    unique_advantages: [
      "Controlled feed ramp-down at center",
      "Optional peck cycle for chip breaking",
      "Sub-spindle part catcher handoff",
      "Automatic remnant detection",
    ],
    material_notes: {
      P: "Standard part-off. Feed reduction near center for steel.",
      M: "Reduced speed for stainless. Peck to control chips.",
      K: "Cast iron parts off cleanly.",
      N: "High speed cut-off for aluminum bar stock.",
      S: "Reduced speed. HPC essential for superalloy cut-off.",
      H: "CBN cut-off inserts for hardened steel.",
    },
    suitable_features: ["turning_external"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
  {
    name: "imachining_turning",
    display_name: "iMachining Turning",
    category: "turning",
    description: "iMachining constant-engagement technology applied to turning operations. Maintains controlled chip load and engagement angle for dramatic tool life improvement.",
    ae_pct: 15,
    ap_factor: 1.5,
    vc_multiplier: 1.5,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 10 },
    unique_advantages: [
      "iMachining constant engagement for turning",
      "Technology Wizard for automatic parameter selection",
      "3-5x insert life improvement over conventional roughing",
      "40-60% cycle time reduction through controlled engagement",
      "Handles interrupted cuts without insert damage",
      "Automatic chip area control throughout cut",
    ],
    material_notes: {
      P: "Outstanding for steel shaft roughing. 50-70% cycle time reduction.",
      M: "Best turning strategy for stainless. Eliminates work hardening.",
      K: "Good for cast iron. Consistent engagement prevents insert fracture.",
      N: "Fast aluminum turning with extended insert life.",
      S: "Best turning strategy for Ti-6Al-4V. Controlled heat generation.",
      H: "Hardened steel turning with CBN. Controlled engagement angle.",
    },
    suitable_features: ["turning_external", "turning_internal", "groove"],
    suitable_machines: ["lathe", "mill_turn"],
    suitable_tools: ["turning_insert", "insert"],
  },
];

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class SolidCAMStrategyEngine {
  private readonly strategies = STRATEGIES;

  /**
   * Recommend ranked strategies for a given feature/material/machine/tool combination.
   */
  recommend(
    feature: SolidCAMFeature,
    material: SolidCAMMaterial,
    machine: SolidCAMMachine,
    tool: SolidCAMTool,
    priority: SolidCAMPriority = "balanced",
  ): SolidCAMStrategyRecommendation[] {
    const candidates = this.strategies.filter((s) => {
      // Filter by feature suitability
      if (!s.suitable_features.includes(feature.type)) return false;
      // Filter by machine suitability
      if (!s.suitable_machines.includes(machine.type)) return false;
      // Filter by tool suitability
      if (!s.suitable_tools.includes(tool.type)) return false;
      // Filter by 5-axis requirement
      if (feature.axis_count === 5 && s.category === "five_axis" && !s.five_axis_capable) return false;
      // Filter out 5-axis strategies for 3-axis machines
      if (s.five_axis_capable && s.category === "five_axis" &&
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

      // iMachining bonus — flagship technology for roughing
      if (s.category === "imachining") {
        score += 5;
        reasons.push("iMachining flagship technology — patented constant engagement");
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
        if (feature.wall_angle_deg > 60 && s.name === "hss_constant_z") {
          score += 4;
          reasons.push("Constant Z excels on steep walls (>60 deg)");
        }
        if (feature.wall_angle_deg < 30 && s.name === "hss_linear") {
          score += 3;
          reasons.push("Linear finishing ideal for gentle surfaces (<30 deg)");
        }
        if (feature.wall_angle_deg < 30 && s.name === "hss_spiral") {
          score += 3;
          reasons.push("Spiral finishing optimal for shallow dished surfaces");
        }
      }

      // Feature-specific bonuses
      if (feature.type === "slot" && s.name === "imachining_2d") {
        score += 5;
        reasons.push("iMachining 2D is the optimal slot roughing strategy");
      }
      if (feature.type === "freeform_3d" && s.name === "hss_spiral") {
        score += 3;
        reasons.push("HSS Spiral provides seamless finish on freeform 3D");
      }
      if (feature.type === "impeller" && s.category === "five_axis") {
        score += 4;
        reasons.push("5-axis strategy required for impeller geometry");
      }
      if (feature.type === "ruled_surface" && s.name.startsWith("swarf")) {
        score += 5;
        reasons.push("SWARF cutting is purpose-built for ruled surfaces");
      }
      if (feature.type === "impeller" && s.name === "sim5x_impeller") {
        score += 6;
        reasons.push("Sim5X Impeller is the dedicated impeller machining strategy");
      }

      // Previous roughing check
      if (feature.has_previous_roughing && (s.category === "imachining" || s.category === "hsr")) {
        score -= 5;
        reasons.push("Roughing already completed — finishing preferred");
      }
      if (!feature.has_previous_roughing && s.category === "hss") {
        score -= 3;
        reasons.push("No previous roughing — roughing should be done first");
      }

      // Hardness-based adjustments
      if (material.hardness_hrc !== undefined && material.hardness_hrc > 45) {
        if (s.engagement_control) {
          score += 3;
          reasons.push("Controlled engagement essential for >45HRC");
        }
        if (s.name === "pocket_2_5d" || s.name === "hsr_hatch") {
          score -= 5;
          reasons.push("Standard pocket/hatch not recommended for >45HRC — use iMachining");
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
  getParameters(strategy_name: string): SolidCAMStrategy | { error: string } {
    const s = this.strategies.find((st) => st.name === strategy_name);
    if (!s) {
      return { error: `Unknown strategy: ${strategy_name}. Use listStrategies() for available names.` };
    }
    return s;
  }

  /**
   * Deep-dive on iMachining Technology.
   */
  iMachiningDetails(): IMachiningInfo {
    return {
      technology_name: "iMachining Technology",
      description:
        "SolidCAM's patented morphing-spiral toolpath technology that maintains a constant " +
        "engagement angle throughout the cutting motion. Unlike conventional offset patterns, " +
        "iMachining generates a unique morphing spiral that adapts its shape to the pocket " +
        "geometry while keeping the tool engagement angle below a controlled maximum. Combined " +
        "with the Technology Wizard, it auto-calculates optimal feeds, speeds, and depths.",
      key_principles: [
        "Patented morphing-spiral toolpath geometry (not trochoidal or offset-based)",
        "Constant engagement angle control (typically 40-70 degrees of arc)",
        "Technology Wizard: 8-level system auto-calculates feeds, speeds, DOC, and WOC",
        "Moat algorithm: handles wide pockets by creating controlled engagement zones",
        "Chip area control: maintains constant material removal rate per revolution",
        "Adaptive feed rate: automatically adjusts feed for actual engagement conditions",
      ],
      technology_wizard:
        "The Technology Wizard is a unique feature that uses a database of cutting parameters " +
        "indexed by material (ISO group), machine rigidity class (5 levels), and aggressiveness " +
        "level (1-8). Level 1 is ultra-conservative for fragile setups, level 4 is balanced, " +
        "and level 8 is maximum aggressiveness for rigid machines with premium tooling. The " +
        "wizard outputs specific ae, ap, vc, fz, and engagement angle values.",
      morphing_spiral:
        "The morphing spiral is iMachining's core innovation. Instead of simple trochoidal " +
        "circles or offset contours, the toolpath smoothly morphs from a spiral at the pocket " +
        "center to a contour-following path at the pocket boundary. This ensures constant " +
        "engagement regardless of pocket shape — rectangular, irregular, or complex. The spiral " +
        "center placement is algorithmically optimized for each pocket geometry.",
      engagement_control:
        "The maximum engagement angle (MEA) controls how much of the tool circumference contacts " +
        "the workpiece. Typical values: 40-55 deg for superalloys, 50-65 deg for steel, " +
        "60-75 deg for aluminum. The toolpath geometry ensures this angle is never exceeded, " +
        "preventing the sudden load spikes that cause chipping, chatter, and premature tool failure.",
      speed_multiplier:
        "Because engagement is mathematically controlled, cutting speed can be increased 2-3x " +
        "vs conventional toolpaths while simultaneously improving tool life. A typical steel " +
        "roughing operation at 100 m/min conventional can run at 200-250 m/min with iMachining. " +
        "Combined with full flute-depth cutting, the MRR improvement is typically 2-5x.",
      supported_strategies: [
        "iMachining 2D (pocket, contour, slot, face roughing)",
        "iMachining 3D (freeform surface roughing with stock awareness)",
        "iMachining Turning (constant engagement angle turning for OD/ID profiles)",
      ],
      benefits: [
        "Up to 70% cycle time reduction vs conventional roughing",
        "3-5x tool life improvement through constant chip load",
        "Technology Wizard eliminates parameter guesswork",
        "Works on any CNC machine — no special hardware required",
        "Patented morphing spiral handles any pocket geometry",
        "Moat algorithm manages wide pocket engagement",
        "Automatic feed compensation for engagement variations",
        "Reduced vibration and chatter through controlled engagement",
        "Lower cutting forces enable use on less rigid machines",
      ],
      limitations: [
        "Requires SolidCAM iMachining license module",
        "Longer toolpath calculation time than conventional roughing",
        "2D version limited to 2.5D prismatic features",
        "3D version requires additional license module",
        "Morphing spiral not available for finishing operations",
        "Technology Wizard database may not cover exotic materials",
      ],
    };
  }

  /**
   * Deep-dive on HSS (High Speed Surface) finishing technology.
   */
  hssDetails(): HSSInfo {
    return {
      technology_name: "HSS (High Speed Surface) Finishing",
      description:
        "SolidCAM's comprehensive 3D surface finishing module providing 8 distinct " +
        "toolpath patterns for complete surface coverage. Each pattern is optimized for " +
        "specific geometry types, from gentle curves to steep walls to tight corners. " +
        "HSS strategies can be combined in a single operation sequence for optimal results.",
      strategy_variants: [
        "HSS Linear — parallel passes for gentle surfaces (stepover 0.1-0.5mm)",
        "HSS Radial — radial passes from center for circular/domed features",
        "HSS Spiral — continuous spiral for seamless finish (zero retracts)",
        "HSS Morphed — morphing between boundary curves for ruled surfaces",
        "HSS Constant Z — Z-level contour for steep walls (>45 deg)",
        "HSS Helical — helical descent for cylindrical features",
        "HSS Horizontal Area — flat area detection and finishing",
        "HSS Pencil — corner cleanup along surface intersections",
      ],
      surface_quality:
        "HSS achieves typical surface roughness of Ra 0.4-1.6 um depending on stepover, " +
        "tool type, and material. With barrel cutters or circle-segment tools, effective " +
        "stepovers of 1-3mm can maintain Ra < 0.8 um due to the large effective cutting " +
        "radius. Spiral and morphed strategies eliminate witness marks for the best visual " +
        "appearance on optical and cosmetic surfaces.",
      toolpath_patterns:
        "HSS strategies support climb and conventional milling, zigzag and one-way patterns, " +
        "boundary extension for smooth entry/exit, and overlap control between adjacent " +
        "finishing regions. The steep/shallow boundary angle is user-configurable (default 45 deg) " +
        "for automatic strategy switching between Constant Z and scallop-based patterns.",
      adaptive_parameters:
        "HSS automatically adapts stepover based on local surface curvature when scallop " +
        "height mode is selected. On flat areas, stepover is maximized. On highly curved " +
        "regions, stepover is reduced to maintain target scallop height. This eliminates " +
        "the over-finishing of flat areas that occurs with constant stepover strategies.",
      benefits: [
        "8 specialized finishing patterns for complete surface coverage",
        "Automatic scallop height control with adaptive stepover",
        "HSS Spiral eliminates entry/exit witness marks",
        "Steep/shallow boundary auto-detection",
        "Multiple strategies combinable in single operation",
        "Support for barrel and circle-segment cutters",
        "Reduced polishing time through optimal surface quality",
        "5-axis compatible for undercut and complex access",
      ],
      best_for: [
        "Mold and die finishing (core/cavity surfaces)",
        "Medical implant surfaces (organic shapes)",
        "Aerospace freeform components (aluminum monoliths)",
        "Optical mold inserts (mirror finish requirement)",
        "Turbine blade surfaces (complex curvature)",
        "Automotive body panel tooling (Class-A surfaces)",
      ],
    };
  }

  /**
   * List all strategies, optionally filtered by category.
   */
  listStrategies(category?: SolidCAMCategory): {
    strategies: Array<{
      name: string;
      display_name: string;
      category: SolidCAMCategory;
      description: string;
      ratings: SolidCAMStrategyRating;
    }>;
    total: number;
    categories: SolidCAMCategory[];
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
      categories: [...new Set(this.strategies.map((s) => s.category))].sort() as SolidCAMCategory[],
    };
  }
}

export const solidCAMStrategyEngine = new SolidCAMStrategyEngine();
export { SolidCAMStrategyEngine as SolidCAMStrategyEngineClass };
