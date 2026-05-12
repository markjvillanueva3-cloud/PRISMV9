/**
 * MillingStrategyLibraryEngine — MILL-AWARE-MS5
 *
 * Comprehensive milling strategy library with AI-driven selection.
 * Maps 35+ strategies across 2D, 3D, HSM, and 5-axis categories with:
 *   - Feature-to-strategy mapping
 *   - Material suitability scoring
 *   - Selection AI (when to use adaptive vs trochoidal, etc.)
 *   - Physics-based parameter recommendations
 *
 * Integrates with StrategyTaxonomyEngine for cross-CAM normalization.
 *
 * @module MillingStrategyLibraryEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Strategy category for milling operations */
export type MillingStrategyCategory =
  | "2d_roughing"
  | "2d_finishing"
  | "3d_roughing"
  | "3d_finishing"
  | "hsm_roughing"
  | "hsm_finishing"
  | "5axis_roughing"
  | "5axis_finishing"
  | "drilling"
  | "specialty";

/** Material suitability for a strategy */
export interface MaterialSuitability {
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  suitability: "excellent" | "good" | "fair" | "poor" | "not_recommended";
  notes: string;
  speed_factor: number; // 0.5 = 50% of base speed, 1.5 = 150%
  feed_factor: number;
}

/** Feature type that a strategy applies to */
export type FeatureType =
  | "pocket_2d"
  | "profile_2d"
  | "face"
  | "slot"
  | "groove"
  | "bore"
  | "thread"
  | "freeform_3d"
  | "steep_wall"
  | "shallow_floor"
  | "corner_fillet"
  | "deep_cavity"
  | "thin_wall"
  | "ruled_surface"
  | "impeller_blade"
  | "turbine_blade"
  | "mold_cavity"
  | "mold_core"
  | "electrode"
  | "undercut";

/** Strategy definition with full metadata */
export interface MillingStrategy {
  id: string;
  name: string;
  category: MillingStrategyCategory;
  description: string;
  min_axes: 3 | 4 | 5;
  hsm_capable: boolean;
  engagement_control: "constant" | "variable" | "none";
  chip_thinning: boolean;
  applicable_features: FeatureType[];
  material_suitability: MaterialSuitability[];
  cam_equivalents: Record<string, string>;
  typical_params: StrategyParams;
  selection_criteria: SelectionCriteria;
  tips: string[];
}

/** Typical parameters for a strategy */
export interface StrategyParams {
  stepover_pct_tool_dia: { min: number; max: number; typical: number };
  stepdown_pct_tool_dia: { min: number; max: number; typical: number };
  ramp_angle_deg?: { min: number; max: number };
  helix_angle_deg?: number;
  lead_angle_deg?: number;
  lean_angle_deg?: number;
}

/** Criteria for selecting this strategy */
export interface SelectionCriteria {
  prefer_when: string[];
  avoid_when: string[];
  min_wall_thickness_mm?: number;
  max_l_d_ratio?: number;
  min_pocket_width_pct_tool?: number;
}

/** Strategy recommendation result */
export interface StrategyRecommendation {
  strategy_id: string;
  strategy_name: string;
  score: number; // 0-100
  match_reasons: string[];
  warnings: string[];
  alternative_strategies: Array<{ id: string; score: number; reason: string }>;
  recommended_params: Partial<StrategyParams>;
}

/** Input for strategy selection */
export interface StrategySelectionInput {
  feature_type: FeatureType;
  material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  material_hardness_hrc?: number;
  available_axes: 3 | 4 | 5;
  tool_diameter_mm: number;
  tool_flute_length_mm?: number;
  pocket_depth_mm?: number;
  pocket_width_mm?: number;
  wall_thickness_mm?: number;
  surface_finish_ra?: number;
  max_cycle_time_priority?: boolean;
  tool_life_priority?: boolean;
  surface_quality_priority?: boolean;
}

// ============================================================================
// STRATEGY DATABASE — 35+ strategies
// ============================================================================

const MILLING_STRATEGY_TAXONOMY: MillingStrategy[] = [
  // ==========================================================================
  // 2D ROUGHING STRATEGIES
  // ==========================================================================
  {
    id: "facing",
    name: "Face Milling",
    category: "2d_roughing",
    description: "Removes material from flat top surfaces to establish a reference plane. Uses face mills or large end mills for maximum MRR.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: true,
    applicable_features: ["face", "pocket_2d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard steel facing", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Use coated inserts", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "High MRR possible", speed_factor: 1.1, feed_factor: 1.1 },
      { iso_group: "N", suitability: "excellent", notes: "Very high speeds", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "fair", notes: "Reduce speed 40%", speed_factor: 0.6, feed_factor: 0.7 },
      { iso_group: "H", suitability: "good", notes: "CBN or ceramic inserts", speed_factor: 0.5, feed_factor: 0.6 },
    ],
    cam_equivalents: {
      fusion360: "Face",
      mastercam: "Face Mill",
      hypermill: "Face Milling",
      powermill: "Face Milling",
      solidcam: "Face Milling",
      nx: "Face Milling",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 50, max: 85, typical: 70 },
      stepdown_pct_tool_dia: { min: 5, max: 15, typical: 10 },
    },
    selection_criteria: {
      prefer_when: ["Large flat surfaces", "Initial stock removal", "Establishing datum face"],
      avoid_when: ["Deep pockets", "3D surfaces", "Interrupted cuts without proper insert selection"],
    },
    tips: [
      "Position cutter 60-70% of diameter engagement for optimal chip thinning",
      "Use climb milling for better surface finish",
      "Lead angle on face mill improves entry into interrupted cuts",
    ],
  },

  {
    id: "pocketing",
    name: "2D Pocket Clearing",
    category: "2d_roughing",
    description: "Clears material from enclosed 2D pocket geometry using offset or spiral toolpath patterns.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "variable",
    chip_thinning: false,
    applicable_features: ["pocket_2d", "slot", "groove"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Standard approach", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Watch engagement in corners", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "good", notes: "Good chip evacuation needed", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Fast cycle times", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Use adaptive instead", speed_factor: 0.6, feed_factor: 0.7 },
      { iso_group: "H", suitability: "poor", notes: "Use adaptive or trochoidal", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "2D Pocket",
      mastercam: "Pocket",
      hypermill: "Pocket Milling",
      powermill: "Offset Area Clearance",
      solidcam: "Pocket",
      nx: "Cavity Mill",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 40, max: 70, typical: 50 },
      stepdown_pct_tool_dia: { min: 50, max: 150, typical: 100 },
      ramp_angle_deg: { min: 2, max: 10 },
    },
    selection_criteria: {
      prefer_when: ["Simple rectangular pockets", "Soft materials", "Low cycle time priority"],
      avoid_when: ["Hard materials", "Deep pockets", "Titanium/Inconel"],
      min_pocket_width_pct_tool: 150,
    },
    tips: [
      "Use spiral pattern for round pockets to maintain continuous cutting",
      "Enable helical entry to reduce plunge shock on tool",
      "Set minimum 1.5x tool diameter pocket width for efficient clearing",
    ],
  },

  {
    id: "profiling",
    name: "2D Profiling/Contouring",
    category: "2d_roughing",
    description: "Follows the outer or inner boundary of 2D geometry to create walls and profiles.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["profile_2d", "pocket_2d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard profiling", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Climb mill only", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good finish achievable", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "High speeds, 3-flute", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "fair", notes: "Light DOC, climb only", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Small stepdown, air blast", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "2D Contour",
      mastercam: "Contour",
      hypermill: "2D Contour",
      powermill: "Profile Finishing",
      solidcam: "Profile",
      nx: "Planar Mill",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 3, max: 15, typical: 5 },
      stepdown_pct_tool_dia: { min: 100, max: 300, typical: 150 },
    },
    selection_criteria: {
      prefer_when: ["Wall finishing", "Profile accuracy required", "Simple 2.5D parts"],
      avoid_when: ["Initial roughing", "Large stock removal"],
    },
    tips: [
      "Use spring passes (0.05mm stock) for tight tolerances",
      "Climb milling produces better surface finish",
      "Reduce feed 50% in corners to prevent chatter",
    ],
  },

  {
    id: "drilling",
    name: "Drilling",
    category: "drilling",
    description: "Creates holes using spot drills, twist drills, and specialized drilling cycles (G81-G89).",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["bore", "thread"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard drilling", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Peck for deep holes", speed_factor: 0.75, feed_factor: 0.85 },
      { iso_group: "K", suitability: "excellent", notes: "Fast drilling", speed_factor: 1.1, feed_factor: 1.1 },
      { iso_group: "N", suitability: "excellent", notes: "Very high speeds", speed_factor: 1.8, feed_factor: 1.4 },
      { iso_group: "S", suitability: "fair", notes: "Peck mandatory", speed_factor: 0.4, feed_factor: 0.5 },
      { iso_group: "H", suitability: "poor", notes: "Carbide drills, light peck", speed_factor: 0.3, feed_factor: 0.4 },
    ],
    cam_equivalents: {
      fusion360: "Drill",
      mastercam: "Drill",
      hypermill: "Drilling",
      powermill: "Drilling",
      solidcam: "Drilling",
      nx: "Drilling",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      stepdown_pct_tool_dia: { min: 50, max: 300, typical: 100 },
    },
    selection_criteria: {
      prefer_when: ["Hole features", "Standard hole sizes"],
      avoid_when: ["Hole diameter < 3mm on hardened steel"],
      max_l_d_ratio: 10,
    },
    tips: [
      "Spot drill to 90-120 degrees before twist drill",
      "Use peck drilling (G83) for depth > 3x diameter",
      "High-pressure coolant through spindle for deep holes",
    ],
  },

  {
    id: "tapping",
    name: "Tapping",
    category: "drilling",
    description: "Creates internal threads using rigid or floating tap holders.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["thread"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard tapping", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Roll form taps for austenitic", speed_factor: 0.7, feed_factor: 1.0 },
      { iso_group: "K", suitability: "excellent", notes: "Fast tapping", speed_factor: 1.2, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Roll form recommended", speed_factor: 1.5, feed_factor: 1.0 },
      { iso_group: "S", suitability: "fair", notes: "Thread mill instead", speed_factor: 0.3, feed_factor: 1.0 },
      { iso_group: "H", suitability: "poor", notes: "Thread mill required", speed_factor: 0.2, feed_factor: 1.0 },
    ],
    cam_equivalents: {
      fusion360: "Tap",
      mastercam: "Tap",
      hypermill: "Tapping",
      powermill: "Tapping",
      solidcam: "Tapping",
      nx: "Tapping",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Standard thread sizes", "Production quantities"],
      avoid_when: ["Hardened materials", "Single threads in hard materials"],
    },
    tips: [
      "Use rigid tapping (G84) on machines with synchronized spindle",
      "Floating tap holders for machines without rigid tapping",
      "Check tap drill size chart for 75% thread engagement",
    ],
  },

  {
    id: "boring",
    name: "Boring",
    category: "drilling",
    description: "Finishes holes to tight tolerances using single-point boring bars or reamers.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["bore"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard boring", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Reduce speed 20%", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "PCD tooling", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "CBN inserts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "CBN or ceramic", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Bore",
      mastercam: "Bore",
      hypermill: "Boring",
      powermill: "Boring",
      solidcam: "Boring",
      nx: "Boring",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["H7 or tighter tolerance", "Surface finish Ra < 1.6"],
      avoid_when: ["Production of standard holes where reaming is faster"],
      max_l_d_ratio: 8,
    },
    tips: [
      "Use dampened boring bars for L/D > 4",
      "Take spring passes for best roundness",
      "Boring speed 70% of external turning speed",
    ],
  },

  // ==========================================================================
  // 3D ROUGHING STRATEGIES
  // ==========================================================================
  {
    id: "z_level_roughing",
    name: "Z-Level Roughing",
    category: "3d_roughing",
    description: "Clears 3D geometry using constant-Z offset passes, best for steep walls and simple 3D shapes.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "variable",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "steep_wall", "mold_cavity", "mold_core"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Standard approach", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Watch corners", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "good", notes: "Good chip breaking", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Fast clearing", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Use adaptive instead", speed_factor: 0.55, feed_factor: 0.65 },
      { iso_group: "H", suitability: "poor", notes: "Use adaptive/plunge", speed_factor: 0.35, feed_factor: 0.45 },
    ],
    cam_equivalents: {
      fusion360: "Morphed Spiral",
      mastercam: "Z Level Rough",
      hypermill: "Z-Level Roughing",
      powermill: "Offset Area Clearance",
      solidcam: "3D Roughing",
      nx: "Cavity Mill",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 40, max: 70, typical: 50 },
      stepdown_pct_tool_dia: { min: 50, max: 150, typical: 100 },
      ramp_angle_deg: { min: 2, max: 8 },
    },
    selection_criteria: {
      prefer_when: ["Simple 3D geometry", "Predominantly vertical walls", "Standard materials"],
      avoid_when: ["Complex freeform", "Hard materials", "Deep narrow features"],
    },
    tips: [
      "Set stepdown to match floor features for flat floors without scallops",
      "Use helical entry to avoid plunge damage",
      "Stock-to-leave should match finish tool corner radius",
    ],
  },

  {
    id: "plunge_roughing",
    name: "Plunge Roughing",
    category: "3d_roughing",
    description: "Axial-only cutting like drilling, stepping laterally between plunges. Minimizes radial forces for deep narrow features.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["deep_cavity", "slot", "groove", "thin_wall"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Useful for deep slots", speed_factor: 0.7, feed_factor: 0.8 },
      { iso_group: "M", suitability: "good", notes: "Low radial force", speed_factor: 0.65, feed_factor: 0.75 },
      { iso_group: "K", suitability: "fair", notes: "Standard approach better", speed_factor: 0.8, feed_factor: 0.85 },
      { iso_group: "N", suitability: "fair", notes: "Not needed for aluminum", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "S", suitability: "excellent", notes: "Best for titanium deep slots", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "excellent", notes: "Only option for deep hardened", speed_factor: 0.35, feed_factor: 0.4 },
    ],
    cam_equivalents: {
      fusion360: "Bore",
      mastercam: "Plunge Mill",
      hypermill: "Plunge Milling",
      powermill: "Plunge Milling",
      solidcam: "Plunge Milling",
      nx: "Plunge Milling",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 50, max: 80, typical: 65 },
      stepdown_pct_tool_dia: { min: 100, max: 500, typical: 300 },
    },
    selection_criteria: {
      prefer_when: ["Deep narrow slots", "Hard materials", "Thin wall support", "Long tool overhang"],
      avoid_when: ["Open areas", "Shallow features", "Soft materials"],
      max_l_d_ratio: 12,
    },
    tips: [
      "Use 65-75% tool diameter lateral step for efficient MRR",
      "Feed rate 60-70% of drilling cycle feed",
      "Essential for tool L/D > 6:1 in hardened steel",
    ],
  },

  // ==========================================================================
  // 3D FINISHING STRATEGIES
  // ==========================================================================
  {
    id: "scallop",
    name: "Constant Scallop Finishing",
    category: "3d_finishing",
    description: "Maintains uniform scallop height across varying surface curvature by dynamically adjusting stepover.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "mold_cavity", "mold_core", "shallow_floor"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard finishing", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Watch work hardening", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Mirror polish possible", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "fair", notes: "Light cuts only", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "CBN ball end", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Scallop",
      mastercam: "Scallop",
      hypermill: "3D Equidistant",
      powermill: "Offset Finishing",
      solidcam: "Constant Cusp",
      nx: "Contour Area",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 3, max: 15, typical: 8 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Freeform 3D surfaces", "Mold cavities", "Uniform finish required"],
      avoid_when: ["Predominantly vertical walls", "Flat surfaces"],
    },
    tips: [
      "Target scallop height = Ra × 0.1 for mold finishes",
      "Use ball nose 50-70% of smallest fillet radius",
      "Lead/lean angles improve finish by avoiding tool tip contact",
    ],
  },

  {
    id: "pencil",
    name: "Pencil Milling",
    category: "3d_finishing",
    description: "Traces concave blend regions and fillets to clean corners left by larger tools.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["corner_fillet", "freeform_3d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard cleanup", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Light engagement", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good chip breaking", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Fast corner cleanup", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Very light cuts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "Final cleanup", speed_factor: 0.45, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Pencil",
      mastercam: "Pencil",
      hypermill: "Rest Finishing",
      powermill: "Pencil Finishing",
      solidcam: "Pencil Milling",
      nx: "Boundary",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 15, typical: 10 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["After scallop finishing", "Concave corners and fillets", "Mold parting lines"],
      avoid_when: ["Convex surfaces", "Flat areas"],
    },
    tips: [
      "Reference tool diameter should match previous finish tool",
      "Use both-ways cutting for symmetric corners",
      "Essential after scallop or parallel finishing",
    ],
  },

  {
    id: "z_level_finishing",
    name: "Z-Level / Waterline Finishing",
    category: "3d_finishing",
    description: "Constant-Z contour passes for steep walls. Mandatory for walls > 60 degrees from horizontal.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["steep_wall", "mold_cavity", "mold_core"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard steep finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Climb mill only", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good wall finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "High speed", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "fair", notes: "Light stepdown", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "Air blast only", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Contour",
      mastercam: "Z Level Finish",
      hypermill: "Z-Level Finishing",
      powermill: "Steep and Shallow (Steep)",
      solidcam: "Contour",
      nx: "Z-Level",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      stepdown_pct_tool_dia: { min: 5, max: 20, typical: 10 },
    },
    selection_criteria: {
      prefer_when: ["Walls > 60 degrees", "Mold core/cavity walls", "Draft surfaces"],
      avoid_when: ["Shallow areas < 45 degrees", "Flat floors"],
    },
    tips: [
      "Set Z-step to achieve target scallop height on walls",
      "Z-step = 2 * sqrt(2*R*h) for target scallop h",
      "Combine with parallel/scallop for complete surface coverage",
    ],
  },

  {
    id: "parallel_finishing",
    name: "Parallel / Raster Finishing",
    category: "3d_finishing",
    description: "Straight-line passes across surfaces, best for flat and gently curved areas.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "shallow_floor"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard flat finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Good finish achievable", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Fast finishing", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Mirror finish possible", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "fair", notes: "Light cuts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "CBN tools", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Parallel",
      mastercam: "Parallel",
      hypermill: "3D Z-Level Finishing",
      powermill: "Raster Finishing",
      solidcam: "Parallel Finishing",
      nx: "Fixed Contour",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 3, max: 15, typical: 8 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Flat or gently curved surfaces", "Automotive panels", "Simple 3D geometry"],
      avoid_when: ["Steep walls", "Highly curved surfaces"],
    },
    tips: [
      "Angle cuts 45 degrees to primary viewing direction to hide marks",
      "Zigzag pattern halves cycle time but may affect finish direction",
      "Combine with waterline for complete steep/shallow coverage",
    ],
  },

  {
    id: "radial_finishing",
    name: "Radial Finishing",
    category: "3d_finishing",
    description: "Radial passes from center outward, ideal for circular or disc-shaped features.",
    min_axes: 3,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "shallow_floor"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Circular features", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Standard approach", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "good", notes: "Good finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Fast radial cutting", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Light cuts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "CBN required", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Radial",
      mastercam: "Radial",
      hypermill: "Radial Machining",
      powermill: "Radial Finishing",
      solidcam: "Radial",
      nx: "Radial Cut",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 20, typical: 10 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Circular features", "Disc geometry", "Dome shapes"],
      avoid_when: ["Non-circular geometry", "Deep pockets"],
    },
    tips: [
      "Center point must be defined accurately for smooth transitions",
      "Use for optical lenses and dome features",
      "Angular spacing determines pass density",
    ],
  },

  {
    id: "spiral_finishing",
    name: "Spiral Finishing",
    category: "3d_finishing",
    description: "Continuous spiral from center outward or edge inward, maintaining constant tool engagement.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "constant",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "shallow_floor"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Continuous cutting", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "No entry/exit marks", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "good", notes: "Good chip flow", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Mirror finish possible", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Light cuts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Constant load helps", speed_factor: 0.45, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Spiral",
      mastercam: "Spiral",
      hypermill: "Spiral Finishing",
      powermill: "Spiral Finishing",
      solidcam: "Spiral",
      nx: "Streamline",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 20, typical: 10 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Circular pockets", "Flat areas", "Continuous cutting preferred"],
      avoid_when: ["Non-circular geometry", "Complex 3D shapes"],
    },
    tips: [
      "Inward spiral provides better surface finish near edges",
      "Outward spiral better for chip evacuation",
      "No retract marks as cutting is continuous",
    ],
  },

  {
    id: "flowline_finishing",
    name: "Flowline / Streamline Finishing",
    category: "3d_finishing",
    description: "Follows surface UV direction for aerodynamic and aesthetic surfaces where cut marks align with part function.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "ruled_surface", "impeller_blade", "turbine_blade"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Flow-aligned finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Good for aero parts", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "good", notes: "Directional finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Optical quality", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "good", notes: "Aerospace standard", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Light cuts", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Flow",
      mastercam: "Flowline",
      hypermill: "Shape Offset Finishing",
      powermill: "Flow Line Finishing",
      solidcam: "Flowline",
      nx: "Streamline",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 15, typical: 10 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Turbine blades", "Impeller vanes", "Aerodynamic surfaces", "Boat hulls"],
      avoid_when: ["Poorly parameterized surfaces", "Complex multi-patch geometry"],
    },
    tips: [
      "Define drive curves matching natural surface flow",
      "Requires clean surface topology (no bad UV patches)",
      "Produces functional finishes that improve aero performance",
    ],
  },

  {
    id: "steep_shallow",
    name: "Steep and Shallow / Hybrid Finishing",
    category: "3d_finishing",
    description: "Automatically combines waterline (steep) and scallop/parallel (shallow) based on surface angle threshold.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "variable",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "mold_cavity", "mold_core", "steep_wall", "shallow_floor"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Single-op finishing", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Uniform finish", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Efficient coverage", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Fast combined finish", speed_factor: 1.4, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Light cuts", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "good", notes: "Air blast only", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Steep and Shallow",
      mastercam: "Hybrid",
      hypermill: "Optimized Finishing",
      powermill: "Steep and Shallow Finishing",
      solidcam: "Steep/Shallow",
      nx: "Contour (Steep/Shallow)",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 15, typical: 8 },
      stepdown_pct_tool_dia: { min: 5, max: 15, typical: 8 },
    },
    selection_criteria: {
      prefer_when: ["Mixed steep/shallow geometry", "Mold cavities", "Single-operation finishing"],
      avoid_when: ["Purely vertical or purely horizontal parts"],
    },
    tips: [
      "Set threshold angle at 45-65 degrees based on geometry",
      "Overlap 1-2mm at steep/shallow boundary to eliminate witness lines",
      "Use same tool for both regions to avoid tool marks",
    ],
  },

  // ==========================================================================
  // HSM ROUGHING STRATEGIES
  // ==========================================================================
  {
    id: "adaptive_clearing",
    name: "Adaptive Clearing / Dynamic Milling",
    category: "hsm_roughing",
    description: "Constant-engagement toolpath maintaining optimal chip load throughout. 2-5x deeper cuts at 2-3x higher feeds than conventional.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "constant",
    chip_thinning: true,
    applicable_features: ["pocket_2d", "freeform_3d", "slot", "deep_cavity", "mold_cavity"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "40-70% cycle time reduction", speed_factor: 1.2, feed_factor: 1.5 },
      { iso_group: "M", suitability: "excellent", notes: "Best for stainless", speed_factor: 1.0, feed_factor: 1.3 },
      { iso_group: "K", suitability: "good", notes: "Standard approach faster", speed_factor: 1.1, feed_factor: 1.2 },
      { iso_group: "N", suitability: "excellent", notes: "Massive MRR gains", speed_factor: 1.5, feed_factor: 1.8 },
      { iso_group: "S", suitability: "excellent", notes: "Only way to rough titanium", speed_factor: 0.7, feed_factor: 1.0 },
      { iso_group: "H", suitability: "excellent", notes: "Constant load extends life", speed_factor: 0.5, feed_factor: 0.8 },
    ],
    cam_equivalents: {
      fusion360: "Adaptive Clearing",
      mastercam: "Dynamic Mill",
      hypermill: "MAXX Machining Roughing",
      powermill: "Vortex",
      solidcam: "iMachining 2D/3D",
      nx: "Adaptive Milling",
      gibbscam: "VoluMill",
      esprit: "ProfitMilling",
      edgecam: "Waveform",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 8, max: 15, typical: 10 },
      stepdown_pct_tool_dia: { min: 150, max: 300, typical: 200 },
      ramp_angle_deg: { min: 2, max: 5 },
      helix_angle_deg: 2,
    },
    selection_criteria: {
      prefer_when: ["Any roughing operation", "Hard materials", "Deep pockets", "Tool life priority"],
      avoid_when: ["Very shallow features < 2mm", "Extremely soft materials"],
    },
    tips: [
      "8-12% tool diameter radial engagement is optimal",
      "Full flute depth (1.5-2x diameter) axial engagement",
      "Corner smoothing prevents dwell marks",
      "Chip thinning compensation essential for accurate feeds",
    ],
  },

  {
    id: "trochoidal_milling",
    name: "Trochoidal Milling",
    category: "hsm_roughing",
    description: "Circular arc tool motion maintaining constant engagement in slots and channels. Best for narrow features.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "constant",
    chip_thinning: true,
    applicable_features: ["slot", "groove", "pocket_2d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Slot and channel standard", speed_factor: 1.2, feed_factor: 1.4 },
      { iso_group: "M", suitability: "excellent", notes: "Best for work-hardening materials", speed_factor: 1.0, feed_factor: 1.2 },
      { iso_group: "K", suitability: "good", notes: "Good for chip breaking", speed_factor: 1.1, feed_factor: 1.2 },
      { iso_group: "N", suitability: "excellent", notes: "Very fast slotting", speed_factor: 1.5, feed_factor: 1.6 },
      { iso_group: "S", suitability: "excellent", notes: "Essential for Ti slots", speed_factor: 0.7, feed_factor: 1.0 },
      { iso_group: "H", suitability: "excellent", notes: "Constant load protects tool", speed_factor: 0.5, feed_factor: 0.8 },
    ],
    cam_equivalents: {
      fusion360: "Adaptive Clearing (slots)",
      mastercam: "Dynamic Mill (Trochoidal)",
      hypermill: "Trochoidal Milling",
      powermill: "Vortex",
      solidcam: "iMachining",
      nx: "Trochoidal",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 8, max: 15, typical: 10 },
      stepdown_pct_tool_dia: { min: 150, max: 300, typical: 200 },
    },
    selection_criteria: {
      prefer_when: ["Slots narrower than 2x tool diameter", "Grooves", "Channels"],
      avoid_when: ["Open pockets where adaptive is faster", "Very wide features"],
    },
    tips: [
      "Arc diameter 110-130% of tool diameter",
      "Full flute engagement for maximum MRR",
      "Essential for slotting in titanium and stainless",
    ],
  },

  {
    id: "high_feed_milling",
    name: "High Feed Milling",
    category: "hsm_roughing",
    description: "Shallow DOC with very high feeds using high-feed cutters (10-15 degree lead angle). Maximum MRR on open areas.",
    min_axes: 3,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: true,
    applicable_features: ["face", "pocket_2d", "freeform_3d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Maximum MRR", speed_factor: 1.0, feed_factor: 2.0 },
      { iso_group: "M", suitability: "good", notes: "Good MRR", speed_factor: 0.85, feed_factor: 1.8 },
      { iso_group: "K", suitability: "excellent", notes: "Very high feeds", speed_factor: 1.0, feed_factor: 2.2 },
      { iso_group: "N", suitability: "excellent", notes: "Extreme MRR", speed_factor: 1.3, feed_factor: 2.5 },
      { iso_group: "S", suitability: "fair", notes: "Ceramic inserts", speed_factor: 0.6, feed_factor: 1.2 },
      { iso_group: "H", suitability: "fair", notes: "CBN inserts", speed_factor: 0.4, feed_factor: 1.0 },
    ],
    cam_equivalents: {
      fusion360: "Adaptive (high feed)",
      mastercam: "High Feed",
      hypermill: "High Feed Milling",
      powermill: "High Speed Area Clearance",
      solidcam: "High Feed",
      nx: "High Feed Cutting",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 40, max: 70, typical: 50 },
      stepdown_pct_tool_dia: { min: 3, max: 10, typical: 5 },
    },
    selection_criteria: {
      prefer_when: ["Open areas", "Face milling", "Large flat pockets"],
      avoid_when: ["Deep pockets", "Narrow slots", "Complex 3D"],
    },
    tips: [
      "Requires high-feed specific cutters (10-15 degree lead)",
      "Chip thinning compensation essential (feed × 4-5)",
      "Best for open roughing before adaptive on complex features",
    ],
  },

  // ==========================================================================
  // 5-AXIS STRATEGIES
  // ==========================================================================
  {
    id: "swarf_cutting",
    name: "Swarf Cutting (5-Axis Side Milling)",
    category: "5axis_finishing",
    description: "Uses full flute length on ruled surfaces in a single pass. 5-10x faster than Z-level for draft walls.",
    min_axes: 5,
    hsm_capable: true,
    engagement_control: "constant",
    chip_thinning: false,
    applicable_features: ["ruled_surface", "impeller_blade", "turbine_blade", "thin_wall"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard swarf", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Full flute engagement", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Very fast", speed_factor: 1.4, feed_factor: 1.3 },
      { iso_group: "S", suitability: "good", notes: "Aerospace standard", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Light cuts only", speed_factor: 0.35, feed_factor: 0.4 },
    ],
    cam_equivalents: {
      fusion360: "Multi-Axis Swarf",
      mastercam: "Swarf Milling",
      hypermill: "5X Swarf Cutting",
      powermill: "Swarf Finishing",
      solidcam: "Sim 5X Swarf",
      nx: "Swarf Drive",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 60, max: 95, typical: 80 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      lead_angle_deg: 0,
      lean_angle_deg: 0,
    },
    selection_criteria: {
      prefer_when: ["Draft walls", "Ruled surfaces", "Impeller blades"],
      avoid_when: ["Doubly-curved surfaces (causes gouging)", "Non-developable geometry"],
    },
    tips: [
      "Surface MUST be ruled (developable) or gouging occurs",
      "Tilt limits +/-3 degrees from surface normal",
      "Verify in simulation before machining",
    ],
  },

  {
    id: "projection_5axis",
    name: "5-Axis Projection Finishing",
    category: "5axis_finishing",
    description: "Projects 2D toolpath pattern onto 3D surfaces with tool normal to surface. Universal 5-axis approach.",
    min_axes: 5,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "impeller_blade", "turbine_blade", "mold_cavity", "mold_core"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard 5-axis finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Tool normal helps", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Good finish", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "High speed", speed_factor: 1.5, feed_factor: 1.3 },
      { iso_group: "S", suitability: "good", notes: "Lead/lean improves life", speed_factor: 0.55, feed_factor: 0.65 },
      { iso_group: "H", suitability: "good", notes: "Air blast, CBN", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Multi-Axis Contour",
      mastercam: "Multiaxis",
      hypermill: "5X Contouring",
      powermill: "Surface Finishing",
      solidcam: "Sim. 5X",
      nx: "Variable Contour",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 15, typical: 8 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      lead_angle_deg: 10,
      lean_angle_deg: 3,
    },
    selection_criteria: {
      prefer_when: ["General 5-axis finishing", "Undercuts", "Complex freeform"],
      avoid_when: ["Ruled surfaces (use swarf instead)"],
    },
    tips: [
      "Lead angle 10-15 degrees moves contact off tool tip",
      "Lean angle 0-5 degrees for symmetric tool wear",
      "Monitor axis limits on trunnion machines",
    ],
  },

  {
    id: "flowline_5axis",
    name: "5-Axis Flowline Finishing",
    category: "5axis_finishing",
    description: "Follows surface flow from hub to shroud on blades and vanes. Tool normal maintained throughout.",
    min_axes: 5,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["impeller_blade", "turbine_blade", "ruled_surface"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Blade finishing", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Turbine alloys", speed_factor: 0.8, feed_factor: 0.85 },
      { iso_group: "K", suitability: "fair", notes: "Rarely used", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "good", notes: "Pump impellers", speed_factor: 1.3, feed_factor: 1.2 },
      { iso_group: "S", suitability: "excellent", notes: "Standard for Ti blades", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Rarely needed", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Flow",
      mastercam: "Multiaxis Flowline",
      hypermill: "5X Impeller/Blisk",
      powermill: "Blade Machining",
      solidcam: "Blade",
      nx: "Turbo Machinery Milling",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 5, max: 15, typical: 8 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      lead_angle_deg: 10,
      lean_angle_deg: 0,
    },
    selection_criteria: {
      prefer_when: ["Turbine blades", "Impeller vanes", "Blisks"],
      avoid_when: ["Non-blade geometry"],
    },
    tips: [
      "Define hub and shroud boundaries for automatic flowline generation",
      "Barrel cutters allow 3-5x wider step-over at same scallop",
      "Check singularities at leading/trailing edges",
    ],
  },

  {
    id: "barrel_cutter_finishing",
    name: "Barrel Cutter / MAXX Finishing",
    category: "5axis_finishing",
    description: "Uses barrel (circle segment) cutters with large effective radius for 3-5x wider step-over at same scallop height.",
    min_axes: 5,
    hsm_capable: true,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["freeform_3d", "steep_wall", "mold_cavity", "mold_core"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "60-80% cycle reduction", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Major time savings", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Automotive dies", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Massive savings", speed_factor: 1.3, feed_factor: 1.2 },
      { iso_group: "S", suitability: "good", notes: "Aerospace", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "excellent", notes: "Major polishing reduction", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Steep and Shallow (barrel)",
      mastercam: "Circle Segment",
      hypermill: "MAXX Machining Finishing",
      powermill: "Barrel Tool Finishing",
      solidcam: "Barrel",
      nx: "Barrel Tool",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 30, max: 60, typical: 45 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      lead_angle_deg: 5,
      lean_angle_deg: 0,
    },
    selection_criteria: {
      prefer_when: ["Large mold surfaces", "Automotive dies", "Planar/near-planar regions"],
      avoid_when: ["Highly concave regions", "Small fillet radii"],
    },
    tips: [
      "Barrel radius 100-500mm allows massive step-over",
      "Target scallop height determines step-over",
      "Verify contact pattern in simulation - incorrect tilt causes gouging",
    ],
  },

  {
    id: "impeller_machining",
    name: "Impeller / Multi-Blade Machining",
    category: "5axis_roughing",
    description: "Specialized strategy for machining blisks, impellers, and multi-blade components with plunge roughing and flowline finishing.",
    min_axes: 5,
    hsm_capable: true,
    engagement_control: "variable",
    chip_thinning: false,
    applicable_features: ["impeller_blade", "turbine_blade"],
    material_suitability: [
      { iso_group: "P", suitability: "fair", notes: "Rarely needed", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Cobalt alloys", speed_factor: 0.7, feed_factor: 0.8 },
      { iso_group: "K", suitability: "poor", notes: "Not typical", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Pump impellers", speed_factor: 1.3, feed_factor: 1.2 },
      { iso_group: "S", suitability: "excellent", notes: "Aerospace standard", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "fair", notes: "Rarely needed", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Multiaxis (impeller)",
      mastercam: "Blade Expert",
      hypermill: "5X Impeller/Blisk",
      powermill: "Blade Machining",
      solidcam: "Blade",
      nx: "Turbo Machinery Milling",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 8, max: 20, typical: 12 },
      stepdown_pct_tool_dia: { min: 100, max: 200, typical: 150 },
    },
    selection_criteria: {
      prefer_when: ["Blisks", "Impellers", "Shrouded blades"],
      avoid_when: ["Non-blade geometry"],
    },
    tips: [
      "Define hub, shroud, blade, and splitter surfaces",
      "Plunge rough between blades first",
      "Flowline finish blade surfaces",
    ],
  },

  {
    id: "tube_machining",
    name: "Tube / Port Machining",
    category: "5axis_finishing",
    description: "Machines internal passages of cylinder heads, manifolds, and cooling channels with tool following centerline.",
    min_axes: 5,
    hsm_capable: false,
    engagement_control: "variable",
    chip_thinning: false,
    applicable_features: ["undercut"],
    material_suitability: [
      { iso_group: "P", suitability: "good", notes: "Cast iron ports", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "fair", notes: "Rarely needed", speed_factor: 0.8, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Cylinder heads", speed_factor: 1.1, feed_factor: 1.1 },
      { iso_group: "N", suitability: "excellent", notes: "Intake manifolds", speed_factor: 1.3, feed_factor: 1.2 },
      { iso_group: "S", suitability: "fair", notes: "Aerospace manifolds", speed_factor: 0.5, feed_factor: 0.6 },
      { iso_group: "H", suitability: "poor", notes: "Rarely needed", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Multiaxis",
      mastercam: "Multiaxis Port",
      hypermill: "5X Tube/Pipe",
      powermill: "Port Machining",
      solidcam: "Port",
      nx: "Sequential Mill",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 20, max: 50, typical: 35 },
      stepdown_pct_tool_dia: { min: 50, max: 150, typical: 100 },
    },
    selection_criteria: {
      prefer_when: ["Cylinder heads", "Intake manifolds", "Cooling channels"],
      avoid_when: ["External surfaces"],
    },
    tips: [
      "Define centerline and cross-sections",
      "Tool axis follows centerline tangent",
      "Verify tool length vs passage depth",
    ],
  },

  {
    id: "deburring_5axis",
    name: "5-Axis Deburring / Edge Breaking",
    category: "specialty",
    description: "Automated edge breaking and deburring along detected edges with consistent contact depth.",
    min_axes: 5,
    hsm_capable: false,
    engagement_control: "none",
    chip_thinning: false,
    applicable_features: ["profile_2d", "freeform_3d"],
    material_suitability: [
      { iso_group: "P", suitability: "excellent", notes: "Standard deburring", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "M", suitability: "good", notes: "Consistent depth", speed_factor: 0.85, feed_factor: 0.9 },
      { iso_group: "K", suitability: "excellent", notes: "Cast iron edges", speed_factor: 1.0, feed_factor: 1.0 },
      { iso_group: "N", suitability: "excellent", notes: "Aluminum parts", speed_factor: 1.4, feed_factor: 1.3 },
      { iso_group: "S", suitability: "good", notes: "Aerospace edges", speed_factor: 0.6, feed_factor: 0.7 },
      { iso_group: "H", suitability: "fair", notes: "Hardened edges", speed_factor: 0.4, feed_factor: 0.5 },
    ],
    cam_equivalents: {
      fusion360: "Deburr",
      mastercam: "Deburr",
      hypermill: "5X Deburring",
      powermill: "Edge Breaking",
      solidcam: "Deburr",
      nx: "Chamfer",
    },
    typical_params: {
      stepover_pct_tool_dia: { min: 0, max: 0, typical: 0 },
      stepdown_pct_tool_dia: { min: 0, max: 0, typical: 0 },
    },
    selection_criteria: {
      prefer_when: ["Complex edge geometry", "Replacing manual deburring"],
      avoid_when: ["Simple 2D edges"],
    },
    tips: [
      "Auto-detect edges meeting criteria",
      "5-axis tool normal for consistent depth",
      "Sort edges by region to minimize rapids",
    ],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillingStrategyLibraryEngine {
  private readonly strategies = MILLING_STRATEGY_TAXONOMY;

  /**
   * Get all available strategies
   */
  getAllStrategies(): MillingStrategy[] {
    return [...this.strategies];
  }

  /**
   * Get strategies by category
   */
  getStrategiesByCategory(category: MillingStrategyCategory): MillingStrategy[] {
    return this.strategies.filter((s) => s.category === category);
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): MillingStrategy | undefined {
    return this.strategies.find((s) => s.id === id);
  }

  /**
   * Get strategies applicable to a feature type
   */
  getStrategiesForFeature(featureType: FeatureType): MillingStrategy[] {
    return this.strategies.filter((s) => s.applicable_features.includes(featureType));
  }

  /**
   * AI-driven strategy selection based on input parameters
   */
  selectStrategy(input: StrategySelectionInput): StrategyRecommendation {
    const candidates = this.strategies.filter((s) => {
      // Filter by feature
      if (!s.applicable_features.includes(input.feature_type)) return false;
      // Filter by axis capability
      if (s.min_axes > input.available_axes) return false;
      return true;
    });

    if (candidates.length === 0) {
      return {
        strategy_id: "adaptive_clearing",
        strategy_name: "Adaptive Clearing",
        score: 50,
        match_reasons: ["Default fallback - no exact match"],
        warnings: ["No strategy exactly matches requirements"],
        alternative_strategies: [],
        recommended_params: {},
      };
    }

    // Score each candidate
    const scored = candidates.map((s) => this.scoreStrategy(s, input));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4).map((s) => ({
      id: s.strategy_id,
      score: s.score,
      reason: s.match_reasons[0] || "Alternative option",
    }));

    return {
      ...best,
      alternative_strategies: alternatives,
    };
  }

  /**
   * Score a strategy against input requirements
   */
  private scoreStrategy(
    strategy: MillingStrategy,
    input: StrategySelectionInput
  ): Omit<StrategyRecommendation, "alternative_strategies"> {
    let score = 50; // Base score
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Material suitability
    const matSuit = strategy.material_suitability.find(
      (m) => m.iso_group === input.material_iso_group
    );
    if (matSuit) {
      switch (matSuit.suitability) {
        case "excellent":
          score += 25;
          reasons.push(`Excellent for ${input.material_iso_group} materials`);
          break;
        case "good":
          score += 15;
          reasons.push(`Good for ${input.material_iso_group} materials`);
          break;
        case "fair":
          score += 5;
          warnings.push(`Fair suitability for ${input.material_iso_group}`);
          break;
        case "poor":
          score -= 10;
          warnings.push(`Poor suitability for ${input.material_iso_group}`);
          break;
        case "not_recommended":
          score -= 25;
          warnings.push(`Not recommended for ${input.material_iso_group}`);
          break;
      }
    }

    // Hardened material check
    if (input.material_hardness_hrc && input.material_hardness_hrc > 45) {
      if (strategy.engagement_control === "constant") {
        score += 15;
        reasons.push("Constant engagement ideal for hardened steel");
      }
      if (strategy.id === "adaptive_clearing" || strategy.id === "trochoidal_milling") {
        score += 10;
        reasons.push("HSM strategy recommended for hard materials");
      }
    }

    // Deep pocket check
    if (input.pocket_depth_mm && input.pocket_depth_mm > 50) {
      if (strategy.id === "plunge_roughing") {
        score += 20;
        reasons.push("Plunge roughing ideal for deep features");
      }
      if (strategy.id === "adaptive_clearing") {
        score += 10;
        reasons.push("Adaptive maintains consistent load in deep pockets");
      }
    }

    // Thin wall check
    if (input.wall_thickness_mm && input.wall_thickness_mm < 3) {
      if (strategy.id === "plunge_roughing") {
        score += 15;
        reasons.push("Axial cutting minimizes wall deflection");
      }
      if (strategy.engagement_control === "constant") {
        score += 10;
        reasons.push("Constant engagement reduces shock loading on thin walls");
      }
    }

    // Surface finish priority
    if (input.surface_quality_priority) {
      if (strategy.category.includes("finishing")) {
        score += 15;
        reasons.push("Finishing strategy for surface quality");
      }
      if (strategy.id === "scallop" || strategy.id === "steep_shallow") {
        score += 10;
        reasons.push("Uniform scallop height for consistent finish");
      }
    }

    // Tool life priority
    if (input.tool_life_priority) {
      if (strategy.engagement_control === "constant") {
        score += 15;
        reasons.push("Constant engagement maximizes tool life");
      }
    }

    // Cycle time priority
    if (input.max_cycle_time_priority) {
      if (strategy.hsm_capable) {
        score += 10;
        reasons.push("HSM-capable for faster cycle times");
      }
      if (strategy.id === "adaptive_clearing" || strategy.id === "high_feed_milling") {
        score += 10;
        reasons.push("High MRR strategy for fast roughing");
      }
    }

    // Feature-specific bonuses
    if (
      input.feature_type === "slot" ||
      input.feature_type === "groove"
    ) {
      if (strategy.id === "trochoidal_milling") {
        score += 15;
        reasons.push("Trochoidal ideal for slots and grooves");
      }
    }

    if (input.feature_type === "impeller_blade" || input.feature_type === "turbine_blade") {
      if (strategy.id === "flowline_5axis" || strategy.id === "impeller_machining") {
        score += 20;
        reasons.push("Specialized blade machining strategy");
      }
    }

    // Calculate recommended params
    const recommendedParams: Partial<StrategyParams> = {
      stepover_pct_tool_dia: {
        ...strategy.typical_params.stepover_pct_tool_dia,
      },
      stepdown_pct_tool_dia: {
        ...strategy.typical_params.stepdown_pct_tool_dia,
      },
    };

    // Adjust for material
    if (matSuit && matSuit.speed_factor < 0.8) {
      // Hard material - reduce engagement
      recommendedParams.stepover_pct_tool_dia!.typical *= 0.8;
      recommendedParams.stepdown_pct_tool_dia!.typical *= 0.8;
    }

    return {
      strategy_id: strategy.id,
      strategy_name: strategy.name,
      score: Math.min(100, Math.max(0, score)),
      match_reasons: reasons.length > 0 ? reasons : ["General match"],
      warnings,
      recommended_params: recommendedParams,
    };
  }

  /**
   * Get CAM-specific strategy name for a canonical strategy
   */
  getCAMEquivalent(strategyId: string, camSystem: string): string | undefined {
    const strategy = this.getStrategy(strategyId);
    if (!strategy) return undefined;
    return strategy.cam_equivalents[camSystem];
  }

  /**
   * Get taxonomy statistics
   */
  getStatistics(): {
    total: number;
    by_category: Record<string, number>;
    hsm_capable: number;
    five_axis: number;
  } {
    const byCategory: Record<string, number> = {};
    let hsmCapable = 0;
    let fiveAxis = 0;

    for (const s of this.strategies) {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
      if (s.hsm_capable) hsmCapable++;
      if (s.min_axes === 5) fiveAxis++;
    }

    return {
      total: this.strategies.length,
      by_category: byCategory,
      hsm_capable: hsmCapable,
      five_axis: fiveAxis,
    };
  }

  /**
   * Compare two strategies for a given use case
   */
  compareStrategies(
    strategyA: string,
    strategyB: string,
    input: StrategySelectionInput
  ): {
    winner: string;
    scoreA: number;
    scoreB: number;
    comparison: string[];
  } {
    const a = this.getStrategy(strategyA);
    const b = this.getStrategy(strategyB);

    if (!a || !b) {
      return {
        winner: "unknown",
        scoreA: 0,
        scoreB: 0,
        comparison: ["One or both strategies not found"],
      };
    }

    const scoreA = this.scoreStrategy(a, input);
    const scoreB = this.scoreStrategy(b, input);

    const comparison: string[] = [];

    // Material comparison
    const matA = a.material_suitability.find((m) => m.iso_group === input.material_iso_group);
    const matB = b.material_suitability.find((m) => m.iso_group === input.material_iso_group);
    if (matA && matB) {
      comparison.push(
        `Material: ${a.name} (${matA.suitability}) vs ${b.name} (${matB.suitability})`
      );
    }

    // Engagement comparison
    comparison.push(
      `Engagement: ${a.name} (${a.engagement_control}) vs ${b.name} (${b.engagement_control})`
    );

    // HSM comparison
    comparison.push(
      `HSM capable: ${a.name} (${a.hsm_capable ? "Yes" : "No"}) vs ${b.name} (${b.hsm_capable ? "Yes" : "No"})`
    );

    return {
      winner: scoreA.score >= scoreB.score ? strategyA : strategyB,
      scoreA: scoreA.score,
      scoreB: scoreB.score,
      comparison,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millingStrategyLibraryEngine = new MillingStrategyLibraryEngine();
