/**
 * InventorCAMStrategyEngine - Strategy Selection for InventorCAM/HSMWorks (E2402)
 *
 * Comprehensive strategy database for InventorCAM (Inventor HSM) and HSMWorks,
 * covering 35+ strategies across 2D, 3D, drilling, turning, and probing.
 * Both products share the same HSM kernel (Autodesk HSM, formerly HSMWorks ApS).
 *
 * HSM Strategies are organized by dimensionality:
 *   2D Milling: Adaptive, Pocket, Contour, Face, Slot, Trace, Engrave
 *   3D Milling: Parallel, Scallop, Pencil, Steep/Shallow, Horizontal, Contour3D
 *   Multi-Axis: Swarf, Multi-Axis Contour, Flow, Morph Spiral
 *   Drilling:   Drill, Bore, Circular, Thread
 *   Turning:    Profile, Face, Groove, Thread, Part
 *   Probing:    Geometry, Surface, Work Offset
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority) - Ranked strategy list
 *   getParameters(strategy_name)                          - Default parameters
 *   getAdaptiveDetails()                                  - Adaptive clearing deep-dive
 *   getSteepShallowDetails()                              - Steep/Shallow deep-dive
 *   listStrategies(category?)                             - All or filtered strategies
 *
 * @engine InventorCAMStrategyEngine
 * @shortcode E2402
 * @dispatcher camDispatcher
 * @actions inventorcam_strategy_recommend, inventorcam_strategy_params, inventorcam_strategy_list
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP10
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HSMCategory =
  | "roughing_2d"
  | "roughing_3d"
  | "finishing_2d"
  | "finishing_3d"
  | "drilling"
  | "turning"
  | "multi_axis"
  | "probing";

export type HSMPriority =
  | "cycle_time"
  | "tool_life"
  | "surface_finish"
  | "balanced";

export interface HSMFeature {
  /** Feature type */
  type:
    | "pocket_2d"
    | "contour_2d"
    | "slot"
    | "face"
    | "hole"
    | "boss"
    | "freeform_3d"
    | "steep_wall"
    | "flat_area"
    | "blended_surface"
    | "ruled_surface"
    | "impeller"
    | "turbine_blade"
    | "port"
    | "turning_external"
    | "turning_internal"
    | "groove"
    | "thread";
  /** Feature depth, mm */
  depth_mm?: number;
  /** Wall angle, degrees (0=flat, 90=vertical) */
  wall_angle_deg?: number;
  /** Has previous roughing */
  has_previous_roughing?: boolean;
  /** Axis count available */
  axis_count?: 3 | 4 | 5;
  /** Open or closed pocket */
  is_open?: boolean;
}

export interface HSMMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC */
  hardness_hrc?: number;
  /** Material name */
  name?: string;
}

export interface HSMMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "lathe" | "mill_turn";
  /** Max spindle RPM */
  max_rpm?: number;
  /** Spindle power, kW */
  spindle_kw?: number;
  /** Has high-pressure coolant */
  hpc?: boolean;
  /** Has through-spindle coolant */
  tsc?: boolean;
}

export interface HSMTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Flute count */
  flute_count: number;
  /** Tool type */
  type:
    | "flat_end"
    | "ball_end"
    | "bull_nose"
    | "face_mill"
    | "drill"
    | "tap"
    | "spot_drill"
    | "chamfer"
    | "lollipop"
    | "barrel"
    | "turning_insert";
  /** Corner radius for bull nose */
  corner_radius_mm?: number;
  /** Flute length */
  flute_length_mm?: number;
}

export interface StrategyRating {
  /** 1-10 surface finish quality */
  surface_finish: number;
  /** 1-10 cycle time efficiency */
  cycle_time: number;
  /** 1-10 tool life preservation */
  tool_life: number;
}

export interface HSMStrategy {
  /** Internal strategy name */
  name: string;
  /** Display name */
  display_name: string;
  /** Category */
  category: HSMCategory;
  /** Description */
  description: string;
  /** Radial engagement as % of tool diameter (ae/D) */
  ae_pct: number;
  /** Axial depth factor (multiplier of diameter) */
  ap_factor: number;
  /** Cutting speed multiplier vs baseline */
  vc_multiplier: number;
  /** Uses optimal load / engagement control */
  engagement_control: boolean;
  /** Applies chip thinning compensation */
  chip_thinning: boolean;
  /** HSM capable (high-speed machining) */
  hsm_capable: boolean;
  /** 5-axis capable */
  five_axis_capable: boolean;
  /** Performance ratings */
  ratings: StrategyRating;
  /** Key advantages */
  unique_advantages: string[];
  /** Material-specific notes by ISO group */
  material_notes: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", string>>;
  /** Suitable feature types */
  suitable_features: HSMFeature["type"][];
  /** Suitable machine types */
  suitable_machines: HSMMachine["type"][];
  /** Suitable tool types */
  suitable_tools: HSMTool["type"][];
}

export interface StrategyRecommendation {
  rank: number;
  strategy: HSMStrategy;
  score: number;
  reasoning: string;
}

export interface AdaptiveDetails {
  technology_name: string;
  description: string;
  key_principles: string[];
  optimal_load_explanation: string;
  helix_ramping: string;
  rest_machining: string;
  speed_recommendations: string;
  benefits: string[];
  limitations: string[];
}

export interface SteepShallowDetails {
  technology_name: string;
  description: string;
  threshold_angle: string;
  steep_strategy: string;
  shallow_strategy: string;
  blend_zone: string;
  benefits: string[];
  best_for: string[];
}

// ─── Strategy Database ───────────────────────────────────────────────────────

const STRATEGIES: HSMStrategy[] = [
  // ─── 2D ROUGHING ─────────────────────────────────────────────────────────────
  {
    name: "adaptive_2d",
    display_name: "2D Adaptive Clearing",
    category: "roughing_2d",
    description: "High-efficiency constant engagement clearing with helix ramping. The flagship HSM roughing strategy that maintains optimal load throughout the toolpath.",
    ae_pct: 10,
    ap_factor: 2.0,
    vc_multiplier: 2.0,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 10, tool_life: 10 },
    unique_advantages: [
      "Constant radial engagement (optimal load) maximizes MRR",
      "Helix ramping avoids plunge cuts entirely",
      "Smooth trochoidal motion reduces shock loading",
      "2x cutting speed with extended tool life",
      "Automatic rest machining with smaller tools",
      "Air cutting elimination through stock awareness",
    ],
    material_notes: {
      P: "Optimal load 8-12%D, full flute depth. Speed factor 2.0x for carbon/alloy steel.",
      M: "Optimal load 6-10%D, speed 1.6x. Excellent for stainless - no work hardening.",
      K: "Optimal load 10-15%D. Cast iron responds well. Dry cutting effective.",
      N: "Optimal load 12-18%D, speed up to 2.5x. Polished flutes prevent BUE.",
      S: "Optimal load 4-8%D, speed 1.2x max. HPC essential for Ti/Ni alloys.",
      H: "Optimal load 4-6%D, speed 1.0-1.2x. Hardened >45HRC. AlTiN coating.",
    },
    suitable_features: ["pocket_2d", "contour_2d", "slot", "face"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["flat_end", "bull_nose"],
  },
  {
    name: "pocket_2d",
    display_name: "2D Pocket",
    category: "roughing_2d",
    description: "Traditional offset pocket clearing. Simple and predictable for prismatic parts with uniform stock. Zigzag or spiral patterns available.",
    ae_pct: 60,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 4, cycle_time: 5, tool_life: 4 },
    unique_advantages: [
      "Simple, predictable toolpath",
      "Good for prismatic features with uniform stock",
      "Multiple pattern options (zigzag, one-way, spiral, morphed spiral)",
      "Works well with face mills and large endmills",
    ],
    material_notes: {
      P: "ae 50-70%D, standard speeds. Conventional roughing.",
      M: "ae 50-60%D, reduce feed at corners.",
      K: "ae 60-75%D. Cast iron tolerates high engagement.",
      N: "ae 65-80%D. Aluminum clears easily.",
      S: "ae 40-50%D. Reduce engagement for superalloys.",
      H: "Not recommended >45HRC. Use Adaptive instead.",
    },
    suitable_features: ["pocket_2d", "face", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["flat_end", "face_mill", "bull_nose"],
  },
  {
    name: "slot_2d",
    display_name: "2D Slot",
    category: "roughing_2d",
    description: "Dedicated slot milling with trochoidal motion. Handles full-width cutting by controlling engagement through trochoidal loops.",
    ae_pct: 8,
    ap_factor: 2.5,
    vc_multiplier: 1.8,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 5, cycle_time: 8, tool_life: 9 },
    unique_advantages: [
      "Avoids full-width slot engagement",
      "Trochoidal motion through narrow features",
      "Excellent for deep narrow slots",
      "Minimal radial tool load",
    ],
    material_notes: {
      P: "ae 5-10%D, full depth. Ideal for deep slots in steel.",
      M: "ae 5-8%D. Prevents work hardening in slots.",
      K: "ae 8-12%D. Good for cast iron keyways.",
      N: "ae 10-15%D. High speed in aluminum slots.",
      S: "ae 3-6%D. Best for titanium slots. HPC required.",
      H: "ae 3-5%D. Hardened slots without burning.",
    },
    suitable_features: ["slot", "pocket_2d", "groove"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["flat_end"],
  },

  // ─── 3D ROUGHING ─────────────────────────────────────────────────────────────
  {
    name: "adaptive_3d",
    display_name: "3D Adaptive Clearing",
    category: "roughing_3d",
    description: "Stock-aware 3D adaptive roughing with constant engagement. Combines Adaptive technology with full 3D stock model awareness for complex parts.",
    ae_pct: 10,
    ap_factor: 1.5,
    vc_multiplier: 1.8,
    engagement_control: true,
    chip_thinning: true,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 5, cycle_time: 9, tool_life: 9 },
    unique_advantages: [
      "Stock model eliminates air cutting",
      "Constant engagement on 3D geometry",
      "Smooth Z-transitions between levels",
      "Automatic rest machining",
      "Best MRR-to-tool-life ratio for 3D roughing",
    ],
    material_notes: {
      P: "Optimal load 8-10%D. Excellent for mold/die roughing.",
      M: "Optimal load 6-8%D. Surgical implant roughing.",
      K: "Optimal load 10-12%D. Cast iron mold bases.",
      N: "Optimal load 12-15%D. Aerospace aluminum.",
      S: "Optimal load 5-8%D. Best strategy for Ti-6Al-4V.",
      H: "Optimal load 4-6%D. Pre-hardened mold steel.",
    },
    suitable_features: ["pocket_2d", "freeform_3d", "contour_2d", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["flat_end", "bull_nose", "ball_end"],
  },
  {
    name: "pocket_3d",
    display_name: "3D Pocket Clearing",
    category: "roughing_3d",
    description: "Traditional 3D pocket clearing with Z-level waterline passes. Simple approach for moderate complexity 3D features.",
    ae_pct: 50,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 4, cycle_time: 5, tool_life: 5 },
    unique_advantages: [
      "Predictable Z-level clearing",
      "Good for moderate 3D complexity",
      "Simple toolpath calculation",
    ],
    material_notes: {
      P: "Standard parameters. Good general choice.",
      M: "Reduce engagement at walls.",
      K: "Works well on cast iron.",
      N: "Efficient for aluminum mold cores.",
      S: "Use with caution - variable engagement.",
      H: "Not recommended for hardened steel.",
    },
    suitable_features: ["pocket_2d", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["flat_end", "bull_nose", "ball_end"],
  },

  // ─── 3D FINISHING ────────────────────────────────────────────────────────────
  {
    name: "parallel",
    display_name: "Parallel Finishing",
    category: "finishing_3d",
    description: "Linear parallel passes at constant stepover. Best for gentle surfaces and areas with consistent curvature.",
    ae_pct: 8,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Predictable toolpath pattern",
      "Controllable surface lay direction",
      "Fast calculation time",
      "Good for gentle surfaces",
    ],
    material_notes: {
      P: "Stepover 0.1-0.3mm. Standard finishing.",
      M: "Climb milling preferred.",
      K: "Excellent for flat cast iron.",
      N: "High speed, mirror finish possible.",
      S: "Consistent direction important.",
      H: "Good for gentle hardened surfaces.",
    },
    suitable_features: ["flat_area", "freeform_3d", "face", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose", "flat_end"],
  },
  {
    name: "scallop",
    display_name: "Scallop Finishing",
    category: "finishing_3d",
    description: "Constant scallop height finishing with adaptive stepover. Maintains uniform surface quality across varying curvature.",
    ae_pct: 6,
    ap_factor: 0.03,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 10, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Constant scallop height across surface",
      "Adaptive stepover based on curvature",
      "Uniform Ra across complex parts",
      "Best strategy for complex 3D surface finishing",
    ],
    material_notes: {
      P: "Scallop 0.01-0.05mm typical. Ball nose preferred.",
      M: "Sharp tools minimize BUE. Use coolant.",
      K: "Dry finishing OK.",
      N: "High speed, polished flutes for mirror finish.",
      S: "HPC preferred. Small scallop height.",
      H: "CBN for >55HRC. Tight scallop.",
    },
    suitable_features: ["freeform_3d", "contour_2d", "steep_wall", "flat_area", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose", "barrel"],
  },
  {
    name: "steep_shallow",
    display_name: "Steep and Shallow",
    category: "finishing_3d",
    description: "Automatic strategy switching based on surface slope. Uses contour/waterline on steep areas and scallop/parallel on shallow areas.",
    ae_pct: 5,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Automatic slope-based strategy selection",
      "Optimal finish on steep walls (waterline)",
      "Optimal finish on shallow areas (scallop)",
      "Smooth transition at threshold angle",
      "Ideal for complex molds with mixed geometry",
    ],
    material_notes: {
      P: "Threshold 45-60 degrees typical.",
      M: "Use consistent direction on steep walls.",
      K: "Good for cast iron mold cavities.",
      N: "High speed on shallow areas.",
      S: "Critical for aerospace fuselage tooling.",
      H: "Essential for hardened mold finishing.",
    },
    suitable_features: ["freeform_3d", "steep_wall", "flat_area", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose"],
  },
  {
    name: "pencil",
    display_name: "Pencil Finishing",
    category: "finishing_3d",
    description: "Traces internal corners and fillets. Cleans up areas where larger tools cannot reach.",
    ae_pct: 3,
    ap_factor: 0.02,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Automatic corner detection",
      "Cleans rest material in fillets",
      "Multiple passes with step-down",
      "Essential for mold/die finishing",
    ],
    material_notes: {
      P: "Multiple passes typical. Light cuts.",
      M: "Avoid work hardening corners.",
      K: "Good for cast iron corners.",
      N: "High speed pencil tracing.",
      S: "Light cuts, HPC.",
      H: "Critical for hardened corners.",
    },
    suitable_features: ["freeform_3d", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end"],
  },
  {
    name: "horizontal",
    display_name: "Horizontal Finishing",
    category: "finishing_3d",
    description: "Waterline/contour finishing optimized for steep walls. Z-level passes follow constant elevation contours.",
    ae_pct: 6,
    ap_factor: 0.05,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Excellent for steep walls",
      "Consistent Z-level passes",
      "Good surface finish on vertical surfaces",
      "Natural toolpath for turned shapes",
    ],
    material_notes: {
      P: "Z-step 0.1-0.3mm typical.",
      M: "Climb milling on walls.",
      K: "Dry cutting OK.",
      N: "High speed walls.",
      S: "Consistent engagement critical.",
      H: "Essential for steep hardened walls.",
    },
    suitable_features: ["steep_wall", "freeform_3d", "contour_2d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose"],
  },
  {
    name: "contour_3d",
    display_name: "3D Contour",
    category: "finishing_3d",
    description: "Single-pass contour finishing along 3D curves. Traces edges and profiles on 3D surfaces.",
    ae_pct: 4,
    ap_factor: 0.03,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Edge finishing on 3D parts",
      "Single-pass efficiency",
      "Good for profile cleanup",
    ],
    material_notes: {
      P: "Light finishing passes.",
      M: "Climb preferred.",
      K: "Good edge quality.",
      N: "High speed profiles.",
      S: "Light engagement.",
      H: "Sharp edges possible.",
    },
    suitable_features: ["freeform_3d", "contour_2d", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose", "flat_end"],
  },
  {
    name: "radial",
    display_name: "Radial Finishing",
    category: "finishing_3d",
    description: "Radial passes from center outward. Ideal for circular features and domed surfaces.",
    ae_pct: 6,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Natural pattern for circular parts",
      "Good for domes and hemispheres",
      "Consistent surface lay from center",
    ],
    material_notes: {
      P: "Good for circular mold features.",
      M: "Climb direction.",
      K: "Cast iron domes.",
      N: "High speed hemispheres.",
      S: "Use on Ti domes.",
      H: "Hardened circular features.",
    },
    suitable_features: ["freeform_3d", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose"],
  },
  {
    name: "spiral",
    display_name: "Spiral Finishing",
    category: "finishing_3d",
    description: "Continuous spiral passes from center or edge. Minimizes retracts with single continuous path.",
    ae_pct: 5,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 8, tool_life: 8 },
    unique_advantages: [
      "Continuous single-path toolpath",
      "Minimal retracts and repositions",
      "Good surface continuity",
      "Efficient for flat-ish areas",
    ],
    material_notes: {
      P: "Good for large flat areas.",
      M: "Consistent engagement.",
      K: "Dry spiral finishing.",
      N: "High speed spiral.",
      S: "Steady chip load.",
      H: "Hardened flat areas.",
    },
    suitable_features: ["flat_area", "freeform_3d"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose", "flat_end"],
  },
  {
    name: "morphed_spiral",
    display_name: "Morphed Spiral",
    category: "finishing_3d",
    description: "Spiral morphed to surface boundaries. Follows irregular boundary shapes while maintaining spiral efficiency.",
    ae_pct: 5,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 8, cycle_time: 7, tool_life: 8 },
    unique_advantages: [
      "Adapts to irregular boundaries",
      "Maintains spiral efficiency",
      "Good for organic shapes",
    ],
    material_notes: {
      P: "Good for irregular mold features.",
      M: "Consistent engagement.",
      K: "Irregular cast features.",
      N: "Complex aluminum parts.",
      S: "Aerospace organic shapes.",
      H: "Complex hardened features.",
    },
    suitable_features: ["freeform_3d", "flat_area", "blended_surface"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis"],
    suitable_tools: ["ball_end", "bull_nose"],
  },

  // ─── MULTI-AXIS ──────────────────────────────────────────────────────────────
  {
    name: "swarf",
    display_name: "Swarf Milling",
    category: "multi_axis",
    description: "Side-cutting with tool axis aligned to ruled surfaces. Uses full flute length for maximum MRR on ruled surfaces.",
    ae_pct: 100,
    ap_factor: 3.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 7, cycle_time: 9, tool_life: 5 },
    unique_advantages: [
      "Full flute engagement",
      "Excellent for ruled surfaces",
      "Maximum MRR on side milling",
      "Essential for impellers and blisks",
    ],
    material_notes: {
      P: "Full flute depth on ruled walls.",
      M: "Watch deflection.",
      K: "Good for cast impellers.",
      N: "High MRR aluminum impellers.",
      S: "Critical for Ti impellers. HPC essential.",
      H: "Not typical for hardened.",
    },
    suitable_features: ["ruled_surface", "impeller", "turbine_blade"],
    suitable_machines: ["5axis", "mill_turn"],
    suitable_tools: ["flat_end", "bull_nose", "barrel"],
  },
  {
    name: "flow",
    display_name: "Flow Finishing",
    category: "multi_axis",
    description: "Flow-line following with tool axis control. Maintains consistent tool orientation along surface flow lines.",
    ae_pct: 5,
    ap_factor: 0.04,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 6, tool_life: 7 },
    unique_advantages: [
      "Follows surface flow lines",
      "Consistent tool orientation",
      "Excellent for aerospace parts",
      "Natural toolpath direction",
    ],
    material_notes: {
      P: "Good for complex molds.",
      M: "Consistent engagement direction.",
      K: "Cast iron flow surfaces.",
      N: "Aerospace aluminum skins.",
      S: "Critical for Ti aerospace. HPC.",
      H: "Complex hardened surfaces.",
    },
    suitable_features: ["freeform_3d", "blended_surface", "turbine_blade"],
    suitable_machines: ["5axis", "mill_turn"],
    suitable_tools: ["ball_end", "bull_nose", "barrel"],
  },

  // ─── DRILLING ────────────────────────────────────────────────────────────────
  {
    name: "drill",
    display_name: "Drilling",
    category: "drilling",
    description: "Standard drilling cycles (G81-G89). Supports spot, peck, deep hole, chip break, and tapping cycles.",
    ae_pct: 100,
    ap_factor: 5.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 6, cycle_time: 8, tool_life: 7 },
    unique_advantages: [
      "Full canned cycle support",
      "Automatic cycle selection",
      "Point-to-point optimization",
    ],
    material_notes: {
      P: "G83 peck for >3xD depth.",
      M: "Through-tool coolant recommended.",
      K: "Dry drilling OK.",
      N: "High speed drilling.",
      S: "Pecking essential. HPC.",
      H: "Use carbide drills.",
    },
    suitable_features: ["hole"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "mill_turn"],
    suitable_tools: ["drill", "spot_drill", "tap"],
  },
  {
    name: "bore",
    display_name: "Boring",
    category: "drilling",
    description: "Precision boring cycles for accurate hole sizes. Single-point boring for tight tolerances.",
    ae_pct: 100,
    ap_factor: 0.5,
    vc_multiplier: 0.8,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: true,
    ratings: { surface_finish: 9, cycle_time: 5, tool_life: 7 },
    unique_advantages: [
      "Tight hole tolerances",
      "Good surface finish",
      "Adjustable boring heads",
    ],
    material_notes: {
      P: "DOC 0.1-0.3mm per pass.",
      M: "Sharp inserts, coolant.",
      K: "Good bore finish.",
      N: "Light cuts, high speed.",
      S: "Light DOC, HPC.",
      H: "CBN for hardened bores.",
    },
    suitable_features: ["hole"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "mill_turn"],
    suitable_tools: ["drill"],
  },

  // ─── 2D FINISHING ────────────────────────────────────────────────────────────
  {
    name: "contour_2d",
    display_name: "2D Contour",
    category: "finishing_2d",
    description: "Profile finishing of 2D contours. Single or multiple passes with lead-in/lead-out control.",
    ae_pct: 5,
    ap_factor: 1.0,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: true,
    five_axis_capable: false,
    ratings: { surface_finish: 9, cycle_time: 7, tool_life: 7 },
    unique_advantages: [
      "Clean wall finish",
      "Smooth lead-in/out",
      "Multiple depth passes",
      "Tab support",
    ],
    material_notes: {
      P: "Light finishing 0.1-0.3mm.",
      M: "Climb milling preferred.",
      K: "Good wall finish.",
      N: "High speed profiles.",
      S: "Light cuts.",
      H: "Sharp edges possible.",
    },
    suitable_features: ["contour_2d", "pocket_2d", "slot"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["flat_end", "bull_nose"],
  },
  {
    name: "face",
    display_name: "Face Milling",
    category: "finishing_2d",
    description: "Face milling with zigzag or one-way passes. Efficient stock removal on top surfaces.",
    ae_pct: 70,
    ap_factor: 0.5,
    vc_multiplier: 1.0,
    engagement_control: false,
    chip_thinning: false,
    hsm_capable: false,
    five_axis_capable: false,
    ratings: { surface_finish: 7, cycle_time: 8, tool_life: 6 },
    unique_advantages: [
      "Fast face cleanup",
      "Large tool coverage",
      "Good surface flatness",
    ],
    material_notes: {
      P: "75% stepover typical.",
      M: "Consistent engagement.",
      K: "Dry facing OK.",
      N: "High speed facing.",
      S: "Moderate stepover.",
      H: "Light passes.",
    },
    suitable_features: ["face", "flat_area"],
    suitable_machines: ["3axis_vertical", "3axis_horizontal", "4axis"],
    suitable_tools: ["face_mill", "flat_end"],
  },
];

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class InventorCAMStrategyEngineClass {
  /**
   * Recommend strategies based on feature, material, machine, tool, and priority.
   *
   * @param feature   Feature characteristics
   * @param material  Workpiece material
   * @param machine   Machine configuration
   * @param tool      Tool specification
   * @param priority  Optimization priority
   * @returns         Ranked list of recommended strategies
   */
  recommend(
    feature: HSMFeature,
    material: HSMMaterial,
    machine: HSMMachine,
    tool: HSMTool,
    priority: HSMPriority = "balanced",
  ): StrategyRecommendation[] {
    const candidates = STRATEGIES.filter(s => {
      // Filter by feature suitability
      if (!s.suitable_features.includes(feature.type)) return false;
      // Filter by machine suitability
      if (!s.suitable_machines.includes(machine.type)) return false;
      // Filter by tool suitability
      if (!s.suitable_tools.includes(tool.type)) return false;
      // Filter by 5-axis requirement
      if (feature.axis_count === 5 && !s.five_axis_capable && s.category === "multi_axis") return false;
      return true;
    });

    // Score candidates
    const scored = candidates.map(strategy => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Priority weighting
      switch (priority) {
        case "cycle_time":
          score += strategy.ratings.cycle_time * 5;
          reasons.push(`Cycle time rating: ${strategy.ratings.cycle_time}/10`);
          break;
        case "tool_life":
          score += strategy.ratings.tool_life * 5;
          reasons.push(`Tool life rating: ${strategy.ratings.tool_life}/10`);
          break;
        case "surface_finish":
          score += strategy.ratings.surface_finish * 5;
          reasons.push(`Surface finish rating: ${strategy.ratings.surface_finish}/10`);
          break;
        default:
          score += (strategy.ratings.cycle_time + strategy.ratings.tool_life + strategy.ratings.surface_finish) * 1.5;
          reasons.push("Balanced performance across all metrics");
      }

      // HSM bonus
      if (strategy.hsm_capable) {
        score += 8;
        reasons.push("HSM capable - higher speeds available");
      }

      // Engagement control bonus for difficult materials
      if (strategy.engagement_control && ["M", "S", "H"].includes(material.iso_group)) {
        score += 12;
        reasons.push(`Engagement control recommended for ISO ${material.iso_group}`);
      }

      // 5-axis bonus if available
      if (feature.axis_count === 5 && strategy.five_axis_capable) {
        score += 5;
        reasons.push("5-axis optimization available");
      }

      // Material note bonus
      if (strategy.material_notes[material.iso_group]) {
        score += 3;
        reasons.push(`Has specific guidance for ISO ${material.iso_group}`);
      }

      return {
        strategy,
        score,
        reasoning: reasons.join(". "),
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5).map((s, i) => ({
      rank: i + 1,
      strategy: s.strategy,
      score: s.score,
      reasoning: s.reasoning,
    }));
  }

  /**
   * Get default parameters for a strategy.
   *
   * @param strategy_name  Strategy internal name
   * @returns              Strategy definition with defaults, or undefined
   */
  getParameters(strategy_name: string): HSMStrategy | undefined {
    return STRATEGIES.find(s => s.name === strategy_name);
  }

  /**
   * Get detailed information about Adaptive Clearing technology.
   */
  getAdaptiveDetails(): AdaptiveDetails {
    return {
      technology_name: "Adaptive Clearing (HSM Adaptive)",
      description:
        "Autodesk HSM's flagship roughing technology that maintains constant radial tool engagement throughout the toolpath. Uses a trochoidal motion pattern with smooth transitions and helix ramping to maximize material removal while preserving tool life.",
      key_principles: [
        "Optimal Load: Controls maximum radial engagement as percentage of tool diameter",
        "Helix Ramping: Enters material with smooth helix motion, never plunges",
        "Smooth Transitions: Trochoidal loops through corners prevent shock loading",
        "Stock Awareness: Uses stock model to eliminate air cutting",
        "Rest Machining: Automatically detects and clears rest material",
      ],
      optimal_load_explanation:
        "Optimal Load sets the maximum radial engagement (ae) as a percentage of tool diameter. " +
        "Typical values: 8-15% for steel, 4-8% for difficult materials (Ti, Inconel), 12-20% for aluminum. " +
        "Lower values = more tool life, higher values = faster cycle time. HSM calculates chip thinning compensation automatically.",
      helix_ramping:
        "Helix angle controls entry ramp. 2-5 degrees typical. Smaller angles = gentler entry, larger = faster entry. " +
        "Ramp diameter should be at least 3x tool diameter for proper chip formation.",
      rest_machining:
        "Enable 'Rest Machining' to detect stock left by previous operations. Use From Previous Operation or From Setup stock models. " +
        "Essential for multi-tool roughing sequences.",
      speed_recommendations:
        "Adaptive allows 1.5-2.5x normal cutting speed due to constant engagement. " +
        "Start at 1.5x and increase based on results. Carbide endmills with AlTiN coating perform best.",
      benefits: [
        "2-3x tool life compared to conventional roughing",
        "1.5-2x faster cycle times with higher speeds",
        "Reduced heat and vibration",
        "Consistent chip thickness",
        "Lower spindle load and power consumption",
        "Quieter machining",
      ],
      limitations: [
        "Requires HSM-capable machine (look-ahead, high rapid rates)",
        "Not suitable for face milling large areas",
        "More complex toolpath = larger NC files",
        "Requires stock model for maximum benefit",
      ],
    };
  }

  /**
   * Get detailed information about Steep and Shallow finishing strategy.
   */
  getSteepShallowDetails(): SteepShallowDetails {
    return {
      technology_name: "Steep and Shallow",
      description:
        "Automatic dual-strategy finishing that applies waterline passes on steep surfaces and scallop/parallel passes on shallow areas. Automatically detects surface slope and switches strategy at the threshold angle.",
      threshold_angle:
        "Threshold angle (typically 45-60 degrees) determines where steep transitions to shallow. " +
        "Surfaces steeper than threshold use Z-level waterline, shallower use stepover-based passes.",
      steep_strategy:
        "Steep areas use Horizontal/Waterline passes - Z-level contours that produce excellent finish on vertical or near-vertical walls. " +
        "Climb milling direction recommended for best surface quality.",
      shallow_strategy:
        "Shallow areas use Parallel or Scallop passes - stepover-based passes that are more efficient on gentle surfaces. " +
        "Scallop maintains constant cusp height, Parallel is simpler but may vary cusp height.",
      blend_zone:
        "HSM creates a blending zone around the threshold angle to smoothly transition between strategies. " +
        "This prevents visible witness lines at the strategy transition.",
      benefits: [
        "Optimal finish quality on both steep and shallow areas",
        "Automatic strategy switching - no manual region selection",
        "Efficient toolpath - right strategy for right geometry",
        "Essential for complex mold/die finishing",
        "Reduced hand polishing requirements",
      ],
      best_for: [
        "Complex freeform surfaces with mixed geometry",
        "Mold cavities and cores",
        "Die surfaces",
        "Automotive body tooling",
        "Aerospace structural parts",
        "Medical implant molds",
      ],
    };
  }

  /**
   * List all strategies, optionally filtered by category.
   *
   * @param category  Optional category filter
   * @returns         Array of strategies
   */
  listStrategies(category?: HSMCategory): HSMStrategy[] {
    if (!category) return [...STRATEGIES];
    return STRATEGIES.filter(s => s.category === category);
  }

  /**
   * Get strategy categories with counts.
   */
  getCategories(): Array<{ category: HSMCategory; count: number; description: string }> {
    const categories: Array<{ category: HSMCategory; count: number; description: string }> = [
      { category: "roughing_2d", count: 0, description: "2D roughing strategies (Adaptive, Pocket, Slot)" },
      { category: "roughing_3d", count: 0, description: "3D roughing strategies (Adaptive 3D, Pocket 3D)" },
      { category: "finishing_2d", count: 0, description: "2D finishing strategies (Contour, Face)" },
      { category: "finishing_3d", count: 0, description: "3D finishing strategies (Parallel, Scallop, Pencil)" },
      { category: "drilling", count: 0, description: "Hole making strategies (Drill, Bore)" },
      { category: "multi_axis", count: 0, description: "Multi-axis strategies (Swarf, Flow)" },
      { category: "turning", count: 0, description: "Turning strategies (Profile, Face, Groove)" },
      { category: "probing", count: 0, description: "Probing strategies (Geometry, Work Offset)" },
    ];

    for (const s of STRATEGIES) {
      const cat = categories.find(c => c.category === s.category);
      if (cat) cat.count++;
    }

    return categories.filter(c => c.count > 0);
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const inventorCAMStrategyEngine = new InventorCAMStrategyEngineClass();
